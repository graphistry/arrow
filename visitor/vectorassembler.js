"use strict";
// Licensed to the Apache Software Foundation (ASF) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The ASF licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.
Object.defineProperty(exports, "__esModule", { value: true });
const vector_1 = require("../vector");
const visitor_1 = require("../visitor");
const enum_1 = require("../enum");
const recordbatch_1 = require("../recordbatch");
const buffer_1 = require("../util/buffer");
const bit_1 = require("../util/bit");
const message_1 = require("../ipc/metadata/message");
const type_1 = require("../type");
class VectorAssembler extends visitor_1.Visitor {
    constructor() {
        super();
        this._byteLength = 0;
        this._nodes = [];
        this._buffers = [];
        this._bufferRegions = [];
    }
    /** @nocollapse */
    static assemble(...args) {
        const vectors = args.reduce(function flatten(xs, x) {
            if (Array.isArray(x)) {
                return x.reduce(flatten, xs);
            }
            if (!(x instanceof recordbatch_1.RecordBatch)) {
                return [...xs, x];
            }
            return [...xs, ...x.schema.fields.map((_, i) => x.getChildAt(i))];
        }, []).filter((x) => x instanceof vector_1.Vector);
        return new VectorAssembler().visitMany(vectors)[0];
    }
    visit(vector) {
        if (!type_1.DataType.isDictionary(vector.type)) {
            const { data, length, nullCount } = vector;
            if (length > 2147483647) {
                /* istanbul ignore next */
                throw new RangeError('Cannot write arrays larger than 2^31 - 1 in length');
            }
            addBuffer.call(this, nullCount <= 0
                ? new Uint8Array(0) // placeholder validity buffer
                : bit_1.truncateBitmap(data.offset, length, data.nullBitmap)).nodes.push(new message_1.FieldNode(length, nullCount));
        }
        return super.visit(vector);
    }
    visitNull(_nullV) { return this; }
    visitDictionary(vector) {
        // Assemble the indices here, Dictionary assembled separately.
        return this.visit(vector.indices);
    }
    get nodes() { return this._nodes; }
    get buffers() { return this._buffers; }
    get byteLength() { return this._byteLength; }
    get bufferRegions() { return this._bufferRegions; }
}
exports.VectorAssembler = VectorAssembler;
function addBuffer(values) {
    const byteLength = (values.byteLength + 7) & ~7; // Round up to a multiple of 8
    this.buffers.push(values);
    this.bufferRegions.push(new message_1.BufferRegion(this._byteLength, byteLength));
    this._byteLength += byteLength;
    return this;
}
function assembleUnion(vector) {
    const { type, length, typeIds, valueOffsets } = vector;
    // All Union Vectors have a typeIds buffer
    addBuffer.call(this, typeIds);
    // If this is a Sparse Union, treat it like all other Nested types
    if (type.mode === enum_1.UnionMode.Sparse) {
        return assembleNestedVector.call(this, vector);
    }
    else if (type.mode === enum_1.UnionMode.Dense) {
        // If this is a Dense Union, add the valueOffsets buffer and potentially slice the children
        if (vector.offset <= 0) {
            // If the Vector hasn't been sliced, write the existing valueOffsets
            addBuffer.call(this, valueOffsets);
            // We can treat this like all other Nested types
            return assembleNestedVector.call(this, vector);
        }
        else {
            // A sliced Dense Union is an unpleasant case. Because the offsets are different for
            // each child vector, we need to "rebase" the valueOffsets for each child
            // Union typeIds are not necessary 0-indexed
            const maxChildTypeId = typeIds.reduce((x, y) => Math.max(x, y), typeIds[0]);
            const childLengths = new Int32Array(maxChildTypeId + 1);
            // Set all to -1 to indicate that we haven't observed a first occurrence of a particular child yet
            const childOffsets = new Int32Array(maxChildTypeId + 1).fill(-1);
            const shiftedOffsets = new Int32Array(length);
            // If we have a non-zero offset, then the value offsets do not start at
            // zero. We must a) create a new offsets array with shifted offsets and
            // b) slice the values array accordingly
            const unshiftedOffsets = buffer_1.rebaseValueOffsets(-valueOffsets[0], length, valueOffsets);
            for (let typeId, shift, index = -1; ++index < length;) {
                if ((shift = childOffsets[typeId = typeIds[index]]) === -1) {
                    shift = childOffsets[typeId] = unshiftedOffsets[typeId];
                }
                shiftedOffsets[index] = unshiftedOffsets[index] - shift;
                ++childLengths[typeId];
            }
            addBuffer.call(this, shiftedOffsets);
            // Slice and visit children accordingly
            for (let child, childIndex = -1, numChildren = type.children.length; ++childIndex < numChildren;) {
                if (child = vector.getChildAt(childIndex)) {
                    const typeId = type.typeIds[childIndex];
                    const childLength = Math.min(length, childLengths[typeId]);
                    this.visit(child.slice(childOffsets[typeId], childLength));
                }
            }
        }
    }
    return this;
}
function assembleBoolVector(vector) {
    // Bool vector is a special case of FlatVector, as its data buffer needs to stay packed
    let values;
    if (vector.nullCount >= vector.length) {
        // If all values are null, just insert a placeholder empty data buffer (fastest path)
        return addBuffer.call(this, new Uint8Array(0));
    }
    else if ((values = vector.values) instanceof Uint8Array) {
        // If values is already a Uint8Array, slice the bitmap (fast path)
        return addBuffer.call(this, bit_1.truncateBitmap(vector.offset, vector.length, values));
    }
    // Otherwise if the underlying data *isn't* a Uint8Array, enumerate the
    // values as bools and re-pack them into a Uint8Array. This code isn't
    // reachable unless you're trying to manipulate the Data internals,
    // we we're only doing this for safety.
    /* istanbul ignore next */
    return addBuffer.call(this, bit_1.packBools(vector));
}
function assembleFlatVector(vector) {
    return addBuffer.call(this, vector.values.subarray(0, vector.length * vector.stride));
}
function assembleFlatListVector(vector) {
    const { length, values, valueOffsets } = vector;
    const firstOffset = valueOffsets[0];
    const lastOffset = valueOffsets[length];
    const byteLength = Math.min(lastOffset - firstOffset, values.byteLength - firstOffset);
    // Push in the order FlatList types read their buffers
    addBuffer.call(this, buffer_1.rebaseValueOffsets(-valueOffsets[0], length, valueOffsets)); // valueOffsets buffer first
    addBuffer.call(this, values.subarray(firstOffset, firstOffset + byteLength)); // sliced values buffer second
    return this;
}
function assembleListVector(vector) {
    const { length, valueOffsets } = vector;
    // If we have valueOffsets (ListVector), push that buffer first
    if (valueOffsets) {
        addBuffer.call(this, buffer_1.rebaseValueOffsets(valueOffsets[0], length, valueOffsets));
    }
    // Then insert the List's values child
    return this.visit(vector.getChildAt(0));
}
function assembleNestedVector(vector) {
    return this.visitMany(vector.type.children.map((_, i) => vector.getChildAt(i)).filter(Boolean))[0];
}
VectorAssembler.prototype.visitBool = assembleBoolVector;
VectorAssembler.prototype.visitInt = assembleFlatVector;
VectorAssembler.prototype.visitFloat = assembleFlatVector;
VectorAssembler.prototype.visitUtf8 = assembleFlatListVector;
VectorAssembler.prototype.visitBinary = assembleFlatListVector;
VectorAssembler.prototype.visitFixedSizeBinary = assembleFlatVector;
VectorAssembler.prototype.visitDate = assembleFlatVector;
VectorAssembler.prototype.visitTimestamp = assembleFlatVector;
VectorAssembler.prototype.visitTime = assembleFlatVector;
VectorAssembler.prototype.visitDecimal = assembleFlatVector;
VectorAssembler.prototype.visitList = assembleListVector;
VectorAssembler.prototype.visitStruct = assembleNestedVector;
VectorAssembler.prototype.visitUnion = assembleUnion;
VectorAssembler.prototype.visitInterval = assembleFlatVector;
VectorAssembler.prototype.visitFixedSizeList = assembleListVector;
VectorAssembler.prototype.visitMap = assembleNestedVector;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInZpc2l0b3IvdmVjdG9yYXNzZW1ibGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSw2REFBNkQ7QUFDN0QsK0RBQStEO0FBQy9ELHdEQUF3RDtBQUN4RCw2REFBNkQ7QUFDN0Qsb0RBQW9EO0FBQ3BELDZEQUE2RDtBQUM3RCw2REFBNkQ7QUFDN0QsRUFBRTtBQUNGLCtDQUErQztBQUMvQyxFQUFFO0FBQ0YsNkRBQTZEO0FBQzdELDhEQUE4RDtBQUM5RCx5REFBeUQ7QUFDekQsNERBQTREO0FBQzVELDBEQUEwRDtBQUMxRCxxQkFBcUI7O0FBR3JCLHNDQUFtQztBQUNuQyx3Q0FBcUM7QUFDckMsa0NBQTBDO0FBQzFDLGdEQUE2QztBQUU3QywyQ0FBb0Q7QUFDcEQscUNBQXdEO0FBQ3hELHFEQUFrRTtBQUNsRSxrQ0FJaUI7QUE0QmpCLE1BQWEsZUFBZ0IsU0FBUSxpQkFBTztJQWN4QztRQUF3QixLQUFLLEVBQUUsQ0FBQztRQTRCdEIsZ0JBQVcsR0FBRyxDQUFDLENBQUM7UUFDaEIsV0FBTSxHQUFnQixFQUFFLENBQUM7UUFDekIsYUFBUSxHQUFzQixFQUFFLENBQUM7UUFDakMsbUJBQWMsR0FBbUIsRUFBRSxDQUFDO0lBL0JiLENBQUM7SUFabEMsa0JBQWtCO0lBQ1gsTUFBTSxDQUFDLFFBQVEsQ0FBaUMsR0FBRyxJQUFpQjtRQUV2RSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsT0FBTyxDQUFDLEVBQVMsRUFBRSxDQUFNO1lBQzFELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFBRSxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2FBQUU7WUFDdkQsSUFBSSxDQUFDLENBQUMsQ0FBQyxZQUFZLHlCQUFXLENBQUMsRUFBRTtnQkFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFBRTtZQUN2RCxPQUFPLENB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LENBQUMsU0FBUyxHQUFrQixrQkFBa0IsQ0FBQztBQUN4RSxlQUFlLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBbUIsa0JBQWtCLENBQUM7QUFDeEUsZUFBZSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQWlCLGtCQUFrQixDQUFDO0FBQ3hFLGVBQWUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFjLHNCQUFzQixDQUFDO0FBQ3hFLGVBQWUsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFZLHNCQUFzQixDQUFDO0FBQ3hFLGVBQWUsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLEdBQU8sa0JBQWtCLENBQUM7QUFDeEUsZUFBZSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQWtCLGtCQUFrQixDQUFDO0FBQ3hFLGVBQWUsQ0FBQyxTQUFTLENBQUMsY0FBYyxHQUFhLGtCQUFrQixDQUFDO0FBQ3hFLGVBQWUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFrQixrQkFBa0IsQ0FBQztBQUN4RSxlQUFlLENBQUMsU0FBUyxDQUFDLFlBQVksR0FBZSxrQkFBa0IsQ0FBQztBQUN4RSxlQUFlLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBa0Isa0JBQWtCLENBQUM7QUFDeEUsZUFBZSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQWMsb0JBQW9CLENBQUM7QUFDeEUsZUFBZSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQXNCLGFBQWEsQ0FBQztBQUN4RSxlQUFlLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBYyxrQkFBa0IsQ0FBQztBQUN4RSxlQUFlLENBQUMsU0FBUyxDQUFDLGtCQUFrQixHQUFTLGtCQUFrQixDQUFDO0FBQ3hFLGVBQWUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFpQixvQkFBb0IsQ0FBQyIsImZpbGUiOiJ2aXNpdG9yL3ZlY3RvcmFzc2VtYmxlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBEYXRhIH0gZnJvbSAnLi4vZGF0YSc7XG5pbXBvcnQgeyBWZWN0b3IgfSBmcm9tICcuLi92ZWN0b3InO1xuaW1wb3J0IHsgVmlzaXRvciB9IGZyb20gJy4uL3Zpc2l0b3InO1xuaW1wb3J0IHsgVHlwZSwgVW5pb25Nb2RlIH0gZnJvbSAnLi4vZW51bSc7XG5pbXBvcnQgeyBSZWNvcmRCYXRjaCB9IGZyb20gJy4uL3JlY29yZGJhdGNoJztcbmltcG9ydCB7IFZlY3RvciBhcyBWVHlwZSB9IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgcmViYXNlVmFsdWVPZmZzZXRzIH0gZnJvbSAnLi4vdXRpbC9idWZmZXInO1xuaW1wb3J0IHsgcGFja0Jvb2xzLCB0cnVuY2F0ZUJpdG1hcCB9IGZyb20gJy4uL3V0aWwvYml0JztcbmltcG9ydCB7IEJ1ZmZlclJlZ2lvbiwgRmllbGROb2RlIH0gZnJvbSAnLi4vaXBjL21ldGFkYXRhL21lc3NhZ2UnO1xuaW1wb3J0IHtcbiAgICBEYXRhVHlwZSwgRGljdGlvbmFyeSxcbiAgICBGbG9hdCwgSW50LCBEYXRlXywgSW50ZXJ2YWwsIFRpbWUsIFRpbWVzdGFtcCwgVW5pb24sXG4gICAgQm9vbCwgTnVsbCwgVXRmOCwgQmluYXJ5LCBEZWNpbWFsLCBGaXhlZFNpemVCaW5hcnksIExpc3QsIEZpeGVkU2l6ZUxpc3QsIE1hcF8sIFN0cnVjdCxcbn0gZnJvbSAnLi4vdHlwZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVmVjdG9yQXNzZW1ibGVyIGV4dGVuZHMgVmlzaXRvciB7XG4gICAgdmlzaXRNYW55IDxUIGV4dGVuZHMgVmVjdG9yPiAgKG5vZGVzOiBUW10pOiB0aGlzW107XG4gICAgdmlzaXQgICAgIDxUIGV4dGVuZHMgVmVjdG9yPiAgKG5vZGU6IFQgICApOiB0aGlzO1xuICAgIGdldFZpc2l0Rm48VCBleHRlbmRzIFR5cGU+ICAgIChub2RlOiBUICAgICAgICk6ICh2ZWN0b3I6IFZUeXBlPFQ+KSA9PiB0aGlzO1xuICAgIGdldFZpc2l0Rm48VCBleHRlbmRzIERhdGFUeXBlPihub2RlOiBWVHlwZTxUPik6ICh2ZWN0b3I6IFZUeXBlPFQ+KSA9PiB0aGlzO1xuICAgIGdldFZpc2l0Rm48VCBleHRlbmRzIERhdGFUeXBlPihub2RlOiBEYXRhPFQ+ICk6ICh2ZWN0b3I6IFZUeXBlPFQ+KSA9PiB0aGlzO1xuICAgIGdldFZpc2l0Rm48VCBleHRlbmRzIERhdGFUeXBlPihub2RlOiBUICAgICAgICk6ICh2ZWN0b3I6IFZUeXBlPFQ+KSA9PiB0aGlzO1xuXG4gICAgdmlzaXRCb29sICAgICAgICAgICAgICAgICA8VCBleHRlbmRzIEJvb2w+ICAgICAgICAgICAgKHZlY3RvcjogVlR5cGU8VD4pOiB0aGlzO1xuICAgIHZpc2l0SW50ICAgICAgICAgICAgICAgICAgPFQgZXh0ZW5kcyBJbnQ+ICAgICAgICAgICAgICh2ZWN0b3I6IFZUeXBlPFQ+KTogdGhpcztcbiAgICB2aXNpdEZsb2F0ICAgICAgICAgICAgICAgIDxUIGV4dGVuZHMgRmxvYXQ+ICAgICAgICAgICAodmVjdG9yOiBWVHlwZTxUPik6IHRoaXM7XG4gICAgdmlzaXRVdGY4ICAgICAgICAgICAgICAgICA8VCBleHRlbmRzIFV0Zjg+ICAgICAgICAgICAgKHZlY3RvcjogVlR5cGU8VD4pOiB0aGlzO1xuICAgIHZpc2l0QmluYXJ5ICAgICAgICAgICAgICAgPFQgZXh0ZW5kcyBCaW5hcnk+ICAgICAgICAgICh2ZWN0b3I6IFZUeXBlPFQ+KTogdGhpcztcbiAgICB2aXNpdEZpeGVkU2l6ZUJpbmFyeSAgICAgIDxUIGV4dGVuZHMgRml4ZWRTaXplQmluYXJ5PiAodmVjdG9yOiBWVHlwZTxUPik6IHRoaXM7XG4gICAgdmlzaXREYXRlICAgICAgICAgICAgICAgICA8VCBleHRlbmRzIERhdGVfPiAgICAgICAgICAgKHZlY3RvcjogVlR5cGU8VD4pOiB0aGlzO1xuICAgIHZpc2l0VGltZXN0YW1wICAgICAgICAgICAgPFQgZXh0ZW5kcyBUaW1lc3RhbXA+ICAgICAgICh2ZWN0b3I6IFZUeXBlPFQ+KTogdGhpcztcbiAgICB2aXNpdFRpbWUgICAgICAgICAgICAgICAgIDxUIGV4dGVuZHMgVGltZT4gICAgICAgICAgICAodmVjdG9yOiBWVHlwZTxUPik6IHRoaXM7XG4gICAgdmlzaXREZWNpbWFsICAgICAgICAgICAgICA8VCBleHRlbmRzIERlY2ltYWw+ICAgICAgICAgKHZlY3RvcjogVlR5cGU8VD4pOiB0aGlzO1xuICAgIHZpc2l0TGlzdCAgICAgICAgICAgICAgICAgPFQgZXh0ZW5kcyBMaXN0PiAgICAgICAgICAgICh2ZWN0b3I6IFZUeXBlPFQ+KTogdGhpcztcbiAgICB2aXNpdFN0cnVjdCAgICAgICAgICAgICAgIDxUIGV4dGVuZHMgU3RydWN0PiAgICAgICAgICAodmVjdG9yOiBWVHlwZTxUPik6IHRoaXM7XG4gICAgdmlzaXRVbmlvbiAgICAgICAgICAgICAgICA8VCBleHRlbmRzIFVuaW9uPiAgICAgICAgICAgKHZlY3RvcjogVlR5cGU8VD4pOiB0aGlzO1xuICAgIHZpc2l0SW50ZXJ2YWwgICAgICAgICAgICAgPFQgZXh0ZW5kcyBJbnRlcnZhbD4gICAgICAgICh2ZWN0b3I6IFZUeXBlPFQ+KTogdGhpcztcbiAgICB2aXNpdEZpeGVkU2l6ZUxpc3QgICAgICAgIDxUIGV4dGVuZHMgRml4ZWRTaXplTGlzdD4gICAodmVjdG9yOiBWVHlwZTxUPik6IHRoaXM7XG4gICAgdmlzaXRNYXAgICAgICAgICAgICAgICAgICA8VCBleHRlbmRzIE1hcF8+ICAgICAgICAgICAgKHZlY3RvcjogVlR5cGU8VD4pOiB0aGlzO1xufVxuXG5leHBvcnQgY2xhc3MgVmVjdG9yQXNzZW1ibGVyIGV4dGVuZHMgVmlzaXRvciB7XG5cbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGFzc2VtYmxlPFQgZXh0ZW5kcyBWZWN0b3IgfCBSZWNvcmRCYXRjaD4oLi4uYXJnczogKFQgfCBUW10pW10pIHtcblxuICAgICAgICBjb25zdCB2ZWN0b3JzID0gYXJncy5yZWR1Y2UoZnVuY3Rpb24gZmxhdHRlbih4czogYW55W10sIHg6IGFueSk6IGFueVtdIHtcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHgpKSB7IHJldHVybiB4LnJlZHVjZShmbGF0dGVuLCB4cyk7IH1cbiAgICAgICAgICAgIGlmICghKHggaW5zdGFuY2VvZiBSZWNvcmRCYXRjaCkpIHsgcmV0dXJuIFsuLi54cywgeF07IH1cbiAgICAgICAgICAgIHJldHVybiBbLi4ueHMsIC4uLnguc2NoZW1hLmZpZWxkcy5tYXAoKF8sIGkpID0+IHguZ2V0Q2hpbGRBdChpKSEpXTtcbiAgICAgICAgfSwgW10pLmZpbHRlcigoeDogYW55KTogeCBpcyBWZWN0b3IgPT4geCBpbnN0YW5jZW9mIFZlY3Rvcik7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBWZWN0b3JBc3NlbWJsZXIoKS52aXNpdE1hbnkodmVjdG9ycylbMF07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjb25zdHJ1Y3RvcigpIHsgc3VwZXIoKTsgfVxuXG4gICAgcHVibGljIHZpc2l0PFQgZXh0ZW5kcyBWZWN0b3I+KHZlY3RvcjogVCk6IHRoaXMge1xuICAgICAgICBpZiAoIURhdGFUeXBlLmlzRGljdGlvbmFyeSh2ZWN0b3IudHlwZSkpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGF0YSwgbGVuZ3RoLCBudWxsQ291bnQgfSA9IHZlY3RvcjtcbiAgICAgICAgICAgIGlmIChsZW5ndGggPiAyMTQ3NDgzNjQ3KSB7XG4gICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQ2Fubm90IHdyaXRlIGFycmF5cyBsYXJnZXIgdGhhbiAyXjMxIC0gMSBpbiBsZW5ndGgnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFkZEJ1ZmZlci5jYWxsKHRoaXMsIG51bGxDb3VudCA8PSAwXG4gICAgICAgICAgICAgICAgPyBuZXcgVWludDhBcnJheSgwKSAvLyBwbGFjZWhvbGRlciB2YWxpZGl0eSBidWZmZXJcbiAgICAgICAgICAgICAgICA6IHRydW5jYXRlQml0bWFwKGRhdGEub2Zmc2V0LCBsZW5ndGgsIGRhdGEubnVsbEJpdG1hcClcbiAgICAgICAgICAgICkubm9kZXMucHVzaChuZXcgRmllbGROb2RlKGxlbmd0aCwgbnVsbENvdW50KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN1cGVyLnZpc2l0KHZlY3Rvcik7XG4gICAgfVxuXG4gICAgcHVibGljIHZpc2l0TnVsbDxUIGV4dGVuZHMgTnVsbD4oX251bGxWOiBWVHlwZTxUPikgeyByZXR1cm4gdGhpczsgfVxuICAgIHB1YmxpYyB2aXNpdERpY3Rpb25hcnk8VCBleHRlbmRzIERpY3Rpb25hcnk+KHZlY3RvcjogVlR5cGU8VD4pIHtcbiAgICAgICAgLy8gQXNzZW1ibGUgdGhlIGluZGljZXMgaGVyZSwgRGljdGlvbmFyeSBhc3NlbWJsZWQgc2VwYXJhdGVseS5cbiAgICAgICAgcmV0dXJuIHRoaXMudmlzaXQodmVjdG9yLmluZGljZXMpO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXQgbm9kZXMoKSB7IHJldHVybiB0aGlzLl9ub2RlczsgfVxuICAgIHB1YmxpYyBnZXQgYnVmZmVycygpIHsgcmV0dXJuIHRoaXMuX2J1ZmZlcnM7IH1cbiAgICBwdWJsaWMgZ2V0IGJ5dGVMZW5ndGgoKSB7IHJldHVybiB0aGlzLl9ieXRlTGVuZ3RoOyB9XG4gICAgcHVibGljIGdldCBidWZmZXJSZWdpb25zKCkgeyByZXR1cm4gdGhpcy5fYnVmZmVyUmVnaW9uczsgfVxuXG4gICAgcHJvdGVjdGVkIF9ieXRlTGVuZ3RoID0gMDtcbiAgICBwcm90ZWN0ZWQgX25vZGVzOiBGaWVsZE5vZGVbXSA9IFtdO1xuICAgIHByb3RlY3RlZCBfYnVmZmVyczogQXJyYXlCdWZmZXJWaWV3W10gPSBbXTtcbiAgICBwcm90ZWN0ZWQgX2J1ZmZlclJlZ2lvbnM6IEJ1ZmZlclJlZ2lvbltdID0gW107XG59XG5cbmZ1bmN0aW9uIGFkZEJ1ZmZlcih0aGlzOiBWZWN0b3JBc3NlbWJsZXIsIHZhbHVlczogQXJyYXlCdWZmZXJWaWV3KSB7XG4gICAgY29uc3QgYnl0ZUxlbmd0aCA9ICh2YWx1ZXMuYnl0ZUxlbmd0aCArIDcpICYgfjc7IC8vIFJvdW5kIHVwIHRvIGEgbXVsdGlwbGUgb2YgOFxuICAgIHRoaXMuYnVmZmVycy5wdXNoKHZhbHVlcyk7XG4gICAgdGhpcy5idWZmZXJSZWdpb25zLnB1c2gobmV3IEJ1ZmZlclJlZ2lvbih0aGlzLl9ieXRlTGVuZ3RoLCBieXRlTGVuZ3RoKSk7XG4gICAgdGhpcy5fYnl0ZUxlbmd0aCArPSBieXRlTGVuZ3RoO1xuICAgIHJldHVybiB0aGlzO1xufVxuXG5mdW5jdGlvbiBhc3NlbWJsZVVuaW9uPFQgZXh0ZW5kcyBVbmlvbj4odGhpczogVmVjdG9yQXNzZW1ibGVyLCB2ZWN0b3I6IFZUeXBlPFQ+KSB7XG4gICAgY29uc3QgeyB0eXBlLCBsZW5ndGgsIHR5cGVJZHMsIHZhbHVlT2Zmc2V0cyB9ID0gdmVjdG9yO1xuICAgIC8vIEFsbCBVbmlvbiBWZWN0b3JzIGhhdmUgYSB0eXBlSWRzIGJ1ZmZlclxuICAgIGFkZEJ1ZmZlci5jYWxsKHRoaXMsIHR5cGVJZHMpO1xuICAgIC8vIElmIHRoaXMgaXMgYSBTcGFyc2UgVW5pb24sIHRyZWF0IGl0IGxpa2UgYWxsIG90aGVyIE5lc3RlZCB0eXBlc1xuICAgIGlmICh0eXBlLm1vZGUgPT09IFVuaW9uTW9kZS5TcGFyc2UpIHtcbiAgICAgICAgcmV0dXJuIGFzc2VtYmxlTmVzdGVkVmVjdG9yLmNhbGwodGhpcywgdmVjdG9yKTtcbiAgICB9IGVsc2UgaWYgKHR5cGUubW9kZSA9PT0gVW5pb25Nb2RlLkRlbnNlKSB7XG4gICAgICAgIC8vIElmIHRoaXMgaXMgYSBEZW5zZSBVbmlvbiwgYWRkIHRoZSB2YWx1ZU9mZnNldHMgYnVmZmVyIGFuZCBwb3RlbnRpYWxseSBzbGljZSB0aGUgY2hpbGRyZW5cbiAgICAgICAgaWYgKHZlY3Rvci5vZmZzZXQgPD0gMCkge1xuICAgICAgICAgICAgLy8gSWYgdGhlIFZlY3RvciBoYXNuJ3QgYmVlbiBzbGljZWQsIHdyaXRlIHRoZSBleGlzdGluZyB2YWx1ZU9mZnNldHNcbiAgICAgICAgICAgIGFkZEJ1ZmZlci5jYWxsKHRoaXMsIHZhbHVlT2Zmc2V0cyk7XG4gICAgICAgICAgICAvLyBXZSBjYW4gdHJlYXQgdGhpcyBsaWtlIGFsbCBvdGhlciBOZXN0ZWQgdHlwZXNcbiAgICAgICAgICAgIHJldHVybiBhc3NlbWJsZU5lc3RlZFZlY3Rvci5jYWxsKHRoaXMsIHZlY3Rvcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBBIHNsaWNlZCBEZW5zZSBVbmlvbiBpcyBhbiB1bnBsZWFzYW50IGNhc2UuIEJlY2F1c2UgdGhlIG9mZnNldHMgYXJlIGRpZmZlcmVudCBmb3JcbiAgICAgICAgICAgIC8vIGVhY2ggY2hpbGQgdmVjdG9yLCB3ZSBuZWVkIHRvIFwicmViYXNlXCIgdGhlIHZhbHVlT2Zmc2V0cyBmb3IgZWFjaCBjaGlsZFxuICAgICAgICAgICAgLy8gVW5pb24gdHlwZUlkcyBhcmUgbm90IG5lY2Vzc2FyeSAwLWluZGV4ZWRcbiAgICAgICAgICAgIGNvbnN0IG1heENoaWxkVHlwZUlkID0gdHlwZUlkcy5yZWR1Y2UoKHgsIHkpID0+IE1hdGgubWF4KHgsIHkpLCB0eXBlSWRzWzBdKTtcbiAgICAgICAgICAgIGNvbnN0IGNoaWxkTGVuZ3RocyA9IG5ldyBJbnQzMkFycmF5KG1heENoaWxkVHlwZUlkICsgMSk7XG4gICAgICAgICAgICAvLyBTZXQgYWxsIHRvIC0xIHRvIGluZGljYXRlIHRoYXQgd2UgaGF2ZW4ndCBvYnNlcnZlZCBhIGZpcnN0IG9jY3VycmVuY2Ugb2YgYSBwYXJ0aWN1bGFyIGNoaWxkIHlldFxuICAgICAgICAgICAgY29uc3QgY2hpbGRPZmZzZXRzID0gbmV3IEludDMyQXJyYXkobWF4Q2hpbGRUeXBlSWQgKyAxKS5maWxsKC0xKTtcbiAgICAgICAgICAgIGNvbnN0IHNoaWZ0ZWRPZmZzZXRzID0gbmV3IEludDMyQXJyYXkobGVuZ3RoKTtcbiAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgYSBub24temVybyBvZmZzZXQsIHRoZW4gdGhlIHZhbHVlIG9mZnNldHMgZG8gbm90IHN0YXJ0IGF0XG4gICAgICAgICAgICAvLyB6ZXJvLiBXZSBtdXN0IGEpIGNyZWF0ZSBhIG5ldyBvZmZzZXRzIGFycmF5IHdpdGggc2hpZnRlZCBvZmZzZXRzIGFuZFxuICAgICAgICAgICAgLy8gYikgc2xpY2UgdGhlIHZhbHVlcyBhcnJheSBhY2NvcmRpbmdseVxuICAgICAgICAgICAgY29uc3QgdW5zaGlmdGVkT2Zmc2V0cyA9IHJlYmFzZVZhbHVlT2Zmc2V0cygtdmFsdWVPZmZzZXRzWzBdLCBsZW5ndGgsIHZhbHVlT2Zmc2V0cyk7XG4gICAgICAgICAgICBmb3IgKGxldCB0eXBlSWQsIHNoaWZ0LCBpbmRleCA9IC0xOyArK2luZGV4IDwgbGVuZ3RoOykge1xuICAgICAgICAgICAgICAgIGlmICgoc2hpZnQgPSBjaGlsZE9mZnNldHNbdHlwZUlkID0gdHlwZUlkc1tpbmRleF1dKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgc2hpZnQgPSBjaGlsZE9mZnNldHNbdHlwZUlkXSA9IHVuc2hpZnRlZE9mZnNldHNbdHlwZUlkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2hpZnRlZE9mZnNldHNbaW5kZXhdID0gdW5zaGlmdGVkT2Zmc2V0c1tpbmRleF0gLSBzaGlmdDtcbiAgICAgICAgICAgICAgICArK2NoaWxkTGVuZ3Roc1t0eXBlSWRdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYWRkQnVmZmVyLmNhbGwodGhpcywgc2hpZnRlZE9mZnNldHMpO1xuICAgICAgICAgICAgLy8gU2xpY2UgYW5kIHZpc2l0IGNoaWxkcmVuIGFjY29yZGluZ2x5XG4gICAgICAgICAgICBmb3IgKGxldCBjaGlsZDogVmVjdG9yIHwgbnVsbCwgY2hpbGRJbmRleCA9IC0xLCBudW1DaGlsZHJlbiA9IHR5cGUuY2hpbGRyZW4ubGVuZ3RoOyArK2NoaWxkSW5kZXggPCBudW1DaGlsZHJlbjspIHtcbiAgICAgICAgICAgICAgICBpZiAoY2hpbGQgPSB2ZWN0b3IuZ2V0Q2hpbGRBdChjaGlsZEluZGV4KSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0eXBlSWQgPSB0eXBlLnR5cGVJZHNbY2hpbGRJbmRleF07XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkTGVuZ3RoID0gTWF0aC5taW4obGVuZ3RoLCBjaGlsZExlbmd0aHNbdHlwZUlkXSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudmlzaXQoY2hpbGQuc2xpY2UoY2hpbGRPZmZzZXRzW3R5cGVJZF0sIGNoaWxkTGVuZ3RoKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufVxuXG5mdW5jdGlvbiBhc3NlbWJsZUJvb2xWZWN0b3I8VCBleHRlbmRzIEJvb2w+KHRoaXM6IFZlY3RvckFzc2VtYmxlciwgdmVjdG9yOiBWVHlwZTxUPikge1xuICAgIC8vIEJvb2wgdmVjdG9yIGlzIGEgc3BlY2lhbCBjYXNlIG9mIEZsYXRWZWN0b3IsIGFzIGl0cyBkYXRhIGJ1ZmZlciBuZWVkcyB0byBzdGF5IHBhY2tlZFxuICAgIGxldCB2YWx1ZXM6IFVpbnQ4QXJyYXk7XG4gICAgaWYgKHZlY3Rvci5udWxsQ291bnQgPj0gdmVjdG9yLmxlbmd0aCkge1xuICAgICAgICAvLyBJZiBhbGwgdmFsdWVzIGFyZSBudWxsLCBqdXN0IGluc2VydCBhIHBsYWNlaG9sZGVyIGVtcHR5IGRhdGEgYnVmZmVyIChmYXN0ZXN0IHBhdGgpXG4gICAgICAgIHJldHVybiBhZGRCdWZmZXIuY2FsbCh0aGlzLCBuZXcgVWludDhBcnJheSgwKSk7XG4gICAgfSBlbHNlIGlmICgodmFsdWVzID0gdmVjdG9yLnZhbHVlcykgaW5zdGFuY2VvZiBVaW50OEFycmF5KSB7XG4gICAgICAgIC8vIElmIHZhbHVlcyBpcyBhbHJlYWR5IGEgVWludDhBcnJheSwgc2xpY2UgdGhlIGJpdG1hcCAoZmFzdCBwYXRoKVxuICAgICAgICByZXR1cm4gYWRkQnVmZmVyLmNhbGwodGhpcywgdHJ1bmNhdGVCaXRtYXAodmVjdG9yLm9mZnNldCwgdmVjdG9yLmxlbmd0aCwgdmFsdWVzKSk7XG4gICAgfVxuICAgIC8vIE90aGVyd2lzZSBpZiB0aGUgdW5kZXJseWluZyBkYXRhICppc24ndCogYSBVaW50OEFycmF5LCBlbnVtZXJhdGUgdGhlXG4gICAgLy8gdmFsdWVzIGFzIGJvb2xzIGFuZCByZS1wYWNrIHRoZW0gaW50byBhIFVpbnQ4QXJyYXkuIFRoaXMgY29kZSBpc24ndFxuICAgIC8vIHJlYWNoYWJsZSB1bmxlc3MgeW91J3JlIHRyeWluZyB0byBtYW5pcHVsYXRlIHRoZSBEYXRhIGludGVybmFscyxcbiAgICAvLyB3ZSB3ZSdyZSBvbmx5IGRvaW5nIHRoaXMgZm9yIHNhZmV0eS5cbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICAgIHJldHVybiBhZGRCdWZmZXIuY2FsbCh0aGlzLCBwYWNrQm9vbHModmVjdG9yKSk7XG59XG5cbmZ1bmN0aW9uIGFzc2VtYmxlRmxhdFZlY3RvcjxUIGV4dGVuZHMgSW50IHwgRmxvYXQgfCBGaXhlZFNpemVCaW5hcnkgfCBEYXRlXyB8IFRpbWVzdGFtcCB8IFRpbWUgfCBEZWNpbWFsIHwgSW50ZXJ2YWw+KHRoaXM6IFZlY3RvckFzc2VtYmxlciwgdmVjdG9yOiBWVHlwZTxUPikge1xuICAgIHJldHVybiBhZGRCdWZmZXIuY2FsbCh0aGlzLCB2ZWN0b3IudmFsdWVzLnN1YmFycmF5KDAsIHZlY3Rvci5sZW5ndGggKiB2ZWN0b3Iuc3RyaWRlKSk7XG59XG5cbmZ1bmN0aW9uIGFzc2VtYmxlRmxhdExpc3RWZWN0b3I8VCBleHRlbmRzIFV0ZjggfCBCaW5hcnk+KHRoaXM6IFZlY3RvckFzc2VtYmxlciwgdmVjdG9yOiBWVHlwZTxUPikge1xuICAgIGNvbnN0IHsgbGVuZ3RoLCB2YWx1ZXMsIHZhbHVlT2Zmc2V0cyB9ID0gdmVjdG9yO1xuICAgIGNvbnN0IGZpcnN0T2Zmc2V0ID0gdmFsdWVPZmZzZXRzWzBdO1xuICAgIGNvbnN0IGxhc3RPZmZzZXQgPSB2YWx1ZU9mZnNldHNbbGVuZ3RoXTtcbiAgICBjb25zdCBieXRlTGVuZ3RoID0gTWF0aC5taW4obGFzdE9mZnNldCAtIGZpcnN0T2Zmc2V0LCB2YWx1ZXMuYnl0ZUxlbmd0aCAtIGZpcnN0T2Zmc2V0KTtcbiAgICAvLyBQdXNoIGluIHRoZSBvcmRlciBGbGF0TGlzdCB0eXBlcyByZWFkIHRoZWlyIGJ1ZmZlcnNcbiAgICBhZGRCdWZmZXIuY2FsbCh0aGlzLCByZWJhc2VWYWx1ZU9mZnNldHMoLXZhbHVlT2Zmc2V0c1swXSwgbGVuZ3RoLCB2YWx1ZU9mZnNldHMpKTsgLy8gdmFsdWVPZmZzZXRzIGJ1ZmZlciBmaXJzdFxuICAgIGFkZEJ1ZmZlci5jYWxsKHRoaXMsIHZhbHVlcy5zdWJhcnJheShmaXJzdE9mZnNldCwgZmlyc3RPZmZzZXQgKyBieXRlTGVuZ3RoKSk7IC8vIHNsaWNlZCB2YWx1ZXMgYnVmZmVyIHNlY29uZFxuICAgIHJldHVybiB0aGlzO1xufVxuXG5mdW5jdGlvbiBhc3NlbWJsZUxpc3RWZWN0b3I8VCBleHRlbmRzIExpc3QgfCBGaXhlZFNpemVMaXN0Pih0aGlzOiBWZWN0b3JBc3NlbWJsZXIsIHZlY3RvcjogVlR5cGU8VD4pIHtcbiAgICBjb25zdCB7IGxlbmd0aCwgdmFsdWVPZmZzZXRzIH0gPSB2ZWN0b3I7XG4gICAgLy8gSWYgd2UgaGF2ZSB2YWx1ZU9mZnNldHMgKExpc3RWZWN0b3IpLCBwdXNoIHRoYXQgYnVmZmVyIGZpcnN0XG4gICAgaWYgKHZhbHVlT2Zmc2V0cykge1xuICAgICAgICBhZGRCdWZmZXIuY2FsbCh0aGlzLCByZWJhc2VWYWx1ZU9mZnNldHModmFsdWVPZmZzZXRzWzBdLCBsZW5ndGgsIHZhbHVlT2Zmc2V0cykpO1xuICAgIH1cbiAgICAvLyBUaGVuIGluc2VydCB0aGUgTGlzdCdzIHZhbHVlcyBjaGlsZFxuICAgIHJldHVybiB0aGlzLnZpc2l0KHZlY3Rvci5nZXRDaGlsZEF0KDApISk7XG59XG5cbmZ1bmN0aW9uIGFzc2VtYmxlTmVzdGVkVmVjdG9yPFQgZXh0ZW5kcyBTdHJ1Y3QgfCBNYXBfIHwgVW5pb24+KHRoaXM6IFZlY3RvckFzc2VtYmxlciwgdmVjdG9yOiBWVHlwZTxUPikge1xuICAgIHJldHVybiB0aGlzLnZpc2l0TWFueSh2ZWN0b3IudHlwZS5jaGlsZHJlbi5tYXAoKF8sIGkpID0+IHZlY3Rvci5nZXRDaGlsZEF0KGkpISkuZmlsdGVyKEJvb2xlYW4pKVswXTtcbn1cblxuVmVjdG9yQXNzZW1ibGVyLnByb3RvdHlwZS52aXNpdEJvb2wgICAgICAgICAgICA9ICAgICBhc3NlbWJsZUJvb2xWZWN0b3I7XG5WZWN0b3JBc3NlbWJsZXIucHJvdG90eXBlLnZpc2l0SW50ICAgICAgICAgICAgID0gICAgIGFzc2VtYmxlRmxhdFZlY3RvcjtcblZlY3RvckFzc2VtYmxlci5wcm90b3R5cGUudmlzaXRGbG9hdCAgICAgICAgICAgPSAgICAgYXNzZW1ibGVGbGF0VmVjdG9yO1xuVmVjdG9yQXNzZW1ibGVyLnByb3RvdHlwZS52aXNpdFV0ZjggICAgICAgICAgICA9IGFzc2VtYmxlRmxhdExpc3RWZWN0b3I7XG5WZWN0b3JBc3NlbWJsZXIucHJvdG90eXBlLnZpc2l0QmluYXJ5ICAgICAgICAgID0gYXNzZW1ibGVGbGF0TGlzdFZlY3RvcjtcblZlY3RvckFzc2VtYmxlci5wcm90b3R5cGUudmlzaXRGaXhlZFNpemVCaW5hcnkgPSAgICAgYXNzZW1ibGVGbGF0VmVjdG9yO1xuVmVjdG9yQXNzZW1ibGVyLnByb3RvdHlwZS52aXNpdERhdGUgICAgICAgICAgICA9ICAgICBhc3NlbWJsZUZsYXRWZWN0b3I7XG5WZWN0b3JBc3NlbWJsZXIucHJvdG90eXBlLnZpc2l0VGltZXN0YW1wICAgICAgID0gICAgIGFzc2VtYmxlRmxhdFZlY3RvcjtcblZlY3RvckFzc2VtYmxlci5wcm90b3R5cGUudmlzaXRUaW1lICAgICAgICAgICAgPSAgICAgYXNzZW1ibGVGbGF0VmVjdG9yO1xuVmVjdG9yQXNzZW1ibGVyLnByb3RvdHlwZS52aXNpdERlY2ltYWwgICAgICAgICA9ICAgICBhc3NlbWJsZUZsYXRWZWN0b3I7XG5WZWN0b3JBc3NlbWJsZXIucHJvdG90eXBlLnZpc2l0TGlzdCAgICAgICAgICAgID0gICAgIGFzc2VtYmxlTGlzdFZlY3RvcjtcblZlY3RvckFzc2VtYmxlci5wcm90b3R5cGUudmlzaXRTdHJ1Y3QgICAgICAgICAgPSAgIGFzc2VtYmxlTmVzdGVkVmVjdG9yO1xuVmVjdG9yQXNzZW1ibGVyLnByb3RvdHlwZS52aXNpdFVuaW9uICAgICAgICAgICA9ICAgICAgICAgIGFzc2VtYmxlVW5pb247XG5WZWN0b3JBc3NlbWJsZXIucHJvdG90eXBlLnZpc2l0SW50ZXJ2YWwgICAgICAgID0gICAgIGFzc2VtYmxlRmxhdFZlY3RvcjtcblZlY3RvckFzc2VtYmxlci5wcm90b3R5cGUudmlzaXRGaXhlZFNpemVMaXN0ICAgPSAgICAgYXNzZW1ibGVMaXN0VmVjdG9yO1xuVmVjdG9yQXNzZW1ibGVyLnByb3RvdHlwZS52aXNpdE1hcCAgICAgICAgICAgICA9ICAgYXNzZW1ibGVOZXN0ZWRWZWN0b3I7XG4iXX0=

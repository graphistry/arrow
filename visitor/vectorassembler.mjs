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
import { Vector } from '../vector';
import { Visitor } from '../visitor';
import { UnionMode } from '../enum';
import { RecordBatch } from '../recordbatch';
import { rebaseValueOffsets } from '../util/buffer';
import { packBools, truncateBitmap } from '../util/bit';
import { BufferRegion, FieldNode } from '../ipc/metadata/message';
import { DataType, } from '../type';
export class VectorAssembler extends Visitor {
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
            if (!(x instanceof RecordBatch)) {
                return [...xs, x];
            }
            return [...xs, ...x.schema.fields.map((_, i) => x.getChildAt(i))];
        }, []).filter((x) => x instanceof Vector);
        return new VectorAssembler().visitMany(vectors)[0];
    }
    visit(vector) {
        if (!DataType.isDictionary(vector.type)) {
            const { data, length, nullCount } = vector;
            if (length > 2147483647) {
                /* istanbul ignore next */
                throw new RangeError('Cannot write arrays larger than 2^31 - 1 in length');
            }
            addBuffer.call(this, nullCount <= 0
                ? new Uint8Array(0) // placeholder validity buffer
                : truncateBitmap(data.offset, length, data.nullBitmap)).nodes.push(new FieldNode(length, nullCount));
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
/** @ignore */
function addBuffer(values) {
    const byteLength = (values.byteLength + 7) & ~7; // Round up to a multiple of 8
    this.buffers.push(values);
    this.bufferRegions.push(new BufferRegion(this._byteLength, byteLength));
    this._byteLength += byteLength;
    return this;
}
/** @ignore */
function assembleUnion(vector) {
    const { type, length, typeIds, valueOffsets } = vector;
    // All Union Vectors have a typeIds buffer
    addBuffer.call(this, typeIds);
    // If this is a Sparse Union, treat it like all other Nested types
    if (type.mode === UnionMode.Sparse) {
        return assembleNestedVector.call(this, vector);
    }
    else if (type.mode === UnionMode.Dense) {
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
            const unshiftedOffsets = rebaseValueOffsets(-valueOffsets[0], length, valueOffsets);
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
/** @ignore */
function assembleBoolVector(vector) {
    // Bool vector is a special case of FlatVector, as its data buffer needs to stay packed
    let values;
    if (vector.nullCount >= vector.length) {
        // If all values are null, just insert a placeholder empty data buffer (fastest path)
        return addBuffer.call(this, new Uint8Array(0));
    }
    else if ((values = vector.values) instanceof Uint8Array) {
        // If values is already a Uint8Array, slice the bitmap (fast path)
        return addBuffer.call(this, truncateBitmap(vector.offset, vector.length, values));
    }
    // Otherwise if the underlying data *isn't* a Uint8Array, enumerate the
    // values as bools and re-pack them into a Uint8Array. This code isn't
    // reachable unless you're trying to manipulate the Data internals,
    // we we're only doing this for safety.
    /* istanbul ignore next */
    return addBuffer.call(this, packBools(vector));
}
/** @ignore */
function assembleFlatVector(vector) {
    return addBuffer.call(this, vector.values.subarray(0, vector.length * vector.stride));
}
/** @ignore */
function assembleFlatListVector(vector) {
    const { length, values, valueOffsets } = vector;
    const firstOffset = valueOffsets[0];
    const lastOffset = valueOffsets[length];
    const byteLength = Math.min(lastOffset - firstOffset, values.byteLength - firstOffset);
    // Push in the order FlatList types read their buffers
    addBuffer.call(this, rebaseValueOffsets(-valueOffsets[0], length, valueOffsets)); // valueOffsets buffer first
    addBuffer.call(this, values.subarray(firstOffset, firstOffset + byteLength)); // sliced values buffer second
    return this;
}
/** @ignore */
function assembleListVector(vector) {
    const { length, valueOffsets } = vector;
    // If we have valueOffsets (ListVector), push that buffer first
    if (valueOffsets) {
        addBuffer.call(this, rebaseValueOffsets(valueOffsets[0], length, valueOffsets));
    }
    // Then insert the List's values child
    return this.visit(vector.getChildAt(0));
}
/** @ignore */
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInZpc2l0b3IvdmVjdG9yYXNzZW1ibGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDZEQUE2RDtBQUM3RCwrREFBK0Q7QUFDL0Qsd0RBQXdEO0FBQ3hELDZEQUE2RDtBQUM3RCxvREFBb0Q7QUFDcEQsNkRBQTZEO0FBQzdELDZEQUE2RDtBQUM3RCxFQUFFO0FBQ0YsK0NBQStDO0FBQy9DLEVBQUU7QUFDRiw2REFBNkQ7QUFDN0QsOERBQThEO0FBQzlELHlEQUF5RDtBQUN6RCw0REFBNEQ7QUFDNUQsMERBQTBEO0FBQzFELHFCQUFxQjtBQUdyQixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ25DLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDckMsT0FBTyxFQUFRLFNBQVMsRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUMxQyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFFN0MsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDcEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxjQUFjLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDeEQsT0FBTyxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNsRSxPQUFPLEVBQ0gsUUFBUSxHQUdYLE1BQU0sU0FBUyxDQUFDO0FBNEJqQixNQUFNLE9BQU8sZUFBZ0IsU0FBUSxPQUFPO0lBY3hDO1FBQXdCLEtBQUssRUFBRSxDQUFDO1FBNEJ0QixnQkFBVyxHQUFHLENBQUMsQ0FBQztRQUNoQixXQUFNLEdBQWdCLEVBQUUsQ0FBQztRQUN6QixhQUFRLEdBQXNCLEVBQUUsQ0FBQztRQUNqQyxtQkFBYyxHQUFtQixFQUFFLENBQUM7SUEvQmIsQ0FBQztJQVpsQyxrQkFBa0I7SUFDWCxNQUFNLENBQUMsUUFBUSxDQUFpQyxHQUFHLElBQWlCO1FBRXZFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFN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QUFzQixhQUFhLENBQUM7QUFDeEUsZUFBZSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEdBQWMsa0JBQWtCLENBQUM7QUFDeEUsZUFBZSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsR0FBUyxrQkFBa0IsQ0FBQztBQUN4RSxlQUFlLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBaUIsb0JBQW9CLENBQUMiLCJmaWxlIjoidmlzaXRvci92ZWN0b3Jhc3NlbWJsZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgRGF0YSB9IGZyb20gJy4uL2RhdGEnO1xuaW1wb3J0IHsgVmVjdG9yIH0gZnJvbSAnLi4vdmVjdG9yJztcbmltcG9ydCB7IFZpc2l0b3IgfSBmcm9tICcuLi92aXNpdG9yJztcbmltcG9ydCB7IFR5cGUsIFVuaW9uTW9kZSB9IGZyb20gJy4uL2VudW0nO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2ggfSBmcm9tICcuLi9yZWNvcmRiYXRjaCc7XG5pbXBvcnQgeyBWZWN0b3IgYXMgVlR5cGUgfSBmcm9tICcuLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IHJlYmFzZVZhbHVlT2Zmc2V0cyB9IGZyb20gJy4uL3V0aWwvYnVmZmVyJztcbmltcG9ydCB7IHBhY2tCb29scywgdHJ1bmNhdGVCaXRtYXAgfSBmcm9tICcuLi91dGlsL2JpdCc7XG5pbXBvcnQgeyBCdWZmZXJSZWdpb24sIEZpZWxkTm9kZSB9IGZyb20gJy4uL2lwYy9tZXRhZGF0YS9tZXNzYWdlJztcbmltcG9ydCB7XG4gICAgRGF0YVR5cGUsIERpY3Rpb25hcnksXG4gICAgRmxvYXQsIEludCwgRGF0ZV8sIEludGVydmFsLCBUaW1lLCBUaW1lc3RhbXAsIFVuaW9uLFxuICAgIEJvb2wsIE51bGwsIFV0ZjgsIEJpbmFyeSwgRGVjaW1hbCwgRml4ZWRTaXplQmluYXJ5LCBMaXN0LCBGaXhlZFNpemVMaXN0LCBNYXBfLCBTdHJ1Y3QsXG59IGZyb20gJy4uL3R5cGUnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFZlY3RvckFzc2VtYmxlciBleHRlbmRzIFZpc2l0b3Ige1xuICAgIHZpc2l0TWFueSA8VCBleHRlbmRzIFZlY3Rvcj4gIChub2RlczogVFtdKTogdGhpc1tdO1xuICAgIHZpc2l0ICAgICA8VCBleHRlbmRzIFZlY3Rvcj4gIChub2RlOiBUICAgKTogdGhpcztcbiAgICBnZXRWaXNpdEZuPFQgZXh0ZW5kcyBUeXBlPiAgICAobm9kZTogVCAgICAgICApOiAodmVjdG9yOiBWVHlwZTxUPikgPT4gdGhpcztcbiAgICBnZXRWaXNpdEZuPFQgZXh0ZW5kcyBEYXRhVHlwZT4obm9kZTogVlR5cGU8VD4pOiAodmVjdG9yOiBWVHlwZTxUPikgPT4gdGhpcztcbiAgICBnZXRWaXNpdEZuPFQgZXh0ZW5kcyBEYXRhVHlwZT4obm9kZTogRGF0YTxUPiApOiAodmVjdG9yOiBWVHlwZTxUPikgPT4gdGhpcztcbiAgICBnZXRWaXNpdEZuPFQgZXh0ZW5kcyBEYXRhVHlwZT4obm9kZTogVCAgICAgICApOiAodmVjdG9yOiBWVHlwZTxUPikgPT4gdGhpcztcblxuICAgIHZpc2l0Qm9vbCAgICAgICAgICAgICAgICAgPFQgZXh0ZW5kcyBCb29sPiAgICAgICAgICAgICh2ZWN0b3I6IFZUeXBlPFQ+KTogdGhpcztcbiAgICB2aXNpdEludCAgICAgICAgICAgICAgICAgIDxUIGV4dGVuZHMgSW50PiAgICAgICAgICAgICAodmVjdG9yOiBWVHlwZTxUPik6IHRoaXM7XG4gICAgdmlzaXRGbG9hdCAgICAgICAgICAgICAgICA8VCBleHRlbmRzIEZsb2F0PiAgICAgICAgICAgKHZlY3RvcjogVlR5cGU8VD4pOiB0aGlzO1xuICAgIHZpc2l0VXRmOCAgICAgICAgICAgICAgICAgPFQgZXh0ZW5kcyBVdGY4PiAgICAgICAgICAgICh2ZWN0b3I6IFZUeXBlPFQ+KTogdGhpcztcbiAgICB2aXNpdEJpbmFyeSAgICAgICAgICAgICAgIDxUIGV4dGVuZHMgQmluYXJ5PiAgICAgICAgICAodmVjdG9yOiBWVHlwZTxUPik6IHRoaXM7XG4gICAgdmlzaXRGaXhlZFNpemVCaW5hcnkgICAgICA8VCBleHRlbmRzIEZpeGVkU2l6ZUJpbmFyeT4gKHZlY3RvcjogVlR5cGU8VD4pOiB0aGlzO1xuICAgIHZpc2l0RGF0ZSAgICAgICAgICAgICAgICAgPFQgZXh0ZW5kcyBEYXRlXz4gICAgICAgICAgICh2ZWN0b3I6IFZUeXBlPFQ+KTogdGhpcztcbiAgICB2aXNpdFRpbWVzdGFtcCAgICAgICAgICAgIDxUIGV4dGVuZHMgVGltZXN0YW1wPiAgICAgICAodmVjdG9yOiBWVHlwZTxUPik6IHRoaXM7XG4gICAgdmlzaXRUaW1lICAgICAgICAgICAgICAgICA8VCBleHRlbmRzIFRpbWU+ICAgICAgICAgICAgKHZlY3RvcjogVlR5cGU8VD4pOiB0aGlzO1xuICAgIHZpc2l0RGVjaW1hbCAgICAgICAgICAgICAgPFQgZXh0ZW5kcyBEZWNpbWFsPiAgICAgICAgICh2ZWN0b3I6IFZUeXBlPFQ+KTogdGhpcztcbiAgICB2aXNpdExpc3QgICAgICAgICAgICAgICAgIDxUIGV4dGVuZHMgTGlzdD4gICAgICAgICAgICAodmVjdG9yOiBWVHlwZTxUPik6IHRoaXM7XG4gICAgdmlzaXRTdHJ1Y3QgICAgICAgICAgICAgICA8VCBleHRlbmRzIFN0cnVjdD4gICAgICAgICAgKHZlY3RvcjogVlR5cGU8VD4pOiB0aGlzO1xuICAgIHZpc2l0VW5pb24gICAgICAgICAgICAgICAgPFQgZXh0ZW5kcyBVbmlvbj4gICAgICAgICAgICh2ZWN0b3I6IFZUeXBlPFQ+KTogdGhpcztcbiAgICB2aXNpdEludGVydmFsICAgICAgICAgICAgIDxUIGV4dGVuZHMgSW50ZXJ2YWw+ICAgICAgICAodmVjdG9yOiBWVHlwZTxUPik6IHRoaXM7XG4gICAgdmlzaXRGaXhlZFNpemVMaXN0ICAgICAgICA8VCBleHRlbmRzIEZpeGVkU2l6ZUxpc3Q+ICAgKHZlY3RvcjogVlR5cGU8VD4pOiB0aGlzO1xuICAgIHZpc2l0TWFwICAgICAgICAgICAgICAgICAgPFQgZXh0ZW5kcyBNYXBfPiAgICAgICAgICAgICh2ZWN0b3I6IFZUeXBlPFQ+KTogdGhpcztcbn1cblxuZXhwb3J0IGNsYXNzIFZlY3RvckFzc2VtYmxlciBleHRlbmRzIFZpc2l0b3Ige1xuXG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBhc3NlbWJsZTxUIGV4dGVuZHMgVmVjdG9yIHwgUmVjb3JkQmF0Y2g+KC4uLmFyZ3M6IChUIHwgVFtdKVtdKSB7XG5cbiAgICAgICAgY29uc3QgdmVjdG9ycyA9IGFyZ3MucmVkdWNlKGZ1bmN0aW9uIGZsYXR0ZW4oeHM6IGFueVtdLCB4OiBhbnkpOiBhbnlbXSB7XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh4KSkgeyByZXR1cm4geC5yZWR1Y2UoZmxhdHRlbiwgeHMpOyB9XG4gICAgICAgICAgICBpZiAoISh4IGluc3RhbmNlb2YgUmVjb3JkQmF0Y2gpKSB7IHJldHVybiBbLi4ueHMsIHhdOyB9XG4gICAgICAgICAgICByZXR1cm4gWy4uLnhzLCAuLi54LnNjaGVtYS5maWVsZHMubWFwKChfLCBpKSA9PiB4LmdldENoaWxkQXQoaSkhKV07XG4gICAgICAgIH0sIFtdKS5maWx0ZXIoKHg6IGFueSk6IHggaXMgVmVjdG9yID0+IHggaW5zdGFuY2VvZiBWZWN0b3IpO1xuXG4gICAgICAgIHJldHVybiBuZXcgVmVjdG9yQXNzZW1ibGVyKCkudmlzaXRNYW55KHZlY3RvcnMpWzBdO1xuICAgIH1cblxuICAgIHByaXZhdGUgY29uc3RydWN0b3IoKSB7IHN1cGVyKCk7IH1cblxuICAgIHB1YmxpYyB2aXNpdDxUIGV4dGVuZHMgVmVjdG9yPih2ZWN0b3I6IFQpOiB0aGlzIHtcbiAgICAgICAgaWYgKCFEYXRhVHlwZS5pc0RpY3Rpb25hcnkodmVjdG9yLnR5cGUpKSB7XG4gICAgICAgICAgICBjb25zdCB7IGRhdGEsIGxlbmd0aCwgbnVsbENvdW50IH0gPSB2ZWN0b3I7XG4gICAgICAgICAgICBpZiAobGVuZ3RoID4gMjE0NzQ4MzY0Nykge1xuICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0Nhbm5vdCB3cml0ZSBhcnJheXMgbGFyZ2VyIHRoYW4gMl4zMSAtIDEgaW4gbGVuZ3RoJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhZGRCdWZmZXIuY2FsbCh0aGlzLCBudWxsQ291bnQgPD0gMFxuICAgICAgICAgICAgICAgID8gbmV3IFVpbnQ4QXJyYXkoMCkgLy8gcGxhY2Vob2xkZXIgdmFsaWRpdHkgYnVmZmVyXG4gICAgICAgICAgICAgICAgOiB0cnVuY2F0ZUJpdG1hcChkYXRhLm9mZnNldCwgbGVuZ3RoLCBkYXRhLm51bGxCaXRtYXApXG4gICAgICAgICAgICApLm5vZGVzLnB1c2gobmV3IEZpZWxkTm9kZShsZW5ndGgsIG51bGxDb3VudCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdXBlci52aXNpdCh2ZWN0b3IpO1xuICAgIH1cblxuICAgIHB1YmxpYyB2aXNpdE51bGw8VCBleHRlbmRzIE51bGw+KF9udWxsVjogVlR5cGU8VD4pIHsgcmV0dXJuIHRoaXM7IH1cbiAgICBwdWJsaWMgdmlzaXREaWN0aW9uYXJ5PFQgZXh0ZW5kcyBEaWN0aW9uYXJ5Pih2ZWN0b3I6IFZUeXBlPFQ+KSB7XG4gICAgICAgIC8vIEFzc2VtYmxlIHRoZSBpbmRpY2VzIGhlcmUsIERpY3Rpb25hcnkgYXNzZW1ibGVkIHNlcGFyYXRlbHkuXG4gICAgICAgIHJldHVybiB0aGlzLnZpc2l0KHZlY3Rvci5pbmRpY2VzKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0IG5vZGVzKCkgeyByZXR1cm4gdGhpcy5fbm9kZXM7IH1cbiAgICBwdWJsaWMgZ2V0IGJ1ZmZlcnMoKSB7IHJldHVybiB0aGlzLl9idWZmZXJzOyB9XG4gICAgcHVibGljIGdldCBieXRlTGVuZ3RoKCkgeyByZXR1cm4gdGhpcy5fYnl0ZUxlbmd0aDsgfVxuICAgIHB1YmxpYyBnZXQgYnVmZmVyUmVnaW9ucygpIHsgcmV0dXJuIHRoaXMuX2J1ZmZlclJlZ2lvbnM7IH1cblxuICAgIHByb3RlY3RlZCBfYnl0ZUxlbmd0aCA9IDA7XG4gICAgcHJvdGVjdGVkIF9ub2RlczogRmllbGROb2RlW10gPSBbXTtcbiAgICBwcm90ZWN0ZWQgX2J1ZmZlcnM6IEFycmF5QnVmZmVyVmlld1tdID0gW107XG4gICAgcHJvdGVjdGVkIF9idWZmZXJSZWdpb25zOiBCdWZmZXJSZWdpb25bXSA9IFtdO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gYWRkQnVmZmVyKHRoaXM6IFZlY3RvckFzc2VtYmxlciwgdmFsdWVzOiBBcnJheUJ1ZmZlclZpZXcpIHtcbiAgICBjb25zdCBieXRlTGVuZ3RoID0gKHZhbHVlcy5ieXRlTGVuZ3RoICsgNykgJiB+NzsgLy8gUm91bmQgdXAgdG8gYSBtdWx0aXBsZSBvZiA4XG4gICAgdGhpcy5idWZmZXJzLnB1c2godmFsdWVzKTtcbiAgICB0aGlzLmJ1ZmZlclJlZ2lvbnMucHVzaChuZXcgQnVmZmVyUmVnaW9uKHRoaXMuX2J5dGVMZW5ndGgsIGJ5dGVMZW5ndGgpKTtcbiAgICB0aGlzLl9ieXRlTGVuZ3RoICs9IGJ5dGVMZW5ndGg7XG4gICAgcmV0dXJuIHRoaXM7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBhc3NlbWJsZVVuaW9uPFQgZXh0ZW5kcyBVbmlvbj4odGhpczogVmVjdG9yQXNzZW1ibGVyLCB2ZWN0b3I6IFZUeXBlPFQ+KSB7XG4gICAgY29uc3QgeyB0eXBlLCBsZW5ndGgsIHR5cGVJZHMsIHZhbHVlT2Zmc2V0cyB9ID0gdmVjdG9yO1xuICAgIC8vIEFsbCBVbmlvbiBWZWN0b3JzIGhhdmUgYSB0eXBlSWRzIGJ1ZmZlclxuICAgIGFkZEJ1ZmZlci5jYWxsKHRoaXMsIHR5cGVJZHMpO1xuICAgIC8vIElmIHRoaXMgaXMgYSBTcGFyc2UgVW5pb24sIHRyZWF0IGl0IGxpa2UgYWxsIG90aGVyIE5lc3RlZCB0eXBlc1xuICAgIGlmICh0eXBlLm1vZGUgPT09IFVuaW9uTW9kZS5TcGFyc2UpIHtcbiAgICAgICAgcmV0dXJuIGFzc2VtYmxlTmVzdGVkVmVjdG9yLmNhbGwodGhpcywgdmVjdG9yKTtcbiAgICB9IGVsc2UgaWYgKHR5cGUubW9kZSA9PT0gVW5pb25Nb2RlLkRlbnNlKSB7XG4gICAgICAgIC8vIElmIHRoaXMgaXMgYSBEZW5zZSBVbmlvbiwgYWRkIHRoZSB2YWx1ZU9mZnNldHMgYnVmZmVyIGFuZCBwb3RlbnRpYWxseSBzbGljZSB0aGUgY2hpbGRyZW5cbiAgICAgICAgaWYgKHZlY3Rvci5vZmZzZXQgPD0gMCkge1xuICAgICAgICAgICAgLy8gSWYgdGhlIFZlY3RvciBoYXNuJ3QgYmVlbiBzbGljZWQsIHdyaXRlIHRoZSBleGlzdGluZyB2YWx1ZU9mZnNldHNcbiAgICAgICAgICAgIGFkZEJ1ZmZlci5jYWxsKHRoaXMsIHZhbHVlT2Zmc2V0cyk7XG4gICAgICAgICAgICAvLyBXZSBjYW4gdHJlYXQgdGhpcyBsaWtlIGFsbCBvdGhlciBOZXN0ZWQgdHlwZXNcbiAgICAgICAgICAgIHJldHVybiBhc3NlbWJsZU5lc3RlZFZlY3Rvci5jYWxsKHRoaXMsIHZlY3Rvcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBBIHNsaWNlZCBEZW5zZSBVbmlvbiBpcyBhbiB1bnBsZWFzYW50IGNhc2UuIEJlY2F1c2UgdGhlIG9mZnNldHMgYXJlIGRpZmZlcmVudCBmb3JcbiAgICAgICAgICAgIC8vIGVhY2ggY2hpbGQgdmVjdG9yLCB3ZSBuZWVkIHRvIFwicmViYXNlXCIgdGhlIHZhbHVlT2Zmc2V0cyBmb3IgZWFjaCBjaGlsZFxuICAgICAgICAgICAgLy8gVW5pb24gdHlwZUlkcyBhcmUgbm90IG5lY2Vzc2FyeSAwLWluZGV4ZWRcbiAgICAgICAgICAgIGNvbnN0IG1heENoaWxkVHlwZUlkID0gdHlwZUlkcy5yZWR1Y2UoKHgsIHkpID0+IE1hdGgubWF4KHgsIHkpLCB0eXBlSWRzWzBdKTtcbiAgICAgICAgICAgIGNvbnN0IGNoaWxkTGVuZ3RocyA9IG5ldyBJbnQzMkFycmF5KG1heENoaWxkVHlwZUlkICsgMSk7XG4gICAgICAgICAgICAvLyBTZXQgYWxsIHRvIC0xIHRvIGluZGljYXRlIHRoYXQgd2UgaGF2ZW4ndCBvYnNlcnZlZCBhIGZpcnN0IG9jY3VycmVuY2Ugb2YgYSBwYXJ0aWN1bGFyIGNoaWxkIHlldFxuICAgICAgICAgICAgY29uc3QgY2hpbGRPZmZzZXRzID0gbmV3IEludDMyQXJyYXkobWF4Q2hpbGRUeXBlSWQgKyAxKS5maWxsKC0xKTtcbiAgICAgICAgICAgIGNvbnN0IHNoaWZ0ZWRPZmZzZXRzID0gbmV3IEludDMyQXJyYXkobGVuZ3RoKTtcbiAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgYSBub24temVybyBvZmZzZXQsIHRoZW4gdGhlIHZhbHVlIG9mZnNldHMgZG8gbm90IHN0YXJ0IGF0XG4gICAgICAgICAgICAvLyB6ZXJvLiBXZSBtdXN0IGEpIGNyZWF0ZSBhIG5ldyBvZmZzZXRzIGFycmF5IHdpdGggc2hpZnRlZCBvZmZzZXRzIGFuZFxuICAgICAgICAgICAgLy8gYikgc2xpY2UgdGhlIHZhbHVlcyBhcnJheSBhY2NvcmRpbmdseVxuICAgICAgICAgICAgY29uc3QgdW5zaGlmdGVkT2Zmc2V0cyA9IHJlYmFzZVZhbHVlT2Zmc2V0cygtdmFsdWVPZmZzZXRzWzBdLCBsZW5ndGgsIHZhbHVlT2Zmc2V0cyk7XG4gICAgICAgICAgICBmb3IgKGxldCB0eXBlSWQsIHNoaWZ0LCBpbmRleCA9IC0xOyArK2luZGV4IDwgbGVuZ3RoOykge1xuICAgICAgICAgICAgICAgIGlmICgoc2hpZnQgPSBjaGlsZE9mZnNldHNbdHlwZUlkID0gdHlwZUlkc1tpbmRleF1dKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgc2hpZnQgPSBjaGlsZE9mZnNldHNbdHlwZUlkXSA9IHVuc2hpZnRlZE9mZnNldHNbdHlwZUlkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2hpZnRlZE9mZnNldHNbaW5kZXhdID0gdW5zaGlmdGVkT2Zmc2V0c1tpbmRleF0gLSBzaGlmdDtcbiAgICAgICAgICAgICAgICArK2NoaWxkTGVuZ3Roc1t0eXBlSWRdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYWRkQnVmZmVyLmNhbGwodGhpcywgc2hpZnRlZE9mZnNldHMpO1xuICAgICAgICAgICAgLy8gU2xpY2UgYW5kIHZpc2l0IGNoaWxkcmVuIGFjY29yZGluZ2x5XG4gICAgICAgICAgICBmb3IgKGxldCBjaGlsZDogVmVjdG9yIHwgbnVsbCwgY2hpbGRJbmRleCA9IC0xLCBudW1DaGlsZHJlbiA9IHR5cGUuY2hpbGRyZW4ubGVuZ3RoOyArK2NoaWxkSW5kZXggPCBudW1DaGlsZHJlbjspIHtcbiAgICAgICAgICAgICAgICBpZiAoY2hpbGQgPSB2ZWN0b3IuZ2V0Q2hpbGRBdChjaGlsZEluZGV4KSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0eXBlSWQgPSB0eXBlLnR5cGVJZHNbY2hpbGRJbmRleF07XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkTGVuZ3RoID0gTWF0aC5taW4obGVuZ3RoLCBjaGlsZExlbmd0aHNbdHlwZUlkXSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudmlzaXQoY2hpbGQuc2xpY2UoY2hpbGRPZmZzZXRzW3R5cGVJZF0sIGNoaWxkTGVuZ3RoKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gYXNzZW1ibGVCb29sVmVjdG9yPFQgZXh0ZW5kcyBCb29sPih0aGlzOiBWZWN0b3JBc3NlbWJsZXIsIHZlY3RvcjogVlR5cGU8VD4pIHtcbiAgICAvLyBCb29sIHZlY3RvciBpcyBhIHNwZWNpYWwgY2FzZSBvZiBGbGF0VmVjdG9yLCBhcyBpdHMgZGF0YSBidWZmZXIgbmVlZHMgdG8gc3RheSBwYWNrZWRcbiAgICBsZXQgdmFsdWVzOiBVaW50OEFycmF5O1xuICAgIGlmICh2ZWN0b3IubnVsbENvdW50ID49IHZlY3Rvci5sZW5ndGgpIHtcbiAgICAgICAgLy8gSWYgYWxsIHZhbHVlcyBhcmUgbnVsbCwganVzdCBpbnNlcnQgYSBwbGFjZWhvbGRlciBlbXB0eSBkYXRhIGJ1ZmZlciAoZmFzdGVzdCBwYXRoKVxuICAgICAgICByZXR1cm4gYWRkQnVmZmVyLmNhbGwodGhpcywgbmV3IFVpbnQ4QXJyYXkoMCkpO1xuICAgIH0gZWxzZSBpZiAoKHZhbHVlcyA9IHZlY3Rvci52YWx1ZXMpIGluc3RhbmNlb2YgVWludDhBcnJheSkge1xuICAgICAgICAvLyBJZiB2YWx1ZXMgaXMgYWxyZWFkeSBhIFVpbnQ4QXJyYXksIHNsaWNlIHRoZSBiaXRtYXAgKGZhc3QgcGF0aClcbiAgICAgICAgcmV0dXJuIGFkZEJ1ZmZlci5jYWxsKHRoaXMsIHRydW5jYXRlQml0bWFwKHZlY3Rvci5vZmZzZXQsIHZlY3Rvci5sZW5ndGgsIHZhbHVlcykpO1xuICAgIH1cbiAgICAvLyBPdGhlcndpc2UgaWYgdGhlIHVuZGVybHlpbmcgZGF0YSAqaXNuJ3QqIGEgVWludDhBcnJheSwgZW51bWVyYXRlIHRoZVxuICAgIC8vIHZhbHVlcyBhcyBib29scyBhbmQgcmUtcGFjayB0aGVtIGludG8gYSBVaW50OEFycmF5LiBUaGlzIGNvZGUgaXNuJ3RcbiAgICAvLyByZWFjaGFibGUgdW5sZXNzIHlvdSdyZSB0cnlpbmcgdG8gbWFuaXB1bGF0ZSB0aGUgRGF0YSBpbnRlcm5hbHMsXG4gICAgLy8gd2Ugd2UncmUgb25seSBkb2luZyB0aGlzIGZvciBzYWZldHkuXG4gICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgICByZXR1cm4gYWRkQnVmZmVyLmNhbGwodGhpcywgcGFja0Jvb2xzKHZlY3RvcikpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gYXNzZW1ibGVGbGF0VmVjdG9yPFQgZXh0ZW5kcyBJbnQgfCBGbG9hdCB8IEZpeGVkU2l6ZUJpbmFyeSB8IERhdGVfIHwgVGltZXN0YW1wIHwgVGltZSB8IERlY2ltYWwgfCBJbnRlcnZhbD4odGhpczogVmVjdG9yQXNzZW1ibGVyLCB2ZWN0b3I6IFZUeXBlPFQ+KSB7XG4gICAgcmV0dXJuIGFkZEJ1ZmZlci5jYWxsKHRoaXMsIHZlY3Rvci52YWx1ZXMuc3ViYXJyYXkoMCwgdmVjdG9yLmxlbmd0aCAqIHZlY3Rvci5zdHJpZGUpKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGFzc2VtYmxlRmxhdExpc3RWZWN0b3I8VCBleHRlbmRzIFV0ZjggfCBCaW5hcnk+KHRoaXM6IFZlY3RvckFzc2VtYmxlciwgdmVjdG9yOiBWVHlwZTxUPikge1xuICAgIGNvbnN0IHsgbGVuZ3RoLCB2YWx1ZXMsIHZhbHVlT2Zmc2V0cyB9ID0gdmVjdG9yO1xuICAgIGNvbnN0IGZpcnN0T2Zmc2V0ID0gdmFsdWVPZmZzZXRzWzBdO1xuICAgIGNvbnN0IGxhc3RPZmZzZXQgPSB2YWx1ZU9mZnNldHNbbGVuZ3RoXTtcbiAgICBjb25zdCBieXRlTGVuZ3RoID0gTWF0aC5taW4obGFzdE9mZnNldCAtIGZpcnN0T2Zmc2V0LCB2YWx1ZXMuYnl0ZUxlbmd0aCAtIGZpcnN0T2Zmc2V0KTtcbiAgICAvLyBQdXNoIGluIHRoZSBvcmRlciBGbGF0TGlzdCB0eXBlcyByZWFkIHRoZWlyIGJ1ZmZlcnNcbiAgICBhZGRCdWZmZXIuY2FsbCh0aGlzLCByZWJhc2VWYWx1ZU9mZnNldHMoLXZhbHVlT2Zmc2V0c1swXSwgbGVuZ3RoLCB2YWx1ZU9mZnNldHMpKTsgLy8gdmFsdWVPZmZzZXRzIGJ1ZmZlciBmaXJzdFxuICAgIGFkZEJ1ZmZlci5jYWxsKHRoaXMsIHZhbHVlcy5zdWJhcnJheShmaXJzdE9mZnNldCwgZmlyc3RPZmZzZXQgKyBieXRlTGVuZ3RoKSk7IC8vIHNsaWNlZCB2YWx1ZXMgYnVmZmVyIHNlY29uZFxuICAgIHJldHVybiB0aGlzO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gYXNzZW1ibGVMaXN0VmVjdG9yPFQgZXh0ZW5kcyBMaXN0IHwgRml4ZWRTaXplTGlzdD4odGhpczogVmVjdG9yQXNzZW1ibGVyLCB2ZWN0b3I6IFZUeXBlPFQ+KSB7XG4gICAgY29uc3QgeyBsZW5ndGgsIHZhbHVlT2Zmc2V0cyB9ID0gdmVjdG9yO1xuICAgIC8vIElmIHdlIGhhdmUgdmFsdWVPZmZzZXRzIChMaXN0VmVjdG9yKSwgcHVzaCB0aGF0IGJ1ZmZlciBmaXJzdFxuICAgIGlmICh2YWx1ZU9mZnNldHMpIHtcbiAgICAgICAgYWRkQnVmZmVyLmNhbGwodGhpcywgcmViYXNlVmFsdWVPZmZzZXRzKHZhbHVlT2Zmc2V0c1swXSwgbGVuZ3RoLCB2YWx1ZU9mZnNldHMpKTtcbiAgICB9XG4gICAgLy8gVGhlbiBpbnNlcnQgdGhlIExpc3QncyB2YWx1ZXMgY2hpbGRcbiAgICByZXR1cm4gdGhpcy52aXNpdCh2ZWN0b3IuZ2V0Q2hpbGRBdCgwKSEpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gYXNzZW1ibGVOZXN0ZWRWZWN0b3I8VCBleHRlbmRzIFN0cnVjdCB8IE1hcF8gfCBVbmlvbj4odGhpczogVmVjdG9yQXNzZW1ibGVyLCB2ZWN0b3I6IFZUeXBlPFQ+KSB7XG4gICAgcmV0dXJuIHRoaXMudmlzaXRNYW55KHZlY3Rvci50eXBlLmNoaWxkcmVuLm1hcCgoXywgaSkgPT4gdmVjdG9yLmdldENoaWxkQXQoaSkhKS5maWx0ZXIoQm9vbGVhbikpWzBdO1xufVxuXG5WZWN0b3JBc3NlbWJsZXIucHJvdG90eXBlLnZpc2l0Qm9vbCAgICAgICAgICAgID0gICAgIGFzc2VtYmxlQm9vbFZlY3RvcjtcblZlY3RvckFzc2VtYmxlci5wcm90b3R5cGUudmlzaXRJbnQgICAgICAgICAgICAgPSAgICAgYXNzZW1ibGVGbGF0VmVjdG9yO1xuVmVjdG9yQXNzZW1ibGVyLnByb3RvdHlwZS52aXNpdEZsb2F0ICAgICAgICAgICA9ICAgICBhc3NlbWJsZUZsYXRWZWN0b3I7XG5WZWN0b3JBc3NlbWJsZXIucHJvdG90eXBlLnZpc2l0VXRmOCAgICAgICAgICAgID0gYXNzZW1ibGVGbGF0TGlzdFZlY3RvcjtcblZlY3RvckFzc2VtYmxlci5wcm90b3R5cGUudmlzaXRCaW5hcnkgICAgICAgICAgPSBhc3NlbWJsZUZsYXRMaXN0VmVjdG9yO1xuVmVjdG9yQXNzZW1ibGVyLnByb3RvdHlwZS52aXNpdEZpeGVkU2l6ZUJpbmFyeSA9ICAgICBhc3NlbWJsZUZsYXRWZWN0b3I7XG5WZWN0b3JBc3NlbWJsZXIucHJvdG90eXBlLnZpc2l0RGF0ZSAgICAgICAgICAgID0gICAgIGFzc2VtYmxlRmxhdFZlY3RvcjtcblZlY3RvckFzc2VtYmxlci5wcm90b3R5cGUudmlzaXRUaW1lc3RhbXAgICAgICAgPSAgICAgYXNzZW1ibGVGbGF0VmVjdG9yO1xuVmVjdG9yQXNzZW1ibGVyLnByb3RvdHlwZS52aXNpdFRpbWUgICAgICAgICAgICA9ICAgICBhc3NlbWJsZUZsYXRWZWN0b3I7XG5WZWN0b3JBc3NlbWJsZXIucHJvdG90eXBlLnZpc2l0RGVjaW1hbCAgICAgICAgID0gICAgIGFzc2VtYmxlRmxhdFZlY3RvcjtcblZlY3RvckFzc2VtYmxlci5wcm90b3R5cGUudmlzaXRMaXN0ICAgICAgICAgICAgPSAgICAgYXNzZW1ibGVMaXN0VmVjdG9yO1xuVmVjdG9yQXNzZW1ibGVyLnByb3RvdHlwZS52aXNpdFN0cnVjdCAgICAgICAgICA9ICAgYXNzZW1ibGVOZXN0ZWRWZWN0b3I7XG5WZWN0b3JBc3NlbWJsZXIucHJvdG90eXBlLnZpc2l0VW5pb24gICAgICAgICAgID0gICAgICAgICAgYXNzZW1ibGVVbmlvbjtcblZlY3RvckFzc2VtYmxlci5wcm90b3R5cGUudmlzaXRJbnRlcnZhbCAgICAgICAgPSAgICAgYXNzZW1ibGVGbGF0VmVjdG9yO1xuVmVjdG9yQXNzZW1ibGVyLnByb3RvdHlwZS52aXNpdEZpeGVkU2l6ZUxpc3QgICA9ICAgICBhc3NlbWJsZUxpc3RWZWN0b3I7XG5WZWN0b3JBc3NlbWJsZXIucHJvdG90eXBlLnZpc2l0TWFwICAgICAgICAgICAgID0gICBhc3NlbWJsZU5lc3RlZFZlY3RvcjtcbiJdfQ==

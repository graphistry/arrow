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
import { TextEncoder } from 'text-encoding-utf-8';
import { Data } from '../data';
import { Field } from '../schema';
import { DataType } from '../type';
import { Visitor } from '../visitor';
import { packBools } from '../util/bit';
import { Int64, Int128 } from '../util/int';
import { UnionMode, DateUnit } from '../enum';
import { toArrayBufferView } from '../util/buffer';
const utf8Encoder = new TextEncoder('utf-8');
export class VectorLoader extends Visitor {
    constructor(bytes, nodes, buffers) {
        super();
        this.nodesIndex = -1;
        this.buffersIndex = -1;
        this.bytes = bytes;
        this.nodes = nodes;
        this.buffers = buffers;
    }
    visit(node) {
        return super.visit(node instanceof Field ? node.type : node);
    }
    visitNull(type, { length, nullCount } = this.nextFieldNode()) { return Data.Null(type, 0, length, nullCount, this.readNullBitmap(type, nullCount)); }
    visitBool(type, { length, nullCount } = this.nextFieldNode()) { return Data.Bool(type, 0, length, nullCount, this.readNullBitmap(type, nullCount), this.readData(type)); }
    visitInt(type, { length, nullCount } = this.nextFieldNode()) { return Data.Int(type, 0, length, nullCount, this.readNullBitmap(type, nullCount), this.readData(type)); }
    visitFloat(type, { length, nullCount } = this.nextFieldNode()) { return Data.Float(type, 0, length, nullCount, this.readNullBitmap(type, nullCount), this.readData(type)); }
    visitUtf8(type, { length, nullCount } = this.nextFieldNode()) { return Data.Utf8(type, 0, length, nullCount, this.readNullBitmap(type, nullCount), this.readOffsets(type), this.readData(type)); }
    visitBinary(type, { length, nullCount } = this.nextFieldNode()) { return Data.Binary(type, 0, length, nullCount, this.readNullBitmap(type, nullCount), this.readOffsets(type), this.readData(type)); }
    visitFixedSizeBinary(type, { length, nullCount } = this.nextFieldNode()) { return Data.FixedSizeBinary(type, 0, length, nullCount, this.readNullBitmap(type, nullCount), this.readData(type)); }
    visitDate(type, { length, nullCount } = this.nextFieldNode()) { return Data.Date(type, 0, length, nullCount, this.readNullBitmap(type, nullCount), this.readData(type)); }
    visitTimestamp(type, { length, nullCount } = this.nextFieldNode()) { return Data.Timestamp(type, 0, length, nullCount, this.readNullBitmap(type, nullCount), this.readData(type)); }
    visitTime(type, { length, nullCount } = this.nextFieldNode()) { return Data.Time(type, 0, length, nullCount, this.readNullBitmap(type, nullCount), this.readData(type)); }
    visitDecimal(type, { length, nullCount } = this.nextFieldNode()) { return Data.Decimal(type, 0, length, nullCount, this.readNullBitmap(type, nullCount), this.readData(type)); }
    visitList(type, { length, nullCount } = this.nextFieldNode()) { return Data.List(type, 0, length, nullCount, this.readNullBitmap(type, nullCount), this.readOffsets(type), this.visit(type.children[0])); }
    visitStruct(type, { length, nullCount } = this.nextFieldNode()) { return Data.Struct(type, 0, length, nullCount, this.readNullBitmap(type, nullCount), this.visitMany(type.children)); }
    visitUnion(type) { return type.mode === UnionMode.Sparse ? this.visitSparseUnion(type) : this.visitDenseUnion(type); }
    visitDenseUnion(type, { length, nullCount } = this.nextFieldNode()) { return Data.Union(type, 0, length, nullCount, this.readNullBitmap(type, nullCount), this.readTypeIds(type), this.readOffsets(type), this.visitMany(type.children)); }
    visitSparseUnion(type, { length, nullCount } = this.nextFieldNode()) { return Data.Union(type, 0, length, nullCount, this.readNullBitmap(type, nullCount), this.readTypeIds(type), this.visitMany(type.children)); }
    visitDictionary(type, { length, nullCount } = this.nextFieldNode()) { return Data.Dictionary(type, 0, length, nullCount, this.readNullBitmap(type, nullCount), this.readData(type.indices)); }
    visitInterval(type, { length, nullCount } = this.nextFieldNode()) { return Data.Interval(type, 0, length, nullCount, this.readNullBitmap(type, nullCount), this.readData(type)); }
    visitFixedSizeList(type, { length, nullCount } = this.nextFieldNode()) { return Data.FixedSizeList(type, 0, length, nullCount, this.readNullBitmap(type, nullCount), this.visit(type.children[0])); }
    visitMap(type, { length, nullCount } = this.nextFieldNode()) { return Data.Map(type, 0, length, nullCount, this.readNullBitmap(type, nullCount), this.visitMany(type.children)); }
    nextFieldNode() { return this.nodes[++this.nodesIndex]; }
    nextBufferRange() { return this.buffers[++this.buffersIndex]; }
    readNullBitmap(type, nullCount, buffer = this.nextBufferRange()) {
        return nullCount > 0 && this.readData(type, buffer) || new Uint8Array(0);
    }
    readOffsets(type, buffer) { return this.readData(type, buffer); }
    readTypeIds(type, buffer) { return this.readData(type, buffer); }
    readData(_type, { length, offset } = this.nextBufferRange()) {
        return this.bytes.subarray(offset, offset + length);
    }
}
export class JSONVectorLoader extends VectorLoader {
    constructor(sources, nodes, buffers) {
        super(new Uint8Array(0), nodes, buffers);
        this.sources = sources;
    }
    readNullBitmap(_type, nullCount, { offset } = this.nextBufferRange()) {
        return nullCount <= 0 ? new Uint8Array(0) : packBools(this.sources[offset]);
    }
    readOffsets(_type, { offset } = this.nextBufferRange()) {
        return toArrayBufferView(Uint8Array, toArrayBufferView(Int32Array, this.sources[offset]));
    }
    readTypeIds(_type, { offset } = this.nextBufferRange()) {
        return toArrayBufferView(Uint8Array, toArrayBufferView(Int8Array, this.sources[offset]));
    }
    readData(type, { offset } = this.nextBufferRange()) {
        const { sources } = this;
        if (DataType.isTimestamp(type)) {
            return toArrayBufferView(Uint8Array, Int64.convertArray(sources[offset]));
        }
        else if ((DataType.isInt(type) || DataType.isTime(type)) && type.bitWidth === 64) {
            return toArrayBufferView(Uint8Array, Int64.convertArray(sources[offset]));
        }
        else if (DataType.isDate(type) && type.unit === DateUnit.MILLISECOND) {
            return toArrayBufferView(Uint8Array, Int64.convertArray(sources[offset]));
        }
        else if (DataType.isDecimal(type)) {
            return toArrayBufferView(Uint8Array, Int128.convertArray(sources[offset]));
        }
        else if (DataType.isBinary(type) || DataType.isFixedSizeBinary(type)) {
            return binaryDataFromJSON(sources[offset]);
        }
        else if (DataType.isBool(type)) {
            return packBools(sources[offset]);
        }
        else if (DataType.isUtf8(type)) {
            return utf8Encoder.encode(sources[offset].join(''));
        }
        return toArrayBufferView(Uint8Array, toArrayBufferView(type.ArrayType, sources[offset].map((x) => +x)));
    }
}
function binaryDataFromJSON(values) {
    // "DATA": ["49BC7D5B6C47D2","3F5FB6D9322026"]
    // There are definitely more efficient ways to do this... but it gets the
    // job done.
    const joined = values.join('');
    const data = new Uint8Array(joined.length / 2);
    for (let i = 0; i < joined.length; i += 2) {
        data[i >> 1] = parseInt(joined.substr(i, 2), 16);
    }
    return data;
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInZpc2l0b3IvdmVjdG9ybG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDZEQUE2RDtBQUM3RCwrREFBK0Q7QUFDL0Qsd0RBQXdEO0FBQ3hELDZEQUE2RDtBQUM3RCxvREFBb0Q7QUFDcEQsNkRBQTZEO0FBQzdELDZEQUE2RDtBQUM3RCxFQUFFO0FBQ0YsK0NBQStDO0FBQy9DLEVBQUU7QUFDRiw2REFBNkQ7QUFDN0QsOERBQThEO0FBQzlELHlEQUF5RDtBQUN6RCw0REFBNEQ7QUFDNUQsMERBQTBEO0FBQzFELHFCQUFxQjtBQUVyQixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFbEQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUUvQixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ2xDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDbkMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLFlBQVksQ0FBQztBQUNyQyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ3hDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQzVDLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQzlDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBR25ELE1BQU0sV0FBVyxHQUFHLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBTzdDLE1BQU0sT0FBTyxZQUFhLFNBQVEsT0FBTztJQU1yQyxZQUFZLEtBQWlCLEVBQUUsS0FBa0IsRUFBRSxPQUF1QjtRQUN0RSxLQUFLLEVBQUUsQ0FBQztRQUpKLGVBQVUsR0FBVyxDQUFDLENBQUMsQ0FBQztRQUV4QixpQkFBWSxHQUFXLENBQUMsQ0FBQyxDQUFDO1FBRzlCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ25CLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ25CLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0lBQzNCLENBQUM7SUFFTSxLQUFLLENBQXFCLElBQWtCO1FBQy9DLE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBRU0sU0FBUyxDQUE4QyxJQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLE9BQWtCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBZ0YsQ0FBQztJQUMvUixTQUFTLENBQThDLElBQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksT0FBa0IsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQTJELENBQUM7SUFDL1IsUUFBUSxDQUErQyxJQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLE9BQW1CLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUEyRCxDQUFDO0lBQy9SLFVBQVUsQ0FBNkMsSUFBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxPQUFpQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBMkQsQ0FBQztJQUMvUixTQUFTLENBQThDLElBQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksT0FBa0IsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBbUMsQ0FBQztJQUMvUixXQUFXLENBQTRDLElBQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksT0FBZ0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBbUMsQ0FBQztJQUMvUixvQkFBb0IsQ0FBbUMsSUFBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUEyRCxDQUFDO0lBQy9SLFNBQVMsQ0FBOEMsSUFBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxPQUFrQixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBMkQsQ0FBQztJQUMvUixjQUFjLENBQXlDLElBQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksT0FBYSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBMkQsQ0FBQztJQUMvUixTQUFTLENBQThDLElBQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksT0FBa0IsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQTJELENBQUM7SUFDL1IsWUFBWSxDQUEyQyxJQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLE9BQWUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQTJELENBQUM7SUFDL1IsU0FBUyxDQUE4QyxJQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLE9BQWtCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUEwQixDQUFDO0lBQy9SLFdBQVcsQ0FBNEMsSUFBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxPQUFnQixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQWlELENBQUM7SUFDL1IsVUFBVSxDQUE2QyxJQUFPLElBQWtELE9BQU8sSUFBSSxDQUFDLElBQUksS0FBSyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBd0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQXVCLENBQUMsQ0FBQyxDQUFzQyxDQUFDO0lBQy9SLGVBQWUsQ0FBd0MsSUFBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxPQUFpQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL1IsZ0JBQWdCLENBQXVDLElBQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksT0FBaUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQXlCLENBQUM7SUFDL1IsZUFBZSxDQUF3QyxJQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLE9BQVksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFtRCxDQUFDO0lBQy9SLGFBQWEsQ0FBMEMsSUFBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxPQUFjLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUEyRCxDQUFDO0lBQy9SLGtCQUFrQixDQUFxQyxJQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLE9BQVMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFrRCxDQUFDO0lBQy9SLFFBQVEsQ0FBK0MsSUFBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxPQUFtQixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQWlELENBQUM7SUFFNVIsYUFBYSxLQUFLLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDekQsZUFBZSxLQUFLLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL0QsY0FBYyxDQUFxQixJQUFPLEVBQUUsU0FBaUIsRUFBRSxNQUFNLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRTtRQUNwRyxPQUFPLFNBQVMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksSUFBSSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0UsQ0FBQztJQUNTLFdBQVcsQ0FBcUIsSUFBTyxFQUFFLE1BQXFCLElBQUksT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkcsV0FBVyxDQUFxQixJQUFPLEVBQUUsTUFBcUIsSUFBSSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2RyxRQUFRLENBQXFCLEtBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFO1FBQ3hGLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sR0FBRyxNQUFNLENBQUMsQ0FBQztJQUN4RCxDQUFDO0NBQ0o7QUFFRCxNQUFNLE9BQU8sZ0JBQWlCLFNBQVEsWUFBWTtJQUU5QyxZQUFZLE9BQWdCLEVBQUUsS0FBa0IsRUFBRSxPQUF1QjtRQUNyRSxLQUFLLENBQUMsSUFBSSxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0lBQzNCLENBQUM7SUFDUyxjQUFjLENBQXFCLEtBQVEsRUFBRSxTQUFpQixFQUFFLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRTtRQUN6RyxPQUFPLFNBQVMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ2hGLENBQUM7SUFDUyxXQUFXLENBQXFCLEtBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUU7UUFDbkYsT0FBTyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsaUJBQWlCLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzlGLENBQUM7SUFDUyxXQUFXLENBQXFCLEtBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUU7UUFDbkYsT0FBTyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsaUJBQWlCLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzdGLENBQUM7SUFDUyxRQUFRLENBQXFCLElBQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUU7UUFDL0UsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQztRQUN6QixJQUFJLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDNUIsT0FBTyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFhLENBQUMsQ0FBQyxDQUFDO1NBQ3pGO2FBQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssRUFBRSxFQUFFO1lBQ2hGLE9BQU8saUJBQWlCLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBYSxDQUFDLENBQUMsQ0FBQztTQUN6RjthQUFNLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxXQUFXLEVBQUU7WUFDcEUsT0FBTyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFhLENBQUMsQ0FBQyxDQUFDO1NBQ3pGO2FBQU0sSUFBSSxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2pDLE9BQU8saUJBQWlCLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBYSxDQUFDLENBQUMsQ0FBQztTQUMxRjthQUFNLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxRQUFRLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDcEUsT0FBTyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFhLENBQUMsQ0FBQztTQUMxRDthQUFNLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUM5QixPQUFPLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFhLENBQUMsQ0FBQztTQUNqRDthQUFNLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUM5QixPQUFPLFdBQVcsQ0FBQyxNQUFNLENBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ3JFO1FBQ0QsT0FBTyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1RyxDQUFDO0NBQ0o7QUFFRCxTQUFTLGtCQUFrQixDQUFDLE1BQWdCO0lBQ3hDLDhDQUE4QztJQUM5Qyx5RUFBeUU7SUFDekUsWUFBWTtJQUNaLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDL0IsTUFBTSxJQUFJLEdBQUcsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztJQUMvQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ3ZDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ3BEO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDaEIsQ0FBQyIsImZpbGUiOiJ2aXNpdG9yL3ZlY3RvcmxvYWRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBUZXh0RW5jb2RlciB9IGZyb20gJ3RleHQtZW5jb2RpbmctdXRmLTgnO1xuXG5pbXBvcnQgeyBEYXRhIH0gZnJvbSAnLi4vZGF0YSc7XG5pbXBvcnQgKiBhcyB0eXBlIGZyb20gJy4uL3R5cGUnO1xuaW1wb3J0IHsgRmllbGQgfSBmcm9tICcuLi9zY2hlbWEnO1xuaW1wb3J0IHsgRGF0YVR5cGUgfSBmcm9tICcuLi90eXBlJztcbmltcG9ydCB7IFZpc2l0b3IgfSBmcm9tICcuLi92aXNpdG9yJztcbmltcG9ydCB7IHBhY2tCb29scyB9IGZyb20gJy4uL3V0aWwvYml0JztcbmltcG9ydCB7IEludDY0LCBJbnQxMjggfSBmcm9tICcuLi91dGlsL2ludCc7XG5pbXBvcnQgeyBVbmlvbk1vZGUsIERhdGVVbml0IH0gZnJvbSAnLi4vZW51bSc7XG5pbXBvcnQgeyB0b0FycmF5QnVmZmVyVmlldyB9IGZyb20gJy4uL3V0aWwvYnVmZmVyJztcbmltcG9ydCB7IEJ1ZmZlclJlZ2lvbiwgRmllbGROb2RlIH0gZnJvbSAnLi4vaXBjL21ldGFkYXRhL21lc3NhZ2UnO1xuXG5jb25zdCB1dGY4RW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigndXRmLTgnKTtcblxuZXhwb3J0IGludGVyZmFjZSBWZWN0b3JMb2FkZXIgZXh0ZW5kcyBWaXNpdG9yIHtcbiAgICB2aXNpdE1hbnkgPFQgZXh0ZW5kcyBEYXRhVHlwZT4obm9kZXM6IChGaWVsZDxUPiB8IFQpW10pOiBEYXRhPFQ+W107XG4gICAgdmlzaXQgICAgIDxUIGV4dGVuZHMgRGF0YVR5cGU+KG5vZGU6ICAgRmllbGQ8VD4gfCBUICAgKTogRGF0YTxUPjtcbn1cblxuZXhwb3J0IGNsYXNzIFZlY3RvckxvYWRlciBleHRlbmRzIFZpc2l0b3Ige1xuICAgIHByaXZhdGUgYnl0ZXM6IFVpbnQ4QXJyYXk7XG4gICAgcHJpdmF0ZSBub2RlczogRmllbGROb2RlW107XG4gICAgcHJpdmF0ZSBub2Rlc0luZGV4OiBudW1iZXIgPSAtMTtcbiAgICBwcml2YXRlIGJ1ZmZlcnM6IEJ1ZmZlclJlZ2lvbltdO1xuICAgIHByaXZhdGUgYnVmZmVyc0luZGV4OiBudW1iZXIgPSAtMTtcbiAgICBjb25zdHJ1Y3RvcihieXRlczogVWludDhBcnJheSwgbm9kZXM6IEZpZWxkTm9kZVtdLCBidWZmZXJzOiBCdWZmZXJSZWdpb25bXSkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLmJ5dGVzID0gYnl0ZXM7XG4gICAgICAgIHRoaXMubm9kZXMgPSBub2RlcztcbiAgICAgICAgdGhpcy5idWZmZXJzID0gYnVmZmVycztcbiAgICB9XG5cbiAgICBwdWJsaWMgdmlzaXQ8VCBleHRlbmRzIERhdGFUeXBlPihub2RlOiBGaWVsZDxUPiB8IFQpOiBEYXRhPFQ+IHtcbiAgICAgICAgcmV0dXJuIHN1cGVyLnZpc2l0KG5vZGUgaW5zdGFuY2VvZiBGaWVsZCA/IG5vZGUudHlwZSA6IG5vZGUpO1xuICAgIH1cblxuICAgIHB1YmxpYyB2aXNpdE51bGwgICAgICAgICAgICA8VCBleHRlbmRzIHR5cGUuTnVsbD4gICAgICAgICAgICAodHlwZTogVCwgeyBsZW5ndGgsIG51bGxDb3VudCB9ID0gdGhpcy5uZXh0RmllbGROb2RlKCkpIHsgcmV0dXJuICAgICAgICAgICAgRGF0YS5OdWxsKHR5cGUsIDAsIGxlbmd0aCwgbnVsbENvdW50LCB0aGlzLnJlYWROdWxsQml0bWFwKHR5cGUsIG51bGxDb3VudCkpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdEJvb2wgICAgICAgICAgICA8VCBleHRlbmRzIHR5cGUuQm9vbD4gICAgICAgICAgICAodHlwZTogVCwgeyBsZW5ndGgsIG51bGxDb3VudCB9ID0gdGhpcy5uZXh0RmllbGROb2RlKCkpIHsgcmV0dXJuICAgICAgICAgICAgRGF0YS5Cb29sKHR5cGUsIDAsIGxlbmd0aCwgbnVsbENvdW50LCB0aGlzLnJlYWROdWxsQml0bWFwKHR5cGUsIG51bGxDb3VudCksIHRoaXMucmVhZERhdGEodHlwZSkpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdEludCAgICAgICAgICAgICA8VCBleHRlbmRzIHR5cGUuSW50PiAgICAgICAgICAgICAodHlwZTogVCwgeyBsZW5ndGgsIG51bGxDb3VudCB9ID0gdGhpcy5uZXh0RmllbGROb2RlKCkpIHsgcmV0dXJuICAgICAgICAgICAgIERhdGEuSW50KHR5cGUsIDAsIGxlbmd0aCwgbnVsbENvdW50LCB0aGlzLnJlYWROdWxsQml0bWFwKHR5cGUsIG51bGxDb3VudCksIHRoaXMucmVhZERhdGEodHlwZSkpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdEZsb2F0ICAgICAgICAgICA8VCBleHRlbmRzIHR5cGUuRmxvYXQ+ICAgICAgICAgICAodHlwZTogVCwgeyBsZW5ndGgsIG51bGxDb3VudCB9ID0gdGhpcy5uZXh0RmllbGROb2RlKCkpIHsgcmV0dXJuICAgICAgICAgICBEYXRhLkZsb2F0KHR5cGUsIDAsIGxlbmd0aCwgbnVsbENvdW50LCB0aGlzLnJlYWROdWxsQml0bWFwKHR5cGUsIG51bGxDb3VudCksIHRoaXMucmVhZERhdGEodHlwZSkpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdFV0ZjggICAgICAgICAgICA8VCBleHRlbmRzIHR5cGUuVXRmOD4gICAgICAgICAgICAodHlwZTogVCwgeyBsZW5ndGgsIG51bGxDb3VudCB9ID0gdGhpcy5uZXh0RmllbGROb2RlKCkpIHsgcmV0dXJuICAgICAgICAgICAgRGF0YS5VdGY4KHR5cGUsIDAsIGxlbmd0aCwgbnVsbENvdW50LCB0aGlzLnJlYWROdWxsQml0bWFwKHR5cGUsIG51bGxDb3VudCksIHRoaXMucmVhZE9mZnNldHModHlwZSksIHRoaXMucmVhZERhdGEodHlwZSkpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdEJpbmFyeSAgICAgICAgICA8VCBleHRlbmRzIHR5cGUuQmluYXJ5PiAgICAgICAgICAodHlwZTogVCwgeyBsZW5ndGgsIG51bGxDb3VudCB9ID0gdGhpcy5uZXh0RmllbGROb2RlKCkpIHsgcmV0dXJuICAgICAgICAgIERhdGEuQmluYXJ5KHR5cGUsIDAsIGxlbmd0aCwgbnVsbENvdW50LCB0aGlzLnJlYWROdWxsQml0bWFwKHR5cGUsIG51bGxDb3VudCksIHRoaXMucmVhZE9mZnNldHModHlwZSksIHRoaXMucmVhZERhdGEodHlwZSkpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdEZpeGVkU2l6ZUJpbmFyeSA8VCBleHRlbmRzIHR5cGUuRml4ZWRTaXplQmluYXJ5PiAodHlwZTogVCwgeyBsZW5ndGgsIG51bGxDb3VudCB9ID0gdGhpcy5uZXh0RmllbGROb2RlKCkpIHsgcmV0dXJuIERhdGEuRml4ZWRTaXplQmluYXJ5KHR5cGUsIDAsIGxlbmd0aCwgbnVsbENvdW50LCB0aGlzLnJlYWROdWxsQml0bWFwKHR5cGUsIG51bGxDb3VudCksIHRoaXMucmVhZERhdGEodHlwZSkpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdERhdGUgICAgICAgICAgICA8VCBleHRlbmRzIHR5cGUuRGF0ZV8+ICAgICAgICAgICAodHlwZTogVCwgeyBsZW5ndGgsIG51bGxDb3VudCB9ID0gdGhpcy5uZXh0RmllbGROb2RlKCkpIHsgcmV0dXJuICAgICAgICAgICAgRGF0YS5EYXRlKHR5cGUsIDAsIGxlbmd0aCwgbnVsbENvdW50LCB0aGlzLnJlYWROdWxsQml0bWFwKHR5cGUsIG51bGxDb3VudCksIHRoaXMucmVhZERhdGEodHlwZSkpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdFRpbWVzdGFtcCAgICAgICA8VCBleHRlbmRzIHR5cGUuVGltZXN0YW1wPiAgICAgICAodHlwZTogVCwgeyBsZW5ndGgsIG51bGxDb3VudCB9ID0gdGhpcy5uZXh0RmllbGROb2RlKCkpIHsgcmV0dXJuICAgICAgIERhdGEuVGltZXN0YW1wKHR5cGUsIDAsIGxlbmd0aCwgbnVsbENvdW50LCB0aGlzLnJlYWROdWxsQml0bWFwKHR5cGUsIG51bGxDb3VudCksIHRoaXMucmVhZERhdGEodHlwZSkpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdFRpbWUgICAgICAgICAgICA8VCBleHRlbmRzIHR5cGUuVGltZT4gICAgICAgICAgICAodHlwZTogVCwgeyBsZW5ndGgsIG51bGxDb3VudCB9ID0gdGhpcy5uZXh0RmllbGROb2RlKCkpIHsgcmV0dXJuICAgICAgICAgICAgRGF0YS5UaW1lKHR5cGUsIDAsIGxlbmd0aCwgbnVsbENvdW50LCB0aGlzLnJlYWROdWxsQml0bWFwKHR5cGUsIG51bGxDb3VudCksIHRoaXMucmVhZERhdGEodHlwZSkpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdERlY2ltYWwgICAgICAgICA8VCBleHRlbmRzIHR5cGUuRGVjaW1hbD4gICAgICAgICAodHlwZTogVCwgeyBsZW5ndGgsIG51bGxDb3VudCB9ID0gdGhpcy5uZXh0RmllbGROb2RlKCkpIHsgcmV0dXJuICAgICAgICAgRGF0YS5EZWNpbWFsKHR5cGUsIDAsIGxlbmd0aCwgbnVsbENvdW50LCB0aGlzLnJlYWROdWxsQml0bWFwKHR5cGUsIG51bGxDb3VudCksIHRoaXMucmVhZERhdGEodHlwZSkpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdExpc3QgICAgICAgICAgICA8VCBleHRlbmRzIHR5cGUuTGlzdD4gICAgICAgICAgICAodHlwZTogVCwgeyBsZW5ndGgsIG51bGxDb3VudCB9ID0gdGhpcy5uZXh0RmllbGROb2RlKCkpIHsgcmV0dXJuICAgICAgICAgICAgRGF0YS5MaXN0KHR5cGUsIDAsIGxlbmd0aCwgbnVsbENvdW50LCB0aGlzLnJlYWROdWxsQml0bWFwKHR5cGUsIG51bGxDb3VudCksIHRoaXMucmVhZE9mZnNldHModHlwZSksIHRoaXMudmlzaXQodHlwZS5jaGlsZHJlblswXSkpOyAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdFN0cnVjdCAgICAgICAgICA8VCBleHRlbmRzIHR5cGUuU3RydWN0PiAgICAgICAgICAodHlwZTogVCwgeyBsZW5ndGgsIG51bGxDb3VudCB9ID0gdGhpcy5uZXh0RmllbGROb2RlKCkpIHsgcmV0dXJuICAgICAgICAgIERhdGEuU3RydWN0KHR5cGUsIDAsIGxlbmd0aCwgbnVsbENvdW50LCB0aGlzLnJlYWROdWxsQml0bWFwKHR5cGUsIG51bGxDb3VudCksIHRoaXMudmlzaXRNYW55KHR5cGUuY2hpbGRyZW4pKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdFVuaW9uICAgICAgICAgICA8VCBleHRlbmRzIHR5cGUuVW5pb24+ICAgICAgICAgICAodHlwZTogVCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApIHsgcmV0dXJuIHR5cGUubW9kZSA9PT0gVW5pb25Nb2RlLlNwYXJzZSA/IHRoaXMudmlzaXRTcGFyc2VVbmlvbih0eXBlIGFzIHR5cGUuU3BhcnNlVW5pb24pIDogdGhpcy52aXNpdERlbnNlVW5pb24odHlwZSBhcyB0eXBlLkRlbnNlVW5pb24pOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdERlbnNlVW5pb24gICAgICA8VCBleHRlbmRzIHR5cGUuRGVuc2VVbmlvbj4gICAgICAodHlwZTogVCwgeyBsZW5ndGgsIG51bGxDb3VudCB9ID0gdGhpcy5uZXh0RmllbGROb2RlKCkpIHsgcmV0dXJuICAgICAgICAgICBEYXRhLlVuaW9uKHR5cGUsIDAsIGxlbmd0aCwgbnVsbENvdW50LCB0aGlzLnJlYWROdWxsQml0bWFwKHR5cGUsIG51bGxDb3VudCksIHRoaXMucmVhZFR5cGVJZHModHlwZSksIHRoaXMucmVhZE9mZnNldHModHlwZSksIHRoaXMudmlzaXRNYW55KHR5cGUuY2hpbGRyZW4pKTsgfVxuICAgIHB1YmxpYyB2aXNpdFNwYXJzZVVuaW9uICAgICA8VCBleHRlbmRzIHR5cGUuU3BhcnNlVW5pb24+ICAgICAodHlwZTogVCwgeyBsZW5ndGgsIG51bGxDb3VudCB9ID0gdGhpcy5uZXh0RmllbGROb2RlKCkpIHsgcmV0dXJuICAgICAgICAgICBEYXRhLlVuaW9uKHR5cGUsIDAsIGxlbmd0aCwgbnVsbENvdW50LCB0aGlzLnJlYWROdWxsQml0bWFwKHR5cGUsIG51bGxDb3VudCksIHRoaXMucmVhZFR5cGVJZHModHlwZSksIHRoaXMudmlzaXRNYW55KHR5cGUuY2hpbGRyZW4pKTsgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdERpY3Rpb25hcnkgICAgICA8VCBleHRlbmRzIHR5cGUuRGljdGlvbmFyeT4gICAgICAodHlwZTogVCwgeyBsZW5ndGgsIG51bGxDb3VudCB9ID0gdGhpcy5uZXh0RmllbGROb2RlKCkpIHsgcmV0dXJuICAgICAgRGF0YS5EaWN0aW9uYXJ5KHR5cGUsIDAsIGxlbmd0aCwgbnVsbENvdW50LCB0aGlzLnJlYWROdWxsQml0bWFwKHR5cGUsIG51bGxDb3VudCksIHRoaXMucmVhZERhdGEodHlwZS5pbmRpY2VzKSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdEludGVydmFsICAgICAgICA8VCBleHRlbmRzIHR5cGUuSW50ZXJ2YWw+ICAgICAgICAodHlwZTogVCwgeyBsZW5ndGgsIG51bGxDb3VudCB9ID0gdGhpcy5uZXh0RmllbGROb2RlKCkpIHsgcmV0dXJuICAgICAgICBEYXRhLkludGVydmFsKHR5cGUsIDAsIGxlbmd0aCwgbnVsbENvdW50LCB0aGlzLnJlYWROdWxsQml0bWFwKHR5cGUsIG51bGxDb3VudCksIHRoaXMucmVhZERhdGEodHlwZSkpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdEZpeGVkU2l6ZUxpc3QgICA8VCBleHRlbmRzIHR5cGUuRml4ZWRTaXplTGlzdD4gICAodHlwZTogVCwgeyBsZW5ndGgsIG51bGxDb3VudCB9ID0gdGhpcy5uZXh0RmllbGROb2RlKCkpIHsgcmV0dXJuICAgRGF0YS5GaXhlZFNpemVMaXN0KHR5cGUsIDAsIGxlbmd0aCwgbnVsbENvdW50LCB0aGlzLnJlYWROdWxsQml0bWFwKHR5cGUsIG51bGxDb3VudCksIHRoaXMudmlzaXQodHlwZS5jaGlsZHJlblswXSkpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdE1hcCAgICAgICAgICAgICA8VCBleHRlbmRzIHR5cGUuTWFwXz4gICAgICAgICAgICAodHlwZTogVCwgeyBsZW5ndGgsIG51bGxDb3VudCB9ID0gdGhpcy5uZXh0RmllbGROb2RlKCkpIHsgcmV0dXJuICAgICAgICAgICAgIERhdGEuTWFwKHR5cGUsIDAsIGxlbmd0aCwgbnVsbENvdW50LCB0aGlzLnJlYWROdWxsQml0bWFwKHR5cGUsIG51bGxDb3VudCksIHRoaXMudmlzaXRNYW55KHR5cGUuY2hpbGRyZW4pKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgcHJvdGVjdGVkIG5leHRGaWVsZE5vZGUoKSB7IHJldHVybiB0aGlzLm5vZGVzWysrdGhpcy5ub2Rlc0luZGV4XTsgfVxuICAgIHByb3RlY3RlZCBuZXh0QnVmZmVyUmFuZ2UoKSB7IHJldHVybiB0aGlzLmJ1ZmZlcnNbKyt0aGlzLmJ1ZmZlcnNJbmRleF07IH1cbiAgICBwcm90ZWN0ZWQgcmVhZE51bGxCaXRtYXA8VCBleHRlbmRzIERhdGFUeXBlPih0eXBlOiBULCBudWxsQ291bnQ6IG51bWJlciwgYnVmZmVyID0gdGhpcy5uZXh0QnVmZmVyUmFuZ2UoKSkge1xuICAgICAgICByZXR1cm4gbnVsbENvdW50ID4gMCAmJiB0aGlzLnJlYWREYXRhKHR5cGUsIGJ1ZmZlcikgfHwgbmV3IFVpbnQ4QXJyYXkoMCk7XG4gICAgfVxuICAgIHByb3RlY3RlZCByZWFkT2Zmc2V0czxUIGV4dGVuZHMgRGF0YVR5cGU+KHR5cGU6IFQsIGJ1ZmZlcj86IEJ1ZmZlclJlZ2lvbikgeyByZXR1cm4gdGhpcy5yZWFkRGF0YSh0eXBlLCBidWZmZXIpOyB9XG4gICAgcHJvdGVjdGVkIHJlYWRUeXBlSWRzPFQgZXh0ZW5kcyBEYXRhVHlwZT4odHlwZTogVCwgYnVmZmVyPzogQnVmZmVyUmVnaW9uKSB7IHJldHVybiB0aGlzLnJlYWREYXRhKHR5cGUsIGJ1ZmZlcik7IH1cbiAgICBwcm90ZWN0ZWQgcmVhZERhdGE8VCBleHRlbmRzIERhdGFUeXBlPihfdHlwZTogVCwgeyBsZW5ndGgsIG9mZnNldCB9ID0gdGhpcy5uZXh0QnVmZmVyUmFuZ2UoKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5ieXRlcy5zdWJhcnJheShvZmZzZXQsIG9mZnNldCArIGxlbmd0aCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgSlNPTlZlY3RvckxvYWRlciBleHRlbmRzIFZlY3RvckxvYWRlciB7XG4gICAgcHJpdmF0ZSBzb3VyY2VzOiBhbnlbXVtdO1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZXM6IGFueVtdW10sIG5vZGVzOiBGaWVsZE5vZGVbXSwgYnVmZmVyczogQnVmZmVyUmVnaW9uW10pIHtcbiAgICAgICAgc3VwZXIobmV3IFVpbnQ4QXJyYXkoMCksIG5vZGVzLCBidWZmZXJzKTtcbiAgICAgICAgdGhpcy5zb3VyY2VzID0gc291cmNlcztcbiAgICB9XG4gICAgcHJvdGVjdGVkIHJlYWROdWxsQml0bWFwPFQgZXh0ZW5kcyBEYXRhVHlwZT4oX3R5cGU6IFQsIG51bGxDb3VudDogbnVtYmVyLCB7IG9mZnNldCB9ID0gdGhpcy5uZXh0QnVmZmVyUmFuZ2UoKSkge1xuICAgICAgICByZXR1cm4gbnVsbENvdW50IDw9IDAgPyBuZXcgVWludDhBcnJheSgwKSA6IHBhY2tCb29scyh0aGlzLnNvdXJjZXNbb2Zmc2V0XSk7XG4gICAgfVxuICAgIHByb3RlY3RlZCByZWFkT2Zmc2V0czxUIGV4dGVuZHMgRGF0YVR5cGU+KF90eXBlOiBULCB7IG9mZnNldCB9ID0gdGhpcy5uZXh0QnVmZmVyUmFuZ2UoKSkge1xuICAgICAgICByZXR1cm4gdG9BcnJheUJ1ZmZlclZpZXcoVWludDhBcnJheSwgdG9BcnJheUJ1ZmZlclZpZXcoSW50MzJBcnJheSwgdGhpcy5zb3VyY2VzW29mZnNldF0pKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHJlYWRUeXBlSWRzPFQgZXh0ZW5kcyBEYXRhVHlwZT4oX3R5cGU6IFQsIHsgb2Zmc2V0IH0gPSB0aGlzLm5leHRCdWZmZXJSYW5nZSgpKSB7XG4gICAgICAgIHJldHVybiB0b0FycmF5QnVmZmVyVmlldyhVaW50OEFycmF5LCB0b0FycmF5QnVmZmVyVmlldyhJbnQ4QXJyYXksIHRoaXMuc291cmNlc1tvZmZzZXRdKSk7XG4gICAgfVxuICAgIHByb3RlY3RlZCByZWFkRGF0YTxUIGV4dGVuZHMgRGF0YVR5cGU+KHR5cGU6IFQsIHsgb2Zmc2V0IH0gPSB0aGlzLm5leHRCdWZmZXJSYW5nZSgpKSB7XG4gICAgICAgIGNvbnN0IHsgc291cmNlcyB9ID0gdGhpcztcbiAgICAgICAgaWYgKERhdGFUeXBlLmlzVGltZXN0YW1wKHR5cGUpKSB7XG4gICAgICAgICAgICByZXR1cm4gdG9BcnJheUJ1ZmZlclZpZXcoVWludDhBcnJheSwgSW50NjQuY29udmVydEFycmF5KHNvdXJjZXNbb2Zmc2V0XSBhcyBzdHJpbmdbXSkpO1xuICAgICAgICB9IGVsc2UgaWYgKChEYXRhVHlwZS5pc0ludCh0eXBlKSB8fCBEYXRhVHlwZS5pc1RpbWUodHlwZSkpICYmIHR5cGUuYml0V2lkdGggPT09IDY0KSB7XG4gICAgICAgICAgICByZXR1cm4gdG9BcnJheUJ1ZmZlclZpZXcoVWludDhBcnJheSwgSW50NjQuY29udmVydEFycmF5KHNvdXJjZXNbb2Zmc2V0XSBhcyBzdHJpbmdbXSkpO1xuICAgICAgICB9IGVsc2UgaWYgKERhdGFUeXBlLmlzRGF0ZSh0eXBlKSAmJiB0eXBlLnVuaXQgPT09IERhdGVVbml0Lk1JTExJU0VDT05EKSB7XG4gICAgICAgICAgICByZXR1cm4gdG9BcnJheUJ1ZmZlclZpZXcoVWludDhBcnJheSwgSW50NjQuY29udmVydEFycmF5KHNvdXJjZXNbb2Zmc2V0XSBhcyBzdHJpbmdbXSkpO1xuICAgICAgICB9IGVsc2UgaWYgKERhdGFUeXBlLmlzRGVjaW1hbCh0eXBlKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRvQXJyYXlCdWZmZXJWaWV3KFVpbnQ4QXJyYXksIEludDEyOC5jb252ZXJ0QXJyYXkoc291cmNlc1tvZmZzZXRdIGFzIHN0cmluZ1tdKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoRGF0YVR5cGUuaXNCaW5hcnkodHlwZSkgfHwgRGF0YVR5cGUuaXNGaXhlZFNpemVCaW5hcnkodHlwZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBiaW5hcnlEYXRhRnJvbUpTT04oc291cmNlc1tvZmZzZXRdIGFzIHN0cmluZ1tdKTtcbiAgICAgICAgfSBlbHNlIGlmIChEYXRhVHlwZS5pc0Jvb2wodHlwZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBwYWNrQm9vbHMoc291cmNlc1tvZmZzZXRdIGFzIG51bWJlcltdKTtcbiAgICAgICAgfSBlbHNlIGlmIChEYXRhVHlwZS5pc1V0ZjgodHlwZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB1dGY4RW5jb2Rlci5lbmNvZGUoKHNvdXJjZXNbb2Zmc2V0XSBhcyBzdHJpbmdbXSkuam9pbignJykpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0b0FycmF5QnVmZmVyVmlldyhVaW50OEFycmF5LCB0b0FycmF5QnVmZmVyVmlldyh0eXBlLkFycmF5VHlwZSwgc291cmNlc1tvZmZzZXRdLm1hcCgoeCkgPT4gK3gpKSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBiaW5hcnlEYXRhRnJvbUpTT04odmFsdWVzOiBzdHJpbmdbXSkge1xuICAgIC8vIFwiREFUQVwiOiBbXCI0OUJDN0Q1QjZDNDdEMlwiLFwiM0Y1RkI2RDkzMjIwMjZcIl1cbiAgICAvLyBUaGVyZSBhcmUgZGVmaW5pdGVseSBtb3JlIGVmZmljaWVudCB3YXlzIHRvIGRvIHRoaXMuLi4gYnV0IGl0IGdldHMgdGhlXG4gICAgLy8gam9iIGRvbmUuXG4gICAgY29uc3Qgam9pbmVkID0gdmFsdWVzLmpvaW4oJycpO1xuICAgIGNvbnN0IGRhdGEgPSBuZXcgVWludDhBcnJheShqb2luZWQubGVuZ3RoIC8gMik7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBqb2luZWQubGVuZ3RoOyBpICs9IDIpIHtcbiAgICAgICAgZGF0YVtpID4+IDFdID0gcGFyc2VJbnQoam9pbmVkLnN1YnN0cihpLCAyKSwgMTYpO1xuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbn1cbiJdfQ==

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
    readTypeIds(type, { offset } = this.nextBufferRange()) {
        return toArrayBufferView(Uint8Array, toArrayBufferView(type.ArrayType, this.sources[offset]));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInZpc2l0b3IvdmVjdG9ybG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDZEQUE2RDtBQUM3RCwrREFBK0Q7QUFDL0Qsd0RBQXdEO0FBQ3hELDZEQUE2RDtBQUM3RCxvREFBb0Q7QUFDcEQsNkRBQTZEO0FBQzdELDZEQUE2RDtBQUM3RCxFQUFFO0FBQ0YsK0NBQStDO0FBQy9DLEVBQUU7QUFDRiw2REFBNkQ7QUFDN0QsOERBQThEO0FBQzlELHlEQUF5RDtBQUN6RCw0REFBNEQ7QUFDNUQsMERBQTBEO0FBQzFELHFCQUFxQjtBQUVyQixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFbEQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUUvQixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ2xDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDbkMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLFlBQVksQ0FBQztBQUNyQyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ3hDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQzVDLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQzlDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBR25ELE1BQU0sV0FBVyxHQUFHLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBTzdDLE1BQU0sT0FBTyxZQUFhLFNBQVEsT0FBTztJQU1yQyxZQUFZLEtBQWlCLEVBQUUsS0FBa0IsRUFBRSxPQUF1QjtRQUN0RSxLQUFLLEVBQUUsQ0FBQztRQUpKLGVBQVUsR0FBVyxDQUFDLENBQUMsQ0FBQztRQUV4QixpQkFBWSxHQUFXLENBQUMsQ0FBQyxDQUFDO1FBRzlCLElBQUksQ0FBQyxLQUFLLEdBQUcs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Q0FBQyxDQUFDLENBQUM7SUFDNUcsQ0FBQztDQUNKO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxNQUFnQjtJQUN4Qyw4Q0FBOEM7SUFDOUMseUVBQXlFO0lBQ3pFLFlBQVk7SUFDWixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQy9CLE1BQU0sSUFBSSxHQUFHLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDL0MsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUN2QyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztLQUNwRDtJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2hCLENBQUMiLCJmaWxlIjoidmlzaXRvci92ZWN0b3Jsb2FkZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgVGV4dEVuY29kZXIgfSBmcm9tICd0ZXh0LWVuY29kaW5nLXV0Zi04JztcblxuaW1wb3J0IHsgRGF0YSB9IGZyb20gJy4uL2RhdGEnO1xuaW1wb3J0ICogYXMgdHlwZSBmcm9tICcuLi90eXBlJztcbmltcG9ydCB7IEZpZWxkIH0gZnJvbSAnLi4vc2NoZW1hJztcbmltcG9ydCB7IERhdGFUeXBlIH0gZnJvbSAnLi4vdHlwZSc7XG5pbXBvcnQgeyBWaXNpdG9yIH0gZnJvbSAnLi4vdmlzaXRvcic7XG5pbXBvcnQgeyBwYWNrQm9vbHMgfSBmcm9tICcuLi91dGlsL2JpdCc7XG5pbXBvcnQgeyBJbnQ2NCwgSW50MTI4IH0gZnJvbSAnLi4vdXRpbC9pbnQnO1xuaW1wb3J0IHsgVW5pb25Nb2RlLCBEYXRlVW5pdCB9IGZyb20gJy4uL2VudW0nO1xuaW1wb3J0IHsgdG9BcnJheUJ1ZmZlclZpZXcgfSBmcm9tICcuLi91dGlsL2J1ZmZlcic7XG5pbXBvcnQgeyBCdWZmZXJSZWdpb24sIEZpZWxkTm9kZSB9IGZyb20gJy4uL2lwYy9tZXRhZGF0YS9tZXNzYWdlJztcblxuY29uc3QgdXRmOEVuY29kZXIgPSBuZXcgVGV4dEVuY29kZXIoJ3V0Zi04Jyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVmVjdG9yTG9hZGVyIGV4dGVuZHMgVmlzaXRvciB7XG4gICAgdmlzaXRNYW55IDxUIGV4dGVuZHMgRGF0YVR5cGU+KG5vZGVzOiAoRmllbGQ8VD4gfCBUKVtdKTogRGF0YTxUPltdO1xuICAgIHZpc2l0ICAgICA8VCBleHRlbmRzIERhdGFUeXBlPihub2RlOiAgIEZpZWxkPFQ+IHwgVCAgICk6IERhdGE8VD47XG59XG5cbmV4cG9ydCBjbGFzcyBWZWN0b3JMb2FkZXIgZXh0ZW5kcyBWaXNpdG9yIHtcbiAgICBwcml2YXRlIGJ5dGVzOiBVaW50OEFycmF5O1xuICAgIHByaXZhdGUgbm9kZXM6IEZpZWxkTm9kZVtdO1xuICAgIHByaXZhdGUgbm9kZXNJbmRleDogbnVtYmVyID0gLTE7XG4gICAgcHJpdmF0ZSBidWZmZXJzOiBCdWZmZXJSZWdpb25bXTtcbiAgICBwcml2YXRlIGJ1ZmZlcnNJbmRleDogbnVtYmVyID0gLTE7XG4gICAgY29uc3RydWN0b3IoYnl0ZXM6IFVpbnQ4QXJyYXksIG5vZGVzOiBGaWVsZE5vZGVbXSwgYnVmZmVyczogQnVmZmVyUmVnaW9uW10pIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5ieXRlcyA9IGJ5dGVzO1xuICAgICAgICB0aGlzLm5vZGVzID0gbm9kZXM7XG4gICAgICAgIHRoaXMuYnVmZmVycyA9IGJ1ZmZlcnM7XG4gICAgfVxuXG4gICAgcHVibGljIHZpc2l0PFQgZXh0ZW5kcyBEYXRhVHlwZT4obm9kZTogRmllbGQ8VD4gfCBUKTogRGF0YTxUPiB7XG4gICAgICAgIHJldHVybiBzdXBlci52aXNpdChub2RlIGluc3RhbmNlb2YgRmllbGQgPyBub2RlLnR5cGUgOiBub2RlKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgdmlzaXROdWxsICAgICAgICAgICAgPFQgZXh0ZW5kcyB0eXBlLk51bGw+ICAgICAgICAgICAgKHR5cGU6IFQsIHsgbGVuZ3RoLCBudWxsQ291bnQgfSA9IHRoaXMubmV4dEZpZWxkTm9kZSgpKSB7IHJldHVybiAgICAgICAgICAgIERhdGEuTnVsbCh0eXBlLCAwLCBsZW5ndGgsIG51bGxDb3VudCwgdGhpcy5yZWFkTnVsbEJpdG1hcCh0eXBlLCBudWxsQ291bnQpKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRCb29sICAgICAgICAgICAgPFQgZXh0ZW5kcyB0eXBlLkJvb2w+ICAgICAgICAgICAgKHR5cGU6IFQsIHsgbGVuZ3RoLCBudWxsQ291bnQgfSA9IHRoaXMubmV4dEZpZWxkTm9kZSgpKSB7IHJldHVybiAgICAgICAgICAgIERhdGEuQm9vbCh0eXBlLCAwLCBsZW5ndGgsIG51bGxDb3VudCwgdGhpcy5yZWFkTnVsbEJpdG1hcCh0eXBlLCBudWxsQ291bnQpLCB0aGlzLnJlYWREYXRhKHR5cGUpKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRJbnQgICAgICAgICAgICAgPFQgZXh0ZW5kcyB0eXBlLkludD4gICAgICAgICAgICAgKHR5cGU6IFQsIHsgbGVuZ3RoLCBudWxsQ291bnQgfSA9IHRoaXMubmV4dEZpZWxkTm9kZSgpKSB7IHJldHVybiAgICAgICAgICAgICBEYXRhLkludCh0eXBlLCAwLCBsZW5ndGgsIG51bGxDb3VudCwgdGhpcy5yZWFkTnVsbEJpdG1hcCh0eXBlLCBudWxsQ291bnQpLCB0aGlzLnJlYWREYXRhKHR5cGUpKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRGbG9hdCAgICAgICAgICAgPFQgZXh0ZW5kcyB0eXBlLkZsb2F0PiAgICAgICAgICAgKHR5cGU6IFQsIHsgbGVuZ3RoLCBudWxsQ291bnQgfSA9IHRoaXMubmV4dEZpZWxkTm9kZSgpKSB7IHJldHVybiAgICAgICAgICAgRGF0YS5GbG9hdCh0eXBlLCAwLCBsZW5ndGgsIG51bGxDb3VudCwgdGhpcy5yZWFkTnVsbEJpdG1hcCh0eXBlLCBudWxsQ291bnQpLCB0aGlzLnJlYWREYXRhKHR5cGUpKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRVdGY4ICAgICAgICAgICAgPFQgZXh0ZW5kcyB0eXBlLlV0Zjg+ICAgICAgICAgICAgKHR5cGU6IFQsIHsgbGVuZ3RoLCBudWxsQ291bnQgfSA9IHRoaXMubmV4dEZpZWxkTm9kZSgpKSB7IHJldHVybiAgICAgICAgICAgIERhdGEuVXRmOCh0eXBlLCAwLCBsZW5ndGgsIG51bGxDb3VudCwgdGhpcy5yZWFkTnVsbEJpdG1hcCh0eXBlLCBudWxsQ291bnQpLCB0aGlzLnJlYWRPZmZzZXRzKHR5cGUpLCB0aGlzLnJlYWREYXRhKHR5cGUpKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRCaW5hcnkgICAgICAgICAgPFQgZXh0ZW5kcyB0eXBlLkJpbmFyeT4gICAgICAgICAgKHR5cGU6IFQsIHsgbGVuZ3RoLCBudWxsQ291bnQgfSA9IHRoaXMubmV4dEZpZWxkTm9kZSgpKSB7IHJldHVybiAgICAgICAgICBEYXRhLkJpbmFyeSh0eXBlLCAwLCBsZW5ndGgsIG51bGxDb3VudCwgdGhpcy5yZWFkTnVsbEJpdG1hcCh0eXBlLCBudWxsQ291bnQpLCB0aGlzLnJlYWRPZmZzZXRzKHR5cGUpLCB0aGlzLnJlYWREYXRhKHR5cGUpKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRGaXhlZFNpemVCaW5hcnkgPFQgZXh0ZW5kcyB0eXBlLkZpeGVkU2l6ZUJpbmFyeT4gKHR5cGU6IFQsIHsgbGVuZ3RoLCBudWxsQ291bnQgfSA9IHRoaXMubmV4dEZpZWxkTm9kZSgpKSB7IHJldHVybiBEYXRhLkZpeGVkU2l6ZUJpbmFyeSh0eXBlLCAwLCBsZW5ndGgsIG51bGxDb3VudCwgdGhpcy5yZWFkTnVsbEJpdG1hcCh0eXBlLCBudWxsQ291bnQpLCB0aGlzLnJlYWREYXRhKHR5cGUpKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXREYXRlICAgICAgICAgICAgPFQgZXh0ZW5kcyB0eXBlLkRhdGVfPiAgICAgICAgICAgKHR5cGU6IFQsIHsgbGVuZ3RoLCBudWxsQ291bnQgfSA9IHRoaXMubmV4dEZpZWxkTm9kZSgpKSB7IHJldHVybiAgICAgICAgICAgIERhdGEuRGF0ZSh0eXBlLCAwLCBsZW5ndGgsIG51bGxDb3VudCwgdGhpcy5yZWFkTnVsbEJpdG1hcCh0eXBlLCBudWxsQ291bnQpLCB0aGlzLnJlYWREYXRhKHR5cGUpKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRUaW1lc3RhbXAgICAgICAgPFQgZXh0ZW5kcyB0eXBlLlRpbWVzdGFtcD4gICAgICAgKHR5cGU6IFQsIHsgbGVuZ3RoLCBudWxsQ291bnQgfSA9IHRoaXMubmV4dEZpZWxkTm9kZSgpKSB7IHJldHVybiAgICAgICBEYXRhLlRpbWVzdGFtcCh0eXBlLCAwLCBsZW5ndGgsIG51bGxDb3VudCwgdGhpcy5yZWFkTnVsbEJpdG1hcCh0eXBlLCBudWxsQ291bnQpLCB0aGlzLnJlYWREYXRhKHR5cGUpKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRUaW1lICAgICAgICAgICAgPFQgZXh0ZW5kcyB0eXBlLlRpbWU+ICAgICAgICAgICAgKHR5cGU6IFQsIHsgbGVuZ3RoLCBudWxsQ291bnQgfSA9IHRoaXMubmV4dEZpZWxkTm9kZSgpKSB7IHJldHVybiAgICAgICAgICAgIERhdGEuVGltZSh0eXBlLCAwLCBsZW5ndGgsIG51bGxDb3VudCwgdGhpcy5yZWFkTnVsbEJpdG1hcCh0eXBlLCBudWxsQ291bnQpLCB0aGlzLnJlYWREYXRhKHR5cGUpKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXREZWNpbWFsICAgICAgICAgPFQgZXh0ZW5kcyB0eXBlLkRlY2ltYWw+ICAgICAgICAgKHR5cGU6IFQsIHsgbGVuZ3RoLCBudWxsQ291bnQgfSA9IHRoaXMubmV4dEZpZWxkTm9kZSgpKSB7IHJldHVybiAgICAgICAgIERhdGEuRGVjaW1hbCh0eXBlLCAwLCBsZW5ndGgsIG51bGxDb3VudCwgdGhpcy5yZWFkTnVsbEJpdG1hcCh0eXBlLCBudWxsQ291bnQpLCB0aGlzLnJlYWREYXRhKHR5cGUpKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRMaXN0ICAgICAgICAgICAgPFQgZXh0ZW5kcyB0eXBlLkxpc3Q+ICAgICAgICAgICAgKHR5cGU6IFQsIHsgbGVuZ3RoLCBudWxsQ291bnQgfSA9IHRoaXMubmV4dEZpZWxkTm9kZSgpKSB7IHJldHVybiAgICAgICAgICAgIERhdGEuTGlzdCh0eXBlLCAwLCBsZW5ndGgsIG51bGxDb3VudCwgdGhpcy5yZWFkTnVsbEJpdG1hcCh0eXBlLCBudWxsQ291bnQpLCB0aGlzLnJlYWRPZmZzZXRzKHR5cGUpLCB0aGlzLnZpc2l0KHR5cGUuY2hpbGRyZW5bMF0pKTsgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRTdHJ1Y3QgICAgICAgICAgPFQgZXh0ZW5kcyB0eXBlLlN0cnVjdD4gICAgICAgICAgKHR5cGU6IFQsIHsgbGVuZ3RoLCBudWxsQ291bnQgfSA9IHRoaXMubmV4dEZpZWxkTm9kZSgpKSB7IHJldHVybiAgICAgICAgICBEYXRhLlN0cnVjdCh0eXBlLCAwLCBsZW5ndGgsIG51bGxDb3VudCwgdGhpcy5yZWFkTnVsbEJpdG1hcCh0eXBlLCBudWxsQ291bnQpLCB0aGlzLnZpc2l0TWFueSh0eXBlLmNoaWxkcmVuKSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRVbmlvbiAgICAgICAgICAgPFQgZXh0ZW5kcyB0eXBlLlVuaW9uPiAgICAgICAgICAgKHR5cGU6IFQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSB7IHJldHVybiB0eXBlLm1vZGUgPT09IFVuaW9uTW9kZS5TcGFyc2UgPyB0aGlzLnZpc2l0U3BhcnNlVW5pb24odHlwZSBhcyB0eXBlLlNwYXJzZVVuaW9uKSA6IHRoaXMudmlzaXREZW5zZVVuaW9uKHR5cGUgYXMgdHlwZS5EZW5zZVVuaW9uKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXREZW5zZVVuaW9uICAgICAgPFQgZXh0ZW5kcyB0eXBlLkRlbnNlVW5pb24+ICAgICAgKHR5cGU6IFQsIHsgbGVuZ3RoLCBudWxsQ291bnQgfSA9IHRoaXMubmV4dEZpZWxkTm9kZSgpKSB7IHJldHVybiAgICAgICAgICAgRGF0YS5Vbmlvbih0eXBlLCAwLCBsZW5ndGgsIG51bGxDb3VudCwgdGhpcy5yZWFkTnVsbEJpdG1hcCh0eXBlLCBudWxsQ291bnQpLCB0aGlzLnJlYWRUeXBlSWRzKHR5cGUpLCB0aGlzLnJlYWRPZmZzZXRzKHR5cGUpLCB0aGlzLnZpc2l0TWFueSh0eXBlLmNoaWxkcmVuKSk7IH1cbiAgICBwdWJsaWMgdmlzaXRTcGFyc2VVbmlvbiAgICAgPFQgZXh0ZW5kcyB0eXBlLlNwYXJzZVVuaW9uPiAgICAgKHR5cGU6IFQsIHsgbGVuZ3RoLCBudWxsQ291bnQgfSA9IHRoaXMubmV4dEZpZWxkTm9kZSgpKSB7IHJldHVybiAgICAgICAgICAgRGF0YS5Vbmlvbih0eXBlLCAwLCBsZW5ndGgsIG51bGxDb3VudCwgdGhpcy5yZWFkTnVsbEJpdG1hcCh0eXBlLCBudWxsQ291bnQpLCB0aGlzLnJlYWRUeXBlSWRzKHR5cGUpLCB0aGlzLnZpc2l0TWFueSh0eXBlLmNoaWxkcmVuKSk7ICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXREaWN0aW9uYXJ5ICAgICAgPFQgZXh0ZW5kcyB0eXBlLkRpY3Rpb25hcnk+ICAgICAgKHR5cGU6IFQsIHsgbGVuZ3RoLCBudWxsQ291bnQgfSA9IHRoaXMubmV4dEZpZWxkTm9kZSgpKSB7IHJldHVybiAgICAgIERhdGEuRGljdGlvbmFyeSh0eXBlLCAwLCBsZW5ndGgsIG51bGxDb3VudCwgdGhpcy5yZWFkTnVsbEJpdG1hcCh0eXBlLCBudWxsQ291bnQpLCB0aGlzLnJlYWREYXRhKHR5cGUuaW5kaWNlcykpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRJbnRlcnZhbCAgICAgICAgPFQgZXh0ZW5kcyB0eXBlLkludGVydmFsPiAgICAgICAgKHR5cGU6IFQsIHsgbGVuZ3RoLCBudWxsQ291bnQgfSA9IHRoaXMubmV4dEZpZWxkTm9kZSgpKSB7IHJldHVybiAgICAgICAgRGF0YS5JbnRlcnZhbCh0eXBlLCAwLCBsZW5ndGgsIG51bGxDb3VudCwgdGhpcy5yZWFkTnVsbEJpdG1hcCh0eXBlLCBudWxsQ291bnQpLCB0aGlzLnJlYWREYXRhKHR5cGUpKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRGaXhlZFNpemVMaXN0ICAgPFQgZXh0ZW5kcyB0eXBlLkZpeGVkU2l6ZUxpc3Q+ICAgKHR5cGU6IFQsIHsgbGVuZ3RoLCBudWxsQ291bnQgfSA9IHRoaXMubmV4dEZpZWxkTm9kZSgpKSB7IHJldHVybiAgIERhdGEuRml4ZWRTaXplTGlzdCh0eXBlLCAwLCBsZW5ndGgsIG51bGxDb3VudCwgdGhpcy5yZWFkTnVsbEJpdG1hcCh0eXBlLCBudWxsQ291bnQpLCB0aGlzLnZpc2l0KHR5cGUuY2hpbGRyZW5bMF0pKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRNYXAgICAgICAgICAgICAgPFQgZXh0ZW5kcyB0eXBlLk1hcF8+ICAgICAgICAgICAgKHR5cGU6IFQsIHsgbGVuZ3RoLCBudWxsQ291bnQgfSA9IHRoaXMubmV4dEZpZWxkTm9kZSgpKSB7IHJldHVybiAgICAgICAgICAgICBEYXRhLk1hcCh0eXBlLCAwLCBsZW5ndGgsIG51bGxDb3VudCwgdGhpcy5yZWFkTnVsbEJpdG1hcCh0eXBlLCBudWxsQ291bnQpLCB0aGlzLnZpc2l0TWFueSh0eXBlLmNoaWxkcmVuKSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgIHByb3RlY3RlZCBuZXh0RmllbGROb2RlKCkgeyByZXR1cm4gdGhpcy5ub2Rlc1srK3RoaXMubm9kZXNJbmRleF07IH1cbiAgICBwcm90ZWN0ZWQgbmV4dEJ1ZmZlclJhbmdlKCkgeyByZXR1cm4gdGhpcy5idWZmZXJzWysrdGhpcy5idWZmZXJzSW5kZXhdOyB9XG4gICAgcHJvdGVjdGVkIHJlYWROdWxsQml0bWFwPFQgZXh0ZW5kcyBEYXRhVHlwZT4odHlwZTogVCwgbnVsbENvdW50OiBudW1iZXIsIGJ1ZmZlciA9IHRoaXMubmV4dEJ1ZmZlclJhbmdlKCkpIHtcbiAgICAgICAgcmV0dXJuIG51bGxDb3VudCA+IDAgJiYgdGhpcy5yZWFkRGF0YSh0eXBlLCBidWZmZXIpIHx8IG5ldyBVaW50OEFycmF5KDApO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgcmVhZE9mZnNldHM8VCBleHRlbmRzIERhdGFUeXBlPih0eXBlOiBULCBidWZmZXI/OiBCdWZmZXJSZWdpb24pIHsgcmV0dXJuIHRoaXMucmVhZERhdGEodHlwZSwgYnVmZmVyKTsgfVxuICAgIHByb3RlY3RlZCByZWFkVHlwZUlkczxUIGV4dGVuZHMgRGF0YVR5cGU+KHR5cGU6IFQsIGJ1ZmZlcj86IEJ1ZmZlclJlZ2lvbikgeyByZXR1cm4gdGhpcy5yZWFkRGF0YSh0eXBlLCBidWZmZXIpOyB9XG4gICAgcHJvdGVjdGVkIHJlYWREYXRhPFQgZXh0ZW5kcyBEYXRhVHlwZT4oX3R5cGU6IFQsIHsgbGVuZ3RoLCBvZmZzZXQgfSA9IHRoaXMubmV4dEJ1ZmZlclJhbmdlKCkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYnl0ZXMuc3ViYXJyYXkob2Zmc2V0LCBvZmZzZXQgKyBsZW5ndGgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEpTT05WZWN0b3JMb2FkZXIgZXh0ZW5kcyBWZWN0b3JMb2FkZXIge1xuICAgIHByaXZhdGUgc291cmNlczogYW55W11bXTtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2VzOiBhbnlbXVtdLCBub2RlczogRmllbGROb2RlW10sIGJ1ZmZlcnM6IEJ1ZmZlclJlZ2lvbltdKSB7XG4gICAgICAgIHN1cGVyKG5ldyBVaW50OEFycmF5KDApLCBub2RlcywgYnVmZmVycyk7XG4gICAgICAgIHRoaXMuc291cmNlcyA9IHNvdXJjZXM7XG4gICAgfVxuICAgIHByb3RlY3RlZCByZWFkTnVsbEJpdG1hcDxUIGV4dGVuZHMgRGF0YVR5cGU+KF90eXBlOiBULCBudWxsQ291bnQ6IG51bWJlciwgeyBvZmZzZXQgfSA9IHRoaXMubmV4dEJ1ZmZlclJhbmdlKCkpIHtcbiAgICAgICAgcmV0dXJuIG51bGxDb3VudCA8PSAwID8gbmV3IFVpbnQ4QXJyYXkoMCkgOiBwYWNrQm9vbHModGhpcy5zb3VyY2VzW29mZnNldF0pO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgcmVhZE9mZnNldHM8VCBleHRlbmRzIERhdGFUeXBlPihfdHlwZTogVCwgeyBvZmZzZXQgfSA9IHRoaXMubmV4dEJ1ZmZlclJhbmdlKCkpIHtcbiAgICAgICAgcmV0dXJuIHRvQXJyYXlCdWZmZXJWaWV3KFVpbnQ4QXJyYXksIHRvQXJyYXlCdWZmZXJWaWV3KEludDMyQXJyYXksIHRoaXMuc291cmNlc1tvZmZzZXRdKSk7XG4gICAgfVxuICAgIHByb3RlY3RlZCByZWFkVHlwZUlkczxUIGV4dGVuZHMgRGF0YVR5cGU+KHR5cGU6IFQsIHsgb2Zmc2V0IH0gPSB0aGlzLm5leHRCdWZmZXJSYW5nZSgpKSB7XG4gICAgICAgIHJldHVybiB0b0FycmF5QnVmZmVyVmlldyhVaW50OEFycmF5LCB0b0FycmF5QnVmZmVyVmlldyh0eXBlLkFycmF5VHlwZSwgdGhpcy5zb3VyY2VzW29mZnNldF0pKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHJlYWREYXRhPFQgZXh0ZW5kcyBEYXRhVHlwZT4odHlwZTogVCwgeyBvZmZzZXQgfSA9IHRoaXMubmV4dEJ1ZmZlclJhbmdlKCkpIHtcbiAgICAgICAgY29uc3QgeyBzb3VyY2VzIH0gPSB0aGlzO1xuICAgICAgICBpZiAoRGF0YVR5cGUuaXNUaW1lc3RhbXAodHlwZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0b0FycmF5QnVmZmVyVmlldyhVaW50OEFycmF5LCBJbnQ2NC5jb252ZXJ0QXJyYXkoc291cmNlc1tvZmZzZXRdIGFzIHN0cmluZ1tdKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoKERhdGFUeXBlLmlzSW50KHR5cGUpIHx8IERhdGFUeXBlLmlzVGltZSh0eXBlKSkgJiYgdHlwZS5iaXRXaWR0aCA9PT0gNjQpIHtcbiAgICAgICAgICAgIHJldHVybiB0b0FycmF5QnVmZmVyVmlldyhVaW50OEFycmF5LCBJbnQ2NC5jb252ZXJ0QXJyYXkoc291cmNlc1tvZmZzZXRdIGFzIHN0cmluZ1tdKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoRGF0YVR5cGUuaXNEYXRlKHR5cGUpICYmIHR5cGUudW5pdCA9PT0gRGF0ZVVuaXQuTUlMTElTRUNPTkQpIHtcbiAgICAgICAgICAgIHJldHVybiB0b0FycmF5QnVmZmVyVmlldyhVaW50OEFycmF5LCBJbnQ2NC5jb252ZXJ0QXJyYXkoc291cmNlc1tvZmZzZXRdIGFzIHN0cmluZ1tdKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoRGF0YVR5cGUuaXNEZWNpbWFsKHR5cGUpKSB7XG4gICAgICAgICAgICByZXR1cm4gdG9BcnJheUJ1ZmZlclZpZXcoVWludDhBcnJheSwgSW50MTI4LmNvbnZlcnRBcnJheShzb3VyY2VzW29mZnNldF0gYXMgc3RyaW5nW10pKTtcbiAgICAgICAgfSBlbHNlIGlmIChEYXRhVHlwZS5pc0JpbmFyeSh0eXBlKSB8fCBEYXRhVHlwZS5pc0ZpeGVkU2l6ZUJpbmFyeSh0eXBlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGJpbmFyeURhdGFGcm9tSlNPTihzb3VyY2VzW29mZnNldF0gYXMgc3RyaW5nW10pO1xuICAgICAgICB9IGVsc2UgaWYgKERhdGFUeXBlLmlzQm9vbCh0eXBlKSkge1xuICAgICAgICAgICAgcmV0dXJuIHBhY2tCb29scyhzb3VyY2VzW29mZnNldF0gYXMgbnVtYmVyW10pO1xuICAgICAgICB9IGVsc2UgaWYgKERhdGFUeXBlLmlzVXRmOCh0eXBlKSkge1xuICAgICAgICAgICAgcmV0dXJuIHV0ZjhFbmNvZGVyLmVuY29kZSgoc291cmNlc1tvZmZzZXRdIGFzIHN0cmluZ1tdKS5qb2luKCcnKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRvQXJyYXlCdWZmZXJWaWV3KFVpbnQ4QXJyYXksIHRvQXJyYXlCdWZmZXJWaWV3KHR5cGUuQXJyYXlUeXBlLCBzb3VyY2VzW29mZnNldF0ubWFwKCh4KSA9PiAreCkpKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGJpbmFyeURhdGFGcm9tSlNPTih2YWx1ZXM6IHN0cmluZ1tdKSB7XG4gICAgLy8gXCJEQVRBXCI6IFtcIjQ5QkM3RDVCNkM0N0QyXCIsXCIzRjVGQjZEOTMyMjAyNlwiXVxuICAgIC8vIFRoZXJlIGFyZSBkZWZpbml0ZWx5IG1vcmUgZWZmaWNpZW50IHdheXMgdG8gZG8gdGhpcy4uLiBidXQgaXQgZ2V0cyB0aGVcbiAgICAvLyBqb2IgZG9uZS5cbiAgICBjb25zdCBqb2luZWQgPSB2YWx1ZXMuam9pbignJyk7XG4gICAgY29uc3QgZGF0YSA9IG5ldyBVaW50OEFycmF5KGpvaW5lZC5sZW5ndGggLyAyKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGpvaW5lZC5sZW5ndGg7IGkgKz0gMikge1xuICAgICAgICBkYXRhW2kgPj4gMV0gPSBwYXJzZUludChqb2luZWQuc3Vic3RyKGksIDIpLCAxNik7XG4gICAgfVxuICAgIHJldHVybiBkYXRhO1xufVxuIl19

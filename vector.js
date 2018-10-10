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
const data_1 = require("./data");
const visitor_1 = require("./visitor");
const type_1 = require("./type");
const type_2 = require("./type");
const IntUtil = require("./util/int");
class Vector {
    constructor(data, view) {
        this.data = data;
        this.type = data.type;
        this.length = data.length;
        let nulls;
        if ((data instanceof data_1.ChunkedData) && !(view instanceof chunked_1.ChunkedView)) {
            this.view = new chunked_1.ChunkedView(data);
        }
        else if (!(view instanceof validity_1.ValidityView) && (nulls = data.nullBitmap) && nulls.length > 0 && data.nullCount > 0) {
            this.view = new validity_1.ValidityView(data, view);
        }
        else {
            this.view = view;
        }
    }
    static create(data) {
        return exports.createVector(data);
    }
    static concat(source, ...others) {
        return others.reduce((a, b) => a ? a.concat(b) : b, source);
    }
    get nullCount() { return this.data.nullCount; }
    get nullBitmap() { return this.data.nullBitmap; }
    get [Symbol.toStringTag]() {
        return `Vector<${this.type[Symbol.toStringTag]}>`;
    }
    toJSON() { return this.toArray(); }
    clone(data, view = this.view.clone(data)) {
        return new this.constructor(data, view);
    }
    isValid(index) {
        return this.view.isValid(index);
    }
    get(index) {
        return this.view.get(index);
    }
    set(index, value) {
        return this.view.set(index, value);
    }
    toArray() {
        return this.view.toArray();
    }
    indexOf(value) {
        return this.view.indexOf(value);
    }
    [Symbol.iterator]() {
        return this.view[Symbol.iterator]();
    }
    concat(...others) {
        if ((others = others.filter(Boolean)).length === 0) {
            return this;
        }
        const { view } = this;
        const vecs = !(view instanceof chunked_1.ChunkedView)
            ? [this, ...others]
            : [...view.chunkVectors, ...others];
        const offsets = data_1.ChunkedData.computeOffsets(vecs);
        const chunksLength = offsets[offsets.length - 1];
        const chunkedData = new data_1.ChunkedData(this.type, chunksLength, vecs, 0, -1, offsets);
        return this.clone(chunkedData, new chunked_1.ChunkedView(chunkedData));
    }
    slice(begin, end) {
        let { length } = this;
        let size = this.view.size || 1;
        let total = length, from = (begin || 0) * size;
        let to = (typeof end === 'number' ? end : total) * size;
        if (to < 0) {
            to = total - (to * -1) % total;
        }
        if (from < 0) {
            from = total - (from * -1) % total;
        }
        if (to < from) {
            [from, to] = [to, from];
        }
        total = !isFinite(total = (to - from)) || total < 0 ? 0 : total;
        const slicedData = this.data.slice(from, Math.min(total, length));
        return this.clone(slicedData, this.view.clone(slicedData));
    }
    acceptTypeVisitor(visitor) {
        return visitor_1.TypeVisitor.visitTypeInline(visitor, this.type);
    }
    acceptVectorVisitor(visitor) {
        return visitor_1.VectorVisitor.visitTypeInline(visitor, this.type, this);
    }
}
exports.Vector = Vector;
class FlatVector extends Vector {
    get values() { return this.data.values; }
    lows() { return this.asInt32(0, 2); }
    highs() { return this.asInt32(1, 2); }
    asInt32(offset = 0, stride = 2) {
        let data = this.data.clone(new type_5.Int32());
        if (offset > 0) {
            data = data.slice(offset, this.length - offset);
        }
        const int32s = new IntVector(data, new flat_1.PrimitiveView(data, stride));
        int32s.length = this.length / stride | 0;
        return int32s;
    }
}
exports.FlatVector = FlatVector;
class ListVectorBase extends Vector {
    get values() { return this.data.values; }
    get valueOffsets() { return this.data.valueOffsets; }
    getValueOffset(index) {
        return this.valueOffsets[index];
    }
    getValueLength(index) {
        return this.valueOffsets[index + 1] - this.valueOffsets[index];
    }
}
exports.ListVectorBase = ListVectorBase;
class NestedVector extends Vector {
    getChildAt(index) {
        return this.view.getChildAt(index);
    }
    get childData() {
        let data;
        if ((data = this._childData)) {
            // Return the cached childData reference first
            return data;
        }
        else if (!((data = this.data) instanceof data_1.ChunkedData)) {
            // If data isn't chunked, cache and return NestedData's childData
            return this._childData = data.childData;
        }
        // Otherwise if the data is chunked, concatenate the childVectors from each chunk
        // to construct a single chunked Vector for each column. Then return the ChunkedData
        // instance from each unified chunked column as the childData of a chunked NestedVector
        const chunks = data.chunkVectors;
        return this._childData = chunks
            .reduce((cols, chunk) => chunk.childData
            .reduce((cols, _, i) => ((cols[i] || (cols[i] = [])).push(chunk.getChildAt(i))) && cols || cols, cols), [])
            .map((vecs) => Vector.concat(...vecs).data);
    }
}
exports.NestedVector = NestedVector;
const type_3 = require("./type");
const type_4 = require("./type");
const type_5 = require("./type");
const type_6 = require("./type");
const chunked_1 = require("./vector/chunked");
const validity_1 = require("./vector/validity");
const dictionary_1 = require("./vector/dictionary");
const list_1 = require("./vector/list");
const nested_1 = require("./vector/nested");
const flat_1 = require("./vector/flat");
const flat_2 = require("./vector/flat");
const flat_3 = require("./vector/flat");
const bit_1 = require("./util/bit");
class NullVector extends Vector {
    constructor(data, view = new flat_1.NullView(data)) {
        super(data, view);
    }
}
exports.NullVector = NullVector;
class BoolVector extends Vector {
    static from(data) {
        return new BoolVector(new data_1.BoolData(new type_3.Bool(), data.length, null, bit_1.packBools(data)));
    }
    get values() { return this.data.values; }
    constructor(data, view = new flat_1.BoolView(data)) {
        super(data, view);
    }
}
exports.BoolVector = BoolVector;
class IntVector extends FlatVector {
    constructor(data, view = IntVector.defaultView(data)) {
        super(data, view);
    }
    static from(data, is64) {
        if (is64 === true) {
            return data instanceof Int32Array
                ? new IntVector(new data_1.FlatData(new type_5.Int64(), data.length, null, data))
                : new IntVector(new data_1.FlatData(new type_5.Uint64(), data.length, null, data));
        }
        switch (data.constructor) {
            case Int8Array: return new IntVector(new data_1.FlatData(new type_5.Int8(), data.length, null, data));
            case Int16Array: return new IntVector(new data_1.FlatData(new type_5.Int16(), data.length, null, data));
            case Int32Array: return new IntVector(new data_1.FlatData(new type_5.Int32(), data.length, null, data));
            case Uint8Array: return new IntVector(new data_1.FlatData(new type_5.Uint8(), data.length, null, data));
            case Uint16Array: return new IntVector(new data_1.FlatData(new type_5.Uint16(), data.length, null, data));
            case Uint32Array: return new IntVector(new data_1.FlatData(new type_5.Uint32(), data.length, null, data));
        }
        throw new TypeError('Unrecognized Int data');
    }
    static defaultView(data) {
        return data.type.bitWidth <= 32 ? new flat_1.FlatView(data) : new flat_1.FixedSizeView(data, (data.type.bitWidth / 32) | 0);
    }
}
exports.IntVector = IntVector;
class FloatVector extends FlatVector {
    constructor(data, view = FloatVector.defaultView(data)) {
        super(data, view);
    }
    static from(data) {
        switch (data.constructor) {
            case Uint16Array: return new FloatVector(new data_1.FlatData(new type_5.Float16(), data.length, null, data));
            case Float32Array: return new FloatVector(new data_1.FlatData(new type_5.Float32(), data.length, null, data));
            case Float64Array: return new FloatVector(new data_1.FlatData(new type_5.Float64(), data.length, null, data));
        }
        throw new TypeError('Unrecognized Float data');
    }
    static defaultView(data) {
        return data.type.precision !== type_2.Precision.HALF ? new flat_1.FlatView(data) : new flat_1.Float16View(data);
    }
}
exports.FloatVector = FloatVector;
class DateVector extends FlatVector {
    static from(data, unit = type_2.DateUnit.MILLISECOND) {
        const type_ = new type_4.Date_(unit);
        const converted = unit === type_2.DateUnit.MILLISECOND ?
            IntUtil.Int64.convertArray(data.map((d) => d.valueOf())) :
            unit === type_2.DateUnit.DAY ?
                Int32Array.from(data.map((d) => d.valueOf() / 86400000)) :
                undefined;
        if (converted === undefined) {
            throw new TypeError(`Unrecognized date unit "${type_2.DateUnit[unit]}"`);
        }
        return new DateVector(new data_1.FlatData(type_, data.length, null, converted));
    }
    static defaultView(data) {
        return data.type.unit === type_2.DateUnit.DAY ? new flat_2.DateDayView(data) : new flat_2.DateMillisecondView(data, 2);
    }
    constructor(data, view = DateVector.defaultView(data)) {
        super(data, view);
    }
    lows() {
        return this.type.unit === type_2.DateUnit.DAY ? this.asInt32(0, 1) : this.asInt32(0, 2);
    }
    highs() {
        return this.type.unit === type_2.DateUnit.DAY ? this.asInt32(0, 1) : this.asInt32(1, 2);
    }
    asEpochMilliseconds() {
        let data = this.data.clone(new type_5.Int32());
        switch (this.type.unit) {
            case type_2.DateUnit.DAY: return new IntVector(data, new flat_3.TimestampDayView(data, 1));
            case type_2.DateUnit.MILLISECOND: return new IntVector(data, new flat_3.TimestampMillisecondView(data, 2));
        }
        throw new TypeError(`Unrecognized date unit "${type_2.DateUnit[this.type.unit]}"`);
    }
    indexOf(search) {
        return this.asEpochMilliseconds().indexOf(search.valueOf());
    }
}
exports.DateVector = DateVector;
class DecimalVector extends FlatVector {
    constructor(data, view = new flat_1.FixedSizeView(data, 4)) {
        super(data, view);
    }
}
exports.DecimalVector = DecimalVector;
class TimeVector extends FlatVector {
    static defaultView(data) {
        return data.type.bitWidth <= 32 ? new flat_1.FlatView(data) : new flat_1.FixedSizeView(data, (data.type.bitWidth / 32) | 0);
    }
    constructor(data, view = TimeVector.defaultView(data)) {
        super(data, view);
    }
    lows() {
        return this.type.bitWidth <= 32 ? this.asInt32(0, 1) : this.asInt32(0, 2);
    }
    highs() {
        return this.type.bitWidth <= 32 ? this.asInt32(0, 1) : this.asInt32(1, 2);
    }
}
exports.TimeVector = TimeVector;
class TimestampVector extends FlatVector {
    constructor(data, view = new flat_1.FixedSizeView(data, 2)) {
        super(data, view);
    }
    asEpochMilliseconds() {
        let data = this.data.clone(new type_5.Int32());
        switch (this.type.unit) {
            case type_1.TimeUnit.SECOND: return new IntVector(data, new flat_3.TimestampSecondView(data, 1));
            case type_1.TimeUnit.MILLISECOND: return new IntVector(data, new flat_3.TimestampMillisecondView(data, 2));
            case type_1.TimeUnit.MICROSECOND: return new IntVector(data, new flat_3.TimestampMicrosecondView(data, 2));
            case type_1.TimeUnit.NANOSECOND: return new IntVector(data, new flat_3.TimestampNanosecondView(data, 2));
        }
        throw new TypeError(`Unrecognized time unit "${type_1.TimeUnit[this.type.unit]}"`);
    }
}
exports.TimestampVector = TimestampVector;
class IntervalVector extends FlatVector {
    static defaultView(data) {
        return data.type.unit === type_2.IntervalUnit.YEAR_MONTH ? new flat_2.IntervalYearMonthView(data) : new flat_1.FixedSizeView(data, 2);
    }
    constructor(data, view = IntervalVector.defaultView(data)) {
        super(data, view);
    }
    lows() {
        return this.type.unit === type_2.IntervalUnit.YEAR_MONTH ? this.asInt32(0, 1) : this.asInt32(0, 2);
    }
    highs() {
        return this.type.unit === type_2.IntervalUnit.YEAR_MONTH ? this.asInt32(0, 1) : this.asInt32(1, 2);
    }
}
exports.IntervalVector = IntervalVector;
class BinaryVector extends ListVectorBase {
    constructor(data, view = new list_1.BinaryView(data)) {
        super(data, view);
    }
    asUtf8() {
        return new Utf8Vector(this.data.clone(new type_3.Utf8()));
    }
}
exports.BinaryVector = BinaryVector;
class FixedSizeBinaryVector extends FlatVector {
    constructor(data, view = new flat_1.FixedSizeView(data, data.type.byteWidth)) {
        super(data, view);
    }
}
exports.FixedSizeBinaryVector = FixedSizeBinaryVector;
class Utf8Vector extends ListVectorBase {
    constructor(data, view = new list_1.Utf8View(data)) {
        super(data, view);
    }
    asBinary() {
        return new BinaryVector(this.data.clone(new type_3.Binary()));
    }
}
exports.Utf8Vector = Utf8Vector;
class ListVector extends ListVectorBase {
    constructor(data, view = new list_1.ListView(data)) {
        super(data, view);
    }
    getChildAt(index) {
        return this.view.getChildAt(index);
    }
}
exports.ListVector = ListVector;
class FixedSizeListVector extends Vector {
    constructor(data, view = new list_1.FixedSizeListView(data)) {
        super(data, view);
    }
    getChildAt(index) {
        return this.view.getChildAt(index);
    }
}
exports.FixedSizeListVector = FixedSizeListVector;
class MapVector extends NestedVector {
    constructor(data, view = new nested_1.MapView(data)) {
        super(data, view);
    }
    asStruct() {
        return new StructVector(this.data.clone(new type_6.Struct(this.type.children)));
    }
}
exports.MapVector = MapVector;
class StructVector extends NestedVector {
    constructor(data, view = new nested_1.StructView(data)) {
        super(data, view);
    }
    asMap(keysSorted = false) {
        return new MapVector(this.data.clone(new type_6.Map_(keysSorted, this.type.children)));
    }
}
exports.StructVector = StructVector;
class UnionVector extends NestedVector {
    constructor(data, view = (data.type.mode === type_2.UnionMode.Sparse ? new nested_1.UnionView(data) : new nested_1.DenseUnionView(data))) {
        super(data, view);
    }
}
exports.UnionVector = UnionVector;
class DictionaryVector extends Vector {
    constructor(data, view = new dictionary_1.DictionaryView(data.dictionary, new IntVector(data.indices))) {
        super(data, view);
        if (view instanceof validity_1.ValidityView) {
            view = view.view;
        }
        if (data instanceof data_1.DictionaryData && view instanceof dictionary_1.DictionaryView) {
            this.indices = view.indices;
            this.dictionary = data.dictionary;
        }
        else if (data instanceof data_1.ChunkedData && view instanceof chunked_1.ChunkedView) {
            const chunks = view.chunkVectors;
            // Assume the last chunk's dictionary data is the most up-to-date,
            // including data from DictionaryBatches that were marked as deltas
            this.dictionary = chunks[chunks.length - 1].dictionary;
            this.indices = chunks.reduce((idxs, dict) => !idxs ? dict.indices : idxs.concat(dict.indices), null);
        }
        else {
            throw new TypeError(`Unrecognized DictionaryVector view`);
        }
    }
    getKey(index) { return this.indices.get(index); }
    getValue(key) { return this.dictionary.get(key); }
    reverseLookup(value) { return this.dictionary.indexOf(value); }
}
exports.DictionaryVector = DictionaryVector;
exports.createVector = ((VectorLoader) => ((data) => visitor_1.TypeVisitor.visitTypeInline(new VectorLoader(data), data.type)))(class VectorLoader extends visitor_1.TypeVisitor {
    constructor(data) {
        super();
        this.data = data;
    }
    visitNull(_type) { return new NullVector(this.data); }
    visitInt(_type) { return new IntVector(this.data); }
    visitFloat(_type) { return new FloatVector(this.data); }
    visitBinary(_type) { return new BinaryVector(this.data); }
    visitUtf8(_type) { return new Utf8Vector(this.data); }
    visitBool(_type) { return new BoolVector(this.data); }
    visitDecimal(_type) { return new DecimalVector(this.data); }
    visitDate(_type) { return new DateVector(this.data); }
    visitTime(_type) { return new TimeVector(this.data); }
    visitTimestamp(_type) { return new TimestampVector(this.data); }
    visitInterval(_type) { return new IntervalVector(this.data); }
    visitList(_type) { return new ListVector(this.data); }
    visitStruct(_type) { return new StructVector(this.data); }
    visitUnion(_type) { return new UnionVector(this.data); }
    visitFixedSizeBinary(_type) { return new FixedSizeBinaryVector(this.data); }
    visitFixedSizeList(_type) { return new FixedSizeListVector(this.data); }
    visitMap(_type) { return new MapVector(this.data); }
    visitDictionary(_type) { return new DictionaryVector(this.data); }
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LENBQUMsQ0FBQyxDQUFZLENBQUM7SUFDbkcsV0FBVyxDQUFVLEtBQWEsSUFBYSxPQUFPLElBQUksWUFBWSxDQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFVLENBQUM7SUFDbkcsVUFBVSxDQUFXLEtBQVksSUFBYyxPQUFPLElBQUksV0FBVyxDQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFXLENBQUM7SUFDbkcsb0JBQW9CLENBQUMsS0FBc0IsSUFBSSxPQUFPLElBQUkscUJBQXFCLENBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuRyxrQkFBa0IsQ0FBRyxLQUFvQixJQUFNLE9BQU8sSUFBSSxtQkFBbUIsQ0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBRyxDQUFDO0lBQ25HLFFBQVEsQ0FBYSxLQUFXLElBQWUsT0FBTyxJQUFJLFNBQVMsQ0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBYSxDQUFDO0lBQ25HLGVBQWUsQ0FBTSxLQUFpQixJQUFTLE9BQU8sSUFBSSxnQkFBZ0IsQ0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBTSxDQUFDO0NBQ3RHLENBQUMsQ0FBQyIsImZpbGUiOiJ2ZWN0b3IuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgRGF0YSwgQ2h1bmtlZERhdGEsIEZsYXREYXRhLCBCb29sRGF0YSwgRmxhdExpc3REYXRhLCBOZXN0ZWREYXRhLCBEaWN0aW9uYXJ5RGF0YSB9IGZyb20gJy4vZGF0YSc7XG5pbXBvcnQgeyBWaXNpdG9yTm9kZSwgVHlwZVZpc2l0b3IsIFZlY3RvclZpc2l0b3IgfSBmcm9tICcuL3Zpc2l0b3InO1xuaW1wb3J0IHsgRGF0YVR5cGUsIExpc3RUeXBlLCBGbGF0VHlwZSwgTmVzdGVkVHlwZSwgRmxhdExpc3RUeXBlLCBUaW1lVW5pdCB9IGZyb20gJy4vdHlwZSc7XG5pbXBvcnQgeyBJdGVyYWJsZUFycmF5TGlrZSwgUHJlY2lzaW9uLCBEYXRlVW5pdCwgSW50ZXJ2YWxVbml0LCBVbmlvbk1vZGUgfSBmcm9tICcuL3R5cGUnO1xuaW1wb3J0ICogYXMgSW50VXRpbCBmcm9tICcuL3V0aWwvaW50JztcblxuZXhwb3J0IGludGVyZmFjZSBWZWN0b3JMaWtlIHsgbGVuZ3RoOiBudW1iZXI7IG51bGxDb3VudDogbnVtYmVyOyB9XG5cbmV4cG9ydCBpbnRlcmZhY2UgVmlldzxUIGV4dGVuZHMgRGF0YVR5cGU+IHtcbiAgICBjbG9uZShkYXRhOiBEYXRhPFQ+KTogdGhpcztcbiAgICBpc1ZhbGlkKGluZGV4OiBudW1iZXIpOiBib29sZWFuO1xuICAgIGdldChpbmRleDogbnVtYmVyKTogVFsnVFZhbHVlJ10gfCBudWxsO1xuICAgIHNldChpbmRleDogbnVtYmVyLCB2YWx1ZTogVFsnVFZhbHVlJ10pOiB2b2lkO1xuICAgIHRvQXJyYXkoKTogSXRlcmFibGVBcnJheUxpa2U8VFsnVFZhbHVlJ10gfCBudWxsPjtcbiAgICBpbmRleE9mKHNlYXJjaDogVFsnVFZhbHVlJ10pOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxUWydUVmFsdWUnXSB8IG51bGw+O1xufVxuXG5leHBvcnQgY2xhc3MgVmVjdG9yPFQgZXh0ZW5kcyBEYXRhVHlwZSA9IGFueT4gaW1wbGVtZW50cyBWZWN0b3JMaWtlLCBWaWV3PFQ+LCBWaXNpdG9yTm9kZSB7XG4gICAgcHVibGljIHN0YXRpYyBjcmVhdGU8VCBleHRlbmRzIERhdGFUeXBlPihkYXRhOiBEYXRhPFQ+KTogVmVjdG9yPFQ+IHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVZlY3RvcihkYXRhKTtcbiAgICB9XG4gICAgcHVibGljIHN0YXRpYyBjb25jYXQ8VCBleHRlbmRzIERhdGFUeXBlPihzb3VyY2U/OiBWZWN0b3I8VD4gfCBudWxsLCAuLi5vdGhlcnM6IFZlY3RvcjxUPltdKTogVmVjdG9yPFQ+IHtcbiAgICAgICAgcmV0dXJuIG90aGVycy5yZWR1Y2UoKGEsIGIpID0+IGEgPyBhLmNvbmNhdChiKSA6IGIsIHNvdXJjZSEpO1xuICAgIH1cbiAgICBwdWJsaWMgdHlwZTogVDtcbiAgICBwdWJsaWMgbGVuZ3RoOiBudW1iZXI7XG4gICAgcHVibGljIHJlYWRvbmx5IGRhdGE6IERhdGE8VD47XG4gICAgcHVibGljIHJlYWRvbmx5IHZpZXc6IFZpZXc8VD47XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxUPiwgdmlldzogVmlldzxUPikge1xuICAgICAgICB0aGlzLmRhdGEgPSBkYXRhO1xuICAgICAgICB0aGlzLnR5cGUgPSBkYXRhLnR5cGU7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gZGF0YS5sZW5ndGg7XG4gICAgICAgIGxldCBudWxsczogVWludDhBcnJheTtcbiAgICAgICAgaWYgKCg8YW55PiBkYXRhIGluc3RhbmNlb2YgQ2h1bmtlZERhdGEpICYmICEodmlldyBpbnN0YW5jZW9mIENodW5rZWRWaWV3KSkge1xuICAgICAgICAgICAgdGhpcy52aWV3ID0gbmV3IENodW5rZWRWaWV3KGRhdGEgYXMgYW55KSBhcyBhbnk7XG4gICAgICAgIH0gZWxzZSBpZiAoISh2aWV3IGluc3RhbmNlb2YgVmFsaWRpdHlWaWV3KSAmJiAobnVsbHMgPSBkYXRhLm51bGxCaXRtYXAhKSAmJiBudWxscy5sZW5ndGggPiAwICYmIGRhdGEubnVsbENvdW50ID4gMCkge1xuICAgICAgICAgICAgdGhpcy52aWV3ID0gbmV3IFZhbGlkaXR5VmlldyhkYXRhLCB2aWV3KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMudmlldyA9IHZpZXc7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0IG51bGxDb3VudCgpIHsgcmV0dXJuIHRoaXMuZGF0YS5udWxsQ291bnQ7IH1cbiAgICBwdWJsaWMgZ2V0IG51bGxCaXRtYXAoKSB7IHJldHVybiB0aGlzLmRhdGEubnVsbEJpdG1hcDsgfVxuICAgIHB1YmxpYyBnZXQgW1N5bWJvbC50b1N0cmluZ1RhZ10oKSB7XG4gICAgICAgIHJldHVybiBgVmVjdG9yPCR7dGhpcy50eXBlW1N5bWJvbC50b1N0cmluZ1RhZ119PmA7XG4gICAgfVxuICAgIHB1YmxpYyB0b0pTT04oKTogYW55IHsgcmV0dXJuIHRoaXMudG9BcnJheSgpOyB9XG4gICAgcHVibGljIGNsb25lPFIgZXh0ZW5kcyBUPihkYXRhOiBEYXRhPFI+LCB2aWV3OiBWaWV3PFI+ID0gdGhpcy52aWV3LmNsb25lKGRhdGEpIGFzIGFueSk6IHRoaXMge1xuICAgICAgICByZXR1cm4gbmV3ICh0aGlzLmNvbnN0cnVjdG9yIGFzIGFueSkoZGF0YSwgdmlldyk7XG4gICAgfVxuICAgIHB1YmxpYyBpc1ZhbGlkKGluZGV4OiBudW1iZXIpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmlldy5pc1ZhbGlkKGluZGV4KTtcbiAgICB9XG4gICAgcHVibGljIGdldChpbmRleDogbnVtYmVyKTogVFsnVFZhbHVlJ10gfCBudWxsIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmlldy5nZXQoaW5kZXgpO1xuICAgIH1cbiAgICBwdWJsaWMgc2V0KGluZGV4OiBudW1iZXIsIHZhbHVlOiBUWydUVmFsdWUnXSk6IHZvaWQge1xuICAgICAgICByZXR1cm4gdGhpcy52aWV3LnNldChpbmRleCwgdmFsdWUpO1xuICAgIH1cbiAgICBwdWJsaWMgdG9BcnJheSgpOiBJdGVyYWJsZUFycmF5TGlrZTxUWydUVmFsdWUnXSB8IG51bGw+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmlldy50b0FycmF5KCk7XG4gICAgfVxuICAgIHB1YmxpYyBpbmRleE9mKHZhbHVlOiBUWydUVmFsdWUnXSkge1xuICAgICAgICByZXR1cm4gdGhpcy52aWV3LmluZGV4T2YodmFsdWUpO1xuICAgIH1cbiAgICBwdWJsaWMgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxUWydUVmFsdWUnXSB8IG51bGw+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmlld1tTeW1ib2wuaXRlcmF0b3JdKCk7XG4gICAgfVxuICAgIHB1YmxpYyBjb25jYXQoLi4ub3RoZXJzOiBWZWN0b3I8VD5bXSk6IHRoaXMge1xuICAgICAgICBpZiAoKG90aGVycyA9IG90aGVycy5maWx0ZXIoQm9vbGVhbikpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgeyB2aWV3IH0gPSB0aGlzO1xuICAgICAgICBjb25zdCB2ZWNzID0gISh2aWV3IGluc3RhbmNlb2YgQ2h1bmtlZFZpZXcpXG4gICAgICAgICAgICA/IFt0aGlzLCAuLi5vdGhlcnNdXG4gICAgICAgICAgICA6IFsuLi52aWV3LmNodW5rVmVjdG9ycywgLi4ub3RoZXJzXTtcbiAgICAgICAgY29uc3Qgb2Zmc2V0cyA9IENodW5rZWREYXRhLmNvbXB1dGVPZmZzZXRzKHZlY3MpO1xuICAgICAgICBjb25zdCBjaHVua3NMZW5ndGggPSBvZmZzZXRzW29mZnNldHMubGVuZ3RoIC0gMV07XG4gICAgICAgIGNvbnN0IGNodW5rZWREYXRhID0gbmV3IENodW5rZWREYXRhKHRoaXMudHlwZSwgY2h1bmtzTGVuZ3RoLCB2ZWNzLCAwLCAtMSwgb2Zmc2V0cyk7XG4gICAgICAgIHJldHVybiB0aGlzLmNsb25lKGNodW5rZWREYXRhLCBuZXcgQ2h1bmtlZFZpZXcoY2h1bmtlZERhdGEpKSBhcyB0aGlzO1xuICAgIH1cbiAgICBwdWJsaWMgc2xpY2UoYmVnaW4/OiBudW1iZXIsIGVuZD86IG51bWJlcik6IHRoaXMge1xuICAgICAgICBsZXQgeyBsZW5ndGggfSA9IHRoaXM7XG4gICAgICAgIGxldCBzaXplID0gKHRoaXMudmlldyBhcyBhbnkpLnNpemUgfHwgMTtcbiAgICAgICAgbGV0IHRvdGFsID0gbGVuZ3RoLCBmcm9tID0gKGJlZ2luIHx8IDApICogc2l6ZTtcbiAgICAgICAgbGV0IHRvID0gKHR5cGVvZiBlbmQgPT09ICdudW1iZXInID8gZW5kIDogdG90YWwpICogc2l6ZTtcbiAgICAgICAgaWYgKHRvIDwgMCkgeyB0byA9IHRvdGFsIC0gKHRvICogLTEpICUgdG90YWw7IH1cbiAgICAgICAgaWYgKGZyb20gPCAwKSB7IGZyb20gPSB0b3RhbCAtIChmcm9tICogLTEpICUgdG90YWw7IH1cbiAgICAgICAgaWYgKHRvIDwgZnJvbSkgeyBbZnJvbSwgdG9dID0gW3RvLCBmcm9tXTsgfVxuICAgICAgICB0b3RhbCA9ICFpc0Zpbml0ZSh0b3RhbCA9ICh0byAtIGZyb20pKSB8fCB0b3RhbCA8IDAgPyAwIDogdG90YWw7XG4gICAgICAgIGNvbnN0IHNsaWNlZERhdGEgPSB0aGlzLmRhdGEuc2xpY2UoZnJvbSwgTWF0aC5taW4odG90YWwsIGxlbmd0aCkpO1xuICAgICAgICByZXR1cm4gdGhpcy5jbG9uZShzbGljZWREYXRhLCB0aGlzLnZpZXcuY2xvbmUoc2xpY2VkRGF0YSkpIGFzIHRoaXM7XG4gICAgfVxuXG4gICAgcHVibGljIGFjY2VwdFR5cGVWaXNpdG9yKHZpc2l0b3I6IFR5cGVWaXNpdG9yKTogYW55IHtcbiAgICAgICAgcmV0dXJuIFR5cGVWaXNpdG9yLnZpc2l0VHlwZUlubGluZSh2aXNpdG9yLCB0aGlzLnR5cGUpO1xuICAgIH1cbiAgICBwdWJsaWMgYWNjZXB0VmVjdG9yVmlzaXRvcih2aXNpdG9yOiBWZWN0b3JWaXNpdG9yKTogYW55IHtcbiAgICAgICAgcmV0dXJuIFZlY3RvclZpc2l0b3IudmlzaXRUeXBlSW5saW5lKHZpc2l0b3IsIHRoaXMudHlwZSwgdGhpcyk7XG4gICAgfVxufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgRmxhdFZlY3RvcjxUIGV4dGVuZHMgRmxhdFR5cGU+IGV4dGVuZHMgVmVjdG9yPFQ+IHtcbiAgICBwdWJsaWMgZ2V0IHZhbHVlcygpIHsgcmV0dXJuIHRoaXMuZGF0YS52YWx1ZXM7IH1cbiAgICBwdWJsaWMgbG93cygpOiBJbnRWZWN0b3I8SW50MzI+IHsgcmV0dXJuIHRoaXMuYXNJbnQzMigwLCAyKTsgfVxuICAgIHB1YmxpYyBoaWdocygpOiBJbnRWZWN0b3I8SW50MzI+IHsgcmV0dXJuIHRoaXMuYXNJbnQzMigxLCAyKTsgfVxuICAgIHB1YmxpYyBhc0ludDMyKG9mZnNldDogbnVtYmVyID0gMCwgc3RyaWRlOiBudW1iZXIgPSAyKTogSW50VmVjdG9yPEludDMyPiB7XG4gICAgICAgIGxldCBkYXRhID0gKHRoaXMuZGF0YSBhcyBGbGF0RGF0YTxhbnk+KS5jbG9uZShuZXcgSW50MzIoKSk7XG4gICAgICAgIGlmIChvZmZzZXQgPiAwKSB7XG4gICAgICAgICAgICBkYXRhID0gZGF0YS5zbGljZShvZmZzZXQsIHRoaXMubGVuZ3RoIC0gb2Zmc2V0KTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBpbnQzMnMgPSBuZXcgSW50VmVjdG9yKGRhdGEsIG5ldyBQcmltaXRpdmVWaWV3KGRhdGEsIHN0cmlkZSkpO1xuICAgICAgICBpbnQzMnMubGVuZ3RoID0gdGhpcy5sZW5ndGggLyBzdHJpZGUgfCAwO1xuICAgICAgICByZXR1cm4gaW50MzJzO1xuICAgIH1cbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIExpc3RWZWN0b3JCYXNlPFQgZXh0ZW5kcyAoTGlzdFR5cGUgfCBGbGF0TGlzdFR5cGUpPiBleHRlbmRzIFZlY3RvcjxUPiB7XG4gICAgcHVibGljIGdldCB2YWx1ZXMoKSB7IHJldHVybiB0aGlzLmRhdGEudmFsdWVzOyB9XG4gICAgcHVibGljIGdldCB2YWx1ZU9mZnNldHMoKSB7IHJldHVybiB0aGlzLmRhdGEudmFsdWVPZmZzZXRzOyB9XG4gICAgcHVibGljIGdldFZhbHVlT2Zmc2V0KGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVPZmZzZXRzW2luZGV4XTtcbiAgICB9XG4gICAgcHVibGljIGdldFZhbHVlTGVuZ3RoKGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVPZmZzZXRzW2luZGV4ICsgMV0gLSB0aGlzLnZhbHVlT2Zmc2V0c1tpbmRleF07XG4gICAgfVxufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTmVzdGVkVmVjdG9yPFQgZXh0ZW5kcyBOZXN0ZWRUeXBlPiBleHRlbmRzIFZlY3RvcjxUPiAge1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgcmVhZG9ubHkgdmlldzogTmVzdGVkVmlldzxUPjtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHJvdGVjdGVkIF9jaGlsZERhdGE6IERhdGE8YW55PltdO1xuICAgIHB1YmxpYyBnZXRDaGlsZEF0PFIgZXh0ZW5kcyBEYXRhVHlwZSA9IERhdGFUeXBlPihpbmRleDogbnVtYmVyKTogVmVjdG9yPFI+IHwgbnVsbCB7XG4gICAgICAgIHJldHVybiB0aGlzLnZpZXcuZ2V0Q2hpbGRBdDxSPihpbmRleCk7XG4gICAgfVxuICAgIHB1YmxpYyBnZXQgY2hpbGREYXRhKCk6IERhdGE8YW55PltdIHtcbiAgICAgICAgbGV0IGRhdGE6IERhdGE8VD4gfCBEYXRhPGFueT5bXTtcbiAgICAgICAgaWYgKChkYXRhID0gdGhpcy5fY2hpbGREYXRhKSkge1xuICAgICAgICAgICAgLy8gUmV0dXJuIHRoZSBjYWNoZWQgY2hpbGREYXRhIHJlZmVyZW5jZSBmaXJzdFxuICAgICAgICAgICAgcmV0dXJuIGRhdGEgYXMgRGF0YTxhbnk+W107XG4gICAgICAgIH0gZWxzZSBpZiAoISg8YW55PiAoZGF0YSA9IHRoaXMuZGF0YSkgaW5zdGFuY2VvZiBDaHVua2VkRGF0YSkpIHtcbiAgICAgICAgICAgIC8vIElmIGRhdGEgaXNuJ3QgY2h1bmtlZCwgY2FjaGUgYW5kIHJldHVybiBOZXN0ZWREYXRhJ3MgY2hpbGREYXRhXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY2hpbGREYXRhID0gZGF0YS5jaGlsZERhdGE7XG4gICAgICAgIH1cbiAgICAgICAgLy8gT3RoZXJ3aXNlIGlmIHRoZSBkYXRhIGlzIGNodW5rZWQsIGNvbmNhdGVuYXRlIHRoZSBjaGlsZFZlY3RvcnMgZnJvbSBlYWNoIGNodW5rXG4gICAgICAgIC8vIHRvIGNvbnN0cnVjdCBhIHNpbmdsZSBjaHVua2VkIFZlY3RvciBmb3IgZWFjaCBjb2x1bW4uIFRoZW4gcmV0dXJuIHRoZSBDaHVua2VkRGF0YVxuICAgICAgICAvLyBpbnN0YW5jZSBmcm9tIGVhY2ggdW5pZmllZCBjaHVua2VkIGNvbHVtbiBhcyB0aGUgY2hpbGREYXRhIG9mIGEgY2h1bmtlZCBOZXN0ZWRWZWN0b3JcbiAgICAgICAgY29uc3QgY2h1bmtzID0gKChkYXRhIGFzIGFueSBhcyBDaHVua2VkRGF0YTxUPikuY2h1bmtWZWN0b3JzIGFzIE5lc3RlZFZlY3RvcjxUPltdKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NoaWxkRGF0YSA9IGNodW5rc1xuICAgICAgICAgICAgLnJlZHVjZTwoVmVjdG9yPFQ+IHwgbnVsbClbXVtdPigoY29scywgY2h1bmspID0+IGNodW5rLmNoaWxkRGF0YVxuICAgICAgICAgICAgLnJlZHVjZTwoVmVjdG9yPFQ+IHwgbnVsbClbXVtdPigoY29scywgXywgaSkgPT4gKFxuICAgICAgICAgICAgICAgIChjb2xzW2ldIHx8IChjb2xzW2ldID0gW10pKS5wdXNoKGNodW5rLmdldENoaWxkQXQoaSkpXG4gICAgICAgICAgICApICYmIGNvbHMgfHwgY29scywgY29scyksIFtdIGFzIFZlY3RvcjxUPltdW10pXG4gICAgICAgIC5tYXAoKHZlY3MpID0+IFZlY3Rvci5jb25jYXQ8VD4oLi4udmVjcykuZGF0YSk7XG4gICAgfVxufVxuXG5pbXBvcnQgeyBMaXN0LCBCaW5hcnksIFV0ZjgsIEJvb2wsIH0gZnJvbSAnLi90eXBlJztcbmltcG9ydCB7IE51bGwsIEludCwgRmxvYXQsIERlY2ltYWwsIERhdGVfLCBUaW1lLCBUaW1lc3RhbXAsIEludGVydmFsIH0gZnJvbSAnLi90eXBlJztcbmltcG9ydCB7IFVpbnQ4LCBVaW50MTYsIFVpbnQzMiwgVWludDY0LCBJbnQ4LCBJbnQxNiwgSW50MzIsIEludDY0LCBGbG9hdDE2LCBGbG9hdDMyLCBGbG9hdDY0IH0gZnJvbSAnLi90eXBlJztcbmltcG9ydCB7IFN0cnVjdCwgVW5pb24sIFNwYXJzZVVuaW9uLCBEZW5zZVVuaW9uLCBGaXhlZFNpemVCaW5hcnksIEZpeGVkU2l6ZUxpc3QsIE1hcF8sIERpY3Rpb25hcnkgfSBmcm9tICcuL3R5cGUnO1xuXG5pbXBvcnQgeyBDaHVua2VkVmlldyB9IGZyb20gJy4vdmVjdG9yL2NodW5rZWQnO1xuaW1wb3J0IHsgVmFsaWRpdHlWaWV3IH0gZnJvbSAnLi92ZWN0b3IvdmFsaWRpdHknO1xuaW1wb3J0IHsgRGljdGlvbmFyeVZpZXcgfSBmcm9tICcuL3ZlY3Rvci9kaWN0aW9uYXJ5JztcbmltcG9ydCB7IExpc3RWaWV3LCBGaXhlZFNpemVMaXN0VmlldywgQmluYXJ5VmlldywgVXRmOFZpZXcgfSBmcm9tICcuL3ZlY3Rvci9saXN0JztcbmltcG9ydCB7IFVuaW9uVmlldywgRGVuc2VVbmlvblZpZXcsIE5lc3RlZFZpZXcsIFN0cnVjdFZpZXcsIE1hcFZpZXcgfSBmcm9tICcuL3ZlY3Rvci9uZXN0ZWQnO1xuaW1wb3J0IHsgRmxhdFZpZXcsIE51bGxWaWV3LCBCb29sVmlldywgUHJpbWl0aXZlVmlldywgRml4ZWRTaXplVmlldywgRmxvYXQxNlZpZXcgfSBmcm9tICcuL3ZlY3Rvci9mbGF0JztcbmltcG9ydCB7IERhdGVEYXlWaWV3LCBEYXRlTWlsbGlzZWNvbmRWaWV3LCBJbnRlcnZhbFllYXJNb250aFZpZXcgfSBmcm9tICcuL3ZlY3Rvci9mbGF0JztcbmltcG9ydCB7IFRpbWVzdGFtcERheVZpZXcsIFRpbWVzdGFtcFNlY29uZFZpZXcsIFRpbWVzdGFtcE1pbGxpc2Vjb25kVmlldywgVGltZXN0YW1wTWljcm9zZWNvbmRWaWV3LCBUaW1lc3RhbXBOYW5vc2Vjb25kVmlldyB9IGZyb20gJy4vdmVjdG9yL2ZsYXQnO1xuaW1wb3J0IHsgcGFja0Jvb2xzIH0gZnJvbSAnLi91dGlsL2JpdCc7XG5cbmV4cG9ydCBjbGFzcyBOdWxsVmVjdG9yIGV4dGVuZHMgVmVjdG9yPE51bGw+IHtcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPE51bGw+LCB2aWV3OiBWaWV3PE51bGw+ID0gbmV3IE51bGxWaWV3KGRhdGEpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEJvb2xWZWN0b3IgZXh0ZW5kcyBWZWN0b3I8Qm9vbD4ge1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbShkYXRhOiBJdGVyYWJsZUFycmF5TGlrZTxib29sZWFuPikge1xuICAgICAgICByZXR1cm4gbmV3IEJvb2xWZWN0b3IobmV3IEJvb2xEYXRhKG5ldyBCb29sKCksIGRhdGEubGVuZ3RoLCBudWxsLCBwYWNrQm9vbHMoZGF0YSkpIGFzIERhdGE8Qm9vbD4pO1xuICAgIH1cbiAgICBwdWJsaWMgZ2V0IHZhbHVlcygpIHsgcmV0dXJuIHRoaXMuZGF0YS52YWx1ZXM7IH1cbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPEJvb2w+LCB2aWV3OiBWaWV3PEJvb2w+ID0gbmV3IEJvb2xWaWV3KGRhdGEpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEludFZlY3RvcjxUIGV4dGVuZHMgSW50ID0gSW50PGFueT4+IGV4dGVuZHMgRmxhdFZlY3RvcjxUPiB7XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGRhdGE6IEludDhBcnJheSk6IEludFZlY3RvcjxJbnQ4PjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb20oZGF0YTogSW50MTZBcnJheSk6IEludFZlY3RvcjxJbnQxNj47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGRhdGE6IEludDMyQXJyYXkpOiBJbnRWZWN0b3I8SW50MzI+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbShkYXRhOiBVaW50OEFycmF5KTogSW50VmVjdG9yPFVpbnQ4PjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb20oZGF0YTogVWludDE2QXJyYXkpOiBJbnRWZWN0b3I8VWludDE2PjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb20oZGF0YTogVWludDMyQXJyYXkpOiBJbnRWZWN0b3I8VWludDMyPjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb20oZGF0YTogSW50MzJBcnJheSwgaXM2NDogdHJ1ZSk6IEludFZlY3RvcjxJbnQ2ND47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGRhdGE6IFVpbnQzMkFycmF5LCBpczY0OiB0cnVlKTogSW50VmVjdG9yPFVpbnQ2ND47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGRhdGE6IGFueSwgaXM2ND86IGJvb2xlYW4pIHtcbiAgICAgICAgaWYgKGlzNjQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIHJldHVybiBkYXRhIGluc3RhbmNlb2YgSW50MzJBcnJheVxuICAgICAgICAgICAgICAgID8gbmV3IEludFZlY3RvcihuZXcgRmxhdERhdGEobmV3IEludDY0KCksIGRhdGEubGVuZ3RoLCBudWxsLCBkYXRhKSlcbiAgICAgICAgICAgICAgICA6IG5ldyBJbnRWZWN0b3IobmV3IEZsYXREYXRhKG5ldyBVaW50NjQoKSwgZGF0YS5sZW5ndGgsIG51bGwsIGRhdGEpKTtcbiAgICAgICAgfVxuICAgICAgICBzd2l0Y2ggKGRhdGEuY29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgIGNhc2UgSW50OEFycmF5OiByZXR1cm4gbmV3IEludFZlY3RvcihuZXcgRmxhdERhdGEobmV3IEludDgoKSwgZGF0YS5sZW5ndGgsIG51bGwsIGRhdGEpKTtcbiAgICAgICAgICAgIGNhc2UgSW50MTZBcnJheTogcmV0dXJuIG5ldyBJbnRWZWN0b3IobmV3IEZsYXREYXRhKG5ldyBJbnQxNigpLCBkYXRhLmxlbmd0aCwgbnVsbCwgZGF0YSkpO1xuICAgICAgICAgICAgY2FzZSBJbnQzMkFycmF5OiByZXR1cm4gbmV3IEludFZlY3RvcihuZXcgRmxhdERhdGEobmV3IEludDMyKCksIGRhdGEubGVuZ3RoLCBudWxsLCBkYXRhKSk7XG4gICAgICAgICAgICBjYXNlIFVpbnQ4QXJyYXk6IHJldHVybiBuZXcgSW50VmVjdG9yKG5ldyBGbGF0RGF0YShuZXcgVWludDgoKSwgZGF0YS5sZW5ndGgsIG51bGwsIGRhdGEpKTtcbiAgICAgICAgICAgIGNhc2UgVWludDE2QXJyYXk6IHJldHVybiBuZXcgSW50VmVjdG9yKG5ldyBGbGF0RGF0YShuZXcgVWludDE2KCksIGRhdGEubGVuZ3RoLCBudWxsLCBkYXRhKSk7XG4gICAgICAgICAgICBjYXNlIFVpbnQzMkFycmF5OiByZXR1cm4gbmV3IEludFZlY3RvcihuZXcgRmxhdERhdGEobmV3IFVpbnQzMigpLCBkYXRhLmxlbmd0aCwgbnVsbCwgZGF0YSkpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1VucmVjb2duaXplZCBJbnQgZGF0YScpO1xuICAgIH1cbiAgICBzdGF0aWMgZGVmYXVsdFZpZXc8VCBleHRlbmRzIEludD4oZGF0YTogRGF0YTxUPikge1xuICAgICAgICByZXR1cm4gZGF0YS50eXBlLmJpdFdpZHRoIDw9IDMyID8gbmV3IEZsYXRWaWV3KGRhdGEpIDogbmV3IEZpeGVkU2l6ZVZpZXcoZGF0YSwgKGRhdGEudHlwZS5iaXRXaWR0aCAvIDMyKSB8IDApO1xuICAgIH1cbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPFQ+LCB2aWV3OiBWaWV3PFQ+ID0gSW50VmVjdG9yLmRlZmF1bHRWaWV3KGRhdGEpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEZsb2F0VmVjdG9yPFQgZXh0ZW5kcyBGbG9hdCA9IEZsb2F0PGFueT4+IGV4dGVuZHMgRmxhdFZlY3RvcjxUPiB7XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGRhdGE6IFVpbnQxNkFycmF5KTogRmxvYXRWZWN0b3I8RmxvYXQxNj47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGRhdGE6IEZsb2F0MzJBcnJheSk6IEZsb2F0VmVjdG9yPEZsb2F0MzI+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbShkYXRhOiBGbG9hdDY0QXJyYXkpOiBGbG9hdFZlY3RvcjxGbG9hdDY0PjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb20oZGF0YTogYW55KSB7XG4gICAgICAgIHN3aXRjaCAoZGF0YS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgY2FzZSBVaW50MTZBcnJheTogcmV0dXJuIG5ldyBGbG9hdFZlY3RvcihuZXcgRmxhdERhdGEobmV3IEZsb2F0MTYoKSwgZGF0YS5sZW5ndGgsIG51bGwsIGRhdGEpKTtcbiAgICAgICAgICAgIGNhc2UgRmxvYXQzMkFycmF5OiByZXR1cm4gbmV3IEZsb2F0VmVjdG9yKG5ldyBGbGF0RGF0YShuZXcgRmxvYXQzMigpLCBkYXRhLmxlbmd0aCwgbnVsbCwgZGF0YSkpO1xuICAgICAgICAgICAgY2FzZSBGbG9hdDY0QXJyYXk6IHJldHVybiBuZXcgRmxvYXRWZWN0b3IobmV3IEZsYXREYXRhKG5ldyBGbG9hdDY0KCksIGRhdGEubGVuZ3RoLCBudWxsLCBkYXRhKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5yZWNvZ25pemVkIEZsb2F0IGRhdGEnKTtcbiAgICB9XG4gICAgc3RhdGljIGRlZmF1bHRWaWV3PFQgZXh0ZW5kcyBGbG9hdD4oZGF0YTogRGF0YTxUPik6IEZsYXRWaWV3PGFueT4ge1xuICAgICAgICByZXR1cm4gZGF0YS50eXBlLnByZWNpc2lvbiAhPT0gUHJlY2lzaW9uLkhBTEYgPyBuZXcgRmxhdFZpZXcoZGF0YSkgOiBuZXcgRmxvYXQxNlZpZXcoZGF0YSBhcyBEYXRhPEZsb2F0MTY+KTtcbiAgICB9XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxUPiwgdmlldzogVmlldzxUPiA9IEZsb2F0VmVjdG9yLmRlZmF1bHRWaWV3KGRhdGEpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIERhdGVWZWN0b3IgZXh0ZW5kcyBGbGF0VmVjdG9yPERhdGVfPiB7XG4gICAgc3RhdGljIGZyb20oZGF0YTogRGF0ZVtdLCB1bml0OiBEYXRlVW5pdCA9IERhdGVVbml0Lk1JTExJU0VDT05EKTogRGF0ZVZlY3RvciB7XG4gICAgICAgIGNvbnN0IHR5cGVfID0gbmV3IERhdGVfKHVuaXQpO1xuICAgICAgICBjb25zdCBjb252ZXJ0ZWQgPVxuICAgICAgICAgICAgdW5pdCA9PT0gRGF0ZVVuaXQuTUlMTElTRUNPTkQgP1xuICAgICAgICAgICAgSW50VXRpbC5JbnQ2NC5jb252ZXJ0QXJyYXkoZGF0YS5tYXAoKGQpID0+IGQudmFsdWVPZigpKSkgOlxuICAgICAgICAgICAgdW5pdCA9PT0gRGF0ZVVuaXQuREFZID9cbiAgICAgICAgICAgIEludDMyQXJyYXkuZnJvbShkYXRhLm1hcCgoZCkgPT4gZC52YWx1ZU9mKCkgLyA4NjQwMDAwMCkpIDpcbiAgICAgICAgICAgIHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKGNvbnZlcnRlZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBVbnJlY29nbml6ZWQgZGF0ZSB1bml0IFwiJHtEYXRlVW5pdFt1bml0XX1cImApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgRGF0ZVZlY3RvcihuZXcgRmxhdERhdGEodHlwZV8sIGRhdGEubGVuZ3RoLCBudWxsLCBjb252ZXJ0ZWQpKTtcbiAgICB9XG4gICAgc3RhdGljIGRlZmF1bHRWaWV3PFQgZXh0ZW5kcyBEYXRlXz4oZGF0YTogRGF0YTxUPikge1xuICAgICAgICByZXR1cm4gZGF0YS50eXBlLnVuaXQgPT09IERhdGVVbml0LkRBWSA/IG5ldyBEYXRlRGF5VmlldyhkYXRhKSA6IG5ldyBEYXRlTWlsbGlzZWNvbmRWaWV3KGRhdGEsIDIpO1xuICAgIH1cbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPERhdGVfPiwgdmlldzogVmlldzxEYXRlXz4gPSBEYXRlVmVjdG9yLmRlZmF1bHRWaWV3KGRhdGEpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbiAgICBwdWJsaWMgbG93cygpOiBJbnRWZWN0b3I8SW50MzI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMudHlwZS51bml0ID09PSBEYXRlVW5pdC5EQVkgPyB0aGlzLmFzSW50MzIoMCwgMSkgOiB0aGlzLmFzSW50MzIoMCwgMik7XG4gICAgfVxuICAgIHB1YmxpYyBoaWdocygpOiBJbnRWZWN0b3I8SW50MzI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMudHlwZS51bml0ID09PSBEYXRlVW5pdC5EQVkgPyB0aGlzLmFzSW50MzIoMCwgMSkgOiB0aGlzLmFzSW50MzIoMSwgMik7XG4gICAgfVxuICAgIHB1YmxpYyBhc0Vwb2NoTWlsbGlzZWNvbmRzKCk6IEludFZlY3RvcjxJbnQzMj4ge1xuICAgICAgICBsZXQgZGF0YSA9ICh0aGlzLmRhdGEgYXMgRmxhdERhdGE8YW55PikuY2xvbmUobmV3IEludDMyKCkpO1xuICAgICAgICBzd2l0Y2ggKHRoaXMudHlwZS51bml0KSB7XG4gICAgICAgICAgICBjYXNlIERhdGVVbml0LkRBWTogcmV0dXJuIG5ldyBJbnRWZWN0b3IoZGF0YSwgbmV3IFRpbWVzdGFtcERheVZpZXcoZGF0YSBhcyBhbnksIDEpIGFzIGFueSk7XG4gICAgICAgICAgICBjYXNlIERhdGVVbml0Lk1JTExJU0VDT05EOiByZXR1cm4gbmV3IEludFZlY3RvcihkYXRhLCBuZXcgVGltZXN0YW1wTWlsbGlzZWNvbmRWaWV3KGRhdGEgYXMgYW55LCAyKSBhcyBhbnkpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFVucmVjb2duaXplZCBkYXRlIHVuaXQgXCIke0RhdGVVbml0W3RoaXMudHlwZS51bml0XX1cImApO1xuICAgIH1cbiAgICBwdWJsaWMgaW5kZXhPZihzZWFyY2g6IERhdGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXNFcG9jaE1pbGxpc2Vjb25kcygpLmluZGV4T2Yoc2VhcmNoLnZhbHVlT2YoKSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgRGVjaW1hbFZlY3RvciBleHRlbmRzIEZsYXRWZWN0b3I8RGVjaW1hbD4ge1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8RGVjaW1hbD4sIHZpZXc6IFZpZXc8RGVjaW1hbD4gPSBuZXcgRml4ZWRTaXplVmlldyhkYXRhLCA0KSkge1xuICAgICAgICBzdXBlcihkYXRhLCB2aWV3KTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBUaW1lVmVjdG9yIGV4dGVuZHMgRmxhdFZlY3RvcjxUaW1lPiB7XG4gICAgc3RhdGljIGRlZmF1bHRWaWV3PFQgZXh0ZW5kcyBUaW1lPihkYXRhOiBEYXRhPFQ+KSB7XG4gICAgICAgIHJldHVybiBkYXRhLnR5cGUuYml0V2lkdGggPD0gMzIgPyBuZXcgRmxhdFZpZXcoZGF0YSkgOiBuZXcgRml4ZWRTaXplVmlldyhkYXRhLCAoZGF0YS50eXBlLmJpdFdpZHRoIC8gMzIpIHwgMCk7XG4gICAgfVxuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8VGltZT4sIHZpZXc6IFZpZXc8VGltZT4gPSBUaW1lVmVjdG9yLmRlZmF1bHRWaWV3KGRhdGEpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbiAgICBwdWJsaWMgbG93cygpOiBJbnRWZWN0b3I8SW50MzI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMudHlwZS5iaXRXaWR0aCA8PSAzMiA/IHRoaXMuYXNJbnQzMigwLCAxKSA6IHRoaXMuYXNJbnQzMigwLCAyKTtcbiAgICB9XG4gICAgcHVibGljIGhpZ2hzKCk6IEludFZlY3RvcjxJbnQzMj4ge1xuICAgICAgICByZXR1cm4gdGhpcy50eXBlLmJpdFdpZHRoIDw9IDMyID8gdGhpcy5hc0ludDMyKDAsIDEpIDogdGhpcy5hc0ludDMyKDEsIDIpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFRpbWVzdGFtcFZlY3RvciBleHRlbmRzIEZsYXRWZWN0b3I8VGltZXN0YW1wPiB7XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxUaW1lc3RhbXA+LCB2aWV3OiBWaWV3PFRpbWVzdGFtcD4gPSBuZXcgRml4ZWRTaXplVmlldyhkYXRhLCAyKSkge1xuICAgICAgICBzdXBlcihkYXRhLCB2aWV3KTtcbiAgICB9XG4gICAgcHVibGljIGFzRXBvY2hNaWxsaXNlY29uZHMoKTogSW50VmVjdG9yPEludDMyPiB7XG4gICAgICAgIGxldCBkYXRhID0gKHRoaXMuZGF0YSBhcyBGbGF0RGF0YTxhbnk+KS5jbG9uZShuZXcgSW50MzIoKSk7XG4gICAgICAgIHN3aXRjaCAodGhpcy50eXBlLnVuaXQpIHtcbiAgICAgICAgICAgIGNhc2UgVGltZVVuaXQuU0VDT05EOiByZXR1cm4gbmV3IEludFZlY3RvcihkYXRhLCBuZXcgVGltZXN0YW1wU2Vjb25kVmlldyhkYXRhIGFzIGFueSwgMSkgYXMgYW55KTtcbiAgICAgICAgICAgIGNhc2UgVGltZVVuaXQuTUlMTElTRUNPTkQ6IHJldHVybiBuZXcgSW50VmVjdG9yKGRhdGEsIG5ldyBUaW1lc3RhbXBNaWxsaXNlY29uZFZpZXcoZGF0YSBhcyBhbnksIDIpIGFzIGFueSk7XG4gICAgICAgICAgICBjYXNlIFRpbWVVbml0Lk1JQ1JPU0VDT05EOiByZXR1cm4gbmV3IEludFZlY3RvcihkYXRhLCBuZXcgVGltZXN0YW1wTWljcm9zZWNvbmRWaWV3KGRhdGEgYXMgYW55LCAyKSBhcyBhbnkpO1xuICAgICAgICAgICAgY2FzZSBUaW1lVW5pdC5OQU5PU0VDT05EOiByZXR1cm4gbmV3IEludFZlY3RvcihkYXRhLCBuZXcgVGltZXN0YW1wTmFub3NlY29uZFZpZXcoZGF0YSBhcyBhbnksIDIpIGFzIGFueSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVW5yZWNvZ25pemVkIHRpbWUgdW5pdCBcIiR7VGltZVVuaXRbdGhpcy50eXBlLnVuaXRdfVwiYCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgSW50ZXJ2YWxWZWN0b3IgZXh0ZW5kcyBGbGF0VmVjdG9yPEludGVydmFsPiB7XG4gICAgc3RhdGljIGRlZmF1bHRWaWV3PFQgZXh0ZW5kcyBJbnRlcnZhbD4oZGF0YTogRGF0YTxUPikge1xuICAgICAgICByZXR1cm4gZGF0YS50eXBlLnVuaXQgPT09IEludGVydmFsVW5pdC5ZRUFSX01PTlRIID8gbmV3IEludGVydmFsWWVhck1vbnRoVmlldyhkYXRhKSA6IG5ldyBGaXhlZFNpemVWaWV3KGRhdGEsIDIpO1xuICAgIH1cbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPEludGVydmFsPiwgdmlldzogVmlldzxJbnRlcnZhbD4gPSBJbnRlcnZhbFZlY3Rvci5kZWZhdWx0VmlldyhkYXRhKSkge1xuICAgICAgICBzdXBlcihkYXRhLCB2aWV3KTtcbiAgICB9XG4gICAgcHVibGljIGxvd3MoKTogSW50VmVjdG9yPEludDMyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnR5cGUudW5pdCA9PT0gSW50ZXJ2YWxVbml0LllFQVJfTU9OVEggPyB0aGlzLmFzSW50MzIoMCwgMSkgOiB0aGlzLmFzSW50MzIoMCwgMik7XG4gICAgfVxuICAgIHB1YmxpYyBoaWdocygpOiBJbnRWZWN0b3I8SW50MzI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMudHlwZS51bml0ID09PSBJbnRlcnZhbFVuaXQuWUVBUl9NT05USCA/IHRoaXMuYXNJbnQzMigwLCAxKSA6IHRoaXMuYXNJbnQzMigxLCAyKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBCaW5hcnlWZWN0b3IgZXh0ZW5kcyBMaXN0VmVjdG9yQmFzZTxCaW5hcnk+IHtcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPEJpbmFyeT4sIHZpZXc6IFZpZXc8QmluYXJ5PiA9IG5ldyBCaW5hcnlWaWV3KGRhdGEpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbiAgICBwdWJsaWMgYXNVdGY4KCkge1xuICAgICAgICByZXR1cm4gbmV3IFV0ZjhWZWN0b3IoKHRoaXMuZGF0YSBhcyBGbGF0TGlzdERhdGE8YW55PikuY2xvbmUobmV3IFV0ZjgoKSkpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEZpeGVkU2l6ZUJpbmFyeVZlY3RvciBleHRlbmRzIEZsYXRWZWN0b3I8Rml4ZWRTaXplQmluYXJ5PiB7XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxGaXhlZFNpemVCaW5hcnk+LCB2aWV3OiBWaWV3PEZpeGVkU2l6ZUJpbmFyeT4gPSBuZXcgRml4ZWRTaXplVmlldyhkYXRhLCBkYXRhLnR5cGUuYnl0ZVdpZHRoKSkge1xuICAgICAgICBzdXBlcihkYXRhLCB2aWV3KTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBVdGY4VmVjdG9yIGV4dGVuZHMgTGlzdFZlY3RvckJhc2U8VXRmOD4ge1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8VXRmOD4sIHZpZXc6IFZpZXc8VXRmOD4gPSBuZXcgVXRmOFZpZXcoZGF0YSkpIHtcbiAgICAgICAgc3VwZXIoZGF0YSwgdmlldyk7XG4gICAgfVxuICAgIHB1YmxpYyBhc0JpbmFyeSgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBCaW5hcnlWZWN0b3IoKHRoaXMuZGF0YSBhcyBGbGF0TGlzdERhdGE8YW55PikuY2xvbmUobmV3IEJpbmFyeSgpKSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgTGlzdFZlY3RvcjxUIGV4dGVuZHMgRGF0YVR5cGUgPSBEYXRhVHlwZT4gZXh0ZW5kcyBMaXN0VmVjdG9yQmFzZTxMaXN0PFQ+PiB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyByZWFkb25seSB2aWV3OiBMaXN0VmlldzxUPjtcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPExpc3Q8VD4+LCB2aWV3OiBMaXN0VmlldzxUPiA9IG5ldyBMaXN0VmlldzxUPihkYXRhIGFzIGFueSkpIHtcbiAgICAgICAgc3VwZXIoZGF0YSwgdmlldyk7XG4gICAgfVxuICAgIHB1YmxpYyBnZXRDaGlsZEF0KGluZGV4OiBudW1iZXIpOiBWZWN0b3I8VD4gfCBudWxsIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmlldy5nZXRDaGlsZEF0PFQ+KGluZGV4KTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBGaXhlZFNpemVMaXN0VmVjdG9yPFQgZXh0ZW5kcyBEYXRhVHlwZSA9IERhdGFUeXBlPiBleHRlbmRzIFZlY3RvcjxGaXhlZFNpemVMaXN0PFQ+PiB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyByZWFkb25seSB2aWV3OiBGaXhlZFNpemVMaXN0VmlldzxUPjtcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPEZpeGVkU2l6ZUxpc3Q8VD4+LCB2aWV3OiBWaWV3PEZpeGVkU2l6ZUxpc3Q8VD4+ID0gbmV3IEZpeGVkU2l6ZUxpc3RWaWV3KGRhdGEpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbiAgICBwdWJsaWMgZ2V0Q2hpbGRBdChpbmRleDogbnVtYmVyKTogVmVjdG9yPFQ+IHwgbnVsbCB7XG4gICAgICAgIHJldHVybiB0aGlzLnZpZXcuZ2V0Q2hpbGRBdDxUPihpbmRleCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgTWFwVmVjdG9yIGV4dGVuZHMgTmVzdGVkVmVjdG9yPE1hcF8+IHtcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPE1hcF8+LCB2aWV3OiBWaWV3PE1hcF8+ID0gbmV3IE1hcFZpZXcoZGF0YSkpIHtcbiAgICAgICAgc3VwZXIoZGF0YSwgdmlldyk7XG4gICAgfVxuICAgIHB1YmxpYyBhc1N0cnVjdCgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTdHJ1Y3RWZWN0b3IoKHRoaXMuZGF0YSBhcyBOZXN0ZWREYXRhPGFueT4pLmNsb25lKG5ldyBTdHJ1Y3QodGhpcy50eXBlLmNoaWxkcmVuKSkpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFN0cnVjdFZlY3RvciBleHRlbmRzIE5lc3RlZFZlY3RvcjxTdHJ1Y3Q+IHtcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPFN0cnVjdD4sIHZpZXc6IFZpZXc8U3RydWN0PiA9IG5ldyBTdHJ1Y3RWaWV3KGRhdGEpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbiAgICBwdWJsaWMgYXNNYXAoa2V5c1NvcnRlZDogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiBuZXcgTWFwVmVjdG9yKCh0aGlzLmRhdGEgYXMgTmVzdGVkRGF0YTxhbnk+KS5jbG9uZShuZXcgTWFwXyhrZXlzU29ydGVkLCB0aGlzLnR5cGUuY2hpbGRyZW4pKSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgVW5pb25WZWN0b3I8VCBleHRlbmRzIChTcGFyc2VVbmlvbiB8IERlbnNlVW5pb24pID0gYW55PiBleHRlbmRzIE5lc3RlZFZlY3RvcjxUPiB7XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxUPiwgdmlldzogVmlldzxUPiA9IDxhbnk+IChkYXRhLnR5cGUubW9kZSA9PT0gVW5pb25Nb2RlLlNwYXJzZSA/IG5ldyBVbmlvblZpZXc8U3BhcnNlVW5pb24+KGRhdGEgYXMgRGF0YTxTcGFyc2VVbmlvbj4pIDogbmV3IERlbnNlVW5pb25WaWV3KGRhdGEgYXMgRGF0YTxEZW5zZVVuaW9uPikpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIERpY3Rpb25hcnlWZWN0b3I8VCBleHRlbmRzIERhdGFUeXBlID0gRGF0YVR5cGU+IGV4dGVuZHMgVmVjdG9yPERpY3Rpb25hcnk8VD4+IHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIHJlYWRvbmx5IGluZGljZXM6IFZlY3RvcjxJbnQ+O1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgcmVhZG9ubHkgZGljdGlvbmFyeTogVmVjdG9yPFQ+O1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8RGljdGlvbmFyeTxUPj4sIHZpZXc6IFZpZXc8RGljdGlvbmFyeTxUPj4gPSBuZXcgRGljdGlvbmFyeVZpZXc8VD4oZGF0YS5kaWN0aW9uYXJ5LCBuZXcgSW50VmVjdG9yKGRhdGEuaW5kaWNlcykpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEgYXMgRGF0YTxhbnk+LCB2aWV3KTtcbiAgICAgICAgaWYgKHZpZXcgaW5zdGFuY2VvZiBWYWxpZGl0eVZpZXcpIHtcbiAgICAgICAgICAgIHZpZXcgPSAodmlldyBhcyBhbnkpLnZpZXc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEgaW5zdGFuY2VvZiBEaWN0aW9uYXJ5RGF0YSAmJiB2aWV3IGluc3RhbmNlb2YgRGljdGlvbmFyeVZpZXcpIHtcbiAgICAgICAgICAgIHRoaXMuaW5kaWNlcyA9IHZpZXcuaW5kaWNlcztcbiAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyeSA9IGRhdGEuZGljdGlvbmFyeTtcbiAgICAgICAgfSBlbHNlIGlmIChkYXRhIGluc3RhbmNlb2YgQ2h1bmtlZERhdGEgJiYgdmlldyBpbnN0YW5jZW9mIENodW5rZWRWaWV3KSB7XG4gICAgICAgICAgICBjb25zdCBjaHVua3MgPSB2aWV3LmNodW5rVmVjdG9ycyBhcyBEaWN0aW9uYXJ5VmVjdG9yPFQ+W107XG4gICAgICAgICAgICAvLyBBc3N1bWUgdGhlIGxhc3QgY2h1bmsncyBkaWN0aW9uYXJ5IGRhdGEgaXMgdGhlIG1vc3QgdXAtdG8tZGF0ZSxcbiAgICAgICAgICAgIC8vIGluY2x1ZGluZyBkYXRhIGZyb20gRGljdGlvbmFyeUJhdGNoZXMgdGhhdCB3ZXJlIG1hcmtlZCBhcyBkZWx0YXNcbiAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyeSA9IGNodW5rc1tjaHVua3MubGVuZ3RoIC0gMV0uZGljdGlvbmFyeTtcbiAgICAgICAgICAgIHRoaXMuaW5kaWNlcyA9IGNodW5rcy5yZWR1Y2U8VmVjdG9yPEludD4gfCBudWxsPihcbiAgICAgICAgICAgICAgICAoaWR4czogVmVjdG9yPEludD4gfCBudWxsLCBkaWN0OiBEaWN0aW9uYXJ5VmVjdG9yPFQ+KSA9PlxuICAgICAgICAgICAgICAgICAgICAhaWR4cyA/IGRpY3QuaW5kaWNlcyEgOiBpZHhzLmNvbmNhdChkaWN0LmluZGljZXMhKSxcbiAgICAgICAgICAgICAgICBudWxsXG4gICAgICAgICAgICApITtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFVucmVjb2duaXplZCBEaWN0aW9uYXJ5VmVjdG9yIHZpZXdgKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBwdWJsaWMgZ2V0S2V5KGluZGV4OiBudW1iZXIpIHsgcmV0dXJuIHRoaXMuaW5kaWNlcy5nZXQoaW5kZXgpOyB9XG4gICAgcHVibGljIGdldFZhbHVlKGtleTogbnVtYmVyKSB7IHJldHVybiB0aGlzLmRpY3Rpb25hcnkuZ2V0KGtleSk7IH1cbiAgICBwdWJsaWMgcmV2ZXJzZUxvb2t1cCh2YWx1ZTogVCkgeyByZXR1cm4gdGhpcy5kaWN0aW9uYXJ5LmluZGV4T2YodmFsdWUpOyB9XG59XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVWZWN0b3IgPSAoKFZlY3RvckxvYWRlcjogbmV3IDxUIGV4dGVuZHMgRGF0YVR5cGU+KGRhdGE6IERhdGE8VD4pID0+IFR5cGVWaXNpdG9yKSA9PiAoXG4gICAgPFQgZXh0ZW5kcyBEYXRhVHlwZT4oZGF0YTogRGF0YTxUPikgPT4gVHlwZVZpc2l0b3IudmlzaXRUeXBlSW5saW5lKG5ldyBWZWN0b3JMb2FkZXIoZGF0YSksIGRhdGEudHlwZSkgYXMgVmVjdG9yPFQ+XG4pKShjbGFzcyBWZWN0b3JMb2FkZXI8VCBleHRlbmRzIERhdGFUeXBlPiBleHRlbmRzIFR5cGVWaXNpdG9yIHtcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIGRhdGE6IERhdGE8VD4pIHsgc3VwZXIoKTsgfVxuICAgIHZpc2l0TnVsbCAgICAgICAgICAgKF90eXBlOiBOdWxsKSAgICAgICAgICAgIHsgcmV0dXJuIG5ldyBOdWxsVmVjdG9yKDxhbnk+IHRoaXMuZGF0YSk7ICAgICAgICAgICAgfVxuICAgIHZpc2l0SW50ICAgICAgICAgICAgKF90eXBlOiBJbnQpICAgICAgICAgICAgIHsgcmV0dXJuIG5ldyBJbnRWZWN0b3IoPGFueT4gdGhpcy5kYXRhKTsgICAgICAgICAgICAgfVxuICAgIHZpc2l0RmxvYXQgICAgICAgICAgKF90eXBlOiBGbG9hdCkgICAgICAgICAgIHsgcmV0dXJuIG5ldyBGbG9hdFZlY3Rvcig8YW55PiB0aGlzLmRhdGEpOyAgICAgICAgICAgfVxuICAgIHZpc2l0QmluYXJ5ICAgICAgICAgKF90eXBlOiBCaW5hcnkpICAgICAgICAgIHsgcmV0dXJuIG5ldyBCaW5hcnlWZWN0b3IoPGFueT4gdGhpcy5kYXRhKTsgICAgICAgICAgfVxuICAgIHZpc2l0VXRmOCAgICAgICAgICAgKF90eXBlOiBVdGY4KSAgICAgICAgICAgIHsgcmV0dXJuIG5ldyBVdGY4VmVjdG9yKDxhbnk+IHRoaXMuZGF0YSk7ICAgICAgICAgICAgfVxuICAgIHZpc2l0Qm9vbCAgICAgICAgICAgKF90eXBlOiBCb29sKSAgICAgICAgICAgIHsgcmV0dXJuIG5ldyBCb29sVmVjdG9yKDxhbnk+IHRoaXMuZGF0YSk7ICAgICAgICAgICAgfVxuICAgIHZpc2l0RGVjaW1hbCAgICAgICAgKF90eXBlOiBEZWNpbWFsKSAgICAgICAgIHsgcmV0dXJuIG5ldyBEZWNpbWFsVmVjdG9yKDxhbnk+IHRoaXMuZGF0YSk7ICAgICAgICAgfVxuICAgIHZpc2l0RGF0ZSAgICAgICAgICAgKF90eXBlOiBEYXRlXykgICAgICAgICAgIHsgcmV0dXJuIG5ldyBEYXRlVmVjdG9yKDxhbnk+IHRoaXMuZGF0YSk7ICAgICAgICAgICAgfVxuICAgIHZpc2l0VGltZSAgICAgICAgICAgKF90eXBlOiBUaW1lKSAgICAgICAgICAgIHsgcmV0dXJuIG5ldyBUaW1lVmVjdG9yKDxhbnk+IHRoaXMuZGF0YSk7ICAgICAgICAgICAgfVxuICAgIHZpc2l0VGltZXN0YW1wICAgICAgKF90eXBlOiBUaW1lc3RhbXApICAgICAgIHsgcmV0dXJuIG5ldyBUaW1lc3RhbXBWZWN0b3IoPGFueT4gdGhpcy5kYXRhKTsgICAgICAgfVxuICAgIHZpc2l0SW50ZXJ2YWwgICAgICAgKF90eXBlOiBJbnRlcnZhbCkgICAgICAgIHsgcmV0dXJuIG5ldyBJbnRlcnZhbFZlY3Rvcig8YW55PiB0aGlzLmRhdGEpOyAgICAgICAgfVxuICAgIHZpc2l0TGlzdCAgICAgICAgICAgKF90eXBlOiBMaXN0KSAgICAgICAgICAgIHsgcmV0dXJuIG5ldyBMaXN0VmVjdG9yKDxhbnk+IHRoaXMuZGF0YSk7ICAgICAgICAgICAgfVxuICAgIHZpc2l0U3RydWN0ICAgICAgICAgKF90eXBlOiBTdHJ1Y3QpICAgICAgICAgIHsgcmV0dXJuIG5ldyBTdHJ1Y3RWZWN0b3IoPGFueT4gdGhpcy5kYXRhKTsgICAgICAgICAgfVxuICAgIHZpc2l0VW5pb24gICAgICAgICAgKF90eXBlOiBVbmlvbikgICAgICAgICAgIHsgcmV0dXJuIG5ldyBVbmlvblZlY3Rvcig8YW55PiB0aGlzLmRhdGEpOyAgICAgICAgICAgfVxuICAgIHZpc2l0Rml4ZWRTaXplQmluYXJ5KF90eXBlOiBGaXhlZFNpemVCaW5hcnkpIHsgcmV0dXJuIG5ldyBGaXhlZFNpemVCaW5hcnlWZWN0b3IoPGFueT4gdGhpcy5kYXRhKTsgfVxuICAgIHZpc2l0Rml4ZWRTaXplTGlzdCAgKF90eXBlOiBGaXhlZFNpemVMaXN0KSAgIHsgcmV0dXJuIG5ldyBGaXhlZFNpemVMaXN0VmVjdG9yKDxhbnk+IHRoaXMuZGF0YSk7ICAgfVxuICAgIHZpc2l0TWFwICAgICAgICAgICAgKF90eXBlOiBNYXBfKSAgICAgICAgICAgIHsgcmV0dXJuIG5ldyBNYXBWZWN0b3IoPGFueT4gdGhpcy5kYXRhKTsgICAgICAgICAgICAgfVxuICAgIHZpc2l0RGljdGlvbmFyeSAgICAgKF90eXBlOiBEaWN0aW9uYXJ5KSAgICAgIHsgcmV0dXJuIG5ldyBEaWN0aW9uYXJ5VmVjdG9yKDxhbnk+IHRoaXMuZGF0YSk7ICAgICAgfVxufSk7XG4iXX0=

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
        let data = this.data.clone(new type_4.Int32());
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
                ? new IntVector(new data_1.FlatData(new type_4.Int64(), data.length, null, data))
                : new IntVector(new data_1.FlatData(new type_4.Uint64(), data.length, null, data));
        }
        switch (data.constructor) {
            case Int8Array: return new IntVector(new data_1.FlatData(new type_4.Int8(), data.length, null, data));
            case Int16Array: return new IntVector(new data_1.FlatData(new type_4.Int16(), data.length, null, data));
            case Int32Array: return new IntVector(new data_1.FlatData(new type_4.Int32(), data.length, null, data));
            case Uint8Array: return new IntVector(new data_1.FlatData(new type_4.Uint8(), data.length, null, data));
            case Uint16Array: return new IntVector(new data_1.FlatData(new type_4.Uint16(), data.length, null, data));
            case Uint32Array: return new IntVector(new data_1.FlatData(new type_4.Uint32(), data.length, null, data));
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
            case Uint16Array: return new FloatVector(new data_1.FlatData(new type_4.Float16(), data.length, null, data));
            case Float32Array: return new FloatVector(new data_1.FlatData(new type_4.Float32(), data.length, null, data));
            case Float64Array: return new FloatVector(new data_1.FlatData(new type_4.Float64(), data.length, null, data));
        }
        throw new TypeError('Unrecognized Float data');
    }
    static defaultView(data) {
        return data.type.precision !== type_2.Precision.HALF ? new flat_1.FlatView(data) : new flat_1.Float16View(data);
    }
}
exports.FloatVector = FloatVector;
class DateVector extends FlatVector {
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
        let data = this.data.clone(new type_4.Int32());
        switch (this.type.unit) {
            case type_2.DateUnit.DAY: return new IntVector(data, new flat_3.TimestampDayView(data, 1));
            case type_2.DateUnit.MILLISECOND: return new IntVector(data, new flat_3.TimestampMillisecondView(data, 2));
        }
        throw new TypeError(`Unrecognized date unit "${type_2.DateUnit[this.type.unit]}"`);
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
        let data = this.data.clone(new type_4.Int32());
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
        return new StructVector(this.data.clone(new type_5.Struct(this.type.children)));
    }
}
exports.MapVector = MapVector;
class StructVector extends NestedVector {
    constructor(data, view = new nested_1.StructView(data)) {
        super(data, view);
    }
    asMap(keysSorted = false) {
        return new MapVector(this.data.clone(new type_5.Map_(keysSorted, this.type.children)));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LENBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQU8sQ0FBQztJQUNuRyxhQUFhLENBQVEsS0FBZSxJQUFXLE9BQU8sSUFBSSxjQUFjLENBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQVEsQ0FBQztJQUNuRyxTQUFTLENBQVksS0FBVyxJQUFlLE9BQU8sSUFBSSxVQUFVLENBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQVksQ0FBQztJQUNuRyxXQUFXLENBQVUsS0FBYSxJQUFhLE9BQU8sSUFBSSxZQUFZLENBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQVUsQ0FBQztJQUNuRyxVQUFVLENBQVcsS0FBWSxJQUFjLE9BQU8sSUFBSSxXQUFXLENBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQVcsQ0FBQztJQUNuRyxvQkFBb0IsQ0FBQyxLQUFzQixJQUFJLE9BQU8sSUFBSSxxQkFBcUIsQ0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25HLGtCQUFrQixDQUFHLEtBQW9CLElBQU0sT0FBTyxJQUFJLG1CQUFtQixDQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFHLENBQUM7SUFDbkcsUUFBUSxDQUFhLEtBQVcsSUFBZSxPQUFPLElBQUksU0FBUyxDQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFhLENBQUM7SUFDbkcsZUFBZSxDQUFNLEtBQWlCLElBQVMsT0FBTyxJQUFJLGdCQUFnQixDQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFNLENBQUM7Q0FDdEcsQ0FBQyxDQUFDIiwiZmlsZSI6InZlY3Rvci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBEYXRhLCBDaHVua2VkRGF0YSwgRmxhdERhdGEsIEJvb2xEYXRhLCBGbGF0TGlzdERhdGEsIE5lc3RlZERhdGEsIERpY3Rpb25hcnlEYXRhIH0gZnJvbSAnLi9kYXRhJztcbmltcG9ydCB7IFZpc2l0b3JOb2RlLCBUeXBlVmlzaXRvciwgVmVjdG9yVmlzaXRvciB9IGZyb20gJy4vdmlzaXRvcic7XG5pbXBvcnQgeyBEYXRhVHlwZSwgTGlzdFR5cGUsIEZsYXRUeXBlLCBOZXN0ZWRUeXBlLCBGbGF0TGlzdFR5cGUsIFRpbWVVbml0IH0gZnJvbSAnLi90eXBlJztcbmltcG9ydCB7IEl0ZXJhYmxlQXJyYXlMaWtlLCBQcmVjaXNpb24sIERhdGVVbml0LCBJbnRlcnZhbFVuaXQsIFVuaW9uTW9kZSB9IGZyb20gJy4vdHlwZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVmVjdG9yTGlrZSB7IGxlbmd0aDogbnVtYmVyOyBudWxsQ291bnQ6IG51bWJlcjsgfVxuXG5leHBvcnQgaW50ZXJmYWNlIFZpZXc8VCBleHRlbmRzIERhdGFUeXBlPiB7XG4gICAgY2xvbmUoZGF0YTogRGF0YTxUPik6IHRoaXM7XG4gICAgaXNWYWxpZChpbmRleDogbnVtYmVyKTogYm9vbGVhbjtcbiAgICBnZXQoaW5kZXg6IG51bWJlcik6IFRbJ1RWYWx1ZSddIHwgbnVsbDtcbiAgICBzZXQoaW5kZXg6IG51bWJlciwgdmFsdWU6IFRbJ1RWYWx1ZSddKTogdm9pZDtcbiAgICB0b0FycmF5KCk6IEl0ZXJhYmxlQXJyYXlMaWtlPFRbJ1RWYWx1ZSddIHwgbnVsbD47XG4gICAgaW5kZXhPZihzZWFyY2g6IFRbJ1RWYWx1ZSddKTogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VFsnVFZhbHVlJ10gfCBudWxsPjtcbn1cblxuZXhwb3J0IGNsYXNzIFZlY3RvcjxUIGV4dGVuZHMgRGF0YVR5cGUgPSBhbnk+IGltcGxlbWVudHMgVmVjdG9yTGlrZSwgVmlldzxUPiwgVmlzaXRvck5vZGUge1xuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlPFQgZXh0ZW5kcyBEYXRhVHlwZT4oZGF0YTogRGF0YTxUPik6IFZlY3RvcjxUPiB7XG4gICAgICAgIHJldHVybiBjcmVhdGVWZWN0b3IoZGF0YSk7XG4gICAgfVxuICAgIHB1YmxpYyBzdGF0aWMgY29uY2F0PFQgZXh0ZW5kcyBEYXRhVHlwZT4oc291cmNlPzogVmVjdG9yPFQ+IHwgbnVsbCwgLi4ub3RoZXJzOiBWZWN0b3I8VD5bXSk6IFZlY3RvcjxUPiB7XG4gICAgICAgIHJldHVybiBvdGhlcnMucmVkdWNlKChhLCBiKSA9PiBhID8gYS5jb25jYXQoYikgOiBiLCBzb3VyY2UhKTtcbiAgICB9XG4gICAgcHVibGljIHR5cGU6IFQ7XG4gICAgcHVibGljIGxlbmd0aDogbnVtYmVyO1xuICAgIHB1YmxpYyByZWFkb25seSBkYXRhOiBEYXRhPFQ+O1xuICAgIHB1YmxpYyByZWFkb25seSB2aWV3OiBWaWV3PFQ+O1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8VD4sIHZpZXc6IFZpZXc8VD4pIHtcbiAgICAgICAgdGhpcy5kYXRhID0gZGF0YTtcbiAgICAgICAgdGhpcy50eXBlID0gZGF0YS50eXBlO1xuICAgICAgICB0aGlzLmxlbmd0aCA9IGRhdGEubGVuZ3RoO1xuICAgICAgICBsZXQgbnVsbHM6IFVpbnQ4QXJyYXk7XG4gICAgICAgIGlmICgoPGFueT4gZGF0YSBpbnN0YW5jZW9mIENodW5rZWREYXRhKSAmJiAhKHZpZXcgaW5zdGFuY2VvZiBDaHVua2VkVmlldykpIHtcbiAgICAgICAgICAgIHRoaXMudmlldyA9IG5ldyBDaHVua2VkVmlldyhkYXRhIGFzIGFueSkgYXMgYW55O1xuICAgICAgICB9IGVsc2UgaWYgKCEodmlldyBpbnN0YW5jZW9mIFZhbGlkaXR5VmlldykgJiYgKG51bGxzID0gZGF0YS5udWxsQml0bWFwISkgJiYgbnVsbHMubGVuZ3RoID4gMCAmJiBkYXRhLm51bGxDb3VudCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMudmlldyA9IG5ldyBWYWxpZGl0eVZpZXcoZGF0YSwgdmlldyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnZpZXcgPSB2aWV3O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIGdldCBudWxsQ291bnQoKSB7IHJldHVybiB0aGlzLmRhdGEubnVsbENvdW50OyB9XG4gICAgcHVibGljIGdldCBudWxsQml0bWFwKCkgeyByZXR1cm4gdGhpcy5kYXRhLm51bGxCaXRtYXA7IH1cbiAgICBwdWJsaWMgZ2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCkge1xuICAgICAgICByZXR1cm4gYFZlY3Rvcjwke3RoaXMudHlwZVtTeW1ib2wudG9TdHJpbmdUYWddfT5gO1xuICAgIH1cbiAgICBwdWJsaWMgdG9KU09OKCk6IGFueSB7IHJldHVybiB0aGlzLnRvQXJyYXkoKTsgfVxuICAgIHB1YmxpYyBjbG9uZTxSIGV4dGVuZHMgVD4oZGF0YTogRGF0YTxSPiwgdmlldzogVmlldzxSPiA9IHRoaXMudmlldy5jbG9uZShkYXRhKSBhcyBhbnkpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIG5ldyAodGhpcy5jb25zdHJ1Y3RvciBhcyBhbnkpKGRhdGEsIHZpZXcpO1xuICAgIH1cbiAgICBwdWJsaWMgaXNWYWxpZChpbmRleDogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnZpZXcuaXNWYWxpZChpbmRleCk7XG4gICAgfVxuICAgIHB1YmxpYyBnZXQoaW5kZXg6IG51bWJlcik6IFRbJ1RWYWx1ZSddIHwgbnVsbCB7XG4gICAgICAgIHJldHVybiB0aGlzLnZpZXcuZ2V0KGluZGV4KTtcbiAgICB9XG4gICAgcHVibGljIHNldChpbmRleDogbnVtYmVyLCB2YWx1ZTogVFsnVFZhbHVlJ10pOiB2b2lkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmlldy5zZXQoaW5kZXgsIHZhbHVlKTtcbiAgICB9XG4gICAgcHVibGljIHRvQXJyYXkoKTogSXRlcmFibGVBcnJheUxpa2U8VFsnVFZhbHVlJ10gfCBudWxsPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnZpZXcudG9BcnJheSgpO1xuICAgIH1cbiAgICBwdWJsaWMgaW5kZXhPZih2YWx1ZTogVFsnVFZhbHVlJ10pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmlldy5pbmRleE9mKHZhbHVlKTtcbiAgICB9XG4gICAgcHVibGljIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VFsnVFZhbHVlJ10gfCBudWxsPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnZpZXdbU3ltYm9sLml0ZXJhdG9yXSgpO1xuICAgIH1cbiAgICBwdWJsaWMgY29uY2F0KC4uLm90aGVyczogVmVjdG9yPFQ+W10pOiB0aGlzIHtcbiAgICAgICAgaWYgKChvdGhlcnMgPSBvdGhlcnMuZmlsdGVyKEJvb2xlYW4pKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHsgdmlldyB9ID0gdGhpcztcbiAgICAgICAgY29uc3QgdmVjcyA9ICEodmlldyBpbnN0YW5jZW9mIENodW5rZWRWaWV3KVxuICAgICAgICAgICAgPyBbdGhpcywgLi4ub3RoZXJzXVxuICAgICAgICAgICAgOiBbLi4udmlldy5jaHVua1ZlY3RvcnMsIC4uLm90aGVyc107XG4gICAgICAgIGNvbnN0IG9mZnNldHMgPSBDaHVua2VkRGF0YS5jb21wdXRlT2Zmc2V0cyh2ZWNzKTtcbiAgICAgICAgY29uc3QgY2h1bmtzTGVuZ3RoID0gb2Zmc2V0c1tvZmZzZXRzLmxlbmd0aCAtIDFdO1xuICAgICAgICBjb25zdCBjaHVua2VkRGF0YSA9IG5ldyBDaHVua2VkRGF0YSh0aGlzLnR5cGUsIGNodW5rc0xlbmd0aCwgdmVjcywgMCwgLTEsIG9mZnNldHMpO1xuICAgICAgICByZXR1cm4gdGhpcy5jbG9uZShjaHVua2VkRGF0YSwgbmV3IENodW5rZWRWaWV3KGNodW5rZWREYXRhKSkgYXMgdGhpcztcbiAgICB9XG4gICAgcHVibGljIHNsaWNlKGJlZ2luPzogbnVtYmVyLCBlbmQ/OiBudW1iZXIpOiB0aGlzIHtcbiAgICAgICAgbGV0IHsgbGVuZ3RoIH0gPSB0aGlzO1xuICAgICAgICBsZXQgc2l6ZSA9ICh0aGlzLnZpZXcgYXMgYW55KS5zaXplIHx8IDE7XG4gICAgICAgIGxldCB0b3RhbCA9IGxlbmd0aCwgZnJvbSA9IChiZWdpbiB8fCAwKSAqIHNpemU7XG4gICAgICAgIGxldCB0byA9ICh0eXBlb2YgZW5kID09PSAnbnVtYmVyJyA/IGVuZCA6IHRvdGFsKSAqIHNpemU7XG4gICAgICAgIGlmICh0byA8IDApIHsgdG8gPSB0b3RhbCAtICh0byAqIC0xKSAlIHRvdGFsOyB9XG4gICAgICAgIGlmIChmcm9tIDwgMCkgeyBmcm9tID0gdG90YWwgLSAoZnJvbSAqIC0xKSAlIHRvdGFsOyB9XG4gICAgICAgIGlmICh0byA8IGZyb20pIHsgW2Zyb20sIHRvXSA9IFt0bywgZnJvbV07IH1cbiAgICAgICAgdG90YWwgPSAhaXNGaW5pdGUodG90YWwgPSAodG8gLSBmcm9tKSkgfHwgdG90YWwgPCAwID8gMCA6IHRvdGFsO1xuICAgICAgICBjb25zdCBzbGljZWREYXRhID0gdGhpcy5kYXRhLnNsaWNlKGZyb20sIE1hdGgubWluKHRvdGFsLCBsZW5ndGgpKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2xvbmUoc2xpY2VkRGF0YSwgdGhpcy52aWV3LmNsb25lKHNsaWNlZERhdGEpKSBhcyB0aGlzO1xuICAgIH1cblxuICAgIHB1YmxpYyBhY2NlcHRUeXBlVmlzaXRvcih2aXNpdG9yOiBUeXBlVmlzaXRvcik6IGFueSB7XG4gICAgICAgIHJldHVybiBUeXBlVmlzaXRvci52aXNpdFR5cGVJbmxpbmUodmlzaXRvciwgdGhpcy50eXBlKTtcbiAgICB9XG4gICAgcHVibGljIGFjY2VwdFZlY3RvclZpc2l0b3IodmlzaXRvcjogVmVjdG9yVmlzaXRvcik6IGFueSB7XG4gICAgICAgIHJldHVybiBWZWN0b3JWaXNpdG9yLnZpc2l0VHlwZUlubGluZSh2aXNpdG9yLCB0aGlzLnR5cGUsIHRoaXMpO1xuICAgIH1cbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEZsYXRWZWN0b3I8VCBleHRlbmRzIEZsYXRUeXBlPiBleHRlbmRzIFZlY3RvcjxUPiB7XG4gICAgcHVibGljIGdldCB2YWx1ZXMoKSB7IHJldHVybiB0aGlzLmRhdGEudmFsdWVzOyB9XG4gICAgcHVibGljIGxvd3MoKTogSW50VmVjdG9yPEludDMyPiB7IHJldHVybiB0aGlzLmFzSW50MzIoMCwgMik7IH1cbiAgICBwdWJsaWMgaGlnaHMoKTogSW50VmVjdG9yPEludDMyPiB7IHJldHVybiB0aGlzLmFzSW50MzIoMSwgMik7IH1cbiAgICBwdWJsaWMgYXNJbnQzMihvZmZzZXQ6IG51bWJlciA9IDAsIHN0cmlkZTogbnVtYmVyID0gMik6IEludFZlY3RvcjxJbnQzMj4ge1xuICAgICAgICBsZXQgZGF0YSA9ICh0aGlzLmRhdGEgYXMgRmxhdERhdGE8YW55PikuY2xvbmUobmV3IEludDMyKCkpO1xuICAgICAgICBpZiAob2Zmc2V0ID4gMCkge1xuICAgICAgICAgICAgZGF0YSA9IGRhdGEuc2xpY2Uob2Zmc2V0LCB0aGlzLmxlbmd0aCAtIG9mZnNldCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgaW50MzJzID0gbmV3IEludFZlY3RvcihkYXRhLCBuZXcgUHJpbWl0aXZlVmlldyhkYXRhLCBzdHJpZGUpKTtcbiAgICAgICAgaW50MzJzLmxlbmd0aCA9IHRoaXMubGVuZ3RoIC8gc3RyaWRlIHwgMDtcbiAgICAgICAgcmV0dXJuIGludDMycztcbiAgICB9XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBMaXN0VmVjdG9yQmFzZTxUIGV4dGVuZHMgKExpc3RUeXBlIHwgRmxhdExpc3RUeXBlKT4gZXh0ZW5kcyBWZWN0b3I8VD4ge1xuICAgIHB1YmxpYyBnZXQgdmFsdWVzKCkgeyByZXR1cm4gdGhpcy5kYXRhLnZhbHVlczsgfVxuICAgIHB1YmxpYyBnZXQgdmFsdWVPZmZzZXRzKCkgeyByZXR1cm4gdGhpcy5kYXRhLnZhbHVlT2Zmc2V0czsgfVxuICAgIHB1YmxpYyBnZXRWYWx1ZU9mZnNldChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnZhbHVlT2Zmc2V0c1tpbmRleF07XG4gICAgfVxuICAgIHB1YmxpYyBnZXRWYWx1ZUxlbmd0aChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnZhbHVlT2Zmc2V0c1tpbmRleCArIDFdIC0gdGhpcy52YWx1ZU9mZnNldHNbaW5kZXhdO1xuICAgIH1cbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIE5lc3RlZFZlY3RvcjxUIGV4dGVuZHMgTmVzdGVkVHlwZT4gZXh0ZW5kcyBWZWN0b3I8VD4gIHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIHJlYWRvbmx5IHZpZXc6IE5lc3RlZFZpZXc8VD47XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHByb3RlY3RlZCBfY2hpbGREYXRhOiBEYXRhPGFueT5bXTtcbiAgICBwdWJsaWMgZ2V0Q2hpbGRBdDxSIGV4dGVuZHMgRGF0YVR5cGUgPSBEYXRhVHlwZT4oaW5kZXg6IG51bWJlcik6IFZlY3RvcjxSPiB8IG51bGwge1xuICAgICAgICByZXR1cm4gdGhpcy52aWV3LmdldENoaWxkQXQ8Uj4oaW5kZXgpO1xuICAgIH1cbiAgICBwdWJsaWMgZ2V0IGNoaWxkRGF0YSgpOiBEYXRhPGFueT5bXSB7XG4gICAgICAgIGxldCBkYXRhOiBEYXRhPFQ+IHwgRGF0YTxhbnk+W107XG4gICAgICAgIGlmICgoZGF0YSA9IHRoaXMuX2NoaWxkRGF0YSkpIHtcbiAgICAgICAgICAgIC8vIFJldHVybiB0aGUgY2FjaGVkIGNoaWxkRGF0YSByZWZlcmVuY2UgZmlyc3RcbiAgICAgICAgICAgIHJldHVybiBkYXRhIGFzIERhdGE8YW55PltdO1xuICAgICAgICB9IGVsc2UgaWYgKCEoPGFueT4gKGRhdGEgPSB0aGlzLmRhdGEpIGluc3RhbmNlb2YgQ2h1bmtlZERhdGEpKSB7XG4gICAgICAgICAgICAvLyBJZiBkYXRhIGlzbid0IGNodW5rZWQsIGNhY2hlIGFuZCByZXR1cm4gTmVzdGVkRGF0YSdzIGNoaWxkRGF0YVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NoaWxkRGF0YSA9IGRhdGEuY2hpbGREYXRhO1xuICAgICAgICB9XG4gICAgICAgIC8vIE90aGVyd2lzZSBpZiB0aGUgZGF0YSBpcyBjaHVua2VkLCBjb25jYXRlbmF0ZSB0aGUgY2hpbGRWZWN0b3JzIGZyb20gZWFjaCBjaHVua1xuICAgICAgICAvLyB0byBjb25zdHJ1Y3QgYSBzaW5nbGUgY2h1bmtlZCBWZWN0b3IgZm9yIGVhY2ggY29sdW1uLiBUaGVuIHJldHVybiB0aGUgQ2h1bmtlZERhdGFcbiAgICAgICAgLy8gaW5zdGFuY2UgZnJvbSBlYWNoIHVuaWZpZWQgY2h1bmtlZCBjb2x1bW4gYXMgdGhlIGNoaWxkRGF0YSBvZiBhIGNodW5rZWQgTmVzdGVkVmVjdG9yXG4gICAgICAgIGNvbnN0IGNodW5rcyA9ICgoZGF0YSBhcyBhbnkgYXMgQ2h1bmtlZERhdGE8VD4pLmNodW5rVmVjdG9ycyBhcyBOZXN0ZWRWZWN0b3I8VD5bXSk7XG4gICAgICAgIHJldHVybiB0aGlzLl9jaGlsZERhdGEgPSBjaHVua3NcbiAgICAgICAgICAgIC5yZWR1Y2U8KFZlY3RvcjxUPiB8IG51bGwpW11bXT4oKGNvbHMsIGNodW5rKSA9PiBjaHVuay5jaGlsZERhdGFcbiAgICAgICAgICAgIC5yZWR1Y2U8KFZlY3RvcjxUPiB8IG51bGwpW11bXT4oKGNvbHMsIF8sIGkpID0+IChcbiAgICAgICAgICAgICAgICAoY29sc1tpXSB8fCAoY29sc1tpXSA9IFtdKSkucHVzaChjaHVuay5nZXRDaGlsZEF0KGkpKVxuICAgICAgICAgICAgKSAmJiBjb2xzIHx8IGNvbHMsIGNvbHMpLCBbXSBhcyBWZWN0b3I8VD5bXVtdKVxuICAgICAgICAubWFwKCh2ZWNzKSA9PiBWZWN0b3IuY29uY2F0PFQ+KC4uLnZlY3MpLmRhdGEpO1xuICAgIH1cbn1cblxuaW1wb3J0IHsgTGlzdCwgQmluYXJ5LCBVdGY4LCBCb29sLCB9IGZyb20gJy4vdHlwZSc7XG5pbXBvcnQgeyBOdWxsLCBJbnQsIEZsb2F0LCBEZWNpbWFsLCBEYXRlXywgVGltZSwgVGltZXN0YW1wLCBJbnRlcnZhbCB9IGZyb20gJy4vdHlwZSc7XG5pbXBvcnQgeyBVaW50OCwgVWludDE2LCBVaW50MzIsIFVpbnQ2NCwgSW50OCwgSW50MTYsIEludDMyLCBJbnQ2NCwgRmxvYXQxNiwgRmxvYXQzMiwgRmxvYXQ2NCB9IGZyb20gJy4vdHlwZSc7XG5pbXBvcnQgeyBTdHJ1Y3QsIFVuaW9uLCBTcGFyc2VVbmlvbiwgRGVuc2VVbmlvbiwgRml4ZWRTaXplQmluYXJ5LCBGaXhlZFNpemVMaXN0LCBNYXBfLCBEaWN0aW9uYXJ5IH0gZnJvbSAnLi90eXBlJztcblxuaW1wb3J0IHsgQ2h1bmtlZFZpZXcgfSBmcm9tICcuL3ZlY3Rvci9jaHVua2VkJztcbmltcG9ydCB7IFZhbGlkaXR5VmlldyB9IGZyb20gJy4vdmVjdG9yL3ZhbGlkaXR5JztcbmltcG9ydCB7IERpY3Rpb25hcnlWaWV3IH0gZnJvbSAnLi92ZWN0b3IvZGljdGlvbmFyeSc7XG5pbXBvcnQgeyBMaXN0VmlldywgRml4ZWRTaXplTGlzdFZpZXcsIEJpbmFyeVZpZXcsIFV0ZjhWaWV3IH0gZnJvbSAnLi92ZWN0b3IvbGlzdCc7XG5pbXBvcnQgeyBVbmlvblZpZXcsIERlbnNlVW5pb25WaWV3LCBOZXN0ZWRWaWV3LCBTdHJ1Y3RWaWV3LCBNYXBWaWV3IH0gZnJvbSAnLi92ZWN0b3IvbmVzdGVkJztcbmltcG9ydCB7IEZsYXRWaWV3LCBOdWxsVmlldywgQm9vbFZpZXcsIFByaW1pdGl2ZVZpZXcsIEZpeGVkU2l6ZVZpZXcsIEZsb2F0MTZWaWV3IH0gZnJvbSAnLi92ZWN0b3IvZmxhdCc7XG5pbXBvcnQgeyBEYXRlRGF5VmlldywgRGF0ZU1pbGxpc2Vjb25kVmlldywgSW50ZXJ2YWxZZWFyTW9udGhWaWV3IH0gZnJvbSAnLi92ZWN0b3IvZmxhdCc7XG5pbXBvcnQgeyBUaW1lc3RhbXBEYXlWaWV3LCBUaW1lc3RhbXBTZWNvbmRWaWV3LCBUaW1lc3RhbXBNaWxsaXNlY29uZFZpZXcsIFRpbWVzdGFtcE1pY3Jvc2Vjb25kVmlldywgVGltZXN0YW1wTmFub3NlY29uZFZpZXcgfSBmcm9tICcuL3ZlY3Rvci9mbGF0JztcbmltcG9ydCB7IHBhY2tCb29scyB9IGZyb20gJy4vdXRpbC9iaXQnO1xuXG5leHBvcnQgY2xhc3MgTnVsbFZlY3RvciBleHRlbmRzIFZlY3RvcjxOdWxsPiB7XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxOdWxsPiwgdmlldzogVmlldzxOdWxsPiA9IG5ldyBOdWxsVmlldyhkYXRhKSkge1xuICAgICAgICBzdXBlcihkYXRhLCB2aWV3KTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBCb29sVmVjdG9yIGV4dGVuZHMgVmVjdG9yPEJvb2w+IHtcbiAgICBwdWJsaWMgc3RhdGljIGZyb20oZGF0YTogSXRlcmFibGVBcnJheUxpa2U8Ym9vbGVhbj4pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBCb29sVmVjdG9yKG5ldyBCb29sRGF0YShuZXcgQm9vbCgpLCBkYXRhLmxlbmd0aCwgbnVsbCwgcGFja0Jvb2xzKGRhdGEpKSBhcyBEYXRhPEJvb2w+KTtcbiAgICB9XG4gICAgcHVibGljIGdldCB2YWx1ZXMoKSB7IHJldHVybiB0aGlzLmRhdGEudmFsdWVzOyB9XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxCb29sPiwgdmlldzogVmlldzxCb29sPiA9IG5ldyBCb29sVmlldyhkYXRhKSkge1xuICAgICAgICBzdXBlcihkYXRhLCB2aWV3KTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBJbnRWZWN0b3I8VCBleHRlbmRzIEludCA9IEludDxhbnk+PiBleHRlbmRzIEZsYXRWZWN0b3I8VD4ge1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbShkYXRhOiBJbnQ4QXJyYXkpOiBJbnRWZWN0b3I8SW50OD47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGRhdGE6IEludDE2QXJyYXkpOiBJbnRWZWN0b3I8SW50MTY+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbShkYXRhOiBJbnQzMkFycmF5KTogSW50VmVjdG9yPEludDMyPjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb20oZGF0YTogVWludDhBcnJheSk6IEludFZlY3RvcjxVaW50OD47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGRhdGE6IFVpbnQxNkFycmF5KTogSW50VmVjdG9yPFVpbnQxNj47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGRhdGE6IFVpbnQzMkFycmF5KTogSW50VmVjdG9yPFVpbnQzMj47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGRhdGE6IEludDMyQXJyYXksIGlzNjQ6IHRydWUpOiBJbnRWZWN0b3I8SW50NjQ+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbShkYXRhOiBVaW50MzJBcnJheSwgaXM2NDogdHJ1ZSk6IEludFZlY3RvcjxVaW50NjQ+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbShkYXRhOiBhbnksIGlzNjQ/OiBib29sZWFuKSB7XG4gICAgICAgIGlmIChpczY0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YSBpbnN0YW5jZW9mIEludDMyQXJyYXlcbiAgICAgICAgICAgICAgICA/IG5ldyBJbnRWZWN0b3IobmV3IEZsYXREYXRhKG5ldyBJbnQ2NCgpLCBkYXRhLmxlbmd0aCwgbnVsbCwgZGF0YSkpXG4gICAgICAgICAgICAgICAgOiBuZXcgSW50VmVjdG9yKG5ldyBGbGF0RGF0YShuZXcgVWludDY0KCksIGRhdGEubGVuZ3RoLCBudWxsLCBkYXRhKSk7XG4gICAgICAgIH1cbiAgICAgICAgc3dpdGNoIChkYXRhLmNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICBjYXNlIEludDhBcnJheTogcmV0dXJuIG5ldyBJbnRWZWN0b3IobmV3IEZsYXREYXRhKG5ldyBJbnQ4KCksIGRhdGEubGVuZ3RoLCBudWxsLCBkYXRhKSk7XG4gICAgICAgICAgICBjYXNlIEludDE2QXJyYXk6IHJldHVybiBuZXcgSW50VmVjdG9yKG5ldyBGbGF0RGF0YShuZXcgSW50MTYoKSwgZGF0YS5sZW5ndGgsIG51bGwsIGRhdGEpKTtcbiAgICAgICAgICAgIGNhc2UgSW50MzJBcnJheTogcmV0dXJuIG5ldyBJbnRWZWN0b3IobmV3IEZsYXREYXRhKG5ldyBJbnQzMigpLCBkYXRhLmxlbmd0aCwgbnVsbCwgZGF0YSkpO1xuICAgICAgICAgICAgY2FzZSBVaW50OEFycmF5OiByZXR1cm4gbmV3IEludFZlY3RvcihuZXcgRmxhdERhdGEobmV3IFVpbnQ4KCksIGRhdGEubGVuZ3RoLCBudWxsLCBkYXRhKSk7XG4gICAgICAgICAgICBjYXNlIFVpbnQxNkFycmF5OiByZXR1cm4gbmV3IEludFZlY3RvcihuZXcgRmxhdERhdGEobmV3IFVpbnQxNigpLCBkYXRhLmxlbmd0aCwgbnVsbCwgZGF0YSkpO1xuICAgICAgICAgICAgY2FzZSBVaW50MzJBcnJheTogcmV0dXJuIG5ldyBJbnRWZWN0b3IobmV3IEZsYXREYXRhKG5ldyBVaW50MzIoKSwgZGF0YS5sZW5ndGgsIG51bGwsIGRhdGEpKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbnJlY29nbml6ZWQgSW50IGRhdGEnKTtcbiAgICB9XG4gICAgc3RhdGljIGRlZmF1bHRWaWV3PFQgZXh0ZW5kcyBJbnQ+KGRhdGE6IERhdGE8VD4pIHtcbiAgICAgICAgcmV0dXJuIGRhdGEudHlwZS5iaXRXaWR0aCA8PSAzMiA/IG5ldyBGbGF0VmlldyhkYXRhKSA6IG5ldyBGaXhlZFNpemVWaWV3KGRhdGEsIChkYXRhLnR5cGUuYml0V2lkdGggLyAzMikgfCAwKTtcbiAgICB9XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxUPiwgdmlldzogVmlldzxUPiA9IEludFZlY3Rvci5kZWZhdWx0VmlldyhkYXRhKSkge1xuICAgICAgICBzdXBlcihkYXRhLCB2aWV3KTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBGbG9hdFZlY3RvcjxUIGV4dGVuZHMgRmxvYXQgPSBGbG9hdDxhbnk+PiBleHRlbmRzIEZsYXRWZWN0b3I8VD4ge1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbShkYXRhOiBVaW50MTZBcnJheSk6IEZsb2F0VmVjdG9yPEZsb2F0MTY+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbShkYXRhOiBGbG9hdDMyQXJyYXkpOiBGbG9hdFZlY3RvcjxGbG9hdDMyPjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb20oZGF0YTogRmxvYXQ2NEFycmF5KTogRmxvYXRWZWN0b3I8RmxvYXQ2ND47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGRhdGE6IGFueSkge1xuICAgICAgICBzd2l0Y2ggKGRhdGEuY29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgIGNhc2UgVWludDE2QXJyYXk6IHJldHVybiBuZXcgRmxvYXRWZWN0b3IobmV3IEZsYXREYXRhKG5ldyBGbG9hdDE2KCksIGRhdGEubGVuZ3RoLCBudWxsLCBkYXRhKSk7XG4gICAgICAgICAgICBjYXNlIEZsb2F0MzJBcnJheTogcmV0dXJuIG5ldyBGbG9hdFZlY3RvcihuZXcgRmxhdERhdGEobmV3IEZsb2F0MzIoKSwgZGF0YS5sZW5ndGgsIG51bGwsIGRhdGEpKTtcbiAgICAgICAgICAgIGNhc2UgRmxvYXQ2NEFycmF5OiByZXR1cm4gbmV3IEZsb2F0VmVjdG9yKG5ldyBGbGF0RGF0YShuZXcgRmxvYXQ2NCgpLCBkYXRhLmxlbmd0aCwgbnVsbCwgZGF0YSkpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1VucmVjb2duaXplZCBGbG9hdCBkYXRhJyk7XG4gICAgfVxuICAgIHN0YXRpYyBkZWZhdWx0VmlldzxUIGV4dGVuZHMgRmxvYXQ+KGRhdGE6IERhdGE8VD4pOiBGbGF0Vmlldzxhbnk+IHtcbiAgICAgICAgcmV0dXJuIGRhdGEudHlwZS5wcmVjaXNpb24gIT09IFByZWNpc2lvbi5IQUxGID8gbmV3IEZsYXRWaWV3KGRhdGEpIDogbmV3IEZsb2F0MTZWaWV3KGRhdGEgYXMgRGF0YTxGbG9hdDE2Pik7XG4gICAgfVxuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8VD4sIHZpZXc6IFZpZXc8VD4gPSBGbG9hdFZlY3Rvci5kZWZhdWx0VmlldyhkYXRhKSkge1xuICAgICAgICBzdXBlcihkYXRhLCB2aWV3KTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBEYXRlVmVjdG9yIGV4dGVuZHMgRmxhdFZlY3RvcjxEYXRlXz4ge1xuICAgIHN0YXRpYyBkZWZhdWx0VmlldzxUIGV4dGVuZHMgRGF0ZV8+KGRhdGE6IERhdGE8VD4pIHtcbiAgICAgICAgcmV0dXJuIGRhdGEudHlwZS51bml0ID09PSBEYXRlVW5pdC5EQVkgPyBuZXcgRGF0ZURheVZpZXcoZGF0YSkgOiBuZXcgRGF0ZU1pbGxpc2Vjb25kVmlldyhkYXRhLCAyKTtcbiAgICB9XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxEYXRlXz4sIHZpZXc6IFZpZXc8RGF0ZV8+ID0gRGF0ZVZlY3Rvci5kZWZhdWx0VmlldyhkYXRhKSkge1xuICAgICAgICBzdXBlcihkYXRhLCB2aWV3KTtcbiAgICB9XG4gICAgcHVibGljIGxvd3MoKTogSW50VmVjdG9yPEludDMyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnR5cGUudW5pdCA9PT0gRGF0ZVVuaXQuREFZID8gdGhpcy5hc0ludDMyKDAsIDEpIDogdGhpcy5hc0ludDMyKDAsIDIpO1xuICAgIH1cbiAgICBwdWJsaWMgaGlnaHMoKTogSW50VmVjdG9yPEludDMyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnR5cGUudW5pdCA9PT0gRGF0ZVVuaXQuREFZID8gdGhpcy5hc0ludDMyKDAsIDEpIDogdGhpcy5hc0ludDMyKDEsIDIpO1xuICAgIH1cbiAgICBwdWJsaWMgYXNFcG9jaE1pbGxpc2Vjb25kcygpOiBJbnRWZWN0b3I8SW50MzI+IHtcbiAgICAgICAgbGV0IGRhdGEgPSAodGhpcy5kYXRhIGFzIEZsYXREYXRhPGFueT4pLmNsb25lKG5ldyBJbnQzMigpKTtcbiAgICAgICAgc3dpdGNoICh0aGlzLnR5cGUudW5pdCkge1xuICAgICAgICAgICAgY2FzZSBEYXRlVW5pdC5EQVk6IHJldHVybiBuZXcgSW50VmVjdG9yKGRhdGEsIG5ldyBUaW1lc3RhbXBEYXlWaWV3KGRhdGEgYXMgYW55LCAxKSBhcyBhbnkpO1xuICAgICAgICAgICAgY2FzZSBEYXRlVW5pdC5NSUxMSVNFQ09ORDogcmV0dXJuIG5ldyBJbnRWZWN0b3IoZGF0YSwgbmV3IFRpbWVzdGFtcE1pbGxpc2Vjb25kVmlldyhkYXRhIGFzIGFueSwgMikgYXMgYW55KTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBVbnJlY29nbml6ZWQgZGF0ZSB1bml0IFwiJHtEYXRlVW5pdFt0aGlzLnR5cGUudW5pdF19XCJgKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBEZWNpbWFsVmVjdG9yIGV4dGVuZHMgRmxhdFZlY3RvcjxEZWNpbWFsPiB7XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxEZWNpbWFsPiwgdmlldzogVmlldzxEZWNpbWFsPiA9IG5ldyBGaXhlZFNpemVWaWV3KGRhdGEsIDQpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFRpbWVWZWN0b3IgZXh0ZW5kcyBGbGF0VmVjdG9yPFRpbWU+IHtcbiAgICBzdGF0aWMgZGVmYXVsdFZpZXc8VCBleHRlbmRzIFRpbWU+KGRhdGE6IERhdGE8VD4pIHtcbiAgICAgICAgcmV0dXJuIGRhdGEudHlwZS5iaXRXaWR0aCA8PSAzMiA/IG5ldyBGbGF0VmlldyhkYXRhKSA6IG5ldyBGaXhlZFNpemVWaWV3KGRhdGEsIChkYXRhLnR5cGUuYml0V2lkdGggLyAzMikgfCAwKTtcbiAgICB9XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxUaW1lPiwgdmlldzogVmlldzxUaW1lPiA9IFRpbWVWZWN0b3IuZGVmYXVsdFZpZXcoZGF0YSkpIHtcbiAgICAgICAgc3VwZXIoZGF0YSwgdmlldyk7XG4gICAgfVxuICAgIHB1YmxpYyBsb3dzKCk6IEludFZlY3RvcjxJbnQzMj4ge1xuICAgICAgICByZXR1cm4gdGhpcy50eXBlLmJpdFdpZHRoIDw9IDMyID8gdGhpcy5hc0ludDMyKDAsIDEpIDogdGhpcy5hc0ludDMyKDAsIDIpO1xuICAgIH1cbiAgICBwdWJsaWMgaGlnaHMoKTogSW50VmVjdG9yPEludDMyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnR5cGUuYml0V2lkdGggPD0gMzIgPyB0aGlzLmFzSW50MzIoMCwgMSkgOiB0aGlzLmFzSW50MzIoMSwgMik7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgVGltZXN0YW1wVmVjdG9yIGV4dGVuZHMgRmxhdFZlY3RvcjxUaW1lc3RhbXA+IHtcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPFRpbWVzdGFtcD4sIHZpZXc6IFZpZXc8VGltZXN0YW1wPiA9IG5ldyBGaXhlZFNpemVWaWV3KGRhdGEsIDIpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbiAgICBwdWJsaWMgYXNFcG9jaE1pbGxpc2Vjb25kcygpOiBJbnRWZWN0b3I8SW50MzI+IHtcbiAgICAgICAgbGV0IGRhdGEgPSAodGhpcy5kYXRhIGFzIEZsYXREYXRhPGFueT4pLmNsb25lKG5ldyBJbnQzMigpKTtcbiAgICAgICAgc3dpdGNoICh0aGlzLnR5cGUudW5pdCkge1xuICAgICAgICAgICAgY2FzZSBUaW1lVW5pdC5TRUNPTkQ6IHJldHVybiBuZXcgSW50VmVjdG9yKGRhdGEsIG5ldyBUaW1lc3RhbXBTZWNvbmRWaWV3KGRhdGEgYXMgYW55LCAxKSBhcyBhbnkpO1xuICAgICAgICAgICAgY2FzZSBUaW1lVW5pdC5NSUxMSVNFQ09ORDogcmV0dXJuIG5ldyBJbnRWZWN0b3IoZGF0YSwgbmV3IFRpbWVzdGFtcE1pbGxpc2Vjb25kVmlldyhkYXRhIGFzIGFueSwgMikgYXMgYW55KTtcbiAgICAgICAgICAgIGNhc2UgVGltZVVuaXQuTUlDUk9TRUNPTkQ6IHJldHVybiBuZXcgSW50VmVjdG9yKGRhdGEsIG5ldyBUaW1lc3RhbXBNaWNyb3NlY29uZFZpZXcoZGF0YSBhcyBhbnksIDIpIGFzIGFueSk7XG4gICAgICAgICAgICBjYXNlIFRpbWVVbml0Lk5BTk9TRUNPTkQ6IHJldHVybiBuZXcgSW50VmVjdG9yKGRhdGEsIG5ldyBUaW1lc3RhbXBOYW5vc2Vjb25kVmlldyhkYXRhIGFzIGFueSwgMikgYXMgYW55KTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBVbnJlY29nbml6ZWQgdGltZSB1bml0IFwiJHtUaW1lVW5pdFt0aGlzLnR5cGUudW5pdF19XCJgKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBJbnRlcnZhbFZlY3RvciBleHRlbmRzIEZsYXRWZWN0b3I8SW50ZXJ2YWw+IHtcbiAgICBzdGF0aWMgZGVmYXVsdFZpZXc8VCBleHRlbmRzIEludGVydmFsPihkYXRhOiBEYXRhPFQ+KSB7XG4gICAgICAgIHJldHVybiBkYXRhLnR5cGUudW5pdCA9PT0gSW50ZXJ2YWxVbml0LllFQVJfTU9OVEggPyBuZXcgSW50ZXJ2YWxZZWFyTW9udGhWaWV3KGRhdGEpIDogbmV3IEZpeGVkU2l6ZVZpZXcoZGF0YSwgMik7XG4gICAgfVxuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8SW50ZXJ2YWw+LCB2aWV3OiBWaWV3PEludGVydmFsPiA9IEludGVydmFsVmVjdG9yLmRlZmF1bHRWaWV3KGRhdGEpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbiAgICBwdWJsaWMgbG93cygpOiBJbnRWZWN0b3I8SW50MzI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMudHlwZS51bml0ID09PSBJbnRlcnZhbFVuaXQuWUVBUl9NT05USCA/IHRoaXMuYXNJbnQzMigwLCAxKSA6IHRoaXMuYXNJbnQzMigwLCAyKTtcbiAgICB9XG4gICAgcHVibGljIGhpZ2hzKCk6IEludFZlY3RvcjxJbnQzMj4ge1xuICAgICAgICByZXR1cm4gdGhpcy50eXBlLnVuaXQgPT09IEludGVydmFsVW5pdC5ZRUFSX01PTlRIID8gdGhpcy5hc0ludDMyKDAsIDEpIDogdGhpcy5hc0ludDMyKDEsIDIpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEJpbmFyeVZlY3RvciBleHRlbmRzIExpc3RWZWN0b3JCYXNlPEJpbmFyeT4ge1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8QmluYXJ5PiwgdmlldzogVmlldzxCaW5hcnk+ID0gbmV3IEJpbmFyeVZpZXcoZGF0YSkpIHtcbiAgICAgICAgc3VwZXIoZGF0YSwgdmlldyk7XG4gICAgfVxuICAgIHB1YmxpYyBhc1V0ZjgoKSB7XG4gICAgICAgIHJldHVybiBuZXcgVXRmOFZlY3RvcigodGhpcy5kYXRhIGFzIEZsYXRMaXN0RGF0YTxhbnk+KS5jbG9uZShuZXcgVXRmOCgpKSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgRml4ZWRTaXplQmluYXJ5VmVjdG9yIGV4dGVuZHMgRmxhdFZlY3RvcjxGaXhlZFNpemVCaW5hcnk+IHtcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPEZpeGVkU2l6ZUJpbmFyeT4sIHZpZXc6IFZpZXc8Rml4ZWRTaXplQmluYXJ5PiA9IG5ldyBGaXhlZFNpemVWaWV3KGRhdGEsIGRhdGEudHlwZS5ieXRlV2lkdGgpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFV0ZjhWZWN0b3IgZXh0ZW5kcyBMaXN0VmVjdG9yQmFzZTxVdGY4PiB7XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxVdGY4PiwgdmlldzogVmlldzxVdGY4PiA9IG5ldyBVdGY4VmlldyhkYXRhKSkge1xuICAgICAgICBzdXBlcihkYXRhLCB2aWV3KTtcbiAgICB9XG4gICAgcHVibGljIGFzQmluYXJ5KCkge1xuICAgICAgICByZXR1cm4gbmV3IEJpbmFyeVZlY3RvcigodGhpcy5kYXRhIGFzIEZsYXRMaXN0RGF0YTxhbnk+KS5jbG9uZShuZXcgQmluYXJ5KCkpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBMaXN0VmVjdG9yPFQgZXh0ZW5kcyBEYXRhVHlwZSA9IERhdGFUeXBlPiBleHRlbmRzIExpc3RWZWN0b3JCYXNlPExpc3Q8VD4+IHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIHJlYWRvbmx5IHZpZXc6IExpc3RWaWV3PFQ+O1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8TGlzdDxUPj4sIHZpZXc6IExpc3RWaWV3PFQ+ID0gbmV3IExpc3RWaWV3PFQ+KGRhdGEgYXMgYW55KSkge1xuICAgICAgICBzdXBlcihkYXRhLCB2aWV3KTtcbiAgICB9XG4gICAgcHVibGljIGdldENoaWxkQXQoaW5kZXg6IG51bWJlcik6IFZlY3RvcjxUPiB8IG51bGwge1xuICAgICAgICByZXR1cm4gdGhpcy52aWV3LmdldENoaWxkQXQ8VD4oaW5kZXgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEZpeGVkU2l6ZUxpc3RWZWN0b3I8VCBleHRlbmRzIERhdGFUeXBlID0gRGF0YVR5cGU+IGV4dGVuZHMgVmVjdG9yPEZpeGVkU2l6ZUxpc3Q8VD4+IHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIHJlYWRvbmx5IHZpZXc6IEZpeGVkU2l6ZUxpc3RWaWV3PFQ+O1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8Rml4ZWRTaXplTGlzdDxUPj4sIHZpZXc6IFZpZXc8Rml4ZWRTaXplTGlzdDxUPj4gPSBuZXcgRml4ZWRTaXplTGlzdFZpZXcoZGF0YSkpIHtcbiAgICAgICAgc3VwZXIoZGF0YSwgdmlldyk7XG4gICAgfVxuICAgIHB1YmxpYyBnZXRDaGlsZEF0KGluZGV4OiBudW1iZXIpOiBWZWN0b3I8VD4gfCBudWxsIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmlldy5nZXRDaGlsZEF0PFQ+KGluZGV4KTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBNYXBWZWN0b3IgZXh0ZW5kcyBOZXN0ZWRWZWN0b3I8TWFwXz4ge1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8TWFwXz4sIHZpZXc6IFZpZXc8TWFwXz4gPSBuZXcgTWFwVmlldyhkYXRhKSkge1xuICAgICAgICBzdXBlcihkYXRhLCB2aWV3KTtcbiAgICB9XG4gICAgcHVibGljIGFzU3RydWN0KCkge1xuICAgICAgICByZXR1cm4gbmV3IFN0cnVjdFZlY3RvcigodGhpcy5kYXRhIGFzIE5lc3RlZERhdGE8YW55PikuY2xvbmUobmV3IFN0cnVjdCh0aGlzLnR5cGUuY2hpbGRyZW4pKSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgU3RydWN0VmVjdG9yIGV4dGVuZHMgTmVzdGVkVmVjdG9yPFN0cnVjdD4ge1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8U3RydWN0PiwgdmlldzogVmlldzxTdHJ1Y3Q+ID0gbmV3IFN0cnVjdFZpZXcoZGF0YSkpIHtcbiAgICAgICAgc3VwZXIoZGF0YSwgdmlldyk7XG4gICAgfVxuICAgIHB1YmxpYyBhc01hcChrZXlzU29ydGVkOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBNYXBWZWN0b3IoKHRoaXMuZGF0YSBhcyBOZXN0ZWREYXRhPGFueT4pLmNsb25lKG5ldyBNYXBfKGtleXNTb3J0ZWQsIHRoaXMudHlwZS5jaGlsZHJlbikpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBVbmlvblZlY3RvcjxUIGV4dGVuZHMgKFNwYXJzZVVuaW9uIHwgRGVuc2VVbmlvbikgPSBhbnk+IGV4dGVuZHMgTmVzdGVkVmVjdG9yPFQ+IHtcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPFQ+LCB2aWV3OiBWaWV3PFQ+ID0gPGFueT4gKGRhdGEudHlwZS5tb2RlID09PSBVbmlvbk1vZGUuU3BhcnNlID8gbmV3IFVuaW9uVmlldzxTcGFyc2VVbmlvbj4oZGF0YSBhcyBEYXRhPFNwYXJzZVVuaW9uPikgOiBuZXcgRGVuc2VVbmlvblZpZXcoZGF0YSBhcyBEYXRhPERlbnNlVW5pb24+KSkpIHtcbiAgICAgICAgc3VwZXIoZGF0YSwgdmlldyk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgRGljdGlvbmFyeVZlY3RvcjxUIGV4dGVuZHMgRGF0YVR5cGUgPSBEYXRhVHlwZT4gZXh0ZW5kcyBWZWN0b3I8RGljdGlvbmFyeTxUPj4ge1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgcmVhZG9ubHkgaW5kaWNlczogVmVjdG9yPEludD47XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyByZWFkb25seSBkaWN0aW9uYXJ5OiBWZWN0b3I8VD47XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxEaWN0aW9uYXJ5PFQ+PiwgdmlldzogVmlldzxEaWN0aW9uYXJ5PFQ+PiA9IG5ldyBEaWN0aW9uYXJ5VmlldzxUPihkYXRhLmRpY3Rpb25hcnksIG5ldyBJbnRWZWN0b3IoZGF0YS5pbmRpY2VzKSkpIHtcbiAgICAgICAgc3VwZXIoZGF0YSBhcyBEYXRhPGFueT4sIHZpZXcpO1xuICAgICAgICBpZiAodmlldyBpbnN0YW5jZW9mIFZhbGlkaXR5Vmlldykge1xuICAgICAgICAgICAgdmlldyA9ICh2aWV3IGFzIGFueSkudmlldztcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YSBpbnN0YW5jZW9mIERpY3Rpb25hcnlEYXRhICYmIHZpZXcgaW5zdGFuY2VvZiBEaWN0aW9uYXJ5Vmlldykge1xuICAgICAgICAgICAgdGhpcy5pbmRpY2VzID0gdmlldy5pbmRpY2VzO1xuICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJ5ID0gZGF0YS5kaWN0aW9uYXJ5O1xuICAgICAgICB9IGVsc2UgaWYgKGRhdGEgaW5zdGFuY2VvZiBDaHVua2VkRGF0YSAmJiB2aWV3IGluc3RhbmNlb2YgQ2h1bmtlZFZpZXcpIHtcbiAgICAgICAgICAgIGNvbnN0IGNodW5rcyA9IHZpZXcuY2h1bmtWZWN0b3JzIGFzIERpY3Rpb25hcnlWZWN0b3I8VD5bXTtcbiAgICAgICAgICAgIC8vIEFzc3VtZSB0aGUgbGFzdCBjaHVuaydzIGRpY3Rpb25hcnkgZGF0YSBpcyB0aGUgbW9zdCB1cC10by1kYXRlLFxuICAgICAgICAgICAgLy8gaW5jbHVkaW5nIGRhdGEgZnJvbSBEaWN0aW9uYXJ5QmF0Y2hlcyB0aGF0IHdlcmUgbWFya2VkIGFzIGRlbHRhc1xuICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJ5ID0gY2h1bmtzW2NodW5rcy5sZW5ndGggLSAxXS5kaWN0aW9uYXJ5O1xuICAgICAgICAgICAgdGhpcy5pbmRpY2VzID0gY2h1bmtzLnJlZHVjZTxWZWN0b3I8SW50PiB8IG51bGw+KFxuICAgICAgICAgICAgICAgIChpZHhzOiBWZWN0b3I8SW50PiB8IG51bGwsIGRpY3Q6IERpY3Rpb25hcnlWZWN0b3I8VD4pID0+XG4gICAgICAgICAgICAgICAgICAgICFpZHhzID8gZGljdC5pbmRpY2VzISA6IGlkeHMuY29uY2F0KGRpY3QuaW5kaWNlcyEpLFxuICAgICAgICAgICAgICAgIG51bGxcbiAgICAgICAgICAgICkhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVW5yZWNvZ25pemVkIERpY3Rpb25hcnlWZWN0b3Igdmlld2ApO1xuICAgICAgICB9XG4gICAgfVxuICAgIHB1YmxpYyBnZXRLZXkoaW5kZXg6IG51bWJlcikgeyByZXR1cm4gdGhpcy5pbmRpY2VzLmdldChpbmRleCk7IH1cbiAgICBwdWJsaWMgZ2V0VmFsdWUoa2V5OiBudW1iZXIpIHsgcmV0dXJuIHRoaXMuZGljdGlvbmFyeS5nZXQoa2V5KTsgfVxuICAgIHB1YmxpYyByZXZlcnNlTG9va3VwKHZhbHVlOiBUKSB7IHJldHVybiB0aGlzLmRpY3Rpb25hcnkuaW5kZXhPZih2YWx1ZSk7IH1cbn1cblxuZXhwb3J0IGNvbnN0IGNyZWF0ZVZlY3RvciA9ICgoVmVjdG9yTG9hZGVyOiBuZXcgPFQgZXh0ZW5kcyBEYXRhVHlwZT4oZGF0YTogRGF0YTxUPikgPT4gVHlwZVZpc2l0b3IpID0+IChcbiAgICA8VCBleHRlbmRzIERhdGFUeXBlPihkYXRhOiBEYXRhPFQ+KSA9PiBUeXBlVmlzaXRvci52aXNpdFR5cGVJbmxpbmUobmV3IFZlY3RvckxvYWRlcihkYXRhKSwgZGF0YS50eXBlKSBhcyBWZWN0b3I8VD5cbikpKGNsYXNzIFZlY3RvckxvYWRlcjxUIGV4dGVuZHMgRGF0YVR5cGU+IGV4dGVuZHMgVHlwZVZpc2l0b3Ige1xuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgZGF0YTogRGF0YTxUPikgeyBzdXBlcigpOyB9XG4gICAgdmlzaXROdWxsICAgICAgICAgICAoX3R5cGU6IE51bGwpICAgICAgICAgICAgeyByZXR1cm4gbmV3IE51bGxWZWN0b3IoPGFueT4gdGhpcy5kYXRhKTsgICAgICAgICAgICB9XG4gICAgdmlzaXRJbnQgICAgICAgICAgICAoX3R5cGU6IEludCkgICAgICAgICAgICAgeyByZXR1cm4gbmV3IEludFZlY3Rvcig8YW55PiB0aGlzLmRhdGEpOyAgICAgICAgICAgICB9XG4gICAgdmlzaXRGbG9hdCAgICAgICAgICAoX3R5cGU6IEZsb2F0KSAgICAgICAgICAgeyByZXR1cm4gbmV3IEZsb2F0VmVjdG9yKDxhbnk+IHRoaXMuZGF0YSk7ICAgICAgICAgICB9XG4gICAgdmlzaXRCaW5hcnkgICAgICAgICAoX3R5cGU6IEJpbmFyeSkgICAgICAgICAgeyByZXR1cm4gbmV3IEJpbmFyeVZlY3Rvcig8YW55PiB0aGlzLmRhdGEpOyAgICAgICAgICB9XG4gICAgdmlzaXRVdGY4ICAgICAgICAgICAoX3R5cGU6IFV0ZjgpICAgICAgICAgICAgeyByZXR1cm4gbmV3IFV0ZjhWZWN0b3IoPGFueT4gdGhpcy5kYXRhKTsgICAgICAgICAgICB9XG4gICAgdmlzaXRCb29sICAgICAgICAgICAoX3R5cGU6IEJvb2wpICAgICAgICAgICAgeyByZXR1cm4gbmV3IEJvb2xWZWN0b3IoPGFueT4gdGhpcy5kYXRhKTsgICAgICAgICAgICB9XG4gICAgdmlzaXREZWNpbWFsICAgICAgICAoX3R5cGU6IERlY2ltYWwpICAgICAgICAgeyByZXR1cm4gbmV3IERlY2ltYWxWZWN0b3IoPGFueT4gdGhpcy5kYXRhKTsgICAgICAgICB9XG4gICAgdmlzaXREYXRlICAgICAgICAgICAoX3R5cGU6IERhdGVfKSAgICAgICAgICAgeyByZXR1cm4gbmV3IERhdGVWZWN0b3IoPGFueT4gdGhpcy5kYXRhKTsgICAgICAgICAgICB9XG4gICAgdmlzaXRUaW1lICAgICAgICAgICAoX3R5cGU6IFRpbWUpICAgICAgICAgICAgeyByZXR1cm4gbmV3IFRpbWVWZWN0b3IoPGFueT4gdGhpcy5kYXRhKTsgICAgICAgICAgICB9XG4gICAgdmlzaXRUaW1lc3RhbXAgICAgICAoX3R5cGU6IFRpbWVzdGFtcCkgICAgICAgeyByZXR1cm4gbmV3IFRpbWVzdGFtcFZlY3Rvcig8YW55PiB0aGlzLmRhdGEpOyAgICAgICB9XG4gICAgdmlzaXRJbnRlcnZhbCAgICAgICAoX3R5cGU6IEludGVydmFsKSAgICAgICAgeyByZXR1cm4gbmV3IEludGVydmFsVmVjdG9yKDxhbnk+IHRoaXMuZGF0YSk7ICAgICAgICB9XG4gICAgdmlzaXRMaXN0ICAgICAgICAgICAoX3R5cGU6IExpc3QpICAgICAgICAgICAgeyByZXR1cm4gbmV3IExpc3RWZWN0b3IoPGFueT4gdGhpcy5kYXRhKTsgICAgICAgICAgICB9XG4gICAgdmlzaXRTdHJ1Y3QgICAgICAgICAoX3R5cGU6IFN0cnVjdCkgICAgICAgICAgeyByZXR1cm4gbmV3IFN0cnVjdFZlY3Rvcig8YW55PiB0aGlzLmRhdGEpOyAgICAgICAgICB9XG4gICAgdmlzaXRVbmlvbiAgICAgICAgICAoX3R5cGU6IFVuaW9uKSAgICAgICAgICAgeyByZXR1cm4gbmV3IFVuaW9uVmVjdG9yKDxhbnk+IHRoaXMuZGF0YSk7ICAgICAgICAgICB9XG4gICAgdmlzaXRGaXhlZFNpemVCaW5hcnkoX3R5cGU6IEZpeGVkU2l6ZUJpbmFyeSkgeyByZXR1cm4gbmV3IEZpeGVkU2l6ZUJpbmFyeVZlY3Rvcig8YW55PiB0aGlzLmRhdGEpOyB9XG4gICAgdmlzaXRGaXhlZFNpemVMaXN0ICAoX3R5cGU6IEZpeGVkU2l6ZUxpc3QpICAgeyByZXR1cm4gbmV3IEZpeGVkU2l6ZUxpc3RWZWN0b3IoPGFueT4gdGhpcy5kYXRhKTsgICB9XG4gICAgdmlzaXRNYXAgICAgICAgICAgICAoX3R5cGU6IE1hcF8pICAgICAgICAgICAgeyByZXR1cm4gbmV3IE1hcFZlY3Rvcig8YW55PiB0aGlzLmRhdGEpOyAgICAgICAgICAgICB9XG4gICAgdmlzaXREaWN0aW9uYXJ5ICAgICAoX3R5cGU6IERpY3Rpb25hcnkpICAgICAgeyByZXR1cm4gbmV3IERpY3Rpb25hcnlWZWN0b3IoPGFueT4gdGhpcy5kYXRhKTsgICAgICB9XG59KTtcbiJdfQ==

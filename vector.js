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
        else if (!(view instanceof flat_1.ValidityView) && (nulls = data.nullBitmap) && nulls.length > 0 && data.nullCount > 0) {
            this.view = new flat_1.ValidityView(data, view);
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
        let data = this.data.clone(new type_3.Int32());
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
const type_4 = require("./type");
const type_3 = require("./type");
const type_5 = require("./type");
const chunked_1 = require("./vector/chunked");
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
        return new BoolVector(new data_1.BoolData(new type_4.Bool(), data.length, null, bit_1.packBools(data)));
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
                ? new IntVector(new data_1.FlatData(new type_3.Int64(), data.length, null, data))
                : new IntVector(new data_1.FlatData(new type_3.Uint64(), data.length, null, data));
        }
        switch (data.constructor) {
            case Int8Array: return new IntVector(new data_1.FlatData(new type_3.Int8(), data.length, null, data));
            case Int16Array: return new IntVector(new data_1.FlatData(new type_3.Int16(), data.length, null, data));
            case Int32Array: return new IntVector(new data_1.FlatData(new type_3.Int32(), data.length, null, data));
            case Uint8Array: return new IntVector(new data_1.FlatData(new type_3.Uint8(), data.length, null, data));
            case Uint16Array: return new IntVector(new data_1.FlatData(new type_3.Uint16(), data.length, null, data));
            case Uint32Array: return new IntVector(new data_1.FlatData(new type_3.Uint32(), data.length, null, data));
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
            case Uint16Array: return new FloatVector(new data_1.FlatData(new type_3.Float16(), data.length, null, data));
            case Float32Array: return new FloatVector(new data_1.FlatData(new type_3.Float32(), data.length, null, data));
            case Float64Array: return new FloatVector(new data_1.FlatData(new type_3.Float64(), data.length, null, data));
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
        let data = this.data.clone(new type_3.Int32());
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
        let data = this.data.clone(new type_3.Int32());
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
        return new Utf8Vector(this.data.clone(new type_4.Utf8()));
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
        return new BinaryVector(this.data.clone(new type_4.Binary()));
    }
}
exports.Utf8Vector = Utf8Vector;
class ListVector extends ListVectorBase {
    constructor(data, view = new list_1.ListView(data)) {
        super(data, view);
    }
}
exports.ListVector = ListVector;
class FixedSizeListVector extends Vector {
    constructor(data, view = new list_1.FixedSizeListView(data)) {
        super(data, view);
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
        if (view instanceof flat_1.ValidityView) {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInZlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsNkRBQTZEO0FBQzdELCtEQUErRDtBQUMvRCx3REFBd0Q7QUFDeEQsNkRBQTZEO0FBQzdELG9EQUFvRDtBQUNwRCw2REFBNkQ7QUFDN0QsNkRBQTZEO0FBQzdELEVBQUU7QUFDRiwrQ0FBK0M7QUFDL0MsRUFBRTtBQUNGLDZEQUE2RDtBQUM3RCw4REFBOEQ7QUFDOUQseURBQXlEO0FBQ3pELDREQUE0RDtBQUM1RCwwREFBMEQ7QUFDMUQscUJBQXFCOztBQUVyQixpQ0FBeUc7QUFDekcsdUNBQW9FO0FBQ3BFLGlDQUEwRjtBQUMxRixpQ0FBeUY7QUFjekY7SUFXSSxZQUFZLElBQWEsRUFBRSxJQUFhO1FBQ3BDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztRQUN0QixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDMUIsSUFBSSxLQUFpQixDQUFDO1FBQ3RCLEVBQUUsQ0FBQyxDQUFDLENBQU8sSUFBSSxZQUFZLGtCQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxZQUFZLHFCQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEUsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLHFCQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEMsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxZQUFZLG1CQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsVUFBVyxDQUFDLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pILElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxtQkFBWSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNyQixDQUFDO0lBQ0wsQ0FBQztJQXRCTSxNQUFNLENBQUMsTUFBTSxDQUFxQixJQUFhO1FBQ2xELE1BQU0sQ0FBQyxvQkFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFDTSxNQUFNLENBQUMsTUFBTSxDQUFxQixNQUF5QixFQUFFLEdBQUcsTUFBbUI7UUFDdEYsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFPLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBbUJELElBQVcsU0FBUyxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDdEQsSUFBVyxVQUFVLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUN4RCxJQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQztRQUMzQixNQUFNLENBQUMsVUFBVSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDO0lBQ3RELENBQUM7SUFDTSxNQUFNLEtBQVUsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDeEMsS0FBSyxDQUFjLElBQWEsRUFBRSxPQUFnQixJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQVE7UUFDakYsTUFBTSxDQUFDLElBQUssSUFBSSxDQUFDLFdBQW1CLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFDTSxPQUFPLENBQUMsS0FBYTtRQUN4QixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUNNLEdBQUcsQ0FBQyxLQUFhO1FBQ3BCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBQ00sR0FBRyxDQUFDLEtBQWEsRUFBRSxLQUFrQjtRQUN4QyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFDTSxPQUFPO1FBQ1YsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDL0IsQ0FBQztJQUNNLE9BQU8sQ0FBQyxLQUFrQjtRQUM3QixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUNNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUNwQixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztJQUN4QyxDQUFDO0lBQ00sTUFBTSxDQUFDLEdBQUcsTUFBbUI7UUFDaEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pELE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFDaEIsQ0FBQztRQUNELE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFDdEIsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksWUFBWSxxQkFBVyxDQUFDO1lBQ3ZDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLE1BQU0sQ0FBQztZQUNuQixDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsR0FBRyxNQUFNLENBQUMsQ0FBQztRQUN4QyxNQUFNLE9BQU8sR0FBRyxrQkFBVyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqRCxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNqRCxNQUFNLFdBQVcsR0FBRyxJQUFJLGtCQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNuRixNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsSUFBSSxxQkFBVyxDQUFDLFdBQVcsQ0FBQyxDQUFTLENBQUM7SUFDekUsQ0FBQztJQUNNLEtBQUssQ0FBQyxLQUFjLEVBQUUsR0FBWTtRQUNyQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQ3RCLElBQUksSUFBSSxHQUFJLElBQUksQ0FBQyxJQUFZLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQztRQUN4QyxJQUFJLEtBQUssR0FBRyxNQUFNLEVBQUUsSUFBSSxHQUFHLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztRQUMvQyxJQUFJLEVBQUUsR0FBRyxDQUFDLE9BQU8sR0FBRyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDeEQsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFBQyxFQUFFLEdBQUcsS0FBSyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDO1FBQUMsQ0FBQztRQUMvQyxFQUFFLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUFDLElBQUksR0FBRyxLQUFLLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUM7UUFBQyxDQUFDO1FBQ3JELEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFBQyxDQUFDO1FBQzNDLEtBQUssR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNoRSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNsRSxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQVMsQ0FBQztJQUN2RSxDQUFDO0lBRU0saUJBQWlCLENBQUMsT0FBb0I7UUFDekMsTUFBTSxDQUFDLHFCQUFXLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDM0QsQ0FBQztJQUNNLG1CQUFtQixDQUFDLE9BQXNCO1FBQzdDLE1BQU0sQ0FBQyx1QkFBYSxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNuRSxDQUFDO0NBQ0o7QUFwRkQsd0JBb0ZDO0FBRUQsZ0JBQXFELFNBQVEsTUFBUztJQUNsRSxJQUFXLE1BQU0sS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ3pDLElBQUksS0FBdUIsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2RCxLQUFLLEtBQXVCLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDeEQsT0FBTyxDQUFDLFNBQWlCLENBQUMsRUFBRSxTQUFpQixDQUFDO1FBQ2pELElBQUksSUFBSSxHQUFJLElBQUksQ0FBQyxJQUFzQixDQUFDLEtBQUssQ0FBQyxJQUFJLFlBQUssRUFBRSxDQUFDLENBQUM7UUFDM0QsRUFBRSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDYixJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsQ0FBQztRQUNwRCxDQUFDO1FBQ0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksb0JBQWEsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNwRSxNQUFNLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQ2xCLENBQUM7Q0FDSjtBQWJELGdDQWFDO0FBRUQsb0JBQTBFLFNBQVEsTUFBUztJQUN2RixJQUFXLE1BQU0sS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ2hELElBQVcsWUFBWSxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFDckQsY0FBYyxDQUFDLEtBQWE7UUFDL0IsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUNNLGNBQWMsQ0FBQyxLQUFhO1FBQy9CLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ25FLENBQUM7Q0FDSjtBQVRELHdDQVNDO0FBRUQsa0JBQXlELFNBQVEsTUFBUztJQUsvRCxVQUFVLENBQWdDLEtBQWE7UUFDMUQsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFJLEtBQUssQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFDRCxJQUFXLFNBQVM7UUFDaEIsSUFBSSxJQUEyQixDQUFDO1FBQ2hDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0IsOENBQThDO1lBQzlDLE1BQU0sQ0FBQyxJQUFtQixDQUFDO1FBQy9CLENBQUM7UUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFPLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxrQkFBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVELGlFQUFpRTtZQUNqRSxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBSSxJQUFzQixDQUFDLFNBQVMsQ0FBQztRQUMvRCxDQUFDO1FBQ0QsaUZBQWlGO1FBQ2pGLG9GQUFvRjtRQUNwRix1RkFBdUY7UUFDdkYsTUFBTSxNQUFNLEdBQUssSUFBdUIsQ0FBQyxZQUFrQyxDQUFDO1FBQzVFLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLE1BQU07YUFDMUIsTUFBTSxDQUF5QixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTO2FBQy9ELE1BQU0sQ0FBeUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FDNUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUN4RCxJQUFJLElBQUksSUFBSSxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBbUIsQ0FBQzthQUNqRCxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNuRCxDQUFDO0NBQ0o7QUE1QkQsb0NBNEJDO0FBRUQsaUNBQW1EO0FBRW5ELGlDQUE2RztBQUM3RyxpQ0FBa0g7QUFFbEgsOENBQStDO0FBQy9DLG9EQUFxRDtBQUNyRCx3Q0FBa0Y7QUFDbEYsNENBQTZGO0FBQzdGLHdDQUFzSDtBQUN0SCx3Q0FBd0Y7QUFDeEYsd0NBQW1KO0FBQ25KLG9DQUF1QztBQUV2QyxnQkFBd0IsU0FBUSxNQUFZO0lBQ3hDLFlBQVksSUFBZ0IsRUFBRSxPQUFtQixJQUFJLGVBQVEsQ0FBQyxJQUFJLENBQUM7UUFDL0QsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN0QixDQUFDO0NBQ0o7QUFKRCxnQ0FJQztBQUVELGdCQUF3QixTQUFRLE1BQVk7SUFDakMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFnQztRQUMvQyxNQUFNLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxlQUFRLENBQUMsSUFBSSxXQUFJLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxlQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3hGLENBQUM7SUFDRCxJQUFXLE1BQU0sS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ2hELFlBQVksSUFBZ0IsRUFBRSxPQUFtQixJQUFJLGVBQVEsQ0FBQyxJQUFJLENBQUM7UUFDL0QsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN0QixDQUFDO0NBQ0o7QUFSRCxnQ0FRQztBQUVELGVBQWlELFNBQVEsVUFBYTtJQTRCbEUsWUFBWSxJQUFhLEVBQUUsT0FBZ0IsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUM7UUFDbEUsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN0QixDQUFDO0lBckJNLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBUyxFQUFFLElBQWM7UUFDeEMsRUFBRSxDQUFDLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDaEIsTUFBTSxDQUFDLElBQUksWUFBWSxVQUFVO2dCQUM3QixDQUFDLENBQUMsSUFBSSxTQUFTLENBQUMsSUFBSSxlQUFRLENBQUMsSUFBSSxZQUFLLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDbkUsQ0FBQyxDQUFDLElBQUksU0FBUyxDQUFDLElBQUksZUFBUSxDQUFDLElBQUksYUFBTSxFQUFFLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM3RSxDQUFDO1FBQ0QsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDdkIsS0FBSyxTQUFTLEVBQUUsTUFBTSxDQUFDLElBQUksU0FBUyxDQUFDLElBQUksZUFBUSxDQUFDLElBQUksV0FBSSxFQUFFLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUN4RixLQUFLLFVBQVUsRUFBRSxNQUFNLENBQUMsSUFBSSxTQUFTLENBQUMsSUFBSSxlQUFRLENBQUMsSUFBSSxZQUFLLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQzFGLEtBQUssVUFBVSxFQUFFLE1BQU0sQ0FBQyxJQUFJLFNBQVMsQ0FBQyxJQUFJLGVBQVEsQ0FBQyxJQUFJLFlBQUssRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDMUYsS0FBSyxVQUFVLEVBQUUsTUFBTSxDQUFDLElBQUksU0FBUyxDQUFDLElBQUksZUFBUSxDQUFDLElBQUksWUFBSyxFQUFFLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUMxRixLQUFLLFdBQVcsRUFBRSxNQUFNLENBQUMsSUFBSSxTQUFTLENBQUMsSUFBSSxlQUFRLENBQUMsSUFBSSxhQUFNLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQzVGLEtBQUssV0FBVyxFQUFFLE1BQU0sQ0FBQyxJQUFJLFNBQVMsQ0FBQyxJQUFJLGVBQVEsQ0FBQyxJQUFJLGFBQU0sRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDaEcsQ0FBQztRQUNELE1BQU0sSUFBSSxTQUFTLENBQUMsdUJBQXVCLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBZ0IsSUFBYTtRQUMzQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLGVBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxvQkFBYSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ2xILENBQUM7Q0FJSjtBQS9CRCw4QkErQkM7QUFFRCxpQkFBdUQsU0FBUSxVQUFhO0lBZXhFLFlBQVksSUFBYSxFQUFFLE9BQWdCLFdBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDO1FBQ3BFLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdEIsQ0FBQztJQWJNLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBUztRQUN4QixNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUN2QixLQUFLLFdBQVcsRUFBRSxNQUFNLENBQUMsSUFBSSxXQUFXLENBQUMsSUFBSSxlQUFRLENBQUMsSUFBSSxjQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQy9GLEtBQUssWUFBWSxFQUFFLE1BQU0sQ0FBQyxJQUFJLFdBQVcsQ0FBQyxJQUFJLGVBQVEsQ0FBQyxJQUFJLGNBQU8sRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDaEcsS0FBSyxZQUFZLEVBQUUsTUFBTSxDQUFDLElBQUksV0FBVyxDQUFDLElBQUksZUFBUSxDQUFDLElBQUksY0FBTyxFQUFFLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNwRyxDQUFDO1FBQ0QsTUFBTSxJQUFJLFNBQVMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFDRCxNQUFNLENBQUMsV0FBVyxDQUFrQixJQUFhO1FBQzdDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsS0FBSyxnQkFBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxlQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksa0JBQVcsQ0FBQyxJQUFxQixDQUFDLENBQUM7SUFDaEgsQ0FBQztDQUlKO0FBbEJELGtDQWtCQztBQUVELGdCQUF3QixTQUFRLFVBQWlCO0lBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQWtCLElBQWE7UUFDN0MsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLGVBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksa0JBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSwwQkFBbUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDdEcsQ0FBQztJQUNELFlBQVksSUFBaUIsRUFBRSxPQUFvQixVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQztRQUMzRSxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3RCLENBQUM7SUFDTSxJQUFJO1FBQ1AsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLGVBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyRixDQUFDO0lBQ00sS0FBSztRQUNSLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxlQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDckYsQ0FBQztJQUNNLG1CQUFtQjtRQUN0QixJQUFJLElBQUksR0FBSSxJQUFJLENBQUMsSUFBc0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxZQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQzNELE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNyQixLQUFLLGVBQVEsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLElBQUksU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLHVCQUFnQixDQUFDLElBQVcsRUFBRSxDQUFDLENBQVEsQ0FBQyxDQUFDO1lBQzNGLEtBQUssZUFBUSxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsSUFBSSxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksK0JBQXdCLENBQUMsSUFBVyxFQUFFLENBQUMsQ0FBUSxDQUFDLENBQUM7UUFDL0csQ0FBQztRQUNELE1BQU0sSUFBSSxTQUFTLENBQUMsMkJBQTJCLGVBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNoRixDQUFDO0NBQ0o7QUFyQkQsZ0NBcUJDO0FBRUQsbUJBQTJCLFNBQVEsVUFBbUI7SUFDbEQsWUFBWSxJQUFtQixFQUFFLE9BQXNCLElBQUksb0JBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzdFLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdEIsQ0FBQztDQUNKO0FBSkQsc0NBSUM7QUFFRCxnQkFBd0IsU0FBUSxVQUFnQjtJQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFpQixJQUFhO1FBQzVDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksZUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLG9CQUFhLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDbEgsQ0FBQztJQUNELFlBQVksSUFBZ0IsRUFBRSxPQUFtQixVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQztRQUN6RSxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3RCLENBQUM7SUFDTSxJQUFJO1FBQ1AsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzlFLENBQUM7SUFDTSxLQUFLO1FBQ1IsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzlFLENBQUM7Q0FDSjtBQWJELGdDQWFDO0FBRUQscUJBQTZCLFNBQVEsVUFBcUI7SUFDdEQsWUFBWSxJQUFxQixFQUFFLE9BQXdCLElBQUksb0JBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ2pGLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdEIsQ0FBQztJQUNNLG1CQUFtQjtRQUN0QixJQUFJLElBQUksR0FBSSxJQUFJLENBQUMsSUFBc0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxZQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQzNELE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNyQixLQUFLLGVBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLElBQUksU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLDBCQUFtQixDQUFDLElBQVcsRUFBRSxDQUFDLENBQVEsQ0FBQyxDQUFDO1lBQ2pHLEtBQUssZUFBUSxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsSUFBSSxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksK0JBQXdCLENBQUMsSUFBVyxFQUFFLENBQUMsQ0FBUSxDQUFDLENBQUM7WUFDM0csS0FBSyxlQUFRLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxJQUFJLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSwrQkFBd0IsQ0FBQyxJQUFXLEVBQUUsQ0FBQyxDQUFRLENBQUMsQ0FBQztZQUMzRyxLQUFLLGVBQVEsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLElBQUksU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLDhCQUF1QixDQUFDLElBQVcsRUFBRSxDQUFDLENBQVEsQ0FBQyxDQUFDO1FBQzdHLENBQUM7UUFDRCxNQUFNLElBQUksU0FBUyxDQUFDLDJCQUEyQixlQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDaEYsQ0FBQztDQUNKO0FBZEQsMENBY0M7QUFFRCxvQkFBNEIsU0FBUSxVQUFvQjtJQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFxQixJQUFhO1FBQ2hELE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxtQkFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSw0QkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxvQkFBYSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNySCxDQUFDO0lBQ0QsWUFBWSxJQUFvQixFQUFFLE9BQXVCLGNBQWMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDO1FBQ3JGLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdEIsQ0FBQztJQUNNLElBQUk7UUFDUCxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssbUJBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNoRyxDQUFDO0lBQ00sS0FBSztRQUNSLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxtQkFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2hHLENBQUM7Q0FDSjtBQWJELHdDQWFDO0FBRUQsa0JBQTBCLFNBQVEsY0FBc0I7SUFDcEQsWUFBWSxJQUFrQixFQUFFLE9BQXFCLElBQUksaUJBQVUsQ0FBQyxJQUFJLENBQUM7UUFDckUsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN0QixDQUFDO0lBQ00sTUFBTTtRQUNULE1BQU0sQ0FBQyxJQUFJLFVBQVUsQ0FBRSxJQUFJLENBQUMsSUFBMEIsQ0FBQyxLQUFLLENBQUMsSUFBSSxXQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDOUUsQ0FBQztDQUNKO0FBUEQsb0NBT0M7QUFFRCwyQkFBbUMsU0FBUSxVQUEyQjtJQUNsRSxZQUFZLElBQTJCLEVBQUUsT0FBOEIsSUFBSSxvQkFBYSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUMvRyxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3RCLENBQUM7Q0FDSjtBQUpELHNEQUlDO0FBRUQsZ0JBQXdCLFNBQVEsY0FBb0I7SUFDaEQsWUFBWSxJQUFnQixFQUFFLE9BQW1CLElBQUksZUFBUSxDQUFDLElBQUksQ0FBQztRQUMvRCxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3RCLENBQUM7SUFDTSxRQUFRO1FBQ1gsTUFBTSxDQUFDLElBQUksWUFBWSxDQUFFLElBQUksQ0FBQyxJQUEwQixDQUFDLEtBQUssQ0FBQyxJQUFJLGFBQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNsRixDQUFDO0NBQ0o7QUFQRCxnQ0FPQztBQUVELGdCQUF1RCxTQUFRLGNBQXVCO0lBQ2xGLFlBQVksSUFBbUIsRUFBRSxPQUFzQixJQUFJLGVBQVEsQ0FBQyxJQUFJLENBQUM7UUFDckUsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN0QixDQUFDO0NBQ0o7QUFKRCxnQ0FJQztBQUVELHlCQUFpQyxTQUFRLE1BQXFCO0lBQzFELFlBQVksSUFBeUIsRUFBRSxPQUE0QixJQUFJLHdCQUFpQixDQUFDLElBQUksQ0FBQztRQUMxRixLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3RCLENBQUM7Q0FDSjtBQUpELGtEQUlDO0FBRUQsZUFBdUIsU0FBUSxZQUFrQjtJQUM3QyxZQUFZLElBQWdCLEVBQUUsT0FBbUIsSUFBSSxnQkFBTyxDQUFDLElBQUksQ0FBQztRQUM5RCxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3RCLENBQUM7SUFDTSxRQUFRO1FBQ1gsTUFBTSxDQUFDLElBQUksWUFBWSxDQUFFLElBQUksQ0FBQyxJQUF3QixDQUFDLEtBQUssQ0FBQyxJQUFJLGFBQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsRyxDQUFDO0NBQ0o7QUFQRCw4QkFPQztBQUVELGtCQUEwQixTQUFRLFlBQW9CO0lBQ2xELFlBQVksSUFBa0IsRUFBRSxPQUFxQixJQUFJLG1CQUFVLENBQUMsSUFBSSxDQUFDO1FBQ3JFLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdEIsQ0FBQztJQUNNLEtBQUssQ0FBQyxhQUFzQixLQUFLO1FBQ3BDLE1BQU0sQ0FBQyxJQUFJLFNBQVMsQ0FBRSxJQUFJLENBQUMsSUFBd0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxXQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pHLENBQUM7Q0FDSjtBQVBELG9DQU9DO0FBRUQsaUJBQXFFLFNBQVEsWUFBZTtJQUN4RixZQUFZLElBQWEsRUFBRSxPQUFzQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLGdCQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLGtCQUFTLENBQWMsSUFBeUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLHVCQUFjLENBQUMsSUFBd0IsQ0FBQyxDQUFDO1FBQ3pMLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdEIsQ0FBQztDQUNKO0FBSkQsa0NBSUM7QUFFRCxzQkFBNkQsU0FBUSxNQUFxQjtJQUt0RixZQUFZLElBQXlCLEVBQUUsT0FBNEIsSUFBSSwyQkFBYyxDQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xJLEtBQUssQ0FBQyxJQUFpQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQy9CLEVBQUUsQ0FBQyxDQUFDLElBQUksWUFBWSxtQkFBWSxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUksSUFBWSxDQUFDLElBQUksQ0FBQztRQUM5QixDQUFDO1FBQ0QsRUFBRSxDQUFDLENBQUMsSUFBSSxZQUFZLHFCQUFjLElBQUksSUFBSSxZQUFZLDJCQUFjLENBQUMsQ0FBQyxDQUFDO1lBQ25FLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztZQUM1QixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7UUFDdEMsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLFlBQVksa0JBQVcsSUFBSSxJQUFJLFlBQVkscUJBQVcsQ0FBQyxDQUFDLENBQUM7WUFDcEUsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQXFDLENBQUM7WUFDMUQsa0VBQWtFO1lBQ2xFLG1FQUFtRTtZQUNuRSxJQUFJLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztZQUN2RCxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQ3hCLENBQUMsSUFBd0IsRUFBRSxJQUF5QixFQUFFLEVBQUUsQ0FDcEQsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQVEsQ0FBQyxFQUN0RCxJQUFJLENBQ04sQ0FBQztRQUNQLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNKLE1BQU0sSUFBSSxTQUFTLENBQUMsb0NBQW9DLENBQUMsQ0FBQztRQUM5RCxDQUFDO0lBQ0wsQ0FBQztJQUNNLE1BQU0sQ0FBQyxLQUFhLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN6RCxRQUFRLENBQUMsR0FBVyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUQsYUFBYSxDQUFDLEtBQVEsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQzVFO0FBOUJELDRDQThCQztBQUVZLFFBQUEsWUFBWSxHQUFHLENBQUMsQ0FBQyxZQUFvRSxFQUFFLEVBQUUsQ0FBQyxDQUNuRyxDQUFxQixJQUFhLEVBQUUsRUFBRSxDQUFDLHFCQUFXLENBQUMsZUFBZSxDQUFDLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQWMsQ0FDckgsQ0FBQyxDQUFDLGtCQUF1QyxTQUFRLHFCQUFXO0lBQ3pELFlBQW9CLElBQWE7UUFBSSxLQUFLLEVBQUUsQ0FBQztRQUF6QixTQUFJLEdBQUosSUFBSSxDQUFTO0lBQWEsQ0FBQztJQUMvQyxTQUFTLENBQVksS0FBVyxJQUFlLE1BQU0sQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBWSxDQUFDO0lBQzdGLFFBQVEsQ0FBYSxLQUFVLElBQWdCLE1BQU0sQ0FBQyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBYSxDQUFDO0lBQzdGLFVBQVUsQ0FBVyxLQUFZLElBQWMsTUFBTSxDQUFDLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFXLENBQUM7SUFDN0YsV0FBVyxDQUFVLEtBQWEsSUFBYSxNQUFNLENBQUMsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQVUsQ0FBQztJQUM3RixTQUFTLENBQVksS0FBVyxJQUFlLE1BQU0sQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBWSxDQUFDO0lBQzdGLFNBQVMsQ0FBWSxLQUFXLElBQWUsTUFBTSxDQUFDLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFZLENBQUM7SUFDN0YsWUFBWSxDQUFTLEtBQWMsSUFBWSxNQUFNLENBQUMsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQVMsQ0FBQztJQUM3RixTQUFTLENBQVksS0FBWSxJQUFjLE1BQU0sQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBWSxDQUFDO0lBQzdGLFNBQVMsQ0FBWSxLQUFXLElBQWUsTUFBTSxDQUFDLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFZLENBQUM7SUFDN0YsY0FBYyxDQUFPLEtBQWdCLElBQVUsTUFBTSxDQUFDLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFPLENBQUM7SUFDN0YsYUFBYSxDQUFRLEtBQWUsSUFBVyxNQUFNLENBQUMsSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQVEsQ0FBQztJQUM3RixTQUFTLENBQVksS0FBVyxJQUFlLE1BQU0sQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBWSxDQUFDO0lBQzdGLFdBQVcsQ0FBVSxLQUFhLElBQWEsTUFBTSxDQUFDLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFVLENBQUM7SUFDN0YsVUFBVSxDQUFXLEtBQVksSUFBYyxNQUFNLENBQUMsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQVcsQ0FBQztJQUM3RixvQkFBb0IsQ0FBQyxLQUFzQixJQUFJLE1BQU0sQ0FBQyxJQUFJLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0Ysa0JBQWtCLENBQUcsS0FBb0IsSUFBTSxNQUFNLENBQUMsSUFBSSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBRyxDQUFDO0lBQzdGLFFBQVEsQ0FBYSxLQUFXLElBQWUsTUFBTSxDQUFDLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFhLENBQUM7SUFDN0YsZUFBZSxDQUFNLEtBQWlCLElBQVMsTUFBTSxDQUFDLElBQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQU0sQ0FBQztDQUNoRyxDQUFDLENBQUMiLCJmaWxlIjoidmVjdG9yLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IERhdGEsIENodW5rZWREYXRhLCBGbGF0RGF0YSwgQm9vbERhdGEsIEZsYXRMaXN0RGF0YSwgTmVzdGVkRGF0YSwgRGljdGlvbmFyeURhdGEgfSBmcm9tICcuL2RhdGEnO1xuaW1wb3J0IHsgVmlzaXRvck5vZGUsIFR5cGVWaXNpdG9yLCBWZWN0b3JWaXNpdG9yIH0gZnJvbSAnLi92aXNpdG9yJztcbmltcG9ydCB7IERhdGFUeXBlLCBMaXN0VHlwZSwgRmxhdFR5cGUsIE5lc3RlZFR5cGUsIEZsYXRMaXN0VHlwZSwgVGltZVVuaXQgfSBmcm9tICcuL3R5cGUnO1xuaW1wb3J0IHsgSXRlcmFibGVBcnJheUxpa2UsIFByZWNpc2lvbiwgRGF0ZVVuaXQsIEludGVydmFsVW5pdCwgVW5pb25Nb2RlIH0gZnJvbSAnLi90eXBlJztcblxuZXhwb3J0IGludGVyZmFjZSBWZWN0b3JMaWtlIHsgbGVuZ3RoOiBudW1iZXI7IG51bGxDb3VudDogbnVtYmVyOyB9XG5cbmV4cG9ydCBpbnRlcmZhY2UgVmlldzxUIGV4dGVuZHMgRGF0YVR5cGU+IHtcbiAgICBjbG9uZShkYXRhOiBEYXRhPFQ+KTogdGhpcztcbiAgICBpc1ZhbGlkKGluZGV4OiBudW1iZXIpOiBib29sZWFuO1xuICAgIGdldChpbmRleDogbnVtYmVyKTogVFsnVFZhbHVlJ10gfCBudWxsO1xuICAgIHNldChpbmRleDogbnVtYmVyLCB2YWx1ZTogVFsnVFZhbHVlJ10pOiB2b2lkO1xuICAgIHRvQXJyYXkoKTogSXRlcmFibGVBcnJheUxpa2U8VFsnVFZhbHVlJ10gfCBudWxsPjtcbiAgICBpbmRleE9mKHNlYXJjaDogVFsnVFZhbHVlJ10pOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxUWydUVmFsdWUnXSB8IG51bGw+O1xufVxuXG5leHBvcnQgY2xhc3MgVmVjdG9yPFQgZXh0ZW5kcyBEYXRhVHlwZSA9IGFueT4gaW1wbGVtZW50cyBWZWN0b3JMaWtlLCBWaWV3PFQ+LCBWaXNpdG9yTm9kZSB7XG4gICAgcHVibGljIHN0YXRpYyBjcmVhdGU8VCBleHRlbmRzIERhdGFUeXBlPihkYXRhOiBEYXRhPFQ+KTogVmVjdG9yPFQ+IHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVZlY3RvcihkYXRhKTtcbiAgICB9XG4gICAgcHVibGljIHN0YXRpYyBjb25jYXQ8VCBleHRlbmRzIERhdGFUeXBlPihzb3VyY2U/OiBWZWN0b3I8VD4gfCBudWxsLCAuLi5vdGhlcnM6IFZlY3RvcjxUPltdKTogVmVjdG9yPFQ+IHtcbiAgICAgICAgcmV0dXJuIG90aGVycy5yZWR1Y2UoKGEsIGIpID0+IGEgPyBhLmNvbmNhdChiKSA6IGIsIHNvdXJjZSEpO1xuICAgIH1cbiAgICBwdWJsaWMgdHlwZTogVDtcbiAgICBwdWJsaWMgbGVuZ3RoOiBudW1iZXI7XG4gICAgcHVibGljIHJlYWRvbmx5IGRhdGE6IERhdGE8VD47XG4gICAgcHVibGljIHJlYWRvbmx5IHZpZXc6IFZpZXc8VD47XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxUPiwgdmlldzogVmlldzxUPikge1xuICAgICAgICB0aGlzLmRhdGEgPSBkYXRhO1xuICAgICAgICB0aGlzLnR5cGUgPSBkYXRhLnR5cGU7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gZGF0YS5sZW5ndGg7XG4gICAgICAgIGxldCBudWxsczogVWludDhBcnJheTtcbiAgICAgICAgaWYgKCg8YW55PiBkYXRhIGluc3RhbmNlb2YgQ2h1bmtlZERhdGEpICYmICEodmlldyBpbnN0YW5jZW9mIENodW5rZWRWaWV3KSkge1xuICAgICAgICAgICAgdGhpcy52aWV3ID0gbmV3IENodW5rZWRWaWV3KGRhdGEpO1xuICAgICAgICB9IGVsc2UgaWYgKCEodmlldyBpbnN0YW5jZW9mIFZhbGlkaXR5VmlldykgJiYgKG51bGxzID0gZGF0YS5udWxsQml0bWFwISkgJiYgbnVsbHMubGVuZ3RoID4gMCAmJiBkYXRhLm51bGxDb3VudCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMudmlldyA9IG5ldyBWYWxpZGl0eVZpZXcoZGF0YSwgdmlldyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnZpZXcgPSB2aWV3O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIGdldCBudWxsQ291bnQoKSB7IHJldHVybiB0aGlzLmRhdGEubnVsbENvdW50OyB9XG4gICAgcHVibGljIGdldCBudWxsQml0bWFwKCkgeyByZXR1cm4gdGhpcy5kYXRhLm51bGxCaXRtYXA7IH1cbiAgICBwdWJsaWMgZ2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCkge1xuICAgICAgICByZXR1cm4gYFZlY3Rvcjwke3RoaXMudHlwZVtTeW1ib2wudG9TdHJpbmdUYWddfT5gO1xuICAgIH1cbiAgICBwdWJsaWMgdG9KU09OKCk6IGFueSB7IHJldHVybiB0aGlzLnRvQXJyYXkoKTsgfVxuICAgIHB1YmxpYyBjbG9uZTxSIGV4dGVuZHMgVD4oZGF0YTogRGF0YTxSPiwgdmlldzogVmlldzxSPiA9IHRoaXMudmlldy5jbG9uZShkYXRhKSBhcyBhbnkpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIG5ldyAodGhpcy5jb25zdHJ1Y3RvciBhcyBhbnkpKGRhdGEsIHZpZXcpO1xuICAgIH1cbiAgICBwdWJsaWMgaXNWYWxpZChpbmRleDogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnZpZXcuaXNWYWxpZChpbmRleCk7XG4gICAgfVxuICAgIHB1YmxpYyBnZXQoaW5kZXg6IG51bWJlcik6IFRbJ1RWYWx1ZSddIHwgbnVsbCB7XG4gICAgICAgIHJldHVybiB0aGlzLnZpZXcuZ2V0KGluZGV4KTtcbiAgICB9XG4gICAgcHVibGljIHNldChpbmRleDogbnVtYmVyLCB2YWx1ZTogVFsnVFZhbHVlJ10pOiB2b2lkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmlldy5zZXQoaW5kZXgsIHZhbHVlKTtcbiAgICB9XG4gICAgcHVibGljIHRvQXJyYXkoKTogSXRlcmFibGVBcnJheUxpa2U8VFsnVFZhbHVlJ10gfCBudWxsPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnZpZXcudG9BcnJheSgpO1xuICAgIH1cbiAgICBwdWJsaWMgaW5kZXhPZih2YWx1ZTogVFsnVFZhbHVlJ10pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmlldy5pbmRleE9mKHZhbHVlKTtcbiAgICB9XG4gICAgcHVibGljIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VFsnVFZhbHVlJ10gfCBudWxsPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnZpZXdbU3ltYm9sLml0ZXJhdG9yXSgpO1xuICAgIH1cbiAgICBwdWJsaWMgY29uY2F0KC4uLm90aGVyczogVmVjdG9yPFQ+W10pOiB0aGlzIHtcbiAgICAgICAgaWYgKChvdGhlcnMgPSBvdGhlcnMuZmlsdGVyKEJvb2xlYW4pKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHsgdmlldyB9ID0gdGhpcztcbiAgICAgICAgY29uc3QgdmVjcyA9ICEodmlldyBpbnN0YW5jZW9mIENodW5rZWRWaWV3KVxuICAgICAgICAgICAgPyBbdGhpcywgLi4ub3RoZXJzXVxuICAgICAgICAgICAgOiBbLi4udmlldy5jaHVua1ZlY3RvcnMsIC4uLm90aGVyc107XG4gICAgICAgIGNvbnN0IG9mZnNldHMgPSBDaHVua2VkRGF0YS5jb21wdXRlT2Zmc2V0cyh2ZWNzKTtcbiAgICAgICAgY29uc3QgY2h1bmtzTGVuZ3RoID0gb2Zmc2V0c1tvZmZzZXRzLmxlbmd0aCAtIDFdO1xuICAgICAgICBjb25zdCBjaHVua2VkRGF0YSA9IG5ldyBDaHVua2VkRGF0YSh0aGlzLnR5cGUsIGNodW5rc0xlbmd0aCwgdmVjcywgMCwgLTEsIG9mZnNldHMpO1xuICAgICAgICByZXR1cm4gdGhpcy5jbG9uZShjaHVua2VkRGF0YSwgbmV3IENodW5rZWRWaWV3KGNodW5rZWREYXRhKSkgYXMgdGhpcztcbiAgICB9XG4gICAgcHVibGljIHNsaWNlKGJlZ2luPzogbnVtYmVyLCBlbmQ/OiBudW1iZXIpOiB0aGlzIHtcbiAgICAgICAgbGV0IHsgbGVuZ3RoIH0gPSB0aGlzO1xuICAgICAgICBsZXQgc2l6ZSA9ICh0aGlzLnZpZXcgYXMgYW55KS5zaXplIHx8IDE7XG4gICAgICAgIGxldCB0b3RhbCA9IGxlbmd0aCwgZnJvbSA9IChiZWdpbiB8fCAwKSAqIHNpemU7XG4gICAgICAgIGxldCB0byA9ICh0eXBlb2YgZW5kID09PSAnbnVtYmVyJyA/IGVuZCA6IHRvdGFsKSAqIHNpemU7XG4gICAgICAgIGlmICh0byA8IDApIHsgdG8gPSB0b3RhbCAtICh0byAqIC0xKSAlIHRvdGFsOyB9XG4gICAgICAgIGlmIChmcm9tIDwgMCkgeyBmcm9tID0gdG90YWwgLSAoZnJvbSAqIC0xKSAlIHRvdGFsOyB9XG4gICAgICAgIGlmICh0byA8IGZyb20pIHsgW2Zyb20sIHRvXSA9IFt0bywgZnJvbV07IH1cbiAgICAgICAgdG90YWwgPSAhaXNGaW5pdGUodG90YWwgPSAodG8gLSBmcm9tKSkgfHwgdG90YWwgPCAwID8gMCA6IHRvdGFsO1xuICAgICAgICBjb25zdCBzbGljZWREYXRhID0gdGhpcy5kYXRhLnNsaWNlKGZyb20sIE1hdGgubWluKHRvdGFsLCBsZW5ndGgpKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2xvbmUoc2xpY2VkRGF0YSwgdGhpcy52aWV3LmNsb25lKHNsaWNlZERhdGEpKSBhcyB0aGlzO1xuICAgIH1cblxuICAgIHB1YmxpYyBhY2NlcHRUeXBlVmlzaXRvcih2aXNpdG9yOiBUeXBlVmlzaXRvcik6IGFueSB7XG4gICAgICAgIHJldHVybiBUeXBlVmlzaXRvci52aXNpdFR5cGVJbmxpbmUodmlzaXRvciwgdGhpcy50eXBlKTtcbiAgICB9XG4gICAgcHVibGljIGFjY2VwdFZlY3RvclZpc2l0b3IodmlzaXRvcjogVmVjdG9yVmlzaXRvcik6IGFueSB7XG4gICAgICAgIHJldHVybiBWZWN0b3JWaXNpdG9yLnZpc2l0VHlwZUlubGluZSh2aXNpdG9yLCB0aGlzLnR5cGUsIHRoaXMpO1xuICAgIH1cbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEZsYXRWZWN0b3I8VCBleHRlbmRzIEZsYXRUeXBlPiBleHRlbmRzIFZlY3RvcjxUPiB7XG4gICAgcHVibGljIGdldCB2YWx1ZXMoKSB7IHJldHVybiB0aGlzLmRhdGEudmFsdWVzOyB9XG4gICAgcHVibGljIGxvd3MoKTogSW50VmVjdG9yPEludDMyPiB7IHJldHVybiB0aGlzLmFzSW50MzIoMCwgMik7IH1cbiAgICBwdWJsaWMgaGlnaHMoKTogSW50VmVjdG9yPEludDMyPiB7IHJldHVybiB0aGlzLmFzSW50MzIoMSwgMik7IH1cbiAgICBwdWJsaWMgYXNJbnQzMihvZmZzZXQ6IG51bWJlciA9IDAsIHN0cmlkZTogbnVtYmVyID0gMik6IEludFZlY3RvcjxJbnQzMj4ge1xuICAgICAgICBsZXQgZGF0YSA9ICh0aGlzLmRhdGEgYXMgRmxhdERhdGE8YW55PikuY2xvbmUobmV3IEludDMyKCkpO1xuICAgICAgICBpZiAob2Zmc2V0ID4gMCkge1xuICAgICAgICAgICAgZGF0YSA9IGRhdGEuc2xpY2Uob2Zmc2V0LCB0aGlzLmxlbmd0aCAtIG9mZnNldCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgaW50MzJzID0gbmV3IEludFZlY3RvcihkYXRhLCBuZXcgUHJpbWl0aXZlVmlldyhkYXRhLCBzdHJpZGUpKTtcbiAgICAgICAgaW50MzJzLmxlbmd0aCA9IHRoaXMubGVuZ3RoIC8gc3RyaWRlIHwgMDtcbiAgICAgICAgcmV0dXJuIGludDMycztcbiAgICB9XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBMaXN0VmVjdG9yQmFzZTxUIGV4dGVuZHMgKExpc3RUeXBlIHwgRmxhdExpc3RUeXBlKT4gZXh0ZW5kcyBWZWN0b3I8VD4ge1xuICAgIHB1YmxpYyBnZXQgdmFsdWVzKCkgeyByZXR1cm4gdGhpcy5kYXRhLnZhbHVlczsgfVxuICAgIHB1YmxpYyBnZXQgdmFsdWVPZmZzZXRzKCkgeyByZXR1cm4gdGhpcy5kYXRhLnZhbHVlT2Zmc2V0czsgfVxuICAgIHB1YmxpYyBnZXRWYWx1ZU9mZnNldChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnZhbHVlT2Zmc2V0c1tpbmRleF07XG4gICAgfVxuICAgIHB1YmxpYyBnZXRWYWx1ZUxlbmd0aChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnZhbHVlT2Zmc2V0c1tpbmRleCArIDFdIC0gdGhpcy52YWx1ZU9mZnNldHNbaW5kZXhdO1xuICAgIH1cbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIE5lc3RlZFZlY3RvcjxUIGV4dGVuZHMgTmVzdGVkVHlwZT4gZXh0ZW5kcyBWZWN0b3I8VD4gIHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIHJlYWRvbmx5IHZpZXc6IE5lc3RlZFZpZXc8VD47XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHByb3RlY3RlZCBfY2hpbGREYXRhOiBEYXRhPGFueT5bXTtcbiAgICBwdWJsaWMgZ2V0Q2hpbGRBdDxSIGV4dGVuZHMgRGF0YVR5cGUgPSBEYXRhVHlwZT4oaW5kZXg6IG51bWJlcik6IFZlY3RvcjxSPiB8IG51bGwge1xuICAgICAgICByZXR1cm4gdGhpcy52aWV3LmdldENoaWxkQXQ8Uj4oaW5kZXgpO1xuICAgIH1cbiAgICBwdWJsaWMgZ2V0IGNoaWxkRGF0YSgpOiBEYXRhPGFueT5bXSB7XG4gICAgICAgIGxldCBkYXRhOiBEYXRhPFQ+IHwgRGF0YTxhbnk+W107XG4gICAgICAgIGlmICgoZGF0YSA9IHRoaXMuX2NoaWxkRGF0YSkpIHtcbiAgICAgICAgICAgIC8vIFJldHVybiB0aGUgY2FjaGVkIGNoaWxkRGF0YSByZWZlcmVuY2UgZmlyc3RcbiAgICAgICAgICAgIHJldHVybiBkYXRhIGFzIERhdGE8YW55PltdO1xuICAgICAgICB9IGVsc2UgaWYgKCEoPGFueT4gKGRhdGEgPSB0aGlzLmRhdGEpIGluc3RhbmNlb2YgQ2h1bmtlZERhdGEpKSB7XG4gICAgICAgICAgICAvLyBJZiBkYXRhIGlzbid0IGNodW5rZWQsIGNhY2hlIGFuZCByZXR1cm4gTmVzdGVkRGF0YSdzIGNoaWxkRGF0YVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NoaWxkRGF0YSA9IChkYXRhIGFzIE5lc3RlZERhdGE8VD4pLmNoaWxkRGF0YTtcbiAgICAgICAgfVxuICAgICAgICAvLyBPdGhlcndpc2UgaWYgdGhlIGRhdGEgaXMgY2h1bmtlZCwgY29uY2F0ZW5hdGUgdGhlIGNoaWxkVmVjdG9ycyBmcm9tIGVhY2ggY2h1bmtcbiAgICAgICAgLy8gdG8gY29uc3RydWN0IGEgc2luZ2xlIGNodW5rZWQgVmVjdG9yIGZvciBlYWNoIGNvbHVtbi4gVGhlbiByZXR1cm4gdGhlIENodW5rZWREYXRhXG4gICAgICAgIC8vIGluc3RhbmNlIGZyb20gZWFjaCB1bmlmaWVkIGNodW5rZWQgY29sdW1uIGFzIHRoZSBjaGlsZERhdGEgb2YgYSBjaHVua2VkIE5lc3RlZFZlY3RvclxuICAgICAgICBjb25zdCBjaHVua3MgPSAoKGRhdGEgYXMgQ2h1bmtlZERhdGE8VD4pLmNodW5rVmVjdG9ycyBhcyBOZXN0ZWRWZWN0b3I8VD5bXSk7XG4gICAgICAgIHJldHVybiB0aGlzLl9jaGlsZERhdGEgPSBjaHVua3NcbiAgICAgICAgICAgIC5yZWR1Y2U8KFZlY3RvcjxUPiB8IG51bGwpW11bXT4oKGNvbHMsIGNodW5rKSA9PiBjaHVuay5jaGlsZERhdGFcbiAgICAgICAgICAgIC5yZWR1Y2U8KFZlY3RvcjxUPiB8IG51bGwpW11bXT4oKGNvbHMsIF8sIGkpID0+IChcbiAgICAgICAgICAgICAgICAoY29sc1tpXSB8fCAoY29sc1tpXSA9IFtdKSkucHVzaChjaHVuay5nZXRDaGlsZEF0KGkpKVxuICAgICAgICAgICAgKSAmJiBjb2xzIHx8IGNvbHMsIGNvbHMpLCBbXSBhcyBWZWN0b3I8VD5bXVtdKVxuICAgICAgICAubWFwKCh2ZWNzKSA9PiBWZWN0b3IuY29uY2F0PFQ+KC4uLnZlY3MpLmRhdGEpO1xuICAgIH1cbn1cblxuaW1wb3J0IHsgTGlzdCwgQmluYXJ5LCBVdGY4LCBCb29sLCB9IGZyb20gJy4vdHlwZSc7XG5pbXBvcnQgeyBOdWxsLCBJbnQsIEZsb2F0LCBEZWNpbWFsLCBEYXRlXywgVGltZSwgVGltZXN0YW1wLCBJbnRlcnZhbCB9IGZyb20gJy4vdHlwZSc7XG5pbXBvcnQgeyBVaW50OCwgVWludDE2LCBVaW50MzIsIFVpbnQ2NCwgSW50OCwgSW50MTYsIEludDMyLCBJbnQ2NCwgRmxvYXQxNiwgRmxvYXQzMiwgRmxvYXQ2NCB9IGZyb20gJy4vdHlwZSc7XG5pbXBvcnQgeyBTdHJ1Y3QsIFVuaW9uLCBTcGFyc2VVbmlvbiwgRGVuc2VVbmlvbiwgRml4ZWRTaXplQmluYXJ5LCBGaXhlZFNpemVMaXN0LCBNYXBfLCBEaWN0aW9uYXJ5IH0gZnJvbSAnLi90eXBlJztcblxuaW1wb3J0IHsgQ2h1bmtlZFZpZXcgfSBmcm9tICcuL3ZlY3Rvci9jaHVua2VkJztcbmltcG9ydCB7IERpY3Rpb25hcnlWaWV3IH0gZnJvbSAnLi92ZWN0b3IvZGljdGlvbmFyeSc7XG5pbXBvcnQgeyBMaXN0VmlldywgRml4ZWRTaXplTGlzdFZpZXcsIEJpbmFyeVZpZXcsIFV0ZjhWaWV3IH0gZnJvbSAnLi92ZWN0b3IvbGlzdCc7XG5pbXBvcnQgeyBVbmlvblZpZXcsIERlbnNlVW5pb25WaWV3LCBOZXN0ZWRWaWV3LCBTdHJ1Y3RWaWV3LCBNYXBWaWV3IH0gZnJvbSAnLi92ZWN0b3IvbmVzdGVkJztcbmltcG9ydCB7IEZsYXRWaWV3LCBOdWxsVmlldywgQm9vbFZpZXcsIFZhbGlkaXR5VmlldywgUHJpbWl0aXZlVmlldywgRml4ZWRTaXplVmlldywgRmxvYXQxNlZpZXcgfSBmcm9tICcuL3ZlY3Rvci9mbGF0JztcbmltcG9ydCB7IERhdGVEYXlWaWV3LCBEYXRlTWlsbGlzZWNvbmRWaWV3LCBJbnRlcnZhbFllYXJNb250aFZpZXcgfSBmcm9tICcuL3ZlY3Rvci9mbGF0JztcbmltcG9ydCB7IFRpbWVzdGFtcERheVZpZXcsIFRpbWVzdGFtcFNlY29uZFZpZXcsIFRpbWVzdGFtcE1pbGxpc2Vjb25kVmlldywgVGltZXN0YW1wTWljcm9zZWNvbmRWaWV3LCBUaW1lc3RhbXBOYW5vc2Vjb25kVmlldyB9IGZyb20gJy4vdmVjdG9yL2ZsYXQnO1xuaW1wb3J0IHsgcGFja0Jvb2xzIH0gZnJvbSAnLi91dGlsL2JpdCc7XG5cbmV4cG9ydCBjbGFzcyBOdWxsVmVjdG9yIGV4dGVuZHMgVmVjdG9yPE51bGw+IHtcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPE51bGw+LCB2aWV3OiBWaWV3PE51bGw+ID0gbmV3IE51bGxWaWV3KGRhdGEpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEJvb2xWZWN0b3IgZXh0ZW5kcyBWZWN0b3I8Qm9vbD4ge1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbShkYXRhOiBJdGVyYWJsZUFycmF5TGlrZTxib29sZWFuPikge1xuICAgICAgICByZXR1cm4gbmV3IEJvb2xWZWN0b3IobmV3IEJvb2xEYXRhKG5ldyBCb29sKCksIGRhdGEubGVuZ3RoLCBudWxsLCBwYWNrQm9vbHMoZGF0YSkpKTtcbiAgICB9XG4gICAgcHVibGljIGdldCB2YWx1ZXMoKSB7IHJldHVybiB0aGlzLmRhdGEudmFsdWVzOyB9XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxCb29sPiwgdmlldzogVmlldzxCb29sPiA9IG5ldyBCb29sVmlldyhkYXRhKSkge1xuICAgICAgICBzdXBlcihkYXRhLCB2aWV3KTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBJbnRWZWN0b3I8VCBleHRlbmRzIEludCA9IEludDxhbnk+PiBleHRlbmRzIEZsYXRWZWN0b3I8VD4ge1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbShkYXRhOiBJbnQ4QXJyYXkpOiBJbnRWZWN0b3I8SW50OD47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGRhdGE6IEludDE2QXJyYXkpOiBJbnRWZWN0b3I8SW50MTY+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbShkYXRhOiBJbnQzMkFycmF5KTogSW50VmVjdG9yPEludDMyPjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb20oZGF0YTogVWludDhBcnJheSk6IEludFZlY3RvcjxVaW50OD47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGRhdGE6IFVpbnQxNkFycmF5KTogSW50VmVjdG9yPFVpbnQxNj47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGRhdGE6IFVpbnQzMkFycmF5KTogSW50VmVjdG9yPFVpbnQzMj47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGRhdGE6IEludDMyQXJyYXksIGlzNjQ6IHRydWUpOiBJbnRWZWN0b3I8SW50NjQ+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbShkYXRhOiBVaW50MzJBcnJheSwgaXM2NDogdHJ1ZSk6IEludFZlY3RvcjxVaW50NjQ+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbShkYXRhOiBhbnksIGlzNjQ/OiBib29sZWFuKSB7XG4gICAgICAgIGlmIChpczY0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YSBpbnN0YW5jZW9mIEludDMyQXJyYXlcbiAgICAgICAgICAgICAgICA/IG5ldyBJbnRWZWN0b3IobmV3IEZsYXREYXRhKG5ldyBJbnQ2NCgpLCBkYXRhLmxlbmd0aCwgbnVsbCwgZGF0YSkpXG4gICAgICAgICAgICAgICAgOiBuZXcgSW50VmVjdG9yKG5ldyBGbGF0RGF0YShuZXcgVWludDY0KCksIGRhdGEubGVuZ3RoLCBudWxsLCBkYXRhKSk7XG4gICAgICAgIH1cbiAgICAgICAgc3dpdGNoIChkYXRhLmNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICBjYXNlIEludDhBcnJheTogcmV0dXJuIG5ldyBJbnRWZWN0b3IobmV3IEZsYXREYXRhKG5ldyBJbnQ4KCksIGRhdGEubGVuZ3RoLCBudWxsLCBkYXRhKSk7XG4gICAgICAgICAgICBjYXNlIEludDE2QXJyYXk6IHJldHVybiBuZXcgSW50VmVjdG9yKG5ldyBGbGF0RGF0YShuZXcgSW50MTYoKSwgZGF0YS5sZW5ndGgsIG51bGwsIGRhdGEpKTtcbiAgICAgICAgICAgIGNhc2UgSW50MzJBcnJheTogcmV0dXJuIG5ldyBJbnRWZWN0b3IobmV3IEZsYXREYXRhKG5ldyBJbnQzMigpLCBkYXRhLmxlbmd0aCwgbnVsbCwgZGF0YSkpO1xuICAgICAgICAgICAgY2FzZSBVaW50OEFycmF5OiByZXR1cm4gbmV3IEludFZlY3RvcihuZXcgRmxhdERhdGEobmV3IFVpbnQ4KCksIGRhdGEubGVuZ3RoLCBudWxsLCBkYXRhKSk7XG4gICAgICAgICAgICBjYXNlIFVpbnQxNkFycmF5OiByZXR1cm4gbmV3IEludFZlY3RvcihuZXcgRmxhdERhdGEobmV3IFVpbnQxNigpLCBkYXRhLmxlbmd0aCwgbnVsbCwgZGF0YSkpO1xuICAgICAgICAgICAgY2FzZSBVaW50MzJBcnJheTogcmV0dXJuIG5ldyBJbnRWZWN0b3IobmV3IEZsYXREYXRhKG5ldyBVaW50MzIoKSwgZGF0YS5sZW5ndGgsIG51bGwsIGRhdGEpKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbnJlY29nbml6ZWQgSW50IGRhdGEnKTtcbiAgICB9XG4gICAgc3RhdGljIGRlZmF1bHRWaWV3PFQgZXh0ZW5kcyBJbnQ+KGRhdGE6IERhdGE8VD4pIHtcbiAgICAgICAgcmV0dXJuIGRhdGEudHlwZS5iaXRXaWR0aCA8PSAzMiA/IG5ldyBGbGF0VmlldyhkYXRhKSA6IG5ldyBGaXhlZFNpemVWaWV3KGRhdGEsIChkYXRhLnR5cGUuYml0V2lkdGggLyAzMikgfCAwKTtcbiAgICB9XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxUPiwgdmlldzogVmlldzxUPiA9IEludFZlY3Rvci5kZWZhdWx0VmlldyhkYXRhKSkge1xuICAgICAgICBzdXBlcihkYXRhLCB2aWV3KTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBGbG9hdFZlY3RvcjxUIGV4dGVuZHMgRmxvYXQgPSBGbG9hdDxhbnk+PiBleHRlbmRzIEZsYXRWZWN0b3I8VD4ge1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbShkYXRhOiBVaW50MTZBcnJheSk6IEZsb2F0VmVjdG9yPEZsb2F0MTY+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbShkYXRhOiBGbG9hdDMyQXJyYXkpOiBGbG9hdFZlY3RvcjxGbG9hdDMyPjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb20oZGF0YTogRmxvYXQ2NEFycmF5KTogRmxvYXRWZWN0b3I8RmxvYXQ2ND47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGRhdGE6IGFueSkge1xuICAgICAgICBzd2l0Y2ggKGRhdGEuY29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgIGNhc2UgVWludDE2QXJyYXk6IHJldHVybiBuZXcgRmxvYXRWZWN0b3IobmV3IEZsYXREYXRhKG5ldyBGbG9hdDE2KCksIGRhdGEubGVuZ3RoLCBudWxsLCBkYXRhKSk7XG4gICAgICAgICAgICBjYXNlIEZsb2F0MzJBcnJheTogcmV0dXJuIG5ldyBGbG9hdFZlY3RvcihuZXcgRmxhdERhdGEobmV3IEZsb2F0MzIoKSwgZGF0YS5sZW5ndGgsIG51bGwsIGRhdGEpKTtcbiAgICAgICAgICAgIGNhc2UgRmxvYXQ2NEFycmF5OiByZXR1cm4gbmV3IEZsb2F0VmVjdG9yKG5ldyBGbGF0RGF0YShuZXcgRmxvYXQ2NCgpLCBkYXRhLmxlbmd0aCwgbnVsbCwgZGF0YSkpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1VucmVjb2duaXplZCBGbG9hdCBkYXRhJyk7XG4gICAgfVxuICAgIHN0YXRpYyBkZWZhdWx0VmlldzxUIGV4dGVuZHMgRmxvYXQ+KGRhdGE6IERhdGE8VD4pOiBGbGF0Vmlldzxhbnk+IHtcbiAgICAgICAgcmV0dXJuIGRhdGEudHlwZS5wcmVjaXNpb24gIT09IFByZWNpc2lvbi5IQUxGID8gbmV3IEZsYXRWaWV3KGRhdGEpIDogbmV3IEZsb2F0MTZWaWV3KGRhdGEgYXMgRGF0YTxGbG9hdDE2Pik7XG4gICAgfVxuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8VD4sIHZpZXc6IFZpZXc8VD4gPSBGbG9hdFZlY3Rvci5kZWZhdWx0VmlldyhkYXRhKSkge1xuICAgICAgICBzdXBlcihkYXRhLCB2aWV3KTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBEYXRlVmVjdG9yIGV4dGVuZHMgRmxhdFZlY3RvcjxEYXRlXz4ge1xuICAgIHN0YXRpYyBkZWZhdWx0VmlldzxUIGV4dGVuZHMgRGF0ZV8+KGRhdGE6IERhdGE8VD4pIHtcbiAgICAgICAgcmV0dXJuIGRhdGEudHlwZS51bml0ID09PSBEYXRlVW5pdC5EQVkgPyBuZXcgRGF0ZURheVZpZXcoZGF0YSkgOiBuZXcgRGF0ZU1pbGxpc2Vjb25kVmlldyhkYXRhLCAyKTtcbiAgICB9XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxEYXRlXz4sIHZpZXc6IFZpZXc8RGF0ZV8+ID0gRGF0ZVZlY3Rvci5kZWZhdWx0VmlldyhkYXRhKSkge1xuICAgICAgICBzdXBlcihkYXRhLCB2aWV3KTtcbiAgICB9XG4gICAgcHVibGljIGxvd3MoKTogSW50VmVjdG9yPEludDMyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnR5cGUudW5pdCA9PT0gRGF0ZVVuaXQuREFZID8gdGhpcy5hc0ludDMyKDAsIDEpIDogdGhpcy5hc0ludDMyKDAsIDIpO1xuICAgIH1cbiAgICBwdWJsaWMgaGlnaHMoKTogSW50VmVjdG9yPEludDMyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnR5cGUudW5pdCA9PT0gRGF0ZVVuaXQuREFZID8gdGhpcy5hc0ludDMyKDAsIDEpIDogdGhpcy5hc0ludDMyKDEsIDIpO1xuICAgIH1cbiAgICBwdWJsaWMgYXNFcG9jaE1pbGxpc2Vjb25kcygpOiBJbnRWZWN0b3I8SW50MzI+IHtcbiAgICAgICAgbGV0IGRhdGEgPSAodGhpcy5kYXRhIGFzIEZsYXREYXRhPGFueT4pLmNsb25lKG5ldyBJbnQzMigpKTtcbiAgICAgICAgc3dpdGNoICh0aGlzLnR5cGUudW5pdCkge1xuICAgICAgICAgICAgY2FzZSBEYXRlVW5pdC5EQVk6IHJldHVybiBuZXcgSW50VmVjdG9yKGRhdGEsIG5ldyBUaW1lc3RhbXBEYXlWaWV3KGRhdGEgYXMgYW55LCAxKSBhcyBhbnkpO1xuICAgICAgICAgICAgY2FzZSBEYXRlVW5pdC5NSUxMSVNFQ09ORDogcmV0dXJuIG5ldyBJbnRWZWN0b3IoZGF0YSwgbmV3IFRpbWVzdGFtcE1pbGxpc2Vjb25kVmlldyhkYXRhIGFzIGFueSwgMikgYXMgYW55KTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBVbnJlY29nbml6ZWQgZGF0ZSB1bml0IFwiJHtEYXRlVW5pdFt0aGlzLnR5cGUudW5pdF19XCJgKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBEZWNpbWFsVmVjdG9yIGV4dGVuZHMgRmxhdFZlY3RvcjxEZWNpbWFsPiB7XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxEZWNpbWFsPiwgdmlldzogVmlldzxEZWNpbWFsPiA9IG5ldyBGaXhlZFNpemVWaWV3KGRhdGEsIDQpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFRpbWVWZWN0b3IgZXh0ZW5kcyBGbGF0VmVjdG9yPFRpbWU+IHtcbiAgICBzdGF0aWMgZGVmYXVsdFZpZXc8VCBleHRlbmRzIFRpbWU+KGRhdGE6IERhdGE8VD4pIHtcbiAgICAgICAgcmV0dXJuIGRhdGEudHlwZS5iaXRXaWR0aCA8PSAzMiA/IG5ldyBGbGF0VmlldyhkYXRhKSA6IG5ldyBGaXhlZFNpemVWaWV3KGRhdGEsIChkYXRhLnR5cGUuYml0V2lkdGggLyAzMikgfCAwKTtcbiAgICB9XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxUaW1lPiwgdmlldzogVmlldzxUaW1lPiA9IFRpbWVWZWN0b3IuZGVmYXVsdFZpZXcoZGF0YSkpIHtcbiAgICAgICAgc3VwZXIoZGF0YSwgdmlldyk7XG4gICAgfVxuICAgIHB1YmxpYyBsb3dzKCk6IEludFZlY3RvcjxJbnQzMj4ge1xuICAgICAgICByZXR1cm4gdGhpcy50eXBlLmJpdFdpZHRoIDw9IDMyID8gdGhpcy5hc0ludDMyKDAsIDEpIDogdGhpcy5hc0ludDMyKDAsIDIpO1xuICAgIH1cbiAgICBwdWJsaWMgaGlnaHMoKTogSW50VmVjdG9yPEludDMyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnR5cGUuYml0V2lkdGggPD0gMzIgPyB0aGlzLmFzSW50MzIoMCwgMSkgOiB0aGlzLmFzSW50MzIoMSwgMik7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgVGltZXN0YW1wVmVjdG9yIGV4dGVuZHMgRmxhdFZlY3RvcjxUaW1lc3RhbXA+IHtcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPFRpbWVzdGFtcD4sIHZpZXc6IFZpZXc8VGltZXN0YW1wPiA9IG5ldyBGaXhlZFNpemVWaWV3KGRhdGEsIDIpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbiAgICBwdWJsaWMgYXNFcG9jaE1pbGxpc2Vjb25kcygpOiBJbnRWZWN0b3I8SW50MzI+IHtcbiAgICAgICAgbGV0IGRhdGEgPSAodGhpcy5kYXRhIGFzIEZsYXREYXRhPGFueT4pLmNsb25lKG5ldyBJbnQzMigpKTtcbiAgICAgICAgc3dpdGNoICh0aGlzLnR5cGUudW5pdCkge1xuICAgICAgICAgICAgY2FzZSBUaW1lVW5pdC5TRUNPTkQ6IHJldHVybiBuZXcgSW50VmVjdG9yKGRhdGEsIG5ldyBUaW1lc3RhbXBTZWNvbmRWaWV3KGRhdGEgYXMgYW55LCAxKSBhcyBhbnkpO1xuICAgICAgICAgICAgY2FzZSBUaW1lVW5pdC5NSUxMSVNFQ09ORDogcmV0dXJuIG5ldyBJbnRWZWN0b3IoZGF0YSwgbmV3IFRpbWVzdGFtcE1pbGxpc2Vjb25kVmlldyhkYXRhIGFzIGFueSwgMikgYXMgYW55KTtcbiAgICAgICAgICAgIGNhc2UgVGltZVVuaXQuTUlDUk9TRUNPTkQ6IHJldHVybiBuZXcgSW50VmVjdG9yKGRhdGEsIG5ldyBUaW1lc3RhbXBNaWNyb3NlY29uZFZpZXcoZGF0YSBhcyBhbnksIDIpIGFzIGFueSk7XG4gICAgICAgICAgICBjYXNlIFRpbWVVbml0Lk5BTk9TRUNPTkQ6IHJldHVybiBuZXcgSW50VmVjdG9yKGRhdGEsIG5ldyBUaW1lc3RhbXBOYW5vc2Vjb25kVmlldyhkYXRhIGFzIGFueSwgMikgYXMgYW55KTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBVbnJlY29nbml6ZWQgdGltZSB1bml0IFwiJHtUaW1lVW5pdFt0aGlzLnR5cGUudW5pdF19XCJgKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBJbnRlcnZhbFZlY3RvciBleHRlbmRzIEZsYXRWZWN0b3I8SW50ZXJ2YWw+IHtcbiAgICBzdGF0aWMgZGVmYXVsdFZpZXc8VCBleHRlbmRzIEludGVydmFsPihkYXRhOiBEYXRhPFQ+KSB7XG4gICAgICAgIHJldHVybiBkYXRhLnR5cGUudW5pdCA9PT0gSW50ZXJ2YWxVbml0LllFQVJfTU9OVEggPyBuZXcgSW50ZXJ2YWxZZWFyTW9udGhWaWV3KGRhdGEpIDogbmV3IEZpeGVkU2l6ZVZpZXcoZGF0YSwgMik7XG4gICAgfVxuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8SW50ZXJ2YWw+LCB2aWV3OiBWaWV3PEludGVydmFsPiA9IEludGVydmFsVmVjdG9yLmRlZmF1bHRWaWV3KGRhdGEpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbiAgICBwdWJsaWMgbG93cygpOiBJbnRWZWN0b3I8SW50MzI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMudHlwZS51bml0ID09PSBJbnRlcnZhbFVuaXQuWUVBUl9NT05USCA/IHRoaXMuYXNJbnQzMigwLCAxKSA6IHRoaXMuYXNJbnQzMigwLCAyKTtcbiAgICB9XG4gICAgcHVibGljIGhpZ2hzKCk6IEludFZlY3RvcjxJbnQzMj4ge1xuICAgICAgICByZXR1cm4gdGhpcy50eXBlLnVuaXQgPT09IEludGVydmFsVW5pdC5ZRUFSX01PTlRIID8gdGhpcy5hc0ludDMyKDAsIDEpIDogdGhpcy5hc0ludDMyKDEsIDIpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEJpbmFyeVZlY3RvciBleHRlbmRzIExpc3RWZWN0b3JCYXNlPEJpbmFyeT4ge1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8QmluYXJ5PiwgdmlldzogVmlldzxCaW5hcnk+ID0gbmV3IEJpbmFyeVZpZXcoZGF0YSkpIHtcbiAgICAgICAgc3VwZXIoZGF0YSwgdmlldyk7XG4gICAgfVxuICAgIHB1YmxpYyBhc1V0ZjgoKSB7XG4gICAgICAgIHJldHVybiBuZXcgVXRmOFZlY3RvcigodGhpcy5kYXRhIGFzIEZsYXRMaXN0RGF0YTxhbnk+KS5jbG9uZShuZXcgVXRmOCgpKSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgRml4ZWRTaXplQmluYXJ5VmVjdG9yIGV4dGVuZHMgRmxhdFZlY3RvcjxGaXhlZFNpemVCaW5hcnk+IHtcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPEZpeGVkU2l6ZUJpbmFyeT4sIHZpZXc6IFZpZXc8Rml4ZWRTaXplQmluYXJ5PiA9IG5ldyBGaXhlZFNpemVWaWV3KGRhdGEsIGRhdGEudHlwZS5ieXRlV2lkdGgpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFV0ZjhWZWN0b3IgZXh0ZW5kcyBMaXN0VmVjdG9yQmFzZTxVdGY4PiB7XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxVdGY4PiwgdmlldzogVmlldzxVdGY4PiA9IG5ldyBVdGY4VmlldyhkYXRhKSkge1xuICAgICAgICBzdXBlcihkYXRhLCB2aWV3KTtcbiAgICB9XG4gICAgcHVibGljIGFzQmluYXJ5KCkge1xuICAgICAgICByZXR1cm4gbmV3IEJpbmFyeVZlY3RvcigodGhpcy5kYXRhIGFzIEZsYXRMaXN0RGF0YTxhbnk+KS5jbG9uZShuZXcgQmluYXJ5KCkpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBMaXN0VmVjdG9yPFQgZXh0ZW5kcyBEYXRhVHlwZSA9IERhdGFUeXBlPiBleHRlbmRzIExpc3RWZWN0b3JCYXNlPExpc3Q8VD4+IHtcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPExpc3Q8VD4+LCB2aWV3OiBWaWV3PExpc3Q8VD4+ID0gbmV3IExpc3RWaWV3KGRhdGEpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEZpeGVkU2l6ZUxpc3RWZWN0b3IgZXh0ZW5kcyBWZWN0b3I8Rml4ZWRTaXplTGlzdD4ge1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8Rml4ZWRTaXplTGlzdD4sIHZpZXc6IFZpZXc8Rml4ZWRTaXplTGlzdD4gPSBuZXcgRml4ZWRTaXplTGlzdFZpZXcoZGF0YSkpIHtcbiAgICAgICAgc3VwZXIoZGF0YSwgdmlldyk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgTWFwVmVjdG9yIGV4dGVuZHMgTmVzdGVkVmVjdG9yPE1hcF8+IHtcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPE1hcF8+LCB2aWV3OiBWaWV3PE1hcF8+ID0gbmV3IE1hcFZpZXcoZGF0YSkpIHtcbiAgICAgICAgc3VwZXIoZGF0YSwgdmlldyk7XG4gICAgfVxuICAgIHB1YmxpYyBhc1N0cnVjdCgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTdHJ1Y3RWZWN0b3IoKHRoaXMuZGF0YSBhcyBOZXN0ZWREYXRhPGFueT4pLmNsb25lKG5ldyBTdHJ1Y3QodGhpcy50eXBlLmNoaWxkcmVuKSkpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFN0cnVjdFZlY3RvciBleHRlbmRzIE5lc3RlZFZlY3RvcjxTdHJ1Y3Q+IHtcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPFN0cnVjdD4sIHZpZXc6IFZpZXc8U3RydWN0PiA9IG5ldyBTdHJ1Y3RWaWV3KGRhdGEpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbiAgICBwdWJsaWMgYXNNYXAoa2V5c1NvcnRlZDogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiBuZXcgTWFwVmVjdG9yKCh0aGlzLmRhdGEgYXMgTmVzdGVkRGF0YTxhbnk+KS5jbG9uZShuZXcgTWFwXyhrZXlzU29ydGVkLCB0aGlzLnR5cGUuY2hpbGRyZW4pKSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgVW5pb25WZWN0b3I8VCBleHRlbmRzIChTcGFyc2VVbmlvbiB8IERlbnNlVW5pb24pID0gYW55PiBleHRlbmRzIE5lc3RlZFZlY3RvcjxUPiB7XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxUPiwgdmlldzogVmlldzxUPiA9IDxhbnk+IChkYXRhLnR5cGUubW9kZSA9PT0gVW5pb25Nb2RlLlNwYXJzZSA/IG5ldyBVbmlvblZpZXc8U3BhcnNlVW5pb24+KGRhdGEgYXMgRGF0YTxTcGFyc2VVbmlvbj4pIDogbmV3IERlbnNlVW5pb25WaWV3KGRhdGEgYXMgRGF0YTxEZW5zZVVuaW9uPikpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIERpY3Rpb25hcnlWZWN0b3I8VCBleHRlbmRzIERhdGFUeXBlID0gRGF0YVR5cGU+IGV4dGVuZHMgVmVjdG9yPERpY3Rpb25hcnk8VD4+IHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIHJlYWRvbmx5IGluZGljZXM6IFZlY3RvcjxJbnQ+O1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgcmVhZG9ubHkgZGljdGlvbmFyeTogVmVjdG9yPFQ+O1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8RGljdGlvbmFyeTxUPj4sIHZpZXc6IFZpZXc8RGljdGlvbmFyeTxUPj4gPSBuZXcgRGljdGlvbmFyeVZpZXc8VD4oZGF0YS5kaWN0aW9uYXJ5LCBuZXcgSW50VmVjdG9yKGRhdGEuaW5kaWNlcykpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEgYXMgRGF0YTxhbnk+LCB2aWV3KTtcbiAgICAgICAgaWYgKHZpZXcgaW5zdGFuY2VvZiBWYWxpZGl0eVZpZXcpIHtcbiAgICAgICAgICAgIHZpZXcgPSAodmlldyBhcyBhbnkpLnZpZXc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEgaW5zdGFuY2VvZiBEaWN0aW9uYXJ5RGF0YSAmJiB2aWV3IGluc3RhbmNlb2YgRGljdGlvbmFyeVZpZXcpIHtcbiAgICAgICAgICAgIHRoaXMuaW5kaWNlcyA9IHZpZXcuaW5kaWNlcztcbiAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyeSA9IGRhdGEuZGljdGlvbmFyeTtcbiAgICAgICAgfSBlbHNlIGlmIChkYXRhIGluc3RhbmNlb2YgQ2h1bmtlZERhdGEgJiYgdmlldyBpbnN0YW5jZW9mIENodW5rZWRWaWV3KSB7XG4gICAgICAgICAgICBjb25zdCBjaHVua3MgPSB2aWV3LmNodW5rVmVjdG9ycyBhcyBEaWN0aW9uYXJ5VmVjdG9yPFQ+W107XG4gICAgICAgICAgICAvLyBBc3N1bWUgdGhlIGxhc3QgY2h1bmsncyBkaWN0aW9uYXJ5IGRhdGEgaXMgdGhlIG1vc3QgdXAtdG8tZGF0ZSxcbiAgICAgICAgICAgIC8vIGluY2x1ZGluZyBkYXRhIGZyb20gRGljdGlvbmFyeUJhdGNoZXMgdGhhdCB3ZXJlIG1hcmtlZCBhcyBkZWx0YXNcbiAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyeSA9IGNodW5rc1tjaHVua3MubGVuZ3RoIC0gMV0uZGljdGlvbmFyeTtcbiAgICAgICAgICAgIHRoaXMuaW5kaWNlcyA9IGNodW5rcy5yZWR1Y2U8VmVjdG9yPEludD4gfCBudWxsPihcbiAgICAgICAgICAgICAgICAoaWR4czogVmVjdG9yPEludD4gfCBudWxsLCBkaWN0OiBEaWN0aW9uYXJ5VmVjdG9yPFQ+KSA9PlxuICAgICAgICAgICAgICAgICAgICAhaWR4cyA/IGRpY3QuaW5kaWNlcyEgOiBpZHhzLmNvbmNhdChkaWN0LmluZGljZXMhKSxcbiAgICAgICAgICAgICAgICBudWxsXG4gICAgICAgICAgICApITtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFVucmVjb2duaXplZCBEaWN0aW9uYXJ5VmVjdG9yIHZpZXdgKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBwdWJsaWMgZ2V0S2V5KGluZGV4OiBudW1iZXIpIHsgcmV0dXJuIHRoaXMuaW5kaWNlcy5nZXQoaW5kZXgpOyB9XG4gICAgcHVibGljIGdldFZhbHVlKGtleTogbnVtYmVyKSB7IHJldHVybiB0aGlzLmRpY3Rpb25hcnkuZ2V0KGtleSk7IH1cbiAgICBwdWJsaWMgcmV2ZXJzZUxvb2t1cCh2YWx1ZTogVCkgeyByZXR1cm4gdGhpcy5kaWN0aW9uYXJ5LmluZGV4T2YodmFsdWUpOyB9XG59XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVWZWN0b3IgPSAoKFZlY3RvckxvYWRlcjogbmV3IDxUIGV4dGVuZHMgRGF0YVR5cGU+KGRhdGE6IERhdGE8VD4pID0+IFR5cGVWaXNpdG9yKSA9PiAoXG4gICAgPFQgZXh0ZW5kcyBEYXRhVHlwZT4oZGF0YTogRGF0YTxUPikgPT4gVHlwZVZpc2l0b3IudmlzaXRUeXBlSW5saW5lKG5ldyBWZWN0b3JMb2FkZXIoZGF0YSksIGRhdGEudHlwZSkgYXMgVmVjdG9yPFQ+XG4pKShjbGFzcyBWZWN0b3JMb2FkZXI8VCBleHRlbmRzIERhdGFUeXBlPiBleHRlbmRzIFR5cGVWaXNpdG9yIHtcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIGRhdGE6IERhdGE8VD4pIHsgc3VwZXIoKTsgfVxuICAgIHZpc2l0TnVsbCAgICAgICAgICAgKF90eXBlOiBOdWxsKSAgICAgICAgICAgIHsgcmV0dXJuIG5ldyBOdWxsVmVjdG9yKHRoaXMuZGF0YSk7ICAgICAgICAgICAgfVxuICAgIHZpc2l0SW50ICAgICAgICAgICAgKF90eXBlOiBJbnQpICAgICAgICAgICAgIHsgcmV0dXJuIG5ldyBJbnRWZWN0b3IodGhpcy5kYXRhKTsgICAgICAgICAgICAgfVxuICAgIHZpc2l0RmxvYXQgICAgICAgICAgKF90eXBlOiBGbG9hdCkgICAgICAgICAgIHsgcmV0dXJuIG5ldyBGbG9hdFZlY3Rvcih0aGlzLmRhdGEpOyAgICAgICAgICAgfVxuICAgIHZpc2l0QmluYXJ5ICAgICAgICAgKF90eXBlOiBCaW5hcnkpICAgICAgICAgIHsgcmV0dXJuIG5ldyBCaW5hcnlWZWN0b3IodGhpcy5kYXRhKTsgICAgICAgICAgfVxuICAgIHZpc2l0VXRmOCAgICAgICAgICAgKF90eXBlOiBVdGY4KSAgICAgICAgICAgIHsgcmV0dXJuIG5ldyBVdGY4VmVjdG9yKHRoaXMuZGF0YSk7ICAgICAgICAgICAgfVxuICAgIHZpc2l0Qm9vbCAgICAgICAgICAgKF90eXBlOiBCb29sKSAgICAgICAgICAgIHsgcmV0dXJuIG5ldyBCb29sVmVjdG9yKHRoaXMuZGF0YSk7ICAgICAgICAgICAgfVxuICAgIHZpc2l0RGVjaW1hbCAgICAgICAgKF90eXBlOiBEZWNpbWFsKSAgICAgICAgIHsgcmV0dXJuIG5ldyBEZWNpbWFsVmVjdG9yKHRoaXMuZGF0YSk7ICAgICAgICAgfVxuICAgIHZpc2l0RGF0ZSAgICAgICAgICAgKF90eXBlOiBEYXRlXykgICAgICAgICAgIHsgcmV0dXJuIG5ldyBEYXRlVmVjdG9yKHRoaXMuZGF0YSk7ICAgICAgICAgICAgfVxuICAgIHZpc2l0VGltZSAgICAgICAgICAgKF90eXBlOiBUaW1lKSAgICAgICAgICAgIHsgcmV0dXJuIG5ldyBUaW1lVmVjdG9yKHRoaXMuZGF0YSk7ICAgICAgICAgICAgfVxuICAgIHZpc2l0VGltZXN0YW1wICAgICAgKF90eXBlOiBUaW1lc3RhbXApICAgICAgIHsgcmV0dXJuIG5ldyBUaW1lc3RhbXBWZWN0b3IodGhpcy5kYXRhKTsgICAgICAgfVxuICAgIHZpc2l0SW50ZXJ2YWwgICAgICAgKF90eXBlOiBJbnRlcnZhbCkgICAgICAgIHsgcmV0dXJuIG5ldyBJbnRlcnZhbFZlY3Rvcih0aGlzLmRhdGEpOyAgICAgICAgfVxuICAgIHZpc2l0TGlzdCAgICAgICAgICAgKF90eXBlOiBMaXN0KSAgICAgICAgICAgIHsgcmV0dXJuIG5ldyBMaXN0VmVjdG9yKHRoaXMuZGF0YSk7ICAgICAgICAgICAgfVxuICAgIHZpc2l0U3RydWN0ICAgICAgICAgKF90eXBlOiBTdHJ1Y3QpICAgICAgICAgIHsgcmV0dXJuIG5ldyBTdHJ1Y3RWZWN0b3IodGhpcy5kYXRhKTsgICAgICAgICAgfVxuICAgIHZpc2l0VW5pb24gICAgICAgICAgKF90eXBlOiBVbmlvbikgICAgICAgICAgIHsgcmV0dXJuIG5ldyBVbmlvblZlY3Rvcih0aGlzLmRhdGEpOyAgICAgICAgICAgfVxuICAgIHZpc2l0Rml4ZWRTaXplQmluYXJ5KF90eXBlOiBGaXhlZFNpemVCaW5hcnkpIHsgcmV0dXJuIG5ldyBGaXhlZFNpemVCaW5hcnlWZWN0b3IodGhpcy5kYXRhKTsgfVxuICAgIHZpc2l0Rml4ZWRTaXplTGlzdCAgKF90eXBlOiBGaXhlZFNpemVMaXN0KSAgIHsgcmV0dXJuIG5ldyBGaXhlZFNpemVMaXN0VmVjdG9yKHRoaXMuZGF0YSk7ICAgfVxuICAgIHZpc2l0TWFwICAgICAgICAgICAgKF90eXBlOiBNYXBfKSAgICAgICAgICAgIHsgcmV0dXJuIG5ldyBNYXBWZWN0b3IodGhpcy5kYXRhKTsgICAgICAgICAgICAgfVxuICAgIHZpc2l0RGljdGlvbmFyeSAgICAgKF90eXBlOiBEaWN0aW9uYXJ5KSAgICAgIHsgcmV0dXJuIG5ldyBEaWN0aW9uYXJ5VmVjdG9yKHRoaXMuZGF0YSk7ICAgICAgfVxufSk7XG4iXX0=

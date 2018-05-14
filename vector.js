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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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VSxJQUFnQixNQUFNLENBQUMsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQWEsQ0FBQztJQUM3RixVQUFVLENBQVcsS0FBWSxJQUFjLE1BQU0sQ0FBQyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBVyxDQUFDO0lBQzdGLFdBQVcsQ0FBVSxLQUFhLElBQWEsTUFBTSxDQUFDLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFVLENBQUM7SUFDN0YsU0FBUyxDQUFZLEtBQVcsSUFBZSxNQUFNLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQVksQ0FBQztJQUM3RixTQUFTLENBQVksS0FBVyxJQUFlLE1BQU0sQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBWSxDQUFDO0lBQzdGLFlBQVksQ0FBUyxLQUFjLElBQVksTUFBTSxDQUFDLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFTLENBQUM7SUFDN0YsU0FBUyxDQUFZLEtBQVksSUFBYyxNQUFNLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQVksQ0FBQztJQUM3RixTQUFTLENBQVksS0FBVyxJQUFlLE1BQU0sQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBWSxDQUFDO0lBQzdGLGNBQWMsQ0FBTyxLQUFnQixJQUFVLE1BQU0sQ0FBQyxJQUFJLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBTyxDQUFDO0lBQzdGLGFBQWEsQ0FBUSxLQUFlLElBQVcsTUFBTSxDQUFDLElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFRLENBQUM7SUFDN0YsU0FBUyxDQUFZLEtBQVcsSUFBZSxNQUFNLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQVksQ0FBQztJQUM3RixXQUFXLENBQVUsS0FBYSxJQUFhLE1BQU0sQ0FBQyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBVSxDQUFDO0lBQzdGLFVBQVUsQ0FBVyxLQUFZLElBQWMsTUFBTSxDQUFDLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFXLENBQUM7SUFDN0Ysb0JBQW9CLENBQUMsS0FBc0IsSUFBSSxNQUFNLENBQUMsSUFBSSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzdGLGtCQUFrQixDQUFHLEtBQW9CLElBQU0sTUFBTSxDQUFDLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUcsQ0FBQztJQUM3RixRQUFRLENBQWEsS0FBVyxJQUFlLE1BQU0sQ0FBQyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBYSxDQUFDO0lBQzdGLGVBQWUsQ0FBTSxLQUFpQixJQUFTLE1BQU0sQ0FBQyxJQUFJLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFNLENBQUM7Q0FDaEcsQ0FBQyxDQUFDIiwiZmlsZSI6InZlY3Rvci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBEYXRhLCBDaHVua2VkRGF0YSwgRmxhdERhdGEsIEJvb2xEYXRhLCBGbGF0TGlzdERhdGEsIE5lc3RlZERhdGEsIERpY3Rpb25hcnlEYXRhIH0gZnJvbSAnLi9kYXRhJztcbmltcG9ydCB7IFZpc2l0b3JOb2RlLCBUeXBlVmlzaXRvciwgVmVjdG9yVmlzaXRvciB9IGZyb20gJy4vdmlzaXRvcic7XG5pbXBvcnQgeyBEYXRhVHlwZSwgTGlzdFR5cGUsIEZsYXRUeXBlLCBOZXN0ZWRUeXBlLCBGbGF0TGlzdFR5cGUsIFRpbWVVbml0IH0gZnJvbSAnLi90eXBlJztcbmltcG9ydCB7IEl0ZXJhYmxlQXJyYXlMaWtlLCBQcmVjaXNpb24sIERhdGVVbml0LCBJbnRlcnZhbFVuaXQsIFVuaW9uTW9kZSB9IGZyb20gJy4vdHlwZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVmVjdG9yTGlrZSB7IGxlbmd0aDogbnVtYmVyOyBudWxsQ291bnQ6IG51bWJlcjsgfVxuXG5leHBvcnQgaW50ZXJmYWNlIFZpZXc8VCBleHRlbmRzIERhdGFUeXBlPiB7XG4gICAgY2xvbmUoZGF0YTogRGF0YTxUPik6IHRoaXM7XG4gICAgaXNWYWxpZChpbmRleDogbnVtYmVyKTogYm9vbGVhbjtcbiAgICBnZXQoaW5kZXg6IG51bWJlcik6IFRbJ1RWYWx1ZSddIHwgbnVsbDtcbiAgICBzZXQoaW5kZXg6IG51bWJlciwgdmFsdWU6IFRbJ1RWYWx1ZSddKTogdm9pZDtcbiAgICB0b0FycmF5KCk6IEl0ZXJhYmxlQXJyYXlMaWtlPFRbJ1RWYWx1ZSddIHwgbnVsbD47XG4gICAgaW5kZXhPZihzZWFyY2g6IFRbJ1RWYWx1ZSddKTogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VFsnVFZhbHVlJ10gfCBudWxsPjtcbn1cblxuZXhwb3J0IGNsYXNzIFZlY3RvcjxUIGV4dGVuZHMgRGF0YVR5cGUgPSBhbnk+IGltcGxlbWVudHMgVmVjdG9yTGlrZSwgVmlldzxUPiwgVmlzaXRvck5vZGUge1xuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlPFQgZXh0ZW5kcyBEYXRhVHlwZT4oZGF0YTogRGF0YTxUPik6IFZlY3RvcjxUPiB7XG4gICAgICAgIHJldHVybiBjcmVhdGVWZWN0b3IoZGF0YSk7XG4gICAgfVxuICAgIHB1YmxpYyBzdGF0aWMgY29uY2F0PFQgZXh0ZW5kcyBEYXRhVHlwZT4oc291cmNlPzogVmVjdG9yPFQ+IHwgbnVsbCwgLi4ub3RoZXJzOiBWZWN0b3I8VD5bXSk6IFZlY3RvcjxUPiB7XG4gICAgICAgIHJldHVybiBvdGhlcnMucmVkdWNlKChhLCBiKSA9PiBhID8gYS5jb25jYXQoYikgOiBiLCBzb3VyY2UhKTtcbiAgICB9XG4gICAgcHVibGljIHR5cGU6IFQ7XG4gICAgcHVibGljIGxlbmd0aDogbnVtYmVyO1xuICAgIHB1YmxpYyByZWFkb25seSBkYXRhOiBEYXRhPFQ+O1xuICAgIHB1YmxpYyByZWFkb25seSB2aWV3OiBWaWV3PFQ+O1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8VD4sIHZpZXc6IFZpZXc8VD4pIHtcbiAgICAgICAgdGhpcy5kYXRhID0gZGF0YTtcbiAgICAgICAgdGhpcy50eXBlID0gZGF0YS50eXBlO1xuICAgICAgICB0aGlzLmxlbmd0aCA9IGRhdGEubGVuZ3RoO1xuICAgICAgICBsZXQgbnVsbHM6IFVpbnQ4QXJyYXk7XG4gICAgICAgIGlmICgoPGFueT4gZGF0YSBpbnN0YW5jZW9mIENodW5rZWREYXRhKSAmJiAhKHZpZXcgaW5zdGFuY2VvZiBDaHVua2VkVmlldykpIHtcbiAgICAgICAgICAgIHRoaXMudmlldyA9IG5ldyBDaHVua2VkVmlldyhkYXRhKTtcbiAgICAgICAgfSBlbHNlIGlmICghKHZpZXcgaW5zdGFuY2VvZiBWYWxpZGl0eVZpZXcpICYmIChudWxscyA9IGRhdGEubnVsbEJpdG1hcCEpICYmIG51bGxzLmxlbmd0aCA+IDAgJiYgZGF0YS5udWxsQ291bnQgPiAwKSB7XG4gICAgICAgICAgICB0aGlzLnZpZXcgPSBuZXcgVmFsaWRpdHlWaWV3KGRhdGEsIHZpZXcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy52aWV3ID0gdmlldztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBnZXQgbnVsbENvdW50KCkgeyByZXR1cm4gdGhpcy5kYXRhLm51bGxDb3VudDsgfVxuICAgIHB1YmxpYyBnZXQgbnVsbEJpdG1hcCgpIHsgcmV0dXJuIHRoaXMuZGF0YS5udWxsQml0bWFwOyB9XG4gICAgcHVibGljIGdldCBbU3ltYm9sLnRvU3RyaW5nVGFnXSgpIHtcbiAgICAgICAgcmV0dXJuIGBWZWN0b3I8JHt0aGlzLnR5cGVbU3ltYm9sLnRvU3RyaW5nVGFnXX0+YDtcbiAgICB9XG4gICAgcHVibGljIHRvSlNPTigpOiBhbnkgeyByZXR1cm4gdGhpcy50b0FycmF5KCk7IH1cbiAgICBwdWJsaWMgY2xvbmU8UiBleHRlbmRzIFQ+KGRhdGE6IERhdGE8Uj4sIHZpZXc6IFZpZXc8Uj4gPSB0aGlzLnZpZXcuY2xvbmUoZGF0YSkgYXMgYW55KTogdGhpcyB7XG4gICAgICAgIHJldHVybiBuZXcgKHRoaXMuY29uc3RydWN0b3IgYXMgYW55KShkYXRhLCB2aWV3KTtcbiAgICB9XG4gICAgcHVibGljIGlzVmFsaWQoaW5kZXg6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy52aWV3LmlzVmFsaWQoaW5kZXgpO1xuICAgIH1cbiAgICBwdWJsaWMgZ2V0KGluZGV4OiBudW1iZXIpOiBUWydUVmFsdWUnXSB8IG51bGwge1xuICAgICAgICByZXR1cm4gdGhpcy52aWV3LmdldChpbmRleCk7XG4gICAgfVxuICAgIHB1YmxpYyBzZXQoaW5kZXg6IG51bWJlciwgdmFsdWU6IFRbJ1RWYWx1ZSddKTogdm9pZCB7XG4gICAgICAgIHJldHVybiB0aGlzLnZpZXcuc2V0KGluZGV4LCB2YWx1ZSk7XG4gICAgfVxuICAgIHB1YmxpYyB0b0FycmF5KCk6IEl0ZXJhYmxlQXJyYXlMaWtlPFRbJ1RWYWx1ZSddIHwgbnVsbD4ge1xuICAgICAgICByZXR1cm4gdGhpcy52aWV3LnRvQXJyYXkoKTtcbiAgICB9XG4gICAgcHVibGljIGluZGV4T2YodmFsdWU6IFRbJ1RWYWx1ZSddKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnZpZXcuaW5kZXhPZih2YWx1ZSk7XG4gICAgfVxuICAgIHB1YmxpYyBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFRbJ1RWYWx1ZSddIHwgbnVsbD4ge1xuICAgICAgICByZXR1cm4gdGhpcy52aWV3W1N5bWJvbC5pdGVyYXRvcl0oKTtcbiAgICB9XG4gICAgcHVibGljIGNvbmNhdCguLi5vdGhlcnM6IFZlY3RvcjxUPltdKTogdGhpcyB7XG4gICAgICAgIGlmICgob3RoZXJzID0gb3RoZXJzLmZpbHRlcihCb29sZWFuKSkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB7IHZpZXcgfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0IHZlY3MgPSAhKHZpZXcgaW5zdGFuY2VvZiBDaHVua2VkVmlldylcbiAgICAgICAgICAgID8gW3RoaXMsIC4uLm90aGVyc11cbiAgICAgICAgICAgIDogWy4uLnZpZXcuY2h1bmtWZWN0b3JzLCAuLi5vdGhlcnNdO1xuICAgICAgICBjb25zdCBvZmZzZXRzID0gQ2h1bmtlZERhdGEuY29tcHV0ZU9mZnNldHModmVjcyk7XG4gICAgICAgIGNvbnN0IGNodW5rc0xlbmd0aCA9IG9mZnNldHNbb2Zmc2V0cy5sZW5ndGggLSAxXTtcbiAgICAgICAgY29uc3QgY2h1bmtlZERhdGEgPSBuZXcgQ2h1bmtlZERhdGEodGhpcy50eXBlLCBjaHVua3NMZW5ndGgsIHZlY3MsIDAsIC0xLCBvZmZzZXRzKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2xvbmUoY2h1bmtlZERhdGEsIG5ldyBDaHVua2VkVmlldyhjaHVua2VkRGF0YSkpIGFzIHRoaXM7XG4gICAgfVxuICAgIHB1YmxpYyBzbGljZShiZWdpbj86IG51bWJlciwgZW5kPzogbnVtYmVyKTogdGhpcyB7XG4gICAgICAgIGxldCB7IGxlbmd0aCB9ID0gdGhpcztcbiAgICAgICAgbGV0IHNpemUgPSAodGhpcy52aWV3IGFzIGFueSkuc2l6ZSB8fCAxO1xuICAgICAgICBsZXQgdG90YWwgPSBsZW5ndGgsIGZyb20gPSAoYmVnaW4gfHwgMCkgKiBzaXplO1xuICAgICAgICBsZXQgdG8gPSAodHlwZW9mIGVuZCA9PT0gJ251bWJlcicgPyBlbmQgOiB0b3RhbCkgKiBzaXplO1xuICAgICAgICBpZiAodG8gPCAwKSB7IHRvID0gdG90YWwgLSAodG8gKiAtMSkgJSB0b3RhbDsgfVxuICAgICAgICBpZiAoZnJvbSA8IDApIHsgZnJvbSA9IHRvdGFsIC0gKGZyb20gKiAtMSkgJSB0b3RhbDsgfVxuICAgICAgICBpZiAodG8gPCBmcm9tKSB7IFtmcm9tLCB0b10gPSBbdG8sIGZyb21dOyB9XG4gICAgICAgIHRvdGFsID0gIWlzRmluaXRlKHRvdGFsID0gKHRvIC0gZnJvbSkpIHx8IHRvdGFsIDwgMCA/IDAgOiB0b3RhbDtcbiAgICAgICAgY29uc3Qgc2xpY2VkRGF0YSA9IHRoaXMuZGF0YS5zbGljZShmcm9tLCBNYXRoLm1pbih0b3RhbCwgbGVuZ3RoKSk7XG4gICAgICAgIHJldHVybiB0aGlzLmNsb25lKHNsaWNlZERhdGEsIHRoaXMudmlldy5jbG9uZShzbGljZWREYXRhKSkgYXMgdGhpcztcbiAgICB9XG5cbiAgICBwdWJsaWMgYWNjZXB0VHlwZVZpc2l0b3IodmlzaXRvcjogVHlwZVZpc2l0b3IpOiBhbnkge1xuICAgICAgICByZXR1cm4gVHlwZVZpc2l0b3IudmlzaXRUeXBlSW5saW5lKHZpc2l0b3IsIHRoaXMudHlwZSk7XG4gICAgfVxuICAgIHB1YmxpYyBhY2NlcHRWZWN0b3JWaXNpdG9yKHZpc2l0b3I6IFZlY3RvclZpc2l0b3IpOiBhbnkge1xuICAgICAgICByZXR1cm4gVmVjdG9yVmlzaXRvci52aXNpdFR5cGVJbmxpbmUodmlzaXRvciwgdGhpcy50eXBlLCB0aGlzKTtcbiAgICB9XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBGbGF0VmVjdG9yPFQgZXh0ZW5kcyBGbGF0VHlwZT4gZXh0ZW5kcyBWZWN0b3I8VD4ge1xuICAgIHB1YmxpYyBnZXQgdmFsdWVzKCkgeyByZXR1cm4gdGhpcy5kYXRhLnZhbHVlczsgfVxuICAgIHB1YmxpYyBsb3dzKCk6IEludFZlY3RvcjxJbnQzMj4geyByZXR1cm4gdGhpcy5hc0ludDMyKDAsIDIpOyB9XG4gICAgcHVibGljIGhpZ2hzKCk6IEludFZlY3RvcjxJbnQzMj4geyByZXR1cm4gdGhpcy5hc0ludDMyKDEsIDIpOyB9XG4gICAgcHVibGljIGFzSW50MzIob2Zmc2V0OiBudW1iZXIgPSAwLCBzdHJpZGU6IG51bWJlciA9IDIpOiBJbnRWZWN0b3I8SW50MzI+IHtcbiAgICAgICAgbGV0IGRhdGEgPSAodGhpcy5kYXRhIGFzIEZsYXREYXRhPGFueT4pLmNsb25lKG5ldyBJbnQzMigpKTtcbiAgICAgICAgaWYgKG9mZnNldCA+IDApIHtcbiAgICAgICAgICAgIGRhdGEgPSBkYXRhLnNsaWNlKG9mZnNldCwgdGhpcy5sZW5ndGggLSBvZmZzZXQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGludDMycyA9IG5ldyBJbnRWZWN0b3IoZGF0YSwgbmV3IFByaW1pdGl2ZVZpZXcoZGF0YSwgc3RyaWRlKSk7XG4gICAgICAgIGludDMycy5sZW5ndGggPSB0aGlzLmxlbmd0aCAvIHN0cmlkZSB8IDA7XG4gICAgICAgIHJldHVybiBpbnQzMnM7XG4gICAgfVxufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTGlzdFZlY3RvckJhc2U8VCBleHRlbmRzIChMaXN0VHlwZSB8IEZsYXRMaXN0VHlwZSk+IGV4dGVuZHMgVmVjdG9yPFQ+IHtcbiAgICBwdWJsaWMgZ2V0IHZhbHVlcygpIHsgcmV0dXJuIHRoaXMuZGF0YS52YWx1ZXM7IH1cbiAgICBwdWJsaWMgZ2V0IHZhbHVlT2Zmc2V0cygpIHsgcmV0dXJuIHRoaXMuZGF0YS52YWx1ZU9mZnNldHM7IH1cbiAgICBwdWJsaWMgZ2V0VmFsdWVPZmZzZXQoaW5kZXg6IG51bWJlcikge1xuICAgICAgICByZXR1cm4gdGhpcy52YWx1ZU9mZnNldHNbaW5kZXhdO1xuICAgIH1cbiAgICBwdWJsaWMgZ2V0VmFsdWVMZW5ndGgoaW5kZXg6IG51bWJlcikge1xuICAgICAgICByZXR1cm4gdGhpcy52YWx1ZU9mZnNldHNbaW5kZXggKyAxXSAtIHRoaXMudmFsdWVPZmZzZXRzW2luZGV4XTtcbiAgICB9XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBOZXN0ZWRWZWN0b3I8VCBleHRlbmRzIE5lc3RlZFR5cGU+IGV4dGVuZHMgVmVjdG9yPFQ+ICB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyByZWFkb25seSB2aWV3OiBOZXN0ZWRWaWV3PFQ+O1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwcm90ZWN0ZWQgX2NoaWxkRGF0YTogRGF0YTxhbnk+W107XG4gICAgcHVibGljIGdldENoaWxkQXQ8UiBleHRlbmRzIERhdGFUeXBlID0gRGF0YVR5cGU+KGluZGV4OiBudW1iZXIpOiBWZWN0b3I8Uj4gfCBudWxsIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmlldy5nZXRDaGlsZEF0PFI+KGluZGV4KTtcbiAgICB9XG4gICAgcHVibGljIGdldCBjaGlsZERhdGEoKTogRGF0YTxhbnk+W10ge1xuICAgICAgICBsZXQgZGF0YTogRGF0YTxUPiB8IERhdGE8YW55PltdO1xuICAgICAgICBpZiAoKGRhdGEgPSB0aGlzLl9jaGlsZERhdGEpKSB7XG4gICAgICAgICAgICAvLyBSZXR1cm4gdGhlIGNhY2hlZCBjaGlsZERhdGEgcmVmZXJlbmNlIGZpcnN0XG4gICAgICAgICAgICByZXR1cm4gZGF0YSBhcyBEYXRhPGFueT5bXTtcbiAgICAgICAgfSBlbHNlIGlmICghKDxhbnk+IChkYXRhID0gdGhpcy5kYXRhKSBpbnN0YW5jZW9mIENodW5rZWREYXRhKSkge1xuICAgICAgICAgICAgLy8gSWYgZGF0YSBpc24ndCBjaHVua2VkLCBjYWNoZSBhbmQgcmV0dXJuIE5lc3RlZERhdGEncyBjaGlsZERhdGFcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jaGlsZERhdGEgPSAoZGF0YSBhcyBOZXN0ZWREYXRhPFQ+KS5jaGlsZERhdGE7XG4gICAgICAgIH1cbiAgICAgICAgLy8gT3RoZXJ3aXNlIGlmIHRoZSBkYXRhIGlzIGNodW5rZWQsIGNvbmNhdGVuYXRlIHRoZSBjaGlsZFZlY3RvcnMgZnJvbSBlYWNoIGNodW5rXG4gICAgICAgIC8vIHRvIGNvbnN0cnVjdCBhIHNpbmdsZSBjaHVua2VkIFZlY3RvciBmb3IgZWFjaCBjb2x1bW4uIFRoZW4gcmV0dXJuIHRoZSBDaHVua2VkRGF0YVxuICAgICAgICAvLyBpbnN0YW5jZSBmcm9tIGVhY2ggdW5pZmllZCBjaHVua2VkIGNvbHVtbiBhcyB0aGUgY2hpbGREYXRhIG9mIGEgY2h1bmtlZCBOZXN0ZWRWZWN0b3JcbiAgICAgICAgY29uc3QgY2h1bmtzID0gKChkYXRhIGFzIENodW5rZWREYXRhPFQ+KS5jaHVua1ZlY3RvcnMgYXMgTmVzdGVkVmVjdG9yPFQ+W10pO1xuICAgICAgICByZXR1cm4gdGhpcy5fY2hpbGREYXRhID0gY2h1bmtzXG4gICAgICAgICAgICAucmVkdWNlPChWZWN0b3I8VD4gfCBudWxsKVtdW10+KChjb2xzLCBjaHVuaykgPT4gY2h1bmsuY2hpbGREYXRhXG4gICAgICAgICAgICAucmVkdWNlPChWZWN0b3I8VD4gfCBudWxsKVtdW10+KChjb2xzLCBfLCBpKSA9PiAoXG4gICAgICAgICAgICAgICAgKGNvbHNbaV0gfHwgKGNvbHNbaV0gPSBbXSkpLnB1c2goY2h1bmsuZ2V0Q2hpbGRBdChpKSlcbiAgICAgICAgICAgICkgJiYgY29scyB8fCBjb2xzLCBjb2xzKSwgW10gYXMgVmVjdG9yPFQ+W11bXSlcbiAgICAgICAgLm1hcCgodmVjcykgPT4gVmVjdG9yLmNvbmNhdDxUPiguLi52ZWNzKS5kYXRhKTtcbiAgICB9XG59XG5cbmltcG9ydCB7IExpc3QsIEJpbmFyeSwgVXRmOCwgQm9vbCwgfSBmcm9tICcuL3R5cGUnO1xuaW1wb3J0IHsgTnVsbCwgSW50LCBGbG9hdCwgRGVjaW1hbCwgRGF0ZV8sIFRpbWUsIFRpbWVzdGFtcCwgSW50ZXJ2YWwgfSBmcm9tICcuL3R5cGUnO1xuaW1wb3J0IHsgVWludDgsIFVpbnQxNiwgVWludDMyLCBVaW50NjQsIEludDgsIEludDE2LCBJbnQzMiwgSW50NjQsIEZsb2F0MTYsIEZsb2F0MzIsIEZsb2F0NjQgfSBmcm9tICcuL3R5cGUnO1xuaW1wb3J0IHsgU3RydWN0LCBVbmlvbiwgU3BhcnNlVW5pb24sIERlbnNlVW5pb24sIEZpeGVkU2l6ZUJpbmFyeSwgRml4ZWRTaXplTGlzdCwgTWFwXywgRGljdGlvbmFyeSB9IGZyb20gJy4vdHlwZSc7XG5cbmltcG9ydCB7IENodW5rZWRWaWV3IH0gZnJvbSAnLi92ZWN0b3IvY2h1bmtlZCc7XG5pbXBvcnQgeyBWYWxpZGl0eVZpZXcgfSBmcm9tICcuL3ZlY3Rvci92YWxpZGl0eSc7XG5pbXBvcnQgeyBEaWN0aW9uYXJ5VmlldyB9IGZyb20gJy4vdmVjdG9yL2RpY3Rpb25hcnknO1xuaW1wb3J0IHsgTGlzdFZpZXcsIEZpeGVkU2l6ZUxpc3RWaWV3LCBCaW5hcnlWaWV3LCBVdGY4VmlldyB9IGZyb20gJy4vdmVjdG9yL2xpc3QnO1xuaW1wb3J0IHsgVW5pb25WaWV3LCBEZW5zZVVuaW9uVmlldywgTmVzdGVkVmlldywgU3RydWN0VmlldywgTWFwVmlldyB9IGZyb20gJy4vdmVjdG9yL25lc3RlZCc7XG5pbXBvcnQgeyBGbGF0VmlldywgTnVsbFZpZXcsIEJvb2xWaWV3LCBQcmltaXRpdmVWaWV3LCBGaXhlZFNpemVWaWV3LCBGbG9hdDE2VmlldyB9IGZyb20gJy4vdmVjdG9yL2ZsYXQnO1xuaW1wb3J0IHsgRGF0ZURheVZpZXcsIERhdGVNaWxsaXNlY29uZFZpZXcsIEludGVydmFsWWVhck1vbnRoVmlldyB9IGZyb20gJy4vdmVjdG9yL2ZsYXQnO1xuaW1wb3J0IHsgVGltZXN0YW1wRGF5VmlldywgVGltZXN0YW1wU2Vjb25kVmlldywgVGltZXN0YW1wTWlsbGlzZWNvbmRWaWV3LCBUaW1lc3RhbXBNaWNyb3NlY29uZFZpZXcsIFRpbWVzdGFtcE5hbm9zZWNvbmRWaWV3IH0gZnJvbSAnLi92ZWN0b3IvZmxhdCc7XG5pbXBvcnQgeyBwYWNrQm9vbHMgfSBmcm9tICcuL3V0aWwvYml0JztcblxuZXhwb3J0IGNsYXNzIE51bGxWZWN0b3IgZXh0ZW5kcyBWZWN0b3I8TnVsbD4ge1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8TnVsbD4sIHZpZXc6IFZpZXc8TnVsbD4gPSBuZXcgTnVsbFZpZXcoZGF0YSkpIHtcbiAgICAgICAgc3VwZXIoZGF0YSwgdmlldyk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgQm9vbFZlY3RvciBleHRlbmRzIFZlY3RvcjxCb29sPiB7XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGRhdGE6IEl0ZXJhYmxlQXJyYXlMaWtlPGJvb2xlYW4+KSB7XG4gICAgICAgIHJldHVybiBuZXcgQm9vbFZlY3RvcihuZXcgQm9vbERhdGEobmV3IEJvb2woKSwgZGF0YS5sZW5ndGgsIG51bGwsIHBhY2tCb29scyhkYXRhKSkpO1xuICAgIH1cbiAgICBwdWJsaWMgZ2V0IHZhbHVlcygpIHsgcmV0dXJuIHRoaXMuZGF0YS52YWx1ZXM7IH1cbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPEJvb2w+LCB2aWV3OiBWaWV3PEJvb2w+ID0gbmV3IEJvb2xWaWV3KGRhdGEpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEludFZlY3RvcjxUIGV4dGVuZHMgSW50ID0gSW50PGFueT4+IGV4dGVuZHMgRmxhdFZlY3RvcjxUPiB7XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGRhdGE6IEludDhBcnJheSk6IEludFZlY3RvcjxJbnQ4PjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb20oZGF0YTogSW50MTZBcnJheSk6IEludFZlY3RvcjxJbnQxNj47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGRhdGE6IEludDMyQXJyYXkpOiBJbnRWZWN0b3I8SW50MzI+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbShkYXRhOiBVaW50OEFycmF5KTogSW50VmVjdG9yPFVpbnQ4PjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb20oZGF0YTogVWludDE2QXJyYXkpOiBJbnRWZWN0b3I8VWludDE2PjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb20oZGF0YTogVWludDMyQXJyYXkpOiBJbnRWZWN0b3I8VWludDMyPjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb20oZGF0YTogSW50MzJBcnJheSwgaXM2NDogdHJ1ZSk6IEludFZlY3RvcjxJbnQ2ND47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGRhdGE6IFVpbnQzMkFycmF5LCBpczY0OiB0cnVlKTogSW50VmVjdG9yPFVpbnQ2ND47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGRhdGE6IGFueSwgaXM2ND86IGJvb2xlYW4pIHtcbiAgICAgICAgaWYgKGlzNjQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIHJldHVybiBkYXRhIGluc3RhbmNlb2YgSW50MzJBcnJheVxuICAgICAgICAgICAgICAgID8gbmV3IEludFZlY3RvcihuZXcgRmxhdERhdGEobmV3IEludDY0KCksIGRhdGEubGVuZ3RoLCBudWxsLCBkYXRhKSlcbiAgICAgICAgICAgICAgICA6IG5ldyBJbnRWZWN0b3IobmV3IEZsYXREYXRhKG5ldyBVaW50NjQoKSwgZGF0YS5sZW5ndGgsIG51bGwsIGRhdGEpKTtcbiAgICAgICAgfVxuICAgICAgICBzd2l0Y2ggKGRhdGEuY29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgIGNhc2UgSW50OEFycmF5OiByZXR1cm4gbmV3IEludFZlY3RvcihuZXcgRmxhdERhdGEobmV3IEludDgoKSwgZGF0YS5sZW5ndGgsIG51bGwsIGRhdGEpKTtcbiAgICAgICAgICAgIGNhc2UgSW50MTZBcnJheTogcmV0dXJuIG5ldyBJbnRWZWN0b3IobmV3IEZsYXREYXRhKG5ldyBJbnQxNigpLCBkYXRhLmxlbmd0aCwgbnVsbCwgZGF0YSkpO1xuICAgICAgICAgICAgY2FzZSBJbnQzMkFycmF5OiByZXR1cm4gbmV3IEludFZlY3RvcihuZXcgRmxhdERhdGEobmV3IEludDMyKCksIGRhdGEubGVuZ3RoLCBudWxsLCBkYXRhKSk7XG4gICAgICAgICAgICBjYXNlIFVpbnQ4QXJyYXk6IHJldHVybiBuZXcgSW50VmVjdG9yKG5ldyBGbGF0RGF0YShuZXcgVWludDgoKSwgZGF0YS5sZW5ndGgsIG51bGwsIGRhdGEpKTtcbiAgICAgICAgICAgIGNhc2UgVWludDE2QXJyYXk6IHJldHVybiBuZXcgSW50VmVjdG9yKG5ldyBGbGF0RGF0YShuZXcgVWludDE2KCksIGRhdGEubGVuZ3RoLCBudWxsLCBkYXRhKSk7XG4gICAgICAgICAgICBjYXNlIFVpbnQzMkFycmF5OiByZXR1cm4gbmV3IEludFZlY3RvcihuZXcgRmxhdERhdGEobmV3IFVpbnQzMigpLCBkYXRhLmxlbmd0aCwgbnVsbCwgZGF0YSkpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1VucmVjb2duaXplZCBJbnQgZGF0YScpO1xuICAgIH1cbiAgICBzdGF0aWMgZGVmYXVsdFZpZXc8VCBleHRlbmRzIEludD4oZGF0YTogRGF0YTxUPikge1xuICAgICAgICByZXR1cm4gZGF0YS50eXBlLmJpdFdpZHRoIDw9IDMyID8gbmV3IEZsYXRWaWV3KGRhdGEpIDogbmV3IEZpeGVkU2l6ZVZpZXcoZGF0YSwgKGRhdGEudHlwZS5iaXRXaWR0aCAvIDMyKSB8IDApO1xuICAgIH1cbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPFQ+LCB2aWV3OiBWaWV3PFQ+ID0gSW50VmVjdG9yLmRlZmF1bHRWaWV3KGRhdGEpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEZsb2F0VmVjdG9yPFQgZXh0ZW5kcyBGbG9hdCA9IEZsb2F0PGFueT4+IGV4dGVuZHMgRmxhdFZlY3RvcjxUPiB7XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGRhdGE6IFVpbnQxNkFycmF5KTogRmxvYXRWZWN0b3I8RmxvYXQxNj47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGRhdGE6IEZsb2F0MzJBcnJheSk6IEZsb2F0VmVjdG9yPEZsb2F0MzI+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbShkYXRhOiBGbG9hdDY0QXJyYXkpOiBGbG9hdFZlY3RvcjxGbG9hdDY0PjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb20oZGF0YTogYW55KSB7XG4gICAgICAgIHN3aXRjaCAoZGF0YS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgY2FzZSBVaW50MTZBcnJheTogcmV0dXJuIG5ldyBGbG9hdFZlY3RvcihuZXcgRmxhdERhdGEobmV3IEZsb2F0MTYoKSwgZGF0YS5sZW5ndGgsIG51bGwsIGRhdGEpKTtcbiAgICAgICAgICAgIGNhc2UgRmxvYXQzMkFycmF5OiByZXR1cm4gbmV3IEZsb2F0VmVjdG9yKG5ldyBGbGF0RGF0YShuZXcgRmxvYXQzMigpLCBkYXRhLmxlbmd0aCwgbnVsbCwgZGF0YSkpO1xuICAgICAgICAgICAgY2FzZSBGbG9hdDY0QXJyYXk6IHJldHVybiBuZXcgRmxvYXRWZWN0b3IobmV3IEZsYXREYXRhKG5ldyBGbG9hdDY0KCksIGRhdGEubGVuZ3RoLCBudWxsLCBkYXRhKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5yZWNvZ25pemVkIEZsb2F0IGRhdGEnKTtcbiAgICB9XG4gICAgc3RhdGljIGRlZmF1bHRWaWV3PFQgZXh0ZW5kcyBGbG9hdD4oZGF0YTogRGF0YTxUPik6IEZsYXRWaWV3PGFueT4ge1xuICAgICAgICByZXR1cm4gZGF0YS50eXBlLnByZWNpc2lvbiAhPT0gUHJlY2lzaW9uLkhBTEYgPyBuZXcgRmxhdFZpZXcoZGF0YSkgOiBuZXcgRmxvYXQxNlZpZXcoZGF0YSBhcyBEYXRhPEZsb2F0MTY+KTtcbiAgICB9XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxUPiwgdmlldzogVmlldzxUPiA9IEZsb2F0VmVjdG9yLmRlZmF1bHRWaWV3KGRhdGEpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIERhdGVWZWN0b3IgZXh0ZW5kcyBGbGF0VmVjdG9yPERhdGVfPiB7XG4gICAgc3RhdGljIGRlZmF1bHRWaWV3PFQgZXh0ZW5kcyBEYXRlXz4oZGF0YTogRGF0YTxUPikge1xuICAgICAgICByZXR1cm4gZGF0YS50eXBlLnVuaXQgPT09IERhdGVVbml0LkRBWSA/IG5ldyBEYXRlRGF5VmlldyhkYXRhKSA6IG5ldyBEYXRlTWlsbGlzZWNvbmRWaWV3KGRhdGEsIDIpO1xuICAgIH1cbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPERhdGVfPiwgdmlldzogVmlldzxEYXRlXz4gPSBEYXRlVmVjdG9yLmRlZmF1bHRWaWV3KGRhdGEpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbiAgICBwdWJsaWMgbG93cygpOiBJbnRWZWN0b3I8SW50MzI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMudHlwZS51bml0ID09PSBEYXRlVW5pdC5EQVkgPyB0aGlzLmFzSW50MzIoMCwgMSkgOiB0aGlzLmFzSW50MzIoMCwgMik7XG4gICAgfVxuICAgIHB1YmxpYyBoaWdocygpOiBJbnRWZWN0b3I8SW50MzI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMudHlwZS51bml0ID09PSBEYXRlVW5pdC5EQVkgPyB0aGlzLmFzSW50MzIoMCwgMSkgOiB0aGlzLmFzSW50MzIoMSwgMik7XG4gICAgfVxuICAgIHB1YmxpYyBhc0Vwb2NoTWlsbGlzZWNvbmRzKCk6IEludFZlY3RvcjxJbnQzMj4ge1xuICAgICAgICBsZXQgZGF0YSA9ICh0aGlzLmRhdGEgYXMgRmxhdERhdGE8YW55PikuY2xvbmUobmV3IEludDMyKCkpO1xuICAgICAgICBzd2l0Y2ggKHRoaXMudHlwZS51bml0KSB7XG4gICAgICAgICAgICBjYXNlIERhdGVVbml0LkRBWTogcmV0dXJuIG5ldyBJbnRWZWN0b3IoZGF0YSwgbmV3IFRpbWVzdGFtcERheVZpZXcoZGF0YSBhcyBhbnksIDEpIGFzIGFueSk7XG4gICAgICAgICAgICBjYXNlIERhdGVVbml0Lk1JTExJU0VDT05EOiByZXR1cm4gbmV3IEludFZlY3RvcihkYXRhLCBuZXcgVGltZXN0YW1wTWlsbGlzZWNvbmRWaWV3KGRhdGEgYXMgYW55LCAyKSBhcyBhbnkpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFVucmVjb2duaXplZCBkYXRlIHVuaXQgXCIke0RhdGVVbml0W3RoaXMudHlwZS51bml0XX1cImApO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIERlY2ltYWxWZWN0b3IgZXh0ZW5kcyBGbGF0VmVjdG9yPERlY2ltYWw+IHtcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPERlY2ltYWw+LCB2aWV3OiBWaWV3PERlY2ltYWw+ID0gbmV3IEZpeGVkU2l6ZVZpZXcoZGF0YSwgNCkpIHtcbiAgICAgICAgc3VwZXIoZGF0YSwgdmlldyk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgVGltZVZlY3RvciBleHRlbmRzIEZsYXRWZWN0b3I8VGltZT4ge1xuICAgIHN0YXRpYyBkZWZhdWx0VmlldzxUIGV4dGVuZHMgVGltZT4oZGF0YTogRGF0YTxUPikge1xuICAgICAgICByZXR1cm4gZGF0YS50eXBlLmJpdFdpZHRoIDw9IDMyID8gbmV3IEZsYXRWaWV3KGRhdGEpIDogbmV3IEZpeGVkU2l6ZVZpZXcoZGF0YSwgKGRhdGEudHlwZS5iaXRXaWR0aCAvIDMyKSB8IDApO1xuICAgIH1cbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPFRpbWU+LCB2aWV3OiBWaWV3PFRpbWU+ID0gVGltZVZlY3Rvci5kZWZhdWx0VmlldyhkYXRhKSkge1xuICAgICAgICBzdXBlcihkYXRhLCB2aWV3KTtcbiAgICB9XG4gICAgcHVibGljIGxvd3MoKTogSW50VmVjdG9yPEludDMyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnR5cGUuYml0V2lkdGggPD0gMzIgPyB0aGlzLmFzSW50MzIoMCwgMSkgOiB0aGlzLmFzSW50MzIoMCwgMik7XG4gICAgfVxuICAgIHB1YmxpYyBoaWdocygpOiBJbnRWZWN0b3I8SW50MzI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMudHlwZS5iaXRXaWR0aCA8PSAzMiA/IHRoaXMuYXNJbnQzMigwLCAxKSA6IHRoaXMuYXNJbnQzMigxLCAyKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBUaW1lc3RhbXBWZWN0b3IgZXh0ZW5kcyBGbGF0VmVjdG9yPFRpbWVzdGFtcD4ge1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8VGltZXN0YW1wPiwgdmlldzogVmlldzxUaW1lc3RhbXA+ID0gbmV3IEZpeGVkU2l6ZVZpZXcoZGF0YSwgMikpIHtcbiAgICAgICAgc3VwZXIoZGF0YSwgdmlldyk7XG4gICAgfVxuICAgIHB1YmxpYyBhc0Vwb2NoTWlsbGlzZWNvbmRzKCk6IEludFZlY3RvcjxJbnQzMj4ge1xuICAgICAgICBsZXQgZGF0YSA9ICh0aGlzLmRhdGEgYXMgRmxhdERhdGE8YW55PikuY2xvbmUobmV3IEludDMyKCkpO1xuICAgICAgICBzd2l0Y2ggKHRoaXMudHlwZS51bml0KSB7XG4gICAgICAgICAgICBjYXNlIFRpbWVVbml0LlNFQ09ORDogcmV0dXJuIG5ldyBJbnRWZWN0b3IoZGF0YSwgbmV3IFRpbWVzdGFtcFNlY29uZFZpZXcoZGF0YSBhcyBhbnksIDEpIGFzIGFueSk7XG4gICAgICAgICAgICBjYXNlIFRpbWVVbml0Lk1JTExJU0VDT05EOiByZXR1cm4gbmV3IEludFZlY3RvcihkYXRhLCBuZXcgVGltZXN0YW1wTWlsbGlzZWNvbmRWaWV3KGRhdGEgYXMgYW55LCAyKSBhcyBhbnkpO1xuICAgICAgICAgICAgY2FzZSBUaW1lVW5pdC5NSUNST1NFQ09ORDogcmV0dXJuIG5ldyBJbnRWZWN0b3IoZGF0YSwgbmV3IFRpbWVzdGFtcE1pY3Jvc2Vjb25kVmlldyhkYXRhIGFzIGFueSwgMikgYXMgYW55KTtcbiAgICAgICAgICAgIGNhc2UgVGltZVVuaXQuTkFOT1NFQ09ORDogcmV0dXJuIG5ldyBJbnRWZWN0b3IoZGF0YSwgbmV3IFRpbWVzdGFtcE5hbm9zZWNvbmRWaWV3KGRhdGEgYXMgYW55LCAyKSBhcyBhbnkpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFVucmVjb2duaXplZCB0aW1lIHVuaXQgXCIke1RpbWVVbml0W3RoaXMudHlwZS51bml0XX1cImApO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEludGVydmFsVmVjdG9yIGV4dGVuZHMgRmxhdFZlY3RvcjxJbnRlcnZhbD4ge1xuICAgIHN0YXRpYyBkZWZhdWx0VmlldzxUIGV4dGVuZHMgSW50ZXJ2YWw+KGRhdGE6IERhdGE8VD4pIHtcbiAgICAgICAgcmV0dXJuIGRhdGEudHlwZS51bml0ID09PSBJbnRlcnZhbFVuaXQuWUVBUl9NT05USCA/IG5ldyBJbnRlcnZhbFllYXJNb250aFZpZXcoZGF0YSkgOiBuZXcgRml4ZWRTaXplVmlldyhkYXRhLCAyKTtcbiAgICB9XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxJbnRlcnZhbD4sIHZpZXc6IFZpZXc8SW50ZXJ2YWw+ID0gSW50ZXJ2YWxWZWN0b3IuZGVmYXVsdFZpZXcoZGF0YSkpIHtcbiAgICAgICAgc3VwZXIoZGF0YSwgdmlldyk7XG4gICAgfVxuICAgIHB1YmxpYyBsb3dzKCk6IEludFZlY3RvcjxJbnQzMj4ge1xuICAgICAgICByZXR1cm4gdGhpcy50eXBlLnVuaXQgPT09IEludGVydmFsVW5pdC5ZRUFSX01PTlRIID8gdGhpcy5hc0ludDMyKDAsIDEpIDogdGhpcy5hc0ludDMyKDAsIDIpO1xuICAgIH1cbiAgICBwdWJsaWMgaGlnaHMoKTogSW50VmVjdG9yPEludDMyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnR5cGUudW5pdCA9PT0gSW50ZXJ2YWxVbml0LllFQVJfTU9OVEggPyB0aGlzLmFzSW50MzIoMCwgMSkgOiB0aGlzLmFzSW50MzIoMSwgMik7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgQmluYXJ5VmVjdG9yIGV4dGVuZHMgTGlzdFZlY3RvckJhc2U8QmluYXJ5PiB7XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxCaW5hcnk+LCB2aWV3OiBWaWV3PEJpbmFyeT4gPSBuZXcgQmluYXJ5VmlldyhkYXRhKSkge1xuICAgICAgICBzdXBlcihkYXRhLCB2aWV3KTtcbiAgICB9XG4gICAgcHVibGljIGFzVXRmOCgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBVdGY4VmVjdG9yKCh0aGlzLmRhdGEgYXMgRmxhdExpc3REYXRhPGFueT4pLmNsb25lKG5ldyBVdGY4KCkpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBGaXhlZFNpemVCaW5hcnlWZWN0b3IgZXh0ZW5kcyBGbGF0VmVjdG9yPEZpeGVkU2l6ZUJpbmFyeT4ge1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8Rml4ZWRTaXplQmluYXJ5PiwgdmlldzogVmlldzxGaXhlZFNpemVCaW5hcnk+ID0gbmV3IEZpeGVkU2l6ZVZpZXcoZGF0YSwgZGF0YS50eXBlLmJ5dGVXaWR0aCkpIHtcbiAgICAgICAgc3VwZXIoZGF0YSwgdmlldyk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgVXRmOFZlY3RvciBleHRlbmRzIExpc3RWZWN0b3JCYXNlPFV0Zjg+IHtcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPFV0Zjg+LCB2aWV3OiBWaWV3PFV0Zjg+ID0gbmV3IFV0ZjhWaWV3KGRhdGEpKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHZpZXcpO1xuICAgIH1cbiAgICBwdWJsaWMgYXNCaW5hcnkoKSB7XG4gICAgICAgIHJldHVybiBuZXcgQmluYXJ5VmVjdG9yKCh0aGlzLmRhdGEgYXMgRmxhdExpc3REYXRhPGFueT4pLmNsb25lKG5ldyBCaW5hcnkoKSkpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIExpc3RWZWN0b3I8VCBleHRlbmRzIERhdGFUeXBlID0gRGF0YVR5cGU+IGV4dGVuZHMgTGlzdFZlY3RvckJhc2U8TGlzdDxUPj4ge1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgcmVhZG9ubHkgdmlldzogTGlzdFZpZXc8VD47XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxUPiwgdmlldzogVmlldzxMaXN0PFQ+PiA9IG5ldyBMaXN0VmlldyhkYXRhKSkge1xuICAgICAgICBzdXBlcihkYXRhLCB2aWV3KTtcbiAgICB9XG4gICAgcHVibGljIGdldENoaWxkQXQoaW5kZXg6IG51bWJlcik6IFZlY3RvcjxUPiB8IG51bGwge1xuICAgICAgICByZXR1cm4gdGhpcy52aWV3LmdldENoaWxkQXQ8VD4oaW5kZXgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEZpeGVkU2l6ZUxpc3RWZWN0b3I8VCBleHRlbmRzIERhdGFUeXBlID0gRGF0YVR5cGU+IGV4dGVuZHMgVmVjdG9yPEZpeGVkU2l6ZUxpc3Q8VD4+IHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIHJlYWRvbmx5IHZpZXc6IEZpeGVkU2l6ZUxpc3RWaWV3PFQ+O1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8Rml4ZWRTaXplTGlzdDxUPj4sIHZpZXc6IFZpZXc8Rml4ZWRTaXplTGlzdDxUPj4gPSBuZXcgRml4ZWRTaXplTGlzdFZpZXcoZGF0YSkpIHtcbiAgICAgICAgc3VwZXIoZGF0YSwgdmlldyk7XG4gICAgfVxuICAgIHB1YmxpYyBnZXRDaGlsZEF0KGluZGV4OiBudW1iZXIpOiBWZWN0b3I8VD4gfCBudWxsIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmlldy5nZXRDaGlsZEF0PFQ+KGluZGV4KTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBNYXBWZWN0b3IgZXh0ZW5kcyBOZXN0ZWRWZWN0b3I8TWFwXz4ge1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8TWFwXz4sIHZpZXc6IFZpZXc8TWFwXz4gPSBuZXcgTWFwVmlldyhkYXRhKSkge1xuICAgICAgICBzdXBlcihkYXRhLCB2aWV3KTtcbiAgICB9XG4gICAgcHVibGljIGFzU3RydWN0KCkge1xuICAgICAgICByZXR1cm4gbmV3IFN0cnVjdFZlY3RvcigodGhpcy5kYXRhIGFzIE5lc3RlZERhdGE8YW55PikuY2xvbmUobmV3IFN0cnVjdCh0aGlzLnR5cGUuY2hpbGRyZW4pKSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgU3RydWN0VmVjdG9yIGV4dGVuZHMgTmVzdGVkVmVjdG9yPFN0cnVjdD4ge1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8U3RydWN0PiwgdmlldzogVmlldzxTdHJ1Y3Q+ID0gbmV3IFN0cnVjdFZpZXcoZGF0YSkpIHtcbiAgICAgICAgc3VwZXIoZGF0YSwgdmlldyk7XG4gICAgfVxuICAgIHB1YmxpYyBhc01hcChrZXlzU29ydGVkOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBNYXBWZWN0b3IoKHRoaXMuZGF0YSBhcyBOZXN0ZWREYXRhPGFueT4pLmNsb25lKG5ldyBNYXBfKGtleXNTb3J0ZWQsIHRoaXMudHlwZS5jaGlsZHJlbikpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBVbmlvblZlY3RvcjxUIGV4dGVuZHMgKFNwYXJzZVVuaW9uIHwgRGVuc2VVbmlvbikgPSBhbnk+IGV4dGVuZHMgTmVzdGVkVmVjdG9yPFQ+IHtcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPFQ+LCB2aWV3OiBWaWV3PFQ+ID0gPGFueT4gKGRhdGEudHlwZS5tb2RlID09PSBVbmlvbk1vZGUuU3BhcnNlID8gbmV3IFVuaW9uVmlldzxTcGFyc2VVbmlvbj4oZGF0YSBhcyBEYXRhPFNwYXJzZVVuaW9uPikgOiBuZXcgRGVuc2VVbmlvblZpZXcoZGF0YSBhcyBEYXRhPERlbnNlVW5pb24+KSkpIHtcbiAgICAgICAgc3VwZXIoZGF0YSwgdmlldyk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgRGljdGlvbmFyeVZlY3RvcjxUIGV4dGVuZHMgRGF0YVR5cGUgPSBEYXRhVHlwZT4gZXh0ZW5kcyBWZWN0b3I8RGljdGlvbmFyeTxUPj4ge1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgcmVhZG9ubHkgaW5kaWNlczogVmVjdG9yPEludD47XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyByZWFkb25seSBkaWN0aW9uYXJ5OiBWZWN0b3I8VD47XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxEaWN0aW9uYXJ5PFQ+PiwgdmlldzogVmlldzxEaWN0aW9uYXJ5PFQ+PiA9IG5ldyBEaWN0aW9uYXJ5VmlldzxUPihkYXRhLmRpY3Rpb25hcnksIG5ldyBJbnRWZWN0b3IoZGF0YS5pbmRpY2VzKSkpIHtcbiAgICAgICAgc3VwZXIoZGF0YSBhcyBEYXRhPGFueT4sIHZpZXcpO1xuICAgICAgICBpZiAodmlldyBpbnN0YW5jZW9mIFZhbGlkaXR5Vmlldykge1xuICAgICAgICAgICAgdmlldyA9ICh2aWV3IGFzIGFueSkudmlldztcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YSBpbnN0YW5jZW9mIERpY3Rpb25hcnlEYXRhICYmIHZpZXcgaW5zdGFuY2VvZiBEaWN0aW9uYXJ5Vmlldykge1xuICAgICAgICAgICAgdGhpcy5pbmRpY2VzID0gdmlldy5pbmRpY2VzO1xuICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJ5ID0gZGF0YS5kaWN0aW9uYXJ5O1xuICAgICAgICB9IGVsc2UgaWYgKGRhdGEgaW5zdGFuY2VvZiBDaHVua2VkRGF0YSAmJiB2aWV3IGluc3RhbmNlb2YgQ2h1bmtlZFZpZXcpIHtcbiAgICAgICAgICAgIGNvbnN0IGNodW5rcyA9IHZpZXcuY2h1bmtWZWN0b3JzIGFzIERpY3Rpb25hcnlWZWN0b3I8VD5bXTtcbiAgICAgICAgICAgIC8vIEFzc3VtZSB0aGUgbGFzdCBjaHVuaydzIGRpY3Rpb25hcnkgZGF0YSBpcyB0aGUgbW9zdCB1cC10by1kYXRlLFxuICAgICAgICAgICAgLy8gaW5jbHVkaW5nIGRhdGEgZnJvbSBEaWN0aW9uYXJ5QmF0Y2hlcyB0aGF0IHdlcmUgbWFya2VkIGFzIGRlbHRhc1xuICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJ5ID0gY2h1bmtzW2NodW5rcy5sZW5ndGggLSAxXS5kaWN0aW9uYXJ5O1xuICAgICAgICAgICAgdGhpcy5pbmRpY2VzID0gY2h1bmtzLnJlZHVjZTxWZWN0b3I8SW50PiB8IG51bGw+KFxuICAgICAgICAgICAgICAgIChpZHhzOiBWZWN0b3I8SW50PiB8IG51bGwsIGRpY3Q6IERpY3Rpb25hcnlWZWN0b3I8VD4pID0+XG4gICAgICAgICAgICAgICAgICAgICFpZHhzID8gZGljdC5pbmRpY2VzISA6IGlkeHMuY29uY2F0KGRpY3QuaW5kaWNlcyEpLFxuICAgICAgICAgICAgICAgIG51bGxcbiAgICAgICAgICAgICkhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVW5yZWNvZ25pemVkIERpY3Rpb25hcnlWZWN0b3Igdmlld2ApO1xuICAgICAgICB9XG4gICAgfVxuICAgIHB1YmxpYyBnZXRLZXkoaW5kZXg6IG51bWJlcikgeyByZXR1cm4gdGhpcy5pbmRpY2VzLmdldChpbmRleCk7IH1cbiAgICBwdWJsaWMgZ2V0VmFsdWUoa2V5OiBudW1iZXIpIHsgcmV0dXJuIHRoaXMuZGljdGlvbmFyeS5nZXQoa2V5KTsgfVxuICAgIHB1YmxpYyByZXZlcnNlTG9va3VwKHZhbHVlOiBUKSB7IHJldHVybiB0aGlzLmRpY3Rpb25hcnkuaW5kZXhPZih2YWx1ZSk7IH1cbn1cblxuZXhwb3J0IGNvbnN0IGNyZWF0ZVZlY3RvciA9ICgoVmVjdG9yTG9hZGVyOiBuZXcgPFQgZXh0ZW5kcyBEYXRhVHlwZT4oZGF0YTogRGF0YTxUPikgPT4gVHlwZVZpc2l0b3IpID0+IChcbiAgICA8VCBleHRlbmRzIERhdGFUeXBlPihkYXRhOiBEYXRhPFQ+KSA9PiBUeXBlVmlzaXRvci52aXNpdFR5cGVJbmxpbmUobmV3IFZlY3RvckxvYWRlcihkYXRhKSwgZGF0YS50eXBlKSBhcyBWZWN0b3I8VD5cbikpKGNsYXNzIFZlY3RvckxvYWRlcjxUIGV4dGVuZHMgRGF0YVR5cGU+IGV4dGVuZHMgVHlwZVZpc2l0b3Ige1xuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgZGF0YTogRGF0YTxUPikgeyBzdXBlcigpOyB9XG4gICAgdmlzaXROdWxsICAgICAgICAgICAoX3R5cGU6IE51bGwpICAgICAgICAgICAgeyByZXR1cm4gbmV3IE51bGxWZWN0b3IodGhpcy5kYXRhKTsgICAgICAgICAgICB9XG4gICAgdmlzaXRJbnQgICAgICAgICAgICAoX3R5cGU6IEludCkgICAgICAgICAgICAgeyByZXR1cm4gbmV3IEludFZlY3Rvcih0aGlzLmRhdGEpOyAgICAgICAgICAgICB9XG4gICAgdmlzaXRGbG9hdCAgICAgICAgICAoX3R5cGU6IEZsb2F0KSAgICAgICAgICAgeyByZXR1cm4gbmV3IEZsb2F0VmVjdG9yKHRoaXMuZGF0YSk7ICAgICAgICAgICB9XG4gICAgdmlzaXRCaW5hcnkgICAgICAgICAoX3R5cGU6IEJpbmFyeSkgICAgICAgICAgeyByZXR1cm4gbmV3IEJpbmFyeVZlY3Rvcih0aGlzLmRhdGEpOyAgICAgICAgICB9XG4gICAgdmlzaXRVdGY4ICAgICAgICAgICAoX3R5cGU6IFV0ZjgpICAgICAgICAgICAgeyByZXR1cm4gbmV3IFV0ZjhWZWN0b3IodGhpcy5kYXRhKTsgICAgICAgICAgICB9XG4gICAgdmlzaXRCb29sICAgICAgICAgICAoX3R5cGU6IEJvb2wpICAgICAgICAgICAgeyByZXR1cm4gbmV3IEJvb2xWZWN0b3IodGhpcy5kYXRhKTsgICAgICAgICAgICB9XG4gICAgdmlzaXREZWNpbWFsICAgICAgICAoX3R5cGU6IERlY2ltYWwpICAgICAgICAgeyByZXR1cm4gbmV3IERlY2ltYWxWZWN0b3IodGhpcy5kYXRhKTsgICAgICAgICB9XG4gICAgdmlzaXREYXRlICAgICAgICAgICAoX3R5cGU6IERhdGVfKSAgICAgICAgICAgeyByZXR1cm4gbmV3IERhdGVWZWN0b3IodGhpcy5kYXRhKTsgICAgICAgICAgICB9XG4gICAgdmlzaXRUaW1lICAgICAgICAgICAoX3R5cGU6IFRpbWUpICAgICAgICAgICAgeyByZXR1cm4gbmV3IFRpbWVWZWN0b3IodGhpcy5kYXRhKTsgICAgICAgICAgICB9XG4gICAgdmlzaXRUaW1lc3RhbXAgICAgICAoX3R5cGU6IFRpbWVzdGFtcCkgICAgICAgeyByZXR1cm4gbmV3IFRpbWVzdGFtcFZlY3Rvcih0aGlzLmRhdGEpOyAgICAgICB9XG4gICAgdmlzaXRJbnRlcnZhbCAgICAgICAoX3R5cGU6IEludGVydmFsKSAgICAgICAgeyByZXR1cm4gbmV3IEludGVydmFsVmVjdG9yKHRoaXMuZGF0YSk7ICAgICAgICB9XG4gICAgdmlzaXRMaXN0ICAgICAgICAgICAoX3R5cGU6IExpc3QpICAgICAgICAgICAgeyByZXR1cm4gbmV3IExpc3RWZWN0b3IodGhpcy5kYXRhKTsgICAgICAgICAgICB9XG4gICAgdmlzaXRTdHJ1Y3QgICAgICAgICAoX3R5cGU6IFN0cnVjdCkgICAgICAgICAgeyByZXR1cm4gbmV3IFN0cnVjdFZlY3Rvcih0aGlzLmRhdGEpOyAgICAgICAgICB9XG4gICAgdmlzaXRVbmlvbiAgICAgICAgICAoX3R5cGU6IFVuaW9uKSAgICAgICAgICAgeyByZXR1cm4gbmV3IFVuaW9uVmVjdG9yKHRoaXMuZGF0YSk7ICAgICAgICAgICB9XG4gICAgdmlzaXRGaXhlZFNpemVCaW5hcnkoX3R5cGU6IEZpeGVkU2l6ZUJpbmFyeSkgeyByZXR1cm4gbmV3IEZpeGVkU2l6ZUJpbmFyeVZlY3Rvcih0aGlzLmRhdGEpOyB9XG4gICAgdmlzaXRGaXhlZFNpemVMaXN0ICAoX3R5cGU6IEZpeGVkU2l6ZUxpc3QpICAgeyByZXR1cm4gbmV3IEZpeGVkU2l6ZUxpc3RWZWN0b3IodGhpcy5kYXRhKTsgICB9XG4gICAgdmlzaXRNYXAgICAgICAgICAgICAoX3R5cGU6IE1hcF8pICAgICAgICAgICAgeyByZXR1cm4gbmV3IE1hcFZlY3Rvcih0aGlzLmRhdGEpOyAgICAgICAgICAgICB9XG4gICAgdmlzaXREaWN0aW9uYXJ5ICAgICAoX3R5cGU6IERpY3Rpb25hcnkpICAgICAgeyByZXR1cm4gbmV3IERpY3Rpb25hcnlWZWN0b3IodGhpcy5kYXRhKTsgICAgICB9XG59KTtcbiJdfQ==

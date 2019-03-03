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
var row_1 = require("./row");
exports.Row = row_1.Row;
var vector_1 = require("../vector");
exports.Vector = vector_1.Vector;
var base_1 = require("./base");
exports.BaseVector = base_1.BaseVector;
var binary_1 = require("./binary");
exports.BinaryVector = binary_1.BinaryVector;
var bool_1 = require("./bool");
exports.BoolVector = bool_1.BoolVector;
var chunked_1 = require("./chunked");
exports.Chunked = chunked_1.Chunked;
var date_1 = require("./date");
exports.DateVector = date_1.DateVector;
exports.DateDayVector = date_1.DateDayVector;
exports.DateMillisecondVector = date_1.DateMillisecondVector;
var decimal_1 = require("./decimal");
exports.DecimalVector = decimal_1.DecimalVector;
var dictionary_1 = require("./dictionary");
exports.DictionaryVector = dictionary_1.DictionaryVector;
var fixedsizebinary_1 = require("./fixedsizebinary");
exports.FixedSizeBinaryVector = fixedsizebinary_1.FixedSizeBinaryVector;
var fixedsizelist_1 = require("./fixedsizelist");
exports.FixedSizeListVector = fixedsizelist_1.FixedSizeListVector;
var float_1 = require("./float");
exports.FloatVector = float_1.FloatVector;
exports.Float16Vector = float_1.Float16Vector;
exports.Float32Vector = float_1.Float32Vector;
exports.Float64Vector = float_1.Float64Vector;
var interval_1 = require("./interval");
exports.IntervalVector = interval_1.IntervalVector;
exports.IntervalDayTimeVector = interval_1.IntervalDayTimeVector;
exports.IntervalYearMonthVector = interval_1.IntervalYearMonthVector;
var int_1 = require("./int");
exports.IntVector = int_1.IntVector;
exports.Int8Vector = int_1.Int8Vector;
exports.Int16Vector = int_1.Int16Vector;
exports.Int32Vector = int_1.Int32Vector;
exports.Int64Vector = int_1.Int64Vector;
exports.Uint8Vector = int_1.Uint8Vector;
exports.Uint16Vector = int_1.Uint16Vector;
exports.Uint32Vector = int_1.Uint32Vector;
exports.Uint64Vector = int_1.Uint64Vector;
var list_1 = require("./list");
exports.ListVector = list_1.ListVector;
var map_1 = require("./map");
exports.MapVector = map_1.MapVector;
var null_1 = require("./null");
exports.NullVector = null_1.NullVector;
var struct_1 = require("./struct");
exports.StructVector = struct_1.StructVector;
var timestamp_1 = require("./timestamp");
exports.TimestampVector = timestamp_1.TimestampVector;
exports.TimestampSecondVector = timestamp_1.TimestampSecondVector;
exports.TimestampMillisecondVector = timestamp_1.TimestampMillisecondVector;
exports.TimestampMicrosecondVector = timestamp_1.TimestampMicrosecondVector;
exports.TimestampNanosecondVector = timestamp_1.TimestampNanosecondVector;
var time_1 = require("./time");
exports.TimeVector = time_1.TimeVector;
exports.TimeSecondVector = time_1.TimeSecondVector;
exports.TimeMillisecondVector = time_1.TimeMillisecondVector;
exports.TimeMicrosecondVector = time_1.TimeMicrosecondVector;
exports.TimeNanosecondVector = time_1.TimeNanosecondVector;
var union_1 = require("./union");
exports.UnionVector = union_1.UnionVector;
exports.DenseUnionVector = union_1.DenseUnionVector;
exports.SparseUnionVector = union_1.SparseUnionVector;
var utf8_1 = require("./utf8");
exports.Utf8Vector = utf8_1.Utf8Vector;
const enum_1 = require("../enum");
const vector_2 = require("../vector");
const base_2 = require("./base");
const bit_1 = require("../util/bit");
const get_1 = require("../visitor/get");
const set_1 = require("../visitor/set");
const indexof_1 = require("../visitor/indexof");
const toarray_1 = require("../visitor/toarray");
const iterator_1 = require("../visitor/iterator");
const bytewidth_1 = require("../visitor/bytewidth");
const vectorctor_1 = require("../visitor/vectorctor");
/** @nocollapse */
vector_2.Vector.new = newVector;
/** @ignore */
function newVector(data, ...args) {
    return new (vectorctor_1.instance.getVisitFn(data.type)())(data, ...args);
}
//
// We provide the following method implementations for code navigability purposes only.
// They're overridden at runtime below with the specific Visitor implementation for each type,
// short-circuiting the usual Visitor traversal and reducing intermediate lookups and calls.
// This comment is here to remind you to not set breakpoints in these function bodies, or to inform
// you why the breakpoints you have already set are not being triggered. Have a great day!
//
base_2.BaseVector.prototype.get = function baseVectorGet(index) {
    return get_1.instance.visit(this, index);
};
base_2.BaseVector.prototype.set = function baseVectorSet(index, value) {
    return set_1.instance.visit(this, index, value);
};
base_2.BaseVector.prototype.indexOf = function baseVectorIndexOf(value, fromIndex) {
    return indexof_1.instance.visit(this, value, fromIndex);
};
base_2.BaseVector.prototype.toArray = function baseVectorToArray() {
    return toarray_1.instance.visit(this);
};
base_2.BaseVector.prototype.getByteWidth = function baseVectorGetByteWidth() {
    return bytewidth_1.instance.visit(this.type);
};
base_2.BaseVector.prototype[Symbol.iterator] = function baseVectorSymbolIterator() {
    return iterator_1.instance.visit(this);
};
base_2.BaseVector.prototype._bindDataAccessors = bindBaseVectorDataAccessors;
// Perf: bind and assign the operator Visitor methods to each of the Vector subclasses for each Type
Object.keys(enum_1.Type)
    .filter((typeId) => typeId !== enum_1.Type.NONE && typeId !== enum_1.Type[enum_1.Type.NONE])
    .map((T) => enum_1.Type[T]).filter((T) => typeof T === 'number')
    .forEach((typeId) => {
    let typeIds;
    switch (typeId) {
        case enum_1.Type.Int:
            typeIds = [enum_1.Type.Int8, enum_1.Type.Int16, enum_1.Type.Int32, enum_1.Type.Int64, enum_1.Type.Uint8, enum_1.Type.Uint16, enum_1.Type.Uint32, enum_1.Type.Uint64];
            break;
        case enum_1.Type.Float:
            typeIds = [enum_1.Type.Float16, enum_1.Type.Float32, enum_1.Type.Float64];
            break;
        case enum_1.Type.Date:
            typeIds = [enum_1.Type.DateDay, enum_1.Type.DateMillisecond];
            break;
        case enum_1.Type.Time:
            typeIds = [enum_1.Type.TimeSecond, enum_1.Type.TimeMillisecond, enum_1.Type.TimeMicrosecond, enum_1.Type.TimeNanosecond];
            break;
        case enum_1.Type.Timestamp:
            typeIds = [enum_1.Type.TimestampSecond, enum_1.Type.TimestampMillisecond, enum_1.Type.TimestampMicrosecond, enum_1.Type.TimestampNanosecond];
            break;
        case enum_1.Type.Interval:
            typeIds = [enum_1.Type.IntervalDayTime, enum_1.Type.IntervalYearMonth];
            break;
        case enum_1.Type.Union:
            typeIds = [enum_1.Type.DenseUnion, enum_1.Type.SparseUnion];
            break;
        default:
            typeIds = [typeId];
            break;
    }
    typeIds.forEach((typeId) => {
        const VectorCtor = vectorctor_1.instance.visit(typeId);
        VectorCtor.prototype['get'] = partial1(get_1.instance.getVisitFn(typeId));
        VectorCtor.prototype['set'] = partial2(set_1.instance.getVisitFn(typeId));
        VectorCtor.prototype['indexOf'] = partial2(indexof_1.instance.getVisitFn(typeId));
        VectorCtor.prototype['toArray'] = partial0(toarray_1.instance.getVisitFn(typeId));
        VectorCtor.prototype['getByteWidth'] = partialType0(bytewidth_1.instance.getVisitFn(typeId));
        VectorCtor.prototype[Symbol.iterator] = partial0(iterator_1.instance.getVisitFn(typeId));
    });
});
/** @ignore */
function partial0(visit) {
    return function () { return visit(this); };
}
/** @ignore */
function partialType0(visit) {
    return function () { return visit(this.type); };
}
/** @ignore */
function partial1(visit) {
    return function (a) { return visit(this, a); };
}
/** @ignore */
function partial2(visit) {
    return function (a, b) { return visit(this, a, b); };
}
/** @ignore */
function wrapNullableGet(fn) {
    return function (i) { return this.isValid(i) ? fn.call(this, i) : null; };
}
/** @ignore */
function wrapNullableSet(fn) {
    return function (i, a) {
        if (bit_1.setBool(this.nullBitmap, this.offset + i, !(a === null || a === undefined))) {
            fn.call(this, i, a);
        }
    };
}
/** @ignore */
function bindBaseVectorDataAccessors() {
    const nullBitmap = this.nullBitmap;
    if (nullBitmap && nullBitmap.byteLength > 0) {
        this.get = wrapNullableGet(this.get);
        this.set = wrapNullableSet(this.set);
    }
}

//# sourceMappingURL=index.js.map

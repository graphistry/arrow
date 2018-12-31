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
        VectorCtor.prototype['getByteWidth'] = partial0(bytewidth_1.instance.getVisitFn(typeId));
        VectorCtor.prototype[Symbol.iterator] = partial0(iterator_1.instance.getVisitFn(typeId));
    });
});
/** @ignore */
function partial0(visit) {
    return function () { return visit(this); };
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
function wrapNullable1(fn) {
    return function (i) { return this.isValid(i) ? fn.call(this, i) : null; };
}
/** @ignore */
function wrapNullableSet(fn) {
    return function (i, a) {
        if (bit_1.setBool(this.nullBitmap, this.offset + i, a != null)) {
            fn.call(this, i, a);
        }
    };
}
/** @ignore */
function bindBaseVectorDataAccessors() {
    const type = this.type;
    this['get'] = get_1.instance.getVisitFn(type).bind(this, this);
    this['set'] = set_1.instance.getVisitFn(type).bind(this, this);
    this['indexOf'] = indexof_1.instance.getVisitFn(type).bind(this, this);
    this['toArray'] = toarray_1.instance.getVisitFn(type).bind(this, this);
    this[Symbol.iterator] = iterator_1.instance.getVisitFn(type).bind(this, this);
    if (this.nullCount > 0) {
        this['get'] = wrapNullable1(this['get']);
        this['set'] = wrapNullableSet(this['set']);
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInZlY3Rvci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsNkRBQTZEO0FBQzdELCtEQUErRDtBQUMvRCx3REFBd0Q7QUFDeEQsNkRBQTZEO0FBQzdELG9EQUFvRDtBQUNwRCw2REFBNkQ7QUFDN0QsNkRBQTZEO0FBQzdELEVBQUU7QUFDRiwrQ0FBK0M7QUFDL0MsRUFBRTtBQUNGLDZEQUE2RDtBQUM3RCw4REFBOEQ7QUFDOUQseURBQXlEO0FBQ3pELDREQUE0RDtBQUM1RCwwREFBMEQ7QUFDMUQscUJBQXFCOztBQUVyQiw2QkFBNEI7QUFBbkIsb0JBQUEsR0FBRyxDQUFBO0FBQ1osb0NBQW1DO0FBQTFCLDBCQUFBLE1BQU0sQ0FBQTtBQUNmLCtCQUFvQztBQUEzQiw0QkFBQSxVQUFVLENBQUE7QUFDbkIsbUNBQXdDO0FBQS9CLGdDQUFBLFlBQVksQ0FBQTtBQUNyQiwrQkFBb0M7QUFBM0IsNEJBQUEsVUFBVSxDQUFBO0FBQ25CLHFDQUFvQztBQUEzQiw0QkFBQSxPQUFPLENBQUE7QUFDaEIsK0JBQTBFO0FBQWpFLDRCQUFBLFVBQVUsQ0FBQTtBQUFFLCtCQUFBLGFBQWEsQ0FBQTtBQUFFLHVDQUFBLHFCQUFxQixDQUFBO0FBQ3pELHFDQUEwQztBQUFqQyxrQ0FBQSxhQUFhLENBQUE7QUFDdEIsMkNBQWdEO0FBQXZDLHdDQUFBLGdCQUFnQixDQUFBO0FBQ3pCLHFEQUEwRDtBQUFqRCxrREFBQSxxQkFBcUIsQ0FBQTtBQUM5QixpREFBc0Q7QUFBN0MsOENBQUEsbUJBQW1CLENBQUE7QUFDNUIsaUNBQW1GO0FBQTFFLDhCQUFBLFdBQVcsQ0FBQTtBQUFFLGdDQUFBLGFBQWEsQ0FBQTtBQUFFLGdDQUFBLGFBQWEsQ0FBQTtBQUFFLGdDQUFBLGFBQWEsQ0FBQTtBQUNqRSx1Q0FBNEY7QUFBbkYsb0NBQUEsY0FBYyxDQUFBO0FBQUUsMkNBQUEscUJBQXFCLENBQUE7QUFBRSw2Q0FBQSx1QkFBdUIsQ0FBQTtBQUN2RSw2QkFBNEk7QUFBbkksMEJBQUEsU0FBUyxDQUFBO0FBQUUsMkJBQUEsVUFBVSxDQUFBO0FBQUUsNEJBQUEsV0FBVyxDQUFBO0FBQUUsNEJBQUEsV0FBVyxDQUFBO0FBQUUsNEJBQUEsV0FBVyxDQUFBO0FBQUUsNEJBQUEsV0FBVyxDQUFBO0FBQUUsNkJBQUEsWUFBWSxDQUFBO0FBQUUsNkJBQUEsWUFBWSxDQUFBO0FBQUUsNkJBQUEsWUFBWSxDQUFBO0FBQzVILCtCQUFvQztBQUEzQiw0QkFBQSxVQUFVLENBQUE7QUFDbkIsNkJBQWtDO0FBQXpCLDBCQUFBLFNBQVMsQ0FBQTtBQUNsQiwrQkFBb0M7QUFBM0IsNEJBQUEsVUFBVSxDQUFBO0FBQ25CLG1DQUF3QztBQUEvQixnQ0FBQSxZQUFZLENBQUE7QUFDckIseUNBQXdKO0FBQS9JLHNDQUFBLGVBQWUsQ0FBQTtBQUFFLDRDQUFBLHFCQUFxQixDQUFBO0FBQUUsaURBQUEsMEJBQTBCLENBQUE7QUFBRSxpREFBQSwwQkFBMEIsQ0FBQTtBQUFFLGdEQUFBLHlCQUF5QixDQUFBO0FBQ2xJLCtCQUEwSDtBQUFqSCw0QkFBQSxVQUFVLENBQUE7QUFBRSxrQ0FBQSxnQkFBZ0IsQ0FBQTtBQUFFLHVDQUFBLHFCQUFxQixDQUFBO0FBQUUsdUNBQUEscUJBQXFCLENBQUE7QUFBRSxzQ0FBQSxvQkFBb0IsQ0FBQTtBQUN6RyxpQ0FBMkU7QUFBbEUsOEJBQUEsV0FBVyxDQUFBO0FBQUUsbUNBQUEsZ0JBQWdCLENBQUE7QUFBRSxvQ0FBQSxpQkFBaUIsQ0FBQTtBQUN6RCwrQkFBb0M7QUFBM0IsNEJBQUEsVUFBVSxDQUFBO0FBR25CLGtDQUErQjtBQUMvQixzQ0FBbUM7QUFFbkMsaUNBQW9DO0FBQ3BDLHFDQUFzQztBQUV0Qyx3Q0FBd0Q7QUFDeEQsd0NBQXdEO0FBQ3hELGdEQUFnRTtBQUNoRSxnREFBZ0U7QUFDaEUsa0RBQWtFO0FBQ2xFLG9EQUFvRTtBQUNwRSxzREFBeUU7QUFtQnpFLGtCQUFrQjtBQUNsQixlQUFNLENBQUMsR0FBRyxHQUFHLFNBQVMsQ0FBQztBQUV2QixjQUFjO0FBQ2QsU0FBUyxTQUFTLENBQXFCLElBQWEsRUFBRSxHQUFHLElBQTBCO0lBQy9FLE9BQU8sSUFBSSxDQUFDLHFCQUFvQixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLElBQUksQ0FBUyxDQUFDO0FBQ3JGLENBQUM7QUFFRCxFQUFFO0FBQ0YsdUZBQXVGO0FBQ3ZGLDhGQUE4RjtBQUM5Riw0RkFBNEY7QUFDNUYsbUdBQW1HO0FBQ25HLDBGQUEwRjtBQUMxRixFQUFFO0FBRUYsaUJBQVUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFHLFNBQVMsYUFBYSxDQUEwQyxLQUFhO0lBQ3BHLE9BQU8sY0FBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDekMsQ0FBQyxDQUFDO0FBRUYsaUJBQVUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFHLFNBQVMsYUFBYSxDQUEwQyxLQUFhLEVBQUUsS0FBeUI7SUFDL0gsT0FBTyxjQUFVLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDaEQsQ0FBQyxDQUFDO0FBRUYsaUJBQVUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLFNBQVMsaUJBQWlCLENBQTBDLEtBQXlCLEVBQUUsU0FBa0I7SUFDNUksT0FBTyxrQkFBYyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQ3hELENBQUMsQ0FBQztBQUVGLGlCQUFVLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRyxTQUFTLGlCQUFpQjtJQUNyRCxPQUFPLGtCQUFjLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3RDLENBQUMsQ0FBQztBQUVGLGlCQUFVLENBQUMsU0FBUyxDQUFDLFlBQVksR0FBRyxTQUFTLHNCQUFzQjtJQUMvRCxPQUFPLG9CQUFnQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDN0MsQ0FBQyxDQUFDO0FBRUYsaUJBQVUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLFNBQVMsd0JBQXdCO0lBQ3JFLE9BQU8sbUJBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFDO0FBRUQsaUJBQVUsQ0FBQyxTQUFpQixDQUFDLGtCQUFrQixHQUFHLDJCQUEyQixDQUFDO0FBRS9FLG9HQUFvRztBQUNuRyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQUksQ0FBVztLQUN2QixNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sS0FBSyxXQUFJLENBQUMsSUFBSSxJQUFJLE1BQU0sS0FBSyxXQUFJLENBQUMsV0FBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ3RFLEdBQUcsQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsV0FBSSxDQUFDLENBQUMsQ0FBUSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBTSxFQUFhLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxRQUFRLENBQUM7S0FDcEYsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7SUFDaEIsSUFBSSxPQUFlLENBQUM7SUFDcEIsUUFBUSxNQUFNLEVBQUU7UUFDWixLQUFLLFdBQUksQ0FBQyxHQUFHO1lBQVEsT0FBTyxHQUFHLENBQUMsV0FBSSxDQUFDLElBQUksRUFBRSxXQUFJLENBQUMsS0FBSyxFQUFFLFdBQUksQ0FBQyxLQUFLLEVBQUUsV0FBSSxDQUFDLEtBQUssRUFBRSxXQUFJLENBQUMsS0FBSyxFQUFFLFdBQUksQ0FBQyxNQUFNLEVBQUUsV0FBSSxDQUFDLE1BQU0sRUFBRSxXQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFBQyxNQUFNO1FBQ3pJLEtBQUssV0FBSSxDQUFDLEtBQUs7WUFBTSxPQUFPLEdBQUcsQ0FBQyxXQUFJLENBQUMsT0FBTyxFQUFFLFdBQUksQ0FBQyxPQUFPLEVBQUUsV0FBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQUMsTUFBTTtRQUNqRixLQUFLLFdBQUksQ0FBQyxJQUFJO1lBQU8sT0FBTyxHQUFHLENBQUMsV0FBSSxDQUFDLE9BQU8sRUFBRSxXQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7WUFBQyxNQUFNO1FBQzNFLEtBQUssV0FBSSxDQUFDLElBQUk7WUFBTyxPQUFPLEdBQUcsQ0FBQyxXQUFJLENBQUMsVUFBVSxFQUFFLFdBQUksQ0FBQyxlQUFlLEVBQUUsV0FBSSxDQUFDLGVBQWUsRUFBRSxXQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7WUFBQyxNQUFNO1FBQ3pILEtBQUssV0FBSSxDQUFDLFNBQVM7WUFBRSxPQUFPLEdBQUcsQ0FBQyxXQUFJLENBQUMsZUFBZSxFQUFFLFdBQUksQ0FBQyxvQkFBb0IsRUFBRSxXQUFJLENBQUMsb0JBQW9CLEVBQUUsV0FBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7WUFBQyxNQUFNO1FBQzdJLEtBQUssV0FBSSxDQUFDLFFBQVE7WUFBRyxPQUFPLEdBQUcsQ0FBQyxXQUFJLENBQUMsZUFBZSxFQUFFLFdBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQUMsTUFBTTtRQUNyRixLQUFLLFdBQUksQ0FBQyxLQUFLO1lBQU0sT0FBTyxHQUFHLENBQUMsV0FBSSxDQUFDLFVBQVUsRUFBRSxXQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFBQyxNQUFNO1FBQzFFO1lBQXdCLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQUMsTUFBTTtLQUNyRDtJQUNELE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtRQUN2QixNQUFNLFVBQVUsR0FBRyxxQkFBb0IsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdEQsVUFBVSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxRQUFRLENBQUMsY0FBVSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3RFLFVBQVUsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsUUFBUSxDQUFDLGNBQVUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUN0RSxVQUFVLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxrQkFBYyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQzlFLFVBQVUsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsUUFBUSxDQUFDLGtCQUFjLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDOUUsVUFBVSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsR0FBRyxRQUFRLENBQUMsb0JBQWdCLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDckYsVUFBVSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsUUFBUSxDQUFDLG1CQUFlLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDekYsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQztBQUVQLGNBQWM7QUFDZCxTQUFTLFFBQVEsQ0FBSSxLQUF1QjtJQUN4QyxPQUFPLGNBQW9CLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JELENBQUM7QUFFRCxjQUFjO0FBQ2QsU0FBUyxRQUFRLENBQUksS0FBK0I7SUFDaEQsT0FBTyxVQUFrQixDQUFNLElBQUksT0FBTyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hFLENBQUM7QUFFRCxjQUFjO0FBQ2QsU0FBUyxRQUFRLENBQUksS0FBdUM7SUFDeEQsT0FBTyxVQUFrQixDQUFNLEVBQUUsQ0FBTSxJQUFJLE9BQU8sS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0UsQ0FBQztBQUVELGNBQWM7QUFDZCxTQUFTLGFBQWEsQ0FBd0UsRUFBSztJQUMvRixPQUFPLFVBQWtCLENBQVMsSUFBSSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUYsQ0FBQztBQUVELGNBQWM7QUFDZCxTQUFTLGVBQWUsQ0FBcUYsRUFBSztJQUM5RyxPQUFPLFVBQWtCLENBQVMsRUFBRSxDQUFNO1FBQ3RDLElBQUksYUFBTyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFO1lBQ3RELEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUN2QjtJQUNMLENBQUMsQ0FBQztBQUNOLENBQUM7QUFFRCxjQUFjO0FBQ2QsU0FBUywyQkFBMkI7SUFDaEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztJQUN2QixJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsY0FBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFRLElBQVksQ0FBQyxDQUFDO0lBQ3pFLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxjQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQVEsSUFBWSxDQUFDLENBQUM7SUFDekUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLGtCQUFjLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQVEsSUFBWSxDQUFDLENBQUM7SUFDakYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLGtCQUFjLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQVEsSUFBWSxDQUFDLENBQUM7SUFDakYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxtQkFBZSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFRLElBQVksQ0FBQyxDQUFDO0lBQ3hGLElBQUksSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLEVBQUU7UUFDcEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0tBQzlDO0FBQ0wsQ0FBQyIsImZpbGUiOiJ2ZWN0b3IvaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuZXhwb3J0IHsgUm93IH0gZnJvbSAnLi9yb3cnO1xuZXhwb3J0IHsgVmVjdG9yIH0gZnJvbSAnLi4vdmVjdG9yJztcbmV4cG9ydCB7IEJhc2VWZWN0b3IgfSBmcm9tICcuL2Jhc2UnO1xuZXhwb3J0IHsgQmluYXJ5VmVjdG9yIH0gZnJvbSAnLi9iaW5hcnknO1xuZXhwb3J0IHsgQm9vbFZlY3RvciB9IGZyb20gJy4vYm9vbCc7XG5leHBvcnQgeyBDaHVua2VkIH0gZnJvbSAnLi9jaHVua2VkJztcbmV4cG9ydCB7IERhdGVWZWN0b3IsIERhdGVEYXlWZWN0b3IsIERhdGVNaWxsaXNlY29uZFZlY3RvciB9IGZyb20gJy4vZGF0ZSc7XG5leHBvcnQgeyBEZWNpbWFsVmVjdG9yIH0gZnJvbSAnLi9kZWNpbWFsJztcbmV4cG9ydCB7IERpY3Rpb25hcnlWZWN0b3IgfSBmcm9tICcuL2RpY3Rpb25hcnknO1xuZXhwb3J0IHsgRml4ZWRTaXplQmluYXJ5VmVjdG9yIH0gZnJvbSAnLi9maXhlZHNpemViaW5hcnknO1xuZXhwb3J0IHsgRml4ZWRTaXplTGlzdFZlY3RvciB9IGZyb20gJy4vZml4ZWRzaXplbGlzdCc7XG5leHBvcnQgeyBGbG9hdFZlY3RvciwgRmxvYXQxNlZlY3RvciwgRmxvYXQzMlZlY3RvciwgRmxvYXQ2NFZlY3RvciB9IGZyb20gJy4vZmxvYXQnO1xuZXhwb3J0IHsgSW50ZXJ2YWxWZWN0b3IsIEludGVydmFsRGF5VGltZVZlY3RvciwgSW50ZXJ2YWxZZWFyTW9udGhWZWN0b3IgfSBmcm9tICcuL2ludGVydmFsJztcbmV4cG9ydCB7IEludFZlY3RvciwgSW50OFZlY3RvciwgSW50MTZWZWN0b3IsIEludDMyVmVjdG9yLCBJbnQ2NFZlY3RvciwgVWludDhWZWN0b3IsIFVpbnQxNlZlY3RvciwgVWludDMyVmVjdG9yLCBVaW50NjRWZWN0b3IgfSBmcm9tICcuL2ludCc7XG5leHBvcnQgeyBMaXN0VmVjdG9yIH0gZnJvbSAnLi9saXN0JztcbmV4cG9ydCB7IE1hcFZlY3RvciB9IGZyb20gJy4vbWFwJztcbmV4cG9ydCB7IE51bGxWZWN0b3IgfSBmcm9tICcuL251bGwnO1xuZXhwb3J0IHsgU3RydWN0VmVjdG9yIH0gZnJvbSAnLi9zdHJ1Y3QnO1xuZXhwb3J0IHsgVGltZXN0YW1wVmVjdG9yLCBUaW1lc3RhbXBTZWNvbmRWZWN0b3IsIFRpbWVzdGFtcE1pbGxpc2Vjb25kVmVjdG9yLCBUaW1lc3RhbXBNaWNyb3NlY29uZFZlY3RvciwgVGltZXN0YW1wTmFub3NlY29uZFZlY3RvciB9IGZyb20gJy4vdGltZXN0YW1wJztcbmV4cG9ydCB7IFRpbWVWZWN0b3IsIFRpbWVTZWNvbmRWZWN0b3IsIFRpbWVNaWxsaXNlY29uZFZlY3RvciwgVGltZU1pY3Jvc2Vjb25kVmVjdG9yLCBUaW1lTmFub3NlY29uZFZlY3RvciB9IGZyb20gJy4vdGltZSc7XG5leHBvcnQgeyBVbmlvblZlY3RvciwgRGVuc2VVbmlvblZlY3RvciwgU3BhcnNlVW5pb25WZWN0b3IgfSBmcm9tICcuL3VuaW9uJztcbmV4cG9ydCB7IFV0ZjhWZWN0b3IgfSBmcm9tICcuL3V0ZjgnO1xuXG5pbXBvcnQgeyBEYXRhIH0gZnJvbSAnLi4vZGF0YSc7XG5pbXBvcnQgeyBUeXBlIH0gZnJvbSAnLi4vZW51bSc7XG5pbXBvcnQgeyBWZWN0b3IgfSBmcm9tICcuLi92ZWN0b3InO1xuaW1wb3J0IHsgRGF0YVR5cGUgfSBmcm9tICcuLi90eXBlJztcbmltcG9ydCB7IEJhc2VWZWN0b3IgfSBmcm9tICcuL2Jhc2UnO1xuaW1wb3J0IHsgc2V0Qm9vbCB9IGZyb20gJy4uL3V0aWwvYml0JztcbmltcG9ydCB7IFZlY3RvciBhcyBWLCBWZWN0b3JDdG9yQXJncyB9IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgaW5zdGFuY2UgYXMgZ2V0VmlzaXRvciB9IGZyb20gJy4uL3Zpc2l0b3IvZ2V0JztcbmltcG9ydCB7IGluc3RhbmNlIGFzIHNldFZpc2l0b3IgfSBmcm9tICcuLi92aXNpdG9yL3NldCc7XG5pbXBvcnQgeyBpbnN0YW5jZSBhcyBpbmRleE9mVmlzaXRvciB9IGZyb20gJy4uL3Zpc2l0b3IvaW5kZXhvZic7XG5pbXBvcnQgeyBpbnN0YW5jZSBhcyB0b0FycmF5VmlzaXRvciB9IGZyb20gJy4uL3Zpc2l0b3IvdG9hcnJheSc7XG5pbXBvcnQgeyBpbnN0YW5jZSBhcyBpdGVyYXRvclZpc2l0b3IgfSBmcm9tICcuLi92aXNpdG9yL2l0ZXJhdG9yJztcbmltcG9ydCB7IGluc3RhbmNlIGFzIGJ5dGVXaWR0aFZpc2l0b3IgfSBmcm9tICcuLi92aXNpdG9yL2J5dGV3aWR0aCc7XG5pbXBvcnQgeyBpbnN0YW5jZSBhcyBnZXRWZWN0b3JDb25zdHJ1Y3RvciB9IGZyb20gJy4uL3Zpc2l0b3IvdmVjdG9yY3Rvcic7XG5cbmRlY2xhcmUgbW9kdWxlICcuLi92ZWN0b3InIHtcbiAgICBuYW1lc3BhY2UgVmVjdG9yIHtcbiAgICAgICAgZXhwb3J0IHsgbmV3VmVjdG9yIGFzIG5ldyB9O1xuICAgIH1cbn1cblxuZGVjbGFyZSBtb2R1bGUgJy4vYmFzZScge1xuICAgIGludGVyZmFjZSBCYXNlVmVjdG9yPFQgZXh0ZW5kcyBEYXRhVHlwZT4ge1xuICAgICAgICBnZXQoaW5kZXg6IG51bWJlcik6IFRbJ1RWYWx1ZSddIHwgbnVsbDtcbiAgICAgICAgc2V0KGluZGV4OiBudW1iZXIsIHZhbHVlOiBUWydUVmFsdWUnXSB8IG51bGwpOiB2b2lkO1xuICAgICAgICBpbmRleE9mKHZhbHVlOiBUWydUVmFsdWUnXSB8IG51bGwsIGZyb21JbmRleD86IG51bWJlcik6IG51bWJlcjtcbiAgICAgICAgdG9BcnJheSgpOiBUWydUQXJyYXknXTtcbiAgICAgICAgZ2V0Qnl0ZVdpZHRoKCk6IG51bWJlcjtcbiAgICAgICAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxUWydUVmFsdWUnXSB8IG51bGw+O1xuICAgIH1cbn1cblxuLyoqIEBub2NvbGxhcHNlICovXG5WZWN0b3IubmV3ID0gbmV3VmVjdG9yO1xuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gbmV3VmVjdG9yPFQgZXh0ZW5kcyBEYXRhVHlwZT4oZGF0YTogRGF0YTxUPiwgLi4uYXJnczogVmVjdG9yQ3RvckFyZ3M8VjxUPj4pOiBWPFQ+IHtcbiAgICByZXR1cm4gbmV3IChnZXRWZWN0b3JDb25zdHJ1Y3Rvci5nZXRWaXNpdEZuKGRhdGEudHlwZSkoKSkoZGF0YSwgLi4uYXJncykgYXMgVjxUPjtcbn1cblxuLy9cbi8vIFdlIHByb3ZpZGUgdGhlIGZvbGxvd2luZyBtZXRob2QgaW1wbGVtZW50YXRpb25zIGZvciBjb2RlIG5hdmlnYWJpbGl0eSBwdXJwb3NlcyBvbmx5LlxuLy8gVGhleSdyZSBvdmVycmlkZGVuIGF0IHJ1bnRpbWUgYmVsb3cgd2l0aCB0aGUgc3BlY2lmaWMgVmlzaXRvciBpbXBsZW1lbnRhdGlvbiBmb3IgZWFjaCB0eXBlLFxuLy8gc2hvcnQtY2lyY3VpdGluZyB0aGUgdXN1YWwgVmlzaXRvciB0cmF2ZXJzYWwgYW5kIHJlZHVjaW5nIGludGVybWVkaWF0ZSBsb29rdXBzIGFuZCBjYWxscy5cbi8vIFRoaXMgY29tbWVudCBpcyBoZXJlIHRvIHJlbWluZCB5b3UgdG8gbm90IHNldCBicmVha3BvaW50cyBpbiB0aGVzZSBmdW5jdGlvbiBib2RpZXMsIG9yIHRvIGluZm9ybVxuLy8geW91IHdoeSB0aGUgYnJlYWtwb2ludHMgeW91IGhhdmUgYWxyZWFkeSBzZXQgYXJlIG5vdCBiZWluZyB0cmlnZ2VyZWQuIEhhdmUgYSBncmVhdCBkYXkhXG4vL1xuXG5CYXNlVmVjdG9yLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiBiYXNlVmVjdG9yR2V0PFQgZXh0ZW5kcyBEYXRhVHlwZT4odGhpczogQmFzZVZlY3RvcjxUPiwgaW5kZXg6IG51bWJlcik6IFRbJ1RWYWx1ZSddIHwgbnVsbCB7XG4gICAgcmV0dXJuIGdldFZpc2l0b3IudmlzaXQodGhpcywgaW5kZXgpO1xufTtcblxuQmFzZVZlY3Rvci5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gYmFzZVZlY3RvclNldDxUIGV4dGVuZHMgRGF0YVR5cGU+KHRoaXM6IEJhc2VWZWN0b3I8VD4sIGluZGV4OiBudW1iZXIsIHZhbHVlOiBUWydUVmFsdWUnXSB8IG51bGwpOiB2b2lkIHtcbiAgICByZXR1cm4gc2V0VmlzaXRvci52aXNpdCh0aGlzLCBpbmRleCwgdmFsdWUpO1xufTtcblxuQmFzZVZlY3Rvci5wcm90b3R5cGUuaW5kZXhPZiA9IGZ1bmN0aW9uIGJhc2VWZWN0b3JJbmRleE9mPFQgZXh0ZW5kcyBEYXRhVHlwZT4odGhpczogQmFzZVZlY3RvcjxUPiwgdmFsdWU6IFRbJ1RWYWx1ZSddIHwgbnVsbCwgZnJvbUluZGV4PzogbnVtYmVyKTogbnVtYmVyIHtcbiAgICByZXR1cm4gaW5kZXhPZlZpc2l0b3IudmlzaXQodGhpcywgdmFsdWUsIGZyb21JbmRleCk7XG59O1xuXG5CYXNlVmVjdG9yLnByb3RvdHlwZS50b0FycmF5ID0gZnVuY3Rpb24gYmFzZVZlY3RvclRvQXJyYXk8VCBleHRlbmRzIERhdGFUeXBlPih0aGlzOiBCYXNlVmVjdG9yPFQ+KTogVFsnVEFycmF5J10ge1xuICAgIHJldHVybiB0b0FycmF5VmlzaXRvci52aXNpdCh0aGlzKTtcbn07XG5cbkJhc2VWZWN0b3IucHJvdG90eXBlLmdldEJ5dGVXaWR0aCA9IGZ1bmN0aW9uIGJhc2VWZWN0b3JHZXRCeXRlV2lkdGg8VCBleHRlbmRzIERhdGFUeXBlPih0aGlzOiBCYXNlVmVjdG9yPFQ+KTogbnVtYmVyIHtcbiAgICByZXR1cm4gYnl0ZVdpZHRoVmlzaXRvci52aXNpdCh0aGlzLnR5cGUpO1xufTtcblxuQmFzZVZlY3Rvci5wcm90b3R5cGVbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uIGJhc2VWZWN0b3JTeW1ib2xJdGVyYXRvcjxUIGV4dGVuZHMgRGF0YVR5cGU+KHRoaXM6IEJhc2VWZWN0b3I8VD4pOiBJdGVyYWJsZUl0ZXJhdG9yPFRbJ1RWYWx1ZSddIHwgbnVsbD4ge1xuICAgIHJldHVybiBpdGVyYXRvclZpc2l0b3IudmlzaXQodGhpcyk7XG59O1xuXG4oQmFzZVZlY3Rvci5wcm90b3R5cGUgYXMgYW55KS5fYmluZERhdGFBY2Nlc3NvcnMgPSBiaW5kQmFzZVZlY3RvckRhdGFBY2Nlc3NvcnM7XG5cbi8vIFBlcmY6IGJpbmQgYW5kIGFzc2lnbiB0aGUgb3BlcmF0b3IgVmlzaXRvciBtZXRob2RzIHRvIGVhY2ggb2YgdGhlIFZlY3RvciBzdWJjbGFzc2VzIGZvciBlYWNoIFR5cGVcbihPYmplY3Qua2V5cyhUeXBlKSBhcyBhbnlbXSlcbiAgICAuZmlsdGVyKCh0eXBlSWQpID0+IHR5cGVJZCAhPT0gVHlwZS5OT05FICYmIHR5cGVJZCAhPT0gVHlwZVtUeXBlLk5PTkVdKVxuICAgIC5tYXAoKFQ6IGFueSkgPT4gVHlwZVtUXSBhcyBhbnkpLmZpbHRlcigoVDogYW55KTogVCBpcyBUeXBlID0+IHR5cGVvZiBUID09PSAnbnVtYmVyJylcbiAgICAuZm9yRWFjaCgodHlwZUlkKSA9PiB7XG4gICAgICAgIGxldCB0eXBlSWRzOiBUeXBlW107XG4gICAgICAgIHN3aXRjaCAodHlwZUlkKSB7XG4gICAgICAgICAgICBjYXNlIFR5cGUuSW50OiAgICAgICB0eXBlSWRzID0gW1R5cGUuSW50OCwgVHlwZS5JbnQxNiwgVHlwZS5JbnQzMiwgVHlwZS5JbnQ2NCwgVHlwZS5VaW50OCwgVHlwZS5VaW50MTYsIFR5cGUuVWludDMyLCBUeXBlLlVpbnQ2NF07IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBUeXBlLkZsb2F0OiAgICAgdHlwZUlkcyA9IFtUeXBlLkZsb2F0MTYsIFR5cGUuRmxvYXQzMiwgVHlwZS5GbG9hdDY0XTsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFR5cGUuRGF0ZTogICAgICB0eXBlSWRzID0gW1R5cGUuRGF0ZURheSwgVHlwZS5EYXRlTWlsbGlzZWNvbmRdOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgVHlwZS5UaW1lOiAgICAgIHR5cGVJZHMgPSBbVHlwZS5UaW1lU2Vjb25kLCBUeXBlLlRpbWVNaWxsaXNlY29uZCwgVHlwZS5UaW1lTWljcm9zZWNvbmQsIFR5cGUuVGltZU5hbm9zZWNvbmRdOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgVHlwZS5UaW1lc3RhbXA6IHR5cGVJZHMgPSBbVHlwZS5UaW1lc3RhbXBTZWNvbmQsIFR5cGUuVGltZXN0YW1wTWlsbGlzZWNvbmQsIFR5cGUuVGltZXN0YW1wTWljcm9zZWNvbmQsIFR5cGUuVGltZXN0YW1wTmFub3NlY29uZF07IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBUeXBlLkludGVydmFsOiAgdHlwZUlkcyA9IFtUeXBlLkludGVydmFsRGF5VGltZSwgVHlwZS5JbnRlcnZhbFllYXJNb250aF07IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBUeXBlLlVuaW9uOiAgICAgdHlwZUlkcyA9IFtUeXBlLkRlbnNlVW5pb24sIFR5cGUuU3BhcnNlVW5pb25dOyBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6ICAgICAgICAgICAgICAgIHR5cGVJZHMgPSBbdHlwZUlkXTsgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgdHlwZUlkcy5mb3JFYWNoKCh0eXBlSWQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IFZlY3RvckN0b3IgPSBnZXRWZWN0b3JDb25zdHJ1Y3Rvci52aXNpdCh0eXBlSWQpO1xuICAgICAgICAgICAgVmVjdG9yQ3Rvci5wcm90b3R5cGVbJ2dldCddID0gcGFydGlhbDEoZ2V0VmlzaXRvci5nZXRWaXNpdEZuKHR5cGVJZCkpO1xuICAgICAgICAgICAgVmVjdG9yQ3Rvci5wcm90b3R5cGVbJ3NldCddID0gcGFydGlhbDIoc2V0VmlzaXRvci5nZXRWaXNpdEZuKHR5cGVJZCkpO1xuICAgICAgICAgICAgVmVjdG9yQ3Rvci5wcm90b3R5cGVbJ2luZGV4T2YnXSA9IHBhcnRpYWwyKGluZGV4T2ZWaXNpdG9yLmdldFZpc2l0Rm4odHlwZUlkKSk7XG4gICAgICAgICAgICBWZWN0b3JDdG9yLnByb3RvdHlwZVsndG9BcnJheSddID0gcGFydGlhbDAodG9BcnJheVZpc2l0b3IuZ2V0VmlzaXRGbih0eXBlSWQpKTtcbiAgICAgICAgICAgIFZlY3RvckN0b3IucHJvdG90eXBlWydnZXRCeXRlV2lkdGgnXSA9IHBhcnRpYWwwKGJ5dGVXaWR0aFZpc2l0b3IuZ2V0VmlzaXRGbih0eXBlSWQpKTtcbiAgICAgICAgICAgIFZlY3RvckN0b3IucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl0gPSBwYXJ0aWFsMChpdGVyYXRvclZpc2l0b3IuZ2V0VmlzaXRGbih0eXBlSWQpKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBwYXJ0aWFsMDxUPih2aXNpdDogKG5vZGU6IFQpID0+IGFueSkge1xuICAgIHJldHVybiBmdW5jdGlvbih0aGlzOiBUKSB7IHJldHVybiB2aXNpdCh0aGlzKTsgfTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIHBhcnRpYWwxPFQ+KHZpc2l0OiAobm9kZTogVCwgYTogYW55KSA9PiBhbnkpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24odGhpczogVCwgYTogYW55KSB7IHJldHVybiB2aXNpdCh0aGlzLCBhKTsgfTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIHBhcnRpYWwyPFQ+KHZpc2l0OiAobm9kZTogVCwgYTogYW55LCBiOiBhbnkpID0+IGFueSkge1xuICAgIHJldHVybiBmdW5jdGlvbih0aGlzOiBULCBhOiBhbnksIGI6IGFueSkgeyByZXR1cm4gdmlzaXQodGhpcywgYSwgYik7IH07XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiB3cmFwTnVsbGFibGUxPFQgZXh0ZW5kcyBEYXRhVHlwZSwgViBleHRlbmRzIFZlY3RvcjxUPiwgRiBleHRlbmRzIChpOiBudW1iZXIpID0+IGFueT4oZm46IEYpOiAoLi4uYXJnczogUGFyYW1ldGVyczxGPikgPT4gUmV0dXJuVHlwZTxGPiB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHRoaXM6IFYsIGk6IG51bWJlcikgeyByZXR1cm4gdGhpcy5pc1ZhbGlkKGkpID8gZm4uY2FsbCh0aGlzLCBpKSA6IG51bGw7IH07XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiB3cmFwTnVsbGFibGVTZXQ8VCBleHRlbmRzIERhdGFUeXBlLCBWIGV4dGVuZHMgQmFzZVZlY3RvcjxUPiwgRiBleHRlbmRzIChpOiBudW1iZXIsIGE6IGFueSkgPT4gdm9pZD4oZm46IEYpOiAoLi4uYXJnczogUGFyYW1ldGVyczxGPikgPT4gdm9pZCB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHRoaXM6IFYsIGk6IG51bWJlciwgYTogYW55KSB7XG4gICAgICAgIGlmIChzZXRCb29sKHRoaXMubnVsbEJpdG1hcCwgdGhpcy5vZmZzZXQgKyBpLCBhICE9IG51bGwpKSB7XG4gICAgICAgICAgICBmbi5jYWxsKHRoaXMsIGksIGEpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGJpbmRCYXNlVmVjdG9yRGF0YUFjY2Vzc29yczxUIGV4dGVuZHMgRGF0YVR5cGU+KHRoaXM6IEJhc2VWZWN0b3I8VD4pIHtcbiAgICBjb25zdCB0eXBlID0gdGhpcy50eXBlO1xuICAgIHRoaXNbJ2dldCddID0gZ2V0VmlzaXRvci5nZXRWaXNpdEZuKHR5cGUpLmJpbmQodGhpcywgPGFueT4gdGhpcyBhcyBWPFQ+KTtcbiAgICB0aGlzWydzZXQnXSA9IHNldFZpc2l0b3IuZ2V0VmlzaXRGbih0eXBlKS5iaW5kKHRoaXMsIDxhbnk+IHRoaXMgYXMgVjxUPik7XG4gICAgdGhpc1snaW5kZXhPZiddID0gaW5kZXhPZlZpc2l0b3IuZ2V0VmlzaXRGbih0eXBlKS5iaW5kKHRoaXMsIDxhbnk+IHRoaXMgYXMgVjxUPik7XG4gICAgdGhpc1sndG9BcnJheSddID0gdG9BcnJheVZpc2l0b3IuZ2V0VmlzaXRGbih0eXBlKS5iaW5kKHRoaXMsIDxhbnk+IHRoaXMgYXMgVjxUPik7XG4gICAgdGhpc1tTeW1ib2wuaXRlcmF0b3JdID0gaXRlcmF0b3JWaXNpdG9yLmdldFZpc2l0Rm4odHlwZSkuYmluZCh0aGlzLCA8YW55PiB0aGlzIGFzIFY8VD4pO1xuICAgIGlmICh0aGlzLm51bGxDb3VudCA+IDApIHtcbiAgICAgICAgdGhpc1snZ2V0J10gPSB3cmFwTnVsbGFibGUxKHRoaXNbJ2dldCddKTtcbiAgICAgICAgdGhpc1snc2V0J10gPSB3cmFwTnVsbGFibGVTZXQodGhpc1snc2V0J10pO1xuICAgIH1cbn1cbiJdfQ==

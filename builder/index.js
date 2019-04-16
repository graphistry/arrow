"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var base_1 = require("./base");
exports.Builder = base_1.Builder;
var binary_1 = require("./binary");
exports.BinaryBuilder = binary_1.BinaryBuilder;
var bool_1 = require("./bool");
exports.BoolBuilder = bool_1.BoolBuilder;
var date_1 = require("./date");
exports.DateBuilder = date_1.DateBuilder;
exports.DateDayBuilder = date_1.DateDayBuilder;
exports.DateMillisecondBuilder = date_1.DateMillisecondBuilder;
var decimal_1 = require("./decimal");
exports.DecimalBuilder = decimal_1.DecimalBuilder;
var dictionary_1 = require("./dictionary");
exports.DictionaryBuilder = dictionary_1.DictionaryBuilder;
var fixedsizebinary_1 = require("./fixedsizebinary");
exports.FixedSizeBinaryBuilder = fixedsizebinary_1.FixedSizeBinaryBuilder;
var fixedsizelist_1 = require("./fixedsizelist");
exports.FixedSizeListBuilder = fixedsizelist_1.FixedSizeListBuilder;
var float_1 = require("./float");
exports.FloatBuilder = float_1.FloatBuilder;
exports.Float16Builder = float_1.Float16Builder;
exports.Float32Builder = float_1.Float32Builder;
exports.Float64Builder = float_1.Float64Builder;
var interval_1 = require("./interval");
exports.IntervalBuilder = interval_1.IntervalBuilder;
exports.IntervalDayTimeBuilder = interval_1.IntervalDayTimeBuilder;
exports.IntervalYearMonthBuilder = interval_1.IntervalYearMonthBuilder;
var int_1 = require("./int");
exports.IntBuilder = int_1.IntBuilder;
exports.Int8Builder = int_1.Int8Builder;
exports.Int16Builder = int_1.Int16Builder;
exports.Int32Builder = int_1.Int32Builder;
exports.Int64Builder = int_1.Int64Builder;
exports.Uint8Builder = int_1.Uint8Builder;
exports.Uint16Builder = int_1.Uint16Builder;
exports.Uint32Builder = int_1.Uint32Builder;
exports.Uint64Builder = int_1.Uint64Builder;
var list_1 = require("./list");
exports.ListBuilder = list_1.ListBuilder;
var map_1 = require("./map");
exports.MapBuilder = map_1.MapBuilder;
var null_1 = require("./null");
exports.NullBuilder = null_1.NullBuilder;
var struct_1 = require("./struct");
exports.StructBuilder = struct_1.StructBuilder;
var timestamp_1 = require("./timestamp");
exports.TimestampBuilder = timestamp_1.TimestampBuilder;
exports.TimestampSecondBuilder = timestamp_1.TimestampSecondBuilder;
exports.TimestampMillisecondBuilder = timestamp_1.TimestampMillisecondBuilder;
exports.TimestampMicrosecondBuilder = timestamp_1.TimestampMicrosecondBuilder;
exports.TimestampNanosecondBuilder = timestamp_1.TimestampNanosecondBuilder;
var time_1 = require("./time");
exports.TimeBuilder = time_1.TimeBuilder;
exports.TimeSecondBuilder = time_1.TimeSecondBuilder;
exports.TimeMillisecondBuilder = time_1.TimeMillisecondBuilder;
exports.TimeMicrosecondBuilder = time_1.TimeMicrosecondBuilder;
exports.TimeNanosecondBuilder = time_1.TimeNanosecondBuilder;
var union_1 = require("./union");
exports.UnionBuilder = union_1.UnionBuilder;
exports.DenseUnionBuilder = union_1.DenseUnionBuilder;
exports.SparseUnionBuilder = union_1.SparseUnionBuilder;
var utf8_1 = require("./utf8");
exports.Utf8Builder = utf8_1.Utf8Builder;
const enum_1 = require("../enum");
const base_2 = require("./base");
const utf8_2 = require("./utf8");
const set_1 = require("../visitor/set");
const builderctor_1 = require("../visitor/builderctor");
/** @nocollapse */
base_2.Builder.new = newBuilder;
/** @ignore */
function newBuilder(options) {
    return new (builderctor_1.instance.getVisitFn(options.type)())(options);
}
Object.keys(enum_1.Type)
    .map((T) => enum_1.Type[T])
    .filter((T) => typeof T === 'number')
    .filter((typeId) => typeId !== enum_1.Type.NONE)
    .forEach((typeId) => {
    const BuilderCtor = builderctor_1.instance.visit(typeId);
    BuilderCtor.prototype._setValue = set_1.instance.getVisitFn(typeId);
});
utf8_2.Utf8Builder.prototype._setValue = set_1.instance.getVisitFn(enum_1.Type.Binary);

//# sourceMappingURL=index.js.map

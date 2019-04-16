export { Builder } from './base';
export { BinaryBuilder } from './binary';
export { BoolBuilder } from './bool';
export { DateBuilder, DateDayBuilder, DateMillisecondBuilder } from './date';
export { DecimalBuilder } from './decimal';
export { DictionaryBuilder } from './dictionary';
export { FixedSizeBinaryBuilder } from './fixedsizebinary';
export { FixedSizeListBuilder } from './fixedsizelist';
export { FloatBuilder, Float16Builder, Float32Builder, Float64Builder } from './float';
export { IntervalBuilder, IntervalDayTimeBuilder, IntervalYearMonthBuilder } from './interval';
export { IntBuilder, Int8Builder, Int16Builder, Int32Builder, Int64Builder, Uint8Builder, Uint16Builder, Uint32Builder, Uint64Builder } from './int';
export { ListBuilder } from './list';
export { MapBuilder } from './map';
export { NullBuilder } from './null';
export { StructBuilder } from './struct';
export { TimestampBuilder, TimestampSecondBuilder, TimestampMillisecondBuilder, TimestampMicrosecondBuilder, TimestampNanosecondBuilder } from './timestamp';
export { TimeBuilder, TimeSecondBuilder, TimeMillisecondBuilder, TimeMicrosecondBuilder, TimeNanosecondBuilder } from './time';
export { UnionBuilder, DenseUnionBuilder, SparseUnionBuilder } from './union';
export { Utf8Builder } from './utf8';
import { Type } from '../enum';
import { Builder } from './base';
import { Utf8Builder } from './utf8';
import { instance as setVisitor } from '../visitor/set';
import { instance as getBuilderConstructor } from '../visitor/builderctor';
/** @nocollapse */
Builder.new = newBuilder;
/** @ignore */
function newBuilder(options) {
    return new (getBuilderConstructor.getVisitFn(options.type)())(options);
}
Object.keys(Type)
    .map((T) => Type[T])
    .filter((T) => typeof T === 'number')
    .filter((typeId) => typeId !== Type.NONE)
    .forEach((typeId) => {
    const BuilderCtor = getBuilderConstructor.visit(typeId);
    BuilderCtor.prototype._setValue = setVisitor.getVisitFn(typeId);
});
Utf8Builder.prototype._setValue = setVisitor.getVisitFn(Type.Binary);

//# sourceMappingURL=index.mjs.map

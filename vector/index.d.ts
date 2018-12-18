export { Row } from './all';
export { Vector } from './all';
export { BaseVector } from './all';
export { BinaryVector } from './all';
export { BoolVector } from './all';
export { ChunkedVector } from './all';
export { DateVector, DateDayVector, DateMillisecondVector } from './all';
export { DecimalVector } from './all';
export { DictionaryVector } from './all';
export { FixedSizeBinaryVector } from './all';
export { FixedSizeListVector } from './all';
export { FloatVector, Float16Vector, Float32Vector, Float64Vector } from './all';
export { IntervalVector, IntervalDayTimeVector, IntervalYearMonthVector } from './all';
export { IntVector, Int8Vector, Int16Vector, Int32Vector, Int64Vector, Uint8Vector, Uint16Vector, Uint32Vector, Uint64Vector } from './all';
export { ListVector } from './all';
export { MapVector } from './all';
export { NullVector } from './all';
export { StructVector } from './all';
export { TimestampVector, TimestampSecondVector, TimestampMillisecondVector, TimestampMicrosecondVector, TimestampNanosecondVector } from './all';
export { TimeVector, TimeSecondVector, TimeMillisecondVector, TimeMicrosecondVector, TimeNanosecondVector } from './all';
export { UnionVector, DenseUnionVector, SparseUnionVector } from './all';
export { Utf8Vector } from './all';
import { Data } from '../data';
import { DataType } from '../type';
import { Vector as V, VectorCtorArgs } from '../interfaces';
declare module '../vector' {
    namespace Vector {
        export { newVector as new };
    }
}
declare module './base' {
    interface BaseVector<T extends DataType> {
        get(index: number): T['TValue'] | null;
        set(index: number, value: T['TValue'] | null): void;
        indexOf(value: T['TValue'] | null, fromIndex?: number): number;
        toArray(): T['TArray'];
        getByteWidth(): number;
        [Symbol.iterator](): IterableIterator<T['TValue'] | null>;
    }
}
declare function newVector<T extends DataType>(data: Data<T>, ...args: VectorCtorArgs<V<T>>): V<T>;

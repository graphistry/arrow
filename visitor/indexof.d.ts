import { Data } from '../data';
import { Type } from '../enum';
import { Visitor } from '../visitor';
import { Vector } from '../interfaces';
import { DataType, Dictionary, Bool, Null, Utf8, Binary, Decimal, FixedSizeBinary, List, FixedSizeList, Map_, Struct, Float, Float16, Float32, Float64, Int, Uint8, Uint16, Uint32, Uint64, Int8, Int16, Int32, Int64, Date_, DateDay, DateMillisecond, Interval, IntervalDayTime, IntervalYearMonth, Time, TimeSecond, TimeMillisecond, TimeMicrosecond, TimeNanosecond, Timestamp, TimestampSecond, TimestampMillisecond, TimestampMicrosecond, TimestampNanosecond, Union, DenseUnion, SparseUnion } from '../type';
export interface IndexOfVisitor extends Visitor {
    visit<T extends Vector>(node: T, value: T['TValue'] | null, index?: number): number;
    visitMany<T extends Vector>(nodes: T[], values: (T['TValue'] | null)[], indices: (number | undefined)[]): number[];
    getVisitFn<T extends Type>(node: T): (vector: Vector<T>, value: Vector<T>['TValue'] | null, index?: number) => number;
    getVisitFn<T extends DataType>(node: Vector<T> | Data<T> | T): (vector: Vector<T>, value: T['TValue'] | null, index?: number) => number;
    visitNull<T extends Null>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitBool<T extends Bool>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitInt<T extends Int>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitInt8<T extends Int8>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitInt16<T extends Int16>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitInt32<T extends Int32>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitInt64<T extends Int64>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitUint8<T extends Uint8>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitUint16<T extends Uint16>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitUint32<T extends Uint32>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitUint64<T extends Uint64>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitFloat<T extends Float>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitFloat16<T extends Float16>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitFloat32<T extends Float32>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitFloat64<T extends Float64>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitUtf8<T extends Utf8>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitBinary<T extends Binary>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitFixedSizeBinary<T extends FixedSizeBinary>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitDate<T extends Date_>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitDateDay<T extends DateDay>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitDateMillisecond<T extends DateMillisecond>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitTimestamp<T extends Timestamp>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitTimestampSecond<T extends TimestampSecond>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitTimestampMillisecond<T extends TimestampMillisecond>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitTimestampMicrosecond<T extends TimestampMicrosecond>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitTimestampNanosecond<T extends TimestampNanosecond>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitTime<T extends Time>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitTimeSecond<T extends TimeSecond>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitTimeMillisecond<T extends TimeMillisecond>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitTimeMicrosecond<T extends TimeMicrosecond>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitTimeNanosecond<T extends TimeNanosecond>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitDecimal<T extends Decimal>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitList<T extends List>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitStruct<T extends Struct>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitUnion<T extends Union>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitDenseUnion<T extends DenseUnion>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitSparseUnion<T extends SparseUnion>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitDictionary<T extends Dictionary>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitInterval<T extends Interval>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitIntervalDayTime<T extends IntervalDayTime>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitIntervalYearMonth<T extends IntervalYearMonth>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitFixedSizeList<T extends FixedSizeList>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
    visitMap<T extends Map_>(vector: Vector<T>, value: T['TValue'] | null, index?: number): number;
}
export declare class IndexOfVisitor extends Visitor {
}
/** @ignore */
export declare const instance: IndexOfVisitor;

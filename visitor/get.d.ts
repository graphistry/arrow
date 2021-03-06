import { Data } from '../data';
import { Visitor } from '../visitor';
import { Vector } from '../interfaces';
import { Type } from '../enum';
import { DataType, Dictionary, Bool, Null, Utf8, Binary, Decimal, FixedSizeBinary, List, FixedSizeList, Map_, Struct, Float, Float16, Float32, Float64, Int, Uint8, Uint16, Uint32, Uint64, Int8, Int16, Int32, Int64, Date_, DateDay, DateMillisecond, Interval, IntervalDayTime, IntervalYearMonth, Time, TimeSecond, TimeMillisecond, TimeMicrosecond, TimeNanosecond, Timestamp, TimestampSecond, TimestampMillisecond, TimestampMicrosecond, TimestampNanosecond, Union, DenseUnion, SparseUnion } from '../type';
export interface GetVisitor extends Visitor {
    visit<T extends Vector>(node: T, index: number): T['TValue'];
    visitMany<T extends Vector>(nodes: T[], indices: number[]): T['TValue'][];
    getVisitFn<T extends Type>(node: T): (vector: Vector<T>, index: number) => Vector<T>['TValue'];
    getVisitFn<T extends DataType>(node: Vector<T> | Data<T> | T): (vector: Vector<T>, index: number) => Vector<T>['TValue'];
    visitNull<T extends Null>(vector: Vector<T>, index: number): T['TValue'];
    visitBool<T extends Bool>(vector: Vector<T>, index: number): T['TValue'];
    visitInt<T extends Int>(vector: Vector<T>, index: number): T['TValue'];
    visitInt8<T extends Int8>(vector: Vector<T>, index: number): T['TValue'];
    visitInt16<T extends Int16>(vector: Vector<T>, index: number): T['TValue'];
    visitInt32<T extends Int32>(vector: Vector<T>, index: number): T['TValue'];
    visitInt64<T extends Int64>(vector: Vector<T>, index: number): T['TValue'];
    visitUint8<T extends Uint8>(vector: Vector<T>, index: number): T['TValue'];
    visitUint16<T extends Uint16>(vector: Vector<T>, index: number): T['TValue'];
    visitUint32<T extends Uint32>(vector: Vector<T>, index: number): T['TValue'];
    visitUint64<T extends Uint64>(vector: Vector<T>, index: number): T['TValue'];
    visitFloat<T extends Float>(vector: Vector<T>, index: number): T['TValue'];
    visitFloat16<T extends Float16>(vector: Vector<T>, index: number): T['TValue'];
    visitFloat32<T extends Float32>(vector: Vector<T>, index: number): T['TValue'];
    visitFloat64<T extends Float64>(vector: Vector<T>, index: number): T['TValue'];
    visitUtf8<T extends Utf8>(vector: Vector<T>, index: number): T['TValue'];
    visitBinary<T extends Binary>(vector: Vector<T>, index: number): T['TValue'];
    visitFixedSizeBinary<T extends FixedSizeBinary>(vector: Vector<T>, index: number): T['TValue'];
    visitDate<T extends Date_>(vector: Vector<T>, index: number): T['TValue'];
    visitDateDay<T extends DateDay>(vector: Vector<T>, index: number): T['TValue'];
    visitDateMillisecond<T extends DateMillisecond>(vector: Vector<T>, index: number): T['TValue'];
    visitTimestamp<T extends Timestamp>(vector: Vector<T>, index: number): T['TValue'];
    visitTimestampSecond<T extends TimestampSecond>(vector: Vector<T>, index: number): T['TValue'];
    visitTimestampMillisecond<T extends TimestampMillisecond>(vector: Vector<T>, index: number): T['TValue'];
    visitTimestampMicrosecond<T extends TimestampMicrosecond>(vector: Vector<T>, index: number): T['TValue'];
    visitTimestampNanosecond<T extends TimestampNanosecond>(vector: Vector<T>, index: number): T['TValue'];
    visitTime<T extends Time>(vector: Vector<T>, index: number): T['TValue'];
    visitTimeSecond<T extends TimeSecond>(vector: Vector<T>, index: number): T['TValue'];
    visitTimeMillisecond<T extends TimeMillisecond>(vector: Vector<T>, index: number): T['TValue'];
    visitTimeMicrosecond<T extends TimeMicrosecond>(vector: Vector<T>, index: number): T['TValue'];
    visitTimeNanosecond<T extends TimeNanosecond>(vector: Vector<T>, index: number): T['TValue'];
    visitDecimal<T extends Decimal>(vector: Vector<T>, index: number): T['TValue'];
    visitList<T extends List>(vector: Vector<T>, index: number): T['TValue'];
    visitStruct<T extends Struct>(vector: Vector<T>, index: number): T['TValue'];
    visitUnion<T extends Union>(vector: Vector<T>, index: number): T['TValue'];
    visitDenseUnion<T extends DenseUnion>(vector: Vector<T>, index: number): T['TValue'];
    visitSparseUnion<T extends SparseUnion>(vector: Vector<T>, index: number): T['TValue'];
    visitDictionary<T extends Dictionary>(vector: Vector<T>, index: number): T['TValue'];
    visitInterval<T extends Interval>(vector: Vector<T>, index: number): T['TValue'];
    visitIntervalDayTime<T extends IntervalDayTime>(vector: Vector<T>, index: number): T['TValue'];
    visitIntervalYearMonth<T extends IntervalYearMonth>(vector: Vector<T>, index: number): T['TValue'];
    visitFixedSizeList<T extends FixedSizeList>(vector: Vector<T>, index: number): T['TValue'];
    visitMap<T extends Map_>(vector: Vector<T>, index: number): T['TValue'];
}
export declare class GetVisitor extends Visitor {
}
/** @ignore */
export declare const instance: GetVisitor;

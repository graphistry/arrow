import { Data } from '../data';
import { Type } from '../enum';
import { Visitor } from '../visitor';
import { Vector } from '../interfaces';
import { DataType, Dictionary, Bool, Null, Utf8, Binary, Decimal, FixedSizeBinary, List, FixedSizeList, Map_, Struct, Float, Float16, Float32, Float64, Int, Uint8, Uint16, Uint32, Uint64, Int8, Int16, Int32, Int64, Date_, DateDay, DateMillisecond, Interval, IntervalDayTime, IntervalYearMonth, Time, TimeSecond, TimeMillisecond, TimeMicrosecond, TimeNanosecond, Timestamp, TimestampSecond, TimestampMillisecond, TimestampMicrosecond, TimestampNanosecond, Union, DenseUnion, SparseUnion } from '../type';
export interface ToArrayVisitor extends Visitor {
    visit<T extends Vector>(node: T): T['TArray'];
    visitMany<T extends Vector>(nodes: T[]): T['TArray'][];
    getVisitFn<T extends Type>(node: T): (vector: Vector<T>) => Vector<T>['TArray'];
    getVisitFn<T extends DataType>(node: Vector<T> | Data<T> | T): (vector: Vector<T>) => Vector<T>['TArray'];
    visitNull<T extends Null>(vector: Vector<T>): Vector<T>['TArray'];
    visitBool<T extends Bool>(vector: Vector<T>): Vector<T>['TArray'];
    visitInt<T extends Int>(vector: Vector<T>): Vector<T>['TArray'];
    visitInt8<T extends Int8>(vector: Vector<T>): Vector<T>['TArray'];
    visitInt16<T extends Int16>(vector: Vector<T>): Vector<T>['TArray'];
    visitInt32<T extends Int32>(vector: Vector<T>): Vector<T>['TArray'];
    visitInt64<T extends Int64>(vector: Vector<T>): Vector<T>['TArray'];
    visitUint8<T extends Uint8>(vector: Vector<T>): Vector<T>['TArray'];
    visitUint16<T extends Uint16>(vector: Vector<T>): Vector<T>['TArray'];
    visitUint32<T extends Uint32>(vector: Vector<T>): Vector<T>['TArray'];
    visitUint64<T extends Uint64>(vector: Vector<T>): Vector<T>['TArray'];
    visitFloat<T extends Float>(vector: Vector<T>): Vector<T>['TArray'];
    visitFloat16<T extends Float16>(vector: Vector<T>): Vector<T>['TArray'];
    visitFloat32<T extends Float32>(vector: Vector<T>): Vector<T>['TArray'];
    visitFloat64<T extends Float64>(vector: Vector<T>): Vector<T>['TArray'];
    visitUtf8<T extends Utf8>(vector: Vector<T>): Vector<T>['TArray'];
    visitBinary<T extends Binary>(vector: Vector<T>): Vector<T>['TArray'];
    visitFixedSizeBinary<T extends FixedSizeBinary>(vector: Vector<T>): Vector<T>['TArray'];
    visitDate<T extends Date_>(vector: Vector<T>): Vector<T>['TArray'];
    visitDateDay<T extends DateDay>(vector: Vector<T>): Vector<T>['TArray'];
    visitDateMillisecond<T extends DateMillisecond>(vector: Vector<T>): Vector<T>['TArray'];
    visitTimestamp<T extends Timestamp>(vector: Vector<T>): Vector<T>['TArray'];
    visitTimestampSecond<T extends TimestampSecond>(vector: Vector<T>): Vector<T>['TArray'];
    visitTimestampMillisecond<T extends TimestampMillisecond>(vector: Vector<T>): Vector<T>['TArray'];
    visitTimestampMicrosecond<T extends TimestampMicrosecond>(vector: Vector<T>): Vector<T>['TArray'];
    visitTimestampNanosecond<T extends TimestampNanosecond>(vector: Vector<T>): Vector<T>['TArray'];
    visitTime<T extends Time>(vector: Vector<T>): Vector<T>['TArray'];
    visitTimeSecond<T extends TimeSecond>(vector: Vector<T>): Vector<T>['TArray'];
    visitTimeMillisecond<T extends TimeMillisecond>(vector: Vector<T>): Vector<T>['TArray'];
    visitTimeMicrosecond<T extends TimeMicrosecond>(vector: Vector<T>): Vector<T>['TArray'];
    visitTimeNanosecond<T extends TimeNanosecond>(vector: Vector<T>): Vector<T>['TArray'];
    visitDecimal<T extends Decimal>(vector: Vector<T>): Vector<T>['TArray'];
    visitList<R extends DataType, T extends List<R>>(vector: Vector<T>): Vector<T>['TArray'];
    visitStruct<T extends Struct>(vector: Vector<T>): Vector<T>['TArray'];
    visitUnion<T extends Union>(vector: Vector<T>): Vector<T>['TArray'];
    visitDenseUnion<T extends DenseUnion>(vector: Vector<T>): Vector<T>['TArray'];
    visitSparseUnion<T extends SparseUnion>(vector: Vector<T>): Vector<T>['TArray'];
    visitDictionary<R extends DataType, T extends Dictionary<R>>(vector: Vector<T>): Vector<T>['TArray'];
    visitInterval<T extends Interval>(vector: Vector<T>): Vector<T>['TArray'];
    visitIntervalDayTime<T extends IntervalDayTime>(vector: Vector<T>): Vector<T>['TArray'];
    visitIntervalYearMonth<T extends IntervalYearMonth>(vector: Vector<T>): Vector<T>['TArray'];
    visitFixedSizeList<R extends DataType, T extends FixedSizeList<R>>(vector: Vector<T>): Vector<T>['TArray'];
    visitMap<T extends Map_>(vector: Vector<T>): Vector<T>['TArray'];
}
export declare class ToArrayVisitor extends Visitor {
}
/** @ignore */
export declare const instance: ToArrayVisitor;

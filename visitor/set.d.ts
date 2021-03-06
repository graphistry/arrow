import { Data } from '../data';
import { Visitor } from '../visitor';
import { Vector } from '../interfaces';
import { Type } from '../enum';
import { DataType, Dictionary, Bool, Null, Utf8, Binary, Decimal, FixedSizeBinary, List, FixedSizeList, Map_, Struct, Float, Float16, Float32, Float64, Int, Uint8, Uint16, Uint32, Uint64, Int8, Int16, Int32, Int64, Date_, DateDay, DateMillisecond, Interval, IntervalDayTime, IntervalYearMonth, Time, TimeSecond, TimeMillisecond, TimeMicrosecond, TimeNanosecond, Timestamp, TimestampSecond, TimestampMillisecond, TimestampMicrosecond, TimestampNanosecond, Union, DenseUnion, SparseUnion } from '../type';
export interface SetVisitor extends Visitor {
    visit<T extends Vector>(node: T, index: number, value: T['TValue']): void;
    visitMany<T extends Vector>(nodes: T[], indices: number[], values: T['TValue'][]): void[];
    getVisitFn<T extends Type>(node: T): (vector: Vector<T>, index: number, value: Vector<T>['TValue']) => void;
    getVisitFn<T extends DataType>(node: Vector<T> | Data<T> | T): (vector: Vector<T>, index: number, value: Vector<T>['TValue']) => void;
    visitNull<T extends Null>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitBool<T extends Bool>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitInt<T extends Int>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitInt8<T extends Int8>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitInt16<T extends Int16>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitInt32<T extends Int32>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitInt64<T extends Int64>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitUint8<T extends Uint8>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitUint16<T extends Uint16>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitUint32<T extends Uint32>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitUint64<T extends Uint64>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitFloat<T extends Float>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitFloat16<T extends Float16>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitFloat32<T extends Float32>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitFloat64<T extends Float64>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitUtf8<T extends Utf8>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitBinary<T extends Binary>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitFixedSizeBinary<T extends FixedSizeBinary>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitDate<T extends Date_>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitDateDay<T extends DateDay>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitDateMillisecond<T extends DateMillisecond>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitTimestamp<T extends Timestamp>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitTimestampSecond<T extends TimestampSecond>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitTimestampMillisecond<T extends TimestampMillisecond>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitTimestampMicrosecond<T extends TimestampMicrosecond>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitTimestampNanosecond<T extends TimestampNanosecond>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitTime<T extends Time>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitTimeSecond<T extends TimeSecond>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitTimeMillisecond<T extends TimeMillisecond>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitTimeMicrosecond<T extends TimeMicrosecond>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitTimeNanosecond<T extends TimeNanosecond>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitDecimal<T extends Decimal>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitList<T extends List>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitStruct<T extends Struct>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitUnion<T extends Union>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitDenseUnion<T extends DenseUnion>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitSparseUnion<T extends SparseUnion>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitDictionary<T extends Dictionary>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitInterval<T extends Interval>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitIntervalDayTime<T extends IntervalDayTime>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitIntervalYearMonth<T extends IntervalYearMonth>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitFixedSizeList<T extends FixedSizeList>(vector: Vector<T>, index: number, value: T['TValue']): void;
    visitMap<T extends Map_>(vector: Vector<T>, index: number, value: T['TValue']): void;
}
export declare class SetVisitor extends Visitor {
}
/** @ignore */
export declare const instance: SetVisitor;

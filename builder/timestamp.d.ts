import { FlatBuilder } from './base';
import { Timestamp, TimestampSecond, TimestampMillisecond, TimestampMicrosecond, TimestampNanosecond } from '../type';
export interface TimestampBuilder<T extends Timestamp = Timestamp, TNull = any> extends FlatBuilder<T, TNull> {
    nullBitmap: Uint8Array;
    values: T['TArray'];
}
export interface TimestampSecondBuilder<TNull = any> extends TimestampBuilder<TimestampSecond, TNull> {
}
export interface TimestampMillisecondBuilder<TNull = any> extends TimestampBuilder<TimestampMillisecond, TNull> {
}
export interface TimestampMicrosecondBuilder<TNull = any> extends TimestampBuilder<TimestampMicrosecond, TNull> {
}
export interface TimestampNanosecondBuilder<TNull = any> extends TimestampBuilder<TimestampNanosecond, TNull> {
}
export declare class TimestampBuilder<T extends Timestamp = Timestamp, TNull = any> extends FlatBuilder<T, TNull> {
}
export declare class TimestampSecondBuilder<TNull = any> extends TimestampBuilder<TimestampSecond, TNull> {
}
export declare class TimestampMillisecondBuilder<TNull = any> extends TimestampBuilder<TimestampMillisecond, TNull> {
}
export declare class TimestampMicrosecondBuilder<TNull = any> extends TimestampBuilder<TimestampMicrosecond, TNull> {
}
export declare class TimestampNanosecondBuilder<TNull = any> extends TimestampBuilder<TimestampNanosecond, TNull> {
}

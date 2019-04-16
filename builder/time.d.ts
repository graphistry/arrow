import { FlatBuilder } from './base';
import { Time, TimeSecond, TimeMillisecond, TimeMicrosecond, TimeNanosecond } from '../type';
export interface TimeBuilder<T extends Time = Time, TNull = any> extends FlatBuilder<T, TNull> {
    nullBitmap: Uint8Array;
    values: T['TArray'];
}
export interface TimeSecondBuilder<TNull = any> extends TimeBuilder<TimeSecond, TNull> {
}
export interface TimeMillisecondBuilder<TNull = any> extends TimeBuilder<TimeMillisecond, TNull> {
}
export interface TimeMicrosecondBuilder<TNull = any> extends TimeBuilder<TimeMicrosecond, TNull> {
}
export interface TimeNanosecondBuilder<TNull = any> extends TimeBuilder<TimeNanosecond, TNull> {
}
export declare class TimeBuilder<T extends Time = Time, TNull = any> extends FlatBuilder<T, TNull> {
}
export declare class TimeSecondBuilder<TNull = any> extends TimeBuilder<TimeSecond, TNull> {
}
export declare class TimeMillisecondBuilder<TNull = any> extends TimeBuilder<TimeMillisecond, TNull> {
}
export declare class TimeMicrosecondBuilder<TNull = any> extends TimeBuilder<TimeMicrosecond, TNull> {
}
export declare class TimeNanosecondBuilder<TNull = any> extends TimeBuilder<TimeNanosecond, TNull> {
}

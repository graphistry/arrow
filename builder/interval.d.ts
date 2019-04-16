import { FlatBuilder } from './base';
import { Interval, IntervalDayTime, IntervalYearMonth } from '../type';
export interface IntervalBuilder<T extends Interval = Interval, TNull = any> extends FlatBuilder<T, TNull> {
    nullBitmap: Uint8Array;
    values: T['TArray'];
}
export interface IntervalDayTimeBuilder<TNull = any> extends IntervalBuilder<IntervalDayTime, TNull> {
}
export interface IntervalYearMonthBuilder<TNull = any> extends IntervalBuilder<IntervalYearMonth, TNull> {
}
export declare class IntervalBuilder<T extends Interval = Interval, TNull = any> extends FlatBuilder<T, TNull> {
}
export declare class IntervalDayTimeBuilder<TNull = any> extends IntervalBuilder<IntervalDayTime, TNull> {
}
export declare class IntervalYearMonthBuilder<TNull = any> extends IntervalBuilder<IntervalYearMonth, TNull> {
}

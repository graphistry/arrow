import { FlatBuilder } from './base';
import { Date_, DateDay, DateMillisecond } from '../type';
export interface DateBuilder<T extends Date_ = Date_, TNull = any> extends FlatBuilder<T, TNull> {
    nullBitmap: Uint8Array;
    values: T['TArray'];
}
export interface DateDayBuilder<TNull = any> extends DateBuilder<DateDay, TNull> {
}
export interface DateMillisecondBuilder<TNull = any> extends DateBuilder<DateMillisecond, TNull> {
}
export declare class DateBuilder<T extends Date_ = Date_, TNull = any> extends FlatBuilder<T, TNull> {
}
export declare class DateDayBuilder<TNull = any> extends DateBuilder<DateDay, TNull> {
}
export declare class DateMillisecondBuilder<TNull = any> extends DateBuilder<DateMillisecond, TNull> {
}

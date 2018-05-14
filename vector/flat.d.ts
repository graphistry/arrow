import { Data } from '../data';
import { View } from '../vector';
import { FlatType, PrimitiveType, IterableArrayLike } from '../type';
import { Bool, Float16, Date_, Interval, Null, Int32, Timestamp } from '../type';
export declare class FlatView<T extends FlatType> implements View<T> {
    length: number;
    values: T['TArray'];
    constructor(data: Data<T>);
    clone(data: Data<T>): this;
    isValid(): boolean;
    get(index: number): T['TValue'];
    set(index: number, value: T['TValue']): void;
    toArray(): IterableArrayLike<T['TValue']>;
    indexOf(search: T['TValue']): number;
    [Symbol.iterator](): IterableIterator<T['TValue']>;
}
export declare class NullView implements View<Null> {
    length: number;
    constructor(data: Data<Null>);
    clone(data: Data<Null>): this;
    isValid(): boolean;
    set(): void;
    get(): null;
    toArray(): IterableArrayLike<null>;
    indexOf(search: any): 0 | -1;
    [Symbol.iterator](): IterableIterator<null>;
}
export declare class BoolView extends FlatView<Bool> {
    protected offset: number;
    constructor(data: Data<Bool>);
    toArray(): boolean[];
    get(index: number): boolean;
    set(index: number, value: boolean): void;
    [Symbol.iterator](): IterableIterator<boolean>;
}
export declare class PrimitiveView<T extends PrimitiveType> extends FlatView<T> {
    size: number;
    ArrayType: T['ArrayType'];
    constructor(data: Data<T>, size?: number);
    clone(data: Data<T>): this;
    protected getValue(values: T['TArray'], index: number, size: number): T['TValue'];
    protected setValue(values: T['TArray'], index: number, size: number, value: T['TValue']): void;
    get(index: number): T['TValue'];
    set(index: number, value: T['TValue']): void;
    toArray(): IterableArrayLike<T['TValue']>;
    [Symbol.iterator](): IterableIterator<T['TValue']>;
}
export declare class FixedSizeView<T extends PrimitiveType> extends PrimitiveView<T> {
    toArray(): IterableArrayLike<T['TValue']>;
    indexOf(search: T['TValue']): number;
    protected getValue(values: T['TArray'], index: number, size: number): T['TValue'];
    protected setValue(values: T['TArray'], index: number, size: number, value: T['TValue']): void;
}
export declare class Float16View extends PrimitiveView<Float16> {
    toArray(): Float32Array;
    protected getValue(values: Uint16Array, index: number, size: number): number;
    protected setValue(values: Uint16Array, index: number, size: number, value: number): void;
}
export declare class DateDayView extends PrimitiveView<Date_> {
    toArray(): Date[];
    protected getValue(values: Int32Array, index: number, size: number): Date;
    protected setValue(values: Int32Array, index: number, size: number, value: Date): void;
}
export declare class DateMillisecondView extends FixedSizeView<Date_> {
    toArray(): Date[];
    protected getValue(values: Int32Array, index: number, size: number): Date;
    protected setValue(values: Int32Array, index: number, size: number, value: Date): void;
}
export declare class TimestampDayView extends PrimitiveView<Timestamp> {
    toArray(): number[];
    protected getValue(values: Int32Array, index: number, size: number): number;
    protected setValue(values: Int32Array, index: number, size: number, epochMs: number): void;
}
export declare class TimestampSecondView extends PrimitiveView<Timestamp> {
    toArray(): number[];
    protected getValue(values: Int32Array, index: number, size: number): number;
    protected setValue(values: Int32Array, index: number, size: number, epochMs: number): void;
}
export declare class TimestampMillisecondView extends PrimitiveView<Timestamp> {
    toArray(): number[];
    protected getValue(values: Int32Array, index: number, size: number): number;
    protected setValue(values: Int32Array, index: number, size: number, epochMs: number): void;
}
export declare class TimestampMicrosecondView extends PrimitiveView<Timestamp> {
    toArray(): number[];
    protected getValue(values: Int32Array, index: number, size: number): number;
    protected setValue(values: Int32Array, index: number, size: number, epochMs: number): void;
}
export declare class TimestampNanosecondView extends PrimitiveView<Timestamp> {
    toArray(): number[];
    protected getValue(values: Int32Array, index: number, size: number): number;
    protected setValue(values: Int32Array, index: number, size: number, epochMs: number): void;
}
export declare class IntervalYearMonthView extends PrimitiveView<Interval> {
    toArray(): Int32Array[];
    protected getValue(values: Int32Array, index: number, size: number): Int32Array;
    protected setValue(values: Int32Array, index: number, size: number, value: Int32Array): void;
}
export declare class IntervalYearView extends PrimitiveView<Int32> {
    toArray(): number[];
    protected getValue(values: Int32Array, index: number, size: number): number;
    protected setValue(values: Int32Array, index: number, size: number, value: number): void;
}
export declare class IntervalMonthView extends PrimitiveView<Int32> {
    toArray(): number[];
    protected getValue(values: Int32Array, index: number, size: number): number;
    protected setValue(values: Int32Array, index: number, size: number, value: number): void;
}
export declare function epochSecondsToMs(data: Int32Array, index: number): number;
export declare function epochDaysToMs(data: Int32Array, index: number): number;
export declare function epochMillisecondsLongToMs(data: Int32Array, index: number): number;
export declare function epochMicrosecondsLongToMs(data: Int32Array, index: number): number;
export declare function epochNanosecondsLongToMs(data: Int32Array, index: number): number;
export declare function epochMillisecondsToDate(epochMs: number): Date;
export declare function epochDaysToDate(data: Int32Array, index: number): Date;
export declare function epochSecondsToDate(data: Int32Array, index: number): Date;
export declare function epochNanosecondsLongToDate(data: Int32Array, index: number): Date;
export declare function epochMillisecondsLongToDate(data: Int32Array, index: number): Date;

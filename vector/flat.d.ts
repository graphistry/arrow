import { Data } from '../data';
import { View } from '../vector';
import { Bool, Float16, Date_, Interval, Null } from '../type';
import { DataType, FlatType, PrimitiveType, IterableArrayLike } from '../type';
export declare class FlatView<T extends FlatType> implements View<T> {
    length: number;
    values: T['TArray'];
    constructor(data: Data<T>);
    clone(data: Data<T>): this;
    isValid(): boolean;
    get(index: number): T['TValue'];
    set(index: number, value: T['TValue']): void;
    toArray(): IterableArrayLike<T['TValue']>;
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
export declare class ValidityView<T extends DataType> implements View<T> {
    protected view: View<T>;
    protected length: number;
    protected offset: number;
    protected nullBitmap: Uint8Array;
    constructor(data: Data<T>, view: View<T>);
    clone(data: Data<T>): this;
    toArray(): IterableArrayLike<T['TValue'] | null>;
    isValid(index: number): boolean;
    get(index: number): T['TValue'] | null;
    set(index: number, value: T['TValue'] | null): void;
    [Symbol.iterator](): IterableIterator<T['TValue'] | null>;
    protected getNullable(view: View<T>, index: number, byte: number, bit: number): T["TValue"];
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
export declare class IntervalYearMonthView extends PrimitiveView<Interval> {
    toArray(): Int32Array[];
    protected getValue(values: Int32Array, index: number, size: number): Int32Array;
    protected setValue(values: Int32Array, index: number, size: number, value: Int32Array): void;
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

import { FlatBuilder, DataBuilderOptions } from './base';
import { Int, Uint8, Uint16, Uint32, Uint64, Int8, Int16, Int32, Int64 } from '../type';
export interface IntBuilder<T extends Int = Int, TNull = any> extends FlatBuilder<T, TNull> {
    nullBitmap: Uint8Array;
    values: T['TArray'];
}
export interface Int8Builder<TNull = any> extends IntBuilder<Int8, TNull> {
}
export interface Int16Builder<TNull = any> extends IntBuilder<Int16, TNull> {
}
export interface Int32Builder<TNull = any> extends IntBuilder<Int32, TNull> {
}
export interface Int64Builder<TNull = any> extends IntBuilder<Int64, TNull> {
}
export interface Uint8Builder<TNull = any> extends IntBuilder<Uint8, TNull> {
}
export interface Uint16Builder<TNull = any> extends IntBuilder<Uint16, TNull> {
}
export interface Uint32Builder<TNull = any> extends IntBuilder<Uint32, TNull> {
}
export interface Uint64Builder<TNull = any> extends IntBuilder<Uint64, TNull> {
}
export declare class IntBuilder<T extends Int = Int, TNull = any> extends FlatBuilder<T, TNull> {
}
export declare class Int8Builder<TNull = any> extends IntBuilder<Int8, TNull> {
}
export declare class Int16Builder<TNull = any> extends IntBuilder<Int16, TNull> {
}
export declare class Int32Builder<TNull = any> extends IntBuilder<Int32, TNull> {
}
export declare class Int64Builder<TNull = any> extends IntBuilder<Int64, TNull> {
    constructor(options: DataBuilderOptions<Int64, TNull>);
    isValid(value: Int32Array | bigint | TNull): boolean;
}
export declare class Uint8Builder<TNull = any> extends IntBuilder<Uint8, TNull> {
}
export declare class Uint16Builder<TNull = any> extends IntBuilder<Uint16, TNull> {
}
export declare class Uint32Builder<TNull = any> extends IntBuilder<Uint32, TNull> {
}
export declare class Uint64Builder<TNull = any> extends IntBuilder<Uint64, TNull> {
    constructor(options: DataBuilderOptions<Uint64, TNull>);
    isValid(value: Uint32Array | bigint | TNull): boolean;
}

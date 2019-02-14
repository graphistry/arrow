import { BaseVector } from './base';
import { Vector as V } from '../interfaces';
import { Int, Uint8, Uint16, Uint32, Uint64, Int8, Int16, Int32, Int64 } from '../type';
export declare class IntVector<T extends Int = Int> extends BaseVector<T> {
    static from(this: typeof IntVector, data: Int8Array): Int8Vector;
    static from(this: typeof IntVector, data: Int16Array): Int16Vector;
    static from(this: typeof IntVector, data: Int32Array): Int32Vector;
    static from(this: typeof IntVector, data: Uint8Array): Uint8Vector;
    static from(this: typeof IntVector, data: Uint16Array): Uint16Vector;
    static from(this: typeof IntVector, data: Uint32Array): Uint32Vector;
    static from(this: typeof IntVector, data: Int32Array, is64: true): Int64Vector;
    static from(this: typeof IntVector, data: Uint32Array, is64: true): Uint64Vector;
    static from<T extends Int>(this: typeof IntVector, data: T['TArray']): V<T>;
    static from(this: typeof Int8Vector, data: Int8['TArray'] | Iterable<number>): Int8Vector;
    static from(this: typeof Int16Vector, data: Int16['TArray'] | Iterable<number>): Int16Vector;
    static from(this: typeof Int32Vector, data: Int32['TArray'] | Iterable<number>): Int32Vector;
    static from(this: typeof Int64Vector, data: Int32['TArray'] | Iterable<number>): Int64Vector;
    static from(this: typeof Uint8Vector, data: Uint8['TArray'] | Iterable<number>): Uint8Vector;
    static from(this: typeof Uint16Vector, data: Uint16['TArray'] | Iterable<number>): Uint16Vector;
    static from(this: typeof Uint32Vector, data: Uint32['TArray'] | Iterable<number>): Uint32Vector;
    static from(this: typeof Uint64Vector, data: Uint32['TArray'] | Iterable<number>): Uint64Vector;
}
export declare class Int8Vector extends IntVector<Int8> {
}
export declare class Int16Vector extends IntVector<Int16> {
}
export declare class Int32Vector extends IntVector<Int32> {
}
export declare class Int64Vector extends IntVector<Int64> {
    toBigInt64Array(): BigInt64Array;
}
export declare class Uint8Vector extends IntVector<Uint8> {
}
export declare class Uint16Vector extends IntVector<Uint16> {
}
export declare class Uint32Vector extends IntVector<Uint32> {
}
export declare class Uint64Vector extends IntVector<Uint64> {
    toBigUint64Array(): BigUint64Array;
}
export interface Int64Vector extends IntVector<Int64> {
    indexOf(value: Int64['TValue'] | bigint | null, fromIndex?: number): number;
}
export interface Uint64Vector extends IntVector<Uint64> {
    indexOf(value: Uint64['TValue'] | bigint | null, fromIndex?: number): number;
}

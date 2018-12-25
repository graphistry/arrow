import { Data } from './data';
import { DataType } from './type';
import { Chunked } from './vector/chunked';
export interface Clonable<R extends Vector> {
    clone(...args: any[]): R;
}
export interface Sliceable<R extends Vector> {
    slice(begin?: number, end?: number): R;
}
export interface Applicative<T extends DataType, R extends Chunked> {
    concat(...others: Vector<T>[]): R;
}
export interface Vector<T extends DataType = any> extends Clonable<Vector<T>>, Sliceable<Vector<T>>, Applicative<T, Chunked<T>> {
    readonly TType: T['TType'];
    readonly TArray: T['TArray'];
    readonly TValue: T['TValue'];
}
export declare abstract class Vector<T extends DataType = any> implements Iterable<T['TValue'] | null> {
    abstract readonly data: Data<T>;
    abstract readonly type: T;
    abstract readonly typeId: T['TType'];
    abstract readonly length: number;
    abstract readonly stride: number;
    abstract readonly nullCount: number;
    abstract readonly numChildren: number;
    abstract readonly ArrayType: T['ArrayType'];
    abstract isValid(index: number): boolean;
    abstract get(index: number): T['TValue'] | null;
    abstract set(index: number, value: T['TValue'] | null): void;
    abstract indexOf(value: T['TValue'] | null, fromIndex?: number): number;
    abstract [Symbol.iterator](): IterableIterator<T['TValue'] | null>;
    abstract toArray(): T['TArray'];
    abstract getChildAt<R extends DataType = any>(index: number): Vector<R> | null;
}

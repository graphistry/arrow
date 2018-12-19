import { Data } from './data';
import { DataType } from './type';
export interface Vector<T extends DataType = any> {
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
    abstract toArray(): T['TArray'];
    abstract [Symbol.iterator](): IterableIterator<T['TValue'] | null>;
    abstract slice(begin?: number, end?: number): Vector<T>;
    abstract concat(this: Vector<T>, ...others: Vector<T>[]): Vector<T>;
    abstract getChildAt<R extends DataType = any>(index: number): Vector<R> | null;
}

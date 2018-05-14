import { Data } from '../data';
import { View, Vector } from '../vector';
import { DataType, IterableArrayLike } from '../type';
export declare class ValidityView<T extends DataType> implements View<T> {
    protected view: View<T>;
    protected length: number;
    protected offset: number;
    protected nullBitmap: Uint8Array;
    constructor(data: Data<T>, view: View<T>);
    readonly size: number;
    clone(data: Data<T>): this;
    toArray(): IterableArrayLike<T['TValue'] | null>;
    indexOf(search: T['TValue']): number;
    isValid(index: number): boolean;
    get(index: number): T['TValue'] | null;
    set(index: number, value: T['TValue'] | null): void;
    getChildAt<R extends DataType = DataType>(index: number): Vector<R> | null;
    [Symbol.iterator](): IterableIterator<T['TValue'] | null>;
    protected getNullable(view: View<T>, index: number, byte: number, bit: number): T["TValue"];
}

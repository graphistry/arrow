import { ChunkedData } from '../data';
import { View, Vector } from '../vector';
import { DataType, IterableArrayLike } from '../type';
export declare class ChunkedView<T extends DataType> implements View<T> {
    chunks: Vector<T>[];
    offsets: Uint32Array;
    protected _length: number;
    protected _nullCount: number;
    constructor(data: ChunkedData<T>);
    clone(data: ChunkedData<T>): this;
    [Symbol.iterator](): IterableIterator<T['TValue'] | null>;
    isValid(index: number): boolean;
    get(index: number): T['TValue'] | null;
    set(index: number, value: T['TValue'] | null): void;
    toArray(): IterableArrayLike<T['TValue'] | null>;
}

import { ChunkedData } from '../data';
import { View, Vector } from '../vector';
import { DataType, IterableArrayLike } from '../type';
export declare class ChunkedView<T extends DataType> implements View<T> {
    chunkVectors: Vector<T>[];
    chunkOffsets: Uint32Array;
    protected _children: Vector<any>[];
    constructor(data: ChunkedData<T>);
    clone(data: ChunkedData<T>): this;
    [Symbol.iterator](): IterableIterator<T['TValue'] | null>;
    getChildAt<R extends DataType = DataType>(index: number): Vector<any>;
    isValid(index: number): boolean;
    get(index: number): T['TValue'] | null;
    set(index: number, value: T['TValue'] | null): void;
    toArray(): IterableArrayLike<T['TValue'] | null>;
}

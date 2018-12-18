import { Vector } from '../vector';
import { DataType } from '../type';
declare type SearchContinuation<T extends ChunkedVector> = (column: T, chunkIndex: number, valueIndex: number) => any;
export declare class ChunkedVector<T extends DataType = any> extends Vector<T> {
    /** @nocollapse */
    static flatten<T extends DataType>(...vectors: Vector<T>[]): Vector<T>[];
    /** @nocollapse */
    static concat<T extends DataType>(...vectors: Vector<T>[]): Vector<T>;
    protected _type: T;
    protected _length: number;
    protected _numChildren: number;
    protected _chunks: Vector<T>[];
    protected _nullCount: number;
    protected _children?: ChunkedVector[];
    protected _chunkOffsets: Uint32Array;
    constructor(type: T, chunks?: Vector<T>[], offsets?: Uint32Array);
    protected bindDataAccessors(): void;
    readonly type: T;
    readonly length: number;
    readonly chunks: Vector<T>[];
    readonly TType: import("../enum").Type;
    readonly TArray: any;
    readonly TValue: any;
    readonly ArrayType: any;
    readonly numChildren: number;
    readonly data: any;
    readonly stride: number;
    readonly nullCount: number;
    [Symbol.iterator](): IterableIterator<T['TValue'] | null>;
    concat(...others: Vector<T>[]): Vector<T>;
    getChildAt<R extends DataType = any>(index: number): ChunkedVector<R> | null;
    search(index: number): [number, number] | null;
    search<N extends SearchContinuation<ChunkedVector<T>>>(index: number, then?: N): ReturnType<N>;
    isValid(index: number): boolean;
    get(index: number): T['TValue'] | null;
    set(index: number, value: T['TValue'] | null): void;
    indexOf(element: T['TValue'], offset?: number): number;
    toArray(): T['TArray'];
    slice(begin?: number, end?: number): ChunkedVector<T>;
    protected getInternal({ chunks }: ChunkedVector<T>, i: number, j: number): T["TValue"] | null;
    protected isValidInternal({ chunks }: ChunkedVector<T>, i: number, j: number): boolean;
    protected indexOfInternal({ chunks }: ChunkedVector<T>, chunkIndex: number, fromIndex: number, element: T['TValue']): number;
    protected sliceInternal(column: ChunkedVector<T>, offset: number, length: number): ChunkedVector<T>;
}
export {};

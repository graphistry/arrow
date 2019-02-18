import { Data } from '../data';
import { AbstractVector, Vector } from '../vector';
import { DataType } from '../type';
import { Chunked } from './chunked';
import { Vector as VType } from '../interfaces';
import { Clonable, Sliceable, Applicative } from '../vector';
export interface BaseVector<T extends DataType = any> extends Clonable<VType<T>>, Sliceable<VType<T>>, Applicative<T, Chunked<T>> {
    slice(begin?: number, end?: number): VType<T>;
    concat(...others: Vector<T>[]): Chunked<T>;
    clone<R extends DataType = T>(data: Data<R>, children?: Vector<R>[]): VType<R>;
}
export declare abstract class BaseVector<T extends DataType = any> extends AbstractVector<T> implements Clonable<VType<T>>, Sliceable<VType<T>>, Applicative<T, Chunked<T>> {
    protected _children?: Vector[];
    constructor(data: Data<T>, children?: Vector[]);
    readonly data: Data<T>;
    readonly numChildren: number;
    readonly type: T;
    readonly typeId: T["TType"];
    readonly length: number;
    readonly offset: number;
    readonly stride: number;
    readonly nullCount: number;
    readonly VectorName: string;
    readonly ArrayType: T['ArrayType'];
    readonly values: T["TArray"];
    readonly typeIds: T["TArray"];
    readonly nullBitmap: Uint8Array;
    readonly valueOffsets: Int32Array;
    readonly [Symbol.toStringTag]: string;
    isValid(index: number): boolean;
    getChildAt<R extends DataType = any>(index: number): Vector<R> | null;
    toJSON(): any;
    protected _sliceInternal(self: this, begin: number, end: number): any;
    protected _bindDataAccessors(data: Data<T>): void;
}

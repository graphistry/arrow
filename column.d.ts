import { Field } from './schema';
import { Vector } from './vector';
import { DataType } from './type';
import { ChunkedVector } from './vector/chunked';
export declare class Column<T extends DataType = any> extends ChunkedVector<T> {
    constructor(field: Field<T>, vectors?: Vector<T>[], offsets?: Uint32Array);
    protected _children?: Column[];
    protected _field: Field<T>;
    readonly field: Field<T>;
    readonly name: string;
    slice(begin?: number, end?: number): Column<T>;
    getChildAt<R extends DataType = any>(index: number): Column<R> | null;
}

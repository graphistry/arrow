import { Field } from './schema';
import { Vector } from './vector';
import { DataType } from './type';
import { Chunked } from './vector/chunked';
import { Clonable, Sliceable, Applicative } from './vector';
export interface Column<T extends DataType = any> {
    typeId: T['TType'];
    concat(...others: Vector<T>[]): Column<T>;
    slice(begin?: number, end?: number): Column<T>;
    clone(chunks?: Vector<T>[], offsets?: Uint32Array): Column<T>;
}
export declare class Column<T extends DataType = any> extends Chunked<T> implements Clonable<Column<T>>, Sliceable<Column<T>>, Applicative<T, Column<T>> {
    constructor(field: Field<T>, vectors?: Vector<T>[], offsets?: Uint32Array);
    protected _field: Field<T>;
    protected _children?: Column[];
    readonly field: Field<T>;
    readonly name: string;
    getChildAt<R extends DataType = any>(index: number): Column<R> | null;
}

import { Data } from './data';
import { Column } from './column';
import { Schema, Field } from './schema';
import { RecordBatch } from './recordbatch';
import { DataFrame } from './compute/dataframe';
import { RecordBatchReader } from './ipc/reader';
import { Vector, Chunked } from './vector/index';
import { DataType, RowLike, Struct } from './type';
import { Clonable, Sliceable, Applicative } from './vector';
export interface Table<T extends {
    [key: string]: DataType;
} = any> {
    get(index: number): Struct<T>['TValue'];
    [Symbol.iterator](): IterableIterator<RowLike<T>>;
    slice(begin?: number, end?: number): Table<T>;
    concat(...others: Vector<Struct<T>>[]): Table<T>;
    clone(chunks?: RecordBatch<T>[], offsets?: Uint32Array): Table<T>;
    scan(next: import('./compute/dataframe').NextFunc, bind?: import('./compute/dataframe').BindFunc): void;
    countBy(name: import('./compute/predicate').Col | string): import('./compute/dataframe').CountByResult;
    filter(predicate: import('./compute/predicate').Predicate): import('./compute/dataframe').FilteredDataFrame<T>;
}
export declare class Table<T extends {
    [key: string]: DataType;
} = any> extends Chunked<Struct<T>> implements DataFrame<T>, Clonable<Table<T>>, Sliceable<Table<T>>, Applicative<Struct<T>, Table<T>> {
    /** @nocollapse */
    static empty<T extends {
        [key: string]: DataType;
    } = any>(): Table<T>;
    static from<T extends {
        [key: string]: DataType;
    } = any>(): Table<T>;
    static from<T extends {
        [key: string]: DataType;
    } = any>(source: RecordBatchReader<T>): Table<T>;
    static from<T extends {
        [key: string]: DataType;
    } = any>(source: import('./ipc/reader').FromArg0): Table<T>;
    static from<T extends {
        [key: string]: DataType;
    } = any>(source: import('./ipc/reader').FromArg2): Table<T>;
    static from<T extends {
        [key: string]: DataType;
    } = any>(source: import('./ipc/reader').FromArg1): Promise<Table<T>>;
    static from<T extends {
        [key: string]: DataType;
    } = any>(source: import('./ipc/reader').FromArg3): Promise<Table<T>>;
    static from<T extends {
        [key: string]: DataType;
    } = any>(source: import('./ipc/reader').FromArg4): Promise<Table<T>>;
    static from<T extends {
        [key: string]: DataType;
    } = any>(source: import('./ipc/reader').FromArg5): Promise<Table<T>>;
    static from<T extends {
        [key: string]: DataType;
    } = any>(source: PromiseLike<RecordBatchReader<T>>): Promise<Table<T>>;
    /** @nocollapse */
    static fromAsync<T extends {
        [key: string]: DataType;
    } = any>(source: import('./ipc/reader').FromArgs): Promise<Table<T>>;
    /** @nocollapse */
    static fromVectors<T extends {
        [key: string]: DataType;
    } = any>(vectors: Vector<T[keyof T]>[], fields?: (keyof T | Field<T[keyof T]>)[]): Table<T>;
    /** @nocollapse */
    static fromStruct<T extends {
        [key: string]: DataType;
    } = any>(struct: Vector<Struct<T>>): Table<T>;
    static new<T extends {
        [key: string]: DataType;
    } = any>(chunks: (Data<T[keyof T]> | Vector<T[keyof T]>)[], fields?: (keyof T | Field<T[keyof T]>)[]): Table<T>;
    static new<T extends {
        [key: string]: DataType;
    } = any>(...columns: (Column<T[keyof T]> | Column<T[keyof T]>[])[]): Table<T>;
    constructor(batches: RecordBatch<T>[]);
    constructor(...batches: RecordBatch<T>[]);
    constructor(schema: Schema, batches: RecordBatch<T>[]);
    constructor(schema: Schema, ...batches: RecordBatch<T>[]);
    protected _schema: Schema<T>;
    protected _chunks: RecordBatch<T>[];
    protected _children?: Column<T[keyof T]>[];
    readonly schema: Schema<T>;
    readonly length: number;
    readonly chunks: RecordBatch<T>[];
    readonly numCols: number;
    getColumnAt<R extends DataType = any>(index: number): Column<R> | null;
    getColumn<R extends keyof T>(name: R): Column<T[R]> | null;
    getColumnIndex<R extends keyof T>(name: R): number;
    getChildAt<R extends DataType = any>(index: number): Column<R> | null;
    serialize(encoding?: string, stream?: boolean): Uint8Array;
    count(): number;
    select<K extends keyof T = any>(...columnNames: K[]): Table<{
        [key: string]: any;
    }>;
    selectAt<K extends T[keyof T] = any>(...columnIndices: number[]): Table<{
        [key: string]: K;
    }>;
    assign<R extends {
        [key: string]: DataType;
    } = any>(other: Table<R>): Table<T & R>;
}

import { Schema } from './schema';
import { RecordBatch } from './recordbatch';
import { Vector as VType } from './interfaces';
import { RecordBatchReader } from './ipc/reader';
import { DataType, RowLike, Struct } from './type';
import { Vector } from './vector/index';
export interface DataFrame<T extends {
    [key: string]: DataType;
} = any> {
    count(): number;
    filter(predicate: import('./compute/predicate').Predicate): DataFrame<T>;
    countBy(name: import('./compute/predicate').Col | string): import('./compute/dataframe').CountByResult;
    scan(next: import('./compute/dataframe').NextFunc, bind?: import('./compute/dataframe').BindFunc): void;
    [Symbol.iterator](): IterableIterator<RowLike<T>>;
}
export declare class Table<T extends {
    [key: string]: DataType;
} = any> implements DataFrame<T> {
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
    } = any>(source: import('./ipc/reader').FromArg1): Table<T>;
    static from<T extends {
        [key: string]: DataType;
    } = any>(source: import('./ipc/reader').FromArg2): Promise<Table<T>>;
    static from<T extends {
        [key: string]: DataType;
    } = any>(source: import('./ipc/reader').FromArg3): Promise<Table<T>>;
    static from<T extends {
        [key: string]: DataType;
    } = any>(source: import('./ipc/reader').FromArg4): Promise<Table<T>>;
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
    } = any>(vectors: VType<T[keyof T]>[], names?: (keyof T)[]): Table<T>;
    /** @nocollapse */
    static fromStruct<T extends {
        [key: string]: DataType;
    } = any>(struct: Vector<Struct<T>>): Table<T>;
    protected _schema: Schema;
    protected _length: number;
    protected _numCols: number;
    protected _batches: RecordBatch<T>[];
    protected readonly _columns: Vector<any>[];
    protected _batchesUnion: Vector<Struct<T>>;
    constructor(batches: RecordBatch<T>[]);
    constructor(...batches: RecordBatch<T>[]);
    constructor(schema: Schema, batches: RecordBatch<T>[]);
    constructor(schema: Schema, ...batches: RecordBatch<T>[]);
    readonly schema: Schema<any>;
    readonly length: number;
    readonly numCols: number;
    readonly batches: RecordBatch<T>[];
    readonly batchesUnion: Vector<Struct<T>>;
    get(index: number): Struct<T>['TValue'];
    getColumn<R extends keyof T>(name: R): Vector<T[R]> | null;
    getColumnAt<T extends DataType = any>(index: number): Vector<T> | null;
    getColumnIndex<R extends keyof T>(name: R): number;
    [Symbol.iterator](): IterableIterator<RowLike<T>>;
    serialize(encoding?: string, stream?: boolean): Uint8Array;
    count(): number;
    select(...columnNames: string[]): Table<{
        [x: string]: T[string];
    }>;
}

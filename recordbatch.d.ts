import { Data } from './data';
import { Table } from './table';
import { Vector } from './vector';
import { Schema } from './schema';
import { DataType, Struct } from './type';
import { StructVector } from './vector/struct';
import { Clonable, Sliceable, Applicative } from './vector';
export interface RecordBatch<T extends {
    [key: string]: DataType;
} = any> {
    concat(...others: Vector<Struct<T>>[]): Table<T>;
    slice(begin?: number, end?: number): RecordBatch<T>;
    clone(data: Data<Struct<T>>, children?: Vector[]): RecordBatch<T>;
}
export declare class RecordBatch<T extends {
    [key: string]: DataType;
} = any> extends StructVector<T> implements Clonable<RecordBatch<T>>, Sliceable<RecordBatch<T>>, Applicative<Struct<T>, Table<T>> {
    /** @nocollapse */
    static from<T extends {
        [key: string]: DataType;
    } = any>(chunks: (Data<T[keyof T]> | Vector<T[keyof T]>)[], names?: (keyof T)[]): RecordBatch<T>;
    protected _schema: Schema;
    constructor(schema: Schema<T>, length: number, children: (Data | Vector)[]);
    constructor(schema: Schema<T>, data: Data<Struct<T>>, children?: Vector[]);
    readonly schema: Schema<any>;
    readonly numCols: number;
    select<K extends keyof T = any>(...columnNames: K[]): RecordBatch<{ [P in K]: T[P]; }>;
    selectAt<K extends T[keyof T] = any>(...columnIndices: number[]): RecordBatch<{
        [key: string]: K;
    }>;
}

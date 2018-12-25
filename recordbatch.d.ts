import { Data } from './data';
import { Table } from './table';
import { Vector } from './vector';
import { Schema } from './schema';
import { DataType, Struct } from './type';
import { StructVector } from './vector/struct';
import { Vector as VType } from './interfaces';
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
    } = any>(vectors: VType<T[keyof T]>[], names?: (keyof T)[]): RecordBatch<T>;
    protected _schema: Schema;
    constructor(schema: Schema<T>, numRows: number, childData: (Data | Vector)[]);
    constructor(schema: Schema<T>, data: Data<Struct<T>>, children?: Vector[]);
    readonly schema: Schema<any>;
    readonly numCols: number;
    select<K extends keyof T = any>(...columnNames: K[]): RecordBatch<{ [P in K]: T[P]; }>;
}

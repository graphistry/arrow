import { Data } from './data';
import { Vector } from './vector';
import { Schema } from './schema';
import { DataType, Struct } from './type';
import { Vector as VType } from './interfaces';
export declare class RecordBatch<T extends {
    [key: string]: DataType;
} = any> extends Vector<Struct<T>> {
    /** @nocollapse */
    static from<T extends {
        [key: string]: DataType;
    } = any>(vectors: VType<T[keyof T]>[], names?: (keyof T)[]): RecordBatch<T>;
    protected _schema: Schema;
    private impl;
    constructor(schema: Schema<T>, numRows: number, childData: (Data | Vector)[]);
    constructor(schema: Schema<T>, data: Data<Struct<T>>, children?: Vector[]);
    clone<R extends {
        [key: string]: DataType;
    } = any>(data: Data<Struct<R>>, children?: any): RecordBatch<R>;
    readonly schema: Schema<any>;
    readonly type: Struct<T>;
    readonly data: Data<Struct<T>>;
    readonly length: number;
    readonly stride: number;
    readonly numCols: number;
    readonly rowProxy: import("./vector").Row<T>;
    readonly nullCount: number;
    readonly numChildren: number;
    readonly TType: import("./enum").Type.Struct;
    readonly TArray: import("./type").IterableArrayLike<import("./type").RowLike<T>>;
    readonly TValue: import("./type").RowLike<T>;
    readonly ArrayType: any;
    get(index: number): Struct<T>['TValue'] | null;
    set(index: number, value: Struct<T>['TValue'] | null): void;
    isValid(index: number): boolean;
    indexOf(value: Struct<T>['TValue'] | null, fromIndex?: number): number;
    toArray(): import("./type").IterableArrayLike<import("./type").RowLike<T>>;
    [Symbol.iterator](): IterableIterator<import("./type").RowLike<T> | null>;
    slice(begin?: number, end?: number): RecordBatch<T>;
    concat(...others: Vector<Struct<T>>[]): Vector<Struct<T>>;
    getChildAt<R extends DataType = any>(index: number): Vector<R> | null;
    select<K extends keyof T = any>(...columnNames: K[]): RecordBatch<{ [P in K]: T[P]; }>;
}

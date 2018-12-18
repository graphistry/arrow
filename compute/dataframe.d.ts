import { Vector } from '../vector';
import { Vector as V } from '../interfaces';
import { Predicate, Col } from './predicate';
import { RecordBatch } from '../recordbatch';
import { Table, DataFrame as DF } from '../table';
import { DataType, Int, Struct } from '../type';
export declare type BindFunc = (batch: RecordBatch) => void;
export declare type NextFunc = (idx: number, batch: RecordBatch) => void;
declare module '../table' {
    interface Table<T extends {
        [key: string]: DataType;
    } = any> {
        filter(predicate: Predicate): DF;
        countBy(name: Col | string): CountByResult;
        scan(next: NextFunc, bind?: BindFunc): void;
    }
}
export declare class Dataframe<T extends {
    [key: string]: DataType;
} = any> extends Table<T> {
    filter(predicate: Predicate): DF<T>;
    scan(next: NextFunc, bind?: BindFunc): void;
    countBy(name: Col | string): CountByResult<any, Int<import("../enum").Type.Int | import("../enum").Type.Int8 | import("../enum").Type.Int16 | import("../enum").Type.Int32 | import("../enum").Type.Int64 | import("../enum").Type.Uint8 | import("../enum").Type.Uint16 | import("../enum").Type.Uint32 | import("../enum").Type.Uint64>>;
}
export declare class CountByResult<T extends DataType = any, TCount extends Int = Int> extends Table<{
    values: T;
    counts: TCount;
}> {
    constructor(values: Vector<T>, counts: V<TCount>);
    toJSON(): Object;
}
export declare class FilteredDataFrame<T extends {
    [key: string]: DataType;
} = any> implements DF<T> {
    private predicate;
    private batches;
    constructor(batches: RecordBatch<T>[], predicate: Predicate);
    scan(next: NextFunc, bind?: BindFunc): void;
    count(): number;
    [Symbol.iterator](): IterableIterator<Struct<T>['TValue']>;
    filter(predicate: Predicate): DF<T>;
    countBy(name: Col | string): CountByResult<any, Int<import("../enum").Type.Int | import("../enum").Type.Int8 | import("../enum").Type.Int16 | import("../enum").Type.Int32 | import("../enum").Type.Int64 | import("../enum").Type.Uint8 | import("../enum").Type.Uint16 | import("../enum").Type.Uint32 | import("../enum").Type.Uint64>>;
}

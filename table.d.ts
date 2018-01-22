/// <reference types="node" />
import { RecordBatch } from './recordbatch';
import { Col, Predicate } from './predicate';
import { Schema, Struct } from './type';
import { Vector, IntVector } from './vector';
export declare type NextFunc = (idx: number, cols: RecordBatch) => void;
export interface DataFrame {
    filter(predicate: Predicate): DataFrame;
    scan(next: NextFunc): void;
    count(): number;
    countBy(col: (Col | string)): CountByResult;
}
export declare class Table implements DataFrame {
    static empty(): Table;
    static from(sources?: Iterable<Uint8Array | Buffer | string> | object | string): Table;
    static fromAsync(sources?: AsyncIterable<Uint8Array | Buffer | string>): Promise<Table>;
    readonly schema: Schema;
    readonly length: number;
    readonly numCols: number;
    readonly batches: RecordBatch[];
    readonly columns: Vector<any>[];
    readonly batchesUnion: RecordBatch;
    constructor(batches: RecordBatch[]);
    constructor(...batches: RecordBatch[]);
    constructor(schema: Schema, batches: RecordBatch[]);
    constructor(schema: Schema, ...batches: RecordBatch[]);
    get(index: number): Struct['TValue'];
    getColumn(name: string): Vector<any>;
    getColumnAt(index: number): Vector<any>;
    getColumnIndex(name: string): number;
    [Symbol.iterator](): IterableIterator<Struct['TValue']>;
    filter(predicate: Predicate): DataFrame;
    scan(next: NextFunc): void;
    count(): number;
    countBy(name: Col | string): CountByResult;
    select(...columnNames: string[]): Table;
    toString(separator?: string): string;
    rowsToString(separator?: string): TableToStringIterator;
}
export declare class CountByResult extends Table implements DataFrame {
    constructor(values: Vector, counts: IntVector<any>);
    asJSON(): Object;
}
export declare class TableToStringIterator implements IterableIterator<string> {
    private iterator;
    constructor(iterator: IterableIterator<string>);
    [Symbol.iterator](): IterableIterator<string>;
    next(value?: any): IteratorResult<string>;
    throw(error?: any): IteratorResult<string>;
    return(value?: any): IteratorResult<string>;
    pipe(stream: NodeJS.WritableStream): void;
}

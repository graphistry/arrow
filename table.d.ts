/// <reference types="node" />
import { RecordBatch } from './recordbatch';
import { Col, Predicate } from './predicate';
import { Schema, Struct } from './type';
import { PipeIterator } from './util/node';
import { Vector, IntVector, StructVector } from './vector';
export declare type NextFunc = (idx: number, batch: RecordBatch) => void;
export declare type BindFunc = (batch: RecordBatch) => void;
export interface DataFrame {
    filter(predicate: Predicate): DataFrame;
    scan(next: NextFunc, bind?: BindFunc): void;
    count(): number;
    countBy(col: (Col | string)): CountByResult;
}
export declare class Table implements DataFrame {
    static empty(): Table;
    static from(sources?: Iterable<Uint8Array | Buffer | string> | object | string): Table;
    static fromAsync(sources?: AsyncIterable<Uint8Array | Buffer | string>): Promise<Table>;
    static fromStruct(struct: StructVector): Table;
    readonly schema: Schema;
    readonly length: number;
    readonly numCols: number;
    readonly batches: RecordBatch[];
    protected readonly _columns: Vector<any>[];
    readonly batchesUnion: RecordBatch;
    constructor(batches: RecordBatch[]);
    constructor(...batches: RecordBatch[]);
    constructor(schema: Schema, batches: RecordBatch[]);
    constructor(schema: Schema, ...batches: RecordBatch[]);
    get(index: number): Struct['TValue'];
    getColumn(name: string): Vector<any> | null;
    getColumnAt(index: number): Vector<any> | null;
    getColumnIndex(name: string): number;
    [Symbol.iterator](): IterableIterator<Struct['TValue']>;
    filter(predicate: Predicate): DataFrame;
    scan(next: NextFunc, bind?: BindFunc): void;
    count(): number;
    countBy(name: Col | string): CountByResult;
    select(...columnNames: string[]): Table;
    toString(separator?: string): string;
    serialize(encoding?: string, stream?: boolean): Uint8Array;
    rowsToString(separator?: string): PipeIterator<string>;
}
export declare class CountByResult extends Table implements DataFrame {
    constructor(values: Vector, counts: IntVector<any>);
    toJSON(): Object;
}

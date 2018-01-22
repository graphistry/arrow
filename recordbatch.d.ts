/// <reference types="flatbuffers" />
import { Schema, Struct } from './type';
import { flatbuffers } from 'flatbuffers';
import { View, Vector, StructVector } from './vector';
import { Data } from './data';
import Long = flatbuffers.Long;
export declare class RecordBatch extends StructVector {
    static from(vectors: Vector[]): RecordBatch;
    readonly schema: Schema;
    readonly numCols: number;
    readonly numRows: number;
    readonly columns: Vector<any>[];
    constructor(schema: Schema, data: Data<Struct>, view: View<Struct>);
    constructor(schema: Schema, numRows: Long | number, cols: Data<any> | Vector[]);
    clone<R extends Struct>(data: Data<R>, view?: View<R>): this;
    select(...columnNames: string[]): RecordBatch;
}

/// <reference types="flatbuffers" />
import { Schema, Struct, DataType } from './type';
import { flatbuffers } from 'flatbuffers';
import { View, Vector, StructVector } from './vector';
import { Data } from './data';
import Long = flatbuffers.Long;
export declare class RecordBatch extends StructVector {
    static from(vectors: Vector[]): RecordBatch;
    readonly schema: Schema;
    readonly length: number;
    readonly numCols: number;
    constructor(schema: Schema, data: Data<Struct>, view: View<Struct>);
    constructor(schema: Schema, numRows: Long | number, cols: Data<any> | Vector[]);
    clone<R extends Struct>(data: Data<R>, view?: View<R>): this;
    getChildAt<R extends DataType = DataType>(index: number): Vector<R> | null;
    select(...columnNames: string[]): RecordBatch;
}

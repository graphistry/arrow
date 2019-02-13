import { Column } from '../column';
import { Schema } from '../schema';
import { Vector } from '../vector';
import { DataType } from '../type';
import { Data } from '../data';
import { Chunked } from '../vector/chunked';
import { RecordBatch } from '../recordbatch';
/** @ignore */
export declare function alignChunkLengths<T extends {
    [key: string]: DataType;
} = any>(schema: Schema, chunks: Data<T[keyof T]>[], length?: number): Data<any>[];
/** @ignore */
export declare function distributeColumnsIntoRecordBatches<T extends {
    [key: string]: DataType;
} = any>(columns: Column<T[keyof T]>[]): [Schema<T>, RecordBatch<T>[]];
/** @ignore */
export declare function distributeVectorsIntoRecordBatches<T extends {
    [key: string]: DataType;
} = any>(schema: Schema<T>, vecs: (Vector<T[keyof T]> | Chunked<T[keyof T]>)[]): [Schema<T>, RecordBatch<T>[]];
/** @ignore */
export declare function uniformlyDistributeChunksAcrossRecordBatches<T extends {
    [key: string]: DataType;
} = any>(schema: Schema<T>, chunks: Data<T[keyof T]>[][]): [Schema<T>, RecordBatch<T>[]];

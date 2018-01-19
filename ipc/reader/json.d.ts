import { Vector } from '../../vector';
import { TypeDataLoader } from './vector';
import { RecordBatchMetadata, DictionaryBatch, BufferMetadata, FieldMetadata } from '../metadata';
import { Schema, DataType } from '../../type';
export declare function readJSON(json: any): IterableIterator<{
    schema: Schema;
    message: DictionaryBatch;
    loader: JSONDataLoader;
} | {
    schema: Schema;
    message: RecordBatchMetadata;
    loader: JSONDataLoader;
}>;
export declare class JSONDataLoader extends TypeDataLoader {
    private sources;
    constructor(sources: any[][], nodes: Iterator<FieldMetadata>, buffers: Iterator<BufferMetadata>, dictionaries: Map<number, Vector>);
    protected readNullBitmap<T extends DataType>(_type: T, nullCount: number, {offset}?: BufferMetadata): Uint8Array;
    protected readOffsets<T extends DataType>(_type: T, {offset}?: BufferMetadata): Int32Array;
    protected readTypeIds<T extends DataType>(_type: T, {offset}?: BufferMetadata): Int8Array;
    protected readData<T extends DataType>(type: T, {offset}?: BufferMetadata): any;
}

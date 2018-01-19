/// <reference types="flatbuffers" />
/// <reference types="node" />
import { Vector } from '../../vector';
import { flatbuffers } from 'flatbuffers';
import { TypeDataLoader } from './vector';
import { RecordBatchMetadata, DictionaryBatch, BufferMetadata, FieldMetadata } from '../metadata';
import { Schema, DataType } from '../../type';
import ByteBuffer = flatbuffers.ByteBuffer;
export declare function readBuffers<T extends Uint8Array | Buffer | string>(sources: Iterable<T> | Uint8Array | Buffer | string): IterableIterator<{
    schema: Schema;
    message: RecordBatchMetadata | DictionaryBatch;
    loader: BinaryDataLoader;
}>;
export declare function readBuffersAsync<T extends Uint8Array | Buffer | string>(sources: AsyncIterable<T>): AsyncIterableIterator<{
    schema: Schema;
    message: RecordBatchMetadata | DictionaryBatch;
    loader: BinaryDataLoader;
}>;
export declare class BinaryDataLoader extends TypeDataLoader {
    private bytes;
    private messageOffset;
    constructor(bb: ByteBuffer, nodes: Iterator<FieldMetadata>, buffers: Iterator<BufferMetadata>, dictionaries: Map<number, Vector>);
    protected readOffsets<T extends DataType>(type: T, buffer?: BufferMetadata): Uint8Array;
    protected readTypeIds<T extends DataType>(type: T, buffer?: BufferMetadata): Uint8Array;
    protected readData<T extends DataType>(_type: T, {length, offset}?: BufferMetadata): Uint8Array;
}

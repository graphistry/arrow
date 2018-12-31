/// <reference types="flatbuffers" />
import { DataType } from '../../type';
import { RecordBatch } from '../../recordbatch';
/** @ignore */
export declare function recordBatchReaderThroughDOMStream<T extends {
    [key: string]: DataType;
} = any>(): {
    writable: WritableStream<string | ArrayBuffer | SharedArrayBuffer | ArrayBufferView | ArrayLike<number> | Uint8Array | Iterable<number> | flatbuffers.ByteBuffer | IteratorResult<string | ArrayBuffer | SharedArrayBuffer | ArrayBufferView | ArrayLike<number> | Iterable<number> | flatbuffers.ByteBuffer | null | undefined> | ReadableStreamReadResult<string | ArrayBuffer | SharedArrayBuffer | ArrayBufferView | ArrayLike<number> | Iterable<number> | flatbuffers.ByteBuffer | null | undefined> | null | undefined>;
    readable: ReadableStream<RecordBatch<T>>;
};

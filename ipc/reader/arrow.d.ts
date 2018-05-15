/// <reference types="node" />
import { readJSON } from './json';
import { RecordBatch } from '../../recordbatch';
import { readBuffers, readBuffersAsync } from './binary';
import { readRecordBatches, readRecordBatchesAsync } from './vector';
export { readJSON, RecordBatch };
export { readBuffers, readBuffersAsync };
export { readRecordBatches, readRecordBatchesAsync };
export declare function read(sources: Iterable<Uint8Array | Buffer | string> | object | string): IterableIterator<RecordBatch>;
export declare function readAsync(sources: AsyncIterable<Uint8Array | Buffer | string>): AsyncIterableIterator<RecordBatch>;
export declare function readStream(stream: NodeJS.ReadableStream): AsyncIterableIterator<RecordBatch>;

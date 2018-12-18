/// <reference types="node" />
import { Vector } from '../vector';
import { Schema, Field } from '../schema';
import { Message } from './metadata/message';
import { RecordBatch } from '../recordbatch';
import { DataType, Dictionary } from '../type';
import { FileBlock } from './metadata/file';
import { ArrayBufferViewInput } from '../util/buffer';
import { MessageHeader } from '../enum';
import { WritableSink, AsyncByteQueue } from '../io/stream';
import { Writable, FileHandle, ReadableInterop, ReadableDOMStreamOptions } from '../io/interfaces';
export declare type OpenArgs = FileHandle | NodeJS.WritableStream | WritableStream<Uint8Array> | UnderlyingSink<Uint8Array>;
export declare class RecordBatchWriter<T extends {
    [key: string]: DataType;
} = any> extends ReadableInterop<Uint8Array> implements Writable<RecordBatch<T>> {
    /** @nocollapse */
    static throughNode(): import('stream').Duplex;
    /** @nocollapse */
    static throughDOM<T extends {
        [key: string]: DataType;
    }>(): {
        writable: WritableStream<RecordBatch<T>>;
        readable: ReadableStream<Uint8Array>;
    };
    protected position: number;
    protected started: boolean;
    protected sink: AsyncByteQueue<Uint8Array>;
    protected schema: Schema | null;
    protected dictionaryBlocks: FileBlock[];
    protected recordBatchBlocks: FileBlock[];
    toUint8Array(sync: true): Uint8Array;
    toUint8Array(sync?: false): Promise<Uint8Array>;
    readonly closed: Promise<void>;
    [Symbol.asyncIterator](): AsyncByteQueue<Uint8Array>;
    toReadableDOMStream(options?: ReadableDOMStreamOptions): ReadableStream<Uint8Array>;
    toReadableNodeStream(options?: import('stream').ReadableOptions): import("stream").Readable;
    close(): void;
    abort(reason?: any): void;
    reset(sink?: WritableSink<ArrayBufferViewInput>, schema?: Schema<T>): this;
    write(chunk: RecordBatch<T>): void;
    protected _writeMessage<T extends MessageHeader>(message: Message<T>, alignment?: number): this;
    protected _write(buffer: ArrayBufferView): this;
    protected _writeSchema(schema: Schema<T>): this;
    protected _writeFooter(): this;
    protected _writeMagic(): this;
    protected _writePadding(nBytes: number): this;
    protected _writeRecordBatch(records: RecordBatch<T>): this;
    protected _writeDictionaryBatch(dictionary: Vector, id: number, isDelta?: boolean): this;
    protected _writeBodyBuffers(buffers: ArrayBufferView[]): this;
    protected _writeDictionaries(dictionaryFields: Map<number, Field<Dictionary<any, any>>[]>): this;
}
export declare class RecordBatchFileWriter<T extends {
    [key: string]: DataType;
} = any> extends RecordBatchWriter<T> {
    static writeAll<T extends {
        [key: string]: DataType;
    } = any>(batches: Iterable<RecordBatch<T>>): RecordBatchFileWriter<T>;
    static writeAll<T extends {
        [key: string]: DataType;
    } = any>(batches: AsyncIterable<RecordBatch<T>>): Promise<RecordBatchFileWriter<T>>;
    close(): void;
    protected _writeSchema(schema: Schema<T>): this;
}
export declare class RecordBatchStreamWriter<T extends {
    [key: string]: DataType;
} = any> extends RecordBatchWriter<T> {
    static writeAll<T extends {
        [key: string]: DataType;
    } = any>(batches: Iterable<RecordBatch<T>>): RecordBatchStreamWriter<T>;
    static writeAll<T extends {
        [key: string]: DataType;
    } = any>(batches: AsyncIterable<RecordBatch<T>>): Promise<RecordBatchStreamWriter<T>>;
}

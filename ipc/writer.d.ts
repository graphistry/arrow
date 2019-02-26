import { Table } from '../table';
import { Vector } from '../vector';
import { Schema, Field } from '../schema';
import { Message } from './metadata/message';
import { RecordBatch } from '../recordbatch';
import { DataType, Dictionary } from '../type';
import { FileBlock } from './metadata/file';
import { MessageHeader } from '../enum';
import { WritableSink, AsyncByteQueue } from '../io/stream';
import { ArrayBufferViewInput } from '../util/buffer';
import { Writable, ReadableInterop, ReadableDOMStreamOptions } from '../io/interfaces';
export declare class RecordBatchWriter<T extends {
    [key: string]: DataType;
} = any> extends ReadableInterop<Uint8Array> implements Writable<RecordBatch<T>> {
    /** @nocollapse */
    static throughNode(options?: import('stream').DuplexOptions & {
        autoDestroy: boolean;
    }): import('stream').Duplex;
    /** @nocollapse */
    static throughDOM<T extends {
        [key: string]: DataType;
    }>(writableStrategy?: QueuingStrategy<RecordBatch<T>> & {
        autoDestroy: boolean;
    }, readableStrategy?: {
        highWaterMark?: number;
        size?: any;
    }): {
        writable: WritableStream<Table<T> | RecordBatch<T>>;
        readable: ReadableStream<Uint8Array>;
    };
    constructor(options?: {
        autoDestroy: boolean;
    });
    protected _position: number;
    protected _started: boolean;
    protected _autoDestroy: boolean;
    protected _sink: AsyncByteQueue<Uint8Array>;
    protected _schema: Schema | null;
    protected _dictionaryBlocks: FileBlock[];
    protected _recordBatchBlocks: FileBlock[];
    toString(sync: true): string;
    toString(sync?: false): Promise<string>;
    toUint8Array(sync: true): Uint8Array;
    toUint8Array(sync?: false): Promise<Uint8Array>;
    writeAll(input: Table<T> | Iterable<RecordBatch<T>>): this;
    writeAll(input: AsyncIterable<RecordBatch<T>>): Promise<this>;
    writeAll(input: PromiseLike<AsyncIterable<RecordBatch<T>>>): Promise<this>;
    writeAll(input: PromiseLike<Table<T> | Iterable<RecordBatch<T>>>): Promise<this>;
    readonly closed: Promise<void>;
    [Symbol.asyncIterator](): AsyncByteQueue<Uint8Array>;
    toDOMStream(options?: ReadableDOMStreamOptions): ReadableStream<Uint8Array>;
    toNodeStream(options?: import('stream').ReadableOptions): import("stream").Readable;
    close(): void;
    abort(reason?: any): void;
    finish(): this;
    reset(sink?: WritableSink<ArrayBufferViewInput>, schema?: Schema<T> | null): this;
    write(payload?: Table<T> | RecordBatch<T> | Iterable<RecordBatch<T>> | null): void;
    protected _writeMessage<T extends MessageHeader>(message: Message<T>, alignment?: number): this;
    protected _write(chunk: ArrayBufferViewInput): this;
    protected _writeSchema(schema: Schema<T>): this;
    protected _writeFooter(): this;
    protected _writeMagic(): this;
    protected _writePadding(nBytes: number): this;
    protected _writeRecordBatch(records: RecordBatch<T>): this;
    protected _writeDictionaryBatch(dictionary: Vector, id: number, isDelta?: boolean): this;
    protected _writeBodyBuffers(buffers: ArrayBufferView[]): this;
    protected _writeDictionaries(dictionaryFields: Map<number, Field<Dictionary<any, any>>[]>): this;
}
/** @ignore */
export declare class RecordBatchStreamWriter<T extends {
    [key: string]: DataType;
} = any> extends RecordBatchWriter<T> {
    static writeAll<T extends {
        [key: string]: DataType;
    } = any>(this: typeof RecordBatchWriter, input: Table<T> | Iterable<RecordBatch<T>>, options?: {
        autoDestroy: true;
    }): RecordBatchStreamWriter<T>;
    static writeAll<T extends {
        [key: string]: DataType;
    } = any>(this: typeof RecordBatchWriter, input: AsyncIterable<RecordBatch<T>>, options?: {
        autoDestroy: true;
    }): Promise<RecordBatchStreamWriter<T>>;
    static writeAll<T extends {
        [key: string]: DataType;
    } = any>(this: typeof RecordBatchWriter, input: PromiseLike<AsyncIterable<RecordBatch<T>>>, options?: {
        autoDestroy: true;
    }): Promise<RecordBatchStreamWriter<T>>;
    static writeAll<T extends {
        [key: string]: DataType;
    } = any>(this: typeof RecordBatchWriter, input: PromiseLike<Table<T> | Iterable<RecordBatch<T>>>, options?: {
        autoDestroy: true;
    }): Promise<RecordBatchStreamWriter<T>>;
}
/** @ignore */
export declare class RecordBatchFileWriter<T extends {
    [key: string]: DataType;
} = any> extends RecordBatchWriter<T> {
    static writeAll<T extends {
        [key: string]: DataType;
    } = any>(this: typeof RecordBatchWriter, input: Table<T> | Iterable<RecordBatch<T>>): RecordBatchFileWriter<T>;
    static writeAll<T extends {
        [key: string]: DataType;
    } = any>(this: typeof RecordBatchWriter, input: AsyncIterable<RecordBatch<T>>): Promise<RecordBatchFileWriter<T>>;
    static writeAll<T extends {
        [key: string]: DataType;
    } = any>(this: typeof RecordBatchWriter, input: PromiseLike<AsyncIterable<RecordBatch<T>>>): Promise<RecordBatchFileWriter<T>>;
    static writeAll<T extends {
        [key: string]: DataType;
    } = any>(this: typeof RecordBatchWriter, input: PromiseLike<Table<T> | Iterable<RecordBatch<T>>>): Promise<RecordBatchFileWriter<T>>;
    constructor();
    protected _writeSchema(schema: Schema<T>): this;
    protected _writeFooter(): this;
}
/** @ignore */
export declare class RecordBatchJSONWriter<T extends {
    [key: string]: DataType;
} = any> extends RecordBatchWriter<T> {
    static writeAll<T extends {
        [key: string]: DataType;
    } = any>(this: typeof RecordBatchWriter, input: Table<T> | Iterable<RecordBatch<T>>): RecordBatchJSONWriter<T>;
    static writeAll<T extends {
        [key: string]: DataType;
    } = any>(this: typeof RecordBatchWriter, input: AsyncIterable<RecordBatch<T>>): Promise<RecordBatchJSONWriter<T>>;
    static writeAll<T extends {
        [key: string]: DataType;
    } = any>(this: typeof RecordBatchWriter, input: PromiseLike<AsyncIterable<RecordBatch<T>>>): Promise<RecordBatchJSONWriter<T>>;
    static writeAll<T extends {
        [key: string]: DataType;
    } = any>(this: typeof RecordBatchWriter, input: PromiseLike<Table<T> | Iterable<RecordBatch<T>>>): Promise<RecordBatchJSONWriter<T>>;
    constructor();
    protected _writeMessage(): this;
    protected _writeSchema(schema: Schema<T>): this;
    protected _writeDictionaries(dictionaryFields: Map<number, Field<Dictionary<any, any>>[]>): this;
    protected _writeDictionaryBatch(dictionary: Vector, id: number, isDelta?: boolean): this;
    protected _writeRecordBatch(records: RecordBatch<T>): this;
    close(): void;
}

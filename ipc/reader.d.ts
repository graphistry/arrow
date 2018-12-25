/// <reference types="node" />
import { DataType } from '../type';
import { Vector } from '../vector';
import { MessageHeader } from '../enum';
import { Footer } from './metadata/file';
import { Schema, Field } from '../schema';
import { Message } from './metadata/message';
import { RecordBatch } from '../recordbatch';
import * as metadata from './metadata/message';
import { ByteStream, AsyncByteStream } from '../io/stream';
import { ArrayBufferViewInput } from '../util/buffer';
import { RandomAccessFile, AsyncRandomAccessFile } from '../io/file';
import { ArrowJSON, ArrowJSONLike, FileHandle, ReadableInterop } from '../io/interfaces';
import { MessageReader, AsyncMessageReader } from './message';
export declare type FromArg0 = ArrowJSONLike;
export declare type FromArg1 = PromiseLike<ArrowJSONLike>;
export declare type FromArg2 = Iterable<ArrayBufferViewInput> | ArrayBufferViewInput;
export declare type FromArg3 = PromiseLike<Iterable<ArrayBufferViewInput> | ArrayBufferViewInput>;
export declare type FromArg4 = NodeJS.ReadableStream | ReadableStream<ArrayBufferViewInput> | AsyncIterable<ArrayBufferViewInput>;
export declare type FromArg5 = Response | FileHandle | PromiseLike<FileHandle> | PromiseLike<Response>;
export declare type FromArgs = FromArg0 | FromArg1 | FromArg2 | FromArg3 | FromArg4 | FromArg5;
export declare abstract class RecordBatchReader<T extends {
    [key: string]: DataType;
} = any> extends ReadableInterop<RecordBatch<T>> {
    protected impl: IRecordBatchReaderImpl<T>;
    protected constructor(impl: IRecordBatchReaderImpl<T>);
    readonly closed: boolean;
    readonly schema: Schema<T>;
    readonly autoClose: boolean;
    readonly dictionaries: Map<number, Vector<any>>;
    readonly numDictionaries: number;
    readonly numRecordBatches: number;
    next(value?: any): IteratorResult<RecordBatch<T>> | Promise<IteratorResult<RecordBatch<T>>>;
    throw(value?: any): IteratorResult<any> | Promise<IteratorResult<any>>;
    return(value?: any): IteratorResult<any> | Promise<IteratorResult<any>>;
    reset(schema?: Schema<T> | null): this;
    abstract cancel(): void | Promise<void>;
    abstract open(autoClose?: boolean): this | Promise<this>;
    abstract [Symbol.iterator](): IterableIterator<RecordBatch<T>>;
    abstract [Symbol.asyncIterator](): AsyncIterableIterator<RecordBatch<T>>;
    toReadableDOMStream(): ReadableStream<RecordBatch<T>>;
    toReadableNodeStream(): import("stream").Readable;
    isSync(): this is RecordBatchFileReader<T> | RecordBatchStreamReader<T>;
    isAsync(): this is AsyncRecordBatchFileReader<T> | AsyncRecordBatchStreamReader<T>;
    isFile(): this is RecordBatchFileReader<T> | AsyncRecordBatchFileReader<T>;
    isStream(): this is RecordBatchStreamReader<T> | AsyncRecordBatchStreamReader<T>;
    /** @nocollapse */
    static throughNode(): import('stream').Duplex;
    /** @nocollapse */
    static throughDOM<T extends {
        [key: string]: DataType;
    }>(): {
        writable: WritableStream<Uint8Array>;
        readable: ReadableStream<RecordBatch<T>>;
    };
    static from<T extends RecordBatchReader>(source: T): T;
    static from<T extends {
        [key: string]: DataType;
    } = any>(source: FromArg0): RecordBatchStreamReader<T>;
    static from<T extends {
        [key: string]: DataType;
    } = any>(source: FromArg1): Promise<RecordBatchStreamReader<T>>;
    static from<T extends {
        [key: string]: DataType;
    } = any>(source: FromArg2): RecordBatchFileReader<T> | RecordBatchStreamReader<T>;
    static from<T extends {
        [key: string]: DataType;
    } = any>(source: FromArg3): Promise<RecordBatchFileReader<T> | RecordBatchStreamReader<T>>;
    static from<T extends {
        [key: string]: DataType;
    } = any>(source: FromArg4): Promise<RecordBatchFileReader<T> | AsyncRecordBatchStreamReader<T>>;
    static from<T extends {
        [key: string]: DataType;
    } = any>(source: FromArg5): Promise<AsyncRecordBatchFileReader<T> | AsyncRecordBatchStreamReader<T>>;
    private static fromJSON;
    private static fromByteStream;
    private static fromAsyncByteStream;
    private static fromFileHandle;
}
export declare class RecordBatchFileReader<T extends {
    [key: string]: DataType;
} = any> extends RecordBatchReader<T> {
    protected impl: RecordBatchFileReaderImpl<T>;
    constructor(source: AsyncRecordBatchFileReaderImpl<T>);
    constructor(source: RandomAccessFile, dictionaries?: Map<number, Vector>);
    constructor(source: ArrayBufferViewInput, dictionaries?: Map<number, Vector>);
    readonly footer: Footer;
    [Symbol.iterator](): IterableIterator<RecordBatch<T>>;
    [Symbol.asyncIterator](): AsyncIterableIterator<RecordBatch<T>>;
}
export declare class RecordBatchStreamReader<T extends {
    [key: string]: DataType;
} = any> extends RecordBatchReader<T> {
    protected impl: RecordBatchStreamReaderImpl<T>;
    constructor(source: ByteStream | ArrowJSON | ArrayBufferView | Iterable<ArrayBufferView>, dictionaries?: Map<number, Vector>);
    [Symbol.iterator](): IterableIterator<RecordBatch<T>>;
    [Symbol.asyncIterator](): AsyncIterableIterator<RecordBatch<T>>;
}
export declare class AsyncRecordBatchStreamReader<T extends {
    [key: string]: DataType;
} = any> extends RecordBatchReader<T> {
    protected impl: AsyncRecordBatchStreamReaderImpl<T>;
    constructor(source: AsyncByteStream | FileHandle | NodeJS.ReadableStream | ReadableStream<ArrayBufferView> | AsyncIterable<ArrayBufferView>, byteLength?: number);
    [Symbol.asyncIterator](): AsyncIterableIterator<RecordBatch<T>>;
    [Symbol.iterator](): IterableIterator<RecordBatch<T>>;
}
export declare class AsyncRecordBatchFileReader<T extends {
    [key: string]: DataType;
} = any> extends RecordBatchReader<T> {
    protected impl: AsyncRecordBatchFileReaderImpl<T>;
    constructor(source: AsyncRandomAccessFile);
    constructor(source: AsyncRandomAccessFile, dictionaries: Map<number, Vector>);
    constructor(source: FileHandle, byteLength: number, dictionaries: Map<number, Vector>);
    readonly footer: Footer;
    [Symbol.asyncIterator](): AsyncIterableIterator<RecordBatch<T>>;
    [Symbol.iterator](): IterableIterator<RecordBatch<T>>;
}
declare abstract class RecordBatchReaderImplBase<T extends {
    [key: string]: DataType;
} = any> {
    schema: Schema;
    closed: boolean;
    autoClose: boolean;
    dictionaryIndex: number;
    recordBatchIndex: number;
    dictionaries: Map<number, Vector>;
    readonly numDictionaries: number;
    readonly numRecordBatches: number;
    constructor(dictionaries?: Map<number, Vector<any>>);
    reset(schema?: Schema<T> | null): this;
    protected _loadRecordBatch(header: metadata.RecordBatch, body: any): RecordBatch<T>;
    protected _loadDictionaryBatch(header: metadata.DictionaryBatch, body: any): Vector<any>;
    protected _loadVectors(header: metadata.RecordBatch, body: any, types: (Field | DataType)[]): import("../data").Data<DataType<import("../enum").Type, any>>[];
}
declare class RecordBatchStreamReaderImpl<T extends {
    [key: string]: DataType;
} = any> extends RecordBatchReaderImplBase<T> implements IRecordBatchReaderImpl<T>, IterableIterator<RecordBatch<T>> {
    protected reader: MessageReader;
    constructor(reader: MessageReader, dictionaries?: Map<number, Vector<any>>);
    [Symbol.iterator](): IterableIterator<RecordBatch<T>>;
    close(): this;
    open(autoClose?: boolean): this;
    throw(value?: any): IteratorResult<any>;
    return(value?: any): IteratorResult<any>;
    next(): IteratorResult<RecordBatch<T>>;
    protected readNextMessageAndValidate<T extends MessageHeader>(type?: T | null): Message<T> | null;
}
declare class AsyncRecordBatchStreamReaderImpl<T extends {
    [key: string]: DataType;
} = any> extends RecordBatchReaderImplBase<T> implements IRecordBatchReaderImpl<T>, AsyncIterableIterator<RecordBatch<T>> {
    protected reader: AsyncMessageReader;
    constructor(reader: AsyncMessageReader, dictionaries?: Map<number, Vector<any>>);
    [Symbol.asyncIterator](): AsyncIterableIterator<RecordBatch<T>>;
    close(): Promise<this>;
    open(autoClose?: boolean): Promise<this>;
    throw(value?: any): Promise<IteratorResult<any>>;
    return(value?: any): Promise<IteratorResult<any>>;
    next(): Promise<any>;
    protected readNextMessageAndValidate<T extends MessageHeader>(type?: T | null): Promise<Message<T> | null>;
}
declare class RecordBatchFileReaderImpl<T extends {
    [key: string]: DataType;
} = any> extends RecordBatchStreamReaderImpl<T> implements IRecordBatchFileReaderImpl<T>, IterableIterator<RecordBatch<T>> {
    protected file: RandomAccessFile;
    footer: Footer;
    readonly numDictionaries: number;
    readonly numRecordBatches: number;
    constructor(file: RandomAccessFile, dictionaries?: Map<number, Vector<any>>);
    open(autoClose?: boolean): this;
    readRecordBatch(index: number): RecordBatch<T> | null;
    protected readDictionaryBatch(index: number): void;
    protected readFooter(): Footer;
    protected readNextMessageAndValidate<T extends MessageHeader>(type?: T | null): Message<T> | null;
}
declare class AsyncRecordBatchFileReaderImpl<T extends {
    [key: string]: DataType;
} = any> extends AsyncRecordBatchStreamReaderImpl<T> implements IRecordBatchFileReaderImpl<T>, AsyncIterableIterator<RecordBatch<T>> {
    protected file: AsyncRandomAccessFile;
    footer: Footer;
    readonly numDictionaries: number;
    readonly numRecordBatches: number;
    constructor(file: AsyncRandomAccessFile, dictionaries?: Map<number, Vector<any>>);
    open(autoClose?: boolean): Promise<this>;
    readRecordBatch(index: number): Promise<RecordBatch<T> | null>;
    protected readDictionaryBatch(index: number): Promise<void>;
    protected readFooter(): Promise<Footer>;
    protected readNextMessageAndValidate<T extends MessageHeader>(type?: T | null): Promise<Message<T> | null>;
}
interface IRecordBatchReaderImpl<T extends {
    [key: string]: DataType;
} = any> {
    closed: boolean;
    schema: Schema<T>;
    autoClose: boolean;
    numDictionaries: number;
    numRecordBatches: number;
    dictionaries: Map<number, Vector>;
    open(autoClose?: boolean): this | Promise<this>;
    reset(schema?: Schema<T> | null): this;
    close(): this | Promise<this>;
    [Symbol.iterator]?(): IterableIterator<RecordBatch<T>>;
    [Symbol.asyncIterator]?(): AsyncIterableIterator<RecordBatch<T>>;
    throw(value?: any): IteratorResult<any> | Promise<IteratorResult<any>>;
    return(value?: any): IteratorResult<any> | Promise<IteratorResult<any>>;
    next(value?: any): IteratorResult<RecordBatch<T>> | Promise<IteratorResult<RecordBatch<T>>>;
}
interface IRecordBatchFileReaderImpl<T extends {
    [key: string]: DataType;
} = any> extends IRecordBatchReaderImpl<T> {
    footer: Footer;
    readRecordBatch(index: number): RecordBatch<T> | null | Promise<RecordBatch<T> | null>;
}
export interface RecordBatchFileReader<T extends {
    [key: string]: DataType;
} = any> {
    cancel(): void;
    open(autoClose?: boolean): this;
    throw(value?: any): IteratorResult<any>;
    return(value?: any): IteratorResult<any>;
    next(value?: any): IteratorResult<RecordBatch<T>>;
    readRecordBatch(index: number): RecordBatch<T> | null;
}
export interface RecordBatchStreamReader<T extends {
    [key: string]: DataType;
} = any> {
    cancel(): void;
    open(autoClose?: boolean): this;
    throw(value?: any): IteratorResult<any>;
    return(value?: any): IteratorResult<any>;
    next(value?: any): IteratorResult<RecordBatch<T>>;
}
export interface AsyncRecordBatchFileReader<T extends {
    [key: string]: DataType;
} = any> {
    cancel(): Promise<void>;
    open(autoClose?: boolean): Promise<this>;
    throw(value?: any): Promise<IteratorResult<any>>;
    return(value?: any): Promise<IteratorResult<any>>;
    next(value?: any): Promise<IteratorResult<RecordBatch<T>>>;
    readRecordBatch(index: number): Promise<RecordBatch<T> | null>;
}
export interface AsyncRecordBatchStreamReader<T extends {
    [key: string]: DataType;
} = any> {
    cancel(): Promise<void>;
    open(autoClose?: boolean): Promise<this>;
    throw(value?: any): Promise<IteratorResult<any>>;
    return(value?: any): Promise<IteratorResult<any>>;
    next(value?: any): Promise<IteratorResult<RecordBatch<T>>>;
}
export {};

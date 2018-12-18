/// <reference types="node" />
import { Readable, Writable, AsyncQueue } from './interfaces';
import { ArrayBufferViewInput } from '../util/buffer';
export declare type WritableSink<T> = Writable<T> | WritableStream<T> | NodeJS.WritableStream | null;
export declare type ReadableSource<T> = Readable<T> | PromiseLike<T> | AsyncIterable<T> | ReadableStream<T> | NodeJS.ReadableStream | null;
/**
 * @ignore
 */
export declare class AsyncByteQueue<T extends ArrayBufferViewInput = Uint8Array> extends AsyncQueue<Uint8Array, T> {
    write(value: ArrayBufferViewInput | Uint8Array): void;
    toUint8Array(sync: true): Uint8Array;
    toUint8Array(sync?: false): Promise<Uint8Array>;
}
/**
 * @ignore
 */
export declare class ByteStream {
    private source;
    constructor(source?: Iterable<ArrayBufferViewInput> | ArrayBufferViewInput);
    throw(value?: any): any;
    return(value?: any): any;
    peek(size?: number | null): Uint8Array | null;
    read(size?: number | null): Uint8Array | null;
}
/**
 * @ignore
 */
export declare class AsyncByteStream implements Readable<Uint8Array> {
    private source;
    constructor(source?: PromiseLike<ArrayBufferViewInput> | Response | ReadableStream<ArrayBufferViewInput> | NodeJS.ReadableStream | AsyncIterable<ArrayBufferViewInput> | Iterable<ArrayBufferViewInput>);
    next(value?: any): Promise<IteratorResult<Uint8Array>>;
    throw(value?: any): Promise<any>;
    return(value?: any): Promise<any>;
    readonly closed: Promise<void>;
    cancel(reason?: any): Promise<void>;
    peek(size?: number | null): Promise<Uint8Array | null>;
    read(size?: number | null): Promise<Uint8Array | null>;
}

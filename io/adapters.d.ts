/// <reference types="node" />
import { ArrayBufferViewInput } from '../util/buffer';
import { ReadableDOMStreamOptions } from './interfaces';
declare const _default: {
    fromIterable<T extends ArrayBufferViewInput>(source: T | Iterable<T>): IterableIterator<Uint8Array>;
    fromAsyncIterable<T extends ArrayBufferViewInput>(source: AsyncIterable<T> | PromiseLike<T>): AsyncIterableIterator<Uint8Array>;
    fromReadableDOMStream<T extends ArrayBufferViewInput>(source: ReadableStream<T>): AsyncIterableIterator<Uint8Array>;
    fromReadableNodeStream(stream: NodeJS.ReadableStream): AsyncIterableIterator<Uint8Array>;
    toReadableDOMStream<T>(source: Iterable<T> | AsyncIterable<T>, options?: ReadableDOMStreamOptions | undefined): ReadableStream<T>;
    toReadableNodeStream<T>(source: Iterable<T> | AsyncIterable<T>, options?: import("stream").ReadableOptions | undefined): import("stream").Readable;
};
/**
 * @ignore
 */
export default _default;

import { ReadableDOMStreamOptions } from '../../io/interfaces';
/** @ignore */
export declare function toReadableDOMStream<T>(source: Iterable<T> | AsyncIterable<T>, options?: ReadableDOMStreamOptions): ReadableStream<T>;

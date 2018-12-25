import { ReadableDOMStreamOptions } from '../../io/interfaces';
export declare function toReadableDOMStream<T>(source: Iterable<T> | AsyncIterable<T>, options?: ReadableDOMStreamOptions): ReadableStream<T>;

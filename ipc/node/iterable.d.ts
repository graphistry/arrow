/// <reference types="node" />
import { Readable } from 'stream';
declare type ReadableOptions = import('stream').ReadableOptions;
export declare function toReadableNodeStream<T>(source: Iterable<T> | AsyncIterable<T>, options?: ReadableOptions): Readable;
export {};

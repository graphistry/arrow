/// <reference types="node" />
import { Readable } from 'stream';
declare type ReadableOptions = import('stream').ReadableOptions;
/** @ignore */
export declare function toNodeStream<T>(source: Iterable<T> | AsyncIterable<T>, options?: ReadableOptions): Readable;
export {};

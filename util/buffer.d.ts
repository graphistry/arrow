import { flatbuffers } from 'flatbuffers';
import ByteBuffer = flatbuffers.ByteBuffer;
import { ArrayBufferViewConstructor } from '../interfaces';
/** @ignore */
export declare function memcpy<TTarget extends ArrayBufferView, TSource extends ArrayBufferView>(target: TTarget, source: TSource, targetByteOffset?: number, sourceByteLength?: number): TTarget;
/** @ignore */
export declare function joinUint8Arrays(chunks: Uint8Array[], size?: number | null): [Uint8Array, Uint8Array[], number];
/** @ignore */
export declare type ArrayBufferViewInput = ArrayBufferView | ArrayBufferLike | ArrayBufferView | Iterable<number> | ArrayLike<number> | ByteBuffer | string | null | undefined | IteratorResult<ArrayBufferView | ArrayBufferLike | ArrayBufferView | Iterable<number> | ArrayLike<number> | ByteBuffer | string | null | undefined> | ReadableStreamReadResult<ArrayBufferView | ArrayBufferLike | ArrayBufferView | Iterable<number> | ArrayLike<number> | ByteBuffer | string | null | undefined>;
/** @ignore */
export declare function toArrayBufferView<T extends ArrayBufferView>(ArrayBufferViewCtor: ArrayBufferViewConstructor<T>, input: ArrayBufferViewInput): T;
/** @ignore */ export declare const toInt8Array: (input: ArrayBufferViewInput) => Int8Array;
/** @ignore */ export declare const toInt16Array: (input: ArrayBufferViewInput) => Int16Array;
/** @ignore */ export declare const toInt32Array: (input: ArrayBufferViewInput) => Int32Array;
/** @ignore */ export declare const toUint8Array: (input: ArrayBufferViewInput) => Uint8Array;
/** @ignore */ export declare const toUint16Array: (input: ArrayBufferViewInput) => Uint16Array;
/** @ignore */ export declare const toUint32Array: (input: ArrayBufferViewInput) => Uint32Array;
/** @ignore */ export declare const toFloat32Array: (input: ArrayBufferViewInput) => Float32Array;
/** @ignore */ export declare const toFloat64Array: (input: ArrayBufferViewInput) => Float64Array;
/** @ignore */ export declare const toUint8ClampedArray: (input: ArrayBufferViewInput) => Uint8ClampedArray;
/** @ignore */
declare type ArrayBufferViewIteratorInput = Iterable<ArrayBufferViewInput> | ArrayBufferViewInput;
/** @ignore */
export declare function toArrayBufferViewIterator<T extends ArrayBufferView>(ArrayCtor: ArrayBufferViewConstructor<T>, source: ArrayBufferViewIteratorInput): IterableIterator<T>;
/** @ignore */ export declare const toInt8ArrayIterator: (input: ArrayBufferViewIteratorInput) => IterableIterator<Int8Array>;
/** @ignore */ export declare const toInt16ArrayIterator: (input: ArrayBufferViewIteratorInput) => IterableIterator<Int16Array>;
/** @ignore */ export declare const toInt32ArrayIterator: (input: ArrayBufferViewIteratorInput) => IterableIterator<Int32Array>;
/** @ignore */ export declare const toUint8ArrayIterator: (input: ArrayBufferViewIteratorInput) => IterableIterator<Uint8Array>;
/** @ignore */ export declare const toUint16ArrayIterator: (input: ArrayBufferViewIteratorInput) => IterableIterator<Uint16Array>;
/** @ignore */ export declare const toUint32ArrayIterator: (input: ArrayBufferViewIteratorInput) => IterableIterator<Uint32Array>;
/** @ignore */ export declare const toFloat32ArrayIterator: (input: ArrayBufferViewIteratorInput) => IterableIterator<Float32Array>;
/** @ignore */ export declare const toFloat64ArrayIterator: (input: ArrayBufferViewIteratorInput) => IterableIterator<Float64Array>;
/** @ignore */ export declare const toUint8ClampedArrayIterator: (input: ArrayBufferViewIteratorInput) => IterableIterator<Uint8ClampedArray>;
/** @ignore */
declare type ArrayBufferViewAsyncIteratorInput = AsyncIterable<ArrayBufferViewInput> | Iterable<ArrayBufferViewInput> | PromiseLike<ArrayBufferViewInput> | ArrayBufferViewInput;
/** @ignore */
export declare function toArrayBufferViewAsyncIterator<T extends ArrayBufferView>(ArrayCtor: ArrayBufferViewConstructor<T>, source: ArrayBufferViewAsyncIteratorInput): AsyncIterableIterator<T>;
/** @ignore */ export declare const toInt8ArrayAsyncIterator: (input: ArrayBufferViewAsyncIteratorInput) => AsyncIterableIterator<Int8Array>;
/** @ignore */ export declare const toInt16ArrayAsyncIterator: (input: ArrayBufferViewAsyncIteratorInput) => AsyncIterableIterator<Int16Array>;
/** @ignore */ export declare const toInt32ArrayAsyncIterator: (input: ArrayBufferViewAsyncIteratorInput) => AsyncIterableIterator<Int32Array>;
/** @ignore */ export declare const toUint8ArrayAsyncIterator: (input: ArrayBufferViewAsyncIteratorInput) => AsyncIterableIterator<Uint8Array>;
/** @ignore */ export declare const toUint16ArrayAsyncIterator: (input: ArrayBufferViewAsyncIteratorInput) => AsyncIterableIterator<Uint16Array>;
/** @ignore */ export declare const toUint32ArrayAsyncIterator: (input: ArrayBufferViewAsyncIteratorInput) => AsyncIterableIterator<Uint32Array>;
/** @ignore */ export declare const toFloat32ArrayAsyncIterator: (input: ArrayBufferViewAsyncIteratorInput) => AsyncIterableIterator<Float32Array>;
/** @ignore */ export declare const toFloat64ArrayAsyncIterator: (input: ArrayBufferViewAsyncIteratorInput) => AsyncIterableIterator<Float64Array>;
/** @ignore */ export declare const toUint8ClampedArrayAsyncIterator: (input: ArrayBufferViewAsyncIteratorInput) => AsyncIterableIterator<Uint8ClampedArray>;
/** @ignore */
export declare function rebaseValueOffsets(offset: number, length: number, valueOffsets: Int32Array): Int32Array;
/** @ignore */
export declare function compareArrayLike<T extends ArrayLike<any>>(a: T, b: T): boolean;
export {};

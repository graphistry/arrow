import * as Schema_ from './fb/Schema';
import * as Message_ from './fb/Message';
import { Vector, View } from './vector';
import { flatbuffers } from 'flatbuffers';
import { TypeVisitor, VisitorNode } from './visitor';
export import Long = flatbuffers.Long;
export import ArrowType = Schema_.org.apache.arrow.flatbuf.Type;
export import DateUnit = Schema_.org.apache.arrow.flatbuf.DateUnit;
export import TimeUnit = Schema_.org.apache.arrow.flatbuf.TimeUnit;
export import Precision = Schema_.org.apache.arrow.flatbuf.Precision;
export import UnionMode = Schema_.org.apache.arrow.flatbuf.UnionMode;
export import VectorType = Schema_.org.apache.arrow.flatbuf.VectorType;
export import IntervalUnit = Schema_.org.apache.arrow.flatbuf.IntervalUnit;
export import MessageHeader = Message_.org.apache.arrow.flatbuf.MessageHeader;
export import MetadataVersion = Schema_.org.apache.arrow.flatbuf.MetadataVersion;
export declare class Schema {
    static from(vectors: Vector[]): Schema;
    protected _bodyLength: number;
    protected _headerType: MessageHeader;
    readonly fields: Field[];
    readonly version: MetadataVersion;
    readonly metadata?: Map<string, string>;
    readonly dictionaries: Map<number, Field<Dictionary>>;
    constructor(fields: Field[], metadata?: Map<string, string>, version?: MetadataVersion, dictionaries?: Map<number, Field<Dictionary>>);
    readonly bodyLength: number;
    readonly headerType: MessageHeader;
    select(...fieldNames: string[]): Schema;
    static [Symbol.toStringTag]: string;
}
export declare class Field<T extends DataType = DataType> {
    readonly type: T;
    readonly name: string;
    readonly nullable: boolean;
    readonly metadata?: Map<string, string> | null;
    constructor(name: string, type: T, nullable?: boolean, metadata?: Map<string, string> | null);
    toString(): string;
    readonly typeId: T['TType'];
    readonly [Symbol.toStringTag]: string;
    readonly indices: T | Int<any>;
}
export declare type TimeBitWidth = 32 | 64;
export declare type IntBitWidth = 8 | 16 | 32 | 64;
export declare type NumericType = Int | Float | Date_ | Time | Interval | Timestamp;
export declare type FixedSizeType = Int64 | Uint64 | Decimal | FixedSizeBinary;
export declare type PrimitiveType = NumericType | FixedSizeType;
export declare type FlatListType = Utf8 | Binary;
export declare type FlatType = Bool | PrimitiveType | FlatListType;
export declare type ListType = List<any>;
export declare type NestedType = Map_ | Struct | List<any> | FixedSizeList<any> | Union<any>;
export declare type SingleNestedType = List<any> | FixedSizeList<any>;
/**
 * *
 * Main data type enumeration:
 * *
 * Data types in this library are all *logical*. They can be expressed as
 * either a primitive physical type (bytes or bits of some fixed size), a
 * nested type consisting of other data types, or another data type (e.g. a
 * timestamp encoded as an int64)
 */
export declare enum Type {
    NONE = 0,
    Null = 1,
    Int = 2,
    Float = 3,
    Binary = 4,
    Utf8 = 5,
    Bool = 6,
    Decimal = 7,
    Date = 8,
    Time = 9,
    Timestamp = 10,
    Interval = 11,
    List = 12,
    Struct = 13,
    Union = 14,
    FixedSizeBinary = 15,
    FixedSizeList = 16,
    Map = 17,
    Dictionary = "Dictionary",
    DenseUnion = "DenseUnion",
    SparseUnion = "SparseUnion"
}
export interface DataType<TType extends Type = any> {
    readonly TType: TType;
    readonly TArray: any;
    readonly TValue: any;
    readonly ArrayType: any;
}
export declare abstract class DataType<TType extends Type = any> implements Partial<VisitorNode> {
    readonly TType: TType;
    readonly children?: Field<DataType<any>>[] | undefined;
    [Symbol.toStringTag]: string;
    static isNull(x: any): x is Null;
    static isInt(x: any): x is Int;
    static isFloat(x: any): x is Float;
    static isBinary(x: any): x is Binary;
    static isUtf8(x: any): x is Utf8;
    static isBool(x: any): x is Bool;
    static isDecimal(x: any): x is Decimal;
    static isDate(x: any): x is Date_;
    static isTime(x: any): x is Time;
    static isTimestamp(x: any): x is Timestamp;
    static isInterval(x: any): x is Interval;
    static isList(x: any): x is List;
    static isStruct(x: any): x is Struct;
    static isUnion(x: any): x is Union;
    static isDenseUnion(x: any): x is DenseUnion;
    static isSparseUnion(x: any): x is SparseUnion;
    static isFixedSizeBinary(x: any): x is FixedSizeBinary;
    static isFixedSizeList(x: any): x is FixedSizeList;
    static isMap(x: any): x is Map_;
    static isDictionary(x: any): x is Dictionary;
    constructor(TType: TType, children?: Field<DataType<any>>[] | undefined);
    acceptTypeVisitor(visitor: TypeVisitor): any;
    protected static [Symbol.toStringTag]: string;
}
export interface Null extends DataType<Type.Null> {
    TArray: void;
    TValue: null;
}
export declare class Null extends DataType<Type.Null> {
    constructor();
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export interface Int<TValueType = any, TArrayType extends IntArray = IntArray> extends DataType<Type.Int> {
    TArray: TArrayType;
    TValue: TValueType;
}
export declare class Int<TValueType = any, TArrayType extends IntArray = IntArray> extends DataType<Type.Int> {
    readonly isSigned: boolean;
    readonly bitWidth: IntBitWidth;
    constructor(isSigned: boolean, bitWidth: IntBitWidth);
    readonly ArrayType: TypedArrayConstructor<TArrayType>;
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export declare class Int8 extends Int<number, Int8Array> {
    constructor();
}
export declare class Int16 extends Int<number, Int16Array> {
    constructor();
}
export declare class Int32 extends Int<number, Int32Array> {
    constructor();
}
export declare class Int64 extends Int<Int32Array, Int32Array> {
    constructor();
}
export declare class Uint8 extends Int<number, Uint8Array> {
    constructor();
}
export declare class Uint16 extends Int<number, Uint16Array> {
    constructor();
}
export declare class Uint32 extends Int<number, Uint32Array> {
    constructor();
}
export declare class Uint64 extends Int<Uint32Array, Uint32Array> {
    constructor();
}
export interface Float<TArrayType extends FloatArray = FloatArray> extends DataType<Type.Float> {
    TArray: TArrayType;
    TValue: number;
}
export declare class Float<TArrayType extends FloatArray = FloatArray> extends DataType<Type.Float> {
    readonly precision: Precision;
    constructor(precision: Precision);
    readonly ArrayType: TypedArrayConstructor<TArrayType>;
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export declare class Float16 extends Float<Uint16Array> {
    constructor();
}
export declare class Float32 extends Float<Float32Array> {
    constructor();
}
export declare class Float64 extends Float<Float64Array> {
    constructor();
}
export interface Binary extends DataType<Type.Binary> {
    TArray: Uint8Array;
    TValue: Uint8Array;
}
export declare class Binary extends DataType<Type.Binary> {
    constructor();
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export interface Utf8 extends DataType<Type.Utf8> {
    TArray: Uint8Array;
    TValue: string;
}
export declare class Utf8 extends DataType<Type.Utf8> {
    constructor();
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export interface Bool extends DataType<Type.Bool> {
    TArray: Uint8Array;
    TValue: boolean;
}
export declare class Bool extends DataType<Type.Bool> {
    constructor();
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export interface Decimal extends DataType<Type.Decimal> {
    TArray: Uint32Array;
    TValue: Uint32Array;
}
export declare class Decimal extends DataType<Type.Decimal> {
    readonly scale: number;
    readonly precision: number;
    constructor(scale: number, precision: number);
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export interface Date_ extends DataType<Type.Date> {
    TArray: Int32Array;
    TValue: Date;
}
export declare class Date_ extends DataType<Type.Date> {
    readonly unit: DateUnit;
    constructor(unit: DateUnit);
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export interface Time extends DataType<Type.Time> {
    TArray: Uint32Array;
    TValue: number;
}
export declare class Time extends DataType<Type.Time> {
    readonly unit: TimeUnit;
    readonly bitWidth: TimeBitWidth;
    constructor(unit: TimeUnit, bitWidth: TimeBitWidth);
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export interface Timestamp extends DataType<Type.Timestamp> {
    TArray: Int32Array;
    TValue: number;
}
export declare class Timestamp extends DataType<Type.Timestamp> {
    unit: TimeUnit;
    timezone?: string | null | undefined;
    constructor(unit: TimeUnit, timezone?: string | null | undefined);
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export interface Interval extends DataType<Type.Interval> {
    TArray: Int32Array;
    TValue: Int32Array;
}
export declare class Interval extends DataType<Type.Interval> {
    unit: IntervalUnit;
    constructor(unit: IntervalUnit);
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export interface List<T extends DataType = any> extends DataType<Type.List> {
    TArray: any;
    TValue: Vector<T>;
}
export declare class List<T extends DataType = any> extends DataType<Type.List> {
    children: Field[];
    constructor(children: Field[]);
    toString(): string;
    readonly ArrayType: any;
    readonly valueType: T;
    readonly valueField: Field<T>;
    protected static [Symbol.toStringTag]: string;
}
export interface Struct extends DataType<Type.Struct> {
    TArray: any;
    TValue: View<any>;
}
export declare class Struct extends DataType<Type.Struct> {
    children: Field[];
    constructor(children: Field[]);
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export interface Union<TType extends Type = any> extends DataType<TType> {
    TArray: Int8Array;
    TValue: any;
}
export declare class Union<TType extends Type = any> extends DataType<TType> {
    readonly mode: UnionMode;
    readonly typeIds: ArrowType[];
    readonly children: Field[];
    constructor(mode: UnionMode, typeIds: ArrowType[], children: Field[]);
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export declare class DenseUnion extends Union<Type.DenseUnion> {
    constructor(typeIds: ArrowType[], children: Field[]);
    protected static [Symbol.toStringTag]: string;
}
export declare class SparseUnion extends Union<Type.SparseUnion> {
    constructor(typeIds: ArrowType[], children: Field[]);
    protected static [Symbol.toStringTag]: string;
}
export interface FixedSizeBinary extends DataType<Type.FixedSizeBinary> {
    TArray: Uint8Array;
    TValue: Uint8Array;
}
export declare class FixedSizeBinary extends DataType<Type.FixedSizeBinary> {
    readonly byteWidth: number;
    constructor(byteWidth: number);
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export interface FixedSizeList<T extends DataType = any> extends DataType<Type.FixedSizeList> {
    TArray: any;
    TValue: Vector<T>;
}
export declare class FixedSizeList<T extends DataType = any> extends DataType<Type.FixedSizeList> {
    readonly listSize: number;
    readonly children: Field[];
    constructor(listSize: number, children: Field[]);
    readonly ArrayType: any;
    readonly valueType: T;
    readonly valueField: Field<T>;
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export interface Map_ extends DataType<Type.Map> {
    TArray: Uint8Array;
    TValue: View<any>;
}
export declare class Map_ extends DataType<Type.Map> {
    readonly keysSorted: boolean;
    readonly children: Field[];
    constructor(keysSorted: boolean, children: Field[]);
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export interface Dictionary<T extends DataType = any> extends DataType<Type.Dictionary> {
    TArray: T['TArray'];
    TValue: T['TValue'];
}
export declare class Dictionary<T extends DataType> extends DataType<Type.Dictionary> {
    readonly id: number;
    readonly dictionary: T;
    readonly indices: Int<any>;
    readonly isOrdered: boolean;
    constructor(dictionary: T, indices: Int<any>, id?: Long | number | null, isOrdered?: boolean | null);
    readonly ArrayType: any;
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export interface IterableArrayLike<T = any> extends ArrayLike<T>, Iterable<T> {
}
export interface TypedArrayConstructor<T extends TypedArray = TypedArray> {
    readonly prototype: T;
    readonly BYTES_PER_ELEMENT: number;
    new (length: number): T;
    new (elements: Iterable<number>): T;
    new (arrayOrArrayBuffer: ArrayLike<number> | ArrayBufferLike): T;
    new (buffer: ArrayBufferLike, byteOffset: number, length?: number): T;
    of(...items: number[]): T;
    from(arrayLike: ArrayLike<number> | Iterable<number>, mapfn?: (v: number, k: number) => number, thisArg?: any): T;
}
export declare type FloatArray = Uint16Array | Float32Array | Float64Array;
export declare type IntArray = Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array;
export interface TypedArray extends Iterable<number> {
    [index: number]: number;
    readonly length: number;
    readonly byteLength: number;
    readonly byteOffset: number;
    readonly buffer: ArrayBufferLike;
    readonly BYTES_PER_ELEMENT: number;
    [Symbol.toStringTag]: any;
    [Symbol.iterator](): IterableIterator<number>;
    entries(): IterableIterator<[number, number]>;
    keys(): IterableIterator<number>;
    values(): IterableIterator<number>;
    copyWithin(target: number, start: number, end?: number): this;
    every(callbackfn: (value: number, index: number, array: TypedArray) => boolean, thisArg?: any): boolean;
    fill(value: number, start?: number, end?: number): this;
    filter(callbackfn: (value: number, index: number, array: TypedArray) => any, thisArg?: any): TypedArray;
    find(predicate: (value: number, index: number, obj: TypedArray) => boolean, thisArg?: any): number | undefined;
    findIndex(predicate: (value: number, index: number, obj: TypedArray) => boolean, thisArg?: any): number;
    forEach(callbackfn: (value: number, index: number, array: TypedArray) => void, thisArg?: any): void;
    includes(searchElement: number, fromIndex?: number): boolean;
    indexOf(searchElement: number, fromIndex?: number): number;
    join(separator?: string): string;
    lastIndexOf(searchElement: number, fromIndex?: number): number;
    map(callbackfn: (value: number, index: number, array: TypedArray) => number, thisArg?: any): TypedArray;
    reduce(callbackfn: (previousValue: number, currentValue: number, currentIndex: number, array: TypedArray) => number): number;
    reduce(callbackfn: (previousValue: number, currentValue: number, currentIndex: number, array: TypedArray) => number, initialValue: number): number;
    reduce<U>(callbackfn: (previousValue: U, currentValue: number, currentIndex: number, array: TypedArray) => U, initialValue: U): U;
    reduceRight(callbackfn: (previousValue: number, currentValue: number, currentIndex: number, array: TypedArray) => number): number;
    reduceRight(callbackfn: (previousValue: number, currentValue: number, currentIndex: number, array: TypedArray) => number, initialValue: number): number;
    reduceRight<U>(callbackfn: (previousValue: U, currentValue: number, currentIndex: number, array: TypedArray) => U, initialValue: U): U;
    reverse(): TypedArray;
    set(array: ArrayLike<number>, offset?: number): void;
    slice(start?: number, end?: number): TypedArray;
    some(callbackfn: (value: number, index: number, array: TypedArray) => boolean, thisArg?: any): boolean;
    sort(compareFn?: (a: number, b: number) => number): this;
    subarray(begin: number, end?: number): TypedArray;
    toLocaleString(): string;
    toString(): string;
}

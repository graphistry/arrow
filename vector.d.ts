import { Data } from './data';
import { VisitorNode, TypeVisitor, VectorVisitor } from './visitor';
import { DataType, ListType, FlatType, NestedType, FlatListType } from './type';
import { IterableArrayLike } from './type';
export interface VectorLike {
    length: number;
    nullCount: number;
}
export interface View<T extends DataType> {
    clone(data: Data<T>): this;
    isValid(index: number): boolean;
    get(index: number): T['TValue'] | null;
    set(index: number, value: T['TValue']): void;
    toArray(): IterableArrayLike<T['TValue'] | null>;
    [Symbol.iterator](): IterableIterator<T['TValue'] | null>;
}
export declare class Vector<T extends DataType = any> implements VectorLike, View<T>, VisitorNode {
    static create<T extends DataType>(data: Data<T>): Vector<T>;
    static concat<T extends DataType>(...sources: Vector<T>[]): Vector<T>;
    type: T;
    length: number;
    readonly data: Data<T>;
    readonly view: View<T>;
    constructor(data: Data<T>, view: View<T>);
    readonly nullCount: number;
    readonly nullBitmap: Uint8Array | undefined;
    readonly [Symbol.toStringTag]: string;
    toJSON(): any;
    clone<R extends T>(data: Data<R>, view?: View<R>): this;
    isValid(index: number): boolean;
    get(index: number): T['TValue'] | null;
    set(index: number, value: T['TValue']): void;
    toArray(): IterableArrayLike<T['TValue'] | null>;
    [Symbol.iterator](): IterableIterator<T['TValue'] | null>;
    concat(...others: Vector<T>[]): this;
    slice(begin?: number, end?: number): this;
    acceptTypeVisitor(visitor: TypeVisitor): any;
    acceptVectorVisitor(visitor: VectorVisitor): any;
}
export declare abstract class FlatVector<T extends FlatType> extends Vector<T> {
    readonly values: Uint8Array | T["TArray"];
    lows(): IntVector<Int32>;
    highs(): IntVector<Int32>;
    asInt32(offset?: number, stride?: number): IntVector<Int32>;
}
export declare abstract class ListVectorBase<T extends (ListType | FlatListType)> extends Vector<T> {
    readonly values: T["TArray"] | Data<List<T>>;
    readonly valueOffsets: Int32Array;
    getValueOffset(index: number): number;
    getValueLength(index: number): number;
}
export declare abstract class NestedVector<T extends NestedType> extends Vector<T> {
    readonly view: NestedView<T>;
    readonly childData: Data<any>[];
    getChildAt<R extends DataType = DataType>(index: number): Vector<any>;
}
import { List, Binary, Utf8, Bool } from './type';
import { Null, Int, Float, Decimal, Date_, Time, Timestamp, Interval } from './type';
import { Uint8, Uint16, Uint32, Uint64, Int8, Int16, Int32, Int64, Float16, Float32, Float64 } from './type';
import { Struct, SparseUnion, DenseUnion, FixedSizeBinary, FixedSizeList, Map_, Dictionary } from './type';
import { NestedView } from './vector/nested';
import { FlatView, FixedSizeView } from './vector/flat';
import { DateDayView, DateMillisecondView, IntervalYearMonthView } from './vector/flat';
export declare class NullVector extends Vector<Null> {
    constructor(data: Data<Null>, view?: View<Null>);
}
export declare class BoolVector extends Vector<Bool> {
    static from(data: IterableArrayLike<boolean>): BoolVector;
    readonly values: Uint8Array;
    constructor(data: Data<Bool>, view?: View<Bool>);
}
export declare class IntVector<T extends Int = Int<any>> extends FlatVector<T> {
    static from(data: Int8Array): IntVector<Int8>;
    static from(data: Int16Array): IntVector<Int16>;
    static from(data: Int32Array): IntVector<Int32>;
    static from(data: Uint8Array): IntVector<Uint8>;
    static from(data: Uint16Array): IntVector<Uint16>;
    static from(data: Uint32Array): IntVector<Uint32>;
    static from(data: Int32Array, is64: true): IntVector<Int64>;
    static from(data: Uint32Array, is64: true): IntVector<Uint64>;
    static defaultView<T extends Int>(data: Data<T>): FlatView<T>;
    constructor(data: Data<T>, view?: View<T>);
}
export declare class FloatVector<T extends Float = Float<any>> extends FlatVector<T> {
    static from(data: Uint16Array): FloatVector<Float16>;
    static from(data: Float32Array): FloatVector<Float32>;
    static from(data: Float64Array): FloatVector<Float64>;
    static defaultView<T extends Float>(data: Data<T>): FlatView<any>;
    constructor(data: Data<T>, view?: View<T>);
}
export declare class DateVector extends FlatVector<Date_> {
    static defaultView<T extends Date_>(data: Data<T>): DateDayView | DateMillisecondView;
    constructor(data: Data<Date_>, view?: View<Date_>);
    lows(): IntVector<Int32>;
    highs(): IntVector<Int32>;
    asEpochMilliseconds(): IntVector<Int32>;
}
export declare class DecimalVector extends FlatVector<Decimal> {
    constructor(data: Data<Decimal>, view?: View<Decimal>);
}
export declare class TimeVector extends FlatVector<Time> {
    static defaultView<T extends Time>(data: Data<T>): FlatView<T>;
    constructor(data: Data<Time>, view?: View<Time>);
    lows(): IntVector<Int32>;
    highs(): IntVector<Int32>;
}
export declare class TimestampVector extends FlatVector<Timestamp> {
    constructor(data: Data<Timestamp>, view?: View<Timestamp>);
    asEpochMilliseconds(): IntVector<Int32>;
}
export declare class IntervalVector extends FlatVector<Interval> {
    static defaultView<T extends Interval>(data: Data<T>): IntervalYearMonthView | FixedSizeView<T>;
    constructor(data: Data<Interval>, view?: View<Interval>);
    lows(): IntVector<Int32>;
    highs(): IntVector<Int32>;
}
export declare class BinaryVector extends ListVectorBase<Binary> {
    constructor(data: Data<Binary>, view?: View<Binary>);
    asUtf8(): Utf8Vector;
}
export declare class FixedSizeBinaryVector extends FlatVector<FixedSizeBinary> {
    constructor(data: Data<FixedSizeBinary>, view?: View<FixedSizeBinary>);
}
export declare class Utf8Vector extends ListVectorBase<Utf8> {
    constructor(data: Data<Utf8>, view?: View<Utf8>);
    asBinary(): BinaryVector;
}
export declare class ListVector<T extends DataType = DataType> extends ListVectorBase<List<T>> {
    constructor(data: Data<List<T>>, view?: View<List<T>>);
}
export declare class FixedSizeListVector extends Vector<FixedSizeList> {
    constructor(data: Data<FixedSizeList>, view?: View<FixedSizeList>);
}
export declare class MapVector extends NestedVector<Map_> {
    constructor(data: Data<Map_>, view?: View<Map_>);
    asStruct(): StructVector;
}
export declare class StructVector extends NestedVector<Struct> {
    constructor(data: Data<Struct>, view?: View<Struct>);
    asMap(keysSorted?: boolean): MapVector;
}
export declare class UnionVector<T extends (SparseUnion | DenseUnion) = any> extends NestedVector<T> {
    constructor(data: Data<T>, view?: View<T>);
}
export declare class DictionaryVector<T extends DataType = DataType> extends Vector<Dictionary<T>> {
    readonly indicies: Vector<Int>;
    readonly dictionary: Vector<T>;
    constructor(data: Data<Dictionary<T>>, view?: View<Dictionary<T>>);
    getKey(index: number): any;
    getValue(key: number): T["TValue"] | null;
}
export declare const createVector: <T extends DataType<any>>(data: Data<T>) => Vector<T>;

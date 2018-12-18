import { DataType } from './type';
import { Vector } from './vector';
import { Type, VectorType as BufferType } from './enum';
import { Dictionary, Null, Int, Float, Binary, Bool, Utf8, Decimal, Date_, Time, Timestamp, Interval, List, Struct, Union, FixedSizeBinary, FixedSizeList, Map_ } from './type';
export declare type kUnknownNullCount = -1;
export declare const kUnknownNullCount = -1;
export declare type NullBuffer = Uint8Array | null | undefined;
export declare type ValueOffsetsBuffer = Int32Array | ArrayLike<number> | Iterable<number>;
export declare type DataBuffer<T extends DataType> = T['TArray'] | ArrayLike<number> | Iterable<number>;
export interface Buffers<T extends DataType> {
    [BufferType.OFFSET]?: Int32Array;
    [BufferType.DATA]?: T['TArray'];
    [BufferType.VALIDITY]?: Uint8Array;
    [BufferType.TYPE]?: T['TArray'];
}
export declare class Data<T extends DataType = DataType> {
    protected _type: T;
    protected _length: number;
    protected _offset: number;
    protected _childData: Data[];
    protected _buffers: Buffers<T>;
    protected _nullCount: number | kUnknownNullCount;
    readonly type: T;
    readonly length: number;
    readonly offset: number;
    readonly childData: Data<DataType<Type, any>>[];
    readonly TType: Type;
    readonly TArray: any;
    readonly TValue: any;
    readonly ArrayType: any;
    readonly values: NonNullable<T["TArray"]>;
    readonly typeIds: NonNullable<T["TArray"]>;
    readonly nullBitmap: Uint8Array;
    readonly valueOffsets: Int32Array;
    readonly nullCount: number;
    constructor(type: T, offset: number, length: number, nullCount?: number, buffers?: Buffers<T>, childData?: (Data | Vector)[]);
    clone<R extends DataType>(type: R, offset?: number, length?: number, nullCount?: number, buffers?: Buffers<R>, childData?: (Data | Vector)[]): Data<R>;
    slice(offset: number, length: number): Data<T>;
    protected sliceBuffers(offset: number, length: number): Buffers<T>;
    protected sliceChildren(offset: number, length: number): Data[];
    protected sliceData(data: T['TArray'] & ArrayBufferView, offset: number, length: number): any;
    protected sliceOffsets(valueOffsets: Int32Array, offset: number, length: number): Int32Array;
    /** @nocollapse */
    static Null<T extends Null>(type: T, offset: number, length: number, nullCount: number, nullBitmap: NullBuffer): Data<T>;
    /** @nocollapse */
    static Int<T extends Int>(type: T, offset: number, length: number, nullCount: number, nullBitmap: NullBuffer, data: DataBuffer<T>): Data<T>;
    /** @nocollapse */
    static Dictionary<T extends Dictionary>(type: T, offset: number, length: number, nullCount: number, nullBitmap: NullBuffer, data: DataBuffer<T>): Data<T>;
    /** @nocollapse */
    static Float<T extends Float>(type: T, offset: number, length: number, nullCount: number, nullBitmap: NullBuffer, data: DataBuffer<T>): Data<T>;
    /** @nocollapse */
    static Bool<T extends Bool>(type: T, offset: number, length: number, nullCount: number, nullBitmap: NullBuffer, data: DataBuffer<T>): Data<T>;
    /** @nocollapse */
    static Decimal<T extends Decimal>(type: T, offset: number, length: number, nullCount: number, nullBitmap: NullBuffer, data: DataBuffer<T>): Data<T>;
    /** @nocollapse */
    static Date<T extends Date_>(type: T, offset: number, length: number, nullCount: number, nullBitmap: NullBuffer, data: DataBuffer<T>): Data<T>;
    /** @nocollapse */
    static Time<T extends Time>(type: T, offset: number, length: number, nullCount: number, nullBitmap: NullBuffer, data: DataBuffer<T>): Data<T>;
    /** @nocollapse */
    static Timestamp<T extends Timestamp>(type: T, offset: number, length: number, nullCount: number, nullBitmap: NullBuffer, data: DataBuffer<T>): Data<T>;
    /** @nocollapse */
    static Interval<T extends Interval>(type: T, offset: number, length: number, nullCount: number, nullBitmap: NullBuffer, data: DataBuffer<T>): Data<T>;
    /** @nocollapse */
    static FixedSizeBinary<T extends FixedSizeBinary>(type: T, offset: number, length: number, nullCount: number, nullBitmap: NullBuffer, data: DataBuffer<T>): Data<T>;
    /** @nocollapse */
    static Binary<T extends Binary>(type: T, offset: number, length: number, nullCount: number, nullBitmap: NullBuffer, valueOffsets: ValueOffsetsBuffer, data: Uint8Array): Data<T>;
    /** @nocollapse */
    static Utf8<T extends Utf8>(type: T, offset: number, length: number, nullCount: number, nullBitmap: NullBuffer, valueOffsets: ValueOffsetsBuffer, data: Uint8Array): Data<T>;
    /** @nocollapse */
    static List<T extends List>(type: T, offset: number, length: number, nullCount: number, nullBitmap: NullBuffer, valueOffsets: ValueOffsetsBuffer, childData: (Data | Vector)[]): Data<T>;
    /** @nocollapse */
    static FixedSizeList<T extends FixedSizeList>(type: T, offset: number, length: number, nullCount: number, nullBitmap: NullBuffer, childData: (Data | Vector)[]): Data<T>;
    /** @nocollapse */
    static Struct<T extends Struct>(type: T, offset: number, length: number, nullCount: number, nullBitmap: NullBuffer, childData: (Data | Vector)[]): Data<T>;
    /** @nocollapse */
    static Map<T extends Map_>(type: T, offset: number, length: number, nullCount: number, nullBitmap: NullBuffer, childData: (Data | Vector)[]): Data<T>;
    /** @nocollapse */
    static Union<T extends Union>(type: T, offset: number, length: number, nullCount: number, nullBitmap: NullBuffer, typeIds: Uint8Array, valueOffsetsOrChildData: ValueOffsetsBuffer | (Data | Vector)[], childData?: (Data | Vector)[]): Data<T>;
}

import { Field } from './schema';
import { Vector } from './vector';
import { flatbuffers } from 'flatbuffers';
import { Vector as VType } from './interfaces';
import { ArrayBufferViewConstructor } from './interfaces';
import Long = flatbuffers.Long;
import { Type, ArrowType, Precision, UnionMode, DateUnit, TimeUnit, IntervalUnit } from './enum';
export declare type TimeBitWidth = 32 | 64;
export declare type IntBitWidth = 8 | 16 | 32 | 64;
export declare type IsSigned = {
    'true': true;
    'false': false;
};
export declare type RowLike<T extends {
    [key: string]: DataType;
}> = {
    readonly length: number;
} & (Iterable<T[keyof T]['TValue']>) & {
    [P in keyof T]: T[P]['TValue'];
} & {
    get<K extends keyof T>(key: K): T[K]['TValue'];
};
export interface DataType<TType extends Type = Type> {
    readonly TArray: any;
    readonly TValue: any;
    readonly ArrayType: any;
}
export declare class DataType<TType extends Type = Type, TChildren extends {
    [key: string]: DataType;
} = any> {
    protected _TType: TType;
    protected _children?: Field<TChildren[keyof TChildren]>[] | undefined;
    [Symbol.toStringTag]: string;
    /** @nocollapse */ static isNull(x: any): x is Null;
    /** @nocollapse */ static isInt(x: any): x is Int;
    /** @nocollapse */ static isFloat(x: any): x is Float;
    /** @nocollapse */ static isBinary(x: any): x is Binary;
    /** @nocollapse */ static isUtf8(x: any): x is Utf8;
    /** @nocollapse */ static isBool(x: any): x is Bool;
    /** @nocollapse */ static isDecimal(x: any): x is Decimal;
    /** @nocollapse */ static isDate(x: any): x is Date_;
    /** @nocollapse */ static isTime(x: any): x is Time;
    /** @nocollapse */ static isTimestamp(x: any): x is Timestamp;
    /** @nocollapse */ static isInterval(x: any): x is Interval;
    /** @nocollapse */ static isList(x: any): x is List;
    /** @nocollapse */ static isStruct(x: any): x is Struct;
    /** @nocollapse */ static isUnion(x: any): x is Union;
    /** @nocollapse */ static isFixedSizeBinary(x: any): x is FixedSizeBinary;
    /** @nocollapse */ static isFixedSizeList(x: any): x is FixedSizeList;
    /** @nocollapse */ static isMap(x: any): x is Map_;
    /** @nocollapse */ static isDictionary(x: any): x is Dictionary;
    readonly TType: TType;
    readonly children: Field<TChildren[keyof TChildren]>[] | undefined;
    constructor(_TType?: TType, _children?: Field<TChildren[keyof TChildren]>[] | undefined);
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
declare type Ints = Type.Int | Type.Int8 | Type.Int16 | Type.Int32 | Type.Int64 | Type.Uint8 | Type.Uint16 | Type.Uint32 | Type.Uint64;
declare type IType = {
    [Type.Int]: {
        bitWidth: IntBitWidth;
        isSigned: true | false;
        TArray: IntArray;
        TValue: number | Int32Array | Uint32Array;
    };
    [Type.Int8]: {
        bitWidth: 8;
        isSigned: true;
        TArray: Int8Array;
        TValue: number;
    };
    [Type.Int16]: {
        bitWidth: 16;
        isSigned: true;
        TArray: Int16Array;
        TValue: number;
    };
    [Type.Int32]: {
        bitWidth: 32;
        isSigned: true;
        TArray: Int32Array;
        TValue: number;
    };
    [Type.Int64]: {
        bitWidth: 64;
        isSigned: true;
        TArray: Int32Array;
        TValue: Int32Array;
    };
    [Type.Uint8]: {
        bitWidth: 8;
        isSigned: false;
        TArray: Uint8Array;
        TValue: number;
    };
    [Type.Uint16]: {
        bitWidth: 16;
        isSigned: false;
        TArray: Uint16Array;
        TValue: number;
    };
    [Type.Uint32]: {
        bitWidth: 32;
        isSigned: false;
        TArray: Uint32Array;
        TValue: number;
    };
    [Type.Uint64]: {
        bitWidth: 64;
        isSigned: false;
        TArray: Uint32Array;
        TValue: Uint32Array;
    };
};
export interface Int<T extends Ints = Ints> extends DataType<T> {
    TArray: IType[T]['TArray'];
    TValue: IType[T]['TValue'];
}
export declare class Int<T extends Ints = Ints> extends DataType<T> {
    protected _isSigned: IType[T]['isSigned'];
    protected _bitWidth: IType[T]['bitWidth'];
    constructor(_isSigned: IType[T]['isSigned'], _bitWidth: IType[T]['bitWidth']);
    readonly isSigned: IType[T]["isSigned"];
    readonly bitWidth: IType[T]["bitWidth"];
    readonly ArrayType: ArrayBufferViewConstructor<IType[T]['TArray']>;
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export declare class Int8 extends Int<Type.Int8> {
    constructor();
}
export declare class Int16 extends Int<Type.Int16> {
    constructor();
}
export declare class Int32 extends Int<Type.Int32> {
    constructor();
}
export declare class Int64 extends Int<Type.Int64> {
    constructor();
}
export declare class Uint8 extends Int<Type.Uint8> {
    constructor();
}
export declare class Uint16 extends Int<Type.Uint16> {
    constructor();
}
export declare class Uint32 extends Int<Type.Uint32> {
    constructor();
}
export declare class Uint64 extends Int<Type.Uint64> {
    constructor();
}
declare type Floats = Type.Float | Type.Float16 | Type.Float32 | Type.Float64;
declare type FType = {
    [Type.Float]: {
        precision: Precision;
        TArray: FloatArray;
        TValue: number;
    };
    [Type.Float16]: {
        precision: Precision.HALF;
        TArray: Uint16Array;
        TValue: number;
    };
    [Type.Float32]: {
        precision: Precision.SINGLE;
        TArray: Float32Array;
        TValue: number;
    };
    [Type.Float64]: {
        precision: Precision.DOUBLE;
        TArray: Float32Array;
        TValue: number;
    };
};
export interface Float<T extends Floats = Floats> extends DataType<T> {
    TArray: FType[T]['TArray'];
    TValue: number;
}
export declare class Float<T extends Floats = Floats> extends DataType<T> {
    protected _precision: Precision;
    constructor(_precision: Precision);
    readonly precision: Precision;
    readonly ArrayType: ArrayBufferViewConstructor<FType[T]['TArray']>;
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export declare class Float16 extends Float<Type.Float16> {
    constructor();
}
export declare class Float32 extends Float<Type.Float32> {
    constructor();
}
export declare class Float64 extends Float<Type.Float64> {
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
    ArrayType: typeof Uint8Array;
}
export declare class Utf8 extends DataType<Type.Utf8> {
    constructor();
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export interface Bool extends DataType<Type.Bool> {
    TArray: Uint8Array;
    TValue: boolean;
    ArrayType: typeof Uint8Array;
}
export declare class Bool extends DataType<Type.Bool> {
    constructor();
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export interface Decimal extends DataType<Type.Decimal> {
    TArray: Uint32Array;
    TValue: Uint32Array;
    ArrayType: typeof Uint32Array;
}
export declare class Decimal extends DataType<Type.Decimal> {
    protected _scale: number;
    protected _precision: number;
    constructor(_scale: number, _precision: number);
    readonly scale: number;
    readonly precision: number;
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export declare type Dates = Type.Date | Type.DateDay | Type.DateMillisecond;
export interface Date_<T extends Dates = Dates> extends DataType<T> {
    TArray: Int32Array;
    TValue: Date;
    ArrayType: typeof Int32Array;
}
export declare class Date_<T extends Dates = Dates> extends DataType<T> {
    protected _unit: DateUnit;
    constructor(_unit: DateUnit);
    readonly unit: DateUnit;
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export declare class DateDay extends Date_<Type.DateDay> {
    constructor();
}
export declare class DateMillisecond extends Date_<Type.DateMillisecond> {
    constructor();
}
declare type Times = Type.Time | Type.TimeSecond | Type.TimeMillisecond | Type.TimeMicrosecond | Type.TimeNanosecond;
declare type TimesType = {
    [Type.Time]: {
        unit: TimeUnit;
        TValue: number | Uint32Array;
    };
    [Type.TimeSecond]: {
        unit: TimeUnit.SECOND;
        TValue: number;
    };
    [Type.TimeMillisecond]: {
        unit: TimeUnit.MILLISECOND;
        TValue: number;
    };
    [Type.TimeMicrosecond]: {
        unit: TimeUnit.MICROSECOND;
        TValue: Uint32Array;
    };
    [Type.TimeNanosecond]: {
        unit: TimeUnit.NANOSECOND;
        TValue: Uint32Array;
    };
};
export interface Time<T extends Times = Times> extends DataType<T> {
    TArray: Uint32Array;
    TValue: TimesType[T]['TValue'];
    ArrayType: typeof Uint32Array;
}
export declare class Time<T extends Times = Times> extends DataType<T> {
    protected _unit: TimesType[T]['unit'];
    protected _bitWidth: TimeBitWidth;
    constructor(_unit: TimesType[T]['unit'], _bitWidth: TimeBitWidth);
    readonly unit: TimesType[T]["unit"];
    readonly bitWidth: TimeBitWidth;
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export declare class TimeSecond extends Time<Type.TimeSecond> {
    constructor(bitWidth: TimeBitWidth);
}
export declare class TimeMillisecond extends Time<Type.TimeMillisecond> {
    constructor(bitWidth: TimeBitWidth);
}
export declare class TimeMicrosecond extends Time<Type.TimeMicrosecond> {
    constructor(bitWidth: TimeBitWidth);
}
export declare class TimeNanosecond extends Time<Type.TimeNanosecond> {
    constructor(bitWidth: TimeBitWidth);
}
declare type Timestamps = Type.Timestamp | Type.TimestampSecond | Type.TimestampMillisecond | Type.TimestampMicrosecond | Type.TimestampNanosecond;
export interface Timestamp<T extends Timestamps = Timestamps> extends DataType<T> {
    TArray: Int32Array;
    TValue: number;
    ArrayType: typeof Int32Array;
}
export declare class Timestamp<T extends Timestamps = Timestamps> extends DataType<T> {
    protected _unit: TimeUnit;
    protected _timezone?: string | null | undefined;
    constructor(_unit: TimeUnit, _timezone?: string | null | undefined);
    readonly unit: TimeUnit;
    readonly timezone: string | null | undefined;
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export declare class TimestampSecond extends Timestamp<Type.TimestampSecond> {
    constructor(timezone?: string | null);
}
export declare class TimestampMillisecond extends Timestamp<Type.TimestampMillisecond> {
    constructor(timezone?: string | null);
}
export declare class TimestampMicrosecond extends Timestamp<Type.TimestampMicrosecond> {
    constructor(timezone?: string | null);
}
export declare class TimestampNanosecond extends Timestamp<Type.TimestampNanosecond> {
    constructor(timezone?: string | null);
}
declare type Intervals = Type.Interval | Type.IntervalDayTime | Type.IntervalYearMonth;
export interface Interval<T extends Intervals = Intervals> extends DataType<T> {
    TArray: Int32Array;
    TValue: Int32Array;
    ArrayType: typeof Int32Array;
}
export declare class Interval<T extends Intervals = Intervals> extends DataType<T> {
    protected _unit: IntervalUnit;
    constructor(_unit: IntervalUnit);
    readonly unit: IntervalUnit;
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export declare class IntervalDayTime extends Interval<Type.IntervalDayTime> {
    constructor();
}
export declare class IntervalYearMonth extends Interval<Type.IntervalYearMonth> {
    constructor();
}
export interface List<T extends DataType = any> extends DataType<Type.List> {
    TArray: IterableArrayLike<T>;
    TValue: VType<T>;
}
export declare class List<T extends DataType = any> extends DataType<Type.List, {
    [0]: T;
}> {
    protected _children: Field<T>[];
    constructor(_children: Field<T>[]);
    toString(): string;
    readonly children: Field<T>[];
    readonly valueType: T;
    readonly valueField: Field<T>;
    readonly ArrayType: T['ArrayType'];
    protected static [Symbol.toStringTag]: string;
}
export interface Struct<T extends {
    [key: string]: DataType;
} = any> extends DataType<Type.Struct> {
    TArray: IterableArrayLike<RowLike<T>>;
    TValue: RowLike<T>;
    dataTypes: T;
}
export declare class Struct<T extends {
    [key: string]: DataType;
} = any> extends DataType<Type.Struct, T> {
    protected _children: Field<T[keyof T]>[];
    constructor(_children: Field<T[keyof T]>[]);
    readonly children: Field<T[keyof T]>[];
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
declare type Unions = Type.Union | Type.DenseUnion | Type.SparseUnion;
export interface Union<T extends Unions = Unions> extends DataType<T> {
    TArray: Int8Array;
    TValue: any[];
}
export declare class Union<T extends Unions = Unions> extends DataType<T> {
    protected _mode: UnionMode;
    protected _typeIds: ArrowType[];
    protected _children: Field<any>[];
    protected _typeIdToChildIndex: Record<Type, number>;
    constructor(_mode: UnionMode, _typeIds: ArrowType[], _children: Field<any>[]);
    readonly mode: UnionMode;
    readonly typeIds: ArrowType[];
    readonly children: Field<any>[];
    readonly typeIdToChildIndex: Record<Type, number>;
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export declare class DenseUnion extends Union<Type.DenseUnion> {
    constructor(typeIds: ArrowType[], children: Field[]);
}
export declare class SparseUnion extends Union<Type.SparseUnion> {
    constructor(typeIds: ArrowType[], children: Field[]);
}
export interface FixedSizeBinary extends DataType<Type.FixedSizeBinary> {
    TArray: Uint8Array;
    TValue: Uint8Array;
    ArrayType: typeof Uint8Array;
}
export declare class FixedSizeBinary extends DataType<Type.FixedSizeBinary> {
    protected _byteWidth: number;
    constructor(_byteWidth: number);
    readonly byteWidth: number;
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export interface FixedSizeList<T extends DataType = any> extends DataType<Type.FixedSizeList> {
    TArray: IterableArrayLike<T['TArray']>;
    TValue: VType<T>;
}
export declare class FixedSizeList<T extends DataType = any> extends DataType<Type.FixedSizeList, {
    [0]: T;
}> {
    protected _listSize: number;
    protected _children: Field<T>[];
    constructor(_listSize: number, _children: Field<T>[]);
    readonly listSize: number;
    readonly children: Field<T>[];
    readonly valueType: T;
    readonly valueField: Field<T>;
    readonly ArrayType: T['ArrayType'];
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export interface Map_<T extends {
    [key: string]: DataType;
} = any> extends DataType<Type.Map> {
    TArray: Uint8Array;
    TValue: RowLike<T>;
    dataTypes: T;
}
export declare class Map_<T extends {
    [key: string]: DataType;
} = any> extends DataType<Type.Map, T> {
    protected _children: Field<T[keyof T]>[];
    protected _keysSorted: boolean;
    constructor(_children: Field<T[keyof T]>[], _keysSorted?: boolean);
    readonly children: Field<T[keyof T]>[];
    readonly keysSorted: boolean;
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export declare type TKeys = Int8 | Int16 | Int32 | Uint8 | Uint16 | Uint32;
export interface Dictionary<T extends DataType = any, TKey extends TKeys = TKeys> extends DataType<Type.Dictionary> {
    TArray: TKey['TArray'];
    TValue: T['TValue'];
}
export declare class Dictionary<T extends DataType = any, TKey extends TKeys = TKeys> extends DataType<Type.Dictionary> {
    protected _id: number;
    protected _indices: TKey;
    protected _dictionary: T;
    protected _isOrdered: boolean;
    dictionaryVector: Vector<T>;
    constructor(dictionary: T, indices: TKey, id?: Long | number | null, isOrdered?: boolean | null, dictionaryVector?: Vector<T>);
    readonly id: number;
    readonly indices: TKey;
    readonly dictionary: T;
    readonly isOrdered: boolean;
    children: T['children'];
    readonly valueType: T;
    readonly ArrayType: T['ArrayType'];
    toString(): string;
    protected static [Symbol.toStringTag]: string;
}
export interface IterableArrayLike<T = any> extends ArrayLike<T>, Iterable<T> {
}
export declare type FloatArray = Uint16Array | Float32Array | Float64Array;
export declare type IntArray = Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array;
export {};

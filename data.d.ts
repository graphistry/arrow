import { VectorLike, Vector } from './vector';
import { TypedArray, TypedArrayConstructor, Dictionary } from './type';
import { Int, Bool, FlatListType, List, FixedSizeList, Struct, Map_ } from './type';
import { DataType, FlatType, ListType, NestedType, DenseUnion, SparseUnion } from './type';
export declare function toTypedArray<T extends TypedArray>(ArrayType: TypedArrayConstructor<T>, values?: T | ArrayLike<number> | Iterable<number> | null): T;
export declare type Data<T extends DataType> = DataTypes<T>[T['TType']] & BaseData<T>;
export interface DataTypes<T extends DataType> {
    0: BaseData<T>;
    1: FlatData<T>;
    2: FlatData<T>;
    3: FlatData<T>;
    4: FlatListData<T>;
    5: FlatListData<T>;
    6: BoolData;
    7: FlatData<T>;
    8: FlatData<T>;
    9: FlatData<T>;
    10: FlatData<T>;
    11: FlatData<T>;
    12: ListData<List<T>>;
    13: NestedData<Struct>;
    14: UnionData;
    15: FlatData<T>;
    16: ListData<FixedSizeList<T>>;
    17: NestedData<Map_>;
    DenseUnion: DenseUnionData;
    SparseUnion: SparseUnionData;
    Dictionary: DictionaryData<any>;
}
export declare type kUnknownNullCount = -1;
export declare const kUnknownNullCount = -1;
export declare class BaseData<T extends DataType = DataType> implements VectorLike {
    protected _type: T;
    protected _length: number;
    protected _offset: number;
    protected _childData: Data<any>[];
    protected _nullCount: number | kUnknownNullCount;
    protected 0?: Int32Array;
    protected 1?: T['TArray'];
    protected 2?: Uint8Array;
    protected 3?: Int8Array;
    constructor(type: T, length: number, offset?: number, nullCount?: number);
    readonly type: T;
    readonly length: number;
    readonly offset: number;
    readonly typeId: any;
    readonly childData: any[];
    readonly nullBitmap: Uint8Array | undefined;
    readonly nullCount: number;
    clone(length?: number, offset?: number, nullCount?: number): this;
    slice(offset: number, length: number): this;
    protected sliceInternal(clone: this, offset: number, length: number): this;
    protected sliceData(data: T['TArray'] & TypedArray, offset: number, length: number): TypedArray;
    protected sliceOffsets(valueOffsets: Int32Array, offset: number, length: number): Int32Array;
}
export declare class FlatData<T extends FlatType> extends BaseData<T> {
    1: T['TArray'];
    2: Uint8Array;
    readonly values: T["TArray"];
    constructor(type: T, length: number, nullBitmap: Uint8Array | null | undefined, data: Iterable<number>, offset?: number, nullCount?: number);
    readonly ArrayType: T['ArrayType'];
    clone(length?: number, offset?: number, nullCount?: number): this;
}
export declare class BoolData extends FlatData<Bool> {
    protected sliceData(data: Uint8Array): Uint8Array;
    clone(length?: number, offset?: number, nullCount?: number): this;
}
export declare class FlatListData<T extends FlatListType> extends FlatData<T> {
    0: Int32Array;
    1: T['TArray'];
    2: Uint8Array;
    readonly values: T["TArray"];
    readonly valueOffsets: Int32Array;
    constructor(type: T, length: number, nullBitmap: Uint8Array | null | undefined, valueOffsets: Iterable<number>, data: T['TArray'], offset?: number, nullCount?: number);
    clone(length?: number, offset?: number, nullCount?: number): this;
}
export declare class DictionaryData<T extends DataType> extends BaseData<Dictionary<T>> {
    protected _dictionary: Vector<T>;
    protected _indicies: Data<Int<any>>;
    readonly indicies: Data<Int<any, Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array>>;
    readonly dictionary: Vector<T>;
    constructor(type: Dictionary<T>, dictionary: Vector<T>, indicies: Data<Int<any>>);
    readonly length: number;
    readonly nullCount: number;
    clone(length?: number, offset?: number): this;
    protected sliceInternal(clone: this, _offset: number, _length: number): this;
}
export declare class NestedData<T extends NestedType = NestedType> extends BaseData<T> {
    2: Uint8Array;
    constructor(type: T, length: number, nullBitmap: Uint8Array | null | undefined, childData: Data<any>[], offset?: number, nullCount?: number);
    clone(length?: number, offset?: number, nullCount?: number): this;
    protected sliceInternal(clone: this, offset: number, length: number): this;
}
export declare class ListData<T extends ListType> extends NestedData<T> {
    0: Int32Array;
    2: Uint8Array;
    protected _valuesData: Data<T>;
    readonly values: Data<T>;
    readonly valueOffsets: Int32Array;
    constructor(type: T, length: number, nullBitmap: Uint8Array | null | undefined, valueOffsets: Iterable<number>, valueChildData: Data<T>, offset?: number, nullCount?: number);
    clone(length?: number, offset?: number, nullCount?: number): this;
}
export declare class UnionData<T extends (DenseUnion | SparseUnion) = any> extends NestedData<T> {
    3: T['TArray'];
    readonly typeIds: T["TArray"];
    constructor(type: T, length: number, nullBitmap: Uint8Array | null | undefined, typeIds: Iterable<number>, childData: Data<any>[], offset?: number, nullCount?: number);
    clone(length?: number, offset?: number, nullCount?: number): this;
}
export declare class SparseUnionData extends UnionData<SparseUnion> {
    constructor(type: SparseUnion, length: number, nullBitmap: Uint8Array | null | undefined, typeIds: Iterable<number>, childData: Data<any>[], offset?: number, nullCount?: number);
    clone(length?: number, offset?: number, nullCount?: number): this;
}
export declare class DenseUnionData extends UnionData<DenseUnion> {
    0: Int32Array;
    readonly valueOffsets: Int32Array;
    constructor(type: DenseUnion, length: number, nullBitmap: Uint8Array | null | undefined, typeIds: Iterable<number>, valueOffsets: Iterable<number>, childData: Data<any>[], offset?: number, nullCount?: number);
    clone(length?: number, offset?: number, nullCount?: number): this;
}
export declare class ChunkedData<T extends DataType> extends BaseData<T> {
    protected _childVectors: Vector<T>[];
    protected _childOffsets: Uint32Array;
    readonly childVectors: Vector<T>[];
    readonly childOffsets: Uint32Array;
    readonly childData: any[];
    constructor(type: T, length: number, childVectors: Vector<T>[], offset?: number, nullCount?: number, childOffsets?: Uint32Array);
    readonly nullCount: number;
    clone(length?: number, offset?: number, nullCount?: number): this;
    protected sliceInternal(clone: this, offset: number, length: number): this;
    static computeOffsets<T extends DataType>(childVectors: Vector<T>[]): Uint32Array;
}
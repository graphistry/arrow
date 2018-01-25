import { Data } from '../data';
import { View, Vector } from '../vector';
import { IterableArrayLike } from '../type';
import { DataType, NestedType, DenseUnion, SparseUnion, Struct, Map_ } from '../type';
export declare abstract class NestedView<T extends NestedType> implements View<T> {
    length: number;
    numChildren: number;
    childData: Data<any>[];
    protected _children: Vector<any>[];
    constructor(data: Data<T>, children?: Vector<any>[]);
    clone(data: Data<T>): this;
    isValid(): boolean;
    toArray(): IterableArrayLike<T['TValue']>;
    toJSON(): any;
    toString(): string;
    get(index: number): T['TValue'];
    set(index: number, value: T['TValue']): void;
    protected abstract getNested(self: NestedView<T>, index: number): T['TValue'];
    protected abstract setNested(self: NestedView<T>, index: number, value: T['TValue']): void;
    getChildAt<R extends DataType = DataType>(index: number): Vector<R> | null;
    [Symbol.iterator](): IterableIterator<T['TValue']>;
}
export declare class UnionView<T extends (DenseUnion | SparseUnion) = SparseUnion> extends NestedView<T> {
    typeIds: Int8Array;
    valueOffsets?: Int32Array;
    constructor(data: Data<T>, children?: Vector<any>[]);
    protected getNested(self: UnionView<T>, index: number): T['TValue'];
    protected setNested(self: UnionView<T>, index: number, value: T['TValue']): void;
    protected getChildValue(self: NestedView<T>, index: number, typeIds: Int8Array, _valueOffsets?: any): any | null;
    protected setChildValue(self: NestedView<T>, index: number, value: T['TValue'], typeIds: Int8Array, _valueOffsets?: any): any | null;
    [Symbol.iterator](): IterableIterator<T['TValue']>;
}
export declare class DenseUnionView extends UnionView<DenseUnion> {
    valueOffsets: Int32Array;
    constructor(data: Data<DenseUnion>, children?: Vector<any>[]);
    protected getNested(self: DenseUnionView, index: number): any | null;
    protected getChildValue(self: NestedView<DenseUnion>, index: number, typeIds: Int8Array, valueOffsets: any): any | null;
    protected setChildValue(self: NestedView<DenseUnion>, index: number, value: any, typeIds: Int8Array, valueOffsets?: any): any | null;
}
export declare class StructView extends NestedView<Struct> {
    protected getNested(self: StructView, index: number): RowView;
    protected setNested(self: StructView, index: number, value: any): void;
}
export declare class MapView extends NestedView<Map_> {
    typeIds: {
        [k: string]: number;
    };
    constructor(data: Data<Map_>, children?: Vector<any>[]);
    protected getNested(self: MapView, index: number): MapRowView;
    protected setNested(self: MapView, index: number, value: {
        [k: string]: any;
    }): void;
}
export declare class RowView extends UnionView<SparseUnion> {
    protected rowIndex: number;
    constructor(data: Data<SparseUnion> & NestedView<any>, children?: Vector<any>[], rowIndex?: number);
    clone(data: Data<SparseUnion> & NestedView<any>): this;
    protected getChildValue(self: RowView, index: number, _typeIds: any, _valueOffsets?: any): any | null;
    protected setChildValue(self: RowView, index: number, value: any, _typeIds: any, _valueOffsets?: any): any | null;
}
export declare class MapRowView extends RowView {
    typeIds: any;
    toJSON(): {
        [k: string]: any;
    };
    protected getChildValue(self: MapRowView, key: any, typeIds: any, _valueOffsets: any): any | null;
    protected setChildValue(self: MapRowView, key: any, value: any, typeIds: any, _valueOffsets?: any): any | null;
}

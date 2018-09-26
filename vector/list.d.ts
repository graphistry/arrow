import { Data } from '../data';
import { View, Vector } from '../vector';
import { List, Binary, Utf8, FixedSizeList, FlatListType } from '../type';
import { ListType, SingleNestedType, DataType, IterableArrayLike } from '../type';
export declare const encodeUtf8: (input?: string | undefined) => Uint8Array;
export declare const decodeUtf8: (input?: SharedArrayBuffer | ArrayBuffer | ArrayBufferView | undefined) => string;
export declare abstract class ListViewBase<T extends (FlatListType | SingleNestedType)> implements View<T> {
    length: number;
    values: T['TArray'];
    valueOffsets?: Int32Array;
    constructor(data: Data<T>);
    clone(data: Data<T>): this;
    isValid(): boolean;
    toArray(): IterableArrayLike<T['TValue']>;
    get(index: number): T['TValue'];
    set(index: number, value: T['TValue']): void;
    [Symbol.iterator](): IterableIterator<T['TValue']>;
    indexOf(search: T['TValue']): number;
    protected abstract getList(values: T['TArray'], index: number, valueOffsets?: Int32Array): T['TValue'];
    protected abstract setList(values: T['TArray'], index: number, value: T['TValue'], valueOffsets?: Int32Array): void;
}
export declare abstract class VariableListViewBase<T extends (ListType | FlatListType)> extends ListViewBase<T> {
    constructor(data: Data<T>);
}
export declare class ListView<T extends DataType> extends VariableListViewBase<List<T>> {
    values: Vector<T>;
    constructor(data: Data<T>);
    getChildAt<R extends T = T>(index: number): Vector<R> | null;
    protected getList(values: Vector<T>, index: number, valueOffsets: Int32Array): Vector<T>;
    protected setList(values: Vector<T>, index: number, value: Vector<T>, valueOffsets: Int32Array): void;
}
export declare class FixedSizeListView<T extends DataType> extends ListViewBase<FixedSizeList<T>> {
    size: number;
    values: Vector<T>;
    constructor(data: Data<FixedSizeList<T>>);
    getChildAt<R extends T = T>(index: number): Vector<R> | null;
    protected getList(values: Vector<T>, index: number): Vector<T>;
    protected setList(values: Vector<T>, index: number, value: Vector<T>): void;
}
export declare class BinaryView extends VariableListViewBase<Binary> {
    protected getList(values: Uint8Array, index: number, valueOffsets: Int32Array): Uint8Array;
    protected setList(values: Uint8Array, index: number, value: Uint8Array, valueOffsets: Int32Array): void;
}
export declare class Utf8View extends VariableListViewBase<Utf8> {
    protected getList(values: Uint8Array, index: number, valueOffsets: Int32Array): string;
    protected setList(values: Uint8Array, index: number, value: string, valueOffsets: Int32Array): void;
}

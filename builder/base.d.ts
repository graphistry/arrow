import { Data } from '../data';
import { DataType, Utf8, Binary, Decimal, FixedSizeBinary, List, FixedSizeList, Map_, Struct, Float, Int, Date_, Interval, Time, Timestamp, Union, DenseUnion, SparseUnion } from '../type';
export interface DataBuilderOptions<T extends DataType = any, TNull = any> {
    type: T;
    nullValues?: TNull[];
}
export declare class Builder<T extends DataType = any, TNull = any> {
    length: number;
    nullCount: number;
    readonly offset = 0;
    readonly stride: number;
    readonly children: Builder[];
    readonly nullValues: ReadonlyArray<TNull>;
    valueOffsets: Int32Array;
    values: T['TArray'];
    nullBitmap: Uint8Array;
    typeIds: Int8Array;
    constructor(options: DataBuilderOptions<T, TNull>);
    protected _type: T;
    readonly type: T;
    protected _bytesUsed: number;
    readonly bytesUsed: number;
    protected _bytesReserved: number;
    readonly bytesReserved: number;
    protected _isValid: (value: T['TValue'] | TNull) => boolean;
    protected _setValue: (inst: Builder<T>, index: number, value: T['TValue']) => void;
    readonly ArrayType: any;
    readAll(source: Iterable<any>, chunkLength?: number): IterableIterator<Data<T>>;
    readAllAsync(source: Iterable<any> | AsyncIterable<any>, chunkLength?: number): AsyncIterableIterator<Data<T>>;
    /**
     * Validates whether a value is valid (true), or null (false)
     * @param value The value to compare against null the value representations
     */
    isValid(value: T['TValue'] | TNull): boolean;
    write(value: T['TValue'] | TNull, ..._: any[]): this;
    /** @ignore */
    writeValue(value: T['TValue'], offset: number, ..._: any[]): void;
    /** @ignore */
    writeValid(isValid: boolean, offset: number): boolean;
    protected _updateBytesUsed(offset: number, length: number): this;
    flush(): Data<T>;
    finish(): this;
    reset(): this;
    protected _getNullBitmap(length: number): Uint8Array;
    protected _getValueOffsets(length: number): Int32Array;
    protected _getValues(length: number): T["TArray"];
    protected _getValuesBitmap(length: number): T["TArray"];
    protected _getTypeIds(length: number): Int8Array;
}
export declare abstract class FlatBuilder<T extends Int | Float | FixedSizeBinary | Date_ | Timestamp | Time | Decimal | Interval = any, TNull = any> extends Builder<T, TNull> {
    readonly BYTES_PER_ELEMENT: number;
    constructor(options: DataBuilderOptions<T, TNull>);
    readonly bytesReserved: number;
    writeValue(value: T['TValue'], offset: number): void;
    protected _updateBytesUsed(offset: number, length: number): this;
}
export declare abstract class FlatListBuilder<T extends Utf8 | Binary = any, TNull = any> extends Builder<T, TNull> {
    protected _values?: Map<number, undefined | Uint8Array>;
    constructor(options: DataBuilderOptions<T, TNull>);
    readonly bytesReserved: number;
    writeValid(isValid: boolean, offset: number): boolean;
    writeValue(value: Uint8Array | string, offset: number): void;
    protected _updateBytesUsed(offset: number, length: number): this;
    flush(): Data<T>;
}
export declare abstract class NestedBuilder<T extends List | FixedSizeList | Map_ | Struct | Union | DenseUnion | SparseUnion, TNull = any> extends Builder<T, TNull> {
    readonly bytesUsed: number;
    readonly bytesReserved: number;
    getChildAt<R extends DataType = any>(index: number): Builder<R> | null;
}

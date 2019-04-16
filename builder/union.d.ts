import { Builder, NestedBuilder, DataBuilderOptions } from './base';
import { Union, SparseUnion, DenseUnion } from '../type';
export declare class UnionBuilder<T extends Union, TNull = any> extends NestedBuilder<T, TNull> {
    constructor(options: DataBuilderOptions<T, TNull>);
    readonly bytesReserved: number;
    write(value: any | TNull, childTypeId: number): this;
    appendChild(child: Builder, name?: string): number;
    writeValue(value: any, offset: number, typeId: number): void;
    protected _updateBytesUsed(offset: number, length: number): this;
}
export declare class SparseUnionBuilder<T extends SparseUnion, TNull = any> extends UnionBuilder<T, TNull> {
}
export declare class DenseUnionBuilder<T extends DenseUnion, TNull = any> extends UnionBuilder<T, TNull> {
    constructor(options: DataBuilderOptions<T, TNull>);
    writeValue(value: any, offset: number, childTypeId: number): void;
    protected _updateBytesUsed(offset: number, length: number): this;
}

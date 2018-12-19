import { BaseVector } from './base';
import { Union, DenseUnion, SparseUnion } from '../type';
export declare class UnionVector<T extends Union = Union> extends BaseVector<T> {
    readonly typeIdToChildIndex: {
        [key: number]: number;
    };
}
export declare class DenseUnionVector extends UnionVector<DenseUnion> {
    readonly valueOffsets: Int32Array;
}
export declare class SparseUnionVector extends UnionVector<SparseUnion> {
}

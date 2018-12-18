import { Data } from '../data';
import { BaseVector } from './base';
import { DataType, FixedSizeList } from '../type';
export declare class FixedSizeListVector<T extends DataType = any> extends BaseVector<FixedSizeList<T>> {
    constructor(data: Data<FixedSizeList<T>>);
}

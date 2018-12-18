import { Row } from './row';
import { BaseVector } from './base';
import { DataType, Struct } from '../type';
export declare class StructVector<T extends {
    [key: string]: DataType;
} = any> extends BaseVector<Struct<T>> {
    rowProxy: Row<T>;
    asMap(keysSorted?: boolean): import("./map").MapVector<T>;
}

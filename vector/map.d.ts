import { Row } from './row';
import { BaseVector } from './base';
import { DataType, Map_ } from '../type';
export declare class MapVector<T extends {
    [key: string]: DataType;
} = any> extends BaseVector<Map_<T>> {
    rowProxy: Row<T>;
    asStruct(): import("./struct").StructVector<T>;
}

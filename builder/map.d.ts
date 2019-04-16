import { DataType, Map_ } from '../type';
import { NestedBuilder } from './base';
export declare class MapBuilder<T extends {
    [key: string]: DataType;
} = any, TNull = any> extends NestedBuilder<Map_<T>, TNull> {
}

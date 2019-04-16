import { DataType, List } from '../type';
import { NestedBuilder } from './base';
export declare class ListBuilder<T extends DataType = any, TNull = any> extends NestedBuilder<List<T>, TNull> {
    private row;
    writeValue(value: any, offset: number): void;
}

import { DataType, FixedSizeList } from '../type';
import { NestedBuilder } from './base';
export declare class FixedSizeListBuilder<T extends DataType = any, TNull = any> extends NestedBuilder<FixedSizeList<T>, TNull> {
    private row;
    writeValue(value: any, offset: number): void;
}

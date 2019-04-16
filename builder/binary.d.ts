import { Binary } from '../type';
import { FlatListBuilder } from './base';
export interface BinaryBuilder<TNull = any> extends FlatListBuilder<Binary, TNull> {
    nullBitmap: Uint8Array;
    valueOffsets: Int32Array;
    values: Uint8Array;
}
export declare class BinaryBuilder<TNull = any> extends FlatListBuilder<Binary, TNull> {
    writeValue(value: Uint8Array, index?: number): void;
}

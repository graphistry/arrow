import { Utf8 } from '../type';
import { FlatListBuilder } from './base';
export interface Utf8Builder<TNull = any> extends FlatListBuilder<Utf8, TNull> {
    nullBitmap: Uint8Array;
    valueOffsets: Int32Array;
    values: Uint8Array;
}
export declare class Utf8Builder<TNull = any> extends FlatListBuilder<Utf8, TNull> {
    writeValue(value: string, index?: number): void;
}

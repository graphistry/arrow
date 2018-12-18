import { BaseVector } from './base';
import { Utf8 } from '../type';
export declare class Utf8Vector extends BaseVector<Utf8> {
    /** @nocollapse */
    static from(values: string[]): Utf8Vector;
    asBinary(): import("./binary").BinaryVector;
}

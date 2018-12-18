import { Bool } from '../type';
import { BaseVector } from './base';
export declare class BoolVector extends BaseVector<Bool> {
    /** @nocollapse */
    static from(data: Iterable<boolean>): BoolVector;
}

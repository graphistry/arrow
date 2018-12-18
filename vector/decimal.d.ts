import { Data } from '../data';
import { Decimal } from '../type';
import { BaseVector } from './base';
export declare class DecimalVector extends BaseVector<Decimal> {
    constructor(data: Data<Decimal>);
}

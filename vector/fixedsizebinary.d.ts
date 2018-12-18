import { Data } from '../data';
import { BaseVector } from './base';
import { FixedSizeBinary } from '../type';
export declare class FixedSizeBinaryVector extends BaseVector<FixedSizeBinary> {
    constructor(data: Data<FixedSizeBinary>);
}

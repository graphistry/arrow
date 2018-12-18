import { Data } from '../data';
import { BaseVector } from './base';
import { Timestamp, TimestampSecond, TimestampMillisecond, TimestampMicrosecond, TimestampNanosecond } from '../type';
export declare class TimestampVector<T extends Timestamp = Timestamp> extends BaseVector<T> {
    constructor(data: Data<T>);
}
export declare class TimestampSecondVector extends TimestampVector<TimestampSecond> {
}
export declare class TimestampMillisecondVector extends TimestampVector<TimestampMillisecond> {
}
export declare class TimestampMicrosecondVector extends TimestampVector<TimestampMicrosecond> {
}
export declare class TimestampNanosecondVector extends TimestampVector<TimestampNanosecond> {
}

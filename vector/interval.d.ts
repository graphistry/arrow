import { Data } from '../data';
import { BaseVector } from './base';
import { Interval, IntervalDayTime, IntervalYearMonth } from '../type';
export declare class IntervalVector<T extends Interval = Interval> extends BaseVector<T> {
    constructor(data: Data<T>);
}
export declare class IntervalDayTimeVector extends IntervalVector<IntervalDayTime> {
}
export declare class IntervalYearMonthVector extends IntervalVector<IntervalYearMonth> {
}

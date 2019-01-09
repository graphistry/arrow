import { BaseVector } from './base';
import { Interval, IntervalDayTime, IntervalYearMonth } from '../type';
export declare class IntervalVector<T extends Interval = Interval> extends BaseVector<T> {
}
export declare class IntervalDayTimeVector extends IntervalVector<IntervalDayTime> {
}
export declare class IntervalYearMonthVector extends IntervalVector<IntervalYearMonth> {
}

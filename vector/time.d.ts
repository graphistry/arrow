import { BaseVector } from './base';
import { Time, TimeSecond, TimeMillisecond, TimeMicrosecond, TimeNanosecond } from '../type';
export declare class TimeVector<T extends Time = Time> extends BaseVector<T> {
}
export declare class TimeSecondVector extends TimeVector<TimeSecond> {
}
export declare class TimeMillisecondVector extends TimeVector<TimeMillisecond> {
}
export declare class TimeMicrosecondVector extends TimeVector<TimeMicrosecond> {
}
export declare class TimeNanosecondVector extends TimeVector<TimeNanosecond> {
}

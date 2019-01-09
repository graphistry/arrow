import { BaseVector } from './base';
import { Date_, DateDay, DateMillisecond } from '../type';
export declare class DateVector<T extends Date_ = Date_> extends BaseVector<T> {
    /** @nocollapse */
    static from<T extends Date_ = DateMillisecond>(data: Date[], unit?: T['unit']): DateVector<Date_<import("../type").Dates>>;
}
export declare class DateDayVector extends DateVector<DateDay> {
}
export declare class DateMillisecondVector extends DateVector<DateMillisecond> {
}

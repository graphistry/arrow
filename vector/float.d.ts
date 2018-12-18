import { BaseVector } from './base';
import { Float, Float16, Float32, Float64 } from '../type';
export declare class FloatVector<T extends Float = Float> extends BaseVector<T> {
    /** @nocollapse */
    static from<T extends Float>(data: T['TArray']): Float16Vector | Float32Vector | Float64Vector;
}
export declare class Float16Vector extends FloatVector<Float16> {
}
export declare class Float32Vector extends FloatVector<Float32> {
}
export declare class Float64Vector extends FloatVector<Float64> {
}

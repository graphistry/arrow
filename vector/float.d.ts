import { BaseVector } from './base';
import { Vector as V } from '../interfaces';
import { Float, Float16, Float32, Float64 } from '../type';
export declare class FloatVector<T extends Float = Float> extends BaseVector<T> {
    static from(this: typeof FloatVector, data: Float16['TArray']): Float16Vector;
    static from(this: typeof FloatVector, data: Float32['TArray']): Float32Vector;
    static from(this: typeof FloatVector, data: Float64['TArray']): Float64Vector;
    static from<T extends Float>(this: typeof FloatVector, data: T['TArray']): V<T>;
    static from(this: typeof Float16Vector, data: Float16['TArray'] | Iterable<number>): Float16Vector;
    static from(this: typeof Float32Vector, data: Float32['TArray'] | Iterable<number>): Float32Vector;
    static from(this: typeof Float64Vector, data: Float64['TArray'] | Iterable<number>): Float64Vector;
}
export declare class Float16Vector extends FloatVector<Float16> {
    toFloat32Array(): Float32Array;
    toFloat64Array(): Float64Array;
}
export declare class Float32Vector extends FloatVector<Float32> {
}
export declare class Float64Vector extends FloatVector<Float64> {
}

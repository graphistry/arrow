import { BaseVector } from './base';
import { Vector as V } from '../interfaces';
import { Int, Uint8, Uint16, Uint32, Uint64, Int8, Int16, Int32, Int64 } from '../type';
export declare class IntVector<T extends Int = Int> extends BaseVector<T> {
    static from<T extends Int>(data: T['TArray']): V<T>;
    static from<T extends Int32 | Uint32>(data: T['TArray'], is64: true): V<T>;
}
export declare class Int8Vector extends IntVector<Int8> {
}
export declare class Int16Vector extends IntVector<Int16> {
}
export declare class Int32Vector extends IntVector<Int32> {
}
export declare class Int64Vector extends IntVector<Int64> {
}
export declare class Uint8Vector extends IntVector<Uint8> {
}
export declare class Uint16Vector extends IntVector<Uint16> {
}
export declare class Uint32Vector extends IntVector<Uint32> {
}
export declare class Uint64Vector extends IntVector<Uint64> {
}

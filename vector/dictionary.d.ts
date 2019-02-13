import { Data } from '../data';
import { Vector } from '../vector';
import { BaseVector } from './base';
import { Vector as V } from '../interfaces';
import { DataType, Dictionary, TKeys } from '../type';
export declare class DictionaryVector<T extends DataType = any, TKey extends TKeys = TKeys> extends BaseVector<Dictionary<T, TKey>> {
    /** @nocollapse */
    static from<T extends DataType<any>, TKey extends TKeys = TKeys>(values: Vector<T>, indices: TKey, keys: ArrayLike<number> | TKey['TArray']): Dictionary<T, TKey> extends DataType<import("../enum").Type, any> ? Dictionary<T, TKey> extends Dictionary<any, TKeys> ? DictionaryVector<T, TKey> : BaseVector<Dictionary<T, TKey>> : BaseVector<any>;
    readonly indices: V<TKey>;
    constructor(data: Data<Dictionary<T, TKey>>);
    readonly dictionary: Vector<T>;
    reverseLookup(value: T): number;
    getKey(idx: number): TKey['TValue'] | null;
    getValue(key: number): T['TValue'] | null;
    setKey(idx: number, key: TKey['TValue'] | null): void;
    setValue(key: number, value: T['TValue'] | null): void;
}

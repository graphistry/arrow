import { Data } from '../data';
import { Vector } from '../vector';
import { BaseVector } from './base';
import { Vector as V } from '../interfaces';
import { DataType, Dictionary, TKeys } from '../type';
export declare class DictionaryVector<T extends DataType = any, TKey extends TKeys = TKeys> extends BaseVector<Dictionary<T, TKey>> {
    /** @nocollapse */
    static from<T extends DataType<any>, TKey extends TKeys = TKeys>(values: Vector<T>, indices: TKey, keys: ArrayLike<number> | TKey['TArray']): Dictionary<T, TKey> extends DataType<import("../enum").Type, any> ? Dictionary<T, TKey> extends Dictionary<any, TKeys> ? DictionaryVector<T, TKey> : BaseVector<Dictionary<T, TKey>> : never;
    protected _indices: V<TKey>;
    constructor(data: Data<Dictionary<T, TKey>>);
    readonly indices: V<TKey>;
    readonly dictionary: Vector<T>;
    getKey(index: number): TKey['TValue'] | null;
    getValue(key: number): T['TValue'] | null;
    isValid(index: number): boolean;
    reverseLookup(value: T): number;
}

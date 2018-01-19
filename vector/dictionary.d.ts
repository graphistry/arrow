import { Data } from '../data';
import { View, Vector } from '../vector';
import { IterableArrayLike, DataType, Dictionary, Int } from '../type';
export declare class DictionaryView<T extends DataType> implements View<T> {
    indicies: Vector<Int>;
    dictionary: Vector<T>;
    constructor(dictionary: Vector<T>, indicies: Vector<Int>);
    clone(data: Data<Dictionary<T>>): this;
    isValid(index: number): boolean;
    get(index: number): T['TValue'];
    set(index: number, value: T['TValue']): void;
    toArray(): IterableArrayLike<T['TValue']>;
    [Symbol.iterator](): IterableIterator<T['TValue']>;
}

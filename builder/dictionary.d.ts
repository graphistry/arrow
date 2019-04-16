import { Data } from '../data';
import { IntBuilder } from './int';
import { Dictionary, DataType } from '../type';
import { Builder, DataBuilderOptions } from './base';
declare type DictionaryHashFunction = (x: any) => string | number;
export interface DictionaryBuilderOptions<T extends DataType = any, TNull = any> extends DataBuilderOptions<T, TNull> {
    dictionaryHashFunction?: DictionaryHashFunction;
}
export declare class DictionaryBuilder<T extends Dictionary, TNull = any> extends Builder<T, TNull> {
    protected _hash: DictionaryHashFunction;
    protected hashmap: any;
    readonly indices: IntBuilder<T['indices']>;
    readonly dictionary: Builder<T['dictionary']>;
    constructor(options: DictionaryBuilderOptions<T, TNull>);
    values: T['TArray'];
    nullBitmap: Uint8Array;
    setHashFunction(hash: DictionaryHashFunction): this;
    reset(): this;
    flush(): Data<T>;
    finish(): this;
    write(value: any): this;
    writeValid(isValid: boolean, index: number): boolean;
    writeValue(value: T['TValue'], index: number): void;
    readAll(source: Iterable<any>, chunkLength?: number): IterableIterator<Data<T>>;
    readAllAsync(source: Iterable<any> | AsyncIterable<any>, chunkLength?: number): AsyncIterableIterator<Data<T>>;
}
export {};

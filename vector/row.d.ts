import { Field } from '../schema';
import { MapVector } from '../vector/map';
import { DataType } from '../type';
import { StructVector } from '../vector/struct';
/** @ignore */ export declare const kLength: unique symbol;
/** @ignore */ export declare const kParent: unique symbol;
/** @ignore */ export declare const kRowIndex: unique symbol;
export declare class Row<T extends {
    [key: string]: DataType;
}> implements Iterable<T[keyof T]['TValue']> {
    [key: string]: T[keyof T]['TValue'];
    [kParent]: MapVector<T> | StructVector<T>;
    [kRowIndex]: number;
    readonly [kLength]: number;
    [Symbol.iterator](): IterableIterator<T[keyof T]["TValue"]>;
    get<K extends keyof T>(key: K): T[K]["TValue"];
    toJSON(): any;
    toString(): any;
}
/** @ignore */
export declare class RowProxyGenerator<T extends {
    [key: string]: DataType;
}> {
    /** @nocollapse */
    static new<T extends {
        [key: string]: DataType;
    }>(parent: MapVector<T> | StructVector<T>, schemaOrFields: T | Field[], fieldsAreEnumerable?: boolean): RowProxyGenerator<T>;
    private rowPrototype;
    private constructor();
    private _bindGetter;
    bind(rowIndex: number): Row<T>;
}

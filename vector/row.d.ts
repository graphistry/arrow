import { Field } from '../schema';
import { MapVector } from '../vector/map';
import { DataType, RowLike } from '../type';
import { StructVector } from '../vector/struct';
export declare class Row<T extends {
    [key: string]: DataType;
}> implements Iterable<T[keyof T]['TValue']> {
    /** @nocollapse */
    static new<T extends {
        [key: string]: DataType;
    }>(schemaOrFields: T | Field[], fieldsAreEnumerable?: boolean): RowLike<T> & Row<T>;
    private parent;
    private rowIndex;
    readonly length: number;
    private constructor();
    [Symbol.iterator](this: RowLike<T>): IterableIterator<T[string]["TValue"]>;
    private _bindGetter;
    get<K extends keyof T>(key: K): T[K]["TValue"];
    bind<TParent extends MapVector<T> | StructVector<T>>(parent: TParent, rowIndex: number): RowLike<T>;
    toJSON(): any;
    toString(): any;
}

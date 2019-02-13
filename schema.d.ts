import { Data } from './data';
import { Vector } from './vector';
import { DataType, Dictionary } from './type';
export declare class Schema<T extends {
    [key: string]: DataType;
} = any> {
    /** @nocollapse */
    static from<T extends {
        [key: string]: DataType;
    } = any>(chunks: (Data<T[keyof T]> | Vector<T[keyof T]>)[], names?: (keyof T)[]): Schema<T>;
    readonly fields: Field<T[keyof T]>[];
    readonly metadata: Map<string, string>;
    readonly dictionaries: Map<number, DataType>;
    readonly dictionaryFields: Map<number, Field<Dictionary>[]>;
    constructor(fields?: Field[], metadata?: Map<string, string> | null, dictionaries?: Map<number, DataType> | null, dictionaryFields?: Map<number, Field<Dictionary>[]> | null);
    readonly [Symbol.toStringTag]: string;
    toString(): string;
    compareTo(other?: Schema | null): other is Schema<T>;
    select<K extends keyof T = any>(...columnNames: K[]): Schema<{ [P in K]: T[P]; }>;
    selectAt<K extends T[keyof T] = any>(...columnIndices: number[]): Schema<{
        [key: string]: K;
    }>;
    assign<R extends {
        [key: string]: DataType;
    } = any>(schema: Schema<R>): Schema<T & R>;
    assign<R extends {
        [key: string]: DataType;
    } = any>(...fields: (Field<R[keyof R]> | Field<R[keyof R]>[])[]): Schema<T & R>;
}
export declare class Field<T extends DataType = DataType> {
    readonly type: T;
    readonly name: string;
    readonly nullable: boolean;
    readonly metadata: Map<string, string>;
    constructor(name: string, type: T, nullable?: boolean, metadata?: Map<string, string> | null);
    readonly typeId: import("./enum").Type;
    readonly [Symbol.toStringTag]: string;
    toString(): string;
    compareTo(other?: Field | null): other is Field<T>;
    clone<R extends DataType = T>(props?: {
        name?: string;
        type?: R;
        nullable?: boolean;
        metadata?: Map<string, string> | null;
    }): Field<R>;
}

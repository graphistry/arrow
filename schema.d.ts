import { DataType, Dictionary } from './type';
import { Vector as VType } from './interfaces';
export declare class Schema<T extends {
    [key: string]: DataType;
} = any> {
    /** @nocollapse */
    static from<T extends {
        [key: string]: DataType;
    } = any>(vectors: VType<T[keyof T]>[], names?: (keyof T)[]): Schema<T>;
    protected _fields: Field[];
    protected _metadata: Map<string, string>;
    protected _dictionaries: Map<number, DataType>;
    protected _dictionaryFields: Map<number, Field<Dictionary>[]>;
    readonly fields: Field[];
    readonly metadata: Map<string, string>;
    readonly dictionaries: Map<number, DataType>;
    readonly dictionaryFields: Map<number, Field<Dictionary>[]>;
    constructor(fields: Field[], metadata?: Map<string, string>, dictionaries?: Map<number, DataType>, dictionaryFields?: Map<number, Field<Dictionary>[]>);
    select<K extends keyof T = any>(...columnNames: K[]): Schema<{ [P in K]: T[P]; }>;
    static [Symbol.toStringTag]: string;
}
export declare class Field<T extends DataType = DataType> {
    protected _type: T;
    protected _name: string;
    protected _nullable: true | false;
    protected _metadata?: Map<string, string> | null;
    constructor(name: string, type: T, nullable?: true | false, metadata?: Map<string, string> | null);
    readonly type: T;
    readonly name: string;
    readonly typeId: import("./enum").Type;
    readonly nullable: boolean;
    readonly metadata: Map<string, string> | null | undefined;
    readonly [Symbol.toStringTag]: string;
    readonly indices: T | import("./type").Int8 | import("./type").Int16 | import("./type").Int32 | import("./type").Uint8 | import("./type").Uint16 | import("./type").Uint32;
    toString(): string;
}

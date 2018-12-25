import { Column } from '../column';
import { Visitor } from '../visitor';
import { RecordBatch } from '../recordbatch';
import { Vector as VType } from '../interfaces';
import { DataType, Float, Int, Date_, Interval, Time, Timestamp, Union, Bool, Null, Utf8, Binary, Decimal, FixedSizeBinary, List, FixedSizeList, Map_, Struct } from '../type';
export interface JSONVectorAssembler extends Visitor {
    visit<T extends Column>(node: T): object;
    visitMany<T extends Column>(cols: T[]): object[];
    getVisitFn<T extends DataType>(node: Column<T>): (column: Column<T>) => {
        name: string;
        count: number;
        VALIDITY: (0 | 1)[];
        DATA?: any[];
        OFFSET?: number[];
        TYPE?: number[];
        children?: any[];
    };
    visitNull<T extends Null>(vector: VType<T>): {};
    visitBool<T extends Bool>(vector: VType<T>): {
        DATA: boolean[];
    };
    visitInt<T extends Int>(vector: VType<T>): {
        DATA: (number | string)[];
    };
    visitFloat<T extends Float>(vector: VType<T>): {
        DATA: number[];
    };
    visitUtf8<T extends Utf8>(vector: VType<T>): {
        DATA: string[];
        OFFSET: number[];
    };
    visitBinary<T extends Binary>(vector: VType<T>): {
        DATA: string[];
        OFFSET: number[];
    };
    visitFixedSizeBinary<T extends FixedSizeBinary>(vector: VType<T>): {
        DATA: string[];
    };
    visitDate<T extends Date_>(vector: VType<T>): {
        DATA: number[];
    };
    visitTimestamp<T extends Timestamp>(vector: VType<T>): {
        DATA: string[];
    };
    visitTime<T extends Time>(vector: VType<T>): {
        DATA: number[];
    };
    visitDecimal<T extends Decimal>(vector: VType<T>): {
        DATA: string[];
    };
    visitList<T extends List>(vector: VType<T>): {
        children: any[];
        OFFSET: number[];
    };
    visitStruct<T extends Struct>(vector: VType<T>): {
        children: any[];
    };
    visitUnion<T extends Union>(vector: VType<T>): {
        children: any[];
        TYPE: number[];
    };
    visitInterval<T extends Interval>(vector: VType<T>): {
        DATA: number[];
    };
    visitFixedSizeList<T extends FixedSizeList>(vector: VType<T>): {
        children: any[];
    };
    visitMap<T extends Map_>(vector: VType<T>): {
        children: any[];
    };
}
export declare class JSONVectorAssembler extends Visitor {
    /** @nocollapse */
    static assemble<T extends Column | RecordBatch>(...args: (T | T[])[]): object[];
}

import { Data } from '../data';
import { Vector } from '../vector';
import { Visitor } from '../visitor';
import { Type } from '../enum';
import { RecordBatch } from '../recordbatch';
import { Vector as VType } from '../interfaces';
import { BufferRegion, FieldNode } from '../ipc/metadata/message';
import { DataType, Dictionary, Float, Int, Date_, Interval, Time, Timestamp, Union, Bool, Null, Utf8, Binary, Decimal, FixedSizeBinary, List, FixedSizeList, Map_, Struct } from '../type';
export interface VectorAssembler extends Visitor {
    visit<T extends Vector>(node: T): this;
    visitMany<T extends Vector>(nodes: T[]): this[];
    getVisitFn<T extends Type>(node: T): (vector: VType<T>) => this;
    getVisitFn<T extends DataType>(node: VType<T> | Data<T> | T): (vector: VType<T>) => this;
    visitBool<T extends Bool>(vector: VType<T>): this;
    visitInt<T extends Int>(vector: VType<T>): this;
    visitFloat<T extends Float>(vector: VType<T>): this;
    visitUtf8<T extends Utf8>(vector: VType<T>): this;
    visitBinary<T extends Binary>(vector: VType<T>): this;
    visitFixedSizeBinary<T extends FixedSizeBinary>(vector: VType<T>): this;
    visitDate<T extends Date_>(vector: VType<T>): this;
    visitTimestamp<T extends Timestamp>(vector: VType<T>): this;
    visitTime<T extends Time>(vector: VType<T>): this;
    visitDecimal<T extends Decimal>(vector: VType<T>): this;
    visitList<T extends List>(vector: VType<T>): this;
    visitStruct<T extends Struct>(vector: VType<T>): this;
    visitUnion<T extends Union>(vector: VType<T>): this;
    visitInterval<T extends Interval>(vector: VType<T>): this;
    visitFixedSizeList<T extends FixedSizeList>(vector: VType<T>): this;
    visitMap<T extends Map_>(vector: VType<T>): this;
}
export declare class VectorAssembler extends Visitor {
    /** @nocollapse */
    static assemble<T extends Vector | RecordBatch>(...args: (T | T[])[]): VectorAssembler;
    private constructor();
    visitNull<T extends Null>(_nullV: VType<T>): this;
    visitDictionary<T extends Dictionary>(vector: VType<T>): this;
    readonly nodes: FieldNode[];
    readonly buffers: ArrayBufferView[];
    readonly byteLength: number;
    readonly bufferRegions: BufferRegion[];
    protected _byteLength: number;
    protected _nodes: FieldNode[];
    protected _buffers: ArrayBufferView[];
    protected _bufferRegions: BufferRegion[];
}

/// <reference types="flatbuffers" />
import { Table } from '../../table';
import { RecordBatch } from '../../recordbatch';
import { TypeVisitor } from '../../visitor';
import { Vector } from '../../vector';
import { Footer, Message } from '../metadata';
import { Dictionary, Null, Int, Float, Binary, Bool, Utf8, Decimal, Date_, Time, Timestamp, Interval, List, Struct, Union, FixedSizeBinary, FixedSizeList, Map_ } from '../../type';
export declare function serializeStream(table: Table): IterableIterator<Uint8Array>;
export declare function serializeFile(table: Table): IterableIterator<Uint8Array>;
export declare function serializeRecordBatch(recordBatch: RecordBatch): {
    metadataLength: number;
    buffer: Uint8Array;
};
export declare function serializeDictionaryBatch(dictionary: Vector, id: Long | number, isDelta?: boolean): {
    metadataLength: number;
    buffer: Uint8Array;
};
export declare function serializeMessage(message: Message, data?: Uint8Array): {
    metadataLength: number;
    buffer: Uint8Array;
};
export declare function serializeFooter(footer: Footer): {
    metadataLength: number;
    buffer: Uint8Array;
};
import { flatbuffers } from 'flatbuffers';
import Long = flatbuffers.Long;
import Builder = flatbuffers.Builder;
export declare class TypeSerializer extends TypeVisitor {
    protected builder: Builder;
    constructor(builder: Builder);
    visitNull(_node: Null): number;
    visitInt(node: Int): number;
    visitFloat(node: Float): number;
    visitBinary(_node: Binary): number;
    visitBool(_node: Bool): number;
    visitUtf8(_node: Utf8): number;
    visitDecimal(node: Decimal): number;
    visitDate(node: Date_): number;
    visitTime(node: Time): number;
    visitTimestamp(node: Timestamp): number;
    visitInterval(node: Interval): number;
    visitList(_node: List): number;
    visitStruct(_node: Struct): number;
    visitUnion(node: Union): number;
    visitDictionary(node: Dictionary): number;
    visitFixedSizeBinary(node: FixedSizeBinary): number;
    visitFixedSizeList(node: FixedSizeList): number;
    visitMap(node: Map_): number;
}

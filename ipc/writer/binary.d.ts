import { Table } from '../../table';
import { RecordBatch } from '../../recordbatch';
import { VectorVisitor, TypeVisitor } from '../../visitor';
import { Vector, DictionaryVector } from '../../vector';
import { BufferMetadata, FieldMetadata, Footer, Message } from '../metadata';
import { TypedArray, DataType, Dictionary, Null, Int, Float, Binary, Bool, Utf8, Decimal, Date_, Time, Timestamp, Interval, List, Struct, Union, FixedSizeBinary, FixedSizeList, Map_, FlatType, FlatListType, NestedType, SparseUnion, DenseUnion, SingleNestedType } from '../../type';
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
export declare class RecordBatchSerializer extends VectorVisitor {
    byteLength: number;
    buffers: TypedArray[];
    fieldNodes: FieldMetadata[];
    buffersMeta: BufferMetadata[];
    visitRecordBatch(recordBatch: RecordBatch): this;
    visit<T extends DataType>(vector: Vector<T>): any;
    visitNull(_nullz: Vector<Null>): this;
    visitBool(vector: Vector<Bool>): this;
    visitInt(vector: Vector<Int>): this;
    visitFloat(vector: Vector<Float>): this;
    visitUtf8(vector: Vector<Utf8>): this;
    visitBinary(vector: Vector<Binary>): this;
    visitDate(vector: Vector<Date_>): this;
    visitTimestamp(vector: Vector<Timestamp>): this;
    visitTime(vector: Vector<Time>): this;
    visitDecimal(vector: Vector<Decimal>): this;
    visitInterval(vector: Vector<Interval>): this;
    visitList(vector: Vector<List>): any;
    visitStruct(vector: Vector<Struct>): this;
    visitFixedSizeBinary(vector: Vector<FixedSizeBinary>): this;
    visitFixedSizeList(vector: Vector<FixedSizeList>): any;
    visitMap(vector: Vector<Map_>): this;
    visitDictionary(vector: DictionaryVector): any;
    visitUnion(vector: Vector<DenseUnion | SparseUnion>): this;
    protected visitBoolVector(vector: Vector<Bool>): this;
    protected visitFlatVector<T extends FlatType>(vector: Vector<T>): this;
    protected visitFlatListVector<T extends FlatListType>(vector: Vector<T>): this;
    protected visitListVector<T extends SingleNestedType>(vector: Vector<T>): any;
    protected visitNestedVector<T extends NestedType>(vector: Vector<T>): this;
    protected addBuffer(values: TypedArray): this;
    protected getTruncatedBitmap(offset: number, length: number, bitmap: Uint8Array): Uint8Array;
    protected getZeroBasedValueOffsets(offset: number, length: number, valueOffsets: Int32Array): Int32Array;
}
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

/// <reference types="flatbuffers" />
import { Schema, Long, MessageHeader, MetadataVersion } from '../type';
export declare class Footer {
    dictionaryBatches: FileBlock[];
    recordBatches: FileBlock[];
    schema: Schema;
    constructor(dictionaryBatches: FileBlock[], recordBatches: FileBlock[], schema: Schema);
}
export declare class FileBlock {
    metaDataLength: number;
    bodyLength: Long;
    offset: Long;
    constructor(metaDataLength: number, bodyLength: Long, offset: Long);
}
export declare class Message {
    bodyLength: number;
    version: MetadataVersion;
    headerType: MessageHeader;
    constructor(version: MetadataVersion, bodyLength: Long | number, headerType: MessageHeader);
    static isSchema(m: Message): m is Schema;
    static isRecordBatch(m: Message): m is RecordBatchMetadata;
    static isDictionaryBatch(m: Message): m is DictionaryBatch;
}
export declare class RecordBatchMetadata extends Message {
    length: number;
    nodes: FieldMetadata[];
    buffers: BufferMetadata[];
    constructor(version: MetadataVersion, length: Long | number, nodes: FieldMetadata[], buffers: BufferMetadata[]);
}
export declare class DictionaryBatch extends Message {
    id: number;
    isDelta: boolean;
    data: RecordBatchMetadata;
    constructor(version: MetadataVersion, data: RecordBatchMetadata, id: Long | number, isDelta?: boolean);
    private static atomicDictionaryId;
    static getId(): number;
    readonly nodes: FieldMetadata[];
    readonly buffers: BufferMetadata[];
}
export declare class BufferMetadata {
    offset: number;
    length: number;
    constructor(offset: Long | number, length: Long | number);
}
export declare class FieldMetadata {
    length: number;
    nullCount: number;
    constructor(length: Long | number, nullCount: Long | number);
}

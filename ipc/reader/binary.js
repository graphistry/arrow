"use strict";
// Licensed to the Apache Software Foundation (ASF) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The ASF licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const flatbuffers_1 = require("flatbuffers");
const vector_1 = require("./vector");
const magic_1 = require("../magic");
const metadata_1 = require("../metadata");
const type_1 = require("../../type");
const type_2 = require("../../type");
var ByteBuffer = flatbuffers_1.flatbuffers.ByteBuffer;
function* readBuffers(sources) {
    let schema = null;
    let dictionaries = new Map();
    let readMessages = null;
    if (ArrayBuffer.isView(sources) || typeof sources === 'string') {
        sources = [sources];
    }
    for (const source of sources) {
        const bb = toByteBuffer(source);
        if ((!schema && ({ schema, readMessages } = readSchema(bb)) || true) && schema && readMessages) {
            for (const message of readMessages(bb)) {
                yield {
                    schema, message,
                    loader: new BinaryDataLoader(bb, arrayIterator(message.nodes), arrayIterator(message.buffers), dictionaries)
                };
            }
        }
    }
}
exports.readBuffers = readBuffers;
function readBuffersAsync(sources) {
    return tslib_1.__asyncGenerator(this, arguments, function* readBuffersAsync_1() {
        let schema = null;
        let dictionaries = new Map();
        let readMessages = null;
        try {
            for (var sources_1 = tslib_1.__asyncValues(sources), sources_1_1; sources_1_1 = yield tslib_1.__await(sources_1.next()), !sources_1_1.done;) {
                const source = yield tslib_1.__await(sources_1_1.value);
                const bb = toByteBuffer(source);
                if ((!schema && ({ schema, readMessages } = readSchema(bb)) || true) && schema && readMessages) {
                    for (const message of readMessages(bb)) {
                        yield {
                            schema, message,
                            loader: new BinaryDataLoader(bb, arrayIterator(message.nodes), arrayIterator(message.buffers), dictionaries)
                        };
                    }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (sources_1_1 && !sources_1_1.done && (_a = sources_1.return)) yield tslib_1.__await(_a.call(sources_1));
            }
            finally { if (e_1) throw e_1.error; }
        }
        var e_1, _a;
    });
}
exports.readBuffersAsync = readBuffersAsync;
class BinaryDataLoader extends vector_1.TypeDataLoader {
    constructor(bb, nodes, buffers, dictionaries) {
        super(nodes, buffers, dictionaries);
        this.bytes = bb.bytes();
        this.messageOffset = bb.position();
    }
    readOffsets(type, buffer) { return this.readData(type, buffer); }
    readTypeIds(type, buffer) { return this.readData(type, buffer); }
    readData(_type, { length, offset } = this.getBufferMetadata()) {
        return new Uint8Array(this.bytes.buffer, this.bytes.byteOffset + this.messageOffset + offset, length);
    }
}
exports.BinaryDataLoader = BinaryDataLoader;
function* arrayIterator(arr) { yield* arr; }
function toByteBuffer(bytes) {
    let arr = bytes || new Uint8Array(0);
    if (typeof bytes === 'string') {
        arr = new Uint8Array(bytes.length);
        for (let i = -1, n = bytes.length; ++i < n;) {
            arr[i] = bytes.charCodeAt(i);
        }
        return new ByteBuffer(arr);
    }
    return new ByteBuffer(arr);
}
function readSchema(bb) {
    let schema, readMessages, footer;
    if (footer = readFileSchema(bb)) {
        schema = footer.schema;
        readMessages = readFileMessages(footer);
    }
    else if (schema = readStreamSchema(bb)) {
        readMessages = readStreamMessages;
    }
    else {
        throw new Error('Invalid Arrow buffer');
    }
    return { schema, readMessages };
}
function readStreamSchema(bb) {
    if (!magic_1.checkForMagicArrowString(bb.bytes(), 0)) {
        for (const message of readMessages(bb)) {
            if (metadata_1.Message.isSchema(message)) {
                return message;
            }
        }
    }
    return null;
}
function* readStreamMessages(bb) {
    for (const message of readMessages(bb)) {
        if (metadata_1.Message.isRecordBatch(message)) {
            yield message;
        }
        else if (metadata_1.Message.isDictionaryBatch(message)) {
            yield message;
        }
        else {
            continue;
        }
        // position the buffer after the body to read the next message
        bb.setPosition(bb.position() + message.bodyLength);
    }
}
function readFileSchema(bb) {
    let fileLength = bb.capacity(), footerLength, footerOffset;
    if ((fileLength < magic_1.magicX2AndPadding /*                     Arrow buffer too small */) ||
        (!magic_1.checkForMagicArrowString(bb.bytes(), 0) /*                        Missing magic start    */) ||
        (!magic_1.checkForMagicArrowString(bb.bytes(), fileLength - magic_1.magicLength) /* Missing magic end      */) ||
        ((footerLength = bb.readInt32(footerOffset = fileLength - magic_1.magicAndPadding)) < 1 &&
            (footerLength + footerOffset > fileLength))) {
        return null;
    }
    bb.setPosition(footerOffset - footerLength);
    return footerFromByteBuffer(bb);
}
function readFileMessages(footer) {
    return function* (bb) {
        let message;
        for (let i = -1, batches = footer.dictionaryBatches, n = batches.length; ++i < n;) {
            bb.setPosition(batches[i].offset);
            if (message = readMessage(bb, bb.readInt32(bb.position()))) {
                yield message;
            }
        }
        for (let i = -1, batches = footer.recordBatches, n = batches.length; ++i < n;) {
            bb.setPosition(batches[i].offset);
            if (message = readMessage(bb, bb.readInt32(bb.position()))) {
                yield message;
            }
        }
    };
}
function* readMessages(bb) {
    let length, message;
    while (bb.position() < bb.capacity() &&
        (length = bb.readInt32(bb.position())) > 0) {
        if (message = readMessage(bb, length)) {
            yield message;
        }
    }
}
function readMessage(bb, length) {
    bb.setPosition(bb.position() + magic_1.PADDING);
    const message = messageFromByteBuffer(bb);
    bb.setPosition(bb.position() + length);
    return message;
}
const File_ = require("../../fb/File");
const Schema_ = require("../../fb/Schema");
const Message_ = require("../../fb/Message");
var Type = Schema_.org.apache.arrow.flatbuf.Type;
var Precision = Schema_.org.apache.arrow.flatbuf.Precision;
var MessageHeader = Message_.org.apache.arrow.flatbuf.MessageHeader;
var MetadataVersion = Schema_.org.apache.arrow.flatbuf.MetadataVersion;
var _Footer = File_.org.apache.arrow.flatbuf.Footer;
var _Message = Message_.org.apache.arrow.flatbuf.Message;
var _Schema = Schema_.org.apache.arrow.flatbuf.Schema;
var _RecordBatch = Message_.org.apache.arrow.flatbuf.RecordBatch;
var _DictionaryBatch = Message_.org.apache.arrow.flatbuf.DictionaryBatch;
var _Null = Schema_.org.apache.arrow.flatbuf.Null;
var _Int = Schema_.org.apache.arrow.flatbuf.Int;
var _FloatingPoint = Schema_.org.apache.arrow.flatbuf.FloatingPoint;
var _Binary = Schema_.org.apache.arrow.flatbuf.Binary;
var _Bool = Schema_.org.apache.arrow.flatbuf.Bool;
var _Utf8 = Schema_.org.apache.arrow.flatbuf.Utf8;
var _Decimal = Schema_.org.apache.arrow.flatbuf.Decimal;
var _Date = Schema_.org.apache.arrow.flatbuf.Date;
var _Time = Schema_.org.apache.arrow.flatbuf.Time;
var _Timestamp = Schema_.org.apache.arrow.flatbuf.Timestamp;
var _Interval = Schema_.org.apache.arrow.flatbuf.Interval;
var _List = Schema_.org.apache.arrow.flatbuf.List;
var _Struct = Schema_.org.apache.arrow.flatbuf.Struct_;
var _Union = Schema_.org.apache.arrow.flatbuf.Union;
var _FixedSizeBinary = Schema_.org.apache.arrow.flatbuf.FixedSizeBinary;
var _FixedSizeList = Schema_.org.apache.arrow.flatbuf.FixedSizeList;
var _Map = Schema_.org.apache.arrow.flatbuf.Map;
function footerFromByteBuffer(bb) {
    const dictionaryFields = new Map();
    const f = _Footer.getRootAsFooter(bb), s = f.schema();
    return new metadata_1.Footer(dictionaryBatchesFromFooter(f), recordBatchesFromFooter(f), new type_1.Schema(fieldsFromSchema(s, dictionaryFields), customMetadata(s), f.version(), dictionaryFields));
}
function messageFromByteBuffer(bb) {
    const m = _Message.getRootAsMessage(bb), type = m.headerType(), version = m.version();
    switch (type) {
        case MessageHeader.Schema: return schemaFromMessage(version, m.header(new _Schema()), new Map());
        case MessageHeader.RecordBatch: return recordBatchFromMessage(version, m.header(new _RecordBatch()));
        case MessageHeader.DictionaryBatch: return dictionaryBatchFromMessage(version, m.header(new _DictionaryBatch()));
    }
    return null;
    // throw new Error(`Unrecognized Message type '${type}'`);
}
function schemaFromMessage(version, s, dictionaryFields) {
    return new type_1.Schema(fieldsFromSchema(s, dictionaryFields), customMetadata(s), version, dictionaryFields);
}
function recordBatchFromMessage(version, b) {
    return new metadata_1.RecordBatchMetadata(version, b.length(), fieldNodesFromRecordBatch(b), buffersFromRecordBatch(b, version));
}
function dictionaryBatchFromMessage(version, d) {
    return new metadata_1.DictionaryBatch(version, recordBatchFromMessage(version, d.data()), d.id(), d.isDelta());
}
function dictionaryBatchesFromFooter(f) {
    const blocks = [];
    for (let b, i = -1, n = f && f.dictionariesLength(); ++i < n;) {
        if (b = f.dictionaries(i)) {
            blocks.push(new metadata_1.FileBlock(b.metaDataLength(), b.bodyLength(), b.offset()));
        }
    }
    return blocks;
}
function recordBatchesFromFooter(f) {
    const blocks = [];
    for (let b, i = -1, n = f && f.recordBatchesLength(); ++i < n;) {
        if (b = f.recordBatches(i)) {
            blocks.push(new metadata_1.FileBlock(b.metaDataLength(), b.bodyLength(), b.offset()));
        }
    }
    return blocks;
}
function fieldsFromSchema(s, dictionaryFields) {
    const fields = [];
    for (let i = -1, c, n = s && s.fieldsLength(); ++i < n;) {
        if (c = field(s.fields(i), dictionaryFields)) {
            fields.push(c);
        }
    }
    return fields;
}
function fieldsFromField(f, dictionaryFields) {
    const fields = [];
    for (let i = -1, c, n = f && f.childrenLength(); ++i < n;) {
        if (c = field(f.children(i), dictionaryFields)) {
            fields.push(c);
        }
    }
    return fields;
}
function fieldNodesFromRecordBatch(b) {
    const fieldNodes = [];
    for (let i = -1, n = b.nodesLength(); ++i < n;) {
        fieldNodes.push(fieldNodeFromRecordBatch(b.nodes(i)));
    }
    return fieldNodes;
}
function buffersFromRecordBatch(b, version) {
    const buffers = [];
    for (let i = -1, n = b.buffersLength(); ++i < n;) {
        let buffer = b.buffers(i);
        // If this Arrow buffer was written before version 4,
        // advance the buffer's bb_pos 8 bytes to skip past
        // the now-removed page id field.
        if (version < MetadataVersion.V4) {
            buffer.bb_pos += (8 * (i + 1));
        }
        buffers.push(bufferFromRecordBatch(buffer));
    }
    return buffers;
}
function field(f, dictionaryFields) {
    let name = f.name();
    let field;
    let nullable = f.nullable();
    let metadata = customMetadata(f);
    let dataType;
    let keysMeta, id;
    let dictMeta;
    if (!dictionaryFields || !(dictMeta = f.dictionary())) {
        if (dataType = typeFromField(f, fieldsFromField(f, dictionaryFields))) {
            field = new type_1.Field(name, dataType, nullable, metadata);
        }
    }
    else if (dataType = dictionaryFields.has(id = dictMeta.id().low)
        ? dictionaryFields.get(id).type.dictionary
        : typeFromField(f, fieldsFromField(f, null))) {
        dataType = new type_1.Dictionary(dataType, 
        // a dictionary index defaults to signed 32 bit int if unspecified
        (keysMeta = dictMeta.indexType()) ? intFromField(keysMeta) : new type_2.Int32(), id, dictMeta.isOrdered());
        field = new type_1.Field(name, dataType, nullable, metadata);
        dictionaryFields.has(id) || dictionaryFields.set(id, field);
    }
    return field || null;
}
function customMetadata(parent) {
    const data = new Map();
    if (parent) {
        for (let entry, key, i = -1, n = parent.customMetadataLength() | 0; ++i < n;) {
            if ((entry = parent.customMetadata(i)) && (key = entry.key()) != null) {
                data.set(key, entry.value());
            }
        }
    }
    return data;
}
function fieldNodeFromRecordBatch(f) {
    return new metadata_1.FieldMetadata(f.length(), f.nullCount());
}
function bufferFromRecordBatch(b) {
    return new metadata_1.BufferMetadata(b.offset(), b.length());
}
function typeFromField(f, children) {
    switch (f.typeType()) {
        case Type.NONE: return null;
        case Type.Null: return nullFromField(f.type(new _Null()));
        case Type.Int: return intFromField(f.type(new _Int()));
        case Type.FloatingPoint: return floatFromField(f.type(new _FloatingPoint()));
        case Type.Binary: return binaryFromField(f.type(new _Binary()));
        case Type.Utf8: return utf8FromField(f.type(new _Utf8()));
        case Type.Bool: return boolFromField(f.type(new _Bool()));
        case Type.Decimal: return decimalFromField(f.type(new _Decimal()));
        case Type.Date: return dateFromField(f.type(new _Date()));
        case Type.Time: return timeFromField(f.type(new _Time()));
        case Type.Timestamp: return timestampFromField(f.type(new _Timestamp()));
        case Type.Interval: return intervalFromField(f.type(new _Interval()));
        case Type.List: return listFromField(f.type(new _List()), children || []);
        case Type.Struct_: return structFromField(f.type(new _Struct()), children || []);
        case Type.Union: return unionFromField(f.type(new _Union()), children || []);
        case Type.FixedSizeBinary: return fixedSizeBinaryFromField(f.type(new _FixedSizeBinary()));
        case Type.FixedSizeList: return fixedSizeListFromField(f.type(new _FixedSizeList()), children || []);
        case Type.Map: return mapFromField(f.type(new _Map()), children || []);
    }
    throw new Error(`Unrecognized type ${f.typeType()}`);
}
function nullFromField(_type) { return new type_1.Null(); }
function intFromField(_type) {
    switch (_type.bitWidth()) {
        case 8: return _type.isSigned() ? new type_2.Int8() : new type_2.Uint8();
        case 16: return _type.isSigned() ? new type_2.Int16() : new type_2.Uint16();
        case 32: return _type.isSigned() ? new type_2.Int32() : new type_2.Uint32();
        case 64: return _type.isSigned() ? new type_2.Int64() : new type_2.Uint64();
    }
    return null;
}
function floatFromField(_type) {
    switch (_type.precision()) {
        case Precision.HALF: return new type_2.Float16();
        case Precision.SINGLE: return new type_2.Float32();
        case Precision.DOUBLE: return new type_2.Float64();
    }
    return null;
}
function binaryFromField(_type) { return new type_1.Binary(); }
function utf8FromField(_type) { return new type_1.Utf8(); }
function boolFromField(_type) { return new type_1.Bool(); }
function decimalFromField(_type) { return new type_1.Decimal(_type.scale(), _type.precision()); }
function dateFromField(_type) { return new type_1.Date_(_type.unit()); }
function timeFromField(_type) { return new type_1.Time(_type.unit(), _type.bitWidth()); }
function timestampFromField(_type) { return new type_1.Timestamp(_type.unit(), _type.timezone()); }
function intervalFromField(_type) { return new type_1.Interval(_type.unit()); }
function listFromField(_type, children) { return new type_1.List(children); }
function structFromField(_type, children) { return new type_1.Struct(children); }
function unionFromField(_type, children) { return new type_1.Union(_type.mode(), (_type.typeIdsArray() || []), children); }
function fixedSizeBinaryFromField(_type) { return new type_1.FixedSizeBinary(_type.byteWidth()); }
function fixedSizeListFromField(_type, children) { return new type_1.FixedSizeList(_type.listSize(), children); }
function mapFromField(_type, children) { return new type_1.Map_(_type.keysSorted(), children); }

//# sourceMappingURL=data:application/json;charset=utf8;base64,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ZUFBZSxDQUFDO0FBSTVFLElBQU8sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQ3JELElBQU8sSUFBSSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO0FBQ25ELElBQU8sY0FBYyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDO0FBQ3ZFLElBQU8sT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO0FBQ3pELElBQU8sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQ3JELElBQU8sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQ3JELElBQU8sUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO0FBQzNELElBQU8sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQ3JELElBQU8sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQ3JELElBQU8sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO0FBQy9ELElBQU8sU0FBUyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFD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QyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFFLENBQUMsQ0FBQztRQUMzRCxLQUFLLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxRQUFRLEVBQUUsQ0FBRSxDQUFDLENBQUM7UUFDcEUsS0FBSyxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFFLENBQUMsQ0FBQztRQUMzRCxLQUFLLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUUsQ0FBQyxDQUFDO1FBQzNELEtBQUssSUFBSSxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLFVBQVUsRUFBRSxDQUFFLENBQUMsQ0FBQztRQUMxRSxLQUFLLElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxTQUFTLEVBQUUsQ0FBRSxDQUFDLENBQUM7UUFDdkUsS0FBSyxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFFLEVBQUUsUUFBUSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzNFLEtBQUssSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLEVBQUUsQ0FBRSxFQUFFLFFBQVEsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNsRixLQUFLLElBQUksQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksTUFBTSxFQUFF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QUUsUUFBaUIsSUFBYyxNQUFNLENBQUMsSUFBSSxXQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQW9DLENBQUMiLCJmaWxlIjoiaXBjL3JlYWRlci9iaW5hcnkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgVmVjdG9yIH0gZnJvbSAnLi4vLi4vdmVjdG9yJztcbmltcG9ydCB7IGZsYXRidWZmZXJzIH0gZnJvbSAnZmxhdGJ1ZmZlcnMnO1xuaW1wb3J0IHsgVHlwZURhdGFMb2FkZXIgfSBmcm9tICcuL3ZlY3Rvcic7XG5pbXBvcnQgeyBjaGVja0Zvck1hZ2ljQXJyb3dTdHJpbmcsIFBBRERJTkcsIG1hZ2ljTGVuZ3RoLCBtYWdpY0FuZFBhZGRpbmcsIG1hZ2ljWDJBbmRQYWRkaW5nIH0gZnJvbSAnLi4vbWFnaWMnO1xuaW1wb3J0IHsgTWVzc2FnZSwgRm9vdGVyLCBGaWxlQmxvY2ssIFJlY29yZEJhdGNoTWV0YWRhdGEsIERpY3Rpb25hcnlCYXRjaCwgQnVmZmVyTWV0YWRhdGEsIEZpZWxkTWV0YWRhdGEsIH0gZnJvbSAnLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtcbiAgICBTY2hlbWEsIEZpZWxkLFxuICAgIERhdGFUeXBlLCBEaWN0aW9uYXJ5LFxuICAgIE51bGwsIFRpbWVCaXRXaWR0aCxcbiAgICBCaW5hcnksIEJvb2wsIFV0ZjgsIERlY2ltYWwsXG4gICAgRGF0ZV8sIFRpbWUsIFRpbWVzdGFtcCwgSW50ZXJ2YWwsXG4gICAgTGlzdCwgU3RydWN0LCBVbmlvbiwgRml4ZWRTaXplQmluYXJ5LCBGaXhlZFNpemVMaXN0LCBNYXBfLFxufSBmcm9tICcuLi8uLi90eXBlJztcblxuaW1wb3J0IHtcbiAgICBJbnQ4LCAgVWludDgsXG4gICAgSW50MTYsIFVpbnQxNixcbiAgICBJbnQzMiwgVWludDMyLFxuICAgIEludDY0LCBVaW50NjQsXG4gICAgRmxvYXQxNiwgRmxvYXQ2NCwgRmxvYXQzMixcbn0gZnJvbSAnLi4vLi4vdHlwZSc7XG5cbmltcG9ydCBCeXRlQnVmZmVyID0gZmxhdGJ1ZmZlcnMuQnl0ZUJ1ZmZlcjtcblxudHlwZSBNZXNzYWdlUmVhZGVyID0gKGJiOiBCeXRlQnVmZmVyKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoTWV0YWRhdGEgfCBEaWN0aW9uYXJ5QmF0Y2g+O1xuXG5leHBvcnQgZnVuY3Rpb24qIHJlYWRCdWZmZXJzPFQgZXh0ZW5kcyBVaW50OEFycmF5IHwgQnVmZmVyIHwgc3RyaW5nPihzb3VyY2VzOiBJdGVyYWJsZTxUPiB8IFVpbnQ4QXJyYXkgfCBCdWZmZXIgfCBzdHJpbmcpIHtcbiAgICBsZXQgc2NoZW1hOiBTY2hlbWEgfCBudWxsID0gbnVsbDtcbiAgICBsZXQgZGljdGlvbmFyaWVzID0gbmV3IE1hcDxudW1iZXIsIFZlY3Rvcj4oKTtcbiAgICBsZXQgcmVhZE1lc3NhZ2VzOiBNZXNzYWdlUmVhZGVyIHwgbnVsbCA9IG51bGw7XG4gICAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyhzb3VyY2VzKSB8fCB0eXBlb2Ygc291cmNlcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgc291cmNlcyA9IFtzb3VyY2VzIGFzIFRdO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHNvdXJjZSBvZiBzb3VyY2VzKSB7XG4gICAgICAgIGNvbnN0IGJiID0gdG9CeXRlQnVmZmVyKHNvdXJjZSk7XG4gICAgICAgIGlmICgoIXNjaGVtYSAmJiAoeyBzY2hlbWEsIHJlYWRNZXNzYWdlcyB9ID0gcmVhZFNjaGVtYShiYikpIHx8IHRydWUpICYmIHNjaGVtYSAmJiByZWFkTWVzc2FnZXMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgbWVzc2FnZSBvZiByZWFkTWVzc2FnZXMoYmIpKSB7XG4gICAgICAgICAgICAgICAgeWllbGQge1xuICAgICAgICAgICAgICAgICAgICBzY2hlbWEsIG1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIGxvYWRlcjogbmV3IEJpbmFyeURhdGFMb2FkZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICBiYixcbiAgICAgICAgICAgICAgICAgICAgICAgIGFycmF5SXRlcmF0b3IobWVzc2FnZS5ub2RlcyksXG4gICAgICAgICAgICAgICAgICAgICAgICBhcnJheUl0ZXJhdG9yKG1lc3NhZ2UuYnVmZmVycyksXG4gICAgICAgICAgICAgICAgICAgICAgICBkaWN0aW9uYXJpZXNcbiAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiogcmVhZEJ1ZmZlcnNBc3luYzxUIGV4dGVuZHMgVWludDhBcnJheSB8IEJ1ZmZlciB8IHN0cmluZz4oc291cmNlczogQXN5bmNJdGVyYWJsZTxUPikge1xuICAgIGxldCBzY2hlbWE6IFNjaGVtYSB8IG51bGwgPSBudWxsO1xuICAgIGxldCBkaWN0aW9uYXJpZXMgPSBuZXcgTWFwPG51bWJlciwgVmVjdG9yPigpO1xuICAgIGxldCByZWFkTWVzc2FnZXM6IE1lc3NhZ2VSZWFkZXIgfCBudWxsID0gbnVsbDtcbiAgICBmb3IgYXdhaXQgKGNvbnN0IHNvdXJjZSBvZiBzb3VyY2VzKSB7XG4gICAgICAgIGNvbnN0IGJiID0gdG9CeXRlQnVmZmVyKHNvdXJjZSk7XG4gICAgICAgIGlmICgoIXNjaGVtYSAmJiAoeyBzY2hlbWEsIHJlYWRNZXNzYWdlcyB9ID0gcmVhZFNjaGVtYShiYikpIHx8IHRydWUpICYmIHNjaGVtYSAmJiByZWFkTWVzc2FnZXMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgbWVzc2FnZSBvZiByZWFkTWVzc2FnZXMoYmIpKSB7XG4gICAgICAgICAgICAgICAgeWllbGQge1xuICAgICAgICAgICAgICAgICAgICBzY2hlbWEsIG1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIGxvYWRlcjogbmV3IEJpbmFyeURhdGFMb2FkZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICBiYixcbiAgICAgICAgICAgICAgICAgICAgICAgIGFycmF5SXRlcmF0b3IobWVzc2FnZS5ub2RlcyksXG4gICAgICAgICAgICAgICAgICAgICAgICBhcnJheUl0ZXJhdG9yKG1lc3NhZ2UuYnVmZmVycyksXG4gICAgICAgICAgICAgICAgICAgICAgICBkaWN0aW9uYXJpZXNcbiAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBCaW5hcnlEYXRhTG9hZGVyIGV4dGVuZHMgVHlwZURhdGFMb2FkZXIge1xuICAgIHByaXZhdGUgYnl0ZXM6IFVpbnQ4QXJyYXk7XG4gICAgcHJpdmF0ZSBtZXNzYWdlT2Zmc2V0OiBudW1iZXI7XG4gICAgY29uc3RydWN0b3IoYmI6IEJ5dGVCdWZmZXIsIG5vZGVzOiBJdGVyYXRvcjxGaWVsZE1ldGFkYXRhPiwgYnVmZmVyczogSXRlcmF0b3I8QnVmZmVyTWV0YWRhdGE+LCBkaWN0aW9uYXJpZXM6IE1hcDxudW1iZXIsIFZlY3Rvcj4pIHtcbiAgICAgICAgc3VwZXIobm9kZXMsIGJ1ZmZlcnMsIGRpY3Rpb25hcmllcyk7XG4gICAgICAgIHRoaXMuYnl0ZXMgPSBiYi5ieXRlcygpO1xuICAgICAgICB0aGlzLm1lc3NhZ2VPZmZzZXQgPSBiYi5wb3NpdGlvbigpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgcmVhZE9mZnNldHM8VCBleHRlbmRzIERhdGFUeXBlPih0eXBlOiBULCBidWZmZXI/OiBCdWZmZXJNZXRhZGF0YSkgeyByZXR1cm4gdGhpcy5yZWFkRGF0YSh0eXBlLCBidWZmZXIpOyB9XG4gICAgcHJvdGVjdGVkIHJlYWRUeXBlSWRzPFQgZXh0ZW5kcyBEYXRhVHlwZT4odHlwZTogVCwgYnVmZmVyPzogQnVmZmVyTWV0YWRhdGEpIHsgcmV0dXJuIHRoaXMucmVhZERhdGEodHlwZSwgYnVmZmVyKTsgfVxuICAgIHByb3RlY3RlZCByZWFkRGF0YTxUIGV4dGVuZHMgRGF0YVR5cGU+KF90eXBlOiBULCB7IGxlbmd0aCwgb2Zmc2V0IH06IEJ1ZmZlck1ldGFkYXRhID0gdGhpcy5nZXRCdWZmZXJNZXRhZGF0YSgpKSB7XG4gICAgICAgIHJldHVybiBuZXcgVWludDhBcnJheSh0aGlzLmJ5dGVzLmJ1ZmZlciwgdGhpcy5ieXRlcy5ieXRlT2Zmc2V0ICsgdGhpcy5tZXNzYWdlT2Zmc2V0ICsgb2Zmc2V0LCBsZW5ndGgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24qIGFycmF5SXRlcmF0b3IoYXJyOiBBcnJheTxhbnk+KSB7IHlpZWxkKiBhcnI7IH1cblxuZnVuY3Rpb24gdG9CeXRlQnVmZmVyKGJ5dGVzPzogVWludDhBcnJheSB8IEJ1ZmZlciB8IHN0cmluZykge1xuICAgIGxldCBhcnI6IFVpbnQ4QXJyYXkgPSBieXRlcyBhcyBhbnkgfHwgbmV3IFVpbnQ4QXJyYXkoMCk7XG4gICAgaWYgKHR5cGVvZiBieXRlcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgYXJyID0gbmV3IFVpbnQ4QXJyYXkoYnl0ZXMubGVuZ3RoKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IC0xLCBuID0gYnl0ZXMubGVuZ3RoOyArK2kgPCBuOykge1xuICAgICAgICAgICAgYXJyW2ldID0gYnl0ZXMuY2hhckNvZGVBdChpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IEJ5dGVCdWZmZXIoYXJyKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBCeXRlQnVmZmVyKGFycik7XG59XG5cbmZ1bmN0aW9uIHJlYWRTY2hlbWEoYmI6IEJ5dGVCdWZmZXIpIHtcbiAgICBsZXQgc2NoZW1hOiBTY2hlbWEsIHJlYWRNZXNzYWdlcywgZm9vdGVyOiBGb290ZXIgfCBudWxsO1xuICAgIGlmIChmb290ZXIgPSByZWFkRmlsZVNjaGVtYShiYikpIHtcbiAgICAgICAgc2NoZW1hID0gZm9vdGVyLnNjaGVtYTtcbiAgICAgICAgcmVhZE1lc3NhZ2VzID0gcmVhZEZpbGVNZXNzYWdlcyhmb290ZXIpO1xuICAgIH0gZWxzZSBpZiAoc2NoZW1hID0gcmVhZFN0cmVhbVNjaGVtYShiYikhKSB7XG4gICAgICAgIHJlYWRNZXNzYWdlcyA9IHJlYWRTdHJlYW1NZXNzYWdlcztcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgQXJyb3cgYnVmZmVyJyk7XG4gICAgfVxuICAgIHJldHVybiB7IHNjaGVtYSwgcmVhZE1lc3NhZ2VzIH07XG59XG5cbmZ1bmN0aW9uIHJlYWRTdHJlYW1TY2hlbWEoYmI6IEJ5dGVCdWZmZXIpIHtcbiAgICBpZiAoIWNoZWNrRm9yTWFnaWNBcnJvd1N0cmluZyhiYi5ieXRlcygpLCAwKSkge1xuICAgICAgICBmb3IgKGNvbnN0IG1lc3NhZ2Ugb2YgcmVhZE1lc3NhZ2VzKGJiKSkge1xuICAgICAgICAgICAgaWYgKE1lc3NhZ2UuaXNTY2hlbWEobWVzc2FnZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWVzc2FnZSBhcyBTY2hlbWE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uKiByZWFkU3RyZWFtTWVzc2FnZXMoYmI6IEJ5dGVCdWZmZXIpIHtcbiAgICBmb3IgKGNvbnN0IG1lc3NhZ2Ugb2YgcmVhZE1lc3NhZ2VzKGJiKSkge1xuICAgICAgICBpZiAoTWVzc2FnZS5pc1JlY29yZEJhdGNoKG1lc3NhZ2UpKSB7XG4gICAgICAgICAgICB5aWVsZCBtZXNzYWdlO1xuICAgICAgICB9IGVsc2UgaWYgKE1lc3NhZ2UuaXNEaWN0aW9uYXJ5QmF0Y2gobWVzc2FnZSkpIHtcbiAgICAgICAgICAgIHlpZWxkIG1lc3NhZ2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBwb3NpdGlvbiB0aGUgYnVmZmVyIGFmdGVyIHRoZSBib2R5IHRvIHJlYWQgdGhlIG5leHQgbWVzc2FnZVxuICAgICAgICBiYi5zZXRQb3NpdGlvbihiYi5wb3NpdGlvbigpICsgbWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlYWRGaWxlU2NoZW1hKGJiOiBCeXRlQnVmZmVyKSB7XG4gICAgbGV0IGZpbGVMZW5ndGggPSBiYi5jYXBhY2l0eSgpLCBmb290ZXJMZW5ndGg6IG51bWJlciwgZm9vdGVyT2Zmc2V0OiBudW1iZXI7XG4gICAgaWYgKChmaWxlTGVuZ3RoIDwgbWFnaWNYMkFuZFBhZGRpbmcgLyogICAgICAgICAgICAgICAgICAgICBBcnJvdyBidWZmZXIgdG9vIHNtYWxsICovKSB8fFxuICAgICAgICAoIWNoZWNrRm9yTWFnaWNBcnJvd1N0cmluZyhiYi5ieXRlcygpLCAwKSAvKiAgICAgICAgICAgICAgICAgICAgICAgIE1pc3NpbmcgbWFnaWMgc3RhcnQgICAgKi8pIHx8XG4gICAgICAgICghY2hlY2tGb3JNYWdpY0Fycm93U3RyaW5nKGJiLmJ5dGVzKCksIGZpbGVMZW5ndGggLSBtYWdpY0xlbmd0aCkgLyogTWlzc2luZyBtYWdpYyBlbmQgICAgICAqLykgfHxcbiAgICAgICAgKC8qICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEludmFsaWQgZm9vdGVyIGxlbmd0aCAgKi9cbiAgICAgICAgKGZvb3Rlckxlbmd0aCA9IGJiLnJlYWRJbnQzMihmb290ZXJPZmZzZXQgPSBmaWxlTGVuZ3RoIC0gbWFnaWNBbmRQYWRkaW5nKSkgPCAxICYmXG4gICAgICAgIChmb290ZXJMZW5ndGggKyBmb290ZXJPZmZzZXQgPiBmaWxlTGVuZ3RoKSkpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGJiLnNldFBvc2l0aW9uKGZvb3Rlck9mZnNldCAtIGZvb3Rlckxlbmd0aCk7XG4gICAgcmV0dXJuIGZvb3RlckZyb21CeXRlQnVmZmVyKGJiKTtcbn1cblxuZnVuY3Rpb24gcmVhZEZpbGVNZXNzYWdlcyhmb290ZXI6IEZvb3Rlcikge1xuICAgIHJldHVybiBmdW5jdGlvbiogKGJiOiBCeXRlQnVmZmVyKSB7XG4gICAgICAgIGxldCBtZXNzYWdlOiBSZWNvcmRCYXRjaE1ldGFkYXRhIHwgRGljdGlvbmFyeUJhdGNoO1xuICAgICAgICBmb3IgKGxldCBpID0gLTEsIGJhdGNoZXMgPSBmb290ZXIuZGljdGlvbmFyeUJhdGNoZXMsIG4gPSBiYXRjaGVzLmxlbmd0aDsgKytpIDwgbjspIHtcbiAgICAgICAgICAgIGJiLnNldFBvc2l0aW9uKGJhdGNoZXNbaV0ub2Zmc2V0KTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlID0gcmVhZE1lc3NhZ2UoYmIsIGJiLnJlYWRJbnQzMihiYi5wb3NpdGlvbigpKSkgYXMgRGljdGlvbmFyeUJhdGNoKSB7XG4gICAgICAgICAgICAgICAgeWllbGQgbWVzc2FnZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gLTEsIGJhdGNoZXMgPSBmb290ZXIucmVjb3JkQmF0Y2hlcywgbiA9IGJhdGNoZXMubGVuZ3RoOyArK2kgPCBuOykge1xuICAgICAgICAgICAgYmIuc2V0UG9zaXRpb24oYmF0Y2hlc1tpXS5vZmZzZXQpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UgPSByZWFkTWVzc2FnZShiYiwgYmIucmVhZEludDMyKGJiLnBvc2l0aW9uKCkpKSBhcyBSZWNvcmRCYXRjaE1ldGFkYXRhKSB7XG4gICAgICAgICAgICAgICAgeWllbGQgbWVzc2FnZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG59XG5cbmZ1bmN0aW9uKiByZWFkTWVzc2FnZXMoYmI6IEJ5dGVCdWZmZXIpIHtcbiAgICBsZXQgbGVuZ3RoOiBudW1iZXIsIG1lc3NhZ2U6IFNjaGVtYSB8IFJlY29yZEJhdGNoTWV0YWRhdGEgfCBEaWN0aW9uYXJ5QmF0Y2g7XG4gICAgd2hpbGUgKGJiLnBvc2l0aW9uKCkgPCBiYi5jYXBhY2l0eSgpICYmXG4gICAgICAgICAgKGxlbmd0aCA9IGJiLnJlYWRJbnQzMihiYi5wb3NpdGlvbigpKSkgPiAwKSB7XG4gICAgICAgIGlmIChtZXNzYWdlID0gcmVhZE1lc3NhZ2UoYmIsIGxlbmd0aCkhKSB7XG4gICAgICAgICAgICB5aWVsZCBtZXNzYWdlO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiByZWFkTWVzc2FnZShiYjogQnl0ZUJ1ZmZlciwgbGVuZ3RoOiBudW1iZXIpIHtcbiAgICBiYi5zZXRQb3NpdGlvbihiYi5wb3NpdGlvbigpICsgUEFERElORyk7XG4gICAgY29uc3QgbWVzc2FnZSA9IG1lc3NhZ2VGcm9tQnl0ZUJ1ZmZlcihiYik7XG4gICAgYmIuc2V0UG9zaXRpb24oYmIucG9zaXRpb24oKSArIGxlbmd0aCk7XG4gICAgcmV0dXJuIG1lc3NhZ2U7XG59XG5cbmltcG9ydCAqIGFzIEZpbGVfIGZyb20gJy4uLy4uL2ZiL0ZpbGUnO1xuaW1wb3J0ICogYXMgU2NoZW1hXyBmcm9tICcuLi8uLi9mYi9TY2hlbWEnO1xuaW1wb3J0ICogYXMgTWVzc2FnZV8gZnJvbSAnLi4vLi4vZmIvTWVzc2FnZSc7XG5cbmltcG9ydCBUeXBlID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVHlwZTtcbmltcG9ydCBQcmVjaXNpb24gPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5QcmVjaXNpb247XG5pbXBvcnQgTWVzc2FnZUhlYWRlciA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NZXNzYWdlSGVhZGVyO1xuaW1wb3J0IE1ldGFkYXRhVmVyc2lvbiA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk1ldGFkYXRhVmVyc2lvbjtcbmltcG9ydCBfRm9vdGVyID0gRmlsZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZvb3RlcjtcbmltcG9ydCBfQmxvY2sgPSBGaWxlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuQmxvY2s7XG5pbXBvcnQgX01lc3NhZ2UgPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTWVzc2FnZTtcbmltcG9ydCBfU2NoZW1hID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuU2NoZW1hO1xuaW1wb3J0IF9GaWVsZCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpZWxkO1xuaW1wb3J0IF9SZWNvcmRCYXRjaCA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5SZWNvcmRCYXRjaDtcbmltcG9ydCBfRGljdGlvbmFyeUJhdGNoID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRpY3Rpb25hcnlCYXRjaDtcbmltcG9ydCBfRmllbGROb2RlID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpZWxkTm9kZTtcbmltcG9ydCBfQnVmZmVyID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuQnVmZmVyO1xuaW1wb3J0IF9EaWN0aW9uYXJ5RW5jb2RpbmcgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EaWN0aW9uYXJ5RW5jb2Rpbmc7XG5pbXBvcnQgX051bGwgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5OdWxsO1xuaW1wb3J0IF9JbnQgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5JbnQ7XG5pbXBvcnQgX0Zsb2F0aW5nUG9pbnQgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GbG9hdGluZ1BvaW50O1xuaW1wb3J0IF9CaW5hcnkgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5CaW5hcnk7XG5pbXBvcnQgX0Jvb2wgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5Cb29sO1xuaW1wb3J0IF9VdGY4ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVXRmODtcbmltcG9ydCBfRGVjaW1hbCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRlY2ltYWw7XG5pbXBvcnQgX0RhdGUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EYXRlO1xuaW1wb3J0IF9UaW1lID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVGltZTtcbmltcG9ydCBfVGltZXN0YW1wID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVGltZXN0YW1wO1xuaW1wb3J0IF9JbnRlcnZhbCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkludGVydmFsO1xuaW1wb3J0IF9MaXN0ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTGlzdDtcbmltcG9ydCBfU3RydWN0ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuU3RydWN0XztcbmltcG9ydCBfVW5pb24gPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5VbmlvbjtcbmltcG9ydCBfRml4ZWRTaXplQmluYXJ5ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRml4ZWRTaXplQmluYXJ5O1xuaW1wb3J0IF9GaXhlZFNpemVMaXN0ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRml4ZWRTaXplTGlzdDtcbmltcG9ydCBfTWFwID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTWFwO1xuXG5mdW5jdGlvbiBmb290ZXJGcm9tQnl0ZUJ1ZmZlcihiYjogQnl0ZUJ1ZmZlcikge1xuICAgIGNvbnN0IGRpY3Rpb25hcnlGaWVsZHMgPSBuZXcgTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeT4+KCk7XG4gICAgY29uc3QgZiA9IF9Gb290ZXIuZ2V0Um9vdEFzRm9vdGVyKGJiKSwgcyA9IGYuc2NoZW1hKCkhO1xuICAgIHJldHVybiBuZXcgRm9vdGVyKFxuICAgICAgICBkaWN0aW9uYXJ5QmF0Y2hlc0Zyb21Gb290ZXIoZiksIHJlY29yZEJhdGNoZXNGcm9tRm9vdGVyKGYpLFxuICAgICAgICBuZXcgU2NoZW1hKGZpZWxkc0Zyb21TY2hlbWEocywgZGljdGlvbmFyeUZpZWxkcyksIGN1c3RvbU1ldGFkYXRhKHMpLCBmLnZlcnNpb24oKSwgZGljdGlvbmFyeUZpZWxkcylcbiAgICApO1xufVxuXG5mdW5jdGlvbiBtZXNzYWdlRnJvbUJ5dGVCdWZmZXIoYmI6IEJ5dGVCdWZmZXIpIHtcbiAgICBjb25zdCBtID0gX01lc3NhZ2UuZ2V0Um9vdEFzTWVzc2FnZShiYikhLCB0eXBlID0gbS5oZWFkZXJUeXBlKCksIHZlcnNpb24gPSBtLnZlcnNpb24oKTtcbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLlNjaGVtYTogcmV0dXJuIHNjaGVtYUZyb21NZXNzYWdlKHZlcnNpb24sIG0uaGVhZGVyKG5ldyBfU2NoZW1hKCkpISwgbmV3IE1hcCgpKTtcbiAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoOiByZXR1cm4gcmVjb3JkQmF0Y2hGcm9tTWVzc2FnZSh2ZXJzaW9uLCBtLmhlYWRlcihuZXcgX1JlY29yZEJhdGNoKCkpISk7XG4gICAgICAgIGNhc2UgTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2g6IHJldHVybiBkaWN0aW9uYXJ5QmF0Y2hGcm9tTWVzc2FnZSh2ZXJzaW9uLCBtLmhlYWRlcihuZXcgX0RpY3Rpb25hcnlCYXRjaCgpKSEpO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgICAvLyB0aHJvdyBuZXcgRXJyb3IoYFVucmVjb2duaXplZCBNZXNzYWdlIHR5cGUgJyR7dHlwZX0nYCk7XG59XG5cbmZ1bmN0aW9uIHNjaGVtYUZyb21NZXNzYWdlKHZlcnNpb246IE1ldGFkYXRhVmVyc2lvbiwgczogX1NjaGVtYSwgZGljdGlvbmFyeUZpZWxkczogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeT4+KSB7XG4gICAgcmV0dXJuIG5ldyBTY2hlbWEoZmllbGRzRnJvbVNjaGVtYShzLCBkaWN0aW9uYXJ5RmllbGRzKSwgY3VzdG9tTWV0YWRhdGEocyksIHZlcnNpb24sIGRpY3Rpb25hcnlGaWVsZHMpO1xufVxuXG5mdW5jdGlvbiByZWNvcmRCYXRjaEZyb21NZXNzYWdlKHZlcnNpb246IE1ldGFkYXRhVmVyc2lvbiwgYjogX1JlY29yZEJhdGNoKSB7XG4gICAgcmV0dXJuIG5ldyBSZWNvcmRCYXRjaE1ldGFkYXRhKHZlcnNpb24sIGIubGVuZ3RoKCksIGZpZWxkTm9kZXNGcm9tUmVjb3JkQmF0Y2goYiksIGJ1ZmZlcnNGcm9tUmVjb3JkQmF0Y2goYiwgdmVyc2lvbikpO1xufVxuXG5mdW5jdGlvbiBkaWN0aW9uYXJ5QmF0Y2hGcm9tTWVzc2FnZSh2ZXJzaW9uOiBNZXRhZGF0YVZlcnNpb24sIGQ6IF9EaWN0aW9uYXJ5QmF0Y2gpIHtcbiAgICByZXR1cm4gbmV3IERpY3Rpb25hcnlCYXRjaCh2ZXJzaW9uLCByZWNvcmRCYXRjaEZyb21NZXNzYWdlKHZlcnNpb24sIGQuZGF0YSgpISksIGQuaWQoKSwgZC5pc0RlbHRhKCkpO1xufVxuXG5mdW5jdGlvbiBkaWN0aW9uYXJ5QmF0Y2hlc0Zyb21Gb290ZXIoZjogX0Zvb3Rlcikge1xuICAgIGNvbnN0IGJsb2NrcyA9IFtdIGFzIEZpbGVCbG9ja1tdO1xuICAgIGZvciAobGV0IGI6IF9CbG9jaywgaSA9IC0xLCBuID0gZiAmJiBmLmRpY3Rpb25hcmllc0xlbmd0aCgpOyArK2kgPCBuOykge1xuICAgICAgICBpZiAoYiA9IGYuZGljdGlvbmFyaWVzKGkpISkge1xuICAgICAgICAgICAgYmxvY2tzLnB1c2gobmV3IEZpbGVCbG9jayhiLm1ldGFEYXRhTGVuZ3RoKCksIGIuYm9keUxlbmd0aCgpLCBiLm9mZnNldCgpKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGJsb2Nrcztcbn1cblxuZnVuY3Rpb24gcmVjb3JkQmF0Y2hlc0Zyb21Gb290ZXIoZjogX0Zvb3Rlcikge1xuICAgIGNvbnN0IGJsb2NrcyA9IFtdIGFzIEZpbGVCbG9ja1tdO1xuICAgIGZvciAobGV0IGI6IF9CbG9jaywgaSA9IC0xLCBuID0gZiAmJiBmLnJlY29yZEJhdGNoZXNMZW5ndGgoKTsgKytpIDwgbjspIHtcbiAgICAgICAgaWYgKGIgPSBmLnJlY29yZEJhdGNoZXMoaSkhKSB7XG4gICAgICAgICAgICBibG9ja3MucHVzaChuZXcgRmlsZUJsb2NrKGIubWV0YURhdGFMZW5ndGgoKSwgYi5ib2R5TGVuZ3RoKCksIGIub2Zmc2V0KCkpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYmxvY2tzO1xufVxuXG5mdW5jdGlvbiBmaWVsZHNGcm9tU2NoZW1hKHM6IF9TY2hlbWEsIGRpY3Rpb25hcnlGaWVsZHM6IE1hcDxudW1iZXIsIEZpZWxkPERpY3Rpb25hcnk+PiB8IG51bGwpIHtcbiAgICBjb25zdCBmaWVsZHMgPSBbXSBhcyBGaWVsZFtdO1xuICAgIGZvciAobGV0IGkgPSAtMSwgYzogRmllbGQgfCBudWxsLCBuID0gcyAmJiBzLmZpZWxkc0xlbmd0aCgpOyArK2kgPCBuOykge1xuICAgICAgICBpZiAoYyA9IGZpZWxkKHMuZmllbGRzKGkpISwgZGljdGlvbmFyeUZpZWxkcykpIHtcbiAgICAgICAgICAgIGZpZWxkcy5wdXNoKGMpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmaWVsZHM7XG59XG5cbmZ1bmN0aW9uIGZpZWxkc0Zyb21GaWVsZChmOiBfRmllbGQsIGRpY3Rpb25hcnlGaWVsZHM6IE1hcDxudW1iZXIsIEZpZWxkPERpY3Rpb25hcnk+PiB8IG51bGwpIHtcbiAgICBjb25zdCBmaWVsZHMgPSBbXSBhcyBGaWVsZFtdO1xuICAgIGZvciAobGV0IGkgPSAtMSwgYzogRmllbGQgfCBudWxsLCBuID0gZiAmJiBmLmNoaWxkcmVuTGVuZ3RoKCk7ICsraSA8IG47KSB7XG4gICAgICAgIGlmIChjID0gZmllbGQoZi5jaGlsZHJlbihpKSEsIGRpY3Rpb25hcnlGaWVsZHMpKSB7XG4gICAgICAgICAgICBmaWVsZHMucHVzaChjKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmllbGRzO1xufVxuXG5mdW5jdGlvbiBmaWVsZE5vZGVzRnJvbVJlY29yZEJhdGNoKGI6IF9SZWNvcmRCYXRjaCkge1xuICAgIGNvbnN0IGZpZWxkTm9kZXMgPSBbXSBhcyBGaWVsZE1ldGFkYXRhW107XG4gICAgZm9yIChsZXQgaSA9IC0xLCBuID0gYi5ub2Rlc0xlbmd0aCgpOyArK2kgPCBuOykge1xuICAgICAgICBmaWVsZE5vZGVzLnB1c2goZmllbGROb2RlRnJvbVJlY29yZEJhdGNoKGIubm9kZXMoaSkhKSk7XG4gICAgfVxuICAgIHJldHVybiBmaWVsZE5vZGVzO1xufVxuXG5mdW5jdGlvbiBidWZmZXJzRnJvbVJlY29yZEJhdGNoKGI6IF9SZWNvcmRCYXRjaCwgdmVyc2lvbjogTWV0YWRhdGFWZXJzaW9uKSB7XG4gICAgY29uc3QgYnVmZmVycyA9IFtdIGFzIEJ1ZmZlck1ldGFkYXRhW107XG4gICAgZm9yIChsZXQgaSA9IC0xLCBuID0gYi5idWZmZXJzTGVuZ3RoKCk7ICsraSA8IG47KSB7XG4gICAgICAgIGxldCBidWZmZXIgPSBiLmJ1ZmZlcnMoaSkhO1xuICAgICAgICAvLyBJZiB0aGlzIEFycm93IGJ1ZmZlciB3YXMgd3JpdHRlbiBiZWZvcmUgdmVyc2lvbiA0LFxuICAgICAgICAvLyBhZHZhbmNlIHRoZSBidWZmZXIncyBiYl9wb3MgOCBieXRlcyB0byBza2lwIHBhc3RcbiAgICAgICAgLy8gdGhlIG5vdy1yZW1vdmVkIHBhZ2UgaWQgZmllbGQuXG4gICAgICAgIGlmICh2ZXJzaW9uIDwgTWV0YWRhdGFWZXJzaW9uLlY0KSB7XG4gICAgICAgICAgICBidWZmZXIuYmJfcG9zICs9ICg4ICogKGkgKyAxKSk7XG4gICAgICAgIH1cbiAgICAgICAgYnVmZmVycy5wdXNoKGJ1ZmZlckZyb21SZWNvcmRCYXRjaChidWZmZXIpKTtcbiAgICB9XG4gICAgcmV0dXJuIGJ1ZmZlcnM7XG59XG5cbmZ1bmN0aW9uIGZpZWxkKGY6IF9GaWVsZCwgZGljdGlvbmFyeUZpZWxkczogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeT4+IHwgbnVsbCkge1xuICAgIGxldCBuYW1lID0gZi5uYW1lKCkhO1xuICAgIGxldCBmaWVsZDogRmllbGQgfCB2b2lkO1xuICAgIGxldCBudWxsYWJsZSA9IGYubnVsbGFibGUoKTtcbiAgICBsZXQgbWV0YWRhdGEgPSBjdXN0b21NZXRhZGF0YShmKTtcbiAgICBsZXQgZGF0YVR5cGU6IERhdGFUeXBlPGFueT4gfCBudWxsO1xuICAgIGxldCBrZXlzTWV0YTogX0ludCB8IG51bGwsIGlkOiBudW1iZXI7XG4gICAgbGV0IGRpY3RNZXRhOiBfRGljdGlvbmFyeUVuY29kaW5nIHwgbnVsbDtcbiAgICBpZiAoIWRpY3Rpb25hcnlGaWVsZHMgfHwgIShkaWN0TWV0YSA9IGYuZGljdGlvbmFyeSgpKSkge1xuICAgICAgICBpZiAoZGF0YVR5cGUgPSB0eXBlRnJvbUZpZWxkKGYsIGZpZWxkc0Zyb21GaWVsZChmLCBkaWN0aW9uYXJ5RmllbGRzKSkpIHtcbiAgICAgICAgICAgIGZpZWxkID0gbmV3IEZpZWxkKG5hbWUsIGRhdGFUeXBlLCBudWxsYWJsZSwgbWV0YWRhdGEpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChkYXRhVHlwZSA9IGRpY3Rpb25hcnlGaWVsZHMuaGFzKGlkID0gZGljdE1ldGEuaWQoKS5sb3cpXG4gICAgICAgICAgICAgICAgICAgICAgICA/IGRpY3Rpb25hcnlGaWVsZHMuZ2V0KGlkKSEudHlwZS5kaWN0aW9uYXJ5XG4gICAgICAgICAgICAgICAgICAgICAgICA6IHR5cGVGcm9tRmllbGQoZiwgZmllbGRzRnJvbUZpZWxkKGYsIG51bGwpKSkge1xuICAgICAgICBkYXRhVHlwZSA9IG5ldyBEaWN0aW9uYXJ5KGRhdGFUeXBlLFxuICAgICAgICAgICAgLy8gYSBkaWN0aW9uYXJ5IGluZGV4IGRlZmF1bHRzIHRvIHNpZ25lZCAzMiBiaXQgaW50IGlmIHVuc3BlY2lmaWVkXG4gICAgICAgICAgICAoa2V5c01ldGEgPSBkaWN0TWV0YS5pbmRleFR5cGUoKSkgPyBpbnRGcm9tRmllbGQoa2V5c01ldGEpISA6IG5ldyBJbnQzMigpLFxuICAgICAgICAgICAgaWQsIGRpY3RNZXRhLmlzT3JkZXJlZCgpXG4gICAgICAgICk7XG4gICAgICAgIGZpZWxkID0gbmV3IEZpZWxkKG5hbWUsIGRhdGFUeXBlLCBudWxsYWJsZSwgbWV0YWRhdGEpO1xuICAgICAgICBkaWN0aW9uYXJ5RmllbGRzLmhhcyhpZCkgfHwgZGljdGlvbmFyeUZpZWxkcy5zZXQoaWQsIGZpZWxkIGFzIEZpZWxkPERpY3Rpb25hcnk+KTtcbiAgICB9XG4gICAgcmV0dXJuIGZpZWxkIHx8IG51bGw7XG59XG5cbmZ1bmN0aW9uIGN1c3RvbU1ldGFkYXRhKHBhcmVudD86IF9TY2hlbWEgfCBfRmllbGQgfCBudWxsKSB7XG4gICAgY29uc3QgZGF0YSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgaWYgKHBhcmVudCkge1xuICAgICAgICBmb3IgKGxldCBlbnRyeSwga2V5LCBpID0gLTEsIG4gPSBwYXJlbnQuY3VzdG9tTWV0YWRhdGFMZW5ndGgoKSB8IDA7ICsraSA8IG47KSB7XG4gICAgICAgICAgICBpZiAoKGVudHJ5ID0gcGFyZW50LmN1c3RvbU1ldGFkYXRhKGkpKSAmJiAoa2V5ID0gZW50cnkua2V5KCkpICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBkYXRhLnNldChrZXksIGVudHJ5LnZhbHVlKCkhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbn1cblxuZnVuY3Rpb24gZmllbGROb2RlRnJvbVJlY29yZEJhdGNoKGY6IF9GaWVsZE5vZGUpIHtcbiAgICByZXR1cm4gbmV3IEZpZWxkTWV0YWRhdGEoZi5sZW5ndGgoKSwgZi5udWxsQ291bnQoKSk7XG59XG5cbmZ1bmN0aW9uIGJ1ZmZlckZyb21SZWNvcmRCYXRjaChiOiBfQnVmZmVyKSB7XG4gICAgcmV0dXJuIG5ldyBCdWZmZXJNZXRhZGF0YShiLm9mZnNldCgpLCBiLmxlbmd0aCgpKTtcbn1cblxuZnVuY3Rpb24gdHlwZUZyb21GaWVsZChmOiBfRmllbGQsIGNoaWxkcmVuPzogRmllbGRbXSk6IERhdGFUeXBlPGFueT4gfCBudWxsIHtcbiAgICBzd2l0Y2ggKGYudHlwZVR5cGUoKSkge1xuICAgICAgICBjYXNlIFR5cGUuTk9ORTogcmV0dXJuIG51bGw7XG4gICAgICAgIGNhc2UgVHlwZS5OdWxsOiByZXR1cm4gbnVsbEZyb21GaWVsZChmLnR5cGUobmV3IF9OdWxsKCkpISk7XG4gICAgICAgIGNhc2UgVHlwZS5JbnQ6IHJldHVybiBpbnRGcm9tRmllbGQoZi50eXBlKG5ldyBfSW50KCkpISk7XG4gICAgICAgIGNhc2UgVHlwZS5GbG9hdGluZ1BvaW50OiByZXR1cm4gZmxvYXRGcm9tRmllbGQoZi50eXBlKG5ldyBfRmxvYXRpbmdQb2ludCgpKSEpO1xuICAgICAgICBjYXNlIFR5cGUuQmluYXJ5OiByZXR1cm4gYmluYXJ5RnJvbUZpZWxkKGYudHlwZShuZXcgX0JpbmFyeSgpKSEpO1xuICAgICAgICBjYXNlIFR5cGUuVXRmODogcmV0dXJuIHV0ZjhGcm9tRmllbGQoZi50eXBlKG5ldyBfVXRmOCgpKSEpO1xuICAgICAgICBjYXNlIFR5cGUuQm9vbDogcmV0dXJuIGJvb2xGcm9tRmllbGQoZi50eXBlKG5ldyBfQm9vbCgpKSEpO1xuICAgICAgICBjYXNlIFR5cGUuRGVjaW1hbDogcmV0dXJuIGRlY2ltYWxGcm9tRmllbGQoZi50eXBlKG5ldyBfRGVjaW1hbCgpKSEpO1xuICAgICAgICBjYXNlIFR5cGUuRGF0ZTogcmV0dXJuIGRhdGVGcm9tRmllbGQoZi50eXBlKG5ldyBfRGF0ZSgpKSEpO1xuICAgICAgICBjYXNlIFR5cGUuVGltZTogcmV0dXJuIHRpbWVGcm9tRmllbGQoZi50eXBlKG5ldyBfVGltZSgpKSEpO1xuICAgICAgICBjYXNlIFR5cGUuVGltZXN0YW1wOiByZXR1cm4gdGltZXN0YW1wRnJvbUZpZWxkKGYudHlwZShuZXcgX1RpbWVzdGFtcCgpKSEpO1xuICAgICAgICBjYXNlIFR5cGUuSW50ZXJ2YWw6IHJldHVybiBpbnRlcnZhbEZyb21GaWVsZChmLnR5cGUobmV3IF9JbnRlcnZhbCgpKSEpO1xuICAgICAgICBjYXNlIFR5cGUuTGlzdDogcmV0dXJuIGxpc3RGcm9tRmllbGQoZi50eXBlKG5ldyBfTGlzdCgpKSEsIGNoaWxkcmVuIHx8IFtdKTtcbiAgICAgICAgY2FzZSBUeXBlLlN0cnVjdF86IHJldHVybiBzdHJ1Y3RGcm9tRmllbGQoZi50eXBlKG5ldyBfU3RydWN0KCkpISwgY2hpbGRyZW4gfHwgW10pO1xuICAgICAgICBjYXNlIFR5cGUuVW5pb246IHJldHVybiB1bmlvbkZyb21GaWVsZChmLnR5cGUobmV3IF9VbmlvbigpKSEsIGNoaWxkcmVuIHx8IFtdKTtcbiAgICAgICAgY2FzZSBUeXBlLkZpeGVkU2l6ZUJpbmFyeTogcmV0dXJuIGZpeGVkU2l6ZUJpbmFyeUZyb21GaWVsZChmLnR5cGUobmV3IF9GaXhlZFNpemVCaW5hcnkoKSkhKTtcbiAgICAgICAgY2FzZSBUeXBlLkZpeGVkU2l6ZUxpc3Q6IHJldHVybiBmaXhlZFNpemVMaXN0RnJvbUZpZWxkKGYudHlwZShuZXcgX0ZpeGVkU2l6ZUxpc3QoKSkhLCBjaGlsZHJlbiB8fCBbXSk7XG4gICAgICAgIGNhc2UgVHlwZS5NYXA6IHJldHVybiBtYXBGcm9tRmllbGQoZi50eXBlKG5ldyBfTWFwKCkpISwgY2hpbGRyZW4gfHwgW10pO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVucmVjb2duaXplZCB0eXBlICR7Zi50eXBlVHlwZSgpfWApO1xufVxuXG5mdW5jdGlvbiBudWxsRnJvbUZpZWxkICAgICAgICAgICAoX3R5cGU6IF9OdWxsKSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyByZXR1cm4gbmV3IE51bGwoKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuZnVuY3Rpb24gaW50RnJvbUZpZWxkICAgICAgICAgICAgKF90eXBlOiBfSW50KSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgc3dpdGNoIChfdHlwZS5iaXRXaWR0aCgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAgODogcmV0dXJuIF90eXBlLmlzU2lnbmVkKCkgPyBuZXcgIEludDgoKSA6IG5ldyAgVWludDgoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDE2OiByZXR1cm4gX3R5cGUuaXNTaWduZWQoKSA/IG5ldyBJbnQxNigpIDogbmV3IFVpbnQxNigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMzI6IHJldHVybiBfdHlwZS5pc1NpZ25lZCgpID8gbmV3IEludDMyKCkgOiBuZXcgVWludDMyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSA2NDogcmV0dXJuIF90eXBlLmlzU2lnbmVkKCkgPyBuZXcgSW50NjQoKSA6IG5ldyBVaW50NjQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5mdW5jdGlvbiBmbG9hdEZyb21GaWVsZCAgICAgICAgICAoX3R5cGU6IF9GbG9hdGluZ1BvaW50KSAgICAgICAgICAgICAgICAgICAgeyBzd2l0Y2ggKF90eXBlLnByZWNpc2lvbigpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBQcmVjaXNpb24uSEFMRjogcmV0dXJuIG5ldyBGbG9hdDE2KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBQcmVjaXNpb24uU0lOR0xFOiByZXR1cm4gbmV3IEZsb2F0MzIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFByZWNpc2lvbi5ET1VCTEU6IHJldHVybiBuZXcgRmxvYXQ2NCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbmZ1bmN0aW9uIGJpbmFyeUZyb21GaWVsZCAgICAgICAgIChfdHlwZTogX0JpbmFyeSkgICAgICAgICAgICAgICAgICAgICAgICAgICB7IHJldHVybiBuZXcgQmluYXJ5KCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5mdW5jdGlvbiB1dGY4RnJvbUZpZWxkICAgICAgICAgICAoX3R5cGU6IF9VdGY4KSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyByZXR1cm4gbmV3IFV0ZjgoKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuZnVuY3Rpb24gYm9vbEZyb21GaWVsZCAgICAgICAgICAgKF90eXBlOiBfQm9vbCkgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgcmV0dXJuIG5ldyBCb29sKCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbmZ1bmN0aW9uIGRlY2ltYWxGcm9tRmllbGQgICAgICAgIChfdHlwZTogX0RlY2ltYWwpICAgICAgICAgICAgICAgICAgICAgICAgICB7IHJldHVybiBuZXcgRGVjaW1hbChfdHlwZS5zY2FsZSgpLCBfdHlwZS5wcmVjaXNpb24oKSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5mdW5jdGlvbiBkYXRlRnJvbUZpZWxkICAgICAgICAgICAoX3R5cGU6IF9EYXRlKSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyByZXR1cm4gbmV3IERhdGVfKF90eXBlLnVuaXQoKSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuZnVuY3Rpb24gdGltZUZyb21GaWVsZCAgICAgICAgICAgKF90eXBlOiBfVGltZSkgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgcmV0dXJuIG5ldyBUaW1lKF90eXBlLnVuaXQoKSwgX3R5cGUuYml0V2lkdGgoKSBhcyBUaW1lQml0V2lkdGgpOyAgICAgICAgICAgICAgICAgIH1cbmZ1bmN0aW9uIHRpbWVzdGFtcEZyb21GaWVsZCAgICAgIChfdHlwZTogX1RpbWVzdGFtcCkgICAgICAgICAgICAgICAgICAgICAgICB7IHJldHVybiBuZXcgVGltZXN0YW1wKF90eXBlLnVuaXQoKSwgX3R5cGUudGltZXpvbmUoKSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5mdW5jdGlvbiBpbnRlcnZhbEZyb21GaWVsZCAgICAgICAoX3R5cGU6IF9JbnRlcnZhbCkgICAgICAgICAgICAgICAgICAgICAgICAgeyByZXR1cm4gbmV3IEludGVydmFsKF90eXBlLnVuaXQoKSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuZnVuY3Rpb24gbGlzdEZyb21GaWVsZCAgICAgICAgICAgKF90eXBlOiBfTGlzdCwgY2hpbGRyZW46IEZpZWxkW10pICAgICAgICAgIHsgcmV0dXJuIG5ldyBMaXN0KGNoaWxkcmVuKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbmZ1bmN0aW9uIHN0cnVjdEZyb21GaWVsZCAgICAgICAgIChfdHlwZTogX1N0cnVjdCwgY2hpbGRyZW46IEZpZWxkW10pICAgICAgICB7IHJldHVybiBuZXcgU3RydWN0KGNoaWxkcmVuKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5mdW5jdGlvbiB1bmlvbkZyb21GaWVsZCAgICAgICAgICAoX3R5cGU6IF9VbmlvbiwgY2hpbGRyZW46IEZpZWxkW10pICAgICAgICAgeyByZXR1cm4gbmV3IFVuaW9uKF90eXBlLm1vZGUoKSwgKF90eXBlLnR5cGVJZHNBcnJheSgpIHx8IFtdKSBhcyBUeXBlW10sIGNoaWxkcmVuKTsgfVxuZnVuY3Rpb24gZml4ZWRTaXplQmluYXJ5RnJvbUZpZWxkKF90eXBlOiBfRml4ZWRTaXplQmluYXJ5KSAgICAgICAgICAgICAgICAgIHsgcmV0dXJuIG5ldyBGaXhlZFNpemVCaW5hcnkoX3R5cGUuYnl0ZVdpZHRoKCkpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbmZ1bmN0aW9uIGZpeGVkU2l6ZUxpc3RGcm9tRmllbGQgIChfdHlwZTogX0ZpeGVkU2l6ZUxpc3QsIGNoaWxkcmVuOiBGaWVsZFtdKSB7IHJldHVybiBuZXcgRml4ZWRTaXplTGlzdChfdHlwZS5saXN0U2l6ZSgpLCBjaGlsZHJlbik7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5mdW5jdGlvbiBtYXBGcm9tRmllbGQgICAgICAgICAgICAoX3R5cGU6IF9NYXAsIGNoaWxkcmVuOiBGaWVsZFtdKSAgICAgICAgICAgeyByZXR1cm4gbmV3IE1hcF8oX3R5cGUua2V5c1NvcnRlZCgpLCBjaGlsZHJlbik7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuIl19

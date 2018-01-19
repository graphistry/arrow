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
        if ((!schema && ({ schema, readMessages } = readSchema(bb))) && schema && readMessages) {
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
                if ((!schema && ({ schema, readMessages } = readSchema(bb))) && schema && readMessages) {
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
const PADDING = 4;
const MAGIC_STR = 'ARROW1';
const MAGIC = new Uint8Array(MAGIC_STR.length);
for (let i = 0; i < MAGIC_STR.length; i += 1 | 0) {
    MAGIC[i] = MAGIC_STR.charCodeAt(i);
}
function checkForMagicArrowString(buffer, index = 0) {
    for (let i = -1, n = MAGIC.length; ++i < n;) {
        if (MAGIC[i] !== buffer[index + i]) {
            return false;
        }
    }
    return true;
}
const magicLength = MAGIC.length;
const magicAndPadding = magicLength + PADDING;
const magicX2AndPadding = magicLength * 2 + PADDING;
function readStreamSchema(bb) {
    if (!checkForMagicArrowString(bb.bytes(), 0)) {
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
    if ((fileLength < magicX2AndPadding /*                     Arrow buffer too small */) ||
        (!checkForMagicArrowString(bb.bytes(), 0) /*                        Missing magic start    */) ||
        (!checkForMagicArrowString(bb.bytes(), fileLength - magicLength) /* Missing magic end      */) ||
        ((footerLength = bb.readInt32(footerOffset = fileLength - magicAndPadding)) < 1 &&
            (footerLength + magicX2AndPadding > fileLength))) {
        return null;
    }
    bb.setPosition(footerOffset - footerLength);
    return footerFromByteBuffer(bb);
}
function readFileMessages(footer) {
    return function* (bb) {
        for (let i = -1, batches = footer.dictionaryBatches, n = batches.length; ++i < n;) {
            bb.setPosition(batches[i].offset.low);
            yield readMessage(bb, bb.readInt32(bb.position()));
        }
        for (let i = -1, batches = footer.recordBatches, n = batches.length; ++i < n;) {
            bb.setPosition(batches[i].offset.low);
            yield readMessage(bb, bb.readInt32(bb.position()));
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
    bb.setPosition(bb.position() + PADDING);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO0FBQ3pELElBQU8sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQ3JELElBQU8sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQ3JELElBQU8sUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO0FBQzNELElBQU8sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQ3JELElBQU8sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQ3JELElBQU8sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO0FBQy9ELElBQU8sU0FBUyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDO0FBQzdELElBQU8sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQ3JELElBQU8sT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO0FBQzFELElBQU8sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO0FBQ3ZELElBQU8sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFN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Q0FBQyxJQUFJLGVBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFnRCxDQUFDO0FBQ2pLLHVCQUFrQyxLQUFZLEVBQUUsUUFBaUIsSUFBYSxNQUFNLENBQUMsSUFBSSxXQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBd0QsQ0FBQztBQUNqSyx5QkFBa0MsS0FBYyxFQUFFLFFBQWlCLElBQVcsTUFBTSxDQUFDLElBQUksYUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQXNELENBQUM7QUFDakssd0JBQWtDLEtBQWEsRUFBRSxRQUFpQixJQUFZLE1BQU0sQ0FBQyxJQUFJLFlBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLElBQUksRUFBRSxDQUFXLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pLLGtDQUFrQyxLQUF1QixJQUFxQixNQUFNLENBQUMsSUFBSSxzQkFBZSxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQW9DLENBQUM7QUFDakssZ0NBQWtDLEtBQXFCLEVBQUUsUUFBaUIsSUFBSSxNQUFNLENBQUMsSUFBSSxvQkFBYSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUE2QixDQUFDO0FBQ2pLLHNCQUFrQyxLQUFXLEVBQUUsUUFBaUIsSUFBYyxNQUFNLENBQUMsSUFBSSxXQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQW9DLENBQUMiLCJmaWxlIjoiaXBjL3JlYWRlci9iaW5hcnkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgVmVjdG9yIH0gZnJvbSAnLi4vLi4vdmVjdG9yJztcbmltcG9ydCB7IGZsYXRidWZmZXJzIH0gZnJvbSAnZmxhdGJ1ZmZlcnMnO1xuaW1wb3J0IHsgVHlwZURhdGFMb2FkZXIgfSBmcm9tICcuL3ZlY3Rvcic7XG5pbXBvcnQgeyBNZXNzYWdlLCBGb290ZXIsIEZpbGVCbG9jaywgUmVjb3JkQmF0Y2hNZXRhZGF0YSwgRGljdGlvbmFyeUJhdGNoLCBCdWZmZXJNZXRhZGF0YSwgRmllbGRNZXRhZGF0YSwgfSBmcm9tICcuLi9tZXRhZGF0YSc7XG5pbXBvcnQge1xuICAgIFNjaGVtYSwgRmllbGQsXG4gICAgRGF0YVR5cGUsIERpY3Rpb25hcnksXG4gICAgTnVsbCwgVGltZUJpdFdpZHRoLFxuICAgIEJpbmFyeSwgQm9vbCwgVXRmOCwgRGVjaW1hbCxcbiAgICBEYXRlXywgVGltZSwgVGltZXN0YW1wLCBJbnRlcnZhbCxcbiAgICBMaXN0LCBTdHJ1Y3QsIFVuaW9uLCBGaXhlZFNpemVCaW5hcnksIEZpeGVkU2l6ZUxpc3QsIE1hcF8sXG59IGZyb20gJy4uLy4uL3R5cGUnO1xuXG5pbXBvcnQge1xuICAgIEludDgsICBVaW50OCxcbiAgICBJbnQxNiwgVWludDE2LFxuICAgIEludDMyLCBVaW50MzIsXG4gICAgSW50NjQsIFVpbnQ2NCxcbiAgICBGbG9hdDE2LCBGbG9hdDY0LCBGbG9hdDMyLFxufSBmcm9tICcuLi8uLi90eXBlJztcblxuaW1wb3J0IEJ5dGVCdWZmZXIgPSBmbGF0YnVmZmVycy5CeXRlQnVmZmVyO1xuXG50eXBlIE1lc3NhZ2VSZWFkZXIgPSAoYmI6IEJ5dGVCdWZmZXIpID0+IEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2hNZXRhZGF0YSB8IERpY3Rpb25hcnlCYXRjaD47XG5cbmV4cG9ydCBmdW5jdGlvbiogcmVhZEJ1ZmZlcnM8VCBleHRlbmRzIFVpbnQ4QXJyYXkgfCBCdWZmZXIgfCBzdHJpbmc+KHNvdXJjZXM6IEl0ZXJhYmxlPFQ+IHwgVWludDhBcnJheSB8IEJ1ZmZlciB8IHN0cmluZykge1xuICAgIGxldCBzY2hlbWE6IFNjaGVtYSB8IG51bGwgPSBudWxsO1xuICAgIGxldCBkaWN0aW9uYXJpZXMgPSBuZXcgTWFwPG51bWJlciwgVmVjdG9yPigpO1xuICAgIGxldCByZWFkTWVzc2FnZXM6IE1lc3NhZ2VSZWFkZXIgfCBudWxsID0gbnVsbDtcbiAgICBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KHNvdXJjZXMpIHx8IHR5cGVvZiBzb3VyY2VzID09PSAnc3RyaW5nJykge1xuICAgICAgICBzb3VyY2VzID0gW3NvdXJjZXMgYXMgVF07XG4gICAgfVxuICAgIGZvciAoY29uc3Qgc291cmNlIG9mIHNvdXJjZXMpIHtcbiAgICAgICAgY29uc3QgYmIgPSB0b0J5dGVCdWZmZXIoc291cmNlKTtcbiAgICAgICAgaWYgKCghc2NoZW1hICYmICh7IHNjaGVtYSwgcmVhZE1lc3NhZ2VzIH0gPSByZWFkU2NoZW1hKGJiKSkpICYmIHNjaGVtYSAmJiByZWFkTWVzc2FnZXMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgbWVzc2FnZSBvZiByZWFkTWVzc2FnZXMoYmIpKSB7XG4gICAgICAgICAgICAgICAgeWllbGQge1xuICAgICAgICAgICAgICAgICAgICBzY2hlbWEsIG1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIGxvYWRlcjogbmV3IEJpbmFyeURhdGFMb2FkZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICBiYixcbiAgICAgICAgICAgICAgICAgICAgICAgIGFycmF5SXRlcmF0b3IobWVzc2FnZS5ub2RlcyksXG4gICAgICAgICAgICAgICAgICAgICAgICBhcnJheUl0ZXJhdG9yKG1lc3NhZ2UuYnVmZmVycyksXG4gICAgICAgICAgICAgICAgICAgICAgICBkaWN0aW9uYXJpZXNcbiAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiogcmVhZEJ1ZmZlcnNBc3luYzxUIGV4dGVuZHMgVWludDhBcnJheSB8IEJ1ZmZlciB8IHN0cmluZz4oc291cmNlczogQXN5bmNJdGVyYWJsZTxUPikge1xuICAgIGxldCBzY2hlbWE6IFNjaGVtYSB8IG51bGwgPSBudWxsO1xuICAgIGxldCBkaWN0aW9uYXJpZXMgPSBuZXcgTWFwPG51bWJlciwgVmVjdG9yPigpO1xuICAgIGxldCByZWFkTWVzc2FnZXM6IE1lc3NhZ2VSZWFkZXIgfCBudWxsID0gbnVsbDtcbiAgICBmb3IgYXdhaXQgKGNvbnN0IHNvdXJjZSBvZiBzb3VyY2VzKSB7XG4gICAgICAgIGNvbnN0IGJiID0gdG9CeXRlQnVmZmVyKHNvdXJjZSk7XG4gICAgICAgIGlmICgoIXNjaGVtYSAmJiAoeyBzY2hlbWEsIHJlYWRNZXNzYWdlcyB9ID0gcmVhZFNjaGVtYShiYikpKSAmJiBzY2hlbWEgJiYgcmVhZE1lc3NhZ2VzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG1lc3NhZ2Ugb2YgcmVhZE1lc3NhZ2VzKGJiKSkge1xuICAgICAgICAgICAgICAgIHlpZWxkIHtcbiAgICAgICAgICAgICAgICAgICAgc2NoZW1hLCBtZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICBsb2FkZXI6IG5ldyBCaW5hcnlEYXRhTG9hZGVyKFxuICAgICAgICAgICAgICAgICAgICAgICAgYmIsXG4gICAgICAgICAgICAgICAgICAgICAgICBhcnJheUl0ZXJhdG9yKG1lc3NhZ2Uubm9kZXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgYXJyYXlJdGVyYXRvcihtZXNzYWdlLmJ1ZmZlcnMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGljdGlvbmFyaWVzXG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgQmluYXJ5RGF0YUxvYWRlciBleHRlbmRzIFR5cGVEYXRhTG9hZGVyIHtcbiAgICBwcml2YXRlIGJ5dGVzOiBVaW50OEFycmF5O1xuICAgIHByaXZhdGUgbWVzc2FnZU9mZnNldDogbnVtYmVyO1xuICAgIGNvbnN0cnVjdG9yKGJiOiBCeXRlQnVmZmVyLCBub2RlczogSXRlcmF0b3I8RmllbGRNZXRhZGF0YT4sIGJ1ZmZlcnM6IEl0ZXJhdG9yPEJ1ZmZlck1ldGFkYXRhPiwgZGljdGlvbmFyaWVzOiBNYXA8bnVtYmVyLCBWZWN0b3I+KSB7XG4gICAgICAgIHN1cGVyKG5vZGVzLCBidWZmZXJzLCBkaWN0aW9uYXJpZXMpO1xuICAgICAgICB0aGlzLmJ5dGVzID0gYmIuYnl0ZXMoKTtcbiAgICAgICAgdGhpcy5tZXNzYWdlT2Zmc2V0ID0gYmIucG9zaXRpb24oKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHJlYWRPZmZzZXRzPFQgZXh0ZW5kcyBEYXRhVHlwZT4odHlwZTogVCwgYnVmZmVyPzogQnVmZmVyTWV0YWRhdGEpIHsgcmV0dXJuIHRoaXMucmVhZERhdGEodHlwZSwgYnVmZmVyKTsgfVxuICAgIHByb3RlY3RlZCByZWFkVHlwZUlkczxUIGV4dGVuZHMgRGF0YVR5cGU+KHR5cGU6IFQsIGJ1ZmZlcj86IEJ1ZmZlck1ldGFkYXRhKSB7IHJldHVybiB0aGlzLnJlYWREYXRhKHR5cGUsIGJ1ZmZlcik7IH1cbiAgICBwcm90ZWN0ZWQgcmVhZERhdGE8VCBleHRlbmRzIERhdGFUeXBlPihfdHlwZTogVCwgeyBsZW5ndGgsIG9mZnNldCB9OiBCdWZmZXJNZXRhZGF0YSA9IHRoaXMuZ2V0QnVmZmVyTWV0YWRhdGEoKSkge1xuICAgICAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkodGhpcy5ieXRlcy5idWZmZXIsIHRoaXMuYnl0ZXMuYnl0ZU9mZnNldCArIHRoaXMubWVzc2FnZU9mZnNldCArIG9mZnNldCwgbGVuZ3RoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uKiBhcnJheUl0ZXJhdG9yKGFycjogQXJyYXk8YW55PikgeyB5aWVsZCogYXJyOyB9XG5cbmZ1bmN0aW9uIHRvQnl0ZUJ1ZmZlcihieXRlcz86IFVpbnQ4QXJyYXkgfCBCdWZmZXIgfCBzdHJpbmcpIHtcbiAgICBsZXQgYXJyOiBVaW50OEFycmF5ID0gYnl0ZXMgYXMgYW55IHx8IG5ldyBVaW50OEFycmF5KDApO1xuICAgIGlmICh0eXBlb2YgYnl0ZXMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGFyciA9IG5ldyBVaW50OEFycmF5KGJ5dGVzLmxlbmd0aCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAtMSwgbiA9IGJ5dGVzLmxlbmd0aDsgKytpIDwgbjspIHtcbiAgICAgICAgICAgIGFycltpXSA9IGJ5dGVzLmNoYXJDb2RlQXQoaSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBCeXRlQnVmZmVyKGFycik7XG4gICAgfVxuICAgIHJldHVybiBuZXcgQnl0ZUJ1ZmZlcihhcnIpO1xufVxuXG5mdW5jdGlvbiByZWFkU2NoZW1hKGJiOiBCeXRlQnVmZmVyKSB7XG4gICAgbGV0IHNjaGVtYTogU2NoZW1hLCByZWFkTWVzc2FnZXMsIGZvb3RlcjogRm9vdGVyIHwgbnVsbDtcbiAgICBpZiAoZm9vdGVyID0gcmVhZEZpbGVTY2hlbWEoYmIpKSB7XG4gICAgICAgIHNjaGVtYSA9IGZvb3Rlci5zY2hlbWE7XG4gICAgICAgIHJlYWRNZXNzYWdlcyA9IHJlYWRGaWxlTWVzc2FnZXMoZm9vdGVyKTtcbiAgICB9IGVsc2UgaWYgKHNjaGVtYSA9IHJlYWRTdHJlYW1TY2hlbWEoYmIpISkge1xuICAgICAgICByZWFkTWVzc2FnZXMgPSByZWFkU3RyZWFtTWVzc2FnZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIEFycm93IGJ1ZmZlcicpO1xuICAgIH1cbiAgICByZXR1cm4geyBzY2hlbWEsIHJlYWRNZXNzYWdlcyB9O1xufVxuXG5jb25zdCBQQURESU5HID0gNDtcbmNvbnN0IE1BR0lDX1NUUiA9ICdBUlJPVzEnO1xuY29uc3QgTUFHSUMgPSBuZXcgVWludDhBcnJheShNQUdJQ19TVFIubGVuZ3RoKTtcbmZvciAobGV0IGkgPSAwOyBpIDwgTUFHSUNfU1RSLmxlbmd0aDsgaSArPSAxIHwgMCkge1xuICAgIE1BR0lDW2ldID0gTUFHSUNfU1RSLmNoYXJDb2RlQXQoaSk7XG59XG5cbmZ1bmN0aW9uIGNoZWNrRm9yTWFnaWNBcnJvd1N0cmluZyhidWZmZXI6IFVpbnQ4QXJyYXksIGluZGV4ID0gMCkge1xuICAgIGZvciAobGV0IGkgPSAtMSwgbiA9IE1BR0lDLmxlbmd0aDsgKytpIDwgbjspIHtcbiAgICAgICAgaWYgKE1BR0lDW2ldICE9PSBidWZmZXJbaW5kZXggKyBpXSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG5jb25zdCBtYWdpY0xlbmd0aCA9IE1BR0lDLmxlbmd0aDtcbmNvbnN0IG1hZ2ljQW5kUGFkZGluZyA9IG1hZ2ljTGVuZ3RoICsgUEFERElORztcbmNvbnN0IG1hZ2ljWDJBbmRQYWRkaW5nID0gbWFnaWNMZW5ndGggKiAyICsgUEFERElORztcblxuZnVuY3Rpb24gcmVhZFN0cmVhbVNjaGVtYShiYjogQnl0ZUJ1ZmZlcikge1xuICAgIGlmICghY2hlY2tGb3JNYWdpY0Fycm93U3RyaW5nKGJiLmJ5dGVzKCksIDApKSB7XG4gICAgICAgIGZvciAoY29uc3QgbWVzc2FnZSBvZiByZWFkTWVzc2FnZXMoYmIpKSB7XG4gICAgICAgICAgICBpZiAoTWVzc2FnZS5pc1NjaGVtYShtZXNzYWdlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBtZXNzYWdlIGFzIFNjaGVtYTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24qIHJlYWRTdHJlYW1NZXNzYWdlcyhiYjogQnl0ZUJ1ZmZlcikge1xuICAgIGZvciAoY29uc3QgbWVzc2FnZSBvZiByZWFkTWVzc2FnZXMoYmIpKSB7XG4gICAgICAgIGlmIChNZXNzYWdlLmlzUmVjb3JkQmF0Y2gobWVzc2FnZSkpIHtcbiAgICAgICAgICAgIHlpZWxkIG1lc3NhZ2U7XG4gICAgICAgIH0gZWxzZSBpZiAoTWVzc2FnZS5pc0RpY3Rpb25hcnlCYXRjaChtZXNzYWdlKSkge1xuICAgICAgICAgICAgeWllbGQgbWVzc2FnZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vIHBvc2l0aW9uIHRoZSBidWZmZXIgYWZ0ZXIgdGhlIGJvZHkgdG8gcmVhZCB0aGUgbmV4dCBtZXNzYWdlXG4gICAgICAgIGJiLnNldFBvc2l0aW9uKGJiLnBvc2l0aW9uKCkgKyBtZXNzYWdlLmJvZHlMZW5ndGgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVhZEZpbGVTY2hlbWEoYmI6IEJ5dGVCdWZmZXIpIHtcbiAgICBsZXQgZmlsZUxlbmd0aCA9IGJiLmNhcGFjaXR5KCksIGZvb3Rlckxlbmd0aDogbnVtYmVyLCBmb290ZXJPZmZzZXQ6IG51bWJlcjtcbiAgICBpZiAoKGZpbGVMZW5ndGggPCBtYWdpY1gyQW5kUGFkZGluZyAvKiAgICAgICAgICAgICAgICAgICAgIEFycm93IGJ1ZmZlciB0b28gc21hbGwgKi8pIHx8XG4gICAgICAgICghY2hlY2tGb3JNYWdpY0Fycm93U3RyaW5nKGJiLmJ5dGVzKCksIDApIC8qICAgICAgICAgICAgICAgICAgICAgICAgTWlzc2luZyBtYWdpYyBzdGFydCAgICAqLykgfHxcbiAgICAgICAgKCFjaGVja0Zvck1hZ2ljQXJyb3dTdHJpbmcoYmIuYnl0ZXMoKSwgZmlsZUxlbmd0aCAtIG1hZ2ljTGVuZ3RoKSAvKiBNaXNzaW5nIG1hZ2ljIGVuZCAgICAgICovKSB8fFxuICAgICAgICAoLyogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSW52YWxpZCBmb290ZXIgbGVuZ3RoICAqL1xuICAgICAgICAoZm9vdGVyTGVuZ3RoID0gYmIucmVhZEludDMyKGZvb3Rlck9mZnNldCA9IGZpbGVMZW5ndGggLSBtYWdpY0FuZFBhZGRpbmcpKSA8IDEgJiZcbiAgICAgICAgKGZvb3Rlckxlbmd0aCArIG1hZ2ljWDJBbmRQYWRkaW5nID4gZmlsZUxlbmd0aCkpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBiYi5zZXRQb3NpdGlvbihmb290ZXJPZmZzZXQgLSBmb290ZXJMZW5ndGgpO1xuICAgIHJldHVybiBmb290ZXJGcm9tQnl0ZUJ1ZmZlcihiYik7XG59XG5cbmZ1bmN0aW9uIHJlYWRGaWxlTWVzc2FnZXMoZm9vdGVyOiBGb290ZXIpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24qIChiYjogQnl0ZUJ1ZmZlcikge1xuICAgICAgICBmb3IgKGxldCBpID0gLTEsIGJhdGNoZXMgPSBmb290ZXIuZGljdGlvbmFyeUJhdGNoZXMsIG4gPSBiYXRjaGVzLmxlbmd0aDsgKytpIDwgbjspIHtcbiAgICAgICAgICAgIGJiLnNldFBvc2l0aW9uKGJhdGNoZXNbaV0ub2Zmc2V0Lmxvdyk7XG4gICAgICAgICAgICB5aWVsZCByZWFkTWVzc2FnZShiYiwgYmIucmVhZEludDMyKGJiLnBvc2l0aW9uKCkpKSBhcyBEaWN0aW9uYXJ5QmF0Y2g7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgaSA9IC0xLCBiYXRjaGVzID0gZm9vdGVyLnJlY29yZEJhdGNoZXMsIG4gPSBiYXRjaGVzLmxlbmd0aDsgKytpIDwgbjspIHtcbiAgICAgICAgICAgIGJiLnNldFBvc2l0aW9uKGJhdGNoZXNbaV0ub2Zmc2V0Lmxvdyk7XG4gICAgICAgICAgICB5aWVsZCByZWFkTWVzc2FnZShiYiwgYmIucmVhZEludDMyKGJiLnBvc2l0aW9uKCkpKSBhcyBSZWNvcmRCYXRjaE1ldGFkYXRhO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuZnVuY3Rpb24qIHJlYWRNZXNzYWdlcyhiYjogQnl0ZUJ1ZmZlcikge1xuICAgIGxldCBsZW5ndGg6IG51bWJlciwgbWVzc2FnZTogU2NoZW1hIHwgUmVjb3JkQmF0Y2hNZXRhZGF0YSB8IERpY3Rpb25hcnlCYXRjaDtcbiAgICB3aGlsZSAoYmIucG9zaXRpb24oKSA8IGJiLmNhcGFjaXR5KCkgJiZcbiAgICAgICAgICAobGVuZ3RoID0gYmIucmVhZEludDMyKGJiLnBvc2l0aW9uKCkpKSA+IDApIHtcbiAgICAgICAgaWYgKG1lc3NhZ2UgPSByZWFkTWVzc2FnZShiYiwgbGVuZ3RoKSEpIHtcbiAgICAgICAgICAgIHlpZWxkIG1lc3NhZ2U7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlYWRNZXNzYWdlKGJiOiBCeXRlQnVmZmVyLCBsZW5ndGg6IG51bWJlcikge1xuICAgIGJiLnNldFBvc2l0aW9uKGJiLnBvc2l0aW9uKCkgKyBQQURESU5HKTtcbiAgICBjb25zdCBtZXNzYWdlID0gbWVzc2FnZUZyb21CeXRlQnVmZmVyKGJiKTtcbiAgICBiYi5zZXRQb3NpdGlvbihiYi5wb3NpdGlvbigpICsgbGVuZ3RoKTtcbiAgICByZXR1cm4gbWVzc2FnZTtcbn1cblxuaW1wb3J0ICogYXMgRmlsZV8gZnJvbSAnLi4vLi4vZmIvRmlsZSc7XG5pbXBvcnQgKiBhcyBTY2hlbWFfIGZyb20gJy4uLy4uL2ZiL1NjaGVtYSc7XG5pbXBvcnQgKiBhcyBNZXNzYWdlXyBmcm9tICcuLi8uLi9mYi9NZXNzYWdlJztcblxuaW1wb3J0IFR5cGUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UeXBlO1xuaW1wb3J0IFByZWNpc2lvbiA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlByZWNpc2lvbjtcbmltcG9ydCBNZXNzYWdlSGVhZGVyID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk1lc3NhZ2VIZWFkZXI7XG5pbXBvcnQgTWV0YWRhdGFWZXJzaW9uID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTWV0YWRhdGFWZXJzaW9uO1xuaW1wb3J0IF9Gb290ZXIgPSBGaWxlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRm9vdGVyO1xuaW1wb3J0IF9CbG9jayA9IEZpbGVfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5CbG9jaztcbmltcG9ydCBfTWVzc2FnZSA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NZXNzYWdlO1xuaW1wb3J0IF9TY2hlbWEgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5TY2hlbWE7XG5pbXBvcnQgX0ZpZWxkID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRmllbGQ7XG5pbXBvcnQgX1JlY29yZEJhdGNoID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlJlY29yZEJhdGNoO1xuaW1wb3J0IF9EaWN0aW9uYXJ5QmF0Y2ggPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGljdGlvbmFyeUJhdGNoO1xuaW1wb3J0IF9GaWVsZE5vZGUgPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRmllbGROb2RlO1xuaW1wb3J0IF9CdWZmZXIgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5CdWZmZXI7XG5pbXBvcnQgX0RpY3Rpb25hcnlFbmNvZGluZyA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRpY3Rpb25hcnlFbmNvZGluZztcbmltcG9ydCBfTnVsbCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk51bGw7XG5pbXBvcnQgX0ludCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkludDtcbmltcG9ydCBfRmxvYXRpbmdQb2ludCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZsb2F0aW5nUG9pbnQ7XG5pbXBvcnQgX0JpbmFyeSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkJpbmFyeTtcbmltcG9ydCBfQm9vbCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkJvb2w7XG5pbXBvcnQgX1V0ZjggPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5VdGY4O1xuaW1wb3J0IF9EZWNpbWFsID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGVjaW1hbDtcbmltcG9ydCBfRGF0ZSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRhdGU7XG5pbXBvcnQgX1RpbWUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UaW1lO1xuaW1wb3J0IF9UaW1lc3RhbXAgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UaW1lc3RhbXA7XG5pbXBvcnQgX0ludGVydmFsID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuSW50ZXJ2YWw7XG5pbXBvcnQgX0xpc3QgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5MaXN0O1xuaW1wb3J0IF9TdHJ1Y3QgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5TdHJ1Y3RfO1xuaW1wb3J0IF9VbmlvbiA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlVuaW9uO1xuaW1wb3J0IF9GaXhlZFNpemVCaW5hcnkgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaXhlZFNpemVCaW5hcnk7XG5pbXBvcnQgX0ZpeGVkU2l6ZUxpc3QgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaXhlZFNpemVMaXN0O1xuaW1wb3J0IF9NYXAgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NYXA7XG5cbmZ1bmN0aW9uIGZvb3RlckZyb21CeXRlQnVmZmVyKGJiOiBCeXRlQnVmZmVyKSB7XG4gICAgY29uc3QgZGljdGlvbmFyeUZpZWxkcyA9IG5ldyBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5Pj4oKTtcbiAgICBjb25zdCBmID0gX0Zvb3Rlci5nZXRSb290QXNGb290ZXIoYmIpLCBzID0gZi5zY2hlbWEoKSE7XG4gICAgcmV0dXJuIG5ldyBGb290ZXIoXG4gICAgICAgIGRpY3Rpb25hcnlCYXRjaGVzRnJvbUZvb3RlcihmKSwgcmVjb3JkQmF0Y2hlc0Zyb21Gb290ZXIoZiksXG4gICAgICAgIG5ldyBTY2hlbWEoZmllbGRzRnJvbVNjaGVtYShzLCBkaWN0aW9uYXJ5RmllbGRzKSwgY3VzdG9tTWV0YWRhdGEocyksIGYudmVyc2lvbigpLCBkaWN0aW9uYXJ5RmllbGRzKVxuICAgICk7XG59XG5cbmZ1bmN0aW9uIG1lc3NhZ2VGcm9tQnl0ZUJ1ZmZlcihiYjogQnl0ZUJ1ZmZlcikge1xuICAgIGNvbnN0IG0gPSBfTWVzc2FnZS5nZXRSb290QXNNZXNzYWdlKGJiKSEsIHR5cGUgPSBtLmhlYWRlclR5cGUoKSwgdmVyc2lvbiA9IG0udmVyc2lvbigpO1xuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlIE1lc3NhZ2VIZWFkZXIuU2NoZW1hOiByZXR1cm4gc2NoZW1hRnJvbU1lc3NhZ2UodmVyc2lvbiwgbS5oZWFkZXIobmV3IF9TY2hlbWEoKSkhLCBuZXcgTWFwKCkpO1xuICAgICAgICBjYXNlIE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2g6IHJldHVybiByZWNvcmRCYXRjaEZyb21NZXNzYWdlKHZlcnNpb24sIG0uaGVhZGVyKG5ldyBfUmVjb3JkQmF0Y2goKSkhKTtcbiAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaDogcmV0dXJuIGRpY3Rpb25hcnlCYXRjaEZyb21NZXNzYWdlKHZlcnNpb24sIG0uaGVhZGVyKG5ldyBfRGljdGlvbmFyeUJhdGNoKCkpISk7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICAgIC8vIHRocm93IG5ldyBFcnJvcihgVW5yZWNvZ25pemVkIE1lc3NhZ2UgdHlwZSAnJHt0eXBlfSdgKTtcbn1cblxuZnVuY3Rpb24gc2NoZW1hRnJvbU1lc3NhZ2UodmVyc2lvbjogTWV0YWRhdGFWZXJzaW9uLCBzOiBfU2NoZW1hLCBkaWN0aW9uYXJ5RmllbGRzOiBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5Pj4pIHtcbiAgICByZXR1cm4gbmV3IFNjaGVtYShmaWVsZHNGcm9tU2NoZW1hKHMsIGRpY3Rpb25hcnlGaWVsZHMpLCBjdXN0b21NZXRhZGF0YShzKSwgdmVyc2lvbiwgZGljdGlvbmFyeUZpZWxkcyk7XG59XG5cbmZ1bmN0aW9uIHJlY29yZEJhdGNoRnJvbU1lc3NhZ2UodmVyc2lvbjogTWV0YWRhdGFWZXJzaW9uLCBiOiBfUmVjb3JkQmF0Y2gpIHtcbiAgICByZXR1cm4gbmV3IFJlY29yZEJhdGNoTWV0YWRhdGEodmVyc2lvbiwgYi5sZW5ndGgoKSwgZmllbGROb2Rlc0Zyb21SZWNvcmRCYXRjaChiKSwgYnVmZmVyc0Zyb21SZWNvcmRCYXRjaChiLCB2ZXJzaW9uKSk7XG59XG5cbmZ1bmN0aW9uIGRpY3Rpb25hcnlCYXRjaEZyb21NZXNzYWdlKHZlcnNpb246IE1ldGFkYXRhVmVyc2lvbiwgZDogX0RpY3Rpb25hcnlCYXRjaCkge1xuICAgIHJldHVybiBuZXcgRGljdGlvbmFyeUJhdGNoKHZlcnNpb24sIHJlY29yZEJhdGNoRnJvbU1lc3NhZ2UodmVyc2lvbiwgZC5kYXRhKCkhKSwgZC5pZCgpLCBkLmlzRGVsdGEoKSk7XG59XG5cbmZ1bmN0aW9uIGRpY3Rpb25hcnlCYXRjaGVzRnJvbUZvb3RlcihmOiBfRm9vdGVyKSB7XG4gICAgY29uc3QgYmxvY2tzID0gW10gYXMgRmlsZUJsb2NrW107XG4gICAgZm9yIChsZXQgYjogX0Jsb2NrLCBpID0gLTEsIG4gPSBmICYmIGYuZGljdGlvbmFyaWVzTGVuZ3RoKCk7ICsraSA8IG47KSB7XG4gICAgICAgIGlmIChiID0gZi5kaWN0aW9uYXJpZXMoaSkhKSB7XG4gICAgICAgICAgICBibG9ja3MucHVzaChuZXcgRmlsZUJsb2NrKGIubWV0YURhdGFMZW5ndGgoKSwgYi5ib2R5TGVuZ3RoKCksIGIub2Zmc2V0KCkpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYmxvY2tzO1xufVxuXG5mdW5jdGlvbiByZWNvcmRCYXRjaGVzRnJvbUZvb3RlcihmOiBfRm9vdGVyKSB7XG4gICAgY29uc3QgYmxvY2tzID0gW10gYXMgRmlsZUJsb2NrW107XG4gICAgZm9yIChsZXQgYjogX0Jsb2NrLCBpID0gLTEsIG4gPSBmICYmIGYucmVjb3JkQmF0Y2hlc0xlbmd0aCgpOyArK2kgPCBuOykge1xuICAgICAgICBpZiAoYiA9IGYucmVjb3JkQmF0Y2hlcyhpKSEpIHtcbiAgICAgICAgICAgIGJsb2Nrcy5wdXNoKG5ldyBGaWxlQmxvY2soYi5tZXRhRGF0YUxlbmd0aCgpLCBiLmJvZHlMZW5ndGgoKSwgYi5vZmZzZXQoKSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBibG9ja3M7XG59XG5cbmZ1bmN0aW9uIGZpZWxkc0Zyb21TY2hlbWEoczogX1NjaGVtYSwgZGljdGlvbmFyeUZpZWxkczogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeT4+IHwgbnVsbCkge1xuICAgIGNvbnN0IGZpZWxkcyA9IFtdIGFzIEZpZWxkW107XG4gICAgZm9yIChsZXQgaSA9IC0xLCBjOiBGaWVsZCB8IG51bGwsIG4gPSBzICYmIHMuZmllbGRzTGVuZ3RoKCk7ICsraSA8IG47KSB7XG4gICAgICAgIGlmIChjID0gZmllbGQocy5maWVsZHMoaSkhLCBkaWN0aW9uYXJ5RmllbGRzKSkge1xuICAgICAgICAgICAgZmllbGRzLnB1c2goYyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZpZWxkcztcbn1cblxuZnVuY3Rpb24gZmllbGRzRnJvbUZpZWxkKGY6IF9GaWVsZCwgZGljdGlvbmFyeUZpZWxkczogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeT4+IHwgbnVsbCkge1xuICAgIGNvbnN0IGZpZWxkcyA9IFtdIGFzIEZpZWxkW107XG4gICAgZm9yIChsZXQgaSA9IC0xLCBjOiBGaWVsZCB8IG51bGwsIG4gPSBmICYmIGYuY2hpbGRyZW5MZW5ndGgoKTsgKytpIDwgbjspIHtcbiAgICAgICAgaWYgKGMgPSBmaWVsZChmLmNoaWxkcmVuKGkpISwgZGljdGlvbmFyeUZpZWxkcykpIHtcbiAgICAgICAgICAgIGZpZWxkcy5wdXNoKGMpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmaWVsZHM7XG59XG5cbmZ1bmN0aW9uIGZpZWxkTm9kZXNGcm9tUmVjb3JkQmF0Y2goYjogX1JlY29yZEJhdGNoKSB7XG4gICAgY29uc3QgZmllbGROb2RlcyA9IFtdIGFzIEZpZWxkTWV0YWRhdGFbXTtcbiAgICBmb3IgKGxldCBpID0gLTEsIG4gPSBiLm5vZGVzTGVuZ3RoKCk7ICsraSA8IG47KSB7XG4gICAgICAgIGZpZWxkTm9kZXMucHVzaChmaWVsZE5vZGVGcm9tUmVjb3JkQmF0Y2goYi5ub2RlcyhpKSEpKTtcbiAgICB9XG4gICAgcmV0dXJuIGZpZWxkTm9kZXM7XG59XG5cbmZ1bmN0aW9uIGJ1ZmZlcnNGcm9tUmVjb3JkQmF0Y2goYjogX1JlY29yZEJhdGNoLCB2ZXJzaW9uOiBNZXRhZGF0YVZlcnNpb24pIHtcbiAgICBjb25zdCBidWZmZXJzID0gW10gYXMgQnVmZmVyTWV0YWRhdGFbXTtcbiAgICBmb3IgKGxldCBpID0gLTEsIG4gPSBiLmJ1ZmZlcnNMZW5ndGgoKTsgKytpIDwgbjspIHtcbiAgICAgICAgbGV0IGJ1ZmZlciA9IGIuYnVmZmVycyhpKSE7XG4gICAgICAgIC8vIElmIHRoaXMgQXJyb3cgYnVmZmVyIHdhcyB3cml0dGVuIGJlZm9yZSB2ZXJzaW9uIDQsXG4gICAgICAgIC8vIGFkdmFuY2UgdGhlIGJ1ZmZlcidzIGJiX3BvcyA4IGJ5dGVzIHRvIHNraXAgcGFzdFxuICAgICAgICAvLyB0aGUgbm93LXJlbW92ZWQgcGFnZSBpZCBmaWVsZC5cbiAgICAgICAgaWYgKHZlcnNpb24gPCBNZXRhZGF0YVZlcnNpb24uVjQpIHtcbiAgICAgICAgICAgIGJ1ZmZlci5iYl9wb3MgKz0gKDggKiAoaSArIDEpKTtcbiAgICAgICAgfVxuICAgICAgICBidWZmZXJzLnB1c2goYnVmZmVyRnJvbVJlY29yZEJhdGNoKGJ1ZmZlcikpO1xuICAgIH1cbiAgICByZXR1cm4gYnVmZmVycztcbn1cblxuZnVuY3Rpb24gZmllbGQoZjogX0ZpZWxkLCBkaWN0aW9uYXJ5RmllbGRzOiBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5Pj4gfCBudWxsKSB7XG4gICAgbGV0IG5hbWUgPSBmLm5hbWUoKSE7XG4gICAgbGV0IGZpZWxkOiBGaWVsZCB8IHZvaWQ7XG4gICAgbGV0IG51bGxhYmxlID0gZi5udWxsYWJsZSgpO1xuICAgIGxldCBtZXRhZGF0YSA9IGN1c3RvbU1ldGFkYXRhKGYpO1xuICAgIGxldCBkYXRhVHlwZTogRGF0YVR5cGU8YW55PiB8IG51bGw7XG4gICAgbGV0IGtleXNNZXRhOiBfSW50IHwgbnVsbCwgaWQ6IG51bWJlcjtcbiAgICBsZXQgZGljdE1ldGE6IF9EaWN0aW9uYXJ5RW5jb2RpbmcgfCBudWxsO1xuICAgIGlmICghZGljdGlvbmFyeUZpZWxkcyB8fCAhKGRpY3RNZXRhID0gZi5kaWN0aW9uYXJ5KCkpKSB7XG4gICAgICAgIGlmIChkYXRhVHlwZSA9IHR5cGVGcm9tRmllbGQoZiwgZmllbGRzRnJvbUZpZWxkKGYsIGRpY3Rpb25hcnlGaWVsZHMpKSkge1xuICAgICAgICAgICAgZmllbGQgPSBuZXcgRmllbGQobmFtZSwgZGF0YVR5cGUsIG51bGxhYmxlLCBtZXRhZGF0YSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGRhdGFUeXBlID0gZGljdGlvbmFyeUZpZWxkcy5oYXMoaWQgPSBkaWN0TWV0YS5pZCgpLmxvdylcbiAgICAgICAgICAgICAgICAgICAgICAgID8gZGljdGlvbmFyeUZpZWxkcy5nZXQoaWQpIS50eXBlLmRpY3Rpb25hcnlcbiAgICAgICAgICAgICAgICAgICAgICAgIDogdHlwZUZyb21GaWVsZChmLCBmaWVsZHNGcm9tRmllbGQoZiwgbnVsbCkpKSB7XG4gICAgICAgIGRhdGFUeXBlID0gbmV3IERpY3Rpb25hcnkoZGF0YVR5cGUsXG4gICAgICAgICAgICAvLyBhIGRpY3Rpb25hcnkgaW5kZXggZGVmYXVsdHMgdG8gc2lnbmVkIDMyIGJpdCBpbnQgaWYgdW5zcGVjaWZpZWRcbiAgICAgICAgICAgIChrZXlzTWV0YSA9IGRpY3RNZXRhLmluZGV4VHlwZSgpKSA/IGludEZyb21GaWVsZChrZXlzTWV0YSkhIDogbmV3IEludDMyKCksXG4gICAgICAgICAgICBpZCwgZGljdE1ldGEuaXNPcmRlcmVkKClcbiAgICAgICAgKTtcbiAgICAgICAgZmllbGQgPSBuZXcgRmllbGQobmFtZSwgZGF0YVR5cGUsIG51bGxhYmxlLCBtZXRhZGF0YSk7XG4gICAgICAgIGRpY3Rpb25hcnlGaWVsZHMuaGFzKGlkKSB8fCBkaWN0aW9uYXJ5RmllbGRzLnNldChpZCwgZmllbGQgYXMgRmllbGQ8RGljdGlvbmFyeT4pO1xuICAgIH1cbiAgICByZXR1cm4gZmllbGQgfHwgbnVsbDtcbn1cblxuZnVuY3Rpb24gY3VzdG9tTWV0YWRhdGEocGFyZW50PzogX1NjaGVtYSB8IF9GaWVsZCB8IG51bGwpIHtcbiAgICBjb25zdCBkYXRhID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICBpZiAocGFyZW50KSB7XG4gICAgICAgIGZvciAobGV0IGVudHJ5LCBrZXksIGkgPSAtMSwgbiA9IHBhcmVudC5jdXN0b21NZXRhZGF0YUxlbmd0aCgpIHwgMDsgKytpIDwgbjspIHtcbiAgICAgICAgICAgIGlmICgoZW50cnkgPSBwYXJlbnQuY3VzdG9tTWV0YWRhdGEoaSkpICYmIChrZXkgPSBlbnRyeS5rZXkoKSkgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGRhdGEuc2V0KGtleSwgZW50cnkudmFsdWUoKSEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkYXRhO1xufVxuXG5mdW5jdGlvbiBmaWVsZE5vZGVGcm9tUmVjb3JkQmF0Y2goZjogX0ZpZWxkTm9kZSkge1xuICAgIHJldHVybiBuZXcgRmllbGRNZXRhZGF0YShmLmxlbmd0aCgpLCBmLm51bGxDb3VudCgpKTtcbn1cblxuZnVuY3Rpb24gYnVmZmVyRnJvbVJlY29yZEJhdGNoKGI6IF9CdWZmZXIpIHtcbiAgICByZXR1cm4gbmV3IEJ1ZmZlck1ldGFkYXRhKGIub2Zmc2V0KCksIGIubGVuZ3RoKCkpO1xufVxuXG5mdW5jdGlvbiB0eXBlRnJvbUZpZWxkKGY6IF9GaWVsZCwgY2hpbGRyZW4/OiBGaWVsZFtdKTogRGF0YVR5cGU8YW55PiB8IG51bGwge1xuICAgIHN3aXRjaCAoZi50eXBlVHlwZSgpKSB7XG4gICAgICAgIGNhc2UgVHlwZS5OT05FOiByZXR1cm4gbnVsbDtcbiAgICAgICAgY2FzZSBUeXBlLk51bGw6IHJldHVybiBudWxsRnJvbUZpZWxkKGYudHlwZShuZXcgX051bGwoKSkhKTtcbiAgICAgICAgY2FzZSBUeXBlLkludDogcmV0dXJuIGludEZyb21GaWVsZChmLnR5cGUobmV3IF9JbnQoKSkhKTtcbiAgICAgICAgY2FzZSBUeXBlLkZsb2F0aW5nUG9pbnQ6IHJldHVybiBmbG9hdEZyb21GaWVsZChmLnR5cGUobmV3IF9GbG9hdGluZ1BvaW50KCkpISk7XG4gICAgICAgIGNhc2UgVHlwZS5CaW5hcnk6IHJldHVybiBiaW5hcnlGcm9tRmllbGQoZi50eXBlKG5ldyBfQmluYXJ5KCkpISk7XG4gICAgICAgIGNhc2UgVHlwZS5VdGY4OiByZXR1cm4gdXRmOEZyb21GaWVsZChmLnR5cGUobmV3IF9VdGY4KCkpISk7XG4gICAgICAgIGNhc2UgVHlwZS5Cb29sOiByZXR1cm4gYm9vbEZyb21GaWVsZChmLnR5cGUobmV3IF9Cb29sKCkpISk7XG4gICAgICAgIGNhc2UgVHlwZS5EZWNpbWFsOiByZXR1cm4gZGVjaW1hbEZyb21GaWVsZChmLnR5cGUobmV3IF9EZWNpbWFsKCkpISk7XG4gICAgICAgIGNhc2UgVHlwZS5EYXRlOiByZXR1cm4gZGF0ZUZyb21GaWVsZChmLnR5cGUobmV3IF9EYXRlKCkpISk7XG4gICAgICAgIGNhc2UgVHlwZS5UaW1lOiByZXR1cm4gdGltZUZyb21GaWVsZChmLnR5cGUobmV3IF9UaW1lKCkpISk7XG4gICAgICAgIGNhc2UgVHlwZS5UaW1lc3RhbXA6IHJldHVybiB0aW1lc3RhbXBGcm9tRmllbGQoZi50eXBlKG5ldyBfVGltZXN0YW1wKCkpISk7XG4gICAgICAgIGNhc2UgVHlwZS5JbnRlcnZhbDogcmV0dXJuIGludGVydmFsRnJvbUZpZWxkKGYudHlwZShuZXcgX0ludGVydmFsKCkpISk7XG4gICAgICAgIGNhc2UgVHlwZS5MaXN0OiByZXR1cm4gbGlzdEZyb21GaWVsZChmLnR5cGUobmV3IF9MaXN0KCkpISwgY2hpbGRyZW4gfHwgW10pO1xuICAgICAgICBjYXNlIFR5cGUuU3RydWN0XzogcmV0dXJuIHN0cnVjdEZyb21GaWVsZChmLnR5cGUobmV3IF9TdHJ1Y3QoKSkhLCBjaGlsZHJlbiB8fCBbXSk7XG4gICAgICAgIGNhc2UgVHlwZS5VbmlvbjogcmV0dXJuIHVuaW9uRnJvbUZpZWxkKGYudHlwZShuZXcgX1VuaW9uKCkpISwgY2hpbGRyZW4gfHwgW10pO1xuICAgICAgICBjYXNlIFR5cGUuRml4ZWRTaXplQmluYXJ5OiByZXR1cm4gZml4ZWRTaXplQmluYXJ5RnJvbUZpZWxkKGYudHlwZShuZXcgX0ZpeGVkU2l6ZUJpbmFyeSgpKSEpO1xuICAgICAgICBjYXNlIFR5cGUuRml4ZWRTaXplTGlzdDogcmV0dXJuIGZpeGVkU2l6ZUxpc3RGcm9tRmllbGQoZi50eXBlKG5ldyBfRml4ZWRTaXplTGlzdCgpKSEsIGNoaWxkcmVuIHx8IFtdKTtcbiAgICAgICAgY2FzZSBUeXBlLk1hcDogcmV0dXJuIG1hcEZyb21GaWVsZChmLnR5cGUobmV3IF9NYXAoKSkhLCBjaGlsZHJlbiB8fCBbXSk7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgVW5yZWNvZ25pemVkIHR5cGUgJHtmLnR5cGVUeXBlKCl9YCk7XG59XG5cbmZ1bmN0aW9uIG51bGxGcm9tRmllbGQgICAgICAgICAgIChfdHlwZTogX051bGwpICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IHJldHVybiBuZXcgTnVsbCgpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5mdW5jdGlvbiBpbnRGcm9tRmllbGQgICAgICAgICAgICAoX3R5cGU6IF9JbnQpICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBzd2l0Y2ggKF90eXBlLmJpdFdpZHRoKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICA4OiByZXR1cm4gX3R5cGUuaXNTaWduZWQoKSA/IG5ldyAgSW50OCgpIDogbmV3ICBVaW50OCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMTY6IHJldHVybiBfdHlwZS5pc1NpZ25lZCgpID8gbmV3IEludDE2KCkgOiBuZXcgVWludDE2KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAzMjogcmV0dXJuIF90eXBlLmlzU2lnbmVkKCkgPyBuZXcgSW50MzIoKSA6IG5ldyBVaW50MzIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDY0OiByZXR1cm4gX3R5cGUuaXNTaWduZWQoKSA/IG5ldyBJbnQ2NCgpIDogbmV3IFVpbnQ2NCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbmZ1bmN0aW9uIGZsb2F0RnJvbUZpZWxkICAgICAgICAgIChfdHlwZTogX0Zsb2F0aW5nUG9pbnQpICAgICAgICAgICAgICAgICAgICB7IHN3aXRjaCAoX3R5cGUucHJlY2lzaW9uKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFByZWNpc2lvbi5IQUxGOiByZXR1cm4gbmV3IEZsb2F0MTYoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFByZWNpc2lvbi5TSU5HTEU6IHJldHVybiBuZXcgRmxvYXQzMigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgUHJlY2lzaW9uLkRPVUJMRTogcmV0dXJuIG5ldyBGbG9hdDY0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuZnVuY3Rpb24gYmluYXJ5RnJvbUZpZWxkICAgICAgICAgKF90eXBlOiBfQmluYXJ5KSAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgcmV0dXJuIG5ldyBCaW5hcnkoKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbmZ1bmN0aW9uIHV0ZjhGcm9tRmllbGQgICAgICAgICAgIChfdHlwZTogX1V0ZjgpICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IHJldHVybiBuZXcgVXRmOCgpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5mdW5jdGlvbiBib29sRnJvbUZpZWxkICAgICAgICAgICAoX3R5cGU6IF9Cb29sKSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyByZXR1cm4gbmV3IEJvb2woKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuZnVuY3Rpb24gZGVjaW1hbEZyb21GaWVsZCAgICAgICAgKF90eXBlOiBfRGVjaW1hbCkgICAgICAgICAgICAgICAgICAgICAgICAgIHsgcmV0dXJuIG5ldyBEZWNpbWFsKF90eXBlLnNjYWxlKCksIF90eXBlLnByZWNpc2lvbigpKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbmZ1bmN0aW9uIGRhdGVGcm9tRmllbGQgICAgICAgICAgIChfdHlwZTogX0RhdGUpICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IHJldHVybiBuZXcgRGF0ZV8oX3R5cGUudW5pdCgpKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5mdW5jdGlvbiB0aW1lRnJvbUZpZWxkICAgICAgICAgICAoX3R5cGU6IF9UaW1lKSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyByZXR1cm4gbmV3IFRpbWUoX3R5cGUudW5pdCgpLCBfdHlwZS5iaXRXaWR0aCgpIGFzIFRpbWVCaXRXaWR0aCk7ICAgICAgICAgICAgICAgICAgfVxuZnVuY3Rpb24gdGltZXN0YW1wRnJvbUZpZWxkICAgICAgKF90eXBlOiBfVGltZXN0YW1wKSAgICAgICAgICAgICAgICAgICAgICAgIHsgcmV0dXJuIG5ldyBUaW1lc3RhbXAoX3R5cGUudW5pdCgpLCBfdHlwZS50aW1lem9uZSgpKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbmZ1bmN0aW9uIGludGVydmFsRnJvbUZpZWxkICAgICAgIChfdHlwZTogX0ludGVydmFsKSAgICAgICAgICAgICAgICAgICAgICAgICB7IHJldHVybiBuZXcgSW50ZXJ2YWwoX3R5cGUudW5pdCgpKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5mdW5jdGlvbiBsaXN0RnJvbUZpZWxkICAgICAgICAgICAoX3R5cGU6IF9MaXN0LCBjaGlsZHJlbjogRmllbGRbXSkgICAgICAgICAgeyByZXR1cm4gbmV3IExpc3QoY2hpbGRyZW4pOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuZnVuY3Rpb24gc3RydWN0RnJvbUZpZWxkICAgICAgICAgKF90eXBlOiBfU3RydWN0LCBjaGlsZHJlbjogRmllbGRbXSkgICAgICAgIHsgcmV0dXJuIG5ldyBTdHJ1Y3QoY2hpbGRyZW4pOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbmZ1bmN0aW9uIHVuaW9uRnJvbUZpZWxkICAgICAgICAgIChfdHlwZTogX1VuaW9uLCBjaGlsZHJlbjogRmllbGRbXSkgICAgICAgICB7IHJldHVybiBuZXcgVW5pb24oX3R5cGUubW9kZSgpLCAoX3R5cGUudHlwZUlkc0FycmF5KCkgfHwgW10pIGFzIFR5cGVbXSwgY2hpbGRyZW4pOyB9XG5mdW5jdGlvbiBmaXhlZFNpemVCaW5hcnlGcm9tRmllbGQoX3R5cGU6IF9GaXhlZFNpemVCaW5hcnkpICAgICAgICAgICAgICAgICAgeyByZXR1cm4gbmV3IEZpeGVkU2l6ZUJpbmFyeShfdHlwZS5ieXRlV2lkdGgoKSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuZnVuY3Rpb24gZml4ZWRTaXplTGlzdEZyb21GaWVsZCAgKF90eXBlOiBfRml4ZWRTaXplTGlzdCwgY2hpbGRyZW46IEZpZWxkW10pIHsgcmV0dXJuIG5ldyBGaXhlZFNpemVMaXN0KF90eXBlLmxpc3RTaXplKCksIGNoaWxkcmVuKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbmZ1bmN0aW9uIG1hcEZyb21GaWVsZCAgICAgICAgICAgIChfdHlwZTogX01hcCwgY2hpbGRyZW46IEZpZWxkW10pICAgICAgICAgICB7IHJldHVybiBuZXcgTWFwXyhfdHlwZS5rZXlzU29ydGVkKCksIGNoaWxkcmVuKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4iXX0=

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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7QUFDekQsSUFBTyxLQUFLLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7QUFDckQsSUFBTyxLQUFLLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7QUFDckQsSUFBTyxRQUFRLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7QUFDM0QsSUFBTyxLQUFLLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7QUFDckQsSUFBTyxLQUFLLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7QUFDckQsSUFBTyxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7QUFDL0QsSUFBTyxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUM7QUFDN0QsSUFBTyxLQUFLLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7QUFDckQsSUFBTyxPQUFPLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7QUFDMUQsSUFBTyxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7QUFDdkQsSUFBTyxnQkFBZ0IsR0FBRyxPQUFP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a0MsS0FBZ0IsSUFBNEIsTUFBTSxDQUFDLElBQUksZUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQWdELENBQUM7QUFDakssdUJBQWtDLEtBQVksRUFBRSxRQUFpQixJQUFhLE1BQU0sQ0FBQyxJQUFJLFdBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUF3RCxDQUFDO0FBQ2pLLHlCQUFrQyxLQUFjLEVBQUUsUUFBaUIsSUFBVyxNQUFNLENBQUMsSUFBSSxhQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBc0QsQ0FBQztBQUNqSyx3QkFBa0MsS0FBYSxFQUFFLFFBQWlCLElBQVksTUFBTSxDQUFDLElBQUksWUFBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsSUFBSSxFQUFFLENBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakssa0NBQWtDLEtBQXVCLElBQXFCLE1BQU0sQ0FBQyxJQUFJLHNCQUFlLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBb0MsQ0FBQztBQUNqSyxnQ0FBa0MsS0FBcUIsRUFBRSxRQUFpQixJQUFJLE1BQU0sQ0FBQyxJQUFJLG9CQUFhLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQTZCLENBQUM7QUFDakssc0JBQWtDLEtBQVcsRUFBRSxRQUFpQixJQUFjLE1BQU0sQ0FBQyxJQUFJLFdBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBb0MsQ0FBQyIsImZpbGUiOiJpcGMvcmVhZGVyL2JpbmFyeS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBWZWN0b3IgfSBmcm9tICcuLi8uLi92ZWN0b3InO1xuaW1wb3J0IHsgZmxhdGJ1ZmZlcnMgfSBmcm9tICdmbGF0YnVmZmVycyc7XG5pbXBvcnQgeyBUeXBlRGF0YUxvYWRlciB9IGZyb20gJy4vdmVjdG9yJztcbmltcG9ydCB7IE1lc3NhZ2UsIEZvb3RlciwgRmlsZUJsb2NrLCBSZWNvcmRCYXRjaE1ldGFkYXRhLCBEaWN0aW9uYXJ5QmF0Y2gsIEJ1ZmZlck1ldGFkYXRhLCBGaWVsZE1ldGFkYXRhLCB9IGZyb20gJy4uL21ldGFkYXRhJztcbmltcG9ydCB7XG4gICAgU2NoZW1hLCBGaWVsZCxcbiAgICBEYXRhVHlwZSwgRGljdGlvbmFyeSxcbiAgICBOdWxsLCBUaW1lQml0V2lkdGgsXG4gICAgQmluYXJ5LCBCb29sLCBVdGY4LCBEZWNpbWFsLFxuICAgIERhdGVfLCBUaW1lLCBUaW1lc3RhbXAsIEludGVydmFsLFxuICAgIExpc3QsIFN0cnVjdCwgVW5pb24sIEZpeGVkU2l6ZUJpbmFyeSwgRml4ZWRTaXplTGlzdCwgTWFwXyxcbn0gZnJvbSAnLi4vLi4vdHlwZSc7XG5cbmltcG9ydCB7XG4gICAgSW50OCwgIFVpbnQ4LFxuICAgIEludDE2LCBVaW50MTYsXG4gICAgSW50MzIsIFVpbnQzMixcbiAgICBJbnQ2NCwgVWludDY0LFxuICAgIEZsb2F0MTYsIEZsb2F0NjQsIEZsb2F0MzIsXG59IGZyb20gJy4uLy4uL3R5cGUnO1xuXG5pbXBvcnQgQnl0ZUJ1ZmZlciA9IGZsYXRidWZmZXJzLkJ5dGVCdWZmZXI7XG5cbnR5cGUgTWVzc2FnZVJlYWRlciA9IChiYjogQnl0ZUJ1ZmZlcikgPT4gSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaE1ldGFkYXRhIHwgRGljdGlvbmFyeUJhdGNoPjtcblxuZXhwb3J0IGZ1bmN0aW9uKiByZWFkQnVmZmVyczxUIGV4dGVuZHMgVWludDhBcnJheSB8IEJ1ZmZlciB8IHN0cmluZz4oc291cmNlczogSXRlcmFibGU8VD4gfCBVaW50OEFycmF5IHwgQnVmZmVyIHwgc3RyaW5nKSB7XG4gICAgbGV0IHNjaGVtYTogU2NoZW1hIHwgbnVsbCA9IG51bGw7XG4gICAgbGV0IGRpY3Rpb25hcmllcyA9IG5ldyBNYXA8bnVtYmVyLCBWZWN0b3I+KCk7XG4gICAgbGV0IHJlYWRNZXNzYWdlczogTWVzc2FnZVJlYWRlciB8IG51bGwgPSBudWxsO1xuICAgIGlmIChBcnJheUJ1ZmZlci5pc1ZpZXcoc291cmNlcykgfHwgdHlwZW9mIHNvdXJjZXMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHNvdXJjZXMgPSBbc291cmNlcyBhcyBUXTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBzb3VyY2Ugb2Ygc291cmNlcykge1xuICAgICAgICBjb25zdCBiYiA9IHRvQnl0ZUJ1ZmZlcihzb3VyY2UpO1xuICAgICAgICBpZiAoKCFzY2hlbWEgJiYgKHsgc2NoZW1hLCByZWFkTWVzc2FnZXMgfSA9IHJlYWRTY2hlbWEoYmIpKSB8fCB0cnVlKSAmJiBzY2hlbWEgJiYgcmVhZE1lc3NhZ2VzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG1lc3NhZ2Ugb2YgcmVhZE1lc3NhZ2VzKGJiKSkge1xuICAgICAgICAgICAgICAgIHlpZWxkIHtcbiAgICAgICAgICAgICAgICAgICAgc2NoZW1hLCBtZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICBsb2FkZXI6IG5ldyBCaW5hcnlEYXRhTG9hZGVyKFxuICAgICAgICAgICAgICAgICAgICAgICAgYmIsXG4gICAgICAgICAgICAgICAgICAgICAgICBhcnJheUl0ZXJhdG9yKG1lc3NhZ2Uubm9kZXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgYXJyYXlJdGVyYXRvcihtZXNzYWdlLmJ1ZmZlcnMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGljdGlvbmFyaWVzXG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24qIHJlYWRCdWZmZXJzQXN5bmM8VCBleHRlbmRzIFVpbnQ4QXJyYXkgfCBCdWZmZXIgfCBzdHJpbmc+KHNvdXJjZXM6IEFzeW5jSXRlcmFibGU8VD4pIHtcbiAgICBsZXQgc2NoZW1hOiBTY2hlbWEgfCBudWxsID0gbnVsbDtcbiAgICBsZXQgZGljdGlvbmFyaWVzID0gbmV3IE1hcDxudW1iZXIsIFZlY3Rvcj4oKTtcbiAgICBsZXQgcmVhZE1lc3NhZ2VzOiBNZXNzYWdlUmVhZGVyIHwgbnVsbCA9IG51bGw7XG4gICAgZm9yIGF3YWl0IChjb25zdCBzb3VyY2Ugb2Ygc291cmNlcykge1xuICAgICAgICBjb25zdCBiYiA9IHRvQnl0ZUJ1ZmZlcihzb3VyY2UpO1xuICAgICAgICBpZiAoKCFzY2hlbWEgJiYgKHsgc2NoZW1hLCByZWFkTWVzc2FnZXMgfSA9IHJlYWRTY2hlbWEoYmIpKSB8fCB0cnVlKSAmJiBzY2hlbWEgJiYgcmVhZE1lc3NhZ2VzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG1lc3NhZ2Ugb2YgcmVhZE1lc3NhZ2VzKGJiKSkge1xuICAgICAgICAgICAgICAgIHlpZWxkIHtcbiAgICAgICAgICAgICAgICAgICAgc2NoZW1hLCBtZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICBsb2FkZXI6IG5ldyBCaW5hcnlEYXRhTG9hZGVyKFxuICAgICAgICAgICAgICAgICAgICAgICAgYmIsXG4gICAgICAgICAgICAgICAgICAgICAgICBhcnJheUl0ZXJhdG9yKG1lc3NhZ2Uubm9kZXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgYXJyYXlJdGVyYXRvcihtZXNzYWdlLmJ1ZmZlcnMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGljdGlvbmFyaWVzXG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgQmluYXJ5RGF0YUxvYWRlciBleHRlbmRzIFR5cGVEYXRhTG9hZGVyIHtcbiAgICBwcml2YXRlIGJ5dGVzOiBVaW50OEFycmF5O1xuICAgIHByaXZhdGUgbWVzc2FnZU9mZnNldDogbnVtYmVyO1xuICAgIGNvbnN0cnVjdG9yKGJiOiBCeXRlQnVmZmVyLCBub2RlczogSXRlcmF0b3I8RmllbGRNZXRhZGF0YT4sIGJ1ZmZlcnM6IEl0ZXJhdG9yPEJ1ZmZlck1ldGFkYXRhPiwgZGljdGlvbmFyaWVzOiBNYXA8bnVtYmVyLCBWZWN0b3I+KSB7XG4gICAgICAgIHN1cGVyKG5vZGVzLCBidWZmZXJzLCBkaWN0aW9uYXJpZXMpO1xuICAgICAgICB0aGlzLmJ5dGVzID0gYmIuYnl0ZXMoKTtcbiAgICAgICAgdGhpcy5tZXNzYWdlT2Zmc2V0ID0gYmIucG9zaXRpb24oKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHJlYWRPZmZzZXRzPFQgZXh0ZW5kcyBEYXRhVHlwZT4odHlwZTogVCwgYnVmZmVyPzogQnVmZmVyTWV0YWRhdGEpIHsgcmV0dXJuIHRoaXMucmVhZERhdGEodHlwZSwgYnVmZmVyKTsgfVxuICAgIHByb3RlY3RlZCByZWFkVHlwZUlkczxUIGV4dGVuZHMgRGF0YVR5cGU+KHR5cGU6IFQsIGJ1ZmZlcj86IEJ1ZmZlck1ldGFkYXRhKSB7IHJldHVybiB0aGlzLnJlYWREYXRhKHR5cGUsIGJ1ZmZlcik7IH1cbiAgICBwcm90ZWN0ZWQgcmVhZERhdGE8VCBleHRlbmRzIERhdGFUeXBlPihfdHlwZTogVCwgeyBsZW5ndGgsIG9mZnNldCB9OiBCdWZmZXJNZXRhZGF0YSA9IHRoaXMuZ2V0QnVmZmVyTWV0YWRhdGEoKSkge1xuICAgICAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkodGhpcy5ieXRlcy5idWZmZXIsIHRoaXMuYnl0ZXMuYnl0ZU9mZnNldCArIHRoaXMubWVzc2FnZU9mZnNldCArIG9mZnNldCwgbGVuZ3RoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uKiBhcnJheUl0ZXJhdG9yKGFycjogQXJyYXk8YW55PikgeyB5aWVsZCogYXJyOyB9XG5cbmZ1bmN0aW9uIHRvQnl0ZUJ1ZmZlcihieXRlcz86IFVpbnQ4QXJyYXkgfCBCdWZmZXIgfCBzdHJpbmcpIHtcbiAgICBsZXQgYXJyOiBVaW50OEFycmF5ID0gYnl0ZXMgYXMgYW55IHx8IG5ldyBVaW50OEFycmF5KDApO1xuICAgIGlmICh0eXBlb2YgYnl0ZXMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGFyciA9IG5ldyBVaW50OEFycmF5KGJ5dGVzLmxlbmd0aCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAtMSwgbiA9IGJ5dGVzLmxlbmd0aDsgKytpIDwgbjspIHtcbiAgICAgICAgICAgIGFycltpXSA9IGJ5dGVzLmNoYXJDb2RlQXQoaSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBCeXRlQnVmZmVyKGFycik7XG4gICAgfVxuICAgIHJldHVybiBuZXcgQnl0ZUJ1ZmZlcihhcnIpO1xufVxuXG5mdW5jdGlvbiByZWFkU2NoZW1hKGJiOiBCeXRlQnVmZmVyKSB7XG4gICAgbGV0IHNjaGVtYTogU2NoZW1hLCByZWFkTWVzc2FnZXMsIGZvb3RlcjogRm9vdGVyIHwgbnVsbDtcbiAgICBpZiAoZm9vdGVyID0gcmVhZEZpbGVTY2hlbWEoYmIpKSB7XG4gICAgICAgIHNjaGVtYSA9IGZvb3Rlci5zY2hlbWE7XG4gICAgICAgIHJlYWRNZXNzYWdlcyA9IHJlYWRGaWxlTWVzc2FnZXMoZm9vdGVyKTtcbiAgICB9IGVsc2UgaWYgKHNjaGVtYSA9IHJlYWRTdHJlYW1TY2hlbWEoYmIpISkge1xuICAgICAgICByZWFkTWVzc2FnZXMgPSByZWFkU3RyZWFtTWVzc2FnZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIEFycm93IGJ1ZmZlcicpO1xuICAgIH1cbiAgICByZXR1cm4geyBzY2hlbWEsIHJlYWRNZXNzYWdlcyB9O1xufVxuXG5jb25zdCBQQURESU5HID0gNDtcbmNvbnN0IE1BR0lDX1NUUiA9ICdBUlJPVzEnO1xuY29uc3QgTUFHSUMgPSBuZXcgVWludDhBcnJheShNQUdJQ19TVFIubGVuZ3RoKTtcbmZvciAobGV0IGkgPSAwOyBpIDwgTUFHSUNfU1RSLmxlbmd0aDsgaSArPSAxIHwgMCkge1xuICAgIE1BR0lDW2ldID0gTUFHSUNfU1RSLmNoYXJDb2RlQXQoaSk7XG59XG5cbmZ1bmN0aW9uIGNoZWNrRm9yTWFnaWNBcnJvd1N0cmluZyhidWZmZXI6IFVpbnQ4QXJyYXksIGluZGV4ID0gMCkge1xuICAgIGZvciAobGV0IGkgPSAtMSwgbiA9IE1BR0lDLmxlbmd0aDsgKytpIDwgbjspIHtcbiAgICAgICAgaWYgKE1BR0lDW2ldICE9PSBidWZmZXJbaW5kZXggKyBpXSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG5jb25zdCBtYWdpY0xlbmd0aCA9IE1BR0lDLmxlbmd0aDtcbmNvbnN0IG1hZ2ljQW5kUGFkZGluZyA9IG1hZ2ljTGVuZ3RoICsgUEFERElORztcbmNvbnN0IG1hZ2ljWDJBbmRQYWRkaW5nID0gbWFnaWNMZW5ndGggKiAyICsgUEFERElORztcblxuZnVuY3Rpb24gcmVhZFN0cmVhbVNjaGVtYShiYjogQnl0ZUJ1ZmZlcikge1xuICAgIGlmICghY2hlY2tGb3JNYWdpY0Fycm93U3RyaW5nKGJiLmJ5dGVzKCksIDApKSB7XG4gICAgICAgIGZvciAoY29uc3QgbWVzc2FnZSBvZiByZWFkTWVzc2FnZXMoYmIpKSB7XG4gICAgICAgICAgICBpZiAoTWVzc2FnZS5pc1NjaGVtYShtZXNzYWdlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBtZXNzYWdlIGFzIFNjaGVtYTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24qIHJlYWRTdHJlYW1NZXNzYWdlcyhiYjogQnl0ZUJ1ZmZlcikge1xuICAgIGZvciAoY29uc3QgbWVzc2FnZSBvZiByZWFkTWVzc2FnZXMoYmIpKSB7XG4gICAgICAgIGlmIChNZXNzYWdlLmlzUmVjb3JkQmF0Y2gobWVzc2FnZSkpIHtcbiAgICAgICAgICAgIHlpZWxkIG1lc3NhZ2U7XG4gICAgICAgIH0gZWxzZSBpZiAoTWVzc2FnZS5pc0RpY3Rpb25hcnlCYXRjaChtZXNzYWdlKSkge1xuICAgICAgICAgICAgeWllbGQgbWVzc2FnZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vIHBvc2l0aW9uIHRoZSBidWZmZXIgYWZ0ZXIgdGhlIGJvZHkgdG8gcmVhZCB0aGUgbmV4dCBtZXNzYWdlXG4gICAgICAgIGJiLnNldFBvc2l0aW9uKGJiLnBvc2l0aW9uKCkgKyBtZXNzYWdlLmJvZHlMZW5ndGgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVhZEZpbGVTY2hlbWEoYmI6IEJ5dGVCdWZmZXIpIHtcbiAgICBsZXQgZmlsZUxlbmd0aCA9IGJiLmNhcGFjaXR5KCksIGZvb3Rlckxlbmd0aDogbnVtYmVyLCBmb290ZXJPZmZzZXQ6IG51bWJlcjtcbiAgICBpZiAoKGZpbGVMZW5ndGggPCBtYWdpY1gyQW5kUGFkZGluZyAvKiAgICAgICAgICAgICAgICAgICAgIEFycm93IGJ1ZmZlciB0b28gc21hbGwgKi8pIHx8XG4gICAgICAgICghY2hlY2tGb3JNYWdpY0Fycm93U3RyaW5nKGJiLmJ5dGVzKCksIDApIC8qICAgICAgICAgICAgICAgICAgICAgICAgTWlzc2luZyBtYWdpYyBzdGFydCAgICAqLykgfHxcbiAgICAgICAgKCFjaGVja0Zvck1hZ2ljQXJyb3dTdHJpbmcoYmIuYnl0ZXMoKSwgZmlsZUxlbmd0aCAtIG1hZ2ljTGVuZ3RoKSAvKiBNaXNzaW5nIG1hZ2ljIGVuZCAgICAgICovKSB8fFxuICAgICAgICAoLyogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSW52YWxpZCBmb290ZXIgbGVuZ3RoICAqL1xuICAgICAgICAoZm9vdGVyTGVuZ3RoID0gYmIucmVhZEludDMyKGZvb3Rlck9mZnNldCA9IGZpbGVMZW5ndGggLSBtYWdpY0FuZFBhZGRpbmcpKSA8IDEgJiZcbiAgICAgICAgKGZvb3Rlckxlbmd0aCArIG1hZ2ljWDJBbmRQYWRkaW5nID4gZmlsZUxlbmd0aCkpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBiYi5zZXRQb3NpdGlvbihmb290ZXJPZmZzZXQgLSBmb290ZXJMZW5ndGgpO1xuICAgIHJldHVybiBmb290ZXJGcm9tQnl0ZUJ1ZmZlcihiYik7XG59XG5cbmZ1bmN0aW9uIHJlYWRGaWxlTWVzc2FnZXMoZm9vdGVyOiBGb290ZXIpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24qIChiYjogQnl0ZUJ1ZmZlcikge1xuICAgICAgICBmb3IgKGxldCBpID0gLTEsIGJhdGNoZXMgPSBmb290ZXIuZGljdGlvbmFyeUJhdGNoZXMsIG4gPSBiYXRjaGVzLmxlbmd0aDsgKytpIDwgbjspIHtcbiAgICAgICAgICAgIGJiLnNldFBvc2l0aW9uKGJhdGNoZXNbaV0ub2Zmc2V0Lmxvdyk7XG4gICAgICAgICAgICB5aWVsZCByZWFkTWVzc2FnZShiYiwgYmIucmVhZEludDMyKGJiLnBvc2l0aW9uKCkpKSBhcyBEaWN0aW9uYXJ5QmF0Y2g7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgaSA9IC0xLCBiYXRjaGVzID0gZm9vdGVyLnJlY29yZEJhdGNoZXMsIG4gPSBiYXRjaGVzLmxlbmd0aDsgKytpIDwgbjspIHtcbiAgICAgICAgICAgIGJiLnNldFBvc2l0aW9uKGJhdGNoZXNbaV0ub2Zmc2V0Lmxvdyk7XG4gICAgICAgICAgICB5aWVsZCByZWFkTWVzc2FnZShiYiwgYmIucmVhZEludDMyKGJiLnBvc2l0aW9uKCkpKSBhcyBSZWNvcmRCYXRjaE1ldGFkYXRhO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuZnVuY3Rpb24qIHJlYWRNZXNzYWdlcyhiYjogQnl0ZUJ1ZmZlcikge1xuICAgIGxldCBsZW5ndGg6IG51bWJlciwgbWVzc2FnZTogU2NoZW1hIHwgUmVjb3JkQmF0Y2hNZXRhZGF0YSB8IERpY3Rpb25hcnlCYXRjaDtcbiAgICB3aGlsZSAoYmIucG9zaXRpb24oKSA8IGJiLmNhcGFjaXR5KCkgJiZcbiAgICAgICAgICAobGVuZ3RoID0gYmIucmVhZEludDMyKGJiLnBvc2l0aW9uKCkpKSA+IDApIHtcbiAgICAgICAgaWYgKG1lc3NhZ2UgPSByZWFkTWVzc2FnZShiYiwgbGVuZ3RoKSEpIHtcbiAgICAgICAgICAgIHlpZWxkIG1lc3NhZ2U7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlYWRNZXNzYWdlKGJiOiBCeXRlQnVmZmVyLCBsZW5ndGg6IG51bWJlcikge1xuICAgIGJiLnNldFBvc2l0aW9uKGJiLnBvc2l0aW9uKCkgKyBQQURESU5HKTtcbiAgICBjb25zdCBtZXNzYWdlID0gbWVzc2FnZUZyb21CeXRlQnVmZmVyKGJiKTtcbiAgICBiYi5zZXRQb3NpdGlvbihiYi5wb3NpdGlvbigpICsgbGVuZ3RoKTtcbiAgICByZXR1cm4gbWVzc2FnZTtcbn1cblxuaW1wb3J0ICogYXMgRmlsZV8gZnJvbSAnLi4vLi4vZmIvRmlsZSc7XG5pbXBvcnQgKiBhcyBTY2hlbWFfIGZyb20gJy4uLy4uL2ZiL1NjaGVtYSc7XG5pbXBvcnQgKiBhcyBNZXNzYWdlXyBmcm9tICcuLi8uLi9mYi9NZXNzYWdlJztcblxuaW1wb3J0IFR5cGUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UeXBlO1xuaW1wb3J0IFByZWNpc2lvbiA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlByZWNpc2lvbjtcbmltcG9ydCBNZXNzYWdlSGVhZGVyID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk1lc3NhZ2VIZWFkZXI7XG5pbXBvcnQgTWV0YWRhdGFWZXJzaW9uID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTWV0YWRhdGFWZXJzaW9uO1xuaW1wb3J0IF9Gb290ZXIgPSBGaWxlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRm9vdGVyO1xuaW1wb3J0IF9CbG9jayA9IEZpbGVfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5CbG9jaztcbmltcG9ydCBfTWVzc2FnZSA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NZXNzYWdlO1xuaW1wb3J0IF9TY2hlbWEgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5TY2hlbWE7XG5pbXBvcnQgX0ZpZWxkID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRmllbGQ7XG5pbXBvcnQgX1JlY29yZEJhdGNoID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlJlY29yZEJhdGNoO1xuaW1wb3J0IF9EaWN0aW9uYXJ5QmF0Y2ggPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGljdGlvbmFyeUJhdGNoO1xuaW1wb3J0IF9GaWVsZE5vZGUgPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRmllbGROb2RlO1xuaW1wb3J0IF9CdWZmZXIgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5CdWZmZXI7XG5pbXBvcnQgX0RpY3Rpb25hcnlFbmNvZGluZyA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRpY3Rpb25hcnlFbmNvZGluZztcbmltcG9ydCBfTnVsbCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk51bGw7XG5pbXBvcnQgX0ludCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkludDtcbmltcG9ydCBfRmxvYXRpbmdQb2ludCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZsb2F0aW5nUG9pbnQ7XG5pbXBvcnQgX0JpbmFyeSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkJpbmFyeTtcbmltcG9ydCBfQm9vbCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkJvb2w7XG5pbXBvcnQgX1V0ZjggPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5VdGY4O1xuaW1wb3J0IF9EZWNpbWFsID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGVjaW1hbDtcbmltcG9ydCBfRGF0ZSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRhdGU7XG5pbXBvcnQgX1RpbWUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UaW1lO1xuaW1wb3J0IF9UaW1lc3RhbXAgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UaW1lc3RhbXA7XG5pbXBvcnQgX0ludGVydmFsID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuSW50ZXJ2YWw7XG5pbXBvcnQgX0xpc3QgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5MaXN0O1xuaW1wb3J0IF9TdHJ1Y3QgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5TdHJ1Y3RfO1xuaW1wb3J0IF9VbmlvbiA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlVuaW9uO1xuaW1wb3J0IF9GaXhlZFNpemVCaW5hcnkgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaXhlZFNpemVCaW5hcnk7XG5pbXBvcnQgX0ZpeGVkU2l6ZUxpc3QgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaXhlZFNpemVMaXN0O1xuaW1wb3J0IF9NYXAgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NYXA7XG5cbmZ1bmN0aW9uIGZvb3RlckZyb21CeXRlQnVmZmVyKGJiOiBCeXRlQnVmZmVyKSB7XG4gICAgY29uc3QgZGljdGlvbmFyeUZpZWxkcyA9IG5ldyBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5Pj4oKTtcbiAgICBjb25zdCBmID0gX0Zvb3Rlci5nZXRSb290QXNGb290ZXIoYmIpLCBzID0gZi5zY2hlbWEoKSE7XG4gICAgcmV0dXJuIG5ldyBGb290ZXIoXG4gICAgICAgIGRpY3Rpb25hcnlCYXRjaGVzRnJvbUZvb3RlcihmKSwgcmVjb3JkQmF0Y2hlc0Zyb21Gb290ZXIoZiksXG4gICAgICAgIG5ldyBTY2hlbWEoZmllbGRzRnJvbVNjaGVtYShzLCBkaWN0aW9uYXJ5RmllbGRzKSwgY3VzdG9tTWV0YWRhdGEocyksIGYudmVyc2lvbigpLCBkaWN0aW9uYXJ5RmllbGRzKVxuICAgICk7XG59XG5cbmZ1bmN0aW9uIG1lc3NhZ2VGcm9tQnl0ZUJ1ZmZlcihiYjogQnl0ZUJ1ZmZlcikge1xuICAgIGNvbnN0IG0gPSBfTWVzc2FnZS5nZXRSb290QXNNZXNzYWdlKGJiKSEsIHR5cGUgPSBtLmhlYWRlclR5cGUoKSwgdmVyc2lvbiA9IG0udmVyc2lvbigpO1xuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlIE1lc3NhZ2VIZWFkZXIuU2NoZW1hOiByZXR1cm4gc2NoZW1hRnJvbU1lc3NhZ2UodmVyc2lvbiwgbS5oZWFkZXIobmV3IF9TY2hlbWEoKSkhLCBuZXcgTWFwKCkpO1xuICAgICAgICBjYXNlIE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2g6IHJldHVybiByZWNvcmRCYXRjaEZyb21NZXNzYWdlKHZlcnNpb24sIG0uaGVhZGVyKG5ldyBfUmVjb3JkQmF0Y2goKSkhKTtcbiAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaDogcmV0dXJuIGRpY3Rpb25hcnlCYXRjaEZyb21NZXNzYWdlKHZlcnNpb24sIG0uaGVhZGVyKG5ldyBfRGljdGlvbmFyeUJhdGNoKCkpISk7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICAgIC8vIHRocm93IG5ldyBFcnJvcihgVW5yZWNvZ25pemVkIE1lc3NhZ2UgdHlwZSAnJHt0eXBlfSdgKTtcbn1cblxuZnVuY3Rpb24gc2NoZW1hRnJvbU1lc3NhZ2UodmVyc2lvbjogTWV0YWRhdGFWZXJzaW9uLCBzOiBfU2NoZW1hLCBkaWN0aW9uYXJ5RmllbGRzOiBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5Pj4pIHtcbiAgICByZXR1cm4gbmV3IFNjaGVtYShmaWVsZHNGcm9tU2NoZW1hKHMsIGRpY3Rpb25hcnlGaWVsZHMpLCBjdXN0b21NZXRhZGF0YShzKSwgdmVyc2lvbiwgZGljdGlvbmFyeUZpZWxkcyk7XG59XG5cbmZ1bmN0aW9uIHJlY29yZEJhdGNoRnJvbU1lc3NhZ2UodmVyc2lvbjogTWV0YWRhdGFWZXJzaW9uLCBiOiBfUmVjb3JkQmF0Y2gpIHtcbiAgICByZXR1cm4gbmV3IFJlY29yZEJhdGNoTWV0YWRhdGEodmVyc2lvbiwgYi5sZW5ndGgoKSwgZmllbGROb2Rlc0Zyb21SZWNvcmRCYXRjaChiKSwgYnVmZmVyc0Zyb21SZWNvcmRCYXRjaChiLCB2ZXJzaW9uKSk7XG59XG5cbmZ1bmN0aW9uIGRpY3Rpb25hcnlCYXRjaEZyb21NZXNzYWdlKHZlcnNpb246IE1ldGFkYXRhVmVyc2lvbiwgZDogX0RpY3Rpb25hcnlCYXRjaCkge1xuICAgIHJldHVybiBuZXcgRGljdGlvbmFyeUJhdGNoKHZlcnNpb24sIHJlY29yZEJhdGNoRnJvbU1lc3NhZ2UodmVyc2lvbiwgZC5kYXRhKCkhKSwgZC5pZCgpLCBkLmlzRGVsdGEoKSk7XG59XG5cbmZ1bmN0aW9uIGRpY3Rpb25hcnlCYXRjaGVzRnJvbUZvb3RlcihmOiBfRm9vdGVyKSB7XG4gICAgY29uc3QgYmxvY2tzID0gW10gYXMgRmlsZUJsb2NrW107XG4gICAgZm9yIChsZXQgYjogX0Jsb2NrLCBpID0gLTEsIG4gPSBmICYmIGYuZGljdGlvbmFyaWVzTGVuZ3RoKCk7ICsraSA8IG47KSB7XG4gICAgICAgIGlmIChiID0gZi5kaWN0aW9uYXJpZXMoaSkhKSB7XG4gICAgICAgICAgICBibG9ja3MucHVzaChuZXcgRmlsZUJsb2NrKGIubWV0YURhdGFMZW5ndGgoKSwgYi5ib2R5TGVuZ3RoKCksIGIub2Zmc2V0KCkpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYmxvY2tzO1xufVxuXG5mdW5jdGlvbiByZWNvcmRCYXRjaGVzRnJvbUZvb3RlcihmOiBfRm9vdGVyKSB7XG4gICAgY29uc3QgYmxvY2tzID0gW10gYXMgRmlsZUJsb2NrW107XG4gICAgZm9yIChsZXQgYjogX0Jsb2NrLCBpID0gLTEsIG4gPSBmICYmIGYucmVjb3JkQmF0Y2hlc0xlbmd0aCgpOyArK2kgPCBuOykge1xuICAgICAgICBpZiAoYiA9IGYucmVjb3JkQmF0Y2hlcyhpKSEpIHtcbiAgICAgICAgICAgIGJsb2Nrcy5wdXNoKG5ldyBGaWxlQmxvY2soYi5tZXRhRGF0YUxlbmd0aCgpLCBiLmJvZHlMZW5ndGgoKSwgYi5vZmZzZXQoKSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBibG9ja3M7XG59XG5cbmZ1bmN0aW9uIGZpZWxkc0Zyb21TY2hlbWEoczogX1NjaGVtYSwgZGljdGlvbmFyeUZpZWxkczogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeT4+IHwgbnVsbCkge1xuICAgIGNvbnN0IGZpZWxkcyA9IFtdIGFzIEZpZWxkW107XG4gICAgZm9yIChsZXQgaSA9IC0xLCBjOiBGaWVsZCB8IG51bGwsIG4gPSBzICYmIHMuZmllbGRzTGVuZ3RoKCk7ICsraSA8IG47KSB7XG4gICAgICAgIGlmIChjID0gZmllbGQocy5maWVsZHMoaSkhLCBkaWN0aW9uYXJ5RmllbGRzKSkge1xuICAgICAgICAgICAgZmllbGRzLnB1c2goYyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZpZWxkcztcbn1cblxuZnVuY3Rpb24gZmllbGRzRnJvbUZpZWxkKGY6IF9GaWVsZCwgZGljdGlvbmFyeUZpZWxkczogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeT4+IHwgbnVsbCkge1xuICAgIGNvbnN0IGZpZWxkcyA9IFtdIGFzIEZpZWxkW107XG4gICAgZm9yIChsZXQgaSA9IC0xLCBjOiBGaWVsZCB8IG51bGwsIG4gPSBmICYmIGYuY2hpbGRyZW5MZW5ndGgoKTsgKytpIDwgbjspIHtcbiAgICAgICAgaWYgKGMgPSBmaWVsZChmLmNoaWxkcmVuKGkpISwgZGljdGlvbmFyeUZpZWxkcykpIHtcbiAgICAgICAgICAgIGZpZWxkcy5wdXNoKGMpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmaWVsZHM7XG59XG5cbmZ1bmN0aW9uIGZpZWxkTm9kZXNGcm9tUmVjb3JkQmF0Y2goYjogX1JlY29yZEJhdGNoKSB7XG4gICAgY29uc3QgZmllbGROb2RlcyA9IFtdIGFzIEZpZWxkTWV0YWRhdGFbXTtcbiAgICBmb3IgKGxldCBpID0gLTEsIG4gPSBiLm5vZGVzTGVuZ3RoKCk7ICsraSA8IG47KSB7XG4gICAgICAgIGZpZWxkTm9kZXMucHVzaChmaWVsZE5vZGVGcm9tUmVjb3JkQmF0Y2goYi5ub2RlcyhpKSEpKTtcbiAgICB9XG4gICAgcmV0dXJuIGZpZWxkTm9kZXM7XG59XG5cbmZ1bmN0aW9uIGJ1ZmZlcnNGcm9tUmVjb3JkQmF0Y2goYjogX1JlY29yZEJhdGNoLCB2ZXJzaW9uOiBNZXRhZGF0YVZlcnNpb24pIHtcbiAgICBjb25zdCBidWZmZXJzID0gW10gYXMgQnVmZmVyTWV0YWRhdGFbXTtcbiAgICBmb3IgKGxldCBpID0gLTEsIG4gPSBiLmJ1ZmZlcnNMZW5ndGgoKTsgKytpIDwgbjspIHtcbiAgICAgICAgbGV0IGJ1ZmZlciA9IGIuYnVmZmVycyhpKSE7XG4gICAgICAgIC8vIElmIHRoaXMgQXJyb3cgYnVmZmVyIHdhcyB3cml0dGVuIGJlZm9yZSB2ZXJzaW9uIDQsXG4gICAgICAgIC8vIGFkdmFuY2UgdGhlIGJ1ZmZlcidzIGJiX3BvcyA4IGJ5dGVzIHRvIHNraXAgcGFzdFxuICAgICAgICAvLyB0aGUgbm93LXJlbW92ZWQgcGFnZSBpZCBmaWVsZC5cbiAgICAgICAgaWYgKHZlcnNpb24gPCBNZXRhZGF0YVZlcnNpb24uVjQpIHtcbiAgICAgICAgICAgIGJ1ZmZlci5iYl9wb3MgKz0gKDggKiAoaSArIDEpKTtcbiAgICAgICAgfVxuICAgICAgICBidWZmZXJzLnB1c2goYnVmZmVyRnJvbVJlY29yZEJhdGNoKGJ1ZmZlcikpO1xuICAgIH1cbiAgICByZXR1cm4gYnVmZmVycztcbn1cblxuZnVuY3Rpb24gZmllbGQoZjogX0ZpZWxkLCBkaWN0aW9uYXJ5RmllbGRzOiBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5Pj4gfCBudWxsKSB7XG4gICAgbGV0IG5hbWUgPSBmLm5hbWUoKSE7XG4gICAgbGV0IGZpZWxkOiBGaWVsZCB8IHZvaWQ7XG4gICAgbGV0IG51bGxhYmxlID0gZi5udWxsYWJsZSgpO1xuICAgIGxldCBtZXRhZGF0YSA9IGN1c3RvbU1ldGFkYXRhKGYpO1xuICAgIGxldCBkYXRhVHlwZTogRGF0YVR5cGU8YW55PiB8IG51bGw7XG4gICAgbGV0IGtleXNNZXRhOiBfSW50IHwgbnVsbCwgaWQ6IG51bWJlcjtcbiAgICBsZXQgZGljdE1ldGE6IF9EaWN0aW9uYXJ5RW5jb2RpbmcgfCBudWxsO1xuICAgIGlmICghZGljdGlvbmFyeUZpZWxkcyB8fCAhKGRpY3RNZXRhID0gZi5kaWN0aW9uYXJ5KCkpKSB7XG4gICAgICAgIGlmIChkYXRhVHlwZSA9IHR5cGVGcm9tRmllbGQoZiwgZmllbGRzRnJvbUZpZWxkKGYsIGRpY3Rpb25hcnlGaWVsZHMpKSkge1xuICAgICAgICAgICAgZmllbGQgPSBuZXcgRmllbGQobmFtZSwgZGF0YVR5cGUsIG51bGxhYmxlLCBtZXRhZGF0YSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGRhdGFUeXBlID0gZGljdGlvbmFyeUZpZWxkcy5oYXMoaWQgPSBkaWN0TWV0YS5pZCgpLmxvdylcbiAgICAgICAgICAgICAgICAgICAgICAgID8gZGljdGlvbmFyeUZpZWxkcy5nZXQoaWQpIS50eXBlLmRpY3Rpb25hcnlcbiAgICAgICAgICAgICAgICAgICAgICAgIDogdHlwZUZyb21GaWVsZChmLCBmaWVsZHNGcm9tRmllbGQoZiwgbnVsbCkpKSB7XG4gICAgICAgIGRhdGFUeXBlID0gbmV3IERpY3Rpb25hcnkoZGF0YVR5cGUsXG4gICAgICAgICAgICAvLyBhIGRpY3Rpb25hcnkgaW5kZXggZGVmYXVsdHMgdG8gc2lnbmVkIDMyIGJpdCBpbnQgaWYgdW5zcGVjaWZpZWRcbiAgICAgICAgICAgIChrZXlzTWV0YSA9IGRpY3RNZXRhLmluZGV4VHlwZSgpKSA/IGludEZyb21GaWVsZChrZXlzTWV0YSkhIDogbmV3IEludDMyKCksXG4gICAgICAgICAgICBpZCwgZGljdE1ldGEuaXNPcmRlcmVkKClcbiAgICAgICAgKTtcbiAgICAgICAgZmllbGQgPSBuZXcgRmllbGQobmFtZSwgZGF0YVR5cGUsIG51bGxhYmxlLCBtZXRhZGF0YSk7XG4gICAgICAgIGRpY3Rpb25hcnlGaWVsZHMuaGFzKGlkKSB8fCBkaWN0aW9uYXJ5RmllbGRzLnNldChpZCwgZmllbGQgYXMgRmllbGQ8RGljdGlvbmFyeT4pO1xuICAgIH1cbiAgICByZXR1cm4gZmllbGQgfHwgbnVsbDtcbn1cblxuZnVuY3Rpb24gY3VzdG9tTWV0YWRhdGEocGFyZW50PzogX1NjaGVtYSB8IF9GaWVsZCB8IG51bGwpIHtcbiAgICBjb25zdCBkYXRhID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICBpZiAocGFyZW50KSB7XG4gICAgICAgIGZvciAobGV0IGVudHJ5LCBrZXksIGkgPSAtMSwgbiA9IHBhcmVudC5jdXN0b21NZXRhZGF0YUxlbmd0aCgpIHwgMDsgKytpIDwgbjspIHtcbiAgICAgICAgICAgIGlmICgoZW50cnkgPSBwYXJlbnQuY3VzdG9tTWV0YWRhdGEoaSkpICYmIChrZXkgPSBlbnRyeS5rZXkoKSkgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGRhdGEuc2V0KGtleSwgZW50cnkudmFsdWUoKSEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkYXRhO1xufVxuXG5mdW5jdGlvbiBmaWVsZE5vZGVGcm9tUmVjb3JkQmF0Y2goZjogX0ZpZWxkTm9kZSkge1xuICAgIHJldHVybiBuZXcgRmllbGRNZXRhZGF0YShmLmxlbmd0aCgpLCBmLm51bGxDb3VudCgpKTtcbn1cblxuZnVuY3Rpb24gYnVmZmVyRnJvbVJlY29yZEJhdGNoKGI6IF9CdWZmZXIpIHtcbiAgICByZXR1cm4gbmV3IEJ1ZmZlck1ldGFkYXRhKGIub2Zmc2V0KCksIGIubGVuZ3RoKCkpO1xufVxuXG5mdW5jdGlvbiB0eXBlRnJvbUZpZWxkKGY6IF9GaWVsZCwgY2hpbGRyZW4/OiBGaWVsZFtdKTogRGF0YVR5cGU8YW55PiB8IG51bGwge1xuICAgIHN3aXRjaCAoZi50eXBlVHlwZSgpKSB7XG4gICAgICAgIGNhc2UgVHlwZS5OT05FOiByZXR1cm4gbnVsbDtcbiAgICAgICAgY2FzZSBUeXBlLk51bGw6IHJldHVybiBudWxsRnJvbUZpZWxkKGYudHlwZShuZXcgX051bGwoKSkhKTtcbiAgICAgICAgY2FzZSBUeXBlLkludDogcmV0dXJuIGludEZyb21GaWVsZChmLnR5cGUobmV3IF9JbnQoKSkhKTtcbiAgICAgICAgY2FzZSBUeXBlLkZsb2F0aW5nUG9pbnQ6IHJldHVybiBmbG9hdEZyb21GaWVsZChmLnR5cGUobmV3IF9GbG9hdGluZ1BvaW50KCkpISk7XG4gICAgICAgIGNhc2UgVHlwZS5CaW5hcnk6IHJldHVybiBiaW5hcnlGcm9tRmllbGQoZi50eXBlKG5ldyBfQmluYXJ5KCkpISk7XG4gICAgICAgIGNhc2UgVHlwZS5VdGY4OiByZXR1cm4gdXRmOEZyb21GaWVsZChmLnR5cGUobmV3IF9VdGY4KCkpISk7XG4gICAgICAgIGNhc2UgVHlwZS5Cb29sOiByZXR1cm4gYm9vbEZyb21GaWVsZChmLnR5cGUobmV3IF9Cb29sKCkpISk7XG4gICAgICAgIGNhc2UgVHlwZS5EZWNpbWFsOiByZXR1cm4gZGVjaW1hbEZyb21GaWVsZChmLnR5cGUobmV3IF9EZWNpbWFsKCkpISk7XG4gICAgICAgIGNhc2UgVHlwZS5EYXRlOiByZXR1cm4gZGF0ZUZyb21GaWVsZChmLnR5cGUobmV3IF9EYXRlKCkpISk7XG4gICAgICAgIGNhc2UgVHlwZS5UaW1lOiByZXR1cm4gdGltZUZyb21GaWVsZChmLnR5cGUobmV3IF9UaW1lKCkpISk7XG4gICAgICAgIGNhc2UgVHlwZS5UaW1lc3RhbXA6IHJldHVybiB0aW1lc3RhbXBGcm9tRmllbGQoZi50eXBlKG5ldyBfVGltZXN0YW1wKCkpISk7XG4gICAgICAgIGNhc2UgVHlwZS5JbnRlcnZhbDogcmV0dXJuIGludGVydmFsRnJvbUZpZWxkKGYudHlwZShuZXcgX0ludGVydmFsKCkpISk7XG4gICAgICAgIGNhc2UgVHlwZS5MaXN0OiByZXR1cm4gbGlzdEZyb21GaWVsZChmLnR5cGUobmV3IF9MaXN0KCkpISwgY2hpbGRyZW4gfHwgW10pO1xuICAgICAgICBjYXNlIFR5cGUuU3RydWN0XzogcmV0dXJuIHN0cnVjdEZyb21GaWVsZChmLnR5cGUobmV3IF9TdHJ1Y3QoKSkhLCBjaGlsZHJlbiB8fCBbXSk7XG4gICAgICAgIGNhc2UgVHlwZS5VbmlvbjogcmV0dXJuIHVuaW9uRnJvbUZpZWxkKGYudHlwZShuZXcgX1VuaW9uKCkpISwgY2hpbGRyZW4gfHwgW10pO1xuICAgICAgICBjYXNlIFR5cGUuRml4ZWRTaXplQmluYXJ5OiByZXR1cm4gZml4ZWRTaXplQmluYXJ5RnJvbUZpZWxkKGYudHlwZShuZXcgX0ZpeGVkU2l6ZUJpbmFyeSgpKSEpO1xuICAgICAgICBjYXNlIFR5cGUuRml4ZWRTaXplTGlzdDogcmV0dXJuIGZpeGVkU2l6ZUxpc3RGcm9tRmllbGQoZi50eXBlKG5ldyBfRml4ZWRTaXplTGlzdCgpKSEsIGNoaWxkcmVuIHx8IFtdKTtcbiAgICAgICAgY2FzZSBUeXBlLk1hcDogcmV0dXJuIG1hcEZyb21GaWVsZChmLnR5cGUobmV3IF9NYXAoKSkhLCBjaGlsZHJlbiB8fCBbXSk7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgVW5yZWNvZ25pemVkIHR5cGUgJHtmLnR5cGVUeXBlKCl9YCk7XG59XG5cbmZ1bmN0aW9uIG51bGxGcm9tRmllbGQgICAgICAgICAgIChfdHlwZTogX051bGwpICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IHJldHVybiBuZXcgTnVsbCgpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5mdW5jdGlvbiBpbnRGcm9tRmllbGQgICAgICAgICAgICAoX3R5cGU6IF9JbnQpICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBzd2l0Y2ggKF90eXBlLmJpdFdpZHRoKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICA4OiByZXR1cm4gX3R5cGUuaXNTaWduZWQoKSA/IG5ldyAgSW50OCgpIDogbmV3ICBVaW50OCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMTY6IHJldHVybiBfdHlwZS5pc1NpZ25lZCgpID8gbmV3IEludDE2KCkgOiBuZXcgVWludDE2KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAzMjogcmV0dXJuIF90eXBlLmlzU2lnbmVkKCkgPyBuZXcgSW50MzIoKSA6IG5ldyBVaW50MzIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDY0OiByZXR1cm4gX3R5cGUuaXNTaWduZWQoKSA/IG5ldyBJbnQ2NCgpIDogbmV3IFVpbnQ2NCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbmZ1bmN0aW9uIGZsb2F0RnJvbUZpZWxkICAgICAgICAgIChfdHlwZTogX0Zsb2F0aW5nUG9pbnQpICAgICAgICAgICAgICAgICAgICB7IHN3aXRjaCAoX3R5cGUucHJlY2lzaW9uKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFByZWNpc2lvbi5IQUxGOiByZXR1cm4gbmV3IEZsb2F0MTYoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFByZWNpc2lvbi5TSU5HTEU6IHJldHVybiBuZXcgRmxvYXQzMigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgUHJlY2lzaW9uLkRPVUJMRTogcmV0dXJuIG5ldyBGbG9hdDY0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuZnVuY3Rpb24gYmluYXJ5RnJvbUZpZWxkICAgICAgICAgKF90eXBlOiBfQmluYXJ5KSAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgcmV0dXJuIG5ldyBCaW5hcnkoKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbmZ1bmN0aW9uIHV0ZjhGcm9tRmllbGQgICAgICAgICAgIChfdHlwZTogX1V0ZjgpICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IHJldHVybiBuZXcgVXRmOCgpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5mdW5jdGlvbiBib29sRnJvbUZpZWxkICAgICAgICAgICAoX3R5cGU6IF9Cb29sKSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyByZXR1cm4gbmV3IEJvb2woKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuZnVuY3Rpb24gZGVjaW1hbEZyb21GaWVsZCAgICAgICAgKF90eXBlOiBfRGVjaW1hbCkgICAgICAgICAgICAgICAgICAgICAgICAgIHsgcmV0dXJuIG5ldyBEZWNpbWFsKF90eXBlLnNjYWxlKCksIF90eXBlLnByZWNpc2lvbigpKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbmZ1bmN0aW9uIGRhdGVGcm9tRmllbGQgICAgICAgICAgIChfdHlwZTogX0RhdGUpICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IHJldHVybiBuZXcgRGF0ZV8oX3R5cGUudW5pdCgpKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5mdW5jdGlvbiB0aW1lRnJvbUZpZWxkICAgICAgICAgICAoX3R5cGU6IF9UaW1lKSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyByZXR1cm4gbmV3IFRpbWUoX3R5cGUudW5pdCgpLCBfdHlwZS5iaXRXaWR0aCgpIGFzIFRpbWVCaXRXaWR0aCk7ICAgICAgICAgICAgICAgICAgfVxuZnVuY3Rpb24gdGltZXN0YW1wRnJvbUZpZWxkICAgICAgKF90eXBlOiBfVGltZXN0YW1wKSAgICAgICAgICAgICAgICAgICAgICAgIHsgcmV0dXJuIG5ldyBUaW1lc3RhbXAoX3R5cGUudW5pdCgpLCBfdHlwZS50aW1lem9uZSgpKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbmZ1bmN0aW9uIGludGVydmFsRnJvbUZpZWxkICAgICAgIChfdHlwZTogX0ludGVydmFsKSAgICAgICAgICAgICAgICAgICAgICAgICB7IHJldHVybiBuZXcgSW50ZXJ2YWwoX3R5cGUudW5pdCgpKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5mdW5jdGlvbiBsaXN0RnJvbUZpZWxkICAgICAgICAgICAoX3R5cGU6IF9MaXN0LCBjaGlsZHJlbjogRmllbGRbXSkgICAgICAgICAgeyByZXR1cm4gbmV3IExpc3QoY2hpbGRyZW4pOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuZnVuY3Rpb24gc3RydWN0RnJvbUZpZWxkICAgICAgICAgKF90eXBlOiBfU3RydWN0LCBjaGlsZHJlbjogRmllbGRbXSkgICAgICAgIHsgcmV0dXJuIG5ldyBTdHJ1Y3QoY2hpbGRyZW4pOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbmZ1bmN0aW9uIHVuaW9uRnJvbUZpZWxkICAgICAgICAgIChfdHlwZTogX1VuaW9uLCBjaGlsZHJlbjogRmllbGRbXSkgICAgICAgICB7IHJldHVybiBuZXcgVW5pb24oX3R5cGUubW9kZSgpLCAoX3R5cGUudHlwZUlkc0FycmF5KCkgfHwgW10pIGFzIFR5cGVbXSwgY2hpbGRyZW4pOyB9XG5mdW5jdGlvbiBmaXhlZFNpemVCaW5hcnlGcm9tRmllbGQoX3R5cGU6IF9GaXhlZFNpemVCaW5hcnkpICAgICAgICAgICAgICAgICAgeyByZXR1cm4gbmV3IEZpeGVkU2l6ZUJpbmFyeShfdHlwZS5ieXRlV2lkdGgoKSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuZnVuY3Rpb24gZml4ZWRTaXplTGlzdEZyb21GaWVsZCAgKF90eXBlOiBfRml4ZWRTaXplTGlzdCwgY2hpbGRyZW46IEZpZWxkW10pIHsgcmV0dXJuIG5ldyBGaXhlZFNpemVMaXN0KF90eXBlLmxpc3RTaXplKCksIGNoaWxkcmVuKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbmZ1bmN0aW9uIG1hcEZyb21GaWVsZCAgICAgICAgICAgIChfdHlwZTogX01hcCwgY2hpbGRyZW46IEZpZWxkW10pICAgICAgICAgICB7IHJldHVybiBuZXcgTWFwXyhfdHlwZS5rZXlzU29ydGVkKCksIGNoaWxkcmVuKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4iXX0=

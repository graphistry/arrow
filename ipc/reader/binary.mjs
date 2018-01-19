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
import * as tslib_1 from "tslib";
import { flatbuffers } from 'flatbuffers';
import { TypeDataLoader } from './vector';
import { Message, Footer, FileBlock, RecordBatchMetadata, DictionaryBatch, BufferMetadata, FieldMetadata, } from '../metadata';
import { Schema, Field, Dictionary, Null, Binary, Bool, Utf8, Decimal, Date_, Time, Timestamp, Interval, List, Struct, Union, FixedSizeBinary, FixedSizeList, Map_, } from '../../type';
import { Int8, Uint8, Int16, Uint16, Int32, Uint32, Int64, Uint64, Float16, Float64, Float32, } from '../../type';
var ByteBuffer = flatbuffers.ByteBuffer;
export function* readBuffers(sources) {
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
export function readBuffersAsync(sources) {
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
export class BinaryDataLoader extends TypeDataLoader {
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
            if (Message.isSchema(message)) {
                return message;
            }
        }
    }
    return null;
}
function* readStreamMessages(bb) {
    for (const message of readMessages(bb)) {
        if (Message.isRecordBatch(message)) {
            yield message;
        }
        else if (Message.isDictionaryBatch(message)) {
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
import * as File_ from '../../fb/File';
import * as Schema_ from '../../fb/Schema';
import * as Message_ from '../../fb/Message';
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
    return new Footer(dictionaryBatchesFromFooter(f), recordBatchesFromFooter(f), new Schema(fieldsFromSchema(s, dictionaryFields), customMetadata(s), f.version(), dictionaryFields));
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
    return new Schema(fieldsFromSchema(s, dictionaryFields), customMetadata(s), version, dictionaryFields);
}
function recordBatchFromMessage(version, b) {
    return new RecordBatchMetadata(version, b.length(), fieldNodesFromRecordBatch(b), buffersFromRecordBatch(b, version));
}
function dictionaryBatchFromMessage(version, d) {
    return new DictionaryBatch(version, recordBatchFromMessage(version, d.data()), d.id(), d.isDelta());
}
function dictionaryBatchesFromFooter(f) {
    const blocks = [];
    for (let b, i = -1, n = f && f.dictionariesLength(); ++i < n;) {
        if (b = f.dictionaries(i)) {
            blocks.push(new FileBlock(b.metaDataLength(), b.bodyLength(), b.offset()));
        }
    }
    return blocks;
}
function recordBatchesFromFooter(f) {
    const blocks = [];
    for (let b, i = -1, n = f && f.recordBatchesLength(); ++i < n;) {
        if (b = f.recordBatches(i)) {
            blocks.push(new FileBlock(b.metaDataLength(), b.bodyLength(), b.offset()));
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
            field = new Field(name, dataType, nullable, metadata);
        }
    }
    else if (dataType = dictionaryFields.has(id = dictMeta.id().low)
        ? dictionaryFields.get(id).type.dictionary
        : typeFromField(f, fieldsFromField(f, null))) {
        dataType = new Dictionary(dataType, 
        // a dictionary index defaults to signed 32 bit int if unspecified
        (keysMeta = dictMeta.indexType()) ? intFromField(keysMeta) : new Int32(), id, dictMeta.isOrdered());
        field = new Field(name, dataType, nullable, metadata);
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
    return new FieldMetadata(f.length(), f.nullCount());
}
function bufferFromRecordBatch(b) {
    return new BufferMetadata(b.offset(), b.length());
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
function nullFromField(_type) { return new Null(); }
function intFromField(_type) {
    switch (_type.bitWidth()) {
        case 8: return _type.isSigned() ? new Int8() : new Uint8();
        case 16: return _type.isSigned() ? new Int16() : new Uint16();
        case 32: return _type.isSigned() ? new Int32() : new Uint32();
        case 64: return _type.isSigned() ? new Int64() : new Uint64();
    }
    return null;
}
function floatFromField(_type) {
    switch (_type.precision()) {
        case Precision.HALF: return new Float16();
        case Precision.SINGLE: return new Float32();
        case Precision.DOUBLE: return new Float64();
    }
    return null;
}
function binaryFromField(_type) { return new Binary(); }
function utf8FromField(_type) { return new Utf8(); }
function boolFromField(_type) { return new Bool(); }
function decimalFromField(_type) { return new Decimal(_type.scale(), _type.precision()); }
function dateFromField(_type) { return new Date_(_type.unit()); }
function timeFromField(_type) { return new Time(_type.unit(), _type.bitWidth()); }
function timestampFromField(_type) { return new Timestamp(_type.unit(), _type.timezone()); }
function intervalFromField(_type) { return new Interval(_type.unit()); }
function listFromField(_type, children) { return new List(children); }
function structFromField(_type, children) { return new Struct(children); }
function unionFromField(_type, children) { return new Union(_type.mode(), (_type.typeIdsArray() || []), children); }
function fixedSizeBinaryFromField(_type) { return new FixedSizeBinary(_type.byteWidth()); }
function fixedSizeListFromField(_type, children) { return new FixedSizeList(_type.listSize(), children); }
function mapFromField(_type, children) { return new Map_(_type.keysSorted(), children); }

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LElBQU8sT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO0FBRXpELElBQU8sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDO0FBQ3BFLElBQU8sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUM7QUFJNUUsSUFBTyxLQUFLLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7QUFDckQsSUFBTyxJQUFJLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUM7QUFDbkQsSUFBTyxjQUFjLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUM7QUFDdkUsSUFBTyxPQUFPLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7QUFDekQsSUFBTyxLQUFLLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7QUFDckQsSUFBTyxLQUFLLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7QUFDckQsSUFBTyxRQUFRLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7QUFDM0QsSUFBTyxLQUFLLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7QUFDckQsSUFBTyxLQUFLLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7QUFDckQsSUFBTyxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7QUFDL0QsSUFBTyxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUM7QUFDN0QsSUFBTyxLQUFLLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7QUFDckQsSUFBTyxPQUFPLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7QUFDMUQsSUFBTyxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7QUFDdkQsSUFBTyxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQztBQUMzRSxJQUFPLGNBQWMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQztBQUN2RSxJQUFPLElBQUksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQztBQUVuRCw4QkFBOEIsRUFBYztJQUN4QyxNQUFNLGdCQUFnQixHQUFHLElBQUksR0FBRyxFQUE2QixDQUFDO0lBQzlELE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUcsQ0FBQztJQUN2RCxNQUFNLENBQUMsSUFBSSxNQUFNLENBQ2IsMkJBQTJCLENBQUMsQ0FBQyxDQUFDLEVBQUUsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQzFELElBQUksTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsZ0JBQWdCLENBQUMsQ0FDdEcsQ0FBQztBQUNOLENBQUM7QUFFRCwrQkFBK0IsRUFBYztJQUN6QyxNQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFFLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxPQUFPLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3ZGLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDWCxLQUFLLGFBQWEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksT0FBTyxFQUFFLENBQUUsRUFBRSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDbEcsS0FBSyxhQUFhLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLFlBQVksRUFBRSxDQUFFLENBQUMsQ0FBQztRQUN0RyxLQUFLLGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLDBCQUEwQixDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksZ0JBQWdCLEVBQUUsQ0FBRSxDQUFDLENBQUM7SUFDdEgsQ0FBQztJQUNELE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDWiwwREFBMEQ7QUFDOUQsQ0FBQztBQUVELDJCQUEyQixPQUF3QixFQUFFLENBQVUsRUFBRSxnQkFBZ0Q7SUFDN0csTUFBTSxDQUFDLElBQUksTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztBQUMzRyxDQUFDO0FBRUQsZ0NBQWdDLE9BQXdCLEVBQUUsQ0FBZTtJQUNyRSxNQUFNLENBQUMsSUFBSSxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxFQUFFLHNCQUFzQixDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQzFILENBQUM7QUFFRCxvQ0FBb0MsT0FBd0IsRUFBRSxDQUFtQjtJQUM3RSxNQUFNLENBQUMsSUFBSSxlQUFlLENBQUMsT0FBTyxFQUFFLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7QUFDekcsQ0FBQztBQUVELHFDQUFxQyxDQUFVO0lBQzNDLE1BQU0sTUFBTSxHQUFHLEVBQWlCLENBQUM7SUFDakMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLGtCQUFrQixFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7UUFDcEUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQy9FLENBQUM7SUFDTCxDQUFDO0lBQ0QsTUFBTSxDQUFDLE1BQU0sQ0FBQztBQUNsQixDQUFDO0FBRUQsaUNBQWlDLENBQVU7SUFDdkMsTUFBTSxNQUFNLEdBQUcsRUFBaUIsQ0FBQztJQUNqQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQVMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztRQUNyRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUUsQ0FBQyxDQUFDLENBQUM7WUFDMUIsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDL0UsQ0FBQztJQUNMLENBQUM7SUFDRCxNQUFNLENBQUMsTUFBTSxDQUFDO0FBQ2xCLENBQUM7QUFFRCwwQkFBMEIsQ0FBVSxFQUFFLGdCQUF1RDtJQUN6RixNQUFNLE1BQU0sR0FBRyxFQUFhLENBQUM7SUFDN0IsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBZSxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO1FBQ3BFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25CLENBQUM7SUFDTCxDQUFDO0lBQ0QsTUFBTSxDQUFDLE1BQU0sQ0FBQztBQUNsQixDQUFDO0FBRUQseUJBQXlCLENBQVMsRUFBRSxnQkFBdUQ7SUFDdkYsTUFBTSxNQUFNLEdBQUcsRUFBYSxDQUFDO0lBQzdCLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQWUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxjQUFjLEVBQUUsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztRQUN0RSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFFLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQixDQUFDO0lBQ0wsQ0FBQztJQUNELE1BQU0sQ0FBQyxNQUFNLENBQUM7QUFDbEIsQ0FBQztBQUVELG1DQUFtQyxDQUFlO0lBQzlDLE1BQU0sVUFBVSxHQUFHLEVBQXFCLENBQUM7SUFDekMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztRQUM3QyxVQUFVLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFDRCxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQ3RCLENBQUM7QUFFRCxnQ0FBZ0MsQ0FBZSxFQUFFLE9BQXdCO0lBQ3JFLE1BQU0sT0FBTyxHQUFHLEVBQXNCLENBQUM7SUFDdkMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxhQUFhLEVBQUUsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztRQUMvQyxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBRSxDQUFDO1FBQzNCLHFEQUFxRDtRQUNyRCxtREFBbUQ7UUFDbkQsaUNBQWlDO1FBQ2pDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sR0FBRyxlQUFlLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMvQixNQUFNLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkMsQ0FBQztRQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBQ0QsTUFBTSxDQUFDLE9BQU8sQ0FBQztBQUNuQixDQUFDO0FBRUQsZUFBZSxDQUFTLEVBQUUsZ0JBQXVEO0lBQzdFLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUcsQ0FBQztJQUNyQixJQUFJLEtBQW1CLENBQUM7SUFDeEIsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQzVCLElBQUksUUFBUSxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqQyxJQUFJLFFBQThCLENBQUM7SUFDbkMsSUFBSSxRQUFxQixFQUFFLEVBQVUsQ0FBQztJQUN0QyxJQUFJLFFBQW9DLENBQUM7SUFDekMsRUFBRSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRCxFQUFFLENBQUMsQ0FBQyxRQUFRLEdBQUcsYUFBYSxDQUFDLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDcEUsS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzFELENBQUM7SUFDTCxDQUFDO0lBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUM7UUFDOUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVTtRQUMzQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9ELFFBQVEsR0FBRyxJQUFJLFVBQVUsQ0FBQyxRQUFRO1FBQzlCLGtFQUFrRTtRQUNsRSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssRUFBRSxFQUN6RSxFQUFFLEVBQUUsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUMzQixDQUFDO1FBQ0YsS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3RELGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEtBQTBCLENBQUMsQ0FBQztJQUNyRixDQUFDO0lBQ0QsTUFBTSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUM7QUFDekIsQ0FBQztBQUVELHdCQUF3QixNQUFnQztJQUNwRCxNQUFNLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztJQUN2QyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ1QsR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO1lBQzNFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNwRSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFHLENBQUMsQ0FBQztZQUNsQyxDQUFDO1FBQ0wsQ0FBQztJQUNMLENBQUM7SUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDO0FBQ2hCLENBQUM7QUFFRCxrQ0FBa0MsQ0FBYTtJQUMzQyxNQUFNLENBQUMsSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO0FBQ3hELENBQUM7QUFFRCwrQkFBK0IsQ0FBVTtJQUNyQyxNQUFNLENBQUMsSUFBSSxjQUFjLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQ3RELENBQUM7QUFFRCx1QkFBdUIsQ0FBUyxFQUFFLFFBQWtCO0lBQ2hELE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkIsS0FBSyxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFDNUIsS0FBSyxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFFLENBQUMsQ0FBQztRQUMzRCxLQUFLLElBQUksQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUUsQ0FBQyxDQUFDO1FBQ3hELEtBQUssSUFBSSxDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxjQUFjLEVBQUUsQ0FBRSxDQUFDLENBQUM7UUFDOUUsS0FBSyxJQUFJLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLE9BQU8sRUFBRSxDQUFFLENBQUMsQ0FBQztRQUNqRSxLQUFLLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUUsQ0FBQyxDQUFDO1FBQzNELEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBRSxDQUFDLENBQUM7UUFDM0QsS0FBSyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksUUFBUSxFQUFFLENBQUUsQ0FBQyxDQUFDO1FBQ3BFLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBRSxDQUFDLENBQUM7UUFDM0QsS0FBSyxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFFLENBQUMsQ0FBQztRQUMzRCxLQUFLLElBQUksQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxVQUFVLEVBQUUsQ0FBRSxDQUFDLENBQUM7UUFDMUUsS0FBSyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksU0FBUyxFQUFFLENBQUUsQ0FBQyxDQUFDO1FBQ3ZFLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBRSxFQUFFLFFBQVEsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUMzRSxLQUFLLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxFQUFFLENBQUUsRUFBRSxRQUFRLElBQUksRUFBRSxDQUFDLENBQUM7UUFDbEYsS0FBSyxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLE1BQU0sRUFBRSxDQUFFLEVBQUUsUUFBUSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzlFLEtBQUssSUFBSSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLGdCQUFnQixFQUFFLENBQUUsQ0FBQyxDQUFDO1FBQzVGLEtBQUssSUFBSSxDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLGNBQWMsRUFBRSxDQUFFLEVBQUUsUUFBUSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3RHLEtBQUssSUFBSSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBRSxFQUFFLFFBQVEsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUN6RCxDQUFDO0FBRUQsdUJBQWtDLEtBQVksSUFBZ0MsTUFBTSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBZ0UsQ0FBQztBQUNqSyxzQkFBa0MsS0FBVztJQUFpQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3ZCLEtBQU0sQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUssSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUssS0FBSyxFQUFFLENBQUM7UUFDOUQsS0FBSyxFQUFFLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUM5RCxLQUFLLEVBQUUsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQzlELEtBQUssRUFBRSxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksTUFBTSxFQUFFLENBQUM7SUFDbEUsQ0FBQztJQUNELE1BQU0sQ0FBQyxJQUFJLENBQUM7QUFBc0UsQ0FBQztBQUNqSyx3QkFBa0MsS0FBcUI7SUFBdUIsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN4QixLQUFLLFNBQVMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksT0FBTyxFQUFFLENBQUM7UUFDMUMsS0FBSyxTQUFTLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQzVDLEtBQUssU0FBUyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsSUFBSSxPQUFPLEVBQUUsQ0FBQztJQUNoRCxDQUFDO0lBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQztBQUFzRSxDQUFDO0FBQ2pLLHlCQUFrQyxLQUFjLElBQThCLE1BQU0sQ0FBQyxJQUFJLE1BQU0sRUFBRSxDQUFDLENBQThELENBQUM7QUFDakssdUJBQWtDLEtBQVksSUFBZ0MsTUFBTSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBZ0UsQ0FBQztBQUNqSyx1QkFBa0MsS0FBWSxJQUFnQyxNQUFNLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFnRSxDQUFDO0FBQ2pLLDBCQUFrQyxLQUFlLElBQTZCLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBNkIsQ0FBQztBQUNqSyx1QkFBa0MsS0FBWSxJQUFnQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBbUQsQ0FBQztBQUNqSyx1QkFBa0MsS0FBWSxJQUFnQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxFQUFFLEtBQUssQ0FBQyxRQUFRLEVBQWtCLENBQUMsQ0FBQyxDQUFrQixDQUFDO0FBQ2pLLDRCQUFrQyxLQUFpQixJQUEyQixNQUFNLENBQUMsSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxFQUFFLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQTZCLENBQUM7QUFDakssMkJBQWtDLEtBQWdCLElBQTRCLE1BQU0sQ0FBQyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFnRCxDQUFDO0FBQ2pLLHVCQUFrQyxLQUFZLEVBQUUsUUFBaUIsSUFBYSxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBd0QsQ0FBQztBQUNqSyx5QkFBa0MsS0FBYyxFQUFFLFFBQWlCLElBQVcsTUFBTSxDQUFDLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQXNELENBQUM7QUFDakssd0JBQWtDLEtBQWEsRUFBRSxRQUFpQixJQUFZLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLElBQUksRUFBRSxDQUFXLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pLLGtDQUFrQyxLQUF1QixJQUFxQixNQUFNLENBQUMsSUFBSSxlQUFlLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBb0MsQ0FBQztBQUNqSyxnQ0FBa0MsS0FBcUIsRUFBRSxRQUFpQixJQUFJLE1BQU0sQ0FBQyxJQUFJLGFBQWEsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBNkIsQ0FBQztBQUNqSyxzQkFBa0MsS0FBVyxFQUFFLFFBQWlCLElBQWMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFvQyxDQUFDIiwiZmlsZSI6ImlwYy9yZWFkZXIvYmluYXJ5LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IFZlY3RvciB9IGZyb20gJy4uLy4uL3ZlY3Rvcic7XG5pbXBvcnQgeyBmbGF0YnVmZmVycyB9IGZyb20gJ2ZsYXRidWZmZXJzJztcbmltcG9ydCB7IFR5cGVEYXRhTG9hZGVyIH0gZnJvbSAnLi92ZWN0b3InO1xuaW1wb3J0IHsgTWVzc2FnZSwgRm9vdGVyLCBGaWxlQmxvY2ssIFJlY29yZEJhdGNoTWV0YWRhdGEsIERpY3Rpb25hcnlCYXRjaCwgQnVmZmVyTWV0YWRhdGEsIEZpZWxkTWV0YWRhdGEsIH0gZnJvbSAnLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtcbiAgICBTY2hlbWEsIEZpZWxkLFxuICAgIERhdGFUeXBlLCBEaWN0aW9uYXJ5LFxuICAgIE51bGwsIFRpbWVCaXRXaWR0aCxcbiAgICBCaW5hcnksIEJvb2wsIFV0ZjgsIERlY2ltYWwsXG4gICAgRGF0ZV8sIFRpbWUsIFRpbWVzdGFtcCwgSW50ZXJ2YWwsXG4gICAgTGlzdCwgU3RydWN0LCBVbmlvbiwgRml4ZWRTaXplQmluYXJ5LCBGaXhlZFNpemVMaXN0LCBNYXBfLFxufSBmcm9tICcuLi8uLi90eXBlJztcblxuaW1wb3J0IHtcbiAgICBJbnQ4LCAgVWludDgsXG4gICAgSW50MTYsIFVpbnQxNixcbiAgICBJbnQzMiwgVWludDMyLFxuICAgIEludDY0LCBVaW50NjQsXG4gICAgRmxvYXQxNiwgRmxvYXQ2NCwgRmxvYXQzMixcbn0gZnJvbSAnLi4vLi4vdHlwZSc7XG5cbmltcG9ydCBCeXRlQnVmZmVyID0gZmxhdGJ1ZmZlcnMuQnl0ZUJ1ZmZlcjtcblxudHlwZSBNZXNzYWdlUmVhZGVyID0gKGJiOiBCeXRlQnVmZmVyKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoTWV0YWRhdGEgfCBEaWN0aW9uYXJ5QmF0Y2g+O1xuXG5leHBvcnQgZnVuY3Rpb24qIHJlYWRCdWZmZXJzPFQgZXh0ZW5kcyBVaW50OEFycmF5IHwgQnVmZmVyIHwgc3RyaW5nPihzb3VyY2VzOiBJdGVyYWJsZTxUPiB8IFVpbnQ4QXJyYXkgfCBCdWZmZXIgfCBzdHJpbmcpIHtcbiAgICBsZXQgc2NoZW1hOiBTY2hlbWEgfCBudWxsID0gbnVsbDtcbiAgICBsZXQgZGljdGlvbmFyaWVzID0gbmV3IE1hcDxudW1iZXIsIFZlY3Rvcj4oKTtcbiAgICBsZXQgcmVhZE1lc3NhZ2VzOiBNZXNzYWdlUmVhZGVyIHwgbnVsbCA9IG51bGw7XG4gICAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyhzb3VyY2VzKSB8fCB0eXBlb2Ygc291cmNlcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgc291cmNlcyA9IFtzb3VyY2VzIGFzIFRdO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHNvdXJjZSBvZiBzb3VyY2VzKSB7XG4gICAgICAgIGNvbnN0IGJiID0gdG9CeXRlQnVmZmVyKHNvdXJjZSk7XG4gICAgICAgIGlmICgoIXNjaGVtYSAmJiAoeyBzY2hlbWEsIHJlYWRNZXNzYWdlcyB9ID0gcmVhZFNjaGVtYShiYikpKSAmJiBzY2hlbWEgJiYgcmVhZE1lc3NhZ2VzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG1lc3NhZ2Ugb2YgcmVhZE1lc3NhZ2VzKGJiKSkge1xuICAgICAgICAgICAgICAgIHlpZWxkIHtcbiAgICAgICAgICAgICAgICAgICAgc2NoZW1hLCBtZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICBsb2FkZXI6IG5ldyBCaW5hcnlEYXRhTG9hZGVyKFxuICAgICAgICAgICAgICAgICAgICAgICAgYmIsXG4gICAgICAgICAgICAgICAgICAgICAgICBhcnJheUl0ZXJhdG9yKG1lc3NhZ2Uubm9kZXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgYXJyYXlJdGVyYXRvcihtZXNzYWdlLmJ1ZmZlcnMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGljdGlvbmFyaWVzXG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24qIHJlYWRCdWZmZXJzQXN5bmM8VCBleHRlbmRzIFVpbnQ4QXJyYXkgfCBCdWZmZXIgfCBzdHJpbmc+KHNvdXJjZXM6IEFzeW5jSXRlcmFibGU8VD4pIHtcbiAgICBsZXQgc2NoZW1hOiBTY2hlbWEgfCBudWxsID0gbnVsbDtcbiAgICBsZXQgZGljdGlvbmFyaWVzID0gbmV3IE1hcDxudW1iZXIsIFZlY3Rvcj4oKTtcbiAgICBsZXQgcmVhZE1lc3NhZ2VzOiBNZXNzYWdlUmVhZGVyIHwgbnVsbCA9IG51bGw7XG4gICAgZm9yIGF3YWl0IChjb25zdCBzb3VyY2Ugb2Ygc291cmNlcykge1xuICAgICAgICBjb25zdCBiYiA9IHRvQnl0ZUJ1ZmZlcihzb3VyY2UpO1xuICAgICAgICBpZiAoKCFzY2hlbWEgJiYgKHsgc2NoZW1hLCByZWFkTWVzc2FnZXMgfSA9IHJlYWRTY2hlbWEoYmIpKSkgJiYgc2NoZW1hICYmIHJlYWRNZXNzYWdlcykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBtZXNzYWdlIG9mIHJlYWRNZXNzYWdlcyhiYikpIHtcbiAgICAgICAgICAgICAgICB5aWVsZCB7XG4gICAgICAgICAgICAgICAgICAgIHNjaGVtYSwgbWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgbG9hZGVyOiBuZXcgQmluYXJ5RGF0YUxvYWRlcihcbiAgICAgICAgICAgICAgICAgICAgICAgIGJiLFxuICAgICAgICAgICAgICAgICAgICAgICAgYXJyYXlJdGVyYXRvcihtZXNzYWdlLm5vZGVzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFycmF5SXRlcmF0b3IobWVzc2FnZS5idWZmZXJzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpY3Rpb25hcmllc1xuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEJpbmFyeURhdGFMb2FkZXIgZXh0ZW5kcyBUeXBlRGF0YUxvYWRlciB7XG4gICAgcHJpdmF0ZSBieXRlczogVWludDhBcnJheTtcbiAgICBwcml2YXRlIG1lc3NhZ2VPZmZzZXQ6IG51bWJlcjtcbiAgICBjb25zdHJ1Y3RvcihiYjogQnl0ZUJ1ZmZlciwgbm9kZXM6IEl0ZXJhdG9yPEZpZWxkTWV0YWRhdGE+LCBidWZmZXJzOiBJdGVyYXRvcjxCdWZmZXJNZXRhZGF0YT4sIGRpY3Rpb25hcmllczogTWFwPG51bWJlciwgVmVjdG9yPikge1xuICAgICAgICBzdXBlcihub2RlcywgYnVmZmVycywgZGljdGlvbmFyaWVzKTtcbiAgICAgICAgdGhpcy5ieXRlcyA9IGJiLmJ5dGVzKCk7XG4gICAgICAgIHRoaXMubWVzc2FnZU9mZnNldCA9IGJiLnBvc2l0aW9uKCk7XG4gICAgfVxuICAgIHByb3RlY3RlZCByZWFkT2Zmc2V0czxUIGV4dGVuZHMgRGF0YVR5cGU+KHR5cGU6IFQsIGJ1ZmZlcj86IEJ1ZmZlck1ldGFkYXRhKSB7IHJldHVybiB0aGlzLnJlYWREYXRhKHR5cGUsIGJ1ZmZlcik7IH1cbiAgICBwcm90ZWN0ZWQgcmVhZFR5cGVJZHM8VCBleHRlbmRzIERhdGFUeXBlPih0eXBlOiBULCBidWZmZXI/OiBCdWZmZXJNZXRhZGF0YSkgeyByZXR1cm4gdGhpcy5yZWFkRGF0YSh0eXBlLCBidWZmZXIpOyB9XG4gICAgcHJvdGVjdGVkIHJlYWREYXRhPFQgZXh0ZW5kcyBEYXRhVHlwZT4oX3R5cGU6IFQsIHsgbGVuZ3RoLCBvZmZzZXQgfTogQnVmZmVyTWV0YWRhdGEgPSB0aGlzLmdldEJ1ZmZlck1ldGFkYXRhKCkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KHRoaXMuYnl0ZXMuYnVmZmVyLCB0aGlzLmJ5dGVzLmJ5dGVPZmZzZXQgKyB0aGlzLm1lc3NhZ2VPZmZzZXQgKyBvZmZzZXQsIGxlbmd0aCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiogYXJyYXlJdGVyYXRvcihhcnI6IEFycmF5PGFueT4pIHsgeWllbGQqIGFycjsgfVxuXG5mdW5jdGlvbiB0b0J5dGVCdWZmZXIoYnl0ZXM/OiBVaW50OEFycmF5IHwgQnVmZmVyIHwgc3RyaW5nKSB7XG4gICAgbGV0IGFycjogVWludDhBcnJheSA9IGJ5dGVzIGFzIGFueSB8fCBuZXcgVWludDhBcnJheSgwKTtcbiAgICBpZiAodHlwZW9mIGJ5dGVzID09PSAnc3RyaW5nJykge1xuICAgICAgICBhcnIgPSBuZXcgVWludDhBcnJheShieXRlcy5sZW5ndGgpO1xuICAgICAgICBmb3IgKGxldCBpID0gLTEsIG4gPSBieXRlcy5sZW5ndGg7ICsraSA8IG47KSB7XG4gICAgICAgICAgICBhcnJbaV0gPSBieXRlcy5jaGFyQ29kZUF0KGkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgQnl0ZUJ1ZmZlcihhcnIpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IEJ5dGVCdWZmZXIoYXJyKTtcbn1cblxuZnVuY3Rpb24gcmVhZFNjaGVtYShiYjogQnl0ZUJ1ZmZlcikge1xuICAgIGxldCBzY2hlbWE6IFNjaGVtYSwgcmVhZE1lc3NhZ2VzLCBmb290ZXI6IEZvb3RlciB8IG51bGw7XG4gICAgaWYgKGZvb3RlciA9IHJlYWRGaWxlU2NoZW1hKGJiKSkge1xuICAgICAgICBzY2hlbWEgPSBmb290ZXIuc2NoZW1hO1xuICAgICAgICByZWFkTWVzc2FnZXMgPSByZWFkRmlsZU1lc3NhZ2VzKGZvb3Rlcik7XG4gICAgfSBlbHNlIGlmIChzY2hlbWEgPSByZWFkU3RyZWFtU2NoZW1hKGJiKSEpIHtcbiAgICAgICAgcmVhZE1lc3NhZ2VzID0gcmVhZFN0cmVhbU1lc3NhZ2VzO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBBcnJvdyBidWZmZXInKTtcbiAgICB9XG4gICAgcmV0dXJuIHsgc2NoZW1hLCByZWFkTWVzc2FnZXMgfTtcbn1cblxuY29uc3QgUEFERElORyA9IDQ7XG5jb25zdCBNQUdJQ19TVFIgPSAnQVJST1cxJztcbmNvbnN0IE1BR0lDID0gbmV3IFVpbnQ4QXJyYXkoTUFHSUNfU1RSLmxlbmd0aCk7XG5mb3IgKGxldCBpID0gMDsgaSA8IE1BR0lDX1NUUi5sZW5ndGg7IGkgKz0gMSB8IDApIHtcbiAgICBNQUdJQ1tpXSA9IE1BR0lDX1NUUi5jaGFyQ29kZUF0KGkpO1xufVxuXG5mdW5jdGlvbiBjaGVja0Zvck1hZ2ljQXJyb3dTdHJpbmcoYnVmZmVyOiBVaW50OEFycmF5LCBpbmRleCA9IDApIHtcbiAgICBmb3IgKGxldCBpID0gLTEsIG4gPSBNQUdJQy5sZW5ndGg7ICsraSA8IG47KSB7XG4gICAgICAgIGlmIChNQUdJQ1tpXSAhPT0gYnVmZmVyW2luZGV4ICsgaV0pIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuY29uc3QgbWFnaWNMZW5ndGggPSBNQUdJQy5sZW5ndGg7XG5jb25zdCBtYWdpY0FuZFBhZGRpbmcgPSBtYWdpY0xlbmd0aCArIFBBRERJTkc7XG5jb25zdCBtYWdpY1gyQW5kUGFkZGluZyA9IG1hZ2ljTGVuZ3RoICogMiArIFBBRERJTkc7XG5cbmZ1bmN0aW9uIHJlYWRTdHJlYW1TY2hlbWEoYmI6IEJ5dGVCdWZmZXIpIHtcbiAgICBpZiAoIWNoZWNrRm9yTWFnaWNBcnJvd1N0cmluZyhiYi5ieXRlcygpLCAwKSkge1xuICAgICAgICBmb3IgKGNvbnN0IG1lc3NhZ2Ugb2YgcmVhZE1lc3NhZ2VzKGJiKSkge1xuICAgICAgICAgICAgaWYgKE1lc3NhZ2UuaXNTY2hlbWEobWVzc2FnZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWVzc2FnZSBhcyBTY2hlbWE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uKiByZWFkU3RyZWFtTWVzc2FnZXMoYmI6IEJ5dGVCdWZmZXIpIHtcbiAgICBmb3IgKGNvbnN0IG1lc3NhZ2Ugb2YgcmVhZE1lc3NhZ2VzKGJiKSkge1xuICAgICAgICBpZiAoTWVzc2FnZS5pc1JlY29yZEJhdGNoKG1lc3NhZ2UpKSB7XG4gICAgICAgICAgICB5aWVsZCBtZXNzYWdlO1xuICAgICAgICB9IGVsc2UgaWYgKE1lc3NhZ2UuaXNEaWN0aW9uYXJ5QmF0Y2gobWVzc2FnZSkpIHtcbiAgICAgICAgICAgIHlpZWxkIG1lc3NhZ2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBwb3NpdGlvbiB0aGUgYnVmZmVyIGFmdGVyIHRoZSBib2R5IHRvIHJlYWQgdGhlIG5leHQgbWVzc2FnZVxuICAgICAgICBiYi5zZXRQb3NpdGlvbihiYi5wb3NpdGlvbigpICsgbWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlYWRGaWxlU2NoZW1hKGJiOiBCeXRlQnVmZmVyKSB7XG4gICAgbGV0IGZpbGVMZW5ndGggPSBiYi5jYXBhY2l0eSgpLCBmb290ZXJMZW5ndGg6IG51bWJlciwgZm9vdGVyT2Zmc2V0OiBudW1iZXI7XG4gICAgaWYgKChmaWxlTGVuZ3RoIDwgbWFnaWNYMkFuZFBhZGRpbmcgLyogICAgICAgICAgICAgICAgICAgICBBcnJvdyBidWZmZXIgdG9vIHNtYWxsICovKSB8fFxuICAgICAgICAoIWNoZWNrRm9yTWFnaWNBcnJvd1N0cmluZyhiYi5ieXRlcygpLCAwKSAvKiAgICAgICAgICAgICAgICAgICAgICAgIE1pc3NpbmcgbWFnaWMgc3RhcnQgICAgKi8pIHx8XG4gICAgICAgICghY2hlY2tGb3JNYWdpY0Fycm93U3RyaW5nKGJiLmJ5dGVzKCksIGZpbGVMZW5ndGggLSBtYWdpY0xlbmd0aCkgLyogTWlzc2luZyBtYWdpYyBlbmQgICAgICAqLykgfHxcbiAgICAgICAgKC8qICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEludmFsaWQgZm9vdGVyIGxlbmd0aCAgKi9cbiAgICAgICAgKGZvb3Rlckxlbmd0aCA9IGJiLnJlYWRJbnQzMihmb290ZXJPZmZzZXQgPSBmaWxlTGVuZ3RoIC0gbWFnaWNBbmRQYWRkaW5nKSkgPCAxICYmXG4gICAgICAgIChmb290ZXJMZW5ndGggKyBtYWdpY1gyQW5kUGFkZGluZyA+IGZpbGVMZW5ndGgpKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgYmIuc2V0UG9zaXRpb24oZm9vdGVyT2Zmc2V0IC0gZm9vdGVyTGVuZ3RoKTtcbiAgICByZXR1cm4gZm9vdGVyRnJvbUJ5dGVCdWZmZXIoYmIpO1xufVxuXG5mdW5jdGlvbiByZWFkRmlsZU1lc3NhZ2VzKGZvb3RlcjogRm9vdGVyKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKiAoYmI6IEJ5dGVCdWZmZXIpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IC0xLCBiYXRjaGVzID0gZm9vdGVyLmRpY3Rpb25hcnlCYXRjaGVzLCBuID0gYmF0Y2hlcy5sZW5ndGg7ICsraSA8IG47KSB7XG4gICAgICAgICAgICBiYi5zZXRQb3NpdGlvbihiYXRjaGVzW2ldLm9mZnNldC5sb3cpO1xuICAgICAgICAgICAgeWllbGQgcmVhZE1lc3NhZ2UoYmIsIGJiLnJlYWRJbnQzMihiYi5wb3NpdGlvbigpKSkgYXMgRGljdGlvbmFyeUJhdGNoO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGkgPSAtMSwgYmF0Y2hlcyA9IGZvb3Rlci5yZWNvcmRCYXRjaGVzLCBuID0gYmF0Y2hlcy5sZW5ndGg7ICsraSA8IG47KSB7XG4gICAgICAgICAgICBiYi5zZXRQb3NpdGlvbihiYXRjaGVzW2ldLm9mZnNldC5sb3cpO1xuICAgICAgICAgICAgeWllbGQgcmVhZE1lc3NhZ2UoYmIsIGJiLnJlYWRJbnQzMihiYi5wb3NpdGlvbigpKSkgYXMgUmVjb3JkQmF0Y2hNZXRhZGF0YTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbmZ1bmN0aW9uKiByZWFkTWVzc2FnZXMoYmI6IEJ5dGVCdWZmZXIpIHtcbiAgICBsZXQgbGVuZ3RoOiBudW1iZXIsIG1lc3NhZ2U6IFNjaGVtYSB8IFJlY29yZEJhdGNoTWV0YWRhdGEgfCBEaWN0aW9uYXJ5QmF0Y2g7XG4gICAgd2hpbGUgKGJiLnBvc2l0aW9uKCkgPCBiYi5jYXBhY2l0eSgpICYmXG4gICAgICAgICAgKGxlbmd0aCA9IGJiLnJlYWRJbnQzMihiYi5wb3NpdGlvbigpKSkgPiAwKSB7XG4gICAgICAgIGlmIChtZXNzYWdlID0gcmVhZE1lc3NhZ2UoYmIsIGxlbmd0aCkhKSB7XG4gICAgICAgICAgICB5aWVsZCBtZXNzYWdlO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiByZWFkTWVzc2FnZShiYjogQnl0ZUJ1ZmZlciwgbGVuZ3RoOiBudW1iZXIpIHtcbiAgICBiYi5zZXRQb3NpdGlvbihiYi5wb3NpdGlvbigpICsgUEFERElORyk7XG4gICAgY29uc3QgbWVzc2FnZSA9IG1lc3NhZ2VGcm9tQnl0ZUJ1ZmZlcihiYik7XG4gICAgYmIuc2V0UG9zaXRpb24oYmIucG9zaXRpb24oKSArIGxlbmd0aCk7XG4gICAgcmV0dXJuIG1lc3NhZ2U7XG59XG5cbmltcG9ydCAqIGFzIEZpbGVfIGZyb20gJy4uLy4uL2ZiL0ZpbGUnO1xuaW1wb3J0ICogYXMgU2NoZW1hXyBmcm9tICcuLi8uLi9mYi9TY2hlbWEnO1xuaW1wb3J0ICogYXMgTWVzc2FnZV8gZnJvbSAnLi4vLi4vZmIvTWVzc2FnZSc7XG5cbmltcG9ydCBUeXBlID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVHlwZTtcbmltcG9ydCBQcmVjaXNpb24gPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5QcmVjaXNpb247XG5pbXBvcnQgTWVzc2FnZUhlYWRlciA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NZXNzYWdlSGVhZGVyO1xuaW1wb3J0IE1ldGFkYXRhVmVyc2lvbiA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk1ldGFkYXRhVmVyc2lvbjtcbmltcG9ydCBfRm9vdGVyID0gRmlsZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZvb3RlcjtcbmltcG9ydCBfQmxvY2sgPSBGaWxlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuQmxvY2s7XG5pbXBvcnQgX01lc3NhZ2UgPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTWVzc2FnZTtcbmltcG9ydCBfU2NoZW1hID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuU2NoZW1hO1xuaW1wb3J0IF9GaWVsZCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpZWxkO1xuaW1wb3J0IF9SZWNvcmRCYXRjaCA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5SZWNvcmRCYXRjaDtcbmltcG9ydCBfRGljdGlvbmFyeUJhdGNoID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRpY3Rpb25hcnlCYXRjaDtcbmltcG9ydCBfRmllbGROb2RlID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpZWxkTm9kZTtcbmltcG9ydCBfQnVmZmVyID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuQnVmZmVyO1xuaW1wb3J0IF9EaWN0aW9uYXJ5RW5jb2RpbmcgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EaWN0aW9uYXJ5RW5jb2Rpbmc7XG5pbXBvcnQgX051bGwgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5OdWxsO1xuaW1wb3J0IF9JbnQgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5JbnQ7XG5pbXBvcnQgX0Zsb2F0aW5nUG9pbnQgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GbG9hdGluZ1BvaW50O1xuaW1wb3J0IF9CaW5hcnkgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5CaW5hcnk7XG5pbXBvcnQgX0Jvb2wgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5Cb29sO1xuaW1wb3J0IF9VdGY4ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVXRmODtcbmltcG9ydCBfRGVjaW1hbCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRlY2ltYWw7XG5pbXBvcnQgX0RhdGUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EYXRlO1xuaW1wb3J0IF9UaW1lID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVGltZTtcbmltcG9ydCBfVGltZXN0YW1wID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVGltZXN0YW1wO1xuaW1wb3J0IF9JbnRlcnZhbCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkludGVydmFsO1xuaW1wb3J0IF9MaXN0ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTGlzdDtcbmltcG9ydCBfU3RydWN0ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuU3RydWN0XztcbmltcG9ydCBfVW5pb24gPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5VbmlvbjtcbmltcG9ydCBfRml4ZWRTaXplQmluYXJ5ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRml4ZWRTaXplQmluYXJ5O1xuaW1wb3J0IF9GaXhlZFNpemVMaXN0ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRml4ZWRTaXplTGlzdDtcbmltcG9ydCBfTWFwID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTWFwO1xuXG5mdW5jdGlvbiBmb290ZXJGcm9tQnl0ZUJ1ZmZlcihiYjogQnl0ZUJ1ZmZlcikge1xuICAgIGNvbnN0IGRpY3Rpb25hcnlGaWVsZHMgPSBuZXcgTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeT4+KCk7XG4gICAgY29uc3QgZiA9IF9Gb290ZXIuZ2V0Um9vdEFzRm9vdGVyKGJiKSwgcyA9IGYuc2NoZW1hKCkhO1xuICAgIHJldHVybiBuZXcgRm9vdGVyKFxuICAgICAgICBkaWN0aW9uYXJ5QmF0Y2hlc0Zyb21Gb290ZXIoZiksIHJlY29yZEJhdGNoZXNGcm9tRm9vdGVyKGYpLFxuICAgICAgICBuZXcgU2NoZW1hKGZpZWxkc0Zyb21TY2hlbWEocywgZGljdGlvbmFyeUZpZWxkcyksIGN1c3RvbU1ldGFkYXRhKHMpLCBmLnZlcnNpb24oKSwgZGljdGlvbmFyeUZpZWxkcylcbiAgICApO1xufVxuXG5mdW5jdGlvbiBtZXNzYWdlRnJvbUJ5dGVCdWZmZXIoYmI6IEJ5dGVCdWZmZXIpIHtcbiAgICBjb25zdCBtID0gX01lc3NhZ2UuZ2V0Um9vdEFzTWVzc2FnZShiYikhLCB0eXBlID0gbS5oZWFkZXJUeXBlKCksIHZlcnNpb24gPSBtLnZlcnNpb24oKTtcbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLlNjaGVtYTogcmV0dXJuIHNjaGVtYUZyb21NZXNzYWdlKHZlcnNpb24sIG0uaGVhZGVyKG5ldyBfU2NoZW1hKCkpISwgbmV3IE1hcCgpKTtcbiAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoOiByZXR1cm4gcmVjb3JkQmF0Y2hGcm9tTWVzc2FnZSh2ZXJzaW9uLCBtLmhlYWRlcihuZXcgX1JlY29yZEJhdGNoKCkpISk7XG4gICAgICAgIGNhc2UgTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2g6IHJldHVybiBkaWN0aW9uYXJ5QmF0Y2hGcm9tTWVzc2FnZSh2ZXJzaW9uLCBtLmhlYWRlcihuZXcgX0RpY3Rpb25hcnlCYXRjaCgpKSEpO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgICAvLyB0aHJvdyBuZXcgRXJyb3IoYFVucmVjb2duaXplZCBNZXNzYWdlIHR5cGUgJyR7dHlwZX0nYCk7XG59XG5cbmZ1bmN0aW9uIHNjaGVtYUZyb21NZXNzYWdlKHZlcnNpb246IE1ldGFkYXRhVmVyc2lvbiwgczogX1NjaGVtYSwgZGljdGlvbmFyeUZpZWxkczogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeT4+KSB7XG4gICAgcmV0dXJuIG5ldyBTY2hlbWEoZmllbGRzRnJvbVNjaGVtYShzLCBkaWN0aW9uYXJ5RmllbGRzKSwgY3VzdG9tTWV0YWRhdGEocyksIHZlcnNpb24sIGRpY3Rpb25hcnlGaWVsZHMpO1xufVxuXG5mdW5jdGlvbiByZWNvcmRCYXRjaEZyb21NZXNzYWdlKHZlcnNpb246IE1ldGFkYXRhVmVyc2lvbiwgYjogX1JlY29yZEJhdGNoKSB7XG4gICAgcmV0dXJuIG5ldyBSZWNvcmRCYXRjaE1ldGFkYXRhKHZlcnNpb24sIGIubGVuZ3RoKCksIGZpZWxkTm9kZXNGcm9tUmVjb3JkQmF0Y2goYiksIGJ1ZmZlcnNGcm9tUmVjb3JkQmF0Y2goYiwgdmVyc2lvbikpO1xufVxuXG5mdW5jdGlvbiBkaWN0aW9uYXJ5QmF0Y2hGcm9tTWVzc2FnZSh2ZXJzaW9uOiBNZXRhZGF0YVZlcnNpb24sIGQ6IF9EaWN0aW9uYXJ5QmF0Y2gpIHtcbiAgICByZXR1cm4gbmV3IERpY3Rpb25hcnlCYXRjaCh2ZXJzaW9uLCByZWNvcmRCYXRjaEZyb21NZXNzYWdlKHZlcnNpb24sIGQuZGF0YSgpISksIGQuaWQoKSwgZC5pc0RlbHRhKCkpO1xufVxuXG5mdW5jdGlvbiBkaWN0aW9uYXJ5QmF0Y2hlc0Zyb21Gb290ZXIoZjogX0Zvb3Rlcikge1xuICAgIGNvbnN0IGJsb2NrcyA9IFtdIGFzIEZpbGVCbG9ja1tdO1xuICAgIGZvciAobGV0IGI6IF9CbG9jaywgaSA9IC0xLCBuID0gZiAmJiBmLmRpY3Rpb25hcmllc0xlbmd0aCgpOyArK2kgPCBuOykge1xuICAgICAgICBpZiAoYiA9IGYuZGljdGlvbmFyaWVzKGkpISkge1xuICAgICAgICAgICAgYmxvY2tzLnB1c2gobmV3IEZpbGVCbG9jayhiLm1ldGFEYXRhTGVuZ3RoKCksIGIuYm9keUxlbmd0aCgpLCBiLm9mZnNldCgpKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGJsb2Nrcztcbn1cblxuZnVuY3Rpb24gcmVjb3JkQmF0Y2hlc0Zyb21Gb290ZXIoZjogX0Zvb3Rlcikge1xuICAgIGNvbnN0IGJsb2NrcyA9IFtdIGFzIEZpbGVCbG9ja1tdO1xuICAgIGZvciAobGV0IGI6IF9CbG9jaywgaSA9IC0xLCBuID0gZiAmJiBmLnJlY29yZEJhdGNoZXNMZW5ndGgoKTsgKytpIDwgbjspIHtcbiAgICAgICAgaWYgKGIgPSBmLnJlY29yZEJhdGNoZXMoaSkhKSB7XG4gICAgICAgICAgICBibG9ja3MucHVzaChuZXcgRmlsZUJsb2NrKGIubWV0YURhdGFMZW5ndGgoKSwgYi5ib2R5TGVuZ3RoKCksIGIub2Zmc2V0KCkpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYmxvY2tzO1xufVxuXG5mdW5jdGlvbiBmaWVsZHNGcm9tU2NoZW1hKHM6IF9TY2hlbWEsIGRpY3Rpb25hcnlGaWVsZHM6IE1hcDxudW1iZXIsIEZpZWxkPERpY3Rpb25hcnk+PiB8IG51bGwpIHtcbiAgICBjb25zdCBmaWVsZHMgPSBbXSBhcyBGaWVsZFtdO1xuICAgIGZvciAobGV0IGkgPSAtMSwgYzogRmllbGQgfCBudWxsLCBuID0gcyAmJiBzLmZpZWxkc0xlbmd0aCgpOyArK2kgPCBuOykge1xuICAgICAgICBpZiAoYyA9IGZpZWxkKHMuZmllbGRzKGkpISwgZGljdGlvbmFyeUZpZWxkcykpIHtcbiAgICAgICAgICAgIGZpZWxkcy5wdXNoKGMpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmaWVsZHM7XG59XG5cbmZ1bmN0aW9uIGZpZWxkc0Zyb21GaWVsZChmOiBfRmllbGQsIGRpY3Rpb25hcnlGaWVsZHM6IE1hcDxudW1iZXIsIEZpZWxkPERpY3Rpb25hcnk+PiB8IG51bGwpIHtcbiAgICBjb25zdCBmaWVsZHMgPSBbXSBhcyBGaWVsZFtdO1xuICAgIGZvciAobGV0IGkgPSAtMSwgYzogRmllbGQgfCBudWxsLCBuID0gZiAmJiBmLmNoaWxkcmVuTGVuZ3RoKCk7ICsraSA8IG47KSB7XG4gICAgICAgIGlmIChjID0gZmllbGQoZi5jaGlsZHJlbihpKSEsIGRpY3Rpb25hcnlGaWVsZHMpKSB7XG4gICAgICAgICAgICBmaWVsZHMucHVzaChjKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmllbGRzO1xufVxuXG5mdW5jdGlvbiBmaWVsZE5vZGVzRnJvbVJlY29yZEJhdGNoKGI6IF9SZWNvcmRCYXRjaCkge1xuICAgIGNvbnN0IGZpZWxkTm9kZXMgPSBbXSBhcyBGaWVsZE1ldGFkYXRhW107XG4gICAgZm9yIChsZXQgaSA9IC0xLCBuID0gYi5ub2Rlc0xlbmd0aCgpOyArK2kgPCBuOykge1xuICAgICAgICBmaWVsZE5vZGVzLnB1c2goZmllbGROb2RlRnJvbVJlY29yZEJhdGNoKGIubm9kZXMoaSkhKSk7XG4gICAgfVxuICAgIHJldHVybiBmaWVsZE5vZGVzO1xufVxuXG5mdW5jdGlvbiBidWZmZXJzRnJvbVJlY29yZEJhdGNoKGI6IF9SZWNvcmRCYXRjaCwgdmVyc2lvbjogTWV0YWRhdGFWZXJzaW9uKSB7XG4gICAgY29uc3QgYnVmZmVycyA9IFtdIGFzIEJ1ZmZlck1ldGFkYXRhW107XG4gICAgZm9yIChsZXQgaSA9IC0xLCBuID0gYi5idWZmZXJzTGVuZ3RoKCk7ICsraSA8IG47KSB7XG4gICAgICAgIGxldCBidWZmZXIgPSBiLmJ1ZmZlcnMoaSkhO1xuICAgICAgICAvLyBJZiB0aGlzIEFycm93IGJ1ZmZlciB3YXMgd3JpdHRlbiBiZWZvcmUgdmVyc2lvbiA0LFxuICAgICAgICAvLyBhZHZhbmNlIHRoZSBidWZmZXIncyBiYl9wb3MgOCBieXRlcyB0byBza2lwIHBhc3RcbiAgICAgICAgLy8gdGhlIG5vdy1yZW1vdmVkIHBhZ2UgaWQgZmllbGQuXG4gICAgICAgIGlmICh2ZXJzaW9uIDwgTWV0YWRhdGFWZXJzaW9uLlY0KSB7XG4gICAgICAgICAgICBidWZmZXIuYmJfcG9zICs9ICg4ICogKGkgKyAxKSk7XG4gICAgICAgIH1cbiAgICAgICAgYnVmZmVycy5wdXNoKGJ1ZmZlckZyb21SZWNvcmRCYXRjaChidWZmZXIpKTtcbiAgICB9XG4gICAgcmV0dXJuIGJ1ZmZlcnM7XG59XG5cbmZ1bmN0aW9uIGZpZWxkKGY6IF9GaWVsZCwgZGljdGlvbmFyeUZpZWxkczogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeT4+IHwgbnVsbCkge1xuICAgIGxldCBuYW1lID0gZi5uYW1lKCkhO1xuICAgIGxldCBmaWVsZDogRmllbGQgfCB2b2lkO1xuICAgIGxldCBudWxsYWJsZSA9IGYubnVsbGFibGUoKTtcbiAgICBsZXQgbWV0YWRhdGEgPSBjdXN0b21NZXRhZGF0YShmKTtcbiAgICBsZXQgZGF0YVR5cGU6IERhdGFUeXBlPGFueT4gfCBudWxsO1xuICAgIGxldCBrZXlzTWV0YTogX0ludCB8IG51bGwsIGlkOiBudW1iZXI7XG4gICAgbGV0IGRpY3RNZXRhOiBfRGljdGlvbmFyeUVuY29kaW5nIHwgbnVsbDtcbiAgICBpZiAoIWRpY3Rpb25hcnlGaWVsZHMgfHwgIShkaWN0TWV0YSA9IGYuZGljdGlvbmFyeSgpKSkge1xuICAgICAgICBpZiAoZGF0YVR5cGUgPSB0eXBlRnJvbUZpZWxkKGYsIGZpZWxkc0Zyb21GaWVsZChmLCBkaWN0aW9uYXJ5RmllbGRzKSkpIHtcbiAgICAgICAgICAgIGZpZWxkID0gbmV3IEZpZWxkKG5hbWUsIGRhdGFUeXBlLCBudWxsYWJsZSwgbWV0YWRhdGEpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChkYXRhVHlwZSA9IGRpY3Rpb25hcnlGaWVsZHMuaGFzKGlkID0gZGljdE1ldGEuaWQoKS5sb3cpXG4gICAgICAgICAgICAgICAgICAgICAgICA/IGRpY3Rpb25hcnlGaWVsZHMuZ2V0KGlkKSEudHlwZS5kaWN0aW9uYXJ5XG4gICAgICAgICAgICAgICAgICAgICAgICA6IHR5cGVGcm9tRmllbGQoZiwgZmllbGRzRnJvbUZpZWxkKGYsIG51bGwpKSkge1xuICAgICAgICBkYXRhVHlwZSA9IG5ldyBEaWN0aW9uYXJ5KGRhdGFUeXBlLFxuICAgICAgICAgICAgLy8gYSBkaWN0aW9uYXJ5IGluZGV4IGRlZmF1bHRzIHRvIHNpZ25lZCAzMiBiaXQgaW50IGlmIHVuc3BlY2lmaWVkXG4gICAgICAgICAgICAoa2V5c01ldGEgPSBkaWN0TWV0YS5pbmRleFR5cGUoKSkgPyBpbnRGcm9tRmllbGQoa2V5c01ldGEpISA6IG5ldyBJbnQzMigpLFxuICAgICAgICAgICAgaWQsIGRpY3RNZXRhLmlzT3JkZXJlZCgpXG4gICAgICAgICk7XG4gICAgICAgIGZpZWxkID0gbmV3IEZpZWxkKG5hbWUsIGRhdGFUeXBlLCBudWxsYWJsZSwgbWV0YWRhdGEpO1xuICAgICAgICBkaWN0aW9uYXJ5RmllbGRzLmhhcyhpZCkgfHwgZGljdGlvbmFyeUZpZWxkcy5zZXQoaWQsIGZpZWxkIGFzIEZpZWxkPERpY3Rpb25hcnk+KTtcbiAgICB9XG4gICAgcmV0dXJuIGZpZWxkIHx8IG51bGw7XG59XG5cbmZ1bmN0aW9uIGN1c3RvbU1ldGFkYXRhKHBhcmVudD86IF9TY2hlbWEgfCBfRmllbGQgfCBudWxsKSB7XG4gICAgY29uc3QgZGF0YSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgaWYgKHBhcmVudCkge1xuICAgICAgICBmb3IgKGxldCBlbnRyeSwga2V5LCBpID0gLTEsIG4gPSBwYXJlbnQuY3VzdG9tTWV0YWRhdGFMZW5ndGgoKSB8IDA7ICsraSA8IG47KSB7XG4gICAgICAgICAgICBpZiAoKGVudHJ5ID0gcGFyZW50LmN1c3RvbU1ldGFkYXRhKGkpKSAmJiAoa2V5ID0gZW50cnkua2V5KCkpICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBkYXRhLnNldChrZXksIGVudHJ5LnZhbHVlKCkhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbn1cblxuZnVuY3Rpb24gZmllbGROb2RlRnJvbVJlY29yZEJhdGNoKGY6IF9GaWVsZE5vZGUpIHtcbiAgICByZXR1cm4gbmV3IEZpZWxkTWV0YWRhdGEoZi5sZW5ndGgoKSwgZi5udWxsQ291bnQoKSk7XG59XG5cbmZ1bmN0aW9uIGJ1ZmZlckZyb21SZWNvcmRCYXRjaChiOiBfQnVmZmVyKSB7XG4gICAgcmV0dXJuIG5ldyBCdWZmZXJNZXRhZGF0YShiLm9mZnNldCgpLCBiLmxlbmd0aCgpKTtcbn1cblxuZnVuY3Rpb24gdHlwZUZyb21GaWVsZChmOiBfRmllbGQsIGNoaWxkcmVuPzogRmllbGRbXSk6IERhdGFUeXBlPGFueT4gfCBudWxsIHtcbiAgICBzd2l0Y2ggKGYudHlwZVR5cGUoKSkge1xuICAgICAgICBjYXNlIFR5cGUuTk9ORTogcmV0dXJuIG51bGw7XG4gICAgICAgIGNhc2UgVHlwZS5OdWxsOiByZXR1cm4gbnVsbEZyb21GaWVsZChmLnR5cGUobmV3IF9OdWxsKCkpISk7XG4gICAgICAgIGNhc2UgVHlwZS5JbnQ6IHJldHVybiBpbnRGcm9tRmllbGQoZi50eXBlKG5ldyBfSW50KCkpISk7XG4gICAgICAgIGNhc2UgVHlwZS5GbG9hdGluZ1BvaW50OiByZXR1cm4gZmxvYXRGcm9tRmllbGQoZi50eXBlKG5ldyBfRmxvYXRpbmdQb2ludCgpKSEpO1xuICAgICAgICBjYXNlIFR5cGUuQmluYXJ5OiByZXR1cm4gYmluYXJ5RnJvbUZpZWxkKGYudHlwZShuZXcgX0JpbmFyeSgpKSEpO1xuICAgICAgICBjYXNlIFR5cGUuVXRmODogcmV0dXJuIHV0ZjhGcm9tRmllbGQoZi50eXBlKG5ldyBfVXRmOCgpKSEpO1xuICAgICAgICBjYXNlIFR5cGUuQm9vbDogcmV0dXJuIGJvb2xGcm9tRmllbGQoZi50eXBlKG5ldyBfQm9vbCgpKSEpO1xuICAgICAgICBjYXNlIFR5cGUuRGVjaW1hbDogcmV0dXJuIGRlY2ltYWxGcm9tRmllbGQoZi50eXBlKG5ldyBfRGVjaW1hbCgpKSEpO1xuICAgICAgICBjYXNlIFR5cGUuRGF0ZTogcmV0dXJuIGRhdGVGcm9tRmllbGQoZi50eXBlKG5ldyBfRGF0ZSgpKSEpO1xuICAgICAgICBjYXNlIFR5cGUuVGltZTogcmV0dXJuIHRpbWVGcm9tRmllbGQoZi50eXBlKG5ldyBfVGltZSgpKSEpO1xuICAgICAgICBjYXNlIFR5cGUuVGltZXN0YW1wOiByZXR1cm4gdGltZXN0YW1wRnJvbUZpZWxkKGYudHlwZShuZXcgX1RpbWVzdGFtcCgpKSEpO1xuICAgICAgICBjYXNlIFR5cGUuSW50ZXJ2YWw6IHJldHVybiBpbnRlcnZhbEZyb21GaWVsZChmLnR5cGUobmV3IF9JbnRlcnZhbCgpKSEpO1xuICAgICAgICBjYXNlIFR5cGUuTGlzdDogcmV0dXJuIGxpc3RGcm9tRmllbGQoZi50eXBlKG5ldyBfTGlzdCgpKSEsIGNoaWxkcmVuIHx8IFtdKTtcbiAgICAgICAgY2FzZSBUeXBlLlN0cnVjdF86IHJldHVybiBzdHJ1Y3RGcm9tRmllbGQoZi50eXBlKG5ldyBfU3RydWN0KCkpISwgY2hpbGRyZW4gfHwgW10pO1xuICAgICAgICBjYXNlIFR5cGUuVW5pb246IHJldHVybiB1bmlvbkZyb21GaWVsZChmLnR5cGUobmV3IF9VbmlvbigpKSEsIGNoaWxkcmVuIHx8IFtdKTtcbiAgICAgICAgY2FzZSBUeXBlLkZpeGVkU2l6ZUJpbmFyeTogcmV0dXJuIGZpeGVkU2l6ZUJpbmFyeUZyb21GaWVsZChmLnR5cGUobmV3IF9GaXhlZFNpemVCaW5hcnkoKSkhKTtcbiAgICAgICAgY2FzZSBUeXBlLkZpeGVkU2l6ZUxpc3Q6IHJldHVybiBmaXhlZFNpemVMaXN0RnJvbUZpZWxkKGYudHlwZShuZXcgX0ZpeGVkU2l6ZUxpc3QoKSkhLCBjaGlsZHJlbiB8fCBbXSk7XG4gICAgICAgIGNhc2UgVHlwZS5NYXA6IHJldHVybiBtYXBGcm9tRmllbGQoZi50eXBlKG5ldyBfTWFwKCkpISwgY2hpbGRyZW4gfHwgW10pO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVucmVjb2duaXplZCB0eXBlICR7Zi50eXBlVHlwZSgpfWApO1xufVxuXG5mdW5jdGlvbiBudWxsRnJvbUZpZWxkICAgICAgICAgICAoX3R5cGU6IF9OdWxsKSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyByZXR1cm4gbmV3IE51bGwoKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuZnVuY3Rpb24gaW50RnJvbUZpZWxkICAgICAgICAgICAgKF90eXBlOiBfSW50KSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgc3dpdGNoIChfdHlwZS5iaXRXaWR0aCgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAgODogcmV0dXJuIF90eXBlLmlzU2lnbmVkKCkgPyBuZXcgIEludDgoKSA6IG5ldyAgVWludDgoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDE2OiByZXR1cm4gX3R5cGUuaXNTaWduZWQoKSA/IG5ldyBJbnQxNigpIDogbmV3IFVpbnQxNigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMzI6IHJldHVybiBfdHlwZS5pc1NpZ25lZCgpID8gbmV3IEludDMyKCkgOiBuZXcgVWludDMyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSA2NDogcmV0dXJuIF90eXBlLmlzU2lnbmVkKCkgPyBuZXcgSW50NjQoKSA6IG5ldyBVaW50NjQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5mdW5jdGlvbiBmbG9hdEZyb21GaWVsZCAgICAgICAgICAoX3R5cGU6IF9GbG9hdGluZ1BvaW50KSAgICAgICAgICAgICAgICAgICAgeyBzd2l0Y2ggKF90eXBlLnByZWNpc2lvbigpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBQcmVjaXNpb24uSEFMRjogcmV0dXJuIG5ldyBGbG9hdDE2KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBQcmVjaXNpb24uU0lOR0xFOiByZXR1cm4gbmV3IEZsb2F0MzIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFByZWNpc2lvbi5ET1VCTEU6IHJldHVybiBuZXcgRmxvYXQ2NCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbmZ1bmN0aW9uIGJpbmFyeUZyb21GaWVsZCAgICAgICAgIChfdHlwZTogX0JpbmFyeSkgICAgICAgICAgICAgICAgICAgICAgICAgICB7IHJldHVybiBuZXcgQmluYXJ5KCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5mdW5jdGlvbiB1dGY4RnJvbUZpZWxkICAgICAgICAgICAoX3R5cGU6IF9VdGY4KSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyByZXR1cm4gbmV3IFV0ZjgoKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuZnVuY3Rpb24gYm9vbEZyb21GaWVsZCAgICAgICAgICAgKF90eXBlOiBfQm9vbCkgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgcmV0dXJuIG5ldyBCb29sKCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbmZ1bmN0aW9uIGRlY2ltYWxGcm9tRmllbGQgICAgICAgIChfdHlwZTogX0RlY2ltYWwpICAgICAgICAgICAgICAgICAgICAgICAgICB7IHJldHVybiBuZXcgRGVjaW1hbChfdHlwZS5zY2FsZSgpLCBfdHlwZS5wcmVjaXNpb24oKSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5mdW5jdGlvbiBkYXRlRnJvbUZpZWxkICAgICAgICAgICAoX3R5cGU6IF9EYXRlKSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyByZXR1cm4gbmV3IERhdGVfKF90eXBlLnVuaXQoKSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuZnVuY3Rpb24gdGltZUZyb21GaWVsZCAgICAgICAgICAgKF90eXBlOiBfVGltZSkgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgcmV0dXJuIG5ldyBUaW1lKF90eXBlLnVuaXQoKSwgX3R5cGUuYml0V2lkdGgoKSBhcyBUaW1lQml0V2lkdGgpOyAgICAgICAgICAgICAgICAgIH1cbmZ1bmN0aW9uIHRpbWVzdGFtcEZyb21GaWVsZCAgICAgIChfdHlwZTogX1RpbWVzdGFtcCkgICAgICAgICAgICAgICAgICAgICAgICB7IHJldHVybiBuZXcgVGltZXN0YW1wKF90eXBlLnVuaXQoKSwgX3R5cGUudGltZXpvbmUoKSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5mdW5jdGlvbiBpbnRlcnZhbEZyb21GaWVsZCAgICAgICAoX3R5cGU6IF9JbnRlcnZhbCkgICAgICAgICAgICAgICAgICAgICAgICAgeyByZXR1cm4gbmV3IEludGVydmFsKF90eXBlLnVuaXQoKSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuZnVuY3Rpb24gbGlzdEZyb21GaWVsZCAgICAgICAgICAgKF90eXBlOiBfTGlzdCwgY2hpbGRyZW46IEZpZWxkW10pICAgICAgICAgIHsgcmV0dXJuIG5ldyBMaXN0KGNoaWxkcmVuKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbmZ1bmN0aW9uIHN0cnVjdEZyb21GaWVsZCAgICAgICAgIChfdHlwZTogX1N0cnVjdCwgY2hpbGRyZW46IEZpZWxkW10pICAgICAgICB7IHJldHVybiBuZXcgU3RydWN0KGNoaWxkcmVuKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5mdW5jdGlvbiB1bmlvbkZyb21GaWVsZCAgICAgICAgICAoX3R5cGU6IF9VbmlvbiwgY2hpbGRyZW46IEZpZWxkW10pICAgICAgICAgeyByZXR1cm4gbmV3IFVuaW9uKF90eXBlLm1vZGUoKSwgKF90eXBlLnR5cGVJZHNBcnJheSgpIHx8IFtdKSBhcyBUeXBlW10sIGNoaWxkcmVuKTsgfVxuZnVuY3Rpb24gZml4ZWRTaXplQmluYXJ5RnJvbUZpZWxkKF90eXBlOiBfRml4ZWRTaXplQmluYXJ5KSAgICAgICAgICAgICAgICAgIHsgcmV0dXJuIG5ldyBGaXhlZFNpemVCaW5hcnkoX3R5cGUuYnl0ZVdpZHRoKCkpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbmZ1bmN0aW9uIGZpeGVkU2l6ZUxpc3RGcm9tRmllbGQgIChfdHlwZTogX0ZpeGVkU2l6ZUxpc3QsIGNoaWxkcmVuOiBGaWVsZFtdKSB7IHJldHVybiBuZXcgRml4ZWRTaXplTGlzdChfdHlwZS5saXN0U2l6ZSgpLCBjaGlsZHJlbik7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5mdW5jdGlvbiBtYXBGcm9tRmllbGQgICAgICAgICAgICAoX3R5cGU6IF9NYXAsIGNoaWxkcmVuOiBGaWVsZFtdKSAgICAgICAgICAgeyByZXR1cm4gbmV3IE1hcF8oX3R5cGUua2V5c1NvcnRlZCgpLCBjaGlsZHJlbik7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuIl19

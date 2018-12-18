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
const flatbuffers_1 = require("flatbuffers");
const Schema_ = require("../../fb/Schema");
const Message_ = require("../../fb/Message");
const schema_1 = require("../../schema");
const buffer_1 = require("../../util/buffer");
const enum_1 = require("../../enum");
const typeassembler_1 = require("../../visitor/typeassembler");
const json_1 = require("./json");
var Long = flatbuffers_1.flatbuffers.Long;
var Builder = flatbuffers_1.flatbuffers.Builder;
var ByteBuffer = flatbuffers_1.flatbuffers.ByteBuffer;
var Type = Schema_.org.apache.arrow.flatbuf.Type;
var _Field = Schema_.org.apache.arrow.flatbuf.Field;
var _Schema = Schema_.org.apache.arrow.flatbuf.Schema;
var _Buffer = Schema_.org.apache.arrow.flatbuf.Buffer;
var _Message = Message_.org.apache.arrow.flatbuf.Message;
var _KeyValue = Schema_.org.apache.arrow.flatbuf.KeyValue;
var _FieldNode = Message_.org.apache.arrow.flatbuf.FieldNode;
var _Endianness = Schema_.org.apache.arrow.flatbuf.Endianness;
var _RecordBatch = Message_.org.apache.arrow.flatbuf.RecordBatch;
var _DictionaryBatch = Message_.org.apache.arrow.flatbuf.DictionaryBatch;
const type_1 = require("../../type");
/**
 * @ignore
 */
class Message {
    constructor(bodyLength, version, headerType, header) {
        this._version = version;
        this._headerType = headerType;
        this.body = new Uint8Array(0);
        header && (this._createHeader = () => header);
        this._bodyLength = typeof bodyLength === 'number' ? bodyLength : bodyLength.low;
    }
    /** @nocollapse */
    static fromJSON(msg, headerType) {
        const message = new Message(0, enum_1.MetadataVersion.V4, headerType);
        message._createHeader = messageHeaderFromJSON(msg, headerType);
        return message;
    }
    /** @nocollapse */
    static decode(buf) {
        buf = new ByteBuffer(buffer_1.toUint8Array(buf));
        const _message = _Message.getRootAsMessage(buf);
        const bodyLength = _message.bodyLength();
        const version = _message.version();
        const headerType = _message.headerType();
        const message = new Message(bodyLength, version, headerType);
        message._createHeader = decodeMessageHeader(_message, headerType);
        return message;
    }
    /** @nocollapse */
    static encode(message) {
        let b = new Builder(), headerOffset = -1;
        if (message.isSchema()) {
            headerOffset = schema_1.Schema.encode(b, message.header());
        }
        else if (message.isRecordBatch()) {
            headerOffset = RecordBatch.encode(b, message.header());
        }
        else if (message.isDictionaryBatch()) {
            headerOffset = DictionaryBatch.encode(b, message.header());
        }
        _Message.startMessage(b);
        _Message.addVersion(b, enum_1.MetadataVersion.V4);
        _Message.addHeader(b, headerOffset);
        _Message.addHeaderType(b, message.headerType);
        _Message.addBodyLength(b, new Long(message.bodyLength, 0));
        _Message.finishMessageBuffer(b, _Message.endMessage(b));
        return b.asUint8Array();
    }
    /** @nocollapse */
    static from(header, bodyLength = 0) {
        if (header instanceof schema_1.Schema) {
            return new Message(0, enum_1.MetadataVersion.V4, enum_1.MessageHeader.Schema, header);
        }
        if (header instanceof RecordBatch) {
            return new Message(bodyLength, enum_1.MetadataVersion.V4, enum_1.MessageHeader.RecordBatch, header);
        }
        if (header instanceof DictionaryBatch) {
            return new Message(bodyLength, enum_1.MetadataVersion.V4, enum_1.MessageHeader.DictionaryBatch, header);
        }
        throw new Error(`Unrecognized Message header: ${header}`);
    }
    get type() { return this.headerType; }
    get version() { return this._version; }
    get headerType() { return this._headerType; }
    get bodyLength() { return this._bodyLength; }
    header() { return this._createHeader(); }
    isSchema() { return this.headerType === enum_1.MessageHeader.Schema; }
    isRecordBatch() { return this.headerType === enum_1.MessageHeader.RecordBatch; }
    isDictionaryBatch() { return this.headerType === enum_1.MessageHeader.DictionaryBatch; }
}
exports.Message = Message;
/**
 * @ignore
 */
class RecordBatch {
    get nodes() { return this._nodes; }
    get length() { return this._length; }
    get buffers() { return this._buffers; }
    constructor(length, nodes, buffers) {
        this._nodes = nodes;
        this._buffers = buffers;
        this._length = typeof length === 'number' ? length : length.low;
    }
}
exports.RecordBatch = RecordBatch;
/**
 * @ignore
 */
class DictionaryBatch {
    get id() { return this._id; }
    get data() { return this._data; }
    get isDelta() { return this._isDelta; }
    get length() { return this.data.length; }
    get nodes() { return this.data.nodes; }
    get buffers() { return this.data.buffers; }
    constructor(data, id, isDelta = false) {
        this._data = data;
        this._isDelta = isDelta;
        this._id = typeof id === 'number' ? id : id.low;
    }
}
exports.DictionaryBatch = DictionaryBatch;
/**
 * @ignore
 */
class BufferRegion {
    constructor(offset, length) {
        this.offset = typeof offset === 'number' ? offset : offset.low;
        this.length = typeof length === 'number' ? length : length.low;
    }
}
exports.BufferRegion = BufferRegion;
/**
 * @ignore
 */
class FieldNode {
    constructor(length, nullCount) {
        this.length = typeof length === 'number' ? length : length.low;
        this.nullCount = typeof nullCount === 'number' ? nullCount : nullCount.low;
    }
}
exports.FieldNode = FieldNode;
function messageHeaderFromJSON(message, type) {
    return (() => {
        switch (type) {
            case enum_1.MessageHeader.Schema: return schema_1.Schema.fromJSON(message);
            case enum_1.MessageHeader.RecordBatch: return RecordBatch.fromJSON(message);
            case enum_1.MessageHeader.DictionaryBatch: return DictionaryBatch.fromJSON(message);
        }
        // return null;
        throw new Error(`Unrecognized Message type: { name: ${enum_1.MessageHeader[type]}, type: ${type} }`);
    });
}
function decodeMessageHeader(message, type) {
    return (() => {
        switch (type) {
            case enum_1.MessageHeader.Schema: return schema_1.Schema.decode(message.header(new _Schema()));
            case enum_1.MessageHeader.RecordBatch: return RecordBatch.decode(message.header(new _RecordBatch()), message.version());
            case enum_1.MessageHeader.DictionaryBatch: return DictionaryBatch.decode(message.header(new _DictionaryBatch()), message.version());
        }
        // return null;
        throw new Error(`Unrecognized Message type: { name: ${enum_1.MessageHeader[type]}, type: ${type} }`);
    });
}
schema_1.Field['encode'] = encodeField;
schema_1.Field['decode'] = decodeField;
schema_1.Field['fromJSON'] = json_1.fieldFromJSON;
schema_1.Schema['encode'] = encodeSchema;
schema_1.Schema['decode'] = decodeSchema;
schema_1.Schema['fromJSON'] = json_1.schemaFromJSON;
RecordBatch['encode'] = encodeRecordBatch;
RecordBatch['decode'] = decodeRecordBatch;
RecordBatch['fromJSON'] = json_1.recordBatchFromJSON;
DictionaryBatch['encode'] = encodeDictionaryBatch;
DictionaryBatch['decode'] = decodeDictionaryBatch;
DictionaryBatch['fromJSON'] = json_1.dictionaryBatchFromJSON;
FieldNode['encode'] = encodeFieldNode;
FieldNode['decode'] = decodeFieldNode;
BufferRegion['encode'] = encodeBufferRegion;
BufferRegion['decode'] = decodeBufferRegion;
function decodeSchema(_schema, dictionaries = new Map(), dictionaryFields = new Map()) {
    const fields = decodeSchemaFields(_schema, dictionaries, dictionaryFields);
    return new schema_1.Schema(fields, decodeCustomMetadata(_schema), dictionaries, dictionaryFields);
}
function decodeRecordBatch(batch, version = enum_1.MetadataVersion.V4) {
    return new RecordBatch(batch.length(), decodeFieldNodes(batch), decodeBuffers(batch, version));
}
function decodeDictionaryBatch(batch, version = enum_1.MetadataVersion.V4) {
    return new DictionaryBatch(RecordBatch.decode(batch.data(), version), batch.id(), batch.isDelta());
}
function decodeBufferRegion(b) {
    return new BufferRegion(b.offset(), b.length());
}
function decodeFieldNode(f) {
    return new FieldNode(f.length(), f.nullCount());
}
function decodeFieldNodes(batch) {
    return Array.from({ length: batch.nodesLength() }, (_, i) => batch.nodes(i)).filter(Boolean).map(FieldNode.decode);
}
function decodeBuffers(batch, version) {
    return Array.from({ length: batch.buffersLength() }, (_, i) => batch.buffers(i)).filter(Boolean).map(v3Compat(version, BufferRegion.decode));
}
function v3Compat(version, decode) {
    return (buffer, i) => {
        // If this Arrow buffer was written before version 4,
        // advance the buffer's bb_pos 8 bytes to skip past
        // the now-removed page_id field
        if (version < enum_1.MetadataVersion.V4) {
            buffer.bb_pos += (8 * (i + 1));
        }
        return decode(buffer);
    };
}
function decodeSchemaFields(schema, dictionaries, dictionaryFields) {
    return Array.from({ length: schema.fieldsLength() }, (_, i) => schema.fields(i)).filter(Boolean).map((f) => schema_1.Field.decode(f, dictionaries, dictionaryFields));
}
function decodeFieldChildren(field, dictionaries, dictionaryFields) {
    return Array.from({ length: field.childrenLength() }, (_, i) => field.children(i)).filter(Boolean).map((f) => schema_1.Field.decode(f, dictionaries, dictionaryFields));
}
function decodeField(f, dictionaries, dictionaryFields) {
    let id;
    let field;
    let type;
    let keys;
    let dictType;
    let dictMeta;
    let dictField;
    // If no dictionary encoding, or in the process of decoding the children of a dictionary-encoded field
    if (!dictionaries || !dictionaryFields || !(dictMeta = f.dictionary())) {
        type = decodeFieldType(f, decodeFieldChildren(f, dictionaries, dictionaryFields));
        field = new schema_1.Field(f.name(), type, f.nullable(), decodeCustomMetadata(f));
    }
    // tslint:disable
    // If dictionary encoded and the first time we've seen this dictionary id, decode
    // the data type and child fields, then wrap in a Dictionary type and insert the
    // data type into the dictionary types map.
    else if (!dictionaries.has(id = dictMeta.id().low)) {
        // a dictionary index defaults to signed 32 bit int if unspecified
        keys = (keys = dictMeta.indexType()) ? decodeIndexType(keys) : new type_1.Int32();
        dictionaries.set(id, type = decodeFieldType(f, decodeFieldChildren(f)));
        dictType = new type_1.Dictionary(type, keys, id, dictMeta.isOrdered());
        dictField = new schema_1.Field(f.name(), dictType, f.nullable(), decodeCustomMetadata(f));
        dictionaryFields.set(id, [field = dictField]);
    }
    // If dictionary encoded, and have already seen this dictionary Id in the schema, then reuse the
    // data type and wrap in a new Dictionary type and field.
    else {
        // a dictionary index defaults to signed 32 bit int if unspecified
        keys = (keys = dictMeta.indexType()) ? decodeIndexType(keys) : new type_1.Int32();
        dictType = new type_1.Dictionary(dictionaries.get(id), keys, id, dictMeta.isOrdered());
        dictField = new schema_1.Field(f.name(), dictType, f.nullable(), decodeCustomMetadata(f));
        dictionaryFields.get(id).push(field = dictField);
    }
    return field || null;
}
function decodeCustomMetadata(parent) {
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
function decodeIndexType(_type) {
    return new type_1.Int(_type.isSigned(), _type.bitWidth());
}
function decodeFieldType(f, children) {
    const typeId = f.typeType();
    switch (typeId) {
        case Type.NONE: return new type_1.DataType();
        case Type.Null: return new type_1.Null();
        case Type.Binary: return new type_1.Binary();
        case Type.Utf8: return new type_1.Utf8();
        case Type.Bool: return new type_1.Bool();
        case Type.List: return new type_1.List(children || []);
        case Type.Struct_: return new type_1.Struct(children || []);
    }
    switch (typeId) {
        case Type.Int: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.Int());
            return new type_1.Int(t.isSigned(), t.bitWidth());
        }
        case Type.FloatingPoint: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.FloatingPoint());
            return new type_1.Float(t.precision());
        }
        case Type.Decimal: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.Decimal());
            return new type_1.Decimal(t.scale(), t.precision());
        }
        case Type.Date: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.Date());
            return new type_1.Date_(t.unit());
        }
        case Type.Time: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.Time());
            return new type_1.Time(t.unit(), t.bitWidth());
        }
        case Type.Timestamp: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.Timestamp());
            return new type_1.Timestamp(t.unit(), t.timezone());
        }
        case Type.Interval: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.Interval());
            return new type_1.Interval(t.unit());
        }
        case Type.Union: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.Union());
            return new type_1.Union(t.mode(), (t.typeIdsArray() || []), children || []);
        }
        case Type.FixedSizeBinary: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.FixedSizeBinary());
            return new type_1.FixedSizeBinary(t.byteWidth());
        }
        case Type.FixedSizeList: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.FixedSizeList());
            return new type_1.FixedSizeList(t.listSize(), children || []);
        }
        case Type.Map: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.Map());
            return new type_1.Map_(children || [], t.keysSorted());
        }
    }
    throw new Error(`Unrecognized type: "${Type[typeId]}" (${typeId})`);
}
function encodeSchema(b, schema) {
    const fieldOffsets = schema.fields.map((f) => schema_1.Field.encode(b, f));
    _Schema.startFieldsVector(b, fieldOffsets.length);
    const fieldsVectorOffset = _Schema.createFieldsVector(b, fieldOffsets);
    const metadataOffset = !(schema.metadata && schema.metadata.size > 0) ? -1 :
        _Schema.createCustomMetadataVector(b, [...schema.metadata].map(([k, v]) => {
            const key = b.createString(`${k}`);
            const val = b.createString(`${v}`);
            _KeyValue.startKeyValue(b);
            _KeyValue.addKey(b, key);
            _KeyValue.addValue(b, val);
            return _KeyValue.endKeyValue(b);
        }));
    _Schema.startSchema(b);
    _Schema.addFields(b, fieldsVectorOffset);
    _Schema.addEndianness(b, platformIsLittleEndian ? _Endianness.Little : _Endianness.Big);
    if (metadataOffset !== -1) {
        _Schema.addCustomMetadata(b, metadataOffset);
    }
    return _Schema.endSchema(b);
}
function encodeField(b, field) {
    let nameOffset = -1;
    let typeOffset = -1;
    let dictionaryOffset = -1;
    let type = field.type;
    let typeId = field.typeId;
    if (!type_1.DataType.isDictionary(type)) {
        typeOffset = typeassembler_1.instance.visit(type, b);
    }
    else {
        typeId = type.dictionary.TType;
        dictionaryOffset = typeassembler_1.instance.visit(type, b);
        typeOffset = typeassembler_1.instance.visit(type.dictionary, b);
    }
    const childOffsets = (type.children || []).map((f) => schema_1.Field.encode(b, f));
    const childrenVectorOffset = _Field.createChildrenVector(b, childOffsets);
    const metadataOffset = !(field.metadata && field.metadata.size > 0) ? -1 :
        _Field.createCustomMetadataVector(b, [...field.metadata].map(([k, v]) => {
            const key = b.createString(`${k}`);
            const val = b.createString(`${v}`);
            _KeyValue.startKeyValue(b);
            _KeyValue.addKey(b, key);
            _KeyValue.addValue(b, val);
            return _KeyValue.endKeyValue(b);
        }));
    if (field.name) {
        nameOffset = b.createString(field.name);
    }
    _Field.startField(b);
    _Field.addType(b, typeOffset);
    _Field.addTypeType(b, typeId);
    _Field.addChildren(b, childrenVectorOffset);
    _Field.addNullable(b, !!field.nullable);
    if (nameOffset !== -1) {
        _Field.addName(b, nameOffset);
    }
    if (dictionaryOffset !== -1) {
        _Field.addDictionary(b, dictionaryOffset);
    }
    if (metadataOffset !== -1) {
        _Field.addCustomMetadata(b, metadataOffset);
    }
    return _Field.endField(b);
}
function encodeRecordBatch(b, recordBatch) {
    const nodes = recordBatch.nodes || [];
    const buffers = recordBatch.buffers || [];
    _RecordBatch.startNodesVector(b, nodes.length);
    nodes.slice().reverse().forEach((n) => FieldNode.encode(b, n));
    const nodesVectorOffset = b.endVector();
    _RecordBatch.startBuffersVector(b, buffers.length);
    buffers.slice().reverse().forEach((b_) => BufferRegion.encode(b, b_));
    const buffersVectorOffset = b.endVector();
    _RecordBatch.startRecordBatch(b);
    _RecordBatch.addLength(b, new Long(recordBatch.length, 0));
    _RecordBatch.addNodes(b, nodesVectorOffset);
    _RecordBatch.addBuffers(b, buffersVectorOffset);
    return _RecordBatch.endRecordBatch(b);
}
function encodeDictionaryBatch(b, dictionaryBatch) {
    const dataOffset = RecordBatch.encode(b, dictionaryBatch.data);
    _DictionaryBatch.startDictionaryBatch(b);
    _DictionaryBatch.addId(b, new Long(dictionaryBatch.id, 0));
    _DictionaryBatch.addIsDelta(b, dictionaryBatch.isDelta);
    _DictionaryBatch.addData(b, dataOffset);
    return _DictionaryBatch.endDictionaryBatch(b);
}
function encodeFieldNode(b, node) {
    return _FieldNode.createFieldNode(b, new Long(node.length, 0), new Long(node.nullCount, 0));
}
function encodeBufferRegion(b, node) {
    return _Buffer.createBuffer(b, new Long(node.offset, 0), new Long(node.length, 0));
}
const platformIsLittleEndian = (function () {
    const buffer = new ArrayBuffer(2);
    new DataView(buffer).setInt16(0, 256, true /* littleEndian */);
    // Int16Array uses the platform's endianness.
    return new Int16Array(buffer)[0] === 256;
})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QzVCLE1BQU0sTUFBTSxHQUFHLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xDLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQy9ELDZDQUE2QztJQUM3QyxPQUFPLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQztBQUM3QyxDQUFDLENBQUMsRUFBRSxDQUFDIiwiZmlsZSI6ImlwYy9tZXRhZGF0YS9tZXNzYWdlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IGZsYXRidWZmZXJzIH0gZnJvbSAnZmxhdGJ1ZmZlcnMnO1xuaW1wb3J0ICogYXMgU2NoZW1hXyBmcm9tICcuLi8uLi9mYi9TY2hlbWEnO1xuaW1wb3J0ICogYXMgTWVzc2FnZV8gZnJvbSAnLi4vLi4vZmIvTWVzc2FnZSc7XG5cbmltcG9ydCB7IFNjaGVtYSwgRmllbGQgfSBmcm9tICcuLi8uLi9zY2hlbWEnO1xuaW1wb3J0IHsgdG9VaW50OEFycmF5IH0gZnJvbSAnLi4vLi4vdXRpbC9idWZmZXInO1xuaW1wb3J0IHsgQXJyYXlCdWZmZXJWaWV3SW5wdXQgfSBmcm9tICcuLi8uLi91dGlsL2J1ZmZlcic7XG5pbXBvcnQgeyBNZXNzYWdlSGVhZGVyLCBNZXRhZGF0YVZlcnNpb24gfSBmcm9tICcuLi8uLi9lbnVtJztcbmltcG9ydCB7IGluc3RhbmNlIGFzIHR5cGVBc3NlbWJsZXIgfSBmcm9tICcuLi8uLi92aXNpdG9yL3R5cGVhc3NlbWJsZXInO1xuaW1wb3J0IHsgZmllbGRGcm9tSlNPTiwgc2NoZW1hRnJvbUpTT04sIHJlY29yZEJhdGNoRnJvbUpTT04sIGRpY3Rpb25hcnlCYXRjaEZyb21KU09OIH0gZnJvbSAnLi9qc29uJztcblxuaW1wb3J0IExvbmcgPSBmbGF0YnVmZmVycy5Mb25nO1xuaW1wb3J0IEJ1aWxkZXIgPSBmbGF0YnVmZmVycy5CdWlsZGVyO1xuaW1wb3J0IEJ5dGVCdWZmZXIgPSBmbGF0YnVmZmVycy5CeXRlQnVmZmVyO1xuaW1wb3J0IF9JbnQgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5JbnQ7XG5pbXBvcnQgVHlwZSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlR5cGU7XG5pbXBvcnQgX0ZpZWxkID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRmllbGQ7XG5pbXBvcnQgX1NjaGVtYSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlNjaGVtYTtcbmltcG9ydCBfQnVmZmVyID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuQnVmZmVyO1xuaW1wb3J0IF9NZXNzYWdlID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk1lc3NhZ2U7XG5pbXBvcnQgX0tleVZhbHVlID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuS2V5VmFsdWU7XG5pbXBvcnQgX0ZpZWxkTm9kZSA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaWVsZE5vZGU7XG5pbXBvcnQgX0VuZGlhbm5lc3MgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5FbmRpYW5uZXNzO1xuaW1wb3J0IF9SZWNvcmRCYXRjaCA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5SZWNvcmRCYXRjaDtcbmltcG9ydCBfRGljdGlvbmFyeUJhdGNoID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRpY3Rpb25hcnlCYXRjaDtcbmltcG9ydCBfRGljdGlvbmFyeUVuY29kaW5nID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGljdGlvbmFyeUVuY29kaW5nO1xuXG5pbXBvcnQge1xuICAgIERhdGFUeXBlLCBEaWN0aW9uYXJ5LCBUaW1lQml0V2lkdGgsXG4gICAgVXRmOCwgQmluYXJ5LCBEZWNpbWFsLCBGaXhlZFNpemVCaW5hcnksXG4gICAgTGlzdCwgRml4ZWRTaXplTGlzdCwgTWFwXywgU3RydWN0LCBVbmlvbixcbiAgICBCb29sLCBOdWxsLCBJbnQsIEZsb2F0LCBEYXRlXywgVGltZSwgSW50ZXJ2YWwsIFRpbWVzdGFtcCwgSW50Qml0V2lkdGgsIEludDMyLCBUS2V5cyxcbn0gZnJvbSAnLi4vLi4vdHlwZSc7XG5cbi8qKlxuICogQGlnbm9yZVxuICovXG5leHBvcnQgY2xhc3MgTWVzc2FnZTxUIGV4dGVuZHMgTWVzc2FnZUhlYWRlciA9IGFueT4ge1xuXG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBmcm9tSlNPTjxUIGV4dGVuZHMgTWVzc2FnZUhlYWRlcj4obXNnOiBhbnksIGhlYWRlclR5cGU6IFQpOiBNZXNzYWdlPFQ+IHtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IG5ldyBNZXNzYWdlKDAsIE1ldGFkYXRhVmVyc2lvbi5WNCwgaGVhZGVyVHlwZSk7XG4gICAgICAgIG1lc3NhZ2UuX2NyZWF0ZUhlYWRlciA9IG1lc3NhZ2VIZWFkZXJGcm9tSlNPTihtc2csIGhlYWRlclR5cGUpO1xuICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICB9XG5cbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGRlY29kZShidWY6IEFycmF5QnVmZmVyVmlld0lucHV0KSB7XG4gICAgICAgIGJ1ZiA9IG5ldyBCeXRlQnVmZmVyKHRvVWludDhBcnJheShidWYpKTtcbiAgICAgICAgY29uc3QgX21lc3NhZ2UgPSBfTWVzc2FnZS5nZXRSb290QXNNZXNzYWdlKGJ1Zik7XG4gICAgICAgIGNvbnN0IGJvZHlMZW5ndGg6IExvbmcgPSBfbWVzc2FnZS5ib2R5TGVuZ3RoKCkhO1xuICAgICAgICBjb25zdCB2ZXJzaW9uOiBNZXRhZGF0YVZlcnNpb24gPSBfbWVzc2FnZS52ZXJzaW9uKCk7XG4gICAgICAgIGNvbnN0IGhlYWRlclR5cGU6IE1lc3NhZ2VIZWFkZXIgPSBfbWVzc2FnZS5oZWFkZXJUeXBlKCk7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBuZXcgTWVzc2FnZShib2R5TGVuZ3RoLCB2ZXJzaW9uLCBoZWFkZXJUeXBlKTtcbiAgICAgICAgbWVzc2FnZS5fY3JlYXRlSGVhZGVyID0gZGVjb2RlTWVzc2FnZUhlYWRlcihfbWVzc2FnZSwgaGVhZGVyVHlwZSk7XG4gICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgIH1cblxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZW5jb2RlPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyPihtZXNzYWdlOiBNZXNzYWdlPFQ+KSB7XG4gICAgICAgIGxldCBiID0gbmV3IEJ1aWxkZXIoKSwgaGVhZGVyT2Zmc2V0ID0gLTE7XG4gICAgICAgIGlmIChtZXNzYWdlLmlzU2NoZW1hKCkpIHtcbiAgICAgICAgICAgIGhlYWRlck9mZnNldCA9IFNjaGVtYS5lbmNvZGUoYiwgbWVzc2FnZS5oZWFkZXIoKSBhcyBTY2hlbWEpO1xuICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuaXNSZWNvcmRCYXRjaCgpKSB7XG4gICAgICAgICAgICBoZWFkZXJPZmZzZXQgPSBSZWNvcmRCYXRjaC5lbmNvZGUoYiwgbWVzc2FnZS5oZWFkZXIoKSBhcyBSZWNvcmRCYXRjaCk7XG4gICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5pc0RpY3Rpb25hcnlCYXRjaCgpKSB7XG4gICAgICAgICAgICBoZWFkZXJPZmZzZXQgPSBEaWN0aW9uYXJ5QmF0Y2guZW5jb2RlKGIsIG1lc3NhZ2UuaGVhZGVyKCkgYXMgRGljdGlvbmFyeUJhdGNoKTtcbiAgICAgICAgfVxuICAgICAgICBfTWVzc2FnZS5zdGFydE1lc3NhZ2UoYik7XG4gICAgICAgIF9NZXNzYWdlLmFkZFZlcnNpb24oYiwgTWV0YWRhdGFWZXJzaW9uLlY0KTtcbiAgICAgICAgX01lc3NhZ2UuYWRkSGVhZGVyKGIsIGhlYWRlck9mZnNldCk7XG4gICAgICAgIF9NZXNzYWdlLmFkZEhlYWRlclR5cGUoYiwgbWVzc2FnZS5oZWFkZXJUeXBlKTtcbiAgICAgICAgX01lc3NhZ2UuYWRkQm9keUxlbmd0aChiLCBuZXcgTG9uZyhtZXNzYWdlLmJvZHlMZW5ndGgsIDApKTtcbiAgICAgICAgX01lc3NhZ2UuZmluaXNoTWVzc2FnZUJ1ZmZlcihiLCBfTWVzc2FnZS5lbmRNZXNzYWdlKGIpKTtcbiAgICAgICAgcmV0dXJuIGIuYXNVaW50OEFycmF5KCk7XG4gICAgfVxuXG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGhlYWRlcjogU2NoZW1hIHwgUmVjb3JkQmF0Y2ggfCBEaWN0aW9uYXJ5QmF0Y2gsIGJvZHlMZW5ndGggPSAwKSB7XG4gICAgICAgIGlmIChoZWFkZXIgaW5zdGFuY2VvZiBTY2hlbWEpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgTWVzc2FnZSgwLCBNZXRhZGF0YVZlcnNpb24uVjQsIE1lc3NhZ2VIZWFkZXIuU2NoZW1hLCBoZWFkZXIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChoZWFkZXIgaW5zdGFuY2VvZiBSZWNvcmRCYXRjaCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNZXNzYWdlKGJvZHlMZW5ndGgsIE1ldGFkYXRhVmVyc2lvbi5WNCwgTWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaCwgaGVhZGVyKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGVhZGVyIGluc3RhbmNlb2YgRGljdGlvbmFyeUJhdGNoKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1lc3NhZ2UoYm9keUxlbmd0aCwgTWV0YWRhdGFWZXJzaW9uLlY0LCBNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaCwgaGVhZGVyKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVucmVjb2duaXplZCBNZXNzYWdlIGhlYWRlcjogJHtoZWFkZXJ9YCk7XG4gICAgfVxuXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyBib2R5OiBVaW50OEFycmF5O1xuICAgIHByb3RlY3RlZCBfaGVhZGVyVHlwZTogVDtcbiAgICBwcm90ZWN0ZWQgX2JvZHlMZW5ndGg6IG51bWJlcjtcbiAgICBwcm90ZWN0ZWQgX3ZlcnNpb246IE1ldGFkYXRhVmVyc2lvbjtcbiAgICBwdWJsaWMgZ2V0IHR5cGUoKSB7IHJldHVybiB0aGlzLmhlYWRlclR5cGU7IH1cbiAgICBwdWJsaWMgZ2V0IHZlcnNpb24oKSB7IHJldHVybiB0aGlzLl92ZXJzaW9uOyB9XG4gICAgcHVibGljIGdldCBoZWFkZXJUeXBlKCkgeyByZXR1cm4gdGhpcy5faGVhZGVyVHlwZTsgfVxuICAgIHB1YmxpYyBnZXQgYm9keUxlbmd0aCgpIHsgcmV0dXJuIHRoaXMuX2JvZHlMZW5ndGg7IH1cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHJvdGVjdGVkIF9jcmVhdGVIZWFkZXI6IE1lc3NhZ2VIZWFkZXJEZWNvZGVyO1xuICAgIHB1YmxpYyBoZWFkZXIoKSB7IHJldHVybiB0aGlzLl9jcmVhdGVIZWFkZXI8VD4oKTsgfVxuICAgIHB1YmxpYyBpc1NjaGVtYSgpOiB0aGlzIGlzIE1lc3NhZ2U8TWVzc2FnZUhlYWRlci5TY2hlbWE+IHsgcmV0dXJuIHRoaXMuaGVhZGVyVHlwZSA9PT0gTWVzc2FnZUhlYWRlci5TY2hlbWE7IH1cbiAgICBwdWJsaWMgaXNSZWNvcmRCYXRjaCgpOiB0aGlzIGlzIE1lc3NhZ2U8TWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaD4geyByZXR1cm4gdGhpcy5oZWFkZXJUeXBlID09PSBNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoOyB9XG4gICAgcHVibGljIGlzRGljdGlvbmFyeUJhdGNoKCk6IHRoaXMgaXMgTWVzc2FnZTxNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaD4geyByZXR1cm4gdGhpcy5oZWFkZXJUeXBlID09PSBNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaDsgfVxuXG4gICAgY29uc3RydWN0b3IoYm9keUxlbmd0aDogTG9uZyB8IG51bWJlciwgdmVyc2lvbjogTWV0YWRhdGFWZXJzaW9uLCBoZWFkZXJUeXBlOiBULCBoZWFkZXI/OiBhbnkpIHtcbiAgICAgICAgdGhpcy5fdmVyc2lvbiA9IHZlcnNpb247XG4gICAgICAgIHRoaXMuX2hlYWRlclR5cGUgPSBoZWFkZXJUeXBlO1xuICAgICAgICB0aGlzLmJvZHkgPSBuZXcgVWludDhBcnJheSgwKTtcbiAgICAgICAgaGVhZGVyICYmICh0aGlzLl9jcmVhdGVIZWFkZXIgPSAoKSA9PiBoZWFkZXIpO1xuICAgICAgICB0aGlzLl9ib2R5TGVuZ3RoID0gdHlwZW9mIGJvZHlMZW5ndGggPT09ICdudW1iZXInID8gYm9keUxlbmd0aCA6IGJvZHlMZW5ndGgubG93O1xuICAgIH1cbn1cblxuLyoqXG4gKiBAaWdub3JlXG4gKi9cbmV4cG9ydCBjbGFzcyBSZWNvcmRCYXRjaCB7XG4gICAgcHJvdGVjdGVkIF9sZW5ndGg6IG51bWJlcjtcbiAgICBwcm90ZWN0ZWQgX25vZGVzOiBGaWVsZE5vZGVbXTtcbiAgICBwcm90ZWN0ZWQgX2J1ZmZlcnM6IEJ1ZmZlclJlZ2lvbltdO1xuICAgIHB1YmxpYyBnZXQgbm9kZXMoKSB7IHJldHVybiB0aGlzLl9ub2RlczsgfVxuICAgIHB1YmxpYyBnZXQgbGVuZ3RoKCkgeyByZXR1cm4gdGhpcy5fbGVuZ3RoOyB9XG4gICAgcHVibGljIGdldCBidWZmZXJzKCkgeyByZXR1cm4gdGhpcy5fYnVmZmVyczsgfVxuICAgIGNvbnN0cnVjdG9yKGxlbmd0aDogTG9uZyB8IG51bWJlciwgbm9kZXM6IEZpZWxkTm9kZVtdLCBidWZmZXJzOiBCdWZmZXJSZWdpb25bXSkge1xuICAgICAgICB0aGlzLl9ub2RlcyA9IG5vZGVzO1xuICAgICAgICB0aGlzLl9idWZmZXJzID0gYnVmZmVycztcbiAgICAgICAgdGhpcy5fbGVuZ3RoID0gdHlwZW9mIGxlbmd0aCA9PT0gJ251bWJlcicgPyBsZW5ndGggOiBsZW5ndGgubG93O1xuICAgIH1cbn1cblxuLyoqXG4gKiBAaWdub3JlXG4gKi9cbmV4cG9ydCBjbGFzcyBEaWN0aW9uYXJ5QmF0Y2gge1xuXG4gICAgcHJvdGVjdGVkIF9pZDogbnVtYmVyO1xuICAgIHByb3RlY3RlZCBfaXNEZWx0YTogYm9vbGVhbjtcbiAgICBwcm90ZWN0ZWQgX2RhdGE6IFJlY29yZEJhdGNoO1xuICAgIHB1YmxpYyBnZXQgaWQoKSB7IHJldHVybiB0aGlzLl9pZDsgfVxuICAgIHB1YmxpYyBnZXQgZGF0YSgpIHsgcmV0dXJuIHRoaXMuX2RhdGE7IH1cbiAgICBwdWJsaWMgZ2V0IGlzRGVsdGEoKSB7IHJldHVybiB0aGlzLl9pc0RlbHRhOyB9XG4gICAgcHVibGljIGdldCBsZW5ndGgoKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMuZGF0YS5sZW5ndGg7IH1cbiAgICBwdWJsaWMgZ2V0IG5vZGVzKCk6IEZpZWxkTm9kZVtdIHsgcmV0dXJuIHRoaXMuZGF0YS5ub2RlczsgfVxuICAgIHB1YmxpYyBnZXQgYnVmZmVycygpOiBCdWZmZXJSZWdpb25bXSB7IHJldHVybiB0aGlzLmRhdGEuYnVmZmVyczsgfVxuXG4gICAgY29uc3RydWN0b3IoZGF0YTogUmVjb3JkQmF0Y2gsIGlkOiBMb25nIHwgbnVtYmVyLCBpc0RlbHRhOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICAgICAgdGhpcy5fZGF0YSA9IGRhdGE7XG4gICAgICAgIHRoaXMuX2lzRGVsdGEgPSBpc0RlbHRhO1xuICAgICAgICB0aGlzLl9pZCA9IHR5cGVvZiBpZCA9PT0gJ251bWJlcicgPyBpZCA6IGlkLmxvdztcbiAgICB9XG59XG5cbi8qKlxuICogQGlnbm9yZVxuICovXG5leHBvcnQgY2xhc3MgQnVmZmVyUmVnaW9uIHtcbiAgICBwdWJsaWMgb2Zmc2V0OiBudW1iZXI7XG4gICAgcHVibGljIGxlbmd0aDogbnVtYmVyO1xuICAgIGNvbnN0cnVjdG9yKG9mZnNldDogTG9uZyB8IG51bWJlciwgbGVuZ3RoOiBMb25nIHwgbnVtYmVyKSB7XG4gICAgICAgIHRoaXMub2Zmc2V0ID0gdHlwZW9mIG9mZnNldCA9PT0gJ251bWJlcicgPyBvZmZzZXQgOiBvZmZzZXQubG93O1xuICAgICAgICB0aGlzLmxlbmd0aCA9IHR5cGVvZiBsZW5ndGggPT09ICdudW1iZXInID8gbGVuZ3RoIDogbGVuZ3RoLmxvdztcbiAgICB9XG59XG5cbi8qKlxuICogQGlnbm9yZVxuICovXG5leHBvcnQgY2xhc3MgRmllbGROb2RlIHtcbiAgICBwdWJsaWMgbGVuZ3RoOiBudW1iZXI7XG4gICAgcHVibGljIG51bGxDb3VudDogbnVtYmVyO1xuICAgIGNvbnN0cnVjdG9yKGxlbmd0aDogTG9uZyB8IG51bWJlciwgbnVsbENvdW50OiBMb25nIHwgbnVtYmVyKSB7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gdHlwZW9mIGxlbmd0aCA9PT0gJ251bWJlcicgPyBsZW5ndGggOiBsZW5ndGgubG93O1xuICAgICAgICB0aGlzLm51bGxDb3VudCA9IHR5cGVvZiBudWxsQ291bnQgPT09ICdudW1iZXInID8gbnVsbENvdW50IDogbnVsbENvdW50LmxvdztcbiAgICB9XG59XG5cbmZ1bmN0aW9uIG1lc3NhZ2VIZWFkZXJGcm9tSlNPTihtZXNzYWdlOiBhbnksIHR5cGU6IE1lc3NhZ2VIZWFkZXIpIHtcbiAgICByZXR1cm4gKCgpID0+IHtcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlIE1lc3NhZ2VIZWFkZXIuU2NoZW1hOiByZXR1cm4gU2NoZW1hLmZyb21KU09OKG1lc3NhZ2UpO1xuICAgICAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoOiByZXR1cm4gUmVjb3JkQmF0Y2guZnJvbUpTT04obWVzc2FnZSk7XG4gICAgICAgICAgICBjYXNlIE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoOiByZXR1cm4gRGljdGlvbmFyeUJhdGNoLmZyb21KU09OKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICAgIC8vIHJldHVybiBudWxsO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVucmVjb2duaXplZCBNZXNzYWdlIHR5cGU6IHsgbmFtZTogJHtNZXNzYWdlSGVhZGVyW3R5cGVdfSwgdHlwZTogJHt0eXBlfSB9YCk7XG4gICAgfSkgYXMgTWVzc2FnZUhlYWRlckRlY29kZXI7XG59XG5cbmZ1bmN0aW9uIGRlY29kZU1lc3NhZ2VIZWFkZXIobWVzc2FnZTogX01lc3NhZ2UsIHR5cGU6IE1lc3NhZ2VIZWFkZXIpIHtcbiAgICByZXR1cm4gKCgpID0+IHtcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlIE1lc3NhZ2VIZWFkZXIuU2NoZW1hOiByZXR1cm4gU2NoZW1hLmRlY29kZShtZXNzYWdlLmhlYWRlcihuZXcgX1NjaGVtYSgpKSEpO1xuICAgICAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoOiByZXR1cm4gUmVjb3JkQmF0Y2guZGVjb2RlKG1lc3NhZ2UuaGVhZGVyKG5ldyBfUmVjb3JkQmF0Y2goKSkhLCBtZXNzYWdlLnZlcnNpb24oKSk7XG4gICAgICAgICAgICBjYXNlIE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoOiByZXR1cm4gRGljdGlvbmFyeUJhdGNoLmRlY29kZShtZXNzYWdlLmhlYWRlcihuZXcgX0RpY3Rpb25hcnlCYXRjaCgpKSEsIG1lc3NhZ2UudmVyc2lvbigpKTtcbiAgICAgICAgfVxuICAgICAgICAvLyByZXR1cm4gbnVsbDtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnJlY29nbml6ZWQgTWVzc2FnZSB0eXBlOiB7IG5hbWU6ICR7TWVzc2FnZUhlYWRlclt0eXBlXX0sIHR5cGU6ICR7dHlwZX0gfWApO1xuICAgIH0pIGFzIE1lc3NhZ2VIZWFkZXJEZWNvZGVyO1xufVxuXG5GaWVsZFsnZW5jb2RlJ10gPSBlbmNvZGVGaWVsZDtcbkZpZWxkWydkZWNvZGUnXSA9IGRlY29kZUZpZWxkO1xuRmllbGRbJ2Zyb21KU09OJ10gPSBmaWVsZEZyb21KU09OO1xuXG5TY2hlbWFbJ2VuY29kZSddID0gZW5jb2RlU2NoZW1hO1xuU2NoZW1hWydkZWNvZGUnXSA9IGRlY29kZVNjaGVtYTtcblNjaGVtYVsnZnJvbUpTT04nXSA9IHNjaGVtYUZyb21KU09OO1xuXG5SZWNvcmRCYXRjaFsnZW5jb2RlJ10gPSBlbmNvZGVSZWNvcmRCYXRjaDtcblJlY29yZEJhdGNoWydkZWNvZGUnXSA9IGRlY29kZVJlY29yZEJhdGNoO1xuUmVjb3JkQmF0Y2hbJ2Zyb21KU09OJ10gPSByZWNvcmRCYXRjaEZyb21KU09OO1xuXG5EaWN0aW9uYXJ5QmF0Y2hbJ2VuY29kZSddID0gZW5jb2RlRGljdGlvbmFyeUJhdGNoO1xuRGljdGlvbmFyeUJhdGNoWydkZWNvZGUnXSA9IGRlY29kZURpY3Rpb25hcnlCYXRjaDtcbkRpY3Rpb25hcnlCYXRjaFsnZnJvbUpTT04nXSA9IGRpY3Rpb25hcnlCYXRjaEZyb21KU09OO1xuXG5GaWVsZE5vZGVbJ2VuY29kZSddID0gZW5jb2RlRmllbGROb2RlO1xuRmllbGROb2RlWydkZWNvZGUnXSA9IGRlY29kZUZpZWxkTm9kZTtcblxuQnVmZmVyUmVnaW9uWydlbmNvZGUnXSA9IGVuY29kZUJ1ZmZlclJlZ2lvbjtcbkJ1ZmZlclJlZ2lvblsnZGVjb2RlJ10gPSBkZWNvZGVCdWZmZXJSZWdpb247XG5cbmRlY2xhcmUgbW9kdWxlICcuLi8uLi9zY2hlbWEnIHtcbiAgICBuYW1lc3BhY2UgRmllbGQge1xuICAgICAgICBleHBvcnQgeyBlbmNvZGVGaWVsZCBhcyBlbmNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgZGVjb2RlRmllbGQgYXMgZGVjb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IGZpZWxkRnJvbUpTT04gYXMgZnJvbUpTT04gfTtcbiAgICB9XG4gICAgbmFtZXNwYWNlIFNjaGVtYSB7XG4gICAgICAgIGV4cG9ydCB7IGVuY29kZVNjaGVtYSBhcyBlbmNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgZGVjb2RlU2NoZW1hIGFzIGRlY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBzY2hlbWFGcm9tSlNPTiBhcyBmcm9tSlNPTiB9O1xuICAgIH1cbn1cblxuZGVjbGFyZSBtb2R1bGUgJy4vbWVzc2FnZScge1xuICAgIG5hbWVzcGFjZSBSZWNvcmRCYXRjaCB7XG4gICAgICAgIGV4cG9ydCB7IGVuY29kZVJlY29yZEJhdGNoIGFzIGVuY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBkZWNvZGVSZWNvcmRCYXRjaCBhcyBkZWNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgcmVjb3JkQmF0Y2hGcm9tSlNPTiBhcyBmcm9tSlNPTiB9O1xuICAgIH1cbiAgICBuYW1lc3BhY2UgRGljdGlvbmFyeUJhdGNoIHtcbiAgICAgICAgZXhwb3J0IHsgZW5jb2RlRGljdGlvbmFyeUJhdGNoIGFzIGVuY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBkZWNvZGVEaWN0aW9uYXJ5QmF0Y2ggYXMgZGVjb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IGRpY3Rpb25hcnlCYXRjaEZyb21KU09OIGFzIGZyb21KU09OIH07XG4gICAgfVxuICAgIG5hbWVzcGFjZSBGaWVsZE5vZGUge1xuICAgICAgICBleHBvcnQgeyBlbmNvZGVGaWVsZE5vZGUgYXMgZW5jb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IGRlY29kZUZpZWxkTm9kZSBhcyBkZWNvZGUgfTtcbiAgICB9XG4gICAgbmFtZXNwYWNlIEJ1ZmZlclJlZ2lvbiB7XG4gICAgICAgIGV4cG9ydCB7IGVuY29kZUJ1ZmZlclJlZ2lvbiBhcyBlbmNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgZGVjb2RlQnVmZmVyUmVnaW9uIGFzIGRlY29kZSB9O1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZGVjb2RlU2NoZW1hKF9zY2hlbWE6IF9TY2hlbWEsIGRpY3Rpb25hcmllczogTWFwPG51bWJlciwgRGF0YVR5cGU+ID0gbmV3IE1hcCgpLCBkaWN0aW9uYXJ5RmllbGRzOiBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5PltdPiA9IG5ldyBNYXAoKSkge1xuICAgIGNvbnN0IGZpZWxkcyA9IGRlY29kZVNjaGVtYUZpZWxkcyhfc2NoZW1hLCBkaWN0aW9uYXJpZXMsIGRpY3Rpb25hcnlGaWVsZHMpO1xuICAgIHJldHVybiBuZXcgU2NoZW1hKGZpZWxkcywgZGVjb2RlQ3VzdG9tTWV0YWRhdGEoX3NjaGVtYSksIGRpY3Rpb25hcmllcywgZGljdGlvbmFyeUZpZWxkcyk7XG59XG5cbmZ1bmN0aW9uIGRlY29kZVJlY29yZEJhdGNoKGJhdGNoOiBfUmVjb3JkQmF0Y2gsIHZlcnNpb24gPSBNZXRhZGF0YVZlcnNpb24uVjQpIHtcbiAgICByZXR1cm4gbmV3IFJlY29yZEJhdGNoKGJhdGNoLmxlbmd0aCgpLCBkZWNvZGVGaWVsZE5vZGVzKGJhdGNoKSwgZGVjb2RlQnVmZmVycyhiYXRjaCwgdmVyc2lvbikpO1xufVxuXG5mdW5jdGlvbiBkZWNvZGVEaWN0aW9uYXJ5QmF0Y2goYmF0Y2g6IF9EaWN0aW9uYXJ5QmF0Y2gsIHZlcnNpb24gPSBNZXRhZGF0YVZlcnNpb24uVjQpIHtcbiAgICByZXR1cm4gbmV3IERpY3Rpb25hcnlCYXRjaChSZWNvcmRCYXRjaC5kZWNvZGUoYmF0Y2guZGF0YSgpISwgdmVyc2lvbiksIGJhdGNoLmlkKCksIGJhdGNoLmlzRGVsdGEoKSk7XG59XG5cbmZ1bmN0aW9uIGRlY29kZUJ1ZmZlclJlZ2lvbihiOiBfQnVmZmVyKSB7XG4gICAgcmV0dXJuIG5ldyBCdWZmZXJSZWdpb24oYi5vZmZzZXQoKSwgYi5sZW5ndGgoKSk7XG59XG5cbmZ1bmN0aW9uIGRlY29kZUZpZWxkTm9kZShmOiBfRmllbGROb2RlKSB7XG4gICAgcmV0dXJuIG5ldyBGaWVsZE5vZGUoZi5sZW5ndGgoKSwgZi5udWxsQ291bnQoKSk7XG59XG5cbmZ1bmN0aW9uIGRlY29kZUZpZWxkTm9kZXMoYmF0Y2g6IF9SZWNvcmRCYXRjaCkge1xuICAgIHJldHVybiBBcnJheS5mcm9tKFxuICAgICAgICB7IGxlbmd0aDogYmF0Y2gubm9kZXNMZW5ndGgoKSB9LFxuICAgICAgICAoXywgaSkgPT4gYmF0Y2gubm9kZXMoaSkhXG4gICAgKS5maWx0ZXIoQm9vbGVhbikubWFwKEZpZWxkTm9kZS5kZWNvZGUpO1xufVxuXG5mdW5jdGlvbiBkZWNvZGVCdWZmZXJzKGJhdGNoOiBfUmVjb3JkQmF0Y2gsIHZlcnNpb246IE1ldGFkYXRhVmVyc2lvbikge1xuICAgIHJldHVybiBBcnJheS5mcm9tKFxuICAgICAgICB7IGxlbmd0aDogYmF0Y2guYnVmZmVyc0xlbmd0aCgpIH0sXG4gICAgICAgIChfLCBpKSA9PiBiYXRjaC5idWZmZXJzKGkpIVxuICAgICkuZmlsdGVyKEJvb2xlYW4pLm1hcCh2M0NvbXBhdCh2ZXJzaW9uLCBCdWZmZXJSZWdpb24uZGVjb2RlKSk7XG59XG5cbmZ1bmN0aW9uIHYzQ29tcGF0KHZlcnNpb246IE1ldGFkYXRhVmVyc2lvbiwgZGVjb2RlOiAoYnVmZmVyOiBfQnVmZmVyKSA9PiBCdWZmZXJSZWdpb24pIHtcbiAgICByZXR1cm4gKGJ1ZmZlcjogX0J1ZmZlciwgaTogbnVtYmVyKSA9PiB7XG4gICAgICAgIC8vIElmIHRoaXMgQXJyb3cgYnVmZmVyIHdhcyB3cml0dGVuIGJlZm9yZSB2ZXJzaW9uIDQsXG4gICAgICAgIC8vIGFkdmFuY2UgdGhlIGJ1ZmZlcidzIGJiX3BvcyA4IGJ5dGVzIHRvIHNraXAgcGFzdFxuICAgICAgICAvLyB0aGUgbm93LXJlbW92ZWQgcGFnZV9pZCBmaWVsZFxuICAgICAgICBpZiAodmVyc2lvbiA8IE1ldGFkYXRhVmVyc2lvbi5WNCkge1xuICAgICAgICAgICAgYnVmZmVyLmJiX3BvcyArPSAoOCAqIChpICsgMSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkZWNvZGUoYnVmZmVyKTtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBkZWNvZGVTY2hlbWFGaWVsZHMoc2NoZW1hOiBfU2NoZW1hLCBkaWN0aW9uYXJpZXM/OiBNYXA8bnVtYmVyLCBEYXRhVHlwZT4sIGRpY3Rpb25hcnlGaWVsZHM/OiBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5PltdPikge1xuICAgIHJldHVybiBBcnJheS5mcm9tKFxuICAgICAgICB7IGxlbmd0aDogc2NoZW1hLmZpZWxkc0xlbmd0aCgpIH0sXG4gICAgICAgIChfLCBpKSA9PiBzY2hlbWEuZmllbGRzKGkpIVxuICAgICkuZmlsdGVyKEJvb2xlYW4pLm1hcCgoZikgPT4gRmllbGQuZGVjb2RlKGYsIGRpY3Rpb25hcmllcywgZGljdGlvbmFyeUZpZWxkcykpO1xufVxuXG5mdW5jdGlvbiBkZWNvZGVGaWVsZENoaWxkcmVuKGZpZWxkOiBfRmllbGQsIGRpY3Rpb25hcmllcz86IE1hcDxudW1iZXIsIERhdGFUeXBlPiwgZGljdGlvbmFyeUZpZWxkcz86IE1hcDxudW1iZXIsIEZpZWxkPERpY3Rpb25hcnk+W10+KTogRmllbGRbXSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20oXG4gICAgICAgIHsgbGVuZ3RoOiBmaWVsZC5jaGlsZHJlbkxlbmd0aCgpIH0sXG4gICAgICAgIChfLCBpKSA9PiBmaWVsZC5jaGlsZHJlbihpKSFcbiAgICApLmZpbHRlcihCb29sZWFuKS5tYXAoKGYpID0+IEZpZWxkLmRlY29kZShmLCBkaWN0aW9uYXJpZXMsIGRpY3Rpb25hcnlGaWVsZHMpKTtcbn1cblxuZnVuY3Rpb24gZGVjb2RlRmllbGQoZjogX0ZpZWxkLCBkaWN0aW9uYXJpZXM/OiBNYXA8bnVtYmVyLCBEYXRhVHlwZT4sIGRpY3Rpb25hcnlGaWVsZHM/OiBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5PltdPikge1xuXG4gICAgbGV0IGlkOiBudW1iZXI7XG4gICAgbGV0IGZpZWxkOiBGaWVsZCB8IHZvaWQ7XG4gICAgbGV0IHR5cGU6IERhdGFUeXBlPGFueT47XG4gICAgbGV0IGtleXM6IF9JbnQgfCBUS2V5cyB8IG51bGw7XG4gICAgbGV0IGRpY3RUeXBlOiBEaWN0aW9uYXJ5O1xuICAgIGxldCBkaWN0TWV0YTogX0RpY3Rpb25hcnlFbmNvZGluZyB8IG51bGw7XG4gICAgbGV0IGRpY3RGaWVsZDogRmllbGQ8RGljdGlvbmFyeT47XG5cbiAgICAvLyBJZiBubyBkaWN0aW9uYXJ5IGVuY29kaW5nLCBvciBpbiB0aGUgcHJvY2VzcyBvZiBkZWNvZGluZyB0aGUgY2hpbGRyZW4gb2YgYSBkaWN0aW9uYXJ5LWVuY29kZWQgZmllbGRcbiAgICBpZiAoIWRpY3Rpb25hcmllcyB8fCAhZGljdGlvbmFyeUZpZWxkcyB8fCAhKGRpY3RNZXRhID0gZi5kaWN0aW9uYXJ5KCkpKSB7XG4gICAgICAgIHR5cGUgPSBkZWNvZGVGaWVsZFR5cGUoZiwgZGVjb2RlRmllbGRDaGlsZHJlbihmLCBkaWN0aW9uYXJpZXMsIGRpY3Rpb25hcnlGaWVsZHMpKTtcbiAgICAgICAgZmllbGQgPSBuZXcgRmllbGQoZi5uYW1lKCkhLCB0eXBlLCBmLm51bGxhYmxlKCksIGRlY29kZUN1c3RvbU1ldGFkYXRhKGYpKTtcbiAgICB9XG4gICAgLy8gdHNsaW50OmRpc2FibGVcbiAgICAvLyBJZiBkaWN0aW9uYXJ5IGVuY29kZWQgYW5kIHRoZSBmaXJzdCB0aW1lIHdlJ3ZlIHNlZW4gdGhpcyBkaWN0aW9uYXJ5IGlkLCBkZWNvZGVcbiAgICAvLyB0aGUgZGF0YSB0eXBlIGFuZCBjaGlsZCBmaWVsZHMsIHRoZW4gd3JhcCBpbiBhIERpY3Rpb25hcnkgdHlwZSBhbmQgaW5zZXJ0IHRoZVxuICAgIC8vIGRhdGEgdHlwZSBpbnRvIHRoZSBkaWN0aW9uYXJ5IHR5cGVzIG1hcC5cbiAgICBlbHNlIGlmICghZGljdGlvbmFyaWVzLmhhcyhpZCA9IGRpY3RNZXRhLmlkKCkubG93KSkge1xuICAgICAgICAvLyBhIGRpY3Rpb25hcnkgaW5kZXggZGVmYXVsdHMgdG8gc2lnbmVkIDMyIGJpdCBpbnQgaWYgdW5zcGVjaWZpZWRcbiAgICAgICAga2V5cyA9IChrZXlzID0gZGljdE1ldGEuaW5kZXhUeXBlKCkpID8gZGVjb2RlSW5kZXhUeXBlKGtleXMpIGFzIFRLZXlzIDogbmV3IEludDMyKCk7XG4gICAgICAgIGRpY3Rpb25hcmllcy5zZXQoaWQsIHR5cGUgPSBkZWNvZGVGaWVsZFR5cGUoZiwgZGVjb2RlRmllbGRDaGlsZHJlbihmKSkpO1xuICAgICAgICBkaWN0VHlwZSA9IG5ldyBEaWN0aW9uYXJ5KHR5cGUsIGtleXMsIGlkLCBkaWN0TWV0YS5pc09yZGVyZWQoKSk7XG4gICAgICAgIGRpY3RGaWVsZCA9IG5ldyBGaWVsZChmLm5hbWUoKSEsIGRpY3RUeXBlLCBmLm51bGxhYmxlKCksIGRlY29kZUN1c3RvbU1ldGFkYXRhKGYpKTtcbiAgICAgICAgZGljdGlvbmFyeUZpZWxkcy5zZXQoaWQsIFtmaWVsZCA9IGRpY3RGaWVsZF0pO1xuICAgIH1cbiAgICAvLyBJZiBkaWN0aW9uYXJ5IGVuY29kZWQsIGFuZCBoYXZlIGFscmVhZHkgc2VlbiB0aGlzIGRpY3Rpb25hcnkgSWQgaW4gdGhlIHNjaGVtYSwgdGhlbiByZXVzZSB0aGVcbiAgICAvLyBkYXRhIHR5cGUgYW5kIHdyYXAgaW4gYSBuZXcgRGljdGlvbmFyeSB0eXBlIGFuZCBmaWVsZC5cbiAgICBlbHNlIHtcbiAgICAgICAgLy8gYSBkaWN0aW9uYXJ5IGluZGV4IGRlZmF1bHRzIHRvIHNpZ25lZCAzMiBiaXQgaW50IGlmIHVuc3BlY2lmaWVkXG4gICAgICAgIGtleXMgPSAoa2V5cyA9IGRpY3RNZXRhLmluZGV4VHlwZSgpKSA/IGRlY29kZUluZGV4VHlwZShrZXlzKSBhcyBUS2V5cyA6IG5ldyBJbnQzMigpO1xuICAgICAgICBkaWN0VHlwZSA9IG5ldyBEaWN0aW9uYXJ5KGRpY3Rpb25hcmllcy5nZXQoaWQpISwga2V5cywgaWQsIGRpY3RNZXRhLmlzT3JkZXJlZCgpKTtcbiAgICAgICAgZGljdEZpZWxkID0gbmV3IEZpZWxkKGYubmFtZSgpISwgZGljdFR5cGUsIGYubnVsbGFibGUoKSwgZGVjb2RlQ3VzdG9tTWV0YWRhdGEoZikpO1xuICAgICAgICBkaWN0aW9uYXJ5RmllbGRzLmdldChpZCkhLnB1c2goZmllbGQgPSBkaWN0RmllbGQpO1xuICAgIH1cbiAgICByZXR1cm4gZmllbGQgfHwgbnVsbDtcbn1cblxuZnVuY3Rpb24gZGVjb2RlQ3VzdG9tTWV0YWRhdGEocGFyZW50PzogX1NjaGVtYSB8IF9GaWVsZCB8IG51bGwpIHtcbiAgICBjb25zdCBkYXRhID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICBpZiAocGFyZW50KSB7XG4gICAgICAgIGZvciAobGV0IGVudHJ5LCBrZXksIGkgPSAtMSwgbiA9IHBhcmVudC5jdXN0b21NZXRhZGF0YUxlbmd0aCgpIHwgMDsgKytpIDwgbjspIHtcbiAgICAgICAgICAgIGlmICgoZW50cnkgPSBwYXJlbnQuY3VzdG9tTWV0YWRhdGEoaSkpICYmIChrZXkgPSBlbnRyeS5rZXkoKSkgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGRhdGEuc2V0KGtleSwgZW50cnkudmFsdWUoKSEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkYXRhO1xufVxuXG5mdW5jdGlvbiBkZWNvZGVJbmRleFR5cGUoX3R5cGU6IF9JbnQpIHtcbiAgICByZXR1cm4gbmV3IEludChfdHlwZS5pc1NpZ25lZCgpLCBfdHlwZS5iaXRXaWR0aCgpIGFzIEludEJpdFdpZHRoKTtcbn1cblxuZnVuY3Rpb24gZGVjb2RlRmllbGRUeXBlKGY6IF9GaWVsZCwgY2hpbGRyZW4/OiBGaWVsZFtdKTogRGF0YVR5cGU8YW55PiB7XG5cbiAgICBjb25zdCB0eXBlSWQgPSBmLnR5cGVUeXBlKCk7XG5cbiAgICBzd2l0Y2ggKHR5cGVJZCkge1xuICAgICAgICBjYXNlIFR5cGUuTk9ORTogICAgcmV0dXJuIG5ldyBEYXRhVHlwZSgpO1xuICAgICAgICBjYXNlIFR5cGUuTnVsbDogICAgcmV0dXJuIG5ldyBOdWxsKCk7XG4gICAgICAgIGNhc2UgVHlwZS5CaW5hcnk6ICByZXR1cm4gbmV3IEJpbmFyeSgpO1xuICAgICAgICBjYXNlIFR5cGUuVXRmODogICAgcmV0dXJuIG5ldyBVdGY4KCk7XG4gICAgICAgIGNhc2UgVHlwZS5Cb29sOiAgICByZXR1cm4gbmV3IEJvb2woKTtcbiAgICAgICAgY2FzZSBUeXBlLkxpc3Q6ICAgIHJldHVybiBuZXcgTGlzdChjaGlsZHJlbiB8fCBbXSk7XG4gICAgICAgIGNhc2UgVHlwZS5TdHJ1Y3RfOiByZXR1cm4gbmV3IFN0cnVjdChjaGlsZHJlbiB8fCBbXSk7XG4gICAgfVxuXG4gICAgc3dpdGNoICh0eXBlSWQpIHtcbiAgICAgICAgY2FzZSBUeXBlLkludDoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuSW50KCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgSW50KHQuaXNTaWduZWQoKSwgdC5iaXRXaWR0aCgpKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuRmxvYXRpbmdQb2ludDoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRmxvYXRpbmdQb2ludCgpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEZsb2F0KHQucHJlY2lzaW9uKCkpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5EZWNpbWFsOiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EZWNpbWFsKCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRGVjaW1hbCh0LnNjYWxlKCksIHQucHJlY2lzaW9uKCkpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5EYXRlOiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EYXRlKCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRGF0ZV8odC51bml0KCkpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5UaW1lOiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UaW1lKCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgVGltZSh0LnVuaXQoKSwgdC5iaXRXaWR0aCgpIGFzIFRpbWVCaXRXaWR0aCk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLlRpbWVzdGFtcDoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVGltZXN0YW1wKCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgVGltZXN0YW1wKHQudW5pdCgpLCB0LnRpbWV6b25lKCkpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5JbnRlcnZhbDoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuSW50ZXJ2YWwoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBJbnRlcnZhbCh0LnVuaXQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLlVuaW9uOiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5VbmlvbigpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFVuaW9uKHQubW9kZSgpLCAodC50eXBlSWRzQXJyYXkoKSB8fCBbXSkgYXMgVHlwZVtdLCBjaGlsZHJlbiB8fCBbXSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLkZpeGVkU2l6ZUJpbmFyeToge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRml4ZWRTaXplQmluYXJ5KCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRml4ZWRTaXplQmluYXJ5KHQuYnl0ZVdpZHRoKCkpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5GaXhlZFNpemVMaXN0OiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaXhlZFNpemVMaXN0KCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRml4ZWRTaXplTGlzdCh0Lmxpc3RTaXplKCksIGNoaWxkcmVuIHx8IFtdKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuTWFwOiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NYXAoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNYXBfKGNoaWxkcmVuIHx8IFtdLCB0LmtleXNTb3J0ZWQoKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKGBVbnJlY29nbml6ZWQgdHlwZTogXCIke1R5cGVbdHlwZUlkXX1cIiAoJHt0eXBlSWR9KWApO1xufVxuXG5mdW5jdGlvbiBlbmNvZGVTY2hlbWEoYjogQnVpbGRlciwgc2NoZW1hOiBTY2hlbWEpIHtcblxuICAgIGNvbnN0IGZpZWxkT2Zmc2V0cyA9IHNjaGVtYS5maWVsZHMubWFwKChmKSA9PiBGaWVsZC5lbmNvZGUoYiwgZikpO1xuXG4gICAgX1NjaGVtYS5zdGFydEZpZWxkc1ZlY3RvcihiLCBmaWVsZE9mZnNldHMubGVuZ3RoKTtcblxuICAgIGNvbnN0IGZpZWxkc1ZlY3Rvck9mZnNldCA9IF9TY2hlbWEuY3JlYXRlRmllbGRzVmVjdG9yKGIsIGZpZWxkT2Zmc2V0cyk7XG5cbiAgICBjb25zdCBtZXRhZGF0YU9mZnNldCA9ICEoc2NoZW1hLm1ldGFkYXRhICYmIHNjaGVtYS5tZXRhZGF0YS5zaXplID4gMCkgPyAtMSA6XG4gICAgICAgIF9TY2hlbWEuY3JlYXRlQ3VzdG9tTWV0YWRhdGFWZWN0b3IoYiwgWy4uLnNjaGVtYS5tZXRhZGF0YV0ubWFwKChbaywgdl0pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IGIuY3JlYXRlU3RyaW5nKGAke2t9YCk7XG4gICAgICAgICAgICBjb25zdCB2YWwgPSBiLmNyZWF0ZVN0cmluZyhgJHt2fWApO1xuICAgICAgICAgICAgX0tleVZhbHVlLnN0YXJ0S2V5VmFsdWUoYik7XG4gICAgICAgICAgICBfS2V5VmFsdWUuYWRkS2V5KGIsIGtleSk7XG4gICAgICAgICAgICBfS2V5VmFsdWUuYWRkVmFsdWUoYiwgdmFsKTtcbiAgICAgICAgICAgIHJldHVybiBfS2V5VmFsdWUuZW5kS2V5VmFsdWUoYik7XG4gICAgICAgIH0pKTtcblxuICAgIF9TY2hlbWEuc3RhcnRTY2hlbWEoYik7XG4gICAgX1NjaGVtYS5hZGRGaWVsZHMoYiwgZmllbGRzVmVjdG9yT2Zmc2V0KTtcbiAgICBfU2NoZW1hLmFkZEVuZGlhbm5lc3MoYiwgcGxhdGZvcm1Jc0xpdHRsZUVuZGlhbiA/IF9FbmRpYW5uZXNzLkxpdHRsZSA6IF9FbmRpYW5uZXNzLkJpZyk7XG5cbiAgICBpZiAobWV0YWRhdGFPZmZzZXQgIT09IC0xKSB7IF9TY2hlbWEuYWRkQ3VzdG9tTWV0YWRhdGEoYiwgbWV0YWRhdGFPZmZzZXQpOyB9XG5cbiAgICByZXR1cm4gX1NjaGVtYS5lbmRTY2hlbWEoYik7XG59XG5cbmZ1bmN0aW9uIGVuY29kZUZpZWxkKGI6IEJ1aWxkZXIsIGZpZWxkOiBGaWVsZCkge1xuXG4gICAgbGV0IG5hbWVPZmZzZXQgPSAtMTtcbiAgICBsZXQgdHlwZU9mZnNldCA9IC0xO1xuICAgIGxldCBkaWN0aW9uYXJ5T2Zmc2V0ID0gLTE7XG5cbiAgICBsZXQgdHlwZSA9IGZpZWxkLnR5cGU7XG4gICAgbGV0IHR5cGVJZDogVHlwZSA9IDxhbnk+IGZpZWxkLnR5cGVJZDtcblxuICAgIGlmICghRGF0YVR5cGUuaXNEaWN0aW9uYXJ5KHR5cGUpKSB7XG4gICAgICAgIHR5cGVPZmZzZXQgPSB0eXBlQXNzZW1ibGVyLnZpc2l0KHR5cGUsIGIpITtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0eXBlSWQgPSB0eXBlLmRpY3Rpb25hcnkuVFR5cGU7XG4gICAgICAgIGRpY3Rpb25hcnlPZmZzZXQgPSB0eXBlQXNzZW1ibGVyLnZpc2l0KHR5cGUsIGIpITtcbiAgICAgICAgdHlwZU9mZnNldCA9IHR5cGVBc3NlbWJsZXIudmlzaXQodHlwZS5kaWN0aW9uYXJ5LCBiKSE7XG4gICAgfVxuXG4gICAgY29uc3QgY2hpbGRPZmZzZXRzID0gKHR5cGUuY2hpbGRyZW4gfHwgW10pLm1hcCgoZjogRmllbGQpID0+IEZpZWxkLmVuY29kZShiLCBmKSk7XG4gICAgY29uc3QgY2hpbGRyZW5WZWN0b3JPZmZzZXQgPSBfRmllbGQuY3JlYXRlQ2hpbGRyZW5WZWN0b3IoYiwgY2hpbGRPZmZzZXRzKTtcblxuICAgIGNvbnN0IG1ldGFkYXRhT2Zmc2V0ID0gIShmaWVsZC5tZXRhZGF0YSAmJiBmaWVsZC5tZXRhZGF0YS5zaXplID4gMCkgPyAtMSA6XG4gICAgICAgIF9GaWVsZC5jcmVhdGVDdXN0b21NZXRhZGF0YVZlY3RvcihiLCBbLi4uZmllbGQubWV0YWRhdGFdLm1hcCgoW2ssIHZdKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBrZXkgPSBiLmNyZWF0ZVN0cmluZyhgJHtrfWApO1xuICAgICAgICAgICAgY29uc3QgdmFsID0gYi5jcmVhdGVTdHJpbmcoYCR7dn1gKTtcbiAgICAgICAgICAgIF9LZXlWYWx1ZS5zdGFydEtleVZhbHVlKGIpO1xuICAgICAgICAgICAgX0tleVZhbHVlLmFkZEtleShiLCBrZXkpO1xuICAgICAgICAgICAgX0tleVZhbHVlLmFkZFZhbHVlKGIsIHZhbCk7XG4gICAgICAgICAgICByZXR1cm4gX0tleVZhbHVlLmVuZEtleVZhbHVlKGIpO1xuICAgICAgICB9KSk7XG5cbiAgICBpZiAoZmllbGQubmFtZSkge1xuICAgICAgICBuYW1lT2Zmc2V0ID0gYi5jcmVhdGVTdHJpbmcoZmllbGQubmFtZSk7XG4gICAgfVxuXG4gICAgX0ZpZWxkLnN0YXJ0RmllbGQoYik7XG4gICAgX0ZpZWxkLmFkZFR5cGUoYiwgdHlwZU9mZnNldCk7XG4gICAgX0ZpZWxkLmFkZFR5cGVUeXBlKGIsIHR5cGVJZCk7XG4gICAgX0ZpZWxkLmFkZENoaWxkcmVuKGIsIGNoaWxkcmVuVmVjdG9yT2Zmc2V0KTtcbiAgICBfRmllbGQuYWRkTnVsbGFibGUoYiwgISFmaWVsZC5udWxsYWJsZSk7XG5cbiAgICBpZiAobmFtZU9mZnNldCAhPT0gLTEpIHsgX0ZpZWxkLmFkZE5hbWUoYiwgbmFtZU9mZnNldCk7IH1cbiAgICBpZiAoZGljdGlvbmFyeU9mZnNldCAhPT0gLTEpIHsgX0ZpZWxkLmFkZERpY3Rpb25hcnkoYiwgZGljdGlvbmFyeU9mZnNldCk7IH1cbiAgICBpZiAobWV0YWRhdGFPZmZzZXQgIT09IC0xKSB7IF9GaWVsZC5hZGRDdXN0b21NZXRhZGF0YShiLCBtZXRhZGF0YU9mZnNldCk7IH1cblxuICAgIHJldHVybiBfRmllbGQuZW5kRmllbGQoYik7XG59XG5cbmZ1bmN0aW9uIGVuY29kZVJlY29yZEJhdGNoKGI6IEJ1aWxkZXIsIHJlY29yZEJhdGNoOiBSZWNvcmRCYXRjaCkge1xuXG4gICAgY29uc3Qgbm9kZXMgPSByZWNvcmRCYXRjaC5ub2RlcyB8fCBbXTtcbiAgICBjb25zdCBidWZmZXJzID0gcmVjb3JkQmF0Y2guYnVmZmVycyB8fCBbXTtcblxuICAgIF9SZWNvcmRCYXRjaC5zdGFydE5vZGVzVmVjdG9yKGIsIG5vZGVzLmxlbmd0aCk7XG4gICAgbm9kZXMuc2xpY2UoKS5yZXZlcnNlKCkuZm9yRWFjaCgobikgPT4gRmllbGROb2RlLmVuY29kZShiLCBuKSk7XG5cbiAgICBjb25zdCBub2Rlc1ZlY3Rvck9mZnNldCA9IGIuZW5kVmVjdG9yKCk7XG5cbiAgICBfUmVjb3JkQmF0Y2guc3RhcnRCdWZmZXJzVmVjdG9yKGIsIGJ1ZmZlcnMubGVuZ3RoKTtcbiAgICBidWZmZXJzLnNsaWNlKCkucmV2ZXJzZSgpLmZvckVhY2goKGJfKSA9PiBCdWZmZXJSZWdpb24uZW5jb2RlKGIsIGJfKSk7XG5cbiAgICBjb25zdCBidWZmZXJzVmVjdG9yT2Zmc2V0ID0gYi5lbmRWZWN0b3IoKTtcblxuICAgIF9SZWNvcmRCYXRjaC5zdGFydFJlY29yZEJhdGNoKGIpO1xuICAgIF9SZWNvcmRCYXRjaC5hZGRMZW5ndGgoYiwgbmV3IExvbmcocmVjb3JkQmF0Y2gubGVuZ3RoLCAwKSk7XG4gICAgX1JlY29yZEJhdGNoLmFkZE5vZGVzKGIsIG5vZGVzVmVjdG9yT2Zmc2V0KTtcbiAgICBfUmVjb3JkQmF0Y2guYWRkQnVmZmVycyhiLCBidWZmZXJzVmVjdG9yT2Zmc2V0KTtcbiAgICByZXR1cm4gX1JlY29yZEJhdGNoLmVuZFJlY29yZEJhdGNoKGIpO1xufVxuXG5mdW5jdGlvbiBlbmNvZGVEaWN0aW9uYXJ5QmF0Y2goYjogQnVpbGRlciwgZGljdGlvbmFyeUJhdGNoOiBEaWN0aW9uYXJ5QmF0Y2gpIHtcbiAgICBjb25zdCBkYXRhT2Zmc2V0ID0gUmVjb3JkQmF0Y2guZW5jb2RlKGIsIGRpY3Rpb25hcnlCYXRjaC5kYXRhKTtcbiAgICBfRGljdGlvbmFyeUJhdGNoLnN0YXJ0RGljdGlvbmFyeUJhdGNoKGIpO1xuICAgIF9EaWN0aW9uYXJ5QmF0Y2guYWRkSWQoYiwgbmV3IExvbmcoZGljdGlvbmFyeUJhdGNoLmlkLCAwKSk7XG4gICAgX0RpY3Rpb25hcnlCYXRjaC5hZGRJc0RlbHRhKGIsIGRpY3Rpb25hcnlCYXRjaC5pc0RlbHRhKTtcbiAgICBfRGljdGlvbmFyeUJhdGNoLmFkZERhdGEoYiwgZGF0YU9mZnNldCk7XG4gICAgcmV0dXJuIF9EaWN0aW9uYXJ5QmF0Y2guZW5kRGljdGlvbmFyeUJhdGNoKGIpO1xufVxuXG5mdW5jdGlvbiBlbmNvZGVGaWVsZE5vZGUoYjogQnVpbGRlciwgbm9kZTogRmllbGROb2RlKSB7XG4gICAgcmV0dXJuIF9GaWVsZE5vZGUuY3JlYXRlRmllbGROb2RlKGIsIG5ldyBMb25nKG5vZGUubGVuZ3RoLCAwKSwgbmV3IExvbmcobm9kZS5udWxsQ291bnQsIDApKTtcbn1cblxuZnVuY3Rpb24gZW5jb2RlQnVmZmVyUmVnaW9uKGI6IEJ1aWxkZXIsIG5vZGU6IEJ1ZmZlclJlZ2lvbikge1xuICAgIHJldHVybiBfQnVmZmVyLmNyZWF0ZUJ1ZmZlcihiLCBuZXcgTG9uZyhub2RlLm9mZnNldCwgMCksIG5ldyBMb25nKG5vZGUubGVuZ3RoLCAwKSk7XG59XG5cbmNvbnN0IHBsYXRmb3JtSXNMaXR0bGVFbmRpYW4gPSAoZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKDIpO1xuICAgIG5ldyBEYXRhVmlldyhidWZmZXIpLnNldEludDE2KDAsIDI1NiwgdHJ1ZSAvKiBsaXR0bGVFbmRpYW4gKi8pO1xuICAgIC8vIEludDE2QXJyYXkgdXNlcyB0aGUgcGxhdGZvcm0ncyBlbmRpYW5uZXNzLlxuICAgIHJldHVybiBuZXcgSW50MTZBcnJheShidWZmZXIpWzBdID09PSAyNTY7XG59KSgpO1xuXG50eXBlIE1lc3NhZ2VIZWFkZXJEZWNvZGVyID0gPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyPigpID0+IFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyLlNjaGVtYSA/IFNjaGVtYVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBUIGV4dGVuZHMgTWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaCA/IFJlY29yZEJhdGNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaCA/IERpY3Rpb25hcnlCYXRjaCA6IG5ldmVyO1xuIl19

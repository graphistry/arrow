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
/** @ignore */
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
/** @ignore */
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
/** @ignore */
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
/** @ignore */
class BufferRegion {
    constructor(offset, length) {
        this.offset = typeof offset === 'number' ? offset : offset.low;
        this.length = typeof length === 'number' ? length : length.low;
    }
}
exports.BufferRegion = BufferRegion;
/** @ignore */
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
/** @ignore */
function decodeSchema(_schema, dictionaries = new Map(), dictionaryFields = new Map()) {
    const fields = decodeSchemaFields(_schema, dictionaries, dictionaryFields);
    return new schema_1.Schema(fields, decodeCustomMetadata(_schema), dictionaries, dictionaryFields);
}
/** @ignore */
function decodeRecordBatch(batch, version = enum_1.MetadataVersion.V4) {
    return new RecordBatch(batch.length(), decodeFieldNodes(batch), decodeBuffers(batch, version));
}
/** @ignore */
function decodeDictionaryBatch(batch, version = enum_1.MetadataVersion.V4) {
    return new DictionaryBatch(RecordBatch.decode(batch.data(), version), batch.id(), batch.isDelta());
}
/** @ignore */
function decodeBufferRegion(b) {
    return new BufferRegion(b.offset(), b.length());
}
/** @ignore */
function decodeFieldNode(f) {
    return new FieldNode(f.length(), f.nullCount());
}
/** @ignore */
function decodeFieldNodes(batch) {
    return Array.from({ length: batch.nodesLength() }, (_, i) => batch.nodes(i)).filter(Boolean).map(FieldNode.decode);
}
/** @ignore */
function decodeBuffers(batch, version) {
    return Array.from({ length: batch.buffersLength() }, (_, i) => batch.buffers(i)).filter(Boolean).map(v3Compat(version, BufferRegion.decode));
}
/** @ignore */
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
/** @ignore */
function decodeSchemaFields(schema, dictionaries, dictionaryFields) {
    return Array.from({ length: schema.fieldsLength() }, (_, i) => schema.fields(i)).filter(Boolean).map((f) => schema_1.Field.decode(f, dictionaries, dictionaryFields));
}
/** @ignore */
function decodeFieldChildren(field, dictionaries, dictionaryFields) {
    return Array.from({ length: field.childrenLength() }, (_, i) => field.children(i)).filter(Boolean).map((f) => schema_1.Field.decode(f, dictionaries, dictionaryFields));
}
/** @ignore */
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
/** @ignore */
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
/** @ignore */
function decodeIndexType(_type) {
    return new type_1.Int(_type.isSigned(), _type.bitWidth());
}
/** @ignore */
function decodeFieldType(f, children) {
    const typeId = f.typeType();
    switch (typeId) {
        case Type.NONE: return new type_1.DataType();
        case Type.Null: return new type_1.Null();
        case Type.Binary: return new type_1.Binary();
        case Type.Utf8: return new type_1.Utf8();
        case Type.Bool: return new type_1.Bool();
        case Type.List: return new type_1.List((children || [])[0]);
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
            return new type_1.Union(t.mode(), t.typeIdsArray() || [], children || []);
        }
        case Type.FixedSizeBinary: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.FixedSizeBinary());
            return new type_1.FixedSizeBinary(t.byteWidth());
        }
        case Type.FixedSizeList: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.FixedSizeList());
            return new type_1.FixedSizeList(t.listSize(), (children || [])[0]);
        }
        case Type.Map: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.Map());
            return new type_1.Map_(children || [], t.keysSorted());
        }
    }
    throw new Error(`Unrecognized type: "${Type[typeId]}" (${typeId})`);
}
/** @ignore */
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
/** @ignore */
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
        typeId = type.dictionary.typeId;
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
/** @ignore */
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
/** @ignore */
function encodeDictionaryBatch(b, dictionaryBatch) {
    const dataOffset = RecordBatch.encode(b, dictionaryBatch.data);
    _DictionaryBatch.startDictionaryBatch(b);
    _DictionaryBatch.addId(b, new Long(dictionaryBatch.id, 0));
    _DictionaryBatch.addIsDelta(b, dictionaryBatch.isDelta);
    _DictionaryBatch.addData(b, dataOffset);
    return _DictionaryBatch.endDictionaryBatch(b);
}
/** @ignore */
function encodeFieldNode(b, node) {
    return _FieldNode.createFieldNode(b, new Long(node.length, 0), new Long(node.nullCount, 0));
}
/** @ignore */
function encodeBufferRegion(b, node) {
    return _Buffer.createBuffer(b, new Long(node.offset, 0), new Long(node.length, 0));
}
/** @ignore */
const platformIsLittleEndian = (function () {
    const buffer = new ArrayBuffer(2);
    new DataView(buffer).setInt16(0, 256, true /* littleEndian */);
    // Int16Array uses the platform's endianness.
    return new Int16Array(buffer)[0] === 256;
})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LGtCQUFrQixDQUFDLENBQVUsRUFBRSxJQUFrQjtJQUN0RCxPQUFPLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZGLENBQUM7QUFFRCxjQUFjO0FBQ2QsTUFBTSxzQkFBc0IsR0FBRyxDQUFDO0lBQzVCLE1BQU0sTUFBTSxHQUFHLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xDLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQy9ELDZDQUE2QztJQUM3QyxPQUFPLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQztBQUM3QyxDQUFDLENBQUMsRUFBRSxDQUFDIiwiZmlsZSI6ImlwYy9tZXRhZGF0YS9tZXNzYWdlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IGZsYXRidWZmZXJzIH0gZnJvbSAnZmxhdGJ1ZmZlcnMnO1xuaW1wb3J0ICogYXMgU2NoZW1hXyBmcm9tICcuLi8uLi9mYi9TY2hlbWEnO1xuaW1wb3J0ICogYXMgTWVzc2FnZV8gZnJvbSAnLi4vLi4vZmIvTWVzc2FnZSc7XG5cbmltcG9ydCB7IFNjaGVtYSwgRmllbGQgfSBmcm9tICcuLi8uLi9zY2hlbWEnO1xuaW1wb3J0IHsgdG9VaW50OEFycmF5IH0gZnJvbSAnLi4vLi4vdXRpbC9idWZmZXInO1xuaW1wb3J0IHsgQXJyYXlCdWZmZXJWaWV3SW5wdXQgfSBmcm9tICcuLi8uLi91dGlsL2J1ZmZlcic7XG5pbXBvcnQgeyBNZXNzYWdlSGVhZGVyLCBNZXRhZGF0YVZlcnNpb24gfSBmcm9tICcuLi8uLi9lbnVtJztcbmltcG9ydCB7IGluc3RhbmNlIGFzIHR5cGVBc3NlbWJsZXIgfSBmcm9tICcuLi8uLi92aXNpdG9yL3R5cGVhc3NlbWJsZXInO1xuaW1wb3J0IHsgZmllbGRGcm9tSlNPTiwgc2NoZW1hRnJvbUpTT04sIHJlY29yZEJhdGNoRnJvbUpTT04sIGRpY3Rpb25hcnlCYXRjaEZyb21KU09OIH0gZnJvbSAnLi9qc29uJztcblxuaW1wb3J0IExvbmcgPSBmbGF0YnVmZmVycy5Mb25nO1xuaW1wb3J0IEJ1aWxkZXIgPSBmbGF0YnVmZmVycy5CdWlsZGVyO1xuaW1wb3J0IEJ5dGVCdWZmZXIgPSBmbGF0YnVmZmVycy5CeXRlQnVmZmVyO1xuaW1wb3J0IF9JbnQgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5JbnQ7XG5pbXBvcnQgVHlwZSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlR5cGU7XG5pbXBvcnQgX0ZpZWxkID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRmllbGQ7XG5pbXBvcnQgX1NjaGVtYSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlNjaGVtYTtcbmltcG9ydCBfQnVmZmVyID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuQnVmZmVyO1xuaW1wb3J0IF9NZXNzYWdlID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk1lc3NhZ2U7XG5pbXBvcnQgX0tleVZhbHVlID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuS2V5VmFsdWU7XG5pbXBvcnQgX0ZpZWxkTm9kZSA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaWVsZE5vZGU7XG5pbXBvcnQgX0VuZGlhbm5lc3MgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5FbmRpYW5uZXNzO1xuaW1wb3J0IF9SZWNvcmRCYXRjaCA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5SZWNvcmRCYXRjaDtcbmltcG9ydCBfRGljdGlvbmFyeUJhdGNoID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRpY3Rpb25hcnlCYXRjaDtcbmltcG9ydCBfRGljdGlvbmFyeUVuY29kaW5nID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGljdGlvbmFyeUVuY29kaW5nO1xuXG5pbXBvcnQge1xuICAgIERhdGFUeXBlLCBEaWN0aW9uYXJ5LCBUaW1lQml0V2lkdGgsXG4gICAgVXRmOCwgQmluYXJ5LCBEZWNpbWFsLCBGaXhlZFNpemVCaW5hcnksXG4gICAgTGlzdCwgRml4ZWRTaXplTGlzdCwgTWFwXywgU3RydWN0LCBVbmlvbixcbiAgICBCb29sLCBOdWxsLCBJbnQsIEZsb2F0LCBEYXRlXywgVGltZSwgSW50ZXJ2YWwsIFRpbWVzdGFtcCwgSW50Qml0V2lkdGgsIEludDMyLCBUS2V5cyxcbn0gZnJvbSAnLi4vLi4vdHlwZSc7XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY2xhc3MgTWVzc2FnZTxUIGV4dGVuZHMgTWVzc2FnZUhlYWRlciA9IGFueT4ge1xuXG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBmcm9tSlNPTjxUIGV4dGVuZHMgTWVzc2FnZUhlYWRlcj4obXNnOiBhbnksIGhlYWRlclR5cGU6IFQpOiBNZXNzYWdlPFQ+IHtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IG5ldyBNZXNzYWdlKDAsIE1ldGFkYXRhVmVyc2lvbi5WNCwgaGVhZGVyVHlwZSk7XG4gICAgICAgIG1lc3NhZ2UuX2NyZWF0ZUhlYWRlciA9IG1lc3NhZ2VIZWFkZXJGcm9tSlNPTihtc2csIGhlYWRlclR5cGUpO1xuICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICB9XG5cbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGRlY29kZShidWY6IEFycmF5QnVmZmVyVmlld0lucHV0KSB7XG4gICAgICAgIGJ1ZiA9IG5ldyBCeXRlQnVmZmVyKHRvVWludDhBcnJheShidWYpKTtcbiAgICAgICAgY29uc3QgX21lc3NhZ2UgPSBfTWVzc2FnZS5nZXRSb290QXNNZXNzYWdlKGJ1Zik7XG4gICAgICAgIGNvbnN0IGJvZHlMZW5ndGg6IExvbmcgPSBfbWVzc2FnZS5ib2R5TGVuZ3RoKCkhO1xuICAgICAgICBjb25zdCB2ZXJzaW9uOiBNZXRhZGF0YVZlcnNpb24gPSBfbWVzc2FnZS52ZXJzaW9uKCk7XG4gICAgICAgIGNvbnN0IGhlYWRlclR5cGU6IE1lc3NhZ2VIZWFkZXIgPSBfbWVzc2FnZS5oZWFkZXJUeXBlKCk7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBuZXcgTWVzc2FnZShib2R5TGVuZ3RoLCB2ZXJzaW9uLCBoZWFkZXJUeXBlKTtcbiAgICAgICAgbWVzc2FnZS5fY3JlYXRlSGVhZGVyID0gZGVjb2RlTWVzc2FnZUhlYWRlcihfbWVzc2FnZSwgaGVhZGVyVHlwZSk7XG4gICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgIH1cblxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZW5jb2RlPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyPihtZXNzYWdlOiBNZXNzYWdlPFQ+KSB7XG4gICAgICAgIGxldCBiID0gbmV3IEJ1aWxkZXIoKSwgaGVhZGVyT2Zmc2V0ID0gLTE7XG4gICAgICAgIGlmIChtZXNzYWdlLmlzU2NoZW1hKCkpIHtcbiAgICAgICAgICAgIGhlYWRlck9mZnNldCA9IFNjaGVtYS5lbmNvZGUoYiwgbWVzc2FnZS5oZWFkZXIoKSBhcyBTY2hlbWEpO1xuICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuaXNSZWNvcmRCYXRjaCgpKSB7XG4gICAgICAgICAgICBoZWFkZXJPZmZzZXQgPSBSZWNvcmRCYXRjaC5lbmNvZGUoYiwgbWVzc2FnZS5oZWFkZXIoKSBhcyBSZWNvcmRCYXRjaCk7XG4gICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5pc0RpY3Rpb25hcnlCYXRjaCgpKSB7XG4gICAgICAgICAgICBoZWFkZXJPZmZzZXQgPSBEaWN0aW9uYXJ5QmF0Y2guZW5jb2RlKGIsIG1lc3NhZ2UuaGVhZGVyKCkgYXMgRGljdGlvbmFyeUJhdGNoKTtcbiAgICAgICAgfVxuICAgICAgICBfTWVzc2FnZS5zdGFydE1lc3NhZ2UoYik7XG4gICAgICAgIF9NZXNzYWdlLmFkZFZlcnNpb24oYiwgTWV0YWRhdGFWZXJzaW9uLlY0KTtcbiAgICAgICAgX01lc3NhZ2UuYWRkSGVhZGVyKGIsIGhlYWRlck9mZnNldCk7XG4gICAgICAgIF9NZXNzYWdlLmFkZEhlYWRlclR5cGUoYiwgbWVzc2FnZS5oZWFkZXJUeXBlKTtcbiAgICAgICAgX01lc3NhZ2UuYWRkQm9keUxlbmd0aChiLCBuZXcgTG9uZyhtZXNzYWdlLmJvZHlMZW5ndGgsIDApKTtcbiAgICAgICAgX01lc3NhZ2UuZmluaXNoTWVzc2FnZUJ1ZmZlcihiLCBfTWVzc2FnZS5lbmRNZXNzYWdlKGIpKTtcbiAgICAgICAgcmV0dXJuIGIuYXNVaW50OEFycmF5KCk7XG4gICAgfVxuXG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGhlYWRlcjogU2NoZW1hIHwgUmVjb3JkQmF0Y2ggfCBEaWN0aW9uYXJ5QmF0Y2gsIGJvZHlMZW5ndGggPSAwKSB7XG4gICAgICAgIGlmIChoZWFkZXIgaW5zdGFuY2VvZiBTY2hlbWEpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgTWVzc2FnZSgwLCBNZXRhZGF0YVZlcnNpb24uVjQsIE1lc3NhZ2VIZWFkZXIuU2NoZW1hLCBoZWFkZXIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChoZWFkZXIgaW5zdGFuY2VvZiBSZWNvcmRCYXRjaCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNZXNzYWdlKGJvZHlMZW5ndGgsIE1ldGFkYXRhVmVyc2lvbi5WNCwgTWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaCwgaGVhZGVyKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGVhZGVyIGluc3RhbmNlb2YgRGljdGlvbmFyeUJhdGNoKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1lc3NhZ2UoYm9keUxlbmd0aCwgTWV0YWRhdGFWZXJzaW9uLlY0LCBNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaCwgaGVhZGVyKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVucmVjb2duaXplZCBNZXNzYWdlIGhlYWRlcjogJHtoZWFkZXJ9YCk7XG4gICAgfVxuXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyBib2R5OiBVaW50OEFycmF5O1xuICAgIHByb3RlY3RlZCBfaGVhZGVyVHlwZTogVDtcbiAgICBwcm90ZWN0ZWQgX2JvZHlMZW5ndGg6IG51bWJlcjtcbiAgICBwcm90ZWN0ZWQgX3ZlcnNpb246IE1ldGFkYXRhVmVyc2lvbjtcbiAgICBwdWJsaWMgZ2V0IHR5cGUoKSB7IHJldHVybiB0aGlzLmhlYWRlclR5cGU7IH1cbiAgICBwdWJsaWMgZ2V0IHZlcnNpb24oKSB7IHJldHVybiB0aGlzLl92ZXJzaW9uOyB9XG4gICAgcHVibGljIGdldCBoZWFkZXJUeXBlKCkgeyByZXR1cm4gdGhpcy5faGVhZGVyVHlwZTsgfVxuICAgIHB1YmxpYyBnZXQgYm9keUxlbmd0aCgpIHsgcmV0dXJuIHRoaXMuX2JvZHlMZW5ndGg7IH1cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHJvdGVjdGVkIF9jcmVhdGVIZWFkZXI6IE1lc3NhZ2VIZWFkZXJEZWNvZGVyO1xuICAgIHB1YmxpYyBoZWFkZXIoKSB7IHJldHVybiB0aGlzLl9jcmVhdGVIZWFkZXI8VD4oKTsgfVxuICAgIHB1YmxpYyBpc1NjaGVtYSgpOiB0aGlzIGlzIE1lc3NhZ2U8TWVzc2FnZUhlYWRlci5TY2hlbWE+IHsgcmV0dXJuIHRoaXMuaGVhZGVyVHlwZSA9PT0gTWVzc2FnZUhlYWRlci5TY2hlbWE7IH1cbiAgICBwdWJsaWMgaXNSZWNvcmRCYXRjaCgpOiB0aGlzIGlzIE1lc3NhZ2U8TWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaD4geyByZXR1cm4gdGhpcy5oZWFkZXJUeXBlID09PSBNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoOyB9XG4gICAgcHVibGljIGlzRGljdGlvbmFyeUJhdGNoKCk6IHRoaXMgaXMgTWVzc2FnZTxNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaD4geyByZXR1cm4gdGhpcy5oZWFkZXJUeXBlID09PSBNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaDsgfVxuXG4gICAgY29uc3RydWN0b3IoYm9keUxlbmd0aDogTG9uZyB8IG51bWJlciwgdmVyc2lvbjogTWV0YWRhdGFWZXJzaW9uLCBoZWFkZXJUeXBlOiBULCBoZWFkZXI/OiBhbnkpIHtcbiAgICAgICAgdGhpcy5fdmVyc2lvbiA9IHZlcnNpb247XG4gICAgICAgIHRoaXMuX2hlYWRlclR5cGUgPSBoZWFkZXJUeXBlO1xuICAgICAgICB0aGlzLmJvZHkgPSBuZXcgVWludDhBcnJheSgwKTtcbiAgICAgICAgaGVhZGVyICYmICh0aGlzLl9jcmVhdGVIZWFkZXIgPSAoKSA9PiBoZWFkZXIpO1xuICAgICAgICB0aGlzLl9ib2R5TGVuZ3RoID0gdHlwZW9mIGJvZHlMZW5ndGggPT09ICdudW1iZXInID8gYm9keUxlbmd0aCA6IGJvZHlMZW5ndGgubG93O1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjbGFzcyBSZWNvcmRCYXRjaCB7XG4gICAgcHJvdGVjdGVkIF9sZW5ndGg6IG51bWJlcjtcbiAgICBwcm90ZWN0ZWQgX25vZGVzOiBGaWVsZE5vZGVbXTtcbiAgICBwcm90ZWN0ZWQgX2J1ZmZlcnM6IEJ1ZmZlclJlZ2lvbltdO1xuICAgIHB1YmxpYyBnZXQgbm9kZXMoKSB7IHJldHVybiB0aGlzLl9ub2RlczsgfVxuICAgIHB1YmxpYyBnZXQgbGVuZ3RoKCkgeyByZXR1cm4gdGhpcy5fbGVuZ3RoOyB9XG4gICAgcHVibGljIGdldCBidWZmZXJzKCkgeyByZXR1cm4gdGhpcy5fYnVmZmVyczsgfVxuICAgIGNvbnN0cnVjdG9yKGxlbmd0aDogTG9uZyB8IG51bWJlciwgbm9kZXM6IEZpZWxkTm9kZVtdLCBidWZmZXJzOiBCdWZmZXJSZWdpb25bXSkge1xuICAgICAgICB0aGlzLl9ub2RlcyA9IG5vZGVzO1xuICAgICAgICB0aGlzLl9idWZmZXJzID0gYnVmZmVycztcbiAgICAgICAgdGhpcy5fbGVuZ3RoID0gdHlwZW9mIGxlbmd0aCA9PT0gJ251bWJlcicgPyBsZW5ndGggOiBsZW5ndGgubG93O1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjbGFzcyBEaWN0aW9uYXJ5QmF0Y2gge1xuXG4gICAgcHJvdGVjdGVkIF9pZDogbnVtYmVyO1xuICAgIHByb3RlY3RlZCBfaXNEZWx0YTogYm9vbGVhbjtcbiAgICBwcm90ZWN0ZWQgX2RhdGE6IFJlY29yZEJhdGNoO1xuICAgIHB1YmxpYyBnZXQgaWQoKSB7IHJldHVybiB0aGlzLl9pZDsgfVxuICAgIHB1YmxpYyBnZXQgZGF0YSgpIHsgcmV0dXJuIHRoaXMuX2RhdGE7IH1cbiAgICBwdWJsaWMgZ2V0IGlzRGVsdGEoKSB7IHJldHVybiB0aGlzLl9pc0RlbHRhOyB9XG4gICAgcHVibGljIGdldCBsZW5ndGgoKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMuZGF0YS5sZW5ndGg7IH1cbiAgICBwdWJsaWMgZ2V0IG5vZGVzKCk6IEZpZWxkTm9kZVtdIHsgcmV0dXJuIHRoaXMuZGF0YS5ub2RlczsgfVxuICAgIHB1YmxpYyBnZXQgYnVmZmVycygpOiBCdWZmZXJSZWdpb25bXSB7IHJldHVybiB0aGlzLmRhdGEuYnVmZmVyczsgfVxuXG4gICAgY29uc3RydWN0b3IoZGF0YTogUmVjb3JkQmF0Y2gsIGlkOiBMb25nIHwgbnVtYmVyLCBpc0RlbHRhOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICAgICAgdGhpcy5fZGF0YSA9IGRhdGE7XG4gICAgICAgIHRoaXMuX2lzRGVsdGEgPSBpc0RlbHRhO1xuICAgICAgICB0aGlzLl9pZCA9IHR5cGVvZiBpZCA9PT0gJ251bWJlcicgPyBpZCA6IGlkLmxvdztcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY2xhc3MgQnVmZmVyUmVnaW9uIHtcbiAgICBwdWJsaWMgb2Zmc2V0OiBudW1iZXI7XG4gICAgcHVibGljIGxlbmd0aDogbnVtYmVyO1xuICAgIGNvbnN0cnVjdG9yKG9mZnNldDogTG9uZyB8IG51bWJlciwgbGVuZ3RoOiBMb25nIHwgbnVtYmVyKSB7XG4gICAgICAgIHRoaXMub2Zmc2V0ID0gdHlwZW9mIG9mZnNldCA9PT0gJ251bWJlcicgPyBvZmZzZXQgOiBvZmZzZXQubG93O1xuICAgICAgICB0aGlzLmxlbmd0aCA9IHR5cGVvZiBsZW5ndGggPT09ICdudW1iZXInID8gbGVuZ3RoIDogbGVuZ3RoLmxvdztcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY2xhc3MgRmllbGROb2RlIHtcbiAgICBwdWJsaWMgbGVuZ3RoOiBudW1iZXI7XG4gICAgcHVibGljIG51bGxDb3VudDogbnVtYmVyO1xuICAgIGNvbnN0cnVjdG9yKGxlbmd0aDogTG9uZyB8IG51bWJlciwgbnVsbENvdW50OiBMb25nIHwgbnVtYmVyKSB7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gdHlwZW9mIGxlbmd0aCA9PT0gJ251bWJlcicgPyBsZW5ndGggOiBsZW5ndGgubG93O1xuICAgICAgICB0aGlzLm51bGxDb3VudCA9IHR5cGVvZiBudWxsQ291bnQgPT09ICdudW1iZXInID8gbnVsbENvdW50IDogbnVsbENvdW50LmxvdztcbiAgICB9XG59XG5cbmZ1bmN0aW9uIG1lc3NhZ2VIZWFkZXJGcm9tSlNPTihtZXNzYWdlOiBhbnksIHR5cGU6IE1lc3NhZ2VIZWFkZXIpIHtcbiAgICByZXR1cm4gKCgpID0+IHtcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlIE1lc3NhZ2VIZWFkZXIuU2NoZW1hOiByZXR1cm4gU2NoZW1hLmZyb21KU09OKG1lc3NhZ2UpO1xuICAgICAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoOiByZXR1cm4gUmVjb3JkQmF0Y2guZnJvbUpTT04obWVzc2FnZSk7XG4gICAgICAgICAgICBjYXNlIE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoOiByZXR1cm4gRGljdGlvbmFyeUJhdGNoLmZyb21KU09OKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5yZWNvZ25pemVkIE1lc3NhZ2UgdHlwZTogeyBuYW1lOiAke01lc3NhZ2VIZWFkZXJbdHlwZV19LCB0eXBlOiAke3R5cGV9IH1gKTtcbiAgICB9KSBhcyBNZXNzYWdlSGVhZGVyRGVjb2Rlcjtcbn1cblxuZnVuY3Rpb24gZGVjb2RlTWVzc2FnZUhlYWRlcihtZXNzYWdlOiBfTWVzc2FnZSwgdHlwZTogTWVzc2FnZUhlYWRlcikge1xuICAgIHJldHVybiAoKCkgPT4ge1xuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgTWVzc2FnZUhlYWRlci5TY2hlbWE6IHJldHVybiBTY2hlbWEuZGVjb2RlKG1lc3NhZ2UuaGVhZGVyKG5ldyBfU2NoZW1hKCkpISk7XG4gICAgICAgICAgICBjYXNlIE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2g6IHJldHVybiBSZWNvcmRCYXRjaC5kZWNvZGUobWVzc2FnZS5oZWFkZXIobmV3IF9SZWNvcmRCYXRjaCgpKSEsIG1lc3NhZ2UudmVyc2lvbigpKTtcbiAgICAgICAgICAgIGNhc2UgTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2g6IHJldHVybiBEaWN0aW9uYXJ5QmF0Y2guZGVjb2RlKG1lc3NhZ2UuaGVhZGVyKG5ldyBfRGljdGlvbmFyeUJhdGNoKCkpISwgbWVzc2FnZS52ZXJzaW9uKCkpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5yZWNvZ25pemVkIE1lc3NhZ2UgdHlwZTogeyBuYW1lOiAke01lc3NhZ2VIZWFkZXJbdHlwZV19LCB0eXBlOiAke3R5cGV9IH1gKTtcbiAgICB9KSBhcyBNZXNzYWdlSGVhZGVyRGVjb2Rlcjtcbn1cblxuRmllbGRbJ2VuY29kZSddID0gZW5jb2RlRmllbGQ7XG5GaWVsZFsnZGVjb2RlJ10gPSBkZWNvZGVGaWVsZDtcbkZpZWxkWydmcm9tSlNPTiddID0gZmllbGRGcm9tSlNPTjtcblxuU2NoZW1hWydlbmNvZGUnXSA9IGVuY29kZVNjaGVtYTtcblNjaGVtYVsnZGVjb2RlJ10gPSBkZWNvZGVTY2hlbWE7XG5TY2hlbWFbJ2Zyb21KU09OJ10gPSBzY2hlbWFGcm9tSlNPTjtcblxuUmVjb3JkQmF0Y2hbJ2VuY29kZSddID0gZW5jb2RlUmVjb3JkQmF0Y2g7XG5SZWNvcmRCYXRjaFsnZGVjb2RlJ10gPSBkZWNvZGVSZWNvcmRCYXRjaDtcblJlY29yZEJhdGNoWydmcm9tSlNPTiddID0gcmVjb3JkQmF0Y2hGcm9tSlNPTjtcblxuRGljdGlvbmFyeUJhdGNoWydlbmNvZGUnXSA9IGVuY29kZURpY3Rpb25hcnlCYXRjaDtcbkRpY3Rpb25hcnlCYXRjaFsnZGVjb2RlJ10gPSBkZWNvZGVEaWN0aW9uYXJ5QmF0Y2g7XG5EaWN0aW9uYXJ5QmF0Y2hbJ2Zyb21KU09OJ10gPSBkaWN0aW9uYXJ5QmF0Y2hGcm9tSlNPTjtcblxuRmllbGROb2RlWydlbmNvZGUnXSA9IGVuY29kZUZpZWxkTm9kZTtcbkZpZWxkTm9kZVsnZGVjb2RlJ10gPSBkZWNvZGVGaWVsZE5vZGU7XG5cbkJ1ZmZlclJlZ2lvblsnZW5jb2RlJ10gPSBlbmNvZGVCdWZmZXJSZWdpb247XG5CdWZmZXJSZWdpb25bJ2RlY29kZSddID0gZGVjb2RlQnVmZmVyUmVnaW9uO1xuXG5kZWNsYXJlIG1vZHVsZSAnLi4vLi4vc2NoZW1hJyB7XG4gICAgbmFtZXNwYWNlIEZpZWxkIHtcbiAgICAgICAgZXhwb3J0IHsgZW5jb2RlRmllbGQgYXMgZW5jb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IGRlY29kZUZpZWxkIGFzIGRlY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBmaWVsZEZyb21KU09OIGFzIGZyb21KU09OIH07XG4gICAgfVxuICAgIG5hbWVzcGFjZSBTY2hlbWEge1xuICAgICAgICBleHBvcnQgeyBlbmNvZGVTY2hlbWEgYXMgZW5jb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IGRlY29kZVNjaGVtYSBhcyBkZWNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgc2NoZW1hRnJvbUpTT04gYXMgZnJvbUpTT04gfTtcbiAgICB9XG59XG5cbmRlY2xhcmUgbW9kdWxlICcuL21lc3NhZ2UnIHtcbiAgICBuYW1lc3BhY2UgUmVjb3JkQmF0Y2gge1xuICAgICAgICBleHBvcnQgeyBlbmNvZGVSZWNvcmRCYXRjaCBhcyBlbmNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgZGVjb2RlUmVjb3JkQmF0Y2ggYXMgZGVjb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IHJlY29yZEJhdGNoRnJvbUpTT04gYXMgZnJvbUpTT04gfTtcbiAgICB9XG4gICAgbmFtZXNwYWNlIERpY3Rpb25hcnlCYXRjaCB7XG4gICAgICAgIGV4cG9ydCB7IGVuY29kZURpY3Rpb25hcnlCYXRjaCBhcyBlbmNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgZGVjb2RlRGljdGlvbmFyeUJhdGNoIGFzIGRlY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBkaWN0aW9uYXJ5QmF0Y2hGcm9tSlNPTiBhcyBmcm9tSlNPTiB9O1xuICAgIH1cbiAgICBuYW1lc3BhY2UgRmllbGROb2RlIHtcbiAgICAgICAgZXhwb3J0IHsgZW5jb2RlRmllbGROb2RlIGFzIGVuY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBkZWNvZGVGaWVsZE5vZGUgYXMgZGVjb2RlIH07XG4gICAgfVxuICAgIG5hbWVzcGFjZSBCdWZmZXJSZWdpb24ge1xuICAgICAgICBleHBvcnQgeyBlbmNvZGVCdWZmZXJSZWdpb24gYXMgZW5jb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IGRlY29kZUJ1ZmZlclJlZ2lvbiBhcyBkZWNvZGUgfTtcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBkZWNvZGVTY2hlbWEoX3NjaGVtYTogX1NjaGVtYSwgZGljdGlvbmFyaWVzOiBNYXA8bnVtYmVyLCBEYXRhVHlwZT4gPSBuZXcgTWFwKCksIGRpY3Rpb25hcnlGaWVsZHM6IE1hcDxudW1iZXIsIEZpZWxkPERpY3Rpb25hcnk+W10+ID0gbmV3IE1hcCgpKSB7XG4gICAgY29uc3QgZmllbGRzID0gZGVjb2RlU2NoZW1hRmllbGRzKF9zY2hlbWEsIGRpY3Rpb25hcmllcywgZGljdGlvbmFyeUZpZWxkcyk7XG4gICAgcmV0dXJuIG5ldyBTY2hlbWEoZmllbGRzLCBkZWNvZGVDdXN0b21NZXRhZGF0YShfc2NoZW1hKSwgZGljdGlvbmFyaWVzLCBkaWN0aW9uYXJ5RmllbGRzKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGRlY29kZVJlY29yZEJhdGNoKGJhdGNoOiBfUmVjb3JkQmF0Y2gsIHZlcnNpb24gPSBNZXRhZGF0YVZlcnNpb24uVjQpIHtcbiAgICByZXR1cm4gbmV3IFJlY29yZEJhdGNoKGJhdGNoLmxlbmd0aCgpLCBkZWNvZGVGaWVsZE5vZGVzKGJhdGNoKSwgZGVjb2RlQnVmZmVycyhiYXRjaCwgdmVyc2lvbikpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZGVjb2RlRGljdGlvbmFyeUJhdGNoKGJhdGNoOiBfRGljdGlvbmFyeUJhdGNoLCB2ZXJzaW9uID0gTWV0YWRhdGFWZXJzaW9uLlY0KSB7XG4gICAgcmV0dXJuIG5ldyBEaWN0aW9uYXJ5QmF0Y2goUmVjb3JkQmF0Y2guZGVjb2RlKGJhdGNoLmRhdGEoKSEsIHZlcnNpb24pLCBiYXRjaC5pZCgpLCBiYXRjaC5pc0RlbHRhKCkpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZGVjb2RlQnVmZmVyUmVnaW9uKGI6IF9CdWZmZXIpIHtcbiAgICByZXR1cm4gbmV3IEJ1ZmZlclJlZ2lvbihiLm9mZnNldCgpLCBiLmxlbmd0aCgpKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGRlY29kZUZpZWxkTm9kZShmOiBfRmllbGROb2RlKSB7XG4gICAgcmV0dXJuIG5ldyBGaWVsZE5vZGUoZi5sZW5ndGgoKSwgZi5udWxsQ291bnQoKSk7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBkZWNvZGVGaWVsZE5vZGVzKGJhdGNoOiBfUmVjb3JkQmF0Y2gpIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbShcbiAgICAgICAgeyBsZW5ndGg6IGJhdGNoLm5vZGVzTGVuZ3RoKCkgfSxcbiAgICAgICAgKF8sIGkpID0+IGJhdGNoLm5vZGVzKGkpIVxuICAgICkuZmlsdGVyKEJvb2xlYW4pLm1hcChGaWVsZE5vZGUuZGVjb2RlKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGRlY29kZUJ1ZmZlcnMoYmF0Y2g6IF9SZWNvcmRCYXRjaCwgdmVyc2lvbjogTWV0YWRhdGFWZXJzaW9uKSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20oXG4gICAgICAgIHsgbGVuZ3RoOiBiYXRjaC5idWZmZXJzTGVuZ3RoKCkgfSxcbiAgICAgICAgKF8sIGkpID0+IGJhdGNoLmJ1ZmZlcnMoaSkhXG4gICAgKS5maWx0ZXIoQm9vbGVhbikubWFwKHYzQ29tcGF0KHZlcnNpb24sIEJ1ZmZlclJlZ2lvbi5kZWNvZGUpKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIHYzQ29tcGF0KHZlcnNpb246IE1ldGFkYXRhVmVyc2lvbiwgZGVjb2RlOiAoYnVmZmVyOiBfQnVmZmVyKSA9PiBCdWZmZXJSZWdpb24pIHtcbiAgICByZXR1cm4gKGJ1ZmZlcjogX0J1ZmZlciwgaTogbnVtYmVyKSA9PiB7XG4gICAgICAgIC8vIElmIHRoaXMgQXJyb3cgYnVmZmVyIHdhcyB3cml0dGVuIGJlZm9yZSB2ZXJzaW9uIDQsXG4gICAgICAgIC8vIGFkdmFuY2UgdGhlIGJ1ZmZlcidzIGJiX3BvcyA4IGJ5dGVzIHRvIHNraXAgcGFzdFxuICAgICAgICAvLyB0aGUgbm93LXJlbW92ZWQgcGFnZV9pZCBmaWVsZFxuICAgICAgICBpZiAodmVyc2lvbiA8IE1ldGFkYXRhVmVyc2lvbi5WNCkge1xuICAgICAgICAgICAgYnVmZmVyLmJiX3BvcyArPSAoOCAqIChpICsgMSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkZWNvZGUoYnVmZmVyKTtcbiAgICB9O1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZGVjb2RlU2NoZW1hRmllbGRzKHNjaGVtYTogX1NjaGVtYSwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgRGF0YVR5cGU+LCBkaWN0aW9uYXJ5RmllbGRzPzogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeT5bXT4pIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbShcbiAgICAgICAgeyBsZW5ndGg6IHNjaGVtYS5maWVsZHNMZW5ndGgoKSB9LFxuICAgICAgICAoXywgaSkgPT4gc2NoZW1hLmZpZWxkcyhpKSFcbiAgICApLmZpbHRlcihCb29sZWFuKS5tYXAoKGYpID0+IEZpZWxkLmRlY29kZShmLCBkaWN0aW9uYXJpZXMsIGRpY3Rpb25hcnlGaWVsZHMpKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGRlY29kZUZpZWxkQ2hpbGRyZW4oZmllbGQ6IF9GaWVsZCwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgRGF0YVR5cGU+LCBkaWN0aW9uYXJ5RmllbGRzPzogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeT5bXT4pOiBGaWVsZFtdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbShcbiAgICAgICAgeyBsZW5ndGg6IGZpZWxkLmNoaWxkcmVuTGVuZ3RoKCkgfSxcbiAgICAgICAgKF8sIGkpID0+IGZpZWxkLmNoaWxkcmVuKGkpIVxuICAgICkuZmlsdGVyKEJvb2xlYW4pLm1hcCgoZikgPT4gRmllbGQuZGVjb2RlKGYsIGRpY3Rpb25hcmllcywgZGljdGlvbmFyeUZpZWxkcykpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZGVjb2RlRmllbGQoZjogX0ZpZWxkLCBkaWN0aW9uYXJpZXM/OiBNYXA8bnVtYmVyLCBEYXRhVHlwZT4sIGRpY3Rpb25hcnlGaWVsZHM/OiBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5PltdPikge1xuXG4gICAgbGV0IGlkOiBudW1iZXI7XG4gICAgbGV0IGZpZWxkOiBGaWVsZCB8IHZvaWQ7XG4gICAgbGV0IHR5cGU6IERhdGFUeXBlPGFueT47XG4gICAgbGV0IGtleXM6IF9JbnQgfCBUS2V5cyB8IG51bGw7XG4gICAgbGV0IGRpY3RUeXBlOiBEaWN0aW9uYXJ5O1xuICAgIGxldCBkaWN0TWV0YTogX0RpY3Rpb25hcnlFbmNvZGluZyB8IG51bGw7XG4gICAgbGV0IGRpY3RGaWVsZDogRmllbGQ8RGljdGlvbmFyeT47XG5cbiAgICAvLyBJZiBubyBkaWN0aW9uYXJ5IGVuY29kaW5nLCBvciBpbiB0aGUgcHJvY2VzcyBvZiBkZWNvZGluZyB0aGUgY2hpbGRyZW4gb2YgYSBkaWN0aW9uYXJ5LWVuY29kZWQgZmllbGRcbiAgICBpZiAoIWRpY3Rpb25hcmllcyB8fCAhZGljdGlvbmFyeUZpZWxkcyB8fCAhKGRpY3RNZXRhID0gZi5kaWN0aW9uYXJ5KCkpKSB7XG4gICAgICAgIHR5cGUgPSBkZWNvZGVGaWVsZFR5cGUoZiwgZGVjb2RlRmllbGRDaGlsZHJlbihmLCBkaWN0aW9uYXJpZXMsIGRpY3Rpb25hcnlGaWVsZHMpKTtcbiAgICAgICAgZmllbGQgPSBuZXcgRmllbGQoZi5uYW1lKCkhLCB0eXBlLCBmLm51bGxhYmxlKCksIGRlY29kZUN1c3RvbU1ldGFkYXRhKGYpKTtcbiAgICB9XG4gICAgLy8gdHNsaW50OmRpc2FibGVcbiAgICAvLyBJZiBkaWN0aW9uYXJ5IGVuY29kZWQgYW5kIHRoZSBmaXJzdCB0aW1lIHdlJ3ZlIHNlZW4gdGhpcyBkaWN0aW9uYXJ5IGlkLCBkZWNvZGVcbiAgICAvLyB0aGUgZGF0YSB0eXBlIGFuZCBjaGlsZCBmaWVsZHMsIHRoZW4gd3JhcCBpbiBhIERpY3Rpb25hcnkgdHlwZSBhbmQgaW5zZXJ0IHRoZVxuICAgIC8vIGRhdGEgdHlwZSBpbnRvIHRoZSBkaWN0aW9uYXJ5IHR5cGVzIG1hcC5cbiAgICBlbHNlIGlmICghZGljdGlvbmFyaWVzLmhhcyhpZCA9IGRpY3RNZXRhLmlkKCkubG93KSkge1xuICAgICAgICAvLyBhIGRpY3Rpb25hcnkgaW5kZXggZGVmYXVsdHMgdG8gc2lnbmVkIDMyIGJpdCBpbnQgaWYgdW5zcGVjaWZpZWRcbiAgICAgICAga2V5cyA9IChrZXlzID0gZGljdE1ldGEuaW5kZXhUeXBlKCkpID8gZGVjb2RlSW5kZXhUeXBlKGtleXMpIGFzIFRLZXlzIDogbmV3IEludDMyKCk7XG4gICAgICAgIGRpY3Rpb25hcmllcy5zZXQoaWQsIHR5cGUgPSBkZWNvZGVGaWVsZFR5cGUoZiwgZGVjb2RlRmllbGRDaGlsZHJlbihmKSkpO1xuICAgICAgICBkaWN0VHlwZSA9IG5ldyBEaWN0aW9uYXJ5KHR5cGUsIGtleXMsIGlkLCBkaWN0TWV0YS5pc09yZGVyZWQoKSk7XG4gICAgICAgIGRpY3RGaWVsZCA9IG5ldyBGaWVsZChmLm5hbWUoKSEsIGRpY3RUeXBlLCBmLm51bGxhYmxlKCksIGRlY29kZUN1c3RvbU1ldGFkYXRhKGYpKTtcbiAgICAgICAgZGljdGlvbmFyeUZpZWxkcy5zZXQoaWQsIFtmaWVsZCA9IGRpY3RGaWVsZF0pO1xuICAgIH1cbiAgICAvLyBJZiBkaWN0aW9uYXJ5IGVuY29kZWQsIGFuZCBoYXZlIGFscmVhZHkgc2VlbiB0aGlzIGRpY3Rpb25hcnkgSWQgaW4gdGhlIHNjaGVtYSwgdGhlbiByZXVzZSB0aGVcbiAgICAvLyBkYXRhIHR5cGUgYW5kIHdyYXAgaW4gYSBuZXcgRGljdGlvbmFyeSB0eXBlIGFuZCBmaWVsZC5cbiAgICBlbHNlIHtcbiAgICAgICAgLy8gYSBkaWN0aW9uYXJ5IGluZGV4IGRlZmF1bHRzIHRvIHNpZ25lZCAzMiBiaXQgaW50IGlmIHVuc3BlY2lmaWVkXG4gICAgICAgIGtleXMgPSAoa2V5cyA9IGRpY3RNZXRhLmluZGV4VHlwZSgpKSA/IGRlY29kZUluZGV4VHlwZShrZXlzKSBhcyBUS2V5cyA6IG5ldyBJbnQzMigpO1xuICAgICAgICBkaWN0VHlwZSA9IG5ldyBEaWN0aW9uYXJ5KGRpY3Rpb25hcmllcy5nZXQoaWQpISwga2V5cywgaWQsIGRpY3RNZXRhLmlzT3JkZXJlZCgpKTtcbiAgICAgICAgZGljdEZpZWxkID0gbmV3IEZpZWxkKGYubmFtZSgpISwgZGljdFR5cGUsIGYubnVsbGFibGUoKSwgZGVjb2RlQ3VzdG9tTWV0YWRhdGEoZikpO1xuICAgICAgICBkaWN0aW9uYXJ5RmllbGRzLmdldChpZCkhLnB1c2goZmllbGQgPSBkaWN0RmllbGQpO1xuICAgIH1cbiAgICByZXR1cm4gZmllbGQgfHwgbnVsbDtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGRlY29kZUN1c3RvbU1ldGFkYXRhKHBhcmVudD86IF9TY2hlbWEgfCBfRmllbGQgfCBudWxsKSB7XG4gICAgY29uc3QgZGF0YSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgaWYgKHBhcmVudCkge1xuICAgICAgICBmb3IgKGxldCBlbnRyeSwga2V5LCBpID0gLTEsIG4gPSBwYXJlbnQuY3VzdG9tTWV0YWRhdGFMZW5ndGgoKSB8IDA7ICsraSA8IG47KSB7XG4gICAgICAgICAgICBpZiAoKGVudHJ5ID0gcGFyZW50LmN1c3RvbU1ldGFkYXRhKGkpKSAmJiAoa2V5ID0gZW50cnkua2V5KCkpICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBkYXRhLnNldChrZXksIGVudHJ5LnZhbHVlKCkhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGRlY29kZUluZGV4VHlwZShfdHlwZTogX0ludCkge1xuICAgIHJldHVybiBuZXcgSW50KF90eXBlLmlzU2lnbmVkKCksIF90eXBlLmJpdFdpZHRoKCkgYXMgSW50Qml0V2lkdGgpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZGVjb2RlRmllbGRUeXBlKGY6IF9GaWVsZCwgY2hpbGRyZW4/OiBGaWVsZFtdKTogRGF0YVR5cGU8YW55PiB7XG5cbiAgICBjb25zdCB0eXBlSWQgPSBmLnR5cGVUeXBlKCk7XG5cbiAgICBzd2l0Y2ggKHR5cGVJZCkge1xuICAgICAgICBjYXNlIFR5cGUuTk9ORTogICAgcmV0dXJuIG5ldyBEYXRhVHlwZSgpO1xuICAgICAgICBjYXNlIFR5cGUuTnVsbDogICAgcmV0dXJuIG5ldyBOdWxsKCk7XG4gICAgICAgIGNhc2UgVHlwZS5CaW5hcnk6ICByZXR1cm4gbmV3IEJpbmFyeSgpO1xuICAgICAgICBjYXNlIFR5cGUuVXRmODogICAgcmV0dXJuIG5ldyBVdGY4KCk7XG4gICAgICAgIGNhc2UgVHlwZS5Cb29sOiAgICByZXR1cm4gbmV3IEJvb2woKTtcbiAgICAgICAgY2FzZSBUeXBlLkxpc3Q6ICAgIHJldHVybiBuZXcgTGlzdCgoY2hpbGRyZW4gfHwgW10pWzBdKTtcbiAgICAgICAgY2FzZSBUeXBlLlN0cnVjdF86IHJldHVybiBuZXcgU3RydWN0KGNoaWxkcmVuIHx8IFtdKTtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKHR5cGVJZCkge1xuICAgICAgICBjYXNlIFR5cGUuSW50OiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5JbnQoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBJbnQodC5pc1NpZ25lZCgpLCB0LmJpdFdpZHRoKCkpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5GbG9hdGluZ1BvaW50OiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GbG9hdGluZ1BvaW50KCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRmxvYXQodC5wcmVjaXNpb24oKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLkRlY2ltYWw6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRlY2ltYWwoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBEZWNpbWFsKHQuc2NhbGUoKSwgdC5wcmVjaXNpb24oKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLkRhdGU6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRhdGUoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBEYXRlXyh0LnVuaXQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLlRpbWU6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlRpbWUoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBUaW1lKHQudW5pdCgpLCB0LmJpdFdpZHRoKCkgYXMgVGltZUJpdFdpZHRoKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuVGltZXN0YW1wOiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UaW1lc3RhbXAoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBUaW1lc3RhbXAodC51bml0KCksIHQudGltZXpvbmUoKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLkludGVydmFsOiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5JbnRlcnZhbCgpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEludGVydmFsKHQudW5pdCgpKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuVW5pb246IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlVuaW9uKCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgVW5pb24odC5tb2RlKCksIHQudHlwZUlkc0FycmF5KCkgfHwgW10sIGNoaWxkcmVuIHx8IFtdKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuRml4ZWRTaXplQmluYXJ5OiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaXhlZFNpemVCaW5hcnkoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBGaXhlZFNpemVCaW5hcnkodC5ieXRlV2lkdGgoKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLkZpeGVkU2l6ZUxpc3Q6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpeGVkU2l6ZUxpc3QoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBGaXhlZFNpemVMaXN0KHQubGlzdFNpemUoKSwgKGNoaWxkcmVuIHx8IFtdKVswXSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLk1hcDoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTWFwKCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgTWFwXyhjaGlsZHJlbiB8fCBbXSwgdC5rZXlzU29ydGVkKCkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgVW5yZWNvZ25pemVkIHR5cGU6IFwiJHtUeXBlW3R5cGVJZF19XCIgKCR7dHlwZUlkfSlgKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGVuY29kZVNjaGVtYShiOiBCdWlsZGVyLCBzY2hlbWE6IFNjaGVtYSkge1xuXG4gICAgY29uc3QgZmllbGRPZmZzZXRzID0gc2NoZW1hLmZpZWxkcy5tYXAoKGYpID0+IEZpZWxkLmVuY29kZShiLCBmKSk7XG5cbiAgICBfU2NoZW1hLnN0YXJ0RmllbGRzVmVjdG9yKGIsIGZpZWxkT2Zmc2V0cy5sZW5ndGgpO1xuXG4gICAgY29uc3QgZmllbGRzVmVjdG9yT2Zmc2V0ID0gX1NjaGVtYS5jcmVhdGVGaWVsZHNWZWN0b3IoYiwgZmllbGRPZmZzZXRzKTtcblxuICAgIGNvbnN0IG1ldGFkYXRhT2Zmc2V0ID0gIShzY2hlbWEubWV0YWRhdGEgJiYgc2NoZW1hLm1ldGFkYXRhLnNpemUgPiAwKSA/IC0xIDpcbiAgICAgICAgX1NjaGVtYS5jcmVhdGVDdXN0b21NZXRhZGF0YVZlY3RvcihiLCBbLi4uc2NoZW1hLm1ldGFkYXRhXS5tYXAoKFtrLCB2XSkgPT4ge1xuICAgICAgICAgICAgY29uc3Qga2V5ID0gYi5jcmVhdGVTdHJpbmcoYCR7a31gKTtcbiAgICAgICAgICAgIGNvbnN0IHZhbCA9IGIuY3JlYXRlU3RyaW5nKGAke3Z9YCk7XG4gICAgICAgICAgICBfS2V5VmFsdWUuc3RhcnRLZXlWYWx1ZShiKTtcbiAgICAgICAgICAgIF9LZXlWYWx1ZS5hZGRLZXkoYiwga2V5KTtcbiAgICAgICAgICAgIF9LZXlWYWx1ZS5hZGRWYWx1ZShiLCB2YWwpO1xuICAgICAgICAgICAgcmV0dXJuIF9LZXlWYWx1ZS5lbmRLZXlWYWx1ZShiKTtcbiAgICAgICAgfSkpO1xuXG4gICAgX1NjaGVtYS5zdGFydFNjaGVtYShiKTtcbiAgICBfU2NoZW1hLmFkZEZpZWxkcyhiLCBmaWVsZHNWZWN0b3JPZmZzZXQpO1xuICAgIF9TY2hlbWEuYWRkRW5kaWFubmVzcyhiLCBwbGF0Zm9ybUlzTGl0dGxlRW5kaWFuID8gX0VuZGlhbm5lc3MuTGl0dGxlIDogX0VuZGlhbm5lc3MuQmlnKTtcblxuICAgIGlmIChtZXRhZGF0YU9mZnNldCAhPT0gLTEpIHsgX1NjaGVtYS5hZGRDdXN0b21NZXRhZGF0YShiLCBtZXRhZGF0YU9mZnNldCk7IH1cblxuICAgIHJldHVybiBfU2NoZW1hLmVuZFNjaGVtYShiKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGVuY29kZUZpZWxkKGI6IEJ1aWxkZXIsIGZpZWxkOiBGaWVsZCkge1xuXG4gICAgbGV0IG5hbWVPZmZzZXQgPSAtMTtcbiAgICBsZXQgdHlwZU9mZnNldCA9IC0xO1xuICAgIGxldCBkaWN0aW9uYXJ5T2Zmc2V0ID0gLTE7XG5cbiAgICBsZXQgdHlwZSA9IGZpZWxkLnR5cGU7XG4gICAgbGV0IHR5cGVJZDogVHlwZSA9IDxhbnk+IGZpZWxkLnR5cGVJZDtcblxuICAgIGlmICghRGF0YVR5cGUuaXNEaWN0aW9uYXJ5KHR5cGUpKSB7XG4gICAgICAgIHR5cGVPZmZzZXQgPSB0eXBlQXNzZW1ibGVyLnZpc2l0KHR5cGUsIGIpITtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0eXBlSWQgPSB0eXBlLmRpY3Rpb25hcnkudHlwZUlkO1xuICAgICAgICBkaWN0aW9uYXJ5T2Zmc2V0ID0gdHlwZUFzc2VtYmxlci52aXNpdCh0eXBlLCBiKSE7XG4gICAgICAgIHR5cGVPZmZzZXQgPSB0eXBlQXNzZW1ibGVyLnZpc2l0KHR5cGUuZGljdGlvbmFyeSwgYikhO1xuICAgIH1cblxuICAgIGNvbnN0IGNoaWxkT2Zmc2V0cyA9ICh0eXBlLmNoaWxkcmVuIHx8IFtdKS5tYXAoKGY6IEZpZWxkKSA9PiBGaWVsZC5lbmNvZGUoYiwgZikpO1xuICAgIGNvbnN0IGNoaWxkcmVuVmVjdG9yT2Zmc2V0ID0gX0ZpZWxkLmNyZWF0ZUNoaWxkcmVuVmVjdG9yKGIsIGNoaWxkT2Zmc2V0cyk7XG5cbiAgICBjb25zdCBtZXRhZGF0YU9mZnNldCA9ICEoZmllbGQubWV0YWRhdGEgJiYgZmllbGQubWV0YWRhdGEuc2l6ZSA+IDApID8gLTEgOlxuICAgICAgICBfRmllbGQuY3JlYXRlQ3VzdG9tTWV0YWRhdGFWZWN0b3IoYiwgWy4uLmZpZWxkLm1ldGFkYXRhXS5tYXAoKFtrLCB2XSkgPT4ge1xuICAgICAgICAgICAgY29uc3Qga2V5ID0gYi5jcmVhdGVTdHJpbmcoYCR7a31gKTtcbiAgICAgICAgICAgIGNvbnN0IHZhbCA9IGIuY3JlYXRlU3RyaW5nKGAke3Z9YCk7XG4gICAgICAgICAgICBfS2V5VmFsdWUuc3RhcnRLZXlWYWx1ZShiKTtcbiAgICAgICAgICAgIF9LZXlWYWx1ZS5hZGRLZXkoYiwga2V5KTtcbiAgICAgICAgICAgIF9LZXlWYWx1ZS5hZGRWYWx1ZShiLCB2YWwpO1xuICAgICAgICAgICAgcmV0dXJuIF9LZXlWYWx1ZS5lbmRLZXlWYWx1ZShiKTtcbiAgICAgICAgfSkpO1xuXG4gICAgaWYgKGZpZWxkLm5hbWUpIHtcbiAgICAgICAgbmFtZU9mZnNldCA9IGIuY3JlYXRlU3RyaW5nKGZpZWxkLm5hbWUpO1xuICAgIH1cblxuICAgIF9GaWVsZC5zdGFydEZpZWxkKGIpO1xuICAgIF9GaWVsZC5hZGRUeXBlKGIsIHR5cGVPZmZzZXQpO1xuICAgIF9GaWVsZC5hZGRUeXBlVHlwZShiLCB0eXBlSWQpO1xuICAgIF9GaWVsZC5hZGRDaGlsZHJlbihiLCBjaGlsZHJlblZlY3Rvck9mZnNldCk7XG4gICAgX0ZpZWxkLmFkZE51bGxhYmxlKGIsICEhZmllbGQubnVsbGFibGUpO1xuXG4gICAgaWYgKG5hbWVPZmZzZXQgIT09IC0xKSB7IF9GaWVsZC5hZGROYW1lKGIsIG5hbWVPZmZzZXQpOyB9XG4gICAgaWYgKGRpY3Rpb25hcnlPZmZzZXQgIT09IC0xKSB7IF9GaWVsZC5hZGREaWN0aW9uYXJ5KGIsIGRpY3Rpb25hcnlPZmZzZXQpOyB9XG4gICAgaWYgKG1ldGFkYXRhT2Zmc2V0ICE9PSAtMSkgeyBfRmllbGQuYWRkQ3VzdG9tTWV0YWRhdGEoYiwgbWV0YWRhdGFPZmZzZXQpOyB9XG5cbiAgICByZXR1cm4gX0ZpZWxkLmVuZEZpZWxkKGIpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZW5jb2RlUmVjb3JkQmF0Y2goYjogQnVpbGRlciwgcmVjb3JkQmF0Y2g6IFJlY29yZEJhdGNoKSB7XG5cbiAgICBjb25zdCBub2RlcyA9IHJlY29yZEJhdGNoLm5vZGVzIHx8IFtdO1xuICAgIGNvbnN0IGJ1ZmZlcnMgPSByZWNvcmRCYXRjaC5idWZmZXJzIHx8IFtdO1xuXG4gICAgX1JlY29yZEJhdGNoLnN0YXJ0Tm9kZXNWZWN0b3IoYiwgbm9kZXMubGVuZ3RoKTtcbiAgICBub2Rlcy5zbGljZSgpLnJldmVyc2UoKS5mb3JFYWNoKChuKSA9PiBGaWVsZE5vZGUuZW5jb2RlKGIsIG4pKTtcblxuICAgIGNvbnN0IG5vZGVzVmVjdG9yT2Zmc2V0ID0gYi5lbmRWZWN0b3IoKTtcblxuICAgIF9SZWNvcmRCYXRjaC5zdGFydEJ1ZmZlcnNWZWN0b3IoYiwgYnVmZmVycy5sZW5ndGgpO1xuICAgIGJ1ZmZlcnMuc2xpY2UoKS5yZXZlcnNlKCkuZm9yRWFjaCgoYl8pID0+IEJ1ZmZlclJlZ2lvbi5lbmNvZGUoYiwgYl8pKTtcblxuICAgIGNvbnN0IGJ1ZmZlcnNWZWN0b3JPZmZzZXQgPSBiLmVuZFZlY3RvcigpO1xuXG4gICAgX1JlY29yZEJhdGNoLnN0YXJ0UmVjb3JkQmF0Y2goYik7XG4gICAgX1JlY29yZEJhdGNoLmFkZExlbmd0aChiLCBuZXcgTG9uZyhyZWNvcmRCYXRjaC5sZW5ndGgsIDApKTtcbiAgICBfUmVjb3JkQmF0Y2guYWRkTm9kZXMoYiwgbm9kZXNWZWN0b3JPZmZzZXQpO1xuICAgIF9SZWNvcmRCYXRjaC5hZGRCdWZmZXJzKGIsIGJ1ZmZlcnNWZWN0b3JPZmZzZXQpO1xuICAgIHJldHVybiBfUmVjb3JkQmF0Y2guZW5kUmVjb3JkQmF0Y2goYik7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBlbmNvZGVEaWN0aW9uYXJ5QmF0Y2goYjogQnVpbGRlciwgZGljdGlvbmFyeUJhdGNoOiBEaWN0aW9uYXJ5QmF0Y2gpIHtcbiAgICBjb25zdCBkYXRhT2Zmc2V0ID0gUmVjb3JkQmF0Y2guZW5jb2RlKGIsIGRpY3Rpb25hcnlCYXRjaC5kYXRhKTtcbiAgICBfRGljdGlvbmFyeUJhdGNoLnN0YXJ0RGljdGlvbmFyeUJhdGNoKGIpO1xuICAgIF9EaWN0aW9uYXJ5QmF0Y2guYWRkSWQoYiwgbmV3IExvbmcoZGljdGlvbmFyeUJhdGNoLmlkLCAwKSk7XG4gICAgX0RpY3Rpb25hcnlCYXRjaC5hZGRJc0RlbHRhKGIsIGRpY3Rpb25hcnlCYXRjaC5pc0RlbHRhKTtcbiAgICBfRGljdGlvbmFyeUJhdGNoLmFkZERhdGEoYiwgZGF0YU9mZnNldCk7XG4gICAgcmV0dXJuIF9EaWN0aW9uYXJ5QmF0Y2guZW5kRGljdGlvbmFyeUJhdGNoKGIpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZW5jb2RlRmllbGROb2RlKGI6IEJ1aWxkZXIsIG5vZGU6IEZpZWxkTm9kZSkge1xuICAgIHJldHVybiBfRmllbGROb2RlLmNyZWF0ZUZpZWxkTm9kZShiLCBuZXcgTG9uZyhub2RlLmxlbmd0aCwgMCksIG5ldyBMb25nKG5vZGUubnVsbENvdW50LCAwKSk7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBlbmNvZGVCdWZmZXJSZWdpb24oYjogQnVpbGRlciwgbm9kZTogQnVmZmVyUmVnaW9uKSB7XG4gICAgcmV0dXJuIF9CdWZmZXIuY3JlYXRlQnVmZmVyKGIsIG5ldyBMb25nKG5vZGUub2Zmc2V0LCAwKSwgbmV3IExvbmcobm9kZS5sZW5ndGgsIDApKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmNvbnN0IHBsYXRmb3JtSXNMaXR0bGVFbmRpYW4gPSAoZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKDIpO1xuICAgIG5ldyBEYXRhVmlldyhidWZmZXIpLnNldEludDE2KDAsIDI1NiwgdHJ1ZSAvKiBsaXR0bGVFbmRpYW4gKi8pO1xuICAgIC8vIEludDE2QXJyYXkgdXNlcyB0aGUgcGxhdGZvcm0ncyBlbmRpYW5uZXNzLlxuICAgIHJldHVybiBuZXcgSW50MTZBcnJheShidWZmZXIpWzBdID09PSAyNTY7XG59KSgpO1xuXG4vKiogQGlnbm9yZSAqL1xudHlwZSBNZXNzYWdlSGVhZGVyRGVjb2RlciA9IDxUIGV4dGVuZHMgTWVzc2FnZUhlYWRlcj4oKSA9PiBUIGV4dGVuZHMgTWVzc2FnZUhlYWRlci5TY2hlbWEgPyBTY2hlbWFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogVCBleHRlbmRzIE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2ggPyBSZWNvcmRCYXRjaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBUIGV4dGVuZHMgTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2ggPyBEaWN0aW9uYXJ5QmF0Y2ggOiBuZXZlcjtcbiJdfQ==

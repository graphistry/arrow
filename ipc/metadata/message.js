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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQyxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUMvRCw2Q0FBNkM7SUFDN0MsT0FBTyxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUM7QUFDN0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyIsImZpbGUiOiJpcGMvbWV0YWRhdGEvbWVzc2FnZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBmbGF0YnVmZmVycyB9IGZyb20gJ2ZsYXRidWZmZXJzJztcbmltcG9ydCAqIGFzIFNjaGVtYV8gZnJvbSAnLi4vLi4vZmIvU2NoZW1hJztcbmltcG9ydCAqIGFzIE1lc3NhZ2VfIGZyb20gJy4uLy4uL2ZiL01lc3NhZ2UnO1xuXG5pbXBvcnQgeyBTY2hlbWEsIEZpZWxkIH0gZnJvbSAnLi4vLi4vc2NoZW1hJztcbmltcG9ydCB7IHRvVWludDhBcnJheSB9IGZyb20gJy4uLy4uL3V0aWwvYnVmZmVyJztcbmltcG9ydCB7IEFycmF5QnVmZmVyVmlld0lucHV0IH0gZnJvbSAnLi4vLi4vdXRpbC9idWZmZXInO1xuaW1wb3J0IHsgTWVzc2FnZUhlYWRlciwgTWV0YWRhdGFWZXJzaW9uIH0gZnJvbSAnLi4vLi4vZW51bSc7XG5pbXBvcnQgeyBpbnN0YW5jZSBhcyB0eXBlQXNzZW1ibGVyIH0gZnJvbSAnLi4vLi4vdmlzaXRvci90eXBlYXNzZW1ibGVyJztcbmltcG9ydCB7IGZpZWxkRnJvbUpTT04sIHNjaGVtYUZyb21KU09OLCByZWNvcmRCYXRjaEZyb21KU09OLCBkaWN0aW9uYXJ5QmF0Y2hGcm9tSlNPTiB9IGZyb20gJy4vanNvbic7XG5cbmltcG9ydCBMb25nID0gZmxhdGJ1ZmZlcnMuTG9uZztcbmltcG9ydCBCdWlsZGVyID0gZmxhdGJ1ZmZlcnMuQnVpbGRlcjtcbmltcG9ydCBCeXRlQnVmZmVyID0gZmxhdGJ1ZmZlcnMuQnl0ZUJ1ZmZlcjtcbmltcG9ydCBfSW50ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuSW50O1xuaW1wb3J0IFR5cGUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UeXBlO1xuaW1wb3J0IF9GaWVsZCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpZWxkO1xuaW1wb3J0IF9TY2hlbWEgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5TY2hlbWE7XG5pbXBvcnQgX0J1ZmZlciA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkJ1ZmZlcjtcbmltcG9ydCBfTWVzc2FnZSA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NZXNzYWdlO1xuaW1wb3J0IF9LZXlWYWx1ZSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLktleVZhbHVlO1xuaW1wb3J0IF9GaWVsZE5vZGUgPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRmllbGROb2RlO1xuaW1wb3J0IF9FbmRpYW5uZXNzID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRW5kaWFubmVzcztcbmltcG9ydCBfUmVjb3JkQmF0Y2ggPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuUmVjb3JkQmF0Y2g7XG5pbXBvcnQgX0RpY3Rpb25hcnlCYXRjaCA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EaWN0aW9uYXJ5QmF0Y2g7XG5pbXBvcnQgX0RpY3Rpb25hcnlFbmNvZGluZyA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRpY3Rpb25hcnlFbmNvZGluZztcblxuaW1wb3J0IHtcbiAgICBEYXRhVHlwZSwgRGljdGlvbmFyeSwgVGltZUJpdFdpZHRoLFxuICAgIFV0ZjgsIEJpbmFyeSwgRGVjaW1hbCwgRml4ZWRTaXplQmluYXJ5LFxuICAgIExpc3QsIEZpeGVkU2l6ZUxpc3QsIE1hcF8sIFN0cnVjdCwgVW5pb24sXG4gICAgQm9vbCwgTnVsbCwgSW50LCBGbG9hdCwgRGF0ZV8sIFRpbWUsIEludGVydmFsLCBUaW1lc3RhbXAsIEludEJpdFdpZHRoLCBJbnQzMiwgVEtleXMsXG59IGZyb20gJy4uLy4uL3R5cGUnO1xuXG4vKipcbiAqIEBpZ25vcmVcbiAqL1xuZXhwb3J0IGNsYXNzIE1lc3NhZ2U8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXIgPSBhbnk+IHtcblxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbUpTT048VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KG1zZzogYW55LCBoZWFkZXJUeXBlOiBUKTogTWVzc2FnZTxUPiB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBuZXcgTWVzc2FnZSgwLCBNZXRhZGF0YVZlcnNpb24uVjQsIGhlYWRlclR5cGUpO1xuICAgICAgICBtZXNzYWdlLl9jcmVhdGVIZWFkZXIgPSBtZXNzYWdlSGVhZGVyRnJvbUpTT04obXNnLCBoZWFkZXJUeXBlKTtcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgfVxuXG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBkZWNvZGUoYnVmOiBBcnJheUJ1ZmZlclZpZXdJbnB1dCkge1xuICAgICAgICBidWYgPSBuZXcgQnl0ZUJ1ZmZlcih0b1VpbnQ4QXJyYXkoYnVmKSk7XG4gICAgICAgIGNvbnN0IF9tZXNzYWdlID0gX01lc3NhZ2UuZ2V0Um9vdEFzTWVzc2FnZShidWYpO1xuICAgICAgICBjb25zdCBib2R5TGVuZ3RoOiBMb25nID0gX21lc3NhZ2UuYm9keUxlbmd0aCgpITtcbiAgICAgICAgY29uc3QgdmVyc2lvbjogTWV0YWRhdGFWZXJzaW9uID0gX21lc3NhZ2UudmVyc2lvbigpO1xuICAgICAgICBjb25zdCBoZWFkZXJUeXBlOiBNZXNzYWdlSGVhZGVyID0gX21lc3NhZ2UuaGVhZGVyVHlwZSgpO1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gbmV3IE1lc3NhZ2UoYm9keUxlbmd0aCwgdmVyc2lvbiwgaGVhZGVyVHlwZSk7XG4gICAgICAgIG1lc3NhZ2UuX2NyZWF0ZUhlYWRlciA9IGRlY29kZU1lc3NhZ2VIZWFkZXIoX21lc3NhZ2UsIGhlYWRlclR5cGUpO1xuICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICB9XG5cbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGVuY29kZTxUIGV4dGVuZHMgTWVzc2FnZUhlYWRlcj4obWVzc2FnZTogTWVzc2FnZTxUPikge1xuICAgICAgICBsZXQgYiA9IG5ldyBCdWlsZGVyKCksIGhlYWRlck9mZnNldCA9IC0xO1xuICAgICAgICBpZiAobWVzc2FnZS5pc1NjaGVtYSgpKSB7XG4gICAgICAgICAgICBoZWFkZXJPZmZzZXQgPSBTY2hlbWEuZW5jb2RlKGIsIG1lc3NhZ2UuaGVhZGVyKCkgYXMgU2NoZW1hKTtcbiAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmlzUmVjb3JkQmF0Y2goKSkge1xuICAgICAgICAgICAgaGVhZGVyT2Zmc2V0ID0gUmVjb3JkQmF0Y2guZW5jb2RlKGIsIG1lc3NhZ2UuaGVhZGVyKCkgYXMgUmVjb3JkQmF0Y2gpO1xuICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuaXNEaWN0aW9uYXJ5QmF0Y2goKSkge1xuICAgICAgICAgICAgaGVhZGVyT2Zmc2V0ID0gRGljdGlvbmFyeUJhdGNoLmVuY29kZShiLCBtZXNzYWdlLmhlYWRlcigpIGFzIERpY3Rpb25hcnlCYXRjaCk7XG4gICAgICAgIH1cbiAgICAgICAgX01lc3NhZ2Uuc3RhcnRNZXNzYWdlKGIpO1xuICAgICAgICBfTWVzc2FnZS5hZGRWZXJzaW9uKGIsIE1ldGFkYXRhVmVyc2lvbi5WNCk7XG4gICAgICAgIF9NZXNzYWdlLmFkZEhlYWRlcihiLCBoZWFkZXJPZmZzZXQpO1xuICAgICAgICBfTWVzc2FnZS5hZGRIZWFkZXJUeXBlKGIsIG1lc3NhZ2UuaGVhZGVyVHlwZSk7XG4gICAgICAgIF9NZXNzYWdlLmFkZEJvZHlMZW5ndGgoYiwgbmV3IExvbmcobWVzc2FnZS5ib2R5TGVuZ3RoLCAwKSk7XG4gICAgICAgIF9NZXNzYWdlLmZpbmlzaE1lc3NhZ2VCdWZmZXIoYiwgX01lc3NhZ2UuZW5kTWVzc2FnZShiKSk7XG4gICAgICAgIHJldHVybiBiLmFzVWludDhBcnJheSgpO1xuICAgIH1cblxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbShoZWFkZXI6IFNjaGVtYSB8IFJlY29yZEJhdGNoIHwgRGljdGlvbmFyeUJhdGNoLCBib2R5TGVuZ3RoID0gMCkge1xuICAgICAgICBpZiAoaGVhZGVyIGluc3RhbmNlb2YgU2NoZW1hKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1lc3NhZ2UoMCwgTWV0YWRhdGFWZXJzaW9uLlY0LCBNZXNzYWdlSGVhZGVyLlNjaGVtYSwgaGVhZGVyKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGVhZGVyIGluc3RhbmNlb2YgUmVjb3JkQmF0Y2gpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgTWVzc2FnZShib2R5TGVuZ3RoLCBNZXRhZGF0YVZlcnNpb24uVjQsIE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2gsIGhlYWRlcik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhlYWRlciBpbnN0YW5jZW9mIERpY3Rpb25hcnlCYXRjaCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNZXNzYWdlKGJvZHlMZW5ndGgsIE1ldGFkYXRhVmVyc2lvbi5WNCwgTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2gsIGhlYWRlcik7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnJlY29nbml6ZWQgTWVzc2FnZSBoZWFkZXI6ICR7aGVhZGVyfWApO1xuICAgIH1cblxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgYm9keTogVWludDhBcnJheTtcbiAgICBwcm90ZWN0ZWQgX2hlYWRlclR5cGU6IFQ7XG4gICAgcHJvdGVjdGVkIF9ib2R5TGVuZ3RoOiBudW1iZXI7XG4gICAgcHJvdGVjdGVkIF92ZXJzaW9uOiBNZXRhZGF0YVZlcnNpb247XG4gICAgcHVibGljIGdldCB0eXBlKCkgeyByZXR1cm4gdGhpcy5oZWFkZXJUeXBlOyB9XG4gICAgcHVibGljIGdldCB2ZXJzaW9uKCkgeyByZXR1cm4gdGhpcy5fdmVyc2lvbjsgfVxuICAgIHB1YmxpYyBnZXQgaGVhZGVyVHlwZSgpIHsgcmV0dXJuIHRoaXMuX2hlYWRlclR5cGU7IH1cbiAgICBwdWJsaWMgZ2V0IGJvZHlMZW5ndGgoKSB7IHJldHVybiB0aGlzLl9ib2R5TGVuZ3RoOyB9XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHByb3RlY3RlZCBfY3JlYXRlSGVhZGVyOiBNZXNzYWdlSGVhZGVyRGVjb2RlcjtcbiAgICBwdWJsaWMgaGVhZGVyKCkgeyByZXR1cm4gdGhpcy5fY3JlYXRlSGVhZGVyPFQ+KCk7IH1cbiAgICBwdWJsaWMgaXNTY2hlbWEoKTogdGhpcyBpcyBNZXNzYWdlPE1lc3NhZ2VIZWFkZXIuU2NoZW1hPiB7IHJldHVybiB0aGlzLmhlYWRlclR5cGUgPT09IE1lc3NhZ2VIZWFkZXIuU2NoZW1hOyB9XG4gICAgcHVibGljIGlzUmVjb3JkQmF0Y2goKTogdGhpcyBpcyBNZXNzYWdlPE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2g+IHsgcmV0dXJuIHRoaXMuaGVhZGVyVHlwZSA9PT0gTWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaDsgfVxuICAgIHB1YmxpYyBpc0RpY3Rpb25hcnlCYXRjaCgpOiB0aGlzIGlzIE1lc3NhZ2U8TWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2g+IHsgcmV0dXJuIHRoaXMuaGVhZGVyVHlwZSA9PT0gTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2g7IH1cblxuICAgIGNvbnN0cnVjdG9yKGJvZHlMZW5ndGg6IExvbmcgfCBudW1iZXIsIHZlcnNpb246IE1ldGFkYXRhVmVyc2lvbiwgaGVhZGVyVHlwZTogVCwgaGVhZGVyPzogYW55KSB7XG4gICAgICAgIHRoaXMuX3ZlcnNpb24gPSB2ZXJzaW9uO1xuICAgICAgICB0aGlzLl9oZWFkZXJUeXBlID0gaGVhZGVyVHlwZTtcbiAgICAgICAgdGhpcy5ib2R5ID0gbmV3IFVpbnQ4QXJyYXkoMCk7XG4gICAgICAgIGhlYWRlciAmJiAodGhpcy5fY3JlYXRlSGVhZGVyID0gKCkgPT4gaGVhZGVyKTtcbiAgICAgICAgdGhpcy5fYm9keUxlbmd0aCA9IHR5cGVvZiBib2R5TGVuZ3RoID09PSAnbnVtYmVyJyA/IGJvZHlMZW5ndGggOiBib2R5TGVuZ3RoLmxvdztcbiAgICB9XG59XG5cbi8qKlxuICogQGlnbm9yZVxuICovXG5leHBvcnQgY2xhc3MgUmVjb3JkQmF0Y2gge1xuICAgIHByb3RlY3RlZCBfbGVuZ3RoOiBudW1iZXI7XG4gICAgcHJvdGVjdGVkIF9ub2RlczogRmllbGROb2RlW107XG4gICAgcHJvdGVjdGVkIF9idWZmZXJzOiBCdWZmZXJSZWdpb25bXTtcbiAgICBwdWJsaWMgZ2V0IG5vZGVzKCkgeyByZXR1cm4gdGhpcy5fbm9kZXM7IH1cbiAgICBwdWJsaWMgZ2V0IGxlbmd0aCgpIHsgcmV0dXJuIHRoaXMuX2xlbmd0aDsgfVxuICAgIHB1YmxpYyBnZXQgYnVmZmVycygpIHsgcmV0dXJuIHRoaXMuX2J1ZmZlcnM7IH1cbiAgICBjb25zdHJ1Y3RvcihsZW5ndGg6IExvbmcgfCBudW1iZXIsIG5vZGVzOiBGaWVsZE5vZGVbXSwgYnVmZmVyczogQnVmZmVyUmVnaW9uW10pIHtcbiAgICAgICAgdGhpcy5fbm9kZXMgPSBub2RlcztcbiAgICAgICAgdGhpcy5fYnVmZmVycyA9IGJ1ZmZlcnM7XG4gICAgICAgIHRoaXMuX2xlbmd0aCA9IHR5cGVvZiBsZW5ndGggPT09ICdudW1iZXInID8gbGVuZ3RoIDogbGVuZ3RoLmxvdztcbiAgICB9XG59XG5cbi8qKlxuICogQGlnbm9yZVxuICovXG5leHBvcnQgY2xhc3MgRGljdGlvbmFyeUJhdGNoIHtcblxuICAgIHByb3RlY3RlZCBfaWQ6IG51bWJlcjtcbiAgICBwcm90ZWN0ZWQgX2lzRGVsdGE6IGJvb2xlYW47XG4gICAgcHJvdGVjdGVkIF9kYXRhOiBSZWNvcmRCYXRjaDtcbiAgICBwdWJsaWMgZ2V0IGlkKCkgeyByZXR1cm4gdGhpcy5faWQ7IH1cbiAgICBwdWJsaWMgZ2V0IGRhdGEoKSB7IHJldHVybiB0aGlzLl9kYXRhOyB9XG4gICAgcHVibGljIGdldCBpc0RlbHRhKCkgeyByZXR1cm4gdGhpcy5faXNEZWx0YTsgfVxuICAgIHB1YmxpYyBnZXQgbGVuZ3RoKCk6IG51bWJlciB7IHJldHVybiB0aGlzLmRhdGEubGVuZ3RoOyB9XG4gICAgcHVibGljIGdldCBub2RlcygpOiBGaWVsZE5vZGVbXSB7IHJldHVybiB0aGlzLmRhdGEubm9kZXM7IH1cbiAgICBwdWJsaWMgZ2V0IGJ1ZmZlcnMoKTogQnVmZmVyUmVnaW9uW10geyByZXR1cm4gdGhpcy5kYXRhLmJ1ZmZlcnM7IH1cblxuICAgIGNvbnN0cnVjdG9yKGRhdGE6IFJlY29yZEJhdGNoLCBpZDogTG9uZyB8IG51bWJlciwgaXNEZWx0YTogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgICAgIHRoaXMuX2RhdGEgPSBkYXRhO1xuICAgICAgICB0aGlzLl9pc0RlbHRhID0gaXNEZWx0YTtcbiAgICAgICAgdGhpcy5faWQgPSB0eXBlb2YgaWQgPT09ICdudW1iZXInID8gaWQgOiBpZC5sb3c7XG4gICAgfVxufVxuXG4vKipcbiAqIEBpZ25vcmVcbiAqL1xuZXhwb3J0IGNsYXNzIEJ1ZmZlclJlZ2lvbiB7XG4gICAgcHVibGljIG9mZnNldDogbnVtYmVyO1xuICAgIHB1YmxpYyBsZW5ndGg6IG51bWJlcjtcbiAgICBjb25zdHJ1Y3RvcihvZmZzZXQ6IExvbmcgfCBudW1iZXIsIGxlbmd0aDogTG9uZyB8IG51bWJlcikge1xuICAgICAgICB0aGlzLm9mZnNldCA9IHR5cGVvZiBvZmZzZXQgPT09ICdudW1iZXInID8gb2Zmc2V0IDogb2Zmc2V0LmxvdztcbiAgICAgICAgdGhpcy5sZW5ndGggPSB0eXBlb2YgbGVuZ3RoID09PSAnbnVtYmVyJyA/IGxlbmd0aCA6IGxlbmd0aC5sb3c7XG4gICAgfVxufVxuXG4vKipcbiAqIEBpZ25vcmVcbiAqL1xuZXhwb3J0IGNsYXNzIEZpZWxkTm9kZSB7XG4gICAgcHVibGljIGxlbmd0aDogbnVtYmVyO1xuICAgIHB1YmxpYyBudWxsQ291bnQ6IG51bWJlcjtcbiAgICBjb25zdHJ1Y3RvcihsZW5ndGg6IExvbmcgfCBudW1iZXIsIG51bGxDb3VudDogTG9uZyB8IG51bWJlcikge1xuICAgICAgICB0aGlzLmxlbmd0aCA9IHR5cGVvZiBsZW5ndGggPT09ICdudW1iZXInID8gbGVuZ3RoIDogbGVuZ3RoLmxvdztcbiAgICAgICAgdGhpcy5udWxsQ291bnQgPSB0eXBlb2YgbnVsbENvdW50ID09PSAnbnVtYmVyJyA/IG51bGxDb3VudCA6IG51bGxDb3VudC5sb3c7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBtZXNzYWdlSGVhZGVyRnJvbUpTT04obWVzc2FnZTogYW55LCB0eXBlOiBNZXNzYWdlSGVhZGVyKSB7XG4gICAgcmV0dXJuICgoKSA9PiB7XG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLlNjaGVtYTogcmV0dXJuIFNjaGVtYS5mcm9tSlNPTihtZXNzYWdlKTtcbiAgICAgICAgICAgIGNhc2UgTWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaDogcmV0dXJuIFJlY29yZEJhdGNoLmZyb21KU09OKG1lc3NhZ2UpO1xuICAgICAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaDogcmV0dXJuIERpY3Rpb25hcnlCYXRjaC5mcm9tSlNPTihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVucmVjb2duaXplZCBNZXNzYWdlIHR5cGU6IHsgbmFtZTogJHtNZXNzYWdlSGVhZGVyW3R5cGVdfSwgdHlwZTogJHt0eXBlfSB9YCk7XG4gICAgfSkgYXMgTWVzc2FnZUhlYWRlckRlY29kZXI7XG59XG5cbmZ1bmN0aW9uIGRlY29kZU1lc3NhZ2VIZWFkZXIobWVzc2FnZTogX01lc3NhZ2UsIHR5cGU6IE1lc3NhZ2VIZWFkZXIpIHtcbiAgICByZXR1cm4gKCgpID0+IHtcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlIE1lc3NhZ2VIZWFkZXIuU2NoZW1hOiByZXR1cm4gU2NoZW1hLmRlY29kZShtZXNzYWdlLmhlYWRlcihuZXcgX1NjaGVtYSgpKSEpO1xuICAgICAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoOiByZXR1cm4gUmVjb3JkQmF0Y2guZGVjb2RlKG1lc3NhZ2UuaGVhZGVyKG5ldyBfUmVjb3JkQmF0Y2goKSkhLCBtZXNzYWdlLnZlcnNpb24oKSk7XG4gICAgICAgICAgICBjYXNlIE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoOiByZXR1cm4gRGljdGlvbmFyeUJhdGNoLmRlY29kZShtZXNzYWdlLmhlYWRlcihuZXcgX0RpY3Rpb25hcnlCYXRjaCgpKSEsIG1lc3NhZ2UudmVyc2lvbigpKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVucmVjb2duaXplZCBNZXNzYWdlIHR5cGU6IHsgbmFtZTogJHtNZXNzYWdlSGVhZGVyW3R5cGVdfSwgdHlwZTogJHt0eXBlfSB9YCk7XG4gICAgfSkgYXMgTWVzc2FnZUhlYWRlckRlY29kZXI7XG59XG5cbkZpZWxkWydlbmNvZGUnXSA9IGVuY29kZUZpZWxkO1xuRmllbGRbJ2RlY29kZSddID0gZGVjb2RlRmllbGQ7XG5GaWVsZFsnZnJvbUpTT04nXSA9IGZpZWxkRnJvbUpTT047XG5cblNjaGVtYVsnZW5jb2RlJ10gPSBlbmNvZGVTY2hlbWE7XG5TY2hlbWFbJ2RlY29kZSddID0gZGVjb2RlU2NoZW1hO1xuU2NoZW1hWydmcm9tSlNPTiddID0gc2NoZW1hRnJvbUpTT047XG5cblJlY29yZEJhdGNoWydlbmNvZGUnXSA9IGVuY29kZVJlY29yZEJhdGNoO1xuUmVjb3JkQmF0Y2hbJ2RlY29kZSddID0gZGVjb2RlUmVjb3JkQmF0Y2g7XG5SZWNvcmRCYXRjaFsnZnJvbUpTT04nXSA9IHJlY29yZEJhdGNoRnJvbUpTT047XG5cbkRpY3Rpb25hcnlCYXRjaFsnZW5jb2RlJ10gPSBlbmNvZGVEaWN0aW9uYXJ5QmF0Y2g7XG5EaWN0aW9uYXJ5QmF0Y2hbJ2RlY29kZSddID0gZGVjb2RlRGljdGlvbmFyeUJhdGNoO1xuRGljdGlvbmFyeUJhdGNoWydmcm9tSlNPTiddID0gZGljdGlvbmFyeUJhdGNoRnJvbUpTT047XG5cbkZpZWxkTm9kZVsnZW5jb2RlJ10gPSBlbmNvZGVGaWVsZE5vZGU7XG5GaWVsZE5vZGVbJ2RlY29kZSddID0gZGVjb2RlRmllbGROb2RlO1xuXG5CdWZmZXJSZWdpb25bJ2VuY29kZSddID0gZW5jb2RlQnVmZmVyUmVnaW9uO1xuQnVmZmVyUmVnaW9uWydkZWNvZGUnXSA9IGRlY29kZUJ1ZmZlclJlZ2lvbjtcblxuZGVjbGFyZSBtb2R1bGUgJy4uLy4uL3NjaGVtYScge1xuICAgIG5hbWVzcGFjZSBGaWVsZCB7XG4gICAgICAgIGV4cG9ydCB7IGVuY29kZUZpZWxkIGFzIGVuY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBkZWNvZGVGaWVsZCBhcyBkZWNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgZmllbGRGcm9tSlNPTiBhcyBmcm9tSlNPTiB9O1xuICAgIH1cbiAgICBuYW1lc3BhY2UgU2NoZW1hIHtcbiAgICAgICAgZXhwb3J0IHsgZW5jb2RlU2NoZW1hIGFzIGVuY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBkZWNvZGVTY2hlbWEgYXMgZGVjb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IHNjaGVtYUZyb21KU09OIGFzIGZyb21KU09OIH07XG4gICAgfVxufVxuXG5kZWNsYXJlIG1vZHVsZSAnLi9tZXNzYWdlJyB7XG4gICAgbmFtZXNwYWNlIFJlY29yZEJhdGNoIHtcbiAgICAgICAgZXhwb3J0IHsgZW5jb2RlUmVjb3JkQmF0Y2ggYXMgZW5jb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IGRlY29kZVJlY29yZEJhdGNoIGFzIGRlY29kZSB9O1xuICAgICAgICBleHBvcnQgeyByZWNvcmRCYXRjaEZyb21KU09OIGFzIGZyb21KU09OIH07XG4gICAgfVxuICAgIG5hbWVzcGFjZSBEaWN0aW9uYXJ5QmF0Y2gge1xuICAgICAgICBleHBvcnQgeyBlbmNvZGVEaWN0aW9uYXJ5QmF0Y2ggYXMgZW5jb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IGRlY29kZURpY3Rpb25hcnlCYXRjaCBhcyBkZWNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgZGljdGlvbmFyeUJhdGNoRnJvbUpTT04gYXMgZnJvbUpTT04gfTtcbiAgICB9XG4gICAgbmFtZXNwYWNlIEZpZWxkTm9kZSB7XG4gICAgICAgIGV4cG9ydCB7IGVuY29kZUZpZWxkTm9kZSBhcyBlbmNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgZGVjb2RlRmllbGROb2RlIGFzIGRlY29kZSB9O1xuICAgIH1cbiAgICBuYW1lc3BhY2UgQnVmZmVyUmVnaW9uIHtcbiAgICAgICAgZXhwb3J0IHsgZW5jb2RlQnVmZmVyUmVnaW9uIGFzIGVuY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBkZWNvZGVCdWZmZXJSZWdpb24gYXMgZGVjb2RlIH07XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkZWNvZGVTY2hlbWEoX3NjaGVtYTogX1NjaGVtYSwgZGljdGlvbmFyaWVzOiBNYXA8bnVtYmVyLCBEYXRhVHlwZT4gPSBuZXcgTWFwKCksIGRpY3Rpb25hcnlGaWVsZHM6IE1hcDxudW1iZXIsIEZpZWxkPERpY3Rpb25hcnk+W10+ID0gbmV3IE1hcCgpKSB7XG4gICAgY29uc3QgZmllbGRzID0gZGVjb2RlU2NoZW1hRmllbGRzKF9zY2hlbWEsIGRpY3Rpb25hcmllcywgZGljdGlvbmFyeUZpZWxkcyk7XG4gICAgcmV0dXJuIG5ldyBTY2hlbWEoZmllbGRzLCBkZWNvZGVDdXN0b21NZXRhZGF0YShfc2NoZW1hKSwgZGljdGlvbmFyaWVzLCBkaWN0aW9uYXJ5RmllbGRzKTtcbn1cblxuZnVuY3Rpb24gZGVjb2RlUmVjb3JkQmF0Y2goYmF0Y2g6IF9SZWNvcmRCYXRjaCwgdmVyc2lvbiA9IE1ldGFkYXRhVmVyc2lvbi5WNCkge1xuICAgIHJldHVybiBuZXcgUmVjb3JkQmF0Y2goYmF0Y2gubGVuZ3RoKCksIGRlY29kZUZpZWxkTm9kZXMoYmF0Y2gpLCBkZWNvZGVCdWZmZXJzKGJhdGNoLCB2ZXJzaW9uKSk7XG59XG5cbmZ1bmN0aW9uIGRlY29kZURpY3Rpb25hcnlCYXRjaChiYXRjaDogX0RpY3Rpb25hcnlCYXRjaCwgdmVyc2lvbiA9IE1ldGFkYXRhVmVyc2lvbi5WNCkge1xuICAgIHJldHVybiBuZXcgRGljdGlvbmFyeUJhdGNoKFJlY29yZEJhdGNoLmRlY29kZShiYXRjaC5kYXRhKCkhLCB2ZXJzaW9uKSwgYmF0Y2guaWQoKSwgYmF0Y2guaXNEZWx0YSgpKTtcbn1cblxuZnVuY3Rpb24gZGVjb2RlQnVmZmVyUmVnaW9uKGI6IF9CdWZmZXIpIHtcbiAgICByZXR1cm4gbmV3IEJ1ZmZlclJlZ2lvbihiLm9mZnNldCgpLCBiLmxlbmd0aCgpKTtcbn1cblxuZnVuY3Rpb24gZGVjb2RlRmllbGROb2RlKGY6IF9GaWVsZE5vZGUpIHtcbiAgICByZXR1cm4gbmV3IEZpZWxkTm9kZShmLmxlbmd0aCgpLCBmLm51bGxDb3VudCgpKTtcbn1cblxuZnVuY3Rpb24gZGVjb2RlRmllbGROb2RlcyhiYXRjaDogX1JlY29yZEJhdGNoKSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20oXG4gICAgICAgIHsgbGVuZ3RoOiBiYXRjaC5ub2Rlc0xlbmd0aCgpIH0sXG4gICAgICAgIChfLCBpKSA9PiBiYXRjaC5ub2RlcyhpKSFcbiAgICApLmZpbHRlcihCb29sZWFuKS5tYXAoRmllbGROb2RlLmRlY29kZSk7XG59XG5cbmZ1bmN0aW9uIGRlY29kZUJ1ZmZlcnMoYmF0Y2g6IF9SZWNvcmRCYXRjaCwgdmVyc2lvbjogTWV0YWRhdGFWZXJzaW9uKSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20oXG4gICAgICAgIHsgbGVuZ3RoOiBiYXRjaC5idWZmZXJzTGVuZ3RoKCkgfSxcbiAgICAgICAgKF8sIGkpID0+IGJhdGNoLmJ1ZmZlcnMoaSkhXG4gICAgKS5maWx0ZXIoQm9vbGVhbikubWFwKHYzQ29tcGF0KHZlcnNpb24sIEJ1ZmZlclJlZ2lvbi5kZWNvZGUpKTtcbn1cblxuZnVuY3Rpb24gdjNDb21wYXQodmVyc2lvbjogTWV0YWRhdGFWZXJzaW9uLCBkZWNvZGU6IChidWZmZXI6IF9CdWZmZXIpID0+IEJ1ZmZlclJlZ2lvbikge1xuICAgIHJldHVybiAoYnVmZmVyOiBfQnVmZmVyLCBpOiBudW1iZXIpID0+IHtcbiAgICAgICAgLy8gSWYgdGhpcyBBcnJvdyBidWZmZXIgd2FzIHdyaXR0ZW4gYmVmb3JlIHZlcnNpb24gNCxcbiAgICAgICAgLy8gYWR2YW5jZSB0aGUgYnVmZmVyJ3MgYmJfcG9zIDggYnl0ZXMgdG8gc2tpcCBwYXN0XG4gICAgICAgIC8vIHRoZSBub3ctcmVtb3ZlZCBwYWdlX2lkIGZpZWxkXG4gICAgICAgIGlmICh2ZXJzaW9uIDwgTWV0YWRhdGFWZXJzaW9uLlY0KSB7XG4gICAgICAgICAgICBidWZmZXIuYmJfcG9zICs9ICg4ICogKGkgKyAxKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRlY29kZShidWZmZXIpO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIGRlY29kZVNjaGVtYUZpZWxkcyhzY2hlbWE6IF9TY2hlbWEsIGRpY3Rpb25hcmllcz86IE1hcDxudW1iZXIsIERhdGFUeXBlPiwgZGljdGlvbmFyeUZpZWxkcz86IE1hcDxudW1iZXIsIEZpZWxkPERpY3Rpb25hcnk+W10+KSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20oXG4gICAgICAgIHsgbGVuZ3RoOiBzY2hlbWEuZmllbGRzTGVuZ3RoKCkgfSxcbiAgICAgICAgKF8sIGkpID0+IHNjaGVtYS5maWVsZHMoaSkhXG4gICAgKS5maWx0ZXIoQm9vbGVhbikubWFwKChmKSA9PiBGaWVsZC5kZWNvZGUoZiwgZGljdGlvbmFyaWVzLCBkaWN0aW9uYXJ5RmllbGRzKSk7XG59XG5cbmZ1bmN0aW9uIGRlY29kZUZpZWxkQ2hpbGRyZW4oZmllbGQ6IF9GaWVsZCwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgRGF0YVR5cGU+LCBkaWN0aW9uYXJ5RmllbGRzPzogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeT5bXT4pOiBGaWVsZFtdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbShcbiAgICAgICAgeyBsZW5ndGg6IGZpZWxkLmNoaWxkcmVuTGVuZ3RoKCkgfSxcbiAgICAgICAgKF8sIGkpID0+IGZpZWxkLmNoaWxkcmVuKGkpIVxuICAgICkuZmlsdGVyKEJvb2xlYW4pLm1hcCgoZikgPT4gRmllbGQuZGVjb2RlKGYsIGRpY3Rpb25hcmllcywgZGljdGlvbmFyeUZpZWxkcykpO1xufVxuXG5mdW5jdGlvbiBkZWNvZGVGaWVsZChmOiBfRmllbGQsIGRpY3Rpb25hcmllcz86IE1hcDxudW1iZXIsIERhdGFUeXBlPiwgZGljdGlvbmFyeUZpZWxkcz86IE1hcDxudW1iZXIsIEZpZWxkPERpY3Rpb25hcnk+W10+KSB7XG5cbiAgICBsZXQgaWQ6IG51bWJlcjtcbiAgICBsZXQgZmllbGQ6IEZpZWxkIHwgdm9pZDtcbiAgICBsZXQgdHlwZTogRGF0YVR5cGU8YW55PjtcbiAgICBsZXQga2V5czogX0ludCB8IFRLZXlzIHwgbnVsbDtcbiAgICBsZXQgZGljdFR5cGU6IERpY3Rpb25hcnk7XG4gICAgbGV0IGRpY3RNZXRhOiBfRGljdGlvbmFyeUVuY29kaW5nIHwgbnVsbDtcbiAgICBsZXQgZGljdEZpZWxkOiBGaWVsZDxEaWN0aW9uYXJ5PjtcblxuICAgIC8vIElmIG5vIGRpY3Rpb25hcnkgZW5jb2RpbmcsIG9yIGluIHRoZSBwcm9jZXNzIG9mIGRlY29kaW5nIHRoZSBjaGlsZHJlbiBvZiBhIGRpY3Rpb25hcnktZW5jb2RlZCBmaWVsZFxuICAgIGlmICghZGljdGlvbmFyaWVzIHx8ICFkaWN0aW9uYXJ5RmllbGRzIHx8ICEoZGljdE1ldGEgPSBmLmRpY3Rpb25hcnkoKSkpIHtcbiAgICAgICAgdHlwZSA9IGRlY29kZUZpZWxkVHlwZShmLCBkZWNvZGVGaWVsZENoaWxkcmVuKGYsIGRpY3Rpb25hcmllcywgZGljdGlvbmFyeUZpZWxkcykpO1xuICAgICAgICBmaWVsZCA9IG5ldyBGaWVsZChmLm5hbWUoKSEsIHR5cGUsIGYubnVsbGFibGUoKSwgZGVjb2RlQ3VzdG9tTWV0YWRhdGEoZikpO1xuICAgIH1cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZVxuICAgIC8vIElmIGRpY3Rpb25hcnkgZW5jb2RlZCBhbmQgdGhlIGZpcnN0IHRpbWUgd2UndmUgc2VlbiB0aGlzIGRpY3Rpb25hcnkgaWQsIGRlY29kZVxuICAgIC8vIHRoZSBkYXRhIHR5cGUgYW5kIGNoaWxkIGZpZWxkcywgdGhlbiB3cmFwIGluIGEgRGljdGlvbmFyeSB0eXBlIGFuZCBpbnNlcnQgdGhlXG4gICAgLy8gZGF0YSB0eXBlIGludG8gdGhlIGRpY3Rpb25hcnkgdHlwZXMgbWFwLlxuICAgIGVsc2UgaWYgKCFkaWN0aW9uYXJpZXMuaGFzKGlkID0gZGljdE1ldGEuaWQoKS5sb3cpKSB7XG4gICAgICAgIC8vIGEgZGljdGlvbmFyeSBpbmRleCBkZWZhdWx0cyB0byBzaWduZWQgMzIgYml0IGludCBpZiB1bnNwZWNpZmllZFxuICAgICAgICBrZXlzID0gKGtleXMgPSBkaWN0TWV0YS5pbmRleFR5cGUoKSkgPyBkZWNvZGVJbmRleFR5cGUoa2V5cykgYXMgVEtleXMgOiBuZXcgSW50MzIoKTtcbiAgICAgICAgZGljdGlvbmFyaWVzLnNldChpZCwgdHlwZSA9IGRlY29kZUZpZWxkVHlwZShmLCBkZWNvZGVGaWVsZENoaWxkcmVuKGYpKSk7XG4gICAgICAgIGRpY3RUeXBlID0gbmV3IERpY3Rpb25hcnkodHlwZSwga2V5cywgaWQsIGRpY3RNZXRhLmlzT3JkZXJlZCgpKTtcbiAgICAgICAgZGljdEZpZWxkID0gbmV3IEZpZWxkKGYubmFtZSgpISwgZGljdFR5cGUsIGYubnVsbGFibGUoKSwgZGVjb2RlQ3VzdG9tTWV0YWRhdGEoZikpO1xuICAgICAgICBkaWN0aW9uYXJ5RmllbGRzLnNldChpZCwgW2ZpZWxkID0gZGljdEZpZWxkXSk7XG4gICAgfVxuICAgIC8vIElmIGRpY3Rpb25hcnkgZW5jb2RlZCwgYW5kIGhhdmUgYWxyZWFkeSBzZWVuIHRoaXMgZGljdGlvbmFyeSBJZCBpbiB0aGUgc2NoZW1hLCB0aGVuIHJldXNlIHRoZVxuICAgIC8vIGRhdGEgdHlwZSBhbmQgd3JhcCBpbiBhIG5ldyBEaWN0aW9uYXJ5IHR5cGUgYW5kIGZpZWxkLlxuICAgIGVsc2Uge1xuICAgICAgICAvLyBhIGRpY3Rpb25hcnkgaW5kZXggZGVmYXVsdHMgdG8gc2lnbmVkIDMyIGJpdCBpbnQgaWYgdW5zcGVjaWZpZWRcbiAgICAgICAga2V5cyA9IChrZXlzID0gZGljdE1ldGEuaW5kZXhUeXBlKCkpID8gZGVjb2RlSW5kZXhUeXBlKGtleXMpIGFzIFRLZXlzIDogbmV3IEludDMyKCk7XG4gICAgICAgIGRpY3RUeXBlID0gbmV3IERpY3Rpb25hcnkoZGljdGlvbmFyaWVzLmdldChpZCkhLCBrZXlzLCBpZCwgZGljdE1ldGEuaXNPcmRlcmVkKCkpO1xuICAgICAgICBkaWN0RmllbGQgPSBuZXcgRmllbGQoZi5uYW1lKCkhLCBkaWN0VHlwZSwgZi5udWxsYWJsZSgpLCBkZWNvZGVDdXN0b21NZXRhZGF0YShmKSk7XG4gICAgICAgIGRpY3Rpb25hcnlGaWVsZHMuZ2V0KGlkKSEucHVzaChmaWVsZCA9IGRpY3RGaWVsZCk7XG4gICAgfVxuICAgIHJldHVybiBmaWVsZCB8fCBudWxsO1xufVxuXG5mdW5jdGlvbiBkZWNvZGVDdXN0b21NZXRhZGF0YShwYXJlbnQ/OiBfU2NoZW1hIHwgX0ZpZWxkIHwgbnVsbCkge1xuICAgIGNvbnN0IGRhdGEgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgZm9yIChsZXQgZW50cnksIGtleSwgaSA9IC0xLCBuID0gcGFyZW50LmN1c3RvbU1ldGFkYXRhTGVuZ3RoKCkgfCAwOyArK2kgPCBuOykge1xuICAgICAgICAgICAgaWYgKChlbnRyeSA9IHBhcmVudC5jdXN0b21NZXRhZGF0YShpKSkgJiYgKGtleSA9IGVudHJ5LmtleSgpKSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZGF0YS5zZXQoa2V5LCBlbnRyeS52YWx1ZSgpISk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRhdGE7XG59XG5cbmZ1bmN0aW9uIGRlY29kZUluZGV4VHlwZShfdHlwZTogX0ludCkge1xuICAgIHJldHVybiBuZXcgSW50KF90eXBlLmlzU2lnbmVkKCksIF90eXBlLmJpdFdpZHRoKCkgYXMgSW50Qml0V2lkdGgpO1xufVxuXG5mdW5jdGlvbiBkZWNvZGVGaWVsZFR5cGUoZjogX0ZpZWxkLCBjaGlsZHJlbj86IEZpZWxkW10pOiBEYXRhVHlwZTxhbnk+IHtcblxuICAgIGNvbnN0IHR5cGVJZCA9IGYudHlwZVR5cGUoKTtcblxuICAgIHN3aXRjaCAodHlwZUlkKSB7XG4gICAgICAgIGNhc2UgVHlwZS5OT05FOiAgICByZXR1cm4gbmV3IERhdGFUeXBlKCk7XG4gICAgICAgIGNhc2UgVHlwZS5OdWxsOiAgICByZXR1cm4gbmV3IE51bGwoKTtcbiAgICAgICAgY2FzZSBUeXBlLkJpbmFyeTogIHJldHVybiBuZXcgQmluYXJ5KCk7XG4gICAgICAgIGNhc2UgVHlwZS5VdGY4OiAgICByZXR1cm4gbmV3IFV0ZjgoKTtcbiAgICAgICAgY2FzZSBUeXBlLkJvb2w6ICAgIHJldHVybiBuZXcgQm9vbCgpO1xuICAgICAgICBjYXNlIFR5cGUuTGlzdDogICAgcmV0dXJuIG5ldyBMaXN0KGNoaWxkcmVuIHx8IFtdKTtcbiAgICAgICAgY2FzZSBUeXBlLlN0cnVjdF86IHJldHVybiBuZXcgU3RydWN0KGNoaWxkcmVuIHx8IFtdKTtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKHR5cGVJZCkge1xuICAgICAgICBjYXNlIFR5cGUuSW50OiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5JbnQoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBJbnQodC5pc1NpZ25lZCgpLCB0LmJpdFdpZHRoKCkpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5GbG9hdGluZ1BvaW50OiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GbG9hdGluZ1BvaW50KCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRmxvYXQodC5wcmVjaXNpb24oKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLkRlY2ltYWw6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRlY2ltYWwoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBEZWNpbWFsKHQuc2NhbGUoKSwgdC5wcmVjaXNpb24oKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLkRhdGU6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRhdGUoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBEYXRlXyh0LnVuaXQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLlRpbWU6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlRpbWUoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBUaW1lKHQudW5pdCgpLCB0LmJpdFdpZHRoKCkgYXMgVGltZUJpdFdpZHRoKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuVGltZXN0YW1wOiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UaW1lc3RhbXAoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBUaW1lc3RhbXAodC51bml0KCksIHQudGltZXpvbmUoKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLkludGVydmFsOiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5JbnRlcnZhbCgpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEludGVydmFsKHQudW5pdCgpKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuVW5pb246IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlVuaW9uKCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgVW5pb24odC5tb2RlKCksICh0LnR5cGVJZHNBcnJheSgpIHx8IFtdKSBhcyBUeXBlW10sIGNoaWxkcmVuIHx8IFtdKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuRml4ZWRTaXplQmluYXJ5OiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaXhlZFNpemVCaW5hcnkoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBGaXhlZFNpemVCaW5hcnkodC5ieXRlV2lkdGgoKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLkZpeGVkU2l6ZUxpc3Q6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpeGVkU2l6ZUxpc3QoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBGaXhlZFNpemVMaXN0KHQubGlzdFNpemUoKSwgY2hpbGRyZW4gfHwgW10pO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5NYXA6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk1hcCgpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1hcF8oY2hpbGRyZW4gfHwgW10sIHQua2V5c1NvcnRlZCgpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVucmVjb2duaXplZCB0eXBlOiBcIiR7VHlwZVt0eXBlSWRdfVwiICgke3R5cGVJZH0pYCk7XG59XG5cbmZ1bmN0aW9uIGVuY29kZVNjaGVtYShiOiBCdWlsZGVyLCBzY2hlbWE6IFNjaGVtYSkge1xuXG4gICAgY29uc3QgZmllbGRPZmZzZXRzID0gc2NoZW1hLmZpZWxkcy5tYXAoKGYpID0+IEZpZWxkLmVuY29kZShiLCBmKSk7XG5cbiAgICBfU2NoZW1hLnN0YXJ0RmllbGRzVmVjdG9yKGIsIGZpZWxkT2Zmc2V0cy5sZW5ndGgpO1xuXG4gICAgY29uc3QgZmllbGRzVmVjdG9yT2Zmc2V0ID0gX1NjaGVtYS5jcmVhdGVGaWVsZHNWZWN0b3IoYiwgZmllbGRPZmZzZXRzKTtcblxuICAgIGNvbnN0IG1ldGFkYXRhT2Zmc2V0ID0gIShzY2hlbWEubWV0YWRhdGEgJiYgc2NoZW1hLm1ldGFkYXRhLnNpemUgPiAwKSA/IC0xIDpcbiAgICAgICAgX1NjaGVtYS5jcmVhdGVDdXN0b21NZXRhZGF0YVZlY3RvcihiLCBbLi4uc2NoZW1hLm1ldGFkYXRhXS5tYXAoKFtrLCB2XSkgPT4ge1xuICAgICAgICAgICAgY29uc3Qga2V5ID0gYi5jcmVhdGVTdHJpbmcoYCR7a31gKTtcbiAgICAgICAgICAgIGNvbnN0IHZhbCA9IGIuY3JlYXRlU3RyaW5nKGAke3Z9YCk7XG4gICAgICAgICAgICBfS2V5VmFsdWUuc3RhcnRLZXlWYWx1ZShiKTtcbiAgICAgICAgICAgIF9LZXlWYWx1ZS5hZGRLZXkoYiwga2V5KTtcbiAgICAgICAgICAgIF9LZXlWYWx1ZS5hZGRWYWx1ZShiLCB2YWwpO1xuICAgICAgICAgICAgcmV0dXJuIF9LZXlWYWx1ZS5lbmRLZXlWYWx1ZShiKTtcbiAgICAgICAgfSkpO1xuXG4gICAgX1NjaGVtYS5zdGFydFNjaGVtYShiKTtcbiAgICBfU2NoZW1hLmFkZEZpZWxkcyhiLCBmaWVsZHNWZWN0b3JPZmZzZXQpO1xuICAgIF9TY2hlbWEuYWRkRW5kaWFubmVzcyhiLCBwbGF0Zm9ybUlzTGl0dGxlRW5kaWFuID8gX0VuZGlhbm5lc3MuTGl0dGxlIDogX0VuZGlhbm5lc3MuQmlnKTtcblxuICAgIGlmIChtZXRhZGF0YU9mZnNldCAhPT0gLTEpIHsgX1NjaGVtYS5hZGRDdXN0b21NZXRhZGF0YShiLCBtZXRhZGF0YU9mZnNldCk7IH1cblxuICAgIHJldHVybiBfU2NoZW1hLmVuZFNjaGVtYShiKTtcbn1cblxuZnVuY3Rpb24gZW5jb2RlRmllbGQoYjogQnVpbGRlciwgZmllbGQ6IEZpZWxkKSB7XG5cbiAgICBsZXQgbmFtZU9mZnNldCA9IC0xO1xuICAgIGxldCB0eXBlT2Zmc2V0ID0gLTE7XG4gICAgbGV0IGRpY3Rpb25hcnlPZmZzZXQgPSAtMTtcblxuICAgIGxldCB0eXBlID0gZmllbGQudHlwZTtcbiAgICBsZXQgdHlwZUlkOiBUeXBlID0gPGFueT4gZmllbGQudHlwZUlkO1xuXG4gICAgaWYgKCFEYXRhVHlwZS5pc0RpY3Rpb25hcnkodHlwZSkpIHtcbiAgICAgICAgdHlwZU9mZnNldCA9IHR5cGVBc3NlbWJsZXIudmlzaXQodHlwZSwgYikhO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHR5cGVJZCA9IHR5cGUuZGljdGlvbmFyeS5UVHlwZTtcbiAgICAgICAgZGljdGlvbmFyeU9mZnNldCA9IHR5cGVBc3NlbWJsZXIudmlzaXQodHlwZSwgYikhO1xuICAgICAgICB0eXBlT2Zmc2V0ID0gdHlwZUFzc2VtYmxlci52aXNpdCh0eXBlLmRpY3Rpb25hcnksIGIpITtcbiAgICB9XG5cbiAgICBjb25zdCBjaGlsZE9mZnNldHMgPSAodHlwZS5jaGlsZHJlbiB8fCBbXSkubWFwKChmOiBGaWVsZCkgPT4gRmllbGQuZW5jb2RlKGIsIGYpKTtcbiAgICBjb25zdCBjaGlsZHJlblZlY3Rvck9mZnNldCA9IF9GaWVsZC5jcmVhdGVDaGlsZHJlblZlY3RvcihiLCBjaGlsZE9mZnNldHMpO1xuXG4gICAgY29uc3QgbWV0YWRhdGFPZmZzZXQgPSAhKGZpZWxkLm1ldGFkYXRhICYmIGZpZWxkLm1ldGFkYXRhLnNpemUgPiAwKSA/IC0xIDpcbiAgICAgICAgX0ZpZWxkLmNyZWF0ZUN1c3RvbU1ldGFkYXRhVmVjdG9yKGIsIFsuLi5maWVsZC5tZXRhZGF0YV0ubWFwKChbaywgdl0pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IGIuY3JlYXRlU3RyaW5nKGAke2t9YCk7XG4gICAgICAgICAgICBjb25zdCB2YWwgPSBiLmNyZWF0ZVN0cmluZyhgJHt2fWApO1xuICAgICAgICAgICAgX0tleVZhbHVlLnN0YXJ0S2V5VmFsdWUoYik7XG4gICAgICAgICAgICBfS2V5VmFsdWUuYWRkS2V5KGIsIGtleSk7XG4gICAgICAgICAgICBfS2V5VmFsdWUuYWRkVmFsdWUoYiwgdmFsKTtcbiAgICAgICAgICAgIHJldHVybiBfS2V5VmFsdWUuZW5kS2V5VmFsdWUoYik7XG4gICAgICAgIH0pKTtcblxuICAgIGlmIChmaWVsZC5uYW1lKSB7XG4gICAgICAgIG5hbWVPZmZzZXQgPSBiLmNyZWF0ZVN0cmluZyhmaWVsZC5uYW1lKTtcbiAgICB9XG5cbiAgICBfRmllbGQuc3RhcnRGaWVsZChiKTtcbiAgICBfRmllbGQuYWRkVHlwZShiLCB0eXBlT2Zmc2V0KTtcbiAgICBfRmllbGQuYWRkVHlwZVR5cGUoYiwgdHlwZUlkKTtcbiAgICBfRmllbGQuYWRkQ2hpbGRyZW4oYiwgY2hpbGRyZW5WZWN0b3JPZmZzZXQpO1xuICAgIF9GaWVsZC5hZGROdWxsYWJsZShiLCAhIWZpZWxkLm51bGxhYmxlKTtcblxuICAgIGlmIChuYW1lT2Zmc2V0ICE9PSAtMSkgeyBfRmllbGQuYWRkTmFtZShiLCBuYW1lT2Zmc2V0KTsgfVxuICAgIGlmIChkaWN0aW9uYXJ5T2Zmc2V0ICE9PSAtMSkgeyBfRmllbGQuYWRkRGljdGlvbmFyeShiLCBkaWN0aW9uYXJ5T2Zmc2V0KTsgfVxuICAgIGlmIChtZXRhZGF0YU9mZnNldCAhPT0gLTEpIHsgX0ZpZWxkLmFkZEN1c3RvbU1ldGFkYXRhKGIsIG1ldGFkYXRhT2Zmc2V0KTsgfVxuXG4gICAgcmV0dXJuIF9GaWVsZC5lbmRGaWVsZChiKTtcbn1cblxuZnVuY3Rpb24gZW5jb2RlUmVjb3JkQmF0Y2goYjogQnVpbGRlciwgcmVjb3JkQmF0Y2g6IFJlY29yZEJhdGNoKSB7XG5cbiAgICBjb25zdCBub2RlcyA9IHJlY29yZEJhdGNoLm5vZGVzIHx8IFtdO1xuICAgIGNvbnN0IGJ1ZmZlcnMgPSByZWNvcmRCYXRjaC5idWZmZXJzIHx8IFtdO1xuXG4gICAgX1JlY29yZEJhdGNoLnN0YXJ0Tm9kZXNWZWN0b3IoYiwgbm9kZXMubGVuZ3RoKTtcbiAgICBub2Rlcy5zbGljZSgpLnJldmVyc2UoKS5mb3JFYWNoKChuKSA9PiBGaWVsZE5vZGUuZW5jb2RlKGIsIG4pKTtcblxuICAgIGNvbnN0IG5vZGVzVmVjdG9yT2Zmc2V0ID0gYi5lbmRWZWN0b3IoKTtcblxuICAgIF9SZWNvcmRCYXRjaC5zdGFydEJ1ZmZlcnNWZWN0b3IoYiwgYnVmZmVycy5sZW5ndGgpO1xuICAgIGJ1ZmZlcnMuc2xpY2UoKS5yZXZlcnNlKCkuZm9yRWFjaCgoYl8pID0+IEJ1ZmZlclJlZ2lvbi5lbmNvZGUoYiwgYl8pKTtcblxuICAgIGNvbnN0IGJ1ZmZlcnNWZWN0b3JPZmZzZXQgPSBiLmVuZFZlY3RvcigpO1xuXG4gICAgX1JlY29yZEJhdGNoLnN0YXJ0UmVjb3JkQmF0Y2goYik7XG4gICAgX1JlY29yZEJhdGNoLmFkZExlbmd0aChiLCBuZXcgTG9uZyhyZWNvcmRCYXRjaC5sZW5ndGgsIDApKTtcbiAgICBfUmVjb3JkQmF0Y2guYWRkTm9kZXMoYiwgbm9kZXNWZWN0b3JPZmZzZXQpO1xuICAgIF9SZWNvcmRCYXRjaC5hZGRCdWZmZXJzKGIsIGJ1ZmZlcnNWZWN0b3JPZmZzZXQpO1xuICAgIHJldHVybiBfUmVjb3JkQmF0Y2guZW5kUmVjb3JkQmF0Y2goYik7XG59XG5cbmZ1bmN0aW9uIGVuY29kZURpY3Rpb25hcnlCYXRjaChiOiBCdWlsZGVyLCBkaWN0aW9uYXJ5QmF0Y2g6IERpY3Rpb25hcnlCYXRjaCkge1xuICAgIGNvbnN0IGRhdGFPZmZzZXQgPSBSZWNvcmRCYXRjaC5lbmNvZGUoYiwgZGljdGlvbmFyeUJhdGNoLmRhdGEpO1xuICAgIF9EaWN0aW9uYXJ5QmF0Y2guc3RhcnREaWN0aW9uYXJ5QmF0Y2goYik7XG4gICAgX0RpY3Rpb25hcnlCYXRjaC5hZGRJZChiLCBuZXcgTG9uZyhkaWN0aW9uYXJ5QmF0Y2guaWQsIDApKTtcbiAgICBfRGljdGlvbmFyeUJhdGNoLmFkZElzRGVsdGEoYiwgZGljdGlvbmFyeUJhdGNoLmlzRGVsdGEpO1xuICAgIF9EaWN0aW9uYXJ5QmF0Y2guYWRkRGF0YShiLCBkYXRhT2Zmc2V0KTtcbiAgICByZXR1cm4gX0RpY3Rpb25hcnlCYXRjaC5lbmREaWN0aW9uYXJ5QmF0Y2goYik7XG59XG5cbmZ1bmN0aW9uIGVuY29kZUZpZWxkTm9kZShiOiBCdWlsZGVyLCBub2RlOiBGaWVsZE5vZGUpIHtcbiAgICByZXR1cm4gX0ZpZWxkTm9kZS5jcmVhdGVGaWVsZE5vZGUoYiwgbmV3IExvbmcobm9kZS5sZW5ndGgsIDApLCBuZXcgTG9uZyhub2RlLm51bGxDb3VudCwgMCkpO1xufVxuXG5mdW5jdGlvbiBlbmNvZGVCdWZmZXJSZWdpb24oYjogQnVpbGRlciwgbm9kZTogQnVmZmVyUmVnaW9uKSB7XG4gICAgcmV0dXJuIF9CdWZmZXIuY3JlYXRlQnVmZmVyKGIsIG5ldyBMb25nKG5vZGUub2Zmc2V0LCAwKSwgbmV3IExvbmcobm9kZS5sZW5ndGgsIDApKTtcbn1cblxuY29uc3QgcGxhdGZvcm1Jc0xpdHRsZUVuZGlhbiA9IChmdW5jdGlvbigpIHtcbiAgICBjb25zdCBidWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIoMik7XG4gICAgbmV3IERhdGFWaWV3KGJ1ZmZlcikuc2V0SW50MTYoMCwgMjU2LCB0cnVlIC8qIGxpdHRsZUVuZGlhbiAqLyk7XG4gICAgLy8gSW50MTZBcnJheSB1c2VzIHRoZSBwbGF0Zm9ybSdzIGVuZGlhbm5lc3MuXG4gICAgcmV0dXJuIG5ldyBJbnQxNkFycmF5KGJ1ZmZlcilbMF0gPT09IDI1Njtcbn0pKCk7XG5cbnR5cGUgTWVzc2FnZUhlYWRlckRlY29kZXIgPSA8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KCkgPT4gVCBleHRlbmRzIE1lc3NhZ2VIZWFkZXIuU2NoZW1hID8gU2NoZW1hXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoID8gUmVjb3JkQmF0Y2hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogVCBleHRlbmRzIE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoID8gRGljdGlvbmFyeUJhdGNoIDogbmV2ZXI7XG4iXX0=

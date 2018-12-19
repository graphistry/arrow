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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlwYy9tZXRhZGF0YS9tZXNzYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSw2REFBNkQ7QUFDN0QsK0RBQStEO0FBQy9ELHdEQUF3RDtBQUN4RCw2REFBNkQ7QUFDN0Qsb0RBQW9EO0FBQ3BELDZEQUE2RDtBQUM3RCw2REFBNkQ7QUFDN0QsRUFBRTtBQUNGLCtDQUErQztBQUMvQyxFQUFFO0FBQ0YsNkRBQTZEO0FBQzdELDhEQUE4RDtBQUM5RCx5REFBeUQ7QUFDekQsNERBQTREO0FBQzVELDBEQUEwRDtBQUMxRCxxQkFBcUI7O0FBRXJCLDZDQUEwQztBQUMxQywyQ0FBMkM7QUFDM0MsNkNBQTZDO0FBRTdDLHlDQUE2QztBQUM3Qyw4Q0FBaUQ7QUFFakQscUNBQTREO0FBQzVELCtEQUF3RTtBQUN4RSxpQ0FBcUc7QUFFckcsSUFBTyxJQUFJLEdBQUcseUJBQVcsQ0FBQyxJQUFJLENBQUM7QUFDL0IsSUFBTyxPQUFPLEdBQUcseUJBQVcsQ0FBQyxPQUFPLENBQUM7QUFDckMsSUFBTyxVQUFVLEdBQUcseUJBQVcsQ0FBQyxVQUFVLENBQUM7QUFFM0MsSUFBTyxJQUFJLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7QUFDcEQsSUFBTyxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7QUFDdkQsSUFBTyxPQUFPLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7QUFDekQsSUFBTyxPQUFPLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7QUFDekQsSUFBTyxRQUFRLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7QUFDNUQsSUFBTyxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUM7QUFDN0QsSUFBTyxVQUFVLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7QUFDaEUsSUFBTyxXQUFXLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUM7QUFDakUsSUFBTyxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUM7QUFDcEUsSUFBTyxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQztBQUc1RSxxQ0FLb0I7QUFFcEI7O0dBRUc7QUFDSCxNQUFhLE9BQU87SUFzRWhCLFlBQVksVUFBeUIsRUFBRSxPQUF3QixFQUFFLFVBQWEsRUFBRSxNQUFZO1FBQ3hGLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDO1FBQzlCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUIsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsR0FBRyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM5QyxJQUFJLENBQUMsV0FBVyxHQUFHLE9BQU8sVUFBVSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO0lBQ3BGLENBQUM7SUExRUQsa0JBQWtCO0lBQ1gsTUFBTSxDQUFDLFFBQVEsQ0FBMEIsR0FBUSxFQUFFLFVBQWE7UUFDbkUsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsQ0FBQyxFQUFFLHNCQUFlLENBQUMsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQy9ELE9BQU8sQ0FBQyxhQUFhLEdBQUcscUJBQXFCLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQy9ELE9BQU8sT0FBTyxDQUFDO0lBQ25CLENBQUM7SUFFRCxrQkFBa0I7SUFDWCxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQXlCO1FBQzFDLEdBQUcsR0FBRyxJQUFJLFVBQVUsQ0FBQyxxQkFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDeEMsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2hELE1BQU0sVUFBVSxHQUFTLFFBQVEsQ0FBQyxVQUFVLEVBQUcsQ0FBQztRQUNoRCxNQUFNLE9BQU8sR0FBb0IsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3BELE1BQU0sVUFBVSxHQUFrQixRQUFRLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDeEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztRQUM3RCxPQUFPLENBQUMsYUFBYSxHQUFHLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNsRSxPQUFPLE9BQU8sQ0FBQztJQUNuQixDQUFDO0lBRUQsa0JBQWtCO0lBQ1gsTUFBTSxDQUFDLE1BQU0sQ0FBMEIsT0FBbUI7UUFDN0QsSUFBSSxDQUFDLEdBQUcsSUFBSSxPQUFPLEVBQUUsRUFBRSxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDekMsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDcEIsWUFBWSxHQUFHLGVBQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQVksQ0FBQyxDQUFDO1NBQy9EO2FBQU0sSUFBSSxPQUFPLENBQUMsYUFBYSxFQUFFLEVBQUU7WUFDaEMsWUFBWSxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQWlCLENBQUMsQ0FBQztTQUN6RTthQUFNLElBQUksT0FBTyxDQUFDLGlCQUFpQixFQUFFLEVBQUU7WUFDcEMsWUFBWSxHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQXFCLENBQUMsQ0FBQztTQUNqRjtRQUNELFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekIsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsc0JBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMzQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNwQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDOUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNELFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hELE9BQU8sQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFFRCxrQkFBa0I7SUFDWCxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQThDLEVBQUUsVUFBVSxHQUFHLENBQUM7UUFDN0UsSUFBSSxNQUFNLFlBQVksZUFBTSxFQUFFO1lBQzFCLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxFQUFFLHNCQUFlLENBQUMsRUFBRSxFQUFFLG9CQUFhLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQzNFO1FBQ0QsSUFBSSxNQUFNLFlBQVksV0FBVyxFQUFFO1lBQy9CLE9BQU8sSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFLHNCQUFlLENBQUMsRUFBRSxFQUFFLG9CQUFhLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQ3pGO1FBQ0QsSUFBSSxNQUFNLFlBQVksZUFBZSxFQUFFO1lBQ25DLE9BQU8sSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFLHNCQUFlLENBQUMsRUFBRSxFQUFFLG9CQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQzdGO1FBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQ0FBZ0MsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUM5RCxDQUFDO0lBT0QsSUFBVyxJQUFJLEtBQUssT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUM3QyxJQUFXLE9BQU8sS0FBSyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQzlDLElBQVcsVUFBVSxLQUFLLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDcEQsSUFBVyxVQUFVLEtBQUssT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztJQUc3QyxNQUFNLEtBQUssT0FBTyxJQUFJLENBQUMsYUFBYSxFQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzVDLFFBQVEsS0FBNEMsT0FBTyxJQUFJLENBQUMsVUFBVSxLQUFLLG9CQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUN0RyxhQUFhLEtBQWlELE9BQU8sSUFBSSxDQUFDLFVBQVUsS0FBSyxvQkFBYSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDckgsaUJBQWlCLEtBQXFELE9BQU8sSUFBSSxDQUFDLFVBQVUsS0FBSyxvQkFBYSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7Q0FTM0k7QUE3RUQsMEJBNkVDO0FBRUQ7O0dBRUc7QUFDSCxNQUFhLFdBQVc7SUFJcEIsSUFBVyxLQUFLLEtBQUssT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUMxQyxJQUFXLE1BQU0sS0FBSyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQzVDLElBQVcsT0FBTyxLQUFLLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDOUMsWUFBWSxNQUFxQixFQUFFLEtBQWtCLEVBQUUsT0FBdUI7UUFDMUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDcEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUM7UUFDeEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLE1BQU0sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztJQUNwRSxDQUFDO0NBQ0o7QUFaRCxrQ0FZQztBQUVEOztHQUVHO0FBQ0gsTUFBYSxlQUFlO0lBS3hCLElBQVcsRUFBRSxLQUFLLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDcEMsSUFBVyxJQUFJLEtBQUssT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUN4QyxJQUFXLE9BQU8sS0FBSyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQzlDLElBQVcsTUFBTSxLQUFhLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ3hELElBQVcsS0FBSyxLQUFrQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUMzRCxJQUFXLE9BQU8sS0FBcUIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFFbEUsWUFBWSxJQUFpQixFQUFFLEVBQWlCLEVBQUUsVUFBbUIsS0FBSztRQUN0RSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztRQUNsQixJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQztRQUN4QixJQUFJLENBQUMsR0FBRyxHQUFHLE9BQU8sRUFBRSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDO0lBQ3BELENBQUM7Q0FDSjtBQWpCRCwwQ0FpQkM7QUFFRDs7R0FFRztBQUNILE1BQWEsWUFBWTtJQUdyQixZQUFZLE1BQXFCLEVBQUUsTUFBcUI7UUFDcEQsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLE1BQU0sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztRQUMvRCxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sTUFBTSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO0lBQ25FLENBQUM7Q0FDSjtBQVBELG9DQU9DO0FBRUQ7O0dBRUc7QUFDSCxNQUFhLFNBQVM7SUFHbEIsWUFBWSxNQUFxQixFQUFFLFNBQXdCO1FBQ3ZELElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxNQUFNLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUM7UUFDL0QsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLFNBQVMsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQztJQUMvRSxDQUFDO0NBQ0o7QUFQRCw4QkFPQztBQUVELFNBQVMscUJBQXFCLENBQUMsT0FBWSxFQUFFLElBQW1CO0lBQzVELE9BQU8sQ0FBQyxHQUFHLEVBQUU7UUFDVCxRQUFRLElBQUksRUFBRTtZQUNWLEtBQUssb0JBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLGVBQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDM0QsS0FBSyxvQkFBYSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNyRSxLQUFLLG9CQUFhLENBQUMsZUFBZSxDQUFDLENBQUMsT0FBTyxlQUFlLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQ2hGO1FBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQ0FBc0Msb0JBQWEsQ0FBQyxJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxDQUFDO0lBQ2xHLENBQUMsQ0FBeUIsQ0FBQztBQUMvQixDQUFDO0FBRUQsU0FBUyxtQkFBbUIsQ0FBQyxPQUFpQixFQUFFLElBQW1CO0lBQy9ELE9BQU8sQ0FBQyxHQUFHLEVBQUU7UUFDVCxRQUFRLElBQUksRUFBRTtZQUNWLEtBQUssb0JBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLGVBQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLE9BQU8sRUFBRSxDQUFFLENBQUMsQ0FBQztZQUNoRixLQUFLLG9CQUFhLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxZQUFZLEVBQUUsQ0FBRSxFQUFFLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQ2xILEtBQUssb0JBQWEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxPQUFPLGVBQWUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLGdCQUFnQixFQUFFLENBQUUsRUFBRSxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztTQUNqSTtRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsc0NBQXNDLG9CQUFhLENBQUMsSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsQ0FBQztJQUNsRyxDQUFDLENBQXlCLENBQUM7QUFDL0IsQ0FBQztBQUVELGNBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxXQUFXLENBQUM7QUFDOUIsY0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLFdBQVcsQ0FBQztBQUM5QixjQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsb0JBQWEsQ0FBQztBQUVsQyxlQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsWUFBWSxDQUFDO0FBQ2hDLGVBQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxZQUFZLENBQUM7QUFDaEMsZUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLHFCQUFjLENBQUM7QUFFcEMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLGlCQUFpQixDQUFDO0FBQzFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsR0FBRyxpQkFBaUIsQ0FBQztBQUMxQyxXQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcsMEJBQW1CLENBQUM7QUFFOUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxHQUFHLHFCQUFxQixDQUFDO0FBQ2xELGVBQWUsQ0FBQyxRQUFRLENBQUMsR0FBRyxxQkFBcUIsQ0FBQztBQUNsRCxlQUFlLENBQUMsVUFBVSxDQUFDLEdBQUcsOEJBQXVCLENBQUM7QUFFdEQsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLGVBQWUsQ0FBQztBQUN0QyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsZUFBZSxDQUFDO0FBRXRDLFlBQVksQ0FBQyxRQUFRLENBQUMsR0FBRyxrQkFBa0IsQ0FBQztBQUM1QyxZQUFZLENBQUMsUUFBUSxDQUFDLEdBQUcsa0JBQWtCLENBQUM7QUFvQzVDLFNBQVMsWUFBWSxDQUFDLE9BQWdCLEVBQUUsZUFBc0MsSUFBSSxHQUFHLEVBQUUsRUFBRSxtQkFBcUQsSUFBSSxHQUFHLEVBQUU7SUFDbkosTUFBTSxNQUFNLEdBQUcsa0JBQWtCLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0lBQzNFLE9BQU8sSUFBSSxlQUFNLENBQUMsTUFBTSxFQUFFLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxFQUFFLFlBQVksRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0FBQzdGLENBQUM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLEtBQW1CLEVBQUUsT0FBTyxHQUFHLHNCQUFlLENBQUMsRUFBRTtJQUN4RSxPQUFPLElBQUksV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxhQUFhLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDbkcsQ0FBQztBQUVELFNBQVMscUJBQXFCLENBQUMsS0FBdUIsRUFBRSxPQUFPLEdBQUcsc0JBQWUsQ0FBQyxFQUFFO0lBQ2hGLE9BQU8sSUFBSSxlQUFlLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFHLEVBQUUsT0FBTyxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0FBQ3hHLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLENBQVU7SUFDbEMsT0FBTyxJQUFJLFlBQVksQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7QUFDcEQsQ0FBQztBQUVELFNBQVMsZUFBZSxDQUFDLENBQWE7SUFDbEMsT0FBTyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7QUFDcEQsQ0FBQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsS0FBbUI7SUFDekMsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUNiLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxXQUFXLEVBQUUsRUFBRSxFQUMvQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFFLENBQzVCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDNUMsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLEtBQW1CLEVBQUUsT0FBd0I7SUFDaEUsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUNiLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxhQUFhLEVBQUUsRUFBRSxFQUNqQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFFLENBQzlCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQ2xFLENBQUM7QUFFRCxTQUFTLFFBQVEsQ0FBQyxPQUF3QixFQUFFLE1BQXlDO0lBQ2pGLE9BQU8sQ0FBQyxNQUFlLEVBQUUsQ0FBUyxFQUFFLEVBQUU7UUFDbEMscURBQXFEO1FBQ3JELG1EQUFtRDtRQUNuRCxnQ0FBZ0M7UUFDaEMsSUFBSSxPQUFPLEdBQUcsc0JBQWUsQ0FBQyxFQUFFLEVBQUU7WUFDOUIsTUFBTSxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ2xDO1FBQ0QsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDMUIsQ0FBQyxDQUFDO0FBQ04sQ0FBQztBQUVELFNBQVMsa0JBQWtCLENBQUMsTUFBZSxFQUFFLFlBQW9DLEVBQUUsZ0JBQW1EO0lBQ2xJLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FDYixFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsWUFBWSxFQUFFLEVBQUUsRUFDakMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBRSxDQUM5QixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLGNBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFlBQVksRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7QUFDbEYsQ0FBQztBQUVELFNBQVMsbUJBQW1CLENBQUMsS0FBYSxFQUFFLFlBQW9DLEVBQUUsZ0JBQW1EO0lBQ2pJLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FDYixFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsY0FBYyxFQUFFLEVBQUUsRUFDbEMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBRSxDQUMvQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLGNBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFlBQVksRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7QUFDbEYsQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFDLENBQVMsRUFBRSxZQUFvQyxFQUFFLGdCQUFtRDtJQUVySCxJQUFJLEVBQVUsQ0FBQztJQUNmLElBQUksS0FBbUIsQ0FBQztJQUN4QixJQUFJLElBQW1CLENBQUM7SUFDeEIsSUFBSSxJQUF5QixDQUFDO0lBQzlCLElBQUksUUFBb0IsQ0FBQztJQUN6QixJQUFJLFFBQW9DLENBQUM7SUFDekMsSUFBSSxTQUE0QixDQUFDO0lBRWpDLHNHQUFzRztJQUN0RyxJQUFJLENBQUMsWUFBWSxJQUFJLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRTtRQUNwRSxJQUFJLEdBQUcsZUFBZSxDQUFDLENBQUMsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLEVBQUUsWUFBWSxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQztRQUNsRixLQUFLLEdBQUcsSUFBSSxjQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUM3RTtJQUNELGlCQUFpQjtJQUNqQixpRkFBaUY7SUFDakYsZ0ZBQWdGO0lBQ2hGLDJDQUEyQztTQUN0QyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsUUFBUSxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ2hELGtFQUFrRTtRQUNsRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxZQUFLLEVBQUUsQ0FBQztRQUNwRixZQUFZLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLEdBQUcsZUFBZSxDQUFDLENBQUMsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEUsUUFBUSxHQUFHLElBQUksaUJBQVUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztRQUNoRSxTQUFTLEdBQUcsSUFBSSxjQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRixnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUM7S0FDakQ7SUFDRCxnR0FBZ0c7SUFDaEcseURBQXlEO1NBQ3BEO1FBQ0Qsa0VBQWtFO1FBQ2xFLElBQUksR0FBRyxDQUFDLElBQUksR0FBRyxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLFlBQUssRUFBRSxDQUFDO1FBQ3BGLFFBQVEsR0FBRyxJQUFJLGlCQUFVLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQ2pGLFNBQVMsR0FBRyxJQUFJLGNBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFHLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xGLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQyxDQUFDO0tBQ3JEO0lBQ0QsT0FBTyxLQUFLLElBQUksSUFBSSxDQUFDO0FBQ3pCLENBQUM7QUFFRCxTQUFTLG9CQUFvQixDQUFDLE1BQWdDO0lBQzFELE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO0lBQ3ZDLElBQUksTUFBTSxFQUFFO1FBQ1IsS0FBSyxJQUFJLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHO1lBQzFFLElBQUksQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLElBQUksRUFBRTtnQkFDbkUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEtBQUssRUFBRyxDQUFDLENBQUM7YUFDakM7U0FDSjtLQUNKO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDaEIsQ0FBQztBQUVELFNBQVMsZUFBZSxDQUFDLEtBQVc7SUFDaEMsT0FBTyxJQUFJLFVBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBaUIsQ0FBQyxDQUFDO0FBQ3RFLENBQUM7QUFFRCxTQUFTLGVBQWUsQ0FBQyxDQUFTLEVBQUUsUUFBa0I7SUFFbEQsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBRTVCLFFBQVEsTUFBTSxFQUFFO1FBQ1osS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUksT0FBTyxJQUFJLGVBQVEsRUFBRSxDQUFDO1FBQ3pDLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFJLE9BQU8sSUFBSSxXQUFJLEVBQUUsQ0FBQztRQUNyQyxLQUFLLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBRSxPQUFPLElBQUksYUFBTSxFQUFFLENBQUM7UUFDdkMsS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUksT0FBTyxJQUFJLFdBQUksRUFBRSxDQUFDO1FBQ3JDLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFJLE9BQU8sSUFBSSxXQUFJLEVBQUUsQ0FBQztRQUNyQyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBSSxPQUFPLElBQUksV0FBSSxDQUFDLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEQsS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxJQUFJLGFBQU0sQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDLENBQUM7S0FDeEQ7SUFFRCxRQUFRLE1BQU0sRUFBRTtRQUNaLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ1gsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUUsQ0FBQztZQUM5RCxPQUFPLElBQUksVUFBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztTQUM5QztRQUNELEtBQUssSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ3JCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFFLENBQUM7WUFDeEUsT0FBTyxJQUFJLFlBQUssQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztTQUNuQztRQUNELEtBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2YsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUUsQ0FBQztZQUNsRSxPQUFPLElBQUksY0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztTQUNoRDtRQUNELEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ1osTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUUsQ0FBQztZQUMvRCxPQUFPLElBQUksWUFBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1NBQzlCO1FBQ0QsS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDWixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBRSxDQUFDO1lBQy9ELE9BQU8sSUFBSSxXQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQWtCLENBQUMsQ0FBQztTQUMzRDtRQUNELEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2pCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFFLENBQUM7WUFDcEUsT0FBTyxJQUFJLGdCQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1NBQ2hEO1FBQ0QsS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDaEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUUsQ0FBQztZQUNuRSxPQUFPLElBQUksZUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1NBQ2pDO1FBQ0QsS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDYixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBRSxDQUFDO1lBQ2hFLE9BQU8sSUFBSSxZQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxZQUFZLEVBQUUsSUFBSSxFQUFFLEVBQUUsUUFBUSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1NBQ3RFO1FBQ0QsS0FBSyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDdkIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLENBQUUsQ0FBQztZQUMxRSxPQUFPLElBQUksc0JBQWUsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztTQUM3QztRQUNELEtBQUssSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ3JCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFFLENBQUM7WUFDeEUsT0FBTyxJQUFJLG9CQUFhLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDL0Q7UUFDRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNYLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFFLENBQUM7WUFDOUQsT0FBTyxJQUFJLFdBQUksQ0FBQyxRQUFRLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1NBQ25EO0tBQ0o7SUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLHVCQUF1QixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQztBQUN4RSxDQUFDO0FBRUQsU0FBUyxZQUFZLENBQUMsQ0FBVSxFQUFFLE1BQWM7SUFFNUMsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLGNBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFbEUsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7SUFFbEQsTUFBTSxrQkFBa0IsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBRXZFLE1BQU0sY0FBYyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hFLE9BQU8sQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3RFLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ25DLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ25DLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0IsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDekIsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDM0IsT0FBTyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFUixPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZCLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLGtCQUFrQixDQUFDLENBQUM7SUFDekMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUV4RixJQUFJLGNBQWMsS0FBSyxDQUFDLENBQUMsRUFBRTtRQUFFLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUM7S0FBRTtJQUU1RSxPQUFPLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEMsQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFDLENBQVUsRUFBRSxLQUFZO0lBRXpDLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLElBQUksZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFFMUIsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztJQUN0QixJQUFJLE1BQU0sR0FBZSxLQUFLLENBQUMsTUFBTSxDQUFDO0lBRXRDLElBQUksQ0FBQyxlQUFRLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQzlCLFVBQVUsR0FBRyx3QkFBYSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFFLENBQUM7S0FDOUM7U0FBTTtRQUNILE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQztRQUNoQyxnQkFBZ0IsR0FBRyx3QkFBYSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFFLENBQUM7UUFDakQsVUFBVSxHQUFHLHdCQUFhLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFFLENBQUM7S0FDekQ7SUFFRCxNQUFNLFlBQVksR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBUSxFQUFFLEVBQUUsQ0FBQyxjQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pGLE1BQU0sb0JBQW9CLEdBQUcsTUFBTSxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUUxRSxNQUFNLGNBQWMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RSxNQUFNLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNwRSxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNuQyxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNuQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNCLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3pCLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzNCLE9BQU8sU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRVIsSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFO1FBQ1osVUFBVSxHQUFHLENBQUMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQzNDO0lBRUQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNyQixNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUM5QixNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUM5QixNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0lBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7SUFFeEMsSUFBSSxVQUFVLEtBQUssQ0FBQyxDQUFDLEVBQUU7UUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztLQUFFO0lBQ3pELElBQUksZ0JBQWdCLEtBQUssQ0FBQyxDQUFDLEVBQUU7UUFBRSxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0tBQUU7SUFDM0UsSUFBSSxjQUFjLEtBQUssQ0FBQyxDQUFDLEVBQUU7UUFBRSxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFDO0tBQUU7SUFFM0UsT0FBTyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlCLENBQUM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLENBQVUsRUFBRSxXQUF3QjtJQUUzRCxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztJQUN0QyxNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQztJQUUxQyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUMvQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRS9ELE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBRXhDLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ25ELE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFdEUsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7SUFFMUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMzRCxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0lBQzVDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLG1CQUFtQixDQUFDLENBQUM7SUFDaEQsT0FBTyxZQUFZLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzFDLENBQUM7QUFFRCxTQUFTLHFCQUFxQixDQUFDLENBQVUsRUFBRSxlQUFnQztJQUN2RSxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDL0QsZ0JBQWdCLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDekMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0QsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDeEQsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUN4QyxPQUFPLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xELENBQUM7QUFFRCxTQUFTLGVBQWUsQ0FBQyxDQUFVLEVBQUUsSUFBZTtJQUNoRCxPQUFPLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hHLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLENBQVUsRUFBRSxJQUFrQjtJQUN0RCxPQUFPLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZGLENBQUM7QUFFRCxNQUFNLHNCQUFzQixHQUFHLENBQUM7SUFDNUIsTUFBTSxNQUFNLEdBQUcsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEMsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDL0QsNkNBQTZDO0lBQzdDLE9BQU8sSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxFQUFFLENBQUMiLCJmaWxlIjoiaXBjL21ldGFkYXRhL21lc3NhZ2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgZmxhdGJ1ZmZlcnMgfSBmcm9tICdmbGF0YnVmZmVycyc7XG5pbXBvcnQgKiBhcyBTY2hlbWFfIGZyb20gJy4uLy4uL2ZiL1NjaGVtYSc7XG5pbXBvcnQgKiBhcyBNZXNzYWdlXyBmcm9tICcuLi8uLi9mYi9NZXNzYWdlJztcblxuaW1wb3J0IHsgU2NoZW1hLCBGaWVsZCB9IGZyb20gJy4uLy4uL3NjaGVtYSc7XG5pbXBvcnQgeyB0b1VpbnQ4QXJyYXkgfSBmcm9tICcuLi8uLi91dGlsL2J1ZmZlcic7XG5pbXBvcnQgeyBBcnJheUJ1ZmZlclZpZXdJbnB1dCB9IGZyb20gJy4uLy4uL3V0aWwvYnVmZmVyJztcbmltcG9ydCB7IE1lc3NhZ2VIZWFkZXIsIE1ldGFkYXRhVmVyc2lvbiB9IGZyb20gJy4uLy4uL2VudW0nO1xuaW1wb3J0IHsgaW5zdGFuY2UgYXMgdHlwZUFzc2VtYmxlciB9IGZyb20gJy4uLy4uL3Zpc2l0b3IvdHlwZWFzc2VtYmxlcic7XG5pbXBvcnQgeyBmaWVsZEZyb21KU09OLCBzY2hlbWFGcm9tSlNPTiwgcmVjb3JkQmF0Y2hGcm9tSlNPTiwgZGljdGlvbmFyeUJhdGNoRnJvbUpTT04gfSBmcm9tICcuL2pzb24nO1xuXG5pbXBvcnQgTG9uZyA9IGZsYXRidWZmZXJzLkxvbmc7XG5pbXBvcnQgQnVpbGRlciA9IGZsYXRidWZmZXJzLkJ1aWxkZXI7XG5pbXBvcnQgQnl0ZUJ1ZmZlciA9IGZsYXRidWZmZXJzLkJ5dGVCdWZmZXI7XG5pbXBvcnQgX0ludCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkludDtcbmltcG9ydCBUeXBlID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVHlwZTtcbmltcG9ydCBfRmllbGQgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaWVsZDtcbmltcG9ydCBfU2NoZW1hID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuU2NoZW1hO1xuaW1wb3J0IF9CdWZmZXIgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5CdWZmZXI7XG5pbXBvcnQgX01lc3NhZ2UgPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTWVzc2FnZTtcbmltcG9ydCBfS2V5VmFsdWUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5LZXlWYWx1ZTtcbmltcG9ydCBfRmllbGROb2RlID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpZWxkTm9kZTtcbmltcG9ydCBfRW5kaWFubmVzcyA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkVuZGlhbm5lc3M7XG5pbXBvcnQgX1JlY29yZEJhdGNoID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlJlY29yZEJhdGNoO1xuaW1wb3J0IF9EaWN0aW9uYXJ5QmF0Y2ggPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGljdGlvbmFyeUJhdGNoO1xuaW1wb3J0IF9EaWN0aW9uYXJ5RW5jb2RpbmcgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EaWN0aW9uYXJ5RW5jb2Rpbmc7XG5cbmltcG9ydCB7XG4gICAgRGF0YVR5cGUsIERpY3Rpb25hcnksIFRpbWVCaXRXaWR0aCxcbiAgICBVdGY4LCBCaW5hcnksIERlY2ltYWwsIEZpeGVkU2l6ZUJpbmFyeSxcbiAgICBMaXN0LCBGaXhlZFNpemVMaXN0LCBNYXBfLCBTdHJ1Y3QsIFVuaW9uLFxuICAgIEJvb2wsIE51bGwsIEludCwgRmxvYXQsIERhdGVfLCBUaW1lLCBJbnRlcnZhbCwgVGltZXN0YW1wLCBJbnRCaXRXaWR0aCwgSW50MzIsIFRLZXlzLFxufSBmcm9tICcuLi8uLi90eXBlJztcblxuLyoqXG4gKiBAaWdub3JlXG4gKi9cbmV4cG9ydCBjbGFzcyBNZXNzYWdlPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyID0gYW55PiB7XG5cbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGZyb21KU09OPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyPihtc2c6IGFueSwgaGVhZGVyVHlwZTogVCk6IE1lc3NhZ2U8VD4ge1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gbmV3IE1lc3NhZ2UoMCwgTWV0YWRhdGFWZXJzaW9uLlY0LCBoZWFkZXJUeXBlKTtcbiAgICAgICAgbWVzc2FnZS5fY3JlYXRlSGVhZGVyID0gbWVzc2FnZUhlYWRlckZyb21KU09OKG1zZywgaGVhZGVyVHlwZSk7XG4gICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgIH1cblxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZGVjb2RlKGJ1ZjogQXJyYXlCdWZmZXJWaWV3SW5wdXQpIHtcbiAgICAgICAgYnVmID0gbmV3IEJ5dGVCdWZmZXIodG9VaW50OEFycmF5KGJ1ZikpO1xuICAgICAgICBjb25zdCBfbWVzc2FnZSA9IF9NZXNzYWdlLmdldFJvb3RBc01lc3NhZ2UoYnVmKTtcbiAgICAgICAgY29uc3QgYm9keUxlbmd0aDogTG9uZyA9IF9tZXNzYWdlLmJvZHlMZW5ndGgoKSE7XG4gICAgICAgIGNvbnN0IHZlcnNpb246IE1ldGFkYXRhVmVyc2lvbiA9IF9tZXNzYWdlLnZlcnNpb24oKTtcbiAgICAgICAgY29uc3QgaGVhZGVyVHlwZTogTWVzc2FnZUhlYWRlciA9IF9tZXNzYWdlLmhlYWRlclR5cGUoKTtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IG5ldyBNZXNzYWdlKGJvZHlMZW5ndGgsIHZlcnNpb24sIGhlYWRlclR5cGUpO1xuICAgICAgICBtZXNzYWdlLl9jcmVhdGVIZWFkZXIgPSBkZWNvZGVNZXNzYWdlSGVhZGVyKF9tZXNzYWdlLCBoZWFkZXJUeXBlKTtcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgfVxuXG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBlbmNvZGU8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KG1lc3NhZ2U6IE1lc3NhZ2U8VD4pIHtcbiAgICAgICAgbGV0IGIgPSBuZXcgQnVpbGRlcigpLCBoZWFkZXJPZmZzZXQgPSAtMTtcbiAgICAgICAgaWYgKG1lc3NhZ2UuaXNTY2hlbWEoKSkge1xuICAgICAgICAgICAgaGVhZGVyT2Zmc2V0ID0gU2NoZW1hLmVuY29kZShiLCBtZXNzYWdlLmhlYWRlcigpIGFzIFNjaGVtYSk7XG4gICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5pc1JlY29yZEJhdGNoKCkpIHtcbiAgICAgICAgICAgIGhlYWRlck9mZnNldCA9IFJlY29yZEJhdGNoLmVuY29kZShiLCBtZXNzYWdlLmhlYWRlcigpIGFzIFJlY29yZEJhdGNoKTtcbiAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmlzRGljdGlvbmFyeUJhdGNoKCkpIHtcbiAgICAgICAgICAgIGhlYWRlck9mZnNldCA9IERpY3Rpb25hcnlCYXRjaC5lbmNvZGUoYiwgbWVzc2FnZS5oZWFkZXIoKSBhcyBEaWN0aW9uYXJ5QmF0Y2gpO1xuICAgICAgICB9XG4gICAgICAgIF9NZXNzYWdlLnN0YXJ0TWVzc2FnZShiKTtcbiAgICAgICAgX01lc3NhZ2UuYWRkVmVyc2lvbihiLCBNZXRhZGF0YVZlcnNpb24uVjQpO1xuICAgICAgICBfTWVzc2FnZS5hZGRIZWFkZXIoYiwgaGVhZGVyT2Zmc2V0KTtcbiAgICAgICAgX01lc3NhZ2UuYWRkSGVhZGVyVHlwZShiLCBtZXNzYWdlLmhlYWRlclR5cGUpO1xuICAgICAgICBfTWVzc2FnZS5hZGRCb2R5TGVuZ3RoKGIsIG5ldyBMb25nKG1lc3NhZ2UuYm9keUxlbmd0aCwgMCkpO1xuICAgICAgICBfTWVzc2FnZS5maW5pc2hNZXNzYWdlQnVmZmVyKGIsIF9NZXNzYWdlLmVuZE1lc3NhZ2UoYikpO1xuICAgICAgICByZXR1cm4gYi5hc1VpbnQ4QXJyYXkoKTtcbiAgICB9XG5cbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGZyb20oaGVhZGVyOiBTY2hlbWEgfCBSZWNvcmRCYXRjaCB8IERpY3Rpb25hcnlCYXRjaCwgYm9keUxlbmd0aCA9IDApIHtcbiAgICAgICAgaWYgKGhlYWRlciBpbnN0YW5jZW9mIFNjaGVtYSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNZXNzYWdlKDAsIE1ldGFkYXRhVmVyc2lvbi5WNCwgTWVzc2FnZUhlYWRlci5TY2hlbWEsIGhlYWRlcik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhlYWRlciBpbnN0YW5jZW9mIFJlY29yZEJhdGNoKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1lc3NhZ2UoYm9keUxlbmd0aCwgTWV0YWRhdGFWZXJzaW9uLlY0LCBNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoLCBoZWFkZXIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChoZWFkZXIgaW5zdGFuY2VvZiBEaWN0aW9uYXJ5QmF0Y2gpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgTWVzc2FnZShib2R5TGVuZ3RoLCBNZXRhZGF0YVZlcnNpb24uVjQsIE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoLCBoZWFkZXIpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5yZWNvZ25pemVkIE1lc3NhZ2UgaGVhZGVyOiAke2hlYWRlcn1gKTtcbiAgICB9XG5cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIGJvZHk6IFVpbnQ4QXJyYXk7XG4gICAgcHJvdGVjdGVkIF9oZWFkZXJUeXBlOiBUO1xuICAgIHByb3RlY3RlZCBfYm9keUxlbmd0aDogbnVtYmVyO1xuICAgIHByb3RlY3RlZCBfdmVyc2lvbjogTWV0YWRhdGFWZXJzaW9uO1xuICAgIHB1YmxpYyBnZXQgdHlwZSgpIHsgcmV0dXJuIHRoaXMuaGVhZGVyVHlwZTsgfVxuICAgIHB1YmxpYyBnZXQgdmVyc2lvbigpIHsgcmV0dXJuIHRoaXMuX3ZlcnNpb247IH1cbiAgICBwdWJsaWMgZ2V0IGhlYWRlclR5cGUoKSB7IHJldHVybiB0aGlzLl9oZWFkZXJUeXBlOyB9XG4gICAgcHVibGljIGdldCBib2R5TGVuZ3RoKCkgeyByZXR1cm4gdGhpcy5fYm9keUxlbmd0aDsgfVxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwcm90ZWN0ZWQgX2NyZWF0ZUhlYWRlcjogTWVzc2FnZUhlYWRlckRlY29kZXI7XG4gICAgcHVibGljIGhlYWRlcigpIHsgcmV0dXJuIHRoaXMuX2NyZWF0ZUhlYWRlcjxUPigpOyB9XG4gICAgcHVibGljIGlzU2NoZW1hKCk6IHRoaXMgaXMgTWVzc2FnZTxNZXNzYWdlSGVhZGVyLlNjaGVtYT4geyByZXR1cm4gdGhpcy5oZWFkZXJUeXBlID09PSBNZXNzYWdlSGVhZGVyLlNjaGVtYTsgfVxuICAgIHB1YmxpYyBpc1JlY29yZEJhdGNoKCk6IHRoaXMgaXMgTWVzc2FnZTxNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoPiB7IHJldHVybiB0aGlzLmhlYWRlclR5cGUgPT09IE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2g7IH1cbiAgICBwdWJsaWMgaXNEaWN0aW9uYXJ5QmF0Y2goKTogdGhpcyBpcyBNZXNzYWdlPE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoPiB7IHJldHVybiB0aGlzLmhlYWRlclR5cGUgPT09IE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoOyB9XG5cbiAgICBjb25zdHJ1Y3Rvcihib2R5TGVuZ3RoOiBMb25nIHwgbnVtYmVyLCB2ZXJzaW9uOiBNZXRhZGF0YVZlcnNpb24sIGhlYWRlclR5cGU6IFQsIGhlYWRlcj86IGFueSkge1xuICAgICAgICB0aGlzLl92ZXJzaW9uID0gdmVyc2lvbjtcbiAgICAgICAgdGhpcy5faGVhZGVyVHlwZSA9IGhlYWRlclR5cGU7XG4gICAgICAgIHRoaXMuYm9keSA9IG5ldyBVaW50OEFycmF5KDApO1xuICAgICAgICBoZWFkZXIgJiYgKHRoaXMuX2NyZWF0ZUhlYWRlciA9ICgpID0+IGhlYWRlcik7XG4gICAgICAgIHRoaXMuX2JvZHlMZW5ndGggPSB0eXBlb2YgYm9keUxlbmd0aCA9PT0gJ251bWJlcicgPyBib2R5TGVuZ3RoIDogYm9keUxlbmd0aC5sb3c7XG4gICAgfVxufVxuXG4vKipcbiAqIEBpZ25vcmVcbiAqL1xuZXhwb3J0IGNsYXNzIFJlY29yZEJhdGNoIHtcbiAgICBwcm90ZWN0ZWQgX2xlbmd0aDogbnVtYmVyO1xuICAgIHByb3RlY3RlZCBfbm9kZXM6IEZpZWxkTm9kZVtdO1xuICAgIHByb3RlY3RlZCBfYnVmZmVyczogQnVmZmVyUmVnaW9uW107XG4gICAgcHVibGljIGdldCBub2RlcygpIHsgcmV0dXJuIHRoaXMuX25vZGVzOyB9XG4gICAgcHVibGljIGdldCBsZW5ndGgoKSB7IHJldHVybiB0aGlzLl9sZW5ndGg7IH1cbiAgICBwdWJsaWMgZ2V0IGJ1ZmZlcnMoKSB7IHJldHVybiB0aGlzLl9idWZmZXJzOyB9XG4gICAgY29uc3RydWN0b3IobGVuZ3RoOiBMb25nIHwgbnVtYmVyLCBub2RlczogRmllbGROb2RlW10sIGJ1ZmZlcnM6IEJ1ZmZlclJlZ2lvbltdKSB7XG4gICAgICAgIHRoaXMuX25vZGVzID0gbm9kZXM7XG4gICAgICAgIHRoaXMuX2J1ZmZlcnMgPSBidWZmZXJzO1xuICAgICAgICB0aGlzLl9sZW5ndGggPSB0eXBlb2YgbGVuZ3RoID09PSAnbnVtYmVyJyA/IGxlbmd0aCA6IGxlbmd0aC5sb3c7XG4gICAgfVxufVxuXG4vKipcbiAqIEBpZ25vcmVcbiAqL1xuZXhwb3J0IGNsYXNzIERpY3Rpb25hcnlCYXRjaCB7XG5cbiAgICBwcm90ZWN0ZWQgX2lkOiBudW1iZXI7XG4gICAgcHJvdGVjdGVkIF9pc0RlbHRhOiBib29sZWFuO1xuICAgIHByb3RlY3RlZCBfZGF0YTogUmVjb3JkQmF0Y2g7XG4gICAgcHVibGljIGdldCBpZCgpIHsgcmV0dXJuIHRoaXMuX2lkOyB9XG4gICAgcHVibGljIGdldCBkYXRhKCkgeyByZXR1cm4gdGhpcy5fZGF0YTsgfVxuICAgIHB1YmxpYyBnZXQgaXNEZWx0YSgpIHsgcmV0dXJuIHRoaXMuX2lzRGVsdGE7IH1cbiAgICBwdWJsaWMgZ2V0IGxlbmd0aCgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5kYXRhLmxlbmd0aDsgfVxuICAgIHB1YmxpYyBnZXQgbm9kZXMoKTogRmllbGROb2RlW10geyByZXR1cm4gdGhpcy5kYXRhLm5vZGVzOyB9XG4gICAgcHVibGljIGdldCBidWZmZXJzKCk6IEJ1ZmZlclJlZ2lvbltdIHsgcmV0dXJuIHRoaXMuZGF0YS5idWZmZXJzOyB9XG5cbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBSZWNvcmRCYXRjaCwgaWQ6IExvbmcgfCBudW1iZXIsIGlzRGVsdGE6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgICAgICB0aGlzLl9kYXRhID0gZGF0YTtcbiAgICAgICAgdGhpcy5faXNEZWx0YSA9IGlzRGVsdGE7XG4gICAgICAgIHRoaXMuX2lkID0gdHlwZW9mIGlkID09PSAnbnVtYmVyJyA/IGlkIDogaWQubG93O1xuICAgIH1cbn1cblxuLyoqXG4gKiBAaWdub3JlXG4gKi9cbmV4cG9ydCBjbGFzcyBCdWZmZXJSZWdpb24ge1xuICAgIHB1YmxpYyBvZmZzZXQ6IG51bWJlcjtcbiAgICBwdWJsaWMgbGVuZ3RoOiBudW1iZXI7XG4gICAgY29uc3RydWN0b3Iob2Zmc2V0OiBMb25nIHwgbnVtYmVyLCBsZW5ndGg6IExvbmcgfCBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5vZmZzZXQgPSB0eXBlb2Ygb2Zmc2V0ID09PSAnbnVtYmVyJyA/IG9mZnNldCA6IG9mZnNldC5sb3c7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gdHlwZW9mIGxlbmd0aCA9PT0gJ251bWJlcicgPyBsZW5ndGggOiBsZW5ndGgubG93O1xuICAgIH1cbn1cblxuLyoqXG4gKiBAaWdub3JlXG4gKi9cbmV4cG9ydCBjbGFzcyBGaWVsZE5vZGUge1xuICAgIHB1YmxpYyBsZW5ndGg6IG51bWJlcjtcbiAgICBwdWJsaWMgbnVsbENvdW50OiBudW1iZXI7XG4gICAgY29uc3RydWN0b3IobGVuZ3RoOiBMb25nIHwgbnVtYmVyLCBudWxsQ291bnQ6IExvbmcgfCBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5sZW5ndGggPSB0eXBlb2YgbGVuZ3RoID09PSAnbnVtYmVyJyA/IGxlbmd0aCA6IGxlbmd0aC5sb3c7XG4gICAgICAgIHRoaXMubnVsbENvdW50ID0gdHlwZW9mIG51bGxDb3VudCA9PT0gJ251bWJlcicgPyBudWxsQ291bnQgOiBudWxsQ291bnQubG93O1xuICAgIH1cbn1cblxuZnVuY3Rpb24gbWVzc2FnZUhlYWRlckZyb21KU09OKG1lc3NhZ2U6IGFueSwgdHlwZTogTWVzc2FnZUhlYWRlcikge1xuICAgIHJldHVybiAoKCkgPT4ge1xuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgTWVzc2FnZUhlYWRlci5TY2hlbWE6IHJldHVybiBTY2hlbWEuZnJvbUpTT04obWVzc2FnZSk7XG4gICAgICAgICAgICBjYXNlIE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2g6IHJldHVybiBSZWNvcmRCYXRjaC5mcm9tSlNPTihtZXNzYWdlKTtcbiAgICAgICAgICAgIGNhc2UgTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2g6IHJldHVybiBEaWN0aW9uYXJ5QmF0Y2guZnJvbUpTT04obWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnJlY29nbml6ZWQgTWVzc2FnZSB0eXBlOiB7IG5hbWU6ICR7TWVzc2FnZUhlYWRlclt0eXBlXX0sIHR5cGU6ICR7dHlwZX0gfWApO1xuICAgIH0pIGFzIE1lc3NhZ2VIZWFkZXJEZWNvZGVyO1xufVxuXG5mdW5jdGlvbiBkZWNvZGVNZXNzYWdlSGVhZGVyKG1lc3NhZ2U6IF9NZXNzYWdlLCB0eXBlOiBNZXNzYWdlSGVhZGVyKSB7XG4gICAgcmV0dXJuICgoKSA9PiB7XG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLlNjaGVtYTogcmV0dXJuIFNjaGVtYS5kZWNvZGUobWVzc2FnZS5oZWFkZXIobmV3IF9TY2hlbWEoKSkhKTtcbiAgICAgICAgICAgIGNhc2UgTWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaDogcmV0dXJuIFJlY29yZEJhdGNoLmRlY29kZShtZXNzYWdlLmhlYWRlcihuZXcgX1JlY29yZEJhdGNoKCkpISwgbWVzc2FnZS52ZXJzaW9uKCkpO1xuICAgICAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaDogcmV0dXJuIERpY3Rpb25hcnlCYXRjaC5kZWNvZGUobWVzc2FnZS5oZWFkZXIobmV3IF9EaWN0aW9uYXJ5QmF0Y2goKSkhLCBtZXNzYWdlLnZlcnNpb24oKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnJlY29nbml6ZWQgTWVzc2FnZSB0eXBlOiB7IG5hbWU6ICR7TWVzc2FnZUhlYWRlclt0eXBlXX0sIHR5cGU6ICR7dHlwZX0gfWApO1xuICAgIH0pIGFzIE1lc3NhZ2VIZWFkZXJEZWNvZGVyO1xufVxuXG5GaWVsZFsnZW5jb2RlJ10gPSBlbmNvZGVGaWVsZDtcbkZpZWxkWydkZWNvZGUnXSA9IGRlY29kZUZpZWxkO1xuRmllbGRbJ2Zyb21KU09OJ10gPSBmaWVsZEZyb21KU09OO1xuXG5TY2hlbWFbJ2VuY29kZSddID0gZW5jb2RlU2NoZW1hO1xuU2NoZW1hWydkZWNvZGUnXSA9IGRlY29kZVNjaGVtYTtcblNjaGVtYVsnZnJvbUpTT04nXSA9IHNjaGVtYUZyb21KU09OO1xuXG5SZWNvcmRCYXRjaFsnZW5jb2RlJ10gPSBlbmNvZGVSZWNvcmRCYXRjaDtcblJlY29yZEJhdGNoWydkZWNvZGUnXSA9IGRlY29kZVJlY29yZEJhdGNoO1xuUmVjb3JkQmF0Y2hbJ2Zyb21KU09OJ10gPSByZWNvcmRCYXRjaEZyb21KU09OO1xuXG5EaWN0aW9uYXJ5QmF0Y2hbJ2VuY29kZSddID0gZW5jb2RlRGljdGlvbmFyeUJhdGNoO1xuRGljdGlvbmFyeUJhdGNoWydkZWNvZGUnXSA9IGRlY29kZURpY3Rpb25hcnlCYXRjaDtcbkRpY3Rpb25hcnlCYXRjaFsnZnJvbUpTT04nXSA9IGRpY3Rpb25hcnlCYXRjaEZyb21KU09OO1xuXG5GaWVsZE5vZGVbJ2VuY29kZSddID0gZW5jb2RlRmllbGROb2RlO1xuRmllbGROb2RlWydkZWNvZGUnXSA9IGRlY29kZUZpZWxkTm9kZTtcblxuQnVmZmVyUmVnaW9uWydlbmNvZGUnXSA9IGVuY29kZUJ1ZmZlclJlZ2lvbjtcbkJ1ZmZlclJlZ2lvblsnZGVjb2RlJ10gPSBkZWNvZGVCdWZmZXJSZWdpb247XG5cbmRlY2xhcmUgbW9kdWxlICcuLi8uLi9zY2hlbWEnIHtcbiAgICBuYW1lc3BhY2UgRmllbGQge1xuICAgICAgICBleHBvcnQgeyBlbmNvZGVGaWVsZCBhcyBlbmNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgZGVjb2RlRmllbGQgYXMgZGVjb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IGZpZWxkRnJvbUpTT04gYXMgZnJvbUpTT04gfTtcbiAgICB9XG4gICAgbmFtZXNwYWNlIFNjaGVtYSB7XG4gICAgICAgIGV4cG9ydCB7IGVuY29kZVNjaGVtYSBhcyBlbmNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgZGVjb2RlU2NoZW1hIGFzIGRlY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBzY2hlbWFGcm9tSlNPTiBhcyBmcm9tSlNPTiB9O1xuICAgIH1cbn1cblxuZGVjbGFyZSBtb2R1bGUgJy4vbWVzc2FnZScge1xuICAgIG5hbWVzcGFjZSBSZWNvcmRCYXRjaCB7XG4gICAgICAgIGV4cG9ydCB7IGVuY29kZVJlY29yZEJhdGNoIGFzIGVuY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBkZWNvZGVSZWNvcmRCYXRjaCBhcyBkZWNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgcmVjb3JkQmF0Y2hGcm9tSlNPTiBhcyBmcm9tSlNPTiB9O1xuICAgIH1cbiAgICBuYW1lc3BhY2UgRGljdGlvbmFyeUJhdGNoIHtcbiAgICAgICAgZXhwb3J0IHsgZW5jb2RlRGljdGlvbmFyeUJhdGNoIGFzIGVuY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBkZWNvZGVEaWN0aW9uYXJ5QmF0Y2ggYXMgZGVjb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IGRpY3Rpb25hcnlCYXRjaEZyb21KU09OIGFzIGZyb21KU09OIH07XG4gICAgfVxuICAgIG5hbWVzcGFjZSBGaWVsZE5vZGUge1xuICAgICAgICBleHBvcnQgeyBlbmNvZGVGaWVsZE5vZGUgYXMgZW5jb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IGRlY29kZUZpZWxkTm9kZSBhcyBkZWNvZGUgfTtcbiAgICB9XG4gICAgbmFtZXNwYWNlIEJ1ZmZlclJlZ2lvbiB7XG4gICAgICAgIGV4cG9ydCB7IGVuY29kZUJ1ZmZlclJlZ2lvbiBhcyBlbmNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgZGVjb2RlQnVmZmVyUmVnaW9uIGFzIGRlY29kZSB9O1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZGVjb2RlU2NoZW1hKF9zY2hlbWE6IF9TY2hlbWEsIGRpY3Rpb25hcmllczogTWFwPG51bWJlciwgRGF0YVR5cGU+ID0gbmV3IE1hcCgpLCBkaWN0aW9uYXJ5RmllbGRzOiBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5PltdPiA9IG5ldyBNYXAoKSkge1xuICAgIGNvbnN0IGZpZWxkcyA9IGRlY29kZVNjaGVtYUZpZWxkcyhfc2NoZW1hLCBkaWN0aW9uYXJpZXMsIGRpY3Rpb25hcnlGaWVsZHMpO1xuICAgIHJldHVybiBuZXcgU2NoZW1hKGZpZWxkcywgZGVjb2RlQ3VzdG9tTWV0YWRhdGEoX3NjaGVtYSksIGRpY3Rpb25hcmllcywgZGljdGlvbmFyeUZpZWxkcyk7XG59XG5cbmZ1bmN0aW9uIGRlY29kZVJlY29yZEJhdGNoKGJhdGNoOiBfUmVjb3JkQmF0Y2gsIHZlcnNpb24gPSBNZXRhZGF0YVZlcnNpb24uVjQpIHtcbiAgICByZXR1cm4gbmV3IFJlY29yZEJhdGNoKGJhdGNoLmxlbmd0aCgpLCBkZWNvZGVGaWVsZE5vZGVzKGJhdGNoKSwgZGVjb2RlQnVmZmVycyhiYXRjaCwgdmVyc2lvbikpO1xufVxuXG5mdW5jdGlvbiBkZWNvZGVEaWN0aW9uYXJ5QmF0Y2goYmF0Y2g6IF9EaWN0aW9uYXJ5QmF0Y2gsIHZlcnNpb24gPSBNZXRhZGF0YVZlcnNpb24uVjQpIHtcbiAgICByZXR1cm4gbmV3IERpY3Rpb25hcnlCYXRjaChSZWNvcmRCYXRjaC5kZWNvZGUoYmF0Y2guZGF0YSgpISwgdmVyc2lvbiksIGJhdGNoLmlkKCksIGJhdGNoLmlzRGVsdGEoKSk7XG59XG5cbmZ1bmN0aW9uIGRlY29kZUJ1ZmZlclJlZ2lvbihiOiBfQnVmZmVyKSB7XG4gICAgcmV0dXJuIG5ldyBCdWZmZXJSZWdpb24oYi5vZmZzZXQoKSwgYi5sZW5ndGgoKSk7XG59XG5cbmZ1bmN0aW9uIGRlY29kZUZpZWxkTm9kZShmOiBfRmllbGROb2RlKSB7XG4gICAgcmV0dXJuIG5ldyBGaWVsZE5vZGUoZi5sZW5ndGgoKSwgZi5udWxsQ291bnQoKSk7XG59XG5cbmZ1bmN0aW9uIGRlY29kZUZpZWxkTm9kZXMoYmF0Y2g6IF9SZWNvcmRCYXRjaCkge1xuICAgIHJldHVybiBBcnJheS5mcm9tKFxuICAgICAgICB7IGxlbmd0aDogYmF0Y2gubm9kZXNMZW5ndGgoKSB9LFxuICAgICAgICAoXywgaSkgPT4gYmF0Y2gubm9kZXMoaSkhXG4gICAgKS5maWx0ZXIoQm9vbGVhbikubWFwKEZpZWxkTm9kZS5kZWNvZGUpO1xufVxuXG5mdW5jdGlvbiBkZWNvZGVCdWZmZXJzKGJhdGNoOiBfUmVjb3JkQmF0Y2gsIHZlcnNpb246IE1ldGFkYXRhVmVyc2lvbikge1xuICAgIHJldHVybiBBcnJheS5mcm9tKFxuICAgICAgICB7IGxlbmd0aDogYmF0Y2guYnVmZmVyc0xlbmd0aCgpIH0sXG4gICAgICAgIChfLCBpKSA9PiBiYXRjaC5idWZmZXJzKGkpIVxuICAgICkuZmlsdGVyKEJvb2xlYW4pLm1hcCh2M0NvbXBhdCh2ZXJzaW9uLCBCdWZmZXJSZWdpb24uZGVjb2RlKSk7XG59XG5cbmZ1bmN0aW9uIHYzQ29tcGF0KHZlcnNpb246IE1ldGFkYXRhVmVyc2lvbiwgZGVjb2RlOiAoYnVmZmVyOiBfQnVmZmVyKSA9PiBCdWZmZXJSZWdpb24pIHtcbiAgICByZXR1cm4gKGJ1ZmZlcjogX0J1ZmZlciwgaTogbnVtYmVyKSA9PiB7XG4gICAgICAgIC8vIElmIHRoaXMgQXJyb3cgYnVmZmVyIHdhcyB3cml0dGVuIGJlZm9yZSB2ZXJzaW9uIDQsXG4gICAgICAgIC8vIGFkdmFuY2UgdGhlIGJ1ZmZlcidzIGJiX3BvcyA4IGJ5dGVzIHRvIHNraXAgcGFzdFxuICAgICAgICAvLyB0aGUgbm93LXJlbW92ZWQgcGFnZV9pZCBmaWVsZFxuICAgICAgICBpZiAodmVyc2lvbiA8IE1ldGFkYXRhVmVyc2lvbi5WNCkge1xuICAgICAgICAgICAgYnVmZmVyLmJiX3BvcyArPSAoOCAqIChpICsgMSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkZWNvZGUoYnVmZmVyKTtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBkZWNvZGVTY2hlbWFGaWVsZHMoc2NoZW1hOiBfU2NoZW1hLCBkaWN0aW9uYXJpZXM/OiBNYXA8bnVtYmVyLCBEYXRhVHlwZT4sIGRpY3Rpb25hcnlGaWVsZHM/OiBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5PltdPikge1xuICAgIHJldHVybiBBcnJheS5mcm9tKFxuICAgICAgICB7IGxlbmd0aDogc2NoZW1hLmZpZWxkc0xlbmd0aCgpIH0sXG4gICAgICAgIChfLCBpKSA9PiBzY2hlbWEuZmllbGRzKGkpIVxuICAgICkuZmlsdGVyKEJvb2xlYW4pLm1hcCgoZikgPT4gRmllbGQuZGVjb2RlKGYsIGRpY3Rpb25hcmllcywgZGljdGlvbmFyeUZpZWxkcykpO1xufVxuXG5mdW5jdGlvbiBkZWNvZGVGaWVsZENoaWxkcmVuKGZpZWxkOiBfRmllbGQsIGRpY3Rpb25hcmllcz86IE1hcDxudW1iZXIsIERhdGFUeXBlPiwgZGljdGlvbmFyeUZpZWxkcz86IE1hcDxudW1iZXIsIEZpZWxkPERpY3Rpb25hcnk+W10+KTogRmllbGRbXSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20oXG4gICAgICAgIHsgbGVuZ3RoOiBmaWVsZC5jaGlsZHJlbkxlbmd0aCgpIH0sXG4gICAgICAgIChfLCBpKSA9PiBmaWVsZC5jaGlsZHJlbihpKSFcbiAgICApLmZpbHRlcihCb29sZWFuKS5tYXAoKGYpID0+IEZpZWxkLmRlY29kZShmLCBkaWN0aW9uYXJpZXMsIGRpY3Rpb25hcnlGaWVsZHMpKTtcbn1cblxuZnVuY3Rpb24gZGVjb2RlRmllbGQoZjogX0ZpZWxkLCBkaWN0aW9uYXJpZXM/OiBNYXA8bnVtYmVyLCBEYXRhVHlwZT4sIGRpY3Rpb25hcnlGaWVsZHM/OiBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5PltdPikge1xuXG4gICAgbGV0IGlkOiBudW1iZXI7XG4gICAgbGV0IGZpZWxkOiBGaWVsZCB8IHZvaWQ7XG4gICAgbGV0IHR5cGU6IERhdGFUeXBlPGFueT47XG4gICAgbGV0IGtleXM6IF9JbnQgfCBUS2V5cyB8IG51bGw7XG4gICAgbGV0IGRpY3RUeXBlOiBEaWN0aW9uYXJ5O1xuICAgIGxldCBkaWN0TWV0YTogX0RpY3Rpb25hcnlFbmNvZGluZyB8IG51bGw7XG4gICAgbGV0IGRpY3RGaWVsZDogRmllbGQ8RGljdGlvbmFyeT47XG5cbiAgICAvLyBJZiBubyBkaWN0aW9uYXJ5IGVuY29kaW5nLCBvciBpbiB0aGUgcHJvY2VzcyBvZiBkZWNvZGluZyB0aGUgY2hpbGRyZW4gb2YgYSBkaWN0aW9uYXJ5LWVuY29kZWQgZmllbGRcbiAgICBpZiAoIWRpY3Rpb25hcmllcyB8fCAhZGljdGlvbmFyeUZpZWxkcyB8fCAhKGRpY3RNZXRhID0gZi5kaWN0aW9uYXJ5KCkpKSB7XG4gICAgICAgIHR5cGUgPSBkZWNvZGVGaWVsZFR5cGUoZiwgZGVjb2RlRmllbGRDaGlsZHJlbihmLCBkaWN0aW9uYXJpZXMsIGRpY3Rpb25hcnlGaWVsZHMpKTtcbiAgICAgICAgZmllbGQgPSBuZXcgRmllbGQoZi5uYW1lKCkhLCB0eXBlLCBmLm51bGxhYmxlKCksIGRlY29kZUN1c3RvbU1ldGFkYXRhKGYpKTtcbiAgICB9XG4gICAgLy8gdHNsaW50OmRpc2FibGVcbiAgICAvLyBJZiBkaWN0aW9uYXJ5IGVuY29kZWQgYW5kIHRoZSBmaXJzdCB0aW1lIHdlJ3ZlIHNlZW4gdGhpcyBkaWN0aW9uYXJ5IGlkLCBkZWNvZGVcbiAgICAvLyB0aGUgZGF0YSB0eXBlIGFuZCBjaGlsZCBmaWVsZHMsIHRoZW4gd3JhcCBpbiBhIERpY3Rpb25hcnkgdHlwZSBhbmQgaW5zZXJ0IHRoZVxuICAgIC8vIGRhdGEgdHlwZSBpbnRvIHRoZSBkaWN0aW9uYXJ5IHR5cGVzIG1hcC5cbiAgICBlbHNlIGlmICghZGljdGlvbmFyaWVzLmhhcyhpZCA9IGRpY3RNZXRhLmlkKCkubG93KSkge1xuICAgICAgICAvLyBhIGRpY3Rpb25hcnkgaW5kZXggZGVmYXVsdHMgdG8gc2lnbmVkIDMyIGJpdCBpbnQgaWYgdW5zcGVjaWZpZWRcbiAgICAgICAga2V5cyA9IChrZXlzID0gZGljdE1ldGEuaW5kZXhUeXBlKCkpID8gZGVjb2RlSW5kZXhUeXBlKGtleXMpIGFzIFRLZXlzIDogbmV3IEludDMyKCk7XG4gICAgICAgIGRpY3Rpb25hcmllcy5zZXQoaWQsIHR5cGUgPSBkZWNvZGVGaWVsZFR5cGUoZiwgZGVjb2RlRmllbGRDaGlsZHJlbihmKSkpO1xuICAgICAgICBkaWN0VHlwZSA9IG5ldyBEaWN0aW9uYXJ5KHR5cGUsIGtleXMsIGlkLCBkaWN0TWV0YS5pc09yZGVyZWQoKSk7XG4gICAgICAgIGRpY3RGaWVsZCA9IG5ldyBGaWVsZChmLm5hbWUoKSEsIGRpY3RUeXBlLCBmLm51bGxhYmxlKCksIGRlY29kZUN1c3RvbU1ldGFkYXRhKGYpKTtcbiAgICAgICAgZGljdGlvbmFyeUZpZWxkcy5zZXQoaWQsIFtmaWVsZCA9IGRpY3RGaWVsZF0pO1xuICAgIH1cbiAgICAvLyBJZiBkaWN0aW9uYXJ5IGVuY29kZWQsIGFuZCBoYXZlIGFscmVhZHkgc2VlbiB0aGlzIGRpY3Rpb25hcnkgSWQgaW4gdGhlIHNjaGVtYSwgdGhlbiByZXVzZSB0aGVcbiAgICAvLyBkYXRhIHR5cGUgYW5kIHdyYXAgaW4gYSBuZXcgRGljdGlvbmFyeSB0eXBlIGFuZCBmaWVsZC5cbiAgICBlbHNlIHtcbiAgICAgICAgLy8gYSBkaWN0aW9uYXJ5IGluZGV4IGRlZmF1bHRzIHRvIHNpZ25lZCAzMiBiaXQgaW50IGlmIHVuc3BlY2lmaWVkXG4gICAgICAgIGtleXMgPSAoa2V5cyA9IGRpY3RNZXRhLmluZGV4VHlwZSgpKSA/IGRlY29kZUluZGV4VHlwZShrZXlzKSBhcyBUS2V5cyA6IG5ldyBJbnQzMigpO1xuICAgICAgICBkaWN0VHlwZSA9IG5ldyBEaWN0aW9uYXJ5KGRpY3Rpb25hcmllcy5nZXQoaWQpISwga2V5cywgaWQsIGRpY3RNZXRhLmlzT3JkZXJlZCgpKTtcbiAgICAgICAgZGljdEZpZWxkID0gbmV3IEZpZWxkKGYubmFtZSgpISwgZGljdFR5cGUsIGYubnVsbGFibGUoKSwgZGVjb2RlQ3VzdG9tTWV0YWRhdGEoZikpO1xuICAgICAgICBkaWN0aW9uYXJ5RmllbGRzLmdldChpZCkhLnB1c2goZmllbGQgPSBkaWN0RmllbGQpO1xuICAgIH1cbiAgICByZXR1cm4gZmllbGQgfHwgbnVsbDtcbn1cblxuZnVuY3Rpb24gZGVjb2RlQ3VzdG9tTWV0YWRhdGEocGFyZW50PzogX1NjaGVtYSB8IF9GaWVsZCB8IG51bGwpIHtcbiAgICBjb25zdCBkYXRhID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICBpZiAocGFyZW50KSB7XG4gICAgICAgIGZvciAobGV0IGVudHJ5LCBrZXksIGkgPSAtMSwgbiA9IHBhcmVudC5jdXN0b21NZXRhZGF0YUxlbmd0aCgpIHwgMDsgKytpIDwgbjspIHtcbiAgICAgICAgICAgIGlmICgoZW50cnkgPSBwYXJlbnQuY3VzdG9tTWV0YWRhdGEoaSkpICYmIChrZXkgPSBlbnRyeS5rZXkoKSkgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGRhdGEuc2V0KGtleSwgZW50cnkudmFsdWUoKSEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkYXRhO1xufVxuXG5mdW5jdGlvbiBkZWNvZGVJbmRleFR5cGUoX3R5cGU6IF9JbnQpIHtcbiAgICByZXR1cm4gbmV3IEludChfdHlwZS5pc1NpZ25lZCgpLCBfdHlwZS5iaXRXaWR0aCgpIGFzIEludEJpdFdpZHRoKTtcbn1cblxuZnVuY3Rpb24gZGVjb2RlRmllbGRUeXBlKGY6IF9GaWVsZCwgY2hpbGRyZW4/OiBGaWVsZFtdKTogRGF0YVR5cGU8YW55PiB7XG5cbiAgICBjb25zdCB0eXBlSWQgPSBmLnR5cGVUeXBlKCk7XG5cbiAgICBzd2l0Y2ggKHR5cGVJZCkge1xuICAgICAgICBjYXNlIFR5cGUuTk9ORTogICAgcmV0dXJuIG5ldyBEYXRhVHlwZSgpO1xuICAgICAgICBjYXNlIFR5cGUuTnVsbDogICAgcmV0dXJuIG5ldyBOdWxsKCk7XG4gICAgICAgIGNhc2UgVHlwZS5CaW5hcnk6ICByZXR1cm4gbmV3IEJpbmFyeSgpO1xuICAgICAgICBjYXNlIFR5cGUuVXRmODogICAgcmV0dXJuIG5ldyBVdGY4KCk7XG4gICAgICAgIGNhc2UgVHlwZS5Cb29sOiAgICByZXR1cm4gbmV3IEJvb2woKTtcbiAgICAgICAgY2FzZSBUeXBlLkxpc3Q6ICAgIHJldHVybiBuZXcgTGlzdCgoY2hpbGRyZW4gfHwgW10pWzBdKTtcbiAgICAgICAgY2FzZSBUeXBlLlN0cnVjdF86IHJldHVybiBuZXcgU3RydWN0KGNoaWxkcmVuIHx8IFtdKTtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKHR5cGVJZCkge1xuICAgICAgICBjYXNlIFR5cGUuSW50OiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5JbnQoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBJbnQodC5pc1NpZ25lZCgpLCB0LmJpdFdpZHRoKCkpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5GbG9hdGluZ1BvaW50OiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GbG9hdGluZ1BvaW50KCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRmxvYXQodC5wcmVjaXNpb24oKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLkRlY2ltYWw6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRlY2ltYWwoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBEZWNpbWFsKHQuc2NhbGUoKSwgdC5wcmVjaXNpb24oKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLkRhdGU6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRhdGUoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBEYXRlXyh0LnVuaXQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLlRpbWU6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlRpbWUoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBUaW1lKHQudW5pdCgpLCB0LmJpdFdpZHRoKCkgYXMgVGltZUJpdFdpZHRoKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuVGltZXN0YW1wOiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UaW1lc3RhbXAoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBUaW1lc3RhbXAodC51bml0KCksIHQudGltZXpvbmUoKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLkludGVydmFsOiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5JbnRlcnZhbCgpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEludGVydmFsKHQudW5pdCgpKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuVW5pb246IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlVuaW9uKCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgVW5pb24odC5tb2RlKCksIHQudHlwZUlkc0FycmF5KCkgfHwgW10sIGNoaWxkcmVuIHx8IFtdKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuRml4ZWRTaXplQmluYXJ5OiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaXhlZFNpemVCaW5hcnkoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBGaXhlZFNpemVCaW5hcnkodC5ieXRlV2lkdGgoKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLkZpeGVkU2l6ZUxpc3Q6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpeGVkU2l6ZUxpc3QoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBGaXhlZFNpemVMaXN0KHQubGlzdFNpemUoKSwgKGNoaWxkcmVuIHx8IFtdKVswXSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLk1hcDoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTWFwKCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgTWFwXyhjaGlsZHJlbiB8fCBbXSwgdC5rZXlzU29ydGVkKCkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgVW5yZWNvZ25pemVkIHR5cGU6IFwiJHtUeXBlW3R5cGVJZF19XCIgKCR7dHlwZUlkfSlgKTtcbn1cblxuZnVuY3Rpb24gZW5jb2RlU2NoZW1hKGI6IEJ1aWxkZXIsIHNjaGVtYTogU2NoZW1hKSB7XG5cbiAgICBjb25zdCBmaWVsZE9mZnNldHMgPSBzY2hlbWEuZmllbGRzLm1hcCgoZikgPT4gRmllbGQuZW5jb2RlKGIsIGYpKTtcblxuICAgIF9TY2hlbWEuc3RhcnRGaWVsZHNWZWN0b3IoYiwgZmllbGRPZmZzZXRzLmxlbmd0aCk7XG5cbiAgICBjb25zdCBmaWVsZHNWZWN0b3JPZmZzZXQgPSBfU2NoZW1hLmNyZWF0ZUZpZWxkc1ZlY3RvcihiLCBmaWVsZE9mZnNldHMpO1xuXG4gICAgY29uc3QgbWV0YWRhdGFPZmZzZXQgPSAhKHNjaGVtYS5tZXRhZGF0YSAmJiBzY2hlbWEubWV0YWRhdGEuc2l6ZSA+IDApID8gLTEgOlxuICAgICAgICBfU2NoZW1hLmNyZWF0ZUN1c3RvbU1ldGFkYXRhVmVjdG9yKGIsIFsuLi5zY2hlbWEubWV0YWRhdGFdLm1hcCgoW2ssIHZdKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBrZXkgPSBiLmNyZWF0ZVN0cmluZyhgJHtrfWApO1xuICAgICAgICAgICAgY29uc3QgdmFsID0gYi5jcmVhdGVTdHJpbmcoYCR7dn1gKTtcbiAgICAgICAgICAgIF9LZXlWYWx1ZS5zdGFydEtleVZhbHVlKGIpO1xuICAgICAgICAgICAgX0tleVZhbHVlLmFkZEtleShiLCBrZXkpO1xuICAgICAgICAgICAgX0tleVZhbHVlLmFkZFZhbHVlKGIsIHZhbCk7XG4gICAgICAgICAgICByZXR1cm4gX0tleVZhbHVlLmVuZEtleVZhbHVlKGIpO1xuICAgICAgICB9KSk7XG5cbiAgICBfU2NoZW1hLnN0YXJ0U2NoZW1hKGIpO1xuICAgIF9TY2hlbWEuYWRkRmllbGRzKGIsIGZpZWxkc1ZlY3Rvck9mZnNldCk7XG4gICAgX1NjaGVtYS5hZGRFbmRpYW5uZXNzKGIsIHBsYXRmb3JtSXNMaXR0bGVFbmRpYW4gPyBfRW5kaWFubmVzcy5MaXR0bGUgOiBfRW5kaWFubmVzcy5CaWcpO1xuXG4gICAgaWYgKG1ldGFkYXRhT2Zmc2V0ICE9PSAtMSkgeyBfU2NoZW1hLmFkZEN1c3RvbU1ldGFkYXRhKGIsIG1ldGFkYXRhT2Zmc2V0KTsgfVxuXG4gICAgcmV0dXJuIF9TY2hlbWEuZW5kU2NoZW1hKGIpO1xufVxuXG5mdW5jdGlvbiBlbmNvZGVGaWVsZChiOiBCdWlsZGVyLCBmaWVsZDogRmllbGQpIHtcblxuICAgIGxldCBuYW1lT2Zmc2V0ID0gLTE7XG4gICAgbGV0IHR5cGVPZmZzZXQgPSAtMTtcbiAgICBsZXQgZGljdGlvbmFyeU9mZnNldCA9IC0xO1xuXG4gICAgbGV0IHR5cGUgPSBmaWVsZC50eXBlO1xuICAgIGxldCB0eXBlSWQ6IFR5cGUgPSA8YW55PiBmaWVsZC50eXBlSWQ7XG5cbiAgICBpZiAoIURhdGFUeXBlLmlzRGljdGlvbmFyeSh0eXBlKSkge1xuICAgICAgICB0eXBlT2Zmc2V0ID0gdHlwZUFzc2VtYmxlci52aXNpdCh0eXBlLCBiKSE7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdHlwZUlkID0gdHlwZS5kaWN0aW9uYXJ5LnR5cGVJZDtcbiAgICAgICAgZGljdGlvbmFyeU9mZnNldCA9IHR5cGVBc3NlbWJsZXIudmlzaXQodHlwZSwgYikhO1xuICAgICAgICB0eXBlT2Zmc2V0ID0gdHlwZUFzc2VtYmxlci52aXNpdCh0eXBlLmRpY3Rpb25hcnksIGIpITtcbiAgICB9XG5cbiAgICBjb25zdCBjaGlsZE9mZnNldHMgPSAodHlwZS5jaGlsZHJlbiB8fCBbXSkubWFwKChmOiBGaWVsZCkgPT4gRmllbGQuZW5jb2RlKGIsIGYpKTtcbiAgICBjb25zdCBjaGlsZHJlblZlY3Rvck9mZnNldCA9IF9GaWVsZC5jcmVhdGVDaGlsZHJlblZlY3RvcihiLCBjaGlsZE9mZnNldHMpO1xuXG4gICAgY29uc3QgbWV0YWRhdGFPZmZzZXQgPSAhKGZpZWxkLm1ldGFkYXRhICYmIGZpZWxkLm1ldGFkYXRhLnNpemUgPiAwKSA/IC0xIDpcbiAgICAgICAgX0ZpZWxkLmNyZWF0ZUN1c3RvbU1ldGFkYXRhVmVjdG9yKGIsIFsuLi5maWVsZC5tZXRhZGF0YV0ubWFwKChbaywgdl0pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IGIuY3JlYXRlU3RyaW5nKGAke2t9YCk7XG4gICAgICAgICAgICBjb25zdCB2YWwgPSBiLmNyZWF0ZVN0cmluZyhgJHt2fWApO1xuICAgICAgICAgICAgX0tleVZhbHVlLnN0YXJ0S2V5VmFsdWUoYik7XG4gICAgICAgICAgICBfS2V5VmFsdWUuYWRkS2V5KGIsIGtleSk7XG4gICAgICAgICAgICBfS2V5VmFsdWUuYWRkVmFsdWUoYiwgdmFsKTtcbiAgICAgICAgICAgIHJldHVybiBfS2V5VmFsdWUuZW5kS2V5VmFsdWUoYik7XG4gICAgICAgIH0pKTtcblxuICAgIGlmIChmaWVsZC5uYW1lKSB7XG4gICAgICAgIG5hbWVPZmZzZXQgPSBiLmNyZWF0ZVN0cmluZyhmaWVsZC5uYW1lKTtcbiAgICB9XG5cbiAgICBfRmllbGQuc3RhcnRGaWVsZChiKTtcbiAgICBfRmllbGQuYWRkVHlwZShiLCB0eXBlT2Zmc2V0KTtcbiAgICBfRmllbGQuYWRkVHlwZVR5cGUoYiwgdHlwZUlkKTtcbiAgICBfRmllbGQuYWRkQ2hpbGRyZW4oYiwgY2hpbGRyZW5WZWN0b3JPZmZzZXQpO1xuICAgIF9GaWVsZC5hZGROdWxsYWJsZShiLCAhIWZpZWxkLm51bGxhYmxlKTtcblxuICAgIGlmIChuYW1lT2Zmc2V0ICE9PSAtMSkgeyBfRmllbGQuYWRkTmFtZShiLCBuYW1lT2Zmc2V0KTsgfVxuICAgIGlmIChkaWN0aW9uYXJ5T2Zmc2V0ICE9PSAtMSkgeyBfRmllbGQuYWRkRGljdGlvbmFyeShiLCBkaWN0aW9uYXJ5T2Zmc2V0KTsgfVxuICAgIGlmIChtZXRhZGF0YU9mZnNldCAhPT0gLTEpIHsgX0ZpZWxkLmFkZEN1c3RvbU1ldGFkYXRhKGIsIG1ldGFkYXRhT2Zmc2V0KTsgfVxuXG4gICAgcmV0dXJuIF9GaWVsZC5lbmRGaWVsZChiKTtcbn1cblxuZnVuY3Rpb24gZW5jb2RlUmVjb3JkQmF0Y2goYjogQnVpbGRlciwgcmVjb3JkQmF0Y2g6IFJlY29yZEJhdGNoKSB7XG5cbiAgICBjb25zdCBub2RlcyA9IHJlY29yZEJhdGNoLm5vZGVzIHx8IFtdO1xuICAgIGNvbnN0IGJ1ZmZlcnMgPSByZWNvcmRCYXRjaC5idWZmZXJzIHx8IFtdO1xuXG4gICAgX1JlY29yZEJhdGNoLnN0YXJ0Tm9kZXNWZWN0b3IoYiwgbm9kZXMubGVuZ3RoKTtcbiAgICBub2Rlcy5zbGljZSgpLnJldmVyc2UoKS5mb3JFYWNoKChuKSA9PiBGaWVsZE5vZGUuZW5jb2RlKGIsIG4pKTtcblxuICAgIGNvbnN0IG5vZGVzVmVjdG9yT2Zmc2V0ID0gYi5lbmRWZWN0b3IoKTtcblxuICAgIF9SZWNvcmRCYXRjaC5zdGFydEJ1ZmZlcnNWZWN0b3IoYiwgYnVmZmVycy5sZW5ndGgpO1xuICAgIGJ1ZmZlcnMuc2xpY2UoKS5yZXZlcnNlKCkuZm9yRWFjaCgoYl8pID0+IEJ1ZmZlclJlZ2lvbi5lbmNvZGUoYiwgYl8pKTtcblxuICAgIGNvbnN0IGJ1ZmZlcnNWZWN0b3JPZmZzZXQgPSBiLmVuZFZlY3RvcigpO1xuXG4gICAgX1JlY29yZEJhdGNoLnN0YXJ0UmVjb3JkQmF0Y2goYik7XG4gICAgX1JlY29yZEJhdGNoLmFkZExlbmd0aChiLCBuZXcgTG9uZyhyZWNvcmRCYXRjaC5sZW5ndGgsIDApKTtcbiAgICBfUmVjb3JkQmF0Y2guYWRkTm9kZXMoYiwgbm9kZXNWZWN0b3JPZmZzZXQpO1xuICAgIF9SZWNvcmRCYXRjaC5hZGRCdWZmZXJzKGIsIGJ1ZmZlcnNWZWN0b3JPZmZzZXQpO1xuICAgIHJldHVybiBfUmVjb3JkQmF0Y2guZW5kUmVjb3JkQmF0Y2goYik7XG59XG5cbmZ1bmN0aW9uIGVuY29kZURpY3Rpb25hcnlCYXRjaChiOiBCdWlsZGVyLCBkaWN0aW9uYXJ5QmF0Y2g6IERpY3Rpb25hcnlCYXRjaCkge1xuICAgIGNvbnN0IGRhdGFPZmZzZXQgPSBSZWNvcmRCYXRjaC5lbmNvZGUoYiwgZGljdGlvbmFyeUJhdGNoLmRhdGEpO1xuICAgIF9EaWN0aW9uYXJ5QmF0Y2guc3RhcnREaWN0aW9uYXJ5QmF0Y2goYik7XG4gICAgX0RpY3Rpb25hcnlCYXRjaC5hZGRJZChiLCBuZXcgTG9uZyhkaWN0aW9uYXJ5QmF0Y2guaWQsIDApKTtcbiAgICBfRGljdGlvbmFyeUJhdGNoLmFkZElzRGVsdGEoYiwgZGljdGlvbmFyeUJhdGNoLmlzRGVsdGEpO1xuICAgIF9EaWN0aW9uYXJ5QmF0Y2guYWRkRGF0YShiLCBkYXRhT2Zmc2V0KTtcbiAgICByZXR1cm4gX0RpY3Rpb25hcnlCYXRjaC5lbmREaWN0aW9uYXJ5QmF0Y2goYik7XG59XG5cbmZ1bmN0aW9uIGVuY29kZUZpZWxkTm9kZShiOiBCdWlsZGVyLCBub2RlOiBGaWVsZE5vZGUpIHtcbiAgICByZXR1cm4gX0ZpZWxkTm9kZS5jcmVhdGVGaWVsZE5vZGUoYiwgbmV3IExvbmcobm9kZS5sZW5ndGgsIDApLCBuZXcgTG9uZyhub2RlLm51bGxDb3VudCwgMCkpO1xufVxuXG5mdW5jdGlvbiBlbmNvZGVCdWZmZXJSZWdpb24oYjogQnVpbGRlciwgbm9kZTogQnVmZmVyUmVnaW9uKSB7XG4gICAgcmV0dXJuIF9CdWZmZXIuY3JlYXRlQnVmZmVyKGIsIG5ldyBMb25nKG5vZGUub2Zmc2V0LCAwKSwgbmV3IExvbmcobm9kZS5sZW5ndGgsIDApKTtcbn1cblxuY29uc3QgcGxhdGZvcm1Jc0xpdHRsZUVuZGlhbiA9IChmdW5jdGlvbigpIHtcbiAgICBjb25zdCBidWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIoMik7XG4gICAgbmV3IERhdGFWaWV3KGJ1ZmZlcikuc2V0SW50MTYoMCwgMjU2LCB0cnVlIC8qIGxpdHRsZUVuZGlhbiAqLyk7XG4gICAgLy8gSW50MTZBcnJheSB1c2VzIHRoZSBwbGF0Zm9ybSdzIGVuZGlhbm5lc3MuXG4gICAgcmV0dXJuIG5ldyBJbnQxNkFycmF5KGJ1ZmZlcilbMF0gPT09IDI1Njtcbn0pKCk7XG5cbnR5cGUgTWVzc2FnZUhlYWRlckRlY29kZXIgPSA8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KCkgPT4gVCBleHRlbmRzIE1lc3NhZ2VIZWFkZXIuU2NoZW1hID8gU2NoZW1hXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoID8gUmVjb3JkQmF0Y2hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogVCBleHRlbmRzIE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoID8gRGljdGlvbmFyeUJhdGNoIDogbmV2ZXI7XG4iXX0=

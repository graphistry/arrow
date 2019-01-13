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
    const nodes = [];
    for (let f, i = -1, j = -1, n = batch.nodesLength(); ++i < n;) {
        if (f = batch.nodes(i)) {
            nodes[++j] = FieldNode.decode(f);
        }
    }
    return nodes;
}
/** @ignore */
function decodeBuffers(batch, version) {
    const bufferRegions = [];
    for (let b, i = -1, j = -1, n = batch.buffersLength(); ++i < n;) {
        if (b = batch.buffers(i)) {
            // If this Arrow buffer was written before version 4,
            // advance the buffer's bb_pos 8 bytes to skip past
            // the now-removed page_id field
            if (version < enum_1.MetadataVersion.V4) {
                b.bb_pos += (8 * (i + 1));
            }
            bufferRegions[++j] = BufferRegion.decode(b);
        }
    }
    return bufferRegions;
}
/** @ignore */
function decodeSchemaFields(schema, dictionaries, dictionaryFields) {
    const fields = [];
    for (let f, i = -1, j = -1, n = schema.fieldsLength(); ++i < n;) {
        if (f = schema.fields(i)) {
            fields[++j] = schema_1.Field.decode(f, dictionaries, dictionaryFields);
        }
    }
    return fields;
}
/** @ignore */
function decodeFieldChildren(field, dictionaries, dictionaryFields) {
    const children = [];
    for (let f, i = -1, j = -1, n = field.childrenLength(); ++i < n;) {
        if (f = field.children(i)) {
            children[++j] = schema_1.Field.decode(f, dictionaries, dictionaryFields);
        }
    }
    return children;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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Q0FBQyxDQUFVLEVBQUUsSUFBZTtJQUNoRCxPQUFPLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hHLENBQUM7QUFFRCxjQUFjO0FBQ2QsU0FBUyxrQkFBa0IsQ0FBQyxDQUFVLEVBQUUsSUFBa0I7SUFDdEQsT0FBTyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2RixDQUFDO0FBRUQsY0FBYztBQUNkLE1BQU0sc0JBQXNCLEdBQUcsQ0FBQztJQUM1QixNQUFNLE1BQU0sR0FBRyxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQyxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUMvRCw2Q0FBNkM7SUFDN0MsT0FBTyxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUM7QUFDN0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyIsImZpbGUiOiJpcGMvbWV0YWRhdGEvbWVzc2FnZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBmbGF0YnVmZmVycyB9IGZyb20gJ2ZsYXRidWZmZXJzJztcbmltcG9ydCAqIGFzIFNjaGVtYV8gZnJvbSAnLi4vLi4vZmIvU2NoZW1hJztcbmltcG9ydCAqIGFzIE1lc3NhZ2VfIGZyb20gJy4uLy4uL2ZiL01lc3NhZ2UnO1xuXG5pbXBvcnQgeyBTY2hlbWEsIEZpZWxkIH0gZnJvbSAnLi4vLi4vc2NoZW1hJztcbmltcG9ydCB7IHRvVWludDhBcnJheSB9IGZyb20gJy4uLy4uL3V0aWwvYnVmZmVyJztcbmltcG9ydCB7IEFycmF5QnVmZmVyVmlld0lucHV0IH0gZnJvbSAnLi4vLi4vdXRpbC9idWZmZXInO1xuaW1wb3J0IHsgTWVzc2FnZUhlYWRlciwgTWV0YWRhdGFWZXJzaW9uIH0gZnJvbSAnLi4vLi4vZW51bSc7XG5pbXBvcnQgeyBpbnN0YW5jZSBhcyB0eXBlQXNzZW1ibGVyIH0gZnJvbSAnLi4vLi4vdmlzaXRvci90eXBlYXNzZW1ibGVyJztcbmltcG9ydCB7IGZpZWxkRnJvbUpTT04sIHNjaGVtYUZyb21KU09OLCByZWNvcmRCYXRjaEZyb21KU09OLCBkaWN0aW9uYXJ5QmF0Y2hGcm9tSlNPTiB9IGZyb20gJy4vanNvbic7XG5cbmltcG9ydCBMb25nID0gZmxhdGJ1ZmZlcnMuTG9uZztcbmltcG9ydCBCdWlsZGVyID0gZmxhdGJ1ZmZlcnMuQnVpbGRlcjtcbmltcG9ydCBCeXRlQnVmZmVyID0gZmxhdGJ1ZmZlcnMuQnl0ZUJ1ZmZlcjtcbmltcG9ydCBfSW50ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuSW50O1xuaW1wb3J0IFR5cGUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UeXBlO1xuaW1wb3J0IF9GaWVsZCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpZWxkO1xuaW1wb3J0IF9TY2hlbWEgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5TY2hlbWE7XG5pbXBvcnQgX0J1ZmZlciA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkJ1ZmZlcjtcbmltcG9ydCBfTWVzc2FnZSA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NZXNzYWdlO1xuaW1wb3J0IF9LZXlWYWx1ZSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLktleVZhbHVlO1xuaW1wb3J0IF9GaWVsZE5vZGUgPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRmllbGROb2RlO1xuaW1wb3J0IF9FbmRpYW5uZXNzID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRW5kaWFubmVzcztcbmltcG9ydCBfUmVjb3JkQmF0Y2ggPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuUmVjb3JkQmF0Y2g7XG5pbXBvcnQgX0RpY3Rpb25hcnlCYXRjaCA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EaWN0aW9uYXJ5QmF0Y2g7XG5pbXBvcnQgX0RpY3Rpb25hcnlFbmNvZGluZyA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRpY3Rpb25hcnlFbmNvZGluZztcblxuaW1wb3J0IHtcbiAgICBEYXRhVHlwZSwgRGljdGlvbmFyeSwgVGltZUJpdFdpZHRoLFxuICAgIFV0ZjgsIEJpbmFyeSwgRGVjaW1hbCwgRml4ZWRTaXplQmluYXJ5LFxuICAgIExpc3QsIEZpeGVkU2l6ZUxpc3QsIE1hcF8sIFN0cnVjdCwgVW5pb24sXG4gICAgQm9vbCwgTnVsbCwgSW50LCBGbG9hdCwgRGF0ZV8sIFRpbWUsIEludGVydmFsLCBUaW1lc3RhbXAsIEludEJpdFdpZHRoLCBJbnQzMiwgVEtleXMsXG59IGZyb20gJy4uLy4uL3R5cGUnO1xuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIE1lc3NhZ2U8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXIgPSBhbnk+IHtcblxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbUpTT048VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KG1zZzogYW55LCBoZWFkZXJUeXBlOiBUKTogTWVzc2FnZTxUPiB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBuZXcgTWVzc2FnZSgwLCBNZXRhZGF0YVZlcnNpb24uVjQsIGhlYWRlclR5cGUpO1xuICAgICAgICBtZXNzYWdlLl9jcmVhdGVIZWFkZXIgPSBtZXNzYWdlSGVhZGVyRnJvbUpTT04obXNnLCBoZWFkZXJUeXBlKTtcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgfVxuXG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBkZWNvZGUoYnVmOiBBcnJheUJ1ZmZlclZpZXdJbnB1dCkge1xuICAgICAgICBidWYgPSBuZXcgQnl0ZUJ1ZmZlcih0b1VpbnQ4QXJyYXkoYnVmKSk7XG4gICAgICAgIGNvbnN0IF9tZXNzYWdlID0gX01lc3NhZ2UuZ2V0Um9vdEFzTWVzc2FnZShidWYpO1xuICAgICAgICBjb25zdCBib2R5TGVuZ3RoOiBMb25nID0gX21lc3NhZ2UuYm9keUxlbmd0aCgpITtcbiAgICAgICAgY29uc3QgdmVyc2lvbjogTWV0YWRhdGFWZXJzaW9uID0gX21lc3NhZ2UudmVyc2lvbigpO1xuICAgICAgICBjb25zdCBoZWFkZXJUeXBlOiBNZXNzYWdlSGVhZGVyID0gX21lc3NhZ2UuaGVhZGVyVHlwZSgpO1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gbmV3IE1lc3NhZ2UoYm9keUxlbmd0aCwgdmVyc2lvbiwgaGVhZGVyVHlwZSk7XG4gICAgICAgIG1lc3NhZ2UuX2NyZWF0ZUhlYWRlciA9IGRlY29kZU1lc3NhZ2VIZWFkZXIoX21lc3NhZ2UsIGhlYWRlclR5cGUpO1xuICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICB9XG5cbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGVuY29kZTxUIGV4dGVuZHMgTWVzc2FnZUhlYWRlcj4obWVzc2FnZTogTWVzc2FnZTxUPikge1xuICAgICAgICBsZXQgYiA9IG5ldyBCdWlsZGVyKCksIGhlYWRlck9mZnNldCA9IC0xO1xuICAgICAgICBpZiAobWVzc2FnZS5pc1NjaGVtYSgpKSB7XG4gICAgICAgICAgICBoZWFkZXJPZmZzZXQgPSBTY2hlbWEuZW5jb2RlKGIsIG1lc3NhZ2UuaGVhZGVyKCkgYXMgU2NoZW1hKTtcbiAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmlzUmVjb3JkQmF0Y2goKSkge1xuICAgICAgICAgICAgaGVhZGVyT2Zmc2V0ID0gUmVjb3JkQmF0Y2guZW5jb2RlKGIsIG1lc3NhZ2UuaGVhZGVyKCkgYXMgUmVjb3JkQmF0Y2gpO1xuICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuaXNEaWN0aW9uYXJ5QmF0Y2goKSkge1xuICAgICAgICAgICAgaGVhZGVyT2Zmc2V0ID0gRGljdGlvbmFyeUJhdGNoLmVuY29kZShiLCBtZXNzYWdlLmhlYWRlcigpIGFzIERpY3Rpb25hcnlCYXRjaCk7XG4gICAgICAgIH1cbiAgICAgICAgX01lc3NhZ2Uuc3RhcnRNZXNzYWdlKGIpO1xuICAgICAgICBfTWVzc2FnZS5hZGRWZXJzaW9uKGIsIE1ldGFkYXRhVmVyc2lvbi5WNCk7XG4gICAgICAgIF9NZXNzYWdlLmFkZEhlYWRlcihiLCBoZWFkZXJPZmZzZXQpO1xuICAgICAgICBfTWVzc2FnZS5hZGRIZWFkZXJUeXBlKGIsIG1lc3NhZ2UuaGVhZGVyVHlwZSk7XG4gICAgICAgIF9NZXNzYWdlLmFkZEJvZHlMZW5ndGgoYiwgbmV3IExvbmcobWVzc2FnZS5ib2R5TGVuZ3RoLCAwKSk7XG4gICAgICAgIF9NZXNzYWdlLmZpbmlzaE1lc3NhZ2VCdWZmZXIoYiwgX01lc3NhZ2UuZW5kTWVzc2FnZShiKSk7XG4gICAgICAgIHJldHVybiBiLmFzVWludDhBcnJheSgpO1xuICAgIH1cblxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbShoZWFkZXI6IFNjaGVtYSB8IFJlY29yZEJhdGNoIHwgRGljdGlvbmFyeUJhdGNoLCBib2R5TGVuZ3RoID0gMCkge1xuICAgICAgICBpZiAoaGVhZGVyIGluc3RhbmNlb2YgU2NoZW1hKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1lc3NhZ2UoMCwgTWV0YWRhdGFWZXJzaW9uLlY0LCBNZXNzYWdlSGVhZGVyLlNjaGVtYSwgaGVhZGVyKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGVhZGVyIGluc3RhbmNlb2YgUmVjb3JkQmF0Y2gpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgTWVzc2FnZShib2R5TGVuZ3RoLCBNZXRhZGF0YVZlcnNpb24uVjQsIE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2gsIGhlYWRlcik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhlYWRlciBpbnN0YW5jZW9mIERpY3Rpb25hcnlCYXRjaCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNZXNzYWdlKGJvZHlMZW5ndGgsIE1ldGFkYXRhVmVyc2lvbi5WNCwgTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2gsIGhlYWRlcik7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnJlY29nbml6ZWQgTWVzc2FnZSBoZWFkZXI6ICR7aGVhZGVyfWApO1xuICAgIH1cblxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgYm9keTogVWludDhBcnJheTtcbiAgICBwcm90ZWN0ZWQgX2hlYWRlclR5cGU6IFQ7XG4gICAgcHJvdGVjdGVkIF9ib2R5TGVuZ3RoOiBudW1iZXI7XG4gICAgcHJvdGVjdGVkIF92ZXJzaW9uOiBNZXRhZGF0YVZlcnNpb247XG4gICAgcHVibGljIGdldCB0eXBlKCkgeyByZXR1cm4gdGhpcy5oZWFkZXJUeXBlOyB9XG4gICAgcHVibGljIGdldCB2ZXJzaW9uKCkgeyByZXR1cm4gdGhpcy5fdmVyc2lvbjsgfVxuICAgIHB1YmxpYyBnZXQgaGVhZGVyVHlwZSgpIHsgcmV0dXJuIHRoaXMuX2hlYWRlclR5cGU7IH1cbiAgICBwdWJsaWMgZ2V0IGJvZHlMZW5ndGgoKSB7IHJldHVybiB0aGlzLl9ib2R5TGVuZ3RoOyB9XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHByb3RlY3RlZCBfY3JlYXRlSGVhZGVyOiBNZXNzYWdlSGVhZGVyRGVjb2RlcjtcbiAgICBwdWJsaWMgaGVhZGVyKCkgeyByZXR1cm4gdGhpcy5fY3JlYXRlSGVhZGVyPFQ+KCk7IH1cbiAgICBwdWJsaWMgaXNTY2hlbWEoKTogdGhpcyBpcyBNZXNzYWdlPE1lc3NhZ2VIZWFkZXIuU2NoZW1hPiB7IHJldHVybiB0aGlzLmhlYWRlclR5cGUgPT09IE1lc3NhZ2VIZWFkZXIuU2NoZW1hOyB9XG4gICAgcHVibGljIGlzUmVjb3JkQmF0Y2goKTogdGhpcyBpcyBNZXNzYWdlPE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2g+IHsgcmV0dXJuIHRoaXMuaGVhZGVyVHlwZSA9PT0gTWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaDsgfVxuICAgIHB1YmxpYyBpc0RpY3Rpb25hcnlCYXRjaCgpOiB0aGlzIGlzIE1lc3NhZ2U8TWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2g+IHsgcmV0dXJuIHRoaXMuaGVhZGVyVHlwZSA9PT0gTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2g7IH1cblxuICAgIGNvbnN0cnVjdG9yKGJvZHlMZW5ndGg6IExvbmcgfCBudW1iZXIsIHZlcnNpb246IE1ldGFkYXRhVmVyc2lvbiwgaGVhZGVyVHlwZTogVCwgaGVhZGVyPzogYW55KSB7XG4gICAgICAgIHRoaXMuX3ZlcnNpb24gPSB2ZXJzaW9uO1xuICAgICAgICB0aGlzLl9oZWFkZXJUeXBlID0gaGVhZGVyVHlwZTtcbiAgICAgICAgdGhpcy5ib2R5ID0gbmV3IFVpbnQ4QXJyYXkoMCk7XG4gICAgICAgIGhlYWRlciAmJiAodGhpcy5fY3JlYXRlSGVhZGVyID0gKCkgPT4gaGVhZGVyKTtcbiAgICAgICAgdGhpcy5fYm9keUxlbmd0aCA9IHR5cGVvZiBib2R5TGVuZ3RoID09PSAnbnVtYmVyJyA/IGJvZHlMZW5ndGggOiBib2R5TGVuZ3RoLmxvdztcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY2xhc3MgUmVjb3JkQmF0Y2gge1xuICAgIHByb3RlY3RlZCBfbGVuZ3RoOiBudW1iZXI7XG4gICAgcHJvdGVjdGVkIF9ub2RlczogRmllbGROb2RlW107XG4gICAgcHJvdGVjdGVkIF9idWZmZXJzOiBCdWZmZXJSZWdpb25bXTtcbiAgICBwdWJsaWMgZ2V0IG5vZGVzKCkgeyByZXR1cm4gdGhpcy5fbm9kZXM7IH1cbiAgICBwdWJsaWMgZ2V0IGxlbmd0aCgpIHsgcmV0dXJuIHRoaXMuX2xlbmd0aDsgfVxuICAgIHB1YmxpYyBnZXQgYnVmZmVycygpIHsgcmV0dXJuIHRoaXMuX2J1ZmZlcnM7IH1cbiAgICBjb25zdHJ1Y3RvcihsZW5ndGg6IExvbmcgfCBudW1iZXIsIG5vZGVzOiBGaWVsZE5vZGVbXSwgYnVmZmVyczogQnVmZmVyUmVnaW9uW10pIHtcbiAgICAgICAgdGhpcy5fbm9kZXMgPSBub2RlcztcbiAgICAgICAgdGhpcy5fYnVmZmVycyA9IGJ1ZmZlcnM7XG4gICAgICAgIHRoaXMuX2xlbmd0aCA9IHR5cGVvZiBsZW5ndGggPT09ICdudW1iZXInID8gbGVuZ3RoIDogbGVuZ3RoLmxvdztcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY2xhc3MgRGljdGlvbmFyeUJhdGNoIHtcblxuICAgIHByb3RlY3RlZCBfaWQ6IG51bWJlcjtcbiAgICBwcm90ZWN0ZWQgX2lzRGVsdGE6IGJvb2xlYW47XG4gICAgcHJvdGVjdGVkIF9kYXRhOiBSZWNvcmRCYXRjaDtcbiAgICBwdWJsaWMgZ2V0IGlkKCkgeyByZXR1cm4gdGhpcy5faWQ7IH1cbiAgICBwdWJsaWMgZ2V0IGRhdGEoKSB7IHJldHVybiB0aGlzLl9kYXRhOyB9XG4gICAgcHVibGljIGdldCBpc0RlbHRhKCkgeyByZXR1cm4gdGhpcy5faXNEZWx0YTsgfVxuICAgIHB1YmxpYyBnZXQgbGVuZ3RoKCk6IG51bWJlciB7IHJldHVybiB0aGlzLmRhdGEubGVuZ3RoOyB9XG4gICAgcHVibGljIGdldCBub2RlcygpOiBGaWVsZE5vZGVbXSB7IHJldHVybiB0aGlzLmRhdGEubm9kZXM7IH1cbiAgICBwdWJsaWMgZ2V0IGJ1ZmZlcnMoKTogQnVmZmVyUmVnaW9uW10geyByZXR1cm4gdGhpcy5kYXRhLmJ1ZmZlcnM7IH1cblxuICAgIGNvbnN0cnVjdG9yKGRhdGE6IFJlY29yZEJhdGNoLCBpZDogTG9uZyB8IG51bWJlciwgaXNEZWx0YTogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgICAgIHRoaXMuX2RhdGEgPSBkYXRhO1xuICAgICAgICB0aGlzLl9pc0RlbHRhID0gaXNEZWx0YTtcbiAgICAgICAgdGhpcy5faWQgPSB0eXBlb2YgaWQgPT09ICdudW1iZXInID8gaWQgOiBpZC5sb3c7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIEJ1ZmZlclJlZ2lvbiB7XG4gICAgcHVibGljIG9mZnNldDogbnVtYmVyO1xuICAgIHB1YmxpYyBsZW5ndGg6IG51bWJlcjtcbiAgICBjb25zdHJ1Y3RvcihvZmZzZXQ6IExvbmcgfCBudW1iZXIsIGxlbmd0aDogTG9uZyB8IG51bWJlcikge1xuICAgICAgICB0aGlzLm9mZnNldCA9IHR5cGVvZiBvZmZzZXQgPT09ICdudW1iZXInID8gb2Zmc2V0IDogb2Zmc2V0LmxvdztcbiAgICAgICAgdGhpcy5sZW5ndGggPSB0eXBlb2YgbGVuZ3RoID09PSAnbnVtYmVyJyA/IGxlbmd0aCA6IGxlbmd0aC5sb3c7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIEZpZWxkTm9kZSB7XG4gICAgcHVibGljIGxlbmd0aDogbnVtYmVyO1xuICAgIHB1YmxpYyBudWxsQ291bnQ6IG51bWJlcjtcbiAgICBjb25zdHJ1Y3RvcihsZW5ndGg6IExvbmcgfCBudW1iZXIsIG51bGxDb3VudDogTG9uZyB8IG51bWJlcikge1xuICAgICAgICB0aGlzLmxlbmd0aCA9IHR5cGVvZiBsZW5ndGggPT09ICdudW1iZXInID8gbGVuZ3RoIDogbGVuZ3RoLmxvdztcbiAgICAgICAgdGhpcy5udWxsQ291bnQgPSB0eXBlb2YgbnVsbENvdW50ID09PSAnbnVtYmVyJyA/IG51bGxDb3VudCA6IG51bGxDb3VudC5sb3c7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBtZXNzYWdlSGVhZGVyRnJvbUpTT04obWVzc2FnZTogYW55LCB0eXBlOiBNZXNzYWdlSGVhZGVyKSB7XG4gICAgcmV0dXJuICgoKSA9PiB7XG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLlNjaGVtYTogcmV0dXJuIFNjaGVtYS5mcm9tSlNPTihtZXNzYWdlKTtcbiAgICAgICAgICAgIGNhc2UgTWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaDogcmV0dXJuIFJlY29yZEJhdGNoLmZyb21KU09OKG1lc3NhZ2UpO1xuICAgICAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaDogcmV0dXJuIERpY3Rpb25hcnlCYXRjaC5mcm9tSlNPTihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVucmVjb2duaXplZCBNZXNzYWdlIHR5cGU6IHsgbmFtZTogJHtNZXNzYWdlSGVhZGVyW3R5cGVdfSwgdHlwZTogJHt0eXBlfSB9YCk7XG4gICAgfSkgYXMgTWVzc2FnZUhlYWRlckRlY29kZXI7XG59XG5cbmZ1bmN0aW9uIGRlY29kZU1lc3NhZ2VIZWFkZXIobWVzc2FnZTogX01lc3NhZ2UsIHR5cGU6IE1lc3NhZ2VIZWFkZXIpIHtcbiAgICByZXR1cm4gKCgpID0+IHtcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlIE1lc3NhZ2VIZWFkZXIuU2NoZW1hOiByZXR1cm4gU2NoZW1hLmRlY29kZShtZXNzYWdlLmhlYWRlcihuZXcgX1NjaGVtYSgpKSEpO1xuICAgICAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoOiByZXR1cm4gUmVjb3JkQmF0Y2guZGVjb2RlKG1lc3NhZ2UuaGVhZGVyKG5ldyBfUmVjb3JkQmF0Y2goKSkhLCBtZXNzYWdlLnZlcnNpb24oKSk7XG4gICAgICAgICAgICBjYXNlIE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoOiByZXR1cm4gRGljdGlvbmFyeUJhdGNoLmRlY29kZShtZXNzYWdlLmhlYWRlcihuZXcgX0RpY3Rpb25hcnlCYXRjaCgpKSEsIG1lc3NhZ2UudmVyc2lvbigpKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVucmVjb2duaXplZCBNZXNzYWdlIHR5cGU6IHsgbmFtZTogJHtNZXNzYWdlSGVhZGVyW3R5cGVdfSwgdHlwZTogJHt0eXBlfSB9YCk7XG4gICAgfSkgYXMgTWVzc2FnZUhlYWRlckRlY29kZXI7XG59XG5cbkZpZWxkWydlbmNvZGUnXSA9IGVuY29kZUZpZWxkO1xuRmllbGRbJ2RlY29kZSddID0gZGVjb2RlRmllbGQ7XG5GaWVsZFsnZnJvbUpTT04nXSA9IGZpZWxkRnJvbUpTT047XG5cblNjaGVtYVsnZW5jb2RlJ10gPSBlbmNvZGVTY2hlbWE7XG5TY2hlbWFbJ2RlY29kZSddID0gZGVjb2RlU2NoZW1hO1xuU2NoZW1hWydmcm9tSlNPTiddID0gc2NoZW1hRnJvbUpTT047XG5cblJlY29yZEJhdGNoWydlbmNvZGUnXSA9IGVuY29kZVJlY29yZEJhdGNoO1xuUmVjb3JkQmF0Y2hbJ2RlY29kZSddID0gZGVjb2RlUmVjb3JkQmF0Y2g7XG5SZWNvcmRCYXRjaFsnZnJvbUpTT04nXSA9IHJlY29yZEJhdGNoRnJvbUpTT047XG5cbkRpY3Rpb25hcnlCYXRjaFsnZW5jb2RlJ10gPSBlbmNvZGVEaWN0aW9uYXJ5QmF0Y2g7XG5EaWN0aW9uYXJ5QmF0Y2hbJ2RlY29kZSddID0gZGVjb2RlRGljdGlvbmFyeUJhdGNoO1xuRGljdGlvbmFyeUJhdGNoWydmcm9tSlNPTiddID0gZGljdGlvbmFyeUJhdGNoRnJvbUpTT047XG5cbkZpZWxkTm9kZVsnZW5jb2RlJ10gPSBlbmNvZGVGaWVsZE5vZGU7XG5GaWVsZE5vZGVbJ2RlY29kZSddID0gZGVjb2RlRmllbGROb2RlO1xuXG5CdWZmZXJSZWdpb25bJ2VuY29kZSddID0gZW5jb2RlQnVmZmVyUmVnaW9uO1xuQnVmZmVyUmVnaW9uWydkZWNvZGUnXSA9IGRlY29kZUJ1ZmZlclJlZ2lvbjtcblxuZGVjbGFyZSBtb2R1bGUgJy4uLy4uL3NjaGVtYScge1xuICAgIG5hbWVzcGFjZSBGaWVsZCB7XG4gICAgICAgIGV4cG9ydCB7IGVuY29kZUZpZWxkIGFzIGVuY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBkZWNvZGVGaWVsZCBhcyBkZWNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgZmllbGRGcm9tSlNPTiBhcyBmcm9tSlNPTiB9O1xuICAgIH1cbiAgICBuYW1lc3BhY2UgU2NoZW1hIHtcbiAgICAgICAgZXhwb3J0IHsgZW5jb2RlU2NoZW1hIGFzIGVuY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBkZWNvZGVTY2hlbWEgYXMgZGVjb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IHNjaGVtYUZyb21KU09OIGFzIGZyb21KU09OIH07XG4gICAgfVxufVxuXG5kZWNsYXJlIG1vZHVsZSAnLi9tZXNzYWdlJyB7XG4gICAgbmFtZXNwYWNlIFJlY29yZEJhdGNoIHtcbiAgICAgICAgZXhwb3J0IHsgZW5jb2RlUmVjb3JkQmF0Y2ggYXMgZW5jb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IGRlY29kZVJlY29yZEJhdGNoIGFzIGRlY29kZSB9O1xuICAgICAgICBleHBvcnQgeyByZWNvcmRCYXRjaEZyb21KU09OIGFzIGZyb21KU09OIH07XG4gICAgfVxuICAgIG5hbWVzcGFjZSBEaWN0aW9uYXJ5QmF0Y2gge1xuICAgICAgICBleHBvcnQgeyBlbmNvZGVEaWN0aW9uYXJ5QmF0Y2ggYXMgZW5jb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IGRlY29kZURpY3Rpb25hcnlCYXRjaCBhcyBkZWNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgZGljdGlvbmFyeUJhdGNoRnJvbUpTT04gYXMgZnJvbUpTT04gfTtcbiAgICB9XG4gICAgbmFtZXNwYWNlIEZpZWxkTm9kZSB7XG4gICAgICAgIGV4cG9ydCB7IGVuY29kZUZpZWxkTm9kZSBhcyBlbmNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgZGVjb2RlRmllbGROb2RlIGFzIGRlY29kZSB9O1xuICAgIH1cbiAgICBuYW1lc3BhY2UgQnVmZmVyUmVnaW9uIHtcbiAgICAgICAgZXhwb3J0IHsgZW5jb2RlQnVmZmVyUmVnaW9uIGFzIGVuY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBkZWNvZGVCdWZmZXJSZWdpb24gYXMgZGVjb2RlIH07XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZGVjb2RlU2NoZW1hKF9zY2hlbWE6IF9TY2hlbWEsIGRpY3Rpb25hcmllczogTWFwPG51bWJlciwgRGF0YVR5cGU+ID0gbmV3IE1hcCgpLCBkaWN0aW9uYXJ5RmllbGRzOiBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5PltdPiA9IG5ldyBNYXAoKSkge1xuICAgIGNvbnN0IGZpZWxkcyA9IGRlY29kZVNjaGVtYUZpZWxkcyhfc2NoZW1hLCBkaWN0aW9uYXJpZXMsIGRpY3Rpb25hcnlGaWVsZHMpO1xuICAgIHJldHVybiBuZXcgU2NoZW1hKGZpZWxkcywgZGVjb2RlQ3VzdG9tTWV0YWRhdGEoX3NjaGVtYSksIGRpY3Rpb25hcmllcywgZGljdGlvbmFyeUZpZWxkcyk7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBkZWNvZGVSZWNvcmRCYXRjaChiYXRjaDogX1JlY29yZEJhdGNoLCB2ZXJzaW9uID0gTWV0YWRhdGFWZXJzaW9uLlY0KSB7XG4gICAgcmV0dXJuIG5ldyBSZWNvcmRCYXRjaChiYXRjaC5sZW5ndGgoKSwgZGVjb2RlRmllbGROb2RlcyhiYXRjaCksIGRlY29kZUJ1ZmZlcnMoYmF0Y2gsIHZlcnNpb24pKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGRlY29kZURpY3Rpb25hcnlCYXRjaChiYXRjaDogX0RpY3Rpb25hcnlCYXRjaCwgdmVyc2lvbiA9IE1ldGFkYXRhVmVyc2lvbi5WNCkge1xuICAgIHJldHVybiBuZXcgRGljdGlvbmFyeUJhdGNoKFJlY29yZEJhdGNoLmRlY29kZShiYXRjaC5kYXRhKCkhLCB2ZXJzaW9uKSwgYmF0Y2guaWQoKSwgYmF0Y2guaXNEZWx0YSgpKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGRlY29kZUJ1ZmZlclJlZ2lvbihiOiBfQnVmZmVyKSB7XG4gICAgcmV0dXJuIG5ldyBCdWZmZXJSZWdpb24oYi5vZmZzZXQoKSwgYi5sZW5ndGgoKSk7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBkZWNvZGVGaWVsZE5vZGUoZjogX0ZpZWxkTm9kZSkge1xuICAgIHJldHVybiBuZXcgRmllbGROb2RlKGYubGVuZ3RoKCksIGYubnVsbENvdW50KCkpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZGVjb2RlRmllbGROb2RlcyhiYXRjaDogX1JlY29yZEJhdGNoKSB7XG4gICAgY29uc3Qgbm9kZXMgPSBbXSBhcyBGaWVsZE5vZGVbXTtcbiAgICBmb3IgKGxldCBmLCBpID0gLTEsIGogPSAtMSwgbiA9IGJhdGNoLm5vZGVzTGVuZ3RoKCk7ICsraSA8IG47KSB7XG4gICAgICAgIGlmIChmID0gYmF0Y2gubm9kZXMoaSkpIHtcbiAgICAgICAgICAgIG5vZGVzWysral0gPSBGaWVsZE5vZGUuZGVjb2RlKGYpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBub2Rlcztcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGRlY29kZUJ1ZmZlcnMoYmF0Y2g6IF9SZWNvcmRCYXRjaCwgdmVyc2lvbjogTWV0YWRhdGFWZXJzaW9uKSB7XG4gICAgY29uc3QgYnVmZmVyUmVnaW9ucyA9IFtdIGFzIEJ1ZmZlclJlZ2lvbltdO1xuICAgIGZvciAobGV0IGIsIGkgPSAtMSwgaiA9IC0xLCBuID0gYmF0Y2guYnVmZmVyc0xlbmd0aCgpOyArK2kgPCBuOykge1xuICAgICAgICBpZiAoYiA9IGJhdGNoLmJ1ZmZlcnMoaSkpIHtcbiAgICAgICAgLy8gSWYgdGhpcyBBcnJvdyBidWZmZXIgd2FzIHdyaXR0ZW4gYmVmb3JlIHZlcnNpb24gNCxcbiAgICAgICAgLy8gYWR2YW5jZSB0aGUgYnVmZmVyJ3MgYmJfcG9zIDggYnl0ZXMgdG8gc2tpcCBwYXN0XG4gICAgICAgIC8vIHRoZSBub3ctcmVtb3ZlZCBwYWdlX2lkIGZpZWxkXG4gICAgICAgIGlmICh2ZXJzaW9uIDwgTWV0YWRhdGFWZXJzaW9uLlY0KSB7XG4gICAgICAgICAgICAgICAgYi5iYl9wb3MgKz0gKDggKiAoaSArIDEpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJ1ZmZlclJlZ2lvbnNbKytqXSA9IEJ1ZmZlclJlZ2lvbi5kZWNvZGUoYik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGJ1ZmZlclJlZ2lvbnM7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBkZWNvZGVTY2hlbWFGaWVsZHMoc2NoZW1hOiBfU2NoZW1hLCBkaWN0aW9uYXJpZXM/OiBNYXA8bnVtYmVyLCBEYXRhVHlwZT4sIGRpY3Rpb25hcnlGaWVsZHM/OiBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5PltdPikge1xuICAgIGNvbnN0IGZpZWxkcyA9IFtdIGFzIEZpZWxkW107XG4gICAgZm9yIChsZXQgZiwgaSA9IC0xLCBqID0gLTEsIG4gPSBzY2hlbWEuZmllbGRzTGVuZ3RoKCk7ICsraSA8IG47KSB7XG4gICAgICAgIGlmIChmID0gc2NoZW1hLmZpZWxkcyhpKSkge1xuICAgICAgICAgICAgZmllbGRzWysral0gPSBGaWVsZC5kZWNvZGUoZiwgZGljdGlvbmFyaWVzLCBkaWN0aW9uYXJ5RmllbGRzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmllbGRzO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZGVjb2RlRmllbGRDaGlsZHJlbihmaWVsZDogX0ZpZWxkLCBkaWN0aW9uYXJpZXM/OiBNYXA8bnVtYmVyLCBEYXRhVHlwZT4sIGRpY3Rpb25hcnlGaWVsZHM/OiBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5PltdPik6IEZpZWxkW10ge1xuICAgIGNvbnN0IGNoaWxkcmVuID0gW10gYXMgRmllbGRbXTtcbiAgICBmb3IgKGxldCBmLCBpID0gLTEsIGogPSAtMSwgbiA9IGZpZWxkLmNoaWxkcmVuTGVuZ3RoKCk7ICsraSA8IG47KSB7XG4gICAgICAgIGlmIChmID0gZmllbGQuY2hpbGRyZW4oaSkpIHtcbiAgICAgICAgICAgIGNoaWxkcmVuWysral0gPSBGaWVsZC5kZWNvZGUoZiwgZGljdGlvbmFyaWVzLCBkaWN0aW9uYXJ5RmllbGRzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY2hpbGRyZW47XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBkZWNvZGVGaWVsZChmOiBfRmllbGQsIGRpY3Rpb25hcmllcz86IE1hcDxudW1iZXIsIERhdGFUeXBlPiwgZGljdGlvbmFyeUZpZWxkcz86IE1hcDxudW1iZXIsIEZpZWxkPERpY3Rpb25hcnk+W10+KSB7XG5cbiAgICBsZXQgaWQ6IG51bWJlcjtcbiAgICBsZXQgZmllbGQ6IEZpZWxkIHwgdm9pZDtcbiAgICBsZXQgdHlwZTogRGF0YVR5cGU8YW55PjtcbiAgICBsZXQga2V5czogX0ludCB8IFRLZXlzIHwgbnVsbDtcbiAgICBsZXQgZGljdFR5cGU6IERpY3Rpb25hcnk7XG4gICAgbGV0IGRpY3RNZXRhOiBfRGljdGlvbmFyeUVuY29kaW5nIHwgbnVsbDtcbiAgICBsZXQgZGljdEZpZWxkOiBGaWVsZDxEaWN0aW9uYXJ5PjtcblxuICAgIC8vIElmIG5vIGRpY3Rpb25hcnkgZW5jb2RpbmcsIG9yIGluIHRoZSBwcm9jZXNzIG9mIGRlY29kaW5nIHRoZSBjaGlsZHJlbiBvZiBhIGRpY3Rpb25hcnktZW5jb2RlZCBmaWVsZFxuICAgIGlmICghZGljdGlvbmFyaWVzIHx8ICFkaWN0aW9uYXJ5RmllbGRzIHx8ICEoZGljdE1ldGEgPSBmLmRpY3Rpb25hcnkoKSkpIHtcbiAgICAgICAgdHlwZSA9IGRlY29kZUZpZWxkVHlwZShmLCBkZWNvZGVGaWVsZENoaWxkcmVuKGYsIGRpY3Rpb25hcmllcywgZGljdGlvbmFyeUZpZWxkcykpO1xuICAgICAgICBmaWVsZCA9IG5ldyBGaWVsZChmLm5hbWUoKSEsIHR5cGUsIGYubnVsbGFibGUoKSwgZGVjb2RlQ3VzdG9tTWV0YWRhdGEoZikpO1xuICAgIH1cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZVxuICAgIC8vIElmIGRpY3Rpb25hcnkgZW5jb2RlZCBhbmQgdGhlIGZpcnN0IHRpbWUgd2UndmUgc2VlbiB0aGlzIGRpY3Rpb25hcnkgaWQsIGRlY29kZVxuICAgIC8vIHRoZSBkYXRhIHR5cGUgYW5kIGNoaWxkIGZpZWxkcywgdGhlbiB3cmFwIGluIGEgRGljdGlvbmFyeSB0eXBlIGFuZCBpbnNlcnQgdGhlXG4gICAgLy8gZGF0YSB0eXBlIGludG8gdGhlIGRpY3Rpb25hcnkgdHlwZXMgbWFwLlxuICAgIGVsc2UgaWYgKCFkaWN0aW9uYXJpZXMuaGFzKGlkID0gZGljdE1ldGEuaWQoKS5sb3cpKSB7XG4gICAgICAgIC8vIGEgZGljdGlvbmFyeSBpbmRleCBkZWZhdWx0cyB0byBzaWduZWQgMzIgYml0IGludCBpZiB1bnNwZWNpZmllZFxuICAgICAgICBrZXlzID0gKGtleXMgPSBkaWN0TWV0YS5pbmRleFR5cGUoKSkgPyBkZWNvZGVJbmRleFR5cGUoa2V5cykgYXMgVEtleXMgOiBuZXcgSW50MzIoKTtcbiAgICAgICAgZGljdGlvbmFyaWVzLnNldChpZCwgdHlwZSA9IGRlY29kZUZpZWxkVHlwZShmLCBkZWNvZGVGaWVsZENoaWxkcmVuKGYpKSk7XG4gICAgICAgIGRpY3RUeXBlID0gbmV3IERpY3Rpb25hcnkodHlwZSwga2V5cywgaWQsIGRpY3RNZXRhLmlzT3JkZXJlZCgpKTtcbiAgICAgICAgZGljdEZpZWxkID0gbmV3IEZpZWxkKGYubmFtZSgpISwgZGljdFR5cGUsIGYubnVsbGFibGUoKSwgZGVjb2RlQ3VzdG9tTWV0YWRhdGEoZikpO1xuICAgICAgICBkaWN0aW9uYXJ5RmllbGRzLnNldChpZCwgW2ZpZWxkID0gZGljdEZpZWxkXSk7XG4gICAgfVxuICAgIC8vIElmIGRpY3Rpb25hcnkgZW5jb2RlZCwgYW5kIGhhdmUgYWxyZWFkeSBzZWVuIHRoaXMgZGljdGlvbmFyeSBJZCBpbiB0aGUgc2NoZW1hLCB0aGVuIHJldXNlIHRoZVxuICAgIC8vIGRhdGEgdHlwZSBhbmQgd3JhcCBpbiBhIG5ldyBEaWN0aW9uYXJ5IHR5cGUgYW5kIGZpZWxkLlxuICAgIGVsc2Uge1xuICAgICAgICAvLyBhIGRpY3Rpb25hcnkgaW5kZXggZGVmYXVsdHMgdG8gc2lnbmVkIDMyIGJpdCBpbnQgaWYgdW5zcGVjaWZpZWRcbiAgICAgICAga2V5cyA9IChrZXlzID0gZGljdE1ldGEuaW5kZXhUeXBlKCkpID8gZGVjb2RlSW5kZXhUeXBlKGtleXMpIGFzIFRLZXlzIDogbmV3IEludDMyKCk7XG4gICAgICAgIGRpY3RUeXBlID0gbmV3IERpY3Rpb25hcnkoZGljdGlvbmFyaWVzLmdldChpZCkhLCBrZXlzLCBpZCwgZGljdE1ldGEuaXNPcmRlcmVkKCkpO1xuICAgICAgICBkaWN0RmllbGQgPSBuZXcgRmllbGQoZi5uYW1lKCkhLCBkaWN0VHlwZSwgZi5udWxsYWJsZSgpLCBkZWNvZGVDdXN0b21NZXRhZGF0YShmKSk7XG4gICAgICAgIGRpY3Rpb25hcnlGaWVsZHMuZ2V0KGlkKSEucHVzaChmaWVsZCA9IGRpY3RGaWVsZCk7XG4gICAgfVxuICAgIHJldHVybiBmaWVsZCB8fCBudWxsO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZGVjb2RlQ3VzdG9tTWV0YWRhdGEocGFyZW50PzogX1NjaGVtYSB8IF9GaWVsZCB8IG51bGwpIHtcbiAgICBjb25zdCBkYXRhID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICBpZiAocGFyZW50KSB7XG4gICAgICAgIGZvciAobGV0IGVudHJ5LCBrZXksIGkgPSAtMSwgbiA9IHBhcmVudC5jdXN0b21NZXRhZGF0YUxlbmd0aCgpIHwgMDsgKytpIDwgbjspIHtcbiAgICAgICAgICAgIGlmICgoZW50cnkgPSBwYXJlbnQuY3VzdG9tTWV0YWRhdGEoaSkpICYmIChrZXkgPSBlbnRyeS5rZXkoKSkgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGRhdGEuc2V0KGtleSwgZW50cnkudmFsdWUoKSEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkYXRhO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZGVjb2RlSW5kZXhUeXBlKF90eXBlOiBfSW50KSB7XG4gICAgcmV0dXJuIG5ldyBJbnQoX3R5cGUuaXNTaWduZWQoKSwgX3R5cGUuYml0V2lkdGgoKSBhcyBJbnRCaXRXaWR0aCk7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBkZWNvZGVGaWVsZFR5cGUoZjogX0ZpZWxkLCBjaGlsZHJlbj86IEZpZWxkW10pOiBEYXRhVHlwZTxhbnk+IHtcblxuICAgIGNvbnN0IHR5cGVJZCA9IGYudHlwZVR5cGUoKTtcblxuICAgIHN3aXRjaCAodHlwZUlkKSB7XG4gICAgICAgIGNhc2UgVHlwZS5OT05FOiAgICByZXR1cm4gbmV3IERhdGFUeXBlKCk7XG4gICAgICAgIGNhc2UgVHlwZS5OdWxsOiAgICByZXR1cm4gbmV3IE51bGwoKTtcbiAgICAgICAgY2FzZSBUeXBlLkJpbmFyeTogIHJldHVybiBuZXcgQmluYXJ5KCk7XG4gICAgICAgIGNhc2UgVHlwZS5VdGY4OiAgICByZXR1cm4gbmV3IFV0ZjgoKTtcbiAgICAgICAgY2FzZSBUeXBlLkJvb2w6ICAgIHJldHVybiBuZXcgQm9vbCgpO1xuICAgICAgICBjYXNlIFR5cGUuTGlzdDogICAgcmV0dXJuIG5ldyBMaXN0KChjaGlsZHJlbiB8fCBbXSlbMF0pO1xuICAgICAgICBjYXNlIFR5cGUuU3RydWN0XzogcmV0dXJuIG5ldyBTdHJ1Y3QoY2hpbGRyZW4gfHwgW10pO1xuICAgIH1cblxuICAgIHN3aXRjaCAodHlwZUlkKSB7XG4gICAgICAgIGNhc2UgVHlwZS5JbnQ6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkludCgpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEludCh0LmlzU2lnbmVkKCksIHQuYml0V2lkdGgoKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLkZsb2F0aW5nUG9pbnQ6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZsb2F0aW5nUG9pbnQoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBGbG9hdCh0LnByZWNpc2lvbigpKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuRGVjaW1hbDoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGVjaW1hbCgpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IERlY2ltYWwodC5zY2FsZSgpLCB0LnByZWNpc2lvbigpKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuRGF0ZToge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGF0ZSgpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IERhdGVfKHQudW5pdCgpKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuVGltZToge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVGltZSgpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFRpbWUodC51bml0KCksIHQuYml0V2lkdGgoKSBhcyBUaW1lQml0V2lkdGgpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5UaW1lc3RhbXA6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlRpbWVzdGFtcCgpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFRpbWVzdGFtcCh0LnVuaXQoKSwgdC50aW1lem9uZSgpKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuSW50ZXJ2YWw6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkludGVydmFsKCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgSW50ZXJ2YWwodC51bml0KCkpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5Vbmlvbjoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVW5pb24oKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBVbmlvbih0Lm1vZGUoKSwgdC50eXBlSWRzQXJyYXkoKSB8fCBbXSwgY2hpbGRyZW4gfHwgW10pO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5GaXhlZFNpemVCaW5hcnk6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpeGVkU2l6ZUJpbmFyeSgpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEZpeGVkU2l6ZUJpbmFyeSh0LmJ5dGVXaWR0aCgpKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuRml4ZWRTaXplTGlzdDoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRml4ZWRTaXplTGlzdCgpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEZpeGVkU2l6ZUxpc3QodC5saXN0U2l6ZSgpLCAoY2hpbGRyZW4gfHwgW10pWzBdKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuTWFwOiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NYXAoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNYXBfKGNoaWxkcmVuIHx8IFtdLCB0LmtleXNTb3J0ZWQoKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKGBVbnJlY29nbml6ZWQgdHlwZTogXCIke1R5cGVbdHlwZUlkXX1cIiAoJHt0eXBlSWR9KWApO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZW5jb2RlU2NoZW1hKGI6IEJ1aWxkZXIsIHNjaGVtYTogU2NoZW1hKSB7XG5cbiAgICBjb25zdCBmaWVsZE9mZnNldHMgPSBzY2hlbWEuZmllbGRzLm1hcCgoZikgPT4gRmllbGQuZW5jb2RlKGIsIGYpKTtcblxuICAgIF9TY2hlbWEuc3RhcnRGaWVsZHNWZWN0b3IoYiwgZmllbGRPZmZzZXRzLmxlbmd0aCk7XG5cbiAgICBjb25zdCBmaWVsZHNWZWN0b3JPZmZzZXQgPSBfU2NoZW1hLmNyZWF0ZUZpZWxkc1ZlY3RvcihiLCBmaWVsZE9mZnNldHMpO1xuXG4gICAgY29uc3QgbWV0YWRhdGFPZmZzZXQgPSAhKHNjaGVtYS5tZXRhZGF0YSAmJiBzY2hlbWEubWV0YWRhdGEuc2l6ZSA+IDApID8gLTEgOlxuICAgICAgICBfU2NoZW1hLmNyZWF0ZUN1c3RvbU1ldGFkYXRhVmVjdG9yKGIsIFsuLi5zY2hlbWEubWV0YWRhdGFdLm1hcCgoW2ssIHZdKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBrZXkgPSBiLmNyZWF0ZVN0cmluZyhgJHtrfWApO1xuICAgICAgICAgICAgY29uc3QgdmFsID0gYi5jcmVhdGVTdHJpbmcoYCR7dn1gKTtcbiAgICAgICAgICAgIF9LZXlWYWx1ZS5zdGFydEtleVZhbHVlKGIpO1xuICAgICAgICAgICAgX0tleVZhbHVlLmFkZEtleShiLCBrZXkpO1xuICAgICAgICAgICAgX0tleVZhbHVlLmFkZFZhbHVlKGIsIHZhbCk7XG4gICAgICAgICAgICByZXR1cm4gX0tleVZhbHVlLmVuZEtleVZhbHVlKGIpO1xuICAgICAgICB9KSk7XG5cbiAgICBfU2NoZW1hLnN0YXJ0U2NoZW1hKGIpO1xuICAgIF9TY2hlbWEuYWRkRmllbGRzKGIsIGZpZWxkc1ZlY3Rvck9mZnNldCk7XG4gICAgX1NjaGVtYS5hZGRFbmRpYW5uZXNzKGIsIHBsYXRmb3JtSXNMaXR0bGVFbmRpYW4gPyBfRW5kaWFubmVzcy5MaXR0bGUgOiBfRW5kaWFubmVzcy5CaWcpO1xuXG4gICAgaWYgKG1ldGFkYXRhT2Zmc2V0ICE9PSAtMSkgeyBfU2NoZW1hLmFkZEN1c3RvbU1ldGFkYXRhKGIsIG1ldGFkYXRhT2Zmc2V0KTsgfVxuXG4gICAgcmV0dXJuIF9TY2hlbWEuZW5kU2NoZW1hKGIpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZW5jb2RlRmllbGQoYjogQnVpbGRlciwgZmllbGQ6IEZpZWxkKSB7XG5cbiAgICBsZXQgbmFtZU9mZnNldCA9IC0xO1xuICAgIGxldCB0eXBlT2Zmc2V0ID0gLTE7XG4gICAgbGV0IGRpY3Rpb25hcnlPZmZzZXQgPSAtMTtcblxuICAgIGxldCB0eXBlID0gZmllbGQudHlwZTtcbiAgICBsZXQgdHlwZUlkOiBUeXBlID0gPGFueT4gZmllbGQudHlwZUlkO1xuXG4gICAgaWYgKCFEYXRhVHlwZS5pc0RpY3Rpb25hcnkodHlwZSkpIHtcbiAgICAgICAgdHlwZU9mZnNldCA9IHR5cGVBc3NlbWJsZXIudmlzaXQodHlwZSwgYikhO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHR5cGVJZCA9IHR5cGUuZGljdGlvbmFyeS50eXBlSWQ7XG4gICAgICAgIGRpY3Rpb25hcnlPZmZzZXQgPSB0eXBlQXNzZW1ibGVyLnZpc2l0KHR5cGUsIGIpITtcbiAgICAgICAgdHlwZU9mZnNldCA9IHR5cGVBc3NlbWJsZXIudmlzaXQodHlwZS5kaWN0aW9uYXJ5LCBiKSE7XG4gICAgfVxuXG4gICAgY29uc3QgY2hpbGRPZmZzZXRzID0gKHR5cGUuY2hpbGRyZW4gfHwgW10pLm1hcCgoZjogRmllbGQpID0+IEZpZWxkLmVuY29kZShiLCBmKSk7XG4gICAgY29uc3QgY2hpbGRyZW5WZWN0b3JPZmZzZXQgPSBfRmllbGQuY3JlYXRlQ2hpbGRyZW5WZWN0b3IoYiwgY2hpbGRPZmZzZXRzKTtcblxuICAgIGNvbnN0IG1ldGFkYXRhT2Zmc2V0ID0gIShmaWVsZC5tZXRhZGF0YSAmJiBmaWVsZC5tZXRhZGF0YS5zaXplID4gMCkgPyAtMSA6XG4gICAgICAgIF9GaWVsZC5jcmVhdGVDdXN0b21NZXRhZGF0YVZlY3RvcihiLCBbLi4uZmllbGQubWV0YWRhdGFdLm1hcCgoW2ssIHZdKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBrZXkgPSBiLmNyZWF0ZVN0cmluZyhgJHtrfWApO1xuICAgICAgICAgICAgY29uc3QgdmFsID0gYi5jcmVhdGVTdHJpbmcoYCR7dn1gKTtcbiAgICAgICAgICAgIF9LZXlWYWx1ZS5zdGFydEtleVZhbHVlKGIpO1xuICAgICAgICAgICAgX0tleVZhbHVlLmFkZEtleShiLCBrZXkpO1xuICAgICAgICAgICAgX0tleVZhbHVlLmFkZFZhbHVlKGIsIHZhbCk7XG4gICAgICAgICAgICByZXR1cm4gX0tleVZhbHVlLmVuZEtleVZhbHVlKGIpO1xuICAgICAgICB9KSk7XG5cbiAgICBpZiAoZmllbGQubmFtZSkge1xuICAgICAgICBuYW1lT2Zmc2V0ID0gYi5jcmVhdGVTdHJpbmcoZmllbGQubmFtZSk7XG4gICAgfVxuXG4gICAgX0ZpZWxkLnN0YXJ0RmllbGQoYik7XG4gICAgX0ZpZWxkLmFkZFR5cGUoYiwgdHlwZU9mZnNldCk7XG4gICAgX0ZpZWxkLmFkZFR5cGVUeXBlKGIsIHR5cGVJZCk7XG4gICAgX0ZpZWxkLmFkZENoaWxkcmVuKGIsIGNoaWxkcmVuVmVjdG9yT2Zmc2V0KTtcbiAgICBfRmllbGQuYWRkTnVsbGFibGUoYiwgISFmaWVsZC5udWxsYWJsZSk7XG5cbiAgICBpZiAobmFtZU9mZnNldCAhPT0gLTEpIHsgX0ZpZWxkLmFkZE5hbWUoYiwgbmFtZU9mZnNldCk7IH1cbiAgICBpZiAoZGljdGlvbmFyeU9mZnNldCAhPT0gLTEpIHsgX0ZpZWxkLmFkZERpY3Rpb25hcnkoYiwgZGljdGlvbmFyeU9mZnNldCk7IH1cbiAgICBpZiAobWV0YWRhdGFPZmZzZXQgIT09IC0xKSB7IF9GaWVsZC5hZGRDdXN0b21NZXRhZGF0YShiLCBtZXRhZGF0YU9mZnNldCk7IH1cblxuICAgIHJldHVybiBfRmllbGQuZW5kRmllbGQoYik7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBlbmNvZGVSZWNvcmRCYXRjaChiOiBCdWlsZGVyLCByZWNvcmRCYXRjaDogUmVjb3JkQmF0Y2gpIHtcblxuICAgIGNvbnN0IG5vZGVzID0gcmVjb3JkQmF0Y2gubm9kZXMgfHwgW107XG4gICAgY29uc3QgYnVmZmVycyA9IHJlY29yZEJhdGNoLmJ1ZmZlcnMgfHwgW107XG5cbiAgICBfUmVjb3JkQmF0Y2guc3RhcnROb2Rlc1ZlY3RvcihiLCBub2Rlcy5sZW5ndGgpO1xuICAgIG5vZGVzLnNsaWNlKCkucmV2ZXJzZSgpLmZvckVhY2goKG4pID0+IEZpZWxkTm9kZS5lbmNvZGUoYiwgbikpO1xuXG4gICAgY29uc3Qgbm9kZXNWZWN0b3JPZmZzZXQgPSBiLmVuZFZlY3RvcigpO1xuXG4gICAgX1JlY29yZEJhdGNoLnN0YXJ0QnVmZmVyc1ZlY3RvcihiLCBidWZmZXJzLmxlbmd0aCk7XG4gICAgYnVmZmVycy5zbGljZSgpLnJldmVyc2UoKS5mb3JFYWNoKChiXykgPT4gQnVmZmVyUmVnaW9uLmVuY29kZShiLCBiXykpO1xuXG4gICAgY29uc3QgYnVmZmVyc1ZlY3Rvck9mZnNldCA9IGIuZW5kVmVjdG9yKCk7XG5cbiAgICBfUmVjb3JkQmF0Y2guc3RhcnRSZWNvcmRCYXRjaChiKTtcbiAgICBfUmVjb3JkQmF0Y2guYWRkTGVuZ3RoKGIsIG5ldyBMb25nKHJlY29yZEJhdGNoLmxlbmd0aCwgMCkpO1xuICAgIF9SZWNvcmRCYXRjaC5hZGROb2RlcyhiLCBub2Rlc1ZlY3Rvck9mZnNldCk7XG4gICAgX1JlY29yZEJhdGNoLmFkZEJ1ZmZlcnMoYiwgYnVmZmVyc1ZlY3Rvck9mZnNldCk7XG4gICAgcmV0dXJuIF9SZWNvcmRCYXRjaC5lbmRSZWNvcmRCYXRjaChiKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGVuY29kZURpY3Rpb25hcnlCYXRjaChiOiBCdWlsZGVyLCBkaWN0aW9uYXJ5QmF0Y2g6IERpY3Rpb25hcnlCYXRjaCkge1xuICAgIGNvbnN0IGRhdGFPZmZzZXQgPSBSZWNvcmRCYXRjaC5lbmNvZGUoYiwgZGljdGlvbmFyeUJhdGNoLmRhdGEpO1xuICAgIF9EaWN0aW9uYXJ5QmF0Y2guc3RhcnREaWN0aW9uYXJ5QmF0Y2goYik7XG4gICAgX0RpY3Rpb25hcnlCYXRjaC5hZGRJZChiLCBuZXcgTG9uZyhkaWN0aW9uYXJ5QmF0Y2guaWQsIDApKTtcbiAgICBfRGljdGlvbmFyeUJhdGNoLmFkZElzRGVsdGEoYiwgZGljdGlvbmFyeUJhdGNoLmlzRGVsdGEpO1xuICAgIF9EaWN0aW9uYXJ5QmF0Y2guYWRkRGF0YShiLCBkYXRhT2Zmc2V0KTtcbiAgICByZXR1cm4gX0RpY3Rpb25hcnlCYXRjaC5lbmREaWN0aW9uYXJ5QmF0Y2goYik7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBlbmNvZGVGaWVsZE5vZGUoYjogQnVpbGRlciwgbm9kZTogRmllbGROb2RlKSB7XG4gICAgcmV0dXJuIF9GaWVsZE5vZGUuY3JlYXRlRmllbGROb2RlKGIsIG5ldyBMb25nKG5vZGUubGVuZ3RoLCAwKSwgbmV3IExvbmcobm9kZS5udWxsQ291bnQsIDApKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGVuY29kZUJ1ZmZlclJlZ2lvbihiOiBCdWlsZGVyLCBub2RlOiBCdWZmZXJSZWdpb24pIHtcbiAgICByZXR1cm4gX0J1ZmZlci5jcmVhdGVCdWZmZXIoYiwgbmV3IExvbmcobm9kZS5vZmZzZXQsIDApLCBuZXcgTG9uZyhub2RlLmxlbmd0aCwgMCkpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuY29uc3QgcGxhdGZvcm1Jc0xpdHRsZUVuZGlhbiA9IChmdW5jdGlvbigpIHtcbiAgICBjb25zdCBidWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIoMik7XG4gICAgbmV3IERhdGFWaWV3KGJ1ZmZlcikuc2V0SW50MTYoMCwgMjU2LCB0cnVlIC8qIGxpdHRsZUVuZGlhbiAqLyk7XG4gICAgLy8gSW50MTZBcnJheSB1c2VzIHRoZSBwbGF0Zm9ybSdzIGVuZGlhbm5lc3MuXG4gICAgcmV0dXJuIG5ldyBJbnQxNkFycmF5KGJ1ZmZlcilbMF0gPT09IDI1Njtcbn0pKCk7XG5cbi8qKiBAaWdub3JlICovXG50eXBlIE1lc3NhZ2VIZWFkZXJEZWNvZGVyID0gPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyPigpID0+IFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyLlNjaGVtYSA/IFNjaGVtYVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBUIGV4dGVuZHMgTWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaCA/IFJlY29yZEJhdGNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaCA/IERpY3Rpb25hcnlCYXRjaCA6IG5ldmVyO1xuIl19

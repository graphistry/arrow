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
import { flatbuffers } from 'flatbuffers';
import * as Schema_ from '../../fb/Schema';
import * as Message_ from '../../fb/Message';
import { Schema, Field } from '../../schema';
import { toUint8Array } from '../../util/buffer';
import { MessageHeader, MetadataVersion } from '../../enum';
import { instance as typeAssembler } from '../../visitor/typeassembler';
import { fieldFromJSON, schemaFromJSON, recordBatchFromJSON, dictionaryBatchFromJSON } from './json';
var Long = flatbuffers.Long;
var Builder = flatbuffers.Builder;
var ByteBuffer = flatbuffers.ByteBuffer;
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
import { DataType, Dictionary, Utf8, Binary, Decimal, FixedSizeBinary, List, FixedSizeList, Map_, Struct, Union, Bool, Null, Int, Float, Date_, Time, Interval, Timestamp, Int32, } from '../../type';
/** @ignore */
export class Message {
    constructor(bodyLength, version, headerType, header) {
        this._version = version;
        this._headerType = headerType;
        this.body = new Uint8Array(0);
        header && (this._createHeader = () => header);
        this._bodyLength = typeof bodyLength === 'number' ? bodyLength : bodyLength.low;
    }
    /** @nocollapse */
    static fromJSON(msg, headerType) {
        const message = new Message(0, MetadataVersion.V4, headerType);
        message._createHeader = messageHeaderFromJSON(msg, headerType);
        return message;
    }
    /** @nocollapse */
    static decode(buf) {
        buf = new ByteBuffer(toUint8Array(buf));
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
            headerOffset = Schema.encode(b, message.header());
        }
        else if (message.isRecordBatch()) {
            headerOffset = RecordBatch.encode(b, message.header());
        }
        else if (message.isDictionaryBatch()) {
            headerOffset = DictionaryBatch.encode(b, message.header());
        }
        _Message.startMessage(b);
        _Message.addVersion(b, MetadataVersion.V4);
        _Message.addHeader(b, headerOffset);
        _Message.addHeaderType(b, message.headerType);
        _Message.addBodyLength(b, new Long(message.bodyLength, 0));
        _Message.finishMessageBuffer(b, _Message.endMessage(b));
        return b.asUint8Array();
    }
    /** @nocollapse */
    static from(header, bodyLength = 0) {
        if (header instanceof Schema) {
            return new Message(0, MetadataVersion.V4, MessageHeader.Schema, header);
        }
        if (header instanceof RecordBatch) {
            return new Message(bodyLength, MetadataVersion.V4, MessageHeader.RecordBatch, header);
        }
        if (header instanceof DictionaryBatch) {
            return new Message(bodyLength, MetadataVersion.V4, MessageHeader.DictionaryBatch, header);
        }
        throw new Error(`Unrecognized Message header: ${header}`);
    }
    get type() { return this.headerType; }
    get version() { return this._version; }
    get headerType() { return this._headerType; }
    get bodyLength() { return this._bodyLength; }
    header() { return this._createHeader(); }
    isSchema() { return this.headerType === MessageHeader.Schema; }
    isRecordBatch() { return this.headerType === MessageHeader.RecordBatch; }
    isDictionaryBatch() { return this.headerType === MessageHeader.DictionaryBatch; }
}
/** @ignore */
export class RecordBatch {
    get nodes() { return this._nodes; }
    get length() { return this._length; }
    get buffers() { return this._buffers; }
    constructor(length, nodes, buffers) {
        this._nodes = nodes;
        this._buffers = buffers;
        this._length = typeof length === 'number' ? length : length.low;
    }
}
/** @ignore */
export class DictionaryBatch {
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
/** @ignore */
export class BufferRegion {
    constructor(offset, length) {
        this.offset = typeof offset === 'number' ? offset : offset.low;
        this.length = typeof length === 'number' ? length : length.low;
    }
}
/** @ignore */
export class FieldNode {
    constructor(length, nullCount) {
        this.length = typeof length === 'number' ? length : length.low;
        this.nullCount = typeof nullCount === 'number' ? nullCount : nullCount.low;
    }
}
function messageHeaderFromJSON(message, type) {
    return (() => {
        switch (type) {
            case MessageHeader.Schema: return Schema.fromJSON(message);
            case MessageHeader.RecordBatch: return RecordBatch.fromJSON(message);
            case MessageHeader.DictionaryBatch: return DictionaryBatch.fromJSON(message);
        }
        throw new Error(`Unrecognized Message type: { name: ${MessageHeader[type]}, type: ${type} }`);
    });
}
function decodeMessageHeader(message, type) {
    return (() => {
        switch (type) {
            case MessageHeader.Schema: return Schema.decode(message.header(new _Schema()));
            case MessageHeader.RecordBatch: return RecordBatch.decode(message.header(new _RecordBatch()), message.version());
            case MessageHeader.DictionaryBatch: return DictionaryBatch.decode(message.header(new _DictionaryBatch()), message.version());
        }
        throw new Error(`Unrecognized Message type: { name: ${MessageHeader[type]}, type: ${type} }`);
    });
}
Field['encode'] = encodeField;
Field['decode'] = decodeField;
Field['fromJSON'] = fieldFromJSON;
Schema['encode'] = encodeSchema;
Schema['decode'] = decodeSchema;
Schema['fromJSON'] = schemaFromJSON;
RecordBatch['encode'] = encodeRecordBatch;
RecordBatch['decode'] = decodeRecordBatch;
RecordBatch['fromJSON'] = recordBatchFromJSON;
DictionaryBatch['encode'] = encodeDictionaryBatch;
DictionaryBatch['decode'] = decodeDictionaryBatch;
DictionaryBatch['fromJSON'] = dictionaryBatchFromJSON;
FieldNode['encode'] = encodeFieldNode;
FieldNode['decode'] = decodeFieldNode;
BufferRegion['encode'] = encodeBufferRegion;
BufferRegion['decode'] = decodeBufferRegion;
/** @ignore */
function decodeSchema(_schema, dictionaries = new Map(), dictionaryFields = new Map()) {
    const fields = decodeSchemaFields(_schema, dictionaries, dictionaryFields);
    return new Schema(fields, decodeCustomMetadata(_schema), dictionaries, dictionaryFields);
}
/** @ignore */
function decodeRecordBatch(batch, version = MetadataVersion.V4) {
    return new RecordBatch(batch.length(), decodeFieldNodes(batch), decodeBuffers(batch, version));
}
/** @ignore */
function decodeDictionaryBatch(batch, version = MetadataVersion.V4) {
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
            if (version < MetadataVersion.V4) {
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
            fields[++j] = Field.decode(f, dictionaries, dictionaryFields);
        }
    }
    return fields;
}
/** @ignore */
function decodeFieldChildren(field, dictionaries, dictionaryFields) {
    const children = [];
    for (let f, i = -1, j = -1, n = field.childrenLength(); ++i < n;) {
        if (f = field.children(i)) {
            children[++j] = Field.decode(f, dictionaries, dictionaryFields);
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
        field = new Field(f.name(), type, f.nullable(), decodeCustomMetadata(f));
    }
    // tslint:disable
    // If dictionary encoded and the first time we've seen this dictionary id, decode
    // the data type and child fields, then wrap in a Dictionary type and insert the
    // data type into the dictionary types map.
    else if (!dictionaries.has(id = dictMeta.id().low)) {
        // a dictionary index defaults to signed 32 bit int if unspecified
        keys = (keys = dictMeta.indexType()) ? decodeIndexType(keys) : new Int32();
        dictionaries.set(id, type = decodeFieldType(f, decodeFieldChildren(f)));
        dictType = new Dictionary(type, keys, id, dictMeta.isOrdered());
        dictField = new Field(f.name(), dictType, f.nullable(), decodeCustomMetadata(f));
        dictionaryFields.set(id, [field = dictField]);
    }
    // If dictionary encoded, and have already seen this dictionary Id in the schema, then reuse the
    // data type and wrap in a new Dictionary type and field.
    else {
        // a dictionary index defaults to signed 32 bit int if unspecified
        keys = (keys = dictMeta.indexType()) ? decodeIndexType(keys) : new Int32();
        dictType = new Dictionary(dictionaries.get(id), keys, id, dictMeta.isOrdered());
        dictField = new Field(f.name(), dictType, f.nullable(), decodeCustomMetadata(f));
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
    return new Int(_type.isSigned(), _type.bitWidth());
}
/** @ignore */
function decodeFieldType(f, children) {
    const typeId = f.typeType();
    switch (typeId) {
        case Type.NONE: return new DataType();
        case Type.Null: return new Null();
        case Type.Binary: return new Binary();
        case Type.Utf8: return new Utf8();
        case Type.Bool: return new Bool();
        case Type.List: return new List((children || [])[0]);
        case Type.Struct_: return new Struct(children || []);
    }
    switch (typeId) {
        case Type.Int: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.Int());
            return new Int(t.isSigned(), t.bitWidth());
        }
        case Type.FloatingPoint: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.FloatingPoint());
            return new Float(t.precision());
        }
        case Type.Decimal: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.Decimal());
            return new Decimal(t.scale(), t.precision());
        }
        case Type.Date: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.Date());
            return new Date_(t.unit());
        }
        case Type.Time: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.Time());
            return new Time(t.unit(), t.bitWidth());
        }
        case Type.Timestamp: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.Timestamp());
            return new Timestamp(t.unit(), t.timezone());
        }
        case Type.Interval: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.Interval());
            return new Interval(t.unit());
        }
        case Type.Union: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.Union());
            return new Union(t.mode(), t.typeIdsArray() || [], children || []);
        }
        case Type.FixedSizeBinary: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.FixedSizeBinary());
            return new FixedSizeBinary(t.byteWidth());
        }
        case Type.FixedSizeList: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.FixedSizeList());
            return new FixedSizeList(t.listSize(), (children || [])[0]);
        }
        case Type.Map: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.Map());
            return new Map_(children || [], t.keysSorted());
        }
    }
    throw new Error(`Unrecognized type: "${Type[typeId]}" (${typeId})`);
}
/** @ignore */
function encodeSchema(b, schema) {
    const fieldOffsets = schema.fields.map((f) => Field.encode(b, f));
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
    if (!DataType.isDictionary(type)) {
        typeOffset = typeAssembler.visit(type, b);
    }
    else {
        typeId = type.dictionary.typeId;
        dictionaryOffset = typeAssembler.visit(type, b);
        typeOffset = typeAssembler.visit(type.dictionary, b);
    }
    const childOffsets = (type.children || []).map((f) => Field.encode(b, f));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlwYy9tZXRhZGF0YS9tZXNzYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDZEQUE2RDtBQUM3RCwrREFBK0Q7QUFDL0Qsd0RBQXdEO0FBQ3hELDZEQUE2RDtBQUM3RCxvREFBb0Q7QUFDcEQsNkRBQTZEO0FBQzdELDZEQUE2RDtBQUM3RCxFQUFFO0FBQ0YsK0NBQStDO0FBQy9DLEVBQUU7QUFDRiw2REFBNkQ7QUFDN0QsOERBQThEO0FBQzlELHlEQUF5RDtBQUN6RCw0REFBNEQ7QUFDNUQsMERBQTBEO0FBQzFELHFCQUFxQjtBQUVyQixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQzFDLE9BQU8sS0FBSyxPQUFPLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxLQUFLLFFBQVEsTUFBTSxrQkFBa0IsQ0FBQztBQUU3QyxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUM3QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFakQsT0FBTyxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDNUQsT0FBTyxFQUFFLFFBQVEsSUFBSSxhQUFhLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN4RSxPQUFPLEVBQUUsYUFBYSxFQUFFLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUVyRyxJQUFPLElBQUksR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDO0FBQy9CLElBQU8sT0FBTyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUM7QUFDckMsSUFBTyxVQUFVLEdBQUcsV0FBVyxDQUFDLFVBQVUsQ0FBQztBQUUzQyxJQUFPLElBQUksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztBQUNwRCxJQUFPLE1BQU0sR0FBRyxPQUFPLENBQUMs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LENBQUM7SUFDbEMsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDL0QsNkNBQTZDO0lBQzdDLE9BQU8sSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxFQUFFLENBQUMiLCJmaWxlIjoiaXBjL21ldGFkYXRhL21lc3NhZ2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgZmxhdGJ1ZmZlcnMgfSBmcm9tICdmbGF0YnVmZmVycyc7XG5pbXBvcnQgKiBhcyBTY2hlbWFfIGZyb20gJy4uLy4uL2ZiL1NjaGVtYSc7XG5pbXBvcnQgKiBhcyBNZXNzYWdlXyBmcm9tICcuLi8uLi9mYi9NZXNzYWdlJztcblxuaW1wb3J0IHsgU2NoZW1hLCBGaWVsZCB9IGZyb20gJy4uLy4uL3NjaGVtYSc7XG5pbXBvcnQgeyB0b1VpbnQ4QXJyYXkgfSBmcm9tICcuLi8uLi91dGlsL2J1ZmZlcic7XG5pbXBvcnQgeyBBcnJheUJ1ZmZlclZpZXdJbnB1dCB9IGZyb20gJy4uLy4uL3V0aWwvYnVmZmVyJztcbmltcG9ydCB7IE1lc3NhZ2VIZWFkZXIsIE1ldGFkYXRhVmVyc2lvbiB9IGZyb20gJy4uLy4uL2VudW0nO1xuaW1wb3J0IHsgaW5zdGFuY2UgYXMgdHlwZUFzc2VtYmxlciB9IGZyb20gJy4uLy4uL3Zpc2l0b3IvdHlwZWFzc2VtYmxlcic7XG5pbXBvcnQgeyBmaWVsZEZyb21KU09OLCBzY2hlbWFGcm9tSlNPTiwgcmVjb3JkQmF0Y2hGcm9tSlNPTiwgZGljdGlvbmFyeUJhdGNoRnJvbUpTT04gfSBmcm9tICcuL2pzb24nO1xuXG5pbXBvcnQgTG9uZyA9IGZsYXRidWZmZXJzLkxvbmc7XG5pbXBvcnQgQnVpbGRlciA9IGZsYXRidWZmZXJzLkJ1aWxkZXI7XG5pbXBvcnQgQnl0ZUJ1ZmZlciA9IGZsYXRidWZmZXJzLkJ5dGVCdWZmZXI7XG5pbXBvcnQgX0ludCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkludDtcbmltcG9ydCBUeXBlID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVHlwZTtcbmltcG9ydCBfRmllbGQgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaWVsZDtcbmltcG9ydCBfU2NoZW1hID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuU2NoZW1hO1xuaW1wb3J0IF9CdWZmZXIgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5CdWZmZXI7XG5pbXBvcnQgX01lc3NhZ2UgPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTWVzc2FnZTtcbmltcG9ydCBfS2V5VmFsdWUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5LZXlWYWx1ZTtcbmltcG9ydCBfRmllbGROb2RlID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpZWxkTm9kZTtcbmltcG9ydCBfRW5kaWFubmVzcyA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkVuZGlhbm5lc3M7XG5pbXBvcnQgX1JlY29yZEJhdGNoID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlJlY29yZEJhdGNoO1xuaW1wb3J0IF9EaWN0aW9uYXJ5QmF0Y2ggPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGljdGlvbmFyeUJhdGNoO1xuaW1wb3J0IF9EaWN0aW9uYXJ5RW5jb2RpbmcgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EaWN0aW9uYXJ5RW5jb2Rpbmc7XG5cbmltcG9ydCB7XG4gICAgRGF0YVR5cGUsIERpY3Rpb25hcnksIFRpbWVCaXRXaWR0aCxcbiAgICBVdGY4LCBCaW5hcnksIERlY2ltYWwsIEZpeGVkU2l6ZUJpbmFyeSxcbiAgICBMaXN0LCBGaXhlZFNpemVMaXN0LCBNYXBfLCBTdHJ1Y3QsIFVuaW9uLFxuICAgIEJvb2wsIE51bGwsIEludCwgRmxvYXQsIERhdGVfLCBUaW1lLCBJbnRlcnZhbCwgVGltZXN0YW1wLCBJbnRCaXRXaWR0aCwgSW50MzIsIFRLZXlzLFxufSBmcm9tICcuLi8uLi90eXBlJztcblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjbGFzcyBNZXNzYWdlPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyID0gYW55PiB7XG5cbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGZyb21KU09OPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyPihtc2c6IGFueSwgaGVhZGVyVHlwZTogVCk6IE1lc3NhZ2U8VD4ge1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gbmV3IE1lc3NhZ2UoMCwgTWV0YWRhdGFWZXJzaW9uLlY0LCBoZWFkZXJUeXBlKTtcbiAgICAgICAgbWVzc2FnZS5fY3JlYXRlSGVhZGVyID0gbWVzc2FnZUhlYWRlckZyb21KU09OKG1zZywgaGVhZGVyVHlwZSk7XG4gICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgIH1cblxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZGVjb2RlKGJ1ZjogQXJyYXlCdWZmZXJWaWV3SW5wdXQpIHtcbiAgICAgICAgYnVmID0gbmV3IEJ5dGVCdWZmZXIodG9VaW50OEFycmF5KGJ1ZikpO1xuICAgICAgICBjb25zdCBfbWVzc2FnZSA9IF9NZXNzYWdlLmdldFJvb3RBc01lc3NhZ2UoYnVmKTtcbiAgICAgICAgY29uc3QgYm9keUxlbmd0aDogTG9uZyA9IF9tZXNzYWdlLmJvZHlMZW5ndGgoKSE7XG4gICAgICAgIGNvbnN0IHZlcnNpb246IE1ldGFkYXRhVmVyc2lvbiA9IF9tZXNzYWdlLnZlcnNpb24oKTtcbiAgICAgICAgY29uc3QgaGVhZGVyVHlwZTogTWVzc2FnZUhlYWRlciA9IF9tZXNzYWdlLmhlYWRlclR5cGUoKTtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IG5ldyBNZXNzYWdlKGJvZHlMZW5ndGgsIHZlcnNpb24sIGhlYWRlclR5cGUpO1xuICAgICAgICBtZXNzYWdlLl9jcmVhdGVIZWFkZXIgPSBkZWNvZGVNZXNzYWdlSGVhZGVyKF9tZXNzYWdlLCBoZWFkZXJUeXBlKTtcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgfVxuXG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBlbmNvZGU8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KG1lc3NhZ2U6IE1lc3NhZ2U8VD4pIHtcbiAgICAgICAgbGV0IGIgPSBuZXcgQnVpbGRlcigpLCBoZWFkZXJPZmZzZXQgPSAtMTtcbiAgICAgICAgaWYgKG1lc3NhZ2UuaXNTY2hlbWEoKSkge1xuICAgICAgICAgICAgaGVhZGVyT2Zmc2V0ID0gU2NoZW1hLmVuY29kZShiLCBtZXNzYWdlLmhlYWRlcigpIGFzIFNjaGVtYSk7XG4gICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5pc1JlY29yZEJhdGNoKCkpIHtcbiAgICAgICAgICAgIGhlYWRlck9mZnNldCA9IFJlY29yZEJhdGNoLmVuY29kZShiLCBtZXNzYWdlLmhlYWRlcigpIGFzIFJlY29yZEJhdGNoKTtcbiAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmlzRGljdGlvbmFyeUJhdGNoKCkpIHtcbiAgICAgICAgICAgIGhlYWRlck9mZnNldCA9IERpY3Rpb25hcnlCYXRjaC5lbmNvZGUoYiwgbWVzc2FnZS5oZWFkZXIoKSBhcyBEaWN0aW9uYXJ5QmF0Y2gpO1xuICAgICAgICB9XG4gICAgICAgIF9NZXNzYWdlLnN0YXJ0TWVzc2FnZShiKTtcbiAgICAgICAgX01lc3NhZ2UuYWRkVmVyc2lvbihiLCBNZXRhZGF0YVZlcnNpb24uVjQpO1xuICAgICAgICBfTWVzc2FnZS5hZGRIZWFkZXIoYiwgaGVhZGVyT2Zmc2V0KTtcbiAgICAgICAgX01lc3NhZ2UuYWRkSGVhZGVyVHlwZShiLCBtZXNzYWdlLmhlYWRlclR5cGUpO1xuICAgICAgICBfTWVzc2FnZS5hZGRCb2R5TGVuZ3RoKGIsIG5ldyBMb25nKG1lc3NhZ2UuYm9keUxlbmd0aCwgMCkpO1xuICAgICAgICBfTWVzc2FnZS5maW5pc2hNZXNzYWdlQnVmZmVyKGIsIF9NZXNzYWdlLmVuZE1lc3NhZ2UoYikpO1xuICAgICAgICByZXR1cm4gYi5hc1VpbnQ4QXJyYXkoKTtcbiAgICB9XG5cbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGZyb20oaGVhZGVyOiBTY2hlbWEgfCBSZWNvcmRCYXRjaCB8IERpY3Rpb25hcnlCYXRjaCwgYm9keUxlbmd0aCA9IDApIHtcbiAgICAgICAgaWYgKGhlYWRlciBpbnN0YW5jZW9mIFNjaGVtYSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNZXNzYWdlKDAsIE1ldGFkYXRhVmVyc2lvbi5WNCwgTWVzc2FnZUhlYWRlci5TY2hlbWEsIGhlYWRlcik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhlYWRlciBpbnN0YW5jZW9mIFJlY29yZEJhdGNoKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1lc3NhZ2UoYm9keUxlbmd0aCwgTWV0YWRhdGFWZXJzaW9uLlY0LCBNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoLCBoZWFkZXIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChoZWFkZXIgaW5zdGFuY2VvZiBEaWN0aW9uYXJ5QmF0Y2gpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgTWVzc2FnZShib2R5TGVuZ3RoLCBNZXRhZGF0YVZlcnNpb24uVjQsIE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoLCBoZWFkZXIpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5yZWNvZ25pemVkIE1lc3NhZ2UgaGVhZGVyOiAke2hlYWRlcn1gKTtcbiAgICB9XG5cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIGJvZHk6IFVpbnQ4QXJyYXk7XG4gICAgcHJvdGVjdGVkIF9oZWFkZXJUeXBlOiBUO1xuICAgIHByb3RlY3RlZCBfYm9keUxlbmd0aDogbnVtYmVyO1xuICAgIHByb3RlY3RlZCBfdmVyc2lvbjogTWV0YWRhdGFWZXJzaW9uO1xuICAgIHB1YmxpYyBnZXQgdHlwZSgpIHsgcmV0dXJuIHRoaXMuaGVhZGVyVHlwZTsgfVxuICAgIHB1YmxpYyBnZXQgdmVyc2lvbigpIHsgcmV0dXJuIHRoaXMuX3ZlcnNpb247IH1cbiAgICBwdWJsaWMgZ2V0IGhlYWRlclR5cGUoKSB7IHJldHVybiB0aGlzLl9oZWFkZXJUeXBlOyB9XG4gICAgcHVibGljIGdldCBib2R5TGVuZ3RoKCkgeyByZXR1cm4gdGhpcy5fYm9keUxlbmd0aDsgfVxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwcm90ZWN0ZWQgX2NyZWF0ZUhlYWRlcjogTWVzc2FnZUhlYWRlckRlY29kZXI7XG4gICAgcHVibGljIGhlYWRlcigpIHsgcmV0dXJuIHRoaXMuX2NyZWF0ZUhlYWRlcjxUPigpOyB9XG4gICAgcHVibGljIGlzU2NoZW1hKCk6IHRoaXMgaXMgTWVzc2FnZTxNZXNzYWdlSGVhZGVyLlNjaGVtYT4geyByZXR1cm4gdGhpcy5oZWFkZXJUeXBlID09PSBNZXNzYWdlSGVhZGVyLlNjaGVtYTsgfVxuICAgIHB1YmxpYyBpc1JlY29yZEJhdGNoKCk6IHRoaXMgaXMgTWVzc2FnZTxNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoPiB7IHJldHVybiB0aGlzLmhlYWRlclR5cGUgPT09IE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2g7IH1cbiAgICBwdWJsaWMgaXNEaWN0aW9uYXJ5QmF0Y2goKTogdGhpcyBpcyBNZXNzYWdlPE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoPiB7IHJldHVybiB0aGlzLmhlYWRlclR5cGUgPT09IE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoOyB9XG5cbiAgICBjb25zdHJ1Y3Rvcihib2R5TGVuZ3RoOiBMb25nIHwgbnVtYmVyLCB2ZXJzaW9uOiBNZXRhZGF0YVZlcnNpb24sIGhlYWRlclR5cGU6IFQsIGhlYWRlcj86IGFueSkge1xuICAgICAgICB0aGlzLl92ZXJzaW9uID0gdmVyc2lvbjtcbiAgICAgICAgdGhpcy5faGVhZGVyVHlwZSA9IGhlYWRlclR5cGU7XG4gICAgICAgIHRoaXMuYm9keSA9IG5ldyBVaW50OEFycmF5KDApO1xuICAgICAgICBoZWFkZXIgJiYgKHRoaXMuX2NyZWF0ZUhlYWRlciA9ICgpID0+IGhlYWRlcik7XG4gICAgICAgIHRoaXMuX2JvZHlMZW5ndGggPSB0eXBlb2YgYm9keUxlbmd0aCA9PT0gJ251bWJlcicgPyBib2R5TGVuZ3RoIDogYm9keUxlbmd0aC5sb3c7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIFJlY29yZEJhdGNoIHtcbiAgICBwcm90ZWN0ZWQgX2xlbmd0aDogbnVtYmVyO1xuICAgIHByb3RlY3RlZCBfbm9kZXM6IEZpZWxkTm9kZVtdO1xuICAgIHByb3RlY3RlZCBfYnVmZmVyczogQnVmZmVyUmVnaW9uW107XG4gICAgcHVibGljIGdldCBub2RlcygpIHsgcmV0dXJuIHRoaXMuX25vZGVzOyB9XG4gICAgcHVibGljIGdldCBsZW5ndGgoKSB7IHJldHVybiB0aGlzLl9sZW5ndGg7IH1cbiAgICBwdWJsaWMgZ2V0IGJ1ZmZlcnMoKSB7IHJldHVybiB0aGlzLl9idWZmZXJzOyB9XG4gICAgY29uc3RydWN0b3IobGVuZ3RoOiBMb25nIHwgbnVtYmVyLCBub2RlczogRmllbGROb2RlW10sIGJ1ZmZlcnM6IEJ1ZmZlclJlZ2lvbltdKSB7XG4gICAgICAgIHRoaXMuX25vZGVzID0gbm9kZXM7XG4gICAgICAgIHRoaXMuX2J1ZmZlcnMgPSBidWZmZXJzO1xuICAgICAgICB0aGlzLl9sZW5ndGggPSB0eXBlb2YgbGVuZ3RoID09PSAnbnVtYmVyJyA/IGxlbmd0aCA6IGxlbmd0aC5sb3c7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIERpY3Rpb25hcnlCYXRjaCB7XG5cbiAgICBwcm90ZWN0ZWQgX2lkOiBudW1iZXI7XG4gICAgcHJvdGVjdGVkIF9pc0RlbHRhOiBib29sZWFuO1xuICAgIHByb3RlY3RlZCBfZGF0YTogUmVjb3JkQmF0Y2g7XG4gICAgcHVibGljIGdldCBpZCgpIHsgcmV0dXJuIHRoaXMuX2lkOyB9XG4gICAgcHVibGljIGdldCBkYXRhKCkgeyByZXR1cm4gdGhpcy5fZGF0YTsgfVxuICAgIHB1YmxpYyBnZXQgaXNEZWx0YSgpIHsgcmV0dXJuIHRoaXMuX2lzRGVsdGE7IH1cbiAgICBwdWJsaWMgZ2V0IGxlbmd0aCgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5kYXRhLmxlbmd0aDsgfVxuICAgIHB1YmxpYyBnZXQgbm9kZXMoKTogRmllbGROb2RlW10geyByZXR1cm4gdGhpcy5kYXRhLm5vZGVzOyB9XG4gICAgcHVibGljIGdldCBidWZmZXJzKCk6IEJ1ZmZlclJlZ2lvbltdIHsgcmV0dXJuIHRoaXMuZGF0YS5idWZmZXJzOyB9XG5cbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBSZWNvcmRCYXRjaCwgaWQ6IExvbmcgfCBudW1iZXIsIGlzRGVsdGE6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgICAgICB0aGlzLl9kYXRhID0gZGF0YTtcbiAgICAgICAgdGhpcy5faXNEZWx0YSA9IGlzRGVsdGE7XG4gICAgICAgIHRoaXMuX2lkID0gdHlwZW9mIGlkID09PSAnbnVtYmVyJyA/IGlkIDogaWQubG93O1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjbGFzcyBCdWZmZXJSZWdpb24ge1xuICAgIHB1YmxpYyBvZmZzZXQ6IG51bWJlcjtcbiAgICBwdWJsaWMgbGVuZ3RoOiBudW1iZXI7XG4gICAgY29uc3RydWN0b3Iob2Zmc2V0OiBMb25nIHwgbnVtYmVyLCBsZW5ndGg6IExvbmcgfCBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5vZmZzZXQgPSB0eXBlb2Ygb2Zmc2V0ID09PSAnbnVtYmVyJyA/IG9mZnNldCA6IG9mZnNldC5sb3c7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gdHlwZW9mIGxlbmd0aCA9PT0gJ251bWJlcicgPyBsZW5ndGggOiBsZW5ndGgubG93O1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjbGFzcyBGaWVsZE5vZGUge1xuICAgIHB1YmxpYyBsZW5ndGg6IG51bWJlcjtcbiAgICBwdWJsaWMgbnVsbENvdW50OiBudW1iZXI7XG4gICAgY29uc3RydWN0b3IobGVuZ3RoOiBMb25nIHwgbnVtYmVyLCBudWxsQ291bnQ6IExvbmcgfCBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5sZW5ndGggPSB0eXBlb2YgbGVuZ3RoID09PSAnbnVtYmVyJyA/IGxlbmd0aCA6IGxlbmd0aC5sb3c7XG4gICAgICAgIHRoaXMubnVsbENvdW50ID0gdHlwZW9mIG51bGxDb3VudCA9PT0gJ251bWJlcicgPyBudWxsQ291bnQgOiBudWxsQ291bnQubG93O1xuICAgIH1cbn1cblxuZnVuY3Rpb24gbWVzc2FnZUhlYWRlckZyb21KU09OKG1lc3NhZ2U6IGFueSwgdHlwZTogTWVzc2FnZUhlYWRlcikge1xuICAgIHJldHVybiAoKCkgPT4ge1xuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgTWVzc2FnZUhlYWRlci5TY2hlbWE6IHJldHVybiBTY2hlbWEuZnJvbUpTT04obWVzc2FnZSk7XG4gICAgICAgICAgICBjYXNlIE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2g6IHJldHVybiBSZWNvcmRCYXRjaC5mcm9tSlNPTihtZXNzYWdlKTtcbiAgICAgICAgICAgIGNhc2UgTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2g6IHJldHVybiBEaWN0aW9uYXJ5QmF0Y2guZnJvbUpTT04obWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnJlY29nbml6ZWQgTWVzc2FnZSB0eXBlOiB7IG5hbWU6ICR7TWVzc2FnZUhlYWRlclt0eXBlXX0sIHR5cGU6ICR7dHlwZX0gfWApO1xuICAgIH0pIGFzIE1lc3NhZ2VIZWFkZXJEZWNvZGVyO1xufVxuXG5mdW5jdGlvbiBkZWNvZGVNZXNzYWdlSGVhZGVyKG1lc3NhZ2U6IF9NZXNzYWdlLCB0eXBlOiBNZXNzYWdlSGVhZGVyKSB7XG4gICAgcmV0dXJuICgoKSA9PiB7XG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLlNjaGVtYTogcmV0dXJuIFNjaGVtYS5kZWNvZGUobWVzc2FnZS5oZWFkZXIobmV3IF9TY2hlbWEoKSkhKTtcbiAgICAgICAgICAgIGNhc2UgTWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaDogcmV0dXJuIFJlY29yZEJhdGNoLmRlY29kZShtZXNzYWdlLmhlYWRlcihuZXcgX1JlY29yZEJhdGNoKCkpISwgbWVzc2FnZS52ZXJzaW9uKCkpO1xuICAgICAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaDogcmV0dXJuIERpY3Rpb25hcnlCYXRjaC5kZWNvZGUobWVzc2FnZS5oZWFkZXIobmV3IF9EaWN0aW9uYXJ5QmF0Y2goKSkhLCBtZXNzYWdlLnZlcnNpb24oKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnJlY29nbml6ZWQgTWVzc2FnZSB0eXBlOiB7IG5hbWU6ICR7TWVzc2FnZUhlYWRlclt0eXBlXX0sIHR5cGU6ICR7dHlwZX0gfWApO1xuICAgIH0pIGFzIE1lc3NhZ2VIZWFkZXJEZWNvZGVyO1xufVxuXG5GaWVsZFsnZW5jb2RlJ10gPSBlbmNvZGVGaWVsZDtcbkZpZWxkWydkZWNvZGUnXSA9IGRlY29kZUZpZWxkO1xuRmllbGRbJ2Zyb21KU09OJ10gPSBmaWVsZEZyb21KU09OO1xuXG5TY2hlbWFbJ2VuY29kZSddID0gZW5jb2RlU2NoZW1hO1xuU2NoZW1hWydkZWNvZGUnXSA9IGRlY29kZVNjaGVtYTtcblNjaGVtYVsnZnJvbUpTT04nXSA9IHNjaGVtYUZyb21KU09OO1xuXG5SZWNvcmRCYXRjaFsnZW5jb2RlJ10gPSBlbmNvZGVSZWNvcmRCYXRjaDtcblJlY29yZEJhdGNoWydkZWNvZGUnXSA9IGRlY29kZVJlY29yZEJhdGNoO1xuUmVjb3JkQmF0Y2hbJ2Zyb21KU09OJ10gPSByZWNvcmRCYXRjaEZyb21KU09OO1xuXG5EaWN0aW9uYXJ5QmF0Y2hbJ2VuY29kZSddID0gZW5jb2RlRGljdGlvbmFyeUJhdGNoO1xuRGljdGlvbmFyeUJhdGNoWydkZWNvZGUnXSA9IGRlY29kZURpY3Rpb25hcnlCYXRjaDtcbkRpY3Rpb25hcnlCYXRjaFsnZnJvbUpTT04nXSA9IGRpY3Rpb25hcnlCYXRjaEZyb21KU09OO1xuXG5GaWVsZE5vZGVbJ2VuY29kZSddID0gZW5jb2RlRmllbGROb2RlO1xuRmllbGROb2RlWydkZWNvZGUnXSA9IGRlY29kZUZpZWxkTm9kZTtcblxuQnVmZmVyUmVnaW9uWydlbmNvZGUnXSA9IGVuY29kZUJ1ZmZlclJlZ2lvbjtcbkJ1ZmZlclJlZ2lvblsnZGVjb2RlJ10gPSBkZWNvZGVCdWZmZXJSZWdpb247XG5cbmRlY2xhcmUgbW9kdWxlICcuLi8uLi9zY2hlbWEnIHtcbiAgICBuYW1lc3BhY2UgRmllbGQge1xuICAgICAgICBleHBvcnQgeyBlbmNvZGVGaWVsZCBhcyBlbmNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgZGVjb2RlRmllbGQgYXMgZGVjb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IGZpZWxkRnJvbUpTT04gYXMgZnJvbUpTT04gfTtcbiAgICB9XG4gICAgbmFtZXNwYWNlIFNjaGVtYSB7XG4gICAgICAgIGV4cG9ydCB7IGVuY29kZVNjaGVtYSBhcyBlbmNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgZGVjb2RlU2NoZW1hIGFzIGRlY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBzY2hlbWFGcm9tSlNPTiBhcyBmcm9tSlNPTiB9O1xuICAgIH1cbn1cblxuZGVjbGFyZSBtb2R1bGUgJy4vbWVzc2FnZScge1xuICAgIG5hbWVzcGFjZSBSZWNvcmRCYXRjaCB7XG4gICAgICAgIGV4cG9ydCB7IGVuY29kZVJlY29yZEJhdGNoIGFzIGVuY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBkZWNvZGVSZWNvcmRCYXRjaCBhcyBkZWNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgcmVjb3JkQmF0Y2hGcm9tSlNPTiBhcyBmcm9tSlNPTiB9O1xuICAgIH1cbiAgICBuYW1lc3BhY2UgRGljdGlvbmFyeUJhdGNoIHtcbiAgICAgICAgZXhwb3J0IHsgZW5jb2RlRGljdGlvbmFyeUJhdGNoIGFzIGVuY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBkZWNvZGVEaWN0aW9uYXJ5QmF0Y2ggYXMgZGVjb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IGRpY3Rpb25hcnlCYXRjaEZyb21KU09OIGFzIGZyb21KU09OIH07XG4gICAgfVxuICAgIG5hbWVzcGFjZSBGaWVsZE5vZGUge1xuICAgICAgICBleHBvcnQgeyBlbmNvZGVGaWVsZE5vZGUgYXMgZW5jb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IGRlY29kZUZpZWxkTm9kZSBhcyBkZWNvZGUgfTtcbiAgICB9XG4gICAgbmFtZXNwYWNlIEJ1ZmZlclJlZ2lvbiB7XG4gICAgICAgIGV4cG9ydCB7IGVuY29kZUJ1ZmZlclJlZ2lvbiBhcyBlbmNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgZGVjb2RlQnVmZmVyUmVnaW9uIGFzIGRlY29kZSB9O1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGRlY29kZVNjaGVtYShfc2NoZW1hOiBfU2NoZW1hLCBkaWN0aW9uYXJpZXM6IE1hcDxudW1iZXIsIERhdGFUeXBlPiA9IG5ldyBNYXAoKSwgZGljdGlvbmFyeUZpZWxkczogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeT5bXT4gPSBuZXcgTWFwKCkpIHtcbiAgICBjb25zdCBmaWVsZHMgPSBkZWNvZGVTY2hlbWFGaWVsZHMoX3NjaGVtYSwgZGljdGlvbmFyaWVzLCBkaWN0aW9uYXJ5RmllbGRzKTtcbiAgICByZXR1cm4gbmV3IFNjaGVtYShmaWVsZHMsIGRlY29kZUN1c3RvbU1ldGFkYXRhKF9zY2hlbWEpLCBkaWN0aW9uYXJpZXMsIGRpY3Rpb25hcnlGaWVsZHMpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZGVjb2RlUmVjb3JkQmF0Y2goYmF0Y2g6IF9SZWNvcmRCYXRjaCwgdmVyc2lvbiA9IE1ldGFkYXRhVmVyc2lvbi5WNCkge1xuICAgIHJldHVybiBuZXcgUmVjb3JkQmF0Y2goYmF0Y2gubGVuZ3RoKCksIGRlY29kZUZpZWxkTm9kZXMoYmF0Y2gpLCBkZWNvZGVCdWZmZXJzKGJhdGNoLCB2ZXJzaW9uKSk7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBkZWNvZGVEaWN0aW9uYXJ5QmF0Y2goYmF0Y2g6IF9EaWN0aW9uYXJ5QmF0Y2gsIHZlcnNpb24gPSBNZXRhZGF0YVZlcnNpb24uVjQpIHtcbiAgICByZXR1cm4gbmV3IERpY3Rpb25hcnlCYXRjaChSZWNvcmRCYXRjaC5kZWNvZGUoYmF0Y2guZGF0YSgpISwgdmVyc2lvbiksIGJhdGNoLmlkKCksIGJhdGNoLmlzRGVsdGEoKSk7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBkZWNvZGVCdWZmZXJSZWdpb24oYjogX0J1ZmZlcikge1xuICAgIHJldHVybiBuZXcgQnVmZmVyUmVnaW9uKGIub2Zmc2V0KCksIGIubGVuZ3RoKCkpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZGVjb2RlRmllbGROb2RlKGY6IF9GaWVsZE5vZGUpIHtcbiAgICByZXR1cm4gbmV3IEZpZWxkTm9kZShmLmxlbmd0aCgpLCBmLm51bGxDb3VudCgpKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGRlY29kZUZpZWxkTm9kZXMoYmF0Y2g6IF9SZWNvcmRCYXRjaCkge1xuICAgIGNvbnN0IG5vZGVzID0gW10gYXMgRmllbGROb2RlW107XG4gICAgZm9yIChsZXQgZiwgaSA9IC0xLCBqID0gLTEsIG4gPSBiYXRjaC5ub2Rlc0xlbmd0aCgpOyArK2kgPCBuOykge1xuICAgICAgICBpZiAoZiA9IGJhdGNoLm5vZGVzKGkpKSB7XG4gICAgICAgICAgICBub2Rlc1srK2pdID0gRmllbGROb2RlLmRlY29kZShmKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbm9kZXM7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBkZWNvZGVCdWZmZXJzKGJhdGNoOiBfUmVjb3JkQmF0Y2gsIHZlcnNpb246IE1ldGFkYXRhVmVyc2lvbikge1xuICAgIGNvbnN0IGJ1ZmZlclJlZ2lvbnMgPSBbXSBhcyBCdWZmZXJSZWdpb25bXTtcbiAgICBmb3IgKGxldCBiLCBpID0gLTEsIGogPSAtMSwgbiA9IGJhdGNoLmJ1ZmZlcnNMZW5ndGgoKTsgKytpIDwgbjspIHtcbiAgICAgICAgaWYgKGIgPSBiYXRjaC5idWZmZXJzKGkpKSB7XG4gICAgICAgIC8vIElmIHRoaXMgQXJyb3cgYnVmZmVyIHdhcyB3cml0dGVuIGJlZm9yZSB2ZXJzaW9uIDQsXG4gICAgICAgIC8vIGFkdmFuY2UgdGhlIGJ1ZmZlcidzIGJiX3BvcyA4IGJ5dGVzIHRvIHNraXAgcGFzdFxuICAgICAgICAvLyB0aGUgbm93LXJlbW92ZWQgcGFnZV9pZCBmaWVsZFxuICAgICAgICBpZiAodmVyc2lvbiA8IE1ldGFkYXRhVmVyc2lvbi5WNCkge1xuICAgICAgICAgICAgICAgIGIuYmJfcG9zICs9ICg4ICogKGkgKyAxKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBidWZmZXJSZWdpb25zWysral0gPSBCdWZmZXJSZWdpb24uZGVjb2RlKGIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBidWZmZXJSZWdpb25zO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZGVjb2RlU2NoZW1hRmllbGRzKHNjaGVtYTogX1NjaGVtYSwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgRGF0YVR5cGU+LCBkaWN0aW9uYXJ5RmllbGRzPzogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeT5bXT4pIHtcbiAgICBjb25zdCBmaWVsZHMgPSBbXSBhcyBGaWVsZFtdO1xuICAgIGZvciAobGV0IGYsIGkgPSAtMSwgaiA9IC0xLCBuID0gc2NoZW1hLmZpZWxkc0xlbmd0aCgpOyArK2kgPCBuOykge1xuICAgICAgICBpZiAoZiA9IHNjaGVtYS5maWVsZHMoaSkpIHtcbiAgICAgICAgICAgIGZpZWxkc1srK2pdID0gRmllbGQuZGVjb2RlKGYsIGRpY3Rpb25hcmllcywgZGljdGlvbmFyeUZpZWxkcyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZpZWxkcztcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGRlY29kZUZpZWxkQ2hpbGRyZW4oZmllbGQ6IF9GaWVsZCwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgRGF0YVR5cGU+LCBkaWN0aW9uYXJ5RmllbGRzPzogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeT5bXT4pOiBGaWVsZFtdIHtcbiAgICBjb25zdCBjaGlsZHJlbiA9IFtdIGFzIEZpZWxkW107XG4gICAgZm9yIChsZXQgZiwgaSA9IC0xLCBqID0gLTEsIG4gPSBmaWVsZC5jaGlsZHJlbkxlbmd0aCgpOyArK2kgPCBuOykge1xuICAgICAgICBpZiAoZiA9IGZpZWxkLmNoaWxkcmVuKGkpKSB7XG4gICAgICAgICAgICBjaGlsZHJlblsrK2pdID0gRmllbGQuZGVjb2RlKGYsIGRpY3Rpb25hcmllcywgZGljdGlvbmFyeUZpZWxkcyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNoaWxkcmVuO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZGVjb2RlRmllbGQoZjogX0ZpZWxkLCBkaWN0aW9uYXJpZXM/OiBNYXA8bnVtYmVyLCBEYXRhVHlwZT4sIGRpY3Rpb25hcnlGaWVsZHM/OiBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5PltdPikge1xuXG4gICAgbGV0IGlkOiBudW1iZXI7XG4gICAgbGV0IGZpZWxkOiBGaWVsZCB8IHZvaWQ7XG4gICAgbGV0IHR5cGU6IERhdGFUeXBlPGFueT47XG4gICAgbGV0IGtleXM6IF9JbnQgfCBUS2V5cyB8IG51bGw7XG4gICAgbGV0IGRpY3RUeXBlOiBEaWN0aW9uYXJ5O1xuICAgIGxldCBkaWN0TWV0YTogX0RpY3Rpb25hcnlFbmNvZGluZyB8IG51bGw7XG4gICAgbGV0IGRpY3RGaWVsZDogRmllbGQ8RGljdGlvbmFyeT47XG5cbiAgICAvLyBJZiBubyBkaWN0aW9uYXJ5IGVuY29kaW5nLCBvciBpbiB0aGUgcHJvY2VzcyBvZiBkZWNvZGluZyB0aGUgY2hpbGRyZW4gb2YgYSBkaWN0aW9uYXJ5LWVuY29kZWQgZmllbGRcbiAgICBpZiAoIWRpY3Rpb25hcmllcyB8fCAhZGljdGlvbmFyeUZpZWxkcyB8fCAhKGRpY3RNZXRhID0gZi5kaWN0aW9uYXJ5KCkpKSB7XG4gICAgICAgIHR5cGUgPSBkZWNvZGVGaWVsZFR5cGUoZiwgZGVjb2RlRmllbGRDaGlsZHJlbihmLCBkaWN0aW9uYXJpZXMsIGRpY3Rpb25hcnlGaWVsZHMpKTtcbiAgICAgICAgZmllbGQgPSBuZXcgRmllbGQoZi5uYW1lKCkhLCB0eXBlLCBmLm51bGxhYmxlKCksIGRlY29kZUN1c3RvbU1ldGFkYXRhKGYpKTtcbiAgICB9XG4gICAgLy8gdHNsaW50OmRpc2FibGVcbiAgICAvLyBJZiBkaWN0aW9uYXJ5IGVuY29kZWQgYW5kIHRoZSBmaXJzdCB0aW1lIHdlJ3ZlIHNlZW4gdGhpcyBkaWN0aW9uYXJ5IGlkLCBkZWNvZGVcbiAgICAvLyB0aGUgZGF0YSB0eXBlIGFuZCBjaGlsZCBmaWVsZHMsIHRoZW4gd3JhcCBpbiBhIERpY3Rpb25hcnkgdHlwZSBhbmQgaW5zZXJ0IHRoZVxuICAgIC8vIGRhdGEgdHlwZSBpbnRvIHRoZSBkaWN0aW9uYXJ5IHR5cGVzIG1hcC5cbiAgICBlbHNlIGlmICghZGljdGlvbmFyaWVzLmhhcyhpZCA9IGRpY3RNZXRhLmlkKCkubG93KSkge1xuICAgICAgICAvLyBhIGRpY3Rpb25hcnkgaW5kZXggZGVmYXVsdHMgdG8gc2lnbmVkIDMyIGJpdCBpbnQgaWYgdW5zcGVjaWZpZWRcbiAgICAgICAga2V5cyA9IChrZXlzID0gZGljdE1ldGEuaW5kZXhUeXBlKCkpID8gZGVjb2RlSW5kZXhUeXBlKGtleXMpIGFzIFRLZXlzIDogbmV3IEludDMyKCk7XG4gICAgICAgIGRpY3Rpb25hcmllcy5zZXQoaWQsIHR5cGUgPSBkZWNvZGVGaWVsZFR5cGUoZiwgZGVjb2RlRmllbGRDaGlsZHJlbihmKSkpO1xuICAgICAgICBkaWN0VHlwZSA9IG5ldyBEaWN0aW9uYXJ5KHR5cGUsIGtleXMsIGlkLCBkaWN0TWV0YS5pc09yZGVyZWQoKSk7XG4gICAgICAgIGRpY3RGaWVsZCA9IG5ldyBGaWVsZChmLm5hbWUoKSEsIGRpY3RUeXBlLCBmLm51bGxhYmxlKCksIGRlY29kZUN1c3RvbU1ldGFkYXRhKGYpKTtcbiAgICAgICAgZGljdGlvbmFyeUZpZWxkcy5zZXQoaWQsIFtmaWVsZCA9IGRpY3RGaWVsZF0pO1xuICAgIH1cbiAgICAvLyBJZiBkaWN0aW9uYXJ5IGVuY29kZWQsIGFuZCBoYXZlIGFscmVhZHkgc2VlbiB0aGlzIGRpY3Rpb25hcnkgSWQgaW4gdGhlIHNjaGVtYSwgdGhlbiByZXVzZSB0aGVcbiAgICAvLyBkYXRhIHR5cGUgYW5kIHdyYXAgaW4gYSBuZXcgRGljdGlvbmFyeSB0eXBlIGFuZCBmaWVsZC5cbiAgICBlbHNlIHtcbiAgICAgICAgLy8gYSBkaWN0aW9uYXJ5IGluZGV4IGRlZmF1bHRzIHRvIHNpZ25lZCAzMiBiaXQgaW50IGlmIHVuc3BlY2lmaWVkXG4gICAgICAgIGtleXMgPSAoa2V5cyA9IGRpY3RNZXRhLmluZGV4VHlwZSgpKSA/IGRlY29kZUluZGV4VHlwZShrZXlzKSBhcyBUS2V5cyA6IG5ldyBJbnQzMigpO1xuICAgICAgICBkaWN0VHlwZSA9IG5ldyBEaWN0aW9uYXJ5KGRpY3Rpb25hcmllcy5nZXQoaWQpISwga2V5cywgaWQsIGRpY3RNZXRhLmlzT3JkZXJlZCgpKTtcbiAgICAgICAgZGljdEZpZWxkID0gbmV3IEZpZWxkKGYubmFtZSgpISwgZGljdFR5cGUsIGYubnVsbGFibGUoKSwgZGVjb2RlQ3VzdG9tTWV0YWRhdGEoZikpO1xuICAgICAgICBkaWN0aW9uYXJ5RmllbGRzLmdldChpZCkhLnB1c2goZmllbGQgPSBkaWN0RmllbGQpO1xuICAgIH1cbiAgICByZXR1cm4gZmllbGQgfHwgbnVsbDtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGRlY29kZUN1c3RvbU1ldGFkYXRhKHBhcmVudD86IF9TY2hlbWEgfCBfRmllbGQgfCBudWxsKSB7XG4gICAgY29uc3QgZGF0YSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgaWYgKHBhcmVudCkge1xuICAgICAgICBmb3IgKGxldCBlbnRyeSwga2V5LCBpID0gLTEsIG4gPSBwYXJlbnQuY3VzdG9tTWV0YWRhdGFMZW5ndGgoKSB8IDA7ICsraSA8IG47KSB7XG4gICAgICAgICAgICBpZiAoKGVudHJ5ID0gcGFyZW50LmN1c3RvbU1ldGFkYXRhKGkpKSAmJiAoa2V5ID0gZW50cnkua2V5KCkpICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBkYXRhLnNldChrZXksIGVudHJ5LnZhbHVlKCkhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGRlY29kZUluZGV4VHlwZShfdHlwZTogX0ludCkge1xuICAgIHJldHVybiBuZXcgSW50KF90eXBlLmlzU2lnbmVkKCksIF90eXBlLmJpdFdpZHRoKCkgYXMgSW50Qml0V2lkdGgpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZGVjb2RlRmllbGRUeXBlKGY6IF9GaWVsZCwgY2hpbGRyZW4/OiBGaWVsZFtdKTogRGF0YVR5cGU8YW55PiB7XG5cbiAgICBjb25zdCB0eXBlSWQgPSBmLnR5cGVUeXBlKCk7XG5cbiAgICBzd2l0Y2ggKHR5cGVJZCkge1xuICAgICAgICBjYXNlIFR5cGUuTk9ORTogICAgcmV0dXJuIG5ldyBEYXRhVHlwZSgpO1xuICAgICAgICBjYXNlIFR5cGUuTnVsbDogICAgcmV0dXJuIG5ldyBOdWxsKCk7XG4gICAgICAgIGNhc2UgVHlwZS5CaW5hcnk6ICByZXR1cm4gbmV3IEJpbmFyeSgpO1xuICAgICAgICBjYXNlIFR5cGUuVXRmODogICAgcmV0dXJuIG5ldyBVdGY4KCk7XG4gICAgICAgIGNhc2UgVHlwZS5Cb29sOiAgICByZXR1cm4gbmV3IEJvb2woKTtcbiAgICAgICAgY2FzZSBUeXBlLkxpc3Q6ICAgIHJldHVybiBuZXcgTGlzdCgoY2hpbGRyZW4gfHwgW10pWzBdKTtcbiAgICAgICAgY2FzZSBUeXBlLlN0cnVjdF86IHJldHVybiBuZXcgU3RydWN0KGNoaWxkcmVuIHx8IFtdKTtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKHR5cGVJZCkge1xuICAgICAgICBjYXNlIFR5cGUuSW50OiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5JbnQoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBJbnQodC5pc1NpZ25lZCgpLCB0LmJpdFdpZHRoKCkpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5GbG9hdGluZ1BvaW50OiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GbG9hdGluZ1BvaW50KCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRmxvYXQodC5wcmVjaXNpb24oKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLkRlY2ltYWw6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRlY2ltYWwoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBEZWNpbWFsKHQuc2NhbGUoKSwgdC5wcmVjaXNpb24oKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLkRhdGU6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRhdGUoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBEYXRlXyh0LnVuaXQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLlRpbWU6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlRpbWUoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBUaW1lKHQudW5pdCgpLCB0LmJpdFdpZHRoKCkgYXMgVGltZUJpdFdpZHRoKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuVGltZXN0YW1wOiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UaW1lc3RhbXAoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBUaW1lc3RhbXAodC51bml0KCksIHQudGltZXpvbmUoKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLkludGVydmFsOiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5JbnRlcnZhbCgpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEludGVydmFsKHQudW5pdCgpKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuVW5pb246IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlVuaW9uKCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgVW5pb24odC5tb2RlKCksIHQudHlwZUlkc0FycmF5KCkgfHwgW10sIGNoaWxkcmVuIHx8IFtdKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuRml4ZWRTaXplQmluYXJ5OiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaXhlZFNpemVCaW5hcnkoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBGaXhlZFNpemVCaW5hcnkodC5ieXRlV2lkdGgoKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLkZpeGVkU2l6ZUxpc3Q6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpeGVkU2l6ZUxpc3QoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBGaXhlZFNpemVMaXN0KHQubGlzdFNpemUoKSwgKGNoaWxkcmVuIHx8IFtdKVswXSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLk1hcDoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTWFwKCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgTWFwXyhjaGlsZHJlbiB8fCBbXSwgdC5rZXlzU29ydGVkKCkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgVW5yZWNvZ25pemVkIHR5cGU6IFwiJHtUeXBlW3R5cGVJZF19XCIgKCR7dHlwZUlkfSlgKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGVuY29kZVNjaGVtYShiOiBCdWlsZGVyLCBzY2hlbWE6IFNjaGVtYSkge1xuXG4gICAgY29uc3QgZmllbGRPZmZzZXRzID0gc2NoZW1hLmZpZWxkcy5tYXAoKGYpID0+IEZpZWxkLmVuY29kZShiLCBmKSk7XG5cbiAgICBfU2NoZW1hLnN0YXJ0RmllbGRzVmVjdG9yKGIsIGZpZWxkT2Zmc2V0cy5sZW5ndGgpO1xuXG4gICAgY29uc3QgZmllbGRzVmVjdG9yT2Zmc2V0ID0gX1NjaGVtYS5jcmVhdGVGaWVsZHNWZWN0b3IoYiwgZmllbGRPZmZzZXRzKTtcblxuICAgIGNvbnN0IG1ldGFkYXRhT2Zmc2V0ID0gIShzY2hlbWEubWV0YWRhdGEgJiYgc2NoZW1hLm1ldGFkYXRhLnNpemUgPiAwKSA/IC0xIDpcbiAgICAgICAgX1NjaGVtYS5jcmVhdGVDdXN0b21NZXRhZGF0YVZlY3RvcihiLCBbLi4uc2NoZW1hLm1ldGFkYXRhXS5tYXAoKFtrLCB2XSkgPT4ge1xuICAgICAgICAgICAgY29uc3Qga2V5ID0gYi5jcmVhdGVTdHJpbmcoYCR7a31gKTtcbiAgICAgICAgICAgIGNvbnN0IHZhbCA9IGIuY3JlYXRlU3RyaW5nKGAke3Z9YCk7XG4gICAgICAgICAgICBfS2V5VmFsdWUuc3RhcnRLZXlWYWx1ZShiKTtcbiAgICAgICAgICAgIF9LZXlWYWx1ZS5hZGRLZXkoYiwga2V5KTtcbiAgICAgICAgICAgIF9LZXlWYWx1ZS5hZGRWYWx1ZShiLCB2YWwpO1xuICAgICAgICAgICAgcmV0dXJuIF9LZXlWYWx1ZS5lbmRLZXlWYWx1ZShiKTtcbiAgICAgICAgfSkpO1xuXG4gICAgX1NjaGVtYS5zdGFydFNjaGVtYShiKTtcbiAgICBfU2NoZW1hLmFkZEZpZWxkcyhiLCBmaWVsZHNWZWN0b3JPZmZzZXQpO1xuICAgIF9TY2hlbWEuYWRkRW5kaWFubmVzcyhiLCBwbGF0Zm9ybUlzTGl0dGxlRW5kaWFuID8gX0VuZGlhbm5lc3MuTGl0dGxlIDogX0VuZGlhbm5lc3MuQmlnKTtcblxuICAgIGlmIChtZXRhZGF0YU9mZnNldCAhPT0gLTEpIHsgX1NjaGVtYS5hZGRDdXN0b21NZXRhZGF0YShiLCBtZXRhZGF0YU9mZnNldCk7IH1cblxuICAgIHJldHVybiBfU2NoZW1hLmVuZFNjaGVtYShiKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGVuY29kZUZpZWxkKGI6IEJ1aWxkZXIsIGZpZWxkOiBGaWVsZCkge1xuXG4gICAgbGV0IG5hbWVPZmZzZXQgPSAtMTtcbiAgICBsZXQgdHlwZU9mZnNldCA9IC0xO1xuICAgIGxldCBkaWN0aW9uYXJ5T2Zmc2V0ID0gLTE7XG5cbiAgICBsZXQgdHlwZSA9IGZpZWxkLnR5cGU7XG4gICAgbGV0IHR5cGVJZDogVHlwZSA9IDxhbnk+IGZpZWxkLnR5cGVJZDtcblxuICAgIGlmICghRGF0YVR5cGUuaXNEaWN0aW9uYXJ5KHR5cGUpKSB7XG4gICAgICAgIHR5cGVPZmZzZXQgPSB0eXBlQXNzZW1ibGVyLnZpc2l0KHR5cGUsIGIpITtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0eXBlSWQgPSB0eXBlLmRpY3Rpb25hcnkudHlwZUlkO1xuICAgICAgICBkaWN0aW9uYXJ5T2Zmc2V0ID0gdHlwZUFzc2VtYmxlci52aXNpdCh0eXBlLCBiKSE7XG4gICAgICAgIHR5cGVPZmZzZXQgPSB0eXBlQXNzZW1ibGVyLnZpc2l0KHR5cGUuZGljdGlvbmFyeSwgYikhO1xuICAgIH1cblxuICAgIGNvbnN0IGNoaWxkT2Zmc2V0cyA9ICh0eXBlLmNoaWxkcmVuIHx8IFtdKS5tYXAoKGY6IEZpZWxkKSA9PiBGaWVsZC5lbmNvZGUoYiwgZikpO1xuICAgIGNvbnN0IGNoaWxkcmVuVmVjdG9yT2Zmc2V0ID0gX0ZpZWxkLmNyZWF0ZUNoaWxkcmVuVmVjdG9yKGIsIGNoaWxkT2Zmc2V0cyk7XG5cbiAgICBjb25zdCBtZXRhZGF0YU9mZnNldCA9ICEoZmllbGQubWV0YWRhdGEgJiYgZmllbGQubWV0YWRhdGEuc2l6ZSA+IDApID8gLTEgOlxuICAgICAgICBfRmllbGQuY3JlYXRlQ3VzdG9tTWV0YWRhdGFWZWN0b3IoYiwgWy4uLmZpZWxkLm1ldGFkYXRhXS5tYXAoKFtrLCB2XSkgPT4ge1xuICAgICAgICAgICAgY29uc3Qga2V5ID0gYi5jcmVhdGVTdHJpbmcoYCR7a31gKTtcbiAgICAgICAgICAgIGNvbnN0IHZhbCA9IGIuY3JlYXRlU3RyaW5nKGAke3Z9YCk7XG4gICAgICAgICAgICBfS2V5VmFsdWUuc3RhcnRLZXlWYWx1ZShiKTtcbiAgICAgICAgICAgIF9LZXlWYWx1ZS5hZGRLZXkoYiwga2V5KTtcbiAgICAgICAgICAgIF9LZXlWYWx1ZS5hZGRWYWx1ZShiLCB2YWwpO1xuICAgICAgICAgICAgcmV0dXJuIF9LZXlWYWx1ZS5lbmRLZXlWYWx1ZShiKTtcbiAgICAgICAgfSkpO1xuXG4gICAgaWYgKGZpZWxkLm5hbWUpIHtcbiAgICAgICAgbmFtZU9mZnNldCA9IGIuY3JlYXRlU3RyaW5nKGZpZWxkLm5hbWUpO1xuICAgIH1cblxuICAgIF9GaWVsZC5zdGFydEZpZWxkKGIpO1xuICAgIF9GaWVsZC5hZGRUeXBlKGIsIHR5cGVPZmZzZXQpO1xuICAgIF9GaWVsZC5hZGRUeXBlVHlwZShiLCB0eXBlSWQpO1xuICAgIF9GaWVsZC5hZGRDaGlsZHJlbihiLCBjaGlsZHJlblZlY3Rvck9mZnNldCk7XG4gICAgX0ZpZWxkLmFkZE51bGxhYmxlKGIsICEhZmllbGQubnVsbGFibGUpO1xuXG4gICAgaWYgKG5hbWVPZmZzZXQgIT09IC0xKSB7IF9GaWVsZC5hZGROYW1lKGIsIG5hbWVPZmZzZXQpOyB9XG4gICAgaWYgKGRpY3Rpb25hcnlPZmZzZXQgIT09IC0xKSB7IF9GaWVsZC5hZGREaWN0aW9uYXJ5KGIsIGRpY3Rpb25hcnlPZmZzZXQpOyB9XG4gICAgaWYgKG1ldGFkYXRhT2Zmc2V0ICE9PSAtMSkgeyBfRmllbGQuYWRkQ3VzdG9tTWV0YWRhdGEoYiwgbWV0YWRhdGFPZmZzZXQpOyB9XG5cbiAgICByZXR1cm4gX0ZpZWxkLmVuZEZpZWxkKGIpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZW5jb2RlUmVjb3JkQmF0Y2goYjogQnVpbGRlciwgcmVjb3JkQmF0Y2g6IFJlY29yZEJhdGNoKSB7XG5cbiAgICBjb25zdCBub2RlcyA9IHJlY29yZEJhdGNoLm5vZGVzIHx8IFtdO1xuICAgIGNvbnN0IGJ1ZmZlcnMgPSByZWNvcmRCYXRjaC5idWZmZXJzIHx8IFtdO1xuXG4gICAgX1JlY29yZEJhdGNoLnN0YXJ0Tm9kZXNWZWN0b3IoYiwgbm9kZXMubGVuZ3RoKTtcbiAgICBub2Rlcy5zbGljZSgpLnJldmVyc2UoKS5mb3JFYWNoKChuKSA9PiBGaWVsZE5vZGUuZW5jb2RlKGIsIG4pKTtcblxuICAgIGNvbnN0IG5vZGVzVmVjdG9yT2Zmc2V0ID0gYi5lbmRWZWN0b3IoKTtcblxuICAgIF9SZWNvcmRCYXRjaC5zdGFydEJ1ZmZlcnNWZWN0b3IoYiwgYnVmZmVycy5sZW5ndGgpO1xuICAgIGJ1ZmZlcnMuc2xpY2UoKS5yZXZlcnNlKCkuZm9yRWFjaCgoYl8pID0+IEJ1ZmZlclJlZ2lvbi5lbmNvZGUoYiwgYl8pKTtcblxuICAgIGNvbnN0IGJ1ZmZlcnNWZWN0b3JPZmZzZXQgPSBiLmVuZFZlY3RvcigpO1xuXG4gICAgX1JlY29yZEJhdGNoLnN0YXJ0UmVjb3JkQmF0Y2goYik7XG4gICAgX1JlY29yZEJhdGNoLmFkZExlbmd0aChiLCBuZXcgTG9uZyhyZWNvcmRCYXRjaC5sZW5ndGgsIDApKTtcbiAgICBfUmVjb3JkQmF0Y2guYWRkTm9kZXMoYiwgbm9kZXNWZWN0b3JPZmZzZXQpO1xuICAgIF9SZWNvcmRCYXRjaC5hZGRCdWZmZXJzKGIsIGJ1ZmZlcnNWZWN0b3JPZmZzZXQpO1xuICAgIHJldHVybiBfUmVjb3JkQmF0Y2guZW5kUmVjb3JkQmF0Y2goYik7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBlbmNvZGVEaWN0aW9uYXJ5QmF0Y2goYjogQnVpbGRlciwgZGljdGlvbmFyeUJhdGNoOiBEaWN0aW9uYXJ5QmF0Y2gpIHtcbiAgICBjb25zdCBkYXRhT2Zmc2V0ID0gUmVjb3JkQmF0Y2guZW5jb2RlKGIsIGRpY3Rpb25hcnlCYXRjaC5kYXRhKTtcbiAgICBfRGljdGlvbmFyeUJhdGNoLnN0YXJ0RGljdGlvbmFyeUJhdGNoKGIpO1xuICAgIF9EaWN0aW9uYXJ5QmF0Y2guYWRkSWQoYiwgbmV3IExvbmcoZGljdGlvbmFyeUJhdGNoLmlkLCAwKSk7XG4gICAgX0RpY3Rpb25hcnlCYXRjaC5hZGRJc0RlbHRhKGIsIGRpY3Rpb25hcnlCYXRjaC5pc0RlbHRhKTtcbiAgICBfRGljdGlvbmFyeUJhdGNoLmFkZERhdGEoYiwgZGF0YU9mZnNldCk7XG4gICAgcmV0dXJuIF9EaWN0aW9uYXJ5QmF0Y2guZW5kRGljdGlvbmFyeUJhdGNoKGIpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZW5jb2RlRmllbGROb2RlKGI6IEJ1aWxkZXIsIG5vZGU6IEZpZWxkTm9kZSkge1xuICAgIHJldHVybiBfRmllbGROb2RlLmNyZWF0ZUZpZWxkTm9kZShiLCBuZXcgTG9uZyhub2RlLmxlbmd0aCwgMCksIG5ldyBMb25nKG5vZGUubnVsbENvdW50LCAwKSk7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBlbmNvZGVCdWZmZXJSZWdpb24oYjogQnVpbGRlciwgbm9kZTogQnVmZmVyUmVnaW9uKSB7XG4gICAgcmV0dXJuIF9CdWZmZXIuY3JlYXRlQnVmZmVyKGIsIG5ldyBMb25nKG5vZGUub2Zmc2V0LCAwKSwgbmV3IExvbmcobm9kZS5sZW5ndGgsIDApKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmNvbnN0IHBsYXRmb3JtSXNMaXR0bGVFbmRpYW4gPSAoZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKDIpO1xuICAgIG5ldyBEYXRhVmlldyhidWZmZXIpLnNldEludDE2KDAsIDI1NiwgdHJ1ZSAvKiBsaXR0bGVFbmRpYW4gKi8pO1xuICAgIC8vIEludDE2QXJyYXkgdXNlcyB0aGUgcGxhdGZvcm0ncyBlbmRpYW5uZXNzLlxuICAgIHJldHVybiBuZXcgSW50MTZBcnJheShidWZmZXIpWzBdID09PSAyNTY7XG59KSgpO1xuXG4vKiogQGlnbm9yZSAqL1xudHlwZSBNZXNzYWdlSGVhZGVyRGVjb2RlciA9IDxUIGV4dGVuZHMgTWVzc2FnZUhlYWRlcj4oKSA9PiBUIGV4dGVuZHMgTWVzc2FnZUhlYWRlci5TY2hlbWEgPyBTY2hlbWFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogVCBleHRlbmRzIE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2ggPyBSZWNvcmRCYXRjaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBUIGV4dGVuZHMgTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2ggPyBEaWN0aW9uYXJ5QmF0Y2ggOiBuZXZlcjtcbiJdfQ==

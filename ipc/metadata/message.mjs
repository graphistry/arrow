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
/**
 * @ignore
 */
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
/**
 * @ignore
 */
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
/**
 * @ignore
 */
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
/**
 * @ignore
 */
export class BufferRegion {
    constructor(offset, length) {
        this.offset = typeof offset === 'number' ? offset : offset.low;
        this.length = typeof length === 'number' ? length : length.low;
    }
}
/**
 * @ignore
 */
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
function decodeSchema(_schema, dictionaries = new Map(), dictionaryFields = new Map()) {
    const fields = decodeSchemaFields(_schema, dictionaries, dictionaryFields);
    return new Schema(fields, decodeCustomMetadata(_schema), dictionaries, dictionaryFields);
}
function decodeRecordBatch(batch, version = MetadataVersion.V4) {
    return new RecordBatch(batch.length(), decodeFieldNodes(batch), decodeBuffers(batch, version));
}
function decodeDictionaryBatch(batch, version = MetadataVersion.V4) {
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
        if (version < MetadataVersion.V4) {
            buffer.bb_pos += (8 * (i + 1));
        }
        return decode(buffer);
    };
}
function decodeSchemaFields(schema, dictionaries, dictionaryFields) {
    return Array.from({ length: schema.fieldsLength() }, (_, i) => schema.fields(i)).filter(Boolean).map((f) => Field.decode(f, dictionaries, dictionaryFields));
}
function decodeFieldChildren(field, dictionaries, dictionaryFields) {
    return Array.from({ length: field.childrenLength() }, (_, i) => field.children(i)).filter(Boolean).map((f) => Field.decode(f, dictionaries, dictionaryFields));
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
    return new Int(_type.isSigned(), _type.bitWidth());
}
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlwYy9tZXRhZGF0YS9tZXNzYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDZEQUE2RDtBQUM3RCwrREFBK0Q7QUFDL0Qsd0RBQXdEO0FBQ3hELDZEQUE2RDtBQUM3RCxvREFBb0Q7QUFDcEQsNkRBQTZEO0FBQzdELDZEQUE2RDtBQUM3RCxFQUFFO0FBQ0YsK0NBQStDO0FBQy9DLEVBQUU7QUFDRiw2REFBNkQ7QUFDN0QsOERBQThEO0FBQzlELHlEQUF5RDtBQUN6RCw0REFBNEQ7QUFDNUQsMERBQTBEO0FBQzFELHFCQUFxQjtBQUVyQixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQzFDLE9BQU8sS0FBSyxPQUFPLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxLQUFLLFFBQVEsTUFBTSxrQkFBa0IsQ0FBQztBQUU3QyxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUM3QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFakQsT0FBTyxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDNUQsT0FBTyxFQUFFLFFBQVEsSUFBSSxhQUFhLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN4RSxPQUFPLEVBQUUsYUFBYSxFQUFFLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUVyRyxJQUFPLElBQUksR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDO0FBQy9CLElBQU8sT0FBTyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUM7QUFDckMsSUFBTyxVQUFVLEdBQUcsV0FBVyxDQUFDLFVBQVUsQ0FBQztBQUUzQyxJQUFPLElBQUksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztBQUNwRCxJQUFPLE1BQU0sR0FBRyxPQUFPLENBQUMs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QyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRCxDQUFDO0FBRUQsU0FBUyxlQUFlLENBQUMsQ0FBVSxFQUFFLElBQWU7SUFDaEQsT0FBTyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoRyxDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxDQUFVLEVBQUUsSUFBa0I7SUFDdEQsT0FBTyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2RixDQUFDO0FBRUQsTUFBTSxzQkFBc0IsR0FBRyxDQUFDO0lBQzVCLE1BQU0sTUFBTSxHQUFHLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xDLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQy9ELDZDQUE2QztJQUM3QyxPQUFPLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQztBQUM3QyxDQUFDLENBQUMsRUFBRSxDQUFDIiwiZmlsZSI6ImlwYy9tZXRhZGF0YS9tZXNzYWdlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IGZsYXRidWZmZXJzIH0gZnJvbSAnZmxhdGJ1ZmZlcnMnO1xuaW1wb3J0ICogYXMgU2NoZW1hXyBmcm9tICcuLi8uLi9mYi9TY2hlbWEnO1xuaW1wb3J0ICogYXMgTWVzc2FnZV8gZnJvbSAnLi4vLi4vZmIvTWVzc2FnZSc7XG5cbmltcG9ydCB7IFNjaGVtYSwgRmllbGQgfSBmcm9tICcuLi8uLi9zY2hlbWEnO1xuaW1wb3J0IHsgdG9VaW50OEFycmF5IH0gZnJvbSAnLi4vLi4vdXRpbC9idWZmZXInO1xuaW1wb3J0IHsgQXJyYXlCdWZmZXJWaWV3SW5wdXQgfSBmcm9tICcuLi8uLi91dGlsL2J1ZmZlcic7XG5pbXBvcnQgeyBNZXNzYWdlSGVhZGVyLCBNZXRhZGF0YVZlcnNpb24gfSBmcm9tICcuLi8uLi9lbnVtJztcbmltcG9ydCB7IGluc3RhbmNlIGFzIHR5cGVBc3NlbWJsZXIgfSBmcm9tICcuLi8uLi92aXNpdG9yL3R5cGVhc3NlbWJsZXInO1xuaW1wb3J0IHsgZmllbGRGcm9tSlNPTiwgc2NoZW1hRnJvbUpTT04sIHJlY29yZEJhdGNoRnJvbUpTT04sIGRpY3Rpb25hcnlCYXRjaEZyb21KU09OIH0gZnJvbSAnLi9qc29uJztcblxuaW1wb3J0IExvbmcgPSBmbGF0YnVmZmVycy5Mb25nO1xuaW1wb3J0IEJ1aWxkZXIgPSBmbGF0YnVmZmVycy5CdWlsZGVyO1xuaW1wb3J0IEJ5dGVCdWZmZXIgPSBmbGF0YnVmZmVycy5CeXRlQnVmZmVyO1xuaW1wb3J0IF9JbnQgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5JbnQ7XG5pbXBvcnQgVHlwZSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlR5cGU7XG5pbXBvcnQgX0ZpZWxkID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRmllbGQ7XG5pbXBvcnQgX1NjaGVtYSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlNjaGVtYTtcbmltcG9ydCBfQnVmZmVyID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuQnVmZmVyO1xuaW1wb3J0IF9NZXNzYWdlID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk1lc3NhZ2U7XG5pbXBvcnQgX0tleVZhbHVlID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuS2V5VmFsdWU7XG5pbXBvcnQgX0ZpZWxkTm9kZSA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaWVsZE5vZGU7XG5pbXBvcnQgX0VuZGlhbm5lc3MgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5FbmRpYW5uZXNzO1xuaW1wb3J0IF9SZWNvcmRCYXRjaCA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5SZWNvcmRCYXRjaDtcbmltcG9ydCBfRGljdGlvbmFyeUJhdGNoID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRpY3Rpb25hcnlCYXRjaDtcbmltcG9ydCBfRGljdGlvbmFyeUVuY29kaW5nID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGljdGlvbmFyeUVuY29kaW5nO1xuXG5pbXBvcnQge1xuICAgIERhdGFUeXBlLCBEaWN0aW9uYXJ5LCBUaW1lQml0V2lkdGgsXG4gICAgVXRmOCwgQmluYXJ5LCBEZWNpbWFsLCBGaXhlZFNpemVCaW5hcnksXG4gICAgTGlzdCwgRml4ZWRTaXplTGlzdCwgTWFwXywgU3RydWN0LCBVbmlvbixcbiAgICBCb29sLCBOdWxsLCBJbnQsIEZsb2F0LCBEYXRlXywgVGltZSwgSW50ZXJ2YWwsIFRpbWVzdGFtcCwgSW50Qml0V2lkdGgsIEludDMyLCBUS2V5cyxcbn0gZnJvbSAnLi4vLi4vdHlwZSc7XG5cbi8qKlxuICogQGlnbm9yZVxuICovXG5leHBvcnQgY2xhc3MgTWVzc2FnZTxUIGV4dGVuZHMgTWVzc2FnZUhlYWRlciA9IGFueT4ge1xuXG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBmcm9tSlNPTjxUIGV4dGVuZHMgTWVzc2FnZUhlYWRlcj4obXNnOiBhbnksIGhlYWRlclR5cGU6IFQpOiBNZXNzYWdlPFQ+IHtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IG5ldyBNZXNzYWdlKDAsIE1ldGFkYXRhVmVyc2lvbi5WNCwgaGVhZGVyVHlwZSk7XG4gICAgICAgIG1lc3NhZ2UuX2NyZWF0ZUhlYWRlciA9IG1lc3NhZ2VIZWFkZXJGcm9tSlNPTihtc2csIGhlYWRlclR5cGUpO1xuICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICB9XG5cbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGRlY29kZShidWY6IEFycmF5QnVmZmVyVmlld0lucHV0KSB7XG4gICAgICAgIGJ1ZiA9IG5ldyBCeXRlQnVmZmVyKHRvVWludDhBcnJheShidWYpKTtcbiAgICAgICAgY29uc3QgX21lc3NhZ2UgPSBfTWVzc2FnZS5nZXRSb290QXNNZXNzYWdlKGJ1Zik7XG4gICAgICAgIGNvbnN0IGJvZHlMZW5ndGg6IExvbmcgPSBfbWVzc2FnZS5ib2R5TGVuZ3RoKCkhO1xuICAgICAgICBjb25zdCB2ZXJzaW9uOiBNZXRhZGF0YVZlcnNpb24gPSBfbWVzc2FnZS52ZXJzaW9uKCk7XG4gICAgICAgIGNvbnN0IGhlYWRlclR5cGU6IE1lc3NhZ2VIZWFkZXIgPSBfbWVzc2FnZS5oZWFkZXJUeXBlKCk7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBuZXcgTWVzc2FnZShib2R5TGVuZ3RoLCB2ZXJzaW9uLCBoZWFkZXJUeXBlKTtcbiAgICAgICAgbWVzc2FnZS5fY3JlYXRlSGVhZGVyID0gZGVjb2RlTWVzc2FnZUhlYWRlcihfbWVzc2FnZSwgaGVhZGVyVHlwZSk7XG4gICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgIH1cblxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZW5jb2RlPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyPihtZXNzYWdlOiBNZXNzYWdlPFQ+KSB7XG4gICAgICAgIGxldCBiID0gbmV3IEJ1aWxkZXIoKSwgaGVhZGVyT2Zmc2V0ID0gLTE7XG4gICAgICAgIGlmIChtZXNzYWdlLmlzU2NoZW1hKCkpIHtcbiAgICAgICAgICAgIGhlYWRlck9mZnNldCA9IFNjaGVtYS5lbmNvZGUoYiwgbWVzc2FnZS5oZWFkZXIoKSBhcyBTY2hlbWEpO1xuICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuaXNSZWNvcmRCYXRjaCgpKSB7XG4gICAgICAgICAgICBoZWFkZXJPZmZzZXQgPSBSZWNvcmRCYXRjaC5lbmNvZGUoYiwgbWVzc2FnZS5oZWFkZXIoKSBhcyBSZWNvcmRCYXRjaCk7XG4gICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5pc0RpY3Rpb25hcnlCYXRjaCgpKSB7XG4gICAgICAgICAgICBoZWFkZXJPZmZzZXQgPSBEaWN0aW9uYXJ5QmF0Y2guZW5jb2RlKGIsIG1lc3NhZ2UuaGVhZGVyKCkgYXMgRGljdGlvbmFyeUJhdGNoKTtcbiAgICAgICAgfVxuICAgICAgICBfTWVzc2FnZS5zdGFydE1lc3NhZ2UoYik7XG4gICAgICAgIF9NZXNzYWdlLmFkZFZlcnNpb24oYiwgTWV0YWRhdGFWZXJzaW9uLlY0KTtcbiAgICAgICAgX01lc3NhZ2UuYWRkSGVhZGVyKGIsIGhlYWRlck9mZnNldCk7XG4gICAgICAgIF9NZXNzYWdlLmFkZEhlYWRlclR5cGUoYiwgbWVzc2FnZS5oZWFkZXJUeXBlKTtcbiAgICAgICAgX01lc3NhZ2UuYWRkQm9keUxlbmd0aChiLCBuZXcgTG9uZyhtZXNzYWdlLmJvZHlMZW5ndGgsIDApKTtcbiAgICAgICAgX01lc3NhZ2UuZmluaXNoTWVzc2FnZUJ1ZmZlcihiLCBfTWVzc2FnZS5lbmRNZXNzYWdlKGIpKTtcbiAgICAgICAgcmV0dXJuIGIuYXNVaW50OEFycmF5KCk7XG4gICAgfVxuXG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGhlYWRlcjogU2NoZW1hIHwgUmVjb3JkQmF0Y2ggfCBEaWN0aW9uYXJ5QmF0Y2gsIGJvZHlMZW5ndGggPSAwKSB7XG4gICAgICAgIGlmIChoZWFkZXIgaW5zdGFuY2VvZiBTY2hlbWEpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgTWVzc2FnZSgwLCBNZXRhZGF0YVZlcnNpb24uVjQsIE1lc3NhZ2VIZWFkZXIuU2NoZW1hLCBoZWFkZXIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChoZWFkZXIgaW5zdGFuY2VvZiBSZWNvcmRCYXRjaCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNZXNzYWdlKGJvZHlMZW5ndGgsIE1ldGFkYXRhVmVyc2lvbi5WNCwgTWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaCwgaGVhZGVyKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGVhZGVyIGluc3RhbmNlb2YgRGljdGlvbmFyeUJhdGNoKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1lc3NhZ2UoYm9keUxlbmd0aCwgTWV0YWRhdGFWZXJzaW9uLlY0LCBNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaCwgaGVhZGVyKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVucmVjb2duaXplZCBNZXNzYWdlIGhlYWRlcjogJHtoZWFkZXJ9YCk7XG4gICAgfVxuXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyBib2R5OiBVaW50OEFycmF5O1xuICAgIHByb3RlY3RlZCBfaGVhZGVyVHlwZTogVDtcbiAgICBwcm90ZWN0ZWQgX2JvZHlMZW5ndGg6IG51bWJlcjtcbiAgICBwcm90ZWN0ZWQgX3ZlcnNpb246IE1ldGFkYXRhVmVyc2lvbjtcbiAgICBwdWJsaWMgZ2V0IHR5cGUoKSB7IHJldHVybiB0aGlzLmhlYWRlclR5cGU7IH1cbiAgICBwdWJsaWMgZ2V0IHZlcnNpb24oKSB7IHJldHVybiB0aGlzLl92ZXJzaW9uOyB9XG4gICAgcHVibGljIGdldCBoZWFkZXJUeXBlKCkgeyByZXR1cm4gdGhpcy5faGVhZGVyVHlwZTsgfVxuICAgIHB1YmxpYyBnZXQgYm9keUxlbmd0aCgpIHsgcmV0dXJuIHRoaXMuX2JvZHlMZW5ndGg7IH1cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHJvdGVjdGVkIF9jcmVhdGVIZWFkZXI6IE1lc3NhZ2VIZWFkZXJEZWNvZGVyO1xuICAgIHB1YmxpYyBoZWFkZXIoKSB7IHJldHVybiB0aGlzLl9jcmVhdGVIZWFkZXI8VD4oKTsgfVxuICAgIHB1YmxpYyBpc1NjaGVtYSgpOiB0aGlzIGlzIE1lc3NhZ2U8TWVzc2FnZUhlYWRlci5TY2hlbWE+IHsgcmV0dXJuIHRoaXMuaGVhZGVyVHlwZSA9PT0gTWVzc2FnZUhlYWRlci5TY2hlbWE7IH1cbiAgICBwdWJsaWMgaXNSZWNvcmRCYXRjaCgpOiB0aGlzIGlzIE1lc3NhZ2U8TWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaD4geyByZXR1cm4gdGhpcy5oZWFkZXJUeXBlID09PSBNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoOyB9XG4gICAgcHVibGljIGlzRGljdGlvbmFyeUJhdGNoKCk6IHRoaXMgaXMgTWVzc2FnZTxNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaD4geyByZXR1cm4gdGhpcy5oZWFkZXJUeXBlID09PSBNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaDsgfVxuXG4gICAgY29uc3RydWN0b3IoYm9keUxlbmd0aDogTG9uZyB8IG51bWJlciwgdmVyc2lvbjogTWV0YWRhdGFWZXJzaW9uLCBoZWFkZXJUeXBlOiBULCBoZWFkZXI/OiBhbnkpIHtcbiAgICAgICAgdGhpcy5fdmVyc2lvbiA9IHZlcnNpb247XG4gICAgICAgIHRoaXMuX2hlYWRlclR5cGUgPSBoZWFkZXJUeXBlO1xuICAgICAgICB0aGlzLmJvZHkgPSBuZXcgVWludDhBcnJheSgwKTtcbiAgICAgICAgaGVhZGVyICYmICh0aGlzLl9jcmVhdGVIZWFkZXIgPSAoKSA9PiBoZWFkZXIpO1xuICAgICAgICB0aGlzLl9ib2R5TGVuZ3RoID0gdHlwZW9mIGJvZHlMZW5ndGggPT09ICdudW1iZXInID8gYm9keUxlbmd0aCA6IGJvZHlMZW5ndGgubG93O1xuICAgIH1cbn1cblxuLyoqXG4gKiBAaWdub3JlXG4gKi9cbmV4cG9ydCBjbGFzcyBSZWNvcmRCYXRjaCB7XG4gICAgcHJvdGVjdGVkIF9sZW5ndGg6IG51bWJlcjtcbiAgICBwcm90ZWN0ZWQgX25vZGVzOiBGaWVsZE5vZGVbXTtcbiAgICBwcm90ZWN0ZWQgX2J1ZmZlcnM6IEJ1ZmZlclJlZ2lvbltdO1xuICAgIHB1YmxpYyBnZXQgbm9kZXMoKSB7IHJldHVybiB0aGlzLl9ub2RlczsgfVxuICAgIHB1YmxpYyBnZXQgbGVuZ3RoKCkgeyByZXR1cm4gdGhpcy5fbGVuZ3RoOyB9XG4gICAgcHVibGljIGdldCBidWZmZXJzKCkgeyByZXR1cm4gdGhpcy5fYnVmZmVyczsgfVxuICAgIGNvbnN0cnVjdG9yKGxlbmd0aDogTG9uZyB8IG51bWJlciwgbm9kZXM6IEZpZWxkTm9kZVtdLCBidWZmZXJzOiBCdWZmZXJSZWdpb25bXSkge1xuICAgICAgICB0aGlzLl9ub2RlcyA9IG5vZGVzO1xuICAgICAgICB0aGlzLl9idWZmZXJzID0gYnVmZmVycztcbiAgICAgICAgdGhpcy5fbGVuZ3RoID0gdHlwZW9mIGxlbmd0aCA9PT0gJ251bWJlcicgPyBsZW5ndGggOiBsZW5ndGgubG93O1xuICAgIH1cbn1cblxuLyoqXG4gKiBAaWdub3JlXG4gKi9cbmV4cG9ydCBjbGFzcyBEaWN0aW9uYXJ5QmF0Y2gge1xuXG4gICAgcHJvdGVjdGVkIF9pZDogbnVtYmVyO1xuICAgIHByb3RlY3RlZCBfaXNEZWx0YTogYm9vbGVhbjtcbiAgICBwcm90ZWN0ZWQgX2RhdGE6IFJlY29yZEJhdGNoO1xuICAgIHB1YmxpYyBnZXQgaWQoKSB7IHJldHVybiB0aGlzLl9pZDsgfVxuICAgIHB1YmxpYyBnZXQgZGF0YSgpIHsgcmV0dXJuIHRoaXMuX2RhdGE7IH1cbiAgICBwdWJsaWMgZ2V0IGlzRGVsdGEoKSB7IHJldHVybiB0aGlzLl9pc0RlbHRhOyB9XG4gICAgcHVibGljIGdldCBsZW5ndGgoKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMuZGF0YS5sZW5ndGg7IH1cbiAgICBwdWJsaWMgZ2V0IG5vZGVzKCk6IEZpZWxkTm9kZVtdIHsgcmV0dXJuIHRoaXMuZGF0YS5ub2RlczsgfVxuICAgIHB1YmxpYyBnZXQgYnVmZmVycygpOiBCdWZmZXJSZWdpb25bXSB7IHJldHVybiB0aGlzLmRhdGEuYnVmZmVyczsgfVxuXG4gICAgY29uc3RydWN0b3IoZGF0YTogUmVjb3JkQmF0Y2gsIGlkOiBMb25nIHwgbnVtYmVyLCBpc0RlbHRhOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICAgICAgdGhpcy5fZGF0YSA9IGRhdGE7XG4gICAgICAgIHRoaXMuX2lzRGVsdGEgPSBpc0RlbHRhO1xuICAgICAgICB0aGlzLl9pZCA9IHR5cGVvZiBpZCA9PT0gJ251bWJlcicgPyBpZCA6IGlkLmxvdztcbiAgICB9XG59XG5cbi8qKlxuICogQGlnbm9yZVxuICovXG5leHBvcnQgY2xhc3MgQnVmZmVyUmVnaW9uIHtcbiAgICBwdWJsaWMgb2Zmc2V0OiBudW1iZXI7XG4gICAgcHVibGljIGxlbmd0aDogbnVtYmVyO1xuICAgIGNvbnN0cnVjdG9yKG9mZnNldDogTG9uZyB8IG51bWJlciwgbGVuZ3RoOiBMb25nIHwgbnVtYmVyKSB7XG4gICAgICAgIHRoaXMub2Zmc2V0ID0gdHlwZW9mIG9mZnNldCA9PT0gJ251bWJlcicgPyBvZmZzZXQgOiBvZmZzZXQubG93O1xuICAgICAgICB0aGlzLmxlbmd0aCA9IHR5cGVvZiBsZW5ndGggPT09ICdudW1iZXInID8gbGVuZ3RoIDogbGVuZ3RoLmxvdztcbiAgICB9XG59XG5cbi8qKlxuICogQGlnbm9yZVxuICovXG5leHBvcnQgY2xhc3MgRmllbGROb2RlIHtcbiAgICBwdWJsaWMgbGVuZ3RoOiBudW1iZXI7XG4gICAgcHVibGljIG51bGxDb3VudDogbnVtYmVyO1xuICAgIGNvbnN0cnVjdG9yKGxlbmd0aDogTG9uZyB8IG51bWJlciwgbnVsbENvdW50OiBMb25nIHwgbnVtYmVyKSB7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gdHlwZW9mIGxlbmd0aCA9PT0gJ251bWJlcicgPyBsZW5ndGggOiBsZW5ndGgubG93O1xuICAgICAgICB0aGlzLm51bGxDb3VudCA9IHR5cGVvZiBudWxsQ291bnQgPT09ICdudW1iZXInID8gbnVsbENvdW50IDogbnVsbENvdW50LmxvdztcbiAgICB9XG59XG5cbmZ1bmN0aW9uIG1lc3NhZ2VIZWFkZXJGcm9tSlNPTihtZXNzYWdlOiBhbnksIHR5cGU6IE1lc3NhZ2VIZWFkZXIpIHtcbiAgICByZXR1cm4gKCgpID0+IHtcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlIE1lc3NhZ2VIZWFkZXIuU2NoZW1hOiByZXR1cm4gU2NoZW1hLmZyb21KU09OKG1lc3NhZ2UpO1xuICAgICAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoOiByZXR1cm4gUmVjb3JkQmF0Y2guZnJvbUpTT04obWVzc2FnZSk7XG4gICAgICAgICAgICBjYXNlIE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoOiByZXR1cm4gRGljdGlvbmFyeUJhdGNoLmZyb21KU09OKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5yZWNvZ25pemVkIE1lc3NhZ2UgdHlwZTogeyBuYW1lOiAke01lc3NhZ2VIZWFkZXJbdHlwZV19LCB0eXBlOiAke3R5cGV9IH1gKTtcbiAgICB9KSBhcyBNZXNzYWdlSGVhZGVyRGVjb2Rlcjtcbn1cblxuZnVuY3Rpb24gZGVjb2RlTWVzc2FnZUhlYWRlcihtZXNzYWdlOiBfTWVzc2FnZSwgdHlwZTogTWVzc2FnZUhlYWRlcikge1xuICAgIHJldHVybiAoKCkgPT4ge1xuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgTWVzc2FnZUhlYWRlci5TY2hlbWE6IHJldHVybiBTY2hlbWEuZGVjb2RlKG1lc3NhZ2UuaGVhZGVyKG5ldyBfU2NoZW1hKCkpISk7XG4gICAgICAgICAgICBjYXNlIE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2g6IHJldHVybiBSZWNvcmRCYXRjaC5kZWNvZGUobWVzc2FnZS5oZWFkZXIobmV3IF9SZWNvcmRCYXRjaCgpKSEsIG1lc3NhZ2UudmVyc2lvbigpKTtcbiAgICAgICAgICAgIGNhc2UgTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2g6IHJldHVybiBEaWN0aW9uYXJ5QmF0Y2guZGVjb2RlKG1lc3NhZ2UuaGVhZGVyKG5ldyBfRGljdGlvbmFyeUJhdGNoKCkpISwgbWVzc2FnZS52ZXJzaW9uKCkpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5yZWNvZ25pemVkIE1lc3NhZ2UgdHlwZTogeyBuYW1lOiAke01lc3NhZ2VIZWFkZXJbdHlwZV19LCB0eXBlOiAke3R5cGV9IH1gKTtcbiAgICB9KSBhcyBNZXNzYWdlSGVhZGVyRGVjb2Rlcjtcbn1cblxuRmllbGRbJ2VuY29kZSddID0gZW5jb2RlRmllbGQ7XG5GaWVsZFsnZGVjb2RlJ10gPSBkZWNvZGVGaWVsZDtcbkZpZWxkWydmcm9tSlNPTiddID0gZmllbGRGcm9tSlNPTjtcblxuU2NoZW1hWydlbmNvZGUnXSA9IGVuY29kZVNjaGVtYTtcblNjaGVtYVsnZGVjb2RlJ10gPSBkZWNvZGVTY2hlbWE7XG5TY2hlbWFbJ2Zyb21KU09OJ10gPSBzY2hlbWFGcm9tSlNPTjtcblxuUmVjb3JkQmF0Y2hbJ2VuY29kZSddID0gZW5jb2RlUmVjb3JkQmF0Y2g7XG5SZWNvcmRCYXRjaFsnZGVjb2RlJ10gPSBkZWNvZGVSZWNvcmRCYXRjaDtcblJlY29yZEJhdGNoWydmcm9tSlNPTiddID0gcmVjb3JkQmF0Y2hGcm9tSlNPTjtcblxuRGljdGlvbmFyeUJhdGNoWydlbmNvZGUnXSA9IGVuY29kZURpY3Rpb25hcnlCYXRjaDtcbkRpY3Rpb25hcnlCYXRjaFsnZGVjb2RlJ10gPSBkZWNvZGVEaWN0aW9uYXJ5QmF0Y2g7XG5EaWN0aW9uYXJ5QmF0Y2hbJ2Zyb21KU09OJ10gPSBkaWN0aW9uYXJ5QmF0Y2hGcm9tSlNPTjtcblxuRmllbGROb2RlWydlbmNvZGUnXSA9IGVuY29kZUZpZWxkTm9kZTtcbkZpZWxkTm9kZVsnZGVjb2RlJ10gPSBkZWNvZGVGaWVsZE5vZGU7XG5cbkJ1ZmZlclJlZ2lvblsnZW5jb2RlJ10gPSBlbmNvZGVCdWZmZXJSZWdpb247XG5CdWZmZXJSZWdpb25bJ2RlY29kZSddID0gZGVjb2RlQnVmZmVyUmVnaW9uO1xuXG5kZWNsYXJlIG1vZHVsZSAnLi4vLi4vc2NoZW1hJyB7XG4gICAgbmFtZXNwYWNlIEZpZWxkIHtcbiAgICAgICAgZXhwb3J0IHsgZW5jb2RlRmllbGQgYXMgZW5jb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IGRlY29kZUZpZWxkIGFzIGRlY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBmaWVsZEZyb21KU09OIGFzIGZyb21KU09OIH07XG4gICAgfVxuICAgIG5hbWVzcGFjZSBTY2hlbWEge1xuICAgICAgICBleHBvcnQgeyBlbmNvZGVTY2hlbWEgYXMgZW5jb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IGRlY29kZVNjaGVtYSBhcyBkZWNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgc2NoZW1hRnJvbUpTT04gYXMgZnJvbUpTT04gfTtcbiAgICB9XG59XG5cbmRlY2xhcmUgbW9kdWxlICcuL21lc3NhZ2UnIHtcbiAgICBuYW1lc3BhY2UgUmVjb3JkQmF0Y2gge1xuICAgICAgICBleHBvcnQgeyBlbmNvZGVSZWNvcmRCYXRjaCBhcyBlbmNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgZGVjb2RlUmVjb3JkQmF0Y2ggYXMgZGVjb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IHJlY29yZEJhdGNoRnJvbUpTT04gYXMgZnJvbUpTT04gfTtcbiAgICB9XG4gICAgbmFtZXNwYWNlIERpY3Rpb25hcnlCYXRjaCB7XG4gICAgICAgIGV4cG9ydCB7IGVuY29kZURpY3Rpb25hcnlCYXRjaCBhcyBlbmNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgZGVjb2RlRGljdGlvbmFyeUJhdGNoIGFzIGRlY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBkaWN0aW9uYXJ5QmF0Y2hGcm9tSlNPTiBhcyBmcm9tSlNPTiB9O1xuICAgIH1cbiAgICBuYW1lc3BhY2UgRmllbGROb2RlIHtcbiAgICAgICAgZXhwb3J0IHsgZW5jb2RlRmllbGROb2RlIGFzIGVuY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBkZWNvZGVGaWVsZE5vZGUgYXMgZGVjb2RlIH07XG4gICAgfVxuICAgIG5hbWVzcGFjZSBCdWZmZXJSZWdpb24ge1xuICAgICAgICBleHBvcnQgeyBlbmNvZGVCdWZmZXJSZWdpb24gYXMgZW5jb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IGRlY29kZUJ1ZmZlclJlZ2lvbiBhcyBkZWNvZGUgfTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRlY29kZVNjaGVtYShfc2NoZW1hOiBfU2NoZW1hLCBkaWN0aW9uYXJpZXM6IE1hcDxudW1iZXIsIERhdGFUeXBlPiA9IG5ldyBNYXAoKSwgZGljdGlvbmFyeUZpZWxkczogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeT5bXT4gPSBuZXcgTWFwKCkpIHtcbiAgICBjb25zdCBmaWVsZHMgPSBkZWNvZGVTY2hlbWFGaWVsZHMoX3NjaGVtYSwgZGljdGlvbmFyaWVzLCBkaWN0aW9uYXJ5RmllbGRzKTtcbiAgICByZXR1cm4gbmV3IFNjaGVtYShmaWVsZHMsIGRlY29kZUN1c3RvbU1ldGFkYXRhKF9zY2hlbWEpLCBkaWN0aW9uYXJpZXMsIGRpY3Rpb25hcnlGaWVsZHMpO1xufVxuXG5mdW5jdGlvbiBkZWNvZGVSZWNvcmRCYXRjaChiYXRjaDogX1JlY29yZEJhdGNoLCB2ZXJzaW9uID0gTWV0YWRhdGFWZXJzaW9uLlY0KSB7XG4gICAgcmV0dXJuIG5ldyBSZWNvcmRCYXRjaChiYXRjaC5sZW5ndGgoKSwgZGVjb2RlRmllbGROb2RlcyhiYXRjaCksIGRlY29kZUJ1ZmZlcnMoYmF0Y2gsIHZlcnNpb24pKTtcbn1cblxuZnVuY3Rpb24gZGVjb2RlRGljdGlvbmFyeUJhdGNoKGJhdGNoOiBfRGljdGlvbmFyeUJhdGNoLCB2ZXJzaW9uID0gTWV0YWRhdGFWZXJzaW9uLlY0KSB7XG4gICAgcmV0dXJuIG5ldyBEaWN0aW9uYXJ5QmF0Y2goUmVjb3JkQmF0Y2guZGVjb2RlKGJhdGNoLmRhdGEoKSEsIHZlcnNpb24pLCBiYXRjaC5pZCgpLCBiYXRjaC5pc0RlbHRhKCkpO1xufVxuXG5mdW5jdGlvbiBkZWNvZGVCdWZmZXJSZWdpb24oYjogX0J1ZmZlcikge1xuICAgIHJldHVybiBuZXcgQnVmZmVyUmVnaW9uKGIub2Zmc2V0KCksIGIubGVuZ3RoKCkpO1xufVxuXG5mdW5jdGlvbiBkZWNvZGVGaWVsZE5vZGUoZjogX0ZpZWxkTm9kZSkge1xuICAgIHJldHVybiBuZXcgRmllbGROb2RlKGYubGVuZ3RoKCksIGYubnVsbENvdW50KCkpO1xufVxuXG5mdW5jdGlvbiBkZWNvZGVGaWVsZE5vZGVzKGJhdGNoOiBfUmVjb3JkQmF0Y2gpIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbShcbiAgICAgICAgeyBsZW5ndGg6IGJhdGNoLm5vZGVzTGVuZ3RoKCkgfSxcbiAgICAgICAgKF8sIGkpID0+IGJhdGNoLm5vZGVzKGkpIVxuICAgICkuZmlsdGVyKEJvb2xlYW4pLm1hcChGaWVsZE5vZGUuZGVjb2RlKTtcbn1cblxuZnVuY3Rpb24gZGVjb2RlQnVmZmVycyhiYXRjaDogX1JlY29yZEJhdGNoLCB2ZXJzaW9uOiBNZXRhZGF0YVZlcnNpb24pIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbShcbiAgICAgICAgeyBsZW5ndGg6IGJhdGNoLmJ1ZmZlcnNMZW5ndGgoKSB9LFxuICAgICAgICAoXywgaSkgPT4gYmF0Y2guYnVmZmVycyhpKSFcbiAgICApLmZpbHRlcihCb29sZWFuKS5tYXAodjNDb21wYXQodmVyc2lvbiwgQnVmZmVyUmVnaW9uLmRlY29kZSkpO1xufVxuXG5mdW5jdGlvbiB2M0NvbXBhdCh2ZXJzaW9uOiBNZXRhZGF0YVZlcnNpb24sIGRlY29kZTogKGJ1ZmZlcjogX0J1ZmZlcikgPT4gQnVmZmVyUmVnaW9uKSB7XG4gICAgcmV0dXJuIChidWZmZXI6IF9CdWZmZXIsIGk6IG51bWJlcikgPT4ge1xuICAgICAgICAvLyBJZiB0aGlzIEFycm93IGJ1ZmZlciB3YXMgd3JpdHRlbiBiZWZvcmUgdmVyc2lvbiA0LFxuICAgICAgICAvLyBhZHZhbmNlIHRoZSBidWZmZXIncyBiYl9wb3MgOCBieXRlcyB0byBza2lwIHBhc3RcbiAgICAgICAgLy8gdGhlIG5vdy1yZW1vdmVkIHBhZ2VfaWQgZmllbGRcbiAgICAgICAgaWYgKHZlcnNpb24gPCBNZXRhZGF0YVZlcnNpb24uVjQpIHtcbiAgICAgICAgICAgIGJ1ZmZlci5iYl9wb3MgKz0gKDggKiAoaSArIDEpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGVjb2RlKGJ1ZmZlcik7XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gZGVjb2RlU2NoZW1hRmllbGRzKHNjaGVtYTogX1NjaGVtYSwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgRGF0YVR5cGU+LCBkaWN0aW9uYXJ5RmllbGRzPzogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeT5bXT4pIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbShcbiAgICAgICAgeyBsZW5ndGg6IHNjaGVtYS5maWVsZHNMZW5ndGgoKSB9LFxuICAgICAgICAoXywgaSkgPT4gc2NoZW1hLmZpZWxkcyhpKSFcbiAgICApLmZpbHRlcihCb29sZWFuKS5tYXAoKGYpID0+IEZpZWxkLmRlY29kZShmLCBkaWN0aW9uYXJpZXMsIGRpY3Rpb25hcnlGaWVsZHMpKTtcbn1cblxuZnVuY3Rpb24gZGVjb2RlRmllbGRDaGlsZHJlbihmaWVsZDogX0ZpZWxkLCBkaWN0aW9uYXJpZXM/OiBNYXA8bnVtYmVyLCBEYXRhVHlwZT4sIGRpY3Rpb25hcnlGaWVsZHM/OiBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5PltdPik6IEZpZWxkW10ge1xuICAgIHJldHVybiBBcnJheS5mcm9tKFxuICAgICAgICB7IGxlbmd0aDogZmllbGQuY2hpbGRyZW5MZW5ndGgoKSB9LFxuICAgICAgICAoXywgaSkgPT4gZmllbGQuY2hpbGRyZW4oaSkhXG4gICAgKS5maWx0ZXIoQm9vbGVhbikubWFwKChmKSA9PiBGaWVsZC5kZWNvZGUoZiwgZGljdGlvbmFyaWVzLCBkaWN0aW9uYXJ5RmllbGRzKSk7XG59XG5cbmZ1bmN0aW9uIGRlY29kZUZpZWxkKGY6IF9GaWVsZCwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgRGF0YVR5cGU+LCBkaWN0aW9uYXJ5RmllbGRzPzogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeT5bXT4pIHtcblxuICAgIGxldCBpZDogbnVtYmVyO1xuICAgIGxldCBmaWVsZDogRmllbGQgfCB2b2lkO1xuICAgIGxldCB0eXBlOiBEYXRhVHlwZTxhbnk+O1xuICAgIGxldCBrZXlzOiBfSW50IHwgVEtleXMgfCBudWxsO1xuICAgIGxldCBkaWN0VHlwZTogRGljdGlvbmFyeTtcbiAgICBsZXQgZGljdE1ldGE6IF9EaWN0aW9uYXJ5RW5jb2RpbmcgfCBudWxsO1xuICAgIGxldCBkaWN0RmllbGQ6IEZpZWxkPERpY3Rpb25hcnk+O1xuXG4gICAgLy8gSWYgbm8gZGljdGlvbmFyeSBlbmNvZGluZywgb3IgaW4gdGhlIHByb2Nlc3Mgb2YgZGVjb2RpbmcgdGhlIGNoaWxkcmVuIG9mIGEgZGljdGlvbmFyeS1lbmNvZGVkIGZpZWxkXG4gICAgaWYgKCFkaWN0aW9uYXJpZXMgfHwgIWRpY3Rpb25hcnlGaWVsZHMgfHwgIShkaWN0TWV0YSA9IGYuZGljdGlvbmFyeSgpKSkge1xuICAgICAgICB0eXBlID0gZGVjb2RlRmllbGRUeXBlKGYsIGRlY29kZUZpZWxkQ2hpbGRyZW4oZiwgZGljdGlvbmFyaWVzLCBkaWN0aW9uYXJ5RmllbGRzKSk7XG4gICAgICAgIGZpZWxkID0gbmV3IEZpZWxkKGYubmFtZSgpISwgdHlwZSwgZi5udWxsYWJsZSgpLCBkZWNvZGVDdXN0b21NZXRhZGF0YShmKSk7XG4gICAgfVxuICAgIC8vIHRzbGludDpkaXNhYmxlXG4gICAgLy8gSWYgZGljdGlvbmFyeSBlbmNvZGVkIGFuZCB0aGUgZmlyc3QgdGltZSB3ZSd2ZSBzZWVuIHRoaXMgZGljdGlvbmFyeSBpZCwgZGVjb2RlXG4gICAgLy8gdGhlIGRhdGEgdHlwZSBhbmQgY2hpbGQgZmllbGRzLCB0aGVuIHdyYXAgaW4gYSBEaWN0aW9uYXJ5IHR5cGUgYW5kIGluc2VydCB0aGVcbiAgICAvLyBkYXRhIHR5cGUgaW50byB0aGUgZGljdGlvbmFyeSB0eXBlcyBtYXAuXG4gICAgZWxzZSBpZiAoIWRpY3Rpb25hcmllcy5oYXMoaWQgPSBkaWN0TWV0YS5pZCgpLmxvdykpIHtcbiAgICAgICAgLy8gYSBkaWN0aW9uYXJ5IGluZGV4IGRlZmF1bHRzIHRvIHNpZ25lZCAzMiBiaXQgaW50IGlmIHVuc3BlY2lmaWVkXG4gICAgICAgIGtleXMgPSAoa2V5cyA9IGRpY3RNZXRhLmluZGV4VHlwZSgpKSA/IGRlY29kZUluZGV4VHlwZShrZXlzKSBhcyBUS2V5cyA6IG5ldyBJbnQzMigpO1xuICAgICAgICBkaWN0aW9uYXJpZXMuc2V0KGlkLCB0eXBlID0gZGVjb2RlRmllbGRUeXBlKGYsIGRlY29kZUZpZWxkQ2hpbGRyZW4oZikpKTtcbiAgICAgICAgZGljdFR5cGUgPSBuZXcgRGljdGlvbmFyeSh0eXBlLCBrZXlzLCBpZCwgZGljdE1ldGEuaXNPcmRlcmVkKCkpO1xuICAgICAgICBkaWN0RmllbGQgPSBuZXcgRmllbGQoZi5uYW1lKCkhLCBkaWN0VHlwZSwgZi5udWxsYWJsZSgpLCBkZWNvZGVDdXN0b21NZXRhZGF0YShmKSk7XG4gICAgICAgIGRpY3Rpb25hcnlGaWVsZHMuc2V0KGlkLCBbZmllbGQgPSBkaWN0RmllbGRdKTtcbiAgICB9XG4gICAgLy8gSWYgZGljdGlvbmFyeSBlbmNvZGVkLCBhbmQgaGF2ZSBhbHJlYWR5IHNlZW4gdGhpcyBkaWN0aW9uYXJ5IElkIGluIHRoZSBzY2hlbWEsIHRoZW4gcmV1c2UgdGhlXG4gICAgLy8gZGF0YSB0eXBlIGFuZCB3cmFwIGluIGEgbmV3IERpY3Rpb25hcnkgdHlwZSBhbmQgZmllbGQuXG4gICAgZWxzZSB7XG4gICAgICAgIC8vIGEgZGljdGlvbmFyeSBpbmRleCBkZWZhdWx0cyB0byBzaWduZWQgMzIgYml0IGludCBpZiB1bnNwZWNpZmllZFxuICAgICAgICBrZXlzID0gKGtleXMgPSBkaWN0TWV0YS5pbmRleFR5cGUoKSkgPyBkZWNvZGVJbmRleFR5cGUoa2V5cykgYXMgVEtleXMgOiBuZXcgSW50MzIoKTtcbiAgICAgICAgZGljdFR5cGUgPSBuZXcgRGljdGlvbmFyeShkaWN0aW9uYXJpZXMuZ2V0KGlkKSEsIGtleXMsIGlkLCBkaWN0TWV0YS5pc09yZGVyZWQoKSk7XG4gICAgICAgIGRpY3RGaWVsZCA9IG5ldyBGaWVsZChmLm5hbWUoKSEsIGRpY3RUeXBlLCBmLm51bGxhYmxlKCksIGRlY29kZUN1c3RvbU1ldGFkYXRhKGYpKTtcbiAgICAgICAgZGljdGlvbmFyeUZpZWxkcy5nZXQoaWQpIS5wdXNoKGZpZWxkID0gZGljdEZpZWxkKTtcbiAgICB9XG4gICAgcmV0dXJuIGZpZWxkIHx8IG51bGw7XG59XG5cbmZ1bmN0aW9uIGRlY29kZUN1c3RvbU1ldGFkYXRhKHBhcmVudD86IF9TY2hlbWEgfCBfRmllbGQgfCBudWxsKSB7XG4gICAgY29uc3QgZGF0YSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgaWYgKHBhcmVudCkge1xuICAgICAgICBmb3IgKGxldCBlbnRyeSwga2V5LCBpID0gLTEsIG4gPSBwYXJlbnQuY3VzdG9tTWV0YWRhdGFMZW5ndGgoKSB8IDA7ICsraSA8IG47KSB7XG4gICAgICAgICAgICBpZiAoKGVudHJ5ID0gcGFyZW50LmN1c3RvbU1ldGFkYXRhKGkpKSAmJiAoa2V5ID0gZW50cnkua2V5KCkpICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBkYXRhLnNldChrZXksIGVudHJ5LnZhbHVlKCkhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbn1cblxuZnVuY3Rpb24gZGVjb2RlSW5kZXhUeXBlKF90eXBlOiBfSW50KSB7XG4gICAgcmV0dXJuIG5ldyBJbnQoX3R5cGUuaXNTaWduZWQoKSwgX3R5cGUuYml0V2lkdGgoKSBhcyBJbnRCaXRXaWR0aCk7XG59XG5cbmZ1bmN0aW9uIGRlY29kZUZpZWxkVHlwZShmOiBfRmllbGQsIGNoaWxkcmVuPzogRmllbGRbXSk6IERhdGFUeXBlPGFueT4ge1xuXG4gICAgY29uc3QgdHlwZUlkID0gZi50eXBlVHlwZSgpO1xuXG4gICAgc3dpdGNoICh0eXBlSWQpIHtcbiAgICAgICAgY2FzZSBUeXBlLk5PTkU6ICAgIHJldHVybiBuZXcgRGF0YVR5cGUoKTtcbiAgICAgICAgY2FzZSBUeXBlLk51bGw6ICAgIHJldHVybiBuZXcgTnVsbCgpO1xuICAgICAgICBjYXNlIFR5cGUuQmluYXJ5OiAgcmV0dXJuIG5ldyBCaW5hcnkoKTtcbiAgICAgICAgY2FzZSBUeXBlLlV0Zjg6ICAgIHJldHVybiBuZXcgVXRmOCgpO1xuICAgICAgICBjYXNlIFR5cGUuQm9vbDogICAgcmV0dXJuIG5ldyBCb29sKCk7XG4gICAgICAgIGNhc2UgVHlwZS5MaXN0OiAgICByZXR1cm4gbmV3IExpc3QoKGNoaWxkcmVuIHx8IFtdKVswXSk7XG4gICAgICAgIGNhc2UgVHlwZS5TdHJ1Y3RfOiByZXR1cm4gbmV3IFN0cnVjdChjaGlsZHJlbiB8fCBbXSk7XG4gICAgfVxuXG4gICAgc3dpdGNoICh0eXBlSWQpIHtcbiAgICAgICAgY2FzZSBUeXBlLkludDoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuSW50KCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgSW50KHQuaXNTaWduZWQoKSwgdC5iaXRXaWR0aCgpKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuRmxvYXRpbmdQb2ludDoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRmxvYXRpbmdQb2ludCgpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEZsb2F0KHQucHJlY2lzaW9uKCkpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5EZWNpbWFsOiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EZWNpbWFsKCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRGVjaW1hbCh0LnNjYWxlKCksIHQucHJlY2lzaW9uKCkpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5EYXRlOiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EYXRlKCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRGF0ZV8odC51bml0KCkpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5UaW1lOiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UaW1lKCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgVGltZSh0LnVuaXQoKSwgdC5iaXRXaWR0aCgpIGFzIFRpbWVCaXRXaWR0aCk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLlRpbWVzdGFtcDoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVGltZXN0YW1wKCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgVGltZXN0YW1wKHQudW5pdCgpLCB0LnRpbWV6b25lKCkpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5JbnRlcnZhbDoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuSW50ZXJ2YWwoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBJbnRlcnZhbCh0LnVuaXQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLlVuaW9uOiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5VbmlvbigpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFVuaW9uKHQubW9kZSgpLCB0LnR5cGVJZHNBcnJheSgpIHx8IFtdLCBjaGlsZHJlbiB8fCBbXSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLkZpeGVkU2l6ZUJpbmFyeToge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRml4ZWRTaXplQmluYXJ5KCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRml4ZWRTaXplQmluYXJ5KHQuYnl0ZVdpZHRoKCkpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5GaXhlZFNpemVMaXN0OiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaXhlZFNpemVMaXN0KCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRml4ZWRTaXplTGlzdCh0Lmxpc3RTaXplKCksIChjaGlsZHJlbiB8fCBbXSlbMF0pO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5NYXA6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk1hcCgpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1hcF8oY2hpbGRyZW4gfHwgW10sIHQua2V5c1NvcnRlZCgpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVucmVjb2duaXplZCB0eXBlOiBcIiR7VHlwZVt0eXBlSWRdfVwiICgke3R5cGVJZH0pYCk7XG59XG5cbmZ1bmN0aW9uIGVuY29kZVNjaGVtYShiOiBCdWlsZGVyLCBzY2hlbWE6IFNjaGVtYSkge1xuXG4gICAgY29uc3QgZmllbGRPZmZzZXRzID0gc2NoZW1hLmZpZWxkcy5tYXAoKGYpID0+IEZpZWxkLmVuY29kZShiLCBmKSk7XG5cbiAgICBfU2NoZW1hLnN0YXJ0RmllbGRzVmVjdG9yKGIsIGZpZWxkT2Zmc2V0cy5sZW5ndGgpO1xuXG4gICAgY29uc3QgZmllbGRzVmVjdG9yT2Zmc2V0ID0gX1NjaGVtYS5jcmVhdGVGaWVsZHNWZWN0b3IoYiwgZmllbGRPZmZzZXRzKTtcblxuICAgIGNvbnN0IG1ldGFkYXRhT2Zmc2V0ID0gIShzY2hlbWEubWV0YWRhdGEgJiYgc2NoZW1hLm1ldGFkYXRhLnNpemUgPiAwKSA/IC0xIDpcbiAgICAgICAgX1NjaGVtYS5jcmVhdGVDdXN0b21NZXRhZGF0YVZlY3RvcihiLCBbLi4uc2NoZW1hLm1ldGFkYXRhXS5tYXAoKFtrLCB2XSkgPT4ge1xuICAgICAgICAgICAgY29uc3Qga2V5ID0gYi5jcmVhdGVTdHJpbmcoYCR7a31gKTtcbiAgICAgICAgICAgIGNvbnN0IHZhbCA9IGIuY3JlYXRlU3RyaW5nKGAke3Z9YCk7XG4gICAgICAgICAgICBfS2V5VmFsdWUuc3RhcnRLZXlWYWx1ZShiKTtcbiAgICAgICAgICAgIF9LZXlWYWx1ZS5hZGRLZXkoYiwga2V5KTtcbiAgICAgICAgICAgIF9LZXlWYWx1ZS5hZGRWYWx1ZShiLCB2YWwpO1xuICAgICAgICAgICAgcmV0dXJuIF9LZXlWYWx1ZS5lbmRLZXlWYWx1ZShiKTtcbiAgICAgICAgfSkpO1xuXG4gICAgX1NjaGVtYS5zdGFydFNjaGVtYShiKTtcbiAgICBfU2NoZW1hLmFkZEZpZWxkcyhiLCBmaWVsZHNWZWN0b3JPZmZzZXQpO1xuICAgIF9TY2hlbWEuYWRkRW5kaWFubmVzcyhiLCBwbGF0Zm9ybUlzTGl0dGxlRW5kaWFuID8gX0VuZGlhbm5lc3MuTGl0dGxlIDogX0VuZGlhbm5lc3MuQmlnKTtcblxuICAgIGlmIChtZXRhZGF0YU9mZnNldCAhPT0gLTEpIHsgX1NjaGVtYS5hZGRDdXN0b21NZXRhZGF0YShiLCBtZXRhZGF0YU9mZnNldCk7IH1cblxuICAgIHJldHVybiBfU2NoZW1hLmVuZFNjaGVtYShiKTtcbn1cblxuZnVuY3Rpb24gZW5jb2RlRmllbGQoYjogQnVpbGRlciwgZmllbGQ6IEZpZWxkKSB7XG5cbiAgICBsZXQgbmFtZU9mZnNldCA9IC0xO1xuICAgIGxldCB0eXBlT2Zmc2V0ID0gLTE7XG4gICAgbGV0IGRpY3Rpb25hcnlPZmZzZXQgPSAtMTtcblxuICAgIGxldCB0eXBlID0gZmllbGQudHlwZTtcbiAgICBsZXQgdHlwZUlkOiBUeXBlID0gPGFueT4gZmllbGQudHlwZUlkO1xuXG4gICAgaWYgKCFEYXRhVHlwZS5pc0RpY3Rpb25hcnkodHlwZSkpIHtcbiAgICAgICAgdHlwZU9mZnNldCA9IHR5cGVBc3NlbWJsZXIudmlzaXQodHlwZSwgYikhO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHR5cGVJZCA9IHR5cGUuZGljdGlvbmFyeS50eXBlSWQ7XG4gICAgICAgIGRpY3Rpb25hcnlPZmZzZXQgPSB0eXBlQXNzZW1ibGVyLnZpc2l0KHR5cGUsIGIpITtcbiAgICAgICAgdHlwZU9mZnNldCA9IHR5cGVBc3NlbWJsZXIudmlzaXQodHlwZS5kaWN0aW9uYXJ5LCBiKSE7XG4gICAgfVxuXG4gICAgY29uc3QgY2hpbGRPZmZzZXRzID0gKHR5cGUuY2hpbGRyZW4gfHwgW10pLm1hcCgoZjogRmllbGQpID0+IEZpZWxkLmVuY29kZShiLCBmKSk7XG4gICAgY29uc3QgY2hpbGRyZW5WZWN0b3JPZmZzZXQgPSBfRmllbGQuY3JlYXRlQ2hpbGRyZW5WZWN0b3IoYiwgY2hpbGRPZmZzZXRzKTtcblxuICAgIGNvbnN0IG1ldGFkYXRhT2Zmc2V0ID0gIShmaWVsZC5tZXRhZGF0YSAmJiBmaWVsZC5tZXRhZGF0YS5zaXplID4gMCkgPyAtMSA6XG4gICAgICAgIF9GaWVsZC5jcmVhdGVDdXN0b21NZXRhZGF0YVZlY3RvcihiLCBbLi4uZmllbGQubWV0YWRhdGFdLm1hcCgoW2ssIHZdKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBrZXkgPSBiLmNyZWF0ZVN0cmluZyhgJHtrfWApO1xuICAgICAgICAgICAgY29uc3QgdmFsID0gYi5jcmVhdGVTdHJpbmcoYCR7dn1gKTtcbiAgICAgICAgICAgIF9LZXlWYWx1ZS5zdGFydEtleVZhbHVlKGIpO1xuICAgICAgICAgICAgX0tleVZhbHVlLmFkZEtleShiLCBrZXkpO1xuICAgICAgICAgICAgX0tleVZhbHVlLmFkZFZhbHVlKGIsIHZhbCk7XG4gICAgICAgICAgICByZXR1cm4gX0tleVZhbHVlLmVuZEtleVZhbHVlKGIpO1xuICAgICAgICB9KSk7XG5cbiAgICBpZiAoZmllbGQubmFtZSkge1xuICAgICAgICBuYW1lT2Zmc2V0ID0gYi5jcmVhdGVTdHJpbmcoZmllbGQubmFtZSk7XG4gICAgfVxuXG4gICAgX0ZpZWxkLnN0YXJ0RmllbGQoYik7XG4gICAgX0ZpZWxkLmFkZFR5cGUoYiwgdHlwZU9mZnNldCk7XG4gICAgX0ZpZWxkLmFkZFR5cGVUeXBlKGIsIHR5cGVJZCk7XG4gICAgX0ZpZWxkLmFkZENoaWxkcmVuKGIsIGNoaWxkcmVuVmVjdG9yT2Zmc2V0KTtcbiAgICBfRmllbGQuYWRkTnVsbGFibGUoYiwgISFmaWVsZC5udWxsYWJsZSk7XG5cbiAgICBpZiAobmFtZU9mZnNldCAhPT0gLTEpIHsgX0ZpZWxkLmFkZE5hbWUoYiwgbmFtZU9mZnNldCk7IH1cbiAgICBpZiAoZGljdGlvbmFyeU9mZnNldCAhPT0gLTEpIHsgX0ZpZWxkLmFkZERpY3Rpb25hcnkoYiwgZGljdGlvbmFyeU9mZnNldCk7IH1cbiAgICBpZiAobWV0YWRhdGFPZmZzZXQgIT09IC0xKSB7IF9GaWVsZC5hZGRDdXN0b21NZXRhZGF0YShiLCBtZXRhZGF0YU9mZnNldCk7IH1cblxuICAgIHJldHVybiBfRmllbGQuZW5kRmllbGQoYik7XG59XG5cbmZ1bmN0aW9uIGVuY29kZVJlY29yZEJhdGNoKGI6IEJ1aWxkZXIsIHJlY29yZEJhdGNoOiBSZWNvcmRCYXRjaCkge1xuXG4gICAgY29uc3Qgbm9kZXMgPSByZWNvcmRCYXRjaC5ub2RlcyB8fCBbXTtcbiAgICBjb25zdCBidWZmZXJzID0gcmVjb3JkQmF0Y2guYnVmZmVycyB8fCBbXTtcblxuICAgIF9SZWNvcmRCYXRjaC5zdGFydE5vZGVzVmVjdG9yKGIsIG5vZGVzLmxlbmd0aCk7XG4gICAgbm9kZXMuc2xpY2UoKS5yZXZlcnNlKCkuZm9yRWFjaCgobikgPT4gRmllbGROb2RlLmVuY29kZShiLCBuKSk7XG5cbiAgICBjb25zdCBub2Rlc1ZlY3Rvck9mZnNldCA9IGIuZW5kVmVjdG9yKCk7XG5cbiAgICBfUmVjb3JkQmF0Y2guc3RhcnRCdWZmZXJzVmVjdG9yKGIsIGJ1ZmZlcnMubGVuZ3RoKTtcbiAgICBidWZmZXJzLnNsaWNlKCkucmV2ZXJzZSgpLmZvckVhY2goKGJfKSA9PiBCdWZmZXJSZWdpb24uZW5jb2RlKGIsIGJfKSk7XG5cbiAgICBjb25zdCBidWZmZXJzVmVjdG9yT2Zmc2V0ID0gYi5lbmRWZWN0b3IoKTtcblxuICAgIF9SZWNvcmRCYXRjaC5zdGFydFJlY29yZEJhdGNoKGIpO1xuICAgIF9SZWNvcmRCYXRjaC5hZGRMZW5ndGgoYiwgbmV3IExvbmcocmVjb3JkQmF0Y2gubGVuZ3RoLCAwKSk7XG4gICAgX1JlY29yZEJhdGNoLmFkZE5vZGVzKGIsIG5vZGVzVmVjdG9yT2Zmc2V0KTtcbiAgICBfUmVjb3JkQmF0Y2guYWRkQnVmZmVycyhiLCBidWZmZXJzVmVjdG9yT2Zmc2V0KTtcbiAgICByZXR1cm4gX1JlY29yZEJhdGNoLmVuZFJlY29yZEJhdGNoKGIpO1xufVxuXG5mdW5jdGlvbiBlbmNvZGVEaWN0aW9uYXJ5QmF0Y2goYjogQnVpbGRlciwgZGljdGlvbmFyeUJhdGNoOiBEaWN0aW9uYXJ5QmF0Y2gpIHtcbiAgICBjb25zdCBkYXRhT2Zmc2V0ID0gUmVjb3JkQmF0Y2guZW5jb2RlKGIsIGRpY3Rpb25hcnlCYXRjaC5kYXRhKTtcbiAgICBfRGljdGlvbmFyeUJhdGNoLnN0YXJ0RGljdGlvbmFyeUJhdGNoKGIpO1xuICAgIF9EaWN0aW9uYXJ5QmF0Y2guYWRkSWQoYiwgbmV3IExvbmcoZGljdGlvbmFyeUJhdGNoLmlkLCAwKSk7XG4gICAgX0RpY3Rpb25hcnlCYXRjaC5hZGRJc0RlbHRhKGIsIGRpY3Rpb25hcnlCYXRjaC5pc0RlbHRhKTtcbiAgICBfRGljdGlvbmFyeUJhdGNoLmFkZERhdGEoYiwgZGF0YU9mZnNldCk7XG4gICAgcmV0dXJuIF9EaWN0aW9uYXJ5QmF0Y2guZW5kRGljdGlvbmFyeUJhdGNoKGIpO1xufVxuXG5mdW5jdGlvbiBlbmNvZGVGaWVsZE5vZGUoYjogQnVpbGRlciwgbm9kZTogRmllbGROb2RlKSB7XG4gICAgcmV0dXJuIF9GaWVsZE5vZGUuY3JlYXRlRmllbGROb2RlKGIsIG5ldyBMb25nKG5vZGUubGVuZ3RoLCAwKSwgbmV3IExvbmcobm9kZS5udWxsQ291bnQsIDApKTtcbn1cblxuZnVuY3Rpb24gZW5jb2RlQnVmZmVyUmVnaW9uKGI6IEJ1aWxkZXIsIG5vZGU6IEJ1ZmZlclJlZ2lvbikge1xuICAgIHJldHVybiBfQnVmZmVyLmNyZWF0ZUJ1ZmZlcihiLCBuZXcgTG9uZyhub2RlLm9mZnNldCwgMCksIG5ldyBMb25nKG5vZGUubGVuZ3RoLCAwKSk7XG59XG5cbmNvbnN0IHBsYXRmb3JtSXNMaXR0bGVFbmRpYW4gPSAoZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKDIpO1xuICAgIG5ldyBEYXRhVmlldyhidWZmZXIpLnNldEludDE2KDAsIDI1NiwgdHJ1ZSAvKiBsaXR0bGVFbmRpYW4gKi8pO1xuICAgIC8vIEludDE2QXJyYXkgdXNlcyB0aGUgcGxhdGZvcm0ncyBlbmRpYW5uZXNzLlxuICAgIHJldHVybiBuZXcgSW50MTZBcnJheShidWZmZXIpWzBdID09PSAyNTY7XG59KSgpO1xuXG50eXBlIE1lc3NhZ2VIZWFkZXJEZWNvZGVyID0gPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyPigpID0+IFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyLlNjaGVtYSA/IFNjaGVtYVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBUIGV4dGVuZHMgTWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaCA/IFJlY29yZEJhdGNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaCA/IERpY3Rpb25hcnlCYXRjaCA6IG5ldmVyO1xuIl19

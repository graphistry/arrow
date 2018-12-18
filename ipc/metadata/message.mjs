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
        // return null;
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
        // return null;
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
        case Type.List: return new List(children || []);
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
            return new Union(t.mode(), (t.typeIdsArray() || []), children || []);
        }
        case Type.FixedSizeBinary: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.FixedSizeBinary());
            return new FixedSizeBinary(t.byteWidth());
        }
        case Type.FixedSizeList: {
            const t = f.type(new Schema_.org.apache.arrow.flatbuf.FixedSizeList());
            return new FixedSizeList(t.listSize(), children || []);
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
        typeId = type.dictionary.TType;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlwYy9tZXRhZGF0YS9tZXNzYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDZEQUE2RDtBQUM3RCwrREFBK0Q7QUFDL0Qsd0RBQXdEO0FBQ3hELDZEQUE2RDtBQUM3RCxvREFBb0Q7QUFDcEQsNkRBQTZEO0FBQzdELDZEQUE2RDtBQUM3RCxFQUFFO0FBQ0YsK0NBQStDO0FBQy9DLEVBQUU7QUFDRiw2REFBNkQ7QUFDN0QsOERBQThEO0FBQzlELHlEQUF5RDtBQUN6RCw0REFBNEQ7QUFDNUQsMERBQTBEO0FBQzFELHFCQUFxQjtBQUVyQixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQzFDLE9BQU8sS0FBSyxPQUFPLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxLQUFLLFFBQVEsTUFBTSxrQkFBa0IsQ0FBQztBQUU3QyxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUM3QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFakQsT0FBTyxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDNUQsT0FBTyxFQUFFLFFBQVEsSUFBSSxhQUFhLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN4RSxPQUFPLEVBQUUsYUFBYSxFQUFFLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUVyRyxJQUFPLElBQUksR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDO0FBQy9CLElBQU8sT0FBTyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUM7QUFDckMsSUFBTyxVQUFVLEdBQUcsV0FBVyxDQUFDLFVBQVUsQ0FBQztBQUUzQyxJQUFPLElBQUksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztBQUNwRCxJQUFPLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQztBQUN2RCxJQUFPLE9BQU8sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztBQUN6RCxJQUFPLE9BQU8sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztBQUN6RCxJQUFPLFFBQVEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztBQUM1RCxJQUFPLFNBQVMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztBQUM3RCxJQUFPLFVBQVUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztBQUNoRSxJQUFPLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQztBQUNqRSxJQUFPLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQztBQUNwRSxJQUFPLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDO0FBRzVFLE9BQU8sRUFDSCxRQUFRLEVBQUUsVUFBVSxFQUNwQixJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQ3RDLElBQUksRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQ3hDLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQWUsS0FBSyxHQUMvRSxNQUFNLFlBQVksQ0FBQztBQUVwQjs7R0FFRztBQUNILE1BQU0sT0FBTyxPQUFPO0lBc0VoQixZQUFZLFVBQXlCLEVBQUUsT0FBd0IsRUFBRSxVQUFhLEVBQUUsTUFBWTtRQUN4RixJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQztRQUN4QixJQUFJLENBQUMsV0FBVyxHQUFHLFVBQVUsQ0FBQztRQUM5QixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEdBQUcsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxPQUFPLFVBQVUsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztJQUNwRixDQUFDO0lBMUVELGtCQUFrQjtJQUNYLE1BQU0sQ0FBQyxRQUFRLENBQTBCLEdBQVEsRUFBRSxVQUFhO1FBQ25FLE1BQU0sT0FBTyxHQUFHLElBQUksT0FBTyxDQUFDLENBQUMsRUFBRSxlQUFlLENBQUMsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQy9ELE9BQU8sQ0FBQyxhQUFhLEdBQUcscUJBQXFCLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQy9ELE9BQU8sT0FBTyxDQUFDO0lBQ25CLENBQUM7SUFFRCxrQkFBa0I7SUFDWCxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQXlCO1FBQzFDLEdBQUcsR0FBRyxJQUFJLFVBQVUsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN4QyxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDaEQsTUFBTSxVQUFVLEdBQVMsUUFBUSxDQUFDLFVBQVUsRUFBRyxDQUFDO1FBQ2hELE1BQU0sT0FBTyxHQUFvQixRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDcEQsTUFBTSxVQUFVLEdBQWtCLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUN4RCxNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQzdELE9BQU8sQ0FBQyxhQUFhLEdBQUcsbUJBQW1CLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ2xFLE9BQU8sT0FBTyxDQUFDO0lBQ25CLENBQUM7SUFFRCxrQkFBa0I7SUFDWCxNQUFNLENBQUMsTUFBTSxDQUEwQixPQUFtQjtRQUM3RCxJQUFJLENBQUMsR0FBRyxJQUFJLE9BQU8sRUFBRSxFQUFFLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN6QyxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUNwQixZQUFZLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBWSxDQUFDLENBQUM7U0FDL0Q7YUFBTSxJQUFJLE9BQU8sQ0FBQyxhQUFhLEVBQUUsRUFBRTtZQUNoQyxZQUFZLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBaUIsQ0FBQyxDQUFDO1NBQ3pFO2FBQU0sSUFBSSxPQUFPLENBQUMsaUJBQWlCLEVBQUUsRUFBRTtZQUNwQyxZQUFZLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBcUIsQ0FBQyxDQUFDO1NBQ2pGO1FBQ0QsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6QixRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxlQUFlLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDM0MsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDcEMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzlDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRCxRQUFRLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4RCxPQUFPLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUM1QixDQUFDO0lBRUQsa0JBQWtCO0lBQ1gsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUE4QyxFQUFFLFVBQVUsR0FBRyxDQUFDO1FBQzdFLElBQUksTUFBTSxZQUFZLE1BQU0sRUFBRTtZQUMxQixPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsRUFBRSxlQUFlLENBQUMsRUFBRSxFQUFFLGFBQWEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7U0FDM0U7UUFDRCxJQUFJLE1BQU0sWUFBWSxXQUFXLEVBQUU7WUFDL0IsT0FBTyxJQUFJLE9BQU8sQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLEVBQUUsRUFBRSxhQUFhLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQ3pGO1FBQ0QsSUFBSSxNQUFNLFlBQVksZUFBZSxFQUFFO1lBQ25DLE9BQU8sSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxFQUFFLEVBQUUsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQztTQUM3RjtRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsZ0NBQWdDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQU9ELElBQVcsSUFBSSxLQUFLLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDN0MsSUFBVyxPQUFPLEtBQUssT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUM5QyxJQUFXLFVBQVUsS0FBSyxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBQ3BELElBQVcsVUFBVSxLQUFLLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFHN0MsTUFBTSxLQUFLLE9BQU8sSUFBSSxDQUFDLGFBQWEsRUFBSyxDQUFDLENBQUMsQ0FBQztJQUM1QyxRQUFRLEtBQTRDLE9BQU8sSUFBSSxDQUFDLFVBQVUsS0FBSyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUN0RyxhQUFhLEtBQWlELE9BQU8sSUFBSSxDQUFDLFVBQVUsS0FBSyxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztJQUNySCxpQkFBaUIsS0FBcUQsT0FBTyxJQUFJLENBQUMsVUFBVSxLQUFLLGFBQWEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO0NBUzNJO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sV0FBVztJQUlwQixJQUFXLEtBQUssS0FBSyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQzFDLElBQVcsTUFBTSxLQUFLLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDNUMsSUFBVyxPQUFPLEtBQUssT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUM5QyxZQUFZLE1BQXFCLEVBQUUsS0FBa0IsRUFBRSxPQUF1QjtRQUMxRSxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUNwQixJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQztRQUN4QixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sTUFBTSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO0lBQ3BFLENBQUM7Q0FDSjtBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGVBQWU7SUFLeEIsSUFBVyxFQUFFLEtBQUssT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNwQyxJQUFXLElBQUksS0FBSyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3hDLElBQVcsT0FBTyxLQUFLLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDOUMsSUFBVyxNQUFNLEtBQWEsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDeEQsSUFBVyxLQUFLLEtBQWtCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzNELElBQVcsT0FBTyxLQUFxQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUVsRSxZQUFZLElBQWlCLEVBQUUsRUFBaUIsRUFBRSxVQUFtQixLQUFLO1FBQ3RFLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1FBQ2xCLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxHQUFHLEdBQUcsT0FBTyxFQUFFLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUM7SUFDcEQsQ0FBQztDQUNKO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sWUFBWTtJQUdyQixZQUFZLE1BQXFCLEVBQUUsTUFBcUI7UUFDcEQsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLE1BQU0sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztRQUMvRCxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sTUFBTSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO0lBQ25FLENBQUM7Q0FDSjtBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLFNBQVM7SUFHbEIsWUFBWSxNQUFxQixFQUFFLFNBQXdCO1FBQ3ZELElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxNQUFNLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUM7UUFDL0QsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLFNBQVMsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQztJQUMvRSxDQUFDO0NBQ0o7QUFFRCxTQUFTLHFCQUFxQixDQUFDLE9BQVksRUFBRSxJQUFtQjtJQUM1RCxPQUFPLENBQUMsR0FBRyxFQUFFO1FBQ1QsUUFBUSxJQUFJLEVBQUU7WUFDVixLQUFLLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDM0QsS0FBSyxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3JFLEtBQUssYUFBYSxDQUFDLGVBQWUsQ0FBQyxDQUFDLE9BQU8sZUFBZSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUNoRjtRQUNELGVBQWU7UUFDZixNQUFNLElBQUksS0FBSyxDQUFDLHNDQUFzQyxhQUFhLENBQUMsSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsQ0FBQztJQUNsRyxDQUFDLENBQXlCLENBQUM7QUFDL0IsQ0FBQztBQUVELFNBQVMsbUJBQW1CLENBQUMsT0FBaUIsRUFBRSxJQUFtQjtJQUMvRCxPQUFPLENBQUMsR0FBRyxFQUFFO1FBQ1QsUUFBUSxJQUFJLEVBQUU7WUFDVixLQUFLLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLE9BQU8sRUFBRSxDQUFFLENBQUMsQ0FBQztZQUNoRixLQUFLLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLFlBQVksRUFBRSxDQUFFLEVBQUUsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDbEgsS0FBSyxhQUFhLENBQUMsZUFBZSxDQUFDLENBQUMsT0FBTyxlQUFlLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxnQkFBZ0IsRUFBRSxDQUFFLEVBQUUsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7U0FDakk7UUFDRCxlQUFlO1FBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQ0FBc0MsYUFBYSxDQUFDLElBQUksQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDLENBQUM7SUFDbEcsQ0FBQyxDQUF5QixDQUFDO0FBQy9CLENBQUM7QUFFRCxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsV0FBVyxDQUFDO0FBQzlCLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxXQUFXLENBQUM7QUFDOUIsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLGFBQWEsQ0FBQztBQUVsQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsWUFBWSxDQUFDO0FBQ2hDLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxZQUFZLENBQUM7QUFDaEMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLGNBQWMsQ0FBQztBQUVwQyxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsaUJBQWlCLENBQUM7QUFDMUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLGlCQUFpQixDQUFDO0FBQzFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsR0FBRyxtQkFBbUIsQ0FBQztBQUU5QyxlQUFlLENBQUMsUUFBUSxDQUFDLEdBQUcscUJBQXFCLENBQUM7QUFDbEQsZUFBZSxDQUFDLFFBQVEsQ0FBQyxHQUFHLHFCQUFxQixDQUFDO0FBQ2xELGVBQWUsQ0FBQyxVQUFVLENBQUMsR0FBRyx1QkFBdUIsQ0FBQztBQUV0RCxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsZUFBZSxDQUFDO0FBQ3RDLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxlQUFlLENBQUM7QUFFdEMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxHQUFHLGtCQUFrQixDQUFDO0FBQzVDLFlBQVksQ0FBQyxRQUFRLENBQUMsR0FBRyxrQkFBa0IsQ0FBQztBQW9DNUMsU0FBUyxZQUFZLENBQUMsT0FBZ0IsRUFBRSxlQUFzQyxJQUFJLEdBQUcsRUFBRSxFQUFFLG1CQUFxRCxJQUFJLEdBQUcsRUFBRTtJQUNuSixNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLGdCQUFnQixDQUFDLENBQUM7SUFDM0UsT0FBTyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUUsb0JBQW9CLENBQUMsT0FBTyxDQUFDLEVBQUUsWUFBWSxFQUFFLGdCQUFnQixDQUFDLENBQUM7QUFDN0YsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsS0FBbUIsRUFBRSxPQUFPLEdBQUcsZUFBZSxDQUFDLEVBQUU7SUFDeEUsT0FBTyxJQUFJLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUUsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEVBQUUsYUFBYSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ25HLENBQUM7QUFFRCxTQUFTLHFCQUFxQixDQUFDLEtBQXVCLEVBQUUsT0FBTyxHQUFHLGVBQWUsQ0FBQyxFQUFFO0lBQ2hGLE9BQU8sSUFBSSxlQUFlLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFHLEVBQUUsT0FBTyxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0FBQ3hHLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLENBQVU7SUFDbEMsT0FBTyxJQUFJLFlBQVksQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7QUFDcEQsQ0FBQztBQUVELFNBQVMsZUFBZSxDQUFDLENBQWE7SUFDbEMsT0FBTyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7QUFDcEQsQ0FBQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsS0FBbUI7SUFDekMsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUNiLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxXQUFXLEVBQUUsRUFBRSxFQUMvQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFFLENBQzVCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDNUMsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLEtBQW1CLEVBQUUsT0FBd0I7SUFDaEUsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUNiLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxhQUFhLEVBQUUsRUFBRSxFQUNqQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFFLENBQzlCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQ2xFLENBQUM7QUFFRCxTQUFTLFFBQVEsQ0FBQyxPQUF3QixFQUFFLE1BQXlDO0lBQ2pGLE9BQU8sQ0FBQyxNQUFlLEVBQUUsQ0FBUyxFQUFFLEVBQUU7UUFDbEMscURBQXFEO1FBQ3JELG1EQUFtRDtRQUNuRCxnQ0FBZ0M7UUFDaEMsSUFBSSxPQUFPLEdBQUcsZUFBZSxDQUFDLEVBQUUsRUFBRTtZQUM5QixNQUFNLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDbEM7UUFDRCxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUMxQixDQUFDLENBQUM7QUFDTixDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxNQUFlLEVBQUUsWUFBb0MsRUFBRSxnQkFBbUQ7SUFDbEksT0FBTyxLQUFLLENBQUMsSUFBSSxDQUNiLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxZQUFZLEVBQUUsRUFBRSxFQUNqQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFFLENBQzlCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsWUFBWSxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQztBQUNsRixDQUFDO0FBRUQsU0FBUyxtQkFBbUIsQ0FBQyxLQUFhLEVBQUUsWUFBb0MsRUFBRSxnQkFBbUQ7SUFDakksT0FBTyxLQUFLLENBQUMsSUFBSSxDQUNiLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxjQUFjLEVBQUUsRUFBRSxFQUNsQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFFLENBQy9CLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsWUFBWSxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQztBQUNsRixDQUFDO0FBRUQsU0FBUyxXQUFXLENBQUMsQ0FBUyxFQUFFLFlBQW9DLEVBQUUsZ0JBQW1EO0lBRXJILElBQUksRUFBVSxDQUFDO0lBQ2YsSUFBSSxLQUFtQixDQUFDO0lBQ3hCLElBQUksSUFBbUIsQ0FBQztJQUN4QixJQUFJLElBQXlCLENBQUM7SUFDOUIsSUFBSSxRQUFvQixDQUFDO0lBQ3pCLElBQUksUUFBb0MsQ0FBQztJQUN6QyxJQUFJLFNBQTRCLENBQUM7SUFFakMsc0dBQXNHO0lBQ3RHLElBQUksQ0FBQyxZQUFZLElBQUksQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFO1FBQ3BFLElBQUksR0FBRyxlQUFlLENBQUMsQ0FBQyxFQUFFLG1CQUFtQixDQUFDLENBQUMsRUFBRSxZQUFZLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1FBQ2xGLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFHLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzdFO0lBQ0QsaUJBQWlCO0lBQ2pCLGlGQUFpRjtJQUNqRixnRkFBZ0Y7SUFDaEYsMkNBQTJDO1NBQ3RDLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxRQUFRLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDaEQsa0VBQWtFO1FBQ2xFLElBQUksR0FBRyxDQUFDLElBQUksR0FBRyxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQ3BGLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksR0FBRyxlQUFlLENBQUMsQ0FBQyxFQUFFLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4RSxRQUFRLEdBQUcsSUFBSSxVQUFVLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7UUFDaEUsU0FBUyxHQUFHLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUcsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEYsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDO0tBQ2pEO0lBQ0QsZ0dBQWdHO0lBQ2hHLHlEQUF5RDtTQUNwRDtRQUNELGtFQUFrRTtRQUNsRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUNwRixRQUFRLEdBQUcsSUFBSSxVQUFVLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQ2pGLFNBQVMsR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFHLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xGLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQyxDQUFDO0tBQ3JEO0lBQ0QsT0FBTyxLQUFLLElBQUksSUFBSSxDQUFDO0FBQ3pCLENBQUM7QUFFRCxTQUFTLG9CQUFvQixDQUFDLE1BQWdDO0lBQzFELE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO0lBQ3ZDLElBQUksTUFBTSxFQUFFO1FBQ1IsS0FBSyxJQUFJLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHO1lBQzFFLElBQUksQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLElBQUksRUFBRTtnQkFDbkUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEtBQUssRUFBRyxDQUFDLENBQUM7YUFDakM7U0FDSjtLQUNKO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDaEIsQ0FBQztBQUVELFNBQVMsZUFBZSxDQUFDLEtBQVc7SUFDaEMsT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBaUIsQ0FBQyxDQUFDO0FBQ3RFLENBQUM7QUFFRCxTQUFTLGVBQWUsQ0FBQyxDQUFTLEVBQUUsUUFBa0I7SUFFbEQsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBRTVCLFFBQVEsTUFBTSxFQUFFO1FBQ1osS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUksT0FBTyxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQ3pDLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFJLE9BQU8sSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUNyQyxLQUFLLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBRSxPQUFPLElBQUksTUFBTSxFQUFFLENBQUM7UUFDdkMsS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUksT0FBTyxJQUFJLElBQUksRUFBRSxDQUFDO1FBQ3JDLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFJLE9BQU8sSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUNyQyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBSSxPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNuRCxLQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUMsQ0FBQztLQUN4RDtJQUVELFFBQVEsTUFBTSxFQUFFO1FBQ1osS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDWCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBRSxDQUFDO1lBQzlELE9BQU8sSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1NBQzlDO1FBQ0QsS0FBSyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDckIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUUsQ0FBQztZQUN4RSxPQUFPLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1NBQ25DO1FBQ0QsS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDZixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBRSxDQUFDO1lBQ2xFLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1NBQ2hEO1FBQ0QsS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDWixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBRSxDQUFDO1lBQy9ELE9BQU8sSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7U0FDOUI7UUFDRCxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNaLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFFLENBQUM7WUFDL0QsT0FBTyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBa0IsQ0FBQyxDQUFDO1NBQzNEO1FBQ0QsS0FBSyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDakIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUUsQ0FBQztZQUNwRSxPQUFPLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztTQUNoRDtRQUNELEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2hCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFFLENBQUM7WUFDbkUsT0FBTyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztTQUNqQztRQUNELEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2IsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUUsQ0FBQztZQUNoRSxPQUFPLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsSUFBSSxFQUFFLENBQVcsRUFBRSxRQUFRLElBQUksRUFBRSxDQUFDLENBQUM7U0FDbEY7UUFDRCxLQUFLLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUN2QixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsQ0FBRSxDQUFDO1lBQzFFLE9BQU8sSUFBSSxlQUFlLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7U0FDN0M7UUFDRCxLQUFLLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUNyQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBRSxDQUFDO1lBQ3hFLE9BQU8sSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLFFBQVEsSUFBSSxFQUFFLENBQUMsQ0FBQztTQUMxRDtRQUNELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ1gsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUUsQ0FBQztZQUM5RCxPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7U0FDbkQ7S0FDSjtJQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXVCLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDO0FBQ3hFLENBQUM7QUFFRCxTQUFTLFlBQVksQ0FBQyxDQUFVLEVBQUUsTUFBYztJQUU1QyxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVsRSxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUVsRCxNQUFNLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFFdkUsTUFBTSxjQUFjLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEUsT0FBTyxDQUFDLDBCQUEwQixDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDdEUsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDbkMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDbkMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMzQixTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUN6QixTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUMzQixPQUFPLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVSLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkIsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztJQUN6QyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRXhGLElBQUksY0FBYyxLQUFLLENBQUMsQ0FBQyxFQUFFO1FBQUUsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQztLQUFFO0lBRTVFLE9BQU8sT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoQyxDQUFDO0FBRUQsU0FBUyxXQUFXLENBQUMsQ0FBVSxFQUFFLEtBQVk7SUFFekMsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDcEIsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDcEIsSUFBSSxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUUxQixJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO0lBQ3RCLElBQUksTUFBTSxHQUFlLEtBQUssQ0FBQyxNQUFNLENBQUM7SUFFdEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDOUIsVUFBVSxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBRSxDQUFDO0tBQzlDO1NBQU07UUFDSCxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUM7UUFDL0IsZ0JBQWdCLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFFLENBQUM7UUFDakQsVUFBVSxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUUsQ0FBQztLQUN6RDtJQUVELE1BQU0sWUFBWSxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFRLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakYsTUFBTSxvQkFBb0IsR0FBRyxNQUFNLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBRTFFLE1BQU0sY0FBYyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RFLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3BFLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ25DLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ25DLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0IsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDekIsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDM0IsT0FBTyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFUixJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUU7UUFDWixVQUFVLEdBQUcsQ0FBQyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDM0M7SUFFRCxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3JCLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQzlCLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzlCLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQUM7SUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUV4QyxJQUFJLFVBQVUsS0FBSyxDQUFDLENBQUMsRUFBRTtRQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0tBQUU7SUFDekQsSUFBSSxnQkFBZ0IsS0FBSyxDQUFDLENBQUMsRUFBRTtRQUFFLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLENBQUM7S0FBRTtJQUMzRSxJQUFJLGNBQWMsS0FBSyxDQUFDLENBQUMsRUFBRTtRQUFFLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUM7S0FBRTtJQUUzRSxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUIsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsQ0FBVSxFQUFFLFdBQXdCO0lBRTNELE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO0lBQ3RDLE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDO0lBRTFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQy9DLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFL0QsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7SUFFeEMsWUFBWSxDQUFDLGtCQUFrQixDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbkQsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUV0RSxNQUFNLG1CQUFtQixHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUUxQyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNELFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLENBQUM7SUFDNUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztJQUNoRCxPQUFPLFlBQVksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUMsQ0FBQztBQUVELFNBQVMscUJBQXFCLENBQUMsQ0FBVSxFQUFFLGVBQWdDO0lBQ3ZFLE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvRCxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN6QyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMzRCxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN4RCxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3hDLE9BQU8sZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEQsQ0FBQztBQUVELFNBQVMsZUFBZSxDQUFDLENBQVUsRUFBRSxJQUFlO0lBQ2hELE9BQU8sVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEcsQ0FBQztBQUVELFNBQVMsa0JBQWtCLENBQUMsQ0FBVSxFQUFFLElBQWtCO0lBQ3RELE9BQU8sT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkYsQ0FBQztBQUVELE1BQU0sc0JBQXNCLEdBQUcsQ0FBQztJQUM1QixNQUFNLE1BQU0sR0FBRyxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQyxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUMvRCw2Q0FBNkM7SUFDN0MsT0FBTyxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUM7QUFDN0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyIsImZpbGUiOiJpcGMvbWV0YWRhdGEvbWVzc2FnZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBmbGF0YnVmZmVycyB9IGZyb20gJ2ZsYXRidWZmZXJzJztcbmltcG9ydCAqIGFzIFNjaGVtYV8gZnJvbSAnLi4vLi4vZmIvU2NoZW1hJztcbmltcG9ydCAqIGFzIE1lc3NhZ2VfIGZyb20gJy4uLy4uL2ZiL01lc3NhZ2UnO1xuXG5pbXBvcnQgeyBTY2hlbWEsIEZpZWxkIH0gZnJvbSAnLi4vLi4vc2NoZW1hJztcbmltcG9ydCB7IHRvVWludDhBcnJheSB9IGZyb20gJy4uLy4uL3V0aWwvYnVmZmVyJztcbmltcG9ydCB7IEFycmF5QnVmZmVyVmlld0lucHV0IH0gZnJvbSAnLi4vLi4vdXRpbC9idWZmZXInO1xuaW1wb3J0IHsgTWVzc2FnZUhlYWRlciwgTWV0YWRhdGFWZXJzaW9uIH0gZnJvbSAnLi4vLi4vZW51bSc7XG5pbXBvcnQgeyBpbnN0YW5jZSBhcyB0eXBlQXNzZW1ibGVyIH0gZnJvbSAnLi4vLi4vdmlzaXRvci90eXBlYXNzZW1ibGVyJztcbmltcG9ydCB7IGZpZWxkRnJvbUpTT04sIHNjaGVtYUZyb21KU09OLCByZWNvcmRCYXRjaEZyb21KU09OLCBkaWN0aW9uYXJ5QmF0Y2hGcm9tSlNPTiB9IGZyb20gJy4vanNvbic7XG5cbmltcG9ydCBMb25nID0gZmxhdGJ1ZmZlcnMuTG9uZztcbmltcG9ydCBCdWlsZGVyID0gZmxhdGJ1ZmZlcnMuQnVpbGRlcjtcbmltcG9ydCBCeXRlQnVmZmVyID0gZmxhdGJ1ZmZlcnMuQnl0ZUJ1ZmZlcjtcbmltcG9ydCBfSW50ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuSW50O1xuaW1wb3J0IFR5cGUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UeXBlO1xuaW1wb3J0IF9GaWVsZCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpZWxkO1xuaW1wb3J0IF9TY2hlbWEgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5TY2hlbWE7XG5pbXBvcnQgX0J1ZmZlciA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkJ1ZmZlcjtcbmltcG9ydCBfTWVzc2FnZSA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NZXNzYWdlO1xuaW1wb3J0IF9LZXlWYWx1ZSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLktleVZhbHVlO1xuaW1wb3J0IF9GaWVsZE5vZGUgPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRmllbGROb2RlO1xuaW1wb3J0IF9FbmRpYW5uZXNzID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRW5kaWFubmVzcztcbmltcG9ydCBfUmVjb3JkQmF0Y2ggPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuUmVjb3JkQmF0Y2g7XG5pbXBvcnQgX0RpY3Rpb25hcnlCYXRjaCA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EaWN0aW9uYXJ5QmF0Y2g7XG5pbXBvcnQgX0RpY3Rpb25hcnlFbmNvZGluZyA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRpY3Rpb25hcnlFbmNvZGluZztcblxuaW1wb3J0IHtcbiAgICBEYXRhVHlwZSwgRGljdGlvbmFyeSwgVGltZUJpdFdpZHRoLFxuICAgIFV0ZjgsIEJpbmFyeSwgRGVjaW1hbCwgRml4ZWRTaXplQmluYXJ5LFxuICAgIExpc3QsIEZpeGVkU2l6ZUxpc3QsIE1hcF8sIFN0cnVjdCwgVW5pb24sXG4gICAgQm9vbCwgTnVsbCwgSW50LCBGbG9hdCwgRGF0ZV8sIFRpbWUsIEludGVydmFsLCBUaW1lc3RhbXAsIEludEJpdFdpZHRoLCBJbnQzMiwgVEtleXMsXG59IGZyb20gJy4uLy4uL3R5cGUnO1xuXG4vKipcbiAqIEBpZ25vcmVcbiAqL1xuZXhwb3J0IGNsYXNzIE1lc3NhZ2U8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXIgPSBhbnk+IHtcblxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbUpTT048VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KG1zZzogYW55LCBoZWFkZXJUeXBlOiBUKTogTWVzc2FnZTxUPiB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBuZXcgTWVzc2FnZSgwLCBNZXRhZGF0YVZlcnNpb24uVjQsIGhlYWRlclR5cGUpO1xuICAgICAgICBtZXNzYWdlLl9jcmVhdGVIZWFkZXIgPSBtZXNzYWdlSGVhZGVyRnJvbUpTT04obXNnLCBoZWFkZXJUeXBlKTtcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgfVxuXG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBkZWNvZGUoYnVmOiBBcnJheUJ1ZmZlclZpZXdJbnB1dCkge1xuICAgICAgICBidWYgPSBuZXcgQnl0ZUJ1ZmZlcih0b1VpbnQ4QXJyYXkoYnVmKSk7XG4gICAgICAgIGNvbnN0IF9tZXNzYWdlID0gX01lc3NhZ2UuZ2V0Um9vdEFzTWVzc2FnZShidWYpO1xuICAgICAgICBjb25zdCBib2R5TGVuZ3RoOiBMb25nID0gX21lc3NhZ2UuYm9keUxlbmd0aCgpITtcbiAgICAgICAgY29uc3QgdmVyc2lvbjogTWV0YWRhdGFWZXJzaW9uID0gX21lc3NhZ2UudmVyc2lvbigpO1xuICAgICAgICBjb25zdCBoZWFkZXJUeXBlOiBNZXNzYWdlSGVhZGVyID0gX21lc3NhZ2UuaGVhZGVyVHlwZSgpO1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gbmV3IE1lc3NhZ2UoYm9keUxlbmd0aCwgdmVyc2lvbiwgaGVhZGVyVHlwZSk7XG4gICAgICAgIG1lc3NhZ2UuX2NyZWF0ZUhlYWRlciA9IGRlY29kZU1lc3NhZ2VIZWFkZXIoX21lc3NhZ2UsIGhlYWRlclR5cGUpO1xuICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICB9XG5cbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGVuY29kZTxUIGV4dGVuZHMgTWVzc2FnZUhlYWRlcj4obWVzc2FnZTogTWVzc2FnZTxUPikge1xuICAgICAgICBsZXQgYiA9IG5ldyBCdWlsZGVyKCksIGhlYWRlck9mZnNldCA9IC0xO1xuICAgICAgICBpZiAobWVzc2FnZS5pc1NjaGVtYSgpKSB7XG4gICAgICAgICAgICBoZWFkZXJPZmZzZXQgPSBTY2hlbWEuZW5jb2RlKGIsIG1lc3NhZ2UuaGVhZGVyKCkgYXMgU2NoZW1hKTtcbiAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmlzUmVjb3JkQmF0Y2goKSkge1xuICAgICAgICAgICAgaGVhZGVyT2Zmc2V0ID0gUmVjb3JkQmF0Y2guZW5jb2RlKGIsIG1lc3NhZ2UuaGVhZGVyKCkgYXMgUmVjb3JkQmF0Y2gpO1xuICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuaXNEaWN0aW9uYXJ5QmF0Y2goKSkge1xuICAgICAgICAgICAgaGVhZGVyT2Zmc2V0ID0gRGljdGlvbmFyeUJhdGNoLmVuY29kZShiLCBtZXNzYWdlLmhlYWRlcigpIGFzIERpY3Rpb25hcnlCYXRjaCk7XG4gICAgICAgIH1cbiAgICAgICAgX01lc3NhZ2Uuc3RhcnRNZXNzYWdlKGIpO1xuICAgICAgICBfTWVzc2FnZS5hZGRWZXJzaW9uKGIsIE1ldGFkYXRhVmVyc2lvbi5WNCk7XG4gICAgICAgIF9NZXNzYWdlLmFkZEhlYWRlcihiLCBoZWFkZXJPZmZzZXQpO1xuICAgICAgICBfTWVzc2FnZS5hZGRIZWFkZXJUeXBlKGIsIG1lc3NhZ2UuaGVhZGVyVHlwZSk7XG4gICAgICAgIF9NZXNzYWdlLmFkZEJvZHlMZW5ndGgoYiwgbmV3IExvbmcobWVzc2FnZS5ib2R5TGVuZ3RoLCAwKSk7XG4gICAgICAgIF9NZXNzYWdlLmZpbmlzaE1lc3NhZ2VCdWZmZXIoYiwgX01lc3NhZ2UuZW5kTWVzc2FnZShiKSk7XG4gICAgICAgIHJldHVybiBiLmFzVWludDhBcnJheSgpO1xuICAgIH1cblxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbShoZWFkZXI6IFNjaGVtYSB8IFJlY29yZEJhdGNoIHwgRGljdGlvbmFyeUJhdGNoLCBib2R5TGVuZ3RoID0gMCkge1xuICAgICAgICBpZiAoaGVhZGVyIGluc3RhbmNlb2YgU2NoZW1hKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1lc3NhZ2UoMCwgTWV0YWRhdGFWZXJzaW9uLlY0LCBNZXNzYWdlSGVhZGVyLlNjaGVtYSwgaGVhZGVyKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGVhZGVyIGluc3RhbmNlb2YgUmVjb3JkQmF0Y2gpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgTWVzc2FnZShib2R5TGVuZ3RoLCBNZXRhZGF0YVZlcnNpb24uVjQsIE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2gsIGhlYWRlcik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhlYWRlciBpbnN0YW5jZW9mIERpY3Rpb25hcnlCYXRjaCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNZXNzYWdlKGJvZHlMZW5ndGgsIE1ldGFkYXRhVmVyc2lvbi5WNCwgTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2gsIGhlYWRlcik7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnJlY29nbml6ZWQgTWVzc2FnZSBoZWFkZXI6ICR7aGVhZGVyfWApO1xuICAgIH1cblxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgYm9keTogVWludDhBcnJheTtcbiAgICBwcm90ZWN0ZWQgX2hlYWRlclR5cGU6IFQ7XG4gICAgcHJvdGVjdGVkIF9ib2R5TGVuZ3RoOiBudW1iZXI7XG4gICAgcHJvdGVjdGVkIF92ZXJzaW9uOiBNZXRhZGF0YVZlcnNpb247XG4gICAgcHVibGljIGdldCB0eXBlKCkgeyByZXR1cm4gdGhpcy5oZWFkZXJUeXBlOyB9XG4gICAgcHVibGljIGdldCB2ZXJzaW9uKCkgeyByZXR1cm4gdGhpcy5fdmVyc2lvbjsgfVxuICAgIHB1YmxpYyBnZXQgaGVhZGVyVHlwZSgpIHsgcmV0dXJuIHRoaXMuX2hlYWRlclR5cGU7IH1cbiAgICBwdWJsaWMgZ2V0IGJvZHlMZW5ndGgoKSB7IHJldHVybiB0aGlzLl9ib2R5TGVuZ3RoOyB9XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHByb3RlY3RlZCBfY3JlYXRlSGVhZGVyOiBNZXNzYWdlSGVhZGVyRGVjb2RlcjtcbiAgICBwdWJsaWMgaGVhZGVyKCkgeyByZXR1cm4gdGhpcy5fY3JlYXRlSGVhZGVyPFQ+KCk7IH1cbiAgICBwdWJsaWMgaXNTY2hlbWEoKTogdGhpcyBpcyBNZXNzYWdlPE1lc3NhZ2VIZWFkZXIuU2NoZW1hPiB7IHJldHVybiB0aGlzLmhlYWRlclR5cGUgPT09IE1lc3NhZ2VIZWFkZXIuU2NoZW1hOyB9XG4gICAgcHVibGljIGlzUmVjb3JkQmF0Y2goKTogdGhpcyBpcyBNZXNzYWdlPE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2g+IHsgcmV0dXJuIHRoaXMuaGVhZGVyVHlwZSA9PT0gTWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaDsgfVxuICAgIHB1YmxpYyBpc0RpY3Rpb25hcnlCYXRjaCgpOiB0aGlzIGlzIE1lc3NhZ2U8TWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2g+IHsgcmV0dXJuIHRoaXMuaGVhZGVyVHlwZSA9PT0gTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2g7IH1cblxuICAgIGNvbnN0cnVjdG9yKGJvZHlMZW5ndGg6IExvbmcgfCBudW1iZXIsIHZlcnNpb246IE1ldGFkYXRhVmVyc2lvbiwgaGVhZGVyVHlwZTogVCwgaGVhZGVyPzogYW55KSB7XG4gICAgICAgIHRoaXMuX3ZlcnNpb24gPSB2ZXJzaW9uO1xuICAgICAgICB0aGlzLl9oZWFkZXJUeXBlID0gaGVhZGVyVHlwZTtcbiAgICAgICAgdGhpcy5ib2R5ID0gbmV3IFVpbnQ4QXJyYXkoMCk7XG4gICAgICAgIGhlYWRlciAmJiAodGhpcy5fY3JlYXRlSGVhZGVyID0gKCkgPT4gaGVhZGVyKTtcbiAgICAgICAgdGhpcy5fYm9keUxlbmd0aCA9IHR5cGVvZiBib2R5TGVuZ3RoID09PSAnbnVtYmVyJyA/IGJvZHlMZW5ndGggOiBib2R5TGVuZ3RoLmxvdztcbiAgICB9XG59XG5cbi8qKlxuICogQGlnbm9yZVxuICovXG5leHBvcnQgY2xhc3MgUmVjb3JkQmF0Y2gge1xuICAgIHByb3RlY3RlZCBfbGVuZ3RoOiBudW1iZXI7XG4gICAgcHJvdGVjdGVkIF9ub2RlczogRmllbGROb2RlW107XG4gICAgcHJvdGVjdGVkIF9idWZmZXJzOiBCdWZmZXJSZWdpb25bXTtcbiAgICBwdWJsaWMgZ2V0IG5vZGVzKCkgeyByZXR1cm4gdGhpcy5fbm9kZXM7IH1cbiAgICBwdWJsaWMgZ2V0IGxlbmd0aCgpIHsgcmV0dXJuIHRoaXMuX2xlbmd0aDsgfVxuICAgIHB1YmxpYyBnZXQgYnVmZmVycygpIHsgcmV0dXJuIHRoaXMuX2J1ZmZlcnM7IH1cbiAgICBjb25zdHJ1Y3RvcihsZW5ndGg6IExvbmcgfCBudW1iZXIsIG5vZGVzOiBGaWVsZE5vZGVbXSwgYnVmZmVyczogQnVmZmVyUmVnaW9uW10pIHtcbiAgICAgICAgdGhpcy5fbm9kZXMgPSBub2RlcztcbiAgICAgICAgdGhpcy5fYnVmZmVycyA9IGJ1ZmZlcnM7XG4gICAgICAgIHRoaXMuX2xlbmd0aCA9IHR5cGVvZiBsZW5ndGggPT09ICdudW1iZXInID8gbGVuZ3RoIDogbGVuZ3RoLmxvdztcbiAgICB9XG59XG5cbi8qKlxuICogQGlnbm9yZVxuICovXG5leHBvcnQgY2xhc3MgRGljdGlvbmFyeUJhdGNoIHtcblxuICAgIHByb3RlY3RlZCBfaWQ6IG51bWJlcjtcbiAgICBwcm90ZWN0ZWQgX2lzRGVsdGE6IGJvb2xlYW47XG4gICAgcHJvdGVjdGVkIF9kYXRhOiBSZWNvcmRCYXRjaDtcbiAgICBwdWJsaWMgZ2V0IGlkKCkgeyByZXR1cm4gdGhpcy5faWQ7IH1cbiAgICBwdWJsaWMgZ2V0IGRhdGEoKSB7IHJldHVybiB0aGlzLl9kYXRhOyB9XG4gICAgcHVibGljIGdldCBpc0RlbHRhKCkgeyByZXR1cm4gdGhpcy5faXNEZWx0YTsgfVxuICAgIHB1YmxpYyBnZXQgbGVuZ3RoKCk6IG51bWJlciB7IHJldHVybiB0aGlzLmRhdGEubGVuZ3RoOyB9XG4gICAgcHVibGljIGdldCBub2RlcygpOiBGaWVsZE5vZGVbXSB7IHJldHVybiB0aGlzLmRhdGEubm9kZXM7IH1cbiAgICBwdWJsaWMgZ2V0IGJ1ZmZlcnMoKTogQnVmZmVyUmVnaW9uW10geyByZXR1cm4gdGhpcy5kYXRhLmJ1ZmZlcnM7IH1cblxuICAgIGNvbnN0cnVjdG9yKGRhdGE6IFJlY29yZEJhdGNoLCBpZDogTG9uZyB8IG51bWJlciwgaXNEZWx0YTogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgICAgIHRoaXMuX2RhdGEgPSBkYXRhO1xuICAgICAgICB0aGlzLl9pc0RlbHRhID0gaXNEZWx0YTtcbiAgICAgICAgdGhpcy5faWQgPSB0eXBlb2YgaWQgPT09ICdudW1iZXInID8gaWQgOiBpZC5sb3c7XG4gICAgfVxufVxuXG4vKipcbiAqIEBpZ25vcmVcbiAqL1xuZXhwb3J0IGNsYXNzIEJ1ZmZlclJlZ2lvbiB7XG4gICAgcHVibGljIG9mZnNldDogbnVtYmVyO1xuICAgIHB1YmxpYyBsZW5ndGg6IG51bWJlcjtcbiAgICBjb25zdHJ1Y3RvcihvZmZzZXQ6IExvbmcgfCBudW1iZXIsIGxlbmd0aDogTG9uZyB8IG51bWJlcikge1xuICAgICAgICB0aGlzLm9mZnNldCA9IHR5cGVvZiBvZmZzZXQgPT09ICdudW1iZXInID8gb2Zmc2V0IDogb2Zmc2V0LmxvdztcbiAgICAgICAgdGhpcy5sZW5ndGggPSB0eXBlb2YgbGVuZ3RoID09PSAnbnVtYmVyJyA/IGxlbmd0aCA6IGxlbmd0aC5sb3c7XG4gICAgfVxufVxuXG4vKipcbiAqIEBpZ25vcmVcbiAqL1xuZXhwb3J0IGNsYXNzIEZpZWxkTm9kZSB7XG4gICAgcHVibGljIGxlbmd0aDogbnVtYmVyO1xuICAgIHB1YmxpYyBudWxsQ291bnQ6IG51bWJlcjtcbiAgICBjb25zdHJ1Y3RvcihsZW5ndGg6IExvbmcgfCBudW1iZXIsIG51bGxDb3VudDogTG9uZyB8IG51bWJlcikge1xuICAgICAgICB0aGlzLmxlbmd0aCA9IHR5cGVvZiBsZW5ndGggPT09ICdudW1iZXInID8gbGVuZ3RoIDogbGVuZ3RoLmxvdztcbiAgICAgICAgdGhpcy5udWxsQ291bnQgPSB0eXBlb2YgbnVsbENvdW50ID09PSAnbnVtYmVyJyA/IG51bGxDb3VudCA6IG51bGxDb3VudC5sb3c7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBtZXNzYWdlSGVhZGVyRnJvbUpTT04obWVzc2FnZTogYW55LCB0eXBlOiBNZXNzYWdlSGVhZGVyKSB7XG4gICAgcmV0dXJuICgoKSA9PiB7XG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLlNjaGVtYTogcmV0dXJuIFNjaGVtYS5mcm9tSlNPTihtZXNzYWdlKTtcbiAgICAgICAgICAgIGNhc2UgTWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaDogcmV0dXJuIFJlY29yZEJhdGNoLmZyb21KU09OKG1lc3NhZ2UpO1xuICAgICAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaDogcmV0dXJuIERpY3Rpb25hcnlCYXRjaC5mcm9tSlNPTihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgICAvLyByZXR1cm4gbnVsbDtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnJlY29nbml6ZWQgTWVzc2FnZSB0eXBlOiB7IG5hbWU6ICR7TWVzc2FnZUhlYWRlclt0eXBlXX0sIHR5cGU6ICR7dHlwZX0gfWApO1xuICAgIH0pIGFzIE1lc3NhZ2VIZWFkZXJEZWNvZGVyO1xufVxuXG5mdW5jdGlvbiBkZWNvZGVNZXNzYWdlSGVhZGVyKG1lc3NhZ2U6IF9NZXNzYWdlLCB0eXBlOiBNZXNzYWdlSGVhZGVyKSB7XG4gICAgcmV0dXJuICgoKSA9PiB7XG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLlNjaGVtYTogcmV0dXJuIFNjaGVtYS5kZWNvZGUobWVzc2FnZS5oZWFkZXIobmV3IF9TY2hlbWEoKSkhKTtcbiAgICAgICAgICAgIGNhc2UgTWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaDogcmV0dXJuIFJlY29yZEJhdGNoLmRlY29kZShtZXNzYWdlLmhlYWRlcihuZXcgX1JlY29yZEJhdGNoKCkpISwgbWVzc2FnZS52ZXJzaW9uKCkpO1xuICAgICAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaDogcmV0dXJuIERpY3Rpb25hcnlCYXRjaC5kZWNvZGUobWVzc2FnZS5oZWFkZXIobmV3IF9EaWN0aW9uYXJ5QmF0Y2goKSkhLCBtZXNzYWdlLnZlcnNpb24oKSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gcmV0dXJuIG51bGw7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5yZWNvZ25pemVkIE1lc3NhZ2UgdHlwZTogeyBuYW1lOiAke01lc3NhZ2VIZWFkZXJbdHlwZV19LCB0eXBlOiAke3R5cGV9IH1gKTtcbiAgICB9KSBhcyBNZXNzYWdlSGVhZGVyRGVjb2Rlcjtcbn1cblxuRmllbGRbJ2VuY29kZSddID0gZW5jb2RlRmllbGQ7XG5GaWVsZFsnZGVjb2RlJ10gPSBkZWNvZGVGaWVsZDtcbkZpZWxkWydmcm9tSlNPTiddID0gZmllbGRGcm9tSlNPTjtcblxuU2NoZW1hWydlbmNvZGUnXSA9IGVuY29kZVNjaGVtYTtcblNjaGVtYVsnZGVjb2RlJ10gPSBkZWNvZGVTY2hlbWE7XG5TY2hlbWFbJ2Zyb21KU09OJ10gPSBzY2hlbWFGcm9tSlNPTjtcblxuUmVjb3JkQmF0Y2hbJ2VuY29kZSddID0gZW5jb2RlUmVjb3JkQmF0Y2g7XG5SZWNvcmRCYXRjaFsnZGVjb2RlJ10gPSBkZWNvZGVSZWNvcmRCYXRjaDtcblJlY29yZEJhdGNoWydmcm9tSlNPTiddID0gcmVjb3JkQmF0Y2hGcm9tSlNPTjtcblxuRGljdGlvbmFyeUJhdGNoWydlbmNvZGUnXSA9IGVuY29kZURpY3Rpb25hcnlCYXRjaDtcbkRpY3Rpb25hcnlCYXRjaFsnZGVjb2RlJ10gPSBkZWNvZGVEaWN0aW9uYXJ5QmF0Y2g7XG5EaWN0aW9uYXJ5QmF0Y2hbJ2Zyb21KU09OJ10gPSBkaWN0aW9uYXJ5QmF0Y2hGcm9tSlNPTjtcblxuRmllbGROb2RlWydlbmNvZGUnXSA9IGVuY29kZUZpZWxkTm9kZTtcbkZpZWxkTm9kZVsnZGVjb2RlJ10gPSBkZWNvZGVGaWVsZE5vZGU7XG5cbkJ1ZmZlclJlZ2lvblsnZW5jb2RlJ10gPSBlbmNvZGVCdWZmZXJSZWdpb247XG5CdWZmZXJSZWdpb25bJ2RlY29kZSddID0gZGVjb2RlQnVmZmVyUmVnaW9uO1xuXG5kZWNsYXJlIG1vZHVsZSAnLi4vLi4vc2NoZW1hJyB7XG4gICAgbmFtZXNwYWNlIEZpZWxkIHtcbiAgICAgICAgZXhwb3J0IHsgZW5jb2RlRmllbGQgYXMgZW5jb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IGRlY29kZUZpZWxkIGFzIGRlY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBmaWVsZEZyb21KU09OIGFzIGZyb21KU09OIH07XG4gICAgfVxuICAgIG5hbWVzcGFjZSBTY2hlbWEge1xuICAgICAgICBleHBvcnQgeyBlbmNvZGVTY2hlbWEgYXMgZW5jb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IGRlY29kZVNjaGVtYSBhcyBkZWNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgc2NoZW1hRnJvbUpTT04gYXMgZnJvbUpTT04gfTtcbiAgICB9XG59XG5cbmRlY2xhcmUgbW9kdWxlICcuL21lc3NhZ2UnIHtcbiAgICBuYW1lc3BhY2UgUmVjb3JkQmF0Y2gge1xuICAgICAgICBleHBvcnQgeyBlbmNvZGVSZWNvcmRCYXRjaCBhcyBlbmNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgZGVjb2RlUmVjb3JkQmF0Y2ggYXMgZGVjb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IHJlY29yZEJhdGNoRnJvbUpTT04gYXMgZnJvbUpTT04gfTtcbiAgICB9XG4gICAgbmFtZXNwYWNlIERpY3Rpb25hcnlCYXRjaCB7XG4gICAgICAgIGV4cG9ydCB7IGVuY29kZURpY3Rpb25hcnlCYXRjaCBhcyBlbmNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgZGVjb2RlRGljdGlvbmFyeUJhdGNoIGFzIGRlY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBkaWN0aW9uYXJ5QmF0Y2hGcm9tSlNPTiBhcyBmcm9tSlNPTiB9O1xuICAgIH1cbiAgICBuYW1lc3BhY2UgRmllbGROb2RlIHtcbiAgICAgICAgZXhwb3J0IHsgZW5jb2RlRmllbGROb2RlIGFzIGVuY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBkZWNvZGVGaWVsZE5vZGUgYXMgZGVjb2RlIH07XG4gICAgfVxuICAgIG5hbWVzcGFjZSBCdWZmZXJSZWdpb24ge1xuICAgICAgICBleHBvcnQgeyBlbmNvZGVCdWZmZXJSZWdpb24gYXMgZW5jb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IGRlY29kZUJ1ZmZlclJlZ2lvbiBhcyBkZWNvZGUgfTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRlY29kZVNjaGVtYShfc2NoZW1hOiBfU2NoZW1hLCBkaWN0aW9uYXJpZXM6IE1hcDxudW1iZXIsIERhdGFUeXBlPiA9IG5ldyBNYXAoKSwgZGljdGlvbmFyeUZpZWxkczogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeT5bXT4gPSBuZXcgTWFwKCkpIHtcbiAgICBjb25zdCBmaWVsZHMgPSBkZWNvZGVTY2hlbWFGaWVsZHMoX3NjaGVtYSwgZGljdGlvbmFyaWVzLCBkaWN0aW9uYXJ5RmllbGRzKTtcbiAgICByZXR1cm4gbmV3IFNjaGVtYShmaWVsZHMsIGRlY29kZUN1c3RvbU1ldGFkYXRhKF9zY2hlbWEpLCBkaWN0aW9uYXJpZXMsIGRpY3Rpb25hcnlGaWVsZHMpO1xufVxuXG5mdW5jdGlvbiBkZWNvZGVSZWNvcmRCYXRjaChiYXRjaDogX1JlY29yZEJhdGNoLCB2ZXJzaW9uID0gTWV0YWRhdGFWZXJzaW9uLlY0KSB7XG4gICAgcmV0dXJuIG5ldyBSZWNvcmRCYXRjaChiYXRjaC5sZW5ndGgoKSwgZGVjb2RlRmllbGROb2RlcyhiYXRjaCksIGRlY29kZUJ1ZmZlcnMoYmF0Y2gsIHZlcnNpb24pKTtcbn1cblxuZnVuY3Rpb24gZGVjb2RlRGljdGlvbmFyeUJhdGNoKGJhdGNoOiBfRGljdGlvbmFyeUJhdGNoLCB2ZXJzaW9uID0gTWV0YWRhdGFWZXJzaW9uLlY0KSB7XG4gICAgcmV0dXJuIG5ldyBEaWN0aW9uYXJ5QmF0Y2goUmVjb3JkQmF0Y2guZGVjb2RlKGJhdGNoLmRhdGEoKSEsIHZlcnNpb24pLCBiYXRjaC5pZCgpLCBiYXRjaC5pc0RlbHRhKCkpO1xufVxuXG5mdW5jdGlvbiBkZWNvZGVCdWZmZXJSZWdpb24oYjogX0J1ZmZlcikge1xuICAgIHJldHVybiBuZXcgQnVmZmVyUmVnaW9uKGIub2Zmc2V0KCksIGIubGVuZ3RoKCkpO1xufVxuXG5mdW5jdGlvbiBkZWNvZGVGaWVsZE5vZGUoZjogX0ZpZWxkTm9kZSkge1xuICAgIHJldHVybiBuZXcgRmllbGROb2RlKGYubGVuZ3RoKCksIGYubnVsbENvdW50KCkpO1xufVxuXG5mdW5jdGlvbiBkZWNvZGVGaWVsZE5vZGVzKGJhdGNoOiBfUmVjb3JkQmF0Y2gpIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbShcbiAgICAgICAgeyBsZW5ndGg6IGJhdGNoLm5vZGVzTGVuZ3RoKCkgfSxcbiAgICAgICAgKF8sIGkpID0+IGJhdGNoLm5vZGVzKGkpIVxuICAgICkuZmlsdGVyKEJvb2xlYW4pLm1hcChGaWVsZE5vZGUuZGVjb2RlKTtcbn1cblxuZnVuY3Rpb24gZGVjb2RlQnVmZmVycyhiYXRjaDogX1JlY29yZEJhdGNoLCB2ZXJzaW9uOiBNZXRhZGF0YVZlcnNpb24pIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbShcbiAgICAgICAgeyBsZW5ndGg6IGJhdGNoLmJ1ZmZlcnNMZW5ndGgoKSB9LFxuICAgICAgICAoXywgaSkgPT4gYmF0Y2guYnVmZmVycyhpKSFcbiAgICApLmZpbHRlcihCb29sZWFuKS5tYXAodjNDb21wYXQodmVyc2lvbiwgQnVmZmVyUmVnaW9uLmRlY29kZSkpO1xufVxuXG5mdW5jdGlvbiB2M0NvbXBhdCh2ZXJzaW9uOiBNZXRhZGF0YVZlcnNpb24sIGRlY29kZTogKGJ1ZmZlcjogX0J1ZmZlcikgPT4gQnVmZmVyUmVnaW9uKSB7XG4gICAgcmV0dXJuIChidWZmZXI6IF9CdWZmZXIsIGk6IG51bWJlcikgPT4ge1xuICAgICAgICAvLyBJZiB0aGlzIEFycm93IGJ1ZmZlciB3YXMgd3JpdHRlbiBiZWZvcmUgdmVyc2lvbiA0LFxuICAgICAgICAvLyBhZHZhbmNlIHRoZSBidWZmZXIncyBiYl9wb3MgOCBieXRlcyB0byBza2lwIHBhc3RcbiAgICAgICAgLy8gdGhlIG5vdy1yZW1vdmVkIHBhZ2VfaWQgZmllbGRcbiAgICAgICAgaWYgKHZlcnNpb24gPCBNZXRhZGF0YVZlcnNpb24uVjQpIHtcbiAgICAgICAgICAgIGJ1ZmZlci5iYl9wb3MgKz0gKDggKiAoaSArIDEpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGVjb2RlKGJ1ZmZlcik7XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gZGVjb2RlU2NoZW1hRmllbGRzKHNjaGVtYTogX1NjaGVtYSwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgRGF0YVR5cGU+LCBkaWN0aW9uYXJ5RmllbGRzPzogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeT5bXT4pIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbShcbiAgICAgICAgeyBsZW5ndGg6IHNjaGVtYS5maWVsZHNMZW5ndGgoKSB9LFxuICAgICAgICAoXywgaSkgPT4gc2NoZW1hLmZpZWxkcyhpKSFcbiAgICApLmZpbHRlcihCb29sZWFuKS5tYXAoKGYpID0+IEZpZWxkLmRlY29kZShmLCBkaWN0aW9uYXJpZXMsIGRpY3Rpb25hcnlGaWVsZHMpKTtcbn1cblxuZnVuY3Rpb24gZGVjb2RlRmllbGRDaGlsZHJlbihmaWVsZDogX0ZpZWxkLCBkaWN0aW9uYXJpZXM/OiBNYXA8bnVtYmVyLCBEYXRhVHlwZT4sIGRpY3Rpb25hcnlGaWVsZHM/OiBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5PltdPik6IEZpZWxkW10ge1xuICAgIHJldHVybiBBcnJheS5mcm9tKFxuICAgICAgICB7IGxlbmd0aDogZmllbGQuY2hpbGRyZW5MZW5ndGgoKSB9LFxuICAgICAgICAoXywgaSkgPT4gZmllbGQuY2hpbGRyZW4oaSkhXG4gICAgKS5maWx0ZXIoQm9vbGVhbikubWFwKChmKSA9PiBGaWVsZC5kZWNvZGUoZiwgZGljdGlvbmFyaWVzLCBkaWN0aW9uYXJ5RmllbGRzKSk7XG59XG5cbmZ1bmN0aW9uIGRlY29kZUZpZWxkKGY6IF9GaWVsZCwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgRGF0YVR5cGU+LCBkaWN0aW9uYXJ5RmllbGRzPzogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeT5bXT4pIHtcblxuICAgIGxldCBpZDogbnVtYmVyO1xuICAgIGxldCBmaWVsZDogRmllbGQgfCB2b2lkO1xuICAgIGxldCB0eXBlOiBEYXRhVHlwZTxhbnk+O1xuICAgIGxldCBrZXlzOiBfSW50IHwgVEtleXMgfCBudWxsO1xuICAgIGxldCBkaWN0VHlwZTogRGljdGlvbmFyeTtcbiAgICBsZXQgZGljdE1ldGE6IF9EaWN0aW9uYXJ5RW5jb2RpbmcgfCBudWxsO1xuICAgIGxldCBkaWN0RmllbGQ6IEZpZWxkPERpY3Rpb25hcnk+O1xuXG4gICAgLy8gSWYgbm8gZGljdGlvbmFyeSBlbmNvZGluZywgb3IgaW4gdGhlIHByb2Nlc3Mgb2YgZGVjb2RpbmcgdGhlIGNoaWxkcmVuIG9mIGEgZGljdGlvbmFyeS1lbmNvZGVkIGZpZWxkXG4gICAgaWYgKCFkaWN0aW9uYXJpZXMgfHwgIWRpY3Rpb25hcnlGaWVsZHMgfHwgIShkaWN0TWV0YSA9IGYuZGljdGlvbmFyeSgpKSkge1xuICAgICAgICB0eXBlID0gZGVjb2RlRmllbGRUeXBlKGYsIGRlY29kZUZpZWxkQ2hpbGRyZW4oZiwgZGljdGlvbmFyaWVzLCBkaWN0aW9uYXJ5RmllbGRzKSk7XG4gICAgICAgIGZpZWxkID0gbmV3IEZpZWxkKGYubmFtZSgpISwgdHlwZSwgZi5udWxsYWJsZSgpLCBkZWNvZGVDdXN0b21NZXRhZGF0YShmKSk7XG4gICAgfVxuICAgIC8vIHRzbGludDpkaXNhYmxlXG4gICAgLy8gSWYgZGljdGlvbmFyeSBlbmNvZGVkIGFuZCB0aGUgZmlyc3QgdGltZSB3ZSd2ZSBzZWVuIHRoaXMgZGljdGlvbmFyeSBpZCwgZGVjb2RlXG4gICAgLy8gdGhlIGRhdGEgdHlwZSBhbmQgY2hpbGQgZmllbGRzLCB0aGVuIHdyYXAgaW4gYSBEaWN0aW9uYXJ5IHR5cGUgYW5kIGluc2VydCB0aGVcbiAgICAvLyBkYXRhIHR5cGUgaW50byB0aGUgZGljdGlvbmFyeSB0eXBlcyBtYXAuXG4gICAgZWxzZSBpZiAoIWRpY3Rpb25hcmllcy5oYXMoaWQgPSBkaWN0TWV0YS5pZCgpLmxvdykpIHtcbiAgICAgICAgLy8gYSBkaWN0aW9uYXJ5IGluZGV4IGRlZmF1bHRzIHRvIHNpZ25lZCAzMiBiaXQgaW50IGlmIHVuc3BlY2lmaWVkXG4gICAgICAgIGtleXMgPSAoa2V5cyA9IGRpY3RNZXRhLmluZGV4VHlwZSgpKSA/IGRlY29kZUluZGV4VHlwZShrZXlzKSBhcyBUS2V5cyA6IG5ldyBJbnQzMigpO1xuICAgICAgICBkaWN0aW9uYXJpZXMuc2V0KGlkLCB0eXBlID0gZGVjb2RlRmllbGRUeXBlKGYsIGRlY29kZUZpZWxkQ2hpbGRyZW4oZikpKTtcbiAgICAgICAgZGljdFR5cGUgPSBuZXcgRGljdGlvbmFyeSh0eXBlLCBrZXlzLCBpZCwgZGljdE1ldGEuaXNPcmRlcmVkKCkpO1xuICAgICAgICBkaWN0RmllbGQgPSBuZXcgRmllbGQoZi5uYW1lKCkhLCBkaWN0VHlwZSwgZi5udWxsYWJsZSgpLCBkZWNvZGVDdXN0b21NZXRhZGF0YShmKSk7XG4gICAgICAgIGRpY3Rpb25hcnlGaWVsZHMuc2V0KGlkLCBbZmllbGQgPSBkaWN0RmllbGRdKTtcbiAgICB9XG4gICAgLy8gSWYgZGljdGlvbmFyeSBlbmNvZGVkLCBhbmQgaGF2ZSBhbHJlYWR5IHNlZW4gdGhpcyBkaWN0aW9uYXJ5IElkIGluIHRoZSBzY2hlbWEsIHRoZW4gcmV1c2UgdGhlXG4gICAgLy8gZGF0YSB0eXBlIGFuZCB3cmFwIGluIGEgbmV3IERpY3Rpb25hcnkgdHlwZSBhbmQgZmllbGQuXG4gICAgZWxzZSB7XG4gICAgICAgIC8vIGEgZGljdGlvbmFyeSBpbmRleCBkZWZhdWx0cyB0byBzaWduZWQgMzIgYml0IGludCBpZiB1bnNwZWNpZmllZFxuICAgICAgICBrZXlzID0gKGtleXMgPSBkaWN0TWV0YS5pbmRleFR5cGUoKSkgPyBkZWNvZGVJbmRleFR5cGUoa2V5cykgYXMgVEtleXMgOiBuZXcgSW50MzIoKTtcbiAgICAgICAgZGljdFR5cGUgPSBuZXcgRGljdGlvbmFyeShkaWN0aW9uYXJpZXMuZ2V0KGlkKSEsIGtleXMsIGlkLCBkaWN0TWV0YS5pc09yZGVyZWQoKSk7XG4gICAgICAgIGRpY3RGaWVsZCA9IG5ldyBGaWVsZChmLm5hbWUoKSEsIGRpY3RUeXBlLCBmLm51bGxhYmxlKCksIGRlY29kZUN1c3RvbU1ldGFkYXRhKGYpKTtcbiAgICAgICAgZGljdGlvbmFyeUZpZWxkcy5nZXQoaWQpIS5wdXNoKGZpZWxkID0gZGljdEZpZWxkKTtcbiAgICB9XG4gICAgcmV0dXJuIGZpZWxkIHx8IG51bGw7XG59XG5cbmZ1bmN0aW9uIGRlY29kZUN1c3RvbU1ldGFkYXRhKHBhcmVudD86IF9TY2hlbWEgfCBfRmllbGQgfCBudWxsKSB7XG4gICAgY29uc3QgZGF0YSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgaWYgKHBhcmVudCkge1xuICAgICAgICBmb3IgKGxldCBlbnRyeSwga2V5LCBpID0gLTEsIG4gPSBwYXJlbnQuY3VzdG9tTWV0YWRhdGFMZW5ndGgoKSB8IDA7ICsraSA8IG47KSB7XG4gICAgICAgICAgICBpZiAoKGVudHJ5ID0gcGFyZW50LmN1c3RvbU1ldGFkYXRhKGkpKSAmJiAoa2V5ID0gZW50cnkua2V5KCkpICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBkYXRhLnNldChrZXksIGVudHJ5LnZhbHVlKCkhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbn1cblxuZnVuY3Rpb24gZGVjb2RlSW5kZXhUeXBlKF90eXBlOiBfSW50KSB7XG4gICAgcmV0dXJuIG5ldyBJbnQoX3R5cGUuaXNTaWduZWQoKSwgX3R5cGUuYml0V2lkdGgoKSBhcyBJbnRCaXRXaWR0aCk7XG59XG5cbmZ1bmN0aW9uIGRlY29kZUZpZWxkVHlwZShmOiBfRmllbGQsIGNoaWxkcmVuPzogRmllbGRbXSk6IERhdGFUeXBlPGFueT4ge1xuXG4gICAgY29uc3QgdHlwZUlkID0gZi50eXBlVHlwZSgpO1xuXG4gICAgc3dpdGNoICh0eXBlSWQpIHtcbiAgICAgICAgY2FzZSBUeXBlLk5PTkU6ICAgIHJldHVybiBuZXcgRGF0YVR5cGUoKTtcbiAgICAgICAgY2FzZSBUeXBlLk51bGw6ICAgIHJldHVybiBuZXcgTnVsbCgpO1xuICAgICAgICBjYXNlIFR5cGUuQmluYXJ5OiAgcmV0dXJuIG5ldyBCaW5hcnkoKTtcbiAgICAgICAgY2FzZSBUeXBlLlV0Zjg6ICAgIHJldHVybiBuZXcgVXRmOCgpO1xuICAgICAgICBjYXNlIFR5cGUuQm9vbDogICAgcmV0dXJuIG5ldyBCb29sKCk7XG4gICAgICAgIGNhc2UgVHlwZS5MaXN0OiAgICByZXR1cm4gbmV3IExpc3QoY2hpbGRyZW4gfHwgW10pO1xuICAgICAgICBjYXNlIFR5cGUuU3RydWN0XzogcmV0dXJuIG5ldyBTdHJ1Y3QoY2hpbGRyZW4gfHwgW10pO1xuICAgIH1cblxuICAgIHN3aXRjaCAodHlwZUlkKSB7XG4gICAgICAgIGNhc2UgVHlwZS5JbnQ6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkludCgpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEludCh0LmlzU2lnbmVkKCksIHQuYml0V2lkdGgoKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLkZsb2F0aW5nUG9pbnQ6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZsb2F0aW5nUG9pbnQoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBGbG9hdCh0LnByZWNpc2lvbigpKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuRGVjaW1hbDoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGVjaW1hbCgpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IERlY2ltYWwodC5zY2FsZSgpLCB0LnByZWNpc2lvbigpKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuRGF0ZToge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGF0ZSgpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IERhdGVfKHQudW5pdCgpKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuVGltZToge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVGltZSgpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFRpbWUodC51bml0KCksIHQuYml0V2lkdGgoKSBhcyBUaW1lQml0V2lkdGgpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5UaW1lc3RhbXA6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlRpbWVzdGFtcCgpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFRpbWVzdGFtcCh0LnVuaXQoKSwgdC50aW1lem9uZSgpKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuSW50ZXJ2YWw6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkludGVydmFsKCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgSW50ZXJ2YWwodC51bml0KCkpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5Vbmlvbjoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVW5pb24oKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBVbmlvbih0Lm1vZGUoKSwgKHQudHlwZUlkc0FycmF5KCkgfHwgW10pIGFzIFR5cGVbXSwgY2hpbGRyZW4gfHwgW10pO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5GaXhlZFNpemVCaW5hcnk6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpeGVkU2l6ZUJpbmFyeSgpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEZpeGVkU2l6ZUJpbmFyeSh0LmJ5dGVXaWR0aCgpKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuRml4ZWRTaXplTGlzdDoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRml4ZWRTaXplTGlzdCgpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEZpeGVkU2l6ZUxpc3QodC5saXN0U2l6ZSgpLCBjaGlsZHJlbiB8fCBbXSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLk1hcDoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTWFwKCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgTWFwXyhjaGlsZHJlbiB8fCBbXSwgdC5rZXlzU29ydGVkKCkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgVW5yZWNvZ25pemVkIHR5cGU6IFwiJHtUeXBlW3R5cGVJZF19XCIgKCR7dHlwZUlkfSlgKTtcbn1cblxuZnVuY3Rpb24gZW5jb2RlU2NoZW1hKGI6IEJ1aWxkZXIsIHNjaGVtYTogU2NoZW1hKSB7XG5cbiAgICBjb25zdCBmaWVsZE9mZnNldHMgPSBzY2hlbWEuZmllbGRzLm1hcCgoZikgPT4gRmllbGQuZW5jb2RlKGIsIGYpKTtcblxuICAgIF9TY2hlbWEuc3RhcnRGaWVsZHNWZWN0b3IoYiwgZmllbGRPZmZzZXRzLmxlbmd0aCk7XG5cbiAgICBjb25zdCBmaWVsZHNWZWN0b3JPZmZzZXQgPSBfU2NoZW1hLmNyZWF0ZUZpZWxkc1ZlY3RvcihiLCBmaWVsZE9mZnNldHMpO1xuXG4gICAgY29uc3QgbWV0YWRhdGFPZmZzZXQgPSAhKHNjaGVtYS5tZXRhZGF0YSAmJiBzY2hlbWEubWV0YWRhdGEuc2l6ZSA+IDApID8gLTEgOlxuICAgICAgICBfU2NoZW1hLmNyZWF0ZUN1c3RvbU1ldGFkYXRhVmVjdG9yKGIsIFsuLi5zY2hlbWEubWV0YWRhdGFdLm1hcCgoW2ssIHZdKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBrZXkgPSBiLmNyZWF0ZVN0cmluZyhgJHtrfWApO1xuICAgICAgICAgICAgY29uc3QgdmFsID0gYi5jcmVhdGVTdHJpbmcoYCR7dn1gKTtcbiAgICAgICAgICAgIF9LZXlWYWx1ZS5zdGFydEtleVZhbHVlKGIpO1xuICAgICAgICAgICAgX0tleVZhbHVlLmFkZEtleShiLCBrZXkpO1xuICAgICAgICAgICAgX0tleVZhbHVlLmFkZFZhbHVlKGIsIHZhbCk7XG4gICAgICAgICAgICByZXR1cm4gX0tleVZhbHVlLmVuZEtleVZhbHVlKGIpO1xuICAgICAgICB9KSk7XG5cbiAgICBfU2NoZW1hLnN0YXJ0U2NoZW1hKGIpO1xuICAgIF9TY2hlbWEuYWRkRmllbGRzKGIsIGZpZWxkc1ZlY3Rvck9mZnNldCk7XG4gICAgX1NjaGVtYS5hZGRFbmRpYW5uZXNzKGIsIHBsYXRmb3JtSXNMaXR0bGVFbmRpYW4gPyBfRW5kaWFubmVzcy5MaXR0bGUgOiBfRW5kaWFubmVzcy5CaWcpO1xuXG4gICAgaWYgKG1ldGFkYXRhT2Zmc2V0ICE9PSAtMSkgeyBfU2NoZW1hLmFkZEN1c3RvbU1ldGFkYXRhKGIsIG1ldGFkYXRhT2Zmc2V0KTsgfVxuXG4gICAgcmV0dXJuIF9TY2hlbWEuZW5kU2NoZW1hKGIpO1xufVxuXG5mdW5jdGlvbiBlbmNvZGVGaWVsZChiOiBCdWlsZGVyLCBmaWVsZDogRmllbGQpIHtcblxuICAgIGxldCBuYW1lT2Zmc2V0ID0gLTE7XG4gICAgbGV0IHR5cGVPZmZzZXQgPSAtMTtcbiAgICBsZXQgZGljdGlvbmFyeU9mZnNldCA9IC0xO1xuXG4gICAgbGV0IHR5cGUgPSBmaWVsZC50eXBlO1xuICAgIGxldCB0eXBlSWQ6IFR5cGUgPSA8YW55PiBmaWVsZC50eXBlSWQ7XG5cbiAgICBpZiAoIURhdGFUeXBlLmlzRGljdGlvbmFyeSh0eXBlKSkge1xuICAgICAgICB0eXBlT2Zmc2V0ID0gdHlwZUFzc2VtYmxlci52aXNpdCh0eXBlLCBiKSE7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdHlwZUlkID0gdHlwZS5kaWN0aW9uYXJ5LlRUeXBlO1xuICAgICAgICBkaWN0aW9uYXJ5T2Zmc2V0ID0gdHlwZUFzc2VtYmxlci52aXNpdCh0eXBlLCBiKSE7XG4gICAgICAgIHR5cGVPZmZzZXQgPSB0eXBlQXNzZW1ibGVyLnZpc2l0KHR5cGUuZGljdGlvbmFyeSwgYikhO1xuICAgIH1cblxuICAgIGNvbnN0IGNoaWxkT2Zmc2V0cyA9ICh0eXBlLmNoaWxkcmVuIHx8IFtdKS5tYXAoKGY6IEZpZWxkKSA9PiBGaWVsZC5lbmNvZGUoYiwgZikpO1xuICAgIGNvbnN0IGNoaWxkcmVuVmVjdG9yT2Zmc2V0ID0gX0ZpZWxkLmNyZWF0ZUNoaWxkcmVuVmVjdG9yKGIsIGNoaWxkT2Zmc2V0cyk7XG5cbiAgICBjb25zdCBtZXRhZGF0YU9mZnNldCA9ICEoZmllbGQubWV0YWRhdGEgJiYgZmllbGQubWV0YWRhdGEuc2l6ZSA+IDApID8gLTEgOlxuICAgICAgICBfRmllbGQuY3JlYXRlQ3VzdG9tTWV0YWRhdGFWZWN0b3IoYiwgWy4uLmZpZWxkLm1ldGFkYXRhXS5tYXAoKFtrLCB2XSkgPT4ge1xuICAgICAgICAgICAgY29uc3Qga2V5ID0gYi5jcmVhdGVTdHJpbmcoYCR7a31gKTtcbiAgICAgICAgICAgIGNvbnN0IHZhbCA9IGIuY3JlYXRlU3RyaW5nKGAke3Z9YCk7XG4gICAgICAgICAgICBfS2V5VmFsdWUuc3RhcnRLZXlWYWx1ZShiKTtcbiAgICAgICAgICAgIF9LZXlWYWx1ZS5hZGRLZXkoYiwga2V5KTtcbiAgICAgICAgICAgIF9LZXlWYWx1ZS5hZGRWYWx1ZShiLCB2YWwpO1xuICAgICAgICAgICAgcmV0dXJuIF9LZXlWYWx1ZS5lbmRLZXlWYWx1ZShiKTtcbiAgICAgICAgfSkpO1xuXG4gICAgaWYgKGZpZWxkLm5hbWUpIHtcbiAgICAgICAgbmFtZU9mZnNldCA9IGIuY3JlYXRlU3RyaW5nKGZpZWxkLm5hbWUpO1xuICAgIH1cblxuICAgIF9GaWVsZC5zdGFydEZpZWxkKGIpO1xuICAgIF9GaWVsZC5hZGRUeXBlKGIsIHR5cGVPZmZzZXQpO1xuICAgIF9GaWVsZC5hZGRUeXBlVHlwZShiLCB0eXBlSWQpO1xuICAgIF9GaWVsZC5hZGRDaGlsZHJlbihiLCBjaGlsZHJlblZlY3Rvck9mZnNldCk7XG4gICAgX0ZpZWxkLmFkZE51bGxhYmxlKGIsICEhZmllbGQubnVsbGFibGUpO1xuXG4gICAgaWYgKG5hbWVPZmZzZXQgIT09IC0xKSB7IF9GaWVsZC5hZGROYW1lKGIsIG5hbWVPZmZzZXQpOyB9XG4gICAgaWYgKGRpY3Rpb25hcnlPZmZzZXQgIT09IC0xKSB7IF9GaWVsZC5hZGREaWN0aW9uYXJ5KGIsIGRpY3Rpb25hcnlPZmZzZXQpOyB9XG4gICAgaWYgKG1ldGFkYXRhT2Zmc2V0ICE9PSAtMSkgeyBfRmllbGQuYWRkQ3VzdG9tTWV0YWRhdGEoYiwgbWV0YWRhdGFPZmZzZXQpOyB9XG5cbiAgICByZXR1cm4gX0ZpZWxkLmVuZEZpZWxkKGIpO1xufVxuXG5mdW5jdGlvbiBlbmNvZGVSZWNvcmRCYXRjaChiOiBCdWlsZGVyLCByZWNvcmRCYXRjaDogUmVjb3JkQmF0Y2gpIHtcblxuICAgIGNvbnN0IG5vZGVzID0gcmVjb3JkQmF0Y2gubm9kZXMgfHwgW107XG4gICAgY29uc3QgYnVmZmVycyA9IHJlY29yZEJhdGNoLmJ1ZmZlcnMgfHwgW107XG5cbiAgICBfUmVjb3JkQmF0Y2guc3RhcnROb2Rlc1ZlY3RvcihiLCBub2Rlcy5sZW5ndGgpO1xuICAgIG5vZGVzLnNsaWNlKCkucmV2ZXJzZSgpLmZvckVhY2goKG4pID0+IEZpZWxkTm9kZS5lbmNvZGUoYiwgbikpO1xuXG4gICAgY29uc3Qgbm9kZXNWZWN0b3JPZmZzZXQgPSBiLmVuZFZlY3RvcigpO1xuXG4gICAgX1JlY29yZEJhdGNoLnN0YXJ0QnVmZmVyc1ZlY3RvcihiLCBidWZmZXJzLmxlbmd0aCk7XG4gICAgYnVmZmVycy5zbGljZSgpLnJldmVyc2UoKS5mb3JFYWNoKChiXykgPT4gQnVmZmVyUmVnaW9uLmVuY29kZShiLCBiXykpO1xuXG4gICAgY29uc3QgYnVmZmVyc1ZlY3Rvck9mZnNldCA9IGIuZW5kVmVjdG9yKCk7XG5cbiAgICBfUmVjb3JkQmF0Y2guc3RhcnRSZWNvcmRCYXRjaChiKTtcbiAgICBfUmVjb3JkQmF0Y2guYWRkTGVuZ3RoKGIsIG5ldyBMb25nKHJlY29yZEJhdGNoLmxlbmd0aCwgMCkpO1xuICAgIF9SZWNvcmRCYXRjaC5hZGROb2RlcyhiLCBub2Rlc1ZlY3Rvck9mZnNldCk7XG4gICAgX1JlY29yZEJhdGNoLmFkZEJ1ZmZlcnMoYiwgYnVmZmVyc1ZlY3Rvck9mZnNldCk7XG4gICAgcmV0dXJuIF9SZWNvcmRCYXRjaC5lbmRSZWNvcmRCYXRjaChiKTtcbn1cblxuZnVuY3Rpb24gZW5jb2RlRGljdGlvbmFyeUJhdGNoKGI6IEJ1aWxkZXIsIGRpY3Rpb25hcnlCYXRjaDogRGljdGlvbmFyeUJhdGNoKSB7XG4gICAgY29uc3QgZGF0YU9mZnNldCA9IFJlY29yZEJhdGNoLmVuY29kZShiLCBkaWN0aW9uYXJ5QmF0Y2guZGF0YSk7XG4gICAgX0RpY3Rpb25hcnlCYXRjaC5zdGFydERpY3Rpb25hcnlCYXRjaChiKTtcbiAgICBfRGljdGlvbmFyeUJhdGNoLmFkZElkKGIsIG5ldyBMb25nKGRpY3Rpb25hcnlCYXRjaC5pZCwgMCkpO1xuICAgIF9EaWN0aW9uYXJ5QmF0Y2guYWRkSXNEZWx0YShiLCBkaWN0aW9uYXJ5QmF0Y2guaXNEZWx0YSk7XG4gICAgX0RpY3Rpb25hcnlCYXRjaC5hZGREYXRhKGIsIGRhdGFPZmZzZXQpO1xuICAgIHJldHVybiBfRGljdGlvbmFyeUJhdGNoLmVuZERpY3Rpb25hcnlCYXRjaChiKTtcbn1cblxuZnVuY3Rpb24gZW5jb2RlRmllbGROb2RlKGI6IEJ1aWxkZXIsIG5vZGU6IEZpZWxkTm9kZSkge1xuICAgIHJldHVybiBfRmllbGROb2RlLmNyZWF0ZUZpZWxkTm9kZShiLCBuZXcgTG9uZyhub2RlLmxlbmd0aCwgMCksIG5ldyBMb25nKG5vZGUubnVsbENvdW50LCAwKSk7XG59XG5cbmZ1bmN0aW9uIGVuY29kZUJ1ZmZlclJlZ2lvbihiOiBCdWlsZGVyLCBub2RlOiBCdWZmZXJSZWdpb24pIHtcbiAgICByZXR1cm4gX0J1ZmZlci5jcmVhdGVCdWZmZXIoYiwgbmV3IExvbmcobm9kZS5vZmZzZXQsIDApLCBuZXcgTG9uZyhub2RlLmxlbmd0aCwgMCkpO1xufVxuXG5jb25zdCBwbGF0Zm9ybUlzTGl0dGxlRW5kaWFuID0gKGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcigyKTtcbiAgICBuZXcgRGF0YVZpZXcoYnVmZmVyKS5zZXRJbnQxNigwLCAyNTYsIHRydWUgLyogbGl0dGxlRW5kaWFuICovKTtcbiAgICAvLyBJbnQxNkFycmF5IHVzZXMgdGhlIHBsYXRmb3JtJ3MgZW5kaWFubmVzcy5cbiAgICByZXR1cm4gbmV3IEludDE2QXJyYXkoYnVmZmVyKVswXSA9PT0gMjU2O1xufSkoKTtcblxudHlwZSBNZXNzYWdlSGVhZGVyRGVjb2RlciA9IDxUIGV4dGVuZHMgTWVzc2FnZUhlYWRlcj4oKSA9PiBUIGV4dGVuZHMgTWVzc2FnZUhlYWRlci5TY2hlbWEgPyBTY2hlbWFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogVCBleHRlbmRzIE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2ggPyBSZWNvcmRCYXRjaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBUIGV4dGVuZHMgTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2ggPyBEaWN0aW9uYXJ5QmF0Y2ggOiBuZXZlcjtcbiJdfQ==

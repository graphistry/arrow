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
        if (version < MetadataVersion.V4) {
            buffer.bb_pos += (8 * (i + 1));
        }
        return decode(buffer);
    };
}
/** @ignore */
function decodeSchemaFields(schema, dictionaries, dictionaryFields) {
    return Array.from({ length: schema.fieldsLength() }, (_, i) => schema.fields(i)).filter(Boolean).map((f) => Field.decode(f, dictionaries, dictionaryFields));
}
/** @ignore */
function decodeFieldChildren(field, dictionaries, dictionaryFields) {
    return Array.from({ length: field.childrenLength() }, (_, i) => field.children(i)).filter(Boolean).map((f) => Field.decode(f, dictionaries, dictionaryFields));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlwYy9tZXRhZGF0YS9tZXNzYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDZEQUE2RDtBQUM3RCwrREFBK0Q7QUFDL0Qsd0RBQXdEO0FBQ3hELDZEQUE2RDtBQUM3RCxvREFBb0Q7QUFDcEQsNkRBQTZEO0FBQzdELDZEQUE2RDtBQUM3RCxFQUFFO0FBQ0YsK0NBQStDO0FBQy9DLEVBQUU7QUFDRiw2REFBNkQ7QUFDN0QsOERBQThEO0FBQzlELHlEQUF5RDtBQUN6RCw0REFBNEQ7QUFDNUQsMERBQTBEO0FBQzFELHFCQUFxQjtBQUVyQixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQzFDLE9BQU8sS0FBSyxPQUFPLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxLQUFLLFFBQVEsTUFBTSxrQkFBa0IsQ0FBQztBQUU3QyxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUM3QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFakQsT0FBTyxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDNUQsT0FBTyxFQUFFLFFBQVEsSUFBSSxhQUFhLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN4RSxPQUFPLEVBQUUsYUFBYSxFQUFFLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUVyRyxJQUFPLElBQUksR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDO0FBQy9CLElBQU8sT0FBTyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUM7QUFDckMsSUFBTyxVQUFVLEdBQUcsV0FBVyxDQUFDLFVBQVUsQ0FBQztBQUUzQyxJQUFPLElBQUksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztBQUNwRCxJQUFPLE1BQU0sR0FBRyxPQUFPLENBQUMs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QUUsQ0FBQyIsImZpbGUiOiJpcGMvbWV0YWRhdGEvbWVzc2FnZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBmbGF0YnVmZmVycyB9IGZyb20gJ2ZsYXRidWZmZXJzJztcbmltcG9ydCAqIGFzIFNjaGVtYV8gZnJvbSAnLi4vLi4vZmIvU2NoZW1hJztcbmltcG9ydCAqIGFzIE1lc3NhZ2VfIGZyb20gJy4uLy4uL2ZiL01lc3NhZ2UnO1xuXG5pbXBvcnQgeyBTY2hlbWEsIEZpZWxkIH0gZnJvbSAnLi4vLi4vc2NoZW1hJztcbmltcG9ydCB7IHRvVWludDhBcnJheSB9IGZyb20gJy4uLy4uL3V0aWwvYnVmZmVyJztcbmltcG9ydCB7IEFycmF5QnVmZmVyVmlld0lucHV0IH0gZnJvbSAnLi4vLi4vdXRpbC9idWZmZXInO1xuaW1wb3J0IHsgTWVzc2FnZUhlYWRlciwgTWV0YWRhdGFWZXJzaW9uIH0gZnJvbSAnLi4vLi4vZW51bSc7XG5pbXBvcnQgeyBpbnN0YW5jZSBhcyB0eXBlQXNzZW1ibGVyIH0gZnJvbSAnLi4vLi4vdmlzaXRvci90eXBlYXNzZW1ibGVyJztcbmltcG9ydCB7IGZpZWxkRnJvbUpTT04sIHNjaGVtYUZyb21KU09OLCByZWNvcmRCYXRjaEZyb21KU09OLCBkaWN0aW9uYXJ5QmF0Y2hGcm9tSlNPTiB9IGZyb20gJy4vanNvbic7XG5cbmltcG9ydCBMb25nID0gZmxhdGJ1ZmZlcnMuTG9uZztcbmltcG9ydCBCdWlsZGVyID0gZmxhdGJ1ZmZlcnMuQnVpbGRlcjtcbmltcG9ydCBCeXRlQnVmZmVyID0gZmxhdGJ1ZmZlcnMuQnl0ZUJ1ZmZlcjtcbmltcG9ydCBfSW50ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuSW50O1xuaW1wb3J0IFR5cGUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UeXBlO1xuaW1wb3J0IF9GaWVsZCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpZWxkO1xuaW1wb3J0IF9TY2hlbWEgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5TY2hlbWE7XG5pbXBvcnQgX0J1ZmZlciA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkJ1ZmZlcjtcbmltcG9ydCBfTWVzc2FnZSA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NZXNzYWdlO1xuaW1wb3J0IF9LZXlWYWx1ZSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLktleVZhbHVlO1xuaW1wb3J0IF9GaWVsZE5vZGUgPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRmllbGROb2RlO1xuaW1wb3J0IF9FbmRpYW5uZXNzID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRW5kaWFubmVzcztcbmltcG9ydCBfUmVjb3JkQmF0Y2ggPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuUmVjb3JkQmF0Y2g7XG5pbXBvcnQgX0RpY3Rpb25hcnlCYXRjaCA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EaWN0aW9uYXJ5QmF0Y2g7XG5pbXBvcnQgX0RpY3Rpb25hcnlFbmNvZGluZyA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRpY3Rpb25hcnlFbmNvZGluZztcblxuaW1wb3J0IHtcbiAgICBEYXRhVHlwZSwgRGljdGlvbmFyeSwgVGltZUJpdFdpZHRoLFxuICAgIFV0ZjgsIEJpbmFyeSwgRGVjaW1hbCwgRml4ZWRTaXplQmluYXJ5LFxuICAgIExpc3QsIEZpeGVkU2l6ZUxpc3QsIE1hcF8sIFN0cnVjdCwgVW5pb24sXG4gICAgQm9vbCwgTnVsbCwgSW50LCBGbG9hdCwgRGF0ZV8sIFRpbWUsIEludGVydmFsLCBUaW1lc3RhbXAsIEludEJpdFdpZHRoLCBJbnQzMiwgVEtleXMsXG59IGZyb20gJy4uLy4uL3R5cGUnO1xuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIE1lc3NhZ2U8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXIgPSBhbnk+IHtcblxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbUpTT048VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KG1zZzogYW55LCBoZWFkZXJUeXBlOiBUKTogTWVzc2FnZTxUPiB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBuZXcgTWVzc2FnZSgwLCBNZXRhZGF0YVZlcnNpb24uVjQsIGhlYWRlclR5cGUpO1xuICAgICAgICBtZXNzYWdlLl9jcmVhdGVIZWFkZXIgPSBtZXNzYWdlSGVhZGVyRnJvbUpTT04obXNnLCBoZWFkZXJUeXBlKTtcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgfVxuXG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBkZWNvZGUoYnVmOiBBcnJheUJ1ZmZlclZpZXdJbnB1dCkge1xuICAgICAgICBidWYgPSBuZXcgQnl0ZUJ1ZmZlcih0b1VpbnQ4QXJyYXkoYnVmKSk7XG4gICAgICAgIGNvbnN0IF9tZXNzYWdlID0gX01lc3NhZ2UuZ2V0Um9vdEFzTWVzc2FnZShidWYpO1xuICAgICAgICBjb25zdCBib2R5TGVuZ3RoOiBMb25nID0gX21lc3NhZ2UuYm9keUxlbmd0aCgpITtcbiAgICAgICAgY29uc3QgdmVyc2lvbjogTWV0YWRhdGFWZXJzaW9uID0gX21lc3NhZ2UudmVyc2lvbigpO1xuICAgICAgICBjb25zdCBoZWFkZXJUeXBlOiBNZXNzYWdlSGVhZGVyID0gX21lc3NhZ2UuaGVhZGVyVHlwZSgpO1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gbmV3IE1lc3NhZ2UoYm9keUxlbmd0aCwgdmVyc2lvbiwgaGVhZGVyVHlwZSk7XG4gICAgICAgIG1lc3NhZ2UuX2NyZWF0ZUhlYWRlciA9IGRlY29kZU1lc3NhZ2VIZWFkZXIoX21lc3NhZ2UsIGhlYWRlclR5cGUpO1xuICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICB9XG5cbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGVuY29kZTxUIGV4dGVuZHMgTWVzc2FnZUhlYWRlcj4obWVzc2FnZTogTWVzc2FnZTxUPikge1xuICAgICAgICBsZXQgYiA9IG5ldyBCdWlsZGVyKCksIGhlYWRlck9mZnNldCA9IC0xO1xuICAgICAgICBpZiAobWVzc2FnZS5pc1NjaGVtYSgpKSB7XG4gICAgICAgICAgICBoZWFkZXJPZmZzZXQgPSBTY2hlbWEuZW5jb2RlKGIsIG1lc3NhZ2UuaGVhZGVyKCkgYXMgU2NoZW1hKTtcbiAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmlzUmVjb3JkQmF0Y2goKSkge1xuICAgICAgICAgICAgaGVhZGVyT2Zmc2V0ID0gUmVjb3JkQmF0Y2guZW5jb2RlKGIsIG1lc3NhZ2UuaGVhZGVyKCkgYXMgUmVjb3JkQmF0Y2gpO1xuICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuaXNEaWN0aW9uYXJ5QmF0Y2goKSkge1xuICAgICAgICAgICAgaGVhZGVyT2Zmc2V0ID0gRGljdGlvbmFyeUJhdGNoLmVuY29kZShiLCBtZXNzYWdlLmhlYWRlcigpIGFzIERpY3Rpb25hcnlCYXRjaCk7XG4gICAgICAgIH1cbiAgICAgICAgX01lc3NhZ2Uuc3RhcnRNZXNzYWdlKGIpO1xuICAgICAgICBfTWVzc2FnZS5hZGRWZXJzaW9uKGIsIE1ldGFkYXRhVmVyc2lvbi5WNCk7XG4gICAgICAgIF9NZXNzYWdlLmFkZEhlYWRlcihiLCBoZWFkZXJPZmZzZXQpO1xuICAgICAgICBfTWVzc2FnZS5hZGRIZWFkZXJUeXBlKGIsIG1lc3NhZ2UuaGVhZGVyVHlwZSk7XG4gICAgICAgIF9NZXNzYWdlLmFkZEJvZHlMZW5ndGgoYiwgbmV3IExvbmcobWVzc2FnZS5ib2R5TGVuZ3RoLCAwKSk7XG4gICAgICAgIF9NZXNzYWdlLmZpbmlzaE1lc3NhZ2VCdWZmZXIoYiwgX01lc3NhZ2UuZW5kTWVzc2FnZShiKSk7XG4gICAgICAgIHJldHVybiBiLmFzVWludDhBcnJheSgpO1xuICAgIH1cblxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbShoZWFkZXI6IFNjaGVtYSB8IFJlY29yZEJhdGNoIHwgRGljdGlvbmFyeUJhdGNoLCBib2R5TGVuZ3RoID0gMCkge1xuICAgICAgICBpZiAoaGVhZGVyIGluc3RhbmNlb2YgU2NoZW1hKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1lc3NhZ2UoMCwgTWV0YWRhdGFWZXJzaW9uLlY0LCBNZXNzYWdlSGVhZGVyLlNjaGVtYSwgaGVhZGVyKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGVhZGVyIGluc3RhbmNlb2YgUmVjb3JkQmF0Y2gpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgTWVzc2FnZShib2R5TGVuZ3RoLCBNZXRhZGF0YVZlcnNpb24uVjQsIE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2gsIGhlYWRlcik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhlYWRlciBpbnN0YW5jZW9mIERpY3Rpb25hcnlCYXRjaCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNZXNzYWdlKGJvZHlMZW5ndGgsIE1ldGFkYXRhVmVyc2lvbi5WNCwgTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2gsIGhlYWRlcik7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnJlY29nbml6ZWQgTWVzc2FnZSBoZWFkZXI6ICR7aGVhZGVyfWApO1xuICAgIH1cblxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgYm9keTogVWludDhBcnJheTtcbiAgICBwcm90ZWN0ZWQgX2hlYWRlclR5cGU6IFQ7XG4gICAgcHJvdGVjdGVkIF9ib2R5TGVuZ3RoOiBudW1iZXI7XG4gICAgcHJvdGVjdGVkIF92ZXJzaW9uOiBNZXRhZGF0YVZlcnNpb247XG4gICAgcHVibGljIGdldCB0eXBlKCkgeyByZXR1cm4gdGhpcy5oZWFkZXJUeXBlOyB9XG4gICAgcHVibGljIGdldCB2ZXJzaW9uKCkgeyByZXR1cm4gdGhpcy5fdmVyc2lvbjsgfVxuICAgIHB1YmxpYyBnZXQgaGVhZGVyVHlwZSgpIHsgcmV0dXJuIHRoaXMuX2hlYWRlclR5cGU7IH1cbiAgICBwdWJsaWMgZ2V0IGJvZHlMZW5ndGgoKSB7IHJldHVybiB0aGlzLl9ib2R5TGVuZ3RoOyB9XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHByb3RlY3RlZCBfY3JlYXRlSGVhZGVyOiBNZXNzYWdlSGVhZGVyRGVjb2RlcjtcbiAgICBwdWJsaWMgaGVhZGVyKCkgeyByZXR1cm4gdGhpcy5fY3JlYXRlSGVhZGVyPFQ+KCk7IH1cbiAgICBwdWJsaWMgaXNTY2hlbWEoKTogdGhpcyBpcyBNZXNzYWdlPE1lc3NhZ2VIZWFkZXIuU2NoZW1hPiB7IHJldHVybiB0aGlzLmhlYWRlclR5cGUgPT09IE1lc3NhZ2VIZWFkZXIuU2NoZW1hOyB9XG4gICAgcHVibGljIGlzUmVjb3JkQmF0Y2goKTogdGhpcyBpcyBNZXNzYWdlPE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2g+IHsgcmV0dXJuIHRoaXMuaGVhZGVyVHlwZSA9PT0gTWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaDsgfVxuICAgIHB1YmxpYyBpc0RpY3Rpb25hcnlCYXRjaCgpOiB0aGlzIGlzIE1lc3NhZ2U8TWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2g+IHsgcmV0dXJuIHRoaXMuaGVhZGVyVHlwZSA9PT0gTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2g7IH1cblxuICAgIGNvbnN0cnVjdG9yKGJvZHlMZW5ndGg6IExvbmcgfCBudW1iZXIsIHZlcnNpb246IE1ldGFkYXRhVmVyc2lvbiwgaGVhZGVyVHlwZTogVCwgaGVhZGVyPzogYW55KSB7XG4gICAgICAgIHRoaXMuX3ZlcnNpb24gPSB2ZXJzaW9uO1xuICAgICAgICB0aGlzLl9oZWFkZXJUeXBlID0gaGVhZGVyVHlwZTtcbiAgICAgICAgdGhpcy5ib2R5ID0gbmV3IFVpbnQ4QXJyYXkoMCk7XG4gICAgICAgIGhlYWRlciAmJiAodGhpcy5fY3JlYXRlSGVhZGVyID0gKCkgPT4gaGVhZGVyKTtcbiAgICAgICAgdGhpcy5fYm9keUxlbmd0aCA9IHR5cGVvZiBib2R5TGVuZ3RoID09PSAnbnVtYmVyJyA/IGJvZHlMZW5ndGggOiBib2R5TGVuZ3RoLmxvdztcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY2xhc3MgUmVjb3JkQmF0Y2gge1xuICAgIHByb3RlY3RlZCBfbGVuZ3RoOiBudW1iZXI7XG4gICAgcHJvdGVjdGVkIF9ub2RlczogRmllbGROb2RlW107XG4gICAgcHJvdGVjdGVkIF9idWZmZXJzOiBCdWZmZXJSZWdpb25bXTtcbiAgICBwdWJsaWMgZ2V0IG5vZGVzKCkgeyByZXR1cm4gdGhpcy5fbm9kZXM7IH1cbiAgICBwdWJsaWMgZ2V0IGxlbmd0aCgpIHsgcmV0dXJuIHRoaXMuX2xlbmd0aDsgfVxuICAgIHB1YmxpYyBnZXQgYnVmZmVycygpIHsgcmV0dXJuIHRoaXMuX2J1ZmZlcnM7IH1cbiAgICBjb25zdHJ1Y3RvcihsZW5ndGg6IExvbmcgfCBudW1iZXIsIG5vZGVzOiBGaWVsZE5vZGVbXSwgYnVmZmVyczogQnVmZmVyUmVnaW9uW10pIHtcbiAgICAgICAgdGhpcy5fbm9kZXMgPSBub2RlcztcbiAgICAgICAgdGhpcy5fYnVmZmVycyA9IGJ1ZmZlcnM7XG4gICAgICAgIHRoaXMuX2xlbmd0aCA9IHR5cGVvZiBsZW5ndGggPT09ICdudW1iZXInID8gbGVuZ3RoIDogbGVuZ3RoLmxvdztcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY2xhc3MgRGljdGlvbmFyeUJhdGNoIHtcblxuICAgIHByb3RlY3RlZCBfaWQ6IG51bWJlcjtcbiAgICBwcm90ZWN0ZWQgX2lzRGVsdGE6IGJvb2xlYW47XG4gICAgcHJvdGVjdGVkIF9kYXRhOiBSZWNvcmRCYXRjaDtcbiAgICBwdWJsaWMgZ2V0IGlkKCkgeyByZXR1cm4gdGhpcy5faWQ7IH1cbiAgICBwdWJsaWMgZ2V0IGRhdGEoKSB7IHJldHVybiB0aGlzLl9kYXRhOyB9XG4gICAgcHVibGljIGdldCBpc0RlbHRhKCkgeyByZXR1cm4gdGhpcy5faXNEZWx0YTsgfVxuICAgIHB1YmxpYyBnZXQgbGVuZ3RoKCk6IG51bWJlciB7IHJldHVybiB0aGlzLmRhdGEubGVuZ3RoOyB9XG4gICAgcHVibGljIGdldCBub2RlcygpOiBGaWVsZE5vZGVbXSB7IHJldHVybiB0aGlzLmRhdGEubm9kZXM7IH1cbiAgICBwdWJsaWMgZ2V0IGJ1ZmZlcnMoKTogQnVmZmVyUmVnaW9uW10geyByZXR1cm4gdGhpcy5kYXRhLmJ1ZmZlcnM7IH1cblxuICAgIGNvbnN0cnVjdG9yKGRhdGE6IFJlY29yZEJhdGNoLCBpZDogTG9uZyB8IG51bWJlciwgaXNEZWx0YTogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgICAgIHRoaXMuX2RhdGEgPSBkYXRhO1xuICAgICAgICB0aGlzLl9pc0RlbHRhID0gaXNEZWx0YTtcbiAgICAgICAgdGhpcy5faWQgPSB0eXBlb2YgaWQgPT09ICdudW1iZXInID8gaWQgOiBpZC5sb3c7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIEJ1ZmZlclJlZ2lvbiB7XG4gICAgcHVibGljIG9mZnNldDogbnVtYmVyO1xuICAgIHB1YmxpYyBsZW5ndGg6IG51bWJlcjtcbiAgICBjb25zdHJ1Y3RvcihvZmZzZXQ6IExvbmcgfCBudW1iZXIsIGxlbmd0aDogTG9uZyB8IG51bWJlcikge1xuICAgICAgICB0aGlzLm9mZnNldCA9IHR5cGVvZiBvZmZzZXQgPT09ICdudW1iZXInID8gb2Zmc2V0IDogb2Zmc2V0LmxvdztcbiAgICAgICAgdGhpcy5sZW5ndGggPSB0eXBlb2YgbGVuZ3RoID09PSAnbnVtYmVyJyA/IGxlbmd0aCA6IGxlbmd0aC5sb3c7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIEZpZWxkTm9kZSB7XG4gICAgcHVibGljIGxlbmd0aDogbnVtYmVyO1xuICAgIHB1YmxpYyBudWxsQ291bnQ6IG51bWJlcjtcbiAgICBjb25zdHJ1Y3RvcihsZW5ndGg6IExvbmcgfCBudW1iZXIsIG51bGxDb3VudDogTG9uZyB8IG51bWJlcikge1xuICAgICAgICB0aGlzLmxlbmd0aCA9IHR5cGVvZiBsZW5ndGggPT09ICdudW1iZXInID8gbGVuZ3RoIDogbGVuZ3RoLmxvdztcbiAgICAgICAgdGhpcy5udWxsQ291bnQgPSB0eXBlb2YgbnVsbENvdW50ID09PSAnbnVtYmVyJyA/IG51bGxDb3VudCA6IG51bGxDb3VudC5sb3c7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBtZXNzYWdlSGVhZGVyRnJvbUpTT04obWVzc2FnZTogYW55LCB0eXBlOiBNZXNzYWdlSGVhZGVyKSB7XG4gICAgcmV0dXJuICgoKSA9PiB7XG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLlNjaGVtYTogcmV0dXJuIFNjaGVtYS5mcm9tSlNPTihtZXNzYWdlKTtcbiAgICAgICAgICAgIGNhc2UgTWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaDogcmV0dXJuIFJlY29yZEJhdGNoLmZyb21KU09OKG1lc3NhZ2UpO1xuICAgICAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaDogcmV0dXJuIERpY3Rpb25hcnlCYXRjaC5mcm9tSlNPTihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVucmVjb2duaXplZCBNZXNzYWdlIHR5cGU6IHsgbmFtZTogJHtNZXNzYWdlSGVhZGVyW3R5cGVdfSwgdHlwZTogJHt0eXBlfSB9YCk7XG4gICAgfSkgYXMgTWVzc2FnZUhlYWRlckRlY29kZXI7XG59XG5cbmZ1bmN0aW9uIGRlY29kZU1lc3NhZ2VIZWFkZXIobWVzc2FnZTogX01lc3NhZ2UsIHR5cGU6IE1lc3NhZ2VIZWFkZXIpIHtcbiAgICByZXR1cm4gKCgpID0+IHtcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlIE1lc3NhZ2VIZWFkZXIuU2NoZW1hOiByZXR1cm4gU2NoZW1hLmRlY29kZShtZXNzYWdlLmhlYWRlcihuZXcgX1NjaGVtYSgpKSEpO1xuICAgICAgICAgICAgY2FzZSBNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoOiByZXR1cm4gUmVjb3JkQmF0Y2guZGVjb2RlKG1lc3NhZ2UuaGVhZGVyKG5ldyBfUmVjb3JkQmF0Y2goKSkhLCBtZXNzYWdlLnZlcnNpb24oKSk7XG4gICAgICAgICAgICBjYXNlIE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoOiByZXR1cm4gRGljdGlvbmFyeUJhdGNoLmRlY29kZShtZXNzYWdlLmhlYWRlcihuZXcgX0RpY3Rpb25hcnlCYXRjaCgpKSEsIG1lc3NhZ2UudmVyc2lvbigpKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVucmVjb2duaXplZCBNZXNzYWdlIHR5cGU6IHsgbmFtZTogJHtNZXNzYWdlSGVhZGVyW3R5cGVdfSwgdHlwZTogJHt0eXBlfSB9YCk7XG4gICAgfSkgYXMgTWVzc2FnZUhlYWRlckRlY29kZXI7XG59XG5cbkZpZWxkWydlbmNvZGUnXSA9IGVuY29kZUZpZWxkO1xuRmllbGRbJ2RlY29kZSddID0gZGVjb2RlRmllbGQ7XG5GaWVsZFsnZnJvbUpTT04nXSA9IGZpZWxkRnJvbUpTT047XG5cblNjaGVtYVsnZW5jb2RlJ10gPSBlbmNvZGVTY2hlbWE7XG5TY2hlbWFbJ2RlY29kZSddID0gZGVjb2RlU2NoZW1hO1xuU2NoZW1hWydmcm9tSlNPTiddID0gc2NoZW1hRnJvbUpTT047XG5cblJlY29yZEJhdGNoWydlbmNvZGUnXSA9IGVuY29kZVJlY29yZEJhdGNoO1xuUmVjb3JkQmF0Y2hbJ2RlY29kZSddID0gZGVjb2RlUmVjb3JkQmF0Y2g7XG5SZWNvcmRCYXRjaFsnZnJvbUpTT04nXSA9IHJlY29yZEJhdGNoRnJvbUpTT047XG5cbkRpY3Rpb25hcnlCYXRjaFsnZW5jb2RlJ10gPSBlbmNvZGVEaWN0aW9uYXJ5QmF0Y2g7XG5EaWN0aW9uYXJ5QmF0Y2hbJ2RlY29kZSddID0gZGVjb2RlRGljdGlvbmFyeUJhdGNoO1xuRGljdGlvbmFyeUJhdGNoWydmcm9tSlNPTiddID0gZGljdGlvbmFyeUJhdGNoRnJvbUpTT047XG5cbkZpZWxkTm9kZVsnZW5jb2RlJ10gPSBlbmNvZGVGaWVsZE5vZGU7XG5GaWVsZE5vZGVbJ2RlY29kZSddID0gZGVjb2RlRmllbGROb2RlO1xuXG5CdWZmZXJSZWdpb25bJ2VuY29kZSddID0gZW5jb2RlQnVmZmVyUmVnaW9uO1xuQnVmZmVyUmVnaW9uWydkZWNvZGUnXSA9IGRlY29kZUJ1ZmZlclJlZ2lvbjtcblxuZGVjbGFyZSBtb2R1bGUgJy4uLy4uL3NjaGVtYScge1xuICAgIG5hbWVzcGFjZSBGaWVsZCB7XG4gICAgICAgIGV4cG9ydCB7IGVuY29kZUZpZWxkIGFzIGVuY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBkZWNvZGVGaWVsZCBhcyBkZWNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgZmllbGRGcm9tSlNPTiBhcyBmcm9tSlNPTiB9O1xuICAgIH1cbiAgICBuYW1lc3BhY2UgU2NoZW1hIHtcbiAgICAgICAgZXhwb3J0IHsgZW5jb2RlU2NoZW1hIGFzIGVuY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBkZWNvZGVTY2hlbWEgYXMgZGVjb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IHNjaGVtYUZyb21KU09OIGFzIGZyb21KU09OIH07XG4gICAgfVxufVxuXG5kZWNsYXJlIG1vZHVsZSAnLi9tZXNzYWdlJyB7XG4gICAgbmFtZXNwYWNlIFJlY29yZEJhdGNoIHtcbiAgICAgICAgZXhwb3J0IHsgZW5jb2RlUmVjb3JkQmF0Y2ggYXMgZW5jb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IGRlY29kZVJlY29yZEJhdGNoIGFzIGRlY29kZSB9O1xuICAgICAgICBleHBvcnQgeyByZWNvcmRCYXRjaEZyb21KU09OIGFzIGZyb21KU09OIH07XG4gICAgfVxuICAgIG5hbWVzcGFjZSBEaWN0aW9uYXJ5QmF0Y2gge1xuICAgICAgICBleHBvcnQgeyBlbmNvZGVEaWN0aW9uYXJ5QmF0Y2ggYXMgZW5jb2RlIH07XG4gICAgICAgIGV4cG9ydCB7IGRlY29kZURpY3Rpb25hcnlCYXRjaCBhcyBkZWNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgZGljdGlvbmFyeUJhdGNoRnJvbUpTT04gYXMgZnJvbUpTT04gfTtcbiAgICB9XG4gICAgbmFtZXNwYWNlIEZpZWxkTm9kZSB7XG4gICAgICAgIGV4cG9ydCB7IGVuY29kZUZpZWxkTm9kZSBhcyBlbmNvZGUgfTtcbiAgICAgICAgZXhwb3J0IHsgZGVjb2RlRmllbGROb2RlIGFzIGRlY29kZSB9O1xuICAgIH1cbiAgICBuYW1lc3BhY2UgQnVmZmVyUmVnaW9uIHtcbiAgICAgICAgZXhwb3J0IHsgZW5jb2RlQnVmZmVyUmVnaW9uIGFzIGVuY29kZSB9O1xuICAgICAgICBleHBvcnQgeyBkZWNvZGVCdWZmZXJSZWdpb24gYXMgZGVjb2RlIH07XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZGVjb2RlU2NoZW1hKF9zY2hlbWE6IF9TY2hlbWEsIGRpY3Rpb25hcmllczogTWFwPG51bWJlciwgRGF0YVR5cGU+ID0gbmV3IE1hcCgpLCBkaWN0aW9uYXJ5RmllbGRzOiBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5PltdPiA9IG5ldyBNYXAoKSkge1xuICAgIGNvbnN0IGZpZWxkcyA9IGRlY29kZVNjaGVtYUZpZWxkcyhfc2NoZW1hLCBkaWN0aW9uYXJpZXMsIGRpY3Rpb25hcnlGaWVsZHMpO1xuICAgIHJldHVybiBuZXcgU2NoZW1hKGZpZWxkcywgZGVjb2RlQ3VzdG9tTWV0YWRhdGEoX3NjaGVtYSksIGRpY3Rpb25hcmllcywgZGljdGlvbmFyeUZpZWxkcyk7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBkZWNvZGVSZWNvcmRCYXRjaChiYXRjaDogX1JlY29yZEJhdGNoLCB2ZXJzaW9uID0gTWV0YWRhdGFWZXJzaW9uLlY0KSB7XG4gICAgcmV0dXJuIG5ldyBSZWNvcmRCYXRjaChiYXRjaC5sZW5ndGgoKSwgZGVjb2RlRmllbGROb2RlcyhiYXRjaCksIGRlY29kZUJ1ZmZlcnMoYmF0Y2gsIHZlcnNpb24pKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGRlY29kZURpY3Rpb25hcnlCYXRjaChiYXRjaDogX0RpY3Rpb25hcnlCYXRjaCwgdmVyc2lvbiA9IE1ldGFkYXRhVmVyc2lvbi5WNCkge1xuICAgIHJldHVybiBuZXcgRGljdGlvbmFyeUJhdGNoKFJlY29yZEJhdGNoLmRlY29kZShiYXRjaC5kYXRhKCkhLCB2ZXJzaW9uKSwgYmF0Y2guaWQoKSwgYmF0Y2guaXNEZWx0YSgpKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGRlY29kZUJ1ZmZlclJlZ2lvbihiOiBfQnVmZmVyKSB7XG4gICAgcmV0dXJuIG5ldyBCdWZmZXJSZWdpb24oYi5vZmZzZXQoKSwgYi5sZW5ndGgoKSk7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBkZWNvZGVGaWVsZE5vZGUoZjogX0ZpZWxkTm9kZSkge1xuICAgIHJldHVybiBuZXcgRmllbGROb2RlKGYubGVuZ3RoKCksIGYubnVsbENvdW50KCkpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZGVjb2RlRmllbGROb2RlcyhiYXRjaDogX1JlY29yZEJhdGNoKSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20oXG4gICAgICAgIHsgbGVuZ3RoOiBiYXRjaC5ub2Rlc0xlbmd0aCgpIH0sXG4gICAgICAgIChfLCBpKSA9PiBiYXRjaC5ub2RlcyhpKSFcbiAgICApLmZpbHRlcihCb29sZWFuKS5tYXAoRmllbGROb2RlLmRlY29kZSk7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBkZWNvZGVCdWZmZXJzKGJhdGNoOiBfUmVjb3JkQmF0Y2gsIHZlcnNpb246IE1ldGFkYXRhVmVyc2lvbikge1xuICAgIHJldHVybiBBcnJheS5mcm9tKFxuICAgICAgICB7IGxlbmd0aDogYmF0Y2guYnVmZmVyc0xlbmd0aCgpIH0sXG4gICAgICAgIChfLCBpKSA9PiBiYXRjaC5idWZmZXJzKGkpIVxuICAgICkuZmlsdGVyKEJvb2xlYW4pLm1hcCh2M0NvbXBhdCh2ZXJzaW9uLCBCdWZmZXJSZWdpb24uZGVjb2RlKSk7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiB2M0NvbXBhdCh2ZXJzaW9uOiBNZXRhZGF0YVZlcnNpb24sIGRlY29kZTogKGJ1ZmZlcjogX0J1ZmZlcikgPT4gQnVmZmVyUmVnaW9uKSB7XG4gICAgcmV0dXJuIChidWZmZXI6IF9CdWZmZXIsIGk6IG51bWJlcikgPT4ge1xuICAgICAgICAvLyBJZiB0aGlzIEFycm93IGJ1ZmZlciB3YXMgd3JpdHRlbiBiZWZvcmUgdmVyc2lvbiA0LFxuICAgICAgICAvLyBhZHZhbmNlIHRoZSBidWZmZXIncyBiYl9wb3MgOCBieXRlcyB0byBza2lwIHBhc3RcbiAgICAgICAgLy8gdGhlIG5vdy1yZW1vdmVkIHBhZ2VfaWQgZmllbGRcbiAgICAgICAgaWYgKHZlcnNpb24gPCBNZXRhZGF0YVZlcnNpb24uVjQpIHtcbiAgICAgICAgICAgIGJ1ZmZlci5iYl9wb3MgKz0gKDggKiAoaSArIDEpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGVjb2RlKGJ1ZmZlcik7XG4gICAgfTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGRlY29kZVNjaGVtYUZpZWxkcyhzY2hlbWE6IF9TY2hlbWEsIGRpY3Rpb25hcmllcz86IE1hcDxudW1iZXIsIERhdGFUeXBlPiwgZGljdGlvbmFyeUZpZWxkcz86IE1hcDxudW1iZXIsIEZpZWxkPERpY3Rpb25hcnk+W10+KSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20oXG4gICAgICAgIHsgbGVuZ3RoOiBzY2hlbWEuZmllbGRzTGVuZ3RoKCkgfSxcbiAgICAgICAgKF8sIGkpID0+IHNjaGVtYS5maWVsZHMoaSkhXG4gICAgKS5maWx0ZXIoQm9vbGVhbikubWFwKChmKSA9PiBGaWVsZC5kZWNvZGUoZiwgZGljdGlvbmFyaWVzLCBkaWN0aW9uYXJ5RmllbGRzKSk7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBkZWNvZGVGaWVsZENoaWxkcmVuKGZpZWxkOiBfRmllbGQsIGRpY3Rpb25hcmllcz86IE1hcDxudW1iZXIsIERhdGFUeXBlPiwgZGljdGlvbmFyeUZpZWxkcz86IE1hcDxudW1iZXIsIEZpZWxkPERpY3Rpb25hcnk+W10+KTogRmllbGRbXSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20oXG4gICAgICAgIHsgbGVuZ3RoOiBmaWVsZC5jaGlsZHJlbkxlbmd0aCgpIH0sXG4gICAgICAgIChfLCBpKSA9PiBmaWVsZC5jaGlsZHJlbihpKSFcbiAgICApLmZpbHRlcihCb29sZWFuKS5tYXAoKGYpID0+IEZpZWxkLmRlY29kZShmLCBkaWN0aW9uYXJpZXMsIGRpY3Rpb25hcnlGaWVsZHMpKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGRlY29kZUZpZWxkKGY6IF9GaWVsZCwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgRGF0YVR5cGU+LCBkaWN0aW9uYXJ5RmllbGRzPzogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeT5bXT4pIHtcblxuICAgIGxldCBpZDogbnVtYmVyO1xuICAgIGxldCBmaWVsZDogRmllbGQgfCB2b2lkO1xuICAgIGxldCB0eXBlOiBEYXRhVHlwZTxhbnk+O1xuICAgIGxldCBrZXlzOiBfSW50IHwgVEtleXMgfCBudWxsO1xuICAgIGxldCBkaWN0VHlwZTogRGljdGlvbmFyeTtcbiAgICBsZXQgZGljdE1ldGE6IF9EaWN0aW9uYXJ5RW5jb2RpbmcgfCBudWxsO1xuICAgIGxldCBkaWN0RmllbGQ6IEZpZWxkPERpY3Rpb25hcnk+O1xuXG4gICAgLy8gSWYgbm8gZGljdGlvbmFyeSBlbmNvZGluZywgb3IgaW4gdGhlIHByb2Nlc3Mgb2YgZGVjb2RpbmcgdGhlIGNoaWxkcmVuIG9mIGEgZGljdGlvbmFyeS1lbmNvZGVkIGZpZWxkXG4gICAgaWYgKCFkaWN0aW9uYXJpZXMgfHwgIWRpY3Rpb25hcnlGaWVsZHMgfHwgIShkaWN0TWV0YSA9IGYuZGljdGlvbmFyeSgpKSkge1xuICAgICAgICB0eXBlID0gZGVjb2RlRmllbGRUeXBlKGYsIGRlY29kZUZpZWxkQ2hpbGRyZW4oZiwgZGljdGlvbmFyaWVzLCBkaWN0aW9uYXJ5RmllbGRzKSk7XG4gICAgICAgIGZpZWxkID0gbmV3IEZpZWxkKGYubmFtZSgpISwgdHlwZSwgZi5udWxsYWJsZSgpLCBkZWNvZGVDdXN0b21NZXRhZGF0YShmKSk7XG4gICAgfVxuICAgIC8vIHRzbGludDpkaXNhYmxlXG4gICAgLy8gSWYgZGljdGlvbmFyeSBlbmNvZGVkIGFuZCB0aGUgZmlyc3QgdGltZSB3ZSd2ZSBzZWVuIHRoaXMgZGljdGlvbmFyeSBpZCwgZGVjb2RlXG4gICAgLy8gdGhlIGRhdGEgdHlwZSBhbmQgY2hpbGQgZmllbGRzLCB0aGVuIHdyYXAgaW4gYSBEaWN0aW9uYXJ5IHR5cGUgYW5kIGluc2VydCB0aGVcbiAgICAvLyBkYXRhIHR5cGUgaW50byB0aGUgZGljdGlvbmFyeSB0eXBlcyBtYXAuXG4gICAgZWxzZSBpZiAoIWRpY3Rpb25hcmllcy5oYXMoaWQgPSBkaWN0TWV0YS5pZCgpLmxvdykpIHtcbiAgICAgICAgLy8gYSBkaWN0aW9uYXJ5IGluZGV4IGRlZmF1bHRzIHRvIHNpZ25lZCAzMiBiaXQgaW50IGlmIHVuc3BlY2lmaWVkXG4gICAgICAgIGtleXMgPSAoa2V5cyA9IGRpY3RNZXRhLmluZGV4VHlwZSgpKSA/IGRlY29kZUluZGV4VHlwZShrZXlzKSBhcyBUS2V5cyA6IG5ldyBJbnQzMigpO1xuICAgICAgICBkaWN0aW9uYXJpZXMuc2V0KGlkLCB0eXBlID0gZGVjb2RlRmllbGRUeXBlKGYsIGRlY29kZUZpZWxkQ2hpbGRyZW4oZikpKTtcbiAgICAgICAgZGljdFR5cGUgPSBuZXcgRGljdGlvbmFyeSh0eXBlLCBrZXlzLCBpZCwgZGljdE1ldGEuaXNPcmRlcmVkKCkpO1xuICAgICAgICBkaWN0RmllbGQgPSBuZXcgRmllbGQoZi5uYW1lKCkhLCBkaWN0VHlwZSwgZi5udWxsYWJsZSgpLCBkZWNvZGVDdXN0b21NZXRhZGF0YShmKSk7XG4gICAgICAgIGRpY3Rpb25hcnlGaWVsZHMuc2V0KGlkLCBbZmllbGQgPSBkaWN0RmllbGRdKTtcbiAgICB9XG4gICAgLy8gSWYgZGljdGlvbmFyeSBlbmNvZGVkLCBhbmQgaGF2ZSBhbHJlYWR5IHNlZW4gdGhpcyBkaWN0aW9uYXJ5IElkIGluIHRoZSBzY2hlbWEsIHRoZW4gcmV1c2UgdGhlXG4gICAgLy8gZGF0YSB0eXBlIGFuZCB3cmFwIGluIGEgbmV3IERpY3Rpb25hcnkgdHlwZSBhbmQgZmllbGQuXG4gICAgZWxzZSB7XG4gICAgICAgIC8vIGEgZGljdGlvbmFyeSBpbmRleCBkZWZhdWx0cyB0byBzaWduZWQgMzIgYml0IGludCBpZiB1bnNwZWNpZmllZFxuICAgICAgICBrZXlzID0gKGtleXMgPSBkaWN0TWV0YS5pbmRleFR5cGUoKSkgPyBkZWNvZGVJbmRleFR5cGUoa2V5cykgYXMgVEtleXMgOiBuZXcgSW50MzIoKTtcbiAgICAgICAgZGljdFR5cGUgPSBuZXcgRGljdGlvbmFyeShkaWN0aW9uYXJpZXMuZ2V0KGlkKSEsIGtleXMsIGlkLCBkaWN0TWV0YS5pc09yZGVyZWQoKSk7XG4gICAgICAgIGRpY3RGaWVsZCA9IG5ldyBGaWVsZChmLm5hbWUoKSEsIGRpY3RUeXBlLCBmLm51bGxhYmxlKCksIGRlY29kZUN1c3RvbU1ldGFkYXRhKGYpKTtcbiAgICAgICAgZGljdGlvbmFyeUZpZWxkcy5nZXQoaWQpIS5wdXNoKGZpZWxkID0gZGljdEZpZWxkKTtcbiAgICB9XG4gICAgcmV0dXJuIGZpZWxkIHx8IG51bGw7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBkZWNvZGVDdXN0b21NZXRhZGF0YShwYXJlbnQ/OiBfU2NoZW1hIHwgX0ZpZWxkIHwgbnVsbCkge1xuICAgIGNvbnN0IGRhdGEgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgZm9yIChsZXQgZW50cnksIGtleSwgaSA9IC0xLCBuID0gcGFyZW50LmN1c3RvbU1ldGFkYXRhTGVuZ3RoKCkgfCAwOyArK2kgPCBuOykge1xuICAgICAgICAgICAgaWYgKChlbnRyeSA9IHBhcmVudC5jdXN0b21NZXRhZGF0YShpKSkgJiYgKGtleSA9IGVudHJ5LmtleSgpKSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZGF0YS5zZXQoa2V5LCBlbnRyeS52YWx1ZSgpISk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRhdGE7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBkZWNvZGVJbmRleFR5cGUoX3R5cGU6IF9JbnQpIHtcbiAgICByZXR1cm4gbmV3IEludChfdHlwZS5pc1NpZ25lZCgpLCBfdHlwZS5iaXRXaWR0aCgpIGFzIEludEJpdFdpZHRoKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGRlY29kZUZpZWxkVHlwZShmOiBfRmllbGQsIGNoaWxkcmVuPzogRmllbGRbXSk6IERhdGFUeXBlPGFueT4ge1xuXG4gICAgY29uc3QgdHlwZUlkID0gZi50eXBlVHlwZSgpO1xuXG4gICAgc3dpdGNoICh0eXBlSWQpIHtcbiAgICAgICAgY2FzZSBUeXBlLk5PTkU6ICAgIHJldHVybiBuZXcgRGF0YVR5cGUoKTtcbiAgICAgICAgY2FzZSBUeXBlLk51bGw6ICAgIHJldHVybiBuZXcgTnVsbCgpO1xuICAgICAgICBjYXNlIFR5cGUuQmluYXJ5OiAgcmV0dXJuIG5ldyBCaW5hcnkoKTtcbiAgICAgICAgY2FzZSBUeXBlLlV0Zjg6ICAgIHJldHVybiBuZXcgVXRmOCgpO1xuICAgICAgICBjYXNlIFR5cGUuQm9vbDogICAgcmV0dXJuIG5ldyBCb29sKCk7XG4gICAgICAgIGNhc2UgVHlwZS5MaXN0OiAgICByZXR1cm4gbmV3IExpc3QoKGNoaWxkcmVuIHx8IFtdKVswXSk7XG4gICAgICAgIGNhc2UgVHlwZS5TdHJ1Y3RfOiByZXR1cm4gbmV3IFN0cnVjdChjaGlsZHJlbiB8fCBbXSk7XG4gICAgfVxuXG4gICAgc3dpdGNoICh0eXBlSWQpIHtcbiAgICAgICAgY2FzZSBUeXBlLkludDoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuSW50KCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgSW50KHQuaXNTaWduZWQoKSwgdC5iaXRXaWR0aCgpKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFR5cGUuRmxvYXRpbmdQb2ludDoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRmxvYXRpbmdQb2ludCgpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEZsb2F0KHQucHJlY2lzaW9uKCkpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5EZWNpbWFsOiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EZWNpbWFsKCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRGVjaW1hbCh0LnNjYWxlKCksIHQucHJlY2lzaW9uKCkpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5EYXRlOiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EYXRlKCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRGF0ZV8odC51bml0KCkpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5UaW1lOiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UaW1lKCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgVGltZSh0LnVuaXQoKSwgdC5iaXRXaWR0aCgpIGFzIFRpbWVCaXRXaWR0aCk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLlRpbWVzdGFtcDoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVGltZXN0YW1wKCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgVGltZXN0YW1wKHQudW5pdCgpLCB0LnRpbWV6b25lKCkpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5JbnRlcnZhbDoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuSW50ZXJ2YWwoKSkhO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBJbnRlcnZhbCh0LnVuaXQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLlVuaW9uOiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5VbmlvbigpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFVuaW9uKHQubW9kZSgpLCB0LnR5cGVJZHNBcnJheSgpIHx8IFtdLCBjaGlsZHJlbiB8fCBbXSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBUeXBlLkZpeGVkU2l6ZUJpbmFyeToge1xuICAgICAgICAgICAgY29uc3QgdCA9IGYudHlwZShuZXcgU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRml4ZWRTaXplQmluYXJ5KCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRml4ZWRTaXplQmluYXJ5KHQuYnl0ZVdpZHRoKCkpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5GaXhlZFNpemVMaXN0OiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZi50eXBlKG5ldyBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaXhlZFNpemVMaXN0KCkpITtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRml4ZWRTaXplTGlzdCh0Lmxpc3RTaXplKCksIChjaGlsZHJlbiB8fCBbXSlbMF0pO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZS5NYXA6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmLnR5cGUobmV3IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk1hcCgpKSE7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1hcF8oY2hpbGRyZW4gfHwgW10sIHQua2V5c1NvcnRlZCgpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVucmVjb2duaXplZCB0eXBlOiBcIiR7VHlwZVt0eXBlSWRdfVwiICgke3R5cGVJZH0pYCk7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBlbmNvZGVTY2hlbWEoYjogQnVpbGRlciwgc2NoZW1hOiBTY2hlbWEpIHtcblxuICAgIGNvbnN0IGZpZWxkT2Zmc2V0cyA9IHNjaGVtYS5maWVsZHMubWFwKChmKSA9PiBGaWVsZC5lbmNvZGUoYiwgZikpO1xuXG4gICAgX1NjaGVtYS5zdGFydEZpZWxkc1ZlY3RvcihiLCBmaWVsZE9mZnNldHMubGVuZ3RoKTtcblxuICAgIGNvbnN0IGZpZWxkc1ZlY3Rvck9mZnNldCA9IF9TY2hlbWEuY3JlYXRlRmllbGRzVmVjdG9yKGIsIGZpZWxkT2Zmc2V0cyk7XG5cbiAgICBjb25zdCBtZXRhZGF0YU9mZnNldCA9ICEoc2NoZW1hLm1ldGFkYXRhICYmIHNjaGVtYS5tZXRhZGF0YS5zaXplID4gMCkgPyAtMSA6XG4gICAgICAgIF9TY2hlbWEuY3JlYXRlQ3VzdG9tTWV0YWRhdGFWZWN0b3IoYiwgWy4uLnNjaGVtYS5tZXRhZGF0YV0ubWFwKChbaywgdl0pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IGIuY3JlYXRlU3RyaW5nKGAke2t9YCk7XG4gICAgICAgICAgICBjb25zdCB2YWwgPSBiLmNyZWF0ZVN0cmluZyhgJHt2fWApO1xuICAgICAgICAgICAgX0tleVZhbHVlLnN0YXJ0S2V5VmFsdWUoYik7XG4gICAgICAgICAgICBfS2V5VmFsdWUuYWRkS2V5KGIsIGtleSk7XG4gICAgICAgICAgICBfS2V5VmFsdWUuYWRkVmFsdWUoYiwgdmFsKTtcbiAgICAgICAgICAgIHJldHVybiBfS2V5VmFsdWUuZW5kS2V5VmFsdWUoYik7XG4gICAgICAgIH0pKTtcblxuICAgIF9TY2hlbWEuc3RhcnRTY2hlbWEoYik7XG4gICAgX1NjaGVtYS5hZGRGaWVsZHMoYiwgZmllbGRzVmVjdG9yT2Zmc2V0KTtcbiAgICBfU2NoZW1hLmFkZEVuZGlhbm5lc3MoYiwgcGxhdGZvcm1Jc0xpdHRsZUVuZGlhbiA/IF9FbmRpYW5uZXNzLkxpdHRsZSA6IF9FbmRpYW5uZXNzLkJpZyk7XG5cbiAgICBpZiAobWV0YWRhdGFPZmZzZXQgIT09IC0xKSB7IF9TY2hlbWEuYWRkQ3VzdG9tTWV0YWRhdGEoYiwgbWV0YWRhdGFPZmZzZXQpOyB9XG5cbiAgICByZXR1cm4gX1NjaGVtYS5lbmRTY2hlbWEoYik7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBlbmNvZGVGaWVsZChiOiBCdWlsZGVyLCBmaWVsZDogRmllbGQpIHtcblxuICAgIGxldCBuYW1lT2Zmc2V0ID0gLTE7XG4gICAgbGV0IHR5cGVPZmZzZXQgPSAtMTtcbiAgICBsZXQgZGljdGlvbmFyeU9mZnNldCA9IC0xO1xuXG4gICAgbGV0IHR5cGUgPSBmaWVsZC50eXBlO1xuICAgIGxldCB0eXBlSWQ6IFR5cGUgPSA8YW55PiBmaWVsZC50eXBlSWQ7XG5cbiAgICBpZiAoIURhdGFUeXBlLmlzRGljdGlvbmFyeSh0eXBlKSkge1xuICAgICAgICB0eXBlT2Zmc2V0ID0gdHlwZUFzc2VtYmxlci52aXNpdCh0eXBlLCBiKSE7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdHlwZUlkID0gdHlwZS5kaWN0aW9uYXJ5LnR5cGVJZDtcbiAgICAgICAgZGljdGlvbmFyeU9mZnNldCA9IHR5cGVBc3NlbWJsZXIudmlzaXQodHlwZSwgYikhO1xuICAgICAgICB0eXBlT2Zmc2V0ID0gdHlwZUFzc2VtYmxlci52aXNpdCh0eXBlLmRpY3Rpb25hcnksIGIpITtcbiAgICB9XG5cbiAgICBjb25zdCBjaGlsZE9mZnNldHMgPSAodHlwZS5jaGlsZHJlbiB8fCBbXSkubWFwKChmOiBGaWVsZCkgPT4gRmllbGQuZW5jb2RlKGIsIGYpKTtcbiAgICBjb25zdCBjaGlsZHJlblZlY3Rvck9mZnNldCA9IF9GaWVsZC5jcmVhdGVDaGlsZHJlblZlY3RvcihiLCBjaGlsZE9mZnNldHMpO1xuXG4gICAgY29uc3QgbWV0YWRhdGFPZmZzZXQgPSAhKGZpZWxkLm1ldGFkYXRhICYmIGZpZWxkLm1ldGFkYXRhLnNpemUgPiAwKSA/IC0xIDpcbiAgICAgICAgX0ZpZWxkLmNyZWF0ZUN1c3RvbU1ldGFkYXRhVmVjdG9yKGIsIFsuLi5maWVsZC5tZXRhZGF0YV0ubWFwKChbaywgdl0pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IGIuY3JlYXRlU3RyaW5nKGAke2t9YCk7XG4gICAgICAgICAgICBjb25zdCB2YWwgPSBiLmNyZWF0ZVN0cmluZyhgJHt2fWApO1xuICAgICAgICAgICAgX0tleVZhbHVlLnN0YXJ0S2V5VmFsdWUoYik7XG4gICAgICAgICAgICBfS2V5VmFsdWUuYWRkS2V5KGIsIGtleSk7XG4gICAgICAgICAgICBfS2V5VmFsdWUuYWRkVmFsdWUoYiwgdmFsKTtcbiAgICAgICAgICAgIHJldHVybiBfS2V5VmFsdWUuZW5kS2V5VmFsdWUoYik7XG4gICAgICAgIH0pKTtcblxuICAgIGlmIChmaWVsZC5uYW1lKSB7XG4gICAgICAgIG5hbWVPZmZzZXQgPSBiLmNyZWF0ZVN0cmluZyhmaWVsZC5uYW1lKTtcbiAgICB9XG5cbiAgICBfRmllbGQuc3RhcnRGaWVsZChiKTtcbiAgICBfRmllbGQuYWRkVHlwZShiLCB0eXBlT2Zmc2V0KTtcbiAgICBfRmllbGQuYWRkVHlwZVR5cGUoYiwgdHlwZUlkKTtcbiAgICBfRmllbGQuYWRkQ2hpbGRyZW4oYiwgY2hpbGRyZW5WZWN0b3JPZmZzZXQpO1xuICAgIF9GaWVsZC5hZGROdWxsYWJsZShiLCAhIWZpZWxkLm51bGxhYmxlKTtcblxuICAgIGlmIChuYW1lT2Zmc2V0ICE9PSAtMSkgeyBfRmllbGQuYWRkTmFtZShiLCBuYW1lT2Zmc2V0KTsgfVxuICAgIGlmIChkaWN0aW9uYXJ5T2Zmc2V0ICE9PSAtMSkgeyBfRmllbGQuYWRkRGljdGlvbmFyeShiLCBkaWN0aW9uYXJ5T2Zmc2V0KTsgfVxuICAgIGlmIChtZXRhZGF0YU9mZnNldCAhPT0gLTEpIHsgX0ZpZWxkLmFkZEN1c3RvbU1ldGFkYXRhKGIsIG1ldGFkYXRhT2Zmc2V0KTsgfVxuXG4gICAgcmV0dXJuIF9GaWVsZC5lbmRGaWVsZChiKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGVuY29kZVJlY29yZEJhdGNoKGI6IEJ1aWxkZXIsIHJlY29yZEJhdGNoOiBSZWNvcmRCYXRjaCkge1xuXG4gICAgY29uc3Qgbm9kZXMgPSByZWNvcmRCYXRjaC5ub2RlcyB8fCBbXTtcbiAgICBjb25zdCBidWZmZXJzID0gcmVjb3JkQmF0Y2guYnVmZmVycyB8fCBbXTtcblxuICAgIF9SZWNvcmRCYXRjaC5zdGFydE5vZGVzVmVjdG9yKGIsIG5vZGVzLmxlbmd0aCk7XG4gICAgbm9kZXMuc2xpY2UoKS5yZXZlcnNlKCkuZm9yRWFjaCgobikgPT4gRmllbGROb2RlLmVuY29kZShiLCBuKSk7XG5cbiAgICBjb25zdCBub2Rlc1ZlY3Rvck9mZnNldCA9IGIuZW5kVmVjdG9yKCk7XG5cbiAgICBfUmVjb3JkQmF0Y2guc3RhcnRCdWZmZXJzVmVjdG9yKGIsIGJ1ZmZlcnMubGVuZ3RoKTtcbiAgICBidWZmZXJzLnNsaWNlKCkucmV2ZXJzZSgpLmZvckVhY2goKGJfKSA9PiBCdWZmZXJSZWdpb24uZW5jb2RlKGIsIGJfKSk7XG5cbiAgICBjb25zdCBidWZmZXJzVmVjdG9yT2Zmc2V0ID0gYi5lbmRWZWN0b3IoKTtcblxuICAgIF9SZWNvcmRCYXRjaC5zdGFydFJlY29yZEJhdGNoKGIpO1xuICAgIF9SZWNvcmRCYXRjaC5hZGRMZW5ndGgoYiwgbmV3IExvbmcocmVjb3JkQmF0Y2gubGVuZ3RoLCAwKSk7XG4gICAgX1JlY29yZEJhdGNoLmFkZE5vZGVzKGIsIG5vZGVzVmVjdG9yT2Zmc2V0KTtcbiAgICBfUmVjb3JkQmF0Y2guYWRkQnVmZmVycyhiLCBidWZmZXJzVmVjdG9yT2Zmc2V0KTtcbiAgICByZXR1cm4gX1JlY29yZEJhdGNoLmVuZFJlY29yZEJhdGNoKGIpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZW5jb2RlRGljdGlvbmFyeUJhdGNoKGI6IEJ1aWxkZXIsIGRpY3Rpb25hcnlCYXRjaDogRGljdGlvbmFyeUJhdGNoKSB7XG4gICAgY29uc3QgZGF0YU9mZnNldCA9IFJlY29yZEJhdGNoLmVuY29kZShiLCBkaWN0aW9uYXJ5QmF0Y2guZGF0YSk7XG4gICAgX0RpY3Rpb25hcnlCYXRjaC5zdGFydERpY3Rpb25hcnlCYXRjaChiKTtcbiAgICBfRGljdGlvbmFyeUJhdGNoLmFkZElkKGIsIG5ldyBMb25nKGRpY3Rpb25hcnlCYXRjaC5pZCwgMCkpO1xuICAgIF9EaWN0aW9uYXJ5QmF0Y2guYWRkSXNEZWx0YShiLCBkaWN0aW9uYXJ5QmF0Y2guaXNEZWx0YSk7XG4gICAgX0RpY3Rpb25hcnlCYXRjaC5hZGREYXRhKGIsIGRhdGFPZmZzZXQpO1xuICAgIHJldHVybiBfRGljdGlvbmFyeUJhdGNoLmVuZERpY3Rpb25hcnlCYXRjaChiKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGVuY29kZUZpZWxkTm9kZShiOiBCdWlsZGVyLCBub2RlOiBGaWVsZE5vZGUpIHtcbiAgICByZXR1cm4gX0ZpZWxkTm9kZS5jcmVhdGVGaWVsZE5vZGUoYiwgbmV3IExvbmcobm9kZS5sZW5ndGgsIDApLCBuZXcgTG9uZyhub2RlLm51bGxDb3VudCwgMCkpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZW5jb2RlQnVmZmVyUmVnaW9uKGI6IEJ1aWxkZXIsIG5vZGU6IEJ1ZmZlclJlZ2lvbikge1xuICAgIHJldHVybiBfQnVmZmVyLmNyZWF0ZUJ1ZmZlcihiLCBuZXcgTG9uZyhub2RlLm9mZnNldCwgMCksIG5ldyBMb25nKG5vZGUubGVuZ3RoLCAwKSk7XG59XG5cbi8qKiBAaWdub3JlICovXG5jb25zdCBwbGF0Zm9ybUlzTGl0dGxlRW5kaWFuID0gKGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcigyKTtcbiAgICBuZXcgRGF0YVZpZXcoYnVmZmVyKS5zZXRJbnQxNigwLCAyNTYsIHRydWUgLyogbGl0dGxlRW5kaWFuICovKTtcbiAgICAvLyBJbnQxNkFycmF5IHVzZXMgdGhlIHBsYXRmb3JtJ3MgZW5kaWFubmVzcy5cbiAgICByZXR1cm4gbmV3IEludDE2QXJyYXkoYnVmZmVyKVswXSA9PT0gMjU2O1xufSkoKTtcblxuLyoqIEBpZ25vcmUgKi9cbnR5cGUgTWVzc2FnZUhlYWRlckRlY29kZXIgPSA8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KCkgPT4gVCBleHRlbmRzIE1lc3NhZ2VIZWFkZXIuU2NoZW1hID8gU2NoZW1hXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoID8gUmVjb3JkQmF0Y2hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogVCBleHRlbmRzIE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoID8gRGljdGlvbmFyeUJhdGNoIDogbmV2ZXI7XG4iXX0=

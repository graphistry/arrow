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
const recordbatch_1 = require("../../recordbatch");
const visitor_1 = require("../../visitor");
const magic_1 = require("../magic");
const bit_1 = require("../../util/bit");
const metadata_1 = require("../metadata");
const type_1 = require("../../type");
function* serializeStream(table) {
    yield serializeMessage(table.schema).buffer;
    for (const [id, field] of table.schema.dictionaries) {
        const vec = table.getColumn(field.name);
        if (vec && vec.dictionary) {
            yield serializeDictionaryBatch(vec.dictionary, id).buffer;
        }
    }
    for (const recordBatch of table.batches) {
        yield serializeRecordBatch(recordBatch).buffer;
    }
}
exports.serializeStream = serializeStream;
function* serializeFile(table) {
    const recordBatches = [];
    const dictionaryBatches = [];
    // First yield the magic string (aligned)
    let buffer = new Uint8Array(bit_1.align(magic_1.magicLength, 8));
    let metadataLength, bodyLength, byteLength = buffer.byteLength;
    buffer.set(magic_1.MAGIC, 0);
    yield buffer;
    // Then yield the schema
    ({ metadataLength, buffer } = serializeMessage(table.schema));
    byteLength += buffer.byteLength;
    yield buffer;
    for (const [id, field] of table.schema.dictionaries) {
        const vec = table.getColumn(field.name);
        if (vec && vec.dictionary) {
            ({ metadataLength, bodyLength, buffer } = serializeDictionaryBatch(vec.dictionary, id));
            dictionaryBatches.push(new metadata_1.FileBlock(metadataLength, bodyLength, byteLength));
            byteLength += buffer.byteLength;
            yield buffer;
        }
    }
    for (const recordBatch of table.batches) {
        ({ metadataLength, bodyLength, buffer } = serializeRecordBatch(recordBatch));
        recordBatches.push(new metadata_1.FileBlock(metadataLength, bodyLength, byteLength));
        byteLength += buffer.byteLength;
        yield buffer;
    }
    // Then yield the footer metadata (not aligned)
    ({ metadataLength, buffer } = serializeFooter(new metadata_1.Footer(dictionaryBatches, recordBatches, table.schema)));
    yield buffer;
    // Last, yield the footer length + terminating magic arrow string (aligned)
    buffer = new Uint8Array(magic_1.magicAndPadding);
    new DataView(buffer.buffer).setInt32(0, metadataLength, platformIsLittleEndian);
    buffer.set(magic_1.MAGIC, buffer.byteLength - magic_1.magicLength);
    yield buffer;
}
exports.serializeFile = serializeFile;
function serializeRecordBatch(recordBatch) {
    const { byteLength, fieldNodes, buffers, buffersMeta } = new RecordBatchSerializer().visitRecordBatch(recordBatch);
    const rbMeta = new metadata_1.RecordBatchMetadata(type_1.MetadataVersion.V4, recordBatch.length, fieldNodes, buffersMeta);
    const rbData = concatBuffersWithMetadata(byteLength, buffers, buffersMeta);
    return serializeMessage(rbMeta, rbData);
}
exports.serializeRecordBatch = serializeRecordBatch;
function serializeDictionaryBatch(dictionary, id, isDelta = false) {
    const { byteLength, fieldNodes, buffers, buffersMeta } = new RecordBatchSerializer().visitRecordBatch(recordbatch_1.RecordBatch.from([dictionary]));
    const rbMeta = new metadata_1.RecordBatchMetadata(type_1.MetadataVersion.V4, dictionary.length, fieldNodes, buffersMeta);
    const dbMeta = new metadata_1.DictionaryBatch(type_1.MetadataVersion.V4, rbMeta, id, isDelta);
    const rbData = concatBuffersWithMetadata(byteLength, buffers, buffersMeta);
    return serializeMessage(dbMeta, rbData);
}
exports.serializeDictionaryBatch = serializeDictionaryBatch;
function serializeMessage(message, data) {
    const b = new Builder();
    _Message.finishMessageBuffer(b, writeMessage(b, message));
    // Slice out the buffer that contains the message metadata
    const metadataBytes = b.asUint8Array();
    // Reserve 4 bytes for writing the message size at the front.
    // Metadata length includes the metadata byteLength + the 4
    // bytes for the length, and rounded up to the nearest 8 bytes.
    const metadataLength = bit_1.align(magic_1.PADDING + metadataBytes.byteLength, 8);
    // + the length of the optional data buffer at the end, padded
    const dataByteLength = data ? data.byteLength : 0;
    // ensure the entire message is aligned to an 8-byte boundary
    const messageBytes = new Uint8Array(bit_1.align(metadataLength + dataByteLength, 8));
    // Write the metadata length into the first 4 bytes, but subtract the
    // bytes we use to hold the length itself.
    new DataView(messageBytes.buffer).setInt32(0, metadataLength - magic_1.PADDING, platformIsLittleEndian);
    // Copy the metadata bytes into the message buffer
    messageBytes.set(metadataBytes, magic_1.PADDING);
    // Copy the optional data buffer after the metadata bytes
    (data && dataByteLength > 0) && messageBytes.set(data, metadataLength);
    // if (messageBytes.byteLength % 8 !== 0) { debugger; }
    // Return the metadata length because we need to write it into each FileBlock also
    return { metadataLength, bodyLength: message.bodyLength, buffer: messageBytes };
}
exports.serializeMessage = serializeMessage;
function serializeFooter(footer) {
    const b = new Builder();
    _Footer.finishFooterBuffer(b, writeFooter(b, footer));
    // Slice out the buffer that contains the footer metadata
    const footerBytes = b.asUint8Array();
    const metadataLength = footerBytes.byteLength;
    return { metadataLength, buffer: footerBytes };
}
exports.serializeFooter = serializeFooter;
class RecordBatchSerializer extends visitor_1.VectorVisitor {
    constructor() {
        super(...arguments);
        this.byteLength = 0;
        this.buffers = [];
        this.fieldNodes = [];
        this.buffersMeta = [];
    }
    visitRecordBatch(recordBatch) {
        this.buffers = [];
        this.byteLength = 0;
        this.fieldNodes = [];
        this.buffersMeta = [];
        for (let vector, index = -1, numCols = recordBatch.numCols; ++index < numCols;) {
            if (vector = recordBatch.getChildAt(index)) {
                this.visit(vector);
            }
        }
        return this;
    }
    visit(vector) {
        if (!type_1.DataType.isDictionary(vector.type)) {
            const { data, length, nullCount } = vector;
            if (length > 2147483647) {
                throw new RangeError('Cannot write arrays larger than 2^31 - 1 in length');
            }
            this.fieldNodes.push(new metadata_1.FieldMetadata(length, nullCount));
            this.addBuffer(nullCount <= 0
                ? new Uint8Array(0) // placeholder validity buffer
                : this.getTruncatedBitmap(data.offset, length, data.nullBitmap));
        }
        return super.visit(vector);
    }
    visitNull(_nullz) { return this; }
    visitBool(vector) { return this.visitBoolVector(vector); }
    visitInt(vector) { return this.visitFlatVector(vector); }
    visitFloat(vector) { return this.visitFlatVector(vector); }
    visitUtf8(vector) { return this.visitFlatListVector(vector); }
    visitBinary(vector) { return this.visitFlatListVector(vector); }
    visitDate(vector) { return this.visitFlatVector(vector); }
    visitTimestamp(vector) { return this.visitFlatVector(vector); }
    visitTime(vector) { return this.visitFlatVector(vector); }
    visitDecimal(vector) { return this.visitFlatVector(vector); }
    visitInterval(vector) { return this.visitFlatVector(vector); }
    visitList(vector) { return this.visitListVector(vector); }
    visitStruct(vector) { return this.visitNestedVector(vector); }
    visitFixedSizeBinary(vector) { return this.visitFlatVector(vector); }
    visitFixedSizeList(vector) { return this.visitListVector(vector); }
    visitMap(vector) { return this.visitNestedVector(vector); }
    visitDictionary(vector) {
        // Dictionary written out separately. Slice offset contained in the indices
        return this.visit(vector.indices);
    }
    visitUnion(vector) {
        const { data, type, length } = vector;
        const { offset: sliceOffset, typeIds } = data;
        // All Union Vectors have a typeIds buffer
        this.addBuffer(typeIds);
        // If this is a Sparse Union, treat it like all other Nested types
        if (type.mode === type_1.UnionMode.Sparse) {
            return this.visitNestedVector(vector);
        }
        else if (type.mode === type_1.UnionMode.Dense) {
            // If this is a Dense Union, add the valueOffsets buffer and potentially slice the children
            const valueOffsets = data.valueOffsets;
            if (sliceOffset <= 0) {
                // If the Vector hasn't been sliced, write the existing valueOffsets
                this.addBuffer(valueOffsets);
                // We can treat this like all other Nested types
                return this.visitNestedVector(vector);
            }
            else {
                // A sliced Dense Union is an unpleasant case. Because the offsets are different for
                // each child vector, we need to "rebase" the valueOffsets for each child
                // Union typeIds are not necessary 0-indexed
                const maxChildTypeId = Math.max(...type.typeIds);
                const childLengths = new Int32Array(maxChildTypeId + 1);
                // Set all to -1 to indicate that we haven't observed a first occurrence of a particular child yet
                const childOffsets = new Int32Array(maxChildTypeId + 1).fill(-1);
                const shiftedOffsets = new Int32Array(length);
                const unshiftedOffsets = this.getZeroBasedValueOffsets(0, length, valueOffsets);
                for (let typeId, shift, index = -1; ++index < length;) {
                    typeId = typeIds[index];
                    // ~(-1) used to be faster than x === -1, so maybe worth benchmarking the difference of these two impls for large dense unions:
                    // ~(shift = childOffsets[typeId]) || (shift = childOffsets[typeId] = unshiftedOffsets[index]);
                    // Going with this form for now, as it's more readable
                    if ((shift = childOffsets[typeId]) === -1) {
                        shift = childOffsets[typeId] = unshiftedOffsets[typeId];
                    }
                    shiftedOffsets[index] = unshiftedOffsets[index] - shift;
                    ++childLengths[typeId];
                }
                this.addBuffer(shiftedOffsets);
                // Slice and visit children accordingly
                for (let childIndex = -1, numChildren = type.children.length; ++childIndex < numChildren;) {
                    const typeId = type.typeIds[childIndex];
                    const child = vector.getChildAt(childIndex);
                    this.visit(child.slice(childOffsets[typeId], Math.min(length, childLengths[typeId])));
                }
            }
        }
        return this;
    }
    visitBoolVector(vector) {
        // Bool vector is a special case of FlatVector, as its data buffer needs to stay packed
        let bitmap;
        let values, { data, length } = vector;
        if (vector.nullCount >= length) {
            // If all values are null, just insert a placeholder empty data buffer (fastest path)
            bitmap = new Uint8Array(0);
        }
        else if (!((values = data.values) instanceof Uint8Array)) {
            // Otherwise if the underlying data *isn't* a Uint8Array, enumerate
            // the values as bools and re-pack them into a Uint8Array (slow path)
            bitmap = bit_1.packBools(vector);
        }
        else {
            // otherwise just slice the bitmap (fast path)
            bitmap = this.getTruncatedBitmap(data.offset, length, values);
        }
        return this.addBuffer(bitmap);
    }
    visitFlatVector(vector) {
        const { view, data } = vector;
        const { length, values } = data;
        const scaledLength = length * (view.size || 1);
        return this.addBuffer(values.subarray(0, scaledLength));
    }
    visitFlatListVector(vector) {
        const { data, length } = vector;
        const { offset, values, valueOffsets } = data;
        const firstOffset = valueOffsets[0];
        const lastOffset = valueOffsets[length];
        const byteLength = Math.min(lastOffset - firstOffset, values.byteLength - firstOffset);
        // Push in the order FlatList types read their buffers
        // valueOffsets buffer first
        this.addBuffer(this.getZeroBasedValueOffsets(0, length, valueOffsets));
        // sliced values buffer second
        this.addBuffer(values.subarray(firstOffset + offset, firstOffset + offset + byteLength));
        return this;
    }
    visitListVector(vector) {
        const { data, length } = vector;
        const { valueOffsets } = data;
        // If we have valueOffsets (ListVector), push that buffer first
        if (valueOffsets) {
            this.addBuffer(this.getZeroBasedValueOffsets(0, length, valueOffsets));
        }
        // Then insert the List's values child
        return this.visit(vector.getChildAt(0));
    }
    visitNestedVector(vector) {
        // Visit the children accordingly
        const numChildren = (vector.type.children || []).length;
        for (let child, childIndex = -1; ++childIndex < numChildren;) {
            if (child = vector.getChildAt(childIndex)) {
                this.visit(child);
            }
        }
        return this;
    }
    addBuffer(values) {
        const byteLength = bit_1.align(values.byteLength, 8);
        this.buffers.push(values);
        this.buffersMeta.push(new metadata_1.BufferMetadata(this.byteLength, byteLength));
        this.byteLength += byteLength;
        return this;
    }
    getTruncatedBitmap(offset, length, bitmap) {
        const alignedLength = bit_1.align(bitmap.byteLength, 8);
        if (offset > 0 || bitmap.byteLength < alignedLength) {
            // With a sliced array / non-zero offset, we have to copy the bitmap
            const bytes = new Uint8Array(alignedLength);
            bytes.set((offset % 8 === 0)
                // If the slice offset is aligned to 1 byte, it's safe to slice the nullBitmap directly
                ? bitmap.subarray(offset >> 3)
                // iterate each bit starting from the slice offset, and repack into an aligned nullBitmap
                : bit_1.packBools(bit_1.iterateBits(bitmap, offset, length, null, bit_1.getBool)));
            return bytes;
        }
        return bitmap;
    }
    getZeroBasedValueOffsets(offset, length, valueOffsets) {
        // If we have a non-zero offset, then the value offsets do not start at
        // zero. We must a) create a new offsets array with shifted offsets and
        // b) slice the values array accordingly
        if (offset > 0 || valueOffsets[0] !== 0) {
            const startOffset = valueOffsets[0];
            const destOffsets = new Int32Array(length + 1);
            for (let index = -1; ++index < length;) {
                destOffsets[index] = valueOffsets[index] - startOffset;
            }
            // Final offset
            destOffsets[length] = valueOffsets[length] - startOffset;
            return destOffsets;
        }
        return valueOffsets;
    }
}
exports.RecordBatchSerializer = RecordBatchSerializer;
const flatbuffers_1 = require("flatbuffers");
var Long = flatbuffers_1.flatbuffers.Long;
var Builder = flatbuffers_1.flatbuffers.Builder;
const File_ = require("../../fb/File");
const Schema_ = require("../../fb/Schema");
const Message_ = require("../../fb/Message");
var _Block = File_.org.apache.arrow.flatbuf.Block;
var _Footer = File_.org.apache.arrow.flatbuf.Footer;
var _Field = Schema_.org.apache.arrow.flatbuf.Field;
var _Schema = Schema_.org.apache.arrow.flatbuf.Schema;
var _Buffer = Schema_.org.apache.arrow.flatbuf.Buffer;
var _Message = Message_.org.apache.arrow.flatbuf.Message;
var _KeyValue = Schema_.org.apache.arrow.flatbuf.KeyValue;
var _FieldNode = Message_.org.apache.arrow.flatbuf.FieldNode;
var _RecordBatch = Message_.org.apache.arrow.flatbuf.RecordBatch;
var _DictionaryBatch = Message_.org.apache.arrow.flatbuf.DictionaryBatch;
var _DictionaryEncoding = Schema_.org.apache.arrow.flatbuf.DictionaryEncoding;
var _Endianness = Schema_.org.apache.arrow.flatbuf.Endianness;
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
class TypeSerializer extends visitor_1.TypeVisitor {
    constructor(builder) {
        super();
        this.builder = builder;
    }
    visitNull(_node) {
        const b = this.builder;
        return (_Null.startNull(b) ||
            _Null.endNull(b));
    }
    visitInt(node) {
        const b = this.builder;
        return (_Int.startInt(b) ||
            _Int.addBitWidth(b, node.bitWidth) ||
            _Int.addIsSigned(b, node.isSigned) ||
            _Int.endInt(b));
    }
    visitFloat(node) {
        const b = this.builder;
        return (_FloatingPoint.startFloatingPoint(b) ||
            _FloatingPoint.addPrecision(b, node.precision) ||
            _FloatingPoint.endFloatingPoint(b));
    }
    visitBinary(_node) {
        const b = this.builder;
        return (_Binary.startBinary(b) ||
            _Binary.endBinary(b));
    }
    visitBool(_node) {
        const b = this.builder;
        return (_Bool.startBool(b) ||
            _Bool.endBool(b));
    }
    visitUtf8(_node) {
        const b = this.builder;
        return (_Utf8.startUtf8(b) ||
            _Utf8.endUtf8(b));
    }
    visitDecimal(node) {
        const b = this.builder;
        return (_Decimal.startDecimal(b) ||
            _Decimal.addScale(b, node.scale) ||
            _Decimal.addPrecision(b, node.precision) ||
            _Decimal.endDecimal(b));
    }
    visitDate(node) {
        const b = this.builder;
        return _Date.startDate(b) || _Date.addUnit(b, node.unit) || _Date.endDate(b);
    }
    visitTime(node) {
        const b = this.builder;
        return (_Time.startTime(b) ||
            _Time.addUnit(b, node.unit) ||
            _Time.addBitWidth(b, node.bitWidth) ||
            _Time.endTime(b));
    }
    visitTimestamp(node) {
        const b = this.builder;
        const timezone = (node.timezone && b.createString(node.timezone)) || undefined;
        return (_Timestamp.startTimestamp(b) ||
            _Timestamp.addUnit(b, node.unit) ||
            (timezone !== undefined && _Timestamp.addTimezone(b, timezone)) ||
            _Timestamp.endTimestamp(b));
    }
    visitInterval(node) {
        const b = this.builder;
        return (_Interval.startInterval(b) || _Interval.addUnit(b, node.unit) || _Interval.endInterval(b));
    }
    visitList(_node) {
        const b = this.builder;
        return (_List.startList(b) ||
            _List.endList(b));
    }
    visitStruct(_node) {
        const b = this.builder;
        return (_Struct.startStruct_(b) ||
            _Struct.endStruct_(b));
    }
    visitUnion(node) {
        const b = this.builder;
        const typeIds = _Union.startTypeIdsVector(b, node.typeIds.length) ||
            _Union.createTypeIdsVector(b, node.typeIds);
        return (_Union.startUnion(b) ||
            _Union.addMode(b, node.mode) ||
            _Union.addTypeIds(b, typeIds) ||
            _Union.endUnion(b));
    }
    visitDictionary(node) {
        const b = this.builder;
        const indexType = this.visit(node.indices);
        return (_DictionaryEncoding.startDictionaryEncoding(b) ||
            _DictionaryEncoding.addId(b, new Long(node.id, 0)) ||
            _DictionaryEncoding.addIsOrdered(b, node.isOrdered) ||
            (indexType !== undefined && _DictionaryEncoding.addIndexType(b, indexType)) ||
            _DictionaryEncoding.endDictionaryEncoding(b));
    }
    visitFixedSizeBinary(node) {
        const b = this.builder;
        return (_FixedSizeBinary.startFixedSizeBinary(b) ||
            _FixedSizeBinary.addByteWidth(b, node.byteWidth) ||
            _FixedSizeBinary.endFixedSizeBinary(b));
    }
    visitFixedSizeList(node) {
        const b = this.builder;
        return (_FixedSizeList.startFixedSizeList(b) ||
            _FixedSizeList.addListSize(b, node.listSize) ||
            _FixedSizeList.endFixedSizeList(b));
    }
    visitMap(node) {
        const b = this.builder;
        return (_Map.startMap(b) ||
            _Map.addKeysSorted(b, node.keysSorted) ||
            _Map.endMap(b));
    }
}
exports.TypeSerializer = TypeSerializer;
function concatBuffersWithMetadata(totalByteLength, buffers, buffersMeta) {
    const data = new Uint8Array(totalByteLength);
    for (let i = -1, n = buffers.length; ++i < n;) {
        const { offset, length } = buffersMeta[i];
        const { buffer, byteOffset, byteLength } = buffers[i];
        const realBufferLength = Math.min(length, byteLength);
        if (realBufferLength > 0) {
            data.set(new Uint8Array(buffer, byteOffset, realBufferLength), offset);
        }
    }
    return data;
}
function writeFooter(b, node) {
    let schemaOffset = writeSchema(b, node.schema);
    let recordBatches = (node.recordBatches || []);
    let dictionaryBatches = (node.dictionaryBatches || []);
    let recordBatchesOffset = _Footer.startRecordBatchesVector(b, recordBatches.length) ||
        mapReverse(recordBatches, (rb) => writeBlock(b, rb)) &&
            b.endVector();
    let dictionaryBatchesOffset = _Footer.startDictionariesVector(b, dictionaryBatches.length) ||
        mapReverse(dictionaryBatches, (db) => writeBlock(b, db)) &&
            b.endVector();
    return (_Footer.startFooter(b) ||
        _Footer.addSchema(b, schemaOffset) ||
        _Footer.addVersion(b, node.schema.version) ||
        _Footer.addRecordBatches(b, recordBatchesOffset) ||
        _Footer.addDictionaries(b, dictionaryBatchesOffset) ||
        _Footer.endFooter(b));
}
function writeBlock(b, node) {
    return _Block.createBlock(b, new Long(node.offset, 0), node.metaDataLength, new Long(node.bodyLength, 0));
}
function writeMessage(b, node) {
    let messageHeaderOffset = 0;
    if (metadata_1.Message.isSchema(node)) {
        messageHeaderOffset = writeSchema(b, node);
    }
    else if (metadata_1.Message.isRecordBatch(node)) {
        messageHeaderOffset = writeRecordBatch(b, node);
    }
    else if (metadata_1.Message.isDictionaryBatch(node)) {
        messageHeaderOffset = writeDictionaryBatch(b, node);
    }
    return (_Message.startMessage(b) ||
        _Message.addVersion(b, node.version) ||
        _Message.addHeader(b, messageHeaderOffset) ||
        _Message.addHeaderType(b, node.headerType) ||
        _Message.addBodyLength(b, new Long(node.bodyLength, 0)) ||
        _Message.endMessage(b));
}
function writeSchema(b, node) {
    const fieldOffsets = node.fields.map((f) => writeField(b, f));
    const fieldsOffset = _Schema.startFieldsVector(b, fieldOffsets.length) ||
        _Schema.createFieldsVector(b, fieldOffsets);
    let metadata = undefined;
    if (node.metadata && node.metadata.size > 0) {
        metadata = _Schema.createCustomMetadataVector(b, [...node.metadata].map(([k, v]) => {
            const key = b.createString(`${k}`);
            const val = b.createString(`${v}`);
            return (_KeyValue.startKeyValue(b) ||
                _KeyValue.addKey(b, key) ||
                _KeyValue.addValue(b, val) ||
                _KeyValue.endKeyValue(b));
        }));
    }
    return (_Schema.startSchema(b) ||
        _Schema.addFields(b, fieldsOffset) ||
        _Schema.addEndianness(b, platformIsLittleEndian ? _Endianness.Little : _Endianness.Big) ||
        (metadata !== undefined && _Schema.addCustomMetadata(b, metadata)) ||
        _Schema.endSchema(b));
}
function writeRecordBatch(b, node) {
    let nodes = (node.nodes || []);
    let buffers = (node.buffers || []);
    let nodesOffset = _RecordBatch.startNodesVector(b, nodes.length) ||
        mapReverse(nodes, (n) => writeFieldNode(b, n)) &&
            b.endVector();
    let buffersOffset = _RecordBatch.startBuffersVector(b, buffers.length) ||
        mapReverse(buffers, (b_) => writeBuffer(b, b_)) &&
            b.endVector();
    return (_RecordBatch.startRecordBatch(b) ||
        _RecordBatch.addLength(b, new Long(node.length, 0)) ||
        _RecordBatch.addNodes(b, nodesOffset) ||
        _RecordBatch.addBuffers(b, buffersOffset) ||
        _RecordBatch.endRecordBatch(b));
}
function writeDictionaryBatch(b, node) {
    const dataOffset = writeRecordBatch(b, node.data);
    return (_DictionaryBatch.startDictionaryBatch(b) ||
        _DictionaryBatch.addId(b, new Long(node.id, 0)) ||
        _DictionaryBatch.addIsDelta(b, node.isDelta) ||
        _DictionaryBatch.addData(b, dataOffset) ||
        _DictionaryBatch.endDictionaryBatch(b));
}
function writeBuffer(b, node) {
    return _Buffer.createBuffer(b, new Long(node.offset, 0), new Long(node.length, 0));
}
function writeFieldNode(b, node) {
    return _FieldNode.createFieldNode(b, new Long(node.length, 0), new Long(node.nullCount, 0));
}
function writeField(b, node) {
    let typeOffset = -1;
    let type = node.type;
    let typeId = node.typeId;
    let name = undefined;
    let metadata = undefined;
    let dictionary = undefined;
    if (!type_1.DataType.isDictionary(type)) {
        typeOffset = new TypeSerializer(b).visit(type);
    }
    else {
        typeId = type.dictionary.TType;
        dictionary = new TypeSerializer(b).visit(type);
        typeOffset = new TypeSerializer(b).visit(type.dictionary);
    }
    let children = _Field.createChildrenVector(b, (type.children || []).map((f) => writeField(b, f)));
    if (node.metadata && node.metadata.size > 0) {
        metadata = _Field.createCustomMetadataVector(b, [...node.metadata].map(([k, v]) => {
            const key = b.createString(`${k}`);
            const val = b.createString(`${v}`);
            return (_KeyValue.startKeyValue(b) ||
                _KeyValue.addKey(b, key) ||
                _KeyValue.addValue(b, val) ||
                _KeyValue.endKeyValue(b));
        }));
    }
    if (node.name) {
        name = b.createString(node.name);
    }
    return (_Field.startField(b) ||
        _Field.addType(b, typeOffset) ||
        _Field.addTypeType(b, typeId) ||
        _Field.addChildren(b, children) ||
        _Field.addNullable(b, !!node.nullable) ||
        (name !== undefined && _Field.addName(b, name)) ||
        (dictionary !== undefined && _Field.addDictionary(b, dictionary)) ||
        (metadata !== undefined && _Field.addCustomMetadata(b, metadata)) ||
        _Field.endField(b));
}
function mapReverse(source, callbackfn) {
    const result = new Array(source.length);
    for (let i = -1, j = source.length; --j > -1;) {
        result[i] = callbackfn(source[j], i, source);
    }
    return result;
}
const platformIsLittleEndian = (function () {
    const buffer = new ArrayBuffer(2);
    new DataView(buffer).setInt16(0, 256, true /* littleEndian */);
    // Int16Array uses the platform's endianness.
    return new Int16Array(buffer)[0] === 256;
})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztBQUNyRCxJQUFPLElBQUksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQztBQUNuRCxJQUFPLGNBQWMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQztBQUN2RSxJQUFPLE9BQU8sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztBQUN6RCxJQUFPLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztBQUNyRCxJQUFPLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztBQUNyRCxJQUFPLFFBQVEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztBQUMzRCxJQUFPLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztBQUNyRCxJQUFPLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztBQUNyRCxJQUFPLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztBQUMvRCxJQUFPLFNBQVMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztBQUM3RCxJQUFPLEtBQUssR0FB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QUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDL0QsNkNBQTZDO0lBQzdDLE9BQU8sSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxFQUFFLENBQUMiLCJmaWxlIjoiaXBjL3dyaXRlci9iaW5hcnkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgVGFibGUgfSBmcm9tICcuLi8uLi90YWJsZSc7XG5pbXBvcnQgeyBEZW5zZVVuaW9uRGF0YSB9IGZyb20gJy4uLy4uL2RhdGEnO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2ggfSBmcm9tICcuLi8uLi9yZWNvcmRiYXRjaCc7XG5pbXBvcnQgeyBWZWN0b3JWaXNpdG9yLCBUeXBlVmlzaXRvciB9IGZyb20gJy4uLy4uL3Zpc2l0b3InO1xuaW1wb3J0IHsgTUFHSUMsIG1hZ2ljTGVuZ3RoLCBtYWdpY0FuZFBhZGRpbmcsIFBBRERJTkcgfSBmcm9tICcuLi9tYWdpYyc7XG5pbXBvcnQgeyBhbGlnbiwgZ2V0Qm9vbCwgcGFja0Jvb2xzLCBpdGVyYXRlQml0cyB9IGZyb20gJy4uLy4uL3V0aWwvYml0JztcbmltcG9ydCB7IFZlY3RvciwgVW5pb25WZWN0b3IsIERpY3Rpb25hcnlWZWN0b3IsIE5lc3RlZFZlY3RvciwgTGlzdFZlY3RvciB9IGZyb20gJy4uLy4uL3ZlY3Rvcic7XG5pbXBvcnQgeyBCdWZmZXJNZXRhZGF0YSwgRmllbGRNZXRhZGF0YSwgRm9vdGVyLCBGaWxlQmxvY2ssIE1lc3NhZ2UsIFJlY29yZEJhdGNoTWV0YWRhdGEsIERpY3Rpb25hcnlCYXRjaCB9IGZyb20gJy4uL21ldGFkYXRhJztcbmltcG9ydCB7XG4gICAgU2NoZW1hLCBGaWVsZCwgVHlwZWRBcnJheSwgTWV0YWRhdGFWZXJzaW9uLFxuICAgIERhdGFUeXBlLFxuICAgIERpY3Rpb25hcnksXG4gICAgTnVsbCwgSW50LCBGbG9hdCxcbiAgICBCaW5hcnksIEJvb2wsIFV0ZjgsIERlY2ltYWwsXG4gICAgRGF0ZV8sIFRpbWUsIFRpbWVzdGFtcCwgSW50ZXJ2YWwsXG4gICAgTGlzdCwgU3RydWN0LCBVbmlvbiwgRml4ZWRTaXplQmluYXJ5LCBGaXhlZFNpemVMaXN0LCBNYXBfLFxuICAgIEZsYXRUeXBlLCBGbGF0TGlzdFR5cGUsIE5lc3RlZFR5cGUsIFVuaW9uTW9kZSwgU3BhcnNlVW5pb24sIERlbnNlVW5pb24sIFNpbmdsZU5lc3RlZFR5cGUsXG59IGZyb20gJy4uLy4uL3R5cGUnO1xuXG5leHBvcnQgZnVuY3Rpb24qIHNlcmlhbGl6ZVN0cmVhbSh0YWJsZTogVGFibGUpIHtcbiAgICB5aWVsZCBzZXJpYWxpemVNZXNzYWdlKHRhYmxlLnNjaGVtYSkuYnVmZmVyO1xuICAgIGZvciAoY29uc3QgW2lkLCBmaWVsZF0gb2YgdGFibGUuc2NoZW1hLmRpY3Rpb25hcmllcykge1xuICAgICAgICBjb25zdCB2ZWMgPSB0YWJsZS5nZXRDb2x1bW4oZmllbGQubmFtZSkgYXMgRGljdGlvbmFyeVZlY3RvcjtcbiAgICAgICAgaWYgKHZlYyAmJiB2ZWMuZGljdGlvbmFyeSkge1xuICAgICAgICAgICAgeWllbGQgc2VyaWFsaXplRGljdGlvbmFyeUJhdGNoKHZlYy5kaWN0aW9uYXJ5LCBpZCkuYnVmZmVyO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgcmVjb3JkQmF0Y2ggb2YgdGFibGUuYmF0Y2hlcykge1xuICAgICAgICB5aWVsZCBzZXJpYWxpemVSZWNvcmRCYXRjaChyZWNvcmRCYXRjaCkuYnVmZmVyO1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uKiBzZXJpYWxpemVGaWxlKHRhYmxlOiBUYWJsZSkge1xuXG4gICAgY29uc3QgcmVjb3JkQmF0Y2hlcyA9IFtdO1xuICAgIGNvbnN0IGRpY3Rpb25hcnlCYXRjaGVzID0gW107XG5cbiAgICAvLyBGaXJzdCB5aWVsZCB0aGUgbWFnaWMgc3RyaW5nIChhbGlnbmVkKVxuICAgIGxldCBidWZmZXIgPSBuZXcgVWludDhBcnJheShhbGlnbihtYWdpY0xlbmd0aCwgOCkpO1xuICAgIGxldCBtZXRhZGF0YUxlbmd0aCwgYm9keUxlbmd0aCwgYnl0ZUxlbmd0aCA9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgIGJ1ZmZlci5zZXQoTUFHSUMsIDApO1xuICAgIHlpZWxkIGJ1ZmZlcjtcblxuICAgIC8vIFRoZW4geWllbGQgdGhlIHNjaGVtYVxuICAgICh7IG1ldGFkYXRhTGVuZ3RoLCBidWZmZXIgfSA9IHNlcmlhbGl6ZU1lc3NhZ2UodGFibGUuc2NoZW1hKSk7XG4gICAgYnl0ZUxlbmd0aCArPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICB5aWVsZCBidWZmZXI7XG5cbiAgICBmb3IgKGNvbnN0IFtpZCwgZmllbGRdIG9mIHRhYmxlLnNjaGVtYS5kaWN0aW9uYXJpZXMpIHtcbiAgICAgICAgY29uc3QgdmVjID0gdGFibGUuZ2V0Q29sdW1uKGZpZWxkLm5hbWUpIGFzIERpY3Rpb25hcnlWZWN0b3I7XG4gICAgICAgIGlmICh2ZWMgJiYgdmVjLmRpY3Rpb25hcnkpIHtcbiAgICAgICAgICAgICh7IG1ldGFkYXRhTGVuZ3RoLCBib2R5TGVuZ3RoLCBidWZmZXIgfSA9IHNlcmlhbGl6ZURpY3Rpb25hcnlCYXRjaCh2ZWMuZGljdGlvbmFyeSwgaWQpKTtcbiAgICAgICAgICAgIGRpY3Rpb25hcnlCYXRjaGVzLnB1c2gobmV3IEZpbGVCbG9jayhtZXRhZGF0YUxlbmd0aCwgYm9keUxlbmd0aCwgYnl0ZUxlbmd0aCkpO1xuICAgICAgICAgICAgYnl0ZUxlbmd0aCArPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgICAgIHlpZWxkIGJ1ZmZlcjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IHJlY29yZEJhdGNoIG9mIHRhYmxlLmJhdGNoZXMpIHtcbiAgICAgICAgKHsgbWV0YWRhdGFMZW5ndGgsIGJvZHlMZW5ndGgsIGJ1ZmZlciB9ID0gc2VyaWFsaXplUmVjb3JkQmF0Y2gocmVjb3JkQmF0Y2gpKTtcbiAgICAgICAgcmVjb3JkQmF0Y2hlcy5wdXNoKG5ldyBGaWxlQmxvY2sobWV0YWRhdGFMZW5ndGgsIGJvZHlMZW5ndGgsIGJ5dGVMZW5ndGgpKTtcbiAgICAgICAgYnl0ZUxlbmd0aCArPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgeWllbGQgYnVmZmVyO1xuICAgIH1cblxuICAgIC8vIFRoZW4geWllbGQgdGhlIGZvb3RlciBtZXRhZGF0YSAobm90IGFsaWduZWQpXG4gICAgKHsgbWV0YWRhdGFMZW5ndGgsIGJ1ZmZlciB9ID0gc2VyaWFsaXplRm9vdGVyKG5ldyBGb290ZXIoZGljdGlvbmFyeUJhdGNoZXMsIHJlY29yZEJhdGNoZXMsIHRhYmxlLnNjaGVtYSkpKTtcbiAgICB5aWVsZCBidWZmZXI7XG5cbiAgICAvLyBMYXN0LCB5aWVsZCB0aGUgZm9vdGVyIGxlbmd0aCArIHRlcm1pbmF0aW5nIG1hZ2ljIGFycm93IHN0cmluZyAoYWxpZ25lZClcbiAgICBidWZmZXIgPSBuZXcgVWludDhBcnJheShtYWdpY0FuZFBhZGRpbmcpO1xuICAgIG5ldyBEYXRhVmlldyhidWZmZXIuYnVmZmVyKS5zZXRJbnQzMigwLCBtZXRhZGF0YUxlbmd0aCwgcGxhdGZvcm1Jc0xpdHRsZUVuZGlhbik7XG4gICAgYnVmZmVyLnNldChNQUdJQywgYnVmZmVyLmJ5dGVMZW5ndGggLSBtYWdpY0xlbmd0aCk7XG4gICAgeWllbGQgYnVmZmVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VyaWFsaXplUmVjb3JkQmF0Y2gocmVjb3JkQmF0Y2g6IFJlY29yZEJhdGNoKSB7XG4gICAgY29uc3QgeyBieXRlTGVuZ3RoLCBmaWVsZE5vZGVzLCBidWZmZXJzLCBidWZmZXJzTWV0YSB9ID0gbmV3IFJlY29yZEJhdGNoU2VyaWFsaXplcigpLnZpc2l0UmVjb3JkQmF0Y2gocmVjb3JkQmF0Y2gpO1xuICAgIGNvbnN0IHJiTWV0YSA9IG5ldyBSZWNvcmRCYXRjaE1ldGFkYXRhKE1ldGFkYXRhVmVyc2lvbi5WNCwgcmVjb3JkQmF0Y2gubGVuZ3RoLCBmaWVsZE5vZGVzLCBidWZmZXJzTWV0YSk7XG4gICAgY29uc3QgcmJEYXRhID0gY29uY2F0QnVmZmVyc1dpdGhNZXRhZGF0YShieXRlTGVuZ3RoLCBidWZmZXJzLCBidWZmZXJzTWV0YSk7XG4gICAgcmV0dXJuIHNlcmlhbGl6ZU1lc3NhZ2UocmJNZXRhLCByYkRhdGEpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VyaWFsaXplRGljdGlvbmFyeUJhdGNoKGRpY3Rpb25hcnk6IFZlY3RvciwgaWQ6IExvbmcgfCBudW1iZXIsIGlzRGVsdGE6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgIGNvbnN0IHsgYnl0ZUxlbmd0aCwgZmllbGROb2RlcywgYnVmZmVycywgYnVmZmVyc01ldGEgfSA9IG5ldyBSZWNvcmRCYXRjaFNlcmlhbGl6ZXIoKS52aXNpdFJlY29yZEJhdGNoKFJlY29yZEJhdGNoLmZyb20oW2RpY3Rpb25hcnldKSk7XG4gICAgY29uc3QgcmJNZXRhID0gbmV3IFJlY29yZEJhdGNoTWV0YWRhdGEoTWV0YWRhdGFWZXJzaW9uLlY0LCBkaWN0aW9uYXJ5Lmxlbmd0aCwgZmllbGROb2RlcywgYnVmZmVyc01ldGEpO1xuICAgIGNvbnN0IGRiTWV0YSA9IG5ldyBEaWN0aW9uYXJ5QmF0Y2goTWV0YWRhdGFWZXJzaW9uLlY0LCByYk1ldGEsIGlkLCBpc0RlbHRhKTtcbiAgICBjb25zdCByYkRhdGEgPSBjb25jYXRCdWZmZXJzV2l0aE1ldGFkYXRhKGJ5dGVMZW5ndGgsIGJ1ZmZlcnMsIGJ1ZmZlcnNNZXRhKTtcbiAgICByZXR1cm4gc2VyaWFsaXplTWVzc2FnZShkYk1ldGEsIHJiRGF0YSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVNZXNzYWdlKG1lc3NhZ2U6IE1lc3NhZ2UsIGRhdGE/OiBVaW50OEFycmF5KSB7XG4gICAgY29uc3QgYiA9IG5ldyBCdWlsZGVyKCk7XG4gICAgX01lc3NhZ2UuZmluaXNoTWVzc2FnZUJ1ZmZlcihiLCB3cml0ZU1lc3NhZ2UoYiwgbWVzc2FnZSkpO1xuICAgIC8vIFNsaWNlIG91dCB0aGUgYnVmZmVyIHRoYXQgY29udGFpbnMgdGhlIG1lc3NhZ2UgbWV0YWRhdGFcbiAgICBjb25zdCBtZXRhZGF0YUJ5dGVzID0gYi5hc1VpbnQ4QXJyYXkoKTtcbiAgICAvLyBSZXNlcnZlIDQgYnl0ZXMgZm9yIHdyaXRpbmcgdGhlIG1lc3NhZ2Ugc2l6ZSBhdCB0aGUgZnJvbnQuXG4gICAgLy8gTWV0YWRhdGEgbGVuZ3RoIGluY2x1ZGVzIHRoZSBtZXRhZGF0YSBieXRlTGVuZ3RoICsgdGhlIDRcbiAgICAvLyBieXRlcyBmb3IgdGhlIGxlbmd0aCwgYW5kIHJvdW5kZWQgdXAgdG8gdGhlIG5lYXJlc3QgOCBieXRlcy5cbiAgICBjb25zdCBtZXRhZGF0YUxlbmd0aCA9IGFsaWduKFBBRERJTkcgKyBtZXRhZGF0YUJ5dGVzLmJ5dGVMZW5ndGgsIDgpO1xuICAgIC8vICsgdGhlIGxlbmd0aCBvZiB0aGUgb3B0aW9uYWwgZGF0YSBidWZmZXIgYXQgdGhlIGVuZCwgcGFkZGVkXG4gICAgY29uc3QgZGF0YUJ5dGVMZW5ndGggPSBkYXRhID8gZGF0YS5ieXRlTGVuZ3RoIDogMDtcbiAgICAvLyBlbnN1cmUgdGhlIGVudGlyZSBtZXNzYWdlIGlzIGFsaWduZWQgdG8gYW4gOC1ieXRlIGJvdW5kYXJ5XG4gICAgY29uc3QgbWVzc2FnZUJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoYWxpZ24obWV0YWRhdGFMZW5ndGggKyBkYXRhQnl0ZUxlbmd0aCwgOCkpO1xuICAgIC8vIFdyaXRlIHRoZSBtZXRhZGF0YSBsZW5ndGggaW50byB0aGUgZmlyc3QgNCBieXRlcywgYnV0IHN1YnRyYWN0IHRoZVxuICAgIC8vIGJ5dGVzIHdlIHVzZSB0byBob2xkIHRoZSBsZW5ndGggaXRzZWxmLlxuICAgIG5ldyBEYXRhVmlldyhtZXNzYWdlQnl0ZXMuYnVmZmVyKS5zZXRJbnQzMigwLCBtZXRhZGF0YUxlbmd0aCAtIFBBRERJTkcsIHBsYXRmb3JtSXNMaXR0bGVFbmRpYW4pO1xuICAgIC8vIENvcHkgdGhlIG1ldGFkYXRhIGJ5dGVzIGludG8gdGhlIG1lc3NhZ2UgYnVmZmVyXG4gICAgbWVzc2FnZUJ5dGVzLnNldChtZXRhZGF0YUJ5dGVzLCBQQURESU5HKTtcbiAgICAvLyBDb3B5IHRoZSBvcHRpb25hbCBkYXRhIGJ1ZmZlciBhZnRlciB0aGUgbWV0YWRhdGEgYnl0ZXNcbiAgICAoZGF0YSAmJiBkYXRhQnl0ZUxlbmd0aCA+IDApICYmIG1lc3NhZ2VCeXRlcy5zZXQoZGF0YSwgbWV0YWRhdGFMZW5ndGgpO1xuICAgIC8vIGlmIChtZXNzYWdlQnl0ZXMuYnl0ZUxlbmd0aCAlIDggIT09IDApIHsgZGVidWdnZXI7IH1cbiAgICAvLyBSZXR1cm4gdGhlIG1ldGFkYXRhIGxlbmd0aCBiZWNhdXNlIHdlIG5lZWQgdG8gd3JpdGUgaXQgaW50byBlYWNoIEZpbGVCbG9jayBhbHNvXG4gICAgcmV0dXJuIHsgbWV0YWRhdGFMZW5ndGgsIGJvZHlMZW5ndGg6IG1lc3NhZ2UuYm9keUxlbmd0aCwgYnVmZmVyOiBtZXNzYWdlQnl0ZXMgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZUZvb3Rlcihmb290ZXI6IEZvb3Rlcikge1xuICAgIGNvbnN0IGIgPSBuZXcgQnVpbGRlcigpO1xuICAgIF9Gb290ZXIuZmluaXNoRm9vdGVyQnVmZmVyKGIsIHdyaXRlRm9vdGVyKGIsIGZvb3RlcikpO1xuICAgIC8vIFNsaWNlIG91dCB0aGUgYnVmZmVyIHRoYXQgY29udGFpbnMgdGhlIGZvb3RlciBtZXRhZGF0YVxuICAgIGNvbnN0IGZvb3RlckJ5dGVzID0gYi5hc1VpbnQ4QXJyYXkoKTtcbiAgICBjb25zdCBtZXRhZGF0YUxlbmd0aCA9IGZvb3RlckJ5dGVzLmJ5dGVMZW5ndGg7XG4gICAgcmV0dXJuIHsgbWV0YWRhdGFMZW5ndGgsIGJ1ZmZlcjogZm9vdGVyQnl0ZXMgfTtcbn1cblxuZXhwb3J0IGNsYXNzIFJlY29yZEJhdGNoU2VyaWFsaXplciBleHRlbmRzIFZlY3RvclZpc2l0b3Ige1xuICAgIHB1YmxpYyBieXRlTGVuZ3RoID0gMDtcbiAgICBwdWJsaWMgYnVmZmVyczogVHlwZWRBcnJheVtdID0gW107XG4gICAgcHVibGljIGZpZWxkTm9kZXM6IEZpZWxkTWV0YWRhdGFbXSA9IFtdO1xuICAgIHB1YmxpYyBidWZmZXJzTWV0YTogQnVmZmVyTWV0YWRhdGFbXSA9IFtdO1xuICAgIHB1YmxpYyB2aXNpdFJlY29yZEJhdGNoKHJlY29yZEJhdGNoOiBSZWNvcmRCYXRjaCkge1xuICAgICAgICB0aGlzLmJ1ZmZlcnMgPSBbXTtcbiAgICAgICAgdGhpcy5ieXRlTGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5maWVsZE5vZGVzID0gW107XG4gICAgICAgIHRoaXMuYnVmZmVyc01ldGEgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgdmVjdG9yOiBWZWN0b3IsIGluZGV4ID0gLTEsIG51bUNvbHMgPSByZWNvcmRCYXRjaC5udW1Db2xzOyArK2luZGV4IDwgbnVtQ29sczspIHtcbiAgICAgICAgICAgIGlmICh2ZWN0b3IgPSByZWNvcmRCYXRjaC5nZXRDaGlsZEF0KGluZGV4KSEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnZpc2l0KHZlY3Rvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdDxUIGV4dGVuZHMgRGF0YVR5cGU+KHZlY3RvcjogVmVjdG9yPFQ+KSB7XG4gICAgICAgIGlmICghRGF0YVR5cGUuaXNEaWN0aW9uYXJ5KHZlY3Rvci50eXBlKSkge1xuICAgICAgICAgICAgY29uc3QgeyBkYXRhLCBsZW5ndGgsIG51bGxDb3VudCB9ID0gdmVjdG9yO1xuICAgICAgICAgICAgaWYgKGxlbmd0aCA+IDIxNDc0ODM2NDcpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQ2Fubm90IHdyaXRlIGFycmF5cyBsYXJnZXIgdGhhbiAyXjMxIC0gMSBpbiBsZW5ndGgnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZmllbGROb2Rlcy5wdXNoKG5ldyBGaWVsZE1ldGFkYXRhKGxlbmd0aCwgbnVsbENvdW50KSk7XG4gICAgICAgICAgICB0aGlzLmFkZEJ1ZmZlcihudWxsQ291bnQgPD0gMFxuICAgICAgICAgICAgICAgID8gbmV3IFVpbnQ4QXJyYXkoMCkgLy8gcGxhY2Vob2xkZXIgdmFsaWRpdHkgYnVmZmVyXG4gICAgICAgICAgICAgICAgOiB0aGlzLmdldFRydW5jYXRlZEJpdG1hcChkYXRhLm9mZnNldCwgbGVuZ3RoLCBkYXRhLm51bGxCaXRtYXAhKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3VwZXIudmlzaXQodmVjdG9yKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0TnVsbCAgICAgICAgICAgKF9udWxsejogVmVjdG9yPE51bGw+KSAgICAgICAgICAgIHsgcmV0dXJuIHRoaXM7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdEJvb2wgICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxCb29sPikgICAgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0Qm9vbFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRJbnQgICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8SW50PikgICAgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0RmxvYXQgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPEZsb2F0PikgICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdFV0ZjggICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxVdGY4PikgICAgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdExpc3RWZWN0b3IodmVjdG9yKTsgIH1cbiAgICBwdWJsaWMgdmlzaXRCaW5hcnkgICAgICAgICAodmVjdG9yOiBWZWN0b3I8QmluYXJ5PikgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRMaXN0VmVjdG9yKHZlY3Rvcik7ICB9XG4gICAgcHVibGljIHZpc2l0RGF0ZSAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPERhdGVfPikgICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdFRpbWVzdGFtcCAgICAgICh2ZWN0b3I6IFZlY3RvcjxUaW1lc3RhbXA+KSAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRUaW1lICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8VGltZT4pICAgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0RGVjaW1hbCAgICAgICAgKHZlY3RvcjogVmVjdG9yPERlY2ltYWw+KSAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdEludGVydmFsICAgICAgICh2ZWN0b3I6IFZlY3RvcjxJbnRlcnZhbD4pICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRMaXN0ICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8TGlzdD4pICAgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdExpc3RWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0U3RydWN0ICAgICAgICAgKHZlY3RvcjogVmVjdG9yPFN0cnVjdD4pICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXROZXN0ZWRWZWN0b3IodmVjdG9yKTsgICAgfVxuICAgIHB1YmxpYyB2aXNpdEZpeGVkU2l6ZUJpbmFyeSh2ZWN0b3I6IFZlY3RvcjxGaXhlZFNpemVCaW5hcnk+KSB7IHJldHVybiB0aGlzLnZpc2l0RmxhdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRGaXhlZFNpemVMaXN0ICAodmVjdG9yOiBWZWN0b3I8Rml4ZWRTaXplTGlzdD4pICAgeyByZXR1cm4gdGhpcy52aXNpdExpc3RWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0TWFwICAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPE1hcF8+KSAgICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXROZXN0ZWRWZWN0b3IodmVjdG9yKTsgICAgfVxuICAgIHB1YmxpYyB2aXNpdERpY3Rpb25hcnkgICAgICh2ZWN0b3I6IERpY3Rpb25hcnlWZWN0b3IpICAgICAgICB7XG4gICAgICAgIC8vIERpY3Rpb25hcnkgd3JpdHRlbiBvdXQgc2VwYXJhdGVseS4gU2xpY2Ugb2Zmc2V0IGNvbnRhaW5lZCBpbiB0aGUgaW5kaWNlc1xuICAgICAgICByZXR1cm4gdGhpcy52aXNpdCh2ZWN0b3IuaW5kaWNlcyk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdFVuaW9uKHZlY3RvcjogVmVjdG9yPERlbnNlVW5pb24gfCBTcGFyc2VVbmlvbj4pIHtcbiAgICAgICAgY29uc3QgeyBkYXRhLCB0eXBlLCBsZW5ndGggfSA9IHZlY3RvcjtcbiAgICAgICAgY29uc3QgeyBvZmZzZXQ6IHNsaWNlT2Zmc2V0LCB0eXBlSWRzIH0gPSBkYXRhO1xuICAgICAgICAvLyBBbGwgVW5pb24gVmVjdG9ycyBoYXZlIGEgdHlwZUlkcyBidWZmZXJcbiAgICAgICAgdGhpcy5hZGRCdWZmZXIodHlwZUlkcyk7XG4gICAgICAgIC8vIElmIHRoaXMgaXMgYSBTcGFyc2UgVW5pb24sIHRyZWF0IGl0IGxpa2UgYWxsIG90aGVyIE5lc3RlZCB0eXBlc1xuICAgICAgICBpZiAodHlwZS5tb2RlID09PSBVbmlvbk1vZGUuU3BhcnNlKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52aXNpdE5lc3RlZFZlY3Rvcih2ZWN0b3IpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUubW9kZSA9PT0gVW5pb25Nb2RlLkRlbnNlKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGlzIGlzIGEgRGVuc2UgVW5pb24sIGFkZCB0aGUgdmFsdWVPZmZzZXRzIGJ1ZmZlciBhbmQgcG90ZW50aWFsbHkgc2xpY2UgdGhlIGNoaWxkcmVuXG4gICAgICAgICAgICBjb25zdCB2YWx1ZU9mZnNldHMgPSAoZGF0YSBhcyBEZW5zZVVuaW9uRGF0YSkudmFsdWVPZmZzZXRzO1xuICAgICAgICAgICAgaWYgKHNsaWNlT2Zmc2V0IDw9IDApIHtcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgVmVjdG9yIGhhc24ndCBiZWVuIHNsaWNlZCwgd3JpdGUgdGhlIGV4aXN0aW5nIHZhbHVlT2Zmc2V0c1xuICAgICAgICAgICAgICAgIHRoaXMuYWRkQnVmZmVyKHZhbHVlT2Zmc2V0cyk7XG4gICAgICAgICAgICAgICAgLy8gV2UgY2FuIHRyZWF0IHRoaXMgbGlrZSBhbGwgb3RoZXIgTmVzdGVkIHR5cGVzXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudmlzaXROZXN0ZWRWZWN0b3IodmVjdG9yKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gQSBzbGljZWQgRGVuc2UgVW5pb24gaXMgYW4gdW5wbGVhc2FudCBjYXNlLiBCZWNhdXNlIHRoZSBvZmZzZXRzIGFyZSBkaWZmZXJlbnQgZm9yXG4gICAgICAgICAgICAgICAgLy8gZWFjaCBjaGlsZCB2ZWN0b3IsIHdlIG5lZWQgdG8gXCJyZWJhc2VcIiB0aGUgdmFsdWVPZmZzZXRzIGZvciBlYWNoIGNoaWxkXG4gICAgICAgICAgICAgICAgLy8gVW5pb24gdHlwZUlkcyBhcmUgbm90IG5lY2Vzc2FyeSAwLWluZGV4ZWRcbiAgICAgICAgICAgICAgICBjb25zdCBtYXhDaGlsZFR5cGVJZCA9IE1hdGgubWF4KC4uLnR5cGUudHlwZUlkcyk7XG4gICAgICAgICAgICAgICAgY29uc3QgY2hpbGRMZW5ndGhzID0gbmV3IEludDMyQXJyYXkobWF4Q2hpbGRUeXBlSWQgKyAxKTtcbiAgICAgICAgICAgICAgICAvLyBTZXQgYWxsIHRvIC0xIHRvIGluZGljYXRlIHRoYXQgd2UgaGF2ZW4ndCBvYnNlcnZlZCBhIGZpcnN0IG9jY3VycmVuY2Ugb2YgYSBwYXJ0aWN1bGFyIGNoaWxkIHlldFxuICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkT2Zmc2V0cyA9IG5ldyBJbnQzMkFycmF5KG1heENoaWxkVHlwZUlkICsgMSkuZmlsbCgtMSk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2hpZnRlZE9mZnNldHMgPSBuZXcgSW50MzJBcnJheShsZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHVuc2hpZnRlZE9mZnNldHMgPSB0aGlzLmdldFplcm9CYXNlZFZhbHVlT2Zmc2V0cygwLCBsZW5ndGgsIHZhbHVlT2Zmc2V0cyk7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgdHlwZUlkLCBzaGlmdCwgaW5kZXggPSAtMTsgKytpbmRleCA8IGxlbmd0aDspIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZUlkID0gdHlwZUlkc1tpbmRleF07XG4gICAgICAgICAgICAgICAgICAgIC8vIH4oLTEpIHVzZWQgdG8gYmUgZmFzdGVyIHRoYW4geCA9PT0gLTEsIHNvIG1heWJlIHdvcnRoIGJlbmNobWFya2luZyB0aGUgZGlmZmVyZW5jZSBvZiB0aGVzZSB0d28gaW1wbHMgZm9yIGxhcmdlIGRlbnNlIHVuaW9uczpcbiAgICAgICAgICAgICAgICAgICAgLy8gfihzaGlmdCA9IGNoaWxkT2Zmc2V0c1t0eXBlSWRdKSB8fCAoc2hpZnQgPSBjaGlsZE9mZnNldHNbdHlwZUlkXSA9IHVuc2hpZnRlZE9mZnNldHNbaW5kZXhdKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gR29pbmcgd2l0aCB0aGlzIGZvcm0gZm9yIG5vdywgYXMgaXQncyBtb3JlIHJlYWRhYmxlXG4gICAgICAgICAgICAgICAgICAgIGlmICgoc2hpZnQgPSBjaGlsZE9mZnNldHNbdHlwZUlkXSkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaGlmdCA9IGNoaWxkT2Zmc2V0c1t0eXBlSWRdID0gdW5zaGlmdGVkT2Zmc2V0c1t0eXBlSWRdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHNoaWZ0ZWRPZmZzZXRzW2luZGV4XSA9IHVuc2hpZnRlZE9mZnNldHNbaW5kZXhdIC0gc2hpZnQ7XG4gICAgICAgICAgICAgICAgICAgICsrY2hpbGRMZW5ndGhzW3R5cGVJZF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuYWRkQnVmZmVyKHNoaWZ0ZWRPZmZzZXRzKTtcbiAgICAgICAgICAgICAgICAvLyBTbGljZSBhbmQgdmlzaXQgY2hpbGRyZW4gYWNjb3JkaW5nbHlcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjaGlsZEluZGV4ID0gLTEsIG51bUNoaWxkcmVuID0gdHlwZS5jaGlsZHJlbi5sZW5ndGg7ICsrY2hpbGRJbmRleCA8IG51bUNoaWxkcmVuOykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0eXBlSWQgPSB0eXBlLnR5cGVJZHNbY2hpbGRJbmRleF07XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkID0gKHZlY3RvciBhcyBVbmlvblZlY3RvcikuZ2V0Q2hpbGRBdChjaGlsZEluZGV4KSE7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudmlzaXQoY2hpbGQuc2xpY2UoY2hpbGRPZmZzZXRzW3R5cGVJZF0sIE1hdGgubWluKGxlbmd0aCwgY2hpbGRMZW5ndGhzW3R5cGVJZF0pKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgdmlzaXRCb29sVmVjdG9yKHZlY3RvcjogVmVjdG9yPEJvb2w+KSB7XG4gICAgICAgIC8vIEJvb2wgdmVjdG9yIGlzIGEgc3BlY2lhbCBjYXNlIG9mIEZsYXRWZWN0b3IsIGFzIGl0cyBkYXRhIGJ1ZmZlciBuZWVkcyB0byBzdGF5IHBhY2tlZFxuICAgICAgICBsZXQgYml0bWFwOiBVaW50OEFycmF5O1xuICAgICAgICBsZXQgdmFsdWVzLCB7IGRhdGEsIGxlbmd0aCB9ID0gdmVjdG9yO1xuICAgICAgICBpZiAodmVjdG9yLm51bGxDb3VudCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIElmIGFsbCB2YWx1ZXMgYXJlIG51bGwsIGp1c3QgaW5zZXJ0IGEgcGxhY2Vob2xkZXIgZW1wdHkgZGF0YSBidWZmZXIgKGZhc3Rlc3QgcGF0aClcbiAgICAgICAgICAgIGJpdG1hcCA9IG5ldyBVaW50OEFycmF5KDApO1xuICAgICAgICB9IGVsc2UgaWYgKCEoKHZhbHVlcyA9IGRhdGEudmFsdWVzKSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkpKSB7XG4gICAgICAgICAgICAvLyBPdGhlcndpc2UgaWYgdGhlIHVuZGVybHlpbmcgZGF0YSAqaXNuJ3QqIGEgVWludDhBcnJheSwgZW51bWVyYXRlXG4gICAgICAgICAgICAvLyB0aGUgdmFsdWVzIGFzIGJvb2xzIGFuZCByZS1wYWNrIHRoZW0gaW50byBhIFVpbnQ4QXJyYXkgKHNsb3cgcGF0aClcbiAgICAgICAgICAgIGJpdG1hcCA9IHBhY2tCb29scyh2ZWN0b3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlIGp1c3Qgc2xpY2UgdGhlIGJpdG1hcCAoZmFzdCBwYXRoKVxuICAgICAgICAgICAgYml0bWFwID0gdGhpcy5nZXRUcnVuY2F0ZWRCaXRtYXAoZGF0YS5vZmZzZXQsIGxlbmd0aCwgdmFsdWVzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5hZGRCdWZmZXIoYml0bWFwKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHZpc2l0RmxhdFZlY3RvcjxUIGV4dGVuZHMgRmxhdFR5cGU+KHZlY3RvcjogVmVjdG9yPFQ+KSB7XG4gICAgICAgIGNvbnN0IHsgdmlldywgZGF0YSB9ID0gdmVjdG9yO1xuICAgICAgICBjb25zdCB7IGxlbmd0aCwgdmFsdWVzIH0gPSBkYXRhO1xuICAgICAgICBjb25zdCBzY2FsZWRMZW5ndGggPSBsZW5ndGggKiAoKHZpZXcgYXMgYW55KS5zaXplIHx8IDEpO1xuICAgICAgICByZXR1cm4gdGhpcy5hZGRCdWZmZXIodmFsdWVzLnN1YmFycmF5KDAsIHNjYWxlZExlbmd0aCkpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgdmlzaXRGbGF0TGlzdFZlY3RvcjxUIGV4dGVuZHMgRmxhdExpc3RUeXBlPih2ZWN0b3I6IFZlY3RvcjxUPikge1xuICAgICAgICBjb25zdCB7IGRhdGEsIGxlbmd0aCB9ID0gdmVjdG9yO1xuICAgICAgICBjb25zdCB7IG9mZnNldCwgdmFsdWVzLCB2YWx1ZU9mZnNldHMgfSA9IGRhdGE7XG4gICAgICAgIGNvbnN0IGZpcnN0T2Zmc2V0ID0gdmFsdWVPZmZzZXRzWzBdO1xuICAgICAgICBjb25zdCBsYXN0T2Zmc2V0ID0gdmFsdWVPZmZzZXRzW2xlbmd0aF07XG4gICAgICAgIGNvbnN0IGJ5dGVMZW5ndGggPSBNYXRoLm1pbihsYXN0T2Zmc2V0IC0gZmlyc3RPZmZzZXQsIHZhbHVlcy5ieXRlTGVuZ3RoIC0gZmlyc3RPZmZzZXQpO1xuICAgICAgICAvLyBQdXNoIGluIHRoZSBvcmRlciBGbGF0TGlzdCB0eXBlcyByZWFkIHRoZWlyIGJ1ZmZlcnNcbiAgICAgICAgLy8gdmFsdWVPZmZzZXRzIGJ1ZmZlciBmaXJzdFxuICAgICAgICB0aGlzLmFkZEJ1ZmZlcih0aGlzLmdldFplcm9CYXNlZFZhbHVlT2Zmc2V0cygwLCBsZW5ndGgsIHZhbHVlT2Zmc2V0cykpO1xuICAgICAgICAvLyBzbGljZWQgdmFsdWVzIGJ1ZmZlciBzZWNvbmRcbiAgICAgICAgdGhpcy5hZGRCdWZmZXIodmFsdWVzLnN1YmFycmF5KGZpcnN0T2Zmc2V0ICsgb2Zmc2V0LCBmaXJzdE9mZnNldCArIG9mZnNldCArIGJ5dGVMZW5ndGgpKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHByb3RlY3RlZCB2aXNpdExpc3RWZWN0b3I8VCBleHRlbmRzIFNpbmdsZU5lc3RlZFR5cGU+KHZlY3RvcjogVmVjdG9yPFQ+KSB7XG4gICAgICAgIGNvbnN0IHsgZGF0YSwgbGVuZ3RoIH0gPSB2ZWN0b3I7XG4gICAgICAgIGNvbnN0IHsgdmFsdWVPZmZzZXRzIH0gPSA8YW55PiBkYXRhO1xuICAgICAgICAvLyBJZiB3ZSBoYXZlIHZhbHVlT2Zmc2V0cyAoTGlzdFZlY3RvciksIHB1c2ggdGhhdCBidWZmZXIgZmlyc3RcbiAgICAgICAgaWYgKHZhbHVlT2Zmc2V0cykge1xuICAgICAgICAgICAgdGhpcy5hZGRCdWZmZXIodGhpcy5nZXRaZXJvQmFzZWRWYWx1ZU9mZnNldHMoMCwgbGVuZ3RoLCB2YWx1ZU9mZnNldHMpKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBUaGVuIGluc2VydCB0aGUgTGlzdCdzIHZhbHVlcyBjaGlsZFxuICAgICAgICByZXR1cm4gdGhpcy52aXNpdCgodmVjdG9yIGFzIGFueSBhcyBMaXN0VmVjdG9yPFQ+KS5nZXRDaGlsZEF0KDApISk7XG4gICAgfVxuICAgIHByb3RlY3RlZCB2aXNpdE5lc3RlZFZlY3RvcjxUIGV4dGVuZHMgTmVzdGVkVHlwZT4odmVjdG9yOiBWZWN0b3I8VD4pIHtcbiAgICAgICAgLy8gVmlzaXQgdGhlIGNoaWxkcmVuIGFjY29yZGluZ2x5XG4gICAgICAgIGNvbnN0IG51bUNoaWxkcmVuID0gKHZlY3Rvci50eXBlLmNoaWxkcmVuIHx8IFtdKS5sZW5ndGg7XG4gICAgICAgIGZvciAobGV0IGNoaWxkOiBWZWN0b3IgfCBudWxsLCBjaGlsZEluZGV4ID0gLTE7ICsrY2hpbGRJbmRleCA8IG51bUNoaWxkcmVuOykge1xuICAgICAgICAgICAgaWYgKGNoaWxkID0gKHZlY3RvciBhcyBOZXN0ZWRWZWN0b3I8VD4pLmdldENoaWxkQXQoY2hpbGRJbmRleCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnZpc2l0KGNoaWxkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHJvdGVjdGVkIGFkZEJ1ZmZlcih2YWx1ZXM6IFR5cGVkQXJyYXkpIHtcbiAgICAgICAgY29uc3QgYnl0ZUxlbmd0aCA9IGFsaWduKHZhbHVlcy5ieXRlTGVuZ3RoLCA4KTtcbiAgICAgICAgdGhpcy5idWZmZXJzLnB1c2godmFsdWVzKTtcbiAgICAgICAgdGhpcy5idWZmZXJzTWV0YS5wdXNoKG5ldyBCdWZmZXJNZXRhZGF0YSh0aGlzLmJ5dGVMZW5ndGgsIGJ5dGVMZW5ndGgpKTtcbiAgICAgICAgdGhpcy5ieXRlTGVuZ3RoICs9IGJ5dGVMZW5ndGg7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgZ2V0VHJ1bmNhdGVkQml0bWFwKG9mZnNldDogbnVtYmVyLCBsZW5ndGg6IG51bWJlciwgYml0bWFwOiBVaW50OEFycmF5KSB7XG4gICAgICAgIGNvbnN0IGFsaWduZWRMZW5ndGggPSBhbGlnbihiaXRtYXAuYnl0ZUxlbmd0aCwgOCk7XG4gICAgICAgIGlmIChvZmZzZXQgPiAwIHx8IGJpdG1hcC5ieXRlTGVuZ3RoIDwgYWxpZ25lZExlbmd0aCkge1xuICAgICAgICAgICAgLy8gV2l0aCBhIHNsaWNlZCBhcnJheSAvIG5vbi16ZXJvIG9mZnNldCwgd2UgaGF2ZSB0byBjb3B5IHRoZSBiaXRtYXBcbiAgICAgICAgICAgIGNvbnN0IGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoYWxpZ25lZExlbmd0aCk7XG4gICAgICAgICAgICBieXRlcy5zZXQoXG4gICAgICAgICAgICAgICAgKG9mZnNldCAlIDggPT09IDApXG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIHNsaWNlIG9mZnNldCBpcyBhbGlnbmVkIHRvIDEgYnl0ZSwgaXQncyBzYWZlIHRvIHNsaWNlIHRoZSBudWxsQml0bWFwIGRpcmVjdGx5XG4gICAgICAgICAgICAgICAgPyBiaXRtYXAuc3ViYXJyYXkob2Zmc2V0ID4+IDMpXG4gICAgICAgICAgICAgICAgLy8gaXRlcmF0ZSBlYWNoIGJpdCBzdGFydGluZyBmcm9tIHRoZSBzbGljZSBvZmZzZXQsIGFuZCByZXBhY2sgaW50byBhbiBhbGlnbmVkIG51bGxCaXRtYXBcbiAgICAgICAgICAgICAgICA6IHBhY2tCb29scyhpdGVyYXRlQml0cyhiaXRtYXAsIG9mZnNldCwgbGVuZ3RoLCBudWxsLCBnZXRCb29sKSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICByZXR1cm4gYnl0ZXM7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGJpdG1hcDtcbiAgICB9XG4gICAgcHJvdGVjdGVkIGdldFplcm9CYXNlZFZhbHVlT2Zmc2V0cyhvZmZzZXQ6IG51bWJlciwgbGVuZ3RoOiBudW1iZXIsIHZhbHVlT2Zmc2V0czogSW50MzJBcnJheSkge1xuICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgbm9uLXplcm8gb2Zmc2V0LCB0aGVuIHRoZSB2YWx1ZSBvZmZzZXRzIGRvIG5vdCBzdGFydCBhdFxuICAgICAgICAvLyB6ZXJvLiBXZSBtdXN0IGEpIGNyZWF0ZSBhIG5ldyBvZmZzZXRzIGFycmF5IHdpdGggc2hpZnRlZCBvZmZzZXRzIGFuZFxuICAgICAgICAvLyBiKSBzbGljZSB0aGUgdmFsdWVzIGFycmF5IGFjY29yZGluZ2x5XG4gICAgICAgIGlmIChvZmZzZXQgPiAwIHx8IHZhbHVlT2Zmc2V0c1swXSAhPT0gMCkge1xuICAgICAgICAgICAgY29uc3Qgc3RhcnRPZmZzZXQgPSB2YWx1ZU9mZnNldHNbMF07XG4gICAgICAgICAgICBjb25zdCBkZXN0T2Zmc2V0cyA9IG5ldyBJbnQzMkFycmF5KGxlbmd0aCArIDEpO1xuICAgICAgICAgICAgZm9yIChsZXQgaW5kZXggPSAtMTsgKytpbmRleCA8IGxlbmd0aDspIHtcbiAgICAgICAgICAgICAgICBkZXN0T2Zmc2V0c1tpbmRleF0gPSB2YWx1ZU9mZnNldHNbaW5kZXhdIC0gc3RhcnRPZmZzZXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBGaW5hbCBvZmZzZXRcbiAgICAgICAgICAgIGRlc3RPZmZzZXRzW2xlbmd0aF0gPSB2YWx1ZU9mZnNldHNbbGVuZ3RoXSAtIHN0YXJ0T2Zmc2V0O1xuICAgICAgICAgICAgcmV0dXJuIGRlc3RPZmZzZXRzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWx1ZU9mZnNldHM7XG4gICAgfVxufVxuXG5pbXBvcnQgeyBmbGF0YnVmZmVycyB9IGZyb20gJ2ZsYXRidWZmZXJzJztcbmltcG9ydCBMb25nID0gZmxhdGJ1ZmZlcnMuTG9uZztcbmltcG9ydCBCdWlsZGVyID0gZmxhdGJ1ZmZlcnMuQnVpbGRlcjtcbmltcG9ydCAqIGFzIEZpbGVfIGZyb20gJy4uLy4uL2ZiL0ZpbGUnO1xuaW1wb3J0ICogYXMgU2NoZW1hXyBmcm9tICcuLi8uLi9mYi9TY2hlbWEnO1xuaW1wb3J0ICogYXMgTWVzc2FnZV8gZnJvbSAnLi4vLi4vZmIvTWVzc2FnZSc7XG5cbmltcG9ydCBfQmxvY2sgPSBGaWxlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuQmxvY2s7XG5pbXBvcnQgX0Zvb3RlciA9IEZpbGVfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5Gb290ZXI7XG5pbXBvcnQgX0ZpZWxkID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRmllbGQ7XG5pbXBvcnQgX1NjaGVtYSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlNjaGVtYTtcbmltcG9ydCBfQnVmZmVyID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuQnVmZmVyO1xuaW1wb3J0IF9NZXNzYWdlID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk1lc3NhZ2U7XG5pbXBvcnQgX0tleVZhbHVlID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuS2V5VmFsdWU7XG5pbXBvcnQgX0ZpZWxkTm9kZSA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaWVsZE5vZGU7XG5pbXBvcnQgX1JlY29yZEJhdGNoID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlJlY29yZEJhdGNoO1xuaW1wb3J0IF9EaWN0aW9uYXJ5QmF0Y2ggPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGljdGlvbmFyeUJhdGNoO1xuaW1wb3J0IF9EaWN0aW9uYXJ5RW5jb2RpbmcgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EaWN0aW9uYXJ5RW5jb2Rpbmc7XG5pbXBvcnQgX0VuZGlhbm5lc3MgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5FbmRpYW5uZXNzO1xuXG5pbXBvcnQgX051bGwgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5OdWxsO1xuaW1wb3J0IF9JbnQgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5JbnQ7XG5pbXBvcnQgX0Zsb2F0aW5nUG9pbnQgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GbG9hdGluZ1BvaW50O1xuaW1wb3J0IF9CaW5hcnkgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5CaW5hcnk7XG5pbXBvcnQgX0Jvb2wgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5Cb29sO1xuaW1wb3J0IF9VdGY4ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVXRmODtcbmltcG9ydCBfRGVjaW1hbCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRlY2ltYWw7XG5pbXBvcnQgX0RhdGUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EYXRlO1xuaW1wb3J0IF9UaW1lID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVGltZTtcbmltcG9ydCBfVGltZXN0YW1wID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVGltZXN0YW1wO1xuaW1wb3J0IF9JbnRlcnZhbCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkludGVydmFsO1xuaW1wb3J0IF9MaXN0ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTGlzdDtcbmltcG9ydCBfU3RydWN0ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuU3RydWN0XztcbmltcG9ydCBfVW5pb24gPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5VbmlvbjtcbmltcG9ydCBfRml4ZWRTaXplQmluYXJ5ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRml4ZWRTaXplQmluYXJ5O1xuaW1wb3J0IF9GaXhlZFNpemVMaXN0ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRml4ZWRTaXplTGlzdDtcbmltcG9ydCBfTWFwID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTWFwO1xuXG5leHBvcnQgY2xhc3MgVHlwZVNlcmlhbGl6ZXIgZXh0ZW5kcyBUeXBlVmlzaXRvciB7XG4gICAgY29uc3RydWN0b3IocHJvdGVjdGVkIGJ1aWxkZXI6IEJ1aWxkZXIpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0TnVsbChfbm9kZTogTnVsbCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX051bGwuc3RhcnROdWxsKGIpIHx8XG4gICAgICAgICAgICBfTnVsbC5lbmROdWxsKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdEludChub2RlOiBJbnQpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9JbnQuc3RhcnRJbnQoYikgfHxcbiAgICAgICAgICAgIF9JbnQuYWRkQml0V2lkdGgoYiwgbm9kZS5iaXRXaWR0aCkgfHxcbiAgICAgICAgICAgIF9JbnQuYWRkSXNTaWduZWQoYiwgbm9kZS5pc1NpZ25lZCkgfHxcbiAgICAgICAgICAgIF9JbnQuZW5kSW50KGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdEZsb2F0KG5vZGU6IEZsb2F0KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfRmxvYXRpbmdQb2ludC5zdGFydEZsb2F0aW5nUG9pbnQoYikgfHxcbiAgICAgICAgICAgIF9GbG9hdGluZ1BvaW50LmFkZFByZWNpc2lvbihiLCBub2RlLnByZWNpc2lvbikgfHxcbiAgICAgICAgICAgIF9GbG9hdGluZ1BvaW50LmVuZEZsb2F0aW5nUG9pbnQoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0QmluYXJ5KF9ub2RlOiBCaW5hcnkpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9CaW5hcnkuc3RhcnRCaW5hcnkoYikgfHxcbiAgICAgICAgICAgIF9CaW5hcnkuZW5kQmluYXJ5KGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdEJvb2woX25vZGU6IEJvb2wpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9Cb29sLnN0YXJ0Qm9vbChiKSB8fFxuICAgICAgICAgICAgX0Jvb2wuZW5kQm9vbChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRVdGY4KF9ub2RlOiBVdGY4KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfVXRmOC5zdGFydFV0ZjgoYikgfHxcbiAgICAgICAgICAgIF9VdGY4LmVuZFV0ZjgoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0RGVjaW1hbChub2RlOiBEZWNpbWFsKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfRGVjaW1hbC5zdGFydERlY2ltYWwoYikgfHxcbiAgICAgICAgICAgIF9EZWNpbWFsLmFkZFNjYWxlKGIsIG5vZGUuc2NhbGUpIHx8XG4gICAgICAgICAgICBfRGVjaW1hbC5hZGRQcmVjaXNpb24oYiwgbm9kZS5wcmVjaXNpb24pIHx8XG4gICAgICAgICAgICBfRGVjaW1hbC5lbmREZWNpbWFsKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdERhdGUobm9kZTogRGF0ZV8pIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIF9EYXRlLnN0YXJ0RGF0ZShiKSB8fCBfRGF0ZS5hZGRVbml0KGIsIG5vZGUudW5pdCkgfHwgX0RhdGUuZW5kRGF0ZShiKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0VGltZShub2RlOiBUaW1lKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfVGltZS5zdGFydFRpbWUoYikgfHxcbiAgICAgICAgICAgIF9UaW1lLmFkZFVuaXQoYiwgbm9kZS51bml0KSB8fFxuICAgICAgICAgICAgX1RpbWUuYWRkQml0V2lkdGgoYiwgbm9kZS5iaXRXaWR0aCkgfHxcbiAgICAgICAgICAgIF9UaW1lLmVuZFRpbWUoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0VGltZXN0YW1wKG5vZGU6IFRpbWVzdGFtcCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICBjb25zdCB0aW1lem9uZSA9IChub2RlLnRpbWV6b25lICYmIGIuY3JlYXRlU3RyaW5nKG5vZGUudGltZXpvbmUpKSB8fCB1bmRlZmluZWQ7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfVGltZXN0YW1wLnN0YXJ0VGltZXN0YW1wKGIpIHx8XG4gICAgICAgICAgICBfVGltZXN0YW1wLmFkZFVuaXQoYiwgbm9kZS51bml0KSB8fFxuICAgICAgICAgICAgKHRpbWV6b25lICE9PSB1bmRlZmluZWQgJiYgX1RpbWVzdGFtcC5hZGRUaW1lem9uZShiLCB0aW1lem9uZSkpIHx8XG4gICAgICAgICAgICBfVGltZXN0YW1wLmVuZFRpbWVzdGFtcChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRJbnRlcnZhbChub2RlOiBJbnRlcnZhbCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0ludGVydmFsLnN0YXJ0SW50ZXJ2YWwoYikgfHwgX0ludGVydmFsLmFkZFVuaXQoYiwgbm9kZS51bml0KSB8fCBfSW50ZXJ2YWwuZW5kSW50ZXJ2YWwoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0TGlzdChfbm9kZTogTGlzdCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0xpc3Quc3RhcnRMaXN0KGIpIHx8XG4gICAgICAgICAgICBfTGlzdC5lbmRMaXN0KGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdFN0cnVjdChfbm9kZTogU3RydWN0KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfU3RydWN0LnN0YXJ0U3RydWN0XyhiKSB8fFxuICAgICAgICAgICAgX1N0cnVjdC5lbmRTdHJ1Y3RfKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdFVuaW9uKG5vZGU6IFVuaW9uKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIGNvbnN0IHR5cGVJZHMgPVxuICAgICAgICAgICAgX1VuaW9uLnN0YXJ0VHlwZUlkc1ZlY3RvcihiLCBub2RlLnR5cGVJZHMubGVuZ3RoKSB8fFxuICAgICAgICAgICAgX1VuaW9uLmNyZWF0ZVR5cGVJZHNWZWN0b3IoYiwgbm9kZS50eXBlSWRzKTtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9Vbmlvbi5zdGFydFVuaW9uKGIpIHx8XG4gICAgICAgICAgICBfVW5pb24uYWRkTW9kZShiLCBub2RlLm1vZGUpIHx8XG4gICAgICAgICAgICBfVW5pb24uYWRkVHlwZUlkcyhiLCB0eXBlSWRzKSB8fFxuICAgICAgICAgICAgX1VuaW9uLmVuZFVuaW9uKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdERpY3Rpb25hcnkobm9kZTogRGljdGlvbmFyeSkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICBjb25zdCBpbmRleFR5cGUgPSB0aGlzLnZpc2l0KG5vZGUuaW5kaWNlcyk7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfRGljdGlvbmFyeUVuY29kaW5nLnN0YXJ0RGljdGlvbmFyeUVuY29kaW5nKGIpIHx8XG4gICAgICAgICAgICBfRGljdGlvbmFyeUVuY29kaW5nLmFkZElkKGIsIG5ldyBMb25nKG5vZGUuaWQsIDApKSB8fFxuICAgICAgICAgICAgX0RpY3Rpb25hcnlFbmNvZGluZy5hZGRJc09yZGVyZWQoYiwgbm9kZS5pc09yZGVyZWQpIHx8XG4gICAgICAgICAgICAoaW5kZXhUeXBlICE9PSB1bmRlZmluZWQgJiYgX0RpY3Rpb25hcnlFbmNvZGluZy5hZGRJbmRleFR5cGUoYiwgaW5kZXhUeXBlKSkgfHxcbiAgICAgICAgICAgIF9EaWN0aW9uYXJ5RW5jb2RpbmcuZW5kRGljdGlvbmFyeUVuY29kaW5nKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdEZpeGVkU2l6ZUJpbmFyeShub2RlOiBGaXhlZFNpemVCaW5hcnkpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9GaXhlZFNpemVCaW5hcnkuc3RhcnRGaXhlZFNpemVCaW5hcnkoYikgfHxcbiAgICAgICAgICAgIF9GaXhlZFNpemVCaW5hcnkuYWRkQnl0ZVdpZHRoKGIsIG5vZGUuYnl0ZVdpZHRoKSB8fFxuICAgICAgICAgICAgX0ZpeGVkU2l6ZUJpbmFyeS5lbmRGaXhlZFNpemVCaW5hcnkoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0Rml4ZWRTaXplTGlzdChub2RlOiBGaXhlZFNpemVMaXN0KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfRml4ZWRTaXplTGlzdC5zdGFydEZpeGVkU2l6ZUxpc3QoYikgfHxcbiAgICAgICAgICAgIF9GaXhlZFNpemVMaXN0LmFkZExpc3RTaXplKGIsIG5vZGUubGlzdFNpemUpIHx8XG4gICAgICAgICAgICBfRml4ZWRTaXplTGlzdC5lbmRGaXhlZFNpemVMaXN0KGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdE1hcChub2RlOiBNYXBfKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfTWFwLnN0YXJ0TWFwKGIpIHx8XG4gICAgICAgICAgICBfTWFwLmFkZEtleXNTb3J0ZWQoYiwgbm9kZS5rZXlzU29ydGVkKSB8fFxuICAgICAgICAgICAgX01hcC5lbmRNYXAoYilcbiAgICAgICAgKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNvbmNhdEJ1ZmZlcnNXaXRoTWV0YWRhdGEodG90YWxCeXRlTGVuZ3RoOiBudW1iZXIsIGJ1ZmZlcnM6IFVpbnQ4QXJyYXlbXSwgYnVmZmVyc01ldGE6IEJ1ZmZlck1ldGFkYXRhW10pIHtcbiAgICBjb25zdCBkYXRhID0gbmV3IFVpbnQ4QXJyYXkodG90YWxCeXRlTGVuZ3RoKTtcbiAgICBmb3IgKGxldCBpID0gLTEsIG4gPSBidWZmZXJzLmxlbmd0aDsgKytpIDwgbjspIHtcbiAgICAgICAgY29uc3QgeyBvZmZzZXQsIGxlbmd0aCB9ID0gYnVmZmVyc01ldGFbaV07XG4gICAgICAgIGNvbnN0IHsgYnVmZmVyLCBieXRlT2Zmc2V0LCBieXRlTGVuZ3RoIH0gPSBidWZmZXJzW2ldO1xuICAgICAgICBjb25zdCByZWFsQnVmZmVyTGVuZ3RoID0gTWF0aC5taW4obGVuZ3RoLCBieXRlTGVuZ3RoKTtcbiAgICAgICAgaWYgKHJlYWxCdWZmZXJMZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBkYXRhLnNldChuZXcgVWludDhBcnJheShidWZmZXIsIGJ5dGVPZmZzZXQsIHJlYWxCdWZmZXJMZW5ndGgpLCBvZmZzZXQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkYXRhO1xufVxuXG5mdW5jdGlvbiB3cml0ZUZvb3RlcihiOiBCdWlsZGVyLCBub2RlOiBGb290ZXIpIHtcbiAgICBsZXQgc2NoZW1hT2Zmc2V0ID0gd3JpdGVTY2hlbWEoYiwgbm9kZS5zY2hlbWEpO1xuICAgIGxldCByZWNvcmRCYXRjaGVzID0gKG5vZGUucmVjb3JkQmF0Y2hlcyB8fCBbXSk7XG4gICAgbGV0IGRpY3Rpb25hcnlCYXRjaGVzID0gKG5vZGUuZGljdGlvbmFyeUJhdGNoZXMgfHwgW10pO1xuICAgIGxldCByZWNvcmRCYXRjaGVzT2Zmc2V0ID1cbiAgICAgICAgX0Zvb3Rlci5zdGFydFJlY29yZEJhdGNoZXNWZWN0b3IoYiwgcmVjb3JkQmF0Y2hlcy5sZW5ndGgpIHx8XG4gICAgICAgICAgICBtYXBSZXZlcnNlKHJlY29yZEJhdGNoZXMsIChyYikgPT4gd3JpdGVCbG9jayhiLCByYikpICYmXG4gICAgICAgIGIuZW5kVmVjdG9yKCk7XG5cbiAgICBsZXQgZGljdGlvbmFyeUJhdGNoZXNPZmZzZXQgPVxuICAgICAgICBfRm9vdGVyLnN0YXJ0RGljdGlvbmFyaWVzVmVjdG9yKGIsIGRpY3Rpb25hcnlCYXRjaGVzLmxlbmd0aCkgfHxcbiAgICAgICAgICAgIG1hcFJldmVyc2UoZGljdGlvbmFyeUJhdGNoZXMsIChkYikgPT4gd3JpdGVCbG9jayhiLCBkYikpICYmXG4gICAgICAgIGIuZW5kVmVjdG9yKCk7XG5cbiAgICByZXR1cm4gKFxuICAgICAgICBfRm9vdGVyLnN0YXJ0Rm9vdGVyKGIpIHx8XG4gICAgICAgIF9Gb290ZXIuYWRkU2NoZW1hKGIsIHNjaGVtYU9mZnNldCkgfHxcbiAgICAgICAgX0Zvb3Rlci5hZGRWZXJzaW9uKGIsIG5vZGUuc2NoZW1hLnZlcnNpb24pIHx8XG4gICAgICAgIF9Gb290ZXIuYWRkUmVjb3JkQmF0Y2hlcyhiLCByZWNvcmRCYXRjaGVzT2Zmc2V0KSB8fFxuICAgICAgICBfRm9vdGVyLmFkZERpY3Rpb25hcmllcyhiLCBkaWN0aW9uYXJ5QmF0Y2hlc09mZnNldCkgfHxcbiAgICAgICAgX0Zvb3Rlci5lbmRGb290ZXIoYilcbiAgICApO1xufVxuXG5mdW5jdGlvbiB3cml0ZUJsb2NrKGI6IEJ1aWxkZXIsIG5vZGU6IEZpbGVCbG9jaykge1xuICAgIHJldHVybiBfQmxvY2suY3JlYXRlQmxvY2soYixcbiAgICAgICAgbmV3IExvbmcobm9kZS5vZmZzZXQsIDApLFxuICAgICAgICBub2RlLm1ldGFEYXRhTGVuZ3RoLFxuICAgICAgICBuZXcgTG9uZyhub2RlLmJvZHlMZW5ndGgsIDApXG4gICAgKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVNZXNzYWdlKGI6IEJ1aWxkZXIsIG5vZGU6IE1lc3NhZ2UpIHtcbiAgICBsZXQgbWVzc2FnZUhlYWRlck9mZnNldCA9IDA7XG4gICAgaWYgKE1lc3NhZ2UuaXNTY2hlbWEobm9kZSkpIHtcbiAgICAgICAgbWVzc2FnZUhlYWRlck9mZnNldCA9IHdyaXRlU2NoZW1hKGIsIG5vZGUgYXMgU2NoZW1hKTtcbiAgICB9IGVsc2UgaWYgKE1lc3NhZ2UuaXNSZWNvcmRCYXRjaChub2RlKSkge1xuICAgICAgICBtZXNzYWdlSGVhZGVyT2Zmc2V0ID0gd3JpdGVSZWNvcmRCYXRjaChiLCBub2RlIGFzIFJlY29yZEJhdGNoTWV0YWRhdGEpO1xuICAgIH0gZWxzZSBpZiAoTWVzc2FnZS5pc0RpY3Rpb25hcnlCYXRjaChub2RlKSkge1xuICAgICAgICBtZXNzYWdlSGVhZGVyT2Zmc2V0ID0gd3JpdGVEaWN0aW9uYXJ5QmF0Y2goYiwgbm9kZSBhcyBEaWN0aW9uYXJ5QmF0Y2gpO1xuICAgIH1cbiAgICByZXR1cm4gKFxuICAgICAgICBfTWVzc2FnZS5zdGFydE1lc3NhZ2UoYikgfHxcbiAgICAgICAgX01lc3NhZ2UuYWRkVmVyc2lvbihiLCBub2RlLnZlcnNpb24pIHx8XG4gICAgICAgIF9NZXNzYWdlLmFkZEhlYWRlcihiLCBtZXNzYWdlSGVhZGVyT2Zmc2V0KSB8fFxuICAgICAgICBfTWVzc2FnZS5hZGRIZWFkZXJUeXBlKGIsIG5vZGUuaGVhZGVyVHlwZSkgfHxcbiAgICAgICAgX01lc3NhZ2UuYWRkQm9keUxlbmd0aChiLCBuZXcgTG9uZyhub2RlLmJvZHlMZW5ndGgsIDApKSB8fFxuICAgICAgICBfTWVzc2FnZS5lbmRNZXNzYWdlKGIpXG4gICAgKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVTY2hlbWEoYjogQnVpbGRlciwgbm9kZTogU2NoZW1hKSB7XG5cbiAgICBjb25zdCBmaWVsZE9mZnNldHMgPSBub2RlLmZpZWxkcy5tYXAoKGYpID0+IHdyaXRlRmllbGQoYiwgZikpO1xuICAgIGNvbnN0IGZpZWxkc09mZnNldCA9XG4gICAgICAgIF9TY2hlbWEuc3RhcnRGaWVsZHNWZWN0b3IoYiwgZmllbGRPZmZzZXRzLmxlbmd0aCkgfHxcbiAgICAgICAgX1NjaGVtYS5jcmVhdGVGaWVsZHNWZWN0b3IoYiwgZmllbGRPZmZzZXRzKTtcblxuICAgIGxldCBtZXRhZGF0YTogbnVtYmVyIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGlmIChub2RlLm1ldGFkYXRhICYmIG5vZGUubWV0YWRhdGEuc2l6ZSA+IDApIHtcbiAgICAgICAgbWV0YWRhdGEgPSBfU2NoZW1hLmNyZWF0ZUN1c3RvbU1ldGFkYXRhVmVjdG9yKFxuICAgICAgICAgICAgYixcbiAgICAgICAgICAgIFsuLi5ub2RlLm1ldGFkYXRhXS5tYXAoKFtrLCB2XSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGIuY3JlYXRlU3RyaW5nKGAke2t9YCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsID0gYi5jcmVhdGVTdHJpbmcoYCR7dn1gKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgICBfS2V5VmFsdWUuc3RhcnRLZXlWYWx1ZShiKSB8fFxuICAgICAgICAgICAgICAgICAgICBfS2V5VmFsdWUuYWRkS2V5KGIsIGtleSkgfHxcbiAgICAgICAgICAgICAgICAgICAgX0tleVZhbHVlLmFkZFZhbHVlKGIsIHZhbCkgfHxcbiAgICAgICAgICAgICAgICAgICAgX0tleVZhbHVlLmVuZEtleVZhbHVlKGIpXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIChcbiAgICAgICAgX1NjaGVtYS5zdGFydFNjaGVtYShiKSB8fFxuICAgICAgICBfU2NoZW1hLmFkZEZpZWxkcyhiLCBmaWVsZHNPZmZzZXQpIHx8XG4gICAgICAgIF9TY2hlbWEuYWRkRW5kaWFubmVzcyhiLCBwbGF0Zm9ybUlzTGl0dGxlRW5kaWFuID8gX0VuZGlhbm5lc3MuTGl0dGxlIDogX0VuZGlhbm5lc3MuQmlnKSB8fFxuICAgICAgICAobWV0YWRhdGEgIT09IHVuZGVmaW5lZCAmJiBfU2NoZW1hLmFkZEN1c3RvbU1ldGFkYXRhKGIsIG1ldGFkYXRhKSkgfHxcbiAgICAgICAgX1NjaGVtYS5lbmRTY2hlbWEoYilcbiAgICApO1xufVxuXG5mdW5jdGlvbiB3cml0ZVJlY29yZEJhdGNoKGI6IEJ1aWxkZXIsIG5vZGU6IFJlY29yZEJhdGNoTWV0YWRhdGEpIHtcbiAgICBsZXQgbm9kZXMgPSAobm9kZS5ub2RlcyB8fCBbXSk7XG4gICAgbGV0IGJ1ZmZlcnMgPSAobm9kZS5idWZmZXJzIHx8IFtdKTtcbiAgICBsZXQgbm9kZXNPZmZzZXQgPVxuICAgICAgICBfUmVjb3JkQmF0Y2guc3RhcnROb2Rlc1ZlY3RvcihiLCBub2Rlcy5sZW5ndGgpIHx8XG4gICAgICAgIG1hcFJldmVyc2Uobm9kZXMsIChuKSA9PiB3cml0ZUZpZWxkTm9kZShiLCBuKSkgJiZcbiAgICAgICAgYi5lbmRWZWN0b3IoKTtcblxuICAgIGxldCBidWZmZXJzT2Zmc2V0ID1cbiAgICAgICAgX1JlY29yZEJhdGNoLnN0YXJ0QnVmZmVyc1ZlY3RvcihiLCBidWZmZXJzLmxlbmd0aCkgfHxcbiAgICAgICAgbWFwUmV2ZXJzZShidWZmZXJzLCAoYl8pID0+IHdyaXRlQnVmZmVyKGIsIGJfKSkgJiZcbiAgICAgICAgYi5lbmRWZWN0b3IoKTtcblxuICAgIHJldHVybiAoXG4gICAgICAgIF9SZWNvcmRCYXRjaC5zdGFydFJlY29yZEJhdGNoKGIpIHx8XG4gICAgICAgIF9SZWNvcmRCYXRjaC5hZGRMZW5ndGgoYiwgbmV3IExvbmcobm9kZS5sZW5ndGgsIDApKSB8fFxuICAgICAgICBfUmVjb3JkQmF0Y2guYWRkTm9kZXMoYiwgbm9kZXNPZmZzZXQpIHx8XG4gICAgICAgIF9SZWNvcmRCYXRjaC5hZGRCdWZmZXJzKGIsIGJ1ZmZlcnNPZmZzZXQpIHx8XG4gICAgICAgIF9SZWNvcmRCYXRjaC5lbmRSZWNvcmRCYXRjaChiKVxuICAgICk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlRGljdGlvbmFyeUJhdGNoKGI6IEJ1aWxkZXIsIG5vZGU6IERpY3Rpb25hcnlCYXRjaCkge1xuICAgIGNvbnN0IGRhdGFPZmZzZXQgPSB3cml0ZVJlY29yZEJhdGNoKGIsIG5vZGUuZGF0YSk7XG4gICAgcmV0dXJuIChcbiAgICAgICAgX0RpY3Rpb25hcnlCYXRjaC5zdGFydERpY3Rpb25hcnlCYXRjaChiKSB8fFxuICAgICAgICBfRGljdGlvbmFyeUJhdGNoLmFkZElkKGIsIG5ldyBMb25nKG5vZGUuaWQsIDApKSB8fFxuICAgICAgICBfRGljdGlvbmFyeUJhdGNoLmFkZElzRGVsdGEoYiwgbm9kZS5pc0RlbHRhKSB8fFxuICAgICAgICBfRGljdGlvbmFyeUJhdGNoLmFkZERhdGEoYiwgZGF0YU9mZnNldCkgfHxcbiAgICAgICAgX0RpY3Rpb25hcnlCYXRjaC5lbmREaWN0aW9uYXJ5QmF0Y2goYilcbiAgICApO1xufVxuXG5mdW5jdGlvbiB3cml0ZUJ1ZmZlcihiOiBCdWlsZGVyLCBub2RlOiBCdWZmZXJNZXRhZGF0YSkge1xuICAgIHJldHVybiBfQnVmZmVyLmNyZWF0ZUJ1ZmZlcihiLCBuZXcgTG9uZyhub2RlLm9mZnNldCwgMCksIG5ldyBMb25nKG5vZGUubGVuZ3RoLCAwKSk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlRmllbGROb2RlKGI6IEJ1aWxkZXIsIG5vZGU6IEZpZWxkTWV0YWRhdGEpIHtcbiAgICByZXR1cm4gX0ZpZWxkTm9kZS5jcmVhdGVGaWVsZE5vZGUoYiwgbmV3IExvbmcobm9kZS5sZW5ndGgsIDApLCBuZXcgTG9uZyhub2RlLm51bGxDb3VudCwgMCkpO1xufVxuXG5mdW5jdGlvbiB3cml0ZUZpZWxkKGI6IEJ1aWxkZXIsIG5vZGU6IEZpZWxkKSB7XG4gICAgbGV0IHR5cGVPZmZzZXQgPSAtMTtcbiAgICBsZXQgdHlwZSA9IG5vZGUudHlwZTtcbiAgICBsZXQgdHlwZUlkID0gbm9kZS50eXBlSWQ7XG4gICAgbGV0IG5hbWU6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBsZXQgbWV0YWRhdGE6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBsZXQgZGljdGlvbmFyeTogbnVtYmVyIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gICAgaWYgKCFEYXRhVHlwZS5pc0RpY3Rpb25hcnkodHlwZSkpIHtcbiAgICAgICAgdHlwZU9mZnNldCA9IG5ldyBUeXBlU2VyaWFsaXplcihiKS52aXNpdCh0eXBlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0eXBlSWQgPSB0eXBlLmRpY3Rpb25hcnkuVFR5cGU7XG4gICAgICAgIGRpY3Rpb25hcnkgPSBuZXcgVHlwZVNlcmlhbGl6ZXIoYikudmlzaXQodHlwZSk7XG4gICAgICAgIHR5cGVPZmZzZXQgPSBuZXcgVHlwZVNlcmlhbGl6ZXIoYikudmlzaXQodHlwZS5kaWN0aW9uYXJ5KTtcbiAgICB9XG5cbiAgICBsZXQgY2hpbGRyZW4gPSBfRmllbGQuY3JlYXRlQ2hpbGRyZW5WZWN0b3IoYiwgKHR5cGUuY2hpbGRyZW4gfHwgW10pLm1hcCgoZikgPT4gd3JpdGVGaWVsZChiLCBmKSkpO1xuICAgIGlmIChub2RlLm1ldGFkYXRhICYmIG5vZGUubWV0YWRhdGEuc2l6ZSA+IDApIHtcbiAgICAgICAgbWV0YWRhdGEgPSBfRmllbGQuY3JlYXRlQ3VzdG9tTWV0YWRhdGFWZWN0b3IoXG4gICAgICAgICAgICBiLFxuICAgICAgICAgICAgWy4uLm5vZGUubWV0YWRhdGFdLm1hcCgoW2ssIHZdKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qga2V5ID0gYi5jcmVhdGVTdHJpbmcoYCR7a31gKTtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWwgPSBiLmNyZWF0ZVN0cmluZyhgJHt2fWApO1xuICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICAgIF9LZXlWYWx1ZS5zdGFydEtleVZhbHVlKGIpIHx8XG4gICAgICAgICAgICAgICAgICAgIF9LZXlWYWx1ZS5hZGRLZXkoYiwga2V5KSB8fFxuICAgICAgICAgICAgICAgICAgICBfS2V5VmFsdWUuYWRkVmFsdWUoYiwgdmFsKSB8fFxuICAgICAgICAgICAgICAgICAgICBfS2V5VmFsdWUuZW5kS2V5VmFsdWUoYilcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG4gICAgaWYgKG5vZGUubmFtZSkge1xuICAgICAgICBuYW1lID0gYi5jcmVhdGVTdHJpbmcobm9kZS5uYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIChcbiAgICAgICAgX0ZpZWxkLnN0YXJ0RmllbGQoYikgfHxcbiAgICAgICAgX0ZpZWxkLmFkZFR5cGUoYiwgdHlwZU9mZnNldCkgfHxcbiAgICAgICAgX0ZpZWxkLmFkZFR5cGVUeXBlKGIsIHR5cGVJZCkgfHxcbiAgICAgICAgX0ZpZWxkLmFkZENoaWxkcmVuKGIsIGNoaWxkcmVuKSB8fFxuICAgICAgICBfRmllbGQuYWRkTnVsbGFibGUoYiwgISFub2RlLm51bGxhYmxlKSB8fFxuICAgICAgICAobmFtZSAhPT0gdW5kZWZpbmVkICYmIF9GaWVsZC5hZGROYW1lKGIsIG5hbWUpKSB8fFxuICAgICAgICAoZGljdGlvbmFyeSAhPT0gdW5kZWZpbmVkICYmIF9GaWVsZC5hZGREaWN0aW9uYXJ5KGIsIGRpY3Rpb25hcnkpKSB8fFxuICAgICAgICAobWV0YWRhdGEgIT09IHVuZGVmaW5lZCAmJiBfRmllbGQuYWRkQ3VzdG9tTWV0YWRhdGEoYiwgbWV0YWRhdGEpKSB8fFxuICAgICAgICBfRmllbGQuZW5kRmllbGQoYilcbiAgICApO1xufVxuXG5mdW5jdGlvbiBtYXBSZXZlcnNlPFQsIFU+KHNvdXJjZTogVFtdLCBjYWxsYmFja2ZuOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IFUpOiBVW10ge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBBcnJheShzb3VyY2UubGVuZ3RoKTtcbiAgICBmb3IgKGxldCBpID0gLTEsIGogPSBzb3VyY2UubGVuZ3RoOyAtLWogPiAtMTspIHtcbiAgICAgICAgcmVzdWx0W2ldID0gY2FsbGJhY2tmbihzb3VyY2Vbal0sIGksIHNvdXJjZSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbmNvbnN0IHBsYXRmb3JtSXNMaXR0bGVFbmRpYW4gPSAoZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKDIpO1xuICAgIG5ldyBEYXRhVmlldyhidWZmZXIpLnNldEludDE2KDAsIDI1NiwgdHJ1ZSAvKiBsaXR0bGVFbmRpYW4gKi8pO1xuICAgIC8vIEludDE2QXJyYXkgdXNlcyB0aGUgcGxhdGZvcm0ncyBlbmRpYW5uZXNzLlxuICAgIHJldHVybiBuZXcgSW50MTZBcnJheShidWZmZXIpWzBdID09PSAyNTY7XG59KSgpO1xuIl19

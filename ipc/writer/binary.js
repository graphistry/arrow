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
    let metadataLength, byteLength = buffer.byteLength;
    buffer.set(magic_1.MAGIC, 0);
    yield buffer;
    // Then yield the schema
    ({ metadataLength, buffer } = serializeMessage(table.schema));
    byteLength += buffer.byteLength;
    yield buffer;
    for (const [id, field] of table.schema.dictionaries) {
        const vec = table.getColumn(field.name);
        if (vec && vec.dictionary) {
            ({ metadataLength, buffer } = serializeDictionaryBatch(vec.dictionary, id));
            dictionaryBatches.push(new metadata_1.FileBlock(metadataLength, buffer.byteLength, byteLength));
            byteLength += buffer.byteLength;
            yield buffer;
        }
    }
    for (const recordBatch of table.batches) {
        ({ metadataLength, buffer } = serializeRecordBatch(recordBatch));
        recordBatches.push(new metadata_1.FileBlock(metadataLength, buffer.byteLength, byteLength));
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
    return { metadataLength, buffer: messageBytes };
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
                const unshiftedOffsets = this.getZeroBasedValueOffsets(sliceOffset, length, valueOffsets);
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
        const { offset, length, values } = data;
        const scaledLength = length * (view.size || 1);
        return this.addBuffer(values.subarray(offset, scaledLength));
    }
    visitFlatListVector(vector) {
        const { data, length } = vector;
        const { offset, values, valueOffsets } = data;
        const firstOffset = valueOffsets[0];
        const lastOffset = valueOffsets[length];
        const byteLength = Math.min(lastOffset - firstOffset, values.byteLength - firstOffset);
        // Push in the order FlatList types read their buffers
        // valueOffsets buffer first
        this.addBuffer(this.getZeroBasedValueOffsets(offset, length, valueOffsets));
        // sliced values buffer second
        this.addBuffer(values.subarray(firstOffset + offset, firstOffset + offset + byteLength));
        return this;
    }
    visitListVector(vector) {
        const { data, length } = vector;
        const { offset, valueOffsets } = data;
        // If we have valueOffsets (ListVector), push that buffer first
        if (valueOffsets) {
            this.addBuffer(this.getZeroBasedValueOffsets(offset, length, valueOffsets));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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Q0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQztBQUVqRSxJQUFPLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztBQUNyRCxJQUFPLElBQUksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQztBQUNuRCxJQUFPLGNBQWMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQztBQUN2RSxJQUFPLE9BQU8sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztBQUN6RCxJQUFPLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztBQUNyRCxJQUFPLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztBQUNyRCxJQUFPLFFBQVEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztBQUMzRCxJQUFPLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztBQUNyRCxJQUFPLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztBQUNyRCxJQUFPLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztBQUMvRCxJQUFPLFNBQVMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFL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O0FBRUQsTUFBTSxzQkFBc0IsR0FBRyxDQUFDO0lBQzVCLE1BQU0sTUFBTSxHQUFHLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xDLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQy9ELDZDQUE2QztJQUM3QyxPQUFPLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQztBQUM3QyxDQUFDLENBQUMsRUFBRSxDQUFDIiwiZmlsZSI6ImlwYy93cml0ZXIvYmluYXJ5LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IFRhYmxlIH0gZnJvbSAnLi4vLi4vdGFibGUnO1xuaW1wb3J0IHsgRGVuc2VVbmlvbkRhdGEgfSBmcm9tICcuLi8uLi9kYXRhJztcbmltcG9ydCB7IFJlY29yZEJhdGNoIH0gZnJvbSAnLi4vLi4vcmVjb3JkYmF0Y2gnO1xuaW1wb3J0IHsgVmVjdG9yVmlzaXRvciwgVHlwZVZpc2l0b3IgfSBmcm9tICcuLi8uLi92aXNpdG9yJztcbmltcG9ydCB7IE1BR0lDLCBtYWdpY0xlbmd0aCwgbWFnaWNBbmRQYWRkaW5nLCBQQURESU5HIH0gZnJvbSAnLi4vbWFnaWMnO1xuaW1wb3J0IHsgYWxpZ24sIGdldEJvb2wsIHBhY2tCb29scywgaXRlcmF0ZUJpdHMgfSBmcm9tICcuLi8uLi91dGlsL2JpdCc7XG5pbXBvcnQgeyBWZWN0b3IsIFVuaW9uVmVjdG9yLCBEaWN0aW9uYXJ5VmVjdG9yLCBOZXN0ZWRWZWN0b3IsIExpc3RWZWN0b3IgfSBmcm9tICcuLi8uLi92ZWN0b3InO1xuaW1wb3J0IHsgQnVmZmVyTWV0YWRhdGEsIEZpZWxkTWV0YWRhdGEsIEZvb3RlciwgRmlsZUJsb2NrLCBNZXNzYWdlLCBSZWNvcmRCYXRjaE1ldGFkYXRhLCBEaWN0aW9uYXJ5QmF0Y2ggfSBmcm9tICcuLi9tZXRhZGF0YSc7XG5pbXBvcnQge1xuICAgIFNjaGVtYSwgRmllbGQsIFR5cGVkQXJyYXksIE1ldGFkYXRhVmVyc2lvbixcbiAgICBEYXRhVHlwZSxcbiAgICBEaWN0aW9uYXJ5LFxuICAgIE51bGwsIEludCwgRmxvYXQsXG4gICAgQmluYXJ5LCBCb29sLCBVdGY4LCBEZWNpbWFsLFxuICAgIERhdGVfLCBUaW1lLCBUaW1lc3RhbXAsIEludGVydmFsLFxuICAgIExpc3QsIFN0cnVjdCwgVW5pb24sIEZpeGVkU2l6ZUJpbmFyeSwgRml4ZWRTaXplTGlzdCwgTWFwXyxcbiAgICBGbGF0VHlwZSwgRmxhdExpc3RUeXBlLCBOZXN0ZWRUeXBlLCBVbmlvbk1vZGUsIFNwYXJzZVVuaW9uLCBEZW5zZVVuaW9uLCBTaW5nbGVOZXN0ZWRUeXBlLFxufSBmcm9tICcuLi8uLi90eXBlJztcblxuZXhwb3J0IGZ1bmN0aW9uKiBzZXJpYWxpemVTdHJlYW0odGFibGU6IFRhYmxlKSB7XG4gICAgeWllbGQgc2VyaWFsaXplTWVzc2FnZSh0YWJsZS5zY2hlbWEpLmJ1ZmZlcjtcbiAgICBmb3IgKGNvbnN0IFtpZCwgZmllbGRdIG9mIHRhYmxlLnNjaGVtYS5kaWN0aW9uYXJpZXMpIHtcbiAgICAgICAgY29uc3QgdmVjID0gdGFibGUuZ2V0Q29sdW1uKGZpZWxkLm5hbWUpIGFzIERpY3Rpb25hcnlWZWN0b3I7XG4gICAgICAgIGlmICh2ZWMgJiYgdmVjLmRpY3Rpb25hcnkpIHtcbiAgICAgICAgICAgIHlpZWxkIHNlcmlhbGl6ZURpY3Rpb25hcnlCYXRjaCh2ZWMuZGljdGlvbmFyeSwgaWQpLmJ1ZmZlcjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IHJlY29yZEJhdGNoIG9mIHRhYmxlLmJhdGNoZXMpIHtcbiAgICAgICAgeWllbGQgc2VyaWFsaXplUmVjb3JkQmF0Y2gocmVjb3JkQmF0Y2gpLmJ1ZmZlcjtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiogc2VyaWFsaXplRmlsZSh0YWJsZTogVGFibGUpIHtcblxuICAgIGNvbnN0IHJlY29yZEJhdGNoZXMgPSBbXTtcbiAgICBjb25zdCBkaWN0aW9uYXJ5QmF0Y2hlcyA9IFtdO1xuXG4gICAgLy8gRmlyc3QgeWllbGQgdGhlIG1hZ2ljIHN0cmluZyAoYWxpZ25lZClcbiAgICBsZXQgYnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkoYWxpZ24obWFnaWNMZW5ndGgsIDgpKTtcbiAgICBsZXQgbWV0YWRhdGFMZW5ndGgsIGJ5dGVMZW5ndGggPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICBidWZmZXIuc2V0KE1BR0lDLCAwKTtcbiAgICB5aWVsZCBidWZmZXI7XG5cbiAgICAvLyBUaGVuIHlpZWxkIHRoZSBzY2hlbWFcbiAgICAoeyBtZXRhZGF0YUxlbmd0aCwgYnVmZmVyIH0gPSBzZXJpYWxpemVNZXNzYWdlKHRhYmxlLnNjaGVtYSkpO1xuICAgIGJ5dGVMZW5ndGggKz0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgeWllbGQgYnVmZmVyO1xuXG4gICAgZm9yIChjb25zdCBbaWQsIGZpZWxkXSBvZiB0YWJsZS5zY2hlbWEuZGljdGlvbmFyaWVzKSB7XG4gICAgICAgIGNvbnN0IHZlYyA9IHRhYmxlLmdldENvbHVtbihmaWVsZC5uYW1lKSBhcyBEaWN0aW9uYXJ5VmVjdG9yO1xuICAgICAgICBpZiAodmVjICYmIHZlYy5kaWN0aW9uYXJ5KSB7XG4gICAgICAgICAgICAoeyBtZXRhZGF0YUxlbmd0aCwgYnVmZmVyIH0gPSBzZXJpYWxpemVEaWN0aW9uYXJ5QmF0Y2godmVjLmRpY3Rpb25hcnksIGlkKSk7XG4gICAgICAgICAgICBkaWN0aW9uYXJ5QmF0Y2hlcy5wdXNoKG5ldyBGaWxlQmxvY2sobWV0YWRhdGFMZW5ndGgsIGJ1ZmZlci5ieXRlTGVuZ3RoLCBieXRlTGVuZ3RoKSk7XG4gICAgICAgICAgICBieXRlTGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICAgICAgeWllbGQgYnVmZmVyO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgcmVjb3JkQmF0Y2ggb2YgdGFibGUuYmF0Y2hlcykge1xuICAgICAgICAoeyBtZXRhZGF0YUxlbmd0aCwgYnVmZmVyIH0gPSBzZXJpYWxpemVSZWNvcmRCYXRjaChyZWNvcmRCYXRjaCkpO1xuICAgICAgICByZWNvcmRCYXRjaGVzLnB1c2gobmV3IEZpbGVCbG9jayhtZXRhZGF0YUxlbmd0aCwgYnVmZmVyLmJ5dGVMZW5ndGgsIGJ5dGVMZW5ndGgpKTtcbiAgICAgICAgYnl0ZUxlbmd0aCArPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgeWllbGQgYnVmZmVyO1xuICAgIH1cblxuICAgIC8vIFRoZW4geWllbGQgdGhlIGZvb3RlciBtZXRhZGF0YSAobm90IGFsaWduZWQpXG4gICAgKHsgbWV0YWRhdGFMZW5ndGgsIGJ1ZmZlciB9ID0gc2VyaWFsaXplRm9vdGVyKG5ldyBGb290ZXIoZGljdGlvbmFyeUJhdGNoZXMsIHJlY29yZEJhdGNoZXMsIHRhYmxlLnNjaGVtYSkpKTtcbiAgICB5aWVsZCBidWZmZXI7XG5cbiAgICAvLyBMYXN0LCB5aWVsZCB0aGUgZm9vdGVyIGxlbmd0aCArIHRlcm1pbmF0aW5nIG1hZ2ljIGFycm93IHN0cmluZyAoYWxpZ25lZClcbiAgICBidWZmZXIgPSBuZXcgVWludDhBcnJheShtYWdpY0FuZFBhZGRpbmcpO1xuICAgIG5ldyBEYXRhVmlldyhidWZmZXIuYnVmZmVyKS5zZXRJbnQzMigwLCBtZXRhZGF0YUxlbmd0aCwgcGxhdGZvcm1Jc0xpdHRsZUVuZGlhbik7XG4gICAgYnVmZmVyLnNldChNQUdJQywgYnVmZmVyLmJ5dGVMZW5ndGggLSBtYWdpY0xlbmd0aCk7XG4gICAgeWllbGQgYnVmZmVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VyaWFsaXplUmVjb3JkQmF0Y2gocmVjb3JkQmF0Y2g6IFJlY29yZEJhdGNoKSB7XG4gICAgY29uc3QgeyBieXRlTGVuZ3RoLCBmaWVsZE5vZGVzLCBidWZmZXJzLCBidWZmZXJzTWV0YSB9ID0gbmV3IFJlY29yZEJhdGNoU2VyaWFsaXplcigpLnZpc2l0UmVjb3JkQmF0Y2gocmVjb3JkQmF0Y2gpO1xuICAgIGNvbnN0IHJiTWV0YSA9IG5ldyBSZWNvcmRCYXRjaE1ldGFkYXRhKE1ldGFkYXRhVmVyc2lvbi5WNCwgcmVjb3JkQmF0Y2gubGVuZ3RoLCBmaWVsZE5vZGVzLCBidWZmZXJzTWV0YSk7XG4gICAgY29uc3QgcmJEYXRhID0gY29uY2F0QnVmZmVyc1dpdGhNZXRhZGF0YShieXRlTGVuZ3RoLCBidWZmZXJzLCBidWZmZXJzTWV0YSk7XG4gICAgcmV0dXJuIHNlcmlhbGl6ZU1lc3NhZ2UocmJNZXRhLCByYkRhdGEpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VyaWFsaXplRGljdGlvbmFyeUJhdGNoKGRpY3Rpb25hcnk6IFZlY3RvciwgaWQ6IExvbmcgfCBudW1iZXIsIGlzRGVsdGE6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgIGNvbnN0IHsgYnl0ZUxlbmd0aCwgZmllbGROb2RlcywgYnVmZmVycywgYnVmZmVyc01ldGEgfSA9IG5ldyBSZWNvcmRCYXRjaFNlcmlhbGl6ZXIoKS52aXNpdFJlY29yZEJhdGNoKFJlY29yZEJhdGNoLmZyb20oW2RpY3Rpb25hcnldKSk7XG4gICAgY29uc3QgcmJNZXRhID0gbmV3IFJlY29yZEJhdGNoTWV0YWRhdGEoTWV0YWRhdGFWZXJzaW9uLlY0LCBkaWN0aW9uYXJ5Lmxlbmd0aCwgZmllbGROb2RlcywgYnVmZmVyc01ldGEpO1xuICAgIGNvbnN0IGRiTWV0YSA9IG5ldyBEaWN0aW9uYXJ5QmF0Y2goTWV0YWRhdGFWZXJzaW9uLlY0LCByYk1ldGEsIGlkLCBpc0RlbHRhKTtcbiAgICBjb25zdCByYkRhdGEgPSBjb25jYXRCdWZmZXJzV2l0aE1ldGFkYXRhKGJ5dGVMZW5ndGgsIGJ1ZmZlcnMsIGJ1ZmZlcnNNZXRhKTtcbiAgICByZXR1cm4gc2VyaWFsaXplTWVzc2FnZShkYk1ldGEsIHJiRGF0YSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVNZXNzYWdlKG1lc3NhZ2U6IE1lc3NhZ2UsIGRhdGE/OiBVaW50OEFycmF5KSB7XG4gICAgY29uc3QgYiA9IG5ldyBCdWlsZGVyKCk7XG4gICAgX01lc3NhZ2UuZmluaXNoTWVzc2FnZUJ1ZmZlcihiLCB3cml0ZU1lc3NhZ2UoYiwgbWVzc2FnZSkpO1xuICAgIC8vIFNsaWNlIG91dCB0aGUgYnVmZmVyIHRoYXQgY29udGFpbnMgdGhlIG1lc3NhZ2UgbWV0YWRhdGFcbiAgICBjb25zdCBtZXRhZGF0YUJ5dGVzID0gYi5hc1VpbnQ4QXJyYXkoKTtcbiAgICAvLyBSZXNlcnZlIDQgYnl0ZXMgZm9yIHdyaXRpbmcgdGhlIG1lc3NhZ2Ugc2l6ZSBhdCB0aGUgZnJvbnQuXG4gICAgLy8gTWV0YWRhdGEgbGVuZ3RoIGluY2x1ZGVzIHRoZSBtZXRhZGF0YSBieXRlTGVuZ3RoICsgdGhlIDRcbiAgICAvLyBieXRlcyBmb3IgdGhlIGxlbmd0aCwgYW5kIHJvdW5kZWQgdXAgdG8gdGhlIG5lYXJlc3QgOCBieXRlcy5cbiAgICBjb25zdCBtZXRhZGF0YUxlbmd0aCA9IGFsaWduKFBBRERJTkcgKyBtZXRhZGF0YUJ5dGVzLmJ5dGVMZW5ndGgsIDgpO1xuICAgIC8vICsgdGhlIGxlbmd0aCBvZiB0aGUgb3B0aW9uYWwgZGF0YSBidWZmZXIgYXQgdGhlIGVuZCwgcGFkZGVkXG4gICAgY29uc3QgZGF0YUJ5dGVMZW5ndGggPSBkYXRhID8gZGF0YS5ieXRlTGVuZ3RoIDogMDtcbiAgICAvLyBlbnN1cmUgdGhlIGVudGlyZSBtZXNzYWdlIGlzIGFsaWduZWQgdG8gYW4gOC1ieXRlIGJvdW5kYXJ5XG4gICAgY29uc3QgbWVzc2FnZUJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoYWxpZ24obWV0YWRhdGFMZW5ndGggKyBkYXRhQnl0ZUxlbmd0aCwgOCkpO1xuICAgIC8vIFdyaXRlIHRoZSBtZXRhZGF0YSBsZW5ndGggaW50byB0aGUgZmlyc3QgNCBieXRlcywgYnV0IHN1YnRyYWN0IHRoZVxuICAgIC8vIGJ5dGVzIHdlIHVzZSB0byBob2xkIHRoZSBsZW5ndGggaXRzZWxmLlxuICAgIG5ldyBEYXRhVmlldyhtZXNzYWdlQnl0ZXMuYnVmZmVyKS5zZXRJbnQzMigwLCBtZXRhZGF0YUxlbmd0aCAtIFBBRERJTkcsIHBsYXRmb3JtSXNMaXR0bGVFbmRpYW4pO1xuICAgIC8vIENvcHkgdGhlIG1ldGFkYXRhIGJ5dGVzIGludG8gdGhlIG1lc3NhZ2UgYnVmZmVyXG4gICAgbWVzc2FnZUJ5dGVzLnNldChtZXRhZGF0YUJ5dGVzLCBQQURESU5HKTtcbiAgICAvLyBDb3B5IHRoZSBvcHRpb25hbCBkYXRhIGJ1ZmZlciBhZnRlciB0aGUgbWV0YWRhdGEgYnl0ZXNcbiAgICAoZGF0YSAmJiBkYXRhQnl0ZUxlbmd0aCA+IDApICYmIG1lc3NhZ2VCeXRlcy5zZXQoZGF0YSwgbWV0YWRhdGFMZW5ndGgpO1xuICAgIC8vIGlmIChtZXNzYWdlQnl0ZXMuYnl0ZUxlbmd0aCAlIDggIT09IDApIHsgZGVidWdnZXI7IH1cbiAgICAvLyBSZXR1cm4gdGhlIG1ldGFkYXRhIGxlbmd0aCBiZWNhdXNlIHdlIG5lZWQgdG8gd3JpdGUgaXQgaW50byBlYWNoIEZpbGVCbG9jayBhbHNvXG4gICAgcmV0dXJuIHsgbWV0YWRhdGFMZW5ndGgsIGJ1ZmZlcjogbWVzc2FnZUJ5dGVzIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVGb290ZXIoZm9vdGVyOiBGb290ZXIpIHtcbiAgICBjb25zdCBiID0gbmV3IEJ1aWxkZXIoKTtcbiAgICBfRm9vdGVyLmZpbmlzaEZvb3RlckJ1ZmZlcihiLCB3cml0ZUZvb3RlcihiLCBmb290ZXIpKTtcbiAgICAvLyBTbGljZSBvdXQgdGhlIGJ1ZmZlciB0aGF0IGNvbnRhaW5zIHRoZSBmb290ZXIgbWV0YWRhdGFcbiAgICBjb25zdCBmb290ZXJCeXRlcyA9IGIuYXNVaW50OEFycmF5KCk7XG4gICAgY29uc3QgbWV0YWRhdGFMZW5ndGggPSBmb290ZXJCeXRlcy5ieXRlTGVuZ3RoO1xuICAgIHJldHVybiB7IG1ldGFkYXRhTGVuZ3RoLCBidWZmZXI6IGZvb3RlckJ5dGVzIH07XG59XG5cbmV4cG9ydCBjbGFzcyBSZWNvcmRCYXRjaFNlcmlhbGl6ZXIgZXh0ZW5kcyBWZWN0b3JWaXNpdG9yIHtcbiAgICBwdWJsaWMgYnl0ZUxlbmd0aCA9IDA7XG4gICAgcHVibGljIGJ1ZmZlcnM6IFR5cGVkQXJyYXlbXSA9IFtdO1xuICAgIHB1YmxpYyBmaWVsZE5vZGVzOiBGaWVsZE1ldGFkYXRhW10gPSBbXTtcbiAgICBwdWJsaWMgYnVmZmVyc01ldGE6IEJ1ZmZlck1ldGFkYXRhW10gPSBbXTtcbiAgICBwdWJsaWMgdmlzaXRSZWNvcmRCYXRjaChyZWNvcmRCYXRjaDogUmVjb3JkQmF0Y2gpIHtcbiAgICAgICAgdGhpcy5idWZmZXJzID0gW107XG4gICAgICAgIHRoaXMuYnl0ZUxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMuZmllbGROb2RlcyA9IFtdO1xuICAgICAgICB0aGlzLmJ1ZmZlcnNNZXRhID0gW107XG4gICAgICAgIGZvciAobGV0IHZlY3RvcjogVmVjdG9yLCBpbmRleCA9IC0xLCBudW1Db2xzID0gcmVjb3JkQmF0Y2gubnVtQ29sczsgKytpbmRleCA8IG51bUNvbHM7KSB7XG4gICAgICAgICAgICBpZiAodmVjdG9yID0gcmVjb3JkQmF0Y2guZ2V0Q2hpbGRBdChpbmRleCkhKSB7XG4gICAgICAgICAgICAgICAgdGhpcy52aXNpdCh2ZWN0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXQ8VCBleHRlbmRzIERhdGFUeXBlPih2ZWN0b3I6IFZlY3RvcjxUPikge1xuICAgICAgICBpZiAoIURhdGFUeXBlLmlzRGljdGlvbmFyeSh2ZWN0b3IudHlwZSkpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGF0YSwgbGVuZ3RoLCBudWxsQ291bnQgfSA9IHZlY3RvcjtcbiAgICAgICAgICAgIGlmIChsZW5ndGggPiAyMTQ3NDgzNjQ3KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0Nhbm5vdCB3cml0ZSBhcnJheXMgbGFyZ2VyIHRoYW4gMl4zMSAtIDEgaW4gbGVuZ3RoJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmZpZWxkTm9kZXMucHVzaChuZXcgRmllbGRNZXRhZGF0YShsZW5ndGgsIG51bGxDb3VudCkpO1xuICAgICAgICAgICAgdGhpcy5hZGRCdWZmZXIobnVsbENvdW50IDw9IDBcbiAgICAgICAgICAgICAgICA/IG5ldyBVaW50OEFycmF5KDApIC8vIHBsYWNlaG9sZGVyIHZhbGlkaXR5IGJ1ZmZlclxuICAgICAgICAgICAgICAgIDogdGhpcy5nZXRUcnVuY2F0ZWRCaXRtYXAoZGF0YS5vZmZzZXQsIGxlbmd0aCwgZGF0YS5udWxsQml0bWFwISlcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN1cGVyLnZpc2l0KHZlY3Rvcik7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdE51bGwgICAgICAgICAgIChfbnVsbHo6IFZlY3RvcjxOdWxsPikgICAgICAgICAgICB7IHJldHVybiB0aGlzOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRCb29sICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8Qm9vbD4pICAgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEJvb2xWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0SW50ICAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPEludD4pICAgICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdEZsb2F0ICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxGbG9hdD4pICAgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRVdGY4ICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8VXRmOD4pICAgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRMaXN0VmVjdG9yKHZlY3Rvcik7ICB9XG4gICAgcHVibGljIHZpc2l0QmluYXJ5ICAgICAgICAgKHZlY3RvcjogVmVjdG9yPEJpbmFyeT4pICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0TGlzdFZlY3Rvcih2ZWN0b3IpOyAgfVxuICAgIHB1YmxpYyB2aXNpdERhdGUgICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxEYXRlXz4pICAgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRUaW1lc3RhbXAgICAgICAodmVjdG9yOiBWZWN0b3I8VGltZXN0YW1wPikgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0VGltZSAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPFRpbWU+KSAgICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdERlY2ltYWwgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxEZWNpbWFsPikgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRJbnRlcnZhbCAgICAgICAodmVjdG9yOiBWZWN0b3I8SW50ZXJ2YWw+KSAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0TGlzdCAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPExpc3Q+KSAgICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRMaXN0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdFN0cnVjdCAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxTdHJ1Y3Q+KSAgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0TmVzdGVkVmVjdG9yKHZlY3Rvcik7ICAgIH1cbiAgICBwdWJsaWMgdmlzaXRGaXhlZFNpemVCaW5hcnkodmVjdG9yOiBWZWN0b3I8Rml4ZWRTaXplQmluYXJ5PikgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0Rml4ZWRTaXplTGlzdCAgKHZlY3RvcjogVmVjdG9yPEZpeGVkU2l6ZUxpc3Q+KSAgIHsgcmV0dXJuIHRoaXMudmlzaXRMaXN0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdE1hcCAgICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxNYXBfPikgICAgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0TmVzdGVkVmVjdG9yKHZlY3Rvcik7ICAgIH1cbiAgICBwdWJsaWMgdmlzaXREaWN0aW9uYXJ5ICAgICAodmVjdG9yOiBEaWN0aW9uYXJ5VmVjdG9yKSAgICAgICAge1xuICAgICAgICAvLyBEaWN0aW9uYXJ5IHdyaXR0ZW4gb3V0IHNlcGFyYXRlbHkuIFNsaWNlIG9mZnNldCBjb250YWluZWQgaW4gdGhlIGluZGljZXNcbiAgICAgICAgcmV0dXJuIHRoaXMudmlzaXQodmVjdG9yLmluZGljZXMpO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRVbmlvbih2ZWN0b3I6IFZlY3RvcjxEZW5zZVVuaW9uIHwgU3BhcnNlVW5pb24+KSB7XG4gICAgICAgIGNvbnN0IHsgZGF0YSwgdHlwZSwgbGVuZ3RoIH0gPSB2ZWN0b3I7XG4gICAgICAgIGNvbnN0IHsgb2Zmc2V0OiBzbGljZU9mZnNldCwgdHlwZUlkcyB9ID0gZGF0YTtcbiAgICAgICAgLy8gQWxsIFVuaW9uIFZlY3RvcnMgaGF2ZSBhIHR5cGVJZHMgYnVmZmVyXG4gICAgICAgIHRoaXMuYWRkQnVmZmVyKHR5cGVJZHMpO1xuICAgICAgICAvLyBJZiB0aGlzIGlzIGEgU3BhcnNlIFVuaW9uLCB0cmVhdCBpdCBsaWtlIGFsbCBvdGhlciBOZXN0ZWQgdHlwZXNcbiAgICAgICAgaWYgKHR5cGUubW9kZSA9PT0gVW5pb25Nb2RlLlNwYXJzZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmlzaXROZXN0ZWRWZWN0b3IodmVjdG9yKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlLm1vZGUgPT09IFVuaW9uTW9kZS5EZW5zZSkge1xuICAgICAgICAgICAgLy8gSWYgdGhpcyBpcyBhIERlbnNlIFVuaW9uLCBhZGQgdGhlIHZhbHVlT2Zmc2V0cyBidWZmZXIgYW5kIHBvdGVudGlhbGx5IHNsaWNlIHRoZSBjaGlsZHJlblxuICAgICAgICAgICAgY29uc3QgdmFsdWVPZmZzZXRzID0gKGRhdGEgYXMgRGVuc2VVbmlvbkRhdGEpLnZhbHVlT2Zmc2V0cztcbiAgICAgICAgICAgIGlmIChzbGljZU9mZnNldCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIFZlY3RvciBoYXNuJ3QgYmVlbiBzbGljZWQsIHdyaXRlIHRoZSBleGlzdGluZyB2YWx1ZU9mZnNldHNcbiAgICAgICAgICAgICAgICB0aGlzLmFkZEJ1ZmZlcih2YWx1ZU9mZnNldHMpO1xuICAgICAgICAgICAgICAgIC8vIFdlIGNhbiB0cmVhdCB0aGlzIGxpa2UgYWxsIG90aGVyIE5lc3RlZCB0eXBlc1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnZpc2l0TmVzdGVkVmVjdG9yKHZlY3Rvcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEEgc2xpY2VkIERlbnNlIFVuaW9uIGlzIGFuIHVucGxlYXNhbnQgY2FzZS4gQmVjYXVzZSB0aGUgb2Zmc2V0cyBhcmUgZGlmZmVyZW50IGZvclxuICAgICAgICAgICAgICAgIC8vIGVhY2ggY2hpbGQgdmVjdG9yLCB3ZSBuZWVkIHRvIFwicmViYXNlXCIgdGhlIHZhbHVlT2Zmc2V0cyBmb3IgZWFjaCBjaGlsZFxuICAgICAgICAgICAgICAgIC8vIFVuaW9uIHR5cGVJZHMgYXJlIG5vdCBuZWNlc3NhcnkgMC1pbmRleGVkXG4gICAgICAgICAgICAgICAgY29uc3QgbWF4Q2hpbGRUeXBlSWQgPSBNYXRoLm1heCguLi50eXBlLnR5cGVJZHMpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkTGVuZ3RocyA9IG5ldyBJbnQzMkFycmF5KG1heENoaWxkVHlwZUlkICsgMSk7XG4gICAgICAgICAgICAgICAgLy8gU2V0IGFsbCB0byAtMSB0byBpbmRpY2F0ZSB0aGF0IHdlIGhhdmVuJ3Qgb2JzZXJ2ZWQgYSBmaXJzdCBvY2N1cnJlbmNlIG9mIGEgcGFydGljdWxhciBjaGlsZCB5ZXRcbiAgICAgICAgICAgICAgICBjb25zdCBjaGlsZE9mZnNldHMgPSBuZXcgSW50MzJBcnJheShtYXhDaGlsZFR5cGVJZCArIDEpLmZpbGwoLTEpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNoaWZ0ZWRPZmZzZXRzID0gbmV3IEludDMyQXJyYXkobGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB1bnNoaWZ0ZWRPZmZzZXRzID0gdGhpcy5nZXRaZXJvQmFzZWRWYWx1ZU9mZnNldHMoc2xpY2VPZmZzZXQsIGxlbmd0aCwgdmFsdWVPZmZzZXRzKTtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCB0eXBlSWQsIHNoaWZ0LCBpbmRleCA9IC0xOyArK2luZGV4IDwgbGVuZ3RoOykge1xuICAgICAgICAgICAgICAgICAgICB0eXBlSWQgPSB0eXBlSWRzW2luZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgLy8gfigtMSkgdXNlZCB0byBiZSBmYXN0ZXIgdGhhbiB4ID09PSAtMSwgc28gbWF5YmUgd29ydGggYmVuY2htYXJraW5nIHRoZSBkaWZmZXJlbmNlIG9mIHRoZXNlIHR3byBpbXBscyBmb3IgbGFyZ2UgZGVuc2UgdW5pb25zOlxuICAgICAgICAgICAgICAgICAgICAvLyB+KHNoaWZ0ID0gY2hpbGRPZmZzZXRzW3R5cGVJZF0pIHx8IChzaGlmdCA9IGNoaWxkT2Zmc2V0c1t0eXBlSWRdID0gdW5zaGlmdGVkT2Zmc2V0c1tpbmRleF0pO1xuICAgICAgICAgICAgICAgICAgICAvLyBHb2luZyB3aXRoIHRoaXMgZm9ybSBmb3Igbm93LCBhcyBpdCdzIG1vcmUgcmVhZGFibGVcbiAgICAgICAgICAgICAgICAgICAgaWYgKChzaGlmdCA9IGNoaWxkT2Zmc2V0c1t0eXBlSWRdKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNoaWZ0ID0gY2hpbGRPZmZzZXRzW3R5cGVJZF0gPSB1bnNoaWZ0ZWRPZmZzZXRzW3R5cGVJZF07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc2hpZnRlZE9mZnNldHNbaW5kZXhdID0gdW5zaGlmdGVkT2Zmc2V0c1tpbmRleF0gLSBzaGlmdDtcbiAgICAgICAgICAgICAgICAgICAgKytjaGlsZExlbmd0aHNbdHlwZUlkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5hZGRCdWZmZXIoc2hpZnRlZE9mZnNldHMpO1xuICAgICAgICAgICAgICAgIC8vIFNsaWNlIGFuZCB2aXNpdCBjaGlsZHJlbiBhY2NvcmRpbmdseVxuICAgICAgICAgICAgICAgIGZvciAobGV0IGNoaWxkSW5kZXggPSAtMSwgbnVtQ2hpbGRyZW4gPSB0eXBlLmNoaWxkcmVuLmxlbmd0aDsgKytjaGlsZEluZGV4IDwgbnVtQ2hpbGRyZW47KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHR5cGVJZCA9IHR5cGUudHlwZUlkc1tjaGlsZEluZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hpbGQgPSAodmVjdG9yIGFzIFVuaW9uVmVjdG9yKS5nZXRDaGlsZEF0KGNoaWxkSW5kZXgpITtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy52aXNpdChjaGlsZC5zbGljZShjaGlsZE9mZnNldHNbdHlwZUlkXSwgTWF0aC5taW4obGVuZ3RoLCBjaGlsZExlbmd0aHNbdHlwZUlkXSkpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHByb3RlY3RlZCB2aXNpdEJvb2xWZWN0b3IodmVjdG9yOiBWZWN0b3I8Qm9vbD4pIHtcbiAgICAgICAgLy8gQm9vbCB2ZWN0b3IgaXMgYSBzcGVjaWFsIGNhc2Ugb2YgRmxhdFZlY3RvciwgYXMgaXRzIGRhdGEgYnVmZmVyIG5lZWRzIHRvIHN0YXkgcGFja2VkXG4gICAgICAgIGxldCBiaXRtYXA6IFVpbnQ4QXJyYXk7XG4gICAgICAgIGxldCB2YWx1ZXMsIHsgZGF0YSwgbGVuZ3RoIH0gPSB2ZWN0b3I7XG4gICAgICAgIGlmICh2ZWN0b3IubnVsbENvdW50ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgLy8gSWYgYWxsIHZhbHVlcyBhcmUgbnVsbCwganVzdCBpbnNlcnQgYSBwbGFjZWhvbGRlciBlbXB0eSBkYXRhIGJ1ZmZlciAoZmFzdGVzdCBwYXRoKVxuICAgICAgICAgICAgYml0bWFwID0gbmV3IFVpbnQ4QXJyYXkoMCk7XG4gICAgICAgIH0gZWxzZSBpZiAoISgodmFsdWVzID0gZGF0YS52YWx1ZXMpIGluc3RhbmNlb2YgVWludDhBcnJheSkpIHtcbiAgICAgICAgICAgIC8vIE90aGVyd2lzZSBpZiB0aGUgdW5kZXJseWluZyBkYXRhICppc24ndCogYSBVaW50OEFycmF5LCBlbnVtZXJhdGVcbiAgICAgICAgICAgIC8vIHRoZSB2YWx1ZXMgYXMgYm9vbHMgYW5kIHJlLXBhY2sgdGhlbSBpbnRvIGEgVWludDhBcnJheSAoc2xvdyBwYXRoKVxuICAgICAgICAgICAgYml0bWFwID0gcGFja0Jvb2xzKHZlY3Rvcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBvdGhlcndpc2UganVzdCBzbGljZSB0aGUgYml0bWFwIChmYXN0IHBhdGgpXG4gICAgICAgICAgICBiaXRtYXAgPSB0aGlzLmdldFRydW5jYXRlZEJpdG1hcChkYXRhLm9mZnNldCwgbGVuZ3RoLCB2YWx1ZXMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmFkZEJ1ZmZlcihiaXRtYXApO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgdmlzaXRGbGF0VmVjdG9yPFQgZXh0ZW5kcyBGbGF0VHlwZT4odmVjdG9yOiBWZWN0b3I8VD4pIHtcbiAgICAgICAgY29uc3QgeyB2aWV3LCBkYXRhIH0gPSB2ZWN0b3I7XG4gICAgICAgIGNvbnN0IHsgb2Zmc2V0LCBsZW5ndGgsIHZhbHVlcyB9ID0gZGF0YTtcbiAgICAgICAgY29uc3Qgc2NhbGVkTGVuZ3RoID0gbGVuZ3RoICogKCh2aWV3IGFzIGFueSkuc2l6ZSB8fCAxKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkQnVmZmVyKHZhbHVlcy5zdWJhcnJheShvZmZzZXQsIHNjYWxlZExlbmd0aCkpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgdmlzaXRGbGF0TGlzdFZlY3RvcjxUIGV4dGVuZHMgRmxhdExpc3RUeXBlPih2ZWN0b3I6IFZlY3RvcjxUPikge1xuICAgICAgICBjb25zdCB7IGRhdGEsIGxlbmd0aCB9ID0gdmVjdG9yO1xuICAgICAgICBjb25zdCB7IG9mZnNldCwgdmFsdWVzLCB2YWx1ZU9mZnNldHMgfSA9IGRhdGE7XG4gICAgICAgIGNvbnN0IGZpcnN0T2Zmc2V0ID0gdmFsdWVPZmZzZXRzWzBdO1xuICAgICAgICBjb25zdCBsYXN0T2Zmc2V0ID0gdmFsdWVPZmZzZXRzW2xlbmd0aF07XG4gICAgICAgIGNvbnN0IGJ5dGVMZW5ndGggPSBNYXRoLm1pbihsYXN0T2Zmc2V0IC0gZmlyc3RPZmZzZXQsIHZhbHVlcy5ieXRlTGVuZ3RoIC0gZmlyc3RPZmZzZXQpO1xuICAgICAgICAvLyBQdXNoIGluIHRoZSBvcmRlciBGbGF0TGlzdCB0eXBlcyByZWFkIHRoZWlyIGJ1ZmZlcnNcbiAgICAgICAgLy8gdmFsdWVPZmZzZXRzIGJ1ZmZlciBmaXJzdFxuICAgICAgICB0aGlzLmFkZEJ1ZmZlcih0aGlzLmdldFplcm9CYXNlZFZhbHVlT2Zmc2V0cyhvZmZzZXQsIGxlbmd0aCwgdmFsdWVPZmZzZXRzKSk7XG4gICAgICAgIC8vIHNsaWNlZCB2YWx1ZXMgYnVmZmVyIHNlY29uZFxuICAgICAgICB0aGlzLmFkZEJ1ZmZlcih2YWx1ZXMuc3ViYXJyYXkoZmlyc3RPZmZzZXQgKyBvZmZzZXQsIGZpcnN0T2Zmc2V0ICsgb2Zmc2V0ICsgYnl0ZUxlbmd0aCkpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHJvdGVjdGVkIHZpc2l0TGlzdFZlY3RvcjxUIGV4dGVuZHMgU2luZ2xlTmVzdGVkVHlwZT4odmVjdG9yOiBWZWN0b3I8VD4pIHtcbiAgICAgICAgY29uc3QgeyBkYXRhLCBsZW5ndGggfSA9IHZlY3RvcjtcbiAgICAgICAgY29uc3QgeyBvZmZzZXQsIHZhbHVlT2Zmc2V0cyB9ID0gPGFueT4gZGF0YTtcbiAgICAgICAgLy8gSWYgd2UgaGF2ZSB2YWx1ZU9mZnNldHMgKExpc3RWZWN0b3IpLCBwdXNoIHRoYXQgYnVmZmVyIGZpcnN0XG4gICAgICAgIGlmICh2YWx1ZU9mZnNldHMpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkQnVmZmVyKHRoaXMuZ2V0WmVyb0Jhc2VkVmFsdWVPZmZzZXRzKG9mZnNldCwgbGVuZ3RoLCB2YWx1ZU9mZnNldHMpKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBUaGVuIGluc2VydCB0aGUgTGlzdCdzIHZhbHVlcyBjaGlsZFxuICAgICAgICByZXR1cm4gdGhpcy52aXNpdCgodmVjdG9yIGFzIGFueSBhcyBMaXN0VmVjdG9yPFQ+KS5nZXRDaGlsZEF0KDApISk7XG4gICAgfVxuICAgIHByb3RlY3RlZCB2aXNpdE5lc3RlZFZlY3RvcjxUIGV4dGVuZHMgTmVzdGVkVHlwZT4odmVjdG9yOiBWZWN0b3I8VD4pIHtcbiAgICAgICAgLy8gVmlzaXQgdGhlIGNoaWxkcmVuIGFjY29yZGluZ2x5XG4gICAgICAgIGNvbnN0IG51bUNoaWxkcmVuID0gKHZlY3Rvci50eXBlLmNoaWxkcmVuIHx8IFtdKS5sZW5ndGg7XG4gICAgICAgIGZvciAobGV0IGNoaWxkOiBWZWN0b3IgfCBudWxsLCBjaGlsZEluZGV4ID0gLTE7ICsrY2hpbGRJbmRleCA8IG51bUNoaWxkcmVuOykge1xuICAgICAgICAgICAgaWYgKGNoaWxkID0gKHZlY3RvciBhcyBOZXN0ZWRWZWN0b3I8VD4pLmdldENoaWxkQXQoY2hpbGRJbmRleCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnZpc2l0KGNoaWxkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHJvdGVjdGVkIGFkZEJ1ZmZlcih2YWx1ZXM6IFR5cGVkQXJyYXkpIHtcbiAgICAgICAgY29uc3QgYnl0ZUxlbmd0aCA9IGFsaWduKHZhbHVlcy5ieXRlTGVuZ3RoLCA4KTtcbiAgICAgICAgdGhpcy5idWZmZXJzLnB1c2godmFsdWVzKTtcbiAgICAgICAgdGhpcy5idWZmZXJzTWV0YS5wdXNoKG5ldyBCdWZmZXJNZXRhZGF0YSh0aGlzLmJ5dGVMZW5ndGgsIGJ5dGVMZW5ndGgpKTtcbiAgICAgICAgdGhpcy5ieXRlTGVuZ3RoICs9IGJ5dGVMZW5ndGg7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgZ2V0VHJ1bmNhdGVkQml0bWFwKG9mZnNldDogbnVtYmVyLCBsZW5ndGg6IG51bWJlciwgYml0bWFwOiBVaW50OEFycmF5KSB7XG4gICAgICAgIGNvbnN0IGFsaWduZWRMZW5ndGggPSBhbGlnbihiaXRtYXAuYnl0ZUxlbmd0aCwgOCk7XG4gICAgICAgIGlmIChvZmZzZXQgPiAwIHx8IGJpdG1hcC5ieXRlTGVuZ3RoIDwgYWxpZ25lZExlbmd0aCkge1xuICAgICAgICAgICAgLy8gV2l0aCBhIHNsaWNlZCBhcnJheSAvIG5vbi16ZXJvIG9mZnNldCwgd2UgaGF2ZSB0byBjb3B5IHRoZSBiaXRtYXBcbiAgICAgICAgICAgIGNvbnN0IGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoYWxpZ25lZExlbmd0aCk7XG4gICAgICAgICAgICBieXRlcy5zZXQoXG4gICAgICAgICAgICAgICAgKG9mZnNldCAlIDggPT09IDApXG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIHNsaWNlIG9mZnNldCBpcyBhbGlnbmVkIHRvIDEgYnl0ZSwgaXQncyBzYWZlIHRvIHNsaWNlIHRoZSBudWxsQml0bWFwIGRpcmVjdGx5XG4gICAgICAgICAgICAgICAgPyBiaXRtYXAuc3ViYXJyYXkob2Zmc2V0ID4+IDMpXG4gICAgICAgICAgICAgICAgLy8gaXRlcmF0ZSBlYWNoIGJpdCBzdGFydGluZyBmcm9tIHRoZSBzbGljZSBvZmZzZXQsIGFuZCByZXBhY2sgaW50byBhbiBhbGlnbmVkIG51bGxCaXRtYXBcbiAgICAgICAgICAgICAgICA6IHBhY2tCb29scyhpdGVyYXRlQml0cyhiaXRtYXAsIG9mZnNldCwgbGVuZ3RoLCBudWxsLCBnZXRCb29sKSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICByZXR1cm4gYnl0ZXM7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGJpdG1hcDtcbiAgICB9XG4gICAgcHJvdGVjdGVkIGdldFplcm9CYXNlZFZhbHVlT2Zmc2V0cyhvZmZzZXQ6IG51bWJlciwgbGVuZ3RoOiBudW1iZXIsIHZhbHVlT2Zmc2V0czogSW50MzJBcnJheSkge1xuICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgbm9uLXplcm8gb2Zmc2V0LCB0aGVuIHRoZSB2YWx1ZSBvZmZzZXRzIGRvIG5vdCBzdGFydCBhdFxuICAgICAgICAvLyB6ZXJvLiBXZSBtdXN0IGEpIGNyZWF0ZSBhIG5ldyBvZmZzZXRzIGFycmF5IHdpdGggc2hpZnRlZCBvZmZzZXRzIGFuZFxuICAgICAgICAvLyBiKSBzbGljZSB0aGUgdmFsdWVzIGFycmF5IGFjY29yZGluZ2x5XG4gICAgICAgIGlmIChvZmZzZXQgPiAwIHx8IHZhbHVlT2Zmc2V0c1swXSAhPT0gMCkge1xuICAgICAgICAgICAgY29uc3Qgc3RhcnRPZmZzZXQgPSB2YWx1ZU9mZnNldHNbMF07XG4gICAgICAgICAgICBjb25zdCBkZXN0T2Zmc2V0cyA9IG5ldyBJbnQzMkFycmF5KGxlbmd0aCArIDEpO1xuICAgICAgICAgICAgZm9yIChsZXQgaW5kZXggPSAtMTsgKytpbmRleCA8IGxlbmd0aDspIHtcbiAgICAgICAgICAgICAgICBkZXN0T2Zmc2V0c1tpbmRleF0gPSB2YWx1ZU9mZnNldHNbaW5kZXhdIC0gc3RhcnRPZmZzZXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBGaW5hbCBvZmZzZXRcbiAgICAgICAgICAgIGRlc3RPZmZzZXRzW2xlbmd0aF0gPSB2YWx1ZU9mZnNldHNbbGVuZ3RoXSAtIHN0YXJ0T2Zmc2V0O1xuICAgICAgICAgICAgcmV0dXJuIGRlc3RPZmZzZXRzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWx1ZU9mZnNldHM7XG4gICAgfVxufVxuXG5pbXBvcnQgeyBmbGF0YnVmZmVycyB9IGZyb20gJ2ZsYXRidWZmZXJzJztcbmltcG9ydCBMb25nID0gZmxhdGJ1ZmZlcnMuTG9uZztcbmltcG9ydCBCdWlsZGVyID0gZmxhdGJ1ZmZlcnMuQnVpbGRlcjtcbmltcG9ydCAqIGFzIEZpbGVfIGZyb20gJy4uLy4uL2ZiL0ZpbGUnO1xuaW1wb3J0ICogYXMgU2NoZW1hXyBmcm9tICcuLi8uLi9mYi9TY2hlbWEnO1xuaW1wb3J0ICogYXMgTWVzc2FnZV8gZnJvbSAnLi4vLi4vZmIvTWVzc2FnZSc7XG5cbmltcG9ydCBfQmxvY2sgPSBGaWxlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuQmxvY2s7XG5pbXBvcnQgX0Zvb3RlciA9IEZpbGVfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5Gb290ZXI7XG5pbXBvcnQgX0ZpZWxkID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRmllbGQ7XG5pbXBvcnQgX1NjaGVtYSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlNjaGVtYTtcbmltcG9ydCBfQnVmZmVyID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuQnVmZmVyO1xuaW1wb3J0IF9NZXNzYWdlID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk1lc3NhZ2U7XG5pbXBvcnQgX0tleVZhbHVlID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuS2V5VmFsdWU7XG5pbXBvcnQgX0ZpZWxkTm9kZSA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaWVsZE5vZGU7XG5pbXBvcnQgX1JlY29yZEJhdGNoID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlJlY29yZEJhdGNoO1xuaW1wb3J0IF9EaWN0aW9uYXJ5QmF0Y2ggPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGljdGlvbmFyeUJhdGNoO1xuaW1wb3J0IF9EaWN0aW9uYXJ5RW5jb2RpbmcgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EaWN0aW9uYXJ5RW5jb2Rpbmc7XG5pbXBvcnQgX0VuZGlhbm5lc3MgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5FbmRpYW5uZXNzO1xuXG5pbXBvcnQgX051bGwgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5OdWxsO1xuaW1wb3J0IF9JbnQgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5JbnQ7XG5pbXBvcnQgX0Zsb2F0aW5nUG9pbnQgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GbG9hdGluZ1BvaW50O1xuaW1wb3J0IF9CaW5hcnkgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5CaW5hcnk7XG5pbXBvcnQgX0Jvb2wgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5Cb29sO1xuaW1wb3J0IF9VdGY4ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVXRmODtcbmltcG9ydCBfRGVjaW1hbCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRlY2ltYWw7XG5pbXBvcnQgX0RhdGUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EYXRlO1xuaW1wb3J0IF9UaW1lID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVGltZTtcbmltcG9ydCBfVGltZXN0YW1wID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVGltZXN0YW1wO1xuaW1wb3J0IF9JbnRlcnZhbCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkludGVydmFsO1xuaW1wb3J0IF9MaXN0ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTGlzdDtcbmltcG9ydCBfU3RydWN0ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuU3RydWN0XztcbmltcG9ydCBfVW5pb24gPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5VbmlvbjtcbmltcG9ydCBfRml4ZWRTaXplQmluYXJ5ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRml4ZWRTaXplQmluYXJ5O1xuaW1wb3J0IF9GaXhlZFNpemVMaXN0ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRml4ZWRTaXplTGlzdDtcbmltcG9ydCBfTWFwID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTWFwO1xuXG5leHBvcnQgY2xhc3MgVHlwZVNlcmlhbGl6ZXIgZXh0ZW5kcyBUeXBlVmlzaXRvciB7XG4gICAgY29uc3RydWN0b3IocHJvdGVjdGVkIGJ1aWxkZXI6IEJ1aWxkZXIpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0TnVsbChfbm9kZTogTnVsbCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX051bGwuc3RhcnROdWxsKGIpIHx8XG4gICAgICAgICAgICBfTnVsbC5lbmROdWxsKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdEludChub2RlOiBJbnQpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9JbnQuc3RhcnRJbnQoYikgfHxcbiAgICAgICAgICAgIF9JbnQuYWRkQml0V2lkdGgoYiwgbm9kZS5iaXRXaWR0aCkgfHxcbiAgICAgICAgICAgIF9JbnQuYWRkSXNTaWduZWQoYiwgbm9kZS5pc1NpZ25lZCkgfHxcbiAgICAgICAgICAgIF9JbnQuZW5kSW50KGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdEZsb2F0KG5vZGU6IEZsb2F0KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfRmxvYXRpbmdQb2ludC5zdGFydEZsb2F0aW5nUG9pbnQoYikgfHxcbiAgICAgICAgICAgIF9GbG9hdGluZ1BvaW50LmFkZFByZWNpc2lvbihiLCBub2RlLnByZWNpc2lvbikgfHxcbiAgICAgICAgICAgIF9GbG9hdGluZ1BvaW50LmVuZEZsb2F0aW5nUG9pbnQoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0QmluYXJ5KF9ub2RlOiBCaW5hcnkpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9CaW5hcnkuc3RhcnRCaW5hcnkoYikgfHxcbiAgICAgICAgICAgIF9CaW5hcnkuZW5kQmluYXJ5KGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdEJvb2woX25vZGU6IEJvb2wpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9Cb29sLnN0YXJ0Qm9vbChiKSB8fFxuICAgICAgICAgICAgX0Jvb2wuZW5kQm9vbChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRVdGY4KF9ub2RlOiBVdGY4KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfVXRmOC5zdGFydFV0ZjgoYikgfHxcbiAgICAgICAgICAgIF9VdGY4LmVuZFV0ZjgoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0RGVjaW1hbChub2RlOiBEZWNpbWFsKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfRGVjaW1hbC5zdGFydERlY2ltYWwoYikgfHxcbiAgICAgICAgICAgIF9EZWNpbWFsLmFkZFNjYWxlKGIsIG5vZGUuc2NhbGUpIHx8XG4gICAgICAgICAgICBfRGVjaW1hbC5hZGRQcmVjaXNpb24oYiwgbm9kZS5wcmVjaXNpb24pIHx8XG4gICAgICAgICAgICBfRGVjaW1hbC5lbmREZWNpbWFsKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdERhdGUobm9kZTogRGF0ZV8pIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIF9EYXRlLnN0YXJ0RGF0ZShiKSB8fCBfRGF0ZS5hZGRVbml0KGIsIG5vZGUudW5pdCkgfHwgX0RhdGUuZW5kRGF0ZShiKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0VGltZShub2RlOiBUaW1lKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfVGltZS5zdGFydFRpbWUoYikgfHxcbiAgICAgICAgICAgIF9UaW1lLmFkZFVuaXQoYiwgbm9kZS51bml0KSB8fFxuICAgICAgICAgICAgX1RpbWUuYWRkQml0V2lkdGgoYiwgbm9kZS5iaXRXaWR0aCkgfHxcbiAgICAgICAgICAgIF9UaW1lLmVuZFRpbWUoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0VGltZXN0YW1wKG5vZGU6IFRpbWVzdGFtcCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICBjb25zdCB0aW1lem9uZSA9IChub2RlLnRpbWV6b25lICYmIGIuY3JlYXRlU3RyaW5nKG5vZGUudGltZXpvbmUpKSB8fCB1bmRlZmluZWQ7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfVGltZXN0YW1wLnN0YXJ0VGltZXN0YW1wKGIpIHx8XG4gICAgICAgICAgICBfVGltZXN0YW1wLmFkZFVuaXQoYiwgbm9kZS51bml0KSB8fFxuICAgICAgICAgICAgKHRpbWV6b25lICE9PSB1bmRlZmluZWQgJiYgX1RpbWVzdGFtcC5hZGRUaW1lem9uZShiLCB0aW1lem9uZSkpIHx8XG4gICAgICAgICAgICBfVGltZXN0YW1wLmVuZFRpbWVzdGFtcChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRJbnRlcnZhbChub2RlOiBJbnRlcnZhbCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0ludGVydmFsLnN0YXJ0SW50ZXJ2YWwoYikgfHwgX0ludGVydmFsLmFkZFVuaXQoYiwgbm9kZS51bml0KSB8fCBfSW50ZXJ2YWwuZW5kSW50ZXJ2YWwoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0TGlzdChfbm9kZTogTGlzdCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0xpc3Quc3RhcnRMaXN0KGIpIHx8XG4gICAgICAgICAgICBfTGlzdC5lbmRMaXN0KGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdFN0cnVjdChfbm9kZTogU3RydWN0KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfU3RydWN0LnN0YXJ0U3RydWN0XyhiKSB8fFxuICAgICAgICAgICAgX1N0cnVjdC5lbmRTdHJ1Y3RfKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdFVuaW9uKG5vZGU6IFVuaW9uKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIGNvbnN0IHR5cGVJZHMgPVxuICAgICAgICAgICAgX1VuaW9uLnN0YXJ0VHlwZUlkc1ZlY3RvcihiLCBub2RlLnR5cGVJZHMubGVuZ3RoKSB8fFxuICAgICAgICAgICAgX1VuaW9uLmNyZWF0ZVR5cGVJZHNWZWN0b3IoYiwgbm9kZS50eXBlSWRzKTtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9Vbmlvbi5zdGFydFVuaW9uKGIpIHx8XG4gICAgICAgICAgICBfVW5pb24uYWRkTW9kZShiLCBub2RlLm1vZGUpIHx8XG4gICAgICAgICAgICBfVW5pb24uYWRkVHlwZUlkcyhiLCB0eXBlSWRzKSB8fFxuICAgICAgICAgICAgX1VuaW9uLmVuZFVuaW9uKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdERpY3Rpb25hcnkobm9kZTogRGljdGlvbmFyeSkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICBjb25zdCBpbmRleFR5cGUgPSB0aGlzLnZpc2l0KG5vZGUuaW5kaWNlcyk7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfRGljdGlvbmFyeUVuY29kaW5nLnN0YXJ0RGljdGlvbmFyeUVuY29kaW5nKGIpIHx8XG4gICAgICAgICAgICBfRGljdGlvbmFyeUVuY29kaW5nLmFkZElkKGIsIG5ldyBMb25nKG5vZGUuaWQsIDApKSB8fFxuICAgICAgICAgICAgX0RpY3Rpb25hcnlFbmNvZGluZy5hZGRJc09yZGVyZWQoYiwgbm9kZS5pc09yZGVyZWQpIHx8XG4gICAgICAgICAgICAoaW5kZXhUeXBlICE9PSB1bmRlZmluZWQgJiYgX0RpY3Rpb25hcnlFbmNvZGluZy5hZGRJbmRleFR5cGUoYiwgaW5kZXhUeXBlKSkgfHxcbiAgICAgICAgICAgIF9EaWN0aW9uYXJ5RW5jb2RpbmcuZW5kRGljdGlvbmFyeUVuY29kaW5nKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdEZpeGVkU2l6ZUJpbmFyeShub2RlOiBGaXhlZFNpemVCaW5hcnkpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9GaXhlZFNpemVCaW5hcnkuc3RhcnRGaXhlZFNpemVCaW5hcnkoYikgfHxcbiAgICAgICAgICAgIF9GaXhlZFNpemVCaW5hcnkuYWRkQnl0ZVdpZHRoKGIsIG5vZGUuYnl0ZVdpZHRoKSB8fFxuICAgICAgICAgICAgX0ZpeGVkU2l6ZUJpbmFyeS5lbmRGaXhlZFNpemVCaW5hcnkoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0Rml4ZWRTaXplTGlzdChub2RlOiBGaXhlZFNpemVMaXN0KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfRml4ZWRTaXplTGlzdC5zdGFydEZpeGVkU2l6ZUxpc3QoYikgfHxcbiAgICAgICAgICAgIF9GaXhlZFNpemVMaXN0LmFkZExpc3RTaXplKGIsIG5vZGUubGlzdFNpemUpIHx8XG4gICAgICAgICAgICBfRml4ZWRTaXplTGlzdC5lbmRGaXhlZFNpemVMaXN0KGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdE1hcChub2RlOiBNYXBfKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfTWFwLnN0YXJ0TWFwKGIpIHx8XG4gICAgICAgICAgICBfTWFwLmFkZEtleXNTb3J0ZWQoYiwgbm9kZS5rZXlzU29ydGVkKSB8fFxuICAgICAgICAgICAgX01hcC5lbmRNYXAoYilcbiAgICAgICAgKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNvbmNhdEJ1ZmZlcnNXaXRoTWV0YWRhdGEodG90YWxCeXRlTGVuZ3RoOiBudW1iZXIsIGJ1ZmZlcnM6IFVpbnQ4QXJyYXlbXSwgYnVmZmVyc01ldGE6IEJ1ZmZlck1ldGFkYXRhW10pIHtcbiAgICBjb25zdCBkYXRhID0gbmV3IFVpbnQ4QXJyYXkodG90YWxCeXRlTGVuZ3RoKTtcbiAgICBmb3IgKGxldCBpID0gLTEsIG4gPSBidWZmZXJzLmxlbmd0aDsgKytpIDwgbjspIHtcbiAgICAgICAgY29uc3QgeyBvZmZzZXQsIGxlbmd0aCB9ID0gYnVmZmVyc01ldGFbaV07XG4gICAgICAgIGNvbnN0IHsgYnVmZmVyLCBieXRlT2Zmc2V0LCBieXRlTGVuZ3RoIH0gPSBidWZmZXJzW2ldO1xuICAgICAgICBjb25zdCByZWFsQnVmZmVyTGVuZ3RoID0gTWF0aC5taW4obGVuZ3RoLCBieXRlTGVuZ3RoKTtcbiAgICAgICAgaWYgKHJlYWxCdWZmZXJMZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBkYXRhLnNldChuZXcgVWludDhBcnJheShidWZmZXIsIGJ5dGVPZmZzZXQsIHJlYWxCdWZmZXJMZW5ndGgpLCBvZmZzZXQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkYXRhO1xufVxuXG5mdW5jdGlvbiB3cml0ZUZvb3RlcihiOiBCdWlsZGVyLCBub2RlOiBGb290ZXIpIHtcbiAgICBsZXQgc2NoZW1hT2Zmc2V0ID0gd3JpdGVTY2hlbWEoYiwgbm9kZS5zY2hlbWEpO1xuICAgIGxldCByZWNvcmRCYXRjaGVzID0gKG5vZGUucmVjb3JkQmF0Y2hlcyB8fCBbXSk7XG4gICAgbGV0IGRpY3Rpb25hcnlCYXRjaGVzID0gKG5vZGUuZGljdGlvbmFyeUJhdGNoZXMgfHwgW10pO1xuICAgIGxldCByZWNvcmRCYXRjaGVzT2Zmc2V0ID1cbiAgICAgICAgX0Zvb3Rlci5zdGFydFJlY29yZEJhdGNoZXNWZWN0b3IoYiwgcmVjb3JkQmF0Y2hlcy5sZW5ndGgpIHx8XG4gICAgICAgICAgICBtYXBSZXZlcnNlKHJlY29yZEJhdGNoZXMsIChyYikgPT4gd3JpdGVCbG9jayhiLCByYikpICYmXG4gICAgICAgIGIuZW5kVmVjdG9yKCk7XG5cbiAgICBsZXQgZGljdGlvbmFyeUJhdGNoZXNPZmZzZXQgPVxuICAgICAgICBfRm9vdGVyLnN0YXJ0RGljdGlvbmFyaWVzVmVjdG9yKGIsIGRpY3Rpb25hcnlCYXRjaGVzLmxlbmd0aCkgfHxcbiAgICAgICAgICAgIG1hcFJldmVyc2UoZGljdGlvbmFyeUJhdGNoZXMsIChkYikgPT4gd3JpdGVCbG9jayhiLCBkYikpICYmXG4gICAgICAgIGIuZW5kVmVjdG9yKCk7XG5cbiAgICByZXR1cm4gKFxuICAgICAgICBfRm9vdGVyLnN0YXJ0Rm9vdGVyKGIpIHx8XG4gICAgICAgIF9Gb290ZXIuYWRkU2NoZW1hKGIsIHNjaGVtYU9mZnNldCkgfHxcbiAgICAgICAgX0Zvb3Rlci5hZGRWZXJzaW9uKGIsIG5vZGUuc2NoZW1hLnZlcnNpb24pIHx8XG4gICAgICAgIF9Gb290ZXIuYWRkUmVjb3JkQmF0Y2hlcyhiLCByZWNvcmRCYXRjaGVzT2Zmc2V0KSB8fFxuICAgICAgICBfRm9vdGVyLmFkZERpY3Rpb25hcmllcyhiLCBkaWN0aW9uYXJ5QmF0Y2hlc09mZnNldCkgfHxcbiAgICAgICAgX0Zvb3Rlci5lbmRGb290ZXIoYilcbiAgICApO1xufVxuXG5mdW5jdGlvbiB3cml0ZUJsb2NrKGI6IEJ1aWxkZXIsIG5vZGU6IEZpbGVCbG9jaykge1xuICAgIHJldHVybiBfQmxvY2suY3JlYXRlQmxvY2soYixcbiAgICAgICAgbmV3IExvbmcobm9kZS5vZmZzZXQsIDApLFxuICAgICAgICBub2RlLm1ldGFEYXRhTGVuZ3RoLFxuICAgICAgICBuZXcgTG9uZyhub2RlLmJvZHlMZW5ndGgsIDApXG4gICAgKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVNZXNzYWdlKGI6IEJ1aWxkZXIsIG5vZGU6IE1lc3NhZ2UpIHtcbiAgICBsZXQgbWVzc2FnZUhlYWRlck9mZnNldCA9IDA7XG4gICAgaWYgKE1lc3NhZ2UuaXNTY2hlbWEobm9kZSkpIHtcbiAgICAgICAgbWVzc2FnZUhlYWRlck9mZnNldCA9IHdyaXRlU2NoZW1hKGIsIG5vZGUgYXMgU2NoZW1hKTtcbiAgICB9IGVsc2UgaWYgKE1lc3NhZ2UuaXNSZWNvcmRCYXRjaChub2RlKSkge1xuICAgICAgICBtZXNzYWdlSGVhZGVyT2Zmc2V0ID0gd3JpdGVSZWNvcmRCYXRjaChiLCBub2RlIGFzIFJlY29yZEJhdGNoTWV0YWRhdGEpO1xuICAgIH0gZWxzZSBpZiAoTWVzc2FnZS5pc0RpY3Rpb25hcnlCYXRjaChub2RlKSkge1xuICAgICAgICBtZXNzYWdlSGVhZGVyT2Zmc2V0ID0gd3JpdGVEaWN0aW9uYXJ5QmF0Y2goYiwgbm9kZSBhcyBEaWN0aW9uYXJ5QmF0Y2gpO1xuICAgIH1cbiAgICByZXR1cm4gKFxuICAgICAgICBfTWVzc2FnZS5zdGFydE1lc3NhZ2UoYikgfHxcbiAgICAgICAgX01lc3NhZ2UuYWRkVmVyc2lvbihiLCBub2RlLnZlcnNpb24pIHx8XG4gICAgICAgIF9NZXNzYWdlLmFkZEhlYWRlcihiLCBtZXNzYWdlSGVhZGVyT2Zmc2V0KSB8fFxuICAgICAgICBfTWVzc2FnZS5hZGRIZWFkZXJUeXBlKGIsIG5vZGUuaGVhZGVyVHlwZSkgfHxcbiAgICAgICAgX01lc3NhZ2UuYWRkQm9keUxlbmd0aChiLCBuZXcgTG9uZyhub2RlLmJvZHlMZW5ndGgsIDApKSB8fFxuICAgICAgICBfTWVzc2FnZS5lbmRNZXNzYWdlKGIpXG4gICAgKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVTY2hlbWEoYjogQnVpbGRlciwgbm9kZTogU2NoZW1hKSB7XG5cbiAgICBjb25zdCBmaWVsZE9mZnNldHMgPSBub2RlLmZpZWxkcy5tYXAoKGYpID0+IHdyaXRlRmllbGQoYiwgZikpO1xuICAgIGNvbnN0IGZpZWxkc09mZnNldCA9XG4gICAgICAgIF9TY2hlbWEuc3RhcnRGaWVsZHNWZWN0b3IoYiwgZmllbGRPZmZzZXRzLmxlbmd0aCkgfHxcbiAgICAgICAgX1NjaGVtYS5jcmVhdGVGaWVsZHNWZWN0b3IoYiwgZmllbGRPZmZzZXRzKTtcblxuICAgIGxldCBtZXRhZGF0YTogbnVtYmVyIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGlmIChub2RlLm1ldGFkYXRhICYmIG5vZGUubWV0YWRhdGEuc2l6ZSA+IDApIHtcbiAgICAgICAgbWV0YWRhdGEgPSBfU2NoZW1hLmNyZWF0ZUN1c3RvbU1ldGFkYXRhVmVjdG9yKFxuICAgICAgICAgICAgYixcbiAgICAgICAgICAgIFsuLi5ub2RlLm1ldGFkYXRhXS5tYXAoKFtrLCB2XSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGIuY3JlYXRlU3RyaW5nKGAke2t9YCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsID0gYi5jcmVhdGVTdHJpbmcoYCR7dn1gKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgICBfS2V5VmFsdWUuc3RhcnRLZXlWYWx1ZShiKSB8fFxuICAgICAgICAgICAgICAgICAgICBfS2V5VmFsdWUuYWRkS2V5KGIsIGtleSkgfHxcbiAgICAgICAgICAgICAgICAgICAgX0tleVZhbHVlLmFkZFZhbHVlKGIsIHZhbCkgfHxcbiAgICAgICAgICAgICAgICAgICAgX0tleVZhbHVlLmVuZEtleVZhbHVlKGIpXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIChcbiAgICAgICAgX1NjaGVtYS5zdGFydFNjaGVtYShiKSB8fFxuICAgICAgICBfU2NoZW1hLmFkZEZpZWxkcyhiLCBmaWVsZHNPZmZzZXQpIHx8XG4gICAgICAgIF9TY2hlbWEuYWRkRW5kaWFubmVzcyhiLCBwbGF0Zm9ybUlzTGl0dGxlRW5kaWFuID8gX0VuZGlhbm5lc3MuTGl0dGxlIDogX0VuZGlhbm5lc3MuQmlnKSB8fFxuICAgICAgICAobWV0YWRhdGEgIT09IHVuZGVmaW5lZCAmJiBfU2NoZW1hLmFkZEN1c3RvbU1ldGFkYXRhKGIsIG1ldGFkYXRhKSkgfHxcbiAgICAgICAgX1NjaGVtYS5lbmRTY2hlbWEoYilcbiAgICApO1xufVxuXG5mdW5jdGlvbiB3cml0ZVJlY29yZEJhdGNoKGI6IEJ1aWxkZXIsIG5vZGU6IFJlY29yZEJhdGNoTWV0YWRhdGEpIHtcbiAgICBsZXQgbm9kZXMgPSAobm9kZS5ub2RlcyB8fCBbXSk7XG4gICAgbGV0IGJ1ZmZlcnMgPSAobm9kZS5idWZmZXJzIHx8IFtdKTtcbiAgICBsZXQgbm9kZXNPZmZzZXQgPVxuICAgICAgICBfUmVjb3JkQmF0Y2guc3RhcnROb2Rlc1ZlY3RvcihiLCBub2Rlcy5sZW5ndGgpIHx8XG4gICAgICAgIG1hcFJldmVyc2Uobm9kZXMsIChuKSA9PiB3cml0ZUZpZWxkTm9kZShiLCBuKSkgJiZcbiAgICAgICAgYi5lbmRWZWN0b3IoKTtcblxuICAgIGxldCBidWZmZXJzT2Zmc2V0ID1cbiAgICAgICAgX1JlY29yZEJhdGNoLnN0YXJ0QnVmZmVyc1ZlY3RvcihiLCBidWZmZXJzLmxlbmd0aCkgfHxcbiAgICAgICAgbWFwUmV2ZXJzZShidWZmZXJzLCAoYl8pID0+IHdyaXRlQnVmZmVyKGIsIGJfKSkgJiZcbiAgICAgICAgYi5lbmRWZWN0b3IoKTtcblxuICAgIHJldHVybiAoXG4gICAgICAgIF9SZWNvcmRCYXRjaC5zdGFydFJlY29yZEJhdGNoKGIpIHx8XG4gICAgICAgIF9SZWNvcmRCYXRjaC5hZGRMZW5ndGgoYiwgbmV3IExvbmcobm9kZS5sZW5ndGgsIDApKSB8fFxuICAgICAgICBfUmVjb3JkQmF0Y2guYWRkTm9kZXMoYiwgbm9kZXNPZmZzZXQpIHx8XG4gICAgICAgIF9SZWNvcmRCYXRjaC5hZGRCdWZmZXJzKGIsIGJ1ZmZlcnNPZmZzZXQpIHx8XG4gICAgICAgIF9SZWNvcmRCYXRjaC5lbmRSZWNvcmRCYXRjaChiKVxuICAgICk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlRGljdGlvbmFyeUJhdGNoKGI6IEJ1aWxkZXIsIG5vZGU6IERpY3Rpb25hcnlCYXRjaCkge1xuICAgIGNvbnN0IGRhdGFPZmZzZXQgPSB3cml0ZVJlY29yZEJhdGNoKGIsIG5vZGUuZGF0YSk7XG4gICAgcmV0dXJuIChcbiAgICAgICAgX0RpY3Rpb25hcnlCYXRjaC5zdGFydERpY3Rpb25hcnlCYXRjaChiKSB8fFxuICAgICAgICBfRGljdGlvbmFyeUJhdGNoLmFkZElkKGIsIG5ldyBMb25nKG5vZGUuaWQsIDApKSB8fFxuICAgICAgICBfRGljdGlvbmFyeUJhdGNoLmFkZElzRGVsdGEoYiwgbm9kZS5pc0RlbHRhKSB8fFxuICAgICAgICBfRGljdGlvbmFyeUJhdGNoLmFkZERhdGEoYiwgZGF0YU9mZnNldCkgfHxcbiAgICAgICAgX0RpY3Rpb25hcnlCYXRjaC5lbmREaWN0aW9uYXJ5QmF0Y2goYilcbiAgICApO1xufVxuXG5mdW5jdGlvbiB3cml0ZUJ1ZmZlcihiOiBCdWlsZGVyLCBub2RlOiBCdWZmZXJNZXRhZGF0YSkge1xuICAgIHJldHVybiBfQnVmZmVyLmNyZWF0ZUJ1ZmZlcihiLCBuZXcgTG9uZyhub2RlLm9mZnNldCwgMCksIG5ldyBMb25nKG5vZGUubGVuZ3RoLCAwKSk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlRmllbGROb2RlKGI6IEJ1aWxkZXIsIG5vZGU6IEZpZWxkTWV0YWRhdGEpIHtcbiAgICByZXR1cm4gX0ZpZWxkTm9kZS5jcmVhdGVGaWVsZE5vZGUoYiwgbmV3IExvbmcobm9kZS5sZW5ndGgsIDApLCBuZXcgTG9uZyhub2RlLm51bGxDb3VudCwgMCkpO1xufVxuXG5mdW5jdGlvbiB3cml0ZUZpZWxkKGI6IEJ1aWxkZXIsIG5vZGU6IEZpZWxkKSB7XG4gICAgbGV0IHR5cGVPZmZzZXQgPSAtMTtcbiAgICBsZXQgdHlwZSA9IG5vZGUudHlwZTtcbiAgICBsZXQgdHlwZUlkID0gbm9kZS50eXBlSWQ7XG4gICAgbGV0IG5hbWU6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBsZXQgbWV0YWRhdGE6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBsZXQgZGljdGlvbmFyeTogbnVtYmVyIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gICAgaWYgKCFEYXRhVHlwZS5pc0RpY3Rpb25hcnkodHlwZSkpIHtcbiAgICAgICAgdHlwZU9mZnNldCA9IG5ldyBUeXBlU2VyaWFsaXplcihiKS52aXNpdCh0eXBlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0eXBlSWQgPSB0eXBlLmRpY3Rpb25hcnkuVFR5cGU7XG4gICAgICAgIGRpY3Rpb25hcnkgPSBuZXcgVHlwZVNlcmlhbGl6ZXIoYikudmlzaXQodHlwZSk7XG4gICAgICAgIHR5cGVPZmZzZXQgPSBuZXcgVHlwZVNlcmlhbGl6ZXIoYikudmlzaXQodHlwZS5kaWN0aW9uYXJ5KTtcbiAgICB9XG5cbiAgICBsZXQgY2hpbGRyZW4gPSBfRmllbGQuY3JlYXRlQ2hpbGRyZW5WZWN0b3IoYiwgKHR5cGUuY2hpbGRyZW4gfHwgW10pLm1hcCgoZikgPT4gd3JpdGVGaWVsZChiLCBmKSkpO1xuICAgIGlmIChub2RlLm1ldGFkYXRhICYmIG5vZGUubWV0YWRhdGEuc2l6ZSA+IDApIHtcbiAgICAgICAgbWV0YWRhdGEgPSBfRmllbGQuY3JlYXRlQ3VzdG9tTWV0YWRhdGFWZWN0b3IoXG4gICAgICAgICAgICBiLFxuICAgICAgICAgICAgWy4uLm5vZGUubWV0YWRhdGFdLm1hcCgoW2ssIHZdKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qga2V5ID0gYi5jcmVhdGVTdHJpbmcoYCR7a31gKTtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWwgPSBiLmNyZWF0ZVN0cmluZyhgJHt2fWApO1xuICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICAgIF9LZXlWYWx1ZS5zdGFydEtleVZhbHVlKGIpIHx8XG4gICAgICAgICAgICAgICAgICAgIF9LZXlWYWx1ZS5hZGRLZXkoYiwga2V5KSB8fFxuICAgICAgICAgICAgICAgICAgICBfS2V5VmFsdWUuYWRkVmFsdWUoYiwgdmFsKSB8fFxuICAgICAgICAgICAgICAgICAgICBfS2V5VmFsdWUuZW5kS2V5VmFsdWUoYilcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG4gICAgaWYgKG5vZGUubmFtZSkge1xuICAgICAgICBuYW1lID0gYi5jcmVhdGVTdHJpbmcobm9kZS5uYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIChcbiAgICAgICAgX0ZpZWxkLnN0YXJ0RmllbGQoYikgfHxcbiAgICAgICAgX0ZpZWxkLmFkZFR5cGUoYiwgdHlwZU9mZnNldCkgfHxcbiAgICAgICAgX0ZpZWxkLmFkZFR5cGVUeXBlKGIsIHR5cGVJZCkgfHxcbiAgICAgICAgX0ZpZWxkLmFkZENoaWxkcmVuKGIsIGNoaWxkcmVuKSB8fFxuICAgICAgICBfRmllbGQuYWRkTnVsbGFibGUoYiwgISFub2RlLm51bGxhYmxlKSB8fFxuICAgICAgICAobmFtZSAhPT0gdW5kZWZpbmVkICYmIF9GaWVsZC5hZGROYW1lKGIsIG5hbWUpKSB8fFxuICAgICAgICAoZGljdGlvbmFyeSAhPT0gdW5kZWZpbmVkICYmIF9GaWVsZC5hZGREaWN0aW9uYXJ5KGIsIGRpY3Rpb25hcnkpKSB8fFxuICAgICAgICAobWV0YWRhdGEgIT09IHVuZGVmaW5lZCAmJiBfRmllbGQuYWRkQ3VzdG9tTWV0YWRhdGEoYiwgbWV0YWRhdGEpKSB8fFxuICAgICAgICBfRmllbGQuZW5kRmllbGQoYilcbiAgICApO1xufVxuXG5mdW5jdGlvbiBtYXBSZXZlcnNlPFQsIFU+KHNvdXJjZTogVFtdLCBjYWxsYmFja2ZuOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IFUpOiBVW10ge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBBcnJheShzb3VyY2UubGVuZ3RoKTtcbiAgICBmb3IgKGxldCBpID0gLTEsIGogPSBzb3VyY2UubGVuZ3RoOyAtLWogPiAtMTspIHtcbiAgICAgICAgcmVzdWx0W2ldID0gY2FsbGJhY2tmbihzb3VyY2Vbal0sIGksIHNvdXJjZSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbmNvbnN0IHBsYXRmb3JtSXNMaXR0bGVFbmRpYW4gPSAoZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKDIpO1xuICAgIG5ldyBEYXRhVmlldyhidWZmZXIpLnNldEludDE2KDAsIDI1NiwgdHJ1ZSAvKiBsaXR0bGVFbmRpYW4gKi8pO1xuICAgIC8vIEludDE2QXJyYXkgdXNlcyB0aGUgcGxhdGZvcm0ncyBlbmRpYW5uZXNzLlxuICAgIHJldHVybiBuZXcgSW50MTZBcnJheShidWZmZXIpWzBdID09PSAyNTY7XG59KSgpO1xuIl19

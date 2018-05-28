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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO0FBQ25ELElBQU8sY0FBYyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDO0FBQ3ZFLElBQU8sT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO0FBQ3pELElBQU8sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQ3JELElBQU8sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQ3JELElBQU8sUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO0FBQzNELElBQU8sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQ3JELElBQU8sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQ3JELElBQU8sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO0FBQy9ELElBQU8sU0FBUyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDO0FBQzdELElBQU8sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQ3JELElBQU8sT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFB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Q0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQztRQUM1QyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDakQsQ0FBQztJQUNELE1BQU0sQ0FBQyxNQUFNLENBQUM7QUFDbEIsQ0FBQztBQUVELE1BQU0sc0JBQXNCLEdBQUcsQ0FBQztJQUM1QixNQUFNLE1BQU0sR0FBRyxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQyxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUMvRCw2Q0FBNkM7SUFDN0MsTUFBTSxDQUFDLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQztBQUM3QyxDQUFDLENBQUMsRUFBRSxDQUFDIiwiZmlsZSI6ImlwYy93cml0ZXIvYmluYXJ5LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IFRhYmxlIH0gZnJvbSAnLi4vLi4vdGFibGUnO1xuaW1wb3J0IHsgRGVuc2VVbmlvbkRhdGEgfSBmcm9tICcuLi8uLi9kYXRhJztcbmltcG9ydCB7IFJlY29yZEJhdGNoIH0gZnJvbSAnLi4vLi4vcmVjb3JkYmF0Y2gnO1xuaW1wb3J0IHsgVmVjdG9yVmlzaXRvciwgVHlwZVZpc2l0b3IgfSBmcm9tICcuLi8uLi92aXNpdG9yJztcbmltcG9ydCB7IE1BR0lDLCBtYWdpY0xlbmd0aCwgbWFnaWNBbmRQYWRkaW5nLCBQQURESU5HIH0gZnJvbSAnLi4vbWFnaWMnO1xuaW1wb3J0IHsgYWxpZ24sIGdldEJvb2wsIHBhY2tCb29scywgaXRlcmF0ZUJpdHMgfSBmcm9tICcuLi8uLi91dGlsL2JpdCc7XG5pbXBvcnQgeyBWZWN0b3IsIFVuaW9uVmVjdG9yLCBEaWN0aW9uYXJ5VmVjdG9yLCBOZXN0ZWRWZWN0b3IsIExpc3RWZWN0b3IgfSBmcm9tICcuLi8uLi92ZWN0b3InO1xuaW1wb3J0IHsgQnVmZmVyTWV0YWRhdGEsIEZpZWxkTWV0YWRhdGEsIEZvb3RlciwgRmlsZUJsb2NrLCBNZXNzYWdlLCBSZWNvcmRCYXRjaE1ldGFkYXRhLCBEaWN0aW9uYXJ5QmF0Y2ggfSBmcm9tICcuLi9tZXRhZGF0YSc7XG5pbXBvcnQge1xuICAgIFNjaGVtYSwgRmllbGQsIFR5cGVkQXJyYXksIE1ldGFkYXRhVmVyc2lvbixcbiAgICBEYXRhVHlwZSxcbiAgICBEaWN0aW9uYXJ5LFxuICAgIE51bGwsIEludCwgRmxvYXQsXG4gICAgQmluYXJ5LCBCb29sLCBVdGY4LCBEZWNpbWFsLFxuICAgIERhdGVfLCBUaW1lLCBUaW1lc3RhbXAsIEludGVydmFsLFxuICAgIExpc3QsIFN0cnVjdCwgVW5pb24sIEZpeGVkU2l6ZUJpbmFyeSwgRml4ZWRTaXplTGlzdCwgTWFwXyxcbiAgICBGbGF0VHlwZSwgRmxhdExpc3RUeXBlLCBOZXN0ZWRUeXBlLCBVbmlvbk1vZGUsIFNwYXJzZVVuaW9uLCBEZW5zZVVuaW9uLCBTaW5nbGVOZXN0ZWRUeXBlLFxufSBmcm9tICcuLi8uLi90eXBlJztcblxuZXhwb3J0IGZ1bmN0aW9uKiBzZXJpYWxpemVTdHJlYW0odGFibGU6IFRhYmxlKSB7XG4gICAgeWllbGQgc2VyaWFsaXplTWVzc2FnZSh0YWJsZS5zY2hlbWEpLmJ1ZmZlcjtcbiAgICBmb3IgKGNvbnN0IFtpZCwgZmllbGRdIG9mIHRhYmxlLnNjaGVtYS5kaWN0aW9uYXJpZXMpIHtcbiAgICAgICAgY29uc3QgdmVjID0gdGFibGUuZ2V0Q29sdW1uKGZpZWxkLm5hbWUpIGFzIERpY3Rpb25hcnlWZWN0b3I7XG4gICAgICAgIGlmICh2ZWMgJiYgdmVjLmRpY3Rpb25hcnkpIHtcbiAgICAgICAgICAgIHlpZWxkIHNlcmlhbGl6ZURpY3Rpb25hcnlCYXRjaCh2ZWMuZGljdGlvbmFyeSwgaWQpLmJ1ZmZlcjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IHJlY29yZEJhdGNoIG9mIHRhYmxlLmJhdGNoZXMpIHtcbiAgICAgICAgeWllbGQgc2VyaWFsaXplUmVjb3JkQmF0Y2gocmVjb3JkQmF0Y2gpLmJ1ZmZlcjtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiogc2VyaWFsaXplRmlsZSh0YWJsZTogVGFibGUpIHtcblxuICAgIGNvbnN0IHJlY29yZEJhdGNoZXMgPSBbXTtcbiAgICBjb25zdCBkaWN0aW9uYXJ5QmF0Y2hlcyA9IFtdO1xuXG4gICAgLy8gRmlyc3QgeWllbGQgdGhlIG1hZ2ljIHN0cmluZyAoYWxpZ25lZClcbiAgICBsZXQgYnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkoYWxpZ24obWFnaWNMZW5ndGgsIDgpKTtcbiAgICBsZXQgbWV0YWRhdGFMZW5ndGgsIGJ5dGVMZW5ndGggPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICBidWZmZXIuc2V0KE1BR0lDLCAwKTtcbiAgICB5aWVsZCBidWZmZXI7XG5cbiAgICAvLyBUaGVuIHlpZWxkIHRoZSBzY2hlbWFcbiAgICAoeyBtZXRhZGF0YUxlbmd0aCwgYnVmZmVyIH0gPSBzZXJpYWxpemVNZXNzYWdlKHRhYmxlLnNjaGVtYSkpO1xuICAgIGJ5dGVMZW5ndGggKz0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgeWllbGQgYnVmZmVyO1xuXG4gICAgZm9yIChjb25zdCBbaWQsIGZpZWxkXSBvZiB0YWJsZS5zY2hlbWEuZGljdGlvbmFyaWVzKSB7XG4gICAgICAgIGNvbnN0IHZlYyA9IHRhYmxlLmdldENvbHVtbihmaWVsZC5uYW1lKSBhcyBEaWN0aW9uYXJ5VmVjdG9yO1xuICAgICAgICBpZiAodmVjICYmIHZlYy5kaWN0aW9uYXJ5KSB7XG4gICAgICAgICAgICAoeyBtZXRhZGF0YUxlbmd0aCwgYnVmZmVyIH0gPSBzZXJpYWxpemVEaWN0aW9uYXJ5QmF0Y2godmVjLmRpY3Rpb25hcnksIGlkKSk7XG4gICAgICAgICAgICBkaWN0aW9uYXJ5QmF0Y2hlcy5wdXNoKG5ldyBGaWxlQmxvY2sobWV0YWRhdGFMZW5ndGgsIGJ1ZmZlci5ieXRlTGVuZ3RoLCBieXRlTGVuZ3RoKSk7XG4gICAgICAgICAgICBieXRlTGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICAgICAgeWllbGQgYnVmZmVyO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgcmVjb3JkQmF0Y2ggb2YgdGFibGUuYmF0Y2hlcykge1xuICAgICAgICAoeyBtZXRhZGF0YUxlbmd0aCwgYnVmZmVyIH0gPSBzZXJpYWxpemVSZWNvcmRCYXRjaChyZWNvcmRCYXRjaCkpO1xuICAgICAgICByZWNvcmRCYXRjaGVzLnB1c2gobmV3IEZpbGVCbG9jayhtZXRhZGF0YUxlbmd0aCwgYnVmZmVyLmJ5dGVMZW5ndGgsIGJ5dGVMZW5ndGgpKTtcbiAgICAgICAgYnl0ZUxlbmd0aCArPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgeWllbGQgYnVmZmVyO1xuICAgIH1cblxuICAgIC8vIFRoZW4geWllbGQgdGhlIGZvb3RlciBtZXRhZGF0YSAobm90IGFsaWduZWQpXG4gICAgKHsgbWV0YWRhdGFMZW5ndGgsIGJ1ZmZlciB9ID0gc2VyaWFsaXplRm9vdGVyKG5ldyBGb290ZXIoZGljdGlvbmFyeUJhdGNoZXMsIHJlY29yZEJhdGNoZXMsIHRhYmxlLnNjaGVtYSkpKTtcbiAgICB5aWVsZCBidWZmZXI7XG4gICAgXG4gICAgLy8gTGFzdCwgeWllbGQgdGhlIGZvb3RlciBsZW5ndGggKyB0ZXJtaW5hdGluZyBtYWdpYyBhcnJvdyBzdHJpbmcgKGFsaWduZWQpXG4gICAgYnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkobWFnaWNBbmRQYWRkaW5nKTtcbiAgICBuZXcgRGF0YVZpZXcoYnVmZmVyLmJ1ZmZlcikuc2V0SW50MzIoMCwgbWV0YWRhdGFMZW5ndGgsIHBsYXRmb3JtSXNMaXR0bGVFbmRpYW4pO1xuICAgIGJ1ZmZlci5zZXQoTUFHSUMsIGJ1ZmZlci5ieXRlTGVuZ3RoIC0gbWFnaWNMZW5ndGgpO1xuICAgIHlpZWxkIGJ1ZmZlcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZVJlY29yZEJhdGNoKHJlY29yZEJhdGNoOiBSZWNvcmRCYXRjaCkge1xuICAgIGNvbnN0IHsgYnl0ZUxlbmd0aCwgZmllbGROb2RlcywgYnVmZmVycywgYnVmZmVyc01ldGEgfSA9IG5ldyBSZWNvcmRCYXRjaFNlcmlhbGl6ZXIoKS52aXNpdFJlY29yZEJhdGNoKHJlY29yZEJhdGNoKTtcbiAgICBjb25zdCByYk1ldGEgPSBuZXcgUmVjb3JkQmF0Y2hNZXRhZGF0YShNZXRhZGF0YVZlcnNpb24uVjQsIHJlY29yZEJhdGNoLmxlbmd0aCwgZmllbGROb2RlcywgYnVmZmVyc01ldGEpO1xuICAgIGNvbnN0IHJiRGF0YSA9IGNvbmNhdEJ1ZmZlcnNXaXRoTWV0YWRhdGEoYnl0ZUxlbmd0aCwgYnVmZmVycywgYnVmZmVyc01ldGEpO1xuICAgIHJldHVybiBzZXJpYWxpemVNZXNzYWdlKHJiTWV0YSwgcmJEYXRhKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZURpY3Rpb25hcnlCYXRjaChkaWN0aW9uYXJ5OiBWZWN0b3IsIGlkOiBMb25nIHwgbnVtYmVyLCBpc0RlbHRhOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICBjb25zdCB7IGJ5dGVMZW5ndGgsIGZpZWxkTm9kZXMsIGJ1ZmZlcnMsIGJ1ZmZlcnNNZXRhIH0gPSBuZXcgUmVjb3JkQmF0Y2hTZXJpYWxpemVyKCkudmlzaXRSZWNvcmRCYXRjaChSZWNvcmRCYXRjaC5mcm9tKFtkaWN0aW9uYXJ5XSkpO1xuICAgIGNvbnN0IHJiTWV0YSA9IG5ldyBSZWNvcmRCYXRjaE1ldGFkYXRhKE1ldGFkYXRhVmVyc2lvbi5WNCwgZGljdGlvbmFyeS5sZW5ndGgsIGZpZWxkTm9kZXMsIGJ1ZmZlcnNNZXRhKTtcbiAgICBjb25zdCBkYk1ldGEgPSBuZXcgRGljdGlvbmFyeUJhdGNoKE1ldGFkYXRhVmVyc2lvbi5WNCwgcmJNZXRhLCBpZCwgaXNEZWx0YSk7XG4gICAgY29uc3QgcmJEYXRhID0gY29uY2F0QnVmZmVyc1dpdGhNZXRhZGF0YShieXRlTGVuZ3RoLCBidWZmZXJzLCBidWZmZXJzTWV0YSk7XG4gICAgcmV0dXJuIHNlcmlhbGl6ZU1lc3NhZ2UoZGJNZXRhLCByYkRhdGEpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VyaWFsaXplTWVzc2FnZShtZXNzYWdlOiBNZXNzYWdlLCBkYXRhPzogVWludDhBcnJheSkge1xuICAgIGNvbnN0IGIgPSBuZXcgQnVpbGRlcigpO1xuICAgIF9NZXNzYWdlLmZpbmlzaE1lc3NhZ2VCdWZmZXIoYiwgd3JpdGVNZXNzYWdlKGIsIG1lc3NhZ2UpKTtcbiAgICAvLyBTbGljZSBvdXQgdGhlIGJ1ZmZlciB0aGF0IGNvbnRhaW5zIHRoZSBtZXNzYWdlIG1ldGFkYXRhXG4gICAgY29uc3QgbWV0YWRhdGFCeXRlcyA9IGIuYXNVaW50OEFycmF5KCk7XG4gICAgLy8gUmVzZXJ2ZSA0IGJ5dGVzIGZvciB3cml0aW5nIHRoZSBtZXNzYWdlIHNpemUgYXQgdGhlIGZyb250LlxuICAgIC8vIE1ldGFkYXRhIGxlbmd0aCBpbmNsdWRlcyB0aGUgbWV0YWRhdGEgYnl0ZUxlbmd0aCArIHRoZSA0XG4gICAgLy8gYnl0ZXMgZm9yIHRoZSBsZW5ndGgsIGFuZCByb3VuZGVkIHVwIHRvIHRoZSBuZWFyZXN0IDggYnl0ZXMuXG4gICAgY29uc3QgbWV0YWRhdGFMZW5ndGggPSBhbGlnbihQQURESU5HICsgbWV0YWRhdGFCeXRlcy5ieXRlTGVuZ3RoLCA4KTtcbiAgICAvLyArIHRoZSBsZW5ndGggb2YgdGhlIG9wdGlvbmFsIGRhdGEgYnVmZmVyIGF0IHRoZSBlbmQsIHBhZGRlZFxuICAgIGNvbnN0IGRhdGFCeXRlTGVuZ3RoID0gZGF0YSA/IGRhdGEuYnl0ZUxlbmd0aCA6IDA7XG4gICAgLy8gZW5zdXJlIHRoZSBlbnRpcmUgbWVzc2FnZSBpcyBhbGlnbmVkIHRvIGFuIDgtYnl0ZSBib3VuZGFyeVxuICAgIGNvbnN0IG1lc3NhZ2VCeXRlcyA9IG5ldyBVaW50OEFycmF5KGFsaWduKG1ldGFkYXRhTGVuZ3RoICsgZGF0YUJ5dGVMZW5ndGgsIDgpKTtcbiAgICAvLyBXcml0ZSB0aGUgbWV0YWRhdGEgbGVuZ3RoIGludG8gdGhlIGZpcnN0IDQgYnl0ZXMsIGJ1dCBzdWJ0cmFjdCB0aGVcbiAgICAvLyBieXRlcyB3ZSB1c2UgdG8gaG9sZCB0aGUgbGVuZ3RoIGl0c2VsZi5cbiAgICBuZXcgRGF0YVZpZXcobWVzc2FnZUJ5dGVzLmJ1ZmZlcikuc2V0SW50MzIoMCwgbWV0YWRhdGFMZW5ndGggLSBQQURESU5HLCBwbGF0Zm9ybUlzTGl0dGxlRW5kaWFuKTtcbiAgICAvLyBDb3B5IHRoZSBtZXRhZGF0YSBieXRlcyBpbnRvIHRoZSBtZXNzYWdlIGJ1ZmZlclxuICAgIG1lc3NhZ2VCeXRlcy5zZXQobWV0YWRhdGFCeXRlcywgUEFERElORyk7XG4gICAgLy8gQ29weSB0aGUgb3B0aW9uYWwgZGF0YSBidWZmZXIgYWZ0ZXIgdGhlIG1ldGFkYXRhIGJ5dGVzXG4gICAgKGRhdGEgJiYgZGF0YUJ5dGVMZW5ndGggPiAwKSAmJiBtZXNzYWdlQnl0ZXMuc2V0KGRhdGEsIG1ldGFkYXRhTGVuZ3RoKTtcbiAgICAvLyBpZiAobWVzc2FnZUJ5dGVzLmJ5dGVMZW5ndGggJSA4ICE9PSAwKSB7IGRlYnVnZ2VyOyB9XG4gICAgLy8gUmV0dXJuIHRoZSBtZXRhZGF0YSBsZW5ndGggYmVjYXVzZSB3ZSBuZWVkIHRvIHdyaXRlIGl0IGludG8gZWFjaCBGaWxlQmxvY2sgYWxzb1xuICAgIHJldHVybiB7IG1ldGFkYXRhTGVuZ3RoLCBidWZmZXI6IG1lc3NhZ2VCeXRlcyB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VyaWFsaXplRm9vdGVyKGZvb3RlcjogRm9vdGVyKSB7XG4gICAgY29uc3QgYiA9IG5ldyBCdWlsZGVyKCk7XG4gICAgX0Zvb3Rlci5maW5pc2hGb290ZXJCdWZmZXIoYiwgd3JpdGVGb290ZXIoYiwgZm9vdGVyKSk7XG4gICAgLy8gU2xpY2Ugb3V0IHRoZSBidWZmZXIgdGhhdCBjb250YWlucyB0aGUgZm9vdGVyIG1ldGFkYXRhXG4gICAgY29uc3QgZm9vdGVyQnl0ZXMgPSBiLmFzVWludDhBcnJheSgpO1xuICAgIGNvbnN0IG1ldGFkYXRhTGVuZ3RoID0gZm9vdGVyQnl0ZXMuYnl0ZUxlbmd0aDtcbiAgICByZXR1cm4geyBtZXRhZGF0YUxlbmd0aCwgYnVmZmVyOiBmb290ZXJCeXRlcyB9O1xufVxuXG5leHBvcnQgY2xhc3MgUmVjb3JkQmF0Y2hTZXJpYWxpemVyIGV4dGVuZHMgVmVjdG9yVmlzaXRvciB7XG4gICAgcHVibGljIGJ5dGVMZW5ndGggPSAwO1xuICAgIHB1YmxpYyBidWZmZXJzOiBUeXBlZEFycmF5W10gPSBbXTtcbiAgICBwdWJsaWMgZmllbGROb2RlczogRmllbGRNZXRhZGF0YVtdID0gW107XG4gICAgcHVibGljIGJ1ZmZlcnNNZXRhOiBCdWZmZXJNZXRhZGF0YVtdID0gW107XG4gICAgcHVibGljIHZpc2l0UmVjb3JkQmF0Y2gocmVjb3JkQmF0Y2g6IFJlY29yZEJhdGNoKSB7XG4gICAgICAgIHRoaXMuYnVmZmVycyA9IFtdO1xuICAgICAgICB0aGlzLmJ5dGVMZW5ndGggPSAwO1xuICAgICAgICB0aGlzLmZpZWxkTm9kZXMgPSBbXTtcbiAgICAgICAgdGhpcy5idWZmZXJzTWV0YSA9IFtdO1xuICAgICAgICBmb3IgKGxldCB2ZWN0b3I6IFZlY3RvciwgaW5kZXggPSAtMSwgbnVtQ29scyA9IHJlY29yZEJhdGNoLm51bUNvbHM7ICsraW5kZXggPCBudW1Db2xzOykge1xuICAgICAgICAgICAgaWYgKHZlY3RvciA9IHJlY29yZEJhdGNoLmdldENoaWxkQXQoaW5kZXgpISkge1xuICAgICAgICAgICAgICAgIHRoaXMudmlzaXQodmVjdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHVibGljIHZpc2l0PFQgZXh0ZW5kcyBEYXRhVHlwZT4odmVjdG9yOiBWZWN0b3I8VD4pIHtcbiAgICAgICAgaWYgKCFEYXRhVHlwZS5pc0RpY3Rpb25hcnkodmVjdG9yLnR5cGUpKSB7XG4gICAgICAgICAgICBjb25zdCB7IGRhdGEsIGxlbmd0aCwgbnVsbENvdW50IH0gPSB2ZWN0b3I7XG4gICAgICAgICAgICBpZiAobGVuZ3RoID4gMjE0NzQ4MzY0Nykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdDYW5ub3Qgd3JpdGUgYXJyYXlzIGxhcmdlciB0aGFuIDJeMzEgLSAxIGluIGxlbmd0aCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5maWVsZE5vZGVzLnB1c2gobmV3IEZpZWxkTWV0YWRhdGEobGVuZ3RoLCBudWxsQ291bnQpKTtcbiAgICAgICAgICAgIHRoaXMuYWRkQnVmZmVyKG51bGxDb3VudCA8PSAwXG4gICAgICAgICAgICAgICAgPyBuZXcgVWludDhBcnJheSgwKSAvLyBwbGFjZWhvbGRlciB2YWxpZGl0eSBidWZmZXJcbiAgICAgICAgICAgICAgICA6IHRoaXMuZ2V0VHJ1bmNhdGVkQml0bWFwKGRhdGEub2Zmc2V0LCBsZW5ndGgsIGRhdGEubnVsbEJpdG1hcCEpXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdXBlci52aXNpdCh2ZWN0b3IpO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXROdWxsICAgICAgICAgICAoX251bGx6OiBWZWN0b3I8TnVsbD4pICAgICAgICAgICAgeyByZXR1cm4gdGhpczsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgcHVibGljIHZpc2l0Qm9vbCAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPEJvb2w+KSAgICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRCb29sVmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdEludCAgICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxJbnQ+KSAgICAgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRGbG9hdCAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8RmxvYXQ+KSAgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0VXRmOCAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPFV0Zjg+KSAgICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0TGlzdFZlY3Rvcih2ZWN0b3IpOyAgfVxuICAgIHB1YmxpYyB2aXNpdEJpbmFyeSAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxCaW5hcnk+KSAgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdExpc3RWZWN0b3IodmVjdG9yKTsgIH1cbiAgICBwdWJsaWMgdmlzaXREYXRlICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8RGF0ZV8+KSAgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0VGltZXN0YW1wICAgICAgKHZlY3RvcjogVmVjdG9yPFRpbWVzdGFtcD4pICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdFRpbWUgICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxUaW1lPikgICAgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXREZWNpbWFsICAgICAgICAodmVjdG9yOiBWZWN0b3I8RGVjaW1hbD4pICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0SW50ZXJ2YWwgICAgICAgKHZlY3RvcjogVmVjdG9yPEludGVydmFsPikgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdExpc3QgICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxMaXN0PikgICAgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0TGlzdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRTdHJ1Y3QgICAgICAgICAodmVjdG9yOiBWZWN0b3I8U3RydWN0PikgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdE5lc3RlZFZlY3Rvcih2ZWN0b3IpOyAgICB9XG4gICAgcHVibGljIHZpc2l0Rml4ZWRTaXplQmluYXJ5KHZlY3RvcjogVmVjdG9yPEZpeGVkU2l6ZUJpbmFyeT4pIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdEZpeGVkU2l6ZUxpc3QgICh2ZWN0b3I6IFZlY3RvcjxGaXhlZFNpemVMaXN0PikgICB7IHJldHVybiB0aGlzLnZpc2l0TGlzdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRNYXAgICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8TWFwXz4pICAgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdE5lc3RlZFZlY3Rvcih2ZWN0b3IpOyAgICB9XG4gICAgcHVibGljIHZpc2l0RGljdGlvbmFyeSAgICAgKHZlY3RvcjogRGljdGlvbmFyeVZlY3RvcikgICAgICAgIHtcbiAgICAgICAgLy8gRGljdGlvbmFyeSB3cml0dGVuIG91dCBzZXBhcmF0ZWx5LiBTbGljZSBvZmZzZXQgY29udGFpbmVkIGluIHRoZSBpbmRpY2VzXG4gICAgICAgIHJldHVybiB0aGlzLnZpc2l0KHZlY3Rvci5pbmRpY2VzKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0VW5pb24odmVjdG9yOiBWZWN0b3I8RGVuc2VVbmlvbiB8IFNwYXJzZVVuaW9uPikge1xuICAgICAgICBjb25zdCB7IGRhdGEsIHR5cGUsIGxlbmd0aCB9ID0gdmVjdG9yO1xuICAgICAgICBjb25zdCB7IG9mZnNldDogc2xpY2VPZmZzZXQsIHR5cGVJZHMgfSA9IGRhdGE7XG4gICAgICAgIC8vIEFsbCBVbmlvbiBWZWN0b3JzIGhhdmUgYSB0eXBlSWRzIGJ1ZmZlclxuICAgICAgICB0aGlzLmFkZEJ1ZmZlcih0eXBlSWRzKTtcbiAgICAgICAgLy8gSWYgdGhpcyBpcyBhIFNwYXJzZSBVbmlvbiwgdHJlYXQgaXQgbGlrZSBhbGwgb3RoZXIgTmVzdGVkIHR5cGVzXG4gICAgICAgIGlmICh0eXBlLm1vZGUgPT09IFVuaW9uTW9kZS5TcGFyc2UpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZpc2l0TmVzdGVkVmVjdG9yKHZlY3Rvcik7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZS5tb2RlID09PSBVbmlvbk1vZGUuRGVuc2UpIHtcbiAgICAgICAgICAgIC8vIElmIHRoaXMgaXMgYSBEZW5zZSBVbmlvbiwgYWRkIHRoZSB2YWx1ZU9mZnNldHMgYnVmZmVyIGFuZCBwb3RlbnRpYWxseSBzbGljZSB0aGUgY2hpbGRyZW5cbiAgICAgICAgICAgIGNvbnN0IHZhbHVlT2Zmc2V0cyA9IChkYXRhIGFzIERlbnNlVW5pb25EYXRhKS52YWx1ZU9mZnNldHM7XG4gICAgICAgICAgICBpZiAoc2xpY2VPZmZzZXQgPD0gMCkge1xuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBWZWN0b3IgaGFzbid0IGJlZW4gc2xpY2VkLCB3cml0ZSB0aGUgZXhpc3RpbmcgdmFsdWVPZmZzZXRzXG4gICAgICAgICAgICAgICAgdGhpcy5hZGRCdWZmZXIodmFsdWVPZmZzZXRzKTtcbiAgICAgICAgICAgICAgICAvLyBXZSBjYW4gdHJlYXQgdGhpcyBsaWtlIGFsbCBvdGhlciBOZXN0ZWQgdHlwZXNcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy52aXNpdE5lc3RlZFZlY3Rvcih2ZWN0b3IpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBBIHNsaWNlZCBEZW5zZSBVbmlvbiBpcyBhbiB1bnBsZWFzYW50IGNhc2UuIEJlY2F1c2UgdGhlIG9mZnNldHMgYXJlIGRpZmZlcmVudCBmb3JcbiAgICAgICAgICAgICAgICAvLyBlYWNoIGNoaWxkIHZlY3Rvciwgd2UgbmVlZCB0byBcInJlYmFzZVwiIHRoZSB2YWx1ZU9mZnNldHMgZm9yIGVhY2ggY2hpbGRcbiAgICAgICAgICAgICAgICAvLyBVbmlvbiB0eXBlSWRzIGFyZSBub3QgbmVjZXNzYXJ5IDAtaW5kZXhlZFxuICAgICAgICAgICAgICAgIGNvbnN0IG1heENoaWxkVHlwZUlkID0gTWF0aC5tYXgoLi4udHlwZS50eXBlSWRzKTtcbiAgICAgICAgICAgICAgICBjb25zdCBjaGlsZExlbmd0aHMgPSBuZXcgSW50MzJBcnJheShtYXhDaGlsZFR5cGVJZCArIDEpO1xuICAgICAgICAgICAgICAgIC8vIFNldCBhbGwgdG8gLTEgdG8gaW5kaWNhdGUgdGhhdCB3ZSBoYXZlbid0IG9ic2VydmVkIGEgZmlyc3Qgb2NjdXJyZW5jZSBvZiBhIHBhcnRpY3VsYXIgY2hpbGQgeWV0XG4gICAgICAgICAgICAgICAgY29uc3QgY2hpbGRPZmZzZXRzID0gbmV3IEludDMyQXJyYXkobWF4Q2hpbGRUeXBlSWQgKyAxKS5maWxsKC0xKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzaGlmdGVkT2Zmc2V0cyA9IG5ldyBJbnQzMkFycmF5KGxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdW5zaGlmdGVkT2Zmc2V0cyA9IHRoaXMuZ2V0WmVyb0Jhc2VkVmFsdWVPZmZzZXRzKHNsaWNlT2Zmc2V0LCBsZW5ndGgsIHZhbHVlT2Zmc2V0cyk7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgdHlwZUlkLCBzaGlmdCwgaW5kZXggPSAtMTsgKytpbmRleCA8IGxlbmd0aDspIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZUlkID0gdHlwZUlkc1tpbmRleF07XG4gICAgICAgICAgICAgICAgICAgIC8vIH4oLTEpIHVzZWQgdG8gYmUgZmFzdGVyIHRoYW4geCA9PT0gLTEsIHNvIG1heWJlIHdvcnRoIGJlbmNobWFya2luZyB0aGUgZGlmZmVyZW5jZSBvZiB0aGVzZSB0d28gaW1wbHMgZm9yIGxhcmdlIGRlbnNlIHVuaW9uczpcbiAgICAgICAgICAgICAgICAgICAgLy8gfihzaGlmdCA9IGNoaWxkT2Zmc2V0c1t0eXBlSWRdKSB8fCAoc2hpZnQgPSBjaGlsZE9mZnNldHNbdHlwZUlkXSA9IHVuc2hpZnRlZE9mZnNldHNbaW5kZXhdKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gR29pbmcgd2l0aCB0aGlzIGZvcm0gZm9yIG5vdywgYXMgaXQncyBtb3JlIHJlYWRhYmxlXG4gICAgICAgICAgICAgICAgICAgIGlmICgoc2hpZnQgPSBjaGlsZE9mZnNldHNbdHlwZUlkXSkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaGlmdCA9IGNoaWxkT2Zmc2V0c1t0eXBlSWRdID0gdW5zaGlmdGVkT2Zmc2V0c1t0eXBlSWRdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHNoaWZ0ZWRPZmZzZXRzW2luZGV4XSA9IHVuc2hpZnRlZE9mZnNldHNbaW5kZXhdIC0gc2hpZnQ7XG4gICAgICAgICAgICAgICAgICAgICsrY2hpbGRMZW5ndGhzW3R5cGVJZF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuYWRkQnVmZmVyKHNoaWZ0ZWRPZmZzZXRzKTtcbiAgICAgICAgICAgICAgICAvLyBTbGljZSBhbmQgdmlzaXQgY2hpbGRyZW4gYWNjb3JkaW5nbHlcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjaGlsZEluZGV4ID0gLTEsIG51bUNoaWxkcmVuID0gdHlwZS5jaGlsZHJlbi5sZW5ndGg7ICsrY2hpbGRJbmRleCA8IG51bUNoaWxkcmVuOykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0eXBlSWQgPSB0eXBlLnR5cGVJZHNbY2hpbGRJbmRleF07XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkID0gKHZlY3RvciBhcyBVbmlvblZlY3RvcikuZ2V0Q2hpbGRBdChjaGlsZEluZGV4KSE7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudmlzaXQoY2hpbGQuc2xpY2UoY2hpbGRPZmZzZXRzW3R5cGVJZF0sIE1hdGgubWluKGxlbmd0aCwgY2hpbGRMZW5ndGhzW3R5cGVJZF0pKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgdmlzaXRCb29sVmVjdG9yKHZlY3RvcjogVmVjdG9yPEJvb2w+KSB7XG4gICAgICAgIC8vIEJvb2wgdmVjdG9yIGlzIGEgc3BlY2lhbCBjYXNlIG9mIEZsYXRWZWN0b3IsIGFzIGl0cyBkYXRhIGJ1ZmZlciBuZWVkcyB0byBzdGF5IHBhY2tlZFxuICAgICAgICBsZXQgYml0bWFwOiBVaW50OEFycmF5O1xuICAgICAgICBsZXQgdmFsdWVzLCB7IGRhdGEsIGxlbmd0aCB9ID0gdmVjdG9yO1xuICAgICAgICBpZiAodmVjdG9yLm51bGxDb3VudCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIElmIGFsbCB2YWx1ZXMgYXJlIG51bGwsIGp1c3QgaW5zZXJ0IGEgcGxhY2Vob2xkZXIgZW1wdHkgZGF0YSBidWZmZXIgKGZhc3Rlc3QgcGF0aClcbiAgICAgICAgICAgIGJpdG1hcCA9IG5ldyBVaW50OEFycmF5KDApO1xuICAgICAgICB9IGVsc2UgaWYgKCEoKHZhbHVlcyA9IGRhdGEudmFsdWVzKSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkpKSB7XG4gICAgICAgICAgICAvLyBPdGhlcndpc2UgaWYgdGhlIHVuZGVybHlpbmcgZGF0YSAqaXNuJ3QqIGEgVWludDhBcnJheSwgZW51bWVyYXRlXG4gICAgICAgICAgICAvLyB0aGUgdmFsdWVzIGFzIGJvb2xzIGFuZCByZS1wYWNrIHRoZW0gaW50byBhIFVpbnQ4QXJyYXkgKHNsb3cgcGF0aClcbiAgICAgICAgICAgIGJpdG1hcCA9IHBhY2tCb29scyh2ZWN0b3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlIGp1c3Qgc2xpY2UgdGhlIGJpdG1hcCAoZmFzdCBwYXRoKVxuICAgICAgICAgICAgYml0bWFwID0gdGhpcy5nZXRUcnVuY2F0ZWRCaXRtYXAoZGF0YS5vZmZzZXQsIGxlbmd0aCwgdmFsdWVzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5hZGRCdWZmZXIoYml0bWFwKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHZpc2l0RmxhdFZlY3RvcjxUIGV4dGVuZHMgRmxhdFR5cGU+KHZlY3RvcjogVmVjdG9yPFQ+KSB7XG4gICAgICAgIGNvbnN0IHsgdmlldywgZGF0YSB9ID0gdmVjdG9yO1xuICAgICAgICBjb25zdCB7IG9mZnNldCwgbGVuZ3RoLCB2YWx1ZXMgfSA9IGRhdGE7XG4gICAgICAgIGNvbnN0IHNjYWxlZExlbmd0aCA9IGxlbmd0aCAqICgodmlldyBhcyBhbnkpLnNpemUgfHwgMSk7XG4gICAgICAgIHJldHVybiB0aGlzLmFkZEJ1ZmZlcih2YWx1ZXMuc3ViYXJyYXkob2Zmc2V0LCBzY2FsZWRMZW5ndGgpKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHZpc2l0RmxhdExpc3RWZWN0b3I8VCBleHRlbmRzIEZsYXRMaXN0VHlwZT4odmVjdG9yOiBWZWN0b3I8VD4pIHtcbiAgICAgICAgY29uc3QgeyBkYXRhLCBsZW5ndGggfSA9IHZlY3RvcjtcbiAgICAgICAgY29uc3QgeyBvZmZzZXQsIHZhbHVlcywgdmFsdWVPZmZzZXRzIH0gPSBkYXRhO1xuICAgICAgICBjb25zdCBmaXJzdE9mZnNldCA9IHZhbHVlT2Zmc2V0c1swXTtcbiAgICAgICAgY29uc3QgbGFzdE9mZnNldCA9IHZhbHVlT2Zmc2V0c1tsZW5ndGhdO1xuICAgICAgICBjb25zdCBieXRlTGVuZ3RoID0gTWF0aC5taW4obGFzdE9mZnNldCAtIGZpcnN0T2Zmc2V0LCB2YWx1ZXMuYnl0ZUxlbmd0aCAtIGZpcnN0T2Zmc2V0KTtcbiAgICAgICAgLy8gUHVzaCBpbiB0aGUgb3JkZXIgRmxhdExpc3QgdHlwZXMgcmVhZCB0aGVpciBidWZmZXJzXG4gICAgICAgIC8vIHZhbHVlT2Zmc2V0cyBidWZmZXIgZmlyc3RcbiAgICAgICAgdGhpcy5hZGRCdWZmZXIodGhpcy5nZXRaZXJvQmFzZWRWYWx1ZU9mZnNldHMob2Zmc2V0LCBsZW5ndGgsIHZhbHVlT2Zmc2V0cykpO1xuICAgICAgICAvLyBzbGljZWQgdmFsdWVzIGJ1ZmZlciBzZWNvbmRcbiAgICAgICAgdGhpcy5hZGRCdWZmZXIodmFsdWVzLnN1YmFycmF5KGZpcnN0T2Zmc2V0ICsgb2Zmc2V0LCBmaXJzdE9mZnNldCArIG9mZnNldCArIGJ5dGVMZW5ndGgpKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHByb3RlY3RlZCB2aXNpdExpc3RWZWN0b3I8VCBleHRlbmRzIFNpbmdsZU5lc3RlZFR5cGU+KHZlY3RvcjogVmVjdG9yPFQ+KSB7XG4gICAgICAgIGNvbnN0IHsgZGF0YSwgbGVuZ3RoIH0gPSB2ZWN0b3I7XG4gICAgICAgIGNvbnN0IHsgb2Zmc2V0LCB2YWx1ZU9mZnNldHMgfSA9IDxhbnk+IGRhdGE7XG4gICAgICAgIC8vIElmIHdlIGhhdmUgdmFsdWVPZmZzZXRzIChMaXN0VmVjdG9yKSwgcHVzaCB0aGF0IGJ1ZmZlciBmaXJzdFxuICAgICAgICBpZiAodmFsdWVPZmZzZXRzKSB7XG4gICAgICAgICAgICB0aGlzLmFkZEJ1ZmZlcih0aGlzLmdldFplcm9CYXNlZFZhbHVlT2Zmc2V0cyhvZmZzZXQsIGxlbmd0aCwgdmFsdWVPZmZzZXRzKSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGhlbiBpbnNlcnQgdGhlIExpc3QncyB2YWx1ZXMgY2hpbGRcbiAgICAgICAgcmV0dXJuIHRoaXMudmlzaXQoKHZlY3RvciBhcyBhbnkgYXMgTGlzdFZlY3RvcjxUPikuZ2V0Q2hpbGRBdCgwKSEpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgdmlzaXROZXN0ZWRWZWN0b3I8VCBleHRlbmRzIE5lc3RlZFR5cGU+KHZlY3RvcjogVmVjdG9yPFQ+KSB7XG4gICAgICAgIC8vIFZpc2l0IHRoZSBjaGlsZHJlbiBhY2NvcmRpbmdseVxuICAgICAgICBjb25zdCBudW1DaGlsZHJlbiA9ICh2ZWN0b3IudHlwZS5jaGlsZHJlbiB8fCBbXSkubGVuZ3RoO1xuICAgICAgICBmb3IgKGxldCBjaGlsZDogVmVjdG9yIHwgbnVsbCwgY2hpbGRJbmRleCA9IC0xOyArK2NoaWxkSW5kZXggPCBudW1DaGlsZHJlbjspIHtcbiAgICAgICAgICAgIGlmIChjaGlsZCA9ICh2ZWN0b3IgYXMgTmVzdGVkVmVjdG9yPFQ+KS5nZXRDaGlsZEF0KGNoaWxkSW5kZXgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy52aXNpdChjaGlsZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHByb3RlY3RlZCBhZGRCdWZmZXIodmFsdWVzOiBUeXBlZEFycmF5KSB7XG4gICAgICAgIGNvbnN0IGJ5dGVMZW5ndGggPSBhbGlnbih2YWx1ZXMuYnl0ZUxlbmd0aCwgOCk7XG4gICAgICAgIHRoaXMuYnVmZmVycy5wdXNoKHZhbHVlcyk7XG4gICAgICAgIHRoaXMuYnVmZmVyc01ldGEucHVzaChuZXcgQnVmZmVyTWV0YWRhdGEodGhpcy5ieXRlTGVuZ3RoLCBieXRlTGVuZ3RoKSk7XG4gICAgICAgIHRoaXMuYnl0ZUxlbmd0aCArPSBieXRlTGVuZ3RoO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHJvdGVjdGVkIGdldFRydW5jYXRlZEJpdG1hcChvZmZzZXQ6IG51bWJlciwgbGVuZ3RoOiBudW1iZXIsIGJpdG1hcDogVWludDhBcnJheSkge1xuICAgICAgICBjb25zdCBhbGlnbmVkTGVuZ3RoID0gYWxpZ24oYml0bWFwLmJ5dGVMZW5ndGgsIDgpO1xuICAgICAgICBpZiAob2Zmc2V0ID4gMCB8fCBiaXRtYXAuYnl0ZUxlbmd0aCA8IGFsaWduZWRMZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIFdpdGggYSBzbGljZWQgYXJyYXkgLyBub24temVybyBvZmZzZXQsIHdlIGhhdmUgdG8gY29weSB0aGUgYml0bWFwXG4gICAgICAgICAgICBjb25zdCBieXRlcyA9IG5ldyBVaW50OEFycmF5KGFsaWduZWRMZW5ndGgpO1xuICAgICAgICAgICAgYnl0ZXMuc2V0KFxuICAgICAgICAgICAgICAgIChvZmZzZXQgJSA4ID09PSAwKVxuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBzbGljZSBvZmZzZXQgaXMgYWxpZ25lZCB0byAxIGJ5dGUsIGl0J3Mgc2FmZSB0byBzbGljZSB0aGUgbnVsbEJpdG1hcCBkaXJlY3RseVxuICAgICAgICAgICAgICAgID8gYml0bWFwLnN1YmFycmF5KG9mZnNldCA+PiAzKVxuICAgICAgICAgICAgICAgIC8vIGl0ZXJhdGUgZWFjaCBiaXQgc3RhcnRpbmcgZnJvbSB0aGUgc2xpY2Ugb2Zmc2V0LCBhbmQgcmVwYWNrIGludG8gYW4gYWxpZ25lZCBudWxsQml0bWFwXG4gICAgICAgICAgICAgICAgOiBwYWNrQm9vbHMoaXRlcmF0ZUJpdHMoYml0bWFwLCBvZmZzZXQsIGxlbmd0aCwgbnVsbCwgZ2V0Qm9vbCkpXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgcmV0dXJuIGJ5dGVzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBiaXRtYXA7XG4gICAgfVxuICAgIHByb3RlY3RlZCBnZXRaZXJvQmFzZWRWYWx1ZU9mZnNldHMob2Zmc2V0OiBudW1iZXIsIGxlbmd0aDogbnVtYmVyLCB2YWx1ZU9mZnNldHM6IEludDMyQXJyYXkpIHtcbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIG5vbi16ZXJvIG9mZnNldCwgdGhlbiB0aGUgdmFsdWUgb2Zmc2V0cyBkbyBub3Qgc3RhcnQgYXRcbiAgICAgICAgLy8gemVyby4gV2UgbXVzdCBhKSBjcmVhdGUgYSBuZXcgb2Zmc2V0cyBhcnJheSB3aXRoIHNoaWZ0ZWQgb2Zmc2V0cyBhbmRcbiAgICAgICAgLy8gYikgc2xpY2UgdGhlIHZhbHVlcyBhcnJheSBhY2NvcmRpbmdseVxuICAgICAgICBpZiAob2Zmc2V0ID4gMCB8fCB2YWx1ZU9mZnNldHNbMF0gIT09IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0T2Zmc2V0ID0gdmFsdWVPZmZzZXRzWzBdO1xuICAgICAgICAgICAgY29uc3QgZGVzdE9mZnNldHMgPSBuZXcgSW50MzJBcnJheShsZW5ndGggKyAxKTtcbiAgICAgICAgICAgIGZvciAobGV0IGluZGV4ID0gLTE7ICsraW5kZXggPCBsZW5ndGg7KSB7XG4gICAgICAgICAgICAgICAgZGVzdE9mZnNldHNbaW5kZXhdID0gdmFsdWVPZmZzZXRzW2luZGV4XSAtIHN0YXJ0T2Zmc2V0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRmluYWwgb2Zmc2V0XG4gICAgICAgICAgICBkZXN0T2Zmc2V0c1tsZW5ndGhdID0gdmFsdWVPZmZzZXRzW2xlbmd0aF0gLSBzdGFydE9mZnNldDtcbiAgICAgICAgICAgIHJldHVybiBkZXN0T2Zmc2V0cztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsdWVPZmZzZXRzO1xuICAgIH1cbn1cblxuaW1wb3J0IHsgZmxhdGJ1ZmZlcnMgfSBmcm9tICdmbGF0YnVmZmVycyc7XG5pbXBvcnQgTG9uZyA9IGZsYXRidWZmZXJzLkxvbmc7XG5pbXBvcnQgQnVpbGRlciA9IGZsYXRidWZmZXJzLkJ1aWxkZXI7XG5pbXBvcnQgKiBhcyBGaWxlXyBmcm9tICcuLi8uLi9mYi9GaWxlJztcbmltcG9ydCAqIGFzIFNjaGVtYV8gZnJvbSAnLi4vLi4vZmIvU2NoZW1hJztcbmltcG9ydCAqIGFzIE1lc3NhZ2VfIGZyb20gJy4uLy4uL2ZiL01lc3NhZ2UnO1xuXG5pbXBvcnQgX0Jsb2NrID0gRmlsZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkJsb2NrO1xuaW1wb3J0IF9Gb290ZXIgPSBGaWxlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRm9vdGVyO1xuaW1wb3J0IF9GaWVsZCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpZWxkO1xuaW1wb3J0IF9TY2hlbWEgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5TY2hlbWE7XG5pbXBvcnQgX0J1ZmZlciA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkJ1ZmZlcjtcbmltcG9ydCBfTWVzc2FnZSA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NZXNzYWdlO1xuaW1wb3J0IF9LZXlWYWx1ZSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLktleVZhbHVlO1xuaW1wb3J0IF9GaWVsZE5vZGUgPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRmllbGROb2RlO1xuaW1wb3J0IF9SZWNvcmRCYXRjaCA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5SZWNvcmRCYXRjaDtcbmltcG9ydCBfRGljdGlvbmFyeUJhdGNoID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRpY3Rpb25hcnlCYXRjaDtcbmltcG9ydCBfRGljdGlvbmFyeUVuY29kaW5nID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGljdGlvbmFyeUVuY29kaW5nO1xuaW1wb3J0IF9FbmRpYW5uZXNzID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRW5kaWFubmVzcztcblxuaW1wb3J0IF9OdWxsID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTnVsbDtcbmltcG9ydCBfSW50ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuSW50O1xuaW1wb3J0IF9GbG9hdGluZ1BvaW50ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRmxvYXRpbmdQb2ludDtcbmltcG9ydCBfQmluYXJ5ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuQmluYXJ5O1xuaW1wb3J0IF9Cb29sID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuQm9vbDtcbmltcG9ydCBfVXRmOCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlV0Zjg7XG5pbXBvcnQgX0RlY2ltYWwgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EZWNpbWFsO1xuaW1wb3J0IF9EYXRlID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGF0ZTtcbmltcG9ydCBfVGltZSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlRpbWU7XG5pbXBvcnQgX1RpbWVzdGFtcCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlRpbWVzdGFtcDtcbmltcG9ydCBfSW50ZXJ2YWwgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5JbnRlcnZhbDtcbmltcG9ydCBfTGlzdCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkxpc3Q7XG5pbXBvcnQgX1N0cnVjdCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlN0cnVjdF87XG5pbXBvcnQgX1VuaW9uID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVW5pb247XG5pbXBvcnQgX0ZpeGVkU2l6ZUJpbmFyeSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpeGVkU2l6ZUJpbmFyeTtcbmltcG9ydCBfRml4ZWRTaXplTGlzdCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpeGVkU2l6ZUxpc3Q7XG5pbXBvcnQgX01hcCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk1hcDtcblxuZXhwb3J0IGNsYXNzIFR5cGVTZXJpYWxpemVyIGV4dGVuZHMgVHlwZVZpc2l0b3Ige1xuICAgIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBidWlsZGVyOiBCdWlsZGVyKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdE51bGwoX25vZGU6IE51bGwpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9OdWxsLnN0YXJ0TnVsbChiKSB8fFxuICAgICAgICAgICAgX051bGwuZW5kTnVsbChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRJbnQobm9kZTogSW50KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfSW50LnN0YXJ0SW50KGIpIHx8XG4gICAgICAgICAgICBfSW50LmFkZEJpdFdpZHRoKGIsIG5vZGUuYml0V2lkdGgpIHx8XG4gICAgICAgICAgICBfSW50LmFkZElzU2lnbmVkKGIsIG5vZGUuaXNTaWduZWQpIHx8XG4gICAgICAgICAgICBfSW50LmVuZEludChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRGbG9hdChub2RlOiBGbG9hdCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0Zsb2F0aW5nUG9pbnQuc3RhcnRGbG9hdGluZ1BvaW50KGIpIHx8XG4gICAgICAgICAgICBfRmxvYXRpbmdQb2ludC5hZGRQcmVjaXNpb24oYiwgbm9kZS5wcmVjaXNpb24pIHx8XG4gICAgICAgICAgICBfRmxvYXRpbmdQb2ludC5lbmRGbG9hdGluZ1BvaW50KGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdEJpbmFyeShfbm9kZTogQmluYXJ5KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfQmluYXJ5LnN0YXJ0QmluYXJ5KGIpIHx8XG4gICAgICAgICAgICBfQmluYXJ5LmVuZEJpbmFyeShiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRCb29sKF9ub2RlOiBCb29sKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfQm9vbC5zdGFydEJvb2woYikgfHxcbiAgICAgICAgICAgIF9Cb29sLmVuZEJvb2woYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0VXRmOChfbm9kZTogVXRmOCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX1V0Zjguc3RhcnRVdGY4KGIpIHx8XG4gICAgICAgICAgICBfVXRmOC5lbmRVdGY4KGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdERlY2ltYWwobm9kZTogRGVjaW1hbCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0RlY2ltYWwuc3RhcnREZWNpbWFsKGIpIHx8XG4gICAgICAgICAgICBfRGVjaW1hbC5hZGRTY2FsZShiLCBub2RlLnNjYWxlKSB8fFxuICAgICAgICAgICAgX0RlY2ltYWwuYWRkUHJlY2lzaW9uKGIsIG5vZGUucHJlY2lzaW9uKSB8fFxuICAgICAgICAgICAgX0RlY2ltYWwuZW5kRGVjaW1hbChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXREYXRlKG5vZGU6IERhdGVfKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiBfRGF0ZS5zdGFydERhdGUoYikgfHwgX0RhdGUuYWRkVW5pdChiLCBub2RlLnVuaXQpIHx8IF9EYXRlLmVuZERhdGUoYik7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdFRpbWUobm9kZTogVGltZSkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX1RpbWUuc3RhcnRUaW1lKGIpIHx8XG4gICAgICAgICAgICBfVGltZS5hZGRVbml0KGIsIG5vZGUudW5pdCkgfHxcbiAgICAgICAgICAgIF9UaW1lLmFkZEJpdFdpZHRoKGIsIG5vZGUuYml0V2lkdGgpIHx8XG4gICAgICAgICAgICBfVGltZS5lbmRUaW1lKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdFRpbWVzdGFtcChub2RlOiBUaW1lc3RhbXApIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgY29uc3QgdGltZXpvbmUgPSAobm9kZS50aW1lem9uZSAmJiBiLmNyZWF0ZVN0cmluZyhub2RlLnRpbWV6b25lKSkgfHwgdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX1RpbWVzdGFtcC5zdGFydFRpbWVzdGFtcChiKSB8fFxuICAgICAgICAgICAgX1RpbWVzdGFtcC5hZGRVbml0KGIsIG5vZGUudW5pdCkgfHxcbiAgICAgICAgICAgICh0aW1lem9uZSAhPT0gdW5kZWZpbmVkICYmIF9UaW1lc3RhbXAuYWRkVGltZXpvbmUoYiwgdGltZXpvbmUpKSB8fFxuICAgICAgICAgICAgX1RpbWVzdGFtcC5lbmRUaW1lc3RhbXAoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0SW50ZXJ2YWwobm9kZTogSW50ZXJ2YWwpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9JbnRlcnZhbC5zdGFydEludGVydmFsKGIpIHx8IF9JbnRlcnZhbC5hZGRVbml0KGIsIG5vZGUudW5pdCkgfHwgX0ludGVydmFsLmVuZEludGVydmFsKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdExpc3QoX25vZGU6IExpc3QpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9MaXN0LnN0YXJ0TGlzdChiKSB8fFxuICAgICAgICAgICAgX0xpc3QuZW5kTGlzdChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRTdHJ1Y3QoX25vZGU6IFN0cnVjdCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX1N0cnVjdC5zdGFydFN0cnVjdF8oYikgfHxcbiAgICAgICAgICAgIF9TdHJ1Y3QuZW5kU3RydWN0XyhiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRVbmlvbihub2RlOiBVbmlvbikge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICBjb25zdCB0eXBlSWRzID1cbiAgICAgICAgICAgIF9Vbmlvbi5zdGFydFR5cGVJZHNWZWN0b3IoYiwgbm9kZS50eXBlSWRzLmxlbmd0aCkgfHxcbiAgICAgICAgICAgIF9Vbmlvbi5jcmVhdGVUeXBlSWRzVmVjdG9yKGIsIG5vZGUudHlwZUlkcyk7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfVW5pb24uc3RhcnRVbmlvbihiKSB8fFxuICAgICAgICAgICAgX1VuaW9uLmFkZE1vZGUoYiwgbm9kZS5tb2RlKSB8fFxuICAgICAgICAgICAgX1VuaW9uLmFkZFR5cGVJZHMoYiwgdHlwZUlkcykgfHxcbiAgICAgICAgICAgIF9Vbmlvbi5lbmRVbmlvbihiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXREaWN0aW9uYXJ5KG5vZGU6IERpY3Rpb25hcnkpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgY29uc3QgaW5kZXhUeXBlID0gdGhpcy52aXNpdChub2RlLmluZGljZXMpO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0RpY3Rpb25hcnlFbmNvZGluZy5zdGFydERpY3Rpb25hcnlFbmNvZGluZyhiKSB8fFxuICAgICAgICAgICAgX0RpY3Rpb25hcnlFbmNvZGluZy5hZGRJZChiLCBuZXcgTG9uZyhub2RlLmlkLCAwKSkgfHxcbiAgICAgICAgICAgIF9EaWN0aW9uYXJ5RW5jb2RpbmcuYWRkSXNPcmRlcmVkKGIsIG5vZGUuaXNPcmRlcmVkKSB8fFxuICAgICAgICAgICAgKGluZGV4VHlwZSAhPT0gdW5kZWZpbmVkICYmIF9EaWN0aW9uYXJ5RW5jb2RpbmcuYWRkSW5kZXhUeXBlKGIsIGluZGV4VHlwZSkpIHx8XG4gICAgICAgICAgICBfRGljdGlvbmFyeUVuY29kaW5nLmVuZERpY3Rpb25hcnlFbmNvZGluZyhiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRGaXhlZFNpemVCaW5hcnkobm9kZTogRml4ZWRTaXplQmluYXJ5KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfRml4ZWRTaXplQmluYXJ5LnN0YXJ0Rml4ZWRTaXplQmluYXJ5KGIpIHx8XG4gICAgICAgICAgICBfRml4ZWRTaXplQmluYXJ5LmFkZEJ5dGVXaWR0aChiLCBub2RlLmJ5dGVXaWR0aCkgfHxcbiAgICAgICAgICAgIF9GaXhlZFNpemVCaW5hcnkuZW5kRml4ZWRTaXplQmluYXJ5KGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdEZpeGVkU2l6ZUxpc3Qobm9kZTogRml4ZWRTaXplTGlzdCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0ZpeGVkU2l6ZUxpc3Quc3RhcnRGaXhlZFNpemVMaXN0KGIpIHx8XG4gICAgICAgICAgICBfRml4ZWRTaXplTGlzdC5hZGRMaXN0U2l6ZShiLCBub2RlLmxpc3RTaXplKSB8fFxuICAgICAgICAgICAgX0ZpeGVkU2l6ZUxpc3QuZW5kRml4ZWRTaXplTGlzdChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRNYXAobm9kZTogTWFwXykge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX01hcC5zdGFydE1hcChiKSB8fFxuICAgICAgICAgICAgX01hcC5hZGRLZXlzU29ydGVkKGIsIG5vZGUua2V5c1NvcnRlZCkgfHxcbiAgICAgICAgICAgIF9NYXAuZW5kTWFwKGIpXG4gICAgICAgICk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBjb25jYXRCdWZmZXJzV2l0aE1ldGFkYXRhKHRvdGFsQnl0ZUxlbmd0aDogbnVtYmVyLCBidWZmZXJzOiBVaW50OEFycmF5W10sIGJ1ZmZlcnNNZXRhOiBCdWZmZXJNZXRhZGF0YVtdKSB7XG4gICAgY29uc3QgZGF0YSA9IG5ldyBVaW50OEFycmF5KHRvdGFsQnl0ZUxlbmd0aCk7XG4gICAgZm9yIChsZXQgaSA9IC0xLCBuID0gYnVmZmVycy5sZW5ndGg7ICsraSA8IG47KSB7XG4gICAgICAgIGNvbnN0IHsgb2Zmc2V0LCBsZW5ndGggfSA9IGJ1ZmZlcnNNZXRhW2ldO1xuICAgICAgICBjb25zdCB7IGJ1ZmZlciwgYnl0ZU9mZnNldCwgYnl0ZUxlbmd0aCB9ID0gYnVmZmVyc1tpXTtcbiAgICAgICAgY29uc3QgcmVhbEJ1ZmZlckxlbmd0aCA9IE1hdGgubWluKGxlbmd0aCwgYnl0ZUxlbmd0aCk7XG4gICAgICAgIGlmIChyZWFsQnVmZmVyTGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgZGF0YS5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyLCBieXRlT2Zmc2V0LCByZWFsQnVmZmVyTGVuZ3RoKSwgb2Zmc2V0KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbn1cblxuZnVuY3Rpb24gd3JpdGVGb290ZXIoYjogQnVpbGRlciwgbm9kZTogRm9vdGVyKSB7XG4gICAgbGV0IHNjaGVtYU9mZnNldCA9IHdyaXRlU2NoZW1hKGIsIG5vZGUuc2NoZW1hKTtcbiAgICBsZXQgcmVjb3JkQmF0Y2hlcyA9IChub2RlLnJlY29yZEJhdGNoZXMgfHwgW10pO1xuICAgIGxldCBkaWN0aW9uYXJ5QmF0Y2hlcyA9IChub2RlLmRpY3Rpb25hcnlCYXRjaGVzIHx8IFtdKTtcbiAgICBsZXQgcmVjb3JkQmF0Y2hlc09mZnNldCA9XG4gICAgICAgIF9Gb290ZXIuc3RhcnRSZWNvcmRCYXRjaGVzVmVjdG9yKGIsIHJlY29yZEJhdGNoZXMubGVuZ3RoKSB8fFxuICAgICAgICAgICAgbWFwUmV2ZXJzZShyZWNvcmRCYXRjaGVzLCAocmIpID0+IHdyaXRlQmxvY2soYiwgcmIpKSAmJlxuICAgICAgICBiLmVuZFZlY3RvcigpO1xuXG4gICAgbGV0IGRpY3Rpb25hcnlCYXRjaGVzT2Zmc2V0ID1cbiAgICAgICAgX0Zvb3Rlci5zdGFydERpY3Rpb25hcmllc1ZlY3RvcihiLCBkaWN0aW9uYXJ5QmF0Y2hlcy5sZW5ndGgpIHx8XG4gICAgICAgICAgICBtYXBSZXZlcnNlKGRpY3Rpb25hcnlCYXRjaGVzLCAoZGIpID0+IHdyaXRlQmxvY2soYiwgZGIpKSAmJlxuICAgICAgICBiLmVuZFZlY3RvcigpO1xuXG4gICAgcmV0dXJuIChcbiAgICAgICAgX0Zvb3Rlci5zdGFydEZvb3RlcihiKSB8fFxuICAgICAgICBfRm9vdGVyLmFkZFNjaGVtYShiLCBzY2hlbWFPZmZzZXQpIHx8XG4gICAgICAgIF9Gb290ZXIuYWRkVmVyc2lvbihiLCBub2RlLnNjaGVtYS52ZXJzaW9uKSB8fFxuICAgICAgICBfRm9vdGVyLmFkZFJlY29yZEJhdGNoZXMoYiwgcmVjb3JkQmF0Y2hlc09mZnNldCkgfHxcbiAgICAgICAgX0Zvb3Rlci5hZGREaWN0aW9uYXJpZXMoYiwgZGljdGlvbmFyeUJhdGNoZXNPZmZzZXQpIHx8XG4gICAgICAgIF9Gb290ZXIuZW5kRm9vdGVyKGIpXG4gICAgKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVCbG9jayhiOiBCdWlsZGVyLCBub2RlOiBGaWxlQmxvY2spIHtcbiAgICByZXR1cm4gX0Jsb2NrLmNyZWF0ZUJsb2NrKGIsXG4gICAgICAgIG5ldyBMb25nKG5vZGUub2Zmc2V0LCAwKSxcbiAgICAgICAgbm9kZS5tZXRhRGF0YUxlbmd0aCxcbiAgICAgICAgbmV3IExvbmcobm9kZS5ib2R5TGVuZ3RoLCAwKVxuICAgICk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlTWVzc2FnZShiOiBCdWlsZGVyLCBub2RlOiBNZXNzYWdlKSB7XG4gICAgbGV0IG1lc3NhZ2VIZWFkZXJPZmZzZXQgPSAwO1xuICAgIGlmIChNZXNzYWdlLmlzU2NoZW1hKG5vZGUpKSB7XG4gICAgICAgIG1lc3NhZ2VIZWFkZXJPZmZzZXQgPSB3cml0ZVNjaGVtYShiLCBub2RlIGFzIFNjaGVtYSk7XG4gICAgfSBlbHNlIGlmIChNZXNzYWdlLmlzUmVjb3JkQmF0Y2gobm9kZSkpIHtcbiAgICAgICAgbWVzc2FnZUhlYWRlck9mZnNldCA9IHdyaXRlUmVjb3JkQmF0Y2goYiwgbm9kZSBhcyBSZWNvcmRCYXRjaE1ldGFkYXRhKTtcbiAgICB9IGVsc2UgaWYgKE1lc3NhZ2UuaXNEaWN0aW9uYXJ5QmF0Y2gobm9kZSkpIHtcbiAgICAgICAgbWVzc2FnZUhlYWRlck9mZnNldCA9IHdyaXRlRGljdGlvbmFyeUJhdGNoKGIsIG5vZGUgYXMgRGljdGlvbmFyeUJhdGNoKTtcbiAgICB9XG4gICAgcmV0dXJuIChcbiAgICAgICAgX01lc3NhZ2Uuc3RhcnRNZXNzYWdlKGIpIHx8XG4gICAgICAgIF9NZXNzYWdlLmFkZFZlcnNpb24oYiwgbm9kZS52ZXJzaW9uKSB8fFxuICAgICAgICBfTWVzc2FnZS5hZGRIZWFkZXIoYiwgbWVzc2FnZUhlYWRlck9mZnNldCkgfHxcbiAgICAgICAgX01lc3NhZ2UuYWRkSGVhZGVyVHlwZShiLCBub2RlLmhlYWRlclR5cGUpIHx8XG4gICAgICAgIF9NZXNzYWdlLmFkZEJvZHlMZW5ndGgoYiwgbmV3IExvbmcobm9kZS5ib2R5TGVuZ3RoLCAwKSkgfHxcbiAgICAgICAgX01lc3NhZ2UuZW5kTWVzc2FnZShiKVxuICAgICk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlU2NoZW1hKGI6IEJ1aWxkZXIsIG5vZGU6IFNjaGVtYSkge1xuXG4gICAgY29uc3QgZmllbGRPZmZzZXRzID0gbm9kZS5maWVsZHMubWFwKChmKSA9PiB3cml0ZUZpZWxkKGIsIGYpKTtcbiAgICBjb25zdCBmaWVsZHNPZmZzZXQgPVxuICAgICAgICBfU2NoZW1hLnN0YXJ0RmllbGRzVmVjdG9yKGIsIGZpZWxkT2Zmc2V0cy5sZW5ndGgpIHx8XG4gICAgICAgIF9TY2hlbWEuY3JlYXRlRmllbGRzVmVjdG9yKGIsIGZpZWxkT2Zmc2V0cyk7XG5cbiAgICBsZXQgbWV0YWRhdGE6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAobm9kZS5tZXRhZGF0YSAmJiBub2RlLm1ldGFkYXRhLnNpemUgPiAwKSB7XG4gICAgICAgIG1ldGFkYXRhID0gX1NjaGVtYS5jcmVhdGVDdXN0b21NZXRhZGF0YVZlY3RvcihcbiAgICAgICAgICAgIGIsXG4gICAgICAgICAgICBbLi4ubm9kZS5tZXRhZGF0YV0ubWFwKChbaywgdl0pID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBrZXkgPSBiLmNyZWF0ZVN0cmluZyhgJHtrfWApO1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IGIuY3JlYXRlU3RyaW5nKGAke3Z9YCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgICAgX0tleVZhbHVlLnN0YXJ0S2V5VmFsdWUoYikgfHxcbiAgICAgICAgICAgICAgICAgICAgX0tleVZhbHVlLmFkZEtleShiLCBrZXkpIHx8XG4gICAgICAgICAgICAgICAgICAgIF9LZXlWYWx1ZS5hZGRWYWx1ZShiLCB2YWwpIHx8XG4gICAgICAgICAgICAgICAgICAgIF9LZXlWYWx1ZS5lbmRLZXlWYWx1ZShiKVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiAoXG4gICAgICAgIF9TY2hlbWEuc3RhcnRTY2hlbWEoYikgfHxcbiAgICAgICAgX1NjaGVtYS5hZGRGaWVsZHMoYiwgZmllbGRzT2Zmc2V0KSB8fFxuICAgICAgICBfU2NoZW1hLmFkZEVuZGlhbm5lc3MoYiwgcGxhdGZvcm1Jc0xpdHRsZUVuZGlhbiA/IF9FbmRpYW5uZXNzLkxpdHRsZSA6IF9FbmRpYW5uZXNzLkJpZykgfHxcbiAgICAgICAgKG1ldGFkYXRhICE9PSB1bmRlZmluZWQgJiYgX1NjaGVtYS5hZGRDdXN0b21NZXRhZGF0YShiLCBtZXRhZGF0YSkpIHx8XG4gICAgICAgIF9TY2hlbWEuZW5kU2NoZW1hKGIpXG4gICAgKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVSZWNvcmRCYXRjaChiOiBCdWlsZGVyLCBub2RlOiBSZWNvcmRCYXRjaE1ldGFkYXRhKSB7XG4gICAgbGV0IG5vZGVzID0gKG5vZGUubm9kZXMgfHwgW10pO1xuICAgIGxldCBidWZmZXJzID0gKG5vZGUuYnVmZmVycyB8fCBbXSk7XG4gICAgbGV0IG5vZGVzT2Zmc2V0ID1cbiAgICAgICAgX1JlY29yZEJhdGNoLnN0YXJ0Tm9kZXNWZWN0b3IoYiwgbm9kZXMubGVuZ3RoKSB8fFxuICAgICAgICBtYXBSZXZlcnNlKG5vZGVzLCAobikgPT4gd3JpdGVGaWVsZE5vZGUoYiwgbikpICYmXG4gICAgICAgIGIuZW5kVmVjdG9yKCk7XG5cbiAgICBsZXQgYnVmZmVyc09mZnNldCA9XG4gICAgICAgIF9SZWNvcmRCYXRjaC5zdGFydEJ1ZmZlcnNWZWN0b3IoYiwgYnVmZmVycy5sZW5ndGgpIHx8XG4gICAgICAgIG1hcFJldmVyc2UoYnVmZmVycywgKGJfKSA9PiB3cml0ZUJ1ZmZlcihiLCBiXykpICYmXG4gICAgICAgIGIuZW5kVmVjdG9yKCk7XG5cbiAgICByZXR1cm4gKFxuICAgICAgICBfUmVjb3JkQmF0Y2guc3RhcnRSZWNvcmRCYXRjaChiKSB8fFxuICAgICAgICBfUmVjb3JkQmF0Y2guYWRkTGVuZ3RoKGIsIG5ldyBMb25nKG5vZGUubGVuZ3RoLCAwKSkgfHxcbiAgICAgICAgX1JlY29yZEJhdGNoLmFkZE5vZGVzKGIsIG5vZGVzT2Zmc2V0KSB8fFxuICAgICAgICBfUmVjb3JkQmF0Y2guYWRkQnVmZmVycyhiLCBidWZmZXJzT2Zmc2V0KSB8fFxuICAgICAgICBfUmVjb3JkQmF0Y2guZW5kUmVjb3JkQmF0Y2goYilcbiAgICApO1xufVxuXG5mdW5jdGlvbiB3cml0ZURpY3Rpb25hcnlCYXRjaChiOiBCdWlsZGVyLCBub2RlOiBEaWN0aW9uYXJ5QmF0Y2gpIHtcbiAgICBjb25zdCBkYXRhT2Zmc2V0ID0gd3JpdGVSZWNvcmRCYXRjaChiLCBub2RlLmRhdGEpO1xuICAgIHJldHVybiAoXG4gICAgICAgIF9EaWN0aW9uYXJ5QmF0Y2guc3RhcnREaWN0aW9uYXJ5QmF0Y2goYikgfHxcbiAgICAgICAgX0RpY3Rpb25hcnlCYXRjaC5hZGRJZChiLCBuZXcgTG9uZyhub2RlLmlkLCAwKSkgfHxcbiAgICAgICAgX0RpY3Rpb25hcnlCYXRjaC5hZGRJc0RlbHRhKGIsIG5vZGUuaXNEZWx0YSkgfHxcbiAgICAgICAgX0RpY3Rpb25hcnlCYXRjaC5hZGREYXRhKGIsIGRhdGFPZmZzZXQpIHx8XG4gICAgICAgIF9EaWN0aW9uYXJ5QmF0Y2guZW5kRGljdGlvbmFyeUJhdGNoKGIpXG4gICAgKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVCdWZmZXIoYjogQnVpbGRlciwgbm9kZTogQnVmZmVyTWV0YWRhdGEpIHtcbiAgICByZXR1cm4gX0J1ZmZlci5jcmVhdGVCdWZmZXIoYiwgbmV3IExvbmcobm9kZS5vZmZzZXQsIDApLCBuZXcgTG9uZyhub2RlLmxlbmd0aCwgMCkpO1xufVxuXG5mdW5jdGlvbiB3cml0ZUZpZWxkTm9kZShiOiBCdWlsZGVyLCBub2RlOiBGaWVsZE1ldGFkYXRhKSB7XG4gICAgcmV0dXJuIF9GaWVsZE5vZGUuY3JlYXRlRmllbGROb2RlKGIsIG5ldyBMb25nKG5vZGUubGVuZ3RoLCAwKSwgbmV3IExvbmcobm9kZS5udWxsQ291bnQsIDApKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVGaWVsZChiOiBCdWlsZGVyLCBub2RlOiBGaWVsZCkge1xuICAgIGxldCB0eXBlT2Zmc2V0ID0gLTE7XG4gICAgbGV0IHR5cGUgPSBub2RlLnR5cGU7XG4gICAgbGV0IHR5cGVJZCA9IG5vZGUudHlwZUlkO1xuICAgIGxldCBuYW1lOiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgbGV0IG1ldGFkYXRhOiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgbGV0IGRpY3Rpb25hcnk6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICAgIGlmICghRGF0YVR5cGUuaXNEaWN0aW9uYXJ5KHR5cGUpKSB7XG4gICAgICAgIHR5cGVPZmZzZXQgPSBuZXcgVHlwZVNlcmlhbGl6ZXIoYikudmlzaXQodHlwZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdHlwZUlkID0gdHlwZS5kaWN0aW9uYXJ5LlRUeXBlO1xuICAgICAgICBkaWN0aW9uYXJ5ID0gbmV3IFR5cGVTZXJpYWxpemVyKGIpLnZpc2l0KHR5cGUpO1xuICAgICAgICB0eXBlT2Zmc2V0ID0gbmV3IFR5cGVTZXJpYWxpemVyKGIpLnZpc2l0KHR5cGUuZGljdGlvbmFyeSk7XG4gICAgfVxuXG4gICAgbGV0IGNoaWxkcmVuID0gX0ZpZWxkLmNyZWF0ZUNoaWxkcmVuVmVjdG9yKGIsICh0eXBlLmNoaWxkcmVuIHx8IFtdKS5tYXAoKGYpID0+IHdyaXRlRmllbGQoYiwgZikpKTtcbiAgICBpZiAobm9kZS5tZXRhZGF0YSAmJiBub2RlLm1ldGFkYXRhLnNpemUgPiAwKSB7XG4gICAgICAgIG1ldGFkYXRhID0gX0ZpZWxkLmNyZWF0ZUN1c3RvbU1ldGFkYXRhVmVjdG9yKFxuICAgICAgICAgICAgYixcbiAgICAgICAgICAgIFsuLi5ub2RlLm1ldGFkYXRhXS5tYXAoKFtrLCB2XSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGIuY3JlYXRlU3RyaW5nKGAke2t9YCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsID0gYi5jcmVhdGVTdHJpbmcoYCR7dn1gKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgICBfS2V5VmFsdWUuc3RhcnRLZXlWYWx1ZShiKSB8fFxuICAgICAgICAgICAgICAgICAgICBfS2V5VmFsdWUuYWRkS2V5KGIsIGtleSkgfHxcbiAgICAgICAgICAgICAgICAgICAgX0tleVZhbHVlLmFkZFZhbHVlKGIsIHZhbCkgfHxcbiAgICAgICAgICAgICAgICAgICAgX0tleVZhbHVlLmVuZEtleVZhbHVlKGIpXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxuICAgIGlmIChub2RlLm5hbWUpIHtcbiAgICAgICAgbmFtZSA9IGIuY3JlYXRlU3RyaW5nKG5vZGUubmFtZSk7XG4gICAgfVxuICAgIHJldHVybiAoXG4gICAgICAgIF9GaWVsZC5zdGFydEZpZWxkKGIpIHx8XG4gICAgICAgIF9GaWVsZC5hZGRUeXBlKGIsIHR5cGVPZmZzZXQpIHx8XG4gICAgICAgIF9GaWVsZC5hZGRUeXBlVHlwZShiLCB0eXBlSWQpIHx8XG4gICAgICAgIF9GaWVsZC5hZGRDaGlsZHJlbihiLCBjaGlsZHJlbikgfHxcbiAgICAgICAgX0ZpZWxkLmFkZE51bGxhYmxlKGIsICEhbm9kZS5udWxsYWJsZSkgfHxcbiAgICAgICAgKG5hbWUgIT09IHVuZGVmaW5lZCAmJiBfRmllbGQuYWRkTmFtZShiLCBuYW1lKSkgfHxcbiAgICAgICAgKGRpY3Rpb25hcnkgIT09IHVuZGVmaW5lZCAmJiBfRmllbGQuYWRkRGljdGlvbmFyeShiLCBkaWN0aW9uYXJ5KSkgfHxcbiAgICAgICAgKG1ldGFkYXRhICE9PSB1bmRlZmluZWQgJiYgX0ZpZWxkLmFkZEN1c3RvbU1ldGFkYXRhKGIsIG1ldGFkYXRhKSkgfHxcbiAgICAgICAgX0ZpZWxkLmVuZEZpZWxkKGIpXG4gICAgKTtcbn1cblxuZnVuY3Rpb24gbWFwUmV2ZXJzZTxULCBVPihzb3VyY2U6IFRbXSwgY2FsbGJhY2tmbjogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBVKTogVVtdIHtcbiAgICBjb25zdCByZXN1bHQgPSBuZXcgQXJyYXkoc291cmNlLmxlbmd0aCk7XG4gICAgZm9yIChsZXQgaSA9IC0xLCBqID0gc291cmNlLmxlbmd0aDsgLS1qID4gLTE7KSB7XG4gICAgICAgIHJlc3VsdFtpXSA9IGNhbGxiYWNrZm4oc291cmNlW2pdLCBpLCBzb3VyY2UpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5jb25zdCBwbGF0Zm9ybUlzTGl0dGxlRW5kaWFuID0gKGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcigyKTtcbiAgICBuZXcgRGF0YVZpZXcoYnVmZmVyKS5zZXRJbnQxNigwLCAyNTYsIHRydWUgLyogbGl0dGxlRW5kaWFuICovKTtcbiAgICAvLyBJbnQxNkFycmF5IHVzZXMgdGhlIHBsYXRmb3JtJ3MgZW5kaWFubmVzcy5cbiAgICByZXR1cm4gbmV3IEludDE2QXJyYXkoYnVmZmVyKVswXSA9PT0gMjU2O1xufSkoKTtcbiJdfQ==

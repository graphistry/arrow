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
            const nullBitmapAlignment = length <= 64 ? 8 : 64;
            const nullBitmap = nullCount <= 0
                ? new Uint8Array(0) // placeholder validity buffer
                : this.getTruncatedBitmap(data.offset, length, data.nullBitmap);
            this.addBuffer(nullBitmap, nullBitmapAlignment);
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
        let alignment = length <= 64 ? 8 : 64;
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
        this.addBuffer(bitmap, alignment);
        return this;
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
    addBuffer(values, alignment = 64) {
        const length = bit_1.align(values.byteLength, alignment);
        this.buffers.push(values);
        this.buffersMeta.push(new metadata_1.BufferMetadata(this.byteLength, length));
        this.byteLength += length;
        return this;
    }
    getTruncatedBitmap(offset, length, bitmap) {
        const alignedLength = bit_1.align(length, length <= 64 ? 8 : 64);
        if (offset > 0 || bitmap.length < alignedLength) {
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
    return (_Schema.startSchema(b) ||
        _Schema.addFields(b, fieldsOffset) ||
        _Schema.addEndianness(b, platformIsLittleEndian ? _Endianness.Little : _Endianness.Big) ||
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
            const key = b.createString(k);
            const val = b.createString(v);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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Q0FBQztBQUM3QyxDQUFDLENBQUMsRUFBRSxDQUFDIiwiZmlsZSI6ImlwYy93cml0ZXIvYmluYXJ5LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IFRhYmxlIH0gZnJvbSAnLi4vLi4vdGFibGUnO1xuaW1wb3J0IHsgRGVuc2VVbmlvbkRhdGEgfSBmcm9tICcuLi8uLi9kYXRhJztcbmltcG9ydCB7IFJlY29yZEJhdGNoIH0gZnJvbSAnLi4vLi4vcmVjb3JkYmF0Y2gnO1xuaW1wb3J0IHsgVmVjdG9yVmlzaXRvciwgVHlwZVZpc2l0b3IgfSBmcm9tICcuLi8uLi92aXNpdG9yJztcbmltcG9ydCB7IE1BR0lDLCBtYWdpY0xlbmd0aCwgbWFnaWNBbmRQYWRkaW5nLCBQQURESU5HIH0gZnJvbSAnLi4vbWFnaWMnO1xuaW1wb3J0IHsgYWxpZ24sIGdldEJvb2wsIHBhY2tCb29scywgaXRlcmF0ZUJpdHMgfSBmcm9tICcuLi8uLi91dGlsL2JpdCc7XG5pbXBvcnQgeyBWZWN0b3IsIFVuaW9uVmVjdG9yLCBEaWN0aW9uYXJ5VmVjdG9yLCBOZXN0ZWRWZWN0b3IsIExpc3RWZWN0b3IgfSBmcm9tICcuLi8uLi92ZWN0b3InO1xuaW1wb3J0IHsgQnVmZmVyTWV0YWRhdGEsIEZpZWxkTWV0YWRhdGEsIEZvb3RlciwgRmlsZUJsb2NrLCBNZXNzYWdlLCBSZWNvcmRCYXRjaE1ldGFkYXRhLCBEaWN0aW9uYXJ5QmF0Y2ggfSBmcm9tICcuLi9tZXRhZGF0YSc7XG5pbXBvcnQge1xuICAgIFNjaGVtYSwgRmllbGQsIFR5cGVkQXJyYXksIE1ldGFkYXRhVmVyc2lvbixcbiAgICBEYXRhVHlwZSxcbiAgICBEaWN0aW9uYXJ5LFxuICAgIE51bGwsIEludCwgRmxvYXQsXG4gICAgQmluYXJ5LCBCb29sLCBVdGY4LCBEZWNpbWFsLFxuICAgIERhdGVfLCBUaW1lLCBUaW1lc3RhbXAsIEludGVydmFsLFxuICAgIExpc3QsIFN0cnVjdCwgVW5pb24sIEZpeGVkU2l6ZUJpbmFyeSwgRml4ZWRTaXplTGlzdCwgTWFwXyxcbiAgICBGbGF0VHlwZSwgRmxhdExpc3RUeXBlLCBOZXN0ZWRUeXBlLCBVbmlvbk1vZGUsIFNwYXJzZVVuaW9uLCBEZW5zZVVuaW9uLCBTaW5nbGVOZXN0ZWRUeXBlLFxufSBmcm9tICcuLi8uLi90eXBlJztcblxuZXhwb3J0IGZ1bmN0aW9uKiBzZXJpYWxpemVTdHJlYW0odGFibGU6IFRhYmxlKSB7XG4gICAgeWllbGQgc2VyaWFsaXplTWVzc2FnZSh0YWJsZS5zY2hlbWEpLmJ1ZmZlcjtcbiAgICBmb3IgKGNvbnN0IFtpZCwgZmllbGRdIG9mIHRhYmxlLnNjaGVtYS5kaWN0aW9uYXJpZXMpIHtcbiAgICAgICAgY29uc3QgdmVjID0gdGFibGUuZ2V0Q29sdW1uKGZpZWxkLm5hbWUpIGFzIERpY3Rpb25hcnlWZWN0b3I7XG4gICAgICAgIGlmICh2ZWMgJiYgdmVjLmRpY3Rpb25hcnkpIHtcbiAgICAgICAgICAgIHlpZWxkIHNlcmlhbGl6ZURpY3Rpb25hcnlCYXRjaCh2ZWMuZGljdGlvbmFyeSwgaWQpLmJ1ZmZlcjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IHJlY29yZEJhdGNoIG9mIHRhYmxlLmJhdGNoZXMpIHtcbiAgICAgICAgeWllbGQgc2VyaWFsaXplUmVjb3JkQmF0Y2gocmVjb3JkQmF0Y2gpLmJ1ZmZlcjtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiogc2VyaWFsaXplRmlsZSh0YWJsZTogVGFibGUpIHtcblxuICAgIGNvbnN0IHJlY29yZEJhdGNoZXMgPSBbXTtcbiAgICBjb25zdCBkaWN0aW9uYXJ5QmF0Y2hlcyA9IFtdO1xuXG4gICAgLy8gRmlyc3QgeWllbGQgdGhlIG1hZ2ljIHN0cmluZyAoYWxpZ25lZClcbiAgICBsZXQgYnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkoYWxpZ24obWFnaWNMZW5ndGgsIDgpKTtcbiAgICBsZXQgbWV0YWRhdGFMZW5ndGgsIGJ5dGVMZW5ndGggPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICBidWZmZXIuc2V0KE1BR0lDLCAwKTtcbiAgICB5aWVsZCBidWZmZXI7XG5cbiAgICAvLyBUaGVuIHlpZWxkIHRoZSBzY2hlbWFcbiAgICAoeyBtZXRhZGF0YUxlbmd0aCwgYnVmZmVyIH0gPSBzZXJpYWxpemVNZXNzYWdlKHRhYmxlLnNjaGVtYSkpO1xuICAgIGJ5dGVMZW5ndGggKz0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgeWllbGQgYnVmZmVyO1xuXG4gICAgZm9yIChjb25zdCBbaWQsIGZpZWxkXSBvZiB0YWJsZS5zY2hlbWEuZGljdGlvbmFyaWVzKSB7XG4gICAgICAgIGNvbnN0IHZlYyA9IHRhYmxlLmdldENvbHVtbihmaWVsZC5uYW1lKSBhcyBEaWN0aW9uYXJ5VmVjdG9yO1xuICAgICAgICBpZiAodmVjICYmIHZlYy5kaWN0aW9uYXJ5KSB7XG4gICAgICAgICAgICAoeyBtZXRhZGF0YUxlbmd0aCwgYnVmZmVyIH0gPSBzZXJpYWxpemVEaWN0aW9uYXJ5QmF0Y2godmVjLmRpY3Rpb25hcnksIGlkKSk7XG4gICAgICAgICAgICBkaWN0aW9uYXJ5QmF0Y2hlcy5wdXNoKG5ldyBGaWxlQmxvY2sobWV0YWRhdGFMZW5ndGgsIGJ1ZmZlci5ieXRlTGVuZ3RoLCBieXRlTGVuZ3RoKSk7XG4gICAgICAgICAgICBieXRlTGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICAgICAgeWllbGQgYnVmZmVyO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgcmVjb3JkQmF0Y2ggb2YgdGFibGUuYmF0Y2hlcykge1xuICAgICAgICAoeyBtZXRhZGF0YUxlbmd0aCwgYnVmZmVyIH0gPSBzZXJpYWxpemVSZWNvcmRCYXRjaChyZWNvcmRCYXRjaCkpO1xuICAgICAgICByZWNvcmRCYXRjaGVzLnB1c2gobmV3IEZpbGVCbG9jayhtZXRhZGF0YUxlbmd0aCwgYnVmZmVyLmJ5dGVMZW5ndGgsIGJ5dGVMZW5ndGgpKTtcbiAgICAgICAgYnl0ZUxlbmd0aCArPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgeWllbGQgYnVmZmVyO1xuICAgIH1cblxuICAgIC8vIFRoZW4geWllbGQgdGhlIGZvb3RlciBtZXRhZGF0YSAobm90IGFsaWduZWQpXG4gICAgKHsgbWV0YWRhdGFMZW5ndGgsIGJ1ZmZlciB9ID0gc2VyaWFsaXplRm9vdGVyKG5ldyBGb290ZXIoZGljdGlvbmFyeUJhdGNoZXMsIHJlY29yZEJhdGNoZXMsIHRhYmxlLnNjaGVtYSkpKTtcbiAgICB5aWVsZCBidWZmZXI7XG4gICAgXG4gICAgLy8gTGFzdCwgeWllbGQgdGhlIGZvb3RlciBsZW5ndGggKyB0ZXJtaW5hdGluZyBtYWdpYyBhcnJvdyBzdHJpbmcgKGFsaWduZWQpXG4gICAgYnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkobWFnaWNBbmRQYWRkaW5nKTtcbiAgICBuZXcgRGF0YVZpZXcoYnVmZmVyLmJ1ZmZlcikuc2V0SW50MzIoMCwgbWV0YWRhdGFMZW5ndGgsIHBsYXRmb3JtSXNMaXR0bGVFbmRpYW4pO1xuICAgIGJ1ZmZlci5zZXQoTUFHSUMsIGJ1ZmZlci5ieXRlTGVuZ3RoIC0gbWFnaWNMZW5ndGgpO1xuICAgIHlpZWxkIGJ1ZmZlcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZVJlY29yZEJhdGNoKHJlY29yZEJhdGNoOiBSZWNvcmRCYXRjaCkge1xuICAgIGNvbnN0IHsgYnl0ZUxlbmd0aCwgZmllbGROb2RlcywgYnVmZmVycywgYnVmZmVyc01ldGEgfSA9IG5ldyBSZWNvcmRCYXRjaFNlcmlhbGl6ZXIoKS52aXNpdFJlY29yZEJhdGNoKHJlY29yZEJhdGNoKTtcbiAgICBjb25zdCByYk1ldGEgPSBuZXcgUmVjb3JkQmF0Y2hNZXRhZGF0YShNZXRhZGF0YVZlcnNpb24uVjQsIHJlY29yZEJhdGNoLmxlbmd0aCwgZmllbGROb2RlcywgYnVmZmVyc01ldGEpO1xuICAgIGNvbnN0IHJiRGF0YSA9IGNvbmNhdEJ1ZmZlcnNXaXRoTWV0YWRhdGEoYnl0ZUxlbmd0aCwgYnVmZmVycywgYnVmZmVyc01ldGEpO1xuICAgIHJldHVybiBzZXJpYWxpemVNZXNzYWdlKHJiTWV0YSwgcmJEYXRhKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZURpY3Rpb25hcnlCYXRjaChkaWN0aW9uYXJ5OiBWZWN0b3IsIGlkOiBMb25nIHwgbnVtYmVyLCBpc0RlbHRhOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICBjb25zdCB7IGJ5dGVMZW5ndGgsIGZpZWxkTm9kZXMsIGJ1ZmZlcnMsIGJ1ZmZlcnNNZXRhIH0gPSBuZXcgUmVjb3JkQmF0Y2hTZXJpYWxpemVyKCkudmlzaXRSZWNvcmRCYXRjaChSZWNvcmRCYXRjaC5mcm9tKFtkaWN0aW9uYXJ5XSkpO1xuICAgIGNvbnN0IHJiTWV0YSA9IG5ldyBSZWNvcmRCYXRjaE1ldGFkYXRhKE1ldGFkYXRhVmVyc2lvbi5WNCwgZGljdGlvbmFyeS5sZW5ndGgsIGZpZWxkTm9kZXMsIGJ1ZmZlcnNNZXRhKTtcbiAgICBjb25zdCBkYk1ldGEgPSBuZXcgRGljdGlvbmFyeUJhdGNoKE1ldGFkYXRhVmVyc2lvbi5WNCwgcmJNZXRhLCBpZCwgaXNEZWx0YSk7XG4gICAgY29uc3QgcmJEYXRhID0gY29uY2F0QnVmZmVyc1dpdGhNZXRhZGF0YShieXRlTGVuZ3RoLCBidWZmZXJzLCBidWZmZXJzTWV0YSk7XG4gICAgcmV0dXJuIHNlcmlhbGl6ZU1lc3NhZ2UoZGJNZXRhLCByYkRhdGEpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VyaWFsaXplTWVzc2FnZShtZXNzYWdlOiBNZXNzYWdlLCBkYXRhPzogVWludDhBcnJheSkge1xuICAgIGNvbnN0IGIgPSBuZXcgQnVpbGRlcigpO1xuICAgIF9NZXNzYWdlLmZpbmlzaE1lc3NhZ2VCdWZmZXIoYiwgd3JpdGVNZXNzYWdlKGIsIG1lc3NhZ2UpKTtcbiAgICAvLyBTbGljZSBvdXQgdGhlIGJ1ZmZlciB0aGF0IGNvbnRhaW5zIHRoZSBtZXNzYWdlIG1ldGFkYXRhXG4gICAgY29uc3QgbWV0YWRhdGFCeXRlcyA9IGIuYXNVaW50OEFycmF5KCk7XG4gICAgLy8gUmVzZXJ2ZSA0IGJ5dGVzIGZvciB3cml0aW5nIHRoZSBtZXNzYWdlIHNpemUgYXQgdGhlIGZyb250LlxuICAgIC8vIE1ldGFkYXRhIGxlbmd0aCBpbmNsdWRlcyB0aGUgbWV0YWRhdGEgYnl0ZUxlbmd0aCArIHRoZSA0XG4gICAgLy8gYnl0ZXMgZm9yIHRoZSBsZW5ndGgsIGFuZCByb3VuZGVkIHVwIHRvIHRoZSBuZWFyZXN0IDggYnl0ZXMuXG4gICAgY29uc3QgbWV0YWRhdGFMZW5ndGggPSBhbGlnbihQQURESU5HICsgbWV0YWRhdGFCeXRlcy5ieXRlTGVuZ3RoLCA4KTtcbiAgICAvLyArIHRoZSBsZW5ndGggb2YgdGhlIG9wdGlvbmFsIGRhdGEgYnVmZmVyIGF0IHRoZSBlbmQsIHBhZGRlZFxuICAgIGNvbnN0IGRhdGFCeXRlTGVuZ3RoID0gZGF0YSA/IGRhdGEuYnl0ZUxlbmd0aCA6IDA7XG4gICAgLy8gZW5zdXJlIHRoZSBlbnRpcmUgbWVzc2FnZSBpcyBhbGlnbmVkIHRvIGFuIDgtYnl0ZSBib3VuZGFyeVxuICAgIGNvbnN0IG1lc3NhZ2VCeXRlcyA9IG5ldyBVaW50OEFycmF5KGFsaWduKG1ldGFkYXRhTGVuZ3RoICsgZGF0YUJ5dGVMZW5ndGgsIDgpKTtcbiAgICAvLyBXcml0ZSB0aGUgbWV0YWRhdGEgbGVuZ3RoIGludG8gdGhlIGZpcnN0IDQgYnl0ZXMsIGJ1dCBzdWJ0cmFjdCB0aGVcbiAgICAvLyBieXRlcyB3ZSB1c2UgdG8gaG9sZCB0aGUgbGVuZ3RoIGl0c2VsZi5cbiAgICBuZXcgRGF0YVZpZXcobWVzc2FnZUJ5dGVzLmJ1ZmZlcikuc2V0SW50MzIoMCwgbWV0YWRhdGFMZW5ndGggLSBQQURESU5HLCBwbGF0Zm9ybUlzTGl0dGxlRW5kaWFuKTtcbiAgICAvLyBDb3B5IHRoZSBtZXRhZGF0YSBieXRlcyBpbnRvIHRoZSBtZXNzYWdlIGJ1ZmZlclxuICAgIG1lc3NhZ2VCeXRlcy5zZXQobWV0YWRhdGFCeXRlcywgUEFERElORyk7XG4gICAgLy8gQ29weSB0aGUgb3B0aW9uYWwgZGF0YSBidWZmZXIgYWZ0ZXIgdGhlIG1ldGFkYXRhIGJ5dGVzXG4gICAgKGRhdGEgJiYgZGF0YUJ5dGVMZW5ndGggPiAwKSAmJiBtZXNzYWdlQnl0ZXMuc2V0KGRhdGEsIG1ldGFkYXRhTGVuZ3RoKTtcbiAgICAvLyBpZiAobWVzc2FnZUJ5dGVzLmJ5dGVMZW5ndGggJSA4ICE9PSAwKSB7IGRlYnVnZ2VyOyB9XG4gICAgLy8gUmV0dXJuIHRoZSBtZXRhZGF0YSBsZW5ndGggYmVjYXVzZSB3ZSBuZWVkIHRvIHdyaXRlIGl0IGludG8gZWFjaCBGaWxlQmxvY2sgYWxzb1xuICAgIHJldHVybiB7IG1ldGFkYXRhTGVuZ3RoLCBidWZmZXI6IG1lc3NhZ2VCeXRlcyB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VyaWFsaXplRm9vdGVyKGZvb3RlcjogRm9vdGVyKSB7XG4gICAgY29uc3QgYiA9IG5ldyBCdWlsZGVyKCk7XG4gICAgX0Zvb3Rlci5maW5pc2hGb290ZXJCdWZmZXIoYiwgd3JpdGVGb290ZXIoYiwgZm9vdGVyKSk7XG4gICAgLy8gU2xpY2Ugb3V0IHRoZSBidWZmZXIgdGhhdCBjb250YWlucyB0aGUgZm9vdGVyIG1ldGFkYXRhXG4gICAgY29uc3QgZm9vdGVyQnl0ZXMgPSBiLmFzVWludDhBcnJheSgpO1xuICAgIGNvbnN0IG1ldGFkYXRhTGVuZ3RoID0gZm9vdGVyQnl0ZXMuYnl0ZUxlbmd0aDtcbiAgICByZXR1cm4geyBtZXRhZGF0YUxlbmd0aCwgYnVmZmVyOiBmb290ZXJCeXRlcyB9O1xufVxuXG5jbGFzcyBSZWNvcmRCYXRjaFNlcmlhbGl6ZXIgZXh0ZW5kcyBWZWN0b3JWaXNpdG9yIHtcbiAgICBwdWJsaWMgYnl0ZUxlbmd0aCA9IDA7XG4gICAgcHVibGljIGJ1ZmZlcnM6IFR5cGVkQXJyYXlbXSA9IFtdO1xuICAgIHB1YmxpYyBmaWVsZE5vZGVzOiBGaWVsZE1ldGFkYXRhW10gPSBbXTtcbiAgICBwdWJsaWMgYnVmZmVyc01ldGE6IEJ1ZmZlck1ldGFkYXRhW10gPSBbXTtcbiAgICBwdWJsaWMgdmlzaXRSZWNvcmRCYXRjaChyZWNvcmRCYXRjaDogUmVjb3JkQmF0Y2gpIHtcbiAgICAgICAgdGhpcy5idWZmZXJzID0gW107XG4gICAgICAgIHRoaXMuYnl0ZUxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMuZmllbGROb2RlcyA9IFtdO1xuICAgICAgICB0aGlzLmJ1ZmZlcnNNZXRhID0gW107XG4gICAgICAgIGZvciAobGV0IHZlY3RvcjogVmVjdG9yLCBpbmRleCA9IC0xLCBudW1Db2xzID0gcmVjb3JkQmF0Y2gubnVtQ29sczsgKytpbmRleCA8IG51bUNvbHM7KSB7XG4gICAgICAgICAgICBpZiAodmVjdG9yID0gcmVjb3JkQmF0Y2guZ2V0Q2hpbGRBdChpbmRleCkhKSB7XG4gICAgICAgICAgICAgICAgdGhpcy52aXNpdCh2ZWN0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXQ8VCBleHRlbmRzIERhdGFUeXBlPih2ZWN0b3I6IFZlY3RvcjxUPikge1xuICAgICAgICBpZiAoIURhdGFUeXBlLmlzRGljdGlvbmFyeSh2ZWN0b3IudHlwZSkpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGF0YSwgbGVuZ3RoLCBudWxsQ291bnQgfSA9IHZlY3RvcjtcbiAgICAgICAgICAgIGlmIChsZW5ndGggPiAyMTQ3NDgzNjQ3KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0Nhbm5vdCB3cml0ZSBhcnJheXMgbGFyZ2VyIHRoYW4gMl4zMSAtIDEgaW4gbGVuZ3RoJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmZpZWxkTm9kZXMucHVzaChuZXcgRmllbGRNZXRhZGF0YShsZW5ndGgsIG51bGxDb3VudCkpO1xuXG4gICAgICAgICAgICBjb25zdCBudWxsQml0bWFwQWxpZ25tZW50ID0gbGVuZ3RoIDw9IDY0ID8gOCA6IDY0O1xuICAgICAgICAgICAgY29uc3QgbnVsbEJpdG1hcCA9IG51bGxDb3VudCA8PSAwXG4gICAgICAgICAgICAgICAgPyBuZXcgVWludDhBcnJheSgwKSAvLyBwbGFjZWhvbGRlciB2YWxpZGl0eSBidWZmZXJcbiAgICAgICAgICAgICAgICA6IHRoaXMuZ2V0VHJ1bmNhdGVkQml0bWFwKGRhdGEub2Zmc2V0LCBsZW5ndGgsIGRhdGEubnVsbEJpdG1hcCEpO1xuICAgICAgICAgICAgdGhpcy5hZGRCdWZmZXIobnVsbEJpdG1hcCwgbnVsbEJpdG1hcEFsaWdubWVudCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN1cGVyLnZpc2l0KHZlY3Rvcik7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdE51bGwgICAgICAgICAgIChfbnVsbHo6IFZlY3RvcjxOdWxsPikgICAgICAgICAgICB7IHJldHVybiB0aGlzOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRCb29sICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8Qm9vbD4pICAgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEJvb2xWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0SW50ICAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPEludD4pICAgICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdEZsb2F0ICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxGbG9hdD4pICAgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRVdGY4ICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8VXRmOD4pICAgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRMaXN0VmVjdG9yKHZlY3Rvcik7ICB9XG4gICAgcHVibGljIHZpc2l0QmluYXJ5ICAgICAgICAgKHZlY3RvcjogVmVjdG9yPEJpbmFyeT4pICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0TGlzdFZlY3Rvcih2ZWN0b3IpOyAgfVxuICAgIHB1YmxpYyB2aXNpdERhdGUgICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxEYXRlXz4pICAgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRUaW1lc3RhbXAgICAgICAodmVjdG9yOiBWZWN0b3I8VGltZXN0YW1wPikgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0VGltZSAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPFRpbWU+KSAgICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdERlY2ltYWwgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxEZWNpbWFsPikgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRJbnRlcnZhbCAgICAgICAodmVjdG9yOiBWZWN0b3I8SW50ZXJ2YWw+KSAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0TGlzdCAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPExpc3Q+KSAgICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRMaXN0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdFN0cnVjdCAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxTdHJ1Y3Q+KSAgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0TmVzdGVkVmVjdG9yKHZlY3Rvcik7ICAgIH1cbiAgICBwdWJsaWMgdmlzaXRGaXhlZFNpemVCaW5hcnkodmVjdG9yOiBWZWN0b3I8Rml4ZWRTaXplQmluYXJ5PikgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0Rml4ZWRTaXplTGlzdCAgKHZlY3RvcjogVmVjdG9yPEZpeGVkU2l6ZUxpc3Q+KSAgIHsgcmV0dXJuIHRoaXMudmlzaXRMaXN0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdE1hcCAgICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxNYXBfPikgICAgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0TmVzdGVkVmVjdG9yKHZlY3Rvcik7ICAgIH1cbiAgICBwdWJsaWMgdmlzaXREaWN0aW9uYXJ5ICAgICAodmVjdG9yOiBEaWN0aW9uYXJ5VmVjdG9yKSAgICAgICAge1xuICAgICAgICAvLyBEaWN0aW9uYXJ5IHdyaXR0ZW4gb3V0IHNlcGFyYXRlbHkuIFNsaWNlIG9mZnNldCBjb250YWluZWQgaW4gdGhlIGluZGljZXNcbiAgICAgICAgcmV0dXJuIHRoaXMudmlzaXQodmVjdG9yLmluZGljZXMpO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRVbmlvbih2ZWN0b3I6IFZlY3RvcjxEZW5zZVVuaW9uIHwgU3BhcnNlVW5pb24+KSB7XG4gICAgICAgIGNvbnN0IHsgZGF0YSwgdHlwZSwgbGVuZ3RoIH0gPSB2ZWN0b3I7XG4gICAgICAgIGNvbnN0IHsgb2Zmc2V0OiBzbGljZU9mZnNldCwgdHlwZUlkcyB9ID0gZGF0YTtcbiAgICAgICAgLy8gQWxsIFVuaW9uIFZlY3RvcnMgaGF2ZSBhIHR5cGVJZHMgYnVmZmVyXG4gICAgICAgIHRoaXMuYWRkQnVmZmVyKHR5cGVJZHMpO1xuICAgICAgICAvLyBJZiB0aGlzIGlzIGEgU3BhcnNlIFVuaW9uLCB0cmVhdCBpdCBsaWtlIGFsbCBvdGhlciBOZXN0ZWQgdHlwZXNcbiAgICAgICAgaWYgKHR5cGUubW9kZSA9PT0gVW5pb25Nb2RlLlNwYXJzZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmlzaXROZXN0ZWRWZWN0b3IodmVjdG9yKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlLm1vZGUgPT09IFVuaW9uTW9kZS5EZW5zZSkge1xuICAgICAgICAgICAgLy8gSWYgdGhpcyBpcyBhIERlbnNlIFVuaW9uLCBhZGQgdGhlIHZhbHVlT2Zmc2V0cyBidWZmZXIgYW5kIHBvdGVudGlhbGx5IHNsaWNlIHRoZSBjaGlsZHJlblxuICAgICAgICAgICAgY29uc3QgdmFsdWVPZmZzZXRzID0gKGRhdGEgYXMgRGVuc2VVbmlvbkRhdGEpLnZhbHVlT2Zmc2V0cztcbiAgICAgICAgICAgIGlmIChzbGljZU9mZnNldCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIFZlY3RvciBoYXNuJ3QgYmVlbiBzbGljZWQsIHdyaXRlIHRoZSBleGlzdGluZyB2YWx1ZU9mZnNldHNcbiAgICAgICAgICAgICAgICB0aGlzLmFkZEJ1ZmZlcih2YWx1ZU9mZnNldHMpO1xuICAgICAgICAgICAgICAgIC8vIFdlIGNhbiB0cmVhdCB0aGlzIGxpa2UgYWxsIG90aGVyIE5lc3RlZCB0eXBlc1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnZpc2l0TmVzdGVkVmVjdG9yKHZlY3Rvcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEEgc2xpY2VkIERlbnNlIFVuaW9uIGlzIGFuIHVucGxlYXNhbnQgY2FzZS4gQmVjYXVzZSB0aGUgb2Zmc2V0cyBhcmUgZGlmZmVyZW50IGZvclxuICAgICAgICAgICAgICAgIC8vIGVhY2ggY2hpbGQgdmVjdG9yLCB3ZSBuZWVkIHRvIFwicmViYXNlXCIgdGhlIHZhbHVlT2Zmc2V0cyBmb3IgZWFjaCBjaGlsZFxuICAgICAgICAgICAgICAgIC8vIFVuaW9uIHR5cGVJZHMgYXJlIG5vdCBuZWNlc3NhcnkgMC1pbmRleGVkXG4gICAgICAgICAgICAgICAgY29uc3QgbWF4Q2hpbGRUeXBlSWQgPSBNYXRoLm1heCguLi50eXBlLnR5cGVJZHMpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkTGVuZ3RocyA9IG5ldyBJbnQzMkFycmF5KG1heENoaWxkVHlwZUlkICsgMSk7XG4gICAgICAgICAgICAgICAgLy8gU2V0IGFsbCB0byAtMSB0byBpbmRpY2F0ZSB0aGF0IHdlIGhhdmVuJ3Qgb2JzZXJ2ZWQgYSBmaXJzdCBvY2N1cnJlbmNlIG9mIGEgcGFydGljdWxhciBjaGlsZCB5ZXRcbiAgICAgICAgICAgICAgICBjb25zdCBjaGlsZE9mZnNldHMgPSBuZXcgSW50MzJBcnJheShtYXhDaGlsZFR5cGVJZCArIDEpLmZpbGwoLTEpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNoaWZ0ZWRPZmZzZXRzID0gbmV3IEludDMyQXJyYXkobGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB1bnNoaWZ0ZWRPZmZzZXRzID0gdGhpcy5nZXRaZXJvQmFzZWRWYWx1ZU9mZnNldHMoc2xpY2VPZmZzZXQsIGxlbmd0aCwgdmFsdWVPZmZzZXRzKTtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCB0eXBlSWQsIHNoaWZ0LCBpbmRleCA9IC0xOyArK2luZGV4IDwgbGVuZ3RoOykge1xuICAgICAgICAgICAgICAgICAgICB0eXBlSWQgPSB0eXBlSWRzW2luZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgLy8gfigtMSkgdXNlZCB0byBiZSBmYXN0ZXIgdGhhbiB4ID09PSAtMSwgc28gbWF5YmUgd29ydGggYmVuY2htYXJraW5nIHRoZSBkaWZmZXJlbmNlIG9mIHRoZXNlIHR3byBpbXBscyBmb3IgbGFyZ2UgZGVuc2UgdW5pb25zOlxuICAgICAgICAgICAgICAgICAgICAvLyB+KHNoaWZ0ID0gY2hpbGRPZmZzZXRzW3R5cGVJZF0pIHx8IChzaGlmdCA9IGNoaWxkT2Zmc2V0c1t0eXBlSWRdID0gdW5zaGlmdGVkT2Zmc2V0c1tpbmRleF0pO1xuICAgICAgICAgICAgICAgICAgICAvLyBHb2luZyB3aXRoIHRoaXMgZm9ybSBmb3Igbm93LCBhcyBpdCdzIG1vcmUgcmVhZGFibGVcbiAgICAgICAgICAgICAgICAgICAgaWYgKChzaGlmdCA9IGNoaWxkT2Zmc2V0c1t0eXBlSWRdKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNoaWZ0ID0gY2hpbGRPZmZzZXRzW3R5cGVJZF0gPSB1bnNoaWZ0ZWRPZmZzZXRzW3R5cGVJZF07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc2hpZnRlZE9mZnNldHNbaW5kZXhdID0gdW5zaGlmdGVkT2Zmc2V0c1tpbmRleF0gLSBzaGlmdDtcbiAgICAgICAgICAgICAgICAgICAgKytjaGlsZExlbmd0aHNbdHlwZUlkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5hZGRCdWZmZXIoc2hpZnRlZE9mZnNldHMpO1xuICAgICAgICAgICAgICAgIC8vIFNsaWNlIGFuZCB2aXNpdCBjaGlsZHJlbiBhY2NvcmRpbmdseVxuICAgICAgICAgICAgICAgIGZvciAobGV0IGNoaWxkSW5kZXggPSAtMSwgbnVtQ2hpbGRyZW4gPSB0eXBlLmNoaWxkcmVuLmxlbmd0aDsgKytjaGlsZEluZGV4IDwgbnVtQ2hpbGRyZW47KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHR5cGVJZCA9IHR5cGUudHlwZUlkc1tjaGlsZEluZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hpbGQgPSAodmVjdG9yIGFzIFVuaW9uVmVjdG9yKS5nZXRDaGlsZEF0KGNoaWxkSW5kZXgpITtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy52aXNpdChjaGlsZC5zbGljZShjaGlsZE9mZnNldHNbdHlwZUlkXSwgTWF0aC5taW4obGVuZ3RoLCBjaGlsZExlbmd0aHNbdHlwZUlkXSkpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHByb3RlY3RlZCB2aXNpdEJvb2xWZWN0b3IodmVjdG9yOiBWZWN0b3I8Qm9vbD4pIHtcbiAgICAgICAgLy8gQm9vbCB2ZWN0b3IgaXMgYSBzcGVjaWFsIGNhc2Ugb2YgRmxhdFZlY3RvciwgYXMgaXRzIGRhdGEgYnVmZmVyIG5lZWRzIHRvIHN0YXkgcGFja2VkXG4gICAgICAgIGxldCBiaXRtYXA6IFVpbnQ4QXJyYXk7XG4gICAgICAgIGxldCB2YWx1ZXMsIHsgZGF0YSwgbGVuZ3RoIH0gPSB2ZWN0b3I7XG4gICAgICAgIGxldCBhbGlnbm1lbnQgPSBsZW5ndGggPD0gNjQgPyA4IDogNjQ7XG4gICAgICAgIGlmICh2ZWN0b3IubnVsbENvdW50ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgLy8gSWYgYWxsIHZhbHVlcyBhcmUgbnVsbCwganVzdCBpbnNlcnQgYSBwbGFjZWhvbGRlciBlbXB0eSBkYXRhIGJ1ZmZlciAoZmFzdGVzdCBwYXRoKVxuICAgICAgICAgICAgYml0bWFwID0gbmV3IFVpbnQ4QXJyYXkoMCk7XG4gICAgICAgIH0gZWxzZSBpZiAoISgodmFsdWVzID0gZGF0YS52YWx1ZXMpIGluc3RhbmNlb2YgVWludDhBcnJheSkpIHtcbiAgICAgICAgICAgIC8vIE90aGVyd2lzZSBpZiB0aGUgdW5kZXJseWluZyBkYXRhICppc24ndCogYSBVaW50OEFycmF5LCBlbnVtZXJhdGVcbiAgICAgICAgICAgIC8vIHRoZSB2YWx1ZXMgYXMgYm9vbHMgYW5kIHJlLXBhY2sgdGhlbSBpbnRvIGEgVWludDhBcnJheSAoc2xvdyBwYXRoKVxuICAgICAgICAgICAgYml0bWFwID0gcGFja0Jvb2xzKHZlY3Rvcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBvdGhlcndpc2UganVzdCBzbGljZSB0aGUgYml0bWFwIChmYXN0IHBhdGgpXG4gICAgICAgICAgICBiaXRtYXAgPSB0aGlzLmdldFRydW5jYXRlZEJpdG1hcChkYXRhLm9mZnNldCwgbGVuZ3RoLCB2YWx1ZXMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYWRkQnVmZmVyKGJpdG1hcCwgYWxpZ25tZW50KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHByb3RlY3RlZCB2aXNpdEZsYXRWZWN0b3I8VCBleHRlbmRzIEZsYXRUeXBlPih2ZWN0b3I6IFZlY3RvcjxUPikge1xuICAgICAgICBjb25zdCB7IHZpZXcsIGRhdGEgfSA9IHZlY3RvcjtcbiAgICAgICAgY29uc3QgeyBvZmZzZXQsIGxlbmd0aCwgdmFsdWVzIH0gPSBkYXRhO1xuICAgICAgICBjb25zdCBzY2FsZWRMZW5ndGggPSBsZW5ndGggKiAoKHZpZXcgYXMgYW55KS5zaXplIHx8IDEpO1xuICAgICAgICByZXR1cm4gdGhpcy5hZGRCdWZmZXIodmFsdWVzLnN1YmFycmF5KG9mZnNldCwgc2NhbGVkTGVuZ3RoKSk7XG4gICAgfVxuICAgIHByb3RlY3RlZCB2aXNpdEZsYXRMaXN0VmVjdG9yPFQgZXh0ZW5kcyBGbGF0TGlzdFR5cGU+KHZlY3RvcjogVmVjdG9yPFQ+KSB7XG4gICAgICAgIGNvbnN0IHsgZGF0YSwgbGVuZ3RoIH0gPSB2ZWN0b3I7XG4gICAgICAgIGNvbnN0IHsgb2Zmc2V0LCB2YWx1ZXMsIHZhbHVlT2Zmc2V0cyB9ID0gZGF0YTtcbiAgICAgICAgY29uc3QgZmlyc3RPZmZzZXQgPSB2YWx1ZU9mZnNldHNbMF07XG4gICAgICAgIGNvbnN0IGxhc3RPZmZzZXQgPSB2YWx1ZU9mZnNldHNbbGVuZ3RoXTtcbiAgICAgICAgY29uc3QgYnl0ZUxlbmd0aCA9IE1hdGgubWluKGxhc3RPZmZzZXQgLSBmaXJzdE9mZnNldCwgdmFsdWVzLmJ5dGVMZW5ndGggLSBmaXJzdE9mZnNldCk7XG4gICAgICAgIC8vIFB1c2ggaW4gdGhlIG9yZGVyIEZsYXRMaXN0IHR5cGVzIHJlYWQgdGhlaXIgYnVmZmVyc1xuICAgICAgICAvLyB2YWx1ZU9mZnNldHMgYnVmZmVyIGZpcnN0XG4gICAgICAgIHRoaXMuYWRkQnVmZmVyKHRoaXMuZ2V0WmVyb0Jhc2VkVmFsdWVPZmZzZXRzKG9mZnNldCwgbGVuZ3RoLCB2YWx1ZU9mZnNldHMpKTtcbiAgICAgICAgLy8gc2xpY2VkIHZhbHVlcyBidWZmZXIgc2Vjb25kXG4gICAgICAgIHRoaXMuYWRkQnVmZmVyKHZhbHVlcy5zdWJhcnJheShmaXJzdE9mZnNldCArIG9mZnNldCwgZmlyc3RPZmZzZXQgKyBvZmZzZXQgKyBieXRlTGVuZ3RoKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgdmlzaXRMaXN0VmVjdG9yPFQgZXh0ZW5kcyBTaW5nbGVOZXN0ZWRUeXBlPih2ZWN0b3I6IFZlY3RvcjxUPikge1xuICAgICAgICBjb25zdCB7IGRhdGEsIGxlbmd0aCB9ID0gdmVjdG9yO1xuICAgICAgICBjb25zdCB7IG9mZnNldCwgdmFsdWVPZmZzZXRzIH0gPSA8YW55PiBkYXRhO1xuICAgICAgICAvLyBJZiB3ZSBoYXZlIHZhbHVlT2Zmc2V0cyAoTGlzdFZlY3RvciksIHB1c2ggdGhhdCBidWZmZXIgZmlyc3RcbiAgICAgICAgaWYgKHZhbHVlT2Zmc2V0cykge1xuICAgICAgICAgICAgdGhpcy5hZGRCdWZmZXIodGhpcy5nZXRaZXJvQmFzZWRWYWx1ZU9mZnNldHMob2Zmc2V0LCBsZW5ndGgsIHZhbHVlT2Zmc2V0cykpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRoZW4gaW5zZXJ0IHRoZSBMaXN0J3MgdmFsdWVzIGNoaWxkXG4gICAgICAgIHJldHVybiB0aGlzLnZpc2l0KCh2ZWN0b3IgYXMgYW55IGFzIExpc3RWZWN0b3I8VD4pLmdldENoaWxkQXQoMCkhKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHZpc2l0TmVzdGVkVmVjdG9yPFQgZXh0ZW5kcyBOZXN0ZWRUeXBlPih2ZWN0b3I6IFZlY3RvcjxUPikge1xuICAgICAgICAvLyBWaXNpdCB0aGUgY2hpbGRyZW4gYWNjb3JkaW5nbHlcbiAgICAgICAgY29uc3QgbnVtQ2hpbGRyZW4gPSAodmVjdG9yLnR5cGUuY2hpbGRyZW4gfHwgW10pLmxlbmd0aDtcbiAgICAgICAgZm9yIChsZXQgY2hpbGQ6IFZlY3RvciB8IG51bGwsIGNoaWxkSW5kZXggPSAtMTsgKytjaGlsZEluZGV4IDwgbnVtQ2hpbGRyZW47KSB7XG4gICAgICAgICAgICBpZiAoY2hpbGQgPSAodmVjdG9yIGFzIE5lc3RlZFZlY3RvcjxUPikuZ2V0Q2hpbGRBdChjaGlsZEluZGV4KSkge1xuICAgICAgICAgICAgICAgIHRoaXMudmlzaXQoY2hpbGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgYWRkQnVmZmVyKHZhbHVlczogVHlwZWRBcnJheSwgYWxpZ25tZW50OiBudW1iZXIgPSA2NCkge1xuICAgICAgICBjb25zdCBsZW5ndGggPSBhbGlnbih2YWx1ZXMuYnl0ZUxlbmd0aCwgYWxpZ25tZW50KTtcbiAgICAgICAgdGhpcy5idWZmZXJzLnB1c2godmFsdWVzKTtcbiAgICAgICAgdGhpcy5idWZmZXJzTWV0YS5wdXNoKG5ldyBCdWZmZXJNZXRhZGF0YSh0aGlzLmJ5dGVMZW5ndGgsIGxlbmd0aCkpO1xuICAgICAgICB0aGlzLmJ5dGVMZW5ndGggKz0gbGVuZ3RoO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHJvdGVjdGVkIGdldFRydW5jYXRlZEJpdG1hcChvZmZzZXQ6IG51bWJlciwgbGVuZ3RoOiBudW1iZXIsIGJpdG1hcDogVWludDhBcnJheSkge1xuICAgICAgICBjb25zdCBhbGlnbmVkTGVuZ3RoID0gYWxpZ24obGVuZ3RoLCBsZW5ndGggPD0gNjQgPyA4IDogNjQpO1xuICAgICAgICBpZiAob2Zmc2V0ID4gMCB8fCBiaXRtYXAubGVuZ3RoIDwgYWxpZ25lZExlbmd0aCkge1xuICAgICAgICAgICAgLy8gV2l0aCBhIHNsaWNlZCBhcnJheSAvIG5vbi16ZXJvIG9mZnNldCwgd2UgaGF2ZSB0byBjb3B5IHRoZSBiaXRtYXBcbiAgICAgICAgICAgIGNvbnN0IGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoYWxpZ25lZExlbmd0aCk7XG4gICAgICAgICAgICBieXRlcy5zZXQoXG4gICAgICAgICAgICAgICAgKG9mZnNldCAlIDggPT09IDApXG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIHNsaWNlIG9mZnNldCBpcyBhbGlnbmVkIHRvIDEgYnl0ZSwgaXQncyBzYWZlIHRvIHNsaWNlIHRoZSBudWxsQml0bWFwIGRpcmVjdGx5XG4gICAgICAgICAgICAgICAgPyBiaXRtYXAuc3ViYXJyYXkob2Zmc2V0ID4+IDMpXG4gICAgICAgICAgICAgICAgLy8gaXRlcmF0ZSBlYWNoIGJpdCBzdGFydGluZyBmcm9tIHRoZSBzbGljZSBvZmZzZXQsIGFuZCByZXBhY2sgaW50byBhbiBhbGlnbmVkIG51bGxCaXRtYXBcbiAgICAgICAgICAgICAgICA6IHBhY2tCb29scyhpdGVyYXRlQml0cyhiaXRtYXAsIG9mZnNldCwgbGVuZ3RoLCBudWxsLCBnZXRCb29sKSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICByZXR1cm4gYnl0ZXM7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGJpdG1hcDtcbiAgICB9XG4gICAgcHJvdGVjdGVkIGdldFplcm9CYXNlZFZhbHVlT2Zmc2V0cyhvZmZzZXQ6IG51bWJlciwgbGVuZ3RoOiBudW1iZXIsIHZhbHVlT2Zmc2V0czogSW50MzJBcnJheSkge1xuICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgbm9uLXplcm8gb2Zmc2V0LCB0aGVuIHRoZSB2YWx1ZSBvZmZzZXRzIGRvIG5vdCBzdGFydCBhdFxuICAgICAgICAvLyB6ZXJvLiBXZSBtdXN0IGEpIGNyZWF0ZSBhIG5ldyBvZmZzZXRzIGFycmF5IHdpdGggc2hpZnRlZCBvZmZzZXRzIGFuZFxuICAgICAgICAvLyBiKSBzbGljZSB0aGUgdmFsdWVzIGFycmF5IGFjY29yZGluZ2x5XG4gICAgICAgIGlmIChvZmZzZXQgPiAwIHx8IHZhbHVlT2Zmc2V0c1swXSAhPT0gMCkge1xuICAgICAgICAgICAgY29uc3Qgc3RhcnRPZmZzZXQgPSB2YWx1ZU9mZnNldHNbMF07XG4gICAgICAgICAgICBjb25zdCBkZXN0T2Zmc2V0cyA9IG5ldyBJbnQzMkFycmF5KGxlbmd0aCArIDEpO1xuICAgICAgICAgICAgZm9yIChsZXQgaW5kZXggPSAtMTsgKytpbmRleCA8IGxlbmd0aDspIHtcbiAgICAgICAgICAgICAgICBkZXN0T2Zmc2V0c1tpbmRleF0gPSB2YWx1ZU9mZnNldHNbaW5kZXhdIC0gc3RhcnRPZmZzZXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBGaW5hbCBvZmZzZXRcbiAgICAgICAgICAgIGRlc3RPZmZzZXRzW2xlbmd0aF0gPSB2YWx1ZU9mZnNldHNbbGVuZ3RoXSAtIHN0YXJ0T2Zmc2V0O1xuICAgICAgICAgICAgcmV0dXJuIGRlc3RPZmZzZXRzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWx1ZU9mZnNldHM7XG4gICAgfVxufVxuXG5pbXBvcnQgeyBmbGF0YnVmZmVycyB9IGZyb20gJ2ZsYXRidWZmZXJzJztcbmltcG9ydCBMb25nID0gZmxhdGJ1ZmZlcnMuTG9uZztcbmltcG9ydCBCdWlsZGVyID0gZmxhdGJ1ZmZlcnMuQnVpbGRlcjtcbmltcG9ydCAqIGFzIEZpbGVfIGZyb20gJy4uLy4uL2ZiL0ZpbGUnO1xuaW1wb3J0ICogYXMgU2NoZW1hXyBmcm9tICcuLi8uLi9mYi9TY2hlbWEnO1xuaW1wb3J0ICogYXMgTWVzc2FnZV8gZnJvbSAnLi4vLi4vZmIvTWVzc2FnZSc7XG5cbmltcG9ydCBfQmxvY2sgPSBGaWxlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuQmxvY2s7XG5pbXBvcnQgX0Zvb3RlciA9IEZpbGVfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5Gb290ZXI7XG5pbXBvcnQgX0ZpZWxkID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRmllbGQ7XG5pbXBvcnQgX1NjaGVtYSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlNjaGVtYTtcbmltcG9ydCBfQnVmZmVyID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuQnVmZmVyO1xuaW1wb3J0IF9NZXNzYWdlID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk1lc3NhZ2U7XG5pbXBvcnQgX0tleVZhbHVlID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuS2V5VmFsdWU7XG5pbXBvcnQgX0ZpZWxkTm9kZSA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaWVsZE5vZGU7XG5pbXBvcnQgX1JlY29yZEJhdGNoID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlJlY29yZEJhdGNoO1xuaW1wb3J0IF9EaWN0aW9uYXJ5QmF0Y2ggPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGljdGlvbmFyeUJhdGNoO1xuaW1wb3J0IF9EaWN0aW9uYXJ5RW5jb2RpbmcgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EaWN0aW9uYXJ5RW5jb2Rpbmc7XG5pbXBvcnQgX0VuZGlhbm5lc3MgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5FbmRpYW5uZXNzO1xuXG5pbXBvcnQgX051bGwgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5OdWxsO1xuaW1wb3J0IF9JbnQgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5JbnQ7XG5pbXBvcnQgX0Zsb2F0aW5nUG9pbnQgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GbG9hdGluZ1BvaW50O1xuaW1wb3J0IF9CaW5hcnkgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5CaW5hcnk7XG5pbXBvcnQgX0Jvb2wgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5Cb29sO1xuaW1wb3J0IF9VdGY4ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVXRmODtcbmltcG9ydCBfRGVjaW1hbCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRlY2ltYWw7XG5pbXBvcnQgX0RhdGUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EYXRlO1xuaW1wb3J0IF9UaW1lID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVGltZTtcbmltcG9ydCBfVGltZXN0YW1wID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVGltZXN0YW1wO1xuaW1wb3J0IF9JbnRlcnZhbCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkludGVydmFsO1xuaW1wb3J0IF9MaXN0ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTGlzdDtcbmltcG9ydCBfU3RydWN0ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuU3RydWN0XztcbmltcG9ydCBfVW5pb24gPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5VbmlvbjtcbmltcG9ydCBfRml4ZWRTaXplQmluYXJ5ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRml4ZWRTaXplQmluYXJ5O1xuaW1wb3J0IF9GaXhlZFNpemVMaXN0ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRml4ZWRTaXplTGlzdDtcbmltcG9ydCBfTWFwID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTWFwO1xuXG5leHBvcnQgY2xhc3MgVHlwZVNlcmlhbGl6ZXIgZXh0ZW5kcyBUeXBlVmlzaXRvciB7XG4gICAgY29uc3RydWN0b3IocHJvdGVjdGVkIGJ1aWxkZXI6IEJ1aWxkZXIpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0TnVsbChfbm9kZTogTnVsbCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX051bGwuc3RhcnROdWxsKGIpIHx8XG4gICAgICAgICAgICBfTnVsbC5lbmROdWxsKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdEludChub2RlOiBJbnQpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9JbnQuc3RhcnRJbnQoYikgfHxcbiAgICAgICAgICAgIF9JbnQuYWRkQml0V2lkdGgoYiwgbm9kZS5iaXRXaWR0aCkgfHxcbiAgICAgICAgICAgIF9JbnQuYWRkSXNTaWduZWQoYiwgbm9kZS5pc1NpZ25lZCkgfHxcbiAgICAgICAgICAgIF9JbnQuZW5kSW50KGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdEZsb2F0KG5vZGU6IEZsb2F0KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfRmxvYXRpbmdQb2ludC5zdGFydEZsb2F0aW5nUG9pbnQoYikgfHxcbiAgICAgICAgICAgIF9GbG9hdGluZ1BvaW50LmFkZFByZWNpc2lvbihiLCBub2RlLnByZWNpc2lvbikgfHxcbiAgICAgICAgICAgIF9GbG9hdGluZ1BvaW50LmVuZEZsb2F0aW5nUG9pbnQoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0QmluYXJ5KF9ub2RlOiBCaW5hcnkpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9CaW5hcnkuc3RhcnRCaW5hcnkoYikgfHxcbiAgICAgICAgICAgIF9CaW5hcnkuZW5kQmluYXJ5KGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdEJvb2woX25vZGU6IEJvb2wpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9Cb29sLnN0YXJ0Qm9vbChiKSB8fFxuICAgICAgICAgICAgX0Jvb2wuZW5kQm9vbChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRVdGY4KF9ub2RlOiBVdGY4KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfVXRmOC5zdGFydFV0ZjgoYikgfHxcbiAgICAgICAgICAgIF9VdGY4LmVuZFV0ZjgoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0RGVjaW1hbChub2RlOiBEZWNpbWFsKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfRGVjaW1hbC5zdGFydERlY2ltYWwoYikgfHxcbiAgICAgICAgICAgIF9EZWNpbWFsLmFkZFNjYWxlKGIsIG5vZGUuc2NhbGUpIHx8XG4gICAgICAgICAgICBfRGVjaW1hbC5hZGRQcmVjaXNpb24oYiwgbm9kZS5wcmVjaXNpb24pIHx8XG4gICAgICAgICAgICBfRGVjaW1hbC5lbmREZWNpbWFsKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdERhdGUobm9kZTogRGF0ZV8pIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIF9EYXRlLnN0YXJ0RGF0ZShiKSB8fCBfRGF0ZS5hZGRVbml0KGIsIG5vZGUudW5pdCkgfHwgX0RhdGUuZW5kRGF0ZShiKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0VGltZShub2RlOiBUaW1lKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfVGltZS5zdGFydFRpbWUoYikgfHxcbiAgICAgICAgICAgIF9UaW1lLmFkZFVuaXQoYiwgbm9kZS51bml0KSB8fFxuICAgICAgICAgICAgX1RpbWUuYWRkQml0V2lkdGgoYiwgbm9kZS5iaXRXaWR0aCkgfHxcbiAgICAgICAgICAgIF9UaW1lLmVuZFRpbWUoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0VGltZXN0YW1wKG5vZGU6IFRpbWVzdGFtcCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICBjb25zdCB0aW1lem9uZSA9IChub2RlLnRpbWV6b25lICYmIGIuY3JlYXRlU3RyaW5nKG5vZGUudGltZXpvbmUpKSB8fCB1bmRlZmluZWQ7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfVGltZXN0YW1wLnN0YXJ0VGltZXN0YW1wKGIpIHx8XG4gICAgICAgICAgICBfVGltZXN0YW1wLmFkZFVuaXQoYiwgbm9kZS51bml0KSB8fFxuICAgICAgICAgICAgKHRpbWV6b25lICE9PSB1bmRlZmluZWQgJiYgX1RpbWVzdGFtcC5hZGRUaW1lem9uZShiLCB0aW1lem9uZSkpIHx8XG4gICAgICAgICAgICBfVGltZXN0YW1wLmVuZFRpbWVzdGFtcChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRJbnRlcnZhbChub2RlOiBJbnRlcnZhbCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0ludGVydmFsLnN0YXJ0SW50ZXJ2YWwoYikgfHwgX0ludGVydmFsLmFkZFVuaXQoYiwgbm9kZS51bml0KSB8fCBfSW50ZXJ2YWwuZW5kSW50ZXJ2YWwoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0TGlzdChfbm9kZTogTGlzdCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0xpc3Quc3RhcnRMaXN0KGIpIHx8XG4gICAgICAgICAgICBfTGlzdC5lbmRMaXN0KGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdFN0cnVjdChfbm9kZTogU3RydWN0KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfU3RydWN0LnN0YXJ0U3RydWN0XyhiKSB8fFxuICAgICAgICAgICAgX1N0cnVjdC5lbmRTdHJ1Y3RfKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdFVuaW9uKG5vZGU6IFVuaW9uKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIGNvbnN0IHR5cGVJZHMgPVxuICAgICAgICAgICAgX1VuaW9uLnN0YXJ0VHlwZUlkc1ZlY3RvcihiLCBub2RlLnR5cGVJZHMubGVuZ3RoKSB8fFxuICAgICAgICAgICAgX1VuaW9uLmNyZWF0ZVR5cGVJZHNWZWN0b3IoYiwgbm9kZS50eXBlSWRzKTtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9Vbmlvbi5zdGFydFVuaW9uKGIpIHx8XG4gICAgICAgICAgICBfVW5pb24uYWRkTW9kZShiLCBub2RlLm1vZGUpIHx8XG4gICAgICAgICAgICBfVW5pb24uYWRkVHlwZUlkcyhiLCB0eXBlSWRzKSB8fFxuICAgICAgICAgICAgX1VuaW9uLmVuZFVuaW9uKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdERpY3Rpb25hcnkobm9kZTogRGljdGlvbmFyeSkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICBjb25zdCBpbmRleFR5cGUgPSB0aGlzLnZpc2l0KG5vZGUuaW5kaWNlcyk7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfRGljdGlvbmFyeUVuY29kaW5nLnN0YXJ0RGljdGlvbmFyeUVuY29kaW5nKGIpIHx8XG4gICAgICAgICAgICBfRGljdGlvbmFyeUVuY29kaW5nLmFkZElkKGIsIG5ldyBMb25nKG5vZGUuaWQsIDApKSB8fFxuICAgICAgICAgICAgX0RpY3Rpb25hcnlFbmNvZGluZy5hZGRJc09yZGVyZWQoYiwgbm9kZS5pc09yZGVyZWQpIHx8XG4gICAgICAgICAgICAoaW5kZXhUeXBlICE9PSB1bmRlZmluZWQgJiYgX0RpY3Rpb25hcnlFbmNvZGluZy5hZGRJbmRleFR5cGUoYiwgaW5kZXhUeXBlKSkgfHxcbiAgICAgICAgICAgIF9EaWN0aW9uYXJ5RW5jb2RpbmcuZW5kRGljdGlvbmFyeUVuY29kaW5nKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdEZpeGVkU2l6ZUJpbmFyeShub2RlOiBGaXhlZFNpemVCaW5hcnkpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9GaXhlZFNpemVCaW5hcnkuc3RhcnRGaXhlZFNpemVCaW5hcnkoYikgfHxcbiAgICAgICAgICAgIF9GaXhlZFNpemVCaW5hcnkuYWRkQnl0ZVdpZHRoKGIsIG5vZGUuYnl0ZVdpZHRoKSB8fFxuICAgICAgICAgICAgX0ZpeGVkU2l6ZUJpbmFyeS5lbmRGaXhlZFNpemVCaW5hcnkoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0Rml4ZWRTaXplTGlzdChub2RlOiBGaXhlZFNpemVMaXN0KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfRml4ZWRTaXplTGlzdC5zdGFydEZpeGVkU2l6ZUxpc3QoYikgfHxcbiAgICAgICAgICAgIF9GaXhlZFNpemVMaXN0LmFkZExpc3RTaXplKGIsIG5vZGUubGlzdFNpemUpIHx8XG4gICAgICAgICAgICBfRml4ZWRTaXplTGlzdC5lbmRGaXhlZFNpemVMaXN0KGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdE1hcChub2RlOiBNYXBfKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfTWFwLnN0YXJ0TWFwKGIpIHx8XG4gICAgICAgICAgICBfTWFwLmFkZEtleXNTb3J0ZWQoYiwgbm9kZS5rZXlzU29ydGVkKSB8fFxuICAgICAgICAgICAgX01hcC5lbmRNYXAoYilcbiAgICAgICAgKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNvbmNhdEJ1ZmZlcnNXaXRoTWV0YWRhdGEodG90YWxCeXRlTGVuZ3RoOiBudW1iZXIsIGJ1ZmZlcnM6IFVpbnQ4QXJyYXlbXSwgYnVmZmVyc01ldGE6IEJ1ZmZlck1ldGFkYXRhW10pIHtcbiAgICBjb25zdCBkYXRhID0gbmV3IFVpbnQ4QXJyYXkodG90YWxCeXRlTGVuZ3RoKTtcbiAgICBmb3IgKGxldCBpID0gLTEsIG4gPSBidWZmZXJzLmxlbmd0aDsgKytpIDwgbjspIHtcbiAgICAgICAgY29uc3QgeyBvZmZzZXQsIGxlbmd0aCB9ID0gYnVmZmVyc01ldGFbaV07XG4gICAgICAgIGNvbnN0IHsgYnVmZmVyLCBieXRlT2Zmc2V0LCBieXRlTGVuZ3RoIH0gPSBidWZmZXJzW2ldO1xuICAgICAgICBjb25zdCByZWFsQnVmZmVyTGVuZ3RoID0gTWF0aC5taW4obGVuZ3RoLCBieXRlTGVuZ3RoKTtcbiAgICAgICAgaWYgKHJlYWxCdWZmZXJMZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBkYXRhLnNldChuZXcgVWludDhBcnJheShidWZmZXIsIGJ5dGVPZmZzZXQsIHJlYWxCdWZmZXJMZW5ndGgpLCBvZmZzZXQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkYXRhO1xufVxuXG5mdW5jdGlvbiB3cml0ZUZvb3RlcihiOiBCdWlsZGVyLCBub2RlOiBGb290ZXIpIHtcbiAgICBsZXQgc2NoZW1hT2Zmc2V0ID0gd3JpdGVTY2hlbWEoYiwgbm9kZS5zY2hlbWEpO1xuICAgIGxldCByZWNvcmRCYXRjaGVzID0gKG5vZGUucmVjb3JkQmF0Y2hlcyB8fCBbXSk7XG4gICAgbGV0IGRpY3Rpb25hcnlCYXRjaGVzID0gKG5vZGUuZGljdGlvbmFyeUJhdGNoZXMgfHwgW10pO1xuICAgIGxldCByZWNvcmRCYXRjaGVzT2Zmc2V0ID1cbiAgICAgICAgX0Zvb3Rlci5zdGFydFJlY29yZEJhdGNoZXNWZWN0b3IoYiwgcmVjb3JkQmF0Y2hlcy5sZW5ndGgpIHx8XG4gICAgICAgICAgICBtYXBSZXZlcnNlKHJlY29yZEJhdGNoZXMsIChyYikgPT4gd3JpdGVCbG9jayhiLCByYikpICYmXG4gICAgICAgIGIuZW5kVmVjdG9yKCk7XG5cbiAgICBsZXQgZGljdGlvbmFyeUJhdGNoZXNPZmZzZXQgPVxuICAgICAgICBfRm9vdGVyLnN0YXJ0RGljdGlvbmFyaWVzVmVjdG9yKGIsIGRpY3Rpb25hcnlCYXRjaGVzLmxlbmd0aCkgfHxcbiAgICAgICAgICAgIG1hcFJldmVyc2UoZGljdGlvbmFyeUJhdGNoZXMsIChkYikgPT4gd3JpdGVCbG9jayhiLCBkYikpICYmXG4gICAgICAgIGIuZW5kVmVjdG9yKCk7XG5cbiAgICByZXR1cm4gKFxuICAgICAgICBfRm9vdGVyLnN0YXJ0Rm9vdGVyKGIpIHx8XG4gICAgICAgIF9Gb290ZXIuYWRkU2NoZW1hKGIsIHNjaGVtYU9mZnNldCkgfHxcbiAgICAgICAgX0Zvb3Rlci5hZGRWZXJzaW9uKGIsIG5vZGUuc2NoZW1hLnZlcnNpb24pIHx8XG4gICAgICAgIF9Gb290ZXIuYWRkUmVjb3JkQmF0Y2hlcyhiLCByZWNvcmRCYXRjaGVzT2Zmc2V0KSB8fFxuICAgICAgICBfRm9vdGVyLmFkZERpY3Rpb25hcmllcyhiLCBkaWN0aW9uYXJ5QmF0Y2hlc09mZnNldCkgfHxcbiAgICAgICAgX0Zvb3Rlci5lbmRGb290ZXIoYilcbiAgICApO1xufVxuXG5mdW5jdGlvbiB3cml0ZUJsb2NrKGI6IEJ1aWxkZXIsIG5vZGU6IEZpbGVCbG9jaykge1xuICAgIHJldHVybiBfQmxvY2suY3JlYXRlQmxvY2soYixcbiAgICAgICAgbmV3IExvbmcobm9kZS5vZmZzZXQsIDApLFxuICAgICAgICBub2RlLm1ldGFEYXRhTGVuZ3RoLFxuICAgICAgICBuZXcgTG9uZyhub2RlLmJvZHlMZW5ndGgsIDApXG4gICAgKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVNZXNzYWdlKGI6IEJ1aWxkZXIsIG5vZGU6IE1lc3NhZ2UpIHtcbiAgICBsZXQgbWVzc2FnZUhlYWRlck9mZnNldCA9IDA7XG4gICAgaWYgKE1lc3NhZ2UuaXNTY2hlbWEobm9kZSkpIHtcbiAgICAgICAgbWVzc2FnZUhlYWRlck9mZnNldCA9IHdyaXRlU2NoZW1hKGIsIG5vZGUgYXMgU2NoZW1hKTtcbiAgICB9IGVsc2UgaWYgKE1lc3NhZ2UuaXNSZWNvcmRCYXRjaChub2RlKSkge1xuICAgICAgICBtZXNzYWdlSGVhZGVyT2Zmc2V0ID0gd3JpdGVSZWNvcmRCYXRjaChiLCBub2RlIGFzIFJlY29yZEJhdGNoTWV0YWRhdGEpO1xuICAgIH0gZWxzZSBpZiAoTWVzc2FnZS5pc0RpY3Rpb25hcnlCYXRjaChub2RlKSkge1xuICAgICAgICBtZXNzYWdlSGVhZGVyT2Zmc2V0ID0gd3JpdGVEaWN0aW9uYXJ5QmF0Y2goYiwgbm9kZSBhcyBEaWN0aW9uYXJ5QmF0Y2gpO1xuICAgIH1cbiAgICByZXR1cm4gKFxuICAgICAgICBfTWVzc2FnZS5zdGFydE1lc3NhZ2UoYikgfHxcbiAgICAgICAgX01lc3NhZ2UuYWRkVmVyc2lvbihiLCBub2RlLnZlcnNpb24pIHx8XG4gICAgICAgIF9NZXNzYWdlLmFkZEhlYWRlcihiLCBtZXNzYWdlSGVhZGVyT2Zmc2V0KSB8fFxuICAgICAgICBfTWVzc2FnZS5hZGRIZWFkZXJUeXBlKGIsIG5vZGUuaGVhZGVyVHlwZSkgfHxcbiAgICAgICAgX01lc3NhZ2UuYWRkQm9keUxlbmd0aChiLCBuZXcgTG9uZyhub2RlLmJvZHlMZW5ndGgsIDApKSB8fFxuICAgICAgICBfTWVzc2FnZS5lbmRNZXNzYWdlKGIpXG4gICAgKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVTY2hlbWEoYjogQnVpbGRlciwgbm9kZTogU2NoZW1hKSB7XG4gICAgY29uc3QgZmllbGRPZmZzZXRzID0gbm9kZS5maWVsZHMubWFwKChmKSA9PiB3cml0ZUZpZWxkKGIsIGYpKTtcbiAgICBjb25zdCBmaWVsZHNPZmZzZXQgPVxuICAgICAgICBfU2NoZW1hLnN0YXJ0RmllbGRzVmVjdG9yKGIsIGZpZWxkT2Zmc2V0cy5sZW5ndGgpIHx8XG4gICAgICAgIF9TY2hlbWEuY3JlYXRlRmllbGRzVmVjdG9yKGIsIGZpZWxkT2Zmc2V0cyk7XG4gICAgcmV0dXJuIChcbiAgICAgICAgX1NjaGVtYS5zdGFydFNjaGVtYShiKSB8fFxuICAgICAgICBfU2NoZW1hLmFkZEZpZWxkcyhiLCBmaWVsZHNPZmZzZXQpIHx8XG4gICAgICAgIF9TY2hlbWEuYWRkRW5kaWFubmVzcyhiLCBwbGF0Zm9ybUlzTGl0dGxlRW5kaWFuID8gX0VuZGlhbm5lc3MuTGl0dGxlIDogX0VuZGlhbm5lc3MuQmlnKSB8fFxuICAgICAgICBfU2NoZW1hLmVuZFNjaGVtYShiKVxuICAgICk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlUmVjb3JkQmF0Y2goYjogQnVpbGRlciwgbm9kZTogUmVjb3JkQmF0Y2hNZXRhZGF0YSkge1xuICAgIGxldCBub2RlcyA9IChub2RlLm5vZGVzIHx8IFtdKTtcbiAgICBsZXQgYnVmZmVycyA9IChub2RlLmJ1ZmZlcnMgfHwgW10pO1xuICAgIGxldCBub2Rlc09mZnNldCA9XG4gICAgICAgIF9SZWNvcmRCYXRjaC5zdGFydE5vZGVzVmVjdG9yKGIsIG5vZGVzLmxlbmd0aCkgfHxcbiAgICAgICAgbWFwUmV2ZXJzZShub2RlcywgKG4pID0+IHdyaXRlRmllbGROb2RlKGIsIG4pKSAmJlxuICAgICAgICBiLmVuZFZlY3RvcigpO1xuXG4gICAgbGV0IGJ1ZmZlcnNPZmZzZXQgPVxuICAgICAgICBfUmVjb3JkQmF0Y2guc3RhcnRCdWZmZXJzVmVjdG9yKGIsIGJ1ZmZlcnMubGVuZ3RoKSB8fFxuICAgICAgICBtYXBSZXZlcnNlKGJ1ZmZlcnMsIChiXykgPT4gd3JpdGVCdWZmZXIoYiwgYl8pKSAmJlxuICAgICAgICBiLmVuZFZlY3RvcigpO1xuXG4gICAgcmV0dXJuIChcbiAgICAgICAgX1JlY29yZEJhdGNoLnN0YXJ0UmVjb3JkQmF0Y2goYikgfHxcbiAgICAgICAgX1JlY29yZEJhdGNoLmFkZExlbmd0aChiLCBuZXcgTG9uZyhub2RlLmxlbmd0aCwgMCkpIHx8XG4gICAgICAgIF9SZWNvcmRCYXRjaC5hZGROb2RlcyhiLCBub2Rlc09mZnNldCkgfHxcbiAgICAgICAgX1JlY29yZEJhdGNoLmFkZEJ1ZmZlcnMoYiwgYnVmZmVyc09mZnNldCkgfHxcbiAgICAgICAgX1JlY29yZEJhdGNoLmVuZFJlY29yZEJhdGNoKGIpXG4gICAgKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVEaWN0aW9uYXJ5QmF0Y2goYjogQnVpbGRlciwgbm9kZTogRGljdGlvbmFyeUJhdGNoKSB7XG4gICAgY29uc3QgZGF0YU9mZnNldCA9IHdyaXRlUmVjb3JkQmF0Y2goYiwgbm9kZS5kYXRhKTtcbiAgICByZXR1cm4gKFxuICAgICAgICBfRGljdGlvbmFyeUJhdGNoLnN0YXJ0RGljdGlvbmFyeUJhdGNoKGIpIHx8XG4gICAgICAgIF9EaWN0aW9uYXJ5QmF0Y2guYWRkSWQoYiwgbmV3IExvbmcobm9kZS5pZCwgMCkpIHx8XG4gICAgICAgIF9EaWN0aW9uYXJ5QmF0Y2guYWRkSXNEZWx0YShiLCBub2RlLmlzRGVsdGEpIHx8XG4gICAgICAgIF9EaWN0aW9uYXJ5QmF0Y2guYWRkRGF0YShiLCBkYXRhT2Zmc2V0KSB8fFxuICAgICAgICBfRGljdGlvbmFyeUJhdGNoLmVuZERpY3Rpb25hcnlCYXRjaChiKVxuICAgICk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlQnVmZmVyKGI6IEJ1aWxkZXIsIG5vZGU6IEJ1ZmZlck1ldGFkYXRhKSB7XG4gICAgcmV0dXJuIF9CdWZmZXIuY3JlYXRlQnVmZmVyKGIsIG5ldyBMb25nKG5vZGUub2Zmc2V0LCAwKSwgbmV3IExvbmcobm9kZS5sZW5ndGgsIDApKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVGaWVsZE5vZGUoYjogQnVpbGRlciwgbm9kZTogRmllbGRNZXRhZGF0YSkge1xuICAgIHJldHVybiBfRmllbGROb2RlLmNyZWF0ZUZpZWxkTm9kZShiLCBuZXcgTG9uZyhub2RlLmxlbmd0aCwgMCksIG5ldyBMb25nKG5vZGUubnVsbENvdW50LCAwKSk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlRmllbGQoYjogQnVpbGRlciwgbm9kZTogRmllbGQpIHtcbiAgICBsZXQgdHlwZU9mZnNldCA9IC0xO1xuICAgIGxldCB0eXBlID0gbm9kZS50eXBlO1xuICAgIGxldCB0eXBlSWQgPSBub2RlLnR5cGVJZDtcbiAgICBsZXQgbmFtZTogbnVtYmVyIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGxldCBtZXRhZGF0YTogbnVtYmVyIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGxldCBkaWN0aW9uYXJ5OiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgICBpZiAoIURhdGFUeXBlLmlzRGljdGlvbmFyeSh0eXBlKSkge1xuICAgICAgICB0eXBlT2Zmc2V0ID0gbmV3IFR5cGVTZXJpYWxpemVyKGIpLnZpc2l0KHR5cGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHR5cGVJZCA9IHR5cGUuZGljdGlvbmFyeS5UVHlwZTtcbiAgICAgICAgZGljdGlvbmFyeSA9IG5ldyBUeXBlU2VyaWFsaXplcihiKS52aXNpdCh0eXBlKTtcbiAgICAgICAgdHlwZU9mZnNldCA9IG5ldyBUeXBlU2VyaWFsaXplcihiKS52aXNpdCh0eXBlLmRpY3Rpb25hcnkpO1xuICAgIH1cblxuICAgIGxldCBjaGlsZHJlbiA9IF9GaWVsZC5jcmVhdGVDaGlsZHJlblZlY3RvcihiLCAodHlwZS5jaGlsZHJlbiB8fCBbXSkubWFwKChmKSA9PiB3cml0ZUZpZWxkKGIsIGYpKSk7XG4gICAgaWYgKG5vZGUubWV0YWRhdGEgJiYgbm9kZS5tZXRhZGF0YS5zaXplID4gMCkge1xuICAgICAgICBtZXRhZGF0YSA9IF9GaWVsZC5jcmVhdGVDdXN0b21NZXRhZGF0YVZlY3RvcihcbiAgICAgICAgICAgIGIsXG4gICAgICAgICAgICBbLi4ubm9kZS5tZXRhZGF0YV0ubWFwKChbaywgdl0pID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBrZXkgPSBiLmNyZWF0ZVN0cmluZyhrKTtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWwgPSBiLmNyZWF0ZVN0cmluZyh2KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgICBfS2V5VmFsdWUuc3RhcnRLZXlWYWx1ZShiKSB8fFxuICAgICAgICAgICAgICAgICAgICBfS2V5VmFsdWUuYWRkS2V5KGIsIGtleSkgfHxcbiAgICAgICAgICAgICAgICAgICAgX0tleVZhbHVlLmFkZFZhbHVlKGIsIHZhbCkgfHxcbiAgICAgICAgICAgICAgICAgICAgX0tleVZhbHVlLmVuZEtleVZhbHVlKGIpXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxuICAgIGlmIChub2RlLm5hbWUpIHtcbiAgICAgICAgbmFtZSA9IGIuY3JlYXRlU3RyaW5nKG5vZGUubmFtZSk7XG4gICAgfVxuICAgIHJldHVybiAoXG4gICAgICAgIF9GaWVsZC5zdGFydEZpZWxkKGIpIHx8XG4gICAgICAgIF9GaWVsZC5hZGRUeXBlKGIsIHR5cGVPZmZzZXQpIHx8XG4gICAgICAgIF9GaWVsZC5hZGRUeXBlVHlwZShiLCB0eXBlSWQpIHx8XG4gICAgICAgIF9GaWVsZC5hZGRDaGlsZHJlbihiLCBjaGlsZHJlbikgfHxcbiAgICAgICAgX0ZpZWxkLmFkZE51bGxhYmxlKGIsICEhbm9kZS5udWxsYWJsZSkgfHxcbiAgICAgICAgKG5hbWUgIT09IHVuZGVmaW5lZCAmJiBfRmllbGQuYWRkTmFtZShiLCBuYW1lKSkgfHxcbiAgICAgICAgKGRpY3Rpb25hcnkgIT09IHVuZGVmaW5lZCAmJiBfRmllbGQuYWRkRGljdGlvbmFyeShiLCBkaWN0aW9uYXJ5KSkgfHxcbiAgICAgICAgKG1ldGFkYXRhICE9PSB1bmRlZmluZWQgJiYgX0ZpZWxkLmFkZEN1c3RvbU1ldGFkYXRhKGIsIG1ldGFkYXRhKSkgfHxcbiAgICAgICAgX0ZpZWxkLmVuZEZpZWxkKGIpXG4gICAgKTtcbn1cblxuZnVuY3Rpb24gbWFwUmV2ZXJzZTxULCBVPihzb3VyY2U6IFRbXSwgY2FsbGJhY2tmbjogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBVKTogVVtdIHtcbiAgICBjb25zdCByZXN1bHQgPSBuZXcgQXJyYXkoc291cmNlLmxlbmd0aCk7XG4gICAgZm9yIChsZXQgaSA9IC0xLCBqID0gc291cmNlLmxlbmd0aDsgLS1qID4gLTE7KSB7XG4gICAgICAgIHJlc3VsdFtpXSA9IGNhbGxiYWNrZm4oc291cmNlW2pdLCBpLCBzb3VyY2UpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5jb25zdCBwbGF0Zm9ybUlzTGl0dGxlRW5kaWFuID0gKGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcigyKTtcbiAgICBuZXcgRGF0YVZpZXcoYnVmZmVyKS5zZXRJbnQxNigwLCAyNTYsIHRydWUgLyogbGl0dGxlRW5kaWFuICovKTtcbiAgICAvLyBJbnQxNkFycmF5IHVzZXMgdGhlIHBsYXRmb3JtJ3MgZW5kaWFubmVzcy5cbiAgICByZXR1cm4gbmV3IEludDE2QXJyYXkoYnVmZmVyKVswXSA9PT0gMjU2O1xufSkoKTtcbiJdfQ==

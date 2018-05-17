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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUMsS0FBSyxHQUFHLENBQUM7QUFDN0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyIsImZpbGUiOiJpcGMvd3JpdGVyL2JpbmFyeS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBUYWJsZSB9IGZyb20gJy4uLy4uL3RhYmxlJztcbmltcG9ydCB7IERlbnNlVW5pb25EYXRhIH0gZnJvbSAnLi4vLi4vZGF0YSc7XG5pbXBvcnQgeyBSZWNvcmRCYXRjaCB9IGZyb20gJy4uLy4uL3JlY29yZGJhdGNoJztcbmltcG9ydCB7IFZlY3RvclZpc2l0b3IsIFR5cGVWaXNpdG9yIH0gZnJvbSAnLi4vLi4vdmlzaXRvcic7XG5pbXBvcnQgeyBNQUdJQywgbWFnaWNMZW5ndGgsIG1hZ2ljQW5kUGFkZGluZywgUEFERElORyB9IGZyb20gJy4uL21hZ2ljJztcbmltcG9ydCB7IGFsaWduLCBnZXRCb29sLCBwYWNrQm9vbHMsIGl0ZXJhdGVCaXRzIH0gZnJvbSAnLi4vLi4vdXRpbC9iaXQnO1xuaW1wb3J0IHsgVmVjdG9yLCBVbmlvblZlY3RvciwgRGljdGlvbmFyeVZlY3RvciwgTmVzdGVkVmVjdG9yLCBMaXN0VmVjdG9yIH0gZnJvbSAnLi4vLi4vdmVjdG9yJztcbmltcG9ydCB7IEJ1ZmZlck1ldGFkYXRhLCBGaWVsZE1ldGFkYXRhLCBGb290ZXIsIEZpbGVCbG9jaywgTWVzc2FnZSwgUmVjb3JkQmF0Y2hNZXRhZGF0YSwgRGljdGlvbmFyeUJhdGNoIH0gZnJvbSAnLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtcbiAgICBTY2hlbWEsIEZpZWxkLCBUeXBlZEFycmF5LCBNZXRhZGF0YVZlcnNpb24sXG4gICAgRGF0YVR5cGUsXG4gICAgRGljdGlvbmFyeSxcbiAgICBOdWxsLCBJbnQsIEZsb2F0LFxuICAgIEJpbmFyeSwgQm9vbCwgVXRmOCwgRGVjaW1hbCxcbiAgICBEYXRlXywgVGltZSwgVGltZXN0YW1wLCBJbnRlcnZhbCxcbiAgICBMaXN0LCBTdHJ1Y3QsIFVuaW9uLCBGaXhlZFNpemVCaW5hcnksIEZpeGVkU2l6ZUxpc3QsIE1hcF8sXG4gICAgRmxhdFR5cGUsIEZsYXRMaXN0VHlwZSwgTmVzdGVkVHlwZSwgVW5pb25Nb2RlLCBTcGFyc2VVbmlvbiwgRGVuc2VVbmlvbiwgU2luZ2xlTmVzdGVkVHlwZSxcbn0gZnJvbSAnLi4vLi4vdHlwZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiogc2VyaWFsaXplU3RyZWFtKHRhYmxlOiBUYWJsZSkge1xuICAgIHlpZWxkIHNlcmlhbGl6ZU1lc3NhZ2UodGFibGUuc2NoZW1hKS5idWZmZXI7XG4gICAgZm9yIChjb25zdCBbaWQsIGZpZWxkXSBvZiB0YWJsZS5zY2hlbWEuZGljdGlvbmFyaWVzKSB7XG4gICAgICAgIGNvbnN0IHZlYyA9IHRhYmxlLmdldENvbHVtbihmaWVsZC5uYW1lKSBhcyBEaWN0aW9uYXJ5VmVjdG9yO1xuICAgICAgICBpZiAodmVjICYmIHZlYy5kaWN0aW9uYXJ5KSB7XG4gICAgICAgICAgICB5aWVsZCBzZXJpYWxpemVEaWN0aW9uYXJ5QmF0Y2godmVjLmRpY3Rpb25hcnksIGlkKS5idWZmZXI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCByZWNvcmRCYXRjaCBvZiB0YWJsZS5iYXRjaGVzKSB7XG4gICAgICAgIHlpZWxkIHNlcmlhbGl6ZVJlY29yZEJhdGNoKHJlY29yZEJhdGNoKS5idWZmZXI7XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24qIHNlcmlhbGl6ZUZpbGUodGFibGU6IFRhYmxlKSB7XG5cbiAgICBjb25zdCByZWNvcmRCYXRjaGVzID0gW107XG4gICAgY29uc3QgZGljdGlvbmFyeUJhdGNoZXMgPSBbXTtcblxuICAgIC8vIEZpcnN0IHlpZWxkIHRoZSBtYWdpYyBzdHJpbmcgKGFsaWduZWQpXG4gICAgbGV0IGJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KGFsaWduKG1hZ2ljTGVuZ3RoLCA4KSk7XG4gICAgbGV0IG1ldGFkYXRhTGVuZ3RoLCBieXRlTGVuZ3RoID0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgYnVmZmVyLnNldChNQUdJQywgMCk7XG4gICAgeWllbGQgYnVmZmVyO1xuXG4gICAgLy8gVGhlbiB5aWVsZCB0aGUgc2NoZW1hXG4gICAgKHsgbWV0YWRhdGFMZW5ndGgsIGJ1ZmZlciB9ID0gc2VyaWFsaXplTWVzc2FnZSh0YWJsZS5zY2hlbWEpKTtcbiAgICBieXRlTGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgIHlpZWxkIGJ1ZmZlcjtcblxuICAgIGZvciAoY29uc3QgW2lkLCBmaWVsZF0gb2YgdGFibGUuc2NoZW1hLmRpY3Rpb25hcmllcykge1xuICAgICAgICBjb25zdCB2ZWMgPSB0YWJsZS5nZXRDb2x1bW4oZmllbGQubmFtZSkgYXMgRGljdGlvbmFyeVZlY3RvcjtcbiAgICAgICAgaWYgKHZlYyAmJiB2ZWMuZGljdGlvbmFyeSkge1xuICAgICAgICAgICAgKHsgbWV0YWRhdGFMZW5ndGgsIGJ1ZmZlciB9ID0gc2VyaWFsaXplRGljdGlvbmFyeUJhdGNoKHZlYy5kaWN0aW9uYXJ5LCBpZCkpO1xuICAgICAgICAgICAgZGljdGlvbmFyeUJhdGNoZXMucHVzaChuZXcgRmlsZUJsb2NrKG1ldGFkYXRhTGVuZ3RoLCBidWZmZXIuYnl0ZUxlbmd0aCwgYnl0ZUxlbmd0aCkpO1xuICAgICAgICAgICAgYnl0ZUxlbmd0aCArPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgICAgIHlpZWxkIGJ1ZmZlcjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IHJlY29yZEJhdGNoIG9mIHRhYmxlLmJhdGNoZXMpIHtcbiAgICAgICAgKHsgbWV0YWRhdGFMZW5ndGgsIGJ1ZmZlciB9ID0gc2VyaWFsaXplUmVjb3JkQmF0Y2gocmVjb3JkQmF0Y2gpKTtcbiAgICAgICAgcmVjb3JkQmF0Y2hlcy5wdXNoKG5ldyBGaWxlQmxvY2sobWV0YWRhdGFMZW5ndGgsIGJ1ZmZlci5ieXRlTGVuZ3RoLCBieXRlTGVuZ3RoKSk7XG4gICAgICAgIGJ5dGVMZW5ndGggKz0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgICAgIHlpZWxkIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICAvLyBUaGVuIHlpZWxkIHRoZSBmb290ZXIgbWV0YWRhdGEgKG5vdCBhbGlnbmVkKVxuICAgICh7IG1ldGFkYXRhTGVuZ3RoLCBidWZmZXIgfSA9IHNlcmlhbGl6ZUZvb3RlcihuZXcgRm9vdGVyKGRpY3Rpb25hcnlCYXRjaGVzLCByZWNvcmRCYXRjaGVzLCB0YWJsZS5zY2hlbWEpKSk7XG4gICAgeWllbGQgYnVmZmVyO1xuICAgIFxuICAgIC8vIExhc3QsIHlpZWxkIHRoZSBmb290ZXIgbGVuZ3RoICsgdGVybWluYXRpbmcgbWFnaWMgYXJyb3cgc3RyaW5nIChhbGlnbmVkKVxuICAgIGJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KG1hZ2ljQW5kUGFkZGluZyk7XG4gICAgbmV3IERhdGFWaWV3KGJ1ZmZlci5idWZmZXIpLnNldEludDMyKDAsIG1ldGFkYXRhTGVuZ3RoLCBwbGF0Zm9ybUlzTGl0dGxlRW5kaWFuKTtcbiAgICBidWZmZXIuc2V0KE1BR0lDLCBidWZmZXIuYnl0ZUxlbmd0aCAtIG1hZ2ljTGVuZ3RoKTtcbiAgICB5aWVsZCBidWZmZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVSZWNvcmRCYXRjaChyZWNvcmRCYXRjaDogUmVjb3JkQmF0Y2gpIHtcbiAgICBjb25zdCB7IGJ5dGVMZW5ndGgsIGZpZWxkTm9kZXMsIGJ1ZmZlcnMsIGJ1ZmZlcnNNZXRhIH0gPSBuZXcgUmVjb3JkQmF0Y2hTZXJpYWxpemVyKCkudmlzaXRSZWNvcmRCYXRjaChyZWNvcmRCYXRjaCk7XG4gICAgY29uc3QgcmJNZXRhID0gbmV3IFJlY29yZEJhdGNoTWV0YWRhdGEoTWV0YWRhdGFWZXJzaW9uLlY0LCByZWNvcmRCYXRjaC5sZW5ndGgsIGZpZWxkTm9kZXMsIGJ1ZmZlcnNNZXRhKTtcbiAgICBjb25zdCByYkRhdGEgPSBjb25jYXRCdWZmZXJzV2l0aE1ldGFkYXRhKGJ5dGVMZW5ndGgsIGJ1ZmZlcnMsIGJ1ZmZlcnNNZXRhKTtcbiAgICByZXR1cm4gc2VyaWFsaXplTWVzc2FnZShyYk1ldGEsIHJiRGF0YSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVEaWN0aW9uYXJ5QmF0Y2goZGljdGlvbmFyeTogVmVjdG9yLCBpZDogTG9uZyB8IG51bWJlciwgaXNEZWx0YTogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgY29uc3QgeyBieXRlTGVuZ3RoLCBmaWVsZE5vZGVzLCBidWZmZXJzLCBidWZmZXJzTWV0YSB9ID0gbmV3IFJlY29yZEJhdGNoU2VyaWFsaXplcigpLnZpc2l0UmVjb3JkQmF0Y2goUmVjb3JkQmF0Y2guZnJvbShbZGljdGlvbmFyeV0pKTtcbiAgICBjb25zdCByYk1ldGEgPSBuZXcgUmVjb3JkQmF0Y2hNZXRhZGF0YShNZXRhZGF0YVZlcnNpb24uVjQsIGRpY3Rpb25hcnkubGVuZ3RoLCBmaWVsZE5vZGVzLCBidWZmZXJzTWV0YSk7XG4gICAgY29uc3QgZGJNZXRhID0gbmV3IERpY3Rpb25hcnlCYXRjaChNZXRhZGF0YVZlcnNpb24uVjQsIHJiTWV0YSwgaWQsIGlzRGVsdGEpO1xuICAgIGNvbnN0IHJiRGF0YSA9IGNvbmNhdEJ1ZmZlcnNXaXRoTWV0YWRhdGEoYnl0ZUxlbmd0aCwgYnVmZmVycywgYnVmZmVyc01ldGEpO1xuICAgIHJldHVybiBzZXJpYWxpemVNZXNzYWdlKGRiTWV0YSwgcmJEYXRhKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZU1lc3NhZ2UobWVzc2FnZTogTWVzc2FnZSwgZGF0YT86IFVpbnQ4QXJyYXkpIHtcbiAgICBjb25zdCBiID0gbmV3IEJ1aWxkZXIoKTtcbiAgICBfTWVzc2FnZS5maW5pc2hNZXNzYWdlQnVmZmVyKGIsIHdyaXRlTWVzc2FnZShiLCBtZXNzYWdlKSk7XG4gICAgLy8gU2xpY2Ugb3V0IHRoZSBidWZmZXIgdGhhdCBjb250YWlucyB0aGUgbWVzc2FnZSBtZXRhZGF0YVxuICAgIGNvbnN0IG1ldGFkYXRhQnl0ZXMgPSBiLmFzVWludDhBcnJheSgpO1xuICAgIC8vIFJlc2VydmUgNCBieXRlcyBmb3Igd3JpdGluZyB0aGUgbWVzc2FnZSBzaXplIGF0IHRoZSBmcm9udC5cbiAgICAvLyBNZXRhZGF0YSBsZW5ndGggaW5jbHVkZXMgdGhlIG1ldGFkYXRhIGJ5dGVMZW5ndGggKyB0aGUgNFxuICAgIC8vIGJ5dGVzIGZvciB0aGUgbGVuZ3RoLCBhbmQgcm91bmRlZCB1cCB0byB0aGUgbmVhcmVzdCA4IGJ5dGVzLlxuICAgIGNvbnN0IG1ldGFkYXRhTGVuZ3RoID0gYWxpZ24oUEFERElORyArIG1ldGFkYXRhQnl0ZXMuYnl0ZUxlbmd0aCwgOCk7XG4gICAgLy8gKyB0aGUgbGVuZ3RoIG9mIHRoZSBvcHRpb25hbCBkYXRhIGJ1ZmZlciBhdCB0aGUgZW5kLCBwYWRkZWRcbiAgICBjb25zdCBkYXRhQnl0ZUxlbmd0aCA9IGRhdGEgPyBkYXRhLmJ5dGVMZW5ndGggOiAwO1xuICAgIC8vIGVuc3VyZSB0aGUgZW50aXJlIG1lc3NhZ2UgaXMgYWxpZ25lZCB0byBhbiA4LWJ5dGUgYm91bmRhcnlcbiAgICBjb25zdCBtZXNzYWdlQnl0ZXMgPSBuZXcgVWludDhBcnJheShhbGlnbihtZXRhZGF0YUxlbmd0aCArIGRhdGFCeXRlTGVuZ3RoLCA4KSk7XG4gICAgLy8gV3JpdGUgdGhlIG1ldGFkYXRhIGxlbmd0aCBpbnRvIHRoZSBmaXJzdCA0IGJ5dGVzLCBidXQgc3VidHJhY3QgdGhlXG4gICAgLy8gYnl0ZXMgd2UgdXNlIHRvIGhvbGQgdGhlIGxlbmd0aCBpdHNlbGYuXG4gICAgbmV3IERhdGFWaWV3KG1lc3NhZ2VCeXRlcy5idWZmZXIpLnNldEludDMyKDAsIG1ldGFkYXRhTGVuZ3RoIC0gUEFERElORywgcGxhdGZvcm1Jc0xpdHRsZUVuZGlhbik7XG4gICAgLy8gQ29weSB0aGUgbWV0YWRhdGEgYnl0ZXMgaW50byB0aGUgbWVzc2FnZSBidWZmZXJcbiAgICBtZXNzYWdlQnl0ZXMuc2V0KG1ldGFkYXRhQnl0ZXMsIFBBRERJTkcpO1xuICAgIC8vIENvcHkgdGhlIG9wdGlvbmFsIGRhdGEgYnVmZmVyIGFmdGVyIHRoZSBtZXRhZGF0YSBieXRlc1xuICAgIChkYXRhICYmIGRhdGFCeXRlTGVuZ3RoID4gMCkgJiYgbWVzc2FnZUJ5dGVzLnNldChkYXRhLCBtZXRhZGF0YUxlbmd0aCk7XG4gICAgLy8gaWYgKG1lc3NhZ2VCeXRlcy5ieXRlTGVuZ3RoICUgOCAhPT0gMCkgeyBkZWJ1Z2dlcjsgfVxuICAgIC8vIFJldHVybiB0aGUgbWV0YWRhdGEgbGVuZ3RoIGJlY2F1c2Ugd2UgbmVlZCB0byB3cml0ZSBpdCBpbnRvIGVhY2ggRmlsZUJsb2NrIGFsc29cbiAgICByZXR1cm4geyBtZXRhZGF0YUxlbmd0aCwgYnVmZmVyOiBtZXNzYWdlQnl0ZXMgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZUZvb3Rlcihmb290ZXI6IEZvb3Rlcikge1xuICAgIGNvbnN0IGIgPSBuZXcgQnVpbGRlcigpO1xuICAgIF9Gb290ZXIuZmluaXNoRm9vdGVyQnVmZmVyKGIsIHdyaXRlRm9vdGVyKGIsIGZvb3RlcikpO1xuICAgIC8vIFNsaWNlIG91dCB0aGUgYnVmZmVyIHRoYXQgY29udGFpbnMgdGhlIGZvb3RlciBtZXRhZGF0YVxuICAgIGNvbnN0IGZvb3RlckJ5dGVzID0gYi5hc1VpbnQ4QXJyYXkoKTtcbiAgICBjb25zdCBtZXRhZGF0YUxlbmd0aCA9IGZvb3RlckJ5dGVzLmJ5dGVMZW5ndGg7XG4gICAgcmV0dXJuIHsgbWV0YWRhdGFMZW5ndGgsIGJ1ZmZlcjogZm9vdGVyQnl0ZXMgfTtcbn1cblxuZXhwb3J0IGNsYXNzIFJlY29yZEJhdGNoU2VyaWFsaXplciBleHRlbmRzIFZlY3RvclZpc2l0b3Ige1xuICAgIHB1YmxpYyBieXRlTGVuZ3RoID0gMDtcbiAgICBwdWJsaWMgYnVmZmVyczogVHlwZWRBcnJheVtdID0gW107XG4gICAgcHVibGljIGZpZWxkTm9kZXM6IEZpZWxkTWV0YWRhdGFbXSA9IFtdO1xuICAgIHB1YmxpYyBidWZmZXJzTWV0YTogQnVmZmVyTWV0YWRhdGFbXSA9IFtdO1xuICAgIHB1YmxpYyB2aXNpdFJlY29yZEJhdGNoKHJlY29yZEJhdGNoOiBSZWNvcmRCYXRjaCkge1xuICAgICAgICB0aGlzLmJ1ZmZlcnMgPSBbXTtcbiAgICAgICAgdGhpcy5ieXRlTGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5maWVsZE5vZGVzID0gW107XG4gICAgICAgIHRoaXMuYnVmZmVyc01ldGEgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgdmVjdG9yOiBWZWN0b3IsIGluZGV4ID0gLTEsIG51bUNvbHMgPSByZWNvcmRCYXRjaC5udW1Db2xzOyArK2luZGV4IDwgbnVtQ29sczspIHtcbiAgICAgICAgICAgIGlmICh2ZWN0b3IgPSByZWNvcmRCYXRjaC5nZXRDaGlsZEF0KGluZGV4KSEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnZpc2l0KHZlY3Rvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdDxUIGV4dGVuZHMgRGF0YVR5cGU+KHZlY3RvcjogVmVjdG9yPFQ+KSB7XG4gICAgICAgIGlmICghRGF0YVR5cGUuaXNEaWN0aW9uYXJ5KHZlY3Rvci50eXBlKSkge1xuICAgICAgICAgICAgY29uc3QgeyBkYXRhLCBsZW5ndGgsIG51bGxDb3VudCB9ID0gdmVjdG9yO1xuICAgICAgICAgICAgaWYgKGxlbmd0aCA+IDIxNDc0ODM2NDcpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQ2Fubm90IHdyaXRlIGFycmF5cyBsYXJnZXIgdGhhbiAyXjMxIC0gMSBpbiBsZW5ndGgnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZmllbGROb2Rlcy5wdXNoKG5ldyBGaWVsZE1ldGFkYXRhKGxlbmd0aCwgbnVsbENvdW50KSk7XG5cbiAgICAgICAgICAgIGNvbnN0IG51bGxCaXRtYXBBbGlnbm1lbnQgPSBsZW5ndGggPD0gNjQgPyA4IDogNjQ7XG4gICAgICAgICAgICBjb25zdCBudWxsQml0bWFwID0gbnVsbENvdW50IDw9IDBcbiAgICAgICAgICAgICAgICA/IG5ldyBVaW50OEFycmF5KDApIC8vIHBsYWNlaG9sZGVyIHZhbGlkaXR5IGJ1ZmZlclxuICAgICAgICAgICAgICAgIDogdGhpcy5nZXRUcnVuY2F0ZWRCaXRtYXAoZGF0YS5vZmZzZXQsIGxlbmd0aCwgZGF0YS5udWxsQml0bWFwISk7XG4gICAgICAgICAgICB0aGlzLmFkZEJ1ZmZlcihudWxsQml0bWFwLCBudWxsQml0bWFwQWxpZ25tZW50KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3VwZXIudmlzaXQodmVjdG9yKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0TnVsbCAgICAgICAgICAgKF9udWxsejogVmVjdG9yPE51bGw+KSAgICAgICAgICAgIHsgcmV0dXJuIHRoaXM7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdEJvb2wgICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxCb29sPikgICAgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0Qm9vbFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRJbnQgICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8SW50PikgICAgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0RmxvYXQgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPEZsb2F0PikgICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdFV0ZjggICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxVdGY4PikgICAgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdExpc3RWZWN0b3IodmVjdG9yKTsgIH1cbiAgICBwdWJsaWMgdmlzaXRCaW5hcnkgICAgICAgICAodmVjdG9yOiBWZWN0b3I8QmluYXJ5PikgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRMaXN0VmVjdG9yKHZlY3Rvcik7ICB9XG4gICAgcHVibGljIHZpc2l0RGF0ZSAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPERhdGVfPikgICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdFRpbWVzdGFtcCAgICAgICh2ZWN0b3I6IFZlY3RvcjxUaW1lc3RhbXA+KSAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRUaW1lICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8VGltZT4pICAgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0RGVjaW1hbCAgICAgICAgKHZlY3RvcjogVmVjdG9yPERlY2ltYWw+KSAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdEludGVydmFsICAgICAgICh2ZWN0b3I6IFZlY3RvcjxJbnRlcnZhbD4pICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRMaXN0ICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8TGlzdD4pICAgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdExpc3RWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0U3RydWN0ICAgICAgICAgKHZlY3RvcjogVmVjdG9yPFN0cnVjdD4pICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXROZXN0ZWRWZWN0b3IodmVjdG9yKTsgICAgfVxuICAgIHB1YmxpYyB2aXNpdEZpeGVkU2l6ZUJpbmFyeSh2ZWN0b3I6IFZlY3RvcjxGaXhlZFNpemVCaW5hcnk+KSB7IHJldHVybiB0aGlzLnZpc2l0RmxhdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRGaXhlZFNpemVMaXN0ICAodmVjdG9yOiBWZWN0b3I8Rml4ZWRTaXplTGlzdD4pICAgeyByZXR1cm4gdGhpcy52aXNpdExpc3RWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0TWFwICAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPE1hcF8+KSAgICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXROZXN0ZWRWZWN0b3IodmVjdG9yKTsgICAgfVxuICAgIHB1YmxpYyB2aXNpdERpY3Rpb25hcnkgICAgICh2ZWN0b3I6IERpY3Rpb25hcnlWZWN0b3IpICAgICAgICB7XG4gICAgICAgIC8vIERpY3Rpb25hcnkgd3JpdHRlbiBvdXQgc2VwYXJhdGVseS4gU2xpY2Ugb2Zmc2V0IGNvbnRhaW5lZCBpbiB0aGUgaW5kaWNlc1xuICAgICAgICByZXR1cm4gdGhpcy52aXNpdCh2ZWN0b3IuaW5kaWNlcyk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdFVuaW9uKHZlY3RvcjogVmVjdG9yPERlbnNlVW5pb24gfCBTcGFyc2VVbmlvbj4pIHtcbiAgICAgICAgY29uc3QgeyBkYXRhLCB0eXBlLCBsZW5ndGggfSA9IHZlY3RvcjtcbiAgICAgICAgY29uc3QgeyBvZmZzZXQ6IHNsaWNlT2Zmc2V0LCB0eXBlSWRzIH0gPSBkYXRhO1xuICAgICAgICAvLyBBbGwgVW5pb24gVmVjdG9ycyBoYXZlIGEgdHlwZUlkcyBidWZmZXJcbiAgICAgICAgdGhpcy5hZGRCdWZmZXIodHlwZUlkcyk7XG4gICAgICAgIC8vIElmIHRoaXMgaXMgYSBTcGFyc2UgVW5pb24sIHRyZWF0IGl0IGxpa2UgYWxsIG90aGVyIE5lc3RlZCB0eXBlc1xuICAgICAgICBpZiAodHlwZS5tb2RlID09PSBVbmlvbk1vZGUuU3BhcnNlKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52aXNpdE5lc3RlZFZlY3Rvcih2ZWN0b3IpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUubW9kZSA9PT0gVW5pb25Nb2RlLkRlbnNlKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGlzIGlzIGEgRGVuc2UgVW5pb24sIGFkZCB0aGUgdmFsdWVPZmZzZXRzIGJ1ZmZlciBhbmQgcG90ZW50aWFsbHkgc2xpY2UgdGhlIGNoaWxkcmVuXG4gICAgICAgICAgICBjb25zdCB2YWx1ZU9mZnNldHMgPSAoZGF0YSBhcyBEZW5zZVVuaW9uRGF0YSkudmFsdWVPZmZzZXRzO1xuICAgICAgICAgICAgaWYgKHNsaWNlT2Zmc2V0IDw9IDApIHtcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgVmVjdG9yIGhhc24ndCBiZWVuIHNsaWNlZCwgd3JpdGUgdGhlIGV4aXN0aW5nIHZhbHVlT2Zmc2V0c1xuICAgICAgICAgICAgICAgIHRoaXMuYWRkQnVmZmVyKHZhbHVlT2Zmc2V0cyk7XG4gICAgICAgICAgICAgICAgLy8gV2UgY2FuIHRyZWF0IHRoaXMgbGlrZSBhbGwgb3RoZXIgTmVzdGVkIHR5cGVzXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudmlzaXROZXN0ZWRWZWN0b3IodmVjdG9yKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gQSBzbGljZWQgRGVuc2UgVW5pb24gaXMgYW4gdW5wbGVhc2FudCBjYXNlLiBCZWNhdXNlIHRoZSBvZmZzZXRzIGFyZSBkaWZmZXJlbnQgZm9yXG4gICAgICAgICAgICAgICAgLy8gZWFjaCBjaGlsZCB2ZWN0b3IsIHdlIG5lZWQgdG8gXCJyZWJhc2VcIiB0aGUgdmFsdWVPZmZzZXRzIGZvciBlYWNoIGNoaWxkXG4gICAgICAgICAgICAgICAgLy8gVW5pb24gdHlwZUlkcyBhcmUgbm90IG5lY2Vzc2FyeSAwLWluZGV4ZWRcbiAgICAgICAgICAgICAgICBjb25zdCBtYXhDaGlsZFR5cGVJZCA9IE1hdGgubWF4KC4uLnR5cGUudHlwZUlkcyk7XG4gICAgICAgICAgICAgICAgY29uc3QgY2hpbGRMZW5ndGhzID0gbmV3IEludDMyQXJyYXkobWF4Q2hpbGRUeXBlSWQgKyAxKTtcbiAgICAgICAgICAgICAgICAvLyBTZXQgYWxsIHRvIC0xIHRvIGluZGljYXRlIHRoYXQgd2UgaGF2ZW4ndCBvYnNlcnZlZCBhIGZpcnN0IG9jY3VycmVuY2Ugb2YgYSBwYXJ0aWN1bGFyIGNoaWxkIHlldFxuICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkT2Zmc2V0cyA9IG5ldyBJbnQzMkFycmF5KG1heENoaWxkVHlwZUlkICsgMSkuZmlsbCgtMSk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2hpZnRlZE9mZnNldHMgPSBuZXcgSW50MzJBcnJheShsZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHVuc2hpZnRlZE9mZnNldHMgPSB0aGlzLmdldFplcm9CYXNlZFZhbHVlT2Zmc2V0cyhzbGljZU9mZnNldCwgbGVuZ3RoLCB2YWx1ZU9mZnNldHMpO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IHR5cGVJZCwgc2hpZnQsIGluZGV4ID0gLTE7ICsraW5kZXggPCBsZW5ndGg7KSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGVJZCA9IHR5cGVJZHNbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAvLyB+KC0xKSB1c2VkIHRvIGJlIGZhc3RlciB0aGFuIHggPT09IC0xLCBzbyBtYXliZSB3b3J0aCBiZW5jaG1hcmtpbmcgdGhlIGRpZmZlcmVuY2Ugb2YgdGhlc2UgdHdvIGltcGxzIGZvciBsYXJnZSBkZW5zZSB1bmlvbnM6XG4gICAgICAgICAgICAgICAgICAgIC8vIH4oc2hpZnQgPSBjaGlsZE9mZnNldHNbdHlwZUlkXSkgfHwgKHNoaWZ0ID0gY2hpbGRPZmZzZXRzW3R5cGVJZF0gPSB1bnNoaWZ0ZWRPZmZzZXRzW2luZGV4XSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIEdvaW5nIHdpdGggdGhpcyBmb3JtIGZvciBub3csIGFzIGl0J3MgbW9yZSByZWFkYWJsZVxuICAgICAgICAgICAgICAgICAgICBpZiAoKHNoaWZ0ID0gY2hpbGRPZmZzZXRzW3R5cGVJZF0pID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hpZnQgPSBjaGlsZE9mZnNldHNbdHlwZUlkXSA9IHVuc2hpZnRlZE9mZnNldHNbdHlwZUlkXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzaGlmdGVkT2Zmc2V0c1tpbmRleF0gPSB1bnNoaWZ0ZWRPZmZzZXRzW2luZGV4XSAtIHNoaWZ0O1xuICAgICAgICAgICAgICAgICAgICArK2NoaWxkTGVuZ3Roc1t0eXBlSWRdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLmFkZEJ1ZmZlcihzaGlmdGVkT2Zmc2V0cyk7XG4gICAgICAgICAgICAgICAgLy8gU2xpY2UgYW5kIHZpc2l0IGNoaWxkcmVuIGFjY29yZGluZ2x5XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgY2hpbGRJbmRleCA9IC0xLCBudW1DaGlsZHJlbiA9IHR5cGUuY2hpbGRyZW4ubGVuZ3RoOyArK2NoaWxkSW5kZXggPCBudW1DaGlsZHJlbjspIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHlwZUlkID0gdHlwZS50eXBlSWRzW2NoaWxkSW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjaGlsZCA9ICh2ZWN0b3IgYXMgVW5pb25WZWN0b3IpLmdldENoaWxkQXQoY2hpbGRJbmRleCkhO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnZpc2l0KGNoaWxkLnNsaWNlKGNoaWxkT2Zmc2V0c1t0eXBlSWRdLCBNYXRoLm1pbihsZW5ndGgsIGNoaWxkTGVuZ3Roc1t0eXBlSWRdKSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHJvdGVjdGVkIHZpc2l0Qm9vbFZlY3Rvcih2ZWN0b3I6IFZlY3RvcjxCb29sPikge1xuICAgICAgICAvLyBCb29sIHZlY3RvciBpcyBhIHNwZWNpYWwgY2FzZSBvZiBGbGF0VmVjdG9yLCBhcyBpdHMgZGF0YSBidWZmZXIgbmVlZHMgdG8gc3RheSBwYWNrZWRcbiAgICAgICAgbGV0IGJpdG1hcDogVWludDhBcnJheTtcbiAgICAgICAgbGV0IHZhbHVlcywgeyBkYXRhLCBsZW5ndGggfSA9IHZlY3RvcjtcbiAgICAgICAgbGV0IGFsaWdubWVudCA9IGxlbmd0aCA8PSA2NCA/IDggOiA2NDtcbiAgICAgICAgaWYgKHZlY3Rvci5udWxsQ291bnQgPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBJZiBhbGwgdmFsdWVzIGFyZSBudWxsLCBqdXN0IGluc2VydCBhIHBsYWNlaG9sZGVyIGVtcHR5IGRhdGEgYnVmZmVyIChmYXN0ZXN0IHBhdGgpXG4gICAgICAgICAgICBiaXRtYXAgPSBuZXcgVWludDhBcnJheSgwKTtcbiAgICAgICAgfSBlbHNlIGlmICghKCh2YWx1ZXMgPSBkYXRhLnZhbHVlcykgaW5zdGFuY2VvZiBVaW50OEFycmF5KSkge1xuICAgICAgICAgICAgLy8gT3RoZXJ3aXNlIGlmIHRoZSB1bmRlcmx5aW5nIGRhdGEgKmlzbid0KiBhIFVpbnQ4QXJyYXksIGVudW1lcmF0ZVxuICAgICAgICAgICAgLy8gdGhlIHZhbHVlcyBhcyBib29scyBhbmQgcmUtcGFjayB0aGVtIGludG8gYSBVaW50OEFycmF5IChzbG93IHBhdGgpXG4gICAgICAgICAgICBiaXRtYXAgPSBwYWNrQm9vbHModmVjdG9yKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSBqdXN0IHNsaWNlIHRoZSBiaXRtYXAgKGZhc3QgcGF0aClcbiAgICAgICAgICAgIGJpdG1hcCA9IHRoaXMuZ2V0VHJ1bmNhdGVkQml0bWFwKGRhdGEub2Zmc2V0LCBsZW5ndGgsIHZhbHVlcyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hZGRCdWZmZXIoYml0bWFwLCBhbGlnbm1lbnQpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHJvdGVjdGVkIHZpc2l0RmxhdFZlY3RvcjxUIGV4dGVuZHMgRmxhdFR5cGU+KHZlY3RvcjogVmVjdG9yPFQ+KSB7XG4gICAgICAgIGNvbnN0IHsgdmlldywgZGF0YSB9ID0gdmVjdG9yO1xuICAgICAgICBjb25zdCB7IG9mZnNldCwgbGVuZ3RoLCB2YWx1ZXMgfSA9IGRhdGE7XG4gICAgICAgIGNvbnN0IHNjYWxlZExlbmd0aCA9IGxlbmd0aCAqICgodmlldyBhcyBhbnkpLnNpemUgfHwgMSk7XG4gICAgICAgIHJldHVybiB0aGlzLmFkZEJ1ZmZlcih2YWx1ZXMuc3ViYXJyYXkob2Zmc2V0LCBzY2FsZWRMZW5ndGgpKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHZpc2l0RmxhdExpc3RWZWN0b3I8VCBleHRlbmRzIEZsYXRMaXN0VHlwZT4odmVjdG9yOiBWZWN0b3I8VD4pIHtcbiAgICAgICAgY29uc3QgeyBkYXRhLCBsZW5ndGggfSA9IHZlY3RvcjtcbiAgICAgICAgY29uc3QgeyBvZmZzZXQsIHZhbHVlcywgdmFsdWVPZmZzZXRzIH0gPSBkYXRhO1xuICAgICAgICBjb25zdCBmaXJzdE9mZnNldCA9IHZhbHVlT2Zmc2V0c1swXTtcbiAgICAgICAgY29uc3QgbGFzdE9mZnNldCA9IHZhbHVlT2Zmc2V0c1tsZW5ndGhdO1xuICAgICAgICBjb25zdCBieXRlTGVuZ3RoID0gTWF0aC5taW4obGFzdE9mZnNldCAtIGZpcnN0T2Zmc2V0LCB2YWx1ZXMuYnl0ZUxlbmd0aCAtIGZpcnN0T2Zmc2V0KTtcbiAgICAgICAgLy8gUHVzaCBpbiB0aGUgb3JkZXIgRmxhdExpc3QgdHlwZXMgcmVhZCB0aGVpciBidWZmZXJzXG4gICAgICAgIC8vIHZhbHVlT2Zmc2V0cyBidWZmZXIgZmlyc3RcbiAgICAgICAgdGhpcy5hZGRCdWZmZXIodGhpcy5nZXRaZXJvQmFzZWRWYWx1ZU9mZnNldHMob2Zmc2V0LCBsZW5ndGgsIHZhbHVlT2Zmc2V0cykpO1xuICAgICAgICAvLyBzbGljZWQgdmFsdWVzIGJ1ZmZlciBzZWNvbmRcbiAgICAgICAgdGhpcy5hZGRCdWZmZXIodmFsdWVzLnN1YmFycmF5KGZpcnN0T2Zmc2V0ICsgb2Zmc2V0LCBmaXJzdE9mZnNldCArIG9mZnNldCArIGJ5dGVMZW5ndGgpKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHByb3RlY3RlZCB2aXNpdExpc3RWZWN0b3I8VCBleHRlbmRzIFNpbmdsZU5lc3RlZFR5cGU+KHZlY3RvcjogVmVjdG9yPFQ+KSB7XG4gICAgICAgIGNvbnN0IHsgZGF0YSwgbGVuZ3RoIH0gPSB2ZWN0b3I7XG4gICAgICAgIGNvbnN0IHsgb2Zmc2V0LCB2YWx1ZU9mZnNldHMgfSA9IDxhbnk+IGRhdGE7XG4gICAgICAgIC8vIElmIHdlIGhhdmUgdmFsdWVPZmZzZXRzIChMaXN0VmVjdG9yKSwgcHVzaCB0aGF0IGJ1ZmZlciBmaXJzdFxuICAgICAgICBpZiAodmFsdWVPZmZzZXRzKSB7XG4gICAgICAgICAgICB0aGlzLmFkZEJ1ZmZlcih0aGlzLmdldFplcm9CYXNlZFZhbHVlT2Zmc2V0cyhvZmZzZXQsIGxlbmd0aCwgdmFsdWVPZmZzZXRzKSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGhlbiBpbnNlcnQgdGhlIExpc3QncyB2YWx1ZXMgY2hpbGRcbiAgICAgICAgcmV0dXJuIHRoaXMudmlzaXQoKHZlY3RvciBhcyBhbnkgYXMgTGlzdFZlY3RvcjxUPikuZ2V0Q2hpbGRBdCgwKSEpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgdmlzaXROZXN0ZWRWZWN0b3I8VCBleHRlbmRzIE5lc3RlZFR5cGU+KHZlY3RvcjogVmVjdG9yPFQ+KSB7XG4gICAgICAgIC8vIFZpc2l0IHRoZSBjaGlsZHJlbiBhY2NvcmRpbmdseVxuICAgICAgICBjb25zdCBudW1DaGlsZHJlbiA9ICh2ZWN0b3IudHlwZS5jaGlsZHJlbiB8fCBbXSkubGVuZ3RoO1xuICAgICAgICBmb3IgKGxldCBjaGlsZDogVmVjdG9yIHwgbnVsbCwgY2hpbGRJbmRleCA9IC0xOyArK2NoaWxkSW5kZXggPCBudW1DaGlsZHJlbjspIHtcbiAgICAgICAgICAgIGlmIChjaGlsZCA9ICh2ZWN0b3IgYXMgTmVzdGVkVmVjdG9yPFQ+KS5nZXRDaGlsZEF0KGNoaWxkSW5kZXgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy52aXNpdChjaGlsZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHByb3RlY3RlZCBhZGRCdWZmZXIodmFsdWVzOiBUeXBlZEFycmF5LCBhbGlnbm1lbnQ6IG51bWJlciA9IDY0KSB7XG4gICAgICAgIGNvbnN0IGxlbmd0aCA9IGFsaWduKHZhbHVlcy5ieXRlTGVuZ3RoLCBhbGlnbm1lbnQpO1xuICAgICAgICB0aGlzLmJ1ZmZlcnMucHVzaCh2YWx1ZXMpO1xuICAgICAgICB0aGlzLmJ1ZmZlcnNNZXRhLnB1c2gobmV3IEJ1ZmZlck1ldGFkYXRhKHRoaXMuYnl0ZUxlbmd0aCwgbGVuZ3RoKSk7XG4gICAgICAgIHRoaXMuYnl0ZUxlbmd0aCArPSBsZW5ndGg7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgZ2V0VHJ1bmNhdGVkQml0bWFwKG9mZnNldDogbnVtYmVyLCBsZW5ndGg6IG51bWJlciwgYml0bWFwOiBVaW50OEFycmF5KSB7XG4gICAgICAgIGNvbnN0IGFsaWduZWRMZW5ndGggPSBhbGlnbihsZW5ndGgsIGxlbmd0aCA8PSA2NCA/IDggOiA2NCk7XG4gICAgICAgIGlmIChvZmZzZXQgPiAwIHx8IGJpdG1hcC5sZW5ndGggPCBhbGlnbmVkTGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBXaXRoIGEgc2xpY2VkIGFycmF5IC8gbm9uLXplcm8gb2Zmc2V0LCB3ZSBoYXZlIHRvIGNvcHkgdGhlIGJpdG1hcFxuICAgICAgICAgICAgY29uc3QgYnl0ZXMgPSBuZXcgVWludDhBcnJheShhbGlnbmVkTGVuZ3RoKTtcbiAgICAgICAgICAgIGJ5dGVzLnNldChcbiAgICAgICAgICAgICAgICAob2Zmc2V0ICUgOCA9PT0gMClcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgc2xpY2Ugb2Zmc2V0IGlzIGFsaWduZWQgdG8gMSBieXRlLCBpdCdzIHNhZmUgdG8gc2xpY2UgdGhlIG51bGxCaXRtYXAgZGlyZWN0bHlcbiAgICAgICAgICAgICAgICA/IGJpdG1hcC5zdWJhcnJheShvZmZzZXQgPj4gMylcbiAgICAgICAgICAgICAgICAvLyBpdGVyYXRlIGVhY2ggYml0IHN0YXJ0aW5nIGZyb20gdGhlIHNsaWNlIG9mZnNldCwgYW5kIHJlcGFjayBpbnRvIGFuIGFsaWduZWQgbnVsbEJpdG1hcFxuICAgICAgICAgICAgICAgIDogcGFja0Jvb2xzKGl0ZXJhdGVCaXRzKGJpdG1hcCwgb2Zmc2V0LCBsZW5ndGgsIG51bGwsIGdldEJvb2wpKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHJldHVybiBieXRlcztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYml0bWFwO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgZ2V0WmVyb0Jhc2VkVmFsdWVPZmZzZXRzKG9mZnNldDogbnVtYmVyLCBsZW5ndGg6IG51bWJlciwgdmFsdWVPZmZzZXRzOiBJbnQzMkFycmF5KSB7XG4gICAgICAgIC8vIElmIHdlIGhhdmUgYSBub24temVybyBvZmZzZXQsIHRoZW4gdGhlIHZhbHVlIG9mZnNldHMgZG8gbm90IHN0YXJ0IGF0XG4gICAgICAgIC8vIHplcm8uIFdlIG11c3QgYSkgY3JlYXRlIGEgbmV3IG9mZnNldHMgYXJyYXkgd2l0aCBzaGlmdGVkIG9mZnNldHMgYW5kXG4gICAgICAgIC8vIGIpIHNsaWNlIHRoZSB2YWx1ZXMgYXJyYXkgYWNjb3JkaW5nbHlcbiAgICAgICAgaWYgKG9mZnNldCA+IDAgfHwgdmFsdWVPZmZzZXRzWzBdICE9PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBzdGFydE9mZnNldCA9IHZhbHVlT2Zmc2V0c1swXTtcbiAgICAgICAgICAgIGNvbnN0IGRlc3RPZmZzZXRzID0gbmV3IEludDMyQXJyYXkobGVuZ3RoICsgMSk7XG4gICAgICAgICAgICBmb3IgKGxldCBpbmRleCA9IC0xOyArK2luZGV4IDwgbGVuZ3RoOykge1xuICAgICAgICAgICAgICAgIGRlc3RPZmZzZXRzW2luZGV4XSA9IHZhbHVlT2Zmc2V0c1tpbmRleF0gLSBzdGFydE9mZnNldDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEZpbmFsIG9mZnNldFxuICAgICAgICAgICAgZGVzdE9mZnNldHNbbGVuZ3RoXSA9IHZhbHVlT2Zmc2V0c1tsZW5ndGhdIC0gc3RhcnRPZmZzZXQ7XG4gICAgICAgICAgICByZXR1cm4gZGVzdE9mZnNldHM7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZhbHVlT2Zmc2V0cztcbiAgICB9XG59XG5cbmltcG9ydCB7IGZsYXRidWZmZXJzIH0gZnJvbSAnZmxhdGJ1ZmZlcnMnO1xuaW1wb3J0IExvbmcgPSBmbGF0YnVmZmVycy5Mb25nO1xuaW1wb3J0IEJ1aWxkZXIgPSBmbGF0YnVmZmVycy5CdWlsZGVyO1xuaW1wb3J0ICogYXMgRmlsZV8gZnJvbSAnLi4vLi4vZmIvRmlsZSc7XG5pbXBvcnQgKiBhcyBTY2hlbWFfIGZyb20gJy4uLy4uL2ZiL1NjaGVtYSc7XG5pbXBvcnQgKiBhcyBNZXNzYWdlXyBmcm9tICcuLi8uLi9mYi9NZXNzYWdlJztcblxuaW1wb3J0IF9CbG9jayA9IEZpbGVfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5CbG9jaztcbmltcG9ydCBfRm9vdGVyID0gRmlsZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZvb3RlcjtcbmltcG9ydCBfRmllbGQgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaWVsZDtcbmltcG9ydCBfU2NoZW1hID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuU2NoZW1hO1xuaW1wb3J0IF9CdWZmZXIgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5CdWZmZXI7XG5pbXBvcnQgX01lc3NhZ2UgPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTWVzc2FnZTtcbmltcG9ydCBfS2V5VmFsdWUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5LZXlWYWx1ZTtcbmltcG9ydCBfRmllbGROb2RlID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpZWxkTm9kZTtcbmltcG9ydCBfUmVjb3JkQmF0Y2ggPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuUmVjb3JkQmF0Y2g7XG5pbXBvcnQgX0RpY3Rpb25hcnlCYXRjaCA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EaWN0aW9uYXJ5QmF0Y2g7XG5pbXBvcnQgX0RpY3Rpb25hcnlFbmNvZGluZyA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRpY3Rpb25hcnlFbmNvZGluZztcbmltcG9ydCBfRW5kaWFubmVzcyA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkVuZGlhbm5lc3M7XG5cbmltcG9ydCBfTnVsbCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk51bGw7XG5pbXBvcnQgX0ludCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkludDtcbmltcG9ydCBfRmxvYXRpbmdQb2ludCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZsb2F0aW5nUG9pbnQ7XG5pbXBvcnQgX0JpbmFyeSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkJpbmFyeTtcbmltcG9ydCBfQm9vbCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkJvb2w7XG5pbXBvcnQgX1V0ZjggPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5VdGY4O1xuaW1wb3J0IF9EZWNpbWFsID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGVjaW1hbDtcbmltcG9ydCBfRGF0ZSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRhdGU7XG5pbXBvcnQgX1RpbWUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UaW1lO1xuaW1wb3J0IF9UaW1lc3RhbXAgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UaW1lc3RhbXA7XG5pbXBvcnQgX0ludGVydmFsID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuSW50ZXJ2YWw7XG5pbXBvcnQgX0xpc3QgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5MaXN0O1xuaW1wb3J0IF9TdHJ1Y3QgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5TdHJ1Y3RfO1xuaW1wb3J0IF9VbmlvbiA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlVuaW9uO1xuaW1wb3J0IF9GaXhlZFNpemVCaW5hcnkgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaXhlZFNpemVCaW5hcnk7XG5pbXBvcnQgX0ZpeGVkU2l6ZUxpc3QgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaXhlZFNpemVMaXN0O1xuaW1wb3J0IF9NYXAgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NYXA7XG5cbmV4cG9ydCBjbGFzcyBUeXBlU2VyaWFsaXplciBleHRlbmRzIFR5cGVWaXNpdG9yIHtcbiAgICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgYnVpbGRlcjogQnVpbGRlcikge1xuICAgICAgICBzdXBlcigpO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXROdWxsKF9ub2RlOiBOdWxsKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfTnVsbC5zdGFydE51bGwoYikgfHxcbiAgICAgICAgICAgIF9OdWxsLmVuZE51bGwoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0SW50KG5vZGU6IEludCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0ludC5zdGFydEludChiKSB8fFxuICAgICAgICAgICAgX0ludC5hZGRCaXRXaWR0aChiLCBub2RlLmJpdFdpZHRoKSB8fFxuICAgICAgICAgICAgX0ludC5hZGRJc1NpZ25lZChiLCBub2RlLmlzU2lnbmVkKSB8fFxuICAgICAgICAgICAgX0ludC5lbmRJbnQoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0RmxvYXQobm9kZTogRmxvYXQpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9GbG9hdGluZ1BvaW50LnN0YXJ0RmxvYXRpbmdQb2ludChiKSB8fFxuICAgICAgICAgICAgX0Zsb2F0aW5nUG9pbnQuYWRkUHJlY2lzaW9uKGIsIG5vZGUucHJlY2lzaW9uKSB8fFxuICAgICAgICAgICAgX0Zsb2F0aW5nUG9pbnQuZW5kRmxvYXRpbmdQb2ludChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRCaW5hcnkoX25vZGU6IEJpbmFyeSkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0JpbmFyeS5zdGFydEJpbmFyeShiKSB8fFxuICAgICAgICAgICAgX0JpbmFyeS5lbmRCaW5hcnkoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0Qm9vbChfbm9kZTogQm9vbCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0Jvb2wuc3RhcnRCb29sKGIpIHx8XG4gICAgICAgICAgICBfQm9vbC5lbmRCb29sKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdFV0ZjgoX25vZGU6IFV0ZjgpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9VdGY4LnN0YXJ0VXRmOChiKSB8fFxuICAgICAgICAgICAgX1V0ZjguZW5kVXRmOChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXREZWNpbWFsKG5vZGU6IERlY2ltYWwpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9EZWNpbWFsLnN0YXJ0RGVjaW1hbChiKSB8fFxuICAgICAgICAgICAgX0RlY2ltYWwuYWRkU2NhbGUoYiwgbm9kZS5zY2FsZSkgfHxcbiAgICAgICAgICAgIF9EZWNpbWFsLmFkZFByZWNpc2lvbihiLCBub2RlLnByZWNpc2lvbikgfHxcbiAgICAgICAgICAgIF9EZWNpbWFsLmVuZERlY2ltYWwoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0RGF0ZShub2RlOiBEYXRlXykge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gX0RhdGUuc3RhcnREYXRlKGIpIHx8IF9EYXRlLmFkZFVuaXQoYiwgbm9kZS51bml0KSB8fCBfRGF0ZS5lbmREYXRlKGIpO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRUaW1lKG5vZGU6IFRpbWUpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9UaW1lLnN0YXJ0VGltZShiKSB8fFxuICAgICAgICAgICAgX1RpbWUuYWRkVW5pdChiLCBub2RlLnVuaXQpIHx8XG4gICAgICAgICAgICBfVGltZS5hZGRCaXRXaWR0aChiLCBub2RlLmJpdFdpZHRoKSB8fFxuICAgICAgICAgICAgX1RpbWUuZW5kVGltZShiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRUaW1lc3RhbXAobm9kZTogVGltZXN0YW1wKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIGNvbnN0IHRpbWV6b25lID0gKG5vZGUudGltZXpvbmUgJiYgYi5jcmVhdGVTdHJpbmcobm9kZS50aW1lem9uZSkpIHx8IHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9UaW1lc3RhbXAuc3RhcnRUaW1lc3RhbXAoYikgfHxcbiAgICAgICAgICAgIF9UaW1lc3RhbXAuYWRkVW5pdChiLCBub2RlLnVuaXQpIHx8XG4gICAgICAgICAgICAodGltZXpvbmUgIT09IHVuZGVmaW5lZCAmJiBfVGltZXN0YW1wLmFkZFRpbWV6b25lKGIsIHRpbWV6b25lKSkgfHxcbiAgICAgICAgICAgIF9UaW1lc3RhbXAuZW5kVGltZXN0YW1wKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdEludGVydmFsKG5vZGU6IEludGVydmFsKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfSW50ZXJ2YWwuc3RhcnRJbnRlcnZhbChiKSB8fCBfSW50ZXJ2YWwuYWRkVW5pdChiLCBub2RlLnVuaXQpIHx8IF9JbnRlcnZhbC5lbmRJbnRlcnZhbChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRMaXN0KF9ub2RlOiBMaXN0KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfTGlzdC5zdGFydExpc3QoYikgfHxcbiAgICAgICAgICAgIF9MaXN0LmVuZExpc3QoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0U3RydWN0KF9ub2RlOiBTdHJ1Y3QpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9TdHJ1Y3Quc3RhcnRTdHJ1Y3RfKGIpIHx8XG4gICAgICAgICAgICBfU3RydWN0LmVuZFN0cnVjdF8oYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0VW5pb24obm9kZTogVW5pb24pIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgY29uc3QgdHlwZUlkcyA9XG4gICAgICAgICAgICBfVW5pb24uc3RhcnRUeXBlSWRzVmVjdG9yKGIsIG5vZGUudHlwZUlkcy5sZW5ndGgpIHx8XG4gICAgICAgICAgICBfVW5pb24uY3JlYXRlVHlwZUlkc1ZlY3RvcihiLCBub2RlLnR5cGVJZHMpO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX1VuaW9uLnN0YXJ0VW5pb24oYikgfHxcbiAgICAgICAgICAgIF9Vbmlvbi5hZGRNb2RlKGIsIG5vZGUubW9kZSkgfHxcbiAgICAgICAgICAgIF9Vbmlvbi5hZGRUeXBlSWRzKGIsIHR5cGVJZHMpIHx8XG4gICAgICAgICAgICBfVW5pb24uZW5kVW5pb24oYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0RGljdGlvbmFyeShub2RlOiBEaWN0aW9uYXJ5KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIGNvbnN0IGluZGV4VHlwZSA9IHRoaXMudmlzaXQobm9kZS5pbmRpY2VzKTtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9EaWN0aW9uYXJ5RW5jb2Rpbmcuc3RhcnREaWN0aW9uYXJ5RW5jb2RpbmcoYikgfHxcbiAgICAgICAgICAgIF9EaWN0aW9uYXJ5RW5jb2RpbmcuYWRkSWQoYiwgbmV3IExvbmcobm9kZS5pZCwgMCkpIHx8XG4gICAgICAgICAgICBfRGljdGlvbmFyeUVuY29kaW5nLmFkZElzT3JkZXJlZChiLCBub2RlLmlzT3JkZXJlZCkgfHxcbiAgICAgICAgICAgIChpbmRleFR5cGUgIT09IHVuZGVmaW5lZCAmJiBfRGljdGlvbmFyeUVuY29kaW5nLmFkZEluZGV4VHlwZShiLCBpbmRleFR5cGUpKSB8fFxuICAgICAgICAgICAgX0RpY3Rpb25hcnlFbmNvZGluZy5lbmREaWN0aW9uYXJ5RW5jb2RpbmcoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0Rml4ZWRTaXplQmluYXJ5KG5vZGU6IEZpeGVkU2l6ZUJpbmFyeSkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0ZpeGVkU2l6ZUJpbmFyeS5zdGFydEZpeGVkU2l6ZUJpbmFyeShiKSB8fFxuICAgICAgICAgICAgX0ZpeGVkU2l6ZUJpbmFyeS5hZGRCeXRlV2lkdGgoYiwgbm9kZS5ieXRlV2lkdGgpIHx8XG4gICAgICAgICAgICBfRml4ZWRTaXplQmluYXJ5LmVuZEZpeGVkU2l6ZUJpbmFyeShiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRGaXhlZFNpemVMaXN0KG5vZGU6IEZpeGVkU2l6ZUxpc3QpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9GaXhlZFNpemVMaXN0LnN0YXJ0Rml4ZWRTaXplTGlzdChiKSB8fFxuICAgICAgICAgICAgX0ZpeGVkU2l6ZUxpc3QuYWRkTGlzdFNpemUoYiwgbm9kZS5saXN0U2l6ZSkgfHxcbiAgICAgICAgICAgIF9GaXhlZFNpemVMaXN0LmVuZEZpeGVkU2l6ZUxpc3QoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0TWFwKG5vZGU6IE1hcF8pIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9NYXAuc3RhcnRNYXAoYikgfHxcbiAgICAgICAgICAgIF9NYXAuYWRkS2V5c1NvcnRlZChiLCBub2RlLmtleXNTb3J0ZWQpIHx8XG4gICAgICAgICAgICBfTWFwLmVuZE1hcChiKVxuICAgICAgICApO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gY29uY2F0QnVmZmVyc1dpdGhNZXRhZGF0YSh0b3RhbEJ5dGVMZW5ndGg6IG51bWJlciwgYnVmZmVyczogVWludDhBcnJheVtdLCBidWZmZXJzTWV0YTogQnVmZmVyTWV0YWRhdGFbXSkge1xuICAgIGNvbnN0IGRhdGEgPSBuZXcgVWludDhBcnJheSh0b3RhbEJ5dGVMZW5ndGgpO1xuICAgIGZvciAobGV0IGkgPSAtMSwgbiA9IGJ1ZmZlcnMubGVuZ3RoOyArK2kgPCBuOykge1xuICAgICAgICBjb25zdCB7IG9mZnNldCwgbGVuZ3RoIH0gPSBidWZmZXJzTWV0YVtpXTtcbiAgICAgICAgY29uc3QgeyBidWZmZXIsIGJ5dGVPZmZzZXQsIGJ5dGVMZW5ndGggfSA9IGJ1ZmZlcnNbaV07XG4gICAgICAgIGNvbnN0IHJlYWxCdWZmZXJMZW5ndGggPSBNYXRoLm1pbihsZW5ndGgsIGJ5dGVMZW5ndGgpO1xuICAgICAgICBpZiAocmVhbEJ1ZmZlckxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGRhdGEuc2V0KG5ldyBVaW50OEFycmF5KGJ1ZmZlciwgYnl0ZU9mZnNldCwgcmVhbEJ1ZmZlckxlbmd0aCksIG9mZnNldCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRhdGE7XG59XG5cbmZ1bmN0aW9uIHdyaXRlRm9vdGVyKGI6IEJ1aWxkZXIsIG5vZGU6IEZvb3Rlcikge1xuICAgIGxldCBzY2hlbWFPZmZzZXQgPSB3cml0ZVNjaGVtYShiLCBub2RlLnNjaGVtYSk7XG4gICAgbGV0IHJlY29yZEJhdGNoZXMgPSAobm9kZS5yZWNvcmRCYXRjaGVzIHx8IFtdKTtcbiAgICBsZXQgZGljdGlvbmFyeUJhdGNoZXMgPSAobm9kZS5kaWN0aW9uYXJ5QmF0Y2hlcyB8fCBbXSk7XG4gICAgbGV0IHJlY29yZEJhdGNoZXNPZmZzZXQgPVxuICAgICAgICBfRm9vdGVyLnN0YXJ0UmVjb3JkQmF0Y2hlc1ZlY3RvcihiLCByZWNvcmRCYXRjaGVzLmxlbmd0aCkgfHxcbiAgICAgICAgICAgIG1hcFJldmVyc2UocmVjb3JkQmF0Y2hlcywgKHJiKSA9PiB3cml0ZUJsb2NrKGIsIHJiKSkgJiZcbiAgICAgICAgYi5lbmRWZWN0b3IoKTtcblxuICAgIGxldCBkaWN0aW9uYXJ5QmF0Y2hlc09mZnNldCA9XG4gICAgICAgIF9Gb290ZXIuc3RhcnREaWN0aW9uYXJpZXNWZWN0b3IoYiwgZGljdGlvbmFyeUJhdGNoZXMubGVuZ3RoKSB8fFxuICAgICAgICAgICAgbWFwUmV2ZXJzZShkaWN0aW9uYXJ5QmF0Y2hlcywgKGRiKSA9PiB3cml0ZUJsb2NrKGIsIGRiKSkgJiZcbiAgICAgICAgYi5lbmRWZWN0b3IoKTtcblxuICAgIHJldHVybiAoXG4gICAgICAgIF9Gb290ZXIuc3RhcnRGb290ZXIoYikgfHxcbiAgICAgICAgX0Zvb3Rlci5hZGRTY2hlbWEoYiwgc2NoZW1hT2Zmc2V0KSB8fFxuICAgICAgICBfRm9vdGVyLmFkZFZlcnNpb24oYiwgbm9kZS5zY2hlbWEudmVyc2lvbikgfHxcbiAgICAgICAgX0Zvb3Rlci5hZGRSZWNvcmRCYXRjaGVzKGIsIHJlY29yZEJhdGNoZXNPZmZzZXQpIHx8XG4gICAgICAgIF9Gb290ZXIuYWRkRGljdGlvbmFyaWVzKGIsIGRpY3Rpb25hcnlCYXRjaGVzT2Zmc2V0KSB8fFxuICAgICAgICBfRm9vdGVyLmVuZEZvb3RlcihiKVxuICAgICk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlQmxvY2soYjogQnVpbGRlciwgbm9kZTogRmlsZUJsb2NrKSB7XG4gICAgcmV0dXJuIF9CbG9jay5jcmVhdGVCbG9jayhiLFxuICAgICAgICBuZXcgTG9uZyhub2RlLm9mZnNldCwgMCksXG4gICAgICAgIG5vZGUubWV0YURhdGFMZW5ndGgsXG4gICAgICAgIG5ldyBMb25nKG5vZGUuYm9keUxlbmd0aCwgMClcbiAgICApO1xufVxuXG5mdW5jdGlvbiB3cml0ZU1lc3NhZ2UoYjogQnVpbGRlciwgbm9kZTogTWVzc2FnZSkge1xuICAgIGxldCBtZXNzYWdlSGVhZGVyT2Zmc2V0ID0gMDtcbiAgICBpZiAoTWVzc2FnZS5pc1NjaGVtYShub2RlKSkge1xuICAgICAgICBtZXNzYWdlSGVhZGVyT2Zmc2V0ID0gd3JpdGVTY2hlbWEoYiwgbm9kZSBhcyBTY2hlbWEpO1xuICAgIH0gZWxzZSBpZiAoTWVzc2FnZS5pc1JlY29yZEJhdGNoKG5vZGUpKSB7XG4gICAgICAgIG1lc3NhZ2VIZWFkZXJPZmZzZXQgPSB3cml0ZVJlY29yZEJhdGNoKGIsIG5vZGUgYXMgUmVjb3JkQmF0Y2hNZXRhZGF0YSk7XG4gICAgfSBlbHNlIGlmIChNZXNzYWdlLmlzRGljdGlvbmFyeUJhdGNoKG5vZGUpKSB7XG4gICAgICAgIG1lc3NhZ2VIZWFkZXJPZmZzZXQgPSB3cml0ZURpY3Rpb25hcnlCYXRjaChiLCBub2RlIGFzIERpY3Rpb25hcnlCYXRjaCk7XG4gICAgfVxuICAgIHJldHVybiAoXG4gICAgICAgIF9NZXNzYWdlLnN0YXJ0TWVzc2FnZShiKSB8fFxuICAgICAgICBfTWVzc2FnZS5hZGRWZXJzaW9uKGIsIG5vZGUudmVyc2lvbikgfHxcbiAgICAgICAgX01lc3NhZ2UuYWRkSGVhZGVyKGIsIG1lc3NhZ2VIZWFkZXJPZmZzZXQpIHx8XG4gICAgICAgIF9NZXNzYWdlLmFkZEhlYWRlclR5cGUoYiwgbm9kZS5oZWFkZXJUeXBlKSB8fFxuICAgICAgICBfTWVzc2FnZS5hZGRCb2R5TGVuZ3RoKGIsIG5ldyBMb25nKG5vZGUuYm9keUxlbmd0aCwgMCkpIHx8XG4gICAgICAgIF9NZXNzYWdlLmVuZE1lc3NhZ2UoYilcbiAgICApO1xufVxuXG5mdW5jdGlvbiB3cml0ZVNjaGVtYShiOiBCdWlsZGVyLCBub2RlOiBTY2hlbWEpIHtcbiAgICBjb25zdCBmaWVsZE9mZnNldHMgPSBub2RlLmZpZWxkcy5tYXAoKGYpID0+IHdyaXRlRmllbGQoYiwgZikpO1xuICAgIGNvbnN0IGZpZWxkc09mZnNldCA9XG4gICAgICAgIF9TY2hlbWEuc3RhcnRGaWVsZHNWZWN0b3IoYiwgZmllbGRPZmZzZXRzLmxlbmd0aCkgfHxcbiAgICAgICAgX1NjaGVtYS5jcmVhdGVGaWVsZHNWZWN0b3IoYiwgZmllbGRPZmZzZXRzKTtcbiAgICByZXR1cm4gKFxuICAgICAgICBfU2NoZW1hLnN0YXJ0U2NoZW1hKGIpIHx8XG4gICAgICAgIF9TY2hlbWEuYWRkRmllbGRzKGIsIGZpZWxkc09mZnNldCkgfHxcbiAgICAgICAgX1NjaGVtYS5hZGRFbmRpYW5uZXNzKGIsIHBsYXRmb3JtSXNMaXR0bGVFbmRpYW4gPyBfRW5kaWFubmVzcy5MaXR0bGUgOiBfRW5kaWFubmVzcy5CaWcpIHx8XG4gICAgICAgIF9TY2hlbWEuZW5kU2NoZW1hKGIpXG4gICAgKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVSZWNvcmRCYXRjaChiOiBCdWlsZGVyLCBub2RlOiBSZWNvcmRCYXRjaE1ldGFkYXRhKSB7XG4gICAgbGV0IG5vZGVzID0gKG5vZGUubm9kZXMgfHwgW10pO1xuICAgIGxldCBidWZmZXJzID0gKG5vZGUuYnVmZmVycyB8fCBbXSk7XG4gICAgbGV0IG5vZGVzT2Zmc2V0ID1cbiAgICAgICAgX1JlY29yZEJhdGNoLnN0YXJ0Tm9kZXNWZWN0b3IoYiwgbm9kZXMubGVuZ3RoKSB8fFxuICAgICAgICBtYXBSZXZlcnNlKG5vZGVzLCAobikgPT4gd3JpdGVGaWVsZE5vZGUoYiwgbikpICYmXG4gICAgICAgIGIuZW5kVmVjdG9yKCk7XG5cbiAgICBsZXQgYnVmZmVyc09mZnNldCA9XG4gICAgICAgIF9SZWNvcmRCYXRjaC5zdGFydEJ1ZmZlcnNWZWN0b3IoYiwgYnVmZmVycy5sZW5ndGgpIHx8XG4gICAgICAgIG1hcFJldmVyc2UoYnVmZmVycywgKGJfKSA9PiB3cml0ZUJ1ZmZlcihiLCBiXykpICYmXG4gICAgICAgIGIuZW5kVmVjdG9yKCk7XG5cbiAgICByZXR1cm4gKFxuICAgICAgICBfUmVjb3JkQmF0Y2guc3RhcnRSZWNvcmRCYXRjaChiKSB8fFxuICAgICAgICBfUmVjb3JkQmF0Y2guYWRkTGVuZ3RoKGIsIG5ldyBMb25nKG5vZGUubGVuZ3RoLCAwKSkgfHxcbiAgICAgICAgX1JlY29yZEJhdGNoLmFkZE5vZGVzKGIsIG5vZGVzT2Zmc2V0KSB8fFxuICAgICAgICBfUmVjb3JkQmF0Y2guYWRkQnVmZmVycyhiLCBidWZmZXJzT2Zmc2V0KSB8fFxuICAgICAgICBfUmVjb3JkQmF0Y2guZW5kUmVjb3JkQmF0Y2goYilcbiAgICApO1xufVxuXG5mdW5jdGlvbiB3cml0ZURpY3Rpb25hcnlCYXRjaChiOiBCdWlsZGVyLCBub2RlOiBEaWN0aW9uYXJ5QmF0Y2gpIHtcbiAgICBjb25zdCBkYXRhT2Zmc2V0ID0gd3JpdGVSZWNvcmRCYXRjaChiLCBub2RlLmRhdGEpO1xuICAgIHJldHVybiAoXG4gICAgICAgIF9EaWN0aW9uYXJ5QmF0Y2guc3RhcnREaWN0aW9uYXJ5QmF0Y2goYikgfHxcbiAgICAgICAgX0RpY3Rpb25hcnlCYXRjaC5hZGRJZChiLCBuZXcgTG9uZyhub2RlLmlkLCAwKSkgfHxcbiAgICAgICAgX0RpY3Rpb25hcnlCYXRjaC5hZGRJc0RlbHRhKGIsIG5vZGUuaXNEZWx0YSkgfHxcbiAgICAgICAgX0RpY3Rpb25hcnlCYXRjaC5hZGREYXRhKGIsIGRhdGFPZmZzZXQpIHx8XG4gICAgICAgIF9EaWN0aW9uYXJ5QmF0Y2guZW5kRGljdGlvbmFyeUJhdGNoKGIpXG4gICAgKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVCdWZmZXIoYjogQnVpbGRlciwgbm9kZTogQnVmZmVyTWV0YWRhdGEpIHtcbiAgICByZXR1cm4gX0J1ZmZlci5jcmVhdGVCdWZmZXIoYiwgbmV3IExvbmcobm9kZS5vZmZzZXQsIDApLCBuZXcgTG9uZyhub2RlLmxlbmd0aCwgMCkpO1xufVxuXG5mdW5jdGlvbiB3cml0ZUZpZWxkTm9kZShiOiBCdWlsZGVyLCBub2RlOiBGaWVsZE1ldGFkYXRhKSB7XG4gICAgcmV0dXJuIF9GaWVsZE5vZGUuY3JlYXRlRmllbGROb2RlKGIsIG5ldyBMb25nKG5vZGUubGVuZ3RoLCAwKSwgbmV3IExvbmcobm9kZS5udWxsQ291bnQsIDApKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVGaWVsZChiOiBCdWlsZGVyLCBub2RlOiBGaWVsZCkge1xuICAgIGxldCB0eXBlT2Zmc2V0ID0gLTE7XG4gICAgbGV0IHR5cGUgPSBub2RlLnR5cGU7XG4gICAgbGV0IHR5cGVJZCA9IG5vZGUudHlwZUlkO1xuICAgIGxldCBuYW1lOiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgbGV0IG1ldGFkYXRhOiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgbGV0IGRpY3Rpb25hcnk6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICAgIGlmICghRGF0YVR5cGUuaXNEaWN0aW9uYXJ5KHR5cGUpKSB7XG4gICAgICAgIHR5cGVPZmZzZXQgPSBuZXcgVHlwZVNlcmlhbGl6ZXIoYikudmlzaXQodHlwZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdHlwZUlkID0gdHlwZS5kaWN0aW9uYXJ5LlRUeXBlO1xuICAgICAgICBkaWN0aW9uYXJ5ID0gbmV3IFR5cGVTZXJpYWxpemVyKGIpLnZpc2l0KHR5cGUpO1xuICAgICAgICB0eXBlT2Zmc2V0ID0gbmV3IFR5cGVTZXJpYWxpemVyKGIpLnZpc2l0KHR5cGUuZGljdGlvbmFyeSk7XG4gICAgfVxuXG4gICAgbGV0IGNoaWxkcmVuID0gX0ZpZWxkLmNyZWF0ZUNoaWxkcmVuVmVjdG9yKGIsICh0eXBlLmNoaWxkcmVuIHx8IFtdKS5tYXAoKGYpID0+IHdyaXRlRmllbGQoYiwgZikpKTtcbiAgICBpZiAobm9kZS5tZXRhZGF0YSAmJiBub2RlLm1ldGFkYXRhLnNpemUgPiAwKSB7XG4gICAgICAgIG1ldGFkYXRhID0gX0ZpZWxkLmNyZWF0ZUN1c3RvbU1ldGFkYXRhVmVjdG9yKFxuICAgICAgICAgICAgYixcbiAgICAgICAgICAgIFsuLi5ub2RlLm1ldGFkYXRhXS5tYXAoKFtrLCB2XSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGIuY3JlYXRlU3RyaW5nKGspO1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IGIuY3JlYXRlU3RyaW5nKHYpO1xuICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICAgIF9LZXlWYWx1ZS5zdGFydEtleVZhbHVlKGIpIHx8XG4gICAgICAgICAgICAgICAgICAgIF9LZXlWYWx1ZS5hZGRLZXkoYiwga2V5KSB8fFxuICAgICAgICAgICAgICAgICAgICBfS2V5VmFsdWUuYWRkVmFsdWUoYiwgdmFsKSB8fFxuICAgICAgICAgICAgICAgICAgICBfS2V5VmFsdWUuZW5kS2V5VmFsdWUoYilcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG4gICAgaWYgKG5vZGUubmFtZSkge1xuICAgICAgICBuYW1lID0gYi5jcmVhdGVTdHJpbmcobm9kZS5uYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIChcbiAgICAgICAgX0ZpZWxkLnN0YXJ0RmllbGQoYikgfHxcbiAgICAgICAgX0ZpZWxkLmFkZFR5cGUoYiwgdHlwZU9mZnNldCkgfHxcbiAgICAgICAgX0ZpZWxkLmFkZFR5cGVUeXBlKGIsIHR5cGVJZCkgfHxcbiAgICAgICAgX0ZpZWxkLmFkZENoaWxkcmVuKGIsIGNoaWxkcmVuKSB8fFxuICAgICAgICBfRmllbGQuYWRkTnVsbGFibGUoYiwgISFub2RlLm51bGxhYmxlKSB8fFxuICAgICAgICAobmFtZSAhPT0gdW5kZWZpbmVkICYmIF9GaWVsZC5hZGROYW1lKGIsIG5hbWUpKSB8fFxuICAgICAgICAoZGljdGlvbmFyeSAhPT0gdW5kZWZpbmVkICYmIF9GaWVsZC5hZGREaWN0aW9uYXJ5KGIsIGRpY3Rpb25hcnkpKSB8fFxuICAgICAgICAobWV0YWRhdGEgIT09IHVuZGVmaW5lZCAmJiBfRmllbGQuYWRkQ3VzdG9tTWV0YWRhdGEoYiwgbWV0YWRhdGEpKSB8fFxuICAgICAgICBfRmllbGQuZW5kRmllbGQoYilcbiAgICApO1xufVxuXG5mdW5jdGlvbiBtYXBSZXZlcnNlPFQsIFU+KHNvdXJjZTogVFtdLCBjYWxsYmFja2ZuOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IFUpOiBVW10ge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBBcnJheShzb3VyY2UubGVuZ3RoKTtcbiAgICBmb3IgKGxldCBpID0gLTEsIGogPSBzb3VyY2UubGVuZ3RoOyAtLWogPiAtMTspIHtcbiAgICAgICAgcmVzdWx0W2ldID0gY2FsbGJhY2tmbihzb3VyY2Vbal0sIGksIHNvdXJjZSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbmNvbnN0IHBsYXRmb3JtSXNMaXR0bGVFbmRpYW4gPSAoZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKDIpO1xuICAgIG5ldyBEYXRhVmlldyhidWZmZXIpLnNldEludDE2KDAsIDI1NiwgdHJ1ZSAvKiBsaXR0bGVFbmRpYW4gKi8pO1xuICAgIC8vIEludDE2QXJyYXkgdXNlcyB0aGUgcGxhdGZvcm0ncyBlbmRpYW5uZXNzLlxuICAgIHJldHVybiBuZXcgSW50MTZBcnJheShidWZmZXIpWzBdID09PSAyNTY7XG59KSgpO1xuIl19

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
import { RecordBatch } from '../../recordbatch';
import { VectorVisitor, TypeVisitor } from '../../visitor';
import { MAGIC, magicLength, magicAndPadding, PADDING } from '../magic';
import { align, getBool, packBools, iterateBits } from '../../util/bit';
import { BufferMetadata, FieldMetadata, Footer, FileBlock, Message, RecordBatchMetadata, DictionaryBatch } from '../metadata';
import { MetadataVersion, DataType, UnionMode, } from '../../type';
export function* serializeStream(table) {
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
export function* serializeFile(table) {
    const recordBatches = [];
    const dictionaryBatches = [];
    // First yield the magic string (aligned)
    let buffer = new Uint8Array(align(magicLength, 8));
    let metadataLength, byteLength = buffer.byteLength;
    buffer.set(MAGIC, 0);
    yield buffer;
    // Then yield the schema
    ({ metadataLength, buffer } = serializeMessage(table.schema));
    byteLength += buffer.byteLength;
    yield buffer;
    for (const [id, field] of table.schema.dictionaries) {
        const vec = table.getColumn(field.name);
        if (vec && vec.dictionary) {
            ({ metadataLength, buffer } = serializeDictionaryBatch(vec.dictionary, id));
            dictionaryBatches.push(new FileBlock(metadataLength, buffer.byteLength, byteLength));
            byteLength += buffer.byteLength;
            yield buffer;
        }
    }
    for (const recordBatch of table.batches) {
        ({ metadataLength, buffer } = serializeRecordBatch(recordBatch));
        recordBatches.push(new FileBlock(metadataLength, buffer.byteLength, byteLength));
        byteLength += buffer.byteLength;
        yield buffer;
    }
    // Then yield the footer metadata (not aligned)
    ({ metadataLength, buffer } = serializeFooter(new Footer(dictionaryBatches, recordBatches, table.schema)));
    yield buffer;
    // Last, yield the footer length + terminating magic arrow string (aligned)
    buffer = new Uint8Array(magicAndPadding);
    new DataView(buffer.buffer).setInt32(0, metadataLength, platformIsLittleEndian);
    buffer.set(MAGIC, buffer.byteLength - magicLength);
    yield buffer;
}
export function serializeRecordBatch(recordBatch) {
    const { byteLength, fieldNodes, buffers, buffersMeta } = new RecordBatchSerializer().visitRecordBatch(recordBatch);
    const rbMeta = new RecordBatchMetadata(MetadataVersion.V4, recordBatch.length, fieldNodes, buffersMeta);
    const rbData = concatBuffersWithMetadata(byteLength, buffers, buffersMeta);
    return serializeMessage(rbMeta, rbData);
}
export function serializeDictionaryBatch(dictionary, id, isDelta = false) {
    const { byteLength, fieldNodes, buffers, buffersMeta } = new RecordBatchSerializer().visitRecordBatch(RecordBatch.from([dictionary]));
    const rbMeta = new RecordBatchMetadata(MetadataVersion.V4, dictionary.length, fieldNodes, buffersMeta);
    const dbMeta = new DictionaryBatch(MetadataVersion.V4, rbMeta, id, isDelta);
    const rbData = concatBuffersWithMetadata(byteLength, buffers, buffersMeta);
    return serializeMessage(dbMeta, rbData);
}
export function serializeMessage(message, data) {
    const b = new Builder();
    _Message.finishMessageBuffer(b, writeMessage(b, message));
    // Slice out the buffer that contains the message metadata
    const metadataBytes = b.asUint8Array();
    // Reserve 4 bytes for writing the message size at the front.
    // Metadata length includes the metadata byteLength + the 4
    // bytes for the length, and rounded up to the nearest 8 bytes.
    const metadataLength = align(PADDING + metadataBytes.byteLength, 8);
    // + the length of the optional data buffer at the end, padded
    const dataByteLength = data ? data.byteLength : 0;
    // ensure the entire message is aligned to an 8-byte boundary
    const messageBytes = new Uint8Array(align(metadataLength + dataByteLength, 8));
    // Write the metadata length into the first 4 bytes, but subtract the
    // bytes we use to hold the length itself.
    new DataView(messageBytes.buffer).setInt32(0, metadataLength - PADDING, platformIsLittleEndian);
    // Copy the metadata bytes into the message buffer
    messageBytes.set(metadataBytes, PADDING);
    // Copy the optional data buffer after the metadata bytes
    (data && dataByteLength > 0) && messageBytes.set(data, metadataLength);
    // if (messageBytes.byteLength % 8 !== 0) { debugger; }
    // Return the metadata length because we need to write it into each FileBlock also
    return { metadataLength, buffer: messageBytes };
}
export function serializeFooter(footer) {
    const b = new Builder();
    _Footer.finishFooterBuffer(b, writeFooter(b, footer));
    // Slice out the buffer that contains the footer metadata
    const footerBytes = b.asUint8Array();
    const metadataLength = footerBytes.byteLength;
    return { metadataLength, buffer: footerBytes };
}
class RecordBatchSerializer extends VectorVisitor {
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
        if (!DataType.isDictionary(vector.type)) {
            const { data, length, nullCount } = vector;
            if (length > 2147483647) {
                throw new RangeError('Cannot write arrays larger than 2^31 - 1 in length');
            }
            this.fieldNodes.push(new FieldMetadata(length, nullCount));
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
        if (type.mode === UnionMode.Sparse) {
            return this.visitNestedVector(vector);
        }
        else if (type.mode === UnionMode.Dense) {
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
            bitmap = packBools(vector);
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
        const length = align(values.byteLength, alignment);
        this.buffers.push(values);
        this.buffersMeta.push(new BufferMetadata(this.byteLength, length));
        this.byteLength += length;
        return this;
    }
    getTruncatedBitmap(offset, length, bitmap) {
        const alignedLength = align(length, length <= 64 ? 8 : 64);
        if (offset > 0 || bitmap.length < alignedLength) {
            // With a sliced array / non-zero offset, we have to copy the bitmap
            const bytes = new Uint8Array(alignedLength);
            bytes.set((offset % 8 === 0)
                // If the slice offset is aligned to 1 byte, it's safe to slice the nullBitmap directly
                ? bitmap.subarray(offset >> 3)
                // iterate each bit starting from the slice offset, and repack into an aligned nullBitmap
                : packBools(iterateBits(bitmap, offset, length, null, getBool)));
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
import { flatbuffers } from 'flatbuffers';
var Long = flatbuffers.Long;
var Builder = flatbuffers.Builder;
import * as File_ from '../../fb/File';
import * as Schema_ from '../../fb/Schema';
import * as Message_ from '../../fb/Message';
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
export class TypeSerializer extends TypeVisitor {
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
    if (Message.isSchema(node)) {
        messageHeaderOffset = writeSchema(b, node);
    }
    else if (Message.isRecordBatch(node)) {
        messageHeaderOffset = writeRecordBatch(b, node);
    }
    else if (Message.isDictionaryBatch(node)) {
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
    if (!DataType.isDictionary(type)) {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7QUFDckQsSUFBTyxLQUFLLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7QUFDckQsSUFBTyxRQUFRLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7QUFDM0QsSUFBTyxLQUFLLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7QUFDckQsSUFBTyxLQUFLLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7QUFDckQsSUFBTyxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7QUFDL0QsSUFBTyxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUM7QUFDN0QsSUFBTyxLQUFLLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7QUFDckQsSUFBTyxPQUFPLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7QUFDMUQsSUFBTyxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7QUFDdkQsSUFBTyxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQztBQUMzRSxJQUFPLGNBQWMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQztBQUN2RSxJQUFPLElBQUksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQztBQUVuRCxNQUFNLHFCQUFzQixTQUFRLFdBQVc7SUFDM0MsWUFBc0IsT0FBZ0I7UUFDbEMsS0FBSyxFQUFFLENBQUM7UUFEVSxZQUFPLEdBQVAsT0FBTyxDQUFTO0lBRXRDLENBQUM7SUFDTSxTQUFTLENBQUMsS0FBVztRQUN4QixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxDQUNILEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ2xCLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQ25CLENBQUM7SUFDTixDQUFDO0lBQ00sUUFBUSxDQUFDLElBQVM7UUFDckIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUN2QixNQUFNLENBQUMsQ0FDSCxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUNoQixJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQ2xDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDbEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FDakIsQ0FBQztJQUNOLENBQUM7SUFDTSxVQUFVLENBQUMsSUFBVztRQUN6QixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxDQUNILGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7WUFDcEMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUM5QyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQ3JDLENBQUM7SUFDTixDQUFDO0lBQ00sV0FBVyxDQUFDLEtBQWE7UUFDNUIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUN2QixNQUFNLENBQUMsQ0FDSCxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUN0QixPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUN2QixDQUFDO0lBQ04sQ0FBQztJQUNNLFNBQVMsQ0FBQyxLQUFXO1FBQ3hCLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDdkIsTUFBTSxDQUFDLENBQ0gsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDbEIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FDbkIsQ0FBQztJQUNOLENBQUM7SUFDTSxTQUFTLENBQUMsS0FBVztRQUN4QixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxDQUNILEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ2xCLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQ25CLENBQUM7SUFDTixDQUFDO0lBQ00sWUFBWSxDQUFDLElBQWE7UUFDN0IsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUN2QixNQUFNLENBQUMsQ0FDSCxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUN4QixRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQ2hDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDeEMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FDekIsQ0FBQztJQUNOLENBQUM7SUFDTSxTQUFTLENBQUMsSUFBVztRQUN4QixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pGLENBQUM7SUFDTSxTQUFTLENBQUMsSUFBVTtRQUN2QixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxDQUNILEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ2xCLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDM0IsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUNuQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUNuQixDQUFDO0lBQ04sQ0FBQztJQUNNLGNBQWMsQ0FBQyxJQUFlO1FBQ2pDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDdkIsTUFBTSxRQUFRLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksU0FBUyxDQUFDO1FBQy9FLE1BQU0sQ0FBQyxDQUNILFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1lBQzVCLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDaEMsQ0FBQyxRQUFRLEtBQUssU0FBUyxJQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQy9ELFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQzdCLENBQUM7SUFDTixDQUFDO0lBQ00sYUFBYSxDQUFDLElBQWM7UUFDL0IsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUN2QixNQUFNLENBQUMsQ0FDSCxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUM1RixDQUFDO0lBQ04sQ0FBQztJQUNNLFNBQVMsQ0FBQyxLQUFXO1FBQ3hCLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDdkIsTUFBTSxDQUFDLENBQ0gsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDbEIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FDbkIsQ0FBQztJQUNOLENBQUM7SUFDTSxXQUFXLENBQUMsS0FBYTtRQUM1QixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxDQUNILE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1lBQ3ZCLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQ3hCLENBQUM7SUFDTixDQUFDO0lBQ00sVUFBVSxDQUFDLElBQVc7UUFDekIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUN2QixNQUFNLE9BQU8sR0FDVCxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO1lBQ2pELE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxDQUNILE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQ3BCLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDNUIsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDO1lBQzdCLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQ3JCLENBQUM7SUFDTixDQUFDO0lBQ00sZUFBZSxDQUFDLElBQWdCO1FBQ25DLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDdkIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLENBQ0gsbUJBQW1CLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDO1lBQzlDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNsRCxtQkFBbUIsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDbkQsQ0FBQyxTQUFTLEtBQUssU0FBUyxJQUFJLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDM0UsbUJBQW1CLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQy9DLENBQUM7SUFDTixDQUFDO0lBQ00sb0JBQW9CLENBQUMsSUFBcUI7UUFDN0MsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUN2QixNQUFNLENBQUMsQ0FDSCxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7WUFDeEMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQ2hELGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUN6QyxDQUFDO0lBQ04sQ0FBQztJQUNNLGtCQUFrQixDQUFDLElBQW1CO1FBQ3pDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDdkIsTUFBTSxDQUFDLENBQ0gsY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztZQUNwQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQzVDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FDckMsQ0FBQztJQUNOLENBQUM7SUFDTSxRQUFRLENBQUMsSUFBVTtRQUN0QixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxDQUNILElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ2hCLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDdEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FDakIsQ0FBQztJQUNOLENBQUM7Q0FDSjtBQUVELG1DQUFtQyxlQUF1QixFQUFFLE9BQXFCLEVBQUUsV0FBNkI7SUFDNUcsTUFBTSxJQUFJLEdBQUcsSUFBSSxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDN0MsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7UUFDNUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDdEQsRUFBRSxDQUFDLENBQUMsZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN2QixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksVUFBVSxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMzRSxDQUFDO0lBQ0wsQ0FBQztJQUNELE1BQU0sQ0FBQyxJQUFJLENBQUM7QUFDaEIsQ0FBQztBQUVELHFCQUFxQixDQUFVLEVBQUUsSUFBWTtJQUN6QyxJQUFJLFlBQVksR0FBRyxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUMvQyxJQUFJLGFBQWEsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLElBQUksRUFBRSxDQUFDLENBQUM7SUFDL0MsSUFBSSxpQkFBaUIsR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUN2RCxJQUFJLG1CQUFtQixHQUNuQixPQUFPLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxNQUFNLENBQUM7UUFDckQsVUFBVSxDQUFDLGFBQWEsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUN4RCxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7SUFFbEIsSUFBSSx1QkFBdUIsR0FDdkIsT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxNQUFNLENBQUM7UUFDeEQsVUFBVSxDQUFDLGlCQUFpQixFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzVELENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUVsQixNQUFNLENBQUMsQ0FDSCxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUN0QixPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUM7UUFDbEMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7UUFDMUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxtQkFBbUIsQ0FBQztRQUNoRCxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSx1QkFBdUIsQ0FBQztRQUNuRCxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUN2QixDQUFDO0FBQ04sQ0FBQztBQUVELG9CQUFvQixDQUFVLEVBQUUsSUFBZTtJQUMzQyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQ3ZCLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQ3hCLElBQUksQ0FBQyxjQUFjLEVBQ25CLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQy9CLENBQUM7QUFDTixDQUFDO0FBRUQsc0JBQXNCLENBQVUsRUFBRSxJQUFhO0lBQzNDLElBQUksbUJBQW1CLEdBQUcsQ0FBQyxDQUFDO0lBQzVCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pCLG1CQUFtQixHQUFHLFdBQVcsQ0FBQyxDQUFDLEVBQUUsSUFBYyxDQUFDLENBQUM7SUFDekQsQ0FBQztJQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyQyxtQkFBbUIsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsSUFBMkIsQ0FBQyxDQUFDO0lBQzNFLENBQUM7SUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6QyxtQkFBbUIsR0FBRyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsSUFBdUIsQ0FBQyxDQUFDO0lBQzNFLENBQUM7SUFDRCxNQUFNLENBQUMsQ0FDSCxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUN4QixRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ3BDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLG1CQUFtQixDQUFDO1FBQzFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUM7UUFDMUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN2RCxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUN6QixDQUFDO0FBQ04sQ0FBQztBQUVELHFCQUFxQixDQUFVLEVBQUUsSUFBWTtJQUN6QyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzlELE1BQU0sWUFBWSxHQUNkLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLE1BQU0sQ0FBQztRQUNqRCxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ2hELE1BQU0sQ0FBQyxDQUNILE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQztRQUNsQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQztRQUN2RixPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUN2QixDQUFDO0FBQ04sQ0FBQztBQUVELDBCQUEwQixDQUFVLEVBQUUsSUFBeUI7SUFDM0QsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQy9CLElBQUksT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQztJQUNuQyxJQUFJLFdBQVcsR0FDWCxZQUFZLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUM7UUFDOUMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM5QyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7SUFFbEIsSUFBSSxhQUFhLEdBQ2IsWUFBWSxDQUFDLGtCQUFrQixDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDO1FBQ2xELFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDL0MsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBRWxCLE1BQU0sQ0FBQyxDQUNILFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7UUFDaEMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuRCxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUM7UUFDckMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDO1FBQ3pDLFlBQVksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQ2pDLENBQUM7QUFDTixDQUFDO0FBRUQsOEJBQThCLENBQVUsRUFBRSxJQUFxQjtJQUMzRCxNQUFNLFVBQVUsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xELE1BQU0sQ0FBQyxDQUNILGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQztRQUN4QyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDL0MsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQzVDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDO1FBQ3ZDLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUN6QyxDQUFDO0FBQ04sQ0FBQztBQUVELHFCQUFxQixDQUFVLEVBQUUsSUFBb0I7SUFDakQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZGLENBQUM7QUFFRCx3QkFBd0IsQ0FBVSxFQUFFLElBQW1CO0lBQ25ELE1BQU0sQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoRyxDQUFDO0FBRUQsb0JBQW9CLENBQVUsRUFBRSxJQUFXO0lBQ3ZDLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDckIsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUN6QixJQUFJLElBQUksR0FBdUIsU0FBUyxDQUFDO0lBQ3pDLElBQUksUUFBUSxHQUF1QixTQUFTLENBQUM7SUFDN0MsSUFBSSxVQUFVLEdBQXVCLFNBQVMsQ0FBQztJQUUvQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9CLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUFDLElBQUksQ0FBQyxDQUFDO1FBQ0osTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDO1FBQy9CLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0MsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUVELElBQUksUUFBUSxHQUFHLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFDLFFBQVEsR0FBRyxNQUFNLENBQUMsMEJBQTBCLENBQ3hDLENBQUMsRUFDRCxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDOUIsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM5QixNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlCLE1BQU0sQ0FBQyxDQUNILFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO2dCQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUM7Z0JBQ3hCLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQztnQkFDMUIsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FDM0IsQ0FBQztRQUNOLENBQUMsQ0FBQyxDQUNMLENBQUM7SUFDTixDQUFDO0lBQ0QsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDWixJQUFJLEdBQUcsQ0FBQyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUNELE1BQU0sQ0FBQyxDQUNILE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQ3BCLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQztRQUM3QixNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7UUFDN0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDO1FBQy9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQ3RDLENBQUMsSUFBSSxLQUFLLFNBQVMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMvQyxDQUFDLFVBQVUsS0FBSyxTQUFTLElBQUksTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDakUsQ0FBQyxRQUFRLEtBQUssU0FBUyxJQUFJLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDakUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FDckIsQ0FBQztBQUNOLENBQUM7QUFFRCxvQkFBMEIsTUFBVyxFQUFFLFVBQXNEO0lBQ3pGLE1BQU0sTUFBTSxHQUFHLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN4QyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDO1FBQzVDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBQ0QsTUFBTSxDQUFDLE1BQU0sQ0FBQztBQUNsQixDQUFDO0FBRUQsTUFBTSxzQkFBc0IsR0FBRyxDQUFDO0lBQzVCLE1BQU0sTUFBTSxHQUFHLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xDLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQy9ELDZDQUE2QztJQUM3QyxNQUFNLENBQUMsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxFQUFFLENBQUMiLCJmaWxlIjoiaXBjL3dyaXRlci9iaW5hcnkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgVGFibGUgfSBmcm9tICcuLi8uLi90YWJsZSc7XG5pbXBvcnQgeyBEZW5zZVVuaW9uRGF0YSB9IGZyb20gJy4uLy4uL2RhdGEnO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2ggfSBmcm9tICcuLi8uLi9yZWNvcmRiYXRjaCc7XG5pbXBvcnQgeyBWZWN0b3JWaXNpdG9yLCBUeXBlVmlzaXRvciB9IGZyb20gJy4uLy4uL3Zpc2l0b3InO1xuaW1wb3J0IHsgTUFHSUMsIG1hZ2ljTGVuZ3RoLCBtYWdpY0FuZFBhZGRpbmcsIFBBRERJTkcgfSBmcm9tICcuLi9tYWdpYyc7XG5pbXBvcnQgeyBhbGlnbiwgZ2V0Qm9vbCwgcGFja0Jvb2xzLCBpdGVyYXRlQml0cyB9IGZyb20gJy4uLy4uL3V0aWwvYml0JztcbmltcG9ydCB7IFZlY3RvciwgVW5pb25WZWN0b3IsIERpY3Rpb25hcnlWZWN0b3IsIE5lc3RlZFZlY3RvciwgTGlzdFZlY3RvciB9IGZyb20gJy4uLy4uL3ZlY3Rvcic7XG5pbXBvcnQgeyBCdWZmZXJNZXRhZGF0YSwgRmllbGRNZXRhZGF0YSwgRm9vdGVyLCBGaWxlQmxvY2ssIE1lc3NhZ2UsIFJlY29yZEJhdGNoTWV0YWRhdGEsIERpY3Rpb25hcnlCYXRjaCB9IGZyb20gJy4uL21ldGFkYXRhJztcbmltcG9ydCB7XG4gICAgU2NoZW1hLCBGaWVsZCwgVHlwZWRBcnJheSwgTWV0YWRhdGFWZXJzaW9uLFxuICAgIERhdGFUeXBlLFxuICAgIERpY3Rpb25hcnksXG4gICAgTnVsbCwgSW50LCBGbG9hdCxcbiAgICBCaW5hcnksIEJvb2wsIFV0ZjgsIERlY2ltYWwsXG4gICAgRGF0ZV8sIFRpbWUsIFRpbWVzdGFtcCwgSW50ZXJ2YWwsXG4gICAgTGlzdCwgU3RydWN0LCBVbmlvbiwgRml4ZWRTaXplQmluYXJ5LCBGaXhlZFNpemVMaXN0LCBNYXBfLFxuICAgIEZsYXRUeXBlLCBGbGF0TGlzdFR5cGUsIE5lc3RlZFR5cGUsIFVuaW9uTW9kZSwgU3BhcnNlVW5pb24sIERlbnNlVW5pb24sIFNpbmdsZU5lc3RlZFR5cGUsXG59IGZyb20gJy4uLy4uL3R5cGUnO1xuXG5leHBvcnQgZnVuY3Rpb24qIHNlcmlhbGl6ZVN0cmVhbSh0YWJsZTogVGFibGUpIHtcbiAgICB5aWVsZCBzZXJpYWxpemVNZXNzYWdlKHRhYmxlLnNjaGVtYSkuYnVmZmVyO1xuICAgIGZvciAoY29uc3QgW2lkLCBmaWVsZF0gb2YgdGFibGUuc2NoZW1hLmRpY3Rpb25hcmllcykge1xuICAgICAgICBjb25zdCB2ZWMgPSB0YWJsZS5nZXRDb2x1bW4oZmllbGQubmFtZSkgYXMgRGljdGlvbmFyeVZlY3RvcjtcbiAgICAgICAgaWYgKHZlYyAmJiB2ZWMuZGljdGlvbmFyeSkge1xuICAgICAgICAgICAgeWllbGQgc2VyaWFsaXplRGljdGlvbmFyeUJhdGNoKHZlYy5kaWN0aW9uYXJ5LCBpZCkuYnVmZmVyO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgcmVjb3JkQmF0Y2ggb2YgdGFibGUuYmF0Y2hlcykge1xuICAgICAgICB5aWVsZCBzZXJpYWxpemVSZWNvcmRCYXRjaChyZWNvcmRCYXRjaCkuYnVmZmVyO1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uKiBzZXJpYWxpemVGaWxlKHRhYmxlOiBUYWJsZSkge1xuXG4gICAgY29uc3QgcmVjb3JkQmF0Y2hlcyA9IFtdO1xuICAgIGNvbnN0IGRpY3Rpb25hcnlCYXRjaGVzID0gW107XG5cbiAgICAvLyBGaXJzdCB5aWVsZCB0aGUgbWFnaWMgc3RyaW5nIChhbGlnbmVkKVxuICAgIGxldCBidWZmZXIgPSBuZXcgVWludDhBcnJheShhbGlnbihtYWdpY0xlbmd0aCwgOCkpO1xuICAgIGxldCBtZXRhZGF0YUxlbmd0aCwgYnl0ZUxlbmd0aCA9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgIGJ1ZmZlci5zZXQoTUFHSUMsIDApO1xuICAgIHlpZWxkIGJ1ZmZlcjtcblxuICAgIC8vIFRoZW4geWllbGQgdGhlIHNjaGVtYVxuICAgICh7IG1ldGFkYXRhTGVuZ3RoLCBidWZmZXIgfSA9IHNlcmlhbGl6ZU1lc3NhZ2UodGFibGUuc2NoZW1hKSk7XG4gICAgYnl0ZUxlbmd0aCArPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICB5aWVsZCBidWZmZXI7XG5cbiAgICBmb3IgKGNvbnN0IFtpZCwgZmllbGRdIG9mIHRhYmxlLnNjaGVtYS5kaWN0aW9uYXJpZXMpIHtcbiAgICAgICAgY29uc3QgdmVjID0gdGFibGUuZ2V0Q29sdW1uKGZpZWxkLm5hbWUpIGFzIERpY3Rpb25hcnlWZWN0b3I7XG4gICAgICAgIGlmICh2ZWMgJiYgdmVjLmRpY3Rpb25hcnkpIHtcbiAgICAgICAgICAgICh7IG1ldGFkYXRhTGVuZ3RoLCBidWZmZXIgfSA9IHNlcmlhbGl6ZURpY3Rpb25hcnlCYXRjaCh2ZWMuZGljdGlvbmFyeSwgaWQpKTtcbiAgICAgICAgICAgIGRpY3Rpb25hcnlCYXRjaGVzLnB1c2gobmV3IEZpbGVCbG9jayhtZXRhZGF0YUxlbmd0aCwgYnVmZmVyLmJ5dGVMZW5ndGgsIGJ5dGVMZW5ndGgpKTtcbiAgICAgICAgICAgIGJ5dGVMZW5ndGggKz0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgICAgICAgICB5aWVsZCBidWZmZXI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCByZWNvcmRCYXRjaCBvZiB0YWJsZS5iYXRjaGVzKSB7XG4gICAgICAgICh7IG1ldGFkYXRhTGVuZ3RoLCBidWZmZXIgfSA9IHNlcmlhbGl6ZVJlY29yZEJhdGNoKHJlY29yZEJhdGNoKSk7XG4gICAgICAgIHJlY29yZEJhdGNoZXMucHVzaChuZXcgRmlsZUJsb2NrKG1ldGFkYXRhTGVuZ3RoLCBidWZmZXIuYnl0ZUxlbmd0aCwgYnl0ZUxlbmd0aCkpO1xuICAgICAgICBieXRlTGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICB5aWVsZCBidWZmZXI7XG4gICAgfVxuXG4gICAgLy8gVGhlbiB5aWVsZCB0aGUgZm9vdGVyIG1ldGFkYXRhIChub3QgYWxpZ25lZClcbiAgICAoeyBtZXRhZGF0YUxlbmd0aCwgYnVmZmVyIH0gPSBzZXJpYWxpemVGb290ZXIobmV3IEZvb3RlcihkaWN0aW9uYXJ5QmF0Y2hlcywgcmVjb3JkQmF0Y2hlcywgdGFibGUuc2NoZW1hKSkpO1xuICAgIHlpZWxkIGJ1ZmZlcjtcbiAgICBcbiAgICAvLyBMYXN0LCB5aWVsZCB0aGUgZm9vdGVyIGxlbmd0aCArIHRlcm1pbmF0aW5nIG1hZ2ljIGFycm93IHN0cmluZyAoYWxpZ25lZClcbiAgICBidWZmZXIgPSBuZXcgVWludDhBcnJheShtYWdpY0FuZFBhZGRpbmcpO1xuICAgIG5ldyBEYXRhVmlldyhidWZmZXIuYnVmZmVyKS5zZXRJbnQzMigwLCBtZXRhZGF0YUxlbmd0aCwgcGxhdGZvcm1Jc0xpdHRsZUVuZGlhbik7XG4gICAgYnVmZmVyLnNldChNQUdJQywgYnVmZmVyLmJ5dGVMZW5ndGggLSBtYWdpY0xlbmd0aCk7XG4gICAgeWllbGQgYnVmZmVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VyaWFsaXplUmVjb3JkQmF0Y2gocmVjb3JkQmF0Y2g6IFJlY29yZEJhdGNoKSB7XG4gICAgY29uc3QgeyBieXRlTGVuZ3RoLCBmaWVsZE5vZGVzLCBidWZmZXJzLCBidWZmZXJzTWV0YSB9ID0gbmV3IFJlY29yZEJhdGNoU2VyaWFsaXplcigpLnZpc2l0UmVjb3JkQmF0Y2gocmVjb3JkQmF0Y2gpO1xuICAgIGNvbnN0IHJiTWV0YSA9IG5ldyBSZWNvcmRCYXRjaE1ldGFkYXRhKE1ldGFkYXRhVmVyc2lvbi5WNCwgcmVjb3JkQmF0Y2gubGVuZ3RoLCBmaWVsZE5vZGVzLCBidWZmZXJzTWV0YSk7XG4gICAgY29uc3QgcmJEYXRhID0gY29uY2F0QnVmZmVyc1dpdGhNZXRhZGF0YShieXRlTGVuZ3RoLCBidWZmZXJzLCBidWZmZXJzTWV0YSk7XG4gICAgcmV0dXJuIHNlcmlhbGl6ZU1lc3NhZ2UocmJNZXRhLCByYkRhdGEpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VyaWFsaXplRGljdGlvbmFyeUJhdGNoKGRpY3Rpb25hcnk6IFZlY3RvciwgaWQ6IExvbmcgfCBudW1iZXIsIGlzRGVsdGE6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgIGNvbnN0IHsgYnl0ZUxlbmd0aCwgZmllbGROb2RlcywgYnVmZmVycywgYnVmZmVyc01ldGEgfSA9IG5ldyBSZWNvcmRCYXRjaFNlcmlhbGl6ZXIoKS52aXNpdFJlY29yZEJhdGNoKFJlY29yZEJhdGNoLmZyb20oW2RpY3Rpb25hcnldKSk7XG4gICAgY29uc3QgcmJNZXRhID0gbmV3IFJlY29yZEJhdGNoTWV0YWRhdGEoTWV0YWRhdGFWZXJzaW9uLlY0LCBkaWN0aW9uYXJ5Lmxlbmd0aCwgZmllbGROb2RlcywgYnVmZmVyc01ldGEpO1xuICAgIGNvbnN0IGRiTWV0YSA9IG5ldyBEaWN0aW9uYXJ5QmF0Y2goTWV0YWRhdGFWZXJzaW9uLlY0LCByYk1ldGEsIGlkLCBpc0RlbHRhKTtcbiAgICBjb25zdCByYkRhdGEgPSBjb25jYXRCdWZmZXJzV2l0aE1ldGFkYXRhKGJ5dGVMZW5ndGgsIGJ1ZmZlcnMsIGJ1ZmZlcnNNZXRhKTtcbiAgICByZXR1cm4gc2VyaWFsaXplTWVzc2FnZShkYk1ldGEsIHJiRGF0YSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVNZXNzYWdlKG1lc3NhZ2U6IE1lc3NhZ2UsIGRhdGE/OiBVaW50OEFycmF5KSB7XG4gICAgY29uc3QgYiA9IG5ldyBCdWlsZGVyKCk7XG4gICAgX01lc3NhZ2UuZmluaXNoTWVzc2FnZUJ1ZmZlcihiLCB3cml0ZU1lc3NhZ2UoYiwgbWVzc2FnZSkpO1xuICAgIC8vIFNsaWNlIG91dCB0aGUgYnVmZmVyIHRoYXQgY29udGFpbnMgdGhlIG1lc3NhZ2UgbWV0YWRhdGFcbiAgICBjb25zdCBtZXRhZGF0YUJ5dGVzID0gYi5hc1VpbnQ4QXJyYXkoKTtcbiAgICAvLyBSZXNlcnZlIDQgYnl0ZXMgZm9yIHdyaXRpbmcgdGhlIG1lc3NhZ2Ugc2l6ZSBhdCB0aGUgZnJvbnQuXG4gICAgLy8gTWV0YWRhdGEgbGVuZ3RoIGluY2x1ZGVzIHRoZSBtZXRhZGF0YSBieXRlTGVuZ3RoICsgdGhlIDRcbiAgICAvLyBieXRlcyBmb3IgdGhlIGxlbmd0aCwgYW5kIHJvdW5kZWQgdXAgdG8gdGhlIG5lYXJlc3QgOCBieXRlcy5cbiAgICBjb25zdCBtZXRhZGF0YUxlbmd0aCA9IGFsaWduKFBBRERJTkcgKyBtZXRhZGF0YUJ5dGVzLmJ5dGVMZW5ndGgsIDgpO1xuICAgIC8vICsgdGhlIGxlbmd0aCBvZiB0aGUgb3B0aW9uYWwgZGF0YSBidWZmZXIgYXQgdGhlIGVuZCwgcGFkZGVkXG4gICAgY29uc3QgZGF0YUJ5dGVMZW5ndGggPSBkYXRhID8gZGF0YS5ieXRlTGVuZ3RoIDogMDtcbiAgICAvLyBlbnN1cmUgdGhlIGVudGlyZSBtZXNzYWdlIGlzIGFsaWduZWQgdG8gYW4gOC1ieXRlIGJvdW5kYXJ5XG4gICAgY29uc3QgbWVzc2FnZUJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoYWxpZ24obWV0YWRhdGFMZW5ndGggKyBkYXRhQnl0ZUxlbmd0aCwgOCkpO1xuICAgIC8vIFdyaXRlIHRoZSBtZXRhZGF0YSBsZW5ndGggaW50byB0aGUgZmlyc3QgNCBieXRlcywgYnV0IHN1YnRyYWN0IHRoZVxuICAgIC8vIGJ5dGVzIHdlIHVzZSB0byBob2xkIHRoZSBsZW5ndGggaXRzZWxmLlxuICAgIG5ldyBEYXRhVmlldyhtZXNzYWdlQnl0ZXMuYnVmZmVyKS5zZXRJbnQzMigwLCBtZXRhZGF0YUxlbmd0aCAtIFBBRERJTkcsIHBsYXRmb3JtSXNMaXR0bGVFbmRpYW4pO1xuICAgIC8vIENvcHkgdGhlIG1ldGFkYXRhIGJ5dGVzIGludG8gdGhlIG1lc3NhZ2UgYnVmZmVyXG4gICAgbWVzc2FnZUJ5dGVzLnNldChtZXRhZGF0YUJ5dGVzLCBQQURESU5HKTtcbiAgICAvLyBDb3B5IHRoZSBvcHRpb25hbCBkYXRhIGJ1ZmZlciBhZnRlciB0aGUgbWV0YWRhdGEgYnl0ZXNcbiAgICAoZGF0YSAmJiBkYXRhQnl0ZUxlbmd0aCA+IDApICYmIG1lc3NhZ2VCeXRlcy5zZXQoZGF0YSwgbWV0YWRhdGFMZW5ndGgpO1xuICAgIC8vIGlmIChtZXNzYWdlQnl0ZXMuYnl0ZUxlbmd0aCAlIDggIT09IDApIHsgZGVidWdnZXI7IH1cbiAgICAvLyBSZXR1cm4gdGhlIG1ldGFkYXRhIGxlbmd0aCBiZWNhdXNlIHdlIG5lZWQgdG8gd3JpdGUgaXQgaW50byBlYWNoIEZpbGVCbG9jayBhbHNvXG4gICAgcmV0dXJuIHsgbWV0YWRhdGFMZW5ndGgsIGJ1ZmZlcjogbWVzc2FnZUJ5dGVzIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVGb290ZXIoZm9vdGVyOiBGb290ZXIpIHtcbiAgICBjb25zdCBiID0gbmV3IEJ1aWxkZXIoKTtcbiAgICBfRm9vdGVyLmZpbmlzaEZvb3RlckJ1ZmZlcihiLCB3cml0ZUZvb3RlcihiLCBmb290ZXIpKTtcbiAgICAvLyBTbGljZSBvdXQgdGhlIGJ1ZmZlciB0aGF0IGNvbnRhaW5zIHRoZSBmb290ZXIgbWV0YWRhdGFcbiAgICBjb25zdCBmb290ZXJCeXRlcyA9IGIuYXNVaW50OEFycmF5KCk7XG4gICAgY29uc3QgbWV0YWRhdGFMZW5ndGggPSBmb290ZXJCeXRlcy5ieXRlTGVuZ3RoO1xuICAgIHJldHVybiB7IG1ldGFkYXRhTGVuZ3RoLCBidWZmZXI6IGZvb3RlckJ5dGVzIH07XG59XG5cbmNsYXNzIFJlY29yZEJhdGNoU2VyaWFsaXplciBleHRlbmRzIFZlY3RvclZpc2l0b3Ige1xuICAgIHB1YmxpYyBieXRlTGVuZ3RoID0gMDtcbiAgICBwdWJsaWMgYnVmZmVyczogVHlwZWRBcnJheVtdID0gW107XG4gICAgcHVibGljIGZpZWxkTm9kZXM6IEZpZWxkTWV0YWRhdGFbXSA9IFtdO1xuICAgIHB1YmxpYyBidWZmZXJzTWV0YTogQnVmZmVyTWV0YWRhdGFbXSA9IFtdO1xuICAgIHB1YmxpYyB2aXNpdFJlY29yZEJhdGNoKHJlY29yZEJhdGNoOiBSZWNvcmRCYXRjaCkge1xuICAgICAgICB0aGlzLmJ1ZmZlcnMgPSBbXTtcbiAgICAgICAgdGhpcy5ieXRlTGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5maWVsZE5vZGVzID0gW107XG4gICAgICAgIHRoaXMuYnVmZmVyc01ldGEgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgdmVjdG9yOiBWZWN0b3IsIGluZGV4ID0gLTEsIG51bUNvbHMgPSByZWNvcmRCYXRjaC5udW1Db2xzOyArK2luZGV4IDwgbnVtQ29sczspIHtcbiAgICAgICAgICAgIGlmICh2ZWN0b3IgPSByZWNvcmRCYXRjaC5nZXRDaGlsZEF0KGluZGV4KSEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnZpc2l0KHZlY3Rvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdDxUIGV4dGVuZHMgRGF0YVR5cGU+KHZlY3RvcjogVmVjdG9yPFQ+KSB7XG4gICAgICAgIGlmICghRGF0YVR5cGUuaXNEaWN0aW9uYXJ5KHZlY3Rvci50eXBlKSkge1xuICAgICAgICAgICAgY29uc3QgeyBkYXRhLCBsZW5ndGgsIG51bGxDb3VudCB9ID0gdmVjdG9yO1xuICAgICAgICAgICAgaWYgKGxlbmd0aCA+IDIxNDc0ODM2NDcpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQ2Fubm90IHdyaXRlIGFycmF5cyBsYXJnZXIgdGhhbiAyXjMxIC0gMSBpbiBsZW5ndGgnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZmllbGROb2Rlcy5wdXNoKG5ldyBGaWVsZE1ldGFkYXRhKGxlbmd0aCwgbnVsbENvdW50KSk7XG5cbiAgICAgICAgICAgIGNvbnN0IG51bGxCaXRtYXBBbGlnbm1lbnQgPSBsZW5ndGggPD0gNjQgPyA4IDogNjQ7XG4gICAgICAgICAgICBjb25zdCBudWxsQml0bWFwID0gbnVsbENvdW50IDw9IDBcbiAgICAgICAgICAgICAgICA/IG5ldyBVaW50OEFycmF5KDApIC8vIHBsYWNlaG9sZGVyIHZhbGlkaXR5IGJ1ZmZlclxuICAgICAgICAgICAgICAgIDogdGhpcy5nZXRUcnVuY2F0ZWRCaXRtYXAoZGF0YS5vZmZzZXQsIGxlbmd0aCwgZGF0YS5udWxsQml0bWFwISk7XG4gICAgICAgICAgICB0aGlzLmFkZEJ1ZmZlcihudWxsQml0bWFwLCBudWxsQml0bWFwQWxpZ25tZW50KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3VwZXIudmlzaXQodmVjdG9yKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0TnVsbCAgICAgICAgICAgKF9udWxsejogVmVjdG9yPE51bGw+KSAgICAgICAgICAgIHsgcmV0dXJuIHRoaXM7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdEJvb2wgICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxCb29sPikgICAgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0Qm9vbFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRJbnQgICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8SW50PikgICAgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0RmxvYXQgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPEZsb2F0PikgICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdFV0ZjggICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxVdGY4PikgICAgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdExpc3RWZWN0b3IodmVjdG9yKTsgIH1cbiAgICBwdWJsaWMgdmlzaXRCaW5hcnkgICAgICAgICAodmVjdG9yOiBWZWN0b3I8QmluYXJ5PikgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRMaXN0VmVjdG9yKHZlY3Rvcik7ICB9XG4gICAgcHVibGljIHZpc2l0RGF0ZSAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPERhdGVfPikgICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdFRpbWVzdGFtcCAgICAgICh2ZWN0b3I6IFZlY3RvcjxUaW1lc3RhbXA+KSAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRUaW1lICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8VGltZT4pICAgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0RGVjaW1hbCAgICAgICAgKHZlY3RvcjogVmVjdG9yPERlY2ltYWw+KSAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdEludGVydmFsICAgICAgICh2ZWN0b3I6IFZlY3RvcjxJbnRlcnZhbD4pICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRMaXN0ICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8TGlzdD4pICAgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdExpc3RWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0U3RydWN0ICAgICAgICAgKHZlY3RvcjogVmVjdG9yPFN0cnVjdD4pICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXROZXN0ZWRWZWN0b3IodmVjdG9yKTsgICAgfVxuICAgIHB1YmxpYyB2aXNpdEZpeGVkU2l6ZUJpbmFyeSh2ZWN0b3I6IFZlY3RvcjxGaXhlZFNpemVCaW5hcnk+KSB7IHJldHVybiB0aGlzLnZpc2l0RmxhdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRGaXhlZFNpemVMaXN0ICAodmVjdG9yOiBWZWN0b3I8Rml4ZWRTaXplTGlzdD4pICAgeyByZXR1cm4gdGhpcy52aXNpdExpc3RWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0TWFwICAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPE1hcF8+KSAgICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXROZXN0ZWRWZWN0b3IodmVjdG9yKTsgICAgfVxuICAgIHB1YmxpYyB2aXNpdERpY3Rpb25hcnkgICAgICh2ZWN0b3I6IERpY3Rpb25hcnlWZWN0b3IpICAgICAgICB7XG4gICAgICAgIC8vIERpY3Rpb25hcnkgd3JpdHRlbiBvdXQgc2VwYXJhdGVseS4gU2xpY2Ugb2Zmc2V0IGNvbnRhaW5lZCBpbiB0aGUgaW5kaWNlc1xuICAgICAgICByZXR1cm4gdGhpcy52aXNpdCh2ZWN0b3IuaW5kaWNlcyk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdFVuaW9uKHZlY3RvcjogVmVjdG9yPERlbnNlVW5pb24gfCBTcGFyc2VVbmlvbj4pIHtcbiAgICAgICAgY29uc3QgeyBkYXRhLCB0eXBlLCBsZW5ndGggfSA9IHZlY3RvcjtcbiAgICAgICAgY29uc3QgeyBvZmZzZXQ6IHNsaWNlT2Zmc2V0LCB0eXBlSWRzIH0gPSBkYXRhO1xuICAgICAgICAvLyBBbGwgVW5pb24gVmVjdG9ycyBoYXZlIGEgdHlwZUlkcyBidWZmZXJcbiAgICAgICAgdGhpcy5hZGRCdWZmZXIodHlwZUlkcyk7XG4gICAgICAgIC8vIElmIHRoaXMgaXMgYSBTcGFyc2UgVW5pb24sIHRyZWF0IGl0IGxpa2UgYWxsIG90aGVyIE5lc3RlZCB0eXBlc1xuICAgICAgICBpZiAodHlwZS5tb2RlID09PSBVbmlvbk1vZGUuU3BhcnNlKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52aXNpdE5lc3RlZFZlY3Rvcih2ZWN0b3IpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUubW9kZSA9PT0gVW5pb25Nb2RlLkRlbnNlKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGlzIGlzIGEgRGVuc2UgVW5pb24sIGFkZCB0aGUgdmFsdWVPZmZzZXRzIGJ1ZmZlciBhbmQgcG90ZW50aWFsbHkgc2xpY2UgdGhlIGNoaWxkcmVuXG4gICAgICAgICAgICBjb25zdCB2YWx1ZU9mZnNldHMgPSAoZGF0YSBhcyBEZW5zZVVuaW9uRGF0YSkudmFsdWVPZmZzZXRzO1xuICAgICAgICAgICAgaWYgKHNsaWNlT2Zmc2V0IDw9IDApIHtcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgVmVjdG9yIGhhc24ndCBiZWVuIHNsaWNlZCwgd3JpdGUgdGhlIGV4aXN0aW5nIHZhbHVlT2Zmc2V0c1xuICAgICAgICAgICAgICAgIHRoaXMuYWRkQnVmZmVyKHZhbHVlT2Zmc2V0cyk7XG4gICAgICAgICAgICAgICAgLy8gV2UgY2FuIHRyZWF0IHRoaXMgbGlrZSBhbGwgb3RoZXIgTmVzdGVkIHR5cGVzXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudmlzaXROZXN0ZWRWZWN0b3IodmVjdG9yKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gQSBzbGljZWQgRGVuc2UgVW5pb24gaXMgYW4gdW5wbGVhc2FudCBjYXNlLiBCZWNhdXNlIHRoZSBvZmZzZXRzIGFyZSBkaWZmZXJlbnQgZm9yXG4gICAgICAgICAgICAgICAgLy8gZWFjaCBjaGlsZCB2ZWN0b3IsIHdlIG5lZWQgdG8gXCJyZWJhc2VcIiB0aGUgdmFsdWVPZmZzZXRzIGZvciBlYWNoIGNoaWxkXG4gICAgICAgICAgICAgICAgLy8gVW5pb24gdHlwZUlkcyBhcmUgbm90IG5lY2Vzc2FyeSAwLWluZGV4ZWRcbiAgICAgICAgICAgICAgICBjb25zdCBtYXhDaGlsZFR5cGVJZCA9IE1hdGgubWF4KC4uLnR5cGUudHlwZUlkcyk7XG4gICAgICAgICAgICAgICAgY29uc3QgY2hpbGRMZW5ndGhzID0gbmV3IEludDMyQXJyYXkobWF4Q2hpbGRUeXBlSWQgKyAxKTtcbiAgICAgICAgICAgICAgICAvLyBTZXQgYWxsIHRvIC0xIHRvIGluZGljYXRlIHRoYXQgd2UgaGF2ZW4ndCBvYnNlcnZlZCBhIGZpcnN0IG9jY3VycmVuY2Ugb2YgYSBwYXJ0aWN1bGFyIGNoaWxkIHlldFxuICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkT2Zmc2V0cyA9IG5ldyBJbnQzMkFycmF5KG1heENoaWxkVHlwZUlkICsgMSkuZmlsbCgtMSk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2hpZnRlZE9mZnNldHMgPSBuZXcgSW50MzJBcnJheShsZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHVuc2hpZnRlZE9mZnNldHMgPSB0aGlzLmdldFplcm9CYXNlZFZhbHVlT2Zmc2V0cyhzbGljZU9mZnNldCwgbGVuZ3RoLCB2YWx1ZU9mZnNldHMpO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IHR5cGVJZCwgc2hpZnQsIGluZGV4ID0gLTE7ICsraW5kZXggPCBsZW5ndGg7KSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGVJZCA9IHR5cGVJZHNbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAvLyB+KC0xKSB1c2VkIHRvIGJlIGZhc3RlciB0aGFuIHggPT09IC0xLCBzbyBtYXliZSB3b3J0aCBiZW5jaG1hcmtpbmcgdGhlIGRpZmZlcmVuY2Ugb2YgdGhlc2UgdHdvIGltcGxzIGZvciBsYXJnZSBkZW5zZSB1bmlvbnM6XG4gICAgICAgICAgICAgICAgICAgIC8vIH4oc2hpZnQgPSBjaGlsZE9mZnNldHNbdHlwZUlkXSkgfHwgKHNoaWZ0ID0gY2hpbGRPZmZzZXRzW3R5cGVJZF0gPSB1bnNoaWZ0ZWRPZmZzZXRzW2luZGV4XSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIEdvaW5nIHdpdGggdGhpcyBmb3JtIGZvciBub3csIGFzIGl0J3MgbW9yZSByZWFkYWJsZVxuICAgICAgICAgICAgICAgICAgICBpZiAoKHNoaWZ0ID0gY2hpbGRPZmZzZXRzW3R5cGVJZF0pID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hpZnQgPSBjaGlsZE9mZnNldHNbdHlwZUlkXSA9IHVuc2hpZnRlZE9mZnNldHNbdHlwZUlkXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzaGlmdGVkT2Zmc2V0c1tpbmRleF0gPSB1bnNoaWZ0ZWRPZmZzZXRzW2luZGV4XSAtIHNoaWZ0O1xuICAgICAgICAgICAgICAgICAgICArK2NoaWxkTGVuZ3Roc1t0eXBlSWRdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLmFkZEJ1ZmZlcihzaGlmdGVkT2Zmc2V0cyk7XG4gICAgICAgICAgICAgICAgLy8gU2xpY2UgYW5kIHZpc2l0IGNoaWxkcmVuIGFjY29yZGluZ2x5XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgY2hpbGRJbmRleCA9IC0xLCBudW1DaGlsZHJlbiA9IHR5cGUuY2hpbGRyZW4ubGVuZ3RoOyArK2NoaWxkSW5kZXggPCBudW1DaGlsZHJlbjspIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHlwZUlkID0gdHlwZS50eXBlSWRzW2NoaWxkSW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjaGlsZCA9ICh2ZWN0b3IgYXMgVW5pb25WZWN0b3IpLmdldENoaWxkQXQoY2hpbGRJbmRleCkhO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnZpc2l0KGNoaWxkLnNsaWNlKGNoaWxkT2Zmc2V0c1t0eXBlSWRdLCBNYXRoLm1pbihsZW5ndGgsIGNoaWxkTGVuZ3Roc1t0eXBlSWRdKSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHJvdGVjdGVkIHZpc2l0Qm9vbFZlY3Rvcih2ZWN0b3I6IFZlY3RvcjxCb29sPikge1xuICAgICAgICAvLyBCb29sIHZlY3RvciBpcyBhIHNwZWNpYWwgY2FzZSBvZiBGbGF0VmVjdG9yLCBhcyBpdHMgZGF0YSBidWZmZXIgbmVlZHMgdG8gc3RheSBwYWNrZWRcbiAgICAgICAgbGV0IGJpdG1hcDogVWludDhBcnJheTtcbiAgICAgICAgbGV0IHZhbHVlcywgeyBkYXRhLCBsZW5ndGggfSA9IHZlY3RvcjtcbiAgICAgICAgbGV0IGFsaWdubWVudCA9IGxlbmd0aCA8PSA2NCA/IDggOiA2NDtcbiAgICAgICAgaWYgKHZlY3Rvci5udWxsQ291bnQgPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBJZiBhbGwgdmFsdWVzIGFyZSBudWxsLCBqdXN0IGluc2VydCBhIHBsYWNlaG9sZGVyIGVtcHR5IGRhdGEgYnVmZmVyIChmYXN0ZXN0IHBhdGgpXG4gICAgICAgICAgICBiaXRtYXAgPSBuZXcgVWludDhBcnJheSgwKTtcbiAgICAgICAgfSBlbHNlIGlmICghKCh2YWx1ZXMgPSBkYXRhLnZhbHVlcykgaW5zdGFuY2VvZiBVaW50OEFycmF5KSkge1xuICAgICAgICAgICAgLy8gT3RoZXJ3aXNlIGlmIHRoZSB1bmRlcmx5aW5nIGRhdGEgKmlzbid0KiBhIFVpbnQ4QXJyYXksIGVudW1lcmF0ZVxuICAgICAgICAgICAgLy8gdGhlIHZhbHVlcyBhcyBib29scyBhbmQgcmUtcGFjayB0aGVtIGludG8gYSBVaW50OEFycmF5IChzbG93IHBhdGgpXG4gICAgICAgICAgICBiaXRtYXAgPSBwYWNrQm9vbHModmVjdG9yKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSBqdXN0IHNsaWNlIHRoZSBiaXRtYXAgKGZhc3QgcGF0aClcbiAgICAgICAgICAgIGJpdG1hcCA9IHRoaXMuZ2V0VHJ1bmNhdGVkQml0bWFwKGRhdGEub2Zmc2V0LCBsZW5ndGgsIHZhbHVlcyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hZGRCdWZmZXIoYml0bWFwLCBhbGlnbm1lbnQpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHJvdGVjdGVkIHZpc2l0RmxhdFZlY3RvcjxUIGV4dGVuZHMgRmxhdFR5cGU+KHZlY3RvcjogVmVjdG9yPFQ+KSB7XG4gICAgICAgIGNvbnN0IHsgdmlldywgZGF0YSB9ID0gdmVjdG9yO1xuICAgICAgICBjb25zdCB7IG9mZnNldCwgbGVuZ3RoLCB2YWx1ZXMgfSA9IGRhdGE7XG4gICAgICAgIGNvbnN0IHNjYWxlZExlbmd0aCA9IGxlbmd0aCAqICgodmlldyBhcyBhbnkpLnNpemUgfHwgMSk7XG4gICAgICAgIHJldHVybiB0aGlzLmFkZEJ1ZmZlcih2YWx1ZXMuc3ViYXJyYXkob2Zmc2V0LCBzY2FsZWRMZW5ndGgpKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHZpc2l0RmxhdExpc3RWZWN0b3I8VCBleHRlbmRzIEZsYXRMaXN0VHlwZT4odmVjdG9yOiBWZWN0b3I8VD4pIHtcbiAgICAgICAgY29uc3QgeyBkYXRhLCBsZW5ndGggfSA9IHZlY3RvcjtcbiAgICAgICAgY29uc3QgeyBvZmZzZXQsIHZhbHVlcywgdmFsdWVPZmZzZXRzIH0gPSBkYXRhO1xuICAgICAgICBjb25zdCBmaXJzdE9mZnNldCA9IHZhbHVlT2Zmc2V0c1swXTtcbiAgICAgICAgY29uc3QgbGFzdE9mZnNldCA9IHZhbHVlT2Zmc2V0c1tsZW5ndGhdO1xuICAgICAgICBjb25zdCBieXRlTGVuZ3RoID0gTWF0aC5taW4obGFzdE9mZnNldCAtIGZpcnN0T2Zmc2V0LCB2YWx1ZXMuYnl0ZUxlbmd0aCAtIGZpcnN0T2Zmc2V0KTtcbiAgICAgICAgLy8gUHVzaCBpbiB0aGUgb3JkZXIgRmxhdExpc3QgdHlwZXMgcmVhZCB0aGVpciBidWZmZXJzXG4gICAgICAgIC8vIHZhbHVlT2Zmc2V0cyBidWZmZXIgZmlyc3RcbiAgICAgICAgdGhpcy5hZGRCdWZmZXIodGhpcy5nZXRaZXJvQmFzZWRWYWx1ZU9mZnNldHMob2Zmc2V0LCBsZW5ndGgsIHZhbHVlT2Zmc2V0cykpO1xuICAgICAgICAvLyBzbGljZWQgdmFsdWVzIGJ1ZmZlciBzZWNvbmRcbiAgICAgICAgdGhpcy5hZGRCdWZmZXIodmFsdWVzLnN1YmFycmF5KGZpcnN0T2Zmc2V0ICsgb2Zmc2V0LCBmaXJzdE9mZnNldCArIG9mZnNldCArIGJ5dGVMZW5ndGgpKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHByb3RlY3RlZCB2aXNpdExpc3RWZWN0b3I8VCBleHRlbmRzIFNpbmdsZU5lc3RlZFR5cGU+KHZlY3RvcjogVmVjdG9yPFQ+KSB7XG4gICAgICAgIGNvbnN0IHsgZGF0YSwgbGVuZ3RoIH0gPSB2ZWN0b3I7XG4gICAgICAgIGNvbnN0IHsgb2Zmc2V0LCB2YWx1ZU9mZnNldHMgfSA9IDxhbnk+IGRhdGE7XG4gICAgICAgIC8vIElmIHdlIGhhdmUgdmFsdWVPZmZzZXRzIChMaXN0VmVjdG9yKSwgcHVzaCB0aGF0IGJ1ZmZlciBmaXJzdFxuICAgICAgICBpZiAodmFsdWVPZmZzZXRzKSB7XG4gICAgICAgICAgICB0aGlzLmFkZEJ1ZmZlcih0aGlzLmdldFplcm9CYXNlZFZhbHVlT2Zmc2V0cyhvZmZzZXQsIGxlbmd0aCwgdmFsdWVPZmZzZXRzKSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGhlbiBpbnNlcnQgdGhlIExpc3QncyB2YWx1ZXMgY2hpbGRcbiAgICAgICAgcmV0dXJuIHRoaXMudmlzaXQoKHZlY3RvciBhcyBhbnkgYXMgTGlzdFZlY3RvcjxUPikuZ2V0Q2hpbGRBdCgwKSEpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgdmlzaXROZXN0ZWRWZWN0b3I8VCBleHRlbmRzIE5lc3RlZFR5cGU+KHZlY3RvcjogVmVjdG9yPFQ+KSB7XG4gICAgICAgIC8vIFZpc2l0IHRoZSBjaGlsZHJlbiBhY2NvcmRpbmdseVxuICAgICAgICBjb25zdCBudW1DaGlsZHJlbiA9ICh2ZWN0b3IudHlwZS5jaGlsZHJlbiB8fCBbXSkubGVuZ3RoO1xuICAgICAgICBmb3IgKGxldCBjaGlsZDogVmVjdG9yIHwgbnVsbCwgY2hpbGRJbmRleCA9IC0xOyArK2NoaWxkSW5kZXggPCBudW1DaGlsZHJlbjspIHtcbiAgICAgICAgICAgIGlmIChjaGlsZCA9ICh2ZWN0b3IgYXMgTmVzdGVkVmVjdG9yPFQ+KS5nZXRDaGlsZEF0KGNoaWxkSW5kZXgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy52aXNpdChjaGlsZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHByb3RlY3RlZCBhZGRCdWZmZXIodmFsdWVzOiBUeXBlZEFycmF5LCBhbGlnbm1lbnQ6IG51bWJlciA9IDY0KSB7XG4gICAgICAgIGNvbnN0IGxlbmd0aCA9IGFsaWduKHZhbHVlcy5ieXRlTGVuZ3RoLCBhbGlnbm1lbnQpO1xuICAgICAgICB0aGlzLmJ1ZmZlcnMucHVzaCh2YWx1ZXMpO1xuICAgICAgICB0aGlzLmJ1ZmZlcnNNZXRhLnB1c2gobmV3IEJ1ZmZlck1ldGFkYXRhKHRoaXMuYnl0ZUxlbmd0aCwgbGVuZ3RoKSk7XG4gICAgICAgIHRoaXMuYnl0ZUxlbmd0aCArPSBsZW5ndGg7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgZ2V0VHJ1bmNhdGVkQml0bWFwKG9mZnNldDogbnVtYmVyLCBsZW5ndGg6IG51bWJlciwgYml0bWFwOiBVaW50OEFycmF5KSB7XG4gICAgICAgIGNvbnN0IGFsaWduZWRMZW5ndGggPSBhbGlnbihsZW5ndGgsIGxlbmd0aCA8PSA2NCA/IDggOiA2NCk7XG4gICAgICAgIGlmIChvZmZzZXQgPiAwIHx8IGJpdG1hcC5sZW5ndGggPCBhbGlnbmVkTGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBXaXRoIGEgc2xpY2VkIGFycmF5IC8gbm9uLXplcm8gb2Zmc2V0LCB3ZSBoYXZlIHRvIGNvcHkgdGhlIGJpdG1hcFxuICAgICAgICAgICAgY29uc3QgYnl0ZXMgPSBuZXcgVWludDhBcnJheShhbGlnbmVkTGVuZ3RoKTtcbiAgICAgICAgICAgIGJ5dGVzLnNldChcbiAgICAgICAgICAgICAgICAob2Zmc2V0ICUgOCA9PT0gMClcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgc2xpY2Ugb2Zmc2V0IGlzIGFsaWduZWQgdG8gMSBieXRlLCBpdCdzIHNhZmUgdG8gc2xpY2UgdGhlIG51bGxCaXRtYXAgZGlyZWN0bHlcbiAgICAgICAgICAgICAgICA/IGJpdG1hcC5zdWJhcnJheShvZmZzZXQgPj4gMylcbiAgICAgICAgICAgICAgICAvLyBpdGVyYXRlIGVhY2ggYml0IHN0YXJ0aW5nIGZyb20gdGhlIHNsaWNlIG9mZnNldCwgYW5kIHJlcGFjayBpbnRvIGFuIGFsaWduZWQgbnVsbEJpdG1hcFxuICAgICAgICAgICAgICAgIDogcGFja0Jvb2xzKGl0ZXJhdGVCaXRzKGJpdG1hcCwgb2Zmc2V0LCBsZW5ndGgsIG51bGwsIGdldEJvb2wpKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHJldHVybiBieXRlcztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYml0bWFwO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgZ2V0WmVyb0Jhc2VkVmFsdWVPZmZzZXRzKG9mZnNldDogbnVtYmVyLCBsZW5ndGg6IG51bWJlciwgdmFsdWVPZmZzZXRzOiBJbnQzMkFycmF5KSB7XG4gICAgICAgIC8vIElmIHdlIGhhdmUgYSBub24temVybyBvZmZzZXQsIHRoZW4gdGhlIHZhbHVlIG9mZnNldHMgZG8gbm90IHN0YXJ0IGF0XG4gICAgICAgIC8vIHplcm8uIFdlIG11c3QgYSkgY3JlYXRlIGEgbmV3IG9mZnNldHMgYXJyYXkgd2l0aCBzaGlmdGVkIG9mZnNldHMgYW5kXG4gICAgICAgIC8vIGIpIHNsaWNlIHRoZSB2YWx1ZXMgYXJyYXkgYWNjb3JkaW5nbHlcbiAgICAgICAgaWYgKG9mZnNldCA+IDAgfHwgdmFsdWVPZmZzZXRzWzBdICE9PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBzdGFydE9mZnNldCA9IHZhbHVlT2Zmc2V0c1swXTtcbiAgICAgICAgICAgIGNvbnN0IGRlc3RPZmZzZXRzID0gbmV3IEludDMyQXJyYXkobGVuZ3RoICsgMSk7XG4gICAgICAgICAgICBmb3IgKGxldCBpbmRleCA9IC0xOyArK2luZGV4IDwgbGVuZ3RoOykge1xuICAgICAgICAgICAgICAgIGRlc3RPZmZzZXRzW2luZGV4XSA9IHZhbHVlT2Zmc2V0c1tpbmRleF0gLSBzdGFydE9mZnNldDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEZpbmFsIG9mZnNldFxuICAgICAgICAgICAgZGVzdE9mZnNldHNbbGVuZ3RoXSA9IHZhbHVlT2Zmc2V0c1tsZW5ndGhdIC0gc3RhcnRPZmZzZXQ7XG4gICAgICAgICAgICByZXR1cm4gZGVzdE9mZnNldHM7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZhbHVlT2Zmc2V0cztcbiAgICB9XG59XG5cbmltcG9ydCB7IGZsYXRidWZmZXJzIH0gZnJvbSAnZmxhdGJ1ZmZlcnMnO1xuaW1wb3J0IExvbmcgPSBmbGF0YnVmZmVycy5Mb25nO1xuaW1wb3J0IEJ1aWxkZXIgPSBmbGF0YnVmZmVycy5CdWlsZGVyO1xuaW1wb3J0ICogYXMgRmlsZV8gZnJvbSAnLi4vLi4vZmIvRmlsZSc7XG5pbXBvcnQgKiBhcyBTY2hlbWFfIGZyb20gJy4uLy4uL2ZiL1NjaGVtYSc7XG5pbXBvcnQgKiBhcyBNZXNzYWdlXyBmcm9tICcuLi8uLi9mYi9NZXNzYWdlJztcblxuaW1wb3J0IF9CbG9jayA9IEZpbGVfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5CbG9jaztcbmltcG9ydCBfRm9vdGVyID0gRmlsZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZvb3RlcjtcbmltcG9ydCBfRmllbGQgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaWVsZDtcbmltcG9ydCBfU2NoZW1hID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuU2NoZW1hO1xuaW1wb3J0IF9CdWZmZXIgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5CdWZmZXI7XG5pbXBvcnQgX01lc3NhZ2UgPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTWVzc2FnZTtcbmltcG9ydCBfS2V5VmFsdWUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5LZXlWYWx1ZTtcbmltcG9ydCBfRmllbGROb2RlID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpZWxkTm9kZTtcbmltcG9ydCBfUmVjb3JkQmF0Y2ggPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuUmVjb3JkQmF0Y2g7XG5pbXBvcnQgX0RpY3Rpb25hcnlCYXRjaCA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EaWN0aW9uYXJ5QmF0Y2g7XG5pbXBvcnQgX0RpY3Rpb25hcnlFbmNvZGluZyA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRpY3Rpb25hcnlFbmNvZGluZztcbmltcG9ydCBfRW5kaWFubmVzcyA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkVuZGlhbm5lc3M7XG5cbmltcG9ydCBfTnVsbCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk51bGw7XG5pbXBvcnQgX0ludCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkludDtcbmltcG9ydCBfRmxvYXRpbmdQb2ludCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZsb2F0aW5nUG9pbnQ7XG5pbXBvcnQgX0JpbmFyeSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkJpbmFyeTtcbmltcG9ydCBfQm9vbCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkJvb2w7XG5pbXBvcnQgX1V0ZjggPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5VdGY4O1xuaW1wb3J0IF9EZWNpbWFsID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGVjaW1hbDtcbmltcG9ydCBfRGF0ZSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRhdGU7XG5pbXBvcnQgX1RpbWUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UaW1lO1xuaW1wb3J0IF9UaW1lc3RhbXAgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UaW1lc3RhbXA7XG5pbXBvcnQgX0ludGVydmFsID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuSW50ZXJ2YWw7XG5pbXBvcnQgX0xpc3QgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5MaXN0O1xuaW1wb3J0IF9TdHJ1Y3QgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5TdHJ1Y3RfO1xuaW1wb3J0IF9VbmlvbiA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlVuaW9uO1xuaW1wb3J0IF9GaXhlZFNpemVCaW5hcnkgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaXhlZFNpemVCaW5hcnk7XG5pbXBvcnQgX0ZpeGVkU2l6ZUxpc3QgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaXhlZFNpemVMaXN0O1xuaW1wb3J0IF9NYXAgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NYXA7XG5cbmV4cG9ydCBjbGFzcyBUeXBlU2VyaWFsaXplciBleHRlbmRzIFR5cGVWaXNpdG9yIHtcbiAgICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgYnVpbGRlcjogQnVpbGRlcikge1xuICAgICAgICBzdXBlcigpO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXROdWxsKF9ub2RlOiBOdWxsKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfTnVsbC5zdGFydE51bGwoYikgfHxcbiAgICAgICAgICAgIF9OdWxsLmVuZE51bGwoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0SW50KG5vZGU6IEludCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0ludC5zdGFydEludChiKSB8fFxuICAgICAgICAgICAgX0ludC5hZGRCaXRXaWR0aChiLCBub2RlLmJpdFdpZHRoKSB8fFxuICAgICAgICAgICAgX0ludC5hZGRJc1NpZ25lZChiLCBub2RlLmlzU2lnbmVkKSB8fFxuICAgICAgICAgICAgX0ludC5lbmRJbnQoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0RmxvYXQobm9kZTogRmxvYXQpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9GbG9hdGluZ1BvaW50LnN0YXJ0RmxvYXRpbmdQb2ludChiKSB8fFxuICAgICAgICAgICAgX0Zsb2F0aW5nUG9pbnQuYWRkUHJlY2lzaW9uKGIsIG5vZGUucHJlY2lzaW9uKSB8fFxuICAgICAgICAgICAgX0Zsb2F0aW5nUG9pbnQuZW5kRmxvYXRpbmdQb2ludChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRCaW5hcnkoX25vZGU6IEJpbmFyeSkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0JpbmFyeS5zdGFydEJpbmFyeShiKSB8fFxuICAgICAgICAgICAgX0JpbmFyeS5lbmRCaW5hcnkoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0Qm9vbChfbm9kZTogQm9vbCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0Jvb2wuc3RhcnRCb29sKGIpIHx8XG4gICAgICAgICAgICBfQm9vbC5lbmRCb29sKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdFV0ZjgoX25vZGU6IFV0ZjgpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9VdGY4LnN0YXJ0VXRmOChiKSB8fFxuICAgICAgICAgICAgX1V0ZjguZW5kVXRmOChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXREZWNpbWFsKG5vZGU6IERlY2ltYWwpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9EZWNpbWFsLnN0YXJ0RGVjaW1hbChiKSB8fFxuICAgICAgICAgICAgX0RlY2ltYWwuYWRkU2NhbGUoYiwgbm9kZS5zY2FsZSkgfHxcbiAgICAgICAgICAgIF9EZWNpbWFsLmFkZFByZWNpc2lvbihiLCBub2RlLnByZWNpc2lvbikgfHxcbiAgICAgICAgICAgIF9EZWNpbWFsLmVuZERlY2ltYWwoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0RGF0ZShub2RlOiBEYXRlXykge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gX0RhdGUuc3RhcnREYXRlKGIpIHx8IF9EYXRlLmFkZFVuaXQoYiwgbm9kZS51bml0KSB8fCBfRGF0ZS5lbmREYXRlKGIpO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRUaW1lKG5vZGU6IFRpbWUpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9UaW1lLnN0YXJ0VGltZShiKSB8fFxuICAgICAgICAgICAgX1RpbWUuYWRkVW5pdChiLCBub2RlLnVuaXQpIHx8XG4gICAgICAgICAgICBfVGltZS5hZGRCaXRXaWR0aChiLCBub2RlLmJpdFdpZHRoKSB8fFxuICAgICAgICAgICAgX1RpbWUuZW5kVGltZShiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRUaW1lc3RhbXAobm9kZTogVGltZXN0YW1wKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIGNvbnN0IHRpbWV6b25lID0gKG5vZGUudGltZXpvbmUgJiYgYi5jcmVhdGVTdHJpbmcobm9kZS50aW1lem9uZSkpIHx8IHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9UaW1lc3RhbXAuc3RhcnRUaW1lc3RhbXAoYikgfHxcbiAgICAgICAgICAgIF9UaW1lc3RhbXAuYWRkVW5pdChiLCBub2RlLnVuaXQpIHx8XG4gICAgICAgICAgICAodGltZXpvbmUgIT09IHVuZGVmaW5lZCAmJiBfVGltZXN0YW1wLmFkZFRpbWV6b25lKGIsIHRpbWV6b25lKSkgfHxcbiAgICAgICAgICAgIF9UaW1lc3RhbXAuZW5kVGltZXN0YW1wKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdEludGVydmFsKG5vZGU6IEludGVydmFsKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfSW50ZXJ2YWwuc3RhcnRJbnRlcnZhbChiKSB8fCBfSW50ZXJ2YWwuYWRkVW5pdChiLCBub2RlLnVuaXQpIHx8IF9JbnRlcnZhbC5lbmRJbnRlcnZhbChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRMaXN0KF9ub2RlOiBMaXN0KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfTGlzdC5zdGFydExpc3QoYikgfHxcbiAgICAgICAgICAgIF9MaXN0LmVuZExpc3QoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0U3RydWN0KF9ub2RlOiBTdHJ1Y3QpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9TdHJ1Y3Quc3RhcnRTdHJ1Y3RfKGIpIHx8XG4gICAgICAgICAgICBfU3RydWN0LmVuZFN0cnVjdF8oYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0VW5pb24obm9kZTogVW5pb24pIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgY29uc3QgdHlwZUlkcyA9XG4gICAgICAgICAgICBfVW5pb24uc3RhcnRUeXBlSWRzVmVjdG9yKGIsIG5vZGUudHlwZUlkcy5sZW5ndGgpIHx8XG4gICAgICAgICAgICBfVW5pb24uY3JlYXRlVHlwZUlkc1ZlY3RvcihiLCBub2RlLnR5cGVJZHMpO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX1VuaW9uLnN0YXJ0VW5pb24oYikgfHxcbiAgICAgICAgICAgIF9Vbmlvbi5hZGRNb2RlKGIsIG5vZGUubW9kZSkgfHxcbiAgICAgICAgICAgIF9Vbmlvbi5hZGRUeXBlSWRzKGIsIHR5cGVJZHMpIHx8XG4gICAgICAgICAgICBfVW5pb24uZW5kVW5pb24oYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0RGljdGlvbmFyeShub2RlOiBEaWN0aW9uYXJ5KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIGNvbnN0IGluZGV4VHlwZSA9IHRoaXMudmlzaXQobm9kZS5pbmRpY2VzKTtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9EaWN0aW9uYXJ5RW5jb2Rpbmcuc3RhcnREaWN0aW9uYXJ5RW5jb2RpbmcoYikgfHxcbiAgICAgICAgICAgIF9EaWN0aW9uYXJ5RW5jb2RpbmcuYWRkSWQoYiwgbmV3IExvbmcobm9kZS5pZCwgMCkpIHx8XG4gICAgICAgICAgICBfRGljdGlvbmFyeUVuY29kaW5nLmFkZElzT3JkZXJlZChiLCBub2RlLmlzT3JkZXJlZCkgfHxcbiAgICAgICAgICAgIChpbmRleFR5cGUgIT09IHVuZGVmaW5lZCAmJiBfRGljdGlvbmFyeUVuY29kaW5nLmFkZEluZGV4VHlwZShiLCBpbmRleFR5cGUpKSB8fFxuICAgICAgICAgICAgX0RpY3Rpb25hcnlFbmNvZGluZy5lbmREaWN0aW9uYXJ5RW5jb2RpbmcoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0Rml4ZWRTaXplQmluYXJ5KG5vZGU6IEZpeGVkU2l6ZUJpbmFyeSkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0ZpeGVkU2l6ZUJpbmFyeS5zdGFydEZpeGVkU2l6ZUJpbmFyeShiKSB8fFxuICAgICAgICAgICAgX0ZpeGVkU2l6ZUJpbmFyeS5hZGRCeXRlV2lkdGgoYiwgbm9kZS5ieXRlV2lkdGgpIHx8XG4gICAgICAgICAgICBfRml4ZWRTaXplQmluYXJ5LmVuZEZpeGVkU2l6ZUJpbmFyeShiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRGaXhlZFNpemVMaXN0KG5vZGU6IEZpeGVkU2l6ZUxpc3QpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9GaXhlZFNpemVMaXN0LnN0YXJ0Rml4ZWRTaXplTGlzdChiKSB8fFxuICAgICAgICAgICAgX0ZpeGVkU2l6ZUxpc3QuYWRkTGlzdFNpemUoYiwgbm9kZS5saXN0U2l6ZSkgfHxcbiAgICAgICAgICAgIF9GaXhlZFNpemVMaXN0LmVuZEZpeGVkU2l6ZUxpc3QoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0TWFwKG5vZGU6IE1hcF8pIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9NYXAuc3RhcnRNYXAoYikgfHxcbiAgICAgICAgICAgIF9NYXAuYWRkS2V5c1NvcnRlZChiLCBub2RlLmtleXNTb3J0ZWQpIHx8XG4gICAgICAgICAgICBfTWFwLmVuZE1hcChiKVxuICAgICAgICApO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gY29uY2F0QnVmZmVyc1dpdGhNZXRhZGF0YSh0b3RhbEJ5dGVMZW5ndGg6IG51bWJlciwgYnVmZmVyczogVWludDhBcnJheVtdLCBidWZmZXJzTWV0YTogQnVmZmVyTWV0YWRhdGFbXSkge1xuICAgIGNvbnN0IGRhdGEgPSBuZXcgVWludDhBcnJheSh0b3RhbEJ5dGVMZW5ndGgpO1xuICAgIGZvciAobGV0IGkgPSAtMSwgbiA9IGJ1ZmZlcnMubGVuZ3RoOyArK2kgPCBuOykge1xuICAgICAgICBjb25zdCB7IG9mZnNldCwgbGVuZ3RoIH0gPSBidWZmZXJzTWV0YVtpXTtcbiAgICAgICAgY29uc3QgeyBidWZmZXIsIGJ5dGVPZmZzZXQsIGJ5dGVMZW5ndGggfSA9IGJ1ZmZlcnNbaV07XG4gICAgICAgIGNvbnN0IHJlYWxCdWZmZXJMZW5ndGggPSBNYXRoLm1pbihsZW5ndGgsIGJ5dGVMZW5ndGgpO1xuICAgICAgICBpZiAocmVhbEJ1ZmZlckxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGRhdGEuc2V0KG5ldyBVaW50OEFycmF5KGJ1ZmZlciwgYnl0ZU9mZnNldCwgcmVhbEJ1ZmZlckxlbmd0aCksIG9mZnNldCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRhdGE7XG59XG5cbmZ1bmN0aW9uIHdyaXRlRm9vdGVyKGI6IEJ1aWxkZXIsIG5vZGU6IEZvb3Rlcikge1xuICAgIGxldCBzY2hlbWFPZmZzZXQgPSB3cml0ZVNjaGVtYShiLCBub2RlLnNjaGVtYSk7XG4gICAgbGV0IHJlY29yZEJhdGNoZXMgPSAobm9kZS5yZWNvcmRCYXRjaGVzIHx8IFtdKTtcbiAgICBsZXQgZGljdGlvbmFyeUJhdGNoZXMgPSAobm9kZS5kaWN0aW9uYXJ5QmF0Y2hlcyB8fCBbXSk7XG4gICAgbGV0IHJlY29yZEJhdGNoZXNPZmZzZXQgPVxuICAgICAgICBfRm9vdGVyLnN0YXJ0UmVjb3JkQmF0Y2hlc1ZlY3RvcihiLCByZWNvcmRCYXRjaGVzLmxlbmd0aCkgfHxcbiAgICAgICAgICAgIG1hcFJldmVyc2UocmVjb3JkQmF0Y2hlcywgKHJiKSA9PiB3cml0ZUJsb2NrKGIsIHJiKSkgJiZcbiAgICAgICAgYi5lbmRWZWN0b3IoKTtcblxuICAgIGxldCBkaWN0aW9uYXJ5QmF0Y2hlc09mZnNldCA9XG4gICAgICAgIF9Gb290ZXIuc3RhcnREaWN0aW9uYXJpZXNWZWN0b3IoYiwgZGljdGlvbmFyeUJhdGNoZXMubGVuZ3RoKSB8fFxuICAgICAgICAgICAgbWFwUmV2ZXJzZShkaWN0aW9uYXJ5QmF0Y2hlcywgKGRiKSA9PiB3cml0ZUJsb2NrKGIsIGRiKSkgJiZcbiAgICAgICAgYi5lbmRWZWN0b3IoKTtcblxuICAgIHJldHVybiAoXG4gICAgICAgIF9Gb290ZXIuc3RhcnRGb290ZXIoYikgfHxcbiAgICAgICAgX0Zvb3Rlci5hZGRTY2hlbWEoYiwgc2NoZW1hT2Zmc2V0KSB8fFxuICAgICAgICBfRm9vdGVyLmFkZFZlcnNpb24oYiwgbm9kZS5zY2hlbWEudmVyc2lvbikgfHxcbiAgICAgICAgX0Zvb3Rlci5hZGRSZWNvcmRCYXRjaGVzKGIsIHJlY29yZEJhdGNoZXNPZmZzZXQpIHx8XG4gICAgICAgIF9Gb290ZXIuYWRkRGljdGlvbmFyaWVzKGIsIGRpY3Rpb25hcnlCYXRjaGVzT2Zmc2V0KSB8fFxuICAgICAgICBfRm9vdGVyLmVuZEZvb3RlcihiKVxuICAgICk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlQmxvY2soYjogQnVpbGRlciwgbm9kZTogRmlsZUJsb2NrKSB7XG4gICAgcmV0dXJuIF9CbG9jay5jcmVhdGVCbG9jayhiLFxuICAgICAgICBuZXcgTG9uZyhub2RlLm9mZnNldCwgMCksXG4gICAgICAgIG5vZGUubWV0YURhdGFMZW5ndGgsXG4gICAgICAgIG5ldyBMb25nKG5vZGUuYm9keUxlbmd0aCwgMClcbiAgICApO1xufVxuXG5mdW5jdGlvbiB3cml0ZU1lc3NhZ2UoYjogQnVpbGRlciwgbm9kZTogTWVzc2FnZSkge1xuICAgIGxldCBtZXNzYWdlSGVhZGVyT2Zmc2V0ID0gMDtcbiAgICBpZiAoTWVzc2FnZS5pc1NjaGVtYShub2RlKSkge1xuICAgICAgICBtZXNzYWdlSGVhZGVyT2Zmc2V0ID0gd3JpdGVTY2hlbWEoYiwgbm9kZSBhcyBTY2hlbWEpO1xuICAgIH0gZWxzZSBpZiAoTWVzc2FnZS5pc1JlY29yZEJhdGNoKG5vZGUpKSB7XG4gICAgICAgIG1lc3NhZ2VIZWFkZXJPZmZzZXQgPSB3cml0ZVJlY29yZEJhdGNoKGIsIG5vZGUgYXMgUmVjb3JkQmF0Y2hNZXRhZGF0YSk7XG4gICAgfSBlbHNlIGlmIChNZXNzYWdlLmlzRGljdGlvbmFyeUJhdGNoKG5vZGUpKSB7XG4gICAgICAgIG1lc3NhZ2VIZWFkZXJPZmZzZXQgPSB3cml0ZURpY3Rpb25hcnlCYXRjaChiLCBub2RlIGFzIERpY3Rpb25hcnlCYXRjaCk7XG4gICAgfVxuICAgIHJldHVybiAoXG4gICAgICAgIF9NZXNzYWdlLnN0YXJ0TWVzc2FnZShiKSB8fFxuICAgICAgICBfTWVzc2FnZS5hZGRWZXJzaW9uKGIsIG5vZGUudmVyc2lvbikgfHxcbiAgICAgICAgX01lc3NhZ2UuYWRkSGVhZGVyKGIsIG1lc3NhZ2VIZWFkZXJPZmZzZXQpIHx8XG4gICAgICAgIF9NZXNzYWdlLmFkZEhlYWRlclR5cGUoYiwgbm9kZS5oZWFkZXJUeXBlKSB8fFxuICAgICAgICBfTWVzc2FnZS5hZGRCb2R5TGVuZ3RoKGIsIG5ldyBMb25nKG5vZGUuYm9keUxlbmd0aCwgMCkpIHx8XG4gICAgICAgIF9NZXNzYWdlLmVuZE1lc3NhZ2UoYilcbiAgICApO1xufVxuXG5mdW5jdGlvbiB3cml0ZVNjaGVtYShiOiBCdWlsZGVyLCBub2RlOiBTY2hlbWEpIHtcbiAgICBjb25zdCBmaWVsZE9mZnNldHMgPSBub2RlLmZpZWxkcy5tYXAoKGYpID0+IHdyaXRlRmllbGQoYiwgZikpO1xuICAgIGNvbnN0IGZpZWxkc09mZnNldCA9XG4gICAgICAgIF9TY2hlbWEuc3RhcnRGaWVsZHNWZWN0b3IoYiwgZmllbGRPZmZzZXRzLmxlbmd0aCkgfHxcbiAgICAgICAgX1NjaGVtYS5jcmVhdGVGaWVsZHNWZWN0b3IoYiwgZmllbGRPZmZzZXRzKTtcbiAgICByZXR1cm4gKFxuICAgICAgICBfU2NoZW1hLnN0YXJ0U2NoZW1hKGIpIHx8XG4gICAgICAgIF9TY2hlbWEuYWRkRmllbGRzKGIsIGZpZWxkc09mZnNldCkgfHxcbiAgICAgICAgX1NjaGVtYS5hZGRFbmRpYW5uZXNzKGIsIHBsYXRmb3JtSXNMaXR0bGVFbmRpYW4gPyBfRW5kaWFubmVzcy5MaXR0bGUgOiBfRW5kaWFubmVzcy5CaWcpIHx8XG4gICAgICAgIF9TY2hlbWEuZW5kU2NoZW1hKGIpXG4gICAgKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVSZWNvcmRCYXRjaChiOiBCdWlsZGVyLCBub2RlOiBSZWNvcmRCYXRjaE1ldGFkYXRhKSB7XG4gICAgbGV0IG5vZGVzID0gKG5vZGUubm9kZXMgfHwgW10pO1xuICAgIGxldCBidWZmZXJzID0gKG5vZGUuYnVmZmVycyB8fCBbXSk7XG4gICAgbGV0IG5vZGVzT2Zmc2V0ID1cbiAgICAgICAgX1JlY29yZEJhdGNoLnN0YXJ0Tm9kZXNWZWN0b3IoYiwgbm9kZXMubGVuZ3RoKSB8fFxuICAgICAgICBtYXBSZXZlcnNlKG5vZGVzLCAobikgPT4gd3JpdGVGaWVsZE5vZGUoYiwgbikpICYmXG4gICAgICAgIGIuZW5kVmVjdG9yKCk7XG5cbiAgICBsZXQgYnVmZmVyc09mZnNldCA9XG4gICAgICAgIF9SZWNvcmRCYXRjaC5zdGFydEJ1ZmZlcnNWZWN0b3IoYiwgYnVmZmVycy5sZW5ndGgpIHx8XG4gICAgICAgIG1hcFJldmVyc2UoYnVmZmVycywgKGJfKSA9PiB3cml0ZUJ1ZmZlcihiLCBiXykpICYmXG4gICAgICAgIGIuZW5kVmVjdG9yKCk7XG5cbiAgICByZXR1cm4gKFxuICAgICAgICBfUmVjb3JkQmF0Y2guc3RhcnRSZWNvcmRCYXRjaChiKSB8fFxuICAgICAgICBfUmVjb3JkQmF0Y2guYWRkTGVuZ3RoKGIsIG5ldyBMb25nKG5vZGUubGVuZ3RoLCAwKSkgfHxcbiAgICAgICAgX1JlY29yZEJhdGNoLmFkZE5vZGVzKGIsIG5vZGVzT2Zmc2V0KSB8fFxuICAgICAgICBfUmVjb3JkQmF0Y2guYWRkQnVmZmVycyhiLCBidWZmZXJzT2Zmc2V0KSB8fFxuICAgICAgICBfUmVjb3JkQmF0Y2guZW5kUmVjb3JkQmF0Y2goYilcbiAgICApO1xufVxuXG5mdW5jdGlvbiB3cml0ZURpY3Rpb25hcnlCYXRjaChiOiBCdWlsZGVyLCBub2RlOiBEaWN0aW9uYXJ5QmF0Y2gpIHtcbiAgICBjb25zdCBkYXRhT2Zmc2V0ID0gd3JpdGVSZWNvcmRCYXRjaChiLCBub2RlLmRhdGEpO1xuICAgIHJldHVybiAoXG4gICAgICAgIF9EaWN0aW9uYXJ5QmF0Y2guc3RhcnREaWN0aW9uYXJ5QmF0Y2goYikgfHxcbiAgICAgICAgX0RpY3Rpb25hcnlCYXRjaC5hZGRJZChiLCBuZXcgTG9uZyhub2RlLmlkLCAwKSkgfHxcbiAgICAgICAgX0RpY3Rpb25hcnlCYXRjaC5hZGRJc0RlbHRhKGIsIG5vZGUuaXNEZWx0YSkgfHxcbiAgICAgICAgX0RpY3Rpb25hcnlCYXRjaC5hZGREYXRhKGIsIGRhdGFPZmZzZXQpIHx8XG4gICAgICAgIF9EaWN0aW9uYXJ5QmF0Y2guZW5kRGljdGlvbmFyeUJhdGNoKGIpXG4gICAgKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVCdWZmZXIoYjogQnVpbGRlciwgbm9kZTogQnVmZmVyTWV0YWRhdGEpIHtcbiAgICByZXR1cm4gX0J1ZmZlci5jcmVhdGVCdWZmZXIoYiwgbmV3IExvbmcobm9kZS5vZmZzZXQsIDApLCBuZXcgTG9uZyhub2RlLmxlbmd0aCwgMCkpO1xufVxuXG5mdW5jdGlvbiB3cml0ZUZpZWxkTm9kZShiOiBCdWlsZGVyLCBub2RlOiBGaWVsZE1ldGFkYXRhKSB7XG4gICAgcmV0dXJuIF9GaWVsZE5vZGUuY3JlYXRlRmllbGROb2RlKGIsIG5ldyBMb25nKG5vZGUubGVuZ3RoLCAwKSwgbmV3IExvbmcobm9kZS5udWxsQ291bnQsIDApKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVGaWVsZChiOiBCdWlsZGVyLCBub2RlOiBGaWVsZCkge1xuICAgIGxldCB0eXBlT2Zmc2V0ID0gLTE7XG4gICAgbGV0IHR5cGUgPSBub2RlLnR5cGU7XG4gICAgbGV0IHR5cGVJZCA9IG5vZGUudHlwZUlkO1xuICAgIGxldCBuYW1lOiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgbGV0IG1ldGFkYXRhOiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgbGV0IGRpY3Rpb25hcnk6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICAgIGlmICghRGF0YVR5cGUuaXNEaWN0aW9uYXJ5KHR5cGUpKSB7XG4gICAgICAgIHR5cGVPZmZzZXQgPSBuZXcgVHlwZVNlcmlhbGl6ZXIoYikudmlzaXQodHlwZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdHlwZUlkID0gdHlwZS5kaWN0aW9uYXJ5LlRUeXBlO1xuICAgICAgICBkaWN0aW9uYXJ5ID0gbmV3IFR5cGVTZXJpYWxpemVyKGIpLnZpc2l0KHR5cGUpO1xuICAgICAgICB0eXBlT2Zmc2V0ID0gbmV3IFR5cGVTZXJpYWxpemVyKGIpLnZpc2l0KHR5cGUuZGljdGlvbmFyeSk7XG4gICAgfVxuXG4gICAgbGV0IGNoaWxkcmVuID0gX0ZpZWxkLmNyZWF0ZUNoaWxkcmVuVmVjdG9yKGIsICh0eXBlLmNoaWxkcmVuIHx8IFtdKS5tYXAoKGYpID0+IHdyaXRlRmllbGQoYiwgZikpKTtcbiAgICBpZiAobm9kZS5tZXRhZGF0YSAmJiBub2RlLm1ldGFkYXRhLnNpemUgPiAwKSB7XG4gICAgICAgIG1ldGFkYXRhID0gX0ZpZWxkLmNyZWF0ZUN1c3RvbU1ldGFkYXRhVmVjdG9yKFxuICAgICAgICAgICAgYixcbiAgICAgICAgICAgIFsuLi5ub2RlLm1ldGFkYXRhXS5tYXAoKFtrLCB2XSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGIuY3JlYXRlU3RyaW5nKGspO1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IGIuY3JlYXRlU3RyaW5nKHYpO1xuICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICAgIF9LZXlWYWx1ZS5zdGFydEtleVZhbHVlKGIpIHx8XG4gICAgICAgICAgICAgICAgICAgIF9LZXlWYWx1ZS5hZGRLZXkoYiwga2V5KSB8fFxuICAgICAgICAgICAgICAgICAgICBfS2V5VmFsdWUuYWRkVmFsdWUoYiwgdmFsKSB8fFxuICAgICAgICAgICAgICAgICAgICBfS2V5VmFsdWUuZW5kS2V5VmFsdWUoYilcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG4gICAgaWYgKG5vZGUubmFtZSkge1xuICAgICAgICBuYW1lID0gYi5jcmVhdGVTdHJpbmcobm9kZS5uYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIChcbiAgICAgICAgX0ZpZWxkLnN0YXJ0RmllbGQoYikgfHxcbiAgICAgICAgX0ZpZWxkLmFkZFR5cGUoYiwgdHlwZU9mZnNldCkgfHxcbiAgICAgICAgX0ZpZWxkLmFkZFR5cGVUeXBlKGIsIHR5cGVJZCkgfHxcbiAgICAgICAgX0ZpZWxkLmFkZENoaWxkcmVuKGIsIGNoaWxkcmVuKSB8fFxuICAgICAgICBfRmllbGQuYWRkTnVsbGFibGUoYiwgISFub2RlLm51bGxhYmxlKSB8fFxuICAgICAgICAobmFtZSAhPT0gdW5kZWZpbmVkICYmIF9GaWVsZC5hZGROYW1lKGIsIG5hbWUpKSB8fFxuICAgICAgICAoZGljdGlvbmFyeSAhPT0gdW5kZWZpbmVkICYmIF9GaWVsZC5hZGREaWN0aW9uYXJ5KGIsIGRpY3Rpb25hcnkpKSB8fFxuICAgICAgICAobWV0YWRhdGEgIT09IHVuZGVmaW5lZCAmJiBfRmllbGQuYWRkQ3VzdG9tTWV0YWRhdGEoYiwgbWV0YWRhdGEpKSB8fFxuICAgICAgICBfRmllbGQuZW5kRmllbGQoYilcbiAgICApO1xufVxuXG5mdW5jdGlvbiBtYXBSZXZlcnNlPFQsIFU+KHNvdXJjZTogVFtdLCBjYWxsYmFja2ZuOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IFUpOiBVW10ge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBBcnJheShzb3VyY2UubGVuZ3RoKTtcbiAgICBmb3IgKGxldCBpID0gLTEsIGogPSBzb3VyY2UubGVuZ3RoOyAtLWogPiAtMTspIHtcbiAgICAgICAgcmVzdWx0W2ldID0gY2FsbGJhY2tmbihzb3VyY2Vbal0sIGksIHNvdXJjZSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbmNvbnN0IHBsYXRmb3JtSXNMaXR0bGVFbmRpYW4gPSAoZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKDIpO1xuICAgIG5ldyBEYXRhVmlldyhidWZmZXIpLnNldEludDE2KDAsIDI1NiwgdHJ1ZSAvKiBsaXR0bGVFbmRpYW4gKi8pO1xuICAgIC8vIEludDE2QXJyYXkgdXNlcyB0aGUgcGxhdGZvcm0ncyBlbmRpYW5uZXNzLlxuICAgIHJldHVybiBuZXcgSW50MTZBcnJheShidWZmZXIpWzBdID09PSAyNTY7XG59KSgpO1xuIl19

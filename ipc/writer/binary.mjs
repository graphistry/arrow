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
export class RecordBatchSerializer extends VectorVisitor {
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
        const byteLength = align(values.byteLength, 8);
        this.buffers.push(values);
        this.buffersMeta.push(new BufferMetadata(this.byteLength, byteLength));
        this.byteLength += byteLength;
        return this;
    }
    getTruncatedBitmap(offset, length, bitmap) {
        const alignedLength = align(bitmap.byteLength, 8);
        if (offset > 0 || bitmap.byteLength < alignedLength) {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRztRQUMzQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7S0FDaEQ7SUFDRCxPQUFPLE1BQU0sQ0FBQztBQUNsQixDQUFDO0FBRUQsTUFBTSxzQkFBc0IsR0FBRyxDQUFDO0lBQzVCLE1BQU0sTUFBTSxHQUFHLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xDLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQy9ELDZDQUE2QztJQUM3QyxPQUFPLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQztBQUM3QyxDQUFDLENBQUMsRUFBRSxDQUFDIiwiZmlsZSI6ImlwYy93cml0ZXIvYmluYXJ5LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IFRhYmxlIH0gZnJvbSAnLi4vLi4vdGFibGUnO1xuaW1wb3J0IHsgRGVuc2VVbmlvbkRhdGEgfSBmcm9tICcuLi8uLi9kYXRhJztcbmltcG9ydCB7IFJlY29yZEJhdGNoIH0gZnJvbSAnLi4vLi4vcmVjb3JkYmF0Y2gnO1xuaW1wb3J0IHsgVmVjdG9yVmlzaXRvciwgVHlwZVZpc2l0b3IgfSBmcm9tICcuLi8uLi92aXNpdG9yJztcbmltcG9ydCB7IE1BR0lDLCBtYWdpY0xlbmd0aCwgbWFnaWNBbmRQYWRkaW5nLCBQQURESU5HIH0gZnJvbSAnLi4vbWFnaWMnO1xuaW1wb3J0IHsgYWxpZ24sIGdldEJvb2wsIHBhY2tCb29scywgaXRlcmF0ZUJpdHMgfSBmcm9tICcuLi8uLi91dGlsL2JpdCc7XG5pbXBvcnQgeyBWZWN0b3IsIFVuaW9uVmVjdG9yLCBEaWN0aW9uYXJ5VmVjdG9yLCBOZXN0ZWRWZWN0b3IsIExpc3RWZWN0b3IgfSBmcm9tICcuLi8uLi92ZWN0b3InO1xuaW1wb3J0IHsgQnVmZmVyTWV0YWRhdGEsIEZpZWxkTWV0YWRhdGEsIEZvb3RlciwgRmlsZUJsb2NrLCBNZXNzYWdlLCBSZWNvcmRCYXRjaE1ldGFkYXRhLCBEaWN0aW9uYXJ5QmF0Y2ggfSBmcm9tICcuLi9tZXRhZGF0YSc7XG5pbXBvcnQge1xuICAgIFNjaGVtYSwgRmllbGQsIFR5cGVkQXJyYXksIE1ldGFkYXRhVmVyc2lvbixcbiAgICBEYXRhVHlwZSxcbiAgICBEaWN0aW9uYXJ5LFxuICAgIE51bGwsIEludCwgRmxvYXQsXG4gICAgQmluYXJ5LCBCb29sLCBVdGY4LCBEZWNpbWFsLFxuICAgIERhdGVfLCBUaW1lLCBUaW1lc3RhbXAsIEludGVydmFsLFxuICAgIExpc3QsIFN0cnVjdCwgVW5pb24sIEZpeGVkU2l6ZUJpbmFyeSwgRml4ZWRTaXplTGlzdCwgTWFwXyxcbiAgICBGbGF0VHlwZSwgRmxhdExpc3RUeXBlLCBOZXN0ZWRUeXBlLCBVbmlvbk1vZGUsIFNwYXJzZVVuaW9uLCBEZW5zZVVuaW9uLCBTaW5nbGVOZXN0ZWRUeXBlLFxufSBmcm9tICcuLi8uLi90eXBlJztcblxuZXhwb3J0IGZ1bmN0aW9uKiBzZXJpYWxpemVTdHJlYW0odGFibGU6IFRhYmxlKSB7XG4gICAgeWllbGQgc2VyaWFsaXplTWVzc2FnZSh0YWJsZS5zY2hlbWEpLmJ1ZmZlcjtcbiAgICBmb3IgKGNvbnN0IFtpZCwgZmllbGRdIG9mIHRhYmxlLnNjaGVtYS5kaWN0aW9uYXJpZXMpIHtcbiAgICAgICAgY29uc3QgdmVjID0gdGFibGUuZ2V0Q29sdW1uKGZpZWxkLm5hbWUpIGFzIERpY3Rpb25hcnlWZWN0b3I7XG4gICAgICAgIGlmICh2ZWMgJiYgdmVjLmRpY3Rpb25hcnkpIHtcbiAgICAgICAgICAgIHlpZWxkIHNlcmlhbGl6ZURpY3Rpb25hcnlCYXRjaCh2ZWMuZGljdGlvbmFyeSwgaWQpLmJ1ZmZlcjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IHJlY29yZEJhdGNoIG9mIHRhYmxlLmJhdGNoZXMpIHtcbiAgICAgICAgeWllbGQgc2VyaWFsaXplUmVjb3JkQmF0Y2gocmVjb3JkQmF0Y2gpLmJ1ZmZlcjtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiogc2VyaWFsaXplRmlsZSh0YWJsZTogVGFibGUpIHtcblxuICAgIGNvbnN0IHJlY29yZEJhdGNoZXMgPSBbXTtcbiAgICBjb25zdCBkaWN0aW9uYXJ5QmF0Y2hlcyA9IFtdO1xuXG4gICAgLy8gRmlyc3QgeWllbGQgdGhlIG1hZ2ljIHN0cmluZyAoYWxpZ25lZClcbiAgICBsZXQgYnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkoYWxpZ24obWFnaWNMZW5ndGgsIDgpKTtcbiAgICBsZXQgbWV0YWRhdGFMZW5ndGgsIGJ5dGVMZW5ndGggPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICBidWZmZXIuc2V0KE1BR0lDLCAwKTtcbiAgICB5aWVsZCBidWZmZXI7XG5cbiAgICAvLyBUaGVuIHlpZWxkIHRoZSBzY2hlbWFcbiAgICAoeyBtZXRhZGF0YUxlbmd0aCwgYnVmZmVyIH0gPSBzZXJpYWxpemVNZXNzYWdlKHRhYmxlLnNjaGVtYSkpO1xuICAgIGJ5dGVMZW5ndGggKz0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgeWllbGQgYnVmZmVyO1xuXG4gICAgZm9yIChjb25zdCBbaWQsIGZpZWxkXSBvZiB0YWJsZS5zY2hlbWEuZGljdGlvbmFyaWVzKSB7XG4gICAgICAgIGNvbnN0IHZlYyA9IHRhYmxlLmdldENvbHVtbihmaWVsZC5uYW1lKSBhcyBEaWN0aW9uYXJ5VmVjdG9yO1xuICAgICAgICBpZiAodmVjICYmIHZlYy5kaWN0aW9uYXJ5KSB7XG4gICAgICAgICAgICAoeyBtZXRhZGF0YUxlbmd0aCwgYnVmZmVyIH0gPSBzZXJpYWxpemVEaWN0aW9uYXJ5QmF0Y2godmVjLmRpY3Rpb25hcnksIGlkKSk7XG4gICAgICAgICAgICBkaWN0aW9uYXJ5QmF0Y2hlcy5wdXNoKG5ldyBGaWxlQmxvY2sobWV0YWRhdGFMZW5ndGgsIGJ1ZmZlci5ieXRlTGVuZ3RoLCBieXRlTGVuZ3RoKSk7XG4gICAgICAgICAgICBieXRlTGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICAgICAgeWllbGQgYnVmZmVyO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgcmVjb3JkQmF0Y2ggb2YgdGFibGUuYmF0Y2hlcykge1xuICAgICAgICAoeyBtZXRhZGF0YUxlbmd0aCwgYnVmZmVyIH0gPSBzZXJpYWxpemVSZWNvcmRCYXRjaChyZWNvcmRCYXRjaCkpO1xuICAgICAgICByZWNvcmRCYXRjaGVzLnB1c2gobmV3IEZpbGVCbG9jayhtZXRhZGF0YUxlbmd0aCwgYnVmZmVyLmJ5dGVMZW5ndGgsIGJ5dGVMZW5ndGgpKTtcbiAgICAgICAgYnl0ZUxlbmd0aCArPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgeWllbGQgYnVmZmVyO1xuICAgIH1cblxuICAgIC8vIFRoZW4geWllbGQgdGhlIGZvb3RlciBtZXRhZGF0YSAobm90IGFsaWduZWQpXG4gICAgKHsgbWV0YWRhdGFMZW5ndGgsIGJ1ZmZlciB9ID0gc2VyaWFsaXplRm9vdGVyKG5ldyBGb290ZXIoZGljdGlvbmFyeUJhdGNoZXMsIHJlY29yZEJhdGNoZXMsIHRhYmxlLnNjaGVtYSkpKTtcbiAgICB5aWVsZCBidWZmZXI7XG4gICAgXG4gICAgLy8gTGFzdCwgeWllbGQgdGhlIGZvb3RlciBsZW5ndGggKyB0ZXJtaW5hdGluZyBtYWdpYyBhcnJvdyBzdHJpbmcgKGFsaWduZWQpXG4gICAgYnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkobWFnaWNBbmRQYWRkaW5nKTtcbiAgICBuZXcgRGF0YVZpZXcoYnVmZmVyLmJ1ZmZlcikuc2V0SW50MzIoMCwgbWV0YWRhdGFMZW5ndGgsIHBsYXRmb3JtSXNMaXR0bGVFbmRpYW4pO1xuICAgIGJ1ZmZlci5zZXQoTUFHSUMsIGJ1ZmZlci5ieXRlTGVuZ3RoIC0gbWFnaWNMZW5ndGgpO1xuICAgIHlpZWxkIGJ1ZmZlcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZVJlY29yZEJhdGNoKHJlY29yZEJhdGNoOiBSZWNvcmRCYXRjaCkge1xuICAgIGNvbnN0IHsgYnl0ZUxlbmd0aCwgZmllbGROb2RlcywgYnVmZmVycywgYnVmZmVyc01ldGEgfSA9IG5ldyBSZWNvcmRCYXRjaFNlcmlhbGl6ZXIoKS52aXNpdFJlY29yZEJhdGNoKHJlY29yZEJhdGNoKTtcbiAgICBjb25zdCByYk1ldGEgPSBuZXcgUmVjb3JkQmF0Y2hNZXRhZGF0YShNZXRhZGF0YVZlcnNpb24uVjQsIHJlY29yZEJhdGNoLmxlbmd0aCwgZmllbGROb2RlcywgYnVmZmVyc01ldGEpO1xuICAgIGNvbnN0IHJiRGF0YSA9IGNvbmNhdEJ1ZmZlcnNXaXRoTWV0YWRhdGEoYnl0ZUxlbmd0aCwgYnVmZmVycywgYnVmZmVyc01ldGEpO1xuICAgIHJldHVybiBzZXJpYWxpemVNZXNzYWdlKHJiTWV0YSwgcmJEYXRhKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZURpY3Rpb25hcnlCYXRjaChkaWN0aW9uYXJ5OiBWZWN0b3IsIGlkOiBMb25nIHwgbnVtYmVyLCBpc0RlbHRhOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICBjb25zdCB7IGJ5dGVMZW5ndGgsIGZpZWxkTm9kZXMsIGJ1ZmZlcnMsIGJ1ZmZlcnNNZXRhIH0gPSBuZXcgUmVjb3JkQmF0Y2hTZXJpYWxpemVyKCkudmlzaXRSZWNvcmRCYXRjaChSZWNvcmRCYXRjaC5mcm9tKFtkaWN0aW9uYXJ5XSkpO1xuICAgIGNvbnN0IHJiTWV0YSA9IG5ldyBSZWNvcmRCYXRjaE1ldGFkYXRhKE1ldGFkYXRhVmVyc2lvbi5WNCwgZGljdGlvbmFyeS5sZW5ndGgsIGZpZWxkTm9kZXMsIGJ1ZmZlcnNNZXRhKTtcbiAgICBjb25zdCBkYk1ldGEgPSBuZXcgRGljdGlvbmFyeUJhdGNoKE1ldGFkYXRhVmVyc2lvbi5WNCwgcmJNZXRhLCBpZCwgaXNEZWx0YSk7XG4gICAgY29uc3QgcmJEYXRhID0gY29uY2F0QnVmZmVyc1dpdGhNZXRhZGF0YShieXRlTGVuZ3RoLCBidWZmZXJzLCBidWZmZXJzTWV0YSk7XG4gICAgcmV0dXJuIHNlcmlhbGl6ZU1lc3NhZ2UoZGJNZXRhLCByYkRhdGEpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VyaWFsaXplTWVzc2FnZShtZXNzYWdlOiBNZXNzYWdlLCBkYXRhPzogVWludDhBcnJheSkge1xuICAgIGNvbnN0IGIgPSBuZXcgQnVpbGRlcigpO1xuICAgIF9NZXNzYWdlLmZpbmlzaE1lc3NhZ2VCdWZmZXIoYiwgd3JpdGVNZXNzYWdlKGIsIG1lc3NhZ2UpKTtcbiAgICAvLyBTbGljZSBvdXQgdGhlIGJ1ZmZlciB0aGF0IGNvbnRhaW5zIHRoZSBtZXNzYWdlIG1ldGFkYXRhXG4gICAgY29uc3QgbWV0YWRhdGFCeXRlcyA9IGIuYXNVaW50OEFycmF5KCk7XG4gICAgLy8gUmVzZXJ2ZSA0IGJ5dGVzIGZvciB3cml0aW5nIHRoZSBtZXNzYWdlIHNpemUgYXQgdGhlIGZyb250LlxuICAgIC8vIE1ldGFkYXRhIGxlbmd0aCBpbmNsdWRlcyB0aGUgbWV0YWRhdGEgYnl0ZUxlbmd0aCArIHRoZSA0XG4gICAgLy8gYnl0ZXMgZm9yIHRoZSBsZW5ndGgsIGFuZCByb3VuZGVkIHVwIHRvIHRoZSBuZWFyZXN0IDggYnl0ZXMuXG4gICAgY29uc3QgbWV0YWRhdGFMZW5ndGggPSBhbGlnbihQQURESU5HICsgbWV0YWRhdGFCeXRlcy5ieXRlTGVuZ3RoLCA4KTtcbiAgICAvLyArIHRoZSBsZW5ndGggb2YgdGhlIG9wdGlvbmFsIGRhdGEgYnVmZmVyIGF0IHRoZSBlbmQsIHBhZGRlZFxuICAgIGNvbnN0IGRhdGFCeXRlTGVuZ3RoID0gZGF0YSA/IGRhdGEuYnl0ZUxlbmd0aCA6IDA7XG4gICAgLy8gZW5zdXJlIHRoZSBlbnRpcmUgbWVzc2FnZSBpcyBhbGlnbmVkIHRvIGFuIDgtYnl0ZSBib3VuZGFyeVxuICAgIGNvbnN0IG1lc3NhZ2VCeXRlcyA9IG5ldyBVaW50OEFycmF5KGFsaWduKG1ldGFkYXRhTGVuZ3RoICsgZGF0YUJ5dGVMZW5ndGgsIDgpKTtcbiAgICAvLyBXcml0ZSB0aGUgbWV0YWRhdGEgbGVuZ3RoIGludG8gdGhlIGZpcnN0IDQgYnl0ZXMsIGJ1dCBzdWJ0cmFjdCB0aGVcbiAgICAvLyBieXRlcyB3ZSB1c2UgdG8gaG9sZCB0aGUgbGVuZ3RoIGl0c2VsZi5cbiAgICBuZXcgRGF0YVZpZXcobWVzc2FnZUJ5dGVzLmJ1ZmZlcikuc2V0SW50MzIoMCwgbWV0YWRhdGFMZW5ndGggLSBQQURESU5HLCBwbGF0Zm9ybUlzTGl0dGxlRW5kaWFuKTtcbiAgICAvLyBDb3B5IHRoZSBtZXRhZGF0YSBieXRlcyBpbnRvIHRoZSBtZXNzYWdlIGJ1ZmZlclxuICAgIG1lc3NhZ2VCeXRlcy5zZXQobWV0YWRhdGFCeXRlcywgUEFERElORyk7XG4gICAgLy8gQ29weSB0aGUgb3B0aW9uYWwgZGF0YSBidWZmZXIgYWZ0ZXIgdGhlIG1ldGFkYXRhIGJ5dGVzXG4gICAgKGRhdGEgJiYgZGF0YUJ5dGVMZW5ndGggPiAwKSAmJiBtZXNzYWdlQnl0ZXMuc2V0KGRhdGEsIG1ldGFkYXRhTGVuZ3RoKTtcbiAgICAvLyBpZiAobWVzc2FnZUJ5dGVzLmJ5dGVMZW5ndGggJSA4ICE9PSAwKSB7IGRlYnVnZ2VyOyB9XG4gICAgLy8gUmV0dXJuIHRoZSBtZXRhZGF0YSBsZW5ndGggYmVjYXVzZSB3ZSBuZWVkIHRvIHdyaXRlIGl0IGludG8gZWFjaCBGaWxlQmxvY2sgYWxzb1xuICAgIHJldHVybiB7IG1ldGFkYXRhTGVuZ3RoLCBidWZmZXI6IG1lc3NhZ2VCeXRlcyB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VyaWFsaXplRm9vdGVyKGZvb3RlcjogRm9vdGVyKSB7XG4gICAgY29uc3QgYiA9IG5ldyBCdWlsZGVyKCk7XG4gICAgX0Zvb3Rlci5maW5pc2hGb290ZXJCdWZmZXIoYiwgd3JpdGVGb290ZXIoYiwgZm9vdGVyKSk7XG4gICAgLy8gU2xpY2Ugb3V0IHRoZSBidWZmZXIgdGhhdCBjb250YWlucyB0aGUgZm9vdGVyIG1ldGFkYXRhXG4gICAgY29uc3QgZm9vdGVyQnl0ZXMgPSBiLmFzVWludDhBcnJheSgpO1xuICAgIGNvbnN0IG1ldGFkYXRhTGVuZ3RoID0gZm9vdGVyQnl0ZXMuYnl0ZUxlbmd0aDtcbiAgICByZXR1cm4geyBtZXRhZGF0YUxlbmd0aCwgYnVmZmVyOiBmb290ZXJCeXRlcyB9O1xufVxuXG5leHBvcnQgY2xhc3MgUmVjb3JkQmF0Y2hTZXJpYWxpemVyIGV4dGVuZHMgVmVjdG9yVmlzaXRvciB7XG4gICAgcHVibGljIGJ5dGVMZW5ndGggPSAwO1xuICAgIHB1YmxpYyBidWZmZXJzOiBUeXBlZEFycmF5W10gPSBbXTtcbiAgICBwdWJsaWMgZmllbGROb2RlczogRmllbGRNZXRhZGF0YVtdID0gW107XG4gICAgcHVibGljIGJ1ZmZlcnNNZXRhOiBCdWZmZXJNZXRhZGF0YVtdID0gW107XG4gICAgcHVibGljIHZpc2l0UmVjb3JkQmF0Y2gocmVjb3JkQmF0Y2g6IFJlY29yZEJhdGNoKSB7XG4gICAgICAgIHRoaXMuYnVmZmVycyA9IFtdO1xuICAgICAgICB0aGlzLmJ5dGVMZW5ndGggPSAwO1xuICAgICAgICB0aGlzLmZpZWxkTm9kZXMgPSBbXTtcbiAgICAgICAgdGhpcy5idWZmZXJzTWV0YSA9IFtdO1xuICAgICAgICBmb3IgKGxldCB2ZWN0b3I6IFZlY3RvciwgaW5kZXggPSAtMSwgbnVtQ29scyA9IHJlY29yZEJhdGNoLm51bUNvbHM7ICsraW5kZXggPCBudW1Db2xzOykge1xuICAgICAgICAgICAgaWYgKHZlY3RvciA9IHJlY29yZEJhdGNoLmdldENoaWxkQXQoaW5kZXgpISkge1xuICAgICAgICAgICAgICAgIHRoaXMudmlzaXQodmVjdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHVibGljIHZpc2l0PFQgZXh0ZW5kcyBEYXRhVHlwZT4odmVjdG9yOiBWZWN0b3I8VD4pIHtcbiAgICAgICAgaWYgKCFEYXRhVHlwZS5pc0RpY3Rpb25hcnkodmVjdG9yLnR5cGUpKSB7XG4gICAgICAgICAgICBjb25zdCB7IGRhdGEsIGxlbmd0aCwgbnVsbENvdW50IH0gPSB2ZWN0b3I7XG4gICAgICAgICAgICBpZiAobGVuZ3RoID4gMjE0NzQ4MzY0Nykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdDYW5ub3Qgd3JpdGUgYXJyYXlzIGxhcmdlciB0aGFuIDJeMzEgLSAxIGluIGxlbmd0aCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5maWVsZE5vZGVzLnB1c2gobmV3IEZpZWxkTWV0YWRhdGEobGVuZ3RoLCBudWxsQ291bnQpKTtcbiAgICAgICAgICAgIHRoaXMuYWRkQnVmZmVyKG51bGxDb3VudCA8PSAwXG4gICAgICAgICAgICAgICAgPyBuZXcgVWludDhBcnJheSgwKSAvLyBwbGFjZWhvbGRlciB2YWxpZGl0eSBidWZmZXJcbiAgICAgICAgICAgICAgICA6IHRoaXMuZ2V0VHJ1bmNhdGVkQml0bWFwKGRhdGEub2Zmc2V0LCBsZW5ndGgsIGRhdGEubnVsbEJpdG1hcCEpXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdXBlci52aXNpdCh2ZWN0b3IpO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXROdWxsICAgICAgICAgICAoX251bGx6OiBWZWN0b3I8TnVsbD4pICAgICAgICAgICAgeyByZXR1cm4gdGhpczsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgcHVibGljIHZpc2l0Qm9vbCAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPEJvb2w+KSAgICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRCb29sVmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdEludCAgICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxJbnQ+KSAgICAgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRGbG9hdCAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8RmxvYXQ+KSAgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0VXRmOCAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPFV0Zjg+KSAgICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0TGlzdFZlY3Rvcih2ZWN0b3IpOyAgfVxuICAgIHB1YmxpYyB2aXNpdEJpbmFyeSAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxCaW5hcnk+KSAgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdExpc3RWZWN0b3IodmVjdG9yKTsgIH1cbiAgICBwdWJsaWMgdmlzaXREYXRlICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8RGF0ZV8+KSAgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0VGltZXN0YW1wICAgICAgKHZlY3RvcjogVmVjdG9yPFRpbWVzdGFtcD4pICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdFRpbWUgICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxUaW1lPikgICAgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXREZWNpbWFsICAgICAgICAodmVjdG9yOiBWZWN0b3I8RGVjaW1hbD4pICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0SW50ZXJ2YWwgICAgICAgKHZlY3RvcjogVmVjdG9yPEludGVydmFsPikgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdExpc3QgICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxMaXN0PikgICAgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0TGlzdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRTdHJ1Y3QgICAgICAgICAodmVjdG9yOiBWZWN0b3I8U3RydWN0PikgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdE5lc3RlZFZlY3Rvcih2ZWN0b3IpOyAgICB9XG4gICAgcHVibGljIHZpc2l0Rml4ZWRTaXplQmluYXJ5KHZlY3RvcjogVmVjdG9yPEZpeGVkU2l6ZUJpbmFyeT4pIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdEZpeGVkU2l6ZUxpc3QgICh2ZWN0b3I6IFZlY3RvcjxGaXhlZFNpemVMaXN0PikgICB7IHJldHVybiB0aGlzLnZpc2l0TGlzdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRNYXAgICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8TWFwXz4pICAgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdE5lc3RlZFZlY3Rvcih2ZWN0b3IpOyAgICB9XG4gICAgcHVibGljIHZpc2l0RGljdGlvbmFyeSAgICAgKHZlY3RvcjogRGljdGlvbmFyeVZlY3RvcikgICAgICAgIHtcbiAgICAgICAgLy8gRGljdGlvbmFyeSB3cml0dGVuIG91dCBzZXBhcmF0ZWx5LiBTbGljZSBvZmZzZXQgY29udGFpbmVkIGluIHRoZSBpbmRpY2VzXG4gICAgICAgIHJldHVybiB0aGlzLnZpc2l0KHZlY3Rvci5pbmRpY2VzKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0VW5pb24odmVjdG9yOiBWZWN0b3I8RGVuc2VVbmlvbiB8IFNwYXJzZVVuaW9uPikge1xuICAgICAgICBjb25zdCB7IGRhdGEsIHR5cGUsIGxlbmd0aCB9ID0gdmVjdG9yO1xuICAgICAgICBjb25zdCB7IG9mZnNldDogc2xpY2VPZmZzZXQsIHR5cGVJZHMgfSA9IGRhdGE7XG4gICAgICAgIC8vIEFsbCBVbmlvbiBWZWN0b3JzIGhhdmUgYSB0eXBlSWRzIGJ1ZmZlclxuICAgICAgICB0aGlzLmFkZEJ1ZmZlcih0eXBlSWRzKTtcbiAgICAgICAgLy8gSWYgdGhpcyBpcyBhIFNwYXJzZSBVbmlvbiwgdHJlYXQgaXQgbGlrZSBhbGwgb3RoZXIgTmVzdGVkIHR5cGVzXG4gICAgICAgIGlmICh0eXBlLm1vZGUgPT09IFVuaW9uTW9kZS5TcGFyc2UpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZpc2l0TmVzdGVkVmVjdG9yKHZlY3Rvcik7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZS5tb2RlID09PSBVbmlvbk1vZGUuRGVuc2UpIHtcbiAgICAgICAgICAgIC8vIElmIHRoaXMgaXMgYSBEZW5zZSBVbmlvbiwgYWRkIHRoZSB2YWx1ZU9mZnNldHMgYnVmZmVyIGFuZCBwb3RlbnRpYWxseSBzbGljZSB0aGUgY2hpbGRyZW5cbiAgICAgICAgICAgIGNvbnN0IHZhbHVlT2Zmc2V0cyA9IChkYXRhIGFzIERlbnNlVW5pb25EYXRhKS52YWx1ZU9mZnNldHM7XG4gICAgICAgICAgICBpZiAoc2xpY2VPZmZzZXQgPD0gMCkge1xuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBWZWN0b3IgaGFzbid0IGJlZW4gc2xpY2VkLCB3cml0ZSB0aGUgZXhpc3RpbmcgdmFsdWVPZmZzZXRzXG4gICAgICAgICAgICAgICAgdGhpcy5hZGRCdWZmZXIodmFsdWVPZmZzZXRzKTtcbiAgICAgICAgICAgICAgICAvLyBXZSBjYW4gdHJlYXQgdGhpcyBsaWtlIGFsbCBvdGhlciBOZXN0ZWQgdHlwZXNcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy52aXNpdE5lc3RlZFZlY3Rvcih2ZWN0b3IpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBBIHNsaWNlZCBEZW5zZSBVbmlvbiBpcyBhbiB1bnBsZWFzYW50IGNhc2UuIEJlY2F1c2UgdGhlIG9mZnNldHMgYXJlIGRpZmZlcmVudCBmb3JcbiAgICAgICAgICAgICAgICAvLyBlYWNoIGNoaWxkIHZlY3Rvciwgd2UgbmVlZCB0byBcInJlYmFzZVwiIHRoZSB2YWx1ZU9mZnNldHMgZm9yIGVhY2ggY2hpbGRcbiAgICAgICAgICAgICAgICAvLyBVbmlvbiB0eXBlSWRzIGFyZSBub3QgbmVjZXNzYXJ5IDAtaW5kZXhlZFxuICAgICAgICAgICAgICAgIGNvbnN0IG1heENoaWxkVHlwZUlkID0gTWF0aC5tYXgoLi4udHlwZS50eXBlSWRzKTtcbiAgICAgICAgICAgICAgICBjb25zdCBjaGlsZExlbmd0aHMgPSBuZXcgSW50MzJBcnJheShtYXhDaGlsZFR5cGVJZCArIDEpO1xuICAgICAgICAgICAgICAgIC8vIFNldCBhbGwgdG8gLTEgdG8gaW5kaWNhdGUgdGhhdCB3ZSBoYXZlbid0IG9ic2VydmVkIGEgZmlyc3Qgb2NjdXJyZW5jZSBvZiBhIHBhcnRpY3VsYXIgY2hpbGQgeWV0XG4gICAgICAgICAgICAgICAgY29uc3QgY2hpbGRPZmZzZXRzID0gbmV3IEludDMyQXJyYXkobWF4Q2hpbGRUeXBlSWQgKyAxKS5maWxsKC0xKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzaGlmdGVkT2Zmc2V0cyA9IG5ldyBJbnQzMkFycmF5KGxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdW5zaGlmdGVkT2Zmc2V0cyA9IHRoaXMuZ2V0WmVyb0Jhc2VkVmFsdWVPZmZzZXRzKHNsaWNlT2Zmc2V0LCBsZW5ndGgsIHZhbHVlT2Zmc2V0cyk7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgdHlwZUlkLCBzaGlmdCwgaW5kZXggPSAtMTsgKytpbmRleCA8IGxlbmd0aDspIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZUlkID0gdHlwZUlkc1tpbmRleF07XG4gICAgICAgICAgICAgICAgICAgIC8vIH4oLTEpIHVzZWQgdG8gYmUgZmFzdGVyIHRoYW4geCA9PT0gLTEsIHNvIG1heWJlIHdvcnRoIGJlbmNobWFya2luZyB0aGUgZGlmZmVyZW5jZSBvZiB0aGVzZSB0d28gaW1wbHMgZm9yIGxhcmdlIGRlbnNlIHVuaW9uczpcbiAgICAgICAgICAgICAgICAgICAgLy8gfihzaGlmdCA9IGNoaWxkT2Zmc2V0c1t0eXBlSWRdKSB8fCAoc2hpZnQgPSBjaGlsZE9mZnNldHNbdHlwZUlkXSA9IHVuc2hpZnRlZE9mZnNldHNbaW5kZXhdKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gR29pbmcgd2l0aCB0aGlzIGZvcm0gZm9yIG5vdywgYXMgaXQncyBtb3JlIHJlYWRhYmxlXG4gICAgICAgICAgICAgICAgICAgIGlmICgoc2hpZnQgPSBjaGlsZE9mZnNldHNbdHlwZUlkXSkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaGlmdCA9IGNoaWxkT2Zmc2V0c1t0eXBlSWRdID0gdW5zaGlmdGVkT2Zmc2V0c1t0eXBlSWRdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHNoaWZ0ZWRPZmZzZXRzW2luZGV4XSA9IHVuc2hpZnRlZE9mZnNldHNbaW5kZXhdIC0gc2hpZnQ7XG4gICAgICAgICAgICAgICAgICAgICsrY2hpbGRMZW5ndGhzW3R5cGVJZF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuYWRkQnVmZmVyKHNoaWZ0ZWRPZmZzZXRzKTtcbiAgICAgICAgICAgICAgICAvLyBTbGljZSBhbmQgdmlzaXQgY2hpbGRyZW4gYWNjb3JkaW5nbHlcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjaGlsZEluZGV4ID0gLTEsIG51bUNoaWxkcmVuID0gdHlwZS5jaGlsZHJlbi5sZW5ndGg7ICsrY2hpbGRJbmRleCA8IG51bUNoaWxkcmVuOykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0eXBlSWQgPSB0eXBlLnR5cGVJZHNbY2hpbGRJbmRleF07XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkID0gKHZlY3RvciBhcyBVbmlvblZlY3RvcikuZ2V0Q2hpbGRBdChjaGlsZEluZGV4KSE7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudmlzaXQoY2hpbGQuc2xpY2UoY2hpbGRPZmZzZXRzW3R5cGVJZF0sIE1hdGgubWluKGxlbmd0aCwgY2hpbGRMZW5ndGhzW3R5cGVJZF0pKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgdmlzaXRCb29sVmVjdG9yKHZlY3RvcjogVmVjdG9yPEJvb2w+KSB7XG4gICAgICAgIC8vIEJvb2wgdmVjdG9yIGlzIGEgc3BlY2lhbCBjYXNlIG9mIEZsYXRWZWN0b3IsIGFzIGl0cyBkYXRhIGJ1ZmZlciBuZWVkcyB0byBzdGF5IHBhY2tlZFxuICAgICAgICBsZXQgYml0bWFwOiBVaW50OEFycmF5O1xuICAgICAgICBsZXQgdmFsdWVzLCB7IGRhdGEsIGxlbmd0aCB9ID0gdmVjdG9yO1xuICAgICAgICBpZiAodmVjdG9yLm51bGxDb3VudCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIElmIGFsbCB2YWx1ZXMgYXJlIG51bGwsIGp1c3QgaW5zZXJ0IGEgcGxhY2Vob2xkZXIgZW1wdHkgZGF0YSBidWZmZXIgKGZhc3Rlc3QgcGF0aClcbiAgICAgICAgICAgIGJpdG1hcCA9IG5ldyBVaW50OEFycmF5KDApO1xuICAgICAgICB9IGVsc2UgaWYgKCEoKHZhbHVlcyA9IGRhdGEudmFsdWVzKSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkpKSB7XG4gICAgICAgICAgICAvLyBPdGhlcndpc2UgaWYgdGhlIHVuZGVybHlpbmcgZGF0YSAqaXNuJ3QqIGEgVWludDhBcnJheSwgZW51bWVyYXRlXG4gICAgICAgICAgICAvLyB0aGUgdmFsdWVzIGFzIGJvb2xzIGFuZCByZS1wYWNrIHRoZW0gaW50byBhIFVpbnQ4QXJyYXkgKHNsb3cgcGF0aClcbiAgICAgICAgICAgIGJpdG1hcCA9IHBhY2tCb29scyh2ZWN0b3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlIGp1c3Qgc2xpY2UgdGhlIGJpdG1hcCAoZmFzdCBwYXRoKVxuICAgICAgICAgICAgYml0bWFwID0gdGhpcy5nZXRUcnVuY2F0ZWRCaXRtYXAoZGF0YS5vZmZzZXQsIGxlbmd0aCwgdmFsdWVzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5hZGRCdWZmZXIoYml0bWFwKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHZpc2l0RmxhdFZlY3RvcjxUIGV4dGVuZHMgRmxhdFR5cGU+KHZlY3RvcjogVmVjdG9yPFQ+KSB7XG4gICAgICAgIGNvbnN0IHsgdmlldywgZGF0YSB9ID0gdmVjdG9yO1xuICAgICAgICBjb25zdCB7IG9mZnNldCwgbGVuZ3RoLCB2YWx1ZXMgfSA9IGRhdGE7XG4gICAgICAgIGNvbnN0IHNjYWxlZExlbmd0aCA9IGxlbmd0aCAqICgodmlldyBhcyBhbnkpLnNpemUgfHwgMSk7XG4gICAgICAgIHJldHVybiB0aGlzLmFkZEJ1ZmZlcih2YWx1ZXMuc3ViYXJyYXkob2Zmc2V0LCBzY2FsZWRMZW5ndGgpKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHZpc2l0RmxhdExpc3RWZWN0b3I8VCBleHRlbmRzIEZsYXRMaXN0VHlwZT4odmVjdG9yOiBWZWN0b3I8VD4pIHtcbiAgICAgICAgY29uc3QgeyBkYXRhLCBsZW5ndGggfSA9IHZlY3RvcjtcbiAgICAgICAgY29uc3QgeyBvZmZzZXQsIHZhbHVlcywgdmFsdWVPZmZzZXRzIH0gPSBkYXRhO1xuICAgICAgICBjb25zdCBmaXJzdE9mZnNldCA9IHZhbHVlT2Zmc2V0c1swXTtcbiAgICAgICAgY29uc3QgbGFzdE9mZnNldCA9IHZhbHVlT2Zmc2V0c1tsZW5ndGhdO1xuICAgICAgICBjb25zdCBieXRlTGVuZ3RoID0gTWF0aC5taW4obGFzdE9mZnNldCAtIGZpcnN0T2Zmc2V0LCB2YWx1ZXMuYnl0ZUxlbmd0aCAtIGZpcnN0T2Zmc2V0KTtcbiAgICAgICAgLy8gUHVzaCBpbiB0aGUgb3JkZXIgRmxhdExpc3QgdHlwZXMgcmVhZCB0aGVpciBidWZmZXJzXG4gICAgICAgIC8vIHZhbHVlT2Zmc2V0cyBidWZmZXIgZmlyc3RcbiAgICAgICAgdGhpcy5hZGRCdWZmZXIodGhpcy5nZXRaZXJvQmFzZWRWYWx1ZU9mZnNldHMob2Zmc2V0LCBsZW5ndGgsIHZhbHVlT2Zmc2V0cykpO1xuICAgICAgICAvLyBzbGljZWQgdmFsdWVzIGJ1ZmZlciBzZWNvbmRcbiAgICAgICAgdGhpcy5hZGRCdWZmZXIodmFsdWVzLnN1YmFycmF5KGZpcnN0T2Zmc2V0ICsgb2Zmc2V0LCBmaXJzdE9mZnNldCArIG9mZnNldCArIGJ5dGVMZW5ndGgpKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHByb3RlY3RlZCB2aXNpdExpc3RWZWN0b3I8VCBleHRlbmRzIFNpbmdsZU5lc3RlZFR5cGU+KHZlY3RvcjogVmVjdG9yPFQ+KSB7XG4gICAgICAgIGNvbnN0IHsgZGF0YSwgbGVuZ3RoIH0gPSB2ZWN0b3I7XG4gICAgICAgIGNvbnN0IHsgb2Zmc2V0LCB2YWx1ZU9mZnNldHMgfSA9IDxhbnk+IGRhdGE7XG4gICAgICAgIC8vIElmIHdlIGhhdmUgdmFsdWVPZmZzZXRzIChMaXN0VmVjdG9yKSwgcHVzaCB0aGF0IGJ1ZmZlciBmaXJzdFxuICAgICAgICBpZiAodmFsdWVPZmZzZXRzKSB7XG4gICAgICAgICAgICB0aGlzLmFkZEJ1ZmZlcih0aGlzLmdldFplcm9CYXNlZFZhbHVlT2Zmc2V0cyhvZmZzZXQsIGxlbmd0aCwgdmFsdWVPZmZzZXRzKSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGhlbiBpbnNlcnQgdGhlIExpc3QncyB2YWx1ZXMgY2hpbGRcbiAgICAgICAgcmV0dXJuIHRoaXMudmlzaXQoKHZlY3RvciBhcyBhbnkgYXMgTGlzdFZlY3RvcjxUPikuZ2V0Q2hpbGRBdCgwKSEpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgdmlzaXROZXN0ZWRWZWN0b3I8VCBleHRlbmRzIE5lc3RlZFR5cGU+KHZlY3RvcjogVmVjdG9yPFQ+KSB7XG4gICAgICAgIC8vIFZpc2l0IHRoZSBjaGlsZHJlbiBhY2NvcmRpbmdseVxuICAgICAgICBjb25zdCBudW1DaGlsZHJlbiA9ICh2ZWN0b3IudHlwZS5jaGlsZHJlbiB8fCBbXSkubGVuZ3RoO1xuICAgICAgICBmb3IgKGxldCBjaGlsZDogVmVjdG9yIHwgbnVsbCwgY2hpbGRJbmRleCA9IC0xOyArK2NoaWxkSW5kZXggPCBudW1DaGlsZHJlbjspIHtcbiAgICAgICAgICAgIGlmIChjaGlsZCA9ICh2ZWN0b3IgYXMgTmVzdGVkVmVjdG9yPFQ+KS5nZXRDaGlsZEF0KGNoaWxkSW5kZXgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy52aXNpdChjaGlsZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHByb3RlY3RlZCBhZGRCdWZmZXIodmFsdWVzOiBUeXBlZEFycmF5KSB7XG4gICAgICAgIGNvbnN0IGJ5dGVMZW5ndGggPSBhbGlnbih2YWx1ZXMuYnl0ZUxlbmd0aCwgOCk7XG4gICAgICAgIHRoaXMuYnVmZmVycy5wdXNoKHZhbHVlcyk7XG4gICAgICAgIHRoaXMuYnVmZmVyc01ldGEucHVzaChuZXcgQnVmZmVyTWV0YWRhdGEodGhpcy5ieXRlTGVuZ3RoLCBieXRlTGVuZ3RoKSk7XG4gICAgICAgIHRoaXMuYnl0ZUxlbmd0aCArPSBieXRlTGVuZ3RoO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHJvdGVjdGVkIGdldFRydW5jYXRlZEJpdG1hcChvZmZzZXQ6IG51bWJlciwgbGVuZ3RoOiBudW1iZXIsIGJpdG1hcDogVWludDhBcnJheSkge1xuICAgICAgICBjb25zdCBhbGlnbmVkTGVuZ3RoID0gYWxpZ24oYml0bWFwLmJ5dGVMZW5ndGgsIDgpO1xuICAgICAgICBpZiAob2Zmc2V0ID4gMCB8fCBiaXRtYXAuYnl0ZUxlbmd0aCA8IGFsaWduZWRMZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIFdpdGggYSBzbGljZWQgYXJyYXkgLyBub24temVybyBvZmZzZXQsIHdlIGhhdmUgdG8gY29weSB0aGUgYml0bWFwXG4gICAgICAgICAgICBjb25zdCBieXRlcyA9IG5ldyBVaW50OEFycmF5KGFsaWduZWRMZW5ndGgpO1xuICAgICAgICAgICAgYnl0ZXMuc2V0KFxuICAgICAgICAgICAgICAgIChvZmZzZXQgJSA4ID09PSAwKVxuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBzbGljZSBvZmZzZXQgaXMgYWxpZ25lZCB0byAxIGJ5dGUsIGl0J3Mgc2FmZSB0byBzbGljZSB0aGUgbnVsbEJpdG1hcCBkaXJlY3RseVxuICAgICAgICAgICAgICAgID8gYml0bWFwLnN1YmFycmF5KG9mZnNldCA+PiAzKVxuICAgICAgICAgICAgICAgIC8vIGl0ZXJhdGUgZWFjaCBiaXQgc3RhcnRpbmcgZnJvbSB0aGUgc2xpY2Ugb2Zmc2V0LCBhbmQgcmVwYWNrIGludG8gYW4gYWxpZ25lZCBudWxsQml0bWFwXG4gICAgICAgICAgICAgICAgOiBwYWNrQm9vbHMoaXRlcmF0ZUJpdHMoYml0bWFwLCBvZmZzZXQsIGxlbmd0aCwgbnVsbCwgZ2V0Qm9vbCkpXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgcmV0dXJuIGJ5dGVzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBiaXRtYXA7XG4gICAgfVxuICAgIHByb3RlY3RlZCBnZXRaZXJvQmFzZWRWYWx1ZU9mZnNldHMob2Zmc2V0OiBudW1iZXIsIGxlbmd0aDogbnVtYmVyLCB2YWx1ZU9mZnNldHM6IEludDMyQXJyYXkpIHtcbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIG5vbi16ZXJvIG9mZnNldCwgdGhlbiB0aGUgdmFsdWUgb2Zmc2V0cyBkbyBub3Qgc3RhcnQgYXRcbiAgICAgICAgLy8gemVyby4gV2UgbXVzdCBhKSBjcmVhdGUgYSBuZXcgb2Zmc2V0cyBhcnJheSB3aXRoIHNoaWZ0ZWQgb2Zmc2V0cyBhbmRcbiAgICAgICAgLy8gYikgc2xpY2UgdGhlIHZhbHVlcyBhcnJheSBhY2NvcmRpbmdseVxuICAgICAgICBpZiAob2Zmc2V0ID4gMCB8fCB2YWx1ZU9mZnNldHNbMF0gIT09IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0T2Zmc2V0ID0gdmFsdWVPZmZzZXRzWzBdO1xuICAgICAgICAgICAgY29uc3QgZGVzdE9mZnNldHMgPSBuZXcgSW50MzJBcnJheShsZW5ndGggKyAxKTtcbiAgICAgICAgICAgIGZvciAobGV0IGluZGV4ID0gLTE7ICsraW5kZXggPCBsZW5ndGg7KSB7XG4gICAgICAgICAgICAgICAgZGVzdE9mZnNldHNbaW5kZXhdID0gdmFsdWVPZmZzZXRzW2luZGV4XSAtIHN0YXJ0T2Zmc2V0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRmluYWwgb2Zmc2V0XG4gICAgICAgICAgICBkZXN0T2Zmc2V0c1tsZW5ndGhdID0gdmFsdWVPZmZzZXRzW2xlbmd0aF0gLSBzdGFydE9mZnNldDtcbiAgICAgICAgICAgIHJldHVybiBkZXN0T2Zmc2V0cztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsdWVPZmZzZXRzO1xuICAgIH1cbn1cblxuaW1wb3J0IHsgZmxhdGJ1ZmZlcnMgfSBmcm9tICdmbGF0YnVmZmVycyc7XG5pbXBvcnQgTG9uZyA9IGZsYXRidWZmZXJzLkxvbmc7XG5pbXBvcnQgQnVpbGRlciA9IGZsYXRidWZmZXJzLkJ1aWxkZXI7XG5pbXBvcnQgKiBhcyBGaWxlXyBmcm9tICcuLi8uLi9mYi9GaWxlJztcbmltcG9ydCAqIGFzIFNjaGVtYV8gZnJvbSAnLi4vLi4vZmIvU2NoZW1hJztcbmltcG9ydCAqIGFzIE1lc3NhZ2VfIGZyb20gJy4uLy4uL2ZiL01lc3NhZ2UnO1xuXG5pbXBvcnQgX0Jsb2NrID0gRmlsZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkJsb2NrO1xuaW1wb3J0IF9Gb290ZXIgPSBGaWxlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRm9vdGVyO1xuaW1wb3J0IF9GaWVsZCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpZWxkO1xuaW1wb3J0IF9TY2hlbWEgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5TY2hlbWE7XG5pbXBvcnQgX0J1ZmZlciA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkJ1ZmZlcjtcbmltcG9ydCBfTWVzc2FnZSA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NZXNzYWdlO1xuaW1wb3J0IF9LZXlWYWx1ZSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLktleVZhbHVlO1xuaW1wb3J0IF9GaWVsZE5vZGUgPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRmllbGROb2RlO1xuaW1wb3J0IF9SZWNvcmRCYXRjaCA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5SZWNvcmRCYXRjaDtcbmltcG9ydCBfRGljdGlvbmFyeUJhdGNoID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRpY3Rpb25hcnlCYXRjaDtcbmltcG9ydCBfRGljdGlvbmFyeUVuY29kaW5nID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGljdGlvbmFyeUVuY29kaW5nO1xuaW1wb3J0IF9FbmRpYW5uZXNzID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRW5kaWFubmVzcztcblxuaW1wb3J0IF9OdWxsID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTnVsbDtcbmltcG9ydCBfSW50ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuSW50O1xuaW1wb3J0IF9GbG9hdGluZ1BvaW50ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRmxvYXRpbmdQb2ludDtcbmltcG9ydCBfQmluYXJ5ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuQmluYXJ5O1xuaW1wb3J0IF9Cb29sID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuQm9vbDtcbmltcG9ydCBfVXRmOCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlV0Zjg7XG5pbXBvcnQgX0RlY2ltYWwgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EZWNpbWFsO1xuaW1wb3J0IF9EYXRlID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGF0ZTtcbmltcG9ydCBfVGltZSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlRpbWU7XG5pbXBvcnQgX1RpbWVzdGFtcCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlRpbWVzdGFtcDtcbmltcG9ydCBfSW50ZXJ2YWwgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5JbnRlcnZhbDtcbmltcG9ydCBfTGlzdCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkxpc3Q7XG5pbXBvcnQgX1N0cnVjdCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlN0cnVjdF87XG5pbXBvcnQgX1VuaW9uID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVW5pb247XG5pbXBvcnQgX0ZpeGVkU2l6ZUJpbmFyeSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpeGVkU2l6ZUJpbmFyeTtcbmltcG9ydCBfRml4ZWRTaXplTGlzdCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpeGVkU2l6ZUxpc3Q7XG5pbXBvcnQgX01hcCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk1hcDtcblxuZXhwb3J0IGNsYXNzIFR5cGVTZXJpYWxpemVyIGV4dGVuZHMgVHlwZVZpc2l0b3Ige1xuICAgIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBidWlsZGVyOiBCdWlsZGVyKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdE51bGwoX25vZGU6IE51bGwpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9OdWxsLnN0YXJ0TnVsbChiKSB8fFxuICAgICAgICAgICAgX051bGwuZW5kTnVsbChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRJbnQobm9kZTogSW50KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfSW50LnN0YXJ0SW50KGIpIHx8XG4gICAgICAgICAgICBfSW50LmFkZEJpdFdpZHRoKGIsIG5vZGUuYml0V2lkdGgpIHx8XG4gICAgICAgICAgICBfSW50LmFkZElzU2lnbmVkKGIsIG5vZGUuaXNTaWduZWQpIHx8XG4gICAgICAgICAgICBfSW50LmVuZEludChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRGbG9hdChub2RlOiBGbG9hdCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0Zsb2F0aW5nUG9pbnQuc3RhcnRGbG9hdGluZ1BvaW50KGIpIHx8XG4gICAgICAgICAgICBfRmxvYXRpbmdQb2ludC5hZGRQcmVjaXNpb24oYiwgbm9kZS5wcmVjaXNpb24pIHx8XG4gICAgICAgICAgICBfRmxvYXRpbmdQb2ludC5lbmRGbG9hdGluZ1BvaW50KGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdEJpbmFyeShfbm9kZTogQmluYXJ5KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfQmluYXJ5LnN0YXJ0QmluYXJ5KGIpIHx8XG4gICAgICAgICAgICBfQmluYXJ5LmVuZEJpbmFyeShiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRCb29sKF9ub2RlOiBCb29sKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfQm9vbC5zdGFydEJvb2woYikgfHxcbiAgICAgICAgICAgIF9Cb29sLmVuZEJvb2woYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0VXRmOChfbm9kZTogVXRmOCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX1V0Zjguc3RhcnRVdGY4KGIpIHx8XG4gICAgICAgICAgICBfVXRmOC5lbmRVdGY4KGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdERlY2ltYWwobm9kZTogRGVjaW1hbCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0RlY2ltYWwuc3RhcnREZWNpbWFsKGIpIHx8XG4gICAgICAgICAgICBfRGVjaW1hbC5hZGRTY2FsZShiLCBub2RlLnNjYWxlKSB8fFxuICAgICAgICAgICAgX0RlY2ltYWwuYWRkUHJlY2lzaW9uKGIsIG5vZGUucHJlY2lzaW9uKSB8fFxuICAgICAgICAgICAgX0RlY2ltYWwuZW5kRGVjaW1hbChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXREYXRlKG5vZGU6IERhdGVfKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiBfRGF0ZS5zdGFydERhdGUoYikgfHwgX0RhdGUuYWRkVW5pdChiLCBub2RlLnVuaXQpIHx8IF9EYXRlLmVuZERhdGUoYik7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdFRpbWUobm9kZTogVGltZSkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX1RpbWUuc3RhcnRUaW1lKGIpIHx8XG4gICAgICAgICAgICBfVGltZS5hZGRVbml0KGIsIG5vZGUudW5pdCkgfHxcbiAgICAgICAgICAgIF9UaW1lLmFkZEJpdFdpZHRoKGIsIG5vZGUuYml0V2lkdGgpIHx8XG4gICAgICAgICAgICBfVGltZS5lbmRUaW1lKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdFRpbWVzdGFtcChub2RlOiBUaW1lc3RhbXApIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgY29uc3QgdGltZXpvbmUgPSAobm9kZS50aW1lem9uZSAmJiBiLmNyZWF0ZVN0cmluZyhub2RlLnRpbWV6b25lKSkgfHwgdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX1RpbWVzdGFtcC5zdGFydFRpbWVzdGFtcChiKSB8fFxuICAgICAgICAgICAgX1RpbWVzdGFtcC5hZGRVbml0KGIsIG5vZGUudW5pdCkgfHxcbiAgICAgICAgICAgICh0aW1lem9uZSAhPT0gdW5kZWZpbmVkICYmIF9UaW1lc3RhbXAuYWRkVGltZXpvbmUoYiwgdGltZXpvbmUpKSB8fFxuICAgICAgICAgICAgX1RpbWVzdGFtcC5lbmRUaW1lc3RhbXAoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0SW50ZXJ2YWwobm9kZTogSW50ZXJ2YWwpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9JbnRlcnZhbC5zdGFydEludGVydmFsKGIpIHx8IF9JbnRlcnZhbC5hZGRVbml0KGIsIG5vZGUudW5pdCkgfHwgX0ludGVydmFsLmVuZEludGVydmFsKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdExpc3QoX25vZGU6IExpc3QpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9MaXN0LnN0YXJ0TGlzdChiKSB8fFxuICAgICAgICAgICAgX0xpc3QuZW5kTGlzdChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRTdHJ1Y3QoX25vZGU6IFN0cnVjdCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX1N0cnVjdC5zdGFydFN0cnVjdF8oYikgfHxcbiAgICAgICAgICAgIF9TdHJ1Y3QuZW5kU3RydWN0XyhiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRVbmlvbihub2RlOiBVbmlvbikge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICBjb25zdCB0eXBlSWRzID1cbiAgICAgICAgICAgIF9Vbmlvbi5zdGFydFR5cGVJZHNWZWN0b3IoYiwgbm9kZS50eXBlSWRzLmxlbmd0aCkgfHxcbiAgICAgICAgICAgIF9Vbmlvbi5jcmVhdGVUeXBlSWRzVmVjdG9yKGIsIG5vZGUudHlwZUlkcyk7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfVW5pb24uc3RhcnRVbmlvbihiKSB8fFxuICAgICAgICAgICAgX1VuaW9uLmFkZE1vZGUoYiwgbm9kZS5tb2RlKSB8fFxuICAgICAgICAgICAgX1VuaW9uLmFkZFR5cGVJZHMoYiwgdHlwZUlkcykgfHxcbiAgICAgICAgICAgIF9Vbmlvbi5lbmRVbmlvbihiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXREaWN0aW9uYXJ5KG5vZGU6IERpY3Rpb25hcnkpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgY29uc3QgaW5kZXhUeXBlID0gdGhpcy52aXNpdChub2RlLmluZGljZXMpO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0RpY3Rpb25hcnlFbmNvZGluZy5zdGFydERpY3Rpb25hcnlFbmNvZGluZyhiKSB8fFxuICAgICAgICAgICAgX0RpY3Rpb25hcnlFbmNvZGluZy5hZGRJZChiLCBuZXcgTG9uZyhub2RlLmlkLCAwKSkgfHxcbiAgICAgICAgICAgIF9EaWN0aW9uYXJ5RW5jb2RpbmcuYWRkSXNPcmRlcmVkKGIsIG5vZGUuaXNPcmRlcmVkKSB8fFxuICAgICAgICAgICAgKGluZGV4VHlwZSAhPT0gdW5kZWZpbmVkICYmIF9EaWN0aW9uYXJ5RW5jb2RpbmcuYWRkSW5kZXhUeXBlKGIsIGluZGV4VHlwZSkpIHx8XG4gICAgICAgICAgICBfRGljdGlvbmFyeUVuY29kaW5nLmVuZERpY3Rpb25hcnlFbmNvZGluZyhiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRGaXhlZFNpemVCaW5hcnkobm9kZTogRml4ZWRTaXplQmluYXJ5KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfRml4ZWRTaXplQmluYXJ5LnN0YXJ0Rml4ZWRTaXplQmluYXJ5KGIpIHx8XG4gICAgICAgICAgICBfRml4ZWRTaXplQmluYXJ5LmFkZEJ5dGVXaWR0aChiLCBub2RlLmJ5dGVXaWR0aCkgfHxcbiAgICAgICAgICAgIF9GaXhlZFNpemVCaW5hcnkuZW5kRml4ZWRTaXplQmluYXJ5KGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdEZpeGVkU2l6ZUxpc3Qobm9kZTogRml4ZWRTaXplTGlzdCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0ZpeGVkU2l6ZUxpc3Quc3RhcnRGaXhlZFNpemVMaXN0KGIpIHx8XG4gICAgICAgICAgICBfRml4ZWRTaXplTGlzdC5hZGRMaXN0U2l6ZShiLCBub2RlLmxpc3RTaXplKSB8fFxuICAgICAgICAgICAgX0ZpeGVkU2l6ZUxpc3QuZW5kRml4ZWRTaXplTGlzdChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRNYXAobm9kZTogTWFwXykge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX01hcC5zdGFydE1hcChiKSB8fFxuICAgICAgICAgICAgX01hcC5hZGRLZXlzU29ydGVkKGIsIG5vZGUua2V5c1NvcnRlZCkgfHxcbiAgICAgICAgICAgIF9NYXAuZW5kTWFwKGIpXG4gICAgICAgICk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBjb25jYXRCdWZmZXJzV2l0aE1ldGFkYXRhKHRvdGFsQnl0ZUxlbmd0aDogbnVtYmVyLCBidWZmZXJzOiBVaW50OEFycmF5W10sIGJ1ZmZlcnNNZXRhOiBCdWZmZXJNZXRhZGF0YVtdKSB7XG4gICAgY29uc3QgZGF0YSA9IG5ldyBVaW50OEFycmF5KHRvdGFsQnl0ZUxlbmd0aCk7XG4gICAgZm9yIChsZXQgaSA9IC0xLCBuID0gYnVmZmVycy5sZW5ndGg7ICsraSA8IG47KSB7XG4gICAgICAgIGNvbnN0IHsgb2Zmc2V0LCBsZW5ndGggfSA9IGJ1ZmZlcnNNZXRhW2ldO1xuICAgICAgICBjb25zdCB7IGJ1ZmZlciwgYnl0ZU9mZnNldCwgYnl0ZUxlbmd0aCB9ID0gYnVmZmVyc1tpXTtcbiAgICAgICAgY29uc3QgcmVhbEJ1ZmZlckxlbmd0aCA9IE1hdGgubWluKGxlbmd0aCwgYnl0ZUxlbmd0aCk7XG4gICAgICAgIGlmIChyZWFsQnVmZmVyTGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgZGF0YS5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyLCBieXRlT2Zmc2V0LCByZWFsQnVmZmVyTGVuZ3RoKSwgb2Zmc2V0KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbn1cblxuZnVuY3Rpb24gd3JpdGVGb290ZXIoYjogQnVpbGRlciwgbm9kZTogRm9vdGVyKSB7XG4gICAgbGV0IHNjaGVtYU9mZnNldCA9IHdyaXRlU2NoZW1hKGIsIG5vZGUuc2NoZW1hKTtcbiAgICBsZXQgcmVjb3JkQmF0Y2hlcyA9IChub2RlLnJlY29yZEJhdGNoZXMgfHwgW10pO1xuICAgIGxldCBkaWN0aW9uYXJ5QmF0Y2hlcyA9IChub2RlLmRpY3Rpb25hcnlCYXRjaGVzIHx8IFtdKTtcbiAgICBsZXQgcmVjb3JkQmF0Y2hlc09mZnNldCA9XG4gICAgICAgIF9Gb290ZXIuc3RhcnRSZWNvcmRCYXRjaGVzVmVjdG9yKGIsIHJlY29yZEJhdGNoZXMubGVuZ3RoKSB8fFxuICAgICAgICAgICAgbWFwUmV2ZXJzZShyZWNvcmRCYXRjaGVzLCAocmIpID0+IHdyaXRlQmxvY2soYiwgcmIpKSAmJlxuICAgICAgICBiLmVuZFZlY3RvcigpO1xuXG4gICAgbGV0IGRpY3Rpb25hcnlCYXRjaGVzT2Zmc2V0ID1cbiAgICAgICAgX0Zvb3Rlci5zdGFydERpY3Rpb25hcmllc1ZlY3RvcihiLCBkaWN0aW9uYXJ5QmF0Y2hlcy5sZW5ndGgpIHx8XG4gICAgICAgICAgICBtYXBSZXZlcnNlKGRpY3Rpb25hcnlCYXRjaGVzLCAoZGIpID0+IHdyaXRlQmxvY2soYiwgZGIpKSAmJlxuICAgICAgICBiLmVuZFZlY3RvcigpO1xuXG4gICAgcmV0dXJuIChcbiAgICAgICAgX0Zvb3Rlci5zdGFydEZvb3RlcihiKSB8fFxuICAgICAgICBfRm9vdGVyLmFkZFNjaGVtYShiLCBzY2hlbWFPZmZzZXQpIHx8XG4gICAgICAgIF9Gb290ZXIuYWRkVmVyc2lvbihiLCBub2RlLnNjaGVtYS52ZXJzaW9uKSB8fFxuICAgICAgICBfRm9vdGVyLmFkZFJlY29yZEJhdGNoZXMoYiwgcmVjb3JkQmF0Y2hlc09mZnNldCkgfHxcbiAgICAgICAgX0Zvb3Rlci5hZGREaWN0aW9uYXJpZXMoYiwgZGljdGlvbmFyeUJhdGNoZXNPZmZzZXQpIHx8XG4gICAgICAgIF9Gb290ZXIuZW5kRm9vdGVyKGIpXG4gICAgKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVCbG9jayhiOiBCdWlsZGVyLCBub2RlOiBGaWxlQmxvY2spIHtcbiAgICByZXR1cm4gX0Jsb2NrLmNyZWF0ZUJsb2NrKGIsXG4gICAgICAgIG5ldyBMb25nKG5vZGUub2Zmc2V0LCAwKSxcbiAgICAgICAgbm9kZS5tZXRhRGF0YUxlbmd0aCxcbiAgICAgICAgbmV3IExvbmcobm9kZS5ib2R5TGVuZ3RoLCAwKVxuICAgICk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlTWVzc2FnZShiOiBCdWlsZGVyLCBub2RlOiBNZXNzYWdlKSB7XG4gICAgbGV0IG1lc3NhZ2VIZWFkZXJPZmZzZXQgPSAwO1xuICAgIGlmIChNZXNzYWdlLmlzU2NoZW1hKG5vZGUpKSB7XG4gICAgICAgIG1lc3NhZ2VIZWFkZXJPZmZzZXQgPSB3cml0ZVNjaGVtYShiLCBub2RlIGFzIFNjaGVtYSk7XG4gICAgfSBlbHNlIGlmIChNZXNzYWdlLmlzUmVjb3JkQmF0Y2gobm9kZSkpIHtcbiAgICAgICAgbWVzc2FnZUhlYWRlck9mZnNldCA9IHdyaXRlUmVjb3JkQmF0Y2goYiwgbm9kZSBhcyBSZWNvcmRCYXRjaE1ldGFkYXRhKTtcbiAgICB9IGVsc2UgaWYgKE1lc3NhZ2UuaXNEaWN0aW9uYXJ5QmF0Y2gobm9kZSkpIHtcbiAgICAgICAgbWVzc2FnZUhlYWRlck9mZnNldCA9IHdyaXRlRGljdGlvbmFyeUJhdGNoKGIsIG5vZGUgYXMgRGljdGlvbmFyeUJhdGNoKTtcbiAgICB9XG4gICAgcmV0dXJuIChcbiAgICAgICAgX01lc3NhZ2Uuc3RhcnRNZXNzYWdlKGIpIHx8XG4gICAgICAgIF9NZXNzYWdlLmFkZFZlcnNpb24oYiwgbm9kZS52ZXJzaW9uKSB8fFxuICAgICAgICBfTWVzc2FnZS5hZGRIZWFkZXIoYiwgbWVzc2FnZUhlYWRlck9mZnNldCkgfHxcbiAgICAgICAgX01lc3NhZ2UuYWRkSGVhZGVyVHlwZShiLCBub2RlLmhlYWRlclR5cGUpIHx8XG4gICAgICAgIF9NZXNzYWdlLmFkZEJvZHlMZW5ndGgoYiwgbmV3IExvbmcobm9kZS5ib2R5TGVuZ3RoLCAwKSkgfHxcbiAgICAgICAgX01lc3NhZ2UuZW5kTWVzc2FnZShiKVxuICAgICk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlU2NoZW1hKGI6IEJ1aWxkZXIsIG5vZGU6IFNjaGVtYSkge1xuXG4gICAgY29uc3QgZmllbGRPZmZzZXRzID0gbm9kZS5maWVsZHMubWFwKChmKSA9PiB3cml0ZUZpZWxkKGIsIGYpKTtcbiAgICBjb25zdCBmaWVsZHNPZmZzZXQgPVxuICAgICAgICBfU2NoZW1hLnN0YXJ0RmllbGRzVmVjdG9yKGIsIGZpZWxkT2Zmc2V0cy5sZW5ndGgpIHx8XG4gICAgICAgIF9TY2hlbWEuY3JlYXRlRmllbGRzVmVjdG9yKGIsIGZpZWxkT2Zmc2V0cyk7XG5cbiAgICBsZXQgbWV0YWRhdGE6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAobm9kZS5tZXRhZGF0YSAmJiBub2RlLm1ldGFkYXRhLnNpemUgPiAwKSB7XG4gICAgICAgIG1ldGFkYXRhID0gX1NjaGVtYS5jcmVhdGVDdXN0b21NZXRhZGF0YVZlY3RvcihcbiAgICAgICAgICAgIGIsXG4gICAgICAgICAgICBbLi4ubm9kZS5tZXRhZGF0YV0ubWFwKChbaywgdl0pID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBrZXkgPSBiLmNyZWF0ZVN0cmluZyhgJHtrfWApO1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IGIuY3JlYXRlU3RyaW5nKGAke3Z9YCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgICAgX0tleVZhbHVlLnN0YXJ0S2V5VmFsdWUoYikgfHxcbiAgICAgICAgICAgICAgICAgICAgX0tleVZhbHVlLmFkZEtleShiLCBrZXkpIHx8XG4gICAgICAgICAgICAgICAgICAgIF9LZXlWYWx1ZS5hZGRWYWx1ZShiLCB2YWwpIHx8XG4gICAgICAgICAgICAgICAgICAgIF9LZXlWYWx1ZS5lbmRLZXlWYWx1ZShiKVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiAoXG4gICAgICAgIF9TY2hlbWEuc3RhcnRTY2hlbWEoYikgfHxcbiAgICAgICAgX1NjaGVtYS5hZGRGaWVsZHMoYiwgZmllbGRzT2Zmc2V0KSB8fFxuICAgICAgICBfU2NoZW1hLmFkZEVuZGlhbm5lc3MoYiwgcGxhdGZvcm1Jc0xpdHRsZUVuZGlhbiA/IF9FbmRpYW5uZXNzLkxpdHRsZSA6IF9FbmRpYW5uZXNzLkJpZykgfHxcbiAgICAgICAgKG1ldGFkYXRhICE9PSB1bmRlZmluZWQgJiYgX1NjaGVtYS5hZGRDdXN0b21NZXRhZGF0YShiLCBtZXRhZGF0YSkpIHx8XG4gICAgICAgIF9TY2hlbWEuZW5kU2NoZW1hKGIpXG4gICAgKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVSZWNvcmRCYXRjaChiOiBCdWlsZGVyLCBub2RlOiBSZWNvcmRCYXRjaE1ldGFkYXRhKSB7XG4gICAgbGV0IG5vZGVzID0gKG5vZGUubm9kZXMgfHwgW10pO1xuICAgIGxldCBidWZmZXJzID0gKG5vZGUuYnVmZmVycyB8fCBbXSk7XG4gICAgbGV0IG5vZGVzT2Zmc2V0ID1cbiAgICAgICAgX1JlY29yZEJhdGNoLnN0YXJ0Tm9kZXNWZWN0b3IoYiwgbm9kZXMubGVuZ3RoKSB8fFxuICAgICAgICBtYXBSZXZlcnNlKG5vZGVzLCAobikgPT4gd3JpdGVGaWVsZE5vZGUoYiwgbikpICYmXG4gICAgICAgIGIuZW5kVmVjdG9yKCk7XG5cbiAgICBsZXQgYnVmZmVyc09mZnNldCA9XG4gICAgICAgIF9SZWNvcmRCYXRjaC5zdGFydEJ1ZmZlcnNWZWN0b3IoYiwgYnVmZmVycy5sZW5ndGgpIHx8XG4gICAgICAgIG1hcFJldmVyc2UoYnVmZmVycywgKGJfKSA9PiB3cml0ZUJ1ZmZlcihiLCBiXykpICYmXG4gICAgICAgIGIuZW5kVmVjdG9yKCk7XG5cbiAgICByZXR1cm4gKFxuICAgICAgICBfUmVjb3JkQmF0Y2guc3RhcnRSZWNvcmRCYXRjaChiKSB8fFxuICAgICAgICBfUmVjb3JkQmF0Y2guYWRkTGVuZ3RoKGIsIG5ldyBMb25nKG5vZGUubGVuZ3RoLCAwKSkgfHxcbiAgICAgICAgX1JlY29yZEJhdGNoLmFkZE5vZGVzKGIsIG5vZGVzT2Zmc2V0KSB8fFxuICAgICAgICBfUmVjb3JkQmF0Y2guYWRkQnVmZmVycyhiLCBidWZmZXJzT2Zmc2V0KSB8fFxuICAgICAgICBfUmVjb3JkQmF0Y2guZW5kUmVjb3JkQmF0Y2goYilcbiAgICApO1xufVxuXG5mdW5jdGlvbiB3cml0ZURpY3Rpb25hcnlCYXRjaChiOiBCdWlsZGVyLCBub2RlOiBEaWN0aW9uYXJ5QmF0Y2gpIHtcbiAgICBjb25zdCBkYXRhT2Zmc2V0ID0gd3JpdGVSZWNvcmRCYXRjaChiLCBub2RlLmRhdGEpO1xuICAgIHJldHVybiAoXG4gICAgICAgIF9EaWN0aW9uYXJ5QmF0Y2guc3RhcnREaWN0aW9uYXJ5QmF0Y2goYikgfHxcbiAgICAgICAgX0RpY3Rpb25hcnlCYXRjaC5hZGRJZChiLCBuZXcgTG9uZyhub2RlLmlkLCAwKSkgfHxcbiAgICAgICAgX0RpY3Rpb25hcnlCYXRjaC5hZGRJc0RlbHRhKGIsIG5vZGUuaXNEZWx0YSkgfHxcbiAgICAgICAgX0RpY3Rpb25hcnlCYXRjaC5hZGREYXRhKGIsIGRhdGFPZmZzZXQpIHx8XG4gICAgICAgIF9EaWN0aW9uYXJ5QmF0Y2guZW5kRGljdGlvbmFyeUJhdGNoKGIpXG4gICAgKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVCdWZmZXIoYjogQnVpbGRlciwgbm9kZTogQnVmZmVyTWV0YWRhdGEpIHtcbiAgICByZXR1cm4gX0J1ZmZlci5jcmVhdGVCdWZmZXIoYiwgbmV3IExvbmcobm9kZS5vZmZzZXQsIDApLCBuZXcgTG9uZyhub2RlLmxlbmd0aCwgMCkpO1xufVxuXG5mdW5jdGlvbiB3cml0ZUZpZWxkTm9kZShiOiBCdWlsZGVyLCBub2RlOiBGaWVsZE1ldGFkYXRhKSB7XG4gICAgcmV0dXJuIF9GaWVsZE5vZGUuY3JlYXRlRmllbGROb2RlKGIsIG5ldyBMb25nKG5vZGUubGVuZ3RoLCAwKSwgbmV3IExvbmcobm9kZS5udWxsQ291bnQsIDApKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVGaWVsZChiOiBCdWlsZGVyLCBub2RlOiBGaWVsZCkge1xuICAgIGxldCB0eXBlT2Zmc2V0ID0gLTE7XG4gICAgbGV0IHR5cGUgPSBub2RlLnR5cGU7XG4gICAgbGV0IHR5cGVJZCA9IG5vZGUudHlwZUlkO1xuICAgIGxldCBuYW1lOiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgbGV0IG1ldGFkYXRhOiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgbGV0IGRpY3Rpb25hcnk6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICAgIGlmICghRGF0YVR5cGUuaXNEaWN0aW9uYXJ5KHR5cGUpKSB7XG4gICAgICAgIHR5cGVPZmZzZXQgPSBuZXcgVHlwZVNlcmlhbGl6ZXIoYikudmlzaXQodHlwZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdHlwZUlkID0gdHlwZS5kaWN0aW9uYXJ5LlRUeXBlO1xuICAgICAgICBkaWN0aW9uYXJ5ID0gbmV3IFR5cGVTZXJpYWxpemVyKGIpLnZpc2l0KHR5cGUpO1xuICAgICAgICB0eXBlT2Zmc2V0ID0gbmV3IFR5cGVTZXJpYWxpemVyKGIpLnZpc2l0KHR5cGUuZGljdGlvbmFyeSk7XG4gICAgfVxuXG4gICAgbGV0IGNoaWxkcmVuID0gX0ZpZWxkLmNyZWF0ZUNoaWxkcmVuVmVjdG9yKGIsICh0eXBlLmNoaWxkcmVuIHx8IFtdKS5tYXAoKGYpID0+IHdyaXRlRmllbGQoYiwgZikpKTtcbiAgICBpZiAobm9kZS5tZXRhZGF0YSAmJiBub2RlLm1ldGFkYXRhLnNpemUgPiAwKSB7XG4gICAgICAgIG1ldGFkYXRhID0gX0ZpZWxkLmNyZWF0ZUN1c3RvbU1ldGFkYXRhVmVjdG9yKFxuICAgICAgICAgICAgYixcbiAgICAgICAgICAgIFsuLi5ub2RlLm1ldGFkYXRhXS5tYXAoKFtrLCB2XSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGIuY3JlYXRlU3RyaW5nKGAke2t9YCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsID0gYi5jcmVhdGVTdHJpbmcoYCR7dn1gKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgICBfS2V5VmFsdWUuc3RhcnRLZXlWYWx1ZShiKSB8fFxuICAgICAgICAgICAgICAgICAgICBfS2V5VmFsdWUuYWRkS2V5KGIsIGtleSkgfHxcbiAgICAgICAgICAgICAgICAgICAgX0tleVZhbHVlLmFkZFZhbHVlKGIsIHZhbCkgfHxcbiAgICAgICAgICAgICAgICAgICAgX0tleVZhbHVlLmVuZEtleVZhbHVlKGIpXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxuICAgIGlmIChub2RlLm5hbWUpIHtcbiAgICAgICAgbmFtZSA9IGIuY3JlYXRlU3RyaW5nKG5vZGUubmFtZSk7XG4gICAgfVxuICAgIHJldHVybiAoXG4gICAgICAgIF9GaWVsZC5zdGFydEZpZWxkKGIpIHx8XG4gICAgICAgIF9GaWVsZC5hZGRUeXBlKGIsIHR5cGVPZmZzZXQpIHx8XG4gICAgICAgIF9GaWVsZC5hZGRUeXBlVHlwZShiLCB0eXBlSWQpIHx8XG4gICAgICAgIF9GaWVsZC5hZGRDaGlsZHJlbihiLCBjaGlsZHJlbikgfHxcbiAgICAgICAgX0ZpZWxkLmFkZE51bGxhYmxlKGIsICEhbm9kZS5udWxsYWJsZSkgfHxcbiAgICAgICAgKG5hbWUgIT09IHVuZGVmaW5lZCAmJiBfRmllbGQuYWRkTmFtZShiLCBuYW1lKSkgfHxcbiAgICAgICAgKGRpY3Rpb25hcnkgIT09IHVuZGVmaW5lZCAmJiBfRmllbGQuYWRkRGljdGlvbmFyeShiLCBkaWN0aW9uYXJ5KSkgfHxcbiAgICAgICAgKG1ldGFkYXRhICE9PSB1bmRlZmluZWQgJiYgX0ZpZWxkLmFkZEN1c3RvbU1ldGFkYXRhKGIsIG1ldGFkYXRhKSkgfHxcbiAgICAgICAgX0ZpZWxkLmVuZEZpZWxkKGIpXG4gICAgKTtcbn1cblxuZnVuY3Rpb24gbWFwUmV2ZXJzZTxULCBVPihzb3VyY2U6IFRbXSwgY2FsbGJhY2tmbjogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBVKTogVVtdIHtcbiAgICBjb25zdCByZXN1bHQgPSBuZXcgQXJyYXkoc291cmNlLmxlbmd0aCk7XG4gICAgZm9yIChsZXQgaSA9IC0xLCBqID0gc291cmNlLmxlbmd0aDsgLS1qID4gLTE7KSB7XG4gICAgICAgIHJlc3VsdFtpXSA9IGNhbGxiYWNrZm4oc291cmNlW2pdLCBpLCBzb3VyY2UpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5jb25zdCBwbGF0Zm9ybUlzTGl0dGxlRW5kaWFuID0gKGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcigyKTtcbiAgICBuZXcgRGF0YVZpZXcoYnVmZmVyKS5zZXRJbnQxNigwLCAyNTYsIHRydWUgLyogbGl0dGxlRW5kaWFuICovKTtcbiAgICAvLyBJbnQxNkFycmF5IHVzZXMgdGhlIHBsYXRmb3JtJ3MgZW5kaWFubmVzcy5cbiAgICByZXR1cm4gbmV3IEludDE2QXJyYXkoYnVmZmVyKVswXSA9PT0gMjU2O1xufSkoKTtcbiJdfQ==

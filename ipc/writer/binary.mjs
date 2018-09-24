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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO0FBQzNELElBQU8sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQ3JELElBQU8sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQ3JELElBQU8sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO0FBQy9ELElBQU8sU0FBUyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDO0FBQzdELElBQU8sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQ3JELElBQU8sT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO0FBQzFELElBQU8sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO0FBQ3ZELElBQU8sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUM7QUFDM0UsSUFBTyxjQUFjLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUM7QUFDdkUsSUFBTyxJQUFJLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUM7QUFFbkQsTUFBTSxPQUFPLGNBQWUsU0FBUSxXQUFX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Q3JCLENBQUM7QUFDTixDQUFDO0FBRUQsU0FBUyxVQUFVLENBQU8sTUFBVyxFQUFFLFVBQXNEO0lBQ3pGLE1BQU0sTUFBTSxHQUFHLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN4QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHO1FBQzNDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztLQUNoRDtJQUNELE9BQU8sTUFBTSxDQUFDO0FBQ2xCLENBQUM7QUFFRCxNQUFNLHNCQUFzQixHQUFHLENBQUM7SUFDNUIsTUFBTSxNQUFNLEdBQUcsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEMsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDL0QsNkNBQTZDO0lBQzdDLE9BQU8sSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxFQUFFLENBQUMiLCJmaWxlIjoiaXBjL3dyaXRlci9iaW5hcnkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgVGFibGUgfSBmcm9tICcuLi8uLi90YWJsZSc7XG5pbXBvcnQgeyBEZW5zZVVuaW9uRGF0YSB9IGZyb20gJy4uLy4uL2RhdGEnO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2ggfSBmcm9tICcuLi8uLi9yZWNvcmRiYXRjaCc7XG5pbXBvcnQgeyBWZWN0b3JWaXNpdG9yLCBUeXBlVmlzaXRvciB9IGZyb20gJy4uLy4uL3Zpc2l0b3InO1xuaW1wb3J0IHsgTUFHSUMsIG1hZ2ljTGVuZ3RoLCBtYWdpY0FuZFBhZGRpbmcsIFBBRERJTkcgfSBmcm9tICcuLi9tYWdpYyc7XG5pbXBvcnQgeyBhbGlnbiwgZ2V0Qm9vbCwgcGFja0Jvb2xzLCBpdGVyYXRlQml0cyB9IGZyb20gJy4uLy4uL3V0aWwvYml0JztcbmltcG9ydCB7IFZlY3RvciwgVW5pb25WZWN0b3IsIERpY3Rpb25hcnlWZWN0b3IsIE5lc3RlZFZlY3RvciwgTGlzdFZlY3RvciB9IGZyb20gJy4uLy4uL3ZlY3Rvcic7XG5pbXBvcnQgeyBCdWZmZXJNZXRhZGF0YSwgRmllbGRNZXRhZGF0YSwgRm9vdGVyLCBGaWxlQmxvY2ssIE1lc3NhZ2UsIFJlY29yZEJhdGNoTWV0YWRhdGEsIERpY3Rpb25hcnlCYXRjaCB9IGZyb20gJy4uL21ldGFkYXRhJztcbmltcG9ydCB7XG4gICAgU2NoZW1hLCBGaWVsZCwgVHlwZWRBcnJheSwgTWV0YWRhdGFWZXJzaW9uLFxuICAgIERhdGFUeXBlLFxuICAgIERpY3Rpb25hcnksXG4gICAgTnVsbCwgSW50LCBGbG9hdCxcbiAgICBCaW5hcnksIEJvb2wsIFV0ZjgsIERlY2ltYWwsXG4gICAgRGF0ZV8sIFRpbWUsIFRpbWVzdGFtcCwgSW50ZXJ2YWwsXG4gICAgTGlzdCwgU3RydWN0LCBVbmlvbiwgRml4ZWRTaXplQmluYXJ5LCBGaXhlZFNpemVMaXN0LCBNYXBfLFxuICAgIEZsYXRUeXBlLCBGbGF0TGlzdFR5cGUsIE5lc3RlZFR5cGUsIFVuaW9uTW9kZSwgU3BhcnNlVW5pb24sIERlbnNlVW5pb24sIFNpbmdsZU5lc3RlZFR5cGUsXG59IGZyb20gJy4uLy4uL3R5cGUnO1xuXG5leHBvcnQgZnVuY3Rpb24qIHNlcmlhbGl6ZVN0cmVhbSh0YWJsZTogVGFibGUpIHtcbiAgICB5aWVsZCBzZXJpYWxpemVNZXNzYWdlKHRhYmxlLnNjaGVtYSkuYnVmZmVyO1xuICAgIGZvciAoY29uc3QgW2lkLCBmaWVsZF0gb2YgdGFibGUuc2NoZW1hLmRpY3Rpb25hcmllcykge1xuICAgICAgICBjb25zdCB2ZWMgPSB0YWJsZS5nZXRDb2x1bW4oZmllbGQubmFtZSkgYXMgRGljdGlvbmFyeVZlY3RvcjtcbiAgICAgICAgaWYgKHZlYyAmJiB2ZWMuZGljdGlvbmFyeSkge1xuICAgICAgICAgICAgeWllbGQgc2VyaWFsaXplRGljdGlvbmFyeUJhdGNoKHZlYy5kaWN0aW9uYXJ5LCBpZCkuYnVmZmVyO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgcmVjb3JkQmF0Y2ggb2YgdGFibGUuYmF0Y2hlcykge1xuICAgICAgICB5aWVsZCBzZXJpYWxpemVSZWNvcmRCYXRjaChyZWNvcmRCYXRjaCkuYnVmZmVyO1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uKiBzZXJpYWxpemVGaWxlKHRhYmxlOiBUYWJsZSkge1xuXG4gICAgY29uc3QgcmVjb3JkQmF0Y2hlcyA9IFtdO1xuICAgIGNvbnN0IGRpY3Rpb25hcnlCYXRjaGVzID0gW107XG5cbiAgICAvLyBGaXJzdCB5aWVsZCB0aGUgbWFnaWMgc3RyaW5nIChhbGlnbmVkKVxuICAgIGxldCBidWZmZXIgPSBuZXcgVWludDhBcnJheShhbGlnbihtYWdpY0xlbmd0aCwgOCkpO1xuICAgIGxldCBtZXRhZGF0YUxlbmd0aCwgYnl0ZUxlbmd0aCA9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgIGJ1ZmZlci5zZXQoTUFHSUMsIDApO1xuICAgIHlpZWxkIGJ1ZmZlcjtcblxuICAgIC8vIFRoZW4geWllbGQgdGhlIHNjaGVtYVxuICAgICh7IG1ldGFkYXRhTGVuZ3RoLCBidWZmZXIgfSA9IHNlcmlhbGl6ZU1lc3NhZ2UodGFibGUuc2NoZW1hKSk7XG4gICAgYnl0ZUxlbmd0aCArPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICB5aWVsZCBidWZmZXI7XG5cbiAgICBmb3IgKGNvbnN0IFtpZCwgZmllbGRdIG9mIHRhYmxlLnNjaGVtYS5kaWN0aW9uYXJpZXMpIHtcbiAgICAgICAgY29uc3QgdmVjID0gdGFibGUuZ2V0Q29sdW1uKGZpZWxkLm5hbWUpIGFzIERpY3Rpb25hcnlWZWN0b3I7XG4gICAgICAgIGlmICh2ZWMgJiYgdmVjLmRpY3Rpb25hcnkpIHtcbiAgICAgICAgICAgICh7IG1ldGFkYXRhTGVuZ3RoLCBidWZmZXIgfSA9IHNlcmlhbGl6ZURpY3Rpb25hcnlCYXRjaCh2ZWMuZGljdGlvbmFyeSwgaWQpKTtcbiAgICAgICAgICAgIGRpY3Rpb25hcnlCYXRjaGVzLnB1c2gobmV3IEZpbGVCbG9jayhtZXRhZGF0YUxlbmd0aCwgYnVmZmVyLmJ5dGVMZW5ndGgsIGJ5dGVMZW5ndGgpKTtcbiAgICAgICAgICAgIGJ5dGVMZW5ndGggKz0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgICAgICAgICB5aWVsZCBidWZmZXI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCByZWNvcmRCYXRjaCBvZiB0YWJsZS5iYXRjaGVzKSB7XG4gICAgICAgICh7IG1ldGFkYXRhTGVuZ3RoLCBidWZmZXIgfSA9IHNlcmlhbGl6ZVJlY29yZEJhdGNoKHJlY29yZEJhdGNoKSk7XG4gICAgICAgIHJlY29yZEJhdGNoZXMucHVzaChuZXcgRmlsZUJsb2NrKG1ldGFkYXRhTGVuZ3RoLCBidWZmZXIuYnl0ZUxlbmd0aCwgYnl0ZUxlbmd0aCkpO1xuICAgICAgICBieXRlTGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICB5aWVsZCBidWZmZXI7XG4gICAgfVxuXG4gICAgLy8gVGhlbiB5aWVsZCB0aGUgZm9vdGVyIG1ldGFkYXRhIChub3QgYWxpZ25lZClcbiAgICAoeyBtZXRhZGF0YUxlbmd0aCwgYnVmZmVyIH0gPSBzZXJpYWxpemVGb290ZXIobmV3IEZvb3RlcihkaWN0aW9uYXJ5QmF0Y2hlcywgcmVjb3JkQmF0Y2hlcywgdGFibGUuc2NoZW1hKSkpO1xuICAgIHlpZWxkIGJ1ZmZlcjtcblxuICAgIC8vIExhc3QsIHlpZWxkIHRoZSBmb290ZXIgbGVuZ3RoICsgdGVybWluYXRpbmcgbWFnaWMgYXJyb3cgc3RyaW5nIChhbGlnbmVkKVxuICAgIGJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KG1hZ2ljQW5kUGFkZGluZyk7XG4gICAgbmV3IERhdGFWaWV3KGJ1ZmZlci5idWZmZXIpLnNldEludDMyKDAsIG1ldGFkYXRhTGVuZ3RoLCBwbGF0Zm9ybUlzTGl0dGxlRW5kaWFuKTtcbiAgICBidWZmZXIuc2V0KE1BR0lDLCBidWZmZXIuYnl0ZUxlbmd0aCAtIG1hZ2ljTGVuZ3RoKTtcbiAgICB5aWVsZCBidWZmZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVSZWNvcmRCYXRjaChyZWNvcmRCYXRjaDogUmVjb3JkQmF0Y2gpIHtcbiAgICBjb25zdCB7IGJ5dGVMZW5ndGgsIGZpZWxkTm9kZXMsIGJ1ZmZlcnMsIGJ1ZmZlcnNNZXRhIH0gPSBuZXcgUmVjb3JkQmF0Y2hTZXJpYWxpemVyKCkudmlzaXRSZWNvcmRCYXRjaChyZWNvcmRCYXRjaCk7XG4gICAgY29uc3QgcmJNZXRhID0gbmV3IFJlY29yZEJhdGNoTWV0YWRhdGEoTWV0YWRhdGFWZXJzaW9uLlY0LCByZWNvcmRCYXRjaC5sZW5ndGgsIGZpZWxkTm9kZXMsIGJ1ZmZlcnNNZXRhKTtcbiAgICBjb25zdCByYkRhdGEgPSBjb25jYXRCdWZmZXJzV2l0aE1ldGFkYXRhKGJ5dGVMZW5ndGgsIGJ1ZmZlcnMsIGJ1ZmZlcnNNZXRhKTtcbiAgICByZXR1cm4gc2VyaWFsaXplTWVzc2FnZShyYk1ldGEsIHJiRGF0YSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVEaWN0aW9uYXJ5QmF0Y2goZGljdGlvbmFyeTogVmVjdG9yLCBpZDogTG9uZyB8IG51bWJlciwgaXNEZWx0YTogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgY29uc3QgeyBieXRlTGVuZ3RoLCBmaWVsZE5vZGVzLCBidWZmZXJzLCBidWZmZXJzTWV0YSB9ID0gbmV3IFJlY29yZEJhdGNoU2VyaWFsaXplcigpLnZpc2l0UmVjb3JkQmF0Y2goUmVjb3JkQmF0Y2guZnJvbShbZGljdGlvbmFyeV0pKTtcbiAgICBjb25zdCByYk1ldGEgPSBuZXcgUmVjb3JkQmF0Y2hNZXRhZGF0YShNZXRhZGF0YVZlcnNpb24uVjQsIGRpY3Rpb25hcnkubGVuZ3RoLCBmaWVsZE5vZGVzLCBidWZmZXJzTWV0YSk7XG4gICAgY29uc3QgZGJNZXRhID0gbmV3IERpY3Rpb25hcnlCYXRjaChNZXRhZGF0YVZlcnNpb24uVjQsIHJiTWV0YSwgaWQsIGlzRGVsdGEpO1xuICAgIGNvbnN0IHJiRGF0YSA9IGNvbmNhdEJ1ZmZlcnNXaXRoTWV0YWRhdGEoYnl0ZUxlbmd0aCwgYnVmZmVycywgYnVmZmVyc01ldGEpO1xuICAgIHJldHVybiBzZXJpYWxpemVNZXNzYWdlKGRiTWV0YSwgcmJEYXRhKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZU1lc3NhZ2UobWVzc2FnZTogTWVzc2FnZSwgZGF0YT86IFVpbnQ4QXJyYXkpIHtcbiAgICBjb25zdCBiID0gbmV3IEJ1aWxkZXIoKTtcbiAgICBfTWVzc2FnZS5maW5pc2hNZXNzYWdlQnVmZmVyKGIsIHdyaXRlTWVzc2FnZShiLCBtZXNzYWdlKSk7XG4gICAgLy8gU2xpY2Ugb3V0IHRoZSBidWZmZXIgdGhhdCBjb250YWlucyB0aGUgbWVzc2FnZSBtZXRhZGF0YVxuICAgIGNvbnN0IG1ldGFkYXRhQnl0ZXMgPSBiLmFzVWludDhBcnJheSgpO1xuICAgIC8vIFJlc2VydmUgNCBieXRlcyBmb3Igd3JpdGluZyB0aGUgbWVzc2FnZSBzaXplIGF0IHRoZSBmcm9udC5cbiAgICAvLyBNZXRhZGF0YSBsZW5ndGggaW5jbHVkZXMgdGhlIG1ldGFkYXRhIGJ5dGVMZW5ndGggKyB0aGUgNFxuICAgIC8vIGJ5dGVzIGZvciB0aGUgbGVuZ3RoLCBhbmQgcm91bmRlZCB1cCB0byB0aGUgbmVhcmVzdCA4IGJ5dGVzLlxuICAgIGNvbnN0IG1ldGFkYXRhTGVuZ3RoID0gYWxpZ24oUEFERElORyArIG1ldGFkYXRhQnl0ZXMuYnl0ZUxlbmd0aCwgOCk7XG4gICAgLy8gKyB0aGUgbGVuZ3RoIG9mIHRoZSBvcHRpb25hbCBkYXRhIGJ1ZmZlciBhdCB0aGUgZW5kLCBwYWRkZWRcbiAgICBjb25zdCBkYXRhQnl0ZUxlbmd0aCA9IGRhdGEgPyBkYXRhLmJ5dGVMZW5ndGggOiAwO1xuICAgIC8vIGVuc3VyZSB0aGUgZW50aXJlIG1lc3NhZ2UgaXMgYWxpZ25lZCB0byBhbiA4LWJ5dGUgYm91bmRhcnlcbiAgICBjb25zdCBtZXNzYWdlQnl0ZXMgPSBuZXcgVWludDhBcnJheShhbGlnbihtZXRhZGF0YUxlbmd0aCArIGRhdGFCeXRlTGVuZ3RoLCA4KSk7XG4gICAgLy8gV3JpdGUgdGhlIG1ldGFkYXRhIGxlbmd0aCBpbnRvIHRoZSBmaXJzdCA0IGJ5dGVzLCBidXQgc3VidHJhY3QgdGhlXG4gICAgLy8gYnl0ZXMgd2UgdXNlIHRvIGhvbGQgdGhlIGxlbmd0aCBpdHNlbGYuXG4gICAgbmV3IERhdGFWaWV3KG1lc3NhZ2VCeXRlcy5idWZmZXIpLnNldEludDMyKDAsIG1ldGFkYXRhTGVuZ3RoIC0gUEFERElORywgcGxhdGZvcm1Jc0xpdHRsZUVuZGlhbik7XG4gICAgLy8gQ29weSB0aGUgbWV0YWRhdGEgYnl0ZXMgaW50byB0aGUgbWVzc2FnZSBidWZmZXJcbiAgICBtZXNzYWdlQnl0ZXMuc2V0KG1ldGFkYXRhQnl0ZXMsIFBBRERJTkcpO1xuICAgIC8vIENvcHkgdGhlIG9wdGlvbmFsIGRhdGEgYnVmZmVyIGFmdGVyIHRoZSBtZXRhZGF0YSBieXRlc1xuICAgIChkYXRhICYmIGRhdGFCeXRlTGVuZ3RoID4gMCkgJiYgbWVzc2FnZUJ5dGVzLnNldChkYXRhLCBtZXRhZGF0YUxlbmd0aCk7XG4gICAgLy8gaWYgKG1lc3NhZ2VCeXRlcy5ieXRlTGVuZ3RoICUgOCAhPT0gMCkgeyBkZWJ1Z2dlcjsgfVxuICAgIC8vIFJldHVybiB0aGUgbWV0YWRhdGEgbGVuZ3RoIGJlY2F1c2Ugd2UgbmVlZCB0byB3cml0ZSBpdCBpbnRvIGVhY2ggRmlsZUJsb2NrIGFsc29cbiAgICByZXR1cm4geyBtZXRhZGF0YUxlbmd0aCwgYnVmZmVyOiBtZXNzYWdlQnl0ZXMgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZUZvb3Rlcihmb290ZXI6IEZvb3Rlcikge1xuICAgIGNvbnN0IGIgPSBuZXcgQnVpbGRlcigpO1xuICAgIF9Gb290ZXIuZmluaXNoRm9vdGVyQnVmZmVyKGIsIHdyaXRlRm9vdGVyKGIsIGZvb3RlcikpO1xuICAgIC8vIFNsaWNlIG91dCB0aGUgYnVmZmVyIHRoYXQgY29udGFpbnMgdGhlIGZvb3RlciBtZXRhZGF0YVxuICAgIGNvbnN0IGZvb3RlckJ5dGVzID0gYi5hc1VpbnQ4QXJyYXkoKTtcbiAgICBjb25zdCBtZXRhZGF0YUxlbmd0aCA9IGZvb3RlckJ5dGVzLmJ5dGVMZW5ndGg7XG4gICAgcmV0dXJuIHsgbWV0YWRhdGFMZW5ndGgsIGJ1ZmZlcjogZm9vdGVyQnl0ZXMgfTtcbn1cblxuZXhwb3J0IGNsYXNzIFJlY29yZEJhdGNoU2VyaWFsaXplciBleHRlbmRzIFZlY3RvclZpc2l0b3Ige1xuICAgIHB1YmxpYyBieXRlTGVuZ3RoID0gMDtcbiAgICBwdWJsaWMgYnVmZmVyczogVHlwZWRBcnJheVtdID0gW107XG4gICAgcHVibGljIGZpZWxkTm9kZXM6IEZpZWxkTWV0YWRhdGFbXSA9IFtdO1xuICAgIHB1YmxpYyBidWZmZXJzTWV0YTogQnVmZmVyTWV0YWRhdGFbXSA9IFtdO1xuICAgIHB1YmxpYyB2aXNpdFJlY29yZEJhdGNoKHJlY29yZEJhdGNoOiBSZWNvcmRCYXRjaCkge1xuICAgICAgICB0aGlzLmJ1ZmZlcnMgPSBbXTtcbiAgICAgICAgdGhpcy5ieXRlTGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5maWVsZE5vZGVzID0gW107XG4gICAgICAgIHRoaXMuYnVmZmVyc01ldGEgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgdmVjdG9yOiBWZWN0b3IsIGluZGV4ID0gLTEsIG51bUNvbHMgPSByZWNvcmRCYXRjaC5udW1Db2xzOyArK2luZGV4IDwgbnVtQ29sczspIHtcbiAgICAgICAgICAgIGlmICh2ZWN0b3IgPSByZWNvcmRCYXRjaC5nZXRDaGlsZEF0KGluZGV4KSEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnZpc2l0KHZlY3Rvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdDxUIGV4dGVuZHMgRGF0YVR5cGU+KHZlY3RvcjogVmVjdG9yPFQ+KSB7XG4gICAgICAgIGlmICghRGF0YVR5cGUuaXNEaWN0aW9uYXJ5KHZlY3Rvci50eXBlKSkge1xuICAgICAgICAgICAgY29uc3QgeyBkYXRhLCBsZW5ndGgsIG51bGxDb3VudCB9ID0gdmVjdG9yO1xuICAgICAgICAgICAgaWYgKGxlbmd0aCA+IDIxNDc0ODM2NDcpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQ2Fubm90IHdyaXRlIGFycmF5cyBsYXJnZXIgdGhhbiAyXjMxIC0gMSBpbiBsZW5ndGgnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZmllbGROb2Rlcy5wdXNoKG5ldyBGaWVsZE1ldGFkYXRhKGxlbmd0aCwgbnVsbENvdW50KSk7XG4gICAgICAgICAgICB0aGlzLmFkZEJ1ZmZlcihudWxsQ291bnQgPD0gMFxuICAgICAgICAgICAgICAgID8gbmV3IFVpbnQ4QXJyYXkoMCkgLy8gcGxhY2Vob2xkZXIgdmFsaWRpdHkgYnVmZmVyXG4gICAgICAgICAgICAgICAgOiB0aGlzLmdldFRydW5jYXRlZEJpdG1hcChkYXRhLm9mZnNldCwgbGVuZ3RoLCBkYXRhLm51bGxCaXRtYXAhKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3VwZXIudmlzaXQodmVjdG9yKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0TnVsbCAgICAgICAgICAgKF9udWxsejogVmVjdG9yPE51bGw+KSAgICAgICAgICAgIHsgcmV0dXJuIHRoaXM7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdEJvb2wgICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxCb29sPikgICAgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0Qm9vbFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRJbnQgICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8SW50PikgICAgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0RmxvYXQgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPEZsb2F0PikgICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdFV0ZjggICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxVdGY4PikgICAgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdExpc3RWZWN0b3IodmVjdG9yKTsgIH1cbiAgICBwdWJsaWMgdmlzaXRCaW5hcnkgICAgICAgICAodmVjdG9yOiBWZWN0b3I8QmluYXJ5PikgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRMaXN0VmVjdG9yKHZlY3Rvcik7ICB9XG4gICAgcHVibGljIHZpc2l0RGF0ZSAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPERhdGVfPikgICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdFRpbWVzdGFtcCAgICAgICh2ZWN0b3I6IFZlY3RvcjxUaW1lc3RhbXA+KSAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRUaW1lICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8VGltZT4pICAgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0RGVjaW1hbCAgICAgICAgKHZlY3RvcjogVmVjdG9yPERlY2ltYWw+KSAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdEludGVydmFsICAgICAgICh2ZWN0b3I6IFZlY3RvcjxJbnRlcnZhbD4pICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRMaXN0ICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8TGlzdD4pICAgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdExpc3RWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0U3RydWN0ICAgICAgICAgKHZlY3RvcjogVmVjdG9yPFN0cnVjdD4pICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXROZXN0ZWRWZWN0b3IodmVjdG9yKTsgICAgfVxuICAgIHB1YmxpYyB2aXNpdEZpeGVkU2l6ZUJpbmFyeSh2ZWN0b3I6IFZlY3RvcjxGaXhlZFNpemVCaW5hcnk+KSB7IHJldHVybiB0aGlzLnZpc2l0RmxhdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRGaXhlZFNpemVMaXN0ICAodmVjdG9yOiBWZWN0b3I8Rml4ZWRTaXplTGlzdD4pICAgeyByZXR1cm4gdGhpcy52aXNpdExpc3RWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0TWFwICAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPE1hcF8+KSAgICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXROZXN0ZWRWZWN0b3IodmVjdG9yKTsgICAgfVxuICAgIHB1YmxpYyB2aXNpdERpY3Rpb25hcnkgICAgICh2ZWN0b3I6IERpY3Rpb25hcnlWZWN0b3IpICAgICAgICB7XG4gICAgICAgIC8vIERpY3Rpb25hcnkgd3JpdHRlbiBvdXQgc2VwYXJhdGVseS4gU2xpY2Ugb2Zmc2V0IGNvbnRhaW5lZCBpbiB0aGUgaW5kaWNlc1xuICAgICAgICByZXR1cm4gdGhpcy52aXNpdCh2ZWN0b3IuaW5kaWNlcyk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdFVuaW9uKHZlY3RvcjogVmVjdG9yPERlbnNlVW5pb24gfCBTcGFyc2VVbmlvbj4pIHtcbiAgICAgICAgY29uc3QgeyBkYXRhLCB0eXBlLCBsZW5ndGggfSA9IHZlY3RvcjtcbiAgICAgICAgY29uc3QgeyBvZmZzZXQ6IHNsaWNlT2Zmc2V0LCB0eXBlSWRzIH0gPSBkYXRhO1xuICAgICAgICAvLyBBbGwgVW5pb24gVmVjdG9ycyBoYXZlIGEgdHlwZUlkcyBidWZmZXJcbiAgICAgICAgdGhpcy5hZGRCdWZmZXIodHlwZUlkcyk7XG4gICAgICAgIC8vIElmIHRoaXMgaXMgYSBTcGFyc2UgVW5pb24sIHRyZWF0IGl0IGxpa2UgYWxsIG90aGVyIE5lc3RlZCB0eXBlc1xuICAgICAgICBpZiAodHlwZS5tb2RlID09PSBVbmlvbk1vZGUuU3BhcnNlKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52aXNpdE5lc3RlZFZlY3Rvcih2ZWN0b3IpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUubW9kZSA9PT0gVW5pb25Nb2RlLkRlbnNlKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGlzIGlzIGEgRGVuc2UgVW5pb24sIGFkZCB0aGUgdmFsdWVPZmZzZXRzIGJ1ZmZlciBhbmQgcG90ZW50aWFsbHkgc2xpY2UgdGhlIGNoaWxkcmVuXG4gICAgICAgICAgICBjb25zdCB2YWx1ZU9mZnNldHMgPSAoZGF0YSBhcyBEZW5zZVVuaW9uRGF0YSkudmFsdWVPZmZzZXRzO1xuICAgICAgICAgICAgaWYgKHNsaWNlT2Zmc2V0IDw9IDApIHtcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgVmVjdG9yIGhhc24ndCBiZWVuIHNsaWNlZCwgd3JpdGUgdGhlIGV4aXN0aW5nIHZhbHVlT2Zmc2V0c1xuICAgICAgICAgICAgICAgIHRoaXMuYWRkQnVmZmVyKHZhbHVlT2Zmc2V0cyk7XG4gICAgICAgICAgICAgICAgLy8gV2UgY2FuIHRyZWF0IHRoaXMgbGlrZSBhbGwgb3RoZXIgTmVzdGVkIHR5cGVzXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudmlzaXROZXN0ZWRWZWN0b3IodmVjdG9yKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gQSBzbGljZWQgRGVuc2UgVW5pb24gaXMgYW4gdW5wbGVhc2FudCBjYXNlLiBCZWNhdXNlIHRoZSBvZmZzZXRzIGFyZSBkaWZmZXJlbnQgZm9yXG4gICAgICAgICAgICAgICAgLy8gZWFjaCBjaGlsZCB2ZWN0b3IsIHdlIG5lZWQgdG8gXCJyZWJhc2VcIiB0aGUgdmFsdWVPZmZzZXRzIGZvciBlYWNoIGNoaWxkXG4gICAgICAgICAgICAgICAgLy8gVW5pb24gdHlwZUlkcyBhcmUgbm90IG5lY2Vzc2FyeSAwLWluZGV4ZWRcbiAgICAgICAgICAgICAgICBjb25zdCBtYXhDaGlsZFR5cGVJZCA9IE1hdGgubWF4KC4uLnR5cGUudHlwZUlkcyk7XG4gICAgICAgICAgICAgICAgY29uc3QgY2hpbGRMZW5ndGhzID0gbmV3IEludDMyQXJyYXkobWF4Q2hpbGRUeXBlSWQgKyAxKTtcbiAgICAgICAgICAgICAgICAvLyBTZXQgYWxsIHRvIC0xIHRvIGluZGljYXRlIHRoYXQgd2UgaGF2ZW4ndCBvYnNlcnZlZCBhIGZpcnN0IG9jY3VycmVuY2Ugb2YgYSBwYXJ0aWN1bGFyIGNoaWxkIHlldFxuICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkT2Zmc2V0cyA9IG5ldyBJbnQzMkFycmF5KG1heENoaWxkVHlwZUlkICsgMSkuZmlsbCgtMSk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2hpZnRlZE9mZnNldHMgPSBuZXcgSW50MzJBcnJheShsZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHVuc2hpZnRlZE9mZnNldHMgPSB0aGlzLmdldFplcm9CYXNlZFZhbHVlT2Zmc2V0cyhzbGljZU9mZnNldCwgbGVuZ3RoLCB2YWx1ZU9mZnNldHMpO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IHR5cGVJZCwgc2hpZnQsIGluZGV4ID0gLTE7ICsraW5kZXggPCBsZW5ndGg7KSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGVJZCA9IHR5cGVJZHNbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAvLyB+KC0xKSB1c2VkIHRvIGJlIGZhc3RlciB0aGFuIHggPT09IC0xLCBzbyBtYXliZSB3b3J0aCBiZW5jaG1hcmtpbmcgdGhlIGRpZmZlcmVuY2Ugb2YgdGhlc2UgdHdvIGltcGxzIGZvciBsYXJnZSBkZW5zZSB1bmlvbnM6XG4gICAgICAgICAgICAgICAgICAgIC8vIH4oc2hpZnQgPSBjaGlsZE9mZnNldHNbdHlwZUlkXSkgfHwgKHNoaWZ0ID0gY2hpbGRPZmZzZXRzW3R5cGVJZF0gPSB1bnNoaWZ0ZWRPZmZzZXRzW2luZGV4XSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIEdvaW5nIHdpdGggdGhpcyBmb3JtIGZvciBub3csIGFzIGl0J3MgbW9yZSByZWFkYWJsZVxuICAgICAgICAgICAgICAgICAgICBpZiAoKHNoaWZ0ID0gY2hpbGRPZmZzZXRzW3R5cGVJZF0pID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hpZnQgPSBjaGlsZE9mZnNldHNbdHlwZUlkXSA9IHVuc2hpZnRlZE9mZnNldHNbdHlwZUlkXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzaGlmdGVkT2Zmc2V0c1tpbmRleF0gPSB1bnNoaWZ0ZWRPZmZzZXRzW2luZGV4XSAtIHNoaWZ0O1xuICAgICAgICAgICAgICAgICAgICArK2NoaWxkTGVuZ3Roc1t0eXBlSWRdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLmFkZEJ1ZmZlcihzaGlmdGVkT2Zmc2V0cyk7XG4gICAgICAgICAgICAgICAgLy8gU2xpY2UgYW5kIHZpc2l0IGNoaWxkcmVuIGFjY29yZGluZ2x5XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgY2hpbGRJbmRleCA9IC0xLCBudW1DaGlsZHJlbiA9IHR5cGUuY2hpbGRyZW4ubGVuZ3RoOyArK2NoaWxkSW5kZXggPCBudW1DaGlsZHJlbjspIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHlwZUlkID0gdHlwZS50eXBlSWRzW2NoaWxkSW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjaGlsZCA9ICh2ZWN0b3IgYXMgVW5pb25WZWN0b3IpLmdldENoaWxkQXQoY2hpbGRJbmRleCkhO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnZpc2l0KGNoaWxkLnNsaWNlKGNoaWxkT2Zmc2V0c1t0eXBlSWRdLCBNYXRoLm1pbihsZW5ndGgsIGNoaWxkTGVuZ3Roc1t0eXBlSWRdKSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHJvdGVjdGVkIHZpc2l0Qm9vbFZlY3Rvcih2ZWN0b3I6IFZlY3RvcjxCb29sPikge1xuICAgICAgICAvLyBCb29sIHZlY3RvciBpcyBhIHNwZWNpYWwgY2FzZSBvZiBGbGF0VmVjdG9yLCBhcyBpdHMgZGF0YSBidWZmZXIgbmVlZHMgdG8gc3RheSBwYWNrZWRcbiAgICAgICAgbGV0IGJpdG1hcDogVWludDhBcnJheTtcbiAgICAgICAgbGV0IHZhbHVlcywgeyBkYXRhLCBsZW5ndGggfSA9IHZlY3RvcjtcbiAgICAgICAgaWYgKHZlY3Rvci5udWxsQ291bnQgPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBJZiBhbGwgdmFsdWVzIGFyZSBudWxsLCBqdXN0IGluc2VydCBhIHBsYWNlaG9sZGVyIGVtcHR5IGRhdGEgYnVmZmVyIChmYXN0ZXN0IHBhdGgpXG4gICAgICAgICAgICBiaXRtYXAgPSBuZXcgVWludDhBcnJheSgwKTtcbiAgICAgICAgfSBlbHNlIGlmICghKCh2YWx1ZXMgPSBkYXRhLnZhbHVlcykgaW5zdGFuY2VvZiBVaW50OEFycmF5KSkge1xuICAgICAgICAgICAgLy8gT3RoZXJ3aXNlIGlmIHRoZSB1bmRlcmx5aW5nIGRhdGEgKmlzbid0KiBhIFVpbnQ4QXJyYXksIGVudW1lcmF0ZVxuICAgICAgICAgICAgLy8gdGhlIHZhbHVlcyBhcyBib29scyBhbmQgcmUtcGFjayB0aGVtIGludG8gYSBVaW50OEFycmF5IChzbG93IHBhdGgpXG4gICAgICAgICAgICBiaXRtYXAgPSBwYWNrQm9vbHModmVjdG9yKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSBqdXN0IHNsaWNlIHRoZSBiaXRtYXAgKGZhc3QgcGF0aClcbiAgICAgICAgICAgIGJpdG1hcCA9IHRoaXMuZ2V0VHJ1bmNhdGVkQml0bWFwKGRhdGEub2Zmc2V0LCBsZW5ndGgsIHZhbHVlcyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkQnVmZmVyKGJpdG1hcCk7XG4gICAgfVxuICAgIHByb3RlY3RlZCB2aXNpdEZsYXRWZWN0b3I8VCBleHRlbmRzIEZsYXRUeXBlPih2ZWN0b3I6IFZlY3RvcjxUPikge1xuICAgICAgICBjb25zdCB7IHZpZXcsIGRhdGEgfSA9IHZlY3RvcjtcbiAgICAgICAgY29uc3QgeyBvZmZzZXQsIGxlbmd0aCwgdmFsdWVzIH0gPSBkYXRhO1xuICAgICAgICBjb25zdCBzY2FsZWRMZW5ndGggPSBsZW5ndGggKiAoKHZpZXcgYXMgYW55KS5zaXplIHx8IDEpO1xuICAgICAgICByZXR1cm4gdGhpcy5hZGRCdWZmZXIodmFsdWVzLnN1YmFycmF5KG9mZnNldCwgc2NhbGVkTGVuZ3RoKSk7XG4gICAgfVxuICAgIHByb3RlY3RlZCB2aXNpdEZsYXRMaXN0VmVjdG9yPFQgZXh0ZW5kcyBGbGF0TGlzdFR5cGU+KHZlY3RvcjogVmVjdG9yPFQ+KSB7XG4gICAgICAgIGNvbnN0IHsgZGF0YSwgbGVuZ3RoIH0gPSB2ZWN0b3I7XG4gICAgICAgIGNvbnN0IHsgb2Zmc2V0LCB2YWx1ZXMsIHZhbHVlT2Zmc2V0cyB9ID0gZGF0YTtcbiAgICAgICAgY29uc3QgZmlyc3RPZmZzZXQgPSB2YWx1ZU9mZnNldHNbMF07XG4gICAgICAgIGNvbnN0IGxhc3RPZmZzZXQgPSB2YWx1ZU9mZnNldHNbbGVuZ3RoXTtcbiAgICAgICAgY29uc3QgYnl0ZUxlbmd0aCA9IE1hdGgubWluKGxhc3RPZmZzZXQgLSBmaXJzdE9mZnNldCwgdmFsdWVzLmJ5dGVMZW5ndGggLSBmaXJzdE9mZnNldCk7XG4gICAgICAgIC8vIFB1c2ggaW4gdGhlIG9yZGVyIEZsYXRMaXN0IHR5cGVzIHJlYWQgdGhlaXIgYnVmZmVyc1xuICAgICAgICAvLyB2YWx1ZU9mZnNldHMgYnVmZmVyIGZpcnN0XG4gICAgICAgIHRoaXMuYWRkQnVmZmVyKHRoaXMuZ2V0WmVyb0Jhc2VkVmFsdWVPZmZzZXRzKG9mZnNldCwgbGVuZ3RoLCB2YWx1ZU9mZnNldHMpKTtcbiAgICAgICAgLy8gc2xpY2VkIHZhbHVlcyBidWZmZXIgc2Vjb25kXG4gICAgICAgIHRoaXMuYWRkQnVmZmVyKHZhbHVlcy5zdWJhcnJheShmaXJzdE9mZnNldCArIG9mZnNldCwgZmlyc3RPZmZzZXQgKyBvZmZzZXQgKyBieXRlTGVuZ3RoKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgdmlzaXRMaXN0VmVjdG9yPFQgZXh0ZW5kcyBTaW5nbGVOZXN0ZWRUeXBlPih2ZWN0b3I6IFZlY3RvcjxUPikge1xuICAgICAgICBjb25zdCB7IGRhdGEsIGxlbmd0aCB9ID0gdmVjdG9yO1xuICAgICAgICBjb25zdCB7IG9mZnNldCwgdmFsdWVPZmZzZXRzIH0gPSA8YW55PiBkYXRhO1xuICAgICAgICAvLyBJZiB3ZSBoYXZlIHZhbHVlT2Zmc2V0cyAoTGlzdFZlY3RvciksIHB1c2ggdGhhdCBidWZmZXIgZmlyc3RcbiAgICAgICAgaWYgKHZhbHVlT2Zmc2V0cykge1xuICAgICAgICAgICAgdGhpcy5hZGRCdWZmZXIodGhpcy5nZXRaZXJvQmFzZWRWYWx1ZU9mZnNldHMob2Zmc2V0LCBsZW5ndGgsIHZhbHVlT2Zmc2V0cykpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRoZW4gaW5zZXJ0IHRoZSBMaXN0J3MgdmFsdWVzIGNoaWxkXG4gICAgICAgIHJldHVybiB0aGlzLnZpc2l0KCh2ZWN0b3IgYXMgYW55IGFzIExpc3RWZWN0b3I8VD4pLmdldENoaWxkQXQoMCkhKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHZpc2l0TmVzdGVkVmVjdG9yPFQgZXh0ZW5kcyBOZXN0ZWRUeXBlPih2ZWN0b3I6IFZlY3RvcjxUPikge1xuICAgICAgICAvLyBWaXNpdCB0aGUgY2hpbGRyZW4gYWNjb3JkaW5nbHlcbiAgICAgICAgY29uc3QgbnVtQ2hpbGRyZW4gPSAodmVjdG9yLnR5cGUuY2hpbGRyZW4gfHwgW10pLmxlbmd0aDtcbiAgICAgICAgZm9yIChsZXQgY2hpbGQ6IFZlY3RvciB8IG51bGwsIGNoaWxkSW5kZXggPSAtMTsgKytjaGlsZEluZGV4IDwgbnVtQ2hpbGRyZW47KSB7XG4gICAgICAgICAgICBpZiAoY2hpbGQgPSAodmVjdG9yIGFzIE5lc3RlZFZlY3RvcjxUPikuZ2V0Q2hpbGRBdChjaGlsZEluZGV4KSkge1xuICAgICAgICAgICAgICAgIHRoaXMudmlzaXQoY2hpbGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgYWRkQnVmZmVyKHZhbHVlczogVHlwZWRBcnJheSkge1xuICAgICAgICBjb25zdCBieXRlTGVuZ3RoID0gYWxpZ24odmFsdWVzLmJ5dGVMZW5ndGgsIDgpO1xuICAgICAgICB0aGlzLmJ1ZmZlcnMucHVzaCh2YWx1ZXMpO1xuICAgICAgICB0aGlzLmJ1ZmZlcnNNZXRhLnB1c2gobmV3IEJ1ZmZlck1ldGFkYXRhKHRoaXMuYnl0ZUxlbmd0aCwgYnl0ZUxlbmd0aCkpO1xuICAgICAgICB0aGlzLmJ5dGVMZW5ndGggKz0gYnl0ZUxlbmd0aDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHByb3RlY3RlZCBnZXRUcnVuY2F0ZWRCaXRtYXAob2Zmc2V0OiBudW1iZXIsIGxlbmd0aDogbnVtYmVyLCBiaXRtYXA6IFVpbnQ4QXJyYXkpIHtcbiAgICAgICAgY29uc3QgYWxpZ25lZExlbmd0aCA9IGFsaWduKGJpdG1hcC5ieXRlTGVuZ3RoLCA4KTtcbiAgICAgICAgaWYgKG9mZnNldCA+IDAgfHwgYml0bWFwLmJ5dGVMZW5ndGggPCBhbGlnbmVkTGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBXaXRoIGEgc2xpY2VkIGFycmF5IC8gbm9uLXplcm8gb2Zmc2V0LCB3ZSBoYXZlIHRvIGNvcHkgdGhlIGJpdG1hcFxuICAgICAgICAgICAgY29uc3QgYnl0ZXMgPSBuZXcgVWludDhBcnJheShhbGlnbmVkTGVuZ3RoKTtcbiAgICAgICAgICAgIGJ5dGVzLnNldChcbiAgICAgICAgICAgICAgICAob2Zmc2V0ICUgOCA9PT0gMClcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgc2xpY2Ugb2Zmc2V0IGlzIGFsaWduZWQgdG8gMSBieXRlLCBpdCdzIHNhZmUgdG8gc2xpY2UgdGhlIG51bGxCaXRtYXAgZGlyZWN0bHlcbiAgICAgICAgICAgICAgICA/IGJpdG1hcC5zdWJhcnJheShvZmZzZXQgPj4gMylcbiAgICAgICAgICAgICAgICAvLyBpdGVyYXRlIGVhY2ggYml0IHN0YXJ0aW5nIGZyb20gdGhlIHNsaWNlIG9mZnNldCwgYW5kIHJlcGFjayBpbnRvIGFuIGFsaWduZWQgbnVsbEJpdG1hcFxuICAgICAgICAgICAgICAgIDogcGFja0Jvb2xzKGl0ZXJhdGVCaXRzKGJpdG1hcCwgb2Zmc2V0LCBsZW5ndGgsIG51bGwsIGdldEJvb2wpKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHJldHVybiBieXRlcztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYml0bWFwO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgZ2V0WmVyb0Jhc2VkVmFsdWVPZmZzZXRzKG9mZnNldDogbnVtYmVyLCBsZW5ndGg6IG51bWJlciwgdmFsdWVPZmZzZXRzOiBJbnQzMkFycmF5KSB7XG4gICAgICAgIC8vIElmIHdlIGhhdmUgYSBub24temVybyBvZmZzZXQsIHRoZW4gdGhlIHZhbHVlIG9mZnNldHMgZG8gbm90IHN0YXJ0IGF0XG4gICAgICAgIC8vIHplcm8uIFdlIG11c3QgYSkgY3JlYXRlIGEgbmV3IG9mZnNldHMgYXJyYXkgd2l0aCBzaGlmdGVkIG9mZnNldHMgYW5kXG4gICAgICAgIC8vIGIpIHNsaWNlIHRoZSB2YWx1ZXMgYXJyYXkgYWNjb3JkaW5nbHlcbiAgICAgICAgaWYgKG9mZnNldCA+IDAgfHwgdmFsdWVPZmZzZXRzWzBdICE9PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBzdGFydE9mZnNldCA9IHZhbHVlT2Zmc2V0c1swXTtcbiAgICAgICAgICAgIGNvbnN0IGRlc3RPZmZzZXRzID0gbmV3IEludDMyQXJyYXkobGVuZ3RoICsgMSk7XG4gICAgICAgICAgICBmb3IgKGxldCBpbmRleCA9IC0xOyArK2luZGV4IDwgbGVuZ3RoOykge1xuICAgICAgICAgICAgICAgIGRlc3RPZmZzZXRzW2luZGV4XSA9IHZhbHVlT2Zmc2V0c1tpbmRleF0gLSBzdGFydE9mZnNldDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEZpbmFsIG9mZnNldFxuICAgICAgICAgICAgZGVzdE9mZnNldHNbbGVuZ3RoXSA9IHZhbHVlT2Zmc2V0c1tsZW5ndGhdIC0gc3RhcnRPZmZzZXQ7XG4gICAgICAgICAgICByZXR1cm4gZGVzdE9mZnNldHM7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZhbHVlT2Zmc2V0cztcbiAgICB9XG59XG5cbmltcG9ydCB7IGZsYXRidWZmZXJzIH0gZnJvbSAnZmxhdGJ1ZmZlcnMnO1xuaW1wb3J0IExvbmcgPSBmbGF0YnVmZmVycy5Mb25nO1xuaW1wb3J0IEJ1aWxkZXIgPSBmbGF0YnVmZmVycy5CdWlsZGVyO1xuaW1wb3J0ICogYXMgRmlsZV8gZnJvbSAnLi4vLi4vZmIvRmlsZSc7XG5pbXBvcnQgKiBhcyBTY2hlbWFfIGZyb20gJy4uLy4uL2ZiL1NjaGVtYSc7XG5pbXBvcnQgKiBhcyBNZXNzYWdlXyBmcm9tICcuLi8uLi9mYi9NZXNzYWdlJztcblxuaW1wb3J0IF9CbG9jayA9IEZpbGVfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5CbG9jaztcbmltcG9ydCBfRm9vdGVyID0gRmlsZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZvb3RlcjtcbmltcG9ydCBfRmllbGQgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaWVsZDtcbmltcG9ydCBfU2NoZW1hID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuU2NoZW1hO1xuaW1wb3J0IF9CdWZmZXIgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5CdWZmZXI7XG5pbXBvcnQgX01lc3NhZ2UgPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTWVzc2FnZTtcbmltcG9ydCBfS2V5VmFsdWUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5LZXlWYWx1ZTtcbmltcG9ydCBfRmllbGROb2RlID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpZWxkTm9kZTtcbmltcG9ydCBfUmVjb3JkQmF0Y2ggPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuUmVjb3JkQmF0Y2g7XG5pbXBvcnQgX0RpY3Rpb25hcnlCYXRjaCA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EaWN0aW9uYXJ5QmF0Y2g7XG5pbXBvcnQgX0RpY3Rpb25hcnlFbmNvZGluZyA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRpY3Rpb25hcnlFbmNvZGluZztcbmltcG9ydCBfRW5kaWFubmVzcyA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkVuZGlhbm5lc3M7XG5cbmltcG9ydCBfTnVsbCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk51bGw7XG5pbXBvcnQgX0ludCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkludDtcbmltcG9ydCBfRmxvYXRpbmdQb2ludCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZsb2F0aW5nUG9pbnQ7XG5pbXBvcnQgX0JpbmFyeSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkJpbmFyeTtcbmltcG9ydCBfQm9vbCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkJvb2w7XG5pbXBvcnQgX1V0ZjggPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5VdGY4O1xuaW1wb3J0IF9EZWNpbWFsID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGVjaW1hbDtcbmltcG9ydCBfRGF0ZSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRhdGU7XG5pbXBvcnQgX1RpbWUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UaW1lO1xuaW1wb3J0IF9UaW1lc3RhbXAgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UaW1lc3RhbXA7XG5pbXBvcnQgX0ludGVydmFsID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuSW50ZXJ2YWw7XG5pbXBvcnQgX0xpc3QgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5MaXN0O1xuaW1wb3J0IF9TdHJ1Y3QgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5TdHJ1Y3RfO1xuaW1wb3J0IF9VbmlvbiA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlVuaW9uO1xuaW1wb3J0IF9GaXhlZFNpemVCaW5hcnkgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaXhlZFNpemVCaW5hcnk7XG5pbXBvcnQgX0ZpeGVkU2l6ZUxpc3QgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5GaXhlZFNpemVMaXN0O1xuaW1wb3J0IF9NYXAgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NYXA7XG5cbmV4cG9ydCBjbGFzcyBUeXBlU2VyaWFsaXplciBleHRlbmRzIFR5cGVWaXNpdG9yIHtcbiAgICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgYnVpbGRlcjogQnVpbGRlcikge1xuICAgICAgICBzdXBlcigpO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXROdWxsKF9ub2RlOiBOdWxsKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfTnVsbC5zdGFydE51bGwoYikgfHxcbiAgICAgICAgICAgIF9OdWxsLmVuZE51bGwoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0SW50KG5vZGU6IEludCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0ludC5zdGFydEludChiKSB8fFxuICAgICAgICAgICAgX0ludC5hZGRCaXRXaWR0aChiLCBub2RlLmJpdFdpZHRoKSB8fFxuICAgICAgICAgICAgX0ludC5hZGRJc1NpZ25lZChiLCBub2RlLmlzU2lnbmVkKSB8fFxuICAgICAgICAgICAgX0ludC5lbmRJbnQoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0RmxvYXQobm9kZTogRmxvYXQpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9GbG9hdGluZ1BvaW50LnN0YXJ0RmxvYXRpbmdQb2ludChiKSB8fFxuICAgICAgICAgICAgX0Zsb2F0aW5nUG9pbnQuYWRkUHJlY2lzaW9uKGIsIG5vZGUucHJlY2lzaW9uKSB8fFxuICAgICAgICAgICAgX0Zsb2F0aW5nUG9pbnQuZW5kRmxvYXRpbmdQb2ludChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRCaW5hcnkoX25vZGU6IEJpbmFyeSkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0JpbmFyeS5zdGFydEJpbmFyeShiKSB8fFxuICAgICAgICAgICAgX0JpbmFyeS5lbmRCaW5hcnkoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0Qm9vbChfbm9kZTogQm9vbCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0Jvb2wuc3RhcnRCb29sKGIpIHx8XG4gICAgICAgICAgICBfQm9vbC5lbmRCb29sKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdFV0ZjgoX25vZGU6IFV0ZjgpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9VdGY4LnN0YXJ0VXRmOChiKSB8fFxuICAgICAgICAgICAgX1V0ZjguZW5kVXRmOChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXREZWNpbWFsKG5vZGU6IERlY2ltYWwpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9EZWNpbWFsLnN0YXJ0RGVjaW1hbChiKSB8fFxuICAgICAgICAgICAgX0RlY2ltYWwuYWRkU2NhbGUoYiwgbm9kZS5zY2FsZSkgfHxcbiAgICAgICAgICAgIF9EZWNpbWFsLmFkZFByZWNpc2lvbihiLCBub2RlLnByZWNpc2lvbikgfHxcbiAgICAgICAgICAgIF9EZWNpbWFsLmVuZERlY2ltYWwoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0RGF0ZShub2RlOiBEYXRlXykge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gX0RhdGUuc3RhcnREYXRlKGIpIHx8IF9EYXRlLmFkZFVuaXQoYiwgbm9kZS51bml0KSB8fCBfRGF0ZS5lbmREYXRlKGIpO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRUaW1lKG5vZGU6IFRpbWUpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9UaW1lLnN0YXJ0VGltZShiKSB8fFxuICAgICAgICAgICAgX1RpbWUuYWRkVW5pdChiLCBub2RlLnVuaXQpIHx8XG4gICAgICAgICAgICBfVGltZS5hZGRCaXRXaWR0aChiLCBub2RlLmJpdFdpZHRoKSB8fFxuICAgICAgICAgICAgX1RpbWUuZW5kVGltZShiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRUaW1lc3RhbXAobm9kZTogVGltZXN0YW1wKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIGNvbnN0IHRpbWV6b25lID0gKG5vZGUudGltZXpvbmUgJiYgYi5jcmVhdGVTdHJpbmcobm9kZS50aW1lem9uZSkpIHx8IHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9UaW1lc3RhbXAuc3RhcnRUaW1lc3RhbXAoYikgfHxcbiAgICAgICAgICAgIF9UaW1lc3RhbXAuYWRkVW5pdChiLCBub2RlLnVuaXQpIHx8XG4gICAgICAgICAgICAodGltZXpvbmUgIT09IHVuZGVmaW5lZCAmJiBfVGltZXN0YW1wLmFkZFRpbWV6b25lKGIsIHRpbWV6b25lKSkgfHxcbiAgICAgICAgICAgIF9UaW1lc3RhbXAuZW5kVGltZXN0YW1wKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdEludGVydmFsKG5vZGU6IEludGVydmFsKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfSW50ZXJ2YWwuc3RhcnRJbnRlcnZhbChiKSB8fCBfSW50ZXJ2YWwuYWRkVW5pdChiLCBub2RlLnVuaXQpIHx8IF9JbnRlcnZhbC5lbmRJbnRlcnZhbChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRMaXN0KF9ub2RlOiBMaXN0KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfTGlzdC5zdGFydExpc3QoYikgfHxcbiAgICAgICAgICAgIF9MaXN0LmVuZExpc3QoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0U3RydWN0KF9ub2RlOiBTdHJ1Y3QpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9TdHJ1Y3Quc3RhcnRTdHJ1Y3RfKGIpIHx8XG4gICAgICAgICAgICBfU3RydWN0LmVuZFN0cnVjdF8oYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0VW5pb24obm9kZTogVW5pb24pIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgY29uc3QgdHlwZUlkcyA9XG4gICAgICAgICAgICBfVW5pb24uc3RhcnRUeXBlSWRzVmVjdG9yKGIsIG5vZGUudHlwZUlkcy5sZW5ndGgpIHx8XG4gICAgICAgICAgICBfVW5pb24uY3JlYXRlVHlwZUlkc1ZlY3RvcihiLCBub2RlLnR5cGVJZHMpO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX1VuaW9uLnN0YXJ0VW5pb24oYikgfHxcbiAgICAgICAgICAgIF9Vbmlvbi5hZGRNb2RlKGIsIG5vZGUubW9kZSkgfHxcbiAgICAgICAgICAgIF9Vbmlvbi5hZGRUeXBlSWRzKGIsIHR5cGVJZHMpIHx8XG4gICAgICAgICAgICBfVW5pb24uZW5kVW5pb24oYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0RGljdGlvbmFyeShub2RlOiBEaWN0aW9uYXJ5KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIGNvbnN0IGluZGV4VHlwZSA9IHRoaXMudmlzaXQobm9kZS5pbmRpY2VzKTtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9EaWN0aW9uYXJ5RW5jb2Rpbmcuc3RhcnREaWN0aW9uYXJ5RW5jb2RpbmcoYikgfHxcbiAgICAgICAgICAgIF9EaWN0aW9uYXJ5RW5jb2RpbmcuYWRkSWQoYiwgbmV3IExvbmcobm9kZS5pZCwgMCkpIHx8XG4gICAgICAgICAgICBfRGljdGlvbmFyeUVuY29kaW5nLmFkZElzT3JkZXJlZChiLCBub2RlLmlzT3JkZXJlZCkgfHxcbiAgICAgICAgICAgIChpbmRleFR5cGUgIT09IHVuZGVmaW5lZCAmJiBfRGljdGlvbmFyeUVuY29kaW5nLmFkZEluZGV4VHlwZShiLCBpbmRleFR5cGUpKSB8fFxuICAgICAgICAgICAgX0RpY3Rpb25hcnlFbmNvZGluZy5lbmREaWN0aW9uYXJ5RW5jb2RpbmcoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0Rml4ZWRTaXplQmluYXJ5KG5vZGU6IEZpeGVkU2l6ZUJpbmFyeSkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0ZpeGVkU2l6ZUJpbmFyeS5zdGFydEZpeGVkU2l6ZUJpbmFyeShiKSB8fFxuICAgICAgICAgICAgX0ZpeGVkU2l6ZUJpbmFyeS5hZGRCeXRlV2lkdGgoYiwgbm9kZS5ieXRlV2lkdGgpIHx8XG4gICAgICAgICAgICBfRml4ZWRTaXplQmluYXJ5LmVuZEZpeGVkU2l6ZUJpbmFyeShiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRGaXhlZFNpemVMaXN0KG5vZGU6IEZpeGVkU2l6ZUxpc3QpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9GaXhlZFNpemVMaXN0LnN0YXJ0Rml4ZWRTaXplTGlzdChiKSB8fFxuICAgICAgICAgICAgX0ZpeGVkU2l6ZUxpc3QuYWRkTGlzdFNpemUoYiwgbm9kZS5saXN0U2l6ZSkgfHxcbiAgICAgICAgICAgIF9GaXhlZFNpemVMaXN0LmVuZEZpeGVkU2l6ZUxpc3QoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0TWFwKG5vZGU6IE1hcF8pIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9NYXAuc3RhcnRNYXAoYikgfHxcbiAgICAgICAgICAgIF9NYXAuYWRkS2V5c1NvcnRlZChiLCBub2RlLmtleXNTb3J0ZWQpIHx8XG4gICAgICAgICAgICBfTWFwLmVuZE1hcChiKVxuICAgICAgICApO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gY29uY2F0QnVmZmVyc1dpdGhNZXRhZGF0YSh0b3RhbEJ5dGVMZW5ndGg6IG51bWJlciwgYnVmZmVyczogVWludDhBcnJheVtdLCBidWZmZXJzTWV0YTogQnVmZmVyTWV0YWRhdGFbXSkge1xuICAgIGNvbnN0IGRhdGEgPSBuZXcgVWludDhBcnJheSh0b3RhbEJ5dGVMZW5ndGgpO1xuICAgIGZvciAobGV0IGkgPSAtMSwgbiA9IGJ1ZmZlcnMubGVuZ3RoOyArK2kgPCBuOykge1xuICAgICAgICBjb25zdCB7IG9mZnNldCwgbGVuZ3RoIH0gPSBidWZmZXJzTWV0YVtpXTtcbiAgICAgICAgY29uc3QgeyBidWZmZXIsIGJ5dGVPZmZzZXQsIGJ5dGVMZW5ndGggfSA9IGJ1ZmZlcnNbaV07XG4gICAgICAgIGNvbnN0IHJlYWxCdWZmZXJMZW5ndGggPSBNYXRoLm1pbihsZW5ndGgsIGJ5dGVMZW5ndGgpO1xuICAgICAgICBpZiAocmVhbEJ1ZmZlckxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGRhdGEuc2V0KG5ldyBVaW50OEFycmF5KGJ1ZmZlciwgYnl0ZU9mZnNldCwgcmVhbEJ1ZmZlckxlbmd0aCksIG9mZnNldCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRhdGE7XG59XG5cbmZ1bmN0aW9uIHdyaXRlRm9vdGVyKGI6IEJ1aWxkZXIsIG5vZGU6IEZvb3Rlcikge1xuICAgIGxldCBzY2hlbWFPZmZzZXQgPSB3cml0ZVNjaGVtYShiLCBub2RlLnNjaGVtYSk7XG4gICAgbGV0IHJlY29yZEJhdGNoZXMgPSAobm9kZS5yZWNvcmRCYXRjaGVzIHx8IFtdKTtcbiAgICBsZXQgZGljdGlvbmFyeUJhdGNoZXMgPSAobm9kZS5kaWN0aW9uYXJ5QmF0Y2hlcyB8fCBbXSk7XG4gICAgbGV0IHJlY29yZEJhdGNoZXNPZmZzZXQgPVxuICAgICAgICBfRm9vdGVyLnN0YXJ0UmVjb3JkQmF0Y2hlc1ZlY3RvcihiLCByZWNvcmRCYXRjaGVzLmxlbmd0aCkgfHxcbiAgICAgICAgICAgIG1hcFJldmVyc2UocmVjb3JkQmF0Y2hlcywgKHJiKSA9PiB3cml0ZUJsb2NrKGIsIHJiKSkgJiZcbiAgICAgICAgYi5lbmRWZWN0b3IoKTtcblxuICAgIGxldCBkaWN0aW9uYXJ5QmF0Y2hlc09mZnNldCA9XG4gICAgICAgIF9Gb290ZXIuc3RhcnREaWN0aW9uYXJpZXNWZWN0b3IoYiwgZGljdGlvbmFyeUJhdGNoZXMubGVuZ3RoKSB8fFxuICAgICAgICAgICAgbWFwUmV2ZXJzZShkaWN0aW9uYXJ5QmF0Y2hlcywgKGRiKSA9PiB3cml0ZUJsb2NrKGIsIGRiKSkgJiZcbiAgICAgICAgYi5lbmRWZWN0b3IoKTtcblxuICAgIHJldHVybiAoXG4gICAgICAgIF9Gb290ZXIuc3RhcnRGb290ZXIoYikgfHxcbiAgICAgICAgX0Zvb3Rlci5hZGRTY2hlbWEoYiwgc2NoZW1hT2Zmc2V0KSB8fFxuICAgICAgICBfRm9vdGVyLmFkZFZlcnNpb24oYiwgbm9kZS5zY2hlbWEudmVyc2lvbikgfHxcbiAgICAgICAgX0Zvb3Rlci5hZGRSZWNvcmRCYXRjaGVzKGIsIHJlY29yZEJhdGNoZXNPZmZzZXQpIHx8XG4gICAgICAgIF9Gb290ZXIuYWRkRGljdGlvbmFyaWVzKGIsIGRpY3Rpb25hcnlCYXRjaGVzT2Zmc2V0KSB8fFxuICAgICAgICBfRm9vdGVyLmVuZEZvb3RlcihiKVxuICAgICk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlQmxvY2soYjogQnVpbGRlciwgbm9kZTogRmlsZUJsb2NrKSB7XG4gICAgcmV0dXJuIF9CbG9jay5jcmVhdGVCbG9jayhiLFxuICAgICAgICBuZXcgTG9uZyhub2RlLm9mZnNldCwgMCksXG4gICAgICAgIG5vZGUubWV0YURhdGFMZW5ndGgsXG4gICAgICAgIG5ldyBMb25nKG5vZGUuYm9keUxlbmd0aCwgMClcbiAgICApO1xufVxuXG5mdW5jdGlvbiB3cml0ZU1lc3NhZ2UoYjogQnVpbGRlciwgbm9kZTogTWVzc2FnZSkge1xuICAgIGxldCBtZXNzYWdlSGVhZGVyT2Zmc2V0ID0gMDtcbiAgICBpZiAoTWVzc2FnZS5pc1NjaGVtYShub2RlKSkge1xuICAgICAgICBtZXNzYWdlSGVhZGVyT2Zmc2V0ID0gd3JpdGVTY2hlbWEoYiwgbm9kZSBhcyBTY2hlbWEpO1xuICAgIH0gZWxzZSBpZiAoTWVzc2FnZS5pc1JlY29yZEJhdGNoKG5vZGUpKSB7XG4gICAgICAgIG1lc3NhZ2VIZWFkZXJPZmZzZXQgPSB3cml0ZVJlY29yZEJhdGNoKGIsIG5vZGUgYXMgUmVjb3JkQmF0Y2hNZXRhZGF0YSk7XG4gICAgfSBlbHNlIGlmIChNZXNzYWdlLmlzRGljdGlvbmFyeUJhdGNoKG5vZGUpKSB7XG4gICAgICAgIG1lc3NhZ2VIZWFkZXJPZmZzZXQgPSB3cml0ZURpY3Rpb25hcnlCYXRjaChiLCBub2RlIGFzIERpY3Rpb25hcnlCYXRjaCk7XG4gICAgfVxuICAgIHJldHVybiAoXG4gICAgICAgIF9NZXNzYWdlLnN0YXJ0TWVzc2FnZShiKSB8fFxuICAgICAgICBfTWVzc2FnZS5hZGRWZXJzaW9uKGIsIG5vZGUudmVyc2lvbikgfHxcbiAgICAgICAgX01lc3NhZ2UuYWRkSGVhZGVyKGIsIG1lc3NhZ2VIZWFkZXJPZmZzZXQpIHx8XG4gICAgICAgIF9NZXNzYWdlLmFkZEhlYWRlclR5cGUoYiwgbm9kZS5oZWFkZXJUeXBlKSB8fFxuICAgICAgICBfTWVzc2FnZS5hZGRCb2R5TGVuZ3RoKGIsIG5ldyBMb25nKG5vZGUuYm9keUxlbmd0aCwgMCkpIHx8XG4gICAgICAgIF9NZXNzYWdlLmVuZE1lc3NhZ2UoYilcbiAgICApO1xufVxuXG5mdW5jdGlvbiB3cml0ZVNjaGVtYShiOiBCdWlsZGVyLCBub2RlOiBTY2hlbWEpIHtcblxuICAgIGNvbnN0IGZpZWxkT2Zmc2V0cyA9IG5vZGUuZmllbGRzLm1hcCgoZikgPT4gd3JpdGVGaWVsZChiLCBmKSk7XG4gICAgY29uc3QgZmllbGRzT2Zmc2V0ID1cbiAgICAgICAgX1NjaGVtYS5zdGFydEZpZWxkc1ZlY3RvcihiLCBmaWVsZE9mZnNldHMubGVuZ3RoKSB8fFxuICAgICAgICBfU2NoZW1hLmNyZWF0ZUZpZWxkc1ZlY3RvcihiLCBmaWVsZE9mZnNldHMpO1xuXG4gICAgbGV0IG1ldGFkYXRhOiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgaWYgKG5vZGUubWV0YWRhdGEgJiYgbm9kZS5tZXRhZGF0YS5zaXplID4gMCkge1xuICAgICAgICBtZXRhZGF0YSA9IF9TY2hlbWEuY3JlYXRlQ3VzdG9tTWV0YWRhdGFWZWN0b3IoXG4gICAgICAgICAgICBiLFxuICAgICAgICAgICAgWy4uLm5vZGUubWV0YWRhdGFdLm1hcCgoW2ssIHZdKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qga2V5ID0gYi5jcmVhdGVTdHJpbmcoYCR7a31gKTtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWwgPSBiLmNyZWF0ZVN0cmluZyhgJHt2fWApO1xuICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICAgIF9LZXlWYWx1ZS5zdGFydEtleVZhbHVlKGIpIHx8XG4gICAgICAgICAgICAgICAgICAgIF9LZXlWYWx1ZS5hZGRLZXkoYiwga2V5KSB8fFxuICAgICAgICAgICAgICAgICAgICBfS2V5VmFsdWUuYWRkVmFsdWUoYiwgdmFsKSB8fFxuICAgICAgICAgICAgICAgICAgICBfS2V5VmFsdWUuZW5kS2V5VmFsdWUoYilcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gKFxuICAgICAgICBfU2NoZW1hLnN0YXJ0U2NoZW1hKGIpIHx8XG4gICAgICAgIF9TY2hlbWEuYWRkRmllbGRzKGIsIGZpZWxkc09mZnNldCkgfHxcbiAgICAgICAgX1NjaGVtYS5hZGRFbmRpYW5uZXNzKGIsIHBsYXRmb3JtSXNMaXR0bGVFbmRpYW4gPyBfRW5kaWFubmVzcy5MaXR0bGUgOiBfRW5kaWFubmVzcy5CaWcpIHx8XG4gICAgICAgIChtZXRhZGF0YSAhPT0gdW5kZWZpbmVkICYmIF9TY2hlbWEuYWRkQ3VzdG9tTWV0YWRhdGEoYiwgbWV0YWRhdGEpKSB8fFxuICAgICAgICBfU2NoZW1hLmVuZFNjaGVtYShiKVxuICAgICk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlUmVjb3JkQmF0Y2goYjogQnVpbGRlciwgbm9kZTogUmVjb3JkQmF0Y2hNZXRhZGF0YSkge1xuICAgIGxldCBub2RlcyA9IChub2RlLm5vZGVzIHx8IFtdKTtcbiAgICBsZXQgYnVmZmVycyA9IChub2RlLmJ1ZmZlcnMgfHwgW10pO1xuICAgIGxldCBub2Rlc09mZnNldCA9XG4gICAgICAgIF9SZWNvcmRCYXRjaC5zdGFydE5vZGVzVmVjdG9yKGIsIG5vZGVzLmxlbmd0aCkgfHxcbiAgICAgICAgbWFwUmV2ZXJzZShub2RlcywgKG4pID0+IHdyaXRlRmllbGROb2RlKGIsIG4pKSAmJlxuICAgICAgICBiLmVuZFZlY3RvcigpO1xuXG4gICAgbGV0IGJ1ZmZlcnNPZmZzZXQgPVxuICAgICAgICBfUmVjb3JkQmF0Y2guc3RhcnRCdWZmZXJzVmVjdG9yKGIsIGJ1ZmZlcnMubGVuZ3RoKSB8fFxuICAgICAgICBtYXBSZXZlcnNlKGJ1ZmZlcnMsIChiXykgPT4gd3JpdGVCdWZmZXIoYiwgYl8pKSAmJlxuICAgICAgICBiLmVuZFZlY3RvcigpO1xuXG4gICAgcmV0dXJuIChcbiAgICAgICAgX1JlY29yZEJhdGNoLnN0YXJ0UmVjb3JkQmF0Y2goYikgfHxcbiAgICAgICAgX1JlY29yZEJhdGNoLmFkZExlbmd0aChiLCBuZXcgTG9uZyhub2RlLmxlbmd0aCwgMCkpIHx8XG4gICAgICAgIF9SZWNvcmRCYXRjaC5hZGROb2RlcyhiLCBub2Rlc09mZnNldCkgfHxcbiAgICAgICAgX1JlY29yZEJhdGNoLmFkZEJ1ZmZlcnMoYiwgYnVmZmVyc09mZnNldCkgfHxcbiAgICAgICAgX1JlY29yZEJhdGNoLmVuZFJlY29yZEJhdGNoKGIpXG4gICAgKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVEaWN0aW9uYXJ5QmF0Y2goYjogQnVpbGRlciwgbm9kZTogRGljdGlvbmFyeUJhdGNoKSB7XG4gICAgY29uc3QgZGF0YU9mZnNldCA9IHdyaXRlUmVjb3JkQmF0Y2goYiwgbm9kZS5kYXRhKTtcbiAgICByZXR1cm4gKFxuICAgICAgICBfRGljdGlvbmFyeUJhdGNoLnN0YXJ0RGljdGlvbmFyeUJhdGNoKGIpIHx8XG4gICAgICAgIF9EaWN0aW9uYXJ5QmF0Y2guYWRkSWQoYiwgbmV3IExvbmcobm9kZS5pZCwgMCkpIHx8XG4gICAgICAgIF9EaWN0aW9uYXJ5QmF0Y2guYWRkSXNEZWx0YShiLCBub2RlLmlzRGVsdGEpIHx8XG4gICAgICAgIF9EaWN0aW9uYXJ5QmF0Y2guYWRkRGF0YShiLCBkYXRhT2Zmc2V0KSB8fFxuICAgICAgICBfRGljdGlvbmFyeUJhdGNoLmVuZERpY3Rpb25hcnlCYXRjaChiKVxuICAgICk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlQnVmZmVyKGI6IEJ1aWxkZXIsIG5vZGU6IEJ1ZmZlck1ldGFkYXRhKSB7XG4gICAgcmV0dXJuIF9CdWZmZXIuY3JlYXRlQnVmZmVyKGIsIG5ldyBMb25nKG5vZGUub2Zmc2V0LCAwKSwgbmV3IExvbmcobm9kZS5sZW5ndGgsIDApKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVGaWVsZE5vZGUoYjogQnVpbGRlciwgbm9kZTogRmllbGRNZXRhZGF0YSkge1xuICAgIHJldHVybiBfRmllbGROb2RlLmNyZWF0ZUZpZWxkTm9kZShiLCBuZXcgTG9uZyhub2RlLmxlbmd0aCwgMCksIG5ldyBMb25nKG5vZGUubnVsbENvdW50LCAwKSk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlRmllbGQoYjogQnVpbGRlciwgbm9kZTogRmllbGQpIHtcbiAgICBsZXQgdHlwZU9mZnNldCA9IC0xO1xuICAgIGxldCB0eXBlID0gbm9kZS50eXBlO1xuICAgIGxldCB0eXBlSWQgPSBub2RlLnR5cGVJZDtcbiAgICBsZXQgbmFtZTogbnVtYmVyIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGxldCBtZXRhZGF0YTogbnVtYmVyIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGxldCBkaWN0aW9uYXJ5OiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgICBpZiAoIURhdGFUeXBlLmlzRGljdGlvbmFyeSh0eXBlKSkge1xuICAgICAgICB0eXBlT2Zmc2V0ID0gbmV3IFR5cGVTZXJpYWxpemVyKGIpLnZpc2l0KHR5cGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHR5cGVJZCA9IHR5cGUuZGljdGlvbmFyeS5UVHlwZTtcbiAgICAgICAgZGljdGlvbmFyeSA9IG5ldyBUeXBlU2VyaWFsaXplcihiKS52aXNpdCh0eXBlKTtcbiAgICAgICAgdHlwZU9mZnNldCA9IG5ldyBUeXBlU2VyaWFsaXplcihiKS52aXNpdCh0eXBlLmRpY3Rpb25hcnkpO1xuICAgIH1cblxuICAgIGxldCBjaGlsZHJlbiA9IF9GaWVsZC5jcmVhdGVDaGlsZHJlblZlY3RvcihiLCAodHlwZS5jaGlsZHJlbiB8fCBbXSkubWFwKChmKSA9PiB3cml0ZUZpZWxkKGIsIGYpKSk7XG4gICAgaWYgKG5vZGUubWV0YWRhdGEgJiYgbm9kZS5tZXRhZGF0YS5zaXplID4gMCkge1xuICAgICAgICBtZXRhZGF0YSA9IF9GaWVsZC5jcmVhdGVDdXN0b21NZXRhZGF0YVZlY3RvcihcbiAgICAgICAgICAgIGIsXG4gICAgICAgICAgICBbLi4ubm9kZS5tZXRhZGF0YV0ubWFwKChbaywgdl0pID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBrZXkgPSBiLmNyZWF0ZVN0cmluZyhgJHtrfWApO1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IGIuY3JlYXRlU3RyaW5nKGAke3Z9YCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgICAgX0tleVZhbHVlLnN0YXJ0S2V5VmFsdWUoYikgfHxcbiAgICAgICAgICAgICAgICAgICAgX0tleVZhbHVlLmFkZEtleShiLCBrZXkpIHx8XG4gICAgICAgICAgICAgICAgICAgIF9LZXlWYWx1ZS5hZGRWYWx1ZShiLCB2YWwpIHx8XG4gICAgICAgICAgICAgICAgICAgIF9LZXlWYWx1ZS5lbmRLZXlWYWx1ZShiKVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgIH1cbiAgICBpZiAobm9kZS5uYW1lKSB7XG4gICAgICAgIG5hbWUgPSBiLmNyZWF0ZVN0cmluZyhub2RlLm5hbWUpO1xuICAgIH1cbiAgICByZXR1cm4gKFxuICAgICAgICBfRmllbGQuc3RhcnRGaWVsZChiKSB8fFxuICAgICAgICBfRmllbGQuYWRkVHlwZShiLCB0eXBlT2Zmc2V0KSB8fFxuICAgICAgICBfRmllbGQuYWRkVHlwZVR5cGUoYiwgdHlwZUlkKSB8fFxuICAgICAgICBfRmllbGQuYWRkQ2hpbGRyZW4oYiwgY2hpbGRyZW4pIHx8XG4gICAgICAgIF9GaWVsZC5hZGROdWxsYWJsZShiLCAhIW5vZGUubnVsbGFibGUpIHx8XG4gICAgICAgIChuYW1lICE9PSB1bmRlZmluZWQgJiYgX0ZpZWxkLmFkZE5hbWUoYiwgbmFtZSkpIHx8XG4gICAgICAgIChkaWN0aW9uYXJ5ICE9PSB1bmRlZmluZWQgJiYgX0ZpZWxkLmFkZERpY3Rpb25hcnkoYiwgZGljdGlvbmFyeSkpIHx8XG4gICAgICAgIChtZXRhZGF0YSAhPT0gdW5kZWZpbmVkICYmIF9GaWVsZC5hZGRDdXN0b21NZXRhZGF0YShiLCBtZXRhZGF0YSkpIHx8XG4gICAgICAgIF9GaWVsZC5lbmRGaWVsZChiKVxuICAgICk7XG59XG5cbmZ1bmN0aW9uIG1hcFJldmVyc2U8VCwgVT4oc291cmNlOiBUW10sIGNhbGxiYWNrZm46ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gVSk6IFVbXSB7XG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IEFycmF5KHNvdXJjZS5sZW5ndGgpO1xuICAgIGZvciAobGV0IGkgPSAtMSwgaiA9IHNvdXJjZS5sZW5ndGg7IC0taiA+IC0xOykge1xuICAgICAgICByZXN1bHRbaV0gPSBjYWxsYmFja2ZuKHNvdXJjZVtqXSwgaSwgc291cmNlKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuY29uc3QgcGxhdGZvcm1Jc0xpdHRsZUVuZGlhbiA9IChmdW5jdGlvbigpIHtcbiAgICBjb25zdCBidWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIoMik7XG4gICAgbmV3IERhdGFWaWV3KGJ1ZmZlcikuc2V0SW50MTYoMCwgMjU2LCB0cnVlIC8qIGxpdHRsZUVuZGlhbiAqLyk7XG4gICAgLy8gSW50MTZBcnJheSB1c2VzIHRoZSBwbGF0Zm9ybSdzIGVuZGlhbm5lc3MuXG4gICAgcmV0dXJuIG5ldyBJbnQxNkFycmF5KGJ1ZmZlcilbMF0gPT09IDI1Njtcbn0pKCk7XG4iXX0=

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
    let metadataLength, bodyLength, byteLength = buffer.byteLength;
    buffer.set(MAGIC, 0);
    yield buffer;
    // Then yield the schema
    ({ metadataLength, buffer } = serializeMessage(table.schema));
    byteLength += buffer.byteLength;
    yield buffer;
    for (const [id, field] of table.schema.dictionaries) {
        const vec = table.getColumn(field.name);
        if (vec && vec.dictionary) {
            ({ metadataLength, bodyLength, buffer } = serializeDictionaryBatch(vec.dictionary, id));
            dictionaryBatches.push(new FileBlock(metadataLength, bodyLength, byteLength));
            byteLength += buffer.byteLength;
            yield buffer;
        }
    }
    for (const recordBatch of table.batches) {
        ({ metadataLength, bodyLength, buffer } = serializeRecordBatch(recordBatch));
        recordBatches.push(new FileBlock(metadataLength, bodyLength, byteLength));
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
    return { metadataLength, bodyLength: message.bodyLength, buffer: messageBytes };
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
        const { length, values } = data;
        const scaledLength = length * (view.size || 1);
        return this.addBuffer(values.subarray(0, scaledLength));
    }
    visitFlatListVector(vector) {
        const { data, length } = vector;
        const { values, valueOffsets } = data;
        const firstOffset = valueOffsets[0];
        const lastOffset = valueOffsets[length];
        const byteLength = Math.min(lastOffset - firstOffset, values.byteLength - firstOffset);
        // Push in the order FlatList types read their buffers
        // valueOffsets buffer first
        this.addBuffer(this.getZeroBasedValueOffsets(0, length, valueOffsets));
        // sliced values buffer second
        this.addBuffer(values.subarray(firstOffset, firstOffset + byteLength));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFNLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHO1FBQzNDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztLQUNoRDtJQUNELE9BQU8sTUFBTSxDQUFDO0FBQ2xCLENBQUM7QUFFRCxNQUFNLHNCQUFzQixHQUFHLENBQUM7SUFDNUIsTUFBTSxNQUFNLEdBQUcsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEMsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDL0QsNkNBQTZDO0lBQzdDLE9BQU8sSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxFQUFFLENBQUMiLCJmaWxlIjoiaXBjL3dyaXRlci9iaW5hcnkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgVGFibGUgfSBmcm9tICcuLi8uLi90YWJsZSc7XG5pbXBvcnQgeyBEZW5zZVVuaW9uRGF0YSB9IGZyb20gJy4uLy4uL2RhdGEnO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2ggfSBmcm9tICcuLi8uLi9yZWNvcmRiYXRjaCc7XG5pbXBvcnQgeyBWZWN0b3JWaXNpdG9yLCBUeXBlVmlzaXRvciB9IGZyb20gJy4uLy4uL3Zpc2l0b3InO1xuaW1wb3J0IHsgTUFHSUMsIG1hZ2ljTGVuZ3RoLCBtYWdpY0FuZFBhZGRpbmcsIFBBRERJTkcgfSBmcm9tICcuLi9tYWdpYyc7XG5pbXBvcnQgeyBhbGlnbiwgZ2V0Qm9vbCwgcGFja0Jvb2xzLCBpdGVyYXRlQml0cyB9IGZyb20gJy4uLy4uL3V0aWwvYml0JztcbmltcG9ydCB7IFZlY3RvciwgVW5pb25WZWN0b3IsIERpY3Rpb25hcnlWZWN0b3IsIE5lc3RlZFZlY3RvciwgTGlzdFZlY3RvciB9IGZyb20gJy4uLy4uL3ZlY3Rvcic7XG5pbXBvcnQgeyBCdWZmZXJNZXRhZGF0YSwgRmllbGRNZXRhZGF0YSwgRm9vdGVyLCBGaWxlQmxvY2ssIE1lc3NhZ2UsIFJlY29yZEJhdGNoTWV0YWRhdGEsIERpY3Rpb25hcnlCYXRjaCB9IGZyb20gJy4uL21ldGFkYXRhJztcbmltcG9ydCB7XG4gICAgU2NoZW1hLCBGaWVsZCwgVHlwZWRBcnJheSwgTWV0YWRhdGFWZXJzaW9uLFxuICAgIERhdGFUeXBlLFxuICAgIERpY3Rpb25hcnksXG4gICAgTnVsbCwgSW50LCBGbG9hdCxcbiAgICBCaW5hcnksIEJvb2wsIFV0ZjgsIERlY2ltYWwsXG4gICAgRGF0ZV8sIFRpbWUsIFRpbWVzdGFtcCwgSW50ZXJ2YWwsXG4gICAgTGlzdCwgU3RydWN0LCBVbmlvbiwgRml4ZWRTaXplQmluYXJ5LCBGaXhlZFNpemVMaXN0LCBNYXBfLFxuICAgIEZsYXRUeXBlLCBGbGF0TGlzdFR5cGUsIE5lc3RlZFR5cGUsIFVuaW9uTW9kZSwgU3BhcnNlVW5pb24sIERlbnNlVW5pb24sIFNpbmdsZU5lc3RlZFR5cGUsXG59IGZyb20gJy4uLy4uL3R5cGUnO1xuXG5leHBvcnQgZnVuY3Rpb24qIHNlcmlhbGl6ZVN0cmVhbSh0YWJsZTogVGFibGUpIHtcbiAgICB5aWVsZCBzZXJpYWxpemVNZXNzYWdlKHRhYmxlLnNjaGVtYSkuYnVmZmVyO1xuICAgIGZvciAoY29uc3QgW2lkLCBmaWVsZF0gb2YgdGFibGUuc2NoZW1hLmRpY3Rpb25hcmllcykge1xuICAgICAgICBjb25zdCB2ZWMgPSB0YWJsZS5nZXRDb2x1bW4oZmllbGQubmFtZSkgYXMgRGljdGlvbmFyeVZlY3RvcjtcbiAgICAgICAgaWYgKHZlYyAmJiB2ZWMuZGljdGlvbmFyeSkge1xuICAgICAgICAgICAgeWllbGQgc2VyaWFsaXplRGljdGlvbmFyeUJhdGNoKHZlYy5kaWN0aW9uYXJ5LCBpZCkuYnVmZmVyO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgcmVjb3JkQmF0Y2ggb2YgdGFibGUuYmF0Y2hlcykge1xuICAgICAgICB5aWVsZCBzZXJpYWxpemVSZWNvcmRCYXRjaChyZWNvcmRCYXRjaCkuYnVmZmVyO1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uKiBzZXJpYWxpemVGaWxlKHRhYmxlOiBUYWJsZSkge1xuXG4gICAgY29uc3QgcmVjb3JkQmF0Y2hlcyA9IFtdO1xuICAgIGNvbnN0IGRpY3Rpb25hcnlCYXRjaGVzID0gW107XG5cbiAgICAvLyBGaXJzdCB5aWVsZCB0aGUgbWFnaWMgc3RyaW5nIChhbGlnbmVkKVxuICAgIGxldCBidWZmZXIgPSBuZXcgVWludDhBcnJheShhbGlnbihtYWdpY0xlbmd0aCwgOCkpO1xuICAgIGxldCBtZXRhZGF0YUxlbmd0aCwgYm9keUxlbmd0aCwgYnl0ZUxlbmd0aCA9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgIGJ1ZmZlci5zZXQoTUFHSUMsIDApO1xuICAgIHlpZWxkIGJ1ZmZlcjtcblxuICAgIC8vIFRoZW4geWllbGQgdGhlIHNjaGVtYVxuICAgICh7IG1ldGFkYXRhTGVuZ3RoLCBidWZmZXIgfSA9IHNlcmlhbGl6ZU1lc3NhZ2UodGFibGUuc2NoZW1hKSk7XG4gICAgYnl0ZUxlbmd0aCArPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICB5aWVsZCBidWZmZXI7XG5cbiAgICBmb3IgKGNvbnN0IFtpZCwgZmllbGRdIG9mIHRhYmxlLnNjaGVtYS5kaWN0aW9uYXJpZXMpIHtcbiAgICAgICAgY29uc3QgdmVjID0gdGFibGUuZ2V0Q29sdW1uKGZpZWxkLm5hbWUpIGFzIERpY3Rpb25hcnlWZWN0b3I7XG4gICAgICAgIGlmICh2ZWMgJiYgdmVjLmRpY3Rpb25hcnkpIHtcbiAgICAgICAgICAgICh7IG1ldGFkYXRhTGVuZ3RoLCBib2R5TGVuZ3RoLCBidWZmZXIgfSA9IHNlcmlhbGl6ZURpY3Rpb25hcnlCYXRjaCh2ZWMuZGljdGlvbmFyeSwgaWQpKTtcbiAgICAgICAgICAgIGRpY3Rpb25hcnlCYXRjaGVzLnB1c2gobmV3IEZpbGVCbG9jayhtZXRhZGF0YUxlbmd0aCwgYm9keUxlbmd0aCwgYnl0ZUxlbmd0aCkpO1xuICAgICAgICAgICAgYnl0ZUxlbmd0aCArPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgICAgIHlpZWxkIGJ1ZmZlcjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IHJlY29yZEJhdGNoIG9mIHRhYmxlLmJhdGNoZXMpIHtcbiAgICAgICAgKHsgbWV0YWRhdGFMZW5ndGgsIGJvZHlMZW5ndGgsIGJ1ZmZlciB9ID0gc2VyaWFsaXplUmVjb3JkQmF0Y2gocmVjb3JkQmF0Y2gpKTtcbiAgICAgICAgcmVjb3JkQmF0Y2hlcy5wdXNoKG5ldyBGaWxlQmxvY2sobWV0YWRhdGFMZW5ndGgsIGJvZHlMZW5ndGgsIGJ5dGVMZW5ndGgpKTtcbiAgICAgICAgYnl0ZUxlbmd0aCArPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgeWllbGQgYnVmZmVyO1xuICAgIH1cblxuICAgIC8vIFRoZW4geWllbGQgdGhlIGZvb3RlciBtZXRhZGF0YSAobm90IGFsaWduZWQpXG4gICAgKHsgbWV0YWRhdGFMZW5ndGgsIGJ1ZmZlciB9ID0gc2VyaWFsaXplRm9vdGVyKG5ldyBGb290ZXIoZGljdGlvbmFyeUJhdGNoZXMsIHJlY29yZEJhdGNoZXMsIHRhYmxlLnNjaGVtYSkpKTtcbiAgICB5aWVsZCBidWZmZXI7XG5cbiAgICAvLyBMYXN0LCB5aWVsZCB0aGUgZm9vdGVyIGxlbmd0aCArIHRlcm1pbmF0aW5nIG1hZ2ljIGFycm93IHN0cmluZyAoYWxpZ25lZClcbiAgICBidWZmZXIgPSBuZXcgVWludDhBcnJheShtYWdpY0FuZFBhZGRpbmcpO1xuICAgIG5ldyBEYXRhVmlldyhidWZmZXIuYnVmZmVyKS5zZXRJbnQzMigwLCBtZXRhZGF0YUxlbmd0aCwgcGxhdGZvcm1Jc0xpdHRsZUVuZGlhbik7XG4gICAgYnVmZmVyLnNldChNQUdJQywgYnVmZmVyLmJ5dGVMZW5ndGggLSBtYWdpY0xlbmd0aCk7XG4gICAgeWllbGQgYnVmZmVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VyaWFsaXplUmVjb3JkQmF0Y2gocmVjb3JkQmF0Y2g6IFJlY29yZEJhdGNoKSB7XG4gICAgY29uc3QgeyBieXRlTGVuZ3RoLCBmaWVsZE5vZGVzLCBidWZmZXJzLCBidWZmZXJzTWV0YSB9ID0gbmV3IFJlY29yZEJhdGNoU2VyaWFsaXplcigpLnZpc2l0UmVjb3JkQmF0Y2gocmVjb3JkQmF0Y2gpO1xuICAgIGNvbnN0IHJiTWV0YSA9IG5ldyBSZWNvcmRCYXRjaE1ldGFkYXRhKE1ldGFkYXRhVmVyc2lvbi5WNCwgcmVjb3JkQmF0Y2gubGVuZ3RoLCBmaWVsZE5vZGVzLCBidWZmZXJzTWV0YSk7XG4gICAgY29uc3QgcmJEYXRhID0gY29uY2F0QnVmZmVyc1dpdGhNZXRhZGF0YShieXRlTGVuZ3RoLCBidWZmZXJzLCBidWZmZXJzTWV0YSk7XG4gICAgcmV0dXJuIHNlcmlhbGl6ZU1lc3NhZ2UocmJNZXRhLCByYkRhdGEpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VyaWFsaXplRGljdGlvbmFyeUJhdGNoKGRpY3Rpb25hcnk6IFZlY3RvciwgaWQ6IExvbmcgfCBudW1iZXIsIGlzRGVsdGE6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgIGNvbnN0IHsgYnl0ZUxlbmd0aCwgZmllbGROb2RlcywgYnVmZmVycywgYnVmZmVyc01ldGEgfSA9IG5ldyBSZWNvcmRCYXRjaFNlcmlhbGl6ZXIoKS52aXNpdFJlY29yZEJhdGNoKFJlY29yZEJhdGNoLmZyb20oW2RpY3Rpb25hcnldKSk7XG4gICAgY29uc3QgcmJNZXRhID0gbmV3IFJlY29yZEJhdGNoTWV0YWRhdGEoTWV0YWRhdGFWZXJzaW9uLlY0LCBkaWN0aW9uYXJ5Lmxlbmd0aCwgZmllbGROb2RlcywgYnVmZmVyc01ldGEpO1xuICAgIGNvbnN0IGRiTWV0YSA9IG5ldyBEaWN0aW9uYXJ5QmF0Y2goTWV0YWRhdGFWZXJzaW9uLlY0LCByYk1ldGEsIGlkLCBpc0RlbHRhKTtcbiAgICBjb25zdCByYkRhdGEgPSBjb25jYXRCdWZmZXJzV2l0aE1ldGFkYXRhKGJ5dGVMZW5ndGgsIGJ1ZmZlcnMsIGJ1ZmZlcnNNZXRhKTtcbiAgICByZXR1cm4gc2VyaWFsaXplTWVzc2FnZShkYk1ldGEsIHJiRGF0YSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVNZXNzYWdlKG1lc3NhZ2U6IE1lc3NhZ2UsIGRhdGE/OiBVaW50OEFycmF5KSB7XG4gICAgY29uc3QgYiA9IG5ldyBCdWlsZGVyKCk7XG4gICAgX01lc3NhZ2UuZmluaXNoTWVzc2FnZUJ1ZmZlcihiLCB3cml0ZU1lc3NhZ2UoYiwgbWVzc2FnZSkpO1xuICAgIC8vIFNsaWNlIG91dCB0aGUgYnVmZmVyIHRoYXQgY29udGFpbnMgdGhlIG1lc3NhZ2UgbWV0YWRhdGFcbiAgICBjb25zdCBtZXRhZGF0YUJ5dGVzID0gYi5hc1VpbnQ4QXJyYXkoKTtcbiAgICAvLyBSZXNlcnZlIDQgYnl0ZXMgZm9yIHdyaXRpbmcgdGhlIG1lc3NhZ2Ugc2l6ZSBhdCB0aGUgZnJvbnQuXG4gICAgLy8gTWV0YWRhdGEgbGVuZ3RoIGluY2x1ZGVzIHRoZSBtZXRhZGF0YSBieXRlTGVuZ3RoICsgdGhlIDRcbiAgICAvLyBieXRlcyBmb3IgdGhlIGxlbmd0aCwgYW5kIHJvdW5kZWQgdXAgdG8gdGhlIG5lYXJlc3QgOCBieXRlcy5cbiAgICBjb25zdCBtZXRhZGF0YUxlbmd0aCA9IGFsaWduKFBBRERJTkcgKyBtZXRhZGF0YUJ5dGVzLmJ5dGVMZW5ndGgsIDgpO1xuICAgIC8vICsgdGhlIGxlbmd0aCBvZiB0aGUgb3B0aW9uYWwgZGF0YSBidWZmZXIgYXQgdGhlIGVuZCwgcGFkZGVkXG4gICAgY29uc3QgZGF0YUJ5dGVMZW5ndGggPSBkYXRhID8gZGF0YS5ieXRlTGVuZ3RoIDogMDtcbiAgICAvLyBlbnN1cmUgdGhlIGVudGlyZSBtZXNzYWdlIGlzIGFsaWduZWQgdG8gYW4gOC1ieXRlIGJvdW5kYXJ5XG4gICAgY29uc3QgbWVzc2FnZUJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoYWxpZ24obWV0YWRhdGFMZW5ndGggKyBkYXRhQnl0ZUxlbmd0aCwgOCkpO1xuICAgIC8vIFdyaXRlIHRoZSBtZXRhZGF0YSBsZW5ndGggaW50byB0aGUgZmlyc3QgNCBieXRlcywgYnV0IHN1YnRyYWN0IHRoZVxuICAgIC8vIGJ5dGVzIHdlIHVzZSB0byBob2xkIHRoZSBsZW5ndGggaXRzZWxmLlxuICAgIG5ldyBEYXRhVmlldyhtZXNzYWdlQnl0ZXMuYnVmZmVyKS5zZXRJbnQzMigwLCBtZXRhZGF0YUxlbmd0aCAtIFBBRERJTkcsIHBsYXRmb3JtSXNMaXR0bGVFbmRpYW4pO1xuICAgIC8vIENvcHkgdGhlIG1ldGFkYXRhIGJ5dGVzIGludG8gdGhlIG1lc3NhZ2UgYnVmZmVyXG4gICAgbWVzc2FnZUJ5dGVzLnNldChtZXRhZGF0YUJ5dGVzLCBQQURESU5HKTtcbiAgICAvLyBDb3B5IHRoZSBvcHRpb25hbCBkYXRhIGJ1ZmZlciBhZnRlciB0aGUgbWV0YWRhdGEgYnl0ZXNcbiAgICAoZGF0YSAmJiBkYXRhQnl0ZUxlbmd0aCA+IDApICYmIG1lc3NhZ2VCeXRlcy5zZXQoZGF0YSwgbWV0YWRhdGFMZW5ndGgpO1xuICAgIC8vIGlmIChtZXNzYWdlQnl0ZXMuYnl0ZUxlbmd0aCAlIDggIT09IDApIHsgZGVidWdnZXI7IH1cbiAgICAvLyBSZXR1cm4gdGhlIG1ldGFkYXRhIGxlbmd0aCBiZWNhdXNlIHdlIG5lZWQgdG8gd3JpdGUgaXQgaW50byBlYWNoIEZpbGVCbG9jayBhbHNvXG4gICAgcmV0dXJuIHsgbWV0YWRhdGFMZW5ndGgsIGJvZHlMZW5ndGg6IG1lc3NhZ2UuYm9keUxlbmd0aCwgYnVmZmVyOiBtZXNzYWdlQnl0ZXMgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZUZvb3Rlcihmb290ZXI6IEZvb3Rlcikge1xuICAgIGNvbnN0IGIgPSBuZXcgQnVpbGRlcigpO1xuICAgIF9Gb290ZXIuZmluaXNoRm9vdGVyQnVmZmVyKGIsIHdyaXRlRm9vdGVyKGIsIGZvb3RlcikpO1xuICAgIC8vIFNsaWNlIG91dCB0aGUgYnVmZmVyIHRoYXQgY29udGFpbnMgdGhlIGZvb3RlciBtZXRhZGF0YVxuICAgIGNvbnN0IGZvb3RlckJ5dGVzID0gYi5hc1VpbnQ4QXJyYXkoKTtcbiAgICBjb25zdCBtZXRhZGF0YUxlbmd0aCA9IGZvb3RlckJ5dGVzLmJ5dGVMZW5ndGg7XG4gICAgcmV0dXJuIHsgbWV0YWRhdGFMZW5ndGgsIGJ1ZmZlcjogZm9vdGVyQnl0ZXMgfTtcbn1cblxuZXhwb3J0IGNsYXNzIFJlY29yZEJhdGNoU2VyaWFsaXplciBleHRlbmRzIFZlY3RvclZpc2l0b3Ige1xuICAgIHB1YmxpYyBieXRlTGVuZ3RoID0gMDtcbiAgICBwdWJsaWMgYnVmZmVyczogVHlwZWRBcnJheVtdID0gW107XG4gICAgcHVibGljIGZpZWxkTm9kZXM6IEZpZWxkTWV0YWRhdGFbXSA9IFtdO1xuICAgIHB1YmxpYyBidWZmZXJzTWV0YTogQnVmZmVyTWV0YWRhdGFbXSA9IFtdO1xuICAgIHB1YmxpYyB2aXNpdFJlY29yZEJhdGNoKHJlY29yZEJhdGNoOiBSZWNvcmRCYXRjaCkge1xuICAgICAgICB0aGlzLmJ1ZmZlcnMgPSBbXTtcbiAgICAgICAgdGhpcy5ieXRlTGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5maWVsZE5vZGVzID0gW107XG4gICAgICAgIHRoaXMuYnVmZmVyc01ldGEgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgdmVjdG9yOiBWZWN0b3IsIGluZGV4ID0gLTEsIG51bUNvbHMgPSByZWNvcmRCYXRjaC5udW1Db2xzOyArK2luZGV4IDwgbnVtQ29sczspIHtcbiAgICAgICAgICAgIGlmICh2ZWN0b3IgPSByZWNvcmRCYXRjaC5nZXRDaGlsZEF0KGluZGV4KSEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnZpc2l0KHZlY3Rvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdDxUIGV4dGVuZHMgRGF0YVR5cGU+KHZlY3RvcjogVmVjdG9yPFQ+KSB7XG4gICAgICAgIGlmICghRGF0YVR5cGUuaXNEaWN0aW9uYXJ5KHZlY3Rvci50eXBlKSkge1xuICAgICAgICAgICAgY29uc3QgeyBkYXRhLCBsZW5ndGgsIG51bGxDb3VudCB9ID0gdmVjdG9yO1xuICAgICAgICAgICAgaWYgKGxlbmd0aCA+IDIxNDc0ODM2NDcpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQ2Fubm90IHdyaXRlIGFycmF5cyBsYXJnZXIgdGhhbiAyXjMxIC0gMSBpbiBsZW5ndGgnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZmllbGROb2Rlcy5wdXNoKG5ldyBGaWVsZE1ldGFkYXRhKGxlbmd0aCwgbnVsbENvdW50KSk7XG4gICAgICAgICAgICB0aGlzLmFkZEJ1ZmZlcihudWxsQ291bnQgPD0gMFxuICAgICAgICAgICAgICAgID8gbmV3IFVpbnQ4QXJyYXkoMCkgLy8gcGxhY2Vob2xkZXIgdmFsaWRpdHkgYnVmZmVyXG4gICAgICAgICAgICAgICAgOiB0aGlzLmdldFRydW5jYXRlZEJpdG1hcChkYXRhLm9mZnNldCwgbGVuZ3RoLCBkYXRhLm51bGxCaXRtYXAhKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3VwZXIudmlzaXQodmVjdG9yKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0TnVsbCAgICAgICAgICAgKF9udWxsejogVmVjdG9yPE51bGw+KSAgICAgICAgICAgIHsgcmV0dXJuIHRoaXM7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdEJvb2wgICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxCb29sPikgICAgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0Qm9vbFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRJbnQgICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8SW50PikgICAgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0RmxvYXQgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPEZsb2F0PikgICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdFV0ZjggICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxVdGY4PikgICAgICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdExpc3RWZWN0b3IodmVjdG9yKTsgIH1cbiAgICBwdWJsaWMgdmlzaXRCaW5hcnkgICAgICAgICAodmVjdG9yOiBWZWN0b3I8QmluYXJ5PikgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRMaXN0VmVjdG9yKHZlY3Rvcik7ICB9XG4gICAgcHVibGljIHZpc2l0RGF0ZSAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPERhdGVfPikgICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdFRpbWVzdGFtcCAgICAgICh2ZWN0b3I6IFZlY3RvcjxUaW1lc3RhbXA+KSAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRUaW1lICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8VGltZT4pICAgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdEZsYXRWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0RGVjaW1hbCAgICAgICAgKHZlY3RvcjogVmVjdG9yPERlY2ltYWw+KSAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXRGbGF0VmVjdG9yKHZlY3Rvcik7ICAgICAgfVxuICAgIHB1YmxpYyB2aXNpdEludGVydmFsICAgICAgICh2ZWN0b3I6IFZlY3RvcjxJbnRlcnZhbD4pICAgICAgICB7IHJldHVybiB0aGlzLnZpc2l0RmxhdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRMaXN0ICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8TGlzdD4pICAgICAgICAgICAgeyByZXR1cm4gdGhpcy52aXNpdExpc3RWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0U3RydWN0ICAgICAgICAgKHZlY3RvcjogVmVjdG9yPFN0cnVjdD4pICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXROZXN0ZWRWZWN0b3IodmVjdG9yKTsgICAgfVxuICAgIHB1YmxpYyB2aXNpdEZpeGVkU2l6ZUJpbmFyeSh2ZWN0b3I6IFZlY3RvcjxGaXhlZFNpemVCaW5hcnk+KSB7IHJldHVybiB0aGlzLnZpc2l0RmxhdFZlY3Rvcih2ZWN0b3IpOyAgICAgIH1cbiAgICBwdWJsaWMgdmlzaXRGaXhlZFNpemVMaXN0ICAodmVjdG9yOiBWZWN0b3I8Rml4ZWRTaXplTGlzdD4pICAgeyByZXR1cm4gdGhpcy52aXNpdExpc3RWZWN0b3IodmVjdG9yKTsgICAgICB9XG4gICAgcHVibGljIHZpc2l0TWFwICAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPE1hcF8+KSAgICAgICAgICAgIHsgcmV0dXJuIHRoaXMudmlzaXROZXN0ZWRWZWN0b3IodmVjdG9yKTsgICAgfVxuICAgIHB1YmxpYyB2aXNpdERpY3Rpb25hcnkgICAgICh2ZWN0b3I6IERpY3Rpb25hcnlWZWN0b3IpICAgICAgICB7XG4gICAgICAgIC8vIERpY3Rpb25hcnkgd3JpdHRlbiBvdXQgc2VwYXJhdGVseS4gU2xpY2Ugb2Zmc2V0IGNvbnRhaW5lZCBpbiB0aGUgaW5kaWNlc1xuICAgICAgICByZXR1cm4gdGhpcy52aXNpdCh2ZWN0b3IuaW5kaWNlcyk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdFVuaW9uKHZlY3RvcjogVmVjdG9yPERlbnNlVW5pb24gfCBTcGFyc2VVbmlvbj4pIHtcbiAgICAgICAgY29uc3QgeyBkYXRhLCB0eXBlLCBsZW5ndGggfSA9IHZlY3RvcjtcbiAgICAgICAgY29uc3QgeyBvZmZzZXQ6IHNsaWNlT2Zmc2V0LCB0eXBlSWRzIH0gPSBkYXRhO1xuICAgICAgICAvLyBBbGwgVW5pb24gVmVjdG9ycyBoYXZlIGEgdHlwZUlkcyBidWZmZXJcbiAgICAgICAgdGhpcy5hZGRCdWZmZXIodHlwZUlkcyk7XG4gICAgICAgIC8vIElmIHRoaXMgaXMgYSBTcGFyc2UgVW5pb24sIHRyZWF0IGl0IGxpa2UgYWxsIG90aGVyIE5lc3RlZCB0eXBlc1xuICAgICAgICBpZiAodHlwZS5tb2RlID09PSBVbmlvbk1vZGUuU3BhcnNlKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52aXNpdE5lc3RlZFZlY3Rvcih2ZWN0b3IpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUubW9kZSA9PT0gVW5pb25Nb2RlLkRlbnNlKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGlzIGlzIGEgRGVuc2UgVW5pb24sIGFkZCB0aGUgdmFsdWVPZmZzZXRzIGJ1ZmZlciBhbmQgcG90ZW50aWFsbHkgc2xpY2UgdGhlIGNoaWxkcmVuXG4gICAgICAgICAgICBjb25zdCB2YWx1ZU9mZnNldHMgPSAoZGF0YSBhcyBEZW5zZVVuaW9uRGF0YSkudmFsdWVPZmZzZXRzO1xuICAgICAgICAgICAgaWYgKHNsaWNlT2Zmc2V0IDw9IDApIHtcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgVmVjdG9yIGhhc24ndCBiZWVuIHNsaWNlZCwgd3JpdGUgdGhlIGV4aXN0aW5nIHZhbHVlT2Zmc2V0c1xuICAgICAgICAgICAgICAgIHRoaXMuYWRkQnVmZmVyKHZhbHVlT2Zmc2V0cyk7XG4gICAgICAgICAgICAgICAgLy8gV2UgY2FuIHRyZWF0IHRoaXMgbGlrZSBhbGwgb3RoZXIgTmVzdGVkIHR5cGVzXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudmlzaXROZXN0ZWRWZWN0b3IodmVjdG9yKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gQSBzbGljZWQgRGVuc2UgVW5pb24gaXMgYW4gdW5wbGVhc2FudCBjYXNlLiBCZWNhdXNlIHRoZSBvZmZzZXRzIGFyZSBkaWZmZXJlbnQgZm9yXG4gICAgICAgICAgICAgICAgLy8gZWFjaCBjaGlsZCB2ZWN0b3IsIHdlIG5lZWQgdG8gXCJyZWJhc2VcIiB0aGUgdmFsdWVPZmZzZXRzIGZvciBlYWNoIGNoaWxkXG4gICAgICAgICAgICAgICAgLy8gVW5pb24gdHlwZUlkcyBhcmUgbm90IG5lY2Vzc2FyeSAwLWluZGV4ZWRcbiAgICAgICAgICAgICAgICBjb25zdCBtYXhDaGlsZFR5cGVJZCA9IE1hdGgubWF4KC4uLnR5cGUudHlwZUlkcyk7XG4gICAgICAgICAgICAgICAgY29uc3QgY2hpbGRMZW5ndGhzID0gbmV3IEludDMyQXJyYXkobWF4Q2hpbGRUeXBlSWQgKyAxKTtcbiAgICAgICAgICAgICAgICAvLyBTZXQgYWxsIHRvIC0xIHRvIGluZGljYXRlIHRoYXQgd2UgaGF2ZW4ndCBvYnNlcnZlZCBhIGZpcnN0IG9jY3VycmVuY2Ugb2YgYSBwYXJ0aWN1bGFyIGNoaWxkIHlldFxuICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkT2Zmc2V0cyA9IG5ldyBJbnQzMkFycmF5KG1heENoaWxkVHlwZUlkICsgMSkuZmlsbCgtMSk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2hpZnRlZE9mZnNldHMgPSBuZXcgSW50MzJBcnJheShsZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHVuc2hpZnRlZE9mZnNldHMgPSB0aGlzLmdldFplcm9CYXNlZFZhbHVlT2Zmc2V0cygwLCBsZW5ndGgsIHZhbHVlT2Zmc2V0cyk7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgdHlwZUlkLCBzaGlmdCwgaW5kZXggPSAtMTsgKytpbmRleCA8IGxlbmd0aDspIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZUlkID0gdHlwZUlkc1tpbmRleF07XG4gICAgICAgICAgICAgICAgICAgIC8vIH4oLTEpIHVzZWQgdG8gYmUgZmFzdGVyIHRoYW4geCA9PT0gLTEsIHNvIG1heWJlIHdvcnRoIGJlbmNobWFya2luZyB0aGUgZGlmZmVyZW5jZSBvZiB0aGVzZSB0d28gaW1wbHMgZm9yIGxhcmdlIGRlbnNlIHVuaW9uczpcbiAgICAgICAgICAgICAgICAgICAgLy8gfihzaGlmdCA9IGNoaWxkT2Zmc2V0c1t0eXBlSWRdKSB8fCAoc2hpZnQgPSBjaGlsZE9mZnNldHNbdHlwZUlkXSA9IHVuc2hpZnRlZE9mZnNldHNbaW5kZXhdKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gR29pbmcgd2l0aCB0aGlzIGZvcm0gZm9yIG5vdywgYXMgaXQncyBtb3JlIHJlYWRhYmxlXG4gICAgICAgICAgICAgICAgICAgIGlmICgoc2hpZnQgPSBjaGlsZE9mZnNldHNbdHlwZUlkXSkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaGlmdCA9IGNoaWxkT2Zmc2V0c1t0eXBlSWRdID0gdW5zaGlmdGVkT2Zmc2V0c1t0eXBlSWRdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHNoaWZ0ZWRPZmZzZXRzW2luZGV4XSA9IHVuc2hpZnRlZE9mZnNldHNbaW5kZXhdIC0gc2hpZnQ7XG4gICAgICAgICAgICAgICAgICAgICsrY2hpbGRMZW5ndGhzW3R5cGVJZF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuYWRkQnVmZmVyKHNoaWZ0ZWRPZmZzZXRzKTtcbiAgICAgICAgICAgICAgICAvLyBTbGljZSBhbmQgdmlzaXQgY2hpbGRyZW4gYWNjb3JkaW5nbHlcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjaGlsZEluZGV4ID0gLTEsIG51bUNoaWxkcmVuID0gdHlwZS5jaGlsZHJlbi5sZW5ndGg7ICsrY2hpbGRJbmRleCA8IG51bUNoaWxkcmVuOykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0eXBlSWQgPSB0eXBlLnR5cGVJZHNbY2hpbGRJbmRleF07XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkID0gKHZlY3RvciBhcyBVbmlvblZlY3RvcikuZ2V0Q2hpbGRBdChjaGlsZEluZGV4KSE7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudmlzaXQoY2hpbGQuc2xpY2UoY2hpbGRPZmZzZXRzW3R5cGVJZF0sIE1hdGgubWluKGxlbmd0aCwgY2hpbGRMZW5ndGhzW3R5cGVJZF0pKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgdmlzaXRCb29sVmVjdG9yKHZlY3RvcjogVmVjdG9yPEJvb2w+KSB7XG4gICAgICAgIC8vIEJvb2wgdmVjdG9yIGlzIGEgc3BlY2lhbCBjYXNlIG9mIEZsYXRWZWN0b3IsIGFzIGl0cyBkYXRhIGJ1ZmZlciBuZWVkcyB0byBzdGF5IHBhY2tlZFxuICAgICAgICBsZXQgYml0bWFwOiBVaW50OEFycmF5O1xuICAgICAgICBsZXQgdmFsdWVzLCB7IGRhdGEsIGxlbmd0aCB9ID0gdmVjdG9yO1xuICAgICAgICBpZiAodmVjdG9yLm51bGxDb3VudCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIElmIGFsbCB2YWx1ZXMgYXJlIG51bGwsIGp1c3QgaW5zZXJ0IGEgcGxhY2Vob2xkZXIgZW1wdHkgZGF0YSBidWZmZXIgKGZhc3Rlc3QgcGF0aClcbiAgICAgICAgICAgIGJpdG1hcCA9IG5ldyBVaW50OEFycmF5KDApO1xuICAgICAgICB9IGVsc2UgaWYgKCEoKHZhbHVlcyA9IGRhdGEudmFsdWVzKSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkpKSB7XG4gICAgICAgICAgICAvLyBPdGhlcndpc2UgaWYgdGhlIHVuZGVybHlpbmcgZGF0YSAqaXNuJ3QqIGEgVWludDhBcnJheSwgZW51bWVyYXRlXG4gICAgICAgICAgICAvLyB0aGUgdmFsdWVzIGFzIGJvb2xzIGFuZCByZS1wYWNrIHRoZW0gaW50byBhIFVpbnQ4QXJyYXkgKHNsb3cgcGF0aClcbiAgICAgICAgICAgIGJpdG1hcCA9IHBhY2tCb29scyh2ZWN0b3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlIGp1c3Qgc2xpY2UgdGhlIGJpdG1hcCAoZmFzdCBwYXRoKVxuICAgICAgICAgICAgYml0bWFwID0gdGhpcy5nZXRUcnVuY2F0ZWRCaXRtYXAoZGF0YS5vZmZzZXQsIGxlbmd0aCwgdmFsdWVzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5hZGRCdWZmZXIoYml0bWFwKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHZpc2l0RmxhdFZlY3RvcjxUIGV4dGVuZHMgRmxhdFR5cGU+KHZlY3RvcjogVmVjdG9yPFQ+KSB7XG4gICAgICAgIGNvbnN0IHsgdmlldywgZGF0YSB9ID0gdmVjdG9yO1xuICAgICAgICBjb25zdCB7IGxlbmd0aCwgdmFsdWVzIH0gPSBkYXRhO1xuICAgICAgICBjb25zdCBzY2FsZWRMZW5ndGggPSBsZW5ndGggKiAoKHZpZXcgYXMgYW55KS5zaXplIHx8IDEpO1xuICAgICAgICByZXR1cm4gdGhpcy5hZGRCdWZmZXIodmFsdWVzLnN1YmFycmF5KDAsIHNjYWxlZExlbmd0aCkpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgdmlzaXRGbGF0TGlzdFZlY3RvcjxUIGV4dGVuZHMgRmxhdExpc3RUeXBlPih2ZWN0b3I6IFZlY3RvcjxUPikge1xuICAgICAgICBjb25zdCB7IGRhdGEsIGxlbmd0aCB9ID0gdmVjdG9yO1xuICAgICAgICBjb25zdCB7IHZhbHVlcywgdmFsdWVPZmZzZXRzIH0gPSBkYXRhO1xuICAgICAgICBjb25zdCBmaXJzdE9mZnNldCA9IHZhbHVlT2Zmc2V0c1swXTtcbiAgICAgICAgY29uc3QgbGFzdE9mZnNldCA9IHZhbHVlT2Zmc2V0c1tsZW5ndGhdO1xuICAgICAgICBjb25zdCBieXRlTGVuZ3RoID0gTWF0aC5taW4obGFzdE9mZnNldCAtIGZpcnN0T2Zmc2V0LCB2YWx1ZXMuYnl0ZUxlbmd0aCAtIGZpcnN0T2Zmc2V0KTtcbiAgICAgICAgLy8gUHVzaCBpbiB0aGUgb3JkZXIgRmxhdExpc3QgdHlwZXMgcmVhZCB0aGVpciBidWZmZXJzXG4gICAgICAgIC8vIHZhbHVlT2Zmc2V0cyBidWZmZXIgZmlyc3RcbiAgICAgICAgdGhpcy5hZGRCdWZmZXIodGhpcy5nZXRaZXJvQmFzZWRWYWx1ZU9mZnNldHMoMCwgbGVuZ3RoLCB2YWx1ZU9mZnNldHMpKTtcbiAgICAgICAgLy8gc2xpY2VkIHZhbHVlcyBidWZmZXIgc2Vjb25kXG4gICAgICAgIHRoaXMuYWRkQnVmZmVyKHZhbHVlcy5zdWJhcnJheShmaXJzdE9mZnNldCwgZmlyc3RPZmZzZXQgKyBieXRlTGVuZ3RoKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgdmlzaXRMaXN0VmVjdG9yPFQgZXh0ZW5kcyBTaW5nbGVOZXN0ZWRUeXBlPih2ZWN0b3I6IFZlY3RvcjxUPikge1xuICAgICAgICBjb25zdCB7IGRhdGEsIGxlbmd0aCB9ID0gdmVjdG9yO1xuICAgICAgICBjb25zdCB7IHZhbHVlT2Zmc2V0cyB9ID0gPGFueT4gZGF0YTtcbiAgICAgICAgLy8gSWYgd2UgaGF2ZSB2YWx1ZU9mZnNldHMgKExpc3RWZWN0b3IpLCBwdXNoIHRoYXQgYnVmZmVyIGZpcnN0XG4gICAgICAgIGlmICh2YWx1ZU9mZnNldHMpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkQnVmZmVyKHRoaXMuZ2V0WmVyb0Jhc2VkVmFsdWVPZmZzZXRzKDAsIGxlbmd0aCwgdmFsdWVPZmZzZXRzKSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGhlbiBpbnNlcnQgdGhlIExpc3QncyB2YWx1ZXMgY2hpbGRcbiAgICAgICAgcmV0dXJuIHRoaXMudmlzaXQoKHZlY3RvciBhcyBhbnkgYXMgTGlzdFZlY3RvcjxUPikuZ2V0Q2hpbGRBdCgwKSEpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgdmlzaXROZXN0ZWRWZWN0b3I8VCBleHRlbmRzIE5lc3RlZFR5cGU+KHZlY3RvcjogVmVjdG9yPFQ+KSB7XG4gICAgICAgIC8vIFZpc2l0IHRoZSBjaGlsZHJlbiBhY2NvcmRpbmdseVxuICAgICAgICBjb25zdCBudW1DaGlsZHJlbiA9ICh2ZWN0b3IudHlwZS5jaGlsZHJlbiB8fCBbXSkubGVuZ3RoO1xuICAgICAgICBmb3IgKGxldCBjaGlsZDogVmVjdG9yIHwgbnVsbCwgY2hpbGRJbmRleCA9IC0xOyArK2NoaWxkSW5kZXggPCBudW1DaGlsZHJlbjspIHtcbiAgICAgICAgICAgIGlmIChjaGlsZCA9ICh2ZWN0b3IgYXMgTmVzdGVkVmVjdG9yPFQ+KS5nZXRDaGlsZEF0KGNoaWxkSW5kZXgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy52aXNpdChjaGlsZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHByb3RlY3RlZCBhZGRCdWZmZXIodmFsdWVzOiBUeXBlZEFycmF5KSB7XG4gICAgICAgIGNvbnN0IGJ5dGVMZW5ndGggPSBhbGlnbih2YWx1ZXMuYnl0ZUxlbmd0aCwgOCk7XG4gICAgICAgIHRoaXMuYnVmZmVycy5wdXNoKHZhbHVlcyk7XG4gICAgICAgIHRoaXMuYnVmZmVyc01ldGEucHVzaChuZXcgQnVmZmVyTWV0YWRhdGEodGhpcy5ieXRlTGVuZ3RoLCBieXRlTGVuZ3RoKSk7XG4gICAgICAgIHRoaXMuYnl0ZUxlbmd0aCArPSBieXRlTGVuZ3RoO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHJvdGVjdGVkIGdldFRydW5jYXRlZEJpdG1hcChvZmZzZXQ6IG51bWJlciwgbGVuZ3RoOiBudW1iZXIsIGJpdG1hcDogVWludDhBcnJheSkge1xuICAgICAgICBjb25zdCBhbGlnbmVkTGVuZ3RoID0gYWxpZ24oYml0bWFwLmJ5dGVMZW5ndGgsIDgpO1xuICAgICAgICBpZiAob2Zmc2V0ID4gMCB8fCBiaXRtYXAuYnl0ZUxlbmd0aCA8IGFsaWduZWRMZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIFdpdGggYSBzbGljZWQgYXJyYXkgLyBub24temVybyBvZmZzZXQsIHdlIGhhdmUgdG8gY29weSB0aGUgYml0bWFwXG4gICAgICAgICAgICBjb25zdCBieXRlcyA9IG5ldyBVaW50OEFycmF5KGFsaWduZWRMZW5ndGgpO1xuICAgICAgICAgICAgYnl0ZXMuc2V0KFxuICAgICAgICAgICAgICAgIChvZmZzZXQgJSA4ID09PSAwKVxuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBzbGljZSBvZmZzZXQgaXMgYWxpZ25lZCB0byAxIGJ5dGUsIGl0J3Mgc2FmZSB0byBzbGljZSB0aGUgbnVsbEJpdG1hcCBkaXJlY3RseVxuICAgICAgICAgICAgICAgID8gYml0bWFwLnN1YmFycmF5KG9mZnNldCA+PiAzKVxuICAgICAgICAgICAgICAgIC8vIGl0ZXJhdGUgZWFjaCBiaXQgc3RhcnRpbmcgZnJvbSB0aGUgc2xpY2Ugb2Zmc2V0LCBhbmQgcmVwYWNrIGludG8gYW4gYWxpZ25lZCBudWxsQml0bWFwXG4gICAgICAgICAgICAgICAgOiBwYWNrQm9vbHMoaXRlcmF0ZUJpdHMoYml0bWFwLCBvZmZzZXQsIGxlbmd0aCwgbnVsbCwgZ2V0Qm9vbCkpXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgcmV0dXJuIGJ5dGVzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBiaXRtYXA7XG4gICAgfVxuICAgIHByb3RlY3RlZCBnZXRaZXJvQmFzZWRWYWx1ZU9mZnNldHMob2Zmc2V0OiBudW1iZXIsIGxlbmd0aDogbnVtYmVyLCB2YWx1ZU9mZnNldHM6IEludDMyQXJyYXkpIHtcbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIG5vbi16ZXJvIG9mZnNldCwgdGhlbiB0aGUgdmFsdWUgb2Zmc2V0cyBkbyBub3Qgc3RhcnQgYXRcbiAgICAgICAgLy8gemVyby4gV2UgbXVzdCBhKSBjcmVhdGUgYSBuZXcgb2Zmc2V0cyBhcnJheSB3aXRoIHNoaWZ0ZWQgb2Zmc2V0cyBhbmRcbiAgICAgICAgLy8gYikgc2xpY2UgdGhlIHZhbHVlcyBhcnJheSBhY2NvcmRpbmdseVxuICAgICAgICBpZiAob2Zmc2V0ID4gMCB8fCB2YWx1ZU9mZnNldHNbMF0gIT09IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0T2Zmc2V0ID0gdmFsdWVPZmZzZXRzWzBdO1xuICAgICAgICAgICAgY29uc3QgZGVzdE9mZnNldHMgPSBuZXcgSW50MzJBcnJheShsZW5ndGggKyAxKTtcbiAgICAgICAgICAgIGZvciAobGV0IGluZGV4ID0gLTE7ICsraW5kZXggPCBsZW5ndGg7KSB7XG4gICAgICAgICAgICAgICAgZGVzdE9mZnNldHNbaW5kZXhdID0gdmFsdWVPZmZzZXRzW2luZGV4XSAtIHN0YXJ0T2Zmc2V0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRmluYWwgb2Zmc2V0XG4gICAgICAgICAgICBkZXN0T2Zmc2V0c1tsZW5ndGhdID0gdmFsdWVPZmZzZXRzW2xlbmd0aF0gLSBzdGFydE9mZnNldDtcbiAgICAgICAgICAgIHJldHVybiBkZXN0T2Zmc2V0cztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsdWVPZmZzZXRzO1xuICAgIH1cbn1cblxuaW1wb3J0IHsgZmxhdGJ1ZmZlcnMgfSBmcm9tICdmbGF0YnVmZmVycyc7XG5pbXBvcnQgTG9uZyA9IGZsYXRidWZmZXJzLkxvbmc7XG5pbXBvcnQgQnVpbGRlciA9IGZsYXRidWZmZXJzLkJ1aWxkZXI7XG5pbXBvcnQgKiBhcyBGaWxlXyBmcm9tICcuLi8uLi9mYi9GaWxlJztcbmltcG9ydCAqIGFzIFNjaGVtYV8gZnJvbSAnLi4vLi4vZmIvU2NoZW1hJztcbmltcG9ydCAqIGFzIE1lc3NhZ2VfIGZyb20gJy4uLy4uL2ZiL01lc3NhZ2UnO1xuXG5pbXBvcnQgX0Jsb2NrID0gRmlsZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkJsb2NrO1xuaW1wb3J0IF9Gb290ZXIgPSBGaWxlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRm9vdGVyO1xuaW1wb3J0IF9GaWVsZCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpZWxkO1xuaW1wb3J0IF9TY2hlbWEgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5TY2hlbWE7XG5pbXBvcnQgX0J1ZmZlciA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkJ1ZmZlcjtcbmltcG9ydCBfTWVzc2FnZSA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NZXNzYWdlO1xuaW1wb3J0IF9LZXlWYWx1ZSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLktleVZhbHVlO1xuaW1wb3J0IF9GaWVsZE5vZGUgPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRmllbGROb2RlO1xuaW1wb3J0IF9SZWNvcmRCYXRjaCA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5SZWNvcmRCYXRjaDtcbmltcG9ydCBfRGljdGlvbmFyeUJhdGNoID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRpY3Rpb25hcnlCYXRjaDtcbmltcG9ydCBfRGljdGlvbmFyeUVuY29kaW5nID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGljdGlvbmFyeUVuY29kaW5nO1xuaW1wb3J0IF9FbmRpYW5uZXNzID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRW5kaWFubmVzcztcblxuaW1wb3J0IF9OdWxsID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTnVsbDtcbmltcG9ydCBfSW50ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuSW50O1xuaW1wb3J0IF9GbG9hdGluZ1BvaW50ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRmxvYXRpbmdQb2ludDtcbmltcG9ydCBfQmluYXJ5ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuQmluYXJ5O1xuaW1wb3J0IF9Cb29sID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuQm9vbDtcbmltcG9ydCBfVXRmOCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlV0Zjg7XG5pbXBvcnQgX0RlY2ltYWwgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EZWNpbWFsO1xuaW1wb3J0IF9EYXRlID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGF0ZTtcbmltcG9ydCBfVGltZSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlRpbWU7XG5pbXBvcnQgX1RpbWVzdGFtcCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlRpbWVzdGFtcDtcbmltcG9ydCBfSW50ZXJ2YWwgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5JbnRlcnZhbDtcbmltcG9ydCBfTGlzdCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkxpc3Q7XG5pbXBvcnQgX1N0cnVjdCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlN0cnVjdF87XG5pbXBvcnQgX1VuaW9uID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVW5pb247XG5pbXBvcnQgX0ZpeGVkU2l6ZUJpbmFyeSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpeGVkU2l6ZUJpbmFyeTtcbmltcG9ydCBfRml4ZWRTaXplTGlzdCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZpeGVkU2l6ZUxpc3Q7XG5pbXBvcnQgX01hcCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk1hcDtcblxuZXhwb3J0IGNsYXNzIFR5cGVTZXJpYWxpemVyIGV4dGVuZHMgVHlwZVZpc2l0b3Ige1xuICAgIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBidWlsZGVyOiBCdWlsZGVyKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdE51bGwoX25vZGU6IE51bGwpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9OdWxsLnN0YXJ0TnVsbChiKSB8fFxuICAgICAgICAgICAgX051bGwuZW5kTnVsbChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRJbnQobm9kZTogSW50KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfSW50LnN0YXJ0SW50KGIpIHx8XG4gICAgICAgICAgICBfSW50LmFkZEJpdFdpZHRoKGIsIG5vZGUuYml0V2lkdGgpIHx8XG4gICAgICAgICAgICBfSW50LmFkZElzU2lnbmVkKGIsIG5vZGUuaXNTaWduZWQpIHx8XG4gICAgICAgICAgICBfSW50LmVuZEludChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRGbG9hdChub2RlOiBGbG9hdCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0Zsb2F0aW5nUG9pbnQuc3RhcnRGbG9hdGluZ1BvaW50KGIpIHx8XG4gICAgICAgICAgICBfRmxvYXRpbmdQb2ludC5hZGRQcmVjaXNpb24oYiwgbm9kZS5wcmVjaXNpb24pIHx8XG4gICAgICAgICAgICBfRmxvYXRpbmdQb2ludC5lbmRGbG9hdGluZ1BvaW50KGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdEJpbmFyeShfbm9kZTogQmluYXJ5KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfQmluYXJ5LnN0YXJ0QmluYXJ5KGIpIHx8XG4gICAgICAgICAgICBfQmluYXJ5LmVuZEJpbmFyeShiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRCb29sKF9ub2RlOiBCb29sKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfQm9vbC5zdGFydEJvb2woYikgfHxcbiAgICAgICAgICAgIF9Cb29sLmVuZEJvb2woYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0VXRmOChfbm9kZTogVXRmOCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX1V0Zjguc3RhcnRVdGY4KGIpIHx8XG4gICAgICAgICAgICBfVXRmOC5lbmRVdGY4KGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdERlY2ltYWwobm9kZTogRGVjaW1hbCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0RlY2ltYWwuc3RhcnREZWNpbWFsKGIpIHx8XG4gICAgICAgICAgICBfRGVjaW1hbC5hZGRTY2FsZShiLCBub2RlLnNjYWxlKSB8fFxuICAgICAgICAgICAgX0RlY2ltYWwuYWRkUHJlY2lzaW9uKGIsIG5vZGUucHJlY2lzaW9uKSB8fFxuICAgICAgICAgICAgX0RlY2ltYWwuZW5kRGVjaW1hbChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXREYXRlKG5vZGU6IERhdGVfKSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiBfRGF0ZS5zdGFydERhdGUoYikgfHwgX0RhdGUuYWRkVW5pdChiLCBub2RlLnVuaXQpIHx8IF9EYXRlLmVuZERhdGUoYik7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdFRpbWUobm9kZTogVGltZSkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX1RpbWUuc3RhcnRUaW1lKGIpIHx8XG4gICAgICAgICAgICBfVGltZS5hZGRVbml0KGIsIG5vZGUudW5pdCkgfHxcbiAgICAgICAgICAgIF9UaW1lLmFkZEJpdFdpZHRoKGIsIG5vZGUuYml0V2lkdGgpIHx8XG4gICAgICAgICAgICBfVGltZS5lbmRUaW1lKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdFRpbWVzdGFtcChub2RlOiBUaW1lc3RhbXApIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgY29uc3QgdGltZXpvbmUgPSAobm9kZS50aW1lem9uZSAmJiBiLmNyZWF0ZVN0cmluZyhub2RlLnRpbWV6b25lKSkgfHwgdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX1RpbWVzdGFtcC5zdGFydFRpbWVzdGFtcChiKSB8fFxuICAgICAgICAgICAgX1RpbWVzdGFtcC5hZGRVbml0KGIsIG5vZGUudW5pdCkgfHxcbiAgICAgICAgICAgICh0aW1lem9uZSAhPT0gdW5kZWZpbmVkICYmIF9UaW1lc3RhbXAuYWRkVGltZXpvbmUoYiwgdGltZXpvbmUpKSB8fFxuICAgICAgICAgICAgX1RpbWVzdGFtcC5lbmRUaW1lc3RhbXAoYilcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIHZpc2l0SW50ZXJ2YWwobm9kZTogSW50ZXJ2YWwpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9JbnRlcnZhbC5zdGFydEludGVydmFsKGIpIHx8IF9JbnRlcnZhbC5hZGRVbml0KGIsIG5vZGUudW5pdCkgfHwgX0ludGVydmFsLmVuZEludGVydmFsKGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdExpc3QoX25vZGU6IExpc3QpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIF9MaXN0LnN0YXJ0TGlzdChiKSB8fFxuICAgICAgICAgICAgX0xpc3QuZW5kTGlzdChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRTdHJ1Y3QoX25vZGU6IFN0cnVjdCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX1N0cnVjdC5zdGFydFN0cnVjdF8oYikgfHxcbiAgICAgICAgICAgIF9TdHJ1Y3QuZW5kU3RydWN0XyhiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRVbmlvbihub2RlOiBVbmlvbikge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICBjb25zdCB0eXBlSWRzID1cbiAgICAgICAgICAgIF9Vbmlvbi5zdGFydFR5cGVJZHNWZWN0b3IoYiwgbm9kZS50eXBlSWRzLmxlbmd0aCkgfHxcbiAgICAgICAgICAgIF9Vbmlvbi5jcmVhdGVUeXBlSWRzVmVjdG9yKGIsIG5vZGUudHlwZUlkcyk7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfVW5pb24uc3RhcnRVbmlvbihiKSB8fFxuICAgICAgICAgICAgX1VuaW9uLmFkZE1vZGUoYiwgbm9kZS5tb2RlKSB8fFxuICAgICAgICAgICAgX1VuaW9uLmFkZFR5cGVJZHMoYiwgdHlwZUlkcykgfHxcbiAgICAgICAgICAgIF9Vbmlvbi5lbmRVbmlvbihiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXREaWN0aW9uYXJ5KG5vZGU6IERpY3Rpb25hcnkpIHtcbiAgICAgICAgY29uc3QgYiA9IHRoaXMuYnVpbGRlcjtcbiAgICAgICAgY29uc3QgaW5kZXhUeXBlID0gdGhpcy52aXNpdChub2RlLmluZGljZXMpO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0RpY3Rpb25hcnlFbmNvZGluZy5zdGFydERpY3Rpb25hcnlFbmNvZGluZyhiKSB8fFxuICAgICAgICAgICAgX0RpY3Rpb25hcnlFbmNvZGluZy5hZGRJZChiLCBuZXcgTG9uZyhub2RlLmlkLCAwKSkgfHxcbiAgICAgICAgICAgIF9EaWN0aW9uYXJ5RW5jb2RpbmcuYWRkSXNPcmRlcmVkKGIsIG5vZGUuaXNPcmRlcmVkKSB8fFxuICAgICAgICAgICAgKGluZGV4VHlwZSAhPT0gdW5kZWZpbmVkICYmIF9EaWN0aW9uYXJ5RW5jb2RpbmcuYWRkSW5kZXhUeXBlKGIsIGluZGV4VHlwZSkpIHx8XG4gICAgICAgICAgICBfRGljdGlvbmFyeUVuY29kaW5nLmVuZERpY3Rpb25hcnlFbmNvZGluZyhiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRGaXhlZFNpemVCaW5hcnkobm9kZTogRml4ZWRTaXplQmluYXJ5KSB7XG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmJ1aWxkZXI7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBfRml4ZWRTaXplQmluYXJ5LnN0YXJ0Rml4ZWRTaXplQmluYXJ5KGIpIHx8XG4gICAgICAgICAgICBfRml4ZWRTaXplQmluYXJ5LmFkZEJ5dGVXaWR0aChiLCBub2RlLmJ5dGVXaWR0aCkgfHxcbiAgICAgICAgICAgIF9GaXhlZFNpemVCaW5hcnkuZW5kRml4ZWRTaXplQmluYXJ5KGIpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyB2aXNpdEZpeGVkU2l6ZUxpc3Qobm9kZTogRml4ZWRTaXplTGlzdCkge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX0ZpeGVkU2l6ZUxpc3Quc3RhcnRGaXhlZFNpemVMaXN0KGIpIHx8XG4gICAgICAgICAgICBfRml4ZWRTaXplTGlzdC5hZGRMaXN0U2l6ZShiLCBub2RlLmxpc3RTaXplKSB8fFxuICAgICAgICAgICAgX0ZpeGVkU2l6ZUxpc3QuZW5kRml4ZWRTaXplTGlzdChiKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgdmlzaXRNYXAobm9kZTogTWFwXykge1xuICAgICAgICBjb25zdCBiID0gdGhpcy5idWlsZGVyO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgX01hcC5zdGFydE1hcChiKSB8fFxuICAgICAgICAgICAgX01hcC5hZGRLZXlzU29ydGVkKGIsIG5vZGUua2V5c1NvcnRlZCkgfHxcbiAgICAgICAgICAgIF9NYXAuZW5kTWFwKGIpXG4gICAgICAgICk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBjb25jYXRCdWZmZXJzV2l0aE1ldGFkYXRhKHRvdGFsQnl0ZUxlbmd0aDogbnVtYmVyLCBidWZmZXJzOiBVaW50OEFycmF5W10sIGJ1ZmZlcnNNZXRhOiBCdWZmZXJNZXRhZGF0YVtdKSB7XG4gICAgY29uc3QgZGF0YSA9IG5ldyBVaW50OEFycmF5KHRvdGFsQnl0ZUxlbmd0aCk7XG4gICAgZm9yIChsZXQgaSA9IC0xLCBuID0gYnVmZmVycy5sZW5ndGg7ICsraSA8IG47KSB7XG4gICAgICAgIGNvbnN0IHsgb2Zmc2V0LCBsZW5ndGggfSA9IGJ1ZmZlcnNNZXRhW2ldO1xuICAgICAgICBjb25zdCB7IGJ1ZmZlciwgYnl0ZU9mZnNldCwgYnl0ZUxlbmd0aCB9ID0gYnVmZmVyc1tpXTtcbiAgICAgICAgY29uc3QgcmVhbEJ1ZmZlckxlbmd0aCA9IE1hdGgubWluKGxlbmd0aCwgYnl0ZUxlbmd0aCk7XG4gICAgICAgIGlmIChyZWFsQnVmZmVyTGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgZGF0YS5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyLCBieXRlT2Zmc2V0LCByZWFsQnVmZmVyTGVuZ3RoKSwgb2Zmc2V0KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbn1cblxuZnVuY3Rpb24gd3JpdGVGb290ZXIoYjogQnVpbGRlciwgbm9kZTogRm9vdGVyKSB7XG4gICAgbGV0IHNjaGVtYU9mZnNldCA9IHdyaXRlU2NoZW1hKGIsIG5vZGUuc2NoZW1hKTtcbiAgICBsZXQgcmVjb3JkQmF0Y2hlcyA9IChub2RlLnJlY29yZEJhdGNoZXMgfHwgW10pO1xuICAgIGxldCBkaWN0aW9uYXJ5QmF0Y2hlcyA9IChub2RlLmRpY3Rpb25hcnlCYXRjaGVzIHx8IFtdKTtcbiAgICBsZXQgcmVjb3JkQmF0Y2hlc09mZnNldCA9XG4gICAgICAgIF9Gb290ZXIuc3RhcnRSZWNvcmRCYXRjaGVzVmVjdG9yKGIsIHJlY29yZEJhdGNoZXMubGVuZ3RoKSB8fFxuICAgICAgICAgICAgbWFwUmV2ZXJzZShyZWNvcmRCYXRjaGVzLCAocmIpID0+IHdyaXRlQmxvY2soYiwgcmIpKSAmJlxuICAgICAgICBiLmVuZFZlY3RvcigpO1xuXG4gICAgbGV0IGRpY3Rpb25hcnlCYXRjaGVzT2Zmc2V0ID1cbiAgICAgICAgX0Zvb3Rlci5zdGFydERpY3Rpb25hcmllc1ZlY3RvcihiLCBkaWN0aW9uYXJ5QmF0Y2hlcy5sZW5ndGgpIHx8XG4gICAgICAgICAgICBtYXBSZXZlcnNlKGRpY3Rpb25hcnlCYXRjaGVzLCAoZGIpID0+IHdyaXRlQmxvY2soYiwgZGIpKSAmJlxuICAgICAgICBiLmVuZFZlY3RvcigpO1xuXG4gICAgcmV0dXJuIChcbiAgICAgICAgX0Zvb3Rlci5zdGFydEZvb3RlcihiKSB8fFxuICAgICAgICBfRm9vdGVyLmFkZFNjaGVtYShiLCBzY2hlbWFPZmZzZXQpIHx8XG4gICAgICAgIF9Gb290ZXIuYWRkVmVyc2lvbihiLCBub2RlLnNjaGVtYS52ZXJzaW9uKSB8fFxuICAgICAgICBfRm9vdGVyLmFkZFJlY29yZEJhdGNoZXMoYiwgcmVjb3JkQmF0Y2hlc09mZnNldCkgfHxcbiAgICAgICAgX0Zvb3Rlci5hZGREaWN0aW9uYXJpZXMoYiwgZGljdGlvbmFyeUJhdGNoZXNPZmZzZXQpIHx8XG4gICAgICAgIF9Gb290ZXIuZW5kRm9vdGVyKGIpXG4gICAgKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVCbG9jayhiOiBCdWlsZGVyLCBub2RlOiBGaWxlQmxvY2spIHtcbiAgICByZXR1cm4gX0Jsb2NrLmNyZWF0ZUJsb2NrKGIsXG4gICAgICAgIG5ldyBMb25nKG5vZGUub2Zmc2V0LCAwKSxcbiAgICAgICAgbm9kZS5tZXRhRGF0YUxlbmd0aCxcbiAgICAgICAgbmV3IExvbmcobm9kZS5ib2R5TGVuZ3RoLCAwKVxuICAgICk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlTWVzc2FnZShiOiBCdWlsZGVyLCBub2RlOiBNZXNzYWdlKSB7XG4gICAgbGV0IG1lc3NhZ2VIZWFkZXJPZmZzZXQgPSAwO1xuICAgIGlmIChNZXNzYWdlLmlzU2NoZW1hKG5vZGUpKSB7XG4gICAgICAgIG1lc3NhZ2VIZWFkZXJPZmZzZXQgPSB3cml0ZVNjaGVtYShiLCBub2RlIGFzIFNjaGVtYSk7XG4gICAgfSBlbHNlIGlmIChNZXNzYWdlLmlzUmVjb3JkQmF0Y2gobm9kZSkpIHtcbiAgICAgICAgbWVzc2FnZUhlYWRlck9mZnNldCA9IHdyaXRlUmVjb3JkQmF0Y2goYiwgbm9kZSBhcyBSZWNvcmRCYXRjaE1ldGFkYXRhKTtcbiAgICB9IGVsc2UgaWYgKE1lc3NhZ2UuaXNEaWN0aW9uYXJ5QmF0Y2gobm9kZSkpIHtcbiAgICAgICAgbWVzc2FnZUhlYWRlck9mZnNldCA9IHdyaXRlRGljdGlvbmFyeUJhdGNoKGIsIG5vZGUgYXMgRGljdGlvbmFyeUJhdGNoKTtcbiAgICB9XG4gICAgcmV0dXJuIChcbiAgICAgICAgX01lc3NhZ2Uuc3RhcnRNZXNzYWdlKGIpIHx8XG4gICAgICAgIF9NZXNzYWdlLmFkZFZlcnNpb24oYiwgbm9kZS52ZXJzaW9uKSB8fFxuICAgICAgICBfTWVzc2FnZS5hZGRIZWFkZXIoYiwgbWVzc2FnZUhlYWRlck9mZnNldCkgfHxcbiAgICAgICAgX01lc3NhZ2UuYWRkSGVhZGVyVHlwZShiLCBub2RlLmhlYWRlclR5cGUpIHx8XG4gICAgICAgIF9NZXNzYWdlLmFkZEJvZHlMZW5ndGgoYiwgbmV3IExvbmcobm9kZS5ib2R5TGVuZ3RoLCAwKSkgfHxcbiAgICAgICAgX01lc3NhZ2UuZW5kTWVzc2FnZShiKVxuICAgICk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlU2NoZW1hKGI6IEJ1aWxkZXIsIG5vZGU6IFNjaGVtYSkge1xuXG4gICAgY29uc3QgZmllbGRPZmZzZXRzID0gbm9kZS5maWVsZHMubWFwKChmKSA9PiB3cml0ZUZpZWxkKGIsIGYpKTtcbiAgICBjb25zdCBmaWVsZHNPZmZzZXQgPVxuICAgICAgICBfU2NoZW1hLnN0YXJ0RmllbGRzVmVjdG9yKGIsIGZpZWxkT2Zmc2V0cy5sZW5ndGgpIHx8XG4gICAgICAgIF9TY2hlbWEuY3JlYXRlRmllbGRzVmVjdG9yKGIsIGZpZWxkT2Zmc2V0cyk7XG5cbiAgICBsZXQgbWV0YWRhdGE6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAobm9kZS5tZXRhZGF0YSAmJiBub2RlLm1ldGFkYXRhLnNpemUgPiAwKSB7XG4gICAgICAgIG1ldGFkYXRhID0gX1NjaGVtYS5jcmVhdGVDdXN0b21NZXRhZGF0YVZlY3RvcihcbiAgICAgICAgICAgIGIsXG4gICAgICAgICAgICBbLi4ubm9kZS5tZXRhZGF0YV0ubWFwKChbaywgdl0pID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBrZXkgPSBiLmNyZWF0ZVN0cmluZyhgJHtrfWApO1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IGIuY3JlYXRlU3RyaW5nKGAke3Z9YCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgICAgX0tleVZhbHVlLnN0YXJ0S2V5VmFsdWUoYikgfHxcbiAgICAgICAgICAgICAgICAgICAgX0tleVZhbHVlLmFkZEtleShiLCBrZXkpIHx8XG4gICAgICAgICAgICAgICAgICAgIF9LZXlWYWx1ZS5hZGRWYWx1ZShiLCB2YWwpIHx8XG4gICAgICAgICAgICAgICAgICAgIF9LZXlWYWx1ZS5lbmRLZXlWYWx1ZShiKVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiAoXG4gICAgICAgIF9TY2hlbWEuc3RhcnRTY2hlbWEoYikgfHxcbiAgICAgICAgX1NjaGVtYS5hZGRGaWVsZHMoYiwgZmllbGRzT2Zmc2V0KSB8fFxuICAgICAgICBfU2NoZW1hLmFkZEVuZGlhbm5lc3MoYiwgcGxhdGZvcm1Jc0xpdHRsZUVuZGlhbiA/IF9FbmRpYW5uZXNzLkxpdHRsZSA6IF9FbmRpYW5uZXNzLkJpZykgfHxcbiAgICAgICAgKG1ldGFkYXRhICE9PSB1bmRlZmluZWQgJiYgX1NjaGVtYS5hZGRDdXN0b21NZXRhZGF0YShiLCBtZXRhZGF0YSkpIHx8XG4gICAgICAgIF9TY2hlbWEuZW5kU2NoZW1hKGIpXG4gICAgKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVSZWNvcmRCYXRjaChiOiBCdWlsZGVyLCBub2RlOiBSZWNvcmRCYXRjaE1ldGFkYXRhKSB7XG4gICAgbGV0IG5vZGVzID0gKG5vZGUubm9kZXMgfHwgW10pO1xuICAgIGxldCBidWZmZXJzID0gKG5vZGUuYnVmZmVycyB8fCBbXSk7XG4gICAgbGV0IG5vZGVzT2Zmc2V0ID1cbiAgICAgICAgX1JlY29yZEJhdGNoLnN0YXJ0Tm9kZXNWZWN0b3IoYiwgbm9kZXMubGVuZ3RoKSB8fFxuICAgICAgICBtYXBSZXZlcnNlKG5vZGVzLCAobikgPT4gd3JpdGVGaWVsZE5vZGUoYiwgbikpICYmXG4gICAgICAgIGIuZW5kVmVjdG9yKCk7XG5cbiAgICBsZXQgYnVmZmVyc09mZnNldCA9XG4gICAgICAgIF9SZWNvcmRCYXRjaC5zdGFydEJ1ZmZlcnNWZWN0b3IoYiwgYnVmZmVycy5sZW5ndGgpIHx8XG4gICAgICAgIG1hcFJldmVyc2UoYnVmZmVycywgKGJfKSA9PiB3cml0ZUJ1ZmZlcihiLCBiXykpICYmXG4gICAgICAgIGIuZW5kVmVjdG9yKCk7XG5cbiAgICByZXR1cm4gKFxuICAgICAgICBfUmVjb3JkQmF0Y2guc3RhcnRSZWNvcmRCYXRjaChiKSB8fFxuICAgICAgICBfUmVjb3JkQmF0Y2guYWRkTGVuZ3RoKGIsIG5ldyBMb25nKG5vZGUubGVuZ3RoLCAwKSkgfHxcbiAgICAgICAgX1JlY29yZEJhdGNoLmFkZE5vZGVzKGIsIG5vZGVzT2Zmc2V0KSB8fFxuICAgICAgICBfUmVjb3JkQmF0Y2guYWRkQnVmZmVycyhiLCBidWZmZXJzT2Zmc2V0KSB8fFxuICAgICAgICBfUmVjb3JkQmF0Y2guZW5kUmVjb3JkQmF0Y2goYilcbiAgICApO1xufVxuXG5mdW5jdGlvbiB3cml0ZURpY3Rpb25hcnlCYXRjaChiOiBCdWlsZGVyLCBub2RlOiBEaWN0aW9uYXJ5QmF0Y2gpIHtcbiAgICBjb25zdCBkYXRhT2Zmc2V0ID0gd3JpdGVSZWNvcmRCYXRjaChiLCBub2RlLmRhdGEpO1xuICAgIHJldHVybiAoXG4gICAgICAgIF9EaWN0aW9uYXJ5QmF0Y2guc3RhcnREaWN0aW9uYXJ5QmF0Y2goYikgfHxcbiAgICAgICAgX0RpY3Rpb25hcnlCYXRjaC5hZGRJZChiLCBuZXcgTG9uZyhub2RlLmlkLCAwKSkgfHxcbiAgICAgICAgX0RpY3Rpb25hcnlCYXRjaC5hZGRJc0RlbHRhKGIsIG5vZGUuaXNEZWx0YSkgfHxcbiAgICAgICAgX0RpY3Rpb25hcnlCYXRjaC5hZGREYXRhKGIsIGRhdGFPZmZzZXQpIHx8XG4gICAgICAgIF9EaWN0aW9uYXJ5QmF0Y2guZW5kRGljdGlvbmFyeUJhdGNoKGIpXG4gICAgKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVCdWZmZXIoYjogQnVpbGRlciwgbm9kZTogQnVmZmVyTWV0YWRhdGEpIHtcbiAgICByZXR1cm4gX0J1ZmZlci5jcmVhdGVCdWZmZXIoYiwgbmV3IExvbmcobm9kZS5vZmZzZXQsIDApLCBuZXcgTG9uZyhub2RlLmxlbmd0aCwgMCkpO1xufVxuXG5mdW5jdGlvbiB3cml0ZUZpZWxkTm9kZShiOiBCdWlsZGVyLCBub2RlOiBGaWVsZE1ldGFkYXRhKSB7XG4gICAgcmV0dXJuIF9GaWVsZE5vZGUuY3JlYXRlRmllbGROb2RlKGIsIG5ldyBMb25nKG5vZGUubGVuZ3RoLCAwKSwgbmV3IExvbmcobm9kZS5udWxsQ291bnQsIDApKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVGaWVsZChiOiBCdWlsZGVyLCBub2RlOiBGaWVsZCkge1xuICAgIGxldCB0eXBlT2Zmc2V0ID0gLTE7XG4gICAgbGV0IHR5cGUgPSBub2RlLnR5cGU7XG4gICAgbGV0IHR5cGVJZCA9IG5vZGUudHlwZUlkO1xuICAgIGxldCBuYW1lOiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgbGV0IG1ldGFkYXRhOiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgbGV0IGRpY3Rpb25hcnk6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICAgIGlmICghRGF0YVR5cGUuaXNEaWN0aW9uYXJ5KHR5cGUpKSB7XG4gICAgICAgIHR5cGVPZmZzZXQgPSBuZXcgVHlwZVNlcmlhbGl6ZXIoYikudmlzaXQodHlwZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdHlwZUlkID0gdHlwZS5kaWN0aW9uYXJ5LlRUeXBlO1xuICAgICAgICBkaWN0aW9uYXJ5ID0gbmV3IFR5cGVTZXJpYWxpemVyKGIpLnZpc2l0KHR5cGUpO1xuICAgICAgICB0eXBlT2Zmc2V0ID0gbmV3IFR5cGVTZXJpYWxpemVyKGIpLnZpc2l0KHR5cGUuZGljdGlvbmFyeSk7XG4gICAgfVxuXG4gICAgbGV0IGNoaWxkcmVuID0gX0ZpZWxkLmNyZWF0ZUNoaWxkcmVuVmVjdG9yKGIsICh0eXBlLmNoaWxkcmVuIHx8IFtdKS5tYXAoKGYpID0+IHdyaXRlRmllbGQoYiwgZikpKTtcbiAgICBpZiAobm9kZS5tZXRhZGF0YSAmJiBub2RlLm1ldGFkYXRhLnNpemUgPiAwKSB7XG4gICAgICAgIG1ldGFkYXRhID0gX0ZpZWxkLmNyZWF0ZUN1c3RvbU1ldGFkYXRhVmVjdG9yKFxuICAgICAgICAgICAgYixcbiAgICAgICAgICAgIFsuLi5ub2RlLm1ldGFkYXRhXS5tYXAoKFtrLCB2XSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGIuY3JlYXRlU3RyaW5nKGAke2t9YCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsID0gYi5jcmVhdGVTdHJpbmcoYCR7dn1gKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgICBfS2V5VmFsdWUuc3RhcnRLZXlWYWx1ZShiKSB8fFxuICAgICAgICAgICAgICAgICAgICBfS2V5VmFsdWUuYWRkS2V5KGIsIGtleSkgfHxcbiAgICAgICAgICAgICAgICAgICAgX0tleVZhbHVlLmFkZFZhbHVlKGIsIHZhbCkgfHxcbiAgICAgICAgICAgICAgICAgICAgX0tleVZhbHVlLmVuZEtleVZhbHVlKGIpXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxuICAgIGlmIChub2RlLm5hbWUpIHtcbiAgICAgICAgbmFtZSA9IGIuY3JlYXRlU3RyaW5nKG5vZGUubmFtZSk7XG4gICAgfVxuICAgIHJldHVybiAoXG4gICAgICAgIF9GaWVsZC5zdGFydEZpZWxkKGIpIHx8XG4gICAgICAgIF9GaWVsZC5hZGRUeXBlKGIsIHR5cGVPZmZzZXQpIHx8XG4gICAgICAgIF9GaWVsZC5hZGRUeXBlVHlwZShiLCB0eXBlSWQpIHx8XG4gICAgICAgIF9GaWVsZC5hZGRDaGlsZHJlbihiLCBjaGlsZHJlbikgfHxcbiAgICAgICAgX0ZpZWxkLmFkZE51bGxhYmxlKGIsICEhbm9kZS5udWxsYWJsZSkgfHxcbiAgICAgICAgKG5hbWUgIT09IHVuZGVmaW5lZCAmJiBfRmllbGQuYWRkTmFtZShiLCBuYW1lKSkgfHxcbiAgICAgICAgKGRpY3Rpb25hcnkgIT09IHVuZGVmaW5lZCAmJiBfRmllbGQuYWRkRGljdGlvbmFyeShiLCBkaWN0aW9uYXJ5KSkgfHxcbiAgICAgICAgKG1ldGFkYXRhICE9PSB1bmRlZmluZWQgJiYgX0ZpZWxkLmFkZEN1c3RvbU1ldGFkYXRhKGIsIG1ldGFkYXRhKSkgfHxcbiAgICAgICAgX0ZpZWxkLmVuZEZpZWxkKGIpXG4gICAgKTtcbn1cblxuZnVuY3Rpb24gbWFwUmV2ZXJzZTxULCBVPihzb3VyY2U6IFRbXSwgY2FsbGJhY2tmbjogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBVKTogVVtdIHtcbiAgICBjb25zdCByZXN1bHQgPSBuZXcgQXJyYXkoc291cmNlLmxlbmd0aCk7XG4gICAgZm9yIChsZXQgaSA9IC0xLCBqID0gc291cmNlLmxlbmd0aDsgLS1qID4gLTE7KSB7XG4gICAgICAgIHJlc3VsdFtpXSA9IGNhbGxiYWNrZm4oc291cmNlW2pdLCBpLCBzb3VyY2UpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5jb25zdCBwbGF0Zm9ybUlzTGl0dGxlRW5kaWFuID0gKGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcigyKTtcbiAgICBuZXcgRGF0YVZpZXcoYnVmZmVyKS5zZXRJbnQxNigwLCAyNTYsIHRydWUgLyogbGl0dGxlRW5kaWFuICovKTtcbiAgICAvLyBJbnQxNkFycmF5IHVzZXMgdGhlIHBsYXRmb3JtJ3MgZW5kaWFubmVzcy5cbiAgICByZXR1cm4gbmV3IEludDE2QXJyYXkoYnVmZmVyKVswXSA9PT0gMjU2O1xufSkoKTtcbiJdfQ==

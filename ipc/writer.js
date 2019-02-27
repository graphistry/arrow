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
const table_1 = require("../table");
const message_1 = require("./message");
const column_1 = require("../column");
const schema_1 = require("../schema");
const chunked_1 = require("../vector/chunked");
const message_2 = require("./metadata/message");
const recordbatch_1 = require("../recordbatch");
const metadata = require("./metadata/message");
const type_1 = require("../type");
const file_1 = require("./metadata/file");
const enum_1 = require("../enum");
const stream_1 = require("../io/stream");
const vectorassembler_1 = require("../visitor/vectorassembler");
const jsontypeassembler_1 = require("../visitor/jsontypeassembler");
const jsonvectorassembler_1 = require("../visitor/jsonvectorassembler");
const buffer_1 = require("../util/buffer");
const interfaces_1 = require("../io/interfaces");
const compat_1 = require("../util/compat");
class RecordBatchWriter extends interfaces_1.ReadableInterop {
    constructor(options) {
        super();
        this._position = 0;
        this._started = false;
        // @ts-ignore
        this._sink = new stream_1.AsyncByteQueue();
        this._schema = null;
        this._dictionaryBlocks = [];
        this._recordBatchBlocks = [];
        this._autoDestroy = options && (typeof options.autoDestroy === 'boolean') ? options.autoDestroy : true;
    }
    /** @nocollapse */
    // @ts-ignore
    static throughNode(options) {
        throw new Error(`"throughNode" not available in this environment`);
    }
    /** @nocollapse */
    static throughDOM(
    // @ts-ignore
    writableStrategy, 
    // @ts-ignore
    readableStrategy) {
        throw new Error(`"throughDOM" not available in this environment`);
    }
    toString(sync = false) {
        return this._sink.toString(sync);
    }
    toUint8Array(sync = false) {
        return this._sink.toUint8Array(sync);
    }
    writeAll(input) {
        if (compat_1.isPromise(input)) {
            return input.then((x) => this.writeAll(x));
        }
        else if (compat_1.isAsyncIterable(input)) {
            return writeAllAsync(this, input);
        }
        return writeAll(this, input);
    }
    get closed() { return this._sink.closed; }
    [Symbol.asyncIterator]() { return this._sink[Symbol.asyncIterator](); }
    toDOMStream(options) { return this._sink.toDOMStream(options); }
    toNodeStream(options) { return this._sink.toNodeStream(options); }
    close() {
        return this.reset()._sink.close();
    }
    abort(reason) {
        return this.reset()._sink.abort(reason);
    }
    finish() {
        this._autoDestroy ? this.close() : this.reset(this._sink, this._schema);
        return this;
    }
    reset(sink = this._sink, schema = null) {
        if ((sink === this._sink) || (sink instanceof stream_1.AsyncByteQueue)) {
            this._sink = sink;
        }
        else {
            this._sink = new stream_1.AsyncByteQueue();
            if (sink && compat_1.isWritableDOMStream(sink)) {
                this.toDOMStream({ type: 'bytes' }).pipeTo(sink);
            }
            else if (sink && compat_1.isWritableNodeStream(sink)) {
                this.toNodeStream({ objectMode: false }).pipe(sink);
            }
        }
        if (this._started && this._schema) {
            this._writeFooter();
        }
        this._started = false;
        this._dictionaryBlocks = [];
        this._recordBatchBlocks = [];
        if (!schema || !(schema.compareTo(this._schema))) {
            if (schema === null) {
                this._position = 0;
                this._schema = null;
            }
            else {
                this._started = true;
                this._schema = schema;
                this._writeSchema(schema);
            }
        }
        return this;
    }
    write(payload) {
        let schema = null;
        if (!this._sink) {
            throw new Error(`RecordBatchWriter is closed`);
        }
        else if (payload === null || payload === undefined) {
            return this.finish() && undefined;
        }
        else if (payload instanceof table_1.Table && !(schema = payload.schema)) {
            return this.finish() && undefined;
        }
        else if (payload instanceof recordbatch_1.RecordBatch && !(schema = payload.schema)) {
            return this.finish() && undefined;
        }
        if (schema && !schema.compareTo(this._schema)) {
            if (this._started && this._autoDestroy) {
                return this.close();
            }
            this.reset(this._sink, schema);
        }
        if (payload instanceof recordbatch_1.RecordBatch) {
            this._writeRecordBatch(payload);
        }
        else if (payload instanceof table_1.Table) {
            this.writeAll(payload.chunks);
        }
        else if (compat_1.isIterable(payload)) {
            this.writeAll(payload);
        }
    }
    _writeMessage(message, alignment = 8) {
        const a = alignment - 1;
        const buffer = message_2.Message.encode(message);
        const flatbufferSize = buffer.byteLength;
        const alignedSize = (flatbufferSize + 4 + a) & ~a;
        const nPaddingBytes = alignedSize - flatbufferSize - 4;
        if (message.headerType === enum_1.MessageHeader.RecordBatch) {
            this._recordBatchBlocks.push(new file_1.FileBlock(alignedSize, message.bodyLength, this._position));
        }
        else if (message.headerType === enum_1.MessageHeader.DictionaryBatch) {
            this._dictionaryBlocks.push(new file_1.FileBlock(alignedSize, message.bodyLength, this._position));
        }
        // Write the flatbuffer size prefix including padding
        this._write(Int32Array.of(alignedSize - 4));
        // Write the flatbuffer
        if (flatbufferSize > 0) {
            this._write(buffer);
        }
        // Write any padding
        return this._writePadding(nPaddingBytes);
    }
    _write(chunk) {
        if (this._started) {
            const buffer = buffer_1.toUint8Array(chunk);
            if (buffer && buffer.byteLength > 0) {
                this._sink.write(buffer);
                this._position += buffer.byteLength;
            }
        }
        return this;
    }
    _writeSchema(schema) {
        return this
            ._writeMessage(message_2.Message.from(schema))
            ._writeDictionaries(schema.dictionaryFields);
    }
    _writeFooter() {
        return this._writePadding(4); // eos bytes
    }
    _writeMagic() {
        return this._write(message_1.MAGIC);
    }
    _writePadding(nBytes) {
        return nBytes > 0 ? this._write(new Uint8Array(nBytes)) : this;
    }
    _writeRecordBatch(records) {
        const { byteLength, nodes, bufferRegions, buffers } = vectorassembler_1.VectorAssembler.assemble(records);
        const recordBatch = new metadata.RecordBatch(records.length, nodes, bufferRegions);
        const message = message_2.Message.from(recordBatch, byteLength);
        return this
            ._writeMessage(message)
            ._writeBodyBuffers(buffers);
    }
    _writeDictionaryBatch(dictionary, id, isDelta = false) {
        const { byteLength, nodes, bufferRegions, buffers } = vectorassembler_1.VectorAssembler.assemble(dictionary);
        const recordBatch = new metadata.RecordBatch(dictionary.length, nodes, bufferRegions);
        const dictionaryBatch = new metadata.DictionaryBatch(recordBatch, id, isDelta);
        const message = message_2.Message.from(dictionaryBatch, byteLength);
        return this
            ._writeMessage(message)
            ._writeBodyBuffers(buffers);
    }
    _writeBodyBuffers(buffers) {
        let buffer;
        let size, padding;
        for (let i = -1, n = buffers.length; ++i < n;) {
            if ((buffer = buffers[i]) && (size = buffer.byteLength) > 0) {
                this._write(buffer);
                if ((padding = ((size + 7) & ~7) - size) > 0) {
                    this._writePadding(padding);
                }
            }
        }
        return this;
    }
    _writeDictionaries(dictionaryFields) {
        for (const [id, fields] of dictionaryFields) {
            const vector = fields[0].type.dictionaryVector;
            if (!(vector instanceof chunked_1.Chunked)) {
                this._writeDictionaryBatch(vector, id, false);
            }
            else {
                const chunks = vector.chunks;
                for (let i = -1, n = chunks.length; ++i < n;) {
                    this._writeDictionaryBatch(chunks[i], id, i > 0);
                }
            }
        }
        return this;
    }
}
exports.RecordBatchWriter = RecordBatchWriter;
/** @ignore */
class RecordBatchStreamWriter extends RecordBatchWriter {
    /** @nocollapse */
    static writeAll(input, options) {
        return new RecordBatchStreamWriter(options).writeAll(input);
    }
}
exports.RecordBatchStreamWriter = RecordBatchStreamWriter;
/** @ignore */
class RecordBatchFileWriter extends RecordBatchWriter {
    constructor() {
        super();
        this._autoDestroy = true;
    }
    /** @nocollapse */
    static writeAll(input) {
        return new RecordBatchFileWriter().writeAll(input);
    }
    _writeSchema(schema) {
        return this
            ._writeMagic()._writePadding(2)
            ._writeDictionaries(schema.dictionaryFields);
    }
    _writeFooter() {
        const buffer = file_1.Footer.encode(new file_1.Footer(this._schema, enum_1.MetadataVersion.V4, this._recordBatchBlocks, this._dictionaryBlocks));
        return this
            ._write(buffer) // Write the flatbuffer
            ._write(Int32Array.of(buffer.byteLength)) // then the footer size suffix
            ._writeMagic(); // then the magic suffix
    }
}
exports.RecordBatchFileWriter = RecordBatchFileWriter;
/** @ignore */
class RecordBatchJSONWriter extends RecordBatchWriter {
    constructor() {
        super();
        this._autoDestroy = true;
    }
    /** @nocollapse */
    static writeAll(input) {
        return new RecordBatchJSONWriter().writeAll(input);
    }
    _writeMessage() { return this; }
    _writeSchema(schema) {
        return this._write(`{\n  "schema": ${JSON.stringify({ fields: schema.fields.map(fieldToJSON) }, null, 2)}`)._writeDictionaries(schema.dictionaryFields);
    }
    _writeDictionaries(dictionaryFields) {
        this._write(`,\n  "dictionaries": [\n`);
        super._writeDictionaries(dictionaryFields);
        return this._write(`\n  ]`);
    }
    _writeDictionaryBatch(dictionary, id, isDelta = false) {
        this._write(this._dictionaryBlocks.length === 0 ? `    ` : `,\n    `);
        this._write(`${dictionaryBatchToJSON(this._schema, dictionary, id, isDelta)}`);
        this._dictionaryBlocks.push(new file_1.FileBlock(0, 0, 0));
        return this;
    }
    _writeRecordBatch(records) {
        this._write(this._recordBatchBlocks.length === 0
            ? `,\n  "batches": [\n    `
            : `,\n    `);
        this._write(`${recordBatchToJSON(records)}`);
        this._recordBatchBlocks.push(new file_1.FileBlock(0, 0, 0));
        return this;
    }
    close() {
        if (this._recordBatchBlocks.length > 0) {
            this._write(`\n  ]`);
        }
        if (this._schema) {
            this._write(`\n}`);
        }
        return super.close();
    }
}
exports.RecordBatchJSONWriter = RecordBatchJSONWriter;
/** @ignore */
function writeAll(writer, input) {
    let chunks = input;
    if (input instanceof table_1.Table) {
        chunks = input.chunks;
        writer.reset(undefined, input.schema);
    }
    for (const batch of chunks) {
        writer.write(batch);
    }
    return writer.finish();
}
/** @ignore */
async function writeAllAsync(writer, batches) {
    for await (const batch of batches) {
        writer.write(batch);
    }
    return writer.finish();
}
/** @ignore */
function fieldToJSON({ name, type, nullable }) {
    const assembler = new jsontypeassembler_1.JSONTypeAssembler();
    return {
        'name': name, 'nullable': nullable,
        'type': assembler.visit(type),
        'children': (type.children || []).map(fieldToJSON),
        'dictionary': !type_1.DataType.isDictionary(type) ? undefined : {
            'id': type.id,
            'isOrdered': type.isOrdered,
            'indexType': assembler.visit(type.indices)
        }
    };
}
/** @ignore */
function dictionaryBatchToJSON(schema, dictionary, id, isDelta = false) {
    const f = schema.dictionaryFields.get(id)[0];
    const field = new schema_1.Field(f.name, f.type.dictionary, f.nullable, f.metadata);
    const columns = jsonvectorassembler_1.JSONVectorAssembler.assemble(new column_1.Column(field, [dictionary]));
    return JSON.stringify({
        'id': id,
        'isDelta': isDelta,
        'data': {
            'count': dictionary.length,
            'columns': columns
        }
    }, null, 2);
}
/** @ignore */
function recordBatchToJSON(records) {
    return JSON.stringify({
        'count': records.length,
        'columns': jsonvectorassembler_1.JSONVectorAssembler.assemble(records)
    }, null, 2);
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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Y0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDM0UsTUFBTSxPQUFPLEdBQUcseUNBQW1CLENBQUMsUUFBUSxDQUFDLElBQUksZUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM5RSxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDbEIsSUFBSSxFQUFFLEVBQUU7UUFDUixTQUFTLEVBQUUsT0FBTztRQUNsQixNQUFNLEVBQUU7WUFDSixPQUFPLEVBQUUsVUFBVSxDQUFDLE1BQU07WUFDMUIsU0FBUyxFQUFFLE9BQU87U0FDckI7S0FDSixFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNoQixDQUFDO0FBRUQsY0FBYztBQUNkLFNBQVMsaUJBQWlCLENBQUMsT0FBb0I7SUFDM0MsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO1FBQ2xCLE9BQU8sRUFBRSxPQUFPLENBQUMsTUFBTTtRQUN2QixTQUFTLEVBQUUseUNBQW1CLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQztLQUNuRCxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNoQixDQUFDIiwiZmlsZSI6ImlwYy93cml0ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgVGFibGUgfSBmcm9tICcuLi90YWJsZSc7XG5pbXBvcnQgeyBNQUdJQyB9IGZyb20gJy4vbWVzc2FnZSc7XG5pbXBvcnQgeyBWZWN0b3IgfSBmcm9tICcuLi92ZWN0b3InO1xuaW1wb3J0IHsgQ29sdW1uIH0gZnJvbSAnLi4vY29sdW1uJztcbmltcG9ydCB7IFNjaGVtYSwgRmllbGQgfSBmcm9tICcuLi9zY2hlbWEnO1xuaW1wb3J0IHsgQ2h1bmtlZCB9IGZyb20gJy4uL3ZlY3Rvci9jaHVua2VkJztcbmltcG9ydCB7IE1lc3NhZ2UgfSBmcm9tICcuL21ldGFkYXRhL21lc3NhZ2UnO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2ggfSBmcm9tICcuLi9yZWNvcmRiYXRjaCc7XG5pbXBvcnQgKiBhcyBtZXRhZGF0YSBmcm9tICcuL21ldGFkYXRhL21lc3NhZ2UnO1xuaW1wb3J0IHsgRGF0YVR5cGUsIERpY3Rpb25hcnkgfSBmcm9tICcuLi90eXBlJztcbmltcG9ydCB7IEZpbGVCbG9jaywgRm9vdGVyIH0gZnJvbSAnLi9tZXRhZGF0YS9maWxlJztcbmltcG9ydCB7IE1lc3NhZ2VIZWFkZXIsIE1ldGFkYXRhVmVyc2lvbiB9IGZyb20gJy4uL2VudW0nO1xuaW1wb3J0IHsgV3JpdGFibGVTaW5rLCBBc3luY0J5dGVRdWV1ZSB9IGZyb20gJy4uL2lvL3N0cmVhbSc7XG5pbXBvcnQgeyBWZWN0b3JBc3NlbWJsZXIgfSBmcm9tICcuLi92aXNpdG9yL3ZlY3RvcmFzc2VtYmxlcic7XG5pbXBvcnQgeyBKU09OVHlwZUFzc2VtYmxlciB9IGZyb20gJy4uL3Zpc2l0b3IvanNvbnR5cGVhc3NlbWJsZXInO1xuaW1wb3J0IHsgSlNPTlZlY3RvckFzc2VtYmxlciB9IGZyb20gJy4uL3Zpc2l0b3IvanNvbnZlY3RvcmFzc2VtYmxlcic7XG5pbXBvcnQgeyBBcnJheUJ1ZmZlclZpZXdJbnB1dCwgdG9VaW50OEFycmF5IH0gZnJvbSAnLi4vdXRpbC9idWZmZXInO1xuaW1wb3J0IHsgV3JpdGFibGUsIFJlYWRhYmxlSW50ZXJvcCwgUmVhZGFibGVET01TdHJlYW1PcHRpb25zIH0gZnJvbSAnLi4vaW8vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBpc1Byb21pc2UsIGlzQXN5bmNJdGVyYWJsZSwgaXNXcml0YWJsZURPTVN0cmVhbSwgaXNXcml0YWJsZU5vZGVTdHJlYW0sIGlzSXRlcmFibGUgfSBmcm9tICcuLi91dGlsL2NvbXBhdCc7XG5cbmV4cG9ydCBjbGFzcyBSZWNvcmRCYXRjaFdyaXRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlYWRhYmxlSW50ZXJvcDxVaW50OEFycmF5PiBpbXBsZW1lbnRzIFdyaXRhYmxlPFJlY29yZEJhdGNoPFQ+PiB7XG5cbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIHN0YXRpYyB0aHJvdWdoTm9kZShvcHRpb25zPzogaW1wb3J0KCdzdHJlYW0nKS5EdXBsZXhPcHRpb25zICYgeyBhdXRvRGVzdHJveTogYm9vbGVhbiB9KTogaW1wb3J0KCdzdHJlYW0nKS5EdXBsZXgge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFwidGhyb3VnaE5vZGVcIiBub3QgYXZhaWxhYmxlIGluIHRoaXMgZW52aXJvbm1lbnRgKTtcbiAgICB9XG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyB0aHJvdWdoRE9NPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0+KFxuICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgIHdyaXRhYmxlU3RyYXRlZ3k/OiBRdWV1aW5nU3RyYXRlZ3k8UmVjb3JkQmF0Y2g8VD4+ICYgeyBhdXRvRGVzdHJveTogYm9vbGVhbiB9LFxuICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgIHJlYWRhYmxlU3RyYXRlZ3k/OiB7IGhpZ2hXYXRlck1hcms/OiBudW1iZXIsIHNpemU/OiBhbnkgfVxuICAgICk6IHsgd3JpdGFibGU6IFdyaXRhYmxlU3RyZWFtPFRhYmxlPFQ+IHwgUmVjb3JkQmF0Y2g8VD4+LCByZWFkYWJsZTogUmVhZGFibGVTdHJlYW08VWludDhBcnJheT4gfSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgXCJ0aHJvdWdoRE9NXCIgbm90IGF2YWlsYWJsZSBpbiB0aGlzIGVudmlyb25tZW50YCk7XG4gICAgfVxuXG4gICAgY29uc3RydWN0b3Iob3B0aW9ucz86IHsgYXV0b0Rlc3Ryb3k6IGJvb2xlYW4gfSkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLl9hdXRvRGVzdHJveSA9IG9wdGlvbnMgJiYgKHR5cGVvZiBvcHRpb25zLmF1dG9EZXN0cm95ID09PSAnYm9vbGVhbicpID8gb3B0aW9ucy5hdXRvRGVzdHJveSA6IHRydWU7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF9wb3NpdGlvbiA9IDA7XG4gICAgcHJvdGVjdGVkIF9zdGFydGVkID0gZmFsc2U7XG4gICAgcHJvdGVjdGVkIF9hdXRvRGVzdHJveTogYm9vbGVhbjtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHJvdGVjdGVkIF9zaW5rID0gbmV3IEFzeW5jQnl0ZVF1ZXVlKCk7XG4gICAgcHJvdGVjdGVkIF9zY2hlbWE6IFNjaGVtYSB8IG51bGwgPSBudWxsO1xuICAgIHByb3RlY3RlZCBfZGljdGlvbmFyeUJsb2NrczogRmlsZUJsb2NrW10gPSBbXTtcbiAgICBwcm90ZWN0ZWQgX3JlY29yZEJhdGNoQmxvY2tzOiBGaWxlQmxvY2tbXSA9IFtdO1xuXG4gICAgcHVibGljIHRvU3RyaW5nKHN5bmM6IHRydWUpOiBzdHJpbmc7XG4gICAgcHVibGljIHRvU3RyaW5nKHN5bmM/OiBmYWxzZSk6IFByb21pc2U8c3RyaW5nPjtcbiAgICBwdWJsaWMgdG9TdHJpbmcoc3luYzogYW55ID0gZmFsc2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NpbmsudG9TdHJpbmcoc3luYykgYXMgUHJvbWlzZTxzdHJpbmc+IHwgc3RyaW5nO1xuICAgIH1cbiAgICBwdWJsaWMgdG9VaW50OEFycmF5KHN5bmM6IHRydWUpOiBVaW50OEFycmF5O1xuICAgIHB1YmxpYyB0b1VpbnQ4QXJyYXkoc3luYz86IGZhbHNlKTogUHJvbWlzZTxVaW50OEFycmF5PjtcbiAgICBwdWJsaWMgdG9VaW50OEFycmF5KHN5bmM6IGFueSA9IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zaW5rLnRvVWludDhBcnJheShzeW5jKSBhcyBQcm9taXNlPFVpbnQ4QXJyYXk+IHwgVWludDhBcnJheTtcbiAgICB9XG5cbiAgICBwdWJsaWMgd3JpdGVBbGwoaW5wdXQ6IFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KTogdGhpcztcbiAgICBwdWJsaWMgd3JpdGVBbGwoaW5wdXQ6IEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KTogUHJvbWlzZTx0aGlzPjtcbiAgICBwdWJsaWMgd3JpdGVBbGwoaW5wdXQ6IFByb21pc2VMaWtlPEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+Pik6IFByb21pc2U8dGhpcz47XG4gICAgcHVibGljIHdyaXRlQWxsKGlucHV0OiBQcm9taXNlTGlrZTxUYWJsZTxUPiB8IEl0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pj4pOiBQcm9taXNlPHRoaXM+O1xuICAgIHB1YmxpYyB3cml0ZUFsbChpbnB1dDogUHJvbWlzZUxpa2U8YW55PiB8IFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+IHwgQXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pIHtcbiAgICAgICAgaWYgKGlzUHJvbWlzZTxhbnk+KGlucHV0KSkge1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0LnRoZW4oKHgpID0+IHRoaXMud3JpdGVBbGwoeCkpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzQXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4oaW5wdXQpKSB7XG4gICAgICAgICAgICByZXR1cm4gd3JpdGVBbGxBc3luYyh0aGlzLCBpbnB1dCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHdyaXRlQWxsKHRoaXMsIDxhbnk+IGlucHV0KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0IGNsb3NlZCgpIHsgcmV0dXJuIHRoaXMuX3NpbmsuY2xvc2VkOyB9XG4gICAgcHVibGljIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKSB7IHJldHVybiB0aGlzLl9zaW5rW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpOyB9XG4gICAgcHVibGljIHRvRE9NU3RyZWFtKG9wdGlvbnM/OiBSZWFkYWJsZURPTVN0cmVhbU9wdGlvbnMpIHsgcmV0dXJuIHRoaXMuX3NpbmsudG9ET01TdHJlYW0ob3B0aW9ucyk7IH1cbiAgICBwdWJsaWMgdG9Ob2RlU3RyZWFtKG9wdGlvbnM/OiBpbXBvcnQoJ3N0cmVhbScpLlJlYWRhYmxlT3B0aW9ucykgeyByZXR1cm4gdGhpcy5fc2luay50b05vZGVTdHJlYW0ob3B0aW9ucyk7IH1cblxuICAgIHB1YmxpYyBjbG9zZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVzZXQoKS5fc2luay5jbG9zZSgpO1xuICAgIH1cbiAgICBwdWJsaWMgYWJvcnQocmVhc29uPzogYW55KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlc2V0KCkuX3NpbmsuYWJvcnQocmVhc29uKTtcbiAgICB9XG4gICAgcHVibGljIGZpbmlzaCgpIHtcbiAgICAgICAgdGhpcy5fYXV0b0Rlc3Ryb3kgPyB0aGlzLmNsb3NlKCkgOiB0aGlzLnJlc2V0KHRoaXMuX3NpbmssIHRoaXMuX3NjaGVtYSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwdWJsaWMgcmVzZXQoc2luazogV3JpdGFibGVTaW5rPEFycmF5QnVmZmVyVmlld0lucHV0PiA9IHRoaXMuX3NpbmssIHNjaGVtYTogU2NoZW1hPFQ+IHwgbnVsbCA9IG51bGwpIHtcblxuICAgICAgICBpZiAoKHNpbmsgPT09IHRoaXMuX3NpbmspIHx8IChzaW5rIGluc3RhbmNlb2YgQXN5bmNCeXRlUXVldWUpKSB7XG4gICAgICAgICAgICB0aGlzLl9zaW5rID0gc2luayBhcyBBc3luY0J5dGVRdWV1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3NpbmsgPSBuZXcgQXN5bmNCeXRlUXVldWUoKTtcbiAgICAgICAgICAgIGlmIChzaW5rICYmIGlzV3JpdGFibGVET01TdHJlYW0oc2luaykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRvRE9NU3RyZWFtKHsgdHlwZTogJ2J5dGVzJyB9KS5waXBlVG8oc2luayk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNpbmsgJiYgaXNXcml0YWJsZU5vZGVTdHJlYW0oc2luaykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRvTm9kZVN0cmVhbSh7IG9iamVjdE1vZGU6IGZhbHNlIH0pLnBpcGUoc2luayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fc3RhcnRlZCAmJiB0aGlzLl9zY2hlbWEpIHtcbiAgICAgICAgICAgIHRoaXMuX3dyaXRlRm9vdGVyKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9zdGFydGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2RpY3Rpb25hcnlCbG9ja3MgPSBbXTtcbiAgICAgICAgdGhpcy5fcmVjb3JkQmF0Y2hCbG9ja3MgPSBbXTtcblxuICAgICAgICBpZiAoIXNjaGVtYSB8fCAhKHNjaGVtYS5jb21wYXJlVG8odGhpcy5fc2NoZW1hKSkpIHtcbiAgICAgICAgICAgIGlmIChzY2hlbWEgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9wb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2NoZW1hID0gbnVsbDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhcnRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2NoZW1hID0gc2NoZW1hO1xuICAgICAgICAgICAgICAgIHRoaXMuX3dyaXRlU2NoZW1hKHNjaGVtYSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBwdWJsaWMgd3JpdGUocGF5bG9hZD86IFRhYmxlPFQ+IHwgUmVjb3JkQmF0Y2g8VD4gfCBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4gfCBudWxsKSB7XG5cbiAgICAgICAgbGV0IHNjaGVtYTogU2NoZW1hPFQ+IHwgbnVsbCA9IG51bGw7XG5cbiAgICAgICAgaWYgKCF0aGlzLl9zaW5rKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlY29yZEJhdGNoV3JpdGVyIGlzIGNsb3NlZGApO1xuICAgICAgICB9IGVsc2UgaWYgKHBheWxvYWQgPT09IG51bGwgfHwgcGF5bG9hZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5maW5pc2goKSAmJiB1bmRlZmluZWQ7XG4gICAgICAgIH0gZWxzZSBpZiAocGF5bG9hZCBpbnN0YW5jZW9mIFRhYmxlICYmICEoc2NoZW1hID0gcGF5bG9hZC5zY2hlbWEpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5maW5pc2goKSAmJiB1bmRlZmluZWQ7XG4gICAgICAgIH0gZWxzZSBpZiAocGF5bG9hZCBpbnN0YW5jZW9mIFJlY29yZEJhdGNoICYmICEoc2NoZW1hID0gcGF5bG9hZC5zY2hlbWEpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5maW5pc2goKSAmJiB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc2NoZW1hICYmICFzY2hlbWEuY29tcGFyZVRvKHRoaXMuX3NjaGVtYSkpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9zdGFydGVkICYmIHRoaXMuX2F1dG9EZXN0cm95KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMucmVzZXQodGhpcy5fc2luaywgc2NoZW1hKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwYXlsb2FkIGluc3RhbmNlb2YgUmVjb3JkQmF0Y2gpIHtcbiAgICAgICAgICAgIHRoaXMuX3dyaXRlUmVjb3JkQmF0Y2gocGF5bG9hZCk7XG4gICAgICAgIH0gZWxzZSBpZiAocGF5bG9hZCBpbnN0YW5jZW9mIFRhYmxlKSB7XG4gICAgICAgICAgICB0aGlzLndyaXRlQWxsKHBheWxvYWQuY2h1bmtzKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0l0ZXJhYmxlKHBheWxvYWQpKSB7XG4gICAgICAgICAgICB0aGlzLndyaXRlQWxsKHBheWxvYWQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZU1lc3NhZ2U8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KG1lc3NhZ2U6IE1lc3NhZ2U8VD4sIGFsaWdubWVudCA9IDgpIHtcblxuICAgICAgICBjb25zdCBhID0gYWxpZ25tZW50IC0gMTtcbiAgICAgICAgY29uc3QgYnVmZmVyID0gTWVzc2FnZS5lbmNvZGUobWVzc2FnZSk7XG4gICAgICAgIGNvbnN0IGZsYXRidWZmZXJTaXplID0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgICAgIGNvbnN0IGFsaWduZWRTaXplID0gKGZsYXRidWZmZXJTaXplICsgNCArIGEpICYgfmE7XG4gICAgICAgIGNvbnN0IG5QYWRkaW5nQnl0ZXMgPSBhbGlnbmVkU2l6ZSAtIGZsYXRidWZmZXJTaXplIC0gNDtcblxuICAgICAgICBpZiAobWVzc2FnZS5oZWFkZXJUeXBlID09PSBNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoKSB7XG4gICAgICAgICAgICB0aGlzLl9yZWNvcmRCYXRjaEJsb2Nrcy5wdXNoKG5ldyBGaWxlQmxvY2soYWxpZ25lZFNpemUsIG1lc3NhZ2UuYm9keUxlbmd0aCwgdGhpcy5fcG9zaXRpb24pKTtcbiAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmhlYWRlclR5cGUgPT09IE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoKSB7XG4gICAgICAgICAgICB0aGlzLl9kaWN0aW9uYXJ5QmxvY2tzLnB1c2gobmV3IEZpbGVCbG9jayhhbGlnbmVkU2l6ZSwgbWVzc2FnZS5ib2R5TGVuZ3RoLCB0aGlzLl9wb3NpdGlvbikpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gV3JpdGUgdGhlIGZsYXRidWZmZXIgc2l6ZSBwcmVmaXggaW5jbHVkaW5nIHBhZGRpbmdcbiAgICAgICAgdGhpcy5fd3JpdGUoSW50MzJBcnJheS5vZihhbGlnbmVkU2l6ZSAtIDQpKTtcbiAgICAgICAgLy8gV3JpdGUgdGhlIGZsYXRidWZmZXJcbiAgICAgICAgaWYgKGZsYXRidWZmZXJTaXplID4gMCkgeyB0aGlzLl93cml0ZShidWZmZXIpOyB9XG4gICAgICAgIC8vIFdyaXRlIGFueSBwYWRkaW5nXG4gICAgICAgIHJldHVybiB0aGlzLl93cml0ZVBhZGRpbmcoblBhZGRpbmdCeXRlcyk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZShjaHVuazogQXJyYXlCdWZmZXJWaWV3SW5wdXQpIHtcbiAgICAgICAgaWYgKHRoaXMuX3N0YXJ0ZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IHRvVWludDhBcnJheShjaHVuayk7XG4gICAgICAgICAgICBpZiAoYnVmZmVyICYmIGJ1ZmZlci5ieXRlTGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3Npbmsud3JpdGUoYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9wb3NpdGlvbiArPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlU2NoZW1hKHNjaGVtYTogU2NoZW1hPFQ+KSB7XG4gICAgICAgIHJldHVybiB0aGlzXG4gICAgICAgICAgICAuX3dyaXRlTWVzc2FnZShNZXNzYWdlLmZyb20oc2NoZW1hKSlcbiAgICAgICAgICAgIC5fd3JpdGVEaWN0aW9uYXJpZXMoc2NoZW1hLmRpY3Rpb25hcnlGaWVsZHMpO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGVGb290ZXIoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl93cml0ZVBhZGRpbmcoNCk7IC8vIGVvcyBieXRlc1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGVNYWdpYygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3dyaXRlKE1BR0lDKTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlUGFkZGluZyhuQnl0ZXM6IG51bWJlcikge1xuICAgICAgICByZXR1cm4gbkJ5dGVzID4gMCA/IHRoaXMuX3dyaXRlKG5ldyBVaW50OEFycmF5KG5CeXRlcykpIDogdGhpcztcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlUmVjb3JkQmF0Y2gocmVjb3JkczogUmVjb3JkQmF0Y2g8VD4pIHtcbiAgICAgICAgY29uc3QgeyBieXRlTGVuZ3RoLCBub2RlcywgYnVmZmVyUmVnaW9ucywgYnVmZmVycyB9ID0gVmVjdG9yQXNzZW1ibGVyLmFzc2VtYmxlKHJlY29yZHMpO1xuICAgICAgICBjb25zdCByZWNvcmRCYXRjaCA9IG5ldyBtZXRhZGF0YS5SZWNvcmRCYXRjaChyZWNvcmRzLmxlbmd0aCwgbm9kZXMsIGJ1ZmZlclJlZ2lvbnMpO1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gTWVzc2FnZS5mcm9tKHJlY29yZEJhdGNoLCBieXRlTGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICAgICAgICAgIC5fd3JpdGVNZXNzYWdlKG1lc3NhZ2UpXG4gICAgICAgICAgICAuX3dyaXRlQm9keUJ1ZmZlcnMoYnVmZmVycyk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZURpY3Rpb25hcnlCYXRjaChkaWN0aW9uYXJ5OiBWZWN0b3IsIGlkOiBudW1iZXIsIGlzRGVsdGEgPSBmYWxzZSkge1xuICAgICAgICBjb25zdCB7IGJ5dGVMZW5ndGgsIG5vZGVzLCBidWZmZXJSZWdpb25zLCBidWZmZXJzIH0gPSBWZWN0b3JBc3NlbWJsZXIuYXNzZW1ibGUoZGljdGlvbmFyeSk7XG4gICAgICAgIGNvbnN0IHJlY29yZEJhdGNoID0gbmV3IG1ldGFkYXRhLlJlY29yZEJhdGNoKGRpY3Rpb25hcnkubGVuZ3RoLCBub2RlcywgYnVmZmVyUmVnaW9ucyk7XG4gICAgICAgIGNvbnN0IGRpY3Rpb25hcnlCYXRjaCA9IG5ldyBtZXRhZGF0YS5EaWN0aW9uYXJ5QmF0Y2gocmVjb3JkQmF0Y2gsIGlkLCBpc0RlbHRhKTtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IE1lc3NhZ2UuZnJvbShkaWN0aW9uYXJ5QmF0Y2gsIGJ5dGVMZW5ndGgpO1xuICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgICAgICAgLl93cml0ZU1lc3NhZ2UobWVzc2FnZSlcbiAgICAgICAgICAgIC5fd3JpdGVCb2R5QnVmZmVycyhidWZmZXJzKTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlQm9keUJ1ZmZlcnMoYnVmZmVyczogQXJyYXlCdWZmZXJWaWV3W10pIHtcbiAgICAgICAgbGV0IGJ1ZmZlcjogQXJyYXlCdWZmZXJWaWV3O1xuICAgICAgICBsZXQgc2l6ZTogbnVtYmVyLCBwYWRkaW5nOiBudW1iZXI7XG4gICAgICAgIGZvciAobGV0IGkgPSAtMSwgbiA9IGJ1ZmZlcnMubGVuZ3RoOyArK2kgPCBuOykge1xuICAgICAgICAgICAgaWYgKChidWZmZXIgPSBidWZmZXJzW2ldKSAmJiAoc2l6ZSA9IGJ1ZmZlci5ieXRlTGVuZ3RoKSA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLl93cml0ZShidWZmZXIpO1xuICAgICAgICAgICAgICAgIGlmICgocGFkZGluZyA9ICgoc2l6ZSArIDcpICYgfjcpIC0gc2l6ZSkgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3dyaXRlUGFkZGluZyhwYWRkaW5nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZURpY3Rpb25hcmllcyhkaWN0aW9uYXJ5RmllbGRzOiBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5PGFueSwgYW55Pj5bXT4pIHtcbiAgICAgICAgZm9yIChjb25zdCBbaWQsIGZpZWxkc10gb2YgZGljdGlvbmFyeUZpZWxkcykge1xuICAgICAgICAgICAgY29uc3QgdmVjdG9yID0gZmllbGRzWzBdLnR5cGUuZGljdGlvbmFyeVZlY3RvcjtcbiAgICAgICAgICAgIGlmICghKHZlY3RvciBpbnN0YW5jZW9mIENodW5rZWQpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fd3JpdGVEaWN0aW9uYXJ5QmF0Y2godmVjdG9yLCBpZCwgZmFsc2UpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjaHVua3MgPSB2ZWN0b3IuY2h1bmtzO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAtMSwgbiA9IGNodW5rcy5sZW5ndGg7ICsraSA8IG47KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3dyaXRlRGljdGlvbmFyeUJhdGNoKGNodW5rc1tpXSwgaWQsIGkgPiAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIFJlY29yZEJhdGNoU3RyZWFtV3JpdGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hXcml0ZXI8VD4ge1xuXG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih0aGlzOiB0eXBlb2YgUmVjb3JkQmF0Y2hXcml0ZXIsIGlucHV0OiBUYWJsZTxUPiB8IEl0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Piwgb3B0aW9ucz86IHsgYXV0b0Rlc3Ryb3k6IHRydWUgfSk6IFJlY29yZEJhdGNoU3RyZWFtV3JpdGVyPFQ+O1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+LCBvcHRpb25zPzogeyBhdXRvRGVzdHJveTogdHJ1ZSB9KTogUHJvbWlzZTxSZWNvcmRCYXRjaFN0cmVhbVdyaXRlcjxUPj47XG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih0aGlzOiB0eXBlb2YgUmVjb3JkQmF0Y2hXcml0ZXIsIGlucHV0OiBQcm9taXNlTGlrZTxBc3luY0l0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pj4sIG9wdGlvbnM/OiB7IGF1dG9EZXN0cm95OiB0cnVlIH0pOiBQcm9taXNlPFJlY29yZEJhdGNoU3RyZWFtV3JpdGVyPFQ+PjtcbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IFByb21pc2VMaWtlPFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+Piwgb3B0aW9ucz86IHsgYXV0b0Rlc3Ryb3k6IHRydWUgfSk6IFByb21pc2U8UmVjb3JkQmF0Y2hTdHJlYW1Xcml0ZXI8VD4+O1xuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogYW55LCBvcHRpb25zPzogeyBhdXRvRGVzdHJveTogdHJ1ZSB9KSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVjb3JkQmF0Y2hTdHJlYW1Xcml0ZXI8VD4ob3B0aW9ucykud3JpdGVBbGwoaW5wdXQpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjbGFzcyBSZWNvcmRCYXRjaEZpbGVXcml0ZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFdyaXRlcjxUPiB7XG5cbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KTogUmVjb3JkQmF0Y2hGaWxlV3JpdGVyPFQ+O1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KTogUHJvbWlzZTxSZWNvcmRCYXRjaEZpbGVXcml0ZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogUHJvbWlzZUxpa2U8QXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4+KTogUHJvbWlzZTxSZWNvcmRCYXRjaEZpbGVXcml0ZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogUHJvbWlzZUxpa2U8VGFibGU8VD4gfCBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4+KTogUHJvbWlzZTxSZWNvcmRCYXRjaEZpbGVXcml0ZXI8VD4+O1xuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogYW55KSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVjb3JkQmF0Y2hGaWxlV3JpdGVyPFQ+KCkud3JpdGVBbGwoaW5wdXQpO1xuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLl9hdXRvRGVzdHJveSA9IHRydWU7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZVNjaGVtYShzY2hlbWE6IFNjaGVtYTxUPikge1xuICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgICAgICAgLl93cml0ZU1hZ2ljKCkuX3dyaXRlUGFkZGluZygyKVxuICAgICAgICAgICAgLl93cml0ZURpY3Rpb25hcmllcyhzY2hlbWEuZGljdGlvbmFyeUZpZWxkcyk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZUZvb3RlcigpIHtcbiAgICAgICAgY29uc3QgYnVmZmVyID0gRm9vdGVyLmVuY29kZShuZXcgRm9vdGVyKFxuICAgICAgICAgICAgdGhpcy5fc2NoZW1hISwgTWV0YWRhdGFWZXJzaW9uLlY0LFxuICAgICAgICAgICAgdGhpcy5fcmVjb3JkQmF0Y2hCbG9ja3MsIHRoaXMuX2RpY3Rpb25hcnlCbG9ja3NcbiAgICAgICAgKSk7XG4gICAgICAgIHJldHVybiB0aGlzXG4gICAgICAgICAgICAuX3dyaXRlKGJ1ZmZlcikgLy8gV3JpdGUgdGhlIGZsYXRidWZmZXJcbiAgICAgICAgICAgIC5fd3JpdGUoSW50MzJBcnJheS5vZihidWZmZXIuYnl0ZUxlbmd0aCkpIC8vIHRoZW4gdGhlIGZvb3RlciBzaXplIHN1ZmZpeFxuICAgICAgICAgICAgLl93cml0ZU1hZ2ljKCk7IC8vIHRoZW4gdGhlIG1hZ2ljIHN1ZmZpeFxuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjbGFzcyBSZWNvcmRCYXRjaEpTT05Xcml0ZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFdyaXRlcjxUPiB7XG5cbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KTogUmVjb3JkQmF0Y2hKU09OV3JpdGVyPFQ+O1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KTogUHJvbWlzZTxSZWNvcmRCYXRjaEpTT05Xcml0ZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogUHJvbWlzZUxpa2U8QXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4+KTogUHJvbWlzZTxSZWNvcmRCYXRjaEpTT05Xcml0ZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogUHJvbWlzZUxpa2U8VGFibGU8VD4gfCBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4+KTogUHJvbWlzZTxSZWNvcmRCYXRjaEpTT05Xcml0ZXI8VD4+O1xuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogYW55KSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVjb3JkQmF0Y2hKU09OV3JpdGVyPFQ+KCkud3JpdGVBbGwoaW5wdXQgYXMgYW55KTtcbiAgICB9XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5fYXV0b0Rlc3Ryb3kgPSB0cnVlO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGVNZXNzYWdlKCkgeyByZXR1cm4gdGhpczsgfVxuICAgIHByb3RlY3RlZCBfd3JpdGVTY2hlbWEoc2NoZW1hOiBTY2hlbWE8VD4pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3dyaXRlKGB7XFxuICBcInNjaGVtYVwiOiAke1xuICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoeyBmaWVsZHM6IHNjaGVtYS5maWVsZHMubWFwKGZpZWxkVG9KU09OKSB9LCBudWxsLCAyKVxuICAgICAgICB9YCkuX3dyaXRlRGljdGlvbmFyaWVzKHNjaGVtYS5kaWN0aW9uYXJ5RmllbGRzKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIF93cml0ZURpY3Rpb25hcmllcyhkaWN0aW9uYXJ5RmllbGRzOiBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5PGFueSwgYW55Pj5bXT4pIHtcbiAgICAgICAgdGhpcy5fd3JpdGUoYCxcXG4gIFwiZGljdGlvbmFyaWVzXCI6IFtcXG5gKTtcbiAgICAgICAgc3VwZXIuX3dyaXRlRGljdGlvbmFyaWVzKGRpY3Rpb25hcnlGaWVsZHMpO1xuICAgICAgICByZXR1cm4gdGhpcy5fd3JpdGUoYFxcbiAgXWApO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgX3dyaXRlRGljdGlvbmFyeUJhdGNoKGRpY3Rpb25hcnk6IFZlY3RvciwgaWQ6IG51bWJlciwgaXNEZWx0YSA9IGZhbHNlKSB7XG4gICAgICAgIHRoaXMuX3dyaXRlKHRoaXMuX2RpY3Rpb25hcnlCbG9ja3MubGVuZ3RoID09PSAwID8gYCAgICBgIDogYCxcXG4gICAgYCk7XG4gICAgICAgIHRoaXMuX3dyaXRlKGAke2RpY3Rpb25hcnlCYXRjaFRvSlNPTih0aGlzLl9zY2hlbWEhLCBkaWN0aW9uYXJ5LCBpZCwgaXNEZWx0YSl9YCk7XG4gICAgICAgIHRoaXMuX2RpY3Rpb25hcnlCbG9ja3MucHVzaChuZXcgRmlsZUJsb2NrKDAsIDAsIDApKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHByb3RlY3RlZCBfd3JpdGVSZWNvcmRCYXRjaChyZWNvcmRzOiBSZWNvcmRCYXRjaDxUPikge1xuICAgICAgICB0aGlzLl93cml0ZSh0aGlzLl9yZWNvcmRCYXRjaEJsb2Nrcy5sZW5ndGggPT09IDBcbiAgICAgICAgICAgID8gYCxcXG4gIFwiYmF0Y2hlc1wiOiBbXFxuICAgIGBcbiAgICAgICAgICAgIDogYCxcXG4gICAgYCk7XG4gICAgICAgIHRoaXMuX3dyaXRlKGAke3JlY29yZEJhdGNoVG9KU09OKHJlY29yZHMpfWApO1xuICAgICAgICB0aGlzLl9yZWNvcmRCYXRjaEJsb2Nrcy5wdXNoKG5ldyBGaWxlQmxvY2soMCwgMCwgMCkpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHVibGljIGNsb3NlKCkge1xuICAgICAgICBpZiAodGhpcy5fcmVjb3JkQmF0Y2hCbG9ja3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdGhpcy5fd3JpdGUoYFxcbiAgXWApO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLl9zY2hlbWEpIHtcbiAgICAgICAgICAgIHRoaXMuX3dyaXRlKGBcXG59YCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN1cGVyLmNsb3NlKCk7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4od3JpdGVyOiBSZWNvcmRCYXRjaFdyaXRlcjxUPiwgaW5wdXQ6IFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KSB7XG4gICAgbGV0IGNodW5rcyA9IGlucHV0IGFzIEl0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+PjtcbiAgICBpZiAoaW5wdXQgaW5zdGFuY2VvZiBUYWJsZSkge1xuICAgICAgICBjaHVua3MgPSBpbnB1dC5jaHVua3M7XG4gICAgICAgIHdyaXRlci5yZXNldCh1bmRlZmluZWQsIGlucHV0LnNjaGVtYSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgYmF0Y2ggb2YgY2h1bmtzKSB7XG4gICAgICAgIHdyaXRlci53cml0ZShiYXRjaCk7XG4gICAgfVxuICAgIHJldHVybiB3cml0ZXIuZmluaXNoKCk7XG59XG5cbi8qKiBAaWdub3JlICovXG5hc3luYyBmdW5jdGlvbiB3cml0ZUFsbEFzeW5jPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHdyaXRlcjogUmVjb3JkQmF0Y2hXcml0ZXI8VD4sIGJhdGNoZXM6IEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KSB7XG4gICAgZm9yIGF3YWl0IChjb25zdCBiYXRjaCBvZiBiYXRjaGVzKSB7XG4gICAgICAgIHdyaXRlci53cml0ZShiYXRjaCk7XG4gICAgfVxuICAgIHJldHVybiB3cml0ZXIuZmluaXNoKCk7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBmaWVsZFRvSlNPTih7IG5hbWUsIHR5cGUsIG51bGxhYmxlIH06IEZpZWxkKTogb2JqZWN0IHtcbiAgICBjb25zdCBhc3NlbWJsZXIgPSBuZXcgSlNPTlR5cGVBc3NlbWJsZXIoKTtcbiAgICByZXR1cm4ge1xuICAgICAgICAnbmFtZSc6IG5hbWUsICdudWxsYWJsZSc6IG51bGxhYmxlLFxuICAgICAgICAndHlwZSc6IGFzc2VtYmxlci52aXNpdCh0eXBlKSxcbiAgICAgICAgJ2NoaWxkcmVuJzogKHR5cGUuY2hpbGRyZW4gfHwgW10pLm1hcChmaWVsZFRvSlNPTiksXG4gICAgICAgICdkaWN0aW9uYXJ5JzogIURhdGFUeXBlLmlzRGljdGlvbmFyeSh0eXBlKSA/IHVuZGVmaW5lZCA6IHtcbiAgICAgICAgICAgICdpZCc6IHR5cGUuaWQsXG4gICAgICAgICAgICAnaXNPcmRlcmVkJzogdHlwZS5pc09yZGVyZWQsXG4gICAgICAgICAgICAnaW5kZXhUeXBlJzogYXNzZW1ibGVyLnZpc2l0KHR5cGUuaW5kaWNlcylcbiAgICAgICAgfVxuICAgIH07XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBkaWN0aW9uYXJ5QmF0Y2hUb0pTT04oc2NoZW1hOiBTY2hlbWEsIGRpY3Rpb25hcnk6IFZlY3RvciwgaWQ6IG51bWJlciwgaXNEZWx0YSA9IGZhbHNlKSB7XG4gICAgY29uc3QgZiA9IHNjaGVtYS5kaWN0aW9uYXJ5RmllbGRzLmdldChpZCkhWzBdO1xuICAgIGNvbnN0IGZpZWxkID0gbmV3IEZpZWxkKGYubmFtZSwgZi50eXBlLmRpY3Rpb25hcnksIGYubnVsbGFibGUsIGYubWV0YWRhdGEpO1xuICAgIGNvbnN0IGNvbHVtbnMgPSBKU09OVmVjdG9yQXNzZW1ibGVyLmFzc2VtYmxlKG5ldyBDb2x1bW4oZmllbGQsIFtkaWN0aW9uYXJ5XSkpO1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICdpZCc6IGlkLFxuICAgICAgICAnaXNEZWx0YSc6IGlzRGVsdGEsXG4gICAgICAgICdkYXRhJzoge1xuICAgICAgICAgICAgJ2NvdW50JzogZGljdGlvbmFyeS5sZW5ndGgsXG4gICAgICAgICAgICAnY29sdW1ucyc6IGNvbHVtbnNcbiAgICAgICAgfVxuICAgIH0sIG51bGwsIDIpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gcmVjb3JkQmF0Y2hUb0pTT04ocmVjb3JkczogUmVjb3JkQmF0Y2gpIHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAnY291bnQnOiByZWNvcmRzLmxlbmd0aCxcbiAgICAgICAgJ2NvbHVtbnMnOiBKU09OVmVjdG9yQXNzZW1ibGVyLmFzc2VtYmxlKHJlY29yZHMpXG4gICAgfSwgbnVsbCwgMik7XG59XG4iXX0=

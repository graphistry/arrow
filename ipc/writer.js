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
    write(chunk) {
        let schema;
        if (!this._sink) {
            throw new Error(`RecordBatchWriter is closed`);
        }
        else if (!chunk || !(schema = chunk.schema)) {
            return this.finish() && undefined;
        }
        else if (schema !== this._schema) {
            if (this._started && this._autoDestroy) {
                return this.close();
            }
            this.reset(this._sink, schema);
        }
        (chunk instanceof table_1.Table)
            ? this.writeAll(chunk.chunks)
            : this._writeRecordBatch(chunk);
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
    const chunks = (input instanceof table_1.Table) ? input.chunks : input;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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O1FBQ2xCLE9BQU8sRUFBRSxPQUFPLENBQUMsTUFBTTtRQUN2QixTQUFTLEVBQUUseUNBQW1CLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQztLQUNuRCxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNoQixDQUFDIiwiZmlsZSI6ImlwYy93cml0ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgVGFibGUgfSBmcm9tICcuLi90YWJsZSc7XG5pbXBvcnQgeyBNQUdJQyB9IGZyb20gJy4vbWVzc2FnZSc7XG5pbXBvcnQgeyBWZWN0b3IgfSBmcm9tICcuLi92ZWN0b3InO1xuaW1wb3J0IHsgQ29sdW1uIH0gZnJvbSAnLi4vY29sdW1uJztcbmltcG9ydCB7IFNjaGVtYSwgRmllbGQgfSBmcm9tICcuLi9zY2hlbWEnO1xuaW1wb3J0IHsgQ2h1bmtlZCB9IGZyb20gJy4uL3ZlY3Rvci9jaHVua2VkJztcbmltcG9ydCB7IE1lc3NhZ2UgfSBmcm9tICcuL21ldGFkYXRhL21lc3NhZ2UnO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2ggfSBmcm9tICcuLi9yZWNvcmRiYXRjaCc7XG5pbXBvcnQgKiBhcyBtZXRhZGF0YSBmcm9tICcuL21ldGFkYXRhL21lc3NhZ2UnO1xuaW1wb3J0IHsgRGF0YVR5cGUsIERpY3Rpb25hcnkgfSBmcm9tICcuLi90eXBlJztcbmltcG9ydCB7IEZpbGVCbG9jaywgRm9vdGVyIH0gZnJvbSAnLi9tZXRhZGF0YS9maWxlJztcbmltcG9ydCB7IE1lc3NhZ2VIZWFkZXIsIE1ldGFkYXRhVmVyc2lvbiB9IGZyb20gJy4uL2VudW0nO1xuaW1wb3J0IHsgV3JpdGFibGVTaW5rLCBBc3luY0J5dGVRdWV1ZSB9IGZyb20gJy4uL2lvL3N0cmVhbSc7XG5pbXBvcnQgeyBWZWN0b3JBc3NlbWJsZXIgfSBmcm9tICcuLi92aXNpdG9yL3ZlY3RvcmFzc2VtYmxlcic7XG5pbXBvcnQgeyBKU09OVHlwZUFzc2VtYmxlciB9IGZyb20gJy4uL3Zpc2l0b3IvanNvbnR5cGVhc3NlbWJsZXInO1xuaW1wb3J0IHsgSlNPTlZlY3RvckFzc2VtYmxlciB9IGZyb20gJy4uL3Zpc2l0b3IvanNvbnZlY3RvcmFzc2VtYmxlcic7XG5pbXBvcnQgeyBBcnJheUJ1ZmZlclZpZXdJbnB1dCwgdG9VaW50OEFycmF5IH0gZnJvbSAnLi4vdXRpbC9idWZmZXInO1xuaW1wb3J0IHsgV3JpdGFibGUsIFJlYWRhYmxlSW50ZXJvcCwgUmVhZGFibGVET01TdHJlYW1PcHRpb25zIH0gZnJvbSAnLi4vaW8vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBpc1Byb21pc2UsIGlzQXN5bmNJdGVyYWJsZSwgaXNXcml0YWJsZURPTVN0cmVhbSwgaXNXcml0YWJsZU5vZGVTdHJlYW0gfSBmcm9tICcuLi91dGlsL2NvbXBhdCc7XG5cbmV4cG9ydCBjbGFzcyBSZWNvcmRCYXRjaFdyaXRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlYWRhYmxlSW50ZXJvcDxVaW50OEFycmF5PiBpbXBsZW1lbnRzIFdyaXRhYmxlPFJlY29yZEJhdGNoPFQ+PiB7XG5cbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIHN0YXRpYyB0aHJvdWdoTm9kZShvcHRpb25zPzogaW1wb3J0KCdzdHJlYW0nKS5EdXBsZXhPcHRpb25zICYgeyBhdXRvRGVzdHJveTogYm9vbGVhbiB9KTogaW1wb3J0KCdzdHJlYW0nKS5EdXBsZXgge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFwidGhyb3VnaE5vZGVcIiBub3QgYXZhaWxhYmxlIGluIHRoaXMgZW52aXJvbm1lbnRgKTtcbiAgICB9XG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyB0aHJvdWdoRE9NPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0+KFxuICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgIHdyaXRhYmxlU3RyYXRlZ3k/OiBRdWV1aW5nU3RyYXRlZ3k8UmVjb3JkQmF0Y2g8VD4+ICYgeyBhdXRvRGVzdHJveTogYm9vbGVhbiB9LFxuICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgIHJlYWRhYmxlU3RyYXRlZ3k/OiB7IGhpZ2hXYXRlck1hcms/OiBudW1iZXIsIHNpemU/OiBhbnkgfVxuICAgICk6IHsgd3JpdGFibGU6IFdyaXRhYmxlU3RyZWFtPFRhYmxlPFQ+IHwgUmVjb3JkQmF0Y2g8VD4+LCByZWFkYWJsZTogUmVhZGFibGVTdHJlYW08VWludDhBcnJheT4gfSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgXCJ0aHJvdWdoRE9NXCIgbm90IGF2YWlsYWJsZSBpbiB0aGlzIGVudmlyb25tZW50YCk7XG4gICAgfVxuXG4gICAgY29uc3RydWN0b3Iob3B0aW9ucz86IHsgYXV0b0Rlc3Ryb3k6IGJvb2xlYW4gfSkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLl9hdXRvRGVzdHJveSA9IG9wdGlvbnMgJiYgKHR5cGVvZiBvcHRpb25zLmF1dG9EZXN0cm95ID09PSAnYm9vbGVhbicpID8gb3B0aW9ucy5hdXRvRGVzdHJveSA6IHRydWU7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF9wb3NpdGlvbiA9IDA7XG4gICAgcHJvdGVjdGVkIF9zdGFydGVkID0gZmFsc2U7XG4gICAgcHJvdGVjdGVkIF9hdXRvRGVzdHJveTogYm9vbGVhbjtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHJvdGVjdGVkIF9zaW5rID0gbmV3IEFzeW5jQnl0ZVF1ZXVlKCk7XG4gICAgcHJvdGVjdGVkIF9zY2hlbWE6IFNjaGVtYSB8IG51bGwgPSBudWxsO1xuICAgIHByb3RlY3RlZCBfZGljdGlvbmFyeUJsb2NrczogRmlsZUJsb2NrW10gPSBbXTtcbiAgICBwcm90ZWN0ZWQgX3JlY29yZEJhdGNoQmxvY2tzOiBGaWxlQmxvY2tbXSA9IFtdO1xuXG4gICAgcHVibGljIHRvU3RyaW5nKHN5bmM6IHRydWUpOiBzdHJpbmc7XG4gICAgcHVibGljIHRvU3RyaW5nKHN5bmM/OiBmYWxzZSk6IFByb21pc2U8c3RyaW5nPjtcbiAgICBwdWJsaWMgdG9TdHJpbmcoc3luYzogYW55ID0gZmFsc2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NpbmsudG9TdHJpbmcoc3luYykgYXMgUHJvbWlzZTxzdHJpbmc+IHwgc3RyaW5nO1xuICAgIH1cbiAgICBwdWJsaWMgdG9VaW50OEFycmF5KHN5bmM6IHRydWUpOiBVaW50OEFycmF5O1xuICAgIHB1YmxpYyB0b1VpbnQ4QXJyYXkoc3luYz86IGZhbHNlKTogUHJvbWlzZTxVaW50OEFycmF5PjtcbiAgICBwdWJsaWMgdG9VaW50OEFycmF5KHN5bmM6IGFueSA9IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zaW5rLnRvVWludDhBcnJheShzeW5jKSBhcyBQcm9taXNlPFVpbnQ4QXJyYXk+IHwgVWludDhBcnJheTtcbiAgICB9XG5cbiAgICBwdWJsaWMgd3JpdGVBbGwoaW5wdXQ6IFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KTogdGhpcztcbiAgICBwdWJsaWMgd3JpdGVBbGwoaW5wdXQ6IEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KTogUHJvbWlzZTx0aGlzPjtcbiAgICBwdWJsaWMgd3JpdGVBbGwoaW5wdXQ6IFByb21pc2VMaWtlPEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+Pik6IFByb21pc2U8dGhpcz47XG4gICAgcHVibGljIHdyaXRlQWxsKGlucHV0OiBQcm9taXNlTGlrZTxUYWJsZTxUPiB8IEl0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pj4pOiBQcm9taXNlPHRoaXM+O1xuICAgIHB1YmxpYyB3cml0ZUFsbChpbnB1dDogUHJvbWlzZUxpa2U8YW55PiB8IFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+IHwgQXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pIHtcbiAgICAgICAgaWYgKGlzUHJvbWlzZTxhbnk+KGlucHV0KSkge1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0LnRoZW4oKHgpID0+IHRoaXMud3JpdGVBbGwoeCkpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzQXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4oaW5wdXQpKSB7XG4gICAgICAgICAgICByZXR1cm4gd3JpdGVBbGxBc3luYyh0aGlzLCBpbnB1dCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHdyaXRlQWxsKHRoaXMsIDxhbnk+IGlucHV0KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0IGNsb3NlZCgpIHsgcmV0dXJuIHRoaXMuX3NpbmsuY2xvc2VkOyB9XG4gICAgcHVibGljIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKSB7IHJldHVybiB0aGlzLl9zaW5rW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpOyB9XG4gICAgcHVibGljIHRvRE9NU3RyZWFtKG9wdGlvbnM/OiBSZWFkYWJsZURPTVN0cmVhbU9wdGlvbnMpIHsgcmV0dXJuIHRoaXMuX3NpbmsudG9ET01TdHJlYW0ob3B0aW9ucyk7IH1cbiAgICBwdWJsaWMgdG9Ob2RlU3RyZWFtKG9wdGlvbnM/OiBpbXBvcnQoJ3N0cmVhbScpLlJlYWRhYmxlT3B0aW9ucykgeyByZXR1cm4gdGhpcy5fc2luay50b05vZGVTdHJlYW0ob3B0aW9ucyk7IH1cblxuICAgIHB1YmxpYyBjbG9zZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVzZXQoKS5fc2luay5jbG9zZSgpO1xuICAgIH1cbiAgICBwdWJsaWMgYWJvcnQocmVhc29uPzogYW55KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlc2V0KCkuX3NpbmsuYWJvcnQocmVhc29uKTtcbiAgICB9XG4gICAgcHVibGljIGZpbmlzaCgpIHtcbiAgICAgICAgdGhpcy5fYXV0b0Rlc3Ryb3kgPyB0aGlzLmNsb3NlKCkgOiB0aGlzLnJlc2V0KHRoaXMuX3NpbmssIHRoaXMuX3NjaGVtYSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwdWJsaWMgcmVzZXQoc2luazogV3JpdGFibGVTaW5rPEFycmF5QnVmZmVyVmlld0lucHV0PiA9IHRoaXMuX3NpbmssIHNjaGVtYTogU2NoZW1hPFQ+IHwgbnVsbCA9IG51bGwpIHtcblxuICAgICAgICBpZiAoKHNpbmsgPT09IHRoaXMuX3NpbmspIHx8IChzaW5rIGluc3RhbmNlb2YgQXN5bmNCeXRlUXVldWUpKSB7XG4gICAgICAgICAgICB0aGlzLl9zaW5rID0gc2luayBhcyBBc3luY0J5dGVRdWV1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3NpbmsgPSBuZXcgQXN5bmNCeXRlUXVldWUoKTtcbiAgICAgICAgICAgIGlmIChzaW5rICYmIGlzV3JpdGFibGVET01TdHJlYW0oc2luaykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRvRE9NU3RyZWFtKHsgdHlwZTogJ2J5dGVzJyB9KS5waXBlVG8oc2luayk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNpbmsgJiYgaXNXcml0YWJsZU5vZGVTdHJlYW0oc2luaykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRvTm9kZVN0cmVhbSh7IG9iamVjdE1vZGU6IGZhbHNlIH0pLnBpcGUoc2luayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fc3RhcnRlZCAmJiB0aGlzLl9zY2hlbWEpIHtcbiAgICAgICAgICAgIHRoaXMuX3dyaXRlRm9vdGVyKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9zdGFydGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2RpY3Rpb25hcnlCbG9ja3MgPSBbXTtcbiAgICAgICAgdGhpcy5fcmVjb3JkQmF0Y2hCbG9ja3MgPSBbXTtcblxuICAgICAgICBpZiAoIXNjaGVtYSB8fCAhKHNjaGVtYS5jb21wYXJlVG8odGhpcy5fc2NoZW1hKSkpIHtcbiAgICAgICAgICAgIGlmIChzY2hlbWEgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9wb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2NoZW1hID0gbnVsbDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhcnRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2NoZW1hID0gc2NoZW1hO1xuICAgICAgICAgICAgICAgIHRoaXMuX3dyaXRlU2NoZW1hKHNjaGVtYSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBwdWJsaWMgd3JpdGUoY2h1bms/OiBUYWJsZTxUPiB8IFJlY29yZEJhdGNoPFQ+IHwgbnVsbCkge1xuICAgICAgICBsZXQgc2NoZW1hOiBTY2hlbWE8VD4gfCBudWxsO1xuICAgICAgICBpZiAoIXRoaXMuX3NpbmspIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUmVjb3JkQmF0Y2hXcml0ZXIgaXMgY2xvc2VkYCk7XG4gICAgICAgIH0gZWxzZSBpZiAoIWNodW5rIHx8ICEoc2NoZW1hID0gY2h1bmsuc2NoZW1hKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZmluaXNoKCkgJiYgdW5kZWZpbmVkO1xuICAgICAgICB9IGVsc2UgaWYgKHNjaGVtYSAhPT0gdGhpcy5fc2NoZW1hKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fc3RhcnRlZCAmJiB0aGlzLl9hdXRvRGVzdHJveSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnJlc2V0KHRoaXMuX3NpbmssIHNjaGVtYSk7XG4gICAgICAgIH1cbiAgICAgICAgKGNodW5rIGluc3RhbmNlb2YgVGFibGUpXG4gICAgICAgICAgICA/IHRoaXMud3JpdGVBbGwoY2h1bmsuY2h1bmtzKVxuICAgICAgICAgICAgOiB0aGlzLl93cml0ZVJlY29yZEJhdGNoKGNodW5rKTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlTWVzc2FnZTxUIGV4dGVuZHMgTWVzc2FnZUhlYWRlcj4obWVzc2FnZTogTWVzc2FnZTxUPiwgYWxpZ25tZW50ID0gOCkge1xuXG4gICAgICAgIGNvbnN0IGEgPSBhbGlnbm1lbnQgLSAxO1xuICAgICAgICBjb25zdCBidWZmZXIgPSBNZXNzYWdlLmVuY29kZShtZXNzYWdlKTtcbiAgICAgICAgY29uc3QgZmxhdGJ1ZmZlclNpemUgPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgY29uc3QgYWxpZ25lZFNpemUgPSAoZmxhdGJ1ZmZlclNpemUgKyA0ICsgYSkgJiB+YTtcbiAgICAgICAgY29uc3QgblBhZGRpbmdCeXRlcyA9IGFsaWduZWRTaXplIC0gZmxhdGJ1ZmZlclNpemUgLSA0O1xuXG4gICAgICAgIGlmIChtZXNzYWdlLmhlYWRlclR5cGUgPT09IE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2gpIHtcbiAgICAgICAgICAgIHRoaXMuX3JlY29yZEJhdGNoQmxvY2tzLnB1c2gobmV3IEZpbGVCbG9jayhhbGlnbmVkU2l6ZSwgbWVzc2FnZS5ib2R5TGVuZ3RoLCB0aGlzLl9wb3NpdGlvbikpO1xuICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuaGVhZGVyVHlwZSA9PT0gTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2gpIHtcbiAgICAgICAgICAgIHRoaXMuX2RpY3Rpb25hcnlCbG9ja3MucHVzaChuZXcgRmlsZUJsb2NrKGFsaWduZWRTaXplLCBtZXNzYWdlLmJvZHlMZW5ndGgsIHRoaXMuX3Bvc2l0aW9uKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBXcml0ZSB0aGUgZmxhdGJ1ZmZlciBzaXplIHByZWZpeCBpbmNsdWRpbmcgcGFkZGluZ1xuICAgICAgICB0aGlzLl93cml0ZShJbnQzMkFycmF5Lm9mKGFsaWduZWRTaXplIC0gNCkpO1xuICAgICAgICAvLyBXcml0ZSB0aGUgZmxhdGJ1ZmZlclxuICAgICAgICBpZiAoZmxhdGJ1ZmZlclNpemUgPiAwKSB7IHRoaXMuX3dyaXRlKGJ1ZmZlcik7IH1cbiAgICAgICAgLy8gV3JpdGUgYW55IHBhZGRpbmdcbiAgICAgICAgcmV0dXJuIHRoaXMuX3dyaXRlUGFkZGluZyhuUGFkZGluZ0J5dGVzKTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlKGNodW5rOiBBcnJheUJ1ZmZlclZpZXdJbnB1dCkge1xuICAgICAgICBpZiAodGhpcy5fc3RhcnRlZCkge1xuICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gdG9VaW50OEFycmF5KGNodW5rKTtcbiAgICAgICAgICAgIGlmIChidWZmZXIgJiYgYnVmZmVyLmJ5dGVMZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2luay53cml0ZShidWZmZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3Bvc2l0aW9uICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGVTY2hlbWEoc2NoZW1hOiBTY2hlbWE8VD4pIHtcbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICAgICAgICAgIC5fd3JpdGVNZXNzYWdlKE1lc3NhZ2UuZnJvbShzY2hlbWEpKVxuICAgICAgICAgICAgLl93cml0ZURpY3Rpb25hcmllcyhzY2hlbWEuZGljdGlvbmFyeUZpZWxkcyk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZUZvb3RlcigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3dyaXRlUGFkZGluZyg0KTsgLy8gZW9zIGJ5dGVzXG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZU1hZ2ljKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fd3JpdGUoTUFHSUMpO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGVQYWRkaW5nKG5CeXRlczogbnVtYmVyKSB7XG4gICAgICAgIHJldHVybiBuQnl0ZXMgPiAwID8gdGhpcy5fd3JpdGUobmV3IFVpbnQ4QXJyYXkobkJ5dGVzKSkgOiB0aGlzO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGVSZWNvcmRCYXRjaChyZWNvcmRzOiBSZWNvcmRCYXRjaDxUPikge1xuICAgICAgICBjb25zdCB7IGJ5dGVMZW5ndGgsIG5vZGVzLCBidWZmZXJSZWdpb25zLCBidWZmZXJzIH0gPSBWZWN0b3JBc3NlbWJsZXIuYXNzZW1ibGUocmVjb3Jkcyk7XG4gICAgICAgIGNvbnN0IHJlY29yZEJhdGNoID0gbmV3IG1ldGFkYXRhLlJlY29yZEJhdGNoKHJlY29yZHMubGVuZ3RoLCBub2RlcywgYnVmZmVyUmVnaW9ucyk7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBNZXNzYWdlLmZyb20ocmVjb3JkQmF0Y2gsIGJ5dGVMZW5ndGgpO1xuICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgICAgICAgLl93cml0ZU1lc3NhZ2UobWVzc2FnZSlcbiAgICAgICAgICAgIC5fd3JpdGVCb2R5QnVmZmVycyhidWZmZXJzKTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlRGljdGlvbmFyeUJhdGNoKGRpY3Rpb25hcnk6IFZlY3RvciwgaWQ6IG51bWJlciwgaXNEZWx0YSA9IGZhbHNlKSB7XG4gICAgICAgIGNvbnN0IHsgYnl0ZUxlbmd0aCwgbm9kZXMsIGJ1ZmZlclJlZ2lvbnMsIGJ1ZmZlcnMgfSA9IFZlY3RvckFzc2VtYmxlci5hc3NlbWJsZShkaWN0aW9uYXJ5KTtcbiAgICAgICAgY29uc3QgcmVjb3JkQmF0Y2ggPSBuZXcgbWV0YWRhdGEuUmVjb3JkQmF0Y2goZGljdGlvbmFyeS5sZW5ndGgsIG5vZGVzLCBidWZmZXJSZWdpb25zKTtcbiAgICAgICAgY29uc3QgZGljdGlvbmFyeUJhdGNoID0gbmV3IG1ldGFkYXRhLkRpY3Rpb25hcnlCYXRjaChyZWNvcmRCYXRjaCwgaWQsIGlzRGVsdGEpO1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gTWVzc2FnZS5mcm9tKGRpY3Rpb25hcnlCYXRjaCwgYnl0ZUxlbmd0aCk7XG4gICAgICAgIHJldHVybiB0aGlzXG4gICAgICAgICAgICAuX3dyaXRlTWVzc2FnZShtZXNzYWdlKVxuICAgICAgICAgICAgLl93cml0ZUJvZHlCdWZmZXJzKGJ1ZmZlcnMpO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGVCb2R5QnVmZmVycyhidWZmZXJzOiBBcnJheUJ1ZmZlclZpZXdbXSkge1xuICAgICAgICBsZXQgYnVmZmVyOiBBcnJheUJ1ZmZlclZpZXc7XG4gICAgICAgIGxldCBzaXplOiBudW1iZXIsIHBhZGRpbmc6IG51bWJlcjtcbiAgICAgICAgZm9yIChsZXQgaSA9IC0xLCBuID0gYnVmZmVycy5sZW5ndGg7ICsraSA8IG47KSB7XG4gICAgICAgICAgICBpZiAoKGJ1ZmZlciA9IGJ1ZmZlcnNbaV0pICYmIChzaXplID0gYnVmZmVyLmJ5dGVMZW5ndGgpID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3dyaXRlKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgaWYgKChwYWRkaW5nID0gKChzaXplICsgNykgJiB+NykgLSBzaXplKSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fd3JpdGVQYWRkaW5nKHBhZGRpbmcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlRGljdGlvbmFyaWVzKGRpY3Rpb25hcnlGaWVsZHM6IE1hcDxudW1iZXIsIEZpZWxkPERpY3Rpb25hcnk8YW55LCBhbnk+PltdPikge1xuICAgICAgICBmb3IgKGNvbnN0IFtpZCwgZmllbGRzXSBvZiBkaWN0aW9uYXJ5RmllbGRzKSB7XG4gICAgICAgICAgICBjb25zdCB2ZWN0b3IgPSBmaWVsZHNbMF0udHlwZS5kaWN0aW9uYXJ5VmVjdG9yO1xuICAgICAgICAgICAgaWYgKCEodmVjdG9yIGluc3RhbmNlb2YgQ2h1bmtlZCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl93cml0ZURpY3Rpb25hcnlCYXRjaCh2ZWN0b3IsIGlkLCBmYWxzZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNodW5rcyA9IHZlY3Rvci5jaHVua3M7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IC0xLCBuID0gY2h1bmtzLmxlbmd0aDsgKytpIDwgbjspIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fd3JpdGVEaWN0aW9uYXJ5QmF0Y2goY2h1bmtzW2ldLCBpZCwgaSA+IDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY2xhc3MgUmVjb3JkQmF0Y2hTdHJlYW1Xcml0ZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFdyaXRlcjxUPiB7XG5cbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+LCBvcHRpb25zPzogeyBhdXRvRGVzdHJveTogdHJ1ZSB9KTogUmVjb3JkQmF0Y2hTdHJlYW1Xcml0ZXI8VD47XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogQXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4sIG9wdGlvbnM/OiB7IGF1dG9EZXN0cm95OiB0cnVlIH0pOiBQcm9taXNlPFJlY29yZEJhdGNoU3RyZWFtV3JpdGVyPFQ+PjtcbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IFByb21pc2VMaWtlPEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+Piwgb3B0aW9ucz86IHsgYXV0b0Rlc3Ryb3k6IHRydWUgfSk6IFByb21pc2U8UmVjb3JkQmF0Y2hTdHJlYW1Xcml0ZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogUHJvbWlzZUxpa2U8VGFibGU8VD4gfCBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4+LCBvcHRpb25zPzogeyBhdXRvRGVzdHJveTogdHJ1ZSB9KTogUHJvbWlzZTxSZWNvcmRCYXRjaFN0cmVhbVdyaXRlcjxUPj47XG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih0aGlzOiB0eXBlb2YgUmVjb3JkQmF0Y2hXcml0ZXIsIGlucHV0OiBhbnksIG9wdGlvbnM/OiB7IGF1dG9EZXN0cm95OiB0cnVlIH0pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZWNvcmRCYXRjaFN0cmVhbVdyaXRlcjxUPihvcHRpb25zKS53cml0ZUFsbChpbnB1dCk7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIFJlY29yZEJhdGNoRmlsZVdyaXRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoV3JpdGVyPFQ+IHtcblxuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogVGFibGU8VD4gfCBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pOiBSZWNvcmRCYXRjaEZpbGVXcml0ZXI8VD47XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogQXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pOiBQcm9taXNlPFJlY29yZEJhdGNoRmlsZVdyaXRlcjxUPj47XG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih0aGlzOiB0eXBlb2YgUmVjb3JkQmF0Y2hXcml0ZXIsIGlucHV0OiBQcm9taXNlTGlrZTxBc3luY0l0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pj4pOiBQcm9taXNlPFJlY29yZEJhdGNoRmlsZVdyaXRlcjxUPj47XG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih0aGlzOiB0eXBlb2YgUmVjb3JkQmF0Y2hXcml0ZXIsIGlucHV0OiBQcm9taXNlTGlrZTxUYWJsZTxUPiB8IEl0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pj4pOiBQcm9taXNlPFJlY29yZEJhdGNoRmlsZVdyaXRlcjxUPj47XG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih0aGlzOiB0eXBlb2YgUmVjb3JkQmF0Y2hXcml0ZXIsIGlucHV0OiBhbnkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZWNvcmRCYXRjaEZpbGVXcml0ZXI8VD4oKS53cml0ZUFsbChpbnB1dCk7XG4gICAgfVxuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuX2F1dG9EZXN0cm95ID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlU2NoZW1hKHNjaGVtYTogU2NoZW1hPFQ+KSB7XG4gICAgICAgIHJldHVybiB0aGlzXG4gICAgICAgICAgICAuX3dyaXRlTWFnaWMoKS5fd3JpdGVQYWRkaW5nKDIpXG4gICAgICAgICAgICAuX3dyaXRlRGljdGlvbmFyaWVzKHNjaGVtYS5kaWN0aW9uYXJ5RmllbGRzKTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlRm9vdGVyKCkge1xuICAgICAgICBjb25zdCBidWZmZXIgPSBGb290ZXIuZW5jb2RlKG5ldyBGb290ZXIoXG4gICAgICAgICAgICB0aGlzLl9zY2hlbWEhLCBNZXRhZGF0YVZlcnNpb24uVjQsXG4gICAgICAgICAgICB0aGlzLl9yZWNvcmRCYXRjaEJsb2NrcywgdGhpcy5fZGljdGlvbmFyeUJsb2Nrc1xuICAgICAgICApKTtcbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICAgICAgICAgIC5fd3JpdGUoYnVmZmVyKSAvLyBXcml0ZSB0aGUgZmxhdGJ1ZmZlclxuICAgICAgICAgICAgLl93cml0ZShJbnQzMkFycmF5Lm9mKGJ1ZmZlci5ieXRlTGVuZ3RoKSkgLy8gdGhlbiB0aGUgZm9vdGVyIHNpemUgc3VmZml4XG4gICAgICAgICAgICAuX3dyaXRlTWFnaWMoKTsgLy8gdGhlbiB0aGUgbWFnaWMgc3VmZml4XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIFJlY29yZEJhdGNoSlNPTldyaXRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoV3JpdGVyPFQ+IHtcblxuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogVGFibGU8VD4gfCBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pOiBSZWNvcmRCYXRjaEpTT05Xcml0ZXI8VD47XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogQXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pOiBQcm9taXNlPFJlY29yZEJhdGNoSlNPTldyaXRlcjxUPj47XG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih0aGlzOiB0eXBlb2YgUmVjb3JkQmF0Y2hXcml0ZXIsIGlucHV0OiBQcm9taXNlTGlrZTxBc3luY0l0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pj4pOiBQcm9taXNlPFJlY29yZEJhdGNoSlNPTldyaXRlcjxUPj47XG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih0aGlzOiB0eXBlb2YgUmVjb3JkQmF0Y2hXcml0ZXIsIGlucHV0OiBQcm9taXNlTGlrZTxUYWJsZTxUPiB8IEl0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pj4pOiBQcm9taXNlPFJlY29yZEJhdGNoSlNPTldyaXRlcjxUPj47XG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih0aGlzOiB0eXBlb2YgUmVjb3JkQmF0Y2hXcml0ZXIsIGlucHV0OiBhbnkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZWNvcmRCYXRjaEpTT05Xcml0ZXI8VD4oKS53cml0ZUFsbChpbnB1dCBhcyBhbnkpO1xuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLl9hdXRvRGVzdHJveSA9IHRydWU7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZU1lc3NhZ2UoKSB7IHJldHVybiB0aGlzOyB9XG4gICAgcHJvdGVjdGVkIF93cml0ZVNjaGVtYShzY2hlbWE6IFNjaGVtYTxUPikge1xuICAgICAgICByZXR1cm4gdGhpcy5fd3JpdGUoYHtcXG4gIFwic2NoZW1hXCI6ICR7XG4gICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7IGZpZWxkczogc2NoZW1hLmZpZWxkcy5tYXAoZmllbGRUb0pTT04pIH0sIG51bGwsIDIpXG4gICAgICAgIH1gKS5fd3JpdGVEaWN0aW9uYXJpZXMoc2NoZW1hLmRpY3Rpb25hcnlGaWVsZHMpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgX3dyaXRlRGljdGlvbmFyaWVzKGRpY3Rpb25hcnlGaWVsZHM6IE1hcDxudW1iZXIsIEZpZWxkPERpY3Rpb25hcnk8YW55LCBhbnk+PltdPikge1xuICAgICAgICB0aGlzLl93cml0ZShgLFxcbiAgXCJkaWN0aW9uYXJpZXNcIjogW1xcbmApO1xuICAgICAgICBzdXBlci5fd3JpdGVEaWN0aW9uYXJpZXMoZGljdGlvbmFyeUZpZWxkcyk7XG4gICAgICAgIHJldHVybiB0aGlzLl93cml0ZShgXFxuICBdYCk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBfd3JpdGVEaWN0aW9uYXJ5QmF0Y2goZGljdGlvbmFyeTogVmVjdG9yLCBpZDogbnVtYmVyLCBpc0RlbHRhID0gZmFsc2UpIHtcbiAgICAgICAgdGhpcy5fd3JpdGUodGhpcy5fZGljdGlvbmFyeUJsb2Nrcy5sZW5ndGggPT09IDAgPyBgICAgIGAgOiBgLFxcbiAgICBgKTtcbiAgICAgICAgdGhpcy5fd3JpdGUoYCR7ZGljdGlvbmFyeUJhdGNoVG9KU09OKHRoaXMuX3NjaGVtYSEsIGRpY3Rpb25hcnksIGlkLCBpc0RlbHRhKX1gKTtcbiAgICAgICAgdGhpcy5fZGljdGlvbmFyeUJsb2Nrcy5wdXNoKG5ldyBGaWxlQmxvY2soMCwgMCwgMCkpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHJvdGVjdGVkIF93cml0ZVJlY29yZEJhdGNoKHJlY29yZHM6IFJlY29yZEJhdGNoPFQ+KSB7XG4gICAgICAgIHRoaXMuX3dyaXRlKHRoaXMuX3JlY29yZEJhdGNoQmxvY2tzLmxlbmd0aCA9PT0gMFxuICAgICAgICAgICAgPyBgLFxcbiAgXCJiYXRjaGVzXCI6IFtcXG4gICAgYFxuICAgICAgICAgICAgOiBgLFxcbiAgICBgKTtcbiAgICAgICAgdGhpcy5fd3JpdGUoYCR7cmVjb3JkQmF0Y2hUb0pTT04ocmVjb3Jkcyl9YCk7XG4gICAgICAgIHRoaXMuX3JlY29yZEJhdGNoQmxvY2tzLnB1c2gobmV3IEZpbGVCbG9jaygwLCAwLCAwKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwdWJsaWMgY2xvc2UoKSB7XG4gICAgICAgIGlmICh0aGlzLl9yZWNvcmRCYXRjaEJsb2Nrcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB0aGlzLl93cml0ZShgXFxuICBdYCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX3NjaGVtYSkge1xuICAgICAgICAgICAgdGhpcy5fd3JpdGUoYFxcbn1gKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3VwZXIuY2xvc2UoKTtcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih3cml0ZXI6IFJlY29yZEJhdGNoV3JpdGVyPFQ+LCBpbnB1dDogVGFibGU8VD4gfCBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pIHtcbiAgICBjb25zdCBjaHVua3MgPSAoaW5wdXQgaW5zdGFuY2VvZiBUYWJsZSkgPyBpbnB1dC5jaHVua3MgOiBpbnB1dDtcbiAgICBmb3IgKGNvbnN0IGJhdGNoIG9mIGNodW5rcykge1xuICAgICAgICB3cml0ZXIud3JpdGUoYmF0Y2gpO1xuICAgIH1cbiAgICByZXR1cm4gd3JpdGVyLmZpbmlzaCgpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuYXN5bmMgZnVuY3Rpb24gd3JpdGVBbGxBc3luYzxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih3cml0ZXI6IFJlY29yZEJhdGNoV3JpdGVyPFQ+LCBiYXRjaGVzOiBBc3luY0l0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pikge1xuICAgIGZvciBhd2FpdCAoY29uc3QgYmF0Y2ggb2YgYmF0Y2hlcykge1xuICAgICAgICB3cml0ZXIud3JpdGUoYmF0Y2gpO1xuICAgIH1cbiAgICByZXR1cm4gd3JpdGVyLmZpbmlzaCgpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZmllbGRUb0pTT04oeyBuYW1lLCB0eXBlLCBudWxsYWJsZSB9OiBGaWVsZCk6IG9iamVjdCB7XG4gICAgY29uc3QgYXNzZW1ibGVyID0gbmV3IEpTT05UeXBlQXNzZW1ibGVyKCk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgJ25hbWUnOiBuYW1lLCAnbnVsbGFibGUnOiBudWxsYWJsZSxcbiAgICAgICAgJ3R5cGUnOiBhc3NlbWJsZXIudmlzaXQodHlwZSksXG4gICAgICAgICdjaGlsZHJlbic6ICh0eXBlLmNoaWxkcmVuIHx8IFtdKS5tYXAoZmllbGRUb0pTT04pLFxuICAgICAgICAnZGljdGlvbmFyeSc6ICFEYXRhVHlwZS5pc0RpY3Rpb25hcnkodHlwZSkgPyB1bmRlZmluZWQgOiB7XG4gICAgICAgICAgICAnaWQnOiB0eXBlLmlkLFxuICAgICAgICAgICAgJ2lzT3JkZXJlZCc6IHR5cGUuaXNPcmRlcmVkLFxuICAgICAgICAgICAgJ2luZGV4VHlwZSc6IGFzc2VtYmxlci52aXNpdCh0eXBlLmluZGljZXMpXG4gICAgICAgIH1cbiAgICB9O1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZGljdGlvbmFyeUJhdGNoVG9KU09OKHNjaGVtYTogU2NoZW1hLCBkaWN0aW9uYXJ5OiBWZWN0b3IsIGlkOiBudW1iZXIsIGlzRGVsdGEgPSBmYWxzZSkge1xuICAgIGNvbnN0IGYgPSBzY2hlbWEuZGljdGlvbmFyeUZpZWxkcy5nZXQoaWQpIVswXTtcbiAgICBjb25zdCBmaWVsZCA9IG5ldyBGaWVsZChmLm5hbWUsIGYudHlwZS5kaWN0aW9uYXJ5LCBmLm51bGxhYmxlLCBmLm1ldGFkYXRhKTtcbiAgICBjb25zdCBjb2x1bW5zID0gSlNPTlZlY3RvckFzc2VtYmxlci5hc3NlbWJsZShuZXcgQ29sdW1uKGZpZWxkLCBbZGljdGlvbmFyeV0pKTtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAnaWQnOiBpZCxcbiAgICAgICAgJ2lzRGVsdGEnOiBpc0RlbHRhLFxuICAgICAgICAnZGF0YSc6IHtcbiAgICAgICAgICAgICdjb3VudCc6IGRpY3Rpb25hcnkubGVuZ3RoLFxuICAgICAgICAgICAgJ2NvbHVtbnMnOiBjb2x1bW5zXG4gICAgICAgIH1cbiAgICB9LCBudWxsLCAyKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIHJlY29yZEJhdGNoVG9KU09OKHJlY29yZHM6IFJlY29yZEJhdGNoKSB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgJ2NvdW50JzogcmVjb3Jkcy5sZW5ndGgsXG4gICAgICAgICdjb2x1bW5zJzogSlNPTlZlY3RvckFzc2VtYmxlci5hc3NlbWJsZShyZWNvcmRzKVxuICAgIH0sIG51bGwsIDIpO1xufVxuIl19

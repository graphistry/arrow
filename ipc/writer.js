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
const tslib_1 = require("tslib");
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
// export type OpenArgs = FileHandle | NodeJS.WritableStream | WritableStream<Uint8Array> | UnderlyingSink<Uint8Array>;
class RecordBatchWriter extends interfaces_1.ReadableInterop {
    constructor() {
        super(...arguments);
        this._position = 0;
        this._started = false;
        // @ts-ignore
        this._sink = new stream_1.AsyncByteQueue();
        this._schema = null;
        this._dictionaryBlocks = [];
        this._recordBatchBlocks = [];
    }
    /** @nocollapse */
    static throughNode() { throw new Error(`"throughNode" not available in this environment`); }
    /** @nocollapse */
    static throughDOM() {
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
    toReadableDOMStream(options) { return this._sink.toReadableDOMStream(options); }
    toReadableNodeStream(options) { return this._sink.toReadableNodeStream(options); }
    close() { return this.reset()._sink.close(); }
    abort(reason) { return this.reset()._sink.abort(reason); }
    reset(sink = this._sink, schema) {
        if ((sink === this._sink) || (sink instanceof stream_1.AsyncByteQueue)) {
            this._sink = sink;
        }
        else {
            this._sink = new stream_1.AsyncByteQueue();
            if (sink && compat_1.isWritableDOMStream(sink)) {
                this.toReadableDOMStream().pipeTo(sink);
            }
            else if (sink && compat_1.isWritableNodeStream(sink)) {
                this.toReadableNodeStream().pipe(sink);
            }
        }
        this._position = 0;
        this._schema = null;
        this._started = false;
        this._dictionaryBlocks = [];
        this._recordBatchBlocks = [];
        if (schema instanceof schema_1.Schema) {
            this._started = true;
            this._schema = schema;
            this._writeSchema(schema);
        }
        return this;
    }
    write(chunk) {
        if (!this._sink) {
            throw new Error(`RecordBatchWriter is closed`);
        }
        if (!this._started && (this._started = true)) {
            this._writeSchema(this._schema = chunk.schema);
        }
        if (chunk.schema !== this._schema) {
            throw new Error('Schemas unequal');
        }
        this._writeRecordBatch(chunk);
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
        const buffer = file_1.Footer.encode(new file_1.Footer(this._schema, enum_1.MetadataVersion.V4, this._recordBatchBlocks, this._dictionaryBlocks));
        return this
            ._write(buffer) // Write the flatbuffer
            ._write(Int32Array.of(buffer.byteLength)) // then the footer size suffix
            ._writeMagic(); // then the magic suffix
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
class RecordBatchFileWriter extends RecordBatchWriter {
    /** @nocollapse */
    static writeAll(input) {
        return new RecordBatchFileWriter().writeAll(input);
    }
    close() {
        this._writeFooter();
        return super.close();
    }
    _writeSchema(schema) {
        return this
            ._writeMagic()._writePadding(2)
            ._writeDictionaries(schema.dictionaryFields);
    }
}
exports.RecordBatchFileWriter = RecordBatchFileWriter;
class RecordBatchStreamWriter extends RecordBatchWriter {
    /** @nocollapse */
    static writeAll(input) {
        return new RecordBatchStreamWriter().writeAll(input);
    }
    close() {
        this._writePadding(4); // eos bytes
        return super.close();
    }
}
exports.RecordBatchStreamWriter = RecordBatchStreamWriter;
class RecordBatchJSONWriter extends RecordBatchWriter {
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
function writeAll(writer, input) {
    const chunks = (input instanceof table_1.Table) ? input.chunks : input;
    for (const batch of chunks) {
        writer.write(batch);
    }
    writer.close();
    return writer;
}
function writeAllAsync(writer, batches) {
    var batches_1, batches_1_1;
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        var e_1, _a;
        try {
            for (batches_1 = tslib_1.__asyncValues(batches); batches_1_1 = yield batches_1.next(), !batches_1_1.done;) {
                const batch = batches_1_1.value;
                writer.write(batch);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (batches_1_1 && !batches_1_1.done && (_a = batches_1.return)) yield _a.call(batches_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        writer.close();
        return writer;
    });
}
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
function recordBatchToJSON(records) {
    return JSON.stringify({
        'count': records.length,
        'columns': jsonvectorassembler_1.JSONVectorAssembler.assemble(records)
    }, null, 2);
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFDO1FBQ2xCLE9BQU8sRUFBRSxPQUFPLENBQUMsTUFBTTtRQUN2QixTQUFTLEVBQUUseUNBQW1CLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQztLQUNuRCxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNoQixDQUFDIiwiZmlsZSI6ImlwYy93cml0ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgVGFibGUgfSBmcm9tICcuLi90YWJsZSc7XG5pbXBvcnQgeyBNQUdJQyB9IGZyb20gJy4vbWVzc2FnZSc7XG5pbXBvcnQgeyBWZWN0b3IgfSBmcm9tICcuLi92ZWN0b3InO1xuaW1wb3J0IHsgQ29sdW1uIH0gZnJvbSAnLi4vY29sdW1uJztcbmltcG9ydCB7IFNjaGVtYSwgRmllbGQgfSBmcm9tICcuLi9zY2hlbWEnO1xuaW1wb3J0IHsgQ2h1bmtlZCB9IGZyb20gJy4uL3ZlY3Rvci9jaHVua2VkJztcbmltcG9ydCB7IE1lc3NhZ2UgfSBmcm9tICcuL21ldGFkYXRhL21lc3NhZ2UnO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2ggfSBmcm9tICcuLi9yZWNvcmRiYXRjaCc7XG5pbXBvcnQgKiBhcyBtZXRhZGF0YSBmcm9tICcuL21ldGFkYXRhL21lc3NhZ2UnO1xuaW1wb3J0IHsgRGF0YVR5cGUsIERpY3Rpb25hcnkgfSBmcm9tICcuLi90eXBlJztcbmltcG9ydCB7IEZpbGVCbG9jaywgRm9vdGVyIH0gZnJvbSAnLi9tZXRhZGF0YS9maWxlJztcbmltcG9ydCB7IE1lc3NhZ2VIZWFkZXIsIE1ldGFkYXRhVmVyc2lvbiB9IGZyb20gJy4uL2VudW0nO1xuaW1wb3J0IHsgV3JpdGFibGVTaW5rLCBBc3luY0J5dGVRdWV1ZSB9IGZyb20gJy4uL2lvL3N0cmVhbSc7XG5pbXBvcnQgeyBWZWN0b3JBc3NlbWJsZXIgfSBmcm9tICcuLi92aXNpdG9yL3ZlY3RvcmFzc2VtYmxlcic7XG5pbXBvcnQgeyBKU09OVHlwZUFzc2VtYmxlciB9IGZyb20gJy4uL3Zpc2l0b3IvanNvbnR5cGVhc3NlbWJsZXInO1xuaW1wb3J0IHsgSlNPTlZlY3RvckFzc2VtYmxlciB9IGZyb20gJy4uL3Zpc2l0b3IvanNvbnZlY3RvcmFzc2VtYmxlcic7XG5pbXBvcnQgeyBBcnJheUJ1ZmZlclZpZXdJbnB1dCwgdG9VaW50OEFycmF5IH0gZnJvbSAnLi4vdXRpbC9idWZmZXInO1xuaW1wb3J0IHsgV3JpdGFibGUsIFJlYWRhYmxlSW50ZXJvcCwgUmVhZGFibGVET01TdHJlYW1PcHRpb25zIH0gZnJvbSAnLi4vaW8vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBpc1Byb21pc2UsIGlzQXN5bmNJdGVyYWJsZSwgaXNXcml0YWJsZURPTVN0cmVhbSwgaXNXcml0YWJsZU5vZGVTdHJlYW0gfSBmcm9tICcuLi91dGlsL2NvbXBhdCc7XG5cbi8vIGV4cG9ydCB0eXBlIE9wZW5BcmdzID0gRmlsZUhhbmRsZSB8IE5vZGVKUy5Xcml0YWJsZVN0cmVhbSB8IFdyaXRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+IHwgVW5kZXJseWluZ1Npbms8VWludDhBcnJheT47XG5cbmV4cG9ydCBjbGFzcyBSZWNvcmRCYXRjaFdyaXRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PlxuICAgIGV4dGVuZHMgUmVhZGFibGVJbnRlcm9wPFVpbnQ4QXJyYXk+XG4gICAgaW1wbGVtZW50cyBXcml0YWJsZTxSZWNvcmRCYXRjaDxUPj4ge1xuXG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyB0aHJvdWdoTm9kZSgpOiBpbXBvcnQoJ3N0cmVhbScpLkR1cGxleCB7IHRocm93IG5ldyBFcnJvcihgXCJ0aHJvdWdoTm9kZVwiIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBlbnZpcm9ubWVudGApOyB9XG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyB0aHJvdWdoRE9NPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0+KCk6IHsgd3JpdGFibGU6IFdyaXRhYmxlU3RyZWFtPFJlY29yZEJhdGNoPFQ+PiwgcmVhZGFibGU6IFJlYWRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+IH0ge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFwidGhyb3VnaERPTVwiIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBlbnZpcm9ubWVudGApO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfcG9zaXRpb24gPSAwO1xuICAgIHByb3RlY3RlZCBfc3RhcnRlZCA9IGZhbHNlO1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwcm90ZWN0ZWQgX3NpbmsgPSBuZXcgQXN5bmNCeXRlUXVldWUoKTtcbiAgICBwcm90ZWN0ZWQgX3NjaGVtYTogU2NoZW1hIHwgbnVsbCA9IG51bGw7XG4gICAgcHJvdGVjdGVkIF9kaWN0aW9uYXJ5QmxvY2tzOiBGaWxlQmxvY2tbXSA9IFtdO1xuICAgIHByb3RlY3RlZCBfcmVjb3JkQmF0Y2hCbG9ja3M6IEZpbGVCbG9ja1tdID0gW107XG5cbiAgICBwdWJsaWMgdG9TdHJpbmcoc3luYzogdHJ1ZSk6IHN0cmluZztcbiAgICBwdWJsaWMgdG9TdHJpbmcoc3luYz86IGZhbHNlKTogUHJvbWlzZTxzdHJpbmc+O1xuICAgIHB1YmxpYyB0b1N0cmluZyhzeW5jOiBhbnkgPSBmYWxzZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2luay50b1N0cmluZyhzeW5jKSBhcyBQcm9taXNlPHN0cmluZz4gfCBzdHJpbmc7XG4gICAgfVxuICAgIHB1YmxpYyB0b1VpbnQ4QXJyYXkoc3luYzogdHJ1ZSk6IFVpbnQ4QXJyYXk7XG4gICAgcHVibGljIHRvVWludDhBcnJheShzeW5jPzogZmFsc2UpOiBQcm9taXNlPFVpbnQ4QXJyYXk+O1xuICAgIHB1YmxpYyB0b1VpbnQ4QXJyYXkoc3luYzogYW55ID0gZmFsc2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NpbmsudG9VaW50OEFycmF5KHN5bmMpIGFzIFByb21pc2U8VWludDhBcnJheT4gfCBVaW50OEFycmF5O1xuICAgIH1cblxuICAgIHB1YmxpYyB3cml0ZUFsbChpbnB1dDogVGFibGU8VD4gfCBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pOiB0aGlzO1xuICAgIHB1YmxpYyB3cml0ZUFsbChpbnB1dDogQXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pOiBQcm9taXNlPHRoaXM+O1xuICAgIHB1YmxpYyB3cml0ZUFsbChpbnB1dDogUHJvbWlzZUxpa2U8QXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4+KTogUHJvbWlzZTx0aGlzPjtcbiAgICBwdWJsaWMgd3JpdGVBbGwoaW5wdXQ6IFByb21pc2VMaWtlPFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+Pik6IFByb21pc2U8dGhpcz47XG4gICAgcHVibGljIHdyaXRlQWxsKGlucHV0OiBQcm9taXNlTGlrZTxhbnk+IHwgVGFibGU8VD4gfCBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4gfCBBc3luY0l0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pikge1xuICAgICAgICBpZiAoaXNQcm9taXNlPGFueT4oaW5wdXQpKSB7XG4gICAgICAgICAgICByZXR1cm4gaW5wdXQudGhlbigoeCkgPT4gdGhpcy53cml0ZUFsbCh4KSk7XG4gICAgICAgIH0gZWxzZSBpZihpc0FzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KGlucHV0KSkge1xuICAgICAgICAgICAgcmV0dXJuIHdyaXRlQWxsQXN5bmModGhpcywgaW5wdXQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB3cml0ZUFsbCh0aGlzLCA8YW55PiBpbnB1dCk7XG4gICAgfVxuXG4gICAgcHVibGljIGdldCBjbG9zZWQoKSB7IHJldHVybiB0aGlzLl9zaW5rLmNsb3NlZDsgfVxuICAgIHB1YmxpYyBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCkgeyByZXR1cm4gdGhpcy5fc2lua1tTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTsgfVxuICAgIHB1YmxpYyB0b1JlYWRhYmxlRE9NU3RyZWFtKG9wdGlvbnM/OiBSZWFkYWJsZURPTVN0cmVhbU9wdGlvbnMpIHsgcmV0dXJuIHRoaXMuX3NpbmsudG9SZWFkYWJsZURPTVN0cmVhbShvcHRpb25zKTsgfVxuICAgIHB1YmxpYyB0b1JlYWRhYmxlTm9kZVN0cmVhbShvcHRpb25zPzogaW1wb3J0KCdzdHJlYW0nKS5SZWFkYWJsZU9wdGlvbnMpIHsgcmV0dXJuIHRoaXMuX3NpbmsudG9SZWFkYWJsZU5vZGVTdHJlYW0ob3B0aW9ucyk7IH1cblxuICAgIHB1YmxpYyBjbG9zZSgpIHsgcmV0dXJuIHRoaXMucmVzZXQoKS5fc2luay5jbG9zZSgpOyB9XG4gICAgcHVibGljIGFib3J0KHJlYXNvbj86IGFueSkgeyByZXR1cm4gdGhpcy5yZXNldCgpLl9zaW5rLmFib3J0KHJlYXNvbik7IH1cbiAgICBwdWJsaWMgcmVzZXQoc2luazogV3JpdGFibGVTaW5rPEFycmF5QnVmZmVyVmlld0lucHV0PiA9IHRoaXMuX3NpbmssIHNjaGVtYT86IFNjaGVtYTxUPikge1xuXG4gICAgICAgIGlmICgoc2luayA9PT0gdGhpcy5fc2luaykgfHwgKHNpbmsgaW5zdGFuY2VvZiBBc3luY0J5dGVRdWV1ZSkpIHtcbiAgICAgICAgICAgIHRoaXMuX3NpbmsgPSBzaW5rIGFzIEFzeW5jQnl0ZVF1ZXVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fc2luayA9IG5ldyBBc3luY0J5dGVRdWV1ZSgpO1xuICAgICAgICAgICAgaWYgKHNpbmsgJiYgaXNXcml0YWJsZURPTVN0cmVhbShzaW5rKSkge1xuICAgICAgICAgICAgICAgIHRoaXMudG9SZWFkYWJsZURPTVN0cmVhbSgpLnBpcGVUbyhzaW5rKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc2luayAmJiBpc1dyaXRhYmxlTm9kZVN0cmVhbShzaW5rKSkge1xuICAgICAgICAgICAgICAgIHRoaXMudG9SZWFkYWJsZU5vZGVTdHJlYW0oKS5waXBlKHNpbmspO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fcG9zaXRpb24gPSAwO1xuICAgICAgICB0aGlzLl9zY2hlbWEgPSBudWxsO1xuICAgICAgICB0aGlzLl9zdGFydGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2RpY3Rpb25hcnlCbG9ja3MgPSBbXTtcbiAgICAgICAgdGhpcy5fcmVjb3JkQmF0Y2hCbG9ja3MgPSBbXTtcblxuICAgICAgICBpZiAoc2NoZW1hIGluc3RhbmNlb2YgU2NoZW1hKSB7XG4gICAgICAgICAgICB0aGlzLl9zdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuX3NjaGVtYSA9IHNjaGVtYTtcbiAgICAgICAgICAgIHRoaXMuX3dyaXRlU2NoZW1hKHNjaGVtYSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBwdWJsaWMgd3JpdGUoY2h1bms6IFJlY29yZEJhdGNoPFQ+KSB7XG4gICAgICAgIGlmICghdGhpcy5fc2luaykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZWNvcmRCYXRjaFdyaXRlciBpcyBjbG9zZWRgKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMuX3N0YXJ0ZWQgJiYgKHRoaXMuX3N0YXJ0ZWQgPSB0cnVlKSkge1xuICAgICAgICAgICAgdGhpcy5fd3JpdGVTY2hlbWEodGhpcy5fc2NoZW1hID0gY2h1bmsuc2NoZW1hKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2h1bmsuc2NoZW1hICE9PSB0aGlzLl9zY2hlbWEpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignU2NoZW1hcyB1bmVxdWFsJyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fd3JpdGVSZWNvcmRCYXRjaChjaHVuayk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZU1lc3NhZ2U8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KG1lc3NhZ2U6IE1lc3NhZ2U8VD4sIGFsaWdubWVudCA9IDgpIHtcblxuICAgICAgICBjb25zdCBhID0gYWxpZ25tZW50IC0gMTtcbiAgICAgICAgY29uc3QgYnVmZmVyID0gTWVzc2FnZS5lbmNvZGUobWVzc2FnZSk7XG4gICAgICAgIGNvbnN0IGZsYXRidWZmZXJTaXplID0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgICAgIGNvbnN0IGFsaWduZWRTaXplID0gKGZsYXRidWZmZXJTaXplICsgNCArIGEpICYgfmE7XG4gICAgICAgIGNvbnN0IG5QYWRkaW5nQnl0ZXMgPSBhbGlnbmVkU2l6ZSAtIGZsYXRidWZmZXJTaXplIC0gNDtcblxuICAgICAgICBpZiAobWVzc2FnZS5oZWFkZXJUeXBlID09PSBNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoKSB7XG4gICAgICAgICAgICB0aGlzLl9yZWNvcmRCYXRjaEJsb2Nrcy5wdXNoKG5ldyBGaWxlQmxvY2soYWxpZ25lZFNpemUsIG1lc3NhZ2UuYm9keUxlbmd0aCwgdGhpcy5fcG9zaXRpb24pKTtcbiAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmhlYWRlclR5cGUgPT09IE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoKSB7XG4gICAgICAgICAgICB0aGlzLl9kaWN0aW9uYXJ5QmxvY2tzLnB1c2gobmV3IEZpbGVCbG9jayhhbGlnbmVkU2l6ZSwgbWVzc2FnZS5ib2R5TGVuZ3RoLCB0aGlzLl9wb3NpdGlvbikpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gV3JpdGUgdGhlIGZsYXRidWZmZXIgc2l6ZSBwcmVmaXggaW5jbHVkaW5nIHBhZGRpbmdcbiAgICAgICAgdGhpcy5fd3JpdGUoSW50MzJBcnJheS5vZihhbGlnbmVkU2l6ZSAtIDQpKTtcbiAgICAgICAgLy8gV3JpdGUgdGhlIGZsYXRidWZmZXJcbiAgICAgICAgaWYgKGZsYXRidWZmZXJTaXplID4gMCkgeyB0aGlzLl93cml0ZShidWZmZXIpOyB9XG4gICAgICAgIC8vIFdyaXRlIGFueSBwYWRkaW5nXG4gICAgICAgIHJldHVybiB0aGlzLl93cml0ZVBhZGRpbmcoblBhZGRpbmdCeXRlcyk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZShjaHVuazogQXJyYXlCdWZmZXJWaWV3SW5wdXQpIHtcbiAgICAgICAgaWYgKHRoaXMuX3N0YXJ0ZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IHRvVWludDhBcnJheShjaHVuayk7XG4gICAgICAgICAgICBpZiAoYnVmZmVyICYmIGJ1ZmZlci5ieXRlTGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3Npbmsud3JpdGUoYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9wb3NpdGlvbiArPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlU2NoZW1hKHNjaGVtYTogU2NoZW1hPFQ+KSB7XG4gICAgICAgIHJldHVybiB0aGlzXG4gICAgICAgICAgICAuX3dyaXRlTWVzc2FnZShNZXNzYWdlLmZyb20oc2NoZW1hKSlcbiAgICAgICAgICAgIC5fd3JpdGVEaWN0aW9uYXJpZXMoc2NoZW1hLmRpY3Rpb25hcnlGaWVsZHMpO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGVGb290ZXIoKSB7XG5cbiAgICAgICAgY29uc3QgYnVmZmVyID0gRm9vdGVyLmVuY29kZShuZXcgRm9vdGVyKFxuICAgICAgICAgICAgdGhpcy5fc2NoZW1hISwgTWV0YWRhdGFWZXJzaW9uLlY0LFxuICAgICAgICAgICAgdGhpcy5fcmVjb3JkQmF0Y2hCbG9ja3MsIHRoaXMuX2RpY3Rpb25hcnlCbG9ja3NcbiAgICAgICAgKSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICAgICAgICAgIC5fd3JpdGUoYnVmZmVyKSAvLyBXcml0ZSB0aGUgZmxhdGJ1ZmZlclxuICAgICAgICAgICAgLl93cml0ZShJbnQzMkFycmF5Lm9mKGJ1ZmZlci5ieXRlTGVuZ3RoKSkgLy8gdGhlbiB0aGUgZm9vdGVyIHNpemUgc3VmZml4XG4gICAgICAgICAgICAuX3dyaXRlTWFnaWMoKTsgLy8gdGhlbiB0aGUgbWFnaWMgc3VmZml4XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZU1hZ2ljKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fd3JpdGUoTUFHSUMpO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGVQYWRkaW5nKG5CeXRlczogbnVtYmVyKSB7XG4gICAgICAgIHJldHVybiBuQnl0ZXMgPiAwID8gdGhpcy5fd3JpdGUobmV3IFVpbnQ4QXJyYXkobkJ5dGVzKSkgOiB0aGlzO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGVSZWNvcmRCYXRjaChyZWNvcmRzOiBSZWNvcmRCYXRjaDxUPikge1xuICAgICAgICBjb25zdCB7IGJ5dGVMZW5ndGgsIG5vZGVzLCBidWZmZXJSZWdpb25zLCBidWZmZXJzIH0gPSBWZWN0b3JBc3NlbWJsZXIuYXNzZW1ibGUocmVjb3Jkcyk7XG4gICAgICAgIGNvbnN0IHJlY29yZEJhdGNoID0gbmV3IG1ldGFkYXRhLlJlY29yZEJhdGNoKHJlY29yZHMubGVuZ3RoLCBub2RlcywgYnVmZmVyUmVnaW9ucyk7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBNZXNzYWdlLmZyb20ocmVjb3JkQmF0Y2gsIGJ5dGVMZW5ndGgpO1xuICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgICAgICAgLl93cml0ZU1lc3NhZ2UobWVzc2FnZSlcbiAgICAgICAgICAgIC5fd3JpdGVCb2R5QnVmZmVycyhidWZmZXJzKTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlRGljdGlvbmFyeUJhdGNoKGRpY3Rpb25hcnk6IFZlY3RvciwgaWQ6IG51bWJlciwgaXNEZWx0YSA9IGZhbHNlKSB7XG4gICAgICAgIGNvbnN0IHsgYnl0ZUxlbmd0aCwgbm9kZXMsIGJ1ZmZlclJlZ2lvbnMsIGJ1ZmZlcnMgfSA9IFZlY3RvckFzc2VtYmxlci5hc3NlbWJsZShkaWN0aW9uYXJ5KTtcbiAgICAgICAgY29uc3QgcmVjb3JkQmF0Y2ggPSBuZXcgbWV0YWRhdGEuUmVjb3JkQmF0Y2goZGljdGlvbmFyeS5sZW5ndGgsIG5vZGVzLCBidWZmZXJSZWdpb25zKTtcbiAgICAgICAgY29uc3QgZGljdGlvbmFyeUJhdGNoID0gbmV3IG1ldGFkYXRhLkRpY3Rpb25hcnlCYXRjaChyZWNvcmRCYXRjaCwgaWQsIGlzRGVsdGEpO1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gTWVzc2FnZS5mcm9tKGRpY3Rpb25hcnlCYXRjaCwgYnl0ZUxlbmd0aCk7XG4gICAgICAgIHJldHVybiB0aGlzXG4gICAgICAgICAgICAuX3dyaXRlTWVzc2FnZShtZXNzYWdlKVxuICAgICAgICAgICAgLl93cml0ZUJvZHlCdWZmZXJzKGJ1ZmZlcnMpO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGVCb2R5QnVmZmVycyhidWZmZXJzOiBBcnJheUJ1ZmZlclZpZXdbXSkge1xuICAgICAgICBsZXQgYnVmZmVyOiBBcnJheUJ1ZmZlclZpZXc7XG4gICAgICAgIGxldCBzaXplOiBudW1iZXIsIHBhZGRpbmc6IG51bWJlcjtcbiAgICAgICAgZm9yIChsZXQgaSA9IC0xLCBuID0gYnVmZmVycy5sZW5ndGg7ICsraSA8IG47KSB7XG4gICAgICAgICAgICBpZiAoKGJ1ZmZlciA9IGJ1ZmZlcnNbaV0pICYmIChzaXplID0gYnVmZmVyLmJ5dGVMZW5ndGgpID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3dyaXRlKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgaWYgKChwYWRkaW5nID0gKChzaXplICsgNykgJiB+NykgLSBzaXplKSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fd3JpdGVQYWRkaW5nKHBhZGRpbmcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlRGljdGlvbmFyaWVzKGRpY3Rpb25hcnlGaWVsZHM6IE1hcDxudW1iZXIsIEZpZWxkPERpY3Rpb25hcnk8YW55LCBhbnk+PltdPikge1xuICAgICAgICBmb3IgKGNvbnN0IFtpZCwgZmllbGRzXSBvZiBkaWN0aW9uYXJ5RmllbGRzKSB7XG4gICAgICAgICAgICBjb25zdCB2ZWN0b3IgPSBmaWVsZHNbMF0udHlwZS5kaWN0aW9uYXJ5VmVjdG9yO1xuICAgICAgICAgICAgaWYgKCEodmVjdG9yIGluc3RhbmNlb2YgQ2h1bmtlZCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl93cml0ZURpY3Rpb25hcnlCYXRjaCh2ZWN0b3IsIGlkLCBmYWxzZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNodW5rcyA9IHZlY3Rvci5jaHVua3M7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IC0xLCBuID0gY2h1bmtzLmxlbmd0aDsgKytpIDwgbjspIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fd3JpdGVEaWN0aW9uYXJ5QmF0Y2goY2h1bmtzW2ldLCBpZCwgaSA+IDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBSZWNvcmRCYXRjaEZpbGVXcml0ZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFdyaXRlcjxUPiB7XG5cbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KTogUmVjb3JkQmF0Y2hGaWxlV3JpdGVyPFQ+O1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KTogUHJvbWlzZTxSZWNvcmRCYXRjaEZpbGVXcml0ZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogUHJvbWlzZUxpa2U8QXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4+KTogUHJvbWlzZTxSZWNvcmRCYXRjaEZpbGVXcml0ZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogUHJvbWlzZUxpa2U8VGFibGU8VD4gfCBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4+KTogUHJvbWlzZTxSZWNvcmRCYXRjaEZpbGVXcml0ZXI8VD4+O1xuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogUHJvbWlzZUxpa2U8YW55PiB8IFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+IHwgQXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZWNvcmRCYXRjaEZpbGVXcml0ZXI8VD4oKS53cml0ZUFsbChpbnB1dCBhcyBhbnkpO1xuICAgIH1cblxuICAgIHB1YmxpYyBjbG9zZSgpIHtcbiAgICAgICAgdGhpcy5fd3JpdGVGb290ZXIoKTtcbiAgICAgICAgcmV0dXJuIHN1cGVyLmNsb3NlKCk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBfd3JpdGVTY2hlbWEoc2NoZW1hOiBTY2hlbWE8VD4pIHtcbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICAgICAgICAgIC5fd3JpdGVNYWdpYygpLl93cml0ZVBhZGRpbmcoMilcbiAgICAgICAgICAgIC5fd3JpdGVEaWN0aW9uYXJpZXMoc2NoZW1hLmRpY3Rpb25hcnlGaWVsZHMpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFJlY29yZEJhdGNoU3RyZWFtV3JpdGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hXcml0ZXI8VD4ge1xuXG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih0aGlzOiB0eXBlb2YgUmVjb3JkQmF0Y2hXcml0ZXIsIGlucHV0OiBUYWJsZTxUPiB8IEl0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pik6IFJlY29yZEJhdGNoU3RyZWFtV3JpdGVyPFQ+O1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KTogUHJvbWlzZTxSZWNvcmRCYXRjaFN0cmVhbVdyaXRlcjxUPj47XG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih0aGlzOiB0eXBlb2YgUmVjb3JkQmF0Y2hXcml0ZXIsIGlucHV0OiBQcm9taXNlTGlrZTxBc3luY0l0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pj4pOiBQcm9taXNlPFJlY29yZEJhdGNoU3RyZWFtV3JpdGVyPFQ+PjtcbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IFByb21pc2VMaWtlPFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+Pik6IFByb21pc2U8UmVjb3JkQmF0Y2hTdHJlYW1Xcml0ZXI8VD4+O1xuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogUHJvbWlzZUxpa2U8YW55PiB8IFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+IHwgQXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZWNvcmRCYXRjaFN0cmVhbVdyaXRlcjxUPigpLndyaXRlQWxsKGlucHV0IGFzIGFueSk7XG4gICAgfVxuXG4gICAgcHVibGljIGNsb3NlKCkge1xuICAgICAgICB0aGlzLl93cml0ZVBhZGRpbmcoNCk7IC8vIGVvcyBieXRlc1xuICAgICAgICByZXR1cm4gc3VwZXIuY2xvc2UoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBSZWNvcmRCYXRjaEpTT05Xcml0ZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFdyaXRlcjxUPiB7XG5cbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KTogUmVjb3JkQmF0Y2hKU09OV3JpdGVyPFQ+O1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KTogUHJvbWlzZTxSZWNvcmRCYXRjaEpTT05Xcml0ZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogUHJvbWlzZUxpa2U8QXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4+KTogUHJvbWlzZTxSZWNvcmRCYXRjaEpTT05Xcml0ZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogUHJvbWlzZUxpa2U8VGFibGU8VD4gfCBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4+KTogUHJvbWlzZTxSZWNvcmRCYXRjaEpTT05Xcml0ZXI8VD4+O1xuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogUHJvbWlzZUxpa2U8YW55PiB8IFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+IHwgQXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZWNvcmRCYXRjaEpTT05Xcml0ZXI8VD4oKS53cml0ZUFsbChpbnB1dCBhcyBhbnkpO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGVNZXNzYWdlKCkgeyByZXR1cm4gdGhpczsgfVxuICAgIHByb3RlY3RlZCBfd3JpdGVTY2hlbWEoc2NoZW1hOiBTY2hlbWE8VD4pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3dyaXRlKGB7XFxuICBcInNjaGVtYVwiOiAke1xuICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoeyBmaWVsZHM6IHNjaGVtYS5maWVsZHMubWFwKGZpZWxkVG9KU09OKSB9LCBudWxsLCAyKVxuICAgICAgICB9YCkuX3dyaXRlRGljdGlvbmFyaWVzKHNjaGVtYS5kaWN0aW9uYXJ5RmllbGRzKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIF93cml0ZURpY3Rpb25hcmllcyhkaWN0aW9uYXJ5RmllbGRzOiBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5PGFueSwgYW55Pj5bXT4pIHtcbiAgICAgICAgdGhpcy5fd3JpdGUoYCxcXG4gIFwiZGljdGlvbmFyaWVzXCI6IFtcXG5gKTtcbiAgICAgICAgc3VwZXIuX3dyaXRlRGljdGlvbmFyaWVzKGRpY3Rpb25hcnlGaWVsZHMpO1xuICAgICAgICByZXR1cm4gdGhpcy5fd3JpdGUoYFxcbiAgXWApO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgX3dyaXRlRGljdGlvbmFyeUJhdGNoKGRpY3Rpb25hcnk6IFZlY3RvciwgaWQ6IG51bWJlciwgaXNEZWx0YSA9IGZhbHNlKSB7XG4gICAgICAgIHRoaXMuX3dyaXRlKHRoaXMuX2RpY3Rpb25hcnlCbG9ja3MubGVuZ3RoID09PSAwID8gYCAgICBgIDogYCxcXG4gICAgYCk7XG4gICAgICAgIHRoaXMuX3dyaXRlKGAke2RpY3Rpb25hcnlCYXRjaFRvSlNPTih0aGlzLl9zY2hlbWEhLCBkaWN0aW9uYXJ5LCBpZCwgaXNEZWx0YSl9YCk7XG4gICAgICAgIHRoaXMuX2RpY3Rpb25hcnlCbG9ja3MucHVzaChuZXcgRmlsZUJsb2NrKDAsIDAsIDApKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHByb3RlY3RlZCBfd3JpdGVSZWNvcmRCYXRjaChyZWNvcmRzOiBSZWNvcmRCYXRjaDxUPikge1xuICAgICAgICB0aGlzLl93cml0ZSh0aGlzLl9yZWNvcmRCYXRjaEJsb2Nrcy5sZW5ndGggPT09IDBcbiAgICAgICAgICAgID8gYCxcXG4gIFwiYmF0Y2hlc1wiOiBbXFxuICAgIGBcbiAgICAgICAgICAgIDogYCxcXG4gICAgYCk7XG4gICAgICAgIHRoaXMuX3dyaXRlKGAke3JlY29yZEJhdGNoVG9KU09OKHJlY29yZHMpfWApO1xuICAgICAgICB0aGlzLl9yZWNvcmRCYXRjaEJsb2Nrcy5wdXNoKG5ldyBGaWxlQmxvY2soMCwgMCwgMCkpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHVibGljIGNsb3NlKCkge1xuICAgICAgICBpZiAodGhpcy5fcmVjb3JkQmF0Y2hCbG9ja3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdGhpcy5fd3JpdGUoYFxcbiAgXWApO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLl9zY2hlbWEpIHtcbiAgICAgICAgICAgIHRoaXMuX3dyaXRlKGBcXG59YCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN1cGVyLmNsb3NlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih3cml0ZXI6IFJlY29yZEJhdGNoV3JpdGVyPFQ+LCBpbnB1dDogVGFibGU8VD4gfCBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pIHtcbiAgICBjb25zdCBjaHVua3MgPSAoaW5wdXQgaW5zdGFuY2VvZiBUYWJsZSkgPyBpbnB1dC5jaHVua3MgOiBpbnB1dDtcbiAgICBmb3IgKGNvbnN0IGJhdGNoIG9mIGNodW5rcykgeyB3cml0ZXIud3JpdGUoYmF0Y2gpOyB9XG4gICAgd3JpdGVyLmNsb3NlKCk7XG4gICAgcmV0dXJuIHdyaXRlcjtcbn1cblxuYXN5bmMgZnVuY3Rpb24gd3JpdGVBbGxBc3luYzxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih3cml0ZXI6IFJlY29yZEJhdGNoV3JpdGVyPFQ+LCBiYXRjaGVzOiBBc3luY0l0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pikge1xuICAgIGZvciBhd2FpdCAoY29uc3QgYmF0Y2ggb2YgYmF0Y2hlcykge1xuICAgICAgICB3cml0ZXIud3JpdGUoYmF0Y2gpO1xuICAgIH1cbiAgICB3cml0ZXIuY2xvc2UoKTtcbiAgICByZXR1cm4gd3JpdGVyO1xufVxuXG5mdW5jdGlvbiBmaWVsZFRvSlNPTih7IG5hbWUsIHR5cGUsIG51bGxhYmxlIH06IEZpZWxkKTogb2JqZWN0IHtcbiAgICBjb25zdCBhc3NlbWJsZXIgPSBuZXcgSlNPTlR5cGVBc3NlbWJsZXIoKTtcbiAgICByZXR1cm4ge1xuICAgICAgICAnbmFtZSc6IG5hbWUsICdudWxsYWJsZSc6IG51bGxhYmxlLFxuICAgICAgICAndHlwZSc6IGFzc2VtYmxlci52aXNpdCh0eXBlKSxcbiAgICAgICAgJ2NoaWxkcmVuJzogKHR5cGUuY2hpbGRyZW4gfHwgW10pLm1hcChmaWVsZFRvSlNPTiksXG4gICAgICAgICdkaWN0aW9uYXJ5JzogIURhdGFUeXBlLmlzRGljdGlvbmFyeSh0eXBlKSA/IHVuZGVmaW5lZCA6IHtcbiAgICAgICAgICAgICdpZCc6IHR5cGUuaWQsXG4gICAgICAgICAgICAnaXNPcmRlcmVkJzogdHlwZS5pc09yZGVyZWQsXG4gICAgICAgICAgICAnaW5kZXhUeXBlJzogYXNzZW1ibGVyLnZpc2l0KHR5cGUuaW5kaWNlcylcbiAgICAgICAgfVxuICAgIH07XG59XG5cbmZ1bmN0aW9uIGRpY3Rpb25hcnlCYXRjaFRvSlNPTihzY2hlbWE6IFNjaGVtYSwgZGljdGlvbmFyeTogVmVjdG9yLCBpZDogbnVtYmVyLCBpc0RlbHRhID0gZmFsc2UpIHtcbiAgICBjb25zdCBmID0gc2NoZW1hLmRpY3Rpb25hcnlGaWVsZHMuZ2V0KGlkKSFbMF07XG4gICAgY29uc3QgZmllbGQgPSBuZXcgRmllbGQoZi5uYW1lLCBmLnR5cGUuZGljdGlvbmFyeSwgZi5udWxsYWJsZSwgZi5tZXRhZGF0YSk7XG4gICAgY29uc3QgY29sdW1ucyA9IEpTT05WZWN0b3JBc3NlbWJsZXIuYXNzZW1ibGUobmV3IENvbHVtbihmaWVsZCwgW2RpY3Rpb25hcnldKSk7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgJ2lkJzogaWQsXG4gICAgICAgICdpc0RlbHRhJzogaXNEZWx0YSxcbiAgICAgICAgJ2RhdGEnOiB7XG4gICAgICAgICAgICAnY291bnQnOiBkaWN0aW9uYXJ5Lmxlbmd0aCxcbiAgICAgICAgICAgICdjb2x1bW5zJzogY29sdW1uc1xuICAgICAgICB9XG4gICAgfSwgbnVsbCwgMik7XG59XG5cbmZ1bmN0aW9uIHJlY29yZEJhdGNoVG9KU09OKHJlY29yZHM6IFJlY29yZEJhdGNoKSB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgJ2NvdW50JzogcmVjb3Jkcy5sZW5ndGgsXG4gICAgICAgICdjb2x1bW5zJzogSlNPTlZlY3RvckFzc2VtYmxlci5hc3NlbWJsZShyZWNvcmRzKVxuICAgIH0sIG51bGwsIDIpO1xufVxuIl19

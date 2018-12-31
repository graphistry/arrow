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
/** @ignore */
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
/** @ignore */
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
/** @ignore */
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
/** @ignore */
function writeAll(writer, input) {
    const chunks = (input instanceof table_1.Table) ? input.chunks : input;
    for (const batch of chunks) {
        writer.write(batch);
    }
    writer.close();
    return writer;
}
/** @ignore */
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QztBQUVELGNBQWM7QUFDZCxTQUFTLGlCQUFpQixDQUFDLE9BQW9CO0lBQzNDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUNsQixPQUFPLEVBQUUsT0FBTyxDQUFDLE1BQU07UUFDdkIsU0FBUyxFQUFFLHlDQUFtQixDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7S0FDbkQsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDaEIsQ0FBQyIsImZpbGUiOiJpcGMvd3JpdGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IFRhYmxlIH0gZnJvbSAnLi4vdGFibGUnO1xuaW1wb3J0IHsgTUFHSUMgfSBmcm9tICcuL21lc3NhZ2UnO1xuaW1wb3J0IHsgVmVjdG9yIH0gZnJvbSAnLi4vdmVjdG9yJztcbmltcG9ydCB7IENvbHVtbiB9IGZyb20gJy4uL2NvbHVtbic7XG5pbXBvcnQgeyBTY2hlbWEsIEZpZWxkIH0gZnJvbSAnLi4vc2NoZW1hJztcbmltcG9ydCB7IENodW5rZWQgfSBmcm9tICcuLi92ZWN0b3IvY2h1bmtlZCc7XG5pbXBvcnQgeyBNZXNzYWdlIH0gZnJvbSAnLi9tZXRhZGF0YS9tZXNzYWdlJztcbmltcG9ydCB7IFJlY29yZEJhdGNoIH0gZnJvbSAnLi4vcmVjb3JkYmF0Y2gnO1xuaW1wb3J0ICogYXMgbWV0YWRhdGEgZnJvbSAnLi9tZXRhZGF0YS9tZXNzYWdlJztcbmltcG9ydCB7IERhdGFUeXBlLCBEaWN0aW9uYXJ5IH0gZnJvbSAnLi4vdHlwZSc7XG5pbXBvcnQgeyBGaWxlQmxvY2ssIEZvb3RlciB9IGZyb20gJy4vbWV0YWRhdGEvZmlsZSc7XG5pbXBvcnQgeyBNZXNzYWdlSGVhZGVyLCBNZXRhZGF0YVZlcnNpb24gfSBmcm9tICcuLi9lbnVtJztcbmltcG9ydCB7IFdyaXRhYmxlU2luaywgQXN5bmNCeXRlUXVldWUgfSBmcm9tICcuLi9pby9zdHJlYW0nO1xuaW1wb3J0IHsgVmVjdG9yQXNzZW1ibGVyIH0gZnJvbSAnLi4vdmlzaXRvci92ZWN0b3Jhc3NlbWJsZXInO1xuaW1wb3J0IHsgSlNPTlR5cGVBc3NlbWJsZXIgfSBmcm9tICcuLi92aXNpdG9yL2pzb250eXBlYXNzZW1ibGVyJztcbmltcG9ydCB7IEpTT05WZWN0b3JBc3NlbWJsZXIgfSBmcm9tICcuLi92aXNpdG9yL2pzb252ZWN0b3Jhc3NlbWJsZXInO1xuaW1wb3J0IHsgQXJyYXlCdWZmZXJWaWV3SW5wdXQsIHRvVWludDhBcnJheSB9IGZyb20gJy4uL3V0aWwvYnVmZmVyJztcbmltcG9ydCB7IFdyaXRhYmxlLCBSZWFkYWJsZUludGVyb3AsIFJlYWRhYmxlRE9NU3RyZWFtT3B0aW9ucyB9IGZyb20gJy4uL2lvL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgaXNQcm9taXNlLCBpc0FzeW5jSXRlcmFibGUsIGlzV3JpdGFibGVET01TdHJlYW0sIGlzV3JpdGFibGVOb2RlU3RyZWFtIH0gZnJvbSAnLi4vdXRpbC9jb21wYXQnO1xuXG5leHBvcnQgY2xhc3MgUmVjb3JkQmF0Y2hXcml0ZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT5cbiAgICBleHRlbmRzIFJlYWRhYmxlSW50ZXJvcDxVaW50OEFycmF5PlxuICAgIGltcGxlbWVudHMgV3JpdGFibGU8UmVjb3JkQmF0Y2g8VD4+IHtcblxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgdGhyb3VnaE5vZGUoKTogaW1wb3J0KCdzdHJlYW0nKS5EdXBsZXggeyB0aHJvdyBuZXcgRXJyb3IoYFwidGhyb3VnaE5vZGVcIiBub3QgYXZhaWxhYmxlIGluIHRoaXMgZW52aXJvbm1lbnRgKTsgfVxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgdGhyb3VnaERPTTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9PigpOiB7IHdyaXRhYmxlOiBXcml0YWJsZVN0cmVhbTxSZWNvcmRCYXRjaDxUPj4sIHJlYWRhYmxlOiBSZWFkYWJsZVN0cmVhbTxVaW50OEFycmF5PiB9IHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBcInRocm91Z2hET01cIiBub3QgYXZhaWxhYmxlIGluIHRoaXMgZW52aXJvbm1lbnRgKTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3Bvc2l0aW9uID0gMDtcbiAgICBwcm90ZWN0ZWQgX3N0YXJ0ZWQgPSBmYWxzZTtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHJvdGVjdGVkIF9zaW5rID0gbmV3IEFzeW5jQnl0ZVF1ZXVlKCk7XG4gICAgcHJvdGVjdGVkIF9zY2hlbWE6IFNjaGVtYSB8IG51bGwgPSBudWxsO1xuICAgIHByb3RlY3RlZCBfZGljdGlvbmFyeUJsb2NrczogRmlsZUJsb2NrW10gPSBbXTtcbiAgICBwcm90ZWN0ZWQgX3JlY29yZEJhdGNoQmxvY2tzOiBGaWxlQmxvY2tbXSA9IFtdO1xuXG4gICAgcHVibGljIHRvU3RyaW5nKHN5bmM6IHRydWUpOiBzdHJpbmc7XG4gICAgcHVibGljIHRvU3RyaW5nKHN5bmM/OiBmYWxzZSk6IFByb21pc2U8c3RyaW5nPjtcbiAgICBwdWJsaWMgdG9TdHJpbmcoc3luYzogYW55ID0gZmFsc2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NpbmsudG9TdHJpbmcoc3luYykgYXMgUHJvbWlzZTxzdHJpbmc+IHwgc3RyaW5nO1xuICAgIH1cbiAgICBwdWJsaWMgdG9VaW50OEFycmF5KHN5bmM6IHRydWUpOiBVaW50OEFycmF5O1xuICAgIHB1YmxpYyB0b1VpbnQ4QXJyYXkoc3luYz86IGZhbHNlKTogUHJvbWlzZTxVaW50OEFycmF5PjtcbiAgICBwdWJsaWMgdG9VaW50OEFycmF5KHN5bmM6IGFueSA9IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zaW5rLnRvVWludDhBcnJheShzeW5jKSBhcyBQcm9taXNlPFVpbnQ4QXJyYXk+IHwgVWludDhBcnJheTtcbiAgICB9XG5cbiAgICBwdWJsaWMgd3JpdGVBbGwoaW5wdXQ6IFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KTogdGhpcztcbiAgICBwdWJsaWMgd3JpdGVBbGwoaW5wdXQ6IEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KTogUHJvbWlzZTx0aGlzPjtcbiAgICBwdWJsaWMgd3JpdGVBbGwoaW5wdXQ6IFByb21pc2VMaWtlPEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+Pik6IFByb21pc2U8dGhpcz47XG4gICAgcHVibGljIHdyaXRlQWxsKGlucHV0OiBQcm9taXNlTGlrZTxUYWJsZTxUPiB8IEl0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pj4pOiBQcm9taXNlPHRoaXM+O1xuICAgIHB1YmxpYyB3cml0ZUFsbChpbnB1dDogUHJvbWlzZUxpa2U8YW55PiB8IFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+IHwgQXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pIHtcbiAgICAgICAgaWYgKGlzUHJvbWlzZTxhbnk+KGlucHV0KSkge1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0LnRoZW4oKHgpID0+IHRoaXMud3JpdGVBbGwoeCkpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzQXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4oaW5wdXQpKSB7XG4gICAgICAgICAgICByZXR1cm4gd3JpdGVBbGxBc3luYyh0aGlzLCBpbnB1dCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHdyaXRlQWxsKHRoaXMsIDxhbnk+IGlucHV0KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0IGNsb3NlZCgpIHsgcmV0dXJuIHRoaXMuX3NpbmsuY2xvc2VkOyB9XG4gICAgcHVibGljIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKSB7IHJldHVybiB0aGlzLl9zaW5rW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpOyB9XG4gICAgcHVibGljIHRvUmVhZGFibGVET01TdHJlYW0ob3B0aW9ucz86IFJlYWRhYmxlRE9NU3RyZWFtT3B0aW9ucykgeyByZXR1cm4gdGhpcy5fc2luay50b1JlYWRhYmxlRE9NU3RyZWFtKG9wdGlvbnMpOyB9XG4gICAgcHVibGljIHRvUmVhZGFibGVOb2RlU3RyZWFtKG9wdGlvbnM/OiBpbXBvcnQoJ3N0cmVhbScpLlJlYWRhYmxlT3B0aW9ucykgeyByZXR1cm4gdGhpcy5fc2luay50b1JlYWRhYmxlTm9kZVN0cmVhbShvcHRpb25zKTsgfVxuXG4gICAgcHVibGljIGNsb3NlKCkgeyByZXR1cm4gdGhpcy5yZXNldCgpLl9zaW5rLmNsb3NlKCk7IH1cbiAgICBwdWJsaWMgYWJvcnQocmVhc29uPzogYW55KSB7IHJldHVybiB0aGlzLnJlc2V0KCkuX3NpbmsuYWJvcnQocmVhc29uKTsgfVxuICAgIHB1YmxpYyByZXNldChzaW5rOiBXcml0YWJsZVNpbms8QXJyYXlCdWZmZXJWaWV3SW5wdXQ+ID0gdGhpcy5fc2luaywgc2NoZW1hPzogU2NoZW1hPFQ+KSB7XG5cbiAgICAgICAgaWYgKChzaW5rID09PSB0aGlzLl9zaW5rKSB8fCAoc2luayBpbnN0YW5jZW9mIEFzeW5jQnl0ZVF1ZXVlKSkge1xuICAgICAgICAgICAgdGhpcy5fc2luayA9IHNpbmsgYXMgQXN5bmNCeXRlUXVldWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zaW5rID0gbmV3IEFzeW5jQnl0ZVF1ZXVlKCk7XG4gICAgICAgICAgICBpZiAoc2luayAmJiBpc1dyaXRhYmxlRE9NU3RyZWFtKHNpbmspKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50b1JlYWRhYmxlRE9NU3RyZWFtKCkucGlwZVRvKHNpbmspO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzaW5rICYmIGlzV3JpdGFibGVOb2RlU3RyZWFtKHNpbmspKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50b1JlYWRhYmxlTm9kZVN0cmVhbSgpLnBpcGUoc2luayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9wb3NpdGlvbiA9IDA7XG4gICAgICAgIHRoaXMuX3NjaGVtYSA9IG51bGw7XG4gICAgICAgIHRoaXMuX3N0YXJ0ZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fZGljdGlvbmFyeUJsb2NrcyA9IFtdO1xuICAgICAgICB0aGlzLl9yZWNvcmRCYXRjaEJsb2NrcyA9IFtdO1xuXG4gICAgICAgIGlmIChzY2hlbWEgaW5zdGFuY2VvZiBTY2hlbWEpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0YXJ0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5fc2NoZW1hID0gc2NoZW1hO1xuICAgICAgICAgICAgdGhpcy5fd3JpdGVTY2hlbWEoc2NoZW1hKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHB1YmxpYyB3cml0ZShjaHVuazogUmVjb3JkQmF0Y2g8VD4pIHtcbiAgICAgICAgaWYgKCF0aGlzLl9zaW5rKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlY29yZEJhdGNoV3JpdGVyIGlzIGNsb3NlZGApO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5fc3RhcnRlZCAmJiAodGhpcy5fc3RhcnRlZCA9IHRydWUpKSB7XG4gICAgICAgICAgICB0aGlzLl93cml0ZVNjaGVtYSh0aGlzLl9zY2hlbWEgPSBjaHVuay5zY2hlbWEpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjaHVuay5zY2hlbWEgIT09IHRoaXMuX3NjaGVtYSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTY2hlbWFzIHVuZXF1YWwnKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl93cml0ZVJlY29yZEJhdGNoKGNodW5rKTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlTWVzc2FnZTxUIGV4dGVuZHMgTWVzc2FnZUhlYWRlcj4obWVzc2FnZTogTWVzc2FnZTxUPiwgYWxpZ25tZW50ID0gOCkge1xuXG4gICAgICAgIGNvbnN0IGEgPSBhbGlnbm1lbnQgLSAxO1xuICAgICAgICBjb25zdCBidWZmZXIgPSBNZXNzYWdlLmVuY29kZShtZXNzYWdlKTtcbiAgICAgICAgY29uc3QgZmxhdGJ1ZmZlclNpemUgPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgY29uc3QgYWxpZ25lZFNpemUgPSAoZmxhdGJ1ZmZlclNpemUgKyA0ICsgYSkgJiB+YTtcbiAgICAgICAgY29uc3QgblBhZGRpbmdCeXRlcyA9IGFsaWduZWRTaXplIC0gZmxhdGJ1ZmZlclNpemUgLSA0O1xuXG4gICAgICAgIGlmIChtZXNzYWdlLmhlYWRlclR5cGUgPT09IE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2gpIHtcbiAgICAgICAgICAgIHRoaXMuX3JlY29yZEJhdGNoQmxvY2tzLnB1c2gobmV3IEZpbGVCbG9jayhhbGlnbmVkU2l6ZSwgbWVzc2FnZS5ib2R5TGVuZ3RoLCB0aGlzLl9wb3NpdGlvbikpO1xuICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuaGVhZGVyVHlwZSA9PT0gTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2gpIHtcbiAgICAgICAgICAgIHRoaXMuX2RpY3Rpb25hcnlCbG9ja3MucHVzaChuZXcgRmlsZUJsb2NrKGFsaWduZWRTaXplLCBtZXNzYWdlLmJvZHlMZW5ndGgsIHRoaXMuX3Bvc2l0aW9uKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBXcml0ZSB0aGUgZmxhdGJ1ZmZlciBzaXplIHByZWZpeCBpbmNsdWRpbmcgcGFkZGluZ1xuICAgICAgICB0aGlzLl93cml0ZShJbnQzMkFycmF5Lm9mKGFsaWduZWRTaXplIC0gNCkpO1xuICAgICAgICAvLyBXcml0ZSB0aGUgZmxhdGJ1ZmZlclxuICAgICAgICBpZiAoZmxhdGJ1ZmZlclNpemUgPiAwKSB7IHRoaXMuX3dyaXRlKGJ1ZmZlcik7IH1cbiAgICAgICAgLy8gV3JpdGUgYW55IHBhZGRpbmdcbiAgICAgICAgcmV0dXJuIHRoaXMuX3dyaXRlUGFkZGluZyhuUGFkZGluZ0J5dGVzKTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlKGNodW5rOiBBcnJheUJ1ZmZlclZpZXdJbnB1dCkge1xuICAgICAgICBpZiAodGhpcy5fc3RhcnRlZCkge1xuICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gdG9VaW50OEFycmF5KGNodW5rKTtcbiAgICAgICAgICAgIGlmIChidWZmZXIgJiYgYnVmZmVyLmJ5dGVMZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2luay53cml0ZShidWZmZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3Bvc2l0aW9uICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGVTY2hlbWEoc2NoZW1hOiBTY2hlbWE8VD4pIHtcbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICAgICAgICAgIC5fd3JpdGVNZXNzYWdlKE1lc3NhZ2UuZnJvbShzY2hlbWEpKVxuICAgICAgICAgICAgLl93cml0ZURpY3Rpb25hcmllcyhzY2hlbWEuZGljdGlvbmFyeUZpZWxkcyk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZUZvb3RlcigpIHtcblxuICAgICAgICBjb25zdCBidWZmZXIgPSBGb290ZXIuZW5jb2RlKG5ldyBGb290ZXIoXG4gICAgICAgICAgICB0aGlzLl9zY2hlbWEhLCBNZXRhZGF0YVZlcnNpb24uVjQsXG4gICAgICAgICAgICB0aGlzLl9yZWNvcmRCYXRjaEJsb2NrcywgdGhpcy5fZGljdGlvbmFyeUJsb2Nrc1xuICAgICAgICApKTtcblxuICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgICAgICAgLl93cml0ZShidWZmZXIpIC8vIFdyaXRlIHRoZSBmbGF0YnVmZmVyXG4gICAgICAgICAgICAuX3dyaXRlKEludDMyQXJyYXkub2YoYnVmZmVyLmJ5dGVMZW5ndGgpKSAvLyB0aGVuIHRoZSBmb290ZXIgc2l6ZSBzdWZmaXhcbiAgICAgICAgICAgIC5fd3JpdGVNYWdpYygpOyAvLyB0aGVuIHRoZSBtYWdpYyBzdWZmaXhcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlTWFnaWMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl93cml0ZShNQUdJQyk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZVBhZGRpbmcobkJ5dGVzOiBudW1iZXIpIHtcbiAgICAgICAgcmV0dXJuIG5CeXRlcyA+IDAgPyB0aGlzLl93cml0ZShuZXcgVWludDhBcnJheShuQnl0ZXMpKSA6IHRoaXM7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZVJlY29yZEJhdGNoKHJlY29yZHM6IFJlY29yZEJhdGNoPFQ+KSB7XG4gICAgICAgIGNvbnN0IHsgYnl0ZUxlbmd0aCwgbm9kZXMsIGJ1ZmZlclJlZ2lvbnMsIGJ1ZmZlcnMgfSA9IFZlY3RvckFzc2VtYmxlci5hc3NlbWJsZShyZWNvcmRzKTtcbiAgICAgICAgY29uc3QgcmVjb3JkQmF0Y2ggPSBuZXcgbWV0YWRhdGEuUmVjb3JkQmF0Y2gocmVjb3Jkcy5sZW5ndGgsIG5vZGVzLCBidWZmZXJSZWdpb25zKTtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IE1lc3NhZ2UuZnJvbShyZWNvcmRCYXRjaCwgYnl0ZUxlbmd0aCk7XG4gICAgICAgIHJldHVybiB0aGlzXG4gICAgICAgICAgICAuX3dyaXRlTWVzc2FnZShtZXNzYWdlKVxuICAgICAgICAgICAgLl93cml0ZUJvZHlCdWZmZXJzKGJ1ZmZlcnMpO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGVEaWN0aW9uYXJ5QmF0Y2goZGljdGlvbmFyeTogVmVjdG9yLCBpZDogbnVtYmVyLCBpc0RlbHRhID0gZmFsc2UpIHtcbiAgICAgICAgY29uc3QgeyBieXRlTGVuZ3RoLCBub2RlcywgYnVmZmVyUmVnaW9ucywgYnVmZmVycyB9ID0gVmVjdG9yQXNzZW1ibGVyLmFzc2VtYmxlKGRpY3Rpb25hcnkpO1xuICAgICAgICBjb25zdCByZWNvcmRCYXRjaCA9IG5ldyBtZXRhZGF0YS5SZWNvcmRCYXRjaChkaWN0aW9uYXJ5Lmxlbmd0aCwgbm9kZXMsIGJ1ZmZlclJlZ2lvbnMpO1xuICAgICAgICBjb25zdCBkaWN0aW9uYXJ5QmF0Y2ggPSBuZXcgbWV0YWRhdGEuRGljdGlvbmFyeUJhdGNoKHJlY29yZEJhdGNoLCBpZCwgaXNEZWx0YSk7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBNZXNzYWdlLmZyb20oZGljdGlvbmFyeUJhdGNoLCBieXRlTGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICAgICAgICAgIC5fd3JpdGVNZXNzYWdlKG1lc3NhZ2UpXG4gICAgICAgICAgICAuX3dyaXRlQm9keUJ1ZmZlcnMoYnVmZmVycyk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZUJvZHlCdWZmZXJzKGJ1ZmZlcnM6IEFycmF5QnVmZmVyVmlld1tdKSB7XG4gICAgICAgIGxldCBidWZmZXI6IEFycmF5QnVmZmVyVmlldztcbiAgICAgICAgbGV0IHNpemU6IG51bWJlciwgcGFkZGluZzogbnVtYmVyO1xuICAgICAgICBmb3IgKGxldCBpID0gLTEsIG4gPSBidWZmZXJzLmxlbmd0aDsgKytpIDwgbjspIHtcbiAgICAgICAgICAgIGlmICgoYnVmZmVyID0gYnVmZmVyc1tpXSkgJiYgKHNpemUgPSBidWZmZXIuYnl0ZUxlbmd0aCkgPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fd3JpdGUoYnVmZmVyKTtcbiAgICAgICAgICAgICAgICBpZiAoKHBhZGRpbmcgPSAoKHNpemUgKyA3KSAmIH43KSAtIHNpemUpID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl93cml0ZVBhZGRpbmcocGFkZGluZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGVEaWN0aW9uYXJpZXMoZGljdGlvbmFyeUZpZWxkczogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeTxhbnksIGFueT4+W10+KSB7XG4gICAgICAgIGZvciAoY29uc3QgW2lkLCBmaWVsZHNdIG9mIGRpY3Rpb25hcnlGaWVsZHMpIHtcbiAgICAgICAgICAgIGNvbnN0IHZlY3RvciA9IGZpZWxkc1swXS50eXBlLmRpY3Rpb25hcnlWZWN0b3I7XG4gICAgICAgICAgICBpZiAoISh2ZWN0b3IgaW5zdGFuY2VvZiBDaHVua2VkKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3dyaXRlRGljdGlvbmFyeUJhdGNoKHZlY3RvciwgaWQsIGZhbHNlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2h1bmtzID0gdmVjdG9yLmNodW5rcztcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gLTEsIG4gPSBjaHVua3MubGVuZ3RoOyArK2kgPCBuOykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl93cml0ZURpY3Rpb25hcnlCYXRjaChjaHVua3NbaV0sIGlkLCBpID4gMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjbGFzcyBSZWNvcmRCYXRjaEZpbGVXcml0ZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFdyaXRlcjxUPiB7XG5cbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KTogUmVjb3JkQmF0Y2hGaWxlV3JpdGVyPFQ+O1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KTogUHJvbWlzZTxSZWNvcmRCYXRjaEZpbGVXcml0ZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogUHJvbWlzZUxpa2U8QXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4+KTogUHJvbWlzZTxSZWNvcmRCYXRjaEZpbGVXcml0ZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogUHJvbWlzZUxpa2U8VGFibGU8VD4gfCBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4+KTogUHJvbWlzZTxSZWNvcmRCYXRjaEZpbGVXcml0ZXI8VD4+O1xuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogUHJvbWlzZUxpa2U8YW55PiB8IFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+IHwgQXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZWNvcmRCYXRjaEZpbGVXcml0ZXI8VD4oKS53cml0ZUFsbChpbnB1dCBhcyBhbnkpO1xuICAgIH1cblxuICAgIHB1YmxpYyBjbG9zZSgpIHtcbiAgICAgICAgdGhpcy5fd3JpdGVGb290ZXIoKTtcbiAgICAgICAgcmV0dXJuIHN1cGVyLmNsb3NlKCk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBfd3JpdGVTY2hlbWEoc2NoZW1hOiBTY2hlbWE8VD4pIHtcbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICAgICAgICAgIC5fd3JpdGVNYWdpYygpLl93cml0ZVBhZGRpbmcoMilcbiAgICAgICAgICAgIC5fd3JpdGVEaWN0aW9uYXJpZXMoc2NoZW1hLmRpY3Rpb25hcnlGaWVsZHMpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjbGFzcyBSZWNvcmRCYXRjaFN0cmVhbVdyaXRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoV3JpdGVyPFQ+IHtcblxuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogVGFibGU8VD4gfCBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pOiBSZWNvcmRCYXRjaFN0cmVhbVdyaXRlcjxUPjtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih0aGlzOiB0eXBlb2YgUmVjb3JkQmF0Y2hXcml0ZXIsIGlucHV0OiBBc3luY0l0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pik6IFByb21pc2U8UmVjb3JkQmF0Y2hTdHJlYW1Xcml0ZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogUHJvbWlzZUxpa2U8QXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4+KTogUHJvbWlzZTxSZWNvcmRCYXRjaFN0cmVhbVdyaXRlcjxUPj47XG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih0aGlzOiB0eXBlb2YgUmVjb3JkQmF0Y2hXcml0ZXIsIGlucHV0OiBQcm9taXNlTGlrZTxUYWJsZTxUPiB8IEl0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pj4pOiBQcm9taXNlPFJlY29yZEJhdGNoU3RyZWFtV3JpdGVyPFQ+PjtcbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IFByb21pc2VMaWtlPGFueT4gfCBUYWJsZTxUPiB8IEl0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+PiB8IEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVjb3JkQmF0Y2hTdHJlYW1Xcml0ZXI8VD4oKS53cml0ZUFsbChpbnB1dCBhcyBhbnkpO1xuICAgIH1cblxuICAgIHB1YmxpYyBjbG9zZSgpIHtcbiAgICAgICAgdGhpcy5fd3JpdGVQYWRkaW5nKDQpOyAvLyBlb3MgYnl0ZXNcbiAgICAgICAgcmV0dXJuIHN1cGVyLmNsb3NlKCk7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIFJlY29yZEJhdGNoSlNPTldyaXRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoV3JpdGVyPFQ+IHtcblxuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogVGFibGU8VD4gfCBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pOiBSZWNvcmRCYXRjaEpTT05Xcml0ZXI8VD47XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogQXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pOiBQcm9taXNlPFJlY29yZEJhdGNoSlNPTldyaXRlcjxUPj47XG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih0aGlzOiB0eXBlb2YgUmVjb3JkQmF0Y2hXcml0ZXIsIGlucHV0OiBQcm9taXNlTGlrZTxBc3luY0l0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pj4pOiBQcm9taXNlPFJlY29yZEJhdGNoSlNPTldyaXRlcjxUPj47XG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih0aGlzOiB0eXBlb2YgUmVjb3JkQmF0Y2hXcml0ZXIsIGlucHV0OiBQcm9taXNlTGlrZTxUYWJsZTxUPiB8IEl0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pj4pOiBQcm9taXNlPFJlY29yZEJhdGNoSlNPTldyaXRlcjxUPj47XG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih0aGlzOiB0eXBlb2YgUmVjb3JkQmF0Y2hXcml0ZXIsIGlucHV0OiBQcm9taXNlTGlrZTxhbnk+IHwgVGFibGU8VD4gfCBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4gfCBBc3luY0l0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pikge1xuICAgICAgICByZXR1cm4gbmV3IFJlY29yZEJhdGNoSlNPTldyaXRlcjxUPigpLndyaXRlQWxsKGlucHV0IGFzIGFueSk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZU1lc3NhZ2UoKSB7IHJldHVybiB0aGlzOyB9XG4gICAgcHJvdGVjdGVkIF93cml0ZVNjaGVtYShzY2hlbWE6IFNjaGVtYTxUPikge1xuICAgICAgICByZXR1cm4gdGhpcy5fd3JpdGUoYHtcXG4gIFwic2NoZW1hXCI6ICR7XG4gICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7IGZpZWxkczogc2NoZW1hLmZpZWxkcy5tYXAoZmllbGRUb0pTT04pIH0sIG51bGwsIDIpXG4gICAgICAgIH1gKS5fd3JpdGVEaWN0aW9uYXJpZXMoc2NoZW1hLmRpY3Rpb25hcnlGaWVsZHMpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgX3dyaXRlRGljdGlvbmFyaWVzKGRpY3Rpb25hcnlGaWVsZHM6IE1hcDxudW1iZXIsIEZpZWxkPERpY3Rpb25hcnk8YW55LCBhbnk+PltdPikge1xuICAgICAgICB0aGlzLl93cml0ZShgLFxcbiAgXCJkaWN0aW9uYXJpZXNcIjogW1xcbmApO1xuICAgICAgICBzdXBlci5fd3JpdGVEaWN0aW9uYXJpZXMoZGljdGlvbmFyeUZpZWxkcyk7XG4gICAgICAgIHJldHVybiB0aGlzLl93cml0ZShgXFxuICBdYCk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBfd3JpdGVEaWN0aW9uYXJ5QmF0Y2goZGljdGlvbmFyeTogVmVjdG9yLCBpZDogbnVtYmVyLCBpc0RlbHRhID0gZmFsc2UpIHtcbiAgICAgICAgdGhpcy5fd3JpdGUodGhpcy5fZGljdGlvbmFyeUJsb2Nrcy5sZW5ndGggPT09IDAgPyBgICAgIGAgOiBgLFxcbiAgICBgKTtcbiAgICAgICAgdGhpcy5fd3JpdGUoYCR7ZGljdGlvbmFyeUJhdGNoVG9KU09OKHRoaXMuX3NjaGVtYSEsIGRpY3Rpb25hcnksIGlkLCBpc0RlbHRhKX1gKTtcbiAgICAgICAgdGhpcy5fZGljdGlvbmFyeUJsb2Nrcy5wdXNoKG5ldyBGaWxlQmxvY2soMCwgMCwgMCkpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHJvdGVjdGVkIF93cml0ZVJlY29yZEJhdGNoKHJlY29yZHM6IFJlY29yZEJhdGNoPFQ+KSB7XG4gICAgICAgIHRoaXMuX3dyaXRlKHRoaXMuX3JlY29yZEJhdGNoQmxvY2tzLmxlbmd0aCA9PT0gMFxuICAgICAgICAgICAgPyBgLFxcbiAgXCJiYXRjaGVzXCI6IFtcXG4gICAgYFxuICAgICAgICAgICAgOiBgLFxcbiAgICBgKTtcbiAgICAgICAgdGhpcy5fd3JpdGUoYCR7cmVjb3JkQmF0Y2hUb0pTT04ocmVjb3Jkcyl9YCk7XG4gICAgICAgIHRoaXMuX3JlY29yZEJhdGNoQmxvY2tzLnB1c2gobmV3IEZpbGVCbG9jaygwLCAwLCAwKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwdWJsaWMgY2xvc2UoKSB7XG4gICAgICAgIGlmICh0aGlzLl9yZWNvcmRCYXRjaEJsb2Nrcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB0aGlzLl93cml0ZShgXFxuICBdYCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX3NjaGVtYSkge1xuICAgICAgICAgICAgdGhpcy5fd3JpdGUoYFxcbn1gKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3VwZXIuY2xvc2UoKTtcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih3cml0ZXI6IFJlY29yZEJhdGNoV3JpdGVyPFQ+LCBpbnB1dDogVGFibGU8VD4gfCBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pIHtcbiAgICBjb25zdCBjaHVua3MgPSAoaW5wdXQgaW5zdGFuY2VvZiBUYWJsZSkgPyBpbnB1dC5jaHVua3MgOiBpbnB1dDtcbiAgICBmb3IgKGNvbnN0IGJhdGNoIG9mIGNodW5rcykgeyB3cml0ZXIud3JpdGUoYmF0Y2gpOyB9XG4gICAgd3JpdGVyLmNsb3NlKCk7XG4gICAgcmV0dXJuIHdyaXRlcjtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmFzeW5jIGZ1bmN0aW9uIHdyaXRlQWxsQXN5bmM8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4od3JpdGVyOiBSZWNvcmRCYXRjaFdyaXRlcjxUPiwgYmF0Y2hlczogQXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pIHtcbiAgICBmb3IgYXdhaXQgKGNvbnN0IGJhdGNoIG9mIGJhdGNoZXMpIHtcbiAgICAgICAgd3JpdGVyLndyaXRlKGJhdGNoKTtcbiAgICB9XG4gICAgd3JpdGVyLmNsb3NlKCk7XG4gICAgcmV0dXJuIHdyaXRlcjtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGZpZWxkVG9KU09OKHsgbmFtZSwgdHlwZSwgbnVsbGFibGUgfTogRmllbGQpOiBvYmplY3Qge1xuICAgIGNvbnN0IGFzc2VtYmxlciA9IG5ldyBKU09OVHlwZUFzc2VtYmxlcigpO1xuICAgIHJldHVybiB7XG4gICAgICAgICduYW1lJzogbmFtZSwgJ251bGxhYmxlJzogbnVsbGFibGUsXG4gICAgICAgICd0eXBlJzogYXNzZW1ibGVyLnZpc2l0KHR5cGUpLFxuICAgICAgICAnY2hpbGRyZW4nOiAodHlwZS5jaGlsZHJlbiB8fCBbXSkubWFwKGZpZWxkVG9KU09OKSxcbiAgICAgICAgJ2RpY3Rpb25hcnknOiAhRGF0YVR5cGUuaXNEaWN0aW9uYXJ5KHR5cGUpID8gdW5kZWZpbmVkIDoge1xuICAgICAgICAgICAgJ2lkJzogdHlwZS5pZCxcbiAgICAgICAgICAgICdpc09yZGVyZWQnOiB0eXBlLmlzT3JkZXJlZCxcbiAgICAgICAgICAgICdpbmRleFR5cGUnOiBhc3NlbWJsZXIudmlzaXQodHlwZS5pbmRpY2VzKVxuICAgICAgICB9XG4gICAgfTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGRpY3Rpb25hcnlCYXRjaFRvSlNPTihzY2hlbWE6IFNjaGVtYSwgZGljdGlvbmFyeTogVmVjdG9yLCBpZDogbnVtYmVyLCBpc0RlbHRhID0gZmFsc2UpIHtcbiAgICBjb25zdCBmID0gc2NoZW1hLmRpY3Rpb25hcnlGaWVsZHMuZ2V0KGlkKSFbMF07XG4gICAgY29uc3QgZmllbGQgPSBuZXcgRmllbGQoZi5uYW1lLCBmLnR5cGUuZGljdGlvbmFyeSwgZi5udWxsYWJsZSwgZi5tZXRhZGF0YSk7XG4gICAgY29uc3QgY29sdW1ucyA9IEpTT05WZWN0b3JBc3NlbWJsZXIuYXNzZW1ibGUobmV3IENvbHVtbihmaWVsZCwgW2RpY3Rpb25hcnldKSk7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgJ2lkJzogaWQsXG4gICAgICAgICdpc0RlbHRhJzogaXNEZWx0YSxcbiAgICAgICAgJ2RhdGEnOiB7XG4gICAgICAgICAgICAnY291bnQnOiBkaWN0aW9uYXJ5Lmxlbmd0aCxcbiAgICAgICAgICAgICdjb2x1bW5zJzogY29sdW1uc1xuICAgICAgICB9XG4gICAgfSwgbnVsbCwgMik7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiByZWNvcmRCYXRjaFRvSlNPTihyZWNvcmRzOiBSZWNvcmRCYXRjaCkge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICdjb3VudCc6IHJlY29yZHMubGVuZ3RoLFxuICAgICAgICAnY29sdW1ucyc6IEpTT05WZWN0b3JBc3NlbWJsZXIuYXNzZW1ibGUocmVjb3JkcylcbiAgICB9LCBudWxsLCAyKTtcbn1cbiJdfQ==

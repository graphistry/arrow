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
            if (payload.length > 0) {
                this._writeRecordBatch(payload);
            }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDOUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxjQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMzRSxNQUFNLE9BQU8sR0FBRyx5Q0FBbUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxlQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzlFLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUNsQixJQUFJLEVBQUUsRUFBRTtRQUNSLFNBQVMsRUFBRSxPQUFPO1FBQ2xCLE1BQU0sRUFBRTtZQUNKLE9BQU8sRUFBRSxVQUFVLENBQUMsTUFBTTtZQUMxQixTQUFTLEVBQUUsT0FBTztTQUNyQjtLQUNKLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ2hCLENBQUM7QUFFRCxjQUFjO0FBQ2QsU0FBUyxpQkFBaUIsQ0FBQyxPQUFvQjtJQUMzQyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDbEIsT0FBTyxFQUFFLE9BQU8sQ0FBQyxNQUFNO1FBQ3ZCLFNBQVMsRUFBRSx5Q0FBbUIsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO0tBQ25ELEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ2hCLENBQUMiLCJmaWxlIjoiaXBjL3dyaXRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBUYWJsZSB9IGZyb20gJy4uL3RhYmxlJztcbmltcG9ydCB7IE1BR0lDIH0gZnJvbSAnLi9tZXNzYWdlJztcbmltcG9ydCB7IFZlY3RvciB9IGZyb20gJy4uL3ZlY3Rvcic7XG5pbXBvcnQgeyBDb2x1bW4gfSBmcm9tICcuLi9jb2x1bW4nO1xuaW1wb3J0IHsgU2NoZW1hLCBGaWVsZCB9IGZyb20gJy4uL3NjaGVtYSc7XG5pbXBvcnQgeyBDaHVua2VkIH0gZnJvbSAnLi4vdmVjdG9yL2NodW5rZWQnO1xuaW1wb3J0IHsgTWVzc2FnZSB9IGZyb20gJy4vbWV0YWRhdGEvbWVzc2FnZSc7XG5pbXBvcnQgeyBSZWNvcmRCYXRjaCB9IGZyb20gJy4uL3JlY29yZGJhdGNoJztcbmltcG9ydCAqIGFzIG1ldGFkYXRhIGZyb20gJy4vbWV0YWRhdGEvbWVzc2FnZSc7XG5pbXBvcnQgeyBEYXRhVHlwZSwgRGljdGlvbmFyeSB9IGZyb20gJy4uL3R5cGUnO1xuaW1wb3J0IHsgRmlsZUJsb2NrLCBGb290ZXIgfSBmcm9tICcuL21ldGFkYXRhL2ZpbGUnO1xuaW1wb3J0IHsgTWVzc2FnZUhlYWRlciwgTWV0YWRhdGFWZXJzaW9uIH0gZnJvbSAnLi4vZW51bSc7XG5pbXBvcnQgeyBXcml0YWJsZVNpbmssIEFzeW5jQnl0ZVF1ZXVlIH0gZnJvbSAnLi4vaW8vc3RyZWFtJztcbmltcG9ydCB7IFZlY3RvckFzc2VtYmxlciB9IGZyb20gJy4uL3Zpc2l0b3IvdmVjdG9yYXNzZW1ibGVyJztcbmltcG9ydCB7IEpTT05UeXBlQXNzZW1ibGVyIH0gZnJvbSAnLi4vdmlzaXRvci9qc29udHlwZWFzc2VtYmxlcic7XG5pbXBvcnQgeyBKU09OVmVjdG9yQXNzZW1ibGVyIH0gZnJvbSAnLi4vdmlzaXRvci9qc29udmVjdG9yYXNzZW1ibGVyJztcbmltcG9ydCB7IEFycmF5QnVmZmVyVmlld0lucHV0LCB0b1VpbnQ4QXJyYXkgfSBmcm9tICcuLi91dGlsL2J1ZmZlcic7XG5pbXBvcnQgeyBXcml0YWJsZSwgUmVhZGFibGVJbnRlcm9wLCBSZWFkYWJsZURPTVN0cmVhbU9wdGlvbnMgfSBmcm9tICcuLi9pby9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGlzUHJvbWlzZSwgaXNBc3luY0l0ZXJhYmxlLCBpc1dyaXRhYmxlRE9NU3RyZWFtLCBpc1dyaXRhYmxlTm9kZVN0cmVhbSwgaXNJdGVyYWJsZSB9IGZyb20gJy4uL3V0aWwvY29tcGF0JztcblxuZXhwb3J0IGNsYXNzIFJlY29yZEJhdGNoV3JpdGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVhZGFibGVJbnRlcm9wPFVpbnQ4QXJyYXk+IGltcGxlbWVudHMgV3JpdGFibGU8UmVjb3JkQmF0Y2g8VD4+IHtcblxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgc3RhdGljIHRocm91Z2hOb2RlKG9wdGlvbnM/OiBpbXBvcnQoJ3N0cmVhbScpLkR1cGxleE9wdGlvbnMgJiB7IGF1dG9EZXN0cm95OiBib29sZWFuIH0pOiBpbXBvcnQoJ3N0cmVhbScpLkR1cGxleCB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgXCJ0aHJvdWdoTm9kZVwiIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBlbnZpcm9ubWVudGApO1xuICAgIH1cbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIHRocm91Z2hET008VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfT4oXG4gICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgd3JpdGFibGVTdHJhdGVneT86IFF1ZXVpbmdTdHJhdGVneTxSZWNvcmRCYXRjaDxUPj4gJiB7IGF1dG9EZXN0cm95OiBib29sZWFuIH0sXG4gICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgcmVhZGFibGVTdHJhdGVneT86IHsgaGlnaFdhdGVyTWFyaz86IG51bWJlciwgc2l6ZT86IGFueSB9XG4gICAgKTogeyB3cml0YWJsZTogV3JpdGFibGVTdHJlYW08VGFibGU8VD4gfCBSZWNvcmRCYXRjaDxUPj4sIHJlYWRhYmxlOiBSZWFkYWJsZVN0cmVhbTxVaW50OEFycmF5PiB9IHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBcInRocm91Z2hET01cIiBub3QgYXZhaWxhYmxlIGluIHRoaXMgZW52aXJvbm1lbnRgKTtcbiAgICB9XG5cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zPzogeyBhdXRvRGVzdHJveTogYm9vbGVhbiB9KSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuX2F1dG9EZXN0cm95ID0gb3B0aW9ucyAmJiAodHlwZW9mIG9wdGlvbnMuYXV0b0Rlc3Ryb3kgPT09ICdib29sZWFuJykgPyBvcHRpb25zLmF1dG9EZXN0cm95IDogdHJ1ZTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3Bvc2l0aW9uID0gMDtcbiAgICBwcm90ZWN0ZWQgX3N0YXJ0ZWQgPSBmYWxzZTtcbiAgICBwcm90ZWN0ZWQgX2F1dG9EZXN0cm95OiBib29sZWFuO1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwcm90ZWN0ZWQgX3NpbmsgPSBuZXcgQXN5bmNCeXRlUXVldWUoKTtcbiAgICBwcm90ZWN0ZWQgX3NjaGVtYTogU2NoZW1hIHwgbnVsbCA9IG51bGw7XG4gICAgcHJvdGVjdGVkIF9kaWN0aW9uYXJ5QmxvY2tzOiBGaWxlQmxvY2tbXSA9IFtdO1xuICAgIHByb3RlY3RlZCBfcmVjb3JkQmF0Y2hCbG9ja3M6IEZpbGVCbG9ja1tdID0gW107XG5cbiAgICBwdWJsaWMgdG9TdHJpbmcoc3luYzogdHJ1ZSk6IHN0cmluZztcbiAgICBwdWJsaWMgdG9TdHJpbmcoc3luYz86IGZhbHNlKTogUHJvbWlzZTxzdHJpbmc+O1xuICAgIHB1YmxpYyB0b1N0cmluZyhzeW5jOiBhbnkgPSBmYWxzZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2luay50b1N0cmluZyhzeW5jKSBhcyBQcm9taXNlPHN0cmluZz4gfCBzdHJpbmc7XG4gICAgfVxuICAgIHB1YmxpYyB0b1VpbnQ4QXJyYXkoc3luYzogdHJ1ZSk6IFVpbnQ4QXJyYXk7XG4gICAgcHVibGljIHRvVWludDhBcnJheShzeW5jPzogZmFsc2UpOiBQcm9taXNlPFVpbnQ4QXJyYXk+O1xuICAgIHB1YmxpYyB0b1VpbnQ4QXJyYXkoc3luYzogYW55ID0gZmFsc2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NpbmsudG9VaW50OEFycmF5KHN5bmMpIGFzIFByb21pc2U8VWludDhBcnJheT4gfCBVaW50OEFycmF5O1xuICAgIH1cblxuICAgIHB1YmxpYyB3cml0ZUFsbChpbnB1dDogVGFibGU8VD4gfCBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pOiB0aGlzO1xuICAgIHB1YmxpYyB3cml0ZUFsbChpbnB1dDogQXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pOiBQcm9taXNlPHRoaXM+O1xuICAgIHB1YmxpYyB3cml0ZUFsbChpbnB1dDogUHJvbWlzZUxpa2U8QXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4+KTogUHJvbWlzZTx0aGlzPjtcbiAgICBwdWJsaWMgd3JpdGVBbGwoaW5wdXQ6IFByb21pc2VMaWtlPFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+Pik6IFByb21pc2U8dGhpcz47XG4gICAgcHVibGljIHdyaXRlQWxsKGlucHV0OiBQcm9taXNlTGlrZTxhbnk+IHwgVGFibGU8VD4gfCBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4gfCBBc3luY0l0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pikge1xuICAgICAgICBpZiAoaXNQcm9taXNlPGFueT4oaW5wdXQpKSB7XG4gICAgICAgICAgICByZXR1cm4gaW5wdXQudGhlbigoeCkgPT4gdGhpcy53cml0ZUFsbCh4KSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBc3luY0l0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+PihpbnB1dCkpIHtcbiAgICAgICAgICAgIHJldHVybiB3cml0ZUFsbEFzeW5jKHRoaXMsIGlucHV0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gd3JpdGVBbGwodGhpcywgPGFueT4gaW5wdXQpO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXQgY2xvc2VkKCkgeyByZXR1cm4gdGhpcy5fc2luay5jbG9zZWQ7IH1cbiAgICBwdWJsaWMgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpIHsgcmV0dXJuIHRoaXMuX3NpbmtbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk7IH1cbiAgICBwdWJsaWMgdG9ET01TdHJlYW0ob3B0aW9ucz86IFJlYWRhYmxlRE9NU3RyZWFtT3B0aW9ucykgeyByZXR1cm4gdGhpcy5fc2luay50b0RPTVN0cmVhbShvcHRpb25zKTsgfVxuICAgIHB1YmxpYyB0b05vZGVTdHJlYW0ob3B0aW9ucz86IGltcG9ydCgnc3RyZWFtJykuUmVhZGFibGVPcHRpb25zKSB7IHJldHVybiB0aGlzLl9zaW5rLnRvTm9kZVN0cmVhbShvcHRpb25zKTsgfVxuXG4gICAgcHVibGljIGNsb3NlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZXNldCgpLl9zaW5rLmNsb3NlKCk7XG4gICAgfVxuICAgIHB1YmxpYyBhYm9ydChyZWFzb24/OiBhbnkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVzZXQoKS5fc2luay5hYm9ydChyZWFzb24pO1xuICAgIH1cbiAgICBwdWJsaWMgZmluaXNoKCkge1xuICAgICAgICB0aGlzLl9hdXRvRGVzdHJveSA/IHRoaXMuY2xvc2UoKSA6IHRoaXMucmVzZXQodGhpcy5fc2luaywgdGhpcy5fc2NoZW1hKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHB1YmxpYyByZXNldChzaW5rOiBXcml0YWJsZVNpbms8QXJyYXlCdWZmZXJWaWV3SW5wdXQ+ID0gdGhpcy5fc2luaywgc2NoZW1hOiBTY2hlbWE8VD4gfCBudWxsID0gbnVsbCkge1xuXG4gICAgICAgIGlmICgoc2luayA9PT0gdGhpcy5fc2luaykgfHwgKHNpbmsgaW5zdGFuY2VvZiBBc3luY0J5dGVRdWV1ZSkpIHtcbiAgICAgICAgICAgIHRoaXMuX3NpbmsgPSBzaW5rIGFzIEFzeW5jQnl0ZVF1ZXVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fc2luayA9IG5ldyBBc3luY0J5dGVRdWV1ZSgpO1xuICAgICAgICAgICAgaWYgKHNpbmsgJiYgaXNXcml0YWJsZURPTVN0cmVhbShzaW5rKSkge1xuICAgICAgICAgICAgICAgIHRoaXMudG9ET01TdHJlYW0oeyB0eXBlOiAnYnl0ZXMnIH0pLnBpcGVUbyhzaW5rKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc2luayAmJiBpc1dyaXRhYmxlTm9kZVN0cmVhbShzaW5rKSkge1xuICAgICAgICAgICAgICAgIHRoaXMudG9Ob2RlU3RyZWFtKHsgb2JqZWN0TW9kZTogZmFsc2UgfSkucGlwZShzaW5rKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9zdGFydGVkICYmIHRoaXMuX3NjaGVtYSkge1xuICAgICAgICAgICAgdGhpcy5fd3JpdGVGb290ZXIoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3N0YXJ0ZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fZGljdGlvbmFyeUJsb2NrcyA9IFtdO1xuICAgICAgICB0aGlzLl9yZWNvcmRCYXRjaEJsb2NrcyA9IFtdO1xuXG4gICAgICAgIGlmICghc2NoZW1hIHx8ICEoc2NoZW1hLmNvbXBhcmVUbyh0aGlzLl9zY2hlbWEpKSkge1xuICAgICAgICAgICAgaWYgKHNjaGVtYSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3Bvc2l0aW9uID0gMDtcbiAgICAgICAgICAgICAgICB0aGlzLl9zY2hlbWEgPSBudWxsO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLl9zY2hlbWEgPSBzY2hlbWE7XG4gICAgICAgICAgICAgICAgdGhpcy5fd3JpdGVTY2hlbWEoc2NoZW1hKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHB1YmxpYyB3cml0ZShwYXlsb2FkPzogVGFibGU8VD4gfCBSZWNvcmRCYXRjaDxUPiB8IEl0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+PiB8IG51bGwpIHtcblxuICAgICAgICBsZXQgc2NoZW1hOiBTY2hlbWE8VD4gfCBudWxsID0gbnVsbDtcblxuICAgICAgICBpZiAoIXRoaXMuX3NpbmspIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUmVjb3JkQmF0Y2hXcml0ZXIgaXMgY2xvc2VkYCk7XG4gICAgICAgIH0gZWxzZSBpZiAocGF5bG9hZCA9PT0gbnVsbCB8fCBwYXlsb2FkID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZpbmlzaCgpICYmIHVuZGVmaW5lZDtcbiAgICAgICAgfSBlbHNlIGlmIChwYXlsb2FkIGluc3RhbmNlb2YgVGFibGUgJiYgIShzY2hlbWEgPSBwYXlsb2FkLnNjaGVtYSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZpbmlzaCgpICYmIHVuZGVmaW5lZDtcbiAgICAgICAgfSBlbHNlIGlmIChwYXlsb2FkIGluc3RhbmNlb2YgUmVjb3JkQmF0Y2ggJiYgIShzY2hlbWEgPSBwYXlsb2FkLnNjaGVtYSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZpbmlzaCgpICYmIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzY2hlbWEgJiYgIXNjaGVtYS5jb21wYXJlVG8odGhpcy5fc2NoZW1hKSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX3N0YXJ0ZWQgJiYgdGhpcy5fYXV0b0Rlc3Ryb3kpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5yZXNldCh0aGlzLl9zaW5rLCBzY2hlbWEpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBheWxvYWQgaW5zdGFuY2VvZiBSZWNvcmRCYXRjaCkge1xuICAgICAgICAgICAgaWYgKHBheWxvYWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3dyaXRlUmVjb3JkQmF0Y2gocGF5bG9hZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocGF5bG9hZCBpbnN0YW5jZW9mIFRhYmxlKSB7XG4gICAgICAgICAgICB0aGlzLndyaXRlQWxsKHBheWxvYWQuY2h1bmtzKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0l0ZXJhYmxlKHBheWxvYWQpKSB7XG4gICAgICAgICAgICB0aGlzLndyaXRlQWxsKHBheWxvYWQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZU1lc3NhZ2U8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KG1lc3NhZ2U6IE1lc3NhZ2U8VD4sIGFsaWdubWVudCA9IDgpIHtcblxuICAgICAgICBjb25zdCBhID0gYWxpZ25tZW50IC0gMTtcbiAgICAgICAgY29uc3QgYnVmZmVyID0gTWVzc2FnZS5lbmNvZGUobWVzc2FnZSk7XG4gICAgICAgIGNvbnN0IGZsYXRidWZmZXJTaXplID0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgICAgIGNvbnN0IGFsaWduZWRTaXplID0gKGZsYXRidWZmZXJTaXplICsgNCArIGEpICYgfmE7XG4gICAgICAgIGNvbnN0IG5QYWRkaW5nQnl0ZXMgPSBhbGlnbmVkU2l6ZSAtIGZsYXRidWZmZXJTaXplIC0gNDtcblxuICAgICAgICBpZiAobWVzc2FnZS5oZWFkZXJUeXBlID09PSBNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoKSB7XG4gICAgICAgICAgICB0aGlzLl9yZWNvcmRCYXRjaEJsb2Nrcy5wdXNoKG5ldyBGaWxlQmxvY2soYWxpZ25lZFNpemUsIG1lc3NhZ2UuYm9keUxlbmd0aCwgdGhpcy5fcG9zaXRpb24pKTtcbiAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmhlYWRlclR5cGUgPT09IE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoKSB7XG4gICAgICAgICAgICB0aGlzLl9kaWN0aW9uYXJ5QmxvY2tzLnB1c2gobmV3IEZpbGVCbG9jayhhbGlnbmVkU2l6ZSwgbWVzc2FnZS5ib2R5TGVuZ3RoLCB0aGlzLl9wb3NpdGlvbikpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gV3JpdGUgdGhlIGZsYXRidWZmZXIgc2l6ZSBwcmVmaXggaW5jbHVkaW5nIHBhZGRpbmdcbiAgICAgICAgdGhpcy5fd3JpdGUoSW50MzJBcnJheS5vZihhbGlnbmVkU2l6ZSAtIDQpKTtcbiAgICAgICAgLy8gV3JpdGUgdGhlIGZsYXRidWZmZXJcbiAgICAgICAgaWYgKGZsYXRidWZmZXJTaXplID4gMCkgeyB0aGlzLl93cml0ZShidWZmZXIpOyB9XG4gICAgICAgIC8vIFdyaXRlIGFueSBwYWRkaW5nXG4gICAgICAgIHJldHVybiB0aGlzLl93cml0ZVBhZGRpbmcoblBhZGRpbmdCeXRlcyk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZShjaHVuazogQXJyYXlCdWZmZXJWaWV3SW5wdXQpIHtcbiAgICAgICAgaWYgKHRoaXMuX3N0YXJ0ZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IHRvVWludDhBcnJheShjaHVuayk7XG4gICAgICAgICAgICBpZiAoYnVmZmVyICYmIGJ1ZmZlci5ieXRlTGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3Npbmsud3JpdGUoYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9wb3NpdGlvbiArPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlU2NoZW1hKHNjaGVtYTogU2NoZW1hPFQ+KSB7XG4gICAgICAgIHJldHVybiB0aGlzXG4gICAgICAgICAgICAuX3dyaXRlTWVzc2FnZShNZXNzYWdlLmZyb20oc2NoZW1hKSlcbiAgICAgICAgICAgIC5fd3JpdGVEaWN0aW9uYXJpZXMoc2NoZW1hLmRpY3Rpb25hcnlGaWVsZHMpO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGVGb290ZXIoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl93cml0ZVBhZGRpbmcoNCk7IC8vIGVvcyBieXRlc1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGVNYWdpYygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3dyaXRlKE1BR0lDKTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlUGFkZGluZyhuQnl0ZXM6IG51bWJlcikge1xuICAgICAgICByZXR1cm4gbkJ5dGVzID4gMCA/IHRoaXMuX3dyaXRlKG5ldyBVaW50OEFycmF5KG5CeXRlcykpIDogdGhpcztcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlUmVjb3JkQmF0Y2gocmVjb3JkczogUmVjb3JkQmF0Y2g8VD4pIHtcbiAgICAgICAgY29uc3QgeyBieXRlTGVuZ3RoLCBub2RlcywgYnVmZmVyUmVnaW9ucywgYnVmZmVycyB9ID0gVmVjdG9yQXNzZW1ibGVyLmFzc2VtYmxlKHJlY29yZHMpO1xuICAgICAgICBjb25zdCByZWNvcmRCYXRjaCA9IG5ldyBtZXRhZGF0YS5SZWNvcmRCYXRjaChyZWNvcmRzLmxlbmd0aCwgbm9kZXMsIGJ1ZmZlclJlZ2lvbnMpO1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gTWVzc2FnZS5mcm9tKHJlY29yZEJhdGNoLCBieXRlTGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICAgICAgICAgIC5fd3JpdGVNZXNzYWdlKG1lc3NhZ2UpXG4gICAgICAgICAgICAuX3dyaXRlQm9keUJ1ZmZlcnMoYnVmZmVycyk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZURpY3Rpb25hcnlCYXRjaChkaWN0aW9uYXJ5OiBWZWN0b3IsIGlkOiBudW1iZXIsIGlzRGVsdGEgPSBmYWxzZSkge1xuICAgICAgICBjb25zdCB7IGJ5dGVMZW5ndGgsIG5vZGVzLCBidWZmZXJSZWdpb25zLCBidWZmZXJzIH0gPSBWZWN0b3JBc3NlbWJsZXIuYXNzZW1ibGUoZGljdGlvbmFyeSk7XG4gICAgICAgIGNvbnN0IHJlY29yZEJhdGNoID0gbmV3IG1ldGFkYXRhLlJlY29yZEJhdGNoKGRpY3Rpb25hcnkubGVuZ3RoLCBub2RlcywgYnVmZmVyUmVnaW9ucyk7XG4gICAgICAgIGNvbnN0IGRpY3Rpb25hcnlCYXRjaCA9IG5ldyBtZXRhZGF0YS5EaWN0aW9uYXJ5QmF0Y2gocmVjb3JkQmF0Y2gsIGlkLCBpc0RlbHRhKTtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IE1lc3NhZ2UuZnJvbShkaWN0aW9uYXJ5QmF0Y2gsIGJ5dGVMZW5ndGgpO1xuICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgICAgICAgLl93cml0ZU1lc3NhZ2UobWVzc2FnZSlcbiAgICAgICAgICAgIC5fd3JpdGVCb2R5QnVmZmVycyhidWZmZXJzKTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlQm9keUJ1ZmZlcnMoYnVmZmVyczogQXJyYXlCdWZmZXJWaWV3W10pIHtcbiAgICAgICAgbGV0IGJ1ZmZlcjogQXJyYXlCdWZmZXJWaWV3O1xuICAgICAgICBsZXQgc2l6ZTogbnVtYmVyLCBwYWRkaW5nOiBudW1iZXI7XG4gICAgICAgIGZvciAobGV0IGkgPSAtMSwgbiA9IGJ1ZmZlcnMubGVuZ3RoOyArK2kgPCBuOykge1xuICAgICAgICAgICAgaWYgKChidWZmZXIgPSBidWZmZXJzW2ldKSAmJiAoc2l6ZSA9IGJ1ZmZlci5ieXRlTGVuZ3RoKSA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLl93cml0ZShidWZmZXIpO1xuICAgICAgICAgICAgICAgIGlmICgocGFkZGluZyA9ICgoc2l6ZSArIDcpICYgfjcpIC0gc2l6ZSkgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3dyaXRlUGFkZGluZyhwYWRkaW5nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZURpY3Rpb25hcmllcyhkaWN0aW9uYXJ5RmllbGRzOiBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5PGFueSwgYW55Pj5bXT4pIHtcbiAgICAgICAgZm9yIChjb25zdCBbaWQsIGZpZWxkc10gb2YgZGljdGlvbmFyeUZpZWxkcykge1xuICAgICAgICAgICAgY29uc3QgdmVjdG9yID0gZmllbGRzWzBdLnR5cGUuZGljdGlvbmFyeVZlY3RvcjtcbiAgICAgICAgICAgIGlmICghKHZlY3RvciBpbnN0YW5jZW9mIENodW5rZWQpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fd3JpdGVEaWN0aW9uYXJ5QmF0Y2godmVjdG9yLCBpZCwgZmFsc2UpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjaHVua3MgPSB2ZWN0b3IuY2h1bmtzO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAtMSwgbiA9IGNodW5rcy5sZW5ndGg7ICsraSA8IG47KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3dyaXRlRGljdGlvbmFyeUJhdGNoKGNodW5rc1tpXSwgaWQsIGkgPiAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIFJlY29yZEJhdGNoU3RyZWFtV3JpdGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hXcml0ZXI8VD4ge1xuXG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih0aGlzOiB0eXBlb2YgUmVjb3JkQmF0Y2hXcml0ZXIsIGlucHV0OiBUYWJsZTxUPiB8IEl0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Piwgb3B0aW9ucz86IHsgYXV0b0Rlc3Ryb3k6IHRydWUgfSk6IFJlY29yZEJhdGNoU3RyZWFtV3JpdGVyPFQ+O1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+LCBvcHRpb25zPzogeyBhdXRvRGVzdHJveTogdHJ1ZSB9KTogUHJvbWlzZTxSZWNvcmRCYXRjaFN0cmVhbVdyaXRlcjxUPj47XG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih0aGlzOiB0eXBlb2YgUmVjb3JkQmF0Y2hXcml0ZXIsIGlucHV0OiBQcm9taXNlTGlrZTxBc3luY0l0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pj4sIG9wdGlvbnM/OiB7IGF1dG9EZXN0cm95OiB0cnVlIH0pOiBQcm9taXNlPFJlY29yZEJhdGNoU3RyZWFtV3JpdGVyPFQ+PjtcbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IFByb21pc2VMaWtlPFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+Piwgb3B0aW9ucz86IHsgYXV0b0Rlc3Ryb3k6IHRydWUgfSk6IFByb21pc2U8UmVjb3JkQmF0Y2hTdHJlYW1Xcml0ZXI8VD4+O1xuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogYW55LCBvcHRpb25zPzogeyBhdXRvRGVzdHJveTogdHJ1ZSB9KSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVjb3JkQmF0Y2hTdHJlYW1Xcml0ZXI8VD4ob3B0aW9ucykud3JpdGVBbGwoaW5wdXQpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjbGFzcyBSZWNvcmRCYXRjaEZpbGVXcml0ZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFdyaXRlcjxUPiB7XG5cbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KTogUmVjb3JkQmF0Y2hGaWxlV3JpdGVyPFQ+O1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KTogUHJvbWlzZTxSZWNvcmRCYXRjaEZpbGVXcml0ZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogUHJvbWlzZUxpa2U8QXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4+KTogUHJvbWlzZTxSZWNvcmRCYXRjaEZpbGVXcml0ZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogUHJvbWlzZUxpa2U8VGFibGU8VD4gfCBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4+KTogUHJvbWlzZTxSZWNvcmRCYXRjaEZpbGVXcml0ZXI8VD4+O1xuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogYW55KSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVjb3JkQmF0Y2hGaWxlV3JpdGVyPFQ+KCkud3JpdGVBbGwoaW5wdXQpO1xuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLl9hdXRvRGVzdHJveSA9IHRydWU7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZVNjaGVtYShzY2hlbWE6IFNjaGVtYTxUPikge1xuICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgICAgICAgLl93cml0ZU1hZ2ljKCkuX3dyaXRlUGFkZGluZygyKVxuICAgICAgICAgICAgLl93cml0ZURpY3Rpb25hcmllcyhzY2hlbWEuZGljdGlvbmFyeUZpZWxkcyk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZUZvb3RlcigpIHtcbiAgICAgICAgY29uc3QgYnVmZmVyID0gRm9vdGVyLmVuY29kZShuZXcgRm9vdGVyKFxuICAgICAgICAgICAgdGhpcy5fc2NoZW1hISwgTWV0YWRhdGFWZXJzaW9uLlY0LFxuICAgICAgICAgICAgdGhpcy5fcmVjb3JkQmF0Y2hCbG9ja3MsIHRoaXMuX2RpY3Rpb25hcnlCbG9ja3NcbiAgICAgICAgKSk7XG4gICAgICAgIHJldHVybiB0aGlzXG4gICAgICAgICAgICAuX3dyaXRlKGJ1ZmZlcikgLy8gV3JpdGUgdGhlIGZsYXRidWZmZXJcbiAgICAgICAgICAgIC5fd3JpdGUoSW50MzJBcnJheS5vZihidWZmZXIuYnl0ZUxlbmd0aCkpIC8vIHRoZW4gdGhlIGZvb3RlciBzaXplIHN1ZmZpeFxuICAgICAgICAgICAgLl93cml0ZU1hZ2ljKCk7IC8vIHRoZW4gdGhlIG1hZ2ljIHN1ZmZpeFxuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjbGFzcyBSZWNvcmRCYXRjaEpTT05Xcml0ZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFdyaXRlcjxUPiB7XG5cbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KTogUmVjb3JkQmF0Y2hKU09OV3JpdGVyPFQ+O1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KTogUHJvbWlzZTxSZWNvcmRCYXRjaEpTT05Xcml0ZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogUHJvbWlzZUxpa2U8QXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4+KTogUHJvbWlzZTxSZWNvcmRCYXRjaEpTT05Xcml0ZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogUHJvbWlzZUxpa2U8VGFibGU8VD4gfCBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4+KTogUHJvbWlzZTxSZWNvcmRCYXRjaEpTT05Xcml0ZXI8VD4+O1xuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogYW55KSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVjb3JkQmF0Y2hKU09OV3JpdGVyPFQ+KCkud3JpdGVBbGwoaW5wdXQgYXMgYW55KTtcbiAgICB9XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5fYXV0b0Rlc3Ryb3kgPSB0cnVlO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGVNZXNzYWdlKCkgeyByZXR1cm4gdGhpczsgfVxuICAgIHByb3RlY3RlZCBfd3JpdGVTY2hlbWEoc2NoZW1hOiBTY2hlbWE8VD4pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3dyaXRlKGB7XFxuICBcInNjaGVtYVwiOiAke1xuICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoeyBmaWVsZHM6IHNjaGVtYS5maWVsZHMubWFwKGZpZWxkVG9KU09OKSB9LCBudWxsLCAyKVxuICAgICAgICB9YCkuX3dyaXRlRGljdGlvbmFyaWVzKHNjaGVtYS5kaWN0aW9uYXJ5RmllbGRzKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIF93cml0ZURpY3Rpb25hcmllcyhkaWN0aW9uYXJ5RmllbGRzOiBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5PGFueSwgYW55Pj5bXT4pIHtcbiAgICAgICAgdGhpcy5fd3JpdGUoYCxcXG4gIFwiZGljdGlvbmFyaWVzXCI6IFtcXG5gKTtcbiAgICAgICAgc3VwZXIuX3dyaXRlRGljdGlvbmFyaWVzKGRpY3Rpb25hcnlGaWVsZHMpO1xuICAgICAgICByZXR1cm4gdGhpcy5fd3JpdGUoYFxcbiAgXWApO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgX3dyaXRlRGljdGlvbmFyeUJhdGNoKGRpY3Rpb25hcnk6IFZlY3RvciwgaWQ6IG51bWJlciwgaXNEZWx0YSA9IGZhbHNlKSB7XG4gICAgICAgIHRoaXMuX3dyaXRlKHRoaXMuX2RpY3Rpb25hcnlCbG9ja3MubGVuZ3RoID09PSAwID8gYCAgICBgIDogYCxcXG4gICAgYCk7XG4gICAgICAgIHRoaXMuX3dyaXRlKGAke2RpY3Rpb25hcnlCYXRjaFRvSlNPTih0aGlzLl9zY2hlbWEhLCBkaWN0aW9uYXJ5LCBpZCwgaXNEZWx0YSl9YCk7XG4gICAgICAgIHRoaXMuX2RpY3Rpb25hcnlCbG9ja3MucHVzaChuZXcgRmlsZUJsb2NrKDAsIDAsIDApKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHByb3RlY3RlZCBfd3JpdGVSZWNvcmRCYXRjaChyZWNvcmRzOiBSZWNvcmRCYXRjaDxUPikge1xuICAgICAgICB0aGlzLl93cml0ZSh0aGlzLl9yZWNvcmRCYXRjaEJsb2Nrcy5sZW5ndGggPT09IDBcbiAgICAgICAgICAgID8gYCxcXG4gIFwiYmF0Y2hlc1wiOiBbXFxuICAgIGBcbiAgICAgICAgICAgIDogYCxcXG4gICAgYCk7XG4gICAgICAgIHRoaXMuX3dyaXRlKGAke3JlY29yZEJhdGNoVG9KU09OKHJlY29yZHMpfWApO1xuICAgICAgICB0aGlzLl9yZWNvcmRCYXRjaEJsb2Nrcy5wdXNoKG5ldyBGaWxlQmxvY2soMCwgMCwgMCkpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHVibGljIGNsb3NlKCkge1xuICAgICAgICBpZiAodGhpcy5fcmVjb3JkQmF0Y2hCbG9ja3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdGhpcy5fd3JpdGUoYFxcbiAgXWApO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLl9zY2hlbWEpIHtcbiAgICAgICAgICAgIHRoaXMuX3dyaXRlKGBcXG59YCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN1cGVyLmNsb3NlKCk7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4od3JpdGVyOiBSZWNvcmRCYXRjaFdyaXRlcjxUPiwgaW5wdXQ6IFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KSB7XG4gICAgbGV0IGNodW5rcyA9IGlucHV0IGFzIEl0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+PjtcbiAgICBpZiAoaW5wdXQgaW5zdGFuY2VvZiBUYWJsZSkge1xuICAgICAgICBjaHVua3MgPSBpbnB1dC5jaHVua3M7XG4gICAgICAgIHdyaXRlci5yZXNldCh1bmRlZmluZWQsIGlucHV0LnNjaGVtYSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgYmF0Y2ggb2YgY2h1bmtzKSB7XG4gICAgICAgIHdyaXRlci53cml0ZShiYXRjaCk7XG4gICAgfVxuICAgIHJldHVybiB3cml0ZXIuZmluaXNoKCk7XG59XG5cbi8qKiBAaWdub3JlICovXG5hc3luYyBmdW5jdGlvbiB3cml0ZUFsbEFzeW5jPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHdyaXRlcjogUmVjb3JkQmF0Y2hXcml0ZXI8VD4sIGJhdGNoZXM6IEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KSB7XG4gICAgZm9yIGF3YWl0IChjb25zdCBiYXRjaCBvZiBiYXRjaGVzKSB7XG4gICAgICAgIHdyaXRlci53cml0ZShiYXRjaCk7XG4gICAgfVxuICAgIHJldHVybiB3cml0ZXIuZmluaXNoKCk7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBmaWVsZFRvSlNPTih7IG5hbWUsIHR5cGUsIG51bGxhYmxlIH06IEZpZWxkKTogb2JqZWN0IHtcbiAgICBjb25zdCBhc3NlbWJsZXIgPSBuZXcgSlNPTlR5cGVBc3NlbWJsZXIoKTtcbiAgICByZXR1cm4ge1xuICAgICAgICAnbmFtZSc6IG5hbWUsICdudWxsYWJsZSc6IG51bGxhYmxlLFxuICAgICAgICAndHlwZSc6IGFzc2VtYmxlci52aXNpdCh0eXBlKSxcbiAgICAgICAgJ2NoaWxkcmVuJzogKHR5cGUuY2hpbGRyZW4gfHwgW10pLm1hcChmaWVsZFRvSlNPTiksXG4gICAgICAgICdkaWN0aW9uYXJ5JzogIURhdGFUeXBlLmlzRGljdGlvbmFyeSh0eXBlKSA/IHVuZGVmaW5lZCA6IHtcbiAgICAgICAgICAgICdpZCc6IHR5cGUuaWQsXG4gICAgICAgICAgICAnaXNPcmRlcmVkJzogdHlwZS5pc09yZGVyZWQsXG4gICAgICAgICAgICAnaW5kZXhUeXBlJzogYXNzZW1ibGVyLnZpc2l0KHR5cGUuaW5kaWNlcylcbiAgICAgICAgfVxuICAgIH07XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBkaWN0aW9uYXJ5QmF0Y2hUb0pTT04oc2NoZW1hOiBTY2hlbWEsIGRpY3Rpb25hcnk6IFZlY3RvciwgaWQ6IG51bWJlciwgaXNEZWx0YSA9IGZhbHNlKSB7XG4gICAgY29uc3QgZiA9IHNjaGVtYS5kaWN0aW9uYXJ5RmllbGRzLmdldChpZCkhWzBdO1xuICAgIGNvbnN0IGZpZWxkID0gbmV3IEZpZWxkKGYubmFtZSwgZi50eXBlLmRpY3Rpb25hcnksIGYubnVsbGFibGUsIGYubWV0YWRhdGEpO1xuICAgIGNvbnN0IGNvbHVtbnMgPSBKU09OVmVjdG9yQXNzZW1ibGVyLmFzc2VtYmxlKG5ldyBDb2x1bW4oZmllbGQsIFtkaWN0aW9uYXJ5XSkpO1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICdpZCc6IGlkLFxuICAgICAgICAnaXNEZWx0YSc6IGlzRGVsdGEsXG4gICAgICAgICdkYXRhJzoge1xuICAgICAgICAgICAgJ2NvdW50JzogZGljdGlvbmFyeS5sZW5ndGgsXG4gICAgICAgICAgICAnY29sdW1ucyc6IGNvbHVtbnNcbiAgICAgICAgfVxuICAgIH0sIG51bGwsIDIpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gcmVjb3JkQmF0Y2hUb0pTT04ocmVjb3JkczogUmVjb3JkQmF0Y2gpIHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAnY291bnQnOiByZWNvcmRzLmxlbmd0aCxcbiAgICAgICAgJ2NvbHVtbnMnOiBKU09OVmVjdG9yQXNzZW1ibGVyLmFzc2VtYmxlKHJlY29yZHMpXG4gICAgfSwgbnVsbCwgMik7XG59XG4iXX0=

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
        if (!schema || (schema !== this._schema)) {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlwYy93cml0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDZEQUE2RDtBQUM3RCwrREFBK0Q7QUFDL0Qsd0RBQXdEO0FBQ3hELDZEQUE2RDtBQUM3RCxvREFBb0Q7QUFDcEQsNkRBQTZEO0FBQzdELDZEQUE2RDtBQUM3RCxFQUFFO0FBQ0YsK0NBQStDO0FBQy9DLEVBQUU7QUFDRiw2REFBNkQ7QUFDN0QsOERBQThEO0FBQzlELHlEQUF5RDtBQUN6RCw0REFBNEQ7QUFDNUQsMERBQTBEO0FBQzFELHFCQUFxQjs7QUFFckIsb0NBQWlDO0FBQ2pDLHVDQUFrQztBQUVsQyxzQ0FBbUM7QUFDbkMsc0NBQTBDO0FBQzFDLCtDQUE0QztBQUM1QyxnREFBNkM7QUFFN0MsK0NBQStDO0FBQy9DLGtDQUErQztBQUMvQywwQ0FBb0Q7QUFDcEQsa0NBQXlEO0FBQ3pELHlDQUE0RDtBQUM1RCxnRUFBNkQ7QUFDN0Qsb0VBQWlFO0FBQ2pFLHdFQUFxRTtBQUNyRSwyQ0FBb0U7QUFDcEUsaURBQXVGO0FBQ3ZGLDJDQUF1RztBQUV2RyxNQUFhLGlCQUErRCxTQUFRLDRCQUEyQjtJQWlCM0csWUFBWSxPQUFrQztRQUMxQyxLQUFLLEVBQUUsQ0FBQztRQUlGLGNBQVMsR0FBRyxDQUFDLENBQUM7UUFDZCxhQUFRLEdBQUcsS0FBSyxDQUFDO1FBRTNCLGFBQWE7UUFDSCxVQUFLLEdBQUcsSUFBSSx1QkFBYyxFQUFFLENBQUM7UUFDN0IsWUFBTyxHQUFrQixJQUFJLENBQUM7UUFDOUIsc0JBQWlCLEdBQWdCLEVBQUUsQ0FBQztRQUNwQyx1QkFBa0IsR0FBZ0IsRUFBRSxDQUFDO1FBVjNDLElBQUksQ0FBQyxZQUFZLEdBQUcsT0FBTyxJQUFJLENBQUMsT0FBTyxPQUFPLENBQUMsV0FBVyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDM0csQ0FBQztJQWxCRCxrQkFBa0I7SUFDbEIsYUFBYTtJQUNOLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBbUU7UUFDekYsTUFBTSxJQUFJLEtBQUssQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7SUFDRCxrQkFBa0I7SUFDWCxNQUFNLENBQUMsVUFBVTtJQUNwQixhQUFhO0lBQ2IsZ0JBQTZFO0lBQzdFLGFBQWE7SUFDYixnQkFBeUQ7UUFFekQsTUFBTSxJQUFJLEtBQUssQ0FBQyxnREFBZ0QsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7SUFrQk0sUUFBUSxDQUFDLE9BQVksS0FBSztRQUM3QixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBNkIsQ0FBQztJQUNqRSxDQUFDO0lBR00sWUFBWSxDQUFDLE9BQVksS0FBSztRQUNqQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBcUMsQ0FBQztJQUM3RSxDQUFDO0lBTU0sUUFBUSxDQUFDLEtBQTZGO1FBQ3pHLElBQUksa0JBQVMsQ0FBTSxLQUFLLENBQUMsRUFBRTtZQUN2QixPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUM5QzthQUFNLElBQUksd0JBQWUsQ0FBaUIsS0FBSyxDQUFDLEVBQUU7WUFDL0MsT0FBTyxhQUFhLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ3JDO1FBQ0QsT0FBTyxRQUFRLENBQUMsSUFBSSxFQUFRLEtBQUssQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFFRCxJQUFXLE1BQU0sS0FBSyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUMxQyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsS0FBSyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3ZFLFdBQVcsQ0FBQyxPQUFrQyxJQUFJLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNGLFlBQVksQ0FBQyxPQUEwQyxJQUFJLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRXJHLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDdEMsQ0FBQztJQUNNLEtBQUssQ0FBQyxNQUFZO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNNLE1BQU07UUFDVCxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDeEUsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztJQUNNLEtBQUssQ0FBQyxPQUEyQyxJQUFJLENBQUMsS0FBSyxFQUFFLFNBQTJCLElBQUk7UUFFL0YsSUFBSSxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLFlBQVksdUJBQWMsQ0FBQyxFQUFFO1lBQzNELElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBc0IsQ0FBQztTQUN2QzthQUFNO1lBQ0gsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLHVCQUFjLEVBQUUsQ0FBQztZQUNsQyxJQUFJLElBQUksSUFBSSw0QkFBbUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDbkMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNwRDtpQkFBTSxJQUFJLElBQUksSUFBSSw2QkFBb0IsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDM0MsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUN2RDtTQUNKO1FBRUQsSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDL0IsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1NBQ3ZCO1FBRUQsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFDdEIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEVBQUUsQ0FBQztRQUM1QixJQUFJLENBQUMsa0JBQWtCLEdBQUcsRUFBRSxDQUFDO1FBRTdCLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ3RDLElBQUksTUFBTSxLQUFLLElBQUksRUFBRTtnQkFDakIsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUM7Z0JBQ25CLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO2FBQ3ZCO2lCQUFNO2dCQUNILElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO2dCQUNyQixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztnQkFDdEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUM3QjtTQUNKO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztJQUVNLEtBQUssQ0FBQyxLQUF3QztRQUNqRCxJQUFJLE1BQXdCLENBQUM7UUFDN0IsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDYixNQUFNLElBQUksS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUM7U0FDbEQ7YUFBTSxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzNDLE9BQU8sSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQztTQUNyQzthQUFNLElBQUksTUFBTSxLQUFLLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDaEMsSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUU7Z0JBQ3BDLE9BQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2FBQ3ZCO1lBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQ2xDO1FBQ0QsQ0FBQyxLQUFLLFlBQVksYUFBSyxDQUFDO1lBQ3BCLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7WUFDN0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRVMsYUFBYSxDQUEwQixPQUFtQixFQUFFLFNBQVMsR0FBRyxDQUFDO1FBRS9FLE1BQU0sQ0FBQyxHQUFHLFNBQVMsR0FBRyxDQUFDLENBQUM7UUFDeEIsTUFBTSxNQUFNLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdkMsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQztRQUN6QyxNQUFNLFdBQVcsR0FBRyxDQUFDLGNBQWMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDbEQsTUFBTSxhQUFhLEdBQUcsV0FBVyxHQUFHLGNBQWMsR0FBRyxDQUFDLENBQUM7UUFFdkQsSUFBSSxPQUFPLENBQUMsVUFBVSxLQUFLLG9CQUFhLENBQUMsV0FBVyxFQUFFO1lBQ2xELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxnQkFBUyxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1NBQ2hHO2FBQU0sSUFBSSxPQUFPLENBQUMsVUFBVSxLQUFLLG9CQUFhLENBQUMsZUFBZSxFQUFFO1lBQzdELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxnQkFBUyxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1NBQy9GO1FBRUQscURBQXFEO1FBQ3JELElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1Qyx1QkFBdUI7UUFDdkIsSUFBSSxjQUFjLEdBQUcsQ0FBQyxFQUFFO1lBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUFFO1FBQ2hELG9CQUFvQjtRQUNwQixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVTLE1BQU0sQ0FBQyxLQUEyQjtRQUN4QyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDZixNQUFNLE1BQU0sR0FBRyxxQkFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ25DLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFFO2dCQUNqQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDekIsSUFBSSxDQUFDLFNBQVMsSUFBSSxNQUFNLENBQUMsVUFBVSxDQUFDO2FBQ3ZDO1NBQ0o7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0lBRVMsWUFBWSxDQUFDLE1BQWlCO1FBQ3BDLE9BQU8sSUFBSTthQUNOLGFBQWEsQ0FBQyxpQkFBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUNuQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBRVMsWUFBWTtRQUNsQixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZO0lBQzlDLENBQUM7SUFFUyxXQUFXO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFLLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRVMsYUFBYSxDQUFDLE1BQWM7UUFDbEMsT0FBTyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUNuRSxDQUFDO0lBRVMsaUJBQWlCLENBQUMsT0FBdUI7UUFDL0MsTUFBTSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxHQUFHLGlDQUFlLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3hGLE1BQU0sV0FBVyxHQUFHLElBQUksUUFBUSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQztRQUNuRixNQUFNLE9BQU8sR0FBRyxpQkFBTyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDdEQsT0FBTyxJQUFJO2FBQ04sYUFBYSxDQUFDLE9BQU8sQ0FBQzthQUN0QixpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRVMscUJBQXFCLENBQUMsVUFBa0IsRUFBRSxFQUFVLEVBQUUsT0FBTyxHQUFHLEtBQUs7UUFDM0UsTUFBTSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxHQUFHLGlDQUFlLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzNGLE1BQU0sV0FBVyxHQUFHLElBQUksUUFBUSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQztRQUN0RixNQUFNLGVBQWUsR0FBRyxJQUFJLFFBQVEsQ0FBQyxlQUFlLENBQUMsV0FBVyxFQUFFLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUMvRSxNQUFNLE9BQU8sR0FBRyxpQkFBTyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDMUQsT0FBTyxJQUFJO2FBQ04sYUFBYSxDQUFDLE9BQU8sQ0FBQzthQUN0QixpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRVMsaUJBQWlCLENBQUMsT0FBMEI7UUFDbEQsSUFBSSxNQUF1QixDQUFDO1FBQzVCLElBQUksSUFBWSxFQUFFLE9BQWUsQ0FBQztRQUNsQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRztZQUMzQyxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ3pELElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3BCLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtvQkFDMUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztpQkFDL0I7YUFDSjtTQUNKO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztJQUVTLGtCQUFrQixDQUFDLGdCQUE0RDtRQUNyRixLQUFLLE1BQU0sQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLElBQUksZ0JBQWdCLEVBQUU7WUFDekMsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztZQUMvQyxJQUFJLENBQUMsQ0FBQyxNQUFNLFlBQVksaUJBQU8sQ0FBQyxFQUFFO2dCQUM5QixJQUFJLENBQUMscUJBQXFCLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQzthQUNqRDtpQkFBTTtnQkFDSCxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO2dCQUM3QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRztvQkFDMUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2lCQUNwRDthQUNKO1NBQ0o7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0NBQ0o7QUE1TkQsOENBNE5DO0FBRUQsY0FBYztBQUNkLE1BQWEsdUJBQXFFLFNBQVEsaUJBQW9CO0lBTzFHLGtCQUFrQjtJQUNYLE1BQU0sQ0FBQyxRQUFRLENBQThFLEtBQVUsRUFBRSxPQUErQjtRQUMzSSxPQUFPLElBQUksdUJBQXVCLENBQUksT0FBTyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ25FLENBQUM7Q0FDSjtBQVhELDBEQVdDO0FBRUQsY0FBYztBQUNkLE1BQWEscUJBQW1FLFNBQVEsaUJBQW9CO0lBWXhHO1FBQ0ksS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztJQUM3QixDQUFDO0lBUkQsa0JBQWtCO0lBQ1gsTUFBTSxDQUFDLFFBQVEsQ0FBOEUsS0FBVTtRQUMxRyxPQUFPLElBQUkscUJBQXFCLEVBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQU9TLFlBQVksQ0FBQyxNQUFpQjtRQUNwQyxPQUFPLElBQUk7YUFDTixXQUFXLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO2FBQzlCLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFFUyxZQUFZO1FBQ2xCLE1BQU0sTUFBTSxHQUFHLGFBQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxhQUFNLENBQ25DLElBQUksQ0FBQyxPQUFRLEVBQUUsc0JBQWUsQ0FBQyxFQUFFLEVBQ2pDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQ2xELENBQUMsQ0FBQztRQUNILE9BQU8sSUFBSTthQUNOLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyx1QkFBdUI7YUFDdEMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsOEJBQThCO2FBQ3ZFLFdBQVcsRUFBRSxDQUFDLENBQUMsd0JBQXdCO0lBQ2hELENBQUM7Q0FDSjtBQWpDRCxzREFpQ0M7QUFFRCxjQUFjO0FBQ2QsTUFBYSxxQkFBbUUsU0FBUSxpQkFBb0I7SUFZeEc7UUFDSSxLQUFLLEVBQUUsQ0FBQztRQUNSLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO0lBQzdCLENBQUM7SUFSRCxrQkFBa0I7SUFDWCxNQUFNLENBQUMsUUFBUSxDQUE4RSxLQUFVO1FBQzFHLE9BQU8sSUFBSSxxQkFBcUIsRUFBSyxDQUFDLFFBQVEsQ0FBQyxLQUFZLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBT1MsYUFBYSxLQUFLLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNoQyxZQUFZLENBQUMsTUFBaUI7UUFDcEMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLGtCQUNmLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUN0RSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBQ1Msa0JBQWtCLENBQUMsZ0JBQTREO1FBQ3JGLElBQUksQ0FBQyxNQUFNLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUN4QyxLQUFLLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUMzQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUNTLHFCQUFxQixDQUFDLFVBQWtCLEVBQUUsRUFBVSxFQUFFLE9BQU8sR0FBRyxLQUFLO1FBQzNFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdEUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLHFCQUFxQixDQUFDLElBQUksQ0FBQyxPQUFRLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDaEYsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLGdCQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BELE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7SUFDUyxpQkFBaUIsQ0FBQyxPQUF1QjtRQUMvQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUM1QyxDQUFDLENBQUMseUJBQXlCO1lBQzNCLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNqQixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsaUJBQWlCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxnQkFBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyRCxPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0lBQ00sS0FBSztRQUNSLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDcEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUN4QjtRQUNELElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNkLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDdEI7UUFDRCxPQUFPLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN6QixDQUFDO0NBQ0o7QUFuREQsc0RBbURDO0FBRUQsY0FBYztBQUNkLFNBQVMsUUFBUSxDQUE4QyxNQUE0QixFQUFFLEtBQTBDO0lBQ25JLE1BQU0sTUFBTSxHQUFHLENBQUMsS0FBSyxZQUFZLGFBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDL0QsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUU7UUFDeEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUN2QjtJQUNELE9BQU8sTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQzNCLENBQUM7QUFFRCxjQUFjO0FBQ2QsS0FBSyxVQUFVLGFBQWEsQ0FBOEMsTUFBNEIsRUFBRSxPQUFzQztJQUMxSSxJQUFJLEtBQUssRUFBRSxNQUFNLEtBQUssSUFBSSxPQUFPLEVBQUU7UUFDL0IsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUN2QjtJQUNELE9BQU8sTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQzNCLENBQUM7QUFFRCxjQUFjO0FBQ2QsU0FBUyxXQUFXLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBUztJQUNoRCxNQUFNLFNBQVMsR0FBRyxJQUFJLHFDQUFpQixFQUFFLENBQUM7SUFDMUMsT0FBTztRQUNILE1BQU0sRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLFFBQVE7UUFDbEMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQzdCLFVBQVUsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQztRQUNsRCxZQUFZLEVBQUUsQ0FBQyxlQUFRLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ3JELElBQUksRUFBRSxJQUFJLENBQUMsRUFBRTtZQUNiLFdBQVcsRUFBRSxJQUFJLENBQUMsU0FBUztZQUMzQixXQUFXLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1NBQzdDO0tBQ0osQ0FBQztBQUNOLENBQUM7QUFFRCxjQUFjO0FBQ2QsU0FBUyxxQkFBcUIsQ0FBQyxNQUFjLEVBQUUsVUFBa0IsRUFBRSxFQUFVLEVBQUUsT0FBTyxHQUFHLEtBQUs7SUFDMUYsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM5QyxNQUFNLEtBQUssR0FBRyxJQUFJLGNBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzNFLE1BQU0sT0FBTyxHQUFHLHlDQUFtQixDQUFDLFFBQVEsQ0FBQyxJQUFJLGVBQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDOUUsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO1FBQ2xCLElBQUksRUFBRSxFQUFFO1FBQ1IsU0FBUyxFQUFFLE9BQU87UUFDbEIsTUFBTSxFQUFFO1lBQ0osT0FBTyxFQUFFLFVBQVUsQ0FBQyxNQUFNO1lBQzFCLFNBQVMsRUFBRSxPQUFPO1NBQ3JCO0tBQ0osRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDaEIsQ0FBQztBQUVELGNBQWM7QUFDZCxTQUFTLGlCQUFpQixDQUFDLE9BQW9CO0lBQzNDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUNsQixPQUFPLEVBQUUsT0FBTyxDQUFDLE1BQU07UUFDdkIsU0FBUyxFQUFFLHlDQUFtQixDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7S0FDbkQsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDaEIsQ0FBQyIsImZpbGUiOiJpcGMvd3JpdGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IFRhYmxlIH0gZnJvbSAnLi4vdGFibGUnO1xuaW1wb3J0IHsgTUFHSUMgfSBmcm9tICcuL21lc3NhZ2UnO1xuaW1wb3J0IHsgVmVjdG9yIH0gZnJvbSAnLi4vdmVjdG9yJztcbmltcG9ydCB7IENvbHVtbiB9IGZyb20gJy4uL2NvbHVtbic7XG5pbXBvcnQgeyBTY2hlbWEsIEZpZWxkIH0gZnJvbSAnLi4vc2NoZW1hJztcbmltcG9ydCB7IENodW5rZWQgfSBmcm9tICcuLi92ZWN0b3IvY2h1bmtlZCc7XG5pbXBvcnQgeyBNZXNzYWdlIH0gZnJvbSAnLi9tZXRhZGF0YS9tZXNzYWdlJztcbmltcG9ydCB7IFJlY29yZEJhdGNoIH0gZnJvbSAnLi4vcmVjb3JkYmF0Y2gnO1xuaW1wb3J0ICogYXMgbWV0YWRhdGEgZnJvbSAnLi9tZXRhZGF0YS9tZXNzYWdlJztcbmltcG9ydCB7IERhdGFUeXBlLCBEaWN0aW9uYXJ5IH0gZnJvbSAnLi4vdHlwZSc7XG5pbXBvcnQgeyBGaWxlQmxvY2ssIEZvb3RlciB9IGZyb20gJy4vbWV0YWRhdGEvZmlsZSc7XG5pbXBvcnQgeyBNZXNzYWdlSGVhZGVyLCBNZXRhZGF0YVZlcnNpb24gfSBmcm9tICcuLi9lbnVtJztcbmltcG9ydCB7IFdyaXRhYmxlU2luaywgQXN5bmNCeXRlUXVldWUgfSBmcm9tICcuLi9pby9zdHJlYW0nO1xuaW1wb3J0IHsgVmVjdG9yQXNzZW1ibGVyIH0gZnJvbSAnLi4vdmlzaXRvci92ZWN0b3Jhc3NlbWJsZXInO1xuaW1wb3J0IHsgSlNPTlR5cGVBc3NlbWJsZXIgfSBmcm9tICcuLi92aXNpdG9yL2pzb250eXBlYXNzZW1ibGVyJztcbmltcG9ydCB7IEpTT05WZWN0b3JBc3NlbWJsZXIgfSBmcm9tICcuLi92aXNpdG9yL2pzb252ZWN0b3Jhc3NlbWJsZXInO1xuaW1wb3J0IHsgQXJyYXlCdWZmZXJWaWV3SW5wdXQsIHRvVWludDhBcnJheSB9IGZyb20gJy4uL3V0aWwvYnVmZmVyJztcbmltcG9ydCB7IFdyaXRhYmxlLCBSZWFkYWJsZUludGVyb3AsIFJlYWRhYmxlRE9NU3RyZWFtT3B0aW9ucyB9IGZyb20gJy4uL2lvL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgaXNQcm9taXNlLCBpc0FzeW5jSXRlcmFibGUsIGlzV3JpdGFibGVET01TdHJlYW0sIGlzV3JpdGFibGVOb2RlU3RyZWFtIH0gZnJvbSAnLi4vdXRpbC9jb21wYXQnO1xuXG5leHBvcnQgY2xhc3MgUmVjb3JkQmF0Y2hXcml0ZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWFkYWJsZUludGVyb3A8VWludDhBcnJheT4gaW1wbGVtZW50cyBXcml0YWJsZTxSZWNvcmRCYXRjaDxUPj4ge1xuXG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyBzdGF0aWMgdGhyb3VnaE5vZGUob3B0aW9ucz86IGltcG9ydCgnc3RyZWFtJykuRHVwbGV4T3B0aW9ucyAmIHsgYXV0b0Rlc3Ryb3k6IGJvb2xlYW4gfSk6IGltcG9ydCgnc3RyZWFtJykuRHVwbGV4IHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBcInRocm91Z2hOb2RlXCIgbm90IGF2YWlsYWJsZSBpbiB0aGlzIGVudmlyb25tZW50YCk7XG4gICAgfVxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgdGhyb3VnaERPTTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9PihcbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICB3cml0YWJsZVN0cmF0ZWd5PzogUXVldWluZ1N0cmF0ZWd5PFJlY29yZEJhdGNoPFQ+PiAmIHsgYXV0b0Rlc3Ryb3k6IGJvb2xlYW4gfSxcbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICByZWFkYWJsZVN0cmF0ZWd5PzogeyBoaWdoV2F0ZXJNYXJrPzogbnVtYmVyLCBzaXplPzogYW55IH1cbiAgICApOiB7IHdyaXRhYmxlOiBXcml0YWJsZVN0cmVhbTxUYWJsZTxUPiB8IFJlY29yZEJhdGNoPFQ+PiwgcmVhZGFibGU6IFJlYWRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+IH0ge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFwidGhyb3VnaERPTVwiIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBlbnZpcm9ubWVudGApO1xuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiB7IGF1dG9EZXN0cm95OiBib29sZWFuIH0pIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5fYXV0b0Rlc3Ryb3kgPSBvcHRpb25zICYmICh0eXBlb2Ygb3B0aW9ucy5hdXRvRGVzdHJveSA9PT0gJ2Jvb2xlYW4nKSA/IG9wdGlvbnMuYXV0b0Rlc3Ryb3kgOiB0cnVlO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfcG9zaXRpb24gPSAwO1xuICAgIHByb3RlY3RlZCBfc3RhcnRlZCA9IGZhbHNlO1xuICAgIHByb3RlY3RlZCBfYXV0b0Rlc3Ryb3k6IGJvb2xlYW47XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHByb3RlY3RlZCBfc2luayA9IG5ldyBBc3luY0J5dGVRdWV1ZSgpO1xuICAgIHByb3RlY3RlZCBfc2NoZW1hOiBTY2hlbWEgfCBudWxsID0gbnVsbDtcbiAgICBwcm90ZWN0ZWQgX2RpY3Rpb25hcnlCbG9ja3M6IEZpbGVCbG9ja1tdID0gW107XG4gICAgcHJvdGVjdGVkIF9yZWNvcmRCYXRjaEJsb2NrczogRmlsZUJsb2NrW10gPSBbXTtcblxuICAgIHB1YmxpYyB0b1N0cmluZyhzeW5jOiB0cnVlKTogc3RyaW5nO1xuICAgIHB1YmxpYyB0b1N0cmluZyhzeW5jPzogZmFsc2UpOiBQcm9taXNlPHN0cmluZz47XG4gICAgcHVibGljIHRvU3RyaW5nKHN5bmM6IGFueSA9IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zaW5rLnRvU3RyaW5nKHN5bmMpIGFzIFByb21pc2U8c3RyaW5nPiB8IHN0cmluZztcbiAgICB9XG4gICAgcHVibGljIHRvVWludDhBcnJheShzeW5jOiB0cnVlKTogVWludDhBcnJheTtcbiAgICBwdWJsaWMgdG9VaW50OEFycmF5KHN5bmM/OiBmYWxzZSk6IFByb21pc2U8VWludDhBcnJheT47XG4gICAgcHVibGljIHRvVWludDhBcnJheShzeW5jOiBhbnkgPSBmYWxzZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2luay50b1VpbnQ4QXJyYXkoc3luYykgYXMgUHJvbWlzZTxVaW50OEFycmF5PiB8IFVpbnQ4QXJyYXk7XG4gICAgfVxuXG4gICAgcHVibGljIHdyaXRlQWxsKGlucHV0OiBUYWJsZTxUPiB8IEl0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pik6IHRoaXM7XG4gICAgcHVibGljIHdyaXRlQWxsKGlucHV0OiBBc3luY0l0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pik6IFByb21pc2U8dGhpcz47XG4gICAgcHVibGljIHdyaXRlQWxsKGlucHV0OiBQcm9taXNlTGlrZTxBc3luY0l0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pj4pOiBQcm9taXNlPHRoaXM+O1xuICAgIHB1YmxpYyB3cml0ZUFsbChpbnB1dDogUHJvbWlzZUxpa2U8VGFibGU8VD4gfCBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4+KTogUHJvbWlzZTx0aGlzPjtcbiAgICBwdWJsaWMgd3JpdGVBbGwoaW5wdXQ6IFByb21pc2VMaWtlPGFueT4gfCBUYWJsZTxUPiB8IEl0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+PiB8IEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KSB7XG4gICAgICAgIGlmIChpc1Byb21pc2U8YW55PihpbnB1dCkpIHtcbiAgICAgICAgICAgIHJldHVybiBpbnB1dC50aGVuKCh4KSA9PiB0aGlzLndyaXRlQWxsKHgpKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0FzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KGlucHV0KSkge1xuICAgICAgICAgICAgcmV0dXJuIHdyaXRlQWxsQXN5bmModGhpcywgaW5wdXQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB3cml0ZUFsbCh0aGlzLCA8YW55PiBpbnB1dCk7XG4gICAgfVxuXG4gICAgcHVibGljIGdldCBjbG9zZWQoKSB7IHJldHVybiB0aGlzLl9zaW5rLmNsb3NlZDsgfVxuICAgIHB1YmxpYyBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCkgeyByZXR1cm4gdGhpcy5fc2lua1tTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTsgfVxuICAgIHB1YmxpYyB0b0RPTVN0cmVhbShvcHRpb25zPzogUmVhZGFibGVET01TdHJlYW1PcHRpb25zKSB7IHJldHVybiB0aGlzLl9zaW5rLnRvRE9NU3RyZWFtKG9wdGlvbnMpOyB9XG4gICAgcHVibGljIHRvTm9kZVN0cmVhbShvcHRpb25zPzogaW1wb3J0KCdzdHJlYW0nKS5SZWFkYWJsZU9wdGlvbnMpIHsgcmV0dXJuIHRoaXMuX3NpbmsudG9Ob2RlU3RyZWFtKG9wdGlvbnMpOyB9XG5cbiAgICBwdWJsaWMgY2xvc2UoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlc2V0KCkuX3NpbmsuY2xvc2UoKTtcbiAgICB9XG4gICAgcHVibGljIGFib3J0KHJlYXNvbj86IGFueSkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZXNldCgpLl9zaW5rLmFib3J0KHJlYXNvbik7XG4gICAgfVxuICAgIHB1YmxpYyBmaW5pc2goKSB7XG4gICAgICAgIHRoaXMuX2F1dG9EZXN0cm95ID8gdGhpcy5jbG9zZSgpIDogdGhpcy5yZXNldCh0aGlzLl9zaW5rLCB0aGlzLl9zY2hlbWEpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHVibGljIHJlc2V0KHNpbms6IFdyaXRhYmxlU2luazxBcnJheUJ1ZmZlclZpZXdJbnB1dD4gPSB0aGlzLl9zaW5rLCBzY2hlbWE6IFNjaGVtYTxUPiB8IG51bGwgPSBudWxsKSB7XG5cbiAgICAgICAgaWYgKChzaW5rID09PSB0aGlzLl9zaW5rKSB8fCAoc2luayBpbnN0YW5jZW9mIEFzeW5jQnl0ZVF1ZXVlKSkge1xuICAgICAgICAgICAgdGhpcy5fc2luayA9IHNpbmsgYXMgQXN5bmNCeXRlUXVldWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zaW5rID0gbmV3IEFzeW5jQnl0ZVF1ZXVlKCk7XG4gICAgICAgICAgICBpZiAoc2luayAmJiBpc1dyaXRhYmxlRE9NU3RyZWFtKHNpbmspKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50b0RPTVN0cmVhbSh7IHR5cGU6ICdieXRlcycgfSkucGlwZVRvKHNpbmspO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzaW5rICYmIGlzV3JpdGFibGVOb2RlU3RyZWFtKHNpbmspKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50b05vZGVTdHJlYW0oeyBvYmplY3RNb2RlOiBmYWxzZSB9KS5waXBlKHNpbmspO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX3N0YXJ0ZWQgJiYgdGhpcy5fc2NoZW1hKSB7XG4gICAgICAgICAgICB0aGlzLl93cml0ZUZvb3RlcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fc3RhcnRlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9kaWN0aW9uYXJ5QmxvY2tzID0gW107XG4gICAgICAgIHRoaXMuX3JlY29yZEJhdGNoQmxvY2tzID0gW107XG5cbiAgICAgICAgaWYgKCFzY2hlbWEgfHwgKHNjaGVtYSAhPT0gdGhpcy5fc2NoZW1hKSkge1xuICAgICAgICAgICAgaWYgKHNjaGVtYSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3Bvc2l0aW9uID0gMDtcbiAgICAgICAgICAgICAgICB0aGlzLl9zY2hlbWEgPSBudWxsO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLl9zY2hlbWEgPSBzY2hlbWE7XG4gICAgICAgICAgICAgICAgdGhpcy5fd3JpdGVTY2hlbWEoc2NoZW1hKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHB1YmxpYyB3cml0ZShjaHVuaz86IFRhYmxlPFQ+IHwgUmVjb3JkQmF0Y2g8VD4gfCBudWxsKSB7XG4gICAgICAgIGxldCBzY2hlbWE6IFNjaGVtYTxUPiB8IG51bGw7XG4gICAgICAgIGlmICghdGhpcy5fc2luaykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZWNvcmRCYXRjaFdyaXRlciBpcyBjbG9zZWRgKTtcbiAgICAgICAgfSBlbHNlIGlmICghY2h1bmsgfHwgIShzY2hlbWEgPSBjaHVuay5zY2hlbWEpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5maW5pc2goKSAmJiB1bmRlZmluZWQ7XG4gICAgICAgIH0gZWxzZSBpZiAoc2NoZW1hICE9PSB0aGlzLl9zY2hlbWEpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9zdGFydGVkICYmIHRoaXMuX2F1dG9EZXN0cm95KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMucmVzZXQodGhpcy5fc2luaywgc2NoZW1hKTtcbiAgICAgICAgfVxuICAgICAgICAoY2h1bmsgaW5zdGFuY2VvZiBUYWJsZSlcbiAgICAgICAgICAgID8gdGhpcy53cml0ZUFsbChjaHVuay5jaHVua3MpXG4gICAgICAgICAgICA6IHRoaXMuX3dyaXRlUmVjb3JkQmF0Y2goY2h1bmspO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGVNZXNzYWdlPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyPihtZXNzYWdlOiBNZXNzYWdlPFQ+LCBhbGlnbm1lbnQgPSA4KSB7XG5cbiAgICAgICAgY29uc3QgYSA9IGFsaWdubWVudCAtIDE7XG4gICAgICAgIGNvbnN0IGJ1ZmZlciA9IE1lc3NhZ2UuZW5jb2RlKG1lc3NhZ2UpO1xuICAgICAgICBjb25zdCBmbGF0YnVmZmVyU2l6ZSA9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICBjb25zdCBhbGlnbmVkU2l6ZSA9IChmbGF0YnVmZmVyU2l6ZSArIDQgKyBhKSAmIH5hO1xuICAgICAgICBjb25zdCBuUGFkZGluZ0J5dGVzID0gYWxpZ25lZFNpemUgLSBmbGF0YnVmZmVyU2l6ZSAtIDQ7XG5cbiAgICAgICAgaWYgKG1lc3NhZ2UuaGVhZGVyVHlwZSA9PT0gTWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaCkge1xuICAgICAgICAgICAgdGhpcy5fcmVjb3JkQmF0Y2hCbG9ja3MucHVzaChuZXcgRmlsZUJsb2NrKGFsaWduZWRTaXplLCBtZXNzYWdlLmJvZHlMZW5ndGgsIHRoaXMuX3Bvc2l0aW9uKSk7XG4gICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5oZWFkZXJUeXBlID09PSBNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaCkge1xuICAgICAgICAgICAgdGhpcy5fZGljdGlvbmFyeUJsb2Nrcy5wdXNoKG5ldyBGaWxlQmxvY2soYWxpZ25lZFNpemUsIG1lc3NhZ2UuYm9keUxlbmd0aCwgdGhpcy5fcG9zaXRpb24pKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFdyaXRlIHRoZSBmbGF0YnVmZmVyIHNpemUgcHJlZml4IGluY2x1ZGluZyBwYWRkaW5nXG4gICAgICAgIHRoaXMuX3dyaXRlKEludDMyQXJyYXkub2YoYWxpZ25lZFNpemUgLSA0KSk7XG4gICAgICAgIC8vIFdyaXRlIHRoZSBmbGF0YnVmZmVyXG4gICAgICAgIGlmIChmbGF0YnVmZmVyU2l6ZSA+IDApIHsgdGhpcy5fd3JpdGUoYnVmZmVyKTsgfVxuICAgICAgICAvLyBXcml0ZSBhbnkgcGFkZGluZ1xuICAgICAgICByZXR1cm4gdGhpcy5fd3JpdGVQYWRkaW5nKG5QYWRkaW5nQnl0ZXMpO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGUoY2h1bms6IEFycmF5QnVmZmVyVmlld0lucHV0KSB7XG4gICAgICAgIGlmICh0aGlzLl9zdGFydGVkKSB7XG4gICAgICAgICAgICBjb25zdCBidWZmZXIgPSB0b1VpbnQ4QXJyYXkoY2h1bmspO1xuICAgICAgICAgICAgaWYgKGJ1ZmZlciAmJiBidWZmZXIuYnl0ZUxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zaW5rLndyaXRlKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgdGhpcy5fcG9zaXRpb24gKz0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZVNjaGVtYShzY2hlbWE6IFNjaGVtYTxUPikge1xuICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgICAgICAgLl93cml0ZU1lc3NhZ2UoTWVzc2FnZS5mcm9tKHNjaGVtYSkpXG4gICAgICAgICAgICAuX3dyaXRlRGljdGlvbmFyaWVzKHNjaGVtYS5kaWN0aW9uYXJ5RmllbGRzKTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlRm9vdGVyKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fd3JpdGVQYWRkaW5nKDQpOyAvLyBlb3MgYnl0ZXNcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlTWFnaWMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl93cml0ZShNQUdJQyk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZVBhZGRpbmcobkJ5dGVzOiBudW1iZXIpIHtcbiAgICAgICAgcmV0dXJuIG5CeXRlcyA+IDAgPyB0aGlzLl93cml0ZShuZXcgVWludDhBcnJheShuQnl0ZXMpKSA6IHRoaXM7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZVJlY29yZEJhdGNoKHJlY29yZHM6IFJlY29yZEJhdGNoPFQ+KSB7XG4gICAgICAgIGNvbnN0IHsgYnl0ZUxlbmd0aCwgbm9kZXMsIGJ1ZmZlclJlZ2lvbnMsIGJ1ZmZlcnMgfSA9IFZlY3RvckFzc2VtYmxlci5hc3NlbWJsZShyZWNvcmRzKTtcbiAgICAgICAgY29uc3QgcmVjb3JkQmF0Y2ggPSBuZXcgbWV0YWRhdGEuUmVjb3JkQmF0Y2gocmVjb3Jkcy5sZW5ndGgsIG5vZGVzLCBidWZmZXJSZWdpb25zKTtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IE1lc3NhZ2UuZnJvbShyZWNvcmRCYXRjaCwgYnl0ZUxlbmd0aCk7XG4gICAgICAgIHJldHVybiB0aGlzXG4gICAgICAgICAgICAuX3dyaXRlTWVzc2FnZShtZXNzYWdlKVxuICAgICAgICAgICAgLl93cml0ZUJvZHlCdWZmZXJzKGJ1ZmZlcnMpO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGVEaWN0aW9uYXJ5QmF0Y2goZGljdGlvbmFyeTogVmVjdG9yLCBpZDogbnVtYmVyLCBpc0RlbHRhID0gZmFsc2UpIHtcbiAgICAgICAgY29uc3QgeyBieXRlTGVuZ3RoLCBub2RlcywgYnVmZmVyUmVnaW9ucywgYnVmZmVycyB9ID0gVmVjdG9yQXNzZW1ibGVyLmFzc2VtYmxlKGRpY3Rpb25hcnkpO1xuICAgICAgICBjb25zdCByZWNvcmRCYXRjaCA9IG5ldyBtZXRhZGF0YS5SZWNvcmRCYXRjaChkaWN0aW9uYXJ5Lmxlbmd0aCwgbm9kZXMsIGJ1ZmZlclJlZ2lvbnMpO1xuICAgICAgICBjb25zdCBkaWN0aW9uYXJ5QmF0Y2ggPSBuZXcgbWV0YWRhdGEuRGljdGlvbmFyeUJhdGNoKHJlY29yZEJhdGNoLCBpZCwgaXNEZWx0YSk7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBNZXNzYWdlLmZyb20oZGljdGlvbmFyeUJhdGNoLCBieXRlTGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICAgICAgICAgIC5fd3JpdGVNZXNzYWdlKG1lc3NhZ2UpXG4gICAgICAgICAgICAuX3dyaXRlQm9keUJ1ZmZlcnMoYnVmZmVycyk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZUJvZHlCdWZmZXJzKGJ1ZmZlcnM6IEFycmF5QnVmZmVyVmlld1tdKSB7XG4gICAgICAgIGxldCBidWZmZXI6IEFycmF5QnVmZmVyVmlldztcbiAgICAgICAgbGV0IHNpemU6IG51bWJlciwgcGFkZGluZzogbnVtYmVyO1xuICAgICAgICBmb3IgKGxldCBpID0gLTEsIG4gPSBidWZmZXJzLmxlbmd0aDsgKytpIDwgbjspIHtcbiAgICAgICAgICAgIGlmICgoYnVmZmVyID0gYnVmZmVyc1tpXSkgJiYgKHNpemUgPSBidWZmZXIuYnl0ZUxlbmd0aCkgPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fd3JpdGUoYnVmZmVyKTtcbiAgICAgICAgICAgICAgICBpZiAoKHBhZGRpbmcgPSAoKHNpemUgKyA3KSAmIH43KSAtIHNpemUpID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl93cml0ZVBhZGRpbmcocGFkZGluZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGVEaWN0aW9uYXJpZXMoZGljdGlvbmFyeUZpZWxkczogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeTxhbnksIGFueT4+W10+KSB7XG4gICAgICAgIGZvciAoY29uc3QgW2lkLCBmaWVsZHNdIG9mIGRpY3Rpb25hcnlGaWVsZHMpIHtcbiAgICAgICAgICAgIGNvbnN0IHZlY3RvciA9IGZpZWxkc1swXS50eXBlLmRpY3Rpb25hcnlWZWN0b3I7XG4gICAgICAgICAgICBpZiAoISh2ZWN0b3IgaW5zdGFuY2VvZiBDaHVua2VkKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3dyaXRlRGljdGlvbmFyeUJhdGNoKHZlY3RvciwgaWQsIGZhbHNlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2h1bmtzID0gdmVjdG9yLmNodW5rcztcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gLTEsIG4gPSBjaHVua3MubGVuZ3RoOyArK2kgPCBuOykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl93cml0ZURpY3Rpb25hcnlCYXRjaChjaHVua3NbaV0sIGlkLCBpID4gMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjbGFzcyBSZWNvcmRCYXRjaFN0cmVhbVdyaXRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoV3JpdGVyPFQ+IHtcblxuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogVGFibGU8VD4gfCBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4sIG9wdGlvbnM/OiB7IGF1dG9EZXN0cm95OiB0cnVlIH0pOiBSZWNvcmRCYXRjaFN0cmVhbVdyaXRlcjxUPjtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih0aGlzOiB0eXBlb2YgUmVjb3JkQmF0Y2hXcml0ZXIsIGlucHV0OiBBc3luY0l0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Piwgb3B0aW9ucz86IHsgYXV0b0Rlc3Ryb3k6IHRydWUgfSk6IFByb21pc2U8UmVjb3JkQmF0Y2hTdHJlYW1Xcml0ZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgd3JpdGVBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBpbnB1dDogUHJvbWlzZUxpa2U8QXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4+LCBvcHRpb25zPzogeyBhdXRvRGVzdHJveTogdHJ1ZSB9KTogUHJvbWlzZTxSZWNvcmRCYXRjaFN0cmVhbVdyaXRlcjxUPj47XG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih0aGlzOiB0eXBlb2YgUmVjb3JkQmF0Y2hXcml0ZXIsIGlucHV0OiBQcm9taXNlTGlrZTxUYWJsZTxUPiB8IEl0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pj4sIG9wdGlvbnM/OiB7IGF1dG9EZXN0cm95OiB0cnVlIH0pOiBQcm9taXNlPFJlY29yZEJhdGNoU3RyZWFtV3JpdGVyPFQ+PjtcbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IGFueSwgb3B0aW9ucz86IHsgYXV0b0Rlc3Ryb3k6IHRydWUgfSkge1xuICAgICAgICByZXR1cm4gbmV3IFJlY29yZEJhdGNoU3RyZWFtV3JpdGVyPFQ+KG9wdGlvbnMpLndyaXRlQWxsKGlucHV0KTtcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY2xhc3MgUmVjb3JkQmF0Y2hGaWxlV3JpdGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hXcml0ZXI8VD4ge1xuXG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih0aGlzOiB0eXBlb2YgUmVjb3JkQmF0Y2hXcml0ZXIsIGlucHV0OiBUYWJsZTxUPiB8IEl0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pik6IFJlY29yZEJhdGNoRmlsZVdyaXRlcjxUPjtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih0aGlzOiB0eXBlb2YgUmVjb3JkQmF0Y2hXcml0ZXIsIGlucHV0OiBBc3luY0l0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pik6IFByb21pc2U8UmVjb3JkQmF0Y2hGaWxlV3JpdGVyPFQ+PjtcbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IFByb21pc2VMaWtlPEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+Pik6IFByb21pc2U8UmVjb3JkQmF0Y2hGaWxlV3JpdGVyPFQ+PjtcbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IFByb21pc2VMaWtlPFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+Pik6IFByb21pc2U8UmVjb3JkQmF0Y2hGaWxlV3JpdGVyPFQ+PjtcbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IGFueSkge1xuICAgICAgICByZXR1cm4gbmV3IFJlY29yZEJhdGNoRmlsZVdyaXRlcjxUPigpLndyaXRlQWxsKGlucHV0KTtcbiAgICB9XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5fYXV0b0Rlc3Ryb3kgPSB0cnVlO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGVTY2hlbWEoc2NoZW1hOiBTY2hlbWE8VD4pIHtcbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICAgICAgICAgIC5fd3JpdGVNYWdpYygpLl93cml0ZVBhZGRpbmcoMilcbiAgICAgICAgICAgIC5fd3JpdGVEaWN0aW9uYXJpZXMoc2NoZW1hLmRpY3Rpb25hcnlGaWVsZHMpO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGVGb290ZXIoKSB7XG4gICAgICAgIGNvbnN0IGJ1ZmZlciA9IEZvb3Rlci5lbmNvZGUobmV3IEZvb3RlcihcbiAgICAgICAgICAgIHRoaXMuX3NjaGVtYSEsIE1ldGFkYXRhVmVyc2lvbi5WNCxcbiAgICAgICAgICAgIHRoaXMuX3JlY29yZEJhdGNoQmxvY2tzLCB0aGlzLl9kaWN0aW9uYXJ5QmxvY2tzXG4gICAgICAgICkpO1xuICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgICAgICAgLl93cml0ZShidWZmZXIpIC8vIFdyaXRlIHRoZSBmbGF0YnVmZmVyXG4gICAgICAgICAgICAuX3dyaXRlKEludDMyQXJyYXkub2YoYnVmZmVyLmJ5dGVMZW5ndGgpKSAvLyB0aGVuIHRoZSBmb290ZXIgc2l6ZSBzdWZmaXhcbiAgICAgICAgICAgIC5fd3JpdGVNYWdpYygpOyAvLyB0aGVuIHRoZSBtYWdpYyBzdWZmaXhcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY2xhc3MgUmVjb3JkQmF0Y2hKU09OV3JpdGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hXcml0ZXI8VD4ge1xuXG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih0aGlzOiB0eXBlb2YgUmVjb3JkQmF0Y2hXcml0ZXIsIGlucHV0OiBUYWJsZTxUPiB8IEl0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pik6IFJlY29yZEJhdGNoSlNPTldyaXRlcjxUPjtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih0aGlzOiB0eXBlb2YgUmVjb3JkQmF0Y2hXcml0ZXIsIGlucHV0OiBBc3luY0l0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pik6IFByb21pc2U8UmVjb3JkQmF0Y2hKU09OV3JpdGVyPFQ+PjtcbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IFByb21pc2VMaWtlPEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+Pik6IFByb21pc2U8UmVjb3JkQmF0Y2hKU09OV3JpdGVyPFQ+PjtcbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IFByb21pc2VMaWtlPFRhYmxlPFQ+IHwgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+Pik6IFByb21pc2U8UmVjb3JkQmF0Y2hKU09OV3JpdGVyPFQ+PjtcbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlciwgaW5wdXQ6IGFueSkge1xuICAgICAgICByZXR1cm4gbmV3IFJlY29yZEJhdGNoSlNPTldyaXRlcjxUPigpLndyaXRlQWxsKGlucHV0IGFzIGFueSk7XG4gICAgfVxuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuX2F1dG9EZXN0cm95ID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlTWVzc2FnZSgpIHsgcmV0dXJuIHRoaXM7IH1cbiAgICBwcm90ZWN0ZWQgX3dyaXRlU2NoZW1hKHNjaGVtYTogU2NoZW1hPFQ+KSB7XG4gICAgICAgIHJldHVybiB0aGlzLl93cml0ZShge1xcbiAgXCJzY2hlbWFcIjogJHtcbiAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHsgZmllbGRzOiBzY2hlbWEuZmllbGRzLm1hcChmaWVsZFRvSlNPTikgfSwgbnVsbCwgMilcbiAgICAgICAgfWApLl93cml0ZURpY3Rpb25hcmllcyhzY2hlbWEuZGljdGlvbmFyeUZpZWxkcyk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBfd3JpdGVEaWN0aW9uYXJpZXMoZGljdGlvbmFyeUZpZWxkczogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeTxhbnksIGFueT4+W10+KSB7XG4gICAgICAgIHRoaXMuX3dyaXRlKGAsXFxuICBcImRpY3Rpb25hcmllc1wiOiBbXFxuYCk7XG4gICAgICAgIHN1cGVyLl93cml0ZURpY3Rpb25hcmllcyhkaWN0aW9uYXJ5RmllbGRzKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3dyaXRlKGBcXG4gIF1gKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIF93cml0ZURpY3Rpb25hcnlCYXRjaChkaWN0aW9uYXJ5OiBWZWN0b3IsIGlkOiBudW1iZXIsIGlzRGVsdGEgPSBmYWxzZSkge1xuICAgICAgICB0aGlzLl93cml0ZSh0aGlzLl9kaWN0aW9uYXJ5QmxvY2tzLmxlbmd0aCA9PT0gMCA/IGAgICAgYCA6IGAsXFxuICAgIGApO1xuICAgICAgICB0aGlzLl93cml0ZShgJHtkaWN0aW9uYXJ5QmF0Y2hUb0pTT04odGhpcy5fc2NoZW1hISwgZGljdGlvbmFyeSwgaWQsIGlzRGVsdGEpfWApO1xuICAgICAgICB0aGlzLl9kaWN0aW9uYXJ5QmxvY2tzLnB1c2gobmV3IEZpbGVCbG9jaygwLCAwLCAwKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgX3dyaXRlUmVjb3JkQmF0Y2gocmVjb3JkczogUmVjb3JkQmF0Y2g8VD4pIHtcbiAgICAgICAgdGhpcy5fd3JpdGUodGhpcy5fcmVjb3JkQmF0Y2hCbG9ja3MubGVuZ3RoID09PSAwXG4gICAgICAgICAgICA/IGAsXFxuICBcImJhdGNoZXNcIjogW1xcbiAgICBgXG4gICAgICAgICAgICA6IGAsXFxuICAgIGApO1xuICAgICAgICB0aGlzLl93cml0ZShgJHtyZWNvcmRCYXRjaFRvSlNPTihyZWNvcmRzKX1gKTtcbiAgICAgICAgdGhpcy5fcmVjb3JkQmF0Y2hCbG9ja3MucHVzaChuZXcgRmlsZUJsb2NrKDAsIDAsIDApKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHB1YmxpYyBjbG9zZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuX3JlY29yZEJhdGNoQmxvY2tzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMuX3dyaXRlKGBcXG4gIF1gKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5fc2NoZW1hKSB7XG4gICAgICAgICAgICB0aGlzLl93cml0ZShgXFxufWApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdXBlci5jbG9zZSgpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHdyaXRlcjogUmVjb3JkQmF0Y2hXcml0ZXI8VD4sIGlucHV0OiBUYWJsZTxUPiB8IEl0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pikge1xuICAgIGNvbnN0IGNodW5rcyA9IChpbnB1dCBpbnN0YW5jZW9mIFRhYmxlKSA/IGlucHV0LmNodW5rcyA6IGlucHV0O1xuICAgIGZvciAoY29uc3QgYmF0Y2ggb2YgY2h1bmtzKSB7XG4gICAgICAgIHdyaXRlci53cml0ZShiYXRjaCk7XG4gICAgfVxuICAgIHJldHVybiB3cml0ZXIuZmluaXNoKCk7XG59XG5cbi8qKiBAaWdub3JlICovXG5hc3luYyBmdW5jdGlvbiB3cml0ZUFsbEFzeW5jPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHdyaXRlcjogUmVjb3JkQmF0Y2hXcml0ZXI8VD4sIGJhdGNoZXM6IEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KSB7XG4gICAgZm9yIGF3YWl0IChjb25zdCBiYXRjaCBvZiBiYXRjaGVzKSB7XG4gICAgICAgIHdyaXRlci53cml0ZShiYXRjaCk7XG4gICAgfVxuICAgIHJldHVybiB3cml0ZXIuZmluaXNoKCk7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBmaWVsZFRvSlNPTih7IG5hbWUsIHR5cGUsIG51bGxhYmxlIH06IEZpZWxkKTogb2JqZWN0IHtcbiAgICBjb25zdCBhc3NlbWJsZXIgPSBuZXcgSlNPTlR5cGVBc3NlbWJsZXIoKTtcbiAgICByZXR1cm4ge1xuICAgICAgICAnbmFtZSc6IG5hbWUsICdudWxsYWJsZSc6IG51bGxhYmxlLFxuICAgICAgICAndHlwZSc6IGFzc2VtYmxlci52aXNpdCh0eXBlKSxcbiAgICAgICAgJ2NoaWxkcmVuJzogKHR5cGUuY2hpbGRyZW4gfHwgW10pLm1hcChmaWVsZFRvSlNPTiksXG4gICAgICAgICdkaWN0aW9uYXJ5JzogIURhdGFUeXBlLmlzRGljdGlvbmFyeSh0eXBlKSA/IHVuZGVmaW5lZCA6IHtcbiAgICAgICAgICAgICdpZCc6IHR5cGUuaWQsXG4gICAgICAgICAgICAnaXNPcmRlcmVkJzogdHlwZS5pc09yZGVyZWQsXG4gICAgICAgICAgICAnaW5kZXhUeXBlJzogYXNzZW1ibGVyLnZpc2l0KHR5cGUuaW5kaWNlcylcbiAgICAgICAgfVxuICAgIH07XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBkaWN0aW9uYXJ5QmF0Y2hUb0pTT04oc2NoZW1hOiBTY2hlbWEsIGRpY3Rpb25hcnk6IFZlY3RvciwgaWQ6IG51bWJlciwgaXNEZWx0YSA9IGZhbHNlKSB7XG4gICAgY29uc3QgZiA9IHNjaGVtYS5kaWN0aW9uYXJ5RmllbGRzLmdldChpZCkhWzBdO1xuICAgIGNvbnN0IGZpZWxkID0gbmV3IEZpZWxkKGYubmFtZSwgZi50eXBlLmRpY3Rpb25hcnksIGYubnVsbGFibGUsIGYubWV0YWRhdGEpO1xuICAgIGNvbnN0IGNvbHVtbnMgPSBKU09OVmVjdG9yQXNzZW1ibGVyLmFzc2VtYmxlKG5ldyBDb2x1bW4oZmllbGQsIFtkaWN0aW9uYXJ5XSkpO1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICdpZCc6IGlkLFxuICAgICAgICAnaXNEZWx0YSc6IGlzRGVsdGEsXG4gICAgICAgICdkYXRhJzoge1xuICAgICAgICAgICAgJ2NvdW50JzogZGljdGlvbmFyeS5sZW5ndGgsXG4gICAgICAgICAgICAnY29sdW1ucyc6IGNvbHVtbnNcbiAgICAgICAgfVxuICAgIH0sIG51bGwsIDIpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gcmVjb3JkQmF0Y2hUb0pTT04ocmVjb3JkczogUmVjb3JkQmF0Y2gpIHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAnY291bnQnOiByZWNvcmRzLmxlbmd0aCxcbiAgICAgICAgJ2NvbHVtbnMnOiBKU09OVmVjdG9yQXNzZW1ibGVyLmFzc2VtYmxlKHJlY29yZHMpXG4gICAgfSwgbnVsbCwgMik7XG59XG4iXX0=

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
import { Table } from '../table';
import { MAGIC } from './message';
import { Column } from '../column';
import { Field } from '../schema';
import { Chunked } from '../vector/chunked';
import { Message } from './metadata/message';
import { RecordBatch } from '../recordbatch';
import * as metadata from './metadata/message';
import { DataType } from '../type';
import { FileBlock, Footer } from './metadata/file';
import { MessageHeader, MetadataVersion } from '../enum';
import { AsyncByteQueue } from '../io/stream';
import { VectorAssembler } from '../visitor/vectorassembler';
import { JSONTypeAssembler } from '../visitor/jsontypeassembler';
import { JSONVectorAssembler } from '../visitor/jsonvectorassembler';
import { toUint8Array } from '../util/buffer';
import { ReadableInterop } from '../io/interfaces';
import { isPromise, isAsyncIterable, isWritableDOMStream, isWritableNodeStream, isIterable } from '../util/compat';
export class RecordBatchWriter extends ReadableInterop {
    constructor(options) {
        super();
        this._position = 0;
        this._started = false;
        // @ts-ignore
        this._sink = new AsyncByteQueue();
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
        if (isPromise(input)) {
            return input.then((x) => this.writeAll(x));
        }
        else if (isAsyncIterable(input)) {
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
        if ((sink === this._sink) || (sink instanceof AsyncByteQueue)) {
            this._sink = sink;
        }
        else {
            this._sink = new AsyncByteQueue();
            if (sink && isWritableDOMStream(sink)) {
                this.toDOMStream({ type: 'bytes' }).pipeTo(sink);
            }
            else if (sink && isWritableNodeStream(sink)) {
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
        else if (payload instanceof Table && !(schema = payload.schema)) {
            return this.finish() && undefined;
        }
        else if (payload instanceof RecordBatch && !(schema = payload.schema)) {
            return this.finish() && undefined;
        }
        if (schema && !schema.compareTo(this._schema)) {
            if (this._started && this._autoDestroy) {
                return this.close();
            }
            this.reset(this._sink, schema);
        }
        if (payload instanceof RecordBatch) {
            this._writeRecordBatch(payload);
        }
        else if (payload instanceof Table) {
            this.writeAll(payload.chunks);
        }
        else if (isIterable(payload)) {
            this.writeAll(payload);
        }
    }
    _writeMessage(message, alignment = 8) {
        const a = alignment - 1;
        const buffer = Message.encode(message);
        const flatbufferSize = buffer.byteLength;
        const alignedSize = (flatbufferSize + 4 + a) & ~a;
        const nPaddingBytes = alignedSize - flatbufferSize - 4;
        if (message.headerType === MessageHeader.RecordBatch) {
            this._recordBatchBlocks.push(new FileBlock(alignedSize, message.bodyLength, this._position));
        }
        else if (message.headerType === MessageHeader.DictionaryBatch) {
            this._dictionaryBlocks.push(new FileBlock(alignedSize, message.bodyLength, this._position));
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
            const buffer = toUint8Array(chunk);
            if (buffer && buffer.byteLength > 0) {
                this._sink.write(buffer);
                this._position += buffer.byteLength;
            }
        }
        return this;
    }
    _writeSchema(schema) {
        return this
            ._writeMessage(Message.from(schema))
            ._writeDictionaries(schema.dictionaryFields);
    }
    _writeFooter() {
        return this._writePadding(4); // eos bytes
    }
    _writeMagic() {
        return this._write(MAGIC);
    }
    _writePadding(nBytes) {
        return nBytes > 0 ? this._write(new Uint8Array(nBytes)) : this;
    }
    _writeRecordBatch(records) {
        const { byteLength, nodes, bufferRegions, buffers } = VectorAssembler.assemble(records);
        const recordBatch = new metadata.RecordBatch(records.length, nodes, bufferRegions);
        const message = Message.from(recordBatch, byteLength);
        return this
            ._writeMessage(message)
            ._writeBodyBuffers(buffers);
    }
    _writeDictionaryBatch(dictionary, id, isDelta = false) {
        const { byteLength, nodes, bufferRegions, buffers } = VectorAssembler.assemble(dictionary);
        const recordBatch = new metadata.RecordBatch(dictionary.length, nodes, bufferRegions);
        const dictionaryBatch = new metadata.DictionaryBatch(recordBatch, id, isDelta);
        const message = Message.from(dictionaryBatch, byteLength);
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
            if (!(vector instanceof Chunked)) {
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
/** @ignore */
export class RecordBatchStreamWriter extends RecordBatchWriter {
    /** @nocollapse */
    static writeAll(input, options) {
        return new RecordBatchStreamWriter(options).writeAll(input);
    }
}
/** @ignore */
export class RecordBatchFileWriter extends RecordBatchWriter {
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
        const buffer = Footer.encode(new Footer(this._schema, MetadataVersion.V4, this._recordBatchBlocks, this._dictionaryBlocks));
        return this
            ._write(buffer) // Write the flatbuffer
            ._write(Int32Array.of(buffer.byteLength)) // then the footer size suffix
            ._writeMagic(); // then the magic suffix
    }
}
/** @ignore */
export class RecordBatchJSONWriter extends RecordBatchWriter {
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
        this._dictionaryBlocks.push(new FileBlock(0, 0, 0));
        return this;
    }
    _writeRecordBatch(records) {
        this._write(this._recordBatchBlocks.length === 0
            ? `,\n  "batches": [\n    `
            : `,\n    `);
        this._write(`${recordBatchToJSON(records)}`);
        this._recordBatchBlocks.push(new FileBlock(0, 0, 0));
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
/** @ignore */
function writeAll(writer, input) {
    let chunks = input;
    if (input instanceof Table) {
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
    const assembler = new JSONTypeAssembler();
    return {
        'name': name, 'nullable': nullable,
        'type': assembler.visit(type),
        'children': (type.children || []).map(fieldToJSON),
        'dictionary': !DataType.isDictionary(type) ? undefined : {
            'id': type.id,
            'isOrdered': type.isOrdered,
            'indexType': assembler.visit(type.indices)
        }
    };
}
/** @ignore */
function dictionaryBatchToJSON(schema, dictionary, id, isDelta = false) {
    const f = schema.dictionaryFields.get(id)[0];
    const field = new Field(f.name, f.type.dictionary, f.nullable, f.metadata);
    const columns = JSONVectorAssembler.assemble(new Column(field, [dictionary]));
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
        'columns': JSONVectorAssembler.assemble(records)
    }, null, 2);
}

//# sourceMappingURL=writer.mjs.map

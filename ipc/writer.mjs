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
import { MAGIC } from './message';
import { Schema } from '../schema';
import { Message } from './metadata/message';
import * as metadata from './metadata/message';
import { ChunkedVector } from '../vector/chunked';
import { FileBlock, Footer } from './metadata/file';
import { MessageHeader, MetadataVersion } from '../enum';
import { AsyncByteQueue } from '../io/stream';
import { VectorAssembler } from '../visitor/vectorassembler';
import { isWritableDOMStream, isWritableNodeStream, isAsyncIterable } from '../util/compat';
import { ReadableInterop } from '../io/interfaces';
const kAlignmentBytes = new Uint8Array(64).fill(0);
export class RecordBatchWriter extends ReadableInterop {
    constructor() {
        super(...arguments);
        this.position = 0;
        this.started = false;
        // @ts-ignore
        this.sink = new AsyncByteQueue();
        this.schema = null;
        this.dictionaryBlocks = [];
        this.recordBatchBlocks = [];
    }
    /** @nocollapse */
    static throughNode() { throw new Error(`"throughNode" not available in this environment`); }
    /** @nocollapse */
    static throughDOM() {
        throw new Error(`"throughDOM" not available in this environment`);
    }
    toUint8Array(sync = false) {
        return this.sink.toUint8Array(sync);
    }
    get closed() { return this.sink.closed; }
    [Symbol.asyncIterator]() { return this.sink[Symbol.asyncIterator](); }
    toReadableDOMStream(options) { return this.sink.toReadableDOMStream(options); }
    toReadableNodeStream(options) { return this.sink.toReadableNodeStream(options); }
    close() { return this.reset().sink.close(); }
    abort(reason) { return this.reset().sink.abort(reason); }
    reset(sink = this.sink, schema) {
        if ((sink === this.sink) || (sink instanceof AsyncByteQueue)) {
            this.sink = sink;
        }
        else {
            this.sink = new AsyncByteQueue();
            if (sink && isWritableDOMStream(sink)) {
                this.toReadableDOMStream().pipeTo(sink);
            }
            else if (sink && isWritableNodeStream(sink)) {
                this.toReadableNodeStream().pipe(sink);
            }
        }
        this.position = 0;
        this.schema = null;
        this.started = false;
        this.dictionaryBlocks = [];
        this.recordBatchBlocks = [];
        if (schema instanceof Schema) {
            this.started = true;
            this.schema = schema;
            this._writeSchema(schema);
        }
        return this;
    }
    write(chunk) {
        if (!this.sink) {
            throw new Error(`RecordBatchWriter is closed`);
        }
        if (!this.started && (this.started = true)) {
            this._writeSchema(this.schema = chunk.schema);
        }
        if (chunk.schema !== this.schema) {
            throw new Error('Schemas unequal');
        }
        this._writeRecordBatch(chunk);
    }
    _writeMessage(message, alignment = 8) {
        const a = alignment - 1;
        const buffer = Message.encode(message);
        const flatbufferSize = buffer.byteLength;
        const alignedSize = (flatbufferSize + 4 + a) & ~a;
        const nPaddingBytes = alignedSize - flatbufferSize - 4;
        if (message.headerType === MessageHeader.RecordBatch) {
            this.recordBatchBlocks.push(new FileBlock(alignedSize, message.bodyLength, this.position));
        }
        else if (message.headerType === MessageHeader.DictionaryBatch) {
            this.dictionaryBlocks.push(new FileBlock(alignedSize, message.bodyLength, this.position));
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
    _write(buffer) {
        if (buffer && buffer.byteLength > 0) {
            this.sink.write(buffer);
            this.position += buffer.byteLength;
        }
        return this;
    }
    _writeSchema(schema) {
        return this
            ._writeMessage(Message.from(schema))
            ._writeDictionaries(schema.dictionaryFields);
    }
    _writeFooter() {
        const { schema, recordBatchBlocks, dictionaryBlocks } = this;
        const buffer = Footer.encode(new Footer(schema, MetadataVersion.V4, recordBatchBlocks, dictionaryBlocks));
        return this
            ._write(buffer) // Write the flatbuffer
            ._write(Int32Array.of(buffer.byteLength)) // then the footer size suffix
            ._writeMagic(); // then the magic suffix
    }
    _writeMagic() {
        return this._write(MAGIC);
    }
    _writePadding(nBytes) {
        return nBytes > 0 ? this._write(kAlignmentBytes.subarray(0, nBytes)) : this;
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
            if (!(vector instanceof ChunkedVector)) {
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
export class RecordBatchFileWriter extends RecordBatchWriter {
    /** @nocollapse */
    static writeAll(batches) {
        const writer = new RecordBatchFileWriter();
        if (!isAsyncIterable(batches)) {
            for (const batch of batches)
                writer.write(batch);
            writer.close();
            return writer;
        }
        return (async () => {
            for await (const batch of batches)
                writer.write(batch);
            writer.close();
            return writer;
        })();
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
export class RecordBatchStreamWriter extends RecordBatchWriter {
    /** @nocollapse */
    static writeAll(batches) {
        const writer = new RecordBatchStreamWriter();
        if (!isAsyncIterable(batches)) {
            for (const batch of batches)
                writer.write(batch);
            writer.close();
            return writer;
        }
        return (async () => {
            for await (const batch of batches)
                writer.write(batch);
            writer.close();
            return writer;
        })();
    }
    close() {
        this._writePadding(4);
        return super.close();
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LE9BQU8sS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3pCLENBQUM7Q0FDSiIsImZpbGUiOiJpcGMvd3JpdGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IE1BR0lDIH0gZnJvbSAnLi9tZXNzYWdlJztcbmltcG9ydCB7IFZlY3RvciB9IGZyb20gJy4uL3ZlY3Rvcic7XG5pbXBvcnQgeyBTY2hlbWEsIEZpZWxkIH0gZnJvbSAnLi4vc2NoZW1hJztcbmltcG9ydCB7IE1lc3NhZ2UgfSBmcm9tICcuL21ldGFkYXRhL21lc3NhZ2UnO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2ggfSBmcm9tICcuLi9yZWNvcmRiYXRjaCc7XG5pbXBvcnQgKiBhcyBtZXRhZGF0YSBmcm9tICcuL21ldGFkYXRhL21lc3NhZ2UnO1xuaW1wb3J0IHsgRGF0YVR5cGUsIERpY3Rpb25hcnkgfSBmcm9tICcuLi90eXBlJztcbmltcG9ydCB7IENodW5rZWRWZWN0b3IgfSBmcm9tICcuLi92ZWN0b3IvY2h1bmtlZCc7XG5pbXBvcnQgeyBGaWxlQmxvY2ssIEZvb3RlciB9IGZyb20gJy4vbWV0YWRhdGEvZmlsZSc7XG5pbXBvcnQgeyBBcnJheUJ1ZmZlclZpZXdJbnB1dCB9IGZyb20gJy4uL3V0aWwvYnVmZmVyJztcbmltcG9ydCB7IE1lc3NhZ2VIZWFkZXIsIE1ldGFkYXRhVmVyc2lvbiB9IGZyb20gJy4uL2VudW0nO1xuaW1wb3J0IHsgV3JpdGFibGVTaW5rLCBBc3luY0J5dGVRdWV1ZSB9IGZyb20gJy4uL2lvL3N0cmVhbSc7XG5pbXBvcnQgeyBWZWN0b3JBc3NlbWJsZXIgfSBmcm9tICcuLi92aXNpdG9yL3ZlY3RvcmFzc2VtYmxlcic7XG5pbXBvcnQgeyBpc1dyaXRhYmxlRE9NU3RyZWFtLCBpc1dyaXRhYmxlTm9kZVN0cmVhbSwgaXNBc3luY0l0ZXJhYmxlIH0gZnJvbSAnLi4vdXRpbC9jb21wYXQnO1xuaW1wb3J0IHsgV3JpdGFibGUsIEZpbGVIYW5kbGUsIFJlYWRhYmxlSW50ZXJvcCwgUmVhZGFibGVET01TdHJlYW1PcHRpb25zIH0gZnJvbSAnLi4vaW8vaW50ZXJmYWNlcyc7XG5cbmNvbnN0IGtBbGlnbm1lbnRCeXRlcyA9IG5ldyBVaW50OEFycmF5KDY0KS5maWxsKDApO1xuXG5leHBvcnQgdHlwZSBPcGVuQXJncyA9IEZpbGVIYW5kbGUgfCBOb2RlSlMuV3JpdGFibGVTdHJlYW0gfCBXcml0YWJsZVN0cmVhbTxVaW50OEFycmF5PiB8IFVuZGVybHlpbmdTaW5rPFVpbnQ4QXJyYXk+O1xuXG5leHBvcnQgY2xhc3MgUmVjb3JkQmF0Y2hXcml0ZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWFkYWJsZUludGVyb3A8VWludDhBcnJheT4gaW1wbGVtZW50cyBXcml0YWJsZTxSZWNvcmRCYXRjaDxUPj4ge1xuXG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyB0aHJvdWdoTm9kZSgpOiBpbXBvcnQoJ3N0cmVhbScpLkR1cGxleCB7IHRocm93IG5ldyBFcnJvcihgXCJ0aHJvdWdoTm9kZVwiIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBlbnZpcm9ubWVudGApOyB9XG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyB0aHJvdWdoRE9NPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0+KCk6IHsgd3JpdGFibGU6IFdyaXRhYmxlU3RyZWFtPFJlY29yZEJhdGNoPFQ+PiwgcmVhZGFibGU6IFJlYWRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+IH0ge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFwidGhyb3VnaERPTVwiIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBlbnZpcm9ubWVudGApO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBwb3NpdGlvbiA9IDA7XG4gICAgcHJvdGVjdGVkIHN0YXJ0ZWQgPSBmYWxzZTtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHJvdGVjdGVkIHNpbmsgPSBuZXcgQXN5bmNCeXRlUXVldWUoKTtcbiAgICBwcm90ZWN0ZWQgc2NoZW1hOiBTY2hlbWEgfCBudWxsID0gbnVsbDtcbiAgICBwcm90ZWN0ZWQgZGljdGlvbmFyeUJsb2NrczogRmlsZUJsb2NrW10gPSBbXTtcbiAgICBwcm90ZWN0ZWQgcmVjb3JkQmF0Y2hCbG9ja3M6IEZpbGVCbG9ja1tdID0gW107XG5cbiAgICBwdWJsaWMgdG9VaW50OEFycmF5KHN5bmM6IHRydWUpOiBVaW50OEFycmF5O1xuICAgIHB1YmxpYyB0b1VpbnQ4QXJyYXkoc3luYz86IGZhbHNlKTogUHJvbWlzZTxVaW50OEFycmF5PjtcbiAgICBwdWJsaWMgdG9VaW50OEFycmF5KHN5bmM6IGFueSA9IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNpbmsudG9VaW50OEFycmF5KHN5bmMpIGFzIFByb21pc2U8VWludDhBcnJheT4gfCBVaW50OEFycmF5O1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXQgY2xvc2VkKCkgeyByZXR1cm4gdGhpcy5zaW5rLmNsb3NlZDsgfVxuICAgIHB1YmxpYyBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCkgeyByZXR1cm4gdGhpcy5zaW5rW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpOyB9XG4gICAgcHVibGljIHRvUmVhZGFibGVET01TdHJlYW0ob3B0aW9ucz86IFJlYWRhYmxlRE9NU3RyZWFtT3B0aW9ucykgeyByZXR1cm4gdGhpcy5zaW5rLnRvUmVhZGFibGVET01TdHJlYW0ob3B0aW9ucyk7IH1cbiAgICBwdWJsaWMgdG9SZWFkYWJsZU5vZGVTdHJlYW0ob3B0aW9ucz86IGltcG9ydCgnc3RyZWFtJykuUmVhZGFibGVPcHRpb25zKSB7IHJldHVybiB0aGlzLnNpbmsudG9SZWFkYWJsZU5vZGVTdHJlYW0ob3B0aW9ucyk7IH1cblxuICAgIHB1YmxpYyBjbG9zZSgpIHsgcmV0dXJuIHRoaXMucmVzZXQoKS5zaW5rLmNsb3NlKCk7IH1cbiAgICBwdWJsaWMgYWJvcnQocmVhc29uPzogYW55KSB7IHJldHVybiB0aGlzLnJlc2V0KCkuc2luay5hYm9ydChyZWFzb24pOyB9XG4gICAgcHVibGljIHJlc2V0KHNpbms6IFdyaXRhYmxlU2luazxBcnJheUJ1ZmZlclZpZXdJbnB1dD4gPSB0aGlzLnNpbmssIHNjaGVtYT86IFNjaGVtYTxUPikge1xuXG4gICAgICAgIGlmICgoc2luayA9PT0gdGhpcy5zaW5rKSB8fCAoc2luayBpbnN0YW5jZW9mIEFzeW5jQnl0ZVF1ZXVlKSkge1xuICAgICAgICAgICAgdGhpcy5zaW5rID0gc2luayBhcyBBc3luY0J5dGVRdWV1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2luayA9IG5ldyBBc3luY0J5dGVRdWV1ZSgpO1xuICAgICAgICAgICAgaWYgKHNpbmsgJiYgaXNXcml0YWJsZURPTVN0cmVhbShzaW5rKSkge1xuICAgICAgICAgICAgICAgIHRoaXMudG9SZWFkYWJsZURPTVN0cmVhbSgpLnBpcGVUbyhzaW5rKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc2luayAmJiBpc1dyaXRhYmxlTm9kZVN0cmVhbShzaW5rKSkge1xuICAgICAgICAgICAgICAgIHRoaXMudG9SZWFkYWJsZU5vZGVTdHJlYW0oKS5waXBlKHNpbmspO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5wb3NpdGlvbiA9IDA7XG4gICAgICAgIHRoaXMuc2NoZW1hID0gbnVsbDtcbiAgICAgICAgdGhpcy5zdGFydGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuZGljdGlvbmFyeUJsb2NrcyA9IFtdO1xuICAgICAgICB0aGlzLnJlY29yZEJhdGNoQmxvY2tzID0gW107XG5cbiAgICAgICAgaWYgKHNjaGVtYSBpbnN0YW5jZW9mIFNjaGVtYSkge1xuICAgICAgICAgICAgdGhpcy5zdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuc2NoZW1hID0gc2NoZW1hO1xuICAgICAgICAgICAgdGhpcy5fd3JpdGVTY2hlbWEoc2NoZW1hKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHB1YmxpYyB3cml0ZShjaHVuazogUmVjb3JkQmF0Y2g8VD4pIHtcbiAgICAgICAgaWYgKCF0aGlzLnNpbmspIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUmVjb3JkQmF0Y2hXcml0ZXIgaXMgY2xvc2VkYCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLnN0YXJ0ZWQgJiYgKHRoaXMuc3RhcnRlZCA9IHRydWUpKSB7XG4gICAgICAgICAgICB0aGlzLl93cml0ZVNjaGVtYSh0aGlzLnNjaGVtYSA9IGNodW5rLnNjaGVtYSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNodW5rLnNjaGVtYSAhPT0gdGhpcy5zY2hlbWEpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignU2NoZW1hcyB1bmVxdWFsJyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fd3JpdGVSZWNvcmRCYXRjaChjaHVuayk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZU1lc3NhZ2U8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KG1lc3NhZ2U6IE1lc3NhZ2U8VD4sIGFsaWdubWVudCA9IDgpIHtcblxuICAgICAgICBjb25zdCBhID0gYWxpZ25tZW50IC0gMTtcbiAgICAgICAgY29uc3QgYnVmZmVyID0gTWVzc2FnZS5lbmNvZGUobWVzc2FnZSk7XG4gICAgICAgIGNvbnN0IGZsYXRidWZmZXJTaXplID0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgICAgIGNvbnN0IGFsaWduZWRTaXplID0gKGZsYXRidWZmZXJTaXplICsgNCArIGEpICYgfmE7XG4gICAgICAgIGNvbnN0IG5QYWRkaW5nQnl0ZXMgPSBhbGlnbmVkU2l6ZSAtIGZsYXRidWZmZXJTaXplIC0gNDtcblxuICAgICAgICBpZiAobWVzc2FnZS5oZWFkZXJUeXBlID09PSBNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoKSB7XG4gICAgICAgICAgICB0aGlzLnJlY29yZEJhdGNoQmxvY2tzLnB1c2gobmV3IEZpbGVCbG9jayhhbGlnbmVkU2l6ZSwgbWVzc2FnZS5ib2R5TGVuZ3RoLCB0aGlzLnBvc2l0aW9uKSk7XG4gICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5oZWFkZXJUeXBlID09PSBNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaCkge1xuICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJ5QmxvY2tzLnB1c2gobmV3IEZpbGVCbG9jayhhbGlnbmVkU2l6ZSwgbWVzc2FnZS5ib2R5TGVuZ3RoLCB0aGlzLnBvc2l0aW9uKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBXcml0ZSB0aGUgZmxhdGJ1ZmZlciBzaXplIHByZWZpeCBpbmNsdWRpbmcgcGFkZGluZ1xuICAgICAgICB0aGlzLl93cml0ZShJbnQzMkFycmF5Lm9mKGFsaWduZWRTaXplIC0gNCkpO1xuICAgICAgICAvLyBXcml0ZSB0aGUgZmxhdGJ1ZmZlclxuICAgICAgICBpZiAoZmxhdGJ1ZmZlclNpemUgPiAwKSB7IHRoaXMuX3dyaXRlKGJ1ZmZlcik7IH1cbiAgICAgICAgLy8gV3JpdGUgYW55IHBhZGRpbmdcbiAgICAgICAgcmV0dXJuIHRoaXMuX3dyaXRlUGFkZGluZyhuUGFkZGluZ0J5dGVzKTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlKGJ1ZmZlcjogQXJyYXlCdWZmZXJWaWV3KSB7XG4gICAgICAgIGlmIChidWZmZXIgJiYgYnVmZmVyLmJ5dGVMZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB0aGlzLnNpbmsud3JpdGUoYnVmZmVyKTtcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24gKz0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZVNjaGVtYShzY2hlbWE6IFNjaGVtYTxUPikge1xuICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgICAgICAgLl93cml0ZU1lc3NhZ2UoTWVzc2FnZS5mcm9tKHNjaGVtYSkpXG4gICAgICAgICAgICAuX3dyaXRlRGljdGlvbmFyaWVzKHNjaGVtYS5kaWN0aW9uYXJ5RmllbGRzKTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlRm9vdGVyKCkge1xuXG4gICAgICAgIGNvbnN0IHsgc2NoZW1hLCByZWNvcmRCYXRjaEJsb2NrcywgZGljdGlvbmFyeUJsb2NrcyB9ID0gdGhpcztcbiAgICAgICAgY29uc3QgYnVmZmVyID0gRm9vdGVyLmVuY29kZShuZXcgRm9vdGVyKFxuICAgICAgICAgICAgc2NoZW1hISwgTWV0YWRhdGFWZXJzaW9uLlY0LFxuICAgICAgICAgICAgcmVjb3JkQmF0Y2hCbG9ja3MsIGRpY3Rpb25hcnlCbG9ja3NcbiAgICAgICAgKSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICAgICAgICAgIC5fd3JpdGUoYnVmZmVyKSAvLyBXcml0ZSB0aGUgZmxhdGJ1ZmZlclxuICAgICAgICAgICAgLl93cml0ZShJbnQzMkFycmF5Lm9mKGJ1ZmZlci5ieXRlTGVuZ3RoKSkgLy8gdGhlbiB0aGUgZm9vdGVyIHNpemUgc3VmZml4XG4gICAgICAgICAgICAuX3dyaXRlTWFnaWMoKTsgLy8gdGhlbiB0aGUgbWFnaWMgc3VmZml4XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZU1hZ2ljKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fd3JpdGUoTUFHSUMpO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfd3JpdGVQYWRkaW5nKG5CeXRlczogbnVtYmVyKSB7XG4gICAgICAgIHJldHVybiBuQnl0ZXMgPiAwID8gdGhpcy5fd3JpdGUoa0FsaWdubWVudEJ5dGVzLnN1YmFycmF5KDAsIG5CeXRlcykpIDogdGhpcztcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlUmVjb3JkQmF0Y2gocmVjb3JkczogUmVjb3JkQmF0Y2g8VD4pIHtcbiAgICAgICAgY29uc3QgeyBieXRlTGVuZ3RoLCBub2RlcywgYnVmZmVyUmVnaW9ucywgYnVmZmVycyB9ID0gVmVjdG9yQXNzZW1ibGVyLmFzc2VtYmxlKHJlY29yZHMpO1xuICAgICAgICBjb25zdCByZWNvcmRCYXRjaCA9IG5ldyBtZXRhZGF0YS5SZWNvcmRCYXRjaChyZWNvcmRzLmxlbmd0aCwgbm9kZXMsIGJ1ZmZlclJlZ2lvbnMpO1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gTWVzc2FnZS5mcm9tKHJlY29yZEJhdGNoLCBieXRlTGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICAgICAgICAgIC5fd3JpdGVNZXNzYWdlKG1lc3NhZ2UpXG4gICAgICAgICAgICAuX3dyaXRlQm9keUJ1ZmZlcnMoYnVmZmVycyk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZURpY3Rpb25hcnlCYXRjaChkaWN0aW9uYXJ5OiBWZWN0b3IsIGlkOiBudW1iZXIsIGlzRGVsdGEgPSBmYWxzZSkge1xuICAgICAgICBjb25zdCB7IGJ5dGVMZW5ndGgsIG5vZGVzLCBidWZmZXJSZWdpb25zLCBidWZmZXJzIH0gPSBWZWN0b3JBc3NlbWJsZXIuYXNzZW1ibGUoZGljdGlvbmFyeSk7XG4gICAgICAgIGNvbnN0IHJlY29yZEJhdGNoID0gbmV3IG1ldGFkYXRhLlJlY29yZEJhdGNoKGRpY3Rpb25hcnkubGVuZ3RoLCBub2RlcywgYnVmZmVyUmVnaW9ucyk7XG4gICAgICAgIGNvbnN0IGRpY3Rpb25hcnlCYXRjaCA9IG5ldyBtZXRhZGF0YS5EaWN0aW9uYXJ5QmF0Y2gocmVjb3JkQmF0Y2gsIGlkLCBpc0RlbHRhKTtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IE1lc3NhZ2UuZnJvbShkaWN0aW9uYXJ5QmF0Y2gsIGJ5dGVMZW5ndGgpO1xuICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgICAgICAgLl93cml0ZU1lc3NhZ2UobWVzc2FnZSlcbiAgICAgICAgICAgIC5fd3JpdGVCb2R5QnVmZmVycyhidWZmZXJzKTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dyaXRlQm9keUJ1ZmZlcnMoYnVmZmVyczogQXJyYXlCdWZmZXJWaWV3W10pIHtcbiAgICAgICAgbGV0IGJ1ZmZlcjogQXJyYXlCdWZmZXJWaWV3O1xuICAgICAgICBsZXQgc2l6ZTogbnVtYmVyLCBwYWRkaW5nOiBudW1iZXI7XG4gICAgICAgIGZvciAobGV0IGkgPSAtMSwgbiA9IGJ1ZmZlcnMubGVuZ3RoOyArK2kgPCBuOykge1xuICAgICAgICAgICAgaWYgKChidWZmZXIgPSBidWZmZXJzW2ldKSAmJiAoc2l6ZSA9IGJ1ZmZlci5ieXRlTGVuZ3RoKSA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLl93cml0ZShidWZmZXIpO1xuICAgICAgICAgICAgICAgIGlmICgocGFkZGluZyA9ICgoc2l6ZSArIDcpICYgfjcpIC0gc2l6ZSkgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3dyaXRlUGFkZGluZyhwYWRkaW5nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93cml0ZURpY3Rpb25hcmllcyhkaWN0aW9uYXJ5RmllbGRzOiBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5PGFueSwgYW55Pj5bXT4pIHtcbiAgICAgICAgZm9yIChjb25zdCBbaWQsIGZpZWxkc10gb2YgZGljdGlvbmFyeUZpZWxkcykge1xuICAgICAgICAgICAgY29uc3QgdmVjdG9yID0gZmllbGRzWzBdLnR5cGUuZGljdGlvbmFyeVZlY3RvcjtcbiAgICAgICAgICAgIGlmICghKHZlY3RvciBpbnN0YW5jZW9mIENodW5rZWRWZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fd3JpdGVEaWN0aW9uYXJ5QmF0Y2godmVjdG9yLCBpZCwgZmFsc2UpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjaHVua3MgPSB2ZWN0b3IuY2h1bmtzO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAtMSwgbiA9IGNodW5rcy5sZW5ndGg7ICsraSA8IG47KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3dyaXRlRGljdGlvbmFyeUJhdGNoKGNodW5rc1tpXSwgaWQsIGkgPiAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgUmVjb3JkQmF0Y2hGaWxlV3JpdGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hXcml0ZXI8VD4ge1xuXG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PihiYXRjaGVzOiBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pOiBSZWNvcmRCYXRjaEZpbGVXcml0ZXI8VD47XG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PihiYXRjaGVzOiBBc3luY0l0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pik6IFByb21pc2U8UmVjb3JkQmF0Y2hGaWxlV3JpdGVyPFQ+PjtcbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KGJhdGNoZXM6IEl0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+PiB8IEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KSB7XG4gICAgICAgIGNvbnN0IHdyaXRlciA9IG5ldyBSZWNvcmRCYXRjaEZpbGVXcml0ZXI8VD4oKTtcbiAgICAgICAgaWYgKCFpc0FzeW5jSXRlcmFibGUoYmF0Y2hlcykpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgYmF0Y2ggb2YgYmF0Y2hlcykgd3JpdGVyLndyaXRlKGJhdGNoKTsgd3JpdGVyLmNsb3NlKCk7IHJldHVybiB3cml0ZXI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBmb3IgYXdhaXQgKGNvbnN0IGJhdGNoIG9mIGJhdGNoZXMpIHdyaXRlci53cml0ZShiYXRjaCk7IHdyaXRlci5jbG9zZSgpOyByZXR1cm4gd3JpdGVyO1xuICAgICAgICB9KSgpO1xuICAgIH1cblxuICAgIHB1YmxpYyBjbG9zZSgpIHtcbiAgICAgICAgdGhpcy5fd3JpdGVGb290ZXIoKTtcbiAgICAgICAgcmV0dXJuIHN1cGVyLmNsb3NlKCk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBfd3JpdGVTY2hlbWEoc2NoZW1hOiBTY2hlbWE8VD4pIHtcbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICAgICAgICAgIC5fd3JpdGVNYWdpYygpLl93cml0ZVBhZGRpbmcoMilcbiAgICAgICAgICAgIC5fd3JpdGVEaWN0aW9uYXJpZXMoc2NoZW1hLmRpY3Rpb25hcnlGaWVsZHMpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFJlY29yZEJhdGNoU3RyZWFtV3JpdGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hXcml0ZXI8VD4ge1xuXG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PihiYXRjaGVzOiBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pOiBSZWNvcmRCYXRjaFN0cmVhbVdyaXRlcjxUPjtcbiAgICBwdWJsaWMgc3RhdGljIHdyaXRlQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KGJhdGNoZXM6IEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KTogUHJvbWlzZTxSZWNvcmRCYXRjaFN0cmVhbVdyaXRlcjxUPj47XG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyB3cml0ZUFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PihiYXRjaGVzOiBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4gfCBBc3luY0l0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+Pikge1xuICAgICAgICBjb25zdCB3cml0ZXIgPSBuZXcgUmVjb3JkQmF0Y2hTdHJlYW1Xcml0ZXI8VD4oKTtcbiAgICAgICAgaWYgKCFpc0FzeW5jSXRlcmFibGUoYmF0Y2hlcykpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgYmF0Y2ggb2YgYmF0Y2hlcykgd3JpdGVyLndyaXRlKGJhdGNoKTsgd3JpdGVyLmNsb3NlKCk7IHJldHVybiB3cml0ZXI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBmb3IgYXdhaXQgKGNvbnN0IGJhdGNoIG9mIGJhdGNoZXMpIHdyaXRlci53cml0ZShiYXRjaCk7IHdyaXRlci5jbG9zZSgpOyByZXR1cm4gd3JpdGVyO1xuICAgICAgICB9KSgpO1xuICAgIH1cbiAgICBwdWJsaWMgY2xvc2UoKSB7XG4gICAgICAgIHRoaXMuX3dyaXRlUGFkZGluZyg0KTtcbiAgICAgICAgcmV0dXJuIHN1cGVyLmNsb3NlKCk7XG4gICAgfVxufVxuIl19

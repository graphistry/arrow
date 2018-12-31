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
import { Vector } from '../vector';
import { MessageHeader } from '../enum';
import { Footer } from './metadata/file';
import streamAdapters from '../io/adapters';
import { RecordBatch } from '../recordbatch';
import { ByteStream, AsyncByteStream } from '../io/stream';
import { toUint8Array } from '../util/buffer';
import { RandomAccessFile, AsyncRandomAccessFile } from '../io/file';
import { VectorLoader, JSONVectorLoader } from '../visitor/vectorloader';
import { ArrowJSON, ReadableInterop, ITERATOR_DONE } from '../io/interfaces';
import { isPromise, isArrowJSON, isFileHandle, isFetchResponse, isAsyncIterable, isReadableDOMStream, isReadableNodeStream } from '../util/compat';
import { MessageReader, AsyncMessageReader, checkForMagicArrowString, magicLength, magicAndPadding, magicX2AndPadding, JSONMessageReader } from './message';
export class RecordBatchReader extends ReadableInterop {
    constructor(impl) {
        super();
        this.impl = impl;
    }
    get closed() { return this.impl.closed; }
    get schema() { return this.impl.schema; }
    get autoClose() { return this.impl.autoClose; }
    get dictionaries() { return this.impl.dictionaries; }
    get numDictionaries() { return this.impl.numDictionaries; }
    get numRecordBatches() { return this.impl.numRecordBatches; }
    next(value) { return this.impl.next(value); }
    throw(value) { return this.impl.throw(value); }
    return(value) { return this.impl.return(value); }
    reset(schema) { this.impl.reset(schema); return this; }
    toReadableDOMStream() {
        return streamAdapters.toReadableDOMStream((this.isSync()
            ? { [Symbol.iterator]: () => this }
            : { [Symbol.asyncIterator]: () => this }));
    }
    toReadableNodeStream() {
        return streamAdapters.toReadableNodeStream((this.isSync()
            ? { [Symbol.iterator]: () => this }
            : { [Symbol.asyncIterator]: () => this }), { objectMode: true });
    }
    isSync() {
        return (this instanceof RecordBatchFileReader) || (this instanceof RecordBatchStreamReader);
    }
    isAsync() {
        return (this instanceof AsyncRecordBatchFileReader) || (this instanceof AsyncRecordBatchStreamReader);
    }
    isFile() {
        return (this instanceof RecordBatchFileReader) || (this instanceof AsyncRecordBatchFileReader);
    }
    isStream() {
        return (this instanceof RecordBatchStreamReader) || (this instanceof AsyncRecordBatchStreamReader);
    }
    /** @nocollapse */
    static throughNode() { throw new Error(`"throughNode" not available in this environment`); }
    /** @nocollapse */
    static throughDOM() {
        throw new Error(`"throughDOM" not available in this environment`);
    }
    /** @nocollapse */
    static from(source) {
        if (source instanceof RecordBatchReader) {
            return source;
        }
        else if (isArrowJSON(source)) {
            return RecordBatchReader.fromJSON(source);
        }
        else if (isFileHandle(source)) {
            return RecordBatchReader.fromFileHandle(source);
        }
        else if (isPromise(source)) {
            return (async () => await RecordBatchReader.from(await source))();
        }
        else if (isFetchResponse(source) || isReadableDOMStream(source) || isReadableNodeStream(source) || isAsyncIterable(source)) {
            return RecordBatchReader.fromAsyncByteStream(new AsyncByteStream(source));
        }
        return RecordBatchReader.fromByteStream(new ByteStream(source));
    }
    static fromJSON(source) {
        return new RecordBatchStreamReader(new ArrowJSON(source));
    }
    static fromByteStream(source) {
        const bytes = source.peek((magicLength + 7) & ~7);
        return bytes && bytes.byteLength >= 4
            ? checkForMagicArrowString(bytes)
                ? new RecordBatchFileReader(source.read())
                : new RecordBatchStreamReader(source)
            : new RecordBatchStreamReader(function* () { }());
    }
    static async fromAsyncByteStream(source) {
        const bytes = await source.peek((magicLength + 7) & ~7);
        return bytes && bytes.byteLength >= 4
            ? checkForMagicArrowString(bytes)
                ? new RecordBatchFileReader(await source.read())
                : new AsyncRecordBatchStreamReader(source)
            : new AsyncRecordBatchStreamReader(async function* () { }());
    }
    static async fromFileHandle(source) {
        const { size } = await source.stat();
        const file = new AsyncRandomAccessFile(source, size);
        if (size >= magicX2AndPadding) {
            if (checkForMagicArrowString(await file.readAt(0, (magicLength + 7) & ~7))) {
                return new AsyncRecordBatchFileReader(file);
            }
        }
        return new AsyncRecordBatchStreamReader(file);
    }
}
/** @ignore */
export class RecordBatchFileReader extends RecordBatchReader {
    constructor(source, dictionaries) {
        if (source instanceof AsyncRecordBatchFileReaderImpl) {
            super(source);
        }
        else if (source instanceof RandomAccessFile) {
            super(new RecordBatchFileReaderImpl(source, dictionaries));
        }
        else {
            super(new RecordBatchFileReaderImpl(new RandomAccessFile(toUint8Array(source)), dictionaries));
        }
    }
    get footer() { return this.impl.footer; }
    cancel() { this.impl.close(); }
    open(autoClose) { this.impl.open(autoClose); return this; }
    readRecordBatch(index) { return this.impl.readRecordBatch(index); }
    [Symbol.iterator]() { return this.impl[Symbol.iterator](); }
    async *[Symbol.asyncIterator]() { yield* this[Symbol.iterator](); }
}
/** @ignore */
export class RecordBatchStreamReader extends RecordBatchReader {
    constructor(source, dictionaries) {
        super(isArrowJSON(source)
            ? new RecordBatchJSONReaderImpl(new JSONMessageReader(source), dictionaries)
            : new RecordBatchStreamReaderImpl(new MessageReader(source), dictionaries));
    }
    cancel() { this.impl.close(); }
    open(autoClose) { this.impl.open(autoClose); return this; }
    [Symbol.iterator]() { return this.impl[Symbol.iterator](); }
    async *[Symbol.asyncIterator]() { yield* this[Symbol.iterator](); }
}
/** @ignore */
export class AsyncRecordBatchStreamReader extends RecordBatchReader {
    constructor(source, byteLength) {
        super(new AsyncRecordBatchStreamReaderImpl(new AsyncMessageReader(source, byteLength)));
    }
    async cancel() { await this.impl.close(); }
    async open(autoClose) { await this.impl.open(autoClose); return this; }
    [Symbol.asyncIterator]() { return this.impl[Symbol.asyncIterator](); }
    [Symbol.iterator]() { throw new Error(`AsyncRecordBatchStreamReader is not Iterable`); }
}
/** @ignore */
export class AsyncRecordBatchFileReader extends RecordBatchReader {
    constructor(source, ...rest) {
        let [byteLength, dictionaries] = rest;
        if (byteLength && typeof byteLength !== 'number') {
            dictionaries = byteLength;
        }
        let file = source instanceof AsyncRandomAccessFile ? source : new AsyncRandomAccessFile(source, byteLength);
        super(new AsyncRecordBatchFileReaderImpl(file, dictionaries));
    }
    get footer() { return this.impl.footer; }
    async cancel() { await this.impl.close(); }
    async open(autoClose) { await this.impl.open(autoClose); return this; }
    readRecordBatch(index) { return this.impl.readRecordBatch(index); }
    [Symbol.asyncIterator]() { return this.impl[Symbol.asyncIterator](); }
    [Symbol.iterator]() { throw new Error(`AsyncRecordBatchFileReader is not Iterable`); }
}
/** @ignore */
class RecordBatchReaderImplBase {
    constructor(dictionaries = new Map()) {
        this.closed = false;
        this.autoClose = true;
        this.dictionaryIndex = 0;
        this.recordBatchIndex = 0;
        this.dictionaries = dictionaries;
    }
    get numDictionaries() { return this.dictionaryIndex; }
    get numRecordBatches() { return this.recordBatchIndex; }
    reset(schema) {
        this.dictionaryIndex = 0;
        this.recordBatchIndex = 0;
        this.schema = schema;
        this.dictionaries = new Map();
        return this;
    }
    _loadRecordBatch(header, body) {
        return new RecordBatch(this.schema, header.length, this._loadVectors(header, body, this.schema.fields));
    }
    _loadDictionaryBatch(header, body) {
        const { id, isDelta, data } = header;
        const { dictionaries, schema } = this;
        if (isDelta || !dictionaries.get(id)) {
            const type = schema.dictionaries.get(id);
            const vector = (isDelta ? dictionaries.get(id).concat(Vector.new(this._loadVectors(data, body, [type])[0])) :
                Vector.new(this._loadVectors(data, body, [type])[0]));
            (schema.dictionaryFields.get(id) || []).forEach(({ type }) => type.dictionaryVector = vector);
            return vector;
        }
        return dictionaries.get(id);
    }
    _loadVectors(header, body, types) {
        return new VectorLoader(body, header.nodes, header.buffers).visitMany(types);
    }
}
/** @ignore */
class RecordBatchStreamReaderImpl extends RecordBatchReaderImplBase {
    constructor(reader, dictionaries = new Map()) {
        super(dictionaries);
        this.reader = reader;
    }
    [Symbol.iterator]() {
        return this;
    }
    close() {
        if (!this.closed && (this.closed = true)) {
            this.reset().reader.return();
            this.reader = null;
            this.dictionaries = null;
        }
        return this;
    }
    open(autoClose = this.autoClose) {
        if (!this.closed) {
            this.autoClose = autoClose;
            if (!(this.schema || (this.schema = this.reader.readSchema()))) {
                return this.close();
            }
        }
        return this;
    }
    throw(value) {
        if (!this.closed && this.autoClose && (this.closed = true)) {
            return this.reset().reader.throw(value);
        }
        return ITERATOR_DONE;
    }
    return(value) {
        if (!this.closed && this.autoClose && (this.closed = true)) {
            return this.reset().reader.return(value);
        }
        return ITERATOR_DONE;
    }
    next() {
        if (this.closed) {
            return ITERATOR_DONE;
        }
        let message, { reader } = this;
        while (message = this.readNextMessageAndValidate()) {
            if (message.isSchema()) {
                this.reset(message.header());
            }
            else if (message.isRecordBatch()) {
                this.recordBatchIndex++;
                const header = message.header();
                const buffer = reader.readMessageBody(message.bodyLength);
                const recordBatch = this._loadRecordBatch(header, buffer);
                return { done: false, value: recordBatch };
            }
            else if (message.isDictionaryBatch()) {
                this.dictionaryIndex++;
                const header = message.header();
                const buffer = reader.readMessageBody(message.bodyLength);
                const vector = this._loadDictionaryBatch(header, buffer);
                this.dictionaries.set(header.id, vector);
            }
        }
        return this.return();
    }
    readNextMessageAndValidate(type) {
        return this.reader.readMessage(type);
    }
}
/** @ignore */
class AsyncRecordBatchStreamReaderImpl extends RecordBatchReaderImplBase {
    constructor(reader, dictionaries = new Map()) {
        super(dictionaries);
        this.reader = reader;
    }
    [Symbol.asyncIterator]() {
        return this;
    }
    async close() {
        if (!this.closed && (this.closed = true)) {
            await this.reset().reader.return();
            this.reader = null;
            this.dictionaries = null;
        }
        return this;
    }
    async open(autoClose) {
        // default args in an async function crash closure-compiler at the moment
        // so do this instead. https://github.com/google/closure-compiler/issues/3178
        autoClose !== undefined || (autoClose = this.autoClose);
        if (!this.closed) {
            this.autoClose = autoClose;
            if (!(this.schema || (this.schema = (await this.reader.readSchema())))) {
                return this.close();
            }
        }
        return this;
    }
    async throw(value) {
        if (!this.closed && this.autoClose && (this.closed = true)) {
            return await this.reset().reader.throw(value);
        }
        return ITERATOR_DONE;
    }
    async return(value) {
        if (!this.closed && this.autoClose && (this.closed = true)) {
            return await this.reset().reader.return(value);
        }
        return ITERATOR_DONE;
    }
    async next() {
        if (this.closed) {
            return ITERATOR_DONE;
        }
        let message, { reader } = this;
        while (message = await this.readNextMessageAndValidate()) {
            if (message.isSchema()) {
                await this.reset(message.header());
            }
            else if (message.isRecordBatch()) {
                this.recordBatchIndex++;
                const header = message.header();
                const buffer = await reader.readMessageBody(message.bodyLength);
                const recordBatch = this._loadRecordBatch(header, buffer);
                return { done: false, value: recordBatch };
            }
            else if (message.isDictionaryBatch()) {
                this.dictionaryIndex++;
                const header = message.header();
                const buffer = await reader.readMessageBody(message.bodyLength);
                const vector = this._loadDictionaryBatch(header, buffer);
                this.dictionaries.set(header.id, vector);
            }
        }
        return await this.return();
    }
    async readNextMessageAndValidate(type) {
        return await this.reader.readMessage(type);
    }
}
/** @ignore */
class RecordBatchFileReaderImpl extends RecordBatchStreamReaderImpl {
    constructor(file, dictionaries = new Map()) {
        super(new MessageReader(file), dictionaries);
        this.file = file;
    }
    get numDictionaries() { return this.footer.numDictionaries; }
    get numRecordBatches() { return this.footer.numRecordBatches; }
    open(autoClose = this.autoClose) {
        if (!this.closed && !this.footer) {
            this.schema = (this.footer = this.readFooter()).schema;
            for (const block of this.footer.dictionaryBatches()) {
                block && this.readDictionaryBatch(this.dictionaryIndex++);
            }
        }
        return super.open(autoClose);
    }
    readRecordBatch(index) {
        if (this.closed) {
            return null;
        }
        if (!this.footer) {
            this.open();
        }
        const block = this.footer.getRecordBatch(index);
        if (block && this.file.seek(block.offset)) {
            const message = this.reader.readMessage(MessageHeader.RecordBatch);
            if (message && message.isRecordBatch()) {
                const header = message.header();
                const buffer = this.reader.readMessageBody(message.bodyLength);
                const recordBatch = this._loadRecordBatch(header, buffer);
                return recordBatch;
            }
        }
        return null;
    }
    readDictionaryBatch(index) {
        const block = this.footer.getDictionaryBatch(index);
        if (block && this.file.seek(block.offset)) {
            const message = this.reader.readMessage(MessageHeader.DictionaryBatch);
            if (message && message.isDictionaryBatch()) {
                const header = message.header();
                const buffer = this.reader.readMessageBody(message.bodyLength);
                const vector = this._loadDictionaryBatch(header, buffer);
                this.dictionaries.set(header.id, vector);
            }
        }
    }
    readFooter() {
        const { file } = this;
        const size = file.size;
        const offset = size - magicAndPadding;
        const length = file.readInt32(offset);
        const buffer = file.readAt(offset - length, length);
        return Footer.decode(buffer);
    }
    readNextMessageAndValidate(type) {
        if (!this.footer) {
            this.open();
        }
        if (this.recordBatchIndex < this.numRecordBatches) {
            const block = this.footer.getRecordBatch(this.recordBatchIndex);
            if (block && this.file.seek(block.offset)) {
                return this.reader.readMessage(type);
            }
        }
        return null;
    }
}
/** @ignore */
class AsyncRecordBatchFileReaderImpl extends AsyncRecordBatchStreamReaderImpl {
    constructor(file, dictionaries = new Map()) {
        super(new AsyncMessageReader(file), dictionaries);
        this.file = file;
    }
    get numDictionaries() { return this.footer.numDictionaries; }
    get numRecordBatches() { return this.footer.numRecordBatches; }
    async open(autoClose) {
        // default args in an async function crash closure-compiler at the moment
        // so do this instead. https://github.com/google/closure-compiler/issues/3178
        autoClose !== undefined || (autoClose = this.autoClose);
        if (!this.closed && !this.footer) {
            this.schema = (this.footer = await this.readFooter()).schema;
            for (const block of this.footer.dictionaryBatches()) {
                block && await this.readDictionaryBatch(this.dictionaryIndex++);
            }
        }
        return await super.open(autoClose);
    }
    async readRecordBatch(index) {
        if (this.closed) {
            return null;
        }
        if (!this.footer) {
            await this.open();
        }
        const block = this.footer.getRecordBatch(index);
        if (block && (await this.file.seek(block.offset))) {
            const message = await this.reader.readMessage(MessageHeader.RecordBatch);
            if (message && message.isRecordBatch()) {
                const header = message.header();
                const buffer = await this.reader.readMessageBody(message.bodyLength);
                const recordBatch = this._loadRecordBatch(header, buffer);
                return recordBatch;
            }
        }
        return null;
    }
    async readDictionaryBatch(index) {
        const block = this.footer.getDictionaryBatch(index);
        if (block && (await this.file.seek(block.offset))) {
            const message = await this.reader.readMessage(MessageHeader.DictionaryBatch);
            if (message && message.isDictionaryBatch()) {
                const header = message.header();
                const buffer = await this.reader.readMessageBody(message.bodyLength);
                const vector = this._loadDictionaryBatch(header, buffer);
                this.dictionaries.set(header.id, vector);
            }
        }
    }
    async readFooter() {
        const { file } = this;
        const offset = file.size - magicAndPadding;
        const length = await file.readInt32(offset);
        const buffer = await file.readAt(offset - length, length);
        return Footer.decode(buffer);
    }
    async readNextMessageAndValidate(type) {
        if (!this.footer) {
            await this.open();
        }
        if (this.recordBatchIndex < this.numRecordBatches) {
            const block = this.footer.getRecordBatch(this.recordBatchIndex);
            if (block && await this.file.seek(block.offset)) {
                return await this.reader.readMessage(type);
            }
        }
        return null;
    }
}
/** @ignore */
class RecordBatchJSONReaderImpl extends RecordBatchStreamReaderImpl {
    constructor(reader, dictionaries = new Map()) {
        super(reader, dictionaries);
        this.reader = reader;
    }
    _loadVectors(header, body, types) {
        return new JSONVectorLoader(body, header.nodes, header.buffers).visitMany(types);
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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SSxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDaEUsSUFBSSxLQUFLLElBQUksTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQzdDLE9BQU8sTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUM5QztTQUNKO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztDQUNKO0FBRUQsY0FBYztBQUNkLE1BQU0seUJBQXVFLFNBQVEsMkJBQThCO0lBQy9HLFlBQXNCLE1BQXlCLEVBQUUsWUFBWSxHQUFHLElBQUksR0FBRyxFQUFrQjtRQUNyRixLQUFLLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBRFYsV0FBTSxHQUFOLE1BQU0sQ0FBbUI7SUFFL0MsQ0FBQztJQUNTLFlBQVksQ0FBQyxNQUE0QixFQUFFLElBQVMsRUFBRSxLQUEyQjtRQUN2RixPQUFPLElBQUksZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNyRixDQUFDO0NBQ0oiLCJmaWxlIjoiaXBjL3JlYWRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBEYXRhVHlwZSB9IGZyb20gJy4uL3R5cGUnO1xuaW1wb3J0IHsgVmVjdG9yIH0gZnJvbSAnLi4vdmVjdG9yJztcbmltcG9ydCB7IE1lc3NhZ2VIZWFkZXIgfSBmcm9tICcuLi9lbnVtJztcbmltcG9ydCB7IEZvb3RlciB9IGZyb20gJy4vbWV0YWRhdGEvZmlsZSc7XG5pbXBvcnQgeyBTY2hlbWEsIEZpZWxkIH0gZnJvbSAnLi4vc2NoZW1hJztcbmltcG9ydCBzdHJlYW1BZGFwdGVycyBmcm9tICcuLi9pby9hZGFwdGVycyc7XG5pbXBvcnQgeyBNZXNzYWdlIH0gZnJvbSAnLi9tZXRhZGF0YS9tZXNzYWdlJztcbmltcG9ydCB7IFJlY29yZEJhdGNoIH0gZnJvbSAnLi4vcmVjb3JkYmF0Y2gnO1xuaW1wb3J0ICogYXMgbWV0YWRhdGEgZnJvbSAnLi9tZXRhZGF0YS9tZXNzYWdlJztcbmltcG9ydCB7IEJ5dGVTdHJlYW0sIEFzeW5jQnl0ZVN0cmVhbSB9IGZyb20gJy4uL2lvL3N0cmVhbSc7XG5pbXBvcnQgeyBBcnJheUJ1ZmZlclZpZXdJbnB1dCwgdG9VaW50OEFycmF5IH0gZnJvbSAnLi4vdXRpbC9idWZmZXInO1xuaW1wb3J0IHsgUmFuZG9tQWNjZXNzRmlsZSwgQXN5bmNSYW5kb21BY2Nlc3NGaWxlIH0gZnJvbSAnLi4vaW8vZmlsZSc7XG5pbXBvcnQgeyBWZWN0b3JMb2FkZXIsIEpTT05WZWN0b3JMb2FkZXIgfSBmcm9tICcuLi92aXNpdG9yL3ZlY3RvcmxvYWRlcic7XG5pbXBvcnQgeyBBcnJvd0pTT04sIEFycm93SlNPTkxpa2UsIEZpbGVIYW5kbGUsIFJlYWRhYmxlSW50ZXJvcCwgSVRFUkFUT1JfRE9ORSB9IGZyb20gJy4uL2lvL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgaXNQcm9taXNlLCBpc0Fycm93SlNPTiwgaXNGaWxlSGFuZGxlLCBpc0ZldGNoUmVzcG9uc2UsIGlzQXN5bmNJdGVyYWJsZSwgaXNSZWFkYWJsZURPTVN0cmVhbSwgaXNSZWFkYWJsZU5vZGVTdHJlYW0gfSBmcm9tICcuLi91dGlsL2NvbXBhdCc7XG5pbXBvcnQgeyBNZXNzYWdlUmVhZGVyLCBBc3luY01lc3NhZ2VSZWFkZXIsIGNoZWNrRm9yTWFnaWNBcnJvd1N0cmluZywgbWFnaWNMZW5ndGgsIG1hZ2ljQW5kUGFkZGluZywgbWFnaWNYMkFuZFBhZGRpbmcsIEpTT05NZXNzYWdlUmVhZGVyIH0gZnJvbSAnLi9tZXNzYWdlJztcblxuLyoqIEBpZ25vcmUgKi8gZXhwb3J0IHR5cGUgRnJvbUFyZzAgPSBBcnJvd0pTT05MaWtlO1xuLyoqIEBpZ25vcmUgKi8gZXhwb3J0IHR5cGUgRnJvbUFyZzEgPSBQcm9taXNlTGlrZTxBcnJvd0pTT05MaWtlPjtcbi8qKiBAaWdub3JlICovIGV4cG9ydCB0eXBlIEZyb21BcmcyID0gSXRlcmFibGU8QXJyYXlCdWZmZXJWaWV3SW5wdXQ+IHwgQXJyYXlCdWZmZXJWaWV3SW5wdXQ7XG4vKiogQGlnbm9yZSAqLyBleHBvcnQgdHlwZSBGcm9tQXJnMyA9IFByb21pc2VMaWtlPEl0ZXJhYmxlPEFycmF5QnVmZmVyVmlld0lucHV0PiB8IEFycmF5QnVmZmVyVmlld0lucHV0Pjtcbi8qKiBAaWdub3JlICovIGV4cG9ydCB0eXBlIEZyb21Bcmc0ID0gTm9kZUpTLlJlYWRhYmxlU3RyZWFtIHwgUmVhZGFibGVTdHJlYW08QXJyYXlCdWZmZXJWaWV3SW5wdXQ+IHwgQXN5bmNJdGVyYWJsZTxBcnJheUJ1ZmZlclZpZXdJbnB1dD47XG4vKiogQGlnbm9yZSAqLyBleHBvcnQgdHlwZSBGcm9tQXJnNSA9IFJlc3BvbnNlIHwgRmlsZUhhbmRsZSB8IFByb21pc2VMaWtlPEZpbGVIYW5kbGU+IHwgUHJvbWlzZUxpa2U8UmVzcG9uc2U+O1xuLyoqIEBpZ25vcmUgKi8gZXhwb3J0IHR5cGUgRnJvbUFyZ3MgPSBGcm9tQXJnMCB8IEZyb21BcmcxIHwgRnJvbUFyZzIgfCBGcm9tQXJnMyB8IEZyb21Bcmc0IHwgRnJvbUFyZzU7XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBSZWNvcmRCYXRjaFJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlYWRhYmxlSW50ZXJvcDxSZWNvcmRCYXRjaDxUPj4ge1xuXG4gICAgcHJvdGVjdGVkIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBpbXBsOiBJUmVjb3JkQmF0Y2hSZWFkZXJJbXBsPFQ+KSB7IHN1cGVyKCk7IH1cblxuICAgIHB1YmxpYyBnZXQgY2xvc2VkKCkgeyByZXR1cm4gdGhpcy5pbXBsLmNsb3NlZDsgfVxuICAgIHB1YmxpYyBnZXQgc2NoZW1hKCkgeyByZXR1cm4gdGhpcy5pbXBsLnNjaGVtYTsgfVxuICAgIHB1YmxpYyBnZXQgYXV0b0Nsb3NlKCkgeyByZXR1cm4gdGhpcy5pbXBsLmF1dG9DbG9zZTsgfVxuICAgIHB1YmxpYyBnZXQgZGljdGlvbmFyaWVzKCkgeyByZXR1cm4gdGhpcy5pbXBsLmRpY3Rpb25hcmllczsgfVxuICAgIHB1YmxpYyBnZXQgbnVtRGljdGlvbmFyaWVzKCkgeyByZXR1cm4gdGhpcy5pbXBsLm51bURpY3Rpb25hcmllczsgfVxuICAgIHB1YmxpYyBnZXQgbnVtUmVjb3JkQmF0Y2hlcygpIHsgcmV0dXJuIHRoaXMuaW1wbC5udW1SZWNvcmRCYXRjaGVzOyB9XG5cbiAgICBwdWJsaWMgbmV4dCh2YWx1ZT86IGFueSkgeyByZXR1cm4gdGhpcy5pbXBsLm5leHQodmFsdWUpOyB9XG4gICAgcHVibGljIHRocm93KHZhbHVlPzogYW55KSB7IHJldHVybiB0aGlzLmltcGwudGhyb3codmFsdWUpOyB9XG4gICAgcHVibGljIHJldHVybih2YWx1ZT86IGFueSkgeyByZXR1cm4gdGhpcy5pbXBsLnJldHVybih2YWx1ZSk7IH1cbiAgICBwdWJsaWMgcmVzZXQoc2NoZW1hPzogU2NoZW1hPFQ+IHwgbnVsbCkgeyB0aGlzLmltcGwucmVzZXQoc2NoZW1hKTsgcmV0dXJuIHRoaXM7IH1cblxuICAgIHB1YmxpYyBhYnN0cmFjdCBjYW5jZWwoKTogdm9pZCB8IFByb21pc2U8dm9pZD47XG4gICAgcHVibGljIGFic3RyYWN0IG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbik6IHRoaXMgfCBQcm9taXNlPHRoaXM+O1xuICAgIHB1YmxpYyBhYnN0cmFjdCBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PjtcbiAgICBwdWJsaWMgYWJzdHJhY3QgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+O1xuXG4gICAgcHVibGljIHRvUmVhZGFibGVET01TdHJlYW0oKSB7XG4gICAgICAgIHJldHVybiBzdHJlYW1BZGFwdGVycy50b1JlYWRhYmxlRE9NU3RyZWFtPFJlY29yZEJhdGNoPFQ+PihcbiAgICAgICAgICAgICh0aGlzLmlzU3luYygpXG4gICAgICAgICAgICAgICAgPyB7IFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiB0aGlzIH0gYXMgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+XG4gICAgICAgICAgICAgICAgOiB7IFtTeW1ib2wuYXN5bmNJdGVyYXRvcl06ICgpID0+IHRoaXMgfSBhcyBBc3luY0l0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+PikpO1xuICAgIH1cbiAgICBwdWJsaWMgdG9SZWFkYWJsZU5vZGVTdHJlYW0oKSB7XG4gICAgICAgIHJldHVybiBzdHJlYW1BZGFwdGVycy50b1JlYWRhYmxlTm9kZVN0cmVhbTxSZWNvcmRCYXRjaDxUPj4oXG4gICAgICAgICAgICAodGhpcy5pc1N5bmMoKVxuICAgICAgICAgICAgICAgID8geyBbU3ltYm9sLml0ZXJhdG9yXTogKCkgPT4gdGhpcyB9IGFzIEl0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+PlxuICAgICAgICAgICAgICAgIDogeyBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdOiAoKSA9PiB0aGlzIH0gYXMgQXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pLFxuICAgICAgICAgICAgeyBvYmplY3RNb2RlOiB0cnVlIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyBpc1N5bmMoKTogdGhpcyBpcyBSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4gfCBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPiB7XG4gICAgICAgIHJldHVybiAodGhpcyBpbnN0YW5jZW9mIFJlY29yZEJhdGNoRmlsZVJlYWRlcikgfHwgKHRoaXMgaW5zdGFuY2VvZiBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcik7XG4gICAgfVxuICAgIHB1YmxpYyBpc0FzeW5jKCk6IHRoaXMgaXMgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4gfCBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+IHtcbiAgICAgICAgcmV0dXJuICh0aGlzIGluc3RhbmNlb2YgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXIpIHx8ICh0aGlzIGluc3RhbmNlb2YgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcik7XG4gICAgfVxuICAgIHB1YmxpYyBpc0ZpbGUoKTogdGhpcyBpcyBSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4gfCBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB7XG4gICAgICAgIHJldHVybiAodGhpcyBpbnN0YW5jZW9mIFJlY29yZEJhdGNoRmlsZVJlYWRlcikgfHwgKHRoaXMgaW5zdGFuY2VvZiBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcik7XG4gICAgfVxuICAgIHB1YmxpYyBpc1N0cmVhbSgpOiB0aGlzIGlzIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+IHwgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPiB7XG4gICAgICAgIHJldHVybiAodGhpcyBpbnN0YW5jZW9mIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyKSB8fCAodGhpcyBpbnN0YW5jZW9mIEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXIpO1xuICAgIH1cblxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgdGhyb3VnaE5vZGUoKTogaW1wb3J0KCdzdHJlYW0nKS5EdXBsZXggeyB0aHJvdyBuZXcgRXJyb3IoYFwidGhyb3VnaE5vZGVcIiBub3QgYXZhaWxhYmxlIGluIHRoaXMgZW52aXJvbm1lbnRgKTsgfVxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgdGhyb3VnaERPTTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9PigpOiB7IHdyaXRhYmxlOiBXcml0YWJsZVN0cmVhbTxVaW50OEFycmF5PiwgcmVhZGFibGU6IFJlYWRhYmxlU3RyZWFtPFJlY29yZEJhdGNoPFQ+PiB9IHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBcInRocm91Z2hET01cIiBub3QgYXZhaWxhYmxlIGluIHRoaXMgZW52aXJvbm1lbnRgKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIFJlY29yZEJhdGNoUmVhZGVyPihzb3VyY2U6IFQpOiBUO1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IEZyb21BcmcwKTogUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogRnJvbUFyZzEpOiBQcm9taXNlPFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+PjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBGcm9tQXJnMik6IFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IEZyb21BcmczKTogUHJvbWlzZTxSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4gfCBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPj47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogRnJvbUFyZzQpOiBQcm9taXNlPFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IEZyb21Bcmc1KTogUHJvbWlzZTxBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4+O1xuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IGFueSkge1xuICAgICAgICBpZiAoc291cmNlIGluc3RhbmNlb2YgUmVjb3JkQmF0Y2hSZWFkZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBzb3VyY2U7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBcnJvd0pTT04oc291cmNlKSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlY29yZEJhdGNoUmVhZGVyLmZyb21KU09OPFQ+KHNvdXJjZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNGaWxlSGFuZGxlKHNvdXJjZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBSZWNvcmRCYXRjaFJlYWRlci5mcm9tRmlsZUhhbmRsZTxUPihzb3VyY2UpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzUHJvbWlzZTxhbnk+KHNvdXJjZSkpIHtcbiAgICAgICAgICAgIHJldHVybiAoYXN5bmMgKCkgPT4gYXdhaXQgUmVjb3JkQmF0Y2hSZWFkZXIuZnJvbTxhbnk+KGF3YWl0IHNvdXJjZSkpKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNGZXRjaFJlc3BvbnNlKHNvdXJjZSkgfHwgaXNSZWFkYWJsZURPTVN0cmVhbShzb3VyY2UpIHx8IGlzUmVhZGFibGVOb2RlU3RyZWFtKHNvdXJjZSkgfHwgaXNBc3luY0l0ZXJhYmxlKHNvdXJjZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBSZWNvcmRCYXRjaFJlYWRlci5mcm9tQXN5bmNCeXRlU3RyZWFtPFQ+KG5ldyBBc3luY0J5dGVTdHJlYW0oc291cmNlKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFJlY29yZEJhdGNoUmVhZGVyLmZyb21CeXRlU3RyZWFtPFQ+KG5ldyBCeXRlU3RyZWFtKHNvdXJjZSkpO1xuICAgIH1cbiAgICBwcml2YXRlIHN0YXRpYyBmcm9tSlNPTjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9Pihzb3VyY2U6IEFycm93SlNPTkxpa2UpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPihuZXcgQXJyb3dKU09OKHNvdXJjZSkpO1xuICAgIH1cbiAgICBwcml2YXRlIHN0YXRpYyBmcm9tQnl0ZVN0cmVhbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9Pihzb3VyY2U6IEJ5dGVTdHJlYW0pIHtcbiAgICAgICAgY29uc3QgYnl0ZXMgPSBzb3VyY2UucGVlaygobWFnaWNMZW5ndGggKyA3KSAmIH43KTtcbiAgICAgICAgcmV0dXJuIGJ5dGVzICYmIGJ5dGVzLmJ5dGVMZW5ndGggPj0gNFxuICAgICAgICAgICAgPyBjaGVja0Zvck1hZ2ljQXJyb3dTdHJpbmcoYnl0ZXMpXG4gICAgICAgICAgICA/IG5ldyBSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4oc291cmNlLnJlYWQoKSlcbiAgICAgICAgICAgIDogbmV3IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+KHNvdXJjZSlcbiAgICAgICAgICAgIDogbmV3IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+KGZ1bmN0aW9uKigpOiBhbnkge30oKSk7XG4gICAgfVxuICAgIHByaXZhdGUgc3RhdGljIGFzeW5jIGZyb21Bc3luY0J5dGVTdHJlYW08VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfT4oc291cmNlOiBBc3luY0J5dGVTdHJlYW0pIHtcbiAgICAgICAgY29uc3QgYnl0ZXMgPSBhd2FpdCBzb3VyY2UucGVlaygobWFnaWNMZW5ndGggKyA3KSAmIH43KTtcbiAgICAgICAgcmV0dXJuIGJ5dGVzICYmIGJ5dGVzLmJ5dGVMZW5ndGggPj0gNFxuICAgICAgICAgICAgPyBjaGVja0Zvck1hZ2ljQXJyb3dTdHJpbmcoYnl0ZXMpXG4gICAgICAgICAgICA/IG5ldyBSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4oYXdhaXQgc291cmNlLnJlYWQoKSlcbiAgICAgICAgICAgIDogbmV3IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4oc291cmNlKVxuICAgICAgICAgICAgOiBuZXcgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPihhc3luYyBmdW5jdGlvbiooKTogYW55IHt9KCkpO1xuICAgIH1cbiAgICBwcml2YXRlIHN0YXRpYyBhc3luYyBmcm9tRmlsZUhhbmRsZTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9Pihzb3VyY2U6IEZpbGVIYW5kbGUpIHtcbiAgICAgICAgY29uc3QgeyBzaXplIH0gPSBhd2FpdCBzb3VyY2Uuc3RhdCgpO1xuICAgICAgICBjb25zdCBmaWxlID0gbmV3IEFzeW5jUmFuZG9tQWNjZXNzRmlsZShzb3VyY2UsIHNpemUpO1xuICAgICAgICBpZiAoc2l6ZSA+PSBtYWdpY1gyQW5kUGFkZGluZykge1xuICAgICAgICAgICAgaWYgKGNoZWNrRm9yTWFnaWNBcnJvd1N0cmluZyhhd2FpdCBmaWxlLnJlYWRBdCgwLCAobWFnaWNMZW5ndGggKyA3KSAmIH43KSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+KGZpbGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPihmaWxlKTtcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY2xhc3MgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXI8VD4ge1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwcm90ZWN0ZWQgaW1wbDogUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUPjtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUPik7XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBSYW5kb21BY2Nlc3NGaWxlLCBkaWN0aW9uYXJpZXM/OiBNYXA8bnVtYmVyLCBWZWN0b3I+KTtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEFycmF5QnVmZmVyVmlld0lucHV0LCBkaWN0aW9uYXJpZXM/OiBNYXA8bnVtYmVyLCBWZWN0b3I+KTtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUPiB8IFJhbmRvbUFjY2Vzc0ZpbGUgfCBBcnJheUJ1ZmZlclZpZXdJbnB1dCwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgVmVjdG9yPikge1xuICAgICAgICBpZiAoc291cmNlIGluc3RhbmNlb2YgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsKSB7XG4gICAgICAgICAgICBzdXBlcihzb3VyY2UpO1xuICAgICAgICB9IGVsc2UgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIFJhbmRvbUFjY2Vzc0ZpbGUpIHtcbiAgICAgICAgICAgIHN1cGVyKG5ldyBSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsKHNvdXJjZSwgZGljdGlvbmFyaWVzKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdXBlcihuZXcgUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbChuZXcgUmFuZG9tQWNjZXNzRmlsZSh0b1VpbnQ4QXJyYXkoc291cmNlKSksIGRpY3Rpb25hcmllcykpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHB1YmxpYyBnZXQgZm9vdGVyKCkgeyByZXR1cm4gdGhpcy5pbXBsLmZvb3RlcjsgfVxuICAgIHB1YmxpYyBjYW5jZWwoKSB7IHRoaXMuaW1wbC5jbG9zZSgpOyB9XG4gICAgcHVibGljIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbikgeyB0aGlzLmltcGwub3BlbihhdXRvQ2xvc2UpOyByZXR1cm4gdGhpczsgfVxuICAgIHB1YmxpYyByZWFkUmVjb3JkQmF0Y2goaW5kZXg6IG51bWJlcikgeyByZXR1cm4gdGhpcy5pbXBsLnJlYWRSZWNvcmRCYXRjaChpbmRleCk7IH1cbiAgICBwdWJsaWMgW1N5bWJvbC5pdGVyYXRvcl0oKSB7IHJldHVybiAodGhpcy5pbXBsIGFzIEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+KVtTeW1ib2wuaXRlcmF0b3JdKCk7IH1cbiAgICBwdWJsaWMgYXN5bmMgKltTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7IHlpZWxkKiB0aGlzW1N5bWJvbC5pdGVyYXRvcl0oKTsgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXI8VD4ge1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwcm90ZWN0ZWQgaW1wbDogUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+O1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogQnl0ZVN0cmVhbSB8IEFycm93SlNPTiB8IEFycmF5QnVmZmVyVmlldyB8IEl0ZXJhYmxlPEFycmF5QnVmZmVyVmlldz4sIGRpY3Rpb25hcmllcz86IE1hcDxudW1iZXIsIFZlY3Rvcj4pIHtcbiAgICAgICAgc3VwZXIoaXNBcnJvd0pTT04oc291cmNlKVxuICAgICAgICAgICAgPyBuZXcgUmVjb3JkQmF0Y2hKU09OUmVhZGVySW1wbChuZXcgSlNPTk1lc3NhZ2VSZWFkZXIoc291cmNlKSwgZGljdGlvbmFyaWVzKVxuICAgICAgICAgICAgOiBuZXcgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsKG5ldyBNZXNzYWdlUmVhZGVyKHNvdXJjZSksIGRpY3Rpb25hcmllcykpO1xuICAgIH1cbiAgICBwdWJsaWMgY2FuY2VsKCkgeyB0aGlzLmltcGwuY2xvc2UoKTsgfVxuICAgIHB1YmxpYyBvcGVuKGF1dG9DbG9zZT86IGJvb2xlYW4pIHsgdGhpcy5pbXBsLm9wZW4oYXV0b0Nsb3NlKTsgcmV0dXJuIHRoaXM7IH1cbiAgICBwdWJsaWMgW1N5bWJvbC5pdGVyYXRvcl0oKSB7IHJldHVybiAodGhpcy5pbXBsIGFzIEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+KVtTeW1ib2wuaXRlcmF0b3JdKCk7IH1cbiAgICBwdWJsaWMgYXN5bmMgKltTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7IHlpZWxkKiB0aGlzW1N5bWJvbC5pdGVyYXRvcl0oKTsgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlcjxUPiB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHByb3RlY3RlZCBpbXBsOiBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUPjtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEFzeW5jQnl0ZVN0cmVhbSB8IEZpbGVIYW5kbGUgfCBOb2RlSlMuUmVhZGFibGVTdHJlYW0gfCBSZWFkYWJsZVN0cmVhbTxBcnJheUJ1ZmZlclZpZXc+IHwgQXN5bmNJdGVyYWJsZTxBcnJheUJ1ZmZlclZpZXc+LCBieXRlTGVuZ3RoPzogbnVtYmVyKSB7XG4gICAgICAgIHN1cGVyKG5ldyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbChuZXcgQXN5bmNNZXNzYWdlUmVhZGVyKHNvdXJjZSBhcyBGaWxlSGFuZGxlLCBieXRlTGVuZ3RoKSkpO1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgY2FuY2VsKCkgeyBhd2FpdCB0aGlzLmltcGwuY2xvc2UoKTsgfVxuICAgIHB1YmxpYyBhc3luYyBvcGVuKGF1dG9DbG9zZT86IGJvb2xlYW4pIHsgYXdhaXQgdGhpcy5pbXBsLm9wZW4oYXV0b0Nsb3NlKTsgcmV0dXJuIHRoaXM7IH1cbiAgICBwdWJsaWMgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpIHsgcmV0dXJuICh0aGlzLmltcGwgYXMgQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PilbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk7IH1cbiAgICBwdWJsaWMgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4geyB0aHJvdyBuZXcgRXJyb3IoYEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXIgaXMgbm90IEl0ZXJhYmxlYCk7IH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjbGFzcyBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoUmVhZGVyPFQ+IHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHJvdGVjdGVkIGltcGw6IEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUPjtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEFzeW5jUmFuZG9tQWNjZXNzRmlsZSk7XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBBc3luY1JhbmRvbUFjY2Vzc0ZpbGUsIGRpY3Rpb25hcmllczogTWFwPG51bWJlciwgVmVjdG9yPik7XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBGaWxlSGFuZGxlLCBieXRlTGVuZ3RoOiBudW1iZXIsIGRpY3Rpb25hcmllczogTWFwPG51bWJlciwgVmVjdG9yPik7XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBBc3luY1JhbmRvbUFjY2Vzc0ZpbGUgfCBGaWxlSGFuZGxlLCAuLi5yZXN0OiAobnVtYmVyIHwgTWFwPG51bWJlciwgVmVjdG9yPilbXSkge1xuICAgICAgICBsZXQgW2J5dGVMZW5ndGgsIGRpY3Rpb25hcmllc10gPSByZXN0IGFzIFtudW1iZXIsIE1hcDxudW1iZXIsIFZlY3Rvcj5dO1xuICAgICAgICBpZiAoYnl0ZUxlbmd0aCAmJiB0eXBlb2YgYnl0ZUxlbmd0aCAhPT0gJ251bWJlcicpIHsgZGljdGlvbmFyaWVzID0gYnl0ZUxlbmd0aDsgfVxuICAgICAgICBsZXQgZmlsZSA9IHNvdXJjZSBpbnN0YW5jZW9mIEFzeW5jUmFuZG9tQWNjZXNzRmlsZSA/IHNvdXJjZSA6IG5ldyBBc3luY1JhbmRvbUFjY2Vzc0ZpbGUoc291cmNlLCBieXRlTGVuZ3RoKTtcbiAgICAgICAgc3VwZXIobmV3IEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbChmaWxlLCBkaWN0aW9uYXJpZXMpKTtcbiAgICB9XG4gICAgcHVibGljIGdldCBmb290ZXIoKSB7IHJldHVybiB0aGlzLmltcGwuZm9vdGVyOyB9XG4gICAgcHVibGljIGFzeW5jIGNhbmNlbCgpIHsgYXdhaXQgdGhpcy5pbXBsLmNsb3NlKCk7IH1cbiAgICBwdWJsaWMgYXN5bmMgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKSB7IGF3YWl0IHRoaXMuaW1wbC5vcGVuKGF1dG9DbG9zZSk7IHJldHVybiB0aGlzOyB9XG4gICAgcHVibGljIHJlYWRSZWNvcmRCYXRjaChpbmRleDogbnVtYmVyKSB7IHJldHVybiB0aGlzLmltcGwucmVhZFJlY29yZEJhdGNoKGluZGV4KTsgfVxuICAgIHB1YmxpYyBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCkgeyByZXR1cm4gKHRoaXMuaW1wbCBhcyBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+KVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTsgfVxuICAgIHB1YmxpYyBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7IHRocm93IG5ldyBFcnJvcihgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXIgaXMgbm90IEl0ZXJhYmxlYCk7IH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmFic3RyYWN0IGNsYXNzIFJlY29yZEJhdGNoUmVhZGVySW1wbEJhc2U8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4ge1xuXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyBzY2hlbWE6IFNjaGVtYTtcbiAgICBwdWJsaWMgY2xvc2VkID0gZmFsc2U7XG4gICAgcHVibGljIGF1dG9DbG9zZSA9IHRydWU7XG4gICAgcHVibGljIGRpY3Rpb25hcnlJbmRleCA9IDA7XG4gICAgcHVibGljIHJlY29yZEJhdGNoSW5kZXggPSAwO1xuICAgIHB1YmxpYyBkaWN0aW9uYXJpZXM6IE1hcDxudW1iZXIsIFZlY3Rvcj47XG4gICAgcHVibGljIGdldCBudW1EaWN0aW9uYXJpZXMoKSB7IHJldHVybiB0aGlzLmRpY3Rpb25hcnlJbmRleDsgfVxuICAgIHB1YmxpYyBnZXQgbnVtUmVjb3JkQmF0Y2hlcygpIHsgcmV0dXJuIHRoaXMucmVjb3JkQmF0Y2hJbmRleDsgfVxuXG4gICAgY29uc3RydWN0b3IoZGljdGlvbmFyaWVzID0gbmV3IE1hcDxudW1iZXIsIFZlY3Rvcj4oKSkge1xuICAgICAgICB0aGlzLmRpY3Rpb25hcmllcyA9IGRpY3Rpb25hcmllcztcbiAgICB9XG4gICAgcHVibGljIHJlc2V0KHNjaGVtYT86IFNjaGVtYTxUPiB8IG51bGwpIHtcbiAgICAgICAgdGhpcy5kaWN0aW9uYXJ5SW5kZXggPSAwO1xuICAgICAgICB0aGlzLnJlY29yZEJhdGNoSW5kZXggPSAwO1xuICAgICAgICB0aGlzLnNjaGVtYSA9IDxhbnk+IHNjaGVtYTtcbiAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMgPSBuZXcgTWFwKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgX2xvYWRSZWNvcmRCYXRjaChoZWFkZXI6IG1ldGFkYXRhLlJlY29yZEJhdGNoLCBib2R5OiBhbnkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZWNvcmRCYXRjaDxUPih0aGlzLnNjaGVtYSwgaGVhZGVyLmxlbmd0aCwgdGhpcy5fbG9hZFZlY3RvcnMoaGVhZGVyLCBib2R5LCB0aGlzLnNjaGVtYS5maWVsZHMpKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIF9sb2FkRGljdGlvbmFyeUJhdGNoKGhlYWRlcjogbWV0YWRhdGEuRGljdGlvbmFyeUJhdGNoLCBib2R5OiBhbnkpIHtcbiAgICAgICAgY29uc3QgeyBpZCwgaXNEZWx0YSwgZGF0YSB9ID0gaGVhZGVyO1xuICAgICAgICBjb25zdCB7IGRpY3Rpb25hcmllcywgc2NoZW1hIH0gPSB0aGlzO1xuICAgICAgICBpZiAoaXNEZWx0YSB8fCAhZGljdGlvbmFyaWVzLmdldChpZCkpIHtcblxuICAgICAgICAgICAgY29uc3QgdHlwZSA9IHNjaGVtYS5kaWN0aW9uYXJpZXMuZ2V0KGlkKSE7XG4gICAgICAgICAgICBjb25zdCB2ZWN0b3IgPSAoaXNEZWx0YSA/IGRpY3Rpb25hcmllcy5nZXQoaWQpIS5jb25jYXQoXG4gICAgICAgICAgICAgICAgVmVjdG9yLm5ldyh0aGlzLl9sb2FkVmVjdG9ycyhkYXRhLCBib2R5LCBbdHlwZV0pWzBdKSkgOlxuICAgICAgICAgICAgICAgIFZlY3Rvci5uZXcodGhpcy5fbG9hZFZlY3RvcnMoZGF0YSwgYm9keSwgW3R5cGVdKVswXSkpIGFzIFZlY3RvcjtcblxuICAgICAgICAgICAgKHNjaGVtYS5kaWN0aW9uYXJ5RmllbGRzLmdldChpZCkgfHwgW10pLmZvckVhY2goKHsgdHlwZSB9KSA9PiB0eXBlLmRpY3Rpb25hcnlWZWN0b3IgPSB2ZWN0b3IpO1xuXG4gICAgICAgICAgICByZXR1cm4gdmVjdG9yO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkaWN0aW9uYXJpZXMuZ2V0KGlkKSE7XG4gICAgfVxuICAgIHByb3RlY3RlZCBfbG9hZFZlY3RvcnMoaGVhZGVyOiBtZXRhZGF0YS5SZWNvcmRCYXRjaCwgYm9keTogYW55LCB0eXBlczogKEZpZWxkIHwgRGF0YVR5cGUpW10pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWN0b3JMb2FkZXIoYm9keSwgaGVhZGVyLm5vZGVzLCBoZWFkZXIuYnVmZmVycykudmlzaXRNYW55KHR5cGVzKTtcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5jbGFzcyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT5cbiAgICBleHRlbmRzIFJlY29yZEJhdGNoUmVhZGVySW1wbEJhc2U8VD5cbiAgICAgICAgaW1wbGVtZW50cyBJUmVjb3JkQmF0Y2hSZWFkZXJJbXBsPFQ+LCBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7XG5cbiAgICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgcmVhZGVyOiBNZXNzYWdlUmVhZGVyLCBkaWN0aW9uYXJpZXMgPSBuZXcgTWFwPG51bWJlciwgVmVjdG9yPigpKSB7XG4gICAgICAgIHN1cGVyKGRpY3Rpb25hcmllcyk7XG4gICAgfVxuICAgIHB1YmxpYyBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7XG4gICAgICAgIHJldHVybiB0aGlzIGFzIEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+O1xuICAgIH1cbiAgICBwdWJsaWMgY2xvc2UoKSB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQgJiYgKHRoaXMuY2xvc2VkID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgIHRoaXMucmVzZXQoKS5yZWFkZXIucmV0dXJuKCk7XG4gICAgICAgICAgICB0aGlzLnJlYWRlciA9IDxhbnk+IG51bGw7XG4gICAgICAgICAgICB0aGlzLmRpY3Rpb25hcmllcyA9IDxhbnk+IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHB1YmxpYyBvcGVuKGF1dG9DbG9zZSA9IHRoaXMuYXV0b0Nsb3NlKSB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQpIHtcbiAgICAgICAgICAgIHRoaXMuYXV0b0Nsb3NlID0gYXV0b0Nsb3NlO1xuICAgICAgICAgICAgaWYgKCEodGhpcy5zY2hlbWEgfHwgKHRoaXMuc2NoZW1hID0gdGhpcy5yZWFkZXIucmVhZFNjaGVtYSgpISkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHVibGljIHRocm93KHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8YW55PiB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQgJiYgdGhpcy5hdXRvQ2xvc2UgJiYgKHRoaXMuY2xvc2VkID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlc2V0KCkucmVhZGVyLnRocm93KHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gSVRFUkFUT1JfRE9ORTtcbiAgICB9XG4gICAgcHVibGljIHJldHVybih2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PGFueT4ge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkICYmIHRoaXMuYXV0b0Nsb3NlICYmICh0aGlzLmNsb3NlZCA9IHRydWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZXNldCgpLnJlYWRlci5yZXR1cm4odmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBJVEVSQVRPUl9ET05FO1xuICAgIH1cbiAgICBwdWJsaWMgbmV4dCgpOiBJdGVyYXRvclJlc3VsdDxSZWNvcmRCYXRjaDxUPj4ge1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpIHsgcmV0dXJuIElURVJBVE9SX0RPTkU7IH1cbiAgICAgICAgbGV0IG1lc3NhZ2U6IE1lc3NhZ2UgfCBudWxsLCB7IHJlYWRlciB9ID0gdGhpcztcbiAgICAgICAgd2hpbGUgKG1lc3NhZ2UgPSB0aGlzLnJlYWROZXh0TWVzc2FnZUFuZFZhbGlkYXRlKCkpIHtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmlzU2NoZW1hKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlc2V0KG1lc3NhZ2UuaGVhZGVyKCkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmlzUmVjb3JkQmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVjb3JkQmF0Y2hJbmRleCsrO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IG1lc3NhZ2UuaGVhZGVyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gcmVhZGVyLnJlYWRNZXNzYWdlQm9keShtZXNzYWdlLmJvZHlMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZEJhdGNoID0gdGhpcy5fbG9hZFJlY29yZEJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBkb25lOiBmYWxzZSwgdmFsdWU6IHJlY29yZEJhdGNoIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuaXNEaWN0aW9uYXJ5QmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyeUluZGV4Kys7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSByZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdmVjdG9yID0gdGhpcy5fbG9hZERpY3Rpb25hcnlCYXRjaChoZWFkZXIsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMuc2V0KGhlYWRlci5pZCwgdmVjdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5yZXR1cm4oKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHJlYWROZXh0TWVzc2FnZUFuZFZhbGlkYXRlPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyPih0eXBlPzogVCB8IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVhZGVyLnJlYWRNZXNzYWdlPFQ+KHR5cGUpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmNsYXNzIEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+XG4gICAgZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlckltcGxCYXNlPFQ+XG4gICAgICAgIGltcGxlbWVudHMgSVJlY29yZEJhdGNoUmVhZGVySW1wbDxUPiwgQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7XG5cbiAgICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgcmVhZGVyOiBBc3luY01lc3NhZ2VSZWFkZXIsIGRpY3Rpb25hcmllcyA9IG5ldyBNYXA8bnVtYmVyLCBWZWN0b3I+KCkpIHtcbiAgICAgICAgc3VwZXIoZGljdGlvbmFyaWVzKTtcbiAgICB9XG4gICAgcHVibGljIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7XG4gICAgICAgIHJldHVybiB0aGlzIGFzIEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj47XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyBjbG9zZSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiAodGhpcy5jbG9zZWQgPSB0cnVlKSkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5yZXNldCgpLnJlYWRlci5yZXR1cm4oKTtcbiAgICAgICAgICAgIHRoaXMucmVhZGVyID0gPGFueT4gbnVsbDtcbiAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyaWVzID0gPGFueT4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHVibGljIGFzeW5jIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbikge1xuICAgICAgICAvLyBkZWZhdWx0IGFyZ3MgaW4gYW4gYXN5bmMgZnVuY3Rpb24gY3Jhc2ggY2xvc3VyZS1jb21waWxlciBhdCB0aGUgbW9tZW50XG4gICAgICAgIC8vIHNvIGRvIHRoaXMgaW5zdGVhZC4gaHR0cHM6Ly9naXRodWIuY29tL2dvb2dsZS9jbG9zdXJlLWNvbXBpbGVyL2lzc3Vlcy8zMTc4XG4gICAgICAgIGF1dG9DbG9zZSAhPT0gdW5kZWZpbmVkIHx8IChhdXRvQ2xvc2UgPSB0aGlzLmF1dG9DbG9zZSk7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQpIHtcbiAgICAgICAgICAgIHRoaXMuYXV0b0Nsb3NlID0gYXV0b0Nsb3NlO1xuICAgICAgICAgICAgaWYgKCEodGhpcy5zY2hlbWEgfHwgKHRoaXMuc2NoZW1hID0gKGF3YWl0IHRoaXMucmVhZGVyLnJlYWRTY2hlbWEoKSkhKSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgdGhyb3codmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+IHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiB0aGlzLmF1dG9DbG9zZSAmJiAodGhpcy5jbG9zZWQgPSB0cnVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVzZXQoKS5yZWFkZXIudGhyb3codmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBJVEVSQVRPUl9ET05FO1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgcmV0dXJuKHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxhbnk+PiB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQgJiYgdGhpcy5hdXRvQ2xvc2UgJiYgKHRoaXMuY2xvc2VkID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJlc2V0KCkucmVhZGVyLnJldHVybih2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIElURVJBVE9SX0RPTkU7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyBuZXh0KCkge1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpIHsgcmV0dXJuIElURVJBVE9SX0RPTkU7IH1cbiAgICAgICAgbGV0IG1lc3NhZ2U6IE1lc3NhZ2UgfCBudWxsLCB7IHJlYWRlciB9ID0gdGhpcztcbiAgICAgICAgd2hpbGUgKG1lc3NhZ2UgPSBhd2FpdCB0aGlzLnJlYWROZXh0TWVzc2FnZUFuZFZhbGlkYXRlKCkpIHtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmlzU2NoZW1hKCkpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnJlc2V0KG1lc3NhZ2UuaGVhZGVyKCkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmlzUmVjb3JkQmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVjb3JkQmF0Y2hJbmRleCsrO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IG1lc3NhZ2UuaGVhZGVyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgcmVhZGVyLnJlYWRNZXNzYWdlQm9keShtZXNzYWdlLmJvZHlMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZEJhdGNoID0gdGhpcy5fbG9hZFJlY29yZEJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBkb25lOiBmYWxzZSwgdmFsdWU6IHJlY29yZEJhdGNoIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuaXNEaWN0aW9uYXJ5QmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyeUluZGV4Kys7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSBhd2FpdCByZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdmVjdG9yID0gdGhpcy5fbG9hZERpY3Rpb25hcnlCYXRjaChoZWFkZXIsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMuc2V0KGhlYWRlci5pZCwgdmVjdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZXR1cm4oKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIGFzeW5jIHJlYWROZXh0TWVzc2FnZUFuZFZhbGlkYXRlPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyPih0eXBlPzogVCB8IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVhZGVyLnJlYWRNZXNzYWdlPFQ+KHR5cGUpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmNsYXNzIFJlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT5cbiAgICBleHRlbmRzIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUPlxuICAgICAgICBpbXBsZW1lbnRzIElSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQ+LCBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7XG5cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIGZvb3RlcjogRm9vdGVyO1xuICAgIHB1YmxpYyBnZXQgbnVtRGljdGlvbmFyaWVzKCkgeyByZXR1cm4gdGhpcy5mb290ZXIubnVtRGljdGlvbmFyaWVzOyB9XG4gICAgcHVibGljIGdldCBudW1SZWNvcmRCYXRjaGVzKCkgeyByZXR1cm4gdGhpcy5mb290ZXIubnVtUmVjb3JkQmF0Y2hlczsgfVxuXG4gICAgY29uc3RydWN0b3IocHJvdGVjdGVkIGZpbGU6IFJhbmRvbUFjY2Vzc0ZpbGUsIGRpY3Rpb25hcmllcyA9IG5ldyBNYXA8bnVtYmVyLCBWZWN0b3I+KCkpIHtcbiAgICAgICAgc3VwZXIobmV3IE1lc3NhZ2VSZWFkZXIoZmlsZSksIGRpY3Rpb25hcmllcyk7XG4gICAgfVxuICAgIHB1YmxpYyBvcGVuKGF1dG9DbG9zZSA9IHRoaXMuYXV0b0Nsb3NlKSB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQgJiYgIXRoaXMuZm9vdGVyKSB7XG4gICAgICAgICAgICB0aGlzLnNjaGVtYSA9ICh0aGlzLmZvb3RlciA9IHRoaXMucmVhZEZvb3RlcigpKS5zY2hlbWE7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGJsb2NrIG9mIHRoaXMuZm9vdGVyLmRpY3Rpb25hcnlCYXRjaGVzKCkpIHtcbiAgICAgICAgICAgICAgICBibG9jayAmJiB0aGlzLnJlYWREaWN0aW9uYXJ5QmF0Y2godGhpcy5kaWN0aW9uYXJ5SW5kZXgrKyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN1cGVyLm9wZW4oYXV0b0Nsb3NlKTtcbiAgICB9XG4gICAgcHVibGljIHJlYWRSZWNvcmRCYXRjaChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIGlmICh0aGlzLmNsb3NlZCkgeyByZXR1cm4gbnVsbDsgfVxuICAgICAgICBpZiAoIXRoaXMuZm9vdGVyKSB7IHRoaXMub3BlbigpOyB9XG4gICAgICAgIGNvbnN0IGJsb2NrID0gdGhpcy5mb290ZXIuZ2V0UmVjb3JkQmF0Y2goaW5kZXgpO1xuICAgICAgICBpZiAoYmxvY2sgJiYgdGhpcy5maWxlLnNlZWsoYmxvY2sub2Zmc2V0KSkge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IHRoaXMucmVhZGVyLnJlYWRNZXNzYWdlKE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2gpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UgJiYgbWVzc2FnZS5pc1JlY29yZEJhdGNoKCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBtZXNzYWdlLmhlYWRlcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IHRoaXMucmVhZGVyLnJlYWRNZXNzYWdlQm9keShtZXNzYWdlLmJvZHlMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZEJhdGNoID0gdGhpcy5fbG9hZFJlY29yZEJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVjb3JkQmF0Y2g7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHByb3RlY3RlZCByZWFkRGljdGlvbmFyeUJhdGNoKGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgYmxvY2sgPSB0aGlzLmZvb3Rlci5nZXREaWN0aW9uYXJ5QmF0Y2goaW5kZXgpO1xuICAgICAgICBpZiAoYmxvY2sgJiYgdGhpcy5maWxlLnNlZWsoYmxvY2sub2Zmc2V0KSkge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IHRoaXMucmVhZGVyLnJlYWRNZXNzYWdlKE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlICYmIG1lc3NhZ2UuaXNEaWN0aW9uYXJ5QmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IG1lc3NhZ2UuaGVhZGVyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdmVjdG9yID0gdGhpcy5fbG9hZERpY3Rpb25hcnlCYXRjaChoZWFkZXIsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMuc2V0KGhlYWRlci5pZCwgdmVjdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBwcm90ZWN0ZWQgcmVhZEZvb3RlcigpIHtcbiAgICAgICAgY29uc3QgeyBmaWxlIH0gPSB0aGlzO1xuICAgICAgICBjb25zdCBzaXplID0gZmlsZS5zaXplO1xuICAgICAgICBjb25zdCBvZmZzZXQgPSBzaXplIC0gbWFnaWNBbmRQYWRkaW5nO1xuICAgICAgICBjb25zdCBsZW5ndGggPSBmaWxlLnJlYWRJbnQzMihvZmZzZXQpO1xuICAgICAgICBjb25zdCBidWZmZXIgPSBmaWxlLnJlYWRBdChvZmZzZXQgLSBsZW5ndGgsIGxlbmd0aCk7XG4gICAgICAgIHJldHVybiBGb290ZXIuZGVjb2RlKGJ1ZmZlcik7XG4gICAgfVxuICAgIHByb3RlY3RlZCByZWFkTmV4dE1lc3NhZ2VBbmRWYWxpZGF0ZTxUIGV4dGVuZHMgTWVzc2FnZUhlYWRlcj4odHlwZT86IFQgfCBudWxsKTogTWVzc2FnZTxUPiB8IG51bGwge1xuICAgICAgICBpZiAoIXRoaXMuZm9vdGVyKSB7IHRoaXMub3BlbigpOyB9XG4gICAgICAgIGlmICh0aGlzLnJlY29yZEJhdGNoSW5kZXggPCB0aGlzLm51bVJlY29yZEJhdGNoZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGJsb2NrID0gdGhpcy5mb290ZXIuZ2V0UmVjb3JkQmF0Y2godGhpcy5yZWNvcmRCYXRjaEluZGV4KTtcbiAgICAgICAgICAgIGlmIChibG9jayAmJiB0aGlzLmZpbGUuc2VlayhibG9jay5vZmZzZXQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVhZGVyLnJlYWRNZXNzYWdlKHR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmNsYXNzIEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PlxuICAgIGV4dGVuZHMgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VD5cbiAgICAgICAgaW1wbGVtZW50cyBJUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUPiwgQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7XG5cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIGZvb3RlcjogRm9vdGVyO1xuICAgIHB1YmxpYyBnZXQgbnVtRGljdGlvbmFyaWVzKCkgeyByZXR1cm4gdGhpcy5mb290ZXIubnVtRGljdGlvbmFyaWVzOyB9XG4gICAgcHVibGljIGdldCBudW1SZWNvcmRCYXRjaGVzKCkgeyByZXR1cm4gdGhpcy5mb290ZXIubnVtUmVjb3JkQmF0Y2hlczsgfVxuXG4gICAgY29uc3RydWN0b3IocHJvdGVjdGVkIGZpbGU6IEFzeW5jUmFuZG9tQWNjZXNzRmlsZSwgZGljdGlvbmFyaWVzID0gbmV3IE1hcDxudW1iZXIsIFZlY3Rvcj4oKSkge1xuICAgICAgICBzdXBlcihuZXcgQXN5bmNNZXNzYWdlUmVhZGVyKGZpbGUpLCBkaWN0aW9uYXJpZXMpO1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKSB7XG4gICAgICAgIC8vIGRlZmF1bHQgYXJncyBpbiBhbiBhc3luYyBmdW5jdGlvbiBjcmFzaCBjbG9zdXJlLWNvbXBpbGVyIGF0IHRoZSBtb21lbnRcbiAgICAgICAgLy8gc28gZG8gdGhpcyBpbnN0ZWFkLiBodHRwczovL2dpdGh1Yi5jb20vZ29vZ2xlL2Nsb3N1cmUtY29tcGlsZXIvaXNzdWVzLzMxNzhcbiAgICAgICAgYXV0b0Nsb3NlICE9PSB1bmRlZmluZWQgfHwgKGF1dG9DbG9zZSA9IHRoaXMuYXV0b0Nsb3NlKTtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiAhdGhpcy5mb290ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuc2NoZW1hID0gKHRoaXMuZm9vdGVyID0gYXdhaXQgdGhpcy5yZWFkRm9vdGVyKCkpLnNjaGVtYTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgYmxvY2sgb2YgdGhpcy5mb290ZXIuZGljdGlvbmFyeUJhdGNoZXMoKSkge1xuICAgICAgICAgICAgICAgIGJsb2NrICYmIGF3YWl0IHRoaXMucmVhZERpY3Rpb25hcnlCYXRjaCh0aGlzLmRpY3Rpb25hcnlJbmRleCsrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXdhaXQgc3VwZXIub3BlbihhdXRvQ2xvc2UpO1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgcmVhZFJlY29yZEJhdGNoKGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgaWYgKHRoaXMuY2xvc2VkKSB7IHJldHVybiBudWxsOyB9XG4gICAgICAgIGlmICghdGhpcy5mb290ZXIpIHsgYXdhaXQgdGhpcy5vcGVuKCk7IH1cbiAgICAgICAgY29uc3QgYmxvY2sgPSB0aGlzLmZvb3Rlci5nZXRSZWNvcmRCYXRjaChpbmRleCk7XG4gICAgICAgIGlmIChibG9jayAmJiAoYXdhaXQgdGhpcy5maWxlLnNlZWsoYmxvY2sub2Zmc2V0KSkpIHtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBhd2FpdCB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZShNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlICYmIG1lc3NhZ2UuaXNSZWNvcmRCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSBhd2FpdCB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRCYXRjaCA9IHRoaXMuX2xvYWRSZWNvcmRCYXRjaChoZWFkZXIsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlY29yZEJhdGNoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgYXN5bmMgcmVhZERpY3Rpb25hcnlCYXRjaChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGJsb2NrID0gdGhpcy5mb290ZXIuZ2V0RGljdGlvbmFyeUJhdGNoKGluZGV4KTtcbiAgICAgICAgaWYgKGJsb2NrICYmIChhd2FpdCB0aGlzLmZpbGUuc2VlayhibG9jay5vZmZzZXQpKSkge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGF3YWl0IHRoaXMucmVhZGVyLnJlYWRNZXNzYWdlKE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlICYmIG1lc3NhZ2UuaXNEaWN0aW9uYXJ5QmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IG1lc3NhZ2UuaGVhZGVyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdmVjdG9yID0gdGhpcy5fbG9hZERpY3Rpb25hcnlCYXRjaChoZWFkZXIsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMuc2V0KGhlYWRlci5pZCwgdmVjdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBwcm90ZWN0ZWQgYXN5bmMgcmVhZEZvb3RlcigpIHtcbiAgICAgICAgY29uc3QgeyBmaWxlIH0gPSB0aGlzO1xuICAgICAgICBjb25zdCBvZmZzZXQgPSBmaWxlLnNpemUgLSBtYWdpY0FuZFBhZGRpbmc7XG4gICAgICAgIGNvbnN0IGxlbmd0aCA9IGF3YWl0IGZpbGUucmVhZEludDMyKG9mZnNldCk7XG4gICAgICAgIGNvbnN0IGJ1ZmZlciA9IGF3YWl0IGZpbGUucmVhZEF0KG9mZnNldCAtIGxlbmd0aCwgbGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIEZvb3Rlci5kZWNvZGUoYnVmZmVyKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIGFzeW5jIHJlYWROZXh0TWVzc2FnZUFuZFZhbGlkYXRlPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyPih0eXBlPzogVCB8IG51bGwpOiBQcm9taXNlPE1lc3NhZ2U8VD4gfCBudWxsPiB7XG4gICAgICAgIGlmICghdGhpcy5mb290ZXIpIHsgYXdhaXQgdGhpcy5vcGVuKCk7IH1cbiAgICAgICAgaWYgKHRoaXMucmVjb3JkQmF0Y2hJbmRleCA8IHRoaXMubnVtUmVjb3JkQmF0Y2hlcykge1xuICAgICAgICAgICAgY29uc3QgYmxvY2sgPSB0aGlzLmZvb3Rlci5nZXRSZWNvcmRCYXRjaCh0aGlzLnJlY29yZEJhdGNoSW5kZXgpO1xuICAgICAgICAgICAgaWYgKGJsb2NrICYmIGF3YWl0IHRoaXMuZmlsZS5zZWVrKGJsb2NrLm9mZnNldCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2UodHlwZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuY2xhc3MgUmVjb3JkQmF0Y2hKU09OUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUPiB7XG4gICAgY29uc3RydWN0b3IocHJvdGVjdGVkIHJlYWRlcjogSlNPTk1lc3NhZ2VSZWFkZXIsIGRpY3Rpb25hcmllcyA9IG5ldyBNYXA8bnVtYmVyLCBWZWN0b3I+KCkpIHtcbiAgICAgICAgc3VwZXIocmVhZGVyLCBkaWN0aW9uYXJpZXMpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgX2xvYWRWZWN0b3JzKGhlYWRlcjogbWV0YWRhdGEuUmVjb3JkQmF0Y2gsIGJvZHk6IGFueSwgdHlwZXM6IChGaWVsZCB8IERhdGFUeXBlKVtdKSB7XG4gICAgICAgIHJldHVybiBuZXcgSlNPTlZlY3RvckxvYWRlcihib2R5LCBoZWFkZXIubm9kZXMsIGhlYWRlci5idWZmZXJzKS52aXNpdE1hbnkodHlwZXMpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmludGVyZmFjZSBJUmVjb3JkQmF0Y2hSZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IHtcblxuICAgIGNsb3NlZDogYm9vbGVhbjtcbiAgICBzY2hlbWE6IFNjaGVtYTxUPjtcbiAgICBhdXRvQ2xvc2U6IGJvb2xlYW47XG4gICAgbnVtRGljdGlvbmFyaWVzOiBudW1iZXI7XG4gICAgbnVtUmVjb3JkQmF0Y2hlczogbnVtYmVyO1xuICAgIGRpY3Rpb25hcmllczogTWFwPG51bWJlciwgVmVjdG9yPjtcblxuICAgIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbik6IHRoaXMgfCBQcm9taXNlPHRoaXM+O1xuICAgIHJlc2V0KHNjaGVtYT86IFNjaGVtYTxUPiB8IG51bGwpOiB0aGlzO1xuICAgIGNsb3NlKCk6IHRoaXMgfCBQcm9taXNlPHRoaXM+O1xuXG4gICAgW1N5bWJvbC5pdGVyYXRvcl0/KCk6IEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+O1xuICAgIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0/KCk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj47XG5cbiAgICB0aHJvdyh2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PGFueT4gfCBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+O1xuICAgIHJldHVybih2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PGFueT4gfCBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+O1xuICAgIG5leHQodmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxSZWNvcmRCYXRjaDxUPj4gfCBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PFJlY29yZEJhdGNoPFQ+Pj47XG59XG5cbi8qKiBAaWdub3JlICovXG5pbnRlcmZhY2UgSVJlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBJUmVjb3JkQmF0Y2hSZWFkZXJJbXBsPFQ+IHtcblxuICAgIGZvb3RlcjogRm9vdGVyO1xuXG4gICAgcmVhZFJlY29yZEJhdGNoKGluZGV4OiBudW1iZXIpOiBSZWNvcmRCYXRjaDxUPiB8IG51bGwgfCBQcm9taXNlPFJlY29yZEJhdGNoPFQ+IHwgbnVsbD47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IHtcbiAgICBjYW5jZWwoKTogdm9pZDtcbiAgICBvcGVuKGF1dG9DbG9zZT86IGJvb2xlYW4pOiB0aGlzO1xuICAgIHRocm93KHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8YW55PjtcbiAgICByZXR1cm4odmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxhbnk+O1xuICAgIG5leHQodmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxSZWNvcmRCYXRjaDxUPj47XG4gICAgcmVhZFJlY29yZEJhdGNoKGluZGV4OiBudW1iZXIpOiBSZWNvcmRCYXRjaDxUPiB8IG51bGw7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4ge1xuICAgIGNhbmNlbCgpOiB2b2lkO1xuICAgIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbik6IHRoaXM7XG4gICAgdGhyb3codmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxhbnk+O1xuICAgIHJldHVybih2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PGFueT47XG4gICAgbmV4dCh2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PFJlY29yZEJhdGNoPFQ+Pjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiB7XG4gICAgY2FuY2VsKCk6IFByb21pc2U8dm9pZD47XG4gICAgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKTogUHJvbWlzZTx0aGlzPjtcbiAgICB0aHJvdyh2YWx1ZT86IGFueSk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55Pj47XG4gICAgcmV0dXJuKHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxhbnk+PjtcbiAgICBuZXh0KHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxSZWNvcmRCYXRjaDxUPj4+O1xuICAgIHJlYWRSZWNvcmRCYXRjaChpbmRleDogbnVtYmVyKTogUHJvbWlzZTxSZWNvcmRCYXRjaDxUPiB8IG51bGw+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4ge1xuICAgIGNhbmNlbCgpOiBQcm9taXNlPHZvaWQ+O1xuICAgIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbik6IFByb21pc2U8dGhpcz47XG4gICAgdGhyb3codmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+O1xuICAgIHJldHVybih2YWx1ZT86IGFueSk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55Pj47XG4gICAgbmV4dCh2YWx1ZT86IGFueSk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8UmVjb3JkQmF0Y2g8VD4+Pjtcbn1cbiJdfQ==

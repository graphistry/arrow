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
    toReadableDOMStream() { return streamAdapters.toReadableDOMStream(this); }
    toReadableNodeStream() { return streamAdapters.toReadableNodeStream(this, { objectMode: true }); }
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
    static throughNode() { throw new Error(`"asNodeStream" not available in this environment`); }
    /** @nocollapse */
    static throughDOM() {
        throw new Error(`"asDOMStream" not available in this environment`);
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
export class AsyncRecordBatchStreamReader extends RecordBatchReader {
    constructor(source, byteLength) {
        super(new AsyncRecordBatchStreamReaderImpl(new AsyncMessageReader(source, byteLength)));
    }
    async cancel() { await this.impl.close(); }
    async open(autoClose) { await this.impl.open(autoClose); return this; }
    [Symbol.asyncIterator]() { return this.impl[Symbol.asyncIterator](); }
    [Symbol.iterator]() { throw new Error(`AsyncRecordBatchStreamReader is not Iterable`); }
}
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
            try {
                if (!(this.schema || (this.schema = this.reader.readSchema(!autoClose)))) {
                    return this.close();
                }
            }
            catch (e) {
                this.close();
                throw e;
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
    async open(autoClose = this.autoClose) {
        if (!this.closed) {
            this.autoClose = autoClose;
            try {
                if (!(this.schema || (this.schema = (await this.reader.readSchema(!autoClose))))) {
                    return this.close();
                }
            }
            catch (e) {
                this.close();
                throw e;
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
class AsyncRecordBatchFileReaderImpl extends AsyncRecordBatchStreamReaderImpl {
    constructor(file, dictionaries = new Map()) {
        super(new AsyncMessageReader(file), dictionaries);
        this.file = file;
    }
    get numDictionaries() { return this.footer.numDictionaries; }
    get numRecordBatches() { return this.footer.numRecordBatches; }
    async open(autoClose = this.autoClose) {
        if (!this.closed && !this.footer) {
            this.schema = (this.footer = await this.readFooter()).schema;
            for (const block of this.footer.dictionaryBatches()) {
                block && this.readDictionaryBatch(this.dictionaryIndex++);
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
class RecordBatchJSONReaderImpl extends RecordBatchStreamReaderImpl {
    constructor(reader, dictionaries = new Map()) {
        super(reader, dictionaries);
        this.reader = reader;
    }
    _loadVectors(header, body, types) {
        return new JSONVectorLoader(body, header.nodes, header.buffers).visitMany(types);
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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RyxZQUFzQixNQUF5QixFQUFFLFlBQVksR0FBRyxJQUFJLEdBQUcsRUFBa0I7UUFDckYsS0FBSyxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQztRQURWLFdBQU0sR0FBTixNQUFNLENBQW1CO0lBRS9DLENBQUM7SUFDUyxZQUFZLENBQUMsTUFBNEIsRUFBRSxJQUFTLEVBQUUsS0FBMkI7UUFDdkYsT0FBTyxJQUFJLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDckYsQ0FBQztDQUNKIiwiZmlsZSI6ImlwYy9yZWFkZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgRGF0YVR5cGUgfSBmcm9tICcuLi90eXBlJztcbmltcG9ydCB7IFZlY3RvciB9IGZyb20gJy4uL3ZlY3Rvcic7XG5pbXBvcnQgeyBNZXNzYWdlSGVhZGVyIH0gZnJvbSAnLi4vZW51bSc7XG5pbXBvcnQgeyBGb290ZXIgfSBmcm9tICcuL21ldGFkYXRhL2ZpbGUnO1xuaW1wb3J0IHsgU2NoZW1hLCBGaWVsZCB9IGZyb20gJy4uL3NjaGVtYSc7XG5pbXBvcnQgc3RyZWFtQWRhcHRlcnMgZnJvbSAnLi4vaW8vYWRhcHRlcnMnO1xuaW1wb3J0IHsgTWVzc2FnZSB9IGZyb20gJy4vbWV0YWRhdGEvbWVzc2FnZSc7XG5pbXBvcnQgeyBSZWNvcmRCYXRjaCB9IGZyb20gJy4uL3JlY29yZGJhdGNoJztcbmltcG9ydCAqIGFzIG1ldGFkYXRhIGZyb20gJy4vbWV0YWRhdGEvbWVzc2FnZSc7XG5pbXBvcnQgeyBCeXRlU3RyZWFtLCBBc3luY0J5dGVTdHJlYW0gfSBmcm9tICcuLi9pby9zdHJlYW0nO1xuaW1wb3J0IHsgQXJyYXlCdWZmZXJWaWV3SW5wdXQsIHRvVWludDhBcnJheSB9IGZyb20gJy4uL3V0aWwvYnVmZmVyJztcbmltcG9ydCB7IFJhbmRvbUFjY2Vzc0ZpbGUsIEFzeW5jUmFuZG9tQWNjZXNzRmlsZSB9IGZyb20gJy4uL2lvL2ZpbGUnO1xuaW1wb3J0IHsgVmVjdG9yTG9hZGVyLCBKU09OVmVjdG9yTG9hZGVyIH0gZnJvbSAnLi4vdmlzaXRvci92ZWN0b3Jsb2FkZXInO1xuaW1wb3J0IHsgQXJyb3dKU09OLCBBcnJvd0pTT05MaWtlLCBGaWxlSGFuZGxlLCBSZWFkYWJsZUludGVyb3AsIElURVJBVE9SX0RPTkUgfSBmcm9tICcuLi9pby9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGlzUHJvbWlzZSwgaXNBcnJvd0pTT04sIGlzRmlsZUhhbmRsZSwgaXNGZXRjaFJlc3BvbnNlLCBpc0FzeW5jSXRlcmFibGUsIGlzUmVhZGFibGVET01TdHJlYW0sIGlzUmVhZGFibGVOb2RlU3RyZWFtIH0gZnJvbSAnLi4vdXRpbC9jb21wYXQnO1xuaW1wb3J0IHsgTWVzc2FnZVJlYWRlciwgQXN5bmNNZXNzYWdlUmVhZGVyLCBjaGVja0Zvck1hZ2ljQXJyb3dTdHJpbmcsIG1hZ2ljTGVuZ3RoLCBtYWdpY0FuZFBhZGRpbmcsIG1hZ2ljWDJBbmRQYWRkaW5nLCBKU09OTWVzc2FnZVJlYWRlciB9IGZyb20gJy4vbWVzc2FnZSc7XG5cbmV4cG9ydCB0eXBlIEZyb21BcmcwID0gQXJyb3dKU09OTGlrZTtcbmV4cG9ydCB0eXBlIEZyb21BcmcxID0gSXRlcmFibGU8QXJyYXlCdWZmZXJWaWV3SW5wdXQ+IHwgQXJyYXlCdWZmZXJWaWV3SW5wdXQ7XG5leHBvcnQgdHlwZSBGcm9tQXJnMiA9IFByb21pc2VMaWtlPEl0ZXJhYmxlPEFycmF5QnVmZmVyVmlld0lucHV0PiB8IEFycmF5QnVmZmVyVmlld0lucHV0PjtcbmV4cG9ydCB0eXBlIEZyb21BcmczID0gTm9kZUpTLlJlYWRhYmxlU3RyZWFtIHwgUmVhZGFibGVTdHJlYW08QXJyYXlCdWZmZXJWaWV3SW5wdXQ+IHwgQXN5bmNJdGVyYWJsZTxBcnJheUJ1ZmZlclZpZXdJbnB1dD47XG5leHBvcnQgdHlwZSBGcm9tQXJnNCA9IFJlc3BvbnNlIHwgRmlsZUhhbmRsZSB8IFByb21pc2VMaWtlPEZpbGVIYW5kbGU+IHwgUHJvbWlzZUxpa2U8UmVzcG9uc2U+O1xuZXhwb3J0IHR5cGUgRnJvbUFyZ3MgPSBGcm9tQXJnMCB8IEZyb21BcmczIHwgRnJvbUFyZzEgfCBGcm9tQXJnMiB8IEZyb21Bcmc0O1xuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgUmVjb3JkQmF0Y2hSZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWFkYWJsZUludGVyb3A8UmVjb3JkQmF0Y2g8VD4+IHtcblxuICAgIHByb3RlY3RlZCBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgaW1wbDogSVJlY29yZEJhdGNoUmVhZGVySW1wbDxUPikgeyBzdXBlcigpOyB9XG5cbiAgICBwdWJsaWMgZ2V0IGNsb3NlZCgpIHsgcmV0dXJuIHRoaXMuaW1wbC5jbG9zZWQ7IH1cbiAgICBwdWJsaWMgZ2V0IHNjaGVtYSgpIHsgcmV0dXJuIHRoaXMuaW1wbC5zY2hlbWE7IH1cbiAgICBwdWJsaWMgZ2V0IGF1dG9DbG9zZSgpIHsgcmV0dXJuIHRoaXMuaW1wbC5hdXRvQ2xvc2U7IH1cbiAgICBwdWJsaWMgZ2V0IGRpY3Rpb25hcmllcygpIHsgcmV0dXJuIHRoaXMuaW1wbC5kaWN0aW9uYXJpZXM7IH1cbiAgICBwdWJsaWMgZ2V0IG51bURpY3Rpb25hcmllcygpIHsgcmV0dXJuIHRoaXMuaW1wbC5udW1EaWN0aW9uYXJpZXM7IH1cbiAgICBwdWJsaWMgZ2V0IG51bVJlY29yZEJhdGNoZXMoKSB7IHJldHVybiB0aGlzLmltcGwubnVtUmVjb3JkQmF0Y2hlczsgfVxuXG4gICAgcHVibGljIG5leHQodmFsdWU/OiBhbnkpIHsgcmV0dXJuIHRoaXMuaW1wbC5uZXh0KHZhbHVlKTsgfVxuICAgIHB1YmxpYyB0aHJvdyh2YWx1ZT86IGFueSkgeyByZXR1cm4gdGhpcy5pbXBsLnRocm93KHZhbHVlKTsgfVxuICAgIHB1YmxpYyByZXR1cm4odmFsdWU/OiBhbnkpIHsgcmV0dXJuIHRoaXMuaW1wbC5yZXR1cm4odmFsdWUpOyB9XG4gICAgcHVibGljIHJlc2V0KHNjaGVtYT86IFNjaGVtYTxUPiB8IG51bGwpIHsgdGhpcy5pbXBsLnJlc2V0KHNjaGVtYSk7IHJldHVybiB0aGlzOyB9XG5cbiAgICBwdWJsaWMgYWJzdHJhY3QgY2FuY2VsKCk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+O1xuICAgIHB1YmxpYyBhYnN0cmFjdCBvcGVuKGF1dG9DbG9zZT86IGJvb2xlYW4pOiB0aGlzIHwgUHJvbWlzZTx0aGlzPjtcbiAgICBwdWJsaWMgYWJzdHJhY3QgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj47XG4gICAgcHVibGljIGFic3RyYWN0IFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PjtcblxuICAgIHB1YmxpYyB0b1JlYWRhYmxlRE9NU3RyZWFtKCkgeyByZXR1cm4gc3RyZWFtQWRhcHRlcnMudG9SZWFkYWJsZURPTVN0cmVhbSh0aGlzKTsgfVxuICAgIHB1YmxpYyB0b1JlYWRhYmxlTm9kZVN0cmVhbSgpIHsgcmV0dXJuIHN0cmVhbUFkYXB0ZXJzLnRvUmVhZGFibGVOb2RlU3RyZWFtKHRoaXMsIHsgb2JqZWN0TW9kZTogdHJ1ZSB9KTsgfVxuXG4gICAgcHVibGljIGlzU3luYygpOiB0aGlzIGlzIFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+IHtcbiAgICAgICAgcmV0dXJuICh0aGlzIGluc3RhbmNlb2YgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyKSB8fCAodGhpcyBpbnN0YW5jZW9mIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyKTtcbiAgICB9XG4gICAgcHVibGljIGlzQXN5bmMoKTogdGhpcyBpcyBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4ge1xuICAgICAgICByZXR1cm4gKHRoaXMgaW5zdGFuY2VvZiBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcikgfHwgKHRoaXMgaW5zdGFuY2VvZiBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyKTtcbiAgICB9XG4gICAgcHVibGljIGlzRmlsZSgpOiB0aGlzIGlzIFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHtcbiAgICAgICAgcmV0dXJuICh0aGlzIGluc3RhbmNlb2YgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyKSB8fCAodGhpcyBpbnN0YW5jZW9mIEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyKTtcbiAgICB9XG4gICAgcHVibGljIGlzU3RyZWFtKCk6IHRoaXMgaXMgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4gfCBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+IHtcbiAgICAgICAgcmV0dXJuICh0aGlzIGluc3RhbmNlb2YgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXIpIHx8ICh0aGlzIGluc3RhbmNlb2YgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcik7XG4gICAgfVxuXG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyB0aHJvdWdoTm9kZSgpOiBpbXBvcnQoJ3N0cmVhbScpLkR1cGxleCB7IHRocm93IG5ldyBFcnJvcihgXCJhc05vZGVTdHJlYW1cIiBub3QgYXZhaWxhYmxlIGluIHRoaXMgZW52aXJvbm1lbnRgKTsgfVxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgdGhyb3VnaERPTTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9PigpOiB7IHdyaXRhYmxlOiBXcml0YWJsZVN0cmVhbTxVaW50OEFycmF5PiwgcmVhZGFibGU6IFJlYWRhYmxlU3RyZWFtPFJlY29yZEJhdGNoPFQ+PiB9IHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBcImFzRE9NU3RyZWFtXCIgbm90IGF2YWlsYWJsZSBpbiB0aGlzIGVudmlyb25tZW50YCk7XG4gICAgfVxuXG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlcj4oc291cmNlOiBUKTogVDtcbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBGcm9tQXJnMCk6IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IEZyb21BcmcxKTogUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogRnJvbUFyZzIpOiBQcm9taXNlPFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+PjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBGcm9tQXJnMyk6IFByb21pc2U8UmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPj47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogRnJvbUFyZzQpOiBQcm9taXNlPEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPj47XG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogYW55KSB7XG4gICAgICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBSZWNvcmRCYXRjaFJlYWRlcikge1xuICAgICAgICAgICAgcmV0dXJuIHNvdXJjZTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0Fycm93SlNPTihzb3VyY2UpKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVjb3JkQmF0Y2hSZWFkZXIuZnJvbUpTT048VD4oc291cmNlKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0ZpbGVIYW5kbGUoc291cmNlKSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlY29yZEJhdGNoUmVhZGVyLmZyb21GaWxlSGFuZGxlPFQ+KHNvdXJjZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNQcm9taXNlPEZyb21BcmcxPihzb3VyY2UpKSB7XG4gICAgICAgICAgICByZXR1cm4gKGFzeW5jICgpID0+IGF3YWl0IFJlY29yZEJhdGNoUmVhZGVyLmZyb208VD4oYXdhaXQgc291cmNlKSkoKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1Byb21pc2U8RmlsZUhhbmRsZSB8IFJlc3BvbnNlPihzb3VyY2UpKSB7XG4gICAgICAgICAgICByZXR1cm4gKGFzeW5jICgpID0+IGF3YWl0IFJlY29yZEJhdGNoUmVhZGVyLmZyb208VD4oYXdhaXQgc291cmNlKSkoKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0ZldGNoUmVzcG9uc2Uoc291cmNlKSB8fCBpc1JlYWRhYmxlRE9NU3RyZWFtKHNvdXJjZSkgfHwgaXNSZWFkYWJsZU5vZGVTdHJlYW0oc291cmNlKSB8fCBpc0FzeW5jSXRlcmFibGUoc291cmNlKSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlY29yZEJhdGNoUmVhZGVyLmZyb21Bc3luY0J5dGVTdHJlYW08VD4obmV3IEFzeW5jQnl0ZVN0cmVhbShzb3VyY2UpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUmVjb3JkQmF0Y2hSZWFkZXIuZnJvbUJ5dGVTdHJlYW08VD4obmV3IEJ5dGVTdHJlYW0oc291cmNlKSk7XG4gICAgfVxuICAgIHByaXZhdGUgc3RhdGljIGZyb21KU09OPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0+KHNvdXJjZTogQXJyb3dKU09OTGlrZSkge1xuICAgICAgICByZXR1cm4gbmV3IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+KG5ldyBBcnJvd0pTT04oc291cmNlKSk7XG4gICAgfVxuICAgIHByaXZhdGUgc3RhdGljIGZyb21CeXRlU3RyZWFtPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0+KHNvdXJjZTogQnl0ZVN0cmVhbSkge1xuICAgICAgICBjb25zdCBieXRlcyA9IHNvdXJjZS5wZWVrKChtYWdpY0xlbmd0aCArIDcpICYgfjcpO1xuICAgICAgICByZXR1cm4gYnl0ZXMgJiYgYnl0ZXMuYnl0ZUxlbmd0aCA+PSA0XG4gICAgICAgICAgICA/IGNoZWNrRm9yTWFnaWNBcnJvd1N0cmluZyhieXRlcylcbiAgICAgICAgICAgID8gbmV3IFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPihzb3VyY2UucmVhZCgpKVxuICAgICAgICAgICAgOiBuZXcgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4oc291cmNlKVxuICAgICAgICAgICAgOiBuZXcgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4oZnVuY3Rpb24qKCk6IGFueSB7fSgpKTtcbiAgICB9XG4gICAgcHJpdmF0ZSBzdGF0aWMgYXN5bmMgZnJvbUFzeW5jQnl0ZVN0cmVhbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9Pihzb3VyY2U6IEFzeW5jQnl0ZVN0cmVhbSkge1xuICAgICAgICBjb25zdCBieXRlcyA9IGF3YWl0IHNvdXJjZS5wZWVrKChtYWdpY0xlbmd0aCArIDcpICYgfjcpO1xuICAgICAgICByZXR1cm4gYnl0ZXMgJiYgYnl0ZXMuYnl0ZUxlbmd0aCA+PSA0XG4gICAgICAgICAgICA/IGNoZWNrRm9yTWFnaWNBcnJvd1N0cmluZyhieXRlcylcbiAgICAgICAgICAgID8gbmV3IFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPihhd2FpdCBzb3VyY2UucmVhZCgpKVxuICAgICAgICAgICAgOiBuZXcgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPihzb3VyY2UpXG4gICAgICAgICAgICA6IG5ldyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+KGFzeW5jIGZ1bmN0aW9uKigpOiBhbnkge30oKSk7XG4gICAgfVxuICAgIHByaXZhdGUgc3RhdGljIGFzeW5jIGZyb21GaWxlSGFuZGxlPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0+KHNvdXJjZTogRmlsZUhhbmRsZSkge1xuICAgICAgICBjb25zdCB7IHNpemUgfSA9IGF3YWl0IHNvdXJjZS5zdGF0KCk7XG4gICAgICAgIGNvbnN0IGZpbGUgPSBuZXcgQXN5bmNSYW5kb21BY2Nlc3NGaWxlKHNvdXJjZSwgc2l6ZSk7XG4gICAgICAgIGlmIChzaXplID49IG1hZ2ljWDJBbmRQYWRkaW5nKSB7XG4gICAgICAgICAgICBpZiAoY2hlY2tGb3JNYWdpY0Fycm93U3RyaW5nKGF3YWl0IGZpbGUucmVhZEF0KDAsIChtYWdpY0xlbmd0aCArIDcpICYgfjcpKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4oZmlsZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+KGZpbGUpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoUmVhZGVyPFQ+IHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHJvdGVjdGVkIGltcGw6IFJlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VD47XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VD4pO1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogUmFuZG9tQWNjZXNzRmlsZSwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgVmVjdG9yPik7XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBBcnJheUJ1ZmZlclZpZXdJbnB1dCwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgVmVjdG9yPik7XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VD4gfCBSYW5kb21BY2Nlc3NGaWxlIHwgQXJyYXlCdWZmZXJWaWV3SW5wdXQsIGRpY3Rpb25hcmllcz86IE1hcDxudW1iZXIsIFZlY3Rvcj4pIHtcbiAgICAgICAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbCkge1xuICAgICAgICAgICAgc3VwZXIoc291cmNlKTtcbiAgICAgICAgfSBlbHNlIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBSYW5kb21BY2Nlc3NGaWxlKSB7XG4gICAgICAgICAgICBzdXBlcihuZXcgUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbChzb3VyY2UsIGRpY3Rpb25hcmllcykpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3VwZXIobmV3IFJlY29yZEJhdGNoRmlsZVJlYWRlckltcGwobmV3IFJhbmRvbUFjY2Vzc0ZpbGUodG9VaW50OEFycmF5KHNvdXJjZSkpLCBkaWN0aW9uYXJpZXMpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBwdWJsaWMgZ2V0IGZvb3RlcigpIHsgcmV0dXJuIHRoaXMuaW1wbC5mb290ZXI7IH1cbiAgICBwdWJsaWMgY2FuY2VsKCkgeyB0aGlzLmltcGwuY2xvc2UoKTsgfVxuICAgIHB1YmxpYyBvcGVuKGF1dG9DbG9zZT86IGJvb2xlYW4pIHsgdGhpcy5pbXBsLm9wZW4oYXV0b0Nsb3NlKTsgcmV0dXJuIHRoaXM7IH1cbiAgICBwdWJsaWMgcmVhZFJlY29yZEJhdGNoKGluZGV4OiBudW1iZXIpIHsgcmV0dXJuIHRoaXMuaW1wbC5yZWFkUmVjb3JkQmF0Y2goaW5kZXgpOyB9XG4gICAgcHVibGljIFtTeW1ib2wuaXRlcmF0b3JdKCkgeyByZXR1cm4gKHRoaXMuaW1wbCBhcyBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PilbU3ltYm9sLml0ZXJhdG9yXSgpOyB9XG4gICAgcHVibGljIGFzeW5jICpbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4geyB5aWVsZCogdGhpc1tTeW1ib2wuaXRlcmF0b3JdKCk7IH1cbn1cblxuZXhwb3J0IGNsYXNzIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXI8VD4ge1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwcm90ZWN0ZWQgaW1wbDogUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+O1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogQnl0ZVN0cmVhbSB8IEFycm93SlNPTiB8IEFycmF5QnVmZmVyVmlldyB8IEl0ZXJhYmxlPEFycmF5QnVmZmVyVmlldz4sIGRpY3Rpb25hcmllcz86IE1hcDxudW1iZXIsIFZlY3Rvcj4pIHtcbiAgICAgICAgc3VwZXIoaXNBcnJvd0pTT04oc291cmNlKVxuICAgICAgICAgICAgPyBuZXcgUmVjb3JkQmF0Y2hKU09OUmVhZGVySW1wbChuZXcgSlNPTk1lc3NhZ2VSZWFkZXIoc291cmNlKSwgZGljdGlvbmFyaWVzKVxuICAgICAgICAgICAgOiBuZXcgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsKG5ldyBNZXNzYWdlUmVhZGVyKHNvdXJjZSksIGRpY3Rpb25hcmllcykpO1xuICAgIH1cbiAgICBwdWJsaWMgY2FuY2VsKCkgeyB0aGlzLmltcGwuY2xvc2UoKTsgfVxuICAgIHB1YmxpYyBvcGVuKGF1dG9DbG9zZT86IGJvb2xlYW4pIHsgdGhpcy5pbXBsLm9wZW4oYXV0b0Nsb3NlKTsgcmV0dXJuIHRoaXM7IH1cbiAgICBwdWJsaWMgW1N5bWJvbC5pdGVyYXRvcl0oKSB7IHJldHVybiAodGhpcy5pbXBsIGFzIEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+KVtTeW1ib2wuaXRlcmF0b3JdKCk7IH1cbiAgICBwdWJsaWMgYXN5bmMgKltTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7IHlpZWxkKiB0aGlzW1N5bWJvbC5pdGVyYXRvcl0oKTsgfVxufVxuXG5leHBvcnQgY2xhc3MgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoUmVhZGVyPFQ+IHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHJvdGVjdGVkIGltcGw6IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+O1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogQXN5bmNCeXRlU3RyZWFtIHwgRmlsZUhhbmRsZSB8IE5vZGVKUy5SZWFkYWJsZVN0cmVhbSB8IFJlYWRhYmxlU3RyZWFtPEFycmF5QnVmZmVyVmlldz4gfCBBc3luY0l0ZXJhYmxlPEFycmF5QnVmZmVyVmlldz4sIGJ5dGVMZW5ndGg/OiBudW1iZXIpIHtcbiAgICAgICAgc3VwZXIobmV3IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsKG5ldyBBc3luY01lc3NhZ2VSZWFkZXIoc291cmNlIGFzIEZpbGVIYW5kbGUsIGJ5dGVMZW5ndGgpKSk7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyBjYW5jZWwoKSB7IGF3YWl0IHRoaXMuaW1wbC5jbG9zZSgpOyB9XG4gICAgcHVibGljIGFzeW5jIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbikgeyBhd2FpdCB0aGlzLmltcGwub3BlbihhdXRvQ2xvc2UpOyByZXR1cm4gdGhpczsgfVxuICAgIHB1YmxpYyBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCkgeyByZXR1cm4gKHRoaXMuaW1wbCBhcyBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+KVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTsgfVxuICAgIHB1YmxpYyBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7IHRocm93IG5ldyBFcnJvcihgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlciBpcyBub3QgSXRlcmFibGVgKTsgfVxufVxuXG5leHBvcnQgY2xhc3MgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlcjxUPiB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHByb3RlY3RlZCBpbXBsOiBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VD47XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBBc3luY1JhbmRvbUFjY2Vzc0ZpbGUpO1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogQXN5bmNSYW5kb21BY2Nlc3NGaWxlLCBkaWN0aW9uYXJpZXM6IE1hcDxudW1iZXIsIFZlY3Rvcj4pO1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogRmlsZUhhbmRsZSwgYnl0ZUxlbmd0aDogbnVtYmVyLCBkaWN0aW9uYXJpZXM6IE1hcDxudW1iZXIsIFZlY3Rvcj4pO1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogQXN5bmNSYW5kb21BY2Nlc3NGaWxlIHwgRmlsZUhhbmRsZSwgLi4ucmVzdDogKG51bWJlciB8IE1hcDxudW1iZXIsIFZlY3Rvcj4pW10pIHtcbiAgICAgICAgbGV0IFtieXRlTGVuZ3RoLCBkaWN0aW9uYXJpZXNdID0gcmVzdCBhcyBbbnVtYmVyLCBNYXA8bnVtYmVyLCBWZWN0b3I+XTtcbiAgICAgICAgaWYgKGJ5dGVMZW5ndGggJiYgdHlwZW9mIGJ5dGVMZW5ndGggIT09ICdudW1iZXInKSB7IGRpY3Rpb25hcmllcyA9IGJ5dGVMZW5ndGg7IH1cbiAgICAgICAgbGV0IGZpbGUgPSBzb3VyY2UgaW5zdGFuY2VvZiBBc3luY1JhbmRvbUFjY2Vzc0ZpbGUgPyBzb3VyY2UgOiBuZXcgQXN5bmNSYW5kb21BY2Nlc3NGaWxlKHNvdXJjZSwgYnl0ZUxlbmd0aCk7XG4gICAgICAgIHN1cGVyKG5ldyBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlckltcGwoZmlsZSwgZGljdGlvbmFyaWVzKSk7XG4gICAgfVxuICAgIHB1YmxpYyBnZXQgZm9vdGVyKCkgeyByZXR1cm4gdGhpcy5pbXBsLmZvb3RlcjsgfVxuICAgIHB1YmxpYyBhc3luYyBjYW5jZWwoKSB7IGF3YWl0IHRoaXMuaW1wbC5jbG9zZSgpOyB9XG4gICAgcHVibGljIGFzeW5jIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbikgeyBhd2FpdCB0aGlzLmltcGwub3BlbihhdXRvQ2xvc2UpOyByZXR1cm4gdGhpczsgfVxuICAgIHB1YmxpYyByZWFkUmVjb3JkQmF0Y2goaW5kZXg6IG51bWJlcikgeyByZXR1cm4gdGhpcy5pbXBsLnJlYWRSZWNvcmRCYXRjaChpbmRleCk7IH1cbiAgICBwdWJsaWMgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpIHsgcmV0dXJuICh0aGlzLmltcGwgYXMgQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PilbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk7IH1cbiAgICBwdWJsaWMgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4geyB0aHJvdyBuZXcgRXJyb3IoYEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyIGlzIG5vdCBJdGVyYWJsZWApOyB9XG59XG5cbmFic3RyYWN0IGNsYXNzIFJlY29yZEJhdGNoUmVhZGVySW1wbEJhc2U8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4ge1xuXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyBzY2hlbWE6IFNjaGVtYTtcbiAgICBwdWJsaWMgY2xvc2VkID0gZmFsc2U7XG4gICAgcHVibGljIGF1dG9DbG9zZSA9IHRydWU7XG4gICAgcHVibGljIGRpY3Rpb25hcnlJbmRleCA9IDA7XG4gICAgcHVibGljIHJlY29yZEJhdGNoSW5kZXggPSAwO1xuICAgIHB1YmxpYyBkaWN0aW9uYXJpZXM6IE1hcDxudW1iZXIsIFZlY3Rvcj47XG4gICAgcHVibGljIGdldCBudW1EaWN0aW9uYXJpZXMoKSB7IHJldHVybiB0aGlzLmRpY3Rpb25hcnlJbmRleDsgfVxuICAgIHB1YmxpYyBnZXQgbnVtUmVjb3JkQmF0Y2hlcygpIHsgcmV0dXJuIHRoaXMucmVjb3JkQmF0Y2hJbmRleDsgfVxuXG4gICAgY29uc3RydWN0b3IoZGljdGlvbmFyaWVzID0gbmV3IE1hcDxudW1iZXIsIFZlY3Rvcj4oKSkge1xuICAgICAgICB0aGlzLmRpY3Rpb25hcmllcyA9IGRpY3Rpb25hcmllcztcbiAgICB9XG4gICAgcHVibGljIHJlc2V0KHNjaGVtYT86IFNjaGVtYTxUPiB8IG51bGwpIHtcbiAgICAgICAgdGhpcy5kaWN0aW9uYXJ5SW5kZXggPSAwO1xuICAgICAgICB0aGlzLnJlY29yZEJhdGNoSW5kZXggPSAwO1xuICAgICAgICB0aGlzLnNjaGVtYSA9IDxhbnk+IHNjaGVtYTtcbiAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMgPSBuZXcgTWFwKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgX2xvYWRSZWNvcmRCYXRjaChoZWFkZXI6IG1ldGFkYXRhLlJlY29yZEJhdGNoLCBib2R5OiBhbnkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZWNvcmRCYXRjaDxUPih0aGlzLnNjaGVtYSwgaGVhZGVyLmxlbmd0aCwgdGhpcy5fbG9hZFZlY3RvcnMoaGVhZGVyLCBib2R5LCB0aGlzLnNjaGVtYS5maWVsZHMpKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIF9sb2FkRGljdGlvbmFyeUJhdGNoKGhlYWRlcjogbWV0YWRhdGEuRGljdGlvbmFyeUJhdGNoLCBib2R5OiBhbnkpIHtcbiAgICAgICAgY29uc3QgeyBpZCwgaXNEZWx0YSwgZGF0YSB9ID0gaGVhZGVyO1xuICAgICAgICBjb25zdCB7IGRpY3Rpb25hcmllcywgc2NoZW1hIH0gPSB0aGlzO1xuICAgICAgICBpZiAoaXNEZWx0YSB8fCAhZGljdGlvbmFyaWVzLmdldChpZCkpIHtcblxuICAgICAgICAgICAgY29uc3QgdHlwZSA9IHNjaGVtYS5kaWN0aW9uYXJpZXMuZ2V0KGlkKSE7XG4gICAgICAgICAgICBjb25zdCB2ZWN0b3IgPSAoaXNEZWx0YSA/IGRpY3Rpb25hcmllcy5nZXQoaWQpIS5jb25jYXQoXG4gICAgICAgICAgICAgICAgVmVjdG9yLm5ldyh0aGlzLl9sb2FkVmVjdG9ycyhkYXRhLCBib2R5LCBbdHlwZV0pWzBdKSkgOlxuICAgICAgICAgICAgICAgIFZlY3Rvci5uZXcodGhpcy5fbG9hZFZlY3RvcnMoZGF0YSwgYm9keSwgW3R5cGVdKVswXSkpIGFzIFZlY3RvcjtcblxuICAgICAgICAgICAgKHNjaGVtYS5kaWN0aW9uYXJ5RmllbGRzLmdldChpZCkgfHwgW10pLmZvckVhY2goKHsgdHlwZSB9KSA9PiB0eXBlLmRpY3Rpb25hcnlWZWN0b3IgPSB2ZWN0b3IpO1xuXG4gICAgICAgICAgICByZXR1cm4gdmVjdG9yO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkaWN0aW9uYXJpZXMuZ2V0KGlkKSE7XG4gICAgfVxuICAgIHByb3RlY3RlZCBfbG9hZFZlY3RvcnMoaGVhZGVyOiBtZXRhZGF0YS5SZWNvcmRCYXRjaCwgYm9keTogYW55LCB0eXBlczogKEZpZWxkIHwgRGF0YVR5cGUpW10pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWN0b3JMb2FkZXIoYm9keSwgaGVhZGVyLm5vZGVzLCBoZWFkZXIuYnVmZmVycykudmlzaXRNYW55KHR5cGVzKTtcbiAgICB9XG59XG5cbmNsYXNzIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PlxuICAgIGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXJJbXBsQmFzZTxUPlxuICAgICAgICBpbXBsZW1lbnRzIElSZWNvcmRCYXRjaFJlYWRlckltcGw8VD4sIEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHtcblxuICAgIGNvbnN0cnVjdG9yKHByb3RlY3RlZCByZWFkZXI6IE1lc3NhZ2VSZWFkZXIsIGRpY3Rpb25hcmllcyA9IG5ldyBNYXA8bnVtYmVyLCBWZWN0b3I+KCkpIHtcbiAgICAgICAgc3VwZXIoZGljdGlvbmFyaWVzKTtcbiAgICB9XG4gICAgcHVibGljIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMgYXMgSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj47XG4gICAgfVxuICAgIHB1YmxpYyBjbG9zZSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiAodGhpcy5jbG9zZWQgPSB0cnVlKSkge1xuICAgICAgICAgICAgdGhpcy5yZXNldCgpLnJlYWRlci5yZXR1cm4oKTtcbiAgICAgICAgICAgIHRoaXMucmVhZGVyID0gPGFueT4gbnVsbDtcbiAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyaWVzID0gPGFueT4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHVibGljIG9wZW4oYXV0b0Nsb3NlID0gdGhpcy5hdXRvQ2xvc2UpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCkge1xuICAgICAgICAgICAgdGhpcy5hdXRvQ2xvc2UgPSBhdXRvQ2xvc2U7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGlmICghKHRoaXMuc2NoZW1hIHx8ICh0aGlzLnNjaGVtYSA9IHRoaXMucmVhZGVyLnJlYWRTY2hlbWEoIWF1dG9DbG9zZSkhKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7IHRoaXMuY2xvc2UoKTsgdGhyb3cgZTsgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwdWJsaWMgdGhyb3codmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxhbnk+IHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiB0aGlzLmF1dG9DbG9zZSAmJiAodGhpcy5jbG9zZWQgPSB0cnVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVzZXQoKS5yZWFkZXIudGhyb3codmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBJVEVSQVRPUl9ET05FO1xuICAgIH1cbiAgICBwdWJsaWMgcmV0dXJuKHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8YW55PiB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQgJiYgdGhpcy5hdXRvQ2xvc2UgJiYgKHRoaXMuY2xvc2VkID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlc2V0KCkucmVhZGVyLnJldHVybih2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIElURVJBVE9SX0RPTkU7XG4gICAgfVxuICAgIHB1YmxpYyBuZXh0KCk6IEl0ZXJhdG9yUmVzdWx0PFJlY29yZEJhdGNoPFQ+PiB7XG4gICAgICAgIGlmICh0aGlzLmNsb3NlZCkgeyByZXR1cm4gSVRFUkFUT1JfRE9ORTsgfVxuICAgICAgICBsZXQgbWVzc2FnZTogTWVzc2FnZSB8IG51bGwsIHsgcmVhZGVyIH0gPSB0aGlzO1xuICAgICAgICB3aGlsZSAobWVzc2FnZSA9IHRoaXMucmVhZE5leHRNZXNzYWdlQW5kVmFsaWRhdGUoKSkge1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuaXNTY2hlbWEoKSkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVzZXQobWVzc2FnZS5oZWFkZXIoKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuaXNSZWNvcmRCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWNvcmRCYXRjaEluZGV4Kys7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSByZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkQmF0Y2ggPSB0aGlzLl9sb2FkUmVjb3JkQmF0Y2goaGVhZGVyLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IGRvbmU6IGZhbHNlLCB2YWx1ZTogcmVjb3JkQmF0Y2ggfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5pc0RpY3Rpb25hcnlCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJ5SW5kZXgrKztcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBtZXNzYWdlLmhlYWRlcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IHJlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB2ZWN0b3IgPSB0aGlzLl9sb2FkRGljdGlvbmFyeUJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpY3Rpb25hcmllcy5zZXQoaGVhZGVyLmlkLCB2ZWN0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnJldHVybigpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgcmVhZE5leHRNZXNzYWdlQW5kVmFsaWRhdGU8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KHR5cGU/OiBUIHwgbnVsbCkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2U8VD4odHlwZSk7XG4gICAgfVxufVxuXG5jbGFzcyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PlxuICAgIGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXJJbXBsQmFzZTxUPlxuICAgICAgICBpbXBsZW1lbnRzIElSZWNvcmRCYXRjaFJlYWRlckltcGw8VD4sIEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4ge1xuXG4gICAgY29uc3RydWN0b3IocHJvdGVjdGVkIHJlYWRlcjogQXN5bmNNZXNzYWdlUmVhZGVyLCBkaWN0aW9uYXJpZXMgPSBuZXcgTWFwPG51bWJlciwgVmVjdG9yPigpKSB7XG4gICAgICAgIHN1cGVyKGRpY3Rpb25hcmllcyk7XG4gICAgfVxuICAgIHB1YmxpYyBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4ge1xuICAgICAgICByZXR1cm4gdGhpcyBhcyBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+O1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgY2xvc2UoKSB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQgJiYgKHRoaXMuY2xvc2VkID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucmVzZXQoKS5yZWFkZXIucmV0dXJuKCk7XG4gICAgICAgICAgICB0aGlzLnJlYWRlciA9IDxhbnk+IG51bGw7XG4gICAgICAgICAgICB0aGlzLmRpY3Rpb25hcmllcyA9IDxhbnk+IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyBvcGVuKGF1dG9DbG9zZSA9IHRoaXMuYXV0b0Nsb3NlKSB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQpIHtcbiAgICAgICAgICAgIHRoaXMuYXV0b0Nsb3NlID0gYXV0b0Nsb3NlO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBpZiAoISh0aGlzLnNjaGVtYSB8fCAodGhpcy5zY2hlbWEgPSAoYXdhaXQgdGhpcy5yZWFkZXIucmVhZFNjaGVtYSghYXV0b0Nsb3NlKSkhKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7IHRoaXMuY2xvc2UoKTsgdGhyb3cgZTsgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgdGhyb3codmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+IHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiB0aGlzLmF1dG9DbG9zZSAmJiAodGhpcy5jbG9zZWQgPSB0cnVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVzZXQoKS5yZWFkZXIudGhyb3codmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBJVEVSQVRPUl9ET05FO1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgcmV0dXJuKHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxhbnk+PiB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQgJiYgdGhpcy5hdXRvQ2xvc2UgJiYgKHRoaXMuY2xvc2VkID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJlc2V0KCkucmVhZGVyLnJldHVybih2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIElURVJBVE9SX0RPTkU7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyBuZXh0KCkge1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpIHsgcmV0dXJuIElURVJBVE9SX0RPTkU7IH1cbiAgICAgICAgbGV0IG1lc3NhZ2U6IE1lc3NhZ2UgfCBudWxsLCB7IHJlYWRlciB9ID0gdGhpcztcbiAgICAgICAgd2hpbGUgKG1lc3NhZ2UgPSBhd2FpdCB0aGlzLnJlYWROZXh0TWVzc2FnZUFuZFZhbGlkYXRlKCkpIHtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmlzU2NoZW1hKCkpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnJlc2V0KG1lc3NhZ2UuaGVhZGVyKCkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmlzUmVjb3JkQmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVjb3JkQmF0Y2hJbmRleCsrO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IG1lc3NhZ2UuaGVhZGVyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgcmVhZGVyLnJlYWRNZXNzYWdlQm9keShtZXNzYWdlLmJvZHlMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZEJhdGNoID0gdGhpcy5fbG9hZFJlY29yZEJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBkb25lOiBmYWxzZSwgdmFsdWU6IHJlY29yZEJhdGNoIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuaXNEaWN0aW9uYXJ5QmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyeUluZGV4Kys7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSBhd2FpdCByZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdmVjdG9yID0gdGhpcy5fbG9hZERpY3Rpb25hcnlCYXRjaChoZWFkZXIsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMuc2V0KGhlYWRlci5pZCwgdmVjdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZXR1cm4oKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIGFzeW5jIHJlYWROZXh0TWVzc2FnZUFuZFZhbGlkYXRlPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyPih0eXBlPzogVCB8IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVhZGVyLnJlYWRNZXNzYWdlPFQ+KHR5cGUpO1xuICAgIH1cbn1cblxuY2xhc3MgUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PlxuICAgIGV4dGVuZHMgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+XG4gICAgICAgIGltcGxlbWVudHMgSVJlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VD4sIEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHtcblxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgZm9vdGVyOiBGb290ZXI7XG4gICAgcHVibGljIGdldCBudW1EaWN0aW9uYXJpZXMoKSB7IHJldHVybiB0aGlzLmZvb3Rlci5udW1EaWN0aW9uYXJpZXM7IH1cbiAgICBwdWJsaWMgZ2V0IG51bVJlY29yZEJhdGNoZXMoKSB7IHJldHVybiB0aGlzLmZvb3Rlci5udW1SZWNvcmRCYXRjaGVzOyB9XG5cbiAgICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgZmlsZTogUmFuZG9tQWNjZXNzRmlsZSwgZGljdGlvbmFyaWVzID0gbmV3IE1hcDxudW1iZXIsIFZlY3Rvcj4oKSkge1xuICAgICAgICBzdXBlcihuZXcgTWVzc2FnZVJlYWRlcihmaWxlKSwgZGljdGlvbmFyaWVzKTtcbiAgICB9XG4gICAgcHVibGljIG9wZW4oYXV0b0Nsb3NlID0gdGhpcy5hdXRvQ2xvc2UpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiAhdGhpcy5mb290ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuc2NoZW1hID0gKHRoaXMuZm9vdGVyID0gdGhpcy5yZWFkRm9vdGVyKCkpLnNjaGVtYTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgYmxvY2sgb2YgdGhpcy5mb290ZXIuZGljdGlvbmFyeUJhdGNoZXMoKSkge1xuICAgICAgICAgICAgICAgIGJsb2NrICYmIHRoaXMucmVhZERpY3Rpb25hcnlCYXRjaCh0aGlzLmRpY3Rpb25hcnlJbmRleCsrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3VwZXIub3BlbihhdXRvQ2xvc2UpO1xuICAgIH1cbiAgICBwdWJsaWMgcmVhZFJlY29yZEJhdGNoKGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgaWYgKHRoaXMuY2xvc2VkKSB7IHJldHVybiBudWxsOyB9XG4gICAgICAgIGlmICghdGhpcy5mb290ZXIpIHsgdGhpcy5vcGVuKCk7IH1cbiAgICAgICAgY29uc3QgYmxvY2sgPSB0aGlzLmZvb3Rlci5nZXRSZWNvcmRCYXRjaChpbmRleCk7XG4gICAgICAgIGlmIChibG9jayAmJiB0aGlzLmZpbGUuc2VlayhibG9jay5vZmZzZXQpKSB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2UoTWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZSAmJiBtZXNzYWdlLmlzUmVjb3JkQmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IG1lc3NhZ2UuaGVhZGVyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkQmF0Y2ggPSB0aGlzLl9sb2FkUmVjb3JkQmF0Y2goaGVhZGVyLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZWNvcmRCYXRjaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHJlYWREaWN0aW9uYXJ5QmF0Y2goaW5kZXg6IG51bWJlcikge1xuICAgICAgICBjb25zdCBibG9jayA9IHRoaXMuZm9vdGVyLmdldERpY3Rpb25hcnlCYXRjaChpbmRleCk7XG4gICAgICAgIGlmIChibG9jayAmJiB0aGlzLmZpbGUuc2VlayhibG9jay5vZmZzZXQpKSB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2UoTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2gpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UgJiYgbWVzc2FnZS5pc0RpY3Rpb25hcnlCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB2ZWN0b3IgPSB0aGlzLl9sb2FkRGljdGlvbmFyeUJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpY3Rpb25hcmllcy5zZXQoaGVhZGVyLmlkLCB2ZWN0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHByb3RlY3RlZCByZWFkRm9vdGVyKCkge1xuICAgICAgICBjb25zdCB7IGZpbGUgfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0IHNpemUgPSBmaWxlLnNpemU7XG4gICAgICAgIGNvbnN0IG9mZnNldCA9IHNpemUgLSBtYWdpY0FuZFBhZGRpbmc7XG4gICAgICAgIGNvbnN0IGxlbmd0aCA9IGZpbGUucmVhZEludDMyKG9mZnNldCk7XG4gICAgICAgIGNvbnN0IGJ1ZmZlciA9IGZpbGUucmVhZEF0KG9mZnNldCAtIGxlbmd0aCwgbGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIEZvb3Rlci5kZWNvZGUoYnVmZmVyKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHJlYWROZXh0TWVzc2FnZUFuZFZhbGlkYXRlPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyPih0eXBlPzogVCB8IG51bGwpOiBNZXNzYWdlPFQ+IHwgbnVsbCB7XG4gICAgICAgIGlmICghdGhpcy5mb290ZXIpIHsgdGhpcy5vcGVuKCk7IH1cbiAgICAgICAgaWYgKHRoaXMucmVjb3JkQmF0Y2hJbmRleCA8IHRoaXMubnVtUmVjb3JkQmF0Y2hlcykge1xuICAgICAgICAgICAgY29uc3QgYmxvY2sgPSB0aGlzLmZvb3Rlci5nZXRSZWNvcmRCYXRjaCh0aGlzLnJlY29yZEJhdGNoSW5kZXgpO1xuICAgICAgICAgICAgaWYgKGJsb2NrICYmIHRoaXMuZmlsZS5zZWVrKGJsb2NrLm9mZnNldCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2UodHlwZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufVxuXG5jbGFzcyBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT5cbiAgICBleHRlbmRzIEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+XG4gICAgICAgIGltcGxlbWVudHMgSVJlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VD4sIEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4ge1xuXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyBmb290ZXI6IEZvb3RlcjtcbiAgICBwdWJsaWMgZ2V0IG51bURpY3Rpb25hcmllcygpIHsgcmV0dXJuIHRoaXMuZm9vdGVyLm51bURpY3Rpb25hcmllczsgfVxuICAgIHB1YmxpYyBnZXQgbnVtUmVjb3JkQmF0Y2hlcygpIHsgcmV0dXJuIHRoaXMuZm9vdGVyLm51bVJlY29yZEJhdGNoZXM7IH1cblxuICAgIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBmaWxlOiBBc3luY1JhbmRvbUFjY2Vzc0ZpbGUsIGRpY3Rpb25hcmllcyA9IG5ldyBNYXA8bnVtYmVyLCBWZWN0b3I+KCkpIHtcbiAgICAgICAgc3VwZXIobmV3IEFzeW5jTWVzc2FnZVJlYWRlcihmaWxlKSwgZGljdGlvbmFyaWVzKTtcbiAgICB9XG4gICAgcHVibGljIGFzeW5jIG9wZW4oYXV0b0Nsb3NlID0gdGhpcy5hdXRvQ2xvc2UpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiAhdGhpcy5mb290ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuc2NoZW1hID0gKHRoaXMuZm9vdGVyID0gYXdhaXQgdGhpcy5yZWFkRm9vdGVyKCkpLnNjaGVtYTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgYmxvY2sgb2YgdGhpcy5mb290ZXIuZGljdGlvbmFyeUJhdGNoZXMoKSkge1xuICAgICAgICAgICAgICAgIGJsb2NrICYmIHRoaXMucmVhZERpY3Rpb25hcnlCYXRjaCh0aGlzLmRpY3Rpb25hcnlJbmRleCsrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXdhaXQgc3VwZXIub3BlbihhdXRvQ2xvc2UpO1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgcmVhZFJlY29yZEJhdGNoKGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgaWYgKHRoaXMuY2xvc2VkKSB7IHJldHVybiBudWxsOyB9XG4gICAgICAgIGlmICghdGhpcy5mb290ZXIpIHsgYXdhaXQgdGhpcy5vcGVuKCk7IH1cbiAgICAgICAgY29uc3QgYmxvY2sgPSB0aGlzLmZvb3Rlci5nZXRSZWNvcmRCYXRjaChpbmRleCk7XG4gICAgICAgIGlmIChibG9jayAmJiAoYXdhaXQgdGhpcy5maWxlLnNlZWsoYmxvY2sub2Zmc2V0KSkpIHtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBhd2FpdCB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZShNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlICYmIG1lc3NhZ2UuaXNSZWNvcmRCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSBhd2FpdCB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRCYXRjaCA9IHRoaXMuX2xvYWRSZWNvcmRCYXRjaChoZWFkZXIsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlY29yZEJhdGNoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgYXN5bmMgcmVhZERpY3Rpb25hcnlCYXRjaChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGJsb2NrID0gdGhpcy5mb290ZXIuZ2V0RGljdGlvbmFyeUJhdGNoKGluZGV4KTtcbiAgICAgICAgaWYgKGJsb2NrICYmIChhd2FpdCB0aGlzLmZpbGUuc2VlayhibG9jay5vZmZzZXQpKSkge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGF3YWl0IHRoaXMucmVhZGVyLnJlYWRNZXNzYWdlKE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlICYmIG1lc3NhZ2UuaXNEaWN0aW9uYXJ5QmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IG1lc3NhZ2UuaGVhZGVyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdmVjdG9yID0gdGhpcy5fbG9hZERpY3Rpb25hcnlCYXRjaChoZWFkZXIsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMuc2V0KGhlYWRlci5pZCwgdmVjdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBwcm90ZWN0ZWQgYXN5bmMgcmVhZEZvb3RlcigpIHtcbiAgICAgICAgY29uc3QgeyBmaWxlIH0gPSB0aGlzO1xuICAgICAgICBjb25zdCBvZmZzZXQgPSBmaWxlLnNpemUgLSBtYWdpY0FuZFBhZGRpbmc7XG4gICAgICAgIGNvbnN0IGxlbmd0aCA9IGF3YWl0IGZpbGUucmVhZEludDMyKG9mZnNldCk7XG4gICAgICAgIGNvbnN0IGJ1ZmZlciA9IGF3YWl0IGZpbGUucmVhZEF0KG9mZnNldCAtIGxlbmd0aCwgbGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIEZvb3Rlci5kZWNvZGUoYnVmZmVyKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIGFzeW5jIHJlYWROZXh0TWVzc2FnZUFuZFZhbGlkYXRlPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyPih0eXBlPzogVCB8IG51bGwpOiBQcm9taXNlPE1lc3NhZ2U8VD4gfCBudWxsPiB7XG4gICAgICAgIGlmICghdGhpcy5mb290ZXIpIHsgYXdhaXQgdGhpcy5vcGVuKCk7IH1cbiAgICAgICAgaWYgKHRoaXMucmVjb3JkQmF0Y2hJbmRleCA8IHRoaXMubnVtUmVjb3JkQmF0Y2hlcykge1xuICAgICAgICAgICAgY29uc3QgYmxvY2sgPSB0aGlzLmZvb3Rlci5nZXRSZWNvcmRCYXRjaCh0aGlzLnJlY29yZEJhdGNoSW5kZXgpO1xuICAgICAgICAgICAgaWYgKGJsb2NrICYmIGF3YWl0IHRoaXMuZmlsZS5zZWVrKGJsb2NrLm9mZnNldCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2UodHlwZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufVxuXG5jbGFzcyBSZWNvcmRCYXRjaEpTT05SZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+IHtcbiAgICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgcmVhZGVyOiBKU09OTWVzc2FnZVJlYWRlciwgZGljdGlvbmFyaWVzID0gbmV3IE1hcDxudW1iZXIsIFZlY3Rvcj4oKSkge1xuICAgICAgICBzdXBlcihyZWFkZXIsIGRpY3Rpb25hcmllcyk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBfbG9hZFZlY3RvcnMoaGVhZGVyOiBtZXRhZGF0YS5SZWNvcmRCYXRjaCwgYm9keTogYW55LCB0eXBlczogKEZpZWxkIHwgRGF0YVR5cGUpW10pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBKU09OVmVjdG9yTG9hZGVyKGJvZHksIGhlYWRlci5ub2RlcywgaGVhZGVyLmJ1ZmZlcnMpLnZpc2l0TWFueSh0eXBlcyk7XG4gICAgfVxufVxuXG5pbnRlcmZhY2UgSVJlY29yZEJhdGNoUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiB7XG5cbiAgICBjbG9zZWQ6IGJvb2xlYW47XG4gICAgc2NoZW1hOiBTY2hlbWE8VD47XG4gICAgYXV0b0Nsb3NlOiBib29sZWFuO1xuICAgIG51bURpY3Rpb25hcmllczogbnVtYmVyO1xuICAgIG51bVJlY29yZEJhdGNoZXM6IG51bWJlcjtcbiAgICBkaWN0aW9uYXJpZXM6IE1hcDxudW1iZXIsIFZlY3Rvcj47XG5cbiAgICBvcGVuKGF1dG9DbG9zZT86IGJvb2xlYW4pOiB0aGlzIHwgUHJvbWlzZTx0aGlzPjtcbiAgICByZXNldChzY2hlbWE/OiBTY2hlbWE8VD4gfCBudWxsKTogdGhpcztcbiAgICBjbG9zZSgpOiB0aGlzIHwgUHJvbWlzZTx0aGlzPjtcblxuICAgIFtTeW1ib2wuaXRlcmF0b3JdPygpOiBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PjtcbiAgICBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdPygpOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+O1xuXG4gICAgdGhyb3codmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxhbnk+IHwgUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxhbnk+PjtcbiAgICByZXR1cm4odmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxhbnk+IHwgUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxhbnk+PjtcbiAgICBuZXh0KHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8UmVjb3JkQmF0Y2g8VD4+IHwgUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxSZWNvcmRCYXRjaDxUPj4+O1xufVxuXG5pbnRlcmZhY2UgSVJlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBJUmVjb3JkQmF0Y2hSZWFkZXJJbXBsPFQ+IHtcblxuICAgIGZvb3RlcjogRm9vdGVyO1xuXG4gICAgcmVhZFJlY29yZEJhdGNoKGluZGV4OiBudW1iZXIpOiBSZWNvcmRCYXRjaDxUPiB8IG51bGwgfCBQcm9taXNlPFJlY29yZEJhdGNoPFQ+IHwgbnVsbD47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IHtcbiAgICBjYW5jZWwoKTogdm9pZDtcbiAgICBvcGVuKGF1dG9DbG9zZT86IGJvb2xlYW4pOiB0aGlzO1xuICAgIHRocm93KHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8YW55PjtcbiAgICByZXR1cm4odmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxhbnk+O1xuICAgIG5leHQodmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxSZWNvcmRCYXRjaDxUPj47XG4gICAgcmVhZFJlY29yZEJhdGNoKGluZGV4OiBudW1iZXIpOiBSZWNvcmRCYXRjaDxUPiB8IG51bGw7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4ge1xuICAgIGNhbmNlbCgpOiB2b2lkO1xuICAgIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbik6IHRoaXM7XG4gICAgdGhyb3codmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxhbnk+O1xuICAgIHJldHVybih2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PGFueT47XG4gICAgbmV4dCh2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PFJlY29yZEJhdGNoPFQ+Pjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiB7XG4gICAgY2FuY2VsKCk6IFByb21pc2U8dm9pZD47XG4gICAgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKTogUHJvbWlzZTx0aGlzPjtcbiAgICB0aHJvdyh2YWx1ZT86IGFueSk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55Pj47XG4gICAgcmV0dXJuKHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxhbnk+PjtcbiAgICBuZXh0KHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxSZWNvcmRCYXRjaDxUPj4+O1xuICAgIHJlYWRSZWNvcmRCYXRjaChpbmRleDogbnVtYmVyKTogUHJvbWlzZTxSZWNvcmRCYXRjaDxUPiB8IG51bGw+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4ge1xuICAgIGNhbmNlbCgpOiBQcm9taXNlPHZvaWQ+O1xuICAgIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbik6IFByb21pc2U8dGhpcz47XG4gICAgdGhyb3codmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+O1xuICAgIHJldHVybih2YWx1ZT86IGFueSk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55Pj47XG4gICAgbmV4dCh2YWx1ZT86IGFueSk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8UmVjb3JkQmF0Y2g8VD4+Pjtcbn1cbiJdfQ==

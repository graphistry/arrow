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
class RecordBatchJSONReaderImpl extends RecordBatchStreamReaderImpl {
    constructor(reader, dictionaries = new Map()) {
        super(reader, dictionaries);
        this.reader = reader;
    }
    _loadVectors(header, body, types) {
        return new JSONVectorLoader(body, header.nodes, header.buffers).visitMany(types);
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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TUFBTSxDQUFDLEVBQUU7Z0JBQzdDLE9BQU8sTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUM5QztTQUNKO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztDQUNKO0FBRUQsTUFBTSx5QkFBdUUsU0FBUSwyQkFBOEI7SUFDL0csWUFBc0IsTUFBeUIsRUFBRSxZQUFZLEdBQUcsSUFBSSxHQUFHLEVBQWtCO1FBQ3JGLEtBQUssQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFEVixXQUFNLEdBQU4sTUFBTSxDQUFtQjtJQUUvQyxDQUFDO0lBQ1MsWUFBWSxDQUFDLE1BQTRCLEVBQUUsSUFBUyxFQUFFLEtBQTJCO1FBQ3ZGLE9BQU8sSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3JGLENBQUM7Q0FDSiIsImZpbGUiOiJpcGMvcmVhZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IERhdGFUeXBlIH0gZnJvbSAnLi4vdHlwZSc7XG5pbXBvcnQgeyBWZWN0b3IgfSBmcm9tICcuLi92ZWN0b3InO1xuaW1wb3J0IHsgTWVzc2FnZUhlYWRlciB9IGZyb20gJy4uL2VudW0nO1xuaW1wb3J0IHsgRm9vdGVyIH0gZnJvbSAnLi9tZXRhZGF0YS9maWxlJztcbmltcG9ydCB7IFNjaGVtYSwgRmllbGQgfSBmcm9tICcuLi9zY2hlbWEnO1xuaW1wb3J0IHN0cmVhbUFkYXB0ZXJzIGZyb20gJy4uL2lvL2FkYXB0ZXJzJztcbmltcG9ydCB7IE1lc3NhZ2UgfSBmcm9tICcuL21ldGFkYXRhL21lc3NhZ2UnO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2ggfSBmcm9tICcuLi9yZWNvcmRiYXRjaCc7XG5pbXBvcnQgKiBhcyBtZXRhZGF0YSBmcm9tICcuL21ldGFkYXRhL21lc3NhZ2UnO1xuaW1wb3J0IHsgQnl0ZVN0cmVhbSwgQXN5bmNCeXRlU3RyZWFtIH0gZnJvbSAnLi4vaW8vc3RyZWFtJztcbmltcG9ydCB7IEFycmF5QnVmZmVyVmlld0lucHV0LCB0b1VpbnQ4QXJyYXkgfSBmcm9tICcuLi91dGlsL2J1ZmZlcic7XG5pbXBvcnQgeyBSYW5kb21BY2Nlc3NGaWxlLCBBc3luY1JhbmRvbUFjY2Vzc0ZpbGUgfSBmcm9tICcuLi9pby9maWxlJztcbmltcG9ydCB7IFZlY3RvckxvYWRlciwgSlNPTlZlY3RvckxvYWRlciB9IGZyb20gJy4uL3Zpc2l0b3IvdmVjdG9ybG9hZGVyJztcbmltcG9ydCB7IEFycm93SlNPTiwgQXJyb3dKU09OTGlrZSwgRmlsZUhhbmRsZSwgUmVhZGFibGVJbnRlcm9wLCBJVEVSQVRPUl9ET05FIH0gZnJvbSAnLi4vaW8vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBpc1Byb21pc2UsIGlzQXJyb3dKU09OLCBpc0ZpbGVIYW5kbGUsIGlzRmV0Y2hSZXNwb25zZSwgaXNBc3luY0l0ZXJhYmxlLCBpc1JlYWRhYmxlRE9NU3RyZWFtLCBpc1JlYWRhYmxlTm9kZVN0cmVhbSB9IGZyb20gJy4uL3V0aWwvY29tcGF0JztcbmltcG9ydCB7IE1lc3NhZ2VSZWFkZXIsIEFzeW5jTWVzc2FnZVJlYWRlciwgY2hlY2tGb3JNYWdpY0Fycm93U3RyaW5nLCBtYWdpY0xlbmd0aCwgbWFnaWNBbmRQYWRkaW5nLCBtYWdpY1gyQW5kUGFkZGluZywgSlNPTk1lc3NhZ2VSZWFkZXIgfSBmcm9tICcuL21lc3NhZ2UnO1xuXG5leHBvcnQgdHlwZSBGcm9tQXJnMCA9IEFycm93SlNPTkxpa2U7XG5leHBvcnQgdHlwZSBGcm9tQXJnMSA9IFByb21pc2VMaWtlPEFycm93SlNPTkxpa2U+O1xuZXhwb3J0IHR5cGUgRnJvbUFyZzIgPSBJdGVyYWJsZTxBcnJheUJ1ZmZlclZpZXdJbnB1dD4gfCBBcnJheUJ1ZmZlclZpZXdJbnB1dDtcbmV4cG9ydCB0eXBlIEZyb21BcmczID0gUHJvbWlzZUxpa2U8SXRlcmFibGU8QXJyYXlCdWZmZXJWaWV3SW5wdXQ+IHwgQXJyYXlCdWZmZXJWaWV3SW5wdXQ+O1xuZXhwb3J0IHR5cGUgRnJvbUFyZzQgPSBOb2RlSlMuUmVhZGFibGVTdHJlYW0gfCBSZWFkYWJsZVN0cmVhbTxBcnJheUJ1ZmZlclZpZXdJbnB1dD4gfCBBc3luY0l0ZXJhYmxlPEFycmF5QnVmZmVyVmlld0lucHV0PjtcbmV4cG9ydCB0eXBlIEZyb21Bcmc1ID0gUmVzcG9uc2UgfCBGaWxlSGFuZGxlIHwgUHJvbWlzZUxpa2U8RmlsZUhhbmRsZT4gfCBQcm9taXNlTGlrZTxSZXNwb25zZT47XG5leHBvcnQgdHlwZSBGcm9tQXJncyA9IEZyb21BcmcwIHwgRnJvbUFyZzEgfCBGcm9tQXJnMiB8IEZyb21BcmczIHwgRnJvbUFyZzQgfCBGcm9tQXJnNTtcblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFJlY29yZEJhdGNoUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVhZGFibGVJbnRlcm9wPFJlY29yZEJhdGNoPFQ+PiB7XG5cbiAgICBwcm90ZWN0ZWQgY29uc3RydWN0b3IocHJvdGVjdGVkIGltcGw6IElSZWNvcmRCYXRjaFJlYWRlckltcGw8VD4pIHsgc3VwZXIoKTsgfVxuXG4gICAgcHVibGljIGdldCBjbG9zZWQoKSB7IHJldHVybiB0aGlzLmltcGwuY2xvc2VkOyB9XG4gICAgcHVibGljIGdldCBzY2hlbWEoKSB7IHJldHVybiB0aGlzLmltcGwuc2NoZW1hOyB9XG4gICAgcHVibGljIGdldCBhdXRvQ2xvc2UoKSB7IHJldHVybiB0aGlzLmltcGwuYXV0b0Nsb3NlOyB9XG4gICAgcHVibGljIGdldCBkaWN0aW9uYXJpZXMoKSB7IHJldHVybiB0aGlzLmltcGwuZGljdGlvbmFyaWVzOyB9XG4gICAgcHVibGljIGdldCBudW1EaWN0aW9uYXJpZXMoKSB7IHJldHVybiB0aGlzLmltcGwubnVtRGljdGlvbmFyaWVzOyB9XG4gICAgcHVibGljIGdldCBudW1SZWNvcmRCYXRjaGVzKCkgeyByZXR1cm4gdGhpcy5pbXBsLm51bVJlY29yZEJhdGNoZXM7IH1cblxuICAgIHB1YmxpYyBuZXh0KHZhbHVlPzogYW55KSB7IHJldHVybiB0aGlzLmltcGwubmV4dCh2YWx1ZSk7IH1cbiAgICBwdWJsaWMgdGhyb3codmFsdWU/OiBhbnkpIHsgcmV0dXJuIHRoaXMuaW1wbC50aHJvdyh2YWx1ZSk7IH1cbiAgICBwdWJsaWMgcmV0dXJuKHZhbHVlPzogYW55KSB7IHJldHVybiB0aGlzLmltcGwucmV0dXJuKHZhbHVlKTsgfVxuICAgIHB1YmxpYyByZXNldChzY2hlbWE/OiBTY2hlbWE8VD4gfCBudWxsKSB7IHRoaXMuaW1wbC5yZXNldChzY2hlbWEpOyByZXR1cm4gdGhpczsgfVxuXG4gICAgcHVibGljIGFic3RyYWN0IGNhbmNlbCgpOiB2b2lkIHwgUHJvbWlzZTx2b2lkPjtcbiAgICBwdWJsaWMgYWJzdHJhY3Qgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKTogdGhpcyB8IFByb21pc2U8dGhpcz47XG4gICAgcHVibGljIGFic3RyYWN0IFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+O1xuICAgIHB1YmxpYyBhYnN0cmFjdCBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj47XG5cbiAgICBwdWJsaWMgdG9SZWFkYWJsZURPTVN0cmVhbSgpIHtcbiAgICAgICAgcmV0dXJuIHN0cmVhbUFkYXB0ZXJzLnRvUmVhZGFibGVET01TdHJlYW08UmVjb3JkQmF0Y2g8VD4+KFxuICAgICAgICAgICAgKHRoaXMuaXNTeW5jKClcbiAgICAgICAgICAgICAgICA/IHsgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IHRoaXMgfSBhcyBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj5cbiAgICAgICAgICAgICAgICA6IHsgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXTogKCkgPT4gdGhpcyB9IGFzIEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KSk7XG4gICAgfVxuICAgIHB1YmxpYyB0b1JlYWRhYmxlTm9kZVN0cmVhbSgpIHtcbiAgICAgICAgcmV0dXJuIHN0cmVhbUFkYXB0ZXJzLnRvUmVhZGFibGVOb2RlU3RyZWFtPFJlY29yZEJhdGNoPFQ+PihcbiAgICAgICAgICAgICh0aGlzLmlzU3luYygpXG4gICAgICAgICAgICAgICAgPyB7IFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiB0aGlzIH0gYXMgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+XG4gICAgICAgICAgICAgICAgOiB7IFtTeW1ib2wuYXN5bmNJdGVyYXRvcl06ICgpID0+IHRoaXMgfSBhcyBBc3luY0l0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+PiksXG4gICAgICAgICAgICB7IG9iamVjdE1vZGU6IHRydWUgfSk7XG4gICAgfVxuXG4gICAgcHVibGljIGlzU3luYygpOiB0aGlzIGlzIFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+IHtcbiAgICAgICAgcmV0dXJuICh0aGlzIGluc3RhbmNlb2YgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyKSB8fCAodGhpcyBpbnN0YW5jZW9mIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyKTtcbiAgICB9XG4gICAgcHVibGljIGlzQXN5bmMoKTogdGhpcyBpcyBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4ge1xuICAgICAgICByZXR1cm4gKHRoaXMgaW5zdGFuY2VvZiBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcikgfHwgKHRoaXMgaW5zdGFuY2VvZiBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyKTtcbiAgICB9XG4gICAgcHVibGljIGlzRmlsZSgpOiB0aGlzIGlzIFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHtcbiAgICAgICAgcmV0dXJuICh0aGlzIGluc3RhbmNlb2YgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyKSB8fCAodGhpcyBpbnN0YW5jZW9mIEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyKTtcbiAgICB9XG4gICAgcHVibGljIGlzU3RyZWFtKCk6IHRoaXMgaXMgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4gfCBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+IHtcbiAgICAgICAgcmV0dXJuICh0aGlzIGluc3RhbmNlb2YgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXIpIHx8ICh0aGlzIGluc3RhbmNlb2YgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcik7XG4gICAgfVxuXG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyB0aHJvdWdoTm9kZSgpOiBpbXBvcnQoJ3N0cmVhbScpLkR1cGxleCB7IHRocm93IG5ldyBFcnJvcihgXCJ0aHJvdWdoTm9kZVwiIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBlbnZpcm9ubWVudGApOyB9XG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyB0aHJvdWdoRE9NPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0+KCk6IHsgd3JpdGFibGU6IFdyaXRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+LCByZWFkYWJsZTogUmVhZGFibGVTdHJlYW08UmVjb3JkQmF0Y2g8VD4+IH0ge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFwidGhyb3VnaERPTVwiIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBlbnZpcm9ubWVudGApO1xuICAgIH1cblxuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXI+KHNvdXJjZTogVCk6IFQ7XG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogRnJvbUFyZzApOiBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBGcm9tQXJnMSk6IFByb21pc2U8UmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IEZyb21BcmcyKTogUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogRnJvbUFyZzMpOiBQcm9taXNlPFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+PjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBGcm9tQXJnNCk6IFByb21pc2U8UmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPj47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogRnJvbUFyZzUpOiBQcm9taXNlPEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPj47XG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogYW55KSB7XG4gICAgICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBSZWNvcmRCYXRjaFJlYWRlcikge1xuICAgICAgICAgICAgcmV0dXJuIHNvdXJjZTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0Fycm93SlNPTihzb3VyY2UpKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVjb3JkQmF0Y2hSZWFkZXIuZnJvbUpTT048VD4oc291cmNlKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0ZpbGVIYW5kbGUoc291cmNlKSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlY29yZEJhdGNoUmVhZGVyLmZyb21GaWxlSGFuZGxlPFQ+KHNvdXJjZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNQcm9taXNlPGFueT4oc291cmNlKSkge1xuICAgICAgICAgICAgcmV0dXJuIChhc3luYyAoKSA9PiBhd2FpdCBSZWNvcmRCYXRjaFJlYWRlci5mcm9tPGFueT4oYXdhaXQgc291cmNlKSkoKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0ZldGNoUmVzcG9uc2Uoc291cmNlKSB8fCBpc1JlYWRhYmxlRE9NU3RyZWFtKHNvdXJjZSkgfHwgaXNSZWFkYWJsZU5vZGVTdHJlYW0oc291cmNlKSB8fCBpc0FzeW5jSXRlcmFibGUoc291cmNlKSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlY29yZEJhdGNoUmVhZGVyLmZyb21Bc3luY0J5dGVTdHJlYW08VD4obmV3IEFzeW5jQnl0ZVN0cmVhbShzb3VyY2UpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUmVjb3JkQmF0Y2hSZWFkZXIuZnJvbUJ5dGVTdHJlYW08VD4obmV3IEJ5dGVTdHJlYW0oc291cmNlKSk7XG4gICAgfVxuICAgIHByaXZhdGUgc3RhdGljIGZyb21KU09OPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0+KHNvdXJjZTogQXJyb3dKU09OTGlrZSkge1xuICAgICAgICByZXR1cm4gbmV3IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+KG5ldyBBcnJvd0pTT04oc291cmNlKSk7XG4gICAgfVxuICAgIHByaXZhdGUgc3RhdGljIGZyb21CeXRlU3RyZWFtPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0+KHNvdXJjZTogQnl0ZVN0cmVhbSkge1xuICAgICAgICBjb25zdCBieXRlcyA9IHNvdXJjZS5wZWVrKChtYWdpY0xlbmd0aCArIDcpICYgfjcpO1xuICAgICAgICByZXR1cm4gYnl0ZXMgJiYgYnl0ZXMuYnl0ZUxlbmd0aCA+PSA0XG4gICAgICAgICAgICA/IGNoZWNrRm9yTWFnaWNBcnJvd1N0cmluZyhieXRlcylcbiAgICAgICAgICAgID8gbmV3IFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPihzb3VyY2UucmVhZCgpKVxuICAgICAgICAgICAgOiBuZXcgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4oc291cmNlKVxuICAgICAgICAgICAgOiBuZXcgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4oZnVuY3Rpb24qKCk6IGFueSB7fSgpKTtcbiAgICB9XG4gICAgcHJpdmF0ZSBzdGF0aWMgYXN5bmMgZnJvbUFzeW5jQnl0ZVN0cmVhbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9Pihzb3VyY2U6IEFzeW5jQnl0ZVN0cmVhbSkge1xuICAgICAgICBjb25zdCBieXRlcyA9IGF3YWl0IHNvdXJjZS5wZWVrKChtYWdpY0xlbmd0aCArIDcpICYgfjcpO1xuICAgICAgICByZXR1cm4gYnl0ZXMgJiYgYnl0ZXMuYnl0ZUxlbmd0aCA+PSA0XG4gICAgICAgICAgICA/IGNoZWNrRm9yTWFnaWNBcnJvd1N0cmluZyhieXRlcylcbiAgICAgICAgICAgID8gbmV3IFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPihhd2FpdCBzb3VyY2UucmVhZCgpKVxuICAgICAgICAgICAgOiBuZXcgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPihzb3VyY2UpXG4gICAgICAgICAgICA6IG5ldyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+KGFzeW5jIGZ1bmN0aW9uKigpOiBhbnkge30oKSk7XG4gICAgfVxuICAgIHByaXZhdGUgc3RhdGljIGFzeW5jIGZyb21GaWxlSGFuZGxlPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0+KHNvdXJjZTogRmlsZUhhbmRsZSkge1xuICAgICAgICBjb25zdCB7IHNpemUgfSA9IGF3YWl0IHNvdXJjZS5zdGF0KCk7XG4gICAgICAgIGNvbnN0IGZpbGUgPSBuZXcgQXN5bmNSYW5kb21BY2Nlc3NGaWxlKHNvdXJjZSwgc2l6ZSk7XG4gICAgICAgIGlmIChzaXplID49IG1hZ2ljWDJBbmRQYWRkaW5nKSB7XG4gICAgICAgICAgICBpZiAoY2hlY2tGb3JNYWdpY0Fycm93U3RyaW5nKGF3YWl0IGZpbGUucmVhZEF0KDAsIChtYWdpY0xlbmd0aCArIDcpICYgfjcpKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4oZmlsZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+KGZpbGUpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoUmVhZGVyPFQ+IHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHJvdGVjdGVkIGltcGw6IFJlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VD47XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VD4pO1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogUmFuZG9tQWNjZXNzRmlsZSwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgVmVjdG9yPik7XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBBcnJheUJ1ZmZlclZpZXdJbnB1dCwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgVmVjdG9yPik7XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VD4gfCBSYW5kb21BY2Nlc3NGaWxlIHwgQXJyYXlCdWZmZXJWaWV3SW5wdXQsIGRpY3Rpb25hcmllcz86IE1hcDxudW1iZXIsIFZlY3Rvcj4pIHtcbiAgICAgICAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbCkge1xuICAgICAgICAgICAgc3VwZXIoc291cmNlKTtcbiAgICAgICAgfSBlbHNlIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBSYW5kb21BY2Nlc3NGaWxlKSB7XG4gICAgICAgICAgICBzdXBlcihuZXcgUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbChzb3VyY2UsIGRpY3Rpb25hcmllcykpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3VwZXIobmV3IFJlY29yZEJhdGNoRmlsZVJlYWRlckltcGwobmV3IFJhbmRvbUFjY2Vzc0ZpbGUodG9VaW50OEFycmF5KHNvdXJjZSkpLCBkaWN0aW9uYXJpZXMpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBwdWJsaWMgZ2V0IGZvb3RlcigpIHsgcmV0dXJuIHRoaXMuaW1wbC5mb290ZXI7IH1cbiAgICBwdWJsaWMgY2FuY2VsKCkgeyB0aGlzLmltcGwuY2xvc2UoKTsgfVxuICAgIHB1YmxpYyBvcGVuKGF1dG9DbG9zZT86IGJvb2xlYW4pIHsgdGhpcy5pbXBsLm9wZW4oYXV0b0Nsb3NlKTsgcmV0dXJuIHRoaXM7IH1cbiAgICBwdWJsaWMgcmVhZFJlY29yZEJhdGNoKGluZGV4OiBudW1iZXIpIHsgcmV0dXJuIHRoaXMuaW1wbC5yZWFkUmVjb3JkQmF0Y2goaW5kZXgpOyB9XG4gICAgcHVibGljIFtTeW1ib2wuaXRlcmF0b3JdKCkgeyByZXR1cm4gKHRoaXMuaW1wbCBhcyBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PilbU3ltYm9sLml0ZXJhdG9yXSgpOyB9XG4gICAgcHVibGljIGFzeW5jICpbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4geyB5aWVsZCogdGhpc1tTeW1ib2wuaXRlcmF0b3JdKCk7IH1cbn1cblxuZXhwb3J0IGNsYXNzIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXI8VD4ge1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwcm90ZWN0ZWQgaW1wbDogUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+O1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogQnl0ZVN0cmVhbSB8IEFycm93SlNPTiB8IEFycmF5QnVmZmVyVmlldyB8IEl0ZXJhYmxlPEFycmF5QnVmZmVyVmlldz4sIGRpY3Rpb25hcmllcz86IE1hcDxudW1iZXIsIFZlY3Rvcj4pIHtcbiAgICAgICAgc3VwZXIoaXNBcnJvd0pTT04oc291cmNlKVxuICAgICAgICAgICAgPyBuZXcgUmVjb3JkQmF0Y2hKU09OUmVhZGVySW1wbChuZXcgSlNPTk1lc3NhZ2VSZWFkZXIoc291cmNlKSwgZGljdGlvbmFyaWVzKVxuICAgICAgICAgICAgOiBuZXcgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsKG5ldyBNZXNzYWdlUmVhZGVyKHNvdXJjZSksIGRpY3Rpb25hcmllcykpO1xuICAgIH1cbiAgICBwdWJsaWMgY2FuY2VsKCkgeyB0aGlzLmltcGwuY2xvc2UoKTsgfVxuICAgIHB1YmxpYyBvcGVuKGF1dG9DbG9zZT86IGJvb2xlYW4pIHsgdGhpcy5pbXBsLm9wZW4oYXV0b0Nsb3NlKTsgcmV0dXJuIHRoaXM7IH1cbiAgICBwdWJsaWMgW1N5bWJvbC5pdGVyYXRvcl0oKSB7IHJldHVybiAodGhpcy5pbXBsIGFzIEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+KVtTeW1ib2wuaXRlcmF0b3JdKCk7IH1cbiAgICBwdWJsaWMgYXN5bmMgKltTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7IHlpZWxkKiB0aGlzW1N5bWJvbC5pdGVyYXRvcl0oKTsgfVxufVxuXG5leHBvcnQgY2xhc3MgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoUmVhZGVyPFQ+IHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHJvdGVjdGVkIGltcGw6IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+O1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogQXN5bmNCeXRlU3RyZWFtIHwgRmlsZUhhbmRsZSB8IE5vZGVKUy5SZWFkYWJsZVN0cmVhbSB8IFJlYWRhYmxlU3RyZWFtPEFycmF5QnVmZmVyVmlldz4gfCBBc3luY0l0ZXJhYmxlPEFycmF5QnVmZmVyVmlldz4sIGJ5dGVMZW5ndGg/OiBudW1iZXIpIHtcbiAgICAgICAgc3VwZXIobmV3IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsKG5ldyBBc3luY01lc3NhZ2VSZWFkZXIoc291cmNlIGFzIEZpbGVIYW5kbGUsIGJ5dGVMZW5ndGgpKSk7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyBjYW5jZWwoKSB7IGF3YWl0IHRoaXMuaW1wbC5jbG9zZSgpOyB9XG4gICAgcHVibGljIGFzeW5jIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbikgeyBhd2FpdCB0aGlzLmltcGwub3BlbihhdXRvQ2xvc2UpOyByZXR1cm4gdGhpczsgfVxuICAgIHB1YmxpYyBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCkgeyByZXR1cm4gKHRoaXMuaW1wbCBhcyBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+KVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTsgfVxuICAgIHB1YmxpYyBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7IHRocm93IG5ldyBFcnJvcihgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlciBpcyBub3QgSXRlcmFibGVgKTsgfVxufVxuXG5leHBvcnQgY2xhc3MgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlcjxUPiB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHByb3RlY3RlZCBpbXBsOiBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VD47XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBBc3luY1JhbmRvbUFjY2Vzc0ZpbGUpO1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogQXN5bmNSYW5kb21BY2Nlc3NGaWxlLCBkaWN0aW9uYXJpZXM6IE1hcDxudW1iZXIsIFZlY3Rvcj4pO1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogRmlsZUhhbmRsZSwgYnl0ZUxlbmd0aDogbnVtYmVyLCBkaWN0aW9uYXJpZXM6IE1hcDxudW1iZXIsIFZlY3Rvcj4pO1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogQXN5bmNSYW5kb21BY2Nlc3NGaWxlIHwgRmlsZUhhbmRsZSwgLi4ucmVzdDogKG51bWJlciB8IE1hcDxudW1iZXIsIFZlY3Rvcj4pW10pIHtcbiAgICAgICAgbGV0IFtieXRlTGVuZ3RoLCBkaWN0aW9uYXJpZXNdID0gcmVzdCBhcyBbbnVtYmVyLCBNYXA8bnVtYmVyLCBWZWN0b3I+XTtcbiAgICAgICAgaWYgKGJ5dGVMZW5ndGggJiYgdHlwZW9mIGJ5dGVMZW5ndGggIT09ICdudW1iZXInKSB7IGRpY3Rpb25hcmllcyA9IGJ5dGVMZW5ndGg7IH1cbiAgICAgICAgbGV0IGZpbGUgPSBzb3VyY2UgaW5zdGFuY2VvZiBBc3luY1JhbmRvbUFjY2Vzc0ZpbGUgPyBzb3VyY2UgOiBuZXcgQXN5bmNSYW5kb21BY2Nlc3NGaWxlKHNvdXJjZSwgYnl0ZUxlbmd0aCk7XG4gICAgICAgIHN1cGVyKG5ldyBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlckltcGwoZmlsZSwgZGljdGlvbmFyaWVzKSk7XG4gICAgfVxuICAgIHB1YmxpYyBnZXQgZm9vdGVyKCkgeyByZXR1cm4gdGhpcy5pbXBsLmZvb3RlcjsgfVxuICAgIHB1YmxpYyBhc3luYyBjYW5jZWwoKSB7IGF3YWl0IHRoaXMuaW1wbC5jbG9zZSgpOyB9XG4gICAgcHVibGljIGFzeW5jIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbikgeyBhd2FpdCB0aGlzLmltcGwub3BlbihhdXRvQ2xvc2UpOyByZXR1cm4gdGhpczsgfVxuICAgIHB1YmxpYyByZWFkUmVjb3JkQmF0Y2goaW5kZXg6IG51bWJlcikgeyByZXR1cm4gdGhpcy5pbXBsLnJlYWRSZWNvcmRCYXRjaChpbmRleCk7IH1cbiAgICBwdWJsaWMgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpIHsgcmV0dXJuICh0aGlzLmltcGwgYXMgQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PilbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk7IH1cbiAgICBwdWJsaWMgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4geyB0aHJvdyBuZXcgRXJyb3IoYEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyIGlzIG5vdCBJdGVyYWJsZWApOyB9XG59XG5cbmFic3RyYWN0IGNsYXNzIFJlY29yZEJhdGNoUmVhZGVySW1wbEJhc2U8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4ge1xuXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyBzY2hlbWE6IFNjaGVtYTtcbiAgICBwdWJsaWMgY2xvc2VkID0gZmFsc2U7XG4gICAgcHVibGljIGF1dG9DbG9zZSA9IHRydWU7XG4gICAgcHVibGljIGRpY3Rpb25hcnlJbmRleCA9IDA7XG4gICAgcHVibGljIHJlY29yZEJhdGNoSW5kZXggPSAwO1xuICAgIHB1YmxpYyBkaWN0aW9uYXJpZXM6IE1hcDxudW1iZXIsIFZlY3Rvcj47XG4gICAgcHVibGljIGdldCBudW1EaWN0aW9uYXJpZXMoKSB7IHJldHVybiB0aGlzLmRpY3Rpb25hcnlJbmRleDsgfVxuICAgIHB1YmxpYyBnZXQgbnVtUmVjb3JkQmF0Y2hlcygpIHsgcmV0dXJuIHRoaXMucmVjb3JkQmF0Y2hJbmRleDsgfVxuXG4gICAgY29uc3RydWN0b3IoZGljdGlvbmFyaWVzID0gbmV3IE1hcDxudW1iZXIsIFZlY3Rvcj4oKSkge1xuICAgICAgICB0aGlzLmRpY3Rpb25hcmllcyA9IGRpY3Rpb25hcmllcztcbiAgICB9XG4gICAgcHVibGljIHJlc2V0KHNjaGVtYT86IFNjaGVtYTxUPiB8IG51bGwpIHtcbiAgICAgICAgdGhpcy5kaWN0aW9uYXJ5SW5kZXggPSAwO1xuICAgICAgICB0aGlzLnJlY29yZEJhdGNoSW5kZXggPSAwO1xuICAgICAgICB0aGlzLnNjaGVtYSA9IDxhbnk+IHNjaGVtYTtcbiAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMgPSBuZXcgTWFwKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgX2xvYWRSZWNvcmRCYXRjaChoZWFkZXI6IG1ldGFkYXRhLlJlY29yZEJhdGNoLCBib2R5OiBhbnkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZWNvcmRCYXRjaDxUPih0aGlzLnNjaGVtYSwgaGVhZGVyLmxlbmd0aCwgdGhpcy5fbG9hZFZlY3RvcnMoaGVhZGVyLCBib2R5LCB0aGlzLnNjaGVtYS5maWVsZHMpKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIF9sb2FkRGljdGlvbmFyeUJhdGNoKGhlYWRlcjogbWV0YWRhdGEuRGljdGlvbmFyeUJhdGNoLCBib2R5OiBhbnkpIHtcbiAgICAgICAgY29uc3QgeyBpZCwgaXNEZWx0YSwgZGF0YSB9ID0gaGVhZGVyO1xuICAgICAgICBjb25zdCB7IGRpY3Rpb25hcmllcywgc2NoZW1hIH0gPSB0aGlzO1xuICAgICAgICBpZiAoaXNEZWx0YSB8fCAhZGljdGlvbmFyaWVzLmdldChpZCkpIHtcblxuICAgICAgICAgICAgY29uc3QgdHlwZSA9IHNjaGVtYS5kaWN0aW9uYXJpZXMuZ2V0KGlkKSE7XG4gICAgICAgICAgICBjb25zdCB2ZWN0b3IgPSAoaXNEZWx0YSA/IGRpY3Rpb25hcmllcy5nZXQoaWQpIS5jb25jYXQoXG4gICAgICAgICAgICAgICAgVmVjdG9yLm5ldyh0aGlzLl9sb2FkVmVjdG9ycyhkYXRhLCBib2R5LCBbdHlwZV0pWzBdKSkgOlxuICAgICAgICAgICAgICAgIFZlY3Rvci5uZXcodGhpcy5fbG9hZFZlY3RvcnMoZGF0YSwgYm9keSwgW3R5cGVdKVswXSkpIGFzIFZlY3RvcjtcblxuICAgICAgICAgICAgKHNjaGVtYS5kaWN0aW9uYXJ5RmllbGRzLmdldChpZCkgfHwgW10pLmZvckVhY2goKHsgdHlwZSB9KSA9PiB0eXBlLmRpY3Rpb25hcnlWZWN0b3IgPSB2ZWN0b3IpO1xuXG4gICAgICAgICAgICByZXR1cm4gdmVjdG9yO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkaWN0aW9uYXJpZXMuZ2V0KGlkKSE7XG4gICAgfVxuICAgIHByb3RlY3RlZCBfbG9hZFZlY3RvcnMoaGVhZGVyOiBtZXRhZGF0YS5SZWNvcmRCYXRjaCwgYm9keTogYW55LCB0eXBlczogKEZpZWxkIHwgRGF0YVR5cGUpW10pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWN0b3JMb2FkZXIoYm9keSwgaGVhZGVyLm5vZGVzLCBoZWFkZXIuYnVmZmVycykudmlzaXRNYW55KHR5cGVzKTtcbiAgICB9XG59XG5cbmNsYXNzIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PlxuICAgIGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXJJbXBsQmFzZTxUPlxuICAgICAgICBpbXBsZW1lbnRzIElSZWNvcmRCYXRjaFJlYWRlckltcGw8VD4sIEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHtcblxuICAgIGNvbnN0cnVjdG9yKHByb3RlY3RlZCByZWFkZXI6IE1lc3NhZ2VSZWFkZXIsIGRpY3Rpb25hcmllcyA9IG5ldyBNYXA8bnVtYmVyLCBWZWN0b3I+KCkpIHtcbiAgICAgICAgc3VwZXIoZGljdGlvbmFyaWVzKTtcbiAgICB9XG4gICAgcHVibGljIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMgYXMgSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj47XG4gICAgfVxuICAgIHB1YmxpYyBjbG9zZSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiAodGhpcy5jbG9zZWQgPSB0cnVlKSkge1xuICAgICAgICAgICAgdGhpcy5yZXNldCgpLnJlYWRlci5yZXR1cm4oKTtcbiAgICAgICAgICAgIHRoaXMucmVhZGVyID0gPGFueT4gbnVsbDtcbiAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyaWVzID0gPGFueT4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHVibGljIG9wZW4oYXV0b0Nsb3NlID0gdGhpcy5hdXRvQ2xvc2UpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCkge1xuICAgICAgICAgICAgdGhpcy5hdXRvQ2xvc2UgPSBhdXRvQ2xvc2U7XG4gICAgICAgICAgICBpZiAoISh0aGlzLnNjaGVtYSB8fCAodGhpcy5zY2hlbWEgPSB0aGlzLnJlYWRlci5yZWFkU2NoZW1hKCkhKSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwdWJsaWMgdGhyb3codmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxhbnk+IHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiB0aGlzLmF1dG9DbG9zZSAmJiAodGhpcy5jbG9zZWQgPSB0cnVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVzZXQoKS5yZWFkZXIudGhyb3codmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBJVEVSQVRPUl9ET05FO1xuICAgIH1cbiAgICBwdWJsaWMgcmV0dXJuKHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8YW55PiB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQgJiYgdGhpcy5hdXRvQ2xvc2UgJiYgKHRoaXMuY2xvc2VkID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlc2V0KCkucmVhZGVyLnJldHVybih2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIElURVJBVE9SX0RPTkU7XG4gICAgfVxuICAgIHB1YmxpYyBuZXh0KCk6IEl0ZXJhdG9yUmVzdWx0PFJlY29yZEJhdGNoPFQ+PiB7XG4gICAgICAgIGlmICh0aGlzLmNsb3NlZCkgeyByZXR1cm4gSVRFUkFUT1JfRE9ORTsgfVxuICAgICAgICBsZXQgbWVzc2FnZTogTWVzc2FnZSB8IG51bGwsIHsgcmVhZGVyIH0gPSB0aGlzO1xuICAgICAgICB3aGlsZSAobWVzc2FnZSA9IHRoaXMucmVhZE5leHRNZXNzYWdlQW5kVmFsaWRhdGUoKSkge1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuaXNTY2hlbWEoKSkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVzZXQobWVzc2FnZS5oZWFkZXIoKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuaXNSZWNvcmRCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWNvcmRCYXRjaEluZGV4Kys7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSByZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkQmF0Y2ggPSB0aGlzLl9sb2FkUmVjb3JkQmF0Y2goaGVhZGVyLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IGRvbmU6IGZhbHNlLCB2YWx1ZTogcmVjb3JkQmF0Y2ggfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5pc0RpY3Rpb25hcnlCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJ5SW5kZXgrKztcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBtZXNzYWdlLmhlYWRlcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IHJlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB2ZWN0b3IgPSB0aGlzLl9sb2FkRGljdGlvbmFyeUJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpY3Rpb25hcmllcy5zZXQoaGVhZGVyLmlkLCB2ZWN0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnJldHVybigpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgcmVhZE5leHRNZXNzYWdlQW5kVmFsaWRhdGU8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KHR5cGU/OiBUIHwgbnVsbCkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2U8VD4odHlwZSk7XG4gICAgfVxufVxuXG5jbGFzcyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PlxuICAgIGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXJJbXBsQmFzZTxUPlxuICAgICAgICBpbXBsZW1lbnRzIElSZWNvcmRCYXRjaFJlYWRlckltcGw8VD4sIEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4ge1xuXG4gICAgY29uc3RydWN0b3IocHJvdGVjdGVkIHJlYWRlcjogQXN5bmNNZXNzYWdlUmVhZGVyLCBkaWN0aW9uYXJpZXMgPSBuZXcgTWFwPG51bWJlciwgVmVjdG9yPigpKSB7XG4gICAgICAgIHN1cGVyKGRpY3Rpb25hcmllcyk7XG4gICAgfVxuICAgIHB1YmxpYyBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4ge1xuICAgICAgICByZXR1cm4gdGhpcyBhcyBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+O1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgY2xvc2UoKSB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQgJiYgKHRoaXMuY2xvc2VkID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucmVzZXQoKS5yZWFkZXIucmV0dXJuKCk7XG4gICAgICAgICAgICB0aGlzLnJlYWRlciA9IDxhbnk+IG51bGw7XG4gICAgICAgICAgICB0aGlzLmRpY3Rpb25hcmllcyA9IDxhbnk+IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyBvcGVuKGF1dG9DbG9zZT86IGJvb2xlYW4pIHtcbiAgICAgICAgLy8gZGVmYXVsdCBhcmdzIGluIGFuIGFzeW5jIGZ1bmN0aW9uIGNyYXNoIGNsb3N1cmUtY29tcGlsZXIgYXQgdGhlIG1vbWVudFxuICAgICAgICAvLyBzbyBkbyB0aGlzIGluc3RlYWQuIGh0dHBzOi8vZ2l0aHViLmNvbS9nb29nbGUvY2xvc3VyZS1jb21waWxlci9pc3N1ZXMvMzE3OFxuICAgICAgICBhdXRvQ2xvc2UgIT09IHVuZGVmaW5lZCB8fCAoYXV0b0Nsb3NlID0gdGhpcy5hdXRvQ2xvc2UpO1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkKSB7XG4gICAgICAgICAgICB0aGlzLmF1dG9DbG9zZSA9IGF1dG9DbG9zZTtcbiAgICAgICAgICAgIGlmICghKHRoaXMuc2NoZW1hIHx8ICh0aGlzLnNjaGVtYSA9IChhd2FpdCB0aGlzLnJlYWRlci5yZWFkU2NoZW1hKCkpISkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHVibGljIGFzeW5jIHRocm93KHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxhbnk+PiB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQgJiYgdGhpcy5hdXRvQ2xvc2UgJiYgKHRoaXMuY2xvc2VkID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJlc2V0KCkucmVhZGVyLnRocm93KHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gSVRFUkFUT1JfRE9ORTtcbiAgICB9XG4gICAgcHVibGljIGFzeW5jIHJldHVybih2YWx1ZT86IGFueSk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55Pj4ge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkICYmIHRoaXMuYXV0b0Nsb3NlICYmICh0aGlzLmNsb3NlZCA9IHRydWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZXNldCgpLnJlYWRlci5yZXR1cm4odmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBJVEVSQVRPUl9ET05FO1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgbmV4dCgpIHtcbiAgICAgICAgaWYgKHRoaXMuY2xvc2VkKSB7IHJldHVybiBJVEVSQVRPUl9ET05FOyB9XG4gICAgICAgIGxldCBtZXNzYWdlOiBNZXNzYWdlIHwgbnVsbCwgeyByZWFkZXIgfSA9IHRoaXM7XG4gICAgICAgIHdoaWxlIChtZXNzYWdlID0gYXdhaXQgdGhpcy5yZWFkTmV4dE1lc3NhZ2VBbmRWYWxpZGF0ZSgpKSB7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5pc1NjaGVtYSgpKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5yZXNldChtZXNzYWdlLmhlYWRlcigpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5pc1JlY29yZEJhdGNoKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlY29yZEJhdGNoSW5kZXgrKztcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBtZXNzYWdlLmhlYWRlcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IGF3YWl0IHJlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRCYXRjaCA9IHRoaXMuX2xvYWRSZWNvcmRCYXRjaChoZWFkZXIsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgZG9uZTogZmFsc2UsIHZhbHVlOiByZWNvcmRCYXRjaCB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmlzRGljdGlvbmFyeUJhdGNoKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRpY3Rpb25hcnlJbmRleCsrO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IG1lc3NhZ2UuaGVhZGVyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgcmVhZGVyLnJlYWRNZXNzYWdlQm9keShtZXNzYWdlLmJvZHlMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHZlY3RvciA9IHRoaXMuX2xvYWREaWN0aW9uYXJ5QmF0Y2goaGVhZGVyLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyaWVzLnNldChoZWFkZXIuaWQsIHZlY3Rvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmV0dXJuKCk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBhc3luYyByZWFkTmV4dE1lc3NhZ2VBbmRWYWxpZGF0ZTxUIGV4dGVuZHMgTWVzc2FnZUhlYWRlcj4odHlwZT86IFQgfCBudWxsKSB7XG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZTxUPih0eXBlKTtcbiAgICB9XG59XG5cbmNsYXNzIFJlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT5cbiAgICBleHRlbmRzIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUPlxuICAgICAgICBpbXBsZW1lbnRzIElSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQ+LCBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7XG5cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIGZvb3RlcjogRm9vdGVyO1xuICAgIHB1YmxpYyBnZXQgbnVtRGljdGlvbmFyaWVzKCkgeyByZXR1cm4gdGhpcy5mb290ZXIubnVtRGljdGlvbmFyaWVzOyB9XG4gICAgcHVibGljIGdldCBudW1SZWNvcmRCYXRjaGVzKCkgeyByZXR1cm4gdGhpcy5mb290ZXIubnVtUmVjb3JkQmF0Y2hlczsgfVxuXG4gICAgY29uc3RydWN0b3IocHJvdGVjdGVkIGZpbGU6IFJhbmRvbUFjY2Vzc0ZpbGUsIGRpY3Rpb25hcmllcyA9IG5ldyBNYXA8bnVtYmVyLCBWZWN0b3I+KCkpIHtcbiAgICAgICAgc3VwZXIobmV3IE1lc3NhZ2VSZWFkZXIoZmlsZSksIGRpY3Rpb25hcmllcyk7XG4gICAgfVxuICAgIHB1YmxpYyBvcGVuKGF1dG9DbG9zZSA9IHRoaXMuYXV0b0Nsb3NlKSB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQgJiYgIXRoaXMuZm9vdGVyKSB7XG4gICAgICAgICAgICB0aGlzLnNjaGVtYSA9ICh0aGlzLmZvb3RlciA9IHRoaXMucmVhZEZvb3RlcigpKS5zY2hlbWE7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGJsb2NrIG9mIHRoaXMuZm9vdGVyLmRpY3Rpb25hcnlCYXRjaGVzKCkpIHtcbiAgICAgICAgICAgICAgICBibG9jayAmJiB0aGlzLnJlYWREaWN0aW9uYXJ5QmF0Y2godGhpcy5kaWN0aW9uYXJ5SW5kZXgrKyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN1cGVyLm9wZW4oYXV0b0Nsb3NlKTtcbiAgICB9XG4gICAgcHVibGljIHJlYWRSZWNvcmRCYXRjaChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIGlmICh0aGlzLmNsb3NlZCkgeyByZXR1cm4gbnVsbDsgfVxuICAgICAgICBpZiAoIXRoaXMuZm9vdGVyKSB7IHRoaXMub3BlbigpOyB9XG4gICAgICAgIGNvbnN0IGJsb2NrID0gdGhpcy5mb290ZXIuZ2V0UmVjb3JkQmF0Y2goaW5kZXgpO1xuICAgICAgICBpZiAoYmxvY2sgJiYgdGhpcy5maWxlLnNlZWsoYmxvY2sub2Zmc2V0KSkge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IHRoaXMucmVhZGVyLnJlYWRNZXNzYWdlKE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2gpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UgJiYgbWVzc2FnZS5pc1JlY29yZEJhdGNoKCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBtZXNzYWdlLmhlYWRlcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IHRoaXMucmVhZGVyLnJlYWRNZXNzYWdlQm9keShtZXNzYWdlLmJvZHlMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZEJhdGNoID0gdGhpcy5fbG9hZFJlY29yZEJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVjb3JkQmF0Y2g7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHByb3RlY3RlZCByZWFkRGljdGlvbmFyeUJhdGNoKGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgYmxvY2sgPSB0aGlzLmZvb3Rlci5nZXREaWN0aW9uYXJ5QmF0Y2goaW5kZXgpO1xuICAgICAgICBpZiAoYmxvY2sgJiYgdGhpcy5maWxlLnNlZWsoYmxvY2sub2Zmc2V0KSkge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IHRoaXMucmVhZGVyLnJlYWRNZXNzYWdlKE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlICYmIG1lc3NhZ2UuaXNEaWN0aW9uYXJ5QmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IG1lc3NhZ2UuaGVhZGVyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdmVjdG9yID0gdGhpcy5fbG9hZERpY3Rpb25hcnlCYXRjaChoZWFkZXIsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMuc2V0KGhlYWRlci5pZCwgdmVjdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBwcm90ZWN0ZWQgcmVhZEZvb3RlcigpIHtcbiAgICAgICAgY29uc3QgeyBmaWxlIH0gPSB0aGlzO1xuICAgICAgICBjb25zdCBzaXplID0gZmlsZS5zaXplO1xuICAgICAgICBjb25zdCBvZmZzZXQgPSBzaXplIC0gbWFnaWNBbmRQYWRkaW5nO1xuICAgICAgICBjb25zdCBsZW5ndGggPSBmaWxlLnJlYWRJbnQzMihvZmZzZXQpO1xuICAgICAgICBjb25zdCBidWZmZXIgPSBmaWxlLnJlYWRBdChvZmZzZXQgLSBsZW5ndGgsIGxlbmd0aCk7XG4gICAgICAgIHJldHVybiBGb290ZXIuZGVjb2RlKGJ1ZmZlcik7XG4gICAgfVxuICAgIHByb3RlY3RlZCByZWFkTmV4dE1lc3NhZ2VBbmRWYWxpZGF0ZTxUIGV4dGVuZHMgTWVzc2FnZUhlYWRlcj4odHlwZT86IFQgfCBudWxsKTogTWVzc2FnZTxUPiB8IG51bGwge1xuICAgICAgICBpZiAoIXRoaXMuZm9vdGVyKSB7IHRoaXMub3BlbigpOyB9XG4gICAgICAgIGlmICh0aGlzLnJlY29yZEJhdGNoSW5kZXggPCB0aGlzLm51bVJlY29yZEJhdGNoZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGJsb2NrID0gdGhpcy5mb290ZXIuZ2V0UmVjb3JkQmF0Y2godGhpcy5yZWNvcmRCYXRjaEluZGV4KTtcbiAgICAgICAgICAgIGlmIChibG9jayAmJiB0aGlzLmZpbGUuc2VlayhibG9jay5vZmZzZXQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVhZGVyLnJlYWRNZXNzYWdlKHR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbn1cblxuY2xhc3MgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+XG4gICAgZXh0ZW5kcyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUPlxuICAgICAgICBpbXBsZW1lbnRzIElSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQ+LCBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHtcblxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgZm9vdGVyOiBGb290ZXI7XG4gICAgcHVibGljIGdldCBudW1EaWN0aW9uYXJpZXMoKSB7IHJldHVybiB0aGlzLmZvb3Rlci5udW1EaWN0aW9uYXJpZXM7IH1cbiAgICBwdWJsaWMgZ2V0IG51bVJlY29yZEJhdGNoZXMoKSB7IHJldHVybiB0aGlzLmZvb3Rlci5udW1SZWNvcmRCYXRjaGVzOyB9XG5cbiAgICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgZmlsZTogQXN5bmNSYW5kb21BY2Nlc3NGaWxlLCBkaWN0aW9uYXJpZXMgPSBuZXcgTWFwPG51bWJlciwgVmVjdG9yPigpKSB7XG4gICAgICAgIHN1cGVyKG5ldyBBc3luY01lc3NhZ2VSZWFkZXIoZmlsZSksIGRpY3Rpb25hcmllcyk7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyBvcGVuKGF1dG9DbG9zZT86IGJvb2xlYW4pIHtcbiAgICAgICAgLy8gZGVmYXVsdCBhcmdzIGluIGFuIGFzeW5jIGZ1bmN0aW9uIGNyYXNoIGNsb3N1cmUtY29tcGlsZXIgYXQgdGhlIG1vbWVudFxuICAgICAgICAvLyBzbyBkbyB0aGlzIGluc3RlYWQuIGh0dHBzOi8vZ2l0aHViLmNvbS9nb29nbGUvY2xvc3VyZS1jb21waWxlci9pc3N1ZXMvMzE3OFxuICAgICAgICBhdXRvQ2xvc2UgIT09IHVuZGVmaW5lZCB8fCAoYXV0b0Nsb3NlID0gdGhpcy5hdXRvQ2xvc2UpO1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkICYmICF0aGlzLmZvb3Rlcikge1xuICAgICAgICAgICAgdGhpcy5zY2hlbWEgPSAodGhpcy5mb290ZXIgPSBhd2FpdCB0aGlzLnJlYWRGb290ZXIoKSkuc2NoZW1hO1xuICAgICAgICAgICAgZm9yIChjb25zdCBibG9jayBvZiB0aGlzLmZvb3Rlci5kaWN0aW9uYXJ5QmF0Y2hlcygpKSB7XG4gICAgICAgICAgICAgICAgYmxvY2sgJiYgYXdhaXQgdGhpcy5yZWFkRGljdGlvbmFyeUJhdGNoKHRoaXMuZGljdGlvbmFyeUluZGV4KyspO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhd2FpdCBzdXBlci5vcGVuKGF1dG9DbG9zZSk7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyByZWFkUmVjb3JkQmF0Y2goaW5kZXg6IG51bWJlcikge1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgICAgaWYgKCF0aGlzLmZvb3RlcikgeyBhd2FpdCB0aGlzLm9wZW4oKTsgfVxuICAgICAgICBjb25zdCBibG9jayA9IHRoaXMuZm9vdGVyLmdldFJlY29yZEJhdGNoKGluZGV4KTtcbiAgICAgICAgaWYgKGJsb2NrICYmIChhd2FpdCB0aGlzLmZpbGUuc2VlayhibG9jay5vZmZzZXQpKSkge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGF3YWl0IHRoaXMucmVhZGVyLnJlYWRNZXNzYWdlKE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2gpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UgJiYgbWVzc2FnZS5pc1JlY29yZEJhdGNoKCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBtZXNzYWdlLmhlYWRlcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IGF3YWl0IHRoaXMucmVhZGVyLnJlYWRNZXNzYWdlQm9keShtZXNzYWdlLmJvZHlMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZEJhdGNoID0gdGhpcy5fbG9hZFJlY29yZEJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVjb3JkQmF0Y2g7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHByb3RlY3RlZCBhc3luYyByZWFkRGljdGlvbmFyeUJhdGNoKGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgYmxvY2sgPSB0aGlzLmZvb3Rlci5nZXREaWN0aW9uYXJ5QmF0Y2goaW5kZXgpO1xuICAgICAgICBpZiAoYmxvY2sgJiYgKGF3YWl0IHRoaXMuZmlsZS5zZWVrKGJsb2NrLm9mZnNldCkpKSB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gYXdhaXQgdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2UoTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2gpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UgJiYgbWVzc2FnZS5pc0RpY3Rpb25hcnlCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSBhd2FpdCB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB2ZWN0b3IgPSB0aGlzLl9sb2FkRGljdGlvbmFyeUJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpY3Rpb25hcmllcy5zZXQoaGVhZGVyLmlkLCB2ZWN0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHByb3RlY3RlZCBhc3luYyByZWFkRm9vdGVyKCkge1xuICAgICAgICBjb25zdCB7IGZpbGUgfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0IG9mZnNldCA9IGZpbGUuc2l6ZSAtIG1hZ2ljQW5kUGFkZGluZztcbiAgICAgICAgY29uc3QgbGVuZ3RoID0gYXdhaXQgZmlsZS5yZWFkSW50MzIob2Zmc2V0KTtcbiAgICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgZmlsZS5yZWFkQXQob2Zmc2V0IC0gbGVuZ3RoLCBsZW5ndGgpO1xuICAgICAgICByZXR1cm4gRm9vdGVyLmRlY29kZShidWZmZXIpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgYXN5bmMgcmVhZE5leHRNZXNzYWdlQW5kVmFsaWRhdGU8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KHR5cGU/OiBUIHwgbnVsbCk6IFByb21pc2U8TWVzc2FnZTxUPiB8IG51bGw+IHtcbiAgICAgICAgaWYgKCF0aGlzLmZvb3RlcikgeyBhd2FpdCB0aGlzLm9wZW4oKTsgfVxuICAgICAgICBpZiAodGhpcy5yZWNvcmRCYXRjaEluZGV4IDwgdGhpcy5udW1SZWNvcmRCYXRjaGVzKSB7XG4gICAgICAgICAgICBjb25zdCBibG9jayA9IHRoaXMuZm9vdGVyLmdldFJlY29yZEJhdGNoKHRoaXMucmVjb3JkQmF0Y2hJbmRleCk7XG4gICAgICAgICAgICBpZiAoYmxvY2sgJiYgYXdhaXQgdGhpcy5maWxlLnNlZWsoYmxvY2sub2Zmc2V0KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZSh0eXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG59XG5cbmNsYXNzIFJlY29yZEJhdGNoSlNPTlJlYWRlckltcGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VD4ge1xuICAgIGNvbnN0cnVjdG9yKHByb3RlY3RlZCByZWFkZXI6IEpTT05NZXNzYWdlUmVhZGVyLCBkaWN0aW9uYXJpZXMgPSBuZXcgTWFwPG51bWJlciwgVmVjdG9yPigpKSB7XG4gICAgICAgIHN1cGVyKHJlYWRlciwgZGljdGlvbmFyaWVzKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIF9sb2FkVmVjdG9ycyhoZWFkZXI6IG1ldGFkYXRhLlJlY29yZEJhdGNoLCBib2R5OiBhbnksIHR5cGVzOiAoRmllbGQgfCBEYXRhVHlwZSlbXSkge1xuICAgICAgICByZXR1cm4gbmV3IEpTT05WZWN0b3JMb2FkZXIoYm9keSwgaGVhZGVyLm5vZGVzLCBoZWFkZXIuYnVmZmVycykudmlzaXRNYW55KHR5cGVzKTtcbiAgICB9XG59XG5cbmludGVyZmFjZSBJUmVjb3JkQmF0Y2hSZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IHtcblxuICAgIGNsb3NlZDogYm9vbGVhbjtcbiAgICBzY2hlbWE6IFNjaGVtYTxUPjtcbiAgICBhdXRvQ2xvc2U6IGJvb2xlYW47XG4gICAgbnVtRGljdGlvbmFyaWVzOiBudW1iZXI7XG4gICAgbnVtUmVjb3JkQmF0Y2hlczogbnVtYmVyO1xuICAgIGRpY3Rpb25hcmllczogTWFwPG51bWJlciwgVmVjdG9yPjtcblxuICAgIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbik6IHRoaXMgfCBQcm9taXNlPHRoaXM+O1xuICAgIHJlc2V0KHNjaGVtYT86IFNjaGVtYTxUPiB8IG51bGwpOiB0aGlzO1xuICAgIGNsb3NlKCk6IHRoaXMgfCBQcm9taXNlPHRoaXM+O1xuXG4gICAgW1N5bWJvbC5pdGVyYXRvcl0/KCk6IEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+O1xuICAgIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0/KCk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj47XG5cbiAgICB0aHJvdyh2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PGFueT4gfCBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+O1xuICAgIHJldHVybih2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PGFueT4gfCBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+O1xuICAgIG5leHQodmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxSZWNvcmRCYXRjaDxUPj4gfCBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PFJlY29yZEJhdGNoPFQ+Pj47XG59XG5cbmludGVyZmFjZSBJUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIElSZWNvcmRCYXRjaFJlYWRlckltcGw8VD4ge1xuXG4gICAgZm9vdGVyOiBGb290ZXI7XG5cbiAgICByZWFkUmVjb3JkQmF0Y2goaW5kZXg6IG51bWJlcik6IFJlY29yZEJhdGNoPFQ+IHwgbnVsbCB8IFByb21pc2U8UmVjb3JkQmF0Y2g8VD4gfCBudWxsPjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4ge1xuICAgIGNhbmNlbCgpOiB2b2lkO1xuICAgIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbik6IHRoaXM7XG4gICAgdGhyb3codmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxhbnk+O1xuICAgIHJldHVybih2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PGFueT47XG4gICAgbmV4dCh2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PFJlY29yZEJhdGNoPFQ+PjtcbiAgICByZWFkUmVjb3JkQmF0Y2goaW5kZXg6IG51bWJlcik6IFJlY29yZEJhdGNoPFQ+IHwgbnVsbDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiB7XG4gICAgY2FuY2VsKCk6IHZvaWQ7XG4gICAgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKTogdGhpcztcbiAgICB0aHJvdyh2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PGFueT47XG4gICAgcmV0dXJuKHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8YW55PjtcbiAgICBuZXh0KHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8UmVjb3JkQmF0Y2g8VD4+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IHtcbiAgICBjYW5jZWwoKTogUHJvbWlzZTx2b2lkPjtcbiAgICBvcGVuKGF1dG9DbG9zZT86IGJvb2xlYW4pOiBQcm9taXNlPHRoaXM+O1xuICAgIHRocm93KHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxhbnk+PjtcbiAgICByZXR1cm4odmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+O1xuICAgIG5leHQodmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PFJlY29yZEJhdGNoPFQ+Pj47XG4gICAgcmVhZFJlY29yZEJhdGNoKGluZGV4OiBudW1iZXIpOiBQcm9taXNlPFJlY29yZEJhdGNoPFQ+IHwgbnVsbD47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiB7XG4gICAgY2FuY2VsKCk6IFByb21pc2U8dm9pZD47XG4gICAgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKTogUHJvbWlzZTx0aGlzPjtcbiAgICB0aHJvdyh2YWx1ZT86IGFueSk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55Pj47XG4gICAgcmV0dXJuKHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxhbnk+PjtcbiAgICBuZXh0KHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxSZWNvcmRCYXRjaDxUPj4+O1xufVxuIl19

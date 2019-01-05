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
import { RandomAccessFile, AsyncRandomAccessFile } from '../io/file';
import { VectorLoader, JSONVectorLoader } from '../visitor/vectorloader';
import { ITERATOR_DONE, ReadableInterop, } from '../io/interfaces';
import { MessageReader, AsyncMessageReader, JSONMessageReader, checkForMagicArrowString, magicLength, magicAndPadding, magicX2AndPadding } from './message';
import { isPromise, isIterable, isAsyncIterable, isIteratorResult, isArrowJSON, isFileHandle, isFetchResponse, isReadableDOMStream, isReadableNodeStream } from '../util/compat';
export class RecordBatchReader extends ReadableInterop {
    constructor(impl) {
        super();
        this._impl = impl;
    }
    get closed() { return this._impl.closed; }
    get schema() { return this._impl.schema; }
    get autoDestroy() { return this._impl.autoDestroy; }
    get dictionaries() { return this._impl.dictionaries; }
    get numDictionaries() { return this._impl.numDictionaries; }
    get numRecordBatches() { return this._impl.numRecordBatches; }
    get footer() { return this._impl.isFile() ? this._impl.footer : null; }
    isSync() { return this._impl.isSync(); }
    isAsync() { return this._impl.isAsync(); }
    isFile() { return this._impl.isFile(); }
    isStream() { return this._impl.isStream(); }
    next() {
        return this._impl.next();
    }
    throw(value) {
        return this._impl.throw(value);
    }
    return(value) {
        return this._impl.return(value);
    }
    cancel() {
        return this._impl.cancel();
    }
    reset(schema) {
        this._impl.reset(schema);
        return this;
    }
    open(options) {
        const opening = this._impl.open(options);
        return isPromise(opening) ? opening.then(() => this) : this;
    }
    readRecordBatch(index) {
        return this._impl.isFile() ? this._impl.readRecordBatch(index) : null;
    }
    [Symbol.iterator]() {
        return this._impl[Symbol.iterator]();
    }
    [Symbol.asyncIterator]() {
        return this._impl[Symbol.asyncIterator]();
    }
    toDOMStream() {
        return streamAdapters.toDOMStream((this.isSync()
            ? { [Symbol.iterator]: () => this }
            : { [Symbol.asyncIterator]: () => this }));
    }
    toNodeStream() {
        return streamAdapters.toNodeStream((this.isSync()
            ? { [Symbol.iterator]: () => this }
            : { [Symbol.asyncIterator]: () => this }), { objectMode: true });
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
    /** @nocollapse */
    static from(source) {
        if (source instanceof RecordBatchReader) {
            return source;
        }
        else if (isArrowJSON(source)) {
            return fromArrowJSON(source);
        }
        else if (isFileHandle(source)) {
            return fromFileHandle(source);
        }
        else if (isPromise(source)) {
            return (async () => await RecordBatchReader.from(await source))();
        }
        else if (isFetchResponse(source) || isReadableDOMStream(source) || isReadableNodeStream(source) || isAsyncIterable(source)) {
            return fromAsyncByteStream(new AsyncByteStream(source));
        }
        return fromByteStream(new ByteStream(source));
    }
    /** @nocollapse */
    static readAll(source) {
        if (source instanceof RecordBatchReader) {
            return source.isSync() ? readAllSync(source) : readAllAsync(source);
        }
        else if (isArrowJSON(source) || ArrayBuffer.isView(source) || isIterable(source) || isIteratorResult(source)) {
            return readAllSync(source);
        }
        return readAllAsync(source);
    }
}
//
// Since TS is a structural type system, we define the following subclass stubs
// so that concrete types exist to associate with with the interfaces below.
//
// The implementation for each RecordBatchReader is hidden away in the set of
// `RecordBatchReaderImpl` classes in the second half of this file. This allows
// us to export a single RecordBatchReader class, and swap out the impl based
// on the io primitives or underlying arrow (JSON, file, or stream) at runtime.
//
// Async/await makes our job a bit harder, since it forces everything to be
// either fully sync or fully async. This is why the logic for the reader impls
// has been duplicated into both sync and async variants. Since the RBR
// delegates to its impl, an RBR with an AsyncRecordBatchFileReaderImpl for
// example will return async/await-friendly Promises, but one with a (sync)
// RecordBatchStreamReaderImpl will always return values. Nothing should be
// different about their logic, aside from the async handling. This is also why
// this code looks highly structured, as it should be nearly identical and easy
// to follow.
//
/** @ignore */
export class RecordBatchStreamReader extends RecordBatchReader {
    constructor(_impl) {
        super(_impl);
        this._impl = _impl;
    }
    [Symbol.iterator]() { return this._impl[Symbol.iterator](); }
    async *[Symbol.asyncIterator]() { yield* this[Symbol.iterator](); }
}
/** @ignore */
export class AsyncRecordBatchStreamReader extends RecordBatchReader {
    constructor(_impl) {
        super(_impl);
        this._impl = _impl;
    }
    [Symbol.iterator]() { throw new Error(`AsyncRecordBatchStreamReader is not Iterable`); }
    [Symbol.asyncIterator]() { return this._impl[Symbol.asyncIterator](); }
}
/** @ignore */
export class RecordBatchFileReader extends RecordBatchStreamReader {
    constructor(_impl) {
        super(_impl);
        this._impl = _impl;
    }
}
/** @ignore */
export class AsyncRecordBatchFileReader extends AsyncRecordBatchStreamReader {
    constructor(_impl) {
        super(_impl);
        this._impl = _impl;
    }
}
/** @ignore */
class RecordBatchReaderImpl {
    constructor(dictionaries = new Map()) {
        this.closed = false;
        this.autoDestroy = true;
        this._dictionaryIndex = 0;
        this._recordBatchIndex = 0;
        this.dictionaries = dictionaries;
    }
    get numDictionaries() { return this._dictionaryIndex; }
    get numRecordBatches() { return this._recordBatchIndex; }
    isSync() { return false; }
    isAsync() { return false; }
    isFile() { return false; }
    isStream() { return false; }
    reset(schema) {
        this._dictionaryIndex = 0;
        this._recordBatchIndex = 0;
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
class RecordBatchStreamReaderImpl extends RecordBatchReaderImpl {
    constructor(source, dictionaries) {
        super(dictionaries);
        this._reader = !isArrowJSON(source)
            ? new MessageReader(this._handle = source)
            : new JSONMessageReader(this._handle = source);
    }
    isSync() { return true; }
    isStream() { return true; }
    [Symbol.iterator]() {
        return this;
    }
    cancel() {
        if (!this.closed && (this.closed = true)) {
            this.reset()._reader.return();
            this._reader = null;
            this.dictionaries = null;
        }
    }
    open(options) {
        if (!this.closed) {
            this.autoDestroy = shouldAutoDestroy(this, options);
            if (!(this.schema || (this.schema = this._reader.readSchema()))) {
                this.cancel();
            }
        }
        return this;
    }
    throw(value) {
        if (!this.closed && this.autoDestroy && (this.closed = true)) {
            return this.reset()._reader.throw(value);
        }
        return ITERATOR_DONE;
    }
    return(value) {
        if (!this.closed && this.autoDestroy && (this.closed = true)) {
            return this.reset()._reader.return(value);
        }
        return ITERATOR_DONE;
    }
    next() {
        if (this.closed) {
            return ITERATOR_DONE;
        }
        let message, { _reader: reader } = this;
        while (message = this._readNextMessageAndValidate()) {
            if (message.isSchema()) {
                this.reset(message.header());
            }
            else if (message.isRecordBatch()) {
                this._recordBatchIndex++;
                const header = message.header();
                const buffer = reader.readMessageBody(message.bodyLength);
                const recordBatch = this._loadRecordBatch(header, buffer);
                return { done: false, value: recordBatch };
            }
            else if (message.isDictionaryBatch()) {
                this._dictionaryIndex++;
                const header = message.header();
                const buffer = reader.readMessageBody(message.bodyLength);
                const vector = this._loadDictionaryBatch(header, buffer);
                this.dictionaries.set(header.id, vector);
            }
        }
        return this.return();
    }
    _readNextMessageAndValidate(type) {
        return this._reader.readMessage(type);
    }
}
/** @ignore */
class AsyncRecordBatchStreamReaderImpl extends RecordBatchReaderImpl {
    constructor(source, dictionaries) {
        super(dictionaries);
        this._reader = new AsyncMessageReader(this._handle = source);
    }
    isAsync() { return true; }
    isStream() { return true; }
    [Symbol.asyncIterator]() {
        return this;
    }
    async cancel() {
        if (!this.closed && (this.closed = true)) {
            await this.reset()._reader.return();
            this._reader = null;
            this.dictionaries = null;
        }
    }
    async open(options) {
        if (!this.closed) {
            this.autoDestroy = shouldAutoDestroy(this, options);
            if (!(this.schema || (this.schema = (await this._reader.readSchema())))) {
                await this.cancel();
            }
        }
        return this;
    }
    async throw(value) {
        if (!this.closed && this.autoDestroy && (this.closed = true)) {
            return await this.reset()._reader.throw(value);
        }
        return ITERATOR_DONE;
    }
    async return(value) {
        if (!this.closed && this.autoDestroy && (this.closed = true)) {
            return await this.reset()._reader.return(value);
        }
        return ITERATOR_DONE;
    }
    async next() {
        if (this.closed) {
            return ITERATOR_DONE;
        }
        let message, { _reader: reader } = this;
        while (message = await this._readNextMessageAndValidate()) {
            if (message.isSchema()) {
                await this.reset(message.header());
            }
            else if (message.isRecordBatch()) {
                this._recordBatchIndex++;
                const header = message.header();
                const buffer = await reader.readMessageBody(message.bodyLength);
                const recordBatch = this._loadRecordBatch(header, buffer);
                return { done: false, value: recordBatch };
            }
            else if (message.isDictionaryBatch()) {
                this._dictionaryIndex++;
                const header = message.header();
                const buffer = await reader.readMessageBody(message.bodyLength);
                const vector = this._loadDictionaryBatch(header, buffer);
                this.dictionaries.set(header.id, vector);
            }
        }
        return await this.return();
    }
    async _readNextMessageAndValidate(type) {
        return await this._reader.readMessage(type);
    }
}
/** @ignore */
class RecordBatchFileReaderImpl extends RecordBatchStreamReaderImpl {
    constructor(source, dictionaries) {
        super(source instanceof RandomAccessFile ? source : new RandomAccessFile(source), dictionaries);
    }
    get footer() { return this._footer; }
    get numDictionaries() { return this._footer ? this._footer.numDictionaries : 0; }
    get numRecordBatches() { return this._footer ? this._footer.numRecordBatches : 0; }
    isSync() { return true; }
    isFile() { return true; }
    open(options) {
        if (!this.closed && !this._footer) {
            this.schema = (this._footer = this._readFooter()).schema;
            for (const block of this._footer.dictionaryBatches()) {
                block && this._readDictionaryBatch(this._dictionaryIndex++);
            }
        }
        return super.open(options);
    }
    readRecordBatch(index) {
        if (this.closed) {
            return null;
        }
        if (!this._footer) {
            this.open();
        }
        const block = this._footer && this._footer.getRecordBatch(index);
        if (block && this._handle.seek(block.offset)) {
            const message = this._reader.readMessage(MessageHeader.RecordBatch);
            if (message && message.isRecordBatch()) {
                const header = message.header();
                const buffer = this._reader.readMessageBody(message.bodyLength);
                const recordBatch = this._loadRecordBatch(header, buffer);
                return recordBatch;
            }
        }
        return null;
    }
    _readDictionaryBatch(index) {
        const block = this._footer && this._footer.getDictionaryBatch(index);
        if (block && this._handle.seek(block.offset)) {
            const message = this._reader.readMessage(MessageHeader.DictionaryBatch);
            if (message && message.isDictionaryBatch()) {
                const header = message.header();
                const buffer = this._reader.readMessageBody(message.bodyLength);
                const vector = this._loadDictionaryBatch(header, buffer);
                this.dictionaries.set(header.id, vector);
            }
        }
    }
    _readFooter() {
        const { _handle } = this;
        const offset = _handle.size - magicAndPadding;
        const length = _handle.readInt32(offset);
        const buffer = _handle.readAt(offset - length, length);
        return Footer.decode(buffer);
    }
    _readNextMessageAndValidate(type) {
        if (!this._footer) {
            this.open();
        }
        if (this._footer && this._recordBatchIndex < this.numRecordBatches) {
            const block = this._footer && this._footer.getRecordBatch(this._recordBatchIndex);
            if (block && this._handle.seek(block.offset)) {
                return this._reader.readMessage(type);
            }
        }
        return null;
    }
}
/** @ignore */
class AsyncRecordBatchFileReaderImpl extends AsyncRecordBatchStreamReaderImpl {
    constructor(source, ...rest) {
        const byteLength = typeof rest[0] !== 'number' ? rest.shift() : undefined;
        const dictionaries = rest[0] instanceof Map ? rest.shift() : undefined;
        super(source instanceof AsyncRandomAccessFile ? source : new AsyncRandomAccessFile(source, byteLength), dictionaries);
    }
    get footer() { return this._footer; }
    get numDictionaries() { return this._footer ? this._footer.numDictionaries : 0; }
    get numRecordBatches() { return this._footer ? this._footer.numRecordBatches : 0; }
    isFile() { return true; }
    isAsync() { return true; }
    async open(options) {
        if (!this.closed && !this._footer) {
            this.schema = (this._footer = await this._readFooter()).schema;
            for (const block of this._footer.dictionaryBatches()) {
                block && await this._readDictionaryBatch(this._dictionaryIndex++);
            }
        }
        return await super.open(options);
    }
    async readRecordBatch(index) {
        if (this.closed) {
            return null;
        }
        if (!this._footer) {
            await this.open();
        }
        const block = this._footer && this._footer.getRecordBatch(index);
        if (block && (await this._handle.seek(block.offset))) {
            const message = await this._reader.readMessage(MessageHeader.RecordBatch);
            if (message && message.isRecordBatch()) {
                const header = message.header();
                const buffer = await this._reader.readMessageBody(message.bodyLength);
                const recordBatch = this._loadRecordBatch(header, buffer);
                return recordBatch;
            }
        }
        return null;
    }
    async _readDictionaryBatch(index) {
        const block = this._footer && this._footer.getDictionaryBatch(index);
        if (block && (await this._handle.seek(block.offset))) {
            const message = await this._reader.readMessage(MessageHeader.DictionaryBatch);
            if (message && message.isDictionaryBatch()) {
                const header = message.header();
                const buffer = await this._reader.readMessageBody(message.bodyLength);
                const vector = this._loadDictionaryBatch(header, buffer);
                this.dictionaries.set(header.id, vector);
            }
        }
    }
    async _readFooter() {
        const { _handle } = this;
        _handle._pending && await _handle._pending;
        const offset = _handle.size - magicAndPadding;
        const length = await _handle.readInt32(offset);
        const buffer = await _handle.readAt(offset - length, length);
        return Footer.decode(buffer);
    }
    async _readNextMessageAndValidate(type) {
        if (!this._footer) {
            await this.open();
        }
        if (this._footer && this._recordBatchIndex < this.numRecordBatches) {
            const block = this._footer.getRecordBatch(this._recordBatchIndex);
            if (block && await this._handle.seek(block.offset)) {
                return await this._reader.readMessage(type);
            }
        }
        return null;
    }
}
/** @ignore */
class RecordBatchJSONReaderImpl extends RecordBatchStreamReaderImpl {
    constructor(source, dictionaries) {
        super(source, dictionaries);
    }
    _loadVectors(header, body, types) {
        return new JSONVectorLoader(body, header.nodes, header.buffers).visitMany(types);
    }
}
//
// Define some helper functions and static implementations down here. There's
// a bit of branching in the static methods that can lead to the same routines
// being executed, so we've broken those out here for readability.
//
/** @ignore */
function shouldAutoDestroy(self, options) {
    return options && (typeof options['autoDestroy'] === 'boolean') ? options['autoDestroy'] : self['autoDestroy'];
}
/** @ignore */
function* readAllSync(source) {
    const reader = RecordBatchReader.from(source);
    try {
        if (!reader.open({ autoDestroy: false }).closed) {
            do {
                yield reader;
            } while (!(reader.reset().open()).closed);
        }
    }
    finally {
        reader.cancel();
    }
}
/** @ignore */
async function* readAllAsync(source) {
    const reader = await RecordBatchReader.from(source);
    try {
        if (!(await reader.open({ autoDestroy: false })).closed) {
            do {
                yield reader;
            } while (!(await reader.reset().open()).closed);
        }
    }
    finally {
        await reader.cancel();
    }
}
/** @ignore */
function fromArrowJSON(source) {
    return new RecordBatchStreamReader(new RecordBatchJSONReaderImpl(source));
}
/** @ignore */
function fromByteStream(source) {
    const bytes = source.peek((magicLength + 7) & ~7);
    return bytes && bytes.byteLength >= 4 ? !checkForMagicArrowString(bytes)
        ? new RecordBatchStreamReader(new RecordBatchStreamReaderImpl(source))
        : new RecordBatchFileReader(new RecordBatchFileReaderImpl(source.read()))
        : new RecordBatchStreamReader(new RecordBatchStreamReaderImpl(function* () { }()));
}
/** @ignore */
async function fromAsyncByteStream(source) {
    const bytes = await source.peek((magicLength + 7) & ~7);
    return bytes && bytes.byteLength >= 4 ? !checkForMagicArrowString(bytes)
        ? new AsyncRecordBatchStreamReader(new AsyncRecordBatchStreamReaderImpl(source))
        : new RecordBatchFileReader(new RecordBatchFileReaderImpl(await source.read()))
        : new AsyncRecordBatchStreamReader(new AsyncRecordBatchStreamReaderImpl(async function* () { }()));
}
/** @ignore */
async function fromFileHandle(source) {
    const { size } = await source.stat();
    const file = new AsyncRandomAccessFile(source, size);
    if (size >= magicX2AndPadding) {
        if (checkForMagicArrowString(await file.readAt(0, (magicLength + 7) & ~7))) {
            return new AsyncRecordBatchFileReader(new AsyncRecordBatchFileReaderImpl(file));
        }
    }
    return new AsyncRecordBatchStreamReader(new AsyncRecordBatchStreamReaderImpl(file));
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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Q0FBQztJQUNyRCxJQUFJLElBQUksSUFBSSxpQkFBaUIsRUFBRTtRQUMzQixJQUFJLHdCQUF3QixDQUFDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3hFLE9BQU8sSUFBSSwwQkFBMEIsQ0FBQyxJQUFJLDhCQUE4QixDQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7U0FDdEY7S0FDSjtJQUNELE9BQU8sSUFBSSw0QkFBNEIsQ0FBQyxJQUFJLGdDQUFnQyxDQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDM0YsQ0FBQyIsImZpbGUiOiJpcGMvcmVhZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IERhdGFUeXBlIH0gZnJvbSAnLi4vdHlwZSc7XG5pbXBvcnQgeyBWZWN0b3IgfSBmcm9tICcuLi92ZWN0b3InO1xuaW1wb3J0IHsgTWVzc2FnZUhlYWRlciB9IGZyb20gJy4uL2VudW0nO1xuaW1wb3J0IHsgRm9vdGVyIH0gZnJvbSAnLi9tZXRhZGF0YS9maWxlJztcbmltcG9ydCB7IFNjaGVtYSwgRmllbGQgfSBmcm9tICcuLi9zY2hlbWEnO1xuaW1wb3J0IHN0cmVhbUFkYXB0ZXJzIGZyb20gJy4uL2lvL2FkYXB0ZXJzJztcbmltcG9ydCB7IE1lc3NhZ2UgfSBmcm9tICcuL21ldGFkYXRhL21lc3NhZ2UnO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2ggfSBmcm9tICcuLi9yZWNvcmRiYXRjaCc7XG5pbXBvcnQgKiBhcyBtZXRhZGF0YSBmcm9tICcuL21ldGFkYXRhL21lc3NhZ2UnO1xuaW1wb3J0IHsgQXJyYXlCdWZmZXJWaWV3SW5wdXQgfSBmcm9tICcuLi91dGlsL2J1ZmZlcic7XG5pbXBvcnQgeyBCeXRlU3RyZWFtLCBBc3luY0J5dGVTdHJlYW0gfSBmcm9tICcuLi9pby9zdHJlYW0nO1xuaW1wb3J0IHsgUmFuZG9tQWNjZXNzRmlsZSwgQXN5bmNSYW5kb21BY2Nlc3NGaWxlIH0gZnJvbSAnLi4vaW8vZmlsZSc7XG5pbXBvcnQgeyBWZWN0b3JMb2FkZXIsIEpTT05WZWN0b3JMb2FkZXIgfSBmcm9tICcuLi92aXNpdG9yL3ZlY3RvcmxvYWRlcic7XG5pbXBvcnQge1xuICAgIEZpbGVIYW5kbGUsXG4gICAgQXJyb3dKU09OTGlrZSxcbiAgICBJVEVSQVRPUl9ET05FLFxuICAgIFJlYWRhYmxlSW50ZXJvcCxcbn0gZnJvbSAnLi4vaW8vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIE1lc3NhZ2VSZWFkZXIsIEFzeW5jTWVzc2FnZVJlYWRlciwgSlNPTk1lc3NhZ2VSZWFkZXIsXG4gICAgY2hlY2tGb3JNYWdpY0Fycm93U3RyaW5nLCBtYWdpY0xlbmd0aCwgbWFnaWNBbmRQYWRkaW5nLCBtYWdpY1gyQW5kUGFkZGluZ1xufSBmcm9tICcuL21lc3NhZ2UnO1xuaW1wb3J0IHtcbiAgICBpc1Byb21pc2UsXG4gICAgaXNJdGVyYWJsZSwgaXNBc3luY0l0ZXJhYmxlLFxuICAgIGlzSXRlcmF0b3JSZXN1bHQsIGlzQXJyb3dKU09OLFxuICAgIGlzRmlsZUhhbmRsZSwgaXNGZXRjaFJlc3BvbnNlLFxuICAgIGlzUmVhZGFibGVET01TdHJlYW0sIGlzUmVhZGFibGVOb2RlU3RyZWFtXG59IGZyb20gJy4uL3V0aWwvY29tcGF0JztcblxuLyoqIEBpZ25vcmUgKi8gZXhwb3J0IHR5cGUgRnJvbUFyZzAgPSBBcnJvd0pTT05MaWtlO1xuLyoqIEBpZ25vcmUgKi8gZXhwb3J0IHR5cGUgRnJvbUFyZzEgPSBQcm9taXNlTGlrZTxBcnJvd0pTT05MaWtlPjtcbi8qKiBAaWdub3JlICovIGV4cG9ydCB0eXBlIEZyb21BcmcyID0gSXRlcmFibGU8QXJyYXlCdWZmZXJWaWV3SW5wdXQ+IHwgQXJyYXlCdWZmZXJWaWV3SW5wdXQ7XG4vKiogQGlnbm9yZSAqLyBleHBvcnQgdHlwZSBGcm9tQXJnMyA9IFByb21pc2VMaWtlPEl0ZXJhYmxlPEFycmF5QnVmZmVyVmlld0lucHV0PiB8IEFycmF5QnVmZmVyVmlld0lucHV0Pjtcbi8qKiBAaWdub3JlICovIGV4cG9ydCB0eXBlIEZyb21Bcmc0ID0gUmVzcG9uc2UgfCBOb2RlSlMuUmVhZGFibGVTdHJlYW0gfCBSZWFkYWJsZVN0cmVhbTxBcnJheUJ1ZmZlclZpZXdJbnB1dD4gfCBBc3luY0l0ZXJhYmxlPEFycmF5QnVmZmVyVmlld0lucHV0Pjtcbi8qKiBAaWdub3JlICovIGV4cG9ydCB0eXBlIEZyb21Bcmc1ID0gRmlsZUhhbmRsZSB8IFByb21pc2VMaWtlPEZpbGVIYW5kbGU+IHwgUHJvbWlzZUxpa2U8RnJvbUFyZzQ+O1xuLyoqIEBpZ25vcmUgKi8gZXhwb3J0IHR5cGUgRnJvbUFyZ3MgPSBGcm9tQXJnMCB8IEZyb21BcmcxIHwgRnJvbUFyZzIgfCBGcm9tQXJnMyB8IEZyb21Bcmc0IHwgRnJvbUFyZzU7XG5cbi8qKiBAaWdub3JlICovIHR5cGUgT3Blbk9wdGlvbnMgPSB7IGF1dG9EZXN0cm95PzogYm9vbGVhbjsgfTtcbi8qKiBAaWdub3JlICovIHR5cGUgUmVjb3JkQmF0Y2hSZWFkZXJzPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+ID0gUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD47XG4vKiogQGlnbm9yZSAqLyB0eXBlIEFzeW5jUmVjb3JkQmF0Y2hSZWFkZXJzPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+ID0gQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4gfCBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+O1xuLyoqIEBpZ25vcmUgKi8gdHlwZSBSZWNvcmRCYXRjaEZpbGVSZWFkZXJzPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+ID0gUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD47XG4vKiogQGlnbm9yZSAqLyB0eXBlIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyczxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiA9IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+IHwgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPjtcblxuZXhwb3J0IGNsYXNzIFJlY29yZEJhdGNoUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVhZGFibGVJbnRlcm9wPFJlY29yZEJhdGNoPFQ+PiB7XG5cbiAgICBwcm90ZWN0ZWQgX2ltcGw6IFJlY29yZEJhdGNoUmVhZGVySW1wbHM8VD47XG4gICAgcHJvdGVjdGVkIGNvbnN0cnVjdG9yKGltcGw6IFJlY29yZEJhdGNoUmVhZGVySW1wbHM8VD4pIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5faW1wbCA9IGltcGw7XG4gICAgfVxuXG4gICAgcHVibGljIGdldCBjbG9zZWQoKSB7IHJldHVybiB0aGlzLl9pbXBsLmNsb3NlZDsgfVxuICAgIHB1YmxpYyBnZXQgc2NoZW1hKCkgeyByZXR1cm4gdGhpcy5faW1wbC5zY2hlbWE7IH1cbiAgICBwdWJsaWMgZ2V0IGF1dG9EZXN0cm95KCkgeyByZXR1cm4gdGhpcy5faW1wbC5hdXRvRGVzdHJveTsgfVxuICAgIHB1YmxpYyBnZXQgZGljdGlvbmFyaWVzKCkgeyByZXR1cm4gdGhpcy5faW1wbC5kaWN0aW9uYXJpZXM7IH1cbiAgICBwdWJsaWMgZ2V0IG51bURpY3Rpb25hcmllcygpIHsgcmV0dXJuIHRoaXMuX2ltcGwubnVtRGljdGlvbmFyaWVzOyB9XG4gICAgcHVibGljIGdldCBudW1SZWNvcmRCYXRjaGVzKCkgeyByZXR1cm4gdGhpcy5faW1wbC5udW1SZWNvcmRCYXRjaGVzOyB9XG4gICAgcHVibGljIGdldCBmb290ZXIoKSB7IHJldHVybiB0aGlzLl9pbXBsLmlzRmlsZSgpID8gdGhpcy5faW1wbC5mb290ZXIgOiBudWxsOyB9XG5cbiAgICBwdWJsaWMgaXNTeW5jKCk6IHRoaXMgaXMgUmVjb3JkQmF0Y2hSZWFkZXJzPFQ+IHsgcmV0dXJuIHRoaXMuX2ltcGwuaXNTeW5jKCk7IH1cbiAgICBwdWJsaWMgaXNBc3luYygpOiB0aGlzIGlzIEFzeW5jUmVjb3JkQmF0Y2hSZWFkZXJzPFQ+IHsgcmV0dXJuIHRoaXMuX2ltcGwuaXNBc3luYygpOyB9XG4gICAgcHVibGljIGlzRmlsZSgpOiB0aGlzIGlzIFJlY29yZEJhdGNoRmlsZVJlYWRlcnM8VD4geyByZXR1cm4gdGhpcy5faW1wbC5pc0ZpbGUoKTsgfVxuICAgIHB1YmxpYyBpc1N0cmVhbSgpOiB0aGlzIGlzIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyczxUPiB7IHJldHVybiB0aGlzLl9pbXBsLmlzU3RyZWFtKCk7IH1cblxuICAgIHB1YmxpYyBuZXh0KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5faW1wbC5uZXh0KCk7XG4gICAgfVxuICAgIHB1YmxpYyB0aHJvdyh2YWx1ZT86IGFueSkge1xuICAgICAgICByZXR1cm4gdGhpcy5faW1wbC50aHJvdyh2YWx1ZSk7XG4gICAgfVxuICAgIHB1YmxpYyByZXR1cm4odmFsdWU/OiBhbnkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2ltcGwucmV0dXJuKHZhbHVlKTtcbiAgICB9XG4gICAgcHVibGljIGNhbmNlbCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2ltcGwuY2FuY2VsKCk7XG4gICAgfVxuICAgIHB1YmxpYyByZXNldChzY2hlbWE/OiBTY2hlbWE8VD4gfCBudWxsKTogdGhpcyB7XG4gICAgICAgIHRoaXMuX2ltcGwucmVzZXQoc2NoZW1hKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHB1YmxpYyBvcGVuKG9wdGlvbnM/OiBPcGVuT3B0aW9ucykge1xuICAgICAgICBjb25zdCBvcGVuaW5nID0gdGhpcy5faW1wbC5vcGVuKG9wdGlvbnMpO1xuICAgICAgICByZXR1cm4gaXNQcm9taXNlKG9wZW5pbmcpID8gb3BlbmluZy50aGVuKCgpID0+IHRoaXMpIDogdGhpcztcbiAgICB9XG4gICAgcHVibGljIHJlYWRSZWNvcmRCYXRjaChpbmRleDogbnVtYmVyKTogUmVjb3JkQmF0Y2g8VD4gfCBudWxsIHwgUHJvbWlzZTxSZWNvcmRCYXRjaDxUPiB8IG51bGw+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2ltcGwuaXNGaWxlKCkgPyB0aGlzLl9pbXBsLnJlYWRSZWNvcmRCYXRjaChpbmRleCkgOiBudWxsO1xuICAgIH1cbiAgICBwdWJsaWMgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4ge1xuICAgICAgICByZXR1cm4gKDxJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+Pj4gdGhpcy5faW1wbClbU3ltYm9sLml0ZXJhdG9yXSgpO1xuICAgIH1cbiAgICBwdWJsaWMgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHtcbiAgICAgICAgcmV0dXJuICg8QXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+Pj4gdGhpcy5faW1wbClbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk7XG4gICAgfVxuICAgIHB1YmxpYyB0b0RPTVN0cmVhbSgpIHtcbiAgICAgICAgcmV0dXJuIHN0cmVhbUFkYXB0ZXJzLnRvRE9NU3RyZWFtPFJlY29yZEJhdGNoPFQ+PihcbiAgICAgICAgICAgICh0aGlzLmlzU3luYygpXG4gICAgICAgICAgICAgICAgPyB7IFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiB0aGlzIH0gYXMgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+XG4gICAgICAgICAgICAgICAgOiB7IFtTeW1ib2wuYXN5bmNJdGVyYXRvcl06ICgpID0+IHRoaXMgfSBhcyBBc3luY0l0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+PikpO1xuICAgIH1cbiAgICBwdWJsaWMgdG9Ob2RlU3RyZWFtKCkge1xuICAgICAgICByZXR1cm4gc3RyZWFtQWRhcHRlcnMudG9Ob2RlU3RyZWFtPFJlY29yZEJhdGNoPFQ+PihcbiAgICAgICAgICAgICh0aGlzLmlzU3luYygpXG4gICAgICAgICAgICAgICAgPyB7IFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiB0aGlzIH0gYXMgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+XG4gICAgICAgICAgICAgICAgOiB7IFtTeW1ib2wuYXN5bmNJdGVyYXRvcl06ICgpID0+IHRoaXMgfSBhcyBBc3luY0l0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+PiksXG4gICAgICAgICAgICB7IG9iamVjdE1vZGU6IHRydWUgfSk7XG4gICAgfVxuXG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyBzdGF0aWMgdGhyb3VnaE5vZGUob3B0aW9ucz86IGltcG9ydCgnc3RyZWFtJykuRHVwbGV4T3B0aW9ucyAmIHsgYXV0b0Rlc3Ryb3k6IGJvb2xlYW4gfSk6IGltcG9ydCgnc3RyZWFtJykuRHVwbGV4IHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBcInRocm91Z2hOb2RlXCIgbm90IGF2YWlsYWJsZSBpbiB0aGlzIGVudmlyb25tZW50YCk7XG4gICAgfVxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgdGhyb3VnaERPTTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9PihcbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICB3cml0YWJsZVN0cmF0ZWd5PzogQnl0ZUxlbmd0aFF1ZXVpbmdTdHJhdGVneSxcbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICByZWFkYWJsZVN0cmF0ZWd5PzogeyBhdXRvRGVzdHJveTogYm9vbGVhbiB9XG4gICAgKTogeyB3cml0YWJsZTogV3JpdGFibGVTdHJlYW08VWludDhBcnJheT4sIHJlYWRhYmxlOiBSZWFkYWJsZVN0cmVhbTxSZWNvcmRCYXRjaDxUPj4gfSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgXCJ0aHJvdWdoRE9NXCIgbm90IGF2YWlsYWJsZSBpbiB0aGlzIGVudmlyb25tZW50YCk7XG4gICAgfVxuXG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlcj4oc291cmNlOiBUKTogVDtcbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBGcm9tQXJnMCk6IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IEZyb21BcmcxKTogUHJvbWlzZTxSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPj47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogRnJvbUFyZzIpOiBSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4gfCBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBGcm9tQXJnMyk6IFByb21pc2U8UmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IEZyb21Bcmc0KTogUHJvbWlzZTxSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4gfCBBc3luY1JlY29yZEJhdGNoUmVhZGVyczxUPj47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogRnJvbUFyZzUpOiBQcm9taXNlPEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPj47XG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogYW55KSB7XG4gICAgICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBSZWNvcmRCYXRjaFJlYWRlcikge1xuICAgICAgICAgICAgcmV0dXJuIHNvdXJjZTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0Fycm93SlNPTihzb3VyY2UpKSB7XG4gICAgICAgICAgICByZXR1cm4gZnJvbUFycm93SlNPTjxUPihzb3VyY2UpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRmlsZUhhbmRsZShzb3VyY2UpKSB7XG4gICAgICAgICAgICByZXR1cm4gZnJvbUZpbGVIYW5kbGU8VD4oc291cmNlKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1Byb21pc2U8YW55Pihzb3VyY2UpKSB7XG4gICAgICAgICAgICByZXR1cm4gKGFzeW5jICgpID0+IGF3YWl0IFJlY29yZEJhdGNoUmVhZGVyLmZyb208YW55Pihhd2FpdCBzb3VyY2UpKSgpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRmV0Y2hSZXNwb25zZShzb3VyY2UpIHx8IGlzUmVhZGFibGVET01TdHJlYW0oc291cmNlKSB8fCBpc1JlYWRhYmxlTm9kZVN0cmVhbShzb3VyY2UpIHx8IGlzQXN5bmNJdGVyYWJsZShzb3VyY2UpKSB7XG4gICAgICAgICAgICByZXR1cm4gZnJvbUFzeW5jQnl0ZVN0cmVhbTxUPihuZXcgQXN5bmNCeXRlU3RyZWFtKHNvdXJjZSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmcm9tQnl0ZVN0cmVhbTxUPihuZXcgQnl0ZVN0cmVhbShzb3VyY2UpKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgc3RhdGljIHJlYWRBbGw8VCBleHRlbmRzIFJlY29yZEJhdGNoUmVhZGVyPihzb3VyY2U6IFQpOiBUIGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXJzID8gSXRlcmFibGVJdGVyYXRvcjxUPiA6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxUPjtcbiAgICBwdWJsaWMgc3RhdGljIHJlYWRBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBGcm9tQXJnMCk6IEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgcmVhZEFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IEZyb21BcmcxKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+PjtcbiAgICBwdWJsaWMgc3RhdGljIHJlYWRBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBGcm9tQXJnMik6IEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgcmVhZEFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IEZyb21BcmczKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+PjtcbiAgICBwdWJsaWMgc3RhdGljIHJlYWRBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBGcm9tQXJnNCk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4gfCBBc3luY1JlY29yZEJhdGNoUmVhZGVyczxUPj47XG4gICAgcHVibGljIHN0YXRpYyByZWFkQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogRnJvbUFyZzUpOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8QXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4gfCBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+PjtcbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIHJlYWRBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBhbnkpIHtcbiAgICAgICAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIFJlY29yZEJhdGNoUmVhZGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gc291cmNlLmlzU3luYygpID8gcmVhZEFsbFN5bmMoc291cmNlKSA6IHJlYWRBbGxBc3luYyhzb3VyY2UgYXMgQXN5bmNSZWNvcmRCYXRjaFJlYWRlcnM8VD4pO1xuICAgICAgICB9IGVsc2UgaWYgKGlzQXJyb3dKU09OKHNvdXJjZSkgfHwgQXJyYXlCdWZmZXIuaXNWaWV3KHNvdXJjZSkgfHwgaXNJdGVyYWJsZTxBcnJheUJ1ZmZlclZpZXdJbnB1dD4oc291cmNlKSB8fCBpc0l0ZXJhdG9yUmVzdWx0KHNvdXJjZSkpIHtcbiAgICAgICAgICAgIHJldHVybiByZWFkQWxsU3luYzxUPihzb3VyY2UpIGFzIEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2hSZWFkZXJzPFQ+PjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVhZEFsbEFzeW5jPFQ+KHNvdXJjZSkgYXMgQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoUmVhZGVyczxUPiB8IEFzeW5jUmVjb3JkQmF0Y2hSZWFkZXJzPFQ+PjtcbiAgICB9XG59XG5cbi8vXG4vLyBTaW5jZSBUUyBpcyBhIHN0cnVjdHVyYWwgdHlwZSBzeXN0ZW0sIHdlIGRlZmluZSB0aGUgZm9sbG93aW5nIHN1YmNsYXNzIHN0dWJzXG4vLyBzbyB0aGF0IGNvbmNyZXRlIHR5cGVzIGV4aXN0IHRvIGFzc29jaWF0ZSB3aXRoIHdpdGggdGhlIGludGVyZmFjZXMgYmVsb3cuXG4vL1xuLy8gVGhlIGltcGxlbWVudGF0aW9uIGZvciBlYWNoIFJlY29yZEJhdGNoUmVhZGVyIGlzIGhpZGRlbiBhd2F5IGluIHRoZSBzZXQgb2Zcbi8vIGBSZWNvcmRCYXRjaFJlYWRlckltcGxgIGNsYXNzZXMgaW4gdGhlIHNlY29uZCBoYWxmIG9mIHRoaXMgZmlsZS4gVGhpcyBhbGxvd3Ncbi8vIHVzIHRvIGV4cG9ydCBhIHNpbmdsZSBSZWNvcmRCYXRjaFJlYWRlciBjbGFzcywgYW5kIHN3YXAgb3V0IHRoZSBpbXBsIGJhc2VkXG4vLyBvbiB0aGUgaW8gcHJpbWl0aXZlcyBvciB1bmRlcmx5aW5nIGFycm93IChKU09OLCBmaWxlLCBvciBzdHJlYW0pIGF0IHJ1bnRpbWUuXG4vL1xuLy8gQXN5bmMvYXdhaXQgbWFrZXMgb3VyIGpvYiBhIGJpdCBoYXJkZXIsIHNpbmNlIGl0IGZvcmNlcyBldmVyeXRoaW5nIHRvIGJlXG4vLyBlaXRoZXIgZnVsbHkgc3luYyBvciBmdWxseSBhc3luYy4gVGhpcyBpcyB3aHkgdGhlIGxvZ2ljIGZvciB0aGUgcmVhZGVyIGltcGxzXG4vLyBoYXMgYmVlbiBkdXBsaWNhdGVkIGludG8gYm90aCBzeW5jIGFuZCBhc3luYyB2YXJpYW50cy4gU2luY2UgdGhlIFJCUlxuLy8gZGVsZWdhdGVzIHRvIGl0cyBpbXBsLCBhbiBSQlIgd2l0aCBhbiBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlckltcGwgZm9yXG4vLyBleGFtcGxlIHdpbGwgcmV0dXJuIGFzeW5jL2F3YWl0LWZyaWVuZGx5IFByb21pc2VzLCBidXQgb25lIHdpdGggYSAoc3luYylcbi8vIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbCB3aWxsIGFsd2F5cyByZXR1cm4gdmFsdWVzLiBOb3RoaW5nIHNob3VsZCBiZVxuLy8gZGlmZmVyZW50IGFib3V0IHRoZWlyIGxvZ2ljLCBhc2lkZSBmcm9tIHRoZSBhc3luYyBoYW5kbGluZy4gVGhpcyBpcyBhbHNvIHdoeVxuLy8gdGhpcyBjb2RlIGxvb2tzIGhpZ2hseSBzdHJ1Y3R1cmVkLCBhcyBpdCBzaG91bGQgYmUgbmVhcmx5IGlkZW50aWNhbCBhbmQgZWFzeVxuLy8gdG8gZm9sbG93LlxuLy9cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjbGFzcyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoUmVhZGVyPFQ+IHtcbiAgICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgX2ltcGw6IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUPikgeyBzdXBlciAoX2ltcGwpOyB9XG4gICAgcHVibGljIFtTeW1ib2wuaXRlcmF0b3JdKCkgeyByZXR1cm4gKHRoaXMuX2ltcGwgYXMgSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4pW1N5bWJvbC5pdGVyYXRvcl0oKTsgfVxuICAgIHB1YmxpYyBhc3luYyAqW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHsgeWllbGQqIHRoaXNbU3ltYm9sLml0ZXJhdG9yXSgpOyB9XG59XG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlcjxUPiB7XG4gICAgY29uc3RydWN0b3IocHJvdGVjdGVkIF9pbXBsOiBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUPikgeyBzdXBlciAoX2ltcGwpOyB9XG4gICAgcHVibGljIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHsgdGhyb3cgbmV3IEVycm9yKGBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyIGlzIG5vdCBJdGVyYWJsZWApOyB9XG4gICAgcHVibGljIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKSB7IHJldHVybiAodGhpcy5faW1wbCBhcyBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+KVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTsgfVxufVxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjbGFzcyBSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPiB7XG4gICAgY29uc3RydWN0b3IocHJvdGVjdGVkIF9pbXBsOiBSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQ+KSB7IHN1cGVyIChfaW1wbCk7IH1cbn1cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY2xhc3MgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+IHtcbiAgICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgX2ltcGw6IEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUPikgeyBzdXBlciAoX2ltcGwpOyB9XG59XG5cbi8vXG4vLyBOb3cgb3ZlcnJpZGUgdGhlIHJldHVybiB0eXBlcyBmb3IgZWFjaCBzeW5jL2FzeW5jIFJlY29yZEJhdGNoUmVhZGVyIHZhcmlhbnRcbi8vXG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgaW50ZXJmYWNlIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXI8VD4ge1xuICAgIG9wZW4ob3B0aW9ucz86IE9wZW5PcHRpb25zIHwgdW5kZWZpbmVkKTogdGhpcztcbiAgICBjYW5jZWwoKTogdm9pZDtcbiAgICB0aHJvdyh2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PGFueT47XG4gICAgcmV0dXJuKHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8YW55PjtcbiAgICBuZXh0KHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8UmVjb3JkQmF0Y2g8VD4+O1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGludGVyZmFjZSBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXI8VD4ge1xuICAgIG9wZW4ob3B0aW9ucz86IE9wZW5PcHRpb25zIHwgdW5kZWZpbmVkKTogUHJvbWlzZTx0aGlzPjtcbiAgICBjYW5jZWwoKTogUHJvbWlzZTx2b2lkPjtcbiAgICB0aHJvdyh2YWx1ZT86IGFueSk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55Pj47XG4gICAgcmV0dXJuKHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxhbnk+PjtcbiAgICBuZXh0KHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxSZWNvcmRCYXRjaDxUPj4+O1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGludGVyZmFjZSBSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPiB7XG4gICAgZm9vdGVyOiBGb290ZXI7XG4gICAgcmVhZFJlY29yZEJhdGNoKGluZGV4OiBudW1iZXIpOiBSZWNvcmRCYXRjaDxUPiB8IG51bGw7XG59XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgaW50ZXJmYWNlIEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPiB7XG4gICAgZm9vdGVyOiBGb290ZXI7XG4gICAgcmVhZFJlY29yZEJhdGNoKGluZGV4OiBudW1iZXIpOiBQcm9taXNlPFJlY29yZEJhdGNoPFQ+IHwgbnVsbD47XG59XG5cbi8qKiBAaWdub3JlICovXG50eXBlIFJlY29yZEJhdGNoUmVhZGVySW1wbHM8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gPVxuICAgICBSZWNvcmRCYXRjaEpTT05SZWFkZXJJbXBsPFQ+IHxcbiAgICAgUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUPiB8XG4gICAgIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUPiB8XG4gICAgIEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUPiB8XG4gICAgIEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+O1xuXG4vKiogQGlnbm9yZSAqL1xuaW50ZXJmYWNlIFJlY29yZEJhdGNoUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiB7XG5cbiAgICBjbG9zZWQ6IGJvb2xlYW47XG4gICAgc2NoZW1hOiBTY2hlbWE8VD47XG4gICAgYXV0b0Rlc3Ryb3k6IGJvb2xlYW47XG4gICAgZGljdGlvbmFyaWVzOiBNYXA8bnVtYmVyLCBWZWN0b3I+O1xuXG4gICAgaXNGaWxlKCk6IHRoaXMgaXMgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyczxUPjtcbiAgICBpc1N0cmVhbSgpOiB0aGlzIGlzIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyczxUPjtcbiAgICBpc1N5bmMoKTogdGhpcyBpcyBSZWNvcmRCYXRjaFJlYWRlcnM8VD47XG4gICAgaXNBc3luYygpOiB0aGlzIGlzIEFzeW5jUmVjb3JkQmF0Y2hSZWFkZXJzPFQ+O1xuXG4gICAgcmVzZXQoc2NoZW1hPzogU2NoZW1hPFQ+IHwgbnVsbCk6IHRoaXM7XG59XG5cbi8qKiBAaWdub3JlICovXG5pbnRlcmZhY2UgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXJJbXBsPFQ+IHtcblxuICAgIG9wZW4ob3B0aW9ucz86IE9wZW5PcHRpb25zKTogdGhpcztcbiAgICBjYW5jZWwoKTogdm9pZDtcblxuICAgIHRocm93KHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8YW55PjtcbiAgICByZXR1cm4odmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxhbnk+O1xuICAgIG5leHQodmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxSZWNvcmRCYXRjaDxUPj47XG5cbiAgICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+Pjtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmludGVyZmFjZSBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoUmVhZGVySW1wbDxUPiB7XG5cbiAgICBvcGVuKG9wdGlvbnM/OiBPcGVuT3B0aW9ucyk6IFByb21pc2U8dGhpcz47XG4gICAgY2FuY2VsKCk6IFByb21pc2U8dm9pZD47XG5cbiAgICB0aHJvdyh2YWx1ZT86IGFueSk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55Pj47XG4gICAgcmV0dXJuKHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxhbnk+PjtcbiAgICBuZXh0KHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxSZWNvcmRCYXRjaDxUPj4+O1xuXG4gICAgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+O1xufVxuXG4vKiogQGlnbm9yZSAqL1xuaW50ZXJmYWNlIFJlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VD4ge1xuICAgIHJlYWRSZWNvcmRCYXRjaChpbmRleDogbnVtYmVyKTogUmVjb3JkQmF0Y2g8VD4gfCBudWxsO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuaW50ZXJmYWNlIEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+IHtcbiAgICByZWFkUmVjb3JkQmF0Y2goaW5kZXg6IG51bWJlcik6IFByb21pc2U8UmVjb3JkQmF0Y2g8VD4gfCBudWxsPjtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmFic3RyYWN0IGNsYXNzIFJlY29yZEJhdGNoUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBpbXBsZW1lbnRzIFJlY29yZEJhdGNoUmVhZGVySW1wbDxUPiB7XG5cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIHNjaGVtYTogU2NoZW1hO1xuICAgIHB1YmxpYyBjbG9zZWQgPSBmYWxzZTtcbiAgICBwdWJsaWMgYXV0b0Rlc3Ryb3kgPSB0cnVlO1xuICAgIHB1YmxpYyBkaWN0aW9uYXJpZXM6IE1hcDxudW1iZXIsIFZlY3Rvcj47XG5cbiAgICBwcm90ZWN0ZWQgX2RpY3Rpb25hcnlJbmRleCA9IDA7XG4gICAgcHJvdGVjdGVkIF9yZWNvcmRCYXRjaEluZGV4ID0gMDtcbiAgICBwdWJsaWMgZ2V0IG51bURpY3Rpb25hcmllcygpIHsgcmV0dXJuIHRoaXMuX2RpY3Rpb25hcnlJbmRleDsgfVxuICAgIHB1YmxpYyBnZXQgbnVtUmVjb3JkQmF0Y2hlcygpIHsgcmV0dXJuIHRoaXMuX3JlY29yZEJhdGNoSW5kZXg7IH1cblxuICAgIGNvbnN0cnVjdG9yKGRpY3Rpb25hcmllcyA9IG5ldyBNYXA8bnVtYmVyLCBWZWN0b3I+KCkpIHtcbiAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMgPSBkaWN0aW9uYXJpZXM7XG4gICAgfVxuXG4gICAgcHVibGljIGlzU3luYygpOiB0aGlzIGlzIFJlY29yZEJhdGNoUmVhZGVyczxUPiB7IHJldHVybiBmYWxzZTsgfVxuICAgIHB1YmxpYyBpc0FzeW5jKCk6IHRoaXMgaXMgQXN5bmNSZWNvcmRCYXRjaFJlYWRlcnM8VD4geyByZXR1cm4gZmFsc2U7IH1cbiAgICBwdWJsaWMgaXNGaWxlKCk6IHRoaXMgaXMgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyczxUPiB7IHJldHVybiBmYWxzZTsgfVxuICAgIHB1YmxpYyBpc1N0cmVhbSgpOiB0aGlzIGlzIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyczxUPiB7IHJldHVybiBmYWxzZTsgfVxuXG4gICAgcHVibGljIHJlc2V0KHNjaGVtYT86IFNjaGVtYTxUPiB8IG51bGwpIHtcbiAgICAgICAgdGhpcy5fZGljdGlvbmFyeUluZGV4ID0gMDtcbiAgICAgICAgdGhpcy5fcmVjb3JkQmF0Y2hJbmRleCA9IDA7XG4gICAgICAgIHRoaXMuc2NoZW1hID0gPGFueT4gc2NoZW1hO1xuICAgICAgICB0aGlzLmRpY3Rpb25hcmllcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF9sb2FkUmVjb3JkQmF0Y2goaGVhZGVyOiBtZXRhZGF0YS5SZWNvcmRCYXRjaCwgYm9keTogYW55KSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVjb3JkQmF0Y2g8VD4odGhpcy5zY2hlbWEsIGhlYWRlci5sZW5ndGgsIHRoaXMuX2xvYWRWZWN0b3JzKGhlYWRlciwgYm9keSwgdGhpcy5zY2hlbWEuZmllbGRzKSk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBfbG9hZERpY3Rpb25hcnlCYXRjaChoZWFkZXI6IG1ldGFkYXRhLkRpY3Rpb25hcnlCYXRjaCwgYm9keTogYW55KSB7XG4gICAgICAgIGNvbnN0IHsgaWQsIGlzRGVsdGEsIGRhdGEgfSA9IGhlYWRlcjtcbiAgICAgICAgY29uc3QgeyBkaWN0aW9uYXJpZXMsIHNjaGVtYSB9ID0gdGhpcztcbiAgICAgICAgaWYgKGlzRGVsdGEgfHwgIWRpY3Rpb25hcmllcy5nZXQoaWQpKSB7XG5cbiAgICAgICAgICAgIGNvbnN0IHR5cGUgPSBzY2hlbWEuZGljdGlvbmFyaWVzLmdldChpZCkhO1xuICAgICAgICAgICAgY29uc3QgdmVjdG9yID0gKGlzRGVsdGEgPyBkaWN0aW9uYXJpZXMuZ2V0KGlkKSEuY29uY2F0KFxuICAgICAgICAgICAgICAgIFZlY3Rvci5uZXcodGhpcy5fbG9hZFZlY3RvcnMoZGF0YSwgYm9keSwgW3R5cGVdKVswXSkpIDpcbiAgICAgICAgICAgICAgICBWZWN0b3IubmV3KHRoaXMuX2xvYWRWZWN0b3JzKGRhdGEsIGJvZHksIFt0eXBlXSlbMF0pKSBhcyBWZWN0b3I7XG5cbiAgICAgICAgICAgIChzY2hlbWEuZGljdGlvbmFyeUZpZWxkcy5nZXQoaWQpIHx8IFtdKS5mb3JFYWNoKCh7IHR5cGUgfSkgPT4gdHlwZS5kaWN0aW9uYXJ5VmVjdG9yID0gdmVjdG9yKTtcblxuICAgICAgICAgICAgcmV0dXJuIHZlY3RvcjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGljdGlvbmFyaWVzLmdldChpZCkhO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgX2xvYWRWZWN0b3JzKGhlYWRlcjogbWV0YWRhdGEuUmVjb3JkQmF0Y2gsIGJvZHk6IGFueSwgdHlwZXM6IChGaWVsZCB8IERhdGFUeXBlKVtdKSB7XG4gICAgICAgIHJldHVybiBuZXcgVmVjdG9yTG9hZGVyKGJvZHksIGhlYWRlci5ub2RlcywgaGVhZGVyLmJ1ZmZlcnMpLnZpc2l0TWFueSh0eXBlcyk7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuY2xhc3MgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXJJbXBsPFQ+IGltcGxlbWVudHMgSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4ge1xuXG4gICAgcHJvdGVjdGVkIF9yZWFkZXI6IE1lc3NhZ2VSZWFkZXI7XG4gICAgcHJvdGVjdGVkIF9oYW5kbGU6IEJ5dGVTdHJlYW0gfCBBcnJvd0pTT05MaWtlO1xuXG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBCeXRlU3RyZWFtIHwgQXJyb3dKU09OTGlrZSwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgVmVjdG9yPikge1xuICAgICAgICBzdXBlcihkaWN0aW9uYXJpZXMpO1xuICAgICAgICB0aGlzLl9yZWFkZXIgPSAhaXNBcnJvd0pTT04oc291cmNlKVxuICAgICAgICAgICAgPyBuZXcgTWVzc2FnZVJlYWRlcih0aGlzLl9oYW5kbGUgPSBzb3VyY2UpXG4gICAgICAgICAgICA6IG5ldyBKU09OTWVzc2FnZVJlYWRlcih0aGlzLl9oYW5kbGUgPSBzb3VyY2UpO1xuICAgIH1cblxuICAgIHB1YmxpYyBpc1N5bmMoKTogdGhpcyBpcyBSZWNvcmRCYXRjaFJlYWRlcnM8VD4geyByZXR1cm4gdHJ1ZTsgfVxuICAgIHB1YmxpYyBpc1N0cmVhbSgpOiB0aGlzIGlzIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyczxUPiB7IHJldHVybiB0cnVlOyB9XG4gICAgcHVibGljIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMgYXMgSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj47XG4gICAgfVxuICAgIHB1YmxpYyBjYW5jZWwoKSB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQgJiYgKHRoaXMuY2xvc2VkID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgIHRoaXMucmVzZXQoKS5fcmVhZGVyLnJldHVybigpO1xuICAgICAgICAgICAgdGhpcy5fcmVhZGVyID0gPGFueT4gbnVsbDtcbiAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyaWVzID0gPGFueT4gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBwdWJsaWMgb3BlbihvcHRpb25zPzogT3Blbk9wdGlvbnMpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCkge1xuICAgICAgICAgICAgdGhpcy5hdXRvRGVzdHJveSA9IHNob3VsZEF1dG9EZXN0cm95KHRoaXMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKCEodGhpcy5zY2hlbWEgfHwgKHRoaXMuc2NoZW1hID0gdGhpcy5fcmVhZGVyLnJlYWRTY2hlbWEoKSEpKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2FuY2VsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHB1YmxpYyB0aHJvdyh2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PGFueT4ge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkICYmIHRoaXMuYXV0b0Rlc3Ryb3kgJiYgKHRoaXMuY2xvc2VkID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlc2V0KCkuX3JlYWRlci50aHJvdyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIElURVJBVE9SX0RPTkU7XG4gICAgfVxuICAgIHB1YmxpYyByZXR1cm4odmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxhbnk+IHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiB0aGlzLmF1dG9EZXN0cm95ICYmICh0aGlzLmNsb3NlZCA9IHRydWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZXNldCgpLl9yZWFkZXIucmV0dXJuKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gSVRFUkFUT1JfRE9ORTtcbiAgICB9XG4gICAgcHVibGljIG5leHQoKTogSXRlcmF0b3JSZXN1bHQ8UmVjb3JkQmF0Y2g8VD4+IHtcbiAgICAgICAgaWYgKHRoaXMuY2xvc2VkKSB7IHJldHVybiBJVEVSQVRPUl9ET05FOyB9XG4gICAgICAgIGxldCBtZXNzYWdlOiBNZXNzYWdlIHwgbnVsbCwgeyBfcmVhZGVyOiByZWFkZXIgfSA9IHRoaXM7XG4gICAgICAgIHdoaWxlIChtZXNzYWdlID0gdGhpcy5fcmVhZE5leHRNZXNzYWdlQW5kVmFsaWRhdGUoKSkge1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuaXNTY2hlbWEoKSkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVzZXQobWVzc2FnZS5oZWFkZXIoKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuaXNSZWNvcmRCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVjb3JkQmF0Y2hJbmRleCsrO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IG1lc3NhZ2UuaGVhZGVyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gcmVhZGVyLnJlYWRNZXNzYWdlQm9keShtZXNzYWdlLmJvZHlMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZEJhdGNoID0gdGhpcy5fbG9hZFJlY29yZEJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBkb25lOiBmYWxzZSwgdmFsdWU6IHJlY29yZEJhdGNoIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuaXNEaWN0aW9uYXJ5QmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2RpY3Rpb25hcnlJbmRleCsrO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IG1lc3NhZ2UuaGVhZGVyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gcmVhZGVyLnJlYWRNZXNzYWdlQm9keShtZXNzYWdlLmJvZHlMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHZlY3RvciA9IHRoaXMuX2xvYWREaWN0aW9uYXJ5QmF0Y2goaGVhZGVyLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyaWVzLnNldChoZWFkZXIuaWQsIHZlY3Rvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMucmV0dXJuKCk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBfcmVhZE5leHRNZXNzYWdlQW5kVmFsaWRhdGU8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KHR5cGU/OiBUIHwgbnVsbCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcmVhZGVyLnJlYWRNZXNzYWdlPFQ+KHR5cGUpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmNsYXNzIEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXJJbXBsPFQ+IGltcGxlbWVudHMgQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7XG5cbiAgICBwcm90ZWN0ZWQgX2hhbmRsZTogQXN5bmNCeXRlU3RyZWFtO1xuICAgIHByb3RlY3RlZCBfcmVhZGVyOiBBc3luY01lc3NhZ2VSZWFkZXI7XG5cbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEFzeW5jQnl0ZVN0cmVhbSwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgVmVjdG9yPikge1xuICAgICAgICBzdXBlcihkaWN0aW9uYXJpZXMpO1xuICAgICAgICB0aGlzLl9yZWFkZXIgPSBuZXcgQXN5bmNNZXNzYWdlUmVhZGVyKHRoaXMuX2hhbmRsZSA9IHNvdXJjZSk7XG4gICAgfVxuICAgIHB1YmxpYyBpc0FzeW5jKCk6IHRoaXMgaXMgQXN5bmNSZWNvcmRCYXRjaFJlYWRlcnM8VD4geyByZXR1cm4gdHJ1ZTsgfVxuICAgIHB1YmxpYyBpc1N0cmVhbSgpOiB0aGlzIGlzIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyczxUPiB7IHJldHVybiB0cnVlOyB9XG4gICAgcHVibGljIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7XG4gICAgICAgIHJldHVybiB0aGlzIGFzIEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj47XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyBjYW5jZWwoKSB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQgJiYgKHRoaXMuY2xvc2VkID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucmVzZXQoKS5fcmVhZGVyLnJldHVybigpO1xuICAgICAgICAgICAgdGhpcy5fcmVhZGVyID0gPGFueT4gbnVsbDtcbiAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyaWVzID0gPGFueT4gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgb3BlbihvcHRpb25zPzogT3Blbk9wdGlvbnMpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCkge1xuICAgICAgICAgICAgdGhpcy5hdXRvRGVzdHJveSA9IHNob3VsZEF1dG9EZXN0cm95KHRoaXMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKCEodGhpcy5zY2hlbWEgfHwgKHRoaXMuc2NoZW1hID0gKGF3YWl0IHRoaXMuX3JlYWRlci5yZWFkU2NoZW1hKCkpISkpKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5jYW5jZWwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHVibGljIGFzeW5jIHRocm93KHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxhbnk+PiB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQgJiYgdGhpcy5hdXRvRGVzdHJveSAmJiAodGhpcy5jbG9zZWQgPSB0cnVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVzZXQoKS5fcmVhZGVyLnRocm93KHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gSVRFUkFUT1JfRE9ORTtcbiAgICB9XG4gICAgcHVibGljIGFzeW5jIHJldHVybih2YWx1ZT86IGFueSk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55Pj4ge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkICYmIHRoaXMuYXV0b0Rlc3Ryb3kgJiYgKHRoaXMuY2xvc2VkID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJlc2V0KCkuX3JlYWRlci5yZXR1cm4odmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBJVEVSQVRPUl9ET05FO1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgbmV4dCgpIHtcbiAgICAgICAgaWYgKHRoaXMuY2xvc2VkKSB7IHJldHVybiBJVEVSQVRPUl9ET05FOyB9XG4gICAgICAgIGxldCBtZXNzYWdlOiBNZXNzYWdlIHwgbnVsbCwgeyBfcmVhZGVyOiByZWFkZXIgfSA9IHRoaXM7XG4gICAgICAgIHdoaWxlIChtZXNzYWdlID0gYXdhaXQgdGhpcy5fcmVhZE5leHRNZXNzYWdlQW5kVmFsaWRhdGUoKSkge1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuaXNTY2hlbWEoKSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucmVzZXQobWVzc2FnZS5oZWFkZXIoKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuaXNSZWNvcmRCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVjb3JkQmF0Y2hJbmRleCsrO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IG1lc3NhZ2UuaGVhZGVyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgcmVhZGVyLnJlYWRNZXNzYWdlQm9keShtZXNzYWdlLmJvZHlMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZEJhdGNoID0gdGhpcy5fbG9hZFJlY29yZEJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBkb25lOiBmYWxzZSwgdmFsdWU6IHJlY29yZEJhdGNoIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuaXNEaWN0aW9uYXJ5QmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2RpY3Rpb25hcnlJbmRleCsrO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IG1lc3NhZ2UuaGVhZGVyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgcmVhZGVyLnJlYWRNZXNzYWdlQm9keShtZXNzYWdlLmJvZHlMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHZlY3RvciA9IHRoaXMuX2xvYWREaWN0aW9uYXJ5QmF0Y2goaGVhZGVyLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyaWVzLnNldChoZWFkZXIuaWQsIHZlY3Rvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmV0dXJuKCk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBhc3luYyBfcmVhZE5leHRNZXNzYWdlQW5kVmFsaWRhdGU8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KHR5cGU/OiBUIHwgbnVsbCkge1xuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5fcmVhZGVyLnJlYWRNZXNzYWdlPFQ+KHR5cGUpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmNsYXNzIFJlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VD4ge1xuXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHByb3RlY3RlZCBfZm9vdGVyPzogRm9vdGVyO1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwcm90ZWN0ZWQgX2hhbmRsZTogUmFuZG9tQWNjZXNzRmlsZTtcbiAgICBwdWJsaWMgZ2V0IGZvb3RlcigpIHsgcmV0dXJuIHRoaXMuX2Zvb3RlciE7IH1cbiAgICBwdWJsaWMgZ2V0IG51bURpY3Rpb25hcmllcygpIHsgcmV0dXJuIHRoaXMuX2Zvb3RlciA/IHRoaXMuX2Zvb3Rlci5udW1EaWN0aW9uYXJpZXMgOiAwOyB9XG4gICAgcHVibGljIGdldCBudW1SZWNvcmRCYXRjaGVzKCkgeyByZXR1cm4gdGhpcy5fZm9vdGVyID8gdGhpcy5fZm9vdGVyLm51bVJlY29yZEJhdGNoZXMgOiAwOyB9XG5cbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IFJhbmRvbUFjY2Vzc0ZpbGUgfCBBcnJheUJ1ZmZlclZpZXdJbnB1dCwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgVmVjdG9yPikge1xuICAgICAgICBzdXBlcihzb3VyY2UgaW5zdGFuY2VvZiBSYW5kb21BY2Nlc3NGaWxlID8gc291cmNlIDogbmV3IFJhbmRvbUFjY2Vzc0ZpbGUoc291cmNlKSwgZGljdGlvbmFyaWVzKTtcbiAgICB9XG4gICAgcHVibGljIGlzU3luYygpOiB0aGlzIGlzIFJlY29yZEJhdGNoUmVhZGVyczxUPiB7IHJldHVybiB0cnVlOyB9XG4gICAgcHVibGljIGlzRmlsZSgpOiB0aGlzIGlzIFJlY29yZEJhdGNoRmlsZVJlYWRlcnM8VD4geyByZXR1cm4gdHJ1ZTsgfVxuICAgIHB1YmxpYyBvcGVuKG9wdGlvbnM/OiBPcGVuT3B0aW9ucykge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkICYmICF0aGlzLl9mb290ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuc2NoZW1hID0gKHRoaXMuX2Zvb3RlciA9IHRoaXMuX3JlYWRGb290ZXIoKSkuc2NoZW1hO1xuICAgICAgICAgICAgZm9yIChjb25zdCBibG9jayBvZiB0aGlzLl9mb290ZXIuZGljdGlvbmFyeUJhdGNoZXMoKSkge1xuICAgICAgICAgICAgICAgIGJsb2NrICYmIHRoaXMuX3JlYWREaWN0aW9uYXJ5QmF0Y2godGhpcy5fZGljdGlvbmFyeUluZGV4KyspO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdXBlci5vcGVuKG9wdGlvbnMpO1xuICAgIH1cbiAgICBwdWJsaWMgcmVhZFJlY29yZEJhdGNoKGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgaWYgKHRoaXMuY2xvc2VkKSB7IHJldHVybiBudWxsOyB9XG4gICAgICAgIGlmICghdGhpcy5fZm9vdGVyKSB7IHRoaXMub3BlbigpOyB9XG4gICAgICAgIGNvbnN0IGJsb2NrID0gdGhpcy5fZm9vdGVyICYmIHRoaXMuX2Zvb3Rlci5nZXRSZWNvcmRCYXRjaChpbmRleCk7XG4gICAgICAgIGlmIChibG9jayAmJiB0aGlzLl9oYW5kbGUuc2VlayhibG9jay5vZmZzZXQpKSB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gdGhpcy5fcmVhZGVyLnJlYWRNZXNzYWdlKE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2gpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UgJiYgbWVzc2FnZS5pc1JlY29yZEJhdGNoKCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBtZXNzYWdlLmhlYWRlcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IHRoaXMuX3JlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRCYXRjaCA9IHRoaXMuX2xvYWRSZWNvcmRCYXRjaChoZWFkZXIsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlY29yZEJhdGNoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgX3JlYWREaWN0aW9uYXJ5QmF0Y2goaW5kZXg6IG51bWJlcikge1xuICAgICAgICBjb25zdCBibG9jayA9IHRoaXMuX2Zvb3RlciAmJiB0aGlzLl9mb290ZXIuZ2V0RGljdGlvbmFyeUJhdGNoKGluZGV4KTtcbiAgICAgICAgaWYgKGJsb2NrICYmIHRoaXMuX2hhbmRsZS5zZWVrKGJsb2NrLm9mZnNldCkpIHtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSB0aGlzLl9yZWFkZXIucmVhZE1lc3NhZ2UoTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2gpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UgJiYgbWVzc2FnZS5pc0RpY3Rpb25hcnlCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSB0aGlzLl9yZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdmVjdG9yID0gdGhpcy5fbG9hZERpY3Rpb25hcnlCYXRjaChoZWFkZXIsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMuc2V0KGhlYWRlci5pZCwgdmVjdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBwcm90ZWN0ZWQgX3JlYWRGb290ZXIoKSB7XG4gICAgICAgIGNvbnN0IHsgX2hhbmRsZSB9ID0gdGhpcztcbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0gX2hhbmRsZS5zaXplIC0gbWFnaWNBbmRQYWRkaW5nO1xuICAgICAgICBjb25zdCBsZW5ndGggPSBfaGFuZGxlLnJlYWRJbnQzMihvZmZzZXQpO1xuICAgICAgICBjb25zdCBidWZmZXIgPSBfaGFuZGxlLnJlYWRBdChvZmZzZXQgLSBsZW5ndGgsIGxlbmd0aCk7XG4gICAgICAgIHJldHVybiBGb290ZXIuZGVjb2RlKGJ1ZmZlcik7XG4gICAgfVxuICAgIHByb3RlY3RlZCBfcmVhZE5leHRNZXNzYWdlQW5kVmFsaWRhdGU8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KHR5cGU/OiBUIHwgbnVsbCk6IE1lc3NhZ2U8VD4gfCBudWxsIHtcbiAgICAgICAgaWYgKCF0aGlzLl9mb290ZXIpIHsgdGhpcy5vcGVuKCk7IH1cbiAgICAgICAgaWYgKHRoaXMuX2Zvb3RlciAmJiB0aGlzLl9yZWNvcmRCYXRjaEluZGV4IDwgdGhpcy5udW1SZWNvcmRCYXRjaGVzKSB7XG4gICAgICAgICAgICBjb25zdCBibG9jayA9IHRoaXMuX2Zvb3RlciAmJiB0aGlzLl9mb290ZXIuZ2V0UmVjb3JkQmF0Y2godGhpcy5fcmVjb3JkQmF0Y2hJbmRleCk7XG4gICAgICAgICAgICBpZiAoYmxvY2sgJiYgdGhpcy5faGFuZGxlLnNlZWsoYmxvY2sub2Zmc2V0KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9yZWFkZXIucmVhZE1lc3NhZ2UodHlwZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuY2xhc3MgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VD5cbiAgICBpbXBsZW1lbnRzIEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUPiB7XG5cbiAgICBwcm90ZWN0ZWQgX2Zvb3Rlcj86IEZvb3RlcjtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHJvdGVjdGVkIF9oYW5kbGU6IEFzeW5jUmFuZG9tQWNjZXNzRmlsZTtcbiAgICBwdWJsaWMgZ2V0IGZvb3RlcigpIHsgcmV0dXJuIHRoaXMuX2Zvb3RlciE7IH1cbiAgICBwdWJsaWMgZ2V0IG51bURpY3Rpb25hcmllcygpIHsgcmV0dXJuIHRoaXMuX2Zvb3RlciA/IHRoaXMuX2Zvb3Rlci5udW1EaWN0aW9uYXJpZXMgOiAwOyB9XG4gICAgcHVibGljIGdldCBudW1SZWNvcmRCYXRjaGVzKCkgeyByZXR1cm4gdGhpcy5fZm9vdGVyID8gdGhpcy5fZm9vdGVyLm51bVJlY29yZEJhdGNoZXMgOiAwOyB9XG5cbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEZpbGVIYW5kbGUsIGJ5dGVMZW5ndGg/OiBudW1iZXIsIGRpY3Rpb25hcmllcz86IE1hcDxudW1iZXIsIFZlY3Rvcj4pO1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogRmlsZUhhbmRsZSB8IEFzeW5jUmFuZG9tQWNjZXNzRmlsZSwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgVmVjdG9yPik7XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBGaWxlSGFuZGxlIHwgQXN5bmNSYW5kb21BY2Nlc3NGaWxlLCAuLi5yZXN0OiBhbnlbXSkge1xuICAgICAgICBjb25zdCBieXRlTGVuZ3RoID0gdHlwZW9mIHJlc3RbMF0gIT09ICdudW1iZXInID8gPG51bWJlcj4gcmVzdC5zaGlmdCgpIDogdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBkaWN0aW9uYXJpZXMgPSByZXN0WzBdIGluc3RhbmNlb2YgTWFwID8gPE1hcDxudW1iZXIsIFZlY3Rvcj4+IHJlc3Quc2hpZnQoKSA6IHVuZGVmaW5lZDtcbiAgICAgICAgc3VwZXIoc291cmNlIGluc3RhbmNlb2YgQXN5bmNSYW5kb21BY2Nlc3NGaWxlID8gc291cmNlIDogbmV3IEFzeW5jUmFuZG9tQWNjZXNzRmlsZShzb3VyY2UsIGJ5dGVMZW5ndGgpLCBkaWN0aW9uYXJpZXMpO1xuICAgIH1cbiAgICBwdWJsaWMgaXNGaWxlKCk6IHRoaXMgaXMgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyczxUPiB7IHJldHVybiB0cnVlOyB9XG4gICAgcHVibGljIGlzQXN5bmMoKTogdGhpcyBpcyBBc3luY1JlY29yZEJhdGNoUmVhZGVyczxUPiB7IHJldHVybiB0cnVlOyB9XG4gICAgcHVibGljIGFzeW5jIG9wZW4ob3B0aW9ucz86IE9wZW5PcHRpb25zKSB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQgJiYgIXRoaXMuX2Zvb3Rlcikge1xuICAgICAgICAgICAgdGhpcy5zY2hlbWEgPSAodGhpcy5fZm9vdGVyID0gYXdhaXQgdGhpcy5fcmVhZEZvb3RlcigpKS5zY2hlbWE7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGJsb2NrIG9mIHRoaXMuX2Zvb3Rlci5kaWN0aW9uYXJ5QmF0Y2hlcygpKSB7XG4gICAgICAgICAgICAgICAgYmxvY2sgJiYgYXdhaXQgdGhpcy5fcmVhZERpY3Rpb25hcnlCYXRjaCh0aGlzLl9kaWN0aW9uYXJ5SW5kZXgrKyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGF3YWl0IHN1cGVyLm9wZW4ob3B0aW9ucyk7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyByZWFkUmVjb3JkQmF0Y2goaW5kZXg6IG51bWJlcikge1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgICAgaWYgKCF0aGlzLl9mb290ZXIpIHsgYXdhaXQgdGhpcy5vcGVuKCk7IH1cbiAgICAgICAgY29uc3QgYmxvY2sgPSB0aGlzLl9mb290ZXIgJiYgdGhpcy5fZm9vdGVyLmdldFJlY29yZEJhdGNoKGluZGV4KTtcbiAgICAgICAgaWYgKGJsb2NrICYmIChhd2FpdCB0aGlzLl9oYW5kbGUuc2VlayhibG9jay5vZmZzZXQpKSkge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGF3YWl0IHRoaXMuX3JlYWRlci5yZWFkTWVzc2FnZShNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlICYmIG1lc3NhZ2UuaXNSZWNvcmRCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSBhd2FpdCB0aGlzLl9yZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkQmF0Y2ggPSB0aGlzLl9sb2FkUmVjb3JkQmF0Y2goaGVhZGVyLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZWNvcmRCYXRjaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcHJvdGVjdGVkIGFzeW5jIF9yZWFkRGljdGlvbmFyeUJhdGNoKGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgYmxvY2sgPSB0aGlzLl9mb290ZXIgJiYgdGhpcy5fZm9vdGVyLmdldERpY3Rpb25hcnlCYXRjaChpbmRleCk7XG4gICAgICAgIGlmIChibG9jayAmJiAoYXdhaXQgdGhpcy5faGFuZGxlLnNlZWsoYmxvY2sub2Zmc2V0KSkpIHtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBhd2FpdCB0aGlzLl9yZWFkZXIucmVhZE1lc3NhZ2UoTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2gpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UgJiYgbWVzc2FnZS5pc0RpY3Rpb25hcnlCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSBhd2FpdCB0aGlzLl9yZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdmVjdG9yID0gdGhpcy5fbG9hZERpY3Rpb25hcnlCYXRjaChoZWFkZXIsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMuc2V0KGhlYWRlci5pZCwgdmVjdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBwcm90ZWN0ZWQgYXN5bmMgX3JlYWRGb290ZXIoKSB7XG4gICAgICAgIGNvbnN0IHsgX2hhbmRsZSB9ID0gdGhpcztcbiAgICAgICAgX2hhbmRsZS5fcGVuZGluZyAmJiBhd2FpdCBfaGFuZGxlLl9wZW5kaW5nO1xuICAgICAgICBjb25zdCBvZmZzZXQgPSBfaGFuZGxlLnNpemUgLSBtYWdpY0FuZFBhZGRpbmc7XG4gICAgICAgIGNvbnN0IGxlbmd0aCA9IGF3YWl0IF9oYW5kbGUucmVhZEludDMyKG9mZnNldCk7XG4gICAgICAgIGNvbnN0IGJ1ZmZlciA9IGF3YWl0IF9oYW5kbGUucmVhZEF0KG9mZnNldCAtIGxlbmd0aCwgbGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIEZvb3Rlci5kZWNvZGUoYnVmZmVyKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIGFzeW5jIF9yZWFkTmV4dE1lc3NhZ2VBbmRWYWxpZGF0ZTxUIGV4dGVuZHMgTWVzc2FnZUhlYWRlcj4odHlwZT86IFQgfCBudWxsKTogUHJvbWlzZTxNZXNzYWdlPFQ+IHwgbnVsbD4ge1xuICAgICAgICBpZiAoIXRoaXMuX2Zvb3RlcikgeyBhd2FpdCB0aGlzLm9wZW4oKTsgfVxuICAgICAgICBpZiAodGhpcy5fZm9vdGVyICYmIHRoaXMuX3JlY29yZEJhdGNoSW5kZXggPCB0aGlzLm51bVJlY29yZEJhdGNoZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGJsb2NrID0gdGhpcy5fZm9vdGVyLmdldFJlY29yZEJhdGNoKHRoaXMuX3JlY29yZEJhdGNoSW5kZXgpO1xuICAgICAgICAgICAgaWYgKGJsb2NrICYmIGF3YWl0IHRoaXMuX2hhbmRsZS5zZWVrKGJsb2NrLm9mZnNldCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5fcmVhZGVyLnJlYWRNZXNzYWdlKHR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmNsYXNzIFJlY29yZEJhdGNoSlNPTlJlYWRlckltcGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VD4ge1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogQXJyb3dKU09OTGlrZSwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgVmVjdG9yPikge1xuICAgICAgICBzdXBlcihzb3VyY2UsIGRpY3Rpb25hcmllcyk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBfbG9hZFZlY3RvcnMoaGVhZGVyOiBtZXRhZGF0YS5SZWNvcmRCYXRjaCwgYm9keTogYW55LCB0eXBlczogKEZpZWxkIHwgRGF0YVR5cGUpW10pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBKU09OVmVjdG9yTG9hZGVyKGJvZHksIGhlYWRlci5ub2RlcywgaGVhZGVyLmJ1ZmZlcnMpLnZpc2l0TWFueSh0eXBlcyk7XG4gICAgfVxufVxuXG4vL1xuLy8gRGVmaW5lIHNvbWUgaGVscGVyIGZ1bmN0aW9ucyBhbmQgc3RhdGljIGltcGxlbWVudGF0aW9ucyBkb3duIGhlcmUuIFRoZXJlJ3Ncbi8vIGEgYml0IG9mIGJyYW5jaGluZyBpbiB0aGUgc3RhdGljIG1ldGhvZHMgdGhhdCBjYW4gbGVhZCB0byB0aGUgc2FtZSByb3V0aW5lc1xuLy8gYmVpbmcgZXhlY3V0ZWQsIHNvIHdlJ3ZlIGJyb2tlbiB0aG9zZSBvdXQgaGVyZSBmb3IgcmVhZGFiaWxpdHkuXG4vL1xuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gc2hvdWxkQXV0b0Rlc3Ryb3koc2VsZjogeyBhdXRvRGVzdHJveTogYm9vbGVhbiB9LCBvcHRpb25zPzogT3Blbk9wdGlvbnMpIHtcbiAgICByZXR1cm4gb3B0aW9ucyAmJiAodHlwZW9mIG9wdGlvbnNbJ2F1dG9EZXN0cm95J10gPT09ICdib29sZWFuJykgPyBvcHRpb25zWydhdXRvRGVzdHJveSddIDogc2VsZlsnYXV0b0Rlc3Ryb3knXTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uKiByZWFkQWxsU3luYzxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IFJlY29yZEJhdGNoUmVhZGVyczxUPiB8IEZyb21BcmcwIHwgRnJvbUFyZzIpIHtcbiAgICBjb25zdCByZWFkZXIgPSBSZWNvcmRCYXRjaFJlYWRlci5mcm9tPFQ+KDxhbnk+IHNvdXJjZSkgYXMgUmVjb3JkQmF0Y2hSZWFkZXJzPFQ+O1xuICAgIHRyeSB7XG4gICAgICAgIGlmICghcmVhZGVyLm9wZW4oeyBhdXRvRGVzdHJveTogZmFsc2UgfSkuY2xvc2VkKSB7XG4gICAgICAgICAgICBkbyB7IHlpZWxkIHJlYWRlcjsgfSB3aGlsZSAoIShyZWFkZXIucmVzZXQoKS5vcGVuKCkpLmNsb3NlZCk7XG4gICAgICAgIH1cbiAgICB9IGZpbmFsbHkgeyByZWFkZXIuY2FuY2VsKCk7IH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmFzeW5jIGZ1bmN0aW9uKiByZWFkQWxsQXN5bmM8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBBc3luY1JlY29yZEJhdGNoUmVhZGVyczxUPiB8IEZyb21BcmcxIHwgRnJvbUFyZzMgfCBGcm9tQXJnNCB8IEZyb21Bcmc1KSB7XG4gICAgY29uc3QgcmVhZGVyID0gYXdhaXQgUmVjb3JkQmF0Y2hSZWFkZXIuZnJvbTxUPig8YW55PiBzb3VyY2UpIGFzIFJlY29yZEJhdGNoUmVhZGVyPFQ+O1xuICAgIHRyeSB7XG4gICAgICAgIGlmICghKGF3YWl0IHJlYWRlci5vcGVuKHsgYXV0b0Rlc3Ryb3k6IGZhbHNlIH0pKS5jbG9zZWQpIHtcbiAgICAgICAgICAgIGRvIHsgeWllbGQgcmVhZGVyOyB9IHdoaWxlICghKGF3YWl0IHJlYWRlci5yZXNldCgpLm9wZW4oKSkuY2xvc2VkKTtcbiAgICAgICAgfVxuICAgIH0gZmluYWxseSB7IGF3YWl0IHJlYWRlci5jYW5jZWwoKTsgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZnJvbUFycm93SlNPTjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9Pihzb3VyY2U6IEFycm93SlNPTkxpa2UpIHtcbiAgICByZXR1cm4gbmV3IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyKG5ldyBSZWNvcmRCYXRjaEpTT05SZWFkZXJJbXBsPFQ+KHNvdXJjZSkpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gZnJvbUJ5dGVTdHJlYW08VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfT4oc291cmNlOiBCeXRlU3RyZWFtKSB7XG4gICAgY29uc3QgYnl0ZXMgPSBzb3VyY2UucGVlaygobWFnaWNMZW5ndGggKyA3KSAmIH43KTtcbiAgICByZXR1cm4gYnl0ZXMgJiYgYnl0ZXMuYnl0ZUxlbmd0aCA+PSA0ID8gIWNoZWNrRm9yTWFnaWNBcnJvd1N0cmluZyhieXRlcylcbiAgICAgICAgPyBuZXcgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXIobmV3IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUPihzb3VyY2UpKVxuICAgICAgICA6IG5ldyBSZWNvcmRCYXRjaEZpbGVSZWFkZXIobmV3IFJlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VD4oc291cmNlLnJlYWQoKSkpXG4gICAgICAgIDogbmV3IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyKG5ldyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VD4oZnVuY3Rpb24qKCk6IGFueSB7fSgpKSk7XG59XG5cbi8qKiBAaWdub3JlICovXG5hc3luYyBmdW5jdGlvbiBmcm9tQXN5bmNCeXRlU3RyZWFtPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0+KHNvdXJjZTogQXN5bmNCeXRlU3RyZWFtKSB7XG4gICAgY29uc3QgYnl0ZXMgPSBhd2FpdCBzb3VyY2UucGVlaygobWFnaWNMZW5ndGggKyA3KSAmIH43KTtcbiAgICByZXR1cm4gYnl0ZXMgJiYgYnl0ZXMuYnl0ZUxlbmd0aCA+PSA0ID8gIWNoZWNrRm9yTWFnaWNBcnJvd1N0cmluZyhieXRlcylcbiAgICAgICAgPyBuZXcgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcihuZXcgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VD4oc291cmNlKSlcbiAgICAgICAgOiBuZXcgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyKG5ldyBSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQ+KGF3YWl0IHNvdXJjZS5yZWFkKCkpKVxuICAgICAgICA6IG5ldyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyKG5ldyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUPihhc3luYyBmdW5jdGlvbiooKTogYW55IHt9KCkpKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmFzeW5jIGZ1bmN0aW9uIGZyb21GaWxlSGFuZGxlPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0+KHNvdXJjZTogRmlsZUhhbmRsZSkge1xuICAgIGNvbnN0IHsgc2l6ZSB9ID0gYXdhaXQgc291cmNlLnN0YXQoKTtcbiAgICBjb25zdCBmaWxlID0gbmV3IEFzeW5jUmFuZG9tQWNjZXNzRmlsZShzb3VyY2UsIHNpemUpO1xuICAgIGlmIChzaXplID49IG1hZ2ljWDJBbmRQYWRkaW5nKSB7XG4gICAgICAgIGlmIChjaGVja0Zvck1hZ2ljQXJyb3dTdHJpbmcoYXdhaXQgZmlsZS5yZWFkQXQoMCwgKG1hZ2ljTGVuZ3RoICsgNykgJiB+NykpKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyKG5ldyBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VD4oZmlsZSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXcgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcihuZXcgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VD4oZmlsZSkpO1xufVxuIl19

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
const vector_1 = require("../vector");
const enum_1 = require("../enum");
const file_1 = require("./metadata/file");
const adapters_1 = require("../io/adapters");
const recordbatch_1 = require("../recordbatch");
const stream_1 = require("../io/stream");
const file_2 = require("../io/file");
const vectorloader_1 = require("../visitor/vectorloader");
const interfaces_1 = require("../io/interfaces");
const message_1 = require("./message");
const compat_1 = require("../util/compat");
class RecordBatchReader extends interfaces_1.ReadableInterop {
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
        return compat_1.isPromise(opening) ? opening.then(() => this) : this;
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
        return adapters_1.default.toDOMStream((this.isSync()
            ? { [Symbol.iterator]: () => this }
            : { [Symbol.asyncIterator]: () => this }));
    }
    toNodeStream() {
        return adapters_1.default.toNodeStream((this.isSync()
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
        else if (compat_1.isArrowJSON(source)) {
            return fromArrowJSON(source);
        }
        else if (compat_1.isFileHandle(source)) {
            return fromFileHandle(source);
        }
        else if (compat_1.isPromise(source)) {
            return (async () => await RecordBatchReader.from(await source))();
        }
        else if (compat_1.isFetchResponse(source) || compat_1.isReadableDOMStream(source) || compat_1.isReadableNodeStream(source) || compat_1.isAsyncIterable(source)) {
            return fromAsyncByteStream(new stream_1.AsyncByteStream(source));
        }
        return fromByteStream(new stream_1.ByteStream(source));
    }
    /** @nocollapse */
    static readAll(source) {
        if (source instanceof RecordBatchReader) {
            return source.isSync() ? readAllSync(source) : readAllAsync(source);
        }
        else if (compat_1.isArrowJSON(source) || ArrayBuffer.isView(source) || compat_1.isIterable(source) || compat_1.isIteratorResult(source)) {
            return readAllSync(source);
        }
        return readAllAsync(source);
    }
}
exports.RecordBatchReader = RecordBatchReader;
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
class RecordBatchStreamReader extends RecordBatchReader {
    constructor(_impl) {
        super(_impl);
        this._impl = _impl;
    }
    [Symbol.iterator]() { return this._impl[Symbol.iterator](); }
    async *[Symbol.asyncIterator]() { yield* this[Symbol.iterator](); }
}
exports.RecordBatchStreamReader = RecordBatchStreamReader;
/** @ignore */
class AsyncRecordBatchStreamReader extends RecordBatchReader {
    constructor(_impl) {
        super(_impl);
        this._impl = _impl;
    }
    [Symbol.iterator]() { throw new Error(`AsyncRecordBatchStreamReader is not Iterable`); }
    [Symbol.asyncIterator]() { return this._impl[Symbol.asyncIterator](); }
}
exports.AsyncRecordBatchStreamReader = AsyncRecordBatchStreamReader;
/** @ignore */
class RecordBatchFileReader extends RecordBatchStreamReader {
    constructor(_impl) {
        super(_impl);
        this._impl = _impl;
    }
}
exports.RecordBatchFileReader = RecordBatchFileReader;
/** @ignore */
class AsyncRecordBatchFileReader extends AsyncRecordBatchStreamReader {
    constructor(_impl) {
        super(_impl);
        this._impl = _impl;
    }
}
exports.AsyncRecordBatchFileReader = AsyncRecordBatchFileReader;
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
        return new recordbatch_1.RecordBatch(this.schema, header.length, this._loadVectors(header, body, this.schema.fields));
    }
    _loadDictionaryBatch(header, body) {
        const { id, isDelta, data } = header;
        const { dictionaries, schema } = this;
        if (isDelta || !dictionaries.get(id)) {
            const type = schema.dictionaries.get(id);
            const vector = (isDelta ? dictionaries.get(id).concat(vector_1.Vector.new(this._loadVectors(data, body, [type])[0])) :
                vector_1.Vector.new(this._loadVectors(data, body, [type])[0]));
            (schema.dictionaryFields.get(id) || []).forEach(({ type }) => type.dictionaryVector = vector);
            return vector;
        }
        return dictionaries.get(id);
    }
    _loadVectors(header, body, types) {
        return new vectorloader_1.VectorLoader(body, header.nodes, header.buffers).visitMany(types);
    }
}
/** @ignore */
class RecordBatchStreamReaderImpl extends RecordBatchReaderImpl {
    constructor(source, dictionaries) {
        super(dictionaries);
        this._reader = !compat_1.isArrowJSON(source)
            ? new message_1.MessageReader(this._handle = source)
            : new message_1.JSONMessageReader(this._handle = source);
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
        return interfaces_1.ITERATOR_DONE;
    }
    return(value) {
        if (!this.closed && this.autoDestroy && (this.closed = true)) {
            return this.reset()._reader.return(value);
        }
        return interfaces_1.ITERATOR_DONE;
    }
    next() {
        if (this.closed) {
            return interfaces_1.ITERATOR_DONE;
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
        this._reader = new message_1.AsyncMessageReader(this._handle = source);
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
        return interfaces_1.ITERATOR_DONE;
    }
    async return(value) {
        if (!this.closed && this.autoDestroy && (this.closed = true)) {
            return await this.reset()._reader.return(value);
        }
        return interfaces_1.ITERATOR_DONE;
    }
    async next() {
        if (this.closed) {
            return interfaces_1.ITERATOR_DONE;
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
        super(source instanceof file_2.RandomAccessFile ? source : new file_2.RandomAccessFile(source), dictionaries);
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
            const message = this._reader.readMessage(enum_1.MessageHeader.RecordBatch);
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
            const message = this._reader.readMessage(enum_1.MessageHeader.DictionaryBatch);
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
        const offset = _handle.size - message_1.magicAndPadding;
        const length = _handle.readInt32(offset);
        const buffer = _handle.readAt(offset - length, length);
        return file_1.Footer.decode(buffer);
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
        super(source instanceof file_2.AsyncRandomAccessFile ? source : new file_2.AsyncRandomAccessFile(source, byteLength), dictionaries);
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
            const message = await this._reader.readMessage(enum_1.MessageHeader.RecordBatch);
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
            const message = await this._reader.readMessage(enum_1.MessageHeader.DictionaryBatch);
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
        const offset = _handle.size - message_1.magicAndPadding;
        const length = await _handle.readInt32(offset);
        const buffer = await _handle.readAt(offset - length, length);
        return file_1.Footer.decode(buffer);
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
        return new vectorloader_1.JSONVectorLoader(body, header.nodes, header.buffers).visitMany(types);
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
    const bytes = source.peek((message_1.magicLength + 7) & ~7);
    return bytes && bytes.byteLength >= 4 ? !message_1.checkForMagicArrowString(bytes)
        ? new RecordBatchStreamReader(new RecordBatchStreamReaderImpl(source))
        : new RecordBatchFileReader(new RecordBatchFileReaderImpl(source.read()))
        : new RecordBatchStreamReader(new RecordBatchStreamReaderImpl(function* () { }()));
}
/** @ignore */
async function fromAsyncByteStream(source) {
    const bytes = await source.peek((message_1.magicLength + 7) & ~7);
    return bytes && bytes.byteLength >= 4 ? !message_1.checkForMagicArrowString(bytes)
        ? new AsyncRecordBatchStreamReader(new AsyncRecordBatchStreamReaderImpl(source))
        : new RecordBatchFileReader(new RecordBatchFileReaderImpl(await source.read()))
        : new AsyncRecordBatchStreamReader(new AsyncRecordBatchStreamReaderImpl(async function* () { }()));
}
/** @ignore */
async function fromFileHandle(source) {
    const { size } = await source.stat();
    const file = new file_2.AsyncRandomAccessFile(source, size);
    if (size >= message_1.magicX2AndPadding) {
        if (message_1.checkForMagicArrowString(await file.readAt(0, (message_1.magicLength + 7) & ~7))) {
            return new AsyncRecordBatchFileReader(new AsyncRecordBatchFileReaderImpl(file));
        }
    }
    return new AsyncRecordBatchStreamReader(new AsyncRecordBatchStreamReaderImpl(file));
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFDLENBQUMsa0NBQXdCLENBQUMsS0FBSyxDQUFDO1FBQ3BFLENBQUMsQ0FBQyxJQUFJLDRCQUE0QixDQUFDLElBQUksZ0NBQWdDLENBQUksTUFBTSxDQUFDLENBQUM7UUFDbkYsQ0FBQyxDQUFDLElBQUkscUJBQXFCLENBQUMsSUFBSSx5QkFBeUIsQ0FBSSxNQUFNLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ2xGLENBQUMsQ0FBQyxJQUFJLDRCQUE0QixDQUFDLElBQUksZ0NBQWdDLENBQUksS0FBSyxTQUFTLENBQUMsTUFBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDakgsQ0FBQztBQUVELGNBQWM7QUFDZCxLQUFLLFVBQVUsY0FBYyxDQUF3QyxNQUFrQjtJQUNuRixNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDckMsTUFBTSxJQUFJLEdBQUcsSUFBSSw0QkFBcUIsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDckQsSUFBSSxJQUFJLElBQUksMkJBQWlCLEVBQUU7UUFDM0IsSUFBSSxrQ0FBd0IsQ0FBQyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMscUJBQVcsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDeEUsT0FBTyxJQUFJLDBCQUEwQixDQUFDLElBQUksOEJBQThCLENBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztTQUN0RjtLQUNKO0lBQ0QsT0FBTyxJQUFJLDRCQUE0QixDQUFDLElBQUksZ0NBQWdDLENBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztBQUMzRixDQUFDIiwiZmlsZSI6ImlwYy9yZWFkZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgRGF0YVR5cGUgfSBmcm9tICcuLi90eXBlJztcbmltcG9ydCB7IFZlY3RvciB9IGZyb20gJy4uL3ZlY3Rvcic7XG5pbXBvcnQgeyBNZXNzYWdlSGVhZGVyIH0gZnJvbSAnLi4vZW51bSc7XG5pbXBvcnQgeyBGb290ZXIgfSBmcm9tICcuL21ldGFkYXRhL2ZpbGUnO1xuaW1wb3J0IHsgU2NoZW1hLCBGaWVsZCB9IGZyb20gJy4uL3NjaGVtYSc7XG5pbXBvcnQgc3RyZWFtQWRhcHRlcnMgZnJvbSAnLi4vaW8vYWRhcHRlcnMnO1xuaW1wb3J0IHsgTWVzc2FnZSB9IGZyb20gJy4vbWV0YWRhdGEvbWVzc2FnZSc7XG5pbXBvcnQgeyBSZWNvcmRCYXRjaCB9IGZyb20gJy4uL3JlY29yZGJhdGNoJztcbmltcG9ydCAqIGFzIG1ldGFkYXRhIGZyb20gJy4vbWV0YWRhdGEvbWVzc2FnZSc7XG5pbXBvcnQgeyBBcnJheUJ1ZmZlclZpZXdJbnB1dCB9IGZyb20gJy4uL3V0aWwvYnVmZmVyJztcbmltcG9ydCB7IEJ5dGVTdHJlYW0sIEFzeW5jQnl0ZVN0cmVhbSB9IGZyb20gJy4uL2lvL3N0cmVhbSc7XG5pbXBvcnQgeyBSYW5kb21BY2Nlc3NGaWxlLCBBc3luY1JhbmRvbUFjY2Vzc0ZpbGUgfSBmcm9tICcuLi9pby9maWxlJztcbmltcG9ydCB7IFZlY3RvckxvYWRlciwgSlNPTlZlY3RvckxvYWRlciB9IGZyb20gJy4uL3Zpc2l0b3IvdmVjdG9ybG9hZGVyJztcbmltcG9ydCB7XG4gICAgRmlsZUhhbmRsZSxcbiAgICBBcnJvd0pTT05MaWtlLFxuICAgIElURVJBVE9SX0RPTkUsXG4gICAgUmVhZGFibGVJbnRlcm9wLFxufSBmcm9tICcuLi9pby9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgTWVzc2FnZVJlYWRlciwgQXN5bmNNZXNzYWdlUmVhZGVyLCBKU09OTWVzc2FnZVJlYWRlcixcbiAgICBjaGVja0Zvck1hZ2ljQXJyb3dTdHJpbmcsIG1hZ2ljTGVuZ3RoLCBtYWdpY0FuZFBhZGRpbmcsIG1hZ2ljWDJBbmRQYWRkaW5nXG59IGZyb20gJy4vbWVzc2FnZSc7XG5pbXBvcnQge1xuICAgIGlzUHJvbWlzZSxcbiAgICBpc0l0ZXJhYmxlLCBpc0FzeW5jSXRlcmFibGUsXG4gICAgaXNJdGVyYXRvclJlc3VsdCwgaXNBcnJvd0pTT04sXG4gICAgaXNGaWxlSGFuZGxlLCBpc0ZldGNoUmVzcG9uc2UsXG4gICAgaXNSZWFkYWJsZURPTVN0cmVhbSwgaXNSZWFkYWJsZU5vZGVTdHJlYW1cbn0gZnJvbSAnLi4vdXRpbC9jb21wYXQnO1xuXG4vKiogQGlnbm9yZSAqLyBleHBvcnQgdHlwZSBGcm9tQXJnMCA9IEFycm93SlNPTkxpa2U7XG4vKiogQGlnbm9yZSAqLyBleHBvcnQgdHlwZSBGcm9tQXJnMSA9IFByb21pc2VMaWtlPEFycm93SlNPTkxpa2U+O1xuLyoqIEBpZ25vcmUgKi8gZXhwb3J0IHR5cGUgRnJvbUFyZzIgPSBJdGVyYWJsZTxBcnJheUJ1ZmZlclZpZXdJbnB1dD4gfCBBcnJheUJ1ZmZlclZpZXdJbnB1dDtcbi8qKiBAaWdub3JlICovIGV4cG9ydCB0eXBlIEZyb21BcmczID0gUHJvbWlzZUxpa2U8SXRlcmFibGU8QXJyYXlCdWZmZXJWaWV3SW5wdXQ+IHwgQXJyYXlCdWZmZXJWaWV3SW5wdXQ+O1xuLyoqIEBpZ25vcmUgKi8gZXhwb3J0IHR5cGUgRnJvbUFyZzQgPSBSZXNwb25zZSB8IE5vZGVKUy5SZWFkYWJsZVN0cmVhbSB8IFJlYWRhYmxlU3RyZWFtPEFycmF5QnVmZmVyVmlld0lucHV0PiB8IEFzeW5jSXRlcmFibGU8QXJyYXlCdWZmZXJWaWV3SW5wdXQ+O1xuLyoqIEBpZ25vcmUgKi8gZXhwb3J0IHR5cGUgRnJvbUFyZzUgPSBGaWxlSGFuZGxlIHwgUHJvbWlzZUxpa2U8RmlsZUhhbmRsZT4gfCBQcm9taXNlTGlrZTxGcm9tQXJnND47XG4vKiogQGlnbm9yZSAqLyBleHBvcnQgdHlwZSBGcm9tQXJncyA9IEZyb21BcmcwIHwgRnJvbUFyZzEgfCBGcm9tQXJnMiB8IEZyb21BcmczIHwgRnJvbUFyZzQgfCBGcm9tQXJnNTtcblxuLyoqIEBpZ25vcmUgKi8gdHlwZSBPcGVuT3B0aW9ucyA9IHsgYXV0b0Rlc3Ryb3k/OiBib29sZWFuOyB9O1xuLyoqIEBpZ25vcmUgKi8gdHlwZSBSZWNvcmRCYXRjaFJlYWRlcnM8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gPSBSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4gfCBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPjtcbi8qKiBAaWdub3JlICovIHR5cGUgQXN5bmNSZWNvcmRCYXRjaFJlYWRlcnM8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gPSBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD47XG4vKiogQGlnbm9yZSAqLyB0eXBlIFJlY29yZEJhdGNoRmlsZVJlYWRlcnM8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gPSBSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4gfCBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcjxUPjtcbi8qKiBAaWdub3JlICovIHR5cGUgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJzPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+ID0gUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4gfCBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+O1xuXG5leHBvcnQgY2xhc3MgUmVjb3JkQmF0Y2hSZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWFkYWJsZUludGVyb3A8UmVjb3JkQmF0Y2g8VD4+IHtcblxuICAgIHByb3RlY3RlZCBfaW1wbDogUmVjb3JkQmF0Y2hSZWFkZXJJbXBsczxUPjtcbiAgICBwcm90ZWN0ZWQgY29uc3RydWN0b3IoaW1wbDogUmVjb3JkQmF0Y2hSZWFkZXJJbXBsczxUPikge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLl9pbXBsID0gaW1wbDtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0IGNsb3NlZCgpIHsgcmV0dXJuIHRoaXMuX2ltcGwuY2xvc2VkOyB9XG4gICAgcHVibGljIGdldCBzY2hlbWEoKSB7IHJldHVybiB0aGlzLl9pbXBsLnNjaGVtYTsgfVxuICAgIHB1YmxpYyBnZXQgYXV0b0Rlc3Ryb3koKSB7IHJldHVybiB0aGlzLl9pbXBsLmF1dG9EZXN0cm95OyB9XG4gICAgcHVibGljIGdldCBkaWN0aW9uYXJpZXMoKSB7IHJldHVybiB0aGlzLl9pbXBsLmRpY3Rpb25hcmllczsgfVxuICAgIHB1YmxpYyBnZXQgbnVtRGljdGlvbmFyaWVzKCkgeyByZXR1cm4gdGhpcy5faW1wbC5udW1EaWN0aW9uYXJpZXM7IH1cbiAgICBwdWJsaWMgZ2V0IG51bVJlY29yZEJhdGNoZXMoKSB7IHJldHVybiB0aGlzLl9pbXBsLm51bVJlY29yZEJhdGNoZXM7IH1cbiAgICBwdWJsaWMgZ2V0IGZvb3RlcigpIHsgcmV0dXJuIHRoaXMuX2ltcGwuaXNGaWxlKCkgPyB0aGlzLl9pbXBsLmZvb3RlciA6IG51bGw7IH1cblxuICAgIHB1YmxpYyBpc1N5bmMoKTogdGhpcyBpcyBSZWNvcmRCYXRjaFJlYWRlcnM8VD4geyByZXR1cm4gdGhpcy5faW1wbC5pc1N5bmMoKTsgfVxuICAgIHB1YmxpYyBpc0FzeW5jKCk6IHRoaXMgaXMgQXN5bmNSZWNvcmRCYXRjaFJlYWRlcnM8VD4geyByZXR1cm4gdGhpcy5faW1wbC5pc0FzeW5jKCk7IH1cbiAgICBwdWJsaWMgaXNGaWxlKCk6IHRoaXMgaXMgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyczxUPiB7IHJldHVybiB0aGlzLl9pbXBsLmlzRmlsZSgpOyB9XG4gICAgcHVibGljIGlzU3RyZWFtKCk6IHRoaXMgaXMgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJzPFQ+IHsgcmV0dXJuIHRoaXMuX2ltcGwuaXNTdHJlYW0oKTsgfVxuXG4gICAgcHVibGljIG5leHQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbXBsLm5leHQoKTtcbiAgICB9XG4gICAgcHVibGljIHRocm93KHZhbHVlPzogYW55KSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbXBsLnRocm93KHZhbHVlKTtcbiAgICB9XG4gICAgcHVibGljIHJldHVybih2YWx1ZT86IGFueSkge1xuICAgICAgICByZXR1cm4gdGhpcy5faW1wbC5yZXR1cm4odmFsdWUpO1xuICAgIH1cbiAgICBwdWJsaWMgY2FuY2VsKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5faW1wbC5jYW5jZWwoKTtcbiAgICB9XG4gICAgcHVibGljIHJlc2V0KHNjaGVtYT86IFNjaGVtYTxUPiB8IG51bGwpOiB0aGlzIHtcbiAgICAgICAgdGhpcy5faW1wbC5yZXNldChzY2hlbWEpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHVibGljIG9wZW4ob3B0aW9ucz86IE9wZW5PcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IG9wZW5pbmcgPSB0aGlzLl9pbXBsLm9wZW4ob3B0aW9ucyk7XG4gICAgICAgIHJldHVybiBpc1Byb21pc2Uob3BlbmluZykgPyBvcGVuaW5nLnRoZW4oKCkgPT4gdGhpcykgOiB0aGlzO1xuICAgIH1cbiAgICBwdWJsaWMgcmVhZFJlY29yZEJhdGNoKGluZGV4OiBudW1iZXIpOiBSZWNvcmRCYXRjaDxUPiB8IG51bGwgfCBQcm9taXNlPFJlY29yZEJhdGNoPFQ+IHwgbnVsbD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5faW1wbC5pc0ZpbGUoKSA/IHRoaXMuX2ltcGwucmVhZFJlY29yZEJhdGNoKGluZGV4KSA6IG51bGw7XG4gICAgfVxuICAgIHB1YmxpYyBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7XG4gICAgICAgIHJldHVybiAoPEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+PiB0aGlzLl9pbXBsKVtTeW1ib2wuaXRlcmF0b3JdKCk7XG4gICAgfVxuICAgIHB1YmxpYyBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4ge1xuICAgICAgICByZXR1cm4gKDxBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+PiB0aGlzLl9pbXBsKVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTtcbiAgICB9XG4gICAgcHVibGljIHRvRE9NU3RyZWFtKCkge1xuICAgICAgICByZXR1cm4gc3RyZWFtQWRhcHRlcnMudG9ET01TdHJlYW08UmVjb3JkQmF0Y2g8VD4+KFxuICAgICAgICAgICAgKHRoaXMuaXNTeW5jKClcbiAgICAgICAgICAgICAgICA/IHsgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IHRoaXMgfSBhcyBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj5cbiAgICAgICAgICAgICAgICA6IHsgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXTogKCkgPT4gdGhpcyB9IGFzIEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KSk7XG4gICAgfVxuICAgIHB1YmxpYyB0b05vZGVTdHJlYW0oKSB7XG4gICAgICAgIHJldHVybiBzdHJlYW1BZGFwdGVycy50b05vZGVTdHJlYW08UmVjb3JkQmF0Y2g8VD4+KFxuICAgICAgICAgICAgKHRoaXMuaXNTeW5jKClcbiAgICAgICAgICAgICAgICA/IHsgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IHRoaXMgfSBhcyBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj5cbiAgICAgICAgICAgICAgICA6IHsgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXTogKCkgPT4gdGhpcyB9IGFzIEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KSxcbiAgICAgICAgICAgIHsgb2JqZWN0TW9kZTogdHJ1ZSB9KTtcbiAgICB9XG5cbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIHN0YXRpYyB0aHJvdWdoTm9kZShvcHRpb25zPzogaW1wb3J0KCdzdHJlYW0nKS5EdXBsZXhPcHRpb25zICYgeyBhdXRvRGVzdHJveTogYm9vbGVhbiB9KTogaW1wb3J0KCdzdHJlYW0nKS5EdXBsZXgge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFwidGhyb3VnaE5vZGVcIiBub3QgYXZhaWxhYmxlIGluIHRoaXMgZW52aXJvbm1lbnRgKTtcbiAgICB9XG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyB0aHJvdWdoRE9NPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0+KFxuICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgIHdyaXRhYmxlU3RyYXRlZ3k/OiBCeXRlTGVuZ3RoUXVldWluZ1N0cmF0ZWd5LFxuICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgIHJlYWRhYmxlU3RyYXRlZ3k/OiB7IGF1dG9EZXN0cm95OiBib29sZWFuIH1cbiAgICApOiB7IHdyaXRhYmxlOiBXcml0YWJsZVN0cmVhbTxVaW50OEFycmF5PiwgcmVhZGFibGU6IFJlYWRhYmxlU3RyZWFtPFJlY29yZEJhdGNoPFQ+PiB9IHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBcInRocm91Z2hET01cIiBub3QgYXZhaWxhYmxlIGluIHRoaXMgZW52aXJvbm1lbnRgKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIFJlY29yZEJhdGNoUmVhZGVyPihzb3VyY2U6IFQpOiBUO1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IEZyb21BcmcwKTogUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogRnJvbUFyZzEpOiBQcm9taXNlPFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+PjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBGcm9tQXJnMik6IFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IEZyb21BcmczKTogUHJvbWlzZTxSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4gfCBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPj47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogRnJvbUFyZzQpOiBQcm9taXNlPFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IEFzeW5jUmVjb3JkQmF0Y2hSZWFkZXJzPFQ+PjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBGcm9tQXJnNSk6IFByb21pc2U8QXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4gfCBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+PjtcbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBhbnkpIHtcbiAgICAgICAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIFJlY29yZEJhdGNoUmVhZGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gc291cmNlO1xuICAgICAgICB9IGVsc2UgaWYgKGlzQXJyb3dKU09OKHNvdXJjZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmcm9tQXJyb3dKU09OPFQ+KHNvdXJjZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNGaWxlSGFuZGxlKHNvdXJjZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmcm9tRmlsZUhhbmRsZTxUPihzb3VyY2UpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzUHJvbWlzZTxhbnk+KHNvdXJjZSkpIHtcbiAgICAgICAgICAgIHJldHVybiAoYXN5bmMgKCkgPT4gYXdhaXQgUmVjb3JkQmF0Y2hSZWFkZXIuZnJvbTxhbnk+KGF3YWl0IHNvdXJjZSkpKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNGZXRjaFJlc3BvbnNlKHNvdXJjZSkgfHwgaXNSZWFkYWJsZURPTVN0cmVhbShzb3VyY2UpIHx8IGlzUmVhZGFibGVOb2RlU3RyZWFtKHNvdXJjZSkgfHwgaXNBc3luY0l0ZXJhYmxlKHNvdXJjZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmcm9tQXN5bmNCeXRlU3RyZWFtPFQ+KG5ldyBBc3luY0J5dGVTdHJlYW0oc291cmNlKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZyb21CeXRlU3RyZWFtPFQ+KG5ldyBCeXRlU3RyZWFtKHNvdXJjZSkpO1xuICAgIH1cblxuICAgIHB1YmxpYyBzdGF0aWMgcmVhZEFsbDxUIGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXI+KHNvdXJjZTogVCk6IFQgZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlcnMgPyBJdGVyYWJsZUl0ZXJhdG9yPFQ+IDogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFQ+O1xuICAgIHB1YmxpYyBzdGF0aWMgcmVhZEFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IEZyb21BcmcwKTogSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPj47XG4gICAgcHVibGljIHN0YXRpYyByZWFkQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogRnJvbUFyZzEpOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgcmVhZEFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IEZyb21BcmcyKTogSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4gfCBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPj47XG4gICAgcHVibGljIHN0YXRpYyByZWFkQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogRnJvbUFyZzMpOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgcmVhZEFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IEZyb21Bcmc0KTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IEFzeW5jUmVjb3JkQmF0Y2hSZWFkZXJzPFQ+PjtcbiAgICBwdWJsaWMgc3RhdGljIHJlYWRBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBGcm9tQXJnNSk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4+O1xuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgcmVhZEFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IGFueSkge1xuICAgICAgICBpZiAoc291cmNlIGluc3RhbmNlb2YgUmVjb3JkQmF0Y2hSZWFkZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBzb3VyY2UuaXNTeW5jKCkgPyByZWFkQWxsU3luYyhzb3VyY2UpIDogcmVhZEFsbEFzeW5jKHNvdXJjZSBhcyBBc3luY1JlY29yZEJhdGNoUmVhZGVyczxUPik7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBcnJvd0pTT04oc291cmNlKSB8fCBBcnJheUJ1ZmZlci5pc1ZpZXcoc291cmNlKSB8fCBpc0l0ZXJhYmxlPEFycmF5QnVmZmVyVmlld0lucHV0Pihzb3VyY2UpIHx8IGlzSXRlcmF0b3JSZXN1bHQoc291cmNlKSkge1xuICAgICAgICAgICAgcmV0dXJuIHJlYWRBbGxTeW5jPFQ+KHNvdXJjZSkgYXMgSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaFJlYWRlcnM8VD4+O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZWFkQWxsQXN5bmM8VD4oc291cmNlKSBhcyBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2hSZWFkZXJzPFQ+IHwgQXN5bmNSZWNvcmRCYXRjaFJlYWRlcnM8VD4+O1xuICAgIH1cbn1cblxuLy9cbi8vIFNpbmNlIFRTIGlzIGEgc3RydWN0dXJhbCB0eXBlIHN5c3RlbSwgd2UgZGVmaW5lIHRoZSBmb2xsb3dpbmcgc3ViY2xhc3Mgc3R1YnNcbi8vIHNvIHRoYXQgY29uY3JldGUgdHlwZXMgZXhpc3QgdG8gYXNzb2NpYXRlIHdpdGggd2l0aCB0aGUgaW50ZXJmYWNlcyBiZWxvdy5cbi8vXG4vLyBUaGUgaW1wbGVtZW50YXRpb24gZm9yIGVhY2ggUmVjb3JkQmF0Y2hSZWFkZXIgaXMgaGlkZGVuIGF3YXkgaW4gdGhlIHNldCBvZlxuLy8gYFJlY29yZEJhdGNoUmVhZGVySW1wbGAgY2xhc3NlcyBpbiB0aGUgc2Vjb25kIGhhbGYgb2YgdGhpcyBmaWxlLiBUaGlzIGFsbG93c1xuLy8gdXMgdG8gZXhwb3J0IGEgc2luZ2xlIFJlY29yZEJhdGNoUmVhZGVyIGNsYXNzLCBhbmQgc3dhcCBvdXQgdGhlIGltcGwgYmFzZWRcbi8vIG9uIHRoZSBpbyBwcmltaXRpdmVzIG9yIHVuZGVybHlpbmcgYXJyb3cgKEpTT04sIGZpbGUsIG9yIHN0cmVhbSkgYXQgcnVudGltZS5cbi8vXG4vLyBBc3luYy9hd2FpdCBtYWtlcyBvdXIgam9iIGEgYml0IGhhcmRlciwgc2luY2UgaXQgZm9yY2VzIGV2ZXJ5dGhpbmcgdG8gYmVcbi8vIGVpdGhlciBmdWxseSBzeW5jIG9yIGZ1bGx5IGFzeW5jLiBUaGlzIGlzIHdoeSB0aGUgbG9naWMgZm9yIHRoZSByZWFkZXIgaW1wbHNcbi8vIGhhcyBiZWVuIGR1cGxpY2F0ZWQgaW50byBib3RoIHN5bmMgYW5kIGFzeW5jIHZhcmlhbnRzLiBTaW5jZSB0aGUgUkJSXG4vLyBkZWxlZ2F0ZXMgdG8gaXRzIGltcGwsIGFuIFJCUiB3aXRoIGFuIEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbCBmb3Jcbi8vIGV4YW1wbGUgd2lsbCByZXR1cm4gYXN5bmMvYXdhaXQtZnJpZW5kbHkgUHJvbWlzZXMsIGJ1dCBvbmUgd2l0aCBhIChzeW5jKVxuLy8gUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsIHdpbGwgYWx3YXlzIHJldHVybiB2YWx1ZXMuIE5vdGhpbmcgc2hvdWxkIGJlXG4vLyBkaWZmZXJlbnQgYWJvdXQgdGhlaXIgbG9naWMsIGFzaWRlIGZyb20gdGhlIGFzeW5jIGhhbmRsaW5nLiBUaGlzIGlzIGFsc28gd2h5XG4vLyB0aGlzIGNvZGUgbG9va3MgaGlnaGx5IHN0cnVjdHVyZWQsIGFzIGl0IHNob3VsZCBiZSBuZWFybHkgaWRlbnRpY2FsIGFuZCBlYXN5XG4vLyB0byBmb2xsb3cuXG4vL1xuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXI8VD4ge1xuICAgIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBfaW1wbDogUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+KSB7IHN1cGVyIChfaW1wbCk7IH1cbiAgICBwdWJsaWMgW1N5bWJvbC5pdGVyYXRvcl0oKSB7IHJldHVybiAodGhpcy5faW1wbCBhcyBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PilbU3ltYm9sLml0ZXJhdG9yXSgpOyB9XG4gICAgcHVibGljIGFzeW5jICpbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4geyB5aWVsZCogdGhpc1tTeW1ib2wuaXRlcmF0b3JdKCk7IH1cbn1cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY2xhc3MgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoUmVhZGVyPFQ+IHtcbiAgICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgX2ltcGw6IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+KSB7IHN1cGVyIChfaW1wbCk7IH1cbiAgICBwdWJsaWMgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4geyB0aHJvdyBuZXcgRXJyb3IoYEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXIgaXMgbm90IEl0ZXJhYmxlYCk7IH1cbiAgICBwdWJsaWMgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpIHsgcmV0dXJuICh0aGlzLl9pbXBsIGFzIEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4pW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpOyB9XG59XG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+IHtcbiAgICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgX2ltcGw6IFJlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VD4pIHsgc3VwZXIgKF9pbXBsKTsgfVxufVxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjbGFzcyBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4ge1xuICAgIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBfaW1wbDogQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQ+KSB7IHN1cGVyIChfaW1wbCk7IH1cbn1cblxuLy9cbi8vIE5vdyBvdmVycmlkZSB0aGUgcmV0dXJuIHR5cGVzIGZvciBlYWNoIHN5bmMvYXN5bmMgUmVjb3JkQmF0Y2hSZWFkZXIgdmFyaWFudFxuLy9cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlcjxUPiB7XG4gICAgb3BlbihvcHRpb25zPzogT3Blbk9wdGlvbnMgfCB1bmRlZmluZWQpOiB0aGlzO1xuICAgIGNhbmNlbCgpOiB2b2lkO1xuICAgIHRocm93KHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8YW55PjtcbiAgICByZXR1cm4odmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxhbnk+O1xuICAgIG5leHQodmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxSZWNvcmRCYXRjaDxUPj47XG59XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgaW50ZXJmYWNlIEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlcjxUPiB7XG4gICAgb3BlbihvcHRpb25zPzogT3Blbk9wdGlvbnMgfCB1bmRlZmluZWQpOiBQcm9taXNlPHRoaXM+O1xuICAgIGNhbmNlbCgpOiBQcm9taXNlPHZvaWQ+O1xuICAgIHRocm93KHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxhbnk+PjtcbiAgICByZXR1cm4odmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+O1xuICAgIG5leHQodmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PFJlY29yZEJhdGNoPFQ+Pj47XG59XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgaW50ZXJmYWNlIFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+IHtcbiAgICBmb290ZXI6IEZvb3RlcjtcbiAgICByZWFkUmVjb3JkQmF0Y2goaW5kZXg6IG51bWJlcik6IFJlY29yZEJhdGNoPFQ+IHwgbnVsbDtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+IHtcbiAgICBmb290ZXI6IEZvb3RlcjtcbiAgICByZWFkUmVjb3JkQmF0Y2goaW5kZXg6IG51bWJlcik6IFByb21pc2U8UmVjb3JkQmF0Y2g8VD4gfCBudWxsPjtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbnR5cGUgUmVjb3JkQmF0Y2hSZWFkZXJJbXBsczxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiA9XG4gICAgIFJlY29yZEJhdGNoSlNPTlJlYWRlckltcGw8VD4gfFxuICAgICBSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQ+IHxcbiAgICAgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+IHxcbiAgICAgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQ+IHxcbiAgICAgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VD47XG5cbi8qKiBAaWdub3JlICovXG5pbnRlcmZhY2UgUmVjb3JkQmF0Y2hSZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IHtcblxuICAgIGNsb3NlZDogYm9vbGVhbjtcbiAgICBzY2hlbWE6IFNjaGVtYTxUPjtcbiAgICBhdXRvRGVzdHJveTogYm9vbGVhbjtcbiAgICBkaWN0aW9uYXJpZXM6IE1hcDxudW1iZXIsIFZlY3Rvcj47XG5cbiAgICBpc0ZpbGUoKTogdGhpcyBpcyBSZWNvcmRCYXRjaEZpbGVSZWFkZXJzPFQ+O1xuICAgIGlzU3RyZWFtKCk6IHRoaXMgaXMgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJzPFQ+O1xuICAgIGlzU3luYygpOiB0aGlzIGlzIFJlY29yZEJhdGNoUmVhZGVyczxUPjtcbiAgICBpc0FzeW5jKCk6IHRoaXMgaXMgQXN5bmNSZWNvcmRCYXRjaFJlYWRlcnM8VD47XG5cbiAgICByZXNldChzY2hlbWE/OiBTY2hlbWE8VD4gfCBudWxsKTogdGhpcztcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmludGVyZmFjZSBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlckltcGw8VD4ge1xuXG4gICAgb3BlbihvcHRpb25zPzogT3Blbk9wdGlvbnMpOiB0aGlzO1xuICAgIGNhbmNlbCgpOiB2b2lkO1xuXG4gICAgdGhyb3codmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxhbnk+O1xuICAgIHJldHVybih2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PGFueT47XG4gICAgbmV4dCh2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PFJlY29yZEJhdGNoPFQ+PjtcblxuICAgIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+O1xufVxuXG4vKiogQGlnbm9yZSAqL1xuaW50ZXJmYWNlIEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXJJbXBsPFQ+IHtcblxuICAgIG9wZW4ob3B0aW9ucz86IE9wZW5PcHRpb25zKTogUHJvbWlzZTx0aGlzPjtcbiAgICBjYW5jZWwoKTogUHJvbWlzZTx2b2lkPjtcblxuICAgIHRocm93KHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxhbnk+PjtcbiAgICByZXR1cm4odmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+O1xuICAgIG5leHQodmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PFJlY29yZEJhdGNoPFQ+Pj47XG5cbiAgICBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj47XG59XG5cbi8qKiBAaWdub3JlICovXG5pbnRlcmZhY2UgUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUPiB7XG4gICAgcmVhZFJlY29yZEJhdGNoKGluZGV4OiBudW1iZXIpOiBSZWNvcmRCYXRjaDxUPiB8IG51bGw7XG59XG5cbi8qKiBAaWdub3JlICovXG5pbnRlcmZhY2UgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VD4ge1xuICAgIHJlYWRSZWNvcmRCYXRjaChpbmRleDogbnVtYmVyKTogUHJvbWlzZTxSZWNvcmRCYXRjaDxUPiB8IG51bGw+O1xufVxuXG4vKiogQGlnbm9yZSAqL1xuYWJzdHJhY3QgY2xhc3MgUmVjb3JkQmF0Y2hSZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGltcGxlbWVudHMgUmVjb3JkQmF0Y2hSZWFkZXJJbXBsPFQ+IHtcblxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgc2NoZW1hOiBTY2hlbWE7XG4gICAgcHVibGljIGNsb3NlZCA9IGZhbHNlO1xuICAgIHB1YmxpYyBhdXRvRGVzdHJveSA9IHRydWU7XG4gICAgcHVibGljIGRpY3Rpb25hcmllczogTWFwPG51bWJlciwgVmVjdG9yPjtcblxuICAgIHByb3RlY3RlZCBfZGljdGlvbmFyeUluZGV4ID0gMDtcbiAgICBwcm90ZWN0ZWQgX3JlY29yZEJhdGNoSW5kZXggPSAwO1xuICAgIHB1YmxpYyBnZXQgbnVtRGljdGlvbmFyaWVzKCkgeyByZXR1cm4gdGhpcy5fZGljdGlvbmFyeUluZGV4OyB9XG4gICAgcHVibGljIGdldCBudW1SZWNvcmRCYXRjaGVzKCkgeyByZXR1cm4gdGhpcy5fcmVjb3JkQmF0Y2hJbmRleDsgfVxuXG4gICAgY29uc3RydWN0b3IoZGljdGlvbmFyaWVzID0gbmV3IE1hcDxudW1iZXIsIFZlY3Rvcj4oKSkge1xuICAgICAgICB0aGlzLmRpY3Rpb25hcmllcyA9IGRpY3Rpb25hcmllcztcbiAgICB9XG5cbiAgICBwdWJsaWMgaXNTeW5jKCk6IHRoaXMgaXMgUmVjb3JkQmF0Y2hSZWFkZXJzPFQ+IHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgcHVibGljIGlzQXN5bmMoKTogdGhpcyBpcyBBc3luY1JlY29yZEJhdGNoUmVhZGVyczxUPiB7IHJldHVybiBmYWxzZTsgfVxuICAgIHB1YmxpYyBpc0ZpbGUoKTogdGhpcyBpcyBSZWNvcmRCYXRjaEZpbGVSZWFkZXJzPFQ+IHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgcHVibGljIGlzU3RyZWFtKCk6IHRoaXMgaXMgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJzPFQ+IHsgcmV0dXJuIGZhbHNlOyB9XG5cbiAgICBwdWJsaWMgcmVzZXQoc2NoZW1hPzogU2NoZW1hPFQ+IHwgbnVsbCkge1xuICAgICAgICB0aGlzLl9kaWN0aW9uYXJ5SW5kZXggPSAwO1xuICAgICAgICB0aGlzLl9yZWNvcmRCYXRjaEluZGV4ID0gMDtcbiAgICAgICAgdGhpcy5zY2hlbWEgPSA8YW55PiBzY2hlbWE7XG4gICAgICAgIHRoaXMuZGljdGlvbmFyaWVzID0gbmV3IE1hcCgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX2xvYWRSZWNvcmRCYXRjaChoZWFkZXI6IG1ldGFkYXRhLlJlY29yZEJhdGNoLCBib2R5OiBhbnkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZWNvcmRCYXRjaDxUPih0aGlzLnNjaGVtYSwgaGVhZGVyLmxlbmd0aCwgdGhpcy5fbG9hZFZlY3RvcnMoaGVhZGVyLCBib2R5LCB0aGlzLnNjaGVtYS5maWVsZHMpKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIF9sb2FkRGljdGlvbmFyeUJhdGNoKGhlYWRlcjogbWV0YWRhdGEuRGljdGlvbmFyeUJhdGNoLCBib2R5OiBhbnkpIHtcbiAgICAgICAgY29uc3QgeyBpZCwgaXNEZWx0YSwgZGF0YSB9ID0gaGVhZGVyO1xuICAgICAgICBjb25zdCB7IGRpY3Rpb25hcmllcywgc2NoZW1hIH0gPSB0aGlzO1xuICAgICAgICBpZiAoaXNEZWx0YSB8fCAhZGljdGlvbmFyaWVzLmdldChpZCkpIHtcblxuICAgICAgICAgICAgY29uc3QgdHlwZSA9IHNjaGVtYS5kaWN0aW9uYXJpZXMuZ2V0KGlkKSE7XG4gICAgICAgICAgICBjb25zdCB2ZWN0b3IgPSAoaXNEZWx0YSA/IGRpY3Rpb25hcmllcy5nZXQoaWQpIS5jb25jYXQoXG4gICAgICAgICAgICAgICAgVmVjdG9yLm5ldyh0aGlzLl9sb2FkVmVjdG9ycyhkYXRhLCBib2R5LCBbdHlwZV0pWzBdKSkgOlxuICAgICAgICAgICAgICAgIFZlY3Rvci5uZXcodGhpcy5fbG9hZFZlY3RvcnMoZGF0YSwgYm9keSwgW3R5cGVdKVswXSkpIGFzIFZlY3RvcjtcblxuICAgICAgICAgICAgKHNjaGVtYS5kaWN0aW9uYXJ5RmllbGRzLmdldChpZCkgfHwgW10pLmZvckVhY2goKHsgdHlwZSB9KSA9PiB0eXBlLmRpY3Rpb25hcnlWZWN0b3IgPSB2ZWN0b3IpO1xuXG4gICAgICAgICAgICByZXR1cm4gdmVjdG9yO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkaWN0aW9uYXJpZXMuZ2V0KGlkKSE7XG4gICAgfVxuICAgIHByb3RlY3RlZCBfbG9hZFZlY3RvcnMoaGVhZGVyOiBtZXRhZGF0YS5SZWNvcmRCYXRjaCwgYm9keTogYW55LCB0eXBlczogKEZpZWxkIHwgRGF0YVR5cGUpW10pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWN0b3JMb2FkZXIoYm9keSwgaGVhZGVyLm5vZGVzLCBoZWFkZXIuYnVmZmVycykudmlzaXRNYW55KHR5cGVzKTtcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5jbGFzcyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlckltcGw8VD4gaW1wbGVtZW50cyBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7XG5cbiAgICBwcm90ZWN0ZWQgX3JlYWRlcjogTWVzc2FnZVJlYWRlcjtcbiAgICBwcm90ZWN0ZWQgX2hhbmRsZTogQnl0ZVN0cmVhbSB8IEFycm93SlNPTkxpa2U7XG5cbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEJ5dGVTdHJlYW0gfCBBcnJvd0pTT05MaWtlLCBkaWN0aW9uYXJpZXM/OiBNYXA8bnVtYmVyLCBWZWN0b3I+KSB7XG4gICAgICAgIHN1cGVyKGRpY3Rpb25hcmllcyk7XG4gICAgICAgIHRoaXMuX3JlYWRlciA9ICFpc0Fycm93SlNPTihzb3VyY2UpXG4gICAgICAgICAgICA/IG5ldyBNZXNzYWdlUmVhZGVyKHRoaXMuX2hhbmRsZSA9IHNvdXJjZSlcbiAgICAgICAgICAgIDogbmV3IEpTT05NZXNzYWdlUmVhZGVyKHRoaXMuX2hhbmRsZSA9IHNvdXJjZSk7XG4gICAgfVxuXG4gICAgcHVibGljIGlzU3luYygpOiB0aGlzIGlzIFJlY29yZEJhdGNoUmVhZGVyczxUPiB7IHJldHVybiB0cnVlOyB9XG4gICAgcHVibGljIGlzU3RyZWFtKCk6IHRoaXMgaXMgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJzPFQ+IHsgcmV0dXJuIHRydWU7IH1cbiAgICBwdWJsaWMgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4ge1xuICAgICAgICByZXR1cm4gdGhpcyBhcyBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PjtcbiAgICB9XG4gICAgcHVibGljIGNhbmNlbCgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiAodGhpcy5jbG9zZWQgPSB0cnVlKSkge1xuICAgICAgICAgICAgdGhpcy5yZXNldCgpLl9yZWFkZXIucmV0dXJuKCk7XG4gICAgICAgICAgICB0aGlzLl9yZWFkZXIgPSA8YW55PiBudWxsO1xuICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMgPSA8YW55PiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuICAgIHB1YmxpYyBvcGVuKG9wdGlvbnM/OiBPcGVuT3B0aW9ucykge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkKSB7XG4gICAgICAgICAgICB0aGlzLmF1dG9EZXN0cm95ID0gc2hvdWxkQXV0b0Rlc3Ryb3kodGhpcywgb3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAoISh0aGlzLnNjaGVtYSB8fCAodGhpcy5zY2hlbWEgPSB0aGlzLl9yZWFkZXIucmVhZFNjaGVtYSgpISkpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jYW5jZWwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHVibGljIHRocm93KHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8YW55PiB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQgJiYgdGhpcy5hdXRvRGVzdHJveSAmJiAodGhpcy5jbG9zZWQgPSB0cnVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVzZXQoKS5fcmVhZGVyLnRocm93KHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gSVRFUkFUT1JfRE9ORTtcbiAgICB9XG4gICAgcHVibGljIHJldHVybih2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PGFueT4ge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkICYmIHRoaXMuYXV0b0Rlc3Ryb3kgJiYgKHRoaXMuY2xvc2VkID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlc2V0KCkuX3JlYWRlci5yZXR1cm4odmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBJVEVSQVRPUl9ET05FO1xuICAgIH1cbiAgICBwdWJsaWMgbmV4dCgpOiBJdGVyYXRvclJlc3VsdDxSZWNvcmRCYXRjaDxUPj4ge1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpIHsgcmV0dXJuIElURVJBVE9SX0RPTkU7IH1cbiAgICAgICAgbGV0IG1lc3NhZ2U6IE1lc3NhZ2UgfCBudWxsLCB7IF9yZWFkZXI6IHJlYWRlciB9ID0gdGhpcztcbiAgICAgICAgd2hpbGUgKG1lc3NhZ2UgPSB0aGlzLl9yZWFkTmV4dE1lc3NhZ2VBbmRWYWxpZGF0ZSgpKSB7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5pc1NjaGVtYSgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXNldChtZXNzYWdlLmhlYWRlcigpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5pc1JlY29yZEJhdGNoKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZWNvcmRCYXRjaEluZGV4Kys7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSByZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkQmF0Y2ggPSB0aGlzLl9sb2FkUmVjb3JkQmF0Y2goaGVhZGVyLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IGRvbmU6IGZhbHNlLCB2YWx1ZTogcmVjb3JkQmF0Y2ggfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5pc0RpY3Rpb25hcnlCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZGljdGlvbmFyeUluZGV4Kys7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSByZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdmVjdG9yID0gdGhpcy5fbG9hZERpY3Rpb25hcnlCYXRjaChoZWFkZXIsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMuc2V0KGhlYWRlci5pZCwgdmVjdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5yZXR1cm4oKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIF9yZWFkTmV4dE1lc3NhZ2VBbmRWYWxpZGF0ZTxUIGV4dGVuZHMgTWVzc2FnZUhlYWRlcj4odHlwZT86IFQgfCBudWxsKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yZWFkZXIucmVhZE1lc3NhZ2U8VD4odHlwZSk7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuY2xhc3MgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlckltcGw8VD4gaW1wbGVtZW50cyBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHtcblxuICAgIHByb3RlY3RlZCBfaGFuZGxlOiBBc3luY0J5dGVTdHJlYW07XG4gICAgcHJvdGVjdGVkIF9yZWFkZXI6IEFzeW5jTWVzc2FnZVJlYWRlcjtcblxuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogQXN5bmNCeXRlU3RyZWFtLCBkaWN0aW9uYXJpZXM/OiBNYXA8bnVtYmVyLCBWZWN0b3I+KSB7XG4gICAgICAgIHN1cGVyKGRpY3Rpb25hcmllcyk7XG4gICAgICAgIHRoaXMuX3JlYWRlciA9IG5ldyBBc3luY01lc3NhZ2VSZWFkZXIodGhpcy5faGFuZGxlID0gc291cmNlKTtcbiAgICB9XG4gICAgcHVibGljIGlzQXN5bmMoKTogdGhpcyBpcyBBc3luY1JlY29yZEJhdGNoUmVhZGVyczxUPiB7IHJldHVybiB0cnVlOyB9XG4gICAgcHVibGljIGlzU3RyZWFtKCk6IHRoaXMgaXMgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJzPFQ+IHsgcmV0dXJuIHRydWU7IH1cbiAgICBwdWJsaWMgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMgYXMgQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PjtcbiAgICB9XG4gICAgcHVibGljIGFzeW5jIGNhbmNlbCgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiAodGhpcy5jbG9zZWQgPSB0cnVlKSkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5yZXNldCgpLl9yZWFkZXIucmV0dXJuKCk7XG4gICAgICAgICAgICB0aGlzLl9yZWFkZXIgPSA8YW55PiBudWxsO1xuICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMgPSA8YW55PiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyBvcGVuKG9wdGlvbnM/OiBPcGVuT3B0aW9ucykge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkKSB7XG4gICAgICAgICAgICB0aGlzLmF1dG9EZXN0cm95ID0gc2hvdWxkQXV0b0Rlc3Ryb3kodGhpcywgb3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAoISh0aGlzLnNjaGVtYSB8fCAodGhpcy5zY2hlbWEgPSAoYXdhaXQgdGhpcy5fcmVhZGVyLnJlYWRTY2hlbWEoKSkhKSkpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmNhbmNlbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgdGhyb3codmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+IHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiB0aGlzLmF1dG9EZXN0cm95ICYmICh0aGlzLmNsb3NlZCA9IHRydWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZXNldCgpLl9yZWFkZXIudGhyb3codmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBJVEVSQVRPUl9ET05FO1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgcmV0dXJuKHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxhbnk+PiB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQgJiYgdGhpcy5hdXRvRGVzdHJveSAmJiAodGhpcy5jbG9zZWQgPSB0cnVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVzZXQoKS5fcmVhZGVyLnJldHVybih2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIElURVJBVE9SX0RPTkU7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyBuZXh0KCkge1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpIHsgcmV0dXJuIElURVJBVE9SX0RPTkU7IH1cbiAgICAgICAgbGV0IG1lc3NhZ2U6IE1lc3NhZ2UgfCBudWxsLCB7IF9yZWFkZXI6IHJlYWRlciB9ID0gdGhpcztcbiAgICAgICAgd2hpbGUgKG1lc3NhZ2UgPSBhd2FpdCB0aGlzLl9yZWFkTmV4dE1lc3NhZ2VBbmRWYWxpZGF0ZSgpKSB7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5pc1NjaGVtYSgpKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5yZXNldChtZXNzYWdlLmhlYWRlcigpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5pc1JlY29yZEJhdGNoKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZWNvcmRCYXRjaEluZGV4Kys7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSBhd2FpdCByZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkQmF0Y2ggPSB0aGlzLl9sb2FkUmVjb3JkQmF0Y2goaGVhZGVyLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IGRvbmU6IGZhbHNlLCB2YWx1ZTogcmVjb3JkQmF0Y2ggfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5pc0RpY3Rpb25hcnlCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZGljdGlvbmFyeUluZGV4Kys7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSBhd2FpdCByZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdmVjdG9yID0gdGhpcy5fbG9hZERpY3Rpb25hcnlCYXRjaChoZWFkZXIsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMuc2V0KGhlYWRlci5pZCwgdmVjdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZXR1cm4oKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIGFzeW5jIF9yZWFkTmV4dE1lc3NhZ2VBbmRWYWxpZGF0ZTxUIGV4dGVuZHMgTWVzc2FnZUhlYWRlcj4odHlwZT86IFQgfCBudWxsKSB7XG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLl9yZWFkZXIucmVhZE1lc3NhZ2U8VD4odHlwZSk7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuY2xhc3MgUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUPiB7XG5cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHJvdGVjdGVkIF9mb290ZXI/OiBGb290ZXI7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHByb3RlY3RlZCBfaGFuZGxlOiBSYW5kb21BY2Nlc3NGaWxlO1xuICAgIHB1YmxpYyBnZXQgZm9vdGVyKCkgeyByZXR1cm4gdGhpcy5fZm9vdGVyITsgfVxuICAgIHB1YmxpYyBnZXQgbnVtRGljdGlvbmFyaWVzKCkgeyByZXR1cm4gdGhpcy5fZm9vdGVyID8gdGhpcy5fZm9vdGVyLm51bURpY3Rpb25hcmllcyA6IDA7IH1cbiAgICBwdWJsaWMgZ2V0IG51bVJlY29yZEJhdGNoZXMoKSB7IHJldHVybiB0aGlzLl9mb290ZXIgPyB0aGlzLl9mb290ZXIubnVtUmVjb3JkQmF0Y2hlcyA6IDA7IH1cblxuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogUmFuZG9tQWNjZXNzRmlsZSB8IEFycmF5QnVmZmVyVmlld0lucHV0LCBkaWN0aW9uYXJpZXM/OiBNYXA8bnVtYmVyLCBWZWN0b3I+KSB7XG4gICAgICAgIHN1cGVyKHNvdXJjZSBpbnN0YW5jZW9mIFJhbmRvbUFjY2Vzc0ZpbGUgPyBzb3VyY2UgOiBuZXcgUmFuZG9tQWNjZXNzRmlsZShzb3VyY2UpLCBkaWN0aW9uYXJpZXMpO1xuICAgIH1cbiAgICBwdWJsaWMgaXNTeW5jKCk6IHRoaXMgaXMgUmVjb3JkQmF0Y2hSZWFkZXJzPFQ+IHsgcmV0dXJuIHRydWU7IH1cbiAgICBwdWJsaWMgaXNGaWxlKCk6IHRoaXMgaXMgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyczxUPiB7IHJldHVybiB0cnVlOyB9XG4gICAgcHVibGljIG9wZW4ob3B0aW9ucz86IE9wZW5PcHRpb25zKSB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQgJiYgIXRoaXMuX2Zvb3Rlcikge1xuICAgICAgICAgICAgdGhpcy5zY2hlbWEgPSAodGhpcy5fZm9vdGVyID0gdGhpcy5fcmVhZEZvb3RlcigpKS5zY2hlbWE7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGJsb2NrIG9mIHRoaXMuX2Zvb3Rlci5kaWN0aW9uYXJ5QmF0Y2hlcygpKSB7XG4gICAgICAgICAgICAgICAgYmxvY2sgJiYgdGhpcy5fcmVhZERpY3Rpb25hcnlCYXRjaCh0aGlzLl9kaWN0aW9uYXJ5SW5kZXgrKyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN1cGVyLm9wZW4ob3B0aW9ucyk7XG4gICAgfVxuICAgIHB1YmxpYyByZWFkUmVjb3JkQmF0Y2goaW5kZXg6IG51bWJlcikge1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgICAgaWYgKCF0aGlzLl9mb290ZXIpIHsgdGhpcy5vcGVuKCk7IH1cbiAgICAgICAgY29uc3QgYmxvY2sgPSB0aGlzLl9mb290ZXIgJiYgdGhpcy5fZm9vdGVyLmdldFJlY29yZEJhdGNoKGluZGV4KTtcbiAgICAgICAgaWYgKGJsb2NrICYmIHRoaXMuX2hhbmRsZS5zZWVrKGJsb2NrLm9mZnNldCkpIHtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSB0aGlzLl9yZWFkZXIucmVhZE1lc3NhZ2UoTWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZSAmJiBtZXNzYWdlLmlzUmVjb3JkQmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IG1lc3NhZ2UuaGVhZGVyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gdGhpcy5fcmVhZGVyLnJlYWRNZXNzYWdlQm9keShtZXNzYWdlLmJvZHlMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZEJhdGNoID0gdGhpcy5fbG9hZFJlY29yZEJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVjb3JkQmF0Y2g7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHByb3RlY3RlZCBfcmVhZERpY3Rpb25hcnlCYXRjaChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGJsb2NrID0gdGhpcy5fZm9vdGVyICYmIHRoaXMuX2Zvb3Rlci5nZXREaWN0aW9uYXJ5QmF0Y2goaW5kZXgpO1xuICAgICAgICBpZiAoYmxvY2sgJiYgdGhpcy5faGFuZGxlLnNlZWsoYmxvY2sub2Zmc2V0KSkge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IHRoaXMuX3JlYWRlci5yZWFkTWVzc2FnZShNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZSAmJiBtZXNzYWdlLmlzRGljdGlvbmFyeUJhdGNoKCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBtZXNzYWdlLmhlYWRlcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IHRoaXMuX3JlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB2ZWN0b3IgPSB0aGlzLl9sb2FkRGljdGlvbmFyeUJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpY3Rpb25hcmllcy5zZXQoaGVhZGVyLmlkLCB2ZWN0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHByb3RlY3RlZCBfcmVhZEZvb3RlcigpIHtcbiAgICAgICAgY29uc3QgeyBfaGFuZGxlIH0gPSB0aGlzO1xuICAgICAgICBjb25zdCBvZmZzZXQgPSBfaGFuZGxlLnNpemUgLSBtYWdpY0FuZFBhZGRpbmc7XG4gICAgICAgIGNvbnN0IGxlbmd0aCA9IF9oYW5kbGUucmVhZEludDMyKG9mZnNldCk7XG4gICAgICAgIGNvbnN0IGJ1ZmZlciA9IF9oYW5kbGUucmVhZEF0KG9mZnNldCAtIGxlbmd0aCwgbGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIEZvb3Rlci5kZWNvZGUoYnVmZmVyKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIF9yZWFkTmV4dE1lc3NhZ2VBbmRWYWxpZGF0ZTxUIGV4dGVuZHMgTWVzc2FnZUhlYWRlcj4odHlwZT86IFQgfCBudWxsKTogTWVzc2FnZTxUPiB8IG51bGwge1xuICAgICAgICBpZiAoIXRoaXMuX2Zvb3RlcikgeyB0aGlzLm9wZW4oKTsgfVxuICAgICAgICBpZiAodGhpcy5fZm9vdGVyICYmIHRoaXMuX3JlY29yZEJhdGNoSW5kZXggPCB0aGlzLm51bVJlY29yZEJhdGNoZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGJsb2NrID0gdGhpcy5fZm9vdGVyICYmIHRoaXMuX2Zvb3Rlci5nZXRSZWNvcmRCYXRjaCh0aGlzLl9yZWNvcmRCYXRjaEluZGV4KTtcbiAgICAgICAgICAgIGlmIChibG9jayAmJiB0aGlzLl9oYW5kbGUuc2VlayhibG9jay5vZmZzZXQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JlYWRlci5yZWFkTWVzc2FnZSh0eXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5jbGFzcyBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUPlxuICAgIGltcGxlbWVudHMgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQ+IHtcblxuICAgIHByb3RlY3RlZCBfZm9vdGVyPzogRm9vdGVyO1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwcm90ZWN0ZWQgX2hhbmRsZTogQXN5bmNSYW5kb21BY2Nlc3NGaWxlO1xuICAgIHB1YmxpYyBnZXQgZm9vdGVyKCkgeyByZXR1cm4gdGhpcy5fZm9vdGVyITsgfVxuICAgIHB1YmxpYyBnZXQgbnVtRGljdGlvbmFyaWVzKCkgeyByZXR1cm4gdGhpcy5fZm9vdGVyID8gdGhpcy5fZm9vdGVyLm51bURpY3Rpb25hcmllcyA6IDA7IH1cbiAgICBwdWJsaWMgZ2V0IG51bVJlY29yZEJhdGNoZXMoKSB7IHJldHVybiB0aGlzLl9mb290ZXIgPyB0aGlzLl9mb290ZXIubnVtUmVjb3JkQmF0Y2hlcyA6IDA7IH1cblxuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogRmlsZUhhbmRsZSwgYnl0ZUxlbmd0aD86IG51bWJlciwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgVmVjdG9yPik7XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBGaWxlSGFuZGxlIHwgQXN5bmNSYW5kb21BY2Nlc3NGaWxlLCBkaWN0aW9uYXJpZXM/OiBNYXA8bnVtYmVyLCBWZWN0b3I+KTtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEZpbGVIYW5kbGUgfCBBc3luY1JhbmRvbUFjY2Vzc0ZpbGUsIC4uLnJlc3Q6IGFueVtdKSB7XG4gICAgICAgIGNvbnN0IGJ5dGVMZW5ndGggPSB0eXBlb2YgcmVzdFswXSAhPT0gJ251bWJlcicgPyA8bnVtYmVyPiByZXN0LnNoaWZ0KCkgOiB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGRpY3Rpb25hcmllcyA9IHJlc3RbMF0gaW5zdGFuY2VvZiBNYXAgPyA8TWFwPG51bWJlciwgVmVjdG9yPj4gcmVzdC5zaGlmdCgpIDogdW5kZWZpbmVkO1xuICAgICAgICBzdXBlcihzb3VyY2UgaW5zdGFuY2VvZiBBc3luY1JhbmRvbUFjY2Vzc0ZpbGUgPyBzb3VyY2UgOiBuZXcgQXN5bmNSYW5kb21BY2Nlc3NGaWxlKHNvdXJjZSwgYnl0ZUxlbmd0aCksIGRpY3Rpb25hcmllcyk7XG4gICAgfVxuICAgIHB1YmxpYyBpc0ZpbGUoKTogdGhpcyBpcyBSZWNvcmRCYXRjaEZpbGVSZWFkZXJzPFQ+IHsgcmV0dXJuIHRydWU7IH1cbiAgICBwdWJsaWMgaXNBc3luYygpOiB0aGlzIGlzIEFzeW5jUmVjb3JkQmF0Y2hSZWFkZXJzPFQ+IHsgcmV0dXJuIHRydWU7IH1cbiAgICBwdWJsaWMgYXN5bmMgb3BlbihvcHRpb25zPzogT3Blbk9wdGlvbnMpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiAhdGhpcy5fZm9vdGVyKSB7XG4gICAgICAgICAgICB0aGlzLnNjaGVtYSA9ICh0aGlzLl9mb290ZXIgPSBhd2FpdCB0aGlzLl9yZWFkRm9vdGVyKCkpLnNjaGVtYTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgYmxvY2sgb2YgdGhpcy5fZm9vdGVyLmRpY3Rpb25hcnlCYXRjaGVzKCkpIHtcbiAgICAgICAgICAgICAgICBibG9jayAmJiBhd2FpdCB0aGlzLl9yZWFkRGljdGlvbmFyeUJhdGNoKHRoaXMuX2RpY3Rpb25hcnlJbmRleCsrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXdhaXQgc3VwZXIub3BlbihvcHRpb25zKTtcbiAgICB9XG4gICAgcHVibGljIGFzeW5jIHJlYWRSZWNvcmRCYXRjaChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIGlmICh0aGlzLmNsb3NlZCkgeyByZXR1cm4gbnVsbDsgfVxuICAgICAgICBpZiAoIXRoaXMuX2Zvb3RlcikgeyBhd2FpdCB0aGlzLm9wZW4oKTsgfVxuICAgICAgICBjb25zdCBibG9jayA9IHRoaXMuX2Zvb3RlciAmJiB0aGlzLl9mb290ZXIuZ2V0UmVjb3JkQmF0Y2goaW5kZXgpO1xuICAgICAgICBpZiAoYmxvY2sgJiYgKGF3YWl0IHRoaXMuX2hhbmRsZS5zZWVrKGJsb2NrLm9mZnNldCkpKSB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gYXdhaXQgdGhpcy5fcmVhZGVyLnJlYWRNZXNzYWdlKE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2gpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UgJiYgbWVzc2FnZS5pc1JlY29yZEJhdGNoKCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBtZXNzYWdlLmhlYWRlcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IGF3YWl0IHRoaXMuX3JlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRCYXRjaCA9IHRoaXMuX2xvYWRSZWNvcmRCYXRjaChoZWFkZXIsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlY29yZEJhdGNoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgYXN5bmMgX3JlYWREaWN0aW9uYXJ5QmF0Y2goaW5kZXg6IG51bWJlcikge1xuICAgICAgICBjb25zdCBibG9jayA9IHRoaXMuX2Zvb3RlciAmJiB0aGlzLl9mb290ZXIuZ2V0RGljdGlvbmFyeUJhdGNoKGluZGV4KTtcbiAgICAgICAgaWYgKGJsb2NrICYmIChhd2FpdCB0aGlzLl9oYW5kbGUuc2VlayhibG9jay5vZmZzZXQpKSkge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGF3YWl0IHRoaXMuX3JlYWRlci5yZWFkTWVzc2FnZShNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZSAmJiBtZXNzYWdlLmlzRGljdGlvbmFyeUJhdGNoKCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBtZXNzYWdlLmhlYWRlcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IGF3YWl0IHRoaXMuX3JlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB2ZWN0b3IgPSB0aGlzLl9sb2FkRGljdGlvbmFyeUJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpY3Rpb25hcmllcy5zZXQoaGVhZGVyLmlkLCB2ZWN0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHByb3RlY3RlZCBhc3luYyBfcmVhZEZvb3RlcigpIHtcbiAgICAgICAgY29uc3QgeyBfaGFuZGxlIH0gPSB0aGlzO1xuICAgICAgICBfaGFuZGxlLl9wZW5kaW5nICYmIGF3YWl0IF9oYW5kbGUuX3BlbmRpbmc7XG4gICAgICAgIGNvbnN0IG9mZnNldCA9IF9oYW5kbGUuc2l6ZSAtIG1hZ2ljQW5kUGFkZGluZztcbiAgICAgICAgY29uc3QgbGVuZ3RoID0gYXdhaXQgX2hhbmRsZS5yZWFkSW50MzIob2Zmc2V0KTtcbiAgICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgX2hhbmRsZS5yZWFkQXQob2Zmc2V0IC0gbGVuZ3RoLCBsZW5ndGgpO1xuICAgICAgICByZXR1cm4gRm9vdGVyLmRlY29kZShidWZmZXIpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgYXN5bmMgX3JlYWROZXh0TWVzc2FnZUFuZFZhbGlkYXRlPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyPih0eXBlPzogVCB8IG51bGwpOiBQcm9taXNlPE1lc3NhZ2U8VD4gfCBudWxsPiB7XG4gICAgICAgIGlmICghdGhpcy5fZm9vdGVyKSB7IGF3YWl0IHRoaXMub3BlbigpOyB9XG4gICAgICAgIGlmICh0aGlzLl9mb290ZXIgJiYgdGhpcy5fcmVjb3JkQmF0Y2hJbmRleCA8IHRoaXMubnVtUmVjb3JkQmF0Y2hlcykge1xuICAgICAgICAgICAgY29uc3QgYmxvY2sgPSB0aGlzLl9mb290ZXIuZ2V0UmVjb3JkQmF0Y2godGhpcy5fcmVjb3JkQmF0Y2hJbmRleCk7XG4gICAgICAgICAgICBpZiAoYmxvY2sgJiYgYXdhaXQgdGhpcy5faGFuZGxlLnNlZWsoYmxvY2sub2Zmc2V0KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLl9yZWFkZXIucmVhZE1lc3NhZ2UodHlwZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuY2xhc3MgUmVjb3JkQmF0Y2hKU09OUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUPiB7XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBBcnJvd0pTT05MaWtlLCBkaWN0aW9uYXJpZXM/OiBNYXA8bnVtYmVyLCBWZWN0b3I+KSB7XG4gICAgICAgIHN1cGVyKHNvdXJjZSwgZGljdGlvbmFyaWVzKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIF9sb2FkVmVjdG9ycyhoZWFkZXI6IG1ldGFkYXRhLlJlY29yZEJhdGNoLCBib2R5OiBhbnksIHR5cGVzOiAoRmllbGQgfCBEYXRhVHlwZSlbXSkge1xuICAgICAgICByZXR1cm4gbmV3IEpTT05WZWN0b3JMb2FkZXIoYm9keSwgaGVhZGVyLm5vZGVzLCBoZWFkZXIuYnVmZmVycykudmlzaXRNYW55KHR5cGVzKTtcbiAgICB9XG59XG5cbi8vXG4vLyBEZWZpbmUgc29tZSBoZWxwZXIgZnVuY3Rpb25zIGFuZCBzdGF0aWMgaW1wbGVtZW50YXRpb25zIGRvd24gaGVyZS4gVGhlcmUnc1xuLy8gYSBiaXQgb2YgYnJhbmNoaW5nIGluIHRoZSBzdGF0aWMgbWV0aG9kcyB0aGF0IGNhbiBsZWFkIHRvIHRoZSBzYW1lIHJvdXRpbmVzXG4vLyBiZWluZyBleGVjdXRlZCwgc28gd2UndmUgYnJva2VuIHRob3NlIG91dCBoZXJlIGZvciByZWFkYWJpbGl0eS5cbi8vXG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBzaG91bGRBdXRvRGVzdHJveShzZWxmOiB7IGF1dG9EZXN0cm95OiBib29sZWFuIH0sIG9wdGlvbnM/OiBPcGVuT3B0aW9ucykge1xuICAgIHJldHVybiBvcHRpb25zICYmICh0eXBlb2Ygb3B0aW9uc1snYXV0b0Rlc3Ryb3knXSA9PT0gJ2Jvb2xlYW4nKSA/IG9wdGlvbnNbJ2F1dG9EZXN0cm95J10gOiBzZWxmWydhdXRvRGVzdHJveSddO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24qIHJlYWRBbGxTeW5jPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogUmVjb3JkQmF0Y2hSZWFkZXJzPFQ+IHwgRnJvbUFyZzAgfCBGcm9tQXJnMikge1xuICAgIGNvbnN0IHJlYWRlciA9IFJlY29yZEJhdGNoUmVhZGVyLmZyb208VD4oPGFueT4gc291cmNlKSBhcyBSZWNvcmRCYXRjaFJlYWRlcnM8VD47XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKCFyZWFkZXIub3Blbih7IGF1dG9EZXN0cm95OiBmYWxzZSB9KS5jbG9zZWQpIHtcbiAgICAgICAgICAgIGRvIHsgeWllbGQgcmVhZGVyOyB9IHdoaWxlICghKHJlYWRlci5yZXNldCgpLm9wZW4oKSkuY2xvc2VkKTtcbiAgICAgICAgfVxuICAgIH0gZmluYWxseSB7IHJlYWRlci5jYW5jZWwoKTsgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuYXN5bmMgZnVuY3Rpb24qIHJlYWRBbGxBc3luYzxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IEFzeW5jUmVjb3JkQmF0Y2hSZWFkZXJzPFQ+IHwgRnJvbUFyZzEgfCBGcm9tQXJnMyB8IEZyb21Bcmc0IHwgRnJvbUFyZzUpIHtcbiAgICBjb25zdCByZWFkZXIgPSBhd2FpdCBSZWNvcmRCYXRjaFJlYWRlci5mcm9tPFQ+KDxhbnk+IHNvdXJjZSkgYXMgUmVjb3JkQmF0Y2hSZWFkZXI8VD47XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKCEoYXdhaXQgcmVhZGVyLm9wZW4oeyBhdXRvRGVzdHJveTogZmFsc2UgfSkpLmNsb3NlZCkge1xuICAgICAgICAgICAgZG8geyB5aWVsZCByZWFkZXI7IH0gd2hpbGUgKCEoYXdhaXQgcmVhZGVyLnJlc2V0KCkub3BlbigpKS5jbG9zZWQpO1xuICAgICAgICB9XG4gICAgfSBmaW5hbGx5IHsgYXdhaXQgcmVhZGVyLmNhbmNlbCgpOyB9XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBmcm9tQXJyb3dKU09OPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0+KHNvdXJjZTogQXJyb3dKU09OTGlrZSkge1xuICAgIHJldHVybiBuZXcgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXIobmV3IFJlY29yZEJhdGNoSlNPTlJlYWRlckltcGw8VD4oc291cmNlKSk7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBmcm9tQnl0ZVN0cmVhbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9Pihzb3VyY2U6IEJ5dGVTdHJlYW0pIHtcbiAgICBjb25zdCBieXRlcyA9IHNvdXJjZS5wZWVrKChtYWdpY0xlbmd0aCArIDcpICYgfjcpO1xuICAgIHJldHVybiBieXRlcyAmJiBieXRlcy5ieXRlTGVuZ3RoID49IDQgPyAhY2hlY2tGb3JNYWdpY0Fycm93U3RyaW5nKGJ5dGVzKVxuICAgICAgICA/IG5ldyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcihuZXcgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+KHNvdXJjZSkpXG4gICAgICAgIDogbmV3IFJlY29yZEJhdGNoRmlsZVJlYWRlcihuZXcgUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUPihzb3VyY2UucmVhZCgpKSlcbiAgICAgICAgOiBuZXcgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXIobmV3IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUPihmdW5jdGlvbiooKTogYW55IHt9KCkpKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmFzeW5jIGZ1bmN0aW9uIGZyb21Bc3luY0J5dGVTdHJlYW08VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfT4oc291cmNlOiBBc3luY0J5dGVTdHJlYW0pIHtcbiAgICBjb25zdCBieXRlcyA9IGF3YWl0IHNvdXJjZS5wZWVrKChtYWdpY0xlbmd0aCArIDcpICYgfjcpO1xuICAgIHJldHVybiBieXRlcyAmJiBieXRlcy5ieXRlTGVuZ3RoID49IDQgPyAhY2hlY2tGb3JNYWdpY0Fycm93U3RyaW5nKGJ5dGVzKVxuICAgICAgICA/IG5ldyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyKG5ldyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUPihzb3VyY2UpKVxuICAgICAgICA6IG5ldyBSZWNvcmRCYXRjaEZpbGVSZWFkZXIobmV3IFJlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VD4oYXdhaXQgc291cmNlLnJlYWQoKSkpXG4gICAgICAgIDogbmV3IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXIobmV3IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+KGFzeW5jIGZ1bmN0aW9uKigpOiBhbnkge30oKSkpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuYXN5bmMgZnVuY3Rpb24gZnJvbUZpbGVIYW5kbGU8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfT4oc291cmNlOiBGaWxlSGFuZGxlKSB7XG4gICAgY29uc3QgeyBzaXplIH0gPSBhd2FpdCBzb3VyY2Uuc3RhdCgpO1xuICAgIGNvbnN0IGZpbGUgPSBuZXcgQXN5bmNSYW5kb21BY2Nlc3NGaWxlKHNvdXJjZSwgc2l6ZSk7XG4gICAgaWYgKHNpemUgPj0gbWFnaWNYMkFuZFBhZGRpbmcpIHtcbiAgICAgICAgaWYgKGNoZWNrRm9yTWFnaWNBcnJvd1N0cmluZyhhd2FpdCBmaWxlLnJlYWRBdCgwLCAobWFnaWNMZW5ndGggKyA3KSAmIH43KSkpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXIobmV3IEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUPihmaWxlKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ldyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyKG5ldyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUPihmaWxlKSk7XG59XG4iXX0=

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
            return (() => tslib_1.__awaiter(this, void 0, void 0, function* () { return yield RecordBatchReader.from(yield source); }))();
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
    [Symbol.asyncIterator]() { return tslib_1.__asyncGenerator(this, arguments, function* _a() { yield tslib_1.__await(yield* tslib_1.__asyncDelegator(tslib_1.__asyncValues(this[Symbol.iterator]()))); }); }
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
    cancel() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!this.closed && (this.closed = true)) {
                yield this.reset()._reader.return();
                this._reader = null;
                this.dictionaries = null;
            }
        });
    }
    open(options) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!this.closed) {
                this.autoDestroy = shouldAutoDestroy(this, options);
                if (!(this.schema || (this.schema = (yield this._reader.readSchema())))) {
                    yield this.cancel();
                }
            }
            return this;
        });
    }
    throw(value) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!this.closed && this.autoDestroy && (this.closed = true)) {
                return yield this.reset()._reader.throw(value);
            }
            return interfaces_1.ITERATOR_DONE;
        });
    }
    return(value) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!this.closed && this.autoDestroy && (this.closed = true)) {
                return yield this.reset()._reader.return(value);
            }
            return interfaces_1.ITERATOR_DONE;
        });
    }
    next() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (this.closed) {
                return interfaces_1.ITERATOR_DONE;
            }
            let message, { _reader: reader } = this;
            while (message = yield this._readNextMessageAndValidate()) {
                if (message.isSchema()) {
                    yield this.reset(message.header());
                }
                else if (message.isRecordBatch()) {
                    this._recordBatchIndex++;
                    const header = message.header();
                    const buffer = yield reader.readMessageBody(message.bodyLength);
                    const recordBatch = this._loadRecordBatch(header, buffer);
                    return { done: false, value: recordBatch };
                }
                else if (message.isDictionaryBatch()) {
                    this._dictionaryIndex++;
                    const header = message.header();
                    const buffer = yield reader.readMessageBody(message.bodyLength);
                    const vector = this._loadDictionaryBatch(header, buffer);
                    this.dictionaries.set(header.id, vector);
                }
            }
            return yield this.return();
        });
    }
    _readNextMessageAndValidate(type) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield this._reader.readMessage(type);
        });
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
    open(options) {
        const _super = Object.create(null, {
            open: { get: () => super.open }
        });
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!this.closed && !this._footer) {
                this.schema = (this._footer = yield this._readFooter()).schema;
                for (const block of this._footer.dictionaryBatches()) {
                    block && (yield this._readDictionaryBatch(this._dictionaryIndex++));
                }
            }
            return yield _super.open.call(this, options);
        });
    }
    readRecordBatch(index) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (this.closed) {
                return null;
            }
            if (!this._footer) {
                yield this.open();
            }
            const block = this._footer && this._footer.getRecordBatch(index);
            if (block && (yield this._handle.seek(block.offset))) {
                const message = yield this._reader.readMessage(enum_1.MessageHeader.RecordBatch);
                if (message && message.isRecordBatch()) {
                    const header = message.header();
                    const buffer = yield this._reader.readMessageBody(message.bodyLength);
                    const recordBatch = this._loadRecordBatch(header, buffer);
                    return recordBatch;
                }
            }
            return null;
        });
    }
    _readDictionaryBatch(index) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const block = this._footer && this._footer.getDictionaryBatch(index);
            if (block && (yield this._handle.seek(block.offset))) {
                const message = yield this._reader.readMessage(enum_1.MessageHeader.DictionaryBatch);
                if (message && message.isDictionaryBatch()) {
                    const header = message.header();
                    const buffer = yield this._reader.readMessageBody(message.bodyLength);
                    const vector = this._loadDictionaryBatch(header, buffer);
                    this.dictionaries.set(header.id, vector);
                }
            }
        });
    }
    _readFooter() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const { _handle } = this;
            _handle._pending && (yield _handle._pending);
            const offset = _handle.size - message_1.magicAndPadding;
            const length = yield _handle.readInt32(offset);
            const buffer = yield _handle.readAt(offset - length, length);
            return file_1.Footer.decode(buffer);
        });
    }
    _readNextMessageAndValidate(type) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!this._footer) {
                yield this.open();
            }
            if (this._footer && this._recordBatchIndex < this.numRecordBatches) {
                const block = this._footer.getRecordBatch(this._recordBatchIndex);
                if (block && (yield this._handle.seek(block.offset))) {
                    return yield this._reader.readMessage(type);
                }
            }
            return null;
        });
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
function readAllAsync(source) {
    return tslib_1.__asyncGenerator(this, arguments, function* readAllAsync_1() {
        const reader = yield tslib_1.__await(RecordBatchReader.from(source));
        try {
            if (!(yield tslib_1.__await(reader.open({ autoDestroy: false }))).closed) {
                do {
                    yield yield tslib_1.__await(reader);
                } while (!(yield tslib_1.__await(reader.reset().open())).closed);
            }
        }
        finally {
            yield tslib_1.__await(reader.cancel());
        }
    });
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
function fromAsyncByteStream(source) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const bytes = yield source.peek((message_1.magicLength + 7) & ~7);
        return bytes && bytes.byteLength >= 4 ? !message_1.checkForMagicArrowString(bytes)
            ? new AsyncRecordBatchStreamReader(new AsyncRecordBatchStreamReaderImpl(source))
            : new RecordBatchFileReader(new RecordBatchFileReaderImpl(yield source.read()))
            : new AsyncRecordBatchStreamReader(new AsyncRecordBatchStreamReaderImpl(function () { return tslib_1.__asyncGenerator(this, arguments, function* () { }); }()));
    });
}
/** @ignore */
function fromFileHandle(source) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const { size } = yield source.stat();
        const file = new file_2.AsyncRandomAccessFile(source, size);
        if (size >= message_1.magicX2AndPadding) {
            if (message_1.checkForMagicArrowString(yield file.readAt(0, (message_1.magicLength + 7) & ~7))) {
                return new AsyncRecordBatchFileReader(new AsyncRecordBatchFileReaderImpl(file));
            }
        }
        return new AsyncRecordBatchStreamReader(new AsyncRecordBatchStreamReaderImpl(file));
    });
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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eEQsT0FBTyxLQUFLLElBQUksS0FBSyxDQUFDLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsa0NBQXdCLENBQUMsS0FBSyxDQUFDO1lBQ3BFLENBQUMsQ0FBQyxJQUFJLDRCQUE0QixDQUFDLElBQUksZ0NBQWdDLENBQUksTUFBTSxDQUFDLENBQUM7WUFDbkYsQ0FBQyxDQUFDLElBQUkscUJBQXFCLENBQUMsSUFBSSx5QkFBeUIsQ0FBSSxNQUFNLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ2xGLENBQUMsQ0FBQyxJQUFJLDRCQUE0QixDQUFDLElBQUksZ0NBQWdDLENBQUksOEVBQXdCLENBQUMsSUFBQSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2pILENBQUM7Q0FBQTtBQUVELGNBQWM7QUFDZCxTQUFlLGNBQWMsQ0FBd0MsTUFBa0I7O1FBQ25GLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxNQUFNLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNyQyxNQUFNLElBQUksR0FBRyxJQUFJLDRCQUFxQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNyRCxJQUFJLElBQUksSUFBSSwyQkFBaUIsRUFBRTtZQUMzQixJQUFJLGtDQUF3QixDQUFDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxxQkFBVyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDeEUsT0FBTyxJQUFJLDBCQUEwQixDQUFDLElBQUksOEJBQThCLENBQUksSUFBSSxDQUFDLENBQUMsQ0FBQzthQUN0RjtTQUNKO1FBQ0QsT0FBTyxJQUFJLDRCQUE0QixDQUFDLElBQUksZ0NBQWdDLENBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMzRixDQUFDO0NBQUEiLCJmaWxlIjoiaXBjL3JlYWRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBEYXRhVHlwZSB9IGZyb20gJy4uL3R5cGUnO1xuaW1wb3J0IHsgVmVjdG9yIH0gZnJvbSAnLi4vdmVjdG9yJztcbmltcG9ydCB7IE1lc3NhZ2VIZWFkZXIgfSBmcm9tICcuLi9lbnVtJztcbmltcG9ydCB7IEZvb3RlciB9IGZyb20gJy4vbWV0YWRhdGEvZmlsZSc7XG5pbXBvcnQgeyBTY2hlbWEsIEZpZWxkIH0gZnJvbSAnLi4vc2NoZW1hJztcbmltcG9ydCBzdHJlYW1BZGFwdGVycyBmcm9tICcuLi9pby9hZGFwdGVycyc7XG5pbXBvcnQgeyBNZXNzYWdlIH0gZnJvbSAnLi9tZXRhZGF0YS9tZXNzYWdlJztcbmltcG9ydCB7IFJlY29yZEJhdGNoIH0gZnJvbSAnLi4vcmVjb3JkYmF0Y2gnO1xuaW1wb3J0ICogYXMgbWV0YWRhdGEgZnJvbSAnLi9tZXRhZGF0YS9tZXNzYWdlJztcbmltcG9ydCB7IEFycmF5QnVmZmVyVmlld0lucHV0IH0gZnJvbSAnLi4vdXRpbC9idWZmZXInO1xuaW1wb3J0IHsgQnl0ZVN0cmVhbSwgQXN5bmNCeXRlU3RyZWFtIH0gZnJvbSAnLi4vaW8vc3RyZWFtJztcbmltcG9ydCB7IFJhbmRvbUFjY2Vzc0ZpbGUsIEFzeW5jUmFuZG9tQWNjZXNzRmlsZSB9IGZyb20gJy4uL2lvL2ZpbGUnO1xuaW1wb3J0IHsgVmVjdG9yTG9hZGVyLCBKU09OVmVjdG9yTG9hZGVyIH0gZnJvbSAnLi4vdmlzaXRvci92ZWN0b3Jsb2FkZXInO1xuaW1wb3J0IHtcbiAgICBGaWxlSGFuZGxlLFxuICAgIEFycm93SlNPTkxpa2UsXG4gICAgSVRFUkFUT1JfRE9ORSxcbiAgICBSZWFkYWJsZUludGVyb3AsXG59IGZyb20gJy4uL2lvL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBNZXNzYWdlUmVhZGVyLCBBc3luY01lc3NhZ2VSZWFkZXIsIEpTT05NZXNzYWdlUmVhZGVyLFxuICAgIGNoZWNrRm9yTWFnaWNBcnJvd1N0cmluZywgbWFnaWNMZW5ndGgsIG1hZ2ljQW5kUGFkZGluZywgbWFnaWNYMkFuZFBhZGRpbmdcbn0gZnJvbSAnLi9tZXNzYWdlJztcbmltcG9ydCB7XG4gICAgaXNQcm9taXNlLFxuICAgIGlzSXRlcmFibGUsIGlzQXN5bmNJdGVyYWJsZSxcbiAgICBpc0l0ZXJhdG9yUmVzdWx0LCBpc0Fycm93SlNPTixcbiAgICBpc0ZpbGVIYW5kbGUsIGlzRmV0Y2hSZXNwb25zZSxcbiAgICBpc1JlYWRhYmxlRE9NU3RyZWFtLCBpc1JlYWRhYmxlTm9kZVN0cmVhbVxufSBmcm9tICcuLi91dGlsL2NvbXBhdCc7XG5cbi8qKiBAaWdub3JlICovIGV4cG9ydCB0eXBlIEZyb21BcmcwID0gQXJyb3dKU09OTGlrZTtcbi8qKiBAaWdub3JlICovIGV4cG9ydCB0eXBlIEZyb21BcmcxID0gUHJvbWlzZUxpa2U8QXJyb3dKU09OTGlrZT47XG4vKiogQGlnbm9yZSAqLyBleHBvcnQgdHlwZSBGcm9tQXJnMiA9IEl0ZXJhYmxlPEFycmF5QnVmZmVyVmlld0lucHV0PiB8IEFycmF5QnVmZmVyVmlld0lucHV0O1xuLyoqIEBpZ25vcmUgKi8gZXhwb3J0IHR5cGUgRnJvbUFyZzMgPSBQcm9taXNlTGlrZTxJdGVyYWJsZTxBcnJheUJ1ZmZlclZpZXdJbnB1dD4gfCBBcnJheUJ1ZmZlclZpZXdJbnB1dD47XG4vKiogQGlnbm9yZSAqLyBleHBvcnQgdHlwZSBGcm9tQXJnNCA9IFJlc3BvbnNlIHwgTm9kZUpTLlJlYWRhYmxlU3RyZWFtIHwgUmVhZGFibGVTdHJlYW08QXJyYXlCdWZmZXJWaWV3SW5wdXQ+IHwgQXN5bmNJdGVyYWJsZTxBcnJheUJ1ZmZlclZpZXdJbnB1dD47XG4vKiogQGlnbm9yZSAqLyBleHBvcnQgdHlwZSBGcm9tQXJnNSA9IEZpbGVIYW5kbGUgfCBQcm9taXNlTGlrZTxGaWxlSGFuZGxlPiB8IFByb21pc2VMaWtlPEZyb21Bcmc0Pjtcbi8qKiBAaWdub3JlICovIGV4cG9ydCB0eXBlIEZyb21BcmdzID0gRnJvbUFyZzAgfCBGcm9tQXJnMSB8IEZyb21BcmcyIHwgRnJvbUFyZzMgfCBGcm9tQXJnNCB8IEZyb21Bcmc1O1xuXG4vKiogQGlnbm9yZSAqLyB0eXBlIE9wZW5PcHRpb25zID0geyBhdXRvRGVzdHJveT86IGJvb2xlYW47IH07XG4vKiogQGlnbm9yZSAqLyB0eXBlIFJlY29yZEJhdGNoUmVhZGVyczxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiA9IFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+O1xuLyoqIEBpZ25vcmUgKi8gdHlwZSBBc3luY1JlY29yZEJhdGNoUmVhZGVyczxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiA9IEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPjtcbi8qKiBAaWdub3JlICovIHR5cGUgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyczxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiA9IFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+O1xuLyoqIEBpZ25vcmUgKi8gdHlwZSBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcnM8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gPSBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPiB8IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD47XG5cbmV4cG9ydCBjbGFzcyBSZWNvcmRCYXRjaFJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlYWRhYmxlSW50ZXJvcDxSZWNvcmRCYXRjaDxUPj4ge1xuXG4gICAgcHJvdGVjdGVkIF9pbXBsOiBSZWNvcmRCYXRjaFJlYWRlckltcGxzPFQ+O1xuICAgIHByb3RlY3RlZCBjb25zdHJ1Y3RvcihpbXBsOiBSZWNvcmRCYXRjaFJlYWRlckltcGxzPFQ+KSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuX2ltcGwgPSBpbXBsO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXQgY2xvc2VkKCkgeyByZXR1cm4gdGhpcy5faW1wbC5jbG9zZWQ7IH1cbiAgICBwdWJsaWMgZ2V0IHNjaGVtYSgpIHsgcmV0dXJuIHRoaXMuX2ltcGwuc2NoZW1hOyB9XG4gICAgcHVibGljIGdldCBhdXRvRGVzdHJveSgpIHsgcmV0dXJuIHRoaXMuX2ltcGwuYXV0b0Rlc3Ryb3k7IH1cbiAgICBwdWJsaWMgZ2V0IGRpY3Rpb25hcmllcygpIHsgcmV0dXJuIHRoaXMuX2ltcGwuZGljdGlvbmFyaWVzOyB9XG4gICAgcHVibGljIGdldCBudW1EaWN0aW9uYXJpZXMoKSB7IHJldHVybiB0aGlzLl9pbXBsLm51bURpY3Rpb25hcmllczsgfVxuICAgIHB1YmxpYyBnZXQgbnVtUmVjb3JkQmF0Y2hlcygpIHsgcmV0dXJuIHRoaXMuX2ltcGwubnVtUmVjb3JkQmF0Y2hlczsgfVxuICAgIHB1YmxpYyBnZXQgZm9vdGVyKCkgeyByZXR1cm4gdGhpcy5faW1wbC5pc0ZpbGUoKSA/IHRoaXMuX2ltcGwuZm9vdGVyIDogbnVsbDsgfVxuXG4gICAgcHVibGljIGlzU3luYygpOiB0aGlzIGlzIFJlY29yZEJhdGNoUmVhZGVyczxUPiB7IHJldHVybiB0aGlzLl9pbXBsLmlzU3luYygpOyB9XG4gICAgcHVibGljIGlzQXN5bmMoKTogdGhpcyBpcyBBc3luY1JlY29yZEJhdGNoUmVhZGVyczxUPiB7IHJldHVybiB0aGlzLl9pbXBsLmlzQXN5bmMoKTsgfVxuICAgIHB1YmxpYyBpc0ZpbGUoKTogdGhpcyBpcyBSZWNvcmRCYXRjaEZpbGVSZWFkZXJzPFQ+IHsgcmV0dXJuIHRoaXMuX2ltcGwuaXNGaWxlKCk7IH1cbiAgICBwdWJsaWMgaXNTdHJlYW0oKTogdGhpcyBpcyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcnM8VD4geyByZXR1cm4gdGhpcy5faW1wbC5pc1N0cmVhbSgpOyB9XG5cbiAgICBwdWJsaWMgbmV4dCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2ltcGwubmV4dCgpO1xuICAgIH1cbiAgICBwdWJsaWMgdGhyb3codmFsdWU/OiBhbnkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2ltcGwudGhyb3codmFsdWUpO1xuICAgIH1cbiAgICBwdWJsaWMgcmV0dXJuKHZhbHVlPzogYW55KSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbXBsLnJldHVybih2YWx1ZSk7XG4gICAgfVxuICAgIHB1YmxpYyBjYW5jZWwoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbXBsLmNhbmNlbCgpO1xuICAgIH1cbiAgICBwdWJsaWMgcmVzZXQoc2NoZW1hPzogU2NoZW1hPFQ+IHwgbnVsbCk6IHRoaXMge1xuICAgICAgICB0aGlzLl9pbXBsLnJlc2V0KHNjaGVtYSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwdWJsaWMgb3BlbihvcHRpb25zPzogT3Blbk9wdGlvbnMpIHtcbiAgICAgICAgY29uc3Qgb3BlbmluZyA9IHRoaXMuX2ltcGwub3BlbihvcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIGlzUHJvbWlzZShvcGVuaW5nKSA/IG9wZW5pbmcudGhlbigoKSA9PiB0aGlzKSA6IHRoaXM7XG4gICAgfVxuICAgIHB1YmxpYyByZWFkUmVjb3JkQmF0Y2goaW5kZXg6IG51bWJlcik6IFJlY29yZEJhdGNoPFQ+IHwgbnVsbCB8IFByb21pc2U8UmVjb3JkQmF0Y2g8VD4gfCBudWxsPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbXBsLmlzRmlsZSgpID8gdGhpcy5faW1wbC5yZWFkUmVjb3JkQmF0Y2goaW5kZXgpIDogbnVsbDtcbiAgICB9XG4gICAgcHVibGljIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHtcbiAgICAgICAgcmV0dXJuICg8SXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4+IHRoaXMuX2ltcGwpW1N5bWJvbC5pdGVyYXRvcl0oKTtcbiAgICB9XG4gICAgcHVibGljIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7XG4gICAgICAgIHJldHVybiAoPEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4+IHRoaXMuX2ltcGwpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpO1xuICAgIH1cbiAgICBwdWJsaWMgdG9ET01TdHJlYW0oKSB7XG4gICAgICAgIHJldHVybiBzdHJlYW1BZGFwdGVycy50b0RPTVN0cmVhbTxSZWNvcmRCYXRjaDxUPj4oXG4gICAgICAgICAgICAodGhpcy5pc1N5bmMoKVxuICAgICAgICAgICAgICAgID8geyBbU3ltYm9sLml0ZXJhdG9yXTogKCkgPT4gdGhpcyB9IGFzIEl0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+PlxuICAgICAgICAgICAgICAgIDogeyBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdOiAoKSA9PiB0aGlzIH0gYXMgQXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pKTtcbiAgICB9XG4gICAgcHVibGljIHRvTm9kZVN0cmVhbSgpIHtcbiAgICAgICAgcmV0dXJuIHN0cmVhbUFkYXB0ZXJzLnRvTm9kZVN0cmVhbTxSZWNvcmRCYXRjaDxUPj4oXG4gICAgICAgICAgICAodGhpcy5pc1N5bmMoKVxuICAgICAgICAgICAgICAgID8geyBbU3ltYm9sLml0ZXJhdG9yXTogKCkgPT4gdGhpcyB9IGFzIEl0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+PlxuICAgICAgICAgICAgICAgIDogeyBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdOiAoKSA9PiB0aGlzIH0gYXMgQXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pLFxuICAgICAgICAgICAgeyBvYmplY3RNb2RlOiB0cnVlIH0pO1xuICAgIH1cblxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgc3RhdGljIHRocm91Z2hOb2RlKG9wdGlvbnM/OiBpbXBvcnQoJ3N0cmVhbScpLkR1cGxleE9wdGlvbnMgJiB7IGF1dG9EZXN0cm95OiBib29sZWFuIH0pOiBpbXBvcnQoJ3N0cmVhbScpLkR1cGxleCB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgXCJ0aHJvdWdoTm9kZVwiIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBlbnZpcm9ubWVudGApO1xuICAgIH1cbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIHRocm91Z2hET008VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfT4oXG4gICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgd3JpdGFibGVTdHJhdGVneT86IEJ5dGVMZW5ndGhRdWV1aW5nU3RyYXRlZ3ksXG4gICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgcmVhZGFibGVTdHJhdGVneT86IHsgYXV0b0Rlc3Ryb3k6IGJvb2xlYW4gfVxuICAgICk6IHsgd3JpdGFibGU6IFdyaXRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+LCByZWFkYWJsZTogUmVhZGFibGVTdHJlYW08UmVjb3JkQmF0Y2g8VD4+IH0ge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFwidGhyb3VnaERPTVwiIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBlbnZpcm9ubWVudGApO1xuICAgIH1cblxuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXI+KHNvdXJjZTogVCk6IFQ7XG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogRnJvbUFyZzApOiBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBGcm9tQXJnMSk6IFByb21pc2U8UmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IEZyb21BcmcyKTogUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogRnJvbUFyZzMpOiBQcm9taXNlPFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+PjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBGcm9tQXJnNCk6IFByb21pc2U8UmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgQXN5bmNSZWNvcmRCYXRjaFJlYWRlcnM8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IEZyb21Bcmc1KTogUHJvbWlzZTxBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4+O1xuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IGFueSkge1xuICAgICAgICBpZiAoc291cmNlIGluc3RhbmNlb2YgUmVjb3JkQmF0Y2hSZWFkZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBzb3VyY2U7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBcnJvd0pTT04oc291cmNlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZyb21BcnJvd0pTT048VD4oc291cmNlKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0ZpbGVIYW5kbGUoc291cmNlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZyb21GaWxlSGFuZGxlPFQ+KHNvdXJjZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNQcm9taXNlPGFueT4oc291cmNlKSkge1xuICAgICAgICAgICAgcmV0dXJuIChhc3luYyAoKSA9PiBhd2FpdCBSZWNvcmRCYXRjaFJlYWRlci5mcm9tPGFueT4oYXdhaXQgc291cmNlKSkoKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0ZldGNoUmVzcG9uc2Uoc291cmNlKSB8fCBpc1JlYWRhYmxlRE9NU3RyZWFtKHNvdXJjZSkgfHwgaXNSZWFkYWJsZU5vZGVTdHJlYW0oc291cmNlKSB8fCBpc0FzeW5jSXRlcmFibGUoc291cmNlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZyb21Bc3luY0J5dGVTdHJlYW08VD4obmV3IEFzeW5jQnl0ZVN0cmVhbShzb3VyY2UpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZnJvbUJ5dGVTdHJlYW08VD4obmV3IEJ5dGVTdHJlYW0oc291cmNlKSk7XG4gICAgfVxuXG4gICAgcHVibGljIHN0YXRpYyByZWFkQWxsPFQgZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlcj4oc291cmNlOiBUKTogVCBleHRlbmRzIFJlY29yZEJhdGNoUmVhZGVycyA/IEl0ZXJhYmxlSXRlcmF0b3I8VD4gOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8VD47XG4gICAgcHVibGljIHN0YXRpYyByZWFkQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogRnJvbUFyZzApOiBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+PjtcbiAgICBwdWJsaWMgc3RhdGljIHJlYWRBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBGcm9tQXJnMSk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPj47XG4gICAgcHVibGljIHN0YXRpYyByZWFkQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogRnJvbUFyZzIpOiBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+PjtcbiAgICBwdWJsaWMgc3RhdGljIHJlYWRBbGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBGcm9tQXJnMyk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4gfCBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPj47XG4gICAgcHVibGljIHN0YXRpYyByZWFkQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogRnJvbUFyZzQpOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgQXN5bmNSZWNvcmRCYXRjaFJlYWRlcnM8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgcmVhZEFsbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IEZyb21Bcmc1KTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPj47XG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyByZWFkQWxsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogYW55KSB7XG4gICAgICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBSZWNvcmRCYXRjaFJlYWRlcikge1xuICAgICAgICAgICAgcmV0dXJuIHNvdXJjZS5pc1N5bmMoKSA/IHJlYWRBbGxTeW5jKHNvdXJjZSkgOiByZWFkQWxsQXN5bmMoc291cmNlIGFzIEFzeW5jUmVjb3JkQmF0Y2hSZWFkZXJzPFQ+KTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0Fycm93SlNPTihzb3VyY2UpIHx8IEFycmF5QnVmZmVyLmlzVmlldyhzb3VyY2UpIHx8IGlzSXRlcmFibGU8QXJyYXlCdWZmZXJWaWV3SW5wdXQ+KHNvdXJjZSkgfHwgaXNJdGVyYXRvclJlc3VsdChzb3VyY2UpKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVhZEFsbFN5bmM8VD4oc291cmNlKSBhcyBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoUmVhZGVyczxUPj47XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlYWRBbGxBc3luYzxUPihzb3VyY2UpIGFzIEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaFJlYWRlcnM8VD4gfCBBc3luY1JlY29yZEJhdGNoUmVhZGVyczxUPj47XG4gICAgfVxufVxuXG4vL1xuLy8gU2luY2UgVFMgaXMgYSBzdHJ1Y3R1cmFsIHR5cGUgc3lzdGVtLCB3ZSBkZWZpbmUgdGhlIGZvbGxvd2luZyBzdWJjbGFzcyBzdHVic1xuLy8gc28gdGhhdCBjb25jcmV0ZSB0eXBlcyBleGlzdCB0byBhc3NvY2lhdGUgd2l0aCB3aXRoIHRoZSBpbnRlcmZhY2VzIGJlbG93LlxuLy9cbi8vIFRoZSBpbXBsZW1lbnRhdGlvbiBmb3IgZWFjaCBSZWNvcmRCYXRjaFJlYWRlciBpcyBoaWRkZW4gYXdheSBpbiB0aGUgc2V0IG9mXG4vLyBgUmVjb3JkQmF0Y2hSZWFkZXJJbXBsYCBjbGFzc2VzIGluIHRoZSBzZWNvbmQgaGFsZiBvZiB0aGlzIGZpbGUuIFRoaXMgYWxsb3dzXG4vLyB1cyB0byBleHBvcnQgYSBzaW5nbGUgUmVjb3JkQmF0Y2hSZWFkZXIgY2xhc3MsIGFuZCBzd2FwIG91dCB0aGUgaW1wbCBiYXNlZFxuLy8gb24gdGhlIGlvIHByaW1pdGl2ZXMgb3IgdW5kZXJseWluZyBhcnJvdyAoSlNPTiwgZmlsZSwgb3Igc3RyZWFtKSBhdCBydW50aW1lLlxuLy9cbi8vIEFzeW5jL2F3YWl0IG1ha2VzIG91ciBqb2IgYSBiaXQgaGFyZGVyLCBzaW5jZSBpdCBmb3JjZXMgZXZlcnl0aGluZyB0byBiZVxuLy8gZWl0aGVyIGZ1bGx5IHN5bmMgb3IgZnVsbHkgYXN5bmMuIFRoaXMgaXMgd2h5IHRoZSBsb2dpYyBmb3IgdGhlIHJlYWRlciBpbXBsc1xuLy8gaGFzIGJlZW4gZHVwbGljYXRlZCBpbnRvIGJvdGggc3luYyBhbmQgYXN5bmMgdmFyaWFudHMuIFNpbmNlIHRoZSBSQlJcbi8vIGRlbGVnYXRlcyB0byBpdHMgaW1wbCwgYW4gUkJSIHdpdGggYW4gQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsIGZvclxuLy8gZXhhbXBsZSB3aWxsIHJldHVybiBhc3luYy9hd2FpdC1mcmllbmRseSBQcm9taXNlcywgYnV0IG9uZSB3aXRoIGEgKHN5bmMpXG4vLyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGwgd2lsbCBhbHdheXMgcmV0dXJuIHZhbHVlcy4gTm90aGluZyBzaG91bGQgYmVcbi8vIGRpZmZlcmVudCBhYm91dCB0aGVpciBsb2dpYywgYXNpZGUgZnJvbSB0aGUgYXN5bmMgaGFuZGxpbmcuIFRoaXMgaXMgYWxzbyB3aHlcbi8vIHRoaXMgY29kZSBsb29rcyBoaWdobHkgc3RydWN0dXJlZCwgYXMgaXQgc2hvdWxkIGJlIG5lYXJseSBpZGVudGljYWwgYW5kIGVhc3lcbi8vIHRvIGZvbGxvdy5cbi8vXG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY2xhc3MgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlcjxUPiB7XG4gICAgY29uc3RydWN0b3IocHJvdGVjdGVkIF9pbXBsOiBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VD4pIHsgc3VwZXIgKF9pbXBsKTsgfVxuICAgIHB1YmxpYyBbU3ltYm9sLml0ZXJhdG9yXSgpIHsgcmV0dXJuICh0aGlzLl9pbXBsIGFzIEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+KVtTeW1ib2wuaXRlcmF0b3JdKCk7IH1cbiAgICBwdWJsaWMgYXN5bmMgKltTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7IHlpZWxkKiB0aGlzW1N5bWJvbC5pdGVyYXRvcl0oKTsgfVxufVxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjbGFzcyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXI8VD4ge1xuICAgIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBfaW1wbDogQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VD4pIHsgc3VwZXIgKF9pbXBsKTsgfVxuICAgIHB1YmxpYyBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7IHRocm93IG5ldyBFcnJvcihgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlciBpcyBub3QgSXRlcmFibGVgKTsgfVxuICAgIHB1YmxpYyBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCkgeyByZXR1cm4gKHRoaXMuX2ltcGwgYXMgQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PilbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk7IH1cbn1cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY2xhc3MgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4ge1xuICAgIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBfaW1wbDogUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUPikgeyBzdXBlciAoX2ltcGwpOyB9XG59XG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPiB7XG4gICAgY29uc3RydWN0b3IocHJvdGVjdGVkIF9pbXBsOiBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VD4pIHsgc3VwZXIgKF9pbXBsKTsgfVxufVxuXG4vL1xuLy8gTm93IG92ZXJyaWRlIHRoZSByZXR1cm4gdHlwZXMgZm9yIGVhY2ggc3luYy9hc3luYyBSZWNvcmRCYXRjaFJlYWRlciB2YXJpYW50XG4vL1xuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGludGVyZmFjZSBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoUmVhZGVyPFQ+IHtcbiAgICBvcGVuKG9wdGlvbnM/OiBPcGVuT3B0aW9ucyB8IHVuZGVmaW5lZCk6IHRoaXM7XG4gICAgY2FuY2VsKCk6IHZvaWQ7XG4gICAgdGhyb3codmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxhbnk+O1xuICAgIHJldHVybih2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PGFueT47XG4gICAgbmV4dCh2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PFJlY29yZEJhdGNoPFQ+Pjtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoUmVhZGVyPFQ+IHtcbiAgICBvcGVuKG9wdGlvbnM/OiBPcGVuT3B0aW9ucyB8IHVuZGVmaW5lZCk6IFByb21pc2U8dGhpcz47XG4gICAgY2FuY2VsKCk6IFByb21pc2U8dm9pZD47XG4gICAgdGhyb3codmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+O1xuICAgIHJldHVybih2YWx1ZT86IGFueSk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55Pj47XG4gICAgbmV4dCh2YWx1ZT86IGFueSk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8UmVjb3JkQmF0Y2g8VD4+Pjtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4ge1xuICAgIGZvb3RlcjogRm9vdGVyO1xuICAgIHJlYWRSZWNvcmRCYXRjaChpbmRleDogbnVtYmVyKTogUmVjb3JkQmF0Y2g8VD4gfCBudWxsO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGludGVyZmFjZSBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4ge1xuICAgIGZvb3RlcjogRm9vdGVyO1xuICAgIHJlYWRSZWNvcmRCYXRjaChpbmRleDogbnVtYmVyKTogUHJvbWlzZTxSZWNvcmRCYXRjaDxUPiB8IG51bGw+O1xufVxuXG4vKiogQGlnbm9yZSAqL1xudHlwZSBSZWNvcmRCYXRjaFJlYWRlckltcGxzPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+ID1cbiAgICAgUmVjb3JkQmF0Y2hKU09OUmVhZGVySW1wbDxUPiB8XG4gICAgIFJlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VD4gfFxuICAgICBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VD4gfFxuICAgICBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VD4gfFxuICAgICBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUPjtcblxuLyoqIEBpZ25vcmUgKi9cbmludGVyZmFjZSBSZWNvcmRCYXRjaFJlYWRlckltcGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4ge1xuXG4gICAgY2xvc2VkOiBib29sZWFuO1xuICAgIHNjaGVtYTogU2NoZW1hPFQ+O1xuICAgIGF1dG9EZXN0cm95OiBib29sZWFuO1xuICAgIGRpY3Rpb25hcmllczogTWFwPG51bWJlciwgVmVjdG9yPjtcblxuICAgIGlzRmlsZSgpOiB0aGlzIGlzIFJlY29yZEJhdGNoRmlsZVJlYWRlcnM8VD47XG4gICAgaXNTdHJlYW0oKTogdGhpcyBpcyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcnM8VD47XG4gICAgaXNTeW5jKCk6IHRoaXMgaXMgUmVjb3JkQmF0Y2hSZWFkZXJzPFQ+O1xuICAgIGlzQXN5bmMoKTogdGhpcyBpcyBBc3luY1JlY29yZEJhdGNoUmVhZGVyczxUPjtcblxuICAgIHJlc2V0KHNjaGVtYT86IFNjaGVtYTxUPiB8IG51bGwpOiB0aGlzO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuaW50ZXJmYWNlIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoUmVhZGVySW1wbDxUPiB7XG5cbiAgICBvcGVuKG9wdGlvbnM/OiBPcGVuT3B0aW9ucyk6IHRoaXM7XG4gICAgY2FuY2VsKCk6IHZvaWQ7XG5cbiAgICB0aHJvdyh2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PGFueT47XG4gICAgcmV0dXJuKHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8YW55PjtcbiAgICBuZXh0KHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8UmVjb3JkQmF0Y2g8VD4+O1xuXG4gICAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj47XG59XG5cbi8qKiBAaWdub3JlICovXG5pbnRlcmZhY2UgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlckltcGw8VD4ge1xuXG4gICAgb3BlbihvcHRpb25zPzogT3Blbk9wdGlvbnMpOiBQcm9taXNlPHRoaXM+O1xuICAgIGNhbmNlbCgpOiBQcm9taXNlPHZvaWQ+O1xuXG4gICAgdGhyb3codmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+O1xuICAgIHJldHVybih2YWx1ZT86IGFueSk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55Pj47XG4gICAgbmV4dCh2YWx1ZT86IGFueSk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8UmVjb3JkQmF0Y2g8VD4+PjtcblxuICAgIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+Pjtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmludGVyZmFjZSBSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+IHtcbiAgICByZWFkUmVjb3JkQmF0Y2goaW5kZXg6IG51bWJlcik6IFJlY29yZEJhdGNoPFQ+IHwgbnVsbDtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmludGVyZmFjZSBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUPiB7XG4gICAgcmVhZFJlY29yZEJhdGNoKGluZGV4OiBudW1iZXIpOiBQcm9taXNlPFJlY29yZEJhdGNoPFQ+IHwgbnVsbD47XG59XG5cbi8qKiBAaWdub3JlICovXG5hYnN0cmFjdCBjbGFzcyBSZWNvcmRCYXRjaFJlYWRlckltcGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gaW1wbGVtZW50cyBSZWNvcmRCYXRjaFJlYWRlckltcGw8VD4ge1xuXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyBzY2hlbWE6IFNjaGVtYTtcbiAgICBwdWJsaWMgY2xvc2VkID0gZmFsc2U7XG4gICAgcHVibGljIGF1dG9EZXN0cm95ID0gdHJ1ZTtcbiAgICBwdWJsaWMgZGljdGlvbmFyaWVzOiBNYXA8bnVtYmVyLCBWZWN0b3I+O1xuXG4gICAgcHJvdGVjdGVkIF9kaWN0aW9uYXJ5SW5kZXggPSAwO1xuICAgIHByb3RlY3RlZCBfcmVjb3JkQmF0Y2hJbmRleCA9IDA7XG4gICAgcHVibGljIGdldCBudW1EaWN0aW9uYXJpZXMoKSB7IHJldHVybiB0aGlzLl9kaWN0aW9uYXJ5SW5kZXg7IH1cbiAgICBwdWJsaWMgZ2V0IG51bVJlY29yZEJhdGNoZXMoKSB7IHJldHVybiB0aGlzLl9yZWNvcmRCYXRjaEluZGV4OyB9XG5cbiAgICBjb25zdHJ1Y3RvcihkaWN0aW9uYXJpZXMgPSBuZXcgTWFwPG51bWJlciwgVmVjdG9yPigpKSB7XG4gICAgICAgIHRoaXMuZGljdGlvbmFyaWVzID0gZGljdGlvbmFyaWVzO1xuICAgIH1cblxuICAgIHB1YmxpYyBpc1N5bmMoKTogdGhpcyBpcyBSZWNvcmRCYXRjaFJlYWRlcnM8VD4geyByZXR1cm4gZmFsc2U7IH1cbiAgICBwdWJsaWMgaXNBc3luYygpOiB0aGlzIGlzIEFzeW5jUmVjb3JkQmF0Y2hSZWFkZXJzPFQ+IHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgcHVibGljIGlzRmlsZSgpOiB0aGlzIGlzIFJlY29yZEJhdGNoRmlsZVJlYWRlcnM8VD4geyByZXR1cm4gZmFsc2U7IH1cbiAgICBwdWJsaWMgaXNTdHJlYW0oKTogdGhpcyBpcyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcnM8VD4geyByZXR1cm4gZmFsc2U7IH1cblxuICAgIHB1YmxpYyByZXNldChzY2hlbWE/OiBTY2hlbWE8VD4gfCBudWxsKSB7XG4gICAgICAgIHRoaXMuX2RpY3Rpb25hcnlJbmRleCA9IDA7XG4gICAgICAgIHRoaXMuX3JlY29yZEJhdGNoSW5kZXggPSAwO1xuICAgICAgICB0aGlzLnNjaGVtYSA9IDxhbnk+IHNjaGVtYTtcbiAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMgPSBuZXcgTWFwKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfbG9hZFJlY29yZEJhdGNoKGhlYWRlcjogbWV0YWRhdGEuUmVjb3JkQmF0Y2gsIGJvZHk6IGFueSkge1xuICAgICAgICByZXR1cm4gbmV3IFJlY29yZEJhdGNoPFQ+KHRoaXMuc2NoZW1hLCBoZWFkZXIubGVuZ3RoLCB0aGlzLl9sb2FkVmVjdG9ycyhoZWFkZXIsIGJvZHksIHRoaXMuc2NoZW1hLmZpZWxkcykpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgX2xvYWREaWN0aW9uYXJ5QmF0Y2goaGVhZGVyOiBtZXRhZGF0YS5EaWN0aW9uYXJ5QmF0Y2gsIGJvZHk6IGFueSkge1xuICAgICAgICBjb25zdCB7IGlkLCBpc0RlbHRhLCBkYXRhIH0gPSBoZWFkZXI7XG4gICAgICAgIGNvbnN0IHsgZGljdGlvbmFyaWVzLCBzY2hlbWEgfSA9IHRoaXM7XG4gICAgICAgIGlmIChpc0RlbHRhIHx8ICFkaWN0aW9uYXJpZXMuZ2V0KGlkKSkge1xuXG4gICAgICAgICAgICBjb25zdCB0eXBlID0gc2NoZW1hLmRpY3Rpb25hcmllcy5nZXQoaWQpITtcbiAgICAgICAgICAgIGNvbnN0IHZlY3RvciA9IChpc0RlbHRhID8gZGljdGlvbmFyaWVzLmdldChpZCkhLmNvbmNhdChcbiAgICAgICAgICAgICAgICBWZWN0b3IubmV3KHRoaXMuX2xvYWRWZWN0b3JzKGRhdGEsIGJvZHksIFt0eXBlXSlbMF0pKSA6XG4gICAgICAgICAgICAgICAgVmVjdG9yLm5ldyh0aGlzLl9sb2FkVmVjdG9ycyhkYXRhLCBib2R5LCBbdHlwZV0pWzBdKSkgYXMgVmVjdG9yO1xuXG4gICAgICAgICAgICAoc2NoZW1hLmRpY3Rpb25hcnlGaWVsZHMuZ2V0KGlkKSB8fCBbXSkuZm9yRWFjaCgoeyB0eXBlIH0pID0+IHR5cGUuZGljdGlvbmFyeVZlY3RvciA9IHZlY3Rvcik7XG5cbiAgICAgICAgICAgIHJldHVybiB2ZWN0b3I7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRpY3Rpb25hcmllcy5nZXQoaWQpITtcbiAgICB9XG4gICAgcHJvdGVjdGVkIF9sb2FkVmVjdG9ycyhoZWFkZXI6IG1ldGFkYXRhLlJlY29yZEJhdGNoLCBib2R5OiBhbnksIHR5cGVzOiAoRmllbGQgfCBEYXRhVHlwZSlbXSkge1xuICAgICAgICByZXR1cm4gbmV3IFZlY3RvckxvYWRlcihib2R5LCBoZWFkZXIubm9kZXMsIGhlYWRlci5idWZmZXJzKS52aXNpdE1hbnkodHlwZXMpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmNsYXNzIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoUmVhZGVySW1wbDxUPiBpbXBsZW1lbnRzIEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHtcblxuICAgIHByb3RlY3RlZCBfcmVhZGVyOiBNZXNzYWdlUmVhZGVyO1xuICAgIHByb3RlY3RlZCBfaGFuZGxlOiBCeXRlU3RyZWFtIHwgQXJyb3dKU09OTGlrZTtcblxuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogQnl0ZVN0cmVhbSB8IEFycm93SlNPTkxpa2UsIGRpY3Rpb25hcmllcz86IE1hcDxudW1iZXIsIFZlY3Rvcj4pIHtcbiAgICAgICAgc3VwZXIoZGljdGlvbmFyaWVzKTtcbiAgICAgICAgdGhpcy5fcmVhZGVyID0gIWlzQXJyb3dKU09OKHNvdXJjZSlcbiAgICAgICAgICAgID8gbmV3IE1lc3NhZ2VSZWFkZXIodGhpcy5faGFuZGxlID0gc291cmNlKVxuICAgICAgICAgICAgOiBuZXcgSlNPTk1lc3NhZ2VSZWFkZXIodGhpcy5faGFuZGxlID0gc291cmNlKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgaXNTeW5jKCk6IHRoaXMgaXMgUmVjb3JkQmF0Y2hSZWFkZXJzPFQ+IHsgcmV0dXJuIHRydWU7IH1cbiAgICBwdWJsaWMgaXNTdHJlYW0oKTogdGhpcyBpcyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcnM8VD4geyByZXR1cm4gdHJ1ZTsgfVxuICAgIHB1YmxpYyBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7XG4gICAgICAgIHJldHVybiB0aGlzIGFzIEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+O1xuICAgIH1cbiAgICBwdWJsaWMgY2FuY2VsKCkge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkICYmICh0aGlzLmNsb3NlZCA9IHRydWUpKSB7XG4gICAgICAgICAgICB0aGlzLnJlc2V0KCkuX3JlYWRlci5yZXR1cm4oKTtcbiAgICAgICAgICAgIHRoaXMuX3JlYWRlciA9IDxhbnk+IG51bGw7XG4gICAgICAgICAgICB0aGlzLmRpY3Rpb25hcmllcyA9IDxhbnk+IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcHVibGljIG9wZW4ob3B0aW9ucz86IE9wZW5PcHRpb25zKSB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQpIHtcbiAgICAgICAgICAgIHRoaXMuYXV0b0Rlc3Ryb3kgPSBzaG91bGRBdXRvRGVzdHJveSh0aGlzLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmICghKHRoaXMuc2NoZW1hIHx8ICh0aGlzLnNjaGVtYSA9IHRoaXMuX3JlYWRlci5yZWFkU2NoZW1hKCkhKSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNhbmNlbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwdWJsaWMgdGhyb3codmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxhbnk+IHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiB0aGlzLmF1dG9EZXN0cm95ICYmICh0aGlzLmNsb3NlZCA9IHRydWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZXNldCgpLl9yZWFkZXIudGhyb3codmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBJVEVSQVRPUl9ET05FO1xuICAgIH1cbiAgICBwdWJsaWMgcmV0dXJuKHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8YW55PiB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQgJiYgdGhpcy5hdXRvRGVzdHJveSAmJiAodGhpcy5jbG9zZWQgPSB0cnVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVzZXQoKS5fcmVhZGVyLnJldHVybih2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIElURVJBVE9SX0RPTkU7XG4gICAgfVxuICAgIHB1YmxpYyBuZXh0KCk6IEl0ZXJhdG9yUmVzdWx0PFJlY29yZEJhdGNoPFQ+PiB7XG4gICAgICAgIGlmICh0aGlzLmNsb3NlZCkgeyByZXR1cm4gSVRFUkFUT1JfRE9ORTsgfVxuICAgICAgICBsZXQgbWVzc2FnZTogTWVzc2FnZSB8IG51bGwsIHsgX3JlYWRlcjogcmVhZGVyIH0gPSB0aGlzO1xuICAgICAgICB3aGlsZSAobWVzc2FnZSA9IHRoaXMuX3JlYWROZXh0TWVzc2FnZUFuZFZhbGlkYXRlKCkpIHtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmlzU2NoZW1hKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlc2V0KG1lc3NhZ2UuaGVhZGVyKCkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmlzUmVjb3JkQmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlY29yZEJhdGNoSW5kZXgrKztcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBtZXNzYWdlLmhlYWRlcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IHJlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRCYXRjaCA9IHRoaXMuX2xvYWRSZWNvcmRCYXRjaChoZWFkZXIsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgZG9uZTogZmFsc2UsIHZhbHVlOiByZWNvcmRCYXRjaCB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmlzRGljdGlvbmFyeUJhdGNoKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9kaWN0aW9uYXJ5SW5kZXgrKztcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBtZXNzYWdlLmhlYWRlcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IHJlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB2ZWN0b3IgPSB0aGlzLl9sb2FkRGljdGlvbmFyeUJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpY3Rpb25hcmllcy5zZXQoaGVhZGVyLmlkLCB2ZWN0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnJldHVybigpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgX3JlYWROZXh0TWVzc2FnZUFuZFZhbGlkYXRlPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyPih0eXBlPzogVCB8IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JlYWRlci5yZWFkTWVzc2FnZTxUPih0eXBlKTtcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5jbGFzcyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoUmVhZGVySW1wbDxUPiBpbXBsZW1lbnRzIEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4ge1xuXG4gICAgcHJvdGVjdGVkIF9oYW5kbGU6IEFzeW5jQnl0ZVN0cmVhbTtcbiAgICBwcm90ZWN0ZWQgX3JlYWRlcjogQXN5bmNNZXNzYWdlUmVhZGVyO1xuXG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBBc3luY0J5dGVTdHJlYW0sIGRpY3Rpb25hcmllcz86IE1hcDxudW1iZXIsIFZlY3Rvcj4pIHtcbiAgICAgICAgc3VwZXIoZGljdGlvbmFyaWVzKTtcbiAgICAgICAgdGhpcy5fcmVhZGVyID0gbmV3IEFzeW5jTWVzc2FnZVJlYWRlcih0aGlzLl9oYW5kbGUgPSBzb3VyY2UpO1xuICAgIH1cbiAgICBwdWJsaWMgaXNBc3luYygpOiB0aGlzIGlzIEFzeW5jUmVjb3JkQmF0Y2hSZWFkZXJzPFQ+IHsgcmV0dXJuIHRydWU7IH1cbiAgICBwdWJsaWMgaXNTdHJlYW0oKTogdGhpcyBpcyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcnM8VD4geyByZXR1cm4gdHJ1ZTsgfVxuICAgIHB1YmxpYyBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4ge1xuICAgICAgICByZXR1cm4gdGhpcyBhcyBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+O1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgY2FuY2VsKCkge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkICYmICh0aGlzLmNsb3NlZCA9IHRydWUpKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJlc2V0KCkuX3JlYWRlci5yZXR1cm4oKTtcbiAgICAgICAgICAgIHRoaXMuX3JlYWRlciA9IDxhbnk+IG51bGw7XG4gICAgICAgICAgICB0aGlzLmRpY3Rpb25hcmllcyA9IDxhbnk+IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcHVibGljIGFzeW5jIG9wZW4ob3B0aW9ucz86IE9wZW5PcHRpb25zKSB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQpIHtcbiAgICAgICAgICAgIHRoaXMuYXV0b0Rlc3Ryb3kgPSBzaG91bGRBdXRvRGVzdHJveSh0aGlzLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmICghKHRoaXMuc2NoZW1hIHx8ICh0aGlzLnNjaGVtYSA9IChhd2FpdCB0aGlzLl9yZWFkZXIucmVhZFNjaGVtYSgpKSEpKSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuY2FuY2VsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyB0aHJvdyh2YWx1ZT86IGFueSk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55Pj4ge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkICYmIHRoaXMuYXV0b0Rlc3Ryb3kgJiYgKHRoaXMuY2xvc2VkID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJlc2V0KCkuX3JlYWRlci50aHJvdyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIElURVJBVE9SX0RPTkU7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyByZXR1cm4odmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+IHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiB0aGlzLmF1dG9EZXN0cm95ICYmICh0aGlzLmNsb3NlZCA9IHRydWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZXNldCgpLl9yZWFkZXIucmV0dXJuKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gSVRFUkFUT1JfRE9ORTtcbiAgICB9XG4gICAgcHVibGljIGFzeW5jIG5leHQoKSB7XG4gICAgICAgIGlmICh0aGlzLmNsb3NlZCkgeyByZXR1cm4gSVRFUkFUT1JfRE9ORTsgfVxuICAgICAgICBsZXQgbWVzc2FnZTogTWVzc2FnZSB8IG51bGwsIHsgX3JlYWRlcjogcmVhZGVyIH0gPSB0aGlzO1xuICAgICAgICB3aGlsZSAobWVzc2FnZSA9IGF3YWl0IHRoaXMuX3JlYWROZXh0TWVzc2FnZUFuZFZhbGlkYXRlKCkpIHtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmlzU2NoZW1hKCkpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnJlc2V0KG1lc3NhZ2UuaGVhZGVyKCkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmlzUmVjb3JkQmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlY29yZEJhdGNoSW5kZXgrKztcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBtZXNzYWdlLmhlYWRlcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IGF3YWl0IHJlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRCYXRjaCA9IHRoaXMuX2xvYWRSZWNvcmRCYXRjaChoZWFkZXIsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgZG9uZTogZmFsc2UsIHZhbHVlOiByZWNvcmRCYXRjaCB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmlzRGljdGlvbmFyeUJhdGNoKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9kaWN0aW9uYXJ5SW5kZXgrKztcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBtZXNzYWdlLmhlYWRlcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IGF3YWl0IHJlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB2ZWN0b3IgPSB0aGlzLl9sb2FkRGljdGlvbmFyeUJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpY3Rpb25hcmllcy5zZXQoaGVhZGVyLmlkLCB2ZWN0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJldHVybigpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgYXN5bmMgX3JlYWROZXh0TWVzc2FnZUFuZFZhbGlkYXRlPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyPih0eXBlPzogVCB8IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuX3JlYWRlci5yZWFkTWVzc2FnZTxUPih0eXBlKTtcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5jbGFzcyBSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+IHtcblxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwcm90ZWN0ZWQgX2Zvb3Rlcj86IEZvb3RlcjtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHJvdGVjdGVkIF9oYW5kbGU6IFJhbmRvbUFjY2Vzc0ZpbGU7XG4gICAgcHVibGljIGdldCBmb290ZXIoKSB7IHJldHVybiB0aGlzLl9mb290ZXIhOyB9XG4gICAgcHVibGljIGdldCBudW1EaWN0aW9uYXJpZXMoKSB7IHJldHVybiB0aGlzLl9mb290ZXIgPyB0aGlzLl9mb290ZXIubnVtRGljdGlvbmFyaWVzIDogMDsgfVxuICAgIHB1YmxpYyBnZXQgbnVtUmVjb3JkQmF0Y2hlcygpIHsgcmV0dXJuIHRoaXMuX2Zvb3RlciA/IHRoaXMuX2Zvb3Rlci5udW1SZWNvcmRCYXRjaGVzIDogMDsgfVxuXG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBSYW5kb21BY2Nlc3NGaWxlIHwgQXJyYXlCdWZmZXJWaWV3SW5wdXQsIGRpY3Rpb25hcmllcz86IE1hcDxudW1iZXIsIFZlY3Rvcj4pIHtcbiAgICAgICAgc3VwZXIoc291cmNlIGluc3RhbmNlb2YgUmFuZG9tQWNjZXNzRmlsZSA/IHNvdXJjZSA6IG5ldyBSYW5kb21BY2Nlc3NGaWxlKHNvdXJjZSksIGRpY3Rpb25hcmllcyk7XG4gICAgfVxuICAgIHB1YmxpYyBpc1N5bmMoKTogdGhpcyBpcyBSZWNvcmRCYXRjaFJlYWRlcnM8VD4geyByZXR1cm4gdHJ1ZTsgfVxuICAgIHB1YmxpYyBpc0ZpbGUoKTogdGhpcyBpcyBSZWNvcmRCYXRjaEZpbGVSZWFkZXJzPFQ+IHsgcmV0dXJuIHRydWU7IH1cbiAgICBwdWJsaWMgb3BlbihvcHRpb25zPzogT3Blbk9wdGlvbnMpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiAhdGhpcy5fZm9vdGVyKSB7XG4gICAgICAgICAgICB0aGlzLnNjaGVtYSA9ICh0aGlzLl9mb290ZXIgPSB0aGlzLl9yZWFkRm9vdGVyKCkpLnNjaGVtYTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgYmxvY2sgb2YgdGhpcy5fZm9vdGVyLmRpY3Rpb25hcnlCYXRjaGVzKCkpIHtcbiAgICAgICAgICAgICAgICBibG9jayAmJiB0aGlzLl9yZWFkRGljdGlvbmFyeUJhdGNoKHRoaXMuX2RpY3Rpb25hcnlJbmRleCsrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3VwZXIub3BlbihvcHRpb25zKTtcbiAgICB9XG4gICAgcHVibGljIHJlYWRSZWNvcmRCYXRjaChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIGlmICh0aGlzLmNsb3NlZCkgeyByZXR1cm4gbnVsbDsgfVxuICAgICAgICBpZiAoIXRoaXMuX2Zvb3RlcikgeyB0aGlzLm9wZW4oKTsgfVxuICAgICAgICBjb25zdCBibG9jayA9IHRoaXMuX2Zvb3RlciAmJiB0aGlzLl9mb290ZXIuZ2V0UmVjb3JkQmF0Y2goaW5kZXgpO1xuICAgICAgICBpZiAoYmxvY2sgJiYgdGhpcy5faGFuZGxlLnNlZWsoYmxvY2sub2Zmc2V0KSkge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IHRoaXMuX3JlYWRlci5yZWFkTWVzc2FnZShNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlICYmIG1lc3NhZ2UuaXNSZWNvcmRCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSB0aGlzLl9yZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkQmF0Y2ggPSB0aGlzLl9sb2FkUmVjb3JkQmF0Y2goaGVhZGVyLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZWNvcmRCYXRjaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcHJvdGVjdGVkIF9yZWFkRGljdGlvbmFyeUJhdGNoKGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgYmxvY2sgPSB0aGlzLl9mb290ZXIgJiYgdGhpcy5fZm9vdGVyLmdldERpY3Rpb25hcnlCYXRjaChpbmRleCk7XG4gICAgICAgIGlmIChibG9jayAmJiB0aGlzLl9oYW5kbGUuc2VlayhibG9jay5vZmZzZXQpKSB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gdGhpcy5fcmVhZGVyLnJlYWRNZXNzYWdlKE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlICYmIG1lc3NhZ2UuaXNEaWN0aW9uYXJ5QmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IG1lc3NhZ2UuaGVhZGVyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gdGhpcy5fcmVhZGVyLnJlYWRNZXNzYWdlQm9keShtZXNzYWdlLmJvZHlMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHZlY3RvciA9IHRoaXMuX2xvYWREaWN0aW9uYXJ5QmF0Y2goaGVhZGVyLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyaWVzLnNldChoZWFkZXIuaWQsIHZlY3Rvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcHJvdGVjdGVkIF9yZWFkRm9vdGVyKCkge1xuICAgICAgICBjb25zdCB7IF9oYW5kbGUgfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0IG9mZnNldCA9IF9oYW5kbGUuc2l6ZSAtIG1hZ2ljQW5kUGFkZGluZztcbiAgICAgICAgY29uc3QgbGVuZ3RoID0gX2hhbmRsZS5yZWFkSW50MzIob2Zmc2V0KTtcbiAgICAgICAgY29uc3QgYnVmZmVyID0gX2hhbmRsZS5yZWFkQXQob2Zmc2V0IC0gbGVuZ3RoLCBsZW5ndGgpO1xuICAgICAgICByZXR1cm4gRm9vdGVyLmRlY29kZShidWZmZXIpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgX3JlYWROZXh0TWVzc2FnZUFuZFZhbGlkYXRlPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyPih0eXBlPzogVCB8IG51bGwpOiBNZXNzYWdlPFQ+IHwgbnVsbCB7XG4gICAgICAgIGlmICghdGhpcy5fZm9vdGVyKSB7IHRoaXMub3BlbigpOyB9XG4gICAgICAgIGlmICh0aGlzLl9mb290ZXIgJiYgdGhpcy5fcmVjb3JkQmF0Y2hJbmRleCA8IHRoaXMubnVtUmVjb3JkQmF0Y2hlcykge1xuICAgICAgICAgICAgY29uc3QgYmxvY2sgPSB0aGlzLl9mb290ZXIgJiYgdGhpcy5fZm9vdGVyLmdldFJlY29yZEJhdGNoKHRoaXMuX3JlY29yZEJhdGNoSW5kZXgpO1xuICAgICAgICAgICAgaWYgKGJsb2NrICYmIHRoaXMuX2hhbmRsZS5zZWVrKGJsb2NrLm9mZnNldCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fcmVhZGVyLnJlYWRNZXNzYWdlKHR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmNsYXNzIEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+XG4gICAgaW1wbGVtZW50cyBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VD4ge1xuXG4gICAgcHJvdGVjdGVkIF9mb290ZXI/OiBGb290ZXI7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHByb3RlY3RlZCBfaGFuZGxlOiBBc3luY1JhbmRvbUFjY2Vzc0ZpbGU7XG4gICAgcHVibGljIGdldCBmb290ZXIoKSB7IHJldHVybiB0aGlzLl9mb290ZXIhOyB9XG4gICAgcHVibGljIGdldCBudW1EaWN0aW9uYXJpZXMoKSB7IHJldHVybiB0aGlzLl9mb290ZXIgPyB0aGlzLl9mb290ZXIubnVtRGljdGlvbmFyaWVzIDogMDsgfVxuICAgIHB1YmxpYyBnZXQgbnVtUmVjb3JkQmF0Y2hlcygpIHsgcmV0dXJuIHRoaXMuX2Zvb3RlciA/IHRoaXMuX2Zvb3Rlci5udW1SZWNvcmRCYXRjaGVzIDogMDsgfVxuXG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBGaWxlSGFuZGxlLCBieXRlTGVuZ3RoPzogbnVtYmVyLCBkaWN0aW9uYXJpZXM/OiBNYXA8bnVtYmVyLCBWZWN0b3I+KTtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEZpbGVIYW5kbGUgfCBBc3luY1JhbmRvbUFjY2Vzc0ZpbGUsIGRpY3Rpb25hcmllcz86IE1hcDxudW1iZXIsIFZlY3Rvcj4pO1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogRmlsZUhhbmRsZSB8IEFzeW5jUmFuZG9tQWNjZXNzRmlsZSwgLi4ucmVzdDogYW55W10pIHtcbiAgICAgICAgY29uc3QgYnl0ZUxlbmd0aCA9IHR5cGVvZiByZXN0WzBdICE9PSAnbnVtYmVyJyA/IDxudW1iZXI+IHJlc3Quc2hpZnQoKSA6IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgZGljdGlvbmFyaWVzID0gcmVzdFswXSBpbnN0YW5jZW9mIE1hcCA/IDxNYXA8bnVtYmVyLCBWZWN0b3I+PiByZXN0LnNoaWZ0KCkgOiB1bmRlZmluZWQ7XG4gICAgICAgIHN1cGVyKHNvdXJjZSBpbnN0YW5jZW9mIEFzeW5jUmFuZG9tQWNjZXNzRmlsZSA/IHNvdXJjZSA6IG5ldyBBc3luY1JhbmRvbUFjY2Vzc0ZpbGUoc291cmNlLCBieXRlTGVuZ3RoKSwgZGljdGlvbmFyaWVzKTtcbiAgICB9XG4gICAgcHVibGljIGlzRmlsZSgpOiB0aGlzIGlzIFJlY29yZEJhdGNoRmlsZVJlYWRlcnM8VD4geyByZXR1cm4gdHJ1ZTsgfVxuICAgIHB1YmxpYyBpc0FzeW5jKCk6IHRoaXMgaXMgQXN5bmNSZWNvcmRCYXRjaFJlYWRlcnM8VD4geyByZXR1cm4gdHJ1ZTsgfVxuICAgIHB1YmxpYyBhc3luYyBvcGVuKG9wdGlvbnM/OiBPcGVuT3B0aW9ucykge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkICYmICF0aGlzLl9mb290ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuc2NoZW1hID0gKHRoaXMuX2Zvb3RlciA9IGF3YWl0IHRoaXMuX3JlYWRGb290ZXIoKSkuc2NoZW1hO1xuICAgICAgICAgICAgZm9yIChjb25zdCBibG9jayBvZiB0aGlzLl9mb290ZXIuZGljdGlvbmFyeUJhdGNoZXMoKSkge1xuICAgICAgICAgICAgICAgIGJsb2NrICYmIGF3YWl0IHRoaXMuX3JlYWREaWN0aW9uYXJ5QmF0Y2godGhpcy5fZGljdGlvbmFyeUluZGV4KyspO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhd2FpdCBzdXBlci5vcGVuKG9wdGlvbnMpO1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgcmVhZFJlY29yZEJhdGNoKGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgaWYgKHRoaXMuY2xvc2VkKSB7IHJldHVybiBudWxsOyB9XG4gICAgICAgIGlmICghdGhpcy5fZm9vdGVyKSB7IGF3YWl0IHRoaXMub3BlbigpOyB9XG4gICAgICAgIGNvbnN0IGJsb2NrID0gdGhpcy5fZm9vdGVyICYmIHRoaXMuX2Zvb3Rlci5nZXRSZWNvcmRCYXRjaChpbmRleCk7XG4gICAgICAgIGlmIChibG9jayAmJiAoYXdhaXQgdGhpcy5faGFuZGxlLnNlZWsoYmxvY2sub2Zmc2V0KSkpIHtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBhd2FpdCB0aGlzLl9yZWFkZXIucmVhZE1lc3NhZ2UoTWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZSAmJiBtZXNzYWdlLmlzUmVjb3JkQmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IG1lc3NhZ2UuaGVhZGVyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgdGhpcy5fcmVhZGVyLnJlYWRNZXNzYWdlQm9keShtZXNzYWdlLmJvZHlMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZEJhdGNoID0gdGhpcy5fbG9hZFJlY29yZEJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVjb3JkQmF0Y2g7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHByb3RlY3RlZCBhc3luYyBfcmVhZERpY3Rpb25hcnlCYXRjaChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGJsb2NrID0gdGhpcy5fZm9vdGVyICYmIHRoaXMuX2Zvb3Rlci5nZXREaWN0aW9uYXJ5QmF0Y2goaW5kZXgpO1xuICAgICAgICBpZiAoYmxvY2sgJiYgKGF3YWl0IHRoaXMuX2hhbmRsZS5zZWVrKGJsb2NrLm9mZnNldCkpKSB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gYXdhaXQgdGhpcy5fcmVhZGVyLnJlYWRNZXNzYWdlKE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlICYmIG1lc3NhZ2UuaXNEaWN0aW9uYXJ5QmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IG1lc3NhZ2UuaGVhZGVyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgdGhpcy5fcmVhZGVyLnJlYWRNZXNzYWdlQm9keShtZXNzYWdlLmJvZHlMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHZlY3RvciA9IHRoaXMuX2xvYWREaWN0aW9uYXJ5QmF0Y2goaGVhZGVyLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyaWVzLnNldChoZWFkZXIuaWQsIHZlY3Rvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcHJvdGVjdGVkIGFzeW5jIF9yZWFkRm9vdGVyKCkge1xuICAgICAgICBjb25zdCB7IF9oYW5kbGUgfSA9IHRoaXM7XG4gICAgICAgIF9oYW5kbGUuX3BlbmRpbmcgJiYgYXdhaXQgX2hhbmRsZS5fcGVuZGluZztcbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0gX2hhbmRsZS5zaXplIC0gbWFnaWNBbmRQYWRkaW5nO1xuICAgICAgICBjb25zdCBsZW5ndGggPSBhd2FpdCBfaGFuZGxlLnJlYWRJbnQzMihvZmZzZXQpO1xuICAgICAgICBjb25zdCBidWZmZXIgPSBhd2FpdCBfaGFuZGxlLnJlYWRBdChvZmZzZXQgLSBsZW5ndGgsIGxlbmd0aCk7XG4gICAgICAgIHJldHVybiBGb290ZXIuZGVjb2RlKGJ1ZmZlcik7XG4gICAgfVxuICAgIHByb3RlY3RlZCBhc3luYyBfcmVhZE5leHRNZXNzYWdlQW5kVmFsaWRhdGU8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KHR5cGU/OiBUIHwgbnVsbCk6IFByb21pc2U8TWVzc2FnZTxUPiB8IG51bGw+IHtcbiAgICAgICAgaWYgKCF0aGlzLl9mb290ZXIpIHsgYXdhaXQgdGhpcy5vcGVuKCk7IH1cbiAgICAgICAgaWYgKHRoaXMuX2Zvb3RlciAmJiB0aGlzLl9yZWNvcmRCYXRjaEluZGV4IDwgdGhpcy5udW1SZWNvcmRCYXRjaGVzKSB7XG4gICAgICAgICAgICBjb25zdCBibG9jayA9IHRoaXMuX2Zvb3Rlci5nZXRSZWNvcmRCYXRjaCh0aGlzLl9yZWNvcmRCYXRjaEluZGV4KTtcbiAgICAgICAgICAgIGlmIChibG9jayAmJiBhd2FpdCB0aGlzLl9oYW5kbGUuc2VlayhibG9jay5vZmZzZXQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuX3JlYWRlci5yZWFkTWVzc2FnZSh0eXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5jbGFzcyBSZWNvcmRCYXRjaEpTT05SZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+IHtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEFycm93SlNPTkxpa2UsIGRpY3Rpb25hcmllcz86IE1hcDxudW1iZXIsIFZlY3Rvcj4pIHtcbiAgICAgICAgc3VwZXIoc291cmNlLCBkaWN0aW9uYXJpZXMpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgX2xvYWRWZWN0b3JzKGhlYWRlcjogbWV0YWRhdGEuUmVjb3JkQmF0Y2gsIGJvZHk6IGFueSwgdHlwZXM6IChGaWVsZCB8IERhdGFUeXBlKVtdKSB7XG4gICAgICAgIHJldHVybiBuZXcgSlNPTlZlY3RvckxvYWRlcihib2R5LCBoZWFkZXIubm9kZXMsIGhlYWRlci5idWZmZXJzKS52aXNpdE1hbnkodHlwZXMpO1xuICAgIH1cbn1cblxuLy9cbi8vIERlZmluZSBzb21lIGhlbHBlciBmdW5jdGlvbnMgYW5kIHN0YXRpYyBpbXBsZW1lbnRhdGlvbnMgZG93biBoZXJlLiBUaGVyZSdzXG4vLyBhIGJpdCBvZiBicmFuY2hpbmcgaW4gdGhlIHN0YXRpYyBtZXRob2RzIHRoYXQgY2FuIGxlYWQgdG8gdGhlIHNhbWUgcm91dGluZXNcbi8vIGJlaW5nIGV4ZWN1dGVkLCBzbyB3ZSd2ZSBicm9rZW4gdGhvc2Ugb3V0IGhlcmUgZm9yIHJlYWRhYmlsaXR5LlxuLy9cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIHNob3VsZEF1dG9EZXN0cm95KHNlbGY6IHsgYXV0b0Rlc3Ryb3k6IGJvb2xlYW4gfSwgb3B0aW9ucz86IE9wZW5PcHRpb25zKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMgJiYgKHR5cGVvZiBvcHRpb25zWydhdXRvRGVzdHJveSddID09PSAnYm9vbGVhbicpID8gb3B0aW9uc1snYXV0b0Rlc3Ryb3knXSA6IHNlbGZbJ2F1dG9EZXN0cm95J107XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiogcmVhZEFsbFN5bmM8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBSZWNvcmRCYXRjaFJlYWRlcnM8VD4gfCBGcm9tQXJnMCB8IEZyb21BcmcyKSB7XG4gICAgY29uc3QgcmVhZGVyID0gUmVjb3JkQmF0Y2hSZWFkZXIuZnJvbTxUPig8YW55PiBzb3VyY2UpIGFzIFJlY29yZEJhdGNoUmVhZGVyczxUPjtcbiAgICB0cnkge1xuICAgICAgICBpZiAoIXJlYWRlci5vcGVuKHsgYXV0b0Rlc3Ryb3k6IGZhbHNlIH0pLmNsb3NlZCkge1xuICAgICAgICAgICAgZG8geyB5aWVsZCByZWFkZXI7IH0gd2hpbGUgKCEocmVhZGVyLnJlc2V0KCkub3BlbigpKS5jbG9zZWQpO1xuICAgICAgICB9XG4gICAgfSBmaW5hbGx5IHsgcmVhZGVyLmNhbmNlbCgpOyB9XG59XG5cbi8qKiBAaWdub3JlICovXG5hc3luYyBmdW5jdGlvbiogcmVhZEFsbEFzeW5jPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogQXN5bmNSZWNvcmRCYXRjaFJlYWRlcnM8VD4gfCBGcm9tQXJnMSB8IEZyb21BcmczIHwgRnJvbUFyZzQgfCBGcm9tQXJnNSkge1xuICAgIGNvbnN0IHJlYWRlciA9IGF3YWl0IFJlY29yZEJhdGNoUmVhZGVyLmZyb208VD4oPGFueT4gc291cmNlKSBhcyBSZWNvcmRCYXRjaFJlYWRlcjxUPjtcbiAgICB0cnkge1xuICAgICAgICBpZiAoIShhd2FpdCByZWFkZXIub3Blbih7IGF1dG9EZXN0cm95OiBmYWxzZSB9KSkuY2xvc2VkKSB7XG4gICAgICAgICAgICBkbyB7IHlpZWxkIHJlYWRlcjsgfSB3aGlsZSAoIShhd2FpdCByZWFkZXIucmVzZXQoKS5vcGVuKCkpLmNsb3NlZCk7XG4gICAgICAgIH1cbiAgICB9IGZpbmFsbHkgeyBhd2FpdCByZWFkZXIuY2FuY2VsKCk7IH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGZyb21BcnJvd0pTT048VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfT4oc291cmNlOiBBcnJvd0pTT05MaWtlKSB7XG4gICAgcmV0dXJuIG5ldyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcihuZXcgUmVjb3JkQmF0Y2hKU09OUmVhZGVySW1wbDxUPihzb3VyY2UpKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGZyb21CeXRlU3RyZWFtPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0+KHNvdXJjZTogQnl0ZVN0cmVhbSkge1xuICAgIGNvbnN0IGJ5dGVzID0gc291cmNlLnBlZWsoKG1hZ2ljTGVuZ3RoICsgNykgJiB+Nyk7XG4gICAgcmV0dXJuIGJ5dGVzICYmIGJ5dGVzLmJ5dGVMZW5ndGggPj0gNCA/ICFjaGVja0Zvck1hZ2ljQXJyb3dTdHJpbmcoYnl0ZXMpXG4gICAgICAgID8gbmV3IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyKG5ldyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VD4oc291cmNlKSlcbiAgICAgICAgOiBuZXcgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyKG5ldyBSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQ+KHNvdXJjZS5yZWFkKCkpKVxuICAgICAgICA6IG5ldyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcihuZXcgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+KGZ1bmN0aW9uKigpOiBhbnkge30oKSkpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuYXN5bmMgZnVuY3Rpb24gZnJvbUFzeW5jQnl0ZVN0cmVhbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9Pihzb3VyY2U6IEFzeW5jQnl0ZVN0cmVhbSkge1xuICAgIGNvbnN0IGJ5dGVzID0gYXdhaXQgc291cmNlLnBlZWsoKG1hZ2ljTGVuZ3RoICsgNykgJiB+Nyk7XG4gICAgcmV0dXJuIGJ5dGVzICYmIGJ5dGVzLmJ5dGVMZW5ndGggPj0gNCA/ICFjaGVja0Zvck1hZ2ljQXJyb3dTdHJpbmcoYnl0ZXMpXG4gICAgICAgID8gbmV3IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXIobmV3IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+KHNvdXJjZSkpXG4gICAgICAgIDogbmV3IFJlY29yZEJhdGNoRmlsZVJlYWRlcihuZXcgUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUPihhd2FpdCBzb3VyY2UucmVhZCgpKSlcbiAgICAgICAgOiBuZXcgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcihuZXcgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VD4oYXN5bmMgZnVuY3Rpb24qKCk6IGFueSB7fSgpKSk7XG59XG5cbi8qKiBAaWdub3JlICovXG5hc3luYyBmdW5jdGlvbiBmcm9tRmlsZUhhbmRsZTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9Pihzb3VyY2U6IEZpbGVIYW5kbGUpIHtcbiAgICBjb25zdCB7IHNpemUgfSA9IGF3YWl0IHNvdXJjZS5zdGF0KCk7XG4gICAgY29uc3QgZmlsZSA9IG5ldyBBc3luY1JhbmRvbUFjY2Vzc0ZpbGUoc291cmNlLCBzaXplKTtcbiAgICBpZiAoc2l6ZSA+PSBtYWdpY1gyQW5kUGFkZGluZykge1xuICAgICAgICBpZiAoY2hlY2tGb3JNYWdpY0Fycm93U3RyaW5nKGF3YWl0IGZpbGUucmVhZEF0KDAsIChtYWdpY0xlbmd0aCArIDcpICYgfjcpKSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcihuZXcgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQ+KGZpbGUpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmV3IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXIobmV3IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+KGZpbGUpKTtcbn1cbiJdfQ==

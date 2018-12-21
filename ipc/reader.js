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
const buffer_1 = require("../util/buffer");
const file_2 = require("../io/file");
const vectorloader_1 = require("../visitor/vectorloader");
const interfaces_1 = require("../io/interfaces");
const compat_1 = require("../util/compat");
const message_1 = require("./message");
class RecordBatchReader extends interfaces_1.ReadableInterop {
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
    toReadableDOMStream() { return adapters_1.default.toReadableDOMStream(this); }
    toReadableNodeStream() { return adapters_1.default.toReadableNodeStream(this, { objectMode: true }); }
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
        else if (compat_1.isArrowJSON(source)) {
            return RecordBatchReader.fromJSON(source);
        }
        else if (compat_1.isFileHandle(source)) {
            return RecordBatchReader.fromFileHandle(source);
        }
        else if (compat_1.isPromise(source)) {
            return (() => tslib_1.__awaiter(this, void 0, void 0, function* () { return yield RecordBatchReader.from(yield source); }))();
        }
        else if (compat_1.isPromise(source)) {
            return (() => tslib_1.__awaiter(this, void 0, void 0, function* () { return yield RecordBatchReader.from(yield source); }))();
        }
        else if (compat_1.isFetchResponse(source) || compat_1.isReadableDOMStream(source) || compat_1.isReadableNodeStream(source) || compat_1.isAsyncIterable(source)) {
            return RecordBatchReader.fromAsyncByteStream(new stream_1.AsyncByteStream(source));
        }
        return RecordBatchReader.fromByteStream(new stream_1.ByteStream(source));
    }
    static fromJSON(source) {
        return new RecordBatchStreamReader(new interfaces_1.ArrowJSON(source));
    }
    static fromByteStream(source) {
        const bytes = source.peek((message_1.magicLength + 7) & ~7);
        return bytes && bytes.byteLength >= 4
            ? message_1.checkForMagicArrowString(bytes)
                ? new RecordBatchFileReader(source.read())
                : new RecordBatchStreamReader(source)
            : new RecordBatchStreamReader(function* () { }());
    }
    static fromAsyncByteStream(source) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const bytes = yield source.peek((message_1.magicLength + 7) & ~7);
            return bytes && bytes.byteLength >= 4
                ? message_1.checkForMagicArrowString(bytes)
                    ? new RecordBatchFileReader(yield source.read())
                    : new AsyncRecordBatchStreamReader(source)
                : new AsyncRecordBatchStreamReader(function () { return tslib_1.__asyncGenerator(this, arguments, function* () { }); }());
        });
    }
    static fromFileHandle(source) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const { size } = yield source.stat();
            const file = new file_2.AsyncRandomAccessFile(source, size);
            if (size >= message_1.magicX2AndPadding) {
                if (message_1.checkForMagicArrowString(yield file.readAt(0, (message_1.magicLength + 7) & ~7))) {
                    return new AsyncRecordBatchFileReader(file);
                }
            }
            return new AsyncRecordBatchStreamReader(file);
        });
    }
}
exports.RecordBatchReader = RecordBatchReader;
class RecordBatchFileReader extends RecordBatchReader {
    constructor(source, dictionaries) {
        if (source instanceof AsyncRecordBatchFileReaderImpl) {
            super(source);
        }
        else if (source instanceof file_2.RandomAccessFile) {
            super(new RecordBatchFileReaderImpl(source, dictionaries));
        }
        else {
            super(new RecordBatchFileReaderImpl(new file_2.RandomAccessFile(buffer_1.toUint8Array(source)), dictionaries));
        }
    }
    get footer() { return this.impl.footer; }
    cancel() { this.impl.close(); }
    open(autoClose) { this.impl.open(autoClose); return this; }
    readRecordBatch(index) { return this.impl.readRecordBatch(index); }
    [Symbol.iterator]() { return this.impl[Symbol.iterator](); }
    [Symbol.asyncIterator]() { return tslib_1.__asyncGenerator(this, arguments, function* _a() { yield tslib_1.__await(yield* tslib_1.__asyncDelegator(tslib_1.__asyncValues(this[Symbol.iterator]()))); }); }
}
exports.RecordBatchFileReader = RecordBatchFileReader;
class RecordBatchStreamReader extends RecordBatchReader {
    constructor(source, dictionaries) {
        super(compat_1.isArrowJSON(source)
            ? new RecordBatchJSONReaderImpl(new message_1.JSONMessageReader(source), dictionaries)
            : new RecordBatchStreamReaderImpl(new message_1.MessageReader(source), dictionaries));
    }
    cancel() { this.impl.close(); }
    open(autoClose) { this.impl.open(autoClose); return this; }
    [Symbol.iterator]() { return this.impl[Symbol.iterator](); }
    [Symbol.asyncIterator]() { return tslib_1.__asyncGenerator(this, arguments, function* _a() { yield tslib_1.__await(yield* tslib_1.__asyncDelegator(tslib_1.__asyncValues(this[Symbol.iterator]()))); }); }
}
exports.RecordBatchStreamReader = RecordBatchStreamReader;
class AsyncRecordBatchStreamReader extends RecordBatchReader {
    constructor(source, byteLength) {
        super(new AsyncRecordBatchStreamReaderImpl(new message_1.AsyncMessageReader(source, byteLength)));
    }
    cancel() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () { yield this.impl.close(); });
    }
    open(autoClose) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () { yield this.impl.open(autoClose); return this; });
    }
    [Symbol.asyncIterator]() { return this.impl[Symbol.asyncIterator](); }
    [Symbol.iterator]() { throw new Error(`AsyncRecordBatchStreamReader is not Iterable`); }
}
exports.AsyncRecordBatchStreamReader = AsyncRecordBatchStreamReader;
class AsyncRecordBatchFileReader extends RecordBatchReader {
    constructor(source, ...rest) {
        let [byteLength, dictionaries] = rest;
        if (byteLength && typeof byteLength !== 'number') {
            dictionaries = byteLength;
        }
        let file = source instanceof file_2.AsyncRandomAccessFile ? source : new file_2.AsyncRandomAccessFile(source, byteLength);
        super(new AsyncRecordBatchFileReaderImpl(file, dictionaries));
    }
    get footer() { return this.impl.footer; }
    cancel() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () { yield this.impl.close(); });
    }
    open(autoClose) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () { yield this.impl.open(autoClose); return this; });
    }
    readRecordBatch(index) { return this.impl.readRecordBatch(index); }
    [Symbol.asyncIterator]() { return this.impl[Symbol.asyncIterator](); }
    [Symbol.iterator]() { throw new Error(`AsyncRecordBatchFileReader is not Iterable`); }
}
exports.AsyncRecordBatchFileReader = AsyncRecordBatchFileReader;
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
        return interfaces_1.ITERATOR_DONE;
    }
    return(value) {
        if (!this.closed && this.autoClose && (this.closed = true)) {
            return this.reset().reader.return(value);
        }
        return interfaces_1.ITERATOR_DONE;
    }
    next() {
        if (this.closed) {
            return interfaces_1.ITERATOR_DONE;
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
    close() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!this.closed && (this.closed = true)) {
                yield this.reset().reader.return();
                this.reader = null;
                this.dictionaries = null;
            }
            return this;
        });
    }
    open(autoClose) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            // default args in an async function crash closure-compiler at the moment
            // so do this instead. https://github.com/google/closure-compiler/issues/3178
            autoClose !== undefined || (autoClose = this.autoClose);
            if (!this.closed) {
                this.autoClose = autoClose;
                if (!(this.schema || (this.schema = (yield this.reader.readSchema())))) {
                    return this.close();
                }
            }
            return this;
        });
    }
    throw(value) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!this.closed && this.autoClose && (this.closed = true)) {
                return yield this.reset().reader.throw(value);
            }
            return interfaces_1.ITERATOR_DONE;
        });
    }
    return(value) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!this.closed && this.autoClose && (this.closed = true)) {
                return yield this.reset().reader.return(value);
            }
            return interfaces_1.ITERATOR_DONE;
        });
    }
    next() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (this.closed) {
                return interfaces_1.ITERATOR_DONE;
            }
            let message, { reader } = this;
            while (message = yield this.readNextMessageAndValidate()) {
                if (message.isSchema()) {
                    yield this.reset(message.header());
                }
                else if (message.isRecordBatch()) {
                    this.recordBatchIndex++;
                    const header = message.header();
                    const buffer = yield reader.readMessageBody(message.bodyLength);
                    const recordBatch = this._loadRecordBatch(header, buffer);
                    return { done: false, value: recordBatch };
                }
                else if (message.isDictionaryBatch()) {
                    this.dictionaryIndex++;
                    const header = message.header();
                    const buffer = yield reader.readMessageBody(message.bodyLength);
                    const vector = this._loadDictionaryBatch(header, buffer);
                    this.dictionaries.set(header.id, vector);
                }
            }
            return yield this.return();
        });
    }
    readNextMessageAndValidate(type) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield this.reader.readMessage(type);
        });
    }
}
class RecordBatchFileReaderImpl extends RecordBatchStreamReaderImpl {
    constructor(file, dictionaries = new Map()) {
        super(new message_1.MessageReader(file), dictionaries);
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
            const message = this.reader.readMessage(enum_1.MessageHeader.RecordBatch);
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
            const message = this.reader.readMessage(enum_1.MessageHeader.DictionaryBatch);
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
        const offset = size - message_1.magicAndPadding;
        const length = file.readInt32(offset);
        const buffer = file.readAt(offset - length, length);
        return file_1.Footer.decode(buffer);
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
        super(new message_1.AsyncMessageReader(file), dictionaries);
        this.file = file;
    }
    get numDictionaries() { return this.footer.numDictionaries; }
    get numRecordBatches() { return this.footer.numRecordBatches; }
    open(autoClose) {
        const _super = Object.create(null, {
            open: { get: () => super.open }
        });
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            // default args in an async function crash closure-compiler at the moment
            // so do this instead. https://github.com/google/closure-compiler/issues/3178
            autoClose !== undefined || (autoClose = this.autoClose);
            if (!this.closed && !this.footer) {
                this.schema = (this.footer = yield this.readFooter()).schema;
                for (const block of this.footer.dictionaryBatches()) {
                    block && this.readDictionaryBatch(this.dictionaryIndex++);
                }
            }
            return yield _super.open.call(this, autoClose);
        });
    }
    readRecordBatch(index) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (this.closed) {
                return null;
            }
            if (!this.footer) {
                yield this.open();
            }
            const block = this.footer.getRecordBatch(index);
            if (block && (yield this.file.seek(block.offset))) {
                const message = yield this.reader.readMessage(enum_1.MessageHeader.RecordBatch);
                if (message && message.isRecordBatch()) {
                    const header = message.header();
                    const buffer = yield this.reader.readMessageBody(message.bodyLength);
                    const recordBatch = this._loadRecordBatch(header, buffer);
                    return recordBatch;
                }
            }
            return null;
        });
    }
    readDictionaryBatch(index) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const block = this.footer.getDictionaryBatch(index);
            if (block && (yield this.file.seek(block.offset))) {
                const message = yield this.reader.readMessage(enum_1.MessageHeader.DictionaryBatch);
                if (message && message.isDictionaryBatch()) {
                    const header = message.header();
                    const buffer = yield this.reader.readMessageBody(message.bodyLength);
                    const vector = this._loadDictionaryBatch(header, buffer);
                    this.dictionaries.set(header.id, vector);
                }
            }
        });
    }
    readFooter() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const { file } = this;
            const offset = file.size - message_1.magicAndPadding;
            const length = yield file.readInt32(offset);
            const buffer = yield file.readAt(offset - length, length);
            return file_1.Footer.decode(buffer);
        });
    }
    readNextMessageAndValidate(type) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!this.footer) {
                yield this.open();
            }
            if (this.recordBatchIndex < this.numRecordBatches) {
                const block = this.footer.getRecordBatch(this.recordBatchIndex);
                if (block && (yield this.file.seek(block.offset))) {
                    return yield this.reader.readMessage(type);
                }
            }
            return null;
        });
    }
}
class RecordBatchJSONReaderImpl extends RecordBatchStreamReaderImpl {
    constructor(reader, dictionaries = new Map()) {
        super(reader, dictionaries);
        this.reader = reader;
    }
    _loadVectors(header, body, types) {
        return new vectorloader_1.JSONVectorLoader(body, header.nodes, header.buffers).visitMany(types);
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUksQ0FBQyxJQUFJLEVBQUUsQ0FBQzthQUFFO1lBQ3hDLElBQUksSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtnQkFDL0MsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7Z0JBQ2hFLElBQUksS0FBSyxLQUFJLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBLEVBQUU7b0JBQzdDLE9BQU8sTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDOUM7YUFDSjtZQUNELE9BQU8sSUFBSSxDQUFDO1FBQ2hCLENBQUM7S0FBQTtDQUNKO0FBRUQsTUFBTSx5QkFBdUUsU0FBUSwyQkFBOEI7SUFDL0csWUFBc0IsTUFBeUIsRUFBRSxZQUFZLEdBQUcsSUFBSSxHQUFHLEVBQWtCO1FBQ3JGLEtBQUssQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFEVixXQUFNLEdBQU4sTUFBTSxDQUFtQjtJQUUvQyxDQUFDO0lBQ1MsWUFBWSxDQUFDLE1BQTRCLEVBQUUsSUFBUyxFQUFFLEtBQTJCO1FBQ3ZGLE9BQU8sSUFBSSwrQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3JGLENBQUM7Q0FDSiIsImZpbGUiOiJpcGMvcmVhZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IERhdGFUeXBlIH0gZnJvbSAnLi4vdHlwZSc7XG5pbXBvcnQgeyBWZWN0b3IgfSBmcm9tICcuLi92ZWN0b3InO1xuaW1wb3J0IHsgTWVzc2FnZUhlYWRlciB9IGZyb20gJy4uL2VudW0nO1xuaW1wb3J0IHsgRm9vdGVyIH0gZnJvbSAnLi9tZXRhZGF0YS9maWxlJztcbmltcG9ydCB7IFNjaGVtYSwgRmllbGQgfSBmcm9tICcuLi9zY2hlbWEnO1xuaW1wb3J0IHN0cmVhbUFkYXB0ZXJzIGZyb20gJy4uL2lvL2FkYXB0ZXJzJztcbmltcG9ydCB7IE1lc3NhZ2UgfSBmcm9tICcuL21ldGFkYXRhL21lc3NhZ2UnO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2ggfSBmcm9tICcuLi9yZWNvcmRiYXRjaCc7XG5pbXBvcnQgKiBhcyBtZXRhZGF0YSBmcm9tICcuL21ldGFkYXRhL21lc3NhZ2UnO1xuaW1wb3J0IHsgQnl0ZVN0cmVhbSwgQXN5bmNCeXRlU3RyZWFtIH0gZnJvbSAnLi4vaW8vc3RyZWFtJztcbmltcG9ydCB7IEFycmF5QnVmZmVyVmlld0lucHV0LCB0b1VpbnQ4QXJyYXkgfSBmcm9tICcuLi91dGlsL2J1ZmZlcic7XG5pbXBvcnQgeyBSYW5kb21BY2Nlc3NGaWxlLCBBc3luY1JhbmRvbUFjY2Vzc0ZpbGUgfSBmcm9tICcuLi9pby9maWxlJztcbmltcG9ydCB7IFZlY3RvckxvYWRlciwgSlNPTlZlY3RvckxvYWRlciB9IGZyb20gJy4uL3Zpc2l0b3IvdmVjdG9ybG9hZGVyJztcbmltcG9ydCB7IEFycm93SlNPTiwgQXJyb3dKU09OTGlrZSwgRmlsZUhhbmRsZSwgUmVhZGFibGVJbnRlcm9wLCBJVEVSQVRPUl9ET05FIH0gZnJvbSAnLi4vaW8vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBpc1Byb21pc2UsIGlzQXJyb3dKU09OLCBpc0ZpbGVIYW5kbGUsIGlzRmV0Y2hSZXNwb25zZSwgaXNBc3luY0l0ZXJhYmxlLCBpc1JlYWRhYmxlRE9NU3RyZWFtLCBpc1JlYWRhYmxlTm9kZVN0cmVhbSB9IGZyb20gJy4uL3V0aWwvY29tcGF0JztcbmltcG9ydCB7IE1lc3NhZ2VSZWFkZXIsIEFzeW5jTWVzc2FnZVJlYWRlciwgY2hlY2tGb3JNYWdpY0Fycm93U3RyaW5nLCBtYWdpY0xlbmd0aCwgbWFnaWNBbmRQYWRkaW5nLCBtYWdpY1gyQW5kUGFkZGluZywgSlNPTk1lc3NhZ2VSZWFkZXIgfSBmcm9tICcuL21lc3NhZ2UnO1xuXG5leHBvcnQgdHlwZSBGcm9tQXJnMCA9IEFycm93SlNPTkxpa2U7XG5leHBvcnQgdHlwZSBGcm9tQXJnMSA9IEl0ZXJhYmxlPEFycmF5QnVmZmVyVmlld0lucHV0PiB8IEFycmF5QnVmZmVyVmlld0lucHV0O1xuZXhwb3J0IHR5cGUgRnJvbUFyZzIgPSBQcm9taXNlTGlrZTxJdGVyYWJsZTxBcnJheUJ1ZmZlclZpZXdJbnB1dD4gfCBBcnJheUJ1ZmZlclZpZXdJbnB1dD47XG5leHBvcnQgdHlwZSBGcm9tQXJnMyA9IE5vZGVKUy5SZWFkYWJsZVN0cmVhbSB8IFJlYWRhYmxlU3RyZWFtPEFycmF5QnVmZmVyVmlld0lucHV0PiB8IEFzeW5jSXRlcmFibGU8QXJyYXlCdWZmZXJWaWV3SW5wdXQ+O1xuZXhwb3J0IHR5cGUgRnJvbUFyZzQgPSBSZXNwb25zZSB8IEZpbGVIYW5kbGUgfCBQcm9taXNlTGlrZTxGaWxlSGFuZGxlPiB8IFByb21pc2VMaWtlPFJlc3BvbnNlPjtcbmV4cG9ydCB0eXBlIEZyb21BcmdzID0gRnJvbUFyZzAgfCBGcm9tQXJnMyB8IEZyb21BcmcxIHwgRnJvbUFyZzIgfCBGcm9tQXJnNDtcblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFJlY29yZEJhdGNoUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVhZGFibGVJbnRlcm9wPFJlY29yZEJhdGNoPFQ+PiB7XG5cbiAgICBwcm90ZWN0ZWQgY29uc3RydWN0b3IocHJvdGVjdGVkIGltcGw6IElSZWNvcmRCYXRjaFJlYWRlckltcGw8VD4pIHsgc3VwZXIoKTsgfVxuXG4gICAgcHVibGljIGdldCBjbG9zZWQoKSB7IHJldHVybiB0aGlzLmltcGwuY2xvc2VkOyB9XG4gICAgcHVibGljIGdldCBzY2hlbWEoKSB7IHJldHVybiB0aGlzLmltcGwuc2NoZW1hOyB9XG4gICAgcHVibGljIGdldCBhdXRvQ2xvc2UoKSB7IHJldHVybiB0aGlzLmltcGwuYXV0b0Nsb3NlOyB9XG4gICAgcHVibGljIGdldCBkaWN0aW9uYXJpZXMoKSB7IHJldHVybiB0aGlzLmltcGwuZGljdGlvbmFyaWVzOyB9XG4gICAgcHVibGljIGdldCBudW1EaWN0aW9uYXJpZXMoKSB7IHJldHVybiB0aGlzLmltcGwubnVtRGljdGlvbmFyaWVzOyB9XG4gICAgcHVibGljIGdldCBudW1SZWNvcmRCYXRjaGVzKCkgeyByZXR1cm4gdGhpcy5pbXBsLm51bVJlY29yZEJhdGNoZXM7IH1cblxuICAgIHB1YmxpYyBuZXh0KHZhbHVlPzogYW55KSB7IHJldHVybiB0aGlzLmltcGwubmV4dCh2YWx1ZSk7IH1cbiAgICBwdWJsaWMgdGhyb3codmFsdWU/OiBhbnkpIHsgcmV0dXJuIHRoaXMuaW1wbC50aHJvdyh2YWx1ZSk7IH1cbiAgICBwdWJsaWMgcmV0dXJuKHZhbHVlPzogYW55KSB7IHJldHVybiB0aGlzLmltcGwucmV0dXJuKHZhbHVlKTsgfVxuICAgIHB1YmxpYyByZXNldChzY2hlbWE/OiBTY2hlbWE8VD4gfCBudWxsKSB7IHRoaXMuaW1wbC5yZXNldChzY2hlbWEpOyByZXR1cm4gdGhpczsgfVxuXG4gICAgcHVibGljIGFic3RyYWN0IGNhbmNlbCgpOiB2b2lkIHwgUHJvbWlzZTx2b2lkPjtcbiAgICBwdWJsaWMgYWJzdHJhY3Qgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKTogdGhpcyB8IFByb21pc2U8dGhpcz47XG4gICAgcHVibGljIGFic3RyYWN0IFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+O1xuICAgIHB1YmxpYyBhYnN0cmFjdCBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj47XG5cbiAgICBwdWJsaWMgdG9SZWFkYWJsZURPTVN0cmVhbSgpIHsgcmV0dXJuIHN0cmVhbUFkYXB0ZXJzLnRvUmVhZGFibGVET01TdHJlYW0odGhpcyk7IH1cbiAgICBwdWJsaWMgdG9SZWFkYWJsZU5vZGVTdHJlYW0oKSB7IHJldHVybiBzdHJlYW1BZGFwdGVycy50b1JlYWRhYmxlTm9kZVN0cmVhbSh0aGlzLCB7IG9iamVjdE1vZGU6IHRydWUgfSk7IH1cblxuICAgIHB1YmxpYyBpc1N5bmMoKTogdGhpcyBpcyBSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4gfCBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPiB7XG4gICAgICAgIHJldHVybiAodGhpcyBpbnN0YW5jZW9mIFJlY29yZEJhdGNoRmlsZVJlYWRlcikgfHwgKHRoaXMgaW5zdGFuY2VvZiBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcik7XG4gICAgfVxuICAgIHB1YmxpYyBpc0FzeW5jKCk6IHRoaXMgaXMgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4gfCBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+IHtcbiAgICAgICAgcmV0dXJuICh0aGlzIGluc3RhbmNlb2YgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXIpIHx8ICh0aGlzIGluc3RhbmNlb2YgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcik7XG4gICAgfVxuICAgIHB1YmxpYyBpc0ZpbGUoKTogdGhpcyBpcyBSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4gfCBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB7XG4gICAgICAgIHJldHVybiAodGhpcyBpbnN0YW5jZW9mIFJlY29yZEJhdGNoRmlsZVJlYWRlcikgfHwgKHRoaXMgaW5zdGFuY2VvZiBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcik7XG4gICAgfVxuICAgIHB1YmxpYyBpc1N0cmVhbSgpOiB0aGlzIGlzIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+IHwgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPiB7XG4gICAgICAgIHJldHVybiAodGhpcyBpbnN0YW5jZW9mIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyKSB8fCAodGhpcyBpbnN0YW5jZW9mIEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXIpO1xuICAgIH1cblxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgdGhyb3VnaE5vZGUoKTogaW1wb3J0KCdzdHJlYW0nKS5EdXBsZXggeyB0aHJvdyBuZXcgRXJyb3IoYFwiYXNOb2RlU3RyZWFtXCIgbm90IGF2YWlsYWJsZSBpbiB0aGlzIGVudmlyb25tZW50YCk7IH1cbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIHRocm91Z2hET008VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfT4oKTogeyB3cml0YWJsZTogV3JpdGFibGVTdHJlYW08VWludDhBcnJheT4sIHJlYWRhYmxlOiBSZWFkYWJsZVN0cmVhbTxSZWNvcmRCYXRjaDxUPj4gfSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgXCJhc0RPTVN0cmVhbVwiIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBlbnZpcm9ubWVudGApO1xuICAgIH1cblxuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXI+KHNvdXJjZTogVCk6IFQ7XG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogRnJvbUFyZzApOiBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBGcm9tQXJnMSk6IFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IEZyb21BcmcyKTogUHJvbWlzZTxSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4gfCBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPj47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogRnJvbUFyZzMpOiBQcm9taXNlPFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IEZyb21Bcmc0KTogUHJvbWlzZTxBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4+O1xuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IGFueSkge1xuICAgICAgICBpZiAoc291cmNlIGluc3RhbmNlb2YgUmVjb3JkQmF0Y2hSZWFkZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBzb3VyY2U7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBcnJvd0pTT04oc291cmNlKSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlY29yZEJhdGNoUmVhZGVyLmZyb21KU09OPFQ+KHNvdXJjZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNGaWxlSGFuZGxlKHNvdXJjZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBSZWNvcmRCYXRjaFJlYWRlci5mcm9tRmlsZUhhbmRsZTxUPihzb3VyY2UpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzUHJvbWlzZTxGcm9tQXJnMT4oc291cmNlKSkge1xuICAgICAgICAgICAgcmV0dXJuIChhc3luYyAoKSA9PiBhd2FpdCBSZWNvcmRCYXRjaFJlYWRlci5mcm9tPFQ+KGF3YWl0IHNvdXJjZSkpKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNQcm9taXNlPEZpbGVIYW5kbGUgfCBSZXNwb25zZT4oc291cmNlKSkge1xuICAgICAgICAgICAgcmV0dXJuIChhc3luYyAoKSA9PiBhd2FpdCBSZWNvcmRCYXRjaFJlYWRlci5mcm9tPFQ+KGF3YWl0IHNvdXJjZSkpKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNGZXRjaFJlc3BvbnNlKHNvdXJjZSkgfHwgaXNSZWFkYWJsZURPTVN0cmVhbShzb3VyY2UpIHx8IGlzUmVhZGFibGVOb2RlU3RyZWFtKHNvdXJjZSkgfHwgaXNBc3luY0l0ZXJhYmxlKHNvdXJjZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBSZWNvcmRCYXRjaFJlYWRlci5mcm9tQXN5bmNCeXRlU3RyZWFtPFQ+KG5ldyBBc3luY0J5dGVTdHJlYW0oc291cmNlKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFJlY29yZEJhdGNoUmVhZGVyLmZyb21CeXRlU3RyZWFtPFQ+KG5ldyBCeXRlU3RyZWFtKHNvdXJjZSkpO1xuICAgIH1cbiAgICBwcml2YXRlIHN0YXRpYyBmcm9tSlNPTjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9Pihzb3VyY2U6IEFycm93SlNPTkxpa2UpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPihuZXcgQXJyb3dKU09OKHNvdXJjZSkpO1xuICAgIH1cbiAgICBwcml2YXRlIHN0YXRpYyBmcm9tQnl0ZVN0cmVhbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9Pihzb3VyY2U6IEJ5dGVTdHJlYW0pIHtcbiAgICAgICAgY29uc3QgYnl0ZXMgPSBzb3VyY2UucGVlaygobWFnaWNMZW5ndGggKyA3KSAmIH43KTtcbiAgICAgICAgcmV0dXJuIGJ5dGVzICYmIGJ5dGVzLmJ5dGVMZW5ndGggPj0gNFxuICAgICAgICAgICAgPyBjaGVja0Zvck1hZ2ljQXJyb3dTdHJpbmcoYnl0ZXMpXG4gICAgICAgICAgICA/IG5ldyBSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4oc291cmNlLnJlYWQoKSlcbiAgICAgICAgICAgIDogbmV3IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+KHNvdXJjZSlcbiAgICAgICAgICAgIDogbmV3IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+KGZ1bmN0aW9uKigpOiBhbnkge30oKSk7XG4gICAgfVxuICAgIHByaXZhdGUgc3RhdGljIGFzeW5jIGZyb21Bc3luY0J5dGVTdHJlYW08VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfT4oc291cmNlOiBBc3luY0J5dGVTdHJlYW0pIHtcbiAgICAgICAgY29uc3QgYnl0ZXMgPSBhd2FpdCBzb3VyY2UucGVlaygobWFnaWNMZW5ndGggKyA3KSAmIH43KTtcbiAgICAgICAgcmV0dXJuIGJ5dGVzICYmIGJ5dGVzLmJ5dGVMZW5ndGggPj0gNFxuICAgICAgICAgICAgPyBjaGVja0Zvck1hZ2ljQXJyb3dTdHJpbmcoYnl0ZXMpXG4gICAgICAgICAgICA/IG5ldyBSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4oYXdhaXQgc291cmNlLnJlYWQoKSlcbiAgICAgICAgICAgIDogbmV3IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4oc291cmNlKVxuICAgICAgICAgICAgOiBuZXcgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPihhc3luYyBmdW5jdGlvbiooKTogYW55IHt9KCkpO1xuICAgIH1cbiAgICBwcml2YXRlIHN0YXRpYyBhc3luYyBmcm9tRmlsZUhhbmRsZTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9Pihzb3VyY2U6IEZpbGVIYW5kbGUpIHtcbiAgICAgICAgY29uc3QgeyBzaXplIH0gPSBhd2FpdCBzb3VyY2Uuc3RhdCgpO1xuICAgICAgICBjb25zdCBmaWxlID0gbmV3IEFzeW5jUmFuZG9tQWNjZXNzRmlsZShzb3VyY2UsIHNpemUpO1xuICAgICAgICBpZiAoc2l6ZSA+PSBtYWdpY1gyQW5kUGFkZGluZykge1xuICAgICAgICAgICAgaWYgKGNoZWNrRm9yTWFnaWNBcnJvd1N0cmluZyhhd2FpdCBmaWxlLnJlYWRBdCgwLCAobWFnaWNMZW5ndGggKyA3KSAmIH43KSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+KGZpbGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPihmaWxlKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlcjxUPiB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHByb3RlY3RlZCBpbXBsOiBSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQ+O1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQ+KTtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IFJhbmRvbUFjY2Vzc0ZpbGUsIGRpY3Rpb25hcmllcz86IE1hcDxudW1iZXIsIFZlY3Rvcj4pO1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogQXJyYXlCdWZmZXJWaWV3SW5wdXQsIGRpY3Rpb25hcmllcz86IE1hcDxudW1iZXIsIFZlY3Rvcj4pO1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQ+IHwgUmFuZG9tQWNjZXNzRmlsZSB8IEFycmF5QnVmZmVyVmlld0lucHV0LCBkaWN0aW9uYXJpZXM/OiBNYXA8bnVtYmVyLCBWZWN0b3I+KSB7XG4gICAgICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlckltcGwpIHtcbiAgICAgICAgICAgIHN1cGVyKHNvdXJjZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoc291cmNlIGluc3RhbmNlb2YgUmFuZG9tQWNjZXNzRmlsZSkge1xuICAgICAgICAgICAgc3VwZXIobmV3IFJlY29yZEJhdGNoRmlsZVJlYWRlckltcGwoc291cmNlLCBkaWN0aW9uYXJpZXMpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN1cGVyKG5ldyBSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsKG5ldyBSYW5kb21BY2Nlc3NGaWxlKHRvVWludDhBcnJheShzb3VyY2UpKSwgZGljdGlvbmFyaWVzKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcHVibGljIGdldCBmb290ZXIoKSB7IHJldHVybiB0aGlzLmltcGwuZm9vdGVyOyB9XG4gICAgcHVibGljIGNhbmNlbCgpIHsgdGhpcy5pbXBsLmNsb3NlKCk7IH1cbiAgICBwdWJsaWMgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKSB7IHRoaXMuaW1wbC5vcGVuKGF1dG9DbG9zZSk7IHJldHVybiB0aGlzOyB9XG4gICAgcHVibGljIHJlYWRSZWNvcmRCYXRjaChpbmRleDogbnVtYmVyKSB7IHJldHVybiB0aGlzLmltcGwucmVhZFJlY29yZEJhdGNoKGluZGV4KTsgfVxuICAgIHB1YmxpYyBbU3ltYm9sLml0ZXJhdG9yXSgpIHsgcmV0dXJuICh0aGlzLmltcGwgYXMgSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4pW1N5bWJvbC5pdGVyYXRvcl0oKTsgfVxuICAgIHB1YmxpYyBhc3luYyAqW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHsgeWllbGQqIHRoaXNbU3ltYm9sLml0ZXJhdG9yXSgpOyB9XG59XG5cbmV4cG9ydCBjbGFzcyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoUmVhZGVyPFQ+IHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHJvdGVjdGVkIGltcGw6IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUPjtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEJ5dGVTdHJlYW0gfCBBcnJvd0pTT04gfCBBcnJheUJ1ZmZlclZpZXcgfCBJdGVyYWJsZTxBcnJheUJ1ZmZlclZpZXc+LCBkaWN0aW9uYXJpZXM/OiBNYXA8bnVtYmVyLCBWZWN0b3I+KSB7XG4gICAgICAgIHN1cGVyKGlzQXJyb3dKU09OKHNvdXJjZSlcbiAgICAgICAgICAgID8gbmV3IFJlY29yZEJhdGNoSlNPTlJlYWRlckltcGwobmV3IEpTT05NZXNzYWdlUmVhZGVyKHNvdXJjZSksIGRpY3Rpb25hcmllcylcbiAgICAgICAgICAgIDogbmV3IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbChuZXcgTWVzc2FnZVJlYWRlcihzb3VyY2UpLCBkaWN0aW9uYXJpZXMpKTtcbiAgICB9XG4gICAgcHVibGljIGNhbmNlbCgpIHsgdGhpcy5pbXBsLmNsb3NlKCk7IH1cbiAgICBwdWJsaWMgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKSB7IHRoaXMuaW1wbC5vcGVuKGF1dG9DbG9zZSk7IHJldHVybiB0aGlzOyB9XG4gICAgcHVibGljIFtTeW1ib2wuaXRlcmF0b3JdKCkgeyByZXR1cm4gKHRoaXMuaW1wbCBhcyBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PilbU3ltYm9sLml0ZXJhdG9yXSgpOyB9XG4gICAgcHVibGljIGFzeW5jICpbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4geyB5aWVsZCogdGhpc1tTeW1ib2wuaXRlcmF0b3JdKCk7IH1cbn1cblxuZXhwb3J0IGNsYXNzIEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlcjxUPiB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHByb3RlY3RlZCBpbXBsOiBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUPjtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEFzeW5jQnl0ZVN0cmVhbSB8IEZpbGVIYW5kbGUgfCBOb2RlSlMuUmVhZGFibGVTdHJlYW0gfCBSZWFkYWJsZVN0cmVhbTxBcnJheUJ1ZmZlclZpZXc+IHwgQXN5bmNJdGVyYWJsZTxBcnJheUJ1ZmZlclZpZXc+LCBieXRlTGVuZ3RoPzogbnVtYmVyKSB7XG4gICAgICAgIHN1cGVyKG5ldyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbChuZXcgQXN5bmNNZXNzYWdlUmVhZGVyKHNvdXJjZSBhcyBGaWxlSGFuZGxlLCBieXRlTGVuZ3RoKSkpO1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgY2FuY2VsKCkgeyBhd2FpdCB0aGlzLmltcGwuY2xvc2UoKTsgfVxuICAgIHB1YmxpYyBhc3luYyBvcGVuKGF1dG9DbG9zZT86IGJvb2xlYW4pIHsgYXdhaXQgdGhpcy5pbXBsLm9wZW4oYXV0b0Nsb3NlKTsgcmV0dXJuIHRoaXM7IH1cbiAgICBwdWJsaWMgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpIHsgcmV0dXJuICh0aGlzLmltcGwgYXMgQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PilbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk7IH1cbiAgICBwdWJsaWMgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4geyB0aHJvdyBuZXcgRXJyb3IoYEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXIgaXMgbm90IEl0ZXJhYmxlYCk7IH1cbn1cblxuZXhwb3J0IGNsYXNzIEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXI8VD4ge1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwcm90ZWN0ZWQgaW1wbDogQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQ+O1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogQXN5bmNSYW5kb21BY2Nlc3NGaWxlKTtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEFzeW5jUmFuZG9tQWNjZXNzRmlsZSwgZGljdGlvbmFyaWVzOiBNYXA8bnVtYmVyLCBWZWN0b3I+KTtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEZpbGVIYW5kbGUsIGJ5dGVMZW5ndGg6IG51bWJlciwgZGljdGlvbmFyaWVzOiBNYXA8bnVtYmVyLCBWZWN0b3I+KTtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEFzeW5jUmFuZG9tQWNjZXNzRmlsZSB8IEZpbGVIYW5kbGUsIC4uLnJlc3Q6IChudW1iZXIgfCBNYXA8bnVtYmVyLCBWZWN0b3I+KVtdKSB7XG4gICAgICAgIGxldCBbYnl0ZUxlbmd0aCwgZGljdGlvbmFyaWVzXSA9IHJlc3QgYXMgW251bWJlciwgTWFwPG51bWJlciwgVmVjdG9yPl07XG4gICAgICAgIGlmIChieXRlTGVuZ3RoICYmIHR5cGVvZiBieXRlTGVuZ3RoICE9PSAnbnVtYmVyJykgeyBkaWN0aW9uYXJpZXMgPSBieXRlTGVuZ3RoOyB9XG4gICAgICAgIGxldCBmaWxlID0gc291cmNlIGluc3RhbmNlb2YgQXN5bmNSYW5kb21BY2Nlc3NGaWxlID8gc291cmNlIDogbmV3IEFzeW5jUmFuZG9tQWNjZXNzRmlsZShzb3VyY2UsIGJ5dGVMZW5ndGgpO1xuICAgICAgICBzdXBlcihuZXcgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsKGZpbGUsIGRpY3Rpb25hcmllcykpO1xuICAgIH1cbiAgICBwdWJsaWMgZ2V0IGZvb3RlcigpIHsgcmV0dXJuIHRoaXMuaW1wbC5mb290ZXI7IH1cbiAgICBwdWJsaWMgYXN5bmMgY2FuY2VsKCkgeyBhd2FpdCB0aGlzLmltcGwuY2xvc2UoKTsgfVxuICAgIHB1YmxpYyBhc3luYyBvcGVuKGF1dG9DbG9zZT86IGJvb2xlYW4pIHsgYXdhaXQgdGhpcy5pbXBsLm9wZW4oYXV0b0Nsb3NlKTsgcmV0dXJuIHRoaXM7IH1cbiAgICBwdWJsaWMgcmVhZFJlY29yZEJhdGNoKGluZGV4OiBudW1iZXIpIHsgcmV0dXJuIHRoaXMuaW1wbC5yZWFkUmVjb3JkQmF0Y2goaW5kZXgpOyB9XG4gICAgcHVibGljIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKSB7IHJldHVybiAodGhpcy5pbXBsIGFzIEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4pW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpOyB9XG4gICAgcHVibGljIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHsgdGhyb3cgbmV3IEVycm9yKGBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlciBpcyBub3QgSXRlcmFibGVgKTsgfVxufVxuXG5hYnN0cmFjdCBjbGFzcyBSZWNvcmRCYXRjaFJlYWRlckltcGxCYXNlPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IHtcblxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgc2NoZW1hOiBTY2hlbWE7XG4gICAgcHVibGljIGNsb3NlZCA9IGZhbHNlO1xuICAgIHB1YmxpYyBhdXRvQ2xvc2UgPSB0cnVlO1xuICAgIHB1YmxpYyBkaWN0aW9uYXJ5SW5kZXggPSAwO1xuICAgIHB1YmxpYyByZWNvcmRCYXRjaEluZGV4ID0gMDtcbiAgICBwdWJsaWMgZGljdGlvbmFyaWVzOiBNYXA8bnVtYmVyLCBWZWN0b3I+O1xuICAgIHB1YmxpYyBnZXQgbnVtRGljdGlvbmFyaWVzKCkgeyByZXR1cm4gdGhpcy5kaWN0aW9uYXJ5SW5kZXg7IH1cbiAgICBwdWJsaWMgZ2V0IG51bVJlY29yZEJhdGNoZXMoKSB7IHJldHVybiB0aGlzLnJlY29yZEJhdGNoSW5kZXg7IH1cblxuICAgIGNvbnN0cnVjdG9yKGRpY3Rpb25hcmllcyA9IG5ldyBNYXA8bnVtYmVyLCBWZWN0b3I+KCkpIHtcbiAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMgPSBkaWN0aW9uYXJpZXM7XG4gICAgfVxuICAgIHB1YmxpYyByZXNldChzY2hlbWE/OiBTY2hlbWE8VD4gfCBudWxsKSB7XG4gICAgICAgIHRoaXMuZGljdGlvbmFyeUluZGV4ID0gMDtcbiAgICAgICAgdGhpcy5yZWNvcmRCYXRjaEluZGV4ID0gMDtcbiAgICAgICAgdGhpcy5zY2hlbWEgPSA8YW55PiBzY2hlbWE7XG4gICAgICAgIHRoaXMuZGljdGlvbmFyaWVzID0gbmV3IE1hcCgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHJvdGVjdGVkIF9sb2FkUmVjb3JkQmF0Y2goaGVhZGVyOiBtZXRhZGF0YS5SZWNvcmRCYXRjaCwgYm9keTogYW55KSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVjb3JkQmF0Y2g8VD4odGhpcy5zY2hlbWEsIGhlYWRlci5sZW5ndGgsIHRoaXMuX2xvYWRWZWN0b3JzKGhlYWRlciwgYm9keSwgdGhpcy5zY2hlbWEuZmllbGRzKSk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBfbG9hZERpY3Rpb25hcnlCYXRjaChoZWFkZXI6IG1ldGFkYXRhLkRpY3Rpb25hcnlCYXRjaCwgYm9keTogYW55KSB7XG4gICAgICAgIGNvbnN0IHsgaWQsIGlzRGVsdGEsIGRhdGEgfSA9IGhlYWRlcjtcbiAgICAgICAgY29uc3QgeyBkaWN0aW9uYXJpZXMsIHNjaGVtYSB9ID0gdGhpcztcbiAgICAgICAgaWYgKGlzRGVsdGEgfHwgIWRpY3Rpb25hcmllcy5nZXQoaWQpKSB7XG5cbiAgICAgICAgICAgIGNvbnN0IHR5cGUgPSBzY2hlbWEuZGljdGlvbmFyaWVzLmdldChpZCkhO1xuICAgICAgICAgICAgY29uc3QgdmVjdG9yID0gKGlzRGVsdGEgPyBkaWN0aW9uYXJpZXMuZ2V0KGlkKSEuY29uY2F0KFxuICAgICAgICAgICAgICAgIFZlY3Rvci5uZXcodGhpcy5fbG9hZFZlY3RvcnMoZGF0YSwgYm9keSwgW3R5cGVdKVswXSkpIDpcbiAgICAgICAgICAgICAgICBWZWN0b3IubmV3KHRoaXMuX2xvYWRWZWN0b3JzKGRhdGEsIGJvZHksIFt0eXBlXSlbMF0pKSBhcyBWZWN0b3I7XG5cbiAgICAgICAgICAgIChzY2hlbWEuZGljdGlvbmFyeUZpZWxkcy5nZXQoaWQpIHx8IFtdKS5mb3JFYWNoKCh7IHR5cGUgfSkgPT4gdHlwZS5kaWN0aW9uYXJ5VmVjdG9yID0gdmVjdG9yKTtcblxuICAgICAgICAgICAgcmV0dXJuIHZlY3RvcjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGljdGlvbmFyaWVzLmdldChpZCkhO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgX2xvYWRWZWN0b3JzKGhlYWRlcjogbWV0YWRhdGEuUmVjb3JkQmF0Y2gsIGJvZHk6IGFueSwgdHlwZXM6IChGaWVsZCB8IERhdGFUeXBlKVtdKSB7XG4gICAgICAgIHJldHVybiBuZXcgVmVjdG9yTG9hZGVyKGJvZHksIGhlYWRlci5ub2RlcywgaGVhZGVyLmJ1ZmZlcnMpLnZpc2l0TWFueSh0eXBlcyk7XG4gICAgfVxufVxuXG5jbGFzcyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT5cbiAgICBleHRlbmRzIFJlY29yZEJhdGNoUmVhZGVySW1wbEJhc2U8VD5cbiAgICAgICAgaW1wbGVtZW50cyBJUmVjb3JkQmF0Y2hSZWFkZXJJbXBsPFQ+LCBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7XG5cbiAgICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgcmVhZGVyOiBNZXNzYWdlUmVhZGVyLCBkaWN0aW9uYXJpZXMgPSBuZXcgTWFwPG51bWJlciwgVmVjdG9yPigpKSB7XG4gICAgICAgIHN1cGVyKGRpY3Rpb25hcmllcyk7XG4gICAgfVxuICAgIHB1YmxpYyBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7XG4gICAgICAgIHJldHVybiB0aGlzIGFzIEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+O1xuICAgIH1cbiAgICBwdWJsaWMgY2xvc2UoKSB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQgJiYgKHRoaXMuY2xvc2VkID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgIHRoaXMucmVzZXQoKS5yZWFkZXIucmV0dXJuKCk7XG4gICAgICAgICAgICB0aGlzLnJlYWRlciA9IDxhbnk+IG51bGw7XG4gICAgICAgICAgICB0aGlzLmRpY3Rpb25hcmllcyA9IDxhbnk+IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHB1YmxpYyBvcGVuKGF1dG9DbG9zZSA9IHRoaXMuYXV0b0Nsb3NlKSB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQpIHtcbiAgICAgICAgICAgIHRoaXMuYXV0b0Nsb3NlID0gYXV0b0Nsb3NlO1xuICAgICAgICAgICAgaWYgKCEodGhpcy5zY2hlbWEgfHwgKHRoaXMuc2NoZW1hID0gdGhpcy5yZWFkZXIucmVhZFNjaGVtYSgpISkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHVibGljIHRocm93KHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8YW55PiB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQgJiYgdGhpcy5hdXRvQ2xvc2UgJiYgKHRoaXMuY2xvc2VkID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlc2V0KCkucmVhZGVyLnRocm93KHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gSVRFUkFUT1JfRE9ORTtcbiAgICB9XG4gICAgcHVibGljIHJldHVybih2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PGFueT4ge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkICYmIHRoaXMuYXV0b0Nsb3NlICYmICh0aGlzLmNsb3NlZCA9IHRydWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZXNldCgpLnJlYWRlci5yZXR1cm4odmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBJVEVSQVRPUl9ET05FO1xuICAgIH1cbiAgICBwdWJsaWMgbmV4dCgpOiBJdGVyYXRvclJlc3VsdDxSZWNvcmRCYXRjaDxUPj4ge1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpIHsgcmV0dXJuIElURVJBVE9SX0RPTkU7IH1cbiAgICAgICAgbGV0IG1lc3NhZ2U6IE1lc3NhZ2UgfCBudWxsLCB7IHJlYWRlciB9ID0gdGhpcztcbiAgICAgICAgd2hpbGUgKG1lc3NhZ2UgPSB0aGlzLnJlYWROZXh0TWVzc2FnZUFuZFZhbGlkYXRlKCkpIHtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmlzU2NoZW1hKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlc2V0KG1lc3NhZ2UuaGVhZGVyKCkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmlzUmVjb3JkQmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVjb3JkQmF0Y2hJbmRleCsrO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IG1lc3NhZ2UuaGVhZGVyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gcmVhZGVyLnJlYWRNZXNzYWdlQm9keShtZXNzYWdlLmJvZHlMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZEJhdGNoID0gdGhpcy5fbG9hZFJlY29yZEJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBkb25lOiBmYWxzZSwgdmFsdWU6IHJlY29yZEJhdGNoIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuaXNEaWN0aW9uYXJ5QmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyeUluZGV4Kys7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSByZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdmVjdG9yID0gdGhpcy5fbG9hZERpY3Rpb25hcnlCYXRjaChoZWFkZXIsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMuc2V0KGhlYWRlci5pZCwgdmVjdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5yZXR1cm4oKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHJlYWROZXh0TWVzc2FnZUFuZFZhbGlkYXRlPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyPih0eXBlPzogVCB8IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVhZGVyLnJlYWRNZXNzYWdlPFQ+KHR5cGUpO1xuICAgIH1cbn1cblxuY2xhc3MgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT5cbiAgICBleHRlbmRzIFJlY29yZEJhdGNoUmVhZGVySW1wbEJhc2U8VD5cbiAgICAgICAgaW1wbGVtZW50cyBJUmVjb3JkQmF0Y2hSZWFkZXJJbXBsPFQ+LCBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHtcblxuICAgIGNvbnN0cnVjdG9yKHByb3RlY3RlZCByZWFkZXI6IEFzeW5jTWVzc2FnZVJlYWRlciwgZGljdGlvbmFyaWVzID0gbmV3IE1hcDxudW1iZXIsIFZlY3Rvcj4oKSkge1xuICAgICAgICBzdXBlcihkaWN0aW9uYXJpZXMpO1xuICAgIH1cbiAgICBwdWJsaWMgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMgYXMgQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PjtcbiAgICB9XG4gICAgcHVibGljIGFzeW5jIGNsb3NlKCkge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkICYmICh0aGlzLmNsb3NlZCA9IHRydWUpKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJlc2V0KCkucmVhZGVyLnJldHVybigpO1xuICAgICAgICAgICAgdGhpcy5yZWFkZXIgPSA8YW55PiBudWxsO1xuICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMgPSA8YW55PiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKSB7XG4gICAgICAgIC8vIGRlZmF1bHQgYXJncyBpbiBhbiBhc3luYyBmdW5jdGlvbiBjcmFzaCBjbG9zdXJlLWNvbXBpbGVyIGF0IHRoZSBtb21lbnRcbiAgICAgICAgLy8gc28gZG8gdGhpcyBpbnN0ZWFkLiBodHRwczovL2dpdGh1Yi5jb20vZ29vZ2xlL2Nsb3N1cmUtY29tcGlsZXIvaXNzdWVzLzMxNzhcbiAgICAgICAgYXV0b0Nsb3NlICE9PSB1bmRlZmluZWQgfHwgKGF1dG9DbG9zZSA9IHRoaXMuYXV0b0Nsb3NlKTtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCkge1xuICAgICAgICAgICAgdGhpcy5hdXRvQ2xvc2UgPSBhdXRvQ2xvc2U7XG4gICAgICAgICAgICBpZiAoISh0aGlzLnNjaGVtYSB8fCAodGhpcy5zY2hlbWEgPSAoYXdhaXQgdGhpcy5yZWFkZXIucmVhZFNjaGVtYSgpKSEpKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyB0aHJvdyh2YWx1ZT86IGFueSk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55Pj4ge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkICYmIHRoaXMuYXV0b0Nsb3NlICYmICh0aGlzLmNsb3NlZCA9IHRydWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZXNldCgpLnJlYWRlci50aHJvdyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIElURVJBVE9SX0RPTkU7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyByZXR1cm4odmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+IHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiB0aGlzLmF1dG9DbG9zZSAmJiAodGhpcy5jbG9zZWQgPSB0cnVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVzZXQoKS5yZWFkZXIucmV0dXJuKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gSVRFUkFUT1JfRE9ORTtcbiAgICB9XG4gICAgcHVibGljIGFzeW5jIG5leHQoKSB7XG4gICAgICAgIGlmICh0aGlzLmNsb3NlZCkgeyByZXR1cm4gSVRFUkFUT1JfRE9ORTsgfVxuICAgICAgICBsZXQgbWVzc2FnZTogTWVzc2FnZSB8IG51bGwsIHsgcmVhZGVyIH0gPSB0aGlzO1xuICAgICAgICB3aGlsZSAobWVzc2FnZSA9IGF3YWl0IHRoaXMucmVhZE5leHRNZXNzYWdlQW5kVmFsaWRhdGUoKSkge1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuaXNTY2hlbWEoKSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucmVzZXQobWVzc2FnZS5oZWFkZXIoKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuaXNSZWNvcmRCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWNvcmRCYXRjaEluZGV4Kys7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSBhd2FpdCByZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkQmF0Y2ggPSB0aGlzLl9sb2FkUmVjb3JkQmF0Y2goaGVhZGVyLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IGRvbmU6IGZhbHNlLCB2YWx1ZTogcmVjb3JkQmF0Y2ggfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5pc0RpY3Rpb25hcnlCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJ5SW5kZXgrKztcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBtZXNzYWdlLmhlYWRlcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IGF3YWl0IHJlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB2ZWN0b3IgPSB0aGlzLl9sb2FkRGljdGlvbmFyeUJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpY3Rpb25hcmllcy5zZXQoaGVhZGVyLmlkLCB2ZWN0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJldHVybigpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgYXN5bmMgcmVhZE5leHRNZXNzYWdlQW5kVmFsaWRhdGU8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KHR5cGU/OiBUIHwgbnVsbCkge1xuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2U8VD4odHlwZSk7XG4gICAgfVxufVxuXG5jbGFzcyBSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+XG4gICAgZXh0ZW5kcyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VD5cbiAgICAgICAgaW1wbGVtZW50cyBJUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUPiwgSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4ge1xuXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyBmb290ZXI6IEZvb3RlcjtcbiAgICBwdWJsaWMgZ2V0IG51bURpY3Rpb25hcmllcygpIHsgcmV0dXJuIHRoaXMuZm9vdGVyLm51bURpY3Rpb25hcmllczsgfVxuICAgIHB1YmxpYyBnZXQgbnVtUmVjb3JkQmF0Y2hlcygpIHsgcmV0dXJuIHRoaXMuZm9vdGVyLm51bVJlY29yZEJhdGNoZXM7IH1cblxuICAgIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBmaWxlOiBSYW5kb21BY2Nlc3NGaWxlLCBkaWN0aW9uYXJpZXMgPSBuZXcgTWFwPG51bWJlciwgVmVjdG9yPigpKSB7XG4gICAgICAgIHN1cGVyKG5ldyBNZXNzYWdlUmVhZGVyKGZpbGUpLCBkaWN0aW9uYXJpZXMpO1xuICAgIH1cbiAgICBwdWJsaWMgb3BlbihhdXRvQ2xvc2UgPSB0aGlzLmF1dG9DbG9zZSkge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkICYmICF0aGlzLmZvb3Rlcikge1xuICAgICAgICAgICAgdGhpcy5zY2hlbWEgPSAodGhpcy5mb290ZXIgPSB0aGlzLnJlYWRGb290ZXIoKSkuc2NoZW1hO1xuICAgICAgICAgICAgZm9yIChjb25zdCBibG9jayBvZiB0aGlzLmZvb3Rlci5kaWN0aW9uYXJ5QmF0Y2hlcygpKSB7XG4gICAgICAgICAgICAgICAgYmxvY2sgJiYgdGhpcy5yZWFkRGljdGlvbmFyeUJhdGNoKHRoaXMuZGljdGlvbmFyeUluZGV4KyspO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdXBlci5vcGVuKGF1dG9DbG9zZSk7XG4gICAgfVxuICAgIHB1YmxpYyByZWFkUmVjb3JkQmF0Y2goaW5kZXg6IG51bWJlcikge1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgICAgaWYgKCF0aGlzLmZvb3RlcikgeyB0aGlzLm9wZW4oKTsgfVxuICAgICAgICBjb25zdCBibG9jayA9IHRoaXMuZm9vdGVyLmdldFJlY29yZEJhdGNoKGluZGV4KTtcbiAgICAgICAgaWYgKGJsb2NrICYmIHRoaXMuZmlsZS5zZWVrKGJsb2NrLm9mZnNldCkpIHtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZShNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlICYmIG1lc3NhZ2UuaXNSZWNvcmRCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRCYXRjaCA9IHRoaXMuX2xvYWRSZWNvcmRCYXRjaChoZWFkZXIsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlY29yZEJhdGNoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgcmVhZERpY3Rpb25hcnlCYXRjaChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGJsb2NrID0gdGhpcy5mb290ZXIuZ2V0RGljdGlvbmFyeUJhdGNoKGluZGV4KTtcbiAgICAgICAgaWYgKGJsb2NrICYmIHRoaXMuZmlsZS5zZWVrKGJsb2NrLm9mZnNldCkpIHtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZShNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZSAmJiBtZXNzYWdlLmlzRGljdGlvbmFyeUJhdGNoKCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBtZXNzYWdlLmhlYWRlcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IHRoaXMucmVhZGVyLnJlYWRNZXNzYWdlQm9keShtZXNzYWdlLmJvZHlMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHZlY3RvciA9IHRoaXMuX2xvYWREaWN0aW9uYXJ5QmF0Y2goaGVhZGVyLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyaWVzLnNldChoZWFkZXIuaWQsIHZlY3Rvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcHJvdGVjdGVkIHJlYWRGb290ZXIoKSB7XG4gICAgICAgIGNvbnN0IHsgZmlsZSB9ID0gdGhpcztcbiAgICAgICAgY29uc3Qgc2l6ZSA9IGZpbGUuc2l6ZTtcbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0gc2l6ZSAtIG1hZ2ljQW5kUGFkZGluZztcbiAgICAgICAgY29uc3QgbGVuZ3RoID0gZmlsZS5yZWFkSW50MzIob2Zmc2V0KTtcbiAgICAgICAgY29uc3QgYnVmZmVyID0gZmlsZS5yZWFkQXQob2Zmc2V0IC0gbGVuZ3RoLCBsZW5ndGgpO1xuICAgICAgICByZXR1cm4gRm9vdGVyLmRlY29kZShidWZmZXIpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgcmVhZE5leHRNZXNzYWdlQW5kVmFsaWRhdGU8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KHR5cGU/OiBUIHwgbnVsbCk6IE1lc3NhZ2U8VD4gfCBudWxsIHtcbiAgICAgICAgaWYgKCF0aGlzLmZvb3RlcikgeyB0aGlzLm9wZW4oKTsgfVxuICAgICAgICBpZiAodGhpcy5yZWNvcmRCYXRjaEluZGV4IDwgdGhpcy5udW1SZWNvcmRCYXRjaGVzKSB7XG4gICAgICAgICAgICBjb25zdCBibG9jayA9IHRoaXMuZm9vdGVyLmdldFJlY29yZEJhdGNoKHRoaXMucmVjb3JkQmF0Y2hJbmRleCk7XG4gICAgICAgICAgICBpZiAoYmxvY2sgJiYgdGhpcy5maWxlLnNlZWsoYmxvY2sub2Zmc2V0KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZSh0eXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG59XG5cbmNsYXNzIEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PlxuICAgIGV4dGVuZHMgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VD5cbiAgICAgICAgaW1wbGVtZW50cyBJUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUPiwgQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7XG5cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIGZvb3RlcjogRm9vdGVyO1xuICAgIHB1YmxpYyBnZXQgbnVtRGljdGlvbmFyaWVzKCkgeyByZXR1cm4gdGhpcy5mb290ZXIubnVtRGljdGlvbmFyaWVzOyB9XG4gICAgcHVibGljIGdldCBudW1SZWNvcmRCYXRjaGVzKCkgeyByZXR1cm4gdGhpcy5mb290ZXIubnVtUmVjb3JkQmF0Y2hlczsgfVxuXG4gICAgY29uc3RydWN0b3IocHJvdGVjdGVkIGZpbGU6IEFzeW5jUmFuZG9tQWNjZXNzRmlsZSwgZGljdGlvbmFyaWVzID0gbmV3IE1hcDxudW1iZXIsIFZlY3Rvcj4oKSkge1xuICAgICAgICBzdXBlcihuZXcgQXN5bmNNZXNzYWdlUmVhZGVyKGZpbGUpLCBkaWN0aW9uYXJpZXMpO1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKSB7XG4gICAgICAgIC8vIGRlZmF1bHQgYXJncyBpbiBhbiBhc3luYyBmdW5jdGlvbiBjcmFzaCBjbG9zdXJlLWNvbXBpbGVyIGF0IHRoZSBtb21lbnRcbiAgICAgICAgLy8gc28gZG8gdGhpcyBpbnN0ZWFkLiBodHRwczovL2dpdGh1Yi5jb20vZ29vZ2xlL2Nsb3N1cmUtY29tcGlsZXIvaXNzdWVzLzMxNzhcbiAgICAgICAgYXV0b0Nsb3NlICE9PSB1bmRlZmluZWQgfHwgKGF1dG9DbG9zZSA9IHRoaXMuYXV0b0Nsb3NlKTtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiAhdGhpcy5mb290ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuc2NoZW1hID0gKHRoaXMuZm9vdGVyID0gYXdhaXQgdGhpcy5yZWFkRm9vdGVyKCkpLnNjaGVtYTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgYmxvY2sgb2YgdGhpcy5mb290ZXIuZGljdGlvbmFyeUJhdGNoZXMoKSkge1xuICAgICAgICAgICAgICAgIGJsb2NrICYmIHRoaXMucmVhZERpY3Rpb25hcnlCYXRjaCh0aGlzLmRpY3Rpb25hcnlJbmRleCsrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXdhaXQgc3VwZXIub3BlbihhdXRvQ2xvc2UpO1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgcmVhZFJlY29yZEJhdGNoKGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgaWYgKHRoaXMuY2xvc2VkKSB7IHJldHVybiBudWxsOyB9XG4gICAgICAgIGlmICghdGhpcy5mb290ZXIpIHsgYXdhaXQgdGhpcy5vcGVuKCk7IH1cbiAgICAgICAgY29uc3QgYmxvY2sgPSB0aGlzLmZvb3Rlci5nZXRSZWNvcmRCYXRjaChpbmRleCk7XG4gICAgICAgIGlmIChibG9jayAmJiAoYXdhaXQgdGhpcy5maWxlLnNlZWsoYmxvY2sub2Zmc2V0KSkpIHtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBhd2FpdCB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZShNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlICYmIG1lc3NhZ2UuaXNSZWNvcmRCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSBhd2FpdCB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRCYXRjaCA9IHRoaXMuX2xvYWRSZWNvcmRCYXRjaChoZWFkZXIsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlY29yZEJhdGNoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgYXN5bmMgcmVhZERpY3Rpb25hcnlCYXRjaChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGJsb2NrID0gdGhpcy5mb290ZXIuZ2V0RGljdGlvbmFyeUJhdGNoKGluZGV4KTtcbiAgICAgICAgaWYgKGJsb2NrICYmIChhd2FpdCB0aGlzLmZpbGUuc2VlayhibG9jay5vZmZzZXQpKSkge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGF3YWl0IHRoaXMucmVhZGVyLnJlYWRNZXNzYWdlKE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlICYmIG1lc3NhZ2UuaXNEaWN0aW9uYXJ5QmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IG1lc3NhZ2UuaGVhZGVyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdmVjdG9yID0gdGhpcy5fbG9hZERpY3Rpb25hcnlCYXRjaChoZWFkZXIsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMuc2V0KGhlYWRlci5pZCwgdmVjdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBwcm90ZWN0ZWQgYXN5bmMgcmVhZEZvb3RlcigpIHtcbiAgICAgICAgY29uc3QgeyBmaWxlIH0gPSB0aGlzO1xuICAgICAgICBjb25zdCBvZmZzZXQgPSBmaWxlLnNpemUgLSBtYWdpY0FuZFBhZGRpbmc7XG4gICAgICAgIGNvbnN0IGxlbmd0aCA9IGF3YWl0IGZpbGUucmVhZEludDMyKG9mZnNldCk7XG4gICAgICAgIGNvbnN0IGJ1ZmZlciA9IGF3YWl0IGZpbGUucmVhZEF0KG9mZnNldCAtIGxlbmd0aCwgbGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIEZvb3Rlci5kZWNvZGUoYnVmZmVyKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIGFzeW5jIHJlYWROZXh0TWVzc2FnZUFuZFZhbGlkYXRlPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyPih0eXBlPzogVCB8IG51bGwpOiBQcm9taXNlPE1lc3NhZ2U8VD4gfCBudWxsPiB7XG4gICAgICAgIGlmICghdGhpcy5mb290ZXIpIHsgYXdhaXQgdGhpcy5vcGVuKCk7IH1cbiAgICAgICAgaWYgKHRoaXMucmVjb3JkQmF0Y2hJbmRleCA8IHRoaXMubnVtUmVjb3JkQmF0Y2hlcykge1xuICAgICAgICAgICAgY29uc3QgYmxvY2sgPSB0aGlzLmZvb3Rlci5nZXRSZWNvcmRCYXRjaCh0aGlzLnJlY29yZEJhdGNoSW5kZXgpO1xuICAgICAgICAgICAgaWYgKGJsb2NrICYmIGF3YWl0IHRoaXMuZmlsZS5zZWVrKGJsb2NrLm9mZnNldCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2UodHlwZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufVxuXG5jbGFzcyBSZWNvcmRCYXRjaEpTT05SZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+IHtcbiAgICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgcmVhZGVyOiBKU09OTWVzc2FnZVJlYWRlciwgZGljdGlvbmFyaWVzID0gbmV3IE1hcDxudW1iZXIsIFZlY3Rvcj4oKSkge1xuICAgICAgICBzdXBlcihyZWFkZXIsIGRpY3Rpb25hcmllcyk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBfbG9hZFZlY3RvcnMoaGVhZGVyOiBtZXRhZGF0YS5SZWNvcmRCYXRjaCwgYm9keTogYW55LCB0eXBlczogKEZpZWxkIHwgRGF0YVR5cGUpW10pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBKU09OVmVjdG9yTG9hZGVyKGJvZHksIGhlYWRlci5ub2RlcywgaGVhZGVyLmJ1ZmZlcnMpLnZpc2l0TWFueSh0eXBlcyk7XG4gICAgfVxufVxuXG5pbnRlcmZhY2UgSVJlY29yZEJhdGNoUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiB7XG5cbiAgICBjbG9zZWQ6IGJvb2xlYW47XG4gICAgc2NoZW1hOiBTY2hlbWE8VD47XG4gICAgYXV0b0Nsb3NlOiBib29sZWFuO1xuICAgIG51bURpY3Rpb25hcmllczogbnVtYmVyO1xuICAgIG51bVJlY29yZEJhdGNoZXM6IG51bWJlcjtcbiAgICBkaWN0aW9uYXJpZXM6IE1hcDxudW1iZXIsIFZlY3Rvcj47XG5cbiAgICBvcGVuKGF1dG9DbG9zZT86IGJvb2xlYW4pOiB0aGlzIHwgUHJvbWlzZTx0aGlzPjtcbiAgICByZXNldChzY2hlbWE/OiBTY2hlbWE8VD4gfCBudWxsKTogdGhpcztcbiAgICBjbG9zZSgpOiB0aGlzIHwgUHJvbWlzZTx0aGlzPjtcblxuICAgIFtTeW1ib2wuaXRlcmF0b3JdPygpOiBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PjtcbiAgICBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdPygpOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+O1xuXG4gICAgdGhyb3codmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxhbnk+IHwgUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxhbnk+PjtcbiAgICByZXR1cm4odmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxhbnk+IHwgUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxhbnk+PjtcbiAgICBuZXh0KHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8UmVjb3JkQmF0Y2g8VD4+IHwgUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxSZWNvcmRCYXRjaDxUPj4+O1xufVxuXG5pbnRlcmZhY2UgSVJlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBJUmVjb3JkQmF0Y2hSZWFkZXJJbXBsPFQ+IHtcblxuICAgIGZvb3RlcjogRm9vdGVyO1xuXG4gICAgcmVhZFJlY29yZEJhdGNoKGluZGV4OiBudW1iZXIpOiBSZWNvcmRCYXRjaDxUPiB8IG51bGwgfCBQcm9taXNlPFJlY29yZEJhdGNoPFQ+IHwgbnVsbD47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IHtcbiAgICBjYW5jZWwoKTogdm9pZDtcbiAgICBvcGVuKGF1dG9DbG9zZT86IGJvb2xlYW4pOiB0aGlzO1xuICAgIHRocm93KHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8YW55PjtcbiAgICByZXR1cm4odmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxhbnk+O1xuICAgIG5leHQodmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxSZWNvcmRCYXRjaDxUPj47XG4gICAgcmVhZFJlY29yZEJhdGNoKGluZGV4OiBudW1iZXIpOiBSZWNvcmRCYXRjaDxUPiB8IG51bGw7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4ge1xuICAgIGNhbmNlbCgpOiB2b2lkO1xuICAgIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbik6IHRoaXM7XG4gICAgdGhyb3codmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxhbnk+O1xuICAgIHJldHVybih2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PGFueT47XG4gICAgbmV4dCh2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PFJlY29yZEJhdGNoPFQ+Pjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiB7XG4gICAgY2FuY2VsKCk6IFByb21pc2U8dm9pZD47XG4gICAgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKTogUHJvbWlzZTx0aGlzPjtcbiAgICB0aHJvdyh2YWx1ZT86IGFueSk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55Pj47XG4gICAgcmV0dXJuKHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxhbnk+PjtcbiAgICBuZXh0KHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxSZWNvcmRCYXRjaDxUPj4+O1xuICAgIHJlYWRSZWNvcmRCYXRjaChpbmRleDogbnVtYmVyKTogUHJvbWlzZTxSZWNvcmRCYXRjaDxUPiB8IG51bGw+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4ge1xuICAgIGNhbmNlbCgpOiBQcm9taXNlPHZvaWQ+O1xuICAgIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbik6IFByb21pc2U8dGhpcz47XG4gICAgdGhyb3codmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+O1xuICAgIHJldHVybih2YWx1ZT86IGFueSk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55Pj47XG4gICAgbmV4dCh2YWx1ZT86IGFueSk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8UmVjb3JkQmF0Y2g8VD4+Pjtcbn1cbiJdfQ==

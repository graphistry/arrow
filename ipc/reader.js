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
    toReadableDOMStream() {
        return adapters_1.default.toReadableDOMStream((this.isSync()
            ? { [Symbol.iterator]: () => this }
            : { [Symbol.asyncIterator]: () => this }));
    }
    toReadableNodeStream() {
        return adapters_1.default.toReadableNodeStream((this.isSync()
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
        else if (compat_1.isArrowJSON(source)) {
            return RecordBatchReader.fromJSON(source);
        }
        else if (compat_1.isFileHandle(source)) {
            return RecordBatchReader.fromFileHandle(source);
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
                    block && (yield this.readDictionaryBatch(this.dictionaryIndex++));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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Q0FBQztDQUNKIiwiZmlsZSI6ImlwYy9yZWFkZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgRGF0YVR5cGUgfSBmcm9tICcuLi90eXBlJztcbmltcG9ydCB7IFZlY3RvciB9IGZyb20gJy4uL3ZlY3Rvcic7XG5pbXBvcnQgeyBNZXNzYWdlSGVhZGVyIH0gZnJvbSAnLi4vZW51bSc7XG5pbXBvcnQgeyBGb290ZXIgfSBmcm9tICcuL21ldGFkYXRhL2ZpbGUnO1xuaW1wb3J0IHsgU2NoZW1hLCBGaWVsZCB9IGZyb20gJy4uL3NjaGVtYSc7XG5pbXBvcnQgc3RyZWFtQWRhcHRlcnMgZnJvbSAnLi4vaW8vYWRhcHRlcnMnO1xuaW1wb3J0IHsgTWVzc2FnZSB9IGZyb20gJy4vbWV0YWRhdGEvbWVzc2FnZSc7XG5pbXBvcnQgeyBSZWNvcmRCYXRjaCB9IGZyb20gJy4uL3JlY29yZGJhdGNoJztcbmltcG9ydCAqIGFzIG1ldGFkYXRhIGZyb20gJy4vbWV0YWRhdGEvbWVzc2FnZSc7XG5pbXBvcnQgeyBCeXRlU3RyZWFtLCBBc3luY0J5dGVTdHJlYW0gfSBmcm9tICcuLi9pby9zdHJlYW0nO1xuaW1wb3J0IHsgQXJyYXlCdWZmZXJWaWV3SW5wdXQsIHRvVWludDhBcnJheSB9IGZyb20gJy4uL3V0aWwvYnVmZmVyJztcbmltcG9ydCB7IFJhbmRvbUFjY2Vzc0ZpbGUsIEFzeW5jUmFuZG9tQWNjZXNzRmlsZSB9IGZyb20gJy4uL2lvL2ZpbGUnO1xuaW1wb3J0IHsgVmVjdG9yTG9hZGVyLCBKU09OVmVjdG9yTG9hZGVyIH0gZnJvbSAnLi4vdmlzaXRvci92ZWN0b3Jsb2FkZXInO1xuaW1wb3J0IHsgQXJyb3dKU09OLCBBcnJvd0pTT05MaWtlLCBGaWxlSGFuZGxlLCBSZWFkYWJsZUludGVyb3AsIElURVJBVE9SX0RPTkUgfSBmcm9tICcuLi9pby9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGlzUHJvbWlzZSwgaXNBcnJvd0pTT04sIGlzRmlsZUhhbmRsZSwgaXNGZXRjaFJlc3BvbnNlLCBpc0FzeW5jSXRlcmFibGUsIGlzUmVhZGFibGVET01TdHJlYW0sIGlzUmVhZGFibGVOb2RlU3RyZWFtIH0gZnJvbSAnLi4vdXRpbC9jb21wYXQnO1xuaW1wb3J0IHsgTWVzc2FnZVJlYWRlciwgQXN5bmNNZXNzYWdlUmVhZGVyLCBjaGVja0Zvck1hZ2ljQXJyb3dTdHJpbmcsIG1hZ2ljTGVuZ3RoLCBtYWdpY0FuZFBhZGRpbmcsIG1hZ2ljWDJBbmRQYWRkaW5nLCBKU09OTWVzc2FnZVJlYWRlciB9IGZyb20gJy4vbWVzc2FnZSc7XG5cbmV4cG9ydCB0eXBlIEZyb21BcmcwID0gQXJyb3dKU09OTGlrZTtcbmV4cG9ydCB0eXBlIEZyb21BcmcxID0gUHJvbWlzZUxpa2U8QXJyb3dKU09OTGlrZT47XG5leHBvcnQgdHlwZSBGcm9tQXJnMiA9IEl0ZXJhYmxlPEFycmF5QnVmZmVyVmlld0lucHV0PiB8IEFycmF5QnVmZmVyVmlld0lucHV0O1xuZXhwb3J0IHR5cGUgRnJvbUFyZzMgPSBQcm9taXNlTGlrZTxJdGVyYWJsZTxBcnJheUJ1ZmZlclZpZXdJbnB1dD4gfCBBcnJheUJ1ZmZlclZpZXdJbnB1dD47XG5leHBvcnQgdHlwZSBGcm9tQXJnNCA9IE5vZGVKUy5SZWFkYWJsZVN0cmVhbSB8IFJlYWRhYmxlU3RyZWFtPEFycmF5QnVmZmVyVmlld0lucHV0PiB8IEFzeW5jSXRlcmFibGU8QXJyYXlCdWZmZXJWaWV3SW5wdXQ+O1xuZXhwb3J0IHR5cGUgRnJvbUFyZzUgPSBSZXNwb25zZSB8IEZpbGVIYW5kbGUgfCBQcm9taXNlTGlrZTxGaWxlSGFuZGxlPiB8IFByb21pc2VMaWtlPFJlc3BvbnNlPjtcbmV4cG9ydCB0eXBlIEZyb21BcmdzID0gRnJvbUFyZzAgfCBGcm9tQXJnMSB8IEZyb21BcmcyIHwgRnJvbUFyZzMgfCBGcm9tQXJnNCB8IEZyb21Bcmc1O1xuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgUmVjb3JkQmF0Y2hSZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWFkYWJsZUludGVyb3A8UmVjb3JkQmF0Y2g8VD4+IHtcblxuICAgIHByb3RlY3RlZCBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgaW1wbDogSVJlY29yZEJhdGNoUmVhZGVySW1wbDxUPikgeyBzdXBlcigpOyB9XG5cbiAgICBwdWJsaWMgZ2V0IGNsb3NlZCgpIHsgcmV0dXJuIHRoaXMuaW1wbC5jbG9zZWQ7IH1cbiAgICBwdWJsaWMgZ2V0IHNjaGVtYSgpIHsgcmV0dXJuIHRoaXMuaW1wbC5zY2hlbWE7IH1cbiAgICBwdWJsaWMgZ2V0IGF1dG9DbG9zZSgpIHsgcmV0dXJuIHRoaXMuaW1wbC5hdXRvQ2xvc2U7IH1cbiAgICBwdWJsaWMgZ2V0IGRpY3Rpb25hcmllcygpIHsgcmV0dXJuIHRoaXMuaW1wbC5kaWN0aW9uYXJpZXM7IH1cbiAgICBwdWJsaWMgZ2V0IG51bURpY3Rpb25hcmllcygpIHsgcmV0dXJuIHRoaXMuaW1wbC5udW1EaWN0aW9uYXJpZXM7IH1cbiAgICBwdWJsaWMgZ2V0IG51bVJlY29yZEJhdGNoZXMoKSB7IHJldHVybiB0aGlzLmltcGwubnVtUmVjb3JkQmF0Y2hlczsgfVxuXG4gICAgcHVibGljIG5leHQodmFsdWU/OiBhbnkpIHsgcmV0dXJuIHRoaXMuaW1wbC5uZXh0KHZhbHVlKTsgfVxuICAgIHB1YmxpYyB0aHJvdyh2YWx1ZT86IGFueSkgeyByZXR1cm4gdGhpcy5pbXBsLnRocm93KHZhbHVlKTsgfVxuICAgIHB1YmxpYyByZXR1cm4odmFsdWU/OiBhbnkpIHsgcmV0dXJuIHRoaXMuaW1wbC5yZXR1cm4odmFsdWUpOyB9XG4gICAgcHVibGljIHJlc2V0KHNjaGVtYT86IFNjaGVtYTxUPiB8IG51bGwpIHsgdGhpcy5pbXBsLnJlc2V0KHNjaGVtYSk7IHJldHVybiB0aGlzOyB9XG5cbiAgICBwdWJsaWMgYWJzdHJhY3QgY2FuY2VsKCk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+O1xuICAgIHB1YmxpYyBhYnN0cmFjdCBvcGVuKGF1dG9DbG9zZT86IGJvb2xlYW4pOiB0aGlzIHwgUHJvbWlzZTx0aGlzPjtcbiAgICBwdWJsaWMgYWJzdHJhY3QgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj47XG4gICAgcHVibGljIGFic3RyYWN0IFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PjtcblxuICAgIHB1YmxpYyB0b1JlYWRhYmxlRE9NU3RyZWFtKCkge1xuICAgICAgICByZXR1cm4gc3RyZWFtQWRhcHRlcnMudG9SZWFkYWJsZURPTVN0cmVhbTxSZWNvcmRCYXRjaDxUPj4oXG4gICAgICAgICAgICAodGhpcy5pc1N5bmMoKVxuICAgICAgICAgICAgICAgID8geyBbU3ltYm9sLml0ZXJhdG9yXTogKCkgPT4gdGhpcyB9IGFzIEl0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+PlxuICAgICAgICAgICAgICAgIDogeyBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdOiAoKSA9PiB0aGlzIH0gYXMgQXN5bmNJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj4pKTtcbiAgICB9XG4gICAgcHVibGljIHRvUmVhZGFibGVOb2RlU3RyZWFtKCkge1xuICAgICAgICByZXR1cm4gc3RyZWFtQWRhcHRlcnMudG9SZWFkYWJsZU5vZGVTdHJlYW08UmVjb3JkQmF0Y2g8VD4+KFxuICAgICAgICAgICAgKHRoaXMuaXNTeW5jKClcbiAgICAgICAgICAgICAgICA/IHsgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IHRoaXMgfSBhcyBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj5cbiAgICAgICAgICAgICAgICA6IHsgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXTogKCkgPT4gdGhpcyB9IGFzIEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KSxcbiAgICAgICAgICAgIHsgb2JqZWN0TW9kZTogdHJ1ZSB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgaXNTeW5jKCk6IHRoaXMgaXMgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4ge1xuICAgICAgICByZXR1cm4gKHRoaXMgaW5zdGFuY2VvZiBSZWNvcmRCYXRjaEZpbGVSZWFkZXIpIHx8ICh0aGlzIGluc3RhbmNlb2YgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXIpO1xuICAgIH1cbiAgICBwdWJsaWMgaXNBc3luYygpOiB0aGlzIGlzIEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPiB7XG4gICAgICAgIHJldHVybiAodGhpcyBpbnN0YW5jZW9mIEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyKSB8fCAodGhpcyBpbnN0YW5jZW9mIEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXIpO1xuICAgIH1cbiAgICBwdWJsaWMgaXNGaWxlKCk6IHRoaXMgaXMgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4ge1xuICAgICAgICByZXR1cm4gKHRoaXMgaW5zdGFuY2VvZiBSZWNvcmRCYXRjaEZpbGVSZWFkZXIpIHx8ICh0aGlzIGluc3RhbmNlb2YgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXIpO1xuICAgIH1cbiAgICBwdWJsaWMgaXNTdHJlYW0oKTogdGhpcyBpcyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPiB8IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4ge1xuICAgICAgICByZXR1cm4gKHRoaXMgaW5zdGFuY2VvZiBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcikgfHwgKHRoaXMgaW5zdGFuY2VvZiBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyKTtcbiAgICB9XG5cbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIHRocm91Z2hOb2RlKCk6IGltcG9ydCgnc3RyZWFtJykuRHVwbGV4IHsgdGhyb3cgbmV3IEVycm9yKGBcInRocm91Z2hOb2RlXCIgbm90IGF2YWlsYWJsZSBpbiB0aGlzIGVudmlyb25tZW50YCk7IH1cbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIHRocm91Z2hET008VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfT4oKTogeyB3cml0YWJsZTogV3JpdGFibGVTdHJlYW08VWludDhBcnJheT4sIHJlYWRhYmxlOiBSZWFkYWJsZVN0cmVhbTxSZWNvcmRCYXRjaDxUPj4gfSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgXCJ0aHJvdWdoRE9NXCIgbm90IGF2YWlsYWJsZSBpbiB0aGlzIGVudmlyb25tZW50YCk7XG4gICAgfVxuXG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlcj4oc291cmNlOiBUKTogVDtcbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBGcm9tQXJnMCk6IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IEZyb21BcmcxKTogUHJvbWlzZTxSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPj47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogRnJvbUFyZzIpOiBSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4gfCBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBGcm9tQXJnMyk6IFByb21pc2U8UmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IEZyb21Bcmc0KTogUHJvbWlzZTxSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4gfCBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+PjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBGcm9tQXJnNSk6IFByb21pc2U8QXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4gfCBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+PjtcbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBhbnkpIHtcbiAgICAgICAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIFJlY29yZEJhdGNoUmVhZGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gc291cmNlO1xuICAgICAgICB9IGVsc2UgaWYgKGlzQXJyb3dKU09OKHNvdXJjZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBSZWNvcmRCYXRjaFJlYWRlci5mcm9tSlNPTjxUPihzb3VyY2UpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRmlsZUhhbmRsZShzb3VyY2UpKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVjb3JkQmF0Y2hSZWFkZXIuZnJvbUZpbGVIYW5kbGU8VD4oc291cmNlKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1Byb21pc2U8YW55Pihzb3VyY2UpKSB7XG4gICAgICAgICAgICByZXR1cm4gKGFzeW5jICgpID0+IGF3YWl0IFJlY29yZEJhdGNoUmVhZGVyLmZyb208YW55Pihhd2FpdCBzb3VyY2UpKSgpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRmV0Y2hSZXNwb25zZShzb3VyY2UpIHx8IGlzUmVhZGFibGVET01TdHJlYW0oc291cmNlKSB8fCBpc1JlYWRhYmxlTm9kZVN0cmVhbShzb3VyY2UpIHx8IGlzQXN5bmNJdGVyYWJsZShzb3VyY2UpKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVjb3JkQmF0Y2hSZWFkZXIuZnJvbUFzeW5jQnl0ZVN0cmVhbTxUPihuZXcgQXN5bmNCeXRlU3RyZWFtKHNvdXJjZSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBSZWNvcmRCYXRjaFJlYWRlci5mcm9tQnl0ZVN0cmVhbTxUPihuZXcgQnl0ZVN0cmVhbShzb3VyY2UpKTtcbiAgICB9XG4gICAgcHJpdmF0ZSBzdGF0aWMgZnJvbUpTT048VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfT4oc291cmNlOiBBcnJvd0pTT05MaWtlKSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4obmV3IEFycm93SlNPTihzb3VyY2UpKTtcbiAgICB9XG4gICAgcHJpdmF0ZSBzdGF0aWMgZnJvbUJ5dGVTdHJlYW08VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfT4oc291cmNlOiBCeXRlU3RyZWFtKSB7XG4gICAgICAgIGNvbnN0IGJ5dGVzID0gc291cmNlLnBlZWsoKG1hZ2ljTGVuZ3RoICsgNykgJiB+Nyk7XG4gICAgICAgIHJldHVybiBieXRlcyAmJiBieXRlcy5ieXRlTGVuZ3RoID49IDRcbiAgICAgICAgICAgID8gY2hlY2tGb3JNYWdpY0Fycm93U3RyaW5nKGJ5dGVzKVxuICAgICAgICAgICAgPyBuZXcgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+KHNvdXJjZS5yZWFkKCkpXG4gICAgICAgICAgICA6IG5ldyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPihzb3VyY2UpXG4gICAgICAgICAgICA6IG5ldyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPihmdW5jdGlvbiooKTogYW55IHt9KCkpO1xuICAgIH1cbiAgICBwcml2YXRlIHN0YXRpYyBhc3luYyBmcm9tQXN5bmNCeXRlU3RyZWFtPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0+KHNvdXJjZTogQXN5bmNCeXRlU3RyZWFtKSB7XG4gICAgICAgIGNvbnN0IGJ5dGVzID0gYXdhaXQgc291cmNlLnBlZWsoKG1hZ2ljTGVuZ3RoICsgNykgJiB+Nyk7XG4gICAgICAgIHJldHVybiBieXRlcyAmJiBieXRlcy5ieXRlTGVuZ3RoID49IDRcbiAgICAgICAgICAgID8gY2hlY2tGb3JNYWdpY0Fycm93U3RyaW5nKGJ5dGVzKVxuICAgICAgICAgICAgPyBuZXcgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+KGF3YWl0IHNvdXJjZS5yZWFkKCkpXG4gICAgICAgICAgICA6IG5ldyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+KHNvdXJjZSlcbiAgICAgICAgICAgIDogbmV3IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4oYXN5bmMgZnVuY3Rpb24qKCk6IGFueSB7fSgpKTtcbiAgICB9XG4gICAgcHJpdmF0ZSBzdGF0aWMgYXN5bmMgZnJvbUZpbGVIYW5kbGU8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfT4oc291cmNlOiBGaWxlSGFuZGxlKSB7XG4gICAgICAgIGNvbnN0IHsgc2l6ZSB9ID0gYXdhaXQgc291cmNlLnN0YXQoKTtcbiAgICAgICAgY29uc3QgZmlsZSA9IG5ldyBBc3luY1JhbmRvbUFjY2Vzc0ZpbGUoc291cmNlLCBzaXplKTtcbiAgICAgICAgaWYgKHNpemUgPj0gbWFnaWNYMkFuZFBhZGRpbmcpIHtcbiAgICAgICAgICAgIGlmIChjaGVja0Zvck1hZ2ljQXJyb3dTdHJpbmcoYXdhaXQgZmlsZS5yZWFkQXQoMCwgKG1hZ2ljTGVuZ3RoICsgNykgJiB+NykpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcjxUPihmaWxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4oZmlsZSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXI8VD4ge1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwcm90ZWN0ZWQgaW1wbDogUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUPjtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUPik7XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBSYW5kb21BY2Nlc3NGaWxlLCBkaWN0aW9uYXJpZXM/OiBNYXA8bnVtYmVyLCBWZWN0b3I+KTtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEFycmF5QnVmZmVyVmlld0lucHV0LCBkaWN0aW9uYXJpZXM/OiBNYXA8bnVtYmVyLCBWZWN0b3I+KTtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUPiB8IFJhbmRvbUFjY2Vzc0ZpbGUgfCBBcnJheUJ1ZmZlclZpZXdJbnB1dCwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgVmVjdG9yPikge1xuICAgICAgICBpZiAoc291cmNlIGluc3RhbmNlb2YgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsKSB7XG4gICAgICAgICAgICBzdXBlcihzb3VyY2UpO1xuICAgICAgICB9IGVsc2UgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIFJhbmRvbUFjY2Vzc0ZpbGUpIHtcbiAgICAgICAgICAgIHN1cGVyKG5ldyBSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsKHNvdXJjZSwgZGljdGlvbmFyaWVzKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdXBlcihuZXcgUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbChuZXcgUmFuZG9tQWNjZXNzRmlsZSh0b1VpbnQ4QXJyYXkoc291cmNlKSksIGRpY3Rpb25hcmllcykpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHB1YmxpYyBnZXQgZm9vdGVyKCkgeyByZXR1cm4gdGhpcy5pbXBsLmZvb3RlcjsgfVxuICAgIHB1YmxpYyBjYW5jZWwoKSB7IHRoaXMuaW1wbC5jbG9zZSgpOyB9XG4gICAgcHVibGljIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbikgeyB0aGlzLmltcGwub3BlbihhdXRvQ2xvc2UpOyByZXR1cm4gdGhpczsgfVxuICAgIHB1YmxpYyByZWFkUmVjb3JkQmF0Y2goaW5kZXg6IG51bWJlcikgeyByZXR1cm4gdGhpcy5pbXBsLnJlYWRSZWNvcmRCYXRjaChpbmRleCk7IH1cbiAgICBwdWJsaWMgW1N5bWJvbC5pdGVyYXRvcl0oKSB7IHJldHVybiAodGhpcy5pbXBsIGFzIEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+KVtTeW1ib2wuaXRlcmF0b3JdKCk7IH1cbiAgICBwdWJsaWMgYXN5bmMgKltTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7IHlpZWxkKiB0aGlzW1N5bWJvbC5pdGVyYXRvcl0oKTsgfVxufVxuXG5leHBvcnQgY2xhc3MgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlcjxUPiB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHByb3RlY3RlZCBpbXBsOiBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VD47XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBCeXRlU3RyZWFtIHwgQXJyb3dKU09OIHwgQXJyYXlCdWZmZXJWaWV3IHwgSXRlcmFibGU8QXJyYXlCdWZmZXJWaWV3PiwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgVmVjdG9yPikge1xuICAgICAgICBzdXBlcihpc0Fycm93SlNPTihzb3VyY2UpXG4gICAgICAgICAgICA/IG5ldyBSZWNvcmRCYXRjaEpTT05SZWFkZXJJbXBsKG5ldyBKU09OTWVzc2FnZVJlYWRlcihzb3VyY2UpLCBkaWN0aW9uYXJpZXMpXG4gICAgICAgICAgICA6IG5ldyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGwobmV3IE1lc3NhZ2VSZWFkZXIoc291cmNlKSwgZGljdGlvbmFyaWVzKSk7XG4gICAgfVxuICAgIHB1YmxpYyBjYW5jZWwoKSB7IHRoaXMuaW1wbC5jbG9zZSgpOyB9XG4gICAgcHVibGljIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbikgeyB0aGlzLmltcGwub3BlbihhdXRvQ2xvc2UpOyByZXR1cm4gdGhpczsgfVxuICAgIHB1YmxpYyBbU3ltYm9sLml0ZXJhdG9yXSgpIHsgcmV0dXJuICh0aGlzLmltcGwgYXMgSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4pW1N5bWJvbC5pdGVyYXRvcl0oKTsgfVxuICAgIHB1YmxpYyBhc3luYyAqW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHsgeWllbGQqIHRoaXNbU3ltYm9sLml0ZXJhdG9yXSgpOyB9XG59XG5cbmV4cG9ydCBjbGFzcyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXI8VD4ge1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwcm90ZWN0ZWQgaW1wbDogQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VD47XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBBc3luY0J5dGVTdHJlYW0gfCBGaWxlSGFuZGxlIHwgTm9kZUpTLlJlYWRhYmxlU3RyZWFtIHwgUmVhZGFibGVTdHJlYW08QXJyYXlCdWZmZXJWaWV3PiB8IEFzeW5jSXRlcmFibGU8QXJyYXlCdWZmZXJWaWV3PiwgYnl0ZUxlbmd0aD86IG51bWJlcikge1xuICAgICAgICBzdXBlcihuZXcgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGwobmV3IEFzeW5jTWVzc2FnZVJlYWRlcihzb3VyY2UgYXMgRmlsZUhhbmRsZSwgYnl0ZUxlbmd0aCkpKTtcbiAgICB9XG4gICAgcHVibGljIGFzeW5jIGNhbmNlbCgpIHsgYXdhaXQgdGhpcy5pbXBsLmNsb3NlKCk7IH1cbiAgICBwdWJsaWMgYXN5bmMgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKSB7IGF3YWl0IHRoaXMuaW1wbC5vcGVuKGF1dG9DbG9zZSk7IHJldHVybiB0aGlzOyB9XG4gICAgcHVibGljIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKSB7IHJldHVybiAodGhpcy5pbXBsIGFzIEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4pW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpOyB9XG4gICAgcHVibGljIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHsgdGhyb3cgbmV3IEVycm9yKGBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyIGlzIG5vdCBJdGVyYWJsZWApOyB9XG59XG5cbmV4cG9ydCBjbGFzcyBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoUmVhZGVyPFQ+IHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHJvdGVjdGVkIGltcGw6IEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUPjtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEFzeW5jUmFuZG9tQWNjZXNzRmlsZSk7XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBBc3luY1JhbmRvbUFjY2Vzc0ZpbGUsIGRpY3Rpb25hcmllczogTWFwPG51bWJlciwgVmVjdG9yPik7XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBGaWxlSGFuZGxlLCBieXRlTGVuZ3RoOiBudW1iZXIsIGRpY3Rpb25hcmllczogTWFwPG51bWJlciwgVmVjdG9yPik7XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBBc3luY1JhbmRvbUFjY2Vzc0ZpbGUgfCBGaWxlSGFuZGxlLCAuLi5yZXN0OiAobnVtYmVyIHwgTWFwPG51bWJlciwgVmVjdG9yPilbXSkge1xuICAgICAgICBsZXQgW2J5dGVMZW5ndGgsIGRpY3Rpb25hcmllc10gPSByZXN0IGFzIFtudW1iZXIsIE1hcDxudW1iZXIsIFZlY3Rvcj5dO1xuICAgICAgICBpZiAoYnl0ZUxlbmd0aCAmJiB0eXBlb2YgYnl0ZUxlbmd0aCAhPT0gJ251bWJlcicpIHsgZGljdGlvbmFyaWVzID0gYnl0ZUxlbmd0aDsgfVxuICAgICAgICBsZXQgZmlsZSA9IHNvdXJjZSBpbnN0YW5jZW9mIEFzeW5jUmFuZG9tQWNjZXNzRmlsZSA/IHNvdXJjZSA6IG5ldyBBc3luY1JhbmRvbUFjY2Vzc0ZpbGUoc291cmNlLCBieXRlTGVuZ3RoKTtcbiAgICAgICAgc3VwZXIobmV3IEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbChmaWxlLCBkaWN0aW9uYXJpZXMpKTtcbiAgICB9XG4gICAgcHVibGljIGdldCBmb290ZXIoKSB7IHJldHVybiB0aGlzLmltcGwuZm9vdGVyOyB9XG4gICAgcHVibGljIGFzeW5jIGNhbmNlbCgpIHsgYXdhaXQgdGhpcy5pbXBsLmNsb3NlKCk7IH1cbiAgICBwdWJsaWMgYXN5bmMgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKSB7IGF3YWl0IHRoaXMuaW1wbC5vcGVuKGF1dG9DbG9zZSk7IHJldHVybiB0aGlzOyB9XG4gICAgcHVibGljIHJlYWRSZWNvcmRCYXRjaChpbmRleDogbnVtYmVyKSB7IHJldHVybiB0aGlzLmltcGwucmVhZFJlY29yZEJhdGNoKGluZGV4KTsgfVxuICAgIHB1YmxpYyBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCkgeyByZXR1cm4gKHRoaXMuaW1wbCBhcyBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+KVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTsgfVxuICAgIHB1YmxpYyBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7IHRocm93IG5ldyBFcnJvcihgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXIgaXMgbm90IEl0ZXJhYmxlYCk7IH1cbn1cblxuYWJzdHJhY3QgY2xhc3MgUmVjb3JkQmF0Y2hSZWFkZXJJbXBsQmFzZTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiB7XG5cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIHNjaGVtYTogU2NoZW1hO1xuICAgIHB1YmxpYyBjbG9zZWQgPSBmYWxzZTtcbiAgICBwdWJsaWMgYXV0b0Nsb3NlID0gdHJ1ZTtcbiAgICBwdWJsaWMgZGljdGlvbmFyeUluZGV4ID0gMDtcbiAgICBwdWJsaWMgcmVjb3JkQmF0Y2hJbmRleCA9IDA7XG4gICAgcHVibGljIGRpY3Rpb25hcmllczogTWFwPG51bWJlciwgVmVjdG9yPjtcbiAgICBwdWJsaWMgZ2V0IG51bURpY3Rpb25hcmllcygpIHsgcmV0dXJuIHRoaXMuZGljdGlvbmFyeUluZGV4OyB9XG4gICAgcHVibGljIGdldCBudW1SZWNvcmRCYXRjaGVzKCkgeyByZXR1cm4gdGhpcy5yZWNvcmRCYXRjaEluZGV4OyB9XG5cbiAgICBjb25zdHJ1Y3RvcihkaWN0aW9uYXJpZXMgPSBuZXcgTWFwPG51bWJlciwgVmVjdG9yPigpKSB7XG4gICAgICAgIHRoaXMuZGljdGlvbmFyaWVzID0gZGljdGlvbmFyaWVzO1xuICAgIH1cbiAgICBwdWJsaWMgcmVzZXQoc2NoZW1hPzogU2NoZW1hPFQ+IHwgbnVsbCkge1xuICAgICAgICB0aGlzLmRpY3Rpb25hcnlJbmRleCA9IDA7XG4gICAgICAgIHRoaXMucmVjb3JkQmF0Y2hJbmRleCA9IDA7XG4gICAgICAgIHRoaXMuc2NoZW1hID0gPGFueT4gc2NoZW1hO1xuICAgICAgICB0aGlzLmRpY3Rpb25hcmllcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHByb3RlY3RlZCBfbG9hZFJlY29yZEJhdGNoKGhlYWRlcjogbWV0YWRhdGEuUmVjb3JkQmF0Y2gsIGJvZHk6IGFueSkge1xuICAgICAgICByZXR1cm4gbmV3IFJlY29yZEJhdGNoPFQ+KHRoaXMuc2NoZW1hLCBoZWFkZXIubGVuZ3RoLCB0aGlzLl9sb2FkVmVjdG9ycyhoZWFkZXIsIGJvZHksIHRoaXMuc2NoZW1hLmZpZWxkcykpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgX2xvYWREaWN0aW9uYXJ5QmF0Y2goaGVhZGVyOiBtZXRhZGF0YS5EaWN0aW9uYXJ5QmF0Y2gsIGJvZHk6IGFueSkge1xuICAgICAgICBjb25zdCB7IGlkLCBpc0RlbHRhLCBkYXRhIH0gPSBoZWFkZXI7XG4gICAgICAgIGNvbnN0IHsgZGljdGlvbmFyaWVzLCBzY2hlbWEgfSA9IHRoaXM7XG4gICAgICAgIGlmIChpc0RlbHRhIHx8ICFkaWN0aW9uYXJpZXMuZ2V0KGlkKSkge1xuXG4gICAgICAgICAgICBjb25zdCB0eXBlID0gc2NoZW1hLmRpY3Rpb25hcmllcy5nZXQoaWQpITtcbiAgICAgICAgICAgIGNvbnN0IHZlY3RvciA9IChpc0RlbHRhID8gZGljdGlvbmFyaWVzLmdldChpZCkhLmNvbmNhdChcbiAgICAgICAgICAgICAgICBWZWN0b3IubmV3KHRoaXMuX2xvYWRWZWN0b3JzKGRhdGEsIGJvZHksIFt0eXBlXSlbMF0pKSA6XG4gICAgICAgICAgICAgICAgVmVjdG9yLm5ldyh0aGlzLl9sb2FkVmVjdG9ycyhkYXRhLCBib2R5LCBbdHlwZV0pWzBdKSkgYXMgVmVjdG9yO1xuXG4gICAgICAgICAgICAoc2NoZW1hLmRpY3Rpb25hcnlGaWVsZHMuZ2V0KGlkKSB8fCBbXSkuZm9yRWFjaCgoeyB0eXBlIH0pID0+IHR5cGUuZGljdGlvbmFyeVZlY3RvciA9IHZlY3Rvcik7XG5cbiAgICAgICAgICAgIHJldHVybiB2ZWN0b3I7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRpY3Rpb25hcmllcy5nZXQoaWQpITtcbiAgICB9XG4gICAgcHJvdGVjdGVkIF9sb2FkVmVjdG9ycyhoZWFkZXI6IG1ldGFkYXRhLlJlY29yZEJhdGNoLCBib2R5OiBhbnksIHR5cGVzOiAoRmllbGQgfCBEYXRhVHlwZSlbXSkge1xuICAgICAgICByZXR1cm4gbmV3IFZlY3RvckxvYWRlcihib2R5LCBoZWFkZXIubm9kZXMsIGhlYWRlci5idWZmZXJzKS52aXNpdE1hbnkodHlwZXMpO1xuICAgIH1cbn1cblxuY2xhc3MgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+XG4gICAgZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlckltcGxCYXNlPFQ+XG4gICAgICAgIGltcGxlbWVudHMgSVJlY29yZEJhdGNoUmVhZGVySW1wbDxUPiwgSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4ge1xuXG4gICAgY29uc3RydWN0b3IocHJvdGVjdGVkIHJlYWRlcjogTWVzc2FnZVJlYWRlciwgZGljdGlvbmFyaWVzID0gbmV3IE1hcDxudW1iZXIsIFZlY3Rvcj4oKSkge1xuICAgICAgICBzdXBlcihkaWN0aW9uYXJpZXMpO1xuICAgIH1cbiAgICBwdWJsaWMgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4ge1xuICAgICAgICByZXR1cm4gdGhpcyBhcyBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PjtcbiAgICB9XG4gICAgcHVibGljIGNsb3NlKCkge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkICYmICh0aGlzLmNsb3NlZCA9IHRydWUpKSB7XG4gICAgICAgICAgICB0aGlzLnJlc2V0KCkucmVhZGVyLnJldHVybigpO1xuICAgICAgICAgICAgdGhpcy5yZWFkZXIgPSA8YW55PiBudWxsO1xuICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMgPSA8YW55PiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwdWJsaWMgb3BlbihhdXRvQ2xvc2UgPSB0aGlzLmF1dG9DbG9zZSkge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkKSB7XG4gICAgICAgICAgICB0aGlzLmF1dG9DbG9zZSA9IGF1dG9DbG9zZTtcbiAgICAgICAgICAgIGlmICghKHRoaXMuc2NoZW1hIHx8ICh0aGlzLnNjaGVtYSA9IHRoaXMucmVhZGVyLnJlYWRTY2hlbWEoKSEpKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHB1YmxpYyB0aHJvdyh2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PGFueT4ge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkICYmIHRoaXMuYXV0b0Nsb3NlICYmICh0aGlzLmNsb3NlZCA9IHRydWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZXNldCgpLnJlYWRlci50aHJvdyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIElURVJBVE9SX0RPTkU7XG4gICAgfVxuICAgIHB1YmxpYyByZXR1cm4odmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxhbnk+IHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiB0aGlzLmF1dG9DbG9zZSAmJiAodGhpcy5jbG9zZWQgPSB0cnVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVzZXQoKS5yZWFkZXIucmV0dXJuKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gSVRFUkFUT1JfRE9ORTtcbiAgICB9XG4gICAgcHVibGljIG5leHQoKTogSXRlcmF0b3JSZXN1bHQ8UmVjb3JkQmF0Y2g8VD4+IHtcbiAgICAgICAgaWYgKHRoaXMuY2xvc2VkKSB7IHJldHVybiBJVEVSQVRPUl9ET05FOyB9XG4gICAgICAgIGxldCBtZXNzYWdlOiBNZXNzYWdlIHwgbnVsbCwgeyByZWFkZXIgfSA9IHRoaXM7XG4gICAgICAgIHdoaWxlIChtZXNzYWdlID0gdGhpcy5yZWFkTmV4dE1lc3NhZ2VBbmRWYWxpZGF0ZSgpKSB7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5pc1NjaGVtYSgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXNldChtZXNzYWdlLmhlYWRlcigpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5pc1JlY29yZEJhdGNoKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlY29yZEJhdGNoSW5kZXgrKztcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBtZXNzYWdlLmhlYWRlcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IHJlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRCYXRjaCA9IHRoaXMuX2xvYWRSZWNvcmRCYXRjaChoZWFkZXIsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgZG9uZTogZmFsc2UsIHZhbHVlOiByZWNvcmRCYXRjaCB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmlzRGljdGlvbmFyeUJhdGNoKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRpY3Rpb25hcnlJbmRleCsrO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IG1lc3NhZ2UuaGVhZGVyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gcmVhZGVyLnJlYWRNZXNzYWdlQm9keShtZXNzYWdlLmJvZHlMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHZlY3RvciA9IHRoaXMuX2xvYWREaWN0aW9uYXJ5QmF0Y2goaGVhZGVyLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyaWVzLnNldChoZWFkZXIuaWQsIHZlY3Rvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMucmV0dXJuKCk7XG4gICAgfVxuICAgIHByb3RlY3RlZCByZWFkTmV4dE1lc3NhZ2VBbmRWYWxpZGF0ZTxUIGV4dGVuZHMgTWVzc2FnZUhlYWRlcj4odHlwZT86IFQgfCBudWxsKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZTxUPih0eXBlKTtcbiAgICB9XG59XG5cbmNsYXNzIEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+XG4gICAgZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlckltcGxCYXNlPFQ+XG4gICAgICAgIGltcGxlbWVudHMgSVJlY29yZEJhdGNoUmVhZGVySW1wbDxUPiwgQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7XG5cbiAgICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgcmVhZGVyOiBBc3luY01lc3NhZ2VSZWFkZXIsIGRpY3Rpb25hcmllcyA9IG5ldyBNYXA8bnVtYmVyLCBWZWN0b3I+KCkpIHtcbiAgICAgICAgc3VwZXIoZGljdGlvbmFyaWVzKTtcbiAgICB9XG4gICAgcHVibGljIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7XG4gICAgICAgIHJldHVybiB0aGlzIGFzIEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj47XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyBjbG9zZSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiAodGhpcy5jbG9zZWQgPSB0cnVlKSkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5yZXNldCgpLnJlYWRlci5yZXR1cm4oKTtcbiAgICAgICAgICAgIHRoaXMucmVhZGVyID0gPGFueT4gbnVsbDtcbiAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyaWVzID0gPGFueT4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHVibGljIGFzeW5jIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbikge1xuICAgICAgICAvLyBkZWZhdWx0IGFyZ3MgaW4gYW4gYXN5bmMgZnVuY3Rpb24gY3Jhc2ggY2xvc3VyZS1jb21waWxlciBhdCB0aGUgbW9tZW50XG4gICAgICAgIC8vIHNvIGRvIHRoaXMgaW5zdGVhZC4gaHR0cHM6Ly9naXRodWIuY29tL2dvb2dsZS9jbG9zdXJlLWNvbXBpbGVyL2lzc3Vlcy8zMTc4XG4gICAgICAgIGF1dG9DbG9zZSAhPT0gdW5kZWZpbmVkIHx8IChhdXRvQ2xvc2UgPSB0aGlzLmF1dG9DbG9zZSk7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQpIHtcbiAgICAgICAgICAgIHRoaXMuYXV0b0Nsb3NlID0gYXV0b0Nsb3NlO1xuICAgICAgICAgICAgaWYgKCEodGhpcy5zY2hlbWEgfHwgKHRoaXMuc2NoZW1hID0gKGF3YWl0IHRoaXMucmVhZGVyLnJlYWRTY2hlbWEoKSkhKSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgdGhyb3codmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+IHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiB0aGlzLmF1dG9DbG9zZSAmJiAodGhpcy5jbG9zZWQgPSB0cnVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVzZXQoKS5yZWFkZXIudGhyb3codmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBJVEVSQVRPUl9ET05FO1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgcmV0dXJuKHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxhbnk+PiB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQgJiYgdGhpcy5hdXRvQ2xvc2UgJiYgKHRoaXMuY2xvc2VkID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJlc2V0KCkucmVhZGVyLnJldHVybih2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIElURVJBVE9SX0RPTkU7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyBuZXh0KCkge1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpIHsgcmV0dXJuIElURVJBVE9SX0RPTkU7IH1cbiAgICAgICAgbGV0IG1lc3NhZ2U6IE1lc3NhZ2UgfCBudWxsLCB7IHJlYWRlciB9ID0gdGhpcztcbiAgICAgICAgd2hpbGUgKG1lc3NhZ2UgPSBhd2FpdCB0aGlzLnJlYWROZXh0TWVzc2FnZUFuZFZhbGlkYXRlKCkpIHtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmlzU2NoZW1hKCkpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnJlc2V0KG1lc3NhZ2UuaGVhZGVyKCkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmlzUmVjb3JkQmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVjb3JkQmF0Y2hJbmRleCsrO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IG1lc3NhZ2UuaGVhZGVyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgcmVhZGVyLnJlYWRNZXNzYWdlQm9keShtZXNzYWdlLmJvZHlMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZEJhdGNoID0gdGhpcy5fbG9hZFJlY29yZEJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBkb25lOiBmYWxzZSwgdmFsdWU6IHJlY29yZEJhdGNoIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuaXNEaWN0aW9uYXJ5QmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyeUluZGV4Kys7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSBhd2FpdCByZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdmVjdG9yID0gdGhpcy5fbG9hZERpY3Rpb25hcnlCYXRjaChoZWFkZXIsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMuc2V0KGhlYWRlci5pZCwgdmVjdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZXR1cm4oKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIGFzeW5jIHJlYWROZXh0TWVzc2FnZUFuZFZhbGlkYXRlPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyPih0eXBlPzogVCB8IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVhZGVyLnJlYWRNZXNzYWdlPFQ+KHR5cGUpO1xuICAgIH1cbn1cblxuY2xhc3MgUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PlxuICAgIGV4dGVuZHMgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+XG4gICAgICAgIGltcGxlbWVudHMgSVJlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VD4sIEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHtcblxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgZm9vdGVyOiBGb290ZXI7XG4gICAgcHVibGljIGdldCBudW1EaWN0aW9uYXJpZXMoKSB7IHJldHVybiB0aGlzLmZvb3Rlci5udW1EaWN0aW9uYXJpZXM7IH1cbiAgICBwdWJsaWMgZ2V0IG51bVJlY29yZEJhdGNoZXMoKSB7IHJldHVybiB0aGlzLmZvb3Rlci5udW1SZWNvcmRCYXRjaGVzOyB9XG5cbiAgICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgZmlsZTogUmFuZG9tQWNjZXNzRmlsZSwgZGljdGlvbmFyaWVzID0gbmV3IE1hcDxudW1iZXIsIFZlY3Rvcj4oKSkge1xuICAgICAgICBzdXBlcihuZXcgTWVzc2FnZVJlYWRlcihmaWxlKSwgZGljdGlvbmFyaWVzKTtcbiAgICB9XG4gICAgcHVibGljIG9wZW4oYXV0b0Nsb3NlID0gdGhpcy5hdXRvQ2xvc2UpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiAhdGhpcy5mb290ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuc2NoZW1hID0gKHRoaXMuZm9vdGVyID0gdGhpcy5yZWFkRm9vdGVyKCkpLnNjaGVtYTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgYmxvY2sgb2YgdGhpcy5mb290ZXIuZGljdGlvbmFyeUJhdGNoZXMoKSkge1xuICAgICAgICAgICAgICAgIGJsb2NrICYmIHRoaXMucmVhZERpY3Rpb25hcnlCYXRjaCh0aGlzLmRpY3Rpb25hcnlJbmRleCsrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3VwZXIub3BlbihhdXRvQ2xvc2UpO1xuICAgIH1cbiAgICBwdWJsaWMgcmVhZFJlY29yZEJhdGNoKGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgaWYgKHRoaXMuY2xvc2VkKSB7IHJldHVybiBudWxsOyB9XG4gICAgICAgIGlmICghdGhpcy5mb290ZXIpIHsgdGhpcy5vcGVuKCk7IH1cbiAgICAgICAgY29uc3QgYmxvY2sgPSB0aGlzLmZvb3Rlci5nZXRSZWNvcmRCYXRjaChpbmRleCk7XG4gICAgICAgIGlmIChibG9jayAmJiB0aGlzLmZpbGUuc2VlayhibG9jay5vZmZzZXQpKSB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2UoTWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZSAmJiBtZXNzYWdlLmlzUmVjb3JkQmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IG1lc3NhZ2UuaGVhZGVyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkQmF0Y2ggPSB0aGlzLl9sb2FkUmVjb3JkQmF0Y2goaGVhZGVyLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZWNvcmRCYXRjaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHJlYWREaWN0aW9uYXJ5QmF0Y2goaW5kZXg6IG51bWJlcikge1xuICAgICAgICBjb25zdCBibG9jayA9IHRoaXMuZm9vdGVyLmdldERpY3Rpb25hcnlCYXRjaChpbmRleCk7XG4gICAgICAgIGlmIChibG9jayAmJiB0aGlzLmZpbGUuc2VlayhibG9jay5vZmZzZXQpKSB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2UoTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2gpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UgJiYgbWVzc2FnZS5pc0RpY3Rpb25hcnlCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB2ZWN0b3IgPSB0aGlzLl9sb2FkRGljdGlvbmFyeUJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpY3Rpb25hcmllcy5zZXQoaGVhZGVyLmlkLCB2ZWN0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHByb3RlY3RlZCByZWFkRm9vdGVyKCkge1xuICAgICAgICBjb25zdCB7IGZpbGUgfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0IHNpemUgPSBmaWxlLnNpemU7XG4gICAgICAgIGNvbnN0IG9mZnNldCA9IHNpemUgLSBtYWdpY0FuZFBhZGRpbmc7XG4gICAgICAgIGNvbnN0IGxlbmd0aCA9IGZpbGUucmVhZEludDMyKG9mZnNldCk7XG4gICAgICAgIGNvbnN0IGJ1ZmZlciA9IGZpbGUucmVhZEF0KG9mZnNldCAtIGxlbmd0aCwgbGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIEZvb3Rlci5kZWNvZGUoYnVmZmVyKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHJlYWROZXh0TWVzc2FnZUFuZFZhbGlkYXRlPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyPih0eXBlPzogVCB8IG51bGwpOiBNZXNzYWdlPFQ+IHwgbnVsbCB7XG4gICAgICAgIGlmICghdGhpcy5mb290ZXIpIHsgdGhpcy5vcGVuKCk7IH1cbiAgICAgICAgaWYgKHRoaXMucmVjb3JkQmF0Y2hJbmRleCA8IHRoaXMubnVtUmVjb3JkQmF0Y2hlcykge1xuICAgICAgICAgICAgY29uc3QgYmxvY2sgPSB0aGlzLmZvb3Rlci5nZXRSZWNvcmRCYXRjaCh0aGlzLnJlY29yZEJhdGNoSW5kZXgpO1xuICAgICAgICAgICAgaWYgKGJsb2NrICYmIHRoaXMuZmlsZS5zZWVrKGJsb2NrLm9mZnNldCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2UodHlwZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufVxuXG5jbGFzcyBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT5cbiAgICBleHRlbmRzIEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+XG4gICAgICAgIGltcGxlbWVudHMgSVJlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VD4sIEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4ge1xuXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyBmb290ZXI6IEZvb3RlcjtcbiAgICBwdWJsaWMgZ2V0IG51bURpY3Rpb25hcmllcygpIHsgcmV0dXJuIHRoaXMuZm9vdGVyLm51bURpY3Rpb25hcmllczsgfVxuICAgIHB1YmxpYyBnZXQgbnVtUmVjb3JkQmF0Y2hlcygpIHsgcmV0dXJuIHRoaXMuZm9vdGVyLm51bVJlY29yZEJhdGNoZXM7IH1cblxuICAgIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBmaWxlOiBBc3luY1JhbmRvbUFjY2Vzc0ZpbGUsIGRpY3Rpb25hcmllcyA9IG5ldyBNYXA8bnVtYmVyLCBWZWN0b3I+KCkpIHtcbiAgICAgICAgc3VwZXIobmV3IEFzeW5jTWVzc2FnZVJlYWRlcihmaWxlKSwgZGljdGlvbmFyaWVzKTtcbiAgICB9XG4gICAgcHVibGljIGFzeW5jIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbikge1xuICAgICAgICAvLyBkZWZhdWx0IGFyZ3MgaW4gYW4gYXN5bmMgZnVuY3Rpb24gY3Jhc2ggY2xvc3VyZS1jb21waWxlciBhdCB0aGUgbW9tZW50XG4gICAgICAgIC8vIHNvIGRvIHRoaXMgaW5zdGVhZC4gaHR0cHM6Ly9naXRodWIuY29tL2dvb2dsZS9jbG9zdXJlLWNvbXBpbGVyL2lzc3Vlcy8zMTc4XG4gICAgICAgIGF1dG9DbG9zZSAhPT0gdW5kZWZpbmVkIHx8IChhdXRvQ2xvc2UgPSB0aGlzLmF1dG9DbG9zZSk7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQgJiYgIXRoaXMuZm9vdGVyKSB7XG4gICAgICAgICAgICB0aGlzLnNjaGVtYSA9ICh0aGlzLmZvb3RlciA9IGF3YWl0IHRoaXMucmVhZEZvb3RlcigpKS5zY2hlbWE7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGJsb2NrIG9mIHRoaXMuZm9vdGVyLmRpY3Rpb25hcnlCYXRjaGVzKCkpIHtcbiAgICAgICAgICAgICAgICBibG9jayAmJiBhd2FpdCB0aGlzLnJlYWREaWN0aW9uYXJ5QmF0Y2godGhpcy5kaWN0aW9uYXJ5SW5kZXgrKyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGF3YWl0IHN1cGVyLm9wZW4oYXV0b0Nsb3NlKTtcbiAgICB9XG4gICAgcHVibGljIGFzeW5jIHJlYWRSZWNvcmRCYXRjaChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIGlmICh0aGlzLmNsb3NlZCkgeyByZXR1cm4gbnVsbDsgfVxuICAgICAgICBpZiAoIXRoaXMuZm9vdGVyKSB7IGF3YWl0IHRoaXMub3BlbigpOyB9XG4gICAgICAgIGNvbnN0IGJsb2NrID0gdGhpcy5mb290ZXIuZ2V0UmVjb3JkQmF0Y2goaW5kZXgpO1xuICAgICAgICBpZiAoYmxvY2sgJiYgKGF3YWl0IHRoaXMuZmlsZS5zZWVrKGJsb2NrLm9mZnNldCkpKSB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gYXdhaXQgdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2UoTWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZSAmJiBtZXNzYWdlLmlzUmVjb3JkQmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IG1lc3NhZ2UuaGVhZGVyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkQmF0Y2ggPSB0aGlzLl9sb2FkUmVjb3JkQmF0Y2goaGVhZGVyLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZWNvcmRCYXRjaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcHJvdGVjdGVkIGFzeW5jIHJlYWREaWN0aW9uYXJ5QmF0Y2goaW5kZXg6IG51bWJlcikge1xuICAgICAgICBjb25zdCBibG9jayA9IHRoaXMuZm9vdGVyLmdldERpY3Rpb25hcnlCYXRjaChpbmRleCk7XG4gICAgICAgIGlmIChibG9jayAmJiAoYXdhaXQgdGhpcy5maWxlLnNlZWsoYmxvY2sub2Zmc2V0KSkpIHtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBhd2FpdCB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZShNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZSAmJiBtZXNzYWdlLmlzRGljdGlvbmFyeUJhdGNoKCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBtZXNzYWdlLmhlYWRlcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IGF3YWl0IHRoaXMucmVhZGVyLnJlYWRNZXNzYWdlQm9keShtZXNzYWdlLmJvZHlMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHZlY3RvciA9IHRoaXMuX2xvYWREaWN0aW9uYXJ5QmF0Y2goaGVhZGVyLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyaWVzLnNldChoZWFkZXIuaWQsIHZlY3Rvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcHJvdGVjdGVkIGFzeW5jIHJlYWRGb290ZXIoKSB7XG4gICAgICAgIGNvbnN0IHsgZmlsZSB9ID0gdGhpcztcbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0gZmlsZS5zaXplIC0gbWFnaWNBbmRQYWRkaW5nO1xuICAgICAgICBjb25zdCBsZW5ndGggPSBhd2FpdCBmaWxlLnJlYWRJbnQzMihvZmZzZXQpO1xuICAgICAgICBjb25zdCBidWZmZXIgPSBhd2FpdCBmaWxlLnJlYWRBdChvZmZzZXQgLSBsZW5ndGgsIGxlbmd0aCk7XG4gICAgICAgIHJldHVybiBGb290ZXIuZGVjb2RlKGJ1ZmZlcik7XG4gICAgfVxuICAgIHByb3RlY3RlZCBhc3luYyByZWFkTmV4dE1lc3NhZ2VBbmRWYWxpZGF0ZTxUIGV4dGVuZHMgTWVzc2FnZUhlYWRlcj4odHlwZT86IFQgfCBudWxsKTogUHJvbWlzZTxNZXNzYWdlPFQ+IHwgbnVsbD4ge1xuICAgICAgICBpZiAoIXRoaXMuZm9vdGVyKSB7IGF3YWl0IHRoaXMub3BlbigpOyB9XG4gICAgICAgIGlmICh0aGlzLnJlY29yZEJhdGNoSW5kZXggPCB0aGlzLm51bVJlY29yZEJhdGNoZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGJsb2NrID0gdGhpcy5mb290ZXIuZ2V0UmVjb3JkQmF0Y2godGhpcy5yZWNvcmRCYXRjaEluZGV4KTtcbiAgICAgICAgICAgIGlmIChibG9jayAmJiBhd2FpdCB0aGlzLmZpbGUuc2VlayhibG9jay5vZmZzZXQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVhZGVyLnJlYWRNZXNzYWdlKHR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbn1cblxuY2xhc3MgUmVjb3JkQmF0Y2hKU09OUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUPiB7XG4gICAgY29uc3RydWN0b3IocHJvdGVjdGVkIHJlYWRlcjogSlNPTk1lc3NhZ2VSZWFkZXIsIGRpY3Rpb25hcmllcyA9IG5ldyBNYXA8bnVtYmVyLCBWZWN0b3I+KCkpIHtcbiAgICAgICAgc3VwZXIocmVhZGVyLCBkaWN0aW9uYXJpZXMpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgX2xvYWRWZWN0b3JzKGhlYWRlcjogbWV0YWRhdGEuUmVjb3JkQmF0Y2gsIGJvZHk6IGFueSwgdHlwZXM6IChGaWVsZCB8IERhdGFUeXBlKVtdKSB7XG4gICAgICAgIHJldHVybiBuZXcgSlNPTlZlY3RvckxvYWRlcihib2R5LCBoZWFkZXIubm9kZXMsIGhlYWRlci5idWZmZXJzKS52aXNpdE1hbnkodHlwZXMpO1xuICAgIH1cbn1cblxuaW50ZXJmYWNlIElSZWNvcmRCYXRjaFJlYWRlckltcGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4ge1xuXG4gICAgY2xvc2VkOiBib29sZWFuO1xuICAgIHNjaGVtYTogU2NoZW1hPFQ+O1xuICAgIGF1dG9DbG9zZTogYm9vbGVhbjtcbiAgICBudW1EaWN0aW9uYXJpZXM6IG51bWJlcjtcbiAgICBudW1SZWNvcmRCYXRjaGVzOiBudW1iZXI7XG4gICAgZGljdGlvbmFyaWVzOiBNYXA8bnVtYmVyLCBWZWN0b3I+O1xuXG4gICAgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKTogdGhpcyB8IFByb21pc2U8dGhpcz47XG4gICAgcmVzZXQoc2NoZW1hPzogU2NoZW1hPFQ+IHwgbnVsbCk6IHRoaXM7XG4gICAgY2xvc2UoKTogdGhpcyB8IFByb21pc2U8dGhpcz47XG5cbiAgICBbU3ltYm9sLml0ZXJhdG9yXT8oKTogSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj47XG4gICAgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXT8oKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PjtcblxuICAgIHRocm93KHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8YW55PiB8IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55Pj47XG4gICAgcmV0dXJuKHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8YW55PiB8IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55Pj47XG4gICAgbmV4dCh2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PFJlY29yZEJhdGNoPFQ+PiB8IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8UmVjb3JkQmF0Y2g8VD4+Pjtcbn1cblxuaW50ZXJmYWNlIElSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgSVJlY29yZEJhdGNoUmVhZGVySW1wbDxUPiB7XG5cbiAgICBmb290ZXI6IEZvb3RlcjtcblxuICAgIHJlYWRSZWNvcmRCYXRjaChpbmRleDogbnVtYmVyKTogUmVjb3JkQmF0Y2g8VD4gfCBudWxsIHwgUHJvbWlzZTxSZWNvcmRCYXRjaDxUPiB8IG51bGw+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiB7XG4gICAgY2FuY2VsKCk6IHZvaWQ7XG4gICAgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKTogdGhpcztcbiAgICB0aHJvdyh2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PGFueT47XG4gICAgcmV0dXJuKHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8YW55PjtcbiAgICBuZXh0KHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8UmVjb3JkQmF0Y2g8VD4+O1xuICAgIHJlYWRSZWNvcmRCYXRjaChpbmRleDogbnVtYmVyKTogUmVjb3JkQmF0Y2g8VD4gfCBudWxsO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IHtcbiAgICBjYW5jZWwoKTogdm9pZDtcbiAgICBvcGVuKGF1dG9DbG9zZT86IGJvb2xlYW4pOiB0aGlzO1xuICAgIHRocm93KHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8YW55PjtcbiAgICByZXR1cm4odmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxhbnk+O1xuICAgIG5leHQodmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxSZWNvcmRCYXRjaDxUPj47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4ge1xuICAgIGNhbmNlbCgpOiBQcm9taXNlPHZvaWQ+O1xuICAgIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbik6IFByb21pc2U8dGhpcz47XG4gICAgdGhyb3codmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+O1xuICAgIHJldHVybih2YWx1ZT86IGFueSk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55Pj47XG4gICAgbmV4dCh2YWx1ZT86IGFueSk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8UmVjb3JkQmF0Y2g8VD4+PjtcbiAgICByZWFkUmVjb3JkQmF0Y2goaW5kZXg6IG51bWJlcik6IFByb21pc2U8UmVjb3JkQmF0Y2g8VD4gfCBudWxsPjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IHtcbiAgICBjYW5jZWwoKTogUHJvbWlzZTx2b2lkPjtcbiAgICBvcGVuKGF1dG9DbG9zZT86IGJvb2xlYW4pOiBQcm9taXNlPHRoaXM+O1xuICAgIHRocm93KHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxhbnk+PjtcbiAgICByZXR1cm4odmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+O1xuICAgIG5leHQodmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PFJlY29yZEJhdGNoPFQ+Pj47XG59XG4iXX0=

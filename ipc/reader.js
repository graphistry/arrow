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
/** @ignore */
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
/** @ignore */
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
/** @ignore */
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
/** @ignore */
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
/** @ignore */
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
/** @ignore */
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
/** @ignore */
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
/** @ignore */
class RecordBatchJSONReaderImpl extends RecordBatchStreamReaderImpl {
    constructor(reader, dictionaries = new Map()) {
        super(reader, dictionaries);
        this.reader = reader;
    }
    _loadVectors(header, body, types) {
        return new vectorloader_1.JSONVectorLoader(body, header.nodes, header.buffers).visitMany(types);
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlwYy9yZWFkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDZEQUE2RDtBQUM3RCwrREFBK0Q7QUFDL0Qsd0RBQXdEO0FBQ3hELDZEQUE2RDtBQUM3RCxvREFBb0Q7QUFDcEQsNkRBQTZEO0FBQzdELDZEQUE2RDtBQUM3RCxFQUFFO0FBQ0YsK0NBQStDO0FBQy9DLEVBQUU7QUFDRiw2REFBNkQ7QUFDN0QsOERBQThEO0FBQzlELHlEQUF5RDtBQUN6RCw0REFBNEQ7QUFDNUQsMERBQTBEO0FBQzFELHFCQUFxQjs7O0FBR3JCLHNDQUFtQztBQUNuQyxrQ0FBd0M7QUFDeEMsMENBQXlDO0FBRXpDLDZDQUE0QztBQUU1QyxnREFBNkM7QUFFN0MseUNBQTJEO0FBQzNELDJDQUFvRTtBQUNwRSxxQ0FBcUU7QUFDckUsMERBQXlFO0FBQ3pFLGlEQUF3RztBQUN4RywyQ0FBbUo7QUFDbkosdUNBQTRKO0FBVTVKLE1BQXNCLGlCQUErRCxTQUFRLDRCQUErQjtJQUV4SCxZQUFnQyxJQUErQjtRQUFJLEtBQUssRUFBRSxDQUFDO1FBQTNDLFNBQUksR0FBSixJQUFJLENBQTJCO0lBQWEsQ0FBQztJQUU3RSxJQUFXLE1BQU0sS0FBSyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNoRCxJQUFXLE1BQU0sS0FBSyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNoRCxJQUFXLFNBQVMsS0FBSyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztJQUN0RCxJQUFXLFlBQVksS0FBSyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztJQUM1RCxJQUFXLGVBQWUsS0FBSyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztJQUNsRSxJQUFXLGdCQUFnQixLQUFLLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7SUFFN0QsSUFBSSxDQUFDLEtBQVcsSUFBSSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuRCxLQUFLLENBQUMsS0FBVyxJQUFJLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3JELE1BQU0sQ0FBQyxLQUFXLElBQUksT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkQsS0FBSyxDQUFDLE1BQXlCLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7SUFPMUUsbUJBQW1CO1FBQ3RCLE9BQU8sa0JBQWMsQ0FBQyxtQkFBbUIsQ0FDckMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ1YsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxFQUE4QjtZQUMvRCxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLEVBQW1DLENBQUMsQ0FBQyxDQUFDO0lBQ3hGLENBQUM7SUFDTSxvQkFBb0I7UUFDdkIsT0FBTyxrQkFBYyxDQUFDLG9CQUFvQixDQUN0QyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDVixDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLEVBQThCO1lBQy9ELENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksRUFBbUMsQ0FBQyxFQUM5RSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFFTSxNQUFNO1FBQ1QsT0FBTyxDQUFDLElBQUksWUFBWSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxZQUFZLHVCQUF1QixDQUFDLENBQUM7SUFDaEcsQ0FBQztJQUNNLE9BQU87UUFDVixPQUFPLENBQUMsSUFBSSxZQUFZLDBCQUEwQixDQUFDLElBQUksQ0FBQyxJQUFJLFlBQVksNEJBQTRCLENBQUMsQ0FBQztJQUMxRyxDQUFDO0lBQ00sTUFBTTtRQUNULE9BQU8sQ0FBQyxJQUFJLFlBQVkscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksWUFBWSwwQkFBMEIsQ0FBQyxDQUFDO0lBQ25HLENBQUM7SUFDTSxRQUFRO1FBQ1gsT0FBTyxDQUFDLElBQUksWUFBWSx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxZQUFZLDRCQUE0QixDQUFDLENBQUM7SUFDdkcsQ0FBQztJQUVELGtCQUFrQjtJQUNYLE1BQU0sQ0FBQyxXQUFXLEtBQThCLE1BQU0sSUFBSSxLQUFLLENBQUMsaURBQWlELENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUgsa0JBQWtCO0lBQ1gsTUFBTSxDQUFDLFVBQVU7UUFDcEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxnREFBZ0QsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7SUFTRCxrQkFBa0I7SUFDWCxNQUFNLENBQUMsSUFBSSxDQUE4QyxNQUFXO1FBQ3ZFLElBQUksTUFBTSxZQUFZLGlCQUFpQixFQUFFO1lBQ3JDLE9BQU8sTUFBTSxDQUFDO1NBQ2pCO2FBQU0sSUFBSSxvQkFBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzVCLE9BQU8saUJBQWlCLENBQUMsUUFBUSxDQUFJLE1BQU0sQ0FBQyxDQUFDO1NBQ2hEO2FBQU0sSUFBSSxxQkFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzdCLE9BQU8saUJBQWlCLENBQUMsY0FBYyxDQUFJLE1BQU0sQ0FBQyxDQUFDO1NBQ3REO2FBQU0sSUFBSSxrQkFBUyxDQUFNLE1BQU0sQ0FBQyxFQUFFO1lBQy9CLE9BQU8sQ0FBQyxHQUFTLEVBQUUsd0RBQUMsT0FBQSxNQUFNLGlCQUFpQixDQUFDLElBQUksQ0FBTSxNQUFNLE1BQU0sQ0FBQyxDQUFBLEdBQUEsQ0FBQyxFQUFFLENBQUM7U0FDMUU7YUFBTSxJQUFJLHdCQUFlLENBQUMsTUFBTSxDQUFDLElBQUksNEJBQW1CLENBQUMsTUFBTSxDQUFDLElBQUksNkJBQW9CLENBQUMsTUFBTSxDQUFDLElBQUksd0JBQWUsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUMxSCxPQUFPLGlCQUFpQixDQUFDLG1CQUFtQixDQUFJLElBQUksd0JBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1NBQ2hGO1FBQ0QsT0FBTyxpQkFBaUIsQ0FBQyxjQUFjLENBQUksSUFBSSxtQkFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDdkUsQ0FBQztJQUNPLE1BQU0sQ0FBQyxRQUFRLENBQXdDLE1BQXFCO1FBQ2hGLE9BQU8sSUFBSSx1QkFBdUIsQ0FBSSxJQUFJLHNCQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBQ08sTUFBTSxDQUFDLGNBQWMsQ0FBd0MsTUFBa0I7UUFDbkYsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLHFCQUFXLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRCxPQUFPLEtBQUssSUFBSSxLQUFLLENBQUMsVUFBVSxJQUFJLENBQUM7WUFDakMsQ0FBQyxDQUFDLGtDQUF3QixDQUFDLEtBQUssQ0FBQztnQkFDakMsQ0FBQyxDQUFDLElBQUkscUJBQXFCLENBQUksTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUM3QyxDQUFDLENBQUMsSUFBSSx1QkFBdUIsQ0FBSSxNQUFNLENBQUM7WUFDeEMsQ0FBQyxDQUFDLElBQUksdUJBQXVCLENBQUksUUFBUSxDQUFDLE1BQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNoRSxDQUFDO0lBQ08sTUFBTSxDQUFPLG1CQUFtQixDQUF3QyxNQUF1Qjs7WUFDbkcsTUFBTSxLQUFLLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMscUJBQVcsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hELE9BQU8sS0FBSyxJQUFJLEtBQUssQ0FBQyxVQUFVLElBQUksQ0FBQztnQkFDakMsQ0FBQyxDQUFDLGtDQUF3QixDQUFDLEtBQUssQ0FBQztvQkFDakMsQ0FBQyxDQUFDLElBQUkscUJBQXFCLENBQUksTUFBTSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ25ELENBQUMsQ0FBQyxJQUFJLDRCQUE0QixDQUFJLE1BQU0sQ0FBQztnQkFDN0MsQ0FBQyxDQUFDLElBQUksNEJBQTRCLENBQUksOEVBQXdCLENBQUMsSUFBQSxFQUFFLENBQUMsQ0FBQztRQUMzRSxDQUFDO0tBQUE7SUFDTyxNQUFNLENBQU8sY0FBYyxDQUF3QyxNQUFrQjs7WUFDekYsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLE1BQU0sTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3JDLE1BQU0sSUFBSSxHQUFHLElBQUksNEJBQXFCLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3JELElBQUksSUFBSSxJQUFJLDJCQUFpQixFQUFFO2dCQUMzQixJQUFJLGtDQUF3QixDQUFDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxxQkFBVyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtvQkFDeEUsT0FBTyxJQUFJLDBCQUEwQixDQUFJLElBQUksQ0FBQyxDQUFDO2lCQUNsRDthQUNKO1lBQ0QsT0FBTyxJQUFJLDRCQUE0QixDQUFJLElBQUksQ0FBQyxDQUFDO1FBQ3JELENBQUM7S0FBQTtDQUNKO0FBMUdELDhDQTBHQztBQUVELGNBQWM7QUFDZCxNQUFhLHFCQUFtRSxTQUFRLGlCQUFvQjtJQU14RyxZQUFZLE1BQW1GLEVBQUUsWUFBa0M7UUFDL0gsSUFBSSxNQUFNLFlBQVksOEJBQThCLEVBQUU7WUFDbEQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ2pCO2FBQU0sSUFBSSxNQUFNLFlBQVksdUJBQWdCLEVBQUU7WUFDM0MsS0FBSyxDQUFDLElBQUkseUJBQXlCLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUM7U0FDOUQ7YUFBTTtZQUNILEtBQUssQ0FBQyxJQUFJLHlCQUF5QixDQUFDLElBQUksdUJBQWdCLENBQUMscUJBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUM7U0FDbEc7SUFDTCxDQUFDO0lBQ0QsSUFBVyxNQUFNLEtBQUssT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDekMsTUFBTSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQy9CLElBQUksQ0FBQyxTQUFtQixJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3JFLGVBQWUsQ0FBQyxLQUFhLElBQUksT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0UsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssT0FBUSxJQUFJLENBQUMsSUFBeUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDM0YsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLHVFQUE0QyxzQkFBQSxLQUFLLENBQUMsQ0FBQyx5QkFBQSxzQkFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUEsQ0FBQSxDQUFBLENBQUMsQ0FBQyxDQUFDLElBQUE7Q0FDcEg7QUFyQkQsc0RBcUJDO0FBRUQsY0FBYztBQUNkLE1BQWEsdUJBQXFFLFNBQVEsaUJBQW9CO0lBRzFHLFlBQVksTUFBNEUsRUFBRSxZQUFrQztRQUN4SCxLQUFLLENBQUMsb0JBQVcsQ0FBQyxNQUFNLENBQUM7WUFDckIsQ0FBQyxDQUFDLElBQUkseUJBQXlCLENBQUMsSUFBSSwyQkFBaUIsQ0FBQyxNQUFNLENBQUMsRUFBRSxZQUFZLENBQUM7WUFDNUUsQ0FBQyxDQUFDLElBQUksMkJBQTJCLENBQUMsSUFBSSx1QkFBYSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFDcEYsQ0FBQztJQUNNLE1BQU0sS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvQixJQUFJLENBQUMsU0FBbUIsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNyRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxPQUFRLElBQUksQ0FBQyxJQUF5QyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMzRixDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsdUVBQTRDLHNCQUFBLEtBQUssQ0FBQyxDQUFDLHlCQUFBLHNCQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQSxDQUFBLENBQUEsQ0FBQyxDQUFDLENBQUMsSUFBQTtDQUNwSDtBQVpELDBEQVlDO0FBRUQsY0FBYztBQUNkLE1BQWEsNEJBQTBFLFNBQVEsaUJBQW9CO0lBRy9HLFlBQVksTUFBK0gsRUFBRSxVQUFtQjtRQUM1SixLQUFLLENBQUMsSUFBSSxnQ0FBZ0MsQ0FBQyxJQUFJLDRCQUFrQixDQUFDLE1BQW9CLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFHLENBQUM7SUFDWSxNQUFNO3NFQUFLLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7S0FBQTtJQUNyQyxJQUFJLENBQUMsU0FBbUI7c0VBQUksTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQztLQUFBO0lBQ2pGLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxLQUFLLE9BQVEsSUFBSSxDQUFDLElBQThDLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2pILENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUF1QyxNQUFNLElBQUksS0FBSyxDQUFDLDhDQUE4QyxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQ3BJO0FBVkQsb0VBVUM7QUFFRCxjQUFjO0FBQ2QsTUFBYSwwQkFBd0UsU0FBUSxpQkFBb0I7SUFNN0csWUFBWSxNQUEwQyxFQUFFLEdBQUcsSUFBc0M7UUFDN0YsSUFBSSxDQUFDLFVBQVUsRUFBRSxZQUFZLENBQUMsR0FBRyxJQUFxQyxDQUFDO1FBQ3ZFLElBQUksVUFBVSxJQUFJLE9BQU8sVUFBVSxLQUFLLFFBQVEsRUFBRTtZQUFFLFlBQVksR0FBRyxVQUFVLENBQUM7U0FBRTtRQUNoRixJQUFJLElBQUksR0FBRyxNQUFNLFlBQVksNEJBQXFCLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSw0QkFBcUIsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDNUcsS0FBSyxDQUFDLElBQUksOEJBQThCLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUNELElBQVcsTUFBTSxLQUFLLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ25DLE1BQU07c0VBQUssTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztLQUFBO0lBQ3JDLElBQUksQ0FBQyxTQUFtQjtzRUFBSSxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO0tBQUE7SUFDakYsZUFBZSxDQUFDLEtBQWEsSUFBSSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMzRSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsS0FBSyxPQUFRLElBQUksQ0FBQyxJQUE4QyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNqSCxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBdUMsTUFBTSxJQUFJLEtBQUssQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUNsSTtBQWxCRCxnRUFrQkM7QUFFRCxjQUFjO0FBQ2QsTUFBZSx5QkFBeUI7SUFZcEMsWUFBWSxZQUFZLEdBQUcsSUFBSSxHQUFHLEVBQWtCO1FBUjdDLFdBQU0sR0FBRyxLQUFLLENBQUM7UUFDZixjQUFTLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLG9CQUFlLEdBQUcsQ0FBQyxDQUFDO1FBQ3BCLHFCQUFnQixHQUFHLENBQUMsQ0FBQztRQU14QixJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztJQUNyQyxDQUFDO0lBTEQsSUFBVyxlQUFlLEtBQUssT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztJQUM3RCxJQUFXLGdCQUFnQixLQUFLLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztJQUt4RCxLQUFLLENBQUMsTUFBeUI7UUFDbEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUM7UUFDekIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLENBQUMsQ0FBQztRQUMxQixJQUFJLENBQUMsTUFBTSxHQUFTLE1BQU0sQ0FBQztRQUMzQixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7UUFDOUIsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztJQUNTLGdCQUFnQixDQUFDLE1BQTRCLEVBQUUsSUFBUztRQUM5RCxPQUFPLElBQUkseUJBQVcsQ0FBSSxJQUFJLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUMvRyxDQUFDO0lBQ1Msb0JBQW9CLENBQUMsTUFBZ0MsRUFBRSxJQUFTO1FBQ3RFLE1BQU0sRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxHQUFHLE1BQU0sQ0FBQztRQUNyQyxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQztRQUN0QyxJQUFJLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFFbEMsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFFLENBQUM7WUFDMUMsTUFBTSxNQUFNLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFFLENBQUMsTUFBTSxDQUNsRCxlQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZELGVBQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFXLENBQUM7WUFFcEUsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsQ0FBQztZQUU5RixPQUFPLE1BQU0sQ0FBQztTQUNqQjtRQUNELE9BQU8sWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUUsQ0FBQztJQUNqQyxDQUFDO0lBQ1MsWUFBWSxDQUFDLE1BQTRCLEVBQUUsSUFBUyxFQUFFLEtBQTJCO1FBQ3ZGLE9BQU8sSUFBSSwyQkFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDakYsQ0FBQztDQUNKO0FBRUQsY0FBYztBQUNkLE1BQU0sMkJBQ0YsU0FBUSx5QkFBNEI7SUFHcEMsWUFBc0IsTUFBcUIsRUFBRSxZQUFZLEdBQUcsSUFBSSxHQUFHLEVBQWtCO1FBQ2pGLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztRQURGLFdBQU0sR0FBTixNQUFNLENBQWU7SUFFM0MsQ0FBQztJQUNNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUNwQixPQUFPLElBQXdDLENBQUM7SUFDcEQsQ0FBQztJQUNNLEtBQUs7UUFDUixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEVBQUU7WUFDdEMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsTUFBTSxHQUFTLElBQUksQ0FBQztZQUN6QixJQUFJLENBQUMsWUFBWSxHQUFTLElBQUksQ0FBQztTQUNsQztRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7SUFDTSxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTO1FBQ2xDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ2QsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7WUFDM0IsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUcsQ0FBQyxDQUFDLEVBQUU7Z0JBQzdELE9BQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2FBQ3ZCO1NBQ0o7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0lBQ00sS0FBSyxDQUFDLEtBQVc7UUFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEVBQUU7WUFDeEQsT0FBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUMzQztRQUNELE9BQU8sMEJBQWEsQ0FBQztJQUN6QixDQUFDO0lBQ00sTUFBTSxDQUFDLEtBQVc7UUFDckIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEVBQUU7WUFDeEQsT0FBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUM1QztRQUNELE9BQU8sMEJBQWEsQ0FBQztJQUN6QixDQUFDO0lBQ00sSUFBSTtRQUNQLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUFFLE9BQU8sMEJBQWEsQ0FBQztTQUFFO1FBQzFDLElBQUksT0FBdUIsRUFBRSxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQztRQUMvQyxPQUFPLE9BQU8sR0FBRyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsRUFBRTtZQUNoRCxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRTtnQkFDcEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQzthQUNoQztpQkFBTSxJQUFJLE9BQU8sQ0FBQyxhQUFhLEVBQUUsRUFBRTtnQkFDaEMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3hCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDaEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQzFELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQzFELE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsQ0FBQzthQUM5QztpQkFBTSxJQUFJLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxFQUFFO2dCQUNwQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ3ZCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDaEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQzFELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ3pELElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUM7YUFDNUM7U0FDSjtRQUNELE9BQU8sSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ3pCLENBQUM7SUFDUywwQkFBMEIsQ0FBMEIsSUFBZTtRQUN6RSxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFJLElBQUksQ0FBQyxDQUFDO0lBQzVDLENBQUM7Q0FDSjtBQUVELGNBQWM7QUFDZCxNQUFNLGdDQUNGLFNBQVEseUJBQTRCO0lBR3BDLFlBQXNCLE1BQTBCLEVBQUUsWUFBWSxHQUFHLElBQUksR0FBRyxFQUFrQjtRQUN0RixLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7UUFERixXQUFNLEdBQU4sTUFBTSxDQUFvQjtJQUVoRCxDQUFDO0lBQ00sQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDO1FBQ3pCLE9BQU8sSUFBNkMsQ0FBQztJQUN6RCxDQUFDO0lBQ1ksS0FBSzs7WUFDZCxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEVBQUU7Z0JBQ3RDLE1BQU0sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDbkMsSUFBSSxDQUFDLE1BQU0sR0FBUyxJQUFJLENBQUM7Z0JBQ3pCLElBQUksQ0FBQyxZQUFZLEdBQVMsSUFBSSxDQUFDO2FBQ2xDO1lBQ0QsT0FBTyxJQUFJLENBQUM7UUFDaEIsQ0FBQztLQUFBO0lBQ1ksSUFBSSxDQUFDLFNBQW1COztZQUNqQyx5RUFBeUU7WUFDekUsNkVBQTZFO1lBQzdFLFNBQVMsS0FBSyxTQUFTLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3hELElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO2dCQUNkLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO2dCQUMzQixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBRSxDQUFDLENBQUMsRUFBRTtvQkFDckUsT0FBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7aUJBQ3ZCO2FBQ0o7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNoQixDQUFDO0tBQUE7SUFDWSxLQUFLLENBQUMsS0FBVzs7WUFDMUIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEVBQUU7Z0JBQ3hELE9BQU8sTUFBTSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUNqRDtZQUNELE9BQU8sMEJBQWEsQ0FBQztRQUN6QixDQUFDO0tBQUE7SUFDWSxNQUFNLENBQUMsS0FBVzs7WUFDM0IsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEVBQUU7Z0JBQ3hELE9BQU8sTUFBTSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUNsRDtZQUNELE9BQU8sMEJBQWEsQ0FBQztRQUN6QixDQUFDO0tBQUE7SUFDWSxJQUFJOztZQUNiLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtnQkFBRSxPQUFPLDBCQUFhLENBQUM7YUFBRTtZQUMxQyxJQUFJLE9BQXVCLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUM7WUFDL0MsT0FBTyxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsMEJBQTBCLEVBQUUsRUFBRTtnQkFDdEQsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUU7b0JBQ3BCLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztpQkFDdEM7cUJBQU0sSUFBSSxPQUFPLENBQUMsYUFBYSxFQUFFLEVBQUU7b0JBQ2hDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO29CQUN4QixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ2hDLE1BQU0sTUFBTSxHQUFHLE1BQU0sTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBQ2hFLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7b0JBQzFELE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsQ0FBQztpQkFDOUM7cUJBQU0sSUFBSSxPQUFPLENBQUMsaUJBQWlCLEVBQUUsRUFBRTtvQkFDcEMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO29CQUN2QixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ2hDLE1BQU0sTUFBTSxHQUFHLE1BQU0sTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBQ2hFLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7b0JBQ3pELElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUM7aUJBQzVDO2FBQ0o7WUFDRCxPQUFPLE1BQU0sSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQy9CLENBQUM7S0FBQTtJQUNlLDBCQUEwQixDQUEwQixJQUFlOztZQUMvRSxPQUFPLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUksSUFBSSxDQUFDLENBQUM7UUFDbEQsQ0FBQztLQUFBO0NBQ0o7QUFFRCxjQUFjO0FBQ2QsTUFBTSx5QkFDRixTQUFRLDJCQUE4QjtJQVF0QyxZQUFzQixJQUFzQixFQUFFLFlBQVksR0FBRyxJQUFJLEdBQUcsRUFBa0I7UUFDbEYsS0FBSyxDQUFDLElBQUksdUJBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUQzQixTQUFJLEdBQUosSUFBSSxDQUFrQjtJQUU1QyxDQUFDO0lBTEQsSUFBVyxlQUFlLEtBQUssT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7SUFDcEUsSUFBVyxnQkFBZ0IsS0FBSyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO0lBSy9ELElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVM7UUFDbEMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQzlCLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQztZQUN2RCxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsRUFBRTtnQkFDakQsS0FBSyxJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQzthQUM3RDtTQUNKO1FBQ0QsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFDTSxlQUFlLENBQUMsS0FBYTtRQUNoQyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFBRSxPQUFPLElBQUksQ0FBQztTQUFFO1FBQ2pDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1NBQUU7UUFDbEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDaEQsSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ3ZDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLG9CQUFhLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDbkUsSUFBSSxPQUFPLElBQUksT0FBTyxDQUFDLGFBQWEsRUFBRSxFQUFFO2dCQUNwQyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2hDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDL0QsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDMUQsT0FBTyxXQUFXLENBQUM7YUFDdEI7U0FDSjtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7SUFDUyxtQkFBbUIsQ0FBQyxLQUFhO1FBQ3ZDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEQsSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ3ZDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLG9CQUFhLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDdkUsSUFBSSxPQUFPLElBQUksT0FBTyxDQUFDLGlCQUFpQixFQUFFLEVBQUU7Z0JBQ3hDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDaEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUMvRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUN6RCxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDO2FBQzVDO1NBQ0o7SUFDTCxDQUFDO0lBQ1MsVUFBVTtRQUNoQixNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQ3RCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDdkIsTUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLHlCQUFlLENBQUM7UUFDdEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDcEQsT0FBTyxhQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFDUywwQkFBMEIsQ0FBMEIsSUFBZTtRQUN6RSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztTQUFFO1FBQ2xDLElBQUksSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtZQUMvQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUNoRSxJQUFJLEtBQUssSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ3ZDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDeEM7U0FDSjtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7Q0FDSjtBQUVELGNBQWM7QUFDZCxNQUFNLDhCQUNGLFNBQVEsZ0NBQW1DO0lBUTNDLFlBQXNCLElBQTJCLEVBQUUsWUFBWSxHQUFHLElBQUksR0FBRyxFQUFrQjtRQUN2RixLQUFLLENBQUMsSUFBSSw0QkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQztRQURoQyxTQUFJLEdBQUosSUFBSSxDQUF1QjtJQUVqRCxDQUFDO0lBTEQsSUFBVyxlQUFlLEtBQUssT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7SUFDcEUsSUFBVyxnQkFBZ0IsS0FBSyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO0lBS3pELElBQUksQ0FBQyxTQUFtQjs7Ozs7WUFDakMseUVBQXlFO1lBQ3pFLDZFQUE2RTtZQUM3RSxTQUFTLEtBQUssU0FBUyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN4RCxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7Z0JBQzlCLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDO2dCQUM3RCxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsRUFBRTtvQkFDakQsS0FBSyxLQUFJLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFBLENBQUM7aUJBQ25FO2FBQ0o7WUFDRCxPQUFPLE1BQU0sT0FBTSxJQUFJLFlBQUMsU0FBUyxDQUFDLENBQUM7UUFDdkMsQ0FBQztLQUFBO0lBQ1ksZUFBZSxDQUFDLEtBQWE7O1lBQ3RDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtnQkFBRSxPQUFPLElBQUksQ0FBQzthQUFFO1lBQ2pDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO2dCQUFFLE1BQU0sSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2FBQUU7WUFDeEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEQsSUFBSSxLQUFLLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFO2dCQUMvQyxNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLG9CQUFhLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQ3pFLElBQUksT0FBTyxJQUFJLE9BQU8sQ0FBQyxhQUFhLEVBQUUsRUFBRTtvQkFDcEMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUNoQyxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDckUsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztvQkFDMUQsT0FBTyxXQUFXLENBQUM7aUJBQ3RCO2FBQ0o7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNoQixDQUFDO0tBQUE7SUFDZSxtQkFBbUIsQ0FBQyxLQUFhOztZQUM3QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3BELElBQUksS0FBSyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRTtnQkFDL0MsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxvQkFBYSxDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUM3RSxJQUFJLE9BQU8sSUFBSSxPQUFPLENBQUMsaUJBQWlCLEVBQUUsRUFBRTtvQkFDeEMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUNoQyxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDckUsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztvQkFDekQsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQztpQkFDNUM7YUFDSjtRQUNMLENBQUM7S0FBQTtJQUNlLFVBQVU7O1lBQ3RCLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUM7WUFDdEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyx5QkFBZSxDQUFDO1lBQzNDLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM1QyxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztZQUMxRCxPQUFPLGFBQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDakMsQ0FBQztLQUFBO0lBQ2UsMEJBQTBCLENBQTBCLElBQWU7O1lBQy9FLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO2dCQUFFLE1BQU0sSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2FBQUU7WUFDeEMsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixFQUFFO2dCQUMvQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztnQkFDaEUsSUFBSSxLQUFLLEtBQUksTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUEsRUFBRTtvQkFDN0MsT0FBTyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUM5QzthQUNKO1lBQ0QsT0FBTyxJQUFJLENBQUM7UUFDaEIsQ0FBQztLQUFBO0NBQ0o7QUFFRCxjQUFjO0FBQ2QsTUFBTSx5QkFBdUUsU0FBUSwyQkFBOEI7SUFDL0csWUFBc0IsTUFBeUIsRUFBRSxZQUFZLEdBQUcsSUFBSSxHQUFHLEVBQWtCO1FBQ3JGLEtBQUssQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFEVixXQUFNLEdBQU4sTUFBTSxDQUFtQjtJQUUvQyxDQUFDO0lBQ1MsWUFBWSxDQUFDLE1BQTRCLEVBQUUsSUFBUyxFQUFFLEtBQTJCO1FBQ3ZGLE9BQU8sSUFBSSwrQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3JGLENBQUM7Q0FDSiIsImZpbGUiOiJpcGMvcmVhZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IERhdGFUeXBlIH0gZnJvbSAnLi4vdHlwZSc7XG5pbXBvcnQgeyBWZWN0b3IgfSBmcm9tICcuLi92ZWN0b3InO1xuaW1wb3J0IHsgTWVzc2FnZUhlYWRlciB9IGZyb20gJy4uL2VudW0nO1xuaW1wb3J0IHsgRm9vdGVyIH0gZnJvbSAnLi9tZXRhZGF0YS9maWxlJztcbmltcG9ydCB7IFNjaGVtYSwgRmllbGQgfSBmcm9tICcuLi9zY2hlbWEnO1xuaW1wb3J0IHN0cmVhbUFkYXB0ZXJzIGZyb20gJy4uL2lvL2FkYXB0ZXJzJztcbmltcG9ydCB7IE1lc3NhZ2UgfSBmcm9tICcuL21ldGFkYXRhL21lc3NhZ2UnO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2ggfSBmcm9tICcuLi9yZWNvcmRiYXRjaCc7XG5pbXBvcnQgKiBhcyBtZXRhZGF0YSBmcm9tICcuL21ldGFkYXRhL21lc3NhZ2UnO1xuaW1wb3J0IHsgQnl0ZVN0cmVhbSwgQXN5bmNCeXRlU3RyZWFtIH0gZnJvbSAnLi4vaW8vc3RyZWFtJztcbmltcG9ydCB7IEFycmF5QnVmZmVyVmlld0lucHV0LCB0b1VpbnQ4QXJyYXkgfSBmcm9tICcuLi91dGlsL2J1ZmZlcic7XG5pbXBvcnQgeyBSYW5kb21BY2Nlc3NGaWxlLCBBc3luY1JhbmRvbUFjY2Vzc0ZpbGUgfSBmcm9tICcuLi9pby9maWxlJztcbmltcG9ydCB7IFZlY3RvckxvYWRlciwgSlNPTlZlY3RvckxvYWRlciB9IGZyb20gJy4uL3Zpc2l0b3IvdmVjdG9ybG9hZGVyJztcbmltcG9ydCB7IEFycm93SlNPTiwgQXJyb3dKU09OTGlrZSwgRmlsZUhhbmRsZSwgUmVhZGFibGVJbnRlcm9wLCBJVEVSQVRPUl9ET05FIH0gZnJvbSAnLi4vaW8vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBpc1Byb21pc2UsIGlzQXJyb3dKU09OLCBpc0ZpbGVIYW5kbGUsIGlzRmV0Y2hSZXNwb25zZSwgaXNBc3luY0l0ZXJhYmxlLCBpc1JlYWRhYmxlRE9NU3RyZWFtLCBpc1JlYWRhYmxlTm9kZVN0cmVhbSB9IGZyb20gJy4uL3V0aWwvY29tcGF0JztcbmltcG9ydCB7IE1lc3NhZ2VSZWFkZXIsIEFzeW5jTWVzc2FnZVJlYWRlciwgY2hlY2tGb3JNYWdpY0Fycm93U3RyaW5nLCBtYWdpY0xlbmd0aCwgbWFnaWNBbmRQYWRkaW5nLCBtYWdpY1gyQW5kUGFkZGluZywgSlNPTk1lc3NhZ2VSZWFkZXIgfSBmcm9tICcuL21lc3NhZ2UnO1xuXG4vKiogQGlnbm9yZSAqLyBleHBvcnQgdHlwZSBGcm9tQXJnMCA9IEFycm93SlNPTkxpa2U7XG4vKiogQGlnbm9yZSAqLyBleHBvcnQgdHlwZSBGcm9tQXJnMSA9IFByb21pc2VMaWtlPEFycm93SlNPTkxpa2U+O1xuLyoqIEBpZ25vcmUgKi8gZXhwb3J0IHR5cGUgRnJvbUFyZzIgPSBJdGVyYWJsZTxBcnJheUJ1ZmZlclZpZXdJbnB1dD4gfCBBcnJheUJ1ZmZlclZpZXdJbnB1dDtcbi8qKiBAaWdub3JlICovIGV4cG9ydCB0eXBlIEZyb21BcmczID0gUHJvbWlzZUxpa2U8SXRlcmFibGU8QXJyYXlCdWZmZXJWaWV3SW5wdXQ+IHwgQXJyYXlCdWZmZXJWaWV3SW5wdXQ+O1xuLyoqIEBpZ25vcmUgKi8gZXhwb3J0IHR5cGUgRnJvbUFyZzQgPSBOb2RlSlMuUmVhZGFibGVTdHJlYW0gfCBSZWFkYWJsZVN0cmVhbTxBcnJheUJ1ZmZlclZpZXdJbnB1dD4gfCBBc3luY0l0ZXJhYmxlPEFycmF5QnVmZmVyVmlld0lucHV0Pjtcbi8qKiBAaWdub3JlICovIGV4cG9ydCB0eXBlIEZyb21Bcmc1ID0gUmVzcG9uc2UgfCBGaWxlSGFuZGxlIHwgUHJvbWlzZUxpa2U8RmlsZUhhbmRsZT4gfCBQcm9taXNlTGlrZTxSZXNwb25zZT47XG4vKiogQGlnbm9yZSAqLyBleHBvcnQgdHlwZSBGcm9tQXJncyA9IEZyb21BcmcwIHwgRnJvbUFyZzEgfCBGcm9tQXJnMiB8IEZyb21BcmczIHwgRnJvbUFyZzQgfCBGcm9tQXJnNTtcblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFJlY29yZEJhdGNoUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVhZGFibGVJbnRlcm9wPFJlY29yZEJhdGNoPFQ+PiB7XG5cbiAgICBwcm90ZWN0ZWQgY29uc3RydWN0b3IocHJvdGVjdGVkIGltcGw6IElSZWNvcmRCYXRjaFJlYWRlckltcGw8VD4pIHsgc3VwZXIoKTsgfVxuXG4gICAgcHVibGljIGdldCBjbG9zZWQoKSB7IHJldHVybiB0aGlzLmltcGwuY2xvc2VkOyB9XG4gICAgcHVibGljIGdldCBzY2hlbWEoKSB7IHJldHVybiB0aGlzLmltcGwuc2NoZW1hOyB9XG4gICAgcHVibGljIGdldCBhdXRvQ2xvc2UoKSB7IHJldHVybiB0aGlzLmltcGwuYXV0b0Nsb3NlOyB9XG4gICAgcHVibGljIGdldCBkaWN0aW9uYXJpZXMoKSB7IHJldHVybiB0aGlzLmltcGwuZGljdGlvbmFyaWVzOyB9XG4gICAgcHVibGljIGdldCBudW1EaWN0aW9uYXJpZXMoKSB7IHJldHVybiB0aGlzLmltcGwubnVtRGljdGlvbmFyaWVzOyB9XG4gICAgcHVibGljIGdldCBudW1SZWNvcmRCYXRjaGVzKCkgeyByZXR1cm4gdGhpcy5pbXBsLm51bVJlY29yZEJhdGNoZXM7IH1cblxuICAgIHB1YmxpYyBuZXh0KHZhbHVlPzogYW55KSB7IHJldHVybiB0aGlzLmltcGwubmV4dCh2YWx1ZSk7IH1cbiAgICBwdWJsaWMgdGhyb3codmFsdWU/OiBhbnkpIHsgcmV0dXJuIHRoaXMuaW1wbC50aHJvdyh2YWx1ZSk7IH1cbiAgICBwdWJsaWMgcmV0dXJuKHZhbHVlPzogYW55KSB7IHJldHVybiB0aGlzLmltcGwucmV0dXJuKHZhbHVlKTsgfVxuICAgIHB1YmxpYyByZXNldChzY2hlbWE/OiBTY2hlbWE8VD4gfCBudWxsKSB7IHRoaXMuaW1wbC5yZXNldChzY2hlbWEpOyByZXR1cm4gdGhpczsgfVxuXG4gICAgcHVibGljIGFic3RyYWN0IGNhbmNlbCgpOiB2b2lkIHwgUHJvbWlzZTx2b2lkPjtcbiAgICBwdWJsaWMgYWJzdHJhY3Qgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKTogdGhpcyB8IFByb21pc2U8dGhpcz47XG4gICAgcHVibGljIGFic3RyYWN0IFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+O1xuICAgIHB1YmxpYyBhYnN0cmFjdCBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj47XG5cbiAgICBwdWJsaWMgdG9SZWFkYWJsZURPTVN0cmVhbSgpIHtcbiAgICAgICAgcmV0dXJuIHN0cmVhbUFkYXB0ZXJzLnRvUmVhZGFibGVET01TdHJlYW08UmVjb3JkQmF0Y2g8VD4+KFxuICAgICAgICAgICAgKHRoaXMuaXNTeW5jKClcbiAgICAgICAgICAgICAgICA/IHsgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IHRoaXMgfSBhcyBJdGVyYWJsZTxSZWNvcmRCYXRjaDxUPj5cbiAgICAgICAgICAgICAgICA6IHsgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXTogKCkgPT4gdGhpcyB9IGFzIEFzeW5jSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+KSk7XG4gICAgfVxuICAgIHB1YmxpYyB0b1JlYWRhYmxlTm9kZVN0cmVhbSgpIHtcbiAgICAgICAgcmV0dXJuIHN0cmVhbUFkYXB0ZXJzLnRvUmVhZGFibGVOb2RlU3RyZWFtPFJlY29yZEJhdGNoPFQ+PihcbiAgICAgICAgICAgICh0aGlzLmlzU3luYygpXG4gICAgICAgICAgICAgICAgPyB7IFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiB0aGlzIH0gYXMgSXRlcmFibGU8UmVjb3JkQmF0Y2g8VD4+XG4gICAgICAgICAgICAgICAgOiB7IFtTeW1ib2wuYXN5bmNJdGVyYXRvcl06ICgpID0+IHRoaXMgfSBhcyBBc3luY0l0ZXJhYmxlPFJlY29yZEJhdGNoPFQ+PiksXG4gICAgICAgICAgICB7IG9iamVjdE1vZGU6IHRydWUgfSk7XG4gICAgfVxuXG4gICAgcHVibGljIGlzU3luYygpOiB0aGlzIGlzIFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+IHtcbiAgICAgICAgcmV0dXJuICh0aGlzIGluc3RhbmNlb2YgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyKSB8fCAodGhpcyBpbnN0YW5jZW9mIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyKTtcbiAgICB9XG4gICAgcHVibGljIGlzQXN5bmMoKTogdGhpcyBpcyBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4ge1xuICAgICAgICByZXR1cm4gKHRoaXMgaW5zdGFuY2VvZiBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcikgfHwgKHRoaXMgaW5zdGFuY2VvZiBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyKTtcbiAgICB9XG4gICAgcHVibGljIGlzRmlsZSgpOiB0aGlzIGlzIFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHtcbiAgICAgICAgcmV0dXJuICh0aGlzIGluc3RhbmNlb2YgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyKSB8fCAodGhpcyBpbnN0YW5jZW9mIEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyKTtcbiAgICB9XG4gICAgcHVibGljIGlzU3RyZWFtKCk6IHRoaXMgaXMgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4gfCBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+IHtcbiAgICAgICAgcmV0dXJuICh0aGlzIGluc3RhbmNlb2YgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXIpIHx8ICh0aGlzIGluc3RhbmNlb2YgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcik7XG4gICAgfVxuXG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyB0aHJvdWdoTm9kZSgpOiBpbXBvcnQoJ3N0cmVhbScpLkR1cGxleCB7IHRocm93IG5ldyBFcnJvcihgXCJ0aHJvdWdoTm9kZVwiIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBlbnZpcm9ubWVudGApOyB9XG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyB0aHJvdWdoRE9NPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0+KCk6IHsgd3JpdGFibGU6IFdyaXRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+LCByZWFkYWJsZTogUmVhZGFibGVTdHJlYW08UmVjb3JkQmF0Y2g8VD4+IH0ge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFwidGhyb3VnaERPTVwiIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBlbnZpcm9ubWVudGApO1xuICAgIH1cblxuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXI+KHNvdXJjZTogVCk6IFQ7XG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogRnJvbUFyZzApOiBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBGcm9tQXJnMSk6IFByb21pc2U8UmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IEZyb21BcmcyKTogUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogRnJvbUFyZzMpOiBQcm9taXNlPFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPiB8IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+PjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBGcm9tQXJnNCk6IFByb21pc2U8UmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPj47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogRnJvbUFyZzUpOiBQcm9taXNlPEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPj47XG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogYW55KSB7XG4gICAgICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBSZWNvcmRCYXRjaFJlYWRlcikge1xuICAgICAgICAgICAgcmV0dXJuIHNvdXJjZTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0Fycm93SlNPTihzb3VyY2UpKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVjb3JkQmF0Y2hSZWFkZXIuZnJvbUpTT048VD4oc291cmNlKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0ZpbGVIYW5kbGUoc291cmNlKSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlY29yZEJhdGNoUmVhZGVyLmZyb21GaWxlSGFuZGxlPFQ+KHNvdXJjZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNQcm9taXNlPGFueT4oc291cmNlKSkge1xuICAgICAgICAgICAgcmV0dXJuIChhc3luYyAoKSA9PiBhd2FpdCBSZWNvcmRCYXRjaFJlYWRlci5mcm9tPGFueT4oYXdhaXQgc291cmNlKSkoKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0ZldGNoUmVzcG9uc2Uoc291cmNlKSB8fCBpc1JlYWRhYmxlRE9NU3RyZWFtKHNvdXJjZSkgfHwgaXNSZWFkYWJsZU5vZGVTdHJlYW0oc291cmNlKSB8fCBpc0FzeW5jSXRlcmFibGUoc291cmNlKSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlY29yZEJhdGNoUmVhZGVyLmZyb21Bc3luY0J5dGVTdHJlYW08VD4obmV3IEFzeW5jQnl0ZVN0cmVhbShzb3VyY2UpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUmVjb3JkQmF0Y2hSZWFkZXIuZnJvbUJ5dGVTdHJlYW08VD4obmV3IEJ5dGVTdHJlYW0oc291cmNlKSk7XG4gICAgfVxuICAgIHByaXZhdGUgc3RhdGljIGZyb21KU09OPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0+KHNvdXJjZTogQXJyb3dKU09OTGlrZSkge1xuICAgICAgICByZXR1cm4gbmV3IFJlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+KG5ldyBBcnJvd0pTT04oc291cmNlKSk7XG4gICAgfVxuICAgIHByaXZhdGUgc3RhdGljIGZyb21CeXRlU3RyZWFtPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0+KHNvdXJjZTogQnl0ZVN0cmVhbSkge1xuICAgICAgICBjb25zdCBieXRlcyA9IHNvdXJjZS5wZWVrKChtYWdpY0xlbmd0aCArIDcpICYgfjcpO1xuICAgICAgICByZXR1cm4gYnl0ZXMgJiYgYnl0ZXMuYnl0ZUxlbmd0aCA+PSA0XG4gICAgICAgICAgICA/IGNoZWNrRm9yTWFnaWNBcnJvd1N0cmluZyhieXRlcylcbiAgICAgICAgICAgID8gbmV3IFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPihzb3VyY2UucmVhZCgpKVxuICAgICAgICAgICAgOiBuZXcgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4oc291cmNlKVxuICAgICAgICAgICAgOiBuZXcgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4oZnVuY3Rpb24qKCk6IGFueSB7fSgpKTtcbiAgICB9XG4gICAgcHJpdmF0ZSBzdGF0aWMgYXN5bmMgZnJvbUFzeW5jQnl0ZVN0cmVhbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9Pihzb3VyY2U6IEFzeW5jQnl0ZVN0cmVhbSkge1xuICAgICAgICBjb25zdCBieXRlcyA9IGF3YWl0IHNvdXJjZS5wZWVrKChtYWdpY0xlbmd0aCArIDcpICYgfjcpO1xuICAgICAgICByZXR1cm4gYnl0ZXMgJiYgYnl0ZXMuYnl0ZUxlbmd0aCA+PSA0XG4gICAgICAgICAgICA/IGNoZWNrRm9yTWFnaWNBcnJvd1N0cmluZyhieXRlcylcbiAgICAgICAgICAgID8gbmV3IFJlY29yZEJhdGNoRmlsZVJlYWRlcjxUPihhd2FpdCBzb3VyY2UucmVhZCgpKVxuICAgICAgICAgICAgOiBuZXcgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPihzb3VyY2UpXG4gICAgICAgICAgICA6IG5ldyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+KGFzeW5jIGZ1bmN0aW9uKigpOiBhbnkge30oKSk7XG4gICAgfVxuICAgIHByaXZhdGUgc3RhdGljIGFzeW5jIGZyb21GaWxlSGFuZGxlPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0+KHNvdXJjZTogRmlsZUhhbmRsZSkge1xuICAgICAgICBjb25zdCB7IHNpemUgfSA9IGF3YWl0IHNvdXJjZS5zdGF0KCk7XG4gICAgICAgIGNvbnN0IGZpbGUgPSBuZXcgQXN5bmNSYW5kb21BY2Nlc3NGaWxlKHNvdXJjZSwgc2l6ZSk7XG4gICAgICAgIGlmIChzaXplID49IG1hZ2ljWDJBbmRQYWRkaW5nKSB7XG4gICAgICAgICAgICBpZiAoY2hlY2tGb3JNYWdpY0Fycm93U3RyaW5nKGF3YWl0IGZpbGUucmVhZEF0KDAsIChtYWdpY0xlbmd0aCArIDcpICYgfjcpKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4oZmlsZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+KGZpbGUpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjbGFzcyBSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlcjxUPiB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHByb3RlY3RlZCBpbXBsOiBSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQ+O1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQ+KTtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IFJhbmRvbUFjY2Vzc0ZpbGUsIGRpY3Rpb25hcmllcz86IE1hcDxudW1iZXIsIFZlY3Rvcj4pO1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogQXJyYXlCdWZmZXJWaWV3SW5wdXQsIGRpY3Rpb25hcmllcz86IE1hcDxudW1iZXIsIFZlY3Rvcj4pO1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQ+IHwgUmFuZG9tQWNjZXNzRmlsZSB8IEFycmF5QnVmZmVyVmlld0lucHV0LCBkaWN0aW9uYXJpZXM/OiBNYXA8bnVtYmVyLCBWZWN0b3I+KSB7XG4gICAgICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlckltcGwpIHtcbiAgICAgICAgICAgIHN1cGVyKHNvdXJjZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoc291cmNlIGluc3RhbmNlb2YgUmFuZG9tQWNjZXNzRmlsZSkge1xuICAgICAgICAgICAgc3VwZXIobmV3IFJlY29yZEJhdGNoRmlsZVJlYWRlckltcGwoc291cmNlLCBkaWN0aW9uYXJpZXMpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN1cGVyKG5ldyBSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsKG5ldyBSYW5kb21BY2Nlc3NGaWxlKHRvVWludDhBcnJheShzb3VyY2UpKSwgZGljdGlvbmFyaWVzKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcHVibGljIGdldCBmb290ZXIoKSB7IHJldHVybiB0aGlzLmltcGwuZm9vdGVyOyB9XG4gICAgcHVibGljIGNhbmNlbCgpIHsgdGhpcy5pbXBsLmNsb3NlKCk7IH1cbiAgICBwdWJsaWMgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKSB7IHRoaXMuaW1wbC5vcGVuKGF1dG9DbG9zZSk7IHJldHVybiB0aGlzOyB9XG4gICAgcHVibGljIHJlYWRSZWNvcmRCYXRjaChpbmRleDogbnVtYmVyKSB7IHJldHVybiB0aGlzLmltcGwucmVhZFJlY29yZEJhdGNoKGluZGV4KTsgfVxuICAgIHB1YmxpYyBbU3ltYm9sLml0ZXJhdG9yXSgpIHsgcmV0dXJuICh0aGlzLmltcGwgYXMgSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4pW1N5bWJvbC5pdGVyYXRvcl0oKTsgfVxuICAgIHB1YmxpYyBhc3luYyAqW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHsgeWllbGQqIHRoaXNbU3ltYm9sLml0ZXJhdG9yXSgpOyB9XG59XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY2xhc3MgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlcjxUPiB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHByb3RlY3RlZCBpbXBsOiBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VD47XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBCeXRlU3RyZWFtIHwgQXJyb3dKU09OIHwgQXJyYXlCdWZmZXJWaWV3IHwgSXRlcmFibGU8QXJyYXlCdWZmZXJWaWV3PiwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgVmVjdG9yPikge1xuICAgICAgICBzdXBlcihpc0Fycm93SlNPTihzb3VyY2UpXG4gICAgICAgICAgICA/IG5ldyBSZWNvcmRCYXRjaEpTT05SZWFkZXJJbXBsKG5ldyBKU09OTWVzc2FnZVJlYWRlcihzb3VyY2UpLCBkaWN0aW9uYXJpZXMpXG4gICAgICAgICAgICA6IG5ldyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGwobmV3IE1lc3NhZ2VSZWFkZXIoc291cmNlKSwgZGljdGlvbmFyaWVzKSk7XG4gICAgfVxuICAgIHB1YmxpYyBjYW5jZWwoKSB7IHRoaXMuaW1wbC5jbG9zZSgpOyB9XG4gICAgcHVibGljIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbikgeyB0aGlzLmltcGwub3BlbihhdXRvQ2xvc2UpOyByZXR1cm4gdGhpczsgfVxuICAgIHB1YmxpYyBbU3ltYm9sLml0ZXJhdG9yXSgpIHsgcmV0dXJuICh0aGlzLmltcGwgYXMgSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4pW1N5bWJvbC5pdGVyYXRvcl0oKTsgfVxuICAgIHB1YmxpYyBhc3luYyAqW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHsgeWllbGQqIHRoaXNbU3ltYm9sLml0ZXJhdG9yXSgpOyB9XG59XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY2xhc3MgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoUmVhZGVyPFQ+IHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHJvdGVjdGVkIGltcGw6IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+O1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogQXN5bmNCeXRlU3RyZWFtIHwgRmlsZUhhbmRsZSB8IE5vZGVKUy5SZWFkYWJsZVN0cmVhbSB8IFJlYWRhYmxlU3RyZWFtPEFycmF5QnVmZmVyVmlldz4gfCBBc3luY0l0ZXJhYmxlPEFycmF5QnVmZmVyVmlldz4sIGJ5dGVMZW5ndGg/OiBudW1iZXIpIHtcbiAgICAgICAgc3VwZXIobmV3IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsKG5ldyBBc3luY01lc3NhZ2VSZWFkZXIoc291cmNlIGFzIEZpbGVIYW5kbGUsIGJ5dGVMZW5ndGgpKSk7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyBjYW5jZWwoKSB7IGF3YWl0IHRoaXMuaW1wbC5jbG9zZSgpOyB9XG4gICAgcHVibGljIGFzeW5jIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbikgeyBhd2FpdCB0aGlzLmltcGwub3BlbihhdXRvQ2xvc2UpOyByZXR1cm4gdGhpczsgfVxuICAgIHB1YmxpYyBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCkgeyByZXR1cm4gKHRoaXMuaW1wbCBhcyBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+KVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTsgfVxuICAgIHB1YmxpYyBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7IHRocm93IG5ldyBFcnJvcihgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlciBpcyBub3QgSXRlcmFibGVgKTsgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXI8VD4ge1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwcm90ZWN0ZWQgaW1wbDogQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQ+O1xuICAgIGNvbnN0cnVjdG9yKHNvdXJjZTogQXN5bmNSYW5kb21BY2Nlc3NGaWxlKTtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEFzeW5jUmFuZG9tQWNjZXNzRmlsZSwgZGljdGlvbmFyaWVzOiBNYXA8bnVtYmVyLCBWZWN0b3I+KTtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEZpbGVIYW5kbGUsIGJ5dGVMZW5ndGg6IG51bWJlciwgZGljdGlvbmFyaWVzOiBNYXA8bnVtYmVyLCBWZWN0b3I+KTtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEFzeW5jUmFuZG9tQWNjZXNzRmlsZSB8IEZpbGVIYW5kbGUsIC4uLnJlc3Q6IChudW1iZXIgfCBNYXA8bnVtYmVyLCBWZWN0b3I+KVtdKSB7XG4gICAgICAgIGxldCBbYnl0ZUxlbmd0aCwgZGljdGlvbmFyaWVzXSA9IHJlc3QgYXMgW251bWJlciwgTWFwPG51bWJlciwgVmVjdG9yPl07XG4gICAgICAgIGlmIChieXRlTGVuZ3RoICYmIHR5cGVvZiBieXRlTGVuZ3RoICE9PSAnbnVtYmVyJykgeyBkaWN0aW9uYXJpZXMgPSBieXRlTGVuZ3RoOyB9XG4gICAgICAgIGxldCBmaWxlID0gc291cmNlIGluc3RhbmNlb2YgQXN5bmNSYW5kb21BY2Nlc3NGaWxlID8gc291cmNlIDogbmV3IEFzeW5jUmFuZG9tQWNjZXNzRmlsZShzb3VyY2UsIGJ5dGVMZW5ndGgpO1xuICAgICAgICBzdXBlcihuZXcgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsKGZpbGUsIGRpY3Rpb25hcmllcykpO1xuICAgIH1cbiAgICBwdWJsaWMgZ2V0IGZvb3RlcigpIHsgcmV0dXJuIHRoaXMuaW1wbC5mb290ZXI7IH1cbiAgICBwdWJsaWMgYXN5bmMgY2FuY2VsKCkgeyBhd2FpdCB0aGlzLmltcGwuY2xvc2UoKTsgfVxuICAgIHB1YmxpYyBhc3luYyBvcGVuKGF1dG9DbG9zZT86IGJvb2xlYW4pIHsgYXdhaXQgdGhpcy5pbXBsLm9wZW4oYXV0b0Nsb3NlKTsgcmV0dXJuIHRoaXM7IH1cbiAgICBwdWJsaWMgcmVhZFJlY29yZEJhdGNoKGluZGV4OiBudW1iZXIpIHsgcmV0dXJuIHRoaXMuaW1wbC5yZWFkUmVjb3JkQmF0Y2goaW5kZXgpOyB9XG4gICAgcHVibGljIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKSB7IHJldHVybiAodGhpcy5pbXBsIGFzIEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4pW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpOyB9XG4gICAgcHVibGljIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHsgdGhyb3cgbmV3IEVycm9yKGBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlciBpcyBub3QgSXRlcmFibGVgKTsgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuYWJzdHJhY3QgY2xhc3MgUmVjb3JkQmF0Y2hSZWFkZXJJbXBsQmFzZTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiB7XG5cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIHNjaGVtYTogU2NoZW1hO1xuICAgIHB1YmxpYyBjbG9zZWQgPSBmYWxzZTtcbiAgICBwdWJsaWMgYXV0b0Nsb3NlID0gdHJ1ZTtcbiAgICBwdWJsaWMgZGljdGlvbmFyeUluZGV4ID0gMDtcbiAgICBwdWJsaWMgcmVjb3JkQmF0Y2hJbmRleCA9IDA7XG4gICAgcHVibGljIGRpY3Rpb25hcmllczogTWFwPG51bWJlciwgVmVjdG9yPjtcbiAgICBwdWJsaWMgZ2V0IG51bURpY3Rpb25hcmllcygpIHsgcmV0dXJuIHRoaXMuZGljdGlvbmFyeUluZGV4OyB9XG4gICAgcHVibGljIGdldCBudW1SZWNvcmRCYXRjaGVzKCkgeyByZXR1cm4gdGhpcy5yZWNvcmRCYXRjaEluZGV4OyB9XG5cbiAgICBjb25zdHJ1Y3RvcihkaWN0aW9uYXJpZXMgPSBuZXcgTWFwPG51bWJlciwgVmVjdG9yPigpKSB7XG4gICAgICAgIHRoaXMuZGljdGlvbmFyaWVzID0gZGljdGlvbmFyaWVzO1xuICAgIH1cbiAgICBwdWJsaWMgcmVzZXQoc2NoZW1hPzogU2NoZW1hPFQ+IHwgbnVsbCkge1xuICAgICAgICB0aGlzLmRpY3Rpb25hcnlJbmRleCA9IDA7XG4gICAgICAgIHRoaXMucmVjb3JkQmF0Y2hJbmRleCA9IDA7XG4gICAgICAgIHRoaXMuc2NoZW1hID0gPGFueT4gc2NoZW1hO1xuICAgICAgICB0aGlzLmRpY3Rpb25hcmllcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHByb3RlY3RlZCBfbG9hZFJlY29yZEJhdGNoKGhlYWRlcjogbWV0YWRhdGEuUmVjb3JkQmF0Y2gsIGJvZHk6IGFueSkge1xuICAgICAgICByZXR1cm4gbmV3IFJlY29yZEJhdGNoPFQ+KHRoaXMuc2NoZW1hLCBoZWFkZXIubGVuZ3RoLCB0aGlzLl9sb2FkVmVjdG9ycyhoZWFkZXIsIGJvZHksIHRoaXMuc2NoZW1hLmZpZWxkcykpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgX2xvYWREaWN0aW9uYXJ5QmF0Y2goaGVhZGVyOiBtZXRhZGF0YS5EaWN0aW9uYXJ5QmF0Y2gsIGJvZHk6IGFueSkge1xuICAgICAgICBjb25zdCB7IGlkLCBpc0RlbHRhLCBkYXRhIH0gPSBoZWFkZXI7XG4gICAgICAgIGNvbnN0IHsgZGljdGlvbmFyaWVzLCBzY2hlbWEgfSA9IHRoaXM7XG4gICAgICAgIGlmIChpc0RlbHRhIHx8ICFkaWN0aW9uYXJpZXMuZ2V0KGlkKSkge1xuXG4gICAgICAgICAgICBjb25zdCB0eXBlID0gc2NoZW1hLmRpY3Rpb25hcmllcy5nZXQoaWQpITtcbiAgICAgICAgICAgIGNvbnN0IHZlY3RvciA9IChpc0RlbHRhID8gZGljdGlvbmFyaWVzLmdldChpZCkhLmNvbmNhdChcbiAgICAgICAgICAgICAgICBWZWN0b3IubmV3KHRoaXMuX2xvYWRWZWN0b3JzKGRhdGEsIGJvZHksIFt0eXBlXSlbMF0pKSA6XG4gICAgICAgICAgICAgICAgVmVjdG9yLm5ldyh0aGlzLl9sb2FkVmVjdG9ycyhkYXRhLCBib2R5LCBbdHlwZV0pWzBdKSkgYXMgVmVjdG9yO1xuXG4gICAgICAgICAgICAoc2NoZW1hLmRpY3Rpb25hcnlGaWVsZHMuZ2V0KGlkKSB8fCBbXSkuZm9yRWFjaCgoeyB0eXBlIH0pID0+IHR5cGUuZGljdGlvbmFyeVZlY3RvciA9IHZlY3Rvcik7XG5cbiAgICAgICAgICAgIHJldHVybiB2ZWN0b3I7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRpY3Rpb25hcmllcy5nZXQoaWQpITtcbiAgICB9XG4gICAgcHJvdGVjdGVkIF9sb2FkVmVjdG9ycyhoZWFkZXI6IG1ldGFkYXRhLlJlY29yZEJhdGNoLCBib2R5OiBhbnksIHR5cGVzOiAoRmllbGQgfCBEYXRhVHlwZSlbXSkge1xuICAgICAgICByZXR1cm4gbmV3IFZlY3RvckxvYWRlcihib2R5LCBoZWFkZXIubm9kZXMsIGhlYWRlci5idWZmZXJzKS52aXNpdE1hbnkodHlwZXMpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmNsYXNzIFJlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PlxuICAgIGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXJJbXBsQmFzZTxUPlxuICAgICAgICBpbXBsZW1lbnRzIElSZWNvcmRCYXRjaFJlYWRlckltcGw8VD4sIEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHtcblxuICAgIGNvbnN0cnVjdG9yKHByb3RlY3RlZCByZWFkZXI6IE1lc3NhZ2VSZWFkZXIsIGRpY3Rpb25hcmllcyA9IG5ldyBNYXA8bnVtYmVyLCBWZWN0b3I+KCkpIHtcbiAgICAgICAgc3VwZXIoZGljdGlvbmFyaWVzKTtcbiAgICB9XG4gICAgcHVibGljIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMgYXMgSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj47XG4gICAgfVxuICAgIHB1YmxpYyBjbG9zZSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiAodGhpcy5jbG9zZWQgPSB0cnVlKSkge1xuICAgICAgICAgICAgdGhpcy5yZXNldCgpLnJlYWRlci5yZXR1cm4oKTtcbiAgICAgICAgICAgIHRoaXMucmVhZGVyID0gPGFueT4gbnVsbDtcbiAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyaWVzID0gPGFueT4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHVibGljIG9wZW4oYXV0b0Nsb3NlID0gdGhpcy5hdXRvQ2xvc2UpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCkge1xuICAgICAgICAgICAgdGhpcy5hdXRvQ2xvc2UgPSBhdXRvQ2xvc2U7XG4gICAgICAgICAgICBpZiAoISh0aGlzLnNjaGVtYSB8fCAodGhpcy5zY2hlbWEgPSB0aGlzLnJlYWRlci5yZWFkU2NoZW1hKCkhKSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwdWJsaWMgdGhyb3codmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxhbnk+IHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiB0aGlzLmF1dG9DbG9zZSAmJiAodGhpcy5jbG9zZWQgPSB0cnVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVzZXQoKS5yZWFkZXIudGhyb3codmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBJVEVSQVRPUl9ET05FO1xuICAgIH1cbiAgICBwdWJsaWMgcmV0dXJuKHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8YW55PiB7XG4gICAgICAgIGlmICghdGhpcy5jbG9zZWQgJiYgdGhpcy5hdXRvQ2xvc2UgJiYgKHRoaXMuY2xvc2VkID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlc2V0KCkucmVhZGVyLnJldHVybih2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIElURVJBVE9SX0RPTkU7XG4gICAgfVxuICAgIHB1YmxpYyBuZXh0KCk6IEl0ZXJhdG9yUmVzdWx0PFJlY29yZEJhdGNoPFQ+PiB7XG4gICAgICAgIGlmICh0aGlzLmNsb3NlZCkgeyByZXR1cm4gSVRFUkFUT1JfRE9ORTsgfVxuICAgICAgICBsZXQgbWVzc2FnZTogTWVzc2FnZSB8IG51bGwsIHsgcmVhZGVyIH0gPSB0aGlzO1xuICAgICAgICB3aGlsZSAobWVzc2FnZSA9IHRoaXMucmVhZE5leHRNZXNzYWdlQW5kVmFsaWRhdGUoKSkge1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuaXNTY2hlbWEoKSkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVzZXQobWVzc2FnZS5oZWFkZXIoKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuaXNSZWNvcmRCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWNvcmRCYXRjaEluZGV4Kys7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSByZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkQmF0Y2ggPSB0aGlzLl9sb2FkUmVjb3JkQmF0Y2goaGVhZGVyLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IGRvbmU6IGZhbHNlLCB2YWx1ZTogcmVjb3JkQmF0Y2ggfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5pc0RpY3Rpb25hcnlCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJ5SW5kZXgrKztcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBtZXNzYWdlLmhlYWRlcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IHJlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB2ZWN0b3IgPSB0aGlzLl9sb2FkRGljdGlvbmFyeUJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpY3Rpb25hcmllcy5zZXQoaGVhZGVyLmlkLCB2ZWN0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnJldHVybigpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgcmVhZE5leHRNZXNzYWdlQW5kVmFsaWRhdGU8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KHR5cGU/OiBUIHwgbnVsbCkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2U8VD4odHlwZSk7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuY2xhc3MgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT5cbiAgICBleHRlbmRzIFJlY29yZEJhdGNoUmVhZGVySW1wbEJhc2U8VD5cbiAgICAgICAgaW1wbGVtZW50cyBJUmVjb3JkQmF0Y2hSZWFkZXJJbXBsPFQ+LCBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHtcblxuICAgIGNvbnN0cnVjdG9yKHByb3RlY3RlZCByZWFkZXI6IEFzeW5jTWVzc2FnZVJlYWRlciwgZGljdGlvbmFyaWVzID0gbmV3IE1hcDxudW1iZXIsIFZlY3Rvcj4oKSkge1xuICAgICAgICBzdXBlcihkaWN0aW9uYXJpZXMpO1xuICAgIH1cbiAgICBwdWJsaWMgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMgYXMgQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PjtcbiAgICB9XG4gICAgcHVibGljIGFzeW5jIGNsb3NlKCkge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkICYmICh0aGlzLmNsb3NlZCA9IHRydWUpKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJlc2V0KCkucmVhZGVyLnJldHVybigpO1xuICAgICAgICAgICAgdGhpcy5yZWFkZXIgPSA8YW55PiBudWxsO1xuICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMgPSA8YW55PiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKSB7XG4gICAgICAgIC8vIGRlZmF1bHQgYXJncyBpbiBhbiBhc3luYyBmdW5jdGlvbiBjcmFzaCBjbG9zdXJlLWNvbXBpbGVyIGF0IHRoZSBtb21lbnRcbiAgICAgICAgLy8gc28gZG8gdGhpcyBpbnN0ZWFkLiBodHRwczovL2dpdGh1Yi5jb20vZ29vZ2xlL2Nsb3N1cmUtY29tcGlsZXIvaXNzdWVzLzMxNzhcbiAgICAgICAgYXV0b0Nsb3NlICE9PSB1bmRlZmluZWQgfHwgKGF1dG9DbG9zZSA9IHRoaXMuYXV0b0Nsb3NlKTtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCkge1xuICAgICAgICAgICAgdGhpcy5hdXRvQ2xvc2UgPSBhdXRvQ2xvc2U7XG4gICAgICAgICAgICBpZiAoISh0aGlzLnNjaGVtYSB8fCAodGhpcy5zY2hlbWEgPSAoYXdhaXQgdGhpcy5yZWFkZXIucmVhZFNjaGVtYSgpKSEpKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyB0aHJvdyh2YWx1ZT86IGFueSk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55Pj4ge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkICYmIHRoaXMuYXV0b0Nsb3NlICYmICh0aGlzLmNsb3NlZCA9IHRydWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZXNldCgpLnJlYWRlci50aHJvdyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIElURVJBVE9SX0RPTkU7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyByZXR1cm4odmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+IHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiB0aGlzLmF1dG9DbG9zZSAmJiAodGhpcy5jbG9zZWQgPSB0cnVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVzZXQoKS5yZWFkZXIucmV0dXJuKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gSVRFUkFUT1JfRE9ORTtcbiAgICB9XG4gICAgcHVibGljIGFzeW5jIG5leHQoKSB7XG4gICAgICAgIGlmICh0aGlzLmNsb3NlZCkgeyByZXR1cm4gSVRFUkFUT1JfRE9ORTsgfVxuICAgICAgICBsZXQgbWVzc2FnZTogTWVzc2FnZSB8IG51bGwsIHsgcmVhZGVyIH0gPSB0aGlzO1xuICAgICAgICB3aGlsZSAobWVzc2FnZSA9IGF3YWl0IHRoaXMucmVhZE5leHRNZXNzYWdlQW5kVmFsaWRhdGUoKSkge1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuaXNTY2hlbWEoKSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucmVzZXQobWVzc2FnZS5oZWFkZXIoKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuaXNSZWNvcmRCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWNvcmRCYXRjaEluZGV4Kys7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSBhd2FpdCByZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkQmF0Y2ggPSB0aGlzLl9sb2FkUmVjb3JkQmF0Y2goaGVhZGVyLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IGRvbmU6IGZhbHNlLCB2YWx1ZTogcmVjb3JkQmF0Y2ggfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5pc0RpY3Rpb25hcnlCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJ5SW5kZXgrKztcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBtZXNzYWdlLmhlYWRlcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IGF3YWl0IHJlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB2ZWN0b3IgPSB0aGlzLl9sb2FkRGljdGlvbmFyeUJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpY3Rpb25hcmllcy5zZXQoaGVhZGVyLmlkLCB2ZWN0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJldHVybigpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgYXN5bmMgcmVhZE5leHRNZXNzYWdlQW5kVmFsaWRhdGU8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KHR5cGU/OiBUIHwgbnVsbCkge1xuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2U8VD4odHlwZSk7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuY2xhc3MgUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PlxuICAgIGV4dGVuZHMgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+XG4gICAgICAgIGltcGxlbWVudHMgSVJlY29yZEJhdGNoRmlsZVJlYWRlckltcGw8VD4sIEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHtcblxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgZm9vdGVyOiBGb290ZXI7XG4gICAgcHVibGljIGdldCBudW1EaWN0aW9uYXJpZXMoKSB7IHJldHVybiB0aGlzLmZvb3Rlci5udW1EaWN0aW9uYXJpZXM7IH1cbiAgICBwdWJsaWMgZ2V0IG51bVJlY29yZEJhdGNoZXMoKSB7IHJldHVybiB0aGlzLmZvb3Rlci5udW1SZWNvcmRCYXRjaGVzOyB9XG5cbiAgICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgZmlsZTogUmFuZG9tQWNjZXNzRmlsZSwgZGljdGlvbmFyaWVzID0gbmV3IE1hcDxudW1iZXIsIFZlY3Rvcj4oKSkge1xuICAgICAgICBzdXBlcihuZXcgTWVzc2FnZVJlYWRlcihmaWxlKSwgZGljdGlvbmFyaWVzKTtcbiAgICB9XG4gICAgcHVibGljIG9wZW4oYXV0b0Nsb3NlID0gdGhpcy5hdXRvQ2xvc2UpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiAhdGhpcy5mb290ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuc2NoZW1hID0gKHRoaXMuZm9vdGVyID0gdGhpcy5yZWFkRm9vdGVyKCkpLnNjaGVtYTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgYmxvY2sgb2YgdGhpcy5mb290ZXIuZGljdGlvbmFyeUJhdGNoZXMoKSkge1xuICAgICAgICAgICAgICAgIGJsb2NrICYmIHRoaXMucmVhZERpY3Rpb25hcnlCYXRjaCh0aGlzLmRpY3Rpb25hcnlJbmRleCsrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3VwZXIub3BlbihhdXRvQ2xvc2UpO1xuICAgIH1cbiAgICBwdWJsaWMgcmVhZFJlY29yZEJhdGNoKGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgaWYgKHRoaXMuY2xvc2VkKSB7IHJldHVybiBudWxsOyB9XG4gICAgICAgIGlmICghdGhpcy5mb290ZXIpIHsgdGhpcy5vcGVuKCk7IH1cbiAgICAgICAgY29uc3QgYmxvY2sgPSB0aGlzLmZvb3Rlci5nZXRSZWNvcmRCYXRjaChpbmRleCk7XG4gICAgICAgIGlmIChibG9jayAmJiB0aGlzLmZpbGUuc2VlayhibG9jay5vZmZzZXQpKSB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2UoTWVzc2FnZUhlYWRlci5SZWNvcmRCYXRjaCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZSAmJiBtZXNzYWdlLmlzUmVjb3JkQmF0Y2goKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IG1lc3NhZ2UuaGVhZGVyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkQmF0Y2ggPSB0aGlzLl9sb2FkUmVjb3JkQmF0Y2goaGVhZGVyLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZWNvcmRCYXRjaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHJlYWREaWN0aW9uYXJ5QmF0Y2goaW5kZXg6IG51bWJlcikge1xuICAgICAgICBjb25zdCBibG9jayA9IHRoaXMuZm9vdGVyLmdldERpY3Rpb25hcnlCYXRjaChpbmRleCk7XG4gICAgICAgIGlmIChibG9jayAmJiB0aGlzLmZpbGUuc2VlayhibG9jay5vZmZzZXQpKSB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2UoTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2gpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UgJiYgbWVzc2FnZS5pc0RpY3Rpb25hcnlCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB2ZWN0b3IgPSB0aGlzLl9sb2FkRGljdGlvbmFyeUJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpY3Rpb25hcmllcy5zZXQoaGVhZGVyLmlkLCB2ZWN0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHByb3RlY3RlZCByZWFkRm9vdGVyKCkge1xuICAgICAgICBjb25zdCB7IGZpbGUgfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0IHNpemUgPSBmaWxlLnNpemU7XG4gICAgICAgIGNvbnN0IG9mZnNldCA9IHNpemUgLSBtYWdpY0FuZFBhZGRpbmc7XG4gICAgICAgIGNvbnN0IGxlbmd0aCA9IGZpbGUucmVhZEludDMyKG9mZnNldCk7XG4gICAgICAgIGNvbnN0IGJ1ZmZlciA9IGZpbGUucmVhZEF0KG9mZnNldCAtIGxlbmd0aCwgbGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIEZvb3Rlci5kZWNvZGUoYnVmZmVyKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHJlYWROZXh0TWVzc2FnZUFuZFZhbGlkYXRlPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyPih0eXBlPzogVCB8IG51bGwpOiBNZXNzYWdlPFQ+IHwgbnVsbCB7XG4gICAgICAgIGlmICghdGhpcy5mb290ZXIpIHsgdGhpcy5vcGVuKCk7IH1cbiAgICAgICAgaWYgKHRoaXMucmVjb3JkQmF0Y2hJbmRleCA8IHRoaXMubnVtUmVjb3JkQmF0Y2hlcykge1xuICAgICAgICAgICAgY29uc3QgYmxvY2sgPSB0aGlzLmZvb3Rlci5nZXRSZWNvcmRCYXRjaCh0aGlzLnJlY29yZEJhdGNoSW5kZXgpO1xuICAgICAgICAgICAgaWYgKGJsb2NrICYmIHRoaXMuZmlsZS5zZWVrKGJsb2NrLm9mZnNldCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2UodHlwZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuY2xhc3MgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+XG4gICAgZXh0ZW5kcyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVySW1wbDxUPlxuICAgICAgICBpbXBsZW1lbnRzIElSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQ+LCBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHtcblxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgZm9vdGVyOiBGb290ZXI7XG4gICAgcHVibGljIGdldCBudW1EaWN0aW9uYXJpZXMoKSB7IHJldHVybiB0aGlzLmZvb3Rlci5udW1EaWN0aW9uYXJpZXM7IH1cbiAgICBwdWJsaWMgZ2V0IG51bVJlY29yZEJhdGNoZXMoKSB7IHJldHVybiB0aGlzLmZvb3Rlci5udW1SZWNvcmRCYXRjaGVzOyB9XG5cbiAgICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgZmlsZTogQXN5bmNSYW5kb21BY2Nlc3NGaWxlLCBkaWN0aW9uYXJpZXMgPSBuZXcgTWFwPG51bWJlciwgVmVjdG9yPigpKSB7XG4gICAgICAgIHN1cGVyKG5ldyBBc3luY01lc3NhZ2VSZWFkZXIoZmlsZSksIGRpY3Rpb25hcmllcyk7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyBvcGVuKGF1dG9DbG9zZT86IGJvb2xlYW4pIHtcbiAgICAgICAgLy8gZGVmYXVsdCBhcmdzIGluIGFuIGFzeW5jIGZ1bmN0aW9uIGNyYXNoIGNsb3N1cmUtY29tcGlsZXIgYXQgdGhlIG1vbWVudFxuICAgICAgICAvLyBzbyBkbyB0aGlzIGluc3RlYWQuIGh0dHBzOi8vZ2l0aHViLmNvbS9nb29nbGUvY2xvc3VyZS1jb21waWxlci9pc3N1ZXMvMzE3OFxuICAgICAgICBhdXRvQ2xvc2UgIT09IHVuZGVmaW5lZCB8fCAoYXV0b0Nsb3NlID0gdGhpcy5hdXRvQ2xvc2UpO1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkICYmICF0aGlzLmZvb3Rlcikge1xuICAgICAgICAgICAgdGhpcy5zY2hlbWEgPSAodGhpcy5mb290ZXIgPSBhd2FpdCB0aGlzLnJlYWRGb290ZXIoKSkuc2NoZW1hO1xuICAgICAgICAgICAgZm9yIChjb25zdCBibG9jayBvZiB0aGlzLmZvb3Rlci5kaWN0aW9uYXJ5QmF0Y2hlcygpKSB7XG4gICAgICAgICAgICAgICAgYmxvY2sgJiYgYXdhaXQgdGhpcy5yZWFkRGljdGlvbmFyeUJhdGNoKHRoaXMuZGljdGlvbmFyeUluZGV4KyspO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhd2FpdCBzdXBlci5vcGVuKGF1dG9DbG9zZSk7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyByZWFkUmVjb3JkQmF0Y2goaW5kZXg6IG51bWJlcikge1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgICAgaWYgKCF0aGlzLmZvb3RlcikgeyBhd2FpdCB0aGlzLm9wZW4oKTsgfVxuICAgICAgICBjb25zdCBibG9jayA9IHRoaXMuZm9vdGVyLmdldFJlY29yZEJhdGNoKGluZGV4KTtcbiAgICAgICAgaWYgKGJsb2NrICYmIChhd2FpdCB0aGlzLmZpbGUuc2VlayhibG9jay5vZmZzZXQpKSkge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGF3YWl0IHRoaXMucmVhZGVyLnJlYWRNZXNzYWdlKE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2gpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UgJiYgbWVzc2FnZS5pc1JlY29yZEJhdGNoKCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBtZXNzYWdlLmhlYWRlcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IGF3YWl0IHRoaXMucmVhZGVyLnJlYWRNZXNzYWdlQm9keShtZXNzYWdlLmJvZHlMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZEJhdGNoID0gdGhpcy5fbG9hZFJlY29yZEJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVjb3JkQmF0Y2g7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHByb3RlY3RlZCBhc3luYyByZWFkRGljdGlvbmFyeUJhdGNoKGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgYmxvY2sgPSB0aGlzLmZvb3Rlci5nZXREaWN0aW9uYXJ5QmF0Y2goaW5kZXgpO1xuICAgICAgICBpZiAoYmxvY2sgJiYgKGF3YWl0IHRoaXMuZmlsZS5zZWVrKGJsb2NrLm9mZnNldCkpKSB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gYXdhaXQgdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2UoTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2gpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UgJiYgbWVzc2FnZS5pc0RpY3Rpb25hcnlCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSBhd2FpdCB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB2ZWN0b3IgPSB0aGlzLl9sb2FkRGljdGlvbmFyeUJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpY3Rpb25hcmllcy5zZXQoaGVhZGVyLmlkLCB2ZWN0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHByb3RlY3RlZCBhc3luYyByZWFkRm9vdGVyKCkge1xuICAgICAgICBjb25zdCB7IGZpbGUgfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0IG9mZnNldCA9IGZpbGUuc2l6ZSAtIG1hZ2ljQW5kUGFkZGluZztcbiAgICAgICAgY29uc3QgbGVuZ3RoID0gYXdhaXQgZmlsZS5yZWFkSW50MzIob2Zmc2V0KTtcbiAgICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgZmlsZS5yZWFkQXQob2Zmc2V0IC0gbGVuZ3RoLCBsZW5ndGgpO1xuICAgICAgICByZXR1cm4gRm9vdGVyLmRlY29kZShidWZmZXIpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgYXN5bmMgcmVhZE5leHRNZXNzYWdlQW5kVmFsaWRhdGU8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KHR5cGU/OiBUIHwgbnVsbCk6IFByb21pc2U8TWVzc2FnZTxUPiB8IG51bGw+IHtcbiAgICAgICAgaWYgKCF0aGlzLmZvb3RlcikgeyBhd2FpdCB0aGlzLm9wZW4oKTsgfVxuICAgICAgICBpZiAodGhpcy5yZWNvcmRCYXRjaEluZGV4IDwgdGhpcy5udW1SZWNvcmRCYXRjaGVzKSB7XG4gICAgICAgICAgICBjb25zdCBibG9jayA9IHRoaXMuZm9vdGVyLmdldFJlY29yZEJhdGNoKHRoaXMucmVjb3JkQmF0Y2hJbmRleCk7XG4gICAgICAgICAgICBpZiAoYmxvY2sgJiYgYXdhaXQgdGhpcy5maWxlLnNlZWsoYmxvY2sub2Zmc2V0KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZSh0eXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5jbGFzcyBSZWNvcmRCYXRjaEpTT05SZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQ+IHtcbiAgICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgcmVhZGVyOiBKU09OTWVzc2FnZVJlYWRlciwgZGljdGlvbmFyaWVzID0gbmV3IE1hcDxudW1iZXIsIFZlY3Rvcj4oKSkge1xuICAgICAgICBzdXBlcihyZWFkZXIsIGRpY3Rpb25hcmllcyk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBfbG9hZFZlY3RvcnMoaGVhZGVyOiBtZXRhZGF0YS5SZWNvcmRCYXRjaCwgYm9keTogYW55LCB0eXBlczogKEZpZWxkIHwgRGF0YVR5cGUpW10pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBKU09OVmVjdG9yTG9hZGVyKGJvZHksIGhlYWRlci5ub2RlcywgaGVhZGVyLmJ1ZmZlcnMpLnZpc2l0TWFueSh0eXBlcyk7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuaW50ZXJmYWNlIElSZWNvcmRCYXRjaFJlYWRlckltcGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4ge1xuXG4gICAgY2xvc2VkOiBib29sZWFuO1xuICAgIHNjaGVtYTogU2NoZW1hPFQ+O1xuICAgIGF1dG9DbG9zZTogYm9vbGVhbjtcbiAgICBudW1EaWN0aW9uYXJpZXM6IG51bWJlcjtcbiAgICBudW1SZWNvcmRCYXRjaGVzOiBudW1iZXI7XG4gICAgZGljdGlvbmFyaWVzOiBNYXA8bnVtYmVyLCBWZWN0b3I+O1xuXG4gICAgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKTogdGhpcyB8IFByb21pc2U8dGhpcz47XG4gICAgcmVzZXQoc2NoZW1hPzogU2NoZW1hPFQ+IHwgbnVsbCk6IHRoaXM7XG4gICAgY2xvc2UoKTogdGhpcyB8IFByb21pc2U8dGhpcz47XG5cbiAgICBbU3ltYm9sLml0ZXJhdG9yXT8oKTogSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj47XG4gICAgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXT8oKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PjtcblxuICAgIHRocm93KHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8YW55PiB8IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55Pj47XG4gICAgcmV0dXJuKHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8YW55PiB8IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55Pj47XG4gICAgbmV4dCh2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PFJlY29yZEJhdGNoPFQ+PiB8IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8UmVjb3JkQmF0Y2g8VD4+Pjtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmludGVyZmFjZSBJUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIElSZWNvcmRCYXRjaFJlYWRlckltcGw8VD4ge1xuXG4gICAgZm9vdGVyOiBGb290ZXI7XG5cbiAgICByZWFkUmVjb3JkQmF0Y2goaW5kZXg6IG51bWJlcik6IFJlY29yZEJhdGNoPFQ+IHwgbnVsbCB8IFByb21pc2U8UmVjb3JkQmF0Y2g8VD4gfCBudWxsPjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4ge1xuICAgIGNhbmNlbCgpOiB2b2lkO1xuICAgIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbik6IHRoaXM7XG4gICAgdGhyb3codmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxhbnk+O1xuICAgIHJldHVybih2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PGFueT47XG4gICAgbmV4dCh2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PFJlY29yZEJhdGNoPFQ+PjtcbiAgICByZWFkUmVjb3JkQmF0Y2goaW5kZXg6IG51bWJlcik6IFJlY29yZEJhdGNoPFQ+IHwgbnVsbDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiB7XG4gICAgY2FuY2VsKCk6IHZvaWQ7XG4gICAgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKTogdGhpcztcbiAgICB0aHJvdyh2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PGFueT47XG4gICAgcmV0dXJuKHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8YW55PjtcbiAgICBuZXh0KHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8UmVjb3JkQmF0Y2g8VD4+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IHtcbiAgICBjYW5jZWwoKTogUHJvbWlzZTx2b2lkPjtcbiAgICBvcGVuKGF1dG9DbG9zZT86IGJvb2xlYW4pOiBQcm9taXNlPHRoaXM+O1xuICAgIHRocm93KHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxhbnk+PjtcbiAgICByZXR1cm4odmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+O1xuICAgIG5leHQodmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PFJlY29yZEJhdGNoPFQ+Pj47XG4gICAgcmVhZFJlY29yZEJhdGNoKGluZGV4OiBudW1iZXIpOiBQcm9taXNlPFJlY29yZEJhdGNoPFQ+IHwgbnVsbD47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiB7XG4gICAgY2FuY2VsKCk6IFByb21pc2U8dm9pZD47XG4gICAgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKTogUHJvbWlzZTx0aGlzPjtcbiAgICB0aHJvdyh2YWx1ZT86IGFueSk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55Pj47XG4gICAgcmV0dXJuKHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxhbnk+PjtcbiAgICBuZXh0KHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxSZWNvcmRCYXRjaDxUPj4+O1xufVxuIl19

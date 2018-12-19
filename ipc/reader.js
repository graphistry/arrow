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
    open(autoClose = this.autoClose) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
    open(autoClose = this.autoClose) {
        const _super = Object.create(null, {
            open: { get: () => super.open }
        });
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QkFBZ0IsQ0FBQyxDQUFDO2dCQUNoRSxJQUFJLEtBQUssS0FBSSxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQSxFQUFFO29CQUM3QyxPQUFPLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQzlDO2FBQ0o7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNoQixDQUFDO0tBQUE7Q0FDSjtBQUVELE1BQU0seUJBQXVFLFNBQVEsMkJBQThCO0lBQy9HLFlBQXNCLE1BQXlCLEVBQUUsWUFBWSxHQUFHLElBQUksR0FBRyxFQUFrQjtRQUNyRixLQUFLLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBRFYsV0FBTSxHQUFOLE1BQU0sQ0FBbUI7SUFFL0MsQ0FBQztJQUNTLFlBQVksQ0FBQyxNQUE0QixFQUFFLElBQVMsRUFBRSxLQUEyQjtRQUN2RixPQUFPLElBQUksK0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNyRixDQUFDO0NBQ0oiLCJmaWxlIjoiaXBjL3JlYWRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBEYXRhVHlwZSB9IGZyb20gJy4uL3R5cGUnO1xuaW1wb3J0IHsgVmVjdG9yIH0gZnJvbSAnLi4vdmVjdG9yJztcbmltcG9ydCB7IE1lc3NhZ2VIZWFkZXIgfSBmcm9tICcuLi9lbnVtJztcbmltcG9ydCB7IEZvb3RlciB9IGZyb20gJy4vbWV0YWRhdGEvZmlsZSc7XG5pbXBvcnQgeyBTY2hlbWEsIEZpZWxkIH0gZnJvbSAnLi4vc2NoZW1hJztcbmltcG9ydCBzdHJlYW1BZGFwdGVycyBmcm9tICcuLi9pby9hZGFwdGVycyc7XG5pbXBvcnQgeyBNZXNzYWdlIH0gZnJvbSAnLi9tZXRhZGF0YS9tZXNzYWdlJztcbmltcG9ydCB7IFJlY29yZEJhdGNoIH0gZnJvbSAnLi4vcmVjb3JkYmF0Y2gnO1xuaW1wb3J0ICogYXMgbWV0YWRhdGEgZnJvbSAnLi9tZXRhZGF0YS9tZXNzYWdlJztcbmltcG9ydCB7IEJ5dGVTdHJlYW0sIEFzeW5jQnl0ZVN0cmVhbSB9IGZyb20gJy4uL2lvL3N0cmVhbSc7XG5pbXBvcnQgeyBBcnJheUJ1ZmZlclZpZXdJbnB1dCwgdG9VaW50OEFycmF5IH0gZnJvbSAnLi4vdXRpbC9idWZmZXInO1xuaW1wb3J0IHsgUmFuZG9tQWNjZXNzRmlsZSwgQXN5bmNSYW5kb21BY2Nlc3NGaWxlIH0gZnJvbSAnLi4vaW8vZmlsZSc7XG5pbXBvcnQgeyBWZWN0b3JMb2FkZXIsIEpTT05WZWN0b3JMb2FkZXIgfSBmcm9tICcuLi92aXNpdG9yL3ZlY3RvcmxvYWRlcic7XG5pbXBvcnQgeyBBcnJvd0pTT04sIEFycm93SlNPTkxpa2UsIEZpbGVIYW5kbGUsIFJlYWRhYmxlSW50ZXJvcCwgSVRFUkFUT1JfRE9ORSB9IGZyb20gJy4uL2lvL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgaXNQcm9taXNlLCBpc0Fycm93SlNPTiwgaXNGaWxlSGFuZGxlLCBpc0ZldGNoUmVzcG9uc2UsIGlzQXN5bmNJdGVyYWJsZSwgaXNSZWFkYWJsZURPTVN0cmVhbSwgaXNSZWFkYWJsZU5vZGVTdHJlYW0gfSBmcm9tICcuLi91dGlsL2NvbXBhdCc7XG5pbXBvcnQgeyBNZXNzYWdlUmVhZGVyLCBBc3luY01lc3NhZ2VSZWFkZXIsIGNoZWNrRm9yTWFnaWNBcnJvd1N0cmluZywgbWFnaWNMZW5ndGgsIG1hZ2ljQW5kUGFkZGluZywgbWFnaWNYMkFuZFBhZGRpbmcsIEpTT05NZXNzYWdlUmVhZGVyIH0gZnJvbSAnLi9tZXNzYWdlJztcblxuZXhwb3J0IHR5cGUgRnJvbUFyZzAgPSBBcnJvd0pTT05MaWtlO1xuZXhwb3J0IHR5cGUgRnJvbUFyZzEgPSBJdGVyYWJsZTxBcnJheUJ1ZmZlclZpZXdJbnB1dD4gfCBBcnJheUJ1ZmZlclZpZXdJbnB1dDtcbmV4cG9ydCB0eXBlIEZyb21BcmcyID0gUHJvbWlzZUxpa2U8SXRlcmFibGU8QXJyYXlCdWZmZXJWaWV3SW5wdXQ+IHwgQXJyYXlCdWZmZXJWaWV3SW5wdXQ+O1xuZXhwb3J0IHR5cGUgRnJvbUFyZzMgPSBOb2RlSlMuUmVhZGFibGVTdHJlYW0gfCBSZWFkYWJsZVN0cmVhbTxBcnJheUJ1ZmZlclZpZXdJbnB1dD4gfCBBc3luY0l0ZXJhYmxlPEFycmF5QnVmZmVyVmlld0lucHV0PjtcbmV4cG9ydCB0eXBlIEZyb21Bcmc0ID0gUmVzcG9uc2UgfCBGaWxlSGFuZGxlIHwgUHJvbWlzZUxpa2U8RmlsZUhhbmRsZT4gfCBQcm9taXNlTGlrZTxSZXNwb25zZT47XG5leHBvcnQgdHlwZSBGcm9tQXJncyA9IEZyb21BcmcwIHwgRnJvbUFyZzMgfCBGcm9tQXJnMSB8IEZyb21BcmcyIHwgRnJvbUFyZzQ7XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBSZWNvcmRCYXRjaFJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlYWRhYmxlSW50ZXJvcDxSZWNvcmRCYXRjaDxUPj4ge1xuXG4gICAgcHJvdGVjdGVkIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBpbXBsOiBJUmVjb3JkQmF0Y2hSZWFkZXJJbXBsPFQ+KSB7IHN1cGVyKCk7IH1cblxuICAgIHB1YmxpYyBnZXQgY2xvc2VkKCkgeyByZXR1cm4gdGhpcy5pbXBsLmNsb3NlZDsgfVxuICAgIHB1YmxpYyBnZXQgc2NoZW1hKCkgeyByZXR1cm4gdGhpcy5pbXBsLnNjaGVtYTsgfVxuICAgIHB1YmxpYyBnZXQgYXV0b0Nsb3NlKCkgeyByZXR1cm4gdGhpcy5pbXBsLmF1dG9DbG9zZTsgfVxuICAgIHB1YmxpYyBnZXQgZGljdGlvbmFyaWVzKCkgeyByZXR1cm4gdGhpcy5pbXBsLmRpY3Rpb25hcmllczsgfVxuICAgIHB1YmxpYyBnZXQgbnVtRGljdGlvbmFyaWVzKCkgeyByZXR1cm4gdGhpcy5pbXBsLm51bURpY3Rpb25hcmllczsgfVxuICAgIHB1YmxpYyBnZXQgbnVtUmVjb3JkQmF0Y2hlcygpIHsgcmV0dXJuIHRoaXMuaW1wbC5udW1SZWNvcmRCYXRjaGVzOyB9XG5cbiAgICBwdWJsaWMgbmV4dCh2YWx1ZT86IGFueSkgeyByZXR1cm4gdGhpcy5pbXBsLm5leHQodmFsdWUpOyB9XG4gICAgcHVibGljIHRocm93KHZhbHVlPzogYW55KSB7IHJldHVybiB0aGlzLmltcGwudGhyb3codmFsdWUpOyB9XG4gICAgcHVibGljIHJldHVybih2YWx1ZT86IGFueSkgeyByZXR1cm4gdGhpcy5pbXBsLnJldHVybih2YWx1ZSk7IH1cbiAgICBwdWJsaWMgcmVzZXQoc2NoZW1hPzogU2NoZW1hPFQ+IHwgbnVsbCkgeyB0aGlzLmltcGwucmVzZXQoc2NoZW1hKTsgcmV0dXJuIHRoaXM7IH1cblxuICAgIHB1YmxpYyBhYnN0cmFjdCBjYW5jZWwoKTogdm9pZCB8IFByb21pc2U8dm9pZD47XG4gICAgcHVibGljIGFic3RyYWN0IG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbik6IHRoaXMgfCBQcm9taXNlPHRoaXM+O1xuICAgIHB1YmxpYyBhYnN0cmFjdCBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PjtcbiAgICBwdWJsaWMgYWJzdHJhY3QgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+O1xuXG4gICAgcHVibGljIHRvUmVhZGFibGVET01TdHJlYW0oKSB7IHJldHVybiBzdHJlYW1BZGFwdGVycy50b1JlYWRhYmxlRE9NU3RyZWFtKHRoaXMpOyB9XG4gICAgcHVibGljIHRvUmVhZGFibGVOb2RlU3RyZWFtKCkgeyByZXR1cm4gc3RyZWFtQWRhcHRlcnMudG9SZWFkYWJsZU5vZGVTdHJlYW0odGhpcywgeyBvYmplY3RNb2RlOiB0cnVlIH0pOyB9XG5cbiAgICBwdWJsaWMgaXNTeW5jKCk6IHRoaXMgaXMgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4ge1xuICAgICAgICByZXR1cm4gKHRoaXMgaW5zdGFuY2VvZiBSZWNvcmRCYXRjaEZpbGVSZWFkZXIpIHx8ICh0aGlzIGluc3RhbmNlb2YgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXIpO1xuICAgIH1cbiAgICBwdWJsaWMgaXNBc3luYygpOiB0aGlzIGlzIEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPiB7XG4gICAgICAgIHJldHVybiAodGhpcyBpbnN0YW5jZW9mIEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyKSB8fCAodGhpcyBpbnN0YW5jZW9mIEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXIpO1xuICAgIH1cbiAgICBwdWJsaWMgaXNGaWxlKCk6IHRoaXMgaXMgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4ge1xuICAgICAgICByZXR1cm4gKHRoaXMgaW5zdGFuY2VvZiBSZWNvcmRCYXRjaEZpbGVSZWFkZXIpIHx8ICh0aGlzIGluc3RhbmNlb2YgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXIpO1xuICAgIH1cbiAgICBwdWJsaWMgaXNTdHJlYW0oKTogdGhpcyBpcyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPiB8IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4ge1xuICAgICAgICByZXR1cm4gKHRoaXMgaW5zdGFuY2VvZiBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcikgfHwgKHRoaXMgaW5zdGFuY2VvZiBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyKTtcbiAgICB9XG5cbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIHRocm91Z2hOb2RlKCk6IGltcG9ydCgnc3RyZWFtJykuRHVwbGV4IHsgdGhyb3cgbmV3IEVycm9yKGBcImFzTm9kZVN0cmVhbVwiIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBlbnZpcm9ubWVudGApOyB9XG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyB0aHJvdWdoRE9NPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0+KCk6IHsgd3JpdGFibGU6IFdyaXRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+LCByZWFkYWJsZTogUmVhZGFibGVTdHJlYW08UmVjb3JkQmF0Y2g8VD4+IH0ge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFwiYXNET01TdHJlYW1cIiBub3QgYXZhaWxhYmxlIGluIHRoaXMgZW52aXJvbm1lbnRgKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIFJlY29yZEJhdGNoUmVhZGVyPihzb3VyY2U6IFQpOiBUO1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IEZyb21BcmcwKTogUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogRnJvbUFyZzEpOiBSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4gfCBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBGcm9tQXJnMik6IFByb21pc2U8UmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+IHwgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IEZyb21BcmczKTogUHJvbWlzZTxSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4gfCBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+PjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBGcm9tQXJnNCk6IFByb21pc2U8QXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VD4gfCBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+PjtcbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBhbnkpIHtcbiAgICAgICAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIFJlY29yZEJhdGNoUmVhZGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gc291cmNlO1xuICAgICAgICB9IGVsc2UgaWYgKGlzQXJyb3dKU09OKHNvdXJjZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBSZWNvcmRCYXRjaFJlYWRlci5mcm9tSlNPTjxUPihzb3VyY2UpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRmlsZUhhbmRsZShzb3VyY2UpKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVjb3JkQmF0Y2hSZWFkZXIuZnJvbUZpbGVIYW5kbGU8VD4oc291cmNlKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1Byb21pc2U8RnJvbUFyZzE+KHNvdXJjZSkpIHtcbiAgICAgICAgICAgIHJldHVybiAoYXN5bmMgKCkgPT4gYXdhaXQgUmVjb3JkQmF0Y2hSZWFkZXIuZnJvbTxUPihhd2FpdCBzb3VyY2UpKSgpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzUHJvbWlzZTxGaWxlSGFuZGxlIHwgUmVzcG9uc2U+KHNvdXJjZSkpIHtcbiAgICAgICAgICAgIHJldHVybiAoYXN5bmMgKCkgPT4gYXdhaXQgUmVjb3JkQmF0Y2hSZWFkZXIuZnJvbTxUPihhd2FpdCBzb3VyY2UpKSgpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRmV0Y2hSZXNwb25zZShzb3VyY2UpIHx8IGlzUmVhZGFibGVET01TdHJlYW0oc291cmNlKSB8fCBpc1JlYWRhYmxlTm9kZVN0cmVhbShzb3VyY2UpIHx8IGlzQXN5bmNJdGVyYWJsZShzb3VyY2UpKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVjb3JkQmF0Y2hSZWFkZXIuZnJvbUFzeW5jQnl0ZVN0cmVhbTxUPihuZXcgQXN5bmNCeXRlU3RyZWFtKHNvdXJjZSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBSZWNvcmRCYXRjaFJlYWRlci5mcm9tQnl0ZVN0cmVhbTxUPihuZXcgQnl0ZVN0cmVhbShzb3VyY2UpKTtcbiAgICB9XG4gICAgcHJpdmF0ZSBzdGF0aWMgZnJvbUpTT048VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfT4oc291cmNlOiBBcnJvd0pTT05MaWtlKSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4obmV3IEFycm93SlNPTihzb3VyY2UpKTtcbiAgICB9XG4gICAgcHJpdmF0ZSBzdGF0aWMgZnJvbUJ5dGVTdHJlYW08VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfT4oc291cmNlOiBCeXRlU3RyZWFtKSB7XG4gICAgICAgIGNvbnN0IGJ5dGVzID0gc291cmNlLnBlZWsoKG1hZ2ljTGVuZ3RoICsgNykgJiB+Nyk7XG4gICAgICAgIHJldHVybiBieXRlcyAmJiBieXRlcy5ieXRlTGVuZ3RoID49IDRcbiAgICAgICAgICAgID8gY2hlY2tGb3JNYWdpY0Fycm93U3RyaW5nKGJ5dGVzKVxuICAgICAgICAgICAgPyBuZXcgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+KHNvdXJjZS5yZWFkKCkpXG4gICAgICAgICAgICA6IG5ldyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPihzb3VyY2UpXG4gICAgICAgICAgICA6IG5ldyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUPihmdW5jdGlvbiooKTogYW55IHt9KCkpO1xuICAgIH1cbiAgICBwcml2YXRlIHN0YXRpYyBhc3luYyBmcm9tQXN5bmNCeXRlU3RyZWFtPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0+KHNvdXJjZTogQXN5bmNCeXRlU3RyZWFtKSB7XG4gICAgICAgIGNvbnN0IGJ5dGVzID0gYXdhaXQgc291cmNlLnBlZWsoKG1hZ2ljTGVuZ3RoICsgNykgJiB+Nyk7XG4gICAgICAgIHJldHVybiBieXRlcyAmJiBieXRlcy5ieXRlTGVuZ3RoID49IDRcbiAgICAgICAgICAgID8gY2hlY2tGb3JNYWdpY0Fycm93U3RyaW5nKGJ5dGVzKVxuICAgICAgICAgICAgPyBuZXcgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQ+KGF3YWl0IHNvdXJjZS5yZWFkKCkpXG4gICAgICAgICAgICA6IG5ldyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQ+KHNvdXJjZSlcbiAgICAgICAgICAgIDogbmV3IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4oYXN5bmMgZnVuY3Rpb24qKCk6IGFueSB7fSgpKTtcbiAgICB9XG4gICAgcHJpdmF0ZSBzdGF0aWMgYXN5bmMgZnJvbUZpbGVIYW5kbGU8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfT4oc291cmNlOiBGaWxlSGFuZGxlKSB7XG4gICAgICAgIGNvbnN0IHsgc2l6ZSB9ID0gYXdhaXQgc291cmNlLnN0YXQoKTtcbiAgICAgICAgY29uc3QgZmlsZSA9IG5ldyBBc3luY1JhbmRvbUFjY2Vzc0ZpbGUoc291cmNlLCBzaXplKTtcbiAgICAgICAgaWYgKHNpemUgPj0gbWFnaWNYMkFuZFBhZGRpbmcpIHtcbiAgICAgICAgICAgIGlmIChjaGVja0Zvck1hZ2ljQXJyb3dTdHJpbmcoYXdhaXQgZmlsZS5yZWFkQXQoMCwgKG1hZ2ljTGVuZ3RoICsgNykgJiB+NykpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcjxUPihmaWxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VD4oZmlsZSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXI8VD4ge1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwcm90ZWN0ZWQgaW1wbDogUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUPjtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUPik7XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBSYW5kb21BY2Nlc3NGaWxlLCBkaWN0aW9uYXJpZXM/OiBNYXA8bnVtYmVyLCBWZWN0b3I+KTtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEFycmF5QnVmZmVyVmlld0lucHV0LCBkaWN0aW9uYXJpZXM/OiBNYXA8bnVtYmVyLCBWZWN0b3I+KTtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUPiB8IFJhbmRvbUFjY2Vzc0ZpbGUgfCBBcnJheUJ1ZmZlclZpZXdJbnB1dCwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgVmVjdG9yPikge1xuICAgICAgICBpZiAoc291cmNlIGluc3RhbmNlb2YgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsKSB7XG4gICAgICAgICAgICBzdXBlcihzb3VyY2UpO1xuICAgICAgICB9IGVsc2UgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIFJhbmRvbUFjY2Vzc0ZpbGUpIHtcbiAgICAgICAgICAgIHN1cGVyKG5ldyBSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsKHNvdXJjZSwgZGljdGlvbmFyaWVzKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdXBlcihuZXcgUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbChuZXcgUmFuZG9tQWNjZXNzRmlsZSh0b1VpbnQ4QXJyYXkoc291cmNlKSksIGRpY3Rpb25hcmllcykpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHB1YmxpYyBnZXQgZm9vdGVyKCkgeyByZXR1cm4gdGhpcy5pbXBsLmZvb3RlcjsgfVxuICAgIHB1YmxpYyBjYW5jZWwoKSB7IHRoaXMuaW1wbC5jbG9zZSgpOyB9XG4gICAgcHVibGljIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbikgeyB0aGlzLmltcGwub3BlbihhdXRvQ2xvc2UpOyByZXR1cm4gdGhpczsgfVxuICAgIHB1YmxpYyByZWFkUmVjb3JkQmF0Y2goaW5kZXg6IG51bWJlcikgeyByZXR1cm4gdGhpcy5pbXBsLnJlYWRSZWNvcmRCYXRjaChpbmRleCk7IH1cbiAgICBwdWJsaWMgW1N5bWJvbC5pdGVyYXRvcl0oKSB7IHJldHVybiAodGhpcy5pbXBsIGFzIEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+KVtTeW1ib2wuaXRlcmF0b3JdKCk7IH1cbiAgICBwdWJsaWMgYXN5bmMgKltTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7IHlpZWxkKiB0aGlzW1N5bWJvbC5pdGVyYXRvcl0oKTsgfVxufVxuXG5leHBvcnQgY2xhc3MgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlcjxUPiB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHByb3RlY3RlZCBpbXBsOiBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VD47XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBCeXRlU3RyZWFtIHwgQXJyb3dKU09OIHwgQXJyYXlCdWZmZXJWaWV3IHwgSXRlcmFibGU8QXJyYXlCdWZmZXJWaWV3PiwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgVmVjdG9yPikge1xuICAgICAgICBzdXBlcihpc0Fycm93SlNPTihzb3VyY2UpXG4gICAgICAgICAgICA/IG5ldyBSZWNvcmRCYXRjaEpTT05SZWFkZXJJbXBsKG5ldyBKU09OTWVzc2FnZVJlYWRlcihzb3VyY2UpLCBkaWN0aW9uYXJpZXMpXG4gICAgICAgICAgICA6IG5ldyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGwobmV3IE1lc3NhZ2VSZWFkZXIoc291cmNlKSwgZGljdGlvbmFyaWVzKSk7XG4gICAgfVxuICAgIHB1YmxpYyBjYW5jZWwoKSB7IHRoaXMuaW1wbC5jbG9zZSgpOyB9XG4gICAgcHVibGljIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbikgeyB0aGlzLmltcGwub3BlbihhdXRvQ2xvc2UpOyByZXR1cm4gdGhpczsgfVxuICAgIHB1YmxpYyBbU3ltYm9sLml0ZXJhdG9yXSgpIHsgcmV0dXJuICh0aGlzLmltcGwgYXMgSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4pW1N5bWJvbC5pdGVyYXRvcl0oKTsgfVxuICAgIHB1YmxpYyBhc3luYyAqW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHsgeWllbGQqIHRoaXNbU3ltYm9sLml0ZXJhdG9yXSgpOyB9XG59XG5cbmV4cG9ydCBjbGFzcyBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgUmVjb3JkQmF0Y2hSZWFkZXI8VD4ge1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwcm90ZWN0ZWQgaW1wbDogQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VD47XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBBc3luY0J5dGVTdHJlYW0gfCBGaWxlSGFuZGxlIHwgTm9kZUpTLlJlYWRhYmxlU3RyZWFtIHwgUmVhZGFibGVTdHJlYW08QXJyYXlCdWZmZXJWaWV3PiB8IEFzeW5jSXRlcmFibGU8QXJyYXlCdWZmZXJWaWV3PiwgYnl0ZUxlbmd0aD86IG51bWJlcikge1xuICAgICAgICBzdXBlcihuZXcgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGwobmV3IEFzeW5jTWVzc2FnZVJlYWRlcihzb3VyY2UgYXMgRmlsZUhhbmRsZSwgYnl0ZUxlbmd0aCkpKTtcbiAgICB9XG4gICAgcHVibGljIGFzeW5jIGNhbmNlbCgpIHsgYXdhaXQgdGhpcy5pbXBsLmNsb3NlKCk7IH1cbiAgICBwdWJsaWMgYXN5bmMgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKSB7IGF3YWl0IHRoaXMuaW1wbC5vcGVuKGF1dG9DbG9zZSk7IHJldHVybiB0aGlzOyB9XG4gICAgcHVibGljIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKSB7IHJldHVybiAodGhpcy5pbXBsIGFzIEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4pW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpOyB9XG4gICAgcHVibGljIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+IHsgdGhyb3cgbmV3IEVycm9yKGBBc3luY1JlY29yZEJhdGNoU3RyZWFtUmVhZGVyIGlzIG5vdCBJdGVyYWJsZWApOyB9XG59XG5cbmV4cG9ydCBjbGFzcyBBc3luY1JlY29yZEJhdGNoRmlsZVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIFJlY29yZEJhdGNoUmVhZGVyPFQ+IHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHJvdGVjdGVkIGltcGw6IEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUPjtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEFzeW5jUmFuZG9tQWNjZXNzRmlsZSk7XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBBc3luY1JhbmRvbUFjY2Vzc0ZpbGUsIGRpY3Rpb25hcmllczogTWFwPG51bWJlciwgVmVjdG9yPik7XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBGaWxlSGFuZGxlLCBieXRlTGVuZ3RoOiBudW1iZXIsIGRpY3Rpb25hcmllczogTWFwPG51bWJlciwgVmVjdG9yPik7XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBBc3luY1JhbmRvbUFjY2Vzc0ZpbGUgfCBGaWxlSGFuZGxlLCAuLi5yZXN0OiAobnVtYmVyIHwgTWFwPG51bWJlciwgVmVjdG9yPilbXSkge1xuICAgICAgICBsZXQgW2J5dGVMZW5ndGgsIGRpY3Rpb25hcmllc10gPSByZXN0IGFzIFtudW1iZXIsIE1hcDxudW1iZXIsIFZlY3Rvcj5dO1xuICAgICAgICBpZiAoYnl0ZUxlbmd0aCAmJiB0eXBlb2YgYnl0ZUxlbmd0aCAhPT0gJ251bWJlcicpIHsgZGljdGlvbmFyaWVzID0gYnl0ZUxlbmd0aDsgfVxuICAgICAgICBsZXQgZmlsZSA9IHNvdXJjZSBpbnN0YW5jZW9mIEFzeW5jUmFuZG9tQWNjZXNzRmlsZSA/IHNvdXJjZSA6IG5ldyBBc3luY1JhbmRvbUFjY2Vzc0ZpbGUoc291cmNlLCBieXRlTGVuZ3RoKTtcbiAgICAgICAgc3VwZXIobmV3IEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbChmaWxlLCBkaWN0aW9uYXJpZXMpKTtcbiAgICB9XG4gICAgcHVibGljIGdldCBmb290ZXIoKSB7IHJldHVybiB0aGlzLmltcGwuZm9vdGVyOyB9XG4gICAgcHVibGljIGFzeW5jIGNhbmNlbCgpIHsgYXdhaXQgdGhpcy5pbXBsLmNsb3NlKCk7IH1cbiAgICBwdWJsaWMgYXN5bmMgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKSB7IGF3YWl0IHRoaXMuaW1wbC5vcGVuKGF1dG9DbG9zZSk7IHJldHVybiB0aGlzOyB9XG4gICAgcHVibGljIHJlYWRSZWNvcmRCYXRjaChpbmRleDogbnVtYmVyKSB7IHJldHVybiB0aGlzLmltcGwucmVhZFJlY29yZEJhdGNoKGluZGV4KTsgfVxuICAgIHB1YmxpYyBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCkgeyByZXR1cm4gKHRoaXMuaW1wbCBhcyBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+KVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTsgfVxuICAgIHB1YmxpYyBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7IHRocm93IG5ldyBFcnJvcihgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXIgaXMgbm90IEl0ZXJhYmxlYCk7IH1cbn1cblxuYWJzdHJhY3QgY2xhc3MgUmVjb3JkQmF0Y2hSZWFkZXJJbXBsQmFzZTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiB7XG5cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIHNjaGVtYTogU2NoZW1hO1xuICAgIHB1YmxpYyBjbG9zZWQgPSBmYWxzZTtcbiAgICBwdWJsaWMgYXV0b0Nsb3NlID0gdHJ1ZTtcbiAgICBwdWJsaWMgZGljdGlvbmFyeUluZGV4ID0gMDtcbiAgICBwdWJsaWMgcmVjb3JkQmF0Y2hJbmRleCA9IDA7XG4gICAgcHVibGljIGRpY3Rpb25hcmllczogTWFwPG51bWJlciwgVmVjdG9yPjtcbiAgICBwdWJsaWMgZ2V0IG51bURpY3Rpb25hcmllcygpIHsgcmV0dXJuIHRoaXMuZGljdGlvbmFyeUluZGV4OyB9XG4gICAgcHVibGljIGdldCBudW1SZWNvcmRCYXRjaGVzKCkgeyByZXR1cm4gdGhpcy5yZWNvcmRCYXRjaEluZGV4OyB9XG5cbiAgICBjb25zdHJ1Y3RvcihkaWN0aW9uYXJpZXMgPSBuZXcgTWFwPG51bWJlciwgVmVjdG9yPigpKSB7XG4gICAgICAgIHRoaXMuZGljdGlvbmFyaWVzID0gZGljdGlvbmFyaWVzO1xuICAgIH1cbiAgICBwdWJsaWMgcmVzZXQoc2NoZW1hPzogU2NoZW1hPFQ+IHwgbnVsbCkge1xuICAgICAgICB0aGlzLmRpY3Rpb25hcnlJbmRleCA9IDA7XG4gICAgICAgIHRoaXMucmVjb3JkQmF0Y2hJbmRleCA9IDA7XG4gICAgICAgIHRoaXMuc2NoZW1hID0gPGFueT4gc2NoZW1hO1xuICAgICAgICB0aGlzLmRpY3Rpb25hcmllcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHByb3RlY3RlZCBfbG9hZFJlY29yZEJhdGNoKGhlYWRlcjogbWV0YWRhdGEuUmVjb3JkQmF0Y2gsIGJvZHk6IGFueSkge1xuICAgICAgICByZXR1cm4gbmV3IFJlY29yZEJhdGNoPFQ+KHRoaXMuc2NoZW1hLCBoZWFkZXIubGVuZ3RoLCB0aGlzLl9sb2FkVmVjdG9ycyhoZWFkZXIsIGJvZHksIHRoaXMuc2NoZW1hLmZpZWxkcykpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgX2xvYWREaWN0aW9uYXJ5QmF0Y2goaGVhZGVyOiBtZXRhZGF0YS5EaWN0aW9uYXJ5QmF0Y2gsIGJvZHk6IGFueSkge1xuICAgICAgICBjb25zdCB7IGlkLCBpc0RlbHRhLCBkYXRhIH0gPSBoZWFkZXI7XG4gICAgICAgIGNvbnN0IHsgZGljdGlvbmFyaWVzLCBzY2hlbWEgfSA9IHRoaXM7XG4gICAgICAgIGlmIChpc0RlbHRhIHx8ICFkaWN0aW9uYXJpZXMuZ2V0KGlkKSkge1xuXG4gICAgICAgICAgICBjb25zdCB0eXBlID0gc2NoZW1hLmRpY3Rpb25hcmllcy5nZXQoaWQpITtcbiAgICAgICAgICAgIGNvbnN0IHZlY3RvciA9IChpc0RlbHRhID8gZGljdGlvbmFyaWVzLmdldChpZCkhLmNvbmNhdChcbiAgICAgICAgICAgICAgICBWZWN0b3IubmV3KHRoaXMuX2xvYWRWZWN0b3JzKGRhdGEsIGJvZHksIFt0eXBlXSlbMF0pKSA6XG4gICAgICAgICAgICAgICAgVmVjdG9yLm5ldyh0aGlzLl9sb2FkVmVjdG9ycyhkYXRhLCBib2R5LCBbdHlwZV0pWzBdKSkgYXMgVmVjdG9yO1xuXG4gICAgICAgICAgICAoc2NoZW1hLmRpY3Rpb25hcnlGaWVsZHMuZ2V0KGlkKSB8fCBbXSkuZm9yRWFjaCgoeyB0eXBlIH0pID0+IHR5cGUuZGljdGlvbmFyeVZlY3RvciA9IHZlY3Rvcik7XG5cbiAgICAgICAgICAgIHJldHVybiB2ZWN0b3I7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRpY3Rpb25hcmllcy5nZXQoaWQpITtcbiAgICB9XG4gICAgcHJvdGVjdGVkIF9sb2FkVmVjdG9ycyhoZWFkZXI6IG1ldGFkYXRhLlJlY29yZEJhdGNoLCBib2R5OiBhbnksIHR5cGVzOiAoRmllbGQgfCBEYXRhVHlwZSlbXSkge1xuICAgICAgICByZXR1cm4gbmV3IFZlY3RvckxvYWRlcihib2R5LCBoZWFkZXIubm9kZXMsIGhlYWRlci5idWZmZXJzKS52aXNpdE1hbnkodHlwZXMpO1xuICAgIH1cbn1cblxuY2xhc3MgUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+XG4gICAgZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlckltcGxCYXNlPFQ+XG4gICAgICAgIGltcGxlbWVudHMgSVJlY29yZEJhdGNoUmVhZGVySW1wbDxUPiwgSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4ge1xuXG4gICAgY29uc3RydWN0b3IocHJvdGVjdGVkIHJlYWRlcjogTWVzc2FnZVJlYWRlciwgZGljdGlvbmFyaWVzID0gbmV3IE1hcDxudW1iZXIsIFZlY3Rvcj4oKSkge1xuICAgICAgICBzdXBlcihkaWN0aW9uYXJpZXMpO1xuICAgIH1cbiAgICBwdWJsaWMgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4ge1xuICAgICAgICByZXR1cm4gdGhpcyBhcyBJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PjtcbiAgICB9XG4gICAgcHVibGljIGNsb3NlKCkge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkICYmICh0aGlzLmNsb3NlZCA9IHRydWUpKSB7XG4gICAgICAgICAgICB0aGlzLnJlc2V0KCkucmVhZGVyLnJldHVybigpO1xuICAgICAgICAgICAgdGhpcy5yZWFkZXIgPSA8YW55PiBudWxsO1xuICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMgPSA8YW55PiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBwdWJsaWMgb3BlbihhdXRvQ2xvc2UgPSB0aGlzLmF1dG9DbG9zZSkge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkKSB7XG4gICAgICAgICAgICB0aGlzLmF1dG9DbG9zZSA9IGF1dG9DbG9zZTtcbiAgICAgICAgICAgIGlmICghKHRoaXMuc2NoZW1hIHx8ICh0aGlzLnNjaGVtYSA9IHRoaXMucmVhZGVyLnJlYWRTY2hlbWEoKSEpKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHB1YmxpYyB0aHJvdyh2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PGFueT4ge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkICYmIHRoaXMuYXV0b0Nsb3NlICYmICh0aGlzLmNsb3NlZCA9IHRydWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZXNldCgpLnJlYWRlci50aHJvdyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIElURVJBVE9SX0RPTkU7XG4gICAgfVxuICAgIHB1YmxpYyByZXR1cm4odmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxhbnk+IHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiB0aGlzLmF1dG9DbG9zZSAmJiAodGhpcy5jbG9zZWQgPSB0cnVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVzZXQoKS5yZWFkZXIucmV0dXJuKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gSVRFUkFUT1JfRE9ORTtcbiAgICB9XG4gICAgcHVibGljIG5leHQoKTogSXRlcmF0b3JSZXN1bHQ8UmVjb3JkQmF0Y2g8VD4+IHtcbiAgICAgICAgaWYgKHRoaXMuY2xvc2VkKSB7IHJldHVybiBJVEVSQVRPUl9ET05FOyB9XG4gICAgICAgIGxldCBtZXNzYWdlOiBNZXNzYWdlIHwgbnVsbCwgeyByZWFkZXIgfSA9IHRoaXM7XG4gICAgICAgIHdoaWxlIChtZXNzYWdlID0gdGhpcy5yZWFkTmV4dE1lc3NhZ2VBbmRWYWxpZGF0ZSgpKSB7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5pc1NjaGVtYSgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXNldChtZXNzYWdlLmhlYWRlcigpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5pc1JlY29yZEJhdGNoKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlY29yZEJhdGNoSW5kZXgrKztcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBtZXNzYWdlLmhlYWRlcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IHJlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRCYXRjaCA9IHRoaXMuX2xvYWRSZWNvcmRCYXRjaChoZWFkZXIsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgZG9uZTogZmFsc2UsIHZhbHVlOiByZWNvcmRCYXRjaCB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmlzRGljdGlvbmFyeUJhdGNoKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRpY3Rpb25hcnlJbmRleCsrO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IG1lc3NhZ2UuaGVhZGVyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gcmVhZGVyLnJlYWRNZXNzYWdlQm9keShtZXNzYWdlLmJvZHlMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHZlY3RvciA9IHRoaXMuX2xvYWREaWN0aW9uYXJ5QmF0Y2goaGVhZGVyLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyaWVzLnNldChoZWFkZXIuaWQsIHZlY3Rvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMucmV0dXJuKCk7XG4gICAgfVxuICAgIHByb3RlY3RlZCByZWFkTmV4dE1lc3NhZ2VBbmRWYWxpZGF0ZTxUIGV4dGVuZHMgTWVzc2FnZUhlYWRlcj4odHlwZT86IFQgfCBudWxsKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZTxUPih0eXBlKTtcbiAgICB9XG59XG5cbmNsYXNzIEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+XG4gICAgZXh0ZW5kcyBSZWNvcmRCYXRjaFJlYWRlckltcGxCYXNlPFQ+XG4gICAgICAgIGltcGxlbWVudHMgSVJlY29yZEJhdGNoUmVhZGVySW1wbDxUPiwgQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7XG5cbiAgICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgcmVhZGVyOiBBc3luY01lc3NhZ2VSZWFkZXIsIGRpY3Rpb25hcmllcyA9IG5ldyBNYXA8bnVtYmVyLCBWZWN0b3I+KCkpIHtcbiAgICAgICAgc3VwZXIoZGljdGlvbmFyaWVzKTtcbiAgICB9XG4gICAgcHVibGljIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7XG4gICAgICAgIHJldHVybiB0aGlzIGFzIEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj47XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyBjbG9zZSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiAodGhpcy5jbG9zZWQgPSB0cnVlKSkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5yZXNldCgpLnJlYWRlci5yZXR1cm4oKTtcbiAgICAgICAgICAgIHRoaXMucmVhZGVyID0gPGFueT4gbnVsbDtcbiAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyaWVzID0gPGFueT4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcHVibGljIGFzeW5jIG9wZW4oYXV0b0Nsb3NlID0gdGhpcy5hdXRvQ2xvc2UpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCkge1xuICAgICAgICAgICAgdGhpcy5hdXRvQ2xvc2UgPSBhdXRvQ2xvc2U7XG4gICAgICAgICAgICBpZiAoISh0aGlzLnNjaGVtYSB8fCAodGhpcy5zY2hlbWEgPSAoYXdhaXQgdGhpcy5yZWFkZXIucmVhZFNjaGVtYSgpKSEpKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyB0aHJvdyh2YWx1ZT86IGFueSk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55Pj4ge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkICYmIHRoaXMuYXV0b0Nsb3NlICYmICh0aGlzLmNsb3NlZCA9IHRydWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZXNldCgpLnJlYWRlci50aHJvdyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIElURVJBVE9SX0RPTkU7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyByZXR1cm4odmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+IHtcbiAgICAgICAgaWYgKCF0aGlzLmNsb3NlZCAmJiB0aGlzLmF1dG9DbG9zZSAmJiAodGhpcy5jbG9zZWQgPSB0cnVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVzZXQoKS5yZWFkZXIucmV0dXJuKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gSVRFUkFUT1JfRE9ORTtcbiAgICB9XG4gICAgcHVibGljIGFzeW5jIG5leHQoKSB7XG4gICAgICAgIGlmICh0aGlzLmNsb3NlZCkgeyByZXR1cm4gSVRFUkFUT1JfRE9ORTsgfVxuICAgICAgICBsZXQgbWVzc2FnZTogTWVzc2FnZSB8IG51bGwsIHsgcmVhZGVyIH0gPSB0aGlzO1xuICAgICAgICB3aGlsZSAobWVzc2FnZSA9IGF3YWl0IHRoaXMucmVhZE5leHRNZXNzYWdlQW5kVmFsaWRhdGUoKSkge1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuaXNTY2hlbWEoKSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucmVzZXQobWVzc2FnZS5oZWFkZXIoKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuaXNSZWNvcmRCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWNvcmRCYXRjaEluZGV4Kys7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSBhd2FpdCByZWFkZXIucmVhZE1lc3NhZ2VCb2R5KG1lc3NhZ2UuYm9keUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkQmF0Y2ggPSB0aGlzLl9sb2FkUmVjb3JkQmF0Y2goaGVhZGVyLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IGRvbmU6IGZhbHNlLCB2YWx1ZTogcmVjb3JkQmF0Y2ggfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5pc0RpY3Rpb25hcnlCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kaWN0aW9uYXJ5SW5kZXgrKztcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBtZXNzYWdlLmhlYWRlcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IGF3YWl0IHJlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB2ZWN0b3IgPSB0aGlzLl9sb2FkRGljdGlvbmFyeUJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpY3Rpb25hcmllcy5zZXQoaGVhZGVyLmlkLCB2ZWN0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJldHVybigpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgYXN5bmMgcmVhZE5leHRNZXNzYWdlQW5kVmFsaWRhdGU8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KHR5cGU/OiBUIHwgbnVsbCkge1xuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2U8VD4odHlwZSk7XG4gICAgfVxufVxuXG5jbGFzcyBSZWNvcmRCYXRjaEZpbGVSZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+XG4gICAgZXh0ZW5kcyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VD5cbiAgICAgICAgaW1wbGVtZW50cyBJUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUPiwgSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj4ge1xuXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyBmb290ZXI6IEZvb3RlcjtcbiAgICBwdWJsaWMgZ2V0IG51bURpY3Rpb25hcmllcygpIHsgcmV0dXJuIHRoaXMuZm9vdGVyLm51bURpY3Rpb25hcmllczsgfVxuICAgIHB1YmxpYyBnZXQgbnVtUmVjb3JkQmF0Y2hlcygpIHsgcmV0dXJuIHRoaXMuZm9vdGVyLm51bVJlY29yZEJhdGNoZXM7IH1cblxuICAgIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBmaWxlOiBSYW5kb21BY2Nlc3NGaWxlLCBkaWN0aW9uYXJpZXMgPSBuZXcgTWFwPG51bWJlciwgVmVjdG9yPigpKSB7XG4gICAgICAgIHN1cGVyKG5ldyBNZXNzYWdlUmVhZGVyKGZpbGUpLCBkaWN0aW9uYXJpZXMpO1xuICAgIH1cbiAgICBwdWJsaWMgb3BlbihhdXRvQ2xvc2UgPSB0aGlzLmF1dG9DbG9zZSkge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkICYmICF0aGlzLmZvb3Rlcikge1xuICAgICAgICAgICAgdGhpcy5zY2hlbWEgPSAodGhpcy5mb290ZXIgPSB0aGlzLnJlYWRGb290ZXIoKSkuc2NoZW1hO1xuICAgICAgICAgICAgZm9yIChjb25zdCBibG9jayBvZiB0aGlzLmZvb3Rlci5kaWN0aW9uYXJ5QmF0Y2hlcygpKSB7XG4gICAgICAgICAgICAgICAgYmxvY2sgJiYgdGhpcy5yZWFkRGljdGlvbmFyeUJhdGNoKHRoaXMuZGljdGlvbmFyeUluZGV4KyspO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdXBlci5vcGVuKGF1dG9DbG9zZSk7XG4gICAgfVxuICAgIHB1YmxpYyByZWFkUmVjb3JkQmF0Y2goaW5kZXg6IG51bWJlcikge1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgICAgaWYgKCF0aGlzLmZvb3RlcikgeyB0aGlzLm9wZW4oKTsgfVxuICAgICAgICBjb25zdCBibG9jayA9IHRoaXMuZm9vdGVyLmdldFJlY29yZEJhdGNoKGluZGV4KTtcbiAgICAgICAgaWYgKGJsb2NrICYmIHRoaXMuZmlsZS5zZWVrKGJsb2NrLm9mZnNldCkpIHtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZShNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlICYmIG1lc3NhZ2UuaXNSZWNvcmRCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRCYXRjaCA9IHRoaXMuX2xvYWRSZWNvcmRCYXRjaChoZWFkZXIsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlY29yZEJhdGNoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgcmVhZERpY3Rpb25hcnlCYXRjaChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGJsb2NrID0gdGhpcy5mb290ZXIuZ2V0RGljdGlvbmFyeUJhdGNoKGluZGV4KTtcbiAgICAgICAgaWYgKGJsb2NrICYmIHRoaXMuZmlsZS5zZWVrKGJsb2NrLm9mZnNldCkpIHtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZShNZXNzYWdlSGVhZGVyLkRpY3Rpb25hcnlCYXRjaCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZSAmJiBtZXNzYWdlLmlzRGljdGlvbmFyeUJhdGNoKCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBtZXNzYWdlLmhlYWRlcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IHRoaXMucmVhZGVyLnJlYWRNZXNzYWdlQm9keShtZXNzYWdlLmJvZHlMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHZlY3RvciA9IHRoaXMuX2xvYWREaWN0aW9uYXJ5QmF0Y2goaGVhZGVyLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGljdGlvbmFyaWVzLnNldChoZWFkZXIuaWQsIHZlY3Rvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcHJvdGVjdGVkIHJlYWRGb290ZXIoKSB7XG4gICAgICAgIGNvbnN0IHsgZmlsZSB9ID0gdGhpcztcbiAgICAgICAgY29uc3Qgc2l6ZSA9IGZpbGUuc2l6ZTtcbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0gc2l6ZSAtIG1hZ2ljQW5kUGFkZGluZztcbiAgICAgICAgY29uc3QgbGVuZ3RoID0gZmlsZS5yZWFkSW50MzIob2Zmc2V0KTtcbiAgICAgICAgY29uc3QgYnVmZmVyID0gZmlsZS5yZWFkQXQob2Zmc2V0IC0gbGVuZ3RoLCBsZW5ndGgpO1xuICAgICAgICByZXR1cm4gRm9vdGVyLmRlY29kZShidWZmZXIpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgcmVhZE5leHRNZXNzYWdlQW5kVmFsaWRhdGU8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KHR5cGU/OiBUIHwgbnVsbCk6IE1lc3NhZ2U8VD4gfCBudWxsIHtcbiAgICAgICAgaWYgKCF0aGlzLmZvb3RlcikgeyB0aGlzLm9wZW4oKTsgfVxuICAgICAgICBpZiAodGhpcy5yZWNvcmRCYXRjaEluZGV4IDwgdGhpcy5udW1SZWNvcmRCYXRjaGVzKSB7XG4gICAgICAgICAgICBjb25zdCBibG9jayA9IHRoaXMuZm9vdGVyLmdldFJlY29yZEJhdGNoKHRoaXMucmVjb3JkQmF0Y2hJbmRleCk7XG4gICAgICAgICAgICBpZiAoYmxvY2sgJiYgdGhpcy5maWxlLnNlZWsoYmxvY2sub2Zmc2V0KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZSh0eXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG59XG5cbmNsYXNzIEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PlxuICAgIGV4dGVuZHMgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VD5cbiAgICAgICAgaW1wbGVtZW50cyBJUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUPiwgQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFJlY29yZEJhdGNoPFQ+PiB7XG5cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIGZvb3RlcjogRm9vdGVyO1xuICAgIHB1YmxpYyBnZXQgbnVtRGljdGlvbmFyaWVzKCkgeyByZXR1cm4gdGhpcy5mb290ZXIubnVtRGljdGlvbmFyaWVzOyB9XG4gICAgcHVibGljIGdldCBudW1SZWNvcmRCYXRjaGVzKCkgeyByZXR1cm4gdGhpcy5mb290ZXIubnVtUmVjb3JkQmF0Y2hlczsgfVxuXG4gICAgY29uc3RydWN0b3IocHJvdGVjdGVkIGZpbGU6IEFzeW5jUmFuZG9tQWNjZXNzRmlsZSwgZGljdGlvbmFyaWVzID0gbmV3IE1hcDxudW1iZXIsIFZlY3Rvcj4oKSkge1xuICAgICAgICBzdXBlcihuZXcgQXN5bmNNZXNzYWdlUmVhZGVyKGZpbGUpLCBkaWN0aW9uYXJpZXMpO1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgb3BlbihhdXRvQ2xvc2UgPSB0aGlzLmF1dG9DbG9zZSkge1xuICAgICAgICBpZiAoIXRoaXMuY2xvc2VkICYmICF0aGlzLmZvb3Rlcikge1xuICAgICAgICAgICAgdGhpcy5zY2hlbWEgPSAodGhpcy5mb290ZXIgPSBhd2FpdCB0aGlzLnJlYWRGb290ZXIoKSkuc2NoZW1hO1xuICAgICAgICAgICAgZm9yIChjb25zdCBibG9jayBvZiB0aGlzLmZvb3Rlci5kaWN0aW9uYXJ5QmF0Y2hlcygpKSB7XG4gICAgICAgICAgICAgICAgYmxvY2sgJiYgdGhpcy5yZWFkRGljdGlvbmFyeUJhdGNoKHRoaXMuZGljdGlvbmFyeUluZGV4KyspO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhd2FpdCBzdXBlci5vcGVuKGF1dG9DbG9zZSk7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyByZWFkUmVjb3JkQmF0Y2goaW5kZXg6IG51bWJlcikge1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgICAgaWYgKCF0aGlzLmZvb3RlcikgeyBhd2FpdCB0aGlzLm9wZW4oKTsgfVxuICAgICAgICBjb25zdCBibG9jayA9IHRoaXMuZm9vdGVyLmdldFJlY29yZEJhdGNoKGluZGV4KTtcbiAgICAgICAgaWYgKGJsb2NrICYmIChhd2FpdCB0aGlzLmZpbGUuc2VlayhibG9jay5vZmZzZXQpKSkge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGF3YWl0IHRoaXMucmVhZGVyLnJlYWRNZXNzYWdlKE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2gpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UgJiYgbWVzc2FnZS5pc1JlY29yZEJhdGNoKCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBtZXNzYWdlLmhlYWRlcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IGF3YWl0IHRoaXMucmVhZGVyLnJlYWRNZXNzYWdlQm9keShtZXNzYWdlLmJvZHlMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZEJhdGNoID0gdGhpcy5fbG9hZFJlY29yZEJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVjb3JkQmF0Y2g7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHByb3RlY3RlZCBhc3luYyByZWFkRGljdGlvbmFyeUJhdGNoKGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgYmxvY2sgPSB0aGlzLmZvb3Rlci5nZXREaWN0aW9uYXJ5QmF0Y2goaW5kZXgpO1xuICAgICAgICBpZiAoYmxvY2sgJiYgKGF3YWl0IHRoaXMuZmlsZS5zZWVrKGJsb2NrLm9mZnNldCkpKSB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gYXdhaXQgdGhpcy5yZWFkZXIucmVhZE1lc3NhZ2UoTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2gpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UgJiYgbWVzc2FnZS5pc0RpY3Rpb25hcnlCYXRjaCgpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWZmZXIgPSBhd2FpdCB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZUJvZHkobWVzc2FnZS5ib2R5TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB2ZWN0b3IgPSB0aGlzLl9sb2FkRGljdGlvbmFyeUJhdGNoKGhlYWRlciwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpY3Rpb25hcmllcy5zZXQoaGVhZGVyLmlkLCB2ZWN0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHByb3RlY3RlZCBhc3luYyByZWFkRm9vdGVyKCkge1xuICAgICAgICBjb25zdCB7IGZpbGUgfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0IG9mZnNldCA9IGZpbGUuc2l6ZSAtIG1hZ2ljQW5kUGFkZGluZztcbiAgICAgICAgY29uc3QgbGVuZ3RoID0gYXdhaXQgZmlsZS5yZWFkSW50MzIob2Zmc2V0KTtcbiAgICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgZmlsZS5yZWFkQXQob2Zmc2V0IC0gbGVuZ3RoLCBsZW5ndGgpO1xuICAgICAgICByZXR1cm4gRm9vdGVyLmRlY29kZShidWZmZXIpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgYXN5bmMgcmVhZE5leHRNZXNzYWdlQW5kVmFsaWRhdGU8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KHR5cGU/OiBUIHwgbnVsbCk6IFByb21pc2U8TWVzc2FnZTxUPiB8IG51bGw+IHtcbiAgICAgICAgaWYgKCF0aGlzLmZvb3RlcikgeyBhd2FpdCB0aGlzLm9wZW4oKTsgfVxuICAgICAgICBpZiAodGhpcy5yZWNvcmRCYXRjaEluZGV4IDwgdGhpcy5udW1SZWNvcmRCYXRjaGVzKSB7XG4gICAgICAgICAgICBjb25zdCBibG9jayA9IHRoaXMuZm9vdGVyLmdldFJlY29yZEJhdGNoKHRoaXMucmVjb3JkQmF0Y2hJbmRleCk7XG4gICAgICAgICAgICBpZiAoYmxvY2sgJiYgYXdhaXQgdGhpcy5maWxlLnNlZWsoYmxvY2sub2Zmc2V0KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJlYWRlci5yZWFkTWVzc2FnZSh0eXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG59XG5cbmNsYXNzIFJlY29yZEJhdGNoSlNPTlJlYWRlckltcGw8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlckltcGw8VD4ge1xuICAgIGNvbnN0cnVjdG9yKHByb3RlY3RlZCByZWFkZXI6IEpTT05NZXNzYWdlUmVhZGVyLCBkaWN0aW9uYXJpZXMgPSBuZXcgTWFwPG51bWJlciwgVmVjdG9yPigpKSB7XG4gICAgICAgIHN1cGVyKHJlYWRlciwgZGljdGlvbmFyaWVzKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIF9sb2FkVmVjdG9ycyhoZWFkZXI6IG1ldGFkYXRhLlJlY29yZEJhdGNoLCBib2R5OiBhbnksIHR5cGVzOiAoRmllbGQgfCBEYXRhVHlwZSlbXSkge1xuICAgICAgICByZXR1cm4gbmV3IEpTT05WZWN0b3JMb2FkZXIoYm9keSwgaGVhZGVyLm5vZGVzLCBoZWFkZXIuYnVmZmVycykudmlzaXRNYW55KHR5cGVzKTtcbiAgICB9XG59XG5cbmludGVyZmFjZSBJUmVjb3JkQmF0Y2hSZWFkZXJJbXBsPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IHtcblxuICAgIGNsb3NlZDogYm9vbGVhbjtcbiAgICBzY2hlbWE6IFNjaGVtYTxUPjtcbiAgICBhdXRvQ2xvc2U6IGJvb2xlYW47XG4gICAgbnVtRGljdGlvbmFyaWVzOiBudW1iZXI7XG4gICAgbnVtUmVjb3JkQmF0Y2hlczogbnVtYmVyO1xuICAgIGRpY3Rpb25hcmllczogTWFwPG51bWJlciwgVmVjdG9yPjtcblxuICAgIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbik6IHRoaXMgfCBQcm9taXNlPHRoaXM+O1xuICAgIHJlc2V0KHNjaGVtYT86IFNjaGVtYTxUPiB8IG51bGwpOiB0aGlzO1xuICAgIGNsb3NlKCk6IHRoaXMgfCBQcm9taXNlPHRoaXM+O1xuXG4gICAgW1N5bWJvbC5pdGVyYXRvcl0/KCk6IEl0ZXJhYmxlSXRlcmF0b3I8UmVjb3JkQmF0Y2g8VD4+O1xuICAgIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0/KCk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxSZWNvcmRCYXRjaDxUPj47XG5cbiAgICB0aHJvdyh2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PGFueT4gfCBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+O1xuICAgIHJldHVybih2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PGFueT4gfCBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+O1xuICAgIG5leHQodmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxSZWNvcmRCYXRjaDxUPj4gfCBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PFJlY29yZEJhdGNoPFQ+Pj47XG59XG5cbmludGVyZmFjZSBJUmVjb3JkQmF0Y2hGaWxlUmVhZGVySW1wbDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIElSZWNvcmRCYXRjaFJlYWRlckltcGw8VD4ge1xuXG4gICAgZm9vdGVyOiBGb290ZXI7XG5cbiAgICByZWFkUmVjb3JkQmF0Y2goaW5kZXg6IG51bWJlcik6IFJlY29yZEJhdGNoPFQ+IHwgbnVsbCB8IFByb21pc2U8UmVjb3JkQmF0Y2g8VD4gfCBudWxsPjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZWNvcmRCYXRjaEZpbGVSZWFkZXI8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4ge1xuICAgIGNhbmNlbCgpOiB2b2lkO1xuICAgIG9wZW4oYXV0b0Nsb3NlPzogYm9vbGVhbik6IHRoaXM7XG4gICAgdGhyb3codmFsdWU/OiBhbnkpOiBJdGVyYXRvclJlc3VsdDxhbnk+O1xuICAgIHJldHVybih2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PGFueT47XG4gICAgbmV4dCh2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PFJlY29yZEJhdGNoPFQ+PjtcbiAgICByZWFkUmVjb3JkQmF0Y2goaW5kZXg6IG51bWJlcik6IFJlY29yZEJhdGNoPFQ+IHwgbnVsbDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiB7XG4gICAgY2FuY2VsKCk6IHZvaWQ7XG4gICAgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKTogdGhpcztcbiAgICB0aHJvdyh2YWx1ZT86IGFueSk6IEl0ZXJhdG9yUmVzdWx0PGFueT47XG4gICAgcmV0dXJuKHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8YW55PjtcbiAgICBuZXh0KHZhbHVlPzogYW55KTogSXRlcmF0b3JSZXN1bHQ8UmVjb3JkQmF0Y2g8VD4+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFzeW5jUmVjb3JkQmF0Y2hGaWxlUmVhZGVyPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IHtcbiAgICBjYW5jZWwoKTogUHJvbWlzZTx2b2lkPjtcbiAgICBvcGVuKGF1dG9DbG9zZT86IGJvb2xlYW4pOiBQcm9taXNlPHRoaXM+O1xuICAgIHRocm93KHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxhbnk+PjtcbiAgICByZXR1cm4odmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+O1xuICAgIG5leHQodmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PFJlY29yZEJhdGNoPFQ+Pj47XG4gICAgcmVhZFJlY29yZEJhdGNoKGluZGV4OiBudW1iZXIpOiBQcm9taXNlPFJlY29yZEJhdGNoPFQ+IHwgbnVsbD47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXN5bmNSZWNvcmRCYXRjaFN0cmVhbVJlYWRlcjxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiB7XG4gICAgY2FuY2VsKCk6IFByb21pc2U8dm9pZD47XG4gICAgb3BlbihhdXRvQ2xvc2U/OiBib29sZWFuKTogUHJvbWlzZTx0aGlzPjtcbiAgICB0aHJvdyh2YWx1ZT86IGFueSk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55Pj47XG4gICAgcmV0dXJuKHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxhbnk+PjtcbiAgICBuZXh0KHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxSZWNvcmRCYXRjaDxUPj4+O1xufVxuIl19

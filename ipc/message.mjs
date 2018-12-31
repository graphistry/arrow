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
import { MessageHeader } from '../enum';
import { flatbuffers } from 'flatbuffers';
var ByteBuffer = flatbuffers.ByteBuffer;
import { Message } from './metadata/message';
import { isFileHandle } from '../util/compat';
import { AsyncRandomAccessFile } from '../io/file';
import { toUint8Array } from '../util/buffer';
import { ByteStream, AsyncByteStream } from '../io/stream';
import { ArrowJSON, ITERATOR_DONE } from '../io/interfaces';
/** @ignore */ const invalidMessageType = (type) => `Expected ${MessageHeader[type]} Message in stream, but was null or length 0.`;
/** @ignore */ const nullMessage = (type) => `Header pointer of flatbuffer-encoded ${MessageHeader[type]} Message is null or length 0.`;
/** @ignore */ const invalidMessageMetadata = (expected, actual) => `Expected to read ${expected} metadata bytes, but only read ${actual}.`;
/** @ignore */ const invalidMessageBodyLength = (expected, actual) => `Expected to read ${expected} bytes for message body, but only read ${actual}.`;
/** @ignore */
export class MessageReader {
    constructor(source) {
        this.source = source instanceof ByteStream ? source : new ByteStream(source);
    }
    [Symbol.iterator]() { return this; }
    next() {
        let r;
        if ((r = this.readMetadataLength()).done) {
            return ITERATOR_DONE;
        }
        if ((r = this.readMetadata(r.value)).done) {
            return ITERATOR_DONE;
        }
        return r;
    }
    throw(value) { return this.source.throw(value); }
    return(value) { return this.source.return(value); }
    readMessage(type) {
        let r;
        if ((r = this.next()).done) {
            return null;
        }
        if ((type != null) && r.value.headerType !== type) {
            throw new Error(invalidMessageType(type));
        }
        return r.value;
    }
    readMessageBody(bodyLength) {
        if (bodyLength <= 0) {
            return new Uint8Array(0);
        }
        const buf = toUint8Array(this.source.read(bodyLength));
        if (buf.byteLength < bodyLength) {
            throw new Error(invalidMessageBodyLength(bodyLength, buf.byteLength));
        }
        // 1. Work around bugs in fs.ReadStream's internal Buffer pooling, see: https://github.com/nodejs/node/issues/24817
        // 2. Work around https://github.com/whatwg/streams/blob/0ebe4b042e467d9876d80ae045de3843092ad797/reference-implementation/lib/helpers.js#L126
        return /* 1. */ (buf.byteOffset % 8 === 0) &&
            /* 2. */ (buf.byteOffset + buf.byteLength) <= buf.buffer.byteLength ? buf : buf.slice();
    }
    readSchema(throwIfNull = false) {
        const type = MessageHeader.Schema;
        const message = this.readMessage(type);
        const schema = message && message.header();
        if (throwIfNull && !schema) {
            throw new Error(nullMessage(type));
        }
        return schema;
    }
    readMetadataLength() {
        const buf = this.source.read(PADDING);
        const bb = buf && new ByteBuffer(buf);
        const len = +(bb && bb.readInt32(0));
        return { done: len <= 0, value: len };
    }
    readMetadata(metadataLength) {
        const buf = this.source.read(metadataLength);
        if (!buf) {
            return ITERATOR_DONE;
        }
        if (buf.byteLength < metadataLength) {
            throw new Error(invalidMessageMetadata(metadataLength, buf.byteLength));
        }
        return { done: false, value: Message.decode(buf) };
    }
}
/** @ignore */
export class AsyncMessageReader {
    constructor(source, byteLength) {
        this.source = source instanceof AsyncByteStream ? source
            : isFileHandle(source)
                ? new AsyncRandomAccessFile(source, byteLength)
                : new AsyncByteStream(source);
    }
    [Symbol.asyncIterator]() { return this; }
    async next() {
        let r;
        if ((r = await this.readMetadataLength()).done) {
            return ITERATOR_DONE;
        }
        if ((r = await this.readMetadata(r.value)).done) {
            return ITERATOR_DONE;
        }
        return r;
    }
    async throw(value) { return await this.source.throw(value); }
    async return(value) { return await this.source.return(value); }
    async readMessage(type) {
        let r;
        if ((r = await this.next()).done) {
            return null;
        }
        if ((type != null) && r.value.headerType !== type) {
            throw new Error(invalidMessageType(type));
        }
        return r.value;
    }
    async readMessageBody(bodyLength) {
        if (bodyLength <= 0) {
            return new Uint8Array(0);
        }
        const buf = toUint8Array(await this.source.read(bodyLength));
        if (buf.byteLength < bodyLength) {
            throw new Error(invalidMessageBodyLength(bodyLength, buf.byteLength));
        }
        // 1. Work around bugs in fs.ReadStream's internal Buffer pooling, see: https://github.com/nodejs/node/issues/24817
        // 2. Work around https://github.com/whatwg/streams/blob/0ebe4b042e467d9876d80ae045de3843092ad797/reference-implementation/lib/helpers.js#L126
        return /* 1. */ (buf.byteOffset % 8 === 0) &&
            /* 2. */ (buf.byteOffset + buf.byteLength) <= buf.buffer.byteLength ? buf : buf.slice();
    }
    async readSchema(throwIfNull = false) {
        const type = MessageHeader.Schema;
        const message = await this.readMessage(type);
        const schema = message && message.header();
        if (throwIfNull && !schema) {
            throw new Error(nullMessage(type));
        }
        return schema;
    }
    async readMetadataLength() {
        const buf = await this.source.read(PADDING);
        const bb = buf && new ByteBuffer(buf);
        const len = +(bb && bb.readInt32(0));
        return { done: len <= 0, value: len };
    }
    async readMetadata(metadataLength) {
        const buf = await this.source.read(metadataLength);
        if (!buf) {
            return ITERATOR_DONE;
        }
        if (buf.byteLength < metadataLength) {
            throw new Error(invalidMessageMetadata(metadataLength, buf.byteLength));
        }
        return { done: false, value: Message.decode(buf) };
    }
}
/** @ignore */
export class JSONMessageReader extends MessageReader {
    constructor(source) {
        super(new Uint8Array(0));
        this._schema = false;
        this._body = [];
        this._batchIndex = 0;
        this._dictionaryIndex = 0;
        this._json = source instanceof ArrowJSON ? source : new ArrowJSON(source);
    }
    next() {
        const { _json, _batchIndex, _dictionaryIndex } = this;
        const numBatches = _json.batches.length;
        const numDictionaries = _json.dictionaries.length;
        if (!this._schema) {
            this._schema = true;
            const message = Message.fromJSON(_json.schema, MessageHeader.Schema);
            return { value: message, done: _batchIndex >= numBatches && _dictionaryIndex >= numDictionaries };
        }
        if (_dictionaryIndex < numDictionaries) {
            const batch = _json.dictionaries[this._dictionaryIndex++];
            this._body = batch['data']['columns'];
            const message = Message.fromJSON(batch, MessageHeader.DictionaryBatch);
            return { done: false, value: message };
        }
        if (_batchIndex < numBatches) {
            const batch = _json.batches[this._batchIndex++];
            this._body = batch['columns'];
            const message = Message.fromJSON(batch, MessageHeader.RecordBatch);
            return { done: false, value: message };
        }
        this._body = [];
        return ITERATOR_DONE;
    }
    readMessageBody(_bodyLength) {
        return flattenDataSources(this._body);
        function flattenDataSources(xs) {
            return (xs || []).reduce((buffers, column) => [
                ...buffers,
                ...(column['VALIDITY'] && [column['VALIDITY']] || []),
                ...(column['TYPE'] && [column['TYPE']] || []),
                ...(column['OFFSET'] && [column['OFFSET']] || []),
                ...(column['DATA'] && [column['DATA']] || []),
                ...flattenDataSources(column['children'])
            ], []);
        }
    }
    readMessage(type) {
        let r;
        if ((r = this.next()).done) {
            return null;
        }
        if ((type != null) && r.value.headerType !== type) {
            throw new Error(invalidMessageType(type));
        }
        return r.value;
    }
    readSchema() {
        const type = MessageHeader.Schema;
        const message = this.readMessage(type);
        const schema = message && message.header();
        if (!message || !schema) {
            throw new Error(nullMessage(type));
        }
        return schema;
    }
}
/** @ignore */
export const PADDING = 4;
/** @ignore */
export const MAGIC_STR = 'ARROW1';
/** @ignore */
export const MAGIC = new Uint8Array(MAGIC_STR.length);
for (let i = 0; i < MAGIC_STR.length; i += 1 | 0) {
    MAGIC[i] = MAGIC_STR.charCodeAt(i);
}
/** @ignore */
export function checkForMagicArrowString(buffer, index = 0) {
    for (let i = -1, n = MAGIC.length; ++i < n;) {
        if (MAGIC[i] !== buffer[index + i]) {
            return false;
        }
    }
    return true;
}
/** @ignore */
export const magicLength = MAGIC.length;
/** @ignore */
export const magicAndPadding = magicLength + PADDING;
/** @ignore */
export const magicX2AndPadding = magicLength * 2 + PADDING;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgTWVzc2FnZUhlYWRlciB9IGZyb20gJy4uL2VudW0nO1xuaW1wb3J0IHsgZmxhdGJ1ZmZlcnMgfSBmcm9tICdmbGF0YnVmZmVycyc7XG5pbXBvcnQgQnl0ZUJ1ZmZlciA9IGZsYXRidWZmZXJzLkJ5dGVCdWZmZXI7XG5pbXBvcnQgeyBNZXNzYWdlIH0gZnJvbSAnLi9tZXRhZGF0YS9tZXNzYWdlJztcbmltcG9ydCB7IGlzRmlsZUhhbmRsZSB9IGZyb20gJy4uL3V0aWwvY29tcGF0JztcbmltcG9ydCB7IEFzeW5jUmFuZG9tQWNjZXNzRmlsZSB9IGZyb20gJy4uL2lvL2ZpbGUnO1xuaW1wb3J0IHsgdG9VaW50OEFycmF5LCBBcnJheUJ1ZmZlclZpZXdJbnB1dCB9IGZyb20gJy4uL3V0aWwvYnVmZmVyJztcbmltcG9ydCB7IEJ5dGVTdHJlYW0sIFJlYWRhYmxlU291cmNlLCBBc3luY0J5dGVTdHJlYW0gfSBmcm9tICcuLi9pby9zdHJlYW0nO1xuaW1wb3J0IHsgQXJyb3dKU09OLCBBcnJvd0pTT05MaWtlLCBJVEVSQVRPUl9ET05FLCBGaWxlSGFuZGxlIH0gZnJvbSAnLi4vaW8vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaWdub3JlICovIGNvbnN0IGludmFsaWRNZXNzYWdlVHlwZSAgICAgICA9ICh0eXBlOiBNZXNzYWdlSGVhZGVyKSA9PiBgRXhwZWN0ZWQgJHtNZXNzYWdlSGVhZGVyW3R5cGVdfSBNZXNzYWdlIGluIHN0cmVhbSwgYnV0IHdhcyBudWxsIG9yIGxlbmd0aCAwLmA7XG4vKiogQGlnbm9yZSAqLyBjb25zdCBudWxsTWVzc2FnZSAgICAgICAgICAgICAgPSAodHlwZTogTWVzc2FnZUhlYWRlcikgPT4gYEhlYWRlciBwb2ludGVyIG9mIGZsYXRidWZmZXItZW5jb2RlZCAke01lc3NhZ2VIZWFkZXJbdHlwZV19IE1lc3NhZ2UgaXMgbnVsbCBvciBsZW5ndGggMC5gO1xuLyoqIEBpZ25vcmUgKi8gY29uc3QgaW52YWxpZE1lc3NhZ2VNZXRhZGF0YSAgID0gKGV4cGVjdGVkOiBudW1iZXIsIGFjdHVhbDogbnVtYmVyKSA9PiBgRXhwZWN0ZWQgdG8gcmVhZCAke2V4cGVjdGVkfSBtZXRhZGF0YSBieXRlcywgYnV0IG9ubHkgcmVhZCAke2FjdHVhbH0uYDtcbi8qKiBAaWdub3JlICovIGNvbnN0IGludmFsaWRNZXNzYWdlQm9keUxlbmd0aCA9IChleHBlY3RlZDogbnVtYmVyLCBhY3R1YWw6IG51bWJlcikgPT4gYEV4cGVjdGVkIHRvIHJlYWQgJHtleHBlY3RlZH0gYnl0ZXMgZm9yIG1lc3NhZ2UgYm9keSwgYnV0IG9ubHkgcmVhZCAke2FjdHVhbH0uYDtcblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjbGFzcyBNZXNzYWdlUmVhZGVyIGltcGxlbWVudHMgSXRlcmFibGVJdGVyYXRvcjxNZXNzYWdlPiB7XG4gICAgcHJvdGVjdGVkIHNvdXJjZTogQnl0ZVN0cmVhbTtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEJ5dGVTdHJlYW0gfCBBcnJheUJ1ZmZlclZpZXdJbnB1dCB8IEl0ZXJhYmxlPEFycmF5QnVmZmVyVmlld0lucHV0Pikge1xuICAgICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZSBpbnN0YW5jZW9mIEJ5dGVTdHJlYW0gPyBzb3VyY2UgOiBuZXcgQnl0ZVN0cmVhbShzb3VyY2UpO1xuICAgIH1cbiAgICBwdWJsaWMgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxNZXNzYWdlPiB7IHJldHVybiB0aGlzIGFzIEl0ZXJhYmxlSXRlcmF0b3I8TWVzc2FnZT47IH1cbiAgICBwdWJsaWMgbmV4dCgpOiBJdGVyYXRvclJlc3VsdDxNZXNzYWdlPiB7XG4gICAgICAgIGxldCByO1xuICAgICAgICBpZiAoKHIgPSB0aGlzLnJlYWRNZXRhZGF0YUxlbmd0aCgpKS5kb25lKSB7IHJldHVybiBJVEVSQVRPUl9ET05FOyB9XG4gICAgICAgIGlmICgociA9IHRoaXMucmVhZE1ldGFkYXRhKHIudmFsdWUpKS5kb25lKSB7IHJldHVybiBJVEVSQVRPUl9ET05FOyB9XG4gICAgICAgIHJldHVybiAoPGFueT4gcikgYXMgSXRlcmF0b3JSZXN1bHQ8TWVzc2FnZT47XG4gICAgfVxuICAgIHB1YmxpYyB0aHJvdyh2YWx1ZT86IGFueSkgeyByZXR1cm4gdGhpcy5zb3VyY2UudGhyb3codmFsdWUpOyB9XG4gICAgcHVibGljIHJldHVybih2YWx1ZT86IGFueSkgeyByZXR1cm4gdGhpcy5zb3VyY2UucmV0dXJuKHZhbHVlKTsgfVxuICAgIHB1YmxpYyByZWFkTWVzc2FnZTxUIGV4dGVuZHMgTWVzc2FnZUhlYWRlcj4odHlwZT86IFQgfCBudWxsKSB7XG4gICAgICAgIGxldCByOiBJdGVyYXRvclJlc3VsdDxNZXNzYWdlPFQ+PjtcbiAgICAgICAgaWYgKChyID0gdGhpcy5uZXh0KCkpLmRvbmUpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgICAgaWYgKCh0eXBlICE9IG51bGwpICYmIHIudmFsdWUuaGVhZGVyVHlwZSAhPT0gdHlwZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGludmFsaWRNZXNzYWdlVHlwZSh0eXBlKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHIudmFsdWU7XG4gICAgfVxuICAgIHB1YmxpYyByZWFkTWVzc2FnZUJvZHkoYm9keUxlbmd0aDogbnVtYmVyKTogVWludDhBcnJheSB7XG4gICAgICAgIGlmIChib2R5TGVuZ3RoIDw9IDApIHsgcmV0dXJuIG5ldyBVaW50OEFycmF5KDApOyB9XG4gICAgICAgIGNvbnN0IGJ1ZiA9IHRvVWludDhBcnJheSh0aGlzLnNvdXJjZS5yZWFkKGJvZHlMZW5ndGgpKTtcbiAgICAgICAgaWYgKGJ1Zi5ieXRlTGVuZ3RoIDwgYm9keUxlbmd0aCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGludmFsaWRNZXNzYWdlQm9keUxlbmd0aChib2R5TGVuZ3RoLCBidWYuYnl0ZUxlbmd0aCkpO1xuICAgICAgICB9XG4gICAgICAgIC8vIDEuIFdvcmsgYXJvdW5kIGJ1Z3MgaW4gZnMuUmVhZFN0cmVhbSdzIGludGVybmFsIEJ1ZmZlciBwb29saW5nLCBzZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9pc3N1ZXMvMjQ4MTdcbiAgICAgICAgLy8gMi4gV29yayBhcm91bmQgaHR0cHM6Ly9naXRodWIuY29tL3doYXR3Zy9zdHJlYW1zL2Jsb2IvMGViZTRiMDQyZTQ2N2Q5ODc2ZDgwYWUwNDVkZTM4NDMwOTJhZDc5Ny9yZWZlcmVuY2UtaW1wbGVtZW50YXRpb24vbGliL2hlbHBlcnMuanMjTDEyNlxuICAgICAgICByZXR1cm4gLyogMS4gKi8gKGJ1Zi5ieXRlT2Zmc2V0ICUgOCA9PT0gMCkgJiZcbiAgICAgICAgICAgICAgIC8qIDIuICovIChidWYuYnl0ZU9mZnNldCArIGJ1Zi5ieXRlTGVuZ3RoKSA8PSBidWYuYnVmZmVyLmJ5dGVMZW5ndGggPyBidWYgOiBidWYuc2xpY2UoKTtcbiAgICB9XG4gICAgcHVibGljIHJlYWRTY2hlbWEodGhyb3dJZk51bGwgPSBmYWxzZSkge1xuICAgICAgICBjb25zdCB0eXBlID0gTWVzc2FnZUhlYWRlci5TY2hlbWE7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSB0aGlzLnJlYWRNZXNzYWdlKHR5cGUpO1xuICAgICAgICBjb25zdCBzY2hlbWEgPSBtZXNzYWdlICYmIG1lc3NhZ2UuaGVhZGVyKCk7XG4gICAgICAgIGlmICh0aHJvd0lmTnVsbCAmJiAhc2NoZW1hKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobnVsbE1lc3NhZ2UodHlwZSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzY2hlbWE7XG4gICAgfVxuICAgIHByb3RlY3RlZCByZWFkTWV0YWRhdGFMZW5ndGgoKTogSXRlcmF0b3JSZXN1bHQ8bnVtYmVyPiB7XG4gICAgICAgIGNvbnN0IGJ1ZiA9IHRoaXMuc291cmNlLnJlYWQoUEFERElORyk7XG4gICAgICAgIGNvbnN0IGJiID0gYnVmICYmIG5ldyBCeXRlQnVmZmVyKGJ1Zik7XG4gICAgICAgIGNvbnN0IGxlbiA9ICsoYmIgJiYgYmIucmVhZEludDMyKDApKSE7XG4gICAgICAgIHJldHVybiB7IGRvbmU6IGxlbiA8PSAwLCB2YWx1ZTogbGVuIH07XG4gICAgfVxuICAgIHByb3RlY3RlZCByZWFkTWV0YWRhdGEobWV0YWRhdGFMZW5ndGg6IG51bWJlcik6IEl0ZXJhdG9yUmVzdWx0PE1lc3NhZ2U+IHtcbiAgICAgICAgY29uc3QgYnVmID0gdGhpcy5zb3VyY2UucmVhZChtZXRhZGF0YUxlbmd0aCk7XG4gICAgICAgIGlmICghYnVmKSB7IHJldHVybiBJVEVSQVRPUl9ET05FOyB9XG4gICAgICAgIGlmIChidWYuYnl0ZUxlbmd0aCA8IG1ldGFkYXRhTGVuZ3RoKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoaW52YWxpZE1lc3NhZ2VNZXRhZGF0YShtZXRhZGF0YUxlbmd0aCwgYnVmLmJ5dGVMZW5ndGgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyBkb25lOiBmYWxzZSwgdmFsdWU6IE1lc3NhZ2UuZGVjb2RlKGJ1ZikgfTtcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY2xhc3MgQXN5bmNNZXNzYWdlUmVhZGVyIGltcGxlbWVudHMgQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPE1lc3NhZ2U+IHtcbiAgICBwcm90ZWN0ZWQgc291cmNlOiBBc3luY0J5dGVTdHJlYW07XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBSZWFkYWJsZVNvdXJjZTxVaW50OEFycmF5Pik7XG4gICAgY29uc3RydWN0b3Ioc291cmNlOiBGaWxlSGFuZGxlLCBieXRlTGVuZ3RoPzogbnVtYmVyKTtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IGFueSwgYnl0ZUxlbmd0aD86IG51bWJlcikge1xuICAgICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZSBpbnN0YW5jZW9mIEFzeW5jQnl0ZVN0cmVhbSA/IHNvdXJjZVxuICAgICAgICAgICAgOiBpc0ZpbGVIYW5kbGUoc291cmNlKVxuICAgICAgICAgICAgPyBuZXcgQXN5bmNSYW5kb21BY2Nlc3NGaWxlKHNvdXJjZSwgYnl0ZUxlbmd0aCEpXG4gICAgICAgICAgICA6IG5ldyBBc3luY0J5dGVTdHJlYW0oc291cmNlKTtcbiAgICB9XG4gICAgcHVibGljIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPE1lc3NhZ2U+IHsgcmV0dXJuIHRoaXMgYXMgQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPE1lc3NhZ2U+OyB9XG4gICAgcHVibGljIGFzeW5jIG5leHQoKTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxNZXNzYWdlPj4ge1xuICAgICAgICBsZXQgcjtcbiAgICAgICAgaWYgKChyID0gYXdhaXQgdGhpcy5yZWFkTWV0YWRhdGFMZW5ndGgoKSkuZG9uZSkgeyByZXR1cm4gSVRFUkFUT1JfRE9ORTsgfVxuICAgICAgICBpZiAoKHIgPSBhd2FpdCB0aGlzLnJlYWRNZXRhZGF0YShyLnZhbHVlKSkuZG9uZSkgeyByZXR1cm4gSVRFUkFUT1JfRE9ORTsgfVxuICAgICAgICByZXR1cm4gKDxhbnk+IHIpIGFzIEl0ZXJhdG9yUmVzdWx0PE1lc3NhZ2U+O1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgdGhyb3codmFsdWU/OiBhbnkpIHsgcmV0dXJuIGF3YWl0IHRoaXMuc291cmNlLnRocm93KHZhbHVlKTsgfVxuICAgIHB1YmxpYyBhc3luYyByZXR1cm4odmFsdWU/OiBhbnkpIHsgcmV0dXJuIGF3YWl0IHRoaXMuc291cmNlLnJldHVybih2YWx1ZSk7IH1cbiAgICBwdWJsaWMgYXN5bmMgcmVhZE1lc3NhZ2U8VCBleHRlbmRzIE1lc3NhZ2VIZWFkZXI+KHR5cGU/OiBUIHwgbnVsbCkge1xuICAgICAgICBsZXQgcjogSXRlcmF0b3JSZXN1bHQ8TWVzc2FnZTxUPj47XG4gICAgICAgIGlmICgociA9IGF3YWl0IHRoaXMubmV4dCgpKS5kb25lKSB7IHJldHVybiBudWxsOyB9XG4gICAgICAgIGlmICgodHlwZSAhPSBudWxsKSAmJiByLnZhbHVlLmhlYWRlclR5cGUgIT09IHR5cGUpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihpbnZhbGlkTWVzc2FnZVR5cGUodHlwZSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByLnZhbHVlO1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgcmVhZE1lc3NhZ2VCb2R5KGJvZHlMZW5ndGg6IG51bWJlcik6IFByb21pc2U8VWludDhBcnJheT4ge1xuICAgICAgICBpZiAoYm9keUxlbmd0aCA8PSAwKSB7IHJldHVybiBuZXcgVWludDhBcnJheSgwKTsgfVxuICAgICAgICBjb25zdCBidWYgPSB0b1VpbnQ4QXJyYXkoYXdhaXQgdGhpcy5zb3VyY2UucmVhZChib2R5TGVuZ3RoKSk7XG4gICAgICAgIGlmIChidWYuYnl0ZUxlbmd0aCA8IGJvZHlMZW5ndGgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihpbnZhbGlkTWVzc2FnZUJvZHlMZW5ndGgoYm9keUxlbmd0aCwgYnVmLmJ5dGVMZW5ndGgpKTtcbiAgICAgICAgfVxuICAgICAgICAvLyAxLiBXb3JrIGFyb3VuZCBidWdzIGluIGZzLlJlYWRTdHJlYW0ncyBpbnRlcm5hbCBCdWZmZXIgcG9vbGluZywgc2VlOiBodHRwczovL2dpdGh1Yi5jb20vbm9kZWpzL25vZGUvaXNzdWVzLzI0ODE3XG4gICAgICAgIC8vIDIuIFdvcmsgYXJvdW5kIGh0dHBzOi8vZ2l0aHViLmNvbS93aGF0d2cvc3RyZWFtcy9ibG9iLzBlYmU0YjA0MmU0NjdkOTg3NmQ4MGFlMDQ1ZGUzODQzMDkyYWQ3OTcvcmVmZXJlbmNlLWltcGxlbWVudGF0aW9uL2xpYi9oZWxwZXJzLmpzI0wxMjZcbiAgICAgICAgcmV0dXJuIC8qIDEuICovIChidWYuYnl0ZU9mZnNldCAlIDggPT09IDApICYmXG4gICAgICAgICAgICAgICAvKiAyLiAqLyAoYnVmLmJ5dGVPZmZzZXQgKyBidWYuYnl0ZUxlbmd0aCkgPD0gYnVmLmJ1ZmZlci5ieXRlTGVuZ3RoID8gYnVmIDogYnVmLnNsaWNlKCk7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyByZWFkU2NoZW1hKHRocm93SWZOdWxsID0gZmFsc2UpIHtcbiAgICAgICAgY29uc3QgdHlwZSA9IE1lc3NhZ2VIZWFkZXIuU2NoZW1hO1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gYXdhaXQgdGhpcy5yZWFkTWVzc2FnZSh0eXBlKTtcbiAgICAgICAgY29uc3Qgc2NoZW1hID0gbWVzc2FnZSAmJiBtZXNzYWdlLmhlYWRlcigpO1xuICAgICAgICBpZiAodGhyb3dJZk51bGwgJiYgIXNjaGVtYSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG51bGxNZXNzYWdlKHR5cGUpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2NoZW1hO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgYXN5bmMgcmVhZE1ldGFkYXRhTGVuZ3RoKCk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8bnVtYmVyPj4ge1xuICAgICAgICBjb25zdCBidWYgPSBhd2FpdCB0aGlzLnNvdXJjZS5yZWFkKFBBRERJTkcpO1xuICAgICAgICBjb25zdCBiYiA9IGJ1ZiAmJiBuZXcgQnl0ZUJ1ZmZlcihidWYpO1xuICAgICAgICBjb25zdCBsZW4gPSArKGJiICYmIGJiLnJlYWRJbnQzMigwKSkhO1xuICAgICAgICByZXR1cm4geyBkb25lOiBsZW4gPD0gMCwgdmFsdWU6IGxlbiB9O1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgYXN5bmMgcmVhZE1ldGFkYXRhKG1ldGFkYXRhTGVuZ3RoOiBudW1iZXIpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PE1lc3NhZ2U+PiB7XG4gICAgICAgIGNvbnN0IGJ1ZiA9IGF3YWl0IHRoaXMuc291cmNlLnJlYWQobWV0YWRhdGFMZW5ndGgpO1xuICAgICAgICBpZiAoIWJ1ZikgeyByZXR1cm4gSVRFUkFUT1JfRE9ORTsgfVxuICAgICAgICBpZiAoYnVmLmJ5dGVMZW5ndGggPCBtZXRhZGF0YUxlbmd0aCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGludmFsaWRNZXNzYWdlTWV0YWRhdGEobWV0YWRhdGFMZW5ndGgsIGJ1Zi5ieXRlTGVuZ3RoKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsgZG9uZTogZmFsc2UsIHZhbHVlOiBNZXNzYWdlLmRlY29kZShidWYpIH07XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIEpTT05NZXNzYWdlUmVhZGVyIGV4dGVuZHMgTWVzc2FnZVJlYWRlciB7XG4gICAgcHJpdmF0ZSBfc2NoZW1hID0gZmFsc2U7XG4gICAgcHJpdmF0ZSBfanNvbjogQXJyb3dKU09OO1xuICAgIHByaXZhdGUgX2JvZHk6IGFueVtdID0gW107XG4gICAgcHJpdmF0ZSBfYmF0Y2hJbmRleCA9IDA7XG4gICAgcHJpdmF0ZSBfZGljdGlvbmFyeUluZGV4ID0gMDtcbiAgICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEFycm93SlNPTiB8IEFycm93SlNPTkxpa2UpIHtcbiAgICAgICAgc3VwZXIobmV3IFVpbnQ4QXJyYXkoMCkpO1xuICAgICAgICB0aGlzLl9qc29uID0gc291cmNlIGluc3RhbmNlb2YgQXJyb3dKU09OID8gc291cmNlIDogbmV3IEFycm93SlNPTihzb3VyY2UpO1xuICAgIH1cbiAgICBwdWJsaWMgbmV4dCgpIHtcbiAgICAgICAgY29uc3QgeyBfanNvbiwgX2JhdGNoSW5kZXgsIF9kaWN0aW9uYXJ5SW5kZXggfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0IG51bUJhdGNoZXMgPSBfanNvbi5iYXRjaGVzLmxlbmd0aDtcbiAgICAgICAgY29uc3QgbnVtRGljdGlvbmFyaWVzID0gX2pzb24uZGljdGlvbmFyaWVzLmxlbmd0aDtcbiAgICAgICAgaWYgKCF0aGlzLl9zY2hlbWEpIHtcbiAgICAgICAgICAgIHRoaXMuX3NjaGVtYSA9IHRydWU7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gTWVzc2FnZS5mcm9tSlNPTihfanNvbi5zY2hlbWEsIE1lc3NhZ2VIZWFkZXIuU2NoZW1hKTtcbiAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiBtZXNzYWdlLCBkb25lOiBfYmF0Y2hJbmRleCA+PSBudW1CYXRjaGVzICYmIF9kaWN0aW9uYXJ5SW5kZXggPj0gbnVtRGljdGlvbmFyaWVzIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKF9kaWN0aW9uYXJ5SW5kZXggPCBudW1EaWN0aW9uYXJpZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGJhdGNoID0gX2pzb24uZGljdGlvbmFyaWVzW3RoaXMuX2RpY3Rpb25hcnlJbmRleCsrXTtcbiAgICAgICAgICAgIHRoaXMuX2JvZHkgPSBiYXRjaFsnZGF0YSddWydjb2x1bW5zJ107XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gTWVzc2FnZS5mcm9tSlNPTihiYXRjaCwgTWVzc2FnZUhlYWRlci5EaWN0aW9uYXJ5QmF0Y2gpO1xuICAgICAgICAgICAgcmV0dXJuIHsgZG9uZTogZmFsc2UsIHZhbHVlOiBtZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKF9iYXRjaEluZGV4IDwgbnVtQmF0Y2hlcykge1xuICAgICAgICAgICAgY29uc3QgYmF0Y2ggPSBfanNvbi5iYXRjaGVzW3RoaXMuX2JhdGNoSW5kZXgrK107XG4gICAgICAgICAgICB0aGlzLl9ib2R5ID0gYmF0Y2hbJ2NvbHVtbnMnXTtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBNZXNzYWdlLmZyb21KU09OKGJhdGNoLCBNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoKTtcbiAgICAgICAgICAgIHJldHVybiB7IGRvbmU6IGZhbHNlLCB2YWx1ZTogbWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2JvZHkgPSBbXTtcbiAgICAgICAgcmV0dXJuIElURVJBVE9SX0RPTkU7XG4gICAgfVxuICAgIHB1YmxpYyByZWFkTWVzc2FnZUJvZHkoX2JvZHlMZW5ndGg/OiBudW1iZXIpIHtcbiAgICAgICAgcmV0dXJuIGZsYXR0ZW5EYXRhU291cmNlcyh0aGlzLl9ib2R5KSBhcyBhbnk7XG4gICAgICAgIGZ1bmN0aW9uIGZsYXR0ZW5EYXRhU291cmNlcyh4czogYW55W10pOiBhbnlbXVtdIHtcbiAgICAgICAgICAgIHJldHVybiAoeHMgfHwgW10pLnJlZHVjZTxhbnlbXVtdPigoYnVmZmVycywgY29sdW1uOiBhbnkpID0+IFtcbiAgICAgICAgICAgICAgICAuLi5idWZmZXJzLFxuICAgICAgICAgICAgICAgIC4uLihjb2x1bW5bJ1ZBTElESVRZJ10gJiYgW2NvbHVtblsnVkFMSURJVFknXV0gfHwgW10pLFxuICAgICAgICAgICAgICAgIC4uLihjb2x1bW5bJ1RZUEUnXSAmJiBbY29sdW1uWydUWVBFJ11dIHx8IFtdKSxcbiAgICAgICAgICAgICAgICAuLi4oY29sdW1uWydPRkZTRVQnXSAmJiBbY29sdW1uWydPRkZTRVQnXV0gfHwgW10pLFxuICAgICAgICAgICAgICAgIC4uLihjb2x1bW5bJ0RBVEEnXSAmJiBbY29sdW1uWydEQVRBJ11dIHx8IFtdKSxcbiAgICAgICAgICAgICAgICAuLi5mbGF0dGVuRGF0YVNvdXJjZXMoY29sdW1uWydjaGlsZHJlbiddKVxuICAgICAgICAgICAgXSwgW10gYXMgYW55W11bXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcHVibGljIHJlYWRNZXNzYWdlPFQgZXh0ZW5kcyBNZXNzYWdlSGVhZGVyPih0eXBlPzogVCB8IG51bGwpIHtcbiAgICAgICAgbGV0IHI6IEl0ZXJhdG9yUmVzdWx0PE1lc3NhZ2U8VD4+O1xuICAgICAgICBpZiAoKHIgPSB0aGlzLm5leHQoKSkuZG9uZSkgeyByZXR1cm4gbnVsbDsgfVxuICAgICAgICBpZiAoKHR5cGUgIT0gbnVsbCkgJiYgci52YWx1ZS5oZWFkZXJUeXBlICE9PSB0eXBlKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoaW52YWxpZE1lc3NhZ2VUeXBlKHR5cGUpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gci52YWx1ZTtcbiAgICB9XG4gICAgcHVibGljIHJlYWRTY2hlbWEoKSB7XG4gICAgICAgIGNvbnN0IHR5cGUgPSBNZXNzYWdlSGVhZGVyLlNjaGVtYTtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IHRoaXMucmVhZE1lc3NhZ2UodHlwZSk7XG4gICAgICAgIGNvbnN0IHNjaGVtYSA9IG1lc3NhZ2UgJiYgbWVzc2FnZS5oZWFkZXIoKTtcbiAgICAgICAgaWYgKCFtZXNzYWdlIHx8ICFzY2hlbWEpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihudWxsTWVzc2FnZSh0eXBlKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNjaGVtYTtcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY29uc3QgUEFERElORyA9IDQ7XG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNvbnN0IE1BR0lDX1NUUiA9ICdBUlJPVzEnO1xuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjb25zdCBNQUdJQyA9IG5ldyBVaW50OEFycmF5KE1BR0lDX1NUUi5sZW5ndGgpO1xuXG5mb3IgKGxldCBpID0gMDsgaSA8IE1BR0lDX1NUUi5sZW5ndGg7IGkgKz0gMSB8IDApIHtcbiAgICBNQUdJQ1tpXSA9IE1BR0lDX1NUUi5jaGFyQ29kZUF0KGkpO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrRm9yTWFnaWNBcnJvd1N0cmluZyhidWZmZXI6IFVpbnQ4QXJyYXksIGluZGV4ID0gMCkge1xuICAgIGZvciAobGV0IGkgPSAtMSwgbiA9IE1BR0lDLmxlbmd0aDsgKytpIDwgbjspIHtcbiAgICAgICAgaWYgKE1BR0lDW2ldICE9PSBidWZmZXJbaW5kZXggKyBpXSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNvbnN0IG1hZ2ljTGVuZ3RoID0gTUFHSUMubGVuZ3RoO1xuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjb25zdCBtYWdpY0FuZFBhZGRpbmcgPSBtYWdpY0xlbmd0aCArIFBBRERJTkc7XG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNvbnN0IG1hZ2ljWDJBbmRQYWRkaW5nID0gbWFnaWNMZW5ndGggKiAyICsgUEFERElORztcbiJdfQ==

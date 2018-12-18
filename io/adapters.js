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
const buffer_1 = require("../util/buffer");
/**
 * @ignore
 */
exports.default = {
    fromIterable(source) {
        return pump(fromIterable(source));
    },
    fromAsyncIterable(source) {
        return pump(fromAsyncIterable(source));
    },
    fromReadableDOMStream(source) {
        return pump(fromReadableDOMStream(source));
    },
    fromReadableNodeStream(stream) {
        return pump(fromReadableNodeStream(stream));
    },
    // @ts-ignore
    toReadableDOMStream(source, options) {
        throw new Error(`"toReadableDOMStream" not available in this environment`);
    },
    // @ts-ignore
    toReadableNodeStream(source, options) {
        throw new Error(`"toReadableNodeStream" not available in this environment`);
    },
};
const pump = (iterator) => { iterator.next(); return iterator; };
function* fromIterable(source) {
    let done, threw = false;
    let buffers = [], buffer;
    let cmd, size, bufferLength = 0;
    function byteRange() {
        if (cmd === 'peek') {
            return buffer_1.joinUint8Arrays(buffers.slice(), size)[0];
        }
        [buffer, buffers] = buffer_1.joinUint8Arrays(buffers, size);
        bufferLength -= buffer.byteLength;
        return buffer;
    }
    // Yield so the caller can inject the read command before creating the source Iterator
    ({ cmd, size } = yield null);
    // initialize the iterator
    let it = buffer_1.toUint8ArrayIterator(source)[Symbol.iterator]();
    try {
        do {
            // read the next value
            ({ done, value: buffer } = isNaN(size - bufferLength) ?
                it.next(undefined) : it.next(size - bufferLength));
            // if chunk is not null or empty, push it onto the queue
            if (!done && buffer.byteLength > 0) {
                buffers.push(buffer);
                bufferLength += buffer.byteLength;
            }
            // If we have enough bytes in our buffer, yield chunks until we don't
            if (done || size <= bufferLength) {
                do {
                    ({ cmd, size } = yield byteRange());
                } while (size < bufferLength);
            }
        } while (!done);
    }
    catch (e) {
        (threw = true) && (typeof it.throw === 'function') && (it.throw(e));
    }
    finally {
        (threw === false) && (typeof it.return === 'function') && (it.return());
    }
}
function fromAsyncIterable(source) {
    return tslib_1.__asyncGenerator(this, arguments, function* fromAsyncIterable_1() {
        let done, threw = false;
        let buffers = [], buffer;
        let cmd, size, bufferLength = 0;
        function byteRange() {
            if (cmd === 'peek') {
                return buffer_1.joinUint8Arrays(buffers.slice(), size)[0];
            }
            [buffer, buffers] = buffer_1.joinUint8Arrays(buffers, size);
            bufferLength -= buffer.byteLength;
            return buffer;
        }
        // Yield so the caller can inject the read command before creating the source AsyncIterator
        ({ cmd, size } = yield yield tslib_1.__await(null));
        // initialize the iterator
        let it = buffer_1.toUint8ArrayAsyncIterator(source)[Symbol.asyncIterator]();
        try {
            do {
                // read the next value
                ({ done, value: buffer } = isNaN(size - bufferLength)
                    ? yield tslib_1.__await(it.next(undefined))
                    : yield tslib_1.__await(it.next(size - bufferLength)));
                // if chunk is not null or empty, push it onto the queue
                if (!done && buffer.byteLength > 0) {
                    buffers.push(buffer);
                    bufferLength += buffer.byteLength;
                }
                // If we have enough bytes in our buffer, yield chunks until we don't
                if (done || size <= bufferLength) {
                    do {
                        ({ cmd, size } = yield yield tslib_1.__await(byteRange()));
                    } while (size < bufferLength);
                }
            } while (!done);
        }
        catch (e) {
            (threw = true) && (typeof it.throw === 'function') && (yield tslib_1.__await(it.throw(e)));
        }
        finally {
            (threw === false) && (typeof it.return === 'function') && (yield tslib_1.__await(it.return()));
        }
    });
}
// All this manual Uint8Array chunk management can be avoided if/when engines
// add support for ArrayBuffer.transfer() or ArrayBuffer.prototype.realloc():
// https://github.com/domenic/proposal-arraybuffer-transfer
function fromReadableDOMStream(source) {
    return tslib_1.__asyncGenerator(this, arguments, function* fromReadableDOMStream_1() {
        let done = false, threw = false;
        let buffers = [], buffer;
        let cmd, size, bufferLength = 0;
        function byteRange() {
            if (cmd === 'peek') {
                return buffer_1.joinUint8Arrays(buffers.slice(), size)[0];
            }
            [buffer, buffers] = buffer_1.joinUint8Arrays(buffers, size);
            bufferLength -= buffer.byteLength;
            return buffer;
        }
        // Yield so the caller can inject the read command before we establish the ReadableStream lock
        ({ cmd, size } = yield yield tslib_1.__await(null));
        // initialize the reader and lock the stream
        let it = new AdaptiveByteReader(source);
        try {
            do {
                // read the next value
                ({ done, value: buffer } = isNaN(size - bufferLength)
                    ? yield tslib_1.__await(it['read'](undefined))
                    : yield tslib_1.__await(it['read'](size - bufferLength)));
                // if chunk is not null or empty, push it onto the queue
                if (!done && buffer.byteLength > 0) {
                    buffers.push(buffer_1.toUint8Array(buffer));
                    bufferLength += buffer.byteLength;
                }
                // If we have enough bytes in our buffer, yield chunks until we don't
                if (done || size <= bufferLength) {
                    do {
                        ({ cmd, size } = yield yield tslib_1.__await(byteRange()));
                    } while (size < bufferLength);
                }
            } while (!done);
        }
        catch (e) {
            (threw = true) && (yield tslib_1.__await(it['cancel'](e)));
        }
        finally {
            source['locked'] && it.releaseLock();
            (threw === false) && (yield tslib_1.__await(it['cancel']()));
        }
    });
}
class AdaptiveByteReader {
    constructor(source) {
        this.source = source;
        this.byobReader = null;
        this.defaultReader = null;
        try {
            this.supportsBYOB = !!(this.reader = this.getBYOBReader());
        }
        catch (e) {
            this.supportsBYOB = !!!(this.reader = this.getDefaultReader());
        }
    }
    get closed() {
        return this.reader ? this.reader['closed'].catch(() => { }) : Promise.resolve();
    }
    releaseLock() {
        if (this.reader) {
            this.reader.releaseLock();
        }
        this.reader = this.byobReader = this.defaultReader = null;
    }
    cancel(reason) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const { reader } = this;
            this.reader = null;
            this.releaseLock();
            if (reader) {
                yield reader['cancel'](reason);
            }
        });
    }
    read(size) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (size === 0) {
                return { done: this.reader == null, value: new Uint8Array(0) };
            }
            const result = !this.supportsBYOB || typeof size !== 'number'
                ? yield this.getDefaultReader().read()
                : yield this.readFromBYOBReader(size);
            !result.done && (result.value = buffer_1.toUint8Array(result));
            return result;
        });
    }
    getDefaultReader() {
        if (this.byobReader) {
            this.releaseLock();
        }
        if (!this.defaultReader) {
            this.defaultReader = this.source['getReader']();
            // We have to catch and swallow errors here to avoid uncaught promise rejection exceptions
            // that seem to be raised when we call `releaseLock()` on this reader. I'm still mystified
            // about why these errors are raised, but I'm sure there's some important spec reason that
            // I haven't considered. I hate to employ such an anti-pattern here, but it seems like the
            // only solution in this case :/
            this.defaultReader['closed'].catch(() => { });
        }
        return (this.reader = this.defaultReader);
    }
    getBYOBReader() {
        if (this.defaultReader) {
            this.releaseLock();
        }
        if (!this.byobReader) {
            this.byobReader = this.source['getReader']({ mode: 'byob' });
            // We have to catch and swallow errors here to avoid uncaught promise rejection exceptions
            // that seem to be raised when we call `releaseLock()` on this reader. I'm still mystified
            // about why these errors are raised, but I'm sure there's some important spec reason that
            // I haven't considered. I hate to employ such an anti-pattern here, but it seems like the
            // only solution in this case :/
            this.byobReader['closed'].catch(() => { });
        }
        return (this.reader = this.byobReader);
    }
    // This strategy plucked from the example in the streams spec:
    // https://streams.spec.whatwg.org/#example-manual-read-bytes
    readFromBYOBReader(size) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield readInto(this.getBYOBReader(), new ArrayBuffer(size), 0, size);
        });
    }
}
function readInto(reader, buffer, offset, size) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (offset >= size) {
            return { done: false, value: new Uint8Array(buffer, 0, size) };
        }
        const { done, value } = yield reader.read(new Uint8Array(buffer, offset, size - offset));
        if (((offset += value.byteLength) < size) && !done) {
            return yield readInto(reader, value.buffer, offset, size);
        }
        return { done, value: new Uint8Array(value.buffer, 0, offset) };
    });
}
const onEvent = (stream, event) => {
    let handler = (_) => resolve([event, _]);
    let resolve;
    return [event, handler, new Promise((r) => (resolve = r) && stream['once'](event, handler))];
};
function fromReadableNodeStream(stream) {
    return tslib_1.__asyncGenerator(this, arguments, function* fromReadableNodeStream_1() {
        let events = [];
        let event = 'error';
        let done = false, err = null;
        let cmd, size, bufferLength = 0;
        let buffers = [], buffer;
        function byteRange() {
            if (cmd === 'peek') {
                return buffer_1.joinUint8Arrays(buffers.slice(), size)[0];
            }
            [buffer, buffers] = buffer_1.joinUint8Arrays(buffers, size);
            bufferLength -= buffer.byteLength;
            return buffer;
        }
        // Yield so the caller can inject the read command before we
        // add the listener for the source stream's 'readable' event.
        ({ cmd, size } = yield yield tslib_1.__await(null));
        // ignore stdin if it's a TTY
        if (stream['isTTY']) {
            return yield tslib_1.__await(yield yield tslib_1.__await(new Uint8Array(0)));
        }
        try {
            // initialize the stream event handlers
            events[0] = onEvent(stream, 'end');
            events[1] = onEvent(stream, 'error');
            do {
                events[2] = onEvent(stream, 'readable');
                // wait on the first message event from the stream
                [event, err] = yield tslib_1.__await(Promise.race(events.map((x) => x[2])));
                // if the stream emitted an Error, rethrow it
                if (event === 'error') {
                    break;
                }
                if (!(done = event === 'end')) {
                    // If the size is NaN, request to read everything in the stream's internal buffer
                    if (!isFinite(size - bufferLength)) {
                        buffer = buffer_1.toUint8Array(stream['read'](undefined));
                    }
                    else {
                        buffer = buffer_1.toUint8Array(stream['read'](size - bufferLength));
                        // If the byteLength is 0, then the requested amount is more than the stream has
                        // in its internal buffer. In this case the stream needs a "kick" to tell it to
                        // continue emitting readable events, so request to read everything the stream
                        // has in its internal buffer right now.
                        if (buffer.byteLength < (size - bufferLength)) {
                            buffer = buffer_1.toUint8Array(stream['read'](undefined));
                        }
                    }
                    // if chunk is not null or empty, push it onto the queue
                    if (buffer.byteLength > 0) {
                        buffers.push(buffer);
                        bufferLength += buffer.byteLength;
                    }
                }
                // If we have enough bytes in our buffer, yield chunks until we don't
                if (done || size <= bufferLength) {
                    do {
                        ({ cmd, size } = yield yield tslib_1.__await(byteRange()));
                    } while (size < bufferLength);
                }
            } while (!done);
        }
        finally {
            yield tslib_1.__await(cleanup(events, event === 'error' ? err : null));
        }
        function cleanup(events, err) {
            buffer = buffers = null;
            return new Promise((resolve, reject) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                for (const [evt, fn] of events) {
                    stream['off'](evt, fn);
                }
                const [evt, fn, closed] = onEvent(stream, 'close');
                const destroyed = new Promise((resolve, reject) => {
                    const destroy = stream['destroy'] || ((e, cb) => cb(e));
                    destroy.call(stream, err, (e) => e != null ? reject(e) : resolve());
                });
                try {
                    yield Promise.race([closed, destroyed]);
                    err = undefined;
                }
                catch (e) {
                    err = e || err;
                }
                finally {
                    stream['off'](evt, fn);
                    err != null ? reject(err) : resolve();
                }
            }));
        }
    });
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUUsQ0FBQyxDQUFDO2dCQUMzRSxDQUFDLENBQUMsQ0FBQztnQkFDSCxJQUFJO29CQUNBLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO29CQUN4QyxHQUFHLEdBQUcsU0FBUyxDQUFDO2lCQUNuQjtnQkFBQyxPQUFPLENBQUMsRUFBRTtvQkFBRSxHQUFHLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQztpQkFBRTt3QkFBUztvQkFDcEMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDdkIsR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztpQkFDekM7WUFDTCxDQUFDLENBQUEsQ0FBQyxDQUFDO1FBQ1AsQ0FBQztJQUNMLENBQUM7Q0FBQSIsImZpbGUiOiJpby9hZGFwdGVycy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQge1xuICAgIHRvVWludDhBcnJheSxcbiAgICBqb2luVWludDhBcnJheXMsXG4gICAgQXJyYXlCdWZmZXJWaWV3SW5wdXQsXG4gICAgdG9VaW50OEFycmF5SXRlcmF0b3IsXG4gICAgdG9VaW50OEFycmF5QXN5bmNJdGVyYXRvclxufSBmcm9tICcuLi91dGlsL2J1ZmZlcic7XG5cbmltcG9ydCB7IFJlYWRhYmxlRE9NU3RyZWFtT3B0aW9ucyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKlxuICogQGlnbm9yZVxuICovXG5leHBvcnQgZGVmYXVsdCB7XG4gICAgZnJvbUl0ZXJhYmxlPFQgZXh0ZW5kcyBBcnJheUJ1ZmZlclZpZXdJbnB1dD4oc291cmNlOiBJdGVyYWJsZTxUPiB8IFQpOiBJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcbiAgICAgICAgcmV0dXJuIHB1bXAoZnJvbUl0ZXJhYmxlPFQ+KHNvdXJjZSkpO1xuICAgIH0sXG4gICAgZnJvbUFzeW5jSXRlcmFibGU8VCBleHRlbmRzIEFycmF5QnVmZmVyVmlld0lucHV0Pihzb3VyY2U6IEFzeW5jSXRlcmFibGU8VD4gfCBQcm9taXNlTGlrZTxUPik6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxVaW50OEFycmF5PiB7XG4gICAgICAgIHJldHVybiBwdW1wKGZyb21Bc3luY0l0ZXJhYmxlPFQ+KHNvdXJjZSkpO1xuICAgIH0sXG4gICAgZnJvbVJlYWRhYmxlRE9NU3RyZWFtPFQgZXh0ZW5kcyBBcnJheUJ1ZmZlclZpZXdJbnB1dD4oc291cmNlOiBSZWFkYWJsZVN0cmVhbTxUPik6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxVaW50OEFycmF5PiB7XG4gICAgICAgIHJldHVybiBwdW1wKGZyb21SZWFkYWJsZURPTVN0cmVhbTxUPihzb3VyY2UpKTtcbiAgICB9LFxuICAgIGZyb21SZWFkYWJsZU5vZGVTdHJlYW0oc3RyZWFtOiBOb2RlSlMuUmVhZGFibGVTdHJlYW0pOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8VWludDhBcnJheT4ge1xuICAgICAgICByZXR1cm4gcHVtcChmcm9tUmVhZGFibGVOb2RlU3RyZWFtKHN0cmVhbSkpO1xuICAgIH0sXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHRvUmVhZGFibGVET01TdHJlYW08VD4oc291cmNlOiBJdGVyYWJsZTxUPiB8IEFzeW5jSXRlcmFibGU8VD4sIG9wdGlvbnM/OiBSZWFkYWJsZURPTVN0cmVhbU9wdGlvbnMpOiBSZWFkYWJsZVN0cmVhbTxUPiB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgXCJ0b1JlYWRhYmxlRE9NU3RyZWFtXCIgbm90IGF2YWlsYWJsZSBpbiB0aGlzIGVudmlyb25tZW50YCk7XG4gICAgfSxcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgdG9SZWFkYWJsZU5vZGVTdHJlYW08VD4oc291cmNlOiBJdGVyYWJsZTxUPiB8IEFzeW5jSXRlcmFibGU8VD4sIG9wdGlvbnM/OiBpbXBvcnQoJ3N0cmVhbScpLlJlYWRhYmxlT3B0aW9ucyk6IGltcG9ydCgnc3RyZWFtJykuUmVhZGFibGUge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFwidG9SZWFkYWJsZU5vZGVTdHJlYW1cIiBub3QgYXZhaWxhYmxlIGluIHRoaXMgZW52aXJvbm1lbnRgKTtcbiAgICB9LFxufTtcblxuY29uc3QgcHVtcCA9IDxUIGV4dGVuZHMgSXRlcmF0b3I8YW55PiB8IEFzeW5jSXRlcmF0b3I8YW55Pj4oaXRlcmF0b3I6IFQpID0+IHsgaXRlcmF0b3IubmV4dCgpOyByZXR1cm4gaXRlcmF0b3I7IH07XG5cbmZ1bmN0aW9uKiBmcm9tSXRlcmFibGU8VCBleHRlbmRzIEFycmF5QnVmZmVyVmlld0lucHV0Pihzb3VyY2U6IEl0ZXJhYmxlPFQ+IHwgVCk6IEl0ZXJhYmxlSXRlcmF0b3I8VWludDhBcnJheT4ge1xuXG4gICAgbGV0IGRvbmU6IGJvb2xlYW4sIHRocmV3ID0gZmFsc2U7XG4gICAgbGV0IGJ1ZmZlcnM6IFVpbnQ4QXJyYXlbXSA9IFtdLCBidWZmZXI6IFVpbnQ4QXJyYXk7XG4gICAgbGV0IGNtZDogJ3BlZWsnIHwgJ3JlYWQnLCBzaXplOiBudW1iZXIsIGJ1ZmZlckxlbmd0aCA9IDA7XG5cbiAgICBmdW5jdGlvbiBieXRlUmFuZ2UoKSB7XG4gICAgICAgIGlmIChjbWQgPT09ICdwZWVrJykge1xuICAgICAgICAgICAgcmV0dXJuIGpvaW5VaW50OEFycmF5cyhidWZmZXJzLnNsaWNlKCksIHNpemUpWzBdO1xuICAgICAgICB9XG4gICAgICAgIFtidWZmZXIsIGJ1ZmZlcnNdID0gam9pblVpbnQ4QXJyYXlzKGJ1ZmZlcnMsIHNpemUpO1xuICAgICAgICBidWZmZXJMZW5ndGggLT0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgfVxuXG4gICAgLy8gWWllbGQgc28gdGhlIGNhbGxlciBjYW4gaW5qZWN0IHRoZSByZWFkIGNvbW1hbmQgYmVmb3JlIGNyZWF0aW5nIHRoZSBzb3VyY2UgSXRlcmF0b3JcbiAgICAoeyBjbWQsIHNpemUgfSA9IHlpZWxkIDxhbnk+IG51bGwpO1xuXG4gICAgLy8gaW5pdGlhbGl6ZSB0aGUgaXRlcmF0b3JcbiAgICBsZXQgaXQgPSB0b1VpbnQ4QXJyYXlJdGVyYXRvcihzb3VyY2UpW1N5bWJvbC5pdGVyYXRvcl0oKTtcblxuICAgIHRyeSB7XG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIC8vIHJlYWQgdGhlIG5leHQgdmFsdWVcbiAgICAgICAgICAgICh7IGRvbmUsIHZhbHVlOiBidWZmZXIgfSA9IGlzTmFOKHNpemUgLSBidWZmZXJMZW5ndGgpID9cbiAgICAgICAgICAgICAgICBpdC5uZXh0KHVuZGVmaW5lZCkgOiBpdC5uZXh0KHNpemUgLSBidWZmZXJMZW5ndGgpKTtcbiAgICAgICAgICAgIC8vIGlmIGNodW5rIGlzIG5vdCBudWxsIG9yIGVtcHR5LCBwdXNoIGl0IG9udG8gdGhlIHF1ZXVlXG4gICAgICAgICAgICBpZiAoIWRvbmUgJiYgYnVmZmVyLmJ5dGVMZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVycy5wdXNoKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgYnVmZmVyTGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBlbm91Z2ggYnl0ZXMgaW4gb3VyIGJ1ZmZlciwgeWllbGQgY2h1bmtzIHVudGlsIHdlIGRvbid0XG4gICAgICAgICAgICBpZiAoZG9uZSB8fCBzaXplIDw9IGJ1ZmZlckxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCBieXRlUmFuZ2UoKSk7XG4gICAgICAgICAgICAgICAgfSB3aGlsZSAoc2l6ZSA8IGJ1ZmZlckxlbmd0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gd2hpbGUgKCFkb25lKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICh0aHJldyA9IHRydWUpICYmICh0eXBlb2YgaXQudGhyb3cgPT09ICdmdW5jdGlvbicpICYmIChpdC50aHJvdyhlKSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgKHRocmV3ID09PSBmYWxzZSkgJiYgKHR5cGVvZiBpdC5yZXR1cm4gPT09ICdmdW5jdGlvbicpICYmIChpdC5yZXR1cm4oKSk7XG4gICAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiogZnJvbUFzeW5jSXRlcmFibGU8VCBleHRlbmRzIEFycmF5QnVmZmVyVmlld0lucHV0Pihzb3VyY2U6IEFzeW5jSXRlcmFibGU8VD4gfCBQcm9taXNlTGlrZTxUPik6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxVaW50OEFycmF5PiB7XG5cbiAgICBsZXQgZG9uZTogYm9vbGVhbiwgdGhyZXcgPSBmYWxzZTtcbiAgICBsZXQgYnVmZmVyczogVWludDhBcnJheVtdID0gW10sIGJ1ZmZlcjogVWludDhBcnJheTtcbiAgICBsZXQgY21kOiAncGVlaycgfCAncmVhZCcsIHNpemU6IG51bWJlciwgYnVmZmVyTGVuZ3RoID0gMDtcblxuICAgIGZ1bmN0aW9uIGJ5dGVSYW5nZSgpIHtcbiAgICAgICAgaWYgKGNtZCA9PT0gJ3BlZWsnKSB7XG4gICAgICAgICAgICByZXR1cm4gam9pblVpbnQ4QXJyYXlzKGJ1ZmZlcnMuc2xpY2UoKSwgc2l6ZSlbMF07XG4gICAgICAgIH1cbiAgICAgICAgW2J1ZmZlciwgYnVmZmVyc10gPSBqb2luVWludDhBcnJheXMoYnVmZmVycywgc2l6ZSk7XG4gICAgICAgIGJ1ZmZlckxlbmd0aCAtPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICAvLyBZaWVsZCBzbyB0aGUgY2FsbGVyIGNhbiBpbmplY3QgdGhlIHJlYWQgY29tbWFuZCBiZWZvcmUgY3JlYXRpbmcgdGhlIHNvdXJjZSBBc3luY0l0ZXJhdG9yXG4gICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCA8YW55PiBudWxsKTtcblxuICAgIC8vIGluaXRpYWxpemUgdGhlIGl0ZXJhdG9yXG4gICAgbGV0IGl0ID0gdG9VaW50OEFycmF5QXN5bmNJdGVyYXRvcihzb3VyY2UpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpO1xuXG4gICAgdHJ5IHtcbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgLy8gcmVhZCB0aGUgbmV4dCB2YWx1ZVxuICAgICAgICAgICAgKHsgZG9uZSwgdmFsdWU6IGJ1ZmZlciB9ID0gaXNOYU4oc2l6ZSAtIGJ1ZmZlckxlbmd0aClcbiAgICAgICAgICAgICAgICA/IGF3YWl0IGl0Lm5leHQodW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIDogYXdhaXQgaXQubmV4dChzaXplIC0gYnVmZmVyTGVuZ3RoKSk7XG4gICAgICAgICAgICAvLyBpZiBjaHVuayBpcyBub3QgbnVsbCBvciBlbXB0eSwgcHVzaCBpdCBvbnRvIHRoZSBxdWV1ZVxuICAgICAgICAgICAgaWYgKCFkb25lICYmIGJ1ZmZlci5ieXRlTGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGJ1ZmZlcnMucHVzaChidWZmZXIpO1xuICAgICAgICAgICAgICAgIGJ1ZmZlckxlbmd0aCArPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgZW5vdWdoIGJ5dGVzIGluIG91ciBidWZmZXIsIHlpZWxkIGNodW5rcyB1bnRpbCB3ZSBkb24ndFxuICAgICAgICAgICAgaWYgKGRvbmUgfHwgc2l6ZSA8PSBidWZmZXJMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgICh7IGNtZCwgc2l6ZSB9ID0geWllbGQgYnl0ZVJhbmdlKCkpO1xuICAgICAgICAgICAgICAgIH0gd2hpbGUgKHNpemUgPCBidWZmZXJMZW5ndGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IHdoaWxlICghZG9uZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAodGhyZXcgPSB0cnVlKSAmJiAodHlwZW9mIGl0LnRocm93ID09PSAnZnVuY3Rpb24nKSAmJiAoYXdhaXQgaXQudGhyb3coZSkpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICAgICh0aHJldyA9PT0gZmFsc2UpICYmICh0eXBlb2YgaXQucmV0dXJuID09PSAnZnVuY3Rpb24nKSAmJiAoYXdhaXQgaXQucmV0dXJuKCkpO1xuICAgIH1cbn1cblxuLy8gQWxsIHRoaXMgbWFudWFsIFVpbnQ4QXJyYXkgY2h1bmsgbWFuYWdlbWVudCBjYW4gYmUgYXZvaWRlZCBpZi93aGVuIGVuZ2luZXNcbi8vIGFkZCBzdXBwb3J0IGZvciBBcnJheUJ1ZmZlci50cmFuc2ZlcigpIG9yIEFycmF5QnVmZmVyLnByb3RvdHlwZS5yZWFsbG9jKCk6XG4vLyBodHRwczovL2dpdGh1Yi5jb20vZG9tZW5pYy9wcm9wb3NhbC1hcnJheWJ1ZmZlci10cmFuc2ZlclxuYXN5bmMgZnVuY3Rpb24qIGZyb21SZWFkYWJsZURPTVN0cmVhbTxUIGV4dGVuZHMgQXJyYXlCdWZmZXJWaWV3SW5wdXQ+KHNvdXJjZTogUmVhZGFibGVTdHJlYW08VD4pOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8VWludDhBcnJheT4ge1xuXG4gICAgbGV0IGRvbmUgPSBmYWxzZSwgdGhyZXcgPSBmYWxzZTtcbiAgICBsZXQgYnVmZmVyczogVWludDhBcnJheVtdID0gW10sIGJ1ZmZlcjogVWludDhBcnJheTtcbiAgICBsZXQgY21kOiAncGVlaycgfCAncmVhZCcsIHNpemU6IG51bWJlciwgYnVmZmVyTGVuZ3RoID0gMDtcblxuICAgIGZ1bmN0aW9uIGJ5dGVSYW5nZSgpIHtcbiAgICAgICAgaWYgKGNtZCA9PT0gJ3BlZWsnKSB7XG4gICAgICAgICAgICByZXR1cm4gam9pblVpbnQ4QXJyYXlzKGJ1ZmZlcnMuc2xpY2UoKSwgc2l6ZSlbMF07XG4gICAgICAgIH1cbiAgICAgICAgW2J1ZmZlciwgYnVmZmVyc10gPSBqb2luVWludDhBcnJheXMoYnVmZmVycywgc2l6ZSk7XG4gICAgICAgIGJ1ZmZlckxlbmd0aCAtPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICAvLyBZaWVsZCBzbyB0aGUgY2FsbGVyIGNhbiBpbmplY3QgdGhlIHJlYWQgY29tbWFuZCBiZWZvcmUgd2UgZXN0YWJsaXNoIHRoZSBSZWFkYWJsZVN0cmVhbSBsb2NrXG4gICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCA8YW55PiBudWxsKTtcblxuICAgIC8vIGluaXRpYWxpemUgdGhlIHJlYWRlciBhbmQgbG9jayB0aGUgc3RyZWFtXG4gICAgbGV0IGl0ID0gbmV3IEFkYXB0aXZlQnl0ZVJlYWRlcihzb3VyY2UpO1xuXG4gICAgdHJ5IHtcbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgLy8gcmVhZCB0aGUgbmV4dCB2YWx1ZVxuICAgICAgICAgICAgKHsgZG9uZSwgdmFsdWU6IGJ1ZmZlciB9ID0gaXNOYU4oc2l6ZSAtIGJ1ZmZlckxlbmd0aClcbiAgICAgICAgICAgICAgICA/IGF3YWl0IGl0WydyZWFkJ10odW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIDogYXdhaXQgaXRbJ3JlYWQnXShzaXplIC0gYnVmZmVyTGVuZ3RoKSk7XG4gICAgICAgICAgICAvLyBpZiBjaHVuayBpcyBub3QgbnVsbCBvciBlbXB0eSwgcHVzaCBpdCBvbnRvIHRoZSBxdWV1ZVxuICAgICAgICAgICAgaWYgKCFkb25lICYmIGJ1ZmZlci5ieXRlTGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGJ1ZmZlcnMucHVzaCh0b1VpbnQ4QXJyYXkoYnVmZmVyKSk7XG4gICAgICAgICAgICAgICAgYnVmZmVyTGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBlbm91Z2ggYnl0ZXMgaW4gb3VyIGJ1ZmZlciwgeWllbGQgY2h1bmtzIHVudGlsIHdlIGRvbid0XG4gICAgICAgICAgICBpZiAoZG9uZSB8fCBzaXplIDw9IGJ1ZmZlckxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCBieXRlUmFuZ2UoKSk7XG4gICAgICAgICAgICAgICAgfSB3aGlsZSAoc2l6ZSA8IGJ1ZmZlckxlbmd0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gd2hpbGUgKCFkb25lKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICh0aHJldyA9IHRydWUpICYmIChhd2FpdCBpdFsnY2FuY2VsJ10oZSkpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICAgIHNvdXJjZVsnbG9ja2VkJ10gJiYgaXQucmVsZWFzZUxvY2soKTtcbiAgICAgICAgKHRocmV3ID09PSBmYWxzZSkgJiYgKGF3YWl0IGl0WydjYW5jZWwnXSgpKTtcbiAgICB9XG59XG5cbmNsYXNzIEFkYXB0aXZlQnl0ZVJlYWRlcjxUIGV4dGVuZHMgQXJyYXlCdWZmZXJWaWV3SW5wdXQ+IHtcblxuICAgIHByaXZhdGUgc3VwcG9ydHNCWU9COiBib29sZWFuO1xuICAgIHByaXZhdGUgYnlvYlJlYWRlcjogUmVhZGFibGVTdHJlYW1CWU9CUmVhZGVyIHwgbnVsbCA9IG51bGw7XG4gICAgcHJpdmF0ZSBkZWZhdWx0UmVhZGVyOiBSZWFkYWJsZVN0cmVhbURlZmF1bHRSZWFkZXI8VD4gfCBudWxsID0gbnVsbDtcbiAgICBwcml2YXRlIHJlYWRlcjogUmVhZGFibGVTdHJlYW1CWU9CUmVhZGVyIHwgUmVhZGFibGVTdHJlYW1EZWZhdWx0UmVhZGVyPFQ+IHwgbnVsbDtcblxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgc291cmNlOiBSZWFkYWJsZVN0cmVhbTxUPikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5zdXBwb3J0c0JZT0IgPSAhISh0aGlzLnJlYWRlciA9IHRoaXMuZ2V0QllPQlJlYWRlcigpKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhpcy5zdXBwb3J0c0JZT0IgPSAhISEodGhpcy5yZWFkZXIgPSB0aGlzLmdldERlZmF1bHRSZWFkZXIoKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXQgY2xvc2VkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5yZWFkZXIgPyB0aGlzLnJlYWRlclsnY2xvc2VkJ10uY2F0Y2goKCkgPT4ge30pIDogUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuXG4gICAgcmVsZWFzZUxvY2soKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLnJlYWRlcikge1xuICAgICAgICAgICAgdGhpcy5yZWFkZXIucmVsZWFzZUxvY2soKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlYWRlciA9IHRoaXMuYnlvYlJlYWRlciA9IHRoaXMuZGVmYXVsdFJlYWRlciA9IG51bGw7XG4gICAgfVxuXG4gICAgYXN5bmMgY2FuY2VsKHJlYXNvbj86IGFueSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHJlYWRlciB9ID0gdGhpcztcbiAgICAgICAgdGhpcy5yZWFkZXIgPSBudWxsO1xuICAgICAgICB0aGlzLnJlbGVhc2VMb2NrKCk7XG4gICAgICAgIGlmIChyZWFkZXIpIHtcbiAgICAgICAgICAgIGF3YWl0IHJlYWRlclsnY2FuY2VsJ10ocmVhc29uKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIHJlYWQoc2l6ZT86IG51bWJlcik6IFByb21pc2U8UmVhZGFibGVTdHJlYW1SZWFkUmVzdWx0PFVpbnQ4QXJyYXk+PiB7XG4gICAgICAgIGlmIChzaXplID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4geyBkb25lOiB0aGlzLnJlYWRlciA9PSBudWxsLCB2YWx1ZTogbmV3IFVpbnQ4QXJyYXkoMCkgfTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSAhdGhpcy5zdXBwb3J0c0JZT0IgfHwgdHlwZW9mIHNpemUgIT09ICdudW1iZXInXG4gICAgICAgICAgICA/IGF3YWl0IHRoaXMuZ2V0RGVmYXVsdFJlYWRlcigpLnJlYWQoKVxuICAgICAgICAgICAgOiBhd2FpdCB0aGlzLnJlYWRGcm9tQllPQlJlYWRlcihzaXplKTtcbiAgICAgICAgIXJlc3VsdC5kb25lICYmIChyZXN1bHQudmFsdWUgPSB0b1VpbnQ4QXJyYXkocmVzdWx0IGFzIFJlYWRhYmxlU3RyZWFtUmVhZFJlc3VsdDxVaW50OEFycmF5PikpO1xuICAgICAgICByZXR1cm4gcmVzdWx0IGFzIFJlYWRhYmxlU3RyZWFtUmVhZFJlc3VsdDxVaW50OEFycmF5PjtcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldERlZmF1bHRSZWFkZXIoKSB7XG4gICAgICAgIGlmICh0aGlzLmJ5b2JSZWFkZXIpIHsgdGhpcy5yZWxlYXNlTG9jaygpOyB9XG4gICAgICAgIGlmICghdGhpcy5kZWZhdWx0UmVhZGVyKSB7XG4gICAgICAgICAgICB0aGlzLmRlZmF1bHRSZWFkZXIgPSB0aGlzLnNvdXJjZVsnZ2V0UmVhZGVyJ10oKTtcbiAgICAgICAgICAgIC8vIFdlIGhhdmUgdG8gY2F0Y2ggYW5kIHN3YWxsb3cgZXJyb3JzIGhlcmUgdG8gYXZvaWQgdW5jYXVnaHQgcHJvbWlzZSByZWplY3Rpb24gZXhjZXB0aW9uc1xuICAgICAgICAgICAgLy8gdGhhdCBzZWVtIHRvIGJlIHJhaXNlZCB3aGVuIHdlIGNhbGwgYHJlbGVhc2VMb2NrKClgIG9uIHRoaXMgcmVhZGVyLiBJJ20gc3RpbGwgbXlzdGlmaWVkXG4gICAgICAgICAgICAvLyBhYm91dCB3aHkgdGhlc2UgZXJyb3JzIGFyZSByYWlzZWQsIGJ1dCBJJ20gc3VyZSB0aGVyZSdzIHNvbWUgaW1wb3J0YW50IHNwZWMgcmVhc29uIHRoYXRcbiAgICAgICAgICAgIC8vIEkgaGF2ZW4ndCBjb25zaWRlcmVkLiBJIGhhdGUgdG8gZW1wbG95IHN1Y2ggYW4gYW50aS1wYXR0ZXJuIGhlcmUsIGJ1dCBpdCBzZWVtcyBsaWtlIHRoZVxuICAgICAgICAgICAgLy8gb25seSBzb2x1dGlvbiBpbiB0aGlzIGNhc2UgOi9cbiAgICAgICAgICAgIHRoaXMuZGVmYXVsdFJlYWRlclsnY2xvc2VkJ10uY2F0Y2goKCkgPT4ge30pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAodGhpcy5yZWFkZXIgPSB0aGlzLmRlZmF1bHRSZWFkZXIpO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0QllPQlJlYWRlcigpIHtcbiAgICAgICAgaWYgKHRoaXMuZGVmYXVsdFJlYWRlcikgeyB0aGlzLnJlbGVhc2VMb2NrKCk7IH1cbiAgICAgICAgaWYgKCF0aGlzLmJ5b2JSZWFkZXIpIHtcbiAgICAgICAgICAgIHRoaXMuYnlvYlJlYWRlciA9IHRoaXMuc291cmNlWydnZXRSZWFkZXInXSh7IG1vZGU6ICdieW9iJyB9KTtcbiAgICAgICAgICAgIC8vIFdlIGhhdmUgdG8gY2F0Y2ggYW5kIHN3YWxsb3cgZXJyb3JzIGhlcmUgdG8gYXZvaWQgdW5jYXVnaHQgcHJvbWlzZSByZWplY3Rpb24gZXhjZXB0aW9uc1xuICAgICAgICAgICAgLy8gdGhhdCBzZWVtIHRvIGJlIHJhaXNlZCB3aGVuIHdlIGNhbGwgYHJlbGVhc2VMb2NrKClgIG9uIHRoaXMgcmVhZGVyLiBJJ20gc3RpbGwgbXlzdGlmaWVkXG4gICAgICAgICAgICAvLyBhYm91dCB3aHkgdGhlc2UgZXJyb3JzIGFyZSByYWlzZWQsIGJ1dCBJJ20gc3VyZSB0aGVyZSdzIHNvbWUgaW1wb3J0YW50IHNwZWMgcmVhc29uIHRoYXRcbiAgICAgICAgICAgIC8vIEkgaGF2ZW4ndCBjb25zaWRlcmVkLiBJIGhhdGUgdG8gZW1wbG95IHN1Y2ggYW4gYW50aS1wYXR0ZXJuIGhlcmUsIGJ1dCBpdCBzZWVtcyBsaWtlIHRoZVxuICAgICAgICAgICAgLy8gb25seSBzb2x1dGlvbiBpbiB0aGlzIGNhc2UgOi9cbiAgICAgICAgICAgIHRoaXMuYnlvYlJlYWRlclsnY2xvc2VkJ10uY2F0Y2goKCkgPT4ge30pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAodGhpcy5yZWFkZXIgPSB0aGlzLmJ5b2JSZWFkZXIpO1xuICAgIH1cblxuICAgIC8vIFRoaXMgc3RyYXRlZ3kgcGx1Y2tlZCBmcm9tIHRoZSBleGFtcGxlIGluIHRoZSBzdHJlYW1zIHNwZWM6XG4gICAgLy8gaHR0cHM6Ly9zdHJlYW1zLnNwZWMud2hhdHdnLm9yZy8jZXhhbXBsZS1tYW51YWwtcmVhZC1ieXRlc1xuICAgIHByaXZhdGUgYXN5bmMgcmVhZEZyb21CWU9CUmVhZGVyKHNpemU6IG51bWJlcikge1xuICAgICAgICByZXR1cm4gYXdhaXQgcmVhZEludG8odGhpcy5nZXRCWU9CUmVhZGVyKCksIG5ldyBBcnJheUJ1ZmZlcihzaXplKSwgMCwgc2l6ZSk7XG4gICAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiByZWFkSW50byhyZWFkZXI6IFJlYWRhYmxlU3RyZWFtQllPQlJlYWRlciwgYnVmZmVyOiBBcnJheUJ1ZmZlckxpa2UsIG9mZnNldDogbnVtYmVyLCBzaXplOiBudW1iZXIpOiBQcm9taXNlPFJlYWRhYmxlU3RyZWFtUmVhZFJlc3VsdDxVaW50OEFycmF5Pj4ge1xuICAgIGlmIChvZmZzZXQgPj0gc2l6ZSkge1xuICAgICAgICByZXR1cm4geyBkb25lOiBmYWxzZSwgdmFsdWU6IG5ldyBVaW50OEFycmF5KGJ1ZmZlciwgMCwgc2l6ZSkgfTtcbiAgICB9XG4gICAgY29uc3QgeyBkb25lLCB2YWx1ZSB9ID0gYXdhaXQgcmVhZGVyLnJlYWQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyLCBvZmZzZXQsIHNpemUgLSBvZmZzZXQpKTtcbiAgICBpZiAoKChvZmZzZXQgKz0gdmFsdWUuYnl0ZUxlbmd0aCkgPCBzaXplKSAmJiAhZG9uZSkge1xuICAgICAgICByZXR1cm4gYXdhaXQgcmVhZEludG8ocmVhZGVyLCB2YWx1ZS5idWZmZXIsIG9mZnNldCwgc2l6ZSk7XG4gICAgfVxuICAgIHJldHVybiB7IGRvbmUsIHZhbHVlOiBuZXcgVWludDhBcnJheSh2YWx1ZS5idWZmZXIsIDAsIG9mZnNldCkgfTtcbn1cblxudHlwZSBFdmVudE5hbWUgPSAnZW5kJyB8ICdlcnJvcicgfCAncmVhZGFibGUnO1xudHlwZSBFdmVudCA9IFtFdmVudE5hbWUsIChfOiBhbnkpID0+IHZvaWQsIFByb21pc2U8W0V2ZW50TmFtZSwgRXJyb3IgfCBudWxsXT5dO1xuY29uc3Qgb25FdmVudCA9IDxUIGV4dGVuZHMgc3RyaW5nPihzdHJlYW06IE5vZGVKUy5SZWFkYWJsZVN0cmVhbSwgZXZlbnQ6IFQpID0+IHtcbiAgICBsZXQgaGFuZGxlciA9IChfOiBhbnkpID0+IHJlc29sdmUoW2V2ZW50LCBfXSk7XG4gICAgbGV0IHJlc29sdmU6ICh2YWx1ZT86IFtULCBhbnldIHwgUHJvbWlzZUxpa2U8W1QsIGFueV0+KSA9PiB2b2lkO1xuICAgIHJldHVybiBbZXZlbnQsIGhhbmRsZXIsIG5ldyBQcm9taXNlPFtULCBhbnldPihcbiAgICAgICAgKHIpID0+IChyZXNvbHZlID0gcikgJiYgc3RyZWFtWydvbmNlJ10oZXZlbnQsIGhhbmRsZXIpXG4gICAgKV0gYXMgRXZlbnQ7XG59O1xuXG5hc3luYyBmdW5jdGlvbiogZnJvbVJlYWRhYmxlTm9kZVN0cmVhbShzdHJlYW06IE5vZGVKUy5SZWFkYWJsZVN0cmVhbSk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxVaW50OEFycmF5PiB7XG5cbiAgICBsZXQgZXZlbnRzOiBFdmVudFtdID0gW107XG4gICAgbGV0IGV2ZW50OiBFdmVudE5hbWUgPSAnZXJyb3InO1xuICAgIGxldCBkb25lID0gZmFsc2UsIGVycjogRXJyb3IgfCBudWxsID0gbnVsbDtcbiAgICBsZXQgY21kOiAncGVlaycgfCAncmVhZCcsIHNpemU6IG51bWJlciwgYnVmZmVyTGVuZ3RoID0gMDtcbiAgICBsZXQgYnVmZmVyczogVWludDhBcnJheVtdID0gW10sIGJ1ZmZlcjogVWludDhBcnJheSB8IEJ1ZmZlciB8IHN0cmluZztcblxuICAgIGZ1bmN0aW9uIGJ5dGVSYW5nZSgpIHtcbiAgICAgICAgaWYgKGNtZCA9PT0gJ3BlZWsnKSB7XG4gICAgICAgICAgICByZXR1cm4gam9pblVpbnQ4QXJyYXlzKGJ1ZmZlcnMuc2xpY2UoKSwgc2l6ZSlbMF07XG4gICAgICAgIH1cbiAgICAgICAgW2J1ZmZlciwgYnVmZmVyc10gPSBqb2luVWludDhBcnJheXMoYnVmZmVycywgc2l6ZSk7XG4gICAgICAgIGJ1ZmZlckxlbmd0aCAtPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICAvLyBZaWVsZCBzbyB0aGUgY2FsbGVyIGNhbiBpbmplY3QgdGhlIHJlYWQgY29tbWFuZCBiZWZvcmUgd2VcbiAgICAvLyBhZGQgdGhlIGxpc3RlbmVyIGZvciB0aGUgc291cmNlIHN0cmVhbSdzICdyZWFkYWJsZScgZXZlbnQuXG4gICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCA8YW55PiBudWxsKTtcblxuICAgIC8vIGlnbm9yZSBzdGRpbiBpZiBpdCdzIGEgVFRZXG4gICAgaWYgKChzdHJlYW0gYXMgYW55KVsnaXNUVFknXSkgeyByZXR1cm4geWllbGQgbmV3IFVpbnQ4QXJyYXkoMCk7IH1cblxuICAgIHRyeSB7XG4gICAgICAgIC8vIGluaXRpYWxpemUgdGhlIHN0cmVhbSBldmVudCBoYW5kbGVyc1xuICAgICAgICBldmVudHNbMF0gPSBvbkV2ZW50KHN0cmVhbSwgJ2VuZCcpO1xuICAgICAgICBldmVudHNbMV0gPSBvbkV2ZW50KHN0cmVhbSwgJ2Vycm9yJyk7XG5cbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgZXZlbnRzWzJdID0gb25FdmVudChzdHJlYW0sICdyZWFkYWJsZScpO1xuXG4gICAgICAgICAgICAvLyB3YWl0IG9uIHRoZSBmaXJzdCBtZXNzYWdlIGV2ZW50IGZyb20gdGhlIHN0cmVhbVxuICAgICAgICAgICAgW2V2ZW50LCBlcnJdID0gYXdhaXQgUHJvbWlzZS5yYWNlKGV2ZW50cy5tYXAoKHgpID0+IHhbMl0pKTtcblxuICAgICAgICAgICAgLy8gaWYgdGhlIHN0cmVhbSBlbWl0dGVkIGFuIEVycm9yLCByZXRocm93IGl0XG4gICAgICAgICAgICBpZiAoZXZlbnQgPT09ICdlcnJvcicpIHsgYnJlYWs7IH1cbiAgICAgICAgICAgIGlmICghKGRvbmUgPSBldmVudCA9PT0gJ2VuZCcpKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIHNpemUgaXMgTmFOLCByZXF1ZXN0IHRvIHJlYWQgZXZlcnl0aGluZyBpbiB0aGUgc3RyZWFtJ3MgaW50ZXJuYWwgYnVmZmVyXG4gICAgICAgICAgICAgICAgaWYgKCFpc0Zpbml0ZShzaXplIC0gYnVmZmVyTGVuZ3RoKSkge1xuICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSB0b1VpbnQ4QXJyYXkoc3RyZWFtWydyZWFkJ10odW5kZWZpbmVkKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gdG9VaW50OEFycmF5KHN0cmVhbVsncmVhZCddKHNpemUgLSBidWZmZXJMZW5ndGgpKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIGJ5dGVMZW5ndGggaXMgMCwgdGhlbiB0aGUgcmVxdWVzdGVkIGFtb3VudCBpcyBtb3JlIHRoYW4gdGhlIHN0cmVhbSBoYXNcbiAgICAgICAgICAgICAgICAgICAgLy8gaW4gaXRzIGludGVybmFsIGJ1ZmZlci4gSW4gdGhpcyBjYXNlIHRoZSBzdHJlYW0gbmVlZHMgYSBcImtpY2tcIiB0byB0ZWxsIGl0IHRvXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnRpbnVlIGVtaXR0aW5nIHJlYWRhYmxlIGV2ZW50cywgc28gcmVxdWVzdCB0byByZWFkIGV2ZXJ5dGhpbmcgdGhlIHN0cmVhbVxuICAgICAgICAgICAgICAgICAgICAvLyBoYXMgaW4gaXRzIGludGVybmFsIGJ1ZmZlciByaWdodCBub3cuXG4gICAgICAgICAgICAgICAgICAgIGlmIChidWZmZXIuYnl0ZUxlbmd0aCA8IChzaXplIC0gYnVmZmVyTGVuZ3RoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gdG9VaW50OEFycmF5KHN0cmVhbVsncmVhZCddKHVuZGVmaW5lZCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGlmIGNodW5rIGlzIG5vdCBudWxsIG9yIGVtcHR5LCBwdXNoIGl0IG9udG8gdGhlIHF1ZXVlXG4gICAgICAgICAgICAgICAgaWYgKGJ1ZmZlci5ieXRlTGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBidWZmZXJzLnB1c2goYnVmZmVyKTtcbiAgICAgICAgICAgICAgICAgICAgYnVmZmVyTGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgZW5vdWdoIGJ5dGVzIGluIG91ciBidWZmZXIsIHlpZWxkIGNodW5rcyB1bnRpbCB3ZSBkb24ndFxuICAgICAgICAgICAgaWYgKGRvbmUgfHwgc2l6ZSA8PSBidWZmZXJMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgICh7IGNtZCwgc2l6ZSB9ID0geWllbGQgYnl0ZVJhbmdlKCkpO1xuICAgICAgICAgICAgICAgIH0gd2hpbGUgKHNpemUgPCBidWZmZXJMZW5ndGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IHdoaWxlICghZG9uZSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgYXdhaXQgY2xlYW51cChldmVudHMsIGV2ZW50ID09PSAnZXJyb3InID8gZXJyIDogbnVsbCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xlYW51cDxUIGV4dGVuZHMgRXJyb3IgfCBudWxsIHwgdm9pZD4oZXZlbnRzOiBFdmVudFtdLCBlcnI/OiBUKSB7XG4gICAgICAgIGJ1ZmZlciA9IGJ1ZmZlcnMgPSA8YW55PiBudWxsO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8VD4oYXN5bmMgKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgZm9yIChjb25zdCBbZXZ0LCBmbl0gb2YgZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgc3RyZWFtWydvZmYnXShldnQsIGZuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IFtldnQsIGZuLCBjbG9zZWRdID0gb25FdmVudChzdHJlYW0sICdjbG9zZScpO1xuICAgICAgICAgICAgY29uc3QgZGVzdHJveWVkID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRlc3Ryb3kgPSAoc3RyZWFtIGFzIGFueSlbJ2Rlc3Ryb3knXSB8fCAoKGU6IFQsIGNiOiBhbnkpID0+IGNiKGUpKTtcbiAgICAgICAgICAgICAgICBkZXN0cm95LmNhbGwoc3RyZWFtLCBlcnIsIChlOiBUKSA9PiBlICE9IG51bGwgPyByZWplY3QoZSkgOiByZXNvbHZlKCkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGF3YWl0IFByb21pc2UucmFjZShbY2xvc2VkLCBkZXN0cm95ZWRdKTtcbiAgICAgICAgICAgICAgICBlcnIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7IGVyciA9IGUgfHwgZXJyOyB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIHN0cmVhbVsnb2ZmJ10oZXZ0LCBmbik7XG4gICAgICAgICAgICAgICAgZXJyICE9IG51bGwgPyByZWplY3QoZXJyKSA6IHJlc29sdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufVxuIl19

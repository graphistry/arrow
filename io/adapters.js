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
/** @ignore */
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
/** @ignore */
const pump = (iterator) => { iterator.next(); return iterator; };
/** @ignore */
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
/** @ignore */
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
/** @ignore */
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
/** @ignore */
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
/** @ignore */
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
/** @ignore */
const onEvent = (stream, event) => {
    let handler = (_) => resolve([event, _]);
    let resolve;
    return [event, handler, new Promise((r) => (resolve = r) && stream['once'](event, handler))];
};
/** @ignore */
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
                try {
                    // Some stream implementations don't call the destroy callback,
                    // because it's really a node-internal API. Just calling `destroy`
                    // here should be enough to conform to the ReadableStream contract
                    const destroy = stream['destroy'];
                    destroy && destroy.call(stream, err);
                    err = undefined;
                }
                catch (e) {
                    err = e || err;
                }
                finally {
                    err != null ? reject(err) : resolve();
                }
            }));
        }
    });
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LE9BQU8sRUFBRSxDQUFDO2lCQUN6QztZQUNMLENBQUMsQ0FBQSxDQUFDLENBQUM7UUFDUCxDQUFDO0lBQ0wsQ0FBQztDQUFBIiwiZmlsZSI6ImlvL2FkYXB0ZXJzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7XG4gICAgdG9VaW50OEFycmF5LFxuICAgIGpvaW5VaW50OEFycmF5cyxcbiAgICBBcnJheUJ1ZmZlclZpZXdJbnB1dCxcbiAgICB0b1VpbnQ4QXJyYXlJdGVyYXRvcixcbiAgICB0b1VpbnQ4QXJyYXlBc3luY0l0ZXJhdG9yXG59IGZyb20gJy4uL3V0aWwvYnVmZmVyJztcblxuaW1wb3J0IHsgUmVhZGFibGVET01TdHJlYW1PcHRpb25zIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBkZWZhdWx0IHtcbiAgICBmcm9tSXRlcmFibGU8VCBleHRlbmRzIEFycmF5QnVmZmVyVmlld0lucHV0Pihzb3VyY2U6IEl0ZXJhYmxlPFQ+IHwgVCk6IEl0ZXJhYmxlSXRlcmF0b3I8VWludDhBcnJheT4ge1xuICAgICAgICByZXR1cm4gcHVtcChmcm9tSXRlcmFibGU8VD4oc291cmNlKSk7XG4gICAgfSxcbiAgICBmcm9tQXN5bmNJdGVyYWJsZTxUIGV4dGVuZHMgQXJyYXlCdWZmZXJWaWV3SW5wdXQ+KHNvdXJjZTogQXN5bmNJdGVyYWJsZTxUPiB8IFByb21pc2VMaWtlPFQ+KTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcbiAgICAgICAgcmV0dXJuIHB1bXAoZnJvbUFzeW5jSXRlcmFibGU8VD4oc291cmNlKSk7XG4gICAgfSxcbiAgICBmcm9tUmVhZGFibGVET01TdHJlYW08VCBleHRlbmRzIEFycmF5QnVmZmVyVmlld0lucHV0Pihzb3VyY2U6IFJlYWRhYmxlU3RyZWFtPFQ+KTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcbiAgICAgICAgcmV0dXJuIHB1bXAoZnJvbVJlYWRhYmxlRE9NU3RyZWFtPFQ+KHNvdXJjZSkpO1xuICAgIH0sXG4gICAgZnJvbVJlYWRhYmxlTm9kZVN0cmVhbShzdHJlYW06IE5vZGVKUy5SZWFkYWJsZVN0cmVhbSk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxVaW50OEFycmF5PiB7XG4gICAgICAgIHJldHVybiBwdW1wKGZyb21SZWFkYWJsZU5vZGVTdHJlYW0oc3RyZWFtKSk7XG4gICAgfSxcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgdG9SZWFkYWJsZURPTVN0cmVhbTxUPihzb3VyY2U6IEl0ZXJhYmxlPFQ+IHwgQXN5bmNJdGVyYWJsZTxUPiwgb3B0aW9ucz86IFJlYWRhYmxlRE9NU3RyZWFtT3B0aW9ucyk6IFJlYWRhYmxlU3RyZWFtPFQ+IHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBcInRvUmVhZGFibGVET01TdHJlYW1cIiBub3QgYXZhaWxhYmxlIGluIHRoaXMgZW52aXJvbm1lbnRgKTtcbiAgICB9LFxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICB0b1JlYWRhYmxlTm9kZVN0cmVhbTxUPihzb3VyY2U6IEl0ZXJhYmxlPFQ+IHwgQXN5bmNJdGVyYWJsZTxUPiwgb3B0aW9ucz86IGltcG9ydCgnc3RyZWFtJykuUmVhZGFibGVPcHRpb25zKTogaW1wb3J0KCdzdHJlYW0nKS5SZWFkYWJsZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgXCJ0b1JlYWRhYmxlTm9kZVN0cmVhbVwiIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBlbnZpcm9ubWVudGApO1xuICAgIH0sXG59O1xuXG4vKiogQGlnbm9yZSAqL1xuY29uc3QgcHVtcCA9IDxUIGV4dGVuZHMgSXRlcmF0b3I8YW55PiB8IEFzeW5jSXRlcmF0b3I8YW55Pj4oaXRlcmF0b3I6IFQpID0+IHsgaXRlcmF0b3IubmV4dCgpOyByZXR1cm4gaXRlcmF0b3I7IH07XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiogZnJvbUl0ZXJhYmxlPFQgZXh0ZW5kcyBBcnJheUJ1ZmZlclZpZXdJbnB1dD4oc291cmNlOiBJdGVyYWJsZTxUPiB8IFQpOiBJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcblxuICAgIGxldCBkb25lOiBib29sZWFuLCB0aHJldyA9IGZhbHNlO1xuICAgIGxldCBidWZmZXJzOiBVaW50OEFycmF5W10gPSBbXSwgYnVmZmVyOiBVaW50OEFycmF5O1xuICAgIGxldCBjbWQ6ICdwZWVrJyB8ICdyZWFkJywgc2l6ZTogbnVtYmVyLCBidWZmZXJMZW5ndGggPSAwO1xuXG4gICAgZnVuY3Rpb24gYnl0ZVJhbmdlKCkge1xuICAgICAgICBpZiAoY21kID09PSAncGVlaycpIHtcbiAgICAgICAgICAgIHJldHVybiBqb2luVWludDhBcnJheXMoYnVmZmVycy5zbGljZSgpLCBzaXplKVswXTtcbiAgICAgICAgfVxuICAgICAgICBbYnVmZmVyLCBidWZmZXJzXSA9IGpvaW5VaW50OEFycmF5cyhidWZmZXJzLCBzaXplKTtcbiAgICAgICAgYnVmZmVyTGVuZ3RoIC09IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8vIFlpZWxkIHNvIHRoZSBjYWxsZXIgY2FuIGluamVjdCB0aGUgcmVhZCBjb21tYW5kIGJlZm9yZSBjcmVhdGluZyB0aGUgc291cmNlIEl0ZXJhdG9yXG4gICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCA8YW55PiBudWxsKTtcblxuICAgIC8vIGluaXRpYWxpemUgdGhlIGl0ZXJhdG9yXG4gICAgbGV0IGl0ID0gdG9VaW50OEFycmF5SXRlcmF0b3Ioc291cmNlKVtTeW1ib2wuaXRlcmF0b3JdKCk7XG5cbiAgICB0cnkge1xuICAgICAgICBkbyB7XG4gICAgICAgICAgICAvLyByZWFkIHRoZSBuZXh0IHZhbHVlXG4gICAgICAgICAgICAoeyBkb25lLCB2YWx1ZTogYnVmZmVyIH0gPSBpc05hTihzaXplIC0gYnVmZmVyTGVuZ3RoKSA/XG4gICAgICAgICAgICAgICAgaXQubmV4dCh1bmRlZmluZWQpIDogaXQubmV4dChzaXplIC0gYnVmZmVyTGVuZ3RoKSk7XG4gICAgICAgICAgICAvLyBpZiBjaHVuayBpcyBub3QgbnVsbCBvciBlbXB0eSwgcHVzaCBpdCBvbnRvIHRoZSBxdWV1ZVxuICAgICAgICAgICAgaWYgKCFkb25lICYmIGJ1ZmZlci5ieXRlTGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGJ1ZmZlcnMucHVzaChidWZmZXIpO1xuICAgICAgICAgICAgICAgIGJ1ZmZlckxlbmd0aCArPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgZW5vdWdoIGJ5dGVzIGluIG91ciBidWZmZXIsIHlpZWxkIGNodW5rcyB1bnRpbCB3ZSBkb24ndFxuICAgICAgICAgICAgaWYgKGRvbmUgfHwgc2l6ZSA8PSBidWZmZXJMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgICh7IGNtZCwgc2l6ZSB9ID0geWllbGQgYnl0ZVJhbmdlKCkpO1xuICAgICAgICAgICAgICAgIH0gd2hpbGUgKHNpemUgPCBidWZmZXJMZW5ndGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IHdoaWxlICghZG9uZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAodGhyZXcgPSB0cnVlKSAmJiAodHlwZW9mIGl0LnRocm93ID09PSAnZnVuY3Rpb24nKSAmJiAoaXQudGhyb3coZSkpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICAgICh0aHJldyA9PT0gZmFsc2UpICYmICh0eXBlb2YgaXQucmV0dXJuID09PSAnZnVuY3Rpb24nKSAmJiAoaXQucmV0dXJuKCkpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmFzeW5jIGZ1bmN0aW9uKiBmcm9tQXN5bmNJdGVyYWJsZTxUIGV4dGVuZHMgQXJyYXlCdWZmZXJWaWV3SW5wdXQ+KHNvdXJjZTogQXN5bmNJdGVyYWJsZTxUPiB8IFByb21pc2VMaWtlPFQ+KTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcblxuICAgIGxldCBkb25lOiBib29sZWFuLCB0aHJldyA9IGZhbHNlO1xuICAgIGxldCBidWZmZXJzOiBVaW50OEFycmF5W10gPSBbXSwgYnVmZmVyOiBVaW50OEFycmF5O1xuICAgIGxldCBjbWQ6ICdwZWVrJyB8ICdyZWFkJywgc2l6ZTogbnVtYmVyLCBidWZmZXJMZW5ndGggPSAwO1xuXG4gICAgZnVuY3Rpb24gYnl0ZVJhbmdlKCkge1xuICAgICAgICBpZiAoY21kID09PSAncGVlaycpIHtcbiAgICAgICAgICAgIHJldHVybiBqb2luVWludDhBcnJheXMoYnVmZmVycy5zbGljZSgpLCBzaXplKVswXTtcbiAgICAgICAgfVxuICAgICAgICBbYnVmZmVyLCBidWZmZXJzXSA9IGpvaW5VaW50OEFycmF5cyhidWZmZXJzLCBzaXplKTtcbiAgICAgICAgYnVmZmVyTGVuZ3RoIC09IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8vIFlpZWxkIHNvIHRoZSBjYWxsZXIgY2FuIGluamVjdCB0aGUgcmVhZCBjb21tYW5kIGJlZm9yZSBjcmVhdGluZyB0aGUgc291cmNlIEFzeW5jSXRlcmF0b3JcbiAgICAoeyBjbWQsIHNpemUgfSA9IHlpZWxkIDxhbnk+IG51bGwpO1xuXG4gICAgLy8gaW5pdGlhbGl6ZSB0aGUgaXRlcmF0b3JcbiAgICBsZXQgaXQgPSB0b1VpbnQ4QXJyYXlBc3luY0l0ZXJhdG9yKHNvdXJjZSlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk7XG5cbiAgICB0cnkge1xuICAgICAgICBkbyB7XG4gICAgICAgICAgICAvLyByZWFkIHRoZSBuZXh0IHZhbHVlXG4gICAgICAgICAgICAoeyBkb25lLCB2YWx1ZTogYnVmZmVyIH0gPSBpc05hTihzaXplIC0gYnVmZmVyTGVuZ3RoKVxuICAgICAgICAgICAgICAgID8gYXdhaXQgaXQubmV4dCh1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgOiBhd2FpdCBpdC5uZXh0KHNpemUgLSBidWZmZXJMZW5ndGgpKTtcbiAgICAgICAgICAgIC8vIGlmIGNodW5rIGlzIG5vdCBudWxsIG9yIGVtcHR5LCBwdXNoIGl0IG9udG8gdGhlIHF1ZXVlXG4gICAgICAgICAgICBpZiAoIWRvbmUgJiYgYnVmZmVyLmJ5dGVMZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVycy5wdXNoKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgYnVmZmVyTGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBlbm91Z2ggYnl0ZXMgaW4gb3VyIGJ1ZmZlciwgeWllbGQgY2h1bmtzIHVudGlsIHdlIGRvbid0XG4gICAgICAgICAgICBpZiAoZG9uZSB8fCBzaXplIDw9IGJ1ZmZlckxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCBieXRlUmFuZ2UoKSk7XG4gICAgICAgICAgICAgICAgfSB3aGlsZSAoc2l6ZSA8IGJ1ZmZlckxlbmd0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gd2hpbGUgKCFkb25lKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICh0aHJldyA9IHRydWUpICYmICh0eXBlb2YgaXQudGhyb3cgPT09ICdmdW5jdGlvbicpICYmIChhd2FpdCBpdC50aHJvdyhlKSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgKHRocmV3ID09PSBmYWxzZSkgJiYgKHR5cGVvZiBpdC5yZXR1cm4gPT09ICdmdW5jdGlvbicpICYmIChhd2FpdCBpdC5yZXR1cm4oKSk7XG4gICAgfVxufVxuXG4vLyBBbGwgdGhpcyBtYW51YWwgVWludDhBcnJheSBjaHVuayBtYW5hZ2VtZW50IGNhbiBiZSBhdm9pZGVkIGlmL3doZW4gZW5naW5lc1xuLy8gYWRkIHN1cHBvcnQgZm9yIEFycmF5QnVmZmVyLnRyYW5zZmVyKCkgb3IgQXJyYXlCdWZmZXIucHJvdG90eXBlLnJlYWxsb2MoKTpcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9kb21lbmljL3Byb3Bvc2FsLWFycmF5YnVmZmVyLXRyYW5zZmVyXG4vKiogQGlnbm9yZSAqL1xuYXN5bmMgZnVuY3Rpb24qIGZyb21SZWFkYWJsZURPTVN0cmVhbTxUIGV4dGVuZHMgQXJyYXlCdWZmZXJWaWV3SW5wdXQ+KHNvdXJjZTogUmVhZGFibGVTdHJlYW08VD4pOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8VWludDhBcnJheT4ge1xuXG4gICAgbGV0IGRvbmUgPSBmYWxzZSwgdGhyZXcgPSBmYWxzZTtcbiAgICBsZXQgYnVmZmVyczogVWludDhBcnJheVtdID0gW10sIGJ1ZmZlcjogVWludDhBcnJheTtcbiAgICBsZXQgY21kOiAncGVlaycgfCAncmVhZCcsIHNpemU6IG51bWJlciwgYnVmZmVyTGVuZ3RoID0gMDtcblxuICAgIGZ1bmN0aW9uIGJ5dGVSYW5nZSgpIHtcbiAgICAgICAgaWYgKGNtZCA9PT0gJ3BlZWsnKSB7XG4gICAgICAgICAgICByZXR1cm4gam9pblVpbnQ4QXJyYXlzKGJ1ZmZlcnMuc2xpY2UoKSwgc2l6ZSlbMF07XG4gICAgICAgIH1cbiAgICAgICAgW2J1ZmZlciwgYnVmZmVyc10gPSBqb2luVWludDhBcnJheXMoYnVmZmVycywgc2l6ZSk7XG4gICAgICAgIGJ1ZmZlckxlbmd0aCAtPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICAvLyBZaWVsZCBzbyB0aGUgY2FsbGVyIGNhbiBpbmplY3QgdGhlIHJlYWQgY29tbWFuZCBiZWZvcmUgd2UgZXN0YWJsaXNoIHRoZSBSZWFkYWJsZVN0cmVhbSBsb2NrXG4gICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCA8YW55PiBudWxsKTtcblxuICAgIC8vIGluaXRpYWxpemUgdGhlIHJlYWRlciBhbmQgbG9jayB0aGUgc3RyZWFtXG4gICAgbGV0IGl0ID0gbmV3IEFkYXB0aXZlQnl0ZVJlYWRlcihzb3VyY2UpO1xuXG4gICAgdHJ5IHtcbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgLy8gcmVhZCB0aGUgbmV4dCB2YWx1ZVxuICAgICAgICAgICAgKHsgZG9uZSwgdmFsdWU6IGJ1ZmZlciB9ID0gaXNOYU4oc2l6ZSAtIGJ1ZmZlckxlbmd0aClcbiAgICAgICAgICAgICAgICA/IGF3YWl0IGl0WydyZWFkJ10odW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIDogYXdhaXQgaXRbJ3JlYWQnXShzaXplIC0gYnVmZmVyTGVuZ3RoKSk7XG4gICAgICAgICAgICAvLyBpZiBjaHVuayBpcyBub3QgbnVsbCBvciBlbXB0eSwgcHVzaCBpdCBvbnRvIHRoZSBxdWV1ZVxuICAgICAgICAgICAgaWYgKCFkb25lICYmIGJ1ZmZlci5ieXRlTGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGJ1ZmZlcnMucHVzaCh0b1VpbnQ4QXJyYXkoYnVmZmVyKSk7XG4gICAgICAgICAgICAgICAgYnVmZmVyTGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBlbm91Z2ggYnl0ZXMgaW4gb3VyIGJ1ZmZlciwgeWllbGQgY2h1bmtzIHVudGlsIHdlIGRvbid0XG4gICAgICAgICAgICBpZiAoZG9uZSB8fCBzaXplIDw9IGJ1ZmZlckxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCBieXRlUmFuZ2UoKSk7XG4gICAgICAgICAgICAgICAgfSB3aGlsZSAoc2l6ZSA8IGJ1ZmZlckxlbmd0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gd2hpbGUgKCFkb25lKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICh0aHJldyA9IHRydWUpICYmIChhd2FpdCBpdFsnY2FuY2VsJ10oZSkpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICAgIHNvdXJjZVsnbG9ja2VkJ10gJiYgaXQucmVsZWFzZUxvY2soKTtcbiAgICAgICAgKHRocmV3ID09PSBmYWxzZSkgJiYgKGF3YWl0IGl0WydjYW5jZWwnXSgpKTtcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5jbGFzcyBBZGFwdGl2ZUJ5dGVSZWFkZXI8VCBleHRlbmRzIEFycmF5QnVmZmVyVmlld0lucHV0PiB7XG5cbiAgICBwcml2YXRlIHN1cHBvcnRzQllPQjogYm9vbGVhbjtcbiAgICBwcml2YXRlIGJ5b2JSZWFkZXI6IFJlYWRhYmxlU3RyZWFtQllPQlJlYWRlciB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgZGVmYXVsdFJlYWRlcjogUmVhZGFibGVTdHJlYW1EZWZhdWx0UmVhZGVyPFQ+IHwgbnVsbCA9IG51bGw7XG4gICAgcHJpdmF0ZSByZWFkZXI6IFJlYWRhYmxlU3RyZWFtQllPQlJlYWRlciB8IFJlYWRhYmxlU3RyZWFtRGVmYXVsdFJlYWRlcjxUPiB8IG51bGw7XG5cbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHNvdXJjZTogUmVhZGFibGVTdHJlYW08VD4pIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuc3VwcG9ydHNCWU9CID0gISEodGhpcy5yZWFkZXIgPSB0aGlzLmdldEJZT0JSZWFkZXIoKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMuc3VwcG9ydHNCWU9CID0gISEhKHRoaXMucmVhZGVyID0gdGhpcy5nZXREZWZhdWx0UmVhZGVyKCkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0IGNsb3NlZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVhZGVyID8gdGhpcy5yZWFkZXJbJ2Nsb3NlZCddLmNhdGNoKCgpID0+IHt9KSA6IFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxuICAgIHJlbGVhc2VMb2NrKCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5yZWFkZXIpIHtcbiAgICAgICAgICAgIHRoaXMucmVhZGVyLnJlbGVhc2VMb2NrKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZWFkZXIgPSB0aGlzLmJ5b2JSZWFkZXIgPSB0aGlzLmRlZmF1bHRSZWFkZXIgPSBudWxsO1xuICAgIH1cblxuICAgIGFzeW5jIGNhbmNlbChyZWFzb24/OiBhbnkpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyByZWFkZXIgfSA9IHRoaXM7XG4gICAgICAgIHRoaXMucmVhZGVyID0gbnVsbDtcbiAgICAgICAgdGhpcy5yZWxlYXNlTG9jaygpO1xuICAgICAgICBpZiAocmVhZGVyKSB7XG4gICAgICAgICAgICBhd2FpdCByZWFkZXJbJ2NhbmNlbCddKHJlYXNvbik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyByZWFkKHNpemU/OiBudW1iZXIpOiBQcm9taXNlPFJlYWRhYmxlU3RyZWFtUmVhZFJlc3VsdDxVaW50OEFycmF5Pj4ge1xuICAgICAgICBpZiAoc2l6ZSA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgZG9uZTogdGhpcy5yZWFkZXIgPT0gbnVsbCwgdmFsdWU6IG5ldyBVaW50OEFycmF5KDApIH07XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gIXRoaXMuc3VwcG9ydHNCWU9CIHx8IHR5cGVvZiBzaXplICE9PSAnbnVtYmVyJ1xuICAgICAgICAgICAgPyBhd2FpdCB0aGlzLmdldERlZmF1bHRSZWFkZXIoKS5yZWFkKClcbiAgICAgICAgICAgIDogYXdhaXQgdGhpcy5yZWFkRnJvbUJZT0JSZWFkZXIoc2l6ZSk7XG4gICAgICAgICFyZXN1bHQuZG9uZSAmJiAocmVzdWx0LnZhbHVlID0gdG9VaW50OEFycmF5KHJlc3VsdCBhcyBSZWFkYWJsZVN0cmVhbVJlYWRSZXN1bHQ8VWludDhBcnJheT4pKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdCBhcyBSZWFkYWJsZVN0cmVhbVJlYWRSZXN1bHQ8VWludDhBcnJheT47XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXREZWZhdWx0UmVhZGVyKCkge1xuICAgICAgICBpZiAodGhpcy5ieW9iUmVhZGVyKSB7IHRoaXMucmVsZWFzZUxvY2soKTsgfVxuICAgICAgICBpZiAoIXRoaXMuZGVmYXVsdFJlYWRlcikge1xuICAgICAgICAgICAgdGhpcy5kZWZhdWx0UmVhZGVyID0gdGhpcy5zb3VyY2VbJ2dldFJlYWRlciddKCk7XG4gICAgICAgICAgICAvLyBXZSBoYXZlIHRvIGNhdGNoIGFuZCBzd2FsbG93IGVycm9ycyBoZXJlIHRvIGF2b2lkIHVuY2F1Z2h0IHByb21pc2UgcmVqZWN0aW9uIGV4Y2VwdGlvbnNcbiAgICAgICAgICAgIC8vIHRoYXQgc2VlbSB0byBiZSByYWlzZWQgd2hlbiB3ZSBjYWxsIGByZWxlYXNlTG9jaygpYCBvbiB0aGlzIHJlYWRlci4gSSdtIHN0aWxsIG15c3RpZmllZFxuICAgICAgICAgICAgLy8gYWJvdXQgd2h5IHRoZXNlIGVycm9ycyBhcmUgcmFpc2VkLCBidXQgSSdtIHN1cmUgdGhlcmUncyBzb21lIGltcG9ydGFudCBzcGVjIHJlYXNvbiB0aGF0XG4gICAgICAgICAgICAvLyBJIGhhdmVuJ3QgY29uc2lkZXJlZC4gSSBoYXRlIHRvIGVtcGxveSBzdWNoIGFuIGFudGktcGF0dGVybiBoZXJlLCBidXQgaXQgc2VlbXMgbGlrZSB0aGVcbiAgICAgICAgICAgIC8vIG9ubHkgc29sdXRpb24gaW4gdGhpcyBjYXNlIDovXG4gICAgICAgICAgICB0aGlzLmRlZmF1bHRSZWFkZXJbJ2Nsb3NlZCddLmNhdGNoKCgpID0+IHt9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKHRoaXMucmVhZGVyID0gdGhpcy5kZWZhdWx0UmVhZGVyKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldEJZT0JSZWFkZXIoKSB7XG4gICAgICAgIGlmICh0aGlzLmRlZmF1bHRSZWFkZXIpIHsgdGhpcy5yZWxlYXNlTG9jaygpOyB9XG4gICAgICAgIGlmICghdGhpcy5ieW9iUmVhZGVyKSB7XG4gICAgICAgICAgICB0aGlzLmJ5b2JSZWFkZXIgPSB0aGlzLnNvdXJjZVsnZ2V0UmVhZGVyJ10oeyBtb2RlOiAnYnlvYicgfSk7XG4gICAgICAgICAgICAvLyBXZSBoYXZlIHRvIGNhdGNoIGFuZCBzd2FsbG93IGVycm9ycyBoZXJlIHRvIGF2b2lkIHVuY2F1Z2h0IHByb21pc2UgcmVqZWN0aW9uIGV4Y2VwdGlvbnNcbiAgICAgICAgICAgIC8vIHRoYXQgc2VlbSB0byBiZSByYWlzZWQgd2hlbiB3ZSBjYWxsIGByZWxlYXNlTG9jaygpYCBvbiB0aGlzIHJlYWRlci4gSSdtIHN0aWxsIG15c3RpZmllZFxuICAgICAgICAgICAgLy8gYWJvdXQgd2h5IHRoZXNlIGVycm9ycyBhcmUgcmFpc2VkLCBidXQgSSdtIHN1cmUgdGhlcmUncyBzb21lIGltcG9ydGFudCBzcGVjIHJlYXNvbiB0aGF0XG4gICAgICAgICAgICAvLyBJIGhhdmVuJ3QgY29uc2lkZXJlZC4gSSBoYXRlIHRvIGVtcGxveSBzdWNoIGFuIGFudGktcGF0dGVybiBoZXJlLCBidXQgaXQgc2VlbXMgbGlrZSB0aGVcbiAgICAgICAgICAgIC8vIG9ubHkgc29sdXRpb24gaW4gdGhpcyBjYXNlIDovXG4gICAgICAgICAgICB0aGlzLmJ5b2JSZWFkZXJbJ2Nsb3NlZCddLmNhdGNoKCgpID0+IHt9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKHRoaXMucmVhZGVyID0gdGhpcy5ieW9iUmVhZGVyKTtcbiAgICB9XG5cbiAgICAvLyBUaGlzIHN0cmF0ZWd5IHBsdWNrZWQgZnJvbSB0aGUgZXhhbXBsZSBpbiB0aGUgc3RyZWFtcyBzcGVjOlxuICAgIC8vIGh0dHBzOi8vc3RyZWFtcy5zcGVjLndoYXR3Zy5vcmcvI2V4YW1wbGUtbWFudWFsLXJlYWQtYnl0ZXNcbiAgICBwcml2YXRlIGFzeW5jIHJlYWRGcm9tQllPQlJlYWRlcihzaXplOiBudW1iZXIpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHJlYWRJbnRvKHRoaXMuZ2V0QllPQlJlYWRlcigpLCBuZXcgQXJyYXlCdWZmZXIoc2l6ZSksIDAsIHNpemUpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmFzeW5jIGZ1bmN0aW9uIHJlYWRJbnRvKHJlYWRlcjogUmVhZGFibGVTdHJlYW1CWU9CUmVhZGVyLCBidWZmZXI6IEFycmF5QnVmZmVyTGlrZSwgb2Zmc2V0OiBudW1iZXIsIHNpemU6IG51bWJlcik6IFByb21pc2U8UmVhZGFibGVTdHJlYW1SZWFkUmVzdWx0PFVpbnQ4QXJyYXk+PiB7XG4gICAgaWYgKG9mZnNldCA+PSBzaXplKSB7XG4gICAgICAgIHJldHVybiB7IGRvbmU6IGZhbHNlLCB2YWx1ZTogbmV3IFVpbnQ4QXJyYXkoYnVmZmVyLCAwLCBzaXplKSB9O1xuICAgIH1cbiAgICBjb25zdCB7IGRvbmUsIHZhbHVlIH0gPSBhd2FpdCByZWFkZXIucmVhZChuZXcgVWludDhBcnJheShidWZmZXIsIG9mZnNldCwgc2l6ZSAtIG9mZnNldCkpO1xuICAgIGlmICgoKG9mZnNldCArPSB2YWx1ZS5ieXRlTGVuZ3RoKSA8IHNpemUpICYmICFkb25lKSB7XG4gICAgICAgIHJldHVybiBhd2FpdCByZWFkSW50byhyZWFkZXIsIHZhbHVlLmJ1ZmZlciwgb2Zmc2V0LCBzaXplKTtcbiAgICB9XG4gICAgcmV0dXJuIHsgZG9uZSwgdmFsdWU6IG5ldyBVaW50OEFycmF5KHZhbHVlLmJ1ZmZlciwgMCwgb2Zmc2V0KSB9O1xufVxuXG4vKiogQGlnbm9yZSAqL1xudHlwZSBFdmVudE5hbWUgPSAnZW5kJyB8ICdlcnJvcicgfCAncmVhZGFibGUnO1xuLyoqIEBpZ25vcmUgKi9cbnR5cGUgRXZlbnQgPSBbRXZlbnROYW1lLCAoXzogYW55KSA9PiB2b2lkLCBQcm9taXNlPFtFdmVudE5hbWUsIEVycm9yIHwgbnVsbF0+XTtcbi8qKiBAaWdub3JlICovXG5jb25zdCBvbkV2ZW50ID0gPFQgZXh0ZW5kcyBzdHJpbmc+KHN0cmVhbTogTm9kZUpTLlJlYWRhYmxlU3RyZWFtLCBldmVudDogVCkgPT4ge1xuICAgIGxldCBoYW5kbGVyID0gKF86IGFueSkgPT4gcmVzb2x2ZShbZXZlbnQsIF9dKTtcbiAgICBsZXQgcmVzb2x2ZTogKHZhbHVlPzogW1QsIGFueV0gfCBQcm9taXNlTGlrZTxbVCwgYW55XT4pID0+IHZvaWQ7XG4gICAgcmV0dXJuIFtldmVudCwgaGFuZGxlciwgbmV3IFByb21pc2U8W1QsIGFueV0+KFxuICAgICAgICAocikgPT4gKHJlc29sdmUgPSByKSAmJiBzdHJlYW1bJ29uY2UnXShldmVudCwgaGFuZGxlcilcbiAgICApXSBhcyBFdmVudDtcbn07XG5cbi8qKiBAaWdub3JlICovXG5hc3luYyBmdW5jdGlvbiogZnJvbVJlYWRhYmxlTm9kZVN0cmVhbShzdHJlYW06IE5vZGVKUy5SZWFkYWJsZVN0cmVhbSk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxVaW50OEFycmF5PiB7XG5cbiAgICBsZXQgZXZlbnRzOiBFdmVudFtdID0gW107XG4gICAgbGV0IGV2ZW50OiBFdmVudE5hbWUgPSAnZXJyb3InO1xuICAgIGxldCBkb25lID0gZmFsc2UsIGVycjogRXJyb3IgfCBudWxsID0gbnVsbDtcbiAgICBsZXQgY21kOiAncGVlaycgfCAncmVhZCcsIHNpemU6IG51bWJlciwgYnVmZmVyTGVuZ3RoID0gMDtcbiAgICBsZXQgYnVmZmVyczogVWludDhBcnJheVtdID0gW10sIGJ1ZmZlcjogVWludDhBcnJheSB8IEJ1ZmZlciB8IHN0cmluZztcblxuICAgIGZ1bmN0aW9uIGJ5dGVSYW5nZSgpIHtcbiAgICAgICAgaWYgKGNtZCA9PT0gJ3BlZWsnKSB7XG4gICAgICAgICAgICByZXR1cm4gam9pblVpbnQ4QXJyYXlzKGJ1ZmZlcnMuc2xpY2UoKSwgc2l6ZSlbMF07XG4gICAgICAgIH1cbiAgICAgICAgW2J1ZmZlciwgYnVmZmVyc10gPSBqb2luVWludDhBcnJheXMoYnVmZmVycywgc2l6ZSk7XG4gICAgICAgIGJ1ZmZlckxlbmd0aCAtPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICAvLyBZaWVsZCBzbyB0aGUgY2FsbGVyIGNhbiBpbmplY3QgdGhlIHJlYWQgY29tbWFuZCBiZWZvcmUgd2VcbiAgICAvLyBhZGQgdGhlIGxpc3RlbmVyIGZvciB0aGUgc291cmNlIHN0cmVhbSdzICdyZWFkYWJsZScgZXZlbnQuXG4gICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCA8YW55PiBudWxsKTtcblxuICAgIC8vIGlnbm9yZSBzdGRpbiBpZiBpdCdzIGEgVFRZXG4gICAgaWYgKChzdHJlYW0gYXMgYW55KVsnaXNUVFknXSkgeyByZXR1cm4geWllbGQgbmV3IFVpbnQ4QXJyYXkoMCk7IH1cblxuICAgIHRyeSB7XG4gICAgICAgIC8vIGluaXRpYWxpemUgdGhlIHN0cmVhbSBldmVudCBoYW5kbGVyc1xuICAgICAgICBldmVudHNbMF0gPSBvbkV2ZW50KHN0cmVhbSwgJ2VuZCcpO1xuICAgICAgICBldmVudHNbMV0gPSBvbkV2ZW50KHN0cmVhbSwgJ2Vycm9yJyk7XG5cbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgZXZlbnRzWzJdID0gb25FdmVudChzdHJlYW0sICdyZWFkYWJsZScpO1xuXG4gICAgICAgICAgICAvLyB3YWl0IG9uIHRoZSBmaXJzdCBtZXNzYWdlIGV2ZW50IGZyb20gdGhlIHN0cmVhbVxuICAgICAgICAgICAgW2V2ZW50LCBlcnJdID0gYXdhaXQgUHJvbWlzZS5yYWNlKGV2ZW50cy5tYXAoKHgpID0+IHhbMl0pKTtcblxuICAgICAgICAgICAgLy8gaWYgdGhlIHN0cmVhbSBlbWl0dGVkIGFuIEVycm9yLCByZXRocm93IGl0XG4gICAgICAgICAgICBpZiAoZXZlbnQgPT09ICdlcnJvcicpIHsgYnJlYWs7IH1cbiAgICAgICAgICAgIGlmICghKGRvbmUgPSBldmVudCA9PT0gJ2VuZCcpKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIHNpemUgaXMgTmFOLCByZXF1ZXN0IHRvIHJlYWQgZXZlcnl0aGluZyBpbiB0aGUgc3RyZWFtJ3MgaW50ZXJuYWwgYnVmZmVyXG4gICAgICAgICAgICAgICAgaWYgKCFpc0Zpbml0ZShzaXplIC0gYnVmZmVyTGVuZ3RoKSkge1xuICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSB0b1VpbnQ4QXJyYXkoc3RyZWFtWydyZWFkJ10odW5kZWZpbmVkKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gdG9VaW50OEFycmF5KHN0cmVhbVsncmVhZCddKHNpemUgLSBidWZmZXJMZW5ndGgpKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIGJ5dGVMZW5ndGggaXMgMCwgdGhlbiB0aGUgcmVxdWVzdGVkIGFtb3VudCBpcyBtb3JlIHRoYW4gdGhlIHN0cmVhbSBoYXNcbiAgICAgICAgICAgICAgICAgICAgLy8gaW4gaXRzIGludGVybmFsIGJ1ZmZlci4gSW4gdGhpcyBjYXNlIHRoZSBzdHJlYW0gbmVlZHMgYSBcImtpY2tcIiB0byB0ZWxsIGl0IHRvXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnRpbnVlIGVtaXR0aW5nIHJlYWRhYmxlIGV2ZW50cywgc28gcmVxdWVzdCB0byByZWFkIGV2ZXJ5dGhpbmcgdGhlIHN0cmVhbVxuICAgICAgICAgICAgICAgICAgICAvLyBoYXMgaW4gaXRzIGludGVybmFsIGJ1ZmZlciByaWdodCBub3cuXG4gICAgICAgICAgICAgICAgICAgIGlmIChidWZmZXIuYnl0ZUxlbmd0aCA8IChzaXplIC0gYnVmZmVyTGVuZ3RoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gdG9VaW50OEFycmF5KHN0cmVhbVsncmVhZCddKHVuZGVmaW5lZCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGlmIGNodW5rIGlzIG5vdCBudWxsIG9yIGVtcHR5LCBwdXNoIGl0IG9udG8gdGhlIHF1ZXVlXG4gICAgICAgICAgICAgICAgaWYgKGJ1ZmZlci5ieXRlTGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBidWZmZXJzLnB1c2goYnVmZmVyKTtcbiAgICAgICAgICAgICAgICAgICAgYnVmZmVyTGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgZW5vdWdoIGJ5dGVzIGluIG91ciBidWZmZXIsIHlpZWxkIGNodW5rcyB1bnRpbCB3ZSBkb24ndFxuICAgICAgICAgICAgaWYgKGRvbmUgfHwgc2l6ZSA8PSBidWZmZXJMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgICh7IGNtZCwgc2l6ZSB9ID0geWllbGQgYnl0ZVJhbmdlKCkpO1xuICAgICAgICAgICAgICAgIH0gd2hpbGUgKHNpemUgPCBidWZmZXJMZW5ndGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IHdoaWxlICghZG9uZSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgYXdhaXQgY2xlYW51cChldmVudHMsIGV2ZW50ID09PSAnZXJyb3InID8gZXJyIDogbnVsbCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xlYW51cDxUIGV4dGVuZHMgRXJyb3IgfCBudWxsIHwgdm9pZD4oZXZlbnRzOiBFdmVudFtdLCBlcnI/OiBUKSB7XG4gICAgICAgIGJ1ZmZlciA9IGJ1ZmZlcnMgPSA8YW55PiBudWxsO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8VD4oYXN5bmMgKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgZm9yIChjb25zdCBbZXZ0LCBmbl0gb2YgZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgc3RyZWFtWydvZmYnXShldnQsIGZuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gU29tZSBzdHJlYW0gaW1wbGVtZW50YXRpb25zIGRvbid0IGNhbGwgdGhlIGRlc3Ryb3kgY2FsbGJhY2ssXG4gICAgICAgICAgICAgICAgLy8gYmVjYXVzZSBpdCdzIHJlYWxseSBhIG5vZGUtaW50ZXJuYWwgQVBJLiBKdXN0IGNhbGxpbmcgYGRlc3Ryb3lgXG4gICAgICAgICAgICAgICAgLy8gaGVyZSBzaG91bGQgYmUgZW5vdWdoIHRvIGNvbmZvcm0gdG8gdGhlIFJlYWRhYmxlU3RyZWFtIGNvbnRyYWN0XG4gICAgICAgICAgICAgICAgY29uc3QgZGVzdHJveSA9IChzdHJlYW0gYXMgYW55KVsnZGVzdHJveSddO1xuICAgICAgICAgICAgICAgIGRlc3Ryb3kgJiYgZGVzdHJveS5jYWxsKHN0cmVhbSwgZXJyKTtcbiAgICAgICAgICAgICAgICBlcnIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7IGVyciA9IGUgfHwgZXJyOyB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIGVyciAhPSBudWxsID8gcmVqZWN0KGVycikgOiByZXNvbHZlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbiJdfQ==

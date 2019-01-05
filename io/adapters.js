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
    fromDOMStream(source) {
        return pump(fromDOMStream(source));
    },
    fromNodeStream(stream) {
        return pump(fromNodeStream(stream));
    },
    // @ts-ignore
    toDOMStream(source, options) {
        throw new Error(`"toDOMStream" not available in this environment`);
    },
    // @ts-ignore
    toNodeStream(source, options) {
        throw new Error(`"toNodeStream" not available in this environment`);
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
function fromDOMStream(source) {
    return tslib_1.__asyncGenerator(this, arguments, function* fromDOMStream_1() {
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
            (threw === false) ? (yield tslib_1.__await(it['cancel']()))
                : source['locked'] && it.releaseLock();
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
            const { reader, source } = this;
            reader && (yield reader['cancel'](reason));
            source && (source['locked'] && this.releaseLock());
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
function fromNodeStream(stream) {
    return tslib_1.__asyncGenerator(this, arguments, function* fromNodeStream_1() {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztpQkFDekM7WUFDTCxDQUFDLENBQUEsQ0FBQyxDQUFDO1FBQ1AsQ0FBQztJQUNMLENBQUM7Q0FBQSIsImZpbGUiOiJpby9hZGFwdGVycy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQge1xuICAgIHRvVWludDhBcnJheSxcbiAgICBqb2luVWludDhBcnJheXMsXG4gICAgQXJyYXlCdWZmZXJWaWV3SW5wdXQsXG4gICAgdG9VaW50OEFycmF5SXRlcmF0b3IsXG4gICAgdG9VaW50OEFycmF5QXN5bmNJdGVyYXRvclxufSBmcm9tICcuLi91dGlsL2J1ZmZlcic7XG5cbmltcG9ydCB7IFJlYWRhYmxlRE9NU3RyZWFtT3B0aW9ucyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgZGVmYXVsdCB7XG4gICAgZnJvbUl0ZXJhYmxlPFQgZXh0ZW5kcyBBcnJheUJ1ZmZlclZpZXdJbnB1dD4oc291cmNlOiBJdGVyYWJsZTxUPiB8IFQpOiBJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcbiAgICAgICAgcmV0dXJuIHB1bXAoZnJvbUl0ZXJhYmxlPFQ+KHNvdXJjZSkpO1xuICAgIH0sXG4gICAgZnJvbUFzeW5jSXRlcmFibGU8VCBleHRlbmRzIEFycmF5QnVmZmVyVmlld0lucHV0Pihzb3VyY2U6IEFzeW5jSXRlcmFibGU8VD4gfCBQcm9taXNlTGlrZTxUPik6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxVaW50OEFycmF5PiB7XG4gICAgICAgIHJldHVybiBwdW1wKGZyb21Bc3luY0l0ZXJhYmxlPFQ+KHNvdXJjZSkpO1xuICAgIH0sXG4gICAgZnJvbURPTVN0cmVhbTxUIGV4dGVuZHMgQXJyYXlCdWZmZXJWaWV3SW5wdXQ+KHNvdXJjZTogUmVhZGFibGVTdHJlYW08VD4pOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8VWludDhBcnJheT4ge1xuICAgICAgICByZXR1cm4gcHVtcChmcm9tRE9NU3RyZWFtPFQ+KHNvdXJjZSkpO1xuICAgIH0sXG4gICAgZnJvbU5vZGVTdHJlYW0oc3RyZWFtOiBOb2RlSlMuUmVhZGFibGVTdHJlYW0pOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8VWludDhBcnJheT4ge1xuICAgICAgICByZXR1cm4gcHVtcChmcm9tTm9kZVN0cmVhbShzdHJlYW0pKTtcbiAgICB9LFxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICB0b0RPTVN0cmVhbTxUPihzb3VyY2U6IEl0ZXJhYmxlPFQ+IHwgQXN5bmNJdGVyYWJsZTxUPiwgb3B0aW9ucz86IFJlYWRhYmxlRE9NU3RyZWFtT3B0aW9ucyk6IFJlYWRhYmxlU3RyZWFtPFQ+IHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBcInRvRE9NU3RyZWFtXCIgbm90IGF2YWlsYWJsZSBpbiB0aGlzIGVudmlyb25tZW50YCk7XG4gICAgfSxcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgdG9Ob2RlU3RyZWFtPFQ+KHNvdXJjZTogSXRlcmFibGU8VD4gfCBBc3luY0l0ZXJhYmxlPFQ+LCBvcHRpb25zPzogaW1wb3J0KCdzdHJlYW0nKS5SZWFkYWJsZU9wdGlvbnMpOiBpbXBvcnQoJ3N0cmVhbScpLlJlYWRhYmxlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBcInRvTm9kZVN0cmVhbVwiIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBlbnZpcm9ubWVudGApO1xuICAgIH0sXG59O1xuXG4vKiogQGlnbm9yZSAqL1xuY29uc3QgcHVtcCA9IDxUIGV4dGVuZHMgSXRlcmF0b3I8YW55PiB8IEFzeW5jSXRlcmF0b3I8YW55Pj4oaXRlcmF0b3I6IFQpID0+IHsgaXRlcmF0b3IubmV4dCgpOyByZXR1cm4gaXRlcmF0b3I7IH07XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiogZnJvbUl0ZXJhYmxlPFQgZXh0ZW5kcyBBcnJheUJ1ZmZlclZpZXdJbnB1dD4oc291cmNlOiBJdGVyYWJsZTxUPiB8IFQpOiBJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcblxuICAgIGxldCBkb25lOiBib29sZWFuLCB0aHJldyA9IGZhbHNlO1xuICAgIGxldCBidWZmZXJzOiBVaW50OEFycmF5W10gPSBbXSwgYnVmZmVyOiBVaW50OEFycmF5O1xuICAgIGxldCBjbWQ6ICdwZWVrJyB8ICdyZWFkJywgc2l6ZTogbnVtYmVyLCBidWZmZXJMZW5ndGggPSAwO1xuXG4gICAgZnVuY3Rpb24gYnl0ZVJhbmdlKCkge1xuICAgICAgICBpZiAoY21kID09PSAncGVlaycpIHtcbiAgICAgICAgICAgIHJldHVybiBqb2luVWludDhBcnJheXMoYnVmZmVycy5zbGljZSgpLCBzaXplKVswXTtcbiAgICAgICAgfVxuICAgICAgICBbYnVmZmVyLCBidWZmZXJzXSA9IGpvaW5VaW50OEFycmF5cyhidWZmZXJzLCBzaXplKTtcbiAgICAgICAgYnVmZmVyTGVuZ3RoIC09IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8vIFlpZWxkIHNvIHRoZSBjYWxsZXIgY2FuIGluamVjdCB0aGUgcmVhZCBjb21tYW5kIGJlZm9yZSBjcmVhdGluZyB0aGUgc291cmNlIEl0ZXJhdG9yXG4gICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCA8YW55PiBudWxsKTtcblxuICAgIC8vIGluaXRpYWxpemUgdGhlIGl0ZXJhdG9yXG4gICAgbGV0IGl0ID0gdG9VaW50OEFycmF5SXRlcmF0b3Ioc291cmNlKVtTeW1ib2wuaXRlcmF0b3JdKCk7XG5cbiAgICB0cnkge1xuICAgICAgICBkbyB7XG4gICAgICAgICAgICAvLyByZWFkIHRoZSBuZXh0IHZhbHVlXG4gICAgICAgICAgICAoeyBkb25lLCB2YWx1ZTogYnVmZmVyIH0gPSBpc05hTihzaXplIC0gYnVmZmVyTGVuZ3RoKSA/XG4gICAgICAgICAgICAgICAgaXQubmV4dCh1bmRlZmluZWQpIDogaXQubmV4dChzaXplIC0gYnVmZmVyTGVuZ3RoKSk7XG4gICAgICAgICAgICAvLyBpZiBjaHVuayBpcyBub3QgbnVsbCBvciBlbXB0eSwgcHVzaCBpdCBvbnRvIHRoZSBxdWV1ZVxuICAgICAgICAgICAgaWYgKCFkb25lICYmIGJ1ZmZlci5ieXRlTGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGJ1ZmZlcnMucHVzaChidWZmZXIpO1xuICAgICAgICAgICAgICAgIGJ1ZmZlckxlbmd0aCArPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgZW5vdWdoIGJ5dGVzIGluIG91ciBidWZmZXIsIHlpZWxkIGNodW5rcyB1bnRpbCB3ZSBkb24ndFxuICAgICAgICAgICAgaWYgKGRvbmUgfHwgc2l6ZSA8PSBidWZmZXJMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgICh7IGNtZCwgc2l6ZSB9ID0geWllbGQgYnl0ZVJhbmdlKCkpO1xuICAgICAgICAgICAgICAgIH0gd2hpbGUgKHNpemUgPCBidWZmZXJMZW5ndGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IHdoaWxlICghZG9uZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAodGhyZXcgPSB0cnVlKSAmJiAodHlwZW9mIGl0LnRocm93ID09PSAnZnVuY3Rpb24nKSAmJiAoaXQudGhyb3coZSkpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICAgICh0aHJldyA9PT0gZmFsc2UpICYmICh0eXBlb2YgaXQucmV0dXJuID09PSAnZnVuY3Rpb24nKSAmJiAoaXQucmV0dXJuKCkpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmFzeW5jIGZ1bmN0aW9uKiBmcm9tQXN5bmNJdGVyYWJsZTxUIGV4dGVuZHMgQXJyYXlCdWZmZXJWaWV3SW5wdXQ+KHNvdXJjZTogQXN5bmNJdGVyYWJsZTxUPiB8IFByb21pc2VMaWtlPFQ+KTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcblxuICAgIGxldCBkb25lOiBib29sZWFuLCB0aHJldyA9IGZhbHNlO1xuICAgIGxldCBidWZmZXJzOiBVaW50OEFycmF5W10gPSBbXSwgYnVmZmVyOiBVaW50OEFycmF5O1xuICAgIGxldCBjbWQ6ICdwZWVrJyB8ICdyZWFkJywgc2l6ZTogbnVtYmVyLCBidWZmZXJMZW5ndGggPSAwO1xuXG4gICAgZnVuY3Rpb24gYnl0ZVJhbmdlKCkge1xuICAgICAgICBpZiAoY21kID09PSAncGVlaycpIHtcbiAgICAgICAgICAgIHJldHVybiBqb2luVWludDhBcnJheXMoYnVmZmVycy5zbGljZSgpLCBzaXplKVswXTtcbiAgICAgICAgfVxuICAgICAgICBbYnVmZmVyLCBidWZmZXJzXSA9IGpvaW5VaW50OEFycmF5cyhidWZmZXJzLCBzaXplKTtcbiAgICAgICAgYnVmZmVyTGVuZ3RoIC09IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8vIFlpZWxkIHNvIHRoZSBjYWxsZXIgY2FuIGluamVjdCB0aGUgcmVhZCBjb21tYW5kIGJlZm9yZSBjcmVhdGluZyB0aGUgc291cmNlIEFzeW5jSXRlcmF0b3JcbiAgICAoeyBjbWQsIHNpemUgfSA9IHlpZWxkIDxhbnk+IG51bGwpO1xuXG4gICAgLy8gaW5pdGlhbGl6ZSB0aGUgaXRlcmF0b3JcbiAgICBsZXQgaXQgPSB0b1VpbnQ4QXJyYXlBc3luY0l0ZXJhdG9yKHNvdXJjZSlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk7XG5cbiAgICB0cnkge1xuICAgICAgICBkbyB7XG4gICAgICAgICAgICAvLyByZWFkIHRoZSBuZXh0IHZhbHVlXG4gICAgICAgICAgICAoeyBkb25lLCB2YWx1ZTogYnVmZmVyIH0gPSBpc05hTihzaXplIC0gYnVmZmVyTGVuZ3RoKVxuICAgICAgICAgICAgICAgID8gYXdhaXQgaXQubmV4dCh1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgOiBhd2FpdCBpdC5uZXh0KHNpemUgLSBidWZmZXJMZW5ndGgpKTtcbiAgICAgICAgICAgIC8vIGlmIGNodW5rIGlzIG5vdCBudWxsIG9yIGVtcHR5LCBwdXNoIGl0IG9udG8gdGhlIHF1ZXVlXG4gICAgICAgICAgICBpZiAoIWRvbmUgJiYgYnVmZmVyLmJ5dGVMZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVycy5wdXNoKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgYnVmZmVyTGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBlbm91Z2ggYnl0ZXMgaW4gb3VyIGJ1ZmZlciwgeWllbGQgY2h1bmtzIHVudGlsIHdlIGRvbid0XG4gICAgICAgICAgICBpZiAoZG9uZSB8fCBzaXplIDw9IGJ1ZmZlckxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCBieXRlUmFuZ2UoKSk7XG4gICAgICAgICAgICAgICAgfSB3aGlsZSAoc2l6ZSA8IGJ1ZmZlckxlbmd0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gd2hpbGUgKCFkb25lKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICh0aHJldyA9IHRydWUpICYmICh0eXBlb2YgaXQudGhyb3cgPT09ICdmdW5jdGlvbicpICYmIChhd2FpdCBpdC50aHJvdyhlKSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgKHRocmV3ID09PSBmYWxzZSkgJiYgKHR5cGVvZiBpdC5yZXR1cm4gPT09ICdmdW5jdGlvbicpICYmIChhd2FpdCBpdC5yZXR1cm4oKSk7XG4gICAgfVxufVxuXG4vLyBBbGwgdGhpcyBtYW51YWwgVWludDhBcnJheSBjaHVuayBtYW5hZ2VtZW50IGNhbiBiZSBhdm9pZGVkIGlmL3doZW4gZW5naW5lc1xuLy8gYWRkIHN1cHBvcnQgZm9yIEFycmF5QnVmZmVyLnRyYW5zZmVyKCkgb3IgQXJyYXlCdWZmZXIucHJvdG90eXBlLnJlYWxsb2MoKTpcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9kb21lbmljL3Byb3Bvc2FsLWFycmF5YnVmZmVyLXRyYW5zZmVyXG4vKiogQGlnbm9yZSAqL1xuYXN5bmMgZnVuY3Rpb24qIGZyb21ET01TdHJlYW08VCBleHRlbmRzIEFycmF5QnVmZmVyVmlld0lucHV0Pihzb3VyY2U6IFJlYWRhYmxlU3RyZWFtPFQ+KTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcblxuICAgIGxldCBkb25lID0gZmFsc2UsIHRocmV3ID0gZmFsc2U7XG4gICAgbGV0IGJ1ZmZlcnM6IFVpbnQ4QXJyYXlbXSA9IFtdLCBidWZmZXI6IFVpbnQ4QXJyYXk7XG4gICAgbGV0IGNtZDogJ3BlZWsnIHwgJ3JlYWQnLCBzaXplOiBudW1iZXIsIGJ1ZmZlckxlbmd0aCA9IDA7XG5cbiAgICBmdW5jdGlvbiBieXRlUmFuZ2UoKSB7XG4gICAgICAgIGlmIChjbWQgPT09ICdwZWVrJykge1xuICAgICAgICAgICAgcmV0dXJuIGpvaW5VaW50OEFycmF5cyhidWZmZXJzLnNsaWNlKCksIHNpemUpWzBdO1xuICAgICAgICB9XG4gICAgICAgIFtidWZmZXIsIGJ1ZmZlcnNdID0gam9pblVpbnQ4QXJyYXlzKGJ1ZmZlcnMsIHNpemUpO1xuICAgICAgICBidWZmZXJMZW5ndGggLT0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgfVxuXG4gICAgLy8gWWllbGQgc28gdGhlIGNhbGxlciBjYW4gaW5qZWN0IHRoZSByZWFkIGNvbW1hbmQgYmVmb3JlIHdlIGVzdGFibGlzaCB0aGUgUmVhZGFibGVTdHJlYW0gbG9ja1xuICAgICh7IGNtZCwgc2l6ZSB9ID0geWllbGQgPGFueT4gbnVsbCk7XG5cbiAgICAvLyBpbml0aWFsaXplIHRoZSByZWFkZXIgYW5kIGxvY2sgdGhlIHN0cmVhbVxuICAgIGxldCBpdCA9IG5ldyBBZGFwdGl2ZUJ5dGVSZWFkZXIoc291cmNlKTtcblxuICAgIHRyeSB7XG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIC8vIHJlYWQgdGhlIG5leHQgdmFsdWVcbiAgICAgICAgICAgICh7IGRvbmUsIHZhbHVlOiBidWZmZXIgfSA9IGlzTmFOKHNpemUgLSBidWZmZXJMZW5ndGgpXG4gICAgICAgICAgICAgICAgPyBhd2FpdCBpdFsncmVhZCddKHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICA6IGF3YWl0IGl0WydyZWFkJ10oc2l6ZSAtIGJ1ZmZlckxlbmd0aCkpO1xuICAgICAgICAgICAgLy8gaWYgY2h1bmsgaXMgbm90IG51bGwgb3IgZW1wdHksIHB1c2ggaXQgb250byB0aGUgcXVldWVcbiAgICAgICAgICAgIGlmICghZG9uZSAmJiBidWZmZXIuYnl0ZUxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBidWZmZXJzLnB1c2godG9VaW50OEFycmF5KGJ1ZmZlcikpO1xuICAgICAgICAgICAgICAgIGJ1ZmZlckxlbmd0aCArPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgZW5vdWdoIGJ5dGVzIGluIG91ciBidWZmZXIsIHlpZWxkIGNodW5rcyB1bnRpbCB3ZSBkb24ndFxuICAgICAgICAgICAgaWYgKGRvbmUgfHwgc2l6ZSA8PSBidWZmZXJMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgICh7IGNtZCwgc2l6ZSB9ID0geWllbGQgYnl0ZVJhbmdlKCkpO1xuICAgICAgICAgICAgICAgIH0gd2hpbGUgKHNpemUgPCBidWZmZXJMZW5ndGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IHdoaWxlICghZG9uZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAodGhyZXcgPSB0cnVlKSAmJiAoYXdhaXQgaXRbJ2NhbmNlbCddKGUpKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgICAodGhyZXcgPT09IGZhbHNlKSA/IChhd2FpdCBpdFsnY2FuY2VsJ10oKSlcbiAgICAgICAgICAgIDogc291cmNlWydsb2NrZWQnXSAmJiBpdC5yZWxlYXNlTG9jaygpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmNsYXNzIEFkYXB0aXZlQnl0ZVJlYWRlcjxUIGV4dGVuZHMgQXJyYXlCdWZmZXJWaWV3SW5wdXQ+IHtcblxuICAgIHByaXZhdGUgc3VwcG9ydHNCWU9COiBib29sZWFuO1xuICAgIHByaXZhdGUgYnlvYlJlYWRlcjogUmVhZGFibGVTdHJlYW1CWU9CUmVhZGVyIHwgbnVsbCA9IG51bGw7XG4gICAgcHJpdmF0ZSBkZWZhdWx0UmVhZGVyOiBSZWFkYWJsZVN0cmVhbURlZmF1bHRSZWFkZXI8VD4gfCBudWxsID0gbnVsbDtcbiAgICBwcml2YXRlIHJlYWRlcjogUmVhZGFibGVTdHJlYW1CWU9CUmVhZGVyIHwgUmVhZGFibGVTdHJlYW1EZWZhdWx0UmVhZGVyPFQ+IHwgbnVsbDtcblxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgc291cmNlOiBSZWFkYWJsZVN0cmVhbTxUPikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5zdXBwb3J0c0JZT0IgPSAhISh0aGlzLnJlYWRlciA9IHRoaXMuZ2V0QllPQlJlYWRlcigpKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhpcy5zdXBwb3J0c0JZT0IgPSAhISEodGhpcy5yZWFkZXIgPSB0aGlzLmdldERlZmF1bHRSZWFkZXIoKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXQgY2xvc2VkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5yZWFkZXIgPyB0aGlzLnJlYWRlclsnY2xvc2VkJ10uY2F0Y2goKCkgPT4ge30pIDogUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuXG4gICAgcmVsZWFzZUxvY2soKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLnJlYWRlcikge1xuICAgICAgICAgICAgdGhpcy5yZWFkZXIucmVsZWFzZUxvY2soKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlYWRlciA9IHRoaXMuYnlvYlJlYWRlciA9IHRoaXMuZGVmYXVsdFJlYWRlciA9IG51bGw7XG4gICAgfVxuXG4gICAgYXN5bmMgY2FuY2VsKHJlYXNvbj86IGFueSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHJlYWRlciwgc291cmNlIH0gPSB0aGlzO1xuICAgICAgICByZWFkZXIgJiYgKGF3YWl0IHJlYWRlclsnY2FuY2VsJ10ocmVhc29uKSk7XG4gICAgICAgIHNvdXJjZSAmJiAoc291cmNlWydsb2NrZWQnXSAmJiB0aGlzLnJlbGVhc2VMb2NrKCkpO1xuICAgIH1cblxuICAgIGFzeW5jIHJlYWQoc2l6ZT86IG51bWJlcik6IFByb21pc2U8UmVhZGFibGVTdHJlYW1SZWFkUmVzdWx0PFVpbnQ4QXJyYXk+PiB7XG4gICAgICAgIGlmIChzaXplID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4geyBkb25lOiB0aGlzLnJlYWRlciA9PSBudWxsLCB2YWx1ZTogbmV3IFVpbnQ4QXJyYXkoMCkgfTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSAhdGhpcy5zdXBwb3J0c0JZT0IgfHwgdHlwZW9mIHNpemUgIT09ICdudW1iZXInXG4gICAgICAgICAgICA/IGF3YWl0IHRoaXMuZ2V0RGVmYXVsdFJlYWRlcigpLnJlYWQoKVxuICAgICAgICAgICAgOiBhd2FpdCB0aGlzLnJlYWRGcm9tQllPQlJlYWRlcihzaXplKTtcbiAgICAgICAgIXJlc3VsdC5kb25lICYmIChyZXN1bHQudmFsdWUgPSB0b1VpbnQ4QXJyYXkocmVzdWx0IGFzIFJlYWRhYmxlU3RyZWFtUmVhZFJlc3VsdDxVaW50OEFycmF5PikpO1xuICAgICAgICByZXR1cm4gcmVzdWx0IGFzIFJlYWRhYmxlU3RyZWFtUmVhZFJlc3VsdDxVaW50OEFycmF5PjtcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldERlZmF1bHRSZWFkZXIoKSB7XG4gICAgICAgIGlmICh0aGlzLmJ5b2JSZWFkZXIpIHsgdGhpcy5yZWxlYXNlTG9jaygpOyB9XG4gICAgICAgIGlmICghdGhpcy5kZWZhdWx0UmVhZGVyKSB7XG4gICAgICAgICAgICB0aGlzLmRlZmF1bHRSZWFkZXIgPSB0aGlzLnNvdXJjZVsnZ2V0UmVhZGVyJ10oKTtcbiAgICAgICAgICAgIC8vIFdlIGhhdmUgdG8gY2F0Y2ggYW5kIHN3YWxsb3cgZXJyb3JzIGhlcmUgdG8gYXZvaWQgdW5jYXVnaHQgcHJvbWlzZSByZWplY3Rpb24gZXhjZXB0aW9uc1xuICAgICAgICAgICAgLy8gdGhhdCBzZWVtIHRvIGJlIHJhaXNlZCB3aGVuIHdlIGNhbGwgYHJlbGVhc2VMb2NrKClgIG9uIHRoaXMgcmVhZGVyLiBJJ20gc3RpbGwgbXlzdGlmaWVkXG4gICAgICAgICAgICAvLyBhYm91dCB3aHkgdGhlc2UgZXJyb3JzIGFyZSByYWlzZWQsIGJ1dCBJJ20gc3VyZSB0aGVyZSdzIHNvbWUgaW1wb3J0YW50IHNwZWMgcmVhc29uIHRoYXRcbiAgICAgICAgICAgIC8vIEkgaGF2ZW4ndCBjb25zaWRlcmVkLiBJIGhhdGUgdG8gZW1wbG95IHN1Y2ggYW4gYW50aS1wYXR0ZXJuIGhlcmUsIGJ1dCBpdCBzZWVtcyBsaWtlIHRoZVxuICAgICAgICAgICAgLy8gb25seSBzb2x1dGlvbiBpbiB0aGlzIGNhc2UgOi9cbiAgICAgICAgICAgIHRoaXMuZGVmYXVsdFJlYWRlclsnY2xvc2VkJ10uY2F0Y2goKCkgPT4ge30pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAodGhpcy5yZWFkZXIgPSB0aGlzLmRlZmF1bHRSZWFkZXIpO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0QllPQlJlYWRlcigpIHtcbiAgICAgICAgaWYgKHRoaXMuZGVmYXVsdFJlYWRlcikgeyB0aGlzLnJlbGVhc2VMb2NrKCk7IH1cbiAgICAgICAgaWYgKCF0aGlzLmJ5b2JSZWFkZXIpIHtcbiAgICAgICAgICAgIHRoaXMuYnlvYlJlYWRlciA9IHRoaXMuc291cmNlWydnZXRSZWFkZXInXSh7IG1vZGU6ICdieW9iJyB9KTtcbiAgICAgICAgICAgIC8vIFdlIGhhdmUgdG8gY2F0Y2ggYW5kIHN3YWxsb3cgZXJyb3JzIGhlcmUgdG8gYXZvaWQgdW5jYXVnaHQgcHJvbWlzZSByZWplY3Rpb24gZXhjZXB0aW9uc1xuICAgICAgICAgICAgLy8gdGhhdCBzZWVtIHRvIGJlIHJhaXNlZCB3aGVuIHdlIGNhbGwgYHJlbGVhc2VMb2NrKClgIG9uIHRoaXMgcmVhZGVyLiBJJ20gc3RpbGwgbXlzdGlmaWVkXG4gICAgICAgICAgICAvLyBhYm91dCB3aHkgdGhlc2UgZXJyb3JzIGFyZSByYWlzZWQsIGJ1dCBJJ20gc3VyZSB0aGVyZSdzIHNvbWUgaW1wb3J0YW50IHNwZWMgcmVhc29uIHRoYXRcbiAgICAgICAgICAgIC8vIEkgaGF2ZW4ndCBjb25zaWRlcmVkLiBJIGhhdGUgdG8gZW1wbG95IHN1Y2ggYW4gYW50aS1wYXR0ZXJuIGhlcmUsIGJ1dCBpdCBzZWVtcyBsaWtlIHRoZVxuICAgICAgICAgICAgLy8gb25seSBzb2x1dGlvbiBpbiB0aGlzIGNhc2UgOi9cbiAgICAgICAgICAgIHRoaXMuYnlvYlJlYWRlclsnY2xvc2VkJ10uY2F0Y2goKCkgPT4ge30pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAodGhpcy5yZWFkZXIgPSB0aGlzLmJ5b2JSZWFkZXIpO1xuICAgIH1cblxuICAgIC8vIFRoaXMgc3RyYXRlZ3kgcGx1Y2tlZCBmcm9tIHRoZSBleGFtcGxlIGluIHRoZSBzdHJlYW1zIHNwZWM6XG4gICAgLy8gaHR0cHM6Ly9zdHJlYW1zLnNwZWMud2hhdHdnLm9yZy8jZXhhbXBsZS1tYW51YWwtcmVhZC1ieXRlc1xuICAgIHByaXZhdGUgYXN5bmMgcmVhZEZyb21CWU9CUmVhZGVyKHNpemU6IG51bWJlcikge1xuICAgICAgICByZXR1cm4gYXdhaXQgcmVhZEludG8odGhpcy5nZXRCWU9CUmVhZGVyKCksIG5ldyBBcnJheUJ1ZmZlcihzaXplKSwgMCwgc2l6ZSk7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuYXN5bmMgZnVuY3Rpb24gcmVhZEludG8ocmVhZGVyOiBSZWFkYWJsZVN0cmVhbUJZT0JSZWFkZXIsIGJ1ZmZlcjogQXJyYXlCdWZmZXJMaWtlLCBvZmZzZXQ6IG51bWJlciwgc2l6ZTogbnVtYmVyKTogUHJvbWlzZTxSZWFkYWJsZVN0cmVhbVJlYWRSZXN1bHQ8VWludDhBcnJheT4+IHtcbiAgICBpZiAob2Zmc2V0ID49IHNpemUpIHtcbiAgICAgICAgcmV0dXJuIHsgZG9uZTogZmFsc2UsIHZhbHVlOiBuZXcgVWludDhBcnJheShidWZmZXIsIDAsIHNpemUpIH07XG4gICAgfVxuICAgIGNvbnN0IHsgZG9uZSwgdmFsdWUgfSA9IGF3YWl0IHJlYWRlci5yZWFkKG5ldyBVaW50OEFycmF5KGJ1ZmZlciwgb2Zmc2V0LCBzaXplIC0gb2Zmc2V0KSk7XG4gICAgaWYgKCgob2Zmc2V0ICs9IHZhbHVlLmJ5dGVMZW5ndGgpIDwgc2l6ZSkgJiYgIWRvbmUpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHJlYWRJbnRvKHJlYWRlciwgdmFsdWUuYnVmZmVyLCBvZmZzZXQsIHNpemUpO1xuICAgIH1cbiAgICByZXR1cm4geyBkb25lLCB2YWx1ZTogbmV3IFVpbnQ4QXJyYXkodmFsdWUuYnVmZmVyLCAwLCBvZmZzZXQpIH07XG59XG5cbi8qKiBAaWdub3JlICovXG50eXBlIEV2ZW50TmFtZSA9ICdlbmQnIHwgJ2Vycm9yJyB8ICdyZWFkYWJsZSc7XG4vKiogQGlnbm9yZSAqL1xudHlwZSBFdmVudCA9IFtFdmVudE5hbWUsIChfOiBhbnkpID0+IHZvaWQsIFByb21pc2U8W0V2ZW50TmFtZSwgRXJyb3IgfCBudWxsXT5dO1xuLyoqIEBpZ25vcmUgKi9cbmNvbnN0IG9uRXZlbnQgPSA8VCBleHRlbmRzIHN0cmluZz4oc3RyZWFtOiBOb2RlSlMuUmVhZGFibGVTdHJlYW0sIGV2ZW50OiBUKSA9PiB7XG4gICAgbGV0IGhhbmRsZXIgPSAoXzogYW55KSA9PiByZXNvbHZlKFtldmVudCwgX10pO1xuICAgIGxldCByZXNvbHZlOiAodmFsdWU/OiBbVCwgYW55XSB8IFByb21pc2VMaWtlPFtULCBhbnldPikgPT4gdm9pZDtcbiAgICByZXR1cm4gW2V2ZW50LCBoYW5kbGVyLCBuZXcgUHJvbWlzZTxbVCwgYW55XT4oXG4gICAgICAgIChyKSA9PiAocmVzb2x2ZSA9IHIpICYmIHN0cmVhbVsnb25jZSddKGV2ZW50LCBoYW5kbGVyKVxuICAgICldIGFzIEV2ZW50O1xufTtcblxuLyoqIEBpZ25vcmUgKi9cbmFzeW5jIGZ1bmN0aW9uKiBmcm9tTm9kZVN0cmVhbShzdHJlYW06IE5vZGVKUy5SZWFkYWJsZVN0cmVhbSk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxVaW50OEFycmF5PiB7XG5cbiAgICBsZXQgZXZlbnRzOiBFdmVudFtdID0gW107XG4gICAgbGV0IGV2ZW50OiBFdmVudE5hbWUgPSAnZXJyb3InO1xuICAgIGxldCBkb25lID0gZmFsc2UsIGVycjogRXJyb3IgfCBudWxsID0gbnVsbDtcbiAgICBsZXQgY21kOiAncGVlaycgfCAncmVhZCcsIHNpemU6IG51bWJlciwgYnVmZmVyTGVuZ3RoID0gMDtcbiAgICBsZXQgYnVmZmVyczogVWludDhBcnJheVtdID0gW10sIGJ1ZmZlcjogVWludDhBcnJheSB8IEJ1ZmZlciB8IHN0cmluZztcblxuICAgIGZ1bmN0aW9uIGJ5dGVSYW5nZSgpIHtcbiAgICAgICAgaWYgKGNtZCA9PT0gJ3BlZWsnKSB7XG4gICAgICAgICAgICByZXR1cm4gam9pblVpbnQ4QXJyYXlzKGJ1ZmZlcnMuc2xpY2UoKSwgc2l6ZSlbMF07XG4gICAgICAgIH1cbiAgICAgICAgW2J1ZmZlciwgYnVmZmVyc10gPSBqb2luVWludDhBcnJheXMoYnVmZmVycywgc2l6ZSk7XG4gICAgICAgIGJ1ZmZlckxlbmd0aCAtPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICAvLyBZaWVsZCBzbyB0aGUgY2FsbGVyIGNhbiBpbmplY3QgdGhlIHJlYWQgY29tbWFuZCBiZWZvcmUgd2VcbiAgICAvLyBhZGQgdGhlIGxpc3RlbmVyIGZvciB0aGUgc291cmNlIHN0cmVhbSdzICdyZWFkYWJsZScgZXZlbnQuXG4gICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCA8YW55PiBudWxsKTtcblxuICAgIC8vIGlnbm9yZSBzdGRpbiBpZiBpdCdzIGEgVFRZXG4gICAgaWYgKChzdHJlYW0gYXMgYW55KVsnaXNUVFknXSkgeyByZXR1cm4geWllbGQgbmV3IFVpbnQ4QXJyYXkoMCk7IH1cblxuICAgIHRyeSB7XG4gICAgICAgIC8vIGluaXRpYWxpemUgdGhlIHN0cmVhbSBldmVudCBoYW5kbGVyc1xuICAgICAgICBldmVudHNbMF0gPSBvbkV2ZW50KHN0cmVhbSwgJ2VuZCcpO1xuICAgICAgICBldmVudHNbMV0gPSBvbkV2ZW50KHN0cmVhbSwgJ2Vycm9yJyk7XG5cbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgZXZlbnRzWzJdID0gb25FdmVudChzdHJlYW0sICdyZWFkYWJsZScpO1xuXG4gICAgICAgICAgICAvLyB3YWl0IG9uIHRoZSBmaXJzdCBtZXNzYWdlIGV2ZW50IGZyb20gdGhlIHN0cmVhbVxuICAgICAgICAgICAgW2V2ZW50LCBlcnJdID0gYXdhaXQgUHJvbWlzZS5yYWNlKGV2ZW50cy5tYXAoKHgpID0+IHhbMl0pKTtcblxuICAgICAgICAgICAgLy8gaWYgdGhlIHN0cmVhbSBlbWl0dGVkIGFuIEVycm9yLCByZXRocm93IGl0XG4gICAgICAgICAgICBpZiAoZXZlbnQgPT09ICdlcnJvcicpIHsgYnJlYWs7IH1cbiAgICAgICAgICAgIGlmICghKGRvbmUgPSBldmVudCA9PT0gJ2VuZCcpKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIHNpemUgaXMgTmFOLCByZXF1ZXN0IHRvIHJlYWQgZXZlcnl0aGluZyBpbiB0aGUgc3RyZWFtJ3MgaW50ZXJuYWwgYnVmZmVyXG4gICAgICAgICAgICAgICAgaWYgKCFpc0Zpbml0ZShzaXplIC0gYnVmZmVyTGVuZ3RoKSkge1xuICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSB0b1VpbnQ4QXJyYXkoc3RyZWFtWydyZWFkJ10odW5kZWZpbmVkKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gdG9VaW50OEFycmF5KHN0cmVhbVsncmVhZCddKHNpemUgLSBidWZmZXJMZW5ndGgpKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIGJ5dGVMZW5ndGggaXMgMCwgdGhlbiB0aGUgcmVxdWVzdGVkIGFtb3VudCBpcyBtb3JlIHRoYW4gdGhlIHN0cmVhbSBoYXNcbiAgICAgICAgICAgICAgICAgICAgLy8gaW4gaXRzIGludGVybmFsIGJ1ZmZlci4gSW4gdGhpcyBjYXNlIHRoZSBzdHJlYW0gbmVlZHMgYSBcImtpY2tcIiB0byB0ZWxsIGl0IHRvXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnRpbnVlIGVtaXR0aW5nIHJlYWRhYmxlIGV2ZW50cywgc28gcmVxdWVzdCB0byByZWFkIGV2ZXJ5dGhpbmcgdGhlIHN0cmVhbVxuICAgICAgICAgICAgICAgICAgICAvLyBoYXMgaW4gaXRzIGludGVybmFsIGJ1ZmZlciByaWdodCBub3cuXG4gICAgICAgICAgICAgICAgICAgIGlmIChidWZmZXIuYnl0ZUxlbmd0aCA8IChzaXplIC0gYnVmZmVyTGVuZ3RoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gdG9VaW50OEFycmF5KHN0cmVhbVsncmVhZCddKHVuZGVmaW5lZCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGlmIGNodW5rIGlzIG5vdCBudWxsIG9yIGVtcHR5LCBwdXNoIGl0IG9udG8gdGhlIHF1ZXVlXG4gICAgICAgICAgICAgICAgaWYgKGJ1ZmZlci5ieXRlTGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBidWZmZXJzLnB1c2goYnVmZmVyKTtcbiAgICAgICAgICAgICAgICAgICAgYnVmZmVyTGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgZW5vdWdoIGJ5dGVzIGluIG91ciBidWZmZXIsIHlpZWxkIGNodW5rcyB1bnRpbCB3ZSBkb24ndFxuICAgICAgICAgICAgaWYgKGRvbmUgfHwgc2l6ZSA8PSBidWZmZXJMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgICh7IGNtZCwgc2l6ZSB9ID0geWllbGQgYnl0ZVJhbmdlKCkpO1xuICAgICAgICAgICAgICAgIH0gd2hpbGUgKHNpemUgPCBidWZmZXJMZW5ndGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IHdoaWxlICghZG9uZSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgYXdhaXQgY2xlYW51cChldmVudHMsIGV2ZW50ID09PSAnZXJyb3InID8gZXJyIDogbnVsbCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xlYW51cDxUIGV4dGVuZHMgRXJyb3IgfCBudWxsIHwgdm9pZD4oZXZlbnRzOiBFdmVudFtdLCBlcnI/OiBUKSB7XG4gICAgICAgIGJ1ZmZlciA9IGJ1ZmZlcnMgPSA8YW55PiBudWxsO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8VD4oYXN5bmMgKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgZm9yIChjb25zdCBbZXZ0LCBmbl0gb2YgZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgc3RyZWFtWydvZmYnXShldnQsIGZuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gU29tZSBzdHJlYW0gaW1wbGVtZW50YXRpb25zIGRvbid0IGNhbGwgdGhlIGRlc3Ryb3kgY2FsbGJhY2ssXG4gICAgICAgICAgICAgICAgLy8gYmVjYXVzZSBpdCdzIHJlYWxseSBhIG5vZGUtaW50ZXJuYWwgQVBJLiBKdXN0IGNhbGxpbmcgYGRlc3Ryb3lgXG4gICAgICAgICAgICAgICAgLy8gaGVyZSBzaG91bGQgYmUgZW5vdWdoIHRvIGNvbmZvcm0gdG8gdGhlIFJlYWRhYmxlU3RyZWFtIGNvbnRyYWN0XG4gICAgICAgICAgICAgICAgY29uc3QgZGVzdHJveSA9IChzdHJlYW0gYXMgYW55KVsnZGVzdHJveSddO1xuICAgICAgICAgICAgICAgIGRlc3Ryb3kgJiYgZGVzdHJveS5jYWxsKHN0cmVhbSwgZXJyKTtcbiAgICAgICAgICAgICAgICBlcnIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7IGVyciA9IGUgfHwgZXJyOyB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIGVyciAhPSBudWxsID8gcmVqZWN0KGVycikgOiByZXNvbHZlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbiJdfQ==

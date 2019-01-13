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
            return buffer_1.joinUint8Arrays(buffers, size)[0];
        }
        [buffer, buffers, bufferLength] = buffer_1.joinUint8Arrays(buffers, size);
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
async function* fromAsyncIterable(source) {
    let done, threw = false;
    let buffers = [], buffer;
    let cmd, size, bufferLength = 0;
    function byteRange() {
        if (cmd === 'peek') {
            return buffer_1.joinUint8Arrays(buffers, size)[0];
        }
        [buffer, buffers, bufferLength] = buffer_1.joinUint8Arrays(buffers, size);
        return buffer;
    }
    // Yield so the caller can inject the read command before creating the source AsyncIterator
    ({ cmd, size } = yield null);
    // initialize the iterator
    let it = buffer_1.toUint8ArrayAsyncIterator(source)[Symbol.asyncIterator]();
    try {
        do {
            // read the next value
            ({ done, value: buffer } = isNaN(size - bufferLength)
                ? await it.next(undefined)
                : await it.next(size - bufferLength));
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
        (threw = true) && (typeof it.throw === 'function') && (await it.throw(e));
    }
    finally {
        (threw === false) && (typeof it.return === 'function') && (await it.return());
    }
}
// All this manual Uint8Array chunk management can be avoided if/when engines
// add support for ArrayBuffer.transfer() or ArrayBuffer.prototype.realloc():
// https://github.com/domenic/proposal-arraybuffer-transfer
/** @ignore */
async function* fromDOMStream(source) {
    let done = false, threw = false;
    let buffers = [], buffer;
    let cmd, size, bufferLength = 0;
    function byteRange() {
        if (cmd === 'peek') {
            return buffer_1.joinUint8Arrays(buffers, size)[0];
        }
        [buffer, buffers, bufferLength] = buffer_1.joinUint8Arrays(buffers, size);
        return buffer;
    }
    // Yield so the caller can inject the read command before we establish the ReadableStream lock
    ({ cmd, size } = yield null);
    // initialize the reader and lock the stream
    let it = new AdaptiveByteReader(source);
    try {
        do {
            // read the next value
            ({ done, value: buffer } = isNaN(size - bufferLength)
                ? await it['read'](undefined)
                : await it['read'](size - bufferLength));
            // if chunk is not null or empty, push it onto the queue
            if (!done && buffer.byteLength > 0) {
                buffers.push(buffer_1.toUint8Array(buffer));
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
        (threw = true) && (await it['cancel'](e));
    }
    finally {
        (threw === false) ? (await it['cancel']())
            : source['locked'] && it.releaseLock();
    }
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
    async cancel(reason) {
        const { reader, source } = this;
        reader && (await reader['cancel'](reason));
        source && (source['locked'] && this.releaseLock());
    }
    async read(size) {
        if (size === 0) {
            return { done: this.reader == null, value: new Uint8Array(0) };
        }
        const result = !this.supportsBYOB || typeof size !== 'number'
            ? await this.getDefaultReader().read()
            : await this.readFromBYOBReader(size);
        !result.done && (result.value = buffer_1.toUint8Array(result));
        return result;
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
    async readFromBYOBReader(size) {
        return await readInto(this.getBYOBReader(), new ArrayBuffer(size), 0, size);
    }
}
/** @ignore */
async function readInto(reader, buffer, offset, size) {
    if (offset >= size) {
        return { done: false, value: new Uint8Array(buffer, 0, size) };
    }
    const { done, value } = await reader.read(new Uint8Array(buffer, offset, size - offset));
    if (((offset += value.byteLength) < size) && !done) {
        return await readInto(reader, value.buffer, offset, size);
    }
    return { done, value: new Uint8Array(value.buffer, 0, offset) };
}
/** @ignore */
const onEvent = (stream, event) => {
    let handler = (_) => resolve([event, _]);
    let resolve;
    return [event, handler, new Promise((r) => (resolve = r) && stream['once'](event, handler))];
};
/** @ignore */
async function* fromNodeStream(stream) {
    let events = [];
    let event = 'error';
    let done = false, err = null;
    let cmd, size, bufferLength = 0;
    let buffers = [], buffer;
    function byteRange() {
        if (cmd === 'peek') {
            return buffer_1.joinUint8Arrays(buffers, size)[0];
        }
        [buffer, buffers, bufferLength] = buffer_1.joinUint8Arrays(buffers, size);
        return buffer;
    }
    // Yield so the caller can inject the read command before we
    // add the listener for the source stream's 'readable' event.
    ({ cmd, size } = yield null);
    // ignore stdin if it's a TTY
    if (stream['isTTY']) {
        return yield new Uint8Array(0);
    }
    try {
        // initialize the stream event handlers
        events[0] = onEvent(stream, 'end');
        events[1] = onEvent(stream, 'error');
        do {
            events[2] = onEvent(stream, 'readable');
            // wait on the first message event from the stream
            [event, err] = await Promise.race(events.map((x) => x[2]));
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
                    ({ cmd, size } = yield byteRange());
                } while (size < bufferLength);
            }
        } while (!done);
    }
    finally {
        await cleanup(events, event === 'error' ? err : null);
    }
    function cleanup(events, err) {
        buffer = buffers = null;
        return new Promise(async (resolve, reject) => {
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
        });
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUssT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ3pEO0lBRUQsU0FBUyxPQUFPLENBQWdDLE1BQWUsRUFBRSxHQUFPO1FBQ3BFLE1BQU0sR0FBRyxPQUFPLEdBQVMsSUFBSSxDQUFDO1FBQzlCLE9BQU8sSUFBSSxPQUFPLENBQUksS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUM1QyxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksTUFBTSxFQUFFO2dCQUM1QixNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2FBQzFCO1lBQ0QsSUFBSTtnQkFDQSwrREFBK0Q7Z0JBQy9ELGtFQUFrRTtnQkFDbEUsa0VBQWtFO2dCQUNsRSxNQUFNLE9BQU8sR0FBSSxNQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQzNDLE9BQU8sSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDckMsR0FBRyxHQUFHLFNBQVMsQ0FBQzthQUNuQjtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUFFLEdBQUcsR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDO2FBQUU7b0JBQVM7Z0JBQ3BDLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7YUFDekM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7QUFDTCxDQUFDIiwiZmlsZSI6ImlvL2FkYXB0ZXJzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7XG4gICAgdG9VaW50OEFycmF5LFxuICAgIGpvaW5VaW50OEFycmF5cyxcbiAgICBBcnJheUJ1ZmZlclZpZXdJbnB1dCxcbiAgICB0b1VpbnQ4QXJyYXlJdGVyYXRvcixcbiAgICB0b1VpbnQ4QXJyYXlBc3luY0l0ZXJhdG9yXG59IGZyb20gJy4uL3V0aWwvYnVmZmVyJztcblxuaW1wb3J0IHsgUmVhZGFibGVET01TdHJlYW1PcHRpb25zIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBkZWZhdWx0IHtcbiAgICBmcm9tSXRlcmFibGU8VCBleHRlbmRzIEFycmF5QnVmZmVyVmlld0lucHV0Pihzb3VyY2U6IEl0ZXJhYmxlPFQ+IHwgVCk6IEl0ZXJhYmxlSXRlcmF0b3I8VWludDhBcnJheT4ge1xuICAgICAgICByZXR1cm4gcHVtcChmcm9tSXRlcmFibGU8VD4oc291cmNlKSk7XG4gICAgfSxcbiAgICBmcm9tQXN5bmNJdGVyYWJsZTxUIGV4dGVuZHMgQXJyYXlCdWZmZXJWaWV3SW5wdXQ+KHNvdXJjZTogQXN5bmNJdGVyYWJsZTxUPiB8IFByb21pc2VMaWtlPFQ+KTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcbiAgICAgICAgcmV0dXJuIHB1bXAoZnJvbUFzeW5jSXRlcmFibGU8VD4oc291cmNlKSk7XG4gICAgfSxcbiAgICBmcm9tRE9NU3RyZWFtPFQgZXh0ZW5kcyBBcnJheUJ1ZmZlclZpZXdJbnB1dD4oc291cmNlOiBSZWFkYWJsZVN0cmVhbTxUPik6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxVaW50OEFycmF5PiB7XG4gICAgICAgIHJldHVybiBwdW1wKGZyb21ET01TdHJlYW08VD4oc291cmNlKSk7XG4gICAgfSxcbiAgICBmcm9tTm9kZVN0cmVhbShzdHJlYW06IE5vZGVKUy5SZWFkYWJsZVN0cmVhbSk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxVaW50OEFycmF5PiB7XG4gICAgICAgIHJldHVybiBwdW1wKGZyb21Ob2RlU3RyZWFtKHN0cmVhbSkpO1xuICAgIH0sXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHRvRE9NU3RyZWFtPFQ+KHNvdXJjZTogSXRlcmFibGU8VD4gfCBBc3luY0l0ZXJhYmxlPFQ+LCBvcHRpb25zPzogUmVhZGFibGVET01TdHJlYW1PcHRpb25zKTogUmVhZGFibGVTdHJlYW08VD4ge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFwidG9ET01TdHJlYW1cIiBub3QgYXZhaWxhYmxlIGluIHRoaXMgZW52aXJvbm1lbnRgKTtcbiAgICB9LFxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICB0b05vZGVTdHJlYW08VD4oc291cmNlOiBJdGVyYWJsZTxUPiB8IEFzeW5jSXRlcmFibGU8VD4sIG9wdGlvbnM/OiBpbXBvcnQoJ3N0cmVhbScpLlJlYWRhYmxlT3B0aW9ucyk6IGltcG9ydCgnc3RyZWFtJykuUmVhZGFibGUge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFwidG9Ob2RlU3RyZWFtXCIgbm90IGF2YWlsYWJsZSBpbiB0aGlzIGVudmlyb25tZW50YCk7XG4gICAgfSxcbn07XG5cbi8qKiBAaWdub3JlICovXG5jb25zdCBwdW1wID0gPFQgZXh0ZW5kcyBJdGVyYXRvcjxhbnk+IHwgQXN5bmNJdGVyYXRvcjxhbnk+PihpdGVyYXRvcjogVCkgPT4geyBpdGVyYXRvci5uZXh0KCk7IHJldHVybiBpdGVyYXRvcjsgfTtcblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uKiBmcm9tSXRlcmFibGU8VCBleHRlbmRzIEFycmF5QnVmZmVyVmlld0lucHV0Pihzb3VyY2U6IEl0ZXJhYmxlPFQ+IHwgVCk6IEl0ZXJhYmxlSXRlcmF0b3I8VWludDhBcnJheT4ge1xuXG4gICAgbGV0IGRvbmU6IGJvb2xlYW4sIHRocmV3ID0gZmFsc2U7XG4gICAgbGV0IGJ1ZmZlcnM6IFVpbnQ4QXJyYXlbXSA9IFtdLCBidWZmZXI6IFVpbnQ4QXJyYXk7XG4gICAgbGV0IGNtZDogJ3BlZWsnIHwgJ3JlYWQnLCBzaXplOiBudW1iZXIsIGJ1ZmZlckxlbmd0aCA9IDA7XG5cbiAgICBmdW5jdGlvbiBieXRlUmFuZ2UoKSB7XG4gICAgICAgIGlmIChjbWQgPT09ICdwZWVrJykge1xuICAgICAgICAgICAgcmV0dXJuIGpvaW5VaW50OEFycmF5cyhidWZmZXJzLCBzaXplKVswXTtcbiAgICAgICAgfVxuICAgICAgICBbYnVmZmVyLCBidWZmZXJzLCBidWZmZXJMZW5ndGhdID0gam9pblVpbnQ4QXJyYXlzKGJ1ZmZlcnMsIHNpemUpO1xuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8vIFlpZWxkIHNvIHRoZSBjYWxsZXIgY2FuIGluamVjdCB0aGUgcmVhZCBjb21tYW5kIGJlZm9yZSBjcmVhdGluZyB0aGUgc291cmNlIEl0ZXJhdG9yXG4gICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCA8YW55PiBudWxsKTtcblxuICAgIC8vIGluaXRpYWxpemUgdGhlIGl0ZXJhdG9yXG4gICAgbGV0IGl0ID0gdG9VaW50OEFycmF5SXRlcmF0b3Ioc291cmNlKVtTeW1ib2wuaXRlcmF0b3JdKCk7XG5cbiAgICB0cnkge1xuICAgICAgICBkbyB7XG4gICAgICAgICAgICAvLyByZWFkIHRoZSBuZXh0IHZhbHVlXG4gICAgICAgICAgICAoeyBkb25lLCB2YWx1ZTogYnVmZmVyIH0gPSBpc05hTihzaXplIC0gYnVmZmVyTGVuZ3RoKSA/XG4gICAgICAgICAgICAgICAgaXQubmV4dCh1bmRlZmluZWQpIDogaXQubmV4dChzaXplIC0gYnVmZmVyTGVuZ3RoKSk7XG4gICAgICAgICAgICAvLyBpZiBjaHVuayBpcyBub3QgbnVsbCBvciBlbXB0eSwgcHVzaCBpdCBvbnRvIHRoZSBxdWV1ZVxuICAgICAgICAgICAgaWYgKCFkb25lICYmIGJ1ZmZlci5ieXRlTGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGJ1ZmZlcnMucHVzaChidWZmZXIpO1xuICAgICAgICAgICAgICAgIGJ1ZmZlckxlbmd0aCArPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgZW5vdWdoIGJ5dGVzIGluIG91ciBidWZmZXIsIHlpZWxkIGNodW5rcyB1bnRpbCB3ZSBkb24ndFxuICAgICAgICAgICAgaWYgKGRvbmUgfHwgc2l6ZSA8PSBidWZmZXJMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgICh7IGNtZCwgc2l6ZSB9ID0geWllbGQgYnl0ZVJhbmdlKCkpO1xuICAgICAgICAgICAgICAgIH0gd2hpbGUgKHNpemUgPCBidWZmZXJMZW5ndGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IHdoaWxlICghZG9uZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAodGhyZXcgPSB0cnVlKSAmJiAodHlwZW9mIGl0LnRocm93ID09PSAnZnVuY3Rpb24nKSAmJiAoaXQudGhyb3coZSkpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICAgICh0aHJldyA9PT0gZmFsc2UpICYmICh0eXBlb2YgaXQucmV0dXJuID09PSAnZnVuY3Rpb24nKSAmJiAoaXQucmV0dXJuKCkpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmFzeW5jIGZ1bmN0aW9uKiBmcm9tQXN5bmNJdGVyYWJsZTxUIGV4dGVuZHMgQXJyYXlCdWZmZXJWaWV3SW5wdXQ+KHNvdXJjZTogQXN5bmNJdGVyYWJsZTxUPiB8IFByb21pc2VMaWtlPFQ+KTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcblxuICAgIGxldCBkb25lOiBib29sZWFuLCB0aHJldyA9IGZhbHNlO1xuICAgIGxldCBidWZmZXJzOiBVaW50OEFycmF5W10gPSBbXSwgYnVmZmVyOiBVaW50OEFycmF5O1xuICAgIGxldCBjbWQ6ICdwZWVrJyB8ICdyZWFkJywgc2l6ZTogbnVtYmVyLCBidWZmZXJMZW5ndGggPSAwO1xuXG4gICAgZnVuY3Rpb24gYnl0ZVJhbmdlKCkge1xuICAgICAgICBpZiAoY21kID09PSAncGVlaycpIHtcbiAgICAgICAgICAgIHJldHVybiBqb2luVWludDhBcnJheXMoYnVmZmVycywgc2l6ZSlbMF07XG4gICAgICAgIH1cbiAgICAgICAgW2J1ZmZlciwgYnVmZmVycywgYnVmZmVyTGVuZ3RoXSA9IGpvaW5VaW50OEFycmF5cyhidWZmZXJzLCBzaXplKTtcbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICAvLyBZaWVsZCBzbyB0aGUgY2FsbGVyIGNhbiBpbmplY3QgdGhlIHJlYWQgY29tbWFuZCBiZWZvcmUgY3JlYXRpbmcgdGhlIHNvdXJjZSBBc3luY0l0ZXJhdG9yXG4gICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCA8YW55PiBudWxsKTtcblxuICAgIC8vIGluaXRpYWxpemUgdGhlIGl0ZXJhdG9yXG4gICAgbGV0IGl0ID0gdG9VaW50OEFycmF5QXN5bmNJdGVyYXRvcihzb3VyY2UpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpO1xuXG4gICAgdHJ5IHtcbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgLy8gcmVhZCB0aGUgbmV4dCB2YWx1ZVxuICAgICAgICAgICAgKHsgZG9uZSwgdmFsdWU6IGJ1ZmZlciB9ID0gaXNOYU4oc2l6ZSAtIGJ1ZmZlckxlbmd0aClcbiAgICAgICAgICAgICAgICA/IGF3YWl0IGl0Lm5leHQodW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIDogYXdhaXQgaXQubmV4dChzaXplIC0gYnVmZmVyTGVuZ3RoKSk7XG4gICAgICAgICAgICAvLyBpZiBjaHVuayBpcyBub3QgbnVsbCBvciBlbXB0eSwgcHVzaCBpdCBvbnRvIHRoZSBxdWV1ZVxuICAgICAgICAgICAgaWYgKCFkb25lICYmIGJ1ZmZlci5ieXRlTGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGJ1ZmZlcnMucHVzaChidWZmZXIpO1xuICAgICAgICAgICAgICAgIGJ1ZmZlckxlbmd0aCArPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgZW5vdWdoIGJ5dGVzIGluIG91ciBidWZmZXIsIHlpZWxkIGNodW5rcyB1bnRpbCB3ZSBkb24ndFxuICAgICAgICAgICAgaWYgKGRvbmUgfHwgc2l6ZSA8PSBidWZmZXJMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgICh7IGNtZCwgc2l6ZSB9ID0geWllbGQgYnl0ZVJhbmdlKCkpO1xuICAgICAgICAgICAgICAgIH0gd2hpbGUgKHNpemUgPCBidWZmZXJMZW5ndGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IHdoaWxlICghZG9uZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAodGhyZXcgPSB0cnVlKSAmJiAodHlwZW9mIGl0LnRocm93ID09PSAnZnVuY3Rpb24nKSAmJiAoYXdhaXQgaXQudGhyb3coZSkpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICAgICh0aHJldyA9PT0gZmFsc2UpICYmICh0eXBlb2YgaXQucmV0dXJuID09PSAnZnVuY3Rpb24nKSAmJiAoYXdhaXQgaXQucmV0dXJuKCkpO1xuICAgIH1cbn1cblxuLy8gQWxsIHRoaXMgbWFudWFsIFVpbnQ4QXJyYXkgY2h1bmsgbWFuYWdlbWVudCBjYW4gYmUgYXZvaWRlZCBpZi93aGVuIGVuZ2luZXNcbi8vIGFkZCBzdXBwb3J0IGZvciBBcnJheUJ1ZmZlci50cmFuc2ZlcigpIG9yIEFycmF5QnVmZmVyLnByb3RvdHlwZS5yZWFsbG9jKCk6XG4vLyBodHRwczovL2dpdGh1Yi5jb20vZG9tZW5pYy9wcm9wb3NhbC1hcnJheWJ1ZmZlci10cmFuc2ZlclxuLyoqIEBpZ25vcmUgKi9cbmFzeW5jIGZ1bmN0aW9uKiBmcm9tRE9NU3RyZWFtPFQgZXh0ZW5kcyBBcnJheUJ1ZmZlclZpZXdJbnB1dD4oc291cmNlOiBSZWFkYWJsZVN0cmVhbTxUPik6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxVaW50OEFycmF5PiB7XG5cbiAgICBsZXQgZG9uZSA9IGZhbHNlLCB0aHJldyA9IGZhbHNlO1xuICAgIGxldCBidWZmZXJzOiBVaW50OEFycmF5W10gPSBbXSwgYnVmZmVyOiBVaW50OEFycmF5O1xuICAgIGxldCBjbWQ6ICdwZWVrJyB8ICdyZWFkJywgc2l6ZTogbnVtYmVyLCBidWZmZXJMZW5ndGggPSAwO1xuXG4gICAgZnVuY3Rpb24gYnl0ZVJhbmdlKCkge1xuICAgICAgICBpZiAoY21kID09PSAncGVlaycpIHtcbiAgICAgICAgICAgIHJldHVybiBqb2luVWludDhBcnJheXMoYnVmZmVycywgc2l6ZSlbMF07XG4gICAgICAgIH1cbiAgICAgICAgW2J1ZmZlciwgYnVmZmVycywgYnVmZmVyTGVuZ3RoXSA9IGpvaW5VaW50OEFycmF5cyhidWZmZXJzLCBzaXplKTtcbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICAvLyBZaWVsZCBzbyB0aGUgY2FsbGVyIGNhbiBpbmplY3QgdGhlIHJlYWQgY29tbWFuZCBiZWZvcmUgd2UgZXN0YWJsaXNoIHRoZSBSZWFkYWJsZVN0cmVhbSBsb2NrXG4gICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCA8YW55PiBudWxsKTtcblxuICAgIC8vIGluaXRpYWxpemUgdGhlIHJlYWRlciBhbmQgbG9jayB0aGUgc3RyZWFtXG4gICAgbGV0IGl0ID0gbmV3IEFkYXB0aXZlQnl0ZVJlYWRlcihzb3VyY2UpO1xuXG4gICAgdHJ5IHtcbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgLy8gcmVhZCB0aGUgbmV4dCB2YWx1ZVxuICAgICAgICAgICAgKHsgZG9uZSwgdmFsdWU6IGJ1ZmZlciB9ID0gaXNOYU4oc2l6ZSAtIGJ1ZmZlckxlbmd0aClcbiAgICAgICAgICAgICAgICA/IGF3YWl0IGl0WydyZWFkJ10odW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIDogYXdhaXQgaXRbJ3JlYWQnXShzaXplIC0gYnVmZmVyTGVuZ3RoKSk7XG4gICAgICAgICAgICAvLyBpZiBjaHVuayBpcyBub3QgbnVsbCBvciBlbXB0eSwgcHVzaCBpdCBvbnRvIHRoZSBxdWV1ZVxuICAgICAgICAgICAgaWYgKCFkb25lICYmIGJ1ZmZlci5ieXRlTGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGJ1ZmZlcnMucHVzaCh0b1VpbnQ4QXJyYXkoYnVmZmVyKSk7XG4gICAgICAgICAgICAgICAgYnVmZmVyTGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBlbm91Z2ggYnl0ZXMgaW4gb3VyIGJ1ZmZlciwgeWllbGQgY2h1bmtzIHVudGlsIHdlIGRvbid0XG4gICAgICAgICAgICBpZiAoZG9uZSB8fCBzaXplIDw9IGJ1ZmZlckxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCBieXRlUmFuZ2UoKSk7XG4gICAgICAgICAgICAgICAgfSB3aGlsZSAoc2l6ZSA8IGJ1ZmZlckxlbmd0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gd2hpbGUgKCFkb25lKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICh0aHJldyA9IHRydWUpICYmIChhd2FpdCBpdFsnY2FuY2VsJ10oZSkpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICAgICh0aHJldyA9PT0gZmFsc2UpID8gKGF3YWl0IGl0WydjYW5jZWwnXSgpKVxuICAgICAgICAgICAgOiBzb3VyY2VbJ2xvY2tlZCddICYmIGl0LnJlbGVhc2VMb2NrKCk7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuY2xhc3MgQWRhcHRpdmVCeXRlUmVhZGVyPFQgZXh0ZW5kcyBBcnJheUJ1ZmZlclZpZXdJbnB1dD4ge1xuXG4gICAgcHJpdmF0ZSBzdXBwb3J0c0JZT0I6IGJvb2xlYW47XG4gICAgcHJpdmF0ZSBieW9iUmVhZGVyOiBSZWFkYWJsZVN0cmVhbUJZT0JSZWFkZXIgfCBudWxsID0gbnVsbDtcbiAgICBwcml2YXRlIGRlZmF1bHRSZWFkZXI6IFJlYWRhYmxlU3RyZWFtRGVmYXVsdFJlYWRlcjxUPiB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgcmVhZGVyOiBSZWFkYWJsZVN0cmVhbUJZT0JSZWFkZXIgfCBSZWFkYWJsZVN0cmVhbURlZmF1bHRSZWFkZXI8VD4gfCBudWxsO1xuXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBzb3VyY2U6IFJlYWRhYmxlU3RyZWFtPFQ+KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLnN1cHBvcnRzQllPQiA9ICEhKHRoaXMucmVhZGVyID0gdGhpcy5nZXRCWU9CUmVhZGVyKCkpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aGlzLnN1cHBvcnRzQllPQiA9ICEhISh0aGlzLnJlYWRlciA9IHRoaXMuZ2V0RGVmYXVsdFJlYWRlcigpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdldCBjbG9zZWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlYWRlciA/IHRoaXMucmVhZGVyWydjbG9zZWQnXS5jYXRjaCgoKSA9PiB7fSkgOiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG5cbiAgICByZWxlYXNlTG9jaygpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMucmVhZGVyKSB7XG4gICAgICAgICAgICB0aGlzLnJlYWRlci5yZWxlYXNlTG9jaygpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVhZGVyID0gdGhpcy5ieW9iUmVhZGVyID0gdGhpcy5kZWZhdWx0UmVhZGVyID0gbnVsbDtcbiAgICB9XG5cbiAgICBhc3luYyBjYW5jZWwocmVhc29uPzogYW55KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgcmVhZGVyLCBzb3VyY2UgfSA9IHRoaXM7XG4gICAgICAgIHJlYWRlciAmJiAoYXdhaXQgcmVhZGVyWydjYW5jZWwnXShyZWFzb24pKTtcbiAgICAgICAgc291cmNlICYmIChzb3VyY2VbJ2xvY2tlZCddICYmIHRoaXMucmVsZWFzZUxvY2soKSk7XG4gICAgfVxuXG4gICAgYXN5bmMgcmVhZChzaXplPzogbnVtYmVyKTogUHJvbWlzZTxSZWFkYWJsZVN0cmVhbVJlYWRSZXN1bHQ8VWludDhBcnJheT4+IHtcbiAgICAgICAgaWYgKHNpemUgPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiB7IGRvbmU6IHRoaXMucmVhZGVyID09IG51bGwsIHZhbHVlOiBuZXcgVWludDhBcnJheSgwKSB9O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9ICF0aGlzLnN1cHBvcnRzQllPQiB8fCB0eXBlb2Ygc2l6ZSAhPT0gJ251bWJlcidcbiAgICAgICAgICAgID8gYXdhaXQgdGhpcy5nZXREZWZhdWx0UmVhZGVyKCkucmVhZCgpXG4gICAgICAgICAgICA6IGF3YWl0IHRoaXMucmVhZEZyb21CWU9CUmVhZGVyKHNpemUpO1xuICAgICAgICAhcmVzdWx0LmRvbmUgJiYgKHJlc3VsdC52YWx1ZSA9IHRvVWludDhBcnJheShyZXN1bHQgYXMgUmVhZGFibGVTdHJlYW1SZWFkUmVzdWx0PFVpbnQ4QXJyYXk+KSk7XG4gICAgICAgIHJldHVybiByZXN1bHQgYXMgUmVhZGFibGVTdHJlYW1SZWFkUmVzdWx0PFVpbnQ4QXJyYXk+O1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0RGVmYXVsdFJlYWRlcigpIHtcbiAgICAgICAgaWYgKHRoaXMuYnlvYlJlYWRlcikgeyB0aGlzLnJlbGVhc2VMb2NrKCk7IH1cbiAgICAgICAgaWYgKCF0aGlzLmRlZmF1bHRSZWFkZXIpIHtcbiAgICAgICAgICAgIHRoaXMuZGVmYXVsdFJlYWRlciA9IHRoaXMuc291cmNlWydnZXRSZWFkZXInXSgpO1xuICAgICAgICAgICAgLy8gV2UgaGF2ZSB0byBjYXRjaCBhbmQgc3dhbGxvdyBlcnJvcnMgaGVyZSB0byBhdm9pZCB1bmNhdWdodCBwcm9taXNlIHJlamVjdGlvbiBleGNlcHRpb25zXG4gICAgICAgICAgICAvLyB0aGF0IHNlZW0gdG8gYmUgcmFpc2VkIHdoZW4gd2UgY2FsbCBgcmVsZWFzZUxvY2soKWAgb24gdGhpcyByZWFkZXIuIEknbSBzdGlsbCBteXN0aWZpZWRcbiAgICAgICAgICAgIC8vIGFib3V0IHdoeSB0aGVzZSBlcnJvcnMgYXJlIHJhaXNlZCwgYnV0IEknbSBzdXJlIHRoZXJlJ3Mgc29tZSBpbXBvcnRhbnQgc3BlYyByZWFzb24gdGhhdFxuICAgICAgICAgICAgLy8gSSBoYXZlbid0IGNvbnNpZGVyZWQuIEkgaGF0ZSB0byBlbXBsb3kgc3VjaCBhbiBhbnRpLXBhdHRlcm4gaGVyZSwgYnV0IGl0IHNlZW1zIGxpa2UgdGhlXG4gICAgICAgICAgICAvLyBvbmx5IHNvbHV0aW9uIGluIHRoaXMgY2FzZSA6L1xuICAgICAgICAgICAgdGhpcy5kZWZhdWx0UmVhZGVyWydjbG9zZWQnXS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICh0aGlzLnJlYWRlciA9IHRoaXMuZGVmYXVsdFJlYWRlcik7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRCWU9CUmVhZGVyKCkge1xuICAgICAgICBpZiAodGhpcy5kZWZhdWx0UmVhZGVyKSB7IHRoaXMucmVsZWFzZUxvY2soKTsgfVxuICAgICAgICBpZiAoIXRoaXMuYnlvYlJlYWRlcikge1xuICAgICAgICAgICAgdGhpcy5ieW9iUmVhZGVyID0gdGhpcy5zb3VyY2VbJ2dldFJlYWRlciddKHsgbW9kZTogJ2J5b2InIH0pO1xuICAgICAgICAgICAgLy8gV2UgaGF2ZSB0byBjYXRjaCBhbmQgc3dhbGxvdyBlcnJvcnMgaGVyZSB0byBhdm9pZCB1bmNhdWdodCBwcm9taXNlIHJlamVjdGlvbiBleGNlcHRpb25zXG4gICAgICAgICAgICAvLyB0aGF0IHNlZW0gdG8gYmUgcmFpc2VkIHdoZW4gd2UgY2FsbCBgcmVsZWFzZUxvY2soKWAgb24gdGhpcyByZWFkZXIuIEknbSBzdGlsbCBteXN0aWZpZWRcbiAgICAgICAgICAgIC8vIGFib3V0IHdoeSB0aGVzZSBlcnJvcnMgYXJlIHJhaXNlZCwgYnV0IEknbSBzdXJlIHRoZXJlJ3Mgc29tZSBpbXBvcnRhbnQgc3BlYyByZWFzb24gdGhhdFxuICAgICAgICAgICAgLy8gSSBoYXZlbid0IGNvbnNpZGVyZWQuIEkgaGF0ZSB0byBlbXBsb3kgc3VjaCBhbiBhbnRpLXBhdHRlcm4gaGVyZSwgYnV0IGl0IHNlZW1zIGxpa2UgdGhlXG4gICAgICAgICAgICAvLyBvbmx5IHNvbHV0aW9uIGluIHRoaXMgY2FzZSA6L1xuICAgICAgICAgICAgdGhpcy5ieW9iUmVhZGVyWydjbG9zZWQnXS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICh0aGlzLnJlYWRlciA9IHRoaXMuYnlvYlJlYWRlcik7XG4gICAgfVxuXG4gICAgLy8gVGhpcyBzdHJhdGVneSBwbHVja2VkIGZyb20gdGhlIGV4YW1wbGUgaW4gdGhlIHN0cmVhbXMgc3BlYzpcbiAgICAvLyBodHRwczovL3N0cmVhbXMuc3BlYy53aGF0d2cub3JnLyNleGFtcGxlLW1hbnVhbC1yZWFkLWJ5dGVzXG4gICAgcHJpdmF0ZSBhc3luYyByZWFkRnJvbUJZT0JSZWFkZXIoc2l6ZTogbnVtYmVyKSB7XG4gICAgICAgIHJldHVybiBhd2FpdCByZWFkSW50byh0aGlzLmdldEJZT0JSZWFkZXIoKSwgbmV3IEFycmF5QnVmZmVyKHNpemUpLCAwLCBzaXplKTtcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5hc3luYyBmdW5jdGlvbiByZWFkSW50byhyZWFkZXI6IFJlYWRhYmxlU3RyZWFtQllPQlJlYWRlciwgYnVmZmVyOiBBcnJheUJ1ZmZlckxpa2UsIG9mZnNldDogbnVtYmVyLCBzaXplOiBudW1iZXIpOiBQcm9taXNlPFJlYWRhYmxlU3RyZWFtUmVhZFJlc3VsdDxVaW50OEFycmF5Pj4ge1xuICAgIGlmIChvZmZzZXQgPj0gc2l6ZSkge1xuICAgICAgICByZXR1cm4geyBkb25lOiBmYWxzZSwgdmFsdWU6IG5ldyBVaW50OEFycmF5KGJ1ZmZlciwgMCwgc2l6ZSkgfTtcbiAgICB9XG4gICAgY29uc3QgeyBkb25lLCB2YWx1ZSB9ID0gYXdhaXQgcmVhZGVyLnJlYWQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyLCBvZmZzZXQsIHNpemUgLSBvZmZzZXQpKTtcbiAgICBpZiAoKChvZmZzZXQgKz0gdmFsdWUuYnl0ZUxlbmd0aCkgPCBzaXplKSAmJiAhZG9uZSkge1xuICAgICAgICByZXR1cm4gYXdhaXQgcmVhZEludG8ocmVhZGVyLCB2YWx1ZS5idWZmZXIsIG9mZnNldCwgc2l6ZSk7XG4gICAgfVxuICAgIHJldHVybiB7IGRvbmUsIHZhbHVlOiBuZXcgVWludDhBcnJheSh2YWx1ZS5idWZmZXIsIDAsIG9mZnNldCkgfTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbnR5cGUgRXZlbnROYW1lID0gJ2VuZCcgfCAnZXJyb3InIHwgJ3JlYWRhYmxlJztcbi8qKiBAaWdub3JlICovXG50eXBlIEV2ZW50ID0gW0V2ZW50TmFtZSwgKF86IGFueSkgPT4gdm9pZCwgUHJvbWlzZTxbRXZlbnROYW1lLCBFcnJvciB8IG51bGxdPl07XG4vKiogQGlnbm9yZSAqL1xuY29uc3Qgb25FdmVudCA9IDxUIGV4dGVuZHMgc3RyaW5nPihzdHJlYW06IE5vZGVKUy5SZWFkYWJsZVN0cmVhbSwgZXZlbnQ6IFQpID0+IHtcbiAgICBsZXQgaGFuZGxlciA9IChfOiBhbnkpID0+IHJlc29sdmUoW2V2ZW50LCBfXSk7XG4gICAgbGV0IHJlc29sdmU6ICh2YWx1ZT86IFtULCBhbnldIHwgUHJvbWlzZUxpa2U8W1QsIGFueV0+KSA9PiB2b2lkO1xuICAgIHJldHVybiBbZXZlbnQsIGhhbmRsZXIsIG5ldyBQcm9taXNlPFtULCBhbnldPihcbiAgICAgICAgKHIpID0+IChyZXNvbHZlID0gcikgJiYgc3RyZWFtWydvbmNlJ10oZXZlbnQsIGhhbmRsZXIpXG4gICAgKV0gYXMgRXZlbnQ7XG59O1xuXG4vKiogQGlnbm9yZSAqL1xuYXN5bmMgZnVuY3Rpb24qIGZyb21Ob2RlU3RyZWFtKHN0cmVhbTogTm9kZUpTLlJlYWRhYmxlU3RyZWFtKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcblxuICAgIGxldCBldmVudHM6IEV2ZW50W10gPSBbXTtcbiAgICBsZXQgZXZlbnQ6IEV2ZW50TmFtZSA9ICdlcnJvcic7XG4gICAgbGV0IGRvbmUgPSBmYWxzZSwgZXJyOiBFcnJvciB8IG51bGwgPSBudWxsO1xuICAgIGxldCBjbWQ6ICdwZWVrJyB8ICdyZWFkJywgc2l6ZTogbnVtYmVyLCBidWZmZXJMZW5ndGggPSAwO1xuICAgIGxldCBidWZmZXJzOiBVaW50OEFycmF5W10gPSBbXSwgYnVmZmVyOiBVaW50OEFycmF5IHwgQnVmZmVyIHwgc3RyaW5nO1xuXG4gICAgZnVuY3Rpb24gYnl0ZVJhbmdlKCkge1xuICAgICAgICBpZiAoY21kID09PSAncGVlaycpIHtcbiAgICAgICAgICAgIHJldHVybiBqb2luVWludDhBcnJheXMoYnVmZmVycywgc2l6ZSlbMF07XG4gICAgICAgIH1cbiAgICAgICAgW2J1ZmZlciwgYnVmZmVycywgYnVmZmVyTGVuZ3RoXSA9IGpvaW5VaW50OEFycmF5cyhidWZmZXJzLCBzaXplKTtcbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICAvLyBZaWVsZCBzbyB0aGUgY2FsbGVyIGNhbiBpbmplY3QgdGhlIHJlYWQgY29tbWFuZCBiZWZvcmUgd2VcbiAgICAvLyBhZGQgdGhlIGxpc3RlbmVyIGZvciB0aGUgc291cmNlIHN0cmVhbSdzICdyZWFkYWJsZScgZXZlbnQuXG4gICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCA8YW55PiBudWxsKTtcblxuICAgIC8vIGlnbm9yZSBzdGRpbiBpZiBpdCdzIGEgVFRZXG4gICAgaWYgKChzdHJlYW0gYXMgYW55KVsnaXNUVFknXSkgeyByZXR1cm4geWllbGQgbmV3IFVpbnQ4QXJyYXkoMCk7IH1cblxuICAgIHRyeSB7XG4gICAgICAgIC8vIGluaXRpYWxpemUgdGhlIHN0cmVhbSBldmVudCBoYW5kbGVyc1xuICAgICAgICBldmVudHNbMF0gPSBvbkV2ZW50KHN0cmVhbSwgJ2VuZCcpO1xuICAgICAgICBldmVudHNbMV0gPSBvbkV2ZW50KHN0cmVhbSwgJ2Vycm9yJyk7XG5cbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgZXZlbnRzWzJdID0gb25FdmVudChzdHJlYW0sICdyZWFkYWJsZScpO1xuXG4gICAgICAgICAgICAvLyB3YWl0IG9uIHRoZSBmaXJzdCBtZXNzYWdlIGV2ZW50IGZyb20gdGhlIHN0cmVhbVxuICAgICAgICAgICAgW2V2ZW50LCBlcnJdID0gYXdhaXQgUHJvbWlzZS5yYWNlKGV2ZW50cy5tYXAoKHgpID0+IHhbMl0pKTtcblxuICAgICAgICAgICAgLy8gaWYgdGhlIHN0cmVhbSBlbWl0dGVkIGFuIEVycm9yLCByZXRocm93IGl0XG4gICAgICAgICAgICBpZiAoZXZlbnQgPT09ICdlcnJvcicpIHsgYnJlYWs7IH1cbiAgICAgICAgICAgIGlmICghKGRvbmUgPSBldmVudCA9PT0gJ2VuZCcpKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIHNpemUgaXMgTmFOLCByZXF1ZXN0IHRvIHJlYWQgZXZlcnl0aGluZyBpbiB0aGUgc3RyZWFtJ3MgaW50ZXJuYWwgYnVmZmVyXG4gICAgICAgICAgICAgICAgaWYgKCFpc0Zpbml0ZShzaXplIC0gYnVmZmVyTGVuZ3RoKSkge1xuICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSB0b1VpbnQ4QXJyYXkoc3RyZWFtWydyZWFkJ10odW5kZWZpbmVkKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gdG9VaW50OEFycmF5KHN0cmVhbVsncmVhZCddKHNpemUgLSBidWZmZXJMZW5ndGgpKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIGJ5dGVMZW5ndGggaXMgMCwgdGhlbiB0aGUgcmVxdWVzdGVkIGFtb3VudCBpcyBtb3JlIHRoYW4gdGhlIHN0cmVhbSBoYXNcbiAgICAgICAgICAgICAgICAgICAgLy8gaW4gaXRzIGludGVybmFsIGJ1ZmZlci4gSW4gdGhpcyBjYXNlIHRoZSBzdHJlYW0gbmVlZHMgYSBcImtpY2tcIiB0byB0ZWxsIGl0IHRvXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnRpbnVlIGVtaXR0aW5nIHJlYWRhYmxlIGV2ZW50cywgc28gcmVxdWVzdCB0byByZWFkIGV2ZXJ5dGhpbmcgdGhlIHN0cmVhbVxuICAgICAgICAgICAgICAgICAgICAvLyBoYXMgaW4gaXRzIGludGVybmFsIGJ1ZmZlciByaWdodCBub3cuXG4gICAgICAgICAgICAgICAgICAgIGlmIChidWZmZXIuYnl0ZUxlbmd0aCA8IChzaXplIC0gYnVmZmVyTGVuZ3RoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gdG9VaW50OEFycmF5KHN0cmVhbVsncmVhZCddKHVuZGVmaW5lZCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGlmIGNodW5rIGlzIG5vdCBudWxsIG9yIGVtcHR5LCBwdXNoIGl0IG9udG8gdGhlIHF1ZXVlXG4gICAgICAgICAgICAgICAgaWYgKGJ1ZmZlci5ieXRlTGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBidWZmZXJzLnB1c2goYnVmZmVyKTtcbiAgICAgICAgICAgICAgICAgICAgYnVmZmVyTGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgZW5vdWdoIGJ5dGVzIGluIG91ciBidWZmZXIsIHlpZWxkIGNodW5rcyB1bnRpbCB3ZSBkb24ndFxuICAgICAgICAgICAgaWYgKGRvbmUgfHwgc2l6ZSA8PSBidWZmZXJMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgICh7IGNtZCwgc2l6ZSB9ID0geWllbGQgYnl0ZVJhbmdlKCkpO1xuICAgICAgICAgICAgICAgIH0gd2hpbGUgKHNpemUgPCBidWZmZXJMZW5ndGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IHdoaWxlICghZG9uZSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgYXdhaXQgY2xlYW51cChldmVudHMsIGV2ZW50ID09PSAnZXJyb3InID8gZXJyIDogbnVsbCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xlYW51cDxUIGV4dGVuZHMgRXJyb3IgfCBudWxsIHwgdm9pZD4oZXZlbnRzOiBFdmVudFtdLCBlcnI/OiBUKSB7XG4gICAgICAgIGJ1ZmZlciA9IGJ1ZmZlcnMgPSA8YW55PiBudWxsO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8VD4oYXN5bmMgKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgZm9yIChjb25zdCBbZXZ0LCBmbl0gb2YgZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgc3RyZWFtWydvZmYnXShldnQsIGZuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gU29tZSBzdHJlYW0gaW1wbGVtZW50YXRpb25zIGRvbid0IGNhbGwgdGhlIGRlc3Ryb3kgY2FsbGJhY2ssXG4gICAgICAgICAgICAgICAgLy8gYmVjYXVzZSBpdCdzIHJlYWxseSBhIG5vZGUtaW50ZXJuYWwgQVBJLiBKdXN0IGNhbGxpbmcgYGRlc3Ryb3lgXG4gICAgICAgICAgICAgICAgLy8gaGVyZSBzaG91bGQgYmUgZW5vdWdoIHRvIGNvbmZvcm0gdG8gdGhlIFJlYWRhYmxlU3RyZWFtIGNvbnRyYWN0XG4gICAgICAgICAgICAgICAgY29uc3QgZGVzdHJveSA9IChzdHJlYW0gYXMgYW55KVsnZGVzdHJveSddO1xuICAgICAgICAgICAgICAgIGRlc3Ryb3kgJiYgZGVzdHJveS5jYWxsKHN0cmVhbSwgZXJyKTtcbiAgICAgICAgICAgICAgICBlcnIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7IGVyciA9IGUgfHwgZXJyOyB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIGVyciAhPSBudWxsID8gcmVqZWN0KGVycikgOiByZXNvbHZlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbiJdfQ==

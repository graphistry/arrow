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
import { toUint8Array, joinUint8Arrays, toUint8ArrayIterator, toUint8ArrayAsyncIterator } from '../util/buffer';
/** @ignore */
export default {
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
            return joinUint8Arrays(buffers.slice(), size)[0];
        }
        [buffer, buffers] = joinUint8Arrays(buffers, size);
        bufferLength -= buffer.byteLength;
        return buffer;
    }
    // Yield so the caller can inject the read command before creating the source Iterator
    ({ cmd, size } = yield null);
    // initialize the iterator
    let it = toUint8ArrayIterator(source)[Symbol.iterator]();
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
            return joinUint8Arrays(buffers.slice(), size)[0];
        }
        [buffer, buffers] = joinUint8Arrays(buffers, size);
        bufferLength -= buffer.byteLength;
        return buffer;
    }
    // Yield so the caller can inject the read command before creating the source AsyncIterator
    ({ cmd, size } = yield null);
    // initialize the iterator
    let it = toUint8ArrayAsyncIterator(source)[Symbol.asyncIterator]();
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
            return joinUint8Arrays(buffers.slice(), size)[0];
        }
        [buffer, buffers] = joinUint8Arrays(buffers, size);
        bufferLength -= buffer.byteLength;
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
                buffers.push(toUint8Array(buffer));
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
        !result.done && (result.value = toUint8Array(result));
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
            return joinUint8Arrays(buffers.slice(), size)[0];
        }
        [buffer, buffers] = joinUint8Arrays(buffers, size);
        bufferLength -= buffer.byteLength;
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
                    buffer = toUint8Array(stream['read'](undefined));
                }
                else {
                    buffer = toUint8Array(stream['read'](size - bufferLength));
                    // If the byteLength is 0, then the requested amount is more than the stream has
                    // in its internal buffer. In this case the stream needs a "kick" to tell it to
                    // continue emitting readable events, so request to read everything the stream
                    // has in its internal buffer right now.
                    if (buffer.byteLength < (size - bufferLength)) {
                        buffer = toUint8Array(stream['read'](undefined));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUM7SUFDUCxDQUFDO0FBQ0wsQ0FBQyIsImZpbGUiOiJpby9hZGFwdGVycy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQge1xuICAgIHRvVWludDhBcnJheSxcbiAgICBqb2luVWludDhBcnJheXMsXG4gICAgQXJyYXlCdWZmZXJWaWV3SW5wdXQsXG4gICAgdG9VaW50OEFycmF5SXRlcmF0b3IsXG4gICAgdG9VaW50OEFycmF5QXN5bmNJdGVyYXRvclxufSBmcm9tICcuLi91dGlsL2J1ZmZlcic7XG5cbmltcG9ydCB7IFJlYWRhYmxlRE9NU3RyZWFtT3B0aW9ucyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgZGVmYXVsdCB7XG4gICAgZnJvbUl0ZXJhYmxlPFQgZXh0ZW5kcyBBcnJheUJ1ZmZlclZpZXdJbnB1dD4oc291cmNlOiBJdGVyYWJsZTxUPiB8IFQpOiBJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcbiAgICAgICAgcmV0dXJuIHB1bXAoZnJvbUl0ZXJhYmxlPFQ+KHNvdXJjZSkpO1xuICAgIH0sXG4gICAgZnJvbUFzeW5jSXRlcmFibGU8VCBleHRlbmRzIEFycmF5QnVmZmVyVmlld0lucHV0Pihzb3VyY2U6IEFzeW5jSXRlcmFibGU8VD4gfCBQcm9taXNlTGlrZTxUPik6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxVaW50OEFycmF5PiB7XG4gICAgICAgIHJldHVybiBwdW1wKGZyb21Bc3luY0l0ZXJhYmxlPFQ+KHNvdXJjZSkpO1xuICAgIH0sXG4gICAgZnJvbURPTVN0cmVhbTxUIGV4dGVuZHMgQXJyYXlCdWZmZXJWaWV3SW5wdXQ+KHNvdXJjZTogUmVhZGFibGVTdHJlYW08VD4pOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8VWludDhBcnJheT4ge1xuICAgICAgICByZXR1cm4gcHVtcChmcm9tRE9NU3RyZWFtPFQ+KHNvdXJjZSkpO1xuICAgIH0sXG4gICAgZnJvbU5vZGVTdHJlYW0oc3RyZWFtOiBOb2RlSlMuUmVhZGFibGVTdHJlYW0pOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8VWludDhBcnJheT4ge1xuICAgICAgICByZXR1cm4gcHVtcChmcm9tTm9kZVN0cmVhbShzdHJlYW0pKTtcbiAgICB9LFxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICB0b0RPTVN0cmVhbTxUPihzb3VyY2U6IEl0ZXJhYmxlPFQ+IHwgQXN5bmNJdGVyYWJsZTxUPiwgb3B0aW9ucz86IFJlYWRhYmxlRE9NU3RyZWFtT3B0aW9ucyk6IFJlYWRhYmxlU3RyZWFtPFQ+IHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBcInRvRE9NU3RyZWFtXCIgbm90IGF2YWlsYWJsZSBpbiB0aGlzIGVudmlyb25tZW50YCk7XG4gICAgfSxcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgdG9Ob2RlU3RyZWFtPFQ+KHNvdXJjZTogSXRlcmFibGU8VD4gfCBBc3luY0l0ZXJhYmxlPFQ+LCBvcHRpb25zPzogaW1wb3J0KCdzdHJlYW0nKS5SZWFkYWJsZU9wdGlvbnMpOiBpbXBvcnQoJ3N0cmVhbScpLlJlYWRhYmxlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBcInRvTm9kZVN0cmVhbVwiIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBlbnZpcm9ubWVudGApO1xuICAgIH0sXG59O1xuXG4vKiogQGlnbm9yZSAqL1xuY29uc3QgcHVtcCA9IDxUIGV4dGVuZHMgSXRlcmF0b3I8YW55PiB8IEFzeW5jSXRlcmF0b3I8YW55Pj4oaXRlcmF0b3I6IFQpID0+IHsgaXRlcmF0b3IubmV4dCgpOyByZXR1cm4gaXRlcmF0b3I7IH07XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiogZnJvbUl0ZXJhYmxlPFQgZXh0ZW5kcyBBcnJheUJ1ZmZlclZpZXdJbnB1dD4oc291cmNlOiBJdGVyYWJsZTxUPiB8IFQpOiBJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcblxuICAgIGxldCBkb25lOiBib29sZWFuLCB0aHJldyA9IGZhbHNlO1xuICAgIGxldCBidWZmZXJzOiBVaW50OEFycmF5W10gPSBbXSwgYnVmZmVyOiBVaW50OEFycmF5O1xuICAgIGxldCBjbWQ6ICdwZWVrJyB8ICdyZWFkJywgc2l6ZTogbnVtYmVyLCBidWZmZXJMZW5ndGggPSAwO1xuXG4gICAgZnVuY3Rpb24gYnl0ZVJhbmdlKCkge1xuICAgICAgICBpZiAoY21kID09PSAncGVlaycpIHtcbiAgICAgICAgICAgIHJldHVybiBqb2luVWludDhBcnJheXMoYnVmZmVycy5zbGljZSgpLCBzaXplKVswXTtcbiAgICAgICAgfVxuICAgICAgICBbYnVmZmVyLCBidWZmZXJzXSA9IGpvaW5VaW50OEFycmF5cyhidWZmZXJzLCBzaXplKTtcbiAgICAgICAgYnVmZmVyTGVuZ3RoIC09IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8vIFlpZWxkIHNvIHRoZSBjYWxsZXIgY2FuIGluamVjdCB0aGUgcmVhZCBjb21tYW5kIGJlZm9yZSBjcmVhdGluZyB0aGUgc291cmNlIEl0ZXJhdG9yXG4gICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCA8YW55PiBudWxsKTtcblxuICAgIC8vIGluaXRpYWxpemUgdGhlIGl0ZXJhdG9yXG4gICAgbGV0IGl0ID0gdG9VaW50OEFycmF5SXRlcmF0b3Ioc291cmNlKVtTeW1ib2wuaXRlcmF0b3JdKCk7XG5cbiAgICB0cnkge1xuICAgICAgICBkbyB7XG4gICAgICAgICAgICAvLyByZWFkIHRoZSBuZXh0IHZhbHVlXG4gICAgICAgICAgICAoeyBkb25lLCB2YWx1ZTogYnVmZmVyIH0gPSBpc05hTihzaXplIC0gYnVmZmVyTGVuZ3RoKSA/XG4gICAgICAgICAgICAgICAgaXQubmV4dCh1bmRlZmluZWQpIDogaXQubmV4dChzaXplIC0gYnVmZmVyTGVuZ3RoKSk7XG4gICAgICAgICAgICAvLyBpZiBjaHVuayBpcyBub3QgbnVsbCBvciBlbXB0eSwgcHVzaCBpdCBvbnRvIHRoZSBxdWV1ZVxuICAgICAgICAgICAgaWYgKCFkb25lICYmIGJ1ZmZlci5ieXRlTGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGJ1ZmZlcnMucHVzaChidWZmZXIpO1xuICAgICAgICAgICAgICAgIGJ1ZmZlckxlbmd0aCArPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgZW5vdWdoIGJ5dGVzIGluIG91ciBidWZmZXIsIHlpZWxkIGNodW5rcyB1bnRpbCB3ZSBkb24ndFxuICAgICAgICAgICAgaWYgKGRvbmUgfHwgc2l6ZSA8PSBidWZmZXJMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgICh7IGNtZCwgc2l6ZSB9ID0geWllbGQgYnl0ZVJhbmdlKCkpO1xuICAgICAgICAgICAgICAgIH0gd2hpbGUgKHNpemUgPCBidWZmZXJMZW5ndGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IHdoaWxlICghZG9uZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAodGhyZXcgPSB0cnVlKSAmJiAodHlwZW9mIGl0LnRocm93ID09PSAnZnVuY3Rpb24nKSAmJiAoaXQudGhyb3coZSkpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICAgICh0aHJldyA9PT0gZmFsc2UpICYmICh0eXBlb2YgaXQucmV0dXJuID09PSAnZnVuY3Rpb24nKSAmJiAoaXQucmV0dXJuKCkpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmFzeW5jIGZ1bmN0aW9uKiBmcm9tQXN5bmNJdGVyYWJsZTxUIGV4dGVuZHMgQXJyYXlCdWZmZXJWaWV3SW5wdXQ+KHNvdXJjZTogQXN5bmNJdGVyYWJsZTxUPiB8IFByb21pc2VMaWtlPFQ+KTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcblxuICAgIGxldCBkb25lOiBib29sZWFuLCB0aHJldyA9IGZhbHNlO1xuICAgIGxldCBidWZmZXJzOiBVaW50OEFycmF5W10gPSBbXSwgYnVmZmVyOiBVaW50OEFycmF5O1xuICAgIGxldCBjbWQ6ICdwZWVrJyB8ICdyZWFkJywgc2l6ZTogbnVtYmVyLCBidWZmZXJMZW5ndGggPSAwO1xuXG4gICAgZnVuY3Rpb24gYnl0ZVJhbmdlKCkge1xuICAgICAgICBpZiAoY21kID09PSAncGVlaycpIHtcbiAgICAgICAgICAgIHJldHVybiBqb2luVWludDhBcnJheXMoYnVmZmVycy5zbGljZSgpLCBzaXplKVswXTtcbiAgICAgICAgfVxuICAgICAgICBbYnVmZmVyLCBidWZmZXJzXSA9IGpvaW5VaW50OEFycmF5cyhidWZmZXJzLCBzaXplKTtcbiAgICAgICAgYnVmZmVyTGVuZ3RoIC09IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8vIFlpZWxkIHNvIHRoZSBjYWxsZXIgY2FuIGluamVjdCB0aGUgcmVhZCBjb21tYW5kIGJlZm9yZSBjcmVhdGluZyB0aGUgc291cmNlIEFzeW5jSXRlcmF0b3JcbiAgICAoeyBjbWQsIHNpemUgfSA9IHlpZWxkIDxhbnk+IG51bGwpO1xuXG4gICAgLy8gaW5pdGlhbGl6ZSB0aGUgaXRlcmF0b3JcbiAgICBsZXQgaXQgPSB0b1VpbnQ4QXJyYXlBc3luY0l0ZXJhdG9yKHNvdXJjZSlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk7XG5cbiAgICB0cnkge1xuICAgICAgICBkbyB7XG4gICAgICAgICAgICAvLyByZWFkIHRoZSBuZXh0IHZhbHVlXG4gICAgICAgICAgICAoeyBkb25lLCB2YWx1ZTogYnVmZmVyIH0gPSBpc05hTihzaXplIC0gYnVmZmVyTGVuZ3RoKVxuICAgICAgICAgICAgICAgID8gYXdhaXQgaXQubmV4dCh1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgOiBhd2FpdCBpdC5uZXh0KHNpemUgLSBidWZmZXJMZW5ndGgpKTtcbiAgICAgICAgICAgIC8vIGlmIGNodW5rIGlzIG5vdCBudWxsIG9yIGVtcHR5LCBwdXNoIGl0IG9udG8gdGhlIHF1ZXVlXG4gICAgICAgICAgICBpZiAoIWRvbmUgJiYgYnVmZmVyLmJ5dGVMZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVycy5wdXNoKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgYnVmZmVyTGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBlbm91Z2ggYnl0ZXMgaW4gb3VyIGJ1ZmZlciwgeWllbGQgY2h1bmtzIHVudGlsIHdlIGRvbid0XG4gICAgICAgICAgICBpZiAoZG9uZSB8fCBzaXplIDw9IGJ1ZmZlckxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCBieXRlUmFuZ2UoKSk7XG4gICAgICAgICAgICAgICAgfSB3aGlsZSAoc2l6ZSA8IGJ1ZmZlckxlbmd0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gd2hpbGUgKCFkb25lKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICh0aHJldyA9IHRydWUpICYmICh0eXBlb2YgaXQudGhyb3cgPT09ICdmdW5jdGlvbicpICYmIChhd2FpdCBpdC50aHJvdyhlKSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgKHRocmV3ID09PSBmYWxzZSkgJiYgKHR5cGVvZiBpdC5yZXR1cm4gPT09ICdmdW5jdGlvbicpICYmIChhd2FpdCBpdC5yZXR1cm4oKSk7XG4gICAgfVxufVxuXG4vLyBBbGwgdGhpcyBtYW51YWwgVWludDhBcnJheSBjaHVuayBtYW5hZ2VtZW50IGNhbiBiZSBhdm9pZGVkIGlmL3doZW4gZW5naW5lc1xuLy8gYWRkIHN1cHBvcnQgZm9yIEFycmF5QnVmZmVyLnRyYW5zZmVyKCkgb3IgQXJyYXlCdWZmZXIucHJvdG90eXBlLnJlYWxsb2MoKTpcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9kb21lbmljL3Byb3Bvc2FsLWFycmF5YnVmZmVyLXRyYW5zZmVyXG4vKiogQGlnbm9yZSAqL1xuYXN5bmMgZnVuY3Rpb24qIGZyb21ET01TdHJlYW08VCBleHRlbmRzIEFycmF5QnVmZmVyVmlld0lucHV0Pihzb3VyY2U6IFJlYWRhYmxlU3RyZWFtPFQ+KTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcblxuICAgIGxldCBkb25lID0gZmFsc2UsIHRocmV3ID0gZmFsc2U7XG4gICAgbGV0IGJ1ZmZlcnM6IFVpbnQ4QXJyYXlbXSA9IFtdLCBidWZmZXI6IFVpbnQ4QXJyYXk7XG4gICAgbGV0IGNtZDogJ3BlZWsnIHwgJ3JlYWQnLCBzaXplOiBudW1iZXIsIGJ1ZmZlckxlbmd0aCA9IDA7XG5cbiAgICBmdW5jdGlvbiBieXRlUmFuZ2UoKSB7XG4gICAgICAgIGlmIChjbWQgPT09ICdwZWVrJykge1xuICAgICAgICAgICAgcmV0dXJuIGpvaW5VaW50OEFycmF5cyhidWZmZXJzLnNsaWNlKCksIHNpemUpWzBdO1xuICAgICAgICB9XG4gICAgICAgIFtidWZmZXIsIGJ1ZmZlcnNdID0gam9pblVpbnQ4QXJyYXlzKGJ1ZmZlcnMsIHNpemUpO1xuICAgICAgICBidWZmZXJMZW5ndGggLT0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgfVxuXG4gICAgLy8gWWllbGQgc28gdGhlIGNhbGxlciBjYW4gaW5qZWN0IHRoZSByZWFkIGNvbW1hbmQgYmVmb3JlIHdlIGVzdGFibGlzaCB0aGUgUmVhZGFibGVTdHJlYW0gbG9ja1xuICAgICh7IGNtZCwgc2l6ZSB9ID0geWllbGQgPGFueT4gbnVsbCk7XG5cbiAgICAvLyBpbml0aWFsaXplIHRoZSByZWFkZXIgYW5kIGxvY2sgdGhlIHN0cmVhbVxuICAgIGxldCBpdCA9IG5ldyBBZGFwdGl2ZUJ5dGVSZWFkZXIoc291cmNlKTtcblxuICAgIHRyeSB7XG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIC8vIHJlYWQgdGhlIG5leHQgdmFsdWVcbiAgICAgICAgICAgICh7IGRvbmUsIHZhbHVlOiBidWZmZXIgfSA9IGlzTmFOKHNpemUgLSBidWZmZXJMZW5ndGgpXG4gICAgICAgICAgICAgICAgPyBhd2FpdCBpdFsncmVhZCddKHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICA6IGF3YWl0IGl0WydyZWFkJ10oc2l6ZSAtIGJ1ZmZlckxlbmd0aCkpO1xuICAgICAgICAgICAgLy8gaWYgY2h1bmsgaXMgbm90IG51bGwgb3IgZW1wdHksIHB1c2ggaXQgb250byB0aGUgcXVldWVcbiAgICAgICAgICAgIGlmICghZG9uZSAmJiBidWZmZXIuYnl0ZUxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBidWZmZXJzLnB1c2godG9VaW50OEFycmF5KGJ1ZmZlcikpO1xuICAgICAgICAgICAgICAgIGJ1ZmZlckxlbmd0aCArPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgZW5vdWdoIGJ5dGVzIGluIG91ciBidWZmZXIsIHlpZWxkIGNodW5rcyB1bnRpbCB3ZSBkb24ndFxuICAgICAgICAgICAgaWYgKGRvbmUgfHwgc2l6ZSA8PSBidWZmZXJMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgICh7IGNtZCwgc2l6ZSB9ID0geWllbGQgYnl0ZVJhbmdlKCkpO1xuICAgICAgICAgICAgICAgIH0gd2hpbGUgKHNpemUgPCBidWZmZXJMZW5ndGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IHdoaWxlICghZG9uZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAodGhyZXcgPSB0cnVlKSAmJiAoYXdhaXQgaXRbJ2NhbmNlbCddKGUpKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgICAodGhyZXcgPT09IGZhbHNlKSA/IChhd2FpdCBpdFsnY2FuY2VsJ10oKSlcbiAgICAgICAgICAgIDogc291cmNlWydsb2NrZWQnXSAmJiBpdC5yZWxlYXNlTG9jaygpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmNsYXNzIEFkYXB0aXZlQnl0ZVJlYWRlcjxUIGV4dGVuZHMgQXJyYXlCdWZmZXJWaWV3SW5wdXQ+IHtcblxuICAgIHByaXZhdGUgc3VwcG9ydHNCWU9COiBib29sZWFuO1xuICAgIHByaXZhdGUgYnlvYlJlYWRlcjogUmVhZGFibGVTdHJlYW1CWU9CUmVhZGVyIHwgbnVsbCA9IG51bGw7XG4gICAgcHJpdmF0ZSBkZWZhdWx0UmVhZGVyOiBSZWFkYWJsZVN0cmVhbURlZmF1bHRSZWFkZXI8VD4gfCBudWxsID0gbnVsbDtcbiAgICBwcml2YXRlIHJlYWRlcjogUmVhZGFibGVTdHJlYW1CWU9CUmVhZGVyIHwgUmVhZGFibGVTdHJlYW1EZWZhdWx0UmVhZGVyPFQ+IHwgbnVsbDtcblxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgc291cmNlOiBSZWFkYWJsZVN0cmVhbTxUPikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5zdXBwb3J0c0JZT0IgPSAhISh0aGlzLnJlYWRlciA9IHRoaXMuZ2V0QllPQlJlYWRlcigpKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhpcy5zdXBwb3J0c0JZT0IgPSAhISEodGhpcy5yZWFkZXIgPSB0aGlzLmdldERlZmF1bHRSZWFkZXIoKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXQgY2xvc2VkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5yZWFkZXIgPyB0aGlzLnJlYWRlclsnY2xvc2VkJ10uY2F0Y2goKCkgPT4ge30pIDogUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuXG4gICAgcmVsZWFzZUxvY2soKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLnJlYWRlcikge1xuICAgICAgICAgICAgdGhpcy5yZWFkZXIucmVsZWFzZUxvY2soKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlYWRlciA9IHRoaXMuYnlvYlJlYWRlciA9IHRoaXMuZGVmYXVsdFJlYWRlciA9IG51bGw7XG4gICAgfVxuXG4gICAgYXN5bmMgY2FuY2VsKHJlYXNvbj86IGFueSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHJlYWRlciwgc291cmNlIH0gPSB0aGlzO1xuICAgICAgICByZWFkZXIgJiYgKGF3YWl0IHJlYWRlclsnY2FuY2VsJ10ocmVhc29uKSk7XG4gICAgICAgIHNvdXJjZSAmJiAoc291cmNlWydsb2NrZWQnXSAmJiB0aGlzLnJlbGVhc2VMb2NrKCkpO1xuICAgIH1cblxuICAgIGFzeW5jIHJlYWQoc2l6ZT86IG51bWJlcik6IFByb21pc2U8UmVhZGFibGVTdHJlYW1SZWFkUmVzdWx0PFVpbnQ4QXJyYXk+PiB7XG4gICAgICAgIGlmIChzaXplID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4geyBkb25lOiB0aGlzLnJlYWRlciA9PSBudWxsLCB2YWx1ZTogbmV3IFVpbnQ4QXJyYXkoMCkgfTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSAhdGhpcy5zdXBwb3J0c0JZT0IgfHwgdHlwZW9mIHNpemUgIT09ICdudW1iZXInXG4gICAgICAgICAgICA/IGF3YWl0IHRoaXMuZ2V0RGVmYXVsdFJlYWRlcigpLnJlYWQoKVxuICAgICAgICAgICAgOiBhd2FpdCB0aGlzLnJlYWRGcm9tQllPQlJlYWRlcihzaXplKTtcbiAgICAgICAgIXJlc3VsdC5kb25lICYmIChyZXN1bHQudmFsdWUgPSB0b1VpbnQ4QXJyYXkocmVzdWx0IGFzIFJlYWRhYmxlU3RyZWFtUmVhZFJlc3VsdDxVaW50OEFycmF5PikpO1xuICAgICAgICByZXR1cm4gcmVzdWx0IGFzIFJlYWRhYmxlU3RyZWFtUmVhZFJlc3VsdDxVaW50OEFycmF5PjtcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldERlZmF1bHRSZWFkZXIoKSB7XG4gICAgICAgIGlmICh0aGlzLmJ5b2JSZWFkZXIpIHsgdGhpcy5yZWxlYXNlTG9jaygpOyB9XG4gICAgICAgIGlmICghdGhpcy5kZWZhdWx0UmVhZGVyKSB7XG4gICAgICAgICAgICB0aGlzLmRlZmF1bHRSZWFkZXIgPSB0aGlzLnNvdXJjZVsnZ2V0UmVhZGVyJ10oKTtcbiAgICAgICAgICAgIC8vIFdlIGhhdmUgdG8gY2F0Y2ggYW5kIHN3YWxsb3cgZXJyb3JzIGhlcmUgdG8gYXZvaWQgdW5jYXVnaHQgcHJvbWlzZSByZWplY3Rpb24gZXhjZXB0aW9uc1xuICAgICAgICAgICAgLy8gdGhhdCBzZWVtIHRvIGJlIHJhaXNlZCB3aGVuIHdlIGNhbGwgYHJlbGVhc2VMb2NrKClgIG9uIHRoaXMgcmVhZGVyLiBJJ20gc3RpbGwgbXlzdGlmaWVkXG4gICAgICAgICAgICAvLyBhYm91dCB3aHkgdGhlc2UgZXJyb3JzIGFyZSByYWlzZWQsIGJ1dCBJJ20gc3VyZSB0aGVyZSdzIHNvbWUgaW1wb3J0YW50IHNwZWMgcmVhc29uIHRoYXRcbiAgICAgICAgICAgIC8vIEkgaGF2ZW4ndCBjb25zaWRlcmVkLiBJIGhhdGUgdG8gZW1wbG95IHN1Y2ggYW4gYW50aS1wYXR0ZXJuIGhlcmUsIGJ1dCBpdCBzZWVtcyBsaWtlIHRoZVxuICAgICAgICAgICAgLy8gb25seSBzb2x1dGlvbiBpbiB0aGlzIGNhc2UgOi9cbiAgICAgICAgICAgIHRoaXMuZGVmYXVsdFJlYWRlclsnY2xvc2VkJ10uY2F0Y2goKCkgPT4ge30pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAodGhpcy5yZWFkZXIgPSB0aGlzLmRlZmF1bHRSZWFkZXIpO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0QllPQlJlYWRlcigpIHtcbiAgICAgICAgaWYgKHRoaXMuZGVmYXVsdFJlYWRlcikgeyB0aGlzLnJlbGVhc2VMb2NrKCk7IH1cbiAgICAgICAgaWYgKCF0aGlzLmJ5b2JSZWFkZXIpIHtcbiAgICAgICAgICAgIHRoaXMuYnlvYlJlYWRlciA9IHRoaXMuc291cmNlWydnZXRSZWFkZXInXSh7IG1vZGU6ICdieW9iJyB9KTtcbiAgICAgICAgICAgIC8vIFdlIGhhdmUgdG8gY2F0Y2ggYW5kIHN3YWxsb3cgZXJyb3JzIGhlcmUgdG8gYXZvaWQgdW5jYXVnaHQgcHJvbWlzZSByZWplY3Rpb24gZXhjZXB0aW9uc1xuICAgICAgICAgICAgLy8gdGhhdCBzZWVtIHRvIGJlIHJhaXNlZCB3aGVuIHdlIGNhbGwgYHJlbGVhc2VMb2NrKClgIG9uIHRoaXMgcmVhZGVyLiBJJ20gc3RpbGwgbXlzdGlmaWVkXG4gICAgICAgICAgICAvLyBhYm91dCB3aHkgdGhlc2UgZXJyb3JzIGFyZSByYWlzZWQsIGJ1dCBJJ20gc3VyZSB0aGVyZSdzIHNvbWUgaW1wb3J0YW50IHNwZWMgcmVhc29uIHRoYXRcbiAgICAgICAgICAgIC8vIEkgaGF2ZW4ndCBjb25zaWRlcmVkLiBJIGhhdGUgdG8gZW1wbG95IHN1Y2ggYW4gYW50aS1wYXR0ZXJuIGhlcmUsIGJ1dCBpdCBzZWVtcyBsaWtlIHRoZVxuICAgICAgICAgICAgLy8gb25seSBzb2x1dGlvbiBpbiB0aGlzIGNhc2UgOi9cbiAgICAgICAgICAgIHRoaXMuYnlvYlJlYWRlclsnY2xvc2VkJ10uY2F0Y2goKCkgPT4ge30pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAodGhpcy5yZWFkZXIgPSB0aGlzLmJ5b2JSZWFkZXIpO1xuICAgIH1cblxuICAgIC8vIFRoaXMgc3RyYXRlZ3kgcGx1Y2tlZCBmcm9tIHRoZSBleGFtcGxlIGluIHRoZSBzdHJlYW1zIHNwZWM6XG4gICAgLy8gaHR0cHM6Ly9zdHJlYW1zLnNwZWMud2hhdHdnLm9yZy8jZXhhbXBsZS1tYW51YWwtcmVhZC1ieXRlc1xuICAgIHByaXZhdGUgYXN5bmMgcmVhZEZyb21CWU9CUmVhZGVyKHNpemU6IG51bWJlcikge1xuICAgICAgICByZXR1cm4gYXdhaXQgcmVhZEludG8odGhpcy5nZXRCWU9CUmVhZGVyKCksIG5ldyBBcnJheUJ1ZmZlcihzaXplKSwgMCwgc2l6ZSk7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuYXN5bmMgZnVuY3Rpb24gcmVhZEludG8ocmVhZGVyOiBSZWFkYWJsZVN0cmVhbUJZT0JSZWFkZXIsIGJ1ZmZlcjogQXJyYXlCdWZmZXJMaWtlLCBvZmZzZXQ6IG51bWJlciwgc2l6ZTogbnVtYmVyKTogUHJvbWlzZTxSZWFkYWJsZVN0cmVhbVJlYWRSZXN1bHQ8VWludDhBcnJheT4+IHtcbiAgICBpZiAob2Zmc2V0ID49IHNpemUpIHtcbiAgICAgICAgcmV0dXJuIHsgZG9uZTogZmFsc2UsIHZhbHVlOiBuZXcgVWludDhBcnJheShidWZmZXIsIDAsIHNpemUpIH07XG4gICAgfVxuICAgIGNvbnN0IHsgZG9uZSwgdmFsdWUgfSA9IGF3YWl0IHJlYWRlci5yZWFkKG5ldyBVaW50OEFycmF5KGJ1ZmZlciwgb2Zmc2V0LCBzaXplIC0gb2Zmc2V0KSk7XG4gICAgaWYgKCgob2Zmc2V0ICs9IHZhbHVlLmJ5dGVMZW5ndGgpIDwgc2l6ZSkgJiYgIWRvbmUpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHJlYWRJbnRvKHJlYWRlciwgdmFsdWUuYnVmZmVyLCBvZmZzZXQsIHNpemUpO1xuICAgIH1cbiAgICByZXR1cm4geyBkb25lLCB2YWx1ZTogbmV3IFVpbnQ4QXJyYXkodmFsdWUuYnVmZmVyLCAwLCBvZmZzZXQpIH07XG59XG5cbi8qKiBAaWdub3JlICovXG50eXBlIEV2ZW50TmFtZSA9ICdlbmQnIHwgJ2Vycm9yJyB8ICdyZWFkYWJsZSc7XG4vKiogQGlnbm9yZSAqL1xudHlwZSBFdmVudCA9IFtFdmVudE5hbWUsIChfOiBhbnkpID0+IHZvaWQsIFByb21pc2U8W0V2ZW50TmFtZSwgRXJyb3IgfCBudWxsXT5dO1xuLyoqIEBpZ25vcmUgKi9cbmNvbnN0IG9uRXZlbnQgPSA8VCBleHRlbmRzIHN0cmluZz4oc3RyZWFtOiBOb2RlSlMuUmVhZGFibGVTdHJlYW0sIGV2ZW50OiBUKSA9PiB7XG4gICAgbGV0IGhhbmRsZXIgPSAoXzogYW55KSA9PiByZXNvbHZlKFtldmVudCwgX10pO1xuICAgIGxldCByZXNvbHZlOiAodmFsdWU/OiBbVCwgYW55XSB8IFByb21pc2VMaWtlPFtULCBhbnldPikgPT4gdm9pZDtcbiAgICByZXR1cm4gW2V2ZW50LCBoYW5kbGVyLCBuZXcgUHJvbWlzZTxbVCwgYW55XT4oXG4gICAgICAgIChyKSA9PiAocmVzb2x2ZSA9IHIpICYmIHN0cmVhbVsnb25jZSddKGV2ZW50LCBoYW5kbGVyKVxuICAgICldIGFzIEV2ZW50O1xufTtcblxuLyoqIEBpZ25vcmUgKi9cbmFzeW5jIGZ1bmN0aW9uKiBmcm9tTm9kZVN0cmVhbShzdHJlYW06IE5vZGVKUy5SZWFkYWJsZVN0cmVhbSk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxVaW50OEFycmF5PiB7XG5cbiAgICBsZXQgZXZlbnRzOiBFdmVudFtdID0gW107XG4gICAgbGV0IGV2ZW50OiBFdmVudE5hbWUgPSAnZXJyb3InO1xuICAgIGxldCBkb25lID0gZmFsc2UsIGVycjogRXJyb3IgfCBudWxsID0gbnVsbDtcbiAgICBsZXQgY21kOiAncGVlaycgfCAncmVhZCcsIHNpemU6IG51bWJlciwgYnVmZmVyTGVuZ3RoID0gMDtcbiAgICBsZXQgYnVmZmVyczogVWludDhBcnJheVtdID0gW10sIGJ1ZmZlcjogVWludDhBcnJheSB8IEJ1ZmZlciB8IHN0cmluZztcblxuICAgIGZ1bmN0aW9uIGJ5dGVSYW5nZSgpIHtcbiAgICAgICAgaWYgKGNtZCA9PT0gJ3BlZWsnKSB7XG4gICAgICAgICAgICByZXR1cm4gam9pblVpbnQ4QXJyYXlzKGJ1ZmZlcnMuc2xpY2UoKSwgc2l6ZSlbMF07XG4gICAgICAgIH1cbiAgICAgICAgW2J1ZmZlciwgYnVmZmVyc10gPSBqb2luVWludDhBcnJheXMoYnVmZmVycywgc2l6ZSk7XG4gICAgICAgIGJ1ZmZlckxlbmd0aCAtPSBidWZmZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICAvLyBZaWVsZCBzbyB0aGUgY2FsbGVyIGNhbiBpbmplY3QgdGhlIHJlYWQgY29tbWFuZCBiZWZvcmUgd2VcbiAgICAvLyBhZGQgdGhlIGxpc3RlbmVyIGZvciB0aGUgc291cmNlIHN0cmVhbSdzICdyZWFkYWJsZScgZXZlbnQuXG4gICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCA8YW55PiBudWxsKTtcblxuICAgIC8vIGlnbm9yZSBzdGRpbiBpZiBpdCdzIGEgVFRZXG4gICAgaWYgKChzdHJlYW0gYXMgYW55KVsnaXNUVFknXSkgeyByZXR1cm4geWllbGQgbmV3IFVpbnQ4QXJyYXkoMCk7IH1cblxuICAgIHRyeSB7XG4gICAgICAgIC8vIGluaXRpYWxpemUgdGhlIHN0cmVhbSBldmVudCBoYW5kbGVyc1xuICAgICAgICBldmVudHNbMF0gPSBvbkV2ZW50KHN0cmVhbSwgJ2VuZCcpO1xuICAgICAgICBldmVudHNbMV0gPSBvbkV2ZW50KHN0cmVhbSwgJ2Vycm9yJyk7XG5cbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgZXZlbnRzWzJdID0gb25FdmVudChzdHJlYW0sICdyZWFkYWJsZScpO1xuXG4gICAgICAgICAgICAvLyB3YWl0IG9uIHRoZSBmaXJzdCBtZXNzYWdlIGV2ZW50IGZyb20gdGhlIHN0cmVhbVxuICAgICAgICAgICAgW2V2ZW50LCBlcnJdID0gYXdhaXQgUHJvbWlzZS5yYWNlKGV2ZW50cy5tYXAoKHgpID0+IHhbMl0pKTtcblxuICAgICAgICAgICAgLy8gaWYgdGhlIHN0cmVhbSBlbWl0dGVkIGFuIEVycm9yLCByZXRocm93IGl0XG4gICAgICAgICAgICBpZiAoZXZlbnQgPT09ICdlcnJvcicpIHsgYnJlYWs7IH1cbiAgICAgICAgICAgIGlmICghKGRvbmUgPSBldmVudCA9PT0gJ2VuZCcpKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIHNpemUgaXMgTmFOLCByZXF1ZXN0IHRvIHJlYWQgZXZlcnl0aGluZyBpbiB0aGUgc3RyZWFtJ3MgaW50ZXJuYWwgYnVmZmVyXG4gICAgICAgICAgICAgICAgaWYgKCFpc0Zpbml0ZShzaXplIC0gYnVmZmVyTGVuZ3RoKSkge1xuICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSB0b1VpbnQ4QXJyYXkoc3RyZWFtWydyZWFkJ10odW5kZWZpbmVkKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gdG9VaW50OEFycmF5KHN0cmVhbVsncmVhZCddKHNpemUgLSBidWZmZXJMZW5ndGgpKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIGJ5dGVMZW5ndGggaXMgMCwgdGhlbiB0aGUgcmVxdWVzdGVkIGFtb3VudCBpcyBtb3JlIHRoYW4gdGhlIHN0cmVhbSBoYXNcbiAgICAgICAgICAgICAgICAgICAgLy8gaW4gaXRzIGludGVybmFsIGJ1ZmZlci4gSW4gdGhpcyBjYXNlIHRoZSBzdHJlYW0gbmVlZHMgYSBcImtpY2tcIiB0byB0ZWxsIGl0IHRvXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnRpbnVlIGVtaXR0aW5nIHJlYWRhYmxlIGV2ZW50cywgc28gcmVxdWVzdCB0byByZWFkIGV2ZXJ5dGhpbmcgdGhlIHN0cmVhbVxuICAgICAgICAgICAgICAgICAgICAvLyBoYXMgaW4gaXRzIGludGVybmFsIGJ1ZmZlciByaWdodCBub3cuXG4gICAgICAgICAgICAgICAgICAgIGlmIChidWZmZXIuYnl0ZUxlbmd0aCA8IChzaXplIC0gYnVmZmVyTGVuZ3RoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gdG9VaW50OEFycmF5KHN0cmVhbVsncmVhZCddKHVuZGVmaW5lZCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGlmIGNodW5rIGlzIG5vdCBudWxsIG9yIGVtcHR5LCBwdXNoIGl0IG9udG8gdGhlIHF1ZXVlXG4gICAgICAgICAgICAgICAgaWYgKGJ1ZmZlci5ieXRlTGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBidWZmZXJzLnB1c2goYnVmZmVyKTtcbiAgICAgICAgICAgICAgICAgICAgYnVmZmVyTGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgZW5vdWdoIGJ5dGVzIGluIG91ciBidWZmZXIsIHlpZWxkIGNodW5rcyB1bnRpbCB3ZSBkb24ndFxuICAgICAgICAgICAgaWYgKGRvbmUgfHwgc2l6ZSA8PSBidWZmZXJMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgICh7IGNtZCwgc2l6ZSB9ID0geWllbGQgYnl0ZVJhbmdlKCkpO1xuICAgICAgICAgICAgICAgIH0gd2hpbGUgKHNpemUgPCBidWZmZXJMZW5ndGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IHdoaWxlICghZG9uZSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgYXdhaXQgY2xlYW51cChldmVudHMsIGV2ZW50ID09PSAnZXJyb3InID8gZXJyIDogbnVsbCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xlYW51cDxUIGV4dGVuZHMgRXJyb3IgfCBudWxsIHwgdm9pZD4oZXZlbnRzOiBFdmVudFtdLCBlcnI/OiBUKSB7XG4gICAgICAgIGJ1ZmZlciA9IGJ1ZmZlcnMgPSA8YW55PiBudWxsO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8VD4oYXN5bmMgKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgZm9yIChjb25zdCBbZXZ0LCBmbl0gb2YgZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgc3RyZWFtWydvZmYnXShldnQsIGZuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gU29tZSBzdHJlYW0gaW1wbGVtZW50YXRpb25zIGRvbid0IGNhbGwgdGhlIGRlc3Ryb3kgY2FsbGJhY2ssXG4gICAgICAgICAgICAgICAgLy8gYmVjYXVzZSBpdCdzIHJlYWxseSBhIG5vZGUtaW50ZXJuYWwgQVBJLiBKdXN0IGNhbGxpbmcgYGRlc3Ryb3lgXG4gICAgICAgICAgICAgICAgLy8gaGVyZSBzaG91bGQgYmUgZW5vdWdoIHRvIGNvbmZvcm0gdG8gdGhlIFJlYWRhYmxlU3RyZWFtIGNvbnRyYWN0XG4gICAgICAgICAgICAgICAgY29uc3QgZGVzdHJveSA9IChzdHJlYW0gYXMgYW55KVsnZGVzdHJveSddO1xuICAgICAgICAgICAgICAgIGRlc3Ryb3kgJiYgZGVzdHJveS5jYWxsKHN0cmVhbSwgZXJyKTtcbiAgICAgICAgICAgICAgICBlcnIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7IGVyciA9IGUgfHwgZXJyOyB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIGVyciAhPSBudWxsID8gcmVqZWN0KGVycikgOiByZXNvbHZlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbiJdfQ==

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
async function* fromReadableDOMStream(source) {
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
        source['locked'] && it.releaseLock();
        (threw === false) && (await it['cancel']());
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
        const { reader } = this;
        this.reader = null;
        this.releaseLock();
        if (reader) {
            await reader['cancel'](reason);
        }
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
async function* fromReadableNodeStream(stream) {
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
            const [evt, fn, closed] = onEvent(stream, 'close');
            const destroyed = new Promise((resolve, reject) => {
                const destroy = stream['destroy'] || ((e, cb) => cb(e));
                destroy.call(stream, err, (e) => e != null ? reject(e) : resolve());
            });
            try {
                await Promise.race([closed, destroyed]);
                err = undefined;
            }
            catch (e) {
                err = e || err;
            }
            finally {
                stream['off'](evt, fn);
                err != null ? reject(err) : resolve();
            }
        });
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDM0UsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJO2dCQUNBLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUN4QyxHQUFHLEdBQUcsU0FBUyxDQUFDO2FBQ25CO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQUUsR0FBRyxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUM7YUFBRTtvQkFBUztnQkFDcEMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDdkIsR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQzthQUN6QztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztBQUNMLENBQUMiLCJmaWxlIjoiaW8vYWRhcHRlcnMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHtcbiAgICB0b1VpbnQ4QXJyYXksXG4gICAgam9pblVpbnQ4QXJyYXlzLFxuICAgIEFycmF5QnVmZmVyVmlld0lucHV0LFxuICAgIHRvVWludDhBcnJheUl0ZXJhdG9yLFxuICAgIHRvVWludDhBcnJheUFzeW5jSXRlcmF0b3Jcbn0gZnJvbSAnLi4vdXRpbC9idWZmZXInO1xuXG5pbXBvcnQgeyBSZWFkYWJsZURPTVN0cmVhbU9wdGlvbnMgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGRlZmF1bHQge1xuICAgIGZyb21JdGVyYWJsZTxUIGV4dGVuZHMgQXJyYXlCdWZmZXJWaWV3SW5wdXQ+KHNvdXJjZTogSXRlcmFibGU8VD4gfCBUKTogSXRlcmFibGVJdGVyYXRvcjxVaW50OEFycmF5PiB7XG4gICAgICAgIHJldHVybiBwdW1wKGZyb21JdGVyYWJsZTxUPihzb3VyY2UpKTtcbiAgICB9LFxuICAgIGZyb21Bc3luY0l0ZXJhYmxlPFQgZXh0ZW5kcyBBcnJheUJ1ZmZlclZpZXdJbnB1dD4oc291cmNlOiBBc3luY0l0ZXJhYmxlPFQ+IHwgUHJvbWlzZUxpa2U8VD4pOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8VWludDhBcnJheT4ge1xuICAgICAgICByZXR1cm4gcHVtcChmcm9tQXN5bmNJdGVyYWJsZTxUPihzb3VyY2UpKTtcbiAgICB9LFxuICAgIGZyb21SZWFkYWJsZURPTVN0cmVhbTxUIGV4dGVuZHMgQXJyYXlCdWZmZXJWaWV3SW5wdXQ+KHNvdXJjZTogUmVhZGFibGVTdHJlYW08VD4pOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8VWludDhBcnJheT4ge1xuICAgICAgICByZXR1cm4gcHVtcChmcm9tUmVhZGFibGVET01TdHJlYW08VD4oc291cmNlKSk7XG4gICAgfSxcbiAgICBmcm9tUmVhZGFibGVOb2RlU3RyZWFtKHN0cmVhbTogTm9kZUpTLlJlYWRhYmxlU3RyZWFtKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcbiAgICAgICAgcmV0dXJuIHB1bXAoZnJvbVJlYWRhYmxlTm9kZVN0cmVhbShzdHJlYW0pKTtcbiAgICB9LFxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICB0b1JlYWRhYmxlRE9NU3RyZWFtPFQ+KHNvdXJjZTogSXRlcmFibGU8VD4gfCBBc3luY0l0ZXJhYmxlPFQ+LCBvcHRpb25zPzogUmVhZGFibGVET01TdHJlYW1PcHRpb25zKTogUmVhZGFibGVTdHJlYW08VD4ge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFwidG9SZWFkYWJsZURPTVN0cmVhbVwiIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBlbnZpcm9ubWVudGApO1xuICAgIH0sXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHRvUmVhZGFibGVOb2RlU3RyZWFtPFQ+KHNvdXJjZTogSXRlcmFibGU8VD4gfCBBc3luY0l0ZXJhYmxlPFQ+LCBvcHRpb25zPzogaW1wb3J0KCdzdHJlYW0nKS5SZWFkYWJsZU9wdGlvbnMpOiBpbXBvcnQoJ3N0cmVhbScpLlJlYWRhYmxlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBcInRvUmVhZGFibGVOb2RlU3RyZWFtXCIgbm90IGF2YWlsYWJsZSBpbiB0aGlzIGVudmlyb25tZW50YCk7XG4gICAgfSxcbn07XG5cbi8qKiBAaWdub3JlICovXG5jb25zdCBwdW1wID0gPFQgZXh0ZW5kcyBJdGVyYXRvcjxhbnk+IHwgQXN5bmNJdGVyYXRvcjxhbnk+PihpdGVyYXRvcjogVCkgPT4geyBpdGVyYXRvci5uZXh0KCk7IHJldHVybiBpdGVyYXRvcjsgfTtcblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uKiBmcm9tSXRlcmFibGU8VCBleHRlbmRzIEFycmF5QnVmZmVyVmlld0lucHV0Pihzb3VyY2U6IEl0ZXJhYmxlPFQ+IHwgVCk6IEl0ZXJhYmxlSXRlcmF0b3I8VWludDhBcnJheT4ge1xuXG4gICAgbGV0IGRvbmU6IGJvb2xlYW4sIHRocmV3ID0gZmFsc2U7XG4gICAgbGV0IGJ1ZmZlcnM6IFVpbnQ4QXJyYXlbXSA9IFtdLCBidWZmZXI6IFVpbnQ4QXJyYXk7XG4gICAgbGV0IGNtZDogJ3BlZWsnIHwgJ3JlYWQnLCBzaXplOiBudW1iZXIsIGJ1ZmZlckxlbmd0aCA9IDA7XG5cbiAgICBmdW5jdGlvbiBieXRlUmFuZ2UoKSB7XG4gICAgICAgIGlmIChjbWQgPT09ICdwZWVrJykge1xuICAgICAgICAgICAgcmV0dXJuIGpvaW5VaW50OEFycmF5cyhidWZmZXJzLnNsaWNlKCksIHNpemUpWzBdO1xuICAgICAgICB9XG4gICAgICAgIFtidWZmZXIsIGJ1ZmZlcnNdID0gam9pblVpbnQ4QXJyYXlzKGJ1ZmZlcnMsIHNpemUpO1xuICAgICAgICBidWZmZXJMZW5ndGggLT0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgfVxuXG4gICAgLy8gWWllbGQgc28gdGhlIGNhbGxlciBjYW4gaW5qZWN0IHRoZSByZWFkIGNvbW1hbmQgYmVmb3JlIGNyZWF0aW5nIHRoZSBzb3VyY2UgSXRlcmF0b3JcbiAgICAoeyBjbWQsIHNpemUgfSA9IHlpZWxkIDxhbnk+IG51bGwpO1xuXG4gICAgLy8gaW5pdGlhbGl6ZSB0aGUgaXRlcmF0b3JcbiAgICBsZXQgaXQgPSB0b1VpbnQ4QXJyYXlJdGVyYXRvcihzb3VyY2UpW1N5bWJvbC5pdGVyYXRvcl0oKTtcblxuICAgIHRyeSB7XG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIC8vIHJlYWQgdGhlIG5leHQgdmFsdWVcbiAgICAgICAgICAgICh7IGRvbmUsIHZhbHVlOiBidWZmZXIgfSA9IGlzTmFOKHNpemUgLSBidWZmZXJMZW5ndGgpID9cbiAgICAgICAgICAgICAgICBpdC5uZXh0KHVuZGVmaW5lZCkgOiBpdC5uZXh0KHNpemUgLSBidWZmZXJMZW5ndGgpKTtcbiAgICAgICAgICAgIC8vIGlmIGNodW5rIGlzIG5vdCBudWxsIG9yIGVtcHR5LCBwdXNoIGl0IG9udG8gdGhlIHF1ZXVlXG4gICAgICAgICAgICBpZiAoIWRvbmUgJiYgYnVmZmVyLmJ5dGVMZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVycy5wdXNoKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgYnVmZmVyTGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBlbm91Z2ggYnl0ZXMgaW4gb3VyIGJ1ZmZlciwgeWllbGQgY2h1bmtzIHVudGlsIHdlIGRvbid0XG4gICAgICAgICAgICBpZiAoZG9uZSB8fCBzaXplIDw9IGJ1ZmZlckxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCBieXRlUmFuZ2UoKSk7XG4gICAgICAgICAgICAgICAgfSB3aGlsZSAoc2l6ZSA8IGJ1ZmZlckxlbmd0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gd2hpbGUgKCFkb25lKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICh0aHJldyA9IHRydWUpICYmICh0eXBlb2YgaXQudGhyb3cgPT09ICdmdW5jdGlvbicpICYmIChpdC50aHJvdyhlKSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgKHRocmV3ID09PSBmYWxzZSkgJiYgKHR5cGVvZiBpdC5yZXR1cm4gPT09ICdmdW5jdGlvbicpICYmIChpdC5yZXR1cm4oKSk7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuYXN5bmMgZnVuY3Rpb24qIGZyb21Bc3luY0l0ZXJhYmxlPFQgZXh0ZW5kcyBBcnJheUJ1ZmZlclZpZXdJbnB1dD4oc291cmNlOiBBc3luY0l0ZXJhYmxlPFQ+IHwgUHJvbWlzZUxpa2U8VD4pOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8VWludDhBcnJheT4ge1xuXG4gICAgbGV0IGRvbmU6IGJvb2xlYW4sIHRocmV3ID0gZmFsc2U7XG4gICAgbGV0IGJ1ZmZlcnM6IFVpbnQ4QXJyYXlbXSA9IFtdLCBidWZmZXI6IFVpbnQ4QXJyYXk7XG4gICAgbGV0IGNtZDogJ3BlZWsnIHwgJ3JlYWQnLCBzaXplOiBudW1iZXIsIGJ1ZmZlckxlbmd0aCA9IDA7XG5cbiAgICBmdW5jdGlvbiBieXRlUmFuZ2UoKSB7XG4gICAgICAgIGlmIChjbWQgPT09ICdwZWVrJykge1xuICAgICAgICAgICAgcmV0dXJuIGpvaW5VaW50OEFycmF5cyhidWZmZXJzLnNsaWNlKCksIHNpemUpWzBdO1xuICAgICAgICB9XG4gICAgICAgIFtidWZmZXIsIGJ1ZmZlcnNdID0gam9pblVpbnQ4QXJyYXlzKGJ1ZmZlcnMsIHNpemUpO1xuICAgICAgICBidWZmZXJMZW5ndGggLT0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgfVxuXG4gICAgLy8gWWllbGQgc28gdGhlIGNhbGxlciBjYW4gaW5qZWN0IHRoZSByZWFkIGNvbW1hbmQgYmVmb3JlIGNyZWF0aW5nIHRoZSBzb3VyY2UgQXN5bmNJdGVyYXRvclxuICAgICh7IGNtZCwgc2l6ZSB9ID0geWllbGQgPGFueT4gbnVsbCk7XG5cbiAgICAvLyBpbml0aWFsaXplIHRoZSBpdGVyYXRvclxuICAgIGxldCBpdCA9IHRvVWludDhBcnJheUFzeW5jSXRlcmF0b3Ioc291cmNlKVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTtcblxuICAgIHRyeSB7XG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIC8vIHJlYWQgdGhlIG5leHQgdmFsdWVcbiAgICAgICAgICAgICh7IGRvbmUsIHZhbHVlOiBidWZmZXIgfSA9IGlzTmFOKHNpemUgLSBidWZmZXJMZW5ndGgpXG4gICAgICAgICAgICAgICAgPyBhd2FpdCBpdC5uZXh0KHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICA6IGF3YWl0IGl0Lm5leHQoc2l6ZSAtIGJ1ZmZlckxlbmd0aCkpO1xuICAgICAgICAgICAgLy8gaWYgY2h1bmsgaXMgbm90IG51bGwgb3IgZW1wdHksIHB1c2ggaXQgb250byB0aGUgcXVldWVcbiAgICAgICAgICAgIGlmICghZG9uZSAmJiBidWZmZXIuYnl0ZUxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBidWZmZXJzLnB1c2goYnVmZmVyKTtcbiAgICAgICAgICAgICAgICBidWZmZXJMZW5ndGggKz0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIGVub3VnaCBieXRlcyBpbiBvdXIgYnVmZmVyLCB5aWVsZCBjaHVua3MgdW50aWwgd2UgZG9uJ3RcbiAgICAgICAgICAgIGlmIChkb25lIHx8IHNpemUgPD0gYnVmZmVyTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgICAgICAoeyBjbWQsIHNpemUgfSA9IHlpZWxkIGJ5dGVSYW5nZSgpKTtcbiAgICAgICAgICAgICAgICB9IHdoaWxlIChzaXplIDwgYnVmZmVyTGVuZ3RoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSB3aGlsZSAoIWRvbmUpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgKHRocmV3ID0gdHJ1ZSkgJiYgKHR5cGVvZiBpdC50aHJvdyA9PT0gJ2Z1bmN0aW9uJykgJiYgKGF3YWl0IGl0LnRocm93KGUpKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgICAodGhyZXcgPT09IGZhbHNlKSAmJiAodHlwZW9mIGl0LnJldHVybiA9PT0gJ2Z1bmN0aW9uJykgJiYgKGF3YWl0IGl0LnJldHVybigpKTtcbiAgICB9XG59XG5cbi8vIEFsbCB0aGlzIG1hbnVhbCBVaW50OEFycmF5IGNodW5rIG1hbmFnZW1lbnQgY2FuIGJlIGF2b2lkZWQgaWYvd2hlbiBlbmdpbmVzXG4vLyBhZGQgc3VwcG9ydCBmb3IgQXJyYXlCdWZmZXIudHJhbnNmZXIoKSBvciBBcnJheUJ1ZmZlci5wcm90b3R5cGUucmVhbGxvYygpOlxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2RvbWVuaWMvcHJvcG9zYWwtYXJyYXlidWZmZXItdHJhbnNmZXJcbi8qKiBAaWdub3JlICovXG5hc3luYyBmdW5jdGlvbiogZnJvbVJlYWRhYmxlRE9NU3RyZWFtPFQgZXh0ZW5kcyBBcnJheUJ1ZmZlclZpZXdJbnB1dD4oc291cmNlOiBSZWFkYWJsZVN0cmVhbTxUPik6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxVaW50OEFycmF5PiB7XG5cbiAgICBsZXQgZG9uZSA9IGZhbHNlLCB0aHJldyA9IGZhbHNlO1xuICAgIGxldCBidWZmZXJzOiBVaW50OEFycmF5W10gPSBbXSwgYnVmZmVyOiBVaW50OEFycmF5O1xuICAgIGxldCBjbWQ6ICdwZWVrJyB8ICdyZWFkJywgc2l6ZTogbnVtYmVyLCBidWZmZXJMZW5ndGggPSAwO1xuXG4gICAgZnVuY3Rpb24gYnl0ZVJhbmdlKCkge1xuICAgICAgICBpZiAoY21kID09PSAncGVlaycpIHtcbiAgICAgICAgICAgIHJldHVybiBqb2luVWludDhBcnJheXMoYnVmZmVycy5zbGljZSgpLCBzaXplKVswXTtcbiAgICAgICAgfVxuICAgICAgICBbYnVmZmVyLCBidWZmZXJzXSA9IGpvaW5VaW50OEFycmF5cyhidWZmZXJzLCBzaXplKTtcbiAgICAgICAgYnVmZmVyTGVuZ3RoIC09IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8vIFlpZWxkIHNvIHRoZSBjYWxsZXIgY2FuIGluamVjdCB0aGUgcmVhZCBjb21tYW5kIGJlZm9yZSB3ZSBlc3RhYmxpc2ggdGhlIFJlYWRhYmxlU3RyZWFtIGxvY2tcbiAgICAoeyBjbWQsIHNpemUgfSA9IHlpZWxkIDxhbnk+IG51bGwpO1xuXG4gICAgLy8gaW5pdGlhbGl6ZSB0aGUgcmVhZGVyIGFuZCBsb2NrIHRoZSBzdHJlYW1cbiAgICBsZXQgaXQgPSBuZXcgQWRhcHRpdmVCeXRlUmVhZGVyKHNvdXJjZSk7XG5cbiAgICB0cnkge1xuICAgICAgICBkbyB7XG4gICAgICAgICAgICAvLyByZWFkIHRoZSBuZXh0IHZhbHVlXG4gICAgICAgICAgICAoeyBkb25lLCB2YWx1ZTogYnVmZmVyIH0gPSBpc05hTihzaXplIC0gYnVmZmVyTGVuZ3RoKVxuICAgICAgICAgICAgICAgID8gYXdhaXQgaXRbJ3JlYWQnXSh1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgOiBhd2FpdCBpdFsncmVhZCddKHNpemUgLSBidWZmZXJMZW5ndGgpKTtcbiAgICAgICAgICAgIC8vIGlmIGNodW5rIGlzIG5vdCBudWxsIG9yIGVtcHR5LCBwdXNoIGl0IG9udG8gdGhlIHF1ZXVlXG4gICAgICAgICAgICBpZiAoIWRvbmUgJiYgYnVmZmVyLmJ5dGVMZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVycy5wdXNoKHRvVWludDhBcnJheShidWZmZXIpKTtcbiAgICAgICAgICAgICAgICBidWZmZXJMZW5ndGggKz0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIGVub3VnaCBieXRlcyBpbiBvdXIgYnVmZmVyLCB5aWVsZCBjaHVua3MgdW50aWwgd2UgZG9uJ3RcbiAgICAgICAgICAgIGlmIChkb25lIHx8IHNpemUgPD0gYnVmZmVyTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgICAgICAoeyBjbWQsIHNpemUgfSA9IHlpZWxkIGJ5dGVSYW5nZSgpKTtcbiAgICAgICAgICAgICAgICB9IHdoaWxlIChzaXplIDwgYnVmZmVyTGVuZ3RoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSB3aGlsZSAoIWRvbmUpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgKHRocmV3ID0gdHJ1ZSkgJiYgKGF3YWl0IGl0WydjYW5jZWwnXShlKSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgc291cmNlWydsb2NrZWQnXSAmJiBpdC5yZWxlYXNlTG9jaygpO1xuICAgICAgICAodGhyZXcgPT09IGZhbHNlKSAmJiAoYXdhaXQgaXRbJ2NhbmNlbCddKCkpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmNsYXNzIEFkYXB0aXZlQnl0ZVJlYWRlcjxUIGV4dGVuZHMgQXJyYXlCdWZmZXJWaWV3SW5wdXQ+IHtcblxuICAgIHByaXZhdGUgc3VwcG9ydHNCWU9COiBib29sZWFuO1xuICAgIHByaXZhdGUgYnlvYlJlYWRlcjogUmVhZGFibGVTdHJlYW1CWU9CUmVhZGVyIHwgbnVsbCA9IG51bGw7XG4gICAgcHJpdmF0ZSBkZWZhdWx0UmVhZGVyOiBSZWFkYWJsZVN0cmVhbURlZmF1bHRSZWFkZXI8VD4gfCBudWxsID0gbnVsbDtcbiAgICBwcml2YXRlIHJlYWRlcjogUmVhZGFibGVTdHJlYW1CWU9CUmVhZGVyIHwgUmVhZGFibGVTdHJlYW1EZWZhdWx0UmVhZGVyPFQ+IHwgbnVsbDtcblxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgc291cmNlOiBSZWFkYWJsZVN0cmVhbTxUPikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5zdXBwb3J0c0JZT0IgPSAhISh0aGlzLnJlYWRlciA9IHRoaXMuZ2V0QllPQlJlYWRlcigpKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhpcy5zdXBwb3J0c0JZT0IgPSAhISEodGhpcy5yZWFkZXIgPSB0aGlzLmdldERlZmF1bHRSZWFkZXIoKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXQgY2xvc2VkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5yZWFkZXIgPyB0aGlzLnJlYWRlclsnY2xvc2VkJ10uY2F0Y2goKCkgPT4ge30pIDogUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuXG4gICAgcmVsZWFzZUxvY2soKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLnJlYWRlcikge1xuICAgICAgICAgICAgdGhpcy5yZWFkZXIucmVsZWFzZUxvY2soKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlYWRlciA9IHRoaXMuYnlvYlJlYWRlciA9IHRoaXMuZGVmYXVsdFJlYWRlciA9IG51bGw7XG4gICAgfVxuXG4gICAgYXN5bmMgY2FuY2VsKHJlYXNvbj86IGFueSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IHJlYWRlciB9ID0gdGhpcztcbiAgICAgICAgdGhpcy5yZWFkZXIgPSBudWxsO1xuICAgICAgICB0aGlzLnJlbGVhc2VMb2NrKCk7XG4gICAgICAgIGlmIChyZWFkZXIpIHtcbiAgICAgICAgICAgIGF3YWl0IHJlYWRlclsnY2FuY2VsJ10ocmVhc29uKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIHJlYWQoc2l6ZT86IG51bWJlcik6IFByb21pc2U8UmVhZGFibGVTdHJlYW1SZWFkUmVzdWx0PFVpbnQ4QXJyYXk+PiB7XG4gICAgICAgIGlmIChzaXplID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4geyBkb25lOiB0aGlzLnJlYWRlciA9PSBudWxsLCB2YWx1ZTogbmV3IFVpbnQ4QXJyYXkoMCkgfTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSAhdGhpcy5zdXBwb3J0c0JZT0IgfHwgdHlwZW9mIHNpemUgIT09ICdudW1iZXInXG4gICAgICAgICAgICA/IGF3YWl0IHRoaXMuZ2V0RGVmYXVsdFJlYWRlcigpLnJlYWQoKVxuICAgICAgICAgICAgOiBhd2FpdCB0aGlzLnJlYWRGcm9tQllPQlJlYWRlcihzaXplKTtcbiAgICAgICAgIXJlc3VsdC5kb25lICYmIChyZXN1bHQudmFsdWUgPSB0b1VpbnQ4QXJyYXkocmVzdWx0IGFzIFJlYWRhYmxlU3RyZWFtUmVhZFJlc3VsdDxVaW50OEFycmF5PikpO1xuICAgICAgICByZXR1cm4gcmVzdWx0IGFzIFJlYWRhYmxlU3RyZWFtUmVhZFJlc3VsdDxVaW50OEFycmF5PjtcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldERlZmF1bHRSZWFkZXIoKSB7XG4gICAgICAgIGlmICh0aGlzLmJ5b2JSZWFkZXIpIHsgdGhpcy5yZWxlYXNlTG9jaygpOyB9XG4gICAgICAgIGlmICghdGhpcy5kZWZhdWx0UmVhZGVyKSB7XG4gICAgICAgICAgICB0aGlzLmRlZmF1bHRSZWFkZXIgPSB0aGlzLnNvdXJjZVsnZ2V0UmVhZGVyJ10oKTtcbiAgICAgICAgICAgIC8vIFdlIGhhdmUgdG8gY2F0Y2ggYW5kIHN3YWxsb3cgZXJyb3JzIGhlcmUgdG8gYXZvaWQgdW5jYXVnaHQgcHJvbWlzZSByZWplY3Rpb24gZXhjZXB0aW9uc1xuICAgICAgICAgICAgLy8gdGhhdCBzZWVtIHRvIGJlIHJhaXNlZCB3aGVuIHdlIGNhbGwgYHJlbGVhc2VMb2NrKClgIG9uIHRoaXMgcmVhZGVyLiBJJ20gc3RpbGwgbXlzdGlmaWVkXG4gICAgICAgICAgICAvLyBhYm91dCB3aHkgdGhlc2UgZXJyb3JzIGFyZSByYWlzZWQsIGJ1dCBJJ20gc3VyZSB0aGVyZSdzIHNvbWUgaW1wb3J0YW50IHNwZWMgcmVhc29uIHRoYXRcbiAgICAgICAgICAgIC8vIEkgaGF2ZW4ndCBjb25zaWRlcmVkLiBJIGhhdGUgdG8gZW1wbG95IHN1Y2ggYW4gYW50aS1wYXR0ZXJuIGhlcmUsIGJ1dCBpdCBzZWVtcyBsaWtlIHRoZVxuICAgICAgICAgICAgLy8gb25seSBzb2x1dGlvbiBpbiB0aGlzIGNhc2UgOi9cbiAgICAgICAgICAgIHRoaXMuZGVmYXVsdFJlYWRlclsnY2xvc2VkJ10uY2F0Y2goKCkgPT4ge30pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAodGhpcy5yZWFkZXIgPSB0aGlzLmRlZmF1bHRSZWFkZXIpO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0QllPQlJlYWRlcigpIHtcbiAgICAgICAgaWYgKHRoaXMuZGVmYXVsdFJlYWRlcikgeyB0aGlzLnJlbGVhc2VMb2NrKCk7IH1cbiAgICAgICAgaWYgKCF0aGlzLmJ5b2JSZWFkZXIpIHtcbiAgICAgICAgICAgIHRoaXMuYnlvYlJlYWRlciA9IHRoaXMuc291cmNlWydnZXRSZWFkZXInXSh7IG1vZGU6ICdieW9iJyB9KTtcbiAgICAgICAgICAgIC8vIFdlIGhhdmUgdG8gY2F0Y2ggYW5kIHN3YWxsb3cgZXJyb3JzIGhlcmUgdG8gYXZvaWQgdW5jYXVnaHQgcHJvbWlzZSByZWplY3Rpb24gZXhjZXB0aW9uc1xuICAgICAgICAgICAgLy8gdGhhdCBzZWVtIHRvIGJlIHJhaXNlZCB3aGVuIHdlIGNhbGwgYHJlbGVhc2VMb2NrKClgIG9uIHRoaXMgcmVhZGVyLiBJJ20gc3RpbGwgbXlzdGlmaWVkXG4gICAgICAgICAgICAvLyBhYm91dCB3aHkgdGhlc2UgZXJyb3JzIGFyZSByYWlzZWQsIGJ1dCBJJ20gc3VyZSB0aGVyZSdzIHNvbWUgaW1wb3J0YW50IHNwZWMgcmVhc29uIHRoYXRcbiAgICAgICAgICAgIC8vIEkgaGF2ZW4ndCBjb25zaWRlcmVkLiBJIGhhdGUgdG8gZW1wbG95IHN1Y2ggYW4gYW50aS1wYXR0ZXJuIGhlcmUsIGJ1dCBpdCBzZWVtcyBsaWtlIHRoZVxuICAgICAgICAgICAgLy8gb25seSBzb2x1dGlvbiBpbiB0aGlzIGNhc2UgOi9cbiAgICAgICAgICAgIHRoaXMuYnlvYlJlYWRlclsnY2xvc2VkJ10uY2F0Y2goKCkgPT4ge30pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAodGhpcy5yZWFkZXIgPSB0aGlzLmJ5b2JSZWFkZXIpO1xuICAgIH1cblxuICAgIC8vIFRoaXMgc3RyYXRlZ3kgcGx1Y2tlZCBmcm9tIHRoZSBleGFtcGxlIGluIHRoZSBzdHJlYW1zIHNwZWM6XG4gICAgLy8gaHR0cHM6Ly9zdHJlYW1zLnNwZWMud2hhdHdnLm9yZy8jZXhhbXBsZS1tYW51YWwtcmVhZC1ieXRlc1xuICAgIHByaXZhdGUgYXN5bmMgcmVhZEZyb21CWU9CUmVhZGVyKHNpemU6IG51bWJlcikge1xuICAgICAgICByZXR1cm4gYXdhaXQgcmVhZEludG8odGhpcy5nZXRCWU9CUmVhZGVyKCksIG5ldyBBcnJheUJ1ZmZlcihzaXplKSwgMCwgc2l6ZSk7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuYXN5bmMgZnVuY3Rpb24gcmVhZEludG8ocmVhZGVyOiBSZWFkYWJsZVN0cmVhbUJZT0JSZWFkZXIsIGJ1ZmZlcjogQXJyYXlCdWZmZXJMaWtlLCBvZmZzZXQ6IG51bWJlciwgc2l6ZTogbnVtYmVyKTogUHJvbWlzZTxSZWFkYWJsZVN0cmVhbVJlYWRSZXN1bHQ8VWludDhBcnJheT4+IHtcbiAgICBpZiAob2Zmc2V0ID49IHNpemUpIHtcbiAgICAgICAgcmV0dXJuIHsgZG9uZTogZmFsc2UsIHZhbHVlOiBuZXcgVWludDhBcnJheShidWZmZXIsIDAsIHNpemUpIH07XG4gICAgfVxuICAgIGNvbnN0IHsgZG9uZSwgdmFsdWUgfSA9IGF3YWl0IHJlYWRlci5yZWFkKG5ldyBVaW50OEFycmF5KGJ1ZmZlciwgb2Zmc2V0LCBzaXplIC0gb2Zmc2V0KSk7XG4gICAgaWYgKCgob2Zmc2V0ICs9IHZhbHVlLmJ5dGVMZW5ndGgpIDwgc2l6ZSkgJiYgIWRvbmUpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHJlYWRJbnRvKHJlYWRlciwgdmFsdWUuYnVmZmVyLCBvZmZzZXQsIHNpemUpO1xuICAgIH1cbiAgICByZXR1cm4geyBkb25lLCB2YWx1ZTogbmV3IFVpbnQ4QXJyYXkodmFsdWUuYnVmZmVyLCAwLCBvZmZzZXQpIH07XG59XG5cbi8qKiBAaWdub3JlICovXG50eXBlIEV2ZW50TmFtZSA9ICdlbmQnIHwgJ2Vycm9yJyB8ICdyZWFkYWJsZSc7XG4vKiogQGlnbm9yZSAqL1xudHlwZSBFdmVudCA9IFtFdmVudE5hbWUsIChfOiBhbnkpID0+IHZvaWQsIFByb21pc2U8W0V2ZW50TmFtZSwgRXJyb3IgfCBudWxsXT5dO1xuLyoqIEBpZ25vcmUgKi9cbmNvbnN0IG9uRXZlbnQgPSA8VCBleHRlbmRzIHN0cmluZz4oc3RyZWFtOiBOb2RlSlMuUmVhZGFibGVTdHJlYW0sIGV2ZW50OiBUKSA9PiB7XG4gICAgbGV0IGhhbmRsZXIgPSAoXzogYW55KSA9PiByZXNvbHZlKFtldmVudCwgX10pO1xuICAgIGxldCByZXNvbHZlOiAodmFsdWU/OiBbVCwgYW55XSB8IFByb21pc2VMaWtlPFtULCBhbnldPikgPT4gdm9pZDtcbiAgICByZXR1cm4gW2V2ZW50LCBoYW5kbGVyLCBuZXcgUHJvbWlzZTxbVCwgYW55XT4oXG4gICAgICAgIChyKSA9PiAocmVzb2x2ZSA9IHIpICYmIHN0cmVhbVsnb25jZSddKGV2ZW50LCBoYW5kbGVyKVxuICAgICldIGFzIEV2ZW50O1xufTtcblxuLyoqIEBpZ25vcmUgKi9cbmFzeW5jIGZ1bmN0aW9uKiBmcm9tUmVhZGFibGVOb2RlU3RyZWFtKHN0cmVhbTogTm9kZUpTLlJlYWRhYmxlU3RyZWFtKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcblxuICAgIGxldCBldmVudHM6IEV2ZW50W10gPSBbXTtcbiAgICBsZXQgZXZlbnQ6IEV2ZW50TmFtZSA9ICdlcnJvcic7XG4gICAgbGV0IGRvbmUgPSBmYWxzZSwgZXJyOiBFcnJvciB8IG51bGwgPSBudWxsO1xuICAgIGxldCBjbWQ6ICdwZWVrJyB8ICdyZWFkJywgc2l6ZTogbnVtYmVyLCBidWZmZXJMZW5ndGggPSAwO1xuICAgIGxldCBidWZmZXJzOiBVaW50OEFycmF5W10gPSBbXSwgYnVmZmVyOiBVaW50OEFycmF5IHwgQnVmZmVyIHwgc3RyaW5nO1xuXG4gICAgZnVuY3Rpb24gYnl0ZVJhbmdlKCkge1xuICAgICAgICBpZiAoY21kID09PSAncGVlaycpIHtcbiAgICAgICAgICAgIHJldHVybiBqb2luVWludDhBcnJheXMoYnVmZmVycy5zbGljZSgpLCBzaXplKVswXTtcbiAgICAgICAgfVxuICAgICAgICBbYnVmZmVyLCBidWZmZXJzXSA9IGpvaW5VaW50OEFycmF5cyhidWZmZXJzLCBzaXplKTtcbiAgICAgICAgYnVmZmVyTGVuZ3RoIC09IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8vIFlpZWxkIHNvIHRoZSBjYWxsZXIgY2FuIGluamVjdCB0aGUgcmVhZCBjb21tYW5kIGJlZm9yZSB3ZVxuICAgIC8vIGFkZCB0aGUgbGlzdGVuZXIgZm9yIHRoZSBzb3VyY2Ugc3RyZWFtJ3MgJ3JlYWRhYmxlJyBldmVudC5cbiAgICAoeyBjbWQsIHNpemUgfSA9IHlpZWxkIDxhbnk+IG51bGwpO1xuXG4gICAgLy8gaWdub3JlIHN0ZGluIGlmIGl0J3MgYSBUVFlcbiAgICBpZiAoKHN0cmVhbSBhcyBhbnkpWydpc1RUWSddKSB7IHJldHVybiB5aWVsZCBuZXcgVWludDhBcnJheSgwKTsgfVxuXG4gICAgdHJ5IHtcbiAgICAgICAgLy8gaW5pdGlhbGl6ZSB0aGUgc3RyZWFtIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgIGV2ZW50c1swXSA9IG9uRXZlbnQoc3RyZWFtLCAnZW5kJyk7XG4gICAgICAgIGV2ZW50c1sxXSA9IG9uRXZlbnQoc3RyZWFtLCAnZXJyb3InKTtcblxuICAgICAgICBkbyB7XG4gICAgICAgICAgICBldmVudHNbMl0gPSBvbkV2ZW50KHN0cmVhbSwgJ3JlYWRhYmxlJyk7XG5cbiAgICAgICAgICAgIC8vIHdhaXQgb24gdGhlIGZpcnN0IG1lc3NhZ2UgZXZlbnQgZnJvbSB0aGUgc3RyZWFtXG4gICAgICAgICAgICBbZXZlbnQsIGVycl0gPSBhd2FpdCBQcm9taXNlLnJhY2UoZXZlbnRzLm1hcCgoeCkgPT4geFsyXSkpO1xuXG4gICAgICAgICAgICAvLyBpZiB0aGUgc3RyZWFtIGVtaXR0ZWQgYW4gRXJyb3IsIHJldGhyb3cgaXRcbiAgICAgICAgICAgIGlmIChldmVudCA9PT0gJ2Vycm9yJykgeyBicmVhazsgfVxuICAgICAgICAgICAgaWYgKCEoZG9uZSA9IGV2ZW50ID09PSAnZW5kJykpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgc2l6ZSBpcyBOYU4sIHJlcXVlc3QgdG8gcmVhZCBldmVyeXRoaW5nIGluIHRoZSBzdHJlYW0ncyBpbnRlcm5hbCBidWZmZXJcbiAgICAgICAgICAgICAgICBpZiAoIWlzRmluaXRlKHNpemUgLSBidWZmZXJMZW5ndGgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJ1ZmZlciA9IHRvVWludDhBcnJheShzdHJlYW1bJ3JlYWQnXSh1bmRlZmluZWQpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSB0b1VpbnQ4QXJyYXkoc3RyZWFtWydyZWFkJ10oc2l6ZSAtIGJ1ZmZlckxlbmd0aCkpO1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGUgYnl0ZUxlbmd0aCBpcyAwLCB0aGVuIHRoZSByZXF1ZXN0ZWQgYW1vdW50IGlzIG1vcmUgdGhhbiB0aGUgc3RyZWFtIGhhc1xuICAgICAgICAgICAgICAgICAgICAvLyBpbiBpdHMgaW50ZXJuYWwgYnVmZmVyLiBJbiB0aGlzIGNhc2UgdGhlIHN0cmVhbSBuZWVkcyBhIFwia2lja1wiIHRvIHRlbGwgaXQgdG9cbiAgICAgICAgICAgICAgICAgICAgLy8gY29udGludWUgZW1pdHRpbmcgcmVhZGFibGUgZXZlbnRzLCBzbyByZXF1ZXN0IHRvIHJlYWQgZXZlcnl0aGluZyB0aGUgc3RyZWFtXG4gICAgICAgICAgICAgICAgICAgIC8vIGhhcyBpbiBpdHMgaW50ZXJuYWwgYnVmZmVyIHJpZ2h0IG5vdy5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGJ1ZmZlci5ieXRlTGVuZ3RoIDwgKHNpemUgLSBidWZmZXJMZW5ndGgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSB0b1VpbnQ4QXJyYXkoc3RyZWFtWydyZWFkJ10odW5kZWZpbmVkKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gaWYgY2h1bmsgaXMgbm90IG51bGwgb3IgZW1wdHksIHB1c2ggaXQgb250byB0aGUgcXVldWVcbiAgICAgICAgICAgICAgICBpZiAoYnVmZmVyLmJ5dGVMZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGJ1ZmZlcnMucHVzaChidWZmZXIpO1xuICAgICAgICAgICAgICAgICAgICBidWZmZXJMZW5ndGggKz0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBlbm91Z2ggYnl0ZXMgaW4gb3VyIGJ1ZmZlciwgeWllbGQgY2h1bmtzIHVudGlsIHdlIGRvbid0XG4gICAgICAgICAgICBpZiAoZG9uZSB8fCBzaXplIDw9IGJ1ZmZlckxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCBieXRlUmFuZ2UoKSk7XG4gICAgICAgICAgICAgICAgfSB3aGlsZSAoc2l6ZSA8IGJ1ZmZlckxlbmd0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gd2hpbGUgKCFkb25lKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgICBhd2FpdCBjbGVhbnVwKGV2ZW50cywgZXZlbnQgPT09ICdlcnJvcicgPyBlcnIgOiBudWxsKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbGVhbnVwPFQgZXh0ZW5kcyBFcnJvciB8IG51bGwgfCB2b2lkPihldmVudHM6IEV2ZW50W10sIGVycj86IFQpIHtcbiAgICAgICAgYnVmZmVyID0gYnVmZmVycyA9IDxhbnk+IG51bGw7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxUPihhc3luYyAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtldnQsIGZuXSBvZiBldmVudHMpIHtcbiAgICAgICAgICAgICAgICBzdHJlYW1bJ29mZiddKGV2dCwgZm4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgW2V2dCwgZm4sIGNsb3NlZF0gPSBvbkV2ZW50KHN0cmVhbSwgJ2Nsb3NlJyk7XG4gICAgICAgICAgICBjb25zdCBkZXN0cm95ZWQgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGVzdHJveSA9IChzdHJlYW0gYXMgYW55KVsnZGVzdHJveSddIHx8ICgoZTogVCwgY2I6IGFueSkgPT4gY2IoZSkpO1xuICAgICAgICAgICAgICAgIGRlc3Ryb3kuY2FsbChzdHJlYW0sIGVyciwgKGU6IFQpID0+IGUgIT0gbnVsbCA/IHJlamVjdChlKSA6IHJlc29sdmUoKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgUHJvbWlzZS5yYWNlKFtjbG9zZWQsIGRlc3Ryb3llZF0pO1xuICAgICAgICAgICAgICAgIGVyciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHsgZXJyID0gZSB8fCBlcnI7IH0gZmluYWxseSB7XG4gICAgICAgICAgICAgICAgc3RyZWFtWydvZmYnXShldnQsIGZuKTtcbiAgICAgICAgICAgICAgICBlcnIgIT0gbnVsbCA/IHJlamVjdChlcnIpIDogcmVzb2x2ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59XG4iXX0=

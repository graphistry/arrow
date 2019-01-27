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
            return joinUint8Arrays(buffers, size)[0];
        }
        [buffer, buffers, bufferLength] = joinUint8Arrays(buffers, size);
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
            return joinUint8Arrays(buffers, size)[0];
        }
        [buffer, buffers, bufferLength] = joinUint8Arrays(buffers, size);
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
            return joinUint8Arrays(buffers, size)[0];
        }
        [buffer, buffers, bufferLength] = joinUint8Arrays(buffers, size);
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
            return joinUint8Arrays(buffers, size)[0];
        }
        [buffer, buffers, bufferLength] = joinUint8Arrays(buffers, size);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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RTtLQUNuQjtZQUFTO1FBQ04sTUFBTSxPQUFPLENBQUMsTUFBTSxFQUFFLEtBQUssS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDekQ7SUFFRCxTQUFTLE9BQU8sQ0FBZ0MsTUFBZSxFQUFFLEdBQU87UUFDcEUsTUFBTSxHQUFHLE9BQU8sR0FBUyxJQUFJLENBQUM7UUFDOUIsT0FBTyxJQUFJLE9BQU8sQ0FBSSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQzVDLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxNQUFNLEVBQUU7Z0JBQzVCLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUM7YUFDMUI7WUFDRCxJQUFJO2dCQUNBLCtEQUErRDtnQkFDL0Qsa0VBQWtFO2dCQUNsRSxrRUFBa0U7Z0JBQ2xFLE1BQU0sT0FBTyxHQUFJLE1BQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDM0MsT0FBTyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUNyQyxHQUFHLEdBQUcsU0FBUyxDQUFDO2FBQ25CO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQUUsR0FBRyxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUM7YUFBRTtvQkFBUztnQkFDcEMsR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQzthQUN6QztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztBQUNMLENBQUMiLCJmaWxlIjoiaW8vYWRhcHRlcnMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHtcbiAgICB0b1VpbnQ4QXJyYXksXG4gICAgam9pblVpbnQ4QXJyYXlzLFxuICAgIEFycmF5QnVmZmVyVmlld0lucHV0LFxuICAgIHRvVWludDhBcnJheUl0ZXJhdG9yLFxuICAgIHRvVWludDhBcnJheUFzeW5jSXRlcmF0b3Jcbn0gZnJvbSAnLi4vdXRpbC9idWZmZXInO1xuXG5pbXBvcnQgeyBSZWFkYWJsZURPTVN0cmVhbU9wdGlvbnMgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGRlZmF1bHQge1xuICAgIGZyb21JdGVyYWJsZTxUIGV4dGVuZHMgQXJyYXlCdWZmZXJWaWV3SW5wdXQ+KHNvdXJjZTogSXRlcmFibGU8VD4gfCBUKTogSXRlcmFibGVJdGVyYXRvcjxVaW50OEFycmF5PiB7XG4gICAgICAgIHJldHVybiBwdW1wKGZyb21JdGVyYWJsZTxUPihzb3VyY2UpKTtcbiAgICB9LFxuICAgIGZyb21Bc3luY0l0ZXJhYmxlPFQgZXh0ZW5kcyBBcnJheUJ1ZmZlclZpZXdJbnB1dD4oc291cmNlOiBBc3luY0l0ZXJhYmxlPFQ+IHwgUHJvbWlzZUxpa2U8VD4pOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8VWludDhBcnJheT4ge1xuICAgICAgICByZXR1cm4gcHVtcChmcm9tQXN5bmNJdGVyYWJsZTxUPihzb3VyY2UpKTtcbiAgICB9LFxuICAgIGZyb21ET01TdHJlYW08VCBleHRlbmRzIEFycmF5QnVmZmVyVmlld0lucHV0Pihzb3VyY2U6IFJlYWRhYmxlU3RyZWFtPFQ+KTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcbiAgICAgICAgcmV0dXJuIHB1bXAoZnJvbURPTVN0cmVhbTxUPihzb3VyY2UpKTtcbiAgICB9LFxuICAgIGZyb21Ob2RlU3RyZWFtKHN0cmVhbTogTm9kZUpTLlJlYWRhYmxlU3RyZWFtKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcbiAgICAgICAgcmV0dXJuIHB1bXAoZnJvbU5vZGVTdHJlYW0oc3RyZWFtKSk7XG4gICAgfSxcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgdG9ET01TdHJlYW08VD4oc291cmNlOiBJdGVyYWJsZTxUPiB8IEFzeW5jSXRlcmFibGU8VD4sIG9wdGlvbnM/OiBSZWFkYWJsZURPTVN0cmVhbU9wdGlvbnMpOiBSZWFkYWJsZVN0cmVhbTxUPiB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgXCJ0b0RPTVN0cmVhbVwiIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBlbnZpcm9ubWVudGApO1xuICAgIH0sXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHRvTm9kZVN0cmVhbTxUPihzb3VyY2U6IEl0ZXJhYmxlPFQ+IHwgQXN5bmNJdGVyYWJsZTxUPiwgb3B0aW9ucz86IGltcG9ydCgnc3RyZWFtJykuUmVhZGFibGVPcHRpb25zKTogaW1wb3J0KCdzdHJlYW0nKS5SZWFkYWJsZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgXCJ0b05vZGVTdHJlYW1cIiBub3QgYXZhaWxhYmxlIGluIHRoaXMgZW52aXJvbm1lbnRgKTtcbiAgICB9LFxufTtcblxuLyoqIEBpZ25vcmUgKi9cbmNvbnN0IHB1bXAgPSA8VCBleHRlbmRzIEl0ZXJhdG9yPGFueT4gfCBBc3luY0l0ZXJhdG9yPGFueT4+KGl0ZXJhdG9yOiBUKSA9PiB7IGl0ZXJhdG9yLm5leHQoKTsgcmV0dXJuIGl0ZXJhdG9yOyB9O1xuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24qIGZyb21JdGVyYWJsZTxUIGV4dGVuZHMgQXJyYXlCdWZmZXJWaWV3SW5wdXQ+KHNvdXJjZTogSXRlcmFibGU8VD4gfCBUKTogSXRlcmFibGVJdGVyYXRvcjxVaW50OEFycmF5PiB7XG5cbiAgICBsZXQgZG9uZTogYm9vbGVhbiwgdGhyZXcgPSBmYWxzZTtcbiAgICBsZXQgYnVmZmVyczogVWludDhBcnJheVtdID0gW10sIGJ1ZmZlcjogVWludDhBcnJheTtcbiAgICBsZXQgY21kOiAncGVlaycgfCAncmVhZCcsIHNpemU6IG51bWJlciwgYnVmZmVyTGVuZ3RoID0gMDtcblxuICAgIGZ1bmN0aW9uIGJ5dGVSYW5nZSgpIHtcbiAgICAgICAgaWYgKGNtZCA9PT0gJ3BlZWsnKSB7XG4gICAgICAgICAgICByZXR1cm4gam9pblVpbnQ4QXJyYXlzKGJ1ZmZlcnMsIHNpemUpWzBdO1xuICAgICAgICB9XG4gICAgICAgIFtidWZmZXIsIGJ1ZmZlcnMsIGJ1ZmZlckxlbmd0aF0gPSBqb2luVWludDhBcnJheXMoYnVmZmVycywgc2l6ZSk7XG4gICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgfVxuXG4gICAgLy8gWWllbGQgc28gdGhlIGNhbGxlciBjYW4gaW5qZWN0IHRoZSByZWFkIGNvbW1hbmQgYmVmb3JlIGNyZWF0aW5nIHRoZSBzb3VyY2UgSXRlcmF0b3JcbiAgICAoeyBjbWQsIHNpemUgfSA9IHlpZWxkIDxhbnk+IG51bGwpO1xuXG4gICAgLy8gaW5pdGlhbGl6ZSB0aGUgaXRlcmF0b3JcbiAgICBsZXQgaXQgPSB0b1VpbnQ4QXJyYXlJdGVyYXRvcihzb3VyY2UpW1N5bWJvbC5pdGVyYXRvcl0oKTtcblxuICAgIHRyeSB7XG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIC8vIHJlYWQgdGhlIG5leHQgdmFsdWVcbiAgICAgICAgICAgICh7IGRvbmUsIHZhbHVlOiBidWZmZXIgfSA9IGlzTmFOKHNpemUgLSBidWZmZXJMZW5ndGgpID9cbiAgICAgICAgICAgICAgICBpdC5uZXh0KHVuZGVmaW5lZCkgOiBpdC5uZXh0KHNpemUgLSBidWZmZXJMZW5ndGgpKTtcbiAgICAgICAgICAgIC8vIGlmIGNodW5rIGlzIG5vdCBudWxsIG9yIGVtcHR5LCBwdXNoIGl0IG9udG8gdGhlIHF1ZXVlXG4gICAgICAgICAgICBpZiAoIWRvbmUgJiYgYnVmZmVyLmJ5dGVMZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVycy5wdXNoKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgYnVmZmVyTGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBlbm91Z2ggYnl0ZXMgaW4gb3VyIGJ1ZmZlciwgeWllbGQgY2h1bmtzIHVudGlsIHdlIGRvbid0XG4gICAgICAgICAgICBpZiAoZG9uZSB8fCBzaXplIDw9IGJ1ZmZlckxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCBieXRlUmFuZ2UoKSk7XG4gICAgICAgICAgICAgICAgfSB3aGlsZSAoc2l6ZSA8IGJ1ZmZlckxlbmd0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gd2hpbGUgKCFkb25lKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICh0aHJldyA9IHRydWUpICYmICh0eXBlb2YgaXQudGhyb3cgPT09ICdmdW5jdGlvbicpICYmIChpdC50aHJvdyhlKSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgKHRocmV3ID09PSBmYWxzZSkgJiYgKHR5cGVvZiBpdC5yZXR1cm4gPT09ICdmdW5jdGlvbicpICYmIChpdC5yZXR1cm4oKSk7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuYXN5bmMgZnVuY3Rpb24qIGZyb21Bc3luY0l0ZXJhYmxlPFQgZXh0ZW5kcyBBcnJheUJ1ZmZlclZpZXdJbnB1dD4oc291cmNlOiBBc3luY0l0ZXJhYmxlPFQ+IHwgUHJvbWlzZUxpa2U8VD4pOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8VWludDhBcnJheT4ge1xuXG4gICAgbGV0IGRvbmU6IGJvb2xlYW4sIHRocmV3ID0gZmFsc2U7XG4gICAgbGV0IGJ1ZmZlcnM6IFVpbnQ4QXJyYXlbXSA9IFtdLCBidWZmZXI6IFVpbnQ4QXJyYXk7XG4gICAgbGV0IGNtZDogJ3BlZWsnIHwgJ3JlYWQnLCBzaXplOiBudW1iZXIsIGJ1ZmZlckxlbmd0aCA9IDA7XG5cbiAgICBmdW5jdGlvbiBieXRlUmFuZ2UoKSB7XG4gICAgICAgIGlmIChjbWQgPT09ICdwZWVrJykge1xuICAgICAgICAgICAgcmV0dXJuIGpvaW5VaW50OEFycmF5cyhidWZmZXJzLCBzaXplKVswXTtcbiAgICAgICAgfVxuICAgICAgICBbYnVmZmVyLCBidWZmZXJzLCBidWZmZXJMZW5ndGhdID0gam9pblVpbnQ4QXJyYXlzKGJ1ZmZlcnMsIHNpemUpO1xuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8vIFlpZWxkIHNvIHRoZSBjYWxsZXIgY2FuIGluamVjdCB0aGUgcmVhZCBjb21tYW5kIGJlZm9yZSBjcmVhdGluZyB0aGUgc291cmNlIEFzeW5jSXRlcmF0b3JcbiAgICAoeyBjbWQsIHNpemUgfSA9IHlpZWxkIDxhbnk+IG51bGwpO1xuXG4gICAgLy8gaW5pdGlhbGl6ZSB0aGUgaXRlcmF0b3JcbiAgICBsZXQgaXQgPSB0b1VpbnQ4QXJyYXlBc3luY0l0ZXJhdG9yKHNvdXJjZSlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk7XG5cbiAgICB0cnkge1xuICAgICAgICBkbyB7XG4gICAgICAgICAgICAvLyByZWFkIHRoZSBuZXh0IHZhbHVlXG4gICAgICAgICAgICAoeyBkb25lLCB2YWx1ZTogYnVmZmVyIH0gPSBpc05hTihzaXplIC0gYnVmZmVyTGVuZ3RoKVxuICAgICAgICAgICAgICAgID8gYXdhaXQgaXQubmV4dCh1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgOiBhd2FpdCBpdC5uZXh0KHNpemUgLSBidWZmZXJMZW5ndGgpKTtcbiAgICAgICAgICAgIC8vIGlmIGNodW5rIGlzIG5vdCBudWxsIG9yIGVtcHR5LCBwdXNoIGl0IG9udG8gdGhlIHF1ZXVlXG4gICAgICAgICAgICBpZiAoIWRvbmUgJiYgYnVmZmVyLmJ5dGVMZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVycy5wdXNoKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgYnVmZmVyTGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBlbm91Z2ggYnl0ZXMgaW4gb3VyIGJ1ZmZlciwgeWllbGQgY2h1bmtzIHVudGlsIHdlIGRvbid0XG4gICAgICAgICAgICBpZiAoZG9uZSB8fCBzaXplIDw9IGJ1ZmZlckxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCBieXRlUmFuZ2UoKSk7XG4gICAgICAgICAgICAgICAgfSB3aGlsZSAoc2l6ZSA8IGJ1ZmZlckxlbmd0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gd2hpbGUgKCFkb25lKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICh0aHJldyA9IHRydWUpICYmICh0eXBlb2YgaXQudGhyb3cgPT09ICdmdW5jdGlvbicpICYmIChhd2FpdCBpdC50aHJvdyhlKSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgKHRocmV3ID09PSBmYWxzZSkgJiYgKHR5cGVvZiBpdC5yZXR1cm4gPT09ICdmdW5jdGlvbicpICYmIChhd2FpdCBpdC5yZXR1cm4oKSk7XG4gICAgfVxufVxuXG4vLyBBbGwgdGhpcyBtYW51YWwgVWludDhBcnJheSBjaHVuayBtYW5hZ2VtZW50IGNhbiBiZSBhdm9pZGVkIGlmL3doZW4gZW5naW5lc1xuLy8gYWRkIHN1cHBvcnQgZm9yIEFycmF5QnVmZmVyLnRyYW5zZmVyKCkgb3IgQXJyYXlCdWZmZXIucHJvdG90eXBlLnJlYWxsb2MoKTpcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9kb21lbmljL3Byb3Bvc2FsLWFycmF5YnVmZmVyLXRyYW5zZmVyXG4vKiogQGlnbm9yZSAqL1xuYXN5bmMgZnVuY3Rpb24qIGZyb21ET01TdHJlYW08VCBleHRlbmRzIEFycmF5QnVmZmVyVmlld0lucHV0Pihzb3VyY2U6IFJlYWRhYmxlU3RyZWFtPFQ+KTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcblxuICAgIGxldCBkb25lID0gZmFsc2UsIHRocmV3ID0gZmFsc2U7XG4gICAgbGV0IGJ1ZmZlcnM6IFVpbnQ4QXJyYXlbXSA9IFtdLCBidWZmZXI6IFVpbnQ4QXJyYXk7XG4gICAgbGV0IGNtZDogJ3BlZWsnIHwgJ3JlYWQnLCBzaXplOiBudW1iZXIsIGJ1ZmZlckxlbmd0aCA9IDA7XG5cbiAgICBmdW5jdGlvbiBieXRlUmFuZ2UoKSB7XG4gICAgICAgIGlmIChjbWQgPT09ICdwZWVrJykge1xuICAgICAgICAgICAgcmV0dXJuIGpvaW5VaW50OEFycmF5cyhidWZmZXJzLCBzaXplKVswXTtcbiAgICAgICAgfVxuICAgICAgICBbYnVmZmVyLCBidWZmZXJzLCBidWZmZXJMZW5ndGhdID0gam9pblVpbnQ4QXJyYXlzKGJ1ZmZlcnMsIHNpemUpO1xuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8vIFlpZWxkIHNvIHRoZSBjYWxsZXIgY2FuIGluamVjdCB0aGUgcmVhZCBjb21tYW5kIGJlZm9yZSB3ZSBlc3RhYmxpc2ggdGhlIFJlYWRhYmxlU3RyZWFtIGxvY2tcbiAgICAoeyBjbWQsIHNpemUgfSA9IHlpZWxkIDxhbnk+IG51bGwpO1xuXG4gICAgLy8gaW5pdGlhbGl6ZSB0aGUgcmVhZGVyIGFuZCBsb2NrIHRoZSBzdHJlYW1cbiAgICBsZXQgaXQgPSBuZXcgQWRhcHRpdmVCeXRlUmVhZGVyKHNvdXJjZSk7XG5cbiAgICB0cnkge1xuICAgICAgICBkbyB7XG4gICAgICAgICAgICAvLyByZWFkIHRoZSBuZXh0IHZhbHVlXG4gICAgICAgICAgICAoeyBkb25lLCB2YWx1ZTogYnVmZmVyIH0gPSBpc05hTihzaXplIC0gYnVmZmVyTGVuZ3RoKVxuICAgICAgICAgICAgICAgID8gYXdhaXQgaXRbJ3JlYWQnXSh1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgOiBhd2FpdCBpdFsncmVhZCddKHNpemUgLSBidWZmZXJMZW5ndGgpKTtcbiAgICAgICAgICAgIC8vIGlmIGNodW5rIGlzIG5vdCBudWxsIG9yIGVtcHR5LCBwdXNoIGl0IG9udG8gdGhlIHF1ZXVlXG4gICAgICAgICAgICBpZiAoIWRvbmUgJiYgYnVmZmVyLmJ5dGVMZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVycy5wdXNoKHRvVWludDhBcnJheShidWZmZXIpKTtcbiAgICAgICAgICAgICAgICBidWZmZXJMZW5ndGggKz0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIGVub3VnaCBieXRlcyBpbiBvdXIgYnVmZmVyLCB5aWVsZCBjaHVua3MgdW50aWwgd2UgZG9uJ3RcbiAgICAgICAgICAgIGlmIChkb25lIHx8IHNpemUgPD0gYnVmZmVyTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgICAgICAoeyBjbWQsIHNpemUgfSA9IHlpZWxkIGJ5dGVSYW5nZSgpKTtcbiAgICAgICAgICAgICAgICB9IHdoaWxlIChzaXplIDwgYnVmZmVyTGVuZ3RoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSB3aGlsZSAoIWRvbmUpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgKHRocmV3ID0gdHJ1ZSkgJiYgKGF3YWl0IGl0WydjYW5jZWwnXShlKSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgKHRocmV3ID09PSBmYWxzZSkgPyAoYXdhaXQgaXRbJ2NhbmNlbCddKCkpXG4gICAgICAgICAgICA6IHNvdXJjZVsnbG9ja2VkJ10gJiYgaXQucmVsZWFzZUxvY2soKTtcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5jbGFzcyBBZGFwdGl2ZUJ5dGVSZWFkZXI8VCBleHRlbmRzIEFycmF5QnVmZmVyVmlld0lucHV0PiB7XG5cbiAgICBwcml2YXRlIHN1cHBvcnRzQllPQjogYm9vbGVhbjtcbiAgICBwcml2YXRlIGJ5b2JSZWFkZXI6IFJlYWRhYmxlU3RyZWFtQllPQlJlYWRlciB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgZGVmYXVsdFJlYWRlcjogUmVhZGFibGVTdHJlYW1EZWZhdWx0UmVhZGVyPFQ+IHwgbnVsbCA9IG51bGw7XG4gICAgcHJpdmF0ZSByZWFkZXI6IFJlYWRhYmxlU3RyZWFtQllPQlJlYWRlciB8IFJlYWRhYmxlU3RyZWFtRGVmYXVsdFJlYWRlcjxUPiB8IG51bGw7XG5cbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHNvdXJjZTogUmVhZGFibGVTdHJlYW08VD4pIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuc3VwcG9ydHNCWU9CID0gISEodGhpcy5yZWFkZXIgPSB0aGlzLmdldEJZT0JSZWFkZXIoKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMuc3VwcG9ydHNCWU9CID0gISEhKHRoaXMucmVhZGVyID0gdGhpcy5nZXREZWZhdWx0UmVhZGVyKCkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0IGNsb3NlZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVhZGVyID8gdGhpcy5yZWFkZXJbJ2Nsb3NlZCddLmNhdGNoKCgpID0+IHt9KSA6IFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxuICAgIHJlbGVhc2VMb2NrKCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5yZWFkZXIpIHtcbiAgICAgICAgICAgIHRoaXMucmVhZGVyLnJlbGVhc2VMb2NrKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZWFkZXIgPSB0aGlzLmJ5b2JSZWFkZXIgPSB0aGlzLmRlZmF1bHRSZWFkZXIgPSBudWxsO1xuICAgIH1cblxuICAgIGFzeW5jIGNhbmNlbChyZWFzb24/OiBhbnkpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyByZWFkZXIsIHNvdXJjZSB9ID0gdGhpcztcbiAgICAgICAgcmVhZGVyICYmIChhd2FpdCByZWFkZXJbJ2NhbmNlbCddKHJlYXNvbikpO1xuICAgICAgICBzb3VyY2UgJiYgKHNvdXJjZVsnbG9ja2VkJ10gJiYgdGhpcy5yZWxlYXNlTG9jaygpKTtcbiAgICB9XG5cbiAgICBhc3luYyByZWFkKHNpemU/OiBudW1iZXIpOiBQcm9taXNlPFJlYWRhYmxlU3RyZWFtUmVhZFJlc3VsdDxVaW50OEFycmF5Pj4ge1xuICAgICAgICBpZiAoc2l6ZSA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgZG9uZTogdGhpcy5yZWFkZXIgPT0gbnVsbCwgdmFsdWU6IG5ldyBVaW50OEFycmF5KDApIH07XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gIXRoaXMuc3VwcG9ydHNCWU9CIHx8IHR5cGVvZiBzaXplICE9PSAnbnVtYmVyJ1xuICAgICAgICAgICAgPyBhd2FpdCB0aGlzLmdldERlZmF1bHRSZWFkZXIoKS5yZWFkKClcbiAgICAgICAgICAgIDogYXdhaXQgdGhpcy5yZWFkRnJvbUJZT0JSZWFkZXIoc2l6ZSk7XG4gICAgICAgICFyZXN1bHQuZG9uZSAmJiAocmVzdWx0LnZhbHVlID0gdG9VaW50OEFycmF5KHJlc3VsdCBhcyBSZWFkYWJsZVN0cmVhbVJlYWRSZXN1bHQ8VWludDhBcnJheT4pKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdCBhcyBSZWFkYWJsZVN0cmVhbVJlYWRSZXN1bHQ8VWludDhBcnJheT47XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXREZWZhdWx0UmVhZGVyKCkge1xuICAgICAgICBpZiAodGhpcy5ieW9iUmVhZGVyKSB7IHRoaXMucmVsZWFzZUxvY2soKTsgfVxuICAgICAgICBpZiAoIXRoaXMuZGVmYXVsdFJlYWRlcikge1xuICAgICAgICAgICAgdGhpcy5kZWZhdWx0UmVhZGVyID0gdGhpcy5zb3VyY2VbJ2dldFJlYWRlciddKCk7XG4gICAgICAgICAgICAvLyBXZSBoYXZlIHRvIGNhdGNoIGFuZCBzd2FsbG93IGVycm9ycyBoZXJlIHRvIGF2b2lkIHVuY2F1Z2h0IHByb21pc2UgcmVqZWN0aW9uIGV4Y2VwdGlvbnNcbiAgICAgICAgICAgIC8vIHRoYXQgc2VlbSB0byBiZSByYWlzZWQgd2hlbiB3ZSBjYWxsIGByZWxlYXNlTG9jaygpYCBvbiB0aGlzIHJlYWRlci4gSSdtIHN0aWxsIG15c3RpZmllZFxuICAgICAgICAgICAgLy8gYWJvdXQgd2h5IHRoZXNlIGVycm9ycyBhcmUgcmFpc2VkLCBidXQgSSdtIHN1cmUgdGhlcmUncyBzb21lIGltcG9ydGFudCBzcGVjIHJlYXNvbiB0aGF0XG4gICAgICAgICAgICAvLyBJIGhhdmVuJ3QgY29uc2lkZXJlZC4gSSBoYXRlIHRvIGVtcGxveSBzdWNoIGFuIGFudGktcGF0dGVybiBoZXJlLCBidXQgaXQgc2VlbXMgbGlrZSB0aGVcbiAgICAgICAgICAgIC8vIG9ubHkgc29sdXRpb24gaW4gdGhpcyBjYXNlIDovXG4gICAgICAgICAgICB0aGlzLmRlZmF1bHRSZWFkZXJbJ2Nsb3NlZCddLmNhdGNoKCgpID0+IHt9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKHRoaXMucmVhZGVyID0gdGhpcy5kZWZhdWx0UmVhZGVyKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldEJZT0JSZWFkZXIoKSB7XG4gICAgICAgIGlmICh0aGlzLmRlZmF1bHRSZWFkZXIpIHsgdGhpcy5yZWxlYXNlTG9jaygpOyB9XG4gICAgICAgIGlmICghdGhpcy5ieW9iUmVhZGVyKSB7XG4gICAgICAgICAgICB0aGlzLmJ5b2JSZWFkZXIgPSB0aGlzLnNvdXJjZVsnZ2V0UmVhZGVyJ10oeyBtb2RlOiAnYnlvYicgfSk7XG4gICAgICAgICAgICAvLyBXZSBoYXZlIHRvIGNhdGNoIGFuZCBzd2FsbG93IGVycm9ycyBoZXJlIHRvIGF2b2lkIHVuY2F1Z2h0IHByb21pc2UgcmVqZWN0aW9uIGV4Y2VwdGlvbnNcbiAgICAgICAgICAgIC8vIHRoYXQgc2VlbSB0byBiZSByYWlzZWQgd2hlbiB3ZSBjYWxsIGByZWxlYXNlTG9jaygpYCBvbiB0aGlzIHJlYWRlci4gSSdtIHN0aWxsIG15c3RpZmllZFxuICAgICAgICAgICAgLy8gYWJvdXQgd2h5IHRoZXNlIGVycm9ycyBhcmUgcmFpc2VkLCBidXQgSSdtIHN1cmUgdGhlcmUncyBzb21lIGltcG9ydGFudCBzcGVjIHJlYXNvbiB0aGF0XG4gICAgICAgICAgICAvLyBJIGhhdmVuJ3QgY29uc2lkZXJlZC4gSSBoYXRlIHRvIGVtcGxveSBzdWNoIGFuIGFudGktcGF0dGVybiBoZXJlLCBidXQgaXQgc2VlbXMgbGlrZSB0aGVcbiAgICAgICAgICAgIC8vIG9ubHkgc29sdXRpb24gaW4gdGhpcyBjYXNlIDovXG4gICAgICAgICAgICB0aGlzLmJ5b2JSZWFkZXJbJ2Nsb3NlZCddLmNhdGNoKCgpID0+IHt9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKHRoaXMucmVhZGVyID0gdGhpcy5ieW9iUmVhZGVyKTtcbiAgICB9XG5cbiAgICAvLyBUaGlzIHN0cmF0ZWd5IHBsdWNrZWQgZnJvbSB0aGUgZXhhbXBsZSBpbiB0aGUgc3RyZWFtcyBzcGVjOlxuICAgIC8vIGh0dHBzOi8vc3RyZWFtcy5zcGVjLndoYXR3Zy5vcmcvI2V4YW1wbGUtbWFudWFsLXJlYWQtYnl0ZXNcbiAgICBwcml2YXRlIGFzeW5jIHJlYWRGcm9tQllPQlJlYWRlcihzaXplOiBudW1iZXIpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHJlYWRJbnRvKHRoaXMuZ2V0QllPQlJlYWRlcigpLCBuZXcgQXJyYXlCdWZmZXIoc2l6ZSksIDAsIHNpemUpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmFzeW5jIGZ1bmN0aW9uIHJlYWRJbnRvKHJlYWRlcjogUmVhZGFibGVTdHJlYW1CWU9CUmVhZGVyLCBidWZmZXI6IEFycmF5QnVmZmVyTGlrZSwgb2Zmc2V0OiBudW1iZXIsIHNpemU6IG51bWJlcik6IFByb21pc2U8UmVhZGFibGVTdHJlYW1SZWFkUmVzdWx0PFVpbnQ4QXJyYXk+PiB7XG4gICAgaWYgKG9mZnNldCA+PSBzaXplKSB7XG4gICAgICAgIHJldHVybiB7IGRvbmU6IGZhbHNlLCB2YWx1ZTogbmV3IFVpbnQ4QXJyYXkoYnVmZmVyLCAwLCBzaXplKSB9O1xuICAgIH1cbiAgICBjb25zdCB7IGRvbmUsIHZhbHVlIH0gPSBhd2FpdCByZWFkZXIucmVhZChuZXcgVWludDhBcnJheShidWZmZXIsIG9mZnNldCwgc2l6ZSAtIG9mZnNldCkpO1xuICAgIGlmICgoKG9mZnNldCArPSB2YWx1ZS5ieXRlTGVuZ3RoKSA8IHNpemUpICYmICFkb25lKSB7XG4gICAgICAgIHJldHVybiBhd2FpdCByZWFkSW50byhyZWFkZXIsIHZhbHVlLmJ1ZmZlciwgb2Zmc2V0LCBzaXplKTtcbiAgICB9XG4gICAgcmV0dXJuIHsgZG9uZSwgdmFsdWU6IG5ldyBVaW50OEFycmF5KHZhbHVlLmJ1ZmZlciwgMCwgb2Zmc2V0KSB9O1xufVxuXG4vKiogQGlnbm9yZSAqL1xudHlwZSBFdmVudE5hbWUgPSAnZW5kJyB8ICdlcnJvcicgfCAncmVhZGFibGUnO1xuLyoqIEBpZ25vcmUgKi9cbnR5cGUgRXZlbnQgPSBbRXZlbnROYW1lLCAoXzogYW55KSA9PiB2b2lkLCBQcm9taXNlPFtFdmVudE5hbWUsIEVycm9yIHwgbnVsbF0+XTtcbi8qKiBAaWdub3JlICovXG5jb25zdCBvbkV2ZW50ID0gPFQgZXh0ZW5kcyBzdHJpbmc+KHN0cmVhbTogTm9kZUpTLlJlYWRhYmxlU3RyZWFtLCBldmVudDogVCkgPT4ge1xuICAgIGxldCBoYW5kbGVyID0gKF86IGFueSkgPT4gcmVzb2x2ZShbZXZlbnQsIF9dKTtcbiAgICBsZXQgcmVzb2x2ZTogKHZhbHVlPzogW1QsIGFueV0gfCBQcm9taXNlTGlrZTxbVCwgYW55XT4pID0+IHZvaWQ7XG4gICAgcmV0dXJuIFtldmVudCwgaGFuZGxlciwgbmV3IFByb21pc2U8W1QsIGFueV0+KFxuICAgICAgICAocikgPT4gKHJlc29sdmUgPSByKSAmJiBzdHJlYW1bJ29uY2UnXShldmVudCwgaGFuZGxlcilcbiAgICApXSBhcyBFdmVudDtcbn07XG5cbi8qKiBAaWdub3JlICovXG5hc3luYyBmdW5jdGlvbiogZnJvbU5vZGVTdHJlYW0oc3RyZWFtOiBOb2RlSlMuUmVhZGFibGVTdHJlYW0pOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8VWludDhBcnJheT4ge1xuXG4gICAgbGV0IGV2ZW50czogRXZlbnRbXSA9IFtdO1xuICAgIGxldCBldmVudDogRXZlbnROYW1lID0gJ2Vycm9yJztcbiAgICBsZXQgZG9uZSA9IGZhbHNlLCBlcnI6IEVycm9yIHwgbnVsbCA9IG51bGw7XG4gICAgbGV0IGNtZDogJ3BlZWsnIHwgJ3JlYWQnLCBzaXplOiBudW1iZXIsIGJ1ZmZlckxlbmd0aCA9IDA7XG4gICAgbGV0IGJ1ZmZlcnM6IFVpbnQ4QXJyYXlbXSA9IFtdLCBidWZmZXI6IFVpbnQ4QXJyYXkgfCBCdWZmZXIgfCBzdHJpbmc7XG5cbiAgICBmdW5jdGlvbiBieXRlUmFuZ2UoKSB7XG4gICAgICAgIGlmIChjbWQgPT09ICdwZWVrJykge1xuICAgICAgICAgICAgcmV0dXJuIGpvaW5VaW50OEFycmF5cyhidWZmZXJzLCBzaXplKVswXTtcbiAgICAgICAgfVxuICAgICAgICBbYnVmZmVyLCBidWZmZXJzLCBidWZmZXJMZW5ndGhdID0gam9pblVpbnQ4QXJyYXlzKGJ1ZmZlcnMsIHNpemUpO1xuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8vIFlpZWxkIHNvIHRoZSBjYWxsZXIgY2FuIGluamVjdCB0aGUgcmVhZCBjb21tYW5kIGJlZm9yZSB3ZVxuICAgIC8vIGFkZCB0aGUgbGlzdGVuZXIgZm9yIHRoZSBzb3VyY2Ugc3RyZWFtJ3MgJ3JlYWRhYmxlJyBldmVudC5cbiAgICAoeyBjbWQsIHNpemUgfSA9IHlpZWxkIDxhbnk+IG51bGwpO1xuXG4gICAgLy8gaWdub3JlIHN0ZGluIGlmIGl0J3MgYSBUVFlcbiAgICBpZiAoKHN0cmVhbSBhcyBhbnkpWydpc1RUWSddKSB7IHJldHVybiB5aWVsZCBuZXcgVWludDhBcnJheSgwKTsgfVxuXG4gICAgdHJ5IHtcbiAgICAgICAgLy8gaW5pdGlhbGl6ZSB0aGUgc3RyZWFtIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgIGV2ZW50c1swXSA9IG9uRXZlbnQoc3RyZWFtLCAnZW5kJyk7XG4gICAgICAgIGV2ZW50c1sxXSA9IG9uRXZlbnQoc3RyZWFtLCAnZXJyb3InKTtcblxuICAgICAgICBkbyB7XG4gICAgICAgICAgICBldmVudHNbMl0gPSBvbkV2ZW50KHN0cmVhbSwgJ3JlYWRhYmxlJyk7XG5cbiAgICAgICAgICAgIC8vIHdhaXQgb24gdGhlIGZpcnN0IG1lc3NhZ2UgZXZlbnQgZnJvbSB0aGUgc3RyZWFtXG4gICAgICAgICAgICBbZXZlbnQsIGVycl0gPSBhd2FpdCBQcm9taXNlLnJhY2UoZXZlbnRzLm1hcCgoeCkgPT4geFsyXSkpO1xuXG4gICAgICAgICAgICAvLyBpZiB0aGUgc3RyZWFtIGVtaXR0ZWQgYW4gRXJyb3IsIHJldGhyb3cgaXRcbiAgICAgICAgICAgIGlmIChldmVudCA9PT0gJ2Vycm9yJykgeyBicmVhazsgfVxuICAgICAgICAgICAgaWYgKCEoZG9uZSA9IGV2ZW50ID09PSAnZW5kJykpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgc2l6ZSBpcyBOYU4sIHJlcXVlc3QgdG8gcmVhZCBldmVyeXRoaW5nIGluIHRoZSBzdHJlYW0ncyBpbnRlcm5hbCBidWZmZXJcbiAgICAgICAgICAgICAgICBpZiAoIWlzRmluaXRlKHNpemUgLSBidWZmZXJMZW5ndGgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJ1ZmZlciA9IHRvVWludDhBcnJheShzdHJlYW1bJ3JlYWQnXSh1bmRlZmluZWQpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSB0b1VpbnQ4QXJyYXkoc3RyZWFtWydyZWFkJ10oc2l6ZSAtIGJ1ZmZlckxlbmd0aCkpO1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGUgYnl0ZUxlbmd0aCBpcyAwLCB0aGVuIHRoZSByZXF1ZXN0ZWQgYW1vdW50IGlzIG1vcmUgdGhhbiB0aGUgc3RyZWFtIGhhc1xuICAgICAgICAgICAgICAgICAgICAvLyBpbiBpdHMgaW50ZXJuYWwgYnVmZmVyLiBJbiB0aGlzIGNhc2UgdGhlIHN0cmVhbSBuZWVkcyBhIFwia2lja1wiIHRvIHRlbGwgaXQgdG9cbiAgICAgICAgICAgICAgICAgICAgLy8gY29udGludWUgZW1pdHRpbmcgcmVhZGFibGUgZXZlbnRzLCBzbyByZXF1ZXN0IHRvIHJlYWQgZXZlcnl0aGluZyB0aGUgc3RyZWFtXG4gICAgICAgICAgICAgICAgICAgIC8vIGhhcyBpbiBpdHMgaW50ZXJuYWwgYnVmZmVyIHJpZ2h0IG5vdy5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGJ1ZmZlci5ieXRlTGVuZ3RoIDwgKHNpemUgLSBidWZmZXJMZW5ndGgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSB0b1VpbnQ4QXJyYXkoc3RyZWFtWydyZWFkJ10odW5kZWZpbmVkKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gaWYgY2h1bmsgaXMgbm90IG51bGwgb3IgZW1wdHksIHB1c2ggaXQgb250byB0aGUgcXVldWVcbiAgICAgICAgICAgICAgICBpZiAoYnVmZmVyLmJ5dGVMZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGJ1ZmZlcnMucHVzaChidWZmZXIpO1xuICAgICAgICAgICAgICAgICAgICBidWZmZXJMZW5ndGggKz0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBlbm91Z2ggYnl0ZXMgaW4gb3VyIGJ1ZmZlciwgeWllbGQgY2h1bmtzIHVudGlsIHdlIGRvbid0XG4gICAgICAgICAgICBpZiAoZG9uZSB8fCBzaXplIDw9IGJ1ZmZlckxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCBieXRlUmFuZ2UoKSk7XG4gICAgICAgICAgICAgICAgfSB3aGlsZSAoc2l6ZSA8IGJ1ZmZlckxlbmd0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gd2hpbGUgKCFkb25lKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgICBhd2FpdCBjbGVhbnVwKGV2ZW50cywgZXZlbnQgPT09ICdlcnJvcicgPyBlcnIgOiBudWxsKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbGVhbnVwPFQgZXh0ZW5kcyBFcnJvciB8IG51bGwgfCB2b2lkPihldmVudHM6IEV2ZW50W10sIGVycj86IFQpIHtcbiAgICAgICAgYnVmZmVyID0gYnVmZmVycyA9IDxhbnk+IG51bGw7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxUPihhc3luYyAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtldnQsIGZuXSBvZiBldmVudHMpIHtcbiAgICAgICAgICAgICAgICBzdHJlYW1bJ29mZiddKGV2dCwgZm4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvLyBTb21lIHN0cmVhbSBpbXBsZW1lbnRhdGlvbnMgZG9uJ3QgY2FsbCB0aGUgZGVzdHJveSBjYWxsYmFjayxcbiAgICAgICAgICAgICAgICAvLyBiZWNhdXNlIGl0J3MgcmVhbGx5IGEgbm9kZS1pbnRlcm5hbCBBUEkuIEp1c3QgY2FsbGluZyBgZGVzdHJveWBcbiAgICAgICAgICAgICAgICAvLyBoZXJlIHNob3VsZCBiZSBlbm91Z2ggdG8gY29uZm9ybSB0byB0aGUgUmVhZGFibGVTdHJlYW0gY29udHJhY3RcbiAgICAgICAgICAgICAgICBjb25zdCBkZXN0cm95ID0gKHN0cmVhbSBhcyBhbnkpWydkZXN0cm95J107XG4gICAgICAgICAgICAgICAgZGVzdHJveSAmJiBkZXN0cm95LmNhbGwoc3RyZWFtLCBlcnIpO1xuICAgICAgICAgICAgICAgIGVyciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHsgZXJyID0gZSB8fCBlcnI7IH0gZmluYWxseSB7XG4gICAgICAgICAgICAgICAgZXJyICE9IG51bGwgPyByZWplY3QoZXJyKSA6IHJlc29sdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufVxuIl19

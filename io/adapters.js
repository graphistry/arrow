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
function fromAsyncIterable(source) {
    return tslib_1.__asyncGenerator(this, arguments, function* fromAsyncIterable_1() {
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
                return buffer_1.joinUint8Arrays(buffers, size)[0];
            }
            [buffer, buffers, bufferLength] = buffer_1.joinUint8Arrays(buffers, size);
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
                return buffer_1.joinUint8Arrays(buffers, size)[0];
            }
            [buffer, buffers, bufferLength] = buffer_1.joinUint8Arrays(buffers, size);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFHLFlBQVksRUFBRTtpQkFDakM7YUFDSixRQUFRLENBQUMsSUFBSSxFQUFFO1NBQ25CO2dCQUFTO1lBQ04sc0JBQU0sT0FBTyxDQUFDLE1BQU0sRUFBRSxLQUFLLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFBLENBQUM7U0FDekQ7UUFFRCxTQUFTLE9BQU8sQ0FBZ0MsTUFBZSxFQUFFLEdBQU87WUFDcEUsTUFBTSxHQUFHLE9BQU8sR0FBUyxJQUFJLENBQUM7WUFDOUIsT0FBTyxJQUFJLE9BQU8sQ0FBSSxDQUFPLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtnQkFDNUMsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLE1BQU0sRUFBRTtvQkFDNUIsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztpQkFDMUI7Z0JBQ0QsSUFBSTtvQkFDQSwrREFBK0Q7b0JBQy9ELGtFQUFrRTtvQkFDbEUsa0VBQWtFO29CQUNsRSxNQUFNLE9BQU8sR0FBSSxNQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBQzNDLE9BQU8sSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztvQkFDckMsR0FBRyxHQUFHLFNBQVMsQ0FBQztpQkFDbkI7Z0JBQUMsT0FBTyxDQUFDLEVBQUU7b0JBQUUsR0FBRyxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUM7aUJBQUU7d0JBQVM7b0JBQ3BDLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7aUJBQ3pDO1lBQ0wsQ0FBQyxDQUFBLENBQUMsQ0FBQztRQUNQLENBQUM7SUFDTCxDQUFDO0NBQUEiLCJmaWxlIjoiaW8vYWRhcHRlcnMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHtcbiAgICB0b1VpbnQ4QXJyYXksXG4gICAgam9pblVpbnQ4QXJyYXlzLFxuICAgIEFycmF5QnVmZmVyVmlld0lucHV0LFxuICAgIHRvVWludDhBcnJheUl0ZXJhdG9yLFxuICAgIHRvVWludDhBcnJheUFzeW5jSXRlcmF0b3Jcbn0gZnJvbSAnLi4vdXRpbC9idWZmZXInO1xuXG5pbXBvcnQgeyBSZWFkYWJsZURPTVN0cmVhbU9wdGlvbnMgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGRlZmF1bHQge1xuICAgIGZyb21JdGVyYWJsZTxUIGV4dGVuZHMgQXJyYXlCdWZmZXJWaWV3SW5wdXQ+KHNvdXJjZTogSXRlcmFibGU8VD4gfCBUKTogSXRlcmFibGVJdGVyYXRvcjxVaW50OEFycmF5PiB7XG4gICAgICAgIHJldHVybiBwdW1wKGZyb21JdGVyYWJsZTxUPihzb3VyY2UpKTtcbiAgICB9LFxuICAgIGZyb21Bc3luY0l0ZXJhYmxlPFQgZXh0ZW5kcyBBcnJheUJ1ZmZlclZpZXdJbnB1dD4oc291cmNlOiBBc3luY0l0ZXJhYmxlPFQ+IHwgUHJvbWlzZUxpa2U8VD4pOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8VWludDhBcnJheT4ge1xuICAgICAgICByZXR1cm4gcHVtcChmcm9tQXN5bmNJdGVyYWJsZTxUPihzb3VyY2UpKTtcbiAgICB9LFxuICAgIGZyb21ET01TdHJlYW08VCBleHRlbmRzIEFycmF5QnVmZmVyVmlld0lucHV0Pihzb3VyY2U6IFJlYWRhYmxlU3RyZWFtPFQ+KTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcbiAgICAgICAgcmV0dXJuIHB1bXAoZnJvbURPTVN0cmVhbTxUPihzb3VyY2UpKTtcbiAgICB9LFxuICAgIGZyb21Ob2RlU3RyZWFtKHN0cmVhbTogTm9kZUpTLlJlYWRhYmxlU3RyZWFtKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcbiAgICAgICAgcmV0dXJuIHB1bXAoZnJvbU5vZGVTdHJlYW0oc3RyZWFtKSk7XG4gICAgfSxcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgdG9ET01TdHJlYW08VD4oc291cmNlOiBJdGVyYWJsZTxUPiB8IEFzeW5jSXRlcmFibGU8VD4sIG9wdGlvbnM/OiBSZWFkYWJsZURPTVN0cmVhbU9wdGlvbnMpOiBSZWFkYWJsZVN0cmVhbTxUPiB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgXCJ0b0RPTVN0cmVhbVwiIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBlbnZpcm9ubWVudGApO1xuICAgIH0sXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHRvTm9kZVN0cmVhbTxUPihzb3VyY2U6IEl0ZXJhYmxlPFQ+IHwgQXN5bmNJdGVyYWJsZTxUPiwgb3B0aW9ucz86IGltcG9ydCgnc3RyZWFtJykuUmVhZGFibGVPcHRpb25zKTogaW1wb3J0KCdzdHJlYW0nKS5SZWFkYWJsZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgXCJ0b05vZGVTdHJlYW1cIiBub3QgYXZhaWxhYmxlIGluIHRoaXMgZW52aXJvbm1lbnRgKTtcbiAgICB9LFxufTtcblxuLyoqIEBpZ25vcmUgKi9cbmNvbnN0IHB1bXAgPSA8VCBleHRlbmRzIEl0ZXJhdG9yPGFueT4gfCBBc3luY0l0ZXJhdG9yPGFueT4+KGl0ZXJhdG9yOiBUKSA9PiB7IGl0ZXJhdG9yLm5leHQoKTsgcmV0dXJuIGl0ZXJhdG9yOyB9O1xuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24qIGZyb21JdGVyYWJsZTxUIGV4dGVuZHMgQXJyYXlCdWZmZXJWaWV3SW5wdXQ+KHNvdXJjZTogSXRlcmFibGU8VD4gfCBUKTogSXRlcmFibGVJdGVyYXRvcjxVaW50OEFycmF5PiB7XG5cbiAgICBsZXQgZG9uZTogYm9vbGVhbiwgdGhyZXcgPSBmYWxzZTtcbiAgICBsZXQgYnVmZmVyczogVWludDhBcnJheVtdID0gW10sIGJ1ZmZlcjogVWludDhBcnJheTtcbiAgICBsZXQgY21kOiAncGVlaycgfCAncmVhZCcsIHNpemU6IG51bWJlciwgYnVmZmVyTGVuZ3RoID0gMDtcblxuICAgIGZ1bmN0aW9uIGJ5dGVSYW5nZSgpIHtcbiAgICAgICAgaWYgKGNtZCA9PT0gJ3BlZWsnKSB7XG4gICAgICAgICAgICByZXR1cm4gam9pblVpbnQ4QXJyYXlzKGJ1ZmZlcnMsIHNpemUpWzBdO1xuICAgICAgICB9XG4gICAgICAgIFtidWZmZXIsIGJ1ZmZlcnMsIGJ1ZmZlckxlbmd0aF0gPSBqb2luVWludDhBcnJheXMoYnVmZmVycywgc2l6ZSk7XG4gICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgfVxuXG4gICAgLy8gWWllbGQgc28gdGhlIGNhbGxlciBjYW4gaW5qZWN0IHRoZSByZWFkIGNvbW1hbmQgYmVmb3JlIGNyZWF0aW5nIHRoZSBzb3VyY2UgSXRlcmF0b3JcbiAgICAoeyBjbWQsIHNpemUgfSA9IHlpZWxkIDxhbnk+IG51bGwpO1xuXG4gICAgLy8gaW5pdGlhbGl6ZSB0aGUgaXRlcmF0b3JcbiAgICBsZXQgaXQgPSB0b1VpbnQ4QXJyYXlJdGVyYXRvcihzb3VyY2UpW1N5bWJvbC5pdGVyYXRvcl0oKTtcblxuICAgIHRyeSB7XG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIC8vIHJlYWQgdGhlIG5leHQgdmFsdWVcbiAgICAgICAgICAgICh7IGRvbmUsIHZhbHVlOiBidWZmZXIgfSA9IGlzTmFOKHNpemUgLSBidWZmZXJMZW5ndGgpID9cbiAgICAgICAgICAgICAgICBpdC5uZXh0KHVuZGVmaW5lZCkgOiBpdC5uZXh0KHNpemUgLSBidWZmZXJMZW5ndGgpKTtcbiAgICAgICAgICAgIC8vIGlmIGNodW5rIGlzIG5vdCBudWxsIG9yIGVtcHR5LCBwdXNoIGl0IG9udG8gdGhlIHF1ZXVlXG4gICAgICAgICAgICBpZiAoIWRvbmUgJiYgYnVmZmVyLmJ5dGVMZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVycy5wdXNoKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgYnVmZmVyTGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBlbm91Z2ggYnl0ZXMgaW4gb3VyIGJ1ZmZlciwgeWllbGQgY2h1bmtzIHVudGlsIHdlIGRvbid0XG4gICAgICAgICAgICBpZiAoZG9uZSB8fCBzaXplIDw9IGJ1ZmZlckxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCBieXRlUmFuZ2UoKSk7XG4gICAgICAgICAgICAgICAgfSB3aGlsZSAoc2l6ZSA8IGJ1ZmZlckxlbmd0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gd2hpbGUgKCFkb25lKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICh0aHJldyA9IHRydWUpICYmICh0eXBlb2YgaXQudGhyb3cgPT09ICdmdW5jdGlvbicpICYmIChpdC50aHJvdyhlKSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgKHRocmV3ID09PSBmYWxzZSkgJiYgKHR5cGVvZiBpdC5yZXR1cm4gPT09ICdmdW5jdGlvbicpICYmIChpdC5yZXR1cm4oKSk7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuYXN5bmMgZnVuY3Rpb24qIGZyb21Bc3luY0l0ZXJhYmxlPFQgZXh0ZW5kcyBBcnJheUJ1ZmZlclZpZXdJbnB1dD4oc291cmNlOiBBc3luY0l0ZXJhYmxlPFQ+IHwgUHJvbWlzZUxpa2U8VD4pOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8VWludDhBcnJheT4ge1xuXG4gICAgbGV0IGRvbmU6IGJvb2xlYW4sIHRocmV3ID0gZmFsc2U7XG4gICAgbGV0IGJ1ZmZlcnM6IFVpbnQ4QXJyYXlbXSA9IFtdLCBidWZmZXI6IFVpbnQ4QXJyYXk7XG4gICAgbGV0IGNtZDogJ3BlZWsnIHwgJ3JlYWQnLCBzaXplOiBudW1iZXIsIGJ1ZmZlckxlbmd0aCA9IDA7XG5cbiAgICBmdW5jdGlvbiBieXRlUmFuZ2UoKSB7XG4gICAgICAgIGlmIChjbWQgPT09ICdwZWVrJykge1xuICAgICAgICAgICAgcmV0dXJuIGpvaW5VaW50OEFycmF5cyhidWZmZXJzLCBzaXplKVswXTtcbiAgICAgICAgfVxuICAgICAgICBbYnVmZmVyLCBidWZmZXJzLCBidWZmZXJMZW5ndGhdID0gam9pblVpbnQ4QXJyYXlzKGJ1ZmZlcnMsIHNpemUpO1xuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8vIFlpZWxkIHNvIHRoZSBjYWxsZXIgY2FuIGluamVjdCB0aGUgcmVhZCBjb21tYW5kIGJlZm9yZSBjcmVhdGluZyB0aGUgc291cmNlIEFzeW5jSXRlcmF0b3JcbiAgICAoeyBjbWQsIHNpemUgfSA9IHlpZWxkIDxhbnk+IG51bGwpO1xuXG4gICAgLy8gaW5pdGlhbGl6ZSB0aGUgaXRlcmF0b3JcbiAgICBsZXQgaXQgPSB0b1VpbnQ4QXJyYXlBc3luY0l0ZXJhdG9yKHNvdXJjZSlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk7XG5cbiAgICB0cnkge1xuICAgICAgICBkbyB7XG4gICAgICAgICAgICAvLyByZWFkIHRoZSBuZXh0IHZhbHVlXG4gICAgICAgICAgICAoeyBkb25lLCB2YWx1ZTogYnVmZmVyIH0gPSBpc05hTihzaXplIC0gYnVmZmVyTGVuZ3RoKVxuICAgICAgICAgICAgICAgID8gYXdhaXQgaXQubmV4dCh1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgOiBhd2FpdCBpdC5uZXh0KHNpemUgLSBidWZmZXJMZW5ndGgpKTtcbiAgICAgICAgICAgIC8vIGlmIGNodW5rIGlzIG5vdCBudWxsIG9yIGVtcHR5LCBwdXNoIGl0IG9udG8gdGhlIHF1ZXVlXG4gICAgICAgICAgICBpZiAoIWRvbmUgJiYgYnVmZmVyLmJ5dGVMZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVycy5wdXNoKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgYnVmZmVyTGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBlbm91Z2ggYnl0ZXMgaW4gb3VyIGJ1ZmZlciwgeWllbGQgY2h1bmtzIHVudGlsIHdlIGRvbid0XG4gICAgICAgICAgICBpZiAoZG9uZSB8fCBzaXplIDw9IGJ1ZmZlckxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCBieXRlUmFuZ2UoKSk7XG4gICAgICAgICAgICAgICAgfSB3aGlsZSAoc2l6ZSA8IGJ1ZmZlckxlbmd0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gd2hpbGUgKCFkb25lKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICh0aHJldyA9IHRydWUpICYmICh0eXBlb2YgaXQudGhyb3cgPT09ICdmdW5jdGlvbicpICYmIChhd2FpdCBpdC50aHJvdyhlKSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgKHRocmV3ID09PSBmYWxzZSkgJiYgKHR5cGVvZiBpdC5yZXR1cm4gPT09ICdmdW5jdGlvbicpICYmIChhd2FpdCBpdC5yZXR1cm4oKSk7XG4gICAgfVxufVxuXG4vLyBBbGwgdGhpcyBtYW51YWwgVWludDhBcnJheSBjaHVuayBtYW5hZ2VtZW50IGNhbiBiZSBhdm9pZGVkIGlmL3doZW4gZW5naW5lc1xuLy8gYWRkIHN1cHBvcnQgZm9yIEFycmF5QnVmZmVyLnRyYW5zZmVyKCkgb3IgQXJyYXlCdWZmZXIucHJvdG90eXBlLnJlYWxsb2MoKTpcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9kb21lbmljL3Byb3Bvc2FsLWFycmF5YnVmZmVyLXRyYW5zZmVyXG4vKiogQGlnbm9yZSAqL1xuYXN5bmMgZnVuY3Rpb24qIGZyb21ET01TdHJlYW08VCBleHRlbmRzIEFycmF5QnVmZmVyVmlld0lucHV0Pihzb3VyY2U6IFJlYWRhYmxlU3RyZWFtPFQ+KTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcblxuICAgIGxldCBkb25lID0gZmFsc2UsIHRocmV3ID0gZmFsc2U7XG4gICAgbGV0IGJ1ZmZlcnM6IFVpbnQ4QXJyYXlbXSA9IFtdLCBidWZmZXI6IFVpbnQ4QXJyYXk7XG4gICAgbGV0IGNtZDogJ3BlZWsnIHwgJ3JlYWQnLCBzaXplOiBudW1iZXIsIGJ1ZmZlckxlbmd0aCA9IDA7XG5cbiAgICBmdW5jdGlvbiBieXRlUmFuZ2UoKSB7XG4gICAgICAgIGlmIChjbWQgPT09ICdwZWVrJykge1xuICAgICAgICAgICAgcmV0dXJuIGpvaW5VaW50OEFycmF5cyhidWZmZXJzLCBzaXplKVswXTtcbiAgICAgICAgfVxuICAgICAgICBbYnVmZmVyLCBidWZmZXJzLCBidWZmZXJMZW5ndGhdID0gam9pblVpbnQ4QXJyYXlzKGJ1ZmZlcnMsIHNpemUpO1xuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8vIFlpZWxkIHNvIHRoZSBjYWxsZXIgY2FuIGluamVjdCB0aGUgcmVhZCBjb21tYW5kIGJlZm9yZSB3ZSBlc3RhYmxpc2ggdGhlIFJlYWRhYmxlU3RyZWFtIGxvY2tcbiAgICAoeyBjbWQsIHNpemUgfSA9IHlpZWxkIDxhbnk+IG51bGwpO1xuXG4gICAgLy8gaW5pdGlhbGl6ZSB0aGUgcmVhZGVyIGFuZCBsb2NrIHRoZSBzdHJlYW1cbiAgICBsZXQgaXQgPSBuZXcgQWRhcHRpdmVCeXRlUmVhZGVyKHNvdXJjZSk7XG5cbiAgICB0cnkge1xuICAgICAgICBkbyB7XG4gICAgICAgICAgICAvLyByZWFkIHRoZSBuZXh0IHZhbHVlXG4gICAgICAgICAgICAoeyBkb25lLCB2YWx1ZTogYnVmZmVyIH0gPSBpc05hTihzaXplIC0gYnVmZmVyTGVuZ3RoKVxuICAgICAgICAgICAgICAgID8gYXdhaXQgaXRbJ3JlYWQnXSh1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgOiBhd2FpdCBpdFsncmVhZCddKHNpemUgLSBidWZmZXJMZW5ndGgpKTtcbiAgICAgICAgICAgIC8vIGlmIGNodW5rIGlzIG5vdCBudWxsIG9yIGVtcHR5LCBwdXNoIGl0IG9udG8gdGhlIHF1ZXVlXG4gICAgICAgICAgICBpZiAoIWRvbmUgJiYgYnVmZmVyLmJ5dGVMZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVycy5wdXNoKHRvVWludDhBcnJheShidWZmZXIpKTtcbiAgICAgICAgICAgICAgICBidWZmZXJMZW5ndGggKz0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIGVub3VnaCBieXRlcyBpbiBvdXIgYnVmZmVyLCB5aWVsZCBjaHVua3MgdW50aWwgd2UgZG9uJ3RcbiAgICAgICAgICAgIGlmIChkb25lIHx8IHNpemUgPD0gYnVmZmVyTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgICAgICAoeyBjbWQsIHNpemUgfSA9IHlpZWxkIGJ5dGVSYW5nZSgpKTtcbiAgICAgICAgICAgICAgICB9IHdoaWxlIChzaXplIDwgYnVmZmVyTGVuZ3RoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSB3aGlsZSAoIWRvbmUpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgKHRocmV3ID0gdHJ1ZSkgJiYgKGF3YWl0IGl0WydjYW5jZWwnXShlKSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgKHRocmV3ID09PSBmYWxzZSkgPyAoYXdhaXQgaXRbJ2NhbmNlbCddKCkpXG4gICAgICAgICAgICA6IHNvdXJjZVsnbG9ja2VkJ10gJiYgaXQucmVsZWFzZUxvY2soKTtcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5jbGFzcyBBZGFwdGl2ZUJ5dGVSZWFkZXI8VCBleHRlbmRzIEFycmF5QnVmZmVyVmlld0lucHV0PiB7XG5cbiAgICBwcml2YXRlIHN1cHBvcnRzQllPQjogYm9vbGVhbjtcbiAgICBwcml2YXRlIGJ5b2JSZWFkZXI6IFJlYWRhYmxlU3RyZWFtQllPQlJlYWRlciB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgZGVmYXVsdFJlYWRlcjogUmVhZGFibGVTdHJlYW1EZWZhdWx0UmVhZGVyPFQ+IHwgbnVsbCA9IG51bGw7XG4gICAgcHJpdmF0ZSByZWFkZXI6IFJlYWRhYmxlU3RyZWFtQllPQlJlYWRlciB8IFJlYWRhYmxlU3RyZWFtRGVmYXVsdFJlYWRlcjxUPiB8IG51bGw7XG5cbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHNvdXJjZTogUmVhZGFibGVTdHJlYW08VD4pIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuc3VwcG9ydHNCWU9CID0gISEodGhpcy5yZWFkZXIgPSB0aGlzLmdldEJZT0JSZWFkZXIoKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMuc3VwcG9ydHNCWU9CID0gISEhKHRoaXMucmVhZGVyID0gdGhpcy5nZXREZWZhdWx0UmVhZGVyKCkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0IGNsb3NlZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVhZGVyID8gdGhpcy5yZWFkZXJbJ2Nsb3NlZCddLmNhdGNoKCgpID0+IHt9KSA6IFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxuICAgIHJlbGVhc2VMb2NrKCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5yZWFkZXIpIHtcbiAgICAgICAgICAgIHRoaXMucmVhZGVyLnJlbGVhc2VMb2NrKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZWFkZXIgPSB0aGlzLmJ5b2JSZWFkZXIgPSB0aGlzLmRlZmF1bHRSZWFkZXIgPSBudWxsO1xuICAgIH1cblxuICAgIGFzeW5jIGNhbmNlbChyZWFzb24/OiBhbnkpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyByZWFkZXIsIHNvdXJjZSB9ID0gdGhpcztcbiAgICAgICAgcmVhZGVyICYmIChhd2FpdCByZWFkZXJbJ2NhbmNlbCddKHJlYXNvbikpO1xuICAgICAgICBzb3VyY2UgJiYgKHNvdXJjZVsnbG9ja2VkJ10gJiYgdGhpcy5yZWxlYXNlTG9jaygpKTtcbiAgICB9XG5cbiAgICBhc3luYyByZWFkKHNpemU/OiBudW1iZXIpOiBQcm9taXNlPFJlYWRhYmxlU3RyZWFtUmVhZFJlc3VsdDxVaW50OEFycmF5Pj4ge1xuICAgICAgICBpZiAoc2l6ZSA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgZG9uZTogdGhpcy5yZWFkZXIgPT0gbnVsbCwgdmFsdWU6IG5ldyBVaW50OEFycmF5KDApIH07XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gIXRoaXMuc3VwcG9ydHNCWU9CIHx8IHR5cGVvZiBzaXplICE9PSAnbnVtYmVyJ1xuICAgICAgICAgICAgPyBhd2FpdCB0aGlzLmdldERlZmF1bHRSZWFkZXIoKS5yZWFkKClcbiAgICAgICAgICAgIDogYXdhaXQgdGhpcy5yZWFkRnJvbUJZT0JSZWFkZXIoc2l6ZSk7XG4gICAgICAgICFyZXN1bHQuZG9uZSAmJiAocmVzdWx0LnZhbHVlID0gdG9VaW50OEFycmF5KHJlc3VsdCBhcyBSZWFkYWJsZVN0cmVhbVJlYWRSZXN1bHQ8VWludDhBcnJheT4pKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdCBhcyBSZWFkYWJsZVN0cmVhbVJlYWRSZXN1bHQ8VWludDhBcnJheT47XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXREZWZhdWx0UmVhZGVyKCkge1xuICAgICAgICBpZiAodGhpcy5ieW9iUmVhZGVyKSB7IHRoaXMucmVsZWFzZUxvY2soKTsgfVxuICAgICAgICBpZiAoIXRoaXMuZGVmYXVsdFJlYWRlcikge1xuICAgICAgICAgICAgdGhpcy5kZWZhdWx0UmVhZGVyID0gdGhpcy5zb3VyY2VbJ2dldFJlYWRlciddKCk7XG4gICAgICAgICAgICAvLyBXZSBoYXZlIHRvIGNhdGNoIGFuZCBzd2FsbG93IGVycm9ycyBoZXJlIHRvIGF2b2lkIHVuY2F1Z2h0IHByb21pc2UgcmVqZWN0aW9uIGV4Y2VwdGlvbnNcbiAgICAgICAgICAgIC8vIHRoYXQgc2VlbSB0byBiZSByYWlzZWQgd2hlbiB3ZSBjYWxsIGByZWxlYXNlTG9jaygpYCBvbiB0aGlzIHJlYWRlci4gSSdtIHN0aWxsIG15c3RpZmllZFxuICAgICAgICAgICAgLy8gYWJvdXQgd2h5IHRoZXNlIGVycm9ycyBhcmUgcmFpc2VkLCBidXQgSSdtIHN1cmUgdGhlcmUncyBzb21lIGltcG9ydGFudCBzcGVjIHJlYXNvbiB0aGF0XG4gICAgICAgICAgICAvLyBJIGhhdmVuJ3QgY29uc2lkZXJlZC4gSSBoYXRlIHRvIGVtcGxveSBzdWNoIGFuIGFudGktcGF0dGVybiBoZXJlLCBidXQgaXQgc2VlbXMgbGlrZSB0aGVcbiAgICAgICAgICAgIC8vIG9ubHkgc29sdXRpb24gaW4gdGhpcyBjYXNlIDovXG4gICAgICAgICAgICB0aGlzLmRlZmF1bHRSZWFkZXJbJ2Nsb3NlZCddLmNhdGNoKCgpID0+IHt9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKHRoaXMucmVhZGVyID0gdGhpcy5kZWZhdWx0UmVhZGVyKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldEJZT0JSZWFkZXIoKSB7XG4gICAgICAgIGlmICh0aGlzLmRlZmF1bHRSZWFkZXIpIHsgdGhpcy5yZWxlYXNlTG9jaygpOyB9XG4gICAgICAgIGlmICghdGhpcy5ieW9iUmVhZGVyKSB7XG4gICAgICAgICAgICB0aGlzLmJ5b2JSZWFkZXIgPSB0aGlzLnNvdXJjZVsnZ2V0UmVhZGVyJ10oeyBtb2RlOiAnYnlvYicgfSk7XG4gICAgICAgICAgICAvLyBXZSBoYXZlIHRvIGNhdGNoIGFuZCBzd2FsbG93IGVycm9ycyBoZXJlIHRvIGF2b2lkIHVuY2F1Z2h0IHByb21pc2UgcmVqZWN0aW9uIGV4Y2VwdGlvbnNcbiAgICAgICAgICAgIC8vIHRoYXQgc2VlbSB0byBiZSByYWlzZWQgd2hlbiB3ZSBjYWxsIGByZWxlYXNlTG9jaygpYCBvbiB0aGlzIHJlYWRlci4gSSdtIHN0aWxsIG15c3RpZmllZFxuICAgICAgICAgICAgLy8gYWJvdXQgd2h5IHRoZXNlIGVycm9ycyBhcmUgcmFpc2VkLCBidXQgSSdtIHN1cmUgdGhlcmUncyBzb21lIGltcG9ydGFudCBzcGVjIHJlYXNvbiB0aGF0XG4gICAgICAgICAgICAvLyBJIGhhdmVuJ3QgY29uc2lkZXJlZC4gSSBoYXRlIHRvIGVtcGxveSBzdWNoIGFuIGFudGktcGF0dGVybiBoZXJlLCBidXQgaXQgc2VlbXMgbGlrZSB0aGVcbiAgICAgICAgICAgIC8vIG9ubHkgc29sdXRpb24gaW4gdGhpcyBjYXNlIDovXG4gICAgICAgICAgICB0aGlzLmJ5b2JSZWFkZXJbJ2Nsb3NlZCddLmNhdGNoKCgpID0+IHt9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKHRoaXMucmVhZGVyID0gdGhpcy5ieW9iUmVhZGVyKTtcbiAgICB9XG5cbiAgICAvLyBUaGlzIHN0cmF0ZWd5IHBsdWNrZWQgZnJvbSB0aGUgZXhhbXBsZSBpbiB0aGUgc3RyZWFtcyBzcGVjOlxuICAgIC8vIGh0dHBzOi8vc3RyZWFtcy5zcGVjLndoYXR3Zy5vcmcvI2V4YW1wbGUtbWFudWFsLXJlYWQtYnl0ZXNcbiAgICBwcml2YXRlIGFzeW5jIHJlYWRGcm9tQllPQlJlYWRlcihzaXplOiBudW1iZXIpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHJlYWRJbnRvKHRoaXMuZ2V0QllPQlJlYWRlcigpLCBuZXcgQXJyYXlCdWZmZXIoc2l6ZSksIDAsIHNpemUpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmFzeW5jIGZ1bmN0aW9uIHJlYWRJbnRvKHJlYWRlcjogUmVhZGFibGVTdHJlYW1CWU9CUmVhZGVyLCBidWZmZXI6IEFycmF5QnVmZmVyTGlrZSwgb2Zmc2V0OiBudW1iZXIsIHNpemU6IG51bWJlcik6IFByb21pc2U8UmVhZGFibGVTdHJlYW1SZWFkUmVzdWx0PFVpbnQ4QXJyYXk+PiB7XG4gICAgaWYgKG9mZnNldCA+PSBzaXplKSB7XG4gICAgICAgIHJldHVybiB7IGRvbmU6IGZhbHNlLCB2YWx1ZTogbmV3IFVpbnQ4QXJyYXkoYnVmZmVyLCAwLCBzaXplKSB9O1xuICAgIH1cbiAgICBjb25zdCB7IGRvbmUsIHZhbHVlIH0gPSBhd2FpdCByZWFkZXIucmVhZChuZXcgVWludDhBcnJheShidWZmZXIsIG9mZnNldCwgc2l6ZSAtIG9mZnNldCkpO1xuICAgIGlmICgoKG9mZnNldCArPSB2YWx1ZS5ieXRlTGVuZ3RoKSA8IHNpemUpICYmICFkb25lKSB7XG4gICAgICAgIHJldHVybiBhd2FpdCByZWFkSW50byhyZWFkZXIsIHZhbHVlLmJ1ZmZlciwgb2Zmc2V0LCBzaXplKTtcbiAgICB9XG4gICAgcmV0dXJuIHsgZG9uZSwgdmFsdWU6IG5ldyBVaW50OEFycmF5KHZhbHVlLmJ1ZmZlciwgMCwgb2Zmc2V0KSB9O1xufVxuXG4vKiogQGlnbm9yZSAqL1xudHlwZSBFdmVudE5hbWUgPSAnZW5kJyB8ICdlcnJvcicgfCAncmVhZGFibGUnO1xuLyoqIEBpZ25vcmUgKi9cbnR5cGUgRXZlbnQgPSBbRXZlbnROYW1lLCAoXzogYW55KSA9PiB2b2lkLCBQcm9taXNlPFtFdmVudE5hbWUsIEVycm9yIHwgbnVsbF0+XTtcbi8qKiBAaWdub3JlICovXG5jb25zdCBvbkV2ZW50ID0gPFQgZXh0ZW5kcyBzdHJpbmc+KHN0cmVhbTogTm9kZUpTLlJlYWRhYmxlU3RyZWFtLCBldmVudDogVCkgPT4ge1xuICAgIGxldCBoYW5kbGVyID0gKF86IGFueSkgPT4gcmVzb2x2ZShbZXZlbnQsIF9dKTtcbiAgICBsZXQgcmVzb2x2ZTogKHZhbHVlPzogW1QsIGFueV0gfCBQcm9taXNlTGlrZTxbVCwgYW55XT4pID0+IHZvaWQ7XG4gICAgcmV0dXJuIFtldmVudCwgaGFuZGxlciwgbmV3IFByb21pc2U8W1QsIGFueV0+KFxuICAgICAgICAocikgPT4gKHJlc29sdmUgPSByKSAmJiBzdHJlYW1bJ29uY2UnXShldmVudCwgaGFuZGxlcilcbiAgICApXSBhcyBFdmVudDtcbn07XG5cbi8qKiBAaWdub3JlICovXG5hc3luYyBmdW5jdGlvbiogZnJvbU5vZGVTdHJlYW0oc3RyZWFtOiBOb2RlSlMuUmVhZGFibGVTdHJlYW0pOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8VWludDhBcnJheT4ge1xuXG4gICAgbGV0IGV2ZW50czogRXZlbnRbXSA9IFtdO1xuICAgIGxldCBldmVudDogRXZlbnROYW1lID0gJ2Vycm9yJztcbiAgICBsZXQgZG9uZSA9IGZhbHNlLCBlcnI6IEVycm9yIHwgbnVsbCA9IG51bGw7XG4gICAgbGV0IGNtZDogJ3BlZWsnIHwgJ3JlYWQnLCBzaXplOiBudW1iZXIsIGJ1ZmZlckxlbmd0aCA9IDA7XG4gICAgbGV0IGJ1ZmZlcnM6IFVpbnQ4QXJyYXlbXSA9IFtdLCBidWZmZXI6IFVpbnQ4QXJyYXkgfCBCdWZmZXIgfCBzdHJpbmc7XG5cbiAgICBmdW5jdGlvbiBieXRlUmFuZ2UoKSB7XG4gICAgICAgIGlmIChjbWQgPT09ICdwZWVrJykge1xuICAgICAgICAgICAgcmV0dXJuIGpvaW5VaW50OEFycmF5cyhidWZmZXJzLCBzaXplKVswXTtcbiAgICAgICAgfVxuICAgICAgICBbYnVmZmVyLCBidWZmZXJzLCBidWZmZXJMZW5ndGhdID0gam9pblVpbnQ4QXJyYXlzKGJ1ZmZlcnMsIHNpemUpO1xuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8vIFlpZWxkIHNvIHRoZSBjYWxsZXIgY2FuIGluamVjdCB0aGUgcmVhZCBjb21tYW5kIGJlZm9yZSB3ZVxuICAgIC8vIGFkZCB0aGUgbGlzdGVuZXIgZm9yIHRoZSBzb3VyY2Ugc3RyZWFtJ3MgJ3JlYWRhYmxlJyBldmVudC5cbiAgICAoeyBjbWQsIHNpemUgfSA9IHlpZWxkIDxhbnk+IG51bGwpO1xuXG4gICAgLy8gaWdub3JlIHN0ZGluIGlmIGl0J3MgYSBUVFlcbiAgICBpZiAoKHN0cmVhbSBhcyBhbnkpWydpc1RUWSddKSB7IHJldHVybiB5aWVsZCBuZXcgVWludDhBcnJheSgwKTsgfVxuXG4gICAgdHJ5IHtcbiAgICAgICAgLy8gaW5pdGlhbGl6ZSB0aGUgc3RyZWFtIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgIGV2ZW50c1swXSA9IG9uRXZlbnQoc3RyZWFtLCAnZW5kJyk7XG4gICAgICAgIGV2ZW50c1sxXSA9IG9uRXZlbnQoc3RyZWFtLCAnZXJyb3InKTtcblxuICAgICAgICBkbyB7XG4gICAgICAgICAgICBldmVudHNbMl0gPSBvbkV2ZW50KHN0cmVhbSwgJ3JlYWRhYmxlJyk7XG5cbiAgICAgICAgICAgIC8vIHdhaXQgb24gdGhlIGZpcnN0IG1lc3NhZ2UgZXZlbnQgZnJvbSB0aGUgc3RyZWFtXG4gICAgICAgICAgICBbZXZlbnQsIGVycl0gPSBhd2FpdCBQcm9taXNlLnJhY2UoZXZlbnRzLm1hcCgoeCkgPT4geFsyXSkpO1xuXG4gICAgICAgICAgICAvLyBpZiB0aGUgc3RyZWFtIGVtaXR0ZWQgYW4gRXJyb3IsIHJldGhyb3cgaXRcbiAgICAgICAgICAgIGlmIChldmVudCA9PT0gJ2Vycm9yJykgeyBicmVhazsgfVxuICAgICAgICAgICAgaWYgKCEoZG9uZSA9IGV2ZW50ID09PSAnZW5kJykpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgc2l6ZSBpcyBOYU4sIHJlcXVlc3QgdG8gcmVhZCBldmVyeXRoaW5nIGluIHRoZSBzdHJlYW0ncyBpbnRlcm5hbCBidWZmZXJcbiAgICAgICAgICAgICAgICBpZiAoIWlzRmluaXRlKHNpemUgLSBidWZmZXJMZW5ndGgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJ1ZmZlciA9IHRvVWludDhBcnJheShzdHJlYW1bJ3JlYWQnXSh1bmRlZmluZWQpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSB0b1VpbnQ4QXJyYXkoc3RyZWFtWydyZWFkJ10oc2l6ZSAtIGJ1ZmZlckxlbmd0aCkpO1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGUgYnl0ZUxlbmd0aCBpcyAwLCB0aGVuIHRoZSByZXF1ZXN0ZWQgYW1vdW50IGlzIG1vcmUgdGhhbiB0aGUgc3RyZWFtIGhhc1xuICAgICAgICAgICAgICAgICAgICAvLyBpbiBpdHMgaW50ZXJuYWwgYnVmZmVyLiBJbiB0aGlzIGNhc2UgdGhlIHN0cmVhbSBuZWVkcyBhIFwia2lja1wiIHRvIHRlbGwgaXQgdG9cbiAgICAgICAgICAgICAgICAgICAgLy8gY29udGludWUgZW1pdHRpbmcgcmVhZGFibGUgZXZlbnRzLCBzbyByZXF1ZXN0IHRvIHJlYWQgZXZlcnl0aGluZyB0aGUgc3RyZWFtXG4gICAgICAgICAgICAgICAgICAgIC8vIGhhcyBpbiBpdHMgaW50ZXJuYWwgYnVmZmVyIHJpZ2h0IG5vdy5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGJ1ZmZlci5ieXRlTGVuZ3RoIDwgKHNpemUgLSBidWZmZXJMZW5ndGgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSB0b1VpbnQ4QXJyYXkoc3RyZWFtWydyZWFkJ10odW5kZWZpbmVkKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gaWYgY2h1bmsgaXMgbm90IG51bGwgb3IgZW1wdHksIHB1c2ggaXQgb250byB0aGUgcXVldWVcbiAgICAgICAgICAgICAgICBpZiAoYnVmZmVyLmJ5dGVMZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGJ1ZmZlcnMucHVzaChidWZmZXIpO1xuICAgICAgICAgICAgICAgICAgICBidWZmZXJMZW5ndGggKz0gYnVmZmVyLmJ5dGVMZW5ndGg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBlbm91Z2ggYnl0ZXMgaW4gb3VyIGJ1ZmZlciwgeWllbGQgY2h1bmtzIHVudGlsIHdlIGRvbid0XG4gICAgICAgICAgICBpZiAoZG9uZSB8fCBzaXplIDw9IGJ1ZmZlckxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgKHsgY21kLCBzaXplIH0gPSB5aWVsZCBieXRlUmFuZ2UoKSk7XG4gICAgICAgICAgICAgICAgfSB3aGlsZSAoc2l6ZSA8IGJ1ZmZlckxlbmd0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gd2hpbGUgKCFkb25lKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgICBhd2FpdCBjbGVhbnVwKGV2ZW50cywgZXZlbnQgPT09ICdlcnJvcicgPyBlcnIgOiBudWxsKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbGVhbnVwPFQgZXh0ZW5kcyBFcnJvciB8IG51bGwgfCB2b2lkPihldmVudHM6IEV2ZW50W10sIGVycj86IFQpIHtcbiAgICAgICAgYnVmZmVyID0gYnVmZmVycyA9IDxhbnk+IG51bGw7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxUPihhc3luYyAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtldnQsIGZuXSBvZiBldmVudHMpIHtcbiAgICAgICAgICAgICAgICBzdHJlYW1bJ29mZiddKGV2dCwgZm4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvLyBTb21lIHN0cmVhbSBpbXBsZW1lbnRhdGlvbnMgZG9uJ3QgY2FsbCB0aGUgZGVzdHJveSBjYWxsYmFjayxcbiAgICAgICAgICAgICAgICAvLyBiZWNhdXNlIGl0J3MgcmVhbGx5IGEgbm9kZS1pbnRlcm5hbCBBUEkuIEp1c3QgY2FsbGluZyBgZGVzdHJveWBcbiAgICAgICAgICAgICAgICAvLyBoZXJlIHNob3VsZCBiZSBlbm91Z2ggdG8gY29uZm9ybSB0byB0aGUgUmVhZGFibGVTdHJlYW0gY29udHJhY3RcbiAgICAgICAgICAgICAgICBjb25zdCBkZXN0cm95ID0gKHN0cmVhbSBhcyBhbnkpWydkZXN0cm95J107XG4gICAgICAgICAgICAgICAgZGVzdHJveSAmJiBkZXN0cm95LmNhbGwoc3RyZWFtLCBlcnIpO1xuICAgICAgICAgICAgICAgIGVyciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHsgZXJyID0gZSB8fCBlcnI7IH0gZmluYWxseSB7XG4gICAgICAgICAgICAgICAgZXJyICE9IG51bGwgPyByZWplY3QoZXJyKSA6IHJlc29sdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufVxuIl19

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
const stream_1 = require("stream");
const compat_1 = require("../../util/compat");
/** @ignore */
function toNodeStream(source, options) {
    if (compat_1.isAsyncIterable(source)) {
        return new AsyncIterableReadable(source[Symbol.asyncIterator](), options);
    }
    if (compat_1.isIterable(source)) {
        return new IterableReadable(source[Symbol.iterator](), options);
    }
    /* istanbul ignore next */
    throw new Error(`toNodeStream() must be called with an Iterable or AsyncIterable`);
}
exports.toNodeStream = toNodeStream;
/** @ignore */
class IterableReadable extends stream_1.Readable {
    constructor(it, options) {
        super(options);
        this._iterator = it;
        this._pulling = false;
        this._bytesMode = !options || !options.objectMode;
    }
    _read(size) {
        const it = this._iterator;
        if (it && !this._pulling && (this._pulling = true)) {
            this._pulling = this._pull(size, it);
        }
    }
    _destroy(e, cb) {
        let it = this._iterator, fn;
        it && (fn = e != null && it.throw || it.return);
        fn && fn.call(it, e);
        cb && cb(null);
    }
    _pull(size, it) {
        const bm = this._bytesMode;
        let r = null;
        while (this.readable && !(r = it.next(bm ? size : null)).done) {
            if (size != null) {
                size -= (bm && ArrayBuffer.isView(r.value) ? r.value.byteLength : 1);
            }
            if (!this.push(r.value) || size <= 0) {
                break;
            }
        }
        if ((r && r.done || !this.readable) && (this.push(null) || true)) {
            it.return && it.return();
        }
        return !this.readable;
    }
}
/** @ignore */
class AsyncIterableReadable extends stream_1.Readable {
    constructor(it, options) {
        super(options);
        this._iterator = it;
        this._pulling = false;
        this._bytesMode = !options || !options.objectMode;
    }
    _read(size) {
        const it = this._iterator;
        if (it && !this._pulling && (this._pulling = true)) {
            (async () => this._pulling = await this._pull(size, it))();
        }
    }
    _destroy(e, cb) {
        let it = this._iterator, fn;
        it && (fn = e != null && it.throw || it.return);
        fn && fn.call(it, e).then(() => cb && cb(null)) || (cb && cb(null));
    }
    async _pull(size, it) {
        const bm = this._bytesMode;
        let r = null;
        while (this.readable && !(r = await it.next(bm ? size : null)).done) {
            if (size != null) {
                size -= (bm && ArrayBuffer.isView(r.value) ? r.value.byteLength : 1);
            }
            if (!this.push(r.value) || size <= 0) {
                break;
            }
        }
        if ((r && r.done || !this.readable) && (this.push(null) || true)) {
            it.return && it.return();
        }
        return !this.readable;
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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O2dCQUFFLE1BQU07YUFBRTtTQUNuRDtRQUNELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUU7WUFDOUQsRUFBRSxDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUM7U0FDNUI7UUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUMxQixDQUFDO0NBQ0oiLCJmaWxlIjoiaXBjL25vZGUvaXRlcmFibGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgUmVhZGFibGUgfSBmcm9tICdzdHJlYW0nO1xuaW1wb3J0IHsgaXNJdGVyYWJsZSwgaXNBc3luY0l0ZXJhYmxlIH0gZnJvbSAnLi4vLi4vdXRpbC9jb21wYXQnO1xuXG4vKiogQGlnbm9yZSAqL1xudHlwZSBSZWFkYWJsZU9wdGlvbnMgPSBpbXBvcnQoJ3N0cmVhbScpLlJlYWRhYmxlT3B0aW9ucztcblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBmdW5jdGlvbiB0b05vZGVTdHJlYW08VD4oc291cmNlOiBJdGVyYWJsZTxUPiB8IEFzeW5jSXRlcmFibGU8VD4sIG9wdGlvbnM/OiBSZWFkYWJsZU9wdGlvbnMpOiBSZWFkYWJsZSB7XG4gICAgaWYgKGlzQXN5bmNJdGVyYWJsZTxUPihzb3VyY2UpKSB7IHJldHVybiBuZXcgQXN5bmNJdGVyYWJsZVJlYWRhYmxlKHNvdXJjZVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKSwgb3B0aW9ucyk7IH1cbiAgICBpZiAoaXNJdGVyYWJsZTxUPihzb3VyY2UpKSB7IHJldHVybiBuZXcgSXRlcmFibGVSZWFkYWJsZShzb3VyY2VbU3ltYm9sLml0ZXJhdG9yXSgpLCBvcHRpb25zKTsgfVxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gICAgdGhyb3cgbmV3IEVycm9yKGB0b05vZGVTdHJlYW0oKSBtdXN0IGJlIGNhbGxlZCB3aXRoIGFuIEl0ZXJhYmxlIG9yIEFzeW5jSXRlcmFibGVgKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmNsYXNzIEl0ZXJhYmxlUmVhZGFibGU8VCBleHRlbmRzIFVpbnQ4QXJyYXkgfCBhbnk+IGV4dGVuZHMgUmVhZGFibGUge1xuICAgIHByaXZhdGUgX3B1bGxpbmc6IGJvb2xlYW47XG4gICAgcHJpdmF0ZSBfYnl0ZXNNb2RlOiBib29sZWFuO1xuICAgIHByaXZhdGUgX2l0ZXJhdG9yOiBJdGVyYXRvcjxUPjtcbiAgICBjb25zdHJ1Y3RvcihpdDogSXRlcmF0b3I8VD4sIG9wdGlvbnM/OiBSZWFkYWJsZU9wdGlvbnMpIHtcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG4gICAgICAgIHRoaXMuX2l0ZXJhdG9yID0gaXQ7XG4gICAgICAgIHRoaXMuX3B1bGxpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fYnl0ZXNNb2RlID0gIW9wdGlvbnMgfHwgIW9wdGlvbnMub2JqZWN0TW9kZTtcbiAgICB9XG4gICAgX3JlYWQoc2l6ZTogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGl0ID0gdGhpcy5faXRlcmF0b3I7XG4gICAgICAgIGlmIChpdCAmJiAhdGhpcy5fcHVsbGluZyAmJiAodGhpcy5fcHVsbGluZyA9IHRydWUpKSB7XG4gICAgICAgICAgICB0aGlzLl9wdWxsaW5nID0gdGhpcy5fcHVsbChzaXplLCBpdCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgX2Rlc3Ryb3koZTogRXJyb3IgfCBudWxsLCBjYjogKGU6IEVycm9yIHwgbnVsbCkgPT4gdm9pZCkge1xuICAgICAgICBsZXQgaXQgPSB0aGlzLl9pdGVyYXRvciwgZm46IGFueTtcbiAgICAgICAgaXQgJiYgKGZuID0gZSAhPSBudWxsICYmIGl0LnRocm93IHx8IGl0LnJldHVybik7XG4gICAgICAgIGZuICYmIGZuLmNhbGwoaXQsIGUpO1xuICAgICAgICBjYiAmJiBjYihudWxsKTtcbiAgICB9XG4gICAgcHJpdmF0ZSBfcHVsbChzaXplOiBudW1iZXIsIGl0OiBJdGVyYXRvcjxUPikge1xuICAgICAgICBjb25zdCBibSA9IHRoaXMuX2J5dGVzTW9kZTtcbiAgICAgICAgbGV0IHI6IEl0ZXJhdG9yUmVzdWx0PFQ+IHwgbnVsbCA9IG51bGw7XG4gICAgICAgIHdoaWxlICh0aGlzLnJlYWRhYmxlICYmICEociA9IGl0Lm5leHQoYm0gPyBzaXplIDogbnVsbCkpLmRvbmUpIHtcbiAgICAgICAgICAgIGlmIChzaXplICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBzaXplIC09IChibSAmJiBBcnJheUJ1ZmZlci5pc1ZpZXcoci52YWx1ZSkgPyByLnZhbHVlLmJ5dGVMZW5ndGggOiAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdGhpcy5wdXNoKHIudmFsdWUpIHx8IHNpemUgPD0gMCkgeyBicmVhazsgfVxuICAgICAgICB9XG4gICAgICAgIGlmICgociAmJiByLmRvbmUgfHwgIXRoaXMucmVhZGFibGUpICYmICh0aGlzLnB1c2gobnVsbCkgfHwgdHJ1ZSkpIHtcbiAgICAgICAgICAgIGl0LnJldHVybiAmJiBpdC5yZXR1cm4oKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gIXRoaXMucmVhZGFibGU7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuY2xhc3MgQXN5bmNJdGVyYWJsZVJlYWRhYmxlPFQgZXh0ZW5kcyBVaW50OEFycmF5IHwgYW55PiBleHRlbmRzIFJlYWRhYmxlIHtcbiAgICBwcml2YXRlIF9wdWxsaW5nOiBib29sZWFuO1xuICAgIHByaXZhdGUgX2J5dGVzTW9kZTogYm9vbGVhbjtcbiAgICBwcml2YXRlIF9pdGVyYXRvcjogQXN5bmNJdGVyYXRvcjxUPjtcbiAgICBjb25zdHJ1Y3RvcihpdDogQXN5bmNJdGVyYXRvcjxUPiwgb3B0aW9ucz86IFJlYWRhYmxlT3B0aW9ucykge1xuICAgICAgICBzdXBlcihvcHRpb25zKTtcbiAgICAgICAgdGhpcy5faXRlcmF0b3IgPSBpdDtcbiAgICAgICAgdGhpcy5fcHVsbGluZyA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9ieXRlc01vZGUgPSAhb3B0aW9ucyB8fCAhb3B0aW9ucy5vYmplY3RNb2RlO1xuICAgIH1cbiAgICBfcmVhZChzaXplOiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgaXQgPSB0aGlzLl9pdGVyYXRvcjtcbiAgICAgICAgaWYgKGl0ICYmICF0aGlzLl9wdWxsaW5nICYmICh0aGlzLl9wdWxsaW5nID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgIChhc3luYyAoKSA9PiB0aGlzLl9wdWxsaW5nID0gYXdhaXQgdGhpcy5fcHVsbChzaXplLCBpdCkpKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgX2Rlc3Ryb3koZTogRXJyb3IgfCBudWxsLCBjYjogKGU6IEVycm9yIHwgbnVsbCkgPT4gdm9pZCkge1xuICAgICAgICBsZXQgaXQgPSB0aGlzLl9pdGVyYXRvciwgZm46IGFueTtcbiAgICAgICAgaXQgJiYgKGZuID0gZSAhPSBudWxsICYmIGl0LnRocm93IHx8IGl0LnJldHVybik7XG4gICAgICAgIGZuICYmIGZuLmNhbGwoaXQsIGUpLnRoZW4oKCkgPT4gY2IgJiYgY2IobnVsbCkpIHx8IChjYiAmJiBjYihudWxsKSk7XG4gICAgfVxuICAgIHByaXZhdGUgYXN5bmMgX3B1bGwoc2l6ZTogbnVtYmVyLCBpdDogQXN5bmNJdGVyYXRvcjxUPikge1xuICAgICAgICBjb25zdCBibSA9IHRoaXMuX2J5dGVzTW9kZTtcbiAgICAgICAgbGV0IHI6IEl0ZXJhdG9yUmVzdWx0PFQ+IHwgbnVsbCA9IG51bGw7XG4gICAgICAgIHdoaWxlICh0aGlzLnJlYWRhYmxlICYmICEociA9IGF3YWl0IGl0Lm5leHQoYm0gPyBzaXplIDogbnVsbCkpLmRvbmUpIHtcbiAgICAgICAgICAgIGlmIChzaXplICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBzaXplIC09IChibSAmJiBBcnJheUJ1ZmZlci5pc1ZpZXcoci52YWx1ZSkgPyByLnZhbHVlLmJ5dGVMZW5ndGggOiAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdGhpcy5wdXNoKHIudmFsdWUpIHx8IHNpemUgPD0gMCkgeyBicmVhazsgfVxuICAgICAgICB9XG4gICAgICAgIGlmICgociAmJiByLmRvbmUgfHwgIXRoaXMucmVhZGFibGUpICYmICh0aGlzLnB1c2gobnVsbCkgfHwgdHJ1ZSkpIHtcbiAgICAgICAgICAgIGl0LnJldHVybiAmJiBpdC5yZXR1cm4oKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gIXRoaXMucmVhZGFibGU7XG4gICAgfVxufVxuIl19

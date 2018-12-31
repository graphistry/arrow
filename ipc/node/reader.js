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
const stream_1 = require("stream");
const stream_2 = require("../../io/stream");
const reader_1 = require("../../ipc/reader");
/** @ignore */
function recordBatchReaderThroughNodeStream() {
    return new RecordBatchReaderDuplex();
}
exports.recordBatchReaderThroughNodeStream = recordBatchReaderThroughNodeStream;
/** @ignore */
class RecordBatchReaderDuplex extends stream_1.Duplex {
    constructor() {
        super({ allowHalfOpen: false, readableObjectMode: true, writableObjectMode: false });
        this._pulling = false;
        this._reader = null;
        this._asyncQueue = new stream_2.AsyncByteQueue();
    }
    _final(cb) {
        const aq = this._asyncQueue;
        aq && aq.close();
        cb && cb();
    }
    _write(x, _, cb) {
        const aq = this._asyncQueue;
        aq && aq.write(x);
        cb && cb();
        return true;
    }
    _read(size) {
        const aq = this._asyncQueue;
        if (aq && !this._pulling && (this._pulling = true)) {
            (() => tslib_1.__awaiter(this, void 0, void 0, function* () {
                if (!this._reader) {
                    this._reader = yield this._open(aq);
                }
                this._pulling = yield this._pull(size, this._reader);
            }))();
        }
    }
    _destroy(err, cb) {
        const aq = this._asyncQueue;
        if (aq) {
            err ? aq.abort(err) : aq.close();
        }
        cb(this._asyncQueue = this._reader = null);
    }
    _open(source) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield (yield reader_1.RecordBatchReader.from(source)).open();
        });
    }
    _pull(size, reader) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let r = null;
            while (this.readable && !(r = yield reader.next()).done) {
                if (!this.push(r.value) || (size != null && --size <= 0)) {
                    break;
                }
            }
            if ((r && r.done || !this.readable) && (this.push(null) || true)) {
                yield reader.cancel();
            }
            return !this.readable;
        });
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFLLENBQUMsSUFBWSxFQUFFLE1BQTRCOztZQUNsRCxJQUFJLENBQUMsR0FBMEMsSUFBSSxDQUFDO1lBQ3BELE9BQU8sSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFO2dCQUNyRCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxJQUFJLEVBQUUsSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFFO29CQUFFLE1BQU07aUJBQUU7YUFDdkU7WUFDRCxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFO2dCQUM5RCxNQUFNLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQzthQUN6QjtZQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQzFCLENBQUM7S0FBQTtDQUNKIiwiZmlsZSI6ImlwYy9ub2RlL3JlYWRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBEdXBsZXggfSBmcm9tICdzdHJlYW0nO1xuaW1wb3J0IHsgRGF0YVR5cGUgfSBmcm9tICcuLi8uLi90eXBlJztcbmltcG9ydCB7IFJlY29yZEJhdGNoIH0gZnJvbSAnLi4vLi4vcmVjb3JkYmF0Y2gnO1xuaW1wb3J0IHsgQXN5bmNCeXRlUXVldWUgfSBmcm9tICcuLi8uLi9pby9zdHJlYW0nO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2hSZWFkZXIgfSBmcm9tICcuLi8uLi9pcGMvcmVhZGVyJztcblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBmdW5jdGlvbiByZWNvcmRCYXRjaFJlYWRlclRocm91Z2hOb2RlU3RyZWFtPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KCkge1xuICAgIHJldHVybiBuZXcgUmVjb3JkQmF0Y2hSZWFkZXJEdXBsZXg8VD4oKTtcbn1cblxudHlwZSBDQiA9IChlcnJvcj86IEVycm9yIHwgbnVsbCB8IHVuZGVmaW5lZCkgPT4gdm9pZDtcblxuLyoqIEBpZ25vcmUgKi9cbmNsYXNzIFJlY29yZEJhdGNoUmVhZGVyRHVwbGV4PFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgRHVwbGV4IHtcbiAgICBwcml2YXRlIF9wdWxsaW5nOiBib29sZWFuID0gZmFsc2U7XG4gICAgcHJpdmF0ZSBfcmVhZGVyOiBSZWNvcmRCYXRjaFJlYWRlciB8IG51bGw7XG4gICAgcHJpdmF0ZSBfYXN5bmNRdWV1ZTogQXN5bmNCeXRlUXVldWUgfCBudWxsO1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcih7IGFsbG93SGFsZk9wZW46IGZhbHNlLCByZWFkYWJsZU9iamVjdE1vZGU6IHRydWUsIHdyaXRhYmxlT2JqZWN0TW9kZTogZmFsc2UgfSk7XG4gICAgICAgIHRoaXMuX3JlYWRlciA9IG51bGw7XG4gICAgICAgIHRoaXMuX2FzeW5jUXVldWUgPSBuZXcgQXN5bmNCeXRlUXVldWUoKTtcbiAgICB9XG4gICAgX2ZpbmFsKGNiPzogQ0IpIHtcbiAgICAgICAgY29uc3QgYXEgPSB0aGlzLl9hc3luY1F1ZXVlO1xuICAgICAgICBhcSAmJiBhcS5jbG9zZSgpO1xuICAgICAgICBjYiAmJiBjYigpO1xuICAgIH1cbiAgICBfd3JpdGUoeDogYW55LCBfOiBzdHJpbmcsIGNiOiBDQikge1xuICAgICAgICBjb25zdCBhcSA9IHRoaXMuX2FzeW5jUXVldWU7XG4gICAgICAgIGFxICYmIGFxLndyaXRlKHgpO1xuICAgICAgICBjYiAmJiBjYigpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgX3JlYWQoc2l6ZTogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGFxID0gdGhpcy5fYXN5bmNRdWV1ZTtcbiAgICAgICAgaWYgKGFxICYmICF0aGlzLl9wdWxsaW5nICYmICh0aGlzLl9wdWxsaW5nID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgIChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9yZWFkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcmVhZGVyID0gYXdhaXQgdGhpcy5fb3BlbihhcSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuX3B1bGxpbmcgPSBhd2FpdCB0aGlzLl9wdWxsKHNpemUsIHRoaXMuX3JlYWRlcik7XG4gICAgICAgICAgICB9KSgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIF9kZXN0cm95KGVycjogRXJyb3IgfCBudWxsLCBjYjogKGVycm9yOiBFcnJvciB8IG51bGwpID0+IHZvaWQpIHtcbiAgICAgICAgY29uc3QgYXEgPSB0aGlzLl9hc3luY1F1ZXVlO1xuICAgICAgICBpZiAoYXEpIHsgZXJyID8gYXEuYWJvcnQoZXJyKSA6IGFxLmNsb3NlKCk7IH1cbiAgICAgICAgY2IodGhpcy5fYXN5bmNRdWV1ZSA9IHRoaXMuX3JlYWRlciA9IG51bGwpO1xuICAgIH1cbiAgICBhc3luYyBfb3Blbihzb3VyY2U6IEFzeW5jQnl0ZVF1ZXVlKSB7XG4gICAgICAgIHJldHVybiBhd2FpdCAoYXdhaXQgUmVjb3JkQmF0Y2hSZWFkZXIuZnJvbShzb3VyY2UpKS5vcGVuKCk7XG4gICAgfVxuICAgIGFzeW5jIF9wdWxsKHNpemU6IG51bWJlciwgcmVhZGVyOiBSZWNvcmRCYXRjaFJlYWRlcjxUPikge1xuICAgICAgICBsZXQgcjogSXRlcmF0b3JSZXN1bHQ8UmVjb3JkQmF0Y2g8VD4+IHwgbnVsbCA9IG51bGw7XG4gICAgICAgIHdoaWxlICh0aGlzLnJlYWRhYmxlICYmICEociA9IGF3YWl0IHJlYWRlci5uZXh0KCkpLmRvbmUpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5wdXNoKHIudmFsdWUpIHx8IChzaXplICE9IG51bGwgJiYgLS1zaXplIDw9IDApKSB7IGJyZWFrOyB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKChyICYmIHIuZG9uZSB8fCAhdGhpcy5yZWFkYWJsZSkgJiYgKHRoaXMucHVzaChudWxsKSB8fCB0cnVlKSkge1xuICAgICAgICAgICAgYXdhaXQgcmVhZGVyLmNhbmNlbCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAhdGhpcy5yZWFkYWJsZTtcbiAgICB9XG59XG4iXX0=

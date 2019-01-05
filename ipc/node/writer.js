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
/** @ignore */
function recordBatchWriterThroughNodeStream(options) {
    return new RecordBatchWriterDuplex(new this(options));
}
exports.recordBatchWriterThroughNodeStream = recordBatchWriterThroughNodeStream;
/** @ignore */
class RecordBatchWriterDuplex extends stream_1.Duplex {
    constructor(writer, options) {
        super(Object.assign({ allowHalfOpen: false }, options, { writableObjectMode: true, readableObjectMode: false }));
        this._pulling = false;
        this._writer = writer;
        this._reader = new stream_2.AsyncByteStream(writer);
    }
    _final(cb) {
        const writer = this._writer;
        writer && writer.close();
        cb && cb();
    }
    _write(x, _, cb) {
        const writer = this._writer;
        writer && writer.write(x);
        cb && cb();
        return true;
    }
    _read(size) {
        const it = this._reader;
        if (it && !this._pulling && (this._pulling = true)) {
            (() => tslib_1.__awaiter(this, void 0, void 0, function* () { return this._pulling = yield this._pull(size, it); }))();
        }
    }
    _destroy(err, cb) {
        const writer = this._writer;
        if (writer) {
            err ? writer.abort(err) : writer.close();
        }
        cb(this._reader = this._writer = null);
    }
    _pull(size, reader) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let r = null;
            while (this.readable && !(r = yield reader.next(size || null)).done) {
                if (size != null && r.value) {
                    size -= r.value.byteLength;
                }
                if (!this.push(r.value) || size <= 0) {
                    break;
                }
            }
            if ((r && r.done || !this.readable)) {
                this.push(null);
                yield reader.cancel();
            }
            return !this.readable;
        });
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFJLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRTtvQkFDekIsSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDO2lCQUM5QjtnQkFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsRUFBRTtvQkFBRSxNQUFNO2lCQUFFO2FBQ25EO1lBQ0QsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUNqQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNoQixNQUFNLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQzthQUN6QjtZQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQzFCLENBQUM7S0FBQTtDQUNKIiwiZmlsZSI6ImlwYy9ub2RlL3dyaXRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBEdXBsZXgsIER1cGxleE9wdGlvbnMgfSBmcm9tICdzdHJlYW0nO1xuaW1wb3J0IHsgRGF0YVR5cGUgfSBmcm9tICcuLi8uLi90eXBlJztcbmltcG9ydCB7IEFzeW5jQnl0ZVN0cmVhbSB9IGZyb20gJy4uLy4uL2lvL3N0cmVhbSc7XG5pbXBvcnQgeyBSZWNvcmRCYXRjaFdyaXRlciB9IGZyb20gJy4uLy4uL2lwYy93cml0ZXInO1xuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlY29yZEJhdGNoV3JpdGVyVGhyb3VnaE5vZGVTdHJlYW08VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLCBvcHRpb25zPzogRHVwbGV4T3B0aW9ucyAmIHsgYXV0b0Rlc3Ryb3k6IGJvb2xlYW4gfSkge1xuICAgIHJldHVybiBuZXcgUmVjb3JkQmF0Y2hXcml0ZXJEdXBsZXgobmV3IHRoaXM8VD4ob3B0aW9ucykpO1xufVxuXG50eXBlIENCID0gKGVycm9yPzogRXJyb3IgfCBudWxsIHwgdW5kZWZpbmVkKSA9PiB2b2lkO1xuXG4vKiogQGlnbm9yZSAqL1xuY2xhc3MgUmVjb3JkQmF0Y2hXcml0ZXJEdXBsZXg8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBEdXBsZXgge1xuICAgIHByaXZhdGUgX3B1bGxpbmc6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICBwcml2YXRlIF9yZWFkZXI6IEFzeW5jQnl0ZVN0cmVhbSB8IG51bGw7XG4gICAgcHJpdmF0ZSBfd3JpdGVyOiBSZWNvcmRCYXRjaFdyaXRlciB8IG51bGw7XG4gICAgY29uc3RydWN0b3Iod3JpdGVyOiBSZWNvcmRCYXRjaFdyaXRlcjxUPiwgb3B0aW9ucz86IER1cGxleE9wdGlvbnMpIHtcbiAgICAgICAgc3VwZXIoeyBhbGxvd0hhbGZPcGVuOiBmYWxzZSwgLi4ub3B0aW9ucywgd3JpdGFibGVPYmplY3RNb2RlOiB0cnVlLCByZWFkYWJsZU9iamVjdE1vZGU6IGZhbHNlIH0pO1xuICAgICAgICB0aGlzLl93cml0ZXIgPSB3cml0ZXI7XG4gICAgICAgIHRoaXMuX3JlYWRlciA9IG5ldyBBc3luY0J5dGVTdHJlYW0od3JpdGVyKTtcbiAgICB9XG4gICAgX2ZpbmFsKGNiPzogQ0IpIHtcbiAgICAgICAgY29uc3Qgd3JpdGVyID0gdGhpcy5fd3JpdGVyO1xuICAgICAgICB3cml0ZXIgJiYgd3JpdGVyLmNsb3NlKCk7XG4gICAgICAgIGNiICYmIGNiKCk7XG4gICAgfVxuICAgIF93cml0ZSh4OiBhbnksIF86IHN0cmluZywgY2I6IENCKSB7XG4gICAgICAgIGNvbnN0IHdyaXRlciA9IHRoaXMuX3dyaXRlcjtcbiAgICAgICAgd3JpdGVyICYmIHdyaXRlci53cml0ZSh4KTtcbiAgICAgICAgY2IgJiYgY2IoKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIF9yZWFkKHNpemU6IG51bWJlcikge1xuICAgICAgICBjb25zdCBpdCA9IHRoaXMuX3JlYWRlcjtcbiAgICAgICAgaWYgKGl0ICYmICF0aGlzLl9wdWxsaW5nICYmICh0aGlzLl9wdWxsaW5nID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgIChhc3luYyAoKSA9PiB0aGlzLl9wdWxsaW5nID0gYXdhaXQgdGhpcy5fcHVsbChzaXplLCBpdCkpKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgX2Rlc3Ryb3koZXJyOiBFcnJvciB8IG51bGwsIGNiOiAoZXJyb3I6IEVycm9yIHwgbnVsbCkgPT4gdm9pZCkge1xuICAgICAgICBjb25zdCB3cml0ZXIgPSB0aGlzLl93cml0ZXI7XG4gICAgICAgIGlmICh3cml0ZXIpIHsgZXJyID8gd3JpdGVyLmFib3J0KGVycikgOiB3cml0ZXIuY2xvc2UoKTsgfVxuICAgICAgICBjYih0aGlzLl9yZWFkZXIgPSB0aGlzLl93cml0ZXIgPSBudWxsKTtcbiAgICB9XG4gICAgYXN5bmMgX3B1bGwoc2l6ZTogbnVtYmVyLCByZWFkZXI6IEFzeW5jQnl0ZVN0cmVhbSkge1xuICAgICAgICBsZXQgcjogSXRlcmF0b3JSZXN1bHQ8VWludDhBcnJheT4gfCBudWxsID0gbnVsbDtcbiAgICAgICAgd2hpbGUgKHRoaXMucmVhZGFibGUgJiYgIShyID0gYXdhaXQgcmVhZGVyLm5leHQoc2l6ZSB8fCBudWxsKSkuZG9uZSkge1xuICAgICAgICAgICAgaWYgKHNpemUgIT0gbnVsbCAmJiByLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgc2l6ZSAtPSByLnZhbHVlLmJ5dGVMZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXRoaXMucHVzaChyLnZhbHVlKSB8fCBzaXplIDw9IDApIHsgYnJlYWs7IH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoKHIgJiYgci5kb25lIHx8ICF0aGlzLnJlYWRhYmxlKSkge1xuICAgICAgICAgICAgdGhpcy5wdXNoKG51bGwpO1xuICAgICAgICAgICAgYXdhaXQgcmVhZGVyLmNhbmNlbCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAhdGhpcy5yZWFkYWJsZTtcbiAgICB9XG59XG4iXX0=

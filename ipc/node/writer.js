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
function recordBatchWriterThroughNodeStream() {
    return new RecordBatchWriterDuplex(new this());
}
exports.recordBatchWriterThroughNodeStream = recordBatchWriterThroughNodeStream;
class RecordBatchWriterDuplex extends stream_1.Duplex {
    constructor(writer) {
        super({ allowHalfOpen: false, writableObjectMode: true, readableObjectMode: false });
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
            if ((r && r.done || !this.readable) && (this.push(null) || true)) {
                yield reader.cancel();
            }
            return !this.readable;
        });
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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SSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDO2lCQUM5QjtnQkFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsRUFBRTtvQkFBRSxNQUFNO2lCQUFFO2FBQ25EO1lBQ0QsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRTtnQkFDOUQsTUFBTSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDekI7WUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUMxQixDQUFDO0tBQUE7Q0FDSiIsImZpbGUiOiJpcGMvbm9kZS93cml0ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgRHVwbGV4IH0gZnJvbSAnc3RyZWFtJztcbmltcG9ydCB7IERhdGFUeXBlIH0gZnJvbSAnLi4vLi4vdHlwZSc7XG5pbXBvcnQgeyBBc3luY0J5dGVTdHJlYW0gfSBmcm9tICcuLi8uLi9pby9zdHJlYW0nO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2hXcml0ZXIgfSBmcm9tICcuLi8uLi9pcGMvd3JpdGVyJztcblxuZXhwb3J0IGZ1bmN0aW9uIHJlY29yZEJhdGNoV3JpdGVyVGhyb3VnaE5vZGVTdHJlYW08VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyKSB7XG4gICAgcmV0dXJuIG5ldyBSZWNvcmRCYXRjaFdyaXRlckR1cGxleChuZXcgdGhpczxUPigpKTtcbn1cblxudHlwZSBDQiA9IChlcnJvcj86IEVycm9yIHwgbnVsbCB8IHVuZGVmaW5lZCkgPT4gdm9pZDtcblxuY2xhc3MgUmVjb3JkQmF0Y2hXcml0ZXJEdXBsZXg8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBEdXBsZXgge1xuICAgIHByaXZhdGUgX3B1bGxpbmc6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICBwcml2YXRlIF9yZWFkZXI6IEFzeW5jQnl0ZVN0cmVhbSB8IG51bGw7XG4gICAgcHJpdmF0ZSBfd3JpdGVyOiBSZWNvcmRCYXRjaFdyaXRlciB8IG51bGw7XG4gICAgY29uc3RydWN0b3Iod3JpdGVyOiBSZWNvcmRCYXRjaFdyaXRlcjxUPikge1xuICAgICAgICBzdXBlcih7IGFsbG93SGFsZk9wZW46IGZhbHNlLCB3cml0YWJsZU9iamVjdE1vZGU6IHRydWUsIHJlYWRhYmxlT2JqZWN0TW9kZTogZmFsc2UgfSk7XG4gICAgICAgIHRoaXMuX3dyaXRlciA9IHdyaXRlcjtcbiAgICAgICAgdGhpcy5fcmVhZGVyID0gbmV3IEFzeW5jQnl0ZVN0cmVhbSh3cml0ZXIpO1xuICAgIH1cbiAgICBfZmluYWwoY2I/OiBDQikge1xuICAgICAgICBjb25zdCB3cml0ZXIgPSB0aGlzLl93cml0ZXI7XG4gICAgICAgIHdyaXRlciAmJiB3cml0ZXIuY2xvc2UoKTtcbiAgICAgICAgY2IgJiYgY2IoKTtcbiAgICB9XG4gICAgX3dyaXRlKHg6IGFueSwgXzogc3RyaW5nLCBjYjogQ0IpIHtcbiAgICAgICAgY29uc3Qgd3JpdGVyID0gdGhpcy5fd3JpdGVyO1xuICAgICAgICB3cml0ZXIgJiYgd3JpdGVyLndyaXRlKHgpO1xuICAgICAgICBjYiAmJiBjYigpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgX3JlYWQoc2l6ZTogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGl0ID0gdGhpcy5fcmVhZGVyO1xuICAgICAgICBpZiAoaXQgJiYgIXRoaXMuX3B1bGxpbmcgJiYgKHRoaXMuX3B1bGxpbmcgPSB0cnVlKSkge1xuICAgICAgICAgICAgKGFzeW5jICgpID0+IHRoaXMuX3B1bGxpbmcgPSBhd2FpdCB0aGlzLl9wdWxsKHNpemUsIGl0KSkoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBfZGVzdHJveShlcnI6IEVycm9yIHwgbnVsbCwgY2I6IChlcnJvcjogRXJyb3IgfCBudWxsKSA9PiB2b2lkKSB7XG4gICAgICAgIGNvbnN0IHdyaXRlciA9IHRoaXMuX3dyaXRlcjtcbiAgICAgICAgaWYgKHdyaXRlcikgeyBlcnIgPyB3cml0ZXIuYWJvcnQoZXJyKSA6IHdyaXRlci5jbG9zZSgpOyB9XG4gICAgICAgIGNiKHRoaXMuX3JlYWRlciA9IHRoaXMuX3dyaXRlciA9IG51bGwpO1xuICAgIH1cbiAgICBhc3luYyBfcHVsbChzaXplOiBudW1iZXIsIHJlYWRlcjogQXN5bmNCeXRlU3RyZWFtKSB7XG4gICAgICAgIGxldCByOiBJdGVyYXRvclJlc3VsdDxVaW50OEFycmF5PiB8IG51bGwgPSBudWxsO1xuICAgICAgICB3aGlsZSAodGhpcy5yZWFkYWJsZSAmJiAhKHIgPSBhd2FpdCByZWFkZXIubmV4dChzaXplIHx8IG51bGwpKS5kb25lKSB7XG4gICAgICAgICAgICBpZiAoc2l6ZSAhPSBudWxsICYmIHIudmFsdWUpIHtcbiAgICAgICAgICAgICAgICBzaXplIC09IHIudmFsdWUuYnl0ZUxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdGhpcy5wdXNoKHIudmFsdWUpIHx8IHNpemUgPD0gMCkgeyBicmVhazsgfVxuICAgICAgICB9XG4gICAgICAgIGlmICgociAmJiByLmRvbmUgfHwgIXRoaXMucmVhZGFibGUpICYmICh0aGlzLnB1c2gobnVsbCkgfHwgdHJ1ZSkpIHtcbiAgICAgICAgICAgIGF3YWl0IHJlYWRlci5jYW5jZWwoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gIXRoaXMucmVhZGFibGU7XG4gICAgfVxufVxuIl19

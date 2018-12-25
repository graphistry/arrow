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
function recordBatchReaderThroughNodeStream() {
    return new RecordBatchReaderDuplex();
}
exports.recordBatchReaderThroughNodeStream = recordBatchReaderThroughNodeStream;
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
                ;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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SUFBWSxFQUFFLE1BQTRCOztZQUNsRCxJQUFJLENBQUMsR0FBMEMsSUFBSSxDQUFDO1lBQ3BELE9BQU8sSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFO2dCQUNyRCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxJQUFJLEVBQUUsSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFFO29CQUFFLE1BQU07aUJBQUU7YUFDdkU7WUFDRCxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFO2dCQUM5RCxNQUFNLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQzthQUN6QjtZQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQzFCLENBQUM7S0FBQTtDQUNKIiwiZmlsZSI6ImlwYy9ub2RlL3JlYWRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBEdXBsZXggfSBmcm9tICdzdHJlYW0nO1xuaW1wb3J0IHsgRGF0YVR5cGUgfSBmcm9tICcuLi8uLi90eXBlJztcbmltcG9ydCB7IFJlY29yZEJhdGNoIH0gZnJvbSAnLi4vLi4vcmVjb3JkYmF0Y2gnO1xuaW1wb3J0IHsgQXN5bmNCeXRlUXVldWUgfSBmcm9tICcuLi8uLi9pby9zdHJlYW0nO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2hSZWFkZXIgfSBmcm9tICcuLi8uLi9pcGMvcmVhZGVyJztcblxuZXhwb3J0IGZ1bmN0aW9uIHJlY29yZEJhdGNoUmVhZGVyVGhyb3VnaE5vZGVTdHJlYW08VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oKSB7XG4gICAgcmV0dXJuIG5ldyBSZWNvcmRCYXRjaFJlYWRlckR1cGxleDxUPigpO1xufVxuXG50eXBlIENCID0gKGVycm9yPzogRXJyb3IgfCBudWxsIHwgdW5kZWZpbmVkKSA9PiB2b2lkO1xuXG5jbGFzcyBSZWNvcmRCYXRjaFJlYWRlckR1cGxleDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiBleHRlbmRzIER1cGxleCB7XG4gICAgcHJpdmF0ZSBfcHVsbGluZzogYm9vbGVhbiA9IGZhbHNlO1xuICAgIHByaXZhdGUgX3JlYWRlcjogUmVjb3JkQmF0Y2hSZWFkZXIgfCBudWxsO1xuICAgIHByaXZhdGUgX2FzeW5jUXVldWU6IEFzeW5jQnl0ZVF1ZXVlIHwgbnVsbDtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoeyBhbGxvd0hhbGZPcGVuOiBmYWxzZSwgcmVhZGFibGVPYmplY3RNb2RlOiB0cnVlLCB3cml0YWJsZU9iamVjdE1vZGU6IGZhbHNlIH0pO1xuICAgICAgICB0aGlzLl9yZWFkZXIgPSBudWxsO1xuICAgICAgICB0aGlzLl9hc3luY1F1ZXVlID0gbmV3IEFzeW5jQnl0ZVF1ZXVlKCk7XG4gICAgfVxuICAgIF9maW5hbChjYj86IENCKSB7XG4gICAgICAgIGNvbnN0IGFxID0gdGhpcy5fYXN5bmNRdWV1ZTtcbiAgICAgICAgYXEgJiYgYXEuY2xvc2UoKTtcbiAgICAgICAgY2IgJiYgY2IoKTtcbiAgICB9XG4gICAgX3dyaXRlKHg6IGFueSwgXzogc3RyaW5nLCBjYjogQ0IpIHtcbiAgICAgICAgY29uc3QgYXEgPSB0aGlzLl9hc3luY1F1ZXVlO1xuICAgICAgICBhcSAmJiBhcS53cml0ZSh4KTtcbiAgICAgICAgY2IgJiYgY2IoKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIF9yZWFkKHNpemU6IG51bWJlcikge1xuICAgICAgICBjb25zdCBhcSA9IHRoaXMuX2FzeW5jUXVldWU7XG4gICAgICAgIGlmIChhcSAmJiAhdGhpcy5fcHVsbGluZyAmJiAodGhpcy5fcHVsbGluZyA9IHRydWUpKSB7XG4gICAgICAgICAgICAoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5fcmVhZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3JlYWRlciA9IGF3YWl0IHRoaXMuX29wZW4oYXEpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdGhpcy5fcHVsbGluZyA9IGF3YWl0IHRoaXMuX3B1bGwoc2l6ZSwgdGhpcy5fcmVhZGVyKTtcbiAgICAgICAgICAgIH0pKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgX2Rlc3Ryb3koZXJyOiBFcnJvciB8IG51bGwsIGNiOiAoZXJyb3I6IEVycm9yIHwgbnVsbCkgPT4gdm9pZCkge1xuICAgICAgICBjb25zdCBhcSA9IHRoaXMuX2FzeW5jUXVldWU7XG4gICAgICAgIGlmIChhcSkgeyBlcnIgPyBhcS5hYm9ydChlcnIpIDogYXEuY2xvc2UoKTsgfVxuICAgICAgICBjYih0aGlzLl9hc3luY1F1ZXVlID0gdGhpcy5fcmVhZGVyID0gbnVsbCk7XG4gICAgfVxuICAgIGFzeW5jIF9vcGVuKHNvdXJjZTogQXN5bmNCeXRlUXVldWUpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IChhd2FpdCBSZWNvcmRCYXRjaFJlYWRlci5mcm9tKHNvdXJjZSkpLm9wZW4oKTtcbiAgICB9XG4gICAgYXN5bmMgX3B1bGwoc2l6ZTogbnVtYmVyLCByZWFkZXI6IFJlY29yZEJhdGNoUmVhZGVyPFQ+KSB7XG4gICAgICAgIGxldCByOiBJdGVyYXRvclJlc3VsdDxSZWNvcmRCYXRjaDxUPj4gfCBudWxsID0gbnVsbDtcbiAgICAgICAgd2hpbGUgKHRoaXMucmVhZGFibGUgJiYgIShyID0gYXdhaXQgcmVhZGVyLm5leHQoKSkuZG9uZSkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLnB1c2goci52YWx1ZSkgfHwgKHNpemUgIT0gbnVsbCAmJiAtLXNpemUgPD0gMCkpIHsgYnJlYWs7IH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoKHIgJiYgci5kb25lIHx8ICF0aGlzLnJlYWRhYmxlKSAmJiAodGhpcy5wdXNoKG51bGwpIHx8IHRydWUpKSB7XG4gICAgICAgICAgICBhd2FpdCByZWFkZXIuY2FuY2VsKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICF0aGlzLnJlYWRhYmxlO1xuICAgIH1cbn1cbiJdfQ==

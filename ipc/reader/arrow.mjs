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
import * as tslib_1 from "tslib";
import { readJSON } from './json';
import { fromReadableStream } from './node';
import { RecordBatch } from '../../recordbatch';
import { readBuffers, readBuffersAsync } from './binary';
import { readRecordBatches, readRecordBatchesAsync } from './vector';
export { readJSON, RecordBatch };
export { readBuffers, readBuffersAsync };
export { readRecordBatches, readRecordBatchesAsync };
export function* read(sources) {
    let input = sources;
    let messages;
    if (typeof input === 'string') {
        try {
            input = JSON.parse(input);
        }
        catch (e) {
            input = sources;
        }
    }
    if (!input || typeof input !== 'object') {
        messages = (typeof input === 'string') ? readBuffers([input]) : [];
    }
    else {
        messages = (typeof input[Symbol.iterator] === 'function') ? readBuffers(input) : readJSON(input);
    }
    yield* readRecordBatches(messages);
}
export function readAsync(sources) {
    return tslib_1.__asyncGenerator(this, arguments, function* readAsync_1() {
        try {
            for (var _a = tslib_1.__asyncValues(readRecordBatchesAsync(readBuffersAsync(sources))), _b; _b = yield tslib_1.__await(_a.next()), !_b.done;) {
                let recordBatch = yield tslib_1.__await(_b.value);
                yield recordBatch;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_b && !_b.done && (_c = _a.return)) yield tslib_1.__await(_c.call(_a));
            }
            finally { if (e_1) throw e_1.error; }
        }
        var e_1, _c;
    });
}
export function readStream(stream) {
    return tslib_1.__asyncGenerator(this, arguments, function* readStream_1() {
        try {
            for (var _a = tslib_1.__asyncValues(readAsync(fromReadableStream(stream))), _b; _b = yield tslib_1.__await(_a.next()), !_b.done;) {
                const recordBatch = yield tslib_1.__await(_b.value);
                yield recordBatch;
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_b && !_b.done && (_c = _a.return)) yield tslib_1.__await(_c.call(_a));
            }
            finally { if (e_2) throw e_2.error; }
        }
        var e_2, _c;
    });
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyByZWFkSlNPTiB9IGZyb20gJy4vanNvbic7XG5pbXBvcnQgeyBmcm9tUmVhZGFibGVTdHJlYW0gfSBmcm9tICcuL25vZGUnO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2ggfSBmcm9tICcuLi8uLi9yZWNvcmRiYXRjaCc7XG5pbXBvcnQgeyByZWFkQnVmZmVycywgcmVhZEJ1ZmZlcnNBc3luYyB9IGZyb20gJy4vYmluYXJ5JztcbmltcG9ydCB7IHJlYWRSZWNvcmRCYXRjaGVzLCByZWFkUmVjb3JkQmF0Y2hlc0FzeW5jLCBUeXBlRGF0YUxvYWRlciB9IGZyb20gJy4vdmVjdG9yJztcbmltcG9ydCB7IFNjaGVtYSB9IGZyb20gJy4uLy4uL3R5cGUnO1xuaW1wb3J0IHsgTWVzc2FnZSB9IGZyb20gJy4uL21ldGFkYXRhJztcblxuZXhwb3J0IHsgcmVhZEpTT04sIFJlY29yZEJhdGNoIH07XG5leHBvcnQgeyByZWFkQnVmZmVycywgcmVhZEJ1ZmZlcnNBc3luYyB9O1xuZXhwb3J0IHsgcmVhZFJlY29yZEJhdGNoZXMsIHJlYWRSZWNvcmRCYXRjaGVzQXN5bmMgfTtcblxuZXhwb3J0IGZ1bmN0aW9uKiByZWFkKHNvdXJjZXM6IEl0ZXJhYmxlPFVpbnQ4QXJyYXkgfCBCdWZmZXIgfCBzdHJpbmc+IHwgb2JqZWN0IHwgc3RyaW5nKSB7XG4gICAgbGV0IGlucHV0OiBhbnkgPSBzb3VyY2VzO1xuICAgIGxldCBtZXNzYWdlczogSXRlcmFibGU8eyBzY2hlbWE6IFNjaGVtYSwgbWVzc2FnZTogTWVzc2FnZSwgbG9hZGVyOiBUeXBlRGF0YUxvYWRlciB9PjtcbiAgICBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykge1xuICAgICAgICB0cnkgeyBpbnB1dCA9IEpTT04ucGFyc2UoaW5wdXQpOyB9XG4gICAgICAgIGNhdGNoIChlKSB7IGlucHV0ID0gc291cmNlczsgfVxuICAgIH1cbiAgICBpZiAoIWlucHV0IHx8IHR5cGVvZiBpbnB1dCAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgbWVzc2FnZXMgPSAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykgPyByZWFkQnVmZmVycyhbaW5wdXRdKSA6IFtdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG1lc3NhZ2VzID0gKHR5cGVvZiBpbnB1dFtTeW1ib2wuaXRlcmF0b3JdID09PSAnZnVuY3Rpb24nKSA/IHJlYWRCdWZmZXJzKGlucHV0KSA6IHJlYWRKU09OKGlucHV0KTtcbiAgICB9XG4gICAgeWllbGQqIHJlYWRSZWNvcmRCYXRjaGVzKG1lc3NhZ2VzKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uKiByZWFkQXN5bmMoc291cmNlczogQXN5bmNJdGVyYWJsZTxVaW50OEFycmF5IHwgQnVmZmVyIHwgc3RyaW5nPikge1xuICAgIGZvciBhd2FpdCAobGV0IHJlY29yZEJhdGNoIG9mIHJlYWRSZWNvcmRCYXRjaGVzQXN5bmMocmVhZEJ1ZmZlcnNBc3luYyhzb3VyY2VzKSkpIHtcbiAgICAgICAgeWllbGQgcmVjb3JkQmF0Y2g7XG4gICAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24qIHJlYWRTdHJlYW0oc3RyZWFtOiBOb2RlSlMuUmVhZGFibGVTdHJlYW0pIHtcbiAgICBmb3IgYXdhaXQgKGNvbnN0IHJlY29yZEJhdGNoIG9mIHJlYWRBc3luYyhmcm9tUmVhZGFibGVTdHJlYW0oc3RyZWFtKSkpIHtcbiAgICAgICAgeWllbGQgcmVjb3JkQmF0Y2ggYXMgUmVjb3JkQmF0Y2g7XG4gICAgfVxufVxuIl19

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
import { fromNodeStream } from './node';
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
export function readNodeStream(stream) {
    return tslib_1.__asyncGenerator(this, arguments, function* readNodeStream_1() {
        try {
            for (var _a = tslib_1.__asyncValues(readAsync(fromNodeStream(stream))), _b; _b = yield tslib_1.__await(_a.next()), !_b.done;) {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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Ly8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IHJlYWRKU09OIH0gZnJvbSAnLi9qc29uJztcbmltcG9ydCB7IGZyb21Ob2RlU3RyZWFtIH0gZnJvbSAnLi9ub2RlJztcbmltcG9ydCB7IFJlY29yZEJhdGNoIH0gZnJvbSAnLi4vLi4vcmVjb3JkYmF0Y2gnO1xuaW1wb3J0IHsgcmVhZEJ1ZmZlcnMsIHJlYWRCdWZmZXJzQXN5bmMgfSBmcm9tICcuL2JpbmFyeSc7XG5pbXBvcnQgeyByZWFkUmVjb3JkQmF0Y2hlcywgcmVhZFJlY29yZEJhdGNoZXNBc3luYywgVHlwZURhdGFMb2FkZXIgfSBmcm9tICcuL3ZlY3Rvcic7XG5pbXBvcnQgeyBTY2hlbWEgfSBmcm9tICcuLi8uLi90eXBlJztcbmltcG9ydCB7IE1lc3NhZ2UgfSBmcm9tICcuLi9tZXRhZGF0YSc7XG5cbmV4cG9ydCB7IHJlYWRKU09OLCBSZWNvcmRCYXRjaCB9O1xuZXhwb3J0IHsgcmVhZEJ1ZmZlcnMsIHJlYWRCdWZmZXJzQXN5bmMgfTtcbmV4cG9ydCB7IHJlYWRSZWNvcmRCYXRjaGVzLCByZWFkUmVjb3JkQmF0Y2hlc0FzeW5jIH07XG5cbmV4cG9ydCBmdW5jdGlvbiogcmVhZChzb3VyY2VzOiBJdGVyYWJsZTxVaW50OEFycmF5IHwgQnVmZmVyIHwgc3RyaW5nPiB8IG9iamVjdCB8IHN0cmluZykge1xuICAgIGxldCBpbnB1dDogYW55ID0gc291cmNlcztcbiAgICBsZXQgbWVzc2FnZXM6IEl0ZXJhYmxlPHsgc2NoZW1hOiBTY2hlbWEsIG1lc3NhZ2U6IE1lc3NhZ2UsIGxvYWRlcjogVHlwZURhdGFMb2FkZXIgfT47XG4gICAgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdHJ5IHsgaW5wdXQgPSBKU09OLnBhcnNlKGlucHV0KTsgfVxuICAgICAgICBjYXRjaCAoZSkgeyBpbnB1dCA9IHNvdXJjZXM7IH1cbiAgICB9XG4gICAgaWYgKCFpbnB1dCB8fCB0eXBlb2YgaW5wdXQgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIG1lc3NhZ2VzID0gKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpID8gcmVhZEJ1ZmZlcnMoW2lucHV0XSkgOiBbXTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBtZXNzYWdlcyA9ICh0eXBlb2YgaW5wdXRbU3ltYm9sLml0ZXJhdG9yXSA9PT0gJ2Z1bmN0aW9uJykgPyByZWFkQnVmZmVycyhpbnB1dCkgOiByZWFkSlNPTihpbnB1dCk7XG4gICAgfVxuICAgIHlpZWxkKiByZWFkUmVjb3JkQmF0Y2hlcyhtZXNzYWdlcyk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiogcmVhZEFzeW5jKHNvdXJjZXM6IEFzeW5jSXRlcmFibGU8VWludDhBcnJheSB8IEJ1ZmZlciB8IHN0cmluZz4pIHtcbiAgICBmb3IgYXdhaXQgKGxldCByZWNvcmRCYXRjaCBvZiByZWFkUmVjb3JkQmF0Y2hlc0FzeW5jKHJlYWRCdWZmZXJzQXN5bmMoc291cmNlcykpKSB7XG4gICAgICAgIHlpZWxkIHJlY29yZEJhdGNoO1xuICAgIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uKiByZWFkTm9kZVN0cmVhbShzdHJlYW06IE5vZGVKUy5SZWFkYWJsZVN0cmVhbSkge1xuICAgIGZvciBhd2FpdCAoY29uc3QgcmVjb3JkQmF0Y2ggb2YgcmVhZEFzeW5jKGZyb21Ob2RlU3RyZWFtKHN0cmVhbSkpKSB7XG4gICAgICAgIHlpZWxkIHJlY29yZEJhdGNoIGFzIFJlY29yZEJhdGNoO1xuICAgIH1cbn1cbiJdfQ==

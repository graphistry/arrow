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
const json_1 = require("./json");
exports.readJSON = json_1.readJSON;
const node_1 = require("./node");
const recordbatch_1 = require("../../recordbatch");
exports.RecordBatch = recordbatch_1.RecordBatch;
const binary_1 = require("./binary");
exports.readBuffers = binary_1.readBuffers;
exports.readBuffersAsync = binary_1.readBuffersAsync;
const vector_1 = require("./vector");
exports.readRecordBatches = vector_1.readRecordBatches;
exports.readRecordBatchesAsync = vector_1.readRecordBatchesAsync;
function* read(sources) {
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
        messages = (typeof input === 'string') ? binary_1.readBuffers([input]) : [];
    }
    else {
        messages = (typeof input[Symbol.iterator] === 'function') ? binary_1.readBuffers(input) : json_1.readJSON(input);
    }
    yield* vector_1.readRecordBatches(messages);
}
exports.read = read;
function readAsync(sources) {
    return tslib_1.__asyncGenerator(this, arguments, function* readAsync_1() {
        var e_1, _a;
        try {
            for (var _b = tslib_1.__asyncValues(vector_1.readRecordBatchesAsync(binary_1.readBuffersAsync(sources))), _c; _c = yield tslib_1.__await(_b.next()), !_c.done;) {
                let recordBatch = _c.value;
                yield yield tslib_1.__await(recordBatch);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) yield tslib_1.__await(_a.call(_b));
            }
            finally { if (e_1) throw e_1.error; }
        }
    });
}
exports.readAsync = readAsync;
function readStream(stream) {
    return tslib_1.__asyncGenerator(this, arguments, function* readStream_1() {
        var e_2, _a;
        try {
            for (var _b = tslib_1.__asyncValues(readAsync(node_1.fromReadableStream(stream))), _c; _c = yield tslib_1.__await(_b.next()), !_c.done;) {
                const recordBatch = _c.value;
                yield yield tslib_1.__await(recordBatch);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) yield tslib_1.__await(_a.call(_b));
            }
            finally { if (e_2) throw e_2.error; }
        }
    });
}
exports.readStream = readStream;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlwYy9yZWFkZXIvYXJyb3cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDZEQUE2RDtBQUM3RCwrREFBK0Q7QUFDL0Qsd0RBQXdEO0FBQ3hELDZEQUE2RDtBQUM3RCxvREFBb0Q7QUFDcEQsNkRBQTZEO0FBQzdELDZEQUE2RDtBQUM3RCxFQUFFO0FBQ0YsK0NBQStDO0FBQy9DLEVBQUU7QUFDRiw2REFBNkQ7QUFDN0QsOERBQThEO0FBQzlELHlEQUF5RDtBQUN6RCw0REFBNEQ7QUFDNUQsMERBQTBEO0FBQzFELHFCQUFxQjs7O0FBRXJCLGlDQUFrQztBQVF6QixtQkFSQSxlQUFRLENBUUE7QUFQakIsaUNBQTRDO0FBQzVDLG1EQUFnRDtBQU03QixzQkFOVix5QkFBVyxDQU1VO0FBTDlCLHFDQUF5RDtBQU1oRCxzQkFOQSxvQkFBVyxDQU1BO0FBQUUsMkJBTkEseUJBQWdCLENBTUE7QUFMdEMscUNBQXFGO0FBTTVFLDRCQU5BLDBCQUFpQixDQU1BO0FBQUUsaUNBTkEsK0JBQXNCLENBTUE7QUFFbEQsUUFBZSxDQUFDLE1BQU0sT0FBaUU7SUFDbkYsSUFBSSxLQUFLLEdBQVEsT0FBTyxDQUFDO0lBQ3pCLElBQUksUUFBZ0YsQ0FBQztJQUNyRixJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRTtRQUMzQixJQUFJO1lBQUUsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7U0FBRTtRQUNsQyxPQUFPLENBQUMsRUFBRTtZQUFFLEtBQUssR0FBRyxPQUFPLENBQUM7U0FBRTtLQUNqQztJQUNELElBQUksQ0FBQyxLQUFLLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFO1FBQ3JDLFFBQVEsR0FBRyxDQUFDLE9BQU8sS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxvQkFBVyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0tBQ3RFO1NBQU07UUFDSCxRQUFRLEdBQUcsQ0FBQyxPQUFPLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLG9CQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUNwRztJQUNELEtBQUssQ0FBQyxDQUFDLDBCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3ZDLENBQUM7QUFiRCxvQkFhQztBQUVELG1CQUFpQyxPQUFvRDs7OztZQUNqRixLQUE4QixJQUFBLEtBQUEsc0JBQUEsK0JBQXNCLENBQUMseUJBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQSxJQUFBO2dCQUFwRSxJQUFJLFdBQVcsV0FBQSxDQUFBO2dCQUN0Qiw0QkFBTSxXQUFXLENBQUEsQ0FBQzthQUNyQjs7Ozs7Ozs7O0lBQ0wsQ0FBQztDQUFBO0FBSkQsOEJBSUM7QUFFRCxvQkFBa0MsTUFBNkI7Ozs7WUFDM0QsS0FBZ0MsSUFBQSxLQUFBLHNCQUFBLFNBQVMsQ0FBQyx5QkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBLElBQUE7Z0JBQTFELE1BQU0sV0FBVyxXQUFBLENBQUE7Z0JBQ3hCLDRCQUFNLFdBQTBCLENBQUEsQ0FBQzthQUNwQzs7Ozs7Ozs7O0lBQ0wsQ0FBQztDQUFBO0FBSkQsZ0NBSUMiLCJmaWxlIjoiaXBjL3JlYWRlci9hcnJvdy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyByZWFkSlNPTiB9IGZyb20gJy4vanNvbic7XG5pbXBvcnQgeyBmcm9tUmVhZGFibGVTdHJlYW0gfSBmcm9tICcuL25vZGUnO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2ggfSBmcm9tICcuLi8uLi9yZWNvcmRiYXRjaCc7XG5pbXBvcnQgeyByZWFkQnVmZmVycywgcmVhZEJ1ZmZlcnNBc3luYyB9IGZyb20gJy4vYmluYXJ5JztcbmltcG9ydCB7IHJlYWRSZWNvcmRCYXRjaGVzLCByZWFkUmVjb3JkQmF0Y2hlc0FzeW5jLCBUeXBlRGF0YUxvYWRlciB9IGZyb20gJy4vdmVjdG9yJztcbmltcG9ydCB7IFNjaGVtYSB9IGZyb20gJy4uLy4uL3R5cGUnO1xuaW1wb3J0IHsgTWVzc2FnZSB9IGZyb20gJy4uL21ldGFkYXRhJztcblxuZXhwb3J0IHsgcmVhZEpTT04sIFJlY29yZEJhdGNoIH07XG5leHBvcnQgeyByZWFkQnVmZmVycywgcmVhZEJ1ZmZlcnNBc3luYyB9O1xuZXhwb3J0IHsgcmVhZFJlY29yZEJhdGNoZXMsIHJlYWRSZWNvcmRCYXRjaGVzQXN5bmMgfTtcblxuZXhwb3J0IGZ1bmN0aW9uKiByZWFkKHNvdXJjZXM6IEl0ZXJhYmxlPFVpbnQ4QXJyYXkgfCBCdWZmZXIgfCBzdHJpbmc+IHwgb2JqZWN0IHwgc3RyaW5nKSB7XG4gICAgbGV0IGlucHV0OiBhbnkgPSBzb3VyY2VzO1xuICAgIGxldCBtZXNzYWdlczogSXRlcmFibGU8eyBzY2hlbWE6IFNjaGVtYSwgbWVzc2FnZTogTWVzc2FnZSwgbG9hZGVyOiBUeXBlRGF0YUxvYWRlciB9PjtcbiAgICBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykge1xuICAgICAgICB0cnkgeyBpbnB1dCA9IEpTT04ucGFyc2UoaW5wdXQpOyB9XG4gICAgICAgIGNhdGNoIChlKSB7IGlucHV0ID0gc291cmNlczsgfVxuICAgIH1cbiAgICBpZiAoIWlucHV0IHx8IHR5cGVvZiBpbnB1dCAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgbWVzc2FnZXMgPSAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykgPyByZWFkQnVmZmVycyhbaW5wdXRdKSA6IFtdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG1lc3NhZ2VzID0gKHR5cGVvZiBpbnB1dFtTeW1ib2wuaXRlcmF0b3JdID09PSAnZnVuY3Rpb24nKSA/IHJlYWRCdWZmZXJzKGlucHV0KSA6IHJlYWRKU09OKGlucHV0KTtcbiAgICB9XG4gICAgeWllbGQqIHJlYWRSZWNvcmRCYXRjaGVzKG1lc3NhZ2VzKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uKiByZWFkQXN5bmMoc291cmNlczogQXN5bmNJdGVyYWJsZTxVaW50OEFycmF5IHwgQnVmZmVyIHwgc3RyaW5nPikge1xuICAgIGZvciBhd2FpdCAobGV0IHJlY29yZEJhdGNoIG9mIHJlYWRSZWNvcmRCYXRjaGVzQXN5bmMocmVhZEJ1ZmZlcnNBc3luYyhzb3VyY2VzKSkpIHtcbiAgICAgICAgeWllbGQgcmVjb3JkQmF0Y2g7XG4gICAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24qIHJlYWRTdHJlYW0oc3RyZWFtOiBOb2RlSlMuUmVhZGFibGVTdHJlYW0pIHtcbiAgICBmb3IgYXdhaXQgKGNvbnN0IHJlY29yZEJhdGNoIG9mIHJlYWRBc3luYyhmcm9tUmVhZGFibGVTdHJlYW0oc3RyZWFtKSkpIHtcbiAgICAgICAgeWllbGQgcmVjb3JkQmF0Y2ggYXMgUmVjb3JkQmF0Y2g7XG4gICAgfVxufVxuIl19

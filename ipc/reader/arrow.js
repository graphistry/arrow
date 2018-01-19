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
        try {
            for (var _a = tslib_1.__asyncValues(vector_1.readRecordBatchesAsync(binary_1.readBuffersAsync(sources))), _b; _b = yield tslib_1.__await(_a.next()), !_b.done;) {
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
exports.readAsync = readAsync;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlwYy9yZWFkZXIvYXJyb3cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDZEQUE2RDtBQUM3RCwrREFBK0Q7QUFDL0Qsd0RBQXdEO0FBQ3hELDZEQUE2RDtBQUM3RCxvREFBb0Q7QUFDcEQsNkRBQTZEO0FBQzdELDZEQUE2RDtBQUM3RCxFQUFFO0FBQ0YsK0NBQStDO0FBQy9DLEVBQUU7QUFDRiw2REFBNkQ7QUFDN0QsOERBQThEO0FBQzlELHlEQUF5RDtBQUN6RCw0REFBNEQ7QUFDNUQsMERBQTBEO0FBQzFELHFCQUFxQjs7O0FBRXJCLGlDQUFrQztBQU96QixtQkFQQSxlQUFRLENBT0E7QUFOakIsbURBQWdEO0FBTTdCLHNCQU5WLHlCQUFXLENBTVU7QUFMOUIscUNBQXlEO0FBTWhELHNCQU5BLG9CQUFXLENBTUE7QUFBRSwyQkFOQSx5QkFBZ0IsQ0FNQTtBQUx0QyxxQ0FBcUY7QUFNNUUsNEJBTkEsMEJBQWlCLENBTUE7QUFBRSxpQ0FOQSwrQkFBc0IsQ0FNQTtBQUVsRCxRQUFlLENBQUMsTUFBTSxPQUFpRTtJQUNuRixJQUFJLEtBQUssR0FBUSxPQUFPLENBQUM7SUFDekIsSUFBSSxRQUFnRixDQUFDO0lBQ3JGLEVBQUUsQ0FBQyxDQUFDLE9BQU8sS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDNUIsSUFBSSxDQUFDO1lBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFBQyxDQUFDO1FBQ2xDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO1FBQUMsQ0FBQztJQUNsQyxDQUFDO0lBQ0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQztRQUN0QyxRQUFRLEdBQUcsQ0FBQyxPQUFPLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsb0JBQVcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUN2RSxDQUFDO0lBQUMsSUFBSSxDQUFDLENBQUM7UUFDSixRQUFRLEdBQUcsQ0FBQyxPQUFPLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLG9CQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNyRyxDQUFDO0lBQ0QsS0FBSyxDQUFDLENBQUMsMEJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDdkMsQ0FBQztBQWJELG9CQWFDO0FBRUQsbUJBQWlDLE9BQW9EOzs7WUFDakYsR0FBRyxDQUFDLENBQTBCLElBQUEsS0FBQSxzQkFBQSwrQkFBc0IsQ0FBQyx5QkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBLElBQUE7Z0JBQXBFLElBQUksV0FBVyxrQ0FBQSxDQUFBO2dCQUN0QixNQUFNLFdBQVcsQ0FBQzthQUNyQjs7Ozs7Ozs7OztJQUNMLENBQUM7Q0FBQTtBQUpELDhCQUlDIiwiZmlsZSI6ImlwYy9yZWFkZXIvYXJyb3cuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgcmVhZEpTT04gfSBmcm9tICcuL2pzb24nO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2ggfSBmcm9tICcuLi8uLi9yZWNvcmRiYXRjaCc7XG5pbXBvcnQgeyByZWFkQnVmZmVycywgcmVhZEJ1ZmZlcnNBc3luYyB9IGZyb20gJy4vYmluYXJ5JztcbmltcG9ydCB7IHJlYWRSZWNvcmRCYXRjaGVzLCByZWFkUmVjb3JkQmF0Y2hlc0FzeW5jLCBUeXBlRGF0YUxvYWRlciB9IGZyb20gJy4vdmVjdG9yJztcbmltcG9ydCB7IFNjaGVtYSB9IGZyb20gJy4uLy4uL3R5cGUnO1xuaW1wb3J0IHsgTWVzc2FnZSB9IGZyb20gJy4uL21ldGFkYXRhJztcblxuZXhwb3J0IHsgcmVhZEpTT04sIFJlY29yZEJhdGNoIH07XG5leHBvcnQgeyByZWFkQnVmZmVycywgcmVhZEJ1ZmZlcnNBc3luYyB9O1xuZXhwb3J0IHsgcmVhZFJlY29yZEJhdGNoZXMsIHJlYWRSZWNvcmRCYXRjaGVzQXN5bmMgfTtcblxuZXhwb3J0IGZ1bmN0aW9uKiByZWFkKHNvdXJjZXM6IEl0ZXJhYmxlPFVpbnQ4QXJyYXkgfCBCdWZmZXIgfCBzdHJpbmc+IHwgb2JqZWN0IHwgc3RyaW5nKSB7XG4gICAgbGV0IGlucHV0OiBhbnkgPSBzb3VyY2VzO1xuICAgIGxldCBtZXNzYWdlczogSXRlcmFibGU8eyBzY2hlbWE6IFNjaGVtYSwgbWVzc2FnZTogTWVzc2FnZSwgbG9hZGVyOiBUeXBlRGF0YUxvYWRlciB9PjtcbiAgICBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykge1xuICAgICAgICB0cnkgeyBpbnB1dCA9IEpTT04ucGFyc2UoaW5wdXQpOyB9XG4gICAgICAgIGNhdGNoIChlKSB7IGlucHV0ID0gc291cmNlczsgfVxuICAgIH1cbiAgICBpZiAoIWlucHV0IHx8IHR5cGVvZiBpbnB1dCAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgbWVzc2FnZXMgPSAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykgPyByZWFkQnVmZmVycyhbaW5wdXRdKSA6IFtdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG1lc3NhZ2VzID0gKHR5cGVvZiBpbnB1dFtTeW1ib2wuaXRlcmF0b3JdID09PSAnZnVuY3Rpb24nKSA/IHJlYWRCdWZmZXJzKGlucHV0KSA6IHJlYWRKU09OKGlucHV0KTtcbiAgICB9XG4gICAgeWllbGQqIHJlYWRSZWNvcmRCYXRjaGVzKG1lc3NhZ2VzKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uKiByZWFkQXN5bmMoc291cmNlczogQXN5bmNJdGVyYWJsZTxVaW50OEFycmF5IHwgQnVmZmVyIHwgc3RyaW5nPikge1xuICAgIGZvciBhd2FpdCAobGV0IHJlY29yZEJhdGNoIG9mIHJlYWRSZWNvcmRCYXRjaGVzQXN5bmMocmVhZEJ1ZmZlcnNBc3luYyhzb3VyY2VzKSkpIHtcbiAgICAgICAgeWllbGQgcmVjb3JkQmF0Y2g7XG4gICAgfVxufVxuIl19

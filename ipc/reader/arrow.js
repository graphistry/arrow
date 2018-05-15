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
function readStream(stream) {
    return tslib_1.__asyncGenerator(this, arguments, function* readStream_1() {
        try {
            for (var _a = tslib_1.__asyncValues(readAsync(node_1.fromReadableStream(stream))), _b; _b = yield tslib_1.__await(_a.next()), !_b.done;) {
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
exports.readStream = readStream;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlwYy9yZWFkZXIvYXJyb3cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDZEQUE2RDtBQUM3RCwrREFBK0Q7QUFDL0Qsd0RBQXdEO0FBQ3hELDZEQUE2RDtBQUM3RCxvREFBb0Q7QUFDcEQsNkRBQTZEO0FBQzdELDZEQUE2RDtBQUM3RCxFQUFFO0FBQ0YsK0NBQStDO0FBQy9DLEVBQUU7QUFDRiw2REFBNkQ7QUFDN0QsOERBQThEO0FBQzlELHlEQUF5RDtBQUN6RCw0REFBNEQ7QUFDNUQsMERBQTBEO0FBQzFELHFCQUFxQjs7O0FBRXJCLGlDQUFrQztBQVF6QixtQkFSQSxlQUFRLENBUUE7QUFQakIsaUNBQTRDO0FBQzVDLG1EQUFnRDtBQU03QixzQkFOVix5QkFBVyxDQU1VO0FBTDlCLHFDQUF5RDtBQU1oRCxzQkFOQSxvQkFBVyxDQU1BO0FBQUUsMkJBTkEseUJBQWdCLENBTUE7QUFMdEMscUNBQXFGO0FBTTVFLDRCQU5BLDBCQUFpQixDQU1BO0FBQUUsaUNBTkEsK0JBQXNCLENBTUE7QUFFbEQsUUFBZSxDQUFDLE1BQU0sT0FBaUU7SUFDbkYsSUFBSSxLQUFLLEdBQVEsT0FBTyxDQUFDO0lBQ3pCLElBQUksUUFBZ0YsQ0FBQztJQUNyRixFQUFFLENBQUMsQ0FBQyxPQUFPLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQzVCLElBQUksQ0FBQztZQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQUMsQ0FBQztRQUNsQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQztRQUFDLENBQUM7SUFDbEMsQ0FBQztJQUNELEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDdEMsUUFBUSxHQUFHLENBQUMsT0FBTyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLG9CQUFXLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDdkUsQ0FBQztJQUFDLElBQUksQ0FBQyxDQUFDO1FBQ0osUUFBUSxHQUFHLENBQUMsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxvQkFBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDckcsQ0FBQztJQUNELEtBQUssQ0FBQyxDQUFDLDBCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3ZDLENBQUM7QUFiRCxvQkFhQztBQUVELG1CQUFpQyxPQUFvRDs7O1lBQ2pGLEdBQUcsQ0FBQyxDQUEwQixJQUFBLEtBQUEsc0JBQUEsK0JBQXNCLENBQUMseUJBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQSxJQUFBO2dCQUFwRSxJQUFJLFdBQVcsa0NBQUEsQ0FBQTtnQkFDdEIsTUFBTSxXQUFXLENBQUM7YUFDckI7Ozs7Ozs7Ozs7SUFDTCxDQUFDO0NBQUE7QUFKRCw4QkFJQztBQUVELG9CQUFrQyxNQUE2Qjs7O1lBQzNELEdBQUcsQ0FBQyxDQUE0QixJQUFBLEtBQUEsc0JBQUEsU0FBUyxDQUFDLHlCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUEsSUFBQTtnQkFBMUQsTUFBTSxXQUFXLGtDQUFBLENBQUE7Z0JBQ3hCLE1BQU0sV0FBMEIsQ0FBQzthQUNwQzs7Ozs7Ozs7OztJQUNMLENBQUM7Q0FBQTtBQUpELGdDQUlDIiwiZmlsZSI6ImlwYy9yZWFkZXIvYXJyb3cuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgcmVhZEpTT04gfSBmcm9tICcuL2pzb24nO1xuaW1wb3J0IHsgZnJvbVJlYWRhYmxlU3RyZWFtIH0gZnJvbSAnLi9ub2RlJztcbmltcG9ydCB7IFJlY29yZEJhdGNoIH0gZnJvbSAnLi4vLi4vcmVjb3JkYmF0Y2gnO1xuaW1wb3J0IHsgcmVhZEJ1ZmZlcnMsIHJlYWRCdWZmZXJzQXN5bmMgfSBmcm9tICcuL2JpbmFyeSc7XG5pbXBvcnQgeyByZWFkUmVjb3JkQmF0Y2hlcywgcmVhZFJlY29yZEJhdGNoZXNBc3luYywgVHlwZURhdGFMb2FkZXIgfSBmcm9tICcuL3ZlY3Rvcic7XG5pbXBvcnQgeyBTY2hlbWEgfSBmcm9tICcuLi8uLi90eXBlJztcbmltcG9ydCB7IE1lc3NhZ2UgfSBmcm9tICcuLi9tZXRhZGF0YSc7XG5cbmV4cG9ydCB7IHJlYWRKU09OLCBSZWNvcmRCYXRjaCB9O1xuZXhwb3J0IHsgcmVhZEJ1ZmZlcnMsIHJlYWRCdWZmZXJzQXN5bmMgfTtcbmV4cG9ydCB7IHJlYWRSZWNvcmRCYXRjaGVzLCByZWFkUmVjb3JkQmF0Y2hlc0FzeW5jIH07XG5cbmV4cG9ydCBmdW5jdGlvbiogcmVhZChzb3VyY2VzOiBJdGVyYWJsZTxVaW50OEFycmF5IHwgQnVmZmVyIHwgc3RyaW5nPiB8IG9iamVjdCB8IHN0cmluZykge1xuICAgIGxldCBpbnB1dDogYW55ID0gc291cmNlcztcbiAgICBsZXQgbWVzc2FnZXM6IEl0ZXJhYmxlPHsgc2NoZW1hOiBTY2hlbWEsIG1lc3NhZ2U6IE1lc3NhZ2UsIGxvYWRlcjogVHlwZURhdGFMb2FkZXIgfT47XG4gICAgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdHJ5IHsgaW5wdXQgPSBKU09OLnBhcnNlKGlucHV0KTsgfVxuICAgICAgICBjYXRjaCAoZSkgeyBpbnB1dCA9IHNvdXJjZXM7IH1cbiAgICB9XG4gICAgaWYgKCFpbnB1dCB8fCB0eXBlb2YgaW5wdXQgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIG1lc3NhZ2VzID0gKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpID8gcmVhZEJ1ZmZlcnMoW2lucHV0XSkgOiBbXTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBtZXNzYWdlcyA9ICh0eXBlb2YgaW5wdXRbU3ltYm9sLml0ZXJhdG9yXSA9PT0gJ2Z1bmN0aW9uJykgPyByZWFkQnVmZmVycyhpbnB1dCkgOiByZWFkSlNPTihpbnB1dCk7XG4gICAgfVxuICAgIHlpZWxkKiByZWFkUmVjb3JkQmF0Y2hlcyhtZXNzYWdlcyk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiogcmVhZEFzeW5jKHNvdXJjZXM6IEFzeW5jSXRlcmFibGU8VWludDhBcnJheSB8IEJ1ZmZlciB8IHN0cmluZz4pIHtcbiAgICBmb3IgYXdhaXQgKGxldCByZWNvcmRCYXRjaCBvZiByZWFkUmVjb3JkQmF0Y2hlc0FzeW5jKHJlYWRCdWZmZXJzQXN5bmMoc291cmNlcykpKSB7XG4gICAgICAgIHlpZWxkIHJlY29yZEJhdGNoO1xuICAgIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uKiByZWFkU3RyZWFtKHN0cmVhbTogTm9kZUpTLlJlYWRhYmxlU3RyZWFtKSB7XG4gICAgZm9yIGF3YWl0IChjb25zdCByZWNvcmRCYXRjaCBvZiByZWFkQXN5bmMoZnJvbVJlYWRhYmxlU3RyZWFtKHN0cmVhbSkpKSB7XG4gICAgICAgIHlpZWxkIHJlY29yZEJhdGNoIGFzIFJlY29yZEJhdGNoO1xuICAgIH1cbn1cbiJdfQ==

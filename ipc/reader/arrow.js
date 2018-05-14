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
function readNodeStream(stream) {
    return tslib_1.__asyncGenerator(this, arguments, function* readNodeStream_1() {
        try {
            for (var _a = tslib_1.__asyncValues(readAsync(node_1.fromNodeStream(stream))), _b; _b = yield tslib_1.__await(_a.next()), !_b.done;) {
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
exports.readNodeStream = readNodeStream;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlwYy9yZWFkZXIvYXJyb3cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDZEQUE2RDtBQUM3RCwrREFBK0Q7QUFDL0Qsd0RBQXdEO0FBQ3hELDZEQUE2RDtBQUM3RCxvREFBb0Q7QUFDcEQsNkRBQTZEO0FBQzdELDZEQUE2RDtBQUM3RCxFQUFFO0FBQ0YsK0NBQStDO0FBQy9DLEVBQUU7QUFDRiw2REFBNkQ7QUFDN0QsOERBQThEO0FBQzlELHlEQUF5RDtBQUN6RCw0REFBNEQ7QUFDNUQsMERBQTBEO0FBQzFELHFCQUFxQjs7O0FBRXJCLGlDQUFrQztBQVF6QixtQkFSQSxlQUFRLENBUUE7QUFQakIsaUNBQXdDO0FBQ3hDLG1EQUFnRDtBQU03QixzQkFOVix5QkFBVyxDQU1VO0FBTDlCLHFDQUF5RDtBQU1oRCxzQkFOQSxvQkFBVyxDQU1BO0FBQUUsMkJBTkEseUJBQWdCLENBTUE7QUFMdEMscUNBQXFGO0FBTTVFLDRCQU5BLDBCQUFpQixDQU1BO0FBQUUsaUNBTkEsK0JBQXNCLENBTUE7QUFFbEQsUUFBZSxDQUFDLE1BQU0sT0FBaUU7SUFDbkYsSUFBSSxLQUFLLEdBQVEsT0FBTyxDQUFDO0lBQ3pCLElBQUksUUFBZ0YsQ0FBQztJQUNyRixFQUFFLENBQUMsQ0FBQyxPQUFPLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQzVCLElBQUksQ0FBQztZQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQUMsQ0FBQztRQUNsQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQztRQUFDLENBQUM7SUFDbEMsQ0FBQztJQUNELEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDdEMsUUFBUSxHQUFHLENBQUMsT0FBTyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLG9CQUFXLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDdkUsQ0FBQztJQUFDLElBQUksQ0FBQyxDQUFDO1FBQ0osUUFBUSxHQUFHLENBQUMsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxvQkFBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDckcsQ0FBQztJQUNELEtBQUssQ0FBQyxDQUFDLDBCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3ZDLENBQUM7QUFiRCxvQkFhQztBQUVELG1CQUFpQyxPQUFvRDs7O1lBQ2pGLEdBQUcsQ0FBQyxDQUEwQixJQUFBLEtBQUEsc0JBQUEsK0JBQXNCLENBQUMseUJBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQSxJQUFBO2dCQUFwRSxJQUFJLFdBQVcsa0NBQUEsQ0FBQTtnQkFDdEIsTUFBTSxXQUFXLENBQUM7YUFDckI7Ozs7Ozs7Ozs7SUFDTCxDQUFDO0NBQUE7QUFKRCw4QkFJQztBQUVELHdCQUFzQyxNQUE2Qjs7O1lBQy9ELEdBQUcsQ0FBQyxDQUE0QixJQUFBLEtBQUEsc0JBQUEsU0FBUyxDQUFDLHFCQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQSxJQUFBO2dCQUF0RCxNQUFNLFdBQVcsa0NBQUEsQ0FBQTtnQkFDeEIsTUFBTSxXQUEwQixDQUFDO2FBQ3BDOzs7Ozs7Ozs7O0lBQ0wsQ0FBQztDQUFBO0FBSkQsd0NBSUMiLCJmaWxlIjoiaXBjL3JlYWRlci9hcnJvdy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyByZWFkSlNPTiB9IGZyb20gJy4vanNvbic7XG5pbXBvcnQgeyBmcm9tTm9kZVN0cmVhbSB9IGZyb20gJy4vbm9kZSc7XG5pbXBvcnQgeyBSZWNvcmRCYXRjaCB9IGZyb20gJy4uLy4uL3JlY29yZGJhdGNoJztcbmltcG9ydCB7IHJlYWRCdWZmZXJzLCByZWFkQnVmZmVyc0FzeW5jIH0gZnJvbSAnLi9iaW5hcnknO1xuaW1wb3J0IHsgcmVhZFJlY29yZEJhdGNoZXMsIHJlYWRSZWNvcmRCYXRjaGVzQXN5bmMsIFR5cGVEYXRhTG9hZGVyIH0gZnJvbSAnLi92ZWN0b3InO1xuaW1wb3J0IHsgU2NoZW1hIH0gZnJvbSAnLi4vLi4vdHlwZSc7XG5pbXBvcnQgeyBNZXNzYWdlIH0gZnJvbSAnLi4vbWV0YWRhdGEnO1xuXG5leHBvcnQgeyByZWFkSlNPTiwgUmVjb3JkQmF0Y2ggfTtcbmV4cG9ydCB7IHJlYWRCdWZmZXJzLCByZWFkQnVmZmVyc0FzeW5jIH07XG5leHBvcnQgeyByZWFkUmVjb3JkQmF0Y2hlcywgcmVhZFJlY29yZEJhdGNoZXNBc3luYyB9O1xuXG5leHBvcnQgZnVuY3Rpb24qIHJlYWQoc291cmNlczogSXRlcmFibGU8VWludDhBcnJheSB8IEJ1ZmZlciB8IHN0cmluZz4gfCBvYmplY3QgfCBzdHJpbmcpIHtcbiAgICBsZXQgaW5wdXQ6IGFueSA9IHNvdXJjZXM7XG4gICAgbGV0IG1lc3NhZ2VzOiBJdGVyYWJsZTx7IHNjaGVtYTogU2NoZW1hLCBtZXNzYWdlOiBNZXNzYWdlLCBsb2FkZXI6IFR5cGVEYXRhTG9hZGVyIH0+O1xuICAgIGlmICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRyeSB7IGlucHV0ID0gSlNPTi5wYXJzZShpbnB1dCk7IH1cbiAgICAgICAgY2F0Y2ggKGUpIHsgaW5wdXQgPSBzb3VyY2VzOyB9XG4gICAgfVxuICAgIGlmICghaW5wdXQgfHwgdHlwZW9mIGlucHV0ICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBtZXNzYWdlcyA9ICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnKSA/IHJlYWRCdWZmZXJzKFtpbnB1dF0pIDogW107XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbWVzc2FnZXMgPSAodHlwZW9mIGlucHV0W1N5bWJvbC5pdGVyYXRvcl0gPT09ICdmdW5jdGlvbicpID8gcmVhZEJ1ZmZlcnMoaW5wdXQpIDogcmVhZEpTT04oaW5wdXQpO1xuICAgIH1cbiAgICB5aWVsZCogcmVhZFJlY29yZEJhdGNoZXMobWVzc2FnZXMpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24qIHJlYWRBc3luYyhzb3VyY2VzOiBBc3luY0l0ZXJhYmxlPFVpbnQ4QXJyYXkgfCBCdWZmZXIgfCBzdHJpbmc+KSB7XG4gICAgZm9yIGF3YWl0IChsZXQgcmVjb3JkQmF0Y2ggb2YgcmVhZFJlY29yZEJhdGNoZXNBc3luYyhyZWFkQnVmZmVyc0FzeW5jKHNvdXJjZXMpKSkge1xuICAgICAgICB5aWVsZCByZWNvcmRCYXRjaDtcbiAgICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiogcmVhZE5vZGVTdHJlYW0oc3RyZWFtOiBOb2RlSlMuUmVhZGFibGVTdHJlYW0pIHtcbiAgICBmb3IgYXdhaXQgKGNvbnN0IHJlY29yZEJhdGNoIG9mIHJlYWRBc3luYyhmcm9tTm9kZVN0cmVhbShzdHJlYW0pKSkge1xuICAgICAgICB5aWVsZCByZWNvcmRCYXRjaCBhcyBSZWNvcmRCYXRjaDtcbiAgICB9XG59XG4iXX0=

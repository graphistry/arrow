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
        var e_1, _a;
        try {
            for (var _b = tslib_1.__asyncValues(readRecordBatchesAsync(readBuffersAsync(sources))), _c; _c = yield tslib_1.__await(_b.next()), !_c.done;) {
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
export function readStream(stream) {
    return tslib_1.__asyncGenerator(this, arguments, function* readStream_1() {
        var e_2, _a;
        try {
            for (var _b = tslib_1.__asyncValues(readAsync(fromReadableStream(stream))), _c; _c = yield tslib_1.__await(_b.next()), !_c.done;) {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlwYy9yZWFkZXIvYXJyb3cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsNkRBQTZEO0FBQzdELCtEQUErRDtBQUMvRCx3REFBd0Q7QUFDeEQsNkRBQTZEO0FBQzdELG9EQUFvRDtBQUNwRCw2REFBNkQ7QUFDN0QsNkRBQTZEO0FBQzdELEVBQUU7QUFDRiwrQ0FBK0M7QUFDL0MsRUFBRTtBQUNGLDZEQUE2RDtBQUM3RCw4REFBOEQ7QUFDOUQseURBQXlEO0FBQ3pELDREQUE0RDtBQUM1RCwwREFBMEQ7QUFDMUQscUJBQXFCOztBQUVyQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ2xDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUM1QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDaEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUN6RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsc0JBQXNCLEVBQWtCLE1BQU0sVUFBVSxDQUFDO0FBSXJGLE9BQU8sRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLENBQUM7QUFDakMsT0FBTyxFQUFFLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDO0FBQ3pDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxzQkFBc0IsRUFBRSxDQUFDO0FBRXJELE1BQU0sU0FBUyxDQUFDLE1BQU0sT0FBaUU7SUFDbkYsSUFBSSxLQUFLLEdBQVEsT0FBTyxDQUFDO0lBQ3pCLElBQUksUUFBZ0YsQ0FBQztJQUNyRixJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRTtRQUMzQixJQUFJO1lBQUUsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7U0FBRTtRQUNsQyxPQUFPLENBQUMsRUFBRTtZQUFFLEtBQUssR0FBRyxPQUFPLENBQUM7U0FBRTtLQUNqQztJQUNELElBQUksQ0FBQyxLQUFLLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFO1FBQ3JDLFFBQVEsR0FBRyxDQUFDLE9BQU8sS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7S0FDdEU7U0FBTTtRQUNILFFBQVEsR0FBRyxDQUFDLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDcEc7SUFDRCxLQUFLLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUN2QyxDQUFDO0FBRUQsTUFBTSxvQkFBMkIsT0FBb0Q7Ozs7WUFDakYsS0FBOEIsSUFBQSxLQUFBLHNCQUFBLHNCQUFzQixDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUEsSUFBQTtnQkFBcEUsSUFBSSxXQUFXLFdBQUEsQ0FBQTtnQkFDdEIsNEJBQU0sV0FBVyxDQUFBLENBQUM7YUFDckI7Ozs7Ozs7OztJQUNMLENBQUM7Q0FBQTtBQUVELE1BQU0scUJBQTRCLE1BQTZCOzs7O1lBQzNELEtBQWdDLElBQUEsS0FBQSxzQkFBQSxTQUFTLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQSxJQUFBO2dCQUExRCxNQUFNLFdBQVcsV0FBQSxDQUFBO2dCQUN4Qiw0QkFBTSxXQUEwQixDQUFBLENBQUM7YUFDcEM7Ozs7Ozs7OztJQUNMLENBQUM7Q0FBQSIsImZpbGUiOiJpcGMvcmVhZGVyL2Fycm93LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IHJlYWRKU09OIH0gZnJvbSAnLi9qc29uJztcbmltcG9ydCB7IGZyb21SZWFkYWJsZVN0cmVhbSB9IGZyb20gJy4vbm9kZSc7XG5pbXBvcnQgeyBSZWNvcmRCYXRjaCB9IGZyb20gJy4uLy4uL3JlY29yZGJhdGNoJztcbmltcG9ydCB7IHJlYWRCdWZmZXJzLCByZWFkQnVmZmVyc0FzeW5jIH0gZnJvbSAnLi9iaW5hcnknO1xuaW1wb3J0IHsgcmVhZFJlY29yZEJhdGNoZXMsIHJlYWRSZWNvcmRCYXRjaGVzQXN5bmMsIFR5cGVEYXRhTG9hZGVyIH0gZnJvbSAnLi92ZWN0b3InO1xuaW1wb3J0IHsgU2NoZW1hIH0gZnJvbSAnLi4vLi4vdHlwZSc7XG5pbXBvcnQgeyBNZXNzYWdlIH0gZnJvbSAnLi4vbWV0YWRhdGEnO1xuXG5leHBvcnQgeyByZWFkSlNPTiwgUmVjb3JkQmF0Y2ggfTtcbmV4cG9ydCB7IHJlYWRCdWZmZXJzLCByZWFkQnVmZmVyc0FzeW5jIH07XG5leHBvcnQgeyByZWFkUmVjb3JkQmF0Y2hlcywgcmVhZFJlY29yZEJhdGNoZXNBc3luYyB9O1xuXG5leHBvcnQgZnVuY3Rpb24qIHJlYWQoc291cmNlczogSXRlcmFibGU8VWludDhBcnJheSB8IEJ1ZmZlciB8IHN0cmluZz4gfCBvYmplY3QgfCBzdHJpbmcpIHtcbiAgICBsZXQgaW5wdXQ6IGFueSA9IHNvdXJjZXM7XG4gICAgbGV0IG1lc3NhZ2VzOiBJdGVyYWJsZTx7IHNjaGVtYTogU2NoZW1hLCBtZXNzYWdlOiBNZXNzYWdlLCBsb2FkZXI6IFR5cGVEYXRhTG9hZGVyIH0+O1xuICAgIGlmICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRyeSB7IGlucHV0ID0gSlNPTi5wYXJzZShpbnB1dCk7IH1cbiAgICAgICAgY2F0Y2ggKGUpIHsgaW5wdXQgPSBzb3VyY2VzOyB9XG4gICAgfVxuICAgIGlmICghaW5wdXQgfHwgdHlwZW9mIGlucHV0ICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBtZXNzYWdlcyA9ICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnKSA/IHJlYWRCdWZmZXJzKFtpbnB1dF0pIDogW107XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbWVzc2FnZXMgPSAodHlwZW9mIGlucHV0W1N5bWJvbC5pdGVyYXRvcl0gPT09ICdmdW5jdGlvbicpID8gcmVhZEJ1ZmZlcnMoaW5wdXQpIDogcmVhZEpTT04oaW5wdXQpO1xuICAgIH1cbiAgICB5aWVsZCogcmVhZFJlY29yZEJhdGNoZXMobWVzc2FnZXMpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24qIHJlYWRBc3luYyhzb3VyY2VzOiBBc3luY0l0ZXJhYmxlPFVpbnQ4QXJyYXkgfCBCdWZmZXIgfCBzdHJpbmc+KSB7XG4gICAgZm9yIGF3YWl0IChsZXQgcmVjb3JkQmF0Y2ggb2YgcmVhZFJlY29yZEJhdGNoZXNBc3luYyhyZWFkQnVmZmVyc0FzeW5jKHNvdXJjZXMpKSkge1xuICAgICAgICB5aWVsZCByZWNvcmRCYXRjaDtcbiAgICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiogcmVhZFN0cmVhbShzdHJlYW06IE5vZGVKUy5SZWFkYWJsZVN0cmVhbSkge1xuICAgIGZvciBhd2FpdCAoY29uc3QgcmVjb3JkQmF0Y2ggb2YgcmVhZEFzeW5jKGZyb21SZWFkYWJsZVN0cmVhbShzdHJlYW0pKSkge1xuICAgICAgICB5aWVsZCByZWNvcmRCYXRjaCBhcyBSZWNvcmRCYXRjaDtcbiAgICB9XG59XG4iXX0=

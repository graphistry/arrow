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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlwYy9yZWFkZXIvYXJyb3cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsNkRBQTZEO0FBQzdELCtEQUErRDtBQUMvRCx3REFBd0Q7QUFDeEQsNkRBQTZEO0FBQzdELG9EQUFvRDtBQUNwRCw2REFBNkQ7QUFDN0QsNkRBQTZEO0FBQzdELEVBQUU7QUFDRiwrQ0FBK0M7QUFDL0MsRUFBRTtBQUNGLDZEQUE2RDtBQUM3RCw4REFBOEQ7QUFDOUQseURBQXlEO0FBQ3pELDREQUE0RDtBQUM1RCwwREFBMEQ7QUFDMUQscUJBQXFCOztBQUVyQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ2xDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNoRCxPQUFPLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQ3pELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxzQkFBc0IsRUFBa0IsTUFBTSxVQUFVLENBQUM7QUFJckYsT0FBTyxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsQ0FBQztBQUNqQyxPQUFPLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixFQUFFLENBQUM7QUFDekMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHNCQUFzQixFQUFFLENBQUM7QUFFckQsTUFBTSxTQUFTLENBQUMsTUFBTSxPQUFpRTtJQUNuRixJQUFJLEtBQUssR0FBUSxPQUFPLENBQUM7SUFDekIsSUFBSSxRQUFnRixDQUFDO0lBQ3JGLEVBQUUsQ0FBQyxDQUFDLE9BQU8sS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDNUIsSUFBSSxDQUFDO1lBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFBQyxDQUFDO1FBQ2xDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO1FBQUMsQ0FBQztJQUNsQyxDQUFDO0lBQ0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQztRQUN0QyxRQUFRLEdBQUcsQ0FBQyxPQUFPLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ3ZFLENBQUM7SUFBQyxJQUFJLENBQUMsQ0FBQztRQUNKLFFBQVEsR0FBRyxDQUFDLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDckcsQ0FBQztJQUNELEtBQUssQ0FBQyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3ZDLENBQUM7QUFFRCxNQUFNLG9CQUEyQixPQUFvRDs7O1lBQ2pGLEdBQUcsQ0FBQyxDQUEwQixJQUFBLEtBQUEsc0JBQUEsc0JBQXNCLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQSxJQUFBO2dCQUFwRSxJQUFJLFdBQVcsa0NBQUEsQ0FBQTtnQkFDdEIsTUFBTSxXQUFXLENBQUM7YUFDckI7Ozs7Ozs7Ozs7SUFDTCxDQUFDO0NBQUEiLCJmaWxlIjoiaXBjL3JlYWRlci9hcnJvdy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyByZWFkSlNPTiB9IGZyb20gJy4vanNvbic7XG5pbXBvcnQgeyBSZWNvcmRCYXRjaCB9IGZyb20gJy4uLy4uL3JlY29yZGJhdGNoJztcbmltcG9ydCB7IHJlYWRCdWZmZXJzLCByZWFkQnVmZmVyc0FzeW5jIH0gZnJvbSAnLi9iaW5hcnknO1xuaW1wb3J0IHsgcmVhZFJlY29yZEJhdGNoZXMsIHJlYWRSZWNvcmRCYXRjaGVzQXN5bmMsIFR5cGVEYXRhTG9hZGVyIH0gZnJvbSAnLi92ZWN0b3InO1xuaW1wb3J0IHsgU2NoZW1hIH0gZnJvbSAnLi4vLi4vdHlwZSc7XG5pbXBvcnQgeyBNZXNzYWdlIH0gZnJvbSAnLi4vbWV0YWRhdGEnO1xuXG5leHBvcnQgeyByZWFkSlNPTiwgUmVjb3JkQmF0Y2ggfTtcbmV4cG9ydCB7IHJlYWRCdWZmZXJzLCByZWFkQnVmZmVyc0FzeW5jIH07XG5leHBvcnQgeyByZWFkUmVjb3JkQmF0Y2hlcywgcmVhZFJlY29yZEJhdGNoZXNBc3luYyB9O1xuXG5leHBvcnQgZnVuY3Rpb24qIHJlYWQoc291cmNlczogSXRlcmFibGU8VWludDhBcnJheSB8IEJ1ZmZlciB8IHN0cmluZz4gfCBvYmplY3QgfCBzdHJpbmcpIHtcbiAgICBsZXQgaW5wdXQ6IGFueSA9IHNvdXJjZXM7XG4gICAgbGV0IG1lc3NhZ2VzOiBJdGVyYWJsZTx7IHNjaGVtYTogU2NoZW1hLCBtZXNzYWdlOiBNZXNzYWdlLCBsb2FkZXI6IFR5cGVEYXRhTG9hZGVyIH0+O1xuICAgIGlmICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRyeSB7IGlucHV0ID0gSlNPTi5wYXJzZShpbnB1dCk7IH1cbiAgICAgICAgY2F0Y2ggKGUpIHsgaW5wdXQgPSBzb3VyY2VzOyB9XG4gICAgfVxuICAgIGlmICghaW5wdXQgfHwgdHlwZW9mIGlucHV0ICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBtZXNzYWdlcyA9ICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnKSA/IHJlYWRCdWZmZXJzKFtpbnB1dF0pIDogW107XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbWVzc2FnZXMgPSAodHlwZW9mIGlucHV0W1N5bWJvbC5pdGVyYXRvcl0gPT09ICdmdW5jdGlvbicpID8gcmVhZEJ1ZmZlcnMoaW5wdXQpIDogcmVhZEpTT04oaW5wdXQpO1xuICAgIH1cbiAgICB5aWVsZCogcmVhZFJlY29yZEJhdGNoZXMobWVzc2FnZXMpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24qIHJlYWRBc3luYyhzb3VyY2VzOiBBc3luY0l0ZXJhYmxlPFVpbnQ4QXJyYXkgfCBCdWZmZXIgfCBzdHJpbmc+KSB7XG4gICAgZm9yIGF3YWl0IChsZXQgcmVjb3JkQmF0Y2ggb2YgcmVhZFJlY29yZEJhdGNoZXNBc3luYyhyZWFkQnVmZmVyc0FzeW5jKHNvdXJjZXMpKSkge1xuICAgICAgICB5aWVsZCByZWNvcmRCYXRjaDtcbiAgICB9XG59XG4iXX0=

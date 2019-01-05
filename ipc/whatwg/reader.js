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
const stream_1 = require("../../io/stream");
const reader_1 = require("../../ipc/reader");
/** @ignore */
function recordBatchReaderThroughDOMStream(writableStrategy, readableStrategy) {
    const queue = new stream_1.AsyncByteQueue();
    let reader = null;
    const readable = new ReadableStream({
        cancel() {
            return tslib_1.__awaiter(this, void 0, void 0, function* () { yield queue.close(); });
        },
        start(controller) {
            return tslib_1.__awaiter(this, void 0, void 0, function* () { yield next(controller, reader || (reader = yield open())); });
        },
        pull(controller) {
            return tslib_1.__awaiter(this, void 0, void 0, function* () { reader ? yield next(controller, reader) : controller.close(); });
        }
    });
    return { writable: new WritableStream(queue, Object.assign({ 'highWaterMark': Math.pow(2, 14) }, writableStrategy)), readable };
    function open() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield (yield reader_1.RecordBatchReader.from(queue)).open(readableStrategy);
        });
    }
    function next(controller, reader) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let size = controller.desiredSize;
            let r = null;
            while (!(r = yield reader.next()).done) {
                controller.enqueue(r.value);
                if (size != null && --size <= 0) {
                    return;
                }
            }
            controller.close();
        });
    }
}
exports.recordBatchReaderThroughDOMStream = recordBatchReaderThroughDOMStream;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlwYy93aGF0d2cvcmVhZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSw2REFBNkQ7QUFDN0QsK0RBQStEO0FBQy9ELHdEQUF3RDtBQUN4RCw2REFBNkQ7QUFDN0Qsb0RBQW9EO0FBQ3BELDZEQUE2RDtBQUM3RCw2REFBNkQ7QUFDN0QsRUFBRTtBQUNGLCtDQUErQztBQUMvQyxFQUFFO0FBQ0YsNkRBQTZEO0FBQzdELDhEQUE4RDtBQUM5RCx5REFBeUQ7QUFDekQsNERBQTREO0FBQzVELDBEQUEwRDtBQUMxRCxxQkFBcUI7OztBQUlyQiw0Q0FBaUQ7QUFDakQsNkNBQXFEO0FBRXJELGNBQWM7QUFDZCxTQUFnQixpQ0FBaUMsQ0FBOEMsZ0JBQTRDLEVBQUUsZ0JBQTJDO0lBRXBMLE1BQU0sS0FBSyxHQUFHLElBQUksdUJBQWMsRUFBRSxDQUFDO0lBQ25DLElBQUksTUFBTSxHQUFnQyxJQUFJLENBQUM7SUFFL0MsTUFBTSxRQUFRLEdBQUcsSUFBSSxjQUFjLENBQWlCO1FBQzFDLE1BQU07MEVBQUssTUFBTSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQUE7UUFDakMsS0FBSyxDQUFDLFVBQVU7MEVBQUksTUFBTSxJQUFJLENBQUMsVUFBVSxFQUFFLE1BQU0sSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FBQTtRQUNoRixJQUFJLENBQUMsVUFBVTswRUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztTQUFBO0tBQzNGLENBQUMsQ0FBQztJQUVILE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxjQUFjLENBQUMsS0FBSyxrQkFBSSxlQUFlLEVBQUUsU0FBQSxDQUFDLEVBQUksRUFBRSxDQUFBLElBQUssZ0JBQWdCLEVBQUcsRUFBRSxRQUFRLEVBQUUsQ0FBQztJQUU1RyxTQUFlLElBQUk7O1lBQ2YsT0FBTyxNQUFNLENBQUMsTUFBTSwwQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUM5RSxDQUFDO0tBQUE7SUFFRCxTQUFlLElBQUksQ0FBQyxVQUEyRCxFQUFFLE1BQTRCOztZQUN6RyxJQUFJLElBQUksR0FBRyxVQUFVLENBQUMsV0FBVyxDQUFDO1lBQ2xDLElBQUksQ0FBQyxHQUEwQyxJQUFJLENBQUM7WUFDcEQsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFO2dCQUNwQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDNUIsSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLEVBQUUsSUFBSSxJQUFJLENBQUMsRUFBRTtvQkFDN0IsT0FBTztpQkFDVjthQUNKO1lBQ0QsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3ZCLENBQUM7S0FBQTtBQUNMLENBQUM7QUE1QkQsOEVBNEJDIiwiZmlsZSI6ImlwYy93aGF0d2cvcmVhZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IERhdGFUeXBlIH0gZnJvbSAnLi4vLi4vdHlwZSc7XG5pbXBvcnQgeyBSZWNvcmRCYXRjaCB9IGZyb20gJy4uLy4uL3JlY29yZGJhdGNoJztcbmltcG9ydCB7IEFzeW5jQnl0ZVF1ZXVlIH0gZnJvbSAnLi4vLi4vaW8vc3RyZWFtJztcbmltcG9ydCB7IFJlY29yZEJhdGNoUmVhZGVyIH0gZnJvbSAnLi4vLi4vaXBjL3JlYWRlcic7XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgZnVuY3Rpb24gcmVjb3JkQmF0Y2hSZWFkZXJUaHJvdWdoRE9NU3RyZWFtPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHdyaXRhYmxlU3RyYXRlZ3k/OiBCeXRlTGVuZ3RoUXVldWluZ1N0cmF0ZWd5LCByZWFkYWJsZVN0cmF0ZWd5PzogeyBhdXRvRGVzdHJveTogYm9vbGVhbiB9KSB7XG5cbiAgICBjb25zdCBxdWV1ZSA9IG5ldyBBc3luY0J5dGVRdWV1ZSgpO1xuICAgIGxldCByZWFkZXI6IFJlY29yZEJhdGNoUmVhZGVyPFQ+IHwgbnVsbCA9IG51bGw7XG5cbiAgICBjb25zdCByZWFkYWJsZSA9IG5ldyBSZWFkYWJsZVN0cmVhbTxSZWNvcmRCYXRjaDxUPj4oe1xuICAgICAgICBhc3luYyBjYW5jZWwoKSB7IGF3YWl0IHF1ZXVlLmNsb3NlKCk7IH0sXG4gICAgICAgIGFzeW5jIHN0YXJ0KGNvbnRyb2xsZXIpIHsgYXdhaXQgbmV4dChjb250cm9sbGVyLCByZWFkZXIgfHwgKHJlYWRlciA9IGF3YWl0IG9wZW4oKSkpOyB9LFxuICAgICAgICBhc3luYyBwdWxsKGNvbnRyb2xsZXIpIHsgcmVhZGVyID8gYXdhaXQgbmV4dChjb250cm9sbGVyLCByZWFkZXIpIDogY29udHJvbGxlci5jbG9zZSgpOyB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4geyB3cml0YWJsZTogbmV3IFdyaXRhYmxlU3RyZWFtKHF1ZXVlLCB7ICdoaWdoV2F0ZXJNYXJrJzogMiAqKiAxNCwgLi4ud3JpdGFibGVTdHJhdGVneSB9KSwgcmVhZGFibGUgfTtcblxuICAgIGFzeW5jIGZ1bmN0aW9uIG9wZW4oKSB7XG4gICAgICAgIHJldHVybiBhd2FpdCAoYXdhaXQgUmVjb3JkQmF0Y2hSZWFkZXIuZnJvbShxdWV1ZSkpLm9wZW4ocmVhZGFibGVTdHJhdGVneSk7XG4gICAgfVxuXG4gICAgYXN5bmMgZnVuY3Rpb24gbmV4dChjb250cm9sbGVyOiBSZWFkYWJsZVN0cmVhbURlZmF1bHRDb250cm9sbGVyPFJlY29yZEJhdGNoPFQ+PiwgcmVhZGVyOiBSZWNvcmRCYXRjaFJlYWRlcjxUPikge1xuICAgICAgICBsZXQgc2l6ZSA9IGNvbnRyb2xsZXIuZGVzaXJlZFNpemU7XG4gICAgICAgIGxldCByOiBJdGVyYXRvclJlc3VsdDxSZWNvcmRCYXRjaDxUPj4gfCBudWxsID0gbnVsbDtcbiAgICAgICAgd2hpbGUgKCEociA9IGF3YWl0IHJlYWRlci5uZXh0KCkpLmRvbmUpIHtcbiAgICAgICAgICAgIGNvbnRyb2xsZXIuZW5xdWV1ZShyLnZhbHVlKTtcbiAgICAgICAgICAgIGlmIChzaXplICE9IG51bGwgJiYgLS1zaXplIDw9IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29udHJvbGxlci5jbG9zZSgpO1xuICAgIH1cbn1cbiJdfQ==

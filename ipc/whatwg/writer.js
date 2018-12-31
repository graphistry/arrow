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
const hack_1 = require("./hack");
/** @ignore */
function recordBatchWriterThroughDOMStream(writableStrategy, readableStrategy) {
    const writer = new this();
    const reader = new stream_1.AsyncByteStream(writer);
    const readable = new ReadableStream({
        type: 'bytes',
        cancel() {
            return tslib_1.__awaiter(this, void 0, void 0, function* () { yield reader.cancel(); });
        },
        pull(controller) {
            return tslib_1.__awaiter(this, void 0, void 0, function* () { yield next(controller); });
        },
        start(controller) {
            return tslib_1.__awaiter(this, void 0, void 0, function* () { yield next(controller); });
        },
    }, readableStrategy);
    return { writable: new WritableStream(writer, writableStrategy), readable };
    function next(controller) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let buf = null;
            let size = controller.desiredSize;
            while (buf = yield reader.read(size || null)) {
                controller.enqueue(hack_1.protectArrayBufferFromWhatwgRefImpl(buf));
                if (size != null && (size -= buf.byteLength) <= 0) {
                    return;
                }
            }
            controller.close();
        });
    }
}
exports.recordBatchWriterThroughDOMStream = recordBatchWriterThroughDOMStream;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlwYy93aGF0d2cvd3JpdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSw2REFBNkQ7QUFDN0QsK0RBQStEO0FBQy9ELHdEQUF3RDtBQUN4RCw2REFBNkQ7QUFDN0Qsb0RBQW9EO0FBQ3BELDZEQUE2RDtBQUM3RCw2REFBNkQ7QUFDN0QsRUFBRTtBQUNGLCtDQUErQztBQUMvQyxFQUFFO0FBQ0YsNkRBQTZEO0FBQzdELDhEQUE4RDtBQUM5RCx5REFBeUQ7QUFDekQsNERBQTREO0FBQzVELDBEQUEwRDtBQUMxRCxxQkFBcUI7OztBQUlyQiw0Q0FBa0Q7QUFFbEQsaUNBQTZEO0FBRTdELGNBQWM7QUFDZCxTQUFnQixpQ0FBaUMsQ0FFN0MsZ0JBQWtELEVBQ2xELGdCQUF5RDtJQUd6RCxNQUFNLE1BQU0sR0FBRyxJQUFJLElBQUksRUFBSyxDQUFDO0lBQzdCLE1BQU0sTUFBTSxHQUFHLElBQUksd0JBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUMzQyxNQUFNLFFBQVEsR0FBRyxJQUFJLGNBQWMsQ0FBQztRQUNoQyxJQUFJLEVBQUUsT0FBTztRQUNQLE1BQU07MEVBQUssTUFBTSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQUE7UUFDbkMsSUFBSSxDQUFDLFVBQVU7MEVBQUksTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQUE7UUFDNUMsS0FBSyxDQUFDLFVBQVU7MEVBQUksTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQUE7S0FDdEQsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0lBRXJCLE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxjQUFjLENBQUMsTUFBTSxFQUFFLGdCQUFnQixDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUM7SUFFNUUsU0FBZSxJQUFJLENBQUMsVUFBdUQ7O1lBQ3ZFLElBQUksR0FBRyxHQUFzQixJQUFJLENBQUM7WUFDbEMsSUFBSSxJQUFJLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQztZQUNsQyxPQUFPLEdBQUcsR0FBRyxNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxFQUFFO2dCQUMxQyxVQUFVLENBQUMsT0FBTyxDQUFDLDBDQUFtQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQzdELElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUFFLE9BQU87aUJBQUU7YUFDakU7WUFDRCxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDdkIsQ0FBQztLQUFBO0FBQ0wsQ0FBQztBQTFCRCw4RUEwQkMiLCJmaWxlIjoiaXBjL3doYXR3Zy93cml0ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgRGF0YVR5cGUgfSBmcm9tICcuLi8uLi90eXBlJztcbmltcG9ydCB7IFJlY29yZEJhdGNoIH0gZnJvbSAnLi4vLi4vcmVjb3JkYmF0Y2gnO1xuaW1wb3J0IHsgQXN5bmNCeXRlU3RyZWFtIH0gZnJvbSAnLi4vLi4vaW8vc3RyZWFtJztcbmltcG9ydCB7IFJlY29yZEJhdGNoV3JpdGVyIH0gZnJvbSAnLi4vLi4vaXBjL3dyaXRlcic7XG5pbXBvcnQgeyBwcm90ZWN0QXJyYXlCdWZmZXJGcm9tV2hhdHdnUmVmSW1wbCB9IGZyb20gJy4vaGFjayc7XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgZnVuY3Rpb24gcmVjb3JkQmF0Y2hXcml0ZXJUaHJvdWdoRE9NU3RyZWFtPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KFxuICAgIHRoaXM6IHR5cGVvZiBSZWNvcmRCYXRjaFdyaXRlcixcbiAgICB3cml0YWJsZVN0cmF0ZWd5PzogUXVldWluZ1N0cmF0ZWd5PFJlY29yZEJhdGNoPFQ+PixcbiAgICByZWFkYWJsZVN0cmF0ZWd5PzogeyBoaWdoV2F0ZXJNYXJrPzogbnVtYmVyLCBzaXplPzogYW55IH1cbikge1xuXG4gICAgY29uc3Qgd3JpdGVyID0gbmV3IHRoaXM8VD4oKTtcbiAgICBjb25zdCByZWFkZXIgPSBuZXcgQXN5bmNCeXRlU3RyZWFtKHdyaXRlcik7XG4gICAgY29uc3QgcmVhZGFibGUgPSBuZXcgUmVhZGFibGVTdHJlYW0oe1xuICAgICAgICB0eXBlOiAnYnl0ZXMnLFxuICAgICAgICBhc3luYyBjYW5jZWwoKSB7IGF3YWl0IHJlYWRlci5jYW5jZWwoKTsgfSxcbiAgICAgICAgYXN5bmMgcHVsbChjb250cm9sbGVyKSB7IGF3YWl0IG5leHQoY29udHJvbGxlcik7IH0sXG4gICAgICAgIGFzeW5jIHN0YXJ0KGNvbnRyb2xsZXIpIHsgYXdhaXQgbmV4dChjb250cm9sbGVyKTsgfSxcbiAgICB9LCByZWFkYWJsZVN0cmF0ZWd5KTtcblxuICAgIHJldHVybiB7IHdyaXRhYmxlOiBuZXcgV3JpdGFibGVTdHJlYW0od3JpdGVyLCB3cml0YWJsZVN0cmF0ZWd5KSwgcmVhZGFibGUgfTtcblxuICAgIGFzeW5jIGZ1bmN0aW9uIG5leHQoY29udHJvbGxlcjogUmVhZGFibGVTdHJlYW1EZWZhdWx0Q29udHJvbGxlcjxVaW50OEFycmF5Pikge1xuICAgICAgICBsZXQgYnVmOiBVaW50OEFycmF5IHwgbnVsbCA9IG51bGw7XG4gICAgICAgIGxldCBzaXplID0gY29udHJvbGxlci5kZXNpcmVkU2l6ZTtcbiAgICAgICAgd2hpbGUgKGJ1ZiA9IGF3YWl0IHJlYWRlci5yZWFkKHNpemUgfHwgbnVsbCkpIHtcbiAgICAgICAgICAgIGNvbnRyb2xsZXIuZW5xdWV1ZShwcm90ZWN0QXJyYXlCdWZmZXJGcm9tV2hhdHdnUmVmSW1wbChidWYpKTtcbiAgICAgICAgICAgIGlmIChzaXplICE9IG51bGwgJiYgKHNpemUgLT0gYnVmLmJ5dGVMZW5ndGgpIDw9IDApIHsgcmV0dXJuOyB9XG4gICAgICAgIH1cbiAgICAgICAgY29udHJvbGxlci5jbG9zZSgpO1xuICAgIH1cbn1cbiJdfQ==

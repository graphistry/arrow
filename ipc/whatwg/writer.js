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
/** @ignore */
function recordBatchWriterThroughDOMStream(writableStrategy, readableStrategy) {
    const writer = new this(writableStrategy);
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
    }, Object.assign({ 'highWaterMark': Math.pow(2, 14) }, readableStrategy));
    return { writable: new WritableStream(writer, writableStrategy), readable };
    function next(controller) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let buf = null;
            let size = controller.desiredSize;
            while (buf = yield reader.read(size || null)) {
                controller.enqueue(buf);
                if (size != null && (size -= buf.byteLength) <= 0) {
                    return;
                }
            }
            controller.close();
        });
    }
}
exports.recordBatchWriterThroughDOMStream = recordBatchWriterThroughDOMStream;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlwYy93aGF0d2cvd3JpdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSw2REFBNkQ7QUFDN0QsK0RBQStEO0FBQy9ELHdEQUF3RDtBQUN4RCw2REFBNkQ7QUFDN0Qsb0RBQW9EO0FBQ3BELDZEQUE2RDtBQUM3RCw2REFBNkQ7QUFDN0QsRUFBRTtBQUNGLCtDQUErQztBQUMvQyxFQUFFO0FBQ0YsNkRBQTZEO0FBQzdELDhEQUE4RDtBQUM5RCx5REFBeUQ7QUFDekQsNERBQTREO0FBQzVELDBEQUEwRDtBQUMxRCxxQkFBcUI7OztBQUlyQiw0Q0FBa0Q7QUFHbEQsY0FBYztBQUNkLFNBQWdCLGlDQUFpQyxDQUU3QyxnQkFBNkUsRUFDN0UsZ0JBQXlEO0lBR3pELE1BQU0sTUFBTSxHQUFHLElBQUksSUFBSSxDQUFJLGdCQUFnQixDQUFDLENBQUM7SUFDN0MsTUFBTSxNQUFNLEdBQUcsSUFBSSx3QkFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzNDLE1BQU0sUUFBUSxHQUFHLElBQUksY0FBYyxDQUFDO1FBQ2hDLElBQUksRUFBRSxPQUFPO1FBQ1AsTUFBTTswRUFBSyxNQUFNLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FBQTtRQUNuQyxJQUFJLENBQUMsVUFBVTswRUFBSSxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FBQTtRQUM1QyxLQUFLLENBQUMsVUFBVTswRUFBSSxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FBQTtLQUN0RCxrQkFBSSxlQUFlLEVBQUUsU0FBQSxDQUFDLEVBQUksRUFBRSxDQUFBLElBQUssZ0JBQWdCLEVBQUcsQ0FBQztJQUV0RCxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDO0lBRTVFLFNBQWUsSUFBSSxDQUFDLFVBQXVEOztZQUN2RSxJQUFJLEdBQUcsR0FBc0IsSUFBSSxDQUFDO1lBQ2xDLElBQUksSUFBSSxHQUFHLFVBQVUsQ0FBQyxXQUFXLENBQUM7WUFDbEMsT0FBTyxHQUFHLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsRUFBRTtnQkFDMUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDeEIsSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQUUsT0FBTztpQkFBRTthQUNqRTtZQUNELFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN2QixDQUFDO0tBQUE7QUFDTCxDQUFDO0FBMUJELDhFQTBCQyIsImZpbGUiOiJpcGMvd2hhdHdnL3dyaXRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBEYXRhVHlwZSB9IGZyb20gJy4uLy4uL3R5cGUnO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2ggfSBmcm9tICcuLi8uLi9yZWNvcmRiYXRjaCc7XG5pbXBvcnQgeyBBc3luY0J5dGVTdHJlYW0gfSBmcm9tICcuLi8uLi9pby9zdHJlYW0nO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2hXcml0ZXIgfSBmcm9tICcuLi8uLi9pcGMvd3JpdGVyJztcblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBmdW5jdGlvbiByZWNvcmRCYXRjaFdyaXRlclRocm91Z2hET01TdHJlYW08VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oXG4gICAgdGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLFxuICAgIHdyaXRhYmxlU3RyYXRlZ3k/OiBRdWV1aW5nU3RyYXRlZ3k8UmVjb3JkQmF0Y2g8VD4+ICYgeyBhdXRvRGVzdHJveTogYm9vbGVhbiB9LFxuICAgIHJlYWRhYmxlU3RyYXRlZ3k/OiB7IGhpZ2hXYXRlck1hcms/OiBudW1iZXIsIHNpemU/OiBhbnkgfVxuKSB7XG5cbiAgICBjb25zdCB3cml0ZXIgPSBuZXcgdGhpczxUPih3cml0YWJsZVN0cmF0ZWd5KTtcbiAgICBjb25zdCByZWFkZXIgPSBuZXcgQXN5bmNCeXRlU3RyZWFtKHdyaXRlcik7XG4gICAgY29uc3QgcmVhZGFibGUgPSBuZXcgUmVhZGFibGVTdHJlYW0oe1xuICAgICAgICB0eXBlOiAnYnl0ZXMnLFxuICAgICAgICBhc3luYyBjYW5jZWwoKSB7IGF3YWl0IHJlYWRlci5jYW5jZWwoKTsgfSxcbiAgICAgICAgYXN5bmMgcHVsbChjb250cm9sbGVyKSB7IGF3YWl0IG5leHQoY29udHJvbGxlcik7IH0sXG4gICAgICAgIGFzeW5jIHN0YXJ0KGNvbnRyb2xsZXIpIHsgYXdhaXQgbmV4dChjb250cm9sbGVyKTsgfSxcbiAgICB9LCB7ICdoaWdoV2F0ZXJNYXJrJzogMiAqKiAxNCwgLi4ucmVhZGFibGVTdHJhdGVneSB9KTtcblxuICAgIHJldHVybiB7IHdyaXRhYmxlOiBuZXcgV3JpdGFibGVTdHJlYW0od3JpdGVyLCB3cml0YWJsZVN0cmF0ZWd5KSwgcmVhZGFibGUgfTtcblxuICAgIGFzeW5jIGZ1bmN0aW9uIG5leHQoY29udHJvbGxlcjogUmVhZGFibGVTdHJlYW1EZWZhdWx0Q29udHJvbGxlcjxVaW50OEFycmF5Pikge1xuICAgICAgICBsZXQgYnVmOiBVaW50OEFycmF5IHwgbnVsbCA9IG51bGw7XG4gICAgICAgIGxldCBzaXplID0gY29udHJvbGxlci5kZXNpcmVkU2l6ZTtcbiAgICAgICAgd2hpbGUgKGJ1ZiA9IGF3YWl0IHJlYWRlci5yZWFkKHNpemUgfHwgbnVsbCkpIHtcbiAgICAgICAgICAgIGNvbnRyb2xsZXIuZW5xdWV1ZShidWYpO1xuICAgICAgICAgICAgaWYgKHNpemUgIT0gbnVsbCAmJiAoc2l6ZSAtPSBidWYuYnl0ZUxlbmd0aCkgPD0gMCkgeyByZXR1cm47IH1cbiAgICAgICAgfVxuICAgICAgICBjb250cm9sbGVyLmNsb3NlKCk7XG4gICAgfVxufVxuIl19

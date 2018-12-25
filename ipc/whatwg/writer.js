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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlwYy93aGF0d2cvd3JpdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSw2REFBNkQ7QUFDN0QsK0RBQStEO0FBQy9ELHdEQUF3RDtBQUN4RCw2REFBNkQ7QUFDN0Qsb0RBQW9EO0FBQ3BELDZEQUE2RDtBQUM3RCw2REFBNkQ7QUFDN0QsRUFBRTtBQUNGLCtDQUErQztBQUMvQyxFQUFFO0FBQ0YsNkRBQTZEO0FBQzdELDhEQUE4RDtBQUM5RCx5REFBeUQ7QUFDekQsNERBQTREO0FBQzVELDBEQUEwRDtBQUMxRCxxQkFBcUI7OztBQUlyQiw0Q0FBa0Q7QUFFbEQsaUNBQTZEO0FBRTdELFNBQWdCLGlDQUFpQyxDQUU3QyxnQkFBa0QsRUFDbEQsZ0JBQXlEO0lBR3pELE1BQU0sTUFBTSxHQUFHLElBQUksSUFBSSxFQUFLLENBQUM7SUFDN0IsTUFBTSxNQUFNLEdBQUcsSUFBSSx3QkFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzNDLE1BQU0sUUFBUSxHQUFHLElBQUksY0FBYyxDQUFDO1FBQ2hDLElBQUksRUFBRSxPQUFPO1FBQ1AsTUFBTTswRUFBSyxNQUFNLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FBQTtRQUNuQyxJQUFJLENBQUMsVUFBVTswRUFBSSxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FBQTtRQUM1QyxLQUFLLENBQUMsVUFBVTswRUFBSSxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FBQTtLQUN0RCxFQUFFLGdCQUFnQixDQUFDLENBQUM7SUFFckIsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLGNBQWMsQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQztJQUU1RSxTQUFlLElBQUksQ0FBQyxVQUF1RDs7WUFDdkUsSUFBSSxHQUFHLEdBQXNCLElBQUksQ0FBQztZQUNsQyxJQUFJLElBQUksR0FBRyxVQUFVLENBQUMsV0FBVyxDQUFDO1lBQ2xDLE9BQU8sR0FBRyxHQUFHLE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLEVBQUU7Z0JBQzFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsMENBQW1DLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDN0QsSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQUUsT0FBTztpQkFBRTthQUNqRTtZQUNELFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN2QixDQUFDO0tBQUE7QUFDTCxDQUFDO0FBMUJELDhFQTBCQyIsImZpbGUiOiJpcGMvd2hhdHdnL3dyaXRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBEYXRhVHlwZSB9IGZyb20gJy4uLy4uL3R5cGUnO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2ggfSBmcm9tICcuLi8uLi9yZWNvcmRiYXRjaCc7XG5pbXBvcnQgeyBBc3luY0J5dGVTdHJlYW0gfSBmcm9tICcuLi8uLi9pby9zdHJlYW0nO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2hXcml0ZXIgfSBmcm9tICcuLi8uLi9pcGMvd3JpdGVyJztcbmltcG9ydCB7IHByb3RlY3RBcnJheUJ1ZmZlckZyb21XaGF0d2dSZWZJbXBsIH0gZnJvbSAnLi9oYWNrJztcblxuZXhwb3J0IGZ1bmN0aW9uIHJlY29yZEJhdGNoV3JpdGVyVGhyb3VnaERPTVN0cmVhbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PihcbiAgICB0aGlzOiB0eXBlb2YgUmVjb3JkQmF0Y2hXcml0ZXIsXG4gICAgd3JpdGFibGVTdHJhdGVneT86IFF1ZXVpbmdTdHJhdGVneTxSZWNvcmRCYXRjaDxUPj4sXG4gICAgcmVhZGFibGVTdHJhdGVneT86IHsgaGlnaFdhdGVyTWFyaz86IG51bWJlciwgc2l6ZT86IGFueSB9XG4pIHtcblxuICAgIGNvbnN0IHdyaXRlciA9IG5ldyB0aGlzPFQ+KCk7XG4gICAgY29uc3QgcmVhZGVyID0gbmV3IEFzeW5jQnl0ZVN0cmVhbSh3cml0ZXIpO1xuICAgIGNvbnN0IHJlYWRhYmxlID0gbmV3IFJlYWRhYmxlU3RyZWFtKHtcbiAgICAgICAgdHlwZTogJ2J5dGVzJyxcbiAgICAgICAgYXN5bmMgY2FuY2VsKCkgeyBhd2FpdCByZWFkZXIuY2FuY2VsKCk7IH0sXG4gICAgICAgIGFzeW5jIHB1bGwoY29udHJvbGxlcikgeyBhd2FpdCBuZXh0KGNvbnRyb2xsZXIpOyB9LFxuICAgICAgICBhc3luYyBzdGFydChjb250cm9sbGVyKSB7IGF3YWl0IG5leHQoY29udHJvbGxlcik7IH0sXG4gICAgfSwgcmVhZGFibGVTdHJhdGVneSk7XG5cbiAgICByZXR1cm4geyB3cml0YWJsZTogbmV3IFdyaXRhYmxlU3RyZWFtKHdyaXRlciwgd3JpdGFibGVTdHJhdGVneSksIHJlYWRhYmxlIH07XG5cbiAgICBhc3luYyBmdW5jdGlvbiBuZXh0KGNvbnRyb2xsZXI6IFJlYWRhYmxlU3RyZWFtRGVmYXVsdENvbnRyb2xsZXI8VWludDhBcnJheT4pIHtcbiAgICAgICAgbGV0IGJ1ZjogVWludDhBcnJheSB8IG51bGwgPSBudWxsO1xuICAgICAgICBsZXQgc2l6ZSA9IGNvbnRyb2xsZXIuZGVzaXJlZFNpemU7XG4gICAgICAgIHdoaWxlIChidWYgPSBhd2FpdCByZWFkZXIucmVhZChzaXplIHx8IG51bGwpKSB7XG4gICAgICAgICAgICBjb250cm9sbGVyLmVucXVldWUocHJvdGVjdEFycmF5QnVmZmVyRnJvbVdoYXR3Z1JlZkltcGwoYnVmKSk7XG4gICAgICAgICAgICBpZiAoc2l6ZSAhPSBudWxsICYmIChzaXplIC09IGJ1Zi5ieXRlTGVuZ3RoKSA8PSAwKSB7IHJldHVybjsgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICB9XG59XG4iXX0=

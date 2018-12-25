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
function recordBatchReaderThroughDOMStream() {
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
    return { writable: new WritableStream(queue), readable };
    function open() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield (yield reader_1.RecordBatchReader.from(queue)).open();
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlwYy93aGF0d2cvcmVhZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSw2REFBNkQ7QUFDN0QsK0RBQStEO0FBQy9ELHdEQUF3RDtBQUN4RCw2REFBNkQ7QUFDN0Qsb0RBQW9EO0FBQ3BELDZEQUE2RDtBQUM3RCw2REFBNkQ7QUFDN0QsRUFBRTtBQUNGLCtDQUErQztBQUMvQyxFQUFFO0FBQ0YsNkRBQTZEO0FBQzdELDhEQUE4RDtBQUM5RCx5REFBeUQ7QUFDekQsNERBQTREO0FBQzVELDBEQUEwRDtBQUMxRCxxQkFBcUI7OztBQUlyQiw0Q0FBaUQ7QUFDakQsNkNBQXFEO0FBRXJELFNBQWdCLGlDQUFpQztJQUU3QyxNQUFNLEtBQUssR0FBRyxJQUFJLHVCQUFjLEVBQUUsQ0FBQztJQUNuQyxJQUFJLE1BQU0sR0FBZ0MsSUFBSSxDQUFDO0lBRS9DLE1BQU0sUUFBUSxHQUFHLElBQUksY0FBYyxDQUFpQjtRQUMxQyxNQUFNOzBFQUFLLE1BQU0sS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztTQUFBO1FBQ2pDLEtBQUssQ0FBQyxVQUFVOzBFQUFJLE1BQU0sSUFBSSxDQUFDLFVBQVUsRUFBRSxNQUFNLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQUE7UUFDaEYsSUFBSSxDQUFDLFVBQVU7MEVBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FBQTtLQUMzRixDQUFDLENBQUM7SUFFSCxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksY0FBYyxDQUFDLEtBQUssQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDO0lBRXpELFNBQWUsSUFBSTs7WUFDZixPQUFPLE1BQU0sQ0FBQyxNQUFNLDBCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQzlELENBQUM7S0FBQTtJQUVELFNBQWUsSUFBSSxDQUFDLFVBQTJELEVBQUUsTUFBNEI7O1lBQ3pHLElBQUksSUFBSSxHQUFHLFVBQVUsQ0FBQyxXQUFXLENBQUM7WUFDbEMsSUFBSSxDQUFDLEdBQTBDLElBQUksQ0FBQztZQUNwRCxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUU7Z0JBQ3BDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUM1QixJQUFJLElBQUksSUFBSSxJQUFJLElBQUksRUFBRSxJQUFJLElBQUksQ0FBQyxFQUFFO29CQUM3QixPQUFPO2lCQUNWO2FBQ0o7WUFDRCxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDdkIsQ0FBQztLQUFBO0FBQ0wsQ0FBQztBQTVCRCw4RUE0QkMiLCJmaWxlIjoiaXBjL3doYXR3Zy9yZWFkZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgRGF0YVR5cGUgfSBmcm9tICcuLi8uLi90eXBlJztcbmltcG9ydCB7IFJlY29yZEJhdGNoIH0gZnJvbSAnLi4vLi4vcmVjb3JkYmF0Y2gnO1xuaW1wb3J0IHsgQXN5bmNCeXRlUXVldWUgfSBmcm9tICcuLi8uLi9pby9zdHJlYW0nO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2hSZWFkZXIgfSBmcm9tICcuLi8uLi9pcGMvcmVhZGVyJztcblxuZXhwb3J0IGZ1bmN0aW9uIHJlY29yZEJhdGNoUmVhZGVyVGhyb3VnaERPTVN0cmVhbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PigpIHtcblxuICAgIGNvbnN0IHF1ZXVlID0gbmV3IEFzeW5jQnl0ZVF1ZXVlKCk7XG4gICAgbGV0IHJlYWRlcjogUmVjb3JkQmF0Y2hSZWFkZXI8VD4gfCBudWxsID0gbnVsbDtcblxuICAgIGNvbnN0IHJlYWRhYmxlID0gbmV3IFJlYWRhYmxlU3RyZWFtPFJlY29yZEJhdGNoPFQ+Pih7XG4gICAgICAgIGFzeW5jIGNhbmNlbCgpIHsgYXdhaXQgcXVldWUuY2xvc2UoKTsgfSxcbiAgICAgICAgYXN5bmMgc3RhcnQoY29udHJvbGxlcikgeyBhd2FpdCBuZXh0KGNvbnRyb2xsZXIsIHJlYWRlciB8fCAocmVhZGVyID0gYXdhaXQgb3BlbigpKSk7IH0sXG4gICAgICAgIGFzeW5jIHB1bGwoY29udHJvbGxlcikgeyByZWFkZXIgPyBhd2FpdCBuZXh0KGNvbnRyb2xsZXIsIHJlYWRlcikgOiBjb250cm9sbGVyLmNsb3NlKCk7IH1cbiAgICB9KTtcblxuICAgIHJldHVybiB7IHdyaXRhYmxlOiBuZXcgV3JpdGFibGVTdHJlYW0ocXVldWUpLCByZWFkYWJsZSB9O1xuXG4gICAgYXN5bmMgZnVuY3Rpb24gb3BlbigpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IChhd2FpdCBSZWNvcmRCYXRjaFJlYWRlci5mcm9tKHF1ZXVlKSkub3BlbigpO1xuICAgIH1cblxuICAgIGFzeW5jIGZ1bmN0aW9uIG5leHQoY29udHJvbGxlcjogUmVhZGFibGVTdHJlYW1EZWZhdWx0Q29udHJvbGxlcjxSZWNvcmRCYXRjaDxUPj4sIHJlYWRlcjogUmVjb3JkQmF0Y2hSZWFkZXI8VD4pIHtcbiAgICAgICAgbGV0IHNpemUgPSBjb250cm9sbGVyLmRlc2lyZWRTaXplO1xuICAgICAgICBsZXQgcjogSXRlcmF0b3JSZXN1bHQ8UmVjb3JkQmF0Y2g8VD4+IHwgbnVsbCA9IG51bGw7XG4gICAgICAgIHdoaWxlICghKHIgPSBhd2FpdCByZWFkZXIubmV4dCgpKS5kb25lKSB7XG4gICAgICAgICAgICBjb250cm9sbGVyLmVucXVldWUoci52YWx1ZSk7XG4gICAgICAgICAgICBpZiAoc2l6ZSAhPSBudWxsICYmIC0tc2l6ZSA8PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICB9XG59XG4iXX0=

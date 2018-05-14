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
const magic_1 = require("../magic");
const flatbuffers_1 = require("flatbuffers");
const Message_ = require("../../fb/Message");
var ByteBuffer = flatbuffers_1.flatbuffers.ByteBuffer;
var _Message = Message_.org.apache.arrow.flatbuf.Message;
function fromNodeStream(stream) {
    return tslib_1.__asyncGenerator(this, arguments, function* fromNodeStream_1() {
        let bb;
        let bytesRead = 0, bytes = new Uint8Array(0);
        let messageLength = 0, message = null;
        try {
            for (var _a = tslib_1.__asyncValues(stream), _b; _b = yield tslib_1.__await(_a.next()), !_b.done;) {
                let chunk = yield tslib_1.__await(_b.value);
                const grown = new Uint8Array(bytes.byteLength + chunk.length);
                if (typeof chunk !== 'string') {
                    grown.set(bytes, 0) || grown.set(chunk, bytes.byteLength);
                }
                else {
                    for (let i = -1, j = bytes.byteLength, n = chunk.length; ++i < n;) {
                        grown[i + j] = chunk.charCodeAt(i);
                    }
                }
                bytes = grown;
                if (messageLength <= 0) {
                    messageLength = new DataView(bytes.buffer).getInt32(0, true);
                }
                while (messageLength < bytes.byteLength) {
                    if (!message) {
                        (bb = new ByteBuffer(bytes)).setPosition(4);
                        if (message = _Message.getRootAsMessage(bb)) {
                            messageLength += message.bodyLength().low;
                            continue;
                        }
                        throw new Error(`Invalid message at position ${bytesRead}`);
                    }
                    bytesRead += messageLength + magic_1.PADDING;
                    yield bytes.subarray(0, messageLength + magic_1.PADDING);
                    bytes = bytes.subarray(messageLength + magic_1.PADDING);
                    messageLength = bytes.byteLength <= 0 ? 0 :
                        new DataView(bytes.buffer).getInt32(bytes.byteOffset, true);
                    message = null;
                }
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
exports.fromNodeStream = fromNodeStream;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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YSxHQUFHLGVBQU8sQ0FBQztvQkFDckMsTUFBTSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxhQUFhLEdBQUcsZUFBTyxDQUFDLENBQUM7b0JBQ2pELEtBQUssR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQWEsR0FBRyxlQUFPLENBQUMsQ0FBQztvQkFDaEQsYUFBYSxHQUFHLEtBQUssQ0FBQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDdkMsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUNoRSxPQUFPLEdBQUcsSUFBSSxDQUFDO2dCQUNuQixDQUFDO2FBQ0o7Ozs7Ozs7Ozs7SUFDTCxDQUFDO0NBQUE7QUF6Q0Qsd0NBeUNDIiwiZmlsZSI6ImlwYy9yZWFkZXIvbm9kZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBQQURESU5HIH0gZnJvbSAnLi4vbWFnaWMnO1xuaW1wb3J0IHsgZmxhdGJ1ZmZlcnMgfSBmcm9tICdmbGF0YnVmZmVycyc7XG5pbXBvcnQgKiBhcyBNZXNzYWdlXyBmcm9tICcuLi8uLi9mYi9NZXNzYWdlJztcbmltcG9ydCBCeXRlQnVmZmVyID0gZmxhdGJ1ZmZlcnMuQnl0ZUJ1ZmZlcjtcbmltcG9ydCBfTWVzc2FnZSA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NZXNzYWdlO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24qIGZyb21Ob2RlU3RyZWFtKHN0cmVhbTogTm9kZUpTLlJlYWRhYmxlU3RyZWFtKSB7XG5cbiAgICBsZXQgYmI6IEJ5dGVCdWZmZXI7XG4gICAgbGV0IGJ5dGVzUmVhZCA9IDAsIGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoMCk7XG4gICAgbGV0IG1lc3NhZ2VMZW5ndGggPSAwLCBtZXNzYWdlOiBfTWVzc2FnZSB8IG51bGwgPSBudWxsO1xuXG4gICAgZm9yIGF3YWl0IChsZXQgY2h1bmsgb2YgKHN0cmVhbSBhcyBhbnkgYXMgQXN5bmNJdGVyYWJsZTxVaW50OEFycmF5IHwgQnVmZmVyIHwgc3RyaW5nPikpIHtcblxuICAgICAgICBjb25zdCBncm93biA9IG5ldyBVaW50OEFycmF5KGJ5dGVzLmJ5dGVMZW5ndGggKyBjaHVuay5sZW5ndGgpO1xuXG4gICAgICAgIGlmICh0eXBlb2YgY2h1bmsgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBncm93bi5zZXQoYnl0ZXMsIDApIHx8IGdyb3duLnNldChjaHVuaywgYnl0ZXMuYnl0ZUxlbmd0aCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gLTEsIGogPSBieXRlcy5ieXRlTGVuZ3RoLCBuID0gY2h1bmsubGVuZ3RoOyArK2kgPCBuOykge1xuICAgICAgICAgICAgICAgIGdyb3duW2kgKyBqXSA9IGNodW5rLmNoYXJDb2RlQXQoaSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBieXRlcyA9IGdyb3duO1xuXG4gICAgICAgIGlmIChtZXNzYWdlTGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIG1lc3NhZ2VMZW5ndGggPSBuZXcgRGF0YVZpZXcoYnl0ZXMuYnVmZmVyKS5nZXRJbnQzMigwLCB0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHdoaWxlIChtZXNzYWdlTGVuZ3RoIDwgYnl0ZXMuYnl0ZUxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKCFtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgKGJiID0gbmV3IEJ5dGVCdWZmZXIoYnl0ZXMpKS5zZXRQb3NpdGlvbig0KTtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZSA9IF9NZXNzYWdlLmdldFJvb3RBc01lc3NhZ2UoYmIpKSB7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VMZW5ndGggKz0gbWVzc2FnZS5ib2R5TGVuZ3RoKCkubG93O1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIG1lc3NhZ2UgYXQgcG9zaXRpb24gJHtieXRlc1JlYWR9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBieXRlc1JlYWQgKz0gbWVzc2FnZUxlbmd0aCArIFBBRERJTkc7XG4gICAgICAgICAgICB5aWVsZCBieXRlcy5zdWJhcnJheSgwLCBtZXNzYWdlTGVuZ3RoICsgUEFERElORyk7XG4gICAgICAgICAgICBieXRlcyA9IGJ5dGVzLnN1YmFycmF5KG1lc3NhZ2VMZW5ndGggKyBQQURESU5HKTtcbiAgICAgICAgICAgIG1lc3NhZ2VMZW5ndGggPSBieXRlcy5ieXRlTGVuZ3RoIDw9IDAgPyAwIDpcbiAgICAgICAgICAgICAgICBuZXcgRGF0YVZpZXcoYnl0ZXMuYnVmZmVyKS5nZXRJbnQzMihieXRlcy5ieXRlT2Zmc2V0LCB0cnVlKTtcbiAgICAgICAgICAgIG1lc3NhZ2UgPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxufVxuIl19

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
const flatbuffers_1 = require("flatbuffers");
const Message_ = require("../../fb/Message");
var ByteBuffer = flatbuffers_1.flatbuffers.ByteBuffer;
var _Message = Message_.org.apache.arrow.flatbuf.Message;
const magic_1 = require("../magic");
function fromReadableStream(stream) {
    return tslib_1.__asyncGenerator(this, arguments, function* fromReadableStream_1() {
        var e_1, _a;
        let bb;
        let bytesRead = 0, bytes = new Uint8Array(0);
        let messageLength = 0, message = null;
        try {
            for (var _b = tslib_1.__asyncValues(stream), _c; _c = yield tslib_1.__await(_b.next()), !_c.done;) {
                let chunk = _c.value;
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
                // If we're reading in an Arrow File, just concatenate the bytes until
                // the file is fully read in
                if (magic_1.checkForMagicArrowString(bytes)) {
                    if (!magic_1.isValidArrowFile(new ByteBuffer(bytes))) {
                        continue;
                    }
                    return yield tslib_1.__await(yield yield tslib_1.__await(bytes));
                }
                if (bytes.byteLength > 0 && messageLength <= 0) {
                    messageLength = new DataView(bytes.buffer).getInt32(0, true);
                }
                while (messageLength > 0 && messageLength <= bytes.byteLength) {
                    if (!message) {
                        (bb = new ByteBuffer(bytes)).setPosition(4);
                        if (message = _Message.getRootAsMessage(bb)) {
                            messageLength += message.bodyLength().low;
                            continue;
                        }
                        throw new Error(`Invalid message at position ${bytesRead}`);
                    }
                    bytesRead += messageLength + magic_1.PADDING;
                    yield yield tslib_1.__await(bytes.subarray(0, messageLength + magic_1.PADDING));
                    bytes = bytes.subarray(messageLength + magic_1.PADDING);
                    messageLength = bytes.byteLength < 4 ? 0 :
                        new DataView(bytes.buffer).getInt32(bytes.byteOffset, true);
                    message = null;
                }
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
exports.fromReadableStream = fromReadableStream;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QkFDRCxNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixTQUFTLEVBQUUsQ0FBQyxDQUFDO3FCQUMvRDtvQkFDRCxTQUFTLElBQUksYUFBYSxHQUFHLGVBQU8sQ0FBQztvQkFDckMsNEJBQU0sS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsYUFBYSxHQUFHLGVBQU8sQ0FBQyxDQUFBLENBQUM7b0JBQ2pELEtBQUssR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQWEsR0FBRyxlQUFPLENBQUMsQ0FBQztvQkFDaEQsYUFBYSxHQUFHLEtBQUssQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDdEMsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUNoRSxPQUFPLEdBQUcsSUFBSSxDQUFDO2lCQUNsQjthQUNKOzs7Ozs7Ozs7SUFDTCxDQUFDO0NBQUE7QUFsREQsZ0RBa0RDIiwiZmlsZSI6ImlwYy9yZWFkZXIvbm9kZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBmbGF0YnVmZmVycyB9IGZyb20gJ2ZsYXRidWZmZXJzJztcbmltcG9ydCAqIGFzIE1lc3NhZ2VfIGZyb20gJy4uLy4uL2ZiL01lc3NhZ2UnO1xuaW1wb3J0IEJ5dGVCdWZmZXIgPSBmbGF0YnVmZmVycy5CeXRlQnVmZmVyO1xuaW1wb3J0IF9NZXNzYWdlID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk1lc3NhZ2U7XG5pbXBvcnQgeyBQQURESU5HLCBpc1ZhbGlkQXJyb3dGaWxlLCBjaGVja0Zvck1hZ2ljQXJyb3dTdHJpbmcgfSBmcm9tICcuLi9tYWdpYyc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiogZnJvbVJlYWRhYmxlU3RyZWFtKHN0cmVhbTogTm9kZUpTLlJlYWRhYmxlU3RyZWFtKSB7XG5cbiAgICBsZXQgYmI6IEJ5dGVCdWZmZXI7XG4gICAgbGV0IGJ5dGVzUmVhZCA9IDAsIGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoMCk7XG4gICAgbGV0IG1lc3NhZ2VMZW5ndGggPSAwLCBtZXNzYWdlOiBfTWVzc2FnZSB8IG51bGwgPSBudWxsO1xuXG4gICAgZm9yIGF3YWl0IChsZXQgY2h1bmsgb2YgKHN0cmVhbSBhcyBhbnkgYXMgQXN5bmNJdGVyYWJsZTxVaW50OEFycmF5IHwgQnVmZmVyIHwgc3RyaW5nPikpIHtcblxuICAgICAgICBjb25zdCBncm93biA9IG5ldyBVaW50OEFycmF5KGJ5dGVzLmJ5dGVMZW5ndGggKyBjaHVuay5sZW5ndGgpO1xuXG4gICAgICAgIGlmICh0eXBlb2YgY2h1bmsgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBncm93bi5zZXQoYnl0ZXMsIDApIHx8IGdyb3duLnNldChjaHVuaywgYnl0ZXMuYnl0ZUxlbmd0aCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gLTEsIGogPSBieXRlcy5ieXRlTGVuZ3RoLCBuID0gY2h1bmsubGVuZ3RoOyArK2kgPCBuOykge1xuICAgICAgICAgICAgICAgIGdyb3duW2kgKyBqXSA9IGNodW5rLmNoYXJDb2RlQXQoaSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBieXRlcyA9IGdyb3duO1xuXG4gICAgICAgIC8vIElmIHdlJ3JlIHJlYWRpbmcgaW4gYW4gQXJyb3cgRmlsZSwganVzdCBjb25jYXRlbmF0ZSB0aGUgYnl0ZXMgdW50aWxcbiAgICAgICAgLy8gdGhlIGZpbGUgaXMgZnVsbHkgcmVhZCBpblxuICAgICAgICBpZiAoY2hlY2tGb3JNYWdpY0Fycm93U3RyaW5nKGJ5dGVzKSkge1xuICAgICAgICAgICAgaWYgKCFpc1ZhbGlkQXJyb3dGaWxlKG5ldyBCeXRlQnVmZmVyKGJ5dGVzKSkpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB5aWVsZCBieXRlcztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChieXRlcy5ieXRlTGVuZ3RoID4gMCAmJiBtZXNzYWdlTGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIG1lc3NhZ2VMZW5ndGggPSBuZXcgRGF0YVZpZXcoYnl0ZXMuYnVmZmVyKS5nZXRJbnQzMigwLCB0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHdoaWxlIChtZXNzYWdlTGVuZ3RoID4gMCAmJiBtZXNzYWdlTGVuZ3RoIDw9IGJ5dGVzLmJ5dGVMZW5ndGgpIHtcbiAgICAgICAgICAgIGlmICghbWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIChiYiA9IG5ldyBCeXRlQnVmZmVyKGJ5dGVzKSkuc2V0UG9zaXRpb24oNCk7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UgPSBfTWVzc2FnZS5nZXRSb290QXNNZXNzYWdlKGJiKSkge1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlTGVuZ3RoICs9IG1lc3NhZ2UuYm9keUxlbmd0aCgpLmxvdztcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBtZXNzYWdlIGF0IHBvc2l0aW9uICR7Ynl0ZXNSZWFkfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnl0ZXNSZWFkICs9IG1lc3NhZ2VMZW5ndGggKyBQQURESU5HO1xuICAgICAgICAgICAgeWllbGQgYnl0ZXMuc3ViYXJyYXkoMCwgbWVzc2FnZUxlbmd0aCArIFBBRERJTkcpO1xuICAgICAgICAgICAgYnl0ZXMgPSBieXRlcy5zdWJhcnJheShtZXNzYWdlTGVuZ3RoICsgUEFERElORyk7XG4gICAgICAgICAgICBtZXNzYWdlTGVuZ3RoID0gYnl0ZXMuYnl0ZUxlbmd0aCA8IDQgPyAwIDpcbiAgICAgICAgICAgICAgICBuZXcgRGF0YVZpZXcoYnl0ZXMuYnVmZmVyKS5nZXRJbnQzMihieXRlcy5ieXRlT2Zmc2V0LCB0cnVlKTtcbiAgICAgICAgICAgIG1lc3NhZ2UgPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxufVxuIl19

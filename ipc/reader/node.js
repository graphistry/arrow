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
                if (chunk == null) {
                    continue;
                }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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SUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUMsR0FBRyxDQUFDOzRCQUMxQyxTQUFTO3lCQUNaO3dCQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsK0JBQStCLFNBQVMsRUFBRSxDQUFDLENBQUM7cUJBQy9EO29CQUNELFNBQVMsSUFBSSxhQUFhLEdBQUcsZUFBTyxDQUFDO29CQUNyQyw0QkFBTSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxhQUFhLEdBQUcsZUFBTyxDQUFDLENBQUEsQ0FBQztvQkFDakQsS0FBSyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsYUFBYSxHQUFHLGVBQU8sQ0FBQyxDQUFDO29CQUNoRCxhQUFhLEdBQUcsS0FBSyxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUN0QyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQ2hFLE9BQU8sR0FBRyxJQUFJLENBQUM7aUJBQ2xCO2FBQ0o7Ozs7Ozs7OztJQUNMLENBQUM7Q0FBQTtBQXRERCxnREFzREMiLCJmaWxlIjoiaXBjL3JlYWRlci9ub2RlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IGZsYXRidWZmZXJzIH0gZnJvbSAnZmxhdGJ1ZmZlcnMnO1xuaW1wb3J0ICogYXMgTWVzc2FnZV8gZnJvbSAnLi4vLi4vZmIvTWVzc2FnZSc7XG5pbXBvcnQgQnl0ZUJ1ZmZlciA9IGZsYXRidWZmZXJzLkJ5dGVCdWZmZXI7XG5pbXBvcnQgX01lc3NhZ2UgPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTWVzc2FnZTtcbmltcG9ydCB7IFBBRERJTkcsIGlzVmFsaWRBcnJvd0ZpbGUsIGNoZWNrRm9yTWFnaWNBcnJvd1N0cmluZyB9IGZyb20gJy4uL21hZ2ljJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uKiBmcm9tUmVhZGFibGVTdHJlYW0oc3RyZWFtOiBOb2RlSlMuUmVhZGFibGVTdHJlYW0pIHtcblxuICAgIGxldCBiYjogQnl0ZUJ1ZmZlcjtcbiAgICBsZXQgYnl0ZXNSZWFkID0gMCwgYnl0ZXMgPSBuZXcgVWludDhBcnJheSgwKTtcbiAgICBsZXQgbWVzc2FnZUxlbmd0aCA9IDAsIG1lc3NhZ2U6IF9NZXNzYWdlIHwgbnVsbCA9IG51bGw7XG5cbiAgICBmb3IgYXdhaXQgKGxldCBjaHVuayBvZiAoc3RyZWFtIGFzIGFueSBhcyBBc3luY0l0ZXJhYmxlPFVpbnQ4QXJyYXkgfCBCdWZmZXIgfCBzdHJpbmc+KSkge1xuXG4gICAgICAgIGlmIChjaHVuayA9PSBudWxsKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGdyb3duID0gbmV3IFVpbnQ4QXJyYXkoYnl0ZXMuYnl0ZUxlbmd0aCArIGNodW5rLmxlbmd0aCk7XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjaHVuayAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGdyb3duLnNldChieXRlcywgMCkgfHwgZ3Jvd24uc2V0KGNodW5rLCBieXRlcy5ieXRlTGVuZ3RoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAtMSwgaiA9IGJ5dGVzLmJ5dGVMZW5ndGgsIG4gPSBjaHVuay5sZW5ndGg7ICsraSA8IG47KSB7XG4gICAgICAgICAgICAgICAgZ3Jvd25baSArIGpdID0gY2h1bmsuY2hhckNvZGVBdChpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGJ5dGVzID0gZ3Jvd247XG5cbiAgICAgICAgLy8gSWYgd2UncmUgcmVhZGluZyBpbiBhbiBBcnJvdyBGaWxlLCBqdXN0IGNvbmNhdGVuYXRlIHRoZSBieXRlcyB1bnRpbFxuICAgICAgICAvLyB0aGUgZmlsZSBpcyBmdWxseSByZWFkIGluXG4gICAgICAgIGlmIChjaGVja0Zvck1hZ2ljQXJyb3dTdHJpbmcoYnl0ZXMpKSB7XG4gICAgICAgICAgICBpZiAoIWlzVmFsaWRBcnJvd0ZpbGUobmV3IEJ5dGVCdWZmZXIoYnl0ZXMpKSkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHlpZWxkIGJ5dGVzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGJ5dGVzLmJ5dGVMZW5ndGggPiAwICYmIG1lc3NhZ2VMZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgbWVzc2FnZUxlbmd0aCA9IG5ldyBEYXRhVmlldyhieXRlcy5idWZmZXIpLmdldEludDMyKDAsIHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgd2hpbGUgKG1lc3NhZ2VMZW5ndGggPiAwICYmIG1lc3NhZ2VMZW5ndGggPD0gYnl0ZXMuYnl0ZUxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKCFtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgKGJiID0gbmV3IEJ5dGVCdWZmZXIoYnl0ZXMpKS5zZXRQb3NpdGlvbig0KTtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZSA9IF9NZXNzYWdlLmdldFJvb3RBc01lc3NhZ2UoYmIpKSB7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VMZW5ndGggKz0gbWVzc2FnZS5ib2R5TGVuZ3RoKCkubG93O1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIG1lc3NhZ2UgYXQgcG9zaXRpb24gJHtieXRlc1JlYWR9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBieXRlc1JlYWQgKz0gbWVzc2FnZUxlbmd0aCArIFBBRERJTkc7XG4gICAgICAgICAgICB5aWVsZCBieXRlcy5zdWJhcnJheSgwLCBtZXNzYWdlTGVuZ3RoICsgUEFERElORyk7XG4gICAgICAgICAgICBieXRlcyA9IGJ5dGVzLnN1YmFycmF5KG1lc3NhZ2VMZW5ndGggKyBQQURESU5HKTtcbiAgICAgICAgICAgIG1lc3NhZ2VMZW5ndGggPSBieXRlcy5ieXRlTGVuZ3RoIDwgNCA/IDAgOlxuICAgICAgICAgICAgICAgIG5ldyBEYXRhVmlldyhieXRlcy5idWZmZXIpLmdldEludDMyKGJ5dGVzLmJ5dGVPZmZzZXQsIHRydWUpO1xuICAgICAgICAgICAgbWVzc2FnZSA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG59XG4iXX0=

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
import { PADDING } from '../magic';
import { flatbuffers } from 'flatbuffers';
import * as Message_ from '../../fb/Message';
var ByteBuffer = flatbuffers.ByteBuffer;
var _Message = Message_.org.apache.arrow.flatbuf.Message;
export function fromNodeStream(stream) {
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
                    bytesRead += messageLength + PADDING;
                    yield bytes.subarray(0, messageLength + PADDING);
                    bytes = bytes.subarray(messageLength + PADDING);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QkFDRCxNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixTQUFTLEVBQUUsQ0FBQyxDQUFDO29CQUNoRSxDQUFDO29CQUNELFNBQVMsSUFBSSxhQUFhLEdBQUcsT0FBTyxDQUFDO29CQUNyQyxNQUFNLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLGFBQWEsR0FBRyxPQUFPLENBQUMsQ0FBQztvQkFDakQsS0FBSyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsYUFBYSxHQUFHLE9BQU8sQ0FBQyxDQUFDO29CQUNoRCxhQUFhLEdBQUcsS0FBSyxDQUFDLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUN2QyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQ2hFLE9BQU8sR0FBRyxJQUFJLENBQUM7Z0JBQ25CLENBQUM7YUFDSjs7Ozs7Ozs7OztJQUNMLENBQUM7Q0FBQSIsImZpbGUiOiJpcGMvcmVhZGVyL25vZGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgUEFERElORyB9IGZyb20gJy4uL21hZ2ljJztcbmltcG9ydCB7IGZsYXRidWZmZXJzIH0gZnJvbSAnZmxhdGJ1ZmZlcnMnO1xuaW1wb3J0ICogYXMgTWVzc2FnZV8gZnJvbSAnLi4vLi4vZmIvTWVzc2FnZSc7XG5pbXBvcnQgQnl0ZUJ1ZmZlciA9IGZsYXRidWZmZXJzLkJ5dGVCdWZmZXI7XG5pbXBvcnQgX01lc3NhZ2UgPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTWVzc2FnZTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uKiBmcm9tTm9kZVN0cmVhbShzdHJlYW06IE5vZGVKUy5SZWFkYWJsZVN0cmVhbSkge1xuXG4gICAgbGV0IGJiOiBCeXRlQnVmZmVyO1xuICAgIGxldCBieXRlc1JlYWQgPSAwLCBieXRlcyA9IG5ldyBVaW50OEFycmF5KDApO1xuICAgIGxldCBtZXNzYWdlTGVuZ3RoID0gMCwgbWVzc2FnZTogX01lc3NhZ2UgfCBudWxsID0gbnVsbDtcblxuICAgIGZvciBhd2FpdCAobGV0IGNodW5rIG9mIChzdHJlYW0gYXMgYW55IGFzIEFzeW5jSXRlcmFibGU8VWludDhBcnJheSB8IEJ1ZmZlciB8IHN0cmluZz4pKSB7XG5cbiAgICAgICAgY29uc3QgZ3Jvd24gPSBuZXcgVWludDhBcnJheShieXRlcy5ieXRlTGVuZ3RoICsgY2h1bmsubGVuZ3RoKTtcblxuICAgICAgICBpZiAodHlwZW9mIGNodW5rICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgZ3Jvd24uc2V0KGJ5dGVzLCAwKSB8fCBncm93bi5zZXQoY2h1bmssIGJ5dGVzLmJ5dGVMZW5ndGgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IC0xLCBqID0gYnl0ZXMuYnl0ZUxlbmd0aCwgbiA9IGNodW5rLmxlbmd0aDsgKytpIDwgbjspIHtcbiAgICAgICAgICAgICAgICBncm93bltpICsgal0gPSBjaHVuay5jaGFyQ29kZUF0KGkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgYnl0ZXMgPSBncm93bjtcblxuICAgICAgICBpZiAobWVzc2FnZUxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICBtZXNzYWdlTGVuZ3RoID0gbmV3IERhdGFWaWV3KGJ5dGVzLmJ1ZmZlcikuZ2V0SW50MzIoMCwgdHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICB3aGlsZSAobWVzc2FnZUxlbmd0aCA8IGJ5dGVzLmJ5dGVMZW5ndGgpIHtcbiAgICAgICAgICAgIGlmICghbWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIChiYiA9IG5ldyBCeXRlQnVmZmVyKGJ5dGVzKSkuc2V0UG9zaXRpb24oNCk7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UgPSBfTWVzc2FnZS5nZXRSb290QXNNZXNzYWdlKGJiKSkge1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlTGVuZ3RoICs9IG1lc3NhZ2UuYm9keUxlbmd0aCgpLmxvdztcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBtZXNzYWdlIGF0IHBvc2l0aW9uICR7Ynl0ZXNSZWFkfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnl0ZXNSZWFkICs9IG1lc3NhZ2VMZW5ndGggKyBQQURESU5HO1xuICAgICAgICAgICAgeWllbGQgYnl0ZXMuc3ViYXJyYXkoMCwgbWVzc2FnZUxlbmd0aCArIFBBRERJTkcpO1xuICAgICAgICAgICAgYnl0ZXMgPSBieXRlcy5zdWJhcnJheShtZXNzYWdlTGVuZ3RoICsgUEFERElORyk7XG4gICAgICAgICAgICBtZXNzYWdlTGVuZ3RoID0gYnl0ZXMuYnl0ZUxlbmd0aCA8PSAwID8gMCA6XG4gICAgICAgICAgICAgICAgbmV3IERhdGFWaWV3KGJ5dGVzLmJ1ZmZlcikuZ2V0SW50MzIoYnl0ZXMuYnl0ZU9mZnNldCwgdHJ1ZSk7XG4gICAgICAgICAgICBtZXNzYWdlID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbn1cbiJdfQ==

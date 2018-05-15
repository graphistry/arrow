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
                // If we're reading in an Arrow File, just concatenate the bytes until
                // the file is fully read in
                if (magic_1.checkForMagicArrowString(bytes)) {
                    if (!magic_1.isValidArrowFile(new ByteBuffer(bytes))) {
                        continue;
                    }
                    return yield bytes;
                }
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
exports.fromReadableStream = fromReadableStream;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUM1QyxFQUFFLENBQUMsQ0FBQyxPQUFPLEdBQUcsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDMUMsYUFBYSxJQUFJLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxHQUFHLENBQUM7NEJBQzFDLFFBQVEsQ0FBQzt3QkFDYixDQUFDO3dCQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsK0JBQStCLFNBQVMsRUFBRSxDQUFDLENBQUM7b0JBQ2hFLENBQUM7b0JBQ0QsU0FBUyxJQUFJLGFBQWEsR0FBRyxlQUFPLENBQUM7b0JBQ3JDLE1BQU0sS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsYUFBYSxHQUFHLGVBQU8sQ0FBQyxDQUFDO29CQUNqRCxLQUFLLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEdBQUcsZUFBTyxDQUFDLENBQUM7b0JBQ2hELGFBQWEsR0FBRyxLQUFLLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ3ZDLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDaEUsT0FBTyxHQUFHLElBQUksQ0FBQztnQkFDbkIsQ0FBQzthQUNKOzs7Ozs7Ozs7O0lBQ0wsQ0FBQztDQUFBO0FBbERELGdEQWtEQyIsImZpbGUiOiJpcGMvcmVhZGVyL25vZGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgZmxhdGJ1ZmZlcnMgfSBmcm9tICdmbGF0YnVmZmVycyc7XG5pbXBvcnQgKiBhcyBNZXNzYWdlXyBmcm9tICcuLi8uLi9mYi9NZXNzYWdlJztcbmltcG9ydCBCeXRlQnVmZmVyID0gZmxhdGJ1ZmZlcnMuQnl0ZUJ1ZmZlcjtcbmltcG9ydCBfTWVzc2FnZSA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NZXNzYWdlO1xuaW1wb3J0IHsgUEFERElORywgaXNWYWxpZEFycm93RmlsZSwgY2hlY2tGb3JNYWdpY0Fycm93U3RyaW5nIH0gZnJvbSAnLi4vbWFnaWMnO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24qIGZyb21SZWFkYWJsZVN0cmVhbShzdHJlYW06IE5vZGVKUy5SZWFkYWJsZVN0cmVhbSkge1xuXG4gICAgbGV0IGJiOiBCeXRlQnVmZmVyO1xuICAgIGxldCBieXRlc1JlYWQgPSAwLCBieXRlcyA9IG5ldyBVaW50OEFycmF5KDApO1xuICAgIGxldCBtZXNzYWdlTGVuZ3RoID0gMCwgbWVzc2FnZTogX01lc3NhZ2UgfCBudWxsID0gbnVsbDtcblxuICAgIGZvciBhd2FpdCAobGV0IGNodW5rIG9mIChzdHJlYW0gYXMgYW55IGFzIEFzeW5jSXRlcmFibGU8VWludDhBcnJheSB8IEJ1ZmZlciB8IHN0cmluZz4pKSB7XG5cbiAgICAgICAgY29uc3QgZ3Jvd24gPSBuZXcgVWludDhBcnJheShieXRlcy5ieXRlTGVuZ3RoICsgY2h1bmsubGVuZ3RoKTtcblxuICAgICAgICBpZiAodHlwZW9mIGNodW5rICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgZ3Jvd24uc2V0KGJ5dGVzLCAwKSB8fCBncm93bi5zZXQoY2h1bmssIGJ5dGVzLmJ5dGVMZW5ndGgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IC0xLCBqID0gYnl0ZXMuYnl0ZUxlbmd0aCwgbiA9IGNodW5rLmxlbmd0aDsgKytpIDwgbjspIHtcbiAgICAgICAgICAgICAgICBncm93bltpICsgal0gPSBjaHVuay5jaGFyQ29kZUF0KGkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgYnl0ZXMgPSBncm93bjtcblxuICAgICAgICAvLyBJZiB3ZSdyZSByZWFkaW5nIGluIGFuIEFycm93IEZpbGUsIGp1c3QgY29uY2F0ZW5hdGUgdGhlIGJ5dGVzIHVudGlsXG4gICAgICAgIC8vIHRoZSBmaWxlIGlzIGZ1bGx5IHJlYWQgaW5cbiAgICAgICAgaWYgKGNoZWNrRm9yTWFnaWNBcnJvd1N0cmluZyhieXRlcykpIHtcbiAgICAgICAgICAgIGlmICghaXNWYWxpZEFycm93RmlsZShuZXcgQnl0ZUJ1ZmZlcihieXRlcykpKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4geWllbGQgYnl0ZXM7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWVzc2FnZUxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICBtZXNzYWdlTGVuZ3RoID0gbmV3IERhdGFWaWV3KGJ5dGVzLmJ1ZmZlcikuZ2V0SW50MzIoMCwgdHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICB3aGlsZSAobWVzc2FnZUxlbmd0aCA8IGJ5dGVzLmJ5dGVMZW5ndGgpIHtcbiAgICAgICAgICAgIGlmICghbWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIChiYiA9IG5ldyBCeXRlQnVmZmVyKGJ5dGVzKSkuc2V0UG9zaXRpb24oNCk7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UgPSBfTWVzc2FnZS5nZXRSb290QXNNZXNzYWdlKGJiKSkge1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlTGVuZ3RoICs9IG1lc3NhZ2UuYm9keUxlbmd0aCgpLmxvdztcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBtZXNzYWdlIGF0IHBvc2l0aW9uICR7Ynl0ZXNSZWFkfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnl0ZXNSZWFkICs9IG1lc3NhZ2VMZW5ndGggKyBQQURESU5HO1xuICAgICAgICAgICAgeWllbGQgYnl0ZXMuc3ViYXJyYXkoMCwgbWVzc2FnZUxlbmd0aCArIFBBRERJTkcpO1xuICAgICAgICAgICAgYnl0ZXMgPSBieXRlcy5zdWJhcnJheShtZXNzYWdlTGVuZ3RoICsgUEFERElORyk7XG4gICAgICAgICAgICBtZXNzYWdlTGVuZ3RoID0gYnl0ZXMuYnl0ZUxlbmd0aCA8PSAwID8gMCA6XG4gICAgICAgICAgICAgICAgbmV3IERhdGFWaWV3KGJ5dGVzLmJ1ZmZlcikuZ2V0SW50MzIoYnl0ZXMuYnl0ZU9mZnNldCwgdHJ1ZSk7XG4gICAgICAgICAgICBtZXNzYWdlID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbn1cbiJdfQ==

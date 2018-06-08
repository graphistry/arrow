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
import { flatbuffers } from 'flatbuffers';
import * as Message_ from '../../fb/Message';
var ByteBuffer = flatbuffers.ByteBuffer;
var _Message = Message_.org.apache.arrow.flatbuf.Message;
import { PADDING, isValidArrowFile, checkForMagicArrowString } from '../magic';
export function fromReadableStream(stream) {
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
                if (checkForMagicArrowString(bytes)) {
                    if (!isValidArrowFile(new ByteBuffer(bytes))) {
                        continue;
                    }
                    return yield bytes;
                }
                if (bytes.byteLength > 0 && messageLength <= 0) {
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
                    messageLength = bytes.byteLength < 4 ? 0 :
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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RSxDQUFDO29CQUN0QyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7d0JBQ1gsQ0FBQyxFQUFFLEdBQUcsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQzVDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUMxQyxhQUFhLElBQUksT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLEdBQUcsQ0FBQzs0QkFDMUMsUUFBUSxDQUFDO3dCQUNiLENBQUM7d0JBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsU0FBUyxFQUFFLENBQUMsQ0FBQztvQkFDaEUsQ0FBQztvQkFDRCxTQUFTLElBQUksYUFBYSxHQUFHLE9BQU8sQ0FBQztvQkFDckMsTUFBTSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxhQUFhLEdBQUcsT0FBTyxDQUFDLENBQUM7b0JBQ2pELEtBQUssR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQWEsR0FBRyxPQUFPLENBQUMsQ0FBQztvQkFDaEQsYUFBYSxHQUFHLEtBQUssQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDdEMsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUNoRSxPQUFPLEdBQUcsSUFBSSxDQUFDO2dCQUNuQixDQUFDO2FBQ0o7Ozs7Ozs7Ozs7SUFDTCxDQUFDO0NBQUEiLCJmaWxlIjoiaXBjL3JlYWRlci9ub2RlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IGZsYXRidWZmZXJzIH0gZnJvbSAnZmxhdGJ1ZmZlcnMnO1xuaW1wb3J0ICogYXMgTWVzc2FnZV8gZnJvbSAnLi4vLi4vZmIvTWVzc2FnZSc7XG5pbXBvcnQgQnl0ZUJ1ZmZlciA9IGZsYXRidWZmZXJzLkJ5dGVCdWZmZXI7XG5pbXBvcnQgX01lc3NhZ2UgPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTWVzc2FnZTtcbmltcG9ydCB7IFBBRERJTkcsIGlzVmFsaWRBcnJvd0ZpbGUsIGNoZWNrRm9yTWFnaWNBcnJvd1N0cmluZyB9IGZyb20gJy4uL21hZ2ljJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uKiBmcm9tUmVhZGFibGVTdHJlYW0oc3RyZWFtOiBOb2RlSlMuUmVhZGFibGVTdHJlYW0pIHtcblxuICAgIGxldCBiYjogQnl0ZUJ1ZmZlcjtcbiAgICBsZXQgYnl0ZXNSZWFkID0gMCwgYnl0ZXMgPSBuZXcgVWludDhBcnJheSgwKTtcbiAgICBsZXQgbWVzc2FnZUxlbmd0aCA9IDAsIG1lc3NhZ2U6IF9NZXNzYWdlIHwgbnVsbCA9IG51bGw7XG5cbiAgICBmb3IgYXdhaXQgKGxldCBjaHVuayBvZiAoc3RyZWFtIGFzIGFueSBhcyBBc3luY0l0ZXJhYmxlPFVpbnQ4QXJyYXkgfCBCdWZmZXIgfCBzdHJpbmc+KSkge1xuXG4gICAgICAgIGNvbnN0IGdyb3duID0gbmV3IFVpbnQ4QXJyYXkoYnl0ZXMuYnl0ZUxlbmd0aCArIGNodW5rLmxlbmd0aCk7XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjaHVuayAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGdyb3duLnNldChieXRlcywgMCkgfHwgZ3Jvd24uc2V0KGNodW5rLCBieXRlcy5ieXRlTGVuZ3RoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAtMSwgaiA9IGJ5dGVzLmJ5dGVMZW5ndGgsIG4gPSBjaHVuay5sZW5ndGg7ICsraSA8IG47KSB7XG4gICAgICAgICAgICAgICAgZ3Jvd25baSArIGpdID0gY2h1bmsuY2hhckNvZGVBdChpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGJ5dGVzID0gZ3Jvd247XG5cbiAgICAgICAgLy8gSWYgd2UncmUgcmVhZGluZyBpbiBhbiBBcnJvdyBGaWxlLCBqdXN0IGNvbmNhdGVuYXRlIHRoZSBieXRlcyB1bnRpbFxuICAgICAgICAvLyB0aGUgZmlsZSBpcyBmdWxseSByZWFkIGluXG4gICAgICAgIGlmIChjaGVja0Zvck1hZ2ljQXJyb3dTdHJpbmcoYnl0ZXMpKSB7XG4gICAgICAgICAgICBpZiAoIWlzVmFsaWRBcnJvd0ZpbGUobmV3IEJ5dGVCdWZmZXIoYnl0ZXMpKSkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHlpZWxkIGJ5dGVzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGJ5dGVzLmJ5dGVMZW5ndGggPiAwICYmIG1lc3NhZ2VMZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgbWVzc2FnZUxlbmd0aCA9IG5ldyBEYXRhVmlldyhieXRlcy5idWZmZXIpLmdldEludDMyKDAsIHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgd2hpbGUgKG1lc3NhZ2VMZW5ndGggPCBieXRlcy5ieXRlTGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAoIW1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAoYmIgPSBuZXcgQnl0ZUJ1ZmZlcihieXRlcykpLnNldFBvc2l0aW9uKDQpO1xuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlID0gX01lc3NhZ2UuZ2V0Um9vdEFzTWVzc2FnZShiYikpIHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZUxlbmd0aCArPSBtZXNzYWdlLmJvZHlMZW5ndGgoKS5sb3c7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgbWVzc2FnZSBhdCBwb3NpdGlvbiAke2J5dGVzUmVhZH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJ5dGVzUmVhZCArPSBtZXNzYWdlTGVuZ3RoICsgUEFERElORztcbiAgICAgICAgICAgIHlpZWxkIGJ5dGVzLnN1YmFycmF5KDAsIG1lc3NhZ2VMZW5ndGggKyBQQURESU5HKTtcbiAgICAgICAgICAgIGJ5dGVzID0gYnl0ZXMuc3ViYXJyYXkobWVzc2FnZUxlbmd0aCArIFBBRERJTkcpO1xuICAgICAgICAgICAgbWVzc2FnZUxlbmd0aCA9IGJ5dGVzLmJ5dGVMZW5ndGggPCA0ID8gMCA6XG4gICAgICAgICAgICAgICAgbmV3IERhdGFWaWV3KGJ5dGVzLmJ1ZmZlcikuZ2V0SW50MzIoYnl0ZXMuYnl0ZU9mZnNldCwgdHJ1ZSk7XG4gICAgICAgICAgICBtZXNzYWdlID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbn1cbiJdfQ==

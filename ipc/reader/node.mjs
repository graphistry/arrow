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
                if (checkForMagicArrowString(bytes)) {
                    if (!isValidArrowFile(new ByteBuffer(bytes))) {
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
                    bytesRead += messageLength + PADDING;
                    yield yield tslib_1.__await(bytes.subarray(0, messageLength + PADDING));
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
                if (_c && !_c.done && (_a = _b.return)) yield tslib_1.__await(_a.call(_b));
            }
            finally { if (e_1) throw e_1.error; }
        }
    });
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQzVDLElBQUksT0FBTyxHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsRUFBRTs0QkFDekMsYUFBYSxJQUFJLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxHQUFHLENBQUM7NEJBQzFDLFNBQVM7eUJBQ1o7d0JBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsU0FBUyxFQUFFLENBQUMsQ0FBQztxQkFDL0Q7b0JBQ0QsU0FBUyxJQUFJLGFBQWEsR0FBRyxPQUFPLENBQUM7b0JBQ3JDLDRCQUFNLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLGFBQWEsR0FBRyxPQUFPLENBQUMsQ0FBQSxDQUFDO29CQUNqRCxLQUFLLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEdBQUcsT0FBTyxDQUFDLENBQUM7b0JBQ2hELGFBQWEsR0FBRyxLQUFLLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ3RDLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDaEUsT0FBTyxHQUFHLElBQUksQ0FBQztpQkFDbEI7YUFDSjs7Ozs7Ozs7O0lBQ0wsQ0FBQztDQUFBIiwiZmlsZSI6ImlwYy9yZWFkZXIvbm9kZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBmbGF0YnVmZmVycyB9IGZyb20gJ2ZsYXRidWZmZXJzJztcbmltcG9ydCAqIGFzIE1lc3NhZ2VfIGZyb20gJy4uLy4uL2ZiL01lc3NhZ2UnO1xuaW1wb3J0IEJ5dGVCdWZmZXIgPSBmbGF0YnVmZmVycy5CeXRlQnVmZmVyO1xuaW1wb3J0IF9NZXNzYWdlID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk1lc3NhZ2U7XG5pbXBvcnQgeyBQQURESU5HLCBpc1ZhbGlkQXJyb3dGaWxlLCBjaGVja0Zvck1hZ2ljQXJyb3dTdHJpbmcgfSBmcm9tICcuLi9tYWdpYyc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiogZnJvbVJlYWRhYmxlU3RyZWFtKHN0cmVhbTogTm9kZUpTLlJlYWRhYmxlU3RyZWFtKSB7XG5cbiAgICBsZXQgYmI6IEJ5dGVCdWZmZXI7XG4gICAgbGV0IGJ5dGVzUmVhZCA9IDAsIGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoMCk7XG4gICAgbGV0IG1lc3NhZ2VMZW5ndGggPSAwLCBtZXNzYWdlOiBfTWVzc2FnZSB8IG51bGwgPSBudWxsO1xuXG4gICAgZm9yIGF3YWl0IChsZXQgY2h1bmsgb2YgKHN0cmVhbSBhcyBhbnkgYXMgQXN5bmNJdGVyYWJsZTxVaW50OEFycmF5IHwgQnVmZmVyIHwgc3RyaW5nPikpIHtcblxuICAgICAgICBpZiAoY2h1bmsgPT0gbnVsbCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBncm93biA9IG5ldyBVaW50OEFycmF5KGJ5dGVzLmJ5dGVMZW5ndGggKyBjaHVuay5sZW5ndGgpO1xuXG4gICAgICAgIGlmICh0eXBlb2YgY2h1bmsgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBncm93bi5zZXQoYnl0ZXMsIDApIHx8IGdyb3duLnNldChjaHVuaywgYnl0ZXMuYnl0ZUxlbmd0aCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gLTEsIGogPSBieXRlcy5ieXRlTGVuZ3RoLCBuID0gY2h1bmsubGVuZ3RoOyArK2kgPCBuOykge1xuICAgICAgICAgICAgICAgIGdyb3duW2kgKyBqXSA9IGNodW5rLmNoYXJDb2RlQXQoaSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBieXRlcyA9IGdyb3duO1xuXG4gICAgICAgIC8vIElmIHdlJ3JlIHJlYWRpbmcgaW4gYW4gQXJyb3cgRmlsZSwganVzdCBjb25jYXRlbmF0ZSB0aGUgYnl0ZXMgdW50aWxcbiAgICAgICAgLy8gdGhlIGZpbGUgaXMgZnVsbHkgcmVhZCBpblxuICAgICAgICBpZiAoY2hlY2tGb3JNYWdpY0Fycm93U3RyaW5nKGJ5dGVzKSkge1xuICAgICAgICAgICAgaWYgKCFpc1ZhbGlkQXJyb3dGaWxlKG5ldyBCeXRlQnVmZmVyKGJ5dGVzKSkpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB5aWVsZCBieXRlcztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChieXRlcy5ieXRlTGVuZ3RoID4gMCAmJiBtZXNzYWdlTGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIG1lc3NhZ2VMZW5ndGggPSBuZXcgRGF0YVZpZXcoYnl0ZXMuYnVmZmVyKS5nZXRJbnQzMigwLCB0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHdoaWxlIChtZXNzYWdlTGVuZ3RoID4gMCAmJiBtZXNzYWdlTGVuZ3RoIDw9IGJ5dGVzLmJ5dGVMZW5ndGgpIHtcbiAgICAgICAgICAgIGlmICghbWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIChiYiA9IG5ldyBCeXRlQnVmZmVyKGJ5dGVzKSkuc2V0UG9zaXRpb24oNCk7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UgPSBfTWVzc2FnZS5nZXRSb290QXNNZXNzYWdlKGJiKSkge1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlTGVuZ3RoICs9IG1lc3NhZ2UuYm9keUxlbmd0aCgpLmxvdztcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBtZXNzYWdlIGF0IHBvc2l0aW9uICR7Ynl0ZXNSZWFkfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnl0ZXNSZWFkICs9IG1lc3NhZ2VMZW5ndGggKyBQQURESU5HO1xuICAgICAgICAgICAgeWllbGQgYnl0ZXMuc3ViYXJyYXkoMCwgbWVzc2FnZUxlbmd0aCArIFBBRERJTkcpO1xuICAgICAgICAgICAgYnl0ZXMgPSBieXRlcy5zdWJhcnJheShtZXNzYWdlTGVuZ3RoICsgUEFERElORyk7XG4gICAgICAgICAgICBtZXNzYWdlTGVuZ3RoID0gYnl0ZXMuYnl0ZUxlbmd0aCA8IDQgPyAwIDpcbiAgICAgICAgICAgICAgICBuZXcgRGF0YVZpZXcoYnl0ZXMuYnVmZmVyKS5nZXRJbnQzMihieXRlcy5ieXRlT2Zmc2V0LCB0cnVlKTtcbiAgICAgICAgICAgIG1lc3NhZ2UgPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxufVxuIl19

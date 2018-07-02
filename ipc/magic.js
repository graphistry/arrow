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
exports.PADDING = 4;
exports.MAGIC_STR = 'ARROW1';
exports.MAGIC = new Uint8Array(exports.MAGIC_STR.length);
for (let i = 0; i < exports.MAGIC_STR.length; i += 1 | 0) {
    exports.MAGIC[i] = exports.MAGIC_STR.charCodeAt(i);
}
function checkForMagicArrowString(buffer, index = 0) {
    for (let i = -1, n = exports.MAGIC.length; ++i < n;) {
        if (exports.MAGIC[i] !== buffer[index + i]) {
            return false;
        }
    }
    return true;
}
exports.checkForMagicArrowString = checkForMagicArrowString;
function isValidArrowFile(bb) {
    let fileLength = bb.capacity(), footerLength, lengthOffset;
    if ((fileLength < exports.magicX2AndPadding /*                     Arrow buffer too small */) ||
        (!checkForMagicArrowString(bb.bytes(), 0) /*                        Missing magic start    */) ||
        (!checkForMagicArrowString(bb.bytes(), fileLength - exports.magicLength) /* Missing magic end      */) ||
        ( /*                                                    Invalid footer length  */(footerLength = bb.readInt32(lengthOffset = fileLength - exports.magicAndPadding)) < 1 &&
            (footerLength + lengthOffset > fileLength))) {
        return false;
    }
    return true;
}
exports.isValidArrowFile = isValidArrowFile;
exports.magicLength = exports.MAGIC.length;
exports.magicAndPadding = exports.magicLength + exports.PADDING;
exports.magicX2AndPadding = exports.magicLength * 2 + exports.PADDING;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlwYy9tYWdpYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsNkRBQTZEO0FBQzdELCtEQUErRDtBQUMvRCx3REFBd0Q7QUFDeEQsNkRBQTZEO0FBQzdELG9EQUFvRDtBQUNwRCw2REFBNkQ7QUFDN0QsNkRBQTZEO0FBQzdELEVBQUU7QUFDRiwrQ0FBK0M7QUFDL0MsRUFBRTtBQUNGLDZEQUE2RDtBQUM3RCw4REFBOEQ7QUFDOUQseURBQXlEO0FBQ3pELDREQUE0RDtBQUM1RCwwREFBMEQ7QUFDMUQscUJBQXFCOztBQUtSLFFBQUEsT0FBTyxHQUFHLENBQUMsQ0FBQztBQUNaLFFBQUEsU0FBUyxHQUFHLFFBQVEsQ0FBQztBQUNyQixRQUFBLEtBQUssR0FBRyxJQUFJLFVBQVUsQ0FBQyxpQkFBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRXRELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxpQkFBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtJQUM5QyxhQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsaUJBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDdEM7QUFFRCxrQ0FBeUMsTUFBa0IsRUFBRSxLQUFLLEdBQUcsQ0FBQztJQUNsRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxhQUFLLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRztRQUN6QyxJQUFJLGFBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxFQUFFO1lBQ2hDLE9BQU8sS0FBSyxDQUFDO1NBQ2hCO0tBQ0o7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNoQixDQUFDO0FBUEQsNERBT0M7QUFFRCwwQkFBaUMsRUFBYztJQUMzQyxJQUFJLFVBQVUsR0FBRyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUUsWUFBb0IsRUFBRSxZQUFvQixDQUFDO0lBQzNFLElBQUksQ0FBQyxVQUFVLEdBQUcseUJBQWlCLENBQUMsZ0RBQWdELENBQUM7UUFDakYsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxtREFBbUQsQ0FBQztRQUM5RixDQUFDLENBQUMsd0JBQXdCLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLFVBQVUsR0FBRyxtQkFBVyxDQUFDLENBQUMsNEJBQTRCLENBQUM7UUFDOUYsRUFBQywrRUFDRCxDQUFDLFlBQVksR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLFlBQVksR0FBRyxVQUFVLEdBQUcsdUJBQWUsQ0FBQyxDQUFDLEdBQUcsQ0FBQztZQUM5RSxDQUFDLFlBQVksR0FBRyxZQUFZLEdBQUcsVUFBVSxDQUFDLENBQUMsRUFBRTtRQUM3QyxPQUFPLEtBQUssQ0FBQztLQUNoQjtJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2hCLENBQUM7QUFYRCw0Q0FXQztBQUVZLFFBQUEsV0FBVyxHQUFHLGFBQUssQ0FBQyxNQUFNLENBQUM7QUFDM0IsUUFBQSxlQUFlLEdBQUcsbUJBQVcsR0FBRyxlQUFPLENBQUM7QUFDeEMsUUFBQSxpQkFBaUIsR0FBRyxtQkFBVyxHQUFHLENBQUMsR0FBRyxlQUFPLENBQUMiLCJmaWxlIjoiaXBjL21hZ2ljLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IGZsYXRidWZmZXJzIH0gZnJvbSAnZmxhdGJ1ZmZlcnMnO1xuaW1wb3J0IEJ5dGVCdWZmZXIgPSBmbGF0YnVmZmVycy5CeXRlQnVmZmVyO1xuXG5leHBvcnQgY29uc3QgUEFERElORyA9IDQ7XG5leHBvcnQgY29uc3QgTUFHSUNfU1RSID0gJ0FSUk9XMSc7XG5leHBvcnQgY29uc3QgTUFHSUMgPSBuZXcgVWludDhBcnJheShNQUdJQ19TVFIubGVuZ3RoKTtcblxuZm9yIChsZXQgaSA9IDA7IGkgPCBNQUdJQ19TVFIubGVuZ3RoOyBpICs9IDEgfCAwKSB7XG4gICAgTUFHSUNbaV0gPSBNQUdJQ19TVFIuY2hhckNvZGVBdChpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrRm9yTWFnaWNBcnJvd1N0cmluZyhidWZmZXI6IFVpbnQ4QXJyYXksIGluZGV4ID0gMCkge1xuICAgIGZvciAobGV0IGkgPSAtMSwgbiA9IE1BR0lDLmxlbmd0aDsgKytpIDwgbjspIHtcbiAgICAgICAgaWYgKE1BR0lDW2ldICE9PSBidWZmZXJbaW5kZXggKyBpXSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNWYWxpZEFycm93RmlsZShiYjogQnl0ZUJ1ZmZlcikge1xuICAgIGxldCBmaWxlTGVuZ3RoID0gYmIuY2FwYWNpdHkoKSwgZm9vdGVyTGVuZ3RoOiBudW1iZXIsIGxlbmd0aE9mZnNldDogbnVtYmVyO1xuICAgIGlmICgoZmlsZUxlbmd0aCA8IG1hZ2ljWDJBbmRQYWRkaW5nIC8qICAgICAgICAgICAgICAgICAgICAgQXJyb3cgYnVmZmVyIHRvbyBzbWFsbCAqLykgfHxcbiAgICAgICAgKCFjaGVja0Zvck1hZ2ljQXJyb3dTdHJpbmcoYmIuYnl0ZXMoKSwgMCkgLyogICAgICAgICAgICAgICAgICAgICAgICBNaXNzaW5nIG1hZ2ljIHN0YXJ0ICAgICovKSB8fFxuICAgICAgICAoIWNoZWNrRm9yTWFnaWNBcnJvd1N0cmluZyhiYi5ieXRlcygpLCBmaWxlTGVuZ3RoIC0gbWFnaWNMZW5ndGgpIC8qIE1pc3NpbmcgbWFnaWMgZW5kICAgICAgKi8pIHx8XG4gICAgICAgICgvKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJbnZhbGlkIGZvb3RlciBsZW5ndGggICovXG4gICAgICAgIChmb290ZXJMZW5ndGggPSBiYi5yZWFkSW50MzIobGVuZ3RoT2Zmc2V0ID0gZmlsZUxlbmd0aCAtIG1hZ2ljQW5kUGFkZGluZykpIDwgMSAmJlxuICAgICAgICAoZm9vdGVyTGVuZ3RoICsgbGVuZ3RoT2Zmc2V0ID4gZmlsZUxlbmd0aCkpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbmV4cG9ydCBjb25zdCBtYWdpY0xlbmd0aCA9IE1BR0lDLmxlbmd0aDtcbmV4cG9ydCBjb25zdCBtYWdpY0FuZFBhZGRpbmcgPSBtYWdpY0xlbmd0aCArIFBBRERJTkc7XG5leHBvcnQgY29uc3QgbWFnaWNYMkFuZFBhZGRpbmcgPSBtYWdpY0xlbmd0aCAqIDIgKyBQQURESU5HO1xuIl19

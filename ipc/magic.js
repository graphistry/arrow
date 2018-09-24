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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlwYy9tYWdpYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsNkRBQTZEO0FBQzdELCtEQUErRDtBQUMvRCx3REFBd0Q7QUFDeEQsNkRBQTZEO0FBQzdELG9EQUFvRDtBQUNwRCw2REFBNkQ7QUFDN0QsNkRBQTZEO0FBQzdELEVBQUU7QUFDRiwrQ0FBK0M7QUFDL0MsRUFBRTtBQUNGLDZEQUE2RDtBQUM3RCw4REFBOEQ7QUFDOUQseURBQXlEO0FBQ3pELDREQUE0RDtBQUM1RCwwREFBMEQ7QUFDMUQscUJBQXFCOztBQUtSLFFBQUEsT0FBTyxHQUFHLENBQUMsQ0FBQztBQUNaLFFBQUEsU0FBUyxHQUFHLFFBQVEsQ0FBQztBQUNyQixRQUFBLEtBQUssR0FBRyxJQUFJLFVBQVUsQ0FBQyxpQkFBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRXRELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxpQkFBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtJQUM5QyxhQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsaUJBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDdEM7QUFFRCxTQUFnQix3QkFBd0IsQ0FBQyxNQUFrQixFQUFFLEtBQUssR0FBRyxDQUFDO0lBQ2xFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGFBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHO1FBQ3pDLElBQUksYUFBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUU7WUFDaEMsT0FBTyxLQUFLLENBQUM7U0FDaEI7S0FDSjtJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2hCLENBQUM7QUFQRCw0REFPQztBQUVELFNBQWdCLGdCQUFnQixDQUFDLEVBQWM7SUFDM0MsSUFBSSxVQUFVLEdBQUcsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLFlBQW9CLEVBQUUsWUFBb0IsQ0FBQztJQUMzRSxJQUFJLENBQUMsVUFBVSxHQUFHLHlCQUFpQixDQUFDLGdEQUFnRCxDQUFDO1FBQ2pGLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsbURBQW1ELENBQUM7UUFDOUYsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxVQUFVLEdBQUcsbUJBQVcsQ0FBQyxDQUFDLDRCQUE0QixDQUFDO1FBQzlGLEVBQUMsK0VBQ0QsQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsVUFBVSxHQUFHLHVCQUFlLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFDOUUsQ0FBQyxZQUFZLEdBQUcsWUFBWSxHQUFHLFVBQVUsQ0FBQyxDQUFDLEVBQUU7UUFDN0MsT0FBTyxLQUFLLENBQUM7S0FDaEI7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNoQixDQUFDO0FBWEQsNENBV0M7QUFFWSxRQUFBLFdBQVcsR0FBRyxhQUFLLENBQUMsTUFBTSxDQUFDO0FBQzNCLFFBQUEsZUFBZSxHQUFHLG1CQUFXLEdBQUcsZUFBTyxDQUFDO0FBQ3hDLFFBQUEsaUJBQWlCLEdBQUcsbUJBQVcsR0FBRyxDQUFDLEdBQUcsZUFBTyxDQUFDIiwiZmlsZSI6ImlwYy9tYWdpYy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBmbGF0YnVmZmVycyB9IGZyb20gJ2ZsYXRidWZmZXJzJztcbmltcG9ydCBCeXRlQnVmZmVyID0gZmxhdGJ1ZmZlcnMuQnl0ZUJ1ZmZlcjtcblxuZXhwb3J0IGNvbnN0IFBBRERJTkcgPSA0O1xuZXhwb3J0IGNvbnN0IE1BR0lDX1NUUiA9ICdBUlJPVzEnO1xuZXhwb3J0IGNvbnN0IE1BR0lDID0gbmV3IFVpbnQ4QXJyYXkoTUFHSUNfU1RSLmxlbmd0aCk7XG5cbmZvciAobGV0IGkgPSAwOyBpIDwgTUFHSUNfU1RSLmxlbmd0aDsgaSArPSAxIHwgMCkge1xuICAgIE1BR0lDW2ldID0gTUFHSUNfU1RSLmNoYXJDb2RlQXQoaSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjaGVja0Zvck1hZ2ljQXJyb3dTdHJpbmcoYnVmZmVyOiBVaW50OEFycmF5LCBpbmRleCA9IDApIHtcbiAgICBmb3IgKGxldCBpID0gLTEsIG4gPSBNQUdJQy5sZW5ndGg7ICsraSA8IG47KSB7XG4gICAgICAgIGlmIChNQUdJQ1tpXSAhPT0gYnVmZmVyW2luZGV4ICsgaV0pIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVmFsaWRBcnJvd0ZpbGUoYmI6IEJ5dGVCdWZmZXIpIHtcbiAgICBsZXQgZmlsZUxlbmd0aCA9IGJiLmNhcGFjaXR5KCksIGZvb3Rlckxlbmd0aDogbnVtYmVyLCBsZW5ndGhPZmZzZXQ6IG51bWJlcjtcbiAgICBpZiAoKGZpbGVMZW5ndGggPCBtYWdpY1gyQW5kUGFkZGluZyAvKiAgICAgICAgICAgICAgICAgICAgIEFycm93IGJ1ZmZlciB0b28gc21hbGwgKi8pIHx8XG4gICAgICAgICghY2hlY2tGb3JNYWdpY0Fycm93U3RyaW5nKGJiLmJ5dGVzKCksIDApIC8qICAgICAgICAgICAgICAgICAgICAgICAgTWlzc2luZyBtYWdpYyBzdGFydCAgICAqLykgfHxcbiAgICAgICAgKCFjaGVja0Zvck1hZ2ljQXJyb3dTdHJpbmcoYmIuYnl0ZXMoKSwgZmlsZUxlbmd0aCAtIG1hZ2ljTGVuZ3RoKSAvKiBNaXNzaW5nIG1hZ2ljIGVuZCAgICAgICovKSB8fFxuICAgICAgICAoLyogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSW52YWxpZCBmb290ZXIgbGVuZ3RoICAqL1xuICAgICAgICAoZm9vdGVyTGVuZ3RoID0gYmIucmVhZEludDMyKGxlbmd0aE9mZnNldCA9IGZpbGVMZW5ndGggLSBtYWdpY0FuZFBhZGRpbmcpKSA8IDEgJiZcbiAgICAgICAgKGZvb3Rlckxlbmd0aCArIGxlbmd0aE9mZnNldCA+IGZpbGVMZW5ndGgpKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG5leHBvcnQgY29uc3QgbWFnaWNMZW5ndGggPSBNQUdJQy5sZW5ndGg7XG5leHBvcnQgY29uc3QgbWFnaWNBbmRQYWRkaW5nID0gbWFnaWNMZW5ndGggKyBQQURESU5HO1xuZXhwb3J0IGNvbnN0IG1hZ2ljWDJBbmRQYWRkaW5nID0gbWFnaWNMZW5ndGggKiAyICsgUEFERElORztcbiJdfQ==

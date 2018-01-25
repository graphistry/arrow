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
const vector_1 = require("../vector");
class ChunkedView {
    constructor(data) {
        this.chunkVectors = data.chunkVectors;
        this.chunkOffsets = data.chunkOffsets;
    }
    clone(data) {
        return new ChunkedView(data);
    }
    *[Symbol.iterator]() {
        for (const vector of this.chunkVectors) {
            yield* vector;
        }
    }
    getChildAt(index) {
        return index < 0 ? null
            : (this._children || (this._children = []))[index] ||
                (this._children[index] = vector_1.Vector.concat(...this.chunkVectors
                    .map((chunk) => chunk.getChildAt(index))));
    }
    isValid(index) {
        // binary search to find the child vector and value index offset (inlined for speed)
        let offsets = this.chunkOffsets, pos = 0;
        let lhs = 0, mid = 0, rhs = offsets.length - 1;
        while (index < offsets[rhs] && index >= (pos = offsets[lhs])) {
            if (lhs + 1 === rhs) {
                return this.chunkVectors[lhs].isValid(index - pos);
            }
            mid = lhs + ((rhs - lhs) / 2) | 0;
            index >= offsets[mid] ? (lhs = mid) : (rhs = mid);
        }
        return false;
    }
    get(index) {
        // binary search to find the child vector and value index offset (inlined for speed)
        let offsets = this.chunkOffsets, pos = 0;
        let lhs = 0, mid = 0, rhs = offsets.length - 1;
        while (index < offsets[rhs] && index >= (pos = offsets[lhs])) {
            if (lhs + 1 === rhs) {
                return this.chunkVectors[lhs].get(index - pos);
            }
            mid = lhs + ((rhs - lhs) / 2) | 0;
            index >= offsets[mid] ? (lhs = mid) : (rhs = mid);
        }
        return null;
    }
    set(index, value) {
        // binary search to find the child vector and value index offset (inlined for speed)
        let offsets = this.chunkOffsets, pos = 0;
        let lhs = 0, mid = 0, rhs = offsets.length - 1;
        while (index < offsets[rhs] && index >= (pos = offsets[lhs])) {
            if (lhs + 1 === rhs) {
                return this.chunkVectors[lhs].set(index - pos, value);
            }
            mid = lhs + ((rhs - lhs) / 2) | 0;
            index >= offsets[mid] ? (lhs = mid) : (rhs = mid);
        }
    }
    toArray() {
        const chunks = this.chunkVectors;
        const numChunks = chunks.length;
        if (numChunks === 1) {
            return chunks[0].toArray();
        }
        let sources = new Array(numChunks);
        let sourcesLen = 0, ArrayType = Array;
        for (let index = -1; ++index < numChunks;) {
            let source = chunks[index].toArray();
            sourcesLen += (sources[index] = source).length;
            if (ArrayType !== source.constructor) {
                ArrayType = source.constructor;
            }
        }
        let target = new ArrayType(sourcesLen);
        let setValues = ArrayType === Array ? arraySet : typedArraySet;
        for (let index = -1, offset = 0; ++index < numChunks;) {
            offset = setValues(sources[index], target, offset);
        }
        return target;
    }
}
exports.ChunkedView = ChunkedView;
function typedArraySet(source, target, index) {
    return target.set(source, index) || index + source.length;
}
function arraySet(source, target, index) {
    let dstIdx = index - 1, srcIdx = -1, srcLen = source.length;
    while (++srcIdx < srcLen) {
        target[++dstIdx] = source[srcIdx];
    }
    return dstIdx;
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QyxDQUFDO0lBQ0QsTUFBTSxDQUFDLE1BQU0sQ0FBQztBQUNsQixDQUFDIiwiZmlsZSI6InZlY3Rvci9jaHVua2VkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IENodW5rZWREYXRhIH0gZnJvbSAnLi4vZGF0YSc7XG5pbXBvcnQgeyBWaWV3LCBWZWN0b3IsIE5lc3RlZFZlY3RvciB9IGZyb20gJy4uL3ZlY3Rvcic7XG5pbXBvcnQgeyBEYXRhVHlwZSwgVHlwZWRBcnJheSwgSXRlcmFibGVBcnJheUxpa2UgfSBmcm9tICcuLi90eXBlJztcblxuZXhwb3J0IGNsYXNzIENodW5rZWRWaWV3PFQgZXh0ZW5kcyBEYXRhVHlwZT4gaW1wbGVtZW50cyBWaWV3PFQ+IHtcbiAgICBwdWJsaWMgY2h1bmtWZWN0b3JzOiBWZWN0b3I8VD5bXTtcbiAgICBwdWJsaWMgY2h1bmtPZmZzZXRzOiBVaW50MzJBcnJheTtcbiAgICBwcm90ZWN0ZWQgX2NoaWxkcmVuOiBWZWN0b3I8YW55PltdO1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IENodW5rZWREYXRhPFQ+KSB7XG4gICAgICAgIHRoaXMuY2h1bmtWZWN0b3JzID0gZGF0YS5jaHVua1ZlY3RvcnM7XG4gICAgICAgIHRoaXMuY2h1bmtPZmZzZXRzID0gZGF0YS5jaHVua09mZnNldHM7XG4gICAgfVxuICAgIHB1YmxpYyBjbG9uZShkYXRhOiBDaHVua2VkRGF0YTxUPik6IHRoaXMge1xuICAgICAgICByZXR1cm4gbmV3IENodW5rZWRWaWV3KGRhdGEpIGFzIHRoaXM7XG4gICAgfVxuICAgIHB1YmxpYyAqW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxUWydUVmFsdWUnXSB8IG51bGw+IHtcbiAgICAgICAgZm9yIChjb25zdCB2ZWN0b3Igb2YgdGhpcy5jaHVua1ZlY3RvcnMpIHtcbiAgICAgICAgICAgIHlpZWxkKiB2ZWN0b3I7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcHVibGljIGdldENoaWxkQXQ8UiBleHRlbmRzIERhdGFUeXBlID0gRGF0YVR5cGU+KGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgcmV0dXJuIGluZGV4IDwgMCA/IG51bGxcbiAgICAgICAgICAgIDogKHRoaXMuX2NoaWxkcmVuIHx8ICh0aGlzLl9jaGlsZHJlbiA9IFtdKSlbaW5kZXhdIHx8XG4gICAgICAgICAgICAgICh0aGlzLl9jaGlsZHJlbltpbmRleF0gPSBWZWN0b3IuY29uY2F0PFI+KFxuICAgICAgICAgICAgICAgICAgLi4uKDxhbnk+IHRoaXMuY2h1bmtWZWN0b3JzIGFzIE5lc3RlZFZlY3Rvcjxhbnk+W10pXG4gICAgICAgICAgICAgICAgICAgICAgICAgLm1hcCgoY2h1bmspID0+IGNodW5rLmdldENoaWxkQXQ8Uj4oaW5kZXgpKSkpO1xuICAgIH1cbiAgICBwdWJsaWMgaXNWYWxpZChpbmRleDogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgICAgIC8vIGJpbmFyeSBzZWFyY2ggdG8gZmluZCB0aGUgY2hpbGQgdmVjdG9yIGFuZCB2YWx1ZSBpbmRleCBvZmZzZXQgKGlubGluZWQgZm9yIHNwZWVkKVxuICAgICAgICBsZXQgb2Zmc2V0cyA9IHRoaXMuY2h1bmtPZmZzZXRzLCBwb3MgPSAwO1xuICAgICAgICBsZXQgbGhzID0gMCwgbWlkID0gMCwgcmhzID0gb2Zmc2V0cy5sZW5ndGggLSAxO1xuICAgICAgICB3aGlsZSAoaW5kZXggPCBvZmZzZXRzW3Joc10gJiYgaW5kZXggPj0gKHBvcyA9IG9mZnNldHNbbGhzXSkpIHtcbiAgICAgICAgICAgIGlmIChsaHMgKyAxID09PSByaHMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jaHVua1ZlY3RvcnNbbGhzXS5pc1ZhbGlkKGluZGV4IC0gcG9zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1pZCA9IGxocyArICgocmhzIC0gbGhzKSAvIDIpIHwgMDtcbiAgICAgICAgICAgIGluZGV4ID49IG9mZnNldHNbbWlkXSA/IChsaHMgPSBtaWQpIDogKHJocyA9IG1pZCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBwdWJsaWMgZ2V0KGluZGV4OiBudW1iZXIpOiBUWydUVmFsdWUnXSB8IG51bGwge1xuICAgICAgICAvLyBiaW5hcnkgc2VhcmNoIHRvIGZpbmQgdGhlIGNoaWxkIHZlY3RvciBhbmQgdmFsdWUgaW5kZXggb2Zmc2V0IChpbmxpbmVkIGZvciBzcGVlZClcbiAgICAgICAgbGV0IG9mZnNldHMgPSB0aGlzLmNodW5rT2Zmc2V0cywgcG9zID0gMDtcbiAgICAgICAgbGV0IGxocyA9IDAsIG1pZCA9IDAsIHJocyA9IG9mZnNldHMubGVuZ3RoIC0gMTtcbiAgICAgICAgd2hpbGUgKGluZGV4IDwgb2Zmc2V0c1tyaHNdICYmIGluZGV4ID49IChwb3MgPSBvZmZzZXRzW2xoc10pKSB7XG4gICAgICAgICAgICBpZiAobGhzICsgMSA9PT0gcmhzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2h1bmtWZWN0b3JzW2xoc10uZ2V0KGluZGV4IC0gcG9zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1pZCA9IGxocyArICgocmhzIC0gbGhzKSAvIDIpIHwgMDtcbiAgICAgICAgICAgIGluZGV4ID49IG9mZnNldHNbbWlkXSA/IChsaHMgPSBtaWQpIDogKHJocyA9IG1pZCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHB1YmxpYyBzZXQoaW5kZXg6IG51bWJlciwgdmFsdWU6IFRbJ1RWYWx1ZSddIHwgbnVsbCk6IHZvaWQge1xuICAgICAgICAvLyBiaW5hcnkgc2VhcmNoIHRvIGZpbmQgdGhlIGNoaWxkIHZlY3RvciBhbmQgdmFsdWUgaW5kZXggb2Zmc2V0IChpbmxpbmVkIGZvciBzcGVlZClcbiAgICAgICAgbGV0IG9mZnNldHMgPSB0aGlzLmNodW5rT2Zmc2V0cywgcG9zID0gMDtcbiAgICAgICAgbGV0IGxocyA9IDAsIG1pZCA9IDAsIHJocyA9IG9mZnNldHMubGVuZ3RoIC0gMTtcbiAgICAgICAgd2hpbGUgKGluZGV4IDwgb2Zmc2V0c1tyaHNdICYmIGluZGV4ID49IChwb3MgPSBvZmZzZXRzW2xoc10pKSB7XG4gICAgICAgICAgICBpZiAobGhzICsgMSA9PT0gcmhzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2h1bmtWZWN0b3JzW2xoc10uc2V0KGluZGV4IC0gcG9zLCB2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtaWQgPSBsaHMgKyAoKHJocyAtIGxocykgLyAyKSB8IDA7XG4gICAgICAgICAgICBpbmRleCA+PSBvZmZzZXRzW21pZF0gPyAobGhzID0gbWlkKSA6IChyaHMgPSBtaWQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHB1YmxpYyB0b0FycmF5KCk6IEl0ZXJhYmxlQXJyYXlMaWtlPFRbJ1RWYWx1ZSddIHwgbnVsbD4ge1xuICAgICAgICBjb25zdCBjaHVua3MgPSB0aGlzLmNodW5rVmVjdG9ycztcbiAgICAgICAgY29uc3QgbnVtQ2h1bmtzID0gY2h1bmtzLmxlbmd0aDtcbiAgICAgICAgaWYgKG51bUNodW5rcyA9PT0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIGNodW5rc1swXS50b0FycmF5KCk7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHNvdXJjZXMgPSBuZXcgQXJyYXk8YW55PihudW1DaHVua3MpO1xuICAgICAgICBsZXQgc291cmNlc0xlbiA9IDAsIEFycmF5VHlwZTogYW55ID0gQXJyYXk7XG4gICAgICAgIGZvciAobGV0IGluZGV4ID0gLTE7ICsraW5kZXggPCBudW1DaHVua3M7KSB7XG4gICAgICAgICAgICBsZXQgc291cmNlID0gY2h1bmtzW2luZGV4XS50b0FycmF5KCk7XG4gICAgICAgICAgICBzb3VyY2VzTGVuICs9IChzb3VyY2VzW2luZGV4XSA9IHNvdXJjZSkubGVuZ3RoO1xuICAgICAgICAgICAgaWYgKEFycmF5VHlwZSAhPT0gc291cmNlLmNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICAgICAgQXJyYXlUeXBlID0gc291cmNlLmNvbnN0cnVjdG9yO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGxldCB0YXJnZXQgPSBuZXcgQXJyYXlUeXBlKHNvdXJjZXNMZW4pO1xuICAgICAgICBsZXQgc2V0VmFsdWVzID0gQXJyYXlUeXBlID09PSBBcnJheSA/IGFycmF5U2V0IDogdHlwZWRBcnJheVNldCBhcyBhbnk7XG4gICAgICAgIGZvciAobGV0IGluZGV4ID0gLTEsIG9mZnNldCA9IDA7ICsraW5kZXggPCBudW1DaHVua3M7KSB7XG4gICAgICAgICAgICBvZmZzZXQgPSBzZXRWYWx1ZXMoc291cmNlc1tpbmRleF0sIHRhcmdldCwgb2Zmc2V0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH1cbn1cblxuZnVuY3Rpb24gdHlwZWRBcnJheVNldChzb3VyY2U6IFR5cGVkQXJyYXksIHRhcmdldDogVHlwZWRBcnJheSwgaW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiB0YXJnZXQuc2V0KHNvdXJjZSwgaW5kZXgpIHx8IGluZGV4ICsgc291cmNlLmxlbmd0aDtcbn1cblxuZnVuY3Rpb24gYXJyYXlTZXQoc291cmNlOiBhbnlbXSwgdGFyZ2V0OiBhbnlbXSwgaW5kZXg6IG51bWJlcikge1xuICAgIGxldCBkc3RJZHggPSBpbmRleCAtIDEsIHNyY0lkeCA9IC0xLCBzcmNMZW4gPSBzb3VyY2UubGVuZ3RoO1xuICAgIHdoaWxlICgrK3NyY0lkeCA8IHNyY0xlbikge1xuICAgICAgICB0YXJnZXRbKytkc3RJZHhdID0gc291cmNlW3NyY0lkeF07XG4gICAgfVxuICAgIHJldHVybiBkc3RJZHg7XG59XG4iXX0=

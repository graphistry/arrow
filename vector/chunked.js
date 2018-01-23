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
class ChunkedView {
    constructor(data) {
        this.chunks = data.childVectors;
        this.offsets = data.childOffsets;
    }
    clone(data) {
        return new ChunkedView(data);
    }
    *[Symbol.iterator]() {
        for (const vector of this.chunks) {
            yield* vector;
        }
    }
    isValid(index) {
        // binary search to find the child vector and value index offset (inlined for speed)
        let offsets = this.offsets, pos = 0;
        let lhs = 0, mid = 0, rhs = offsets.length - 1;
        while (index < offsets[rhs] && index >= (pos = offsets[lhs])) {
            if (lhs + 1 === rhs) {
                return this.chunks[lhs].isValid(index - pos);
            }
            mid = lhs + ((rhs - lhs) / 2) | 0;
            index >= offsets[mid] ? (lhs = mid) : (rhs = mid);
        }
        return false;
    }
    get(index) {
        // binary search to find the child vector and value index offset (inlined for speed)
        let offsets = this.offsets, pos = 0;
        let lhs = 0, mid = 0, rhs = offsets.length - 1;
        while (index < offsets[rhs] && index >= (pos = offsets[lhs])) {
            if (lhs + 1 === rhs) {
                return this.chunks[lhs].get(index - pos);
            }
            mid = lhs + ((rhs - lhs) / 2) | 0;
            index >= offsets[mid] ? (lhs = mid) : (rhs = mid);
        }
        return null;
    }
    set(index, value) {
        // binary search to find the child vector and value index offset (inlined for speed)
        let offsets = this.offsets, pos = 0;
        let lhs = 0, mid = 0, rhs = offsets.length - 1;
        while (index < offsets[rhs] && index >= (pos = offsets[lhs])) {
            if (lhs + 1 === rhs) {
                return this.chunks[lhs].set(index - pos, value);
            }
            mid = lhs + ((rhs - lhs) / 2) | 0;
            index >= offsets[mid] ? (lhs = mid) : (rhs = mid);
        }
    }
    toArray() {
        const chunks = this.chunks;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LENBQUM7WUFDcEQsTUFBTSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3ZELENBQUM7UUFDRCxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQ2xCLENBQUM7Q0FDSjtBQTNFRCxrQ0EyRUM7QUFFRCx1QkFBdUIsTUFBa0IsRUFBRSxNQUFrQixFQUFFLEtBQWE7SUFDeEUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxJQUFJLEtBQUssR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0FBQzlELENBQUM7QUFFRCxrQkFBa0IsTUFBYSxFQUFFLE1BQWEsRUFBRSxLQUFhO0lBQ3pELElBQUksTUFBTSxHQUFHLEtBQUssR0FBRyxDQUFDLEVBQUUsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUFFLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQzVELE9BQU8sRUFBRSxNQUFNLEdBQUcsTUFBTSxFQUFFLENBQUM7UUFDdkIsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFDRCxNQUFNLENBQUMsTUFBTSxDQUFDO0FBQ2xCLENBQUMiLCJmaWxlIjoidmVjdG9yL2NodW5rZWQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgQ2h1bmtlZERhdGEgfSBmcm9tICcuLi9kYXRhJztcbmltcG9ydCB7IFZpZXcsIFZlY3RvciB9IGZyb20gJy4uL3ZlY3Rvcic7XG5pbXBvcnQgeyBEYXRhVHlwZSwgVHlwZWRBcnJheSwgSXRlcmFibGVBcnJheUxpa2UgfSBmcm9tICcuLi90eXBlJztcblxuZXhwb3J0IGNsYXNzIENodW5rZWRWaWV3PFQgZXh0ZW5kcyBEYXRhVHlwZT4gaW1wbGVtZW50cyBWaWV3PFQ+IHtcbiAgICBwdWJsaWMgY2h1bmtzOiBWZWN0b3I8VD5bXTtcbiAgICBwdWJsaWMgb2Zmc2V0czogVWludDMyQXJyYXk7XG4gICAgY29uc3RydWN0b3IoZGF0YTogQ2h1bmtlZERhdGE8VD4pIHtcbiAgICAgICAgdGhpcy5jaHVua3MgPSBkYXRhLmNoaWxkVmVjdG9ycztcbiAgICAgICAgdGhpcy5vZmZzZXRzID0gZGF0YS5jaGlsZE9mZnNldHM7XG4gICAgfVxuICAgIHB1YmxpYyBjbG9uZShkYXRhOiBDaHVua2VkRGF0YTxUPik6IHRoaXMge1xuICAgICAgICByZXR1cm4gbmV3IENodW5rZWRWaWV3KGRhdGEpIGFzIHRoaXM7XG4gICAgfVxuICAgIHB1YmxpYyAqW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxUWydUVmFsdWUnXSB8IG51bGw+IHtcbiAgICAgICAgZm9yIChjb25zdCB2ZWN0b3Igb2YgdGhpcy5jaHVua3MpIHtcbiAgICAgICAgICAgIHlpZWxkKiB2ZWN0b3I7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcHVibGljIGlzVmFsaWQoaW5kZXg6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgICAgICAvLyBiaW5hcnkgc2VhcmNoIHRvIGZpbmQgdGhlIGNoaWxkIHZlY3RvciBhbmQgdmFsdWUgaW5kZXggb2Zmc2V0IChpbmxpbmVkIGZvciBzcGVlZClcbiAgICAgICAgbGV0IG9mZnNldHMgPSB0aGlzLm9mZnNldHMsIHBvcyA9IDA7XG4gICAgICAgIGxldCBsaHMgPSAwLCBtaWQgPSAwLCByaHMgPSBvZmZzZXRzLmxlbmd0aCAtIDE7XG4gICAgICAgIHdoaWxlIChpbmRleCA8IG9mZnNldHNbcmhzXSAmJiBpbmRleCA+PSAocG9zID0gb2Zmc2V0c1tsaHNdKSkge1xuICAgICAgICAgICAgaWYgKGxocyArIDEgPT09IHJocykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNodW5rc1tsaHNdLmlzVmFsaWQoaW5kZXggLSBwb3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWlkID0gbGhzICsgKChyaHMgLSBsaHMpIC8gMikgfCAwO1xuICAgICAgICAgICAgaW5kZXggPj0gb2Zmc2V0c1ttaWRdID8gKGxocyA9IG1pZCkgOiAocmhzID0gbWlkKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHB1YmxpYyBnZXQoaW5kZXg6IG51bWJlcik6IFRbJ1RWYWx1ZSddIHwgbnVsbCB7XG4gICAgICAgIC8vIGJpbmFyeSBzZWFyY2ggdG8gZmluZCB0aGUgY2hpbGQgdmVjdG9yIGFuZCB2YWx1ZSBpbmRleCBvZmZzZXQgKGlubGluZWQgZm9yIHNwZWVkKVxuICAgICAgICBsZXQgb2Zmc2V0cyA9IHRoaXMub2Zmc2V0cywgcG9zID0gMDtcbiAgICAgICAgbGV0IGxocyA9IDAsIG1pZCA9IDAsIHJocyA9IG9mZnNldHMubGVuZ3RoIC0gMTtcbiAgICAgICAgd2hpbGUgKGluZGV4IDwgb2Zmc2V0c1tyaHNdICYmIGluZGV4ID49IChwb3MgPSBvZmZzZXRzW2xoc10pKSB7XG4gICAgICAgICAgICBpZiAobGhzICsgMSA9PT0gcmhzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2h1bmtzW2xoc10uZ2V0KGluZGV4IC0gcG9zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1pZCA9IGxocyArICgocmhzIC0gbGhzKSAvIDIpIHwgMDtcbiAgICAgICAgICAgIGluZGV4ID49IG9mZnNldHNbbWlkXSA/IChsaHMgPSBtaWQpIDogKHJocyA9IG1pZCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHB1YmxpYyBzZXQoaW5kZXg6IG51bWJlciwgdmFsdWU6IFRbJ1RWYWx1ZSddIHwgbnVsbCk6IHZvaWQge1xuICAgICAgICAvLyBiaW5hcnkgc2VhcmNoIHRvIGZpbmQgdGhlIGNoaWxkIHZlY3RvciBhbmQgdmFsdWUgaW5kZXggb2Zmc2V0IChpbmxpbmVkIGZvciBzcGVlZClcbiAgICAgICAgbGV0IG9mZnNldHMgPSB0aGlzLm9mZnNldHMsIHBvcyA9IDA7XG4gICAgICAgIGxldCBsaHMgPSAwLCBtaWQgPSAwLCByaHMgPSBvZmZzZXRzLmxlbmd0aCAtIDE7XG4gICAgICAgIHdoaWxlIChpbmRleCA8IG9mZnNldHNbcmhzXSAmJiBpbmRleCA+PSAocG9zID0gb2Zmc2V0c1tsaHNdKSkge1xuICAgICAgICAgICAgaWYgKGxocyArIDEgPT09IHJocykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNodW5rc1tsaHNdLnNldChpbmRleCAtIHBvcywgdmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWlkID0gbGhzICsgKChyaHMgLSBsaHMpIC8gMikgfCAwO1xuICAgICAgICAgICAgaW5kZXggPj0gb2Zmc2V0c1ttaWRdID8gKGxocyA9IG1pZCkgOiAocmhzID0gbWlkKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBwdWJsaWMgdG9BcnJheSgpOiBJdGVyYWJsZUFycmF5TGlrZTxUWydUVmFsdWUnXSB8IG51bGw+IHtcbiAgICAgICAgY29uc3QgY2h1bmtzID0gdGhpcy5jaHVua3M7XG4gICAgICAgIGNvbnN0IG51bUNodW5rcyA9IGNodW5rcy5sZW5ndGg7XG4gICAgICAgIGlmIChudW1DaHVua3MgPT09IDEpIHtcbiAgICAgICAgICAgIHJldHVybiBjaHVua3NbMF0udG9BcnJheSgpO1xuICAgICAgICB9XG4gICAgICAgIGxldCBzb3VyY2VzID0gbmV3IEFycmF5PGFueT4obnVtQ2h1bmtzKTtcbiAgICAgICAgbGV0IHNvdXJjZXNMZW4gPSAwLCBBcnJheVR5cGU6IGFueSA9IEFycmF5O1xuICAgICAgICBmb3IgKGxldCBpbmRleCA9IC0xOyArK2luZGV4IDwgbnVtQ2h1bmtzOykge1xuICAgICAgICAgICAgbGV0IHNvdXJjZSA9IGNodW5rc1tpbmRleF0udG9BcnJheSgpO1xuICAgICAgICAgICAgc291cmNlc0xlbiArPSAoc291cmNlc1tpbmRleF0gPSBzb3VyY2UpLmxlbmd0aDtcbiAgICAgICAgICAgIGlmIChBcnJheVR5cGUgIT09IHNvdXJjZS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgICAgIEFycmF5VHlwZSA9IHNvdXJjZS5jb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBsZXQgdGFyZ2V0ID0gbmV3IEFycmF5VHlwZShzb3VyY2VzTGVuKTtcbiAgICAgICAgbGV0IHNldFZhbHVlcyA9IEFycmF5VHlwZSA9PT0gQXJyYXkgPyBhcnJheVNldCA6IHR5cGVkQXJyYXlTZXQgYXMgYW55O1xuICAgICAgICBmb3IgKGxldCBpbmRleCA9IC0xLCBvZmZzZXQgPSAwOyArK2luZGV4IDwgbnVtQ2h1bmtzOykge1xuICAgICAgICAgICAgb2Zmc2V0ID0gc2V0VmFsdWVzKHNvdXJjZXNbaW5kZXhdLCB0YXJnZXQsIG9mZnNldCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHR5cGVkQXJyYXlTZXQoc291cmNlOiBUeXBlZEFycmF5LCB0YXJnZXQ6IFR5cGVkQXJyYXksIGluZGV4OiBudW1iZXIpIHtcbiAgICByZXR1cm4gdGFyZ2V0LnNldChzb3VyY2UsIGluZGV4KSB8fCBpbmRleCArIHNvdXJjZS5sZW5ndGg7XG59XG5cbmZ1bmN0aW9uIGFycmF5U2V0KHNvdXJjZTogYW55W10sIHRhcmdldDogYW55W10sIGluZGV4OiBudW1iZXIpIHtcbiAgICBsZXQgZHN0SWR4ID0gaW5kZXggLSAxLCBzcmNJZHggPSAtMSwgc3JjTGVuID0gc291cmNlLmxlbmd0aDtcbiAgICB3aGlsZSAoKytzcmNJZHggPCBzcmNMZW4pIHtcbiAgICAgICAgdGFyZ2V0WysrZHN0SWR4XSA9IHNvdXJjZVtzcmNJZHhdO1xuICAgIH1cbiAgICByZXR1cm4gZHN0SWR4O1xufVxuIl19

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
import { Vector } from '../vector';
export class ChunkedView {
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
                (this._children[index] = Vector.concat(...this.chunkVectors
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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TUFBTSxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUNELE1BQU0sQ0FBQyxNQUFNLENBQUM7QUFDbEIsQ0FBQyIsImZpbGUiOiJ2ZWN0b3IvY2h1bmtlZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBDaHVua2VkRGF0YSB9IGZyb20gJy4uL2RhdGEnO1xuaW1wb3J0IHsgVmlldywgVmVjdG9yLCBOZXN0ZWRWZWN0b3IgfSBmcm9tICcuLi92ZWN0b3InO1xuaW1wb3J0IHsgRGF0YVR5cGUsIFR5cGVkQXJyYXksIEl0ZXJhYmxlQXJyYXlMaWtlIH0gZnJvbSAnLi4vdHlwZSc7XG5cbmV4cG9ydCBjbGFzcyBDaHVua2VkVmlldzxUIGV4dGVuZHMgRGF0YVR5cGU+IGltcGxlbWVudHMgVmlldzxUPiB7XG4gICAgcHVibGljIGNodW5rVmVjdG9yczogVmVjdG9yPFQ+W107XG4gICAgcHVibGljIGNodW5rT2Zmc2V0czogVWludDMyQXJyYXk7XG4gICAgcHJvdGVjdGVkIF9jaGlsZHJlbjogVmVjdG9yPGFueT5bXTtcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBDaHVua2VkRGF0YTxUPikge1xuICAgICAgICB0aGlzLmNodW5rVmVjdG9ycyA9IGRhdGEuY2h1bmtWZWN0b3JzO1xuICAgICAgICB0aGlzLmNodW5rT2Zmc2V0cyA9IGRhdGEuY2h1bmtPZmZzZXRzO1xuICAgIH1cbiAgICBwdWJsaWMgY2xvbmUoZGF0YTogQ2h1bmtlZERhdGE8VD4pOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIG5ldyBDaHVua2VkVmlldyhkYXRhKSBhcyB0aGlzO1xuICAgIH1cbiAgICBwdWJsaWMgKltTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VFsnVFZhbHVlJ10gfCBudWxsPiB7XG4gICAgICAgIGZvciAoY29uc3QgdmVjdG9yIG9mIHRoaXMuY2h1bmtWZWN0b3JzKSB7XG4gICAgICAgICAgICB5aWVsZCogdmVjdG9yO1xuICAgICAgICB9XG4gICAgfVxuICAgIHB1YmxpYyBnZXRDaGlsZEF0PFIgZXh0ZW5kcyBEYXRhVHlwZSA9IERhdGFUeXBlPihpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIHJldHVybiBpbmRleCA8IDAgPyBudWxsXG4gICAgICAgICAgICA6ICh0aGlzLl9jaGlsZHJlbiB8fCAodGhpcy5fY2hpbGRyZW4gPSBbXSkpW2luZGV4XSB8fFxuICAgICAgICAgICAgICAodGhpcy5fY2hpbGRyZW5baW5kZXhdID0gVmVjdG9yLmNvbmNhdDxSPihcbiAgICAgICAgICAgICAgICAgIC4uLig8YW55PiB0aGlzLmNodW5rVmVjdG9ycyBhcyBOZXN0ZWRWZWN0b3I8YW55PltdKVxuICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoKGNodW5rKSA9PiBjaHVuay5nZXRDaGlsZEF0PFI+KGluZGV4KSkpKTtcbiAgICB9XG4gICAgcHVibGljIGlzVmFsaWQoaW5kZXg6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgICAgICAvLyBiaW5hcnkgc2VhcmNoIHRvIGZpbmQgdGhlIGNoaWxkIHZlY3RvciBhbmQgdmFsdWUgaW5kZXggb2Zmc2V0IChpbmxpbmVkIGZvciBzcGVlZClcbiAgICAgICAgbGV0IG9mZnNldHMgPSB0aGlzLmNodW5rT2Zmc2V0cywgcG9zID0gMDtcbiAgICAgICAgbGV0IGxocyA9IDAsIG1pZCA9IDAsIHJocyA9IG9mZnNldHMubGVuZ3RoIC0gMTtcbiAgICAgICAgd2hpbGUgKGluZGV4IDwgb2Zmc2V0c1tyaHNdICYmIGluZGV4ID49IChwb3MgPSBvZmZzZXRzW2xoc10pKSB7XG4gICAgICAgICAgICBpZiAobGhzICsgMSA9PT0gcmhzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2h1bmtWZWN0b3JzW2xoc10uaXNWYWxpZChpbmRleCAtIHBvcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtaWQgPSBsaHMgKyAoKHJocyAtIGxocykgLyAyKSB8IDA7XG4gICAgICAgICAgICBpbmRleCA+PSBvZmZzZXRzW21pZF0gPyAobGhzID0gbWlkKSA6IChyaHMgPSBtaWQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcHVibGljIGdldChpbmRleDogbnVtYmVyKTogVFsnVFZhbHVlJ10gfCBudWxsIHtcbiAgICAgICAgLy8gYmluYXJ5IHNlYXJjaCB0byBmaW5kIHRoZSBjaGlsZCB2ZWN0b3IgYW5kIHZhbHVlIGluZGV4IG9mZnNldCAoaW5saW5lZCBmb3Igc3BlZWQpXG4gICAgICAgIGxldCBvZmZzZXRzID0gdGhpcy5jaHVua09mZnNldHMsIHBvcyA9IDA7XG4gICAgICAgIGxldCBsaHMgPSAwLCBtaWQgPSAwLCByaHMgPSBvZmZzZXRzLmxlbmd0aCAtIDE7XG4gICAgICAgIHdoaWxlIChpbmRleCA8IG9mZnNldHNbcmhzXSAmJiBpbmRleCA+PSAocG9zID0gb2Zmc2V0c1tsaHNdKSkge1xuICAgICAgICAgICAgaWYgKGxocyArIDEgPT09IHJocykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNodW5rVmVjdG9yc1tsaHNdLmdldChpbmRleCAtIHBvcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtaWQgPSBsaHMgKyAoKHJocyAtIGxocykgLyAyKSB8IDA7XG4gICAgICAgICAgICBpbmRleCA+PSBvZmZzZXRzW21pZF0gPyAobGhzID0gbWlkKSA6IChyaHMgPSBtaWQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBwdWJsaWMgc2V0KGluZGV4OiBudW1iZXIsIHZhbHVlOiBUWydUVmFsdWUnXSB8IG51bGwpOiB2b2lkIHtcbiAgICAgICAgLy8gYmluYXJ5IHNlYXJjaCB0byBmaW5kIHRoZSBjaGlsZCB2ZWN0b3IgYW5kIHZhbHVlIGluZGV4IG9mZnNldCAoaW5saW5lZCBmb3Igc3BlZWQpXG4gICAgICAgIGxldCBvZmZzZXRzID0gdGhpcy5jaHVua09mZnNldHMsIHBvcyA9IDA7XG4gICAgICAgIGxldCBsaHMgPSAwLCBtaWQgPSAwLCByaHMgPSBvZmZzZXRzLmxlbmd0aCAtIDE7XG4gICAgICAgIHdoaWxlIChpbmRleCA8IG9mZnNldHNbcmhzXSAmJiBpbmRleCA+PSAocG9zID0gb2Zmc2V0c1tsaHNdKSkge1xuICAgICAgICAgICAgaWYgKGxocyArIDEgPT09IHJocykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNodW5rVmVjdG9yc1tsaHNdLnNldChpbmRleCAtIHBvcywgdmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWlkID0gbGhzICsgKChyaHMgLSBsaHMpIC8gMikgfCAwO1xuICAgICAgICAgICAgaW5kZXggPj0gb2Zmc2V0c1ttaWRdID8gKGxocyA9IG1pZCkgOiAocmhzID0gbWlkKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBwdWJsaWMgdG9BcnJheSgpOiBJdGVyYWJsZUFycmF5TGlrZTxUWydUVmFsdWUnXSB8IG51bGw+IHtcbiAgICAgICAgY29uc3QgY2h1bmtzID0gdGhpcy5jaHVua1ZlY3RvcnM7XG4gICAgICAgIGNvbnN0IG51bUNodW5rcyA9IGNodW5rcy5sZW5ndGg7XG4gICAgICAgIGlmIChudW1DaHVua3MgPT09IDEpIHtcbiAgICAgICAgICAgIHJldHVybiBjaHVua3NbMF0udG9BcnJheSgpO1xuICAgICAgICB9XG4gICAgICAgIGxldCBzb3VyY2VzID0gbmV3IEFycmF5PGFueT4obnVtQ2h1bmtzKTtcbiAgICAgICAgbGV0IHNvdXJjZXNMZW4gPSAwLCBBcnJheVR5cGU6IGFueSA9IEFycmF5O1xuICAgICAgICBmb3IgKGxldCBpbmRleCA9IC0xOyArK2luZGV4IDwgbnVtQ2h1bmtzOykge1xuICAgICAgICAgICAgbGV0IHNvdXJjZSA9IGNodW5rc1tpbmRleF0udG9BcnJheSgpO1xuICAgICAgICAgICAgc291cmNlc0xlbiArPSAoc291cmNlc1tpbmRleF0gPSBzb3VyY2UpLmxlbmd0aDtcbiAgICAgICAgICAgIGlmIChBcnJheVR5cGUgIT09IHNvdXJjZS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgICAgIEFycmF5VHlwZSA9IHNvdXJjZS5jb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBsZXQgdGFyZ2V0ID0gbmV3IEFycmF5VHlwZShzb3VyY2VzTGVuKTtcbiAgICAgICAgbGV0IHNldFZhbHVlcyA9IEFycmF5VHlwZSA9PT0gQXJyYXkgPyBhcnJheVNldCA6IHR5cGVkQXJyYXlTZXQgYXMgYW55O1xuICAgICAgICBmb3IgKGxldCBpbmRleCA9IC0xLCBvZmZzZXQgPSAwOyArK2luZGV4IDwgbnVtQ2h1bmtzOykge1xuICAgICAgICAgICAgb2Zmc2V0ID0gc2V0VmFsdWVzKHNvdXJjZXNbaW5kZXhdLCB0YXJnZXQsIG9mZnNldCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHR5cGVkQXJyYXlTZXQoc291cmNlOiBUeXBlZEFycmF5LCB0YXJnZXQ6IFR5cGVkQXJyYXksIGluZGV4OiBudW1iZXIpIHtcbiAgICByZXR1cm4gdGFyZ2V0LnNldChzb3VyY2UsIGluZGV4KSB8fCBpbmRleCArIHNvdXJjZS5sZW5ndGg7XG59XG5cbmZ1bmN0aW9uIGFycmF5U2V0KHNvdXJjZTogYW55W10sIHRhcmdldDogYW55W10sIGluZGV4OiBudW1iZXIpIHtcbiAgICBsZXQgZHN0SWR4ID0gaW5kZXggLSAxLCBzcmNJZHggPSAtMSwgc3JjTGVuID0gc291cmNlLmxlbmd0aDtcbiAgICB3aGlsZSAoKytzcmNJZHggPCBzcmNMZW4pIHtcbiAgICAgICAgdGFyZ2V0WysrZHN0SWR4XSA9IHNvdXJjZVtzcmNJZHhdO1xuICAgIH1cbiAgICByZXR1cm4gZHN0SWR4O1xufVxuIl19

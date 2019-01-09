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
const vector_2 = require("../util/vector");
const type_1 = require("../type");
/** @ignore */
class Chunked extends vector_1.Vector {
    constructor(type, chunks = [], offsets = calculateOffsets(chunks)) {
        super();
        this._nullCount = -1;
        this._type = type;
        this._chunks = chunks;
        this._chunkOffsets = offsets;
        this._length = offsets[offsets.length - 1];
        this._numChildren = (this._type.children || []).length;
    }
    /** @nocollapse */
    static flatten(...vectors) {
        return vectors.reduce(function flatten(xs, x) {
            return x instanceof Chunked ? x.chunks.reduce(flatten, xs) : [...xs, x];
        }, []).filter((x) => x instanceof vector_1.Vector);
    }
    /** @nocollapse */
    static concat(...chunks) {
        return new Chunked(chunks[0].type, Chunked.flatten(...chunks));
    }
    get type() { return this._type; }
    get length() { return this._length; }
    get chunks() { return this._chunks; }
    get typeId() { return this._type.typeId; }
    get data() {
        return this._chunks[0] ? this._chunks[0].data : null;
    }
    get ArrayType() { return this._type.ArrayType; }
    get numChildren() { return this._numChildren; }
    get stride() { return this._chunks[0] ? this._chunks[0].stride : 1; }
    get nullCount() {
        let nullCount = this._nullCount;
        if (nullCount < 0) {
            this._nullCount = nullCount = this._chunks.reduce((x, { nullCount }) => x + nullCount, 0);
        }
        return nullCount;
    }
    get indices() {
        if (type_1.DataType.isDictionary(this._type)) {
            if (!this._indices) {
                const chunks = this._chunks;
                this._indices = (chunks.length === 1
                    ? chunks[0].indices
                    : Chunked.concat(...chunks.map((x) => x.indices)));
            }
            return this._indices;
        }
        return null;
    }
    get dictionary() {
        if (type_1.DataType.isDictionary(this._type)) {
            return this._type.dictionaryVector;
        }
        return null;
    }
    *[Symbol.iterator]() {
        for (const chunk of this._chunks) {
            yield* chunk;
        }
    }
    clone(chunks = this._chunks) {
        return new Chunked(this._type, chunks);
    }
    concat(...others) {
        return this.clone(Chunked.flatten(this, ...others));
    }
    slice(begin, end) {
        return vector_2.clampRange(this, begin, end, this._sliceInternal);
    }
    getChildAt(index) {
        if (index < 0 || index >= this._numChildren) {
            return null;
        }
        let columns = this._children || (this._children = []);
        let child, field, chunks;
        if (child = columns[index]) {
            return child;
        }
        if (field = (this._type.children || [])[index]) {
            chunks = this._chunks
                .map((vector) => vector.getChildAt(index))
                .filter((vec) => vec != null);
            if (chunks.length > 0) {
                return (columns[index] = new Chunked(field.type, chunks));
            }
        }
        return null;
    }
    search(index, then) {
        let idx = index;
        // binary search to find the child vector and value indices
        let offsets = this._chunkOffsets, rhs = offsets.length - 1;
        // return early if out of bounds, or if there's just one child
        if (idx < 0) {
            return null;
        }
        if (idx >= offsets[rhs]) {
            return null;
        }
        if (rhs <= 1) {
            return then ? then(this, 0, idx) : [0, idx];
        }
        let lhs = 0, pos = 0, mid = 0;
        do {
            if (lhs + 1 === rhs) {
                return then ? then(this, lhs, idx - pos) : [lhs, idx - pos];
            }
            mid = lhs + ((rhs - lhs) / 2) | 0;
            idx >= offsets[mid] ? (lhs = mid) : (rhs = mid);
        } while (idx < offsets[rhs] && idx >= (pos = offsets[lhs]));
        return null;
    }
    isValid(index) {
        return !!this.search(index, this.isValidInternal);
    }
    get(index) {
        return this.search(index, this.getInternal);
    }
    set(index, value) {
        this.search(index, ({ chunks }, i, j) => chunks[i].set(j, value));
    }
    indexOf(element, offset) {
        if (offset && typeof offset === 'number') {
            return this.search(offset, (self, i, j) => this.indexOfInternal(self, i, j, element));
        }
        return this.indexOfInternal(this, 0, Math.max(0, offset || 0), element);
    }
    toArray() {
        const { chunks } = this;
        const n = chunks.length;
        let { ArrayType } = this._type;
        if (n <= 0) {
            return new ArrayType(0);
        }
        if (n <= 1) {
            return chunks[0].toArray();
        }
        let len = 0, src = new Array(n);
        for (let i = -1; ++i < n;) {
            len += (src[i] = chunks[i].toArray()).length;
        }
        if (ArrayType !== src[0].constructor) {
            ArrayType = src[0].constructor;
        }
        let dst = new ArrayType(len);
        let set = ArrayType === Array ? arraySet : typedSet;
        for (let i = -1, idx = 0; ++i < n;) {
            idx = set(src[i], dst, idx);
        }
        return dst;
    }
    getInternal({ _chunks }, i, j) { return _chunks[i].get(j); }
    isValidInternal({ _chunks }, i, j) { return _chunks[i].isValid(j); }
    indexOfInternal({ _chunks }, chunkIndex, fromIndex, element) {
        let i = chunkIndex - 1, n = _chunks.length;
        let start = fromIndex, offset = 0, found = -1;
        while (++i < n) {
            if (~(found = _chunks[i].indexOf(element, start))) {
                return offset + found;
            }
            start = 0;
            offset += _chunks[i].length;
        }
        return -1;
    }
    _sliceInternal(self, begin, end) {
        const slices = [];
        const { chunks, _chunkOffsets: chunkOffsets } = self;
        for (let i = -1, n = chunks.length; ++i < n;) {
            const chunk = chunks[i];
            const chunkLength = chunk.length;
            const chunkOffset = chunkOffsets[i];
            // If the child is to the right of the slice boundary, we can stop
            if (chunkOffset >= end) {
                break;
            }
            // If the child is to the left of of the slice boundary, exclude
            if (begin >= chunkOffset + chunkLength) {
                continue;
            }
            // If the child is between both left and right boundaries, include w/o slicing
            if (chunkOffset >= begin && (chunkOffset + chunkLength) <= end) {
                slices.push(chunk);
                continue;
            }
            // If the child overlaps one of the slice boundaries, include that slice
            const from = Math.max(0, begin - chunkOffset);
            const to = from + Math.min(chunkLength - from, end - chunkOffset);
            slices.push(chunk.slice(from, to));
        }
        return self.clone(slices);
    }
}
exports.Chunked = Chunked;
/** @ignore */
function calculateOffsets(vectors) {
    let offsets = new Uint32Array((vectors || []).length + 1);
    let offset = offsets[0] = 0, length = offsets.length;
    for (let index = 0; ++index < length;) {
        offsets[index] = (offset += vectors[index - 1].length);
    }
    return offsets;
}
/** @ignore */
const typedSet = (src, dst, offset) => {
    dst.set(src, offset);
    return (offset + src.length);
};
/** @ignore */
const arraySet = (src, dst, offset) => {
    let idx = offset - 1;
    for (let i = -1, n = src.length; ++i < n;) {
        dst[++idx] = src[i];
    }
    return idx;
};

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QWMsRUFBRSxFQUFFO0lBQ2xFLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3JCLE9BQU8sQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2pDLENBQUMsQ0FBQztBQUVGLGNBQWM7QUFDZCxNQUFNLFFBQVEsR0FBRyxDQUFDLEdBQVUsRUFBRSxHQUFVLEVBQUUsTUFBYyxFQUFFLEVBQUU7SUFDeEQsSUFBSSxHQUFHLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUNyQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRztRQUN2QyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDdkI7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNmLENBQUMsQ0FBQyIsImZpbGUiOiJ2ZWN0b3IvY2h1bmtlZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBEYXRhIH0gZnJvbSAnLi4vZGF0YSc7XG5pbXBvcnQgeyBGaWVsZCB9IGZyb20gJy4uL3NjaGVtYSc7XG5pbXBvcnQgeyBWZWN0b3IgfSBmcm9tICcuLi92ZWN0b3InO1xuaW1wb3J0IHsgY2xhbXBSYW5nZSB9IGZyb20gJy4uL3V0aWwvdmVjdG9yJztcbmltcG9ydCB7IERhdGFUeXBlLCBEaWN0aW9uYXJ5IH0gZnJvbSAnLi4vdHlwZSc7XG5pbXBvcnQgeyBDbG9uYWJsZSwgU2xpY2VhYmxlLCBBcHBsaWNhdGl2ZSB9IGZyb20gJy4uL3ZlY3Rvcic7XG5pbXBvcnQgeyBEaWN0aW9uYXJ5VmVjdG9yIH0gZnJvbSAnLi9kaWN0aW9uYXJ5JztcblxudHlwZSBDaHVua2VkRGljdDxUIGV4dGVuZHMgRGF0YVR5cGU+ID0gVCBleHRlbmRzIERpY3Rpb25hcnkgPyBUWydkaWN0aW9uYXJ5VmVjdG9yJ10gOiBudWxsIHwgbmV2ZXI7XG50eXBlIENodW5rZWRLZXlzPFQgZXh0ZW5kcyBEYXRhVHlwZT4gPSBUIGV4dGVuZHMgRGljdGlvbmFyeSA/IFZlY3RvcjxUWydpbmRpY2VzJ10+IHwgQ2h1bmtlZDxUWydpbmRpY2VzJ10+IDogbnVsbCB8IG5ldmVyO1xuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IHR5cGUgU2VhcmNoQ29udGludWF0aW9uPFQgZXh0ZW5kcyBDaHVua2VkPiA9IChjb2x1bW46IFQsIGNodW5rSW5kZXg6IG51bWJlciwgdmFsdWVJbmRleDogbnVtYmVyKSA9PiBhbnk7XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY2xhc3MgQ2h1bmtlZDxUIGV4dGVuZHMgRGF0YVR5cGUgPSBhbnk+XG4gICAgZXh0ZW5kcyBWZWN0b3I8VD5cbiAgICBpbXBsZW1lbnRzIENsb25hYmxlPENodW5rZWQ8VD4+LFxuICAgICAgICAgICAgICAgU2xpY2VhYmxlPENodW5rZWQ8VD4+LFxuICAgICAgICAgICAgICAgQXBwbGljYXRpdmU8VCwgQ2h1bmtlZDxUPj4ge1xuXG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBmbGF0dGVuPFQgZXh0ZW5kcyBEYXRhVHlwZT4oLi4udmVjdG9yczogVmVjdG9yPFQ+W10pIHtcbiAgICAgICAgcmV0dXJuIHZlY3RvcnMucmVkdWNlKGZ1bmN0aW9uIGZsYXR0ZW4oeHM6IGFueVtdLCB4OiBhbnkpOiBhbnlbXSB7XG4gICAgICAgICAgICByZXR1cm4geCBpbnN0YW5jZW9mIENodW5rZWQgPyB4LmNodW5rcy5yZWR1Y2UoZmxhdHRlbiwgeHMpIDogWy4uLnhzLCB4XTtcbiAgICAgICAgfSwgW10pLmZpbHRlcigoeDogYW55KTogeCBpcyBWZWN0b3I8VD4gPT4geCBpbnN0YW5jZW9mIFZlY3Rvcik7XG4gICAgfVxuXG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBjb25jYXQ8VCBleHRlbmRzIERhdGFUeXBlPiguLi5jaHVua3M6IFZlY3RvcjxUPltdKTogQ2h1bmtlZDxUPiB7XG4gICAgICAgIHJldHVybiBuZXcgQ2h1bmtlZChjaHVua3NbMF0udHlwZSwgQ2h1bmtlZC5mbGF0dGVuKC4uLmNodW5rcykpO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfdHlwZTogVDtcbiAgICBwcm90ZWN0ZWQgX2xlbmd0aDogbnVtYmVyO1xuICAgIHByb3RlY3RlZCBfY2h1bmtzOiBWZWN0b3I8VD5bXTtcbiAgICBwcm90ZWN0ZWQgX251bUNoaWxkcmVuOiBudW1iZXI7XG4gICAgcHJvdGVjdGVkIF9jaGlsZHJlbj86IENodW5rZWRbXTtcbiAgICBwcm90ZWN0ZWQgX251bGxDb3VudDogbnVtYmVyID0gLTE7XG4gICAgcHJvdGVjdGVkIF9jaHVua09mZnNldHM6IFVpbnQzMkFycmF5O1xuXG4gICAgY29uc3RydWN0b3IodHlwZTogVCwgY2h1bmtzOiBWZWN0b3I8VD5bXSA9IFtdLCBvZmZzZXRzID0gY2FsY3VsYXRlT2Zmc2V0cyhjaHVua3MpKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuX3R5cGUgPSB0eXBlO1xuICAgICAgICB0aGlzLl9jaHVua3MgPSBjaHVua3M7XG4gICAgICAgIHRoaXMuX2NodW5rT2Zmc2V0cyA9IG9mZnNldHM7XG4gICAgICAgIHRoaXMuX2xlbmd0aCA9IG9mZnNldHNbb2Zmc2V0cy5sZW5ndGggLSAxXTtcbiAgICAgICAgdGhpcy5fbnVtQ2hpbGRyZW4gPSAodGhpcy5fdHlwZS5jaGlsZHJlbiB8fCBbXSkubGVuZ3RoO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXQgdHlwZSgpIHsgcmV0dXJuIHRoaXMuX3R5cGU7IH1cbiAgICBwdWJsaWMgZ2V0IGxlbmd0aCgpIHsgcmV0dXJuIHRoaXMuX2xlbmd0aDsgfVxuICAgIHB1YmxpYyBnZXQgY2h1bmtzKCkgeyByZXR1cm4gdGhpcy5fY2h1bmtzOyB9XG4gICAgcHVibGljIGdldCB0eXBlSWQoKSB7IHJldHVybiB0aGlzLl90eXBlLnR5cGVJZDsgfVxuICAgIHB1YmxpYyBnZXQgZGF0YSgpOiBEYXRhPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NodW5rc1swXSA/IHRoaXMuX2NodW5rc1swXS5kYXRhIDogPGFueT4gbnVsbDtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0IEFycmF5VHlwZSgpIHsgcmV0dXJuIHRoaXMuX3R5cGUuQXJyYXlUeXBlOyB9XG4gICAgcHVibGljIGdldCBudW1DaGlsZHJlbigpIHsgcmV0dXJuIHRoaXMuX251bUNoaWxkcmVuOyB9XG4gICAgcHVibGljIGdldCBzdHJpZGUoKSB7IHJldHVybiB0aGlzLl9jaHVua3NbMF0gPyB0aGlzLl9jaHVua3NbMF0uc3RyaWRlIDogMTsgfVxuICAgIHB1YmxpYyBnZXQgbnVsbENvdW50KCkge1xuICAgICAgICBsZXQgbnVsbENvdW50ID0gdGhpcy5fbnVsbENvdW50O1xuICAgICAgICBpZiAobnVsbENvdW50IDwgMCkge1xuICAgICAgICAgICAgdGhpcy5fbnVsbENvdW50ID0gbnVsbENvdW50ID0gdGhpcy5fY2h1bmtzLnJlZHVjZSgoeCwgeyBudWxsQ291bnQgfSkgPT4geCArIG51bGxDb3VudCwgMCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGxDb3VudDtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX2luZGljZXM/OiBDaHVua2VkS2V5czxUPjtcbiAgICBwdWJsaWMgZ2V0IGluZGljZXMoKTogQ2h1bmtlZEtleXM8VD4gfCBudWxsIHtcbiAgICAgICAgaWYgKERhdGFUeXBlLmlzRGljdGlvbmFyeSh0aGlzLl90eXBlKSkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLl9pbmRpY2VzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2h1bmtzID0gKDxhbnk+IHRoaXMuX2NodW5rcykgYXMgRGljdGlvbmFyeVZlY3RvcjxULCBhbnk+W107XG4gICAgICAgICAgICAgICAgdGhpcy5faW5kaWNlcyA9IChjaHVua3MubGVuZ3RoID09PSAxXG4gICAgICAgICAgICAgICAgICAgID8gY2h1bmtzWzBdLmluZGljZXNcbiAgICAgICAgICAgICAgICAgICAgOiBDaHVua2VkLmNvbmNhdCguLi5jaHVua3MubWFwKCh4KSA9PiB4LmluZGljZXMpKSkgYXMgQ2h1bmtlZEtleXM8VD47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5faW5kaWNlcztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcHVibGljIGdldCBkaWN0aW9uYXJ5KCk6IENodW5rZWREaWN0PFQ+IHwgbnVsbCB7XG4gICAgICAgIGlmIChEYXRhVHlwZS5pc0RpY3Rpb25hcnkodGhpcy5fdHlwZSkpIHtcbiAgICAgICAgICAgIHJldHVybiAoPGFueT4gdGhpcy5fdHlwZS5kaWN0aW9uYXJ5VmVjdG9yKSBhcyBDaHVua2VkRGljdDxUPjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBwdWJsaWMgKltTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VFsnVFZhbHVlJ10gfCBudWxsPiB7XG4gICAgICAgIGZvciAoY29uc3QgY2h1bmsgb2YgdGhpcy5fY2h1bmtzKSB7XG4gICAgICAgICAgICB5aWVsZCogY2h1bms7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgY2xvbmUoY2h1bmtzID0gdGhpcy5fY2h1bmtzKTogQ2h1bmtlZDxUPiB7XG4gICAgICAgIHJldHVybiBuZXcgQ2h1bmtlZCh0aGlzLl90eXBlLCBjaHVua3MpO1xuICAgIH1cblxuICAgIHB1YmxpYyBjb25jYXQoLi4ub3RoZXJzOiBWZWN0b3I8VD5bXSk6IENodW5rZWQ8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5jbG9uZShDaHVua2VkLmZsYXR0ZW4odGhpcywgLi4ub3RoZXJzKSk7XG4gICAgfVxuXG4gICAgcHVibGljIHNsaWNlKGJlZ2luPzogbnVtYmVyLCBlbmQ/OiBudW1iZXIpOiBDaHVua2VkPFQ+IHtcbiAgICAgICAgcmV0dXJuIGNsYW1wUmFuZ2UodGhpcywgYmVnaW4sIGVuZCwgdGhpcy5fc2xpY2VJbnRlcm5hbCk7XG4gICAgfVxuXG4gICAgcHVibGljIGdldENoaWxkQXQ8UiBleHRlbmRzIERhdGFUeXBlID0gYW55PihpbmRleDogbnVtYmVyKTogQ2h1bmtlZDxSPiB8IG51bGwge1xuXG4gICAgICAgIGlmIChpbmRleCA8IDAgfHwgaW5kZXggPj0gdGhpcy5fbnVtQ2hpbGRyZW4pIHsgcmV0dXJuIG51bGw7IH1cblxuICAgICAgICBsZXQgY29sdW1ucyA9IHRoaXMuX2NoaWxkcmVuIHx8ICh0aGlzLl9jaGlsZHJlbiA9IFtdKTtcbiAgICAgICAgbGV0IGNoaWxkOiBDaHVua2VkPFI+LCBmaWVsZDogRmllbGQ8Uj4sIGNodW5rczogVmVjdG9yPFI+W107XG5cbiAgICAgICAgaWYgKGNoaWxkID0gY29sdW1uc1tpbmRleF0pIHsgcmV0dXJuIGNoaWxkOyB9XG4gICAgICAgIGlmIChmaWVsZCA9ICgodGhpcy5fdHlwZS5jaGlsZHJlbiB8fCBbXSlbaW5kZXhdIGFzIEZpZWxkPFI+KSkge1xuICAgICAgICAgICAgY2h1bmtzID0gdGhpcy5fY2h1bmtzXG4gICAgICAgICAgICAgICAgLm1hcCgodmVjdG9yKSA9PiB2ZWN0b3IuZ2V0Q2hpbGRBdDxSPihpbmRleCkpXG4gICAgICAgICAgICAgICAgLmZpbHRlcigodmVjKTogdmVjIGlzIFZlY3RvcjxSPiA9PiB2ZWMgIT0gbnVsbCk7XG4gICAgICAgICAgICBpZiAoY2h1bmtzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGNvbHVtbnNbaW5kZXhdID0gbmV3IENodW5rZWQ8Uj4oZmllbGQudHlwZSwgY2h1bmtzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBwdWJsaWMgc2VhcmNoKGluZGV4OiBudW1iZXIpOiBbbnVtYmVyLCBudW1iZXJdIHwgbnVsbDtcbiAgICBwdWJsaWMgc2VhcmNoPE4gZXh0ZW5kcyBTZWFyY2hDb250aW51YXRpb248Q2h1bmtlZDxUPj4+KGluZGV4OiBudW1iZXIsIHRoZW4/OiBOKTogUmV0dXJuVHlwZTxOPjtcbiAgICBwdWJsaWMgc2VhcmNoPE4gZXh0ZW5kcyBTZWFyY2hDb250aW51YXRpb248Q2h1bmtlZDxUPj4+KGluZGV4OiBudW1iZXIsIHRoZW4/OiBOKSB7XG4gICAgICAgIGxldCBpZHggPSBpbmRleDtcbiAgICAgICAgLy8gYmluYXJ5IHNlYXJjaCB0byBmaW5kIHRoZSBjaGlsZCB2ZWN0b3IgYW5kIHZhbHVlIGluZGljZXNcbiAgICAgICAgbGV0IG9mZnNldHMgPSB0aGlzLl9jaHVua09mZnNldHMsIHJocyA9IG9mZnNldHMubGVuZ3RoIC0gMTtcbiAgICAgICAgLy8gcmV0dXJuIGVhcmx5IGlmIG91dCBvZiBib3VuZHMsIG9yIGlmIHRoZXJlJ3MganVzdCBvbmUgY2hpbGRcbiAgICAgICAgaWYgKGlkeCA8IDAgICAgICAgICAgICApIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgICAgaWYgKGlkeCA+PSBvZmZzZXRzW3Joc10pIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgICAgaWYgKHJocyA8PSAxICAgICAgICAgICApIHsgcmV0dXJuIHRoZW4gPyB0aGVuKHRoaXMsIDAsIGlkeCkgOiBbMCwgaWR4XTsgfVxuICAgICAgICBsZXQgbGhzID0gMCwgcG9zID0gMCwgbWlkID0gMDtcbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgaWYgKGxocyArIDEgPT09IHJocykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGVuID8gdGhlbih0aGlzLCBsaHMsIGlkeCAtIHBvcykgOiBbbGhzLCBpZHggLSBwb3NdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWlkID0gbGhzICsgKChyaHMgLSBsaHMpIC8gMikgfCAwO1xuICAgICAgICAgICAgaWR4ID49IG9mZnNldHNbbWlkXSA/IChsaHMgPSBtaWQpIDogKHJocyA9IG1pZCk7XG4gICAgICAgIH0gd2hpbGUgKGlkeCA8IG9mZnNldHNbcmhzXSAmJiBpZHggPj0gKHBvcyA9IG9mZnNldHNbbGhzXSkpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBwdWJsaWMgaXNWYWxpZChpbmRleDogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuc2VhcmNoKGluZGV4LCB0aGlzLmlzVmFsaWRJbnRlcm5hbCk7XG4gICAgfVxuXG4gICAgcHVibGljIGdldChpbmRleDogbnVtYmVyKTogVFsnVFZhbHVlJ10gfCBudWxsIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VhcmNoKGluZGV4LCB0aGlzLmdldEludGVybmFsKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgc2V0KGluZGV4OiBudW1iZXIsIHZhbHVlOiBUWydUVmFsdWUnXSB8IG51bGwpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5zZWFyY2goaW5kZXgsICh7IGNodW5rcyB9LCBpLCBqKSA9PiBjaHVua3NbaV0uc2V0KGosIHZhbHVlKSk7XG4gICAgfVxuXG4gICAgcHVibGljIGluZGV4T2YoZWxlbWVudDogVFsnVFZhbHVlJ10sIG9mZnNldD86IG51bWJlcik6IG51bWJlciB7XG4gICAgICAgIGlmIChvZmZzZXQgJiYgdHlwZW9mIG9mZnNldCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNlYXJjaChvZmZzZXQsIChzZWxmLCBpLCBqKSA9PiB0aGlzLmluZGV4T2ZJbnRlcm5hbChzZWxmLCBpLCBqLCBlbGVtZW50KSkhO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmluZGV4T2ZJbnRlcm5hbCh0aGlzLCAwLCBNYXRoLm1heCgwLCBvZmZzZXQgfHwgMCksIGVsZW1lbnQpO1xuICAgIH1cblxuICAgIHB1YmxpYyB0b0FycmF5KCk6IFRbJ1RBcnJheSddIHtcbiAgICAgICAgY29uc3QgeyBjaHVua3MgfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0IG4gPSBjaHVua3MubGVuZ3RoO1xuICAgICAgICBsZXQgeyBBcnJheVR5cGUgfSA9IHRoaXMuX3R5cGU7XG4gICAgICAgIGlmIChuIDw9IDApIHsgcmV0dXJuIG5ldyBBcnJheVR5cGUoMCk7IH1cbiAgICAgICAgaWYgKG4gPD0gMSkgeyByZXR1cm4gY2h1bmtzWzBdLnRvQXJyYXkoKTsgfVxuICAgICAgICBsZXQgbGVuID0gMCwgc3JjID0gbmV3IEFycmF5KG4pO1xuICAgICAgICBmb3IgKGxldCBpID0gLTE7ICsraSA8IG47KSB7XG4gICAgICAgICAgICBsZW4gKz0gKHNyY1tpXSA9IGNodW5rc1tpXS50b0FycmF5KCkpLmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoQXJyYXlUeXBlICE9PSBzcmNbMF0uY29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgIEFycmF5VHlwZSA9IHNyY1swXS5jb25zdHJ1Y3RvcjtcbiAgICAgICAgfVxuICAgICAgICBsZXQgZHN0ID0gbmV3IChBcnJheVR5cGUgYXMgYW55KShsZW4pO1xuICAgICAgICBsZXQgc2V0OiBhbnkgPSBBcnJheVR5cGUgPT09IEFycmF5ID8gYXJyYXlTZXQgOiB0eXBlZFNldDtcbiAgICAgICAgZm9yIChsZXQgaSA9IC0xLCBpZHggPSAwOyArK2kgPCBuOykge1xuICAgICAgICAgICAgaWR4ID0gc2V0KHNyY1tpXSwgZHN0LCBpZHgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkc3Q7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIGdldEludGVybmFsKHsgX2NodW5rcyB9OiBDaHVua2VkPFQ+LCBpOiBudW1iZXIsIGo6IG51bWJlcikgeyByZXR1cm4gX2NodW5rc1tpXS5nZXQoaik7IH1cbiAgICBwcm90ZWN0ZWQgaXNWYWxpZEludGVybmFsKHsgX2NodW5rcyB9OiBDaHVua2VkPFQ+LCBpOiBudW1iZXIsIGo6IG51bWJlcikgeyByZXR1cm4gX2NodW5rc1tpXS5pc1ZhbGlkKGopOyB9XG4gICAgcHJvdGVjdGVkIGluZGV4T2ZJbnRlcm5hbCh7IF9jaHVua3MgfTogQ2h1bmtlZDxUPiwgY2h1bmtJbmRleDogbnVtYmVyLCBmcm9tSW5kZXg6IG51bWJlciwgZWxlbWVudDogVFsnVFZhbHVlJ10pIHtcbiAgICAgICAgbGV0IGkgPSBjaHVua0luZGV4IC0gMSwgbiA9IF9jaHVua3MubGVuZ3RoO1xuICAgICAgICBsZXQgc3RhcnQgPSBmcm9tSW5kZXgsIG9mZnNldCA9IDAsIGZvdW5kID0gLTE7XG4gICAgICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICAgICAgICBpZiAofihmb3VuZCA9IF9jaHVua3NbaV0uaW5kZXhPZihlbGVtZW50LCBzdGFydCkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9mZnNldCArIGZvdW5kO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhcnQgPSAwO1xuICAgICAgICAgICAgb2Zmc2V0ICs9IF9jaHVua3NbaV0ubGVuZ3RoO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAtMTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3NsaWNlSW50ZXJuYWwoc2VsZjogQ2h1bmtlZDxUPiwgYmVnaW46IG51bWJlciwgZW5kOiBudW1iZXIpIHtcbiAgICAgICAgY29uc3Qgc2xpY2VzOiBWZWN0b3I8VD5bXSA9IFtdO1xuICAgICAgICBjb25zdCB7IGNodW5rcywgX2NodW5rT2Zmc2V0czogY2h1bmtPZmZzZXRzIH0gPSBzZWxmO1xuICAgICAgICBmb3IgKGxldCBpID0gLTEsIG4gPSBjaHVua3MubGVuZ3RoOyArK2kgPCBuOykge1xuICAgICAgICAgICAgY29uc3QgY2h1bmsgPSBjaHVua3NbaV07XG4gICAgICAgICAgICBjb25zdCBjaHVua0xlbmd0aCA9IGNodW5rLmxlbmd0aDtcbiAgICAgICAgICAgIGNvbnN0IGNodW5rT2Zmc2V0ID0gY2h1bmtPZmZzZXRzW2ldO1xuICAgICAgICAgICAgLy8gSWYgdGhlIGNoaWxkIGlzIHRvIHRoZSByaWdodCBvZiB0aGUgc2xpY2UgYm91bmRhcnksIHdlIGNhbiBzdG9wXG4gICAgICAgICAgICBpZiAoY2h1bmtPZmZzZXQgPj0gZW5kKSB7IGJyZWFrOyB9XG4gICAgICAgICAgICAvLyBJZiB0aGUgY2hpbGQgaXMgdG8gdGhlIGxlZnQgb2Ygb2YgdGhlIHNsaWNlIGJvdW5kYXJ5LCBleGNsdWRlXG4gICAgICAgICAgICBpZiAoYmVnaW4gPj0gY2h1bmtPZmZzZXQgKyBjaHVua0xlbmd0aCkgeyBjb250aW51ZTsgfVxuICAgICAgICAgICAgLy8gSWYgdGhlIGNoaWxkIGlzIGJldHdlZW4gYm90aCBsZWZ0IGFuZCByaWdodCBib3VuZGFyaWVzLCBpbmNsdWRlIHcvbyBzbGljaW5nXG4gICAgICAgICAgICBpZiAoY2h1bmtPZmZzZXQgPj0gYmVnaW4gJiYgKGNodW5rT2Zmc2V0ICsgY2h1bmtMZW5ndGgpIDw9IGVuZCkge1xuICAgICAgICAgICAgICAgIHNsaWNlcy5wdXNoKGNodW5rKTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIElmIHRoZSBjaGlsZCBvdmVybGFwcyBvbmUgb2YgdGhlIHNsaWNlIGJvdW5kYXJpZXMsIGluY2x1ZGUgdGhhdCBzbGljZVxuICAgICAgICAgICAgY29uc3QgZnJvbSA9IE1hdGgubWF4KDAsIGJlZ2luIC0gY2h1bmtPZmZzZXQpO1xuICAgICAgICAgICAgY29uc3QgdG8gPSBmcm9tICsgTWF0aC5taW4oY2h1bmtMZW5ndGggLSBmcm9tLCBlbmQgLSBjaHVua09mZnNldCk7XG4gICAgICAgICAgICBzbGljZXMucHVzaChjaHVuay5zbGljZShmcm9tLCB0bykgYXMgVmVjdG9yPFQ+KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2VsZi5jbG9uZShzbGljZXMpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGNhbGN1bGF0ZU9mZnNldHM8VCBleHRlbmRzIERhdGFUeXBlPih2ZWN0b3JzOiBWZWN0b3I8VD5bXSkge1xuICAgIGxldCBvZmZzZXRzID0gbmV3IFVpbnQzMkFycmF5KCh2ZWN0b3JzIHx8IFtdKS5sZW5ndGggKyAxKTtcbiAgICBsZXQgb2Zmc2V0ID0gb2Zmc2V0c1swXSA9IDAsIGxlbmd0aCA9IG9mZnNldHMubGVuZ3RoO1xuICAgIGZvciAobGV0IGluZGV4ID0gMDsgKytpbmRleCA8IGxlbmd0aDspIHtcbiAgICAgICAgb2Zmc2V0c1tpbmRleF0gPSAob2Zmc2V0ICs9IHZlY3RvcnNbaW5kZXggLSAxXS5sZW5ndGgpO1xuICAgIH1cbiAgICByZXR1cm4gb2Zmc2V0cztcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmNvbnN0IHR5cGVkU2V0ID0gKHNyYzogVHlwZWRBcnJheSwgZHN0OiBUeXBlZEFycmF5LCBvZmZzZXQ6IG51bWJlcikgPT4ge1xuICAgIGRzdC5zZXQoc3JjLCBvZmZzZXQpO1xuICAgIHJldHVybiAob2Zmc2V0ICsgc3JjLmxlbmd0aCk7XG59O1xuXG4vKiogQGlnbm9yZSAqL1xuY29uc3QgYXJyYXlTZXQgPSAoc3JjOiBhbnlbXSwgZHN0OiBhbnlbXSwgb2Zmc2V0OiBudW1iZXIpID0+IHtcbiAgICBsZXQgaWR4ID0gb2Zmc2V0IC0gMTtcbiAgICBmb3IgKGxldCBpID0gLTEsIG4gPSBzcmMubGVuZ3RoOyArK2kgPCBuOykge1xuICAgICAgICBkc3RbKytpZHhdID0gc3JjW2ldO1xuICAgIH1cbiAgICByZXR1cm4gaWR4O1xufTtcblxuLyoqIEBpZ25vcmUgKi9cbmludGVyZmFjZSBUeXBlZEFycmF5IGV4dGVuZHMgQXJyYXlCdWZmZXJWaWV3IHtcbiAgICByZWFkb25seSBsZW5ndGg6IG51bWJlcjtcbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogbnVtYmVyO1xuICAgIHNldChhcnJheTogQXJyYXlMaWtlPG51bWJlcj4sIG9mZnNldD86IG51bWJlcik6IHZvaWQ7XG59XG4iXX0=

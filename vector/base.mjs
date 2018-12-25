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
import { Chunked } from './chunked';
import { clampRange } from '../util/vector';
export class BaseVector extends Vector {
    constructor(data, children, stride) {
        super();
        this._stride = 1;
        this._numChildren = 0;
        this._children = children;
        this._numChildren = data.childData.length;
        this._bindDataAccessors(this._data = data);
        this._stride = Math.floor(Math.max(stride || 1, 1));
    }
    get data() { return this._data; }
    get stride() { return this._stride; }
    get numChildren() { return this._numChildren; }
    get type() { return this._data.type; }
    get typeId() { return this._data.typeId; }
    get length() { return this._data.length; }
    get offset() { return this._data.offset; }
    get nullCount() { return this._data.nullCount; }
    get VectorName() { return this.constructor.name; }
    get ArrayType() { return this._data.ArrayType; }
    get values() { return this._data.values; }
    get typeIds() { return this._data.typeIds; }
    get nullBitmap() { return this._data.nullBitmap; }
    get valueOffsets() { return this._data.valueOffsets; }
    get [Symbol.toStringTag]() { return `${this.VectorName}<${this.type[Symbol.toStringTag]}>`; }
    clone(data, children = this._children, stride = this._stride) {
        return Vector.new(data, children, stride);
    }
    concat(...others) {
        return Chunked.concat(this, ...others);
    }
    slice(begin, end) {
        // Adjust args similar to Array.prototype.slice. Normalize begin/end to
        // clamp between 0 and length, and wrap around on negative indices, e.g.
        // slice(-1, 5) or slice(5, -1)
        return clampRange(this, begin, end, this._sliceInternal);
    }
    isValid(index) {
        if (this.nullCount > 0) {
            const idx = this.offset + index;
            const val = this.nullBitmap[idx >> 3];
            const mask = (val & (1 << (idx % 8)));
            return mask !== 0;
        }
        return true;
    }
    getChildAt(index) {
        return index < 0 || index >= this.numChildren ? null : ((this._children || (this._children = []))[index] ||
            (this._children[index] = Vector.new(this._data.childData[index])));
    }
    // @ts-ignore
    toJSON() { return [...this]; }
    _sliceInternal(self, offset, length) {
        const stride = self.stride;
        return self.clone(self.data.slice(offset * stride, (length - offset) * stride));
    }
    // @ts-ignore
    _bindDataAccessors(data) {
        // Implementation in src/vectors/index.ts due to circular dependency/packaging shenanigans
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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Q0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUNoRCxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQVksQ0FBQyxDQUFDLENBQ3JFLENBQUM7SUFDbkIsQ0FBQztJQUVELGFBQWE7SUFDTixNQUFNLEtBQVUsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRWhDLGNBQWMsQ0FBQyxJQUFVLEVBQUUsTUFBYyxFQUFFLE1BQWM7UUFDL0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUMzQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLE1BQU0sRUFBRSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ3BGLENBQUM7SUFFRCxhQUFhO0lBQ0gsa0JBQWtCLENBQUMsSUFBYTtRQUN0QywwRkFBMEY7SUFDOUYsQ0FBQztDQUNKIiwiZmlsZSI6InZlY3Rvci9iYXNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IERhdGEgfSBmcm9tICcuLi9kYXRhJztcbmltcG9ydCB7IFZlY3RvciB9IGZyb20gJy4uL3ZlY3Rvcic7XG5pbXBvcnQgeyBEYXRhVHlwZSB9IGZyb20gJy4uL3R5cGUnO1xuaW1wb3J0IHsgQ2h1bmtlZCB9IGZyb20gJy4vY2h1bmtlZCc7XG5pbXBvcnQgeyBjbGFtcFJhbmdlIH0gZnJvbSAnLi4vdXRpbC92ZWN0b3InO1xuaW1wb3J0IHsgVmVjdG9yIGFzIFZUeXBlIH0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBDbG9uYWJsZSwgU2xpY2VhYmxlLCBBcHBsaWNhdGl2ZSB9IGZyb20gJy4uL3ZlY3Rvcic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQmFzZVZlY3RvcjxUIGV4dGVuZHMgRGF0YVR5cGUgPSBhbnk+IGV4dGVuZHMgQ2xvbmFibGU8VlR5cGU8VD4+LCBTbGljZWFibGU8VlR5cGU8VD4+LCBBcHBsaWNhdGl2ZTxULCBDaHVua2VkPFQ+PiB7XG4gICAgc2xpY2UoYmVnaW4/OiBudW1iZXIsIGVuZD86IG51bWJlcik6IFZUeXBlPFQ+O1xuICAgIGNvbmNhdCguLi5vdGhlcnM6IFZlY3RvcjxUPltdKTogQ2h1bmtlZDxUPjtcbiAgICBjbG9uZTxSIGV4dGVuZHMgRGF0YVR5cGUgPSBUPihkYXRhOiBEYXRhPFI+LCBjaGlsZHJlbj86IFZlY3RvcjxSPltdLCBzdHJpZGU/OiBudW1iZXIpOiBWVHlwZTxSPjtcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEJhc2VWZWN0b3I8VCBleHRlbmRzIERhdGFUeXBlID0gYW55PiBleHRlbmRzIFZlY3RvcjxUPlxuICAgIGltcGxlbWVudHMgQ2xvbmFibGU8VlR5cGU8VD4+LCBTbGljZWFibGU8VlR5cGU8VD4+LCBBcHBsaWNhdGl2ZTxULCBDaHVua2VkPFQ+PiB7XG5cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHJvdGVjdGVkIF9kYXRhOiBEYXRhPFQ+O1xuICAgIHByb3RlY3RlZCBfc3RyaWRlOiBudW1iZXIgPSAxO1xuICAgIHByb3RlY3RlZCBfbnVtQ2hpbGRyZW46IG51bWJlciA9IDA7XG4gICAgcHJvdGVjdGVkIF9jaGlsZHJlbj86IFZlY3RvcltdO1xuXG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxUPiwgY2hpbGRyZW4/OiBWZWN0b3JbXSwgc3RyaWRlPzogbnVtYmVyKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuX2NoaWxkcmVuID0gY2hpbGRyZW47XG4gICAgICAgIHRoaXMuX251bUNoaWxkcmVuID0gZGF0YS5jaGlsZERhdGEubGVuZ3RoO1xuICAgICAgICB0aGlzLl9iaW5kRGF0YUFjY2Vzc29ycyh0aGlzLl9kYXRhID0gZGF0YSk7XG4gICAgICAgIHRoaXMuX3N0cmlkZSA9IE1hdGguZmxvb3IoTWF0aC5tYXgoc3RyaWRlIHx8IDEsIDEpKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0IGRhdGEoKSB7IHJldHVybiB0aGlzLl9kYXRhOyB9XG4gICAgcHVibGljIGdldCBzdHJpZGUoKSB7IHJldHVybiB0aGlzLl9zdHJpZGU7IH1cbiAgICBwdWJsaWMgZ2V0IG51bUNoaWxkcmVuKCkgeyByZXR1cm4gdGhpcy5fbnVtQ2hpbGRyZW47IH1cblxuICAgIHB1YmxpYyBnZXQgdHlwZSgpIHsgcmV0dXJuIHRoaXMuX2RhdGEudHlwZTsgfVxuICAgIHB1YmxpYyBnZXQgdHlwZUlkKCkgeyByZXR1cm4gdGhpcy5fZGF0YS50eXBlSWQgYXMgVFsnVFR5cGUnXTsgfVxuICAgIHB1YmxpYyBnZXQgbGVuZ3RoKCkgeyByZXR1cm4gdGhpcy5fZGF0YS5sZW5ndGg7IH1cbiAgICBwdWJsaWMgZ2V0IG9mZnNldCgpIHsgcmV0dXJuIHRoaXMuX2RhdGEub2Zmc2V0OyB9XG4gICAgcHVibGljIGdldCBudWxsQ291bnQoKSB7IHJldHVybiB0aGlzLl9kYXRhLm51bGxDb3VudDsgfVxuICAgIHB1YmxpYyBnZXQgVmVjdG9yTmFtZSgpIHsgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IubmFtZTsgfVxuXG4gICAgcHVibGljIGdldCBBcnJheVR5cGUoKTogVFsnQXJyYXlUeXBlJ10geyByZXR1cm4gdGhpcy5fZGF0YS5BcnJheVR5cGU7IH1cblxuICAgIHB1YmxpYyBnZXQgdmFsdWVzKCkgeyByZXR1cm4gdGhpcy5fZGF0YS52YWx1ZXM7IH1cbiAgICBwdWJsaWMgZ2V0IHR5cGVJZHMoKSB7IHJldHVybiB0aGlzLl9kYXRhLnR5cGVJZHM7IH1cbiAgICBwdWJsaWMgZ2V0IG51bGxCaXRtYXAoKSB7IHJldHVybiB0aGlzLl9kYXRhLm51bGxCaXRtYXA7IH1cbiAgICBwdWJsaWMgZ2V0IHZhbHVlT2Zmc2V0cygpIHsgcmV0dXJuIHRoaXMuX2RhdGEudmFsdWVPZmZzZXRzOyB9XG5cbiAgICBwdWJsaWMgZ2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCkgeyByZXR1cm4gYCR7dGhpcy5WZWN0b3JOYW1lfTwke3RoaXMudHlwZVtTeW1ib2wudG9TdHJpbmdUYWddfT5gOyB9XG5cbiAgICBwdWJsaWMgY2xvbmU8UiBleHRlbmRzIERhdGFUeXBlID0gVD4oZGF0YTogRGF0YTxSPiwgY2hpbGRyZW4gPSB0aGlzLl9jaGlsZHJlbiwgc3RyaWRlID0gdGhpcy5fc3RyaWRlKSB7XG4gICAgICAgIHJldHVybiBWZWN0b3IubmV3PFI+KGRhdGEsIGNoaWxkcmVuLCBzdHJpZGUpIGFzIGFueTtcbiAgICB9XG5cbiAgICBwdWJsaWMgY29uY2F0KC4uLm90aGVyczogVmVjdG9yPFQ+W10pIHtcbiAgICAgICAgcmV0dXJuIENodW5rZWQuY29uY2F0PFQ+KHRoaXMsIC4uLm90aGVycyk7XG4gICAgfVxuXG4gICAgcHVibGljIHNsaWNlKGJlZ2luPzogbnVtYmVyLCBlbmQ/OiBudW1iZXIpIHtcbiAgICAgICAgLy8gQWRqdXN0IGFyZ3Mgc2ltaWxhciB0byBBcnJheS5wcm90b3R5cGUuc2xpY2UuIE5vcm1hbGl6ZSBiZWdpbi9lbmQgdG9cbiAgICAgICAgLy8gY2xhbXAgYmV0d2VlbiAwIGFuZCBsZW5ndGgsIGFuZCB3cmFwIGFyb3VuZCBvbiBuZWdhdGl2ZSBpbmRpY2VzLCBlLmcuXG4gICAgICAgIC8vIHNsaWNlKC0xLCA1KSBvciBzbGljZSg1LCAtMSlcbiAgICAgICAgcmV0dXJuIGNsYW1wUmFuZ2UodGhpcywgYmVnaW4sIGVuZCwgdGhpcy5fc2xpY2VJbnRlcm5hbCk7XG4gICAgfVxuXG4gICAgcHVibGljIGlzVmFsaWQoaW5kZXg6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgICAgICBpZiAodGhpcy5udWxsQ291bnQgPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBpZHggPSB0aGlzLm9mZnNldCArIGluZGV4O1xuICAgICAgICAgICAgY29uc3QgdmFsID0gdGhpcy5udWxsQml0bWFwW2lkeCA+PiAzXTtcbiAgICAgICAgICAgIGNvbnN0IG1hc2sgPSAodmFsICYgKDEgPDwgKGlkeCAlIDgpKSk7XG4gICAgICAgICAgICByZXR1cm4gbWFzayAhPT0gMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0Q2hpbGRBdDxSIGV4dGVuZHMgRGF0YVR5cGUgPSBhbnk+KGluZGV4OiBudW1iZXIpOiBWZWN0b3I8Uj4gfCBudWxsIHtcbiAgICAgICAgcmV0dXJuIGluZGV4IDwgMCB8fCBpbmRleCA+PSB0aGlzLm51bUNoaWxkcmVuID8gbnVsbCA6IChcbiAgICAgICAgICAgICh0aGlzLl9jaGlsZHJlbiB8fCAodGhpcy5fY2hpbGRyZW4gPSBbXSkpW2luZGV4XSB8fFxuICAgICAgICAgICAgKHRoaXMuX2NoaWxkcmVuW2luZGV4XSA9IFZlY3Rvci5uZXc8Uj4odGhpcy5fZGF0YS5jaGlsZERhdGFbaW5kZXhdIGFzIERhdGE8Uj4pKVxuICAgICAgICApIGFzIFZlY3RvcjxSPjtcbiAgICB9XG5cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIHRvSlNPTigpOiBhbnkgeyByZXR1cm4gWy4uLnRoaXNdOyB9XG5cbiAgICBwcm90ZWN0ZWQgX3NsaWNlSW50ZXJuYWwoc2VsZjogdGhpcywgb2Zmc2V0OiBudW1iZXIsIGxlbmd0aDogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IHN0cmlkZSA9IHNlbGYuc3RyaWRlO1xuICAgICAgICByZXR1cm4gc2VsZi5jbG9uZShzZWxmLmRhdGEuc2xpY2Uob2Zmc2V0ICogc3RyaWRlLCAobGVuZ3RoIC0gb2Zmc2V0KSAqIHN0cmlkZSkpO1xuICAgIH1cblxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwcm90ZWN0ZWQgX2JpbmREYXRhQWNjZXNzb3JzKGRhdGE6IERhdGE8VD4pIHtcbiAgICAgICAgLy8gSW1wbGVtZW50YXRpb24gaW4gc3JjL3ZlY3RvcnMvaW5kZXgudHMgZHVlIHRvIGNpcmN1bGFyIGRlcGVuZGVuY3kvcGFja2FnaW5nIHNoZW5hbmlnYW5zXG4gICAgfVxufVxuIl19

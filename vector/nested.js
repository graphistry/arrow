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
class NestedView {
    constructor(data, children) {
        this.length = data.length;
        this.childData = data.childData;
        this.numChildren = data.childData.length;
        this.children = children || new Array(this.numChildren);
    }
    clone(data) {
        return new this.constructor(data, this.children);
    }
    isValid() {
        return true;
    }
    toArray() {
        return [...this];
    }
    toJSON() { return this.toArray(); }
    toString() {
        return [...this].map((x) => stringify(x)).join(', ');
    }
    get(index) {
        return this.getNested(this, index);
    }
    set(index, value) {
        return this.setNested(this, index, value);
    }
    getChildAt(index) {
        return this.children[index] || (this.children[index] = vector_1.createVector(this.childData[index]));
    }
    *[Symbol.iterator]() {
        const get = this.getNested;
        const length = this.length;
        for (let index = -1; ++index < length;) {
            yield get(this, index);
        }
    }
}
exports.NestedView = NestedView;
class UnionView extends NestedView {
    constructor(data, children) {
        super(data, children);
        this.length = data.length;
        this.typeIds = data.typeIds;
    }
    getNested(self, index) {
        return self.getChildValue(self, index, self.typeIds, self.valueOffsets);
    }
    setNested(self, index, value) {
        return self.setChildValue(self, index, value, self.typeIds, self.valueOffsets);
    }
    getChildValue(self, index, typeIds, _valueOffsets) {
        const child = self.getChildAt(typeIds[index]);
        return child ? child.get(index) : null;
    }
    setChildValue(self, index, value, typeIds, _valueOffsets) {
        const child = self.getChildAt(typeIds[index]);
        return child ? child.set(index, value) : null;
    }
    *[Symbol.iterator]() {
        const length = this.length;
        const get = this.getChildValue;
        const { typeIds, valueOffsets } = this;
        for (let index = -1; ++index < length;) {
            yield get(this, index, typeIds, valueOffsets);
        }
    }
}
exports.UnionView = UnionView;
class DenseUnionView extends UnionView {
    constructor(data, children) {
        super(data, children);
        this.valueOffsets = data.valueOffsets;
    }
    getNested(self, index) {
        return self.getChildValue(self, index, self.typeIds, self.valueOffsets);
    }
    getChildValue(self, index, typeIds, valueOffsets) {
        const child = self.getChildAt(typeIds[index]);
        return child ? child.get(valueOffsets[index]) : null;
    }
    setChildValue(self, index, value, typeIds, valueOffsets) {
        const child = self.getChildAt(typeIds[index]);
        return child ? child.set(valueOffsets[index], value) : null;
    }
}
exports.DenseUnionView = DenseUnionView;
class StructView extends NestedView {
    getNested(self, index) {
        return new RowView(self, self.children, index);
    }
    setNested(self, index, value) {
        let idx = -1, len = self.numChildren;
        if (!(value instanceof NestedView || value instanceof vector_1.Vector)) {
            while (++idx < len) {
                self.getChildAt(idx).set(index, value[idx]);
            }
        }
        else {
            while (++idx < len) {
                self.getChildAt(idx).set(index, value.get(idx));
            }
        }
    }
}
exports.StructView = StructView;
class MapView extends NestedView {
    constructor(data, children) {
        super(data, children);
        this.typeIds = data.type.children.reduce((xs, x, i) => (xs[x.name] = i) && xs || xs, Object.create(null));
    }
    getNested(self, index) {
        return new MapRowView(self, self.children, index);
    }
    setNested(self, index, value) {
        const typeIds = self.typeIds;
        if (!(value instanceof NestedView || value instanceof vector_1.Vector)) {
            for (const key in typeIds) {
                self.getChildAt(typeIds[key]).set(index, value[key]);
            }
        }
        else {
            for (const key in typeIds) {
                self.getChildAt(typeIds[key]).set(index, value.get(key));
            }
        }
    }
}
exports.MapView = MapView;
class RowView extends UnionView {
    constructor(data, children, rowIndex) {
        super(data, children);
        this.rowIndex = rowIndex || 0;
        this.length = data.numChildren;
    }
    clone(data) {
        return new this.constructor(data, this.children, this.rowIndex);
    }
    getChildValue(self, index, _typeIds, _valueOffsets) {
        const child = self.getChildAt(index);
        return child ? child.get(self.rowIndex) : null;
    }
    setChildValue(self, index, value, _typeIds, _valueOffsets) {
        const child = self.getChildAt(index);
        return child ? child.set(self.rowIndex, value) : null;
    }
}
exports.RowView = RowView;
class MapRowView extends RowView {
    toJSON() {
        const get = this.getChildValue;
        const result = {};
        const typeIds = this.typeIds;
        for (const name in typeIds) {
            result[name] = get(this, name, typeIds, null);
        }
        return result;
    }
    getChildValue(self, key, typeIds, _valueOffsets) {
        const child = self.getChildAt(typeIds[key]);
        return child ? child.get(self.rowIndex) : null;
    }
    setChildValue(self, key, value, typeIds, _valueOffsets) {
        const child = self.getChildAt(typeIds[key]);
        return child ? child.set(self.rowIndex, value) : null;
    }
}
exports.MapRowView = MapRowView;
function stringify(x) {
    return typeof x === 'string' ? `"${x}"` : Array.isArray(x) ? JSON.stringify(x) : ArrayBuffer.isView(x) ? `[${x}]` : `${x}`;
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LE9BQU8sQ0FBQyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztBQUMvSCxDQUFDIiwiZmlsZSI6InZlY3Rvci9uZXN0ZWQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgRGF0YSB9IGZyb20gJy4uL2RhdGEnO1xuaW1wb3J0IHsgSXRlcmFibGVBcnJheUxpa2UgfSBmcm9tICcuLi90eXBlJztcbmltcG9ydCB7IFZpZXcsIFZlY3RvciwgY3JlYXRlVmVjdG9yIH0gZnJvbSAnLi4vdmVjdG9yJztcbmltcG9ydCB7IERhdGFUeXBlLCBOZXN0ZWRUeXBlLCBEZW5zZVVuaW9uLCBTcGFyc2VVbmlvbiwgU3RydWN0LCBNYXBfIH0gZnJvbSAnLi4vdHlwZSc7XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBOZXN0ZWRWaWV3PFQgZXh0ZW5kcyBOZXN0ZWRUeXBlPiBpbXBsZW1lbnRzIFZpZXc8VD4ge1xuICAgIHB1YmxpYyBsZW5ndGg6IG51bWJlcjtcbiAgICBwdWJsaWMgbnVtQ2hpbGRyZW46IG51bWJlcjtcbiAgICBwdWJsaWMgY2hpbGREYXRhOiBEYXRhPGFueT5bXTtcbiAgICBwcm90ZWN0ZWQgY2hpbGRyZW46IFZlY3Rvcjxhbnk+W107XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxUPiwgY2hpbGRyZW4/OiBWZWN0b3I8YW55PltdKSB7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gZGF0YS5sZW5ndGg7XG4gICAgICAgIHRoaXMuY2hpbGREYXRhID0gZGF0YS5jaGlsZERhdGE7XG4gICAgICAgIHRoaXMubnVtQ2hpbGRyZW4gPSBkYXRhLmNoaWxkRGF0YS5sZW5ndGg7XG4gICAgICAgIHRoaXMuY2hpbGRyZW4gPSBjaGlsZHJlbiB8fCBuZXcgQXJyYXkodGhpcy5udW1DaGlsZHJlbik7XG4gICAgfVxuICAgIHB1YmxpYyBjbG9uZShkYXRhOiBEYXRhPFQ+KTogdGhpcyB7XG4gICAgICAgIHJldHVybiBuZXcgKDxhbnk+IHRoaXMuY29uc3RydWN0b3IpKGRhdGEsIHRoaXMuY2hpbGRyZW4pIGFzIHRoaXM7XG4gICAgfVxuICAgIHB1YmxpYyBpc1ZhbGlkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcHVibGljIHRvQXJyYXkoKTogSXRlcmFibGVBcnJheUxpa2U8VFsnVFZhbHVlJ10+IHtcbiAgICAgICAgcmV0dXJuIFsuLi50aGlzXTtcbiAgICB9XG4gICAgcHVibGljIHRvSlNPTigpOiBhbnkgeyByZXR1cm4gdGhpcy50b0FycmF5KCk7IH1cbiAgICBwdWJsaWMgdG9TdHJpbmcoKSB7XG4gICAgICAgIHJldHVybiBbLi4udGhpc10ubWFwKCh4KSA9PiBzdHJpbmdpZnkoeCkpLmpvaW4oJywgJyk7XG4gICAgfVxuICAgIHB1YmxpYyBnZXQoaW5kZXg6IG51bWJlcik6IFRbJ1RWYWx1ZSddIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0TmVzdGVkKHRoaXMsIGluZGV4KTtcbiAgICB9XG4gICAgcHVibGljIHNldChpbmRleDogbnVtYmVyLCB2YWx1ZTogVFsnVFZhbHVlJ10pOiB2b2lkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0TmVzdGVkKHRoaXMsIGluZGV4LCB2YWx1ZSk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBhYnN0cmFjdCBnZXROZXN0ZWQoc2VsZjogTmVzdGVkVmlldzxUPiwgaW5kZXg6IG51bWJlcik6IFRbJ1RWYWx1ZSddO1xuICAgIHByb3RlY3RlZCBhYnN0cmFjdCBzZXROZXN0ZWQoc2VsZjogTmVzdGVkVmlldzxUPiwgaW5kZXg6IG51bWJlciwgdmFsdWU6IFRbJ1RWYWx1ZSddKTogdm9pZDtcbiAgICBwdWJsaWMgZ2V0Q2hpbGRBdDxSIGV4dGVuZHMgRGF0YVR5cGUgPSBEYXRhVHlwZT4oaW5kZXg6IG51bWJlcikge1xuICAgICAgICByZXR1cm4gdGhpcy5jaGlsZHJlbltpbmRleF0gfHwgKFxuICAgICAgICAgICAgICAgdGhpcy5jaGlsZHJlbltpbmRleF0gPSBjcmVhdGVWZWN0b3I8Uj4odGhpcy5jaGlsZERhdGFbaW5kZXhdKSk7XG4gICAgfVxuICAgIHB1YmxpYyAqW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxUWydUVmFsdWUnXT4ge1xuICAgICAgICBjb25zdCBnZXQgPSB0aGlzLmdldE5lc3RlZDtcbiAgICAgICAgY29uc3QgbGVuZ3RoID0gdGhpcy5sZW5ndGg7XG4gICAgICAgIGZvciAobGV0IGluZGV4ID0gLTE7ICsraW5kZXggPCBsZW5ndGg7KSB7XG4gICAgICAgICAgICB5aWVsZCBnZXQodGhpcywgaW5kZXgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgVW5pb25WaWV3PFQgZXh0ZW5kcyAoRGVuc2VVbmlvbiB8IFNwYXJzZVVuaW9uKSA9IFNwYXJzZVVuaW9uPiBleHRlbmRzIE5lc3RlZFZpZXc8VD4ge1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgdHlwZUlkczogSW50OEFycmF5O1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgdmFsdWVPZmZzZXRzPzogSW50MzJBcnJheTtcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPFQ+LCBjaGlsZHJlbj86IFZlY3Rvcjxhbnk+W10pIHtcbiAgICAgICAgc3VwZXIoZGF0YSwgY2hpbGRyZW4pO1xuICAgICAgICB0aGlzLmxlbmd0aCA9IGRhdGEubGVuZ3RoO1xuICAgICAgICB0aGlzLnR5cGVJZHMgPSBkYXRhLnR5cGVJZHM7XG4gICAgfVxuICAgIHByb3RlY3RlZCBnZXROZXN0ZWQoc2VsZjogVW5pb25WaWV3PFQ+LCBpbmRleDogbnVtYmVyKTogVFsnVFZhbHVlJ10ge1xuICAgICAgICByZXR1cm4gc2VsZi5nZXRDaGlsZFZhbHVlKHNlbGYsIGluZGV4LCBzZWxmLnR5cGVJZHMsIHNlbGYudmFsdWVPZmZzZXRzKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHNldE5lc3RlZChzZWxmOiBVbmlvblZpZXc8VD4sIGluZGV4OiBudW1iZXIsIHZhbHVlOiBUWydUVmFsdWUnXSk6IHZvaWQge1xuICAgICAgICByZXR1cm4gc2VsZi5zZXRDaGlsZFZhbHVlKHNlbGYsIGluZGV4LCB2YWx1ZSwgc2VsZi50eXBlSWRzLCBzZWxmLnZhbHVlT2Zmc2V0cyk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBnZXRDaGlsZFZhbHVlKHNlbGY6IE5lc3RlZFZpZXc8VD4sIGluZGV4OiBudW1iZXIsIHR5cGVJZHM6IEludDhBcnJheSwgX3ZhbHVlT2Zmc2V0cz86IGFueSk6IGFueSB8IG51bGwge1xuICAgICAgICBjb25zdCBjaGlsZCA9IHNlbGYuZ2V0Q2hpbGRBdCh0eXBlSWRzW2luZGV4XSk7XG4gICAgICAgIHJldHVybiBjaGlsZCA/IGNoaWxkLmdldChpbmRleCkgOiBudWxsO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgc2V0Q2hpbGRWYWx1ZShzZWxmOiBOZXN0ZWRWaWV3PFQ+LCBpbmRleDogbnVtYmVyLCB2YWx1ZTogVFsnVFZhbHVlJ10sIHR5cGVJZHM6IEludDhBcnJheSwgX3ZhbHVlT2Zmc2V0cz86IGFueSk6IGFueSB8IG51bGwge1xuICAgICAgICBjb25zdCBjaGlsZCA9IHNlbGYuZ2V0Q2hpbGRBdCh0eXBlSWRzW2luZGV4XSk7XG4gICAgICAgIHJldHVybiBjaGlsZCA/IGNoaWxkLnNldChpbmRleCwgdmFsdWUpIDogbnVsbDtcbiAgICB9XG4gICAgcHVibGljICpbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFRbJ1RWYWx1ZSddPiB7XG4gICAgICAgIGNvbnN0IGxlbmd0aCA9IHRoaXMubGVuZ3RoO1xuICAgICAgICBjb25zdCBnZXQgPSB0aGlzLmdldENoaWxkVmFsdWU7XG4gICAgICAgIGNvbnN0IHsgdHlwZUlkcywgdmFsdWVPZmZzZXRzIH0gPSB0aGlzO1xuICAgICAgICBmb3IgKGxldCBpbmRleCA9IC0xOyArK2luZGV4IDwgbGVuZ3RoOykge1xuICAgICAgICAgICAgeWllbGQgZ2V0KHRoaXMsIGluZGV4LCB0eXBlSWRzLCB2YWx1ZU9mZnNldHMpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgRGVuc2VVbmlvblZpZXcgZXh0ZW5kcyBVbmlvblZpZXc8RGVuc2VVbmlvbj4ge1xuICAgIHB1YmxpYyB2YWx1ZU9mZnNldHM6IEludDMyQXJyYXk7XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxEZW5zZVVuaW9uPiwgY2hpbGRyZW4/OiBWZWN0b3I8YW55PltdKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIGNoaWxkcmVuKTtcbiAgICAgICAgdGhpcy52YWx1ZU9mZnNldHMgPSBkYXRhLnZhbHVlT2Zmc2V0cztcbiAgICB9XG4gICAgcHJvdGVjdGVkIGdldE5lc3RlZChzZWxmOiBEZW5zZVVuaW9uVmlldywgaW5kZXg6IG51bWJlcik6IGFueSB8IG51bGwge1xuICAgICAgICByZXR1cm4gc2VsZi5nZXRDaGlsZFZhbHVlKHNlbGYsIGluZGV4LCBzZWxmLnR5cGVJZHMsIHNlbGYudmFsdWVPZmZzZXRzKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIGdldENoaWxkVmFsdWUoc2VsZjogTmVzdGVkVmlldzxEZW5zZVVuaW9uPiwgaW5kZXg6IG51bWJlciwgdHlwZUlkczogSW50OEFycmF5LCB2YWx1ZU9mZnNldHM6IGFueSk6IGFueSB8IG51bGwge1xuICAgICAgICBjb25zdCBjaGlsZCA9IHNlbGYuZ2V0Q2hpbGRBdCh0eXBlSWRzW2luZGV4XSk7XG4gICAgICAgIHJldHVybiBjaGlsZCA/IGNoaWxkLmdldCh2YWx1ZU9mZnNldHNbaW5kZXhdKSA6IG51bGw7XG4gICAgfVxuICAgIHByb3RlY3RlZCBzZXRDaGlsZFZhbHVlKHNlbGY6IE5lc3RlZFZpZXc8RGVuc2VVbmlvbj4sIGluZGV4OiBudW1iZXIsIHZhbHVlOiBhbnksIHR5cGVJZHM6IEludDhBcnJheSwgdmFsdWVPZmZzZXRzPzogYW55KTogYW55IHwgbnVsbCB7XG4gICAgICAgIGNvbnN0IGNoaWxkID0gc2VsZi5nZXRDaGlsZEF0KHR5cGVJZHNbaW5kZXhdKTtcbiAgICAgICAgcmV0dXJuIGNoaWxkID8gY2hpbGQuc2V0KHZhbHVlT2Zmc2V0c1tpbmRleF0sIHZhbHVlKSA6IG51bGw7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgU3RydWN0VmlldyBleHRlbmRzIE5lc3RlZFZpZXc8U3RydWN0PiB7XG4gICAgcHJvdGVjdGVkIGdldE5lc3RlZChzZWxmOiBTdHJ1Y3RWaWV3LCBpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIHJldHVybiBuZXcgUm93VmlldyhzZWxmIGFzIGFueSwgc2VsZi5jaGlsZHJlbiwgaW5kZXgpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgc2V0TmVzdGVkKHNlbGY6IFN0cnVjdFZpZXcsIGluZGV4OiBudW1iZXIsIHZhbHVlOiBhbnkpOiB2b2lkIHtcbiAgICAgICAgbGV0IGlkeCA9IC0xLCBsZW4gPSBzZWxmLm51bUNoaWxkcmVuO1xuICAgICAgICBpZiAoISh2YWx1ZSBpbnN0YW5jZW9mIE5lc3RlZFZpZXcgfHwgdmFsdWUgaW5zdGFuY2VvZiBWZWN0b3IpKSB7XG4gICAgICAgICAgICB3aGlsZSAoKytpZHggPCBsZW4pIHsgc2VsZi5nZXRDaGlsZEF0KGlkeCkuc2V0KGluZGV4LCB2YWx1ZVtpZHhdKTsgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2hpbGUgKCsraWR4IDwgbGVuKSB7IHNlbGYuZ2V0Q2hpbGRBdChpZHgpLnNldChpbmRleCwgdmFsdWUuZ2V0KGlkeCkpOyB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBNYXBWaWV3IGV4dGVuZHMgTmVzdGVkVmlldzxNYXBfPiB7XG4gICAgcHVibGljIHR5cGVJZHM6IHsgW2s6IHN0cmluZ106IG51bWJlciB9O1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8TWFwXz4sIGNoaWxkcmVuPzogVmVjdG9yPGFueT5bXSkge1xuICAgICAgICBzdXBlcihkYXRhLCBjaGlsZHJlbik7XG4gICAgICAgIHRoaXMudHlwZUlkcyA9IGRhdGEudHlwZS5jaGlsZHJlbi5yZWR1Y2UoKHhzLCB4LCBpKSA9PlxuICAgICAgICAgICAgKHhzW3gubmFtZV0gPSBpKSAmJiB4cyB8fCB4cywgT2JqZWN0LmNyZWF0ZShudWxsKSk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBnZXROZXN0ZWQoc2VsZjogTWFwVmlldywgaW5kZXg6IG51bWJlcikge1xuICAgICAgICByZXR1cm4gbmV3IE1hcFJvd1ZpZXcoc2VsZiBhcyBhbnksIHNlbGYuY2hpbGRyZW4sIGluZGV4KTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHNldE5lc3RlZChzZWxmOiBNYXBWaWV3LCBpbmRleDogbnVtYmVyLCB2YWx1ZTogeyBbazogc3RyaW5nXTogYW55IH0pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgdHlwZUlkcyA9IHNlbGYudHlwZUlkcyBhcyBhbnk7XG4gICAgICAgIGlmICghKHZhbHVlIGluc3RhbmNlb2YgTmVzdGVkVmlldyB8fCB2YWx1ZSBpbnN0YW5jZW9mIFZlY3RvcikpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IGluIHR5cGVJZHMpIHsgc2VsZi5nZXRDaGlsZEF0KHR5cGVJZHNba2V5XSkuc2V0KGluZGV4LCB2YWx1ZVtrZXldKTsgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gdHlwZUlkcykgeyBzZWxmLmdldENoaWxkQXQodHlwZUlkc1trZXldKS5zZXQoaW5kZXgsIHZhbHVlLmdldChrZXkgYXMgYW55KSk7IH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFJvd1ZpZXcgZXh0ZW5kcyBVbmlvblZpZXc8U3BhcnNlVW5pb24+IHtcbiAgICBwcm90ZWN0ZWQgcm93SW5kZXg6IG51bWJlcjtcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPFNwYXJzZVVuaW9uPiAmIE5lc3RlZFZpZXc8YW55PiwgY2hpbGRyZW4/OiBWZWN0b3I8YW55PltdLCByb3dJbmRleD86IG51bWJlcikge1xuICAgICAgICBzdXBlcihkYXRhLCBjaGlsZHJlbik7XG4gICAgICAgIHRoaXMucm93SW5kZXggPSByb3dJbmRleCB8fCAwO1xuICAgICAgICB0aGlzLmxlbmd0aCA9IGRhdGEubnVtQ2hpbGRyZW47XG4gICAgfVxuICAgIHB1YmxpYyBjbG9uZShkYXRhOiBEYXRhPFNwYXJzZVVuaW9uPiAmIE5lc3RlZFZpZXc8YW55Pik6IHRoaXMge1xuICAgICAgICByZXR1cm4gbmV3ICg8YW55PiB0aGlzLmNvbnN0cnVjdG9yKShkYXRhLCB0aGlzLmNoaWxkcmVuLCB0aGlzLnJvd0luZGV4KSBhcyB0aGlzO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgZ2V0Q2hpbGRWYWx1ZShzZWxmOiBSb3dWaWV3LCBpbmRleDogbnVtYmVyLCBfdHlwZUlkczogYW55LCBfdmFsdWVPZmZzZXRzPzogYW55KTogYW55IHwgbnVsbCB7XG4gICAgICAgIGNvbnN0IGNoaWxkID0gc2VsZi5nZXRDaGlsZEF0KGluZGV4KTtcbiAgICAgICAgcmV0dXJuIGNoaWxkID8gY2hpbGQuZ2V0KHNlbGYucm93SW5kZXgpIDogbnVsbDtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHNldENoaWxkVmFsdWUoc2VsZjogUm93VmlldywgaW5kZXg6IG51bWJlciwgdmFsdWU6IGFueSwgX3R5cGVJZHM6IGFueSwgX3ZhbHVlT2Zmc2V0cz86IGFueSk6IGFueSB8IG51bGwge1xuICAgICAgICBjb25zdCBjaGlsZCA9IHNlbGYuZ2V0Q2hpbGRBdChpbmRleCk7XG4gICAgICAgIHJldHVybiBjaGlsZCA/IGNoaWxkLnNldChzZWxmLnJvd0luZGV4LCB2YWx1ZSkgOiBudWxsO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIE1hcFJvd1ZpZXcgZXh0ZW5kcyBSb3dWaWV3IHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIHR5cGVJZHM6IGFueTtcbiAgICBwdWJsaWMgdG9KU09OKCkge1xuICAgICAgICBjb25zdCBnZXQgPSB0aGlzLmdldENoaWxkVmFsdWU7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHt9IGFzIHsgW2s6IHN0cmluZ106IGFueSB9O1xuICAgICAgICBjb25zdCB0eXBlSWRzID0gdGhpcy50eXBlSWRzIGFzIHsgW2s6IHN0cmluZ106IG51bWJlciB9O1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgaW4gdHlwZUlkcykge1xuICAgICAgICAgICAgcmVzdWx0W25hbWVdID0gZ2V0KHRoaXMsIG5hbWUsIHR5cGVJZHMsIG51bGwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIHByb3RlY3RlZCBnZXRDaGlsZFZhbHVlKHNlbGY6IE1hcFJvd1ZpZXcsIGtleTogYW55LCB0eXBlSWRzOiBhbnksIF92YWx1ZU9mZnNldHM6IGFueSk6IGFueSB8IG51bGwge1xuICAgICAgICBjb25zdCBjaGlsZCA9IHNlbGYuZ2V0Q2hpbGRBdCh0eXBlSWRzW2tleV0pO1xuICAgICAgICByZXR1cm4gY2hpbGQgPyBjaGlsZC5nZXQoc2VsZi5yb3dJbmRleCkgOiBudWxsO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgc2V0Q2hpbGRWYWx1ZShzZWxmOiBNYXBSb3dWaWV3LCBrZXk6IGFueSwgdmFsdWU6IGFueSwgdHlwZUlkczogYW55LCBfdmFsdWVPZmZzZXRzPzogYW55KTogYW55IHwgbnVsbCB7XG4gICAgICAgIGNvbnN0IGNoaWxkID0gc2VsZi5nZXRDaGlsZEF0KHR5cGVJZHNba2V5XSk7XG4gICAgICAgIHJldHVybiBjaGlsZCA/IGNoaWxkLnNldChzZWxmLnJvd0luZGV4LCB2YWx1ZSkgOiBudWxsO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gc3RyaW5naWZ5KHg6IGFueSkge1xuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ3N0cmluZycgPyBgXCIke3h9XCJgIDogQXJyYXkuaXNBcnJheSh4KSA/IEpTT04uc3RyaW5naWZ5KHgpIDogQXJyYXlCdWZmZXIuaXNWaWV3KHgpID8gYFske3h9XWAgOiBgJHt4fWA7XG59XG4iXX0=

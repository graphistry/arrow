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
        this._children = children || new Array(this.numChildren);
    }
    clone(data) {
        return new this.constructor(data, this._children);
    }
    isValid() {
        return true;
    }
    toArray() {
        return [...this];
    }
    indexOf(_) {
        throw new Error(`Not implemented yet`);
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
        return index < 0 || index >= this.numChildren
            ? null
            : this._children[index] ||
                (this._children[index] = vector_1.Vector.create(this.childData[index]));
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
        return new RowView(self, self._children, index);
    }
    setNested(self, index, value) {
        let idx = -1, len = self.numChildren, child;
        if (!(value instanceof NestedView || value instanceof vector_1.Vector)) {
            while (++idx < len) {
                if (child = self.getChildAt(idx)) {
                    child.set(index, value[idx]);
                }
            }
        }
        else {
            while (++idx < len) {
                if (child = self.getChildAt(idx)) {
                    child.set(index, value.get(idx));
                }
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
        return new MapRowView(self, self._children, index);
    }
    setNested(self, index, value) {
        let typeIds = self.typeIds, child;
        if (!(value instanceof NestedView || value instanceof vector_1.Vector)) {
            for (const key in typeIds) {
                if (child = self.getChildAt(typeIds[key])) {
                    child.set(index, value[key]);
                }
            }
        }
        else {
            for (const key in typeIds) {
                if (child = self.getChildAt(typeIds[key])) {
                    child.set(index, value.get(key));
                }
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
        return new this.constructor(data, this._children, this.rowIndex);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzVDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDbkQsQ0FBQztJQUNTLGFBQWEsQ0FBQyxJQUFnQixFQUFFLEdBQVEsRUFBRSxLQUFVLEVBQUUsT0FBWSxFQUFFLGFBQW1CO1FBQzdGLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDNUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDMUQsQ0FBQztDQUNKO0FBcEJELGdDQW9CQztBQUVELG1CQUFtQixDQUFNO0lBQ3JCLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7QUFDL0gsQ0FBQyIsImZpbGUiOiJ2ZWN0b3IvbmVzdGVkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IERhdGEgfSBmcm9tICcuLi9kYXRhJztcbmltcG9ydCB7IFZpZXcsIFZlY3RvciB9IGZyb20gJy4uL3ZlY3Rvcic7XG5pbXBvcnQgeyBJdGVyYWJsZUFycmF5TGlrZSB9IGZyb20gJy4uL3R5cGUnO1xuaW1wb3J0IHsgRGF0YVR5cGUsIE5lc3RlZFR5cGUsIERlbnNlVW5pb24sIFNwYXJzZVVuaW9uLCBTdHJ1Y3QsIE1hcF8gfSBmcm9tICcuLi90eXBlJztcblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIE5lc3RlZFZpZXc8VCBleHRlbmRzIE5lc3RlZFR5cGU+IGltcGxlbWVudHMgVmlldzxUPiB7XG4gICAgcHVibGljIGxlbmd0aDogbnVtYmVyO1xuICAgIHB1YmxpYyBudW1DaGlsZHJlbjogbnVtYmVyO1xuICAgIHB1YmxpYyBjaGlsZERhdGE6IERhdGE8YW55PltdO1xuICAgIHByb3RlY3RlZCBfY2hpbGRyZW46IFZlY3Rvcjxhbnk+W107XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxUPiwgY2hpbGRyZW4/OiBWZWN0b3I8YW55PltdKSB7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gZGF0YS5sZW5ndGg7XG4gICAgICAgIHRoaXMuY2hpbGREYXRhID0gZGF0YS5jaGlsZERhdGE7XG4gICAgICAgIHRoaXMubnVtQ2hpbGRyZW4gPSBkYXRhLmNoaWxkRGF0YS5sZW5ndGg7XG4gICAgICAgIHRoaXMuX2NoaWxkcmVuID0gY2hpbGRyZW4gfHwgbmV3IEFycmF5KHRoaXMubnVtQ2hpbGRyZW4pO1xuICAgIH1cbiAgICBwdWJsaWMgY2xvbmUoZGF0YTogRGF0YTxUPik6IHRoaXMge1xuICAgICAgICByZXR1cm4gbmV3ICg8YW55PiB0aGlzLmNvbnN0cnVjdG9yKShkYXRhLCB0aGlzLl9jaGlsZHJlbikgYXMgdGhpcztcbiAgICB9XG4gICAgcHVibGljIGlzVmFsaWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBwdWJsaWMgdG9BcnJheSgpOiBJdGVyYWJsZUFycmF5TGlrZTxUWydUVmFsdWUnXT4ge1xuICAgICAgICByZXR1cm4gWy4uLnRoaXNdO1xuICAgIH1cbiAgICBwdWJsaWMgaW5kZXhPZihfOiBUWydUVmFsdWUnXSk6IG51bWJlciB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTm90IGltcGxlbWVudGVkIHlldGApO1xuICAgIH1cbiAgICBwdWJsaWMgdG9KU09OKCk6IGFueSB7IHJldHVybiB0aGlzLnRvQXJyYXkoKTsgfVxuICAgIHB1YmxpYyB0b1N0cmluZygpIHtcbiAgICAgICAgcmV0dXJuIFsuLi50aGlzXS5tYXAoKHgpID0+IHN0cmluZ2lmeSh4KSkuam9pbignLCAnKTtcbiAgICB9XG4gICAgcHVibGljIGdldChpbmRleDogbnVtYmVyKTogVFsnVFZhbHVlJ10ge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXROZXN0ZWQodGhpcywgaW5kZXgpO1xuICAgIH1cbiAgICBwdWJsaWMgc2V0KGluZGV4OiBudW1iZXIsIHZhbHVlOiBUWydUVmFsdWUnXSk6IHZvaWQge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXROZXN0ZWQodGhpcywgaW5kZXgsIHZhbHVlKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIGFic3RyYWN0IGdldE5lc3RlZChzZWxmOiBOZXN0ZWRWaWV3PFQ+LCBpbmRleDogbnVtYmVyKTogVFsnVFZhbHVlJ107XG4gICAgcHJvdGVjdGVkIGFic3RyYWN0IHNldE5lc3RlZChzZWxmOiBOZXN0ZWRWaWV3PFQ+LCBpbmRleDogbnVtYmVyLCB2YWx1ZTogVFsnVFZhbHVlJ10pOiB2b2lkO1xuICAgIHB1YmxpYyBnZXRDaGlsZEF0PFIgZXh0ZW5kcyBEYXRhVHlwZSA9IERhdGFUeXBlPihpbmRleDogbnVtYmVyKTogVmVjdG9yPFI+IHwgbnVsbCB7XG4gICAgICAgIHJldHVybiBpbmRleCA8IDAgfHwgaW5kZXggPj0gdGhpcy5udW1DaGlsZHJlblxuICAgICAgICAgICAgPyBudWxsXG4gICAgICAgICAgICA6ICh0aGlzLl9jaGlsZHJlbltpbmRleF0gYXMgVmVjdG9yPFI+KSB8fFxuICAgICAgICAgICAgICAodGhpcy5fY2hpbGRyZW5baW5kZXhdID0gVmVjdG9yLmNyZWF0ZTxSPih0aGlzLmNoaWxkRGF0YVtpbmRleF0pKTtcbiAgICB9XG4gICAgcHVibGljICpbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFRbJ1RWYWx1ZSddPiB7XG4gICAgICAgIGNvbnN0IGdldCA9IHRoaXMuZ2V0TmVzdGVkO1xuICAgICAgICBjb25zdCBsZW5ndGggPSB0aGlzLmxlbmd0aDtcbiAgICAgICAgZm9yIChsZXQgaW5kZXggPSAtMTsgKytpbmRleCA8IGxlbmd0aDspIHtcbiAgICAgICAgICAgIHlpZWxkIGdldCh0aGlzLCBpbmRleCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBVbmlvblZpZXc8VCBleHRlbmRzIChEZW5zZVVuaW9uIHwgU3BhcnNlVW5pb24pID0gU3BhcnNlVW5pb24+IGV4dGVuZHMgTmVzdGVkVmlldzxUPiB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyB0eXBlSWRzOiBJbnQ4QXJyYXk7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyB2YWx1ZU9mZnNldHM/OiBJbnQzMkFycmF5O1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8VD4sIGNoaWxkcmVuPzogVmVjdG9yPGFueT5bXSkge1xuICAgICAgICBzdXBlcihkYXRhLCBjaGlsZHJlbik7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gZGF0YS5sZW5ndGg7XG4gICAgICAgIHRoaXMudHlwZUlkcyA9IGRhdGEudHlwZUlkcztcbiAgICB9XG4gICAgcHJvdGVjdGVkIGdldE5lc3RlZChzZWxmOiBVbmlvblZpZXc8VD4sIGluZGV4OiBudW1iZXIpOiBUWydUVmFsdWUnXSB7XG4gICAgICAgIHJldHVybiBzZWxmLmdldENoaWxkVmFsdWUoc2VsZiwgaW5kZXgsIHNlbGYudHlwZUlkcywgc2VsZi52YWx1ZU9mZnNldHMpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgc2V0TmVzdGVkKHNlbGY6IFVuaW9uVmlldzxUPiwgaW5kZXg6IG51bWJlciwgdmFsdWU6IFRbJ1RWYWx1ZSddKTogdm9pZCB7XG4gICAgICAgIHJldHVybiBzZWxmLnNldENoaWxkVmFsdWUoc2VsZiwgaW5kZXgsIHZhbHVlLCBzZWxmLnR5cGVJZHMsIHNlbGYudmFsdWVPZmZzZXRzKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIGdldENoaWxkVmFsdWUoc2VsZjogTmVzdGVkVmlldzxUPiwgaW5kZXg6IG51bWJlciwgdHlwZUlkczogSW50OEFycmF5LCBfdmFsdWVPZmZzZXRzPzogYW55KTogYW55IHwgbnVsbCB7XG4gICAgICAgIGNvbnN0IGNoaWxkID0gc2VsZi5nZXRDaGlsZEF0KHR5cGVJZHNbaW5kZXhdKTtcbiAgICAgICAgcmV0dXJuIGNoaWxkID8gY2hpbGQuZ2V0KGluZGV4KSA6IG51bGw7XG4gICAgfVxuICAgIHByb3RlY3RlZCBzZXRDaGlsZFZhbHVlKHNlbGY6IE5lc3RlZFZpZXc8VD4sIGluZGV4OiBudW1iZXIsIHZhbHVlOiBUWydUVmFsdWUnXSwgdHlwZUlkczogSW50OEFycmF5LCBfdmFsdWVPZmZzZXRzPzogYW55KTogYW55IHwgbnVsbCB7XG4gICAgICAgIGNvbnN0IGNoaWxkID0gc2VsZi5nZXRDaGlsZEF0KHR5cGVJZHNbaW5kZXhdKTtcbiAgICAgICAgcmV0dXJuIGNoaWxkID8gY2hpbGQuc2V0KGluZGV4LCB2YWx1ZSkgOiBudWxsO1xuICAgIH1cbiAgICBwdWJsaWMgKltTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VFsnVFZhbHVlJ10+IHtcbiAgICAgICAgY29uc3QgbGVuZ3RoID0gdGhpcy5sZW5ndGg7XG4gICAgICAgIGNvbnN0IGdldCA9IHRoaXMuZ2V0Q2hpbGRWYWx1ZTtcbiAgICAgICAgY29uc3QgeyB0eXBlSWRzLCB2YWx1ZU9mZnNldHMgfSA9IHRoaXM7XG4gICAgICAgIGZvciAobGV0IGluZGV4ID0gLTE7ICsraW5kZXggPCBsZW5ndGg7KSB7XG4gICAgICAgICAgICB5aWVsZCBnZXQodGhpcywgaW5kZXgsIHR5cGVJZHMsIHZhbHVlT2Zmc2V0cyk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBEZW5zZVVuaW9uVmlldyBleHRlbmRzIFVuaW9uVmlldzxEZW5zZVVuaW9uPiB7XG4gICAgcHVibGljIHZhbHVlT2Zmc2V0czogSW50MzJBcnJheTtcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPERlbnNlVW5pb24+LCBjaGlsZHJlbj86IFZlY3Rvcjxhbnk+W10pIHtcbiAgICAgICAgc3VwZXIoZGF0YSwgY2hpbGRyZW4pO1xuICAgICAgICB0aGlzLnZhbHVlT2Zmc2V0cyA9IGRhdGEudmFsdWVPZmZzZXRzO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgZ2V0TmVzdGVkKHNlbGY6IERlbnNlVW5pb25WaWV3LCBpbmRleDogbnVtYmVyKTogYW55IHwgbnVsbCB7XG4gICAgICAgIHJldHVybiBzZWxmLmdldENoaWxkVmFsdWUoc2VsZiwgaW5kZXgsIHNlbGYudHlwZUlkcywgc2VsZi52YWx1ZU9mZnNldHMpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgZ2V0Q2hpbGRWYWx1ZShzZWxmOiBOZXN0ZWRWaWV3PERlbnNlVW5pb24+LCBpbmRleDogbnVtYmVyLCB0eXBlSWRzOiBJbnQ4QXJyYXksIHZhbHVlT2Zmc2V0czogYW55KTogYW55IHwgbnVsbCB7XG4gICAgICAgIGNvbnN0IGNoaWxkID0gc2VsZi5nZXRDaGlsZEF0KHR5cGVJZHNbaW5kZXhdKTtcbiAgICAgICAgcmV0dXJuIGNoaWxkID8gY2hpbGQuZ2V0KHZhbHVlT2Zmc2V0c1tpbmRleF0pIDogbnVsbDtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHNldENoaWxkVmFsdWUoc2VsZjogTmVzdGVkVmlldzxEZW5zZVVuaW9uPiwgaW5kZXg6IG51bWJlciwgdmFsdWU6IGFueSwgdHlwZUlkczogSW50OEFycmF5LCB2YWx1ZU9mZnNldHM/OiBhbnkpOiBhbnkgfCBudWxsIHtcbiAgICAgICAgY29uc3QgY2hpbGQgPSBzZWxmLmdldENoaWxkQXQodHlwZUlkc1tpbmRleF0pO1xuICAgICAgICByZXR1cm4gY2hpbGQgPyBjaGlsZC5zZXQodmFsdWVPZmZzZXRzW2luZGV4XSwgdmFsdWUpIDogbnVsbDtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBTdHJ1Y3RWaWV3IGV4dGVuZHMgTmVzdGVkVmlldzxTdHJ1Y3Q+IHtcbiAgICBwcm90ZWN0ZWQgZ2V0TmVzdGVkKHNlbGY6IFN0cnVjdFZpZXcsIGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSb3dWaWV3KHNlbGYgYXMgYW55LCBzZWxmLl9jaGlsZHJlbiwgaW5kZXgpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgc2V0TmVzdGVkKHNlbGY6IFN0cnVjdFZpZXcsIGluZGV4OiBudW1iZXIsIHZhbHVlOiBhbnkpOiB2b2lkIHtcbiAgICAgICAgbGV0IGlkeCA9IC0xLCBsZW4gPSBzZWxmLm51bUNoaWxkcmVuLCBjaGlsZDogVmVjdG9yIHwgbnVsbDtcbiAgICAgICAgaWYgKCEodmFsdWUgaW5zdGFuY2VvZiBOZXN0ZWRWaWV3IHx8IHZhbHVlIGluc3RhbmNlb2YgVmVjdG9yKSkge1xuICAgICAgICAgICAgd2hpbGUgKCsraWR4IDwgbGVuKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNoaWxkID0gc2VsZi5nZXRDaGlsZEF0KGlkeCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGQuc2V0KGluZGV4LCB2YWx1ZVtpZHhdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB3aGlsZSAoKytpZHggPCBsZW4pIHtcbiAgICAgICAgICAgICAgICBpZiAoY2hpbGQgPSBzZWxmLmdldENoaWxkQXQoaWR4KSkge1xuICAgICAgICAgICAgICAgICAgICBjaGlsZC5zZXQoaW5kZXgsIHZhbHVlLmdldChpZHgpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBNYXBWaWV3IGV4dGVuZHMgTmVzdGVkVmlldzxNYXBfPiB7XG4gICAgcHVibGljIHR5cGVJZHM6IHsgW2s6IHN0cmluZ106IG51bWJlciB9O1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8TWFwXz4sIGNoaWxkcmVuPzogVmVjdG9yPGFueT5bXSkge1xuICAgICAgICBzdXBlcihkYXRhLCBjaGlsZHJlbik7XG4gICAgICAgIHRoaXMudHlwZUlkcyA9IGRhdGEudHlwZS5jaGlsZHJlbi5yZWR1Y2UoKHhzLCB4LCBpKSA9PlxuICAgICAgICAgICAgKHhzW3gubmFtZV0gPSBpKSAmJiB4cyB8fCB4cywgT2JqZWN0LmNyZWF0ZShudWxsKSk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBnZXROZXN0ZWQoc2VsZjogTWFwVmlldywgaW5kZXg6IG51bWJlcikge1xuICAgICAgICByZXR1cm4gbmV3IE1hcFJvd1ZpZXcoc2VsZiBhcyBhbnksIHNlbGYuX2NoaWxkcmVuLCBpbmRleCk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBzZXROZXN0ZWQoc2VsZjogTWFwVmlldywgaW5kZXg6IG51bWJlciwgdmFsdWU6IHsgW2s6IHN0cmluZ106IGFueSB9KTogdm9pZCB7XG4gICAgICAgIGxldCB0eXBlSWRzID0gc2VsZi50eXBlSWRzIGFzIGFueSwgY2hpbGQ6IFZlY3RvciB8IG51bGw7XG4gICAgICAgIGlmICghKHZhbHVlIGluc3RhbmNlb2YgTmVzdGVkVmlldyB8fCB2YWx1ZSBpbnN0YW5jZW9mIFZlY3RvcikpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IGluIHR5cGVJZHMpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2hpbGQgPSBzZWxmLmdldENoaWxkQXQodHlwZUlkc1trZXldKSkge1xuICAgICAgICAgICAgICAgICAgICBjaGlsZC5zZXQoaW5kZXgsIHZhbHVlW2tleV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IGluIHR5cGVJZHMpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2hpbGQgPSBzZWxmLmdldENoaWxkQXQodHlwZUlkc1trZXldKSkge1xuICAgICAgICAgICAgICAgICAgICBjaGlsZC5zZXQoaW5kZXgsIHZhbHVlLmdldChrZXkgYXMgYW55KSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgUm93VmlldyBleHRlbmRzIFVuaW9uVmlldzxTcGFyc2VVbmlvbj4ge1xuICAgIHByb3RlY3RlZCByb3dJbmRleDogbnVtYmVyO1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8U3BhcnNlVW5pb24+ICYgTmVzdGVkVmlldzxhbnk+LCBjaGlsZHJlbj86IFZlY3Rvcjxhbnk+W10sIHJvd0luZGV4PzogbnVtYmVyKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIGNoaWxkcmVuKTtcbiAgICAgICAgdGhpcy5yb3dJbmRleCA9IHJvd0luZGV4IHx8IDA7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gZGF0YS5udW1DaGlsZHJlbjtcbiAgICB9XG4gICAgcHVibGljIGNsb25lKGRhdGE6IERhdGE8U3BhcnNlVW5pb24+ICYgTmVzdGVkVmlldzxhbnk+KTogdGhpcyB7XG4gICAgICAgIHJldHVybiBuZXcgKDxhbnk+IHRoaXMuY29uc3RydWN0b3IpKGRhdGEsIHRoaXMuX2NoaWxkcmVuLCB0aGlzLnJvd0luZGV4KSBhcyB0aGlzO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgZ2V0Q2hpbGRWYWx1ZShzZWxmOiBSb3dWaWV3LCBpbmRleDogbnVtYmVyLCBfdHlwZUlkczogYW55LCBfdmFsdWVPZmZzZXRzPzogYW55KTogYW55IHwgbnVsbCB7XG4gICAgICAgIGNvbnN0IGNoaWxkID0gc2VsZi5nZXRDaGlsZEF0KGluZGV4KTtcbiAgICAgICAgcmV0dXJuIGNoaWxkID8gY2hpbGQuZ2V0KHNlbGYucm93SW5kZXgpIDogbnVsbDtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHNldENoaWxkVmFsdWUoc2VsZjogUm93VmlldywgaW5kZXg6IG51bWJlciwgdmFsdWU6IGFueSwgX3R5cGVJZHM6IGFueSwgX3ZhbHVlT2Zmc2V0cz86IGFueSk6IGFueSB8IG51bGwge1xuICAgICAgICBjb25zdCBjaGlsZCA9IHNlbGYuZ2V0Q2hpbGRBdChpbmRleCk7XG4gICAgICAgIHJldHVybiBjaGlsZCA/IGNoaWxkLnNldChzZWxmLnJvd0luZGV4LCB2YWx1ZSkgOiBudWxsO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIE1hcFJvd1ZpZXcgZXh0ZW5kcyBSb3dWaWV3IHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIHR5cGVJZHM6IGFueTtcbiAgICBwdWJsaWMgdG9KU09OKCkge1xuICAgICAgICBjb25zdCBnZXQgPSB0aGlzLmdldENoaWxkVmFsdWU7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHt9IGFzIHsgW2s6IHN0cmluZ106IGFueSB9O1xuICAgICAgICBjb25zdCB0eXBlSWRzID0gdGhpcy50eXBlSWRzIGFzIHsgW2s6IHN0cmluZ106IG51bWJlciB9O1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgaW4gdHlwZUlkcykge1xuICAgICAgICAgICAgcmVzdWx0W25hbWVdID0gZ2V0KHRoaXMsIG5hbWUsIHR5cGVJZHMsIG51bGwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIHByb3RlY3RlZCBnZXRDaGlsZFZhbHVlKHNlbGY6IE1hcFJvd1ZpZXcsIGtleTogYW55LCB0eXBlSWRzOiBhbnksIF92YWx1ZU9mZnNldHM6IGFueSk6IGFueSB8IG51bGwge1xuICAgICAgICBjb25zdCBjaGlsZCA9IHNlbGYuZ2V0Q2hpbGRBdCh0eXBlSWRzW2tleV0pO1xuICAgICAgICByZXR1cm4gY2hpbGQgPyBjaGlsZC5nZXQoc2VsZi5yb3dJbmRleCkgOiBudWxsO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgc2V0Q2hpbGRWYWx1ZShzZWxmOiBNYXBSb3dWaWV3LCBrZXk6IGFueSwgdmFsdWU6IGFueSwgdHlwZUlkczogYW55LCBfdmFsdWVPZmZzZXRzPzogYW55KTogYW55IHwgbnVsbCB7XG4gICAgICAgIGNvbnN0IGNoaWxkID0gc2VsZi5nZXRDaGlsZEF0KHR5cGVJZHNba2V5XSk7XG4gICAgICAgIHJldHVybiBjaGlsZCA/IGNoaWxkLnNldChzZWxmLnJvd0luZGV4LCB2YWx1ZSkgOiBudWxsO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gc3RyaW5naWZ5KHg6IGFueSkge1xuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ3N0cmluZycgPyBgXCIke3h9XCJgIDogQXJyYXkuaXNBcnJheSh4KSA/IEpTT04uc3RyaW5naWZ5KHgpIDogQXJyYXlCdWZmZXIuaXNWaWV3KHgpID8gYFske3h9XWAgOiBgJHt4fWA7XG59XG4iXX0=

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
export class NestedView {
    constructor(data, children) {
        this.length = data.length;
        this.childData = data.childData;
        this.numChildren = data.childData.length;
        this._childColumns = children || new Array(this.numChildren);
    }
    clone(data) {
        return new this.constructor(data, this._childColumns);
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
        return this._childColumns[index] || (this._childColumns[index] = Vector.create(this.childData[index]));
    }
    *[Symbol.iterator]() {
        const get = this.getNested;
        const length = this.length;
        for (let index = -1; ++index < length;) {
            yield get(this, index);
        }
    }
}
export class UnionView extends NestedView {
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
export class DenseUnionView extends UnionView {
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
export class StructView extends NestedView {
    getNested(self, index) {
        return new RowView(self, self._childColumns, index);
    }
    setNested(self, index, value) {
        let idx = -1, len = self.numChildren;
        if (!(value instanceof NestedView || value instanceof Vector)) {
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
export class MapView extends NestedView {
    constructor(data, children) {
        super(data, children);
        this.typeIds = data.type.children.reduce((xs, x, i) => (xs[x.name] = i) && xs || xs, Object.create(null));
    }
    getNested(self, index) {
        return new MapRowView(self, self._childColumns, index);
    }
    setNested(self, index, value) {
        const typeIds = self.typeIds;
        if (!(value instanceof NestedView || value instanceof Vector)) {
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
export class RowView extends UnionView {
    constructor(data, children, rowIndex) {
        super(data, children);
        this.rowIndex = rowIndex || 0;
        this.length = data.numChildren;
    }
    clone(data) {
        return new this.constructor(data, this._childColumns, this.rowIndex);
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
export class MapRowView extends RowView {
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
function stringify(x) {
    return typeof x === 'string' ? `"${x}"` : Array.isArray(x) ? JSON.stringify(x) : ArrayBuffer.isView(x) ? `[${x}]` : `${x}`;
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7QUFDL0gsQ0FBQyIsImZpbGUiOiJ2ZWN0b3IvbmVzdGVkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IERhdGEgfSBmcm9tICcuLi9kYXRhJztcbmltcG9ydCB7IFZpZXcsIFZlY3RvciB9IGZyb20gJy4uL3ZlY3Rvcic7XG5pbXBvcnQgeyBJdGVyYWJsZUFycmF5TGlrZSB9IGZyb20gJy4uL3R5cGUnO1xuaW1wb3J0IHsgRGF0YVR5cGUsIE5lc3RlZFR5cGUsIERlbnNlVW5pb24sIFNwYXJzZVVuaW9uLCBTdHJ1Y3QsIE1hcF8gfSBmcm9tICcuLi90eXBlJztcblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIE5lc3RlZFZpZXc8VCBleHRlbmRzIE5lc3RlZFR5cGU+IGltcGxlbWVudHMgVmlldzxUPiB7XG4gICAgcHVibGljIGxlbmd0aDogbnVtYmVyO1xuICAgIHB1YmxpYyBudW1DaGlsZHJlbjogbnVtYmVyO1xuICAgIHB1YmxpYyBjaGlsZERhdGE6IERhdGE8YW55PltdO1xuICAgIHByb3RlY3RlZCBfY2hpbGRDb2x1bW5zOiBWZWN0b3I8YW55PltdO1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8VD4sIGNoaWxkcmVuPzogVmVjdG9yPGFueT5bXSkge1xuICAgICAgICB0aGlzLmxlbmd0aCA9IGRhdGEubGVuZ3RoO1xuICAgICAgICB0aGlzLmNoaWxkRGF0YSA9IGRhdGEuY2hpbGREYXRhO1xuICAgICAgICB0aGlzLm51bUNoaWxkcmVuID0gZGF0YS5jaGlsZERhdGEubGVuZ3RoO1xuICAgICAgICB0aGlzLl9jaGlsZENvbHVtbnMgPSBjaGlsZHJlbiB8fCBuZXcgQXJyYXkodGhpcy5udW1DaGlsZHJlbik7XG4gICAgfVxuICAgIHB1YmxpYyBjbG9uZShkYXRhOiBEYXRhPFQ+KTogdGhpcyB7XG4gICAgICAgIHJldHVybiBuZXcgKDxhbnk+IHRoaXMuY29uc3RydWN0b3IpKGRhdGEsIHRoaXMuX2NoaWxkQ29sdW1ucykgYXMgdGhpcztcbiAgICB9XG4gICAgcHVibGljIGlzVmFsaWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBwdWJsaWMgdG9BcnJheSgpOiBJdGVyYWJsZUFycmF5TGlrZTxUWydUVmFsdWUnXT4ge1xuICAgICAgICByZXR1cm4gWy4uLnRoaXNdO1xuICAgIH1cbiAgICBwdWJsaWMgdG9KU09OKCk6IGFueSB7IHJldHVybiB0aGlzLnRvQXJyYXkoKTsgfVxuICAgIHB1YmxpYyB0b1N0cmluZygpIHtcbiAgICAgICAgcmV0dXJuIFsuLi50aGlzXS5tYXAoKHgpID0+IHN0cmluZ2lmeSh4KSkuam9pbignLCAnKTtcbiAgICB9XG4gICAgcHVibGljIGdldChpbmRleDogbnVtYmVyKTogVFsnVFZhbHVlJ10ge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXROZXN0ZWQodGhpcywgaW5kZXgpO1xuICAgIH1cbiAgICBwdWJsaWMgc2V0KGluZGV4OiBudW1iZXIsIHZhbHVlOiBUWydUVmFsdWUnXSk6IHZvaWQge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXROZXN0ZWQodGhpcywgaW5kZXgsIHZhbHVlKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIGFic3RyYWN0IGdldE5lc3RlZChzZWxmOiBOZXN0ZWRWaWV3PFQ+LCBpbmRleDogbnVtYmVyKTogVFsnVFZhbHVlJ107XG4gICAgcHJvdGVjdGVkIGFic3RyYWN0IHNldE5lc3RlZChzZWxmOiBOZXN0ZWRWaWV3PFQ+LCBpbmRleDogbnVtYmVyLCB2YWx1ZTogVFsnVFZhbHVlJ10pOiB2b2lkO1xuICAgIHB1YmxpYyBnZXRDaGlsZEF0PFIgZXh0ZW5kcyBEYXRhVHlwZSA9IERhdGFUeXBlPihpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jaGlsZENvbHVtbnNbaW5kZXhdIHx8IChcbiAgICAgICAgICAgICAgIHRoaXMuX2NoaWxkQ29sdW1uc1tpbmRleF0gPSBWZWN0b3IuY3JlYXRlPFI+KHRoaXMuY2hpbGREYXRhW2luZGV4XSkpO1xuICAgIH1cbiAgICBwdWJsaWMgKltTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VFsnVFZhbHVlJ10+IHtcbiAgICAgICAgY29uc3QgZ2V0ID0gdGhpcy5nZXROZXN0ZWQ7XG4gICAgICAgIGNvbnN0IGxlbmd0aCA9IHRoaXMubGVuZ3RoO1xuICAgICAgICBmb3IgKGxldCBpbmRleCA9IC0xOyArK2luZGV4IDwgbGVuZ3RoOykge1xuICAgICAgICAgICAgeWllbGQgZ2V0KHRoaXMsIGluZGV4KTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFVuaW9uVmlldzxUIGV4dGVuZHMgKERlbnNlVW5pb24gfCBTcGFyc2VVbmlvbikgPSBTcGFyc2VVbmlvbj4gZXh0ZW5kcyBOZXN0ZWRWaWV3PFQ+IHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIHR5cGVJZHM6IEludDhBcnJheTtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIHZhbHVlT2Zmc2V0cz86IEludDMyQXJyYXk7XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxUPiwgY2hpbGRyZW4/OiBWZWN0b3I8YW55PltdKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIGNoaWxkcmVuKTtcbiAgICAgICAgdGhpcy5sZW5ndGggPSBkYXRhLmxlbmd0aDtcbiAgICAgICAgdGhpcy50eXBlSWRzID0gZGF0YS50eXBlSWRzO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgZ2V0TmVzdGVkKHNlbGY6IFVuaW9uVmlldzxUPiwgaW5kZXg6IG51bWJlcik6IFRbJ1RWYWx1ZSddIHtcbiAgICAgICAgcmV0dXJuIHNlbGYuZ2V0Q2hpbGRWYWx1ZShzZWxmLCBpbmRleCwgc2VsZi50eXBlSWRzLCBzZWxmLnZhbHVlT2Zmc2V0cyk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBzZXROZXN0ZWQoc2VsZjogVW5pb25WaWV3PFQ+LCBpbmRleDogbnVtYmVyLCB2YWx1ZTogVFsnVFZhbHVlJ10pOiB2b2lkIHtcbiAgICAgICAgcmV0dXJuIHNlbGYuc2V0Q2hpbGRWYWx1ZShzZWxmLCBpbmRleCwgdmFsdWUsIHNlbGYudHlwZUlkcywgc2VsZi52YWx1ZU9mZnNldHMpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgZ2V0Q2hpbGRWYWx1ZShzZWxmOiBOZXN0ZWRWaWV3PFQ+LCBpbmRleDogbnVtYmVyLCB0eXBlSWRzOiBJbnQ4QXJyYXksIF92YWx1ZU9mZnNldHM/OiBhbnkpOiBhbnkgfCBudWxsIHtcbiAgICAgICAgY29uc3QgY2hpbGQgPSBzZWxmLmdldENoaWxkQXQodHlwZUlkc1tpbmRleF0pO1xuICAgICAgICByZXR1cm4gY2hpbGQgPyBjaGlsZC5nZXQoaW5kZXgpIDogbnVsbDtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHNldENoaWxkVmFsdWUoc2VsZjogTmVzdGVkVmlldzxUPiwgaW5kZXg6IG51bWJlciwgdmFsdWU6IFRbJ1RWYWx1ZSddLCB0eXBlSWRzOiBJbnQ4QXJyYXksIF92YWx1ZU9mZnNldHM/OiBhbnkpOiBhbnkgfCBudWxsIHtcbiAgICAgICAgY29uc3QgY2hpbGQgPSBzZWxmLmdldENoaWxkQXQodHlwZUlkc1tpbmRleF0pO1xuICAgICAgICByZXR1cm4gY2hpbGQgPyBjaGlsZC5zZXQoaW5kZXgsIHZhbHVlKSA6IG51bGw7XG4gICAgfVxuICAgIHB1YmxpYyAqW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxUWydUVmFsdWUnXT4ge1xuICAgICAgICBjb25zdCBsZW5ndGggPSB0aGlzLmxlbmd0aDtcbiAgICAgICAgY29uc3QgZ2V0ID0gdGhpcy5nZXRDaGlsZFZhbHVlO1xuICAgICAgICBjb25zdCB7IHR5cGVJZHMsIHZhbHVlT2Zmc2V0cyB9ID0gdGhpcztcbiAgICAgICAgZm9yIChsZXQgaW5kZXggPSAtMTsgKytpbmRleCA8IGxlbmd0aDspIHtcbiAgICAgICAgICAgIHlpZWxkIGdldCh0aGlzLCBpbmRleCwgdHlwZUlkcywgdmFsdWVPZmZzZXRzKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIERlbnNlVW5pb25WaWV3IGV4dGVuZHMgVW5pb25WaWV3PERlbnNlVW5pb24+IHtcbiAgICBwdWJsaWMgdmFsdWVPZmZzZXRzOiBJbnQzMkFycmF5O1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8RGVuc2VVbmlvbj4sIGNoaWxkcmVuPzogVmVjdG9yPGFueT5bXSkge1xuICAgICAgICBzdXBlcihkYXRhLCBjaGlsZHJlbik7XG4gICAgICAgIHRoaXMudmFsdWVPZmZzZXRzID0gZGF0YS52YWx1ZU9mZnNldHM7XG4gICAgfVxuICAgIHByb3RlY3RlZCBnZXROZXN0ZWQoc2VsZjogRGVuc2VVbmlvblZpZXcsIGluZGV4OiBudW1iZXIpOiBhbnkgfCBudWxsIHtcbiAgICAgICAgcmV0dXJuIHNlbGYuZ2V0Q2hpbGRWYWx1ZShzZWxmLCBpbmRleCwgc2VsZi50eXBlSWRzLCBzZWxmLnZhbHVlT2Zmc2V0cyk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBnZXRDaGlsZFZhbHVlKHNlbGY6IE5lc3RlZFZpZXc8RGVuc2VVbmlvbj4sIGluZGV4OiBudW1iZXIsIHR5cGVJZHM6IEludDhBcnJheSwgdmFsdWVPZmZzZXRzOiBhbnkpOiBhbnkgfCBudWxsIHtcbiAgICAgICAgY29uc3QgY2hpbGQgPSBzZWxmLmdldENoaWxkQXQodHlwZUlkc1tpbmRleF0pO1xuICAgICAgICByZXR1cm4gY2hpbGQgPyBjaGlsZC5nZXQodmFsdWVPZmZzZXRzW2luZGV4XSkgOiBudWxsO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgc2V0Q2hpbGRWYWx1ZShzZWxmOiBOZXN0ZWRWaWV3PERlbnNlVW5pb24+LCBpbmRleDogbnVtYmVyLCB2YWx1ZTogYW55LCB0eXBlSWRzOiBJbnQ4QXJyYXksIHZhbHVlT2Zmc2V0cz86IGFueSk6IGFueSB8IG51bGwge1xuICAgICAgICBjb25zdCBjaGlsZCA9IHNlbGYuZ2V0Q2hpbGRBdCh0eXBlSWRzW2luZGV4XSk7XG4gICAgICAgIHJldHVybiBjaGlsZCA/IGNoaWxkLnNldCh2YWx1ZU9mZnNldHNbaW5kZXhdLCB2YWx1ZSkgOiBudWxsO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFN0cnVjdFZpZXcgZXh0ZW5kcyBOZXN0ZWRWaWV3PFN0cnVjdD4ge1xuICAgIHByb3RlY3RlZCBnZXROZXN0ZWQoc2VsZjogU3RydWN0VmlldywgaW5kZXg6IG51bWJlcikge1xuICAgICAgICByZXR1cm4gbmV3IFJvd1ZpZXcoc2VsZiBhcyBhbnksIHNlbGYuX2NoaWxkQ29sdW1ucywgaW5kZXgpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgc2V0TmVzdGVkKHNlbGY6IFN0cnVjdFZpZXcsIGluZGV4OiBudW1iZXIsIHZhbHVlOiBhbnkpOiB2b2lkIHtcbiAgICAgICAgbGV0IGlkeCA9IC0xLCBsZW4gPSBzZWxmLm51bUNoaWxkcmVuO1xuICAgICAgICBpZiAoISh2YWx1ZSBpbnN0YW5jZW9mIE5lc3RlZFZpZXcgfHwgdmFsdWUgaW5zdGFuY2VvZiBWZWN0b3IpKSB7XG4gICAgICAgICAgICB3aGlsZSAoKytpZHggPCBsZW4pIHsgc2VsZi5nZXRDaGlsZEF0KGlkeCkuc2V0KGluZGV4LCB2YWx1ZVtpZHhdKTsgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2hpbGUgKCsraWR4IDwgbGVuKSB7IHNlbGYuZ2V0Q2hpbGRBdChpZHgpLnNldChpbmRleCwgdmFsdWUuZ2V0KGlkeCkpOyB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBNYXBWaWV3IGV4dGVuZHMgTmVzdGVkVmlldzxNYXBfPiB7XG4gICAgcHVibGljIHR5cGVJZHM6IHsgW2s6IHN0cmluZ106IG51bWJlciB9O1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8TWFwXz4sIGNoaWxkcmVuPzogVmVjdG9yPGFueT5bXSkge1xuICAgICAgICBzdXBlcihkYXRhLCBjaGlsZHJlbik7XG4gICAgICAgIHRoaXMudHlwZUlkcyA9IGRhdGEudHlwZS5jaGlsZHJlbi5yZWR1Y2UoKHhzLCB4LCBpKSA9PlxuICAgICAgICAgICAgKHhzW3gubmFtZV0gPSBpKSAmJiB4cyB8fCB4cywgT2JqZWN0LmNyZWF0ZShudWxsKSk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBnZXROZXN0ZWQoc2VsZjogTWFwVmlldywgaW5kZXg6IG51bWJlcikge1xuICAgICAgICByZXR1cm4gbmV3IE1hcFJvd1ZpZXcoc2VsZiBhcyBhbnksIHNlbGYuX2NoaWxkQ29sdW1ucywgaW5kZXgpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgc2V0TmVzdGVkKHNlbGY6IE1hcFZpZXcsIGluZGV4OiBudW1iZXIsIHZhbHVlOiB7IFtrOiBzdHJpbmddOiBhbnkgfSk6IHZvaWQge1xuICAgICAgICBjb25zdCB0eXBlSWRzID0gc2VsZi50eXBlSWRzIGFzIGFueTtcbiAgICAgICAgaWYgKCEodmFsdWUgaW5zdGFuY2VvZiBOZXN0ZWRWaWV3IHx8IHZhbHVlIGluc3RhbmNlb2YgVmVjdG9yKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gdHlwZUlkcykgeyBzZWxmLmdldENoaWxkQXQodHlwZUlkc1trZXldKS5zZXQoaW5kZXgsIHZhbHVlW2tleV0pOyB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiB0eXBlSWRzKSB7IHNlbGYuZ2V0Q2hpbGRBdCh0eXBlSWRzW2tleV0pLnNldChpbmRleCwgdmFsdWUuZ2V0KGtleSBhcyBhbnkpKTsgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgUm93VmlldyBleHRlbmRzIFVuaW9uVmlldzxTcGFyc2VVbmlvbj4ge1xuICAgIHByb3RlY3RlZCByb3dJbmRleDogbnVtYmVyO1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8U3BhcnNlVW5pb24+ICYgTmVzdGVkVmlldzxhbnk+LCBjaGlsZHJlbj86IFZlY3Rvcjxhbnk+W10sIHJvd0luZGV4PzogbnVtYmVyKSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIGNoaWxkcmVuKTtcbiAgICAgICAgdGhpcy5yb3dJbmRleCA9IHJvd0luZGV4IHx8IDA7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gZGF0YS5udW1DaGlsZHJlbjtcbiAgICB9XG4gICAgcHVibGljIGNsb25lKGRhdGE6IERhdGE8U3BhcnNlVW5pb24+ICYgTmVzdGVkVmlldzxhbnk+KTogdGhpcyB7XG4gICAgICAgIHJldHVybiBuZXcgKDxhbnk+IHRoaXMuY29uc3RydWN0b3IpKGRhdGEsIHRoaXMuX2NoaWxkQ29sdW1ucywgdGhpcy5yb3dJbmRleCkgYXMgdGhpcztcbiAgICB9XG4gICAgcHJvdGVjdGVkIGdldENoaWxkVmFsdWUoc2VsZjogUm93VmlldywgaW5kZXg6IG51bWJlciwgX3R5cGVJZHM6IGFueSwgX3ZhbHVlT2Zmc2V0cz86IGFueSk6IGFueSB8IG51bGwge1xuICAgICAgICBjb25zdCBjaGlsZCA9IHNlbGYuZ2V0Q2hpbGRBdChpbmRleCk7XG4gICAgICAgIHJldHVybiBjaGlsZCA/IGNoaWxkLmdldChzZWxmLnJvd0luZGV4KSA6IG51bGw7XG4gICAgfVxuICAgIHByb3RlY3RlZCBzZXRDaGlsZFZhbHVlKHNlbGY6IFJvd1ZpZXcsIGluZGV4OiBudW1iZXIsIHZhbHVlOiBhbnksIF90eXBlSWRzOiBhbnksIF92YWx1ZU9mZnNldHM/OiBhbnkpOiBhbnkgfCBudWxsIHtcbiAgICAgICAgY29uc3QgY2hpbGQgPSBzZWxmLmdldENoaWxkQXQoaW5kZXgpO1xuICAgICAgICByZXR1cm4gY2hpbGQgPyBjaGlsZC5zZXQoc2VsZi5yb3dJbmRleCwgdmFsdWUpIDogbnVsbDtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBNYXBSb3dWaWV3IGV4dGVuZHMgUm93VmlldyB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyB0eXBlSWRzOiBhbnk7XG4gICAgcHVibGljIHRvSlNPTigpIHtcbiAgICAgICAgY29uc3QgZ2V0ID0gdGhpcy5nZXRDaGlsZFZhbHVlO1xuICAgICAgICBjb25zdCByZXN1bHQgPSB7fSBhcyB7IFtrOiBzdHJpbmddOiBhbnkgfTtcbiAgICAgICAgY29uc3QgdHlwZUlkcyA9IHRoaXMudHlwZUlkcyBhcyB7IFtrOiBzdHJpbmddOiBudW1iZXIgfTtcbiAgICAgICAgZm9yIChjb25zdCBuYW1lIGluIHR5cGVJZHMpIHtcbiAgICAgICAgICAgIHJlc3VsdFtuYW1lXSA9IGdldCh0aGlzLCBuYW1lLCB0eXBlSWRzLCBudWxsKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgZ2V0Q2hpbGRWYWx1ZShzZWxmOiBNYXBSb3dWaWV3LCBrZXk6IGFueSwgdHlwZUlkczogYW55LCBfdmFsdWVPZmZzZXRzOiBhbnkpOiBhbnkgfCBudWxsIHtcbiAgICAgICAgY29uc3QgY2hpbGQgPSBzZWxmLmdldENoaWxkQXQodHlwZUlkc1trZXldKTtcbiAgICAgICAgcmV0dXJuIGNoaWxkID8gY2hpbGQuZ2V0KHNlbGYucm93SW5kZXgpIDogbnVsbDtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHNldENoaWxkVmFsdWUoc2VsZjogTWFwUm93Vmlldywga2V5OiBhbnksIHZhbHVlOiBhbnksIHR5cGVJZHM6IGFueSwgX3ZhbHVlT2Zmc2V0cz86IGFueSk6IGFueSB8IG51bGwge1xuICAgICAgICBjb25zdCBjaGlsZCA9IHNlbGYuZ2V0Q2hpbGRBdCh0eXBlSWRzW2tleV0pO1xuICAgICAgICByZXR1cm4gY2hpbGQgPyBjaGlsZC5zZXQoc2VsZi5yb3dJbmRleCwgdmFsdWUpIDogbnVsbDtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHN0cmluZ2lmeSh4OiBhbnkpIHtcbiAgICByZXR1cm4gdHlwZW9mIHggPT09ICdzdHJpbmcnID8gYFwiJHt4fVwiYCA6IEFycmF5LmlzQXJyYXkoeCkgPyBKU09OLnN0cmluZ2lmeSh4KSA6IEFycmF5QnVmZmVyLmlzVmlldyh4KSA/IGBbJHt4fV1gIDogYCR7eH1gO1xufVxuIl19

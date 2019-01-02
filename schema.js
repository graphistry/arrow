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
const type_1 = require("./type");
class Schema {
    constructor(fields, metadata, dictionaries, dictionaryFields) {
        this._fields = fields;
        this._metadata = metadata || Schema.prototype._metadata;
        if (!dictionaries || !dictionaryFields) {
            ({ dictionaries, dictionaryFields } = generateDictionaryMap(fields, dictionaries || new Map(), dictionaryFields || new Map()));
        }
        this._dictionaries = dictionaries;
        this._dictionaryFields = dictionaryFields;
    }
    /** @nocollapse */
    static from(vectors, names = []) {
        return new Schema(vectors.map((v, i) => new Field('' + (names[i] || i), v.type)));
    }
    get fields() { return this._fields; }
    get metadata() { return this._metadata; }
    get dictionaries() { return this._dictionaries; }
    get dictionaryFields() { return this._dictionaryFields; }
    select(...columnNames) {
        const names = columnNames.reduce((xs, x) => (xs[x] = true) && xs, Object.create(null));
        return new Schema(this.fields.filter((f) => names[f.name]), this.metadata);
    }
}
Schema[Symbol.toStringTag] = ((prototype) => {
    prototype._metadata = Object.freeze(new Map());
    return 'Schema';
})(Schema.prototype);
exports.Schema = Schema;
class Field {
    constructor(name, type, nullable = false, metadata) {
        this._name = name;
        this._type = type;
        this._nullable = nullable;
        this._metadata = metadata;
    }
    get type() { return this._type; }
    get name() { return this._name; }
    get nullable() { return this._nullable; }
    get metadata() { return this._metadata; }
    get typeId() { return this._type.typeId; }
    get [Symbol.toStringTag]() { return 'Field'; }
    get indices() {
        return type_1.DataType.isDictionary(this._type) ? this._type.indices : this._type;
    }
    toString() { return `${this.name}: ${this.type}`; }
}
exports.Field = Field;
/** @ignore */
function generateDictionaryMap(fields, dictionaries, dictionaryFields) {
    for (let i = -1, n = fields.length; ++i < n;) {
        const field = fields[i];
        const type = field.type;
        if (type_1.DataType.isDictionary(type)) {
            if (!dictionaryFields.get(type.id)) {
                dictionaryFields.set(type.id, []);
            }
            if (!dictionaries.has(type.id)) {
                dictionaries.set(type.id, type.dictionary);
                dictionaryFields.get(type.id).push(field);
            }
            else if (dictionaries.get(type.id) !== type.dictionary) {
                throw new Error(`Cannot create Schema containing two different dictionaries with the same Id`);
            }
        }
        if (type.children) {
            generateDictionaryMap(type.children, dictionaries, dictionaryFields);
        }
    }
    return { dictionaries, dictionaryFields };
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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IFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgRGF0YVR5cGUsIERpY3Rpb25hcnkgfSBmcm9tICcuL3R5cGUnO1xuaW1wb3J0IHsgVmVjdG9yIGFzIFZUeXBlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuZXhwb3J0IGNsYXNzIFNjaGVtYTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiB7XG5cbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4odmVjdG9yczogVlR5cGU8VFtrZXlvZiBUXT5bXSwgbmFtZXM6IChrZXlvZiBUKVtdID0gW10pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTY2hlbWE8VD4odmVjdG9ycy5tYXAoKHYsIGkpID0+IG5ldyBGaWVsZCgnJyArIChuYW1lc1tpXSB8fCBpKSwgdi50eXBlKSkpO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfZmllbGRzOiBGaWVsZFtdO1xuICAgIHByb3RlY3RlZCBfbWV0YWRhdGE6IE1hcDxzdHJpbmcsIHN0cmluZz47XG4gICAgcHJvdGVjdGVkIF9kaWN0aW9uYXJpZXM6IE1hcDxudW1iZXIsIERhdGFUeXBlPjtcbiAgICBwcm90ZWN0ZWQgX2RpY3Rpb25hcnlGaWVsZHM6IE1hcDxudW1iZXIsIEZpZWxkPERpY3Rpb25hcnk+W10+O1xuICAgIHB1YmxpYyBnZXQgZmllbGRzKCk6IEZpZWxkW10geyByZXR1cm4gdGhpcy5fZmllbGRzOyB9XG4gICAgcHVibGljIGdldCBtZXRhZGF0YSgpOiBNYXA8c3RyaW5nLCBzdHJpbmc+IHsgcmV0dXJuIHRoaXMuX21ldGFkYXRhOyB9XG4gICAgcHVibGljIGdldCBkaWN0aW9uYXJpZXMoKTogTWFwPG51bWJlciwgRGF0YVR5cGU+IHsgcmV0dXJuIHRoaXMuX2RpY3Rpb25hcmllczsgfVxuICAgIHB1YmxpYyBnZXQgZGljdGlvbmFyeUZpZWxkcygpOiBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5PltdPiB7IHJldHVybiB0aGlzLl9kaWN0aW9uYXJ5RmllbGRzOyB9XG5cbiAgICBjb25zdHJ1Y3RvcihmaWVsZHM6IEZpZWxkW10sXG4gICAgICAgICAgICAgICAgbWV0YWRhdGE/OiBNYXA8c3RyaW5nLCBzdHJpbmc+LFxuICAgICAgICAgICAgICAgIGRpY3Rpb25hcmllcz86IE1hcDxudW1iZXIsIERhdGFUeXBlPixcbiAgICAgICAgICAgICAgICBkaWN0aW9uYXJ5RmllbGRzPzogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeT5bXT4pIHtcbiAgICAgICAgdGhpcy5fZmllbGRzID0gZmllbGRzO1xuICAgICAgICB0aGlzLl9tZXRhZGF0YSA9IG1ldGFkYXRhIHx8IFNjaGVtYS5wcm90b3R5cGUuX21ldGFkYXRhO1xuICAgICAgICBpZiAoIWRpY3Rpb25hcmllcyB8fCAhZGljdGlvbmFyeUZpZWxkcykge1xuICAgICAgICAgICAgKHsgZGljdGlvbmFyaWVzLCBkaWN0aW9uYXJ5RmllbGRzIH0gPSBnZW5lcmF0ZURpY3Rpb25hcnlNYXAoXG4gICAgICAgICAgICAgICAgZmllbGRzLCBkaWN0aW9uYXJpZXMgfHwgbmV3IE1hcCgpLCBkaWN0aW9uYXJ5RmllbGRzIHx8IG5ldyBNYXAoKVxuICAgICAgICAgICAgKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fZGljdGlvbmFyaWVzID0gZGljdGlvbmFyaWVzO1xuICAgICAgICB0aGlzLl9kaWN0aW9uYXJ5RmllbGRzID0gZGljdGlvbmFyeUZpZWxkcztcbiAgICB9XG4gICAgcHVibGljIHNlbGVjdDxLIGV4dGVuZHMga2V5b2YgVCA9IGFueT4oLi4uY29sdW1uTmFtZXM6IEtbXSkge1xuICAgICAgICBjb25zdCBuYW1lcyA9IGNvbHVtbk5hbWVzLnJlZHVjZSgoeHMsIHgpID0+ICh4c1t4XSA9IHRydWUpICYmIHhzLCBPYmplY3QuY3JlYXRlKG51bGwpKTtcbiAgICAgICAgcmV0dXJuIG5ldyBTY2hlbWE8eyBbUCBpbiBLXTogVFtQXSB9Pih0aGlzLmZpZWxkcy5maWx0ZXIoKGYpID0+IG5hbWVzW2YubmFtZV0pLCB0aGlzLm1ldGFkYXRhKTtcbiAgICB9XG4gICAgcHVibGljIHN0YXRpYyBbU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICgocHJvdG90eXBlOiBTY2hlbWEpID0+IHtcbiAgICAgICAgKHByb3RvdHlwZSBhcyBhbnkpLl9tZXRhZGF0YSA9IE9iamVjdC5mcmVlemUobmV3IE1hcCgpKTtcbiAgICAgICAgcmV0dXJuICdTY2hlbWEnO1xuICAgIH0pKFNjaGVtYS5wcm90b3R5cGUpO1xufVxuXG5leHBvcnQgY2xhc3MgRmllbGQ8VCBleHRlbmRzIERhdGFUeXBlID0gRGF0YVR5cGU+IHtcbiAgICBwcm90ZWN0ZWQgX3R5cGU6IFQ7XG4gICAgcHJvdGVjdGVkIF9uYW1lOiBzdHJpbmc7XG4gICAgcHJvdGVjdGVkIF9udWxsYWJsZTogdHJ1ZSB8IGZhbHNlO1xuICAgIHByb3RlY3RlZCBfbWV0YWRhdGE/OiBNYXA8c3RyaW5nLCBzdHJpbmc+IHwgbnVsbDtcbiAgICBjb25zdHJ1Y3RvcihuYW1lOiBzdHJpbmcsIHR5cGU6IFQsIG51bGxhYmxlOiB0cnVlIHwgZmFsc2UgPSBmYWxzZSwgbWV0YWRhdGE/OiBNYXA8c3RyaW5nLCBzdHJpbmc+IHwgbnVsbCkge1xuICAgICAgICB0aGlzLl9uYW1lID0gbmFtZTtcbiAgICAgICAgdGhpcy5fdHlwZSA9IHR5cGU7XG4gICAgICAgIHRoaXMuX251bGxhYmxlID0gbnVsbGFibGU7XG4gICAgICAgIHRoaXMuX21ldGFkYXRhID0gbWV0YWRhdGE7XG4gICAgfVxuICAgIHB1YmxpYyBnZXQgdHlwZSgpIHsgcmV0dXJuIHRoaXMuX3R5cGU7IH1cbiAgICBwdWJsaWMgZ2V0IG5hbWUoKSB7IHJldHVybiB0aGlzLl9uYW1lOyB9XG4gICAgcHVibGljIGdldCBudWxsYWJsZSgpIHsgcmV0dXJuIHRoaXMuX251bGxhYmxlOyB9XG4gICAgcHVibGljIGdldCBtZXRhZGF0YSgpIHsgcmV0dXJuIHRoaXMuX21ldGFkYXRhOyB9XG4gICAgcHVibGljIGdldCB0eXBlSWQoKSB7IHJldHVybiB0aGlzLl90eXBlLnR5cGVJZDsgfVxuICAgIHB1YmxpYyBnZXQgW1N5bWJvbC50b1N0cmluZ1RhZ10oKTogc3RyaW5nIHsgcmV0dXJuICdGaWVsZCc7IH1cbiAgICBwdWJsaWMgZ2V0IGluZGljZXMoKSB7XG4gICAgICAgIHJldHVybiBEYXRhVHlwZS5pc0RpY3Rpb25hcnkodGhpcy5fdHlwZSkgPyB0aGlzLl90eXBlLmluZGljZXMgOiB0aGlzLl90eXBlO1xuICAgIH1cbiAgICBwdWJsaWMgdG9TdHJpbmcoKSB7IHJldHVybiBgJHt0aGlzLm5hbWV9OiAke3RoaXMudHlwZX1gOyB9XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBnZW5lcmF0ZURpY3Rpb25hcnlNYXAoZmllbGRzOiBGaWVsZFtdLCBkaWN0aW9uYXJpZXM6IE1hcDxudW1iZXIsIERhdGFUeXBlPiwgZGljdGlvbmFyeUZpZWxkczogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeT5bXT4pIHtcblxuICAgIGZvciAobGV0IGkgPSAtMSwgbiA9IGZpZWxkcy5sZW5ndGg7ICsraSA8IG47KSB7XG4gICAgICAgIGNvbnN0IGZpZWxkID0gZmllbGRzW2ldO1xuICAgICAgICBjb25zdCB0eXBlID0gZmllbGQudHlwZTtcbiAgICAgICAgaWYgKERhdGFUeXBlLmlzRGljdGlvbmFyeSh0eXBlKSkge1xuICAgICAgICAgICAgaWYgKCFkaWN0aW9uYXJ5RmllbGRzLmdldCh0eXBlLmlkKSkge1xuICAgICAgICAgICAgICAgIGRpY3Rpb25hcnlGaWVsZHMuc2V0KHR5cGUuaWQsIFtdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghZGljdGlvbmFyaWVzLmhhcyh0eXBlLmlkKSkge1xuICAgICAgICAgICAgICAgIGRpY3Rpb25hcmllcy5zZXQodHlwZS5pZCwgdHlwZS5kaWN0aW9uYXJ5KTtcbiAgICAgICAgICAgICAgICBkaWN0aW9uYXJ5RmllbGRzLmdldCh0eXBlLmlkKSEucHVzaChmaWVsZCBhcyBhbnkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChkaWN0aW9uYXJpZXMuZ2V0KHR5cGUuaWQpICE9PSB0eXBlLmRpY3Rpb25hcnkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBjcmVhdGUgU2NoZW1hIGNvbnRhaW5pbmcgdHdvIGRpZmZlcmVudCBkaWN0aW9uYXJpZXMgd2l0aCB0aGUgc2FtZSBJZGApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICBnZW5lcmF0ZURpY3Rpb25hcnlNYXAodHlwZS5jaGlsZHJlbiwgZGljdGlvbmFyaWVzLCBkaWN0aW9uYXJ5RmllbGRzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7IGRpY3Rpb25hcmllcywgZGljdGlvbmFyeUZpZWxkcyB9O1xufVxuIl19
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
const data_1 = require("../data");
const vector_1 = require("../vector");
const base_1 = require("./base");
const type_1 = require("../type");
class DictionaryVector extends base_1.BaseVector {
    constructor(data) {
        super(data);
        this._indices = vector_1.Vector.new(data.clone(this.type.indices));
    }
    /** @nocollapse */
    static from(values, indices, keys) {
        const type = new type_1.Dictionary(values.type, indices, null, null, values);
        return vector_1.Vector.new(data_1.Data.Dictionary(type, 0, keys.length, 0, null, keys));
    }
    // protected _bindDataAccessors() {}
    get indices() { return this._indices; }
    get dictionary() { return this.data.type.dictionaryVector; }
    isValid(index) { return this._indices.isValid(index); }
    reverseLookup(value) { return this.dictionary.indexOf(value); }
    getKey(idx) { return this._indices.get(idx); }
    getValue(key) { return this.dictionary.get(key); }
    setKey(idx, key) { return this._indices.set(idx, key); }
    setValue(key, value) { return this.dictionary.set(key, value); }
}
exports.DictionaryVector = DictionaryVector;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInZlY3Rvci9kaWN0aW9uYXJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSw2REFBNkQ7QUFDN0QsK0RBQStEO0FBQy9ELHdEQUF3RDtBQUN4RCw2REFBNkQ7QUFDN0Qsb0RBQW9EO0FBQ3BELDZEQUE2RDtBQUM3RCw2REFBNkQ7QUFDN0QsRUFBRTtBQUNGLCtDQUErQztBQUMvQyxFQUFFO0FBQ0YsNkRBQTZEO0FBQzdELDhEQUE4RDtBQUM5RCx5REFBeUQ7QUFDekQsNERBQTREO0FBQzVELDBEQUEwRDtBQUMxRCxxQkFBcUI7O0FBRXJCLGtDQUErQjtBQUMvQixzQ0FBbUM7QUFDbkMsaUNBQW9DO0FBRXBDLGtDQUFzRDtBQUV0RCxNQUFhLGdCQUF1RSxTQUFRLGlCQUErQjtJQVV2SCxZQUFZLElBQStCO1FBQ3ZDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNaLElBQUksQ0FBQyxRQUFRLEdBQUcsZUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUM5RCxDQUFDO0lBWkQsa0JBQWtCO0lBQ1gsTUFBTSxDQUFDLElBQUksQ0FDZCxNQUFpQixFQUFFLE9BQWEsRUFDaEMsSUFBd0M7UUFFeEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxpQkFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDdEUsT0FBTyxlQUFNLENBQUMsR0FBRyxDQUFDLFdBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBTUQsb0NBQW9DO0lBQ3BDLElBQVcsT0FBTyxLQUFLLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDOUMsSUFBVyxVQUFVLEtBQUssT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7SUFDNUQsT0FBTyxDQUFDLEtBQWEsSUFBSSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvRCxhQUFhLENBQUMsS0FBUSxJQUFJLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xFLE1BQU0sQ0FBQyxHQUFXLElBQTJCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzdFLFFBQVEsQ0FBQyxHQUFXLElBQXdCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzlFLE1BQU0sQ0FBQyxHQUFXLEVBQUUsR0FBMEIsSUFBSSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkYsUUFBUSxDQUFDLEdBQVcsRUFBRSxLQUF5QixJQUFJLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUN0RztBQXZCRCw0Q0F1QkMiLCJmaWxlIjoidmVjdG9yL2RpY3Rpb25hcnkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgRGF0YSB9IGZyb20gJy4uL2RhdGEnO1xuaW1wb3J0IHsgVmVjdG9yIH0gZnJvbSAnLi4vdmVjdG9yJztcbmltcG9ydCB7IEJhc2VWZWN0b3IgfSBmcm9tICcuL2Jhc2UnO1xuaW1wb3J0IHsgVmVjdG9yIGFzIFYgfSBmcm9tICcuLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IERhdGFUeXBlLCBEaWN0aW9uYXJ5LCBUS2V5cyB9IGZyb20gJy4uL3R5cGUnO1xuXG5leHBvcnQgY2xhc3MgRGljdGlvbmFyeVZlY3RvcjxUIGV4dGVuZHMgRGF0YVR5cGUgPSBhbnksIFRLZXkgZXh0ZW5kcyBUS2V5cyA9IFRLZXlzPiBleHRlbmRzIEJhc2VWZWN0b3I8RGljdGlvbmFyeTxULCBUS2V5Pj4ge1xuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgRGF0YVR5cGU8YW55PiwgVEtleSBleHRlbmRzIFRLZXlzID0gVEtleXM+KFxuICAgICAgICB2YWx1ZXM6IFZlY3RvcjxUPiwgaW5kaWNlczogVEtleSxcbiAgICAgICAga2V5czogQXJyYXlMaWtlPG51bWJlcj4gfCBUS2V5WydUQXJyYXknXVxuICAgICkge1xuICAgICAgICBjb25zdCB0eXBlID0gbmV3IERpY3Rpb25hcnkodmFsdWVzLnR5cGUsIGluZGljZXMsIG51bGwsIG51bGwsIHZhbHVlcyk7XG4gICAgICAgIHJldHVybiBWZWN0b3IubmV3KERhdGEuRGljdGlvbmFyeSh0eXBlLCAwLCBrZXlzLmxlbmd0aCwgMCwgbnVsbCwga2V5cykpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgX2luZGljZXM6IFY8VEtleT47XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxEaWN0aW9uYXJ5PFQsIFRLZXk+Pikge1xuICAgICAgICBzdXBlcihkYXRhKTtcbiAgICAgICAgdGhpcy5faW5kaWNlcyA9IFZlY3Rvci5uZXcoZGF0YS5jbG9uZSh0aGlzLnR5cGUuaW5kaWNlcykpO1xuICAgIH1cbiAgICAvLyBwcm90ZWN0ZWQgX2JpbmREYXRhQWNjZXNzb3JzKCkge31cbiAgICBwdWJsaWMgZ2V0IGluZGljZXMoKSB7IHJldHVybiB0aGlzLl9pbmRpY2VzOyB9XG4gICAgcHVibGljIGdldCBkaWN0aW9uYXJ5KCkgeyByZXR1cm4gdGhpcy5kYXRhLnR5cGUuZGljdGlvbmFyeVZlY3RvcjsgfVxuICAgIHB1YmxpYyBpc1ZhbGlkKGluZGV4OiBudW1iZXIpIHsgcmV0dXJuIHRoaXMuX2luZGljZXMuaXNWYWxpZChpbmRleCk7IH1cbiAgICBwdWJsaWMgcmV2ZXJzZUxvb2t1cCh2YWx1ZTogVCkgeyByZXR1cm4gdGhpcy5kaWN0aW9uYXJ5LmluZGV4T2YodmFsdWUpOyB9XG4gICAgcHVibGljIGdldEtleShpZHg6IG51bWJlcik6IFRLZXlbJ1RWYWx1ZSddIHwgbnVsbCB7IHJldHVybiB0aGlzLl9pbmRpY2VzLmdldChpZHgpOyB9XG4gICAgcHVibGljIGdldFZhbHVlKGtleTogbnVtYmVyKTogVFsnVFZhbHVlJ10gfCBudWxsIHsgcmV0dXJuIHRoaXMuZGljdGlvbmFyeS5nZXQoa2V5KTsgfVxuICAgIHB1YmxpYyBzZXRLZXkoaWR4OiBudW1iZXIsIGtleTogVEtleVsnVFZhbHVlJ10gfCBudWxsKSB7IHJldHVybiB0aGlzLl9pbmRpY2VzLnNldChpZHgsIGtleSk7IH1cbiAgICBwdWJsaWMgc2V0VmFsdWUoa2V5OiBudW1iZXIsIHZhbHVlOiBUWydUVmFsdWUnXSB8IG51bGwpIHsgcmV0dXJuIHRoaXMuZGljdGlvbmFyeS5zZXQoa2V5LCB2YWx1ZSk7IH1cbn1cbiJdfQ==

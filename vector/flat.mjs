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
import { getBool, setBool, iterateBits } from '../util/bit';
export class FlatView {
    constructor(data) {
        this.length = data.length;
        this.values = data.values;
    }
    clone(data) {
        return new this.constructor(data);
    }
    isValid() {
        return true;
    }
    get(index) {
        return this.values[index];
    }
    set(index, value) {
        return this.values[index] = value;
    }
    toArray() {
        return this.values.subarray(0, this.length);
    }
    indexOf(search) {
        let index = 0;
        for (let value of this) {
            if (value === search) {
                return index;
            }
            ++index;
        }
        return -1;
    }
    [Symbol.iterator]() {
        return this.values.subarray(0, this.length)[Symbol.iterator]();
    }
}
export class NullView {
    constructor(data) {
        this.length = data.length;
    }
    clone(data) {
        return new this.constructor(data);
    }
    isValid() {
        return true;
    }
    set() { }
    get() { return null; }
    toArray() {
        return [...this];
    }
    indexOf(search) {
        // if you're looking for nulls and the view isn't empty, we've got 'em!
        return search === null && this.length > 0 ? 0 : -1;
    }
    *[Symbol.iterator]() {
        for (let index = -1, length = this.length; ++index < length;) {
            yield null;
        }
    }
}
export class BoolView extends FlatView {
    constructor(data) {
        super(data);
        this.offset = data.offset;
    }
    toArray() { return [...this]; }
    get(index) {
        const boolBitIndex = this.offset + index;
        return getBool(null, index, this.values[boolBitIndex >> 3], boolBitIndex % 8);
    }
    set(index, value) {
        setBool(this.values, this.offset + index, value);
    }
    [Symbol.iterator]() {
        return iterateBits(this.values, this.offset, this.length, this.values, getBool);
    }
}
export class PrimitiveView extends FlatView {
    constructor(data, size) {
        super(data);
        this.size = size || 1;
        this.ArrayType = data.type.ArrayType;
    }
    clone(data) {
        return new this.constructor(data, this.size);
    }
    getValue(values, index, size) {
        return values[index * size];
    }
    setValue(values, index, size, value) {
        values[index * size] = value;
    }
    get(index) {
        return this.getValue(this.values, index, this.size);
    }
    set(index, value) {
        return this.setValue(this.values, index, this.size, value);
    }
    toArray() {
        return this.size > 1 ?
            new this.ArrayType(this) :
            this.values.subarray(0, this.length);
    }
    *[Symbol.iterator]() {
        const get = this.getValue;
        const { size, values, length } = this;
        for (let index = -1; ++index < length;) {
            yield get(values, index, size);
        }
    }
}
export class FixedSizeView extends PrimitiveView {
    toArray() {
        return this.values;
    }
    indexOf(search) {
        let index = 0;
        for (let value of this) {
            if (value.every((d, i) => d === search[i])) {
                return index;
            }
            ++index;
        }
        return -1;
    }
    getValue(values, index, size) {
        return values.subarray(index * size, index * size + size);
    }
    setValue(values, index, size, value) {
        values.set(value.subarray(0, size), index * size);
    }
}
export class Float16View extends PrimitiveView {
    toArray() { return new Float32Array(this); }
    getValue(values, index, size) {
        return (values[index * size] - 32767) / 32767;
    }
    setValue(values, index, size, value) {
        values[index * size] = (value * 32767) + 32767;
    }
}
export class DateDayView extends PrimitiveView {
    toArray() { return [...this]; }
    getValue(values, index, size) {
        return epochDaysToDate(values, index * size);
    }
    setValue(values, index, size, value) {
        values[index * size] = value.valueOf() / 86400000;
    }
}
export class DateMillisecondView extends FixedSizeView {
    toArray() { return [...this]; }
    getValue(values, index, size) {
        return epochMillisecondsLongToDate(values, index * size);
    }
    setValue(values, index, size, value) {
        const epochMs = value.valueOf();
        values[index * size] = (epochMs % 4294967296) | 0;
        values[index * size + size] = (epochMs / 4294967296) | 0;
    }
}
export class TimestampDayView extends PrimitiveView {
    toArray() { return [...this]; }
    getValue(values, index, size) {
        return epochDaysToMs(values, index * size);
    }
    setValue(values, index, size, epochMs) {
        values[index * size] = (epochMs / 86400000) | 0;
    }
}
export class TimestampSecondView extends PrimitiveView {
    toArray() { return [...this]; }
    getValue(values, index, size) {
        return epochSecondsToMs(values, index * size);
    }
    setValue(values, index, size, epochMs) {
        values[index * size] = (epochMs / 1000) | 0;
    }
}
export class TimestampMillisecondView extends PrimitiveView {
    toArray() { return [...this]; }
    getValue(values, index, size) {
        return epochMillisecondsLongToMs(values, index * size);
    }
    setValue(values, index, size, epochMs) {
        values[index * size] = (epochMs % 4294967296) | 0;
        values[index * size + size] = (epochMs / 4294967296) | 0;
    }
}
export class TimestampMicrosecondView extends PrimitiveView {
    toArray() { return [...this]; }
    getValue(values, index, size) {
        return epochMicrosecondsLongToMs(values, index * size);
    }
    setValue(values, index, size, epochMs) {
        values[index * size] = ((epochMs / 1000) % 4294967296) | 0;
        values[index * size + size] = ((epochMs / 1000) / 4294967296) | 0;
    }
}
export class TimestampNanosecondView extends PrimitiveView {
    toArray() { return [...this]; }
    getValue(values, index, size) {
        return epochNanosecondsLongToMs(values, index * size);
    }
    setValue(values, index, size, epochMs) {
        values[index * size] = ((epochMs / 1000000) % 4294967296) | 0;
        values[index * size + size] = ((epochMs / 1000000) / 4294967296) | 0;
    }
}
export class IntervalYearMonthView extends PrimitiveView {
    toArray() { return [...this]; }
    getValue(values, index, size) {
        const interval = values[index * size];
        return new Int32Array([interval / 12, /* years */ interval % 12 /* months */]);
    }
    setValue(values, index, size, value) {
        values[index * size] = (value[0] * 12) + (value[1] % 12);
    }
}
export class IntervalYearView extends PrimitiveView {
    toArray() { return [...this]; }
    getValue(values, index, size) {
        return values[index * size] / 12;
    }
    setValue(values, index, size, value) {
        values[index * size] = (value * 12) + (values[index * size] % 12);
    }
}
export class IntervalMonthView extends PrimitiveView {
    toArray() { return [...this]; }
    getValue(values, index, size) {
        return values[index * size] % 12;
    }
    setValue(values, index, size, value) {
        values[index * size] = (values[index * size] * 12) + (value % 12);
    }
}
export function epochSecondsToMs(data, index) { return 1000 * data[index]; }
export function epochDaysToMs(data, index) { return 86400000 * data[index]; }
export function epochMillisecondsLongToMs(data, index) { return 4294967296 * (data[index + 1]) + (data[index] >>> 0); }
export function epochMicrosecondsLongToMs(data, index) { return 4294967296 * (data[index + 1] / 1000) + ((data[index] >>> 0) / 1000); }
export function epochNanosecondsLongToMs(data, index) { return 4294967296 * (data[index + 1] / 1000000) + ((data[index] >>> 0) / 1000000); }
export function epochMillisecondsToDate(epochMs) { return new Date(epochMs); }
export function epochDaysToDate(data, index) { return epochMillisecondsToDate(epochDaysToMs(data, index)); }
export function epochSecondsToDate(data, index) { return epochMillisecondsToDate(epochSecondsToMs(data, index)); }
export function epochNanosecondsLongToDate(data, index) { return epochMillisecondsToDate(epochNanosecondsLongToMs(data, index)); }
export function epochMillisecondsLongToDate(data, index) { return epochMillisecondsToDate(epochMillisecondsLongToMs(data, index)); }

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QyxDQUFDLENBQUM7QUFDdEksTUFBTSxxQ0FBcUMsSUFBZ0IsRUFBRSxLQUFhLElBQUksT0FBTyx1QkFBdUIsQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEosTUFBTSxzQ0FBc0MsSUFBZ0IsRUFBRSxLQUFhLElBQUksT0FBTyx1QkFBdUIsQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMiLCJmaWxlIjoidmVjdG9yL2ZsYXQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgRGF0YSB9IGZyb20gJy4uL2RhdGEnO1xuaW1wb3J0IHsgVmlldyB9IGZyb20gJy4uL3ZlY3Rvcic7XG5pbXBvcnQgeyBnZXRCb29sLCBzZXRCb29sLCBpdGVyYXRlQml0cyB9IGZyb20gJy4uL3V0aWwvYml0JztcbmltcG9ydCB7IEZsYXRUeXBlLCBQcmltaXRpdmVUeXBlLCBJdGVyYWJsZUFycmF5TGlrZSB9IGZyb20gJy4uL3R5cGUnO1xuaW1wb3J0IHsgQm9vbCwgRmxvYXQxNiwgRGF0ZV8sIEludGVydmFsLCBOdWxsLCBJbnQzMiwgVGltZXN0YW1wIH0gZnJvbSAnLi4vdHlwZSc7XG5cbmV4cG9ydCBjbGFzcyBGbGF0VmlldzxUIGV4dGVuZHMgRmxhdFR5cGU+IGltcGxlbWVudHMgVmlldzxUPiB7XG4gICAgcHVibGljIGxlbmd0aDogbnVtYmVyO1xuICAgIHB1YmxpYyB2YWx1ZXM6IFRbJ1RBcnJheSddO1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8VD4pIHtcbiAgICAgICAgdGhpcy5sZW5ndGggPSBkYXRhLmxlbmd0aDtcbiAgICAgICAgdGhpcy52YWx1ZXMgPSBkYXRhLnZhbHVlcztcbiAgICB9XG4gICAgcHVibGljIGNsb25lKGRhdGE6IERhdGE8VD4pOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIG5ldyAoPGFueT4gdGhpcy5jb25zdHJ1Y3RvcikoZGF0YSkgYXMgdGhpcztcbiAgICB9XG4gICAgcHVibGljIGlzVmFsaWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBwdWJsaWMgZ2V0KGluZGV4OiBudW1iZXIpOiBUWydUVmFsdWUnXSB7XG4gICAgICAgIHJldHVybiB0aGlzLnZhbHVlc1tpbmRleF07XG4gICAgfVxuICAgIHB1YmxpYyBzZXQoaW5kZXg6IG51bWJlciwgdmFsdWU6IFRbJ1RWYWx1ZSddKTogdm9pZCB7XG4gICAgICAgIHJldHVybiB0aGlzLnZhbHVlc1tpbmRleF0gPSB2YWx1ZTtcbiAgICB9XG4gICAgcHVibGljIHRvQXJyYXkoKTogSXRlcmFibGVBcnJheUxpa2U8VFsnVFZhbHVlJ10+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVzLnN1YmFycmF5KDAsIHRoaXMubGVuZ3RoKTtcbiAgICB9XG4gICAgcHVibGljIGluZGV4T2Yoc2VhcmNoOiBUWydUVmFsdWUnXSkge1xuICAgICAgICBsZXQgaW5kZXggPSAwO1xuICAgICAgICBmb3IgKGxldCB2YWx1ZSBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAodmFsdWUgPT09IHNlYXJjaCkgeyByZXR1cm4gaW5kZXg7IH1cbiAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gLTE7XG4gICAgfVxuICAgIHB1YmxpYyBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFRbJ1RWYWx1ZSddPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnZhbHVlcy5zdWJhcnJheSgwLCB0aGlzLmxlbmd0aClbU3ltYm9sLml0ZXJhdG9yXSgpIGFzIEl0ZXJhYmxlSXRlcmF0b3I8VFsnVFZhbHVlJ10+O1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIE51bGxWaWV3IGltcGxlbWVudHMgVmlldzxOdWxsPiB7XG4gICAgcHVibGljIGxlbmd0aDogbnVtYmVyO1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8TnVsbD4pIHtcbiAgICAgICAgdGhpcy5sZW5ndGggPSBkYXRhLmxlbmd0aDtcbiAgICB9XG4gICAgcHVibGljIGNsb25lKGRhdGE6IERhdGE8TnVsbD4pOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIG5ldyAoPGFueT4gdGhpcy5jb25zdHJ1Y3RvcikoZGF0YSkgYXMgdGhpcztcbiAgICB9XG4gICAgcHVibGljIGlzVmFsaWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBwdWJsaWMgc2V0KCk6IHZvaWQge31cbiAgICBwdWJsaWMgZ2V0KCkgeyByZXR1cm4gbnVsbDsgfVxuICAgIHB1YmxpYyB0b0FycmF5KCk6IEl0ZXJhYmxlQXJyYXlMaWtlPG51bGw+IHtcbiAgICAgICAgcmV0dXJuIFsuLi50aGlzXTtcbiAgICB9XG4gICAgcHVibGljIGluZGV4T2Yoc2VhcmNoOiBhbnkpIHtcbiAgICAgICAgLy8gaWYgeW91J3JlIGxvb2tpbmcgZm9yIG51bGxzIGFuZCB0aGUgdmlldyBpc24ndCBlbXB0eSwgd2UndmUgZ290ICdlbSFcbiAgICAgICAgcmV0dXJuIHNlYXJjaCA9PT0gbnVsbCAmJiB0aGlzLmxlbmd0aCA+IDAgPyAwIDogLTE7XG4gICAgfVxuICAgIHB1YmxpYyAqW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxudWxsPiB7XG4gICAgICAgIGZvciAobGV0IGluZGV4ID0gLTEsIGxlbmd0aCA9IHRoaXMubGVuZ3RoOyArK2luZGV4IDwgbGVuZ3RoOykge1xuICAgICAgICAgICAgeWllbGQgbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEJvb2xWaWV3IGV4dGVuZHMgRmxhdFZpZXc8Qm9vbD4ge1xuICAgIHByb3RlY3RlZCBvZmZzZXQ6IG51bWJlcjtcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPEJvb2w+KSB7XG4gICAgICAgIHN1cGVyKGRhdGEpO1xuICAgICAgICB0aGlzLm9mZnNldCA9IGRhdGEub2Zmc2V0O1xuICAgIH1cbiAgICBwdWJsaWMgdG9BcnJheSgpIHsgcmV0dXJuIFsuLi50aGlzXTsgfVxuICAgIHB1YmxpYyBnZXQoaW5kZXg6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBib29sQml0SW5kZXggPSB0aGlzLm9mZnNldCArIGluZGV4O1xuICAgICAgICByZXR1cm4gZ2V0Qm9vbChudWxsLCBpbmRleCwgdGhpcy52YWx1ZXNbYm9vbEJpdEluZGV4ID4+IDNdLCBib29sQml0SW5kZXggJSA4KTtcbiAgICB9XG4gICAgcHVibGljIHNldChpbmRleDogbnVtYmVyLCB2YWx1ZTogYm9vbGVhbik6IHZvaWQge1xuICAgICAgICBzZXRCb29sKHRoaXMudmFsdWVzLCB0aGlzLm9mZnNldCArIGluZGV4LCB2YWx1ZSk7XG4gICAgfVxuICAgIHB1YmxpYyBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPGJvb2xlYW4+IHtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdGVCaXRzPGJvb2xlYW4+KHRoaXMudmFsdWVzLCB0aGlzLm9mZnNldCwgdGhpcy5sZW5ndGgsIHRoaXMudmFsdWVzLCBnZXRCb29sKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBQcmltaXRpdmVWaWV3PFQgZXh0ZW5kcyBQcmltaXRpdmVUeXBlPiBleHRlbmRzIEZsYXRWaWV3PFQ+IHtcbiAgICBwdWJsaWMgc2l6ZTogbnVtYmVyO1xuICAgIHB1YmxpYyBBcnJheVR5cGU6IFRbJ0FycmF5VHlwZSddO1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8VD4sIHNpemU/OiBudW1iZXIpIHtcbiAgICAgICAgc3VwZXIoZGF0YSk7XG4gICAgICAgIHRoaXMuc2l6ZSA9IHNpemUgfHwgMTtcbiAgICAgICAgdGhpcy5BcnJheVR5cGUgPSBkYXRhLnR5cGUuQXJyYXlUeXBlO1xuICAgIH1cbiAgICBwdWJsaWMgY2xvbmUoZGF0YTogRGF0YTxUPik6IHRoaXMge1xuICAgICAgICByZXR1cm4gbmV3ICg8YW55PiB0aGlzLmNvbnN0cnVjdG9yKShkYXRhLCB0aGlzLnNpemUpIGFzIHRoaXM7XG4gICAgfVxuICAgIHByb3RlY3RlZCBnZXRWYWx1ZSh2YWx1ZXM6IFRbJ1RBcnJheSddLCBpbmRleDogbnVtYmVyLCBzaXplOiBudW1iZXIpOiBUWydUVmFsdWUnXSB7XG4gICAgICAgIHJldHVybiB2YWx1ZXNbaW5kZXggKiBzaXplXTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHNldFZhbHVlKHZhbHVlczogVFsnVEFycmF5J10sIGluZGV4OiBudW1iZXIsIHNpemU6IG51bWJlciwgdmFsdWU6IFRbJ1RWYWx1ZSddKTogdm9pZCB7XG4gICAgICAgIHZhbHVlc1tpbmRleCAqIHNpemVdID0gdmFsdWU7XG4gICAgfVxuICAgIHB1YmxpYyBnZXQoaW5kZXg6IG51bWJlcik6IFRbJ1RWYWx1ZSddIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VmFsdWUodGhpcy52YWx1ZXMsIGluZGV4LCB0aGlzLnNpemUpO1xuICAgIH1cbiAgICBwdWJsaWMgc2V0KGluZGV4OiBudW1iZXIsIHZhbHVlOiBUWydUVmFsdWUnXSk6IHZvaWQge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXRWYWx1ZSh0aGlzLnZhbHVlcywgaW5kZXgsIHRoaXMuc2l6ZSwgdmFsdWUpO1xuICAgIH1cbiAgICBwdWJsaWMgdG9BcnJheSgpOiBJdGVyYWJsZUFycmF5TGlrZTxUWydUVmFsdWUnXT4ge1xuICAgICAgICByZXR1cm4gdGhpcy5zaXplID4gMSA/XG4gICAgICAgICAgICBuZXcgdGhpcy5BcnJheVR5cGUodGhpcykgOlxuICAgICAgICAgICAgdGhpcy52YWx1ZXMuc3ViYXJyYXkoMCwgdGhpcy5sZW5ndGgpO1xuICAgIH1cbiAgICBwdWJsaWMgKltTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VFsnVFZhbHVlJ10+IHtcbiAgICAgICAgY29uc3QgZ2V0ID0gdGhpcy5nZXRWYWx1ZTtcbiAgICAgICAgY29uc3QgeyBzaXplLCB2YWx1ZXMsIGxlbmd0aCB9ID0gdGhpcztcbiAgICAgICAgZm9yIChsZXQgaW5kZXggPSAtMTsgKytpbmRleCA8IGxlbmd0aDspIHtcbiAgICAgICAgICAgIHlpZWxkIGdldCh2YWx1ZXMsIGluZGV4LCBzaXplKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEZpeGVkU2l6ZVZpZXc8VCBleHRlbmRzIFByaW1pdGl2ZVR5cGU+IGV4dGVuZHMgUHJpbWl0aXZlVmlldzxUPiB7XG4gICAgcHVibGljIHRvQXJyYXkoKTogSXRlcmFibGVBcnJheUxpa2U8VFsnVFZhbHVlJ10+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVzO1xuICAgIH1cbiAgICBwdWJsaWMgaW5kZXhPZihzZWFyY2g6IFRbJ1RWYWx1ZSddKSB7XG4gICAgICAgIGxldCBpbmRleCA9IDA7XG4gICAgICAgIGZvciAobGV0IHZhbHVlIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZS5ldmVyeSgoZDogbnVtYmVyLCBpOiBudW1iZXIpID0+IGQgPT09IHNlYXJjaFtpXSkpIHsgcmV0dXJuIGluZGV4OyB9XG4gICAgICAgICAgICArK2luZGV4O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIC0xO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgZ2V0VmFsdWUodmFsdWVzOiBUWydUQXJyYXknXSwgaW5kZXg6IG51bWJlciwgc2l6ZTogbnVtYmVyKTogVFsnVFZhbHVlJ10ge1xuICAgICAgICByZXR1cm4gdmFsdWVzLnN1YmFycmF5KGluZGV4ICogc2l6ZSwgaW5kZXggKiBzaXplICsgc2l6ZSk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBzZXRWYWx1ZSh2YWx1ZXM6IFRbJ1RBcnJheSddLCBpbmRleDogbnVtYmVyLCBzaXplOiBudW1iZXIsIHZhbHVlOiBUWydUVmFsdWUnXSk6IHZvaWQge1xuICAgICAgICB2YWx1ZXMuc2V0KCh2YWx1ZSBhcyBUWydUQXJyYXknXSkuc3ViYXJyYXkoMCwgc2l6ZSksIGluZGV4ICogc2l6ZSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgRmxvYXQxNlZpZXcgZXh0ZW5kcyBQcmltaXRpdmVWaWV3PEZsb2F0MTY+IHtcbiAgICBwdWJsaWMgdG9BcnJheSgpIHsgcmV0dXJuIG5ldyBGbG9hdDMyQXJyYXkodGhpcyk7IH1cbiAgICBwcm90ZWN0ZWQgZ2V0VmFsdWUodmFsdWVzOiBVaW50MTZBcnJheSwgaW5kZXg6IG51bWJlciwgc2l6ZTogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuICh2YWx1ZXNbaW5kZXggKiBzaXplXSAtIDMyNzY3KSAvIDMyNzY3O1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgc2V0VmFsdWUodmFsdWVzOiBVaW50MTZBcnJheSwgaW5kZXg6IG51bWJlciwgc2l6ZTogbnVtYmVyLCB2YWx1ZTogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHZhbHVlc1tpbmRleCAqIHNpemVdID0gKHZhbHVlICogMzI3NjcpICsgMzI3Njc7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgRGF0ZURheVZpZXcgZXh0ZW5kcyBQcmltaXRpdmVWaWV3PERhdGVfPiB7XG4gICAgcHVibGljIHRvQXJyYXkoKSB7IHJldHVybiBbLi4udGhpc107IH1cbiAgICBwcm90ZWN0ZWQgZ2V0VmFsdWUodmFsdWVzOiBJbnQzMkFycmF5LCBpbmRleDogbnVtYmVyLCBzaXplOiBudW1iZXIpOiBEYXRlIHtcbiAgICAgICAgcmV0dXJuIGVwb2NoRGF5c1RvRGF0ZSh2YWx1ZXMsIGluZGV4ICogc2l6ZSk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBzZXRWYWx1ZSh2YWx1ZXM6IEludDMyQXJyYXksIGluZGV4OiBudW1iZXIsIHNpemU6IG51bWJlciwgdmFsdWU6IERhdGUpOiB2b2lkIHtcbiAgICAgICAgdmFsdWVzW2luZGV4ICogc2l6ZV0gPSB2YWx1ZS52YWx1ZU9mKCkgLyA4NjQwMDAwMDtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBEYXRlTWlsbGlzZWNvbmRWaWV3IGV4dGVuZHMgRml4ZWRTaXplVmlldzxEYXRlXz4ge1xuICAgIHB1YmxpYyB0b0FycmF5KCkgeyByZXR1cm4gWy4uLnRoaXNdOyB9XG4gICAgcHJvdGVjdGVkIGdldFZhbHVlKHZhbHVlczogSW50MzJBcnJheSwgaW5kZXg6IG51bWJlciwgc2l6ZTogbnVtYmVyKTogRGF0ZSB7XG4gICAgICAgIHJldHVybiBlcG9jaE1pbGxpc2Vjb25kc0xvbmdUb0RhdGUodmFsdWVzLCBpbmRleCAqIHNpemUpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgc2V0VmFsdWUodmFsdWVzOiBJbnQzMkFycmF5LCBpbmRleDogbnVtYmVyLCBzaXplOiBudW1iZXIsIHZhbHVlOiBEYXRlKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGVwb2NoTXMgPSB2YWx1ZS52YWx1ZU9mKCk7XG4gICAgICAgIHZhbHVlc1tpbmRleCAqIHNpemVdID0gKGVwb2NoTXMgJSA0Mjk0OTY3Mjk2KSB8IDA7XG4gICAgICAgIHZhbHVlc1tpbmRleCAqIHNpemUgKyBzaXplXSA9IChlcG9jaE1zIC8gNDI5NDk2NzI5NikgfCAwO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFRpbWVzdGFtcERheVZpZXcgZXh0ZW5kcyBQcmltaXRpdmVWaWV3PFRpbWVzdGFtcD4ge1xuICAgIHB1YmxpYyB0b0FycmF5KCkgeyByZXR1cm4gWy4uLnRoaXNdOyB9XG4gICAgcHJvdGVjdGVkIGdldFZhbHVlKHZhbHVlczogSW50MzJBcnJheSwgaW5kZXg6IG51bWJlciwgc2l6ZTogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIGVwb2NoRGF5c1RvTXModmFsdWVzLCBpbmRleCAqIHNpemUpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgc2V0VmFsdWUodmFsdWVzOiBJbnQzMkFycmF5LCBpbmRleDogbnVtYmVyLCBzaXplOiBudW1iZXIsIGVwb2NoTXM6IG51bWJlcik6IHZvaWQge1xuICAgICAgICB2YWx1ZXNbaW5kZXggKiBzaXplXSA9IChlcG9jaE1zIC8gODY0MDAwMDApIHwgMDtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBUaW1lc3RhbXBTZWNvbmRWaWV3IGV4dGVuZHMgUHJpbWl0aXZlVmlldzxUaW1lc3RhbXA+IHtcbiAgICBwdWJsaWMgdG9BcnJheSgpIHsgcmV0dXJuIFsuLi50aGlzXTsgfVxuICAgIHByb3RlY3RlZCBnZXRWYWx1ZSh2YWx1ZXM6IEludDMyQXJyYXksIGluZGV4OiBudW1iZXIsIHNpemU6IG51bWJlcik6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBlcG9jaFNlY29uZHNUb01zKHZhbHVlcywgaW5kZXggKiBzaXplKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHNldFZhbHVlKHZhbHVlczogSW50MzJBcnJheSwgaW5kZXg6IG51bWJlciwgc2l6ZTogbnVtYmVyLCBlcG9jaE1zOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdmFsdWVzW2luZGV4ICogc2l6ZV0gPSAoZXBvY2hNcyAvIDEwMDApIHwgMDtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBUaW1lc3RhbXBNaWxsaXNlY29uZFZpZXcgZXh0ZW5kcyBQcmltaXRpdmVWaWV3PFRpbWVzdGFtcD4ge1xuICAgIHB1YmxpYyB0b0FycmF5KCkgeyByZXR1cm4gWy4uLnRoaXNdOyB9XG4gICAgcHJvdGVjdGVkIGdldFZhbHVlKHZhbHVlczogSW50MzJBcnJheSwgaW5kZXg6IG51bWJlciwgc2l6ZTogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIGVwb2NoTWlsbGlzZWNvbmRzTG9uZ1RvTXModmFsdWVzLCBpbmRleCAqIHNpemUpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgc2V0VmFsdWUodmFsdWVzOiBJbnQzMkFycmF5LCBpbmRleDogbnVtYmVyLCBzaXplOiBudW1iZXIsIGVwb2NoTXM6IG51bWJlcik6IHZvaWQge1xuICAgICAgICB2YWx1ZXNbaW5kZXggKiBzaXplXSA9IChlcG9jaE1zICUgNDI5NDk2NzI5NikgfCAwO1xuICAgICAgICB2YWx1ZXNbaW5kZXggKiBzaXplICsgc2l6ZV0gPSAoZXBvY2hNcyAvIDQyOTQ5NjcyOTYpIHwgMDtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBUaW1lc3RhbXBNaWNyb3NlY29uZFZpZXcgZXh0ZW5kcyBQcmltaXRpdmVWaWV3PFRpbWVzdGFtcD4ge1xuICAgIHB1YmxpYyB0b0FycmF5KCkgeyByZXR1cm4gWy4uLnRoaXNdOyB9XG4gICAgcHJvdGVjdGVkIGdldFZhbHVlKHZhbHVlczogSW50MzJBcnJheSwgaW5kZXg6IG51bWJlciwgc2l6ZTogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIGVwb2NoTWljcm9zZWNvbmRzTG9uZ1RvTXModmFsdWVzLCBpbmRleCAqIHNpemUpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgc2V0VmFsdWUodmFsdWVzOiBJbnQzMkFycmF5LCBpbmRleDogbnVtYmVyLCBzaXplOiBudW1iZXIsIGVwb2NoTXM6IG51bWJlcik6IHZvaWQge1xuICAgICAgICB2YWx1ZXNbaW5kZXggKiBzaXplXSA9ICgoZXBvY2hNcyAvIDEwMDApICUgNDI5NDk2NzI5NikgfCAwO1xuICAgICAgICB2YWx1ZXNbaW5kZXggKiBzaXplICsgc2l6ZV0gPSAoKGVwb2NoTXMgLyAxMDAwKSAvIDQyOTQ5NjcyOTYpIHwgMDtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBUaW1lc3RhbXBOYW5vc2Vjb25kVmlldyBleHRlbmRzIFByaW1pdGl2ZVZpZXc8VGltZXN0YW1wPiB7XG4gICAgcHVibGljIHRvQXJyYXkoKSB7IHJldHVybiBbLi4udGhpc107IH1cbiAgICBwcm90ZWN0ZWQgZ2V0VmFsdWUodmFsdWVzOiBJbnQzMkFycmF5LCBpbmRleDogbnVtYmVyLCBzaXplOiBudW1iZXIpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gZXBvY2hOYW5vc2Vjb25kc0xvbmdUb01zKHZhbHVlcywgaW5kZXggKiBzaXplKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHNldFZhbHVlKHZhbHVlczogSW50MzJBcnJheSwgaW5kZXg6IG51bWJlciwgc2l6ZTogbnVtYmVyLCBlcG9jaE1zOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdmFsdWVzW2luZGV4ICogc2l6ZV0gPSAoKGVwb2NoTXMgLyAxMDAwMDAwKSAlIDQyOTQ5NjcyOTYpIHwgMDtcbiAgICAgICAgdmFsdWVzW2luZGV4ICogc2l6ZSArIHNpemVdID0gKChlcG9jaE1zIC8gMTAwMDAwMCkgLyA0Mjk0OTY3Mjk2KSB8IDA7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgSW50ZXJ2YWxZZWFyTW9udGhWaWV3IGV4dGVuZHMgUHJpbWl0aXZlVmlldzxJbnRlcnZhbD4ge1xuICAgIHB1YmxpYyB0b0FycmF5KCkgeyByZXR1cm4gWy4uLnRoaXNdOyB9XG4gICAgcHJvdGVjdGVkIGdldFZhbHVlKHZhbHVlczogSW50MzJBcnJheSwgaW5kZXg6IG51bWJlciwgc2l6ZTogbnVtYmVyKTogSW50MzJBcnJheSB7XG4gICAgICAgIGNvbnN0IGludGVydmFsID0gdmFsdWVzW2luZGV4ICogc2l6ZV07XG4gICAgICAgIHJldHVybiBuZXcgSW50MzJBcnJheShbaW50ZXJ2YWwgLyAxMiwgLyogeWVhcnMgKi8gaW50ZXJ2YWwgJSAxMiAgLyogbW9udGhzICovXSk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBzZXRWYWx1ZSh2YWx1ZXM6IEludDMyQXJyYXksIGluZGV4OiBudW1iZXIsIHNpemU6IG51bWJlciwgdmFsdWU6IEludDMyQXJyYXkpOiB2b2lkIHtcbiAgICAgICAgdmFsdWVzW2luZGV4ICogc2l6ZV0gPSAodmFsdWVbMF0gKiAxMikgKyAodmFsdWVbMV0gJSAxMik7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgSW50ZXJ2YWxZZWFyVmlldyBleHRlbmRzIFByaW1pdGl2ZVZpZXc8SW50MzI+IHtcbiAgICBwdWJsaWMgdG9BcnJheSgpIHsgcmV0dXJuIFsuLi50aGlzXTsgfVxuICAgIHByb3RlY3RlZCBnZXRWYWx1ZSh2YWx1ZXM6IEludDMyQXJyYXksIGluZGV4OiBudW1iZXIsIHNpemU6IG51bWJlcik6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB2YWx1ZXNbaW5kZXggKiBzaXplXSAvIDEyO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgc2V0VmFsdWUodmFsdWVzOiBJbnQzMkFycmF5LCBpbmRleDogbnVtYmVyLCBzaXplOiBudW1iZXIsIHZhbHVlOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdmFsdWVzW2luZGV4ICogc2l6ZV0gPSAodmFsdWUgKiAxMikgKyAodmFsdWVzW2luZGV4ICogc2l6ZV0gJSAxMik7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgSW50ZXJ2YWxNb250aFZpZXcgZXh0ZW5kcyBQcmltaXRpdmVWaWV3PEludDMyPiB7XG4gICAgcHVibGljIHRvQXJyYXkoKSB7IHJldHVybiBbLi4udGhpc107IH1cbiAgICBwcm90ZWN0ZWQgZ2V0VmFsdWUodmFsdWVzOiBJbnQzMkFycmF5LCBpbmRleDogbnVtYmVyLCBzaXplOiBudW1iZXIpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdmFsdWVzW2luZGV4ICogc2l6ZV0gJSAxMjtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHNldFZhbHVlKHZhbHVlczogSW50MzJBcnJheSwgaW5kZXg6IG51bWJlciwgc2l6ZTogbnVtYmVyLCB2YWx1ZTogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHZhbHVlc1tpbmRleCAqIHNpemVdID0gKHZhbHVlc1tpbmRleCAqIHNpemVdICogMTIpICsgKHZhbHVlICUgMTIpO1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGVwb2NoU2Vjb25kc1RvTXMoZGF0YTogSW50MzJBcnJheSwgaW5kZXg6IG51bWJlcikgeyByZXR1cm4gMTAwMCAqIGRhdGFbaW5kZXhdOyB9XG5leHBvcnQgZnVuY3Rpb24gZXBvY2hEYXlzVG9NcyhkYXRhOiBJbnQzMkFycmF5LCBpbmRleDogbnVtYmVyKSB7IHJldHVybiA4NjQwMDAwMCAqIGRhdGFbaW5kZXhdOyB9XG5leHBvcnQgZnVuY3Rpb24gZXBvY2hNaWxsaXNlY29uZHNMb25nVG9NcyhkYXRhOiBJbnQzMkFycmF5LCBpbmRleDogbnVtYmVyKSB7IHJldHVybiA0Mjk0OTY3Mjk2ICogKGRhdGFbaW5kZXggKyAxXSkgKyAoZGF0YVtpbmRleF0gPj4+IDApOyB9XG5leHBvcnQgZnVuY3Rpb24gZXBvY2hNaWNyb3NlY29uZHNMb25nVG9NcyhkYXRhOiBJbnQzMkFycmF5LCBpbmRleDogbnVtYmVyKSB7IHJldHVybiA0Mjk0OTY3Mjk2ICogKGRhdGFbaW5kZXggKyAxXSAvIDEwMDApICsgKChkYXRhW2luZGV4XSA+Pj4gMCkgLyAxMDAwKTsgfVxuZXhwb3J0IGZ1bmN0aW9uIGVwb2NoTmFub3NlY29uZHNMb25nVG9NcyhkYXRhOiBJbnQzMkFycmF5LCBpbmRleDogbnVtYmVyKSB7IHJldHVybiA0Mjk0OTY3Mjk2ICogKGRhdGFbaW5kZXggKyAxXSAvIDEwMDAwMDApICsgKChkYXRhW2luZGV4XSA+Pj4gMCkgLyAxMDAwMDAwKTsgfVxuXG5leHBvcnQgZnVuY3Rpb24gZXBvY2hNaWxsaXNlY29uZHNUb0RhdGUoZXBvY2hNczogbnVtYmVyKSB7IHJldHVybiBuZXcgRGF0ZShlcG9jaE1zKTsgfVxuZXhwb3J0IGZ1bmN0aW9uIGVwb2NoRGF5c1RvRGF0ZShkYXRhOiBJbnQzMkFycmF5LCBpbmRleDogbnVtYmVyKSB7IHJldHVybiBlcG9jaE1pbGxpc2Vjb25kc1RvRGF0ZShlcG9jaERheXNUb01zKGRhdGEsIGluZGV4KSk7IH1cbmV4cG9ydCBmdW5jdGlvbiBlcG9jaFNlY29uZHNUb0RhdGUoZGF0YTogSW50MzJBcnJheSwgaW5kZXg6IG51bWJlcikgeyByZXR1cm4gZXBvY2hNaWxsaXNlY29uZHNUb0RhdGUoZXBvY2hTZWNvbmRzVG9NcyhkYXRhLCBpbmRleCkpOyB9XG5leHBvcnQgZnVuY3Rpb24gZXBvY2hOYW5vc2Vjb25kc0xvbmdUb0RhdGUoZGF0YTogSW50MzJBcnJheSwgaW5kZXg6IG51bWJlcikgeyByZXR1cm4gZXBvY2hNaWxsaXNlY29uZHNUb0RhdGUoZXBvY2hOYW5vc2Vjb25kc0xvbmdUb01zKGRhdGEsIGluZGV4KSk7IH1cbmV4cG9ydCBmdW5jdGlvbiBlcG9jaE1pbGxpc2Vjb25kc0xvbmdUb0RhdGUoZGF0YTogSW50MzJBcnJheSwgaW5kZXg6IG51bWJlcikgeyByZXR1cm4gZXBvY2hNaWxsaXNlY29uZHNUb0RhdGUoZXBvY2hNaWxsaXNlY29uZHNMb25nVG9NcyhkYXRhLCBpbmRleCkpOyB9XG4iXX0=

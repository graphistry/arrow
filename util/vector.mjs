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
import { Row } from '../vector/row';
/** @ignore */
export function clampIndex(source, index, then) {
    const length = source.length;
    const adjust = index > -1 ? index : (length + (index % length));
    return then ? then(source, adjust) : adjust;
}
/** @ignore */
let tmp;
/** @ignore */
export function clampRange(source, begin, end, then) {
    // Adjust args similar to Array.prototype.slice. Normalize begin/end to
    // clamp between 0 and length, and wrap around on negative indices, e.g.
    // slice(-1, 5) or slice(5, -1)
    let { length: len = 0 } = source;
    let lhs = typeof begin !== 'number' ? 0 : begin;
    let rhs = typeof end !== 'number' ? len : end;
    // wrap around on negative start/end positions
    (lhs < 0) && (lhs = ((lhs % len) + len) % len);
    (rhs < 0) && (rhs = ((rhs % len) + len) % len);
    // ensure lhs <= rhs
    (rhs < lhs) && (tmp = lhs, lhs = rhs, rhs = tmp);
    // ensure rhs <= length
    (rhs > len) && (rhs = len);
    return then ? then(source, lhs, rhs) : [lhs, rhs];
}
/** @ignore */
export function createElementComparator(search) {
    // Compare primitives
    if (search == null || typeof search !== 'object') {
        return (value) => value === search;
    }
    // Compare Dates
    if (search instanceof Date) {
        const valueOfSearch = search.valueOf();
        return (value) => value instanceof Date ? (value.valueOf() === valueOfSearch) : false;
    }
    // Compare Array-likes
    if (Array.isArray(search) || ArrayBuffer.isView(search)) {
        const n = search.length;
        const fns = [];
        for (let i = -1; ++i < n;) {
            fns[i] = createElementComparator(search[i]);
        }
        return (value) => {
            if (!value || value.length !== n) {
                return false;
            }
            // Handle the case where the search element is an Array, but the
            // values are Rows or Vectors, e.g. list.indexOf(['foo', 'bar'])
            if ((value instanceof Row) || (value instanceof Vector)) {
                for (let i = -1, n = value.length; ++i < n;) {
                    if (!(fns[i](value.get(i)))) {
                        return false;
                    }
                }
                return true;
            }
            for (let i = -1, n = value.length; ++i < n;) {
                if (!(fns[i](value[i]))) {
                    return false;
                }
            }
            return true;
        };
    }
    // Compare Rows and Vectors
    if ((search instanceof Row) || (search instanceof Vector)) {
        const n = search.length;
        const C = search.constructor;
        const fns = [];
        for (let i = -1; ++i < n;) {
            fns[i] = createElementComparator(search.get(i));
        }
        return (value) => {
            if (!(value instanceof C)) {
                return false;
            }
            if (!(value.length === n)) {
                return false;
            }
            for (let i = -1; ++i < n;) {
                if (!(fns[i](value.get(i)))) {
                    return false;
                }
            }
            return true;
        };
    }
    // Compare non-empty Objects
    const keys = Object.keys(search);
    if (keys.length > 0) {
        const n = keys.length;
        const fns = [];
        for (let i = -1; ++i < n;) {
            fns[i] = createElementComparator(search[keys[i]]);
        }
        return (value) => {
            if (!value || typeof value !== 'object') {
                return false;
            }
            for (let i = -1; ++i < n;) {
                if (!(fns[i](value[keys[i]]))) {
                    return false;
                }
            }
            return true;
        };
    }
    // No valid comparator
    return () => false;
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QkFBc0I7SUFDdEIsT0FBTyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUM7QUFDdkIsQ0FBQyIsImZpbGUiOiJ1dGlsL3ZlY3Rvci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBWZWN0b3IgfSBmcm9tICcuLi92ZWN0b3InO1xuaW1wb3J0IHsgUm93IH0gZnJvbSAnLi4vdmVjdG9yL3Jvdyc7XG5cbi8qKiBAaWdub3JlICovXG50eXBlIFJhbmdlTGlrZSA9IHsgbGVuZ3RoOiBudW1iZXI7IHN0cmlkZT86IG51bWJlciB9O1xuLyoqIEBpZ25vcmUgKi9cbnR5cGUgQ2xhbXBUaGVuPFQgZXh0ZW5kcyBSYW5nZUxpa2U+ID0gKHNvdXJjZTogVCwgaW5kZXg6IG51bWJlcikgPT4gYW55O1xuLyoqIEBpZ25vcmUgKi9cbnR5cGUgQ2xhbXBSYW5nZVRoZW48VCBleHRlbmRzIFJhbmdlTGlrZT4gPSAoc291cmNlOiBULCBvZmZzZXQ6IG51bWJlciwgbGVuZ3RoOiBudW1iZXIpID0+IGFueTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNsYW1wSW5kZXg8VCBleHRlbmRzIFJhbmdlTGlrZT4oc291cmNlOiBULCBpbmRleDogbnVtYmVyKTogbnVtYmVyO1xuZXhwb3J0IGZ1bmN0aW9uIGNsYW1wSW5kZXg8VCBleHRlbmRzIFJhbmdlTGlrZSwgTiBleHRlbmRzIENsYW1wVGhlbjxUPiA9IENsYW1wVGhlbjxUPj4oc291cmNlOiBULCBpbmRleDogbnVtYmVyLCB0aGVuOiBOKTogUmV0dXJuVHlwZTxOPjtcbi8qKiBAaWdub3JlICovXG5leHBvcnQgZnVuY3Rpb24gY2xhbXBJbmRleDxUIGV4dGVuZHMgUmFuZ2VMaWtlLCBOIGV4dGVuZHMgQ2xhbXBUaGVuPFQ+ID0gQ2xhbXBUaGVuPFQ+Pihzb3VyY2U6IFQsIGluZGV4OiBudW1iZXIsIHRoZW4/OiBOKSB7XG4gICAgY29uc3QgbGVuZ3RoID0gc291cmNlLmxlbmd0aDtcbiAgICBjb25zdCBhZGp1c3QgPSBpbmRleCA+IC0xID8gaW5kZXggOiAobGVuZ3RoICsgKGluZGV4ICUgbGVuZ3RoKSk7XG4gICAgcmV0dXJuIHRoZW4gPyB0aGVuKHNvdXJjZSwgYWRqdXN0KSA6IGFkanVzdDtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmxldCB0bXA6IG51bWJlcjtcbmV4cG9ydCBmdW5jdGlvbiBjbGFtcFJhbmdlPFQgZXh0ZW5kcyBSYW5nZUxpa2U+KHNvdXJjZTogVCwgYmVnaW46IG51bWJlciB8IHVuZGVmaW5lZCwgZW5kOiBudW1iZXIgfCB1bmRlZmluZWQpOiBbbnVtYmVyLCBudW1iZXJdO1xuZXhwb3J0IGZ1bmN0aW9uIGNsYW1wUmFuZ2U8VCBleHRlbmRzIFJhbmdlTGlrZSwgTiBleHRlbmRzIENsYW1wUmFuZ2VUaGVuPFQ+ID0gQ2xhbXBSYW5nZVRoZW48VD4+KHNvdXJjZTogVCwgYmVnaW46IG51bWJlciB8IHVuZGVmaW5lZCwgZW5kOiBudW1iZXIgfCB1bmRlZmluZWQsIHRoZW46IE4pOiBSZXR1cm5UeXBlPE4+O1xuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGFtcFJhbmdlPFQgZXh0ZW5kcyBSYW5nZUxpa2UsIE4gZXh0ZW5kcyBDbGFtcFJhbmdlVGhlbjxUPiA9IENsYW1wUmFuZ2VUaGVuPFQ+Pihzb3VyY2U6IFQsIGJlZ2luOiBudW1iZXIgfCB1bmRlZmluZWQsIGVuZDogbnVtYmVyIHwgdW5kZWZpbmVkLCB0aGVuPzogTikge1xuXG4gICAgLy8gQWRqdXN0IGFyZ3Mgc2ltaWxhciB0byBBcnJheS5wcm90b3R5cGUuc2xpY2UuIE5vcm1hbGl6ZSBiZWdpbi9lbmQgdG9cbiAgICAvLyBjbGFtcCBiZXR3ZWVuIDAgYW5kIGxlbmd0aCwgYW5kIHdyYXAgYXJvdW5kIG9uIG5lZ2F0aXZlIGluZGljZXMsIGUuZy5cbiAgICAvLyBzbGljZSgtMSwgNSkgb3Igc2xpY2UoNSwgLTEpXG4gICAgbGV0IHsgbGVuZ3RoOiBsZW4gPSAwIH0gPSBzb3VyY2U7XG4gICAgbGV0IGxocyA9IHR5cGVvZiBiZWdpbiAhPT0gJ251bWJlcicgPyAwIDogYmVnaW47XG4gICAgbGV0IHJocyA9IHR5cGVvZiBlbmQgIT09ICdudW1iZXInID8gbGVuIDogZW5kO1xuICAgIC8vIHdyYXAgYXJvdW5kIG9uIG5lZ2F0aXZlIHN0YXJ0L2VuZCBwb3NpdGlvbnNcbiAgICAobGhzIDwgMCkgJiYgKGxocyA9ICgobGhzICUgbGVuKSArIGxlbikgJSBsZW4pO1xuICAgIChyaHMgPCAwKSAmJiAocmhzID0gKChyaHMgJSBsZW4pICsgbGVuKSAlIGxlbik7XG4gICAgLy8gZW5zdXJlIGxocyA8PSByaHNcbiAgICAocmhzIDwgbGhzKSAmJiAodG1wID0gbGhzLCBsaHMgPSByaHMsIHJocyA9IHRtcCk7XG4gICAgIC8vIGVuc3VyZSByaHMgPD0gbGVuZ3RoXG4gICAgKHJocyA+IGxlbikgJiYgKHJocyA9IGxlbik7XG5cbiAgICByZXR1cm4gdGhlbiA/IHRoZW4oc291cmNlLCBsaHMsIHJocykgOiBbbGhzLCByaHNdO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnRDb21wYXJhdG9yKHNlYXJjaDogYW55KSB7XG4gICAgLy8gQ29tcGFyZSBwcmltaXRpdmVzXG4gICAgaWYgKHNlYXJjaCA9PSBudWxsIHx8IHR5cGVvZiBzZWFyY2ggIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiAodmFsdWU6IGFueSkgPT4gdmFsdWUgPT09IHNlYXJjaDtcbiAgICB9XG4gICAgLy8gQ29tcGFyZSBEYXRlc1xuICAgIGlmIChzZWFyY2ggaW5zdGFuY2VvZiBEYXRlKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlT2ZTZWFyY2ggPSBzZWFyY2gudmFsdWVPZigpO1xuICAgICAgICByZXR1cm4gKHZhbHVlOiBhbnkpID0+IHZhbHVlIGluc3RhbmNlb2YgRGF0ZSA/ICh2YWx1ZS52YWx1ZU9mKCkgPT09IHZhbHVlT2ZTZWFyY2gpIDogZmFsc2U7XG4gICAgfVxuICAgIC8vIENvbXBhcmUgQXJyYXktbGlrZXNcbiAgICBpZiAoQXJyYXkuaXNBcnJheShzZWFyY2gpIHx8IEFycmF5QnVmZmVyLmlzVmlldyhzZWFyY2gpKSB7XG4gICAgICAgIGNvbnN0IG4gPSAoc2VhcmNoIGFzIGFueSkubGVuZ3RoO1xuICAgICAgICBjb25zdCBmbnMgPSBbXSBhcyAoKHg6IGFueSkgPT4gYm9vbGVhbilbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IC0xOyArK2kgPCBuOykge1xuICAgICAgICAgICAgZm5zW2ldID0gY3JlYXRlRWxlbWVudENvbXBhcmF0b3IoKHNlYXJjaCBhcyBhbnkpW2ldKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKHZhbHVlOiBhbnkpID0+IHtcbiAgICAgICAgICAgIGlmICghdmFsdWUgfHwgdmFsdWUubGVuZ3RoICE9PSBuKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjYXNlIHdoZXJlIHRoZSBzZWFyY2ggZWxlbWVudCBpcyBhbiBBcnJheSwgYnV0IHRoZVxuICAgICAgICAgICAgLy8gdmFsdWVzIGFyZSBSb3dzIG9yIFZlY3RvcnMsIGUuZy4gbGlzdC5pbmRleE9mKFsnZm9vJywgJ2JhciddKVxuICAgICAgICAgICAgaWYgKCh2YWx1ZSBpbnN0YW5jZW9mIFJvdykgfHwgKHZhbHVlIGluc3RhbmNlb2YgVmVjdG9yKSkge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAtMSwgbiA9IHZhbHVlLmxlbmd0aDsgKytpIDwgbjspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEoZm5zW2ldKCh2YWx1ZSBhcyBhbnkpLmdldChpKSkpKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAtMSwgbiA9IHZhbHVlLmxlbmd0aDsgKytpIDwgbjspIHtcbiAgICAgICAgICAgICAgICBpZiAoIShmbnNbaV0odmFsdWVbaV0pKSkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuICAgIH1cbiAgICAvLyBDb21wYXJlIFJvd3MgYW5kIFZlY3RvcnNcbiAgICBpZiAoKHNlYXJjaCBpbnN0YW5jZW9mIFJvdykgfHwgKHNlYXJjaCBpbnN0YW5jZW9mIFZlY3RvcikpIHtcbiAgICAgICAgY29uc3QgbiA9IHNlYXJjaC5sZW5ndGg7XG4gICAgICAgIGNvbnN0IEMgPSBzZWFyY2guY29uc3RydWN0b3IgYXMgYW55O1xuICAgICAgICBjb25zdCBmbnMgPSBbXSBhcyAoKHg6IGFueSkgPT4gYm9vbGVhbilbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IC0xOyArK2kgPCBuOykge1xuICAgICAgICAgICAgZm5zW2ldID0gY3JlYXRlRWxlbWVudENvbXBhcmF0b3IoKHNlYXJjaCBhcyBhbnkpLmdldChpKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICh2YWx1ZTogYW55KSA9PiB7XG4gICAgICAgICAgICBpZiAoISh2YWx1ZSBpbnN0YW5jZW9mIEMpKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgICAgICAgaWYgKCEodmFsdWUubGVuZ3RoID09PSBuKSkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAtMTsgKytpIDwgbjspIHtcbiAgICAgICAgICAgICAgICBpZiAoIShmbnNbaV0odmFsdWUuZ2V0KGkpKSkpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgLy8gQ29tcGFyZSBub24tZW1wdHkgT2JqZWN0c1xuICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhzZWFyY2gpO1xuICAgIGlmIChrZXlzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY29uc3QgbiA9IGtleXMubGVuZ3RoO1xuICAgICAgICBjb25zdCBmbnMgPSBbXSBhcyAoKHg6IGFueSkgPT4gYm9vbGVhbilbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IC0xOyArK2kgPCBuOykge1xuICAgICAgICAgICAgZm5zW2ldID0gY3JlYXRlRWxlbWVudENvbXBhcmF0b3Ioc2VhcmNoW2tleXNbaV1dKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKHZhbHVlOiBhbnkpID0+IHtcbiAgICAgICAgICAgIGlmICghdmFsdWUgfHwgdHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0JykgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAtMTsgKytpIDwgbjspIHtcbiAgICAgICAgICAgICAgICBpZiAoIShmbnNbaV0odmFsdWVba2V5c1tpXV0pKSkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuICAgIH1cbiAgICAvLyBObyB2YWxpZCBjb21wYXJhdG9yXG4gICAgcmV0dXJuICgpID0+IGZhbHNlO1xufVxuIl19

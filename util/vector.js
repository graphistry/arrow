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
const row_1 = require("../vector/row");
/** @ignore */
function clampIndex(source, index, then) {
    const length = source.length;
    const adjust = index > -1 ? index : (length + (index % length));
    return then ? then(source, adjust) : adjust;
}
exports.clampIndex = clampIndex;
/** @ignore */
let tmp;
/** @ignore */
function clampRange(source, begin, end, then) {
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
exports.clampRange = clampRange;
/** @ignore */
function createElementComparator(search) {
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
            if ((value instanceof row_1.Row) || (value instanceof vector_1.Vector)) {
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
    if ((search instanceof row_1.Row) || (search instanceof vector_1.Vector)) {
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
exports.createElementComparator = createElementComparator;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFDdkIsQ0FBQztBQXBFRCwwREFvRUMiLCJmaWxlIjoidXRpbC92ZWN0b3IuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgVmVjdG9yIH0gZnJvbSAnLi4vdmVjdG9yJztcbmltcG9ydCB7IFJvdyB9IGZyb20gJy4uL3ZlY3Rvci9yb3cnO1xuXG4vKiogQGlnbm9yZSAqL1xudHlwZSBSYW5nZUxpa2UgPSB7IGxlbmd0aDogbnVtYmVyOyBzdHJpZGU/OiBudW1iZXIgfTtcbi8qKiBAaWdub3JlICovXG50eXBlIENsYW1wVGhlbjxUIGV4dGVuZHMgUmFuZ2VMaWtlPiA9IChzb3VyY2U6IFQsIGluZGV4OiBudW1iZXIpID0+IGFueTtcbi8qKiBAaWdub3JlICovXG50eXBlIENsYW1wUmFuZ2VUaGVuPFQgZXh0ZW5kcyBSYW5nZUxpa2U+ID0gKHNvdXJjZTogVCwgb2Zmc2V0OiBudW1iZXIsIGxlbmd0aDogbnVtYmVyKSA9PiBhbnk7XG5cbmV4cG9ydCBmdW5jdGlvbiBjbGFtcEluZGV4PFQgZXh0ZW5kcyBSYW5nZUxpa2U+KHNvdXJjZTogVCwgaW5kZXg6IG51bWJlcik6IG51bWJlcjtcbmV4cG9ydCBmdW5jdGlvbiBjbGFtcEluZGV4PFQgZXh0ZW5kcyBSYW5nZUxpa2UsIE4gZXh0ZW5kcyBDbGFtcFRoZW48VD4gPSBDbGFtcFRoZW48VD4+KHNvdXJjZTogVCwgaW5kZXg6IG51bWJlciwgdGhlbjogTik6IFJldHVyblR5cGU8Tj47XG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsYW1wSW5kZXg8VCBleHRlbmRzIFJhbmdlTGlrZSwgTiBleHRlbmRzIENsYW1wVGhlbjxUPiA9IENsYW1wVGhlbjxUPj4oc291cmNlOiBULCBpbmRleDogbnVtYmVyLCB0aGVuPzogTikge1xuICAgIGNvbnN0IGxlbmd0aCA9IHNvdXJjZS5sZW5ndGg7XG4gICAgY29uc3QgYWRqdXN0ID0gaW5kZXggPiAtMSA/IGluZGV4IDogKGxlbmd0aCArIChpbmRleCAlIGxlbmd0aCkpO1xuICAgIHJldHVybiB0aGVuID8gdGhlbihzb3VyY2UsIGFkanVzdCkgOiBhZGp1c3Q7XG59XG5cbi8qKiBAaWdub3JlICovXG5sZXQgdG1wOiBudW1iZXI7XG5leHBvcnQgZnVuY3Rpb24gY2xhbXBSYW5nZTxUIGV4dGVuZHMgUmFuZ2VMaWtlPihzb3VyY2U6IFQsIGJlZ2luOiBudW1iZXIgfCB1bmRlZmluZWQsIGVuZDogbnVtYmVyIHwgdW5kZWZpbmVkKTogW251bWJlciwgbnVtYmVyXTtcbmV4cG9ydCBmdW5jdGlvbiBjbGFtcFJhbmdlPFQgZXh0ZW5kcyBSYW5nZUxpa2UsIE4gZXh0ZW5kcyBDbGFtcFJhbmdlVGhlbjxUPiA9IENsYW1wUmFuZ2VUaGVuPFQ+Pihzb3VyY2U6IFQsIGJlZ2luOiBudW1iZXIgfCB1bmRlZmluZWQsIGVuZDogbnVtYmVyIHwgdW5kZWZpbmVkLCB0aGVuOiBOKTogUmV0dXJuVHlwZTxOPjtcbi8qKiBAaWdub3JlICovXG5leHBvcnQgZnVuY3Rpb24gY2xhbXBSYW5nZTxUIGV4dGVuZHMgUmFuZ2VMaWtlLCBOIGV4dGVuZHMgQ2xhbXBSYW5nZVRoZW48VD4gPSBDbGFtcFJhbmdlVGhlbjxUPj4oc291cmNlOiBULCBiZWdpbjogbnVtYmVyIHwgdW5kZWZpbmVkLCBlbmQ6IG51bWJlciB8IHVuZGVmaW5lZCwgdGhlbj86IE4pIHtcblxuICAgIC8vIEFkanVzdCBhcmdzIHNpbWlsYXIgdG8gQXJyYXkucHJvdG90eXBlLnNsaWNlLiBOb3JtYWxpemUgYmVnaW4vZW5kIHRvXG4gICAgLy8gY2xhbXAgYmV0d2VlbiAwIGFuZCBsZW5ndGgsIGFuZCB3cmFwIGFyb3VuZCBvbiBuZWdhdGl2ZSBpbmRpY2VzLCBlLmcuXG4gICAgLy8gc2xpY2UoLTEsIDUpIG9yIHNsaWNlKDUsIC0xKVxuICAgIGxldCB7IGxlbmd0aDogbGVuID0gMCB9ID0gc291cmNlO1xuICAgIGxldCBsaHMgPSB0eXBlb2YgYmVnaW4gIT09ICdudW1iZXInID8gMCA6IGJlZ2luO1xuICAgIGxldCByaHMgPSB0eXBlb2YgZW5kICE9PSAnbnVtYmVyJyA/IGxlbiA6IGVuZDtcbiAgICAvLyB3cmFwIGFyb3VuZCBvbiBuZWdhdGl2ZSBzdGFydC9lbmQgcG9zaXRpb25zXG4gICAgKGxocyA8IDApICYmIChsaHMgPSAoKGxocyAlIGxlbikgKyBsZW4pICUgbGVuKTtcbiAgICAocmhzIDwgMCkgJiYgKHJocyA9ICgocmhzICUgbGVuKSArIGxlbikgJSBsZW4pO1xuICAgIC8vIGVuc3VyZSBsaHMgPD0gcmhzXG4gICAgKHJocyA8IGxocykgJiYgKHRtcCA9IGxocywgbGhzID0gcmhzLCByaHMgPSB0bXApO1xuICAgICAvLyBlbnN1cmUgcmhzIDw9IGxlbmd0aFxuICAgIChyaHMgPiBsZW4pICYmIChyaHMgPSBsZW4pO1xuXG4gICAgcmV0dXJuIHRoZW4gPyB0aGVuKHNvdXJjZSwgbGhzLCByaHMpIDogW2xocywgcmhzXTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbGVtZW50Q29tcGFyYXRvcihzZWFyY2g6IGFueSkge1xuICAgIC8vIENvbXBhcmUgcHJpbWl0aXZlc1xuICAgIGlmIChzZWFyY2ggPT0gbnVsbCB8fCB0eXBlb2Ygc2VhcmNoICE9PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gKHZhbHVlOiBhbnkpID0+IHZhbHVlID09PSBzZWFyY2g7XG4gICAgfVxuICAgIC8vIENvbXBhcmUgRGF0ZXNcbiAgICBpZiAoc2VhcmNoIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgICBjb25zdCB2YWx1ZU9mU2VhcmNoID0gc2VhcmNoLnZhbHVlT2YoKTtcbiAgICAgICAgcmV0dXJuICh2YWx1ZTogYW55KSA9PiB2YWx1ZSBpbnN0YW5jZW9mIERhdGUgPyAodmFsdWUudmFsdWVPZigpID09PSB2YWx1ZU9mU2VhcmNoKSA6IGZhbHNlO1xuICAgIH1cbiAgICAvLyBDb21wYXJlIEFycmF5LWxpa2VzXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoc2VhcmNoKSB8fCBBcnJheUJ1ZmZlci5pc1ZpZXcoc2VhcmNoKSkge1xuICAgICAgICBjb25zdCBuID0gKHNlYXJjaCBhcyBhbnkpLmxlbmd0aDtcbiAgICAgICAgY29uc3QgZm5zID0gW10gYXMgKCh4OiBhbnkpID0+IGJvb2xlYW4pW107XG4gICAgICAgIGZvciAobGV0IGkgPSAtMTsgKytpIDwgbjspIHtcbiAgICAgICAgICAgIGZuc1tpXSA9IGNyZWF0ZUVsZW1lbnRDb21wYXJhdG9yKChzZWFyY2ggYXMgYW55KVtpXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICh2YWx1ZTogYW55KSA9PiB7XG4gICAgICAgICAgICBpZiAoIXZhbHVlIHx8IHZhbHVlLmxlbmd0aCAhPT0gbikgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgICAgICAgIC8vIEhhbmRsZSB0aGUgY2FzZSB3aGVyZSB0aGUgc2VhcmNoIGVsZW1lbnQgaXMgYW4gQXJyYXksIGJ1dCB0aGVcbiAgICAgICAgICAgIC8vIHZhbHVlcyBhcmUgUm93cyBvciBWZWN0b3JzLCBlLmcuIGxpc3QuaW5kZXhPZihbJ2ZvbycsICdiYXInXSlcbiAgICAgICAgICAgIGlmICgodmFsdWUgaW5zdGFuY2VvZiBSb3cpIHx8ICh2YWx1ZSBpbnN0YW5jZW9mIFZlY3RvcikpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gLTEsIG4gPSB2YWx1ZS5sZW5ndGg7ICsraSA8IG47KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghKGZuc1tpXSgodmFsdWUgYXMgYW55KS5nZXQoaSkpKSkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gLTEsIG4gPSB2YWx1ZS5sZW5ndGg7ICsraSA8IG47KSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoZm5zW2ldKHZhbHVlW2ldKSkpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgLy8gQ29tcGFyZSBSb3dzIGFuZCBWZWN0b3JzXG4gICAgaWYgKChzZWFyY2ggaW5zdGFuY2VvZiBSb3cpIHx8IChzZWFyY2ggaW5zdGFuY2VvZiBWZWN0b3IpKSB7XG4gICAgICAgIGNvbnN0IG4gPSBzZWFyY2gubGVuZ3RoO1xuICAgICAgICBjb25zdCBDID0gc2VhcmNoLmNvbnN0cnVjdG9yIGFzIGFueTtcbiAgICAgICAgY29uc3QgZm5zID0gW10gYXMgKCh4OiBhbnkpID0+IGJvb2xlYW4pW107XG4gICAgICAgIGZvciAobGV0IGkgPSAtMTsgKytpIDwgbjspIHtcbiAgICAgICAgICAgIGZuc1tpXSA9IGNyZWF0ZUVsZW1lbnRDb21wYXJhdG9yKChzZWFyY2ggYXMgYW55KS5nZXQoaSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAodmFsdWU6IGFueSkgPT4ge1xuICAgICAgICAgICAgaWYgKCEodmFsdWUgaW5zdGFuY2VvZiBDKSkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgICAgICAgIGlmICghKHZhbHVlLmxlbmd0aCA9PT0gbikpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gLTE7ICsraSA8IG47KSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoZm5zW2ldKHZhbHVlLmdldChpKSkpKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH07XG4gICAgfVxuICAgIC8vIENvbXBhcmUgbm9uLWVtcHR5IE9iamVjdHNcbiAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMoc2VhcmNoKTtcbiAgICBpZiAoa2V5cy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnN0IG4gPSBrZXlzLmxlbmd0aDtcbiAgICAgICAgY29uc3QgZm5zID0gW10gYXMgKCh4OiBhbnkpID0+IGJvb2xlYW4pW107XG4gICAgICAgIGZvciAobGV0IGkgPSAtMTsgKytpIDwgbjspIHtcbiAgICAgICAgICAgIGZuc1tpXSA9IGNyZWF0ZUVsZW1lbnRDb21wYXJhdG9yKHNlYXJjaFtrZXlzW2ldXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICh2YWx1ZTogYW55KSA9PiB7XG4gICAgICAgICAgICBpZiAoIXZhbHVlIHx8IHR5cGVvZiB2YWx1ZSAhPT0gJ29iamVjdCcpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gLTE7ICsraSA8IG47KSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoZm5zW2ldKHZhbHVlW2tleXNbaV1dKSkpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgLy8gTm8gdmFsaWQgY29tcGFyYXRvclxuICAgIHJldHVybiAoKSA9PiBmYWxzZTtcbn1cbiJdfQ==

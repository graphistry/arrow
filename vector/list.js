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
const text_encoding_utf_8_1 = require("text-encoding-utf-8");
exports.encodeUtf8 = ((encoder) => encoder.encode.bind(encoder))(new text_encoding_utf_8_1.TextEncoder('utf-8'));
exports.decodeUtf8 = ((decoder) => decoder.decode.bind(decoder))(new text_encoding_utf_8_1.TextDecoder('utf-8'));
class ListViewBase {
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
    toArray() {
        return [...this];
    }
    get(index) {
        return this.getList(this.values, index, this.valueOffsets);
    }
    set(index, value) {
        return this.setList(this.values, index, value, this.valueOffsets);
    }
    *[Symbol.iterator]() {
        const get = this.getList, length = this.length;
        const values = this.values, valueOffsets = this.valueOffsets;
        for (let index = -1; ++index < length;) {
            yield get(values, index, valueOffsets);
        }
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
}
exports.ListViewBase = ListViewBase;
class VariableListViewBase extends ListViewBase {
    constructor(data) {
        super(data);
        this.length = data.length;
        this.valueOffsets = data.valueOffsets;
    }
}
exports.VariableListViewBase = VariableListViewBase;
class ListView extends VariableListViewBase {
    constructor(data) {
        super(data);
        this.values = vector_1.createVector(data.values);
    }
    getChildAt(index) {
        return index === 0 ? this.values : null;
    }
    getList(values, index, valueOffsets) {
        return values.slice(valueOffsets[index], valueOffsets[index + 1]);
    }
    setList(values, index, value, valueOffsets) {
        let idx = -1;
        let offset = valueOffsets[index];
        let end = Math.min(value.length, valueOffsets[index + 1] - offset);
        while (offset < end) {
            values.set(offset++, value.get(++idx));
        }
    }
}
exports.ListView = ListView;
class FixedSizeListView extends ListViewBase {
    constructor(data) {
        super(data);
        this.size = data.type.listSize;
        this.values = vector_1.createVector(data.values);
    }
    getChildAt(index) {
        return index === 0 ? this.values : null;
    }
    getList(values, index) {
        const size = this.size;
        return values.slice(index *= size, index + size);
    }
    setList(values, index, value) {
        let size = this.size;
        for (let idx = -1, offset = index * size; ++idx < size;) {
            values.set(offset + idx, value.get(++idx));
        }
    }
}
exports.FixedSizeListView = FixedSizeListView;
class BinaryView extends VariableListViewBase {
    getList(values, index, valueOffsets) {
        return values.subarray(valueOffsets[index], valueOffsets[index + 1]);
    }
    setList(values, index, value, valueOffsets) {
        const offset = valueOffsets[index];
        values.set(value.subarray(0, valueOffsets[index + 1] - offset), offset);
    }
}
exports.BinaryView = BinaryView;
class Utf8View extends VariableListViewBase {
    getList(values, index, valueOffsets) {
        return exports.decodeUtf8(values.subarray(valueOffsets[index], valueOffsets[index + 1]));
    }
    setList(values, index, value, valueOffsets) {
        const offset = valueOffsets[index];
        values.set(exports.encodeUtf8(value).subarray(0, valueOffsets[index + 1] - offset), offset);
    }
}
exports.Utf8View = Utf8View;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInZlY3Rvci9saXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSw2REFBNkQ7QUFDN0QsK0RBQStEO0FBQy9ELHdEQUF3RDtBQUN4RCw2REFBNkQ7QUFDN0Qsb0RBQW9EO0FBQ3BELDZEQUE2RDtBQUM3RCw2REFBNkQ7QUFDN0QsRUFBRTtBQUNGLCtDQUErQztBQUMvQyxFQUFFO0FBQ0YsNkRBQTZEO0FBQzdELDhEQUE4RDtBQUM5RCx5REFBeUQ7QUFDekQsNERBQTREO0FBQzVELDBEQUEwRDtBQUMxRCxxQkFBcUI7O0FBR3JCLHNDQUF1RDtBQUN2RCw2REFBK0Q7QUFJbEQsUUFBQSxVQUFVLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQ25DLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBbUMsQ0FDakUsQ0FBQyxJQUFJLGlDQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUVmLFFBQUEsVUFBVSxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUNuQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQTBELENBQ3hGLENBQUMsSUFBSSxpQ0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFFNUI7SUFJSSxZQUFZLElBQWE7UUFDckIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQzFCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUM5QixDQUFDO0lBQ00sS0FBSyxDQUFDLElBQWE7UUFDdEIsT0FBTyxJQUFXLElBQUksQ0FBQyxXQUFZLENBQUMsSUFBSSxDQUFTLENBQUM7SUFDdEQsQ0FBQztJQUNNLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0lBQ00sT0FBTztRQUNWLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ3JCLENBQUM7SUFDTSxHQUFHLENBQUMsS0FBYTtRQUNwQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQy9ELENBQUM7SUFDTSxHQUFHLENBQUMsS0FBYSxFQUFFLEtBQWtCO1FBQ3hDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ3RFLENBQUM7SUFDTSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUNyQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQy9DLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsWUFBWSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7UUFDN0QsS0FBSyxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLEtBQUssR0FBRyxNQUFNLEdBQUc7WUFDcEMsTUFBTSxHQUFHLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxZQUFZLENBQUMsQ0FBQztTQUMxQztJQUNMLENBQUM7SUFDTSxPQUFPLENBQUMsTUFBbUI7UUFDOUIsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsS0FBSyxJQUFJLEtBQUssSUFBSSxJQUFJLEVBQUU7WUFDcEIsSUFBSSxLQUFLLEtBQUssTUFBTSxFQUFFO2dCQUFFLE9BQU8sS0FBSyxDQUFDO2FBQUU7WUFDdkMsRUFBRSxLQUFLLENBQUM7U0FDWDtRQUVELE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDZCxDQUFDO0NBR0o7QUF6Q0Qsb0NBeUNDO0FBRUQsMEJBQWdGLFNBQVEsWUFBZTtJQUNuRyxZQUFZLElBQWE7UUFDckIsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ1osSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQzFCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztJQUMxQyxDQUFDO0NBQ0o7QUFORCxvREFNQztBQUVELGNBQTBDLFNBQVEsb0JBQTZCO0lBRTNFLFlBQVksSUFBYTtRQUNyQixLQUFLLENBQUMsSUFBVyxDQUFDLENBQUM7UUFDbkIsSUFBSSxDQUFDLE1BQU0sR0FBRyxxQkFBWSxDQUFFLElBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBQ00sVUFBVSxDQUFrQixLQUFhO1FBQzVDLE9BQU8sS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUUsSUFBSSxDQUFDLE1BQW9CLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUMzRCxDQUFDO0lBQ1MsT0FBTyxDQUFDLE1BQWlCLEVBQUUsS0FBYSxFQUFFLFlBQXdCO1FBQ3hFLE9BQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLEVBQUUsWUFBWSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBYyxDQUFDO0lBQ25GLENBQUM7SUFDUyxPQUFPLENBQUMsTUFBaUIsRUFBRSxLQUFhLEVBQUUsS0FBZ0IsRUFBRSxZQUF3QjtRQUMxRixJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNiLElBQUksTUFBTSxHQUFHLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNqQyxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQztRQUNuRSxPQUFPLE1BQU0sR0FBRyxHQUFHLEVBQUU7WUFDakIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztTQUMxQztJQUNMLENBQUM7Q0FDSjtBQXBCRCw0QkFvQkM7QUFFRCx1QkFBbUQsU0FBUSxZQUE4QjtJQUdyRixZQUFZLElBQTRCO1FBQ3BDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNaLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDL0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxxQkFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBQ00sVUFBVSxDQUFrQixLQUFhO1FBQzVDLE9BQU8sS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUUsSUFBSSxDQUFDLE1BQW9CLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUMzRCxDQUFDO0lBQ1MsT0FBTyxDQUFDLE1BQWlCLEVBQUUsS0FBYTtRQUM5QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ3ZCLE9BQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLElBQUksSUFBSSxFQUFFLEtBQUssR0FBRyxJQUFJLENBQWMsQ0FBQztJQUNsRSxDQUFDO0lBQ1MsT0FBTyxDQUFDLE1BQWlCLEVBQUUsS0FBYSxFQUFFLEtBQWdCO1FBQ2hFLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDckIsS0FBSyxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLEdBQUcsS0FBSyxHQUFHLElBQUksRUFBRSxFQUFFLEdBQUcsR0FBRyxJQUFJLEdBQUc7WUFDckQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsR0FBRyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQzlDO0lBQ0wsQ0FBQztDQUNKO0FBckJELDhDQXFCQztBQUVELGdCQUF3QixTQUFRLG9CQUE0QjtJQUM5QyxPQUFPLENBQUMsTUFBa0IsRUFBRSxLQUFhLEVBQUUsWUFBd0I7UUFDekUsT0FBTyxNQUFNLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFBRSxZQUFZLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDekUsQ0FBQztJQUNTLE9BQU8sQ0FBQyxNQUFrQixFQUFFLEtBQWEsRUFBRSxLQUFpQixFQUFFLFlBQXdCO1FBQzVGLE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNuQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDNUUsQ0FBQztDQUNKO0FBUkQsZ0NBUUM7QUFFRCxjQUFzQixTQUFRLG9CQUEwQjtJQUMxQyxPQUFPLENBQUMsTUFBa0IsRUFBRSxLQUFhLEVBQUUsWUFBd0I7UUFDekUsT0FBTyxrQkFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFLFlBQVksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3JGLENBQUM7SUFDUyxPQUFPLENBQUMsTUFBa0IsRUFBRSxLQUFhLEVBQUUsS0FBYSxFQUFFLFlBQXdCO1FBQ3hGLE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNuQyxNQUFNLENBQUMsR0FBRyxDQUFDLGtCQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3hGLENBQUM7Q0FDSjtBQVJELDRCQVFDIiwiZmlsZSI6InZlY3Rvci9saXN0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IERhdGEgfSBmcm9tICcuLi9kYXRhJztcbmltcG9ydCB7IFZpZXcsIFZlY3RvciwgY3JlYXRlVmVjdG9yIH0gZnJvbSAnLi4vdmVjdG9yJztcbmltcG9ydCB7IFRleHRFbmNvZGVyLCBUZXh0RGVjb2RlciB9IGZyb20gJ3RleHQtZW5jb2RpbmctdXRmLTgnO1xuaW1wb3J0IHsgTGlzdCwgQmluYXJ5LCBVdGY4LCBGaXhlZFNpemVMaXN0LCBGbGF0TGlzdFR5cGUgfSBmcm9tICcuLi90eXBlJztcbmltcG9ydCB7IExpc3RUeXBlLCBTaW5nbGVOZXN0ZWRUeXBlLCBEYXRhVHlwZSwgSXRlcmFibGVBcnJheUxpa2UgfSBmcm9tICcuLi90eXBlJztcblxuZXhwb3J0IGNvbnN0IGVuY29kZVV0ZjggPSAoKGVuY29kZXIpID0+XG4gICAgZW5jb2Rlci5lbmNvZGUuYmluZChlbmNvZGVyKSBhcyAoaW5wdXQ/OiBzdHJpbmcpID0+IFVpbnQ4QXJyYXlcbikobmV3IFRleHRFbmNvZGVyKCd1dGYtOCcpKTtcblxuZXhwb3J0IGNvbnN0IGRlY29kZVV0ZjggPSAoKGRlY29kZXIpID0+XG4gICAgZGVjb2Rlci5kZWNvZGUuYmluZChkZWNvZGVyKSBhcyAoaW5wdXQ/OiBBcnJheUJ1ZmZlckxpa2UgfCBBcnJheUJ1ZmZlclZpZXcpID0+IHN0cmluZ1xuKShuZXcgVGV4dERlY29kZXIoJ3V0Zi04JykpO1xuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTGlzdFZpZXdCYXNlPFQgZXh0ZW5kcyAoRmxhdExpc3RUeXBlIHwgU2luZ2xlTmVzdGVkVHlwZSk+IGltcGxlbWVudHMgVmlldzxUPiB7XG4gICAgcHVibGljIGxlbmd0aDogbnVtYmVyO1xuICAgIHB1YmxpYyB2YWx1ZXM6IFRbJ1RBcnJheSddO1xuICAgIHB1YmxpYyB2YWx1ZU9mZnNldHM/OiBJbnQzMkFycmF5O1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8VD4pIHtcbiAgICAgICAgdGhpcy5sZW5ndGggPSBkYXRhLmxlbmd0aDtcbiAgICAgICAgdGhpcy52YWx1ZXMgPSBkYXRhLnZhbHVlcztcbiAgICB9XG4gICAgcHVibGljIGNsb25lKGRhdGE6IERhdGE8VD4pOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIG5ldyAoPGFueT4gdGhpcy5jb25zdHJ1Y3RvcikoZGF0YSkgYXMgdGhpcztcbiAgICB9XG4gICAgcHVibGljIGlzVmFsaWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBwdWJsaWMgdG9BcnJheSgpOiBJdGVyYWJsZUFycmF5TGlrZTxUWydUVmFsdWUnXT4ge1xuICAgICAgICByZXR1cm4gWy4uLnRoaXNdO1xuICAgIH1cbiAgICBwdWJsaWMgZ2V0KGluZGV4OiBudW1iZXIpOiBUWydUVmFsdWUnXSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldExpc3QodGhpcy52YWx1ZXMsIGluZGV4LCB0aGlzLnZhbHVlT2Zmc2V0cyk7XG4gICAgfVxuICAgIHB1YmxpYyBzZXQoaW5kZXg6IG51bWJlciwgdmFsdWU6IFRbJ1RWYWx1ZSddKTogdm9pZCB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldExpc3QodGhpcy52YWx1ZXMsIGluZGV4LCB2YWx1ZSwgdGhpcy52YWx1ZU9mZnNldHMpO1xuICAgIH1cbiAgICBwdWJsaWMgKltTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VFsnVFZhbHVlJ10+IHtcbiAgICAgICAgY29uc3QgZ2V0ID0gdGhpcy5nZXRMaXN0LCBsZW5ndGggPSB0aGlzLmxlbmd0aDtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gdGhpcy52YWx1ZXMsIHZhbHVlT2Zmc2V0cyA9IHRoaXMudmFsdWVPZmZzZXRzO1xuICAgICAgICBmb3IgKGxldCBpbmRleCA9IC0xOyArK2luZGV4IDwgbGVuZ3RoOykge1xuICAgICAgICAgICAgeWllbGQgZ2V0KHZhbHVlcywgaW5kZXgsIHZhbHVlT2Zmc2V0cyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcHVibGljIGluZGV4T2Yoc2VhcmNoOiBUWydUVmFsdWUnXSkge1xuICAgICAgICBsZXQgaW5kZXggPSAwO1xuICAgICAgICBmb3IgKGxldCB2YWx1ZSBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAodmFsdWUgPT09IHNlYXJjaCkgeyByZXR1cm4gaW5kZXg7IH1cbiAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gLTE7XG4gICAgfVxuICAgIHByb3RlY3RlZCBhYnN0cmFjdCBnZXRMaXN0KHZhbHVlczogVFsnVEFycmF5J10sIGluZGV4OiBudW1iZXIsIHZhbHVlT2Zmc2V0cz86IEludDMyQXJyYXkpOiBUWydUVmFsdWUnXTtcbiAgICBwcm90ZWN0ZWQgYWJzdHJhY3Qgc2V0TGlzdCh2YWx1ZXM6IFRbJ1RBcnJheSddLCBpbmRleDogbnVtYmVyLCB2YWx1ZTogVFsnVFZhbHVlJ10sIHZhbHVlT2Zmc2V0cz86IEludDMyQXJyYXkpOiB2b2lkO1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgVmFyaWFibGVMaXN0Vmlld0Jhc2U8VCBleHRlbmRzIChMaXN0VHlwZSB8IEZsYXRMaXN0VHlwZSk+IGV4dGVuZHMgTGlzdFZpZXdCYXNlPFQ+IHtcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPFQ+KSB7XG4gICAgICAgIHN1cGVyKGRhdGEpO1xuICAgICAgICB0aGlzLmxlbmd0aCA9IGRhdGEubGVuZ3RoO1xuICAgICAgICB0aGlzLnZhbHVlT2Zmc2V0cyA9IGRhdGEudmFsdWVPZmZzZXRzO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIExpc3RWaWV3PFQgZXh0ZW5kcyBEYXRhVHlwZT4gZXh0ZW5kcyBWYXJpYWJsZUxpc3RWaWV3QmFzZTxMaXN0PFQ+PiB7XG4gICAgcHVibGljIHZhbHVlczogVmVjdG9yPFQ+O1xuICAgIGNvbnN0cnVjdG9yKGRhdGE6IERhdGE8VD4pIHtcbiAgICAgICAgc3VwZXIoZGF0YSBhcyBhbnkpO1xuICAgICAgICB0aGlzLnZhbHVlcyA9IGNyZWF0ZVZlY3RvcigoZGF0YSBhcyBhbnkpLnZhbHVlcyk7XG4gICAgfVxuICAgIHB1YmxpYyBnZXRDaGlsZEF0PFIgZXh0ZW5kcyBUID0gVD4oaW5kZXg6IG51bWJlcik6IFZlY3RvcjxSPiB8IG51bGwge1xuICAgICAgICByZXR1cm4gaW5kZXggPT09IDAgPyAodGhpcy52YWx1ZXMgYXMgVmVjdG9yPFI+KSA6IG51bGw7XG4gICAgfVxuICAgIHByb3RlY3RlZCBnZXRMaXN0KHZhbHVlczogVmVjdG9yPFQ+LCBpbmRleDogbnVtYmVyLCB2YWx1ZU9mZnNldHM6IEludDMyQXJyYXkpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlcy5zbGljZSh2YWx1ZU9mZnNldHNbaW5kZXhdLCB2YWx1ZU9mZnNldHNbaW5kZXggKyAxXSkgYXMgVmVjdG9yPFQ+O1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgc2V0TGlzdCh2YWx1ZXM6IFZlY3RvcjxUPiwgaW5kZXg6IG51bWJlciwgdmFsdWU6IFZlY3RvcjxUPiwgdmFsdWVPZmZzZXRzOiBJbnQzMkFycmF5KTogdm9pZCB7XG4gICAgICAgIGxldCBpZHggPSAtMTtcbiAgICAgICAgbGV0IG9mZnNldCA9IHZhbHVlT2Zmc2V0c1tpbmRleF07XG4gICAgICAgIGxldCBlbmQgPSBNYXRoLm1pbih2YWx1ZS5sZW5ndGgsIHZhbHVlT2Zmc2V0c1tpbmRleCArIDFdIC0gb2Zmc2V0KTtcbiAgICAgICAgd2hpbGUgKG9mZnNldCA8IGVuZCkge1xuICAgICAgICAgICAgdmFsdWVzLnNldChvZmZzZXQrKywgdmFsdWUuZ2V0KCsraWR4KSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBGaXhlZFNpemVMaXN0VmlldzxUIGV4dGVuZHMgRGF0YVR5cGU+IGV4dGVuZHMgTGlzdFZpZXdCYXNlPEZpeGVkU2l6ZUxpc3Q8VD4+IHtcbiAgICBwdWJsaWMgc2l6ZTogbnVtYmVyO1xuICAgIHB1YmxpYyB2YWx1ZXM6IFZlY3RvcjxUPjtcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPEZpeGVkU2l6ZUxpc3Q8VD4+KSB7XG4gICAgICAgIHN1cGVyKGRhdGEpO1xuICAgICAgICB0aGlzLnNpemUgPSBkYXRhLnR5cGUubGlzdFNpemU7XG4gICAgICAgIHRoaXMudmFsdWVzID0gY3JlYXRlVmVjdG9yKGRhdGEudmFsdWVzKTtcbiAgICB9XG4gICAgcHVibGljIGdldENoaWxkQXQ8UiBleHRlbmRzIFQgPSBUPihpbmRleDogbnVtYmVyKTogVmVjdG9yPFI+IHwgbnVsbCB7XG4gICAgICAgIHJldHVybiBpbmRleCA9PT0gMCA/ICh0aGlzLnZhbHVlcyBhcyBWZWN0b3I8Uj4pIDogbnVsbDtcbiAgICB9XG4gICAgcHJvdGVjdGVkIGdldExpc3QodmFsdWVzOiBWZWN0b3I8VD4sIGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgY29uc3Qgc2l6ZSA9IHRoaXMuc2l6ZTtcbiAgICAgICAgcmV0dXJuIHZhbHVlcy5zbGljZShpbmRleCAqPSBzaXplLCBpbmRleCArIHNpemUpIGFzIFZlY3RvcjxUPjtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHNldExpc3QodmFsdWVzOiBWZWN0b3I8VD4sIGluZGV4OiBudW1iZXIsIHZhbHVlOiBWZWN0b3I8VD4pOiB2b2lkIHtcbiAgICAgICAgbGV0IHNpemUgPSB0aGlzLnNpemU7XG4gICAgICAgIGZvciAobGV0IGlkeCA9IC0xLCBvZmZzZXQgPSBpbmRleCAqIHNpemU7ICsraWR4IDwgc2l6ZTspIHtcbiAgICAgICAgICAgIHZhbHVlcy5zZXQob2Zmc2V0ICsgaWR4LCB2YWx1ZS5nZXQoKytpZHgpKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEJpbmFyeVZpZXcgZXh0ZW5kcyBWYXJpYWJsZUxpc3RWaWV3QmFzZTxCaW5hcnk+IHtcbiAgICBwcm90ZWN0ZWQgZ2V0TGlzdCh2YWx1ZXM6IFVpbnQ4QXJyYXksIGluZGV4OiBudW1iZXIsIHZhbHVlT2Zmc2V0czogSW50MzJBcnJheSkge1xuICAgICAgICByZXR1cm4gdmFsdWVzLnN1YmFycmF5KHZhbHVlT2Zmc2V0c1tpbmRleF0sIHZhbHVlT2Zmc2V0c1tpbmRleCArIDFdKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHNldExpc3QodmFsdWVzOiBVaW50OEFycmF5LCBpbmRleDogbnVtYmVyLCB2YWx1ZTogVWludDhBcnJheSwgdmFsdWVPZmZzZXRzOiBJbnQzMkFycmF5KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IG9mZnNldCA9IHZhbHVlT2Zmc2V0c1tpbmRleF07XG4gICAgICAgIHZhbHVlcy5zZXQodmFsdWUuc3ViYXJyYXkoMCwgdmFsdWVPZmZzZXRzW2luZGV4ICsgMV0gLSBvZmZzZXQpLCBvZmZzZXQpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFV0ZjhWaWV3IGV4dGVuZHMgVmFyaWFibGVMaXN0Vmlld0Jhc2U8VXRmOD4ge1xuICAgIHByb3RlY3RlZCBnZXRMaXN0KHZhbHVlczogVWludDhBcnJheSwgaW5kZXg6IG51bWJlciwgdmFsdWVPZmZzZXRzOiBJbnQzMkFycmF5KSB7XG4gICAgICAgIHJldHVybiBkZWNvZGVVdGY4KHZhbHVlcy5zdWJhcnJheSh2YWx1ZU9mZnNldHNbaW5kZXhdLCB2YWx1ZU9mZnNldHNbaW5kZXggKyAxXSkpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgc2V0TGlzdCh2YWx1ZXM6IFVpbnQ4QXJyYXksIGluZGV4OiBudW1iZXIsIHZhbHVlOiBzdHJpbmcsIHZhbHVlT2Zmc2V0czogSW50MzJBcnJheSk6IHZvaWQge1xuICAgICAgICBjb25zdCBvZmZzZXQgPSB2YWx1ZU9mZnNldHNbaW5kZXhdO1xuICAgICAgICB2YWx1ZXMuc2V0KGVuY29kZVV0ZjgodmFsdWUpLnN1YmFycmF5KDAsIHZhbHVlT2Zmc2V0c1tpbmRleCArIDFdIC0gb2Zmc2V0KSwgb2Zmc2V0KTtcbiAgICB9XG59XG4iXX0=

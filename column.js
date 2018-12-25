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
const chunked_1 = require("./vector/chunked");
class Column extends chunked_1.Chunked {
    constructor(field, vectors = [], offsets) {
        super(field.type, chunked_1.Chunked.flatten(...vectors), offsets);
        this._field = field;
    }
    get field() { return this._field; }
    get name() { return this._field.name; }
    clone(chunks = this._chunks) {
        return new Column(this._field, chunks);
    }
    getChildAt(index) {
        if (index < 0 || index >= this.numChildren) {
            return null;
        }
        let columns = this._children || (this._children = []);
        let column, field, chunks;
        if (column = columns[index]) {
            return column;
        }
        if (field = (this.type.children || [])[index]) {
            chunks = this._chunks
                .map((vector) => vector.getChildAt(index))
                .filter((vec) => vec != null);
            if (chunks.length > 0) {
                return (columns[index] = new Column(field, chunks));
            }
        }
        return null;
    }
}
exports.Column = Column;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbHVtbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsNkRBQTZEO0FBQzdELCtEQUErRDtBQUMvRCx3REFBd0Q7QUFDeEQsNkRBQTZEO0FBQzdELG9EQUFvRDtBQUNwRCw2REFBNkQ7QUFDN0QsNkRBQTZEO0FBQzdELEVBQUU7QUFDRiwrQ0FBK0M7QUFDL0MsRUFBRTtBQUNGLDZEQUE2RDtBQUM3RCw4REFBOEQ7QUFDOUQseURBQXlEO0FBQ3pELDREQUE0RDtBQUM1RCwwREFBMEQ7QUFDMUQscUJBQXFCOztBQUtyQiw4Q0FBMkM7QUFVM0MsTUFBYSxNQUNULFNBQVEsaUJBQVU7SUFLbEIsWUFBWSxLQUFlLEVBQUUsVUFBdUIsRUFBRSxFQUFFLE9BQXFCO1FBQ3pFLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGlCQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsT0FBTyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDeEQsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7SUFDeEIsQ0FBQztJQUtELElBQVcsS0FBSyxLQUFLLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDMUMsSUFBVyxJQUFJLEtBQUssT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFFdkMsS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTztRQUM5QixPQUFPLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDM0MsQ0FBQztJQUVNLFVBQVUsQ0FBMkIsS0FBYTtRQUVyRCxJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUU7WUFBRSxPQUFPLElBQUksQ0FBQztTQUFFO1FBRTVELElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ3RELElBQUksTUFBaUIsRUFBRSxLQUFlLEVBQUUsTUFBbUIsQ0FBQztRQUU1RCxJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFBRSxPQUFPLE1BQU0sQ0FBQztTQUFFO1FBQy9DLElBQUksS0FBSyxHQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFjLEVBQUU7WUFDekQsTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPO2lCQUNoQixHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUksS0FBSyxDQUFDLENBQUM7aUJBQzVDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBb0IsRUFBRSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQztZQUNwRCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUNuQixPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksTUFBTSxDQUFJLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO2FBQzFEO1NBQ0o7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0NBQ0o7QUF4Q0Qsd0JBd0NDIiwiZmlsZSI6ImNvbHVtbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBGaWVsZCB9IGZyb20gJy4vc2NoZW1hJztcbmltcG9ydCB7IFZlY3RvciB9IGZyb20gJy4vdmVjdG9yJztcbmltcG9ydCB7IERhdGFUeXBlIH0gZnJvbSAnLi90eXBlJztcbmltcG9ydCB7IENodW5rZWQgfSBmcm9tICcuL3ZlY3Rvci9jaHVua2VkJztcbmltcG9ydCB7IENsb25hYmxlLCBTbGljZWFibGUsIEFwcGxpY2F0aXZlIH0gZnJvbSAnLi92ZWN0b3InO1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbHVtbjxUIGV4dGVuZHMgRGF0YVR5cGUgPSBhbnk+IHtcbiAgICB0eXBlSWQ6IFRbJ1RUeXBlJ107XG4gICAgY29uY2F0KC4uLm90aGVyczogVmVjdG9yPFQ+W10pOiBDb2x1bW48VD47XG4gICAgc2xpY2UoYmVnaW4/OiBudW1iZXIsIGVuZD86IG51bWJlcik6IENvbHVtbjxUPjtcbiAgICBjbG9uZShjaHVua3M/OiBWZWN0b3I8VD5bXSwgb2Zmc2V0cz86IFVpbnQzMkFycmF5KTogQ29sdW1uPFQ+O1xufVxuXG5leHBvcnQgY2xhc3MgQ29sdW1uPFQgZXh0ZW5kcyBEYXRhVHlwZSA9IGFueT5cbiAgICBleHRlbmRzIENodW5rZWQ8VD5cbiAgICBpbXBsZW1lbnRzIENsb25hYmxlPENvbHVtbjxUPj4sXG4gICAgICAgICAgICAgICBTbGljZWFibGU8Q29sdW1uPFQ+PixcbiAgICAgICAgICAgICAgIEFwcGxpY2F0aXZlPFQsIENvbHVtbjxUPj4ge1xuXG4gICAgY29uc3RydWN0b3IoZmllbGQ6IEZpZWxkPFQ+LCB2ZWN0b3JzOiBWZWN0b3I8VD5bXSA9IFtdLCBvZmZzZXRzPzogVWludDMyQXJyYXkpIHtcbiAgICAgICAgc3VwZXIoZmllbGQudHlwZSwgQ2h1bmtlZC5mbGF0dGVuKC4uLnZlY3RvcnMpLCBvZmZzZXRzKTtcbiAgICAgICAgdGhpcy5fZmllbGQgPSBmaWVsZDtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX2ZpZWxkOiBGaWVsZDxUPjtcbiAgICBwcm90ZWN0ZWQgX2NoaWxkcmVuPzogQ29sdW1uW107XG5cbiAgICBwdWJsaWMgZ2V0IGZpZWxkKCkgeyByZXR1cm4gdGhpcy5fZmllbGQ7IH1cbiAgICBwdWJsaWMgZ2V0IG5hbWUoKSB7IHJldHVybiB0aGlzLl9maWVsZC5uYW1lOyB9XG5cbiAgICBwdWJsaWMgY2xvbmUoY2h1bmtzID0gdGhpcy5fY2h1bmtzKSB7XG4gICAgICAgIHJldHVybiBuZXcgQ29sdW1uKHRoaXMuX2ZpZWxkLCBjaHVua3MpO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRDaGlsZEF0PFIgZXh0ZW5kcyBEYXRhVHlwZSA9IGFueT4oaW5kZXg6IG51bWJlcik6IENvbHVtbjxSPiB8IG51bGwge1xuXG4gICAgICAgIGlmIChpbmRleCA8IDAgfHwgaW5kZXggPj0gdGhpcy5udW1DaGlsZHJlbikgeyByZXR1cm4gbnVsbDsgfVxuXG4gICAgICAgIGxldCBjb2x1bW5zID0gdGhpcy5fY2hpbGRyZW4gfHwgKHRoaXMuX2NoaWxkcmVuID0gW10pO1xuICAgICAgICBsZXQgY29sdW1uOiBDb2x1bW48Uj4sIGZpZWxkOiBGaWVsZDxSPiwgY2h1bmtzOiBWZWN0b3I8Uj5bXTtcblxuICAgICAgICBpZiAoY29sdW1uID0gY29sdW1uc1tpbmRleF0pIHsgcmV0dXJuIGNvbHVtbjsgfVxuICAgICAgICBpZiAoZmllbGQgPSAoKHRoaXMudHlwZS5jaGlsZHJlbiB8fCBbXSlbaW5kZXhdIGFzIEZpZWxkPFI+KSkge1xuICAgICAgICAgICAgY2h1bmtzID0gdGhpcy5fY2h1bmtzXG4gICAgICAgICAgICAgICAgLm1hcCgodmVjdG9yKSA9PiB2ZWN0b3IuZ2V0Q2hpbGRBdDxSPihpbmRleCkpXG4gICAgICAgICAgICAgICAgLmZpbHRlcigodmVjKTogdmVjIGlzIFZlY3RvcjxSPiA9PiB2ZWMgIT0gbnVsbCk7XG4gICAgICAgICAgICBpZiAoY2h1bmtzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGNvbHVtbnNbaW5kZXhdID0gbmV3IENvbHVtbjxSPihmaWVsZCwgY2h1bmtzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG59XG4iXX0=

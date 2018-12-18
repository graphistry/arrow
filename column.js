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
class Column extends chunked_1.ChunkedVector {
    constructor(field, vectors = [], offsets) {
        super(field.type, chunked_1.ChunkedVector.flatten(...vectors), offsets);
        this._field = field;
    }
    get field() { return this._field; }
    get name() { return this.field.name; }
    slice(begin, end) {
        return new Column(this.field, super.slice(begin, end).chunks);
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
            chunks = this.chunks
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbHVtbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsNkRBQTZEO0FBQzdELCtEQUErRDtBQUMvRCx3REFBd0Q7QUFDeEQsNkRBQTZEO0FBQzdELG9EQUFvRDtBQUNwRCw2REFBNkQ7QUFDN0QsNkRBQTZEO0FBQzdELEVBQUU7QUFDRiwrQ0FBK0M7QUFDL0MsRUFBRTtBQUNGLDZEQUE2RDtBQUM3RCw4REFBOEQ7QUFDOUQseURBQXlEO0FBQ3pELDREQUE0RDtBQUM1RCwwREFBMEQ7QUFDMUQscUJBQXFCOztBQUtyQiw4Q0FBaUQ7QUFFakQsTUFBYSxNQUFpQyxTQUFRLHVCQUFnQjtJQUVsRSxZQUFZLEtBQWUsRUFBRSxVQUF1QixFQUFFLEVBQUUsT0FBcUI7UUFDekUsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsdUJBQWEsQ0FBQyxPQUFPLENBQUMsR0FBRyxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM5RCxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztJQUN4QixDQUFDO0lBS0QsSUFBVyxLQUFLLEtBQUssT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUMxQyxJQUFXLElBQUksS0FBSyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUV0QyxLQUFLLENBQUMsS0FBYyxFQUFFLEdBQVk7UUFDckMsT0FBTyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFTSxVQUFVLENBQTJCLEtBQWE7UUFFckQsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLEtBQUssSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFO1lBQUUsT0FBTyxJQUFJLENBQUM7U0FBRTtRQUU1RCxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUN0RCxJQUFJLE1BQWlCLEVBQUUsS0FBZSxFQUFFLE1BQW1CLENBQUM7UUFFNUQsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQUUsT0FBTyxNQUFNLENBQUM7U0FBRTtRQUMvQyxJQUFJLEtBQUssR0FBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBYyxFQUFFO1lBQ3pELE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTTtpQkFDZixHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUksS0FBSyxDQUFDLENBQUM7aUJBQzVDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBb0IsRUFBRSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQztZQUNwRCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUNuQixPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksTUFBTSxDQUFJLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO2FBQzFEO1NBQ0o7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0NBQ0o7QUFwQ0Qsd0JBb0NDIiwiZmlsZSI6ImNvbHVtbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBGaWVsZCB9IGZyb20gJy4vc2NoZW1hJztcbmltcG9ydCB7IFZlY3RvciB9IGZyb20gJy4vdmVjdG9yJztcbmltcG9ydCB7IERhdGFUeXBlIH0gZnJvbSAnLi90eXBlJztcbmltcG9ydCB7IENodW5rZWRWZWN0b3IgfSBmcm9tICcuL3ZlY3Rvci9jaHVua2VkJztcblxuZXhwb3J0IGNsYXNzIENvbHVtbjxUIGV4dGVuZHMgRGF0YVR5cGUgPSBhbnk+IGV4dGVuZHMgQ2h1bmtlZFZlY3RvcjxUPiB7XG5cbiAgICBjb25zdHJ1Y3RvcihmaWVsZDogRmllbGQ8VD4sIHZlY3RvcnM6IFZlY3RvcjxUPltdID0gW10sIG9mZnNldHM/OiBVaW50MzJBcnJheSkge1xuICAgICAgICBzdXBlcihmaWVsZC50eXBlLCBDaHVua2VkVmVjdG9yLmZsYXR0ZW4oLi4udmVjdG9ycyksIG9mZnNldHMpO1xuICAgICAgICB0aGlzLl9maWVsZCA9IGZpZWxkO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfY2hpbGRyZW4/OiBDb2x1bW5bXTtcbiAgICBwcm90ZWN0ZWQgX2ZpZWxkOiBGaWVsZDxUPjtcblxuICAgIHB1YmxpYyBnZXQgZmllbGQoKSB7IHJldHVybiB0aGlzLl9maWVsZDsgfVxuICAgIHB1YmxpYyBnZXQgbmFtZSgpIHsgcmV0dXJuIHRoaXMuZmllbGQubmFtZTsgfVxuXG4gICAgcHVibGljIHNsaWNlKGJlZ2luPzogbnVtYmVyLCBlbmQ/OiBudW1iZXIpOiBDb2x1bW48VD4ge1xuICAgICAgICByZXR1cm4gbmV3IENvbHVtbih0aGlzLmZpZWxkLCBzdXBlci5zbGljZShiZWdpbiwgZW5kKS5jaHVua3MpO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRDaGlsZEF0PFIgZXh0ZW5kcyBEYXRhVHlwZSA9IGFueT4oaW5kZXg6IG51bWJlcik6IENvbHVtbjxSPiB8IG51bGwge1xuXG4gICAgICAgIGlmIChpbmRleCA8IDAgfHwgaW5kZXggPj0gdGhpcy5udW1DaGlsZHJlbikgeyByZXR1cm4gbnVsbDsgfVxuXG4gICAgICAgIGxldCBjb2x1bW5zID0gdGhpcy5fY2hpbGRyZW4gfHwgKHRoaXMuX2NoaWxkcmVuID0gW10pO1xuICAgICAgICBsZXQgY29sdW1uOiBDb2x1bW48Uj4sIGZpZWxkOiBGaWVsZDxSPiwgY2h1bmtzOiBWZWN0b3I8Uj5bXTtcblxuICAgICAgICBpZiAoY29sdW1uID0gY29sdW1uc1tpbmRleF0pIHsgcmV0dXJuIGNvbHVtbjsgfVxuICAgICAgICBpZiAoZmllbGQgPSAoKHRoaXMudHlwZS5jaGlsZHJlbiB8fCBbXSlbaW5kZXhdIGFzIEZpZWxkPFI+KSkge1xuICAgICAgICAgICAgY2h1bmtzID0gdGhpcy5jaHVua3NcbiAgICAgICAgICAgICAgICAubWFwKCh2ZWN0b3IpID0+IHZlY3Rvci5nZXRDaGlsZEF0PFI+KGluZGV4KSlcbiAgICAgICAgICAgICAgICAuZmlsdGVyKCh2ZWMpOiB2ZWMgaXMgVmVjdG9yPFI+ID0+IHZlYyAhPSBudWxsKTtcbiAgICAgICAgICAgIGlmIChjaHVua3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoY29sdW1uc1tpbmRleF0gPSBuZXcgQ29sdW1uPFI+KGZpZWxkLCBjaHVua3MpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbn1cbiJdfQ==

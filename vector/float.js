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
class FloatVector extends base_1.BaseVector {
    /** @nocollapse */
    static from(data) {
        switch (data.constructor) {
            case Uint16Array: return vector_1.Vector.new(data_1.Data.Float(new type_1.Float16(), 0, data.length, 0, null, data));
            case Float32Array: return vector_1.Vector.new(data_1.Data.Float(new type_1.Float32(), 0, data.length, 0, null, data));
            case Float64Array: return vector_1.Vector.new(data_1.Data.Float(new type_1.Float64(), 0, data.length, 0, null, data));
        }
        throw new TypeError('Unrecognized Float data');
    }
}
exports.FloatVector = FloatVector;
class Float16Vector extends FloatVector {
}
exports.Float16Vector = Float16Vector;
class Float32Vector extends FloatVector {
}
exports.Float32Vector = Float32Vector;
class Float64Vector extends FloatVector {
}
exports.Float64Vector = Float64Vector;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInZlY3Rvci9mbG9hdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsNkRBQTZEO0FBQzdELCtEQUErRDtBQUMvRCx3REFBd0Q7QUFDeEQsNkRBQTZEO0FBQzdELG9EQUFvRDtBQUNwRCw2REFBNkQ7QUFDN0QsNkRBQTZEO0FBQzdELEVBQUU7QUFDRiwrQ0FBK0M7QUFDL0MsRUFBRTtBQUNGLDZEQUE2RDtBQUM3RCw4REFBOEQ7QUFDOUQseURBQXlEO0FBQ3pELDREQUE0RDtBQUM1RCwwREFBMEQ7QUFDMUQscUJBQXFCOztBQUVyQixrQ0FBK0I7QUFDL0Isc0NBQW1DO0FBQ25DLGlDQUFvQztBQUNwQyxrQ0FBMkQ7QUFFM0QsTUFBYSxXQUFxQyxTQUFRLGlCQUFhO0lBQ25FLGtCQUFrQjtJQUNYLE1BQU0sQ0FBQyxJQUFJLENBQWtCLElBQWlCO1FBQ2pELFFBQVEsSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUN0QixLQUFLLFdBQVcsQ0FBQyxDQUFDLE9BQU8sZUFBTSxDQUFDLEdBQUcsQ0FBQyxXQUFJLENBQUMsS0FBSyxDQUFDLElBQUksY0FBTyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQzlGLEtBQUssWUFBWSxDQUFDLENBQUMsT0FBTyxlQUFNLENBQUMsR0FBRyxDQUFDLFdBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxjQUFPLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDL0YsS0FBSyxZQUFZLENBQUMsQ0FBQyxPQUFPLGVBQU0sQ0FBQyxHQUFHLENBQUMsV0FBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLGNBQU8sRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztTQUNsRztRQUNELE1BQU0sSUFBSSxTQUFTLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUNuRCxDQUFDO0NBQ0o7QUFWRCxrQ0FVQztBQUVELE1BQWEsYUFBYyxTQUFRLFdBQW9CO0NBQUc7QUFBMUQsc0NBQTBEO0FBQzFELE1BQWEsYUFBYyxTQUFRLFdBQW9CO0NBQUc7QUFBMUQsc0NBQTBEO0FBQzFELE1BQWEsYUFBYyxTQUFRLFdBQW9CO0NBQUc7QUFBMUQsc0NBQTBEIiwiZmlsZSI6InZlY3Rvci9mbG9hdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBEYXRhIH0gZnJvbSAnLi4vZGF0YSc7XG5pbXBvcnQgeyBWZWN0b3IgfSBmcm9tICcuLi92ZWN0b3InO1xuaW1wb3J0IHsgQmFzZVZlY3RvciB9IGZyb20gJy4vYmFzZSc7XG5pbXBvcnQgeyBGbG9hdCwgRmxvYXQxNiwgRmxvYXQzMiwgRmxvYXQ2NCB9IGZyb20gJy4uL3R5cGUnO1xuXG5leHBvcnQgY2xhc3MgRmxvYXRWZWN0b3I8VCBleHRlbmRzIEZsb2F0ID0gRmxvYXQ+IGV4dGVuZHMgQmFzZVZlY3RvcjxUPiB7XG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyBGbG9hdD4oZGF0YTogVFsnVEFycmF5J10pIHtcbiAgICAgICAgc3dpdGNoIChkYXRhLmNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICBjYXNlIFVpbnQxNkFycmF5OiByZXR1cm4gVmVjdG9yLm5ldyhEYXRhLkZsb2F0KG5ldyBGbG9hdDE2KCksIDAsIGRhdGEubGVuZ3RoLCAwLCBudWxsLCBkYXRhKSk7XG4gICAgICAgICAgICBjYXNlIEZsb2F0MzJBcnJheTogcmV0dXJuIFZlY3Rvci5uZXcoRGF0YS5GbG9hdChuZXcgRmxvYXQzMigpLCAwLCBkYXRhLmxlbmd0aCwgMCwgbnVsbCwgZGF0YSkpO1xuICAgICAgICAgICAgY2FzZSBGbG9hdDY0QXJyYXk6IHJldHVybiBWZWN0b3IubmV3KERhdGEuRmxvYXQobmV3IEZsb2F0NjQoKSwgMCwgZGF0YS5sZW5ndGgsIDAsIG51bGwsIGRhdGEpKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbnJlY29nbml6ZWQgRmxvYXQgZGF0YScpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEZsb2F0MTZWZWN0b3IgZXh0ZW5kcyBGbG9hdFZlY3RvcjxGbG9hdDE2PiB7fVxuZXhwb3J0IGNsYXNzIEZsb2F0MzJWZWN0b3IgZXh0ZW5kcyBGbG9hdFZlY3RvcjxGbG9hdDMyPiB7fVxuZXhwb3J0IGNsYXNzIEZsb2F0NjRWZWN0b3IgZXh0ZW5kcyBGbG9hdFZlY3RvcjxGbG9hdDY0PiB7fVxuIl19

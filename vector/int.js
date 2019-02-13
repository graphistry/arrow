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
class IntVector extends base_1.BaseVector {
    /** @nocollapse */
    static from(data, is64) {
        if (is64 === true) {
            return data instanceof Int32Array
                ? vector_1.Vector.new(data_1.Data.Int(new type_1.Int64(), 0, data.length * 0.5, 0, null, data))
                : vector_1.Vector.new(data_1.Data.Int(new type_1.Uint64(), 0, data.length * 0.5, 0, null, data));
        }
        switch (data.constructor) {
            case Int8Array: return vector_1.Vector.new(data_1.Data.Int(new type_1.Int8(), 0, data.length, 0, null, data));
            case Int16Array: return vector_1.Vector.new(data_1.Data.Int(new type_1.Int16(), 0, data.length, 0, null, data));
            case Int32Array: return vector_1.Vector.new(data_1.Data.Int(new type_1.Int32(), 0, data.length, 0, null, data));
            case Uint8Array: return vector_1.Vector.new(data_1.Data.Int(new type_1.Uint8(), 0, data.length, 0, null, data));
            case Uint16Array: return vector_1.Vector.new(data_1.Data.Int(new type_1.Uint16(), 0, data.length, 0, null, data));
            case Uint32Array: return vector_1.Vector.new(data_1.Data.Int(new type_1.Uint32(), 0, data.length, 0, null, data));
        }
        throw new TypeError('Unrecognized Int data');
    }
}
exports.IntVector = IntVector;
class Int8Vector extends IntVector {
}
exports.Int8Vector = Int8Vector;
class Int16Vector extends IntVector {
}
exports.Int16Vector = Int16Vector;
class Int32Vector extends IntVector {
}
exports.Int32Vector = Int32Vector;
class Int64Vector extends IntVector {
}
exports.Int64Vector = Int64Vector;
class Uint8Vector extends IntVector {
}
exports.Uint8Vector = Uint8Vector;
class Uint16Vector extends IntVector {
}
exports.Uint16Vector = Uint16Vector;
class Uint32Vector extends IntVector {
}
exports.Uint32Vector = Uint32Vector;
class Uint64Vector extends IntVector {
}
exports.Uint64Vector = Uint64Vector;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUF1QixDQUFDLENBQUM7SUFDakQsQ0FBQztDQUNKO0FBckJELDhCQXFCQztBQUVELE1BQWEsVUFBVyxTQUFRLFNBQWU7Q0FBRztBQUFsRCxnQ0FBa0Q7QUFDbEQsTUFBYSxXQUFZLFNBQVEsU0FBZ0I7Q0FBRztBQUFwRCxrQ0FBb0Q7QUFDcEQsTUFBYSxXQUFZLFNBQVEsU0FBZ0I7Q0FBRztBQUFwRCxrQ0FBb0Q7QUFDcEQsTUFBYSxXQUFZLFNBQVEsU0FBZ0I7Q0FBRztBQUFwRCxrQ0FBb0Q7QUFDcEQsTUFBYSxXQUFZLFNBQVEsU0FBZ0I7Q0FBRztBQUFwRCxrQ0FBb0Q7QUFDcEQsTUFBYSxZQUFhLFNBQVEsU0FBaUI7Q0FBRztBQUF0RCxvQ0FBc0Q7QUFDdEQsTUFBYSxZQUFhLFNBQVEsU0FBaUI7Q0FBRztBQUF0RCxvQ0FBc0Q7QUFDdEQsTUFBYSxZQUFhLFNBQVEsU0FBaUI7Q0FBRztBQUF0RCxvQ0FBc0QiLCJmaWxlIjoidmVjdG9yL2ludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBEYXRhIH0gZnJvbSAnLi4vZGF0YSc7XG5pbXBvcnQgeyBWZWN0b3IgfSBmcm9tICcuLi92ZWN0b3InO1xuaW1wb3J0IHsgQmFzZVZlY3RvciB9IGZyb20gJy4vYmFzZSc7XG5pbXBvcnQgeyBWZWN0b3IgYXMgViB9IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgSW50LCBVaW50OCwgVWludDE2LCBVaW50MzIsIFVpbnQ2NCwgSW50OCwgSW50MTYsIEludDMyLCBJbnQ2NCB9IGZyb20gJy4uL3R5cGUnO1xuXG5leHBvcnQgY2xhc3MgSW50VmVjdG9yPFQgZXh0ZW5kcyBJbnQgPSBJbnQ+IGV4dGVuZHMgQmFzZVZlY3RvcjxUPiB7XG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyBJbnQ+KGRhdGE6IFRbJ1RBcnJheSddKTogVjxUPjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIEludDY0PihkYXRhOiBUWydUQXJyYXknXSwgaXM2NDogdHJ1ZSk6IFY8VD47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyBVaW50NjQ+KGRhdGE6IFRbJ1RBcnJheSddLCBpczY0OiB0cnVlKTogVjxUPjtcbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGZyb20oZGF0YTogYW55LCBpczY0PzogYm9vbGVhbikge1xuICAgICAgICBpZiAoaXM2NCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGEgaW5zdGFuY2VvZiBJbnQzMkFycmF5XG4gICAgICAgICAgICAgICAgPyBWZWN0b3IubmV3KERhdGEuSW50KG5ldyBJbnQ2NCgpLCAwLCBkYXRhLmxlbmd0aCAqIDAuNSwgMCwgbnVsbCwgZGF0YSkpXG4gICAgICAgICAgICAgICAgOiBWZWN0b3IubmV3KERhdGEuSW50KG5ldyBVaW50NjQoKSwgMCwgZGF0YS5sZW5ndGggKiAwLjUsIDAsIG51bGwsIGRhdGEpKTtcbiAgICAgICAgfVxuICAgICAgICBzd2l0Y2ggKGRhdGEuY29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgIGNhc2UgSW50OEFycmF5OiByZXR1cm4gVmVjdG9yLm5ldyhEYXRhLkludChuZXcgSW50OCgpLCAwLCBkYXRhLmxlbmd0aCwgMCwgbnVsbCwgZGF0YSkpO1xuICAgICAgICAgICAgY2FzZSBJbnQxNkFycmF5OiByZXR1cm4gVmVjdG9yLm5ldyhEYXRhLkludChuZXcgSW50MTYoKSwgMCwgZGF0YS5sZW5ndGgsIDAsIG51bGwsIGRhdGEpKTtcbiAgICAgICAgICAgIGNhc2UgSW50MzJBcnJheTogcmV0dXJuIFZlY3Rvci5uZXcoRGF0YS5JbnQobmV3IEludDMyKCksIDAsIGRhdGEubGVuZ3RoLCAwLCBudWxsLCBkYXRhKSk7XG4gICAgICAgICAgICBjYXNlIFVpbnQ4QXJyYXk6IHJldHVybiBWZWN0b3IubmV3KERhdGEuSW50KG5ldyBVaW50OCgpLCAwLCBkYXRhLmxlbmd0aCwgMCwgbnVsbCwgZGF0YSkpO1xuICAgICAgICAgICAgY2FzZSBVaW50MTZBcnJheTogcmV0dXJuIFZlY3Rvci5uZXcoRGF0YS5JbnQobmV3IFVpbnQxNigpLCAwLCBkYXRhLmxlbmd0aCwgMCwgbnVsbCwgZGF0YSkpO1xuICAgICAgICAgICAgY2FzZSBVaW50MzJBcnJheTogcmV0dXJuIFZlY3Rvci5uZXcoRGF0YS5JbnQobmV3IFVpbnQzMigpLCAwLCBkYXRhLmxlbmd0aCwgMCwgbnVsbCwgZGF0YSkpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1VucmVjb2duaXplZCBJbnQgZGF0YScpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEludDhWZWN0b3IgZXh0ZW5kcyBJbnRWZWN0b3I8SW50OD4ge31cbmV4cG9ydCBjbGFzcyBJbnQxNlZlY3RvciBleHRlbmRzIEludFZlY3RvcjxJbnQxNj4ge31cbmV4cG9ydCBjbGFzcyBJbnQzMlZlY3RvciBleHRlbmRzIEludFZlY3RvcjxJbnQzMj4ge31cbmV4cG9ydCBjbGFzcyBJbnQ2NFZlY3RvciBleHRlbmRzIEludFZlY3RvcjxJbnQ2ND4ge31cbmV4cG9ydCBjbGFzcyBVaW50OFZlY3RvciBleHRlbmRzIEludFZlY3RvcjxVaW50OD4ge31cbmV4cG9ydCBjbGFzcyBVaW50MTZWZWN0b3IgZXh0ZW5kcyBJbnRWZWN0b3I8VWludDE2PiB7fVxuZXhwb3J0IGNsYXNzIFVpbnQzMlZlY3RvciBleHRlbmRzIEludFZlY3RvcjxVaW50MzI+IHt9XG5leHBvcnQgY2xhc3MgVWludDY0VmVjdG9yIGV4dGVuZHMgSW50VmVjdG9yPFVpbnQ2ND4ge31cbiJdfQ==

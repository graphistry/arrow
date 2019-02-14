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
const buffer_1 = require("../util/buffer");
class FloatVector extends base_1.BaseVector {
    /** @nocollapse */
    static from(data) {
        let type = null;
        switch (this) {
            case Float16Vector:
                data = buffer_1.toFloat16Array(data);
                break;
            case Float32Vector:
                data = buffer_1.toFloat32Array(data);
                break;
            case Float64Vector:
                data = buffer_1.toFloat64Array(data);
                break;
        }
        switch (data.constructor) {
            case Uint16Array:
                type = new type_1.Float16();
                break;
            case Float32Array:
                type = new type_1.Float32();
                break;
            case Float64Array:
                type = new type_1.Float64();
                break;
        }
        return type !== null
            ? vector_1.Vector.new(data_1.Data.Float(type, 0, data.length, 0, null, data))
            : (() => { throw new TypeError('Unrecognized FloatVector input'); })();
    }
}
exports.FloatVector = FloatVector;
class Float16Vector extends FloatVector {
    // Since JS doesn't have half floats, `toArray()` returns a zero-copy slice
    // of the underlying Uint16Array data. This behavior ensures we don't incur
    // extra compute or copies if you're calling `toArray()` in order to create
    // a buffer for something like WebGL. Buf if you're using JS and want typed
    // arrays of 4-to-8-byte precision, these methods will enumerate the values
    // and clamp to the desired byte lengths.
    toFloat32Array() { return new Float32Array(this); }
    toFloat64Array() { return new Float64Array(this); }
}
exports.Float16Vector = Float16Vector;
class Float32Vector extends FloatVector {
}
exports.Float32Vector = Float32Vector;
class Float64Vector extends FloatVector {
}
exports.Float64Vector = Float64Vector;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInZlY3Rvci9mbG9hdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsNkRBQTZEO0FBQzdELCtEQUErRDtBQUMvRCx3REFBd0Q7QUFDeEQsNkRBQTZEO0FBQzdELG9EQUFvRDtBQUNwRCw2REFBNkQ7QUFDN0QsNkRBQTZEO0FBQzdELEVBQUU7QUFDRiwrQ0FBK0M7QUFDL0MsRUFBRTtBQUNGLDZEQUE2RDtBQUM3RCw4REFBOEQ7QUFDOUQseURBQXlEO0FBQ3pELDREQUE0RDtBQUM1RCwwREFBMEQ7QUFDMUQscUJBQXFCOztBQUVyQixrQ0FBK0I7QUFDL0Isc0NBQW1DO0FBQ25DLGlDQUFvQztBQUVwQyxrQ0FBMkQ7QUFDM0QsMkNBQWdGO0FBRWhGLE1BQWEsV0FBcUMsU0FBUSxpQkFBYTtJQVVuRSxrQkFBa0I7SUFDWCxNQUFNLENBQUMsSUFBSSxDQUFrQixJQUFpQjtRQUNqRCxJQUFJLElBQUksR0FBaUIsSUFBSSxDQUFDO1FBQzlCLFFBQVEsSUFBSSxFQUFFO1lBQ1YsS0FBSyxhQUFhO2dCQUFFLElBQUksR0FBRyx1QkFBYyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUFDLE1BQU07WUFDdkQsS0FBSyxhQUFhO2dCQUFFLElBQUksR0FBRyx1QkFBYyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUFDLE1BQU07WUFDdkQsS0FBSyxhQUFhO2dCQUFFLElBQUksR0FBRyx1QkFBYyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUFDLE1BQU07U0FDMUQ7UUFDRCxRQUFRLElBQUksQ0FBQyxXQUFXLEVBQUU7WUFDdEIsS0FBSyxXQUFXO2dCQUFHLElBQUksR0FBRyxJQUFJLGNBQU8sRUFBRSxDQUFDO2dCQUFDLE1BQU07WUFDL0MsS0FBSyxZQUFZO2dCQUFFLElBQUksR0FBRyxJQUFJLGNBQU8sRUFBRSxDQUFDO2dCQUFDLE1BQU07WUFDL0MsS0FBSyxZQUFZO2dCQUFFLElBQUksR0FBRyxJQUFJLGNBQU8sRUFBRSxDQUFDO2dCQUFDLE1BQU07U0FDbEQ7UUFDRCxPQUFPLElBQUksS0FBSyxJQUFJO1lBQ2hCLENBQUMsQ0FBQyxlQUFNLENBQUMsR0FBRyxDQUFDLFdBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDN0QsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsTUFBTSxJQUFJLFNBQVMsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUMvRSxDQUFDO0NBQ0o7QUEzQkQsa0NBMkJDO0FBRUQsTUFBYSxhQUFjLFNBQVEsV0FBb0I7SUFDbkQsMkVBQTJFO0lBQzNFLDJFQUEyRTtJQUMzRSwyRUFBMkU7SUFDM0UsMkVBQTJFO0lBQzNFLDJFQUEyRTtJQUMzRSx5Q0FBeUM7SUFDbEMsY0FBYyxLQUFLLE9BQU8sSUFBSSxZQUFZLENBQUMsSUFBd0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2RSxjQUFjLEtBQUssT0FBTyxJQUFJLFlBQVksQ0FBQyxJQUF3QixDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQ2pGO0FBVEQsc0NBU0M7QUFFRCxNQUFhLGFBQWMsU0FBUSxXQUFvQjtDQUFHO0FBQTFELHNDQUEwRDtBQUMxRCxNQUFhLGFBQWMsU0FBUSxXQUFvQjtDQUFHO0FBQTFELHNDQUEwRCIsImZpbGUiOiJ2ZWN0b3IvZmxvYXQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgRGF0YSB9IGZyb20gJy4uL2RhdGEnO1xuaW1wb3J0IHsgVmVjdG9yIH0gZnJvbSAnLi4vdmVjdG9yJztcbmltcG9ydCB7IEJhc2VWZWN0b3IgfSBmcm9tICcuL2Jhc2UnO1xuaW1wb3J0IHsgVmVjdG9yIGFzIFYgfSBmcm9tICcuLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEZsb2F0LCBGbG9hdDE2LCBGbG9hdDMyLCBGbG9hdDY0IH0gZnJvbSAnLi4vdHlwZSc7XG5pbXBvcnQgeyB0b0Zsb2F0MTZBcnJheSwgdG9GbG9hdDMyQXJyYXksIHRvRmxvYXQ2NEFycmF5IH0gZnJvbSAnLi4vdXRpbC9idWZmZXInO1xuXG5leHBvcnQgY2xhc3MgRmxvYXRWZWN0b3I8VCBleHRlbmRzIEZsb2F0ID0gRmxvYXQ+IGV4dGVuZHMgQmFzZVZlY3RvcjxUPiB7XG5cbiAgICBwdWJsaWMgc3RhdGljIGZyb20odGhpczogdHlwZW9mIEZsb2F0VmVjdG9yLCBkYXRhOiBGbG9hdDE2WydUQXJyYXknXSk6IEZsb2F0MTZWZWN0b3I7XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKHRoaXM6IHR5cGVvZiBGbG9hdFZlY3RvciwgZGF0YTogRmxvYXQzMlsnVEFycmF5J10pOiBGbG9hdDMyVmVjdG9yO1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbSh0aGlzOiB0eXBlb2YgRmxvYXRWZWN0b3IsIGRhdGE6IEZsb2F0NjRbJ1RBcnJheSddKTogRmxvYXQ2NFZlY3RvcjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIEZsb2F0Pih0aGlzOiB0eXBlb2YgRmxvYXRWZWN0b3IsIGRhdGE6IFRbJ1RBcnJheSddKTogVjxUPjtcblxuICAgIHB1YmxpYyBzdGF0aWMgZnJvbSh0aGlzOiB0eXBlb2YgRmxvYXQxNlZlY3RvciwgZGF0YTogRmxvYXQxNlsnVEFycmF5J10gfCBJdGVyYWJsZTxudW1iZXI+KTogRmxvYXQxNlZlY3RvcjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb20odGhpczogdHlwZW9mIEZsb2F0MzJWZWN0b3IsIGRhdGE6IEZsb2F0MzJbJ1RBcnJheSddIHwgSXRlcmFibGU8bnVtYmVyPik6IEZsb2F0MzJWZWN0b3I7XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKHRoaXM6IHR5cGVvZiBGbG9hdDY0VmVjdG9yLCBkYXRhOiBGbG9hdDY0WydUQXJyYXknXSB8IEl0ZXJhYmxlPG51bWJlcj4pOiBGbG9hdDY0VmVjdG9yO1xuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgRmxvYXQ+KGRhdGE6IFRbJ1RBcnJheSddKSB7XG4gICAgICAgIGxldCB0eXBlOiBGbG9hdCB8IG51bGwgPSBudWxsO1xuICAgICAgICBzd2l0Y2ggKHRoaXMpIHtcbiAgICAgICAgICAgIGNhc2UgRmxvYXQxNlZlY3RvcjogZGF0YSA9IHRvRmxvYXQxNkFycmF5KGRhdGEpOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgRmxvYXQzMlZlY3RvcjogZGF0YSA9IHRvRmxvYXQzMkFycmF5KGRhdGEpOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgRmxvYXQ2NFZlY3RvcjogZGF0YSA9IHRvRmxvYXQ2NEFycmF5KGRhdGEpOyBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBzd2l0Y2ggKGRhdGEuY29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgIGNhc2UgVWludDE2QXJyYXk6ICB0eXBlID0gbmV3IEZsb2F0MTYoKTsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEZsb2F0MzJBcnJheTogdHlwZSA9IG5ldyBGbG9hdDMyKCk7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBGbG9hdDY0QXJyYXk6IHR5cGUgPSBuZXcgRmxvYXQ2NCgpOyBicmVhaztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHlwZSAhPT0gbnVsbFxuICAgICAgICAgICAgPyBWZWN0b3IubmV3KERhdGEuRmxvYXQodHlwZSwgMCwgZGF0YS5sZW5ndGgsIDAsIG51bGwsIGRhdGEpKVxuICAgICAgICAgICAgOiAoKCkgPT4geyB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbnJlY29nbml6ZWQgRmxvYXRWZWN0b3IgaW5wdXQnKTsgfSkoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBGbG9hdDE2VmVjdG9yIGV4dGVuZHMgRmxvYXRWZWN0b3I8RmxvYXQxNj4ge1xuICAgIC8vIFNpbmNlIEpTIGRvZXNuJ3QgaGF2ZSBoYWxmIGZsb2F0cywgYHRvQXJyYXkoKWAgcmV0dXJucyBhIHplcm8tY29weSBzbGljZVxuICAgIC8vIG9mIHRoZSB1bmRlcmx5aW5nIFVpbnQxNkFycmF5IGRhdGEuIFRoaXMgYmVoYXZpb3IgZW5zdXJlcyB3ZSBkb24ndCBpbmN1clxuICAgIC8vIGV4dHJhIGNvbXB1dGUgb3IgY29waWVzIGlmIHlvdSdyZSBjYWxsaW5nIGB0b0FycmF5KClgIGluIG9yZGVyIHRvIGNyZWF0ZVxuICAgIC8vIGEgYnVmZmVyIGZvciBzb21ldGhpbmcgbGlrZSBXZWJHTC4gQnVmIGlmIHlvdSdyZSB1c2luZyBKUyBhbmQgd2FudCB0eXBlZFxuICAgIC8vIGFycmF5cyBvZiA0LXRvLTgtYnl0ZSBwcmVjaXNpb24sIHRoZXNlIG1ldGhvZHMgd2lsbCBlbnVtZXJhdGUgdGhlIHZhbHVlc1xuICAgIC8vIGFuZCBjbGFtcCB0byB0aGUgZGVzaXJlZCBieXRlIGxlbmd0aHMuXG4gICAgcHVibGljIHRvRmxvYXQzMkFycmF5KCkgeyByZXR1cm4gbmV3IEZsb2F0MzJBcnJheSh0aGlzIGFzIEl0ZXJhYmxlPG51bWJlcj4pOyB9XG4gICAgcHVibGljIHRvRmxvYXQ2NEFycmF5KCkgeyByZXR1cm4gbmV3IEZsb2F0NjRBcnJheSh0aGlzIGFzIEl0ZXJhYmxlPG51bWJlcj4pOyB9XG59XG5cbmV4cG9ydCBjbGFzcyBGbG9hdDMyVmVjdG9yIGV4dGVuZHMgRmxvYXRWZWN0b3I8RmxvYXQzMj4ge31cbmV4cG9ydCBjbGFzcyBGbG9hdDY0VmVjdG9yIGV4dGVuZHMgRmxvYXRWZWN0b3I8RmxvYXQ2ND4ge31cbiJdfQ==

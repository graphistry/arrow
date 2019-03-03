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
import { Data } from '../data';
import { Vector } from '../vector';
import { BaseVector } from './base';
import { Float16, Float32, Float64 } from '../type';
import { toFloat16Array, toFloat32Array, toFloat64Array } from '../util/buffer';
export class FloatVector extends BaseVector {
    /** @nocollapse */
    static from(data) {
        let type = null;
        switch (this) {
            case Float16Vector:
                data = toFloat16Array(data);
                break;
            case Float32Vector:
                data = toFloat32Array(data);
                break;
            case Float64Vector:
                data = toFloat64Array(data);
                break;
        }
        switch (data.constructor) {
            case Uint16Array:
                type = new Float16();
                break;
            case Float32Array:
                type = new Float32();
                break;
            case Float64Array:
                type = new Float64();
                break;
        }
        return type !== null
            ? Vector.new(Data.Float(type, 0, data.length, 0, null, data))
            : (() => { throw new TypeError('Unrecognized FloatVector input'); })();
    }
}
export class Float16Vector extends FloatVector {
    // Since JS doesn't have half floats, `toArray()` returns a zero-copy slice
    // of the underlying Uint16Array data. This behavior ensures we don't incur
    // extra compute or copies if you're calling `toArray()` in order to create
    // a buffer for something like WebGL. Buf if you're using JS and want typed
    // arrays of 4-to-8-byte precision, these methods will enumerate the values
    // and clamp to the desired byte lengths.
    toFloat32Array() { return new Float32Array(this); }
    toFloat64Array() { return new Float64Array(this); }
}
export class Float32Vector extends FloatVector {
}
export class Float64Vector extends FloatVector {
}

//# sourceMappingURL=float.mjs.map

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
import { Uint8, Uint16, Uint32, Uint64, Int8, Int16, Int32, Int64 } from '../type';
import { toInt8Array, toInt16Array, toInt32Array, toUint8Array, toUint16Array, toUint32Array, toBigInt64Array, toBigUint64Array } from '../util/buffer';
export class IntVector extends BaseVector {
    /** @nocollapse */
    static from(data, is64) {
        let length = 0;
        let type = null;
        switch (this) {
            case Int8Vector:
                data = toInt8Array(data);
                is64 = false;
                break;
            case Int16Vector:
                data = toInt16Array(data);
                is64 = false;
                break;
            case Int32Vector:
                data = toInt32Array(data);
                is64 = false;
                break;
            case Int64Vector:
                data = toInt32Array(data);
                is64 = true;
                break;
            case Uint8Vector:
                data = toUint8Array(data);
                is64 = false;
                break;
            case Uint16Vector:
                data = toUint16Array(data);
                is64 = false;
                break;
            case Uint32Vector:
                data = toUint32Array(data);
                is64 = false;
                break;
            case Uint64Vector:
                data = toUint32Array(data);
                is64 = true;
                break;
        }
        if (is64 === true) {
            length = data.length * 0.5;
            type = data instanceof Int32Array ? new Int64() : new Uint64();
        }
        else {
            length = data.length;
            switch (data.constructor) {
                case Int8Array:
                    type = new Int8();
                    break;
                case Int16Array:
                    type = new Int16();
                    break;
                case Int32Array:
                    type = new Int32();
                    break;
                case Uint8Array:
                    type = new Uint8();
                    break;
                case Uint16Array:
                    type = new Uint16();
                    break;
                case Uint32Array:
                    type = new Uint32();
                    break;
            }
        }
        return type !== null
            ? Vector.new(Data.Int(type, 0, length, 0, null, data))
            : (() => { throw new TypeError('Unrecognized IntVector input'); })();
    }
}
export class Int8Vector extends IntVector {
}
export class Int16Vector extends IntVector {
}
export class Int32Vector extends IntVector {
}
export class Int64Vector extends IntVector {
    toBigInt64Array() {
        return toBigInt64Array(this.values);
    }
}
export class Uint8Vector extends IntVector {
}
export class Uint16Vector extends IntVector {
}
export class Uint32Vector extends IntVector {
}
export class Uint64Vector extends IntVector {
    toBigUint64Array() {
        return toBigUint64Array(this.values);
    }
}

//# sourceMappingURL=int.mjs.map

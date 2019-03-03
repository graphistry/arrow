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
class IntVector extends base_1.BaseVector {
    /** @nocollapse */
    static from(data, is64) {
        let length = 0;
        let type = null;
        switch (this) {
            case Int8Vector:
                data = buffer_1.toInt8Array(data);
                is64 = false;
                break;
            case Int16Vector:
                data = buffer_1.toInt16Array(data);
                is64 = false;
                break;
            case Int32Vector:
                data = buffer_1.toInt32Array(data);
                is64 = false;
                break;
            case Int64Vector:
                data = buffer_1.toInt32Array(data);
                is64 = true;
                break;
            case Uint8Vector:
                data = buffer_1.toUint8Array(data);
                is64 = false;
                break;
            case Uint16Vector:
                data = buffer_1.toUint16Array(data);
                is64 = false;
                break;
            case Uint32Vector:
                data = buffer_1.toUint32Array(data);
                is64 = false;
                break;
            case Uint64Vector:
                data = buffer_1.toUint32Array(data);
                is64 = true;
                break;
        }
        if (is64 === true) {
            length = data.length * 0.5;
            type = data instanceof Int32Array ? new type_1.Int64() : new type_1.Uint64();
        }
        else {
            length = data.length;
            switch (data.constructor) {
                case Int8Array:
                    type = new type_1.Int8();
                    break;
                case Int16Array:
                    type = new type_1.Int16();
                    break;
                case Int32Array:
                    type = new type_1.Int32();
                    break;
                case Uint8Array:
                    type = new type_1.Uint8();
                    break;
                case Uint16Array:
                    type = new type_1.Uint16();
                    break;
                case Uint32Array:
                    type = new type_1.Uint32();
                    break;
            }
        }
        return type !== null
            ? vector_1.Vector.new(data_1.Data.Int(type, 0, length, 0, null, data))
            : (() => { throw new TypeError('Unrecognized IntVector input'); })();
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
    toBigInt64Array() {
        return buffer_1.toBigInt64Array(this.values);
    }
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
    toBigUint64Array() {
        return buffer_1.toBigUint64Array(this.values);
    }
}
exports.Uint64Vector = Uint64Vector;

//# sourceMappingURL=int.js.map

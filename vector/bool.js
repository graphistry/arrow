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
const type_1 = require("../type");
const vector_1 = require("../vector");
const base_1 = require("./base");
const bit_1 = require("../util/bit");
class BoolVector extends base_1.BaseVector {
    /** @nocollapse */
    static from(data) {
        let length = 0, bitmap = bit_1.packBools(function* () {
            for (let x of data) {
                length++;
                yield x;
            }
        }());
        return vector_1.Vector.new(data_1.Data.Bool(new type_1.Bool(), 0, length, 0, null, bitmap));
    }
}
exports.BoolVector = BoolVector;

//# sourceMappingURL=bool.js.map

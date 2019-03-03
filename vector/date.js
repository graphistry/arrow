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
const enum_1 = require("../enum");
const base_1 = require("./base");
const IntUtil = require("../util/int");
const type_1 = require("../type");
class DateVector extends base_1.BaseVector {
    /** @nocollapse */
    static from(data, unit = enum_1.DateUnit.MILLISECOND) {
        switch (unit) {
            case enum_1.DateUnit.DAY: {
                const values = Int32Array.from(data.map((d) => d.valueOf() / 86400000));
                return vector_1.Vector.new(data_1.Data.Date(new type_1.DateDay(), 0, data.length, 0, null, values));
            }
            case enum_1.DateUnit.MILLISECOND: {
                const values = IntUtil.Int64.convertArray(data.map((d) => d.valueOf()));
                return vector_1.Vector.new(data_1.Data.Date(new type_1.DateMillisecond(), 0, data.length, 0, null, values));
            }
        }
        throw new TypeError(`Unrecognized date unit "${enum_1.DateUnit[unit]}"`);
    }
}
exports.DateVector = DateVector;
class DateDayVector extends DateVector {
}
exports.DateDayVector = DateDayVector;
class DateMillisecondVector extends DateVector {
}
exports.DateMillisecondVector = DateMillisecondVector;

//# sourceMappingURL=date.js.map

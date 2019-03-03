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
import { Bool } from '../type';
import { Vector } from '../vector';
import { BaseVector } from './base';
import { packBools } from '../util/bit';
export class BoolVector extends BaseVector {
    /** @nocollapse */
    static from(data) {
        let length = 0, bitmap = packBools(function* () {
            for (let x of data) {
                length++;
                yield x;
            }
        }());
        return Vector.new(Data.Bool(new Bool(), 0, length, 0, null, bitmap));
    }
}

//# sourceMappingURL=bool.mjs.map

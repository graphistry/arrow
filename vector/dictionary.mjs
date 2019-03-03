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
import { Dictionary } from '../type';
export class DictionaryVector extends BaseVector {
    constructor(data) {
        super(data);
        this.indices = Vector.new(data.clone(this.type.indices));
    }
    /** @nocollapse */
    static from(values, indices, keys) {
        const type = new Dictionary(values.type, indices, null, null, values);
        return Vector.new(Data.Dictionary(type, 0, keys.length, 0, null, keys));
    }
    get dictionary() { return this.data.type.dictionaryVector; }
    reverseLookup(value) { return this.dictionary.indexOf(value); }
    getKey(idx) { return this.indices.get(idx); }
    getValue(key) { return this.dictionary.get(key); }
    setKey(idx, key) { return this.indices.set(idx, key); }
    setValue(key, value) { return this.dictionary.set(key, value); }
}
DictionaryVector.prototype.indices = null;

//# sourceMappingURL=dictionary.mjs.map

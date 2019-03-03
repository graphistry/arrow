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
const vector_1 = require("../vector");
const chunked_1 = require("./chunked");
const vector_2 = require("../util/vector");
class BaseVector extends vector_1.AbstractVector {
    constructor(data, children) {
        super();
        this._children = children;
        this.numChildren = data.childData.length;
        this._bindDataAccessors(this.data = data);
    }
    get type() { return this.data.type; }
    get typeId() { return this.data.typeId; }
    get length() { return this.data.length; }
    get offset() { return this.data.offset; }
    get stride() { return this.data.stride; }
    get nullCount() { return this.data.nullCount; }
    get VectorName() { return this.constructor.name; }
    get ArrayType() { return this.data.ArrayType; }
    get values() { return this.data.values; }
    get typeIds() { return this.data.typeIds; }
    get nullBitmap() { return this.data.nullBitmap; }
    get valueOffsets() { return this.data.valueOffsets; }
    get [Symbol.toStringTag]() { return `${this.VectorName}<${this.type[Symbol.toStringTag]}>`; }
    clone(data, children = this._children) {
        return vector_1.Vector.new(data, children);
    }
    concat(...others) {
        return chunked_1.Chunked.concat(this, ...others);
    }
    slice(begin, end) {
        // Adjust args similar to Array.prototype.slice. Normalize begin/end to
        // clamp between 0 and length, and wrap around on negative indices, e.g.
        // slice(-1, 5) or slice(5, -1)
        return vector_2.clampRange(this, begin, end, this._sliceInternal);
    }
    isValid(index) {
        if (this.nullCount > 0) {
            const idx = this.offset + index;
            const val = this.nullBitmap[idx >> 3];
            const mask = (val & (1 << (idx % 8)));
            return mask !== 0;
        }
        return true;
    }
    getChildAt(index) {
        return index < 0 || index >= this.numChildren ? null : ((this._children || (this._children = []))[index] ||
            (this._children[index] = vector_1.Vector.new(this.data.childData[index])));
    }
    // @ts-ignore
    toJSON() { return [...this]; }
    _sliceInternal(self, begin, end) {
        return self.clone(self.data.slice(begin, end - begin));
    }
    // @ts-ignore
    _bindDataAccessors(data) {
        // Implementation in src/vectors/index.ts due to circular dependency/packaging shenanigans
    }
}
exports.BaseVector = BaseVector;
BaseVector.prototype[Symbol.isConcatSpreadable] = true;

//# sourceMappingURL=base.js.map

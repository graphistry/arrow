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
import { Vector } from '../vector';
import { Row, kLength } from '../vector/row';
import { compareArrayLike } from '../util/buffer';
import { BigInt, BigIntAvailable } from './compat';
/** @ignore */
export function clampIndex(source, index, then) {
    const length = source.length;
    const adjust = index > -1 ? index : (length + (index % length));
    return then ? then(source, adjust) : adjust;
}
/** @ignore */
let tmp;
/** @ignore */
export function clampRange(source, begin, end, then) {
    // Adjust args similar to Array.prototype.slice. Normalize begin/end to
    // clamp between 0 and length, and wrap around on negative indices, e.g.
    // slice(-1, 5) or slice(5, -1)
    let { length: len = 0 } = source;
    let lhs = typeof begin !== 'number' ? 0 : begin;
    let rhs = typeof end !== 'number' ? len : end;
    // wrap around on negative start/end positions
    (lhs < 0) && (lhs = ((lhs % len) + len) % len);
    (rhs < 0) && (rhs = ((rhs % len) + len) % len);
    // ensure lhs <= rhs
    (rhs < lhs) && (tmp = lhs, lhs = rhs, rhs = tmp);
    // ensure rhs <= length
    (rhs > len) && (rhs = len);
    return then ? then(source, lhs, rhs) : [lhs, rhs];
}
const big0 = BigIntAvailable ? BigInt(0) : 0;
/** @ignore */
export function createElementComparator(search) {
    let typeofSearch = typeof search;
    // Compare primitives
    if (typeofSearch !== 'object' || search === null) {
        return typeofSearch !== 'bigint'
            ? (value) => value === search
            : (value) => (big0 + value) === search;
    }
    // Compare Dates
    if (search instanceof Date) {
        const valueOfSearch = search.valueOf();
        return (value) => value instanceof Date ? (value.valueOf() === valueOfSearch) : false;
    }
    if (ArrayBuffer.isView(search)) {
        return (value) => value ? compareArrayLike(search, value) : false;
    }
    // Compare Array-likes
    if (Array.isArray(search)) {
        return createArrayLikeComparator(search);
    }
    // Compare Rows
    if (search instanceof Row) {
        return createRowComparator(search);
    }
    // Compare Vectors
    if (search instanceof Vector) {
        return createVectorComparator(search);
    }
    // Compare non-empty Objects
    const keys = Object.keys(search);
    if (keys.length > 0) {
        return createObjectKeysComparator(search, keys);
    }
    // No valid comparator
    return () => false;
}
/** @ignore */
function createArrayLikeComparator(search) {
    const n = search.length;
    const fns = [];
    for (let i = -1; ++i < n;) {
        fns[i] = createElementComparator(search[i]);
    }
    return (value) => {
        if (!value) {
            return false;
        }
        // Handle the case where the search element is an Array, but the
        // values are Rows or Vectors, e.g. list.indexOf(['foo', 'bar'])
        if (value instanceof Row) {
            if (value[kLength] !== n) {
                return false;
            }
            for (let i = -1; ++i < n;) {
                if (!(fns[i](value.get(i)))) {
                    return false;
                }
            }
            return true;
        }
        if (value.length !== n) {
            return false;
        }
        if (value instanceof Vector) {
            for (let i = -1; ++i < n;) {
                if (!(fns[i](value.get(i)))) {
                    return false;
                }
            }
            return true;
        }
        for (let i = -1; ++i < n;) {
            if (!(fns[i](value[i]))) {
                return false;
            }
        }
        return true;
    };
}
/** @ignore */
function createRowComparator(search) {
    const n = search[kLength];
    const C = search.constructor;
    const fns = [];
    for (let i = -1; ++i < n;) {
        fns[i] = createElementComparator(search.get(i));
    }
    return (value) => {
        if (!(value instanceof C)) {
            return false;
        }
        if (!(value[kLength] === n)) {
            return false;
        }
        for (let i = -1; ++i < n;) {
            if (!(fns[i](value.get(i)))) {
                return false;
            }
        }
        return true;
    };
}
/** @ignore */
function createVectorComparator(search) {
    const n = search.length;
    const C = search.constructor;
    const fns = [];
    for (let i = -1; ++i < n;) {
        fns[i] = createElementComparator(search.get(i));
    }
    return (value) => {
        if (!(value instanceof C)) {
            return false;
        }
        if (!(value.length === n)) {
            return false;
        }
        for (let i = -1; ++i < n;) {
            if (!(fns[i](value.get(i)))) {
                return false;
            }
        }
        return true;
    };
}
/** @ignore */
function createObjectKeysComparator(search, keys) {
    const n = keys.length;
    const fns = [];
    for (let i = -1; ++i < n;) {
        fns[i] = createElementComparator(search[keys[i]]);
    }
    return (value) => {
        if (!value || typeof value !== 'object') {
            return false;
        }
        for (let i = -1; ++i < n;) {
            if (!(fns[i](value[keys[i]]))) {
                return false;
            }
        }
        return true;
    };
}

//# sourceMappingURL=vector.mjs.map

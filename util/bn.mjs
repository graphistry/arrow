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
import { toArrayBufferView } from './buffer';
import { BigIntAvailable, BigInt64Array, BigUint64Array } from './compat';
/** @ignore */
const BigNumNMixin = {
    toJSON() { return `"${bignumToString(this)}"`; },
    valueOf() { return bignumToNumber(this); },
    toString() { return bignumToString(this); },
    [Symbol.toPrimitive](hint) {
        switch (hint) {
            case 'number': return bignumToNumber(this);
            case 'string': return bignumToString(this);
            case 'default': return bignumToBigInt(this);
        }
        return bignumToString(this);
    }
};
/** @ignore */
const SignedBigNumNMixin = Object.assign({}, BigNumNMixin, { signed: true, BigIntArray: BigInt64Array });
/** @ignore */
const UnsignedBigNumNMixin = Object.assign({}, BigNumNMixin, { signed: false, BigIntArray: BigUint64Array });
/** @ignore */
export class BN {
    constructor(input, signed = input instanceof Int32Array) {
        return BN.new(input, signed);
    }
    /** @nocollapse */
    static new(input, signed = (input instanceof Int8Array || input instanceof Int16Array || input instanceof Int32Array)) {
        return (signed === true) ? BN.signed(input) : BN.unsigned(input);
    }
    /** @nocollapse */
    static signed(input) {
        const Ctor = ArrayBuffer.isView(input) ? input.constructor : Int32Array;
        const { buffer, byteOffset, length } = toArrayBufferView(Ctor, input);
        const bn = new Ctor(buffer, byteOffset, length);
        return Object.assign(bn, SignedBigNumNMixin);
    }
    /** @nocollapse */
    static unsigned(input) {
        const Ctor = ArrayBuffer.isView(input) ? input.constructor : Uint32Array;
        const { buffer, byteOffset, length } = toArrayBufferView(Ctor, input);
        const bn = new Ctor(buffer, byteOffset, length);
        return Object.assign(bn, UnsignedBigNumNMixin);
    }
}
/** @ignore */
function bignumToNumber({ buffer, byteOffset, length, signed }) {
    let words = new Int32Array(buffer, byteOffset, length);
    let number = 0, i = 0, n = words.length, hi, lo;
    while (i < n) {
        lo = words[i++];
        hi = words[i++];
        number += signed ? (lo >>> 0) + (hi * (i ** 32))
            : (lo >>> 0) + ((hi >>> 0) * (i ** 32));
    }
    return number;
}
/** @ignore */
export let bignumToString;
/** @ignore */
export let bignumToBigInt;
if (!BigIntAvailable) {
    bignumToString = decimalToString;
    bignumToBigInt = bignumToString;
}
else {
    bignumToBigInt = ((a) => a.byteLength === 8 ? new a.BigIntArray(a.buffer, a.byteOffset, 1)[0] : decimalToString(a));
    bignumToString = ((a) => a.byteLength === 8 ? `${new a.BigIntArray(a.buffer, a.byteOffset, 1)[0]}` : decimalToString(a));
}
function decimalToString(a) {
    let digits = '';
    let base64 = new Uint32Array(2);
    let base32 = new Uint16Array(a.buffer, a.byteOffset, a.byteLength / 2);
    let checks = new Uint32Array((base32 = new Uint16Array(base32).reverse()).buffer);
    let i = -1, n = base32.length - 1;
    do {
        for (base64[0] = base32[i = 0]; i < n;) {
            base32[i++] = base64[1] = base64[0] / 10;
            base64[0] = ((base64[0] - base64[1] * 10) << 16) + base32[i];
        }
        base32[i] = base64[1] = base64[0] / 10;
        base64[0] = base64[0] - base64[1] * 10;
        digits = `${base64[0]}${digits}`;
    } while (checks[0] || checks[1] || checks[2] || checks[3]);
    return digits ? digits : `0`;
}

//# sourceMappingURL=bn.mjs.map
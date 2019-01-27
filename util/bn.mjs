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
const BigNumNMixin = {
    toJSON() { return `"${bignumToString(this)}"`; },
    valueOf() { return bignumToNumber(this); },
    toString() { return bignumToString(this); },
    [Symbol.toPrimitive](hint) {
        if (hint === 'number') {
            return bignumToNumber(this);
        }
        /** @suppress {missingRequire} */
        return hint === 'string' || typeof BigInt !== 'function' ?
            bignumToString(this) : BigInt(bignumToString(this));
    }
};
/** @ignore */
const SignedBigNumNMixin = Object.assign({}, BigNumNMixin, { signed: true, constructor: undefined });
/** @ignore */
const UnsignedBigNumNMixin = Object.assign({}, BigNumNMixin, { signed: false, constructor: undefined });
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
function bignumToNumber({ buffer, byteOffset, length }) {
    let int64 = 0;
    let words = new Uint32Array(buffer, byteOffset, length);
    for (let i = 0, n = words.length; i < n;) {
        int64 += words[i++] + (words[i++] * (i ** 32));
        // int64 += (words[i++] >>> 0) + (words[i++] * (i ** 32));
    }
    return int64;
}
/** @ignore */
function bignumToString({ buffer, byteOffset, length }) {
    let string = '', i = -1;
    let base64 = new Uint32Array(2);
    let base32 = new Uint16Array(buffer, byteOffset, length * 2);
    let checks = new Uint32Array((base32 = new Uint16Array(base32).reverse()).buffer);
    let n = base32.length - 1;
    do {
        for (base64[0] = base32[i = 0]; i < n;) {
            base32[i++] = base64[1] = base64[0] / 10;
            base64[0] = ((base64[0] - base64[1] * 10) << 16) + base32[i];
        }
        base32[i] = base64[1] = base64[0] / 10;
        base64[0] = base64[0] - base64[1] * 10;
        string = `${base64[0]}${string}`;
    } while (checks[0] || checks[1] || checks[2] || checks[3]);
    return string ? string : `0`;
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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dkMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sRUFBRSxDQUFDO0tBQ3BDLFFBQVEsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFO0lBRTNELE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNqQyxDQUFDIiwiZmlsZSI6InV0aWwvYm4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgdG9BcnJheUJ1ZmZlclZpZXcsIEFycmF5QnVmZmVyVmlld0lucHV0IH0gZnJvbSAnLi9idWZmZXInO1xuXG50eXBlIEJpZ051bUFycmF5ID0gSW50QXJyYXkgfCBVaW50QXJyYXk7XG50eXBlIEludEFycmF5ID0gSW50OEFycmF5IHwgSW50MTZBcnJheSB8IEludDMyQXJyYXk7XG50eXBlIFVpbnRBcnJheSA9IFVpbnQ4QXJyYXkgfCBVaW50MTZBcnJheSB8IFVpbnQzMkFycmF5IHwgVWludDhDbGFtcGVkQXJyYXk7XG5cbmNvbnN0IEJpZ051bU5NaXhpbiA9IHtcbiAgICB0b0pTT04odGhpczogQk48QmlnTnVtQXJyYXk+LCApIHsgcmV0dXJuIGBcIiR7YmlnbnVtVG9TdHJpbmcodGhpcyl9XCJgOyB9LFxuICAgIHZhbHVlT2YodGhpczogQk48QmlnTnVtQXJyYXk+LCApIHsgcmV0dXJuIGJpZ251bVRvTnVtYmVyKHRoaXMpOyB9LFxuICAgIHRvU3RyaW5nKHRoaXM6IEJOPEJpZ051bUFycmF5PiwgKSB7IHJldHVybiBiaWdudW1Ub1N0cmluZyh0aGlzKTsgfSxcbiAgICBbU3ltYm9sLnRvUHJpbWl0aXZlXTxUIGV4dGVuZHMgQk48QmlnTnVtQXJyYXk+Pih0aGlzOiBULCBoaW50OiAnc3RyaW5nJyB8ICdudW1iZXInIHwgJ2RlZmF1bHQnKSB7XG4gICAgICAgIGlmIChoaW50ID09PSAnbnVtYmVyJykgeyByZXR1cm4gYmlnbnVtVG9OdW1iZXIodGhpcyk7IH1cbiAgICAgICAgLyoqIEBzdXBwcmVzcyB7bWlzc2luZ1JlcXVpcmV9ICovXG4gICAgICAgIHJldHVybiBoaW50ID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgQmlnSW50ICE9PSAnZnVuY3Rpb24nID9cbiAgICAgICAgICAgIGJpZ251bVRvU3RyaW5nKHRoaXMpIDogQmlnSW50KGJpZ251bVRvU3RyaW5nKHRoaXMpKTtcbiAgICB9XG59O1xuXG4vKiogQGlnbm9yZSAqL1xuY29uc3QgU2lnbmVkQmlnTnVtTk1peGluOiBhbnkgPSBPYmplY3QuYXNzaWduKHt9LCBCaWdOdW1OTWl4aW4sIHsgc2lnbmVkOiB0cnVlLCBjb25zdHJ1Y3RvcjogdW5kZWZpbmVkIH0pO1xuLyoqIEBpZ25vcmUgKi9cbmNvbnN0IFVuc2lnbmVkQmlnTnVtTk1peGluOiBhbnkgPSBPYmplY3QuYXNzaWduKHt9LCBCaWdOdW1OTWl4aW4sIHsgc2lnbmVkOiBmYWxzZSwgY29uc3RydWN0b3I6IHVuZGVmaW5lZCB9KTtcblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjbGFzcyBCTjxUIGV4dGVuZHMgQmlnTnVtQXJyYXk+IHtcbiAgICBwdWJsaWMgc3RhdGljIG5ldzxUIGV4dGVuZHMgQmlnTnVtQXJyYXk+KGlucHV0OiBBcnJheUJ1ZmZlclZpZXdJbnB1dCwgc2lnbmVkPzogYm9vbGVhbik6IFQ7XG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBuZXc8VCBleHRlbmRzIEJpZ051bUFycmF5PihpbnB1dDogQXJyYXlCdWZmZXJWaWV3SW5wdXQsIHNpZ25lZCA9IChpbnB1dCBpbnN0YW5jZW9mIEludDhBcnJheSB8fCBpbnB1dCBpbnN0YW5jZW9mIEludDE2QXJyYXkgfHwgaW5wdXQgaW5zdGFuY2VvZiBJbnQzMkFycmF5KSk6IFQge1xuICAgICAgICByZXR1cm4gKHNpZ25lZCA9PT0gdHJ1ZSkgPyBCTi5zaWduZWQoaW5wdXQpIGFzIFQgOiBCTi51bnNpZ25lZChpbnB1dCkgYXMgVDtcbiAgICB9XG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBzaWduZWQ8VCBleHRlbmRzIEludEFycmF5PihpbnB1dDogQXJyYXlCdWZmZXJWaWV3SW5wdXQpOiBUIHtcbiAgICAgICAgY29uc3QgQ3RvcjogYW55ID0gQXJyYXlCdWZmZXIuaXNWaWV3KGlucHV0KSA/IDxhbnk+IGlucHV0LmNvbnN0cnVjdG9yIDogSW50MzJBcnJheTtcbiAgICAgICAgY29uc3QgeyBidWZmZXIsIGJ5dGVPZmZzZXQsIGxlbmd0aCB9ID0gdG9BcnJheUJ1ZmZlclZpZXc8VD4oPGFueT4gQ3RvciwgaW5wdXQpIGFzIFQ7XG4gICAgICAgIGNvbnN0IGJuID0gbmV3IEN0b3IoYnVmZmVyLCBieXRlT2Zmc2V0LCBsZW5ndGgpO1xuICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihibiwgU2lnbmVkQmlnTnVtTk1peGluKTtcbiAgICB9XG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyB1bnNpZ25lZDxUIGV4dGVuZHMgVWludEFycmF5PihpbnB1dDogQXJyYXlCdWZmZXJWaWV3SW5wdXQpOiBUIHtcbiAgICAgICAgY29uc3QgQ3RvcjogYW55ID0gQXJyYXlCdWZmZXIuaXNWaWV3KGlucHV0KSA/IDxhbnk+IGlucHV0LmNvbnN0cnVjdG9yIDogVWludDMyQXJyYXk7XG4gICAgICAgIGNvbnN0IHsgYnVmZmVyLCBieXRlT2Zmc2V0LCBsZW5ndGggfSA9IHRvQXJyYXlCdWZmZXJWaWV3PFQ+KDxhbnk+IEN0b3IsIGlucHV0KSBhcyBUO1xuICAgICAgICBjb25zdCBibiA9IG5ldyBDdG9yKGJ1ZmZlciwgYnl0ZU9mZnNldCwgbGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oYm4sIFVuc2lnbmVkQmlnTnVtTk1peGluKTtcbiAgICB9XG4gICAgY29uc3RydWN0b3IoaW5wdXQ6IEFycmF5QnVmZmVyVmlld0lucHV0LCBzaWduZWQgPSBpbnB1dCBpbnN0YW5jZW9mIEludDMyQXJyYXkpIHtcbiAgICAgICAgcmV0dXJuIEJOLm5ldyhpbnB1dCwgc2lnbmVkKSBhcyBhbnk7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGludGVyZmFjZSBCTjxUIGV4dGVuZHMgQmlnTnVtQXJyYXk+IGV4dGVuZHMgVHlwZWRBcnJheUxpa2U8VD4ge1xuXG4gICAgbmV3PFQgZXh0ZW5kcyBBcnJheUJ1ZmZlclZpZXdJbnB1dD4oYnVmZmVyOiBULCBzaWduZWQ/OiBib29sZWFuKTogVDtcblxuICAgIHJlYWRvbmx5IHNpZ25lZDogYm9vbGVhbjtcblxuICAgIFtTeW1ib2wudG9TdHJpbmdUYWddOlxuICAgICAgICAnSW50OEFycmF5JyAgICAgICAgIHxcbiAgICAgICAgJ0ludDE2QXJyYXknICAgICAgICB8XG4gICAgICAgICdJbnQzMkFycmF5JyAgICAgICAgfFxuICAgICAgICAnVWludDhBcnJheScgICAgICAgIHxcbiAgICAgICAgJ1VpbnQxNkFycmF5JyAgICAgICB8XG4gICAgICAgICdVaW50MzJBcnJheScgICAgICAgfFxuICAgICAgICAnVWludDhDbGFtcGVkQXJyYXknO1xuXG4gICAgLyoqXG4gICAgICogQ29udmVydCB0aGUgYnl0ZXMgdG8gdGhlaXIgKHBvc2l0aXZlKSBkZWNpbWFsIHJlcHJlc2VudGF0aW9uIGZvciBwcmludGluZ1xuICAgICAqL1xuICAgIHRvU3RyaW5nKCk6IHN0cmluZztcbiAgICAvKipcbiAgICAgKiBEb3duLWNvbnZlcnQgdGhlIGJ5dGVzIHRvIGEgNTMtYml0IHByZWNpc2lvbiBpbnRlZ2VyLiBJbnZva2VkIGJ5IEpTIGZvclxuICAgICAqIGFyaXRobWF0aWMgb3BlcmF0b3JzLCBsaWtlIGArYC4gRWFzeSAoYW5kIHVuc2FmZSkgd2F5IHRvIGNvbnZlcnQgQk4gdG9cbiAgICAgKiBudW1iZXIgdmlhIGArYm5faW5zdGBcbiAgICAgKi9cbiAgICB2YWx1ZU9mKCk6IG51bWJlcjtcbiAgICAvKipcbiAgICAgKiBSZXR1cm4gdGhlIEpTT04gcmVwcmVzZW50YXRpb24gb2YgdGhlIGJ5dGVzLiBNdXN0IGJlIHdyYXBwZWQgaW4gZG91YmxlLXF1b3RlcyxcbiAgICAgKiBzbyBpdCdzIGNvbXBhdGlibGUgd2l0aCBKU09OLnN0cmluZ2lmeSgpLlxuICAgICAqL1xuICAgIHRvSlNPTigpOiBzdHJpbmc7XG4gICAgW1N5bWJvbC50b1ByaW1pdGl2ZV0oaGludDogYW55KTogbnVtYmVyIHwgc3RyaW5nIHwgYmlnaW50O1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gYmlnbnVtVG9OdW1iZXI8VCBleHRlbmRzIEJOPEJpZ051bUFycmF5Pj4oeyBidWZmZXIsIGJ5dGVPZmZzZXQsIGxlbmd0aCB9OiBUKSB7XG4gICAgbGV0IGludDY0ID0gMDtcbiAgICBsZXQgd29yZHMgPSBuZXcgVWludDMyQXJyYXkoYnVmZmVyLCBieXRlT2Zmc2V0LCBsZW5ndGgpO1xuICAgIGZvciAobGV0IGkgPSAwLCBuID0gd29yZHMubGVuZ3RoOyBpIDwgbjspIHtcbiAgICAgICAgaW50NjQgKz0gd29yZHNbaSsrXSArICh3b3Jkc1tpKytdICogKGkgKiogMzIpKTtcbiAgICAgICAgLy8gaW50NjQgKz0gKHdvcmRzW2krK10gPj4+IDApICsgKHdvcmRzW2krK10gKiAoaSAqKiAzMikpO1xuICAgIH1cbiAgICByZXR1cm4gaW50NjQ7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBiaWdudW1Ub1N0cmluZzxUIGV4dGVuZHMgQk48QmlnTnVtQXJyYXk+Pih7IGJ1ZmZlciwgYnl0ZU9mZnNldCwgbGVuZ3RoIH06IFQpIHtcblxuICAgIGxldCBzdHJpbmcgPSAnJywgaSA9IC0xO1xuICAgIGxldCBiYXNlNjQgPSBuZXcgVWludDMyQXJyYXkoMik7XG4gICAgbGV0IGJhc2UzMiA9IG5ldyBVaW50MTZBcnJheShidWZmZXIsIGJ5dGVPZmZzZXQsIGxlbmd0aCAqIDIpO1xuICAgIGxldCBjaGVja3MgPSBuZXcgVWludDMyQXJyYXkoKGJhc2UzMiA9IG5ldyBVaW50MTZBcnJheShiYXNlMzIpLnJldmVyc2UoKSkuYnVmZmVyKTtcbiAgICBsZXQgbiA9IGJhc2UzMi5sZW5ndGggLSAxO1xuXG4gICAgZG8ge1xuICAgICAgICBmb3IgKGJhc2U2NFswXSA9IGJhc2UzMltpID0gMF07IGkgPCBuOykge1xuICAgICAgICAgICAgYmFzZTMyW2krK10gPSBiYXNlNjRbMV0gPSBiYXNlNjRbMF0gLyAxMDtcbiAgICAgICAgICAgIGJhc2U2NFswXSA9ICgoYmFzZTY0WzBdIC0gYmFzZTY0WzFdICogMTApIDw8IDE2KSArIGJhc2UzMltpXTtcbiAgICAgICAgfVxuICAgICAgICBiYXNlMzJbaV0gPSBiYXNlNjRbMV0gPSBiYXNlNjRbMF0gLyAxMDtcbiAgICAgICAgYmFzZTY0WzBdID0gYmFzZTY0WzBdIC0gYmFzZTY0WzFdICogMTA7XG4gICAgICAgIHN0cmluZyA9IGAke2Jhc2U2NFswXX0ke3N0cmluZ31gO1xuICAgIH0gd2hpbGUgKGNoZWNrc1swXSB8fCBjaGVja3NbMV0gfHwgY2hlY2tzWzJdIHx8IGNoZWNrc1szXSk7XG5cbiAgICByZXR1cm4gc3RyaW5nID8gc3RyaW5nIDogYDBgO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuaW50ZXJmYWNlIFR5cGVkQXJyYXlMaWtlPFQgZXh0ZW5kcyBCaWdOdW1BcnJheT4ge1xuXG4gICAgcmVhZG9ubHkgbGVuZ3RoOiBudW1iZXI7XG4gICAgcmVhZG9ubHkgYnVmZmVyOiBBcnJheUJ1ZmZlcjtcbiAgICByZWFkb25seSBieXRlTGVuZ3RoOiBudW1iZXI7XG4gICAgcmVhZG9ubHkgYnl0ZU9mZnNldDogbnVtYmVyO1xuICAgIHJlYWRvbmx5IEJZVEVTX1BFUl9FTEVNRU5UOiBudW1iZXI7XG5cbiAgICBpbmNsdWRlcyhzZWFyY2hFbGVtZW50OiBudW1iZXIsIGZyb21JbmRleD86IG51bWJlciB8IHVuZGVmaW5lZCk6IGJvb2xlYW47XG4gICAgY29weVdpdGhpbih0YXJnZXQ6IG51bWJlciwgc3RhcnQ6IG51bWJlciwgZW5kPzogbnVtYmVyIHwgdW5kZWZpbmVkKTogdGhpcztcbiAgICBldmVyeShjYWxsYmFja2ZuOiAodmFsdWU6IG51bWJlciwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFQpID0+IGJvb2xlYW4sIHRoaXNBcmc/OiBhbnkpOiBib29sZWFuO1xuICAgIGZpbGwodmFsdWU6IG51bWJlciwgc3RhcnQ/OiBudW1iZXIgfCB1bmRlZmluZWQsIGVuZD86IG51bWJlciB8IHVuZGVmaW5lZCk6IHRoaXM7XG4gICAgZmlsdGVyKGNhbGxiYWNrZm46ICh2YWx1ZTogbnVtYmVyLCBpbmRleDogbnVtYmVyLCBhcnJheTogVCkgPT4gYm9vbGVhbiwgdGhpc0FyZz86IGFueSk6IFQ7XG4gICAgZmluZChwcmVkaWNhdGU6ICh2YWx1ZTogbnVtYmVyLCBpbmRleDogbnVtYmVyLCBvYmo6IFQpID0+IGJvb2xlYW4sIHRoaXNBcmc/OiBhbnkpOiBudW1iZXIgfCB1bmRlZmluZWQ7XG4gICAgZmluZEluZGV4KHByZWRpY2F0ZTogKHZhbHVlOiBudW1iZXIsIGluZGV4OiBudW1iZXIsIG9iajogVCkgPT4gYm9vbGVhbiwgdGhpc0FyZz86IGFueSk6IG51bWJlcjtcbiAgICBmb3JFYWNoKGNhbGxiYWNrZm46ICh2YWx1ZTogbnVtYmVyLCBpbmRleDogbnVtYmVyLCBhcnJheTogVCkgPT4gdm9pZCwgdGhpc0FyZz86IGFueSk6IHZvaWQ7XG4gICAgaW5kZXhPZihzZWFyY2hFbGVtZW50OiBudW1iZXIsIGZyb21JbmRleD86IG51bWJlciB8IHVuZGVmaW5lZCk6IG51bWJlcjtcbiAgICBqb2luKHNlcGFyYXRvcj86IHN0cmluZyB8IHVuZGVmaW5lZCk6IHN0cmluZztcbiAgICBsYXN0SW5kZXhPZihzZWFyY2hFbGVtZW50OiBudW1iZXIsIGZyb21JbmRleD86IG51bWJlciB8IHVuZGVmaW5lZCk6IG51bWJlcjtcbiAgICBtYXAoY2FsbGJhY2tmbjogKHZhbHVlOiBudW1iZXIsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUKSA9PiBudW1iZXIsIHRoaXNBcmc/OiBhbnkpOiBUO1xuICAgIHJlZHVjZShjYWxsYmFja2ZuOiAocHJldmlvdXNWYWx1ZTogbnVtYmVyLCBjdXJyZW50VmFsdWU6IG51bWJlciwgY3VycmVudEluZGV4OiBudW1iZXIsIGFycmF5OiBUKSA9PiBudW1iZXIpOiBudW1iZXI7XG4gICAgcmVkdWNlKGNhbGxiYWNrZm46IChwcmV2aW91c1ZhbHVlOiBudW1iZXIsIGN1cnJlbnRWYWx1ZTogbnVtYmVyLCBjdXJyZW50SW5kZXg6IG51bWJlciwgYXJyYXk6IFQpID0+IG51bWJlciwgaW5pdGlhbFZhbHVlOiBudW1iZXIpOiBudW1iZXI7XG4gICAgcmVkdWNlPFU+KGNhbGxiYWNrZm46IChwcmV2aW91c1ZhbHVlOiBVLCBjdXJyZW50VmFsdWU6IG51bWJlciwgY3VycmVudEluZGV4OiBudW1iZXIsIGFycmF5OiBUKSA9PiBVLCBpbml0aWFsVmFsdWU6IFUpOiBVO1xuICAgIHJlZHVjZVJpZ2h0KGNhbGxiYWNrZm46IChwcmV2aW91c1ZhbHVlOiBudW1iZXIsIGN1cnJlbnRWYWx1ZTogbnVtYmVyLCBjdXJyZW50SW5kZXg6IG51bWJlciwgYXJyYXk6IFQpID0+IG51bWJlcik6IG51bWJlcjtcbiAgICByZWR1Y2VSaWdodChjYWxsYmFja2ZuOiAocHJldmlvdXNWYWx1ZTogbnVtYmVyLCBjdXJyZW50VmFsdWU6IG51bWJlciwgY3VycmVudEluZGV4OiBudW1iZXIsIGFycmF5OiBUKSA9PiBudW1iZXIsIGluaXRpYWxWYWx1ZTogbnVtYmVyKTogbnVtYmVyO1xuICAgIHJlZHVjZVJpZ2h0PFU+KGNhbGxiYWNrZm46IChwcmV2aW91c1ZhbHVlOiBVLCBjdXJyZW50VmFsdWU6IG51bWJlciwgY3VycmVudEluZGV4OiBudW1iZXIsIGFycmF5OiBUKSA9PiBVLCBpbml0aWFsVmFsdWU6IFUpOiBVO1xuICAgIHJldmVyc2UoKTogVDtcbiAgICBzZXQoYXJyYXk6IEFycmF5TGlrZTxudW1iZXI+LCBvZmZzZXQ/OiBudW1iZXIgfCB1bmRlZmluZWQpOiB2b2lkO1xuICAgIHNsaWNlKHN0YXJ0PzogbnVtYmVyIHwgdW5kZWZpbmVkLCBlbmQ/OiBudW1iZXIgfCB1bmRlZmluZWQpOiBUO1xuICAgIHNvbWUoY2FsbGJhY2tmbjogKHZhbHVlOiBudW1iZXIsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUKSA9PiBib29sZWFuLCB0aGlzQXJnPzogYW55KTogYm9vbGVhbjtcbiAgICBzb3J0KGNvbXBhcmVGbj86ICgoYTogbnVtYmVyLCBiOiBudW1iZXIpID0+IG51bWJlcikgfCB1bmRlZmluZWQpOiB0aGlzO1xuICAgIHN1YmFycmF5KGJlZ2luOiBudW1iZXIsIGVuZD86IG51bWJlciB8IHVuZGVmaW5lZCk6IFQ7XG4gICAgdG9Mb2NhbGVTdHJpbmcoKTogc3RyaW5nO1xuICAgIGVudHJpZXMoKTogSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBudW1iZXJdPjtcbiAgICBrZXlzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8bnVtYmVyPjtcbiAgICB2YWx1ZXMoKTogSXRlcmFibGVJdGVyYXRvcjxudW1iZXI+O1xufVxuIl19

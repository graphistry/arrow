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
const carryBit16 = 1 << 16;
function intAsHex(value) {
    if (value < 0) {
        value = 0xFFFFFFFF + value + 1;
    }
    return `0x${value.toString(16)}`;
}
const kInt32DecimalDigits = 8;
const kPowersOfTen = [1,
    10,
    100,
    1000,
    10000,
    100000,
    1000000,
    10000000,
    100000000];
export class BaseInt64 {
    constructor(buffer) {
        this.buffer = buffer;
    }
    high() { return this.buffer[1]; }
    low() { return this.buffer[0]; }
    _times(other) {
        // Break the left and right numbers into 16 bit chunks
        // so that we can multiply them without overflow.
        const L = new Uint32Array([
            this.buffer[1] >>> 16,
            this.buffer[1] & 0xFFFF,
            this.buffer[0] >>> 16,
            this.buffer[0] & 0xFFFF
        ]);
        const R = new Uint32Array([
            other.buffer[1] >>> 16,
            other.buffer[1] & 0xFFFF,
            other.buffer[0] >>> 16,
            other.buffer[0] & 0xFFFF
        ]);
        let product = L[3] * R[3];
        this.buffer[0] = product & 0xFFFF;
        let sum = product >>> 16;
        product = L[2] * R[3];
        sum += product;
        product = (L[3] * R[2]) >>> 0;
        sum += product;
        this.buffer[0] += sum << 16;
        this.buffer[1] = (sum >>> 0 < product ? carryBit16 : 0);
        this.buffer[1] += sum >>> 16;
        this.buffer[1] += L[1] * R[3] + L[2] * R[2] + L[3] * R[1];
        this.buffer[1] += (L[0] * R[3] + L[1] * R[2] + L[2] * R[1] + L[3] * R[0]) << 16;
        return this;
    }
    _plus(other) {
        const sum = (this.buffer[0] + other.buffer[0]) >>> 0;
        this.buffer[1] += other.buffer[1];
        if (sum < (this.buffer[0] >>> 0)) {
            ++this.buffer[1];
        }
        this.buffer[0] = sum;
    }
    lessThan(other) {
        return this.buffer[1] < other.buffer[1] ||
            (this.buffer[1] === other.buffer[1] && this.buffer[0] < other.buffer[0]);
    }
    equals(other) {
        return this.buffer[1] === other.buffer[1] && this.buffer[0] == other.buffer[0];
    }
    greaterThan(other) {
        return other.lessThan(this);
    }
    hex() {
        return `${intAsHex(this.buffer[1])} ${intAsHex(this.buffer[0])}`;
    }
}
export class Uint64 extends BaseInt64 {
    times(other) {
        this._times(other);
        return this;
    }
    plus(other) {
        this._plus(other);
        return this;
    }
    static multiply(left, right) {
        let rtrn = new Uint64(new Uint32Array(left.buffer));
        return rtrn.times(right);
    }
    static add(left, right) {
        let rtrn = new Uint64(new Uint32Array(left.buffer));
        return rtrn.plus(right);
    }
}
export class Int64 extends BaseInt64 {
    negate() {
        this.buffer[0] = ~this.buffer[0] + 1;
        this.buffer[1] = ~this.buffer[1];
        if (this.buffer[0] == 0) {
            ++this.buffer[1];
        }
        return this;
    }
    times(other) {
        this._times(other);
        return this;
    }
    plus(other) {
        this._plus(other);
        return this;
    }
    lessThan(other) {
        // force high bytes to be signed
        const this_high = this.buffer[1] << 0;
        const other_high = other.buffer[1] << 0;
        return this_high < other_high ||
            (this_high === other_high && this.buffer[0] < other.buffer[0]);
    }
    static fromString(str, out_buffer = new Uint32Array(2)) {
        // TODO: Assert that out_buffer is 0 and length = 2
        const negate = str.startsWith('-');
        const length = str.length;
        let out = new Int64(out_buffer);
        for (let posn = negate ? 1 : 0; posn < length;) {
            const group = kInt32DecimalDigits < length - posn ?
                kInt32DecimalDigits : length - posn;
            const chunk = new Int64(new Uint32Array([parseInt(str.substr(posn, group), 10), 0]));
            const multiple = new Int64(new Uint32Array([kPowersOfTen[group], 0]));
            out.times(multiple);
            out.plus(chunk);
            posn += group;
        }
        return negate ? out.negate() : out;
    }
    static multiply(left, right) {
        let rtrn = new Int64(new Uint32Array(left.buffer));
        return rtrn.times(right);
    }
    static add(left, right) {
        let rtrn = new Int64(new Uint32Array(left.buffer));
        return rtrn.plus(right);
    }
}
export class Int128 {
    constructor(buffer) {
        this.buffer = buffer;
        // buffer[3] MSB (high)
        // buffer[2]
        // buffer[1]
        // buffer[0] LSB (low)
    }
    high() {
        return new Int64(new Uint32Array(this.buffer.buffer, this.buffer.byteOffset + 8, 2));
    }
    low() {
        return new Int64(new Uint32Array(this.buffer.buffer, this.buffer.byteOffset, 2));
    }
    negate() {
        this.buffer[0] = ~this.buffer[0] + 1;
        this.buffer[1] = ~this.buffer[1];
        this.buffer[2] = ~this.buffer[2];
        this.buffer[3] = ~this.buffer[3];
        if (this.buffer[0] == 0) {
            ++this.buffer[1];
        }
        if (this.buffer[1] == 0) {
            ++this.buffer[2];
        }
        if (this.buffer[2] == 0) {
            ++this.buffer[3];
        }
        return this;
    }
    times(other) {
        // Break the left and right numbers into 32 bit chunks
        // so that we can multiply them without overflow.
        const L0 = new Uint64(new Uint32Array([this.buffer[3], 0]));
        const L1 = new Uint64(new Uint32Array([this.buffer[2], 0]));
        const L2 = new Uint64(new Uint32Array([this.buffer[1], 0]));
        const L3 = new Uint64(new Uint32Array([this.buffer[0], 0]));
        const R0 = new Uint64(new Uint32Array([other.buffer[3], 0]));
        const R1 = new Uint64(new Uint32Array([other.buffer[2], 0]));
        const R2 = new Uint64(new Uint32Array([other.buffer[1], 0]));
        const R3 = new Uint64(new Uint32Array([other.buffer[0], 0]));
        let product = Uint64.multiply(L3, R3);
        this.buffer[0] = product.low();
        let sum = new Uint64(new Uint32Array([product.high(), 0]));
        product = Uint64.multiply(L2, R3);
        sum.plus(product);
        product = Uint64.multiply(L3, R2);
        sum.plus(product);
        this.buffer[1] = sum.low();
        this.buffer[3] = (sum.lessThan(product) ? 1 : 0);
        this.buffer[2] = sum.high();
        let high = new Uint64(new Uint32Array(this.buffer.buffer, this.buffer.byteOffset + 8, 2));
        high.plus(Uint64.multiply(L1, R3))
            .plus(Uint64.multiply(L2, R2))
            .plus(Uint64.multiply(L3, R1));
        this.buffer[3] += Uint64.multiply(L0, R3)
            .plus(Uint64.multiply(L1, R2))
            .plus(Uint64.multiply(L2, R1))
            .plus(Uint64.multiply(L3, R0)).low();
        return this;
    }
    plus(other) {
        let sums = new Uint32Array(4);
        sums[3] = (this.buffer[3] + other.buffer[3]) >>> 0;
        sums[2] = (this.buffer[2] + other.buffer[2]) >>> 0;
        sums[1] = (this.buffer[1] + other.buffer[1]) >>> 0;
        sums[0] = (this.buffer[0] + other.buffer[0]) >>> 0;
        if (sums[0] < (this.buffer[0] >>> 0)) {
            ++sums[1];
        }
        if (sums[1] < (this.buffer[1] >>> 0)) {
            ++sums[2];
        }
        if (sums[2] < (this.buffer[2] >>> 0)) {
            ++sums[3];
        }
        this.buffer[3] = sums[3];
        this.buffer[2] = sums[2];
        this.buffer[1] = sums[1];
        this.buffer[0] = sums[0];
        return this;
    }
    hex() {
        return `${intAsHex(this.buffer[3])} ${intAsHex(this.buffer[2])} ${intAsHex(this.buffer[1])} ${intAsHex(this.buffer[0])}`;
    }
    static multiply(left, right) {
        let rtrn = new Int128(new Uint32Array(left.buffer));
        return rtrn.times(right);
    }
    static add(left, right) {
        let rtrn = new Int128(new Uint32Array(left.buffer));
        return rtrn.plus(right);
    }
    static fromString(str, out_buffer = new Uint32Array(4)) {
        // TODO: Assert that out_buffer is 0 and length = 4
        const negate = str.startsWith('-');
        const length = str.length;
        let out = new Int128(out_buffer);
        for (let posn = negate ? 1 : 0; posn < length;) {
            const group = kInt32DecimalDigits < length - posn ?
                kInt32DecimalDigits : length - posn;
            const chunk = new Int128(new Uint32Array([parseInt(str.substr(posn, group), 10), 0, 0, 0]));
            const multiple = new Int128(new Uint32Array([kPowersOfTen[group], 0, 0, 0]));
            out.times(multiple);
            out.plus(chunk);
            posn += group;
        }
        return negate ? out.negate() : out;
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LEtBQUssQ0FBQyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN6RixDQUFDO0lBRUQsR0FBRztRQUNDLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNyRixDQUFDO0lBRUQsTUFBTTtRQUNGLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVqQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQUU7UUFDOUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUFFLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUFFO1FBQzlDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FBRTtRQUM5QyxPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0lBRUQsS0FBSyxDQUFDLEtBQWE7UUFDZixzREFBc0Q7UUFDdEQsaURBQWlEO1FBQ2pELE1BQU0sRUFBRSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0QsTUFBTSxFQUFFLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3RCxNQUFNLEVBQUUsR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdELE1BQU0sRUFBRSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFN0QsTUFBTSxFQUFFLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxXQUFXLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3RCxNQUFNLEVBQUUsR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLFdBQVcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdELE1BQU0sRUFBRSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksV0FBVyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0QsTUFBTSxFQUFFLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxXQUFXLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUU3RCxJQUFJLE9BQU8sR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN0QyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUUvQixJQUFJLEdBQUcsR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFM0QsT0FBTyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2xDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFbEIsT0FBTyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2xDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFbEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7UUFFM0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFakQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDNUIsSUFBSSxJQUFJLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0s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LENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxHQUFHLE1BQU0sR0FBRztZQUM1QyxNQUFNLEtBQUssR0FBRyxtQkFBbUIsR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUM7Z0JBQ3JDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO1lBQ2xELE1BQU0sS0FBSyxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksV0FBVyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVGLE1BQU0sUUFBUSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksV0FBVyxDQUFDLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRTdFLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDcEIsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUVoQixJQUFJLElBQUksS0FBSyxDQUFDO1NBQ2pCO1FBRUQsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0lBQ3ZDLENBQUM7Q0FDSiIsImZpbGUiOiJ1dGlsL2ludC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5jb25zdCBjYXJyeUJpdDE2ID0gMSA8PCAxNjtcblxuZnVuY3Rpb24gaW50QXNIZXgodmFsdWU6IG51bWJlcik6IHN0cmluZyB7XG4gICAgaWYgKHZhbHVlIDwgMCkge1xuICAgICAgICB2YWx1ZSA9IDB4RkZGRkZGRkYgKyB2YWx1ZSArIDE7XG4gICAgfVxuICAgIHJldHVybiBgMHgke3ZhbHVlLnRvU3RyaW5nKDE2KX1gO1xufVxuXG5jb25zdCBrSW50MzJEZWNpbWFsRGlnaXRzID0gODtcbmNvbnN0IGtQb3dlcnNPZlRlbiA9IFsxLFxuICAgICAgICAgICAgICAgICAgICAgIDEwLFxuICAgICAgICAgICAgICAgICAgICAgIDEwMCxcbiAgICAgICAgICAgICAgICAgICAgICAxMDAwLFxuICAgICAgICAgICAgICAgICAgICAgIDEwMDAwLFxuICAgICAgICAgICAgICAgICAgICAgIDEwMDAwMCxcbiAgICAgICAgICAgICAgICAgICAgICAxMDAwMDAwLFxuICAgICAgICAgICAgICAgICAgICAgIDEwMDAwMDAwLFxuICAgICAgICAgICAgICAgICAgICAgIDEwMDAwMDAwMF07XG5cbmV4cG9ydCBjbGFzcyBCYXNlSW50NjQge1xuICAgIGNvbnN0cnVjdG9yIChwcm90ZWN0ZWQgYnVmZmVyOiBVaW50MzJBcnJheSkge31cblxuICAgIGhpZ2goKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMuYnVmZmVyWzFdOyB9XG4gICAgbG93ICgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5idWZmZXJbMF07IH1cblxuICAgIHByb3RlY3RlZCBfdGltZXMob3RoZXI6IEJhc2VJbnQ2NCkge1xuICAgICAgICAvLyBCcmVhayB0aGUgbGVmdCBhbmQgcmlnaHQgbnVtYmVycyBpbnRvIDE2IGJpdCBjaHVua3NcbiAgICAgICAgLy8gc28gdGhhdCB3ZSBjYW4gbXVsdGlwbHkgdGhlbSB3aXRob3V0IG92ZXJmbG93LlxuICAgICAgICBjb25zdCBMID0gbmV3IFVpbnQzMkFycmF5KFtcbiAgICAgICAgICAgIHRoaXMuYnVmZmVyWzFdID4+PiAxNixcbiAgICAgICAgICAgIHRoaXMuYnVmZmVyWzFdICYgMHhGRkZGLFxuICAgICAgICAgICAgdGhpcy5idWZmZXJbMF0gPj4+IDE2LFxuICAgICAgICAgICAgdGhpcy5idWZmZXJbMF0gJiAweEZGRkZcbiAgICAgICAgXSk7XG5cbiAgICAgICAgY29uc3QgUiA9IG5ldyBVaW50MzJBcnJheShbXG4gICAgICAgICAgICBvdGhlci5idWZmZXJbMV0gPj4+IDE2LFxuICAgICAgICAgICAgb3RoZXIuYnVmZmVyWzFdICYgMHhGRkZGLFxuICAgICAgICAgICAgb3RoZXIuYnVmZmVyWzBdID4+PiAxNixcbiAgICAgICAgICAgIG90aGVyLmJ1ZmZlclswXSAmIDB4RkZGRlxuICAgICAgICBdKTtcblxuICAgICAgICBsZXQgcHJvZHVjdCA9IExbM10gKiBSWzNdO1xuICAgICAgICB0aGlzLmJ1ZmZlclswXSA9IHByb2R1Y3QgJiAweEZGRkY7XG5cbiAgICAgICAgbGV0IHN1bSA9IHByb2R1Y3QgPj4+IDE2O1xuXG4gICAgICAgIHByb2R1Y3QgPSBMWzJdICogUlszXTtcbiAgICAgICAgc3VtICs9IHByb2R1Y3Q7XG5cbiAgICAgICAgcHJvZHVjdCA9IChMWzNdICogUlsyXSkgPj4+IDA7XG4gICAgICAgIHN1bSArPSBwcm9kdWN0O1xuXG4gICAgICAgIHRoaXMuYnVmZmVyWzBdICs9IHN1bSA8PCAxNjtcblxuICAgICAgICB0aGlzLmJ1ZmZlclsxXSA9IChzdW0gPj4+IDAgPCBwcm9kdWN0ID8gY2FycnlCaXQxNiA6IDApO1xuXG4gICAgICAgIHRoaXMuYnVmZmVyWzFdICs9IHN1bSA+Pj4gMTY7XG4gICAgICAgIHRoaXMuYnVmZmVyWzFdICs9IExbMV0gKiBSWzNdICsgTFsyXSAqIFJbMl0gKyBMWzNdICogUlsxXTtcbiAgICAgICAgdGhpcy5idWZmZXJbMV0gKz0gKExbMF0gKiBSWzNdICsgTFsxXSAqIFJbMl0gKyBMWzJdICogUlsxXSArIExbM10gKiBSWzBdKSA8PCAxNjtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cblxuICAgIHByb3RlY3RlZCBfcGx1cyhvdGhlcjogQmFzZUludDY0KSB7XG4gICAgICAgIGNvbnN0IHN1bSA9ICh0aGlzLmJ1ZmZlclswXSArIG90aGVyLmJ1ZmZlclswXSkgPj4+IDA7XG4gICAgICAgIHRoaXMuYnVmZmVyWzFdICs9IG90aGVyLmJ1ZmZlclsxXTtcbiAgICAgICAgaWYgKHN1bSA8ICh0aGlzLmJ1ZmZlclswXSA+Pj4gMCkpIHtcbiAgICAgICAgICArK3RoaXMuYnVmZmVyWzFdO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYnVmZmVyWzBdID0gc3VtO1xuICAgIH1cblxuICAgIGxlc3NUaGFuKG90aGVyOiBCYXNlSW50NjQpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYnVmZmVyWzFdIDwgb3RoZXIuYnVmZmVyWzFdIHx8XG4gICAgICAgICAgICAodGhpcy5idWZmZXJbMV0gPT09IG90aGVyLmJ1ZmZlclsxXSAmJiB0aGlzLmJ1ZmZlclswXSA8IG90aGVyLmJ1ZmZlclswXSk7XG4gICAgfVxuXG4gICAgZXF1YWxzKG90aGVyOiBCYXNlSW50NjQpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYnVmZmVyWzFdID09PSBvdGhlci5idWZmZXJbMV0gJiYgdGhpcy5idWZmZXJbMF0gPT0gb3RoZXIuYnVmZmVyWzBdO1xuICAgIH1cblxuICAgIGdyZWF0ZXJUaGFuKG90aGVyOiBCYXNlSW50NjQpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIG90aGVyLmxlc3NUaGFuKHRoaXMpO1xuICAgIH1cblxuICAgIGhleCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gYCR7aW50QXNIZXgodGhpcy5idWZmZXJbMV0pfSAke2ludEFzSGV4KHRoaXMuYnVmZmVyWzBdKX1gO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFVpbnQ2NCBleHRlbmRzIEJhc2VJbnQ2NCB7XG4gICAgdGltZXMob3RoZXI6IFVpbnQ2NCk6IFVpbnQ2NCB7XG4gICAgICAgIHRoaXMuX3RpbWVzKG90aGVyKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgcGx1cyhvdGhlcjogVWludDY0KTogVWludDY0IHtcbiAgICAgICAgdGhpcy5fcGx1cyhvdGhlcik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHN0YXRpYyBtdWx0aXBseShsZWZ0OiBVaW50NjQsIHJpZ2h0OiBVaW50NjQpOiBVaW50NjQge1xuICAgICAgICBsZXQgcnRybiA9IG5ldyBVaW50NjQobmV3IFVpbnQzMkFycmF5KGxlZnQuYnVmZmVyKSk7XG4gICAgICAgIHJldHVybiBydHJuLnRpbWVzKHJpZ2h0KTtcbiAgICB9XG5cbiAgICBzdGF0aWMgYWRkKGxlZnQ6IFVpbnQ2NCwgcmlnaHQ6IFVpbnQ2NCk6IFVpbnQ2NCB7XG4gICAgICAgIGxldCBydHJuID0gbmV3IFVpbnQ2NChuZXcgVWludDMyQXJyYXkobGVmdC5idWZmZXIpKTtcbiAgICAgICAgcmV0dXJuIHJ0cm4ucGx1cyhyaWdodCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgSW50NjQgZXh0ZW5kcyBCYXNlSW50NjQge1xuICAgIG5lZ2F0ZSgpOiBJbnQ2NCB7XG4gICAgICAgIHRoaXMuYnVmZmVyWzBdID0gfnRoaXMuYnVmZmVyWzBdICsgMTtcbiAgICAgICAgdGhpcy5idWZmZXJbMV0gPSB+dGhpcy5idWZmZXJbMV07XG5cbiAgICAgICAgaWYgKHRoaXMuYnVmZmVyWzBdID09IDApIHsgKyt0aGlzLmJ1ZmZlclsxXTsgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICB0aW1lcyhvdGhlcjogSW50NjQpOiBJbnQ2NCB7XG4gICAgICAgIHRoaXMuX3RpbWVzKG90aGVyKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgcGx1cyhvdGhlcjogSW50NjQpOiBJbnQ2NCB7XG4gICAgICAgIHRoaXMuX3BsdXMob3RoZXIpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBsZXNzVGhhbihvdGhlcjogSW50NjQpOiBib29sZWFuIHtcbiAgICAgICAgLy8gZm9yY2UgaGlnaCBieXRlcyB0byBiZSBzaWduZWRcbiAgICAgICAgY29uc3QgdGhpc19oaWdoID0gdGhpcy5idWZmZXJbMV0gPDwgMDtcbiAgICAgICAgY29uc3Qgb3RoZXJfaGlnaCA9IG90aGVyLmJ1ZmZlclsxXSA8PCAwO1xuICAgICAgICByZXR1cm4gdGhpc19oaWdoIDwgb3RoZXJfaGlnaCB8fFxuICAgICAgICAgICAgKHRoaXNfaGlnaCA9PT0gb3RoZXJfaGlnaCAmJiB0aGlzLmJ1ZmZlclswXSA8IG90aGVyLmJ1ZmZlclswXSk7XG4gICAgfVxuXG4gICAgc3RhdGljIGZyb21TdHJpbmcoc3RyOiBzdHJpbmcsIG91dF9idWZmZXIgPSBuZXcgVWludDMyQXJyYXkoMikpOiBJbnQ2NCB7XG4gICAgICAgIC8vIFRPRE86IEFzc2VydCB0aGF0IG91dF9idWZmZXIgaXMgMCBhbmQgbGVuZ3RoID0gMlxuICAgICAgICBjb25zdCBuZWdhdGUgPSBzdHIuc3RhcnRzV2l0aCgnLScpO1xuICAgICAgICBjb25zdCBsZW5ndGggPSBzdHIubGVuZ3RoO1xuXG4gICAgICAgIGxldCBvdXQgPSBuZXcgSW50NjQob3V0X2J1ZmZlcik7XG4gICAgICAgIGZvciAobGV0IHBvc24gPSBuZWdhdGUgPyAxIDogMDsgcG9zbiA8IGxlbmd0aDspIHtcbiAgICAgICAgICAgIGNvbnN0IGdyb3VwID0ga0ludDMyRGVjaW1hbERpZ2l0cyA8IGxlbmd0aCAtIHBvc24gP1xuICAgICAgICAgICAgICAgICAgICAgICAgICBrSW50MzJEZWNpbWFsRGlnaXRzIDogbGVuZ3RoIC0gcG9zbjtcbiAgICAgICAgICAgIGNvbnN0IGNodW5rID0gbmV3IEludDY0KG5ldyBVaW50MzJBcnJheShbcGFyc2VJbnQoc3RyLnN1YnN0cihwb3NuLCBncm91cCksIDEwKSwgMF0pKTtcbiAgICAgICAgICAgIGNvbnN0IG11bHRpcGxlID0gbmV3IEludDY0KG5ldyBVaW50MzJBcnJheShba1Bvd2Vyc09mVGVuW2dyb3VwXSwgMF0pKTtcblxuICAgICAgICAgICAgb3V0LnRpbWVzKG11bHRpcGxlKTtcbiAgICAgICAgICAgIG91dC5wbHVzKGNodW5rKTtcblxuICAgICAgICAgICAgcG9zbiArPSBncm91cDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZWdhdGUgPyBvdXQubmVnYXRlKCkgOiBvdXQ7XG4gICAgfVxuXG4gICAgc3RhdGljIG11bHRpcGx5KGxlZnQ6IEludDY0LCByaWdodDogSW50NjQpOiBJbnQ2NCB7XG4gICAgICAgIGxldCBydHJuID0gbmV3IEludDY0KG5ldyBVaW50MzJBcnJheShsZWZ0LmJ1ZmZlcikpO1xuICAgICAgICByZXR1cm4gcnRybi50aW1lcyhyaWdodCk7XG4gICAgfVxuXG4gICAgc3RhdGljIGFkZChsZWZ0OiBJbnQ2NCwgcmlnaHQ6IEludDY0KTogSW50NjQge1xuICAgICAgICBsZXQgcnRybiA9IG5ldyBJbnQ2NChuZXcgVWludDMyQXJyYXkobGVmdC5idWZmZXIpKTtcbiAgICAgICAgcmV0dXJuIHJ0cm4ucGx1cyhyaWdodCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgSW50MTI4IHtcbiAgICBjb25zdHJ1Y3RvciAocHJpdmF0ZSBidWZmZXI6IFVpbnQzMkFycmF5KSB7XG4gICAgICAgIC8vIGJ1ZmZlclszXSBNU0IgKGhpZ2gpXG4gICAgICAgIC8vIGJ1ZmZlclsyXVxuICAgICAgICAvLyBidWZmZXJbMV1cbiAgICAgICAgLy8gYnVmZmVyWzBdIExTQiAobG93KVxuICAgIH1cblxuICAgIGhpZ2goKTogSW50NjQge1xuICAgICAgICByZXR1cm4gbmV3IEludDY0KG5ldyBVaW50MzJBcnJheSh0aGlzLmJ1ZmZlci5idWZmZXIsIHRoaXMuYnVmZmVyLmJ5dGVPZmZzZXQgKyA4LCAyKSk7XG4gICAgfVxuXG4gICAgbG93KCk6IEludDY0IHtcbiAgICAgICAgcmV0dXJuIG5ldyBJbnQ2NChuZXcgVWludDMyQXJyYXkodGhpcy5idWZmZXIuYnVmZmVyLCB0aGlzLmJ1ZmZlci5ieXRlT2Zmc2V0LCAyKSk7XG4gICAgfVxuXG4gICAgbmVnYXRlKCk6IEludDEyOCB7XG4gICAgICAgIHRoaXMuYnVmZmVyWzBdID0gfnRoaXMuYnVmZmVyWzBdICsgMTtcbiAgICAgICAgdGhpcy5idWZmZXJbMV0gPSB+dGhpcy5idWZmZXJbMV07XG4gICAgICAgIHRoaXMuYnVmZmVyWzJdID0gfnRoaXMuYnVmZmVyWzJdO1xuICAgICAgICB0aGlzLmJ1ZmZlclszXSA9IH50aGlzLmJ1ZmZlclszXTtcblxuICAgICAgICBpZiAodGhpcy5idWZmZXJbMF0gPT0gMCkgeyArK3RoaXMuYnVmZmVyWzFdOyB9XG4gICAgICAgIGlmICh0aGlzLmJ1ZmZlclsxXSA9PSAwKSB7ICsrdGhpcy5idWZmZXJbMl07IH1cbiAgICAgICAgaWYgKHRoaXMuYnVmZmVyWzJdID09IDApIHsgKyt0aGlzLmJ1ZmZlclszXTsgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICB0aW1lcyhvdGhlcjogSW50MTI4KTogSW50MTI4IHtcbiAgICAgICAgLy8gQnJlYWsgdGhlIGxlZnQgYW5kIHJpZ2h0IG51bWJlcnMgaW50byAzMiBiaXQgY2h1bmtzXG4gICAgICAgIC8vIHNvIHRoYXQgd2UgY2FuIG11bHRpcGx5IHRoZW0gd2l0aG91dCBvdmVyZmxvdy5cbiAgICAgICAgY29uc3QgTDAgPSBuZXcgVWludDY0KG5ldyBVaW50MzJBcnJheShbdGhpcy5idWZmZXJbM10sICAwXSkpO1xuICAgICAgICBjb25zdCBMMSA9IG5ldyBVaW50NjQobmV3IFVpbnQzMkFycmF5KFt0aGlzLmJ1ZmZlclsyXSwgIDBdKSk7XG4gICAgICAgIGNvbnN0IEwyID0gbmV3IFVpbnQ2NChuZXcgVWludDMyQXJyYXkoW3RoaXMuYnVmZmVyWzFdLCAgMF0pKTtcbiAgICAgICAgY29uc3QgTDMgPSBuZXcgVWludDY0KG5ldyBVaW50MzJBcnJheShbdGhpcy5idWZmZXJbMF0sICAwXSkpO1xuXG4gICAgICAgIGNvbnN0IFIwID0gbmV3IFVpbnQ2NChuZXcgVWludDMyQXJyYXkoW290aGVyLmJ1ZmZlclszXSwgMF0pKTtcbiAgICAgICAgY29uc3QgUjEgPSBuZXcgVWludDY0KG5ldyBVaW50MzJBcnJheShbb3RoZXIuYnVmZmVyWzJdLCAwXSkpO1xuICAgICAgICBjb25zdCBSMiA9IG5ldyBVaW50NjQobmV3IFVpbnQzMkFycmF5KFtvdGhlci5idWZmZXJbMV0sIDBdKSk7XG4gICAgICAgIGNvbnN0IFIzID0gbmV3IFVpbnQ2NChuZXcgVWludDMyQXJyYXkoW290aGVyLmJ1ZmZlclswXSwgMF0pKTtcblxuICAgICAgICBsZXQgcHJvZHVjdCA9IFVpbnQ2NC5tdWx0aXBseShMMywgUjMpO1xuICAgICAgICB0aGlzLmJ1ZmZlclswXSA9IHByb2R1Y3QubG93KCk7XG5cbiAgICAgICAgbGV0IHN1bSA9IG5ldyBVaW50NjQobmV3IFVpbnQzMkFycmF5KFtwcm9kdWN0LmhpZ2goKSwgMF0pKTtcblxuICAgICAgICBwcm9kdWN0ID0gVWludDY0Lm11bHRpcGx5KEwyLCBSMyk7XG4gICAgICAgIHN1bS5wbHVzKHByb2R1Y3QpO1xuXG4gICAgICAgIHByb2R1Y3QgPSBVaW50NjQubXVsdGlwbHkoTDMsIFIyKTtcbiAgICAgICAgc3VtLnBsdXMocHJvZHVjdCk7XG5cbiAgICAgICAgdGhpcy5idWZmZXJbMV0gPSBzdW0ubG93KCk7XG5cbiAgICAgICAgdGhpcy5idWZmZXJbM10gPSAoc3VtLmxlc3NUaGFuKHByb2R1Y3QpID8gMSA6IDApO1xuXG4gICAgICAgIHRoaXMuYnVmZmVyWzJdID0gc3VtLmhpZ2goKTtcbiAgICAgICAgbGV0IGhpZ2ggPSBuZXcgVWludDY0KG5ldyBVaW50MzJBcnJheSh0aGlzLmJ1ZmZlci5idWZmZXIsIHRoaXMuYnVmZmVyLmJ5dGVPZmZzZXQgKyA4LCAyKSk7XG5cbiAgICAgICAgaGlnaC5wbHVzKFVpbnQ2NC5tdWx0aXBseShMMSwgUjMpKVxuICAgICAgICAgICAgLnBsdXMoVWludDY0Lm11bHRpcGx5KEwyLCBSMikpXG4gICAgICAgICAgICAucGx1cyhVaW50NjQubXVsdGlwbHkoTDMsIFIxKSk7XG4gICAgICAgIHRoaXMuYnVmZmVyWzNdICs9IFVpbnQ2NC5tdWx0aXBseShMMCwgUjMpXG4gICAgICAgICAgICAgICAgICAgICAgICAucGx1cyhVaW50NjQubXVsdGlwbHkoTDEsIFIyKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5wbHVzKFVpbnQ2NC5tdWx0aXBseShMMiwgUjEpKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnBsdXMoVWludDY0Lm11bHRpcGx5KEwzLCBSMCkpLmxvdygpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHBsdXMob3RoZXI6IEludDEyOCk6IEludDEyOCB7XG4gICAgICAgIGxldCBzdW1zID0gbmV3IFVpbnQzMkFycmF5KDQpO1xuICAgICAgICBzdW1zWzNdID0gKHRoaXMuYnVmZmVyWzNdICsgb3RoZXIuYnVmZmVyWzNdKSA+Pj4gMDtcbiAgICAgICAgc3Vtc1syXSA9ICh0aGlzLmJ1ZmZlclsyXSArIG90aGVyLmJ1ZmZlclsyXSkgPj4+IDA7XG4gICAgICAgIHN1bXNbMV0gPSAodGhpcy5idWZmZXJbMV0gKyBvdGhlci5idWZmZXJbMV0pID4+PiAwO1xuICAgICAgICBzdW1zWzBdID0gKHRoaXMuYnVmZmVyWzBdICsgb3RoZXIuYnVmZmVyWzBdKSA+Pj4gMDtcblxuICAgICAgICBpZiAoc3Vtc1swXSA8ICh0aGlzLmJ1ZmZlclswXSA+Pj4gMCkpIHtcbiAgICAgICAgICAgICsrc3Vtc1sxXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3Vtc1sxXSA8ICh0aGlzLmJ1ZmZlclsxXSA+Pj4gMCkpIHtcbiAgICAgICAgICAgICsrc3Vtc1syXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3Vtc1syXSA8ICh0aGlzLmJ1ZmZlclsyXSA+Pj4gMCkpIHtcbiAgICAgICAgICAgICsrc3Vtc1szXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuYnVmZmVyWzNdID0gc3Vtc1szXTtcbiAgICAgICAgdGhpcy5idWZmZXJbMl0gPSBzdW1zWzJdO1xuICAgICAgICB0aGlzLmJ1ZmZlclsxXSA9IHN1bXNbMV07XG4gICAgICAgIHRoaXMuYnVmZmVyWzBdID0gc3Vtc1swXTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBoZXgoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIGAke2ludEFzSGV4KHRoaXMuYnVmZmVyWzNdKX0gJHtpbnRBc0hleCh0aGlzLmJ1ZmZlclsyXSl9ICR7aW50QXNIZXgodGhpcy5idWZmZXJbMV0pfSAke2ludEFzSGV4KHRoaXMuYnVmZmVyWzBdKX1gO1xuICAgIH1cblxuICAgIHN0YXRpYyBtdWx0aXBseShsZWZ0OiBJbnQxMjgsIHJpZ2h0OiBJbnQxMjgpOiBJbnQxMjgge1xuICAgICAgICBsZXQgcnRybiA9IG5ldyBJbnQxMjgobmV3IFVpbnQzMkFycmF5KGxlZnQuYnVmZmVyKSk7XG4gICAgICAgIHJldHVybiBydHJuLnRpbWVzKHJpZ2h0KTtcbiAgICB9XG5cbiAgICBzdGF0aWMgYWRkKGxlZnQ6IEludDEyOCwgcmlnaHQ6IEludDEyOCk6IEludDEyOCB7XG4gICAgICAgIGxldCBydHJuID0gbmV3IEludDEyOChuZXcgVWludDMyQXJyYXkobGVmdC5idWZmZXIpKTtcbiAgICAgICAgcmV0dXJuIHJ0cm4ucGx1cyhyaWdodCk7XG4gICAgfVxuXG4gICAgc3RhdGljIGZyb21TdHJpbmcoc3RyOiBzdHJpbmcsIG91dF9idWZmZXIgPSBuZXcgVWludDMyQXJyYXkoNCkpOiBJbnQxMjgge1xuICAgICAgICAvLyBUT0RPOiBBc3NlcnQgdGhhdCBvdXRfYnVmZmVyIGlzIDAgYW5kIGxlbmd0aCA9IDRcbiAgICAgICAgY29uc3QgbmVnYXRlID0gc3RyLnN0YXJ0c1dpdGgoJy0nKTtcbiAgICAgICAgY29uc3QgbGVuZ3RoID0gc3RyLmxlbmd0aDtcblxuICAgICAgICBsZXQgb3V0ID0gbmV3IEludDEyOChvdXRfYnVmZmVyKTtcbiAgICAgICAgZm9yIChsZXQgcG9zbiA9IG5lZ2F0ZSA/IDEgOiAwOyBwb3NuIDwgbGVuZ3RoOykge1xuICAgICAgICAgICAgY29uc3QgZ3JvdXAgPSBrSW50MzJEZWNpbWFsRGlnaXRzIDwgbGVuZ3RoIC0gcG9zbiA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGtJbnQzMkRlY2ltYWxEaWdpdHMgOiBsZW5ndGggLSBwb3NuO1xuICAgICAgICAgICAgY29uc3QgY2h1bmsgPSBuZXcgSW50MTI4KG5ldyBVaW50MzJBcnJheShbcGFyc2VJbnQoc3RyLnN1YnN0cihwb3NuLCBncm91cCksIDEwKSwgMCwgMCwgMF0pKTtcbiAgICAgICAgICAgIGNvbnN0IG11bHRpcGxlID0gbmV3IEludDEyOChuZXcgVWludDMyQXJyYXkoW2tQb3dlcnNPZlRlbltncm91cF0sIDAsIDAsIDBdKSk7XG5cbiAgICAgICAgICAgIG91dC50aW1lcyhtdWx0aXBsZSk7XG4gICAgICAgICAgICBvdXQucGx1cyhjaHVuayk7XG5cbiAgICAgICAgICAgIHBvc24gKz0gZ3JvdXA7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmVnYXRlID8gb3V0Lm5lZ2F0ZSgpIDogb3V0O1xuICAgIH1cbn1cbiJdfQ==

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bit_1 = require("../util/bit");
const buffer_1 = require("../util/buffer");
const data_1 = require("../data");
const pretty_1 = require("../util/pretty");
const compat_1 = require("../util/compat");
const type_1 = require("../type");
class Builder {
    constructor(options) {
        this.length = 0;
        this.nullCount = 0;
        this.offset = 0;
        this._bytesUsed = 0;
        this._bytesReserved = 0;
        const type = options['type'];
        const nullValues = options['nullValues'];
        this.stride = type_1.strideForType(this._type = type);
        this.children = (type.children || []).map((f) => new Builder(f.type));
        this.nullValues = Object.freeze(nullValues || []);
        this.nullBitmap = new Uint8Array(0);
        if (this.nullValues.length) {
            this._isValid = compileIsValid(this.nullValues);
            this.children.forEach((child /* <-- any so we can assign to `nullValues` */) => {
                child._isValid = this._isValid;
                child.nullValues = this.nullValues;
                child.nullBitmap = new Uint8Array(0);
            });
        }
    }
    get type() { return this._type; }
    get bytesUsed() { return this._bytesUsed; }
    get bytesReserved() { return this._bytesReserved; }
    get ArrayType() { return this._type.ArrayType; }
    // /**
    //  * Create a clone of this Builder that uses the supplied list as values
    //  * that indicate a null value should be written into the validity bitmap,
    //  * indicating null instead of a valid value.
    //  * 
    //  * This is helpful when building Arrow Vectors from data sources that use
    //  * inline sentinel values to indicate null elements. For example, many systems
    //  * use `NaN` to indicate FloatingPoint null, or the strings 'null', '\0', 'na',
    //  * or 'N/A' to indicate String null.
    //  * @param nullValues An Array of values that should be interpreted as `null`
    //  * when passed as the value to `Builder#set(val, idx)`.
    //  */
    // public withNullValues<RNull = any>(nullValues: RNull[]) {
    //     return DataBuilder.new<T, RNull>(this.type, nullValues);
    // }
    *readAll(source, chunkLength = Infinity) {
        for (const value of source) {
            if (this.write(value).length >= chunkLength) {
                yield this.flush();
            }
        }
        if (this.finish().length > 0)
            yield this.flush();
    }
    async *readAllAsync(source, chunkLength = Infinity) {
        for await (const value of source) {
            if (this.write(value).length >= chunkLength) {
                yield this.flush();
            }
        }
        if (this.finish().length > 0)
            yield this.flush();
    }
    /**
     * Validates whether a value is valid (true), or null (false)
     * @param value The value to compare against null the value representations
     */
    isValid(value) {
        return this._isValid(value);
    }
    write(value) {
        const offset = this.length;
        if (this.writeValid(this.isValid(value), offset)) {
            this.writeValue(value, offset);
        }
        return this._updateBytesUsed(offset, this.length = offset + 1);
    }
    writeValue(value, offset) {
        this._setValue(this, offset, value);
    }
    /** @ignore */
    writeValid(isValid, offset) {
        isValid || ++this.nullCount;
        bit_1.setBool(this._getNullBitmap(offset), offset, isValid);
        return isValid;
    }
    // @ts-ignore
    _updateBytesUsed(offset, length) {
        offset % 512 || (this._bytesUsed += 64);
        return this;
    }
    flush() {
        const { length, nullCount } = this;
        let { valueOffsets, values, nullBitmap, typeIds } = this;
        if (valueOffsets) {
            valueOffsets = sliceOrExtendArray(valueOffsets, roundLengthToMultipleOf64Bytes(length, 4));
            values && (values = sliceOrExtendArray(values, roundLengthToMultipleOf64Bytes(valueOffsets[length], values.BYTES_PER_ELEMENT)));
        }
        else if (values) {
            values = sliceOrExtendArray(values, roundLengthToMultipleOf64Bytes(length * this.stride, values.BYTES_PER_ELEMENT));
        }
        nullBitmap && (nullBitmap = nullCount === 0 ? new Uint8Array(0)
            : sliceOrExtendArray(nullBitmap, roundLengthToMultipleOf64Bytes(length >> 3, 1) || 64));
        typeIds && (typeIds = sliceOrExtendArray(typeIds, roundLengthToMultipleOf64Bytes(length, 1)));
        const data = data_1.Data.new(this._type, 0, length, nullCount, [
            valueOffsets, values, nullBitmap, typeIds
        ], this.children.map((child) => child.flush()));
        this.reset();
        return data;
    }
    finish() {
        this.children.forEach((child) => child.finish());
        return this;
    }
    reset() {
        this.length = 0;
        this.nullCount = 0;
        this._bytesUsed = 0;
        this._bytesReserved = 0;
        this.values && (this.values = this.values.subarray(0, 0));
        this.typeIds && (this.typeIds = this.typeIds.subarray(0, 0));
        this.nullBitmap && (this.nullBitmap = this.nullBitmap.subarray(0, 0));
        this.valueOffsets && (this.valueOffsets = this.valueOffsets.subarray(0, 0));
        return this;
    }
    _getNullBitmap(length) {
        let buf = this.nullBitmap;
        if ((length >> 3) >= buf.length) {
            length = roundLengthToMultipleOf64Bytes(length, 1) || 32;
            this.nullBitmap = buf = buffer_1.memcpy(new Uint8Array(length * 2), buf);
        }
        return buf;
    }
    _getValueOffsets(length) {
        let buf = this.valueOffsets;
        if (length >= buf.length - 1) {
            length = roundLengthToMultipleOf64Bytes(length, 4) || 8;
            this.valueOffsets = buf = buffer_1.memcpy(new Int32Array(length * 2), buf);
        }
        return buf;
    }
    _getValues(length) {
        let { stride, values: buf } = this;
        if ((length * stride) >= buf.length) {
            let { ArrayType } = this, BPE = ArrayType.BYTES_PER_ELEMENT;
            length = roundLengthToMultipleOf64Bytes(length, BPE) || (32 / BPE);
            this.values = buf = buffer_1.memcpy(new ArrayType(length * stride * 2), buf);
        }
        return buf;
    }
    _getValuesBitmap(length) {
        let buf = this.values;
        if ((length >> 3) >= buf.length) {
            length = roundLengthToMultipleOf64Bytes(length, 1) || 32;
            this.values = buf = buffer_1.memcpy(new Uint8Array(length * 2), buf);
        }
        return buf;
    }
    _getTypeIds(length) {
        let buf = this.typeIds;
        if (length >= buf.length) {
            length = roundLengthToMultipleOf64Bytes(length, 1) || 32;
            this.typeIds = buf = buffer_1.memcpy(new Int8Array(length * 2), buf);
        }
        return buf;
    }
}
exports.Builder = Builder;
Builder.prototype._isValid = compileIsValid([null, undefined]);
class FlatBuilder extends Builder {
    constructor(options) {
        super(options);
        this.values = new this.ArrayType(0);
        this.BYTES_PER_ELEMENT = this.stride * this.ArrayType.BYTES_PER_ELEMENT;
    }
    get bytesReserved() {
        return this.values.byteLength + this.nullBitmap.byteLength;
    }
    writeValue(value, offset) {
        this._getValues(offset);
        return super.writeValue(value, offset);
    }
    _updateBytesUsed(offset, length) {
        this._bytesUsed += this.BYTES_PER_ELEMENT;
        return super._updateBytesUsed(offset, length);
    }
}
exports.FlatBuilder = FlatBuilder;
class FlatListBuilder extends Builder {
    constructor(options) {
        super(options);
        this.valueOffsets = new Int32Array(0);
    }
    get bytesReserved() {
        return this.valueOffsets.byteLength + this.nullBitmap.byteLength +
            roundLengthToMultipleOf64Bytes(this.valueOffsets[this.length], 1);
    }
    writeValid(isValid, offset) {
        if (!super.writeValid(isValid, offset)) {
            const valueOffsets = this._getValueOffsets(offset);
            valueOffsets[offset + 1] = valueOffsets[offset];
        }
        return isValid;
    }
    writeValue(value, offset) {
        const valueOffsets = this._getValueOffsets(offset);
        valueOffsets[offset + 1] = valueOffsets[offset] + value.length;
        (this._values || (this._values = new Map())).set(offset, value);
        this._bytesUsed += value.length;
        this._bytesReserved += value.length;
    }
    _updateBytesUsed(offset, length) {
        this._bytesUsed += 4;
        return super._updateBytesUsed(offset, length);
    }
    flush() {
        this.values = new Uint8Array(roundLengthToMultipleOf64Bytes(this.valueOffsets[this.length], 1));
        this._values && ((xs, n) => {
            let i = -1, x;
            while (++i < n) {
                if ((x = xs.get(i)) !== undefined) {
                    super.writeValue(x, i);
                }
            }
        })(this._values, this.length);
        this._values = undefined;
        return super.flush();
    }
}
exports.FlatListBuilder = FlatListBuilder;
class NestedBuilder extends Builder {
    get bytesUsed() {
        return this.children.reduce((acc, { bytesUsed }) => acc + bytesUsed, this._bytesUsed);
    }
    get bytesReserved() {
        return this.children.reduce((acc, { bytesReserved }) => acc + bytesReserved, this.nullBitmap.byteLength);
    }
    getChildAt(index) {
        return this.children[index];
    }
}
exports.NestedBuilder = NestedBuilder;
/** @ignore */
function roundLengthToMultipleOf64Bytes(len, BYTES_PER_ELEMENT) {
    return ((((len * BYTES_PER_ELEMENT) + 63) & ~63)) / BYTES_PER_ELEMENT;
}
/** @ignore */
function sliceOrExtendArray(array, alignedLength = 0) {
    return array.length >= alignedLength ? array.subarray(0, alignedLength)
        : buffer_1.memcpy(new array.constructor(alignedLength), array, 0);
}
/** @ignore */
function valueToCase(x) {
    if (typeof x !== 'bigint') {
        return pretty_1.valueToString(x);
    }
    else if (compat_1.BigIntAvailable) {
        return `${pretty_1.valueToString(x)}n`;
    }
    return `"${pretty_1.valueToString(x)}"`;
}
/**
 * Dynamically compile the null values into an `isValid()` function whose
 * implementation is a switch statement. Microbenchmarks in v8 indicate
 * this approach is 25% faster than using an ES6 Map.
 * @ignore
 * @param nullValues
 */
function compileIsValid(nullValues) {
    if (!nullValues || nullValues.length <= 0) {
        return function isValid(_value) { return true; };
    }
    let fnBody = '';
    let noNaNs = nullValues.filter((x) => x === x);
    if (noNaNs.length > 0) {
        fnBody = `
    switch (x) {${noNaNs.map((x) => `
        case ${valueToCase(x)}:`).join('')}
            return false;
    }`;
    }
    // NaN doesn't equal anything including itself, so it doesn't work as a
    // switch case. Instead we must explicitly check for NaN before the switch.
    if (nullValues.length !== noNaNs.length) {
        fnBody = `if (x !== x) return false;\n${fnBody}`;
    }
    return new Function(`x`, `${fnBody}\nreturn true;`);
}

//# sourceMappingURL=base.js.map

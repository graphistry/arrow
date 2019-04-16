"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = require("./base");
const bn_1 = require("../util/bn");
class IntBuilder extends base_1.FlatBuilder {
}
exports.IntBuilder = IntBuilder;
class Int8Builder extends IntBuilder {
}
exports.Int8Builder = Int8Builder;
class Int16Builder extends IntBuilder {
}
exports.Int16Builder = Int16Builder;
class Int32Builder extends IntBuilder {
}
exports.Int32Builder = Int32Builder;
class Int64Builder extends IntBuilder {
    constructor(options) {
        if (options['nullValues']) {
            options['nullValues'] = options['nullValues'].map(toMaybeBigInt);
        }
        super(options);
    }
    isValid(value) {
        return this._isValid(toMaybeBigInt(value));
    }
}
exports.Int64Builder = Int64Builder;
class Uint8Builder extends IntBuilder {
}
exports.Uint8Builder = Uint8Builder;
class Uint16Builder extends IntBuilder {
}
exports.Uint16Builder = Uint16Builder;
class Uint32Builder extends IntBuilder {
}
exports.Uint32Builder = Uint32Builder;
class Uint64Builder extends IntBuilder {
    constructor(options) {
        if (options['nullValues']) {
            options['nullValues'] = options['nullValues'].map(toMaybeBigInt);
        }
        super(options);
    }
    isValid(value) {
        return this._isValid(toMaybeBigInt(value));
    }
}
exports.Uint64Builder = Uint64Builder;
const toMaybeBigInt = ((memo) => (value) => {
    if (ArrayBuffer.isView(value)) {
        memo.buffer = value.buffer;
        memo.byteOffset = value.byteOffset;
        memo.byteLength = value.byteLength;
        value = bn_1.bignumToBigInt(memo);
        memo.buffer = null;
    }
    return value;
})({ BigIntArray: BigInt64Array });

//# sourceMappingURL=int.js.map

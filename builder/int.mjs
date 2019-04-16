import { FlatBuilder } from './base';
import { bignumToBigInt } from '../util/bn';
export class IntBuilder extends FlatBuilder {
}
export class Int8Builder extends IntBuilder {
}
export class Int16Builder extends IntBuilder {
}
export class Int32Builder extends IntBuilder {
}
export class Int64Builder extends IntBuilder {
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
export class Uint8Builder extends IntBuilder {
}
export class Uint16Builder extends IntBuilder {
}
export class Uint32Builder extends IntBuilder {
}
export class Uint64Builder extends IntBuilder {
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
const toMaybeBigInt = ((memo) => (value) => {
    if (ArrayBuffer.isView(value)) {
        memo.buffer = value.buffer;
        memo.byteOffset = value.byteOffset;
        memo.byteLength = value.byteLength;
        value = bignumToBigInt(memo);
        memo.buffer = null;
    }
    return value;
})({ BigIntArray: BigInt64Array });

//# sourceMappingURL=int.mjs.map

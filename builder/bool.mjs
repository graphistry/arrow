import { Builder } from './base';
export class BoolBuilder extends Builder {
    constructor(options) {
        super(options);
        this.values = new Uint8Array(0);
    }
    writeValue(value, offset) {
        this._getValuesBitmap(offset);
        return super.writeValue(value, offset);
    }
    _updateBytesUsed(offset, length) {
        offset % 512 || (this._bytesUsed += 64);
        return super._updateBytesUsed(offset, length);
    }
}

//# sourceMappingURL=bool.mjs.map

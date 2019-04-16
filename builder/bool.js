"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = require("./base");
class BoolBuilder extends base_1.Builder {
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
exports.BoolBuilder = BoolBuilder;

//# sourceMappingURL=bool.js.map

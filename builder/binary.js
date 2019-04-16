"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = require("./base");
class BinaryBuilder extends base_1.FlatListBuilder {
    writeValue(value, index = this.length) {
        return super.writeValue(value, index);
    }
}
exports.BinaryBuilder = BinaryBuilder;

//# sourceMappingURL=binary.js.map

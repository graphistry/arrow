"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = require("./base");
const utf8_1 = require("../util/utf8");
class Utf8Builder extends base_1.FlatListBuilder {
    writeValue(value, index = this.length) {
        return super.writeValue(utf8_1.encodeUtf8(value), index);
    }
}
exports.Utf8Builder = Utf8Builder;

//# sourceMappingURL=utf8.js.map

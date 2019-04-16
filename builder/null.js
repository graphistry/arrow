"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = require("./base");
class NullBuilder extends base_1.Builder {
    writeValue(value) { return value; }
    writeValid(isValid) { return isValid; }
}
exports.NullBuilder = NullBuilder;

//# sourceMappingURL=null.js.map

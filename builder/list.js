"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = require("./base");
class ListBuilder extends base_1.NestedBuilder {
    constructor() {
        super(...arguments);
        this.row = new RowLike();
    }
    writeValue(value, offset) {
        const row = this.row;
        row.values = value;
        super.writeValue(row, offset);
        row.values = null;
    }
}
exports.ListBuilder = ListBuilder;
class RowLike {
    constructor() {
        this.values = null;
    }
    get(index) {
        return this.values ? this.values[index] : null;
    }
}

//# sourceMappingURL=list.js.map

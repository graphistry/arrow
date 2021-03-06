import { NestedBuilder } from './base';
export class FixedSizeListBuilder extends NestedBuilder {
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
class RowLike {
    constructor() {
        this.values = null;
    }
    get(index) {
        return this.values ? this.values[index] : null;
    }
}

//# sourceMappingURL=fixedsizelist.mjs.map

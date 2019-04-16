"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("../schema");
const base_1 = require("./base");
const type_1 = require("../type");
class UnionBuilder extends base_1.NestedBuilder {
    constructor(options) {
        super(options);
        this.typeIds = new Int8Array(0);
    }
    get bytesReserved() {
        return this.children.reduce((acc, { bytesReserved }) => acc + bytesReserved, this.typeIds.byteLength + this.nullBitmap.byteLength);
    }
    write(value, childTypeId) {
        const offset = this.length;
        if (this.writeValid(this.isValid(value), offset)) {
            this.writeValue(value, offset, childTypeId);
        }
        this.length = offset + 1;
        return this;
    }
    appendChild(child, name = `${this.children.length}`) {
        const childIndex = this.children.push(child);
        const { type: { children, mode, typeIds } } = this;
        const fields = [...children, new schema_1.Field(name, child.type)];
        this._type = new type_1.Union(mode, [...typeIds, childIndex], fields);
        return childIndex;
    }
    writeValue(value, offset, typeId) {
        this._getTypeIds(offset)[offset] = typeId;
        return super.writeValue(value, offset);
    }
    _updateBytesUsed(offset, length) {
        this._bytesUsed += 1;
        return super._updateBytesUsed(offset, length);
    }
}
exports.UnionBuilder = UnionBuilder;
class SparseUnionBuilder extends UnionBuilder {
}
exports.SparseUnionBuilder = SparseUnionBuilder;
class DenseUnionBuilder extends UnionBuilder {
    constructor(options) {
        super(options);
        this.valueOffsets = new Int32Array(0);
    }
    writeValue(value, offset, childTypeId) {
        const valueOffsets = this._getValueOffsets(offset);
        valueOffsets[offset] = this.getChildAt(childTypeId).length;
        return super.writeValue(value, offset, childTypeId);
    }
    _updateBytesUsed(offset, length) {
        this._bytesUsed += 4;
        return super._updateBytesUsed(offset, length);
    }
}
exports.DenseUnionBuilder = DenseUnionBuilder;

//# sourceMappingURL=union.js.map

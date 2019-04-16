import { Field } from '../schema';
import { NestedBuilder } from './base';
import { Union } from '../type';
export class UnionBuilder extends NestedBuilder {
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
        const fields = [...children, new Field(name, child.type)];
        this._type = new Union(mode, [...typeIds, childIndex], fields);
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
export class SparseUnionBuilder extends UnionBuilder {
}
export class DenseUnionBuilder extends UnionBuilder {
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

//# sourceMappingURL=union.mjs.map

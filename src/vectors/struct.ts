import { Vector } from './vector';
import { ValidityVector, ValidityArgs } from './typed';

// export class Struct<T = any> extends Vector<{ [K in keyof T]: T[K] }> {
export class StructVector extends Vector<any[]> {
    protected vectors: Vector<any>[];
    constructor(validity: ValidityArgs, ...vectors: Vector<any>[]) {
        super();
        this.vectors = vectors;
        this.length = Math.max(0, ...vectors.map((v) => v.length));
        validity && (this.validity = ValidityVector.from(validity));
    }
    get(index: number) {
        return this.validity.get(index) ? this.vectors.map((v) => v.get(index)) : null;
    }
    concat(vector: StructVector) {
        return StructVector.from(this,
            this.length + vector.length,
            this.validity.concat(vector.validity),
            ...this.vectors.map((v, i) => v.concat(vector.vectors[i]))
        );
    }
}

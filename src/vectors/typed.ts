import { Vector } from './vector';
import { flatbuffers } from 'flatbuffers';

import Long = flatbuffers.Long;

export type VArray<T = any> = {
    [k: number]: T; length: number;
    constructor: VArrayCtor<VArray<T>>;
};

export type VArrayCtor<VArray> = {
    readonly prototype: VArray;
    BYTES_PER_ELEMENT?: number;
    new(...args: any[]): VArray;
};

export class VirtualVector<T, TArrayType = VArray<T>> extends Vector<T> {
    protected lists: TArrayType[];
    public arrayType: VArrayCtor<TArrayType>;
    constructor(...lists: TArrayType[]) {
        super();
        this.lists = lists.filter(Boolean);
    }
    get(index: number, batch?: number) {
        /* inlined `findVirtual` impl */
        let rows, local = index;
        let lists = this.lists, length;
        let rowsIndex = (batch || 0) - 1;
        while ((rows = lists[++rowsIndex]) &&
               ((length = rows.length) <= local) &&
               ((local -= length) >= 0)) {/*whee*/}
        return (rows && local > -1) ? rows[local] : null;
    }
    range(from: number, total: number, batch?: number) {
        /* inlined `findVirtual` impl */
        let rows, length, local = from;
        let { lists, arrayType } = this;
        let rowsIndex = (batch || 0) - 1;
        while ((rows = lists[++rowsIndex]) &&
               ((length = rows.length) <= local) &&
               ((local -= length) >= 0)) {/*whee*/}
        if (rows && local > -1) {
            let index = 0, listsLength = lists.length;
            let set: any = Array.isArray(rows) ? arraySet : typedArraySet;
            let slice = arrayType['prototype']['subarray'] || arrayType['prototype']['slice'];
            let target = new arrayType(total), source = slice.call(rows, local, local + total);
            while ((index = set(source, target, index)) < total) {
                rows = lists[rowsIndex = ((rowsIndex + 1) % listsLength)];
                source = slice.call(rows, 0, Math.min(rows.length, total - index));
            }
            return target as any;
        }
        return new arrayType(0);
    }
    *[Symbol.iterator]() {
        let { lists } = this;
        for (let i = -1, n = lists.length; ++i < n;) {
            let list = lists[i] as any;
            for (let j = -1, k = list.length; ++j < k;) {
                yield list[j];
            }
        }
    }
}

export type ValidityArgs = Vector<boolean> | Uint8Array;
export class ValidityVector extends VirtualVector<boolean, Uint8Array> {
    static constant: Vector<boolean> = new (class ValidVector extends Vector<boolean> {
        get() { return true; }
        *[Symbol.iterator]() {
            do { yield true; } while (true);
        }
    })();
    static from(src: any) {
        return src instanceof ValidityVector   ? src
             : src === ValidityVector.constant ? src
             : src instanceof Uint8Array       ? new ValidityVector(src)
             : src instanceof Array            ? new ValidityVector(ValidityVector.pack(src))
             : src instanceof Vector           ? new ValidityVector(ValidityVector.pack(src))
                                               : ValidityVector.constant as Vector<any>;
    }
    static pack(values: Iterable<any>) {
        let xs = [], i = 0;
        let bit = 0, byte = 0;
        for (const value of values) {
            !!value && (byte |= 1 << bit);
            if (++bit === 8) {
                xs[i++] = byte;
                byte = bit = 0;
            }
        }
        return new Uint8Array(xs);
    }
    constructor(...lists: Uint8Array[]) {
        super(...lists);
        this.length = this.lists.reduce((l, xs) => l + xs['length'], 0);
    }
    get(index: number, batch?: number) {
        /* inlined `findVirtual` impl */
        let rows, local = index;
        let lists = this.lists, length;
        let rowsIndex = (batch || 0) - 1;
        while ((rows = lists[++rowsIndex]) &&
               ((length = rows.length) <= local) &&
               ((local -= length) >= 0)) {/*whee*/}
        return !(!rows || local < 0 || (rows[local >> 3 | 0] & 1 << local % 8) === 0);
    }
    concat(vector: ValidityVector) {
        return new ValidityVector(...this.lists, ...vector.lists);
    }
    *[Symbol.iterator]() {
        for (const byte of super[Symbol.iterator]()) {
            for (let i = -1; ++i < 8;) {
                yield (byte & 1 << i) !== 0;
            }
        }
    }
}

export class TypedVector<T, TArrayType> extends VirtualVector<T, TArrayType> {
    constructor(validity: ValidityArgs, ...lists: TArrayType[]) {
        super(...lists);
        validity && (this.validity = ValidityVector.from(validity));
    }
    concat(vector: TypedVector<T, TArrayType>) {
        return (this.constructor as typeof TypedVector).from(this,
            this.length + vector.length,
            this.validity.concat(vector.validity),
            ...this.lists, ...vector.lists
        );
    }
}

export class ByteVector<TList> extends TypedVector<number, TList> {
    get(index: number) {
        return this.validity.get(index) ? super.get(index) : null;
    }
}

export class IndexVector extends TypedVector<number, Int32Array> {
    get(index: number, batch?: number) {
        /* inlined `findVirtual` impl */
        let rows, local = index;
        let lists = this.lists, length;
        let rowsIndex = (batch || 0) - 1;
        while ((rows = lists[++rowsIndex]) &&
               ((length = rows.length) <= local) &&
               ((local -= length) >= 0)) {/*whee*/}
        return (rows && local > -1) ? [rows[local + rowsIndex], rowsIndex] : [-1, 0, -1];
    }
    *[Symbol.iterator]() {
        let { lists } = this;
        for (let i = -1, n = lists.length; ++i < n;) {
            let list = lists[i] as any;
            for (let j = -1, k = list.length; ++j < k;) {
                yield [list[j], i];
            }
        }
    }
}

export class LongVector<TList> extends TypedVector<Long, TList> {
    get(index: number) {
        return !this.validity.get(index) ? null : new Long(
            <any> super.get(index * 2),     /* low */
            <any> super.get(index * 2 + 1) /* high */
        );
    }
    *[Symbol.iterator]() {
        let v, low, high;
        let it = super[Symbol.iterator]();
        let iv = this.validity[Symbol.iterator]();
        while (!(v = iv.next()).done && !(low = it.next()).done && !(high = it.next()).done) {
            yield !v.value ? null : new Long(low.value, high.value);
        }
    }
}

export class DateVector extends TypedVector<Date, Uint32Array> {
    get(index: number) {
        return !this.validity.get(index) ? null : new Date(
            Math.pow(2, 32) * super.get(2 * ++index) + super.get(2 * --index)
        );
    }
    *[Symbol.iterator]() {
        let v, low, high;
        let it = super[Symbol.iterator]();
        let iv = this.validity[Symbol.iterator]();
        while (!(v = iv.next()).done && !(low = it.next()).done && !(high = it.next()).done) {
            yield !v.value ? null : new Date(Math.pow(2, 32) * high.value + low.value);
        }
    }
}

export class Int8Vector    extends ByteVector<Int8Array>    {}
export class Int16Vector   extends ByteVector<Int16Array>   {}
export class Int32Vector   extends ByteVector<Int32Array>   {}
export class Int64Vector   extends LongVector<Int32Array>   {}
export class Uint8Vector   extends ByteVector<Uint8Array>   {}
export class Uint16Vector  extends ByteVector<Uint16Array>  {}
export class Uint32Vector  extends ByteVector<Uint32Array>  {}
export class Uint64Vector  extends LongVector<Uint32Array>  {}
export class Float32Vector extends ByteVector<Float32Array> {}
export class Float64Vector extends ByteVector<Float64Array> {}

(Vector.prototype as any).lists = [];
(Vector.prototype as any).validity = ValidityVector.constant;
VirtualVector.prototype.arrayType = Array;
Int8Vector.prototype.arrayType = Int8Array;
Int16Vector.prototype.arrayType = Int16Array;
Int32Vector.prototype.arrayType = Int32Array;
Int64Vector.prototype.arrayType = Int32Array;
Uint8Vector.prototype.arrayType = Uint8Array;
Uint16Vector.prototype.arrayType = Uint16Array;
Uint32Vector.prototype.arrayType = Uint32Array;
Uint64Vector.prototype.arrayType = Uint32Array;
DateVector.prototype.arrayType = Uint32Array;
IndexVector.prototype.arrayType = Int32Array;
Float32Vector.prototype.arrayType = Float32Array;
Float64Vector.prototype.arrayType = Float64Array;

function arraySet<T>(source: Array<T>, target: Array<T>, index: number) {
    for (let i = 0, n = source.length; i < n;) {
        target[index++] = source[i++];
    }
    return index;
}

function typedArraySet(source: TypedArray, target: TypedArray, index: number) {
    return target.set(source, index) || index + source.length;
}

// Rather than eat the iterator cost, we've inlined this function into the relevant `get` functions
// function* findVirtual<TList>(index: number, lists: TList[], batch?: number) {
//     let rows, local = index, length;
//     let rowsIndex = (batch || 0) - 1;
//     while ((rows = lists[++rowsIndex]) &&
//            ((length = rows.length) <= local) &&
//            ((local -= length) >= 0)) {/*whee*/}
//     return (rows && local > -1) ? yield [rows, local, rowsIndex] : null;
// }

export type TypedArrayCtor<T extends TypedArray> = {
    readonly prototype: T;
    readonly BYTES_PER_ELEMENT: number;
    new(length: number): T;
    new(array: ArrayLike<number>): T;
    new(buffer: ArrayBufferLike, byteOffset?: number, length?: number): T;
};

export type FloatArray = Float32Array | Float64Array;
export type IntArray = Int8Array | Int16Array | Int32Array | Uint8ClampedArray | Uint8Array | Uint16Array | Uint32Array;

export type TypedArray = (
            Int8Array        |
            Uint8Array       |
            Int16Array       |
            Int32Array       |
            Uint16Array      |
            Uint32Array      |
            Float32Array     |
            Float64Array     |
            Uint8ClampedArray);

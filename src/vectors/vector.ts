import * as Schema_ from '../format/Schema';
export import Type = Schema_.org.apache.arrow.flatbuf.Type;
export import Field = Schema_.org.apache.arrow.flatbuf.Field;

function sliceToRangeArgs(length: number, start: number, end?: number) {
    let from = start || 0, to = typeof end == 'number' ? end : length;
    if (to < from) { from = to; to = start; }
    if (to < 0) { to = length + Math.abs(to); }
    if (from < 0) { from = length - (from * -1) % length; }
    length = !isFinite(length = (to - from)) || length < 0 ? 0 : length;
    return [from, length];
}

export class Vector<T> implements Iterable<T> {
    static defaultName = '';
    static defaultProps = new Map();
    static defaultType = Type[Type.NONE];
    static create<T = any>(field: Field, length: number, ...args: any[]) {
        let vector = new this<T>(...args), m;
        vector.length = length;
        vector.name = field.name();
        vector.type = Type[field.typeType()];
        if ((m = field.customMetadataLength()) > 0) {
            let entry, i = 0, data = vector.props = new Map();
            do {
                entry = field.customMetadata(i);
                data[entry.key()] = entry.value();
            } while (++i < m);
        }
        return vector;
    }
    static from<T = any>(source: Vector<T>, length: number, ...args: any[]) {
        let vector = new this<T>(...args);
        vector.length = length;
        source.name !== Vector.defaultName && (vector.name = source.name);
        source.type !== Vector.defaultType && (vector.type = source.type);
        source.props !== Vector.defaultProps && (vector.props = source.props);
        return vector;
    }
    public name: string;
    public type: string;
    public length: number;
    public props: Map<PropertyKey, any>;
    protected validity: Vector<boolean>;
    get(index: number): T { return null; }
    concat(vector: Vector<T>) { return vector; }
    slice<R = T>(start?: number, end?: number, batch?: number) {
        const [offset, length] = sliceToRangeArgs(this.length, start || 0, end);
        return this.range<R>(offset, length, batch);
    }
    range<R = T>(offset: number, length: number, batch?: number) {
        const result = new Array<R>(length);
        for (let i = -1, n = this.length; ++i < length;) {
            result[i] = this.get((i + offset) % n) as any;
        }
        return result as Iterable<R>;
    }
    *[Symbol.iterator]() {
        for (let i = -1, n = this.length; ++i < n;) {
            yield this.get(i);
        }
    }
}

Vector.prototype.length = 0;
Vector.prototype.name = Vector.defaultName;
Vector.prototype.type = Vector.defaultType;
Vector.prototype.props = Vector.defaultProps;

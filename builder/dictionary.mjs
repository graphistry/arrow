import { Vector } from '../vector';
import { Builder } from './base';
export class DictionaryBuilder extends Builder {
    constructor(options) {
        super(options);
        this.hashmap = Object.create(null);
        const { type, nullValues } = options;
        this._hash = options.dictionaryHashFunction || defaultHashFunction;
        this.indices = Builder.new({ type: type.indices, nullValues });
        this.dictionary = Builder.new({ type: type.dictionary, nullValues: [] });
    }
    get values() { return this.indices && this.indices.values; }
    get nullBitmap() { return this.indices && this.indices.nullBitmap; }
    set values(values) { this.indices && (this.indices.values = values); }
    set nullBitmap(nullBitmap) { this.indices && (this.indices.nullBitmap = nullBitmap); }
    setHashFunction(hash) {
        this._hash = hash;
        return this;
    }
    reset() {
        this.length = 0;
        this.indices.reset();
        this.dictionary.reset();
        return this;
    }
    flush() {
        const indices = this.indices;
        const data = indices.flush().clone(this.type);
        this.length = indices.length;
        return data;
    }
    finish() {
        this.type.dictionaryVector = Vector.new(this.dictionary.finish().flush());
        return super.finish();
    }
    write(value) {
        this.indices.length = super.write(value).length;
        return this;
    }
    writeValid(isValid, index) {
        return this.indices.writeValid(isValid, index);
    }
    writeValue(value, index) {
        let id = this._hash(value);
        let hashmap = this.hashmap;
        if (hashmap[id] === undefined) {
            hashmap[id] = this.dictionary.write(value).length - 1;
        }
        return this.indices.writeValue(hashmap[id], index);
    }
    *readAll(source, chunkLength = Infinity) {
        const chunks = [];
        for (const chunk of super.readAll(source, chunkLength)) {
            chunks.push(chunk);
        }
        yield* chunks;
    }
    async *readAllAsync(source, chunkLength = Infinity) {
        const chunks = [];
        for await (const chunk of super.readAllAsync(source, chunkLength)) {
            chunks.push(chunk);
        }
        yield* chunks;
    }
}
function defaultHashFunction(val) {
    typeof val === 'string' || (val = `${val}`);
    let h = 6, y = 9 * 9, i = val.length;
    while (i > 0) {
        h = Math.imul(h ^ val.charCodeAt(--i), y);
    }
    return (h ^ h >>> 9);
}

//# sourceMappingURL=dictionary.mjs.map

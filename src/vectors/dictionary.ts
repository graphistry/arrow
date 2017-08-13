import { Vector } from './vector';

export class DictionaryVector<T> extends Vector<T> {
    protected index: Vector<number>;
    protected dictionary: Vector<T>;
    constructor(index: Vector<number>, dictionary: Vector<T>) {
        super();
        this.index = index;
        this.dictionary = dictionary;
        this.length = index && index.length || 0;
    }
    get(index: number) {
        return this.dictionary.get(this.index.get(index));
    }
    concat(vector: DictionaryVector<T>) {
        return DictionaryVector.from(this,
            this.length + vector.length,
            this.index.concat(vector.index),
            this.dictionary
        );
    }
    *[Symbol.iterator]() {
        let { index, dictionary } = this;
        for (const loc of index) {
            yield dictionary.get(loc);
        }
    }
}
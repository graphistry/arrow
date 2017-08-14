import { Vector } from './vectors/vector';
import { readBuffers } from './reader/arrow';

export class Table implements Iterable<Vector<any>> {
    public length: number;
    protected columns: Vector<any>[];
    protected columnsMap: { [k: string]: Vector<any> };
    static from(...bytes: Array<Uint8Array | Buffer | string>) {
        let columns: Vector<any>[];
        for (let vectors of readBuffers(...bytes)) {
            columns = !columns ? vectors : columns.map((v, i) => v.concat(vectors[i]));
        }
        return new Table(columns);
    }
    constructor(columns: Vector<any>[]) {
        this.columns = columns || [];
        this.length = Math.max(...this.columns.map((v) => v.length));
        this.columnsMap = this.columns.reduce((map, vec) => {
            return (map[vec.name] = vec) && map || map;
        }, <any> {});
    }
    *[Symbol.iterator]() {
        for (const vector of this.columns) {
            yield vector;
        }
    }
    vector<T = any>(index: number) { return this.columns[index] as Vector<T>; }
    select<T = any>(name: string) { return this.columnsMap[name] as Vector<T>; }
    concat(table: Table) {
        return new Table(
            this.columns.map((vector, i) =>
                vector.concat(table.columns[i])));
    }
}

Table.prototype.length = 0;
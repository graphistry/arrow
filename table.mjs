// Licensed to the Apache Software Foundation (ASF) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The ASF licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.
import * as tslib_1 from "tslib";
import { RecordBatch } from './recordbatch';
import { Col } from './predicate';
import { Schema, Field } from './type';
import { read, readAsync } from './ipc/reader/arrow';
import { writeTableBinary } from './ipc/writer/arrow';
import { PipeIterator } from './util/node';
import { isPromise, isAsyncIterable } from './util/compat';
import { DictionaryVector, IntVector } from './vector';
import { ChunkedView } from './vector/chunked';
export class Table {
    constructor(...args) {
        // List of inner Vectors, possibly spanning batches
        this._columns = [];
        let schema = null;
        if (args[0] instanceof Schema) {
            schema = args.shift();
        }
        let batches = args.reduce(function flatten(xs, x) {
            return Array.isArray(x) ? x.reduce(flatten, xs) : [...xs, x];
        }, []).filter((x) => x instanceof RecordBatch);
        if (!schema && !(schema = batches[0] && batches[0].schema)) {
            throw new TypeError('Table must be initialized with a Schema or at least one RecordBatch with a Schema');
        }
        this.schema = schema;
        this.batches = batches;
        this.batchesUnion = batches.length == 0 ?
            new RecordBatch(schema, 0, []) :
            batches.reduce((union, batch) => union.concat(batch));
        this.length = this.batchesUnion.length;
        this.numCols = this.batchesUnion.numCols;
    }
    static empty() { return new Table(new Schema([]), []); }
    static from(sources) {
        if (sources) {
            let schema;
            let recordBatches = [];
            for (let recordBatch of read(sources)) {
                schema = schema || recordBatch.schema;
                recordBatches.push(recordBatch);
            }
            return new Table(schema || new Schema([]), recordBatches);
        }
        return Table.empty();
    }
    static fromAsync(sources) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            var e_1, _a;
            if (isAsyncIterable(sources)) {
                let schema;
                let recordBatches = [];
                try {
                    for (var _b = tslib_1.__asyncValues(readAsync(sources)), _c; _c = yield _b.next(), !_c.done;) {
                        let recordBatch = _c.value;
                        schema = schema || recordBatch.schema;
                        recordBatches.push(recordBatch);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) yield _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                return new Table(schema || new Schema([]), recordBatches);
            }
            else if (isPromise(sources)) {
                return Table.from(yield sources);
            }
            else if (sources) {
                return Table.from(sources);
            }
            return Table.empty();
        });
    }
    static fromStruct(struct) {
        const schema = new Schema(struct.type.children);
        const chunks = struct.view instanceof ChunkedView ?
            struct.view.chunkVectors :
            [struct];
        return new Table(chunks.map((chunk) => new RecordBatch(schema, chunk.length, chunk.view.childData)));
    }
    get(index) {
        return this.batchesUnion.get(index);
    }
    getColumn(name) {
        return this.getColumnAt(this.getColumnIndex(name));
    }
    getColumnAt(index) {
        return index < 0 || index >= this.numCols
            ? null
            : this._columns[index] || (this._columns[index] = this.batchesUnion.getChildAt(index));
    }
    getColumnIndex(name) {
        return this.schema.fields.findIndex((f) => f.name === name);
    }
    [Symbol.iterator]() {
        return this.batchesUnion[Symbol.iterator]();
    }
    filter(predicate) {
        return new FilteredDataFrame(this.batches, predicate);
    }
    scan(next, bind) {
        const batches = this.batches, numBatches = batches.length;
        for (let batchIndex = -1; ++batchIndex < numBatches;) {
            // load batches
            const batch = batches[batchIndex];
            if (bind) {
                bind(batch);
            }
            // yield all indices
            for (let index = -1, numRows = batch.length; ++index < numRows;) {
                next(index, batch);
            }
        }
    }
    countBy(name) {
        const batches = this.batches, numBatches = batches.length;
        const count_by = typeof name === 'string' ? new Col(name) : name;
        // Assume that all dictionary batches are deltas, which means that the
        // last record batch has the most complete dictionary
        count_by.bind(batches[numBatches - 1]);
        const vector = count_by.vector;
        if (!(vector instanceof DictionaryVector)) {
            throw new Error('countBy currently only supports dictionary-encoded columns');
        }
        // TODO: Adjust array byte width based on overall length
        // (e.g. if this.length <= 255 use Uint8Array, etc...)
        const counts = new Uint32Array(vector.dictionary.length);
        for (let batchIndex = -1; ++batchIndex < numBatches;) {
            // load batches
            const batch = batches[batchIndex];
            // rebind the countBy Col
            count_by.bind(batch);
            const keys = count_by.vector.indices;
            // yield all indices
            for (let index = -1, numRows = batch.length; ++index < numRows;) {
                let key = keys.get(index);
                if (key !== null) {
                    counts[key]++;
                }
            }
        }
        return new CountByResult(vector.dictionary, IntVector.from(counts));
    }
    count() {
        return this.length;
    }
    select(...columnNames) {
        return new Table(this.batches.map((batch) => batch.select(...columnNames)));
    }
    toString(separator) {
        let str = '';
        for (const row of this.rowsToString(separator)) {
            str += row + '\n';
        }
        return str;
    }
    // @ts-ignore
    serialize(encoding = 'binary', stream = true) {
        return writeTableBinary(this, stream);
    }
    rowsToString(separator = ' | ') {
        return new PipeIterator(tableRowsToString(this, separator), 'utf8');
    }
}
class FilteredDataFrame {
    constructor(batches, predicate) {
        this.batches = batches;
        this.predicate = predicate;
    }
    scan(next, bind) {
        // inlined version of this:
        // this.parent.scan((idx, columns) => {
        //     if (this.predicate(idx, columns)) next(idx, columns);
        // });
        const batches = this.batches;
        const numBatches = batches.length;
        for (let batchIndex = -1; ++batchIndex < numBatches;) {
            // load batches
            const batch = batches[batchIndex];
            // TODO: bind batches lazily
            // If predicate doesn't match anything in the batch we don't need
            // to bind the callback
            if (bind) {
                bind(batch);
            }
            const predicate = this.predicate.bind(batch);
            // yield all indices
            for (let index = -1, numRows = batch.length; ++index < numRows;) {
                if (predicate(index, batch)) {
                    next(index, batch);
                }
            }
        }
    }
    count() {
        // inlined version of this:
        // let sum = 0;
        // this.parent.scan((idx, columns) => {
        //     if (this.predicate(idx, columns)) ++sum;
        // });
        // return sum;
        let sum = 0;
        const batches = this.batches;
        const numBatches = batches.length;
        for (let batchIndex = -1; ++batchIndex < numBatches;) {
            // load batches
            const batch = batches[batchIndex];
            const predicate = this.predicate.bind(batch);
            // yield all indices
            for (let index = -1, numRows = batch.length; ++index < numRows;) {
                if (predicate(index, batch)) {
                    ++sum;
                }
            }
        }
        return sum;
    }
    *[Symbol.iterator]() {
        // inlined version of this:
        // this.parent.scan((idx, columns) => {
        //     if (this.predicate(idx, columns)) next(idx, columns);
        // });
        const batches = this.batches;
        const numBatches = batches.length;
        for (let batchIndex = -1; ++batchIndex < numBatches;) {
            // load batches
            const batch = batches[batchIndex];
            // TODO: bind batches lazily
            // If predicate doesn't match anything in the batch we don't need
            // to bind the callback
            const predicate = this.predicate.bind(batch);
            // yield all indices
            for (let index = -1, numRows = batch.length; ++index < numRows;) {
                if (predicate(index, batch)) {
                    yield batch.get(index);
                }
            }
        }
    }
    filter(predicate) {
        return new FilteredDataFrame(this.batches, this.predicate.and(predicate));
    }
    countBy(name) {
        const batches = this.batches, numBatches = batches.length;
        const count_by = typeof name === 'string' ? new Col(name) : name;
        // Assume that all dictionary batches are deltas, which means that the
        // last record batch has the most complete dictionary
        count_by.bind(batches[numBatches - 1]);
        const vector = count_by.vector;
        if (!(vector instanceof DictionaryVector)) {
            throw new Error('countBy currently only supports dictionary-encoded columns');
        }
        // TODO: Adjust array byte width based on overall length
        // (e.g. if this.length <= 255 use Uint8Array, etc...)
        const counts = new Uint32Array(vector.dictionary.length);
        for (let batchIndex = -1; ++batchIndex < numBatches;) {
            // load batches
            const batch = batches[batchIndex];
            const predicate = this.predicate.bind(batch);
            // rebind the countBy Col
            count_by.bind(batch);
            const keys = count_by.vector.indices;
            // yield all indices
            for (let index = -1, numRows = batch.length; ++index < numRows;) {
                let key = keys.get(index);
                if (key !== null && predicate(index, batch)) {
                    counts[key]++;
                }
            }
        }
        return new CountByResult(vector.dictionary, IntVector.from(counts));
    }
}
export class CountByResult extends Table {
    constructor(values, counts) {
        super(new RecordBatch(new Schema([
            new Field('values', values.type),
            new Field('counts', counts.type)
        ]), counts.length, [values, counts]));
    }
    toJSON() {
        const values = this.getColumnAt(0);
        const counts = this.getColumnAt(1);
        const result = {};
        for (let i = -1; ++i < this.length;) {
            result[values.get(i)] = counts.get(i);
        }
        return result;
    }
}
function* tableRowsToString(table, separator = ' | ') {
    let rowOffset = 0;
    let firstValues = [];
    let maxColumnWidths = [];
    let iterators = [];
    // Gather all the `rowsToString` iterators into a list before iterating,
    // so that `maxColumnWidths` is filled with the maxWidth for each column
    // across all RecordBatches.
    for (const batch of table.batches) {
        const iterator = batch.rowsToString(separator, rowOffset, maxColumnWidths);
        const { done, value } = iterator.next();
        if (!done) {
            firstValues.push(value);
            iterators.push(iterator);
            rowOffset += batch.length;
        }
    }
    for (const iterator of iterators) {
        yield firstValues.shift();
        yield* iterator;
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LFFBQVEsSUFBSSxTQUFTLEVBQUU7UUFDOUIsTUFBTSxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDMUIsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDO0tBQ25CO0FBQ0wsQ0FBQyIsImZpbGUiOiJ0YWJsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBSZWNvcmRCYXRjaCB9IGZyb20gJy4vcmVjb3JkYmF0Y2gnO1xuaW1wb3J0IHsgQ29sLCBQcmVkaWNhdGUgfSBmcm9tICcuL3ByZWRpY2F0ZSc7XG5pbXBvcnQgeyBTY2hlbWEsIEZpZWxkLCBTdHJ1Y3QgfSBmcm9tICcuL3R5cGUnO1xuaW1wb3J0IHsgcmVhZCwgcmVhZEFzeW5jIH0gZnJvbSAnLi9pcGMvcmVhZGVyL2Fycm93JztcbmltcG9ydCB7IHdyaXRlVGFibGVCaW5hcnkgfSBmcm9tICcuL2lwYy93cml0ZXIvYXJyb3cnO1xuaW1wb3J0IHsgUGlwZUl0ZXJhdG9yIH0gZnJvbSAnLi91dGlsL25vZGUnO1xuaW1wb3J0IHsgaXNQcm9taXNlLCBpc0FzeW5jSXRlcmFibGUgfSBmcm9tICcuL3V0aWwvY29tcGF0JztcbmltcG9ydCB7IFZlY3RvciwgRGljdGlvbmFyeVZlY3RvciwgSW50VmVjdG9yLCBTdHJ1Y3RWZWN0b3IgfSBmcm9tICcuL3ZlY3Rvcic7XG5pbXBvcnQgeyBDaHVua2VkVmlldyB9IGZyb20gJy4vdmVjdG9yL2NodW5rZWQnO1xuXG5leHBvcnQgdHlwZSBOZXh0RnVuYyA9IChpZHg6IG51bWJlciwgYmF0Y2g6IFJlY29yZEJhdGNoKSA9PiB2b2lkO1xuZXhwb3J0IHR5cGUgQmluZEZ1bmMgPSAoYmF0Y2g6IFJlY29yZEJhdGNoKSA9PiB2b2lkO1xuXG5leHBvcnQgaW50ZXJmYWNlIERhdGFGcmFtZSB7XG4gICAgY291bnQoKTogbnVtYmVyO1xuICAgIGZpbHRlcihwcmVkaWNhdGU6IFByZWRpY2F0ZSk6IERhdGFGcmFtZTtcbiAgICBzY2FuKG5leHQ6IE5leHRGdW5jLCBiaW5kPzogQmluZEZ1bmMpOiB2b2lkO1xuICAgIGNvdW50QnkoY29sOiAoQ29sfHN0cmluZykpOiBDb3VudEJ5UmVzdWx0O1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8U3RydWN0WydUVmFsdWUnXT47XG59XG5cbmV4cG9ydCBjbGFzcyBUYWJsZSBpbXBsZW1lbnRzIERhdGFGcmFtZSB7XG4gICAgc3RhdGljIGVtcHR5KCkgeyByZXR1cm4gbmV3IFRhYmxlKG5ldyBTY2hlbWEoW10pLCBbXSk7IH1cbiAgICBzdGF0aWMgZnJvbShzb3VyY2VzPzogSXRlcmFibGU8VWludDhBcnJheSB8IEJ1ZmZlciB8IHN0cmluZz4gfCBvYmplY3QgfCBzdHJpbmcpIHtcbiAgICAgICAgaWYgKHNvdXJjZXMpIHtcbiAgICAgICAgICAgIGxldCBzY2hlbWE6IFNjaGVtYSB8IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGxldCByZWNvcmRCYXRjaGVzOiBSZWNvcmRCYXRjaFtdID0gW107XG4gICAgICAgICAgICBmb3IgKGxldCByZWNvcmRCYXRjaCBvZiByZWFkKHNvdXJjZXMpKSB7XG4gICAgICAgICAgICAgICAgc2NoZW1hID0gc2NoZW1hIHx8IHJlY29yZEJhdGNoLnNjaGVtYTtcbiAgICAgICAgICAgICAgICByZWNvcmRCYXRjaGVzLnB1c2gocmVjb3JkQmF0Y2gpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG5ldyBUYWJsZShzY2hlbWEgfHwgbmV3IFNjaGVtYShbXSksIHJlY29yZEJhdGNoZXMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBUYWJsZS5lbXB0eSgpO1xuICAgIH1cbiAgICBzdGF0aWMgYXN5bmMgZnJvbUFzeW5jKHNvdXJjZXM/OiBBc3luY0l0ZXJhYmxlPFVpbnQ4QXJyYXkgfCBCdWZmZXIgfCBzdHJpbmc+KSB7XG4gICAgICAgIGlmIChpc0FzeW5jSXRlcmFibGUoc291cmNlcykpIHtcbiAgICAgICAgICAgIGxldCBzY2hlbWE6IFNjaGVtYSB8IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGxldCByZWNvcmRCYXRjaGVzOiBSZWNvcmRCYXRjaFtdID0gW107XG4gICAgICAgICAgICBmb3IgYXdhaXQgKGxldCByZWNvcmRCYXRjaCBvZiByZWFkQXN5bmMoc291cmNlcykpIHtcbiAgICAgICAgICAgICAgICBzY2hlbWEgPSBzY2hlbWEgfHwgcmVjb3JkQmF0Y2guc2NoZW1hO1xuICAgICAgICAgICAgICAgIHJlY29yZEJhdGNoZXMucHVzaChyZWNvcmRCYXRjaCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbmV3IFRhYmxlKHNjaGVtYSB8fCBuZXcgU2NoZW1hKFtdKSwgcmVjb3JkQmF0Y2hlcyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNQcm9taXNlKHNvdXJjZXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gVGFibGUuZnJvbShhd2FpdCBzb3VyY2VzKTtcbiAgICAgICAgfSBlbHNlIGlmIChzb3VyY2VzKSB7XG4gICAgICAgICAgICByZXR1cm4gVGFibGUuZnJvbShzb3VyY2VzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gVGFibGUuZW1wdHkoKTtcbiAgICB9XG4gICAgc3RhdGljIGZyb21TdHJ1Y3Qoc3RydWN0OiBTdHJ1Y3RWZWN0b3IpIHtcbiAgICAgICAgY29uc3Qgc2NoZW1hID0gbmV3IFNjaGVtYShzdHJ1Y3QudHlwZS5jaGlsZHJlbik7XG4gICAgICAgIGNvbnN0IGNodW5rcyA9IHN0cnVjdC52aWV3IGluc3RhbmNlb2YgQ2h1bmtlZFZpZXcgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChzdHJ1Y3Qudmlldy5jaHVua1ZlY3RvcnMgYXMgU3RydWN0VmVjdG9yW10pIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBbc3RydWN0XTtcbiAgICAgICAgcmV0dXJuIG5ldyBUYWJsZShjaHVua3MubWFwKChjaHVuaykgPT4gbmV3IFJlY29yZEJhdGNoKHNjaGVtYSwgY2h1bmsubGVuZ3RoLCBjaHVuay52aWV3LmNoaWxkRGF0YSkpKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgcmVhZG9ubHkgc2NoZW1hOiBTY2hlbWE7XG4gICAgcHVibGljIHJlYWRvbmx5IGxlbmd0aDogbnVtYmVyO1xuICAgIHB1YmxpYyByZWFkb25seSBudW1Db2xzOiBudW1iZXI7XG4gICAgLy8gTGlzdCBvZiBpbm5lciBSZWNvcmRCYXRjaGVzXG4gICAgcHVibGljIHJlYWRvbmx5IGJhdGNoZXM6IFJlY29yZEJhdGNoW107XG4gICAgLy8gTGlzdCBvZiBpbm5lciBWZWN0b3JzLCBwb3NzaWJseSBzcGFubmluZyBiYXRjaGVzXG4gICAgcHJvdGVjdGVkIHJlYWRvbmx5IF9jb2x1bW5zOiBWZWN0b3I8YW55PltdID0gW107XG4gICAgLy8gVW5pb24gb2YgYWxsIGlubmVyIFJlY29yZEJhdGNoZXMgaW50byBvbmUgUmVjb3JkQmF0Y2gsIHBvc3NpYmx5IGNodW5rZWQuXG4gICAgLy8gSWYgdGhlIFRhYmxlIGhhcyBqdXN0IG9uZSBpbm5lciBSZWNvcmRCYXRjaCwgdGhpcyBwb2ludHMgdG8gdGhhdC5cbiAgICAvLyBJZiB0aGUgVGFibGUgaGFzIG11bHRpcGxlIGlubmVyIFJlY29yZEJhdGNoZXMsIHRoZW4gdGhpcyBpcyBhIENodW5rZWQgdmlld1xuICAgIC8vIG92ZXIgdGhlIGxpc3Qgb2YgUmVjb3JkQmF0Y2hlcy4gVGhpcyBhbGxvd3MgdXMgdG8gZGVsZWdhdGUgdGhlIHJlc3BvbnNpYmlsaXR5XG4gICAgLy8gb2YgaW5kZXhpbmcsIGl0ZXJhdGluZywgc2xpY2luZywgYW5kIHZpc2l0aW5nIHRvIHRoZSBOZXN0ZWQvQ2h1bmtlZCBEYXRhL1ZpZXdzLlxuICAgIHB1YmxpYyByZWFkb25seSBiYXRjaGVzVW5pb246IFJlY29yZEJhdGNoO1xuXG4gICAgY29uc3RydWN0b3IoYmF0Y2hlczogUmVjb3JkQmF0Y2hbXSk7XG4gICAgY29uc3RydWN0b3IoLi4uYmF0Y2hlczogUmVjb3JkQmF0Y2hbXSk7XG4gICAgY29uc3RydWN0b3Ioc2NoZW1hOiBTY2hlbWEsIGJhdGNoZXM6IFJlY29yZEJhdGNoW10pO1xuICAgIGNvbnN0cnVjdG9yKHNjaGVtYTogU2NoZW1hLCAuLi5iYXRjaGVzOiBSZWNvcmRCYXRjaFtdKTtcbiAgICBjb25zdHJ1Y3RvciguLi5hcmdzOiBhbnlbXSkge1xuXG4gICAgICAgIGxldCBzY2hlbWE6IFNjaGVtYSA9IG51bGwhO1xuXG4gICAgICAgIGlmIChhcmdzWzBdIGluc3RhbmNlb2YgU2NoZW1hKSB7XG4gICAgICAgICAgICBzY2hlbWEgPSBhcmdzLnNoaWZ0KCk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgYmF0Y2hlcyA9IGFyZ3MucmVkdWNlKGZ1bmN0aW9uIGZsYXR0ZW4oeHM6IGFueVtdLCB4OiBhbnkpOiBhbnlbXSB7XG4gICAgICAgICAgICByZXR1cm4gQXJyYXkuaXNBcnJheSh4KSA/IHgucmVkdWNlKGZsYXR0ZW4sIHhzKSA6IFsuLi54cywgeF07XG4gICAgICAgIH0sIFtdKS5maWx0ZXIoKHg6IGFueSk6IHggaXMgUmVjb3JkQmF0Y2ggPT4geCBpbnN0YW5jZW9mIFJlY29yZEJhdGNoKTtcblxuICAgICAgICBpZiAoIXNjaGVtYSAmJiAhKHNjaGVtYSA9IGJhdGNoZXNbMF0gJiYgYmF0Y2hlc1swXS5zY2hlbWEpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUYWJsZSBtdXN0IGJlIGluaXRpYWxpemVkIHdpdGggYSBTY2hlbWEgb3IgYXQgbGVhc3Qgb25lIFJlY29yZEJhdGNoIHdpdGggYSBTY2hlbWEnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2NoZW1hID0gc2NoZW1hO1xuICAgICAgICB0aGlzLmJhdGNoZXMgPSBiYXRjaGVzO1xuICAgICAgICB0aGlzLmJhdGNoZXNVbmlvbiA9IGJhdGNoZXMubGVuZ3RoID09IDAgP1xuICAgICAgICAgICAgbmV3IFJlY29yZEJhdGNoKHNjaGVtYSwgMCwgW10pIDpcbiAgICAgICAgICAgIGJhdGNoZXMucmVkdWNlKCh1bmlvbiwgYmF0Y2gpID0+IHVuaW9uLmNvbmNhdChiYXRjaCkpO1xuICAgICAgICB0aGlzLmxlbmd0aCA9IHRoaXMuYmF0Y2hlc1VuaW9uLmxlbmd0aDtcbiAgICAgICAgdGhpcy5udW1Db2xzID0gdGhpcy5iYXRjaGVzVW5pb24ubnVtQ29scztcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0KGluZGV4OiBudW1iZXIpOiBTdHJ1Y3RbJ1RWYWx1ZSddIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYmF0Y2hlc1VuaW9uLmdldChpbmRleCkhO1xuICAgIH1cbiAgICBwdWJsaWMgZ2V0Q29sdW1uKG5hbWU6IHN0cmluZykge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRDb2x1bW5BdCh0aGlzLmdldENvbHVtbkluZGV4KG5hbWUpKTtcbiAgICB9XG4gICAgcHVibGljIGdldENvbHVtbkF0KGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgcmV0dXJuIGluZGV4IDwgMCB8fCBpbmRleCA+PSB0aGlzLm51bUNvbHNcbiAgICAgICAgICAgID8gbnVsbFxuICAgICAgICAgICAgOiB0aGlzLl9jb2x1bW5zW2luZGV4XSB8fCAoXG4gICAgICAgICAgICAgIHRoaXMuX2NvbHVtbnNbaW5kZXhdID0gdGhpcy5iYXRjaGVzVW5pb24uZ2V0Q2hpbGRBdChpbmRleCkhKTtcbiAgICB9XG4gICAgcHVibGljIGdldENvbHVtbkluZGV4KG5hbWU6IHN0cmluZykge1xuICAgICAgICByZXR1cm4gdGhpcy5zY2hlbWEuZmllbGRzLmZpbmRJbmRleCgoZikgPT4gZi5uYW1lID09PSBuYW1lKTtcbiAgICB9XG4gICAgcHVibGljIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8U3RydWN0WydUVmFsdWUnXT4ge1xuICAgICAgICByZXR1cm4gdGhpcy5iYXRjaGVzVW5pb25bU3ltYm9sLml0ZXJhdG9yXSgpIGFzIGFueTtcbiAgICB9XG4gICAgcHVibGljIGZpbHRlcihwcmVkaWNhdGU6IFByZWRpY2F0ZSk6IERhdGFGcmFtZSB7XG4gICAgICAgIHJldHVybiBuZXcgRmlsdGVyZWREYXRhRnJhbWUodGhpcy5iYXRjaGVzLCBwcmVkaWNhdGUpO1xuICAgIH1cbiAgICBwdWJsaWMgc2NhbihuZXh0OiBOZXh0RnVuYywgYmluZD86IEJpbmRGdW5jKSB7XG4gICAgICAgIGNvbnN0IGJhdGNoZXMgPSB0aGlzLmJhdGNoZXMsIG51bUJhdGNoZXMgPSBiYXRjaGVzLmxlbmd0aDtcbiAgICAgICAgZm9yIChsZXQgYmF0Y2hJbmRleCA9IC0xOyArK2JhdGNoSW5kZXggPCBudW1CYXRjaGVzOykge1xuICAgICAgICAgICAgLy8gbG9hZCBiYXRjaGVzXG4gICAgICAgICAgICBjb25zdCBiYXRjaCA9IGJhdGNoZXNbYmF0Y2hJbmRleF07XG4gICAgICAgICAgICBpZiAoYmluZCkgeyBiaW5kKGJhdGNoKTsgfVxuICAgICAgICAgICAgLy8geWllbGQgYWxsIGluZGljZXNcbiAgICAgICAgICAgIGZvciAobGV0IGluZGV4ID0gLTEsIG51bVJvd3MgPSBiYXRjaC5sZW5ndGg7ICsraW5kZXggPCBudW1Sb3dzOykge1xuICAgICAgICAgICAgICAgIG5leHQoaW5kZXgsIGJhdGNoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBwdWJsaWMgY291bnRCeShuYW1lOiBDb2wgfCBzdHJpbmcpOiBDb3VudEJ5UmVzdWx0IHtcbiAgICAgICAgY29uc3QgYmF0Y2hlcyA9IHRoaXMuYmF0Y2hlcywgbnVtQmF0Y2hlcyA9IGJhdGNoZXMubGVuZ3RoO1xuICAgICAgICBjb25zdCBjb3VudF9ieSA9IHR5cGVvZiBuYW1lID09PSAnc3RyaW5nJyA/IG5ldyBDb2wobmFtZSkgOiBuYW1lO1xuICAgICAgICAvLyBBc3N1bWUgdGhhdCBhbGwgZGljdGlvbmFyeSBiYXRjaGVzIGFyZSBkZWx0YXMsIHdoaWNoIG1lYW5zIHRoYXQgdGhlXG4gICAgICAgIC8vIGxhc3QgcmVjb3JkIGJhdGNoIGhhcyB0aGUgbW9zdCBjb21wbGV0ZSBkaWN0aW9uYXJ5XG4gICAgICAgIGNvdW50X2J5LmJpbmQoYmF0Y2hlc1tudW1CYXRjaGVzIC0gMV0pO1xuICAgICAgICBjb25zdCB2ZWN0b3IgPSBjb3VudF9ieS52ZWN0b3IgYXMgRGljdGlvbmFyeVZlY3RvcjtcbiAgICAgICAgaWYgKCEodmVjdG9yIGluc3RhbmNlb2YgRGljdGlvbmFyeVZlY3RvcikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY291bnRCeSBjdXJyZW50bHkgb25seSBzdXBwb3J0cyBkaWN0aW9uYXJ5LWVuY29kZWQgY29sdW1ucycpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRPRE86IEFkanVzdCBhcnJheSBieXRlIHdpZHRoIGJhc2VkIG9uIG92ZXJhbGwgbGVuZ3RoXG4gICAgICAgIC8vIChlLmcuIGlmIHRoaXMubGVuZ3RoIDw9IDI1NSB1c2UgVWludDhBcnJheSwgZXRjLi4uKVxuICAgICAgICBjb25zdCBjb3VudHM6IFVpbnQzMkFycmF5ID0gbmV3IFVpbnQzMkFycmF5KHZlY3Rvci5kaWN0aW9uYXJ5Lmxlbmd0aCk7XG4gICAgICAgIGZvciAobGV0IGJhdGNoSW5kZXggPSAtMTsgKytiYXRjaEluZGV4IDwgbnVtQmF0Y2hlczspIHtcbiAgICAgICAgICAgIC8vIGxvYWQgYmF0Y2hlc1xuICAgICAgICAgICAgY29uc3QgYmF0Y2ggPSBiYXRjaGVzW2JhdGNoSW5kZXhdO1xuICAgICAgICAgICAgLy8gcmViaW5kIHRoZSBjb3VudEJ5IENvbFxuICAgICAgICAgICAgY291bnRfYnkuYmluZChiYXRjaCk7XG4gICAgICAgICAgICBjb25zdCBrZXlzID0gKGNvdW50X2J5LnZlY3RvciBhcyBEaWN0aW9uYXJ5VmVjdG9yKS5pbmRpY2VzO1xuICAgICAgICAgICAgLy8geWllbGQgYWxsIGluZGljZXNcbiAgICAgICAgICAgIGZvciAobGV0IGluZGV4ID0gLTEsIG51bVJvd3MgPSBiYXRjaC5sZW5ndGg7ICsraW5kZXggPCBudW1Sb3dzOykge1xuICAgICAgICAgICAgICAgIGxldCBrZXkgPSBrZXlzLmdldChpbmRleCk7XG4gICAgICAgICAgICAgICAgaWYgKGtleSAhPT0gbnVsbCkgeyBjb3VudHNba2V5XSsrOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBDb3VudEJ5UmVzdWx0KHZlY3Rvci5kaWN0aW9uYXJ5LCBJbnRWZWN0b3IuZnJvbShjb3VudHMpKTtcbiAgICB9XG4gICAgcHVibGljIGNvdW50KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmxlbmd0aDtcbiAgICB9XG4gICAgcHVibGljIHNlbGVjdCguLi5jb2x1bW5OYW1lczogc3RyaW5nW10pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBUYWJsZSh0aGlzLmJhdGNoZXMubWFwKChiYXRjaCkgPT4gYmF0Y2guc2VsZWN0KC4uLmNvbHVtbk5hbWVzKSkpO1xuICAgIH1cbiAgICBwdWJsaWMgdG9TdHJpbmcoc2VwYXJhdG9yPzogc3RyaW5nKSB7XG4gICAgICAgIGxldCBzdHIgPSAnJztcbiAgICAgICAgZm9yIChjb25zdCByb3cgb2YgdGhpcy5yb3dzVG9TdHJpbmcoc2VwYXJhdG9yKSkge1xuICAgICAgICAgICAgc3RyICs9IHJvdyArICdcXG4nO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgc2VyaWFsaXplKGVuY29kaW5nID0gJ2JpbmFyeScsIHN0cmVhbSA9IHRydWUpIHtcbiAgICAgICAgcmV0dXJuIHdyaXRlVGFibGVCaW5hcnkodGhpcywgc3RyZWFtKTtcbiAgICB9XG4gICAgcHVibGljIHJvd3NUb1N0cmluZyhzZXBhcmF0b3IgPSAnIHwgJykge1xuICAgICAgICByZXR1cm4gbmV3IFBpcGVJdGVyYXRvcih0YWJsZVJvd3NUb1N0cmluZyh0aGlzLCBzZXBhcmF0b3IpLCAndXRmOCcpO1xuICAgIH1cbn1cblxuY2xhc3MgRmlsdGVyZWREYXRhRnJhbWUgaW1wbGVtZW50cyBEYXRhRnJhbWUge1xuICAgIHByaXZhdGUgcHJlZGljYXRlOiBQcmVkaWNhdGU7XG4gICAgcHJpdmF0ZSBiYXRjaGVzOiBSZWNvcmRCYXRjaFtdO1xuICAgIGNvbnN0cnVjdG9yIChiYXRjaGVzOiBSZWNvcmRCYXRjaFtdLCBwcmVkaWNhdGU6IFByZWRpY2F0ZSkge1xuICAgICAgICB0aGlzLmJhdGNoZXMgPSBiYXRjaGVzO1xuICAgICAgICB0aGlzLnByZWRpY2F0ZSA9IHByZWRpY2F0ZTtcbiAgICB9XG4gICAgcHVibGljIHNjYW4obmV4dDogTmV4dEZ1bmMsIGJpbmQ/OiBCaW5kRnVuYykge1xuICAgICAgICAvLyBpbmxpbmVkIHZlcnNpb24gb2YgdGhpczpcbiAgICAgICAgLy8gdGhpcy5wYXJlbnQuc2NhbigoaWR4LCBjb2x1bW5zKSA9PiB7XG4gICAgICAgIC8vICAgICBpZiAodGhpcy5wcmVkaWNhdGUoaWR4LCBjb2x1bW5zKSkgbmV4dChpZHgsIGNvbHVtbnMpO1xuICAgICAgICAvLyB9KTtcbiAgICAgICAgY29uc3QgYmF0Y2hlcyA9IHRoaXMuYmF0Y2hlcztcbiAgICAgICAgY29uc3QgbnVtQmF0Y2hlcyA9IGJhdGNoZXMubGVuZ3RoO1xuICAgICAgICBmb3IgKGxldCBiYXRjaEluZGV4ID0gLTE7ICsrYmF0Y2hJbmRleCA8IG51bUJhdGNoZXM7KSB7XG4gICAgICAgICAgICAvLyBsb2FkIGJhdGNoZXNcbiAgICAgICAgICAgIGNvbnN0IGJhdGNoID0gYmF0Y2hlc1tiYXRjaEluZGV4XTtcbiAgICAgICAgICAgIC8vIFRPRE86IGJpbmQgYmF0Y2hlcyBsYXppbHlcbiAgICAgICAgICAgIC8vIElmIHByZWRpY2F0ZSBkb2Vzbid0IG1hdGNoIGFueXRoaW5nIGluIHRoZSBiYXRjaCB3ZSBkb24ndCBuZWVkXG4gICAgICAgICAgICAvLyB0byBiaW5kIHRoZSBjYWxsYmFja1xuICAgICAgICAgICAgaWYgKGJpbmQpIHsgYmluZChiYXRjaCk7IH1cbiAgICAgICAgICAgIGNvbnN0IHByZWRpY2F0ZSA9IHRoaXMucHJlZGljYXRlLmJpbmQoYmF0Y2gpO1xuICAgICAgICAgICAgLy8geWllbGQgYWxsIGluZGljZXNcbiAgICAgICAgICAgIGZvciAobGV0IGluZGV4ID0gLTEsIG51bVJvd3MgPSBiYXRjaC5sZW5ndGg7ICsraW5kZXggPCBudW1Sb3dzOykge1xuICAgICAgICAgICAgICAgIGlmIChwcmVkaWNhdGUoaW5kZXgsIGJhdGNoKSkgeyBuZXh0KGluZGV4LCBiYXRjaCk7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBwdWJsaWMgY291bnQoKTogbnVtYmVyIHtcbiAgICAgICAgLy8gaW5saW5lZCB2ZXJzaW9uIG9mIHRoaXM6XG4gICAgICAgIC8vIGxldCBzdW0gPSAwO1xuICAgICAgICAvLyB0aGlzLnBhcmVudC5zY2FuKChpZHgsIGNvbHVtbnMpID0+IHtcbiAgICAgICAgLy8gICAgIGlmICh0aGlzLnByZWRpY2F0ZShpZHgsIGNvbHVtbnMpKSArK3N1bTtcbiAgICAgICAgLy8gfSk7XG4gICAgICAgIC8vIHJldHVybiBzdW07XG4gICAgICAgIGxldCBzdW0gPSAwO1xuICAgICAgICBjb25zdCBiYXRjaGVzID0gdGhpcy5iYXRjaGVzO1xuICAgICAgICBjb25zdCBudW1CYXRjaGVzID0gYmF0Y2hlcy5sZW5ndGg7XG4gICAgICAgIGZvciAobGV0IGJhdGNoSW5kZXggPSAtMTsgKytiYXRjaEluZGV4IDwgbnVtQmF0Y2hlczspIHtcbiAgICAgICAgICAgIC8vIGxvYWQgYmF0Y2hlc1xuICAgICAgICAgICAgY29uc3QgYmF0Y2ggPSBiYXRjaGVzW2JhdGNoSW5kZXhdO1xuICAgICAgICAgICAgY29uc3QgcHJlZGljYXRlID0gdGhpcy5wcmVkaWNhdGUuYmluZChiYXRjaCk7XG4gICAgICAgICAgICAvLyB5aWVsZCBhbGwgaW5kaWNlc1xuICAgICAgICAgICAgZm9yIChsZXQgaW5kZXggPSAtMSwgbnVtUm93cyA9IGJhdGNoLmxlbmd0aDsgKytpbmRleCA8IG51bVJvd3M7KSB7XG4gICAgICAgICAgICAgICAgaWYgKHByZWRpY2F0ZShpbmRleCwgYmF0Y2gpKSB7ICsrc3VtOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN1bTtcbiAgICB9XG4gICAgcHVibGljICpbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFN0cnVjdFsnVFZhbHVlJ10+IHtcbiAgICAgICAgLy8gaW5saW5lZCB2ZXJzaW9uIG9mIHRoaXM6XG4gICAgICAgIC8vIHRoaXMucGFyZW50LnNjYW4oKGlkeCwgY29sdW1ucykgPT4ge1xuICAgICAgICAvLyAgICAgaWYgKHRoaXMucHJlZGljYXRlKGlkeCwgY29sdW1ucykpIG5leHQoaWR4LCBjb2x1bW5zKTtcbiAgICAgICAgLy8gfSk7XG4gICAgICAgIGNvbnN0IGJhdGNoZXMgPSB0aGlzLmJhdGNoZXM7XG4gICAgICAgIGNvbnN0IG51bUJhdGNoZXMgPSBiYXRjaGVzLmxlbmd0aDtcbiAgICAgICAgZm9yIChsZXQgYmF0Y2hJbmRleCA9IC0xOyArK2JhdGNoSW5kZXggPCBudW1CYXRjaGVzOykge1xuICAgICAgICAgICAgLy8gbG9hZCBiYXRjaGVzXG4gICAgICAgICAgICBjb25zdCBiYXRjaCA9IGJhdGNoZXNbYmF0Y2hJbmRleF07XG4gICAgICAgICAgICAvLyBUT0RPOiBiaW5kIGJhdGNoZXMgbGF6aWx5XG4gICAgICAgICAgICAvLyBJZiBwcmVkaWNhdGUgZG9lc24ndCBtYXRjaCBhbnl0aGluZyBpbiB0aGUgYmF0Y2ggd2UgZG9uJ3QgbmVlZFxuICAgICAgICAgICAgLy8gdG8gYmluZCB0aGUgY2FsbGJhY2tcbiAgICAgICAgICAgIGNvbnN0IHByZWRpY2F0ZSA9IHRoaXMucHJlZGljYXRlLmJpbmQoYmF0Y2gpO1xuICAgICAgICAgICAgLy8geWllbGQgYWxsIGluZGljZXNcbiAgICAgICAgICAgIGZvciAobGV0IGluZGV4ID0gLTEsIG51bVJvd3MgPSBiYXRjaC5sZW5ndGg7ICsraW5kZXggPCBudW1Sb3dzOykge1xuICAgICAgICAgICAgICAgIGlmIChwcmVkaWNhdGUoaW5kZXgsIGJhdGNoKSkgeyB5aWVsZCBiYXRjaC5nZXQoaW5kZXgpIGFzIGFueTsgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHB1YmxpYyBmaWx0ZXIocHJlZGljYXRlOiBQcmVkaWNhdGUpOiBEYXRhRnJhbWUge1xuICAgICAgICByZXR1cm4gbmV3IEZpbHRlcmVkRGF0YUZyYW1lKFxuICAgICAgICAgICAgdGhpcy5iYXRjaGVzLFxuICAgICAgICAgICAgdGhpcy5wcmVkaWNhdGUuYW5kKHByZWRpY2F0ZSlcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIGNvdW50QnkobmFtZTogQ29sIHwgc3RyaW5nKTogQ291bnRCeVJlc3VsdCB7XG4gICAgICAgIGNvbnN0IGJhdGNoZXMgPSB0aGlzLmJhdGNoZXMsIG51bUJhdGNoZXMgPSBiYXRjaGVzLmxlbmd0aDtcbiAgICAgICAgY29uc3QgY291bnRfYnkgPSB0eXBlb2YgbmFtZSA9PT0gJ3N0cmluZycgPyBuZXcgQ29sKG5hbWUpIDogbmFtZTtcbiAgICAgICAgLy8gQXNzdW1lIHRoYXQgYWxsIGRpY3Rpb25hcnkgYmF0Y2hlcyBhcmUgZGVsdGFzLCB3aGljaCBtZWFucyB0aGF0IHRoZVxuICAgICAgICAvLyBsYXN0IHJlY29yZCBiYXRjaCBoYXMgdGhlIG1vc3QgY29tcGxldGUgZGljdGlvbmFyeVxuICAgICAgICBjb3VudF9ieS5iaW5kKGJhdGNoZXNbbnVtQmF0Y2hlcyAtIDFdKTtcbiAgICAgICAgY29uc3QgdmVjdG9yID0gY291bnRfYnkudmVjdG9yIGFzIERpY3Rpb25hcnlWZWN0b3I7XG4gICAgICAgIGlmICghKHZlY3RvciBpbnN0YW5jZW9mIERpY3Rpb25hcnlWZWN0b3IpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdW50QnkgY3VycmVudGx5IG9ubHkgc3VwcG9ydHMgZGljdGlvbmFyeS1lbmNvZGVkIGNvbHVtbnMnKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBUT0RPOiBBZGp1c3QgYXJyYXkgYnl0ZSB3aWR0aCBiYXNlZCBvbiBvdmVyYWxsIGxlbmd0aFxuICAgICAgICAvLyAoZS5nLiBpZiB0aGlzLmxlbmd0aCA8PSAyNTUgdXNlIFVpbnQ4QXJyYXksIGV0Yy4uLilcbiAgICAgICAgY29uc3QgY291bnRzOiBVaW50MzJBcnJheSA9IG5ldyBVaW50MzJBcnJheSh2ZWN0b3IuZGljdGlvbmFyeS5sZW5ndGgpO1xuICAgICAgICBmb3IgKGxldCBiYXRjaEluZGV4ID0gLTE7ICsrYmF0Y2hJbmRleCA8IG51bUJhdGNoZXM7KSB7XG4gICAgICAgICAgICAvLyBsb2FkIGJhdGNoZXNcbiAgICAgICAgICAgIGNvbnN0IGJhdGNoID0gYmF0Y2hlc1tiYXRjaEluZGV4XTtcbiAgICAgICAgICAgIGNvbnN0IHByZWRpY2F0ZSA9IHRoaXMucHJlZGljYXRlLmJpbmQoYmF0Y2gpO1xuICAgICAgICAgICAgLy8gcmViaW5kIHRoZSBjb3VudEJ5IENvbFxuICAgICAgICAgICAgY291bnRfYnkuYmluZChiYXRjaCk7XG4gICAgICAgICAgICBjb25zdCBrZXlzID0gKGNvdW50X2J5LnZlY3RvciBhcyBEaWN0aW9uYXJ5VmVjdG9yKS5pbmRpY2VzO1xuICAgICAgICAgICAgLy8geWllbGQgYWxsIGluZGljZXNcbiAgICAgICAgICAgIGZvciAobGV0IGluZGV4ID0gLTEsIG51bVJvd3MgPSBiYXRjaC5sZW5ndGg7ICsraW5kZXggPCBudW1Sb3dzOykge1xuICAgICAgICAgICAgICAgIGxldCBrZXkgPSBrZXlzLmdldChpbmRleCk7XG4gICAgICAgICAgICAgICAgaWYgKGtleSAhPT0gbnVsbCAmJiBwcmVkaWNhdGUoaW5kZXgsIGJhdGNoKSkgeyBjb3VudHNba2V5XSsrOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBDb3VudEJ5UmVzdWx0KHZlY3Rvci5kaWN0aW9uYXJ5LCBJbnRWZWN0b3IuZnJvbShjb3VudHMpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBDb3VudEJ5UmVzdWx0IGV4dGVuZHMgVGFibGUgaW1wbGVtZW50cyBEYXRhRnJhbWUge1xuICAgIGNvbnN0cnVjdG9yKHZhbHVlczogVmVjdG9yLCBjb3VudHM6IEludFZlY3Rvcjxhbnk+KSB7XG4gICAgICAgIHN1cGVyKFxuICAgICAgICAgICAgbmV3IFJlY29yZEJhdGNoKG5ldyBTY2hlbWEoW1xuICAgICAgICAgICAgICAgIG5ldyBGaWVsZCgndmFsdWVzJywgdmFsdWVzLnR5cGUpLFxuICAgICAgICAgICAgICAgIG5ldyBGaWVsZCgnY291bnRzJywgY291bnRzLnR5cGUpXG4gICAgICAgICAgICBdKSxcbiAgICAgICAgICAgIGNvdW50cy5sZW5ndGgsIFt2YWx1ZXMsIGNvdW50c11cbiAgICAgICAgKSk7XG4gICAgfVxuICAgIHB1YmxpYyB0b0pTT04oKTogT2JqZWN0IHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gdGhpcy5nZXRDb2x1bW5BdCgwKSE7XG4gICAgICAgIGNvbnN0IGNvdW50cyA9IHRoaXMuZ2V0Q29sdW1uQXQoMSkhO1xuICAgICAgICBjb25zdCByZXN1bHQgPSB7fSBhcyB7IFtrOiBzdHJpbmddOiBudW1iZXIgfCBudWxsIH07XG4gICAgICAgIGZvciAobGV0IGkgPSAtMTsgKytpIDwgdGhpcy5sZW5ndGg7KSB7XG4gICAgICAgICAgICByZXN1bHRbdmFsdWVzLmdldChpKV0gPSBjb3VudHMuZ2V0KGkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxufVxuXG5mdW5jdGlvbiogdGFibGVSb3dzVG9TdHJpbmcodGFibGU6IFRhYmxlLCBzZXBhcmF0b3IgPSAnIHwgJykge1xuICAgIGxldCByb3dPZmZzZXQgPSAwO1xuICAgIGxldCBmaXJzdFZhbHVlcyA9IFtdO1xuICAgIGxldCBtYXhDb2x1bW5XaWR0aHM6IG51bWJlcltdID0gW107XG4gICAgbGV0IGl0ZXJhdG9yczogSXRlcmFibGVJdGVyYXRvcjxzdHJpbmc+W10gPSBbXTtcbiAgICAvLyBHYXRoZXIgYWxsIHRoZSBgcm93c1RvU3RyaW5nYCBpdGVyYXRvcnMgaW50byBhIGxpc3QgYmVmb3JlIGl0ZXJhdGluZyxcbiAgICAvLyBzbyB0aGF0IGBtYXhDb2x1bW5XaWR0aHNgIGlzIGZpbGxlZCB3aXRoIHRoZSBtYXhXaWR0aCBmb3IgZWFjaCBjb2x1bW5cbiAgICAvLyBhY3Jvc3MgYWxsIFJlY29yZEJhdGNoZXMuXG4gICAgZm9yIChjb25zdCBiYXRjaCBvZiB0YWJsZS5iYXRjaGVzKSB7XG4gICAgICAgIGNvbnN0IGl0ZXJhdG9yID0gYmF0Y2gucm93c1RvU3RyaW5nKHNlcGFyYXRvciwgcm93T2Zmc2V0LCBtYXhDb2x1bW5XaWR0aHMpO1xuICAgICAgICBjb25zdCB7IGRvbmUsIHZhbHVlIH0gPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIGlmICghZG9uZSkge1xuICAgICAgICAgICAgZmlyc3RWYWx1ZXMucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICBpdGVyYXRvcnMucHVzaChpdGVyYXRvcik7XG4gICAgICAgICAgICByb3dPZmZzZXQgKz0gYmF0Y2gubGVuZ3RoO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgaXRlcmF0b3Igb2YgaXRlcmF0b3JzKSB7XG4gICAgICAgIHlpZWxkIGZpcnN0VmFsdWVzLnNoaWZ0KCk7XG4gICAgICAgIHlpZWxkKiBpdGVyYXRvcjtcbiAgICB9XG59XG4iXX0=

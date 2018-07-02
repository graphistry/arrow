"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const recordbatch_1 = require("./recordbatch");
const predicate_1 = require("./predicate");
const type_1 = require("./type");
const arrow_1 = require("./ipc/reader/arrow");
const arrow_2 = require("./ipc/writer/arrow");
const node_1 = require("./util/node");
const compat_1 = require("./util/compat");
const vector_1 = require("./vector");
const chunked_1 = require("./vector/chunked");
class Table {
    constructor(...args) {
        // List of inner Vectors, possibly spanning batches
        this._columns = [];
        let schema;
        let batches;
        if (args[0] instanceof type_1.Schema) {
            schema = args[0];
            batches = Array.isArray(args[1][0]) ? args[1][0] : args[1];
        }
        else if (args[0] instanceof recordbatch_1.RecordBatch) {
            schema = (batches = args)[0].schema;
        }
        else {
            schema = (batches = args[0])[0].schema;
        }
        this.schema = schema;
        this.batches = batches;
        this.batchesUnion = batches.length == 0 ?
            new recordbatch_1.RecordBatch(schema, 0, []) :
            batches.reduce((union, batch) => union.concat(batch));
        this.length = this.batchesUnion.length;
        this.numCols = this.batchesUnion.numCols;
    }
    static empty() { return new Table(new type_1.Schema([]), []); }
    static from(sources) {
        if (sources) {
            let schema;
            let recordBatches = [];
            for (let recordBatch of arrow_1.read(sources)) {
                schema = schema || recordBatch.schema;
                recordBatches.push(recordBatch);
            }
            return new Table(schema || new type_1.Schema([]), recordBatches);
        }
        return Table.empty();
    }
    static fromAsync(sources) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            var e_1, _a;
            if (compat_1.isAsyncIterable(sources)) {
                let schema;
                let recordBatches = [];
                try {
                    for (var _b = tslib_1.__asyncValues(arrow_1.readAsync(sources)), _c; _c = yield _b.next(), !_c.done;) {
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
                return new Table(schema || new type_1.Schema([]), recordBatches);
            }
            else if (compat_1.isPromise(sources)) {
                return Table.from(yield sources);
            }
            else if (sources) {
                return Table.from(sources);
            }
            return Table.empty();
        });
    }
    static fromStruct(struct) {
        const schema = new type_1.Schema(struct.type.children);
        const chunks = struct.view instanceof chunked_1.ChunkedView ?
            struct.view.chunkVectors :
            [struct];
        return new Table(chunks.map((chunk) => new recordbatch_1.RecordBatch(schema, chunk.length, chunk.view.childData)));
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
    count() { return this.length; }
    countBy(name) {
        const batches = this.batches, numBatches = batches.length;
        const count_by = typeof name === 'string' ? new predicate_1.Col(name) : name;
        // Assume that all dictionary batches are deltas, which means that the
        // last record batch has the most complete dictionary
        count_by.bind(batches[numBatches - 1]);
        const vector = count_by.vector;
        if (!(vector instanceof vector_1.DictionaryVector)) {
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
        return new CountByResult(vector.dictionary, vector_1.IntVector.from(counts));
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
        return arrow_2.writeTableBinary(this, stream);
    }
    rowsToString(separator = ' | ') {
        return new node_1.PipeIterator(tableRowsToString(this, separator), 'utf8');
    }
}
exports.Table = Table;
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
    filter(predicate) {
        return new FilteredDataFrame(this.batches, this.predicate.and(predicate));
    }
    countBy(name) {
        const batches = this.batches, numBatches = batches.length;
        const count_by = typeof name === 'string' ? new predicate_1.Col(name) : name;
        // Assume that all dictionary batches are deltas, which means that the
        // last record batch has the most complete dictionary
        count_by.bind(batches[numBatches - 1]);
        const vector = count_by.vector;
        if (!(vector instanceof vector_1.DictionaryVector)) {
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
        return new CountByResult(vector.dictionary, vector_1.IntVector.from(counts));
    }
}
class CountByResult extends Table {
    constructor(values, counts) {
        super(new recordbatch_1.RecordBatch(new type_1.Schema([
            new type_1.Field('values', values.type),
            new type_1.Field('counts', counts.type)
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
exports.CountByResult = CountByResult;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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MUIsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDO0tBQ25CO0FBQ0wsQ0FBQyIsImZpbGUiOiJ0YWJsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBSZWNvcmRCYXRjaCB9IGZyb20gJy4vcmVjb3JkYmF0Y2gnO1xuaW1wb3J0IHsgQ29sLCBQcmVkaWNhdGUgfSBmcm9tICcuL3ByZWRpY2F0ZSc7XG5pbXBvcnQgeyBTY2hlbWEsIEZpZWxkLCBTdHJ1Y3QgfSBmcm9tICcuL3R5cGUnO1xuaW1wb3J0IHsgcmVhZCwgcmVhZEFzeW5jIH0gZnJvbSAnLi9pcGMvcmVhZGVyL2Fycm93JztcbmltcG9ydCB7IHdyaXRlVGFibGVCaW5hcnkgfSBmcm9tICcuL2lwYy93cml0ZXIvYXJyb3cnO1xuaW1wb3J0IHsgUGlwZUl0ZXJhdG9yIH0gZnJvbSAnLi91dGlsL25vZGUnO1xuaW1wb3J0IHsgaXNQcm9taXNlLCBpc0FzeW5jSXRlcmFibGUgfSBmcm9tICcuL3V0aWwvY29tcGF0JztcbmltcG9ydCB7IFZlY3RvciwgRGljdGlvbmFyeVZlY3RvciwgSW50VmVjdG9yLCBTdHJ1Y3RWZWN0b3IgfSBmcm9tICcuL3ZlY3Rvcic7XG5pbXBvcnQgeyBDaHVua2VkVmlldyB9IGZyb20gJy4vdmVjdG9yL2NodW5rZWQnO1xuXG5leHBvcnQgdHlwZSBOZXh0RnVuYyA9IChpZHg6IG51bWJlciwgYmF0Y2g6IFJlY29yZEJhdGNoKSA9PiB2b2lkO1xuZXhwb3J0IHR5cGUgQmluZEZ1bmMgPSAoYmF0Y2g6IFJlY29yZEJhdGNoKSA9PiB2b2lkO1xuXG5leHBvcnQgaW50ZXJmYWNlIERhdGFGcmFtZSB7XG4gICAgZmlsdGVyKHByZWRpY2F0ZTogUHJlZGljYXRlKTogRGF0YUZyYW1lO1xuICAgIHNjYW4obmV4dDogTmV4dEZ1bmMsIGJpbmQ/OiBCaW5kRnVuYyk6IHZvaWQ7XG4gICAgY291bnQoKTogbnVtYmVyO1xuICAgIGNvdW50QnkoY29sOiAoQ29sfHN0cmluZykpOiBDb3VudEJ5UmVzdWx0O1xufVxuXG5leHBvcnQgY2xhc3MgVGFibGUgaW1wbGVtZW50cyBEYXRhRnJhbWUge1xuICAgIHN0YXRpYyBlbXB0eSgpIHsgcmV0dXJuIG5ldyBUYWJsZShuZXcgU2NoZW1hKFtdKSwgW10pOyB9XG4gICAgc3RhdGljIGZyb20oc291cmNlcz86IEl0ZXJhYmxlPFVpbnQ4QXJyYXkgfCBCdWZmZXIgfCBzdHJpbmc+IHwgb2JqZWN0IHwgc3RyaW5nKSB7XG4gICAgICAgIGlmIChzb3VyY2VzKSB7XG4gICAgICAgICAgICBsZXQgc2NoZW1hOiBTY2hlbWEgfCB1bmRlZmluZWQ7XG4gICAgICAgICAgICBsZXQgcmVjb3JkQmF0Y2hlczogUmVjb3JkQmF0Y2hbXSA9IFtdO1xuICAgICAgICAgICAgZm9yIChsZXQgcmVjb3JkQmF0Y2ggb2YgcmVhZChzb3VyY2VzKSkge1xuICAgICAgICAgICAgICAgIHNjaGVtYSA9IHNjaGVtYSB8fCByZWNvcmRCYXRjaC5zY2hlbWE7XG4gICAgICAgICAgICAgICAgcmVjb3JkQmF0Y2hlcy5wdXNoKHJlY29yZEJhdGNoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBuZXcgVGFibGUoc2NoZW1hIHx8IG5ldyBTY2hlbWEoW10pLCByZWNvcmRCYXRjaGVzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gVGFibGUuZW1wdHkoKTtcbiAgICB9XG4gICAgc3RhdGljIGFzeW5jIGZyb21Bc3luYyhzb3VyY2VzPzogQXN5bmNJdGVyYWJsZTxVaW50OEFycmF5IHwgQnVmZmVyIHwgc3RyaW5nPikge1xuICAgICAgICBpZiAoaXNBc3luY0l0ZXJhYmxlKHNvdXJjZXMpKSB7XG4gICAgICAgICAgICBsZXQgc2NoZW1hOiBTY2hlbWEgfCB1bmRlZmluZWQ7XG4gICAgICAgICAgICBsZXQgcmVjb3JkQmF0Y2hlczogUmVjb3JkQmF0Y2hbXSA9IFtdO1xuICAgICAgICAgICAgZm9yIGF3YWl0IChsZXQgcmVjb3JkQmF0Y2ggb2YgcmVhZEFzeW5jKHNvdXJjZXMpKSB7XG4gICAgICAgICAgICAgICAgc2NoZW1hID0gc2NoZW1hIHx8IHJlY29yZEJhdGNoLnNjaGVtYTtcbiAgICAgICAgICAgICAgICByZWNvcmRCYXRjaGVzLnB1c2gocmVjb3JkQmF0Y2gpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG5ldyBUYWJsZShzY2hlbWEgfHwgbmV3IFNjaGVtYShbXSksIHJlY29yZEJhdGNoZXMpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzUHJvbWlzZShzb3VyY2VzKSkge1xuICAgICAgICAgICAgcmV0dXJuIFRhYmxlLmZyb20oYXdhaXQgc291cmNlcyk7XG4gICAgICAgIH0gZWxzZSBpZiAoc291cmNlcykge1xuICAgICAgICAgICAgcmV0dXJuIFRhYmxlLmZyb20oc291cmNlcyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFRhYmxlLmVtcHR5KCk7XG4gICAgfVxuICAgIHN0YXRpYyBmcm9tU3RydWN0KHN0cnVjdDogU3RydWN0VmVjdG9yKSB7XG4gICAgICAgIGNvbnN0IHNjaGVtYSA9IG5ldyBTY2hlbWEoc3RydWN0LnR5cGUuY2hpbGRyZW4pO1xuICAgICAgICBjb25zdCBjaHVua3MgPSBzdHJ1Y3QudmlldyBpbnN0YW5jZW9mIENodW5rZWRWaWV3ID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoc3RydWN0LnZpZXcuY2h1bmtWZWN0b3JzIGFzIFN0cnVjdFZlY3RvcltdKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgW3N0cnVjdF07XG4gICAgICAgIHJldHVybiBuZXcgVGFibGUoY2h1bmtzLm1hcCgoY2h1bmspID0+IG5ldyBSZWNvcmRCYXRjaChzY2hlbWEsIGNodW5rLmxlbmd0aCwgY2h1bmsudmlldy5jaGlsZERhdGEpKSk7XG4gICAgfVxuXG4gICAgcHVibGljIHJlYWRvbmx5IHNjaGVtYTogU2NoZW1hO1xuICAgIHB1YmxpYyByZWFkb25seSBsZW5ndGg6IG51bWJlcjtcbiAgICBwdWJsaWMgcmVhZG9ubHkgbnVtQ29sczogbnVtYmVyO1xuICAgIC8vIExpc3Qgb2YgaW5uZXIgUmVjb3JkQmF0Y2hlc1xuICAgIHB1YmxpYyByZWFkb25seSBiYXRjaGVzOiBSZWNvcmRCYXRjaFtdO1xuICAgIC8vIExpc3Qgb2YgaW5uZXIgVmVjdG9ycywgcG9zc2libHkgc3Bhbm5pbmcgYmF0Y2hlc1xuICAgIHByb3RlY3RlZCByZWFkb25seSBfY29sdW1uczogVmVjdG9yPGFueT5bXSA9IFtdO1xuICAgIC8vIFVuaW9uIG9mIGFsbCBpbm5lciBSZWNvcmRCYXRjaGVzIGludG8gb25lIFJlY29yZEJhdGNoLCBwb3NzaWJseSBjaHVua2VkLlxuICAgIC8vIElmIHRoZSBUYWJsZSBoYXMganVzdCBvbmUgaW5uZXIgUmVjb3JkQmF0Y2gsIHRoaXMgcG9pbnRzIHRvIHRoYXQuXG4gICAgLy8gSWYgdGhlIFRhYmxlIGhhcyBtdWx0aXBsZSBpbm5lciBSZWNvcmRCYXRjaGVzLCB0aGVuIHRoaXMgaXMgYSBDaHVua2VkIHZpZXdcbiAgICAvLyBvdmVyIHRoZSBsaXN0IG9mIFJlY29yZEJhdGNoZXMuIFRoaXMgYWxsb3dzIHVzIHRvIGRlbGVnYXRlIHRoZSByZXNwb25zaWJpbGl0eVxuICAgIC8vIG9mIGluZGV4aW5nLCBpdGVyYXRpbmcsIHNsaWNpbmcsIGFuZCB2aXNpdGluZyB0byB0aGUgTmVzdGVkL0NodW5rZWQgRGF0YS9WaWV3cy5cbiAgICBwdWJsaWMgcmVhZG9ubHkgYmF0Y2hlc1VuaW9uOiBSZWNvcmRCYXRjaDtcblxuICAgIGNvbnN0cnVjdG9yKGJhdGNoZXM6IFJlY29yZEJhdGNoW10pO1xuICAgIGNvbnN0cnVjdG9yKC4uLmJhdGNoZXM6IFJlY29yZEJhdGNoW10pO1xuICAgIGNvbnN0cnVjdG9yKHNjaGVtYTogU2NoZW1hLCBiYXRjaGVzOiBSZWNvcmRCYXRjaFtdKTtcbiAgICBjb25zdHJ1Y3RvcihzY2hlbWE6IFNjaGVtYSwgLi4uYmF0Y2hlczogUmVjb3JkQmF0Y2hbXSk7XG4gICAgY29uc3RydWN0b3IoLi4uYXJnczogYW55W10pIHtcbiAgICAgICAgbGV0IHNjaGVtYTogU2NoZW1hO1xuICAgICAgICBsZXQgYmF0Y2hlczogUmVjb3JkQmF0Y2hbXTtcbiAgICAgICAgaWYgKGFyZ3NbMF0gaW5zdGFuY2VvZiBTY2hlbWEpIHtcbiAgICAgICAgICAgIHNjaGVtYSA9IGFyZ3NbMF07XG4gICAgICAgICAgICBiYXRjaGVzID0gQXJyYXkuaXNBcnJheShhcmdzWzFdWzBdKSA/IGFyZ3NbMV1bMF0gOiBhcmdzWzFdO1xuICAgICAgICB9IGVsc2UgaWYgKGFyZ3NbMF0gaW5zdGFuY2VvZiBSZWNvcmRCYXRjaCkge1xuICAgICAgICAgICAgc2NoZW1hID0gKGJhdGNoZXMgPSBhcmdzKVswXS5zY2hlbWE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzY2hlbWEgPSAoYmF0Y2hlcyA9IGFyZ3NbMF0pWzBdLnNjaGVtYTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNjaGVtYSA9IHNjaGVtYTtcbiAgICAgICAgdGhpcy5iYXRjaGVzID0gYmF0Y2hlcztcbiAgICAgICAgdGhpcy5iYXRjaGVzVW5pb24gPSBiYXRjaGVzLmxlbmd0aCA9PSAwID9cbiAgICAgICAgICAgIG5ldyBSZWNvcmRCYXRjaChzY2hlbWEsIDAsIFtdKSA6XG4gICAgICAgICAgICBiYXRjaGVzLnJlZHVjZSgodW5pb24sIGJhdGNoKSA9PiB1bmlvbi5jb25jYXQoYmF0Y2gpKTtcbiAgICAgICAgdGhpcy5sZW5ndGggPSB0aGlzLmJhdGNoZXNVbmlvbi5sZW5ndGg7XG4gICAgICAgIHRoaXMubnVtQ29scyA9IHRoaXMuYmF0Y2hlc1VuaW9uLm51bUNvbHM7XG4gICAgfVxuICAgIHB1YmxpYyBnZXQoaW5kZXg6IG51bWJlcik6IFN0cnVjdFsnVFZhbHVlJ10ge1xuICAgICAgICByZXR1cm4gdGhpcy5iYXRjaGVzVW5pb24uZ2V0KGluZGV4KSE7XG4gICAgfVxuICAgIHB1YmxpYyBnZXRDb2x1bW4obmFtZTogc3RyaW5nKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldENvbHVtbkF0KHRoaXMuZ2V0Q29sdW1uSW5kZXgobmFtZSkpO1xuICAgIH1cbiAgICBwdWJsaWMgZ2V0Q29sdW1uQXQoaW5kZXg6IG51bWJlcikge1xuICAgICAgICByZXR1cm4gaW5kZXggPCAwIHx8IGluZGV4ID49IHRoaXMubnVtQ29sc1xuICAgICAgICAgICAgPyBudWxsXG4gICAgICAgICAgICA6IHRoaXMuX2NvbHVtbnNbaW5kZXhdIHx8IChcbiAgICAgICAgICAgICAgdGhpcy5fY29sdW1uc1tpbmRleF0gPSB0aGlzLmJhdGNoZXNVbmlvbi5nZXRDaGlsZEF0KGluZGV4KSEpO1xuICAgIH1cbiAgICBwdWJsaWMgZ2V0Q29sdW1uSW5kZXgobmFtZTogc3RyaW5nKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNjaGVtYS5maWVsZHMuZmluZEluZGV4KChmKSA9PiBmLm5hbWUgPT09IG5hbWUpO1xuICAgIH1cbiAgICBwdWJsaWMgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxTdHJ1Y3RbJ1RWYWx1ZSddPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmJhdGNoZXNVbmlvbltTeW1ib2wuaXRlcmF0b3JdKCkgYXMgYW55O1xuICAgIH1cbiAgICBwdWJsaWMgZmlsdGVyKHByZWRpY2F0ZTogUHJlZGljYXRlKTogRGF0YUZyYW1lIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGaWx0ZXJlZERhdGFGcmFtZSh0aGlzLmJhdGNoZXMsIHByZWRpY2F0ZSk7XG4gICAgfVxuICAgIHB1YmxpYyBzY2FuKG5leHQ6IE5leHRGdW5jLCBiaW5kPzogQmluZEZ1bmMpIHtcbiAgICAgICAgY29uc3QgYmF0Y2hlcyA9IHRoaXMuYmF0Y2hlcywgbnVtQmF0Y2hlcyA9IGJhdGNoZXMubGVuZ3RoO1xuICAgICAgICBmb3IgKGxldCBiYXRjaEluZGV4ID0gLTE7ICsrYmF0Y2hJbmRleCA8IG51bUJhdGNoZXM7KSB7XG4gICAgICAgICAgICAvLyBsb2FkIGJhdGNoZXNcbiAgICAgICAgICAgIGNvbnN0IGJhdGNoID0gYmF0Y2hlc1tiYXRjaEluZGV4XTtcbiAgICAgICAgICAgIGlmIChiaW5kKSB7IGJpbmQoYmF0Y2gpOyB9XG4gICAgICAgICAgICAvLyB5aWVsZCBhbGwgaW5kaWNlc1xuICAgICAgICAgICAgZm9yIChsZXQgaW5kZXggPSAtMSwgbnVtUm93cyA9IGJhdGNoLmxlbmd0aDsgKytpbmRleCA8IG51bVJvd3M7KSB7XG4gICAgICAgICAgICAgICAgbmV4dChpbmRleCwgYmF0Y2gpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHB1YmxpYyBjb3VudCgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5sZW5ndGg7IH1cbiAgICBwdWJsaWMgY291bnRCeShuYW1lOiBDb2wgfCBzdHJpbmcpOiBDb3VudEJ5UmVzdWx0IHtcbiAgICAgICAgY29uc3QgYmF0Y2hlcyA9IHRoaXMuYmF0Y2hlcywgbnVtQmF0Y2hlcyA9IGJhdGNoZXMubGVuZ3RoO1xuICAgICAgICBjb25zdCBjb3VudF9ieSA9IHR5cGVvZiBuYW1lID09PSAnc3RyaW5nJyA/IG5ldyBDb2wobmFtZSkgOiBuYW1lO1xuICAgICAgICAvLyBBc3N1bWUgdGhhdCBhbGwgZGljdGlvbmFyeSBiYXRjaGVzIGFyZSBkZWx0YXMsIHdoaWNoIG1lYW5zIHRoYXQgdGhlXG4gICAgICAgIC8vIGxhc3QgcmVjb3JkIGJhdGNoIGhhcyB0aGUgbW9zdCBjb21wbGV0ZSBkaWN0aW9uYXJ5XG4gICAgICAgIGNvdW50X2J5LmJpbmQoYmF0Y2hlc1tudW1CYXRjaGVzIC0gMV0pO1xuICAgICAgICBjb25zdCB2ZWN0b3IgPSBjb3VudF9ieS52ZWN0b3IgYXMgRGljdGlvbmFyeVZlY3RvcjtcbiAgICAgICAgaWYgKCEodmVjdG9yIGluc3RhbmNlb2YgRGljdGlvbmFyeVZlY3RvcikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY291bnRCeSBjdXJyZW50bHkgb25seSBzdXBwb3J0cyBkaWN0aW9uYXJ5LWVuY29kZWQgY29sdW1ucycpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRPRE86IEFkanVzdCBhcnJheSBieXRlIHdpZHRoIGJhc2VkIG9uIG92ZXJhbGwgbGVuZ3RoXG4gICAgICAgIC8vIChlLmcuIGlmIHRoaXMubGVuZ3RoIDw9IDI1NSB1c2UgVWludDhBcnJheSwgZXRjLi4uKVxuICAgICAgICBjb25zdCBjb3VudHM6IFVpbnQzMkFycmF5ID0gbmV3IFVpbnQzMkFycmF5KHZlY3Rvci5kaWN0aW9uYXJ5Lmxlbmd0aCk7XG4gICAgICAgIGZvciAobGV0IGJhdGNoSW5kZXggPSAtMTsgKytiYXRjaEluZGV4IDwgbnVtQmF0Y2hlczspIHtcbiAgICAgICAgICAgIC8vIGxvYWQgYmF0Y2hlc1xuICAgICAgICAgICAgY29uc3QgYmF0Y2ggPSBiYXRjaGVzW2JhdGNoSW5kZXhdO1xuICAgICAgICAgICAgLy8gcmViaW5kIHRoZSBjb3VudEJ5IENvbFxuICAgICAgICAgICAgY291bnRfYnkuYmluZChiYXRjaCk7XG4gICAgICAgICAgICBjb25zdCBrZXlzID0gKGNvdW50X2J5LnZlY3RvciBhcyBEaWN0aW9uYXJ5VmVjdG9yKS5pbmRpY2VzO1xuICAgICAgICAgICAgLy8geWllbGQgYWxsIGluZGljZXNcbiAgICAgICAgICAgIGZvciAobGV0IGluZGV4ID0gLTEsIG51bVJvd3MgPSBiYXRjaC5sZW5ndGg7ICsraW5kZXggPCBudW1Sb3dzOykge1xuICAgICAgICAgICAgICAgIGxldCBrZXkgPSBrZXlzLmdldChpbmRleCk7XG4gICAgICAgICAgICAgICAgaWYgKGtleSAhPT0gbnVsbCkgeyBjb3VudHNba2V5XSsrOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBDb3VudEJ5UmVzdWx0KHZlY3Rvci5kaWN0aW9uYXJ5LCBJbnRWZWN0b3IuZnJvbShjb3VudHMpKTtcbiAgICB9XG4gICAgcHVibGljIHNlbGVjdCguLi5jb2x1bW5OYW1lczogc3RyaW5nW10pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBUYWJsZSh0aGlzLmJhdGNoZXMubWFwKChiYXRjaCkgPT4gYmF0Y2guc2VsZWN0KC4uLmNvbHVtbk5hbWVzKSkpO1xuICAgIH1cbiAgICBwdWJsaWMgdG9TdHJpbmcoc2VwYXJhdG9yPzogc3RyaW5nKSB7XG4gICAgICAgIGxldCBzdHIgPSAnJztcbiAgICAgICAgZm9yIChjb25zdCByb3cgb2YgdGhpcy5yb3dzVG9TdHJpbmcoc2VwYXJhdG9yKSkge1xuICAgICAgICAgICAgc3RyICs9IHJvdyArICdcXG4nO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgc2VyaWFsaXplKGVuY29kaW5nID0gJ2JpbmFyeScsIHN0cmVhbSA9IHRydWUpIHtcbiAgICAgICAgcmV0dXJuIHdyaXRlVGFibGVCaW5hcnkodGhpcywgc3RyZWFtKTtcbiAgICB9XG4gICAgcHVibGljIHJvd3NUb1N0cmluZyhzZXBhcmF0b3IgPSAnIHwgJykge1xuICAgICAgICByZXR1cm4gbmV3IFBpcGVJdGVyYXRvcih0YWJsZVJvd3NUb1N0cmluZyh0aGlzLCBzZXBhcmF0b3IpLCAndXRmOCcpO1xuICAgIH1cbn1cblxuY2xhc3MgRmlsdGVyZWREYXRhRnJhbWUgaW1wbGVtZW50cyBEYXRhRnJhbWUge1xuICAgIHByaXZhdGUgcHJlZGljYXRlOiBQcmVkaWNhdGU7XG4gICAgcHJpdmF0ZSBiYXRjaGVzOiBSZWNvcmRCYXRjaFtdO1xuICAgIGNvbnN0cnVjdG9yIChiYXRjaGVzOiBSZWNvcmRCYXRjaFtdLCBwcmVkaWNhdGU6IFByZWRpY2F0ZSkge1xuICAgICAgICB0aGlzLmJhdGNoZXMgPSBiYXRjaGVzO1xuICAgICAgICB0aGlzLnByZWRpY2F0ZSA9IHByZWRpY2F0ZTtcbiAgICB9XG4gICAgcHVibGljIHNjYW4obmV4dDogTmV4dEZ1bmMsIGJpbmQ/OiBCaW5kRnVuYykge1xuICAgICAgICAvLyBpbmxpbmVkIHZlcnNpb24gb2YgdGhpczpcbiAgICAgICAgLy8gdGhpcy5wYXJlbnQuc2NhbigoaWR4LCBjb2x1bW5zKSA9PiB7XG4gICAgICAgIC8vICAgICBpZiAodGhpcy5wcmVkaWNhdGUoaWR4LCBjb2x1bW5zKSkgbmV4dChpZHgsIGNvbHVtbnMpO1xuICAgICAgICAvLyB9KTtcbiAgICAgICAgY29uc3QgYmF0Y2hlcyA9IHRoaXMuYmF0Y2hlcztcbiAgICAgICAgY29uc3QgbnVtQmF0Y2hlcyA9IGJhdGNoZXMubGVuZ3RoO1xuICAgICAgICBmb3IgKGxldCBiYXRjaEluZGV4ID0gLTE7ICsrYmF0Y2hJbmRleCA8IG51bUJhdGNoZXM7KSB7XG4gICAgICAgICAgICAvLyBsb2FkIGJhdGNoZXNcbiAgICAgICAgICAgIGNvbnN0IGJhdGNoID0gYmF0Y2hlc1tiYXRjaEluZGV4XTtcbiAgICAgICAgICAgIC8vIFRPRE86IGJpbmQgYmF0Y2hlcyBsYXppbHlcbiAgICAgICAgICAgIC8vIElmIHByZWRpY2F0ZSBkb2Vzbid0IG1hdGNoIGFueXRoaW5nIGluIHRoZSBiYXRjaCB3ZSBkb24ndCBuZWVkXG4gICAgICAgICAgICAvLyB0byBiaW5kIHRoZSBjYWxsYmFja1xuICAgICAgICAgICAgaWYgKGJpbmQpIHsgYmluZChiYXRjaCk7IH1cbiAgICAgICAgICAgIGNvbnN0IHByZWRpY2F0ZSA9IHRoaXMucHJlZGljYXRlLmJpbmQoYmF0Y2gpO1xuICAgICAgICAgICAgLy8geWllbGQgYWxsIGluZGljZXNcbiAgICAgICAgICAgIGZvciAobGV0IGluZGV4ID0gLTEsIG51bVJvd3MgPSBiYXRjaC5sZW5ndGg7ICsraW5kZXggPCBudW1Sb3dzOykge1xuICAgICAgICAgICAgICAgIGlmIChwcmVkaWNhdGUoaW5kZXgsIGJhdGNoKSkgeyBuZXh0KGluZGV4LCBiYXRjaCk7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBwdWJsaWMgY291bnQoKTogbnVtYmVyIHtcbiAgICAgICAgLy8gaW5saW5lZCB2ZXJzaW9uIG9mIHRoaXM6XG4gICAgICAgIC8vIGxldCBzdW0gPSAwO1xuICAgICAgICAvLyB0aGlzLnBhcmVudC5zY2FuKChpZHgsIGNvbHVtbnMpID0+IHtcbiAgICAgICAgLy8gICAgIGlmICh0aGlzLnByZWRpY2F0ZShpZHgsIGNvbHVtbnMpKSArK3N1bTtcbiAgICAgICAgLy8gfSk7XG4gICAgICAgIC8vIHJldHVybiBzdW07XG4gICAgICAgIGxldCBzdW0gPSAwO1xuICAgICAgICBjb25zdCBiYXRjaGVzID0gdGhpcy5iYXRjaGVzO1xuICAgICAgICBjb25zdCBudW1CYXRjaGVzID0gYmF0Y2hlcy5sZW5ndGg7XG4gICAgICAgIGZvciAobGV0IGJhdGNoSW5kZXggPSAtMTsgKytiYXRjaEluZGV4IDwgbnVtQmF0Y2hlczspIHtcbiAgICAgICAgICAgIC8vIGxvYWQgYmF0Y2hlc1xuICAgICAgICAgICAgY29uc3QgYmF0Y2ggPSBiYXRjaGVzW2JhdGNoSW5kZXhdO1xuICAgICAgICAgICAgY29uc3QgcHJlZGljYXRlID0gdGhpcy5wcmVkaWNhdGUuYmluZChiYXRjaCk7XG4gICAgICAgICAgICAvLyB5aWVsZCBhbGwgaW5kaWNlc1xuICAgICAgICAgICAgZm9yIChsZXQgaW5kZXggPSAtMSwgbnVtUm93cyA9IGJhdGNoLmxlbmd0aDsgKytpbmRleCA8IG51bVJvd3M7KSB7XG4gICAgICAgICAgICAgICAgaWYgKHByZWRpY2F0ZShpbmRleCwgYmF0Y2gpKSB7ICsrc3VtOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN1bTtcbiAgICB9XG4gICAgcHVibGljIGZpbHRlcihwcmVkaWNhdGU6IFByZWRpY2F0ZSk6IERhdGFGcmFtZSB7XG4gICAgICAgIHJldHVybiBuZXcgRmlsdGVyZWREYXRhRnJhbWUoXG4gICAgICAgICAgICB0aGlzLmJhdGNoZXMsXG4gICAgICAgICAgICB0aGlzLnByZWRpY2F0ZS5hbmQocHJlZGljYXRlKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgY291bnRCeShuYW1lOiBDb2wgfCBzdHJpbmcpOiBDb3VudEJ5UmVzdWx0IHtcbiAgICAgICAgY29uc3QgYmF0Y2hlcyA9IHRoaXMuYmF0Y2hlcywgbnVtQmF0Y2hlcyA9IGJhdGNoZXMubGVuZ3RoO1xuICAgICAgICBjb25zdCBjb3VudF9ieSA9IHR5cGVvZiBuYW1lID09PSAnc3RyaW5nJyA/IG5ldyBDb2wobmFtZSkgOiBuYW1lO1xuICAgICAgICAvLyBBc3N1bWUgdGhhdCBhbGwgZGljdGlvbmFyeSBiYXRjaGVzIGFyZSBkZWx0YXMsIHdoaWNoIG1lYW5zIHRoYXQgdGhlXG4gICAgICAgIC8vIGxhc3QgcmVjb3JkIGJhdGNoIGhhcyB0aGUgbW9zdCBjb21wbGV0ZSBkaWN0aW9uYXJ5XG4gICAgICAgIGNvdW50X2J5LmJpbmQoYmF0Y2hlc1tudW1CYXRjaGVzIC0gMV0pO1xuICAgICAgICBjb25zdCB2ZWN0b3IgPSBjb3VudF9ieS52ZWN0b3IgYXMgRGljdGlvbmFyeVZlY3RvcjtcbiAgICAgICAgaWYgKCEodmVjdG9yIGluc3RhbmNlb2YgRGljdGlvbmFyeVZlY3RvcikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY291bnRCeSBjdXJyZW50bHkgb25seSBzdXBwb3J0cyBkaWN0aW9uYXJ5LWVuY29kZWQgY29sdW1ucycpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRPRE86IEFkanVzdCBhcnJheSBieXRlIHdpZHRoIGJhc2VkIG9uIG92ZXJhbGwgbGVuZ3RoXG4gICAgICAgIC8vIChlLmcuIGlmIHRoaXMubGVuZ3RoIDw9IDI1NSB1c2UgVWludDhBcnJheSwgZXRjLi4uKVxuICAgICAgICBjb25zdCBjb3VudHM6IFVpbnQzMkFycmF5ID0gbmV3IFVpbnQzMkFycmF5KHZlY3Rvci5kaWN0aW9uYXJ5Lmxlbmd0aCk7XG4gICAgICAgIGZvciAobGV0IGJhdGNoSW5kZXggPSAtMTsgKytiYXRjaEluZGV4IDwgbnVtQmF0Y2hlczspIHtcbiAgICAgICAgICAgIC8vIGxvYWQgYmF0Y2hlc1xuICAgICAgICAgICAgY29uc3QgYmF0Y2ggPSBiYXRjaGVzW2JhdGNoSW5kZXhdO1xuICAgICAgICAgICAgY29uc3QgcHJlZGljYXRlID0gdGhpcy5wcmVkaWNhdGUuYmluZChiYXRjaCk7XG4gICAgICAgICAgICAvLyByZWJpbmQgdGhlIGNvdW50QnkgQ29sXG4gICAgICAgICAgICBjb3VudF9ieS5iaW5kKGJhdGNoKTtcbiAgICAgICAgICAgIGNvbnN0IGtleXMgPSAoY291bnRfYnkudmVjdG9yIGFzIERpY3Rpb25hcnlWZWN0b3IpLmluZGljZXM7XG4gICAgICAgICAgICAvLyB5aWVsZCBhbGwgaW5kaWNlc1xuICAgICAgICAgICAgZm9yIChsZXQgaW5kZXggPSAtMSwgbnVtUm93cyA9IGJhdGNoLmxlbmd0aDsgKytpbmRleCA8IG51bVJvd3M7KSB7XG4gICAgICAgICAgICAgICAgbGV0IGtleSA9IGtleXMuZ2V0KGluZGV4KTtcbiAgICAgICAgICAgICAgICBpZiAoa2V5ICE9PSBudWxsICYmIHByZWRpY2F0ZShpbmRleCwgYmF0Y2gpKSB7IGNvdW50c1trZXldKys7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IENvdW50QnlSZXN1bHQodmVjdG9yLmRpY3Rpb25hcnksIEludFZlY3Rvci5mcm9tKGNvdW50cykpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIENvdW50QnlSZXN1bHQgZXh0ZW5kcyBUYWJsZSBpbXBsZW1lbnRzIERhdGFGcmFtZSB7XG4gICAgY29uc3RydWN0b3IodmFsdWVzOiBWZWN0b3IsIGNvdW50czogSW50VmVjdG9yPGFueT4pIHtcbiAgICAgICAgc3VwZXIoXG4gICAgICAgICAgICBuZXcgUmVjb3JkQmF0Y2gobmV3IFNjaGVtYShbXG4gICAgICAgICAgICAgICAgbmV3IEZpZWxkKCd2YWx1ZXMnLCB2YWx1ZXMudHlwZSksXG4gICAgICAgICAgICAgICAgbmV3IEZpZWxkKCdjb3VudHMnLCBjb3VudHMudHlwZSlcbiAgICAgICAgICAgIF0pLFxuICAgICAgICAgICAgY291bnRzLmxlbmd0aCwgW3ZhbHVlcywgY291bnRzXVxuICAgICAgICApKTtcbiAgICB9XG4gICAgcHVibGljIHRvSlNPTigpOiBPYmplY3Qge1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSB0aGlzLmdldENvbHVtbkF0KDApITtcbiAgICAgICAgY29uc3QgY291bnRzID0gdGhpcy5nZXRDb2x1bW5BdCgxKSE7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHt9IGFzIHsgW2s6IHN0cmluZ106IG51bWJlciB8IG51bGwgfTtcbiAgICAgICAgZm9yIChsZXQgaSA9IC0xOyArK2kgPCB0aGlzLmxlbmd0aDspIHtcbiAgICAgICAgICAgIHJlc3VsdFt2YWx1ZXMuZ2V0KGkpXSA9IGNvdW50cy5nZXQoaSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG59XG5cbmZ1bmN0aW9uKiB0YWJsZVJvd3NUb1N0cmluZyh0YWJsZTogVGFibGUsIHNlcGFyYXRvciA9ICcgfCAnKSB7XG4gICAgbGV0IHJvd09mZnNldCA9IDA7XG4gICAgbGV0IGZpcnN0VmFsdWVzID0gW107XG4gICAgbGV0IG1heENvbHVtbldpZHRoczogbnVtYmVyW10gPSBbXTtcbiAgICBsZXQgaXRlcmF0b3JzOiBJdGVyYWJsZUl0ZXJhdG9yPHN0cmluZz5bXSA9IFtdO1xuICAgIC8vIEdhdGhlciBhbGwgdGhlIGByb3dzVG9TdHJpbmdgIGl0ZXJhdG9ycyBpbnRvIGEgbGlzdCBiZWZvcmUgaXRlcmF0aW5nLFxuICAgIC8vIHNvIHRoYXQgYG1heENvbHVtbldpZHRoc2AgaXMgZmlsbGVkIHdpdGggdGhlIG1heFdpZHRoIGZvciBlYWNoIGNvbHVtblxuICAgIC8vIGFjcm9zcyBhbGwgUmVjb3JkQmF0Y2hlcy5cbiAgICBmb3IgKGNvbnN0IGJhdGNoIG9mIHRhYmxlLmJhdGNoZXMpIHtcbiAgICAgICAgY29uc3QgaXRlcmF0b3IgPSBiYXRjaC5yb3dzVG9TdHJpbmcoc2VwYXJhdG9yLCByb3dPZmZzZXQsIG1heENvbHVtbldpZHRocyk7XG4gICAgICAgIGNvbnN0IHsgZG9uZSwgdmFsdWUgfSA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgaWYgKCFkb25lKSB7XG4gICAgICAgICAgICBmaXJzdFZhbHVlcy5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIGl0ZXJhdG9ycy5wdXNoKGl0ZXJhdG9yKTtcbiAgICAgICAgICAgIHJvd09mZnNldCArPSBiYXRjaC5sZW5ndGg7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBpdGVyYXRvciBvZiBpdGVyYXRvcnMpIHtcbiAgICAgICAgeWllbGQgZmlyc3RWYWx1ZXMuc2hpZnQoKTtcbiAgICAgICAgeWllbGQqIGl0ZXJhdG9yO1xuICAgIH1cbn1cbiJdfQ==

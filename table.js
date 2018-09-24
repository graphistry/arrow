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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUM7Q0FDSjtBQW5CRCxzQ0FtQkM7QUFFRCxRQUFRLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFZLEVBQUUsU0FBUyxHQUFHLEtBQUs7SUFDdkQsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBQ2xCLElBQUksV0FBVyxHQUFHLEVBQUUsQ0FBQztJQUNyQixJQUFJLGVBQWUsR0FBYSxFQUFFLENBQUM7SUFDbkMsSUFBSSxTQUFTLEdBQStCLEVBQUUsQ0FBQztJQUMvQyx3RUFBd0U7SUFDeEUsd0VBQXdFO0lBQ3hFLDRCQUE0QjtJQUM1QixLQUFLLE1BQU0sS0FBSyxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUU7UUFDL0IsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQzNFLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3hDLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDUCxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3hCLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDekIsU0FBUyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUM7U0FDN0I7S0FDSjtJQUNELEtBQUssTUFBTSxRQUFRLElBQUksU0FBUyxFQUFFO1FBQzlCLE1BQU0sV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzFCLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQztLQUNuQjtBQUNMLENBQUMiLCJmaWxlIjoidGFibGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgUmVjb3JkQmF0Y2ggfSBmcm9tICcuL3JlY29yZGJhdGNoJztcbmltcG9ydCB7IENvbCwgUHJlZGljYXRlIH0gZnJvbSAnLi9wcmVkaWNhdGUnO1xuaW1wb3J0IHsgU2NoZW1hLCBGaWVsZCwgU3RydWN0IH0gZnJvbSAnLi90eXBlJztcbmltcG9ydCB7IHJlYWQsIHJlYWRBc3luYyB9IGZyb20gJy4vaXBjL3JlYWRlci9hcnJvdyc7XG5pbXBvcnQgeyB3cml0ZVRhYmxlQmluYXJ5IH0gZnJvbSAnLi9pcGMvd3JpdGVyL2Fycm93JztcbmltcG9ydCB7IFBpcGVJdGVyYXRvciB9IGZyb20gJy4vdXRpbC9ub2RlJztcbmltcG9ydCB7IGlzUHJvbWlzZSwgaXNBc3luY0l0ZXJhYmxlIH0gZnJvbSAnLi91dGlsL2NvbXBhdCc7XG5pbXBvcnQgeyBWZWN0b3IsIERpY3Rpb25hcnlWZWN0b3IsIEludFZlY3RvciwgU3RydWN0VmVjdG9yIH0gZnJvbSAnLi92ZWN0b3InO1xuaW1wb3J0IHsgQ2h1bmtlZFZpZXcgfSBmcm9tICcuL3ZlY3Rvci9jaHVua2VkJztcblxuZXhwb3J0IHR5cGUgTmV4dEZ1bmMgPSAoaWR4OiBudW1iZXIsIGJhdGNoOiBSZWNvcmRCYXRjaCkgPT4gdm9pZDtcbmV4cG9ydCB0eXBlIEJpbmRGdW5jID0gKGJhdGNoOiBSZWNvcmRCYXRjaCkgPT4gdm9pZDtcblxuZXhwb3J0IGludGVyZmFjZSBEYXRhRnJhbWUge1xuICAgIGNvdW50KCk6IG51bWJlcjtcbiAgICBmaWx0ZXIocHJlZGljYXRlOiBQcmVkaWNhdGUpOiBEYXRhRnJhbWU7XG4gICAgc2NhbihuZXh0OiBOZXh0RnVuYywgYmluZD86IEJpbmRGdW5jKTogdm9pZDtcbiAgICBjb3VudEJ5KGNvbDogKENvbHxzdHJpbmcpKTogQ291bnRCeVJlc3VsdDtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFN0cnVjdFsnVFZhbHVlJ10+O1xufVxuXG5leHBvcnQgY2xhc3MgVGFibGUgaW1wbGVtZW50cyBEYXRhRnJhbWUge1xuICAgIHN0YXRpYyBlbXB0eSgpIHsgcmV0dXJuIG5ldyBUYWJsZShuZXcgU2NoZW1hKFtdKSwgW10pOyB9XG4gICAgc3RhdGljIGZyb20oc291cmNlcz86IEl0ZXJhYmxlPFVpbnQ4QXJyYXkgfCBCdWZmZXIgfCBzdHJpbmc+IHwgb2JqZWN0IHwgc3RyaW5nKSB7XG4gICAgICAgIGlmIChzb3VyY2VzKSB7XG4gICAgICAgICAgICBsZXQgc2NoZW1hOiBTY2hlbWEgfCB1bmRlZmluZWQ7XG4gICAgICAgICAgICBsZXQgcmVjb3JkQmF0Y2hlczogUmVjb3JkQmF0Y2hbXSA9IFtdO1xuICAgICAgICAgICAgZm9yIChsZXQgcmVjb3JkQmF0Y2ggb2YgcmVhZChzb3VyY2VzKSkge1xuICAgICAgICAgICAgICAgIHNjaGVtYSA9IHNjaGVtYSB8fCByZWNvcmRCYXRjaC5zY2hlbWE7XG4gICAgICAgICAgICAgICAgcmVjb3JkQmF0Y2hlcy5wdXNoKHJlY29yZEJhdGNoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBuZXcgVGFibGUoc2NoZW1hIHx8IG5ldyBTY2hlbWEoW10pLCByZWNvcmRCYXRjaGVzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gVGFibGUuZW1wdHkoKTtcbiAgICB9XG4gICAgc3RhdGljIGFzeW5jIGZyb21Bc3luYyhzb3VyY2VzPzogQXN5bmNJdGVyYWJsZTxVaW50OEFycmF5IHwgQnVmZmVyIHwgc3RyaW5nPikge1xuICAgICAgICBpZiAoaXNBc3luY0l0ZXJhYmxlKHNvdXJjZXMpKSB7XG4gICAgICAgICAgICBsZXQgc2NoZW1hOiBTY2hlbWEgfCB1bmRlZmluZWQ7XG4gICAgICAgICAgICBsZXQgcmVjb3JkQmF0Y2hlczogUmVjb3JkQmF0Y2hbXSA9IFtdO1xuICAgICAgICAgICAgZm9yIGF3YWl0IChsZXQgcmVjb3JkQmF0Y2ggb2YgcmVhZEFzeW5jKHNvdXJjZXMpKSB7XG4gICAgICAgICAgICAgICAgc2NoZW1hID0gc2NoZW1hIHx8IHJlY29yZEJhdGNoLnNjaGVtYTtcbiAgICAgICAgICAgICAgICByZWNvcmRCYXRjaGVzLnB1c2gocmVjb3JkQmF0Y2gpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG5ldyBUYWJsZShzY2hlbWEgfHwgbmV3IFNjaGVtYShbXSksIHJlY29yZEJhdGNoZXMpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzUHJvbWlzZShzb3VyY2VzKSkge1xuICAgICAgICAgICAgcmV0dXJuIFRhYmxlLmZyb20oYXdhaXQgc291cmNlcyk7XG4gICAgICAgIH0gZWxzZSBpZiAoc291cmNlcykge1xuICAgICAgICAgICAgcmV0dXJuIFRhYmxlLmZyb20oc291cmNlcyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFRhYmxlLmVtcHR5KCk7XG4gICAgfVxuICAgIHN0YXRpYyBmcm9tU3RydWN0KHN0cnVjdDogU3RydWN0VmVjdG9yKSB7XG4gICAgICAgIGNvbnN0IHNjaGVtYSA9IG5ldyBTY2hlbWEoc3RydWN0LnR5cGUuY2hpbGRyZW4pO1xuICAgICAgICBjb25zdCBjaHVua3MgPSBzdHJ1Y3QudmlldyBpbnN0YW5jZW9mIENodW5rZWRWaWV3ID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoc3RydWN0LnZpZXcuY2h1bmtWZWN0b3JzIGFzIFN0cnVjdFZlY3RvcltdKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgW3N0cnVjdF07XG4gICAgICAgIHJldHVybiBuZXcgVGFibGUoY2h1bmtzLm1hcCgoY2h1bmspID0+IG5ldyBSZWNvcmRCYXRjaChzY2hlbWEsIGNodW5rLmxlbmd0aCwgY2h1bmsudmlldy5jaGlsZERhdGEpKSk7XG4gICAgfVxuXG4gICAgcHVibGljIHJlYWRvbmx5IHNjaGVtYTogU2NoZW1hO1xuICAgIHB1YmxpYyByZWFkb25seSBsZW5ndGg6IG51bWJlcjtcbiAgICBwdWJsaWMgcmVhZG9ubHkgbnVtQ29sczogbnVtYmVyO1xuICAgIC8vIExpc3Qgb2YgaW5uZXIgUmVjb3JkQmF0Y2hlc1xuICAgIHB1YmxpYyByZWFkb25seSBiYXRjaGVzOiBSZWNvcmRCYXRjaFtdO1xuICAgIC8vIExpc3Qgb2YgaW5uZXIgVmVjdG9ycywgcG9zc2libHkgc3Bhbm5pbmcgYmF0Y2hlc1xuICAgIHByb3RlY3RlZCByZWFkb25seSBfY29sdW1uczogVmVjdG9yPGFueT5bXSA9IFtdO1xuICAgIC8vIFVuaW9uIG9mIGFsbCBpbm5lciBSZWNvcmRCYXRjaGVzIGludG8gb25lIFJlY29yZEJhdGNoLCBwb3NzaWJseSBjaHVua2VkLlxuICAgIC8vIElmIHRoZSBUYWJsZSBoYXMganVzdCBvbmUgaW5uZXIgUmVjb3JkQmF0Y2gsIHRoaXMgcG9pbnRzIHRvIHRoYXQuXG4gICAgLy8gSWYgdGhlIFRhYmxlIGhhcyBtdWx0aXBsZSBpbm5lciBSZWNvcmRCYXRjaGVzLCB0aGVuIHRoaXMgaXMgYSBDaHVua2VkIHZpZXdcbiAgICAvLyBvdmVyIHRoZSBsaXN0IG9mIFJlY29yZEJhdGNoZXMuIFRoaXMgYWxsb3dzIHVzIHRvIGRlbGVnYXRlIHRoZSByZXNwb25zaWJpbGl0eVxuICAgIC8vIG9mIGluZGV4aW5nLCBpdGVyYXRpbmcsIHNsaWNpbmcsIGFuZCB2aXNpdGluZyB0byB0aGUgTmVzdGVkL0NodW5rZWQgRGF0YS9WaWV3cy5cbiAgICBwdWJsaWMgcmVhZG9ubHkgYmF0Y2hlc1VuaW9uOiBSZWNvcmRCYXRjaDtcblxuICAgIGNvbnN0cnVjdG9yKGJhdGNoZXM6IFJlY29yZEJhdGNoW10pO1xuICAgIGNvbnN0cnVjdG9yKC4uLmJhdGNoZXM6IFJlY29yZEJhdGNoW10pO1xuICAgIGNvbnN0cnVjdG9yKHNjaGVtYTogU2NoZW1hLCBiYXRjaGVzOiBSZWNvcmRCYXRjaFtdKTtcbiAgICBjb25zdHJ1Y3RvcihzY2hlbWE6IFNjaGVtYSwgLi4uYmF0Y2hlczogUmVjb3JkQmF0Y2hbXSk7XG4gICAgY29uc3RydWN0b3IoLi4uYXJnczogYW55W10pIHtcbiAgICAgICAgbGV0IHNjaGVtYTogU2NoZW1hO1xuICAgICAgICBsZXQgYmF0Y2hlczogUmVjb3JkQmF0Y2hbXTtcbiAgICAgICAgaWYgKGFyZ3NbMF0gaW5zdGFuY2VvZiBTY2hlbWEpIHtcbiAgICAgICAgICAgIHNjaGVtYSA9IGFyZ3NbMF07XG4gICAgICAgICAgICBiYXRjaGVzID0gQXJyYXkuaXNBcnJheShhcmdzWzFdWzBdKSA/IGFyZ3NbMV1bMF0gOiBhcmdzWzFdO1xuICAgICAgICB9IGVsc2UgaWYgKGFyZ3NbMF0gaW5zdGFuY2VvZiBSZWNvcmRCYXRjaCkge1xuICAgICAgICAgICAgc2NoZW1hID0gKGJhdGNoZXMgPSBhcmdzKVswXS5zY2hlbWE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzY2hlbWEgPSAoYmF0Y2hlcyA9IGFyZ3NbMF0pWzBdLnNjaGVtYTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNjaGVtYSA9IHNjaGVtYTtcbiAgICAgICAgdGhpcy5iYXRjaGVzID0gYmF0Y2hlcztcbiAgICAgICAgdGhpcy5iYXRjaGVzVW5pb24gPSBiYXRjaGVzLmxlbmd0aCA9PSAwID9cbiAgICAgICAgICAgIG5ldyBSZWNvcmRCYXRjaChzY2hlbWEsIDAsIFtdKSA6XG4gICAgICAgICAgICBiYXRjaGVzLnJlZHVjZSgodW5pb24sIGJhdGNoKSA9PiB1bmlvbi5jb25jYXQoYmF0Y2gpKTtcbiAgICAgICAgdGhpcy5sZW5ndGggPSB0aGlzLmJhdGNoZXNVbmlvbi5sZW5ndGg7XG4gICAgICAgIHRoaXMubnVtQ29scyA9IHRoaXMuYmF0Y2hlc1VuaW9uLm51bUNvbHM7XG4gICAgfVxuXG4gICAgcHVibGljIGdldChpbmRleDogbnVtYmVyKTogU3RydWN0WydUVmFsdWUnXSB7XG4gICAgICAgIHJldHVybiB0aGlzLmJhdGNoZXNVbmlvbi5nZXQoaW5kZXgpITtcbiAgICB9XG4gICAgcHVibGljIGdldENvbHVtbihuYW1lOiBzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0Q29sdW1uQXQodGhpcy5nZXRDb2x1bW5JbmRleChuYW1lKSk7XG4gICAgfVxuICAgIHB1YmxpYyBnZXRDb2x1bW5BdChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIHJldHVybiBpbmRleCA8IDAgfHwgaW5kZXggPj0gdGhpcy5udW1Db2xzXG4gICAgICAgICAgICA/IG51bGxcbiAgICAgICAgICAgIDogdGhpcy5fY29sdW1uc1tpbmRleF0gfHwgKFxuICAgICAgICAgICAgICB0aGlzLl9jb2x1bW5zW2luZGV4XSA9IHRoaXMuYmF0Y2hlc1VuaW9uLmdldENoaWxkQXQoaW5kZXgpISk7XG4gICAgfVxuICAgIHB1YmxpYyBnZXRDb2x1bW5JbmRleChuYW1lOiBzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2NoZW1hLmZpZWxkcy5maW5kSW5kZXgoKGYpID0+IGYubmFtZSA9PT0gbmFtZSk7XG4gICAgfVxuICAgIHB1YmxpYyBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFN0cnVjdFsnVFZhbHVlJ10+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYmF0Y2hlc1VuaW9uW1N5bWJvbC5pdGVyYXRvcl0oKSBhcyBhbnk7XG4gICAgfVxuICAgIHB1YmxpYyBmaWx0ZXIocHJlZGljYXRlOiBQcmVkaWNhdGUpOiBEYXRhRnJhbWUge1xuICAgICAgICByZXR1cm4gbmV3IEZpbHRlcmVkRGF0YUZyYW1lKHRoaXMuYmF0Y2hlcywgcHJlZGljYXRlKTtcbiAgICB9XG4gICAgcHVibGljIHNjYW4obmV4dDogTmV4dEZ1bmMsIGJpbmQ/OiBCaW5kRnVuYykge1xuICAgICAgICBjb25zdCBiYXRjaGVzID0gdGhpcy5iYXRjaGVzLCBudW1CYXRjaGVzID0gYmF0Y2hlcy5sZW5ndGg7XG4gICAgICAgIGZvciAobGV0IGJhdGNoSW5kZXggPSAtMTsgKytiYXRjaEluZGV4IDwgbnVtQmF0Y2hlczspIHtcbiAgICAgICAgICAgIC8vIGxvYWQgYmF0Y2hlc1xuICAgICAgICAgICAgY29uc3QgYmF0Y2ggPSBiYXRjaGVzW2JhdGNoSW5kZXhdO1xuICAgICAgICAgICAgaWYgKGJpbmQpIHsgYmluZChiYXRjaCk7IH1cbiAgICAgICAgICAgIC8vIHlpZWxkIGFsbCBpbmRpY2VzXG4gICAgICAgICAgICBmb3IgKGxldCBpbmRleCA9IC0xLCBudW1Sb3dzID0gYmF0Y2gubGVuZ3RoOyArK2luZGV4IDwgbnVtUm93czspIHtcbiAgICAgICAgICAgICAgICBuZXh0KGluZGV4LCBiYXRjaCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcHVibGljIGNvdW50QnkobmFtZTogQ29sIHwgc3RyaW5nKTogQ291bnRCeVJlc3VsdCB7XG4gICAgICAgIGNvbnN0IGJhdGNoZXMgPSB0aGlzLmJhdGNoZXMsIG51bUJhdGNoZXMgPSBiYXRjaGVzLmxlbmd0aDtcbiAgICAgICAgY29uc3QgY291bnRfYnkgPSB0eXBlb2YgbmFtZSA9PT0gJ3N0cmluZycgPyBuZXcgQ29sKG5hbWUpIDogbmFtZTtcbiAgICAgICAgLy8gQXNzdW1lIHRoYXQgYWxsIGRpY3Rpb25hcnkgYmF0Y2hlcyBhcmUgZGVsdGFzLCB3aGljaCBtZWFucyB0aGF0IHRoZVxuICAgICAgICAvLyBsYXN0IHJlY29yZCBiYXRjaCBoYXMgdGhlIG1vc3QgY29tcGxldGUgZGljdGlvbmFyeVxuICAgICAgICBjb3VudF9ieS5iaW5kKGJhdGNoZXNbbnVtQmF0Y2hlcyAtIDFdKTtcbiAgICAgICAgY29uc3QgdmVjdG9yID0gY291bnRfYnkudmVjdG9yIGFzIERpY3Rpb25hcnlWZWN0b3I7XG4gICAgICAgIGlmICghKHZlY3RvciBpbnN0YW5jZW9mIERpY3Rpb25hcnlWZWN0b3IpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdW50QnkgY3VycmVudGx5IG9ubHkgc3VwcG9ydHMgZGljdGlvbmFyeS1lbmNvZGVkIGNvbHVtbnMnKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBUT0RPOiBBZGp1c3QgYXJyYXkgYnl0ZSB3aWR0aCBiYXNlZCBvbiBvdmVyYWxsIGxlbmd0aFxuICAgICAgICAvLyAoZS5nLiBpZiB0aGlzLmxlbmd0aCA8PSAyNTUgdXNlIFVpbnQ4QXJyYXksIGV0Yy4uLilcbiAgICAgICAgY29uc3QgY291bnRzOiBVaW50MzJBcnJheSA9IG5ldyBVaW50MzJBcnJheSh2ZWN0b3IuZGljdGlvbmFyeS5sZW5ndGgpO1xuICAgICAgICBmb3IgKGxldCBiYXRjaEluZGV4ID0gLTE7ICsrYmF0Y2hJbmRleCA8IG51bUJhdGNoZXM7KSB7XG4gICAgICAgICAgICAvLyBsb2FkIGJhdGNoZXNcbiAgICAgICAgICAgIGNvbnN0IGJhdGNoID0gYmF0Y2hlc1tiYXRjaEluZGV4XTtcbiAgICAgICAgICAgIC8vIHJlYmluZCB0aGUgY291bnRCeSBDb2xcbiAgICAgICAgICAgIGNvdW50X2J5LmJpbmQoYmF0Y2gpO1xuICAgICAgICAgICAgY29uc3Qga2V5cyA9IChjb3VudF9ieS52ZWN0b3IgYXMgRGljdGlvbmFyeVZlY3RvcikuaW5kaWNlcztcbiAgICAgICAgICAgIC8vIHlpZWxkIGFsbCBpbmRpY2VzXG4gICAgICAgICAgICBmb3IgKGxldCBpbmRleCA9IC0xLCBudW1Sb3dzID0gYmF0Y2gubGVuZ3RoOyArK2luZGV4IDwgbnVtUm93czspIHtcbiAgICAgICAgICAgICAgICBsZXQga2V5ID0ga2V5cy5nZXQoaW5kZXgpO1xuICAgICAgICAgICAgICAgIGlmIChrZXkgIT09IG51bGwpIHsgY291bnRzW2tleV0rKzsgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgQ291bnRCeVJlc3VsdCh2ZWN0b3IuZGljdGlvbmFyeSwgSW50VmVjdG9yLmZyb20oY291bnRzKSk7XG4gICAgfVxuICAgIHB1YmxpYyBjb3VudCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5sZW5ndGg7XG4gICAgfVxuICAgIHB1YmxpYyBzZWxlY3QoLi4uY29sdW1uTmFtZXM6IHN0cmluZ1tdKSB7XG4gICAgICAgIHJldHVybiBuZXcgVGFibGUodGhpcy5iYXRjaGVzLm1hcCgoYmF0Y2gpID0+IGJhdGNoLnNlbGVjdCguLi5jb2x1bW5OYW1lcykpKTtcbiAgICB9XG4gICAgcHVibGljIHRvU3RyaW5nKHNlcGFyYXRvcj86IHN0cmluZykge1xuICAgICAgICBsZXQgc3RyID0gJyc7XG4gICAgICAgIGZvciAoY29uc3Qgcm93IG9mIHRoaXMucm93c1RvU3RyaW5nKHNlcGFyYXRvcikpIHtcbiAgICAgICAgICAgIHN0ciArPSByb3cgKyAnXFxuJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIHNlcmlhbGl6ZShlbmNvZGluZyA9ICdiaW5hcnknLCBzdHJlYW0gPSB0cnVlKSB7XG4gICAgICAgIHJldHVybiB3cml0ZVRhYmxlQmluYXJ5KHRoaXMsIHN0cmVhbSk7XG4gICAgfVxuICAgIHB1YmxpYyByb3dzVG9TdHJpbmcoc2VwYXJhdG9yID0gJyB8ICcpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQaXBlSXRlcmF0b3IodGFibGVSb3dzVG9TdHJpbmcodGhpcywgc2VwYXJhdG9yKSwgJ3V0ZjgnKTtcbiAgICB9XG59XG5cbmNsYXNzIEZpbHRlcmVkRGF0YUZyYW1lIGltcGxlbWVudHMgRGF0YUZyYW1lIHtcbiAgICBwcml2YXRlIHByZWRpY2F0ZTogUHJlZGljYXRlO1xuICAgIHByaXZhdGUgYmF0Y2hlczogUmVjb3JkQmF0Y2hbXTtcbiAgICBjb25zdHJ1Y3RvciAoYmF0Y2hlczogUmVjb3JkQmF0Y2hbXSwgcHJlZGljYXRlOiBQcmVkaWNhdGUpIHtcbiAgICAgICAgdGhpcy5iYXRjaGVzID0gYmF0Y2hlcztcbiAgICAgICAgdGhpcy5wcmVkaWNhdGUgPSBwcmVkaWNhdGU7XG4gICAgfVxuICAgIHB1YmxpYyBzY2FuKG5leHQ6IE5leHRGdW5jLCBiaW5kPzogQmluZEZ1bmMpIHtcbiAgICAgICAgLy8gaW5saW5lZCB2ZXJzaW9uIG9mIHRoaXM6XG4gICAgICAgIC8vIHRoaXMucGFyZW50LnNjYW4oKGlkeCwgY29sdW1ucykgPT4ge1xuICAgICAgICAvLyAgICAgaWYgKHRoaXMucHJlZGljYXRlKGlkeCwgY29sdW1ucykpIG5leHQoaWR4LCBjb2x1bW5zKTtcbiAgICAgICAgLy8gfSk7XG4gICAgICAgIGNvbnN0IGJhdGNoZXMgPSB0aGlzLmJhdGNoZXM7XG4gICAgICAgIGNvbnN0IG51bUJhdGNoZXMgPSBiYXRjaGVzLmxlbmd0aDtcbiAgICAgICAgZm9yIChsZXQgYmF0Y2hJbmRleCA9IC0xOyArK2JhdGNoSW5kZXggPCBudW1CYXRjaGVzOykge1xuICAgICAgICAgICAgLy8gbG9hZCBiYXRjaGVzXG4gICAgICAgICAgICBjb25zdCBiYXRjaCA9IGJhdGNoZXNbYmF0Y2hJbmRleF07XG4gICAgICAgICAgICAvLyBUT0RPOiBiaW5kIGJhdGNoZXMgbGF6aWx5XG4gICAgICAgICAgICAvLyBJZiBwcmVkaWNhdGUgZG9lc24ndCBtYXRjaCBhbnl0aGluZyBpbiB0aGUgYmF0Y2ggd2UgZG9uJ3QgbmVlZFxuICAgICAgICAgICAgLy8gdG8gYmluZCB0aGUgY2FsbGJhY2tcbiAgICAgICAgICAgIGlmIChiaW5kKSB7IGJpbmQoYmF0Y2gpOyB9XG4gICAgICAgICAgICBjb25zdCBwcmVkaWNhdGUgPSB0aGlzLnByZWRpY2F0ZS5iaW5kKGJhdGNoKTtcbiAgICAgICAgICAgIC8vIHlpZWxkIGFsbCBpbmRpY2VzXG4gICAgICAgICAgICBmb3IgKGxldCBpbmRleCA9IC0xLCBudW1Sb3dzID0gYmF0Y2gubGVuZ3RoOyArK2luZGV4IDwgbnVtUm93czspIHtcbiAgICAgICAgICAgICAgICBpZiAocHJlZGljYXRlKGluZGV4LCBiYXRjaCkpIHsgbmV4dChpbmRleCwgYmF0Y2gpOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcHVibGljIGNvdW50KCk6IG51bWJlciB7XG4gICAgICAgIC8vIGlubGluZWQgdmVyc2lvbiBvZiB0aGlzOlxuICAgICAgICAvLyBsZXQgc3VtID0gMDtcbiAgICAgICAgLy8gdGhpcy5wYXJlbnQuc2NhbigoaWR4LCBjb2x1bW5zKSA9PiB7XG4gICAgICAgIC8vICAgICBpZiAodGhpcy5wcmVkaWNhdGUoaWR4LCBjb2x1bW5zKSkgKytzdW07XG4gICAgICAgIC8vIH0pO1xuICAgICAgICAvLyByZXR1cm4gc3VtO1xuICAgICAgICBsZXQgc3VtID0gMDtcbiAgICAgICAgY29uc3QgYmF0Y2hlcyA9IHRoaXMuYmF0Y2hlcztcbiAgICAgICAgY29uc3QgbnVtQmF0Y2hlcyA9IGJhdGNoZXMubGVuZ3RoO1xuICAgICAgICBmb3IgKGxldCBiYXRjaEluZGV4ID0gLTE7ICsrYmF0Y2hJbmRleCA8IG51bUJhdGNoZXM7KSB7XG4gICAgICAgICAgICAvLyBsb2FkIGJhdGNoZXNcbiAgICAgICAgICAgIGNvbnN0IGJhdGNoID0gYmF0Y2hlc1tiYXRjaEluZGV4XTtcbiAgICAgICAgICAgIGNvbnN0IHByZWRpY2F0ZSA9IHRoaXMucHJlZGljYXRlLmJpbmQoYmF0Y2gpO1xuICAgICAgICAgICAgLy8geWllbGQgYWxsIGluZGljZXNcbiAgICAgICAgICAgIGZvciAobGV0IGluZGV4ID0gLTEsIG51bVJvd3MgPSBiYXRjaC5sZW5ndGg7ICsraW5kZXggPCBudW1Sb3dzOykge1xuICAgICAgICAgICAgICAgIGlmIChwcmVkaWNhdGUoaW5kZXgsIGJhdGNoKSkgeyArK3N1bTsgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdW07XG4gICAgfVxuICAgIHB1YmxpYyAqW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxTdHJ1Y3RbJ1RWYWx1ZSddPiB7XG4gICAgICAgIC8vIGlubGluZWQgdmVyc2lvbiBvZiB0aGlzOlxuICAgICAgICAvLyB0aGlzLnBhcmVudC5zY2FuKChpZHgsIGNvbHVtbnMpID0+IHtcbiAgICAgICAgLy8gICAgIGlmICh0aGlzLnByZWRpY2F0ZShpZHgsIGNvbHVtbnMpKSBuZXh0KGlkeCwgY29sdW1ucyk7XG4gICAgICAgIC8vIH0pO1xuICAgICAgICBjb25zdCBiYXRjaGVzID0gdGhpcy5iYXRjaGVzO1xuICAgICAgICBjb25zdCBudW1CYXRjaGVzID0gYmF0Y2hlcy5sZW5ndGg7XG4gICAgICAgIGZvciAobGV0IGJhdGNoSW5kZXggPSAtMTsgKytiYXRjaEluZGV4IDwgbnVtQmF0Y2hlczspIHtcbiAgICAgICAgICAgIC8vIGxvYWQgYmF0Y2hlc1xuICAgICAgICAgICAgY29uc3QgYmF0Y2ggPSBiYXRjaGVzW2JhdGNoSW5kZXhdO1xuICAgICAgICAgICAgLy8gVE9ETzogYmluZCBiYXRjaGVzIGxhemlseVxuICAgICAgICAgICAgLy8gSWYgcHJlZGljYXRlIGRvZXNuJ3QgbWF0Y2ggYW55dGhpbmcgaW4gdGhlIGJhdGNoIHdlIGRvbid0IG5lZWRcbiAgICAgICAgICAgIC8vIHRvIGJpbmQgdGhlIGNhbGxiYWNrXG4gICAgICAgICAgICBjb25zdCBwcmVkaWNhdGUgPSB0aGlzLnByZWRpY2F0ZS5iaW5kKGJhdGNoKTtcbiAgICAgICAgICAgIC8vIHlpZWxkIGFsbCBpbmRpY2VzXG4gICAgICAgICAgICBmb3IgKGxldCBpbmRleCA9IC0xLCBudW1Sb3dzID0gYmF0Y2gubGVuZ3RoOyArK2luZGV4IDwgbnVtUm93czspIHtcbiAgICAgICAgICAgICAgICBpZiAocHJlZGljYXRlKGluZGV4LCBiYXRjaCkpIHsgeWllbGQgYmF0Y2guZ2V0KGluZGV4KSBhcyBhbnk7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBwdWJsaWMgZmlsdGVyKHByZWRpY2F0ZTogUHJlZGljYXRlKTogRGF0YUZyYW1lIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGaWx0ZXJlZERhdGFGcmFtZShcbiAgICAgICAgICAgIHRoaXMuYmF0Y2hlcyxcbiAgICAgICAgICAgIHRoaXMucHJlZGljYXRlLmFuZChwcmVkaWNhdGUpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHB1YmxpYyBjb3VudEJ5KG5hbWU6IENvbCB8IHN0cmluZyk6IENvdW50QnlSZXN1bHQge1xuICAgICAgICBjb25zdCBiYXRjaGVzID0gdGhpcy5iYXRjaGVzLCBudW1CYXRjaGVzID0gYmF0Y2hlcy5sZW5ndGg7XG4gICAgICAgIGNvbnN0IGNvdW50X2J5ID0gdHlwZW9mIG5hbWUgPT09ICdzdHJpbmcnID8gbmV3IENvbChuYW1lKSA6IG5hbWU7XG4gICAgICAgIC8vIEFzc3VtZSB0aGF0IGFsbCBkaWN0aW9uYXJ5IGJhdGNoZXMgYXJlIGRlbHRhcywgd2hpY2ggbWVhbnMgdGhhdCB0aGVcbiAgICAgICAgLy8gbGFzdCByZWNvcmQgYmF0Y2ggaGFzIHRoZSBtb3N0IGNvbXBsZXRlIGRpY3Rpb25hcnlcbiAgICAgICAgY291bnRfYnkuYmluZChiYXRjaGVzW251bUJhdGNoZXMgLSAxXSk7XG4gICAgICAgIGNvbnN0IHZlY3RvciA9IGNvdW50X2J5LnZlY3RvciBhcyBEaWN0aW9uYXJ5VmVjdG9yO1xuICAgICAgICBpZiAoISh2ZWN0b3IgaW5zdGFuY2VvZiBEaWN0aW9uYXJ5VmVjdG9yKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VudEJ5IGN1cnJlbnRseSBvbmx5IHN1cHBvcnRzIGRpY3Rpb25hcnktZW5jb2RlZCBjb2x1bW5zJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVE9ETzogQWRqdXN0IGFycmF5IGJ5dGUgd2lkdGggYmFzZWQgb24gb3ZlcmFsbCBsZW5ndGhcbiAgICAgICAgLy8gKGUuZy4gaWYgdGhpcy5sZW5ndGggPD0gMjU1IHVzZSBVaW50OEFycmF5LCBldGMuLi4pXG4gICAgICAgIGNvbnN0IGNvdW50czogVWludDMyQXJyYXkgPSBuZXcgVWludDMyQXJyYXkodmVjdG9yLmRpY3Rpb25hcnkubGVuZ3RoKTtcbiAgICAgICAgZm9yIChsZXQgYmF0Y2hJbmRleCA9IC0xOyArK2JhdGNoSW5kZXggPCBudW1CYXRjaGVzOykge1xuICAgICAgICAgICAgLy8gbG9hZCBiYXRjaGVzXG4gICAgICAgICAgICBjb25zdCBiYXRjaCA9IGJhdGNoZXNbYmF0Y2hJbmRleF07XG4gICAgICAgICAgICBjb25zdCBwcmVkaWNhdGUgPSB0aGlzLnByZWRpY2F0ZS5iaW5kKGJhdGNoKTtcbiAgICAgICAgICAgIC8vIHJlYmluZCB0aGUgY291bnRCeSBDb2xcbiAgICAgICAgICAgIGNvdW50X2J5LmJpbmQoYmF0Y2gpO1xuICAgICAgICAgICAgY29uc3Qga2V5cyA9IChjb3VudF9ieS52ZWN0b3IgYXMgRGljdGlvbmFyeVZlY3RvcikuaW5kaWNlcztcbiAgICAgICAgICAgIC8vIHlpZWxkIGFsbCBpbmRpY2VzXG4gICAgICAgICAgICBmb3IgKGxldCBpbmRleCA9IC0xLCBudW1Sb3dzID0gYmF0Y2gubGVuZ3RoOyArK2luZGV4IDwgbnVtUm93czspIHtcbiAgICAgICAgICAgICAgICBsZXQga2V5ID0ga2V5cy5nZXQoaW5kZXgpO1xuICAgICAgICAgICAgICAgIGlmIChrZXkgIT09IG51bGwgJiYgcHJlZGljYXRlKGluZGV4LCBiYXRjaCkpIHsgY291bnRzW2tleV0rKzsgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgQ291bnRCeVJlc3VsdCh2ZWN0b3IuZGljdGlvbmFyeSwgSW50VmVjdG9yLmZyb20oY291bnRzKSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgQ291bnRCeVJlc3VsdCBleHRlbmRzIFRhYmxlIGltcGxlbWVudHMgRGF0YUZyYW1lIHtcbiAgICBjb25zdHJ1Y3Rvcih2YWx1ZXM6IFZlY3RvciwgY291bnRzOiBJbnRWZWN0b3I8YW55Pikge1xuICAgICAgICBzdXBlcihcbiAgICAgICAgICAgIG5ldyBSZWNvcmRCYXRjaChuZXcgU2NoZW1hKFtcbiAgICAgICAgICAgICAgICBuZXcgRmllbGQoJ3ZhbHVlcycsIHZhbHVlcy50eXBlKSxcbiAgICAgICAgICAgICAgICBuZXcgRmllbGQoJ2NvdW50cycsIGNvdW50cy50eXBlKVxuICAgICAgICAgICAgXSksXG4gICAgICAgICAgICBjb3VudHMubGVuZ3RoLCBbdmFsdWVzLCBjb3VudHNdXG4gICAgICAgICkpO1xuICAgIH1cbiAgICBwdWJsaWMgdG9KU09OKCk6IE9iamVjdCB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IHRoaXMuZ2V0Q29sdW1uQXQoMCkhO1xuICAgICAgICBjb25zdCBjb3VudHMgPSB0aGlzLmdldENvbHVtbkF0KDEpITtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0ge30gYXMgeyBbazogc3RyaW5nXTogbnVtYmVyIHwgbnVsbCB9O1xuICAgICAgICBmb3IgKGxldCBpID0gLTE7ICsraSA8IHRoaXMubGVuZ3RoOykge1xuICAgICAgICAgICAgcmVzdWx0W3ZhbHVlcy5nZXQoaSldID0gY291bnRzLmdldChpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbn1cblxuZnVuY3Rpb24qIHRhYmxlUm93c1RvU3RyaW5nKHRhYmxlOiBUYWJsZSwgc2VwYXJhdG9yID0gJyB8ICcpIHtcbiAgICBsZXQgcm93T2Zmc2V0ID0gMDtcbiAgICBsZXQgZmlyc3RWYWx1ZXMgPSBbXTtcbiAgICBsZXQgbWF4Q29sdW1uV2lkdGhzOiBudW1iZXJbXSA9IFtdO1xuICAgIGxldCBpdGVyYXRvcnM6IEl0ZXJhYmxlSXRlcmF0b3I8c3RyaW5nPltdID0gW107XG4gICAgLy8gR2F0aGVyIGFsbCB0aGUgYHJvd3NUb1N0cmluZ2AgaXRlcmF0b3JzIGludG8gYSBsaXN0IGJlZm9yZSBpdGVyYXRpbmcsXG4gICAgLy8gc28gdGhhdCBgbWF4Q29sdW1uV2lkdGhzYCBpcyBmaWxsZWQgd2l0aCB0aGUgbWF4V2lkdGggZm9yIGVhY2ggY29sdW1uXG4gICAgLy8gYWNyb3NzIGFsbCBSZWNvcmRCYXRjaGVzLlxuICAgIGZvciAoY29uc3QgYmF0Y2ggb2YgdGFibGUuYmF0Y2hlcykge1xuICAgICAgICBjb25zdCBpdGVyYXRvciA9IGJhdGNoLnJvd3NUb1N0cmluZyhzZXBhcmF0b3IsIHJvd09mZnNldCwgbWF4Q29sdW1uV2lkdGhzKTtcbiAgICAgICAgY29uc3QgeyBkb25lLCB2YWx1ZSB9ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICBpZiAoIWRvbmUpIHtcbiAgICAgICAgICAgIGZpcnN0VmFsdWVzLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgaXRlcmF0b3JzLnB1c2goaXRlcmF0b3IpO1xuICAgICAgICAgICAgcm93T2Zmc2V0ICs9IGJhdGNoLmxlbmd0aDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IGl0ZXJhdG9yIG9mIGl0ZXJhdG9ycykge1xuICAgICAgICB5aWVsZCBmaXJzdFZhbHVlcy5zaGlmdCgpO1xuICAgICAgICB5aWVsZCogaXRlcmF0b3I7XG4gICAgfVxufVxuIl19

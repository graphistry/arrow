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
        let schema = null;
        if (args[0] instanceof type_1.Schema) {
            schema = args.shift();
        }
        let batches = args.reduce(function flatten(xs, x) {
            return Array.isArray(x) ? x.reduce(flatten, xs) : [...xs, x];
        }, []).filter((x) => x instanceof recordbatch_1.RecordBatch);
        if (!schema && !(schema = batches[0] && batches[0].schema)) {
            throw new TypeError('Table must be initialized with a Schema or at least one RecordBatch with a Schema');
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFDO1NBQ3pDO1FBQ0QsT0FBTyxNQUFNLENBQUM7SUFDbEIsQ0FBQztDQUNKO0FBbkJELHNDQW1CQztBQUVELFFBQVEsQ0FBQyxtQkFBbUIsS0FBWSxFQUFFLFNBQVMsR0FBRyxLQUFLO0lBQ3ZELElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztJQUNsQixJQUFJLFdBQVcsR0FBRyxFQUFFLENBQUM7SUFDckIsSUFBSSxlQUFlLEdBQWEsRUFBRSxDQUFDO0lBQ25DLElBQUksU0FBUyxHQUErQixFQUFFLENBQUM7SUFDL0Msd0VBQXdFO0lBQ3hFLHdFQUF3RTtJQUN4RSw0QkFBNEI7SUFDNUIsS0FBSyxNQUFNLEtBQUssSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFO1FBQy9CLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUMzRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN4QyxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ1AsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN4QixTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3pCLFNBQVMsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDO1NBQzdCO0tBQ0o7SUFDRCxLQUFLLE1BQU0sUUFBUSxJQUFJLFNBQVMsRUFBRTtRQUM5QixNQUFNLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUMxQixLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUM7S0FDbkI7QUFDTCxDQUFDIiwiZmlsZSI6InRhYmxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IFJlY29yZEJhdGNoIH0gZnJvbSAnLi9yZWNvcmRiYXRjaCc7XG5pbXBvcnQgeyBDb2wsIFByZWRpY2F0ZSB9IGZyb20gJy4vcHJlZGljYXRlJztcbmltcG9ydCB7IFNjaGVtYSwgRmllbGQsIFN0cnVjdCB9IGZyb20gJy4vdHlwZSc7XG5pbXBvcnQgeyByZWFkLCByZWFkQXN5bmMgfSBmcm9tICcuL2lwYy9yZWFkZXIvYXJyb3cnO1xuaW1wb3J0IHsgd3JpdGVUYWJsZUJpbmFyeSB9IGZyb20gJy4vaXBjL3dyaXRlci9hcnJvdyc7XG5pbXBvcnQgeyBQaXBlSXRlcmF0b3IgfSBmcm9tICcuL3V0aWwvbm9kZSc7XG5pbXBvcnQgeyBpc1Byb21pc2UsIGlzQXN5bmNJdGVyYWJsZSB9IGZyb20gJy4vdXRpbC9jb21wYXQnO1xuaW1wb3J0IHsgVmVjdG9yLCBEaWN0aW9uYXJ5VmVjdG9yLCBJbnRWZWN0b3IsIFN0cnVjdFZlY3RvciB9IGZyb20gJy4vdmVjdG9yJztcbmltcG9ydCB7IENodW5rZWRWaWV3IH0gZnJvbSAnLi92ZWN0b3IvY2h1bmtlZCc7XG5cbmV4cG9ydCB0eXBlIE5leHRGdW5jID0gKGlkeDogbnVtYmVyLCBiYXRjaDogUmVjb3JkQmF0Y2gpID0+IHZvaWQ7XG5leHBvcnQgdHlwZSBCaW5kRnVuYyA9IChiYXRjaDogUmVjb3JkQmF0Y2gpID0+IHZvaWQ7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGF0YUZyYW1lIHtcbiAgICBjb3VudCgpOiBudW1iZXI7XG4gICAgZmlsdGVyKHByZWRpY2F0ZTogUHJlZGljYXRlKTogRGF0YUZyYW1lO1xuICAgIHNjYW4obmV4dDogTmV4dEZ1bmMsIGJpbmQ/OiBCaW5kRnVuYyk6IHZvaWQ7XG4gICAgY291bnRCeShjb2w6IChDb2x8c3RyaW5nKSk6IENvdW50QnlSZXN1bHQ7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxTdHJ1Y3RbJ1RWYWx1ZSddPjtcbn1cblxuZXhwb3J0IGNsYXNzIFRhYmxlIGltcGxlbWVudHMgRGF0YUZyYW1lIHtcbiAgICBzdGF0aWMgZW1wdHkoKSB7IHJldHVybiBuZXcgVGFibGUobmV3IFNjaGVtYShbXSksIFtdKTsgfVxuICAgIHN0YXRpYyBmcm9tKHNvdXJjZXM/OiBJdGVyYWJsZTxVaW50OEFycmF5IHwgQnVmZmVyIHwgc3RyaW5nPiB8IG9iamVjdCB8IHN0cmluZykge1xuICAgICAgICBpZiAoc291cmNlcykge1xuICAgICAgICAgICAgbGV0IHNjaGVtYTogU2NoZW1hIHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgbGV0IHJlY29yZEJhdGNoZXM6IFJlY29yZEJhdGNoW10gPSBbXTtcbiAgICAgICAgICAgIGZvciAobGV0IHJlY29yZEJhdGNoIG9mIHJlYWQoc291cmNlcykpIHtcbiAgICAgICAgICAgICAgICBzY2hlbWEgPSBzY2hlbWEgfHwgcmVjb3JkQmF0Y2guc2NoZW1hO1xuICAgICAgICAgICAgICAgIHJlY29yZEJhdGNoZXMucHVzaChyZWNvcmRCYXRjaCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbmV3IFRhYmxlKHNjaGVtYSB8fCBuZXcgU2NoZW1hKFtdKSwgcmVjb3JkQmF0Y2hlcyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFRhYmxlLmVtcHR5KCk7XG4gICAgfVxuICAgIHN0YXRpYyBhc3luYyBmcm9tQXN5bmMoc291cmNlcz86IEFzeW5jSXRlcmFibGU8VWludDhBcnJheSB8IEJ1ZmZlciB8IHN0cmluZz4pIHtcbiAgICAgICAgaWYgKGlzQXN5bmNJdGVyYWJsZShzb3VyY2VzKSkge1xuICAgICAgICAgICAgbGV0IHNjaGVtYTogU2NoZW1hIHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgbGV0IHJlY29yZEJhdGNoZXM6IFJlY29yZEJhdGNoW10gPSBbXTtcbiAgICAgICAgICAgIGZvciBhd2FpdCAobGV0IHJlY29yZEJhdGNoIG9mIHJlYWRBc3luYyhzb3VyY2VzKSkge1xuICAgICAgICAgICAgICAgIHNjaGVtYSA9IHNjaGVtYSB8fCByZWNvcmRCYXRjaC5zY2hlbWE7XG4gICAgICAgICAgICAgICAgcmVjb3JkQmF0Y2hlcy5wdXNoKHJlY29yZEJhdGNoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBuZXcgVGFibGUoc2NoZW1hIHx8IG5ldyBTY2hlbWEoW10pLCByZWNvcmRCYXRjaGVzKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1Byb21pc2Uoc291cmNlcykpIHtcbiAgICAgICAgICAgIHJldHVybiBUYWJsZS5mcm9tKGF3YWl0IHNvdXJjZXMpO1xuICAgICAgICB9IGVsc2UgaWYgKHNvdXJjZXMpIHtcbiAgICAgICAgICAgIHJldHVybiBUYWJsZS5mcm9tKHNvdXJjZXMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBUYWJsZS5lbXB0eSgpO1xuICAgIH1cbiAgICBzdGF0aWMgZnJvbVN0cnVjdChzdHJ1Y3Q6IFN0cnVjdFZlY3Rvcikge1xuICAgICAgICBjb25zdCBzY2hlbWEgPSBuZXcgU2NoZW1hKHN0cnVjdC50eXBlLmNoaWxkcmVuKTtcbiAgICAgICAgY29uc3QgY2h1bmtzID0gc3RydWN0LnZpZXcgaW5zdGFuY2VvZiBDaHVua2VkVmlldyA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKHN0cnVjdC52aWV3LmNodW5rVmVjdG9ycyBhcyBTdHJ1Y3RWZWN0b3JbXSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtzdHJ1Y3RdO1xuICAgICAgICByZXR1cm4gbmV3IFRhYmxlKGNodW5rcy5tYXAoKGNodW5rKSA9PiBuZXcgUmVjb3JkQmF0Y2goc2NoZW1hLCBjaHVuay5sZW5ndGgsIGNodW5rLnZpZXcuY2hpbGREYXRhKSkpO1xuICAgIH1cblxuICAgIHB1YmxpYyByZWFkb25seSBzY2hlbWE6IFNjaGVtYTtcbiAgICBwdWJsaWMgcmVhZG9ubHkgbGVuZ3RoOiBudW1iZXI7XG4gICAgcHVibGljIHJlYWRvbmx5IG51bUNvbHM6IG51bWJlcjtcbiAgICAvLyBMaXN0IG9mIGlubmVyIFJlY29yZEJhdGNoZXNcbiAgICBwdWJsaWMgcmVhZG9ubHkgYmF0Y2hlczogUmVjb3JkQmF0Y2hbXTtcbiAgICAvLyBMaXN0IG9mIGlubmVyIFZlY3RvcnMsIHBvc3NpYmx5IHNwYW5uaW5nIGJhdGNoZXNcbiAgICBwcm90ZWN0ZWQgcmVhZG9ubHkgX2NvbHVtbnM6IFZlY3Rvcjxhbnk+W10gPSBbXTtcbiAgICAvLyBVbmlvbiBvZiBhbGwgaW5uZXIgUmVjb3JkQmF0Y2hlcyBpbnRvIG9uZSBSZWNvcmRCYXRjaCwgcG9zc2libHkgY2h1bmtlZC5cbiAgICAvLyBJZiB0aGUgVGFibGUgaGFzIGp1c3Qgb25lIGlubmVyIFJlY29yZEJhdGNoLCB0aGlzIHBvaW50cyB0byB0aGF0LlxuICAgIC8vIElmIHRoZSBUYWJsZSBoYXMgbXVsdGlwbGUgaW5uZXIgUmVjb3JkQmF0Y2hlcywgdGhlbiB0aGlzIGlzIGEgQ2h1bmtlZCB2aWV3XG4gICAgLy8gb3ZlciB0aGUgbGlzdCBvZiBSZWNvcmRCYXRjaGVzLiBUaGlzIGFsbG93cyB1cyB0byBkZWxlZ2F0ZSB0aGUgcmVzcG9uc2liaWxpdHlcbiAgICAvLyBvZiBpbmRleGluZywgaXRlcmF0aW5nLCBzbGljaW5nLCBhbmQgdmlzaXRpbmcgdG8gdGhlIE5lc3RlZC9DaHVua2VkIERhdGEvVmlld3MuXG4gICAgcHVibGljIHJlYWRvbmx5IGJhdGNoZXNVbmlvbjogUmVjb3JkQmF0Y2g7XG5cbiAgICBjb25zdHJ1Y3RvcihiYXRjaGVzOiBSZWNvcmRCYXRjaFtdKTtcbiAgICBjb25zdHJ1Y3RvciguLi5iYXRjaGVzOiBSZWNvcmRCYXRjaFtdKTtcbiAgICBjb25zdHJ1Y3RvcihzY2hlbWE6IFNjaGVtYSwgYmF0Y2hlczogUmVjb3JkQmF0Y2hbXSk7XG4gICAgY29uc3RydWN0b3Ioc2NoZW1hOiBTY2hlbWEsIC4uLmJhdGNoZXM6IFJlY29yZEJhdGNoW10pO1xuICAgIGNvbnN0cnVjdG9yKC4uLmFyZ3M6IGFueVtdKSB7XG5cbiAgICAgICAgbGV0IHNjaGVtYTogU2NoZW1hID0gbnVsbCE7XG5cbiAgICAgICAgaWYgKGFyZ3NbMF0gaW5zdGFuY2VvZiBTY2hlbWEpIHtcbiAgICAgICAgICAgIHNjaGVtYSA9IGFyZ3Muc2hpZnQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBiYXRjaGVzID0gYXJncy5yZWR1Y2UoZnVuY3Rpb24gZmxhdHRlbih4czogYW55W10sIHg6IGFueSk6IGFueVtdIHtcbiAgICAgICAgICAgIHJldHVybiBBcnJheS5pc0FycmF5KHgpID8geC5yZWR1Y2UoZmxhdHRlbiwgeHMpIDogWy4uLnhzLCB4XTtcbiAgICAgICAgfSwgW10pLmZpbHRlcigoeDogYW55KTogeCBpcyBSZWNvcmRCYXRjaCA9PiB4IGluc3RhbmNlb2YgUmVjb3JkQmF0Y2gpO1xuXG4gICAgICAgIGlmICghc2NoZW1hICYmICEoc2NoZW1hID0gYmF0Y2hlc1swXSAmJiBiYXRjaGVzWzBdLnNjaGVtYSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RhYmxlIG11c3QgYmUgaW5pdGlhbGl6ZWQgd2l0aCBhIFNjaGVtYSBvciBhdCBsZWFzdCBvbmUgUmVjb3JkQmF0Y2ggd2l0aCBhIFNjaGVtYScpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zY2hlbWEgPSBzY2hlbWE7XG4gICAgICAgIHRoaXMuYmF0Y2hlcyA9IGJhdGNoZXM7XG4gICAgICAgIHRoaXMuYmF0Y2hlc1VuaW9uID0gYmF0Y2hlcy5sZW5ndGggPT0gMCA/XG4gICAgICAgICAgICBuZXcgUmVjb3JkQmF0Y2goc2NoZW1hLCAwLCBbXSkgOlxuICAgICAgICAgICAgYmF0Y2hlcy5yZWR1Y2UoKHVuaW9uLCBiYXRjaCkgPT4gdW5pb24uY29uY2F0KGJhdGNoKSk7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gdGhpcy5iYXRjaGVzVW5pb24ubGVuZ3RoO1xuICAgICAgICB0aGlzLm51bUNvbHMgPSB0aGlzLmJhdGNoZXNVbmlvbi5udW1Db2xzO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXQoaW5kZXg6IG51bWJlcik6IFN0cnVjdFsnVFZhbHVlJ10ge1xuICAgICAgICByZXR1cm4gdGhpcy5iYXRjaGVzVW5pb24uZ2V0KGluZGV4KSE7XG4gICAgfVxuICAgIHB1YmxpYyBnZXRDb2x1bW4obmFtZTogc3RyaW5nKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldENvbHVtbkF0KHRoaXMuZ2V0Q29sdW1uSW5kZXgobmFtZSkpO1xuICAgIH1cbiAgICBwdWJsaWMgZ2V0Q29sdW1uQXQoaW5kZXg6IG51bWJlcikge1xuICAgICAgICByZXR1cm4gaW5kZXggPCAwIHx8IGluZGV4ID49IHRoaXMubnVtQ29sc1xuICAgICAgICAgICAgPyBudWxsXG4gICAgICAgICAgICA6IHRoaXMuX2NvbHVtbnNbaW5kZXhdIHx8IChcbiAgICAgICAgICAgICAgdGhpcy5fY29sdW1uc1tpbmRleF0gPSB0aGlzLmJhdGNoZXNVbmlvbi5nZXRDaGlsZEF0KGluZGV4KSEpO1xuICAgIH1cbiAgICBwdWJsaWMgZ2V0Q29sdW1uSW5kZXgobmFtZTogc3RyaW5nKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNjaGVtYS5maWVsZHMuZmluZEluZGV4KChmKSA9PiBmLm5hbWUgPT09IG5hbWUpO1xuICAgIH1cbiAgICBwdWJsaWMgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxTdHJ1Y3RbJ1RWYWx1ZSddPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmJhdGNoZXNVbmlvbltTeW1ib2wuaXRlcmF0b3JdKCkgYXMgYW55O1xuICAgIH1cbiAgICBwdWJsaWMgZmlsdGVyKHByZWRpY2F0ZTogUHJlZGljYXRlKTogRGF0YUZyYW1lIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGaWx0ZXJlZERhdGFGcmFtZSh0aGlzLmJhdGNoZXMsIHByZWRpY2F0ZSk7XG4gICAgfVxuICAgIHB1YmxpYyBzY2FuKG5leHQ6IE5leHRGdW5jLCBiaW5kPzogQmluZEZ1bmMpIHtcbiAgICAgICAgY29uc3QgYmF0Y2hlcyA9IHRoaXMuYmF0Y2hlcywgbnVtQmF0Y2hlcyA9IGJhdGNoZXMubGVuZ3RoO1xuICAgICAgICBmb3IgKGxldCBiYXRjaEluZGV4ID0gLTE7ICsrYmF0Y2hJbmRleCA8IG51bUJhdGNoZXM7KSB7XG4gICAgICAgICAgICAvLyBsb2FkIGJhdGNoZXNcbiAgICAgICAgICAgIGNvbnN0IGJhdGNoID0gYmF0Y2hlc1tiYXRjaEluZGV4XTtcbiAgICAgICAgICAgIGlmIChiaW5kKSB7IGJpbmQoYmF0Y2gpOyB9XG4gICAgICAgICAgICAvLyB5aWVsZCBhbGwgaW5kaWNlc1xuICAgICAgICAgICAgZm9yIChsZXQgaW5kZXggPSAtMSwgbnVtUm93cyA9IGJhdGNoLmxlbmd0aDsgKytpbmRleCA8IG51bVJvd3M7KSB7XG4gICAgICAgICAgICAgICAgbmV4dChpbmRleCwgYmF0Y2gpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHB1YmxpYyBjb3VudEJ5KG5hbWU6IENvbCB8IHN0cmluZyk6IENvdW50QnlSZXN1bHQge1xuICAgICAgICBjb25zdCBiYXRjaGVzID0gdGhpcy5iYXRjaGVzLCBudW1CYXRjaGVzID0gYmF0Y2hlcy5sZW5ndGg7XG4gICAgICAgIGNvbnN0IGNvdW50X2J5ID0gdHlwZW9mIG5hbWUgPT09ICdzdHJpbmcnID8gbmV3IENvbChuYW1lKSA6IG5hbWU7XG4gICAgICAgIC8vIEFzc3VtZSB0aGF0IGFsbCBkaWN0aW9uYXJ5IGJhdGNoZXMgYXJlIGRlbHRhcywgd2hpY2ggbWVhbnMgdGhhdCB0aGVcbiAgICAgICAgLy8gbGFzdCByZWNvcmQgYmF0Y2ggaGFzIHRoZSBtb3N0IGNvbXBsZXRlIGRpY3Rpb25hcnlcbiAgICAgICAgY291bnRfYnkuYmluZChiYXRjaGVzW251bUJhdGNoZXMgLSAxXSk7XG4gICAgICAgIGNvbnN0IHZlY3RvciA9IGNvdW50X2J5LnZlY3RvciBhcyBEaWN0aW9uYXJ5VmVjdG9yO1xuICAgICAgICBpZiAoISh2ZWN0b3IgaW5zdGFuY2VvZiBEaWN0aW9uYXJ5VmVjdG9yKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VudEJ5IGN1cnJlbnRseSBvbmx5IHN1cHBvcnRzIGRpY3Rpb25hcnktZW5jb2RlZCBjb2x1bW5zJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVE9ETzogQWRqdXN0IGFycmF5IGJ5dGUgd2lkdGggYmFzZWQgb24gb3ZlcmFsbCBsZW5ndGhcbiAgICAgICAgLy8gKGUuZy4gaWYgdGhpcy5sZW5ndGggPD0gMjU1IHVzZSBVaW50OEFycmF5LCBldGMuLi4pXG4gICAgICAgIGNvbnN0IGNvdW50czogVWludDMyQXJyYXkgPSBuZXcgVWludDMyQXJyYXkodmVjdG9yLmRpY3Rpb25hcnkubGVuZ3RoKTtcbiAgICAgICAgZm9yIChsZXQgYmF0Y2hJbmRleCA9IC0xOyArK2JhdGNoSW5kZXggPCBudW1CYXRjaGVzOykge1xuICAgICAgICAgICAgLy8gbG9hZCBiYXRjaGVzXG4gICAgICAgICAgICBjb25zdCBiYXRjaCA9IGJhdGNoZXNbYmF0Y2hJbmRleF07XG4gICAgICAgICAgICAvLyByZWJpbmQgdGhlIGNvdW50QnkgQ29sXG4gICAgICAgICAgICBjb3VudF9ieS5iaW5kKGJhdGNoKTtcbiAgICAgICAgICAgIGNvbnN0IGtleXMgPSAoY291bnRfYnkudmVjdG9yIGFzIERpY3Rpb25hcnlWZWN0b3IpLmluZGljZXM7XG4gICAgICAgICAgICAvLyB5aWVsZCBhbGwgaW5kaWNlc1xuICAgICAgICAgICAgZm9yIChsZXQgaW5kZXggPSAtMSwgbnVtUm93cyA9IGJhdGNoLmxlbmd0aDsgKytpbmRleCA8IG51bVJvd3M7KSB7XG4gICAgICAgICAgICAgICAgbGV0IGtleSA9IGtleXMuZ2V0KGluZGV4KTtcbiAgICAgICAgICAgICAgICBpZiAoa2V5ICE9PSBudWxsKSB7IGNvdW50c1trZXldKys7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IENvdW50QnlSZXN1bHQodmVjdG9yLmRpY3Rpb25hcnksIEludFZlY3Rvci5mcm9tKGNvdW50cykpO1xuICAgIH1cbiAgICBwdWJsaWMgY291bnQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubGVuZ3RoO1xuICAgIH1cbiAgICBwdWJsaWMgc2VsZWN0KC4uLmNvbHVtbk5hbWVzOiBzdHJpbmdbXSkge1xuICAgICAgICByZXR1cm4gbmV3IFRhYmxlKHRoaXMuYmF0Y2hlcy5tYXAoKGJhdGNoKSA9PiBiYXRjaC5zZWxlY3QoLi4uY29sdW1uTmFtZXMpKSk7XG4gICAgfVxuICAgIHB1YmxpYyB0b1N0cmluZyhzZXBhcmF0b3I/OiBzdHJpbmcpIHtcbiAgICAgICAgbGV0IHN0ciA9ICcnO1xuICAgICAgICBmb3IgKGNvbnN0IHJvdyBvZiB0aGlzLnJvd3NUb1N0cmluZyhzZXBhcmF0b3IpKSB7XG4gICAgICAgICAgICBzdHIgKz0gcm93ICsgJ1xcbic7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyBzZXJpYWxpemUoZW5jb2RpbmcgPSAnYmluYXJ5Jywgc3RyZWFtID0gdHJ1ZSkge1xuICAgICAgICByZXR1cm4gd3JpdGVUYWJsZUJpbmFyeSh0aGlzLCBzdHJlYW0pO1xuICAgIH1cbiAgICBwdWJsaWMgcm93c1RvU3RyaW5nKHNlcGFyYXRvciA9ICcgfCAnKSB7XG4gICAgICAgIHJldHVybiBuZXcgUGlwZUl0ZXJhdG9yKHRhYmxlUm93c1RvU3RyaW5nKHRoaXMsIHNlcGFyYXRvciksICd1dGY4Jyk7XG4gICAgfVxufVxuXG5jbGFzcyBGaWx0ZXJlZERhdGFGcmFtZSBpbXBsZW1lbnRzIERhdGFGcmFtZSB7XG4gICAgcHJpdmF0ZSBwcmVkaWNhdGU6IFByZWRpY2F0ZTtcbiAgICBwcml2YXRlIGJhdGNoZXM6IFJlY29yZEJhdGNoW107XG4gICAgY29uc3RydWN0b3IgKGJhdGNoZXM6IFJlY29yZEJhdGNoW10sIHByZWRpY2F0ZTogUHJlZGljYXRlKSB7XG4gICAgICAgIHRoaXMuYmF0Y2hlcyA9IGJhdGNoZXM7XG4gICAgICAgIHRoaXMucHJlZGljYXRlID0gcHJlZGljYXRlO1xuICAgIH1cbiAgICBwdWJsaWMgc2NhbihuZXh0OiBOZXh0RnVuYywgYmluZD86IEJpbmRGdW5jKSB7XG4gICAgICAgIC8vIGlubGluZWQgdmVyc2lvbiBvZiB0aGlzOlxuICAgICAgICAvLyB0aGlzLnBhcmVudC5zY2FuKChpZHgsIGNvbHVtbnMpID0+IHtcbiAgICAgICAgLy8gICAgIGlmICh0aGlzLnByZWRpY2F0ZShpZHgsIGNvbHVtbnMpKSBuZXh0KGlkeCwgY29sdW1ucyk7XG4gICAgICAgIC8vIH0pO1xuICAgICAgICBjb25zdCBiYXRjaGVzID0gdGhpcy5iYXRjaGVzO1xuICAgICAgICBjb25zdCBudW1CYXRjaGVzID0gYmF0Y2hlcy5sZW5ndGg7XG4gICAgICAgIGZvciAobGV0IGJhdGNoSW5kZXggPSAtMTsgKytiYXRjaEluZGV4IDwgbnVtQmF0Y2hlczspIHtcbiAgICAgICAgICAgIC8vIGxvYWQgYmF0Y2hlc1xuICAgICAgICAgICAgY29uc3QgYmF0Y2ggPSBiYXRjaGVzW2JhdGNoSW5kZXhdO1xuICAgICAgICAgICAgLy8gVE9ETzogYmluZCBiYXRjaGVzIGxhemlseVxuICAgICAgICAgICAgLy8gSWYgcHJlZGljYXRlIGRvZXNuJ3QgbWF0Y2ggYW55dGhpbmcgaW4gdGhlIGJhdGNoIHdlIGRvbid0IG5lZWRcbiAgICAgICAgICAgIC8vIHRvIGJpbmQgdGhlIGNhbGxiYWNrXG4gICAgICAgICAgICBpZiAoYmluZCkgeyBiaW5kKGJhdGNoKTsgfVxuICAgICAgICAgICAgY29uc3QgcHJlZGljYXRlID0gdGhpcy5wcmVkaWNhdGUuYmluZChiYXRjaCk7XG4gICAgICAgICAgICAvLyB5aWVsZCBhbGwgaW5kaWNlc1xuICAgICAgICAgICAgZm9yIChsZXQgaW5kZXggPSAtMSwgbnVtUm93cyA9IGJhdGNoLmxlbmd0aDsgKytpbmRleCA8IG51bVJvd3M7KSB7XG4gICAgICAgICAgICAgICAgaWYgKHByZWRpY2F0ZShpbmRleCwgYmF0Y2gpKSB7IG5leHQoaW5kZXgsIGJhdGNoKTsgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHB1YmxpYyBjb3VudCgpOiBudW1iZXIge1xuICAgICAgICAvLyBpbmxpbmVkIHZlcnNpb24gb2YgdGhpczpcbiAgICAgICAgLy8gbGV0IHN1bSA9IDA7XG4gICAgICAgIC8vIHRoaXMucGFyZW50LnNjYW4oKGlkeCwgY29sdW1ucykgPT4ge1xuICAgICAgICAvLyAgICAgaWYgKHRoaXMucHJlZGljYXRlKGlkeCwgY29sdW1ucykpICsrc3VtO1xuICAgICAgICAvLyB9KTtcbiAgICAgICAgLy8gcmV0dXJuIHN1bTtcbiAgICAgICAgbGV0IHN1bSA9IDA7XG4gICAgICAgIGNvbnN0IGJhdGNoZXMgPSB0aGlzLmJhdGNoZXM7XG4gICAgICAgIGNvbnN0IG51bUJhdGNoZXMgPSBiYXRjaGVzLmxlbmd0aDtcbiAgICAgICAgZm9yIChsZXQgYmF0Y2hJbmRleCA9IC0xOyArK2JhdGNoSW5kZXggPCBudW1CYXRjaGVzOykge1xuICAgICAgICAgICAgLy8gbG9hZCBiYXRjaGVzXG4gICAgICAgICAgICBjb25zdCBiYXRjaCA9IGJhdGNoZXNbYmF0Y2hJbmRleF07XG4gICAgICAgICAgICBjb25zdCBwcmVkaWNhdGUgPSB0aGlzLnByZWRpY2F0ZS5iaW5kKGJhdGNoKTtcbiAgICAgICAgICAgIC8vIHlpZWxkIGFsbCBpbmRpY2VzXG4gICAgICAgICAgICBmb3IgKGxldCBpbmRleCA9IC0xLCBudW1Sb3dzID0gYmF0Y2gubGVuZ3RoOyArK2luZGV4IDwgbnVtUm93czspIHtcbiAgICAgICAgICAgICAgICBpZiAocHJlZGljYXRlKGluZGV4LCBiYXRjaCkpIHsgKytzdW07IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3VtO1xuICAgIH1cbiAgICBwdWJsaWMgKltTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8U3RydWN0WydUVmFsdWUnXT4ge1xuICAgICAgICAvLyBpbmxpbmVkIHZlcnNpb24gb2YgdGhpczpcbiAgICAgICAgLy8gdGhpcy5wYXJlbnQuc2NhbigoaWR4LCBjb2x1bW5zKSA9PiB7XG4gICAgICAgIC8vICAgICBpZiAodGhpcy5wcmVkaWNhdGUoaWR4LCBjb2x1bW5zKSkgbmV4dChpZHgsIGNvbHVtbnMpO1xuICAgICAgICAvLyB9KTtcbiAgICAgICAgY29uc3QgYmF0Y2hlcyA9IHRoaXMuYmF0Y2hlcztcbiAgICAgICAgY29uc3QgbnVtQmF0Y2hlcyA9IGJhdGNoZXMubGVuZ3RoO1xuICAgICAgICBmb3IgKGxldCBiYXRjaEluZGV4ID0gLTE7ICsrYmF0Y2hJbmRleCA8IG51bUJhdGNoZXM7KSB7XG4gICAgICAgICAgICAvLyBsb2FkIGJhdGNoZXNcbiAgICAgICAgICAgIGNvbnN0IGJhdGNoID0gYmF0Y2hlc1tiYXRjaEluZGV4XTtcbiAgICAgICAgICAgIC8vIFRPRE86IGJpbmQgYmF0Y2hlcyBsYXppbHlcbiAgICAgICAgICAgIC8vIElmIHByZWRpY2F0ZSBkb2Vzbid0IG1hdGNoIGFueXRoaW5nIGluIHRoZSBiYXRjaCB3ZSBkb24ndCBuZWVkXG4gICAgICAgICAgICAvLyB0byBiaW5kIHRoZSBjYWxsYmFja1xuICAgICAgICAgICAgY29uc3QgcHJlZGljYXRlID0gdGhpcy5wcmVkaWNhdGUuYmluZChiYXRjaCk7XG4gICAgICAgICAgICAvLyB5aWVsZCBhbGwgaW5kaWNlc1xuICAgICAgICAgICAgZm9yIChsZXQgaW5kZXggPSAtMSwgbnVtUm93cyA9IGJhdGNoLmxlbmd0aDsgKytpbmRleCA8IG51bVJvd3M7KSB7XG4gICAgICAgICAgICAgICAgaWYgKHByZWRpY2F0ZShpbmRleCwgYmF0Y2gpKSB7IHlpZWxkIGJhdGNoLmdldChpbmRleCkgYXMgYW55OyB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcHVibGljIGZpbHRlcihwcmVkaWNhdGU6IFByZWRpY2F0ZSk6IERhdGFGcmFtZSB7XG4gICAgICAgIHJldHVybiBuZXcgRmlsdGVyZWREYXRhRnJhbWUoXG4gICAgICAgICAgICB0aGlzLmJhdGNoZXMsXG4gICAgICAgICAgICB0aGlzLnByZWRpY2F0ZS5hbmQocHJlZGljYXRlKVxuICAgICAgICApO1xuICAgIH1cbiAgICBwdWJsaWMgY291bnRCeShuYW1lOiBDb2wgfCBzdHJpbmcpOiBDb3VudEJ5UmVzdWx0IHtcbiAgICAgICAgY29uc3QgYmF0Y2hlcyA9IHRoaXMuYmF0Y2hlcywgbnVtQmF0Y2hlcyA9IGJhdGNoZXMubGVuZ3RoO1xuICAgICAgICBjb25zdCBjb3VudF9ieSA9IHR5cGVvZiBuYW1lID09PSAnc3RyaW5nJyA/IG5ldyBDb2wobmFtZSkgOiBuYW1lO1xuICAgICAgICAvLyBBc3N1bWUgdGhhdCBhbGwgZGljdGlvbmFyeSBiYXRjaGVzIGFyZSBkZWx0YXMsIHdoaWNoIG1lYW5zIHRoYXQgdGhlXG4gICAgICAgIC8vIGxhc3QgcmVjb3JkIGJhdGNoIGhhcyB0aGUgbW9zdCBjb21wbGV0ZSBkaWN0aW9uYXJ5XG4gICAgICAgIGNvdW50X2J5LmJpbmQoYmF0Y2hlc1tudW1CYXRjaGVzIC0gMV0pO1xuICAgICAgICBjb25zdCB2ZWN0b3IgPSBjb3VudF9ieS52ZWN0b3IgYXMgRGljdGlvbmFyeVZlY3RvcjtcbiAgICAgICAgaWYgKCEodmVjdG9yIGluc3RhbmNlb2YgRGljdGlvbmFyeVZlY3RvcikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY291bnRCeSBjdXJyZW50bHkgb25seSBzdXBwb3J0cyBkaWN0aW9uYXJ5LWVuY29kZWQgY29sdW1ucycpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRPRE86IEFkanVzdCBhcnJheSBieXRlIHdpZHRoIGJhc2VkIG9uIG92ZXJhbGwgbGVuZ3RoXG4gICAgICAgIC8vIChlLmcuIGlmIHRoaXMubGVuZ3RoIDw9IDI1NSB1c2UgVWludDhBcnJheSwgZXRjLi4uKVxuICAgICAgICBjb25zdCBjb3VudHM6IFVpbnQzMkFycmF5ID0gbmV3IFVpbnQzMkFycmF5KHZlY3Rvci5kaWN0aW9uYXJ5Lmxlbmd0aCk7XG4gICAgICAgIGZvciAobGV0IGJhdGNoSW5kZXggPSAtMTsgKytiYXRjaEluZGV4IDwgbnVtQmF0Y2hlczspIHtcbiAgICAgICAgICAgIC8vIGxvYWQgYmF0Y2hlc1xuICAgICAgICAgICAgY29uc3QgYmF0Y2ggPSBiYXRjaGVzW2JhdGNoSW5kZXhdO1xuICAgICAgICAgICAgY29uc3QgcHJlZGljYXRlID0gdGhpcy5wcmVkaWNhdGUuYmluZChiYXRjaCk7XG4gICAgICAgICAgICAvLyByZWJpbmQgdGhlIGNvdW50QnkgQ29sXG4gICAgICAgICAgICBjb3VudF9ieS5iaW5kKGJhdGNoKTtcbiAgICAgICAgICAgIGNvbnN0IGtleXMgPSAoY291bnRfYnkudmVjdG9yIGFzIERpY3Rpb25hcnlWZWN0b3IpLmluZGljZXM7XG4gICAgICAgICAgICAvLyB5aWVsZCBhbGwgaW5kaWNlc1xuICAgICAgICAgICAgZm9yIChsZXQgaW5kZXggPSAtMSwgbnVtUm93cyA9IGJhdGNoLmxlbmd0aDsgKytpbmRleCA8IG51bVJvd3M7KSB7XG4gICAgICAgICAgICAgICAgbGV0IGtleSA9IGtleXMuZ2V0KGluZGV4KTtcbiAgICAgICAgICAgICAgICBpZiAoa2V5ICE9PSBudWxsICYmIHByZWRpY2F0ZShpbmRleCwgYmF0Y2gpKSB7IGNvdW50c1trZXldKys7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IENvdW50QnlSZXN1bHQodmVjdG9yLmRpY3Rpb25hcnksIEludFZlY3Rvci5mcm9tKGNvdW50cykpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIENvdW50QnlSZXN1bHQgZXh0ZW5kcyBUYWJsZSBpbXBsZW1lbnRzIERhdGFGcmFtZSB7XG4gICAgY29uc3RydWN0b3IodmFsdWVzOiBWZWN0b3IsIGNvdW50czogSW50VmVjdG9yPGFueT4pIHtcbiAgICAgICAgc3VwZXIoXG4gICAgICAgICAgICBuZXcgUmVjb3JkQmF0Y2gobmV3IFNjaGVtYShbXG4gICAgICAgICAgICAgICAgbmV3IEZpZWxkKCd2YWx1ZXMnLCB2YWx1ZXMudHlwZSksXG4gICAgICAgICAgICAgICAgbmV3IEZpZWxkKCdjb3VudHMnLCBjb3VudHMudHlwZSlcbiAgICAgICAgICAgIF0pLFxuICAgICAgICAgICAgY291bnRzLmxlbmd0aCwgW3ZhbHVlcywgY291bnRzXVxuICAgICAgICApKTtcbiAgICB9XG4gICAgcHVibGljIHRvSlNPTigpOiBPYmplY3Qge1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSB0aGlzLmdldENvbHVtbkF0KDApITtcbiAgICAgICAgY29uc3QgY291bnRzID0gdGhpcy5nZXRDb2x1bW5BdCgxKSE7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHt9IGFzIHsgW2s6IHN0cmluZ106IG51bWJlciB8IG51bGwgfTtcbiAgICAgICAgZm9yIChsZXQgaSA9IC0xOyArK2kgPCB0aGlzLmxlbmd0aDspIHtcbiAgICAgICAgICAgIHJlc3VsdFt2YWx1ZXMuZ2V0KGkpXSA9IGNvdW50cy5nZXQoaSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG59XG5cbmZ1bmN0aW9uKiB0YWJsZVJvd3NUb1N0cmluZyh0YWJsZTogVGFibGUsIHNlcGFyYXRvciA9ICcgfCAnKSB7XG4gICAgbGV0IHJvd09mZnNldCA9IDA7XG4gICAgbGV0IGZpcnN0VmFsdWVzID0gW107XG4gICAgbGV0IG1heENvbHVtbldpZHRoczogbnVtYmVyW10gPSBbXTtcbiAgICBsZXQgaXRlcmF0b3JzOiBJdGVyYWJsZUl0ZXJhdG9yPHN0cmluZz5bXSA9IFtdO1xuICAgIC8vIEdhdGhlciBhbGwgdGhlIGByb3dzVG9TdHJpbmdgIGl0ZXJhdG9ycyBpbnRvIGEgbGlzdCBiZWZvcmUgaXRlcmF0aW5nLFxuICAgIC8vIHNvIHRoYXQgYG1heENvbHVtbldpZHRoc2AgaXMgZmlsbGVkIHdpdGggdGhlIG1heFdpZHRoIGZvciBlYWNoIGNvbHVtblxuICAgIC8vIGFjcm9zcyBhbGwgUmVjb3JkQmF0Y2hlcy5cbiAgICBmb3IgKGNvbnN0IGJhdGNoIG9mIHRhYmxlLmJhdGNoZXMpIHtcbiAgICAgICAgY29uc3QgaXRlcmF0b3IgPSBiYXRjaC5yb3dzVG9TdHJpbmcoc2VwYXJhdG9yLCByb3dPZmZzZXQsIG1heENvbHVtbldpZHRocyk7XG4gICAgICAgIGNvbnN0IHsgZG9uZSwgdmFsdWUgfSA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgaWYgKCFkb25lKSB7XG4gICAgICAgICAgICBmaXJzdFZhbHVlcy5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIGl0ZXJhdG9ycy5wdXNoKGl0ZXJhdG9yKTtcbiAgICAgICAgICAgIHJvd09mZnNldCArPSBiYXRjaC5sZW5ndGg7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBpdGVyYXRvciBvZiBpdGVyYXRvcnMpIHtcbiAgICAgICAgeWllbGQgZmlyc3RWYWx1ZXMuc2hpZnQoKTtcbiAgICAgICAgeWllbGQqIGl0ZXJhdG9yO1xuICAgIH1cbn1cbiJdfQ==

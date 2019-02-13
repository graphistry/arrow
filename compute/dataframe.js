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
const table_1 = require("../table");
const int_1 = require("../vector/int");
const schema_1 = require("../schema");
const predicate_1 = require("./predicate");
const recordbatch_1 = require("../recordbatch");
const type_1 = require("../type");
table_1.Table.prototype.countBy = function (name) { return new DataFrame(this.chunks).countBy(name); };
table_1.Table.prototype.scan = function (next, bind) { return new DataFrame(this.chunks).scan(next, bind); };
table_1.Table.prototype.filter = function (predicate) { return new DataFrame(this.chunks).filter(predicate); };
class DataFrame extends table_1.Table {
    filter(predicate) {
        return new FilteredDataFrame(this.chunks, predicate);
    }
    scan(next, bind) {
        const batches = this.chunks, numBatches = batches.length;
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
        const batches = this.chunks, numBatches = batches.length;
        const count_by = typeof name === 'string' ? new predicate_1.Col(name) : name;
        // Assume that all dictionary batches are deltas, which means that the
        // last record batch has the most complete dictionary
        count_by.bind(batches[numBatches - 1]);
        const vector = count_by.vector;
        if (!type_1.DataType.isDictionary(vector.type)) {
            throw new Error('countBy currently only supports dictionary-encoded columns');
        }
        const countByteLength = Math.ceil(Math.log(vector.dictionary.length) / Math.log(256));
        const CountsArrayType = countByteLength == 4 ? Uint32Array :
            countByteLength >= 2 ? Uint16Array : Uint8Array;
        const counts = new CountsArrayType(vector.dictionary.length);
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
        return new CountByResult(vector.dictionary, int_1.IntVector.from(counts));
    }
}
exports.DataFrame = DataFrame;
class CountByResult extends table_1.Table {
    constructor(values, counts) {
        const schema = new schema_1.Schema([
            new schema_1.Field('values', values.type),
            new schema_1.Field('counts', counts.type)
        ]);
        super(new recordbatch_1.RecordBatch(schema, counts.length, [values, counts]));
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
class FilteredDataFrame extends DataFrame {
    constructor(batches, predicate) {
        super(batches);
        this._predicate = predicate;
    }
    scan(next, bind) {
        // inlined version of this:
        // this.parent.scan((idx, columns) => {
        //     if (this.predicate(idx, columns)) next(idx, columns);
        // });
        const batches = this._chunks;
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
            const predicate = this._predicate.bind(batch);
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
        const batches = this._chunks;
        const numBatches = batches.length;
        for (let batchIndex = -1; ++batchIndex < numBatches;) {
            // load batches
            const batch = batches[batchIndex];
            const predicate = this._predicate.bind(batch);
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
        const batches = this._chunks;
        const numBatches = batches.length;
        for (let batchIndex = -1; ++batchIndex < numBatches;) {
            // load batches
            const batch = batches[batchIndex];
            // TODO: bind batches lazily
            // If predicate doesn't match anything in the batch we don't need
            // to bind the callback
            const predicate = this._predicate.bind(batch);
            // yield all indices
            for (let index = -1, numRows = batch.length; ++index < numRows;) {
                if (predicate(index, batch)) {
                    yield batch.get(index);
                }
            }
        }
    }
    filter(predicate) {
        return new FilteredDataFrame(this._chunks, this._predicate.and(predicate));
    }
    countBy(name) {
        const batches = this._chunks, numBatches = batches.length;
        const count_by = typeof name === 'string' ? new predicate_1.Col(name) : name;
        // Assume that all dictionary batches are deltas, which means that the
        // last record batch has the most complete dictionary
        count_by.bind(batches[numBatches - 1]);
        const vector = count_by.vector;
        if (!type_1.DataType.isDictionary(vector.type)) {
            throw new Error('countBy currently only supports dictionary-encoded columns');
        }
        const countByteLength = Math.ceil(Math.log(vector.dictionary.length) / Math.log(256));
        const CountsArrayType = countByteLength == 4 ? Uint32Array :
            countByteLength >= 2 ? Uint16Array : Uint8Array;
        const counts = new CountsArrayType(vector.dictionary.length);
        for (let batchIndex = -1; ++batchIndex < numBatches;) {
            // load batches
            const batch = batches[batchIndex];
            const predicate = this._predicate.bind(batch);
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
        return new CountByResult(vector.dictionary, int_1.IntVector.from(counts));
    }
}
exports.FilteredDataFrame = FilteredDataFrame;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LE1BQU0sTUFBTSxHQUFHLElBQUksZUFBZSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFN0QsS0FBSyxJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLFVBQVUsR0FBRyxVQUFVLEdBQUc7WUFDbEQsZUFBZTtZQUNmLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNsQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM5Qyx5QkFBeUI7WUFDekIsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNyQixNQUFNLElBQUksR0FBSSxRQUFRLENBQUMsTUFBd0IsQ0FBQyxPQUFPLENBQUM7WUFDeEQsb0JBQW9CO1lBQ3BCLEtBQUssSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUUsT0FBTyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxLQUFLLEdBQUcsT0FBTyxHQUFHO2dCQUM3RCxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUMxQixJQUFJLEdBQUcsS0FBSyxJQUFJLElBQUksU0FBUyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsRUFBRTtvQkFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztpQkFBRTthQUNsRTtTQUNKO1FBQ0QsT0FBTyxJQUFJLGFBQWEsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLGVBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUN4RSxDQUFDO0NBQ0o7QUExR0QsOENBMEdDIiwiZmlsZSI6ImNvbXB1dGUvZGF0YWZyYW1lLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IFRhYmxlIH0gZnJvbSAnLi4vdGFibGUnO1xuaW1wb3J0IHsgVmVjdG9yIH0gZnJvbSAnLi4vdmVjdG9yJztcbmltcG9ydCB7IEludFZlY3RvciB9IGZyb20gJy4uL3ZlY3Rvci9pbnQnO1xuaW1wb3J0IHsgRmllbGQsIFNjaGVtYSB9IGZyb20gJy4uL3NjaGVtYSc7XG5pbXBvcnQgeyBWZWN0b3IgYXMgViB9IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgUHJlZGljYXRlLCBDb2wgfSBmcm9tICcuL3ByZWRpY2F0ZSc7XG5pbXBvcnQgeyBSZWNvcmRCYXRjaCB9IGZyb20gJy4uL3JlY29yZGJhdGNoJztcbmltcG9ydCB7IERhdGFUeXBlLCBJbnQsIFN0cnVjdCwgRGljdGlvbmFyeSB9IGZyb20gJy4uL3R5cGUnO1xuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IHR5cGUgQmluZEZ1bmMgPSAoYmF0Y2g6IFJlY29yZEJhdGNoKSA9PiB2b2lkO1xuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCB0eXBlIE5leHRGdW5jID0gKGlkeDogbnVtYmVyLCBiYXRjaDogUmVjb3JkQmF0Y2gpID0+IHZvaWQ7XG5cblRhYmxlLnByb3RvdHlwZS5jb3VudEJ5ID0gZnVuY3Rpb24odGhpczogVGFibGUsIG5hbWU6IENvbCB8IHN0cmluZykgeyByZXR1cm4gbmV3IERhdGFGcmFtZSh0aGlzLmNodW5rcykuY291bnRCeShuYW1lKTsgfTtcblRhYmxlLnByb3RvdHlwZS5zY2FuID0gZnVuY3Rpb24odGhpczogVGFibGUsIG5leHQ6IE5leHRGdW5jLCBiaW5kPzogQmluZEZ1bmMpIHsgcmV0dXJuIG5ldyBEYXRhRnJhbWUodGhpcy5jaHVua3MpLnNjYW4obmV4dCwgYmluZCk7IH07XG5UYWJsZS5wcm90b3R5cGUuZmlsdGVyID0gZnVuY3Rpb24odGhpczogVGFibGUsIHByZWRpY2F0ZTogUHJlZGljYXRlKTogRmlsdGVyZWREYXRhRnJhbWUgeyByZXR1cm4gbmV3IERhdGFGcmFtZSh0aGlzLmNodW5rcykuZmlsdGVyKHByZWRpY2F0ZSk7IH07XG5cbmV4cG9ydCBjbGFzcyBEYXRhRnJhbWU8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4gZXh0ZW5kcyBUYWJsZTxUPiB7XG4gICAgcHVibGljIGZpbHRlcihwcmVkaWNhdGU6IFByZWRpY2F0ZSk6IEZpbHRlcmVkRGF0YUZyYW1lPFQ+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBGaWx0ZXJlZERhdGFGcmFtZTxUPih0aGlzLmNodW5rcywgcHJlZGljYXRlKTtcbiAgICB9XG4gICAgcHVibGljIHNjYW4obmV4dDogTmV4dEZ1bmMsIGJpbmQ/OiBCaW5kRnVuYykge1xuICAgICAgICBjb25zdCBiYXRjaGVzID0gdGhpcy5jaHVua3MsIG51bUJhdGNoZXMgPSBiYXRjaGVzLmxlbmd0aDtcbiAgICAgICAgZm9yIChsZXQgYmF0Y2hJbmRleCA9IC0xOyArK2JhdGNoSW5kZXggPCBudW1CYXRjaGVzOykge1xuICAgICAgICAgICAgLy8gbG9hZCBiYXRjaGVzXG4gICAgICAgICAgICBjb25zdCBiYXRjaCA9IGJhdGNoZXNbYmF0Y2hJbmRleF07XG4gICAgICAgICAgICBpZiAoYmluZCkgeyBiaW5kKGJhdGNoKTsgfVxuICAgICAgICAgICAgLy8geWllbGQgYWxsIGluZGljZXNcbiAgICAgICAgICAgIGZvciAobGV0IGluZGV4ID0gLTEsIG51bVJvd3MgPSBiYXRjaC5sZW5ndGg7ICsraW5kZXggPCBudW1Sb3dzOykge1xuICAgICAgICAgICAgICAgIG5leHQoaW5kZXgsIGJhdGNoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBwdWJsaWMgY291bnRCeShuYW1lOiBDb2wgfCBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgYmF0Y2hlcyA9IHRoaXMuY2h1bmtzLCBudW1CYXRjaGVzID0gYmF0Y2hlcy5sZW5ndGg7XG4gICAgICAgIGNvbnN0IGNvdW50X2J5ID0gdHlwZW9mIG5hbWUgPT09ICdzdHJpbmcnID8gbmV3IENvbChuYW1lKSA6IG5hbWUgYXMgQ29sO1xuICAgICAgICAvLyBBc3N1bWUgdGhhdCBhbGwgZGljdGlvbmFyeSBiYXRjaGVzIGFyZSBkZWx0YXMsIHdoaWNoIG1lYW5zIHRoYXQgdGhlXG4gICAgICAgIC8vIGxhc3QgcmVjb3JkIGJhdGNoIGhhcyB0aGUgbW9zdCBjb21wbGV0ZSBkaWN0aW9uYXJ5XG4gICAgICAgIGNvdW50X2J5LmJpbmQoYmF0Y2hlc1tudW1CYXRjaGVzIC0gMV0pO1xuICAgICAgICBjb25zdCB2ZWN0b3IgPSBjb3VudF9ieS52ZWN0b3IgYXMgVjxEaWN0aW9uYXJ5PjtcbiAgICAgICAgaWYgKCFEYXRhVHlwZS5pc0RpY3Rpb25hcnkodmVjdG9yLnR5cGUpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdW50QnkgY3VycmVudGx5IG9ubHkgc3VwcG9ydHMgZGljdGlvbmFyeS1lbmNvZGVkIGNvbHVtbnMnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvdW50Qnl0ZUxlbmd0aCA9IE1hdGguY2VpbChNYXRoLmxvZyh2ZWN0b3IuZGljdGlvbmFyeS5sZW5ndGgpIC8gTWF0aC5sb2coMjU2KSk7XG4gICAgICAgIGNvbnN0IENvdW50c0FycmF5VHlwZSA9IGNvdW50Qnl0ZUxlbmd0aCA9PSA0ID8gVWludDMyQXJyYXkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudEJ5dGVMZW5ndGggPj0gMiA/IFVpbnQxNkFycmF5IDogVWludDhBcnJheTtcblxuICAgICAgICBjb25zdCBjb3VudHMgPSBuZXcgQ291bnRzQXJyYXlUeXBlKHZlY3Rvci5kaWN0aW9uYXJ5Lmxlbmd0aCk7XG4gICAgICAgIGZvciAobGV0IGJhdGNoSW5kZXggPSAtMTsgKytiYXRjaEluZGV4IDwgbnVtQmF0Y2hlczspIHtcbiAgICAgICAgICAgIC8vIGxvYWQgYmF0Y2hlc1xuICAgICAgICAgICAgY29uc3QgYmF0Y2ggPSBiYXRjaGVzW2JhdGNoSW5kZXhdO1xuICAgICAgICAgICAgLy8gcmViaW5kIHRoZSBjb3VudEJ5IENvbFxuICAgICAgICAgICAgY291bnRfYnkuYmluZChiYXRjaCk7XG4gICAgICAgICAgICBjb25zdCBrZXlzID0gKGNvdW50X2J5LnZlY3RvciBhcyBWPERpY3Rpb25hcnk+KS5pbmRpY2VzO1xuICAgICAgICAgICAgLy8geWllbGQgYWxsIGluZGljZXNcbiAgICAgICAgICAgIGZvciAobGV0IGluZGV4ID0gLTEsIG51bVJvd3MgPSBiYXRjaC5sZW5ndGg7ICsraW5kZXggPCBudW1Sb3dzOykge1xuICAgICAgICAgICAgICAgIGxldCBrZXkgPSBrZXlzLmdldChpbmRleCk7XG4gICAgICAgICAgICAgICAgaWYgKGtleSAhPT0gbnVsbCkgeyBjb3VudHNba2V5XSsrOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBDb3VudEJ5UmVzdWx0KHZlY3Rvci5kaWN0aW9uYXJ5LCBJbnRWZWN0b3IuZnJvbShjb3VudHMpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBDb3VudEJ5UmVzdWx0PFQgZXh0ZW5kcyBEYXRhVHlwZSA9IGFueSwgVENvdW50IGV4dGVuZHMgSW50ID0gSW50PiBleHRlbmRzIFRhYmxlPHsgdmFsdWVzOiBULCAgY291bnRzOiBUQ291bnQgfT4ge1xuICAgIGNvbnN0cnVjdG9yKHZhbHVlczogVmVjdG9yPFQ+LCBjb3VudHM6IFY8VENvdW50Pikge1xuICAgICAgICB0eXBlIFIgPSB7IHZhbHVlczogVCwgY291bnRzOiBUQ291bnQgfTtcbiAgICAgICAgY29uc3Qgc2NoZW1hID0gbmV3IFNjaGVtYTxSPihbXG4gICAgICAgICAgICBuZXcgRmllbGQoJ3ZhbHVlcycsIHZhbHVlcy50eXBlKSxcbiAgICAgICAgICAgIG5ldyBGaWVsZCgnY291bnRzJywgY291bnRzLnR5cGUpXG4gICAgICAgIF0pO1xuICAgICAgICBzdXBlcihuZXcgUmVjb3JkQmF0Y2g8Uj4oc2NoZW1hLCBjb3VudHMubGVuZ3RoLCBbdmFsdWVzLCBjb3VudHNdKSk7XG4gICAgfVxuICAgIHB1YmxpYyB0b0pTT04oKTogT2JqZWN0IHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gdGhpcy5nZXRDb2x1bW5BdCgwKSE7XG4gICAgICAgIGNvbnN0IGNvdW50cyA9IHRoaXMuZ2V0Q29sdW1uQXQoMSkhO1xuICAgICAgICBjb25zdCByZXN1bHQgPSB7fSBhcyB7IFtrOiBzdHJpbmddOiBudW1iZXIgfCBudWxsIH07XG4gICAgICAgIGZvciAobGV0IGkgPSAtMTsgKytpIDwgdGhpcy5sZW5ndGg7KSB7XG4gICAgICAgICAgICByZXN1bHRbdmFsdWVzLmdldChpKV0gPSBjb3VudHMuZ2V0KGkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgRmlsdGVyZWREYXRhRnJhbWU8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGU7IH0gPSBhbnk+IGV4dGVuZHMgRGF0YUZyYW1lPFQ+IHtcbiAgICBwcml2YXRlIF9wcmVkaWNhdGU6IFByZWRpY2F0ZTtcbiAgICBjb25zdHJ1Y3RvciAoYmF0Y2hlczogUmVjb3JkQmF0Y2g8VD5bXSwgcHJlZGljYXRlOiBQcmVkaWNhdGUpIHtcbiAgICAgICAgc3VwZXIoYmF0Y2hlcyk7XG4gICAgICAgIHRoaXMuX3ByZWRpY2F0ZSA9IHByZWRpY2F0ZTtcbiAgICB9XG4gICAgcHVibGljIHNjYW4obmV4dDogTmV4dEZ1bmMsIGJpbmQ/OiBCaW5kRnVuYykge1xuICAgICAgICAvLyBpbmxpbmVkIHZlcnNpb24gb2YgdGhpczpcbiAgICAgICAgLy8gdGhpcy5wYXJlbnQuc2NhbigoaWR4LCBjb2x1bW5zKSA9PiB7XG4gICAgICAgIC8vICAgICBpZiAodGhpcy5wcmVkaWNhdGUoaWR4LCBjb2x1bW5zKSkgbmV4dChpZHgsIGNvbHVtbnMpO1xuICAgICAgICAvLyB9KTtcbiAgICAgICAgY29uc3QgYmF0Y2hlcyA9IHRoaXMuX2NodW5rcztcbiAgICAgICAgY29uc3QgbnVtQmF0Y2hlcyA9IGJhdGNoZXMubGVuZ3RoO1xuICAgICAgICBmb3IgKGxldCBiYXRjaEluZGV4ID0gLTE7ICsrYmF0Y2hJbmRleCA8IG51bUJhdGNoZXM7KSB7XG4gICAgICAgICAgICAvLyBsb2FkIGJhdGNoZXNcbiAgICAgICAgICAgIGNvbnN0IGJhdGNoID0gYmF0Y2hlc1tiYXRjaEluZGV4XTtcbiAgICAgICAgICAgIC8vIFRPRE86IGJpbmQgYmF0Y2hlcyBsYXppbHlcbiAgICAgICAgICAgIC8vIElmIHByZWRpY2F0ZSBkb2Vzbid0IG1hdGNoIGFueXRoaW5nIGluIHRoZSBiYXRjaCB3ZSBkb24ndCBuZWVkXG4gICAgICAgICAgICAvLyB0byBiaW5kIHRoZSBjYWxsYmFja1xuICAgICAgICAgICAgaWYgKGJpbmQpIHsgYmluZChiYXRjaCk7IH1cbiAgICAgICAgICAgIGNvbnN0IHByZWRpY2F0ZSA9IHRoaXMuX3ByZWRpY2F0ZS5iaW5kKGJhdGNoKTtcbiAgICAgICAgICAgIC8vIHlpZWxkIGFsbCBpbmRpY2VzXG4gICAgICAgICAgICBmb3IgKGxldCBpbmRleCA9IC0xLCBudW1Sb3dzID0gYmF0Y2gubGVuZ3RoOyArK2luZGV4IDwgbnVtUm93czspIHtcbiAgICAgICAgICAgICAgICBpZiAocHJlZGljYXRlKGluZGV4LCBiYXRjaCkpIHsgbmV4dChpbmRleCwgYmF0Y2gpOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcHVibGljIGNvdW50KCk6IG51bWJlciB7XG4gICAgICAgIC8vIGlubGluZWQgdmVyc2lvbiBvZiB0aGlzOlxuICAgICAgICAvLyBsZXQgc3VtID0gMDtcbiAgICAgICAgLy8gdGhpcy5wYXJlbnQuc2NhbigoaWR4LCBjb2x1bW5zKSA9PiB7XG4gICAgICAgIC8vICAgICBpZiAodGhpcy5wcmVkaWNhdGUoaWR4LCBjb2x1bW5zKSkgKytzdW07XG4gICAgICAgIC8vIH0pO1xuICAgICAgICAvLyByZXR1cm4gc3VtO1xuICAgICAgICBsZXQgc3VtID0gMDtcbiAgICAgICAgY29uc3QgYmF0Y2hlcyA9IHRoaXMuX2NodW5rcztcbiAgICAgICAgY29uc3QgbnVtQmF0Y2hlcyA9IGJhdGNoZXMubGVuZ3RoO1xuICAgICAgICBmb3IgKGxldCBiYXRjaEluZGV4ID0gLTE7ICsrYmF0Y2hJbmRleCA8IG51bUJhdGNoZXM7KSB7XG4gICAgICAgICAgICAvLyBsb2FkIGJhdGNoZXNcbiAgICAgICAgICAgIGNvbnN0IGJhdGNoID0gYmF0Y2hlc1tiYXRjaEluZGV4XTtcbiAgICAgICAgICAgIGNvbnN0IHByZWRpY2F0ZSA9IHRoaXMuX3ByZWRpY2F0ZS5iaW5kKGJhdGNoKTtcbiAgICAgICAgICAgIC8vIHlpZWxkIGFsbCBpbmRpY2VzXG4gICAgICAgICAgICBmb3IgKGxldCBpbmRleCA9IC0xLCBudW1Sb3dzID0gYmF0Y2gubGVuZ3RoOyArK2luZGV4IDwgbnVtUm93czspIHtcbiAgICAgICAgICAgICAgICBpZiAocHJlZGljYXRlKGluZGV4LCBiYXRjaCkpIHsgKytzdW07IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3VtO1xuICAgIH1cbiAgICBwdWJsaWMgKltTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8U3RydWN0PFQ+WydUVmFsdWUnXT4ge1xuICAgICAgICAvLyBpbmxpbmVkIHZlcnNpb24gb2YgdGhpczpcbiAgICAgICAgLy8gdGhpcy5wYXJlbnQuc2NhbigoaWR4LCBjb2x1bW5zKSA9PiB7XG4gICAgICAgIC8vICAgICBpZiAodGhpcy5wcmVkaWNhdGUoaWR4LCBjb2x1bW5zKSkgbmV4dChpZHgsIGNvbHVtbnMpO1xuICAgICAgICAvLyB9KTtcbiAgICAgICAgY29uc3QgYmF0Y2hlcyA9IHRoaXMuX2NodW5rcztcbiAgICAgICAgY29uc3QgbnVtQmF0Y2hlcyA9IGJhdGNoZXMubGVuZ3RoO1xuICAgICAgICBmb3IgKGxldCBiYXRjaEluZGV4ID0gLTE7ICsrYmF0Y2hJbmRleCA8IG51bUJhdGNoZXM7KSB7XG4gICAgICAgICAgICAvLyBsb2FkIGJhdGNoZXNcbiAgICAgICAgICAgIGNvbnN0IGJhdGNoID0gYmF0Y2hlc1tiYXRjaEluZGV4XTtcbiAgICAgICAgICAgIC8vIFRPRE86IGJpbmQgYmF0Y2hlcyBsYXppbHlcbiAgICAgICAgICAgIC8vIElmIHByZWRpY2F0ZSBkb2Vzbid0IG1hdGNoIGFueXRoaW5nIGluIHRoZSBiYXRjaCB3ZSBkb24ndCBuZWVkXG4gICAgICAgICAgICAvLyB0byBiaW5kIHRoZSBjYWxsYmFja1xuICAgICAgICAgICAgY29uc3QgcHJlZGljYXRlID0gdGhpcy5fcHJlZGljYXRlLmJpbmQoYmF0Y2gpO1xuICAgICAgICAgICAgLy8geWllbGQgYWxsIGluZGljZXNcbiAgICAgICAgICAgIGZvciAobGV0IGluZGV4ID0gLTEsIG51bVJvd3MgPSBiYXRjaC5sZW5ndGg7ICsraW5kZXggPCBudW1Sb3dzOykge1xuICAgICAgICAgICAgICAgIGlmIChwcmVkaWNhdGUoaW5kZXgsIGJhdGNoKSkgeyB5aWVsZCBiYXRjaC5nZXQoaW5kZXgpIGFzIGFueTsgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHB1YmxpYyBmaWx0ZXIocHJlZGljYXRlOiBQcmVkaWNhdGUpOiBGaWx0ZXJlZERhdGFGcmFtZTxUPiB7XG4gICAgICAgIHJldHVybiBuZXcgRmlsdGVyZWREYXRhRnJhbWU8VD4oXG4gICAgICAgICAgICB0aGlzLl9jaHVua3MsXG4gICAgICAgICAgICB0aGlzLl9wcmVkaWNhdGUuYW5kKHByZWRpY2F0ZSlcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcHVibGljIGNvdW50QnkobmFtZTogQ29sIHwgc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IGJhdGNoZXMgPSB0aGlzLl9jaHVua3MsIG51bUJhdGNoZXMgPSBiYXRjaGVzLmxlbmd0aDtcbiAgICAgICAgY29uc3QgY291bnRfYnkgPSB0eXBlb2YgbmFtZSA9PT0gJ3N0cmluZycgPyBuZXcgQ29sKG5hbWUpIDogbmFtZSBhcyBDb2w7XG4gICAgICAgIC8vIEFzc3VtZSB0aGF0IGFsbCBkaWN0aW9uYXJ5IGJhdGNoZXMgYXJlIGRlbHRhcywgd2hpY2ggbWVhbnMgdGhhdCB0aGVcbiAgICAgICAgLy8gbGFzdCByZWNvcmQgYmF0Y2ggaGFzIHRoZSBtb3N0IGNvbXBsZXRlIGRpY3Rpb25hcnlcbiAgICAgICAgY291bnRfYnkuYmluZChiYXRjaGVzW251bUJhdGNoZXMgLSAxXSk7XG4gICAgICAgIGNvbnN0IHZlY3RvciA9IGNvdW50X2J5LnZlY3RvciBhcyBWPERpY3Rpb25hcnk+O1xuICAgICAgICBpZiAoIURhdGFUeXBlLmlzRGljdGlvbmFyeSh2ZWN0b3IudHlwZSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY291bnRCeSBjdXJyZW50bHkgb25seSBzdXBwb3J0cyBkaWN0aW9uYXJ5LWVuY29kZWQgY29sdW1ucycpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY291bnRCeXRlTGVuZ3RoID0gTWF0aC5jZWlsKE1hdGgubG9nKHZlY3Rvci5kaWN0aW9uYXJ5Lmxlbmd0aCkgLyBNYXRoLmxvZygyNTYpKTtcbiAgICAgICAgY29uc3QgQ291bnRzQXJyYXlUeXBlID0gY291bnRCeXRlTGVuZ3RoID09IDQgPyBVaW50MzJBcnJheSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50Qnl0ZUxlbmd0aCA+PSAyID8gVWludDE2QXJyYXkgOiBVaW50OEFycmF5O1xuXG4gICAgICAgIGNvbnN0IGNvdW50cyA9IG5ldyBDb3VudHNBcnJheVR5cGUodmVjdG9yLmRpY3Rpb25hcnkubGVuZ3RoKTtcblxuICAgICAgICBmb3IgKGxldCBiYXRjaEluZGV4ID0gLTE7ICsrYmF0Y2hJbmRleCA8IG51bUJhdGNoZXM7KSB7XG4gICAgICAgICAgICAvLyBsb2FkIGJhdGNoZXNcbiAgICAgICAgICAgIGNvbnN0IGJhdGNoID0gYmF0Y2hlc1tiYXRjaEluZGV4XTtcbiAgICAgICAgICAgIGNvbnN0IHByZWRpY2F0ZSA9IHRoaXMuX3ByZWRpY2F0ZS5iaW5kKGJhdGNoKTtcbiAgICAgICAgICAgIC8vIHJlYmluZCB0aGUgY291bnRCeSBDb2xcbiAgICAgICAgICAgIGNvdW50X2J5LmJpbmQoYmF0Y2gpO1xuICAgICAgICAgICAgY29uc3Qga2V5cyA9IChjb3VudF9ieS52ZWN0b3IgYXMgVjxEaWN0aW9uYXJ5PikuaW5kaWNlcztcbiAgICAgICAgICAgIC8vIHlpZWxkIGFsbCBpbmRpY2VzXG4gICAgICAgICAgICBmb3IgKGxldCBpbmRleCA9IC0xLCBudW1Sb3dzID0gYmF0Y2gubGVuZ3RoOyArK2luZGV4IDwgbnVtUm93czspIHtcbiAgICAgICAgICAgICAgICBsZXQga2V5ID0ga2V5cy5nZXQoaW5kZXgpO1xuICAgICAgICAgICAgICAgIGlmIChrZXkgIT09IG51bGwgJiYgcHJlZGljYXRlKGluZGV4LCBiYXRjaCkpIHsgY291bnRzW2tleV0rKzsgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgQ291bnRCeVJlc3VsdCh2ZWN0b3IuZGljdGlvbmFyeSwgSW50VmVjdG9yLmZyb20oY291bnRzKSk7XG4gICAgfVxufVxuIl19

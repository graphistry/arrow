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
const data_1 = require("./data");
const column_1 = require("./column");
const schema_1 = require("./schema");
const compat_1 = require("./util/compat");
const recordbatch_1 = require("./recordbatch");
const reader_1 = require("./ipc/reader");
const index_1 = require("./vector/index");
const type_1 = require("./type");
const args_1 = require("./util/args");
const recordbatch_2 = require("./util/recordbatch");
const recordbatch_3 = require("./util/recordbatch");
const writer_1 = require("./ipc/writer");
class Table extends index_1.Chunked {
    constructor(...args) {
        let schema = null;
        if (args[0] instanceof schema_1.Schema) {
            schema = args.shift();
        }
        let chunks = args_1.selectArgs(recordbatch_1.RecordBatch, args);
        if (!schema && !(schema = chunks[0] && chunks[0].schema)) {
            throw new TypeError('Table must be initialized with a Schema or at least one RecordBatch');
        }
        if (!chunks[0]) {
            chunks[0] = new recordbatch_1.RecordBatch(schema, 0, schema.fields.map((f) => data_1.Data.new(f.type, 0, 0)));
        }
        super(new type_1.Struct(schema.fields), chunks);
        this._schema = schema;
        this._chunks = chunks;
    }
    /** @nocollapse */
    static empty() { return new Table(new schema_1.Schema([]), []); }
    /** @nocollapse */
    static from(source) {
        if (!source) {
            return Table.empty();
        }
        let reader = reader_1.RecordBatchReader.from(source);
        if (compat_1.isPromise(reader)) {
            return (async () => await Table.from(await reader))();
        }
        if (reader.isSync() && (reader = reader.open())) {
            return !reader.schema ? Table.empty() : new Table(reader.schema, [...reader]);
        }
        return (async (opening) => {
            const reader = await opening;
            const schema = reader.schema;
            const batches = [];
            if (schema) {
                for await (let batch of reader) {
                    batches.push(batch);
                }
                return new Table(schema, batches);
            }
            return Table.empty();
        })(reader.open());
    }
    /** @nocollapse */
    static async fromAsync(source) {
        return await Table.from(source);
    }
    /** @nocollapse */
    static fromStruct(struct) {
        return Table.new(struct.data.childData, struct.type.children);
    }
    /** @nocollapse */
    static new(...cols) {
        return new Table(...recordbatch_2.distributeColumnsIntoRecordBatches(args_1.selectColumnArgs(cols)));
    }
    get schema() { return this._schema; }
    get length() { return this._length; }
    get chunks() { return this._chunks; }
    get numCols() { return this._numChildren; }
    clone(chunks = this._chunks) {
        return new Table(this._schema, chunks);
    }
    getColumn(name) {
        return this.getColumnAt(this.getColumnIndex(name));
    }
    getColumnAt(index) {
        return this.getChildAt(index);
    }
    getColumnIndex(name) {
        return this._schema.fields.findIndex((f) => f.name === name);
    }
    getChildAt(index) {
        if (index < 0 || index >= this.numChildren) {
            return null;
        }
        let field, child;
        const fields = this._schema.fields;
        const columns = this._children || (this._children = []);
        if (child = columns[index]) {
            return child;
        }
        if (field = fields[index]) {
            const chunks = this._chunks
                .map((chunk) => chunk.getChildAt(index))
                .filter((vec) => vec != null);
            if (chunks.length > 0) {
                return (columns[index] = new column_1.Column(field, chunks));
            }
        }
        return null;
    }
    // @ts-ignore
    serialize(encoding = 'binary', stream = true) {
        const writer = !stream
            ? writer_1.RecordBatchFileWriter
            : writer_1.RecordBatchStreamWriter;
        return writer.writeAll(this._chunks).toUint8Array(true);
    }
    count() {
        return this._length;
    }
    select(...columnNames) {
        const nameToIndex = this._schema.fields.reduce((m, f, i) => m.set(f.name, i), new Map());
        return this.selectAt(...columnNames.map((columnName) => nameToIndex.get(columnName)).filter((x) => x > -1));
    }
    selectAt(...columnIndices) {
        const schema = this._schema.selectAt(...columnIndices);
        return new Table(schema, this._chunks.map(({ length, data: { childData } }) => {
            return new recordbatch_1.RecordBatch(schema, length, columnIndices.map((i) => childData[i]).filter(Boolean));
        }));
    }
    assign(other) {
        const fields = this._schema.fields;
        const [indices, oldToNew] = other.schema.fields.reduce((memo, f2, newIdx) => {
            const [indices, oldToNew] = memo;
            const i = fields.findIndex((f) => f.name === f2.name);
            ~i ? (oldToNew[i] = newIdx) : indices.push(newIdx);
            return memo;
        }, [[], []]);
        const schema = this._schema.assign(other.schema);
        const columns = [
            ...fields.map((_f, i, _fs, j = oldToNew[i]) => (j === undefined ? this.getColumnAt(i) : other.getColumnAt(j))),
            ...indices.map((i) => other.getColumnAt(i))
        ].filter(Boolean);
        return new Table(...recordbatch_3.distributeVectorsIntoRecordBatches(schema, columns));
    }
}
exports.Table = Table;

//# sourceMappingURL=table.js.map

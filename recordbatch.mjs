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
import { Data } from './data';
import { Table } from './table';
import { Vector } from './vector';
import { Schema } from './schema';
import { Struct } from './type';
import { Chunked } from './vector/chunked';
import { StructVector } from './vector/struct';
import { selectFieldArgs } from './util/args';
import { ensureSameLengthData } from './util/recordbatch';
export class RecordBatch extends StructVector {
    constructor(...args) {
        let data;
        let schema = args[0];
        let children;
        if (args[1] instanceof Data) {
            [, data, children] = args;
        }
        else {
            const fields = schema.fields;
            const [, length, childData] = args;
            data = Data.Struct(new Struct(fields), 0, length, 0, null, childData);
        }
        super(data, children);
        this._schema = schema;
    }
    /** @nocollapse */
    static from(...args) {
        return RecordBatch.new(args[0], args[1]);
    }
    /** @nocollapse */
    static new(...args) {
        const [fs, xs] = selectFieldArgs(args);
        const vs = xs.filter((x) => x instanceof Vector);
        return new RecordBatch(...ensureSameLengthData(new Schema(fs), vs.map((x) => x.data)));
    }
    clone(data, children = this._children) {
        return new RecordBatch(this._schema, data, children);
    }
    concat(...others) {
        const schema = this._schema, chunks = Chunked.flatten(this, ...others);
        return new Table(schema, chunks.map(({ data }) => new RecordBatch(schema, data)));
    }
    get schema() { return this._schema; }
    get numCols() { return this._schema.fields.length; }
    select(...columnNames) {
        const nameToIndex = this._schema.fields.reduce((m, f, i) => m.set(f.name, i), new Map());
        return this.selectAt(...columnNames.map((columnName) => nameToIndex.get(columnName)).filter((x) => x > -1));
    }
    selectAt(...columnIndices) {
        const schema = this._schema.selectAt(...columnIndices);
        const childData = columnIndices.map((i) => this.data.childData[i]).filter(Boolean);
        return new RecordBatch(schema, this.length, childData);
    }
}

//# sourceMappingURL=recordbatch.mjs.map

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
const table_1 = require("./table");
const vector_1 = require("./vector");
const schema_1 = require("./schema");
const type_1 = require("./type");
const chunked_1 = require("./vector/chunked");
const struct_1 = require("./vector/struct");
const args_1 = require("./util/args");
const recordbatch_1 = require("./util/recordbatch");
class RecordBatch extends struct_1.StructVector {
    constructor(...args) {
        let data;
        let schema = args[0];
        let children;
        if (args[1] instanceof data_1.Data) {
            [, data, children] = args;
        }
        else {
            const fields = schema.fields;
            const [, length, childData] = args;
            data = data_1.Data.Struct(new type_1.Struct(fields), 0, length, 0, null, childData);
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
        const [fs, xs] = args_1.selectFieldArgs(args);
        const vs = xs.filter((x) => x instanceof vector_1.Vector);
        return new RecordBatch(...recordbatch_1.ensureSameLengthData(new schema_1.Schema(fs), vs.map((x) => x.data)));
    }
    clone(data, children = this._children) {
        return new RecordBatch(this._schema, data, children);
    }
    concat(...others) {
        const schema = this._schema, chunks = chunked_1.Chunked.flatten(this, ...others);
        return new table_1.Table(schema, chunks.map(({ data }) => new RecordBatch(schema, data)));
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
exports.RecordBatch = RecordBatch;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUksQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDakYsQ0FBQztDQUNKO0FBOURELGtDQThEQyIsImZpbGUiOiJyZWNvcmRiYXRjaC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBEYXRhIH0gZnJvbSAnLi9kYXRhJztcbmltcG9ydCB7IFRhYmxlIH0gZnJvbSAnLi90YWJsZSc7XG5pbXBvcnQgeyBWZWN0b3IgfSBmcm9tICcuL3ZlY3Rvcic7XG5pbXBvcnQgeyBTY2hlbWEsIEZpZWxkIH0gZnJvbSAnLi9zY2hlbWEnO1xuaW1wb3J0IHsgRGF0YVR5cGUsIFN0cnVjdCB9IGZyb20gJy4vdHlwZSc7XG5pbXBvcnQgeyBDaHVua2VkIH0gZnJvbSAnLi92ZWN0b3IvY2h1bmtlZCc7XG5pbXBvcnQgeyBTdHJ1Y3RWZWN0b3IgfSBmcm9tICcuL3ZlY3Rvci9zdHJ1Y3QnO1xuaW1wb3J0IHsgc2VsZWN0RmllbGRBcmdzIH0gZnJvbSAnLi91dGlsL2FyZ3MnO1xuaW1wb3J0IHsgZW5zdXJlU2FtZUxlbmd0aERhdGEgfSBmcm9tICcuL3V0aWwvcmVjb3JkYmF0Y2gnO1xuaW1wb3J0IHsgQ2xvbmFibGUsIFNsaWNlYWJsZSwgQXBwbGljYXRpdmUgfSBmcm9tICcuL3ZlY3Rvcic7XG5cbnR5cGUgVmVjdG9yTWFwID0geyBba2V5OiBzdHJpbmddOiBWZWN0b3IgfTtcbnR5cGUgRmllbGRzPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0+ID0gKGtleW9mIFQpW10gfCBGaWVsZDxUW2tleW9mIFRdPltdO1xudHlwZSBDaGlsZERhdGE8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfT4gPSAoRGF0YTxUW2tleW9mIFRdPiB8IFZlY3RvcjxUW2tleW9mIFRdPilbXTtcblxuZXhwb3J0IGludGVyZmFjZSBSZWNvcmRCYXRjaDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PiB7XG4gICAgY29uY2F0KC4uLm90aGVyczogVmVjdG9yPFN0cnVjdDxUPj5bXSk6IFRhYmxlPFQ+O1xuICAgIHNsaWNlKGJlZ2luPzogbnVtYmVyLCBlbmQ/OiBudW1iZXIpOiBSZWNvcmRCYXRjaDxUPjtcbiAgICBjbG9uZShkYXRhOiBEYXRhPFN0cnVjdDxUPj4sIGNoaWxkcmVuPzogVmVjdG9yW10pOiBSZWNvcmRCYXRjaDxUPjtcbn1cblxuZXhwb3J0IGNsYXNzIFJlY29yZEJhdGNoPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+XG4gICAgZXh0ZW5kcyBTdHJ1Y3RWZWN0b3I8VD5cbiAgICBpbXBsZW1lbnRzIENsb25hYmxlPFJlY29yZEJhdGNoPFQ+PixcbiAgICAgICAgICAgICAgIFNsaWNlYWJsZTxSZWNvcmRCYXRjaDxUPj4sXG4gICAgICAgICAgICAgICBBcHBsaWNhdGl2ZTxTdHJ1Y3Q8VD4sIFRhYmxlPFQ+PiB7XG5cbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIFZlY3Rvck1hcCA9IGFueT4oY2hpbGRyZW46IFQpOiBSZWNvcmRCYXRjaDx7IFtQIGluIGtleW9mIFRdOiBUW1BdWyd0eXBlJ10gfT47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KGNoaWxkcmVuOiBDaGlsZERhdGE8VD4sIGZpZWxkcz86IEZpZWxkczxUPik6IFJlY29yZEJhdGNoPFQ+O1xuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbSguLi5hcmdzOiBhbnlbXSkge1xuICAgICAgICByZXR1cm4gUmVjb3JkQmF0Y2gubmV3KGFyZ3NbMF0sIGFyZ3NbMV0pO1xuICAgIH1cblxuICAgIHB1YmxpYyBzdGF0aWMgbmV3PFQgZXh0ZW5kcyBWZWN0b3JNYXAgPSBhbnk+KGNoaWxkcmVuOiBUKTogUmVjb3JkQmF0Y2g8eyBbUCBpbiBrZXlvZiBUXTogVFtQXVsndHlwZSddIH0+O1xuICAgIHB1YmxpYyBzdGF0aWMgbmV3PFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KGNoaWxkcmVuOiBDaGlsZERhdGE8VD4sIGZpZWxkcz86IEZpZWxkczxUPik6IFJlY29yZEJhdGNoPFQ+O1xuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgbmV3PFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KC4uLmFyZ3M6IGFueVtdKSB7XG4gICAgICAgIGNvbnN0IFtmcywgeHNdID0gc2VsZWN0RmllbGRBcmdzPFQ+KGFyZ3MpO1xuICAgICAgICBjb25zdCB2cyA9IHhzLmZpbHRlcigoeCk6IHggaXMgVmVjdG9yPFRba2V5b2YgVF0+ID0+IHggaW5zdGFuY2VvZiBWZWN0b3IpO1xuICAgICAgICByZXR1cm4gbmV3IFJlY29yZEJhdGNoKC4uLmVuc3VyZVNhbWVMZW5ndGhEYXRhKG5ldyBTY2hlbWE8VD4oZnMpLCB2cy5tYXAoKHgpID0+IHguZGF0YSkpKTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3NjaGVtYTogU2NoZW1hO1xuXG4gICAgY29uc3RydWN0b3Ioc2NoZW1hOiBTY2hlbWE8VD4sIGxlbmd0aDogbnVtYmVyLCBjaGlsZHJlbjogKERhdGEgfCBWZWN0b3IpW10pO1xuICAgIGNvbnN0cnVjdG9yKHNjaGVtYTogU2NoZW1hPFQ+LCBkYXRhOiBEYXRhPFN0cnVjdDxUPj4sIGNoaWxkcmVuPzogVmVjdG9yW10pO1xuICAgIGNvbnN0cnVjdG9yKC4uLmFyZ3M6IGFueVtdKSB7XG4gICAgICAgIGxldCBkYXRhOiBEYXRhPFN0cnVjdDxUPj47XG4gICAgICAgIGxldCBzY2hlbWEgPSBhcmdzWzBdIGFzIFNjaGVtYTxUPjtcbiAgICAgICAgbGV0IGNoaWxkcmVuOiBWZWN0b3JbXSB8IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKGFyZ3NbMV0gaW5zdGFuY2VvZiBEYXRhKSB7XG4gICAgICAgICAgICBbLCBkYXRhLCBjaGlsZHJlbl0gPSAoYXJncyBhcyBbYW55LCBEYXRhPFN0cnVjdDxUPj4sIFZlY3RvcjxUW2tleW9mIFRdPltdP10pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZmllbGRzID0gc2NoZW1hLmZpZWxkcyBhcyBGaWVsZDxUW2tleW9mIFRdPltdO1xuICAgICAgICAgICAgY29uc3QgWywgbGVuZ3RoLCBjaGlsZERhdGFdID0gYXJncyBhcyBbYW55LCBudW1iZXIsIERhdGE8VFtrZXlvZiBUXT5bXV07XG4gICAgICAgICAgICBkYXRhID0gRGF0YS5TdHJ1Y3QobmV3IFN0cnVjdDxUPihmaWVsZHMpLCAwLCBsZW5ndGgsIDAsIG51bGwsIGNoaWxkRGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgc3VwZXIoZGF0YSwgY2hpbGRyZW4pO1xuICAgICAgICB0aGlzLl9zY2hlbWEgPSBzY2hlbWE7XG4gICAgfVxuXG4gICAgcHVibGljIGNsb25lKGRhdGE6IERhdGE8U3RydWN0PFQ+PiwgY2hpbGRyZW4gPSB0aGlzLl9jaGlsZHJlbikge1xuICAgICAgICByZXR1cm4gbmV3IFJlY29yZEJhdGNoPFQ+KHRoaXMuX3NjaGVtYSwgZGF0YSwgY2hpbGRyZW4pO1xuICAgIH1cblxuICAgIHB1YmxpYyBjb25jYXQoLi4ub3RoZXJzOiBWZWN0b3I8U3RydWN0PFQ+PltdKTogVGFibGU8VD4ge1xuICAgICAgICBjb25zdCBzY2hlbWEgPSB0aGlzLl9zY2hlbWEsIGNodW5rcyA9IENodW5rZWQuZmxhdHRlbih0aGlzLCAuLi5vdGhlcnMpO1xuICAgICAgICByZXR1cm4gbmV3IFRhYmxlKHNjaGVtYSwgY2h1bmtzLm1hcCgoeyBkYXRhIH0pID0+IG5ldyBSZWNvcmRCYXRjaChzY2hlbWEsIGRhdGEpKSk7XG4gICAgfVxuXG4gICAgcHVibGljIGdldCBzY2hlbWEoKSB7IHJldHVybiB0aGlzLl9zY2hlbWE7IH1cbiAgICBwdWJsaWMgZ2V0IG51bUNvbHMoKSB7IHJldHVybiB0aGlzLl9zY2hlbWEuZmllbGRzLmxlbmd0aDsgfVxuXG4gICAgcHVibGljIHNlbGVjdDxLIGV4dGVuZHMga2V5b2YgVCA9IGFueT4oLi4uY29sdW1uTmFtZXM6IEtbXSkge1xuICAgICAgICBjb25zdCBuYW1lVG9JbmRleCA9IHRoaXMuX3NjaGVtYS5maWVsZHMucmVkdWNlKChtLCBmLCBpKSA9PiBtLnNldChmLm5hbWUgYXMgSywgaSksIG5ldyBNYXA8SywgbnVtYmVyPigpKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VsZWN0QXQoLi4uY29sdW1uTmFtZXMubWFwKChjb2x1bW5OYW1lKSA9PiBuYW1lVG9JbmRleC5nZXQoY29sdW1uTmFtZSkhKS5maWx0ZXIoKHgpID0+IHggPiAtMSkpO1xuICAgIH1cbiAgICBwdWJsaWMgc2VsZWN0QXQ8SyBleHRlbmRzIFRba2V5b2YgVF0gPSBhbnk+KC4uLmNvbHVtbkluZGljZXM6IG51bWJlcltdKSB7XG4gICAgICAgIGNvbnN0IHNjaGVtYSA9IHRoaXMuX3NjaGVtYS5zZWxlY3RBdCguLi5jb2x1bW5JbmRpY2VzKTtcbiAgICAgICAgY29uc3QgY2hpbGREYXRhID0gY29sdW1uSW5kaWNlcy5tYXAoKGkpID0+IHRoaXMuZGF0YS5jaGlsZERhdGFbaV0pLmZpbHRlcihCb29sZWFuKTtcbiAgICAgICAgcmV0dXJuIG5ldyBSZWNvcmRCYXRjaDx7IFtrZXk6IHN0cmluZ106IEsgfT4oc2NoZW1hLCB0aGlzLmxlbmd0aCwgY2hpbGREYXRhKTtcbiAgICB9XG59XG4iXX0=

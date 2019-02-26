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
            const i = fields.findIndex((f) => f.compareTo(f2));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LENBQUMsQ0FBQztZQUNuRCxPQUFPLElBQUksQ0FBQztRQUNoQixDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFlLENBQUMsQ0FBQztRQUUzQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDakQsTUFBTSxPQUFPLEdBQUc7WUFDWixHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDMUMsQ0FBQyxDQUFDLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUM7WUFDcEUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBRSxDQUFDO1NBQy9DLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBeUMsQ0FBQztRQUUxRCxPQUFPLElBQUksS0FBSyxDQUFDLEdBQUcsZ0RBQWtDLENBQVEsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDcEYsQ0FBQztDQUNKO0FBdk5ELHNCQXVOQyIsImZpbGUiOiJ0YWJsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBEYXRhIH0gZnJvbSAnLi9kYXRhJztcbmltcG9ydCB7IENvbHVtbiB9IGZyb20gJy4vY29sdW1uJztcbmltcG9ydCB7IFNjaGVtYSwgRmllbGQgfSBmcm9tICcuL3NjaGVtYSc7XG5pbXBvcnQgeyBpc1Byb21pc2UgfSBmcm9tICcuL3V0aWwvY29tcGF0JztcbmltcG9ydCB7IFJlY29yZEJhdGNoIH0gZnJvbSAnLi9yZWNvcmRiYXRjaCc7XG5pbXBvcnQgeyBEYXRhRnJhbWUgfSBmcm9tICcuL2NvbXB1dGUvZGF0YWZyYW1lJztcbmltcG9ydCB7IFJlY29yZEJhdGNoUmVhZGVyIH0gZnJvbSAnLi9pcGMvcmVhZGVyJztcbmltcG9ydCB7IFZlY3RvciwgQ2h1bmtlZCB9IGZyb20gJy4vdmVjdG9yL2luZGV4JztcbmltcG9ydCB7IERhdGFUeXBlLCBSb3dMaWtlLCBTdHJ1Y3QgfSBmcm9tICcuL3R5cGUnO1xuaW1wb3J0IHsgQ2xvbmFibGUsIFNsaWNlYWJsZSwgQXBwbGljYXRpdmUgfSBmcm9tICcuL3ZlY3Rvcic7XG5pbXBvcnQgeyBzZWxlY3RDb2x1bW5BcmdzLCBzZWxlY3RBcmdzIH0gZnJvbSAnLi91dGlsL2FyZ3MnO1xuaW1wb3J0IHsgZGlzdHJpYnV0ZUNvbHVtbnNJbnRvUmVjb3JkQmF0Y2hlcyB9IGZyb20gJy4vdXRpbC9yZWNvcmRiYXRjaCc7XG5pbXBvcnQgeyBkaXN0cmlidXRlVmVjdG9yc0ludG9SZWNvcmRCYXRjaGVzIH0gZnJvbSAnLi91dGlsL3JlY29yZGJhdGNoJztcbmltcG9ydCB7IFJlY29yZEJhdGNoRmlsZVdyaXRlciwgUmVjb3JkQmF0Y2hTdHJlYW1Xcml0ZXIgfSBmcm9tICcuL2lwYy93cml0ZXInO1xuXG50eXBlIFZlY3Rvck1hcCA9IHsgW2tleTogc3RyaW5nXTogVmVjdG9yIH07XG50eXBlIEZpZWxkczxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9PiA9IChrZXlvZiBUKVtdIHwgRmllbGQ8VFtrZXlvZiBUXT5bXTtcbnR5cGUgQ2hpbGREYXRhPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0+ID0gRGF0YTxUW2tleW9mIFRdPltdIHwgVmVjdG9yPFRba2V5b2YgVF0+W107XG50eXBlIENvbHVtbnM8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfT4gPSBDb2x1bW48VFtrZXlvZiBUXT5bXSB8IENvbHVtbjxUW2tleW9mIFRdPltdW107XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGFibGU8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4ge1xuXG4gICAgZ2V0KGluZGV4OiBudW1iZXIpOiBTdHJ1Y3Q8VD5bJ1RWYWx1ZSddO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8Um93TGlrZTxUPj47XG5cbiAgICBzbGljZShiZWdpbj86IG51bWJlciwgZW5kPzogbnVtYmVyKTogVGFibGU8VD47XG4gICAgY29uY2F0KC4uLm90aGVyczogVmVjdG9yPFN0cnVjdDxUPj5bXSk6IFRhYmxlPFQ+O1xuICAgIGNsb25lKGNodW5rcz86IFJlY29yZEJhdGNoPFQ+W10sIG9mZnNldHM/OiBVaW50MzJBcnJheSk6IFRhYmxlPFQ+O1xuXG4gICAgc2NhbihuZXh0OiBpbXBvcnQoJy4vY29tcHV0ZS9kYXRhZnJhbWUnKS5OZXh0RnVuYywgYmluZD86IGltcG9ydCgnLi9jb21wdXRlL2RhdGFmcmFtZScpLkJpbmRGdW5jKTogdm9pZDtcbiAgICBjb3VudEJ5KG5hbWU6IGltcG9ydCgnLi9jb21wdXRlL3ByZWRpY2F0ZScpLkNvbCB8IHN0cmluZyk6IGltcG9ydCgnLi9jb21wdXRlL2RhdGFmcmFtZScpLkNvdW50QnlSZXN1bHQ7XG4gICAgZmlsdGVyKHByZWRpY2F0ZTogaW1wb3J0KCcuL2NvbXB1dGUvcHJlZGljYXRlJykuUHJlZGljYXRlKTogaW1wb3J0KCcuL2NvbXB1dGUvZGF0YWZyYW1lJykuRmlsdGVyZWREYXRhRnJhbWU8VD47XG59XG5cbmV4cG9ydCBjbGFzcyBUYWJsZTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PlxuICAgIGV4dGVuZHMgQ2h1bmtlZDxTdHJ1Y3Q8VD4+XG4gICAgaW1wbGVtZW50cyBEYXRhRnJhbWU8VD4sXG4gICAgICAgICAgICAgICBDbG9uYWJsZTxUYWJsZTxUPj4sXG4gICAgICAgICAgICAgICBTbGljZWFibGU8VGFibGU8VD4+LFxuICAgICAgICAgICAgICAgQXBwbGljYXRpdmU8U3RydWN0PFQ+LCBUYWJsZTxUPj4ge1xuXG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBlbXB0eTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PigpIHsgcmV0dXJuIG5ldyBUYWJsZTxUPihuZXcgU2NoZW1hKFtdKSwgW10pOyB9XG5cbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oKTogVGFibGU8VD47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogUmVjb3JkQmF0Y2hSZWFkZXI8VD4pOiBUYWJsZTxUPjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBpbXBvcnQoJy4vaXBjL3JlYWRlcicpLkZyb21BcmcwKTogVGFibGU8VD47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogaW1wb3J0KCcuL2lwYy9yZWFkZXInKS5Gcm9tQXJnMik6IFRhYmxlPFQ+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IGltcG9ydCgnLi9pcGMvcmVhZGVyJykuRnJvbUFyZzEpOiBQcm9taXNlPFRhYmxlPFQ+PjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBpbXBvcnQoJy4vaXBjL3JlYWRlcicpLkZyb21BcmczKTogUHJvbWlzZTxUYWJsZTxUPj47XG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KHNvdXJjZTogaW1wb3J0KCcuL2lwYy9yZWFkZXInKS5Gcm9tQXJnNCk6IFByb21pc2U8VGFibGU8VD4+O1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pihzb3VyY2U6IGltcG9ydCgnLi9pcGMvcmVhZGVyJykuRnJvbUFyZzUpOiBQcm9taXNlPFRhYmxlPFQ+PjtcbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBQcm9taXNlTGlrZTxSZWNvcmRCYXRjaFJlYWRlcjxUPj4pOiBQcm9taXNlPFRhYmxlPFQ+PjtcbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlPzogYW55KSB7XG5cbiAgICAgICAgaWYgKCFzb3VyY2UpIHsgcmV0dXJuIFRhYmxlLmVtcHR5PFQ+KCk7IH1cblxuICAgICAgICBsZXQgcmVhZGVyID0gUmVjb3JkQmF0Y2hSZWFkZXIuZnJvbTxUPihzb3VyY2UpIGFzIFJlY29yZEJhdGNoUmVhZGVyPFQ+IHwgUHJvbWlzZTxSZWNvcmRCYXRjaFJlYWRlcjxUPj47XG5cbiAgICAgICAgaWYgKGlzUHJvbWlzZTxSZWNvcmRCYXRjaFJlYWRlcjxUPj4ocmVhZGVyKSkge1xuICAgICAgICAgICAgcmV0dXJuIChhc3luYyAoKSA9PiBhd2FpdCBUYWJsZS5mcm9tKGF3YWl0IHJlYWRlcikpKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlYWRlci5pc1N5bmMoKSAmJiAocmVhZGVyID0gcmVhZGVyLm9wZW4oKSkpIHtcbiAgICAgICAgICAgIHJldHVybiAhcmVhZGVyLnNjaGVtYSA/IFRhYmxlLmVtcHR5PFQ+KCkgOiBuZXcgVGFibGU8VD4ocmVhZGVyLnNjaGVtYSwgWy4uLnJlYWRlcl0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoYXN5bmMgKG9wZW5pbmcpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJlYWRlciA9IGF3YWl0IG9wZW5pbmc7XG4gICAgICAgICAgICBjb25zdCBzY2hlbWEgPSByZWFkZXIuc2NoZW1hO1xuICAgICAgICAgICAgY29uc3QgYmF0Y2hlczogUmVjb3JkQmF0Y2hbXSA9IFtdO1xuICAgICAgICAgICAgaWYgKHNjaGVtYSkge1xuICAgICAgICAgICAgICAgIGZvciBhd2FpdCAobGV0IGJhdGNoIG9mIHJlYWRlcikge1xuICAgICAgICAgICAgICAgICAgICBiYXRjaGVzLnB1c2goYmF0Y2gpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFRhYmxlPFQ+KHNjaGVtYSwgYmF0Y2hlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gVGFibGUuZW1wdHk8VD4oKTtcbiAgICAgICAgfSkocmVhZGVyLm9wZW4oKSk7XG4gICAgfVxuXG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBhc3luYyBmcm9tQXN5bmM8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc291cmNlOiBpbXBvcnQoJy4vaXBjL3JlYWRlcicpLkZyb21BcmdzKTogUHJvbWlzZTxUYWJsZTxUPj4ge1xuICAgICAgICByZXR1cm4gYXdhaXQgVGFibGUuZnJvbTxUPihzb3VyY2UgYXMgYW55KTtcbiAgICB9XG5cbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGZyb21TdHJ1Y3Q8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oc3RydWN0OiBWZWN0b3I8U3RydWN0PFQ+Pikge1xuICAgICAgICByZXR1cm4gVGFibGUubmV3PFQ+KHN0cnVjdC5kYXRhLmNoaWxkRGF0YSBhcyBEYXRhPFRba2V5b2YgVF0+W10sIHN0cnVjdC50eXBlLmNoaWxkcmVuKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAc3VtbWFyeSBDcmVhdGUgYSBuZXcgVGFibGUgZnJvbSBhIGNvbGxlY3Rpb24gb2YgQ29sdW1ucyBvciBWZWN0b3JzLFxuICAgICAqIHdpdGggYW4gb3B0aW9uYWwgbGlzdCBvZiBuYW1lcyBvciBGaWVsZHMuXG4gICAgICpcbiAgICAgKlxuICAgICAqIGBUYWJsZS5uZXdgIGFjY2VwdHMgYW4gT2JqZWN0IG9mXG4gICAgICogQ29sdW1ucyBvciBWZWN0b3JzLCB3aGVyZSB0aGUga2V5cyB3aWxsIGJlIHVzZWQgYXMgdGhlIGZpZWxkIG5hbWVzXG4gICAgICogZm9yIHRoZSBTY2hlbWE6XG4gICAgICogYGBgdHNcbiAgICAgKiBjb25zdCBpMzJzID0gSW50MzJWZWN0b3IuZnJvbShbMSwgMiwgM10pO1xuICAgICAqIGNvbnN0IGYzMnMgPSBGbG9hdDMyVmVjdG9yLmZyb20oWy4xLCAuMiwgLjNdKTtcbiAgICAgKiBjb25zdCB0YWJsZSA9IFRhYmxlLm5ldyh7IGkzMjogaTMycywgZjMyOiBmMzJzIH0pO1xuICAgICAqIGFzc2VydCh0YWJsZS5zY2hlbWEuZmllbGRzWzBdLm5hbWUgPT09ICdpMzInKTtcbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEl0IGFsc28gYWNjZXB0cyBhIGEgbGlzdCBvZiBWZWN0b3JzIHdpdGggYW4gb3B0aW9uYWwgbGlzdCBvZiBuYW1lcyBvclxuICAgICAqIEZpZWxkcyBmb3IgdGhlIHJlc3VsdGluZyBTY2hlbWEuIElmIHRoZSBsaXN0IGlzIG9taXR0ZWQgb3IgYSBuYW1lIGlzXG4gICAgICogbWlzc2luZywgdGhlIG51bWVyaWMgaW5kZXggb2YgZWFjaCBWZWN0b3Igd2lsbCBiZSB1c2VkIGFzIHRoZSBuYW1lOlxuICAgICAqIGBgYHRzXG4gICAgICogY29uc3QgaTMycyA9IEludDMyVmVjdG9yLmZyb20oWzEsIDIsIDNdKTtcbiAgICAgKiBjb25zdCBmMzJzID0gRmxvYXQzMlZlY3Rvci5mcm9tKFsuMSwgLjIsIC4zXSk7XG4gICAgICogY29uc3QgdGFibGUgPSBUYWJsZS5uZXcoW2kzMnMsIGYzMnNdLCBbJ2kzMiddKTtcbiAgICAgKiBhc3NlcnQodGFibGUuc2NoZW1hLmZpZWxkc1swXS5uYW1lID09PSAnaTMyJyk7XG4gICAgICogYXNzZXJ0KHRhYmxlLnNjaGVtYS5maWVsZHNbMV0ubmFtZSA9PT0gJzEnKTtcbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIElmIHRoZSBzdXBwbGllZCBhcmd1bWVudHMgYXJlIENvbHVtbnMsIGBUYWJsZS5uZXdgIHdpbGwgaW5mZXIgdGhlIFNjaGVtYVxuICAgICAqIGZyb20gdGhlIENvbHVtbnM6XG4gICAgICogYGBgdHNcbiAgICAgKiBjb25zdCBpMzJzID0gQ29sdW1uLm5ldygnaTMyJywgSW50MzJWZWN0b3IuZnJvbShbMSwgMiwgM10pKTtcbiAgICAgKiBjb25zdCBmMzJzID0gQ29sdW1uLm5ldygnZjMyJywgRmxvYXQzMlZlY3Rvci5mcm9tKFsuMSwgLjIsIC4zXSkpO1xuICAgICAqIGNvbnN0IHRhYmxlID0gVGFibGUubmV3KGkzMnMsIGYzMnMpO1xuICAgICAqIGFzc2VydCh0YWJsZS5zY2hlbWEuZmllbGRzWzBdLm5hbWUgPT09ICdpMzInKTtcbiAgICAgKiBhc3NlcnQodGFibGUuc2NoZW1hLmZpZWxkc1sxXS5uYW1lID09PSAnZjMyJyk7XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBJZiB0aGUgc3VwcGxpZWQgVmVjdG9yIG9yIENvbHVtbiBsZW5ndGhzIGFyZSB1bmVxdWFsLCBgVGFibGUubmV3YCB3aWxsXG4gICAgICogZXh0ZW5kIHRoZSBsZW5ndGhzIG9mIHRoZSBzaG9ydGVyIENvbHVtbnMsIGFsbG9jYXRpbmcgYWRkaXRpb25hbCBieXRlc1xuICAgICAqIHRvIHJlcHJlc2VudCB0aGUgYWRkaXRpb25hbCBudWxsIHNsb3RzLiBUaGUgbWVtb3J5IHJlcXVpcmVkIHRvIGFsbG9jYXRlXG4gICAgICogdGhlc2UgYWRkaXRpb25hbCBiaXRtYXBzIGNhbiBiZSBjb21wdXRlZCBhczpcbiAgICAgKiBgYGB0c1xuICAgICAqIGxldCBhZGRpdGlvbmFsQnl0ZXMgPSAwO1xuICAgICAqIGZvciAobGV0IHZlYyBpbiBzaG9ydGVyX3ZlY3RvcnMpIHtcbiAgICAgKiAgICAgYWRkaXRpb25hbEJ5dGVzICs9ICgoKGxvbmdlc3RMZW5ndGggLSB2ZWMubGVuZ3RoKSArIDYzKSAmIH42MykgPj4gMztcbiAgICAgKiB9XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBGb3IgZXhhbXBsZSwgYW4gYWRkaXRpb25hbCBudWxsIGJpdG1hcCBmb3Igb25lIG1pbGxpb24gbnVsbCB2YWx1ZXMgd291bGQgcmVxdWlyZVxuICAgICAqIDEyNSwwMDAgYnl0ZXMgKGAoKDFlNiArIDYzKSAmIH42MykgPj4gM2ApLCBvciBhcHByb3guIGAwLjExTWlCYFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgbmV3PFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KC4uLmNvbHVtbnM6IENvbHVtbnM8VD4pOiBUYWJsZTxUPjtcbiAgICBwdWJsaWMgc3RhdGljIG5ldzxUIGV4dGVuZHMgVmVjdG9yTWFwID0gYW55PihjaGlsZHJlbjogVCk6IFRhYmxlPHsgW1AgaW4ga2V5b2YgVF06IFRbUF1bJ3R5cGUnXSB9PjtcbiAgICBwdWJsaWMgc3RhdGljIG5ldzxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55PihjaGlsZHJlbjogQ2hpbGREYXRhPFQ+LCBmaWVsZHM/OiBGaWVsZHM8VD4pOiBUYWJsZTxUPjtcbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIG5ldyguLi5jb2xzOiBhbnlbXSkge1xuICAgICAgICByZXR1cm4gbmV3IFRhYmxlKC4uLmRpc3RyaWJ1dGVDb2x1bW5zSW50b1JlY29yZEJhdGNoZXMoc2VsZWN0Q29sdW1uQXJncyhjb2xzKSkpO1xuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKGJhdGNoZXM6IFJlY29yZEJhdGNoPFQ+W10pO1xuICAgIGNvbnN0cnVjdG9yKC4uLmJhdGNoZXM6IFJlY29yZEJhdGNoPFQ+W10pO1xuICAgIGNvbnN0cnVjdG9yKHNjaGVtYTogU2NoZW1hPFQ+LCBiYXRjaGVzOiBSZWNvcmRCYXRjaDxUPltdKTtcbiAgICBjb25zdHJ1Y3RvcihzY2hlbWE6IFNjaGVtYTxUPiwgLi4uYmF0Y2hlczogUmVjb3JkQmF0Y2g8VD5bXSk7XG4gICAgY29uc3RydWN0b3IoLi4uYXJnczogYW55W10pIHtcblxuICAgICAgICBsZXQgc2NoZW1hOiBTY2hlbWEgPSBudWxsITtcblxuICAgICAgICBpZiAoYXJnc1swXSBpbnN0YW5jZW9mIFNjaGVtYSkgeyBzY2hlbWEgPSBhcmdzLnNoaWZ0KCk7IH1cblxuICAgICAgICBsZXQgY2h1bmtzID0gc2VsZWN0QXJnczxSZWNvcmRCYXRjaDxUPj4oUmVjb3JkQmF0Y2gsIGFyZ3MpO1xuXG4gICAgICAgIGlmICghc2NoZW1hICYmICEoc2NoZW1hID0gY2h1bmtzWzBdICYmIGNodW5rc1swXS5zY2hlbWEpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUYWJsZSBtdXN0IGJlIGluaXRpYWxpemVkIHdpdGggYSBTY2hlbWEgb3IgYXQgbGVhc3Qgb25lIFJlY29yZEJhdGNoJyk7XG4gICAgICAgIH1cblxuICAgICAgICBzdXBlcihuZXcgU3RydWN0PFQ+KHNjaGVtYS5maWVsZHMpLCBjaHVua3MpO1xuXG4gICAgICAgIHRoaXMuX3NjaGVtYSA9IHNjaGVtYTtcbiAgICAgICAgdGhpcy5fY2h1bmtzID0gY2h1bmtzO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfc2NoZW1hOiBTY2hlbWE8VD47XG4gICAgLy8gTGlzdCBvZiBpbm5lciBSZWNvcmRCYXRjaGVzXG4gICAgcHJvdGVjdGVkIF9jaHVua3M6IFJlY29yZEJhdGNoPFQ+W107XG4gICAgcHJvdGVjdGVkIF9jaGlsZHJlbj86IENvbHVtbjxUW2tleW9mIFRdPltdO1xuXG4gICAgcHVibGljIGdldCBzY2hlbWEoKSB7IHJldHVybiB0aGlzLl9zY2hlbWE7IH1cbiAgICBwdWJsaWMgZ2V0IGxlbmd0aCgpIHsgcmV0dXJuIHRoaXMuX2xlbmd0aDsgfVxuICAgIHB1YmxpYyBnZXQgY2h1bmtzKCkgeyByZXR1cm4gdGhpcy5fY2h1bmtzOyB9XG4gICAgcHVibGljIGdldCBudW1Db2xzKCkgeyByZXR1cm4gdGhpcy5fbnVtQ2hpbGRyZW47IH1cblxuICAgIHB1YmxpYyBjbG9uZShjaHVua3MgPSB0aGlzLl9jaHVua3MpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBUYWJsZTxUPih0aGlzLl9zY2hlbWEsIGNodW5rcyk7XG4gICAgfVxuXG4gICAgcHVibGljIGdldENvbHVtbjxSIGV4dGVuZHMga2V5b2YgVD4obmFtZTogUik6IENvbHVtbjxUW1JdPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldENvbHVtbkF0KHRoaXMuZ2V0Q29sdW1uSW5kZXgobmFtZSkpIGFzIENvbHVtbjxUW1JdPjtcbiAgICB9XG4gICAgcHVibGljIGdldENvbHVtbkF0PFIgZXh0ZW5kcyBEYXRhVHlwZSA9IGFueT4oaW5kZXg6IG51bWJlcik6IENvbHVtbjxSPiB8IG51bGwge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRDaGlsZEF0KGluZGV4KTtcbiAgICB9XG4gICAgcHVibGljIGdldENvbHVtbkluZGV4PFIgZXh0ZW5kcyBrZXlvZiBUPihuYW1lOiBSKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zY2hlbWEuZmllbGRzLmZpbmRJbmRleCgoZikgPT4gZi5uYW1lID09PSBuYW1lKTtcbiAgICB9XG4gICAgcHVibGljIGdldENoaWxkQXQ8UiBleHRlbmRzIERhdGFUeXBlID0gYW55PihpbmRleDogbnVtYmVyKTogQ29sdW1uPFI+IHwgbnVsbCB7XG4gICAgICAgIGlmIChpbmRleCA8IDAgfHwgaW5kZXggPj0gdGhpcy5udW1DaGlsZHJlbikgeyByZXR1cm4gbnVsbDsgfVxuICAgICAgICBsZXQgZmllbGQ6IEZpZWxkPFI+LCBjaGlsZDogQ29sdW1uPFI+O1xuICAgICAgICBjb25zdCBmaWVsZHMgPSAodGhpcy5fc2NoZW1hIGFzIFNjaGVtYTxhbnk+KS5maWVsZHM7XG4gICAgICAgIGNvbnN0IGNvbHVtbnMgPSB0aGlzLl9jaGlsZHJlbiB8fCAodGhpcy5fY2hpbGRyZW4gPSBbXSkgYXMgQ29sdW1uW107XG4gICAgICAgIGlmIChjaGlsZCA9IGNvbHVtbnNbaW5kZXhdKSB7IHJldHVybiBjaGlsZCBhcyBDb2x1bW48Uj47IH1cbiAgICAgICAgaWYgKGZpZWxkID0gZmllbGRzW2luZGV4XSkge1xuICAgICAgICAgICAgY29uc3QgY2h1bmtzID0gdGhpcy5fY2h1bmtzXG4gICAgICAgICAgICAgICAgLm1hcCgoY2h1bmspID0+IGNodW5rLmdldENoaWxkQXQ8Uj4oaW5kZXgpKVxuICAgICAgICAgICAgICAgIC5maWx0ZXIoKHZlYyk6IHZlYyBpcyBWZWN0b3I8Uj4gPT4gdmVjICE9IG51bGwpO1xuICAgICAgICAgICAgaWYgKGNodW5rcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChjb2x1bW5zW2luZGV4XSA9IG5ldyBDb2x1bW48Uj4oZmllbGQsIGNodW5rcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgc2VyaWFsaXplKGVuY29kaW5nID0gJ2JpbmFyeScsIHN0cmVhbSA9IHRydWUpIHtcbiAgICAgICAgY29uc3Qgd3JpdGVyID0gIXN0cmVhbVxuICAgICAgICAgICAgPyBSZWNvcmRCYXRjaEZpbGVXcml0ZXJcbiAgICAgICAgICAgIDogUmVjb3JkQmF0Y2hTdHJlYW1Xcml0ZXI7XG4gICAgICAgIHJldHVybiB3cml0ZXIud3JpdGVBbGwodGhpcy5fY2h1bmtzKS50b1VpbnQ4QXJyYXkodHJ1ZSk7XG4gICAgfVxuICAgIHB1YmxpYyBjb3VudCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fbGVuZ3RoO1xuICAgIH1cbiAgICBwdWJsaWMgc2VsZWN0PEsgZXh0ZW5kcyBrZXlvZiBUID0gYW55PiguLi5jb2x1bW5OYW1lczogS1tdKSB7XG4gICAgICAgIGNvbnN0IG5hbWVUb0luZGV4ID0gdGhpcy5fc2NoZW1hLmZpZWxkcy5yZWR1Y2UoKG0sIGYsIGkpID0+IG0uc2V0KGYubmFtZSBhcyBLLCBpKSwgbmV3IE1hcDxLLCBudW1iZXI+KCkpO1xuICAgICAgICByZXR1cm4gdGhpcy5zZWxlY3RBdCguLi5jb2x1bW5OYW1lcy5tYXAoKGNvbHVtbk5hbWUpID0+IG5hbWVUb0luZGV4LmdldChjb2x1bW5OYW1lKSEpLmZpbHRlcigoeCkgPT4geCA+IC0xKSk7XG4gICAgfVxuICAgIHB1YmxpYyBzZWxlY3RBdDxLIGV4dGVuZHMgVFtrZXlvZiBUXSA9IGFueT4oLi4uY29sdW1uSW5kaWNlczogbnVtYmVyW10pIHtcbiAgICAgICAgY29uc3Qgc2NoZW1hID0gdGhpcy5fc2NoZW1hLnNlbGVjdEF0PEs+KC4uLmNvbHVtbkluZGljZXMpO1xuICAgICAgICByZXR1cm4gbmV3IFRhYmxlKHNjaGVtYSwgdGhpcy5fY2h1bmtzLm1hcCgoeyBsZW5ndGgsIGRhdGE6IHsgY2hpbGREYXRhIH0gfSkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBSZWNvcmRCYXRjaChzY2hlbWEsIGxlbmd0aCwgY29sdW1uSW5kaWNlcy5tYXAoKGkpID0+IGNoaWxkRGF0YVtpXSkuZmlsdGVyKEJvb2xlYW4pKTtcbiAgICAgICAgfSkpO1xuICAgIH1cbiAgICBwdWJsaWMgYXNzaWduPFIgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KG90aGVyOiBUYWJsZTxSPikge1xuXG4gICAgICAgIGNvbnN0IGZpZWxkcyA9IHRoaXMuX3NjaGVtYS5maWVsZHM7XG4gICAgICAgIGNvbnN0IFtpbmRpY2VzLCBvbGRUb05ld10gPSBvdGhlci5zY2hlbWEuZmllbGRzLnJlZHVjZSgobWVtbywgZjIsIG5ld0lkeCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgW2luZGljZXMsIG9sZFRvTmV3XSA9IG1lbW87XG4gICAgICAgICAgICBjb25zdCBpID0gZmllbGRzLmZpbmRJbmRleCgoZikgPT4gZi5jb21wYXJlVG8oZjIpKTtcbiAgICAgICAgICAgIH5pID8gKG9sZFRvTmV3W2ldID0gbmV3SWR4KSA6IGluZGljZXMucHVzaChuZXdJZHgpO1xuICAgICAgICAgICAgcmV0dXJuIG1lbW87XG4gICAgICAgIH0sIFtbXSwgW11dIGFzIG51bWJlcltdW10pO1xuXG4gICAgICAgIGNvbnN0IHNjaGVtYSA9IHRoaXMuX3NjaGVtYS5hc3NpZ24ob3RoZXIuc2NoZW1hKTtcbiAgICAgICAgY29uc3QgY29sdW1ucyA9IFtcbiAgICAgICAgICAgIC4uLmZpZWxkcy5tYXAoKF9mLCBpLCBfZnMsIGogPSBvbGRUb05ld1tpXSkgPT5cbiAgICAgICAgICAgICAgICAoaiA9PT0gdW5kZWZpbmVkID8gdGhpcy5nZXRDb2x1bW5BdChpKSA6IG90aGVyLmdldENvbHVtbkF0KGopKSEpLFxuICAgICAgICAgICAgLi4uaW5kaWNlcy5tYXAoKGkpID0+IG90aGVyLmdldENvbHVtbkF0KGkpISlcbiAgICAgICAgXS5maWx0ZXIoQm9vbGVhbikgYXMgQ29sdW1uPChUICYgUilba2V5b2YgVCB8IGtleW9mIFJdPltdO1xuXG4gICAgICAgIHJldHVybiBuZXcgVGFibGUoLi4uZGlzdHJpYnV0ZVZlY3RvcnNJbnRvUmVjb3JkQmF0Y2hlczxUICYgUj4oc2NoZW1hLCBjb2x1bW5zKSk7XG4gICAgfVxufVxuIl19

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
import { Schema } from './schema';
import { Struct } from './type';
import { StructVector } from './vector/struct';
import { Chunked } from './vector/chunked';
export class RecordBatch extends StructVector {
    constructor(...args) {
        let schema = args[0];
        let data;
        let children;
        if (typeof args[1] === 'number') {
            const fields = schema.fields;
            const [, numRows, childData] = args;
            data = Data.Struct(new Struct(fields), 0, numRows, 0, null, childData);
        }
        else {
            [, data, children] = args;
        }
        super(data, children);
        this._schema = schema;
    }
    /** @nocollapse */
    static from(vectors, names = []) {
        return new RecordBatch(Schema.from(vectors, names), vectors.reduce((len, vec) => Math.max(len, vec.length), 0), vectors);
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
        const fields = this._schema.fields;
        const schema = this._schema.select(...columnNames);
        const childNames = columnNames.reduce((xs, x) => (xs[x] = true) && xs, {});
        const childData = this._data.childData.filter((_, i) => childNames[fields[i].name]);
        const structData = Data.Struct(new Struct(schema.fields), 0, this.length, 0, null, childData);
        return new RecordBatch(schema, structData);
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUssT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUM1QyxJQUFXLE9BQU8sS0FBSyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFFcEQsTUFBTSxDQUEwQixHQUFHLFdBQWdCO1FBQ3RELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBQ25DLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUM7UUFDbkQsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBUSxFQUFFLENBQUMsQ0FBQztRQUNqRixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDcEYsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM5RixPQUFPLElBQUksV0FBVyxDQUFxQixNQUFNLEVBQUUsVUFBOEMsQ0FBQyxDQUFDO0lBQ3ZHLENBQUM7Q0FDSiIsImZpbGUiOiJyZWNvcmRiYXRjaC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBEYXRhIH0gZnJvbSAnLi9kYXRhJztcbmltcG9ydCB7IFRhYmxlIH0gZnJvbSAnLi90YWJsZSc7XG5pbXBvcnQgeyBWZWN0b3IgfSBmcm9tICcuL3ZlY3Rvcic7XG5pbXBvcnQgeyBTY2hlbWEsIEZpZWxkIH0gZnJvbSAnLi9zY2hlbWEnO1xuaW1wb3J0IHsgRGF0YVR5cGUsIFN0cnVjdCB9IGZyb20gJy4vdHlwZSc7XG5pbXBvcnQgeyBTdHJ1Y3RWZWN0b3IgfSBmcm9tICcuL3ZlY3Rvci9zdHJ1Y3QnO1xuaW1wb3J0IHsgVmVjdG9yIGFzIFZUeXBlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IENodW5rZWQgfSBmcm9tICcuL3ZlY3Rvci9jaHVua2VkJztcbmltcG9ydCB7IENsb25hYmxlLCBTbGljZWFibGUsIEFwcGxpY2F0aXZlIH0gZnJvbSAnLi92ZWN0b3InO1xuXG5leHBvcnQgaW50ZXJmYWNlIFJlY29yZEJhdGNoPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IHtcbiAgICBjb25jYXQoLi4ub3RoZXJzOiBWZWN0b3I8U3RydWN0PFQ+PltdKTogVGFibGU8VD47XG4gICAgc2xpY2UoYmVnaW4/OiBudW1iZXIsIGVuZD86IG51bWJlcik6IFJlY29yZEJhdGNoPFQ+O1xuICAgIGNsb25lKGRhdGE6IERhdGE8U3RydWN0PFQ+PiwgY2hpbGRyZW4/OiBWZWN0b3JbXSk6IFJlY29yZEJhdGNoPFQ+O1xufVxuXG5leHBvcnQgY2xhc3MgUmVjb3JkQmF0Y2g8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT5cbiAgICBleHRlbmRzIFN0cnVjdFZlY3RvcjxUPlxuICAgIGltcGxlbWVudHMgQ2xvbmFibGU8UmVjb3JkQmF0Y2g8VD4+LFxuICAgICAgICAgICAgICAgU2xpY2VhYmxlPFJlY29yZEJhdGNoPFQ+PixcbiAgICAgICAgICAgICAgIEFwcGxpY2F0aXZlPFN0cnVjdDxUPiwgVGFibGU8VD4+IHtcblxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9ID0gYW55Pih2ZWN0b3JzOiBWVHlwZTxUW2tleW9mIFRdPltdLCBuYW1lczogKGtleW9mIFQpW10gPSBbXSkge1xuICAgICAgICByZXR1cm4gbmV3IFJlY29yZEJhdGNoKFxuICAgICAgICAgICAgU2NoZW1hLmZyb20odmVjdG9ycywgbmFtZXMpLFxuICAgICAgICAgICAgdmVjdG9ycy5yZWR1Y2UoKGxlbiwgdmVjKSA9PiBNYXRoLm1heChsZW4sIHZlYy5sZW5ndGgpLCAwKSxcbiAgICAgICAgICAgIHZlY3RvcnNcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3NjaGVtYTogU2NoZW1hO1xuXG4gICAgY29uc3RydWN0b3Ioc2NoZW1hOiBTY2hlbWE8VD4sIG51bVJvd3M6IG51bWJlciwgY2hpbGREYXRhOiAoRGF0YSB8IFZlY3RvcilbXSk7XG4gICAgY29uc3RydWN0b3Ioc2NoZW1hOiBTY2hlbWE8VD4sIGRhdGE6IERhdGE8U3RydWN0PFQ+PiwgY2hpbGRyZW4/OiBWZWN0b3JbXSk7XG4gICAgY29uc3RydWN0b3IoLi4uYXJnczogYW55W10pIHtcbiAgICAgICAgbGV0IHNjaGVtYSA9IGFyZ3NbMF07XG4gICAgICAgIGxldCBkYXRhOiBEYXRhPFN0cnVjdDxUPj47XG4gICAgICAgIGxldCBjaGlsZHJlbjogVmVjdG9yW10gfCB1bmRlZmluZWQ7XG4gICAgICAgIGlmICh0eXBlb2YgYXJnc1sxXSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkcyA9IHNjaGVtYS5maWVsZHMgYXMgRmllbGQ8VFtrZXlvZiBUXT5bXTtcbiAgICAgICAgICAgIGNvbnN0IFssIG51bVJvd3MsIGNoaWxkRGF0YV0gPSBhcmdzIGFzIFtTY2hlbWE8VD4sIG51bWJlciwgRGF0YVtdXTtcbiAgICAgICAgICAgIGRhdGEgPSBEYXRhLlN0cnVjdChuZXcgU3RydWN0PFQ+KGZpZWxkcyksIDAsIG51bVJvd3MsIDAsIG51bGwsIGNoaWxkRGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBbLCBkYXRhLCBjaGlsZHJlbl0gPSAoYXJncyBhcyBbU2NoZW1hPFQ+LCBEYXRhPFN0cnVjdDxUPj4sIFZlY3RvcltdP10pO1xuICAgICAgICB9XG4gICAgICAgIHN1cGVyKGRhdGEsIGNoaWxkcmVuKTtcbiAgICAgICAgdGhpcy5fc2NoZW1hID0gc2NoZW1hO1xuICAgIH1cblxuICAgIHB1YmxpYyBjbG9uZShkYXRhOiBEYXRhPFN0cnVjdDxUPj4sIGNoaWxkcmVuID0gdGhpcy5fY2hpbGRyZW4pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZWNvcmRCYXRjaDxUPih0aGlzLl9zY2hlbWEsIGRhdGEsIGNoaWxkcmVuKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgY29uY2F0KC4uLm90aGVyczogVmVjdG9yPFN0cnVjdDxUPj5bXSk6IFRhYmxlPFQ+IHtcbiAgICAgICAgY29uc3Qgc2NoZW1hID0gdGhpcy5fc2NoZW1hLCBjaHVua3MgPSBDaHVua2VkLmZsYXR0ZW4odGhpcywgLi4ub3RoZXJzKTtcbiAgICAgICAgcmV0dXJuIG5ldyBUYWJsZShzY2hlbWEsIGNodW5rcy5tYXAoKHsgZGF0YSB9KSA9PiBuZXcgUmVjb3JkQmF0Y2goc2NoZW1hLCBkYXRhKSkpO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXQgc2NoZW1hKCkgeyByZXR1cm4gdGhpcy5fc2NoZW1hOyB9XG4gICAgcHVibGljIGdldCBudW1Db2xzKCkgeyByZXR1cm4gdGhpcy5fc2NoZW1hLmZpZWxkcy5sZW5ndGg7IH1cblxuICAgIHB1YmxpYyBzZWxlY3Q8SyBleHRlbmRzIGtleW9mIFQgPSBhbnk+KC4uLmNvbHVtbk5hbWVzOiBLW10pIHtcbiAgICAgICAgY29uc3QgZmllbGRzID0gdGhpcy5fc2NoZW1hLmZpZWxkcztcbiAgICAgICAgY29uc3Qgc2NoZW1hID0gdGhpcy5fc2NoZW1hLnNlbGVjdCguLi5jb2x1bW5OYW1lcyk7XG4gICAgICAgIGNvbnN0IGNoaWxkTmFtZXMgPSBjb2x1bW5OYW1lcy5yZWR1Y2UoKHhzLCB4KSA9PiAoeHNbeF0gPSB0cnVlKSAmJiB4cywgPGFueT4ge30pO1xuICAgICAgICBjb25zdCBjaGlsZERhdGEgPSB0aGlzLl9kYXRhLmNoaWxkRGF0YS5maWx0ZXIoKF8sIGkpID0+IGNoaWxkTmFtZXNbZmllbGRzW2ldLm5hbWVdKTtcbiAgICAgICAgY29uc3Qgc3RydWN0RGF0YSA9IERhdGEuU3RydWN0KG5ldyBTdHJ1Y3Qoc2NoZW1hLmZpZWxkcyksIDAsIHRoaXMubGVuZ3RoLCAwLCBudWxsLCBjaGlsZERhdGEpO1xuICAgICAgICByZXR1cm4gbmV3IFJlY29yZEJhdGNoPHsgW1AgaW4gS106IFRbUF0gfT4oc2NoZW1hLCBzdHJ1Y3REYXRhIGFzIERhdGE8U3RydWN0PHsgW1AgaW4gS106IFRbUF0gfT4+KTtcbiAgICB9XG59XG4iXX0=

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
const data_1 = require("../data");
const schema_1 = require("../schema");
const column_1 = require("../column");
const vector_1 = require("../vector");
const type_1 = require("../type");
const chunked_1 = require("../vector/chunked");
const isArray = Array.isArray;
/** @ignore */
exports.selectArgs = (Ctor, vals) => _selectArgs(Ctor, vals, [], 0);
/** @ignore */
exports.selectColumnArgs = (args) => {
    const [fields, values] = _selectFieldArgs(args, [[], []]);
    return values.map((x, i) => x instanceof column_1.Column ? column_1.Column.new(x.field.clone(fields[i]), x) :
        x instanceof vector_1.Vector ? column_1.Column.new(fields[i], x) :
            column_1.Column.new(fields[i], []));
};
/** @ignore */
exports.selectFieldArgs = (args) => _selectFieldArgs(args, [[], []]);
/** @ignore */
exports.selectChunkArgs = (Ctor, vals) => _selectChunkArgs(Ctor, vals, [], 0);
/** @ignore */
exports.selectVectorChildrenArgs = (Ctor, vals) => _selectVectorChildrenArgs(Ctor, vals, [], 0);
/** @ignore */
exports.selectColumnChildrenArgs = (Ctor, vals) => _selectColumnChildrenArgs(Ctor, vals, [], 0);
/** @ignore */
function _selectArgs(Ctor, vals, res, idx) {
    let value, j = idx;
    let i = -1, n = vals.length;
    while (++i < n) {
        if (isArray(value = vals[i])) {
            j = _selectArgs(Ctor, value, res, j).length;
        }
        else if (value instanceof Ctor) {
            res[j++] = value;
        }
    }
    return res;
}
/** @ignore */
function _selectChunkArgs(Ctor, vals, res, idx) {
    let value, j = idx;
    let i = -1, n = vals.length;
    while (++i < n) {
        if (isArray(value = vals[i])) {
            j = _selectChunkArgs(Ctor, value, res, j).length;
        }
        else if (value instanceof chunked_1.Chunked) {
            j = _selectChunkArgs(Ctor, value.chunks, res, j).length;
        }
        else if (value instanceof Ctor) {
            res[j++] = value;
        }
    }
    return res;
}
/** @ignore */
function _selectVectorChildrenArgs(Ctor, vals, res, idx) {
    let value, j = idx;
    let i = -1, n = vals.length;
    while (++i < n) {
        if (isArray(value = vals[i])) {
            j = _selectVectorChildrenArgs(Ctor, value, res, j).length;
        }
        else if (value instanceof Ctor) {
            j = _selectArgs(vector_1.Vector, value.schema.fields.map((_, i) => value.getChildAt(i)), res, j).length;
        }
        else if (value instanceof vector_1.Vector) {
            res[j++] = value;
        }
    }
    return res;
}
/** @ignore */
function _selectColumnChildrenArgs(Ctor, vals, res, idx) {
    let value, j = idx;
    let i = -1, n = vals.length;
    while (++i < n) {
        if (isArray(value = vals[i])) {
            j = _selectColumnChildrenArgs(Ctor, value, res, j).length;
        }
        else if (value instanceof Ctor) {
            j = _selectArgs(column_1.Column, value.schema.fields.map((f, i) => column_1.Column.new(f, value.getChildAt(i))), res, j).length;
        }
        else if (value instanceof column_1.Column) {
            res[j++] = value;
        }
    }
    return res;
}
/** @ignore */
const toKeysAndValues = (xs, [k, v], i) => (xs[0][i] = k, xs[1][i] = v, xs);
/** @ignore */
function _selectFieldArgs(vals, ret) {
    let keys, n;
    switch (n = vals.length) {
        case 0: return ret;
        case 1:
            keys = ret[0];
            if (!(vals[0])) {
                return ret;
            }
            if (isArray(vals[0])) {
                return _selectFieldArgs(vals[0], ret);
            }
            if (!(vals[0] instanceof data_1.Data || vals[0] instanceof vector_1.Vector || vals[0] instanceof type_1.DataType)) {
                [keys, vals] = Object.entries(vals[0]).reduce(toKeysAndValues, ret);
            }
            break;
        default:
            !isArray(keys = vals[n - 1])
                ? (vals = isArray(vals[0]) ? vals[0] : vals, keys = [])
                : (vals = isArray(vals[0]) ? vals[0] : vals.slice(0, n - 1));
    }
    let fieldIndex = -1;
    let valueIndex = -1;
    let idx = -1, len = vals.length;
    let field;
    let val;
    let [fields, values] = ret;
    while (++idx < len) {
        val = vals[idx];
        if (val instanceof column_1.Column && (values[++valueIndex] = val)) {
            fields[++fieldIndex] = val.field.clone(keys[idx], val.type, val.nullCount > 0);
        }
        else {
            ({ [idx]: field = idx } = keys);
            if (val instanceof type_1.DataType && (values[++valueIndex] = val)) {
                fields[++fieldIndex] = schema_1.Field.new(field, val);
            }
            else if (val && val.type && (values[++valueIndex] = val)) {
                val instanceof data_1.Data && (values[valueIndex] = val = vector_1.Vector.new(val));
                fields[++fieldIndex] = schema_1.Field.new(field, val.type, val.nullCount > 0);
            }
        }
    }
    return ret;
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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Q0FBQyxHQUFHLENBQUMsR0FBRyxDQUFXLENBQUMsQ0FBQztnQkFDOUUsTUFBTSxDQUFDLEVBQUUsVUFBVSxDQUFDLEdBQUcsY0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBc0IsQ0FBQzthQUM3RjtTQUNKO0tBQ0o7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNmLENBQUMiLCJmaWxlIjoidXRpbC9hcmdzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IERhdGEgfSBmcm9tICcuLi9kYXRhJztcbmltcG9ydCB7IEZpZWxkIH0gZnJvbSAnLi4vc2NoZW1hJztcbmltcG9ydCB7IENvbHVtbiB9IGZyb20gJy4uL2NvbHVtbic7XG5pbXBvcnQgeyBWZWN0b3IgfSBmcm9tICcuLi92ZWN0b3InO1xuaW1wb3J0IHsgRGF0YVR5cGUgfSBmcm9tICcuLi90eXBlJztcbmltcG9ydCB7IENodW5rZWQgfSBmcm9tICcuLi92ZWN0b3IvY2h1bmtlZCc7XG5cbnR5cGUgUmVjb3JkQmF0Y2hDdG9yID0gdHlwZW9mIGltcG9ydCgnLi4vcmVjb3JkYmF0Y2gnKS5SZWNvcmRCYXRjaDtcblxuY29uc3QgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY29uc3Qgc2VsZWN0QXJncyA9IDxUPihDdG9yOiBhbnksIHZhbHM6IGFueVtdKSA9PiBfc2VsZWN0QXJncyhDdG9yLCB2YWxzLCBbXSwgMCkgYXMgVFtdO1xuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjb25zdCBzZWxlY3RDb2x1bW5BcmdzID0gPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0+KGFyZ3M6IGFueVtdKSA9PiB7XG4gICAgY29uc3QgW2ZpZWxkcywgdmFsdWVzXSA9IF9zZWxlY3RGaWVsZEFyZ3M8VD4oYXJncywgW1tdLCBbXV0pO1xuICAgIHJldHVybiB2YWx1ZXMubWFwKCh4LCBpKSA9PlxuICAgICAgICB4IGluc3RhbmNlb2YgQ29sdW1uID8gQ29sdW1uLm5ldyh4LmZpZWxkLmNsb25lKGZpZWxkc1tpXSksIHgpIDpcbiAgICAgICAgeCBpbnN0YW5jZW9mIFZlY3RvciA/IENvbHVtbi5uZXcoZmllbGRzW2ldLCB4KSBhcyBDb2x1bW48VFtrZXlvZiBUXT4gOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQ29sdW1uLm5ldyhmaWVsZHNbaV0sIFtdIGFzIFZlY3RvcjxUW2tleW9mIFRdPltdKSk7XG59O1xuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNvbnN0IHNlbGVjdEZpZWxkQXJncyA9IDxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZSB9PihhcmdzOiBhbnlbXSkgPT4gX3NlbGVjdEZpZWxkQXJnczxUPihhcmdzLCBbW10sIFtdXSk7XG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNvbnN0IHNlbGVjdENodW5rQXJncyA9IDxUPihDdG9yOiBhbnksIHZhbHM6IGFueVtdKSA9PiBfc2VsZWN0Q2h1bmtBcmdzKEN0b3IsIHZhbHMsIFtdLCAwKSBhcyBUW107XG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNvbnN0IHNlbGVjdFZlY3RvckNoaWxkcmVuQXJncyA9IDxUIGV4dGVuZHMgVmVjdG9yPihDdG9yOiBSZWNvcmRCYXRjaEN0b3IsIHZhbHM6IGFueVtdKSA9PiBfc2VsZWN0VmVjdG9yQ2hpbGRyZW5BcmdzKEN0b3IsIHZhbHMsIFtdLCAwKSBhcyBUW107XG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNvbnN0IHNlbGVjdENvbHVtbkNoaWxkcmVuQXJncyA9IDxUIGV4dGVuZHMgQ29sdW1uPihDdG9yOiBSZWNvcmRCYXRjaEN0b3IsIHZhbHM6IGFueVtdKSA9PiBfc2VsZWN0Q29sdW1uQ2hpbGRyZW5BcmdzKEN0b3IsIHZhbHMsIFtdLCAwKSBhcyBUW107XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBfc2VsZWN0QXJnczxUPihDdG9yOiBhbnksIHZhbHM6IGFueVtdLCByZXM6IFRbXSwgaWR4OiBudW1iZXIpIHtcbiAgICBsZXQgdmFsdWU6IGFueSwgaiA9IGlkeDtcbiAgICBsZXQgaSA9IC0xLCBuID0gdmFscy5sZW5ndGg7XG4gICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgICAgaWYgKGlzQXJyYXkodmFsdWUgPSB2YWxzW2ldKSkge1xuICAgICAgICAgICAgaiA9IF9zZWxlY3RBcmdzKEN0b3IsIHZhbHVlLCByZXMsIGopLmxlbmd0aDtcbiAgICAgICAgfSBlbHNlIGlmICh2YWx1ZSBpbnN0YW5jZW9mIEN0b3IpIHsgcmVzW2orK10gPSB2YWx1ZTsgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gX3NlbGVjdENodW5rQXJnczxUPihDdG9yOiBhbnksIHZhbHM6IGFueVtdLCByZXM6IFRbXSwgaWR4OiBudW1iZXIpIHtcbiAgICBsZXQgdmFsdWU6IGFueSwgaiA9IGlkeDtcbiAgICBsZXQgaSA9IC0xLCBuID0gdmFscy5sZW5ndGg7XG4gICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgICAgaWYgKGlzQXJyYXkodmFsdWUgPSB2YWxzW2ldKSkge1xuICAgICAgICAgICAgaiA9IF9zZWxlY3RDaHVua0FyZ3MoQ3RvciwgdmFsdWUsIHJlcywgaikubGVuZ3RoO1xuICAgICAgICB9IGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgQ2h1bmtlZCkge1xuICAgICAgICAgICAgaiA9IF9zZWxlY3RDaHVua0FyZ3MoQ3RvciwgdmFsdWUuY2h1bmtzLCByZXMsIGopLmxlbmd0aDtcbiAgICAgICAgfSBlbHNlIGlmICh2YWx1ZSBpbnN0YW5jZW9mIEN0b3IpIHsgcmVzW2orK10gPSB2YWx1ZTsgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gX3NlbGVjdFZlY3RvckNoaWxkcmVuQXJnczxUIGV4dGVuZHMgVmVjdG9yPihDdG9yOiBSZWNvcmRCYXRjaEN0b3IsIHZhbHM6IGFueVtdLCByZXM6IFRbXSwgaWR4OiBudW1iZXIpIHtcbiAgICBsZXQgdmFsdWU6IGFueSwgaiA9IGlkeDtcbiAgICBsZXQgaSA9IC0xLCBuID0gdmFscy5sZW5ndGg7XG4gICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgICAgaWYgKGlzQXJyYXkodmFsdWUgPSB2YWxzW2ldKSkge1xuICAgICAgICAgICAgaiA9IF9zZWxlY3RWZWN0b3JDaGlsZHJlbkFyZ3MoQ3RvciwgdmFsdWUsIHJlcywgaikubGVuZ3RoO1xuICAgICAgICB9IGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgQ3Rvcikge1xuICAgICAgICAgICAgaiA9IF9zZWxlY3RBcmdzKFZlY3RvciwgdmFsdWUuc2NoZW1hLmZpZWxkcy5tYXAoKF8sIGkpID0+IHZhbHVlLmdldENoaWxkQXQoaSkhKSwgcmVzLCBqKS5sZW5ndGg7XG4gICAgICAgIH0gZWxzZSBpZiAodmFsdWUgaW5zdGFuY2VvZiBWZWN0b3IpIHsgcmVzW2orK10gPSB2YWx1ZSBhcyBUOyB9XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBfc2VsZWN0Q29sdW1uQ2hpbGRyZW5BcmdzPFQgZXh0ZW5kcyBDb2x1bW4+KEN0b3I6IFJlY29yZEJhdGNoQ3RvciwgdmFsczogYW55W10sIHJlczogVFtdLCBpZHg6IG51bWJlcikge1xuICAgIGxldCB2YWx1ZTogYW55LCBqID0gaWR4O1xuICAgIGxldCBpID0gLTEsIG4gPSB2YWxzLmxlbmd0aDtcbiAgICB3aGlsZSAoKytpIDwgbikge1xuICAgICAgICBpZiAoaXNBcnJheSh2YWx1ZSA9IHZhbHNbaV0pKSB7XG4gICAgICAgICAgICBqID0gX3NlbGVjdENvbHVtbkNoaWxkcmVuQXJncyhDdG9yLCB2YWx1ZSwgcmVzLCBqKS5sZW5ndGg7XG4gICAgICAgIH0gZWxzZSBpZiAodmFsdWUgaW5zdGFuY2VvZiBDdG9yKSB7XG4gICAgICAgICAgICBqID0gX3NlbGVjdEFyZ3MoQ29sdW1uLCB2YWx1ZS5zY2hlbWEuZmllbGRzLm1hcCgoZiwgaSkgPT4gQ29sdW1uLm5ldyhmLCB2YWx1ZS5nZXRDaGlsZEF0KGkpISkpLCByZXMsIGopLmxlbmd0aDtcbiAgICAgICAgfSBlbHNlIGlmICh2YWx1ZSBpbnN0YW5jZW9mIENvbHVtbikgeyByZXNbaisrXSA9IHZhbHVlIGFzIFQ7IH1cbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmNvbnN0IHRvS2V5c0FuZFZhbHVlcyA9ICh4czogW2FueVtdLCBhbnlbXV0sIFtrLCB2XTogW2FueSwgYW55XSwgaTogbnVtYmVyKSA9PiAoeHNbMF1baV0gPSBrLCB4c1sxXVtpXSA9IHYsIHhzKTtcblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIF9zZWxlY3RGaWVsZEFyZ3M8VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfT4odmFsczogYW55W10sIHJldDogW0ZpZWxkPFRba2V5b2YgVF0+W10sIFZlY3RvcjxUW2tleW9mIFRdPltdXSk6IFtGaWVsZDxUW2tleW9mIFRdPltdLCAoVFtrZXlvZiBUXSB8IFZlY3RvcjxUW2tleW9mIFRdPilbXV0ge1xuICAgIGxldCBrZXlzOiBhbnlbXSwgbjogbnVtYmVyO1xuICAgIHN3aXRjaCAobiA9IHZhbHMubGVuZ3RoKSB7XG4gICAgICAgIGNhc2UgMDogcmV0dXJuIHJldDtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAga2V5cyA9IHJldFswXTtcbiAgICAgICAgICAgIGlmICghKHZhbHNbMF0pKSB7IHJldHVybiByZXQ7IH1cbiAgICAgICAgICAgIGlmIChpc0FycmF5KHZhbHNbMF0pKSB7IHJldHVybiBfc2VsZWN0RmllbGRBcmdzKHZhbHNbMF0sIHJldCk7IH1cbiAgICAgICAgICAgIGlmICghKHZhbHNbMF0gaW5zdGFuY2VvZiBEYXRhIHx8IHZhbHNbMF0gaW5zdGFuY2VvZiBWZWN0b3IgfHwgdmFsc1swXSBpbnN0YW5jZW9mIERhdGFUeXBlKSkge1xuICAgICAgICAgICAgICAgIFtrZXlzLCB2YWxzXSA9IE9iamVjdC5lbnRyaWVzKHZhbHNbMF0pLnJlZHVjZSh0b0tleXNBbmRWYWx1ZXMsIHJldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICFpc0FycmF5KGtleXMgPSB2YWxzW24gLSAxXSlcbiAgICAgICAgICAgICAgICA/ICh2YWxzID0gaXNBcnJheSh2YWxzWzBdKSA/IHZhbHNbMF0gOiB2YWxzLCBrZXlzID0gW10pXG4gICAgICAgICAgICAgICAgOiAodmFscyA9IGlzQXJyYXkodmFsc1swXSkgPyB2YWxzWzBdIDogdmFscy5zbGljZSgwLCBuIC0gMSkpO1xuICAgIH1cblxuICAgIGxldCBmaWVsZEluZGV4ID0gLTE7XG4gICAgbGV0IHZhbHVlSW5kZXggPSAtMTtcbiAgICBsZXQgaWR4ID0gLTEsIGxlbiA9IHZhbHMubGVuZ3RoO1xuICAgIGxldCBmaWVsZDogbnVtYmVyIHwgc3RyaW5nIHwgRmllbGQ8VFtrZXlvZiBUXT47XG4gICAgbGV0IHZhbDogVmVjdG9yPFRba2V5b2YgVF0+IHwgRGF0YTxUW2tleW9mIFRdPjtcbiAgICBsZXQgW2ZpZWxkcywgdmFsdWVzXSA9IHJldCBhcyBbRmllbGQ8VFtrZXlvZiBUXT5bXSwgYW55W11dO1xuXG4gICAgd2hpbGUgKCsraWR4IDwgbGVuKSB7XG4gICAgICAgIHZhbCA9IHZhbHNbaWR4XTtcbiAgICAgICAgaWYgKHZhbCBpbnN0YW5jZW9mIENvbHVtbiAmJiAodmFsdWVzWysrdmFsdWVJbmRleF0gPSB2YWwpKSB7XG4gICAgICAgICAgICBmaWVsZHNbKytmaWVsZEluZGV4XSA9IHZhbC5maWVsZC5jbG9uZShrZXlzW2lkeF0sIHZhbC50eXBlLCB2YWwubnVsbENvdW50ID4gMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAoeyBbaWR4XTogZmllbGQgPSBpZHggfSA9IGtleXMpO1xuICAgICAgICAgICAgaWYgKHZhbCBpbnN0YW5jZW9mIERhdGFUeXBlICYmICh2YWx1ZXNbKyt2YWx1ZUluZGV4XSA9IHZhbCkpIHtcbiAgICAgICAgICAgICAgICBmaWVsZHNbKytmaWVsZEluZGV4XSA9IEZpZWxkLm5ldyhmaWVsZCwgdmFsKSBhcyBGaWVsZDxUW2tleW9mIFRdPjtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsICYmIHZhbC50eXBlICYmICh2YWx1ZXNbKyt2YWx1ZUluZGV4XSA9IHZhbCkpIHtcbiAgICAgICAgICAgICAgICB2YWwgaW5zdGFuY2VvZiBEYXRhICYmICh2YWx1ZXNbdmFsdWVJbmRleF0gPSB2YWwgPSBWZWN0b3IubmV3KHZhbCkgYXMgVmVjdG9yKTtcbiAgICAgICAgICAgICAgICBmaWVsZHNbKytmaWVsZEluZGV4XSA9IEZpZWxkLm5ldyhmaWVsZCwgdmFsLnR5cGUsIHZhbC5udWxsQ291bnQgPiAwKSBhcyBGaWVsZDxUW2tleW9mIFRdPjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufVxuIl19
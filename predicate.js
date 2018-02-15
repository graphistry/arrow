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
const vector_1 = require("./vector");
class Value {
    eq(other) {
        if (!(other instanceof Value)) {
            other = new Literal(other);
        }
        return new Equals(this, other);
    }
    lteq(other) {
        if (!(other instanceof Value)) {
            other = new Literal(other);
        }
        return new LTeq(this, other);
    }
    gteq(other) {
        if (!(other instanceof Value)) {
            other = new Literal(other);
        }
        return new GTeq(this, other);
    }
}
exports.Value = Value;
class Literal extends Value {
    constructor(v) {
        super();
        this.v = v;
    }
}
exports.Literal = Literal;
class Col extends Value {
    constructor(name) {
        super();
        this.name = name;
    }
    bind(batch) {
        if (!this.colidx) {
            // Assume column index doesn't change between calls to bind
            //this.colidx = cols.findIndex(v => v.name.indexOf(this.name) != -1);
            this.colidx = -1;
            const fields = batch.schema.fields;
            for (let idx = -1; ++idx < fields.length;) {
                if (fields[idx].name === this.name) {
                    this.colidx = idx;
                    break;
                }
            }
            if (this.colidx < 0) {
                throw new Error(`Failed to bind Col "${this.name}"`);
            }
        }
        this.vector = batch.getChildAt(this.colidx);
        return this.vector.get.bind(this.vector);
    }
}
exports.Col = Col;
class Predicate {
    and(expr) { return new And(this, expr); }
    or(expr) { return new Or(this, expr); }
    ands() { return [this]; }
}
exports.Predicate = Predicate;
class ComparisonPredicate extends Predicate {
    constructor(left, right) {
        super();
        this.left = left;
        this.right = right;
    }
    bind(batch) {
        if (this.left instanceof Literal) {
            if (this.right instanceof Literal) {
                return this._bindLitLit(batch, this.left, this.right);
            }
            else {
                return this._bindLitCol(batch, this.left, this.right);
            }
        }
        else {
            if (this.right instanceof Literal) {
                return this._bindColLit(batch, this.left, this.right);
            }
            else {
                return this._bindColCol(batch, this.left, this.right);
            }
        }
    }
}
exports.ComparisonPredicate = ComparisonPredicate;
class CombinationPredicate extends Predicate {
    constructor(left, right) {
        super();
        this.left = left;
        this.right = right;
    }
}
exports.CombinationPredicate = CombinationPredicate;
class And extends CombinationPredicate {
    bind(batch) {
        const left = this.left.bind(batch);
        const right = this.right.bind(batch);
        return (idx, batch) => left(idx, batch) && right(idx, batch);
    }
    ands() { return this.left.ands().concat(this.right.ands()); }
}
exports.And = And;
class Or extends CombinationPredicate {
    bind(batch) {
        const left = this.left.bind(batch);
        const right = this.right.bind(batch);
        return (idx, batch) => left(idx, batch) || right(idx, batch);
    }
}
exports.Or = Or;
class Equals extends ComparisonPredicate {
    _bindLitLit(_batch, left, right) {
        const rtrn = left.v == right.v;
        return () => rtrn;
    }
    _bindColCol(batch, left, right) {
        const left_func = left.bind(batch);
        const right_func = right.bind(batch);
        return (idx, batch) => left_func(idx, batch) == right_func(idx, batch);
    }
    _bindColLit(batch, col, lit) {
        const col_func = col.bind(batch);
        if (col.vector instanceof vector_1.DictionaryVector) {
            // Assume that there is only one key with the value `lit.v`
            // TODO: add lazily-computed reverse dictionary lookups, associated
            // with col.vector.data so that we only have to do this once per
            // dictionary
            let key = -1;
            let dict = col.vector;
            let data = dict.dictionary;
            for (let len = data.length; ++key < len;) {
                if (data.get(key) === lit.v) {
                    break;
                }
            }
            if (key == data.length) {
                // the value doesn't exist in the dictionary - always return
                // false
                // TODO: special-case of PredicateFunc that encapsulates this
                // "always false" behavior. That way filtering operations don't
                // have to bother checking
                return () => false;
            }
            else {
                return (idx) => {
                    return dict.getKey(idx) === key;
                };
            }
        }
        else {
            return (idx, cols) => col_func(idx, cols) == lit.v;
        }
    }
    _bindLitCol(batch, lit, col) {
        // Equals is comutative
        return this._bindColLit(batch, col, lit);
    }
}
exports.Equals = Equals;
class LTeq extends ComparisonPredicate {
    _bindLitLit(_batch, left, right) {
        const rtrn = left.v <= right.v;
        return () => rtrn;
    }
    _bindColCol(batch, left, right) {
        const left_func = left.bind(batch);
        const right_func = right.bind(batch);
        return (idx, cols) => left_func(idx, cols) <= right_func(idx, cols);
    }
    _bindColLit(batch, col, lit) {
        const col_func = col.bind(batch);
        return (idx, cols) => col_func(idx, cols) <= lit.v;
    }
    _bindLitCol(batch, lit, col) {
        const col_func = col.bind(batch);
        return (idx, cols) => lit.v <= col_func(idx, cols);
    }
}
exports.LTeq = LTeq;
class GTeq extends ComparisonPredicate {
    _bindLitLit(_batch, left, right) {
        const rtrn = left.v >= right.v;
        return () => rtrn;
    }
    _bindColCol(batch, left, right) {
        const left_func = left.bind(batch);
        const right_func = right.bind(batch);
        return (idx, cols) => left_func(idx, cols) >= right_func(idx, cols);
    }
    _bindColLit(batch, col, lit) {
        const col_func = col.bind(batch);
        return (idx, cols) => col_func(idx, cols) >= lit.v;
    }
    _bindLitCol(batch, lit, col) {
        const col_func = col.bind(batch);
        return (idx, cols) => lit.v >= col_func(idx, cols);
    }
}
exports.GTeq = GTeq;
function lit(v) { return new Literal(v); }
exports.lit = lit;
function col(n) { return new Col(n); }
exports.col = col;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFRO1FBQzVELE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakMsTUFBTSxDQUFDLENBQUMsR0FBVyxFQUFFLElBQWlCLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1RSxDQUFDO0NBQ0o7QUFyQkQsb0JBcUJDO0FBRUQsYUFBb0IsQ0FBTSxJQUFnQixNQUFNLENBQUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQWxFLGtCQUFrRTtBQUNsRSxhQUFvQixDQUFTLElBQWMsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUEvRCxrQkFBK0QiLCJmaWxlIjoicHJlZGljYXRlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IFJlY29yZEJhdGNoIH0gZnJvbSAnLi9yZWNvcmRiYXRjaCc7XG5pbXBvcnQgeyBWZWN0b3IsIERpY3Rpb25hcnlWZWN0b3IgfSBmcm9tICcuL3ZlY3Rvcic7XG5cbmV4cG9ydCB0eXBlIFZhbHVlRnVuYzxUPiA9IChpZHg6IG51bWJlciwgY29sczogUmVjb3JkQmF0Y2gpID0+IFQgfCBudWxsO1xuZXhwb3J0IHR5cGUgUHJlZGljYXRlRnVuYyA9IChpZHg6IG51bWJlciwgY29sczogUmVjb3JkQmF0Y2gpID0+IGJvb2xlYW47XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBWYWx1ZTxUPiB7XG4gICAgZXEob3RoZXI6IFZhbHVlPFQ+IHwgVCk6IFByZWRpY2F0ZSB7XG4gICAgICAgIGlmICghKG90aGVyIGluc3RhbmNlb2YgVmFsdWUpKSB7IG90aGVyID0gbmV3IExpdGVyYWwob3RoZXIpOyB9XG4gICAgICAgIHJldHVybiBuZXcgRXF1YWxzKHRoaXMsIG90aGVyKTtcbiAgICB9XG4gICAgbHRlcShvdGhlcjogVmFsdWU8VD4gfCBUKTogUHJlZGljYXRlIHtcbiAgICAgICAgaWYgKCEob3RoZXIgaW5zdGFuY2VvZiBWYWx1ZSkpIHsgb3RoZXIgPSBuZXcgTGl0ZXJhbChvdGhlcik7IH1cbiAgICAgICAgcmV0dXJuIG5ldyBMVGVxKHRoaXMsIG90aGVyKTtcbiAgICB9XG4gICAgZ3RlcShvdGhlcjogVmFsdWU8VD4gfCBUKTogUHJlZGljYXRlIHtcbiAgICAgICAgaWYgKCEob3RoZXIgaW5zdGFuY2VvZiBWYWx1ZSkpIHsgb3RoZXIgPSBuZXcgTGl0ZXJhbChvdGhlcik7IH1cbiAgICAgICAgcmV0dXJuIG5ldyBHVGVxKHRoaXMsIG90aGVyKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBMaXRlcmFsPFQ9IGFueT4gZXh0ZW5kcyBWYWx1ZTxUPiB7XG4gICAgY29uc3RydWN0b3IocHVibGljIHY6IFQpIHsgc3VwZXIoKTsgfVxufVxuXG5leHBvcnQgY2xhc3MgQ29sPFQ9IGFueT4gZXh0ZW5kcyBWYWx1ZTxUPiB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyB2ZWN0b3I6IFZlY3RvcjtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIGNvbGlkeDogbnVtYmVyO1xuXG4gICAgY29uc3RydWN0b3IocHVibGljIG5hbWU6IHN0cmluZykgeyBzdXBlcigpOyB9XG4gICAgYmluZChiYXRjaDogUmVjb3JkQmF0Y2gpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNvbGlkeCkge1xuICAgICAgICAgICAgLy8gQXNzdW1lIGNvbHVtbiBpbmRleCBkb2Vzbid0IGNoYW5nZSBiZXR3ZWVuIGNhbGxzIHRvIGJpbmRcbiAgICAgICAgICAgIC8vdGhpcy5jb2xpZHggPSBjb2xzLmZpbmRJbmRleCh2ID0+IHYubmFtZS5pbmRleE9mKHRoaXMubmFtZSkgIT0gLTEpO1xuICAgICAgICAgICAgdGhpcy5jb2xpZHggPSAtMTtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkcyA9IGJhdGNoLnNjaGVtYS5maWVsZHM7XG4gICAgICAgICAgICBmb3IgKGxldCBpZHggPSAtMTsgKytpZHggPCBmaWVsZHMubGVuZ3RoOykge1xuICAgICAgICAgICAgICAgIGlmIChmaWVsZHNbaWR4XS5uYW1lID09PSB0aGlzLm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xpZHggPSBpZHg7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmNvbGlkeCA8IDApIHsgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gYmluZCBDb2wgXCIke3RoaXMubmFtZX1cImApOyB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy52ZWN0b3IgPSBiYXRjaC5nZXRDaGlsZEF0KHRoaXMuY29saWR4KSE7XG4gICAgICAgIHJldHVybiB0aGlzLnZlY3Rvci5nZXQuYmluZCh0aGlzLnZlY3Rvcik7XG4gICAgfVxufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgUHJlZGljYXRlIHtcbiAgICBhYnN0cmFjdCBiaW5kKGJhdGNoOiBSZWNvcmRCYXRjaCk6IFByZWRpY2F0ZUZ1bmM7XG4gICAgYW5kKGV4cHI6IFByZWRpY2F0ZSk6IFByZWRpY2F0ZSB7IHJldHVybiBuZXcgQW5kKHRoaXMsIGV4cHIpOyB9XG4gICAgb3IoZXhwcjogUHJlZGljYXRlKTogUHJlZGljYXRlIHsgcmV0dXJuIG5ldyBPcih0aGlzLCBleHByKTsgfVxuICAgIGFuZHMoKTogUHJlZGljYXRlW10geyByZXR1cm4gW3RoaXNdOyB9XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBDb21wYXJpc29uUHJlZGljYXRlPFQ9IGFueT4gZXh0ZW5kcyBQcmVkaWNhdGUge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyByZWFkb25seSBsZWZ0OiBWYWx1ZTxUPiwgcHVibGljIHJlYWRvbmx5IHJpZ2h0OiBWYWx1ZTxUPikge1xuICAgICAgICBzdXBlcigpO1xuICAgIH1cblxuICAgIGJpbmQoYmF0Y2g6IFJlY29yZEJhdGNoKSB7XG4gICAgICAgIGlmICh0aGlzLmxlZnQgaW5zdGFuY2VvZiBMaXRlcmFsKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5yaWdodCBpbnN0YW5jZW9mIExpdGVyYWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fYmluZExpdExpdChiYXRjaCwgdGhpcy5sZWZ0LCB0aGlzLnJpZ2h0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7IC8vIHJpZ2h0IGlzIGEgQ29sXG5cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fYmluZExpdENvbChiYXRjaCwgdGhpcy5sZWZ0LCB0aGlzLnJpZ2h0IGFzIENvbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7IC8vIGxlZnQgaXMgYSBDb2xcbiAgICAgICAgICAgIGlmICh0aGlzLnJpZ2h0IGluc3RhbmNlb2YgTGl0ZXJhbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9iaW5kQ29sTGl0KGJhdGNoLCB0aGlzLmxlZnQgYXMgQ29sLCB0aGlzLnJpZ2h0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7IC8vIHJpZ2h0IGlzIGEgQ29sXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2JpbmRDb2xDb2woYmF0Y2gsIHRoaXMubGVmdCBhcyBDb2wsIHRoaXMucmlnaHQgYXMgQ29sKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByb3RlY3RlZCBhYnN0cmFjdCBfYmluZExpdExpdChiYXRjaDogUmVjb3JkQmF0Y2gsIGxlZnQ6IExpdGVyYWwsIHJpZ2h0OiBMaXRlcmFsKTogUHJlZGljYXRlRnVuYztcbiAgICBwcm90ZWN0ZWQgYWJzdHJhY3QgX2JpbmRDb2xDb2woYmF0Y2g6IFJlY29yZEJhdGNoLCBsZWZ0OiBDb2wsIHJpZ2h0OiBDb2wpOiBQcmVkaWNhdGVGdW5jO1xuICAgIHByb3RlY3RlZCBhYnN0cmFjdCBfYmluZENvbExpdChiYXRjaDogUmVjb3JkQmF0Y2gsIGNvbDogQ29sLCBsaXQ6IExpdGVyYWwpOiBQcmVkaWNhdGVGdW5jO1xuICAgIHByb3RlY3RlZCBhYnN0cmFjdCBfYmluZExpdENvbChiYXRjaDogUmVjb3JkQmF0Y2gsIGxpdDogTGl0ZXJhbCwgY29sOiBDb2wpOiBQcmVkaWNhdGVGdW5jO1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQ29tYmluYXRpb25QcmVkaWNhdGUgZXh0ZW5kcyBQcmVkaWNhdGUge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyByZWFkb25seSBsZWZ0OiBQcmVkaWNhdGUsIHB1YmxpYyByZWFkb25seSByaWdodDogUHJlZGljYXRlKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgQW5kIGV4dGVuZHMgQ29tYmluYXRpb25QcmVkaWNhdGUge1xuICAgIGJpbmQoYmF0Y2g6IFJlY29yZEJhdGNoKSB7XG4gICAgICAgIGNvbnN0IGxlZnQgPSB0aGlzLmxlZnQuYmluZChiYXRjaCk7XG4gICAgICAgIGNvbnN0IHJpZ2h0ID0gdGhpcy5yaWdodC5iaW5kKGJhdGNoKTtcbiAgICAgICAgcmV0dXJuIChpZHg6IG51bWJlciwgYmF0Y2g6IFJlY29yZEJhdGNoKSA9PiBsZWZ0KGlkeCwgYmF0Y2gpICYmIHJpZ2h0KGlkeCwgYmF0Y2gpO1xuICAgIH1cbiAgICBhbmRzKCk6IFByZWRpY2F0ZVtdIHsgcmV0dXJuIHRoaXMubGVmdC5hbmRzKCkuY29uY2F0KHRoaXMucmlnaHQuYW5kcygpKTsgfVxufVxuXG5leHBvcnQgY2xhc3MgT3IgZXh0ZW5kcyBDb21iaW5hdGlvblByZWRpY2F0ZSB7XG4gICAgYmluZChiYXRjaDogUmVjb3JkQmF0Y2gpIHtcbiAgICAgICAgY29uc3QgbGVmdCA9IHRoaXMubGVmdC5iaW5kKGJhdGNoKTtcbiAgICAgICAgY29uc3QgcmlnaHQgPSB0aGlzLnJpZ2h0LmJpbmQoYmF0Y2gpO1xuICAgICAgICByZXR1cm4gKGlkeDogbnVtYmVyLCBiYXRjaDogUmVjb3JkQmF0Y2gpID0+IGxlZnQoaWR4LCBiYXRjaCkgfHwgcmlnaHQoaWR4LCBiYXRjaCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgRXF1YWxzIGV4dGVuZHMgQ29tcGFyaXNvblByZWRpY2F0ZSB7XG4gICAgcHJvdGVjdGVkIF9iaW5kTGl0TGl0KF9iYXRjaDogUmVjb3JkQmF0Y2gsIGxlZnQ6IExpdGVyYWwsIHJpZ2h0OiBMaXRlcmFsKTogUHJlZGljYXRlRnVuYyB7XG4gICAgICAgIGNvbnN0IHJ0cm46IGJvb2xlYW4gPSBsZWZ0LnYgPT0gcmlnaHQudjtcbiAgICAgICAgcmV0dXJuICgpID0+IHJ0cm47XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF9iaW5kQ29sQ29sKGJhdGNoOiBSZWNvcmRCYXRjaCwgbGVmdDogQ29sLCByaWdodDogQ29sKTogUHJlZGljYXRlRnVuYyB7XG4gICAgICAgIGNvbnN0IGxlZnRfZnVuYyA9IGxlZnQuYmluZChiYXRjaCk7XG4gICAgICAgIGNvbnN0IHJpZ2h0X2Z1bmMgPSByaWdodC5iaW5kKGJhdGNoKTtcbiAgICAgICAgcmV0dXJuIChpZHg6IG51bWJlciwgYmF0Y2g6IFJlY29yZEJhdGNoKSA9PiBsZWZ0X2Z1bmMoaWR4LCBiYXRjaCkgPT0gcmlnaHRfZnVuYyhpZHgsIGJhdGNoKTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX2JpbmRDb2xMaXQoYmF0Y2g6IFJlY29yZEJhdGNoLCBjb2w6IENvbCwgbGl0OiBMaXRlcmFsKTogUHJlZGljYXRlRnVuYyB7XG4gICAgICAgIGNvbnN0IGNvbF9mdW5jID0gY29sLmJpbmQoYmF0Y2gpO1xuICAgICAgICBpZiAoY29sLnZlY3RvciBpbnN0YW5jZW9mIERpY3Rpb25hcnlWZWN0b3IpIHtcbiAgICAgICAgICAgIC8vIEFzc3VtZSB0aGF0IHRoZXJlIGlzIG9ubHkgb25lIGtleSB3aXRoIHRoZSB2YWx1ZSBgbGl0LnZgXG4gICAgICAgICAgICAvLyBUT0RPOiBhZGQgbGF6aWx5LWNvbXB1dGVkIHJldmVyc2UgZGljdGlvbmFyeSBsb29rdXBzLCBhc3NvY2lhdGVkXG4gICAgICAgICAgICAvLyB3aXRoIGNvbC52ZWN0b3IuZGF0YSBzbyB0aGF0IHdlIG9ubHkgaGF2ZSB0byBkbyB0aGlzIG9uY2UgcGVyXG4gICAgICAgICAgICAvLyBkaWN0aW9uYXJ5XG4gICAgICAgICAgICBsZXQga2V5ID0gLTE7XG4gICAgICAgICAgICBsZXQgZGljdCA9IGNvbC52ZWN0b3I7XG4gICAgICAgICAgICBsZXQgZGF0YSA9IGRpY3QuZGljdGlvbmFyeSE7XG4gICAgICAgICAgICBmb3IgKGxldCBsZW4gPSBkYXRhLmxlbmd0aDsgKytrZXkgPCBsZW47KSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuZ2V0KGtleSkgPT09IGxpdC52KSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGtleSA9PSBkYXRhLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIC8vIHRoZSB2YWx1ZSBkb2Vzbid0IGV4aXN0IGluIHRoZSBkaWN0aW9uYXJ5IC0gYWx3YXlzIHJldHVyblxuICAgICAgICAgICAgICAgIC8vIGZhbHNlXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogc3BlY2lhbC1jYXNlIG9mIFByZWRpY2F0ZUZ1bmMgdGhhdCBlbmNhcHN1bGF0ZXMgdGhpc1xuICAgICAgICAgICAgICAgIC8vIFwiYWx3YXlzIGZhbHNlXCIgYmVoYXZpb3IuIFRoYXQgd2F5IGZpbHRlcmluZyBvcGVyYXRpb25zIGRvbid0XG4gICAgICAgICAgICAgICAgLy8gaGF2ZSB0byBib3RoZXIgY2hlY2tpbmdcbiAgICAgICAgICAgICAgICByZXR1cm4gKCkgPT4gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAoaWR4OiBudW1iZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRpY3QuZ2V0S2V5KGlkeCkgPT09IGtleTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIChpZHg6IG51bWJlciwgY29sczogUmVjb3JkQmF0Y2gpID0+IGNvbF9mdW5jKGlkeCwgY29scykgPT0gbGl0LnY7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX2JpbmRMaXRDb2woYmF0Y2g6IFJlY29yZEJhdGNoLCBsaXQ6IExpdGVyYWwsIGNvbDogQ29sKSB7XG4gICAgICAgIC8vIEVxdWFscyBpcyBjb211dGF0aXZlXG4gICAgICAgIHJldHVybiB0aGlzLl9iaW5kQ29sTGl0KGJhdGNoLCBjb2wsIGxpdCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgTFRlcSBleHRlbmRzIENvbXBhcmlzb25QcmVkaWNhdGUge1xuICAgIHByb3RlY3RlZCBfYmluZExpdExpdChfYmF0Y2g6IFJlY29yZEJhdGNoLCBsZWZ0OiBMaXRlcmFsLCByaWdodDogTGl0ZXJhbCk6IFByZWRpY2F0ZUZ1bmMge1xuICAgICAgICBjb25zdCBydHJuOiBib29sZWFuID0gbGVmdC52IDw9IHJpZ2h0LnY7XG4gICAgICAgIHJldHVybiAoKSA9PiBydHJuO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfYmluZENvbENvbChiYXRjaDogUmVjb3JkQmF0Y2gsIGxlZnQ6IENvbCwgcmlnaHQ6IENvbCk6IFByZWRpY2F0ZUZ1bmMge1xuICAgICAgICBjb25zdCBsZWZ0X2Z1bmMgPSBsZWZ0LmJpbmQoYmF0Y2gpO1xuICAgICAgICBjb25zdCByaWdodF9mdW5jID0gcmlnaHQuYmluZChiYXRjaCk7XG4gICAgICAgIHJldHVybiAoaWR4OiBudW1iZXIsIGNvbHM6IFJlY29yZEJhdGNoKSA9PiBsZWZ0X2Z1bmMoaWR4LCBjb2xzKSA8PSByaWdodF9mdW5jKGlkeCwgY29scyk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF9iaW5kQ29sTGl0KGJhdGNoOiBSZWNvcmRCYXRjaCwgY29sOiBDb2wsIGxpdDogTGl0ZXJhbCk6IFByZWRpY2F0ZUZ1bmMge1xuICAgICAgICBjb25zdCBjb2xfZnVuYyA9IGNvbC5iaW5kKGJhdGNoKTtcbiAgICAgICAgcmV0dXJuIChpZHg6IG51bWJlciwgY29sczogUmVjb3JkQmF0Y2gpID0+IGNvbF9mdW5jKGlkeCwgY29scykgPD0gbGl0LnY7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF9iaW5kTGl0Q29sKGJhdGNoOiBSZWNvcmRCYXRjaCwgbGl0OiBMaXRlcmFsLCBjb2w6IENvbCkge1xuICAgICAgICBjb25zdCBjb2xfZnVuYyA9IGNvbC5iaW5kKGJhdGNoKTtcbiAgICAgICAgcmV0dXJuIChpZHg6IG51bWJlciwgY29sczogUmVjb3JkQmF0Y2gpID0+IGxpdC52IDw9IGNvbF9mdW5jKGlkeCwgY29scyk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgR1RlcSBleHRlbmRzIENvbXBhcmlzb25QcmVkaWNhdGUge1xuICAgIHByb3RlY3RlZCBfYmluZExpdExpdChfYmF0Y2g6IFJlY29yZEJhdGNoLCBsZWZ0OiBMaXRlcmFsLCByaWdodDogTGl0ZXJhbCk6IFByZWRpY2F0ZUZ1bmMge1xuICAgICAgICBjb25zdCBydHJuOiBib29sZWFuID0gbGVmdC52ID49IHJpZ2h0LnY7XG4gICAgICAgIHJldHVybiAoKSA9PiBydHJuO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfYmluZENvbENvbChiYXRjaDogUmVjb3JkQmF0Y2gsIGxlZnQ6IENvbCwgcmlnaHQ6IENvbCk6IFByZWRpY2F0ZUZ1bmMge1xuICAgICAgICBjb25zdCBsZWZ0X2Z1bmMgPSBsZWZ0LmJpbmQoYmF0Y2gpO1xuICAgICAgICBjb25zdCByaWdodF9mdW5jID0gcmlnaHQuYmluZChiYXRjaCk7XG4gICAgICAgIHJldHVybiAoaWR4OiBudW1iZXIsIGNvbHM6IFJlY29yZEJhdGNoKSA9PiBsZWZ0X2Z1bmMoaWR4LCBjb2xzKSA+PSByaWdodF9mdW5jKGlkeCwgY29scyk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF9iaW5kQ29sTGl0KGJhdGNoOiBSZWNvcmRCYXRjaCwgY29sOiBDb2wsIGxpdDogTGl0ZXJhbCk6IFByZWRpY2F0ZUZ1bmMge1xuICAgICAgICBjb25zdCBjb2xfZnVuYyA9IGNvbC5iaW5kKGJhdGNoKTtcbiAgICAgICAgcmV0dXJuIChpZHg6IG51bWJlciwgY29sczogUmVjb3JkQmF0Y2gpID0+IGNvbF9mdW5jKGlkeCwgY29scykgPj0gbGl0LnY7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF9iaW5kTGl0Q29sKGJhdGNoOiBSZWNvcmRCYXRjaCwgbGl0OiBMaXRlcmFsLCBjb2w6IENvbCkge1xuICAgICAgICBjb25zdCBjb2xfZnVuYyA9IGNvbC5iaW5kKGJhdGNoKTtcbiAgICAgICAgcmV0dXJuIChpZHg6IG51bWJlciwgY29sczogUmVjb3JkQmF0Y2gpID0+IGxpdC52ID49IGNvbF9mdW5jKGlkeCwgY29scyk7XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbGl0KHY6IGFueSk6IFZhbHVlPGFueT4geyByZXR1cm4gbmV3IExpdGVyYWwodik7IH1cbmV4cG9ydCBmdW5jdGlvbiBjb2wobjogc3RyaW5nKTogQ29sPGFueT4geyByZXR1cm4gbmV3IENvbChuKTsgfVxuIl19

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
    emitString() { return `cols[${this.colidx}].get(idx)`; }
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
                return this._bindColLit(batch, this.right, this.left);
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
class And extends CombinationPredicate {
    bind(batch) {
        const left = this.left.bind(batch);
        const right = this.right.bind(batch);
        return (idx, batch) => left(idx, batch) && right(idx, batch);
    }
    ands() { return this.left.ands().concat(this.right.ands()); }
}
class Or extends CombinationPredicate {
    bind(batch) {
        const left = this.left.bind(batch);
        const right = this.right.bind(batch);
        return (idx, batch) => left(idx, batch) || right(idx, batch);
    }
}
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
}
exports.GTeq = GTeq;
function lit(n) { return new Literal(n); }
exports.lit = lit;
function col(n) { return new Col(n); }
exports.col = col;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDO0lBQ3RCLENBQUM7SUFFUyxXQUFXLENBQUMsS0FBa0IsRUFBRSxJQUFTLEVBQUUsS0FBVTtRQUMzRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ25DLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDckMsTUFBTSxDQUFDLENBQUMsR0FBVyxFQUFFLElBQWlCLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksVUFBVSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3RixDQUFDO0lBRVMsV0FBVyxDQUFDLEtBQWtCLEVBQUUsR0FBUSxFQUFFLEdBQVk7UUFDNUQsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNqQyxNQUFNLENBQUMsQ0FBQyxHQUFXLEVBQUUsSUFBaUIsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzVFLENBQUM7Q0FDSjtBQWhCRCxvQkFnQkM7QUFFRCxhQUFvQixDQUFTLElBQWdCLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFBckUsa0JBQXFFO0FBQ3JFLGFBQW9CLENBQVMsSUFBYyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQS9ELGtCQUErRCIsImZpbGUiOiJwcmVkaWNhdGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgUmVjb3JkQmF0Y2ggfSBmcm9tICcuL3JlY29yZGJhdGNoJztcbmltcG9ydCB7IFZlY3RvciwgRGljdGlvbmFyeVZlY3RvciB9IGZyb20gJy4vdmVjdG9yJztcblxuZXhwb3J0IHR5cGUgVmFsdWVGdW5jPFQ+ID0gKGlkeDogbnVtYmVyLCBjb2xzOiBSZWNvcmRCYXRjaCkgPT4gVCB8IG51bGw7XG5leHBvcnQgdHlwZSBQcmVkaWNhdGVGdW5jID0gKGlkeDogbnVtYmVyLCBjb2xzOiBSZWNvcmRCYXRjaCkgPT4gYm9vbGVhbjtcblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFZhbHVlPFQ+IHtcbiAgICBlcShvdGhlcjogVmFsdWU8VD4gfCBUKTogUHJlZGljYXRlIHtcbiAgICAgICAgaWYgKCEob3RoZXIgaW5zdGFuY2VvZiBWYWx1ZSkpIHsgb3RoZXIgPSBuZXcgTGl0ZXJhbChvdGhlcik7IH1cbiAgICAgICAgcmV0dXJuIG5ldyBFcXVhbHModGhpcywgb3RoZXIpO1xuICAgIH1cbiAgICBsdGVxKG90aGVyOiBWYWx1ZTxUPiB8IFQpOiBQcmVkaWNhdGUge1xuICAgICAgICBpZiAoIShvdGhlciBpbnN0YW5jZW9mIFZhbHVlKSkgeyBvdGhlciA9IG5ldyBMaXRlcmFsKG90aGVyKTsgfVxuICAgICAgICByZXR1cm4gbmV3IExUZXEodGhpcywgb3RoZXIpO1xuICAgIH1cbiAgICBndGVxKG90aGVyOiBWYWx1ZTxUPiB8IFQpOiBQcmVkaWNhdGUge1xuICAgICAgICBpZiAoIShvdGhlciBpbnN0YW5jZW9mIFZhbHVlKSkgeyBvdGhlciA9IG5ldyBMaXRlcmFsKG90aGVyKTsgfVxuICAgICAgICByZXR1cm4gbmV3IEdUZXEodGhpcywgb3RoZXIpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIExpdGVyYWw8VD0gYW55PiBleHRlbmRzIFZhbHVlPFQ+IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgdjogVCkgeyBzdXBlcigpOyB9XG59XG5cbmV4cG9ydCBjbGFzcyBDb2w8VD0gYW55PiBleHRlbmRzIFZhbHVlPFQ+IHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIHZlY3RvcjogVmVjdG9yO1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgY29saWR4OiBudW1iZXI7XG5cbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgbmFtZTogc3RyaW5nKSB7IHN1cGVyKCk7IH1cbiAgICBiaW5kKGJhdGNoOiBSZWNvcmRCYXRjaCkge1xuICAgICAgICBpZiAoIXRoaXMuY29saWR4KSB7XG4gICAgICAgICAgICAvLyBBc3N1bWUgY29sdW1uIGluZGV4IGRvZXNuJ3QgY2hhbmdlIGJldHdlZW4gY2FsbHMgdG8gYmluZFxuICAgICAgICAgICAgLy90aGlzLmNvbGlkeCA9IGNvbHMuZmluZEluZGV4KHYgPT4gdi5uYW1lLmluZGV4T2YodGhpcy5uYW1lKSAhPSAtMSk7XG4gICAgICAgICAgICB0aGlzLmNvbGlkeCA9IC0xO1xuICAgICAgICAgICAgY29uc3QgZmllbGRzID0gYmF0Y2guc2NoZW1hLmZpZWxkcztcbiAgICAgICAgICAgIGZvciAobGV0IGlkeCA9IC0xOyArK2lkeCA8IGZpZWxkcy5sZW5ndGg7KSB7XG4gICAgICAgICAgICAgICAgaWYgKGZpZWxkc1tpZHhdLm5hbWUgPT09IHRoaXMubmFtZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGlkeCA9IGlkeDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuY29saWR4IDwgMCkgeyB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBiaW5kIENvbCBcIiR7dGhpcy5uYW1lfVwiYCk7IH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnZlY3RvciA9IGJhdGNoLmdldENoaWxkQXQodGhpcy5jb2xpZHgpO1xuICAgICAgICByZXR1cm4gdGhpcy52ZWN0b3IuZ2V0LmJpbmQodGhpcy52ZWN0b3IpO1xuICAgIH1cblxuICAgIGVtaXRTdHJpbmcoKSB7IHJldHVybiBgY29sc1ske3RoaXMuY29saWR4fV0uZ2V0KGlkeClgOyB9XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBQcmVkaWNhdGUge1xuICAgIGFic3RyYWN0IGJpbmQoYmF0Y2g6IFJlY29yZEJhdGNoKTogUHJlZGljYXRlRnVuYztcbiAgICBhbmQoZXhwcjogUHJlZGljYXRlKTogUHJlZGljYXRlIHsgcmV0dXJuIG5ldyBBbmQodGhpcywgZXhwcik7IH1cbiAgICBvcihleHByOiBQcmVkaWNhdGUpOiBQcmVkaWNhdGUgeyByZXR1cm4gbmV3IE9yKHRoaXMsIGV4cHIpOyB9XG4gICAgYW5kcygpOiBQcmVkaWNhdGVbXSB7IHJldHVybiBbdGhpc107IH1cbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIENvbXBhcmlzb25QcmVkaWNhdGU8VD0gYW55PiBleHRlbmRzIFByZWRpY2F0ZSB7XG4gICAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IGxlZnQ6IFZhbHVlPFQ+LCBwdWJsaWMgcmVhZG9ubHkgcmlnaHQ6IFZhbHVlPFQ+KSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgfVxuXG4gICAgYmluZChiYXRjaDogUmVjb3JkQmF0Y2gpIHtcbiAgICAgICAgaWYgKHRoaXMubGVmdCBpbnN0YW5jZW9mIExpdGVyYWwpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnJpZ2h0IGluc3RhbmNlb2YgTGl0ZXJhbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9iaW5kTGl0TGl0KGJhdGNoLCB0aGlzLmxlZnQsIHRoaXMucmlnaHQpO1xuICAgICAgICAgICAgfSBlbHNlIHsgLy8gcmlnaHQgaXMgYSBDb2xcblxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9iaW5kQ29sTGl0KGJhdGNoLCB0aGlzLnJpZ2h0IGFzIENvbCwgdGhpcy5sZWZ0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHsgLy8gbGVmdCBpcyBhIENvbFxuICAgICAgICAgICAgaWYgKHRoaXMucmlnaHQgaW5zdGFuY2VvZiBMaXRlcmFsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2JpbmRDb2xMaXQoYmF0Y2gsIHRoaXMubGVmdCBhcyBDb2wsIHRoaXMucmlnaHQpO1xuICAgICAgICAgICAgfSBlbHNlIHsgLy8gcmlnaHQgaXMgYSBDb2xcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fYmluZENvbENvbChiYXRjaCwgdGhpcy5sZWZ0IGFzIENvbCwgdGhpcy5yaWdodCBhcyBDb2wpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIGFic3RyYWN0IF9iaW5kTGl0TGl0KGJhdGNoOiBSZWNvcmRCYXRjaCwgbGVmdDogTGl0ZXJhbCwgcmlnaHQ6IExpdGVyYWwpOiBQcmVkaWNhdGVGdW5jO1xuICAgIHByb3RlY3RlZCBhYnN0cmFjdCBfYmluZENvbENvbChiYXRjaDogUmVjb3JkQmF0Y2gsIGxlZnQ6IENvbCwgcmlnaHQ6IENvbCk6IFByZWRpY2F0ZUZ1bmM7XG4gICAgcHJvdGVjdGVkIGFic3RyYWN0IF9iaW5kQ29sTGl0KGJhdGNoOiBSZWNvcmRCYXRjaCwgY29sOiBDb2wsIGxpdDogTGl0ZXJhbCk6IFByZWRpY2F0ZUZ1bmM7XG59XG5cbmFic3RyYWN0IGNsYXNzIENvbWJpbmF0aW9uUHJlZGljYXRlIGV4dGVuZHMgUHJlZGljYXRlIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgbGVmdDogUHJlZGljYXRlLCBwdWJsaWMgcmVhZG9ubHkgcmlnaHQ6IFByZWRpY2F0ZSkge1xuICAgICAgICBzdXBlcigpO1xuICAgIH1cbn1cblxuY2xhc3MgQW5kIGV4dGVuZHMgQ29tYmluYXRpb25QcmVkaWNhdGUge1xuICAgIGJpbmQoYmF0Y2g6IFJlY29yZEJhdGNoKSB7XG4gICAgICAgIGNvbnN0IGxlZnQgPSB0aGlzLmxlZnQuYmluZChiYXRjaCk7XG4gICAgICAgIGNvbnN0IHJpZ2h0ID0gdGhpcy5yaWdodC5iaW5kKGJhdGNoKTtcbiAgICAgICAgcmV0dXJuIChpZHg6IG51bWJlciwgYmF0Y2g6IFJlY29yZEJhdGNoKSA9PiBsZWZ0KGlkeCwgYmF0Y2gpICYmIHJpZ2h0KGlkeCwgYmF0Y2gpO1xuICAgIH1cbiAgICBhbmRzKCk6IFByZWRpY2F0ZVtdIHsgcmV0dXJuIHRoaXMubGVmdC5hbmRzKCkuY29uY2F0KHRoaXMucmlnaHQuYW5kcygpKTsgfVxufVxuXG5jbGFzcyBPciBleHRlbmRzIENvbWJpbmF0aW9uUHJlZGljYXRlIHtcbiAgICBiaW5kKGJhdGNoOiBSZWNvcmRCYXRjaCkge1xuICAgICAgICBjb25zdCBsZWZ0ID0gdGhpcy5sZWZ0LmJpbmQoYmF0Y2gpO1xuICAgICAgICBjb25zdCByaWdodCA9IHRoaXMucmlnaHQuYmluZChiYXRjaCk7XG4gICAgICAgIHJldHVybiAoaWR4OiBudW1iZXIsIGJhdGNoOiBSZWNvcmRCYXRjaCkgPT4gbGVmdChpZHgsIGJhdGNoKSB8fCByaWdodChpZHgsIGJhdGNoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFcXVhbHMgZXh0ZW5kcyBDb21wYXJpc29uUHJlZGljYXRlIHtcbiAgICBwcm90ZWN0ZWQgX2JpbmRMaXRMaXQoX2JhdGNoOiBSZWNvcmRCYXRjaCwgbGVmdDogTGl0ZXJhbCwgcmlnaHQ6IExpdGVyYWwpOiBQcmVkaWNhdGVGdW5jIHtcbiAgICAgICAgY29uc3QgcnRybjogYm9vbGVhbiA9IGxlZnQudiA9PSByaWdodC52O1xuICAgICAgICByZXR1cm4gKCkgPT4gcnRybjtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX2JpbmRDb2xDb2woYmF0Y2g6IFJlY29yZEJhdGNoLCBsZWZ0OiBDb2wsIHJpZ2h0OiBDb2wpOiBQcmVkaWNhdGVGdW5jIHtcbiAgICAgICAgY29uc3QgbGVmdF9mdW5jID0gbGVmdC5iaW5kKGJhdGNoKTtcbiAgICAgICAgY29uc3QgcmlnaHRfZnVuYyA9IHJpZ2h0LmJpbmQoYmF0Y2gpO1xuICAgICAgICByZXR1cm4gKGlkeDogbnVtYmVyLCBiYXRjaDogUmVjb3JkQmF0Y2gpID0+IGxlZnRfZnVuYyhpZHgsIGJhdGNoKSA9PSByaWdodF9mdW5jKGlkeCwgYmF0Y2gpO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfYmluZENvbExpdChiYXRjaDogUmVjb3JkQmF0Y2gsIGNvbDogQ29sLCBsaXQ6IExpdGVyYWwpOiBQcmVkaWNhdGVGdW5jIHtcbiAgICAgICAgY29uc3QgY29sX2Z1bmMgPSBjb2wuYmluZChiYXRjaCk7XG4gICAgICAgIGlmIChjb2wudmVjdG9yIGluc3RhbmNlb2YgRGljdGlvbmFyeVZlY3Rvcikge1xuICAgICAgICAgICAgLy8gQXNzdW1lIHRoYXQgdGhlcmUgaXMgb25seSBvbmUga2V5IHdpdGggdGhlIHZhbHVlIGBsaXQudmBcbiAgICAgICAgICAgIC8vIFRPRE86IGFkZCBsYXppbHktY29tcHV0ZWQgcmV2ZXJzZSBkaWN0aW9uYXJ5IGxvb2t1cHMsIGFzc29jaWF0ZWRcbiAgICAgICAgICAgIC8vIHdpdGggY29sLnZlY3Rvci5kYXRhIHNvIHRoYXQgd2Ugb25seSBoYXZlIHRvIGRvIHRoaXMgb25jZSBwZXJcbiAgICAgICAgICAgIC8vIGRpY3Rpb25hcnlcbiAgICAgICAgICAgIGxldCBrZXkgPSAtMTtcbiAgICAgICAgICAgIGxldCBkaWN0ID0gY29sLnZlY3RvcjtcbiAgICAgICAgICAgIGxldCBkYXRhID0gZGljdC5kaWN0aW9uYXJ5ITtcbiAgICAgICAgICAgIGZvciAobGV0IGxlbiA9IGRhdGEubGVuZ3RoOyArK2tleSA8IGxlbjspIHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5nZXQoa2V5KSA9PT0gbGl0LnYpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoa2V5ID09IGRhdGEubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgLy8gdGhlIHZhbHVlIGRvZXNuJ3QgZXhpc3QgaW4gdGhlIGRpY3Rpb25hcnkgLSBhbHdheXMgcmV0dXJuXG4gICAgICAgICAgICAgICAgLy8gZmFsc2VcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiBzcGVjaWFsLWNhc2Ugb2YgUHJlZGljYXRlRnVuYyB0aGF0IGVuY2Fwc3VsYXRlcyB0aGlzXG4gICAgICAgICAgICAgICAgLy8gXCJhbHdheXMgZmFsc2VcIiBiZWhhdmlvci4gVGhhdCB3YXkgZmlsdGVyaW5nIG9wZXJhdGlvbnMgZG9uJ3RcbiAgICAgICAgICAgICAgICAvLyBoYXZlIHRvIGJvdGhlciBjaGVja2luZ1xuICAgICAgICAgICAgICAgIHJldHVybiAoKSA9PiBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChpZHg6IG51bWJlcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGljdC5nZXRLZXkoaWR4KSA9PT0ga2V5O1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gKGlkeDogbnVtYmVyLCBjb2xzOiBSZWNvcmRCYXRjaCkgPT4gY29sX2Z1bmMoaWR4LCBjb2xzKSA9PSBsaXQudjtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIExUZXEgZXh0ZW5kcyBDb21wYXJpc29uUHJlZGljYXRlIHtcbiAgICBwcm90ZWN0ZWQgX2JpbmRMaXRMaXQoX2JhdGNoOiBSZWNvcmRCYXRjaCwgbGVmdDogTGl0ZXJhbCwgcmlnaHQ6IExpdGVyYWwpOiBQcmVkaWNhdGVGdW5jIHtcbiAgICAgICAgY29uc3QgcnRybjogYm9vbGVhbiA9IGxlZnQudiA8PSByaWdodC52O1xuICAgICAgICByZXR1cm4gKCkgPT4gcnRybjtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX2JpbmRDb2xDb2woYmF0Y2g6IFJlY29yZEJhdGNoLCBsZWZ0OiBDb2wsIHJpZ2h0OiBDb2wpOiBQcmVkaWNhdGVGdW5jIHtcbiAgICAgICAgY29uc3QgbGVmdF9mdW5jID0gbGVmdC5iaW5kKGJhdGNoKTtcbiAgICAgICAgY29uc3QgcmlnaHRfZnVuYyA9IHJpZ2h0LmJpbmQoYmF0Y2gpO1xuICAgICAgICByZXR1cm4gKGlkeDogbnVtYmVyLCBjb2xzOiBSZWNvcmRCYXRjaCkgPT4gbGVmdF9mdW5jKGlkeCwgY29scykgPD0gcmlnaHRfZnVuYyhpZHgsIGNvbHMpO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfYmluZENvbExpdChiYXRjaDogUmVjb3JkQmF0Y2gsIGNvbDogQ29sLCBsaXQ6IExpdGVyYWwpOiBQcmVkaWNhdGVGdW5jIHtcbiAgICAgICAgY29uc3QgY29sX2Z1bmMgPSBjb2wuYmluZChiYXRjaCk7XG4gICAgICAgIHJldHVybiAoaWR4OiBudW1iZXIsIGNvbHM6IFJlY29yZEJhdGNoKSA9PiBjb2xfZnVuYyhpZHgsIGNvbHMpIDw9IGxpdC52O1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEdUZXEgZXh0ZW5kcyBDb21wYXJpc29uUHJlZGljYXRlIHtcbiAgICBwcm90ZWN0ZWQgX2JpbmRMaXRMaXQoX2JhdGNoOiBSZWNvcmRCYXRjaCwgbGVmdDogTGl0ZXJhbCwgcmlnaHQ6IExpdGVyYWwpOiBQcmVkaWNhdGVGdW5jIHtcbiAgICAgICAgY29uc3QgcnRybjogYm9vbGVhbiA9IGxlZnQudiA+PSByaWdodC52O1xuICAgICAgICByZXR1cm4gKCkgPT4gcnRybjtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX2JpbmRDb2xDb2woYmF0Y2g6IFJlY29yZEJhdGNoLCBsZWZ0OiBDb2wsIHJpZ2h0OiBDb2wpOiBQcmVkaWNhdGVGdW5jIHtcbiAgICAgICAgY29uc3QgbGVmdF9mdW5jID0gbGVmdC5iaW5kKGJhdGNoKTtcbiAgICAgICAgY29uc3QgcmlnaHRfZnVuYyA9IHJpZ2h0LmJpbmQoYmF0Y2gpO1xuICAgICAgICByZXR1cm4gKGlkeDogbnVtYmVyLCBjb2xzOiBSZWNvcmRCYXRjaCkgPT4gbGVmdF9mdW5jKGlkeCwgY29scykgPj0gcmlnaHRfZnVuYyhpZHgsIGNvbHMpO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfYmluZENvbExpdChiYXRjaDogUmVjb3JkQmF0Y2gsIGNvbDogQ29sLCBsaXQ6IExpdGVyYWwpOiBQcmVkaWNhdGVGdW5jIHtcbiAgICAgICAgY29uc3QgY29sX2Z1bmMgPSBjb2wuYmluZChiYXRjaCk7XG4gICAgICAgIHJldHVybiAoaWR4OiBudW1iZXIsIGNvbHM6IFJlY29yZEJhdGNoKSA9PiBjb2xfZnVuYyhpZHgsIGNvbHMpID49IGxpdC52O1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxpdChuOiBudW1iZXIpOiBWYWx1ZTxhbnk+IHsgcmV0dXJuIG5ldyBMaXRlcmFsKG4pOyB9XG5leHBvcnQgZnVuY3Rpb24gY29sKG46IHN0cmluZyk6IENvbDxhbnk+IHsgcmV0dXJuIG5ldyBDb2wobik7IH1cbiJdfQ==

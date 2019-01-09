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
const dictionary_1 = require("../vector/dictionary");
/** @ignore */
class Value {
    eq(other) {
        if (!(other instanceof Value)) {
            other = new Literal(other);
        }
        return new Equals(this, other);
    }
    le(other) {
        if (!(other instanceof Value)) {
            other = new Literal(other);
        }
        return new LTeq(this, other);
    }
    ge(other) {
        if (!(other instanceof Value)) {
            other = new Literal(other);
        }
        return new GTeq(this, other);
    }
    lt(other) {
        return new Not(this.ge(other));
    }
    gt(other) {
        return new Not(this.le(other));
    }
    ne(other) {
        return new Not(this.eq(other));
    }
}
exports.Value = Value;
/** @ignore */
class Literal extends Value {
    constructor(v) {
        super();
        this.v = v;
    }
}
exports.Literal = Literal;
/** @ignore */
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
        const vec = this.vector = batch.getChildAt(this.colidx);
        return (idx) => vec.get(idx);
    }
}
exports.Col = Col;
/** @ignore */
class Predicate {
    and(...expr) { return new And(this, ...expr); }
    or(...expr) { return new Or(this, ...expr); }
    not() { return new Not(this); }
}
exports.Predicate = Predicate;
/** @ignore */
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
            else { // right is a Col
                return this._bindLitCol(batch, this.left, this.right);
            }
        }
        else { // left is a Col
            if (this.right instanceof Literal) {
                return this._bindColLit(batch, this.left, this.right);
            }
            else { // right is a Col
                return this._bindColCol(batch, this.left, this.right);
            }
        }
    }
}
exports.ComparisonPredicate = ComparisonPredicate;
/** @ignore */
class CombinationPredicate extends Predicate {
    constructor(...children) {
        super();
        this.children = children;
    }
}
exports.CombinationPredicate = CombinationPredicate;
// add children to protoype so it doesn't get mangled in es2015/umd
CombinationPredicate.prototype.children = Object.freeze([]); // freeze for safety
/** @ignore */
class And extends CombinationPredicate {
    constructor(...children) {
        // Flatten any Ands
        children = children.reduce((accum, p) => {
            return accum.concat(p instanceof And ? p.children : p);
        }, []);
        super(...children);
    }
    bind(batch) {
        const bound = this.children.map((p) => p.bind(batch));
        return (idx, batch) => bound.every((p) => p(idx, batch));
    }
}
exports.And = And;
/** @ignore */
class Or extends CombinationPredicate {
    constructor(...children) {
        // Flatten any Ors
        children = children.reduce((accum, p) => {
            return accum.concat(p instanceof Or ? p.children : p);
        }, []);
        super(...children);
    }
    bind(batch) {
        const bound = this.children.map((p) => p.bind(batch));
        return (idx, batch) => bound.some((p) => p(idx, batch));
    }
}
exports.Or = Or;
/** @ignore */
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
        if (col.vector instanceof dictionary_1.DictionaryVector) {
            let key;
            const vector = col.vector;
            if (vector.dictionary !== this.lastDictionary) {
                key = vector.reverseLookup(lit.v);
                this.lastDictionary = vector.dictionary;
                this.lastKey = key;
            }
            else {
                key = this.lastKey;
            }
            if (key === -1) {
                // the value doesn't exist in the dictionary - always return
                // false
                // TODO: special-case of PredicateFunc that encapsulates this
                // "always false" behavior. That way filtering operations don't
                // have to bother checking
                return () => false;
            }
            else {
                return (idx) => {
                    return vector.getKey(idx) === key;
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
/** @ignore */
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
/** @ignore */
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
/** @ignore */
class Not extends Predicate {
    constructor(child) {
        super();
        this.child = child;
    }
    bind(batch) {
        const func = this.child.bind(batch);
        return (idx, batch) => !func(idx, batch);
    }
}
exports.Not = Not;
/** @ignore */
class CustomPredicate extends Predicate {
    constructor(next, bind_) {
        super();
        this.next = next;
        this.bind_ = bind_;
    }
    bind(batch) {
        this.bind_(batch);
        return this.next;
    }
}
exports.CustomPredicate = CustomPredicate;
function lit(v) { return new Literal(v); }
exports.lit = lit;
function col(n) { return new Col(n); }
exports.col = col;
function and(...p) { return new And(...p); }
exports.and = and;
function or(...p) { return new Or(...p); }
exports.or = or;
function custom(next, bind) {
    return new CustomPredicate(next, bind);
}
exports.custom = custom;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbXB1dGUvcHJlZGljYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSw2REFBNkQ7QUFDN0QsK0RBQStEO0FBQy9ELHdEQUF3RDtBQUN4RCw2REFBNkQ7QUFDN0Qsb0RBQW9EO0FBQ3BELDZEQUE2RDtBQUM3RCw2REFBNkQ7QUFDN0QsRUFBRTtBQUNGLCtDQUErQztBQUMvQyxFQUFFO0FBQ0YsNkRBQTZEO0FBQzdELDhEQUE4RDtBQUM5RCx5REFBeUQ7QUFDekQsNERBQTREO0FBQzVELDBEQUEwRDtBQUMxRCxxQkFBcUI7O0FBSXJCLHFEQUF3RDtBQU94RCxjQUFjO0FBQ2QsTUFBc0IsS0FBSztJQUN2QixFQUFFLENBQUMsS0FBbUI7UUFDbEIsSUFBSSxDQUFDLENBQUMsS0FBSyxZQUFZLEtBQUssQ0FBQyxFQUFFO1lBQUUsS0FBSyxHQUFHLElBQUksT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQUU7UUFDOUQsT0FBTyxJQUFJLE1BQU0sQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUNELEVBQUUsQ0FBQyxLQUFtQjtRQUNsQixJQUFJLENBQUMsQ0FBQyxLQUFLLFlBQVksS0FBSyxDQUFDLEVBQUU7WUFBRSxLQUFLLEdBQUcsSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7U0FBRTtRQUM5RCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBQ0QsRUFBRSxDQUFDLEtBQW1CO1FBQ2xCLElBQUksQ0FBQyxDQUFDLEtBQUssWUFBWSxLQUFLLENBQUMsRUFBRTtZQUFFLEtBQUssR0FBRyxJQUFJLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUFFO1FBQzlELE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFDRCxFQUFFLENBQUMsS0FBbUI7UUFDbEIsT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUNELEVBQUUsQ0FBQyxLQUFtQjtRQUNsQixPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBQ0QsRUFBRSxDQUFDLEtBQW1CO1FBQ2xCLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ25DLENBQUM7Q0FDSjtBQXRCRCxzQkFzQkM7QUFFRCxjQUFjO0FBQ2QsTUFBYSxPQUFnQixTQUFRLEtBQVE7SUFDekMsWUFBbUIsQ0FBSTtRQUFJLEtBQUssRUFBRSxDQUFDO1FBQWhCLE1BQUMsR0FBRCxDQUFDLENBQUc7SUFBYSxDQUFDO0NBQ3hDO0FBRkQsMEJBRUM7QUFFRCxjQUFjO0FBQ2QsTUFBYSxHQUFZLFNBQVEsS0FBUTtJQU1yQyxZQUFtQixJQUFZO1FBQUksS0FBSyxFQUFFLENBQUM7UUFBeEIsU0FBSSxHQUFKLElBQUksQ0FBUTtJQUFhLENBQUM7SUFDN0MsSUFBSSxDQUFDLEtBQWtCO1FBQ25CLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ2QsMkRBQTJEO1lBQzNELHFFQUFxRTtZQUNyRSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2pCLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQ25DLEtBQUssSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLEdBQUcsTUFBTSxDQUFDLE1BQU0sR0FBRztnQkFDdkMsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLEVBQUU7b0JBQ2hDLElBQUksQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDO29CQUNsQixNQUFNO2lCQUNUO2FBQ0o7WUFDRCxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXVCLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO2FBQUU7U0FDakY7UUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBRSxDQUFDO1FBQ3pELE9BQU8sQ0FBQyxHQUFXLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDekMsQ0FBQztDQUNKO0FBekJELGtCQXlCQztBQUVELGNBQWM7QUFDZCxNQUFzQixTQUFTO0lBRTNCLEdBQUcsQ0FBQyxHQUFHLElBQWlCLElBQVMsT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakUsRUFBRSxDQUFDLEdBQUcsSUFBaUIsSUFBUSxPQUFPLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM5RCxHQUFHLEtBQWdCLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQzdDO0FBTEQsOEJBS0M7QUFFRCxjQUFjO0FBQ2QsTUFBc0IsbUJBQTRCLFNBQVEsU0FBUztJQUMvRCxZQUE0QixJQUFjLEVBQWtCLEtBQWU7UUFDdkUsS0FBSyxFQUFFLENBQUM7UUFEZ0IsU0FBSSxHQUFKLElBQUksQ0FBVTtRQUFrQixVQUFLLEdBQUwsS0FBSyxDQUFVO0lBRTNFLENBQUM7SUFFRCxJQUFJLENBQUMsS0FBa0I7UUFDbkIsSUFBSSxJQUFJLENBQUMsSUFBSSxZQUFZLE9BQU8sRUFBRTtZQUM5QixJQUFJLElBQUksQ0FBQyxLQUFLLFlBQVksT0FBTyxFQUFFO2dCQUMvQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ3pEO2lCQUFNLEVBQUUsaUJBQWlCO2dCQUV0QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQVksQ0FBQyxDQUFDO2FBQ2hFO1NBQ0o7YUFBTSxFQUFFLGdCQUFnQjtZQUNyQixJQUFJLElBQUksQ0FBQyxLQUFLLFlBQVksT0FBTyxFQUFFO2dCQUMvQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFXLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ2hFO2lCQUFNLEVBQUUsaUJBQWlCO2dCQUN0QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFXLEVBQUUsSUFBSSxDQUFDLEtBQVksQ0FBQyxDQUFDO2FBQ3ZFO1NBQ0o7SUFDTCxDQUFDO0NBTUo7QUExQkQsa0RBMEJDO0FBRUQsY0FBYztBQUNkLE1BQXNCLG9CQUFxQixTQUFRLFNBQVM7SUFFeEQsWUFBWSxHQUFHLFFBQXFCO1FBQ2hDLEtBQUssRUFBRSxDQUFDO1FBQ1IsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7SUFDN0IsQ0FBQztDQUNKO0FBTkQsb0RBTUM7QUFDRCxtRUFBbUU7QUFDNUQsb0JBQW9CLENBQUMsU0FBVSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsb0JBQW9CO0FBRXpGLGNBQWM7QUFDZCxNQUFhLEdBQUksU0FBUSxvQkFBb0I7SUFDekMsWUFBWSxHQUFHLFFBQXFCO1FBQ2hDLG1CQUFtQjtRQUNuQixRQUFRLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQWtCLEVBQUUsQ0FBWSxFQUFlLEVBQUU7WUFDekUsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNELENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNQLEtBQUssQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7SUFDRCxJQUFJLENBQUMsS0FBa0I7UUFDbkIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN0RCxPQUFPLENBQUMsR0FBVyxFQUFFLEtBQWtCLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNsRixDQUFDO0NBQ0o7QUFaRCxrQkFZQztBQUVELGNBQWM7QUFDZCxNQUFhLEVBQUcsU0FBUSxvQkFBb0I7SUFDeEMsWUFBWSxHQUFHLFFBQXFCO1FBQ2hDLGtCQUFrQjtRQUNsQixRQUFRLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQWtCLEVBQUUsQ0FBWSxFQUFlLEVBQUU7WUFDekUsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFELENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNQLEtBQUssQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7SUFDRCxJQUFJLENBQUMsS0FBa0I7UUFDbkIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN0RCxPQUFPLENBQUMsR0FBVyxFQUFFLEtBQWtCLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNqRixDQUFDO0NBQ0o7QUFaRCxnQkFZQztBQUVELGNBQWM7QUFDZCxNQUFhLE1BQU8sU0FBUSxtQkFBbUI7SUFLakMsV0FBVyxDQUFDLE1BQW1CLEVBQUUsSUFBYSxFQUFFLEtBQWM7UUFDcEUsTUFBTSxJQUFJLEdBQVksSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLE9BQU8sR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDO0lBQ3RCLENBQUM7SUFFUyxXQUFXLENBQUMsS0FBa0IsRUFBRSxJQUFTLEVBQUUsS0FBVTtRQUMzRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ25DLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDckMsT0FBTyxDQUFDLEdBQVcsRUFBRSxLQUFrQixFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLFVBQVUsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDaEcsQ0FBQztJQUVTLFdBQVcsQ0FBQyxLQUFrQixFQUFFLEdBQVEsRUFBRSxHQUFZO1FBQzVELE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakMsSUFBSSxHQUFHLENBQUMsTUFBTSxZQUFZLDZCQUFnQixFQUFFO1lBQ3hDLElBQUksR0FBUSxDQUFDO1lBQ2IsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQTBCLENBQUM7WUFDOUMsSUFBSSxNQUFNLENBQUMsVUFBVSxLQUFLLElBQUksQ0FBQyxjQUFjLEVBQUU7Z0JBQzNDLEdBQUcsR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbEMsSUFBSSxDQUFDLGNBQWMsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDO2dCQUN4QyxJQUFJLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQzthQUN0QjtpQkFBTTtnQkFDSCxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQzthQUN0QjtZQUVELElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxFQUFFO2dCQUNaLDREQUE0RDtnQkFDNUQsUUFBUTtnQkFDUiw2REFBNkQ7Z0JBQzdELCtEQUErRDtnQkFDL0QsMEJBQTBCO2dCQUMxQixPQUFPLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQzthQUN0QjtpQkFBTTtnQkFDSCxPQUFPLENBQUMsR0FBVyxFQUFFLEVBQUU7b0JBQ25CLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLENBQUM7Z0JBQ3RDLENBQUMsQ0FBQzthQUNMO1NBQ0o7YUFBTTtZQUNILE9BQU8sQ0FBQyxHQUFXLEVBQUUsSUFBaUIsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQzNFO0lBQ0wsQ0FBQztJQUVTLFdBQVcsQ0FBQyxLQUFrQixFQUFFLEdBQVksRUFBRSxHQUFRO1FBQzVELHVCQUF1QjtRQUN2QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUM3QyxDQUFDO0NBQ0o7QUFsREQsd0JBa0RDO0FBRUQsY0FBYztBQUNkLE1BQWEsSUFBSyxTQUFRLG1CQUFtQjtJQUMvQixXQUFXLENBQUMsTUFBbUIsRUFBRSxJQUFhLEVBQUUsS0FBYztRQUNwRSxNQUFNLElBQUksR0FBWSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDeEMsT0FBTyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUM7SUFDdEIsQ0FBQztJQUVTLFdBQVcsQ0FBQyxLQUFrQixFQUFFLElBQVMsRUFBRSxLQUFVO1FBQzNELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkMsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyQyxPQUFPLENBQUMsR0FBVyxFQUFFLElBQWlCLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksVUFBVSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3RixDQUFDO0lBRVMsV0FBVyxDQUFDLEtBQWtCLEVBQUUsR0FBUSxFQUFFLEdBQVk7UUFDNUQsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNqQyxPQUFPLENBQUMsR0FBVyxFQUFFLElBQWlCLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBRVMsV0FBVyxDQUFDLEtBQWtCLEVBQUUsR0FBWSxFQUFFLEdBQVE7UUFDNUQsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNqQyxPQUFPLENBQUMsR0FBVyxFQUFFLElBQWlCLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1RSxDQUFDO0NBQ0o7QUFyQkQsb0JBcUJDO0FBRUQsY0FBYztBQUNkLE1BQWEsSUFBSyxTQUFRLG1CQUFtQjtJQUMvQixXQUFXLENBQUMsTUFBbUIsRUFBRSxJQUFhLEVBQUUsS0FBYztRQUNwRSxNQUFNLElBQUksR0FBWSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDeEMsT0FBTyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUM7SUFDdEIsQ0FBQztJQUVTLFdBQVcsQ0FBQyxLQUFrQixFQUFFLElBQVMsRUFBRSxLQUFVO1FBQzNELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkMsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyQyxPQUFPLENBQUMsR0FBVyxFQUFFLElBQWlCLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksVUFBVSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3RixDQUFDO0lBRVMsV0FBVyxDQUFDLEtBQWtCLEVBQUUsR0FBUSxFQUFFLEdBQVk7UUFDNUQsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNqQyxPQUFPLENBQUMsR0FBVyxFQUFFLElBQWlCLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBRVMsV0FBVyxDQUFDLEtBQWtCLEVBQUUsR0FBWSxFQUFFLEdBQVE7UUFDNUQsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNqQyxPQUFPLENBQUMsR0FBVyxFQUFFLElBQWlCLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1RSxDQUFDO0NBQ0o7QUFyQkQsb0JBcUJDO0FBRUQsY0FBYztBQUNkLE1BQWEsR0FBSSxTQUFRLFNBQVM7SUFDOUIsWUFBNEIsS0FBZ0I7UUFDeEMsS0FBSyxFQUFFLENBQUM7UUFEZ0IsVUFBSyxHQUFMLEtBQUssQ0FBVztJQUU1QyxDQUFDO0lBRUQsSUFBSSxDQUFDLEtBQWtCO1FBQ25CLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BDLE9BQU8sQ0FBQyxHQUFXLEVBQUUsS0FBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2xFLENBQUM7Q0FDSjtBQVRELGtCQVNDO0FBRUQsY0FBYztBQUNkLE1BQWEsZUFBZ0IsU0FBUSxTQUFTO0lBQzFDLFlBQW9CLElBQW1CLEVBQVUsS0FBbUM7UUFDaEYsS0FBSyxFQUFFLENBQUM7UUFEUSxTQUFJLEdBQUosSUFBSSxDQUFlO1FBQVUsVUFBSyxHQUFMLEtBQUssQ0FBOEI7SUFFcEYsQ0FBQztJQUVELElBQUksQ0FBQyxLQUFrQjtRQUNuQixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztJQUNyQixDQUFDO0NBQ0o7QUFURCwwQ0FTQztBQUVELFNBQWdCLEdBQUcsQ0FBQyxDQUFNLElBQWdCLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQWxFLGtCQUFrRTtBQUNsRSxTQUFnQixHQUFHLENBQUMsQ0FBUyxJQUFjLE9BQU8sSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQS9ELGtCQUErRDtBQUMvRCxTQUFnQixHQUFHLENBQUMsR0FBRyxDQUFjLElBQVMsT0FBTyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUFyRSxrQkFBcUU7QUFDckUsU0FBZ0IsRUFBRSxDQUFDLEdBQUcsQ0FBYyxJQUFRLE9BQU8sSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFBbEUsZ0JBQWtFO0FBQ2xFLFNBQWdCLE1BQU0sQ0FBQyxJQUFtQixFQUFFLElBQWtDO0lBQzFFLE9BQU8sSUFBSSxlQUFlLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzNDLENBQUM7QUFGRCx3QkFFQyIsImZpbGUiOiJjb21wdXRlL3ByZWRpY2F0ZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBWZWN0b3IgfSBmcm9tICcuLi92ZWN0b3InO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2ggfSBmcm9tICcuLi9yZWNvcmRiYXRjaCc7XG5pbXBvcnQgeyBEaWN0aW9uYXJ5VmVjdG9yIH0gZnJvbSAnLi4vdmVjdG9yL2RpY3Rpb25hcnknO1xuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IHR5cGUgVmFsdWVGdW5jPFQ+ID0gKGlkeDogbnVtYmVyLCBjb2xzOiBSZWNvcmRCYXRjaCkgPT4gVCB8IG51bGw7XG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IHR5cGUgUHJlZGljYXRlRnVuYyA9IChpZHg6IG51bWJlciwgY29sczogUmVjb3JkQmF0Y2gpID0+IGJvb2xlYW47XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgVmFsdWU8VD4ge1xuICAgIGVxKG90aGVyOiBWYWx1ZTxUPiB8IFQpOiBQcmVkaWNhdGUge1xuICAgICAgICBpZiAoIShvdGhlciBpbnN0YW5jZW9mIFZhbHVlKSkgeyBvdGhlciA9IG5ldyBMaXRlcmFsKG90aGVyKTsgfVxuICAgICAgICByZXR1cm4gbmV3IEVxdWFscyh0aGlzLCBvdGhlcik7XG4gICAgfVxuICAgIGxlKG90aGVyOiBWYWx1ZTxUPiB8IFQpOiBQcmVkaWNhdGUge1xuICAgICAgICBpZiAoIShvdGhlciBpbnN0YW5jZW9mIFZhbHVlKSkgeyBvdGhlciA9IG5ldyBMaXRlcmFsKG90aGVyKTsgfVxuICAgICAgICByZXR1cm4gbmV3IExUZXEodGhpcywgb3RoZXIpO1xuICAgIH1cbiAgICBnZShvdGhlcjogVmFsdWU8VD4gfCBUKTogUHJlZGljYXRlIHtcbiAgICAgICAgaWYgKCEob3RoZXIgaW5zdGFuY2VvZiBWYWx1ZSkpIHsgb3RoZXIgPSBuZXcgTGl0ZXJhbChvdGhlcik7IH1cbiAgICAgICAgcmV0dXJuIG5ldyBHVGVxKHRoaXMsIG90aGVyKTtcbiAgICB9XG4gICAgbHQob3RoZXI6IFZhbHVlPFQ+IHwgVCk6IFByZWRpY2F0ZSB7XG4gICAgICAgIHJldHVybiBuZXcgTm90KHRoaXMuZ2Uob3RoZXIpKTtcbiAgICB9XG4gICAgZ3Qob3RoZXI6IFZhbHVlPFQ+IHwgVCk6IFByZWRpY2F0ZSB7XG4gICAgICAgIHJldHVybiBuZXcgTm90KHRoaXMubGUob3RoZXIpKTtcbiAgICB9XG4gICAgbmUob3RoZXI6IFZhbHVlPFQ+IHwgVCk6IFByZWRpY2F0ZSB7XG4gICAgICAgIHJldHVybiBuZXcgTm90KHRoaXMuZXEob3RoZXIpKTtcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY2xhc3MgTGl0ZXJhbDxUPSBhbnk+IGV4dGVuZHMgVmFsdWU8VD4ge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyB2OiBUKSB7IHN1cGVyKCk7IH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjbGFzcyBDb2w8VD0gYW55PiBleHRlbmRzIFZhbHVlPFQ+IHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIHZlY3RvcjogVmVjdG9yO1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwdWJsaWMgY29saWR4OiBudW1iZXI7XG5cbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgbmFtZTogc3RyaW5nKSB7IHN1cGVyKCk7IH1cbiAgICBiaW5kKGJhdGNoOiBSZWNvcmRCYXRjaCk6IChpZHg6IG51bWJlciwgYmF0Y2g/OiBSZWNvcmRCYXRjaCkgPT4gYW55IHtcbiAgICAgICAgaWYgKCF0aGlzLmNvbGlkeCkge1xuICAgICAgICAgICAgLy8gQXNzdW1lIGNvbHVtbiBpbmRleCBkb2Vzbid0IGNoYW5nZSBiZXR3ZWVuIGNhbGxzIHRvIGJpbmRcbiAgICAgICAgICAgIC8vdGhpcy5jb2xpZHggPSBjb2xzLmZpbmRJbmRleCh2ID0+IHYubmFtZS5pbmRleE9mKHRoaXMubmFtZSkgIT0gLTEpO1xuICAgICAgICAgICAgdGhpcy5jb2xpZHggPSAtMTtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkcyA9IGJhdGNoLnNjaGVtYS5maWVsZHM7XG4gICAgICAgICAgICBmb3IgKGxldCBpZHggPSAtMTsgKytpZHggPCBmaWVsZHMubGVuZ3RoOykge1xuICAgICAgICAgICAgICAgIGlmIChmaWVsZHNbaWR4XS5uYW1lID09PSB0aGlzLm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xpZHggPSBpZHg7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmNvbGlkeCA8IDApIHsgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gYmluZCBDb2wgXCIke3RoaXMubmFtZX1cImApOyB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB2ZWMgPSB0aGlzLnZlY3RvciA9IGJhdGNoLmdldENoaWxkQXQodGhpcy5jb2xpZHgpITtcbiAgICAgICAgcmV0dXJuIChpZHg6IG51bWJlcikgPT4gdmVjLmdldChpZHgpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBQcmVkaWNhdGUge1xuICAgIGFic3RyYWN0IGJpbmQoYmF0Y2g6IFJlY29yZEJhdGNoKTogUHJlZGljYXRlRnVuYztcbiAgICBhbmQoLi4uZXhwcjogUHJlZGljYXRlW10pOiBBbmQgeyByZXR1cm4gbmV3IEFuZCh0aGlzLCAuLi5leHByKTsgfVxuICAgIG9yKC4uLmV4cHI6IFByZWRpY2F0ZVtdKTogT3IgeyByZXR1cm4gbmV3IE9yKHRoaXMsIC4uLmV4cHIpOyB9XG4gICAgbm90KCk6IFByZWRpY2F0ZSB7IHJldHVybiBuZXcgTm90KHRoaXMpOyB9XG59XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQ29tcGFyaXNvblByZWRpY2F0ZTxUPSBhbnk+IGV4dGVuZHMgUHJlZGljYXRlIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgbGVmdDogVmFsdWU8VD4sIHB1YmxpYyByZWFkb25seSByaWdodDogVmFsdWU8VD4pIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICB9XG5cbiAgICBiaW5kKGJhdGNoOiBSZWNvcmRCYXRjaCkge1xuICAgICAgICBpZiAodGhpcy5sZWZ0IGluc3RhbmNlb2YgTGl0ZXJhbCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucmlnaHQgaW5zdGFuY2VvZiBMaXRlcmFsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2JpbmRMaXRMaXQoYmF0Y2gsIHRoaXMubGVmdCwgdGhpcy5yaWdodCk7XG4gICAgICAgICAgICB9IGVsc2UgeyAvLyByaWdodCBpcyBhIENvbFxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2JpbmRMaXRDb2woYmF0Y2gsIHRoaXMubGVmdCwgdGhpcy5yaWdodCBhcyBDb2wpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgeyAvLyBsZWZ0IGlzIGEgQ29sXG4gICAgICAgICAgICBpZiAodGhpcy5yaWdodCBpbnN0YW5jZW9mIExpdGVyYWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fYmluZENvbExpdChiYXRjaCwgdGhpcy5sZWZ0IGFzIENvbCwgdGhpcy5yaWdodCk7XG4gICAgICAgICAgICB9IGVsc2UgeyAvLyByaWdodCBpcyBhIENvbFxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9iaW5kQ29sQ29sKGJhdGNoLCB0aGlzLmxlZnQgYXMgQ29sLCB0aGlzLnJpZ2h0IGFzIENvbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgYWJzdHJhY3QgX2JpbmRMaXRMaXQoYmF0Y2g6IFJlY29yZEJhdGNoLCBsZWZ0OiBMaXRlcmFsLCByaWdodDogTGl0ZXJhbCk6IFByZWRpY2F0ZUZ1bmM7XG4gICAgcHJvdGVjdGVkIGFic3RyYWN0IF9iaW5kQ29sQ29sKGJhdGNoOiBSZWNvcmRCYXRjaCwgbGVmdDogQ29sLCByaWdodDogQ29sKTogUHJlZGljYXRlRnVuYztcbiAgICBwcm90ZWN0ZWQgYWJzdHJhY3QgX2JpbmRDb2xMaXQoYmF0Y2g6IFJlY29yZEJhdGNoLCBjb2w6IENvbCwgbGl0OiBMaXRlcmFsKTogUHJlZGljYXRlRnVuYztcbiAgICBwcm90ZWN0ZWQgYWJzdHJhY3QgX2JpbmRMaXRDb2woYmF0Y2g6IFJlY29yZEJhdGNoLCBsaXQ6IExpdGVyYWwsIGNvbDogQ29sKTogUHJlZGljYXRlRnVuYztcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBDb21iaW5hdGlvblByZWRpY2F0ZSBleHRlbmRzIFByZWRpY2F0ZSB7XG4gICAgcmVhZG9ubHkgY2hpbGRyZW46IFByZWRpY2F0ZVtdO1xuICAgIGNvbnN0cnVjdG9yKC4uLmNoaWxkcmVuOiBQcmVkaWNhdGVbXSkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLmNoaWxkcmVuID0gY2hpbGRyZW47XG4gICAgfVxufVxuLy8gYWRkIGNoaWxkcmVuIHRvIHByb3RveXBlIHNvIGl0IGRvZXNuJ3QgZ2V0IG1hbmdsZWQgaW4gZXMyMDE1L3VtZFxuKDxhbnk+IENvbWJpbmF0aW9uUHJlZGljYXRlLnByb3RvdHlwZSkuY2hpbGRyZW4gPSBPYmplY3QuZnJlZXplKFtdKTsgLy8gZnJlZXplIGZvciBzYWZldHlcblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjbGFzcyBBbmQgZXh0ZW5kcyBDb21iaW5hdGlvblByZWRpY2F0ZSB7XG4gICAgY29uc3RydWN0b3IoLi4uY2hpbGRyZW46IFByZWRpY2F0ZVtdKSB7XG4gICAgICAgIC8vIEZsYXR0ZW4gYW55IEFuZHNcbiAgICAgICAgY2hpbGRyZW4gPSBjaGlsZHJlbi5yZWR1Y2UoKGFjY3VtOiBQcmVkaWNhdGVbXSwgcDogUHJlZGljYXRlKTogUHJlZGljYXRlW10gPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGFjY3VtLmNvbmNhdChwIGluc3RhbmNlb2YgQW5kID8gcC5jaGlsZHJlbiA6IHApO1xuICAgICAgICB9LCBbXSk7XG4gICAgICAgIHN1cGVyKC4uLmNoaWxkcmVuKTtcbiAgICB9XG4gICAgYmluZChiYXRjaDogUmVjb3JkQmF0Y2gpIHtcbiAgICAgICAgY29uc3QgYm91bmQgPSB0aGlzLmNoaWxkcmVuLm1hcCgocCkgPT4gcC5iaW5kKGJhdGNoKSk7XG4gICAgICAgIHJldHVybiAoaWR4OiBudW1iZXIsIGJhdGNoOiBSZWNvcmRCYXRjaCkgPT4gYm91bmQuZXZlcnkoKHApID0+IHAoaWR4LCBiYXRjaCkpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjbGFzcyBPciBleHRlbmRzIENvbWJpbmF0aW9uUHJlZGljYXRlIHtcbiAgICBjb25zdHJ1Y3RvciguLi5jaGlsZHJlbjogUHJlZGljYXRlW10pIHtcbiAgICAgICAgLy8gRmxhdHRlbiBhbnkgT3JzXG4gICAgICAgIGNoaWxkcmVuID0gY2hpbGRyZW4ucmVkdWNlKChhY2N1bTogUHJlZGljYXRlW10sIHA6IFByZWRpY2F0ZSk6IFByZWRpY2F0ZVtdID0+IHtcbiAgICAgICAgICAgIHJldHVybiBhY2N1bS5jb25jYXQocCBpbnN0YW5jZW9mIE9yID8gcC5jaGlsZHJlbiA6IHApO1xuICAgICAgICB9LCBbXSk7XG4gICAgICAgIHN1cGVyKC4uLmNoaWxkcmVuKTtcbiAgICB9XG4gICAgYmluZChiYXRjaDogUmVjb3JkQmF0Y2gpIHtcbiAgICAgICAgY29uc3QgYm91bmQgPSB0aGlzLmNoaWxkcmVuLm1hcCgocCkgPT4gcC5iaW5kKGJhdGNoKSk7XG4gICAgICAgIHJldHVybiAoaWR4OiBudW1iZXIsIGJhdGNoOiBSZWNvcmRCYXRjaCkgPT4gYm91bmQuc29tZSgocCkgPT4gcChpZHgsIGJhdGNoKSk7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIEVxdWFscyBleHRlbmRzIENvbXBhcmlzb25QcmVkaWNhdGUge1xuICAgIC8vIEhlbHBlcnMgdXNlZCB0byBjYWNoZSBkaWN0aW9uYXJ5IHJldmVyc2UgbG9va3VwcyBiZXR3ZWVuIGNhbGxzIHRvIGJpbmRcbiAgICBwcml2YXRlIGxhc3REaWN0aW9uYXJ5OiBWZWN0b3J8dW5kZWZpbmVkO1xuICAgIHByaXZhdGUgbGFzdEtleTogbnVtYmVyfHVuZGVmaW5lZDtcblxuICAgIHByb3RlY3RlZCBfYmluZExpdExpdChfYmF0Y2g6IFJlY29yZEJhdGNoLCBsZWZ0OiBMaXRlcmFsLCByaWdodDogTGl0ZXJhbCk6IFByZWRpY2F0ZUZ1bmMge1xuICAgICAgICBjb25zdCBydHJuOiBib29sZWFuID0gbGVmdC52ID09IHJpZ2h0LnY7XG4gICAgICAgIHJldHVybiAoKSA9PiBydHJuO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfYmluZENvbENvbChiYXRjaDogUmVjb3JkQmF0Y2gsIGxlZnQ6IENvbCwgcmlnaHQ6IENvbCk6IFByZWRpY2F0ZUZ1bmMge1xuICAgICAgICBjb25zdCBsZWZ0X2Z1bmMgPSBsZWZ0LmJpbmQoYmF0Y2gpO1xuICAgICAgICBjb25zdCByaWdodF9mdW5jID0gcmlnaHQuYmluZChiYXRjaCk7XG4gICAgICAgIHJldHVybiAoaWR4OiBudW1iZXIsIGJhdGNoOiBSZWNvcmRCYXRjaCkgPT4gbGVmdF9mdW5jKGlkeCwgYmF0Y2gpID09IHJpZ2h0X2Z1bmMoaWR4LCBiYXRjaCk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF9iaW5kQ29sTGl0KGJhdGNoOiBSZWNvcmRCYXRjaCwgY29sOiBDb2wsIGxpdDogTGl0ZXJhbCk6IFByZWRpY2F0ZUZ1bmMge1xuICAgICAgICBjb25zdCBjb2xfZnVuYyA9IGNvbC5iaW5kKGJhdGNoKTtcbiAgICAgICAgaWYgKGNvbC52ZWN0b3IgaW5zdGFuY2VvZiBEaWN0aW9uYXJ5VmVjdG9yKSB7XG4gICAgICAgICAgICBsZXQga2V5OiBhbnk7XG4gICAgICAgICAgICBjb25zdCB2ZWN0b3IgPSBjb2wudmVjdG9yIGFzIERpY3Rpb25hcnlWZWN0b3I7XG4gICAgICAgICAgICBpZiAodmVjdG9yLmRpY3Rpb25hcnkgIT09IHRoaXMubGFzdERpY3Rpb25hcnkpIHtcbiAgICAgICAgICAgICAgICBrZXkgPSB2ZWN0b3IucmV2ZXJzZUxvb2t1cChsaXQudik7XG4gICAgICAgICAgICAgICAgdGhpcy5sYXN0RGljdGlvbmFyeSA9IHZlY3Rvci5kaWN0aW9uYXJ5O1xuICAgICAgICAgICAgICAgIHRoaXMubGFzdEtleSA9IGtleTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAga2V5ID0gdGhpcy5sYXN0S2V5O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoa2V5ID09PSAtMSkge1xuICAgICAgICAgICAgICAgIC8vIHRoZSB2YWx1ZSBkb2Vzbid0IGV4aXN0IGluIHRoZSBkaWN0aW9uYXJ5IC0gYWx3YXlzIHJldHVyblxuICAgICAgICAgICAgICAgIC8vIGZhbHNlXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogc3BlY2lhbC1jYXNlIG9mIFByZWRpY2F0ZUZ1bmMgdGhhdCBlbmNhcHN1bGF0ZXMgdGhpc1xuICAgICAgICAgICAgICAgIC8vIFwiYWx3YXlzIGZhbHNlXCIgYmVoYXZpb3IuIFRoYXQgd2F5IGZpbHRlcmluZyBvcGVyYXRpb25zIGRvbid0XG4gICAgICAgICAgICAgICAgLy8gaGF2ZSB0byBib3RoZXIgY2hlY2tpbmdcbiAgICAgICAgICAgICAgICByZXR1cm4gKCkgPT4gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAoaWR4OiBudW1iZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZlY3Rvci5nZXRLZXkoaWR4KSA9PT0ga2V5O1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gKGlkeDogbnVtYmVyLCBjb2xzOiBSZWNvcmRCYXRjaCkgPT4gY29sX2Z1bmMoaWR4LCBjb2xzKSA9PSBsaXQudjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByb3RlY3RlZCBfYmluZExpdENvbChiYXRjaDogUmVjb3JkQmF0Y2gsIGxpdDogTGl0ZXJhbCwgY29sOiBDb2wpIHtcbiAgICAgICAgLy8gRXF1YWxzIGlzIGNvbXV0YXRpdmVcbiAgICAgICAgcmV0dXJuIHRoaXMuX2JpbmRDb2xMaXQoYmF0Y2gsIGNvbCwgbGl0KTtcbiAgICB9XG59XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY2xhc3MgTFRlcSBleHRlbmRzIENvbXBhcmlzb25QcmVkaWNhdGUge1xuICAgIHByb3RlY3RlZCBfYmluZExpdExpdChfYmF0Y2g6IFJlY29yZEJhdGNoLCBsZWZ0OiBMaXRlcmFsLCByaWdodDogTGl0ZXJhbCk6IFByZWRpY2F0ZUZ1bmMge1xuICAgICAgICBjb25zdCBydHJuOiBib29sZWFuID0gbGVmdC52IDw9IHJpZ2h0LnY7XG4gICAgICAgIHJldHVybiAoKSA9PiBydHJuO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfYmluZENvbENvbChiYXRjaDogUmVjb3JkQmF0Y2gsIGxlZnQ6IENvbCwgcmlnaHQ6IENvbCk6IFByZWRpY2F0ZUZ1bmMge1xuICAgICAgICBjb25zdCBsZWZ0X2Z1bmMgPSBsZWZ0LmJpbmQoYmF0Y2gpO1xuICAgICAgICBjb25zdCByaWdodF9mdW5jID0gcmlnaHQuYmluZChiYXRjaCk7XG4gICAgICAgIHJldHVybiAoaWR4OiBudW1iZXIsIGNvbHM6IFJlY29yZEJhdGNoKSA9PiBsZWZ0X2Z1bmMoaWR4LCBjb2xzKSA8PSByaWdodF9mdW5jKGlkeCwgY29scyk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF9iaW5kQ29sTGl0KGJhdGNoOiBSZWNvcmRCYXRjaCwgY29sOiBDb2wsIGxpdDogTGl0ZXJhbCk6IFByZWRpY2F0ZUZ1bmMge1xuICAgICAgICBjb25zdCBjb2xfZnVuYyA9IGNvbC5iaW5kKGJhdGNoKTtcbiAgICAgICAgcmV0dXJuIChpZHg6IG51bWJlciwgY29sczogUmVjb3JkQmF0Y2gpID0+IGNvbF9mdW5jKGlkeCwgY29scykgPD0gbGl0LnY7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF9iaW5kTGl0Q29sKGJhdGNoOiBSZWNvcmRCYXRjaCwgbGl0OiBMaXRlcmFsLCBjb2w6IENvbCkge1xuICAgICAgICBjb25zdCBjb2xfZnVuYyA9IGNvbC5iaW5kKGJhdGNoKTtcbiAgICAgICAgcmV0dXJuIChpZHg6IG51bWJlciwgY29sczogUmVjb3JkQmF0Y2gpID0+IGxpdC52IDw9IGNvbF9mdW5jKGlkeCwgY29scyk7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIEdUZXEgZXh0ZW5kcyBDb21wYXJpc29uUHJlZGljYXRlIHtcbiAgICBwcm90ZWN0ZWQgX2JpbmRMaXRMaXQoX2JhdGNoOiBSZWNvcmRCYXRjaCwgbGVmdDogTGl0ZXJhbCwgcmlnaHQ6IExpdGVyYWwpOiBQcmVkaWNhdGVGdW5jIHtcbiAgICAgICAgY29uc3QgcnRybjogYm9vbGVhbiA9IGxlZnQudiA+PSByaWdodC52O1xuICAgICAgICByZXR1cm4gKCkgPT4gcnRybjtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX2JpbmRDb2xDb2woYmF0Y2g6IFJlY29yZEJhdGNoLCBsZWZ0OiBDb2wsIHJpZ2h0OiBDb2wpOiBQcmVkaWNhdGVGdW5jIHtcbiAgICAgICAgY29uc3QgbGVmdF9mdW5jID0gbGVmdC5iaW5kKGJhdGNoKTtcbiAgICAgICAgY29uc3QgcmlnaHRfZnVuYyA9IHJpZ2h0LmJpbmQoYmF0Y2gpO1xuICAgICAgICByZXR1cm4gKGlkeDogbnVtYmVyLCBjb2xzOiBSZWNvcmRCYXRjaCkgPT4gbGVmdF9mdW5jKGlkeCwgY29scykgPj0gcmlnaHRfZnVuYyhpZHgsIGNvbHMpO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfYmluZENvbExpdChiYXRjaDogUmVjb3JkQmF0Y2gsIGNvbDogQ29sLCBsaXQ6IExpdGVyYWwpOiBQcmVkaWNhdGVGdW5jIHtcbiAgICAgICAgY29uc3QgY29sX2Z1bmMgPSBjb2wuYmluZChiYXRjaCk7XG4gICAgICAgIHJldHVybiAoaWR4OiBudW1iZXIsIGNvbHM6IFJlY29yZEJhdGNoKSA9PiBjb2xfZnVuYyhpZHgsIGNvbHMpID49IGxpdC52O1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBfYmluZExpdENvbChiYXRjaDogUmVjb3JkQmF0Y2gsIGxpdDogTGl0ZXJhbCwgY29sOiBDb2wpIHtcbiAgICAgICAgY29uc3QgY29sX2Z1bmMgPSBjb2wuYmluZChiYXRjaCk7XG4gICAgICAgIHJldHVybiAoaWR4OiBudW1iZXIsIGNvbHM6IFJlY29yZEJhdGNoKSA9PiBsaXQudiA+PSBjb2xfZnVuYyhpZHgsIGNvbHMpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjbGFzcyBOb3QgZXh0ZW5kcyBQcmVkaWNhdGUge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyByZWFkb25seSBjaGlsZDogUHJlZGljYXRlKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgfVxuXG4gICAgYmluZChiYXRjaDogUmVjb3JkQmF0Y2gpIHtcbiAgICAgICAgY29uc3QgZnVuYyA9IHRoaXMuY2hpbGQuYmluZChiYXRjaCk7XG4gICAgICAgIHJldHVybiAoaWR4OiBudW1iZXIsIGJhdGNoOiBSZWNvcmRCYXRjaCkgPT4gIWZ1bmMoaWR4LCBiYXRjaCk7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIEN1c3RvbVByZWRpY2F0ZSBleHRlbmRzIFByZWRpY2F0ZSB7XG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBuZXh0OiBQcmVkaWNhdGVGdW5jLCBwcml2YXRlIGJpbmRfOiAoYmF0Y2g6IFJlY29yZEJhdGNoKSA9PiB2b2lkKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgfVxuXG4gICAgYmluZChiYXRjaDogUmVjb3JkQmF0Y2gpIHtcbiAgICAgICAgdGhpcy5iaW5kXyhiYXRjaCk7XG4gICAgICAgIHJldHVybiB0aGlzLm5leHQ7XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbGl0KHY6IGFueSk6IFZhbHVlPGFueT4geyByZXR1cm4gbmV3IExpdGVyYWwodik7IH1cbmV4cG9ydCBmdW5jdGlvbiBjb2wobjogc3RyaW5nKTogQ29sPGFueT4geyByZXR1cm4gbmV3IENvbChuKTsgfVxuZXhwb3J0IGZ1bmN0aW9uIGFuZCguLi5wOiBQcmVkaWNhdGVbXSk6IEFuZCB7IHJldHVybiBuZXcgQW5kKC4uLnApOyB9XG5leHBvcnQgZnVuY3Rpb24gb3IoLi4ucDogUHJlZGljYXRlW10pOiBPciB7IHJldHVybiBuZXcgT3IoLi4ucCk7IH1cbmV4cG9ydCBmdW5jdGlvbiBjdXN0b20obmV4dDogUHJlZGljYXRlRnVuYywgYmluZDogKGJhdGNoOiBSZWNvcmRCYXRjaCkgPT4gdm9pZCkge1xuICAgIHJldHVybiBuZXcgQ3VzdG9tUHJlZGljYXRlKG5leHQsIGJpbmQpO1xufVxuIl19

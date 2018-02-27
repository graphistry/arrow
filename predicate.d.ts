import { RecordBatch } from './recordbatch';
import { Vector } from './vector';
export declare type ValueFunc<T> = (idx: number, cols: RecordBatch) => T | null;
export declare type PredicateFunc = (idx: number, cols: RecordBatch) => boolean;
export declare abstract class Value<T> {
    eq(other: Value<T> | T): Predicate;
    lteq(other: Value<T> | T): Predicate;
    gteq(other: Value<T> | T): Predicate;
}
export declare class Literal<T = any> extends Value<T> {
    v: T;
    constructor(v: T);
}
export declare class Col<T = any> extends Value<T> {
    name: string;
    vector: Vector;
    colidx: number;
    constructor(name: string);
    bind(batch: RecordBatch): any;
}
export declare abstract class Predicate {
    abstract bind(batch: RecordBatch): PredicateFunc;
    and(expr: Predicate): Predicate;
    or(expr: Predicate): Predicate;
    ands(): Predicate[];
}
export declare abstract class ComparisonPredicate<T = any> extends Predicate {
    readonly left: Value<T>;
    readonly right: Value<T>;
    constructor(left: Value<T>, right: Value<T>);
    bind(batch: RecordBatch): PredicateFunc;
    protected abstract _bindLitLit(batch: RecordBatch, left: Literal, right: Literal): PredicateFunc;
    protected abstract _bindColCol(batch: RecordBatch, left: Col, right: Col): PredicateFunc;
    protected abstract _bindColLit(batch: RecordBatch, col: Col, lit: Literal): PredicateFunc;
    protected abstract _bindLitCol(batch: RecordBatch, lit: Literal, col: Col): PredicateFunc;
}
export declare abstract class CombinationPredicate extends Predicate {
    readonly left: Predicate;
    readonly right: Predicate;
    constructor(left: Predicate, right: Predicate);
}
export declare class And extends CombinationPredicate {
    bind(batch: RecordBatch): (idx: number, batch: RecordBatch) => boolean;
    ands(): Predicate[];
}
export declare class Or extends CombinationPredicate {
    bind(batch: RecordBatch): (idx: number, batch: RecordBatch) => boolean;
}
export declare class Equals extends ComparisonPredicate {
    private lastDictionary;
    private lastKey;
    protected _bindLitLit(_batch: RecordBatch, left: Literal, right: Literal): PredicateFunc;
    protected _bindColCol(batch: RecordBatch, left: Col, right: Col): PredicateFunc;
    protected _bindColLit(batch: RecordBatch, col: Col, lit: Literal): PredicateFunc;
    protected _bindLitCol(batch: RecordBatch, lit: Literal, col: Col): PredicateFunc;
}
export declare class LTeq extends ComparisonPredicate {
    protected _bindLitLit(_batch: RecordBatch, left: Literal, right: Literal): PredicateFunc;
    protected _bindColCol(batch: RecordBatch, left: Col, right: Col): PredicateFunc;
    protected _bindColLit(batch: RecordBatch, col: Col, lit: Literal): PredicateFunc;
    protected _bindLitCol(batch: RecordBatch, lit: Literal, col: Col): (idx: number, cols: RecordBatch) => boolean;
}
export declare class GTeq extends ComparisonPredicate {
    protected _bindLitLit(_batch: RecordBatch, left: Literal, right: Literal): PredicateFunc;
    protected _bindColCol(batch: RecordBatch, left: Col, right: Col): PredicateFunc;
    protected _bindColLit(batch: RecordBatch, col: Col, lit: Literal): PredicateFunc;
    protected _bindLitCol(batch: RecordBatch, lit: Literal, col: Col): (idx: number, cols: RecordBatch) => boolean;
}
export declare class CustomPredicate extends Predicate {
    private next;
    private bind_;
    constructor(next: PredicateFunc, bind_: (batch: RecordBatch) => void);
    bind(batch: RecordBatch): PredicateFunc;
}
export declare function lit(v: any): Value<any>;
export declare function col(n: string): Col<any>;
export declare function custom(next: PredicateFunc, bind: (batch: RecordBatch) => void): CustomPredicate;

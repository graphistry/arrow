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
    emitString(): string;
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
}
export declare class Equals extends ComparisonPredicate {
    protected _bindLitLit(_batch: RecordBatch, left: Literal, right: Literal): PredicateFunc;
    protected _bindColCol(batch: RecordBatch, left: Col, right: Col): PredicateFunc;
    protected _bindColLit(batch: RecordBatch, col: Col, lit: Literal): PredicateFunc;
}
export declare class LTeq extends ComparisonPredicate {
    protected _bindLitLit(_batch: RecordBatch, left: Literal, right: Literal): PredicateFunc;
    protected _bindColCol(batch: RecordBatch, left: Col, right: Col): PredicateFunc;
    protected _bindColLit(batch: RecordBatch, col: Col, lit: Literal): PredicateFunc;
}
export declare class GTeq extends ComparisonPredicate {
    protected _bindLitLit(_batch: RecordBatch, left: Literal, right: Literal): PredicateFunc;
    protected _bindColCol(batch: RecordBatch, left: Col, right: Col): PredicateFunc;
    protected _bindColLit(batch: RecordBatch, col: Col, lit: Literal): PredicateFunc;
}
export declare function lit(n: number): Value<any>;
export declare function col(n: string): Col<any>;
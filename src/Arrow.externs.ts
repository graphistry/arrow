/**
 * @fileoverview Closure Compiler externs for Arrow
 * @externs
 * @suppress {duplicate,checkTypes}
 */
/** @type {symbol} */
Symbol.iterator;
/** @type {symbol} */
Symbol.asyncIterator;
let Table = function() {};
/** @type {?} */
Table.prototype.rows;
/** @type {?} */
Table.prototype.cols;
/** @type {?} */
Table.prototype.getRow;
/** @type {?} */
Table.prototype.getCell;
/** @type {?} */
Table.prototype.getCellAt;
/** @type {?} */
Table.prototype.getColumn;
/** @type {?} */
Table.prototype.getColumnAt;
/** @type {?} */
Table.prototype.toString;

let Vector = function() {};
/** @type {?} */
Vector.prototype.length;
/** @type {?} */
Vector.prototype.name;
/** @type {?} */
Vector.prototype.type;
/** @type {?} */
Vector.prototype.props;
/** @type {?} */
Vector.prototype.get;
/** @type {?} */
Vector.prototype.concat;
/** @type {?} */
Vector.prototype.slice;

let TypedVector = function() {};
/** @type {?} */
TypedVector.prototype.arrayType;

let ValidityVector = function() {};
/** @type {?} */
(<any> ValidityVector).pack;

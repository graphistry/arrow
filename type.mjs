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
import * as Schema_ from './fb/Schema';
import * as Message_ from './fb/Message';
import { flatbuffers } from 'flatbuffers';
import { DictionaryBatch } from './ipc/metadata';
export var Long = flatbuffers.Long;
export var ArrowType = Schema_.org.apache.arrow.flatbuf.Type;
export var DateUnit = Schema_.org.apache.arrow.flatbuf.DateUnit;
export var TimeUnit = Schema_.org.apache.arrow.flatbuf.TimeUnit;
export var Precision = Schema_.org.apache.arrow.flatbuf.Precision;
export var UnionMode = Schema_.org.apache.arrow.flatbuf.UnionMode;
export var VectorType = Schema_.org.apache.arrow.flatbuf.VectorType;
export var IntervalUnit = Schema_.org.apache.arrow.flatbuf.IntervalUnit;
export var MessageHeader = Message_.org.apache.arrow.flatbuf.MessageHeader;
export var MetadataVersion = Schema_.org.apache.arrow.flatbuf.MetadataVersion;
export class Schema {
    constructor(fields, metadata, version = MetadataVersion.V4, dictionaries = new Map()) {
        this.fields = fields;
        this.version = version;
        this.metadata = metadata;
        this.dictionaries = dictionaries;
    }
    static from(vectors) {
        return new Schema(vectors.map((v, i) => new Field('' + i, v.type)));
    }
    get bodyLength() { return this._bodyLength; }
    get headerType() { return this._headerType; }
    select(...fieldNames) {
        const namesToKeep = fieldNames.reduce((xs, x) => (xs[x] = true) && xs, Object.create(null));
        const newDictFields = new Map(), newFields = this.fields.filter((f) => namesToKeep[f.name]);
        this.dictionaries.forEach((f, dictId) => (namesToKeep[f.name]) && newDictFields.set(dictId, f));
        return new Schema(newFields, this.metadata, this.version, newDictFields);
    }
}
Schema[Symbol.toStringTag] = ((prototype) => {
    prototype._bodyLength = 0;
    prototype._headerType = MessageHeader.Schema;
    return 'Schema';
})(Schema.prototype);
export class Field {
    constructor(name, type, nullable = false, metadata) {
        this.name = name;
        this.type = type;
        this.nullable = nullable;
        this.metadata = metadata;
    }
    toString() { return `${this.name}: ${this.type}`; }
    get typeId() { return this.type.TType; }
    get [Symbol.toStringTag]() { return 'Field'; }
    get indicies() {
        return DataType.isDictionary(this.type) ? this.type.indicies : this.type;
    }
}
/**
 * *
 * Main data type enumeration:
 * *
 * Data types in this library are all *logical*. They can be expressed as
 * either a primitive physical type (bytes or bits of some fixed size), a
 * nested type consisting of other data types, or another data type (e.g. a
 * timestamp encoded as an int64)
 */
export var Type;
(function (Type) {
    Type[Type["NONE"] = 0] = "NONE";
    Type[Type["Null"] = 1] = "Null";
    Type[Type["Int"] = 2] = "Int";
    Type[Type["Float"] = 3] = "Float";
    Type[Type["Binary"] = 4] = "Binary";
    Type[Type["Utf8"] = 5] = "Utf8";
    Type[Type["Bool"] = 6] = "Bool";
    Type[Type["Decimal"] = 7] = "Decimal";
    Type[Type["Date"] = 8] = "Date";
    Type[Type["Time"] = 9] = "Time";
    Type[Type["Timestamp"] = 10] = "Timestamp";
    Type[Type["Interval"] = 11] = "Interval";
    Type[Type["List"] = 12] = "List";
    Type[Type["Struct"] = 13] = "Struct";
    Type[Type["Union"] = 14] = "Union";
    Type[Type["FixedSizeBinary"] = 15] = "FixedSizeBinary";
    Type[Type["FixedSizeList"] = 16] = "FixedSizeList";
    Type[Type["Map"] = 17] = "Map";
    Type["Dictionary"] = "Dictionary";
    Type["DenseUnion"] = "DenseUnion";
    Type["SparseUnion"] = "SparseUnion";
})(Type || (Type = {}));
export class DataType {
    constructor(TType, children) {
        this.TType = TType;
        this.children = children;
    }
    static isNull(x) { return x.TType === Type.Null; }
    static isInt(x) { return x.TType === Type.Int; }
    static isFloat(x) { return x.TType === Type.Float; }
    static isBinary(x) { return x.TType === Type.Binary; }
    static isUtf8(x) { return x.TType === Type.Utf8; }
    static isBool(x) { return x.TType === Type.Bool; }
    static isDecimal(x) { return x.TType === Type.Decimal; }
    static isDate(x) { return x.TType === Type.Date; }
    static isTime(x) { return x.TType === Type.Time; }
    static isTimestamp(x) { return x.TType === Type.Timestamp; }
    static isInterval(x) { return x.TType === Type.Interval; }
    static isList(x) { return x.TType === Type.List; }
    static isStruct(x) { return x.TType === Type.Struct; }
    static isUnion(x) { return x.TType === Type.Union; }
    static isDenseUnion(x) { return x.TType === Type.DenseUnion; }
    static isSparseUnion(x) { return x.TType === Type.SparseUnion; }
    static isFixedSizeBinary(x) { return x.TType === Type.FixedSizeBinary; }
    static isFixedSizeList(x) { return x.TType === Type.FixedSizeList; }
    static isMap(x) { return x.TType === Type.Map; }
    static isDictionary(x) { return x.TType === Type.Dictionary; }
    acceptTypeVisitor(visitor) {
        switch (this.TType) {
            case Type.Null: return DataType.isNull(this) && visitor.visitNull(this) || null;
            case Type.Int: return DataType.isInt(this) && visitor.visitInt(this) || null;
            case Type.Float: return DataType.isFloat(this) && visitor.visitFloat(this) || null;
            case Type.Binary: return DataType.isBinary(this) && visitor.visitBinary(this) || null;
            case Type.Utf8: return DataType.isUtf8(this) && visitor.visitUtf8(this) || null;
            case Type.Bool: return DataType.isBool(this) && visitor.visitBool(this) || null;
            case Type.Decimal: return DataType.isDecimal(this) && visitor.visitDecimal(this) || null;
            case Type.Date: return DataType.isDate(this) && visitor.visitDate(this) || null;
            case Type.Time: return DataType.isTime(this) && visitor.visitTime(this) || null;
            case Type.Timestamp: return DataType.isTimestamp(this) && visitor.visitTimestamp(this) || null;
            case Type.Interval: return DataType.isInterval(this) && visitor.visitInterval(this) || null;
            case Type.List: return DataType.isList(this) && visitor.visitList(this) || null;
            case Type.Struct: return DataType.isStruct(this) && visitor.visitStruct(this) || null;
            case Type.Union: return DataType.isUnion(this) && visitor.visitUnion(this) || null;
            case Type.FixedSizeBinary: return DataType.isFixedSizeBinary(this) && visitor.visitFixedSizeBinary(this) || null;
            case Type.FixedSizeList: return DataType.isFixedSizeList(this) && visitor.visitFixedSizeList(this) || null;
            case Type.Map: return DataType.isMap(this) && visitor.visitMap(this) || null;
            case Type.Dictionary: return DataType.isDictionary(this) && visitor.visitDictionary(this) || null;
            default: return null;
        }
    }
}
DataType[Symbol.toStringTag] = ((proto) => {
    proto.ArrayType = Array;
    return proto[Symbol.toStringTag] = 'DataType';
})(DataType.prototype);
export class Null extends DataType {
    constructor() {
        super(Type.Null);
    }
    toString() { return `Null`; }
    acceptTypeVisitor(visitor) {
        return visitor.visitNull(this);
    }
}
Null[Symbol.toStringTag] = ((proto) => {
    return proto[Symbol.toStringTag] = 'Null';
})(Null.prototype);
export class Int extends DataType {
    constructor(isSigned, bitWidth) {
        super(Type.Int);
        this.isSigned = isSigned;
        this.bitWidth = bitWidth;
    }
    get ArrayType() {
        switch (this.bitWidth) {
            case 8: return (this.isSigned ? Int8Array : Uint8Array);
            case 16: return (this.isSigned ? Int16Array : Uint16Array);
            case 32: return (this.isSigned ? Int32Array : Uint32Array);
            case 64: return (this.isSigned ? Int32Array : Uint32Array);
        }
        throw new Error(`Unrecognized ${this[Symbol.toStringTag]} type`);
    }
    toString() { return `${this.isSigned ? `I` : `Ui`}nt${this.bitWidth}`; }
    acceptTypeVisitor(visitor) { return visitor.visitInt(this); }
}
Int[Symbol.toStringTag] = ((proto) => {
    return proto[Symbol.toStringTag] = 'Int';
})(Int.prototype);
export class Int8 extends Int {
    constructor() { super(true, 8); }
}
export class Int16 extends Int {
    constructor() { super(true, 16); }
}
export class Int32 extends Int {
    constructor() { super(true, 32); }
}
export class Int64 extends Int {
    constructor() { super(true, 64); }
}
export class Uint8 extends Int {
    constructor() { super(false, 8); }
}
export class Uint16 extends Int {
    constructor() { super(false, 16); }
}
export class Uint32 extends Int {
    constructor() { super(false, 32); }
}
export class Uint64 extends Int {
    constructor() { super(false, 64); }
}
export class Float extends DataType {
    constructor(precision) {
        super(Type.Float);
        this.precision = precision;
    }
    // @ts-ignore
    get ArrayType() {
        switch (this.precision) {
            case Precision.HALF: return Uint16Array;
            case Precision.SINGLE: return Float32Array;
            case Precision.DOUBLE: return Float64Array;
        }
        throw new Error(`Unrecognized ${this[Symbol.toStringTag]} type`);
    }
    toString() { return `Float${(this.precision << 5) || 16}`; }
    acceptTypeVisitor(visitor) { return visitor.visitFloat(this); }
}
Float[Symbol.toStringTag] = ((proto) => {
    return proto[Symbol.toStringTag] = 'Float';
})(Float.prototype);
export class Float16 extends Float {
    constructor() { super(Precision.HALF); }
}
export class Float32 extends Float {
    constructor() { super(Precision.SINGLE); }
}
export class Float64 extends Float {
    constructor() { super(Precision.DOUBLE); }
}
export class Binary extends DataType {
    constructor() {
        super(Type.Binary);
    }
    toString() { return `Binary`; }
    acceptTypeVisitor(visitor) {
        return visitor.visitBinary(this);
    }
}
Binary[Symbol.toStringTag] = ((proto) => {
    proto.ArrayType = Uint8Array;
    return proto[Symbol.toStringTag] = 'Binary';
})(Binary.prototype);
export class Utf8 extends DataType {
    constructor() {
        super(Type.Utf8);
    }
    toString() { return `Utf8`; }
    acceptTypeVisitor(visitor) {
        return visitor.visitUtf8(this);
    }
}
Utf8[Symbol.toStringTag] = ((proto) => {
    proto.ArrayType = Uint8Array;
    return proto[Symbol.toStringTag] = 'Utf8';
})(Utf8.prototype);
export class Bool extends DataType {
    constructor() {
        super(Type.Bool);
    }
    toString() { return `Bool`; }
    acceptTypeVisitor(visitor) {
        return visitor.visitBool(this);
    }
}
Bool[Symbol.toStringTag] = ((proto) => {
    proto.ArrayType = Uint8Array;
    return proto[Symbol.toStringTag] = 'Bool';
})(Bool.prototype);
export class Decimal extends DataType {
    constructor(scale, precision) {
        super(Type.Decimal);
        this.scale = scale;
        this.precision = precision;
    }
    toString() { return `Decimal[${this.precision}e${this.scale > 0 ? `+` : ``}${this.scale}]`; }
    acceptTypeVisitor(visitor) {
        return visitor.visitDecimal(this);
    }
}
Decimal[Symbol.toStringTag] = ((proto) => {
    proto.ArrayType = Uint32Array;
    return proto[Symbol.toStringTag] = 'Decimal';
})(Decimal.prototype);
export class Date_ extends DataType {
    constructor(unit) {
        super(Type.Date);
        this.unit = unit;
    }
    toString() { return `Date${(this.unit + 1) * 32}<${DateUnit[this.unit]}>`; }
    acceptTypeVisitor(visitor) {
        return visitor.visitDate(this);
    }
}
Date_[Symbol.toStringTag] = ((proto) => {
    proto.ArrayType = Int32Array;
    return proto[Symbol.toStringTag] = 'Date';
})(Date_.prototype);
export class Time extends DataType {
    constructor(unit, bitWidth) {
        super(Type.Time);
        this.unit = unit;
        this.bitWidth = bitWidth;
    }
    toString() { return `Time${this.bitWidth}<${TimeUnit[this.unit]}>`; }
    acceptTypeVisitor(visitor) {
        return visitor.visitTime(this);
    }
}
Time[Symbol.toStringTag] = ((proto) => {
    proto.ArrayType = Uint32Array;
    return proto[Symbol.toStringTag] = 'Time';
})(Time.prototype);
export class Timestamp extends DataType {
    constructor(unit, timezone) {
        super(Type.Timestamp);
        this.unit = unit;
        this.timezone = timezone;
    }
    toString() { return `Timestamp<${TimeUnit[this.unit]}${this.timezone ? `, ${this.timezone}` : ``}>`; }
    acceptTypeVisitor(visitor) {
        return visitor.visitTimestamp(this);
    }
}
Timestamp[Symbol.toStringTag] = ((proto) => {
    proto.ArrayType = Int32Array;
    return proto[Symbol.toStringTag] = 'Timestamp';
})(Timestamp.prototype);
export class Interval extends DataType {
    constructor(unit) {
        super(Type.Interval);
        this.unit = unit;
    }
    toString() { return `Interval<${IntervalUnit[this.unit]}>`; }
    acceptTypeVisitor(visitor) {
        return visitor.visitInterval(this);
    }
}
Interval[Symbol.toStringTag] = ((proto) => {
    proto.ArrayType = Int32Array;
    return proto[Symbol.toStringTag] = 'Interval';
})(Interval.prototype);
export class List extends DataType {
    constructor(children) {
        super(Type.List, children);
        this.children = children;
    }
    toString() { return `List<${this.valueType}>`; }
    get ArrayType() { return this.valueType.ArrayType; }
    get valueType() { return this.children[0].type; }
    get valueField() { return this.children[0]; }
    acceptTypeVisitor(visitor) {
        return visitor.visitList(this);
    }
}
List[Symbol.toStringTag] = ((proto) => {
    return proto[Symbol.toStringTag] = 'List';
})(List.prototype);
export class Struct extends DataType {
    constructor(children) {
        super(Type.Struct, children);
        this.children = children;
    }
    toString() { return `Struct<${this.children.map((f) => f.type).join(`, `)}>`; }
    acceptTypeVisitor(visitor) {
        return visitor.visitStruct(this);
    }
}
Struct[Symbol.toStringTag] = ((proto) => {
    return proto[Symbol.toStringTag] = 'Struct';
})(Struct.prototype);
export class Union extends DataType {
    constructor(mode, typeIds, children) {
        super((mode === UnionMode.Sparse ? Type.SparseUnion : Type.DenseUnion), children);
        this.mode = mode;
        this.typeIds = typeIds;
        this.children = children;
    }
    toString() { return `${this[Symbol.toStringTag]}<${this.typeIds.map((x) => Type[x]).join(` | `)}>`; }
    acceptTypeVisitor(visitor) { return visitor.visitUnion(this); }
}
Union[Symbol.toStringTag] = ((proto) => {
    proto.ArrayType = Int8Array;
    return proto[Symbol.toStringTag] = 'Union';
})(Union.prototype);
export class DenseUnion extends Union {
    constructor(typeIds, children) {
        super(UnionMode.Dense, typeIds, children);
    }
}
DenseUnion[Symbol.toStringTag] = ((proto) => {
    return proto[Symbol.toStringTag] = 'DenseUnion';
})(DenseUnion.prototype);
export class SparseUnion extends Union {
    constructor(typeIds, children) {
        super(UnionMode.Sparse, typeIds, children);
    }
}
SparseUnion[Symbol.toStringTag] = ((proto) => {
    return proto[Symbol.toStringTag] = 'SparseUnion';
})(SparseUnion.prototype);
export class FixedSizeBinary extends DataType {
    constructor(byteWidth) {
        super(Type.FixedSizeBinary);
        this.byteWidth = byteWidth;
    }
    toString() { return `FixedSizeBinary[${this.byteWidth}]`; }
    acceptTypeVisitor(visitor) { return visitor.visitFixedSizeBinary(this); }
}
FixedSizeBinary[Symbol.toStringTag] = ((proto) => {
    proto.ArrayType = Uint8Array;
    return proto[Symbol.toStringTag] = 'FixedSizeBinary';
})(FixedSizeBinary.prototype);
export class FixedSizeList extends DataType {
    constructor(listSize, children) {
        super(Type.FixedSizeList, children);
        this.listSize = listSize;
        this.children = children;
    }
    get ArrayType() { return this.valueType.ArrayType; }
    get valueType() { return this.children[0].type; }
    get valueField() { return this.children[0]; }
    toString() { return `FixedSizeList[${this.listSize}]<${this.valueType}>`; }
    acceptTypeVisitor(visitor) { return visitor.visitFixedSizeList(this); }
}
FixedSizeList[Symbol.toStringTag] = ((proto) => {
    return proto[Symbol.toStringTag] = 'FixedSizeList';
})(FixedSizeList.prototype);
export class Map_ extends DataType {
    constructor(keysSorted, children) {
        super(Type.Map, children);
        this.keysSorted = keysSorted;
        this.children = children;
    }
    toString() { return `Map<${this.children.join(`, `)}>`; }
    acceptTypeVisitor(visitor) { return visitor.visitMap(this); }
}
Map_[Symbol.toStringTag] = ((proto) => {
    return proto[Symbol.toStringTag] = 'Map_';
})(Map_.prototype);
export class Dictionary extends DataType {
    constructor(dictionary, indicies, id, isOrdered) {
        super(Type.Dictionary);
        this.indicies = indicies;
        this.dictionary = dictionary;
        this.isOrdered = isOrdered || false;
        this.id = id == null ? DictionaryBatch.getId() : typeof id === 'number' ? id : id.low;
    }
    get ArrayType() { return this.dictionary.ArrayType; }
    toString() { return `Dictionary<${this.dictionary}, ${this.indicies}>`; }
    acceptTypeVisitor(visitor) {
        return visitor.visitDictionary(this);
    }
}
Dictionary[Symbol.toStringTag] = ((proto) => {
    return proto[Symbol.toStringTag] = 'Dictionary';
})(Dictionary.prototype);

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFDLFdBQVcsQ0FBQyxHQUFHLFlBQVksQ0FBQztBQUNwRCxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMiLCJmaWxlIjoidHlwZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgKiBhcyBTY2hlbWFfIGZyb20gJy4vZmIvU2NoZW1hJztcbmltcG9ydCAqIGFzIE1lc3NhZ2VfIGZyb20gJy4vZmIvTWVzc2FnZSc7XG5pbXBvcnQgeyBWZWN0b3IsIFZpZXcgfSBmcm9tICcuL3ZlY3Rvcic7XG5pbXBvcnQgeyBmbGF0YnVmZmVycyB9IGZyb20gJ2ZsYXRidWZmZXJzJztcbmltcG9ydCB7IERpY3Rpb25hcnlCYXRjaCB9IGZyb20gJy4vaXBjL21ldGFkYXRhJztcbmltcG9ydCB7IFR5cGVWaXNpdG9yLCBWaXNpdG9yTm9kZSB9IGZyb20gJy4vdmlzaXRvcic7XG5cbmV4cG9ydCBpbXBvcnQgTG9uZyA9IGZsYXRidWZmZXJzLkxvbmc7XG5leHBvcnQgaW1wb3J0IEFycm93VHlwZSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlR5cGU7XG5leHBvcnQgaW1wb3J0IERhdGVVbml0ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGF0ZVVuaXQ7XG5leHBvcnQgaW1wb3J0IFRpbWVVbml0ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVGltZVVuaXQ7XG5leHBvcnQgaW1wb3J0IFByZWNpc2lvbiA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlByZWNpc2lvbjtcbmV4cG9ydCBpbXBvcnQgVW5pb25Nb2RlID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVW5pb25Nb2RlO1xuZXhwb3J0IGltcG9ydCBWZWN0b3JUeXBlID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVmVjdG9yVHlwZTtcbmV4cG9ydCBpbXBvcnQgSW50ZXJ2YWxVbml0ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuSW50ZXJ2YWxVbml0O1xuZXhwb3J0IGltcG9ydCBNZXNzYWdlSGVhZGVyID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk1lc3NhZ2VIZWFkZXI7XG5leHBvcnQgaW1wb3J0IE1ldGFkYXRhVmVyc2lvbiA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk1ldGFkYXRhVmVyc2lvbjtcblxuZXhwb3J0IGNsYXNzIFNjaGVtYSB7XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKHZlY3RvcnM6IFZlY3RvcltdKSB7XG4gICAgICAgIHJldHVybiBuZXcgU2NoZW1hKHZlY3RvcnMubWFwKCh2LCBpKSA9PiBuZXcgRmllbGQoJycgKyBpLCB2LnR5cGUpKSk7XG4gICAgfVxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwcm90ZWN0ZWQgX2JvZHlMZW5ndGg6IG51bWJlcjtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHJvdGVjdGVkIF9oZWFkZXJUeXBlOiBNZXNzYWdlSGVhZGVyO1xuICAgIHB1YmxpYyByZWFkb25seSBmaWVsZHM6IEZpZWxkW107XG4gICAgcHVibGljIHJlYWRvbmx5IHZlcnNpb246IE1ldGFkYXRhVmVyc2lvbjtcbiAgICBwdWJsaWMgcmVhZG9ubHkgbWV0YWRhdGE/OiBNYXA8c3RyaW5nLCBzdHJpbmc+O1xuICAgIHB1YmxpYyByZWFkb25seSBkaWN0aW9uYXJpZXM6IE1hcDxudW1iZXIsIEZpZWxkPERpY3Rpb25hcnk+PjtcbiAgICBjb25zdHJ1Y3RvcihmaWVsZHM6IEZpZWxkW10sXG4gICAgICAgICAgICAgICAgbWV0YWRhdGE/OiBNYXA8c3RyaW5nLCBzdHJpbmc+LFxuICAgICAgICAgICAgICAgIHZlcnNpb246IE1ldGFkYXRhVmVyc2lvbiA9IE1ldGFkYXRhVmVyc2lvbi5WNCxcbiAgICAgICAgICAgICAgICBkaWN0aW9uYXJpZXM6IE1hcDxudW1iZXIsIEZpZWxkPERpY3Rpb25hcnk+PiA9IG5ldyBNYXAoKSkge1xuICAgICAgICB0aGlzLmZpZWxkcyA9IGZpZWxkcztcbiAgICAgICAgdGhpcy52ZXJzaW9uID0gdmVyc2lvbjtcbiAgICAgICAgdGhpcy5tZXRhZGF0YSA9IG1ldGFkYXRhO1xuICAgICAgICB0aGlzLmRpY3Rpb25hcmllcyA9IGRpY3Rpb25hcmllcztcbiAgICB9XG4gICAgcHVibGljIGdldCBib2R5TGVuZ3RoKCkgeyByZXR1cm4gdGhpcy5fYm9keUxlbmd0aDsgfVxuICAgIHB1YmxpYyBnZXQgaGVhZGVyVHlwZSgpIHsgcmV0dXJuIHRoaXMuX2hlYWRlclR5cGU7IH1cbiAgICBwdWJsaWMgc2VsZWN0KC4uLmZpZWxkTmFtZXM6IHN0cmluZ1tdKTogU2NoZW1hIHtcbiAgICAgICAgY29uc3QgbmFtZXNUb0tlZXAgPSBmaWVsZE5hbWVzLnJlZHVjZSgoeHMsIHgpID0+ICh4c1t4XSA9IHRydWUpICYmIHhzLCBPYmplY3QuY3JlYXRlKG51bGwpKTtcbiAgICAgICAgY29uc3QgbmV3RGljdEZpZWxkcyA9IG5ldyBNYXAoKSwgbmV3RmllbGRzID0gdGhpcy5maWVsZHMuZmlsdGVyKChmKSA9PiBuYW1lc1RvS2VlcFtmLm5hbWVdKTtcbiAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMuZm9yRWFjaCgoZiwgZGljdElkKSA9PiAobmFtZXNUb0tlZXBbZi5uYW1lXSkgJiYgbmV3RGljdEZpZWxkcy5zZXQoZGljdElkLCBmKSk7XG4gICAgICAgIHJldHVybiBuZXcgU2NoZW1hKG5ld0ZpZWxkcywgdGhpcy5tZXRhZGF0YSwgdGhpcy52ZXJzaW9uLCBuZXdEaWN0RmllbGRzKTtcbiAgICB9XG4gICAgcHVibGljIHN0YXRpYyBbU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICgocHJvdG90eXBlOiBTY2hlbWEpID0+IHtcbiAgICAgICAgcHJvdG90eXBlLl9ib2R5TGVuZ3RoID0gMDtcbiAgICAgICAgcHJvdG90eXBlLl9oZWFkZXJUeXBlID0gTWVzc2FnZUhlYWRlci5TY2hlbWE7XG4gICAgICAgIHJldHVybiAnU2NoZW1hJztcbiAgICB9KShTY2hlbWEucHJvdG90eXBlKTtcbn1cblxuZXhwb3J0IGNsYXNzIEZpZWxkPFQgZXh0ZW5kcyBEYXRhVHlwZSA9IERhdGFUeXBlPiB7XG4gICAgcHVibGljIHJlYWRvbmx5IHR5cGU6IFQ7XG4gICAgcHVibGljIHJlYWRvbmx5IG5hbWU6IHN0cmluZztcbiAgICBwdWJsaWMgcmVhZG9ubHkgbnVsbGFibGU6IGJvb2xlYW47XG4gICAgcHVibGljIHJlYWRvbmx5IG1ldGFkYXRhPzogTWFwPHN0cmluZywgc3RyaW5nPiB8IG51bGw7XG4gICAgY29uc3RydWN0b3IobmFtZTogc3RyaW5nLCB0eXBlOiBULCBudWxsYWJsZSA9IGZhbHNlLCBtZXRhZGF0YT86IE1hcDxzdHJpbmcsIHN0cmluZz4gfCBudWxsKSB7XG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgICAgIHRoaXMubnVsbGFibGUgPSBudWxsYWJsZTtcbiAgICAgICAgdGhpcy5tZXRhZGF0YSA9IG1ldGFkYXRhO1xuICAgIH1cbiAgICBwdWJsaWMgdG9TdHJpbmcoKSB7IHJldHVybiBgJHt0aGlzLm5hbWV9OiAke3RoaXMudHlwZX1gOyB9XG4gICAgcHVibGljIGdldCB0eXBlSWQoKTogVFsnVFR5cGUnXSB7IHJldHVybiB0aGlzLnR5cGUuVFR5cGU7IH1cbiAgICBwdWJsaWMgZ2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCk6IHN0cmluZyB7IHJldHVybiAnRmllbGQnOyB9XG4gICAgcHVibGljIGdldCBpbmRpY2llcygpOiBUIHwgSW50PGFueT4ge1xuICAgICAgICByZXR1cm4gRGF0YVR5cGUuaXNEaWN0aW9uYXJ5KHRoaXMudHlwZSkgPyB0aGlzLnR5cGUuaW5kaWNpZXMgOiB0aGlzLnR5cGU7XG4gICAgfVxufVxuXG5leHBvcnQgdHlwZSBUaW1lQml0V2lkdGggPSAzMiB8IDY0O1xuZXhwb3J0IHR5cGUgSW50Qml0V2lkdGggPSA4IHwgMTYgfCAzMiB8IDY0O1xuXG5leHBvcnQgdHlwZSBOdW1lcmljVHlwZSA9IEludCB8IEZsb2F0IHwgRGF0ZV8gfCBUaW1lIHwgSW50ZXJ2YWwgfCBUaW1lc3RhbXA7XG5leHBvcnQgdHlwZSBGaXhlZFNpemVUeXBlID0gSW50NjQgfCAgVWludDY0IHwgRGVjaW1hbCB8IEZpeGVkU2l6ZUJpbmFyeTtcbmV4cG9ydCB0eXBlIFByaW1pdGl2ZVR5cGUgPSBOdW1lcmljVHlwZSB8IEZpeGVkU2l6ZVR5cGU7XG5cbmV4cG9ydCB0eXBlIEZsYXRMaXN0VHlwZSA9IFV0ZjggfCBCaW5hcnk7IC8vIDwtLSB0aGVzZSB0eXBlcyBoYXZlIGBvZmZzZXRgLCBgZGF0YWAsIGFuZCBgdmFsaWRpdHlgIGJ1ZmZlcnNcbmV4cG9ydCB0eXBlIEZsYXRUeXBlID0gQm9vbCB8IFByaW1pdGl2ZVR5cGUgfCBGbGF0TGlzdFR5cGU7IC8vIDwtLSB0aGVzZSB0eXBlcyBoYXZlIGBkYXRhYCBhbmQgYHZhbGlkaXR5YCBidWZmZXJzXG5leHBvcnQgdHlwZSBMaXN0VHlwZSA9IExpc3Q8YW55PjsgLy8gPC0tIHRoZXNlIHR5cGVzIGhhdmUgYG9mZnNldGAgYW5kIGB2YWxpZGl0eWAgYnVmZmVyc1xuZXhwb3J0IHR5cGUgTmVzdGVkVHlwZSA9IE1hcF8gfCBTdHJ1Y3QgfCBMaXN0PGFueT4gfCBGaXhlZFNpemVMaXN0PGFueT4gfCBVbmlvbjxhbnk+OyAvLyA8LS0gdGhlc2UgdHlwZXMgaGF2ZSBgdmFsaWRpdHlgIGJ1ZmZlciBhbmQgbmVzdGVkIGNoaWxkRGF0YVxuZXhwb3J0IHR5cGUgU2luZ2xlTmVzdGVkVHlwZSA9IExpc3Q8YW55PiB8IEZpeGVkU2l6ZUxpc3Q8YW55PjsgLy8gPC0tIHRoZXNlIGFyZSBuZXN0ZWQgdHlwZXMgdGhhdCBjYW4gb25seSBoYXZlIGEgc2luZ2xlIGNoaWxkXG5cbi8qKlxuICogKlxuICogTWFpbiBkYXRhIHR5cGUgZW51bWVyYXRpb246XG4gKiAqXG4gKiBEYXRhIHR5cGVzIGluIHRoaXMgbGlicmFyeSBhcmUgYWxsICpsb2dpY2FsKi4gVGhleSBjYW4gYmUgZXhwcmVzc2VkIGFzXG4gKiBlaXRoZXIgYSBwcmltaXRpdmUgcGh5c2ljYWwgdHlwZSAoYnl0ZXMgb3IgYml0cyBvZiBzb21lIGZpeGVkIHNpemUpLCBhXG4gKiBuZXN0ZWQgdHlwZSBjb25zaXN0aW5nIG9mIG90aGVyIGRhdGEgdHlwZXMsIG9yIGFub3RoZXIgZGF0YSB0eXBlIChlLmcuIGFcbiAqIHRpbWVzdGFtcCBlbmNvZGVkIGFzIGFuIGludDY0KVxuICovXG4gZXhwb3J0IGVudW0gVHlwZSB7XG4gICAgTk9ORSAgICAgICAgICAgID0gIDAsICAvLyBUaGUgZGVmYXVsdCBwbGFjZWhvbGRlciB0eXBlXG4gICAgTnVsbCAgICAgICAgICAgID0gIDEsICAvLyBBIE5VTEwgdHlwZSBoYXZpbmcgbm8gcGh5c2ljYWwgc3RvcmFnZVxuICAgIEludCAgICAgICAgICAgICA9ICAyLCAgLy8gU2lnbmVkIG9yIHVuc2lnbmVkIDgsIDE2LCAzMiwgb3IgNjQtYml0IGxpdHRsZS1lbmRpYW4gaW50ZWdlclxuICAgIEZsb2F0ICAgICAgICAgICA9ICAzLCAgLy8gMiwgNCwgb3IgOC1ieXRlIGZsb2F0aW5nIHBvaW50IHZhbHVlXG4gICAgQmluYXJ5ICAgICAgICAgID0gIDQsICAvLyBWYXJpYWJsZS1sZW5ndGggYnl0ZXMgKG5vIGd1YXJhbnRlZSBvZiBVVEY4LW5lc3MpXG4gICAgVXRmOCAgICAgICAgICAgID0gIDUsICAvLyBVVEY4IHZhcmlhYmxlLWxlbmd0aCBzdHJpbmcgYXMgTGlzdDxDaGFyPlxuICAgIEJvb2wgICAgICAgICAgICA9ICA2LCAgLy8gQm9vbGVhbiBhcyAxIGJpdCwgTFNCIGJpdC1wYWNrZWQgb3JkZXJpbmdcbiAgICBEZWNpbWFsICAgICAgICAgPSAgNywgIC8vIFByZWNpc2lvbi1hbmQtc2NhbGUtYmFzZWQgZGVjaW1hbCB0eXBlLiBTdG9yYWdlIHR5cGUgZGVwZW5kcyBvbiB0aGUgcGFyYW1ldGVycy5cbiAgICBEYXRlICAgICAgICAgICAgPSAgOCwgIC8vIGludDMyX3QgZGF5cyBvciBpbnQ2NF90IG1pbGxpc2Vjb25kcyBzaW5jZSB0aGUgVU5JWCBlcG9jaFxuICAgIFRpbWUgICAgICAgICAgICA9ICA5LCAgLy8gVGltZSBhcyBzaWduZWQgMzIgb3IgNjQtYml0IGludGVnZXIsIHJlcHJlc2VudGluZyBlaXRoZXIgc2Vjb25kcywgbWlsbGlzZWNvbmRzLCBtaWNyb3NlY29uZHMsIG9yIG5hbm9zZWNvbmRzIHNpbmNlIG1pZG5pZ2h0IHNpbmNlIG1pZG5pZ2h0XG4gICAgVGltZXN0YW1wICAgICAgID0gMTAsICAvLyBFeGFjdCB0aW1lc3RhbXAgZW5jb2RlZCB3aXRoIGludDY0IHNpbmNlIFVOSVggZXBvY2ggKERlZmF1bHQgdW5pdCBtaWxsaXNlY29uZClcbiAgICBJbnRlcnZhbCAgICAgICAgPSAxMSwgIC8vIFlFQVJfTU9OVEggb3IgREFZX1RJTUUgaW50ZXJ2YWwgaW4gU1FMIHN0eWxlXG4gICAgTGlzdCAgICAgICAgICAgID0gMTIsICAvLyBBIGxpc3Qgb2Ygc29tZSBsb2dpY2FsIGRhdGEgdHlwZVxuICAgIFN0cnVjdCAgICAgICAgICA9IDEzLCAgLy8gU3RydWN0IG9mIGxvZ2ljYWwgdHlwZXNcbiAgICBVbmlvbiAgICAgICAgICAgPSAxNCwgIC8vIFVuaW9uIG9mIGxvZ2ljYWwgdHlwZXNcbiAgICBGaXhlZFNpemVCaW5hcnkgPSAxNSwgIC8vIEZpeGVkLXNpemUgYmluYXJ5LiBFYWNoIHZhbHVlIG9jY3VwaWVzIHRoZSBzYW1lIG51bWJlciBvZiBieXRlc1xuICAgIEZpeGVkU2l6ZUxpc3QgICA9IDE2LCAgLy8gRml4ZWQtc2l6ZSBsaXN0LiBFYWNoIHZhbHVlIG9jY3VwaWVzIHRoZSBzYW1lIG51bWJlciBvZiBieXRlc1xuICAgIE1hcCAgICAgICAgICAgICA9IDE3LCAgLy8gTWFwIG9mIG5hbWVkIGxvZ2ljYWwgdHlwZXNcbiAgICBEaWN0aW9uYXJ5ICAgICAgPSAnRGljdGlvbmFyeScsICAvLyBEaWN0aW9uYXJ5IGFrYSBDYXRlZ29yeSB0eXBlXG4gICAgRGVuc2VVbmlvbiAgICAgID0gJ0RlbnNlVW5pb24nLCAgLy8gRGVuc2UgVW5pb24gb2YgbG9naWNhbCB0eXBlc1xuICAgIFNwYXJzZVVuaW9uICAgICA9ICdTcGFyc2VVbmlvbicsICAvLyBTcGFyc2UgVW5pb24gb2YgbG9naWNhbCB0eXBlc1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERhdGFUeXBlPFRUeXBlIGV4dGVuZHMgVHlwZSA9IGFueT4ge1xuICAgIHJlYWRvbmx5IFRUeXBlOiBUVHlwZTtcbiAgICByZWFkb25seSBUQXJyYXk6IGFueTtcbiAgICByZWFkb25seSBUVmFsdWU6IGFueTtcbiAgICByZWFkb25seSBBcnJheVR5cGU6IGFueTtcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIERhdGFUeXBlPFRUeXBlIGV4dGVuZHMgVHlwZSA9IGFueT4gaW1wbGVtZW50cyBQYXJ0aWFsPFZpc2l0b3JOb2RlPiB7XG5cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIFtTeW1ib2wudG9TdHJpbmdUYWddOiBzdHJpbmc7XG5cbiAgICBzdGF0aWMgICAgICAgICAgICBpc051bGwgKHg6IERhdGFUeXBlKTogeCBpcyBOdWxsICAgICAgICAgICAgeyByZXR1cm4geC5UVHlwZSA9PT0gVHlwZS5OdWxsOyAgICAgICAgICAgIH1cbiAgICBzdGF0aWMgICAgICAgICAgICAgaXNJbnQgKHg6IERhdGFUeXBlKTogeCBpcyBJbnQgICAgICAgICAgICAgeyByZXR1cm4geC5UVHlwZSA9PT0gVHlwZS5JbnQ7ICAgICAgICAgICAgIH1cbiAgICBzdGF0aWMgICAgICAgICAgIGlzRmxvYXQgKHg6IERhdGFUeXBlKTogeCBpcyBGbG9hdCAgICAgICAgICAgeyByZXR1cm4geC5UVHlwZSA9PT0gVHlwZS5GbG9hdDsgICAgICAgICAgIH1cbiAgICBzdGF0aWMgICAgICAgICAgaXNCaW5hcnkgKHg6IERhdGFUeXBlKTogeCBpcyBCaW5hcnkgICAgICAgICAgeyByZXR1cm4geC5UVHlwZSA9PT0gVHlwZS5CaW5hcnk7ICAgICAgICAgIH1cbiAgICBzdGF0aWMgICAgICAgICAgICBpc1V0ZjggKHg6IERhdGFUeXBlKTogeCBpcyBVdGY4ICAgICAgICAgICAgeyByZXR1cm4geC5UVHlwZSA9PT0gVHlwZS5VdGY4OyAgICAgICAgICAgIH1cbiAgICBzdGF0aWMgICAgICAgICAgICBpc0Jvb2wgKHg6IERhdGFUeXBlKTogeCBpcyBCb29sICAgICAgICAgICAgeyByZXR1cm4geC5UVHlwZSA9PT0gVHlwZS5Cb29sOyAgICAgICAgICAgIH1cbiAgICBzdGF0aWMgICAgICAgICBpc0RlY2ltYWwgKHg6IERhdGFUeXBlKTogeCBpcyBEZWNpbWFsICAgICAgICAgeyByZXR1cm4geC5UVHlwZSA9PT0gVHlwZS5EZWNpbWFsOyAgICAgICAgIH1cbiAgICBzdGF0aWMgICAgICAgICAgICBpc0RhdGUgKHg6IERhdGFUeXBlKTogeCBpcyBEYXRlXyAgICAgICAgICAgeyByZXR1cm4geC5UVHlwZSA9PT0gVHlwZS5EYXRlOyAgICAgICAgICAgIH1cbiAgICBzdGF0aWMgICAgICAgICAgICBpc1RpbWUgKHg6IERhdGFUeXBlKTogeCBpcyBUaW1lICAgICAgICAgICAgeyByZXR1cm4geC5UVHlwZSA9PT0gVHlwZS5UaW1lOyAgICAgICAgICAgIH1cbiAgICBzdGF0aWMgICAgICAgaXNUaW1lc3RhbXAgKHg6IERhdGFUeXBlKTogeCBpcyBUaW1lc3RhbXAgICAgICAgeyByZXR1cm4geC5UVHlwZSA9PT0gVHlwZS5UaW1lc3RhbXA7ICAgICAgIH1cbiAgICBzdGF0aWMgICAgICAgIGlzSW50ZXJ2YWwgKHg6IERhdGFUeXBlKTogeCBpcyBJbnRlcnZhbCAgICAgICAgeyByZXR1cm4geC5UVHlwZSA9PT0gVHlwZS5JbnRlcnZhbDsgICAgICAgIH1cbiAgICBzdGF0aWMgICAgICAgICAgICBpc0xpc3QgKHg6IERhdGFUeXBlKTogeCBpcyBMaXN0ICAgICAgICAgICAgeyByZXR1cm4geC5UVHlwZSA9PT0gVHlwZS5MaXN0OyAgICAgICAgICAgIH1cbiAgICBzdGF0aWMgICAgICAgICAgaXNTdHJ1Y3QgKHg6IERhdGFUeXBlKTogeCBpcyBTdHJ1Y3QgICAgICAgICAgeyByZXR1cm4geC5UVHlwZSA9PT0gVHlwZS5TdHJ1Y3Q7ICAgICAgICAgIH1cbiAgICBzdGF0aWMgICAgICAgICAgIGlzVW5pb24gKHg6IERhdGFUeXBlKTogeCBpcyBVbmlvbiAgICAgICAgICAgeyByZXR1cm4geC5UVHlwZSA9PT0gVHlwZS5VbmlvbjsgICAgICAgICAgIH1cbiAgICBzdGF0aWMgICAgICBpc0RlbnNlVW5pb24gKHg6IERhdGFUeXBlKTogeCBpcyBEZW5zZVVuaW9uICAgICAgeyByZXR1cm4geC5UVHlwZSA9PT0gVHlwZS5EZW5zZVVuaW9uOyAgICAgIH1cbiAgICBzdGF0aWMgICAgIGlzU3BhcnNlVW5pb24gKHg6IERhdGFUeXBlKTogeCBpcyBTcGFyc2VVbmlvbiAgICAgeyByZXR1cm4geC5UVHlwZSA9PT0gVHlwZS5TcGFyc2VVbmlvbjsgICAgIH1cbiAgICBzdGF0aWMgaXNGaXhlZFNpemVCaW5hcnkgKHg6IERhdGFUeXBlKTogeCBpcyBGaXhlZFNpemVCaW5hcnkgeyByZXR1cm4geC5UVHlwZSA9PT0gVHlwZS5GaXhlZFNpemVCaW5hcnk7IH1cbiAgICBzdGF0aWMgICBpc0ZpeGVkU2l6ZUxpc3QgKHg6IERhdGFUeXBlKTogeCBpcyBGaXhlZFNpemVMaXN0ICAgeyByZXR1cm4geC5UVHlwZSA9PT0gVHlwZS5GaXhlZFNpemVMaXN0OyAgIH1cbiAgICBzdGF0aWMgICAgICAgICAgICAgaXNNYXAgKHg6IERhdGFUeXBlKTogeCBpcyBNYXBfICAgICAgICAgICAgeyByZXR1cm4geC5UVHlwZSA9PT0gVHlwZS5NYXA7ICAgICAgICAgICAgIH1cbiAgICBzdGF0aWMgICAgICBpc0RpY3Rpb25hcnkgKHg6IERhdGFUeXBlKTogeCBpcyBEaWN0aW9uYXJ5ICAgICAgeyByZXR1cm4geC5UVHlwZSA9PT0gVHlwZS5EaWN0aW9uYXJ5OyAgICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyByZWFkb25seSBUVHlwZTogVFR5cGUsXG4gICAgICAgICAgICAgICAgcHVibGljIHJlYWRvbmx5IGNoaWxkcmVuPzogRmllbGRbXSkge31cblxuICAgIGFjY2VwdFR5cGVWaXNpdG9yKHZpc2l0b3I6IFR5cGVWaXNpdG9yKTogYW55IHtcbiAgICAgICAgc3dpdGNoICh0aGlzLlRUeXBlKSB7XG4gICAgICAgICAgICBjYXNlIFR5cGUuTnVsbDogICAgICAgICAgICByZXR1cm4gRGF0YVR5cGUuaXNOdWxsKHRoaXMpICAgICAgICAgICAgJiYgdmlzaXRvci52aXNpdE51bGwodGhpcykgICAgICAgICAgICB8fCBudWxsO1xuICAgICAgICAgICAgY2FzZSBUeXBlLkludDogICAgICAgICAgICAgcmV0dXJuIERhdGFUeXBlLmlzSW50KHRoaXMpICAgICAgICAgICAgICYmIHZpc2l0b3IudmlzaXRJbnQodGhpcykgICAgICAgICAgICAgfHwgbnVsbDtcbiAgICAgICAgICAgIGNhc2UgVHlwZS5GbG9hdDogICAgICAgICAgIHJldHVybiBEYXRhVHlwZS5pc0Zsb2F0KHRoaXMpICAgICAgICAgICAmJiB2aXNpdG9yLnZpc2l0RmxvYXQodGhpcykgICAgICAgICAgIHx8IG51bGw7XG4gICAgICAgICAgICBjYXNlIFR5cGUuQmluYXJ5OiAgICAgICAgICByZXR1cm4gRGF0YVR5cGUuaXNCaW5hcnkodGhpcykgICAgICAgICAgJiYgdmlzaXRvci52aXNpdEJpbmFyeSh0aGlzKSAgICAgICAgICB8fCBudWxsO1xuICAgICAgICAgICAgY2FzZSBUeXBlLlV0Zjg6ICAgICAgICAgICAgcmV0dXJuIERhdGFUeXBlLmlzVXRmOCh0aGlzKSAgICAgICAgICAgICYmIHZpc2l0b3IudmlzaXRVdGY4KHRoaXMpICAgICAgICAgICAgfHwgbnVsbDtcbiAgICAgICAgICAgIGNhc2UgVHlwZS5Cb29sOiAgICAgICAgICAgIHJldHVybiBEYXRhVHlwZS5pc0Jvb2wodGhpcykgICAgICAgICAgICAmJiB2aXNpdG9yLnZpc2l0Qm9vbCh0aGlzKSAgICAgICAgICAgIHx8IG51bGw7XG4gICAgICAgICAgICBjYXNlIFR5cGUuRGVjaW1hbDogICAgICAgICByZXR1cm4gRGF0YVR5cGUuaXNEZWNpbWFsKHRoaXMpICAgICAgICAgJiYgdmlzaXRvci52aXNpdERlY2ltYWwodGhpcykgICAgICAgICB8fCBudWxsO1xuICAgICAgICAgICAgY2FzZSBUeXBlLkRhdGU6ICAgICAgICAgICAgcmV0dXJuIERhdGFUeXBlLmlzRGF0ZSh0aGlzKSAgICAgICAgICAgICYmIHZpc2l0b3IudmlzaXREYXRlKHRoaXMpICAgICAgICAgICAgfHwgbnVsbDtcbiAgICAgICAgICAgIGNhc2UgVHlwZS5UaW1lOiAgICAgICAgICAgIHJldHVybiBEYXRhVHlwZS5pc1RpbWUodGhpcykgICAgICAgICAgICAmJiB2aXNpdG9yLnZpc2l0VGltZSh0aGlzKSAgICAgICAgICAgIHx8IG51bGw7XG4gICAgICAgICAgICBjYXNlIFR5cGUuVGltZXN0YW1wOiAgICAgICByZXR1cm4gRGF0YVR5cGUuaXNUaW1lc3RhbXAodGhpcykgICAgICAgJiYgdmlzaXRvci52aXNpdFRpbWVzdGFtcCh0aGlzKSAgICAgICB8fCBudWxsO1xuICAgICAgICAgICAgY2FzZSBUeXBlLkludGVydmFsOiAgICAgICAgcmV0dXJuIERhdGFUeXBlLmlzSW50ZXJ2YWwodGhpcykgICAgICAgICYmIHZpc2l0b3IudmlzaXRJbnRlcnZhbCh0aGlzKSAgICAgICAgfHwgbnVsbDtcbiAgICAgICAgICAgIGNhc2UgVHlwZS5MaXN0OiAgICAgICAgICAgIHJldHVybiBEYXRhVHlwZS5pc0xpc3QodGhpcykgICAgICAgICAgICAmJiB2aXNpdG9yLnZpc2l0TGlzdCh0aGlzKSAgICAgICAgICAgIHx8IG51bGw7XG4gICAgICAgICAgICBjYXNlIFR5cGUuU3RydWN0OiAgICAgICAgICByZXR1cm4gRGF0YVR5cGUuaXNTdHJ1Y3QodGhpcykgICAgICAgICAgJiYgdmlzaXRvci52aXNpdFN0cnVjdCh0aGlzKSAgICAgICAgICB8fCBudWxsO1xuICAgICAgICAgICAgY2FzZSBUeXBlLlVuaW9uOiAgICAgICAgICAgcmV0dXJuIERhdGFUeXBlLmlzVW5pb24odGhpcykgICAgICAgICAgICYmIHZpc2l0b3IudmlzaXRVbmlvbih0aGlzKSAgICAgICAgICAgfHwgbnVsbDtcbiAgICAgICAgICAgIGNhc2UgVHlwZS5GaXhlZFNpemVCaW5hcnk6IHJldHVybiBEYXRhVHlwZS5pc0ZpeGVkU2l6ZUJpbmFyeSh0aGlzKSAmJiB2aXNpdG9yLnZpc2l0Rml4ZWRTaXplQmluYXJ5KHRoaXMpIHx8IG51bGw7XG4gICAgICAgICAgICBjYXNlIFR5cGUuRml4ZWRTaXplTGlzdDogICByZXR1cm4gRGF0YVR5cGUuaXNGaXhlZFNpemVMaXN0KHRoaXMpICAgJiYgdmlzaXRvci52aXNpdEZpeGVkU2l6ZUxpc3QodGhpcykgICB8fCBudWxsO1xuICAgICAgICAgICAgY2FzZSBUeXBlLk1hcDogICAgICAgICAgICAgcmV0dXJuIERhdGFUeXBlLmlzTWFwKHRoaXMpICAgICAgICAgICAgICYmIHZpc2l0b3IudmlzaXRNYXAodGhpcykgICAgICAgICAgICAgfHwgbnVsbDtcbiAgICAgICAgICAgIGNhc2UgVHlwZS5EaWN0aW9uYXJ5OiAgICAgIHJldHVybiBEYXRhVHlwZS5pc0RpY3Rpb25hcnkodGhpcykgICAgICAmJiB2aXNpdG9yLnZpc2l0RGljdGlvbmFyeSh0aGlzKSAgICAgIHx8IG51bGw7XG4gICAgICAgICAgICBkZWZhdWx0OiByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBwcm90ZWN0ZWQgc3RhdGljIFtTeW1ib2wudG9TdHJpbmdUYWddID0gKChwcm90bzogRGF0YVR5cGUpID0+IHtcbiAgICAgICAgKDxhbnk+IHByb3RvKS5BcnJheVR5cGUgPSBBcnJheTtcbiAgICAgICAgcmV0dXJuIHByb3RvW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAnRGF0YVR5cGUnO1xuICAgIH0pKERhdGFUeXBlLnByb3RvdHlwZSk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTnVsbCBleHRlbmRzIERhdGFUeXBlPFR5cGUuTnVsbD4geyBUQXJyYXk6IHZvaWQ7IFRWYWx1ZTogbnVsbDsgfVxuZXhwb3J0IGNsYXNzIE51bGwgZXh0ZW5kcyBEYXRhVHlwZTxUeXBlLk51bGw+IHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoVHlwZS5OdWxsKTtcbiAgICB9XG4gICAgcHVibGljIHRvU3RyaW5nKCkgeyByZXR1cm4gYE51bGxgOyB9XG4gICAgcHVibGljIGFjY2VwdFR5cGVWaXNpdG9yKHZpc2l0b3I6IFR5cGVWaXNpdG9yKTogYW55IHtcbiAgICAgICAgcmV0dXJuIHZpc2l0b3IudmlzaXROdWxsKHRoaXMpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgc3RhdGljIFtTeW1ib2wudG9TdHJpbmdUYWddID0gKChwcm90bzogTnVsbCkgPT4ge1xuICAgICAgICByZXR1cm4gcHJvdG9bU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICdOdWxsJztcbiAgICB9KShOdWxsLnByb3RvdHlwZSk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW50PFRWYWx1ZVR5cGUgPSBhbnksIFRBcnJheVR5cGUgZXh0ZW5kcyBJbnRBcnJheSA9IEludEFycmF5PiBleHRlbmRzIERhdGFUeXBlPFR5cGUuSW50PiB7IFRBcnJheTogVEFycmF5VHlwZTsgVFZhbHVlOiBUVmFsdWVUeXBlOyB9XG5leHBvcnQgY2xhc3MgSW50PFRWYWx1ZVR5cGUgPSBhbnksIFRBcnJheVR5cGUgZXh0ZW5kcyBJbnRBcnJheSA9IEludEFycmF5PiBleHRlbmRzIERhdGFUeXBlPFR5cGUuSW50PiB7XG4gICAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IGlzU2lnbmVkOiBib29sZWFuLFxuICAgICAgICAgICAgICAgIHB1YmxpYyByZWFkb25seSBiaXRXaWR0aDogSW50Qml0V2lkdGgpIHtcbiAgICAgICAgc3VwZXIoVHlwZS5JbnQpO1xuICAgIH1cbiAgICBwdWJsaWMgZ2V0IEFycmF5VHlwZSgpOiBUeXBlZEFycmF5Q29uc3RydWN0b3I8VEFycmF5VHlwZT4ge1xuICAgICAgICBzd2l0Y2ggKHRoaXMuYml0V2lkdGgpIHtcbiAgICAgICAgICAgIGNhc2UgIDg6IHJldHVybiAodGhpcy5pc1NpZ25lZCA/IEludDhBcnJheSA6IFVpbnQ4QXJyYXkpIGFzIGFueTtcbiAgICAgICAgICAgIGNhc2UgMTY6IHJldHVybiAodGhpcy5pc1NpZ25lZCA/IEludDE2QXJyYXkgOiBVaW50MTZBcnJheSkgYXMgYW55O1xuICAgICAgICAgICAgY2FzZSAzMjogcmV0dXJuICh0aGlzLmlzU2lnbmVkID8gSW50MzJBcnJheSA6IFVpbnQzMkFycmF5KSBhcyBhbnk7XG4gICAgICAgICAgICBjYXNlIDY0OiByZXR1cm4gKHRoaXMuaXNTaWduZWQgPyBJbnQzMkFycmF5IDogVWludDMyQXJyYXkpIGFzIGFueTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVucmVjb2duaXplZCAke3RoaXNbU3ltYm9sLnRvU3RyaW5nVGFnXX0gdHlwZWApO1xuICAgIH1cbiAgICBwdWJsaWMgdG9TdHJpbmcoKSB7IHJldHVybiBgJHt0aGlzLmlzU2lnbmVkID8gYElgIDogYFVpYH1udCR7dGhpcy5iaXRXaWR0aH1gOyB9XG4gICAgcHVibGljIGFjY2VwdFR5cGVWaXNpdG9yKHZpc2l0b3I6IFR5cGVWaXNpdG9yKTogYW55IHsgcmV0dXJuIHZpc2l0b3IudmlzaXRJbnQodGhpcyk7IH1cbiAgICBwcm90ZWN0ZWQgc3RhdGljIFtTeW1ib2wudG9TdHJpbmdUYWddID0gKChwcm90bzogSW50KSA9PiB7XG4gICAgICAgIHJldHVybiBwcm90b1tTeW1ib2wudG9TdHJpbmdUYWddID0gJ0ludCc7XG4gICAgfSkoSW50LnByb3RvdHlwZSk7XG59XG5cbmV4cG9ydCBjbGFzcyBJbnQ4IGV4dGVuZHMgSW50PG51bWJlciwgSW50OEFycmF5PiB7IGNvbnN0cnVjdG9yKCkgeyBzdXBlcih0cnVlLCA4KTsgfSB9XG5leHBvcnQgY2xhc3MgSW50MTYgZXh0ZW5kcyBJbnQ8bnVtYmVyLCBJbnQxNkFycmF5PiB7IGNvbnN0cnVjdG9yKCkgeyBzdXBlcih0cnVlLCAxNik7IH0gfVxuZXhwb3J0IGNsYXNzIEludDMyIGV4dGVuZHMgSW50PG51bWJlciwgSW50MzJBcnJheT4geyBjb25zdHJ1Y3RvcigpIHsgc3VwZXIodHJ1ZSwgMzIpOyB9IH1cbmV4cG9ydCBjbGFzcyBJbnQ2NCBleHRlbmRzIEludDxJbnQzMkFycmF5LCBJbnQzMkFycmF5PiB7IGNvbnN0cnVjdG9yKCkgeyBzdXBlcih0cnVlLCA2NCk7IH0gfVxuZXhwb3J0IGNsYXNzIFVpbnQ4IGV4dGVuZHMgSW50PG51bWJlciwgVWludDhBcnJheT4geyBjb25zdHJ1Y3RvcigpIHsgc3VwZXIoZmFsc2UsIDgpOyB9IH1cbmV4cG9ydCBjbGFzcyBVaW50MTYgZXh0ZW5kcyBJbnQ8bnVtYmVyLCBVaW50MTZBcnJheT4geyBjb25zdHJ1Y3RvcigpIHsgc3VwZXIoZmFsc2UsIDE2KTsgfSB9XG5leHBvcnQgY2xhc3MgVWludDMyIGV4dGVuZHMgSW50PG51bWJlciwgVWludDMyQXJyYXk+IHsgY29uc3RydWN0b3IoKSB7IHN1cGVyKGZhbHNlLCAzMik7IH0gfVxuZXhwb3J0IGNsYXNzIFVpbnQ2NCBleHRlbmRzIEludDxVaW50MzJBcnJheSwgVWludDMyQXJyYXk+IHsgY29uc3RydWN0b3IoKSB7IHN1cGVyKGZhbHNlLCA2NCk7IH0gfVxuXG5leHBvcnQgaW50ZXJmYWNlIEZsb2F0PFRBcnJheVR5cGUgZXh0ZW5kcyBGbG9hdEFycmF5ID0gRmxvYXRBcnJheT4gZXh0ZW5kcyBEYXRhVHlwZTxUeXBlLkZsb2F0PiB7IFRBcnJheTogVEFycmF5VHlwZTsgVFZhbHVlOiBudW1iZXI7IH1cbmV4cG9ydCBjbGFzcyBGbG9hdDxUQXJyYXlUeXBlIGV4dGVuZHMgRmxvYXRBcnJheSA9IEZsb2F0QXJyYXk+IGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5GbG9hdD4ge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyByZWFkb25seSBwcmVjaXNpb246IFByZWNpc2lvbikge1xuICAgICAgICBzdXBlcihUeXBlLkZsb2F0KTtcbiAgICB9XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyBnZXQgQXJyYXlUeXBlKCk6IFR5cGVkQXJyYXlDb25zdHJ1Y3RvcjxUQXJyYXlUeXBlPiB7XG4gICAgICAgIHN3aXRjaCAodGhpcy5wcmVjaXNpb24pIHtcbiAgICAgICAgICAgIGNhc2UgUHJlY2lzaW9uLkhBTEY6IHJldHVybiBVaW50MTZBcnJheSBhcyBhbnk7XG4gICAgICAgICAgICBjYXNlIFByZWNpc2lvbi5TSU5HTEU6IHJldHVybiBGbG9hdDMyQXJyYXkgYXMgYW55O1xuICAgICAgICAgICAgY2FzZSBQcmVjaXNpb24uRE9VQkxFOiByZXR1cm4gRmxvYXQ2NEFycmF5IGFzIGFueTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVucmVjb2duaXplZCAke3RoaXNbU3ltYm9sLnRvU3RyaW5nVGFnXX0gdHlwZWApO1xuICAgIH1cbiAgICBwdWJsaWMgdG9TdHJpbmcoKSB7IHJldHVybiBgRmxvYXQkeyh0aGlzLnByZWNpc2lvbiA8PCA1KSB8fCAxNn1gOyB9XG4gICAgcHVibGljIGFjY2VwdFR5cGVWaXNpdG9yKHZpc2l0b3I6IFR5cGVWaXNpdG9yKTogYW55IHsgcmV0dXJuIHZpc2l0b3IudmlzaXRGbG9hdCh0aGlzKTsgfVxuICAgIHByb3RlY3RlZCBzdGF0aWMgW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAoKHByb3RvOiBGbG9hdCkgPT4ge1xuICAgICAgICByZXR1cm4gcHJvdG9bU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICdGbG9hdCc7XG4gICAgfSkoRmxvYXQucHJvdG90eXBlKTtcbn1cblxuZXhwb3J0IGNsYXNzIEZsb2F0MTYgZXh0ZW5kcyBGbG9hdDxVaW50MTZBcnJheT4geyBjb25zdHJ1Y3RvcigpIHsgc3VwZXIoUHJlY2lzaW9uLkhBTEYpOyB9IH1cbmV4cG9ydCBjbGFzcyBGbG9hdDMyIGV4dGVuZHMgRmxvYXQ8RmxvYXQzMkFycmF5PiB7IGNvbnN0cnVjdG9yKCkgeyBzdXBlcihQcmVjaXNpb24uU0lOR0xFKTsgfSB9XG5leHBvcnQgY2xhc3MgRmxvYXQ2NCBleHRlbmRzIEZsb2F0PEZsb2F0NjRBcnJheT4geyBjb25zdHJ1Y3RvcigpIHsgc3VwZXIoUHJlY2lzaW9uLkRPVUJMRSk7IH0gfVxuXG5leHBvcnQgaW50ZXJmYWNlIEJpbmFyeSBleHRlbmRzIERhdGFUeXBlPFR5cGUuQmluYXJ5PiB7IFRBcnJheTogVWludDhBcnJheTsgVFZhbHVlOiBVaW50OEFycmF5OyB9XG5leHBvcnQgY2xhc3MgQmluYXJ5IGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5CaW5hcnk+IHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoVHlwZS5CaW5hcnkpO1xuICAgIH1cbiAgICBwdWJsaWMgdG9TdHJpbmcoKSB7IHJldHVybiBgQmluYXJ5YDsgfVxuICAgIHB1YmxpYyBhY2NlcHRUeXBlVmlzaXRvcih2aXNpdG9yOiBUeXBlVmlzaXRvcik6IGFueSB7XG4gICAgICAgIHJldHVybiB2aXNpdG9yLnZpc2l0QmluYXJ5KHRoaXMpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgc3RhdGljIFtTeW1ib2wudG9TdHJpbmdUYWddID0gKChwcm90bzogQmluYXJ5KSA9PiB7XG4gICAgICAgICg8YW55PiBwcm90bykuQXJyYXlUeXBlID0gVWludDhBcnJheTtcbiAgICAgICAgcmV0dXJuIHByb3RvW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAnQmluYXJ5JztcbiAgICB9KShCaW5hcnkucHJvdG90eXBlKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBVdGY4IGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5VdGY4PiB7IFRBcnJheTogVWludDhBcnJheTsgVFZhbHVlOiBzdHJpbmc7IH1cbmV4cG9ydCBjbGFzcyBVdGY4IGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5VdGY4PiB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKFR5cGUuVXRmOCk7XG4gICAgfVxuICAgIHB1YmxpYyB0b1N0cmluZygpIHsgcmV0dXJuIGBVdGY4YDsgfVxuICAgIHB1YmxpYyBhY2NlcHRUeXBlVmlzaXRvcih2aXNpdG9yOiBUeXBlVmlzaXRvcik6IGFueSB7XG4gICAgICAgIHJldHVybiB2aXNpdG9yLnZpc2l0VXRmOCh0aGlzKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHN0YXRpYyBbU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICgocHJvdG86IFV0ZjgpID0+IHtcbiAgICAgICAgKDxhbnk+IHByb3RvKS5BcnJheVR5cGUgPSBVaW50OEFycmF5O1xuICAgICAgICByZXR1cm4gcHJvdG9bU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICdVdGY4JztcbiAgICB9KShVdGY4LnByb3RvdHlwZSk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQm9vbCBleHRlbmRzIERhdGFUeXBlPFR5cGUuQm9vbD4geyBUQXJyYXk6IFVpbnQ4QXJyYXk7IFRWYWx1ZTogYm9vbGVhbjsgfVxuZXhwb3J0IGNsYXNzIEJvb2wgZXh0ZW5kcyBEYXRhVHlwZTxUeXBlLkJvb2w+IHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoVHlwZS5Cb29sKTtcbiAgICB9XG4gICAgcHVibGljIHRvU3RyaW5nKCkgeyByZXR1cm4gYEJvb2xgOyB9XG4gICAgcHVibGljIGFjY2VwdFR5cGVWaXNpdG9yKHZpc2l0b3I6IFR5cGVWaXNpdG9yKTogYW55IHtcbiAgICAgICAgcmV0dXJuIHZpc2l0b3IudmlzaXRCb29sKHRoaXMpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgc3RhdGljIFtTeW1ib2wudG9TdHJpbmdUYWddID0gKChwcm90bzogQm9vbCkgPT4ge1xuICAgICAgICAoPGFueT4gcHJvdG8pLkFycmF5VHlwZSA9IFVpbnQ4QXJyYXk7XG4gICAgICAgIHJldHVybiBwcm90b1tTeW1ib2wudG9TdHJpbmdUYWddID0gJ0Jvb2wnO1xuICAgIH0pKEJvb2wucHJvdG90eXBlKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEZWNpbWFsIGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5EZWNpbWFsPiB7IFRBcnJheTogVWludDMyQXJyYXk7IFRWYWx1ZTogVWludDMyQXJyYXk7IH1cbmV4cG9ydCBjbGFzcyBEZWNpbWFsIGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5EZWNpbWFsPiB7XG4gICAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IHNjYWxlOiBudW1iZXIsXG4gICAgICAgICAgICAgICAgcHVibGljIHJlYWRvbmx5IHByZWNpc2lvbjogbnVtYmVyKSB7XG4gICAgICAgIHN1cGVyKFR5cGUuRGVjaW1hbCk7XG4gICAgfVxuICAgIHB1YmxpYyB0b1N0cmluZygpIHsgcmV0dXJuIGBEZWNpbWFsWyR7dGhpcy5wcmVjaXNpb259ZSR7dGhpcy5zY2FsZSA+IDAgPyBgK2AgOiBgYH0ke3RoaXMuc2NhbGV9XWA7IH1cbiAgICBwdWJsaWMgYWNjZXB0VHlwZVZpc2l0b3IodmlzaXRvcjogVHlwZVZpc2l0b3IpOiBhbnkge1xuICAgICAgICByZXR1cm4gdmlzaXRvci52aXNpdERlY2ltYWwodGhpcyk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBzdGF0aWMgW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAoKHByb3RvOiBEZWNpbWFsKSA9PiB7XG4gICAgICAgICg8YW55PiBwcm90bykuQXJyYXlUeXBlID0gVWludDMyQXJyYXk7XG4gICAgICAgIHJldHVybiBwcm90b1tTeW1ib2wudG9TdHJpbmdUYWddID0gJ0RlY2ltYWwnO1xuICAgIH0pKERlY2ltYWwucHJvdG90eXBlKTtcbn1cblxuLyogdHNsaW50OmRpc2FibGU6Y2xhc3MtbmFtZSAqL1xuZXhwb3J0IGludGVyZmFjZSBEYXRlXyBleHRlbmRzIERhdGFUeXBlPFR5cGUuRGF0ZT4geyBUQXJyYXk6IEludDMyQXJyYXk7IFRWYWx1ZTogRGF0ZTsgfVxuZXhwb3J0IGNsYXNzIERhdGVfIGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5EYXRlPiB7XG4gICAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IHVuaXQ6IERhdGVVbml0KSB7XG4gICAgICAgIHN1cGVyKFR5cGUuRGF0ZSk7XG4gICAgfVxuICAgIHB1YmxpYyB0b1N0cmluZygpIHsgcmV0dXJuIGBEYXRlJHsodGhpcy51bml0ICsgMSkgKiAzMn08JHtEYXRlVW5pdFt0aGlzLnVuaXRdfT5gOyB9XG4gICAgcHVibGljIGFjY2VwdFR5cGVWaXNpdG9yKHZpc2l0b3I6IFR5cGVWaXNpdG9yKTogYW55IHtcbiAgICAgICAgcmV0dXJuIHZpc2l0b3IudmlzaXREYXRlKHRoaXMpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgc3RhdGljIFtTeW1ib2wudG9TdHJpbmdUYWddID0gKChwcm90bzogRGF0ZV8pID0+IHtcbiAgICAgICAgKDxhbnk+IHByb3RvKS5BcnJheVR5cGUgPSBJbnQzMkFycmF5O1xuICAgICAgICByZXR1cm4gcHJvdG9bU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICdEYXRlJztcbiAgICB9KShEYXRlXy5wcm90b3R5cGUpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRpbWUgZXh0ZW5kcyBEYXRhVHlwZTxUeXBlLlRpbWU+IHsgVEFycmF5OiBVaW50MzJBcnJheTsgVFZhbHVlOiBudW1iZXI7IH1cbmV4cG9ydCBjbGFzcyBUaW1lIGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5UaW1lPiB7XG4gICAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IHVuaXQ6IFRpbWVVbml0LFxuICAgICAgICAgICAgICAgIHB1YmxpYyByZWFkb25seSBiaXRXaWR0aDogVGltZUJpdFdpZHRoKSB7XG4gICAgICAgIHN1cGVyKFR5cGUuVGltZSk7XG4gICAgfVxuICAgIHB1YmxpYyB0b1N0cmluZygpIHsgcmV0dXJuIGBUaW1lJHt0aGlzLmJpdFdpZHRofTwke1RpbWVVbml0W3RoaXMudW5pdF19PmA7IH1cbiAgICBwdWJsaWMgYWNjZXB0VHlwZVZpc2l0b3IodmlzaXRvcjogVHlwZVZpc2l0b3IpOiBhbnkge1xuICAgICAgICByZXR1cm4gdmlzaXRvci52aXNpdFRpbWUodGhpcyk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBzdGF0aWMgW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAoKHByb3RvOiBUaW1lKSA9PiB7XG4gICAgICAgICg8YW55PiBwcm90bykuQXJyYXlUeXBlID0gVWludDMyQXJyYXk7XG4gICAgICAgIHJldHVybiBwcm90b1tTeW1ib2wudG9TdHJpbmdUYWddID0gJ1RpbWUnO1xuICAgIH0pKFRpbWUucHJvdG90eXBlKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUaW1lc3RhbXAgZXh0ZW5kcyBEYXRhVHlwZTxUeXBlLlRpbWVzdGFtcD4geyBUQXJyYXk6IEludDMyQXJyYXk7IFRWYWx1ZTogbnVtYmVyOyB9XG5leHBvcnQgY2xhc3MgVGltZXN0YW1wIGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5UaW1lc3RhbXA+IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgdW5pdDogVGltZVVuaXQsIHB1YmxpYyB0aW1lem9uZT86IHN0cmluZyB8IG51bGwpIHtcbiAgICAgICAgc3VwZXIoVHlwZS5UaW1lc3RhbXApO1xuICAgIH1cbiAgICBwdWJsaWMgdG9TdHJpbmcoKSB7IHJldHVybiBgVGltZXN0YW1wPCR7VGltZVVuaXRbdGhpcy51bml0XX0ke3RoaXMudGltZXpvbmUgPyBgLCAke3RoaXMudGltZXpvbmV9YCA6IGBgfT5gOyB9XG4gICAgcHVibGljIGFjY2VwdFR5cGVWaXNpdG9yKHZpc2l0b3I6IFR5cGVWaXNpdG9yKTogYW55IHtcbiAgICAgICAgcmV0dXJuIHZpc2l0b3IudmlzaXRUaW1lc3RhbXAodGhpcyk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBzdGF0aWMgW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAoKHByb3RvOiBUaW1lc3RhbXApID0+IHtcbiAgICAgICAgKDxhbnk+IHByb3RvKS5BcnJheVR5cGUgPSBJbnQzMkFycmF5O1xuICAgICAgICByZXR1cm4gcHJvdG9bU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICdUaW1lc3RhbXAnO1xuICAgIH0pKFRpbWVzdGFtcC5wcm90b3R5cGUpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEludGVydmFsIGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5JbnRlcnZhbD4geyBUQXJyYXk6IEludDMyQXJyYXk7IFRWYWx1ZTogSW50MzJBcnJheTsgfVxuZXhwb3J0IGNsYXNzIEludGVydmFsIGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5JbnRlcnZhbD4ge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyB1bml0OiBJbnRlcnZhbFVuaXQpIHtcbiAgICAgICAgc3VwZXIoVHlwZS5JbnRlcnZhbCk7XG4gICAgfVxuICAgIHB1YmxpYyB0b1N0cmluZygpIHsgcmV0dXJuIGBJbnRlcnZhbDwke0ludGVydmFsVW5pdFt0aGlzLnVuaXRdfT5gOyB9XG4gICAgcHVibGljIGFjY2VwdFR5cGVWaXNpdG9yKHZpc2l0b3I6IFR5cGVWaXNpdG9yKTogYW55IHtcbiAgICAgICAgcmV0dXJuIHZpc2l0b3IudmlzaXRJbnRlcnZhbCh0aGlzKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHN0YXRpYyBbU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICgocHJvdG86IEludGVydmFsKSA9PiB7XG4gICAgICAgICg8YW55PiBwcm90bykuQXJyYXlUeXBlID0gSW50MzJBcnJheTtcbiAgICAgICAgcmV0dXJuIHByb3RvW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAnSW50ZXJ2YWwnO1xuICAgIH0pKEludGVydmFsLnByb3RvdHlwZSk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGlzdDxUIGV4dGVuZHMgRGF0YVR5cGUgPSBhbnk+IGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5MaXN0PiAgeyBUQXJyYXk6IGFueTsgVFZhbHVlOiBWZWN0b3I8VD47IH1cbmV4cG9ydCBjbGFzcyBMaXN0PFQgZXh0ZW5kcyBEYXRhVHlwZSA9IGFueT4gZXh0ZW5kcyBEYXRhVHlwZTxUeXBlLkxpc3Q+IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgY2hpbGRyZW46IEZpZWxkW10pIHtcbiAgICAgICAgc3VwZXIoVHlwZS5MaXN0LCBjaGlsZHJlbik7XG4gICAgfVxuICAgIHB1YmxpYyB0b1N0cmluZygpIHsgcmV0dXJuIGBMaXN0PCR7dGhpcy52YWx1ZVR5cGV9PmA7IH1cbiAgICBwdWJsaWMgZ2V0IEFycmF5VHlwZSgpIHsgcmV0dXJuIHRoaXMudmFsdWVUeXBlLkFycmF5VHlwZTsgfVxuICAgIHB1YmxpYyBnZXQgdmFsdWVUeXBlKCkgeyByZXR1cm4gdGhpcy5jaGlsZHJlblswXS50eXBlIGFzIFQ7IH1cbiAgICBwdWJsaWMgZ2V0IHZhbHVlRmllbGQoKSB7IHJldHVybiB0aGlzLmNoaWxkcmVuWzBdIGFzIEZpZWxkPFQ+OyB9XG4gICAgcHVibGljIGFjY2VwdFR5cGVWaXNpdG9yKHZpc2l0b3I6IFR5cGVWaXNpdG9yKTogYW55IHtcbiAgICAgICAgcmV0dXJuIHZpc2l0b3IudmlzaXRMaXN0KHRoaXMpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgc3RhdGljIFtTeW1ib2wudG9TdHJpbmdUYWddID0gKChwcm90bzogTGlzdCkgPT4ge1xuICAgICAgICByZXR1cm4gcHJvdG9bU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICdMaXN0JztcbiAgICB9KShMaXN0LnByb3RvdHlwZSk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3RydWN0IGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5TdHJ1Y3Q+IHsgVEFycmF5OiBhbnk7IFRWYWx1ZTogVmlldzxhbnk+OyB9XG5leHBvcnQgY2xhc3MgU3RydWN0IGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5TdHJ1Y3Q+IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgY2hpbGRyZW46IEZpZWxkW10pIHtcbiAgICAgICAgc3VwZXIoVHlwZS5TdHJ1Y3QsIGNoaWxkcmVuKTtcbiAgICB9XG4gICAgcHVibGljIHRvU3RyaW5nKCkgeyByZXR1cm4gYFN0cnVjdDwke3RoaXMuY2hpbGRyZW4ubWFwKChmKSA9PiBmLnR5cGUpLmpvaW4oYCwgYCl9PmA7IH1cbiAgICBwdWJsaWMgYWNjZXB0VHlwZVZpc2l0b3IodmlzaXRvcjogVHlwZVZpc2l0b3IpOiBhbnkge1xuICAgICAgICByZXR1cm4gdmlzaXRvci52aXNpdFN0cnVjdCh0aGlzKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHN0YXRpYyBbU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICgocHJvdG86IFN0cnVjdCkgPT4ge1xuICAgICAgICByZXR1cm4gcHJvdG9bU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICdTdHJ1Y3QnO1xuICAgIH0pKFN0cnVjdC5wcm90b3R5cGUpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFVuaW9uPFRUeXBlIGV4dGVuZHMgVHlwZSA9IGFueT4gZXh0ZW5kcyBEYXRhVHlwZTxUVHlwZT4geyBUQXJyYXk6IEludDhBcnJheTsgVFZhbHVlOiBhbnk7IH1cbmV4cG9ydCBjbGFzcyBVbmlvbjxUVHlwZSBleHRlbmRzIFR5cGUgPSBhbnk+IGV4dGVuZHMgRGF0YVR5cGU8VFR5cGU+IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgbW9kZTogVW5pb25Nb2RlLFxuICAgICAgICAgICAgICAgIHB1YmxpYyByZWFkb25seSB0eXBlSWRzOiBBcnJvd1R5cGVbXSxcbiAgICAgICAgICAgICAgICBwdWJsaWMgcmVhZG9ubHkgY2hpbGRyZW46IEZpZWxkW10pIHtcbiAgICAgICAgc3VwZXIoPFRUeXBlPiAobW9kZSA9PT0gVW5pb25Nb2RlLlNwYXJzZSA/IFR5cGUuU3BhcnNlVW5pb24gOiBUeXBlLkRlbnNlVW5pb24pLCBjaGlsZHJlbik7XG4gICAgfVxuICAgIHB1YmxpYyB0b1N0cmluZygpIHsgcmV0dXJuIGAke3RoaXNbU3ltYm9sLnRvU3RyaW5nVGFnXX08JHt0aGlzLnR5cGVJZHMubWFwKCh4KSA9PiBUeXBlW3hdKS5qb2luKGAgfCBgKX0+YDsgfVxuICAgIHB1YmxpYyBhY2NlcHRUeXBlVmlzaXRvcih2aXNpdG9yOiBUeXBlVmlzaXRvcik6IGFueSB7IHJldHVybiB2aXNpdG9yLnZpc2l0VW5pb24odGhpcyk7IH1cbiAgICBwcm90ZWN0ZWQgc3RhdGljIFtTeW1ib2wudG9TdHJpbmdUYWddID0gKChwcm90bzogVW5pb24pID0+IHtcbiAgICAgICAgKDxhbnk+IHByb3RvKS5BcnJheVR5cGUgPSBJbnQ4QXJyYXk7XG4gICAgICAgIHJldHVybiBwcm90b1tTeW1ib2wudG9TdHJpbmdUYWddID0gJ1VuaW9uJztcbiAgICB9KShVbmlvbi5wcm90b3R5cGUpO1xufVxuXG5leHBvcnQgY2xhc3MgRGVuc2VVbmlvbiBleHRlbmRzIFVuaW9uPFR5cGUuRGVuc2VVbmlvbj4ge1xuICAgIGNvbnN0cnVjdG9yKHR5cGVJZHM6IEFycm93VHlwZVtdLCBjaGlsZHJlbjogRmllbGRbXSkge1xuICAgICAgICBzdXBlcihVbmlvbk1vZGUuRGVuc2UsIHR5cGVJZHMsIGNoaWxkcmVuKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHN0YXRpYyBbU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICgocHJvdG86IERlbnNlVW5pb24pID0+IHtcbiAgICAgICAgcmV0dXJuIHByb3RvW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAnRGVuc2VVbmlvbic7XG4gICAgfSkoRGVuc2VVbmlvbi5wcm90b3R5cGUpO1xufVxuXG5leHBvcnQgY2xhc3MgU3BhcnNlVW5pb24gZXh0ZW5kcyBVbmlvbjxUeXBlLlNwYXJzZVVuaW9uPiB7XG4gICAgY29uc3RydWN0b3IodHlwZUlkczogQXJyb3dUeXBlW10sIGNoaWxkcmVuOiBGaWVsZFtdKSB7XG4gICAgICAgIHN1cGVyKFVuaW9uTW9kZS5TcGFyc2UsIHR5cGVJZHMsIGNoaWxkcmVuKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHN0YXRpYyBbU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICgocHJvdG86IFNwYXJzZVVuaW9uKSA9PiB7XG4gICAgICAgIHJldHVybiBwcm90b1tTeW1ib2wudG9TdHJpbmdUYWddID0gJ1NwYXJzZVVuaW9uJztcbiAgICB9KShTcGFyc2VVbmlvbi5wcm90b3R5cGUpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEZpeGVkU2l6ZUJpbmFyeSBleHRlbmRzIERhdGFUeXBlPFR5cGUuRml4ZWRTaXplQmluYXJ5PiB7IFRBcnJheTogVWludDhBcnJheTsgVFZhbHVlOiBVaW50OEFycmF5OyB9XG5leHBvcnQgY2xhc3MgRml4ZWRTaXplQmluYXJ5IGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5GaXhlZFNpemVCaW5hcnk+IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgYnl0ZVdpZHRoOiBudW1iZXIpIHtcbiAgICAgICAgc3VwZXIoVHlwZS5GaXhlZFNpemVCaW5hcnkpO1xuICAgIH1cbiAgICBwdWJsaWMgdG9TdHJpbmcoKSB7IHJldHVybiBgRml4ZWRTaXplQmluYXJ5WyR7dGhpcy5ieXRlV2lkdGh9XWA7IH1cbiAgICBwdWJsaWMgYWNjZXB0VHlwZVZpc2l0b3IodmlzaXRvcjogVHlwZVZpc2l0b3IpOiBhbnkgeyByZXR1cm4gdmlzaXRvci52aXNpdEZpeGVkU2l6ZUJpbmFyeSh0aGlzKTsgfVxuICAgIHByb3RlY3RlZCBzdGF0aWMgW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAoKHByb3RvOiBGaXhlZFNpemVCaW5hcnkpID0+IHtcbiAgICAgICAgKDxhbnk+IHByb3RvKS5BcnJheVR5cGUgPSBVaW50OEFycmF5O1xuICAgICAgICByZXR1cm4gcHJvdG9bU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICdGaXhlZFNpemVCaW5hcnknO1xuICAgIH0pKEZpeGVkU2l6ZUJpbmFyeS5wcm90b3R5cGUpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEZpeGVkU2l6ZUxpc3Q8VCBleHRlbmRzIERhdGFUeXBlID0gYW55PiBleHRlbmRzIERhdGFUeXBlPFR5cGUuRml4ZWRTaXplTGlzdD4geyBUQXJyYXk6IGFueTsgVFZhbHVlOiBWZWN0b3I8VD47IH1cbmV4cG9ydCBjbGFzcyBGaXhlZFNpemVMaXN0PFQgZXh0ZW5kcyBEYXRhVHlwZSA9IGFueT4gZXh0ZW5kcyBEYXRhVHlwZTxUeXBlLkZpeGVkU2l6ZUxpc3Q+IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgbGlzdFNpemU6IG51bWJlcixcbiAgICAgICAgICAgICAgICBwdWJsaWMgcmVhZG9ubHkgY2hpbGRyZW46IEZpZWxkW10pIHtcbiAgICAgICAgc3VwZXIoVHlwZS5GaXhlZFNpemVMaXN0LCBjaGlsZHJlbik7XG4gICAgfVxuICAgIHB1YmxpYyBnZXQgQXJyYXlUeXBlKCkgeyByZXR1cm4gdGhpcy52YWx1ZVR5cGUuQXJyYXlUeXBlOyB9XG4gICAgcHVibGljIGdldCB2YWx1ZVR5cGUoKSB7IHJldHVybiB0aGlzLmNoaWxkcmVuWzBdLnR5cGUgYXMgVDsgfVxuICAgIHB1YmxpYyBnZXQgdmFsdWVGaWVsZCgpIHsgcmV0dXJuIHRoaXMuY2hpbGRyZW5bMF0gYXMgRmllbGQ8VD47IH1cbiAgICBwdWJsaWMgdG9TdHJpbmcoKSB7IHJldHVybiBgRml4ZWRTaXplTGlzdFske3RoaXMubGlzdFNpemV9XTwke3RoaXMudmFsdWVUeXBlfT5gOyB9XG4gICAgcHVibGljIGFjY2VwdFR5cGVWaXNpdG9yKHZpc2l0b3I6IFR5cGVWaXNpdG9yKTogYW55IHsgcmV0dXJuIHZpc2l0b3IudmlzaXRGaXhlZFNpemVMaXN0KHRoaXMpOyB9XG4gICAgcHJvdGVjdGVkIHN0YXRpYyBbU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICgocHJvdG86IEZpeGVkU2l6ZUxpc3QpID0+IHtcbiAgICAgICAgcmV0dXJuIHByb3RvW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAnRml4ZWRTaXplTGlzdCc7XG4gICAgfSkoRml4ZWRTaXplTGlzdC5wcm90b3R5cGUpO1xufVxuXG4vKiB0c2xpbnQ6ZGlzYWJsZTpjbGFzcy1uYW1lICovXG5leHBvcnQgaW50ZXJmYWNlIE1hcF8gZXh0ZW5kcyBEYXRhVHlwZTxUeXBlLk1hcD4geyBUQXJyYXk6IFVpbnQ4QXJyYXk7IFRWYWx1ZTogVmlldzxhbnk+OyB9XG5leHBvcnQgY2xhc3MgTWFwXyBleHRlbmRzIERhdGFUeXBlPFR5cGUuTWFwPiB7XG4gICAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IGtleXNTb3J0ZWQ6IGJvb2xlYW4sXG4gICAgICAgICAgICAgICAgcHVibGljIHJlYWRvbmx5IGNoaWxkcmVuOiBGaWVsZFtdKSB7XG4gICAgICAgIHN1cGVyKFR5cGUuTWFwLCBjaGlsZHJlbik7XG4gICAgfVxuICAgIHB1YmxpYyB0b1N0cmluZygpIHsgcmV0dXJuIGBNYXA8JHt0aGlzLmNoaWxkcmVuLmpvaW4oYCwgYCl9PmA7IH1cbiAgICBwdWJsaWMgYWNjZXB0VHlwZVZpc2l0b3IodmlzaXRvcjogVHlwZVZpc2l0b3IpOiBhbnkgeyByZXR1cm4gdmlzaXRvci52aXNpdE1hcCh0aGlzKTsgfVxuICAgIHByb3RlY3RlZCBzdGF0aWMgW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAoKHByb3RvOiBNYXBfKSA9PiB7XG4gICAgICAgIHJldHVybiBwcm90b1tTeW1ib2wudG9TdHJpbmdUYWddID0gJ01hcF8nO1xuICAgIH0pKE1hcF8ucHJvdG90eXBlKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEaWN0aW9uYXJ5PFQgZXh0ZW5kcyBEYXRhVHlwZSA9IGFueT4gZXh0ZW5kcyBEYXRhVHlwZTxUeXBlLkRpY3Rpb25hcnk+IHsgVEFycmF5OiBUWydUQXJyYXknXTsgVFZhbHVlOiBUWydUVmFsdWUnXTsgfVxuZXhwb3J0IGNsYXNzIERpY3Rpb25hcnk8VCBleHRlbmRzIERhdGFUeXBlPiBleHRlbmRzIERhdGFUeXBlPFR5cGUuRGljdGlvbmFyeT4ge1xuICAgIHB1YmxpYyByZWFkb25seSBpZDogbnVtYmVyO1xuICAgIHB1YmxpYyByZWFkb25seSBkaWN0aW9uYXJ5OiBUO1xuICAgIHB1YmxpYyByZWFkb25seSBpbmRpY2llczogSW50PGFueT47XG4gICAgcHVibGljIHJlYWRvbmx5IGlzT3JkZXJlZDogYm9vbGVhbjtcbiAgICBjb25zdHJ1Y3RvcihkaWN0aW9uYXJ5OiBULCBpbmRpY2llczogSW50PGFueT4sIGlkPzogTG9uZyB8IG51bWJlciB8IG51bGwsIGlzT3JkZXJlZD86IGJvb2xlYW4gfCBudWxsKSB7XG4gICAgICAgIHN1cGVyKFR5cGUuRGljdGlvbmFyeSk7XG4gICAgICAgIHRoaXMuaW5kaWNpZXMgPSBpbmRpY2llcztcbiAgICAgICAgdGhpcy5kaWN0aW9uYXJ5ID0gZGljdGlvbmFyeTtcbiAgICAgICAgdGhpcy5pc09yZGVyZWQgPSBpc09yZGVyZWQgfHwgZmFsc2U7XG4gICAgICAgIHRoaXMuaWQgPSBpZCA9PSBudWxsID8gRGljdGlvbmFyeUJhdGNoLmdldElkKCkgOiB0eXBlb2YgaWQgPT09ICdudW1iZXInID8gaWQgOiBpZC5sb3c7XG4gICAgfVxuICAgIHB1YmxpYyBnZXQgQXJyYXlUeXBlKCkgeyByZXR1cm4gdGhpcy5kaWN0aW9uYXJ5LkFycmF5VHlwZTsgfVxuICAgIHB1YmxpYyB0b1N0cmluZygpIHsgcmV0dXJuIGBEaWN0aW9uYXJ5PCR7dGhpcy5kaWN0aW9uYXJ5fSwgJHt0aGlzLmluZGljaWVzfT5gOyB9XG4gICAgcHVibGljIGFjY2VwdFR5cGVWaXNpdG9yKHZpc2l0b3I6IFR5cGVWaXNpdG9yKTogYW55IHtcbiAgICAgICAgcmV0dXJuIHZpc2l0b3IudmlzaXREaWN0aW9uYXJ5KHRoaXMpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgc3RhdGljIFtTeW1ib2wudG9TdHJpbmdUYWddID0gKChwcm90bzogRGljdGlvbmFyeSkgPT4ge1xuICAgICAgICByZXR1cm4gcHJvdG9bU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICdEaWN0aW9uYXJ5JztcbiAgICB9KShEaWN0aW9uYXJ5LnByb3RvdHlwZSk7XG59XG5leHBvcnQgaW50ZXJmYWNlIEl0ZXJhYmxlQXJyYXlMaWtlPFQgPSBhbnk+IGV4dGVuZHMgQXJyYXlMaWtlPFQ+LCBJdGVyYWJsZTxUPiB7fVxuXG5leHBvcnQgaW50ZXJmYWNlIFR5cGVkQXJyYXlDb25zdHJ1Y3RvcjxUIGV4dGVuZHMgVHlwZWRBcnJheSA9IFR5cGVkQXJyYXk+IHtcbiAgICByZWFkb25seSBwcm90b3R5cGU6IFQ7XG4gICAgcmVhZG9ubHkgQllURVNfUEVSX0VMRU1FTlQ6IG51bWJlcjtcbiAgICBuZXcgKGxlbmd0aDogbnVtYmVyKTogVDtcbiAgICBuZXcgKGVsZW1lbnRzOiBJdGVyYWJsZTxudW1iZXI+KTogVDtcbiAgICBuZXcgKGFycmF5T3JBcnJheUJ1ZmZlcjogQXJyYXlMaWtlPG51bWJlcj4gfCBBcnJheUJ1ZmZlckxpa2UpOiBUO1xuICAgIG5ldyAoYnVmZmVyOiBBcnJheUJ1ZmZlckxpa2UsIGJ5dGVPZmZzZXQ6IG51bWJlciwgbGVuZ3RoPzogbnVtYmVyKTogVDtcbiAgICBvZiguLi5pdGVtczogbnVtYmVyW10pOiBUO1xuICAgIGZyb20oYXJyYXlMaWtlOiBBcnJheUxpa2U8bnVtYmVyPiB8IEl0ZXJhYmxlPG51bWJlcj4sIG1hcGZuPzogKHY6IG51bWJlciwgazogbnVtYmVyKSA9PiBudW1iZXIsIHRoaXNBcmc/OiBhbnkpOiBUO1xufVxuXG5leHBvcnQgdHlwZSBGbG9hdEFycmF5ID0gVWludDE2QXJyYXkgfCBGbG9hdDMyQXJyYXkgfCBGbG9hdDY0QXJyYXk7XG5leHBvcnQgdHlwZSBJbnRBcnJheSA9IEludDhBcnJheSB8IEludDE2QXJyYXkgfCBJbnQzMkFycmF5IHwgVWludDhBcnJheSB8IFVpbnQxNkFycmF5IHwgVWludDMyQXJyYXk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHlwZWRBcnJheSBleHRlbmRzIEl0ZXJhYmxlPG51bWJlcj4ge1xuICAgIFtpbmRleDogbnVtYmVyXTogbnVtYmVyO1xuICAgIHJlYWRvbmx5IGxlbmd0aDogbnVtYmVyO1xuICAgIHJlYWRvbmx5IGJ5dGVMZW5ndGg6IG51bWJlcjtcbiAgICByZWFkb25seSBieXRlT2Zmc2V0OiBudW1iZXI7XG4gICAgcmVhZG9ubHkgYnVmZmVyOiBBcnJheUJ1ZmZlckxpa2U7XG4gICAgcmVhZG9ubHkgQllURVNfUEVSX0VMRU1FTlQ6IG51bWJlcjtcbiAgICBbU3ltYm9sLnRvU3RyaW5nVGFnXTogYW55O1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8bnVtYmVyPjtcbiAgICBlbnRyaWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgbnVtYmVyXT47XG4gICAga2V5cygpOiBJdGVyYWJsZUl0ZXJhdG9yPG51bWJlcj47XG4gICAgdmFsdWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8bnVtYmVyPjtcbiAgICBjb3B5V2l0aGluKHRhcmdldDogbnVtYmVyLCBzdGFydDogbnVtYmVyLCBlbmQ/OiBudW1iZXIpOiB0aGlzO1xuICAgIGV2ZXJ5KGNhbGxiYWNrZm46ICh2YWx1ZTogbnVtYmVyLCBpbmRleDogbnVtYmVyLCBhcnJheTogVHlwZWRBcnJheSkgPT4gYm9vbGVhbiwgdGhpc0FyZz86IGFueSk6IGJvb2xlYW47XG4gICAgZmlsbCh2YWx1ZTogbnVtYmVyLCBzdGFydD86IG51bWJlciwgZW5kPzogbnVtYmVyKTogdGhpcztcbiAgICBmaWx0ZXIoY2FsbGJhY2tmbjogKHZhbHVlOiBudW1iZXIsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUeXBlZEFycmF5KSA9PiBhbnksIHRoaXNBcmc/OiBhbnkpOiBUeXBlZEFycmF5O1xuICAgIGZpbmQocHJlZGljYXRlOiAodmFsdWU6IG51bWJlciwgaW5kZXg6IG51bWJlciwgb2JqOiBUeXBlZEFycmF5KSA9PiBib29sZWFuLCB0aGlzQXJnPzogYW55KTogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICAgIGZpbmRJbmRleChwcmVkaWNhdGU6ICh2YWx1ZTogbnVtYmVyLCBpbmRleDogbnVtYmVyLCBvYmo6IFR5cGVkQXJyYXkpID0+IGJvb2xlYW4sIHRoaXNBcmc/OiBhbnkpOiBudW1iZXI7XG4gICAgZm9yRWFjaChjYWxsYmFja2ZuOiAodmFsdWU6IG51bWJlciwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFR5cGVkQXJyYXkpID0+IHZvaWQsIHRoaXNBcmc/OiBhbnkpOiB2b2lkO1xuICAgIGluY2x1ZGVzKHNlYXJjaEVsZW1lbnQ6IG51bWJlciwgZnJvbUluZGV4PzogbnVtYmVyKTogYm9vbGVhbjtcbiAgICBpbmRleE9mKHNlYXJjaEVsZW1lbnQ6IG51bWJlciwgZnJvbUluZGV4PzogbnVtYmVyKTogbnVtYmVyO1xuICAgIGpvaW4oc2VwYXJhdG9yPzogc3RyaW5nKTogc3RyaW5nO1xuICAgIGxhc3RJbmRleE9mKHNlYXJjaEVsZW1lbnQ6IG51bWJlciwgZnJvbUluZGV4PzogbnVtYmVyKTogbnVtYmVyO1xuICAgIG1hcChjYWxsYmFja2ZuOiAodmFsdWU6IG51bWJlciwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFR5cGVkQXJyYXkpID0+IG51bWJlciwgdGhpc0FyZz86IGFueSk6IFR5cGVkQXJyYXk7XG4gICAgcmVkdWNlKGNhbGxiYWNrZm46IChwcmV2aW91c1ZhbHVlOiBudW1iZXIsIGN1cnJlbnRWYWx1ZTogbnVtYmVyLCBjdXJyZW50SW5kZXg6IG51bWJlciwgYXJyYXk6IFR5cGVkQXJyYXkpID0+IG51bWJlcik6IG51bWJlcjtcbiAgICByZWR1Y2UoY2FsbGJhY2tmbjogKHByZXZpb3VzVmFsdWU6IG51bWJlciwgY3VycmVudFZhbHVlOiBudW1iZXIsIGN1cnJlbnRJbmRleDogbnVtYmVyLCBhcnJheTogVHlwZWRBcnJheSkgPT4gbnVtYmVyLCBpbml0aWFsVmFsdWU6IG51bWJlcik6IG51bWJlcjtcbiAgICByZWR1Y2U8VT4oY2FsbGJhY2tmbjogKHByZXZpb3VzVmFsdWU6IFUsIGN1cnJlbnRWYWx1ZTogbnVtYmVyLCBjdXJyZW50SW5kZXg6IG51bWJlciwgYXJyYXk6IFR5cGVkQXJyYXkpID0+IFUsIGluaXRpYWxWYWx1ZTogVSk6IFU7XG4gICAgcmVkdWNlUmlnaHQoY2FsbGJhY2tmbjogKHByZXZpb3VzVmFsdWU6IG51bWJlciwgY3VycmVudFZhbHVlOiBudW1iZXIsIGN1cnJlbnRJbmRleDogbnVtYmVyLCBhcnJheTogVHlwZWRBcnJheSkgPT4gbnVtYmVyKTogbnVtYmVyO1xuICAgIHJlZHVjZVJpZ2h0KGNhbGxiYWNrZm46IChwcmV2aW91c1ZhbHVlOiBudW1iZXIsIGN1cnJlbnRWYWx1ZTogbnVtYmVyLCBjdXJyZW50SW5kZXg6IG51bWJlciwgYXJyYXk6IFR5cGVkQXJyYXkpID0+IG51bWJlciwgaW5pdGlhbFZhbHVlOiBudW1iZXIpOiBudW1iZXI7XG4gICAgcmVkdWNlUmlnaHQ8VT4oY2FsbGJhY2tmbjogKHByZXZpb3VzVmFsdWU6IFUsIGN1cnJlbnRWYWx1ZTogbnVtYmVyLCBjdXJyZW50SW5kZXg6IG51bWJlciwgYXJyYXk6IFR5cGVkQXJyYXkpID0+IFUsIGluaXRpYWxWYWx1ZTogVSk6IFU7XG4gICAgcmV2ZXJzZSgpOiBUeXBlZEFycmF5O1xuICAgIHNldChhcnJheTogQXJyYXlMaWtlPG51bWJlcj4sIG9mZnNldD86IG51bWJlcik6IHZvaWQ7XG4gICAgc2xpY2Uoc3RhcnQ/OiBudW1iZXIsIGVuZD86IG51bWJlcik6IFR5cGVkQXJyYXk7XG4gICAgc29tZShjYWxsYmFja2ZuOiAodmFsdWU6IG51bWJlciwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFR5cGVkQXJyYXkpID0+IGJvb2xlYW4sIHRoaXNBcmc/OiBhbnkpOiBib29sZWFuO1xuICAgIHNvcnQoY29tcGFyZUZuPzogKGE6IG51bWJlciwgYjogbnVtYmVyKSA9PiBudW1iZXIpOiB0aGlzO1xuICAgIHN1YmFycmF5KGJlZ2luOiBudW1iZXIsIGVuZD86IG51bWJlcik6IFR5cGVkQXJyYXk7XG4gICAgdG9Mb2NhbGVTdHJpbmcoKTogc3RyaW5nO1xuICAgIHRvU3RyaW5nKCk6IHN0cmluZztcbn1cbiJdfQ==

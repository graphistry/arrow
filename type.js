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
const Schema_ = require("./fb/Schema");
const Message_ = require("./fb/Message");
const flatbuffers_1 = require("flatbuffers");
const metadata_1 = require("./ipc/metadata");
exports.Long = flatbuffers_1.flatbuffers.Long;
exports.ArrowType = Schema_.org.apache.arrow.flatbuf.Type;
exports.DateUnit = Schema_.org.apache.arrow.flatbuf.DateUnit;
exports.TimeUnit = Schema_.org.apache.arrow.flatbuf.TimeUnit;
exports.Precision = Schema_.org.apache.arrow.flatbuf.Precision;
exports.UnionMode = Schema_.org.apache.arrow.flatbuf.UnionMode;
exports.VectorType = Schema_.org.apache.arrow.flatbuf.VectorType;
exports.IntervalUnit = Schema_.org.apache.arrow.flatbuf.IntervalUnit;
exports.MessageHeader = Message_.org.apache.arrow.flatbuf.MessageHeader;
exports.MetadataVersion = Schema_.org.apache.arrow.flatbuf.MetadataVersion;
class Schema {
    constructor(fields, metadata, version = exports.MetadataVersion.V4, dictionaries = new Map()) {
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
    prototype._headerType = exports.MessageHeader.Schema;
    return 'Schema';
})(Schema.prototype);
exports.Schema = Schema;
class Field {
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
exports.Field = Field;
/**
 * *
 * Main data type enumeration:
 * *
 * Data types in this library are all *logical*. They can be expressed as
 * either a primitive physical type (bytes or bits of some fixed size), a
 * nested type consisting of other data types, or another data type (e.g. a
 * timestamp encoded as an int64)
 */
var Type;
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
})(Type = exports.Type || (exports.Type = {}));
class DataType {
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
exports.DataType = DataType;
class Null extends DataType {
    constructor() { super(Type.Null); }
    toString() { return `Null`; }
    acceptTypeVisitor(visitor) {
        return visitor.visitNull(this);
    }
}
Null[Symbol.toStringTag] = ((proto) => {
    return proto[Symbol.toStringTag] = 'Null';
})(Null.prototype);
exports.Null = Null;
class Int extends DataType {
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
exports.Int = Int;
class Int8 extends Int {
    constructor() { super(true, 8); }
}
exports.Int8 = Int8;
class Int16 extends Int {
    constructor() { super(true, 16); }
}
exports.Int16 = Int16;
class Int32 extends Int {
    constructor() { super(true, 32); }
}
exports.Int32 = Int32;
class Int64 extends Int {
    constructor() { super(true, 64); }
}
exports.Int64 = Int64;
class Uint8 extends Int {
    constructor() { super(false, 8); }
}
exports.Uint8 = Uint8;
class Uint16 extends Int {
    constructor() { super(false, 16); }
}
exports.Uint16 = Uint16;
class Uint32 extends Int {
    constructor() { super(false, 32); }
}
exports.Uint32 = Uint32;
class Uint64 extends Int {
    constructor() { super(false, 64); }
}
exports.Uint64 = Uint64;
class Float extends DataType {
    constructor(precision) {
        super(Type.Float);
        this.precision = precision;
    }
    // @ts-ignore
    get ArrayType() {
        switch (this.precision) {
            case exports.Precision.HALF: return Uint16Array;
            case exports.Precision.SINGLE: return Float32Array;
            case exports.Precision.DOUBLE: return Float64Array;
        }
        throw new Error(`Unrecognized ${this[Symbol.toStringTag]} type`);
    }
    toString() { return `Float${(this.precision << 5) || 16}`; }
    acceptTypeVisitor(visitor) { return visitor.visitFloat(this); }
}
Float[Symbol.toStringTag] = ((proto) => {
    return proto[Symbol.toStringTag] = 'Float';
})(Float.prototype);
exports.Float = Float;
class Float16 extends Float {
    constructor() { super(exports.Precision.HALF); }
}
exports.Float16 = Float16;
class Float32 extends Float {
    constructor() { super(exports.Precision.SINGLE); }
}
exports.Float32 = Float32;
class Float64 extends Float {
    constructor() { super(exports.Precision.DOUBLE); }
}
exports.Float64 = Float64;
class Binary extends DataType {
    constructor() { super(Type.Binary); }
    toString() { return `Binary`; }
    acceptTypeVisitor(visitor) {
        return visitor.visitBinary(this);
    }
}
Binary[Symbol.toStringTag] = ((proto) => {
    proto.ArrayType = Uint8Array;
    return proto[Symbol.toStringTag] = 'Binary';
})(Binary.prototype);
exports.Binary = Binary;
class Utf8 extends DataType {
    constructor() { super(Type.Utf8); }
    toString() { return `Utf8`; }
    acceptTypeVisitor(visitor) {
        return visitor.visitUtf8(this);
    }
}
Utf8[Symbol.toStringTag] = ((proto) => {
    proto.ArrayType = Uint8Array;
    return proto[Symbol.toStringTag] = 'Utf8';
})(Utf8.prototype);
exports.Utf8 = Utf8;
class Bool extends DataType {
    constructor() { super(Type.Bool); }
    toString() { return `Bool`; }
    acceptTypeVisitor(visitor) {
        return visitor.visitBool(this);
    }
}
Bool[Symbol.toStringTag] = ((proto) => {
    proto.ArrayType = Uint8Array;
    return proto[Symbol.toStringTag] = 'Bool';
})(Bool.prototype);
exports.Bool = Bool;
class Decimal extends DataType {
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
exports.Decimal = Decimal;
class Date_ extends DataType {
    constructor(unit) {
        super(Type.Date);
        this.unit = unit;
    }
    toString() { return `Date${(this.unit + 1) * 32}<${exports.DateUnit[this.unit]}>`; }
    acceptTypeVisitor(visitor) {
        return visitor.visitDate(this);
    }
}
Date_[Symbol.toStringTag] = ((proto) => {
    proto.ArrayType = Int32Array;
    return proto[Symbol.toStringTag] = 'Date';
})(Date_.prototype);
exports.Date_ = Date_;
class Time extends DataType {
    constructor(unit, bitWidth) {
        super(Type.Time);
        this.unit = unit;
        this.bitWidth = bitWidth;
    }
    toString() { return `Time${this.bitWidth}<${exports.TimeUnit[this.unit]}>`; }
    acceptTypeVisitor(visitor) {
        return visitor.visitTime(this);
    }
}
Time[Symbol.toStringTag] = ((proto) => {
    proto.ArrayType = Uint32Array;
    return proto[Symbol.toStringTag] = 'Time';
})(Time.prototype);
exports.Time = Time;
class Timestamp extends DataType {
    constructor(unit, timezone) {
        super(Type.Timestamp);
        this.unit = unit;
        this.timezone = timezone;
    }
    toString() { return `Timestamp<${exports.TimeUnit[this.unit]}${this.timezone ? `, ${this.timezone}` : ``}>`; }
    acceptTypeVisitor(visitor) {
        return visitor.visitTimestamp(this);
    }
}
Timestamp[Symbol.toStringTag] = ((proto) => {
    proto.ArrayType = Int32Array;
    return proto[Symbol.toStringTag] = 'Timestamp';
})(Timestamp.prototype);
exports.Timestamp = Timestamp;
class Interval extends DataType {
    constructor(unit) {
        super(Type.Interval);
        this.unit = unit;
    }
    toString() { return `Interval<${exports.IntervalUnit[this.unit]}>`; }
    acceptTypeVisitor(visitor) {
        return visitor.visitInterval(this);
    }
}
Interval[Symbol.toStringTag] = ((proto) => {
    proto.ArrayType = Int32Array;
    return proto[Symbol.toStringTag] = 'Interval';
})(Interval.prototype);
exports.Interval = Interval;
class List extends DataType {
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
exports.List = List;
class Struct extends DataType {
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
exports.Struct = Struct;
class Union extends DataType {
    constructor(mode, typeIds, children) {
        super((mode === exports.UnionMode.Sparse ? Type.SparseUnion : Type.DenseUnion), children);
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
exports.Union = Union;
class DenseUnion extends Union {
    constructor(typeIds, children) {
        super(exports.UnionMode.Dense, typeIds, children);
    }
}
DenseUnion[Symbol.toStringTag] = ((proto) => {
    return proto[Symbol.toStringTag] = 'DenseUnion';
})(DenseUnion.prototype);
exports.DenseUnion = DenseUnion;
class SparseUnion extends Union {
    constructor(typeIds, children) {
        super(exports.UnionMode.Sparse, typeIds, children);
    }
}
SparseUnion[Symbol.toStringTag] = ((proto) => {
    return proto[Symbol.toStringTag] = 'SparseUnion';
})(SparseUnion.prototype);
exports.SparseUnion = SparseUnion;
class FixedSizeBinary extends DataType {
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
exports.FixedSizeBinary = FixedSizeBinary;
class FixedSizeList extends DataType {
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
exports.FixedSizeList = FixedSizeList;
class Map_ extends DataType {
    constructor(keysSorted, children) {
        super(Type.Map, children);
        this.keysSorted = keysSorted;
        this.children = children;
    }
    toString() { return `Map<${this.children.join(`, `)}>`; }
    acceptTypeVisitor(visitor) { return visitor.visitMap(this); }
}
Map_[Symbol.toStringTag] = ((proto) => {
    return proto[Symbol.toStringTag] = 'Map';
})(Map_.prototype);
exports.Map_ = Map_;
class Dictionary extends DataType {
    constructor(dictionary, indicies, id, isOrdered) {
        super(Type.Dictionary);
        this.indicies = indicies;
        this.dictionary = dictionary;
        this.isOrdered = isOrdered || false;
        this.id = id == null ? metadata_1.DictionaryBatch.getId() : typeof id === 'number' ? id : id.low;
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
exports.Dictionary = Dictionary;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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SSxDQUFDLENBQUM7SUFDekMsQ0FBQzs7QUFDZ0IsV0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQWlCLEVBQUUsRUFBRTtJQUMzRCxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxZQUFZLENBQUM7QUFDcEQsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBbkI3QixnQ0FvQkMiLCJmaWxlIjoidHlwZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgKiBhcyBTY2hlbWFfIGZyb20gJy4vZmIvU2NoZW1hJztcbmltcG9ydCAqIGFzIE1lc3NhZ2VfIGZyb20gJy4vZmIvTWVzc2FnZSc7XG5pbXBvcnQgeyBWZWN0b3IsIFZpZXcgfSBmcm9tICcuL3ZlY3Rvcic7XG5pbXBvcnQgeyBmbGF0YnVmZmVycyB9IGZyb20gJ2ZsYXRidWZmZXJzJztcbmltcG9ydCB7IERpY3Rpb25hcnlCYXRjaCB9IGZyb20gJy4vaXBjL21ldGFkYXRhJztcbmltcG9ydCB7IFR5cGVWaXNpdG9yLCBWaXNpdG9yTm9kZSB9IGZyb20gJy4vdmlzaXRvcic7XG5cbmV4cG9ydCBpbXBvcnQgTG9uZyA9IGZsYXRidWZmZXJzLkxvbmc7XG5leHBvcnQgaW1wb3J0IEFycm93VHlwZSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlR5cGU7XG5leHBvcnQgaW1wb3J0IERhdGVVbml0ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuRGF0ZVVuaXQ7XG5leHBvcnQgaW1wb3J0IFRpbWVVbml0ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVGltZVVuaXQ7XG5leHBvcnQgaW1wb3J0IFByZWNpc2lvbiA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlByZWNpc2lvbjtcbmV4cG9ydCBpbXBvcnQgVW5pb25Nb2RlID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVW5pb25Nb2RlO1xuZXhwb3J0IGltcG9ydCBWZWN0b3JUeXBlID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVmVjdG9yVHlwZTtcbmV4cG9ydCBpbXBvcnQgSW50ZXJ2YWxVbml0ID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuSW50ZXJ2YWxVbml0O1xuZXhwb3J0IGltcG9ydCBNZXNzYWdlSGVhZGVyID0gTWVzc2FnZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk1lc3NhZ2VIZWFkZXI7XG5leHBvcnQgaW1wb3J0IE1ldGFkYXRhVmVyc2lvbiA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk1ldGFkYXRhVmVyc2lvbjtcblxuZXhwb3J0IGNsYXNzIFNjaGVtYSB7XG4gICAgcHVibGljIHN0YXRpYyBmcm9tKHZlY3RvcnM6IFZlY3RvcltdKSB7XG4gICAgICAgIHJldHVybiBuZXcgU2NoZW1hKHZlY3RvcnMubWFwKCh2LCBpKSA9PiBuZXcgRmllbGQoJycgKyBpLCB2LnR5cGUpKSk7XG4gICAgfVxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBwcm90ZWN0ZWQgX2JvZHlMZW5ndGg6IG51bWJlcjtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHJvdGVjdGVkIF9oZWFkZXJUeXBlOiBNZXNzYWdlSGVhZGVyO1xuICAgIHB1YmxpYyByZWFkb25seSBmaWVsZHM6IEZpZWxkW107XG4gICAgcHVibGljIHJlYWRvbmx5IHZlcnNpb246IE1ldGFkYXRhVmVyc2lvbjtcbiAgICBwdWJsaWMgcmVhZG9ubHkgbWV0YWRhdGE/OiBNYXA8c3RyaW5nLCBzdHJpbmc+O1xuICAgIHB1YmxpYyByZWFkb25seSBkaWN0aW9uYXJpZXM6IE1hcDxudW1iZXIsIEZpZWxkPERpY3Rpb25hcnk+PjtcbiAgICBjb25zdHJ1Y3RvcihmaWVsZHM6IEZpZWxkW10sXG4gICAgICAgICAgICAgICAgbWV0YWRhdGE/OiBNYXA8c3RyaW5nLCBzdHJpbmc+LFxuICAgICAgICAgICAgICAgIHZlcnNpb246IE1ldGFkYXRhVmVyc2lvbiA9IE1ldGFkYXRhVmVyc2lvbi5WNCxcbiAgICAgICAgICAgICAgICBkaWN0aW9uYXJpZXM6IE1hcDxudW1iZXIsIEZpZWxkPERpY3Rpb25hcnk+PiA9IG5ldyBNYXAoKSkge1xuICAgICAgICB0aGlzLmZpZWxkcyA9IGZpZWxkcztcbiAgICAgICAgdGhpcy52ZXJzaW9uID0gdmVyc2lvbjtcbiAgICAgICAgdGhpcy5tZXRhZGF0YSA9IG1ldGFkYXRhO1xuICAgICAgICB0aGlzLmRpY3Rpb25hcmllcyA9IGRpY3Rpb25hcmllcztcbiAgICB9XG4gICAgcHVibGljIGdldCBib2R5TGVuZ3RoKCkgeyByZXR1cm4gdGhpcy5fYm9keUxlbmd0aDsgfVxuICAgIHB1YmxpYyBnZXQgaGVhZGVyVHlwZSgpIHsgcmV0dXJuIHRoaXMuX2hlYWRlclR5cGU7IH1cbiAgICBwdWJsaWMgc2VsZWN0KC4uLmZpZWxkTmFtZXM6IHN0cmluZ1tdKTogU2NoZW1hIHtcbiAgICAgICAgY29uc3QgbmFtZXNUb0tlZXAgPSBmaWVsZE5hbWVzLnJlZHVjZSgoeHMsIHgpID0+ICh4c1t4XSA9IHRydWUpICYmIHhzLCBPYmplY3QuY3JlYXRlKG51bGwpKTtcbiAgICAgICAgY29uc3QgbmV3RGljdEZpZWxkcyA9IG5ldyBNYXAoKSwgbmV3RmllbGRzID0gdGhpcy5maWVsZHMuZmlsdGVyKChmKSA9PiBuYW1lc1RvS2VlcFtmLm5hbWVdKTtcbiAgICAgICAgdGhpcy5kaWN0aW9uYXJpZXMuZm9yRWFjaCgoZiwgZGljdElkKSA9PiAobmFtZXNUb0tlZXBbZi5uYW1lXSkgJiYgbmV3RGljdEZpZWxkcy5zZXQoZGljdElkLCBmKSk7XG4gICAgICAgIHJldHVybiBuZXcgU2NoZW1hKG5ld0ZpZWxkcywgdGhpcy5tZXRhZGF0YSwgdGhpcy52ZXJzaW9uLCBuZXdEaWN0RmllbGRzKTtcbiAgICB9XG4gICAgcHVibGljIHN0YXRpYyBbU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICgocHJvdG90eXBlOiBTY2hlbWEpID0+IHtcbiAgICAgICAgcHJvdG90eXBlLl9ib2R5TGVuZ3RoID0gMDtcbiAgICAgICAgcHJvdG90eXBlLl9oZWFkZXJUeXBlID0gTWVzc2FnZUhlYWRlci5TY2hlbWE7XG4gICAgICAgIHJldHVybiAnU2NoZW1hJztcbiAgICB9KShTY2hlbWEucHJvdG90eXBlKTtcbn1cblxuZXhwb3J0IGNsYXNzIEZpZWxkPFQgZXh0ZW5kcyBEYXRhVHlwZSA9IERhdGFUeXBlPiB7XG4gICAgcHVibGljIHJlYWRvbmx5IHR5cGU6IFQ7XG4gICAgcHVibGljIHJlYWRvbmx5IG5hbWU6IHN0cmluZztcbiAgICBwdWJsaWMgcmVhZG9ubHkgbnVsbGFibGU6IGJvb2xlYW47XG4gICAgcHVibGljIHJlYWRvbmx5IG1ldGFkYXRhPzogTWFwPHN0cmluZywgc3RyaW5nPiB8IG51bGw7XG4gICAgY29uc3RydWN0b3IobmFtZTogc3RyaW5nLCB0eXBlOiBULCBudWxsYWJsZSA9IGZhbHNlLCBtZXRhZGF0YT86IE1hcDxzdHJpbmcsIHN0cmluZz4gfCBudWxsKSB7XG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgICAgIHRoaXMubnVsbGFibGUgPSBudWxsYWJsZTtcbiAgICAgICAgdGhpcy5tZXRhZGF0YSA9IG1ldGFkYXRhO1xuICAgIH1cbiAgICBwdWJsaWMgdG9TdHJpbmcoKSB7IHJldHVybiBgJHt0aGlzLm5hbWV9OiAke3RoaXMudHlwZX1gOyB9XG4gICAgcHVibGljIGdldCB0eXBlSWQoKTogVFsnVFR5cGUnXSB7IHJldHVybiB0aGlzLnR5cGUuVFR5cGU7IH1cbiAgICBwdWJsaWMgZ2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCk6IHN0cmluZyB7IHJldHVybiAnRmllbGQnOyB9XG4gICAgcHVibGljIGdldCBpbmRpY2llcygpOiBUIHwgSW50PGFueT4ge1xuICAgICAgICByZXR1cm4gRGF0YVR5cGUuaXNEaWN0aW9uYXJ5KHRoaXMudHlwZSkgPyB0aGlzLnR5cGUuaW5kaWNpZXMgOiB0aGlzLnR5cGU7XG4gICAgfVxufVxuXG5leHBvcnQgdHlwZSBUaW1lQml0V2lkdGggPSAzMiB8IDY0O1xuZXhwb3J0IHR5cGUgSW50Qml0V2lkdGggPSA4IHwgMTYgfCAzMiB8IDY0O1xuXG5leHBvcnQgdHlwZSBOdW1lcmljVHlwZSA9IEludCB8IEZsb2F0IHwgRGF0ZV8gfCBUaW1lIHwgSW50ZXJ2YWwgfCBUaW1lc3RhbXA7XG5leHBvcnQgdHlwZSBGaXhlZFNpemVUeXBlID0gSW50NjQgfCAgVWludDY0IHwgRGVjaW1hbCB8IEZpeGVkU2l6ZUJpbmFyeTtcbmV4cG9ydCB0eXBlIFByaW1pdGl2ZVR5cGUgPSBOdW1lcmljVHlwZSB8IEZpeGVkU2l6ZVR5cGU7XG5cbmV4cG9ydCB0eXBlIEZsYXRMaXN0VHlwZSA9IFV0ZjggfCBCaW5hcnk7IC8vIDwtLSB0aGVzZSB0eXBlcyBoYXZlIGBvZmZzZXRgLCBgZGF0YWAsIGFuZCBgdmFsaWRpdHlgIGJ1ZmZlcnNcbmV4cG9ydCB0eXBlIEZsYXRUeXBlID0gQm9vbCB8IFByaW1pdGl2ZVR5cGUgfCBGbGF0TGlzdFR5cGU7IC8vIDwtLSB0aGVzZSB0eXBlcyBoYXZlIGBkYXRhYCBhbmQgYHZhbGlkaXR5YCBidWZmZXJzXG5leHBvcnQgdHlwZSBMaXN0VHlwZSA9IExpc3Q8YW55PiB8IEZpeGVkU2l6ZUxpc3Q8YW55PjsgLy8gPC0tIHRoZXNlIHR5cGVzIGhhdmUgYG9mZnNldGAgYW5kIGB2YWxpZGl0eWAgYnVmZmVyc1xuZXhwb3J0IHR5cGUgTmVzdGVkVHlwZSA9IE1hcF8gfCBTdHJ1Y3QgfCBMaXN0PGFueT4gfCBGaXhlZFNpemVMaXN0PGFueT4gfCBVbmlvbjxhbnk+OyAvLyA8LS0gdGhlc2UgdHlwZXMgaGF2ZSBgdmFsaWRpdHlgIGJ1ZmZlciBhbmQgbmVzdGVkIGNoaWxkRGF0YVxuXG4vKipcbiAqICpcbiAqIE1haW4gZGF0YSB0eXBlIGVudW1lcmF0aW9uOlxuICogKlxuICogRGF0YSB0eXBlcyBpbiB0aGlzIGxpYnJhcnkgYXJlIGFsbCAqbG9naWNhbCouIFRoZXkgY2FuIGJlIGV4cHJlc3NlZCBhc1xuICogZWl0aGVyIGEgcHJpbWl0aXZlIHBoeXNpY2FsIHR5cGUgKGJ5dGVzIG9yIGJpdHMgb2Ygc29tZSBmaXhlZCBzaXplKSwgYVxuICogbmVzdGVkIHR5cGUgY29uc2lzdGluZyBvZiBvdGhlciBkYXRhIHR5cGVzLCBvciBhbm90aGVyIGRhdGEgdHlwZSAoZS5nLiBhXG4gKiB0aW1lc3RhbXAgZW5jb2RlZCBhcyBhbiBpbnQ2NClcbiAqL1xuIGV4cG9ydCBlbnVtIFR5cGUge1xuICAgIE5PTkUgICAgICAgICAgICA9ICAwLCAgLy8gVGhlIGRlZmF1bHQgcGxhY2Vob2xkZXIgdHlwZVxuICAgIE51bGwgICAgICAgICAgICA9ICAxLCAgLy8gQSBOVUxMIHR5cGUgaGF2aW5nIG5vIHBoeXNpY2FsIHN0b3JhZ2VcbiAgICBJbnQgICAgICAgICAgICAgPSAgMiwgIC8vIFNpZ25lZCBvciB1bnNpZ25lZCA4LCAxNiwgMzIsIG9yIDY0LWJpdCBsaXR0bGUtZW5kaWFuIGludGVnZXJcbiAgICBGbG9hdCAgICAgICAgICAgPSAgMywgIC8vIDIsIDQsIG9yIDgtYnl0ZSBmbG9hdGluZyBwb2ludCB2YWx1ZVxuICAgIEJpbmFyeSAgICAgICAgICA9ICA0LCAgLy8gVmFyaWFibGUtbGVuZ3RoIGJ5dGVzIChubyBndWFyYW50ZWUgb2YgVVRGOC1uZXNzKVxuICAgIFV0ZjggICAgICAgICAgICA9ICA1LCAgLy8gVVRGOCB2YXJpYWJsZS1sZW5ndGggc3RyaW5nIGFzIExpc3Q8Q2hhcj5cbiAgICBCb29sICAgICAgICAgICAgPSAgNiwgIC8vIEJvb2xlYW4gYXMgMSBiaXQsIExTQiBiaXQtcGFja2VkIG9yZGVyaW5nXG4gICAgRGVjaW1hbCAgICAgICAgID0gIDcsICAvLyBQcmVjaXNpb24tYW5kLXNjYWxlLWJhc2VkIGRlY2ltYWwgdHlwZS4gU3RvcmFnZSB0eXBlIGRlcGVuZHMgb24gdGhlIHBhcmFtZXRlcnMuXG4gICAgRGF0ZSAgICAgICAgICAgID0gIDgsICAvLyBpbnQzMl90IGRheXMgb3IgaW50NjRfdCBtaWxsaXNlY29uZHMgc2luY2UgdGhlIFVOSVggZXBvY2hcbiAgICBUaW1lICAgICAgICAgICAgPSAgOSwgIC8vIFRpbWUgYXMgc2lnbmVkIDMyIG9yIDY0LWJpdCBpbnRlZ2VyLCByZXByZXNlbnRpbmcgZWl0aGVyIHNlY29uZHMsIG1pbGxpc2Vjb25kcywgbWljcm9zZWNvbmRzLCBvciBuYW5vc2Vjb25kcyBzaW5jZSBtaWRuaWdodCBzaW5jZSBtaWRuaWdodFxuICAgIFRpbWVzdGFtcCAgICAgICA9IDEwLCAgLy8gRXhhY3QgdGltZXN0YW1wIGVuY29kZWQgd2l0aCBpbnQ2NCBzaW5jZSBVTklYIGVwb2NoIChEZWZhdWx0IHVuaXQgbWlsbGlzZWNvbmQpXG4gICAgSW50ZXJ2YWwgICAgICAgID0gMTEsICAvLyBZRUFSX01PTlRIIG9yIERBWV9USU1FIGludGVydmFsIGluIFNRTCBzdHlsZVxuICAgIExpc3QgICAgICAgICAgICA9IDEyLCAgLy8gQSBsaXN0IG9mIHNvbWUgbG9naWNhbCBkYXRhIHR5cGVcbiAgICBTdHJ1Y3QgICAgICAgICAgPSAxMywgIC8vIFN0cnVjdCBvZiBsb2dpY2FsIHR5cGVzXG4gICAgVW5pb24gICAgICAgICAgID0gMTQsICAvLyBVbmlvbiBvZiBsb2dpY2FsIHR5cGVzXG4gICAgRml4ZWRTaXplQmluYXJ5ID0gMTUsICAvLyBGaXhlZC1zaXplIGJpbmFyeS4gRWFjaCB2YWx1ZSBvY2N1cGllcyB0aGUgc2FtZSBudW1iZXIgb2YgYnl0ZXNcbiAgICBGaXhlZFNpemVMaXN0ICAgPSAxNiwgIC8vIEZpeGVkLXNpemUgbGlzdC4gRWFjaCB2YWx1ZSBvY2N1cGllcyB0aGUgc2FtZSBudW1iZXIgb2YgYnl0ZXNcbiAgICBNYXAgICAgICAgICAgICAgPSAxNywgIC8vIE1hcCBvZiBuYW1lZCBsb2dpY2FsIHR5cGVzXG4gICAgRGljdGlvbmFyeSAgICAgID0gJ0RpY3Rpb25hcnknLCAgLy8gRGljdGlvbmFyeSBha2EgQ2F0ZWdvcnkgdHlwZVxuICAgIERlbnNlVW5pb24gICAgICA9ICdEZW5zZVVuaW9uJywgIC8vIERlbnNlIFVuaW9uIG9mIGxvZ2ljYWwgdHlwZXNcbiAgICBTcGFyc2VVbmlvbiAgICAgPSAnU3BhcnNlVW5pb24nLCAgLy8gU3BhcnNlIFVuaW9uIG9mIGxvZ2ljYWwgdHlwZXNcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEYXRhVHlwZTxUVHlwZSBleHRlbmRzIFR5cGUgPSBhbnk+IHtcbiAgICByZWFkb25seSBUVHlwZTogVFR5cGU7XG4gICAgcmVhZG9ubHkgVEFycmF5OiBhbnk7XG4gICAgcmVhZG9ubHkgVFZhbHVlOiBhbnk7XG4gICAgcmVhZG9ubHkgQXJyYXlUeXBlOiBhbnk7XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBEYXRhVHlwZTxUVHlwZSBleHRlbmRzIFR5cGUgPSBhbnk+IGltcGxlbWVudHMgUGFydGlhbDxWaXNpdG9yTm9kZT4ge1xuXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyBbU3ltYm9sLnRvU3RyaW5nVGFnXTogc3RyaW5nO1xuXG4gICAgc3RhdGljICAgICAgICAgICAgaXNOdWxsICh4OiBEYXRhVHlwZSk6IHggaXMgTnVsbCAgICAgICAgICAgIHsgcmV0dXJuIHguVFR5cGUgPT09IFR5cGUuTnVsbDsgICAgICAgICAgICB9XG4gICAgc3RhdGljICAgICAgICAgICAgIGlzSW50ICh4OiBEYXRhVHlwZSk6IHggaXMgSW50ICAgICAgICAgICAgIHsgcmV0dXJuIHguVFR5cGUgPT09IFR5cGUuSW50OyAgICAgICAgICAgICB9XG4gICAgc3RhdGljICAgICAgICAgICBpc0Zsb2F0ICh4OiBEYXRhVHlwZSk6IHggaXMgRmxvYXQgICAgICAgICAgIHsgcmV0dXJuIHguVFR5cGUgPT09IFR5cGUuRmxvYXQ7ICAgICAgICAgICB9XG4gICAgc3RhdGljICAgICAgICAgIGlzQmluYXJ5ICh4OiBEYXRhVHlwZSk6IHggaXMgQmluYXJ5ICAgICAgICAgIHsgcmV0dXJuIHguVFR5cGUgPT09IFR5cGUuQmluYXJ5OyAgICAgICAgICB9XG4gICAgc3RhdGljICAgICAgICAgICAgaXNVdGY4ICh4OiBEYXRhVHlwZSk6IHggaXMgVXRmOCAgICAgICAgICAgIHsgcmV0dXJuIHguVFR5cGUgPT09IFR5cGUuVXRmODsgICAgICAgICAgICB9XG4gICAgc3RhdGljICAgICAgICAgICAgaXNCb29sICh4OiBEYXRhVHlwZSk6IHggaXMgQm9vbCAgICAgICAgICAgIHsgcmV0dXJuIHguVFR5cGUgPT09IFR5cGUuQm9vbDsgICAgICAgICAgICB9XG4gICAgc3RhdGljICAgICAgICAgaXNEZWNpbWFsICh4OiBEYXRhVHlwZSk6IHggaXMgRGVjaW1hbCAgICAgICAgIHsgcmV0dXJuIHguVFR5cGUgPT09IFR5cGUuRGVjaW1hbDsgICAgICAgICB9XG4gICAgc3RhdGljICAgICAgICAgICAgaXNEYXRlICh4OiBEYXRhVHlwZSk6IHggaXMgRGF0ZV8gICAgICAgICAgIHsgcmV0dXJuIHguVFR5cGUgPT09IFR5cGUuRGF0ZTsgICAgICAgICAgICB9XG4gICAgc3RhdGljICAgICAgICAgICAgaXNUaW1lICh4OiBEYXRhVHlwZSk6IHggaXMgVGltZSAgICAgICAgICAgIHsgcmV0dXJuIHguVFR5cGUgPT09IFR5cGUuVGltZTsgICAgICAgICAgICB9XG4gICAgc3RhdGljICAgICAgIGlzVGltZXN0YW1wICh4OiBEYXRhVHlwZSk6IHggaXMgVGltZXN0YW1wICAgICAgIHsgcmV0dXJuIHguVFR5cGUgPT09IFR5cGUuVGltZXN0YW1wOyAgICAgICB9XG4gICAgc3RhdGljICAgICAgICBpc0ludGVydmFsICh4OiBEYXRhVHlwZSk6IHggaXMgSW50ZXJ2YWwgICAgICAgIHsgcmV0dXJuIHguVFR5cGUgPT09IFR5cGUuSW50ZXJ2YWw7ICAgICAgICB9XG4gICAgc3RhdGljICAgICAgICAgICAgaXNMaXN0ICh4OiBEYXRhVHlwZSk6IHggaXMgTGlzdCAgICAgICAgICAgIHsgcmV0dXJuIHguVFR5cGUgPT09IFR5cGUuTGlzdDsgICAgICAgICAgICB9XG4gICAgc3RhdGljICAgICAgICAgIGlzU3RydWN0ICh4OiBEYXRhVHlwZSk6IHggaXMgU3RydWN0ICAgICAgICAgIHsgcmV0dXJuIHguVFR5cGUgPT09IFR5cGUuU3RydWN0OyAgICAgICAgICB9XG4gICAgc3RhdGljICAgICAgICAgICBpc1VuaW9uICh4OiBEYXRhVHlwZSk6IHggaXMgVW5pb24gICAgICAgICAgIHsgcmV0dXJuIHguVFR5cGUgPT09IFR5cGUuVW5pb247ICAgICAgICAgICB9XG4gICAgc3RhdGljICAgICAgaXNEZW5zZVVuaW9uICh4OiBEYXRhVHlwZSk6IHggaXMgRGVuc2VVbmlvbiAgICAgIHsgcmV0dXJuIHguVFR5cGUgPT09IFR5cGUuRGVuc2VVbmlvbjsgICAgICB9XG4gICAgc3RhdGljICAgICBpc1NwYXJzZVVuaW9uICh4OiBEYXRhVHlwZSk6IHggaXMgU3BhcnNlVW5pb24gICAgIHsgcmV0dXJuIHguVFR5cGUgPT09IFR5cGUuU3BhcnNlVW5pb247ICAgICB9XG4gICAgc3RhdGljIGlzRml4ZWRTaXplQmluYXJ5ICh4OiBEYXRhVHlwZSk6IHggaXMgRml4ZWRTaXplQmluYXJ5IHsgcmV0dXJuIHguVFR5cGUgPT09IFR5cGUuRml4ZWRTaXplQmluYXJ5OyB9XG4gICAgc3RhdGljICAgaXNGaXhlZFNpemVMaXN0ICh4OiBEYXRhVHlwZSk6IHggaXMgRml4ZWRTaXplTGlzdCAgIHsgcmV0dXJuIHguVFR5cGUgPT09IFR5cGUuRml4ZWRTaXplTGlzdDsgICB9XG4gICAgc3RhdGljICAgICAgICAgICAgIGlzTWFwICh4OiBEYXRhVHlwZSk6IHggaXMgTWFwXyAgICAgICAgICAgIHsgcmV0dXJuIHguVFR5cGUgPT09IFR5cGUuTWFwOyAgICAgICAgICAgICB9XG4gICAgc3RhdGljICAgICAgaXNEaWN0aW9uYXJ5ICh4OiBEYXRhVHlwZSk6IHggaXMgRGljdGlvbmFyeSAgICAgIHsgcmV0dXJuIHguVFR5cGUgPT09IFR5cGUuRGljdGlvbmFyeTsgICAgICB9XG5cbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgVFR5cGU6IFRUeXBlLFxuICAgICAgICAgICAgICAgIHB1YmxpYyByZWFkb25seSBjaGlsZHJlbj86IEZpZWxkW10pIHt9XG5cbiAgICBhY2NlcHRUeXBlVmlzaXRvcih2aXNpdG9yOiBUeXBlVmlzaXRvcik6IGFueSB7XG4gICAgICAgIHN3aXRjaCAodGhpcy5UVHlwZSkge1xuICAgICAgICAgICAgY2FzZSBUeXBlLk51bGw6ICAgICAgICAgICAgcmV0dXJuIERhdGFUeXBlLmlzTnVsbCh0aGlzKSAgICAgICAgICAgICYmIHZpc2l0b3IudmlzaXROdWxsKHRoaXMpICAgICAgICAgICAgfHwgbnVsbDtcbiAgICAgICAgICAgIGNhc2UgVHlwZS5JbnQ6ICAgICAgICAgICAgIHJldHVybiBEYXRhVHlwZS5pc0ludCh0aGlzKSAgICAgICAgICAgICAmJiB2aXNpdG9yLnZpc2l0SW50KHRoaXMpICAgICAgICAgICAgIHx8IG51bGw7XG4gICAgICAgICAgICBjYXNlIFR5cGUuRmxvYXQ6ICAgICAgICAgICByZXR1cm4gRGF0YVR5cGUuaXNGbG9hdCh0aGlzKSAgICAgICAgICAgJiYgdmlzaXRvci52aXNpdEZsb2F0KHRoaXMpICAgICAgICAgICB8fCBudWxsO1xuICAgICAgICAgICAgY2FzZSBUeXBlLkJpbmFyeTogICAgICAgICAgcmV0dXJuIERhdGFUeXBlLmlzQmluYXJ5KHRoaXMpICAgICAgICAgICYmIHZpc2l0b3IudmlzaXRCaW5hcnkodGhpcykgICAgICAgICAgfHwgbnVsbDtcbiAgICAgICAgICAgIGNhc2UgVHlwZS5VdGY4OiAgICAgICAgICAgIHJldHVybiBEYXRhVHlwZS5pc1V0ZjgodGhpcykgICAgICAgICAgICAmJiB2aXNpdG9yLnZpc2l0VXRmOCh0aGlzKSAgICAgICAgICAgIHx8IG51bGw7XG4gICAgICAgICAgICBjYXNlIFR5cGUuQm9vbDogICAgICAgICAgICByZXR1cm4gRGF0YVR5cGUuaXNCb29sKHRoaXMpICAgICAgICAgICAgJiYgdmlzaXRvci52aXNpdEJvb2wodGhpcykgICAgICAgICAgICB8fCBudWxsO1xuICAgICAgICAgICAgY2FzZSBUeXBlLkRlY2ltYWw6ICAgICAgICAgcmV0dXJuIERhdGFUeXBlLmlzRGVjaW1hbCh0aGlzKSAgICAgICAgICYmIHZpc2l0b3IudmlzaXREZWNpbWFsKHRoaXMpICAgICAgICAgfHwgbnVsbDtcbiAgICAgICAgICAgIGNhc2UgVHlwZS5EYXRlOiAgICAgICAgICAgIHJldHVybiBEYXRhVHlwZS5pc0RhdGUodGhpcykgICAgICAgICAgICAmJiB2aXNpdG9yLnZpc2l0RGF0ZSh0aGlzKSAgICAgICAgICAgIHx8IG51bGw7XG4gICAgICAgICAgICBjYXNlIFR5cGUuVGltZTogICAgICAgICAgICByZXR1cm4gRGF0YVR5cGUuaXNUaW1lKHRoaXMpICAgICAgICAgICAgJiYgdmlzaXRvci52aXNpdFRpbWUodGhpcykgICAgICAgICAgICB8fCBudWxsO1xuICAgICAgICAgICAgY2FzZSBUeXBlLlRpbWVzdGFtcDogICAgICAgcmV0dXJuIERhdGFUeXBlLmlzVGltZXN0YW1wKHRoaXMpICAgICAgICYmIHZpc2l0b3IudmlzaXRUaW1lc3RhbXAodGhpcykgICAgICAgfHwgbnVsbDtcbiAgICAgICAgICAgIGNhc2UgVHlwZS5JbnRlcnZhbDogICAgICAgIHJldHVybiBEYXRhVHlwZS5pc0ludGVydmFsKHRoaXMpICAgICAgICAmJiB2aXNpdG9yLnZpc2l0SW50ZXJ2YWwodGhpcykgICAgICAgIHx8IG51bGw7XG4gICAgICAgICAgICBjYXNlIFR5cGUuTGlzdDogICAgICAgICAgICByZXR1cm4gRGF0YVR5cGUuaXNMaXN0KHRoaXMpICAgICAgICAgICAgJiYgdmlzaXRvci52aXNpdExpc3QodGhpcykgICAgICAgICAgICB8fCBudWxsO1xuICAgICAgICAgICAgY2FzZSBUeXBlLlN0cnVjdDogICAgICAgICAgcmV0dXJuIERhdGFUeXBlLmlzU3RydWN0KHRoaXMpICAgICAgICAgICYmIHZpc2l0b3IudmlzaXRTdHJ1Y3QodGhpcykgICAgICAgICAgfHwgbnVsbDtcbiAgICAgICAgICAgIGNhc2UgVHlwZS5VbmlvbjogICAgICAgICAgIHJldHVybiBEYXRhVHlwZS5pc1VuaW9uKHRoaXMpICAgICAgICAgICAmJiB2aXNpdG9yLnZpc2l0VW5pb24odGhpcykgICAgICAgICAgIHx8IG51bGw7XG4gICAgICAgICAgICBjYXNlIFR5cGUuRml4ZWRTaXplQmluYXJ5OiByZXR1cm4gRGF0YVR5cGUuaXNGaXhlZFNpemVCaW5hcnkodGhpcykgJiYgdmlzaXRvci52aXNpdEZpeGVkU2l6ZUJpbmFyeSh0aGlzKSB8fCBudWxsO1xuICAgICAgICAgICAgY2FzZSBUeXBlLkZpeGVkU2l6ZUxpc3Q6ICAgcmV0dXJuIERhdGFUeXBlLmlzRml4ZWRTaXplTGlzdCh0aGlzKSAgICYmIHZpc2l0b3IudmlzaXRGaXhlZFNpemVMaXN0KHRoaXMpICAgfHwgbnVsbDtcbiAgICAgICAgICAgIGNhc2UgVHlwZS5NYXA6ICAgICAgICAgICAgIHJldHVybiBEYXRhVHlwZS5pc01hcCh0aGlzKSAgICAgICAgICAgICAmJiB2aXNpdG9yLnZpc2l0TWFwKHRoaXMpICAgICAgICAgICAgIHx8IG51bGw7XG4gICAgICAgICAgICBjYXNlIFR5cGUuRGljdGlvbmFyeTogICAgICByZXR1cm4gRGF0YVR5cGUuaXNEaWN0aW9uYXJ5KHRoaXMpICAgICAgJiYgdmlzaXRvci52aXNpdERpY3Rpb25hcnkodGhpcykgICAgICB8fCBudWxsO1xuICAgICAgICAgICAgZGVmYXVsdDogcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcHJvdGVjdGVkIHN0YXRpYyBbU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICgocHJvdG86IERhdGFUeXBlKSA9PiB7XG4gICAgICAgICg8YW55PiBwcm90bykuQXJyYXlUeXBlID0gQXJyYXk7XG4gICAgICAgIHJldHVybiBwcm90b1tTeW1ib2wudG9TdHJpbmdUYWddID0gJ0RhdGFUeXBlJztcbiAgICB9KShEYXRhVHlwZS5wcm90b3R5cGUpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE51bGwgZXh0ZW5kcyBEYXRhVHlwZTxUeXBlLk51bGw+IHsgVEFycmF5OiB2b2lkOyBUVmFsdWU6IG51bGw7IH1cbmV4cG9ydCBjbGFzcyBOdWxsIGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5OdWxsPiB7XG4gICAgY29uc3RydWN0b3IoKSB7IHN1cGVyKFR5cGUuTnVsbCk7IH1cbiAgICBwdWJsaWMgdG9TdHJpbmcoKSB7IHJldHVybiBgTnVsbGA7IH1cbiAgICBwdWJsaWMgYWNjZXB0VHlwZVZpc2l0b3IodmlzaXRvcjogVHlwZVZpc2l0b3IpOiBhbnkge1xuICAgICAgICByZXR1cm4gdmlzaXRvci52aXNpdE51bGwodGhpcyk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBzdGF0aWMgW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAoKHByb3RvOiBOdWxsKSA9PiB7XG4gICAgICAgIHJldHVybiBwcm90b1tTeW1ib2wudG9TdHJpbmdUYWddID0gJ051bGwnO1xuICAgIH0pKE51bGwucHJvdG90eXBlKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbnQ8VFZhbHVlVHlwZSA9IGFueSwgVEFycmF5VHlwZSBleHRlbmRzIEludEFycmF5ID0gSW50QXJyYXk+IGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5JbnQ+IHsgVEFycmF5OiBUQXJyYXlUeXBlOyBUVmFsdWU6IFRWYWx1ZVR5cGU7IH1cbmV4cG9ydCBjbGFzcyBJbnQ8VFZhbHVlVHlwZSA9IGFueSwgVEFycmF5VHlwZSBleHRlbmRzIEludEFycmF5ID0gSW50QXJyYXk+IGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5JbnQ+IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgaXNTaWduZWQ6IGJvb2xlYW4sXG4gICAgICAgICAgICAgICAgcHVibGljIHJlYWRvbmx5IGJpdFdpZHRoOiBJbnRCaXRXaWR0aCkge1xuICAgICAgICBzdXBlcihUeXBlLkludCk7XG4gICAgfVxuICAgIHB1YmxpYyBnZXQgQXJyYXlUeXBlKCk6IFR5cGVkQXJyYXlDb25zdHJ1Y3RvcjxUQXJyYXlUeXBlPiB7XG4gICAgICAgIHN3aXRjaCAodGhpcy5iaXRXaWR0aCkge1xuICAgICAgICAgICAgY2FzZSAgODogcmV0dXJuICh0aGlzLmlzU2lnbmVkID8gSW50OEFycmF5IDogVWludDhBcnJheSkgYXMgYW55O1xuICAgICAgICAgICAgY2FzZSAxNjogcmV0dXJuICh0aGlzLmlzU2lnbmVkID8gSW50MTZBcnJheSA6IFVpbnQxNkFycmF5KSBhcyBhbnk7XG4gICAgICAgICAgICBjYXNlIDMyOiByZXR1cm4gKHRoaXMuaXNTaWduZWQgPyBJbnQzMkFycmF5IDogVWludDMyQXJyYXkpIGFzIGFueTtcbiAgICAgICAgICAgIGNhc2UgNjQ6IHJldHVybiAodGhpcy5pc1NpZ25lZCA/IEludDMyQXJyYXkgOiBVaW50MzJBcnJheSkgYXMgYW55O1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5yZWNvZ25pemVkICR7dGhpc1tTeW1ib2wudG9TdHJpbmdUYWddfSB0eXBlYCk7XG4gICAgfVxuICAgIHB1YmxpYyB0b1N0cmluZygpIHsgcmV0dXJuIGAke3RoaXMuaXNTaWduZWQgPyBgSWAgOiBgVWlgfW50JHt0aGlzLmJpdFdpZHRofWA7IH1cbiAgICBwdWJsaWMgYWNjZXB0VHlwZVZpc2l0b3IodmlzaXRvcjogVHlwZVZpc2l0b3IpOiBhbnkgeyByZXR1cm4gdmlzaXRvci52aXNpdEludCh0aGlzKTsgfVxuICAgIHByb3RlY3RlZCBzdGF0aWMgW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAoKHByb3RvOiBJbnQpID0+IHtcbiAgICAgICAgcmV0dXJuIHByb3RvW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAnSW50JztcbiAgICB9KShJbnQucHJvdG90eXBlKTtcbn1cblxuZXhwb3J0IGNsYXNzIEludDggZXh0ZW5kcyBJbnQ8bnVtYmVyLCBJbnQ4QXJyYXk+IHsgY29uc3RydWN0b3IoKSB7IHN1cGVyKHRydWUsIDgpOyB9IH1cbmV4cG9ydCBjbGFzcyBJbnQxNiBleHRlbmRzIEludDxudW1iZXIsIEludDE2QXJyYXk+IHsgY29uc3RydWN0b3IoKSB7IHN1cGVyKHRydWUsIDE2KTsgfSB9XG5leHBvcnQgY2xhc3MgSW50MzIgZXh0ZW5kcyBJbnQ8bnVtYmVyLCBJbnQzMkFycmF5PiB7IGNvbnN0cnVjdG9yKCkgeyBzdXBlcih0cnVlLCAzMik7IH0gfVxuZXhwb3J0IGNsYXNzIEludDY0IGV4dGVuZHMgSW50PEludDMyQXJyYXksIEludDMyQXJyYXk+IHsgY29uc3RydWN0b3IoKSB7IHN1cGVyKHRydWUsIDY0KTsgfSB9XG5leHBvcnQgY2xhc3MgVWludDggZXh0ZW5kcyBJbnQ8bnVtYmVyLCBVaW50OEFycmF5PiB7IGNvbnN0cnVjdG9yKCkgeyBzdXBlcihmYWxzZSwgOCk7IH0gfVxuZXhwb3J0IGNsYXNzIFVpbnQxNiBleHRlbmRzIEludDxudW1iZXIsIFVpbnQxNkFycmF5PiB7IGNvbnN0cnVjdG9yKCkgeyBzdXBlcihmYWxzZSwgMTYpOyB9IH1cbmV4cG9ydCBjbGFzcyBVaW50MzIgZXh0ZW5kcyBJbnQ8bnVtYmVyLCBVaW50MzJBcnJheT4geyBjb25zdHJ1Y3RvcigpIHsgc3VwZXIoZmFsc2UsIDMyKTsgfSB9XG5leHBvcnQgY2xhc3MgVWludDY0IGV4dGVuZHMgSW50PFVpbnQzMkFycmF5LCBVaW50MzJBcnJheT4geyBjb25zdHJ1Y3RvcigpIHsgc3VwZXIoZmFsc2UsIDY0KTsgfSB9XG5cbmV4cG9ydCBpbnRlcmZhY2UgRmxvYXQ8VEFycmF5VHlwZSBleHRlbmRzIEZsb2F0QXJyYXkgPSBGbG9hdEFycmF5PiBleHRlbmRzIERhdGFUeXBlPFR5cGUuRmxvYXQ+IHsgVEFycmF5OiBUQXJyYXlUeXBlOyBUVmFsdWU6IG51bWJlcjsgfVxuZXhwb3J0IGNsYXNzIEZsb2F0PFRBcnJheVR5cGUgZXh0ZW5kcyBGbG9hdEFycmF5ID0gRmxvYXRBcnJheT4gZXh0ZW5kcyBEYXRhVHlwZTxUeXBlLkZsb2F0PiB7XG4gICAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IHByZWNpc2lvbjogUHJlY2lzaW9uKSB7XG4gICAgICAgIHN1cGVyKFR5cGUuRmxvYXQpO1xuICAgIH1cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHVibGljIGdldCBBcnJheVR5cGUoKTogVHlwZWRBcnJheUNvbnN0cnVjdG9yPFRBcnJheVR5cGU+IHtcbiAgICAgICAgc3dpdGNoICh0aGlzLnByZWNpc2lvbikge1xuICAgICAgICAgICAgY2FzZSBQcmVjaXNpb24uSEFMRjogcmV0dXJuIFVpbnQxNkFycmF5IGFzIGFueTtcbiAgICAgICAgICAgIGNhc2UgUHJlY2lzaW9uLlNJTkdMRTogcmV0dXJuIEZsb2F0MzJBcnJheSBhcyBhbnk7XG4gICAgICAgICAgICBjYXNlIFByZWNpc2lvbi5ET1VCTEU6IHJldHVybiBGbG9hdDY0QXJyYXkgYXMgYW55O1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5yZWNvZ25pemVkICR7dGhpc1tTeW1ib2wudG9TdHJpbmdUYWddfSB0eXBlYCk7XG4gICAgfVxuICAgIHB1YmxpYyB0b1N0cmluZygpIHsgcmV0dXJuIGBGbG9hdCR7KHRoaXMucHJlY2lzaW9uIDw8IDUpIHx8IDE2fWA7IH1cbiAgICBwdWJsaWMgYWNjZXB0VHlwZVZpc2l0b3IodmlzaXRvcjogVHlwZVZpc2l0b3IpOiBhbnkgeyByZXR1cm4gdmlzaXRvci52aXNpdEZsb2F0KHRoaXMpOyB9XG4gICAgcHJvdGVjdGVkIHN0YXRpYyBbU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICgocHJvdG86IEZsb2F0KSA9PiB7XG4gICAgICAgIHJldHVybiBwcm90b1tTeW1ib2wudG9TdHJpbmdUYWddID0gJ0Zsb2F0JztcbiAgICB9KShGbG9hdC5wcm90b3R5cGUpO1xufVxuXG5leHBvcnQgY2xhc3MgRmxvYXQxNiBleHRlbmRzIEZsb2F0PFVpbnQxNkFycmF5PiB7IGNvbnN0cnVjdG9yKCkgeyBzdXBlcihQcmVjaXNpb24uSEFMRik7IH0gfVxuZXhwb3J0IGNsYXNzIEZsb2F0MzIgZXh0ZW5kcyBGbG9hdDxGbG9hdDMyQXJyYXk+IHsgY29uc3RydWN0b3IoKSB7IHN1cGVyKFByZWNpc2lvbi5TSU5HTEUpOyB9IH1cbmV4cG9ydCBjbGFzcyBGbG9hdDY0IGV4dGVuZHMgRmxvYXQ8RmxvYXQ2NEFycmF5PiB7IGNvbnN0cnVjdG9yKCkgeyBzdXBlcihQcmVjaXNpb24uRE9VQkxFKTsgfSB9XG5cbmV4cG9ydCBpbnRlcmZhY2UgQmluYXJ5IGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5CaW5hcnk+IHsgVEFycmF5OiBVaW50OEFycmF5OyBUVmFsdWU6IFVpbnQ4QXJyYXk7IH1cbmV4cG9ydCBjbGFzcyBCaW5hcnkgZXh0ZW5kcyBEYXRhVHlwZTxUeXBlLkJpbmFyeT4ge1xuICAgIGNvbnN0cnVjdG9yKCkgeyBzdXBlcihUeXBlLkJpbmFyeSk7IH1cbiAgICBwdWJsaWMgdG9TdHJpbmcoKSB7IHJldHVybiBgQmluYXJ5YDsgfVxuICAgIHB1YmxpYyBhY2NlcHRUeXBlVmlzaXRvcih2aXNpdG9yOiBUeXBlVmlzaXRvcik6IGFueSB7XG4gICAgICAgIHJldHVybiB2aXNpdG9yLnZpc2l0QmluYXJ5KHRoaXMpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgc3RhdGljIFtTeW1ib2wudG9TdHJpbmdUYWddID0gKChwcm90bzogQmluYXJ5KSA9PiB7XG4gICAgICAgICg8YW55PiBwcm90bykuQXJyYXlUeXBlID0gVWludDhBcnJheTtcbiAgICAgICAgcmV0dXJuIHByb3RvW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAnQmluYXJ5JztcbiAgICB9KShCaW5hcnkucHJvdG90eXBlKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBVdGY4IGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5VdGY4PiB7IFRBcnJheTogVWludDhBcnJheTsgVFZhbHVlOiBzdHJpbmc7IH1cbmV4cG9ydCBjbGFzcyBVdGY4IGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5VdGY4PiB7XG4gICAgY29uc3RydWN0b3IoKSB7IHN1cGVyKFR5cGUuVXRmOCk7IH1cbiAgICBwdWJsaWMgdG9TdHJpbmcoKSB7IHJldHVybiBgVXRmOGA7IH1cbiAgICBwdWJsaWMgYWNjZXB0VHlwZVZpc2l0b3IodmlzaXRvcjogVHlwZVZpc2l0b3IpOiBhbnkge1xuICAgICAgICByZXR1cm4gdmlzaXRvci52aXNpdFV0ZjgodGhpcyk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBzdGF0aWMgW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAoKHByb3RvOiBVdGY4KSA9PiB7XG4gICAgICAgICg8YW55PiBwcm90bykuQXJyYXlUeXBlID0gVWludDhBcnJheTtcbiAgICAgICAgcmV0dXJuIHByb3RvW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAnVXRmOCc7XG4gICAgfSkoVXRmOC5wcm90b3R5cGUpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEJvb2wgZXh0ZW5kcyBEYXRhVHlwZTxUeXBlLkJvb2w+IHsgVEFycmF5OiBVaW50OEFycmF5OyBUVmFsdWU6IGJvb2xlYW47IH1cbmV4cG9ydCBjbGFzcyBCb29sIGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5Cb29sPiB7XG4gICAgY29uc3RydWN0b3IoKSB7IHN1cGVyKFR5cGUuQm9vbCk7IH1cbiAgICBwdWJsaWMgdG9TdHJpbmcoKSB7IHJldHVybiBgQm9vbGA7IH1cbiAgICBwdWJsaWMgYWNjZXB0VHlwZVZpc2l0b3IodmlzaXRvcjogVHlwZVZpc2l0b3IpOiBhbnkge1xuICAgICAgICByZXR1cm4gdmlzaXRvci52aXNpdEJvb2wodGhpcyk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBzdGF0aWMgW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAoKHByb3RvOiBCb29sKSA9PiB7XG4gICAgICAgICg8YW55PiBwcm90bykuQXJyYXlUeXBlID0gVWludDhBcnJheTtcbiAgICAgICAgcmV0dXJuIHByb3RvW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAnQm9vbCc7XG4gICAgfSkoQm9vbC5wcm90b3R5cGUpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERlY2ltYWwgZXh0ZW5kcyBEYXRhVHlwZTxUeXBlLkRlY2ltYWw+IHsgVEFycmF5OiBVaW50MzJBcnJheTsgVFZhbHVlOiBVaW50MzJBcnJheTsgfVxuZXhwb3J0IGNsYXNzIERlY2ltYWwgZXh0ZW5kcyBEYXRhVHlwZTxUeXBlLkRlY2ltYWw+IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgc2NhbGU6IG51bWJlcixcbiAgICAgICAgICAgICAgICBwdWJsaWMgcmVhZG9ubHkgcHJlY2lzaW9uOiBudW1iZXIpIHtcbiAgICAgICAgc3VwZXIoVHlwZS5EZWNpbWFsKTtcbiAgICB9XG4gICAgcHVibGljIHRvU3RyaW5nKCkgeyByZXR1cm4gYERlY2ltYWxbJHt0aGlzLnByZWNpc2lvbn1lJHt0aGlzLnNjYWxlID4gMCA/IGArYCA6IGBgfSR7dGhpcy5zY2FsZX1dYDsgfVxuICAgIHB1YmxpYyBhY2NlcHRUeXBlVmlzaXRvcih2aXNpdG9yOiBUeXBlVmlzaXRvcik6IGFueSB7XG4gICAgICAgIHJldHVybiB2aXNpdG9yLnZpc2l0RGVjaW1hbCh0aGlzKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHN0YXRpYyBbU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICgocHJvdG86IERlY2ltYWwpID0+IHtcbiAgICAgICAgKDxhbnk+IHByb3RvKS5BcnJheVR5cGUgPSBVaW50MzJBcnJheTtcbiAgICAgICAgcmV0dXJuIHByb3RvW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAnRGVjaW1hbCc7XG4gICAgfSkoRGVjaW1hbC5wcm90b3R5cGUpO1xufVxuXG4vKiB0c2xpbnQ6ZGlzYWJsZTpjbGFzcy1uYW1lICovXG5leHBvcnQgaW50ZXJmYWNlIERhdGVfIGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5EYXRlPiB7IFRBcnJheTogSW50MzJBcnJheTsgVFZhbHVlOiBEYXRlOyB9XG5leHBvcnQgY2xhc3MgRGF0ZV8gZXh0ZW5kcyBEYXRhVHlwZTxUeXBlLkRhdGU+IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgdW5pdDogRGF0ZVVuaXQpIHsgc3VwZXIoVHlwZS5EYXRlKTsgfVxuICAgIHB1YmxpYyB0b1N0cmluZygpIHsgcmV0dXJuIGBEYXRlJHsodGhpcy51bml0ICsgMSkgKiAzMn08JHtEYXRlVW5pdFt0aGlzLnVuaXRdfT5gOyB9XG4gICAgcHVibGljIGFjY2VwdFR5cGVWaXNpdG9yKHZpc2l0b3I6IFR5cGVWaXNpdG9yKTogYW55IHtcbiAgICAgICAgcmV0dXJuIHZpc2l0b3IudmlzaXREYXRlKHRoaXMpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgc3RhdGljIFtTeW1ib2wudG9TdHJpbmdUYWddID0gKChwcm90bzogRGF0ZV8pID0+IHtcbiAgICAgICAgKDxhbnk+IHByb3RvKS5BcnJheVR5cGUgPSBJbnQzMkFycmF5O1xuICAgICAgICByZXR1cm4gcHJvdG9bU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICdEYXRlJztcbiAgICB9KShEYXRlXy5wcm90b3R5cGUpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRpbWUgZXh0ZW5kcyBEYXRhVHlwZTxUeXBlLlRpbWU+IHsgVEFycmF5OiBVaW50MzJBcnJheTsgVFZhbHVlOiBudW1iZXI7IH1cbmV4cG9ydCBjbGFzcyBUaW1lIGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5UaW1lPiB7XG4gICAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IHVuaXQ6IFRpbWVVbml0LFxuICAgICAgICAgICAgICAgIHB1YmxpYyByZWFkb25seSBiaXRXaWR0aDogVGltZUJpdFdpZHRoKSB7XG4gICAgICAgIHN1cGVyKFR5cGUuVGltZSk7XG4gICAgfVxuICAgIHB1YmxpYyB0b1N0cmluZygpIHsgcmV0dXJuIGBUaW1lJHt0aGlzLmJpdFdpZHRofTwke1RpbWVVbml0W3RoaXMudW5pdF19PmA7IH1cbiAgICBwdWJsaWMgYWNjZXB0VHlwZVZpc2l0b3IodmlzaXRvcjogVHlwZVZpc2l0b3IpOiBhbnkge1xuICAgICAgICByZXR1cm4gdmlzaXRvci52aXNpdFRpbWUodGhpcyk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBzdGF0aWMgW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAoKHByb3RvOiBUaW1lKSA9PiB7XG4gICAgICAgICg8YW55PiBwcm90bykuQXJyYXlUeXBlID0gVWludDMyQXJyYXk7XG4gICAgICAgIHJldHVybiBwcm90b1tTeW1ib2wudG9TdHJpbmdUYWddID0gJ1RpbWUnO1xuICAgIH0pKFRpbWUucHJvdG90eXBlKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUaW1lc3RhbXAgZXh0ZW5kcyBEYXRhVHlwZTxUeXBlLlRpbWVzdGFtcD4geyBUQXJyYXk6IEludDMyQXJyYXk7IFRWYWx1ZTogbnVtYmVyOyB9XG5leHBvcnQgY2xhc3MgVGltZXN0YW1wIGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5UaW1lc3RhbXA+IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgdW5pdDogVGltZVVuaXQsIHB1YmxpYyB0aW1lem9uZT86IHN0cmluZyB8IG51bGwpIHtcbiAgICAgICAgc3VwZXIoVHlwZS5UaW1lc3RhbXApO1xuICAgIH1cbiAgICBwdWJsaWMgdG9TdHJpbmcoKSB7IHJldHVybiBgVGltZXN0YW1wPCR7VGltZVVuaXRbdGhpcy51bml0XX0ke3RoaXMudGltZXpvbmUgPyBgLCAke3RoaXMudGltZXpvbmV9YCA6IGBgfT5gOyB9XG4gICAgcHVibGljIGFjY2VwdFR5cGVWaXNpdG9yKHZpc2l0b3I6IFR5cGVWaXNpdG9yKTogYW55IHtcbiAgICAgICAgcmV0dXJuIHZpc2l0b3IudmlzaXRUaW1lc3RhbXAodGhpcyk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBzdGF0aWMgW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAoKHByb3RvOiBUaW1lc3RhbXApID0+IHtcbiAgICAgICAgKDxhbnk+IHByb3RvKS5BcnJheVR5cGUgPSBJbnQzMkFycmF5O1xuICAgICAgICByZXR1cm4gcHJvdG9bU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICdUaW1lc3RhbXAnO1xuICAgIH0pKFRpbWVzdGFtcC5wcm90b3R5cGUpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEludGVydmFsIGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5JbnRlcnZhbD4geyBUQXJyYXk6IEludDMyQXJyYXk7IFRWYWx1ZTogSW50MzJBcnJheTsgfVxuZXhwb3J0IGNsYXNzIEludGVydmFsIGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5JbnRlcnZhbD4ge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyB1bml0OiBJbnRlcnZhbFVuaXQpIHtcbiAgICAgICAgc3VwZXIoVHlwZS5JbnRlcnZhbCk7XG4gICAgfVxuICAgIHB1YmxpYyB0b1N0cmluZygpIHsgcmV0dXJuIGBJbnRlcnZhbDwke0ludGVydmFsVW5pdFt0aGlzLnVuaXRdfT5gOyB9XG4gICAgcHVibGljIGFjY2VwdFR5cGVWaXNpdG9yKHZpc2l0b3I6IFR5cGVWaXNpdG9yKTogYW55IHtcbiAgICAgICAgcmV0dXJuIHZpc2l0b3IudmlzaXRJbnRlcnZhbCh0aGlzKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHN0YXRpYyBbU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICgocHJvdG86IEludGVydmFsKSA9PiB7XG4gICAgICAgICg8YW55PiBwcm90bykuQXJyYXlUeXBlID0gSW50MzJBcnJheTtcbiAgICAgICAgcmV0dXJuIHByb3RvW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAnSW50ZXJ2YWwnO1xuICAgIH0pKEludGVydmFsLnByb3RvdHlwZSk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGlzdDxUIGV4dGVuZHMgRGF0YVR5cGUgPSBhbnk+IGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5MaXN0PiAgeyBUQXJyYXk6IGFueTsgVFZhbHVlOiBWZWN0b3I8VD47IH1cbmV4cG9ydCBjbGFzcyBMaXN0PFQgZXh0ZW5kcyBEYXRhVHlwZSA9IGFueT4gZXh0ZW5kcyBEYXRhVHlwZTxUeXBlLkxpc3Q+IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgY2hpbGRyZW46IEZpZWxkW10pIHtcbiAgICAgICAgc3VwZXIoVHlwZS5MaXN0LCBjaGlsZHJlbik7XG4gICAgfVxuICAgIHB1YmxpYyB0b1N0cmluZygpIHsgcmV0dXJuIGBMaXN0PCR7dGhpcy52YWx1ZVR5cGV9PmA7IH1cbiAgICBwdWJsaWMgZ2V0IEFycmF5VHlwZSgpIHsgcmV0dXJuIHRoaXMudmFsdWVUeXBlLkFycmF5VHlwZTsgfVxuICAgIHB1YmxpYyBnZXQgdmFsdWVUeXBlKCkgeyByZXR1cm4gdGhpcy5jaGlsZHJlblswXS50eXBlIGFzIFQ7IH1cbiAgICBwdWJsaWMgZ2V0IHZhbHVlRmllbGQoKSB7IHJldHVybiB0aGlzLmNoaWxkcmVuWzBdIGFzIEZpZWxkPFQ+OyB9XG4gICAgcHVibGljIGFjY2VwdFR5cGVWaXNpdG9yKHZpc2l0b3I6IFR5cGVWaXNpdG9yKTogYW55IHtcbiAgICAgICAgcmV0dXJuIHZpc2l0b3IudmlzaXRMaXN0KHRoaXMpO1xuICAgIH1cbiAgICBwcm90ZWN0ZWQgc3RhdGljIFtTeW1ib2wudG9TdHJpbmdUYWddID0gKChwcm90bzogTGlzdCkgPT4ge1xuICAgICAgICByZXR1cm4gcHJvdG9bU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICdMaXN0JztcbiAgICB9KShMaXN0LnByb3RvdHlwZSk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3RydWN0IGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5TdHJ1Y3Q+IHsgVEFycmF5OiBhbnk7IFRWYWx1ZTogVmlldzxhbnk+OyB9XG5leHBvcnQgY2xhc3MgU3RydWN0IGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5TdHJ1Y3Q+IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgY2hpbGRyZW46IEZpZWxkW10pIHtcbiAgICAgICAgc3VwZXIoVHlwZS5TdHJ1Y3QsIGNoaWxkcmVuKTtcbiAgICB9XG4gICAgcHVibGljIHRvU3RyaW5nKCkgeyByZXR1cm4gYFN0cnVjdDwke3RoaXMuY2hpbGRyZW4ubWFwKChmKSA9PiBmLnR5cGUpLmpvaW4oYCwgYCl9PmA7IH1cbiAgICBwdWJsaWMgYWNjZXB0VHlwZVZpc2l0b3IodmlzaXRvcjogVHlwZVZpc2l0b3IpOiBhbnkge1xuICAgICAgICByZXR1cm4gdmlzaXRvci52aXNpdFN0cnVjdCh0aGlzKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHN0YXRpYyBbU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICgocHJvdG86IFN0cnVjdCkgPT4ge1xuICAgICAgICByZXR1cm4gcHJvdG9bU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICdTdHJ1Y3QnO1xuICAgIH0pKFN0cnVjdC5wcm90b3R5cGUpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFVuaW9uPFRUeXBlIGV4dGVuZHMgVHlwZSA9IGFueT4gZXh0ZW5kcyBEYXRhVHlwZTxUVHlwZT4geyBUQXJyYXk6IEludDhBcnJheTsgVFZhbHVlOiBhbnk7IH1cbmV4cG9ydCBjbGFzcyBVbmlvbjxUVHlwZSBleHRlbmRzIFR5cGUgPSBhbnk+IGV4dGVuZHMgRGF0YVR5cGU8VFR5cGU+IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgbW9kZTogVW5pb25Nb2RlLFxuICAgICAgICAgICAgICAgIHB1YmxpYyByZWFkb25seSB0eXBlSWRzOiBBcnJvd1R5cGVbXSxcbiAgICAgICAgICAgICAgICBwdWJsaWMgcmVhZG9ubHkgY2hpbGRyZW46IEZpZWxkW10pIHtcbiAgICAgICAgc3VwZXIoPFRUeXBlPiAobW9kZSA9PT0gVW5pb25Nb2RlLlNwYXJzZSA/IFR5cGUuU3BhcnNlVW5pb24gOiBUeXBlLkRlbnNlVW5pb24pLCBjaGlsZHJlbik7XG4gICAgfVxuICAgIHB1YmxpYyB0b1N0cmluZygpIHsgcmV0dXJuIGAke3RoaXNbU3ltYm9sLnRvU3RyaW5nVGFnXX08JHt0aGlzLnR5cGVJZHMubWFwKCh4KSA9PiBUeXBlW3hdKS5qb2luKGAgfCBgKX0+YDsgfVxuICAgIHB1YmxpYyBhY2NlcHRUeXBlVmlzaXRvcih2aXNpdG9yOiBUeXBlVmlzaXRvcik6IGFueSB7IHJldHVybiB2aXNpdG9yLnZpc2l0VW5pb24odGhpcyk7IH1cbiAgICBwcm90ZWN0ZWQgc3RhdGljIFtTeW1ib2wudG9TdHJpbmdUYWddID0gKChwcm90bzogVW5pb24pID0+IHtcbiAgICAgICAgKDxhbnk+IHByb3RvKS5BcnJheVR5cGUgPSBJbnQ4QXJyYXk7XG4gICAgICAgIHJldHVybiBwcm90b1tTeW1ib2wudG9TdHJpbmdUYWddID0gJ1VuaW9uJztcbiAgICB9KShVbmlvbi5wcm90b3R5cGUpO1xufVxuXG5leHBvcnQgY2xhc3MgRGVuc2VVbmlvbiBleHRlbmRzIFVuaW9uPFR5cGUuRGVuc2VVbmlvbj4ge1xuICAgIGNvbnN0cnVjdG9yKHR5cGVJZHM6IEFycm93VHlwZVtdLCBjaGlsZHJlbjogRmllbGRbXSkge1xuICAgICAgICBzdXBlcihVbmlvbk1vZGUuRGVuc2UsIHR5cGVJZHMsIGNoaWxkcmVuKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHN0YXRpYyBbU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICgocHJvdG86IERlbnNlVW5pb24pID0+IHtcbiAgICAgICAgcmV0dXJuIHByb3RvW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAnRGVuc2VVbmlvbic7XG4gICAgfSkoRGVuc2VVbmlvbi5wcm90b3R5cGUpO1xufVxuXG5leHBvcnQgY2xhc3MgU3BhcnNlVW5pb24gZXh0ZW5kcyBVbmlvbjxUeXBlLlNwYXJzZVVuaW9uPiB7XG4gICAgY29uc3RydWN0b3IodHlwZUlkczogQXJyb3dUeXBlW10sIGNoaWxkcmVuOiBGaWVsZFtdKSB7XG4gICAgICAgIHN1cGVyKFVuaW9uTW9kZS5TcGFyc2UsIHR5cGVJZHMsIGNoaWxkcmVuKTtcbiAgICB9XG4gICAgcHJvdGVjdGVkIHN0YXRpYyBbU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICgocHJvdG86IFNwYXJzZVVuaW9uKSA9PiB7XG4gICAgICAgIHJldHVybiBwcm90b1tTeW1ib2wudG9TdHJpbmdUYWddID0gJ1NwYXJzZVVuaW9uJztcbiAgICB9KShTcGFyc2VVbmlvbi5wcm90b3R5cGUpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEZpeGVkU2l6ZUJpbmFyeSBleHRlbmRzIERhdGFUeXBlPFR5cGUuRml4ZWRTaXplQmluYXJ5PiB7IFRBcnJheTogVWludDhBcnJheTsgVFZhbHVlOiBVaW50OEFycmF5OyB9XG5leHBvcnQgY2xhc3MgRml4ZWRTaXplQmluYXJ5IGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5GaXhlZFNpemVCaW5hcnk+IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgYnl0ZVdpZHRoOiBudW1iZXIpIHtcbiAgICAgICAgc3VwZXIoVHlwZS5GaXhlZFNpemVCaW5hcnkpO1xuICAgIH1cbiAgICBwdWJsaWMgdG9TdHJpbmcoKSB7IHJldHVybiBgRml4ZWRTaXplQmluYXJ5WyR7dGhpcy5ieXRlV2lkdGh9XWA7IH1cbiAgICBwdWJsaWMgYWNjZXB0VHlwZVZpc2l0b3IodmlzaXRvcjogVHlwZVZpc2l0b3IpOiBhbnkgeyByZXR1cm4gdmlzaXRvci52aXNpdEZpeGVkU2l6ZUJpbmFyeSh0aGlzKTsgfVxuICAgIHByb3RlY3RlZCBzdGF0aWMgW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAoKHByb3RvOiBGaXhlZFNpemVCaW5hcnkpID0+IHtcbiAgICAgICAgKDxhbnk+IHByb3RvKS5BcnJheVR5cGUgPSBVaW50OEFycmF5O1xuICAgICAgICByZXR1cm4gcHJvdG9bU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICdGaXhlZFNpemVCaW5hcnknO1xuICAgIH0pKEZpeGVkU2l6ZUJpbmFyeS5wcm90b3R5cGUpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEZpeGVkU2l6ZUxpc3Q8VCBleHRlbmRzIERhdGFUeXBlID0gYW55PiBleHRlbmRzIERhdGFUeXBlPFR5cGUuRml4ZWRTaXplTGlzdD4geyBUQXJyYXk6IGFueTsgVFZhbHVlOiBWZWN0b3I8VD47IH1cbmV4cG9ydCBjbGFzcyBGaXhlZFNpemVMaXN0PFQgZXh0ZW5kcyBEYXRhVHlwZSA9IGFueT4gZXh0ZW5kcyBEYXRhVHlwZTxUeXBlLkZpeGVkU2l6ZUxpc3Q+IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgbGlzdFNpemU6IG51bWJlcixcbiAgICAgICAgICAgICAgICBwdWJsaWMgcmVhZG9ubHkgY2hpbGRyZW46IEZpZWxkW10pIHtcbiAgICAgICAgc3VwZXIoVHlwZS5GaXhlZFNpemVMaXN0LCBjaGlsZHJlbik7XG4gICAgfVxuICAgIHB1YmxpYyBnZXQgQXJyYXlUeXBlKCkgeyByZXR1cm4gdGhpcy52YWx1ZVR5cGUuQXJyYXlUeXBlOyB9XG4gICAgcHVibGljIGdldCB2YWx1ZVR5cGUoKSB7IHJldHVybiB0aGlzLmNoaWxkcmVuWzBdLnR5cGUgYXMgVDsgfVxuICAgIHB1YmxpYyBnZXQgdmFsdWVGaWVsZCgpIHsgcmV0dXJuIHRoaXMuY2hpbGRyZW5bMF0gYXMgRmllbGQ8VD47IH1cbiAgICBwdWJsaWMgdG9TdHJpbmcoKSB7IHJldHVybiBgRml4ZWRTaXplTGlzdFske3RoaXMubGlzdFNpemV9XTwke3RoaXMudmFsdWVUeXBlfT5gOyB9XG4gICAgcHVibGljIGFjY2VwdFR5cGVWaXNpdG9yKHZpc2l0b3I6IFR5cGVWaXNpdG9yKTogYW55IHsgcmV0dXJuIHZpc2l0b3IudmlzaXRGaXhlZFNpemVMaXN0KHRoaXMpOyB9XG4gICAgcHJvdGVjdGVkIHN0YXRpYyBbU3ltYm9sLnRvU3RyaW5nVGFnXSA9ICgocHJvdG86IEZpeGVkU2l6ZUxpc3QpID0+IHtcbiAgICAgICAgcmV0dXJuIHByb3RvW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAnRml4ZWRTaXplTGlzdCc7XG4gICAgfSkoRml4ZWRTaXplTGlzdC5wcm90b3R5cGUpO1xufVxuXG4vKiB0c2xpbnQ6ZGlzYWJsZTpjbGFzcy1uYW1lICovXG5leHBvcnQgaW50ZXJmYWNlIE1hcF8gZXh0ZW5kcyBEYXRhVHlwZTxUeXBlLk1hcD4geyBUQXJyYXk6IFVpbnQ4QXJyYXk7IFRWYWx1ZTogVmlldzxhbnk+OyB9XG5leHBvcnQgY2xhc3MgTWFwXyBleHRlbmRzIERhdGFUeXBlPFR5cGUuTWFwPiB7XG4gICAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IGtleXNTb3J0ZWQ6IGJvb2xlYW4sXG4gICAgICAgICAgICAgICAgcHVibGljIHJlYWRvbmx5IGNoaWxkcmVuOiBGaWVsZFtdKSB7XG4gICAgICAgIHN1cGVyKFR5cGUuTWFwLCBjaGlsZHJlbik7XG4gICAgfVxuICAgIHB1YmxpYyB0b1N0cmluZygpIHsgcmV0dXJuIGBNYXA8JHt0aGlzLmNoaWxkcmVuLmpvaW4oYCwgYCl9PmA7IH1cbiAgICBwdWJsaWMgYWNjZXB0VHlwZVZpc2l0b3IodmlzaXRvcjogVHlwZVZpc2l0b3IpOiBhbnkgeyByZXR1cm4gdmlzaXRvci52aXNpdE1hcCh0aGlzKTsgfVxuICAgIHByb3RlY3RlZCBzdGF0aWMgW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAoKHByb3RvOiBNYXBfKSA9PiB7XG4gICAgICAgIHJldHVybiBwcm90b1tTeW1ib2wudG9TdHJpbmdUYWddID0gJ01hcCc7XG4gICAgfSkoTWFwXy5wcm90b3R5cGUpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERpY3Rpb25hcnk8VCBleHRlbmRzIERhdGFUeXBlID0gYW55PiBleHRlbmRzIERhdGFUeXBlPFR5cGUuRGljdGlvbmFyeT4geyBUQXJyYXk6IFRbJ1RBcnJheSddOyBUVmFsdWU6IFRbJ1RWYWx1ZSddOyB9XG5leHBvcnQgY2xhc3MgRGljdGlvbmFyeTxUIGV4dGVuZHMgRGF0YVR5cGU+IGV4dGVuZHMgRGF0YVR5cGU8VHlwZS5EaWN0aW9uYXJ5PiB7XG4gICAgcHVibGljIHJlYWRvbmx5IGlkOiBudW1iZXI7XG4gICAgcHVibGljIHJlYWRvbmx5IGRpY3Rpb25hcnk6IFQ7XG4gICAgcHVibGljIHJlYWRvbmx5IGluZGljaWVzOiBJbnQ8YW55PjtcbiAgICBwdWJsaWMgcmVhZG9ubHkgaXNPcmRlcmVkOiBib29sZWFuO1xuICAgIGNvbnN0cnVjdG9yKGRpY3Rpb25hcnk6IFQsIGluZGljaWVzOiBJbnQ8YW55PiwgaWQ/OiBMb25nIHwgbnVtYmVyIHwgbnVsbCwgaXNPcmRlcmVkPzogYm9vbGVhbiB8IG51bGwpIHtcbiAgICAgICAgc3VwZXIoVHlwZS5EaWN0aW9uYXJ5KTtcbiAgICAgICAgdGhpcy5pbmRpY2llcyA9IGluZGljaWVzO1xuICAgICAgICB0aGlzLmRpY3Rpb25hcnkgPSBkaWN0aW9uYXJ5O1xuICAgICAgICB0aGlzLmlzT3JkZXJlZCA9IGlzT3JkZXJlZCB8fCBmYWxzZTtcbiAgICAgICAgdGhpcy5pZCA9IGlkID09IG51bGwgPyBEaWN0aW9uYXJ5QmF0Y2guZ2V0SWQoKSA6IHR5cGVvZiBpZCA9PT0gJ251bWJlcicgPyBpZCA6IGlkLmxvdztcbiAgICB9XG4gICAgcHVibGljIGdldCBBcnJheVR5cGUoKSB7IHJldHVybiB0aGlzLmRpY3Rpb25hcnkuQXJyYXlUeXBlOyB9XG4gICAgcHVibGljIHRvU3RyaW5nKCkgeyByZXR1cm4gYERpY3Rpb25hcnk8JHt0aGlzLmRpY3Rpb25hcnl9LCAke3RoaXMuaW5kaWNpZXN9PmA7IH1cbiAgICBwdWJsaWMgYWNjZXB0VHlwZVZpc2l0b3IodmlzaXRvcjogVHlwZVZpc2l0b3IpOiBhbnkge1xuICAgICAgICByZXR1cm4gdmlzaXRvci52aXNpdERpY3Rpb25hcnkodGhpcyk7XG4gICAgfVxuICAgIHByb3RlY3RlZCBzdGF0aWMgW1N5bWJvbC50b1N0cmluZ1RhZ10gPSAoKHByb3RvOiBEaWN0aW9uYXJ5KSA9PiB7XG4gICAgICAgIHJldHVybiBwcm90b1tTeW1ib2wudG9TdHJpbmdUYWddID0gJ0RpY3Rpb25hcnknO1xuICAgIH0pKERpY3Rpb25hcnkucHJvdG90eXBlKTtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgSXRlcmFibGVBcnJheUxpa2U8VCA9IGFueT4gZXh0ZW5kcyBBcnJheUxpa2U8VD4sIEl0ZXJhYmxlPFQ+IHt9XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHlwZWRBcnJheUNvbnN0cnVjdG9yPFQgZXh0ZW5kcyBUeXBlZEFycmF5ID0gVHlwZWRBcnJheT4ge1xuICAgIHJlYWRvbmx5IHByb3RvdHlwZTogVDtcbiAgICByZWFkb25seSBCWVRFU19QRVJfRUxFTUVOVDogbnVtYmVyO1xuICAgIG5ldyAobGVuZ3RoOiBudW1iZXIpOiBUO1xuICAgIG5ldyAoZWxlbWVudHM6IEl0ZXJhYmxlPG51bWJlcj4pOiBUO1xuICAgIG5ldyAoYXJyYXlPckFycmF5QnVmZmVyOiBBcnJheUxpa2U8bnVtYmVyPiB8IEFycmF5QnVmZmVyTGlrZSk6IFQ7XG4gICAgbmV3IChidWZmZXI6IEFycmF5QnVmZmVyTGlrZSwgYnl0ZU9mZnNldDogbnVtYmVyLCBsZW5ndGg/OiBudW1iZXIpOiBUO1xuICAgIG9mKC4uLml0ZW1zOiBudW1iZXJbXSk6IFQ7XG4gICAgZnJvbShhcnJheUxpa2U6IEFycmF5TGlrZTxudW1iZXI+IHwgSXRlcmFibGU8bnVtYmVyPiwgbWFwZm4/OiAodjogbnVtYmVyLCBrOiBudW1iZXIpID0+IG51bWJlciwgdGhpc0FyZz86IGFueSk6IFQ7XG59XG5cbmV4cG9ydCB0eXBlIEZsb2F0QXJyYXkgPSBVaW50MTZBcnJheSB8IEZsb2F0MzJBcnJheSB8IEZsb2F0NjRBcnJheTtcbmV4cG9ydCB0eXBlIEludEFycmF5ID0gSW50OEFycmF5IHwgSW50MTZBcnJheSB8IEludDMyQXJyYXkgfCBVaW50OEFycmF5IHwgVWludDE2QXJyYXkgfCBVaW50MzJBcnJheTtcblxuZXhwb3J0IGludGVyZmFjZSBUeXBlZEFycmF5IGV4dGVuZHMgSXRlcmFibGU8bnVtYmVyPiB7XG4gICAgW2luZGV4OiBudW1iZXJdOiBudW1iZXI7XG4gICAgcmVhZG9ubHkgbGVuZ3RoOiBudW1iZXI7XG4gICAgcmVhZG9ubHkgYnl0ZUxlbmd0aDogbnVtYmVyO1xuICAgIHJlYWRvbmx5IGJ5dGVPZmZzZXQ6IG51bWJlcjtcbiAgICByZWFkb25seSBidWZmZXI6IEFycmF5QnVmZmVyTGlrZTtcbiAgICByZWFkb25seSBCWVRFU19QRVJfRUxFTUVOVDogbnVtYmVyO1xuICAgIFtTeW1ib2wudG9TdHJpbmdUYWddOiBhbnk7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxudW1iZXI+O1xuICAgIGVudHJpZXMoKTogSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBudW1iZXJdPjtcbiAgICBrZXlzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8bnVtYmVyPjtcbiAgICB2YWx1ZXMoKTogSXRlcmFibGVJdGVyYXRvcjxudW1iZXI+O1xuICAgIGNvcHlXaXRoaW4odGFyZ2V0OiBudW1iZXIsIHN0YXJ0OiBudW1iZXIsIGVuZD86IG51bWJlcik6IHRoaXM7XG4gICAgZXZlcnkoY2FsbGJhY2tmbjogKHZhbHVlOiBudW1iZXIsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUeXBlZEFycmF5KSA9PiBib29sZWFuLCB0aGlzQXJnPzogYW55KTogYm9vbGVhbjtcbiAgICBmaWxsKHZhbHVlOiBudW1iZXIsIHN0YXJ0PzogbnVtYmVyLCBlbmQ/OiBudW1iZXIpOiB0aGlzO1xuICAgIGZpbHRlcihjYWxsYmFja2ZuOiAodmFsdWU6IG51bWJlciwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFR5cGVkQXJyYXkpID0+IGFueSwgdGhpc0FyZz86IGFueSk6IFR5cGVkQXJyYXk7XG4gICAgZmluZChwcmVkaWNhdGU6ICh2YWx1ZTogbnVtYmVyLCBpbmRleDogbnVtYmVyLCBvYmo6IFR5cGVkQXJyYXkpID0+IGJvb2xlYW4sIHRoaXNBcmc/OiBhbnkpOiBudW1iZXIgfCB1bmRlZmluZWQ7XG4gICAgZmluZEluZGV4KHByZWRpY2F0ZTogKHZhbHVlOiBudW1iZXIsIGluZGV4OiBudW1iZXIsIG9iajogVHlwZWRBcnJheSkgPT4gYm9vbGVhbiwgdGhpc0FyZz86IGFueSk6IG51bWJlcjtcbiAgICBmb3JFYWNoKGNhbGxiYWNrZm46ICh2YWx1ZTogbnVtYmVyLCBpbmRleDogbnVtYmVyLCBhcnJheTogVHlwZWRBcnJheSkgPT4gdm9pZCwgdGhpc0FyZz86IGFueSk6IHZvaWQ7XG4gICAgaW5jbHVkZXMoc2VhcmNoRWxlbWVudDogbnVtYmVyLCBmcm9tSW5kZXg/OiBudW1iZXIpOiBib29sZWFuO1xuICAgIGluZGV4T2Yoc2VhcmNoRWxlbWVudDogbnVtYmVyLCBmcm9tSW5kZXg/OiBudW1iZXIpOiBudW1iZXI7XG4gICAgam9pbihzZXBhcmF0b3I/OiBzdHJpbmcpOiBzdHJpbmc7XG4gICAgbGFzdEluZGV4T2Yoc2VhcmNoRWxlbWVudDogbnVtYmVyLCBmcm9tSW5kZXg/OiBudW1iZXIpOiBudW1iZXI7XG4gICAgbWFwKGNhbGxiYWNrZm46ICh2YWx1ZTogbnVtYmVyLCBpbmRleDogbnVtYmVyLCBhcnJheTogVHlwZWRBcnJheSkgPT4gbnVtYmVyLCB0aGlzQXJnPzogYW55KTogVHlwZWRBcnJheTtcbiAgICByZWR1Y2UoY2FsbGJhY2tmbjogKHByZXZpb3VzVmFsdWU6IG51bWJlciwgY3VycmVudFZhbHVlOiBudW1iZXIsIGN1cnJlbnRJbmRleDogbnVtYmVyLCBhcnJheTogVHlwZWRBcnJheSkgPT4gbnVtYmVyKTogbnVtYmVyO1xuICAgIHJlZHVjZShjYWxsYmFja2ZuOiAocHJldmlvdXNWYWx1ZTogbnVtYmVyLCBjdXJyZW50VmFsdWU6IG51bWJlciwgY3VycmVudEluZGV4OiBudW1iZXIsIGFycmF5OiBUeXBlZEFycmF5KSA9PiBudW1iZXIsIGluaXRpYWxWYWx1ZTogbnVtYmVyKTogbnVtYmVyO1xuICAgIHJlZHVjZTxVPihjYWxsYmFja2ZuOiAocHJldmlvdXNWYWx1ZTogVSwgY3VycmVudFZhbHVlOiBudW1iZXIsIGN1cnJlbnRJbmRleDogbnVtYmVyLCBhcnJheTogVHlwZWRBcnJheSkgPT4gVSwgaW5pdGlhbFZhbHVlOiBVKTogVTtcbiAgICByZWR1Y2VSaWdodChjYWxsYmFja2ZuOiAocHJldmlvdXNWYWx1ZTogbnVtYmVyLCBjdXJyZW50VmFsdWU6IG51bWJlciwgY3VycmVudEluZGV4OiBudW1iZXIsIGFycmF5OiBUeXBlZEFycmF5KSA9PiBudW1iZXIpOiBudW1iZXI7XG4gICAgcmVkdWNlUmlnaHQoY2FsbGJhY2tmbjogKHByZXZpb3VzVmFsdWU6IG51bWJlciwgY3VycmVudFZhbHVlOiBudW1iZXIsIGN1cnJlbnRJbmRleDogbnVtYmVyLCBhcnJheTogVHlwZWRBcnJheSkgPT4gbnVtYmVyLCBpbml0aWFsVmFsdWU6IG51bWJlcik6IG51bWJlcjtcbiAgICByZWR1Y2VSaWdodDxVPihjYWxsYmFja2ZuOiAocHJldmlvdXNWYWx1ZTogVSwgY3VycmVudFZhbHVlOiBudW1iZXIsIGN1cnJlbnRJbmRleDogbnVtYmVyLCBhcnJheTogVHlwZWRBcnJheSkgPT4gVSwgaW5pdGlhbFZhbHVlOiBVKTogVTtcbiAgICByZXZlcnNlKCk6IFR5cGVkQXJyYXk7XG4gICAgc2V0KGFycmF5OiBBcnJheUxpa2U8bnVtYmVyPiwgb2Zmc2V0PzogbnVtYmVyKTogdm9pZDtcbiAgICBzbGljZShzdGFydD86IG51bWJlciwgZW5kPzogbnVtYmVyKTogVHlwZWRBcnJheTtcbiAgICBzb21lKGNhbGxiYWNrZm46ICh2YWx1ZTogbnVtYmVyLCBpbmRleDogbnVtYmVyLCBhcnJheTogVHlwZWRBcnJheSkgPT4gYm9vbGVhbiwgdGhpc0FyZz86IGFueSk6IGJvb2xlYW47XG4gICAgc29ydChjb21wYXJlRm4/OiAoYTogbnVtYmVyLCBiOiBudW1iZXIpID0+IG51bWJlcik6IHRoaXM7XG4gICAgc3ViYXJyYXkoYmVnaW46IG51bWJlciwgZW5kPzogbnVtYmVyKTogVHlwZWRBcnJheTtcbiAgICB0b0xvY2FsZVN0cmluZygpOiBzdHJpbmc7XG4gICAgdG9TdHJpbmcoKTogc3RyaW5nO1xufVxuIl19

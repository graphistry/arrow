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
const schema_1 = require("../schema");
const type_1 = require("../type");
const pretty_1 = require("../util/pretty");
/** @ignore */ exports.kLength = Symbol.for('length');
/** @ignore */ exports.kParent = Symbol.for('parent');
/** @ignore */ exports.kRowIndex = Symbol.for('rowIndex');
/** @ignore */ const columnDescriptor = { enumerable: true, configurable: false, get: null };
/** @ignore */ const rowLengthDescriptor = { writable: false, enumerable: false, configurable: false, value: -1 };
/** @ignore */ const rowParentDescriptor = { writable: false, enumerable: false, configurable: false, value: null };
class Row {
    *[Symbol.iterator]() {
        for (let i = -1, n = this[exports.kLength]; ++i < n;) {
            yield this[i];
        }
    }
    get(key) { return this[key]; }
    toJSON() {
        return type_1.DataType.isStruct(this[exports.kParent].type) ? [...this] :
            Object.getOwnPropertyNames(this).reduce((props, prop) => {
                return (props[prop] = this[prop]) && props || props;
            }, {});
    }
    toString() {
        return type_1.DataType.isStruct(this[exports.kParent].type) ?
            [...this].map((x) => pretty_1.valueToString(x)).join(', ') :
            Object.getOwnPropertyNames(this).reduce((props, prop) => {
                return (props[prop] = pretty_1.valueToString(this[prop])) && props || props;
            }, {});
    }
}
exports.Row = Row;
/** @ignore */
class RowProxyGenerator {
    constructor(parent, fields, fieldsAreEnumerable) {
        const proto = Object.create(Row.prototype);
        rowParentDescriptor.value = parent;
        rowLengthDescriptor.value = fields.length;
        Object.defineProperty(proto, exports.kParent, rowParentDescriptor);
        Object.defineProperty(proto, exports.kLength, rowLengthDescriptor);
        fields.forEach((field, columnIndex) => {
            if (!proto.hasOwnProperty(field.name)) {
                columnDescriptor.enumerable = fieldsAreEnumerable;
                columnDescriptor.get || (columnDescriptor.get = this._bindGetter(columnIndex));
                Object.defineProperty(proto, field.name, columnDescriptor);
            }
            if (!proto.hasOwnProperty(columnIndex)) {
                columnDescriptor.enumerable = !fieldsAreEnumerable;
                columnDescriptor.get || (columnDescriptor.get = this._bindGetter(columnIndex));
                Object.defineProperty(proto, columnIndex, columnDescriptor);
            }
            columnDescriptor.get = null;
        });
        this.rowPrototype = proto;
    }
    /** @nocollapse */
    static new(parent, schemaOrFields, fieldsAreEnumerable = false) {
        let schema, fields;
        if (Array.isArray(schemaOrFields)) {
            fields = schemaOrFields;
        }
        else {
            schema = schemaOrFields;
            fieldsAreEnumerable = true;
            fields = Object.keys(schema).map((x) => new schema_1.Field(x, schema[x]));
        }
        return new RowProxyGenerator(parent, fields, fieldsAreEnumerable);
    }
    _bindGetter(columnIndex) {
        return function () {
            const child = this[exports.kParent].getChildAt(columnIndex);
            return child ? child.get(this[exports.kRowIndex]) : null;
        };
    }
    bind(rowIndex) {
        const bound = Object.create(this.rowPrototype);
        bound[exports.kRowIndex] = rowIndex;
        return bound;
    }
}
exports.RowProxyGenerator = RowProxyGenerator;

//# sourceMappingURL=row.js.map

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
const args_1 = require("./util/args");
const type_1 = require("./type");
const args_2 = require("./util/args");
const typecomparator_1 = require("./visitor/typecomparator");
class Schema {
    constructor(fields = [], metadata, dictionaries, dictionaryFields) {
        this.fields = (fields || []);
        this.metadata = metadata || new Map();
        if (!dictionaries || !dictionaryFields) {
            ({ dictionaries, dictionaryFields } = generateDictionaryMap(fields, dictionaries || new Map(), dictionaryFields || new Map()));
        }
        this.dictionaries = dictionaries;
        this.dictionaryFields = dictionaryFields;
    }
    /** @nocollapse */
    static from(...args) {
        return Schema.new(args[0], args[1]);
    }
    /** @nocollapse */
    static new(...args) {
        return new Schema(args_2.selectFieldArgs(args)[0]);
    }
    get [Symbol.toStringTag]() { return 'Schema'; }
    toString() {
        return `Schema<{ ${this.fields.map((f, i) => `${i}: ${f}`).join(', ')} }>`;
    }
    compareTo(other) {
        return typecomparator_1.instance.compareSchemas(this, other);
    }
    select(...columnNames) {
        const names = columnNames.reduce((xs, x) => (xs[x] = true) && xs, Object.create(null));
        return new Schema(this.fields.filter((f) => names[f.name]), this.metadata);
    }
    selectAt(...columnIndices) {
        return new Schema(columnIndices.map((i) => this.fields[i]).filter(Boolean), this.metadata);
    }
    assign(...args) {
        const other = args[0] instanceof Schema ? args[0]
            : new Schema(args_1.selectArgs(Field, args));
        const curFields = [...this.fields];
        const curDictionaries = [...this.dictionaries];
        const curDictionaryFields = this.dictionaryFields;
        const metadata = mergeMaps(mergeMaps(new Map(), this.metadata), other.metadata);
        const newFields = other.fields.filter((f2) => {
            const i = curFields.findIndex((f) => f.name === f2.name);
            return ~i ? (curFields[i] = f2.clone({
                metadata: mergeMaps(mergeMaps(new Map(), curFields[i].metadata), f2.metadata)
            })) && false : true;
        });
        const { dictionaries, dictionaryFields } = generateDictionaryMap(newFields, new Map(), new Map());
        const newDictionaries = [...dictionaries].filter(([y]) => !curDictionaries.every(([x]) => x === y));
        const newDictionaryFields = [...dictionaryFields].map(([id, newDictFields]) => {
            return [id, [...(curDictionaryFields.get(id) || []), ...newDictFields.map((f) => {
                        const i = newFields.findIndex((f2) => f.name === f2.name);
                        const { dictionary, indices, isOrdered, dictionaryVector } = f.type;
                        const type = new type_1.Dictionary(dictionary, indices, id, isOrdered, dictionaryVector);
                        return newFields[i] = f.clone({ type });
                    })]];
        });
        return new Schema([...curFields, ...newFields], metadata, new Map([...curDictionaries, ...newDictionaries]), new Map([...curDictionaryFields, ...newDictionaryFields]));
    }
}
exports.Schema = Schema;
class Field {
    constructor(name, type, nullable = false, metadata) {
        this.name = name;
        this.type = type;
        this.nullable = nullable;
        this.metadata = metadata || new Map();
    }
    /** @nocollapse */
    static new(...args) {
        let [name, type, nullable, metadata] = args;
        if (args[0] && typeof args[0] === 'object') {
            ({ name } = args[0]);
            (type === undefined) && (type = args[0].type);
            (nullable === undefined) && (nullable = args[0].nullable);
            (metadata === undefined) && (metadata = args[0].metadata);
        }
        return new Field(`${name}`, type, nullable, metadata);
    }
    get typeId() { return this.type.typeId; }
    get [Symbol.toStringTag]() { return 'Field'; }
    toString() { return `${this.name}: ${this.type}`; }
    compareTo(other) {
        return typecomparator_1.instance.compareField(this, other);
    }
    clone(...args) {
        let [name, type, nullable, metadata] = args;
        (!args[0] || typeof args[0] !== 'object')
            ? ([name = this.name, type = this.type, nullable = this.nullable, metadata = this.metadata] = args)
            : ({ name = this.name, type = this.type, nullable = this.nullable, metadata = this.metadata } = args[0]);
        return Field.new(name, type, nullable, metadata);
    }
}
exports.Field = Field;
/** @ignore */
function mergeMaps(m1, m2) {
    return new Map([...(m1 || new Map()), ...(m2 || new Map())]);
}
/** @ignore */
function generateDictionaryMap(fields, dictionaries, dictionaryFields) {
    for (let i = -1, n = fields.length; ++i < n;) {
        const field = fields[i];
        const type = field.type;
        if (type_1.DataType.isDictionary(type)) {
            if (!dictionaryFields.get(type.id)) {
                dictionaryFields.set(type.id, []);
            }
            if (!dictionaries.has(type.id)) {
                dictionaries.set(type.id, type.dictionary);
                dictionaryFields.get(type.id).push(field);
            }
            else if (dictionaries.get(type.id) !== type.dictionary) {
                throw new Error(`Cannot create Schema containing two different dictionaries with the same Id`);
            }
        }
        if (type.children) {
            generateDictionaryMap(type.children, dictionaries, dictionaryFields);
        }
    }
    return { dictionaries, dictionaryFields };
}
// Add these here so they're picked up by the externs creator
// in the build, and closure-compiler doesn't minify them away
Schema.prototype.fields = null;
Schema.prototype.metadata = null;
Schema.prototype.dictionaries = null;
Schema.prototype.dictionaryFields = null;
Field.prototype.type = null;
Field.prototype.name = null;
Field.prototype.nullable = null;
Field.prototype.metadata = null;

//# sourceMappingURL=schema.js.map

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
const schema_1 = require("../../schema");
const type_1 = require("../../type");
const message_1 = require("./message");
const enum_1 = require("../../enum");
/** @ignore */
function schemaFromJSON(_schema, dictionaries = new Map(), dictionaryFields = new Map()) {
    return new schema_1.Schema(schemaFieldsFromJSON(_schema, dictionaries, dictionaryFields), customMetadataFromJSON(_schema['customMetadata']), dictionaries, dictionaryFields);
}
exports.schemaFromJSON = schemaFromJSON;
/** @ignore */
function recordBatchFromJSON(b) {
    return new message_1.RecordBatch(b['count'], fieldNodesFromJSON(b['columns']), buffersFromJSON(b['columns']));
}
exports.recordBatchFromJSON = recordBatchFromJSON;
/** @ignore */
function dictionaryBatchFromJSON(b) {
    return new message_1.DictionaryBatch(recordBatchFromJSON(b['data']), b['id'], b['isDelta']);
}
exports.dictionaryBatchFromJSON = dictionaryBatchFromJSON;
/** @ignore */
function schemaFieldsFromJSON(_schema, dictionaries, dictionaryFields) {
    return (_schema['fields'] || []).filter(Boolean).map((f) => schema_1.Field.fromJSON(f, dictionaries, dictionaryFields));
}
/** @ignore */
function fieldChildrenFromJSON(_field, dictionaries, dictionaryFields) {
    return (_field['children'] || []).filter(Boolean).map((f) => schema_1.Field.fromJSON(f, dictionaries, dictionaryFields));
}
/** @ignore */
function fieldNodesFromJSON(xs) {
    return (xs || []).reduce((fieldNodes, column) => [
        ...fieldNodes,
        new message_1.FieldNode(column['count'], nullCountFromJSON(column['VALIDITY'])),
        ...fieldNodesFromJSON(column['children'])
    ], []);
}
/** @ignore */
function buffersFromJSON(xs, buffers = []) {
    for (let i = -1, n = (xs || []).length; ++i < n;) {
        const column = xs[i];
        column['VALIDITY'] && buffers.push(new message_1.BufferRegion(buffers.length, column['VALIDITY'].length));
        column['TYPE'] && buffers.push(new message_1.BufferRegion(buffers.length, column['TYPE'].length));
        column['OFFSET'] && buffers.push(new message_1.BufferRegion(buffers.length, column['OFFSET'].length));
        column['DATA'] && buffers.push(new message_1.BufferRegion(buffers.length, column['DATA'].length));
        buffers = buffersFromJSON(column['children'], buffers);
    }
    return buffers;
}
/** @ignore */
function nullCountFromJSON(validity) {
    return (validity || []).reduce((sum, val) => sum + +(val === 0), 0);
}
/** @ignore */
function fieldFromJSON(_field, dictionaries, dictionaryFields) {
    let id;
    let keys;
    let field;
    let dictMeta;
    let type;
    let dictType;
    let dictField;
    // If no dictionary encoding, or in the process of decoding the children of a dictionary-encoded field
    if (!dictionaries || !dictionaryFields || !(dictMeta = _field['dictionary'])) {
        type = typeFromJSON(_field, fieldChildrenFromJSON(_field, dictionaries, dictionaryFields));
        field = new schema_1.Field(_field['name'], type, _field['nullable'], customMetadataFromJSON(_field['customMetadata']));
    }
    // tslint:disable
    // If dictionary encoded and the first time we've seen this dictionary id, decode
    // the data type and child fields, then wrap in a Dictionary type and insert the
    // data type into the dictionary types map.
    else if (!dictionaries.has(id = dictMeta['id'])) {
        // a dictionary index defaults to signed 32 bit int if unspecified
        keys = (keys = dictMeta['indexType']) ? indexTypeFromJSON(keys) : new type_1.Int32();
        dictionaries.set(id, type = typeFromJSON(_field, fieldChildrenFromJSON(_field)));
        dictType = new type_1.Dictionary(type, keys, id, dictMeta['isOrdered']);
        dictField = new schema_1.Field(_field['name'], dictType, _field['nullable'], customMetadataFromJSON(_field['customMetadata']));
        dictionaryFields.set(id, [field = dictField]);
    }
    // If dictionary encoded, and have already seen this dictionary Id in the schema, then reuse the
    // data type and wrap in a new Dictionary type and field.
    else {
        // a dictionary index defaults to signed 32 bit int if unspecified
        keys = (keys = dictMeta['indexType']) ? indexTypeFromJSON(keys) : new type_1.Int32();
        dictType = new type_1.Dictionary(dictionaries.get(id), keys, id, dictMeta['isOrdered']);
        dictField = new schema_1.Field(_field['name'], dictType, _field['nullable'], customMetadataFromJSON(_field['customMetadata']));
        dictionaryFields.get(id).push(field = dictField);
    }
    return field || null;
}
exports.fieldFromJSON = fieldFromJSON;
/** @ignore */
function customMetadataFromJSON(_metadata) {
    return new Map(Object.entries(_metadata || {}));
}
/** @ignore */
function indexTypeFromJSON(_type) {
    return new type_1.Int(_type['isSigned'], _type['bitWidth']);
}
/** @ignore */
function typeFromJSON(f, children) {
    const typeId = f['type']['name'];
    switch (typeId) {
        case 'NONE': return new type_1.DataType();
        case 'null': return new type_1.Null();
        case 'binary': return new type_1.Binary();
        case 'utf8': return new type_1.Utf8();
        case 'bool': return new type_1.Bool();
        case 'list': return new type_1.List((children || [])[0]);
        case 'struct': return new type_1.Struct(children || []);
        case 'struct_': return new type_1.Struct(children || []);
    }
    switch (typeId) {
        case 'int': {
            const t = f['type'];
            return new type_1.Int(t['isSigned'], t['bitWidth']);
        }
        case 'floatingpoint': {
            const t = f['type'];
            return new type_1.Float(enum_1.Precision[t['precision']]);
        }
        case 'decimal': {
            const t = f['type'];
            return new type_1.Decimal(t['scale'], t['precision']);
        }
        case 'date': {
            const t = f['type'];
            return new type_1.Date_(enum_1.DateUnit[t['unit']]);
        }
        case 'time': {
            const t = f['type'];
            return new type_1.Time(enum_1.TimeUnit[t['unit']], t['bitWidth']);
        }
        case 'timestamp': {
            const t = f['type'];
            return new type_1.Timestamp(enum_1.TimeUnit[t['unit']], t['timezone']);
        }
        case 'interval': {
            const t = f['type'];
            return new type_1.Interval(enum_1.IntervalUnit[t['unit']]);
        }
        case 'union': {
            const t = f['type'];
            return new type_1.Union(enum_1.UnionMode[t['mode']], (t['typeIds'] || []), children || []);
        }
        case 'fixedsizebinary': {
            const t = f['type'];
            return new type_1.FixedSizeBinary(t['byteWidth']);
        }
        case 'fixedsizelist': {
            const t = f['type'];
            return new type_1.FixedSizeList(t['listSize'], (children || [])[0]);
        }
        case 'map': {
            const t = f['type'];
            return new type_1.Map_(children || [], t['keysSorted']);
        }
    }
    throw new Error(`Unrecognized type: "${typeId}"`);
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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RyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDcEIsT0FBTyxJQUFJLFdBQUksQ0FBQyxRQUFRLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1NBQ3BEO0tBQ0o7SUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLHVCQUF1QixNQUFNLEdBQUcsQ0FBQyxDQUFDO0FBQ3RELENBQUMiLCJmaWxlIjoiaXBjL21ldGFkYXRhL2pzb24uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgU2NoZW1hLCBGaWVsZCB9IGZyb20gJy4uLy4uL3NjaGVtYSc7XG5pbXBvcnQge1xuICAgIERhdGFUeXBlLCBEaWN0aW9uYXJ5LCBUaW1lQml0V2lkdGgsXG4gICAgVXRmOCwgQmluYXJ5LCBEZWNpbWFsLCBGaXhlZFNpemVCaW5hcnksXG4gICAgTGlzdCwgRml4ZWRTaXplTGlzdCwgTWFwXywgU3RydWN0LCBVbmlvbixcbiAgICBCb29sLCBOdWxsLCBJbnQsIEZsb2F0LCBEYXRlXywgVGltZSwgSW50ZXJ2YWwsIFRpbWVzdGFtcCwgSW50Qml0V2lkdGgsIEludDMyLCBUS2V5cyxcbn0gZnJvbSAnLi4vLi4vdHlwZSc7XG5cbmltcG9ydCB7IERpY3Rpb25hcnlCYXRjaCwgUmVjb3JkQmF0Y2gsIEZpZWxkTm9kZSwgQnVmZmVyUmVnaW9uIH0gZnJvbSAnLi9tZXNzYWdlJztcbmltcG9ydCB7IFRpbWVVbml0LCBQcmVjaXNpb24sIEludGVydmFsVW5pdCwgVW5pb25Nb2RlLCBEYXRlVW5pdCB9IGZyb20gJy4uLy4uL2VudW0nO1xuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNjaGVtYUZyb21KU09OKF9zY2hlbWE6IGFueSwgZGljdGlvbmFyaWVzOiBNYXA8bnVtYmVyLCBEYXRhVHlwZT4gPSBuZXcgTWFwKCksIGRpY3Rpb25hcnlGaWVsZHM6IE1hcDxudW1iZXIsIEZpZWxkPERpY3Rpb25hcnk+W10+ID0gbmV3IE1hcCgpKSB7XG4gICAgcmV0dXJuIG5ldyBTY2hlbWEoXG4gICAgICAgIHNjaGVtYUZpZWxkc0Zyb21KU09OKF9zY2hlbWEsIGRpY3Rpb25hcmllcywgZGljdGlvbmFyeUZpZWxkcyksXG4gICAgICAgIGN1c3RvbU1ldGFkYXRhRnJvbUpTT04oX3NjaGVtYVsnY3VzdG9tTWV0YWRhdGEnXSksXG4gICAgICAgIGRpY3Rpb25hcmllcywgZGljdGlvbmFyeUZpZWxkc1xuICAgICk7XG59XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgZnVuY3Rpb24gcmVjb3JkQmF0Y2hGcm9tSlNPTihiOiBhbnkpIHtcbiAgICByZXR1cm4gbmV3IFJlY29yZEJhdGNoKFxuICAgICAgICBiWydjb3VudCddLFxuICAgICAgICBmaWVsZE5vZGVzRnJvbUpTT04oYlsnY29sdW1ucyddKSxcbiAgICAgICAgYnVmZmVyc0Zyb21KU09OKGJbJ2NvbHVtbnMnXSlcbiAgICApO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRpY3Rpb25hcnlCYXRjaEZyb21KU09OKGI6IGFueSkge1xuICAgIHJldHVybiBuZXcgRGljdGlvbmFyeUJhdGNoKFxuICAgICAgICByZWNvcmRCYXRjaEZyb21KU09OKGJbJ2RhdGEnXSksXG4gICAgICAgIGJbJ2lkJ10sIGJbJ2lzRGVsdGEnXVxuICAgICk7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBzY2hlbWFGaWVsZHNGcm9tSlNPTihfc2NoZW1hOiBhbnksIGRpY3Rpb25hcmllcz86IE1hcDxudW1iZXIsIERhdGFUeXBlPiwgZGljdGlvbmFyeUZpZWxkcz86IE1hcDxudW1iZXIsIEZpZWxkPERpY3Rpb25hcnk+W10+KSB7XG4gICAgcmV0dXJuIChfc2NoZW1hWydmaWVsZHMnXSB8fCBbXSkuZmlsdGVyKEJvb2xlYW4pLm1hcCgoZjogYW55KSA9PiBGaWVsZC5mcm9tSlNPTihmLCBkaWN0aW9uYXJpZXMsIGRpY3Rpb25hcnlGaWVsZHMpKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGZpZWxkQ2hpbGRyZW5Gcm9tSlNPTihfZmllbGQ6IGFueSwgZGljdGlvbmFyaWVzPzogTWFwPG51bWJlciwgRGF0YVR5cGU+LCBkaWN0aW9uYXJ5RmllbGRzPzogTWFwPG51bWJlciwgRmllbGQ8RGljdGlvbmFyeT5bXT4pOiBGaWVsZFtdIHtcbiAgICByZXR1cm4gKF9maWVsZFsnY2hpbGRyZW4nXSB8fCBbXSkuZmlsdGVyKEJvb2xlYW4pLm1hcCgoZjogYW55KSA9PiBGaWVsZC5mcm9tSlNPTihmLCBkaWN0aW9uYXJpZXMsIGRpY3Rpb25hcnlGaWVsZHMpKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGZpZWxkTm9kZXNGcm9tSlNPTih4czogYW55W10pOiBGaWVsZE5vZGVbXSB7XG4gICAgcmV0dXJuICh4cyB8fCBbXSkucmVkdWNlPEZpZWxkTm9kZVtdPigoZmllbGROb2RlcywgY29sdW1uOiBhbnkpID0+IFtcbiAgICAgICAgLi4uZmllbGROb2RlcyxcbiAgICAgICAgbmV3IEZpZWxkTm9kZShcbiAgICAgICAgICAgIGNvbHVtblsnY291bnQnXSxcbiAgICAgICAgICAgIG51bGxDb3VudEZyb21KU09OKGNvbHVtblsnVkFMSURJVFknXSlcbiAgICAgICAgKSxcbiAgICAgICAgLi4uZmllbGROb2Rlc0Zyb21KU09OKGNvbHVtblsnY2hpbGRyZW4nXSlcbiAgICBdLCBbXSBhcyBGaWVsZE5vZGVbXSk7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBidWZmZXJzRnJvbUpTT04oeHM6IGFueVtdLCBidWZmZXJzOiBCdWZmZXJSZWdpb25bXSA9IFtdKTogQnVmZmVyUmVnaW9uW10ge1xuICAgIGZvciAobGV0IGkgPSAtMSwgbiA9ICh4cyB8fCBbXSkubGVuZ3RoOyArK2kgPCBuOykge1xuICAgICAgICBjb25zdCBjb2x1bW4gPSB4c1tpXTtcbiAgICAgICAgY29sdW1uWydWQUxJRElUWSddICYmIGJ1ZmZlcnMucHVzaChuZXcgQnVmZmVyUmVnaW9uKGJ1ZmZlcnMubGVuZ3RoLCBjb2x1bW5bJ1ZBTElESVRZJ10ubGVuZ3RoKSk7XG4gICAgICAgIGNvbHVtblsnVFlQRSddICYmIGJ1ZmZlcnMucHVzaChuZXcgQnVmZmVyUmVnaW9uKGJ1ZmZlcnMubGVuZ3RoLCBjb2x1bW5bJ1RZUEUnXS5sZW5ndGgpKTtcbiAgICAgICAgY29sdW1uWydPRkZTRVQnXSAmJiBidWZmZXJzLnB1c2gobmV3IEJ1ZmZlclJlZ2lvbihidWZmZXJzLmxlbmd0aCwgY29sdW1uWydPRkZTRVQnXS5sZW5ndGgpKTtcbiAgICAgICAgY29sdW1uWydEQVRBJ10gJiYgYnVmZmVycy5wdXNoKG5ldyBCdWZmZXJSZWdpb24oYnVmZmVycy5sZW5ndGgsIGNvbHVtblsnREFUQSddLmxlbmd0aCkpO1xuICAgICAgICBidWZmZXJzID0gYnVmZmVyc0Zyb21KU09OKGNvbHVtblsnY2hpbGRyZW4nXSwgYnVmZmVycyk7XG4gICAgfVxuICAgIHJldHVybiBidWZmZXJzO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gbnVsbENvdW50RnJvbUpTT04odmFsaWRpdHk6IG51bWJlcltdKSB7XG4gICAgcmV0dXJuICh2YWxpZGl0eSB8fCBbXSkucmVkdWNlKChzdW0sIHZhbCkgPT4gc3VtICsgKyh2YWwgPT09IDApLCAwKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBmdW5jdGlvbiBmaWVsZEZyb21KU09OKF9maWVsZDogYW55LCBkaWN0aW9uYXJpZXM/OiBNYXA8bnVtYmVyLCBEYXRhVHlwZT4sIGRpY3Rpb25hcnlGaWVsZHM/OiBNYXA8bnVtYmVyLCBGaWVsZDxEaWN0aW9uYXJ5PltdPikge1xuXG4gICAgbGV0IGlkOiBudW1iZXI7XG4gICAgbGV0IGtleXM6IFRLZXlzIHwgbnVsbDtcbiAgICBsZXQgZmllbGQ6IEZpZWxkIHwgdm9pZDtcbiAgICBsZXQgZGljdE1ldGE6IGFueTtcbiAgICBsZXQgdHlwZTogRGF0YVR5cGU8YW55PjtcbiAgICBsZXQgZGljdFR5cGU6IERpY3Rpb25hcnk7XG4gICAgbGV0IGRpY3RGaWVsZDogRmllbGQ8RGljdGlvbmFyeT47XG5cbiAgICAvLyBJZiBubyBkaWN0aW9uYXJ5IGVuY29kaW5nLCBvciBpbiB0aGUgcHJvY2VzcyBvZiBkZWNvZGluZyB0aGUgY2hpbGRyZW4gb2YgYSBkaWN0aW9uYXJ5LWVuY29kZWQgZmllbGRcbiAgICBpZiAoIWRpY3Rpb25hcmllcyB8fCAhZGljdGlvbmFyeUZpZWxkcyB8fCAhKGRpY3RNZXRhID0gX2ZpZWxkWydkaWN0aW9uYXJ5J10pKSB7XG4gICAgICAgIHR5cGUgPSB0eXBlRnJvbUpTT04oX2ZpZWxkLCBmaWVsZENoaWxkcmVuRnJvbUpTT04oX2ZpZWxkLCBkaWN0aW9uYXJpZXMsIGRpY3Rpb25hcnlGaWVsZHMpKTtcbiAgICAgICAgZmllbGQgPSBuZXcgRmllbGQoX2ZpZWxkWyduYW1lJ10sIHR5cGUsIF9maWVsZFsnbnVsbGFibGUnXSwgY3VzdG9tTWV0YWRhdGFGcm9tSlNPTihfZmllbGRbJ2N1c3RvbU1ldGFkYXRhJ10pKTtcbiAgICB9XG4gICAgLy8gdHNsaW50OmRpc2FibGVcbiAgICAvLyBJZiBkaWN0aW9uYXJ5IGVuY29kZWQgYW5kIHRoZSBmaXJzdCB0aW1lIHdlJ3ZlIHNlZW4gdGhpcyBkaWN0aW9uYXJ5IGlkLCBkZWNvZGVcbiAgICAvLyB0aGUgZGF0YSB0eXBlIGFuZCBjaGlsZCBmaWVsZHMsIHRoZW4gd3JhcCBpbiBhIERpY3Rpb25hcnkgdHlwZSBhbmQgaW5zZXJ0IHRoZVxuICAgIC8vIGRhdGEgdHlwZSBpbnRvIHRoZSBkaWN0aW9uYXJ5IHR5cGVzIG1hcC5cbiAgICBlbHNlIGlmICghZGljdGlvbmFyaWVzLmhhcyhpZCA9IGRpY3RNZXRhWydpZCddKSkge1xuICAgICAgICAvLyBhIGRpY3Rpb25hcnkgaW5kZXggZGVmYXVsdHMgdG8gc2lnbmVkIDMyIGJpdCBpbnQgaWYgdW5zcGVjaWZpZWRcbiAgICAgICAga2V5cyA9IChrZXlzID0gZGljdE1ldGFbJ2luZGV4VHlwZSddKSA/IGluZGV4VHlwZUZyb21KU09OKGtleXMpIGFzIFRLZXlzIDogbmV3IEludDMyKCk7XG4gICAgICAgIGRpY3Rpb25hcmllcy5zZXQoaWQsIHR5cGUgPSB0eXBlRnJvbUpTT04oX2ZpZWxkLCBmaWVsZENoaWxkcmVuRnJvbUpTT04oX2ZpZWxkKSkpO1xuICAgICAgICBkaWN0VHlwZSA9IG5ldyBEaWN0aW9uYXJ5KHR5cGUsIGtleXMsIGlkLCBkaWN0TWV0YVsnaXNPcmRlcmVkJ10pO1xuICAgICAgICBkaWN0RmllbGQgPSBuZXcgRmllbGQoX2ZpZWxkWyduYW1lJ10sIGRpY3RUeXBlLCBfZmllbGRbJ251bGxhYmxlJ10sIGN1c3RvbU1ldGFkYXRhRnJvbUpTT04oX2ZpZWxkWydjdXN0b21NZXRhZGF0YSddKSk7XG4gICAgICAgIGRpY3Rpb25hcnlGaWVsZHMuc2V0KGlkLCBbZmllbGQgPSBkaWN0RmllbGRdKTtcbiAgICB9XG4gICAgLy8gSWYgZGljdGlvbmFyeSBlbmNvZGVkLCBhbmQgaGF2ZSBhbHJlYWR5IHNlZW4gdGhpcyBkaWN0aW9uYXJ5IElkIGluIHRoZSBzY2hlbWEsIHRoZW4gcmV1c2UgdGhlXG4gICAgLy8gZGF0YSB0eXBlIGFuZCB3cmFwIGluIGEgbmV3IERpY3Rpb25hcnkgdHlwZSBhbmQgZmllbGQuXG4gICAgZWxzZSB7XG4gICAgICAgIC8vIGEgZGljdGlvbmFyeSBpbmRleCBkZWZhdWx0cyB0byBzaWduZWQgMzIgYml0IGludCBpZiB1bnNwZWNpZmllZFxuICAgICAgICBrZXlzID0gKGtleXMgPSBkaWN0TWV0YVsnaW5kZXhUeXBlJ10pID8gaW5kZXhUeXBlRnJvbUpTT04oa2V5cykgYXMgVEtleXMgOiBuZXcgSW50MzIoKTtcbiAgICAgICAgZGljdFR5cGUgPSBuZXcgRGljdGlvbmFyeShkaWN0aW9uYXJpZXMuZ2V0KGlkKSEsIGtleXMsIGlkLCBkaWN0TWV0YVsnaXNPcmRlcmVkJ10pO1xuICAgICAgICBkaWN0RmllbGQgPSBuZXcgRmllbGQoX2ZpZWxkWyduYW1lJ10sIGRpY3RUeXBlLCBfZmllbGRbJ251bGxhYmxlJ10sIGN1c3RvbU1ldGFkYXRhRnJvbUpTT04oX2ZpZWxkWydjdXN0b21NZXRhZGF0YSddKSk7XG4gICAgICAgIGRpY3Rpb25hcnlGaWVsZHMuZ2V0KGlkKSEucHVzaChmaWVsZCA9IGRpY3RGaWVsZCk7XG4gICAgfVxuICAgIHJldHVybiBmaWVsZCB8fCBudWxsO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gY3VzdG9tTWV0YWRhdGFGcm9tSlNPTihfbWV0YWRhdGE/OiBvYmplY3QpIHtcbiAgICByZXR1cm4gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oT2JqZWN0LmVudHJpZXMoX21ldGFkYXRhIHx8IHt9KSk7XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiBpbmRleFR5cGVGcm9tSlNPTihfdHlwZTogYW55KSB7XG4gICAgcmV0dXJuIG5ldyBJbnQoX3R5cGVbJ2lzU2lnbmVkJ10sIF90eXBlWydiaXRXaWR0aCddKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIHR5cGVGcm9tSlNPTihmOiBhbnksIGNoaWxkcmVuPzogRmllbGRbXSk6IERhdGFUeXBlPGFueT4ge1xuXG4gICAgY29uc3QgdHlwZUlkID0gZlsndHlwZSddWyduYW1lJ107XG5cbiAgICBzd2l0Y2ggKHR5cGVJZCkge1xuICAgICAgICBjYXNlICdOT05FJzogICByZXR1cm4gbmV3IERhdGFUeXBlKCk7XG4gICAgICAgIGNhc2UgJ251bGwnOiAgIHJldHVybiBuZXcgTnVsbCgpO1xuICAgICAgICBjYXNlICdiaW5hcnknOiByZXR1cm4gbmV3IEJpbmFyeSgpO1xuICAgICAgICBjYXNlICd1dGY4JzogICByZXR1cm4gbmV3IFV0ZjgoKTtcbiAgICAgICAgY2FzZSAnYm9vbCc6ICAgcmV0dXJuIG5ldyBCb29sKCk7XG4gICAgICAgIGNhc2UgJ2xpc3QnOiAgIHJldHVybiBuZXcgTGlzdCgoY2hpbGRyZW4gfHwgW10pWzBdKTtcbiAgICAgICAgY2FzZSAnc3RydWN0JzogcmV0dXJuIG5ldyBTdHJ1Y3QoY2hpbGRyZW4gfHwgW10pO1xuICAgICAgICBjYXNlICdzdHJ1Y3RfJzogcmV0dXJuIG5ldyBTdHJ1Y3QoY2hpbGRyZW4gfHwgW10pO1xuICAgIH1cblxuICAgIHN3aXRjaCAodHlwZUlkKSB7XG4gICAgICAgIGNhc2UgJ2ludCc6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmWyd0eXBlJ107XG4gICAgICAgICAgICByZXR1cm4gbmV3IEludCh0Wydpc1NpZ25lZCddLCB0WydiaXRXaWR0aCddIGFzIEludEJpdFdpZHRoKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlICdmbG9hdGluZ3BvaW50Jzoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGZbJ3R5cGUnXTtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRmxvYXQoUHJlY2lzaW9uW3RbJ3ByZWNpc2lvbiddXSBhcyBhbnkpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgJ2RlY2ltYWwnOiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZlsndHlwZSddO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBEZWNpbWFsKHRbJ3NjYWxlJ10sIHRbJ3ByZWNpc2lvbiddKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlICdkYXRlJzoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGZbJ3R5cGUnXTtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRGF0ZV8oRGF0ZVVuaXRbdFsndW5pdCddXSBhcyBhbnkpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgJ3RpbWUnOiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZlsndHlwZSddO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBUaW1lKFRpbWVVbml0W3RbJ3VuaXQnXV0gYXMgYW55LCB0WydiaXRXaWR0aCddIGFzIFRpbWVCaXRXaWR0aCk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSAndGltZXN0YW1wJzoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGZbJ3R5cGUnXTtcbiAgICAgICAgICAgIHJldHVybiBuZXcgVGltZXN0YW1wKFRpbWVVbml0W3RbJ3VuaXQnXV0gYXMgYW55LCB0Wyd0aW1lem9uZSddKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlICdpbnRlcnZhbCc6IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBmWyd0eXBlJ107XG4gICAgICAgICAgICByZXR1cm4gbmV3IEludGVydmFsKEludGVydmFsVW5pdFt0Wyd1bml0J11dIGFzIGFueSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSAndW5pb24nOiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZlsndHlwZSddO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBVbmlvbihVbmlvbk1vZGVbdFsnbW9kZSddXSBhcyBhbnksICh0Wyd0eXBlSWRzJ10gfHwgW10pLCBjaGlsZHJlbiB8fCBbXSk7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSAnZml4ZWRzaXplYmluYXJ5Jzoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGZbJ3R5cGUnXTtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRml4ZWRTaXplQmluYXJ5KHRbJ2J5dGVXaWR0aCddKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlICdmaXhlZHNpemVsaXN0Jzoge1xuICAgICAgICAgICAgY29uc3QgdCA9IGZbJ3R5cGUnXTtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRml4ZWRTaXplTGlzdCh0WydsaXN0U2l6ZSddLCAoY2hpbGRyZW4gfHwgW10pWzBdKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlICdtYXAnOiB7XG4gICAgICAgICAgICBjb25zdCB0ID0gZlsndHlwZSddO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNYXBfKGNoaWxkcmVuIHx8IFtdLCB0WydrZXlzU29ydGVkJ10pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgVW5yZWNvZ25pemVkIHR5cGU6IFwiJHt0eXBlSWR9XCJgKTtcbn1cbiJdfQ==

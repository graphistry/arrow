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
import * as type_ from './type';
import * as data_ from './data';
import * as vector_ from './vector';
import * as util_ from './util/int';
import * as visitor_ from './visitor';
import * as view_ from './vector/view';
import { Vector } from './vector';
import { RecordBatch } from './recordbatch';
import { Schema, Field, Type } from './type';
import { Table, CountByResult } from './table';
import { lit, col, Col, Value } from './predicate';
import { read, readAsync } from './ipc/reader/arrow';
export { read, readAsync };
export { Table, CountByResult };
export { lit, col, Col, Value };
export { Field, Schema, RecordBatch, Vector, Type };
export var util;
(function (util) {
    util.Uint64 = util_.Uint64;
    util.Int64 = util_.Int64;
    util.Int128 = util_.Int128;
})(util || (util = {}));
export var data;
(function (data) {
    data.BaseData = data_.BaseData;
    data.FlatData = data_.FlatData;
    data.BoolData = data_.BoolData;
    data.FlatListData = data_.FlatListData;
    data.DictionaryData = data_.DictionaryData;
    data.NestedData = data_.NestedData;
    data.ListData = data_.ListData;
    data.UnionData = data_.UnionData;
    data.SparseUnionData = data_.SparseUnionData;
    data.DenseUnionData = data_.DenseUnionData;
    data.ChunkedData = data_.ChunkedData;
})(data || (data = {}));
export var type;
(function (type) {
    type.Schema = type_.Schema;
    type.Field = type_.Field;
    type.Null = type_.Null;
    type.Int = type_.Int;
    type.Int8 = type_.Int8;
    type.Int16 = type_.Int16;
    type.Int32 = type_.Int32;
    type.Int64 = type_.Int64;
    type.Uint8 = type_.Uint8;
    type.Uint16 = type_.Uint16;
    type.Uint32 = type_.Uint32;
    type.Uint64 = type_.Uint64;
    type.Float = type_.Float;
    type.Float16 = type_.Float16;
    type.Float32 = type_.Float32;
    type.Float64 = type_.Float64;
    type.Binary = type_.Binary;
    type.Utf8 = type_.Utf8;
    type.Bool = type_.Bool;
    type.Decimal = type_.Decimal;
    type.Date_ = type_.Date_;
    type.Time = type_.Time;
    type.Timestamp = type_.Timestamp;
    type.Interval = type_.Interval;
    type.List = type_.List;
    type.Struct = type_.Struct;
    type.Union = type_.Union;
    type.DenseUnion = type_.DenseUnion;
    type.SparseUnion = type_.SparseUnion;
    type.FixedSizeBinary = type_.FixedSizeBinary;
    type.FixedSizeList = type_.FixedSizeList;
    type.Map_ = type_.Map_;
    type.Dictionary = type_.Dictionary;
})(type || (type = {}));
export var vector;
(function (vector) {
    vector.Vector = vector_.Vector;
    vector.NullVector = vector_.NullVector;
    vector.BoolVector = vector_.BoolVector;
    vector.IntVector = vector_.IntVector;
    vector.FloatVector = vector_.FloatVector;
    vector.DateVector = vector_.DateVector;
    vector.DecimalVector = vector_.DecimalVector;
    vector.TimeVector = vector_.TimeVector;
    vector.TimestampVector = vector_.TimestampVector;
    vector.IntervalVector = vector_.IntervalVector;
    vector.BinaryVector = vector_.BinaryVector;
    vector.FixedSizeBinaryVector = vector_.FixedSizeBinaryVector;
    vector.Utf8Vector = vector_.Utf8Vector;
    vector.ListVector = vector_.ListVector;
    vector.FixedSizeListVector = vector_.FixedSizeListVector;
    vector.MapVector = vector_.MapVector;
    vector.StructVector = vector_.StructVector;
    vector.UnionVector = vector_.UnionVector;
    vector.DictionaryVector = vector_.DictionaryVector;
})(vector || (vector = {}));
export var visitor;
(function (visitor) {
    visitor.TypeVisitor = visitor_.TypeVisitor;
    visitor.VectorVisitor = visitor_.VectorVisitor;
})(visitor || (visitor = {}));
export var view;
(function (view) {
    view.ChunkedView = view_.ChunkedView;
    view.DictionaryView = view_.DictionaryView;
    view.ListView = view_.ListView;
    view.FixedSizeListView = view_.FixedSizeListView;
    view.BinaryView = view_.BinaryView;
    view.Utf8View = view_.Utf8View;
    view.UnionView = view_.UnionView;
    view.DenseUnionView = view_.DenseUnionView;
    view.NestedView = view_.NestedView;
    view.StructView = view_.StructView;
    view.MapView = view_.MapView;
    view.FlatView = view_.FlatView;
    view.NullView = view_.NullView;
    view.BoolView = view_.BoolView;
    view.ValidityView = view_.ValidityView;
    view.FixedSizeView = view_.FixedSizeView;
    view.Float16View = view_.Float16View;
    view.DateDayView = view_.DateDayView;
    view.DateMillisecondView = view_.DateMillisecondView;
    view.IntervalYearMonthView = view_.IntervalYearMonthView;
    view.IntervalYearView = view_.IntervalYearView;
    view.IntervalMonthView = view_.IntervalMonthView;
    view.PrimitiveView = view_.PrimitiveView;
})(view || (view = {}));
/* These exports are needed for the closure and uglify umd targets */
try {
    let Arrow = eval('exports');
    if (Arrow && typeof Arrow === 'object') {
        // string indexers tell closure and uglify not to rename these properties
        Arrow['data'] = data;
        Arrow['type'] = type;
        Arrow['util'] = util;
        Arrow['view'] = view;
        Arrow['vector'] = vector;
        Arrow['visitor'] = visitor;
        Arrow['read'] = read;
        Arrow['readAsync'] = readAsync;
        Arrow['Type'] = Type;
        Arrow['Field'] = Field;
        Arrow['Schema'] = Schema;
        Arrow['Vector'] = Vector;
        Arrow['RecordBatch'] = RecordBatch;
        Arrow['Table'] = Table;
        Arrow['CountByResult'] = CountByResult;
        Arrow['Value'] = Value;
        Arrow['lit'] = lit;
        Arrow['col'] = col;
        Arrow['Col'] = Col;
    }
}
catch (e) { }
/* end umd exports */
// closure compiler erases static properties/methods:
// https://github.com/google/closure-compiler/issues/1776
// set them via string indexers to save them from the mangler
Schema['from'] = Schema.from;
Table['from'] = Table.from;
Table['fromAsync'] = Table.fromAsync;
Table['empty'] = Table.empty;
Vector['create'] = Vector.create;
RecordBatch['from'] = RecordBatch.from;
util_.Uint64['add'] = util_.Uint64.add;
util_.Uint64['multiply'] = util_.Uint64.multiply;
util_.Int64['add'] = util_.Int64.add;
util_.Int64['multiply'] = util_.Int64.multiply;
util_.Int64['fromString'] = util_.Int64.fromString;
util_.Int128['add'] = util_.Int128.add;
util_.Int128['multiply'] = util_.Int128.multiply;
util_.Int128['fromString'] = util_.Int128.fromString;
data_.ChunkedData['computeOffsets'] = data_.ChunkedData.computeOffsets;
type_.Type['NONE'] = type_.Type.NONE;
type_.Type['Null'] = type_.Type.Null;
type_.Type['Int'] = type_.Type.Int;
type_.Type['Float'] = type_.Type.Float;
type_.Type['Binary'] = type_.Type.Binary;
type_.Type['Utf8'] = type_.Type.Utf8;
type_.Type['Bool'] = type_.Type.Bool;
type_.Type['Decimal'] = type_.Type.Decimal;
type_.Type['Date'] = type_.Type.Date;
type_.Type['Time'] = type_.Type.Time;
type_.Type['Timestamp'] = type_.Type.Timestamp;
type_.Type['Interval'] = type_.Type.Interval;
type_.Type['List'] = type_.Type.List;
type_.Type['Struct'] = type_.Type.Struct;
type_.Type['Union'] = type_.Type.Union;
type_.Type['FixedSizeBinary'] = type_.Type.FixedSizeBinary;
type_.Type['FixedSizeList'] = type_.Type.FixedSizeList;
type_.Type['Map'] = type_.Type.Map;
type_.Type['Dictionary'] = type_.Type.Dictionary;
type_.Type['DenseUnion'] = type_.Type.DenseUnion;
type_.Type['SparseUnion'] = type_.Type.SparseUnion;
type_.DataType['isNull'] = type_.DataType.isNull;
type_.DataType['isInt'] = type_.DataType.isInt;
type_.DataType['isFloat'] = type_.DataType.isFloat;
type_.DataType['isBinary'] = type_.DataType.isBinary;
type_.DataType['isUtf8'] = type_.DataType.isUtf8;
type_.DataType['isBool'] = type_.DataType.isBool;
type_.DataType['isDecimal'] = type_.DataType.isDecimal;
type_.DataType['isDate'] = type_.DataType.isDate;
type_.DataType['isTime'] = type_.DataType.isTime;
type_.DataType['isTimestamp'] = type_.DataType.isTimestamp;
type_.DataType['isInterval'] = type_.DataType.isInterval;
type_.DataType['isList'] = type_.DataType.isList;
type_.DataType['isStruct'] = type_.DataType.isStruct;
type_.DataType['isUnion'] = type_.DataType.isUnion;
type_.DataType['isDenseUnion'] = type_.DataType.isDenseUnion;
type_.DataType['isSparseUnion'] = type_.DataType.isSparseUnion;
type_.DataType['isFixedSizeBinary'] = type_.DataType.isFixedSizeBinary;
type_.DataType['isFixedSizeList'] = type_.DataType.isFixedSizeList;
type_.DataType['isMap'] = type_.DataType.isMap;
type_.DataType['isDictionary'] = type_.DataType.isDictionary;
vector_.BoolVector['from'] = vector_.BoolVector.from;
vector_.IntVector['from'] = vector_.IntVector.from;
vector_.FloatVector['from'] = vector_.FloatVector.from;
visitor_.TypeVisitor['visitTypeInline'] = visitor_.TypeVisitor.visitTypeInline;
visitor_.VectorVisitor['visitTypeInline'] = visitor_.VectorVisitor.visitTypeInline;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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SSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFDbEIsUUFBRyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUM7SUFDaEIsU0FBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFDbEIsVUFBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUM7SUFDcEIsVUFBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUM7SUFDcEIsVUFBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUM7SUFDcEIsVUFBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUM7SUFDcEIsV0FBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7SUFDdEIsV0FBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7SUFDdEIsV0FBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7SUFDdEIsVUFBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUM7SUFDcEIsWUFBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUM7SUFDeEIsWUFBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUM7SUFDeEIsWUFBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUM7SUFDeEIsV0FBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7SUFDdEIsU0FBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFDbEIsU0FBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFDbEIsWUFBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUM7SUFDeEIsVUFBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUM7SUFDcEIsU0FBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFDbEIsY0FBUyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUM7SUFDNUIsYUFBUSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUM7SUFDMUIsU0FBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFDbEIsV0FBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7SUFDdEIsVUFBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUM7SUFDcEIsZUFB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QUNuRCxPQUFPLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDO0FBRXZELFFBQVEsQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQztBQUMvRSxRQUFRLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUMiLCJmaWxlIjoiQXJyb3cuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0ICogYXMgdHlwZV8gZnJvbSAnLi90eXBlJztcbmltcG9ydCAqIGFzIGRhdGFfIGZyb20gJy4vZGF0YSc7XG5pbXBvcnQgKiBhcyB2ZWN0b3JfIGZyb20gJy4vdmVjdG9yJztcbmltcG9ydCAqIGFzIHV0aWxfIGZyb20gJy4vdXRpbC9pbnQnO1xuaW1wb3J0ICogYXMgdmlzaXRvcl8gZnJvbSAnLi92aXNpdG9yJztcbmltcG9ydCAqIGFzIHZpZXdfIGZyb20gJy4vdmVjdG9yL3ZpZXcnO1xuaW1wb3J0IHsgVmVjdG9yIH0gZnJvbSAnLi92ZWN0b3InO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2ggfSBmcm9tICcuL3JlY29yZGJhdGNoJztcbmltcG9ydCB7IFNjaGVtYSwgRmllbGQsIFR5cGUgfSBmcm9tICcuL3R5cGUnO1xuaW1wb3J0IHsgVGFibGUsIENvdW50QnlSZXN1bHQgfSBmcm9tICcuL3RhYmxlJztcbmltcG9ydCB7IGxpdCwgY29sLCBDb2wsIFZhbHVlIH0gZnJvbSAnLi9wcmVkaWNhdGUnO1xuaW1wb3J0IHsgcmVhZCwgcmVhZEFzeW5jIH0gZnJvbSAnLi9pcGMvcmVhZGVyL2Fycm93JztcblxuZXhwb3J0IGltcG9ydCBWaWV3ID0gdmVjdG9yXy5WaWV3O1xuZXhwb3J0IGltcG9ydCBWZWN0b3JMaWtlID0gdmVjdG9yXy5WZWN0b3JMaWtlO1xuZXhwb3J0IGltcG9ydCBUeXBlZEFycmF5ID0gdHlwZV8uVHlwZWRBcnJheTtcbmV4cG9ydCBpbXBvcnQgSW50Qml0V2lkdGggPSB0eXBlXy5JbnRCaXRXaWR0aDtcbmV4cG9ydCBpbXBvcnQgVGltZUJpdFdpZHRoID0gdHlwZV8uVGltZUJpdFdpZHRoO1xuZXhwb3J0IGltcG9ydCBUeXBlZEFycmF5Q29uc3RydWN0b3IgPSB0eXBlXy5UeXBlZEFycmF5Q29uc3RydWN0b3I7XG5cbmV4cG9ydCB7IHJlYWQsIHJlYWRBc3luYyB9O1xuZXhwb3J0IHsgVGFibGUsIENvdW50QnlSZXN1bHQgfTtcbmV4cG9ydCB7IGxpdCwgY29sLCBDb2wsIFZhbHVlIH07XG5leHBvcnQgeyBGaWVsZCwgU2NoZW1hLCBSZWNvcmRCYXRjaCwgVmVjdG9yLCBUeXBlIH07XG5cbmV4cG9ydCBuYW1lc3BhY2UgdXRpbCB7XG4gICAgZXhwb3J0IGltcG9ydCBVaW50NjQgPSB1dGlsXy5VaW50NjQ7XG4gICAgZXhwb3J0IGltcG9ydCBJbnQ2NCA9IHV0aWxfLkludDY0O1xuICAgIGV4cG9ydCBpbXBvcnQgSW50MTI4ID0gdXRpbF8uSW50MTI4O1xufVxuXG5leHBvcnQgbmFtZXNwYWNlIGRhdGEge1xuICAgIGV4cG9ydCBpbXBvcnQgQmFzZURhdGEgPSBkYXRhXy5CYXNlRGF0YTtcbiAgICBleHBvcnQgaW1wb3J0IEZsYXREYXRhID0gZGF0YV8uRmxhdERhdGE7XG4gICAgZXhwb3J0IGltcG9ydCBCb29sRGF0YSA9IGRhdGFfLkJvb2xEYXRhO1xuICAgIGV4cG9ydCBpbXBvcnQgRmxhdExpc3REYXRhID0gZGF0YV8uRmxhdExpc3REYXRhO1xuICAgIGV4cG9ydCBpbXBvcnQgRGljdGlvbmFyeURhdGEgPSBkYXRhXy5EaWN0aW9uYXJ5RGF0YTtcbiAgICBleHBvcnQgaW1wb3J0IE5lc3RlZERhdGEgPSBkYXRhXy5OZXN0ZWREYXRhO1xuICAgIGV4cG9ydCBpbXBvcnQgTGlzdERhdGEgPSBkYXRhXy5MaXN0RGF0YTtcbiAgICBleHBvcnQgaW1wb3J0IFVuaW9uRGF0YSA9IGRhdGFfLlVuaW9uRGF0YTtcbiAgICBleHBvcnQgaW1wb3J0IFNwYXJzZVVuaW9uRGF0YSA9IGRhdGFfLlNwYXJzZVVuaW9uRGF0YTtcbiAgICBleHBvcnQgaW1wb3J0IERlbnNlVW5pb25EYXRhID0gZGF0YV8uRGVuc2VVbmlvbkRhdGE7XG4gICAgZXhwb3J0IGltcG9ydCBDaHVua2VkRGF0YSA9IGRhdGFfLkNodW5rZWREYXRhO1xufVxuXG5leHBvcnQgbmFtZXNwYWNlIHR5cGUge1xuICAgIGV4cG9ydCBpbXBvcnQgU2NoZW1hID0gdHlwZV8uU2NoZW1hO1xuICAgIGV4cG9ydCBpbXBvcnQgRmllbGQgPSB0eXBlXy5GaWVsZDtcbiAgICBleHBvcnQgaW1wb3J0IE51bGwgPSB0eXBlXy5OdWxsO1xuICAgIGV4cG9ydCBpbXBvcnQgSW50ID0gdHlwZV8uSW50O1xuICAgIGV4cG9ydCBpbXBvcnQgSW50OCA9IHR5cGVfLkludDg7XG4gICAgZXhwb3J0IGltcG9ydCBJbnQxNiA9IHR5cGVfLkludDE2O1xuICAgIGV4cG9ydCBpbXBvcnQgSW50MzIgPSB0eXBlXy5JbnQzMjtcbiAgICBleHBvcnQgaW1wb3J0IEludDY0ID0gdHlwZV8uSW50NjQ7XG4gICAgZXhwb3J0IGltcG9ydCBVaW50OCA9IHR5cGVfLlVpbnQ4O1xuICAgIGV4cG9ydCBpbXBvcnQgVWludDE2ID0gdHlwZV8uVWludDE2O1xuICAgIGV4cG9ydCBpbXBvcnQgVWludDMyID0gdHlwZV8uVWludDMyO1xuICAgIGV4cG9ydCBpbXBvcnQgVWludDY0ID0gdHlwZV8uVWludDY0O1xuICAgIGV4cG9ydCBpbXBvcnQgRmxvYXQgPSB0eXBlXy5GbG9hdDtcbiAgICBleHBvcnQgaW1wb3J0IEZsb2F0MTYgPSB0eXBlXy5GbG9hdDE2O1xuICAgIGV4cG9ydCBpbXBvcnQgRmxvYXQzMiA9IHR5cGVfLkZsb2F0MzI7XG4gICAgZXhwb3J0IGltcG9ydCBGbG9hdDY0ID0gdHlwZV8uRmxvYXQ2NDtcbiAgICBleHBvcnQgaW1wb3J0IEJpbmFyeSA9IHR5cGVfLkJpbmFyeTtcbiAgICBleHBvcnQgaW1wb3J0IFV0ZjggPSB0eXBlXy5VdGY4O1xuICAgIGV4cG9ydCBpbXBvcnQgQm9vbCA9IHR5cGVfLkJvb2w7XG4gICAgZXhwb3J0IGltcG9ydCBEZWNpbWFsID0gdHlwZV8uRGVjaW1hbDtcbiAgICBleHBvcnQgaW1wb3J0IERhdGVfID0gdHlwZV8uRGF0ZV87XG4gICAgZXhwb3J0IGltcG9ydCBUaW1lID0gdHlwZV8uVGltZTtcbiAgICBleHBvcnQgaW1wb3J0IFRpbWVzdGFtcCA9IHR5cGVfLlRpbWVzdGFtcDtcbiAgICBleHBvcnQgaW1wb3J0IEludGVydmFsID0gdHlwZV8uSW50ZXJ2YWw7XG4gICAgZXhwb3J0IGltcG9ydCBMaXN0ID0gdHlwZV8uTGlzdDtcbiAgICBleHBvcnQgaW1wb3J0IFN0cnVjdCA9IHR5cGVfLlN0cnVjdDtcbiAgICBleHBvcnQgaW1wb3J0IFVuaW9uID0gdHlwZV8uVW5pb247XG4gICAgZXhwb3J0IGltcG9ydCBEZW5zZVVuaW9uID0gdHlwZV8uRGVuc2VVbmlvbjtcbiAgICBleHBvcnQgaW1wb3J0IFNwYXJzZVVuaW9uID0gdHlwZV8uU3BhcnNlVW5pb247XG4gICAgZXhwb3J0IGltcG9ydCBGaXhlZFNpemVCaW5hcnkgPSB0eXBlXy5GaXhlZFNpemVCaW5hcnk7XG4gICAgZXhwb3J0IGltcG9ydCBGaXhlZFNpemVMaXN0ID0gdHlwZV8uRml4ZWRTaXplTGlzdDtcbiAgICBleHBvcnQgaW1wb3J0IE1hcF8gPSB0eXBlXy5NYXBfO1xuICAgIGV4cG9ydCBpbXBvcnQgRGljdGlvbmFyeSA9IHR5cGVfLkRpY3Rpb25hcnk7XG59XG5cbmV4cG9ydCBuYW1lc3BhY2UgdmVjdG9yIHtcbiAgICBleHBvcnQgaW1wb3J0IFZlY3RvciA9IHZlY3Rvcl8uVmVjdG9yO1xuICAgIGV4cG9ydCBpbXBvcnQgTnVsbFZlY3RvciA9IHZlY3Rvcl8uTnVsbFZlY3RvcjtcbiAgICBleHBvcnQgaW1wb3J0IEJvb2xWZWN0b3IgPSB2ZWN0b3JfLkJvb2xWZWN0b3I7XG4gICAgZXhwb3J0IGltcG9ydCBJbnRWZWN0b3IgPSB2ZWN0b3JfLkludFZlY3RvcjtcbiAgICBleHBvcnQgaW1wb3J0IEZsb2F0VmVjdG9yID0gdmVjdG9yXy5GbG9hdFZlY3RvcjtcbiAgICBleHBvcnQgaW1wb3J0IERhdGVWZWN0b3IgPSB2ZWN0b3JfLkRhdGVWZWN0b3I7XG4gICAgZXhwb3J0IGltcG9ydCBEZWNpbWFsVmVjdG9yID0gdmVjdG9yXy5EZWNpbWFsVmVjdG9yO1xuICAgIGV4cG9ydCBpbXBvcnQgVGltZVZlY3RvciA9IHZlY3Rvcl8uVGltZVZlY3RvcjtcbiAgICBleHBvcnQgaW1wb3J0IFRpbWVzdGFtcFZlY3RvciA9IHZlY3Rvcl8uVGltZXN0YW1wVmVjdG9yO1xuICAgIGV4cG9ydCBpbXBvcnQgSW50ZXJ2YWxWZWN0b3IgPSB2ZWN0b3JfLkludGVydmFsVmVjdG9yO1xuICAgIGV4cG9ydCBpbXBvcnQgQmluYXJ5VmVjdG9yID0gdmVjdG9yXy5CaW5hcnlWZWN0b3I7XG4gICAgZXhwb3J0IGltcG9ydCBGaXhlZFNpemVCaW5hcnlWZWN0b3IgPSB2ZWN0b3JfLkZpeGVkU2l6ZUJpbmFyeVZlY3RvcjtcbiAgICBleHBvcnQgaW1wb3J0IFV0ZjhWZWN0b3IgPSB2ZWN0b3JfLlV0ZjhWZWN0b3I7XG4gICAgZXhwb3J0IGltcG9ydCBMaXN0VmVjdG9yID0gdmVjdG9yXy5MaXN0VmVjdG9yO1xuICAgIGV4cG9ydCBpbXBvcnQgRml4ZWRTaXplTGlzdFZlY3RvciA9IHZlY3Rvcl8uRml4ZWRTaXplTGlzdFZlY3RvcjtcbiAgICBleHBvcnQgaW1wb3J0IE1hcFZlY3RvciA9IHZlY3Rvcl8uTWFwVmVjdG9yO1xuICAgIGV4cG9ydCBpbXBvcnQgU3RydWN0VmVjdG9yID0gdmVjdG9yXy5TdHJ1Y3RWZWN0b3I7XG4gICAgZXhwb3J0IGltcG9ydCBVbmlvblZlY3RvciA9IHZlY3Rvcl8uVW5pb25WZWN0b3I7XG4gICAgZXhwb3J0IGltcG9ydCBEaWN0aW9uYXJ5VmVjdG9yID0gdmVjdG9yXy5EaWN0aW9uYXJ5VmVjdG9yO1xufVxuXG5leHBvcnQgbmFtZXNwYWNlIHZpc2l0b3Ige1xuICAgIGV4cG9ydCBpbXBvcnQgVHlwZVZpc2l0b3IgPSB2aXNpdG9yXy5UeXBlVmlzaXRvcjtcbiAgICBleHBvcnQgaW1wb3J0IFZlY3RvclZpc2l0b3IgPSB2aXNpdG9yXy5WZWN0b3JWaXNpdG9yO1xufVxuXG5leHBvcnQgbmFtZXNwYWNlIHZpZXcge1xuICAgIGV4cG9ydCBpbXBvcnQgQ2h1bmtlZFZpZXcgPSB2aWV3Xy5DaHVua2VkVmlldztcbiAgICBleHBvcnQgaW1wb3J0IERpY3Rpb25hcnlWaWV3ID0gdmlld18uRGljdGlvbmFyeVZpZXc7XG4gICAgZXhwb3J0IGltcG9ydCBMaXN0VmlldyA9IHZpZXdfLkxpc3RWaWV3O1xuICAgIGV4cG9ydCBpbXBvcnQgRml4ZWRTaXplTGlzdFZpZXcgPSB2aWV3Xy5GaXhlZFNpemVMaXN0VmlldztcbiAgICBleHBvcnQgaW1wb3J0IEJpbmFyeVZpZXcgPSB2aWV3Xy5CaW5hcnlWaWV3O1xuICAgIGV4cG9ydCBpbXBvcnQgVXRmOFZpZXcgPSB2aWV3Xy5VdGY4VmlldztcbiAgICBleHBvcnQgaW1wb3J0IFVuaW9uVmlldyA9IHZpZXdfLlVuaW9uVmlldztcbiAgICBleHBvcnQgaW1wb3J0IERlbnNlVW5pb25WaWV3ID0gdmlld18uRGVuc2VVbmlvblZpZXc7XG4gICAgZXhwb3J0IGltcG9ydCBOZXN0ZWRWaWV3ID0gdmlld18uTmVzdGVkVmlldztcbiAgICBleHBvcnQgaW1wb3J0IFN0cnVjdFZpZXcgPSB2aWV3Xy5TdHJ1Y3RWaWV3O1xuICAgIGV4cG9ydCBpbXBvcnQgTWFwVmlldyA9IHZpZXdfLk1hcFZpZXc7XG4gICAgZXhwb3J0IGltcG9ydCBGbGF0VmlldyA9IHZpZXdfLkZsYXRWaWV3O1xuICAgIGV4cG9ydCBpbXBvcnQgTnVsbFZpZXcgPSB2aWV3Xy5OdWxsVmlldztcbiAgICBleHBvcnQgaW1wb3J0IEJvb2xWaWV3ID0gdmlld18uQm9vbFZpZXc7XG4gICAgZXhwb3J0IGltcG9ydCBWYWxpZGl0eVZpZXcgPSB2aWV3Xy5WYWxpZGl0eVZpZXc7XG4gICAgZXhwb3J0IGltcG9ydCBGaXhlZFNpemVWaWV3ID0gdmlld18uRml4ZWRTaXplVmlldztcbiAgICBleHBvcnQgaW1wb3J0IEZsb2F0MTZWaWV3ID0gdmlld18uRmxvYXQxNlZpZXc7XG4gICAgZXhwb3J0IGltcG9ydCBEYXRlRGF5VmlldyA9IHZpZXdfLkRhdGVEYXlWaWV3O1xuICAgIGV4cG9ydCBpbXBvcnQgRGF0ZU1pbGxpc2Vjb25kVmlldyA9IHZpZXdfLkRhdGVNaWxsaXNlY29uZFZpZXc7XG4gICAgZXhwb3J0IGltcG9ydCBJbnRlcnZhbFllYXJNb250aFZpZXcgPSB2aWV3Xy5JbnRlcnZhbFllYXJNb250aFZpZXc7XG4gICAgZXhwb3J0IGltcG9ydCBJbnRlcnZhbFllYXJWaWV3ID0gdmlld18uSW50ZXJ2YWxZZWFyVmlldztcbiAgICBleHBvcnQgaW1wb3J0IEludGVydmFsTW9udGhWaWV3ID0gdmlld18uSW50ZXJ2YWxNb250aFZpZXc7XG4gICAgZXhwb3J0IGltcG9ydCBQcmltaXRpdmVWaWV3ID0gdmlld18uUHJpbWl0aXZlVmlldztcbn1cblxuLyogVGhlc2UgZXhwb3J0cyBhcmUgbmVlZGVkIGZvciB0aGUgY2xvc3VyZSBhbmQgdWdsaWZ5IHVtZCB0YXJnZXRzICovXG50cnkge1xuICAgIGxldCBBcnJvdzogYW55ID0gZXZhbCgnZXhwb3J0cycpO1xuICAgIGlmIChBcnJvdyAmJiB0eXBlb2YgQXJyb3cgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIC8vIHN0cmluZyBpbmRleGVycyB0ZWxsIGNsb3N1cmUgYW5kIHVnbGlmeSBub3QgdG8gcmVuYW1lIHRoZXNlIHByb3BlcnRpZXNcbiAgICAgICAgQXJyb3dbJ2RhdGEnXSA9IGRhdGE7XG4gICAgICAgIEFycm93Wyd0eXBlJ10gPSB0eXBlO1xuICAgICAgICBBcnJvd1sndXRpbCddID0gdXRpbDtcbiAgICAgICAgQXJyb3dbJ3ZpZXcnXSA9IHZpZXc7XG4gICAgICAgIEFycm93Wyd2ZWN0b3InXSA9IHZlY3RvcjtcbiAgICAgICAgQXJyb3dbJ3Zpc2l0b3InXSA9IHZpc2l0b3I7XG5cbiAgICAgICAgQXJyb3dbJ3JlYWQnXSA9IHJlYWQ7XG4gICAgICAgIEFycm93WydyZWFkQXN5bmMnXSA9IHJlYWRBc3luYztcblxuICAgICAgICBBcnJvd1snVHlwZSddID0gVHlwZTtcbiAgICAgICAgQXJyb3dbJ0ZpZWxkJ10gPSBGaWVsZDtcbiAgICAgICAgQXJyb3dbJ1NjaGVtYSddID0gU2NoZW1hO1xuICAgICAgICBBcnJvd1snVmVjdG9yJ10gPSBWZWN0b3I7XG4gICAgICAgIEFycm93WydSZWNvcmRCYXRjaCddID0gUmVjb3JkQmF0Y2g7XG5cbiAgICAgICAgQXJyb3dbJ1RhYmxlJ10gPSBUYWJsZTtcbiAgICAgICAgQXJyb3dbJ0NvdW50QnlSZXN1bHQnXSA9IENvdW50QnlSZXN1bHQ7XG4gICAgICAgIEFycm93WydWYWx1ZSddID0gVmFsdWU7XG4gICAgICAgIEFycm93WydsaXQnXSA9IGxpdDtcbiAgICAgICAgQXJyb3dbJ2NvbCddID0gY29sO1xuICAgICAgICBBcnJvd1snQ29sJ10gPSBDb2w7XG4gICAgfVxufSBjYXRjaCAoZSkgeyAvKiBub3QgdGhlIFVNRCBidW5kbGUgKi8gfVxuLyogZW5kIHVtZCBleHBvcnRzICovXG5cbi8vIGNsb3N1cmUgY29tcGlsZXIgZXJhc2VzIHN0YXRpYyBwcm9wZXJ0aWVzL21ldGhvZHM6XG4vLyBodHRwczovL2dpdGh1Yi5jb20vZ29vZ2xlL2Nsb3N1cmUtY29tcGlsZXIvaXNzdWVzLzE3NzZcbi8vIHNldCB0aGVtIHZpYSBzdHJpbmcgaW5kZXhlcnMgdG8gc2F2ZSB0aGVtIGZyb20gdGhlIG1hbmdsZXJcblNjaGVtYVsnZnJvbSddID0gU2NoZW1hLmZyb207XG5UYWJsZVsnZnJvbSddID0gVGFibGUuZnJvbTtcblRhYmxlWydmcm9tQXN5bmMnXSA9IFRhYmxlLmZyb21Bc3luYztcblRhYmxlWydlbXB0eSddID0gVGFibGUuZW1wdHk7XG5WZWN0b3JbJ2NyZWF0ZSddID0gVmVjdG9yLmNyZWF0ZTtcblJlY29yZEJhdGNoWydmcm9tJ10gPSBSZWNvcmRCYXRjaC5mcm9tO1xuXG51dGlsXy5VaW50NjRbJ2FkZCddID0gdXRpbF8uVWludDY0LmFkZDtcbnV0aWxfLlVpbnQ2NFsnbXVsdGlwbHknXSA9IHV0aWxfLlVpbnQ2NC5tdWx0aXBseTtcblxudXRpbF8uSW50NjRbJ2FkZCddID0gdXRpbF8uSW50NjQuYWRkO1xudXRpbF8uSW50NjRbJ211bHRpcGx5J10gPSB1dGlsXy5JbnQ2NC5tdWx0aXBseTtcbnV0aWxfLkludDY0Wydmcm9tU3RyaW5nJ10gPSB1dGlsXy5JbnQ2NC5mcm9tU3RyaW5nO1xuXG51dGlsXy5JbnQxMjhbJ2FkZCddID0gdXRpbF8uSW50MTI4LmFkZDtcbnV0aWxfLkludDEyOFsnbXVsdGlwbHknXSA9IHV0aWxfLkludDEyOC5tdWx0aXBseTtcbnV0aWxfLkludDEyOFsnZnJvbVN0cmluZyddID0gdXRpbF8uSW50MTI4LmZyb21TdHJpbmc7XG5cbmRhdGFfLkNodW5rZWREYXRhWydjb21wdXRlT2Zmc2V0cyddID0gZGF0YV8uQ2h1bmtlZERhdGEuY29tcHV0ZU9mZnNldHM7XG5cbih0eXBlXy5UeXBlIGFzIGFueSlbJ05PTkUnXSA9IHR5cGVfLlR5cGUuTk9ORTtcbih0eXBlXy5UeXBlIGFzIGFueSlbJ051bGwnXSA9IHR5cGVfLlR5cGUuTnVsbDtcbih0eXBlXy5UeXBlIGFzIGFueSlbJ0ludCddID0gdHlwZV8uVHlwZS5JbnQ7XG4odHlwZV8uVHlwZSBhcyBhbnkpWydGbG9hdCddID0gdHlwZV8uVHlwZS5GbG9hdDtcbih0eXBlXy5UeXBlIGFzIGFueSlbJ0JpbmFyeSddID0gdHlwZV8uVHlwZS5CaW5hcnk7XG4odHlwZV8uVHlwZSBhcyBhbnkpWydVdGY4J10gPSB0eXBlXy5UeXBlLlV0Zjg7XG4odHlwZV8uVHlwZSBhcyBhbnkpWydCb29sJ10gPSB0eXBlXy5UeXBlLkJvb2w7XG4odHlwZV8uVHlwZSBhcyBhbnkpWydEZWNpbWFsJ10gPSB0eXBlXy5UeXBlLkRlY2ltYWw7XG4odHlwZV8uVHlwZSBhcyBhbnkpWydEYXRlJ10gPSB0eXBlXy5UeXBlLkRhdGU7XG4odHlwZV8uVHlwZSBhcyBhbnkpWydUaW1lJ10gPSB0eXBlXy5UeXBlLlRpbWU7XG4odHlwZV8uVHlwZSBhcyBhbnkpWydUaW1lc3RhbXAnXSA9IHR5cGVfLlR5cGUuVGltZXN0YW1wO1xuKHR5cGVfLlR5cGUgYXMgYW55KVsnSW50ZXJ2YWwnXSA9IHR5cGVfLlR5cGUuSW50ZXJ2YWw7XG4odHlwZV8uVHlwZSBhcyBhbnkpWydMaXN0J10gPSB0eXBlXy5UeXBlLkxpc3Q7XG4odHlwZV8uVHlwZSBhcyBhbnkpWydTdHJ1Y3QnXSA9IHR5cGVfLlR5cGUuU3RydWN0O1xuKHR5cGVfLlR5cGUgYXMgYW55KVsnVW5pb24nXSA9IHR5cGVfLlR5cGUuVW5pb247XG4odHlwZV8uVHlwZSBhcyBhbnkpWydGaXhlZFNpemVCaW5hcnknXSA9IHR5cGVfLlR5cGUuRml4ZWRTaXplQmluYXJ5O1xuKHR5cGVfLlR5cGUgYXMgYW55KVsnRml4ZWRTaXplTGlzdCddID0gdHlwZV8uVHlwZS5GaXhlZFNpemVMaXN0O1xuKHR5cGVfLlR5cGUgYXMgYW55KVsnTWFwJ10gPSB0eXBlXy5UeXBlLk1hcDtcbih0eXBlXy5UeXBlIGFzIGFueSlbJ0RpY3Rpb25hcnknXSA9IHR5cGVfLlR5cGUuRGljdGlvbmFyeTtcbih0eXBlXy5UeXBlIGFzIGFueSlbJ0RlbnNlVW5pb24nXSA9IHR5cGVfLlR5cGUuRGVuc2VVbmlvbjtcbih0eXBlXy5UeXBlIGFzIGFueSlbJ1NwYXJzZVVuaW9uJ10gPSB0eXBlXy5UeXBlLlNwYXJzZVVuaW9uO1xuXG50eXBlXy5EYXRhVHlwZVsnaXNOdWxsJ10gPSB0eXBlXy5EYXRhVHlwZS5pc051bGw7XG50eXBlXy5EYXRhVHlwZVsnaXNJbnQnXSA9IHR5cGVfLkRhdGFUeXBlLmlzSW50O1xudHlwZV8uRGF0YVR5cGVbJ2lzRmxvYXQnXSA9IHR5cGVfLkRhdGFUeXBlLmlzRmxvYXQ7XG50eXBlXy5EYXRhVHlwZVsnaXNCaW5hcnknXSA9IHR5cGVfLkRhdGFUeXBlLmlzQmluYXJ5O1xudHlwZV8uRGF0YVR5cGVbJ2lzVXRmOCddID0gdHlwZV8uRGF0YVR5cGUuaXNVdGY4O1xudHlwZV8uRGF0YVR5cGVbJ2lzQm9vbCddID0gdHlwZV8uRGF0YVR5cGUuaXNCb29sO1xudHlwZV8uRGF0YVR5cGVbJ2lzRGVjaW1hbCddID0gdHlwZV8uRGF0YVR5cGUuaXNEZWNpbWFsO1xudHlwZV8uRGF0YVR5cGVbJ2lzRGF0ZSddID0gdHlwZV8uRGF0YVR5cGUuaXNEYXRlO1xudHlwZV8uRGF0YVR5cGVbJ2lzVGltZSddID0gdHlwZV8uRGF0YVR5cGUuaXNUaW1lO1xudHlwZV8uRGF0YVR5cGVbJ2lzVGltZXN0YW1wJ10gPSB0eXBlXy5EYXRhVHlwZS5pc1RpbWVzdGFtcDtcbnR5cGVfLkRhdGFUeXBlWydpc0ludGVydmFsJ10gPSB0eXBlXy5EYXRhVHlwZS5pc0ludGVydmFsO1xudHlwZV8uRGF0YVR5cGVbJ2lzTGlzdCddID0gdHlwZV8uRGF0YVR5cGUuaXNMaXN0O1xudHlwZV8uRGF0YVR5cGVbJ2lzU3RydWN0J10gPSB0eXBlXy5EYXRhVHlwZS5pc1N0cnVjdDtcbnR5cGVfLkRhdGFUeXBlWydpc1VuaW9uJ10gPSB0eXBlXy5EYXRhVHlwZS5pc1VuaW9uO1xudHlwZV8uRGF0YVR5cGVbJ2lzRGVuc2VVbmlvbiddID0gdHlwZV8uRGF0YVR5cGUuaXNEZW5zZVVuaW9uO1xudHlwZV8uRGF0YVR5cGVbJ2lzU3BhcnNlVW5pb24nXSA9IHR5cGVfLkRhdGFUeXBlLmlzU3BhcnNlVW5pb247XG50eXBlXy5EYXRhVHlwZVsnaXNGaXhlZFNpemVCaW5hcnknXSA9IHR5cGVfLkRhdGFUeXBlLmlzRml4ZWRTaXplQmluYXJ5O1xudHlwZV8uRGF0YVR5cGVbJ2lzRml4ZWRTaXplTGlzdCddID0gdHlwZV8uRGF0YVR5cGUuaXNGaXhlZFNpemVMaXN0O1xudHlwZV8uRGF0YVR5cGVbJ2lzTWFwJ10gPSB0eXBlXy5EYXRhVHlwZS5pc01hcDtcbnR5cGVfLkRhdGFUeXBlWydpc0RpY3Rpb25hcnknXSA9IHR5cGVfLkRhdGFUeXBlLmlzRGljdGlvbmFyeTtcblxudmVjdG9yXy5Cb29sVmVjdG9yWydmcm9tJ10gPSB2ZWN0b3JfLkJvb2xWZWN0b3IuZnJvbTtcbnZlY3Rvcl8uSW50VmVjdG9yWydmcm9tJ10gPSB2ZWN0b3JfLkludFZlY3Rvci5mcm9tO1xudmVjdG9yXy5GbG9hdFZlY3RvclsnZnJvbSddID0gdmVjdG9yXy5GbG9hdFZlY3Rvci5mcm9tO1xuXG52aXNpdG9yXy5UeXBlVmlzaXRvclsndmlzaXRUeXBlSW5saW5lJ10gPSB2aXNpdG9yXy5UeXBlVmlzaXRvci52aXNpdFR5cGVJbmxpbmU7XG52aXNpdG9yXy5WZWN0b3JWaXNpdG9yWyd2aXNpdFR5cGVJbmxpbmUnXSA9IHZpc2l0b3JfLlZlY3RvclZpc2l0b3IudmlzaXRUeXBlSW5saW5lOyJdfQ==

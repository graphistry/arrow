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
export var ArrowType = Schema_.org.apache.arrow.flatbuf.Type;
export var DateUnit = Schema_.org.apache.arrow.flatbuf.DateUnit;
export var TimeUnit = Schema_.org.apache.arrow.flatbuf.TimeUnit;
export var Precision = Schema_.org.apache.arrow.flatbuf.Precision;
export var UnionMode = Schema_.org.apache.arrow.flatbuf.UnionMode;
export var VectorType = Schema_.org.apache.arrow.flatbuf.VectorType;
export var IntervalUnit = Schema_.org.apache.arrow.flatbuf.IntervalUnit;
export var MessageHeader = Message_.org.apache.arrow.flatbuf.MessageHeader;
export var MetadataVersion = Schema_.org.apache.arrow.flatbuf.MetadataVersion;
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
    // These enum values are here so that TypeScript can narrow the type signatures further
    // beyond the base Arrow types. The base Arrow types include metadata like bitWidths that
    // impact the type signatures of the values we return. For example, the Int8Vector reads
    // 1-byte numbers from an Int8Array, an Int32Vector reads a 4-byte number from an Int32Array,
    // and an Int64Vector reads a pair of 4-byte lo, hi int32s, and returns them as a zero-copy
    // slice from an underlying Int32Array. Library consumers benefit by doing this type narrowing,
    // since we can ensure the types across all public methods are propagated and never bail to `any`.
    // These values are _never_ actually used at runtime, and they will _never_ be written into the
    // flatbuffers metadata of serialized Arrow IPC payloads.
    Type[Type["Dictionary"] = -1] = "Dictionary";
    Type[Type["Int8"] = -2] = "Int8";
    Type[Type["Int16"] = -3] = "Int16";
    Type[Type["Int32"] = -4] = "Int32";
    Type[Type["Int64"] = -5] = "Int64";
    Type[Type["Uint8"] = -6] = "Uint8";
    Type[Type["Uint16"] = -7] = "Uint16";
    Type[Type["Uint32"] = -8] = "Uint32";
    Type[Type["Uint64"] = -9] = "Uint64";
    Type[Type["Float16"] = -10] = "Float16";
    Type[Type["Float32"] = -11] = "Float32";
    Type[Type["Float64"] = -12] = "Float64";
    Type[Type["DateDay"] = -13] = "DateDay";
    Type[Type["DateMillisecond"] = -14] = "DateMillisecond";
    Type[Type["TimestampSecond"] = -15] = "TimestampSecond";
    Type[Type["TimestampMillisecond"] = -16] = "TimestampMillisecond";
    Type[Type["TimestampMicrosecond"] = -17] = "TimestampMicrosecond";
    Type[Type["TimestampNanosecond"] = -18] = "TimestampNanosecond";
    Type[Type["TimeSecond"] = -19] = "TimeSecond";
    Type[Type["TimeMillisecond"] = -20] = "TimeMillisecond";
    Type[Type["TimeMicrosecond"] = -21] = "TimeMicrosecond";
    Type[Type["TimeNanosecond"] = -22] = "TimeNanosecond";
    Type[Type["DenseUnion"] = -23] = "DenseUnion";
    Type[Type["SparseUnion"] = -24] = "SparseUnion";
    Type[Type["IntervalDayTime"] = -25] = "IntervalDayTime";
    Type[Type["IntervalYearMonth"] = -26] = "IntervalYearMonth";
})(Type || (Type = {}));
// (Type as any).NONE = Type['NONE'];
// (Type as any).Null = Type['Null'];
// (Type as any).Int = Type['Int'];
// (Type as any).Float = Type['Float'];
// (Type as any).Binary = Type['Binary'];
// (Type as any).Utf8 = Type['Utf8'];
// (Type as any).Bool = Type['Bool'];
// (Type as any).Decimal = Type['Decimal'];
// (Type as any).Date = Type['Date'];
// (Type as any).Time = Type['Time'];
// (Type as any).Timestamp = Type['Timestamp'];
// (Type as any).Interval = Type['Interval'];
// (Type as any).List = Type['List'];
// (Type as any).Struct = Type['Struct'];
// (Type as any).Union = Type['Union'];
// (Type as any).FixedSizeBinary = Type['FixedSizeBinary'];
// (Type as any).FixedSizeList = Type['FixedSizeList'];
// (Type as any).Map = Type['Map'];
// (Type as any).Dictionary = Type['Dictionary'];
// (Type as any).Int8 = Type['Int8'];
// (Type as any).Int16 = Type['Int16'];
// (Type as any).Int32 = Type['Int32'];
// (Type as any).Int64 = Type['Int64'];
// (Type as any).Uint8 = Type['Uint8'];
// (Type as any).Uint16 = Type['Uint16'];
// (Type as any).Uint32 = Type['Uint32'];
// (Type as any).Uint64 = Type['Uint64'];
// (Type as any).Float16 = Type['Float16'];
// (Type as any).Float32 = Type['Float32'];
// (Type as any).Float64 = Type['Float64'];
// (Type as any).DateDay = Type['DateDay'];
// (Type as any).DateMillisecond = Type['DateMillisecond'];
// (Type as any).TimestampSecond = Type['TimestampSecond'];
// (Type as any).TimestampMillisecond = Type['TimestampMillisecond'];
// (Type as any).TimestampMicrosecond = Type['TimestampMicrosecond'];
// (Type as any).TimestampNanosecond = Type['TimestampNanosecond'];
// (Type as any).TimeSecond = Type['TimeSecond'];
// (Type as any).TimeMillisecond = Type['TimeMillisecond'];
// (Type as any).TimeMicrosecond = Type['TimeMicrosecond'];
// (Type as any).TimeNanosecond = Type['TimeNanosecond'];
// (Type as any).DenseUnion = Type['DenseUnion'];
// (Type as any).SparseUnion = Type['SparseUnion'];
// (Type as any).IntervalDayTime = Type['IntervalDayTime'];
// (Type as any).IntervalYearMonth = Type['IntervalYearMonth'];
// (ArrowType as any).NONE = ArrowType['NONE'];
// (ArrowType as any).Null = ArrowType['Null'];
// (ArrowType as any).Int = ArrowType['Int'];
// (ArrowType as any).FloatingPoint = ArrowType['FloatingPoint'];
// (ArrowType as any).Binary = ArrowType['Binary'];
// (ArrowType as any).Utf8 = ArrowType['Utf8'];
// (ArrowType as any).Bool = ArrowType['Bool'];
// (ArrowType as any).Decimal = ArrowType['Decimal'];
// (ArrowType as any).Date = ArrowType['Date'];
// (ArrowType as any).Time = ArrowType['Time'];
// (ArrowType as any).Timestamp = ArrowType['Timestamp'];
// (ArrowType as any).Interval = ArrowType['Interval'];
// (ArrowType as any).List = ArrowType['List'];
// (ArrowType as any).Struct_ = ArrowType['Struct_'];
// (ArrowType as any).Union = ArrowType['Union'];
// (ArrowType as any).FixedSizeBinary = ArrowType['FixedSizeBinary'];
// (ArrowType as any).FixedSizeList = ArrowType['FixedSizeList'];
// (ArrowType as any).Map = ArrowType['Map'];
// (DateUnit as any).DAY = DateUnit['DAY'];
// (DateUnit as any).MILLISECOND = DateUnit['MILLISECOND'];
// (TimeUnit as any).SECOND = TimeUnit['SECOND'];
// (TimeUnit as any).MILLISECOND = TimeUnit['MILLISECOND'];
// (TimeUnit as any).MICROSECOND = TimeUnit['MICROSECOND'];
// (TimeUnit as any).NANOSECOND = TimeUnit['NANOSECOND'];
// (Precision as any).HALF = Precision['HALF'];
// (Precision as any).SINGLE = Precision['SINGLE'];
// (Precision as any).DOUBLE = Precision['DOUBLE'];
// (UnionMode as any).Sparse = UnionMode['Sparse'];
// (UnionMode as any).Dense = UnionMode['Dense'];
// (VectorType as any).OFFSET = VectorType['OFFSET'];
// (VectorType as any).DATA = VectorType['DATA'];
// (VectorType as any).VALIDITY = VectorType['VALIDITY'];
// (VectorType as any).TYPE = VectorType['TYPE'];
// (IntervalUnit as any).YEAR_MONTH = IntervalUnit['YEAR_MONTH'];
// (IntervalUnit as any).DAY_TIME = IntervalUnit['DAY_TIME'];
// (MessageHeader as any).NONE = MessageHeader['NONE'];
// (MessageHeader as any).Schema = MessageHeader['Schema'];
// (MessageHeader as any).DictionaryBatch = MessageHeader['DictionaryBatch'];
// (MessageHeader as any).RecordBatch = MessageHeader['RecordBatch'];
// (MessageHeader as any).Tensor = MessageHeader['Tensor'];
// (MetadataVersion as any).V1 = MetadataVersion['V1'];
// (MetadataVersion as any).V2 = MetadataVersion['V2'];
// (MetadataVersion as any).V3 = MetadataVersion['V3'];
// (MetadataVersion as any).V4 = MetadataVersion['V4'];

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LCtDQUErQztBQUMvQyw2Q0FBNkM7QUFDN0MsaUVBQWlFO0FBQ2pFLG1EQUFtRDtBQUNuRCwrQ0FBK0M7QUFDL0MsK0NBQStDO0FBQy9DLHFEQUFxRDtBQUNyRCwrQ0FBK0M7QUFDL0MsK0NBQStDO0FBQy9DLHlEQUF5RDtBQUN6RCx1REFBdUQ7QUFDdkQsK0NBQStDO0FBQy9DLHFEQUFxRDtBQUNyRCxpREFBaUQ7QUFDakQscUVBQXFFO0FBQ3JFLGlFQUFpRTtBQUNqRSw2Q0FBNkM7QUFFN0MsMkNBQTJDO0FBQzNDLDJEQUEyRDtBQUUzRCxpREFBaUQ7QUFDakQsMkRBQTJEO0FBQzNELDJEQUEyRDtBQUMzRCx5REFBeUQ7QUFFekQsK0NBQStDO0FBQy9DLG1EQUFtRDtBQUNuRCxtREFBbUQ7QUFFbkQsbURBQW1EO0FBQ25ELGlEQUFpRDtBQUVqRCxxREFBcUQ7QUFDckQsaURBQWlEO0FBQ2pELHlEQUF5RDtBQUN6RCxpREFBaUQ7QUFFakQsaUVBQWlFO0FBQ2pFLDZEQUE2RDtBQUU3RCx1REFBdUQ7QUFDdkQsMkRBQTJEO0FBQzNELDZFQUE2RTtBQUM3RSxxRUFBcUU7QUFDckUsMkRBQTJEO0FBRTNELHVEQUF1RDtBQUN2RCx1REFBdUQ7QUFDdkQsdURBQXVEO0FBQ3ZELHVEQUF1RCIsImZpbGUiOiJlbnVtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCAqIGFzIFNjaGVtYV8gZnJvbSAnLi9mYi9TY2hlbWEnO1xuaW1wb3J0ICogYXMgTWVzc2FnZV8gZnJvbSAnLi9mYi9NZXNzYWdlJztcblxuZXhwb3J0IGltcG9ydCBBcnJvd1R5cGUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UeXBlO1xuZXhwb3J0IGltcG9ydCBEYXRlVW5pdCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRhdGVVbml0O1xuZXhwb3J0IGltcG9ydCBUaW1lVW5pdCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlRpbWVVbml0O1xuZXhwb3J0IGltcG9ydCBQcmVjaXNpb24gPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5QcmVjaXNpb247XG5leHBvcnQgaW1wb3J0IFVuaW9uTW9kZSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlVuaW9uTW9kZTtcbmV4cG9ydCBpbXBvcnQgVmVjdG9yVHlwZSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlZlY3RvclR5cGU7XG5leHBvcnQgaW1wb3J0IEludGVydmFsVW5pdCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkludGVydmFsVW5pdDtcbmV4cG9ydCBpbXBvcnQgTWVzc2FnZUhlYWRlciA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NZXNzYWdlSGVhZGVyO1xuZXhwb3J0IGltcG9ydCBNZXRhZGF0YVZlcnNpb24gPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NZXRhZGF0YVZlcnNpb247XG5cbi8qKlxuICogKlxuICogTWFpbiBkYXRhIHR5cGUgZW51bWVyYXRpb246XG4gKiAqXG4gKiBEYXRhIHR5cGVzIGluIHRoaXMgbGlicmFyeSBhcmUgYWxsICpsb2dpY2FsKi4gVGhleSBjYW4gYmUgZXhwcmVzc2VkIGFzXG4gKiBlaXRoZXIgYSBwcmltaXRpdmUgcGh5c2ljYWwgdHlwZSAoYnl0ZXMgb3IgYml0cyBvZiBzb21lIGZpeGVkIHNpemUpLCBhXG4gKiBuZXN0ZWQgdHlwZSBjb25zaXN0aW5nIG9mIG90aGVyIGRhdGEgdHlwZXMsIG9yIGFub3RoZXIgZGF0YSB0eXBlIChlLmcuIGFcbiAqIHRpbWVzdGFtcCBlbmNvZGVkIGFzIGFuIGludDY0KVxuICovXG5leHBvcnQgZW51bSBUeXBlIHtcbiAgICBOT05FICAgICAgICAgICAgPSAgMCwgIC8vIFRoZSBkZWZhdWx0IHBsYWNlaG9sZGVyIHR5cGVcbiAgICBOdWxsICAgICAgICAgICAgPSAgMSwgIC8vIEEgTlVMTCB0eXBlIGhhdmluZyBubyBwaHlzaWNhbCBzdG9yYWdlXG4gICAgSW50ICAgICAgICAgICAgID0gIDIsICAvLyBTaWduZWQgb3IgdW5zaWduZWQgOCwgMTYsIDMyLCBvciA2NC1iaXQgbGl0dGxlLWVuZGlhbiBpbnRlZ2VyXG4gICAgRmxvYXQgICAgICAgICAgID0gIDMsICAvLyAyLCA0LCBvciA4LWJ5dGUgZmxvYXRpbmcgcG9pbnQgdmFsdWVcbiAgICBCaW5hcnkgICAgICAgICAgPSAgNCwgIC8vIFZhcmlhYmxlLWxlbmd0aCBieXRlcyAobm8gZ3VhcmFudGVlIG9mIFVURjgtbmVzcylcbiAgICBVdGY4ICAgICAgICAgICAgPSAgNSwgIC8vIFVURjggdmFyaWFibGUtbGVuZ3RoIHN0cmluZyBhcyBMaXN0PENoYXI+XG4gICAgQm9vbCAgICAgICAgICAgID0gIDYsICAvLyBCb29sZWFuIGFzIDEgYml0LCBMU0IgYml0LXBhY2tlZCBvcmRlcmluZ1xuICAgIERlY2ltYWwgICAgICAgICA9ICA3LCAgLy8gUHJlY2lzaW9uLWFuZC1zY2FsZS1iYXNlZCBkZWNpbWFsIHR5cGUuIFN0b3JhZ2UgdHlwZSBkZXBlbmRzIG9uIHRoZSBwYXJhbWV0ZXJzLlxuICAgIERhdGUgICAgICAgICAgICA9ICA4LCAgLy8gaW50MzJfdCBkYXlzIG9yIGludDY0X3QgbWlsbGlzZWNvbmRzIHNpbmNlIHRoZSBVTklYIGVwb2NoXG4gICAgVGltZSAgICAgICAgICAgID0gIDksICAvLyBUaW1lIGFzIHNpZ25lZCAzMiBvciA2NC1iaXQgaW50ZWdlciwgcmVwcmVzZW50aW5nIGVpdGhlciBzZWNvbmRzLCBtaWxsaXNlY29uZHMsIG1pY3Jvc2Vjb25kcywgb3IgbmFub3NlY29uZHMgc2luY2UgbWlkbmlnaHQgc2luY2UgbWlkbmlnaHRcbiAgICBUaW1lc3RhbXAgICAgICAgPSAxMCwgIC8vIEV4YWN0IHRpbWVzdGFtcCBlbmNvZGVkIHdpdGggaW50NjQgc2luY2UgVU5JWCBlcG9jaCAoRGVmYXVsdCB1bml0IG1pbGxpc2Vjb25kKVxuICAgIEludGVydmFsICAgICAgICA9IDExLCAgLy8gWUVBUl9NT05USCBvciBEQVlfVElNRSBpbnRlcnZhbCBpbiBTUUwgc3R5bGVcbiAgICBMaXN0ICAgICAgICAgICAgPSAxMiwgIC8vIEEgbGlzdCBvZiBzb21lIGxvZ2ljYWwgZGF0YSB0eXBlXG4gICAgU3RydWN0ICAgICAgICAgID0gMTMsICAvLyBTdHJ1Y3Qgb2YgbG9naWNhbCB0eXBlc1xuICAgIFVuaW9uICAgICAgICAgICA9IDE0LCAgLy8gVW5pb24gb2YgbG9naWNhbCB0eXBlc1xuICAgIEZpeGVkU2l6ZUJpbmFyeSA9IDE1LCAgLy8gRml4ZWQtc2l6ZSBiaW5hcnkuIEVhY2ggdmFsdWUgb2NjdXBpZXMgdGhlIHNhbWUgbnVtYmVyIG9mIGJ5dGVzXG4gICAgRml4ZWRTaXplTGlzdCAgID0gMTYsICAvLyBGaXhlZC1zaXplIGxpc3QuIEVhY2ggdmFsdWUgb2NjdXBpZXMgdGhlIHNhbWUgbnVtYmVyIG9mIGJ5dGVzXG4gICAgTWFwICAgICAgICAgICAgID0gMTcsICAvLyBNYXAgb2YgbmFtZWQgbG9naWNhbCB0eXBlc1xuXG4gICAgLy8gVGhlc2UgZW51bSB2YWx1ZXMgYXJlIGhlcmUgc28gdGhhdCBUeXBlU2NyaXB0IGNhbiBuYXJyb3cgdGhlIHR5cGUgc2lnbmF0dXJlcyBmdXJ0aGVyXG4gICAgLy8gYmV5b25kIHRoZSBiYXNlIEFycm93IHR5cGVzLiBUaGUgYmFzZSBBcnJvdyB0eXBlcyBpbmNsdWRlIG1ldGFkYXRhIGxpa2UgYml0V2lkdGhzIHRoYXRcbiAgICAvLyBpbXBhY3QgdGhlIHR5cGUgc2lnbmF0dXJlcyBvZiB0aGUgdmFsdWVzIHdlIHJldHVybi4gRm9yIGV4YW1wbGUsIHRoZSBJbnQ4VmVjdG9yIHJlYWRzXG4gICAgLy8gMS1ieXRlIG51bWJlcnMgZnJvbSBhbiBJbnQ4QXJyYXksIGFuIEludDMyVmVjdG9yIHJlYWRzIGEgNC1ieXRlIG51bWJlciBmcm9tIGFuIEludDMyQXJyYXksXG4gICAgLy8gYW5kIGFuIEludDY0VmVjdG9yIHJlYWRzIGEgcGFpciBvZiA0LWJ5dGUgbG8sIGhpIGludDMycywgYW5kIHJldHVybnMgdGhlbSBhcyBhIHplcm8tY29weVxuICAgIC8vIHNsaWNlIGZyb20gYW4gdW5kZXJseWluZyBJbnQzMkFycmF5LiBMaWJyYXJ5IGNvbnN1bWVycyBiZW5lZml0IGJ5IGRvaW5nIHRoaXMgdHlwZSBuYXJyb3dpbmcsXG4gICAgLy8gc2luY2Ugd2UgY2FuIGVuc3VyZSB0aGUgdHlwZXMgYWNyb3NzIGFsbCBwdWJsaWMgbWV0aG9kcyBhcmUgcHJvcGFnYXRlZCBhbmQgbmV2ZXIgYmFpbCB0byBgYW55YC5cbiAgICAvLyBUaGVzZSB2YWx1ZXMgYXJlIF9uZXZlcl8gYWN0dWFsbHkgdXNlZCBhdCBydW50aW1lLCBhbmQgdGhleSB3aWxsIF9uZXZlcl8gYmUgd3JpdHRlbiBpbnRvIHRoZVxuICAgIC8vIGZsYXRidWZmZXJzIG1ldGFkYXRhIG9mIHNlcmlhbGl6ZWQgQXJyb3cgSVBDIHBheWxvYWRzLlxuICAgIERpY3Rpb25hcnkgICAgICAgICAgICA9IC0xLCAvLyBEaWN0aW9uYXJ5IGFrYSBDYXRlZ29yeSB0eXBlXG4gICAgSW50OCAgICAgICAgICAgICAgICAgID0gLTIsXG4gICAgSW50MTYgICAgICAgICAgICAgICAgID0gLTMsXG4gICAgSW50MzIgICAgICAgICAgICAgICAgID0gLTQsXG4gICAgSW50NjQgICAgICAgICAgICAgICAgID0gLTUsXG4gICAgVWludDggICAgICAgICAgICAgICAgID0gLTYsXG4gICAgVWludDE2ICAgICAgICAgICAgICAgID0gLTcsXG4gICAgVWludDMyICAgICAgICAgICAgICAgID0gLTgsXG4gICAgVWludDY0ICAgICAgICAgICAgICAgID0gLTksXG4gICAgRmxvYXQxNiAgICAgICAgICAgICAgID0gLTEwLFxuICAgIEZsb2F0MzIgICAgICAgICAgICAgICA9IC0xMSxcbiAgICBGbG9hdDY0ICAgICAgICAgICAgICAgPSAtMTIsXG4gICAgRGF0ZURheSAgICAgICAgICAgICAgID0gLTEzLFxuICAgIERhdGVNaWxsaXNlY29uZCAgICAgICA9IC0xNCxcbiAgICBUaW1lc3RhbXBTZWNvbmQgICAgICAgPSAtMTUsXG4gICAgVGltZXN0YW1wTWlsbGlzZWNvbmQgID0gLTE2LFxuICAgIFRpbWVzdGFtcE1pY3Jvc2Vjb25kICA9IC0xNyxcbiAgICBUaW1lc3RhbXBOYW5vc2Vjb25kICAgPSAtMTgsXG4gICAgVGltZVNlY29uZCAgICAgICAgICAgID0gLTE5LFxuICAgIFRpbWVNaWxsaXNlY29uZCAgICAgICA9IC0yMCxcbiAgICBUaW1lTWljcm9zZWNvbmQgICAgICAgPSAtMjEsXG4gICAgVGltZU5hbm9zZWNvbmQgICAgICAgID0gLTIyLFxuICAgIERlbnNlVW5pb24gICAgICAgICAgICA9IC0yMyxcbiAgICBTcGFyc2VVbmlvbiAgICAgICAgICAgPSAtMjQsXG4gICAgSW50ZXJ2YWxEYXlUaW1lICAgICAgID0gLTI1LFxuICAgIEludGVydmFsWWVhck1vbnRoICAgICA9IC0yNixcbn1cblxuLy8gKFR5cGUgYXMgYW55KS5OT05FID0gVHlwZVsnTk9ORSddO1xuLy8gKFR5cGUgYXMgYW55KS5OdWxsID0gVHlwZVsnTnVsbCddO1xuLy8gKFR5cGUgYXMgYW55KS5JbnQgPSBUeXBlWydJbnQnXTtcbi8vIChUeXBlIGFzIGFueSkuRmxvYXQgPSBUeXBlWydGbG9hdCddO1xuLy8gKFR5cGUgYXMgYW55KS5CaW5hcnkgPSBUeXBlWydCaW5hcnknXTtcbi8vIChUeXBlIGFzIGFueSkuVXRmOCA9IFR5cGVbJ1V0ZjgnXTtcbi8vIChUeXBlIGFzIGFueSkuQm9vbCA9IFR5cGVbJ0Jvb2wnXTtcbi8vIChUeXBlIGFzIGFueSkuRGVjaW1hbCA9IFR5cGVbJ0RlY2ltYWwnXTtcbi8vIChUeXBlIGFzIGFueSkuRGF0ZSA9IFR5cGVbJ0RhdGUnXTtcbi8vIChUeXBlIGFzIGFueSkuVGltZSA9IFR5cGVbJ1RpbWUnXTtcbi8vIChUeXBlIGFzIGFueSkuVGltZXN0YW1wID0gVHlwZVsnVGltZXN0YW1wJ107XG4vLyAoVHlwZSBhcyBhbnkpLkludGVydmFsID0gVHlwZVsnSW50ZXJ2YWwnXTtcbi8vIChUeXBlIGFzIGFueSkuTGlzdCA9IFR5cGVbJ0xpc3QnXTtcbi8vIChUeXBlIGFzIGFueSkuU3RydWN0ID0gVHlwZVsnU3RydWN0J107XG4vLyAoVHlwZSBhcyBhbnkpLlVuaW9uID0gVHlwZVsnVW5pb24nXTtcbi8vIChUeXBlIGFzIGFueSkuRml4ZWRTaXplQmluYXJ5ID0gVHlwZVsnRml4ZWRTaXplQmluYXJ5J107XG4vLyAoVHlwZSBhcyBhbnkpLkZpeGVkU2l6ZUxpc3QgPSBUeXBlWydGaXhlZFNpemVMaXN0J107XG4vLyAoVHlwZSBhcyBhbnkpLk1hcCA9IFR5cGVbJ01hcCddO1xuLy8gKFR5cGUgYXMgYW55KS5EaWN0aW9uYXJ5ID0gVHlwZVsnRGljdGlvbmFyeSddO1xuLy8gKFR5cGUgYXMgYW55KS5JbnQ4ID0gVHlwZVsnSW50OCddO1xuLy8gKFR5cGUgYXMgYW55KS5JbnQxNiA9IFR5cGVbJ0ludDE2J107XG4vLyAoVHlwZSBhcyBhbnkpLkludDMyID0gVHlwZVsnSW50MzInXTtcbi8vIChUeXBlIGFzIGFueSkuSW50NjQgPSBUeXBlWydJbnQ2NCddO1xuLy8gKFR5cGUgYXMgYW55KS5VaW50OCA9IFR5cGVbJ1VpbnQ4J107XG4vLyAoVHlwZSBhcyBhbnkpLlVpbnQxNiA9IFR5cGVbJ1VpbnQxNiddO1xuLy8gKFR5cGUgYXMgYW55KS5VaW50MzIgPSBUeXBlWydVaW50MzInXTtcbi8vIChUeXBlIGFzIGFueSkuVWludDY0ID0gVHlwZVsnVWludDY0J107XG4vLyAoVHlwZSBhcyBhbnkpLkZsb2F0MTYgPSBUeXBlWydGbG9hdDE2J107XG4vLyAoVHlwZSBhcyBhbnkpLkZsb2F0MzIgPSBUeXBlWydGbG9hdDMyJ107XG4vLyAoVHlwZSBhcyBhbnkpLkZsb2F0NjQgPSBUeXBlWydGbG9hdDY0J107XG4vLyAoVHlwZSBhcyBhbnkpLkRhdGVEYXkgPSBUeXBlWydEYXRlRGF5J107XG4vLyAoVHlwZSBhcyBhbnkpLkRhdGVNaWxsaXNlY29uZCA9IFR5cGVbJ0RhdGVNaWxsaXNlY29uZCddO1xuLy8gKFR5cGUgYXMgYW55KS5UaW1lc3RhbXBTZWNvbmQgPSBUeXBlWydUaW1lc3RhbXBTZWNvbmQnXTtcbi8vIChUeXBlIGFzIGFueSkuVGltZXN0YW1wTWlsbGlzZWNvbmQgPSBUeXBlWydUaW1lc3RhbXBNaWxsaXNlY29uZCddO1xuLy8gKFR5cGUgYXMgYW55KS5UaW1lc3RhbXBNaWNyb3NlY29uZCA9IFR5cGVbJ1RpbWVzdGFtcE1pY3Jvc2Vjb25kJ107XG4vLyAoVHlwZSBhcyBhbnkpLlRpbWVzdGFtcE5hbm9zZWNvbmQgPSBUeXBlWydUaW1lc3RhbXBOYW5vc2Vjb25kJ107XG4vLyAoVHlwZSBhcyBhbnkpLlRpbWVTZWNvbmQgPSBUeXBlWydUaW1lU2Vjb25kJ107XG4vLyAoVHlwZSBhcyBhbnkpLlRpbWVNaWxsaXNlY29uZCA9IFR5cGVbJ1RpbWVNaWxsaXNlY29uZCddO1xuLy8gKFR5cGUgYXMgYW55KS5UaW1lTWljcm9zZWNvbmQgPSBUeXBlWydUaW1lTWljcm9zZWNvbmQnXTtcbi8vIChUeXBlIGFzIGFueSkuVGltZU5hbm9zZWNvbmQgPSBUeXBlWydUaW1lTmFub3NlY29uZCddO1xuLy8gKFR5cGUgYXMgYW55KS5EZW5zZVVuaW9uID0gVHlwZVsnRGVuc2VVbmlvbiddO1xuLy8gKFR5cGUgYXMgYW55KS5TcGFyc2VVbmlvbiA9IFR5cGVbJ1NwYXJzZVVuaW9uJ107XG4vLyAoVHlwZSBhcyBhbnkpLkludGVydmFsRGF5VGltZSA9IFR5cGVbJ0ludGVydmFsRGF5VGltZSddO1xuLy8gKFR5cGUgYXMgYW55KS5JbnRlcnZhbFllYXJNb250aCA9IFR5cGVbJ0ludGVydmFsWWVhck1vbnRoJ107XG5cbi8vIChBcnJvd1R5cGUgYXMgYW55KS5OT05FID0gQXJyb3dUeXBlWydOT05FJ107XG4vLyAoQXJyb3dUeXBlIGFzIGFueSkuTnVsbCA9IEFycm93VHlwZVsnTnVsbCddO1xuLy8gKEFycm93VHlwZSBhcyBhbnkpLkludCA9IEFycm93VHlwZVsnSW50J107XG4vLyAoQXJyb3dUeXBlIGFzIGFueSkuRmxvYXRpbmdQb2ludCA9IEFycm93VHlwZVsnRmxvYXRpbmdQb2ludCddO1xuLy8gKEFycm93VHlwZSBhcyBhbnkpLkJpbmFyeSA9IEFycm93VHlwZVsnQmluYXJ5J107XG4vLyAoQXJyb3dUeXBlIGFzIGFueSkuVXRmOCA9IEFycm93VHlwZVsnVXRmOCddO1xuLy8gKEFycm93VHlwZSBhcyBhbnkpLkJvb2wgPSBBcnJvd1R5cGVbJ0Jvb2wnXTtcbi8vIChBcnJvd1R5cGUgYXMgYW55KS5EZWNpbWFsID0gQXJyb3dUeXBlWydEZWNpbWFsJ107XG4vLyAoQXJyb3dUeXBlIGFzIGFueSkuRGF0ZSA9IEFycm93VHlwZVsnRGF0ZSddO1xuLy8gKEFycm93VHlwZSBhcyBhbnkpLlRpbWUgPSBBcnJvd1R5cGVbJ1RpbWUnXTtcbi8vIChBcnJvd1R5cGUgYXMgYW55KS5UaW1lc3RhbXAgPSBBcnJvd1R5cGVbJ1RpbWVzdGFtcCddO1xuLy8gKEFycm93VHlwZSBhcyBhbnkpLkludGVydmFsID0gQXJyb3dUeXBlWydJbnRlcnZhbCddO1xuLy8gKEFycm93VHlwZSBhcyBhbnkpLkxpc3QgPSBBcnJvd1R5cGVbJ0xpc3QnXTtcbi8vIChBcnJvd1R5cGUgYXMgYW55KS5TdHJ1Y3RfID0gQXJyb3dUeXBlWydTdHJ1Y3RfJ107XG4vLyAoQXJyb3dUeXBlIGFzIGFueSkuVW5pb24gPSBBcnJvd1R5cGVbJ1VuaW9uJ107XG4vLyAoQXJyb3dUeXBlIGFzIGFueSkuRml4ZWRTaXplQmluYXJ5ID0gQXJyb3dUeXBlWydGaXhlZFNpemVCaW5hcnknXTtcbi8vIChBcnJvd1R5cGUgYXMgYW55KS5GaXhlZFNpemVMaXN0ID0gQXJyb3dUeXBlWydGaXhlZFNpemVMaXN0J107XG4vLyAoQXJyb3dUeXBlIGFzIGFueSkuTWFwID0gQXJyb3dUeXBlWydNYXAnXTtcblxuLy8gKERhdGVVbml0IGFzIGFueSkuREFZID0gRGF0ZVVuaXRbJ0RBWSddO1xuLy8gKERhdGVVbml0IGFzIGFueSkuTUlMTElTRUNPTkQgPSBEYXRlVW5pdFsnTUlMTElTRUNPTkQnXTtcblxuLy8gKFRpbWVVbml0IGFzIGFueSkuU0VDT05EID0gVGltZVVuaXRbJ1NFQ09ORCddO1xuLy8gKFRpbWVVbml0IGFzIGFueSkuTUlMTElTRUNPTkQgPSBUaW1lVW5pdFsnTUlMTElTRUNPTkQnXTtcbi8vIChUaW1lVW5pdCBhcyBhbnkpLk1JQ1JPU0VDT05EID0gVGltZVVuaXRbJ01JQ1JPU0VDT05EJ107XG4vLyAoVGltZVVuaXQgYXMgYW55KS5OQU5PU0VDT05EID0gVGltZVVuaXRbJ05BTk9TRUNPTkQnXTtcblxuLy8gKFByZWNpc2lvbiBhcyBhbnkpLkhBTEYgPSBQcmVjaXNpb25bJ0hBTEYnXTtcbi8vIChQcmVjaXNpb24gYXMgYW55KS5TSU5HTEUgPSBQcmVjaXNpb25bJ1NJTkdMRSddO1xuLy8gKFByZWNpc2lvbiBhcyBhbnkpLkRPVUJMRSA9IFByZWNpc2lvblsnRE9VQkxFJ107XG5cbi8vIChVbmlvbk1vZGUgYXMgYW55KS5TcGFyc2UgPSBVbmlvbk1vZGVbJ1NwYXJzZSddO1xuLy8gKFVuaW9uTW9kZSBhcyBhbnkpLkRlbnNlID0gVW5pb25Nb2RlWydEZW5zZSddO1xuXG4vLyAoVmVjdG9yVHlwZSBhcyBhbnkpLk9GRlNFVCA9IFZlY3RvclR5cGVbJ09GRlNFVCddO1xuLy8gKFZlY3RvclR5cGUgYXMgYW55KS5EQVRBID0gVmVjdG9yVHlwZVsnREFUQSddO1xuLy8gKFZlY3RvclR5cGUgYXMgYW55KS5WQUxJRElUWSA9IFZlY3RvclR5cGVbJ1ZBTElESVRZJ107XG4vLyAoVmVjdG9yVHlwZSBhcyBhbnkpLlRZUEUgPSBWZWN0b3JUeXBlWydUWVBFJ107XG5cbi8vIChJbnRlcnZhbFVuaXQgYXMgYW55KS5ZRUFSX01PTlRIID0gSW50ZXJ2YWxVbml0WydZRUFSX01PTlRIJ107XG4vLyAoSW50ZXJ2YWxVbml0IGFzIGFueSkuREFZX1RJTUUgPSBJbnRlcnZhbFVuaXRbJ0RBWV9USU1FJ107XG5cbi8vIChNZXNzYWdlSGVhZGVyIGFzIGFueSkuTk9ORSA9IE1lc3NhZ2VIZWFkZXJbJ05PTkUnXTtcbi8vIChNZXNzYWdlSGVhZGVyIGFzIGFueSkuU2NoZW1hID0gTWVzc2FnZUhlYWRlclsnU2NoZW1hJ107XG4vLyAoTWVzc2FnZUhlYWRlciBhcyBhbnkpLkRpY3Rpb25hcnlCYXRjaCA9IE1lc3NhZ2VIZWFkZXJbJ0RpY3Rpb25hcnlCYXRjaCddO1xuLy8gKE1lc3NhZ2VIZWFkZXIgYXMgYW55KS5SZWNvcmRCYXRjaCA9IE1lc3NhZ2VIZWFkZXJbJ1JlY29yZEJhdGNoJ107XG4vLyAoTWVzc2FnZUhlYWRlciBhcyBhbnkpLlRlbnNvciA9IE1lc3NhZ2VIZWFkZXJbJ1RlbnNvciddO1xuXG4vLyAoTWV0YWRhdGFWZXJzaW9uIGFzIGFueSkuVjEgPSBNZXRhZGF0YVZlcnNpb25bJ1YxJ107XG4vLyAoTWV0YWRhdGFWZXJzaW9uIGFzIGFueSkuVjIgPSBNZXRhZGF0YVZlcnNpb25bJ1YyJ107XG4vLyAoTWV0YWRhdGFWZXJzaW9uIGFzIGFueSkuVjMgPSBNZXRhZGF0YVZlcnNpb25bJ1YzJ107XG4vLyAoTWV0YWRhdGFWZXJzaW9uIGFzIGFueSkuVjQgPSBNZXRhZGF0YVZlcnNpb25bJ1Y0J107XG4iXX0=

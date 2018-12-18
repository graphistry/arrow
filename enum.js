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
exports.ArrowType = Schema_.org.apache.arrow.flatbuf.Type;
exports.DateUnit = Schema_.org.apache.arrow.flatbuf.DateUnit;
exports.TimeUnit = Schema_.org.apache.arrow.flatbuf.TimeUnit;
exports.Precision = Schema_.org.apache.arrow.flatbuf.Precision;
exports.UnionMode = Schema_.org.apache.arrow.flatbuf.UnionMode;
exports.VectorType = Schema_.org.apache.arrow.flatbuf.VectorType;
exports.IntervalUnit = Schema_.org.apache.arrow.flatbuf.IntervalUnit;
exports.MessageHeader = Message_.org.apache.arrow.flatbuf.MessageHeader;
exports.MetadataVersion = Schema_.org.apache.arrow.flatbuf.MetadataVersion;
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
})(Type = exports.Type || (exports.Type = {}));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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ckQsK0NBQStDO0FBQy9DLCtDQUErQztBQUMvQyx5REFBeUQ7QUFDekQsdURBQXVEO0FBQ3ZELCtDQUErQztBQUMvQyxxREFBcUQ7QUFDckQsaURBQWlEO0FBQ2pELHFFQUFxRTtBQUNyRSxpRUFBaUU7QUFDakUsNkNBQTZDO0FBRTdDLDJDQUEyQztBQUMzQywyREFBMkQ7QUFFM0QsaURBQWlEO0FBQ2pELDJEQUEyRDtBQUMzRCwyREFBMkQ7QUFDM0QseURBQXlEO0FBRXpELCtDQUErQztBQUMvQyxtREFBbUQ7QUFDbkQsbURBQW1EO0FBRW5ELG1EQUFtRDtBQUNuRCxpREFBaUQ7QUFFakQscURBQXFEO0FBQ3JELGlEQUFpRDtBQUNqRCx5REFBeUQ7QUFDekQsaURBQWlEO0FBRWpELGlFQUFpRTtBQUNqRSw2REFBNkQ7QUFFN0QsdURBQXVEO0FBQ3ZELDJEQUEyRDtBQUMzRCw2RUFBNkU7QUFDN0UscUVBQXFFO0FBQ3JFLDJEQUEyRDtBQUUzRCx1REFBdUQ7QUFDdkQsdURBQXVEO0FBQ3ZELHVEQUF1RDtBQUN2RCx1REFBdUQiLCJmaWxlIjoiZW51bS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgKiBhcyBTY2hlbWFfIGZyb20gJy4vZmIvU2NoZW1hJztcbmltcG9ydCAqIGFzIE1lc3NhZ2VfIGZyb20gJy4vZmIvTWVzc2FnZSc7XG5cbmV4cG9ydCBpbXBvcnQgQXJyb3dUeXBlID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVHlwZTtcbmV4cG9ydCBpbXBvcnQgRGF0ZVVuaXQgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EYXRlVW5pdDtcbmV4cG9ydCBpbXBvcnQgVGltZVVuaXQgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UaW1lVW5pdDtcbmV4cG9ydCBpbXBvcnQgUHJlY2lzaW9uID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuUHJlY2lzaW9uO1xuZXhwb3J0IGltcG9ydCBVbmlvbk1vZGUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5Vbmlvbk1vZGU7XG5leHBvcnQgaW1wb3J0IFZlY3RvclR5cGUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5WZWN0b3JUeXBlO1xuZXhwb3J0IGltcG9ydCBJbnRlcnZhbFVuaXQgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5JbnRlcnZhbFVuaXQ7XG5leHBvcnQgaW1wb3J0IE1lc3NhZ2VIZWFkZXIgPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTWVzc2FnZUhlYWRlcjtcbmV4cG9ydCBpbXBvcnQgTWV0YWRhdGFWZXJzaW9uID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTWV0YWRhdGFWZXJzaW9uO1xuXG4vKipcbiAqICpcbiAqIE1haW4gZGF0YSB0eXBlIGVudW1lcmF0aW9uOlxuICogKlxuICogRGF0YSB0eXBlcyBpbiB0aGlzIGxpYnJhcnkgYXJlIGFsbCAqbG9naWNhbCouIFRoZXkgY2FuIGJlIGV4cHJlc3NlZCBhc1xuICogZWl0aGVyIGEgcHJpbWl0aXZlIHBoeXNpY2FsIHR5cGUgKGJ5dGVzIG9yIGJpdHMgb2Ygc29tZSBmaXhlZCBzaXplKSwgYVxuICogbmVzdGVkIHR5cGUgY29uc2lzdGluZyBvZiBvdGhlciBkYXRhIHR5cGVzLCBvciBhbm90aGVyIGRhdGEgdHlwZSAoZS5nLiBhXG4gKiB0aW1lc3RhbXAgZW5jb2RlZCBhcyBhbiBpbnQ2NClcbiAqL1xuZXhwb3J0IGVudW0gVHlwZSB7XG4gICAgTk9ORSAgICAgICAgICAgID0gIDAsICAvLyBUaGUgZGVmYXVsdCBwbGFjZWhvbGRlciB0eXBlXG4gICAgTnVsbCAgICAgICAgICAgID0gIDEsICAvLyBBIE5VTEwgdHlwZSBoYXZpbmcgbm8gcGh5c2ljYWwgc3RvcmFnZVxuICAgIEludCAgICAgICAgICAgICA9ICAyLCAgLy8gU2lnbmVkIG9yIHVuc2lnbmVkIDgsIDE2LCAzMiwgb3IgNjQtYml0IGxpdHRsZS1lbmRpYW4gaW50ZWdlclxuICAgIEZsb2F0ICAgICAgICAgICA9ICAzLCAgLy8gMiwgNCwgb3IgOC1ieXRlIGZsb2F0aW5nIHBvaW50IHZhbHVlXG4gICAgQmluYXJ5ICAgICAgICAgID0gIDQsICAvLyBWYXJpYWJsZS1sZW5ndGggYnl0ZXMgKG5vIGd1YXJhbnRlZSBvZiBVVEY4LW5lc3MpXG4gICAgVXRmOCAgICAgICAgICAgID0gIDUsICAvLyBVVEY4IHZhcmlhYmxlLWxlbmd0aCBzdHJpbmcgYXMgTGlzdDxDaGFyPlxuICAgIEJvb2wgICAgICAgICAgICA9ICA2LCAgLy8gQm9vbGVhbiBhcyAxIGJpdCwgTFNCIGJpdC1wYWNrZWQgb3JkZXJpbmdcbiAgICBEZWNpbWFsICAgICAgICAgPSAgNywgIC8vIFByZWNpc2lvbi1hbmQtc2NhbGUtYmFzZWQgZGVjaW1hbCB0eXBlLiBTdG9yYWdlIHR5cGUgZGVwZW5kcyBvbiB0aGUgcGFyYW1ldGVycy5cbiAgICBEYXRlICAgICAgICAgICAgPSAgOCwgIC8vIGludDMyX3QgZGF5cyBvciBpbnQ2NF90IG1pbGxpc2Vjb25kcyBzaW5jZSB0aGUgVU5JWCBlcG9jaFxuICAgIFRpbWUgICAgICAgICAgICA9ICA5LCAgLy8gVGltZSBhcyBzaWduZWQgMzIgb3IgNjQtYml0IGludGVnZXIsIHJlcHJlc2VudGluZyBlaXRoZXIgc2Vjb25kcywgbWlsbGlzZWNvbmRzLCBtaWNyb3NlY29uZHMsIG9yIG5hbm9zZWNvbmRzIHNpbmNlIG1pZG5pZ2h0IHNpbmNlIG1pZG5pZ2h0XG4gICAgVGltZXN0YW1wICAgICAgID0gMTAsICAvLyBFeGFjdCB0aW1lc3RhbXAgZW5jb2RlZCB3aXRoIGludDY0IHNpbmNlIFVOSVggZXBvY2ggKERlZmF1bHQgdW5pdCBtaWxsaXNlY29uZClcbiAgICBJbnRlcnZhbCAgICAgICAgPSAxMSwgIC8vIFlFQVJfTU9OVEggb3IgREFZX1RJTUUgaW50ZXJ2YWwgaW4gU1FMIHN0eWxlXG4gICAgTGlzdCAgICAgICAgICAgID0gMTIsICAvLyBBIGxpc3Qgb2Ygc29tZSBsb2dpY2FsIGRhdGEgdHlwZVxuICAgIFN0cnVjdCAgICAgICAgICA9IDEzLCAgLy8gU3RydWN0IG9mIGxvZ2ljYWwgdHlwZXNcbiAgICBVbmlvbiAgICAgICAgICAgPSAxNCwgIC8vIFVuaW9uIG9mIGxvZ2ljYWwgdHlwZXNcbiAgICBGaXhlZFNpemVCaW5hcnkgPSAxNSwgIC8vIEZpeGVkLXNpemUgYmluYXJ5LiBFYWNoIHZhbHVlIG9jY3VwaWVzIHRoZSBzYW1lIG51bWJlciBvZiBieXRlc1xuICAgIEZpeGVkU2l6ZUxpc3QgICA9IDE2LCAgLy8gRml4ZWQtc2l6ZSBsaXN0LiBFYWNoIHZhbHVlIG9jY3VwaWVzIHRoZSBzYW1lIG51bWJlciBvZiBieXRlc1xuICAgIE1hcCAgICAgICAgICAgICA9IDE3LCAgLy8gTWFwIG9mIG5hbWVkIGxvZ2ljYWwgdHlwZXNcblxuICAgIC8vIFRoZXNlIGVudW0gdmFsdWVzIGFyZSBoZXJlIHNvIHRoYXQgVHlwZVNjcmlwdCBjYW4gbmFycm93IHRoZSB0eXBlIHNpZ25hdHVyZXMgZnVydGhlclxuICAgIC8vIGJleW9uZCB0aGUgYmFzZSBBcnJvdyB0eXBlcy4gVGhlIGJhc2UgQXJyb3cgdHlwZXMgaW5jbHVkZSBtZXRhZGF0YSBsaWtlIGJpdFdpZHRocyB0aGF0XG4gICAgLy8gaW1wYWN0IHRoZSB0eXBlIHNpZ25hdHVyZXMgb2YgdGhlIHZhbHVlcyB3ZSByZXR1cm4uIEZvciBleGFtcGxlLCB0aGUgSW50OFZlY3RvciByZWFkc1xuICAgIC8vIDEtYnl0ZSBudW1iZXJzIGZyb20gYW4gSW50OEFycmF5LCBhbiBJbnQzMlZlY3RvciByZWFkcyBhIDQtYnl0ZSBudW1iZXIgZnJvbSBhbiBJbnQzMkFycmF5LFxuICAgIC8vIGFuZCBhbiBJbnQ2NFZlY3RvciByZWFkcyBhIHBhaXIgb2YgNC1ieXRlIGxvLCBoaSBpbnQzMnMsIGFuZCByZXR1cm5zIHRoZW0gYXMgYSB6ZXJvLWNvcHlcbiAgICAvLyBzbGljZSBmcm9tIGFuIHVuZGVybHlpbmcgSW50MzJBcnJheS4gTGlicmFyeSBjb25zdW1lcnMgYmVuZWZpdCBieSBkb2luZyB0aGlzIHR5cGUgbmFycm93aW5nLFxuICAgIC8vIHNpbmNlIHdlIGNhbiBlbnN1cmUgdGhlIHR5cGVzIGFjcm9zcyBhbGwgcHVibGljIG1ldGhvZHMgYXJlIHByb3BhZ2F0ZWQgYW5kIG5ldmVyIGJhaWwgdG8gYGFueWAuXG4gICAgLy8gVGhlc2UgdmFsdWVzIGFyZSBfbmV2ZXJfIGFjdHVhbGx5IHVzZWQgYXQgcnVudGltZSwgYW5kIHRoZXkgd2lsbCBfbmV2ZXJfIGJlIHdyaXR0ZW4gaW50byB0aGVcbiAgICAvLyBmbGF0YnVmZmVycyBtZXRhZGF0YSBvZiBzZXJpYWxpemVkIEFycm93IElQQyBwYXlsb2Fkcy5cbiAgICBEaWN0aW9uYXJ5ICAgICAgICAgICAgPSAtMSwgLy8gRGljdGlvbmFyeSBha2EgQ2F0ZWdvcnkgdHlwZVxuICAgIEludDggICAgICAgICAgICAgICAgICA9IC0yLFxuICAgIEludDE2ICAgICAgICAgICAgICAgICA9IC0zLFxuICAgIEludDMyICAgICAgICAgICAgICAgICA9IC00LFxuICAgIEludDY0ICAgICAgICAgICAgICAgICA9IC01LFxuICAgIFVpbnQ4ICAgICAgICAgICAgICAgICA9IC02LFxuICAgIFVpbnQxNiAgICAgICAgICAgICAgICA9IC03LFxuICAgIFVpbnQzMiAgICAgICAgICAgICAgICA9IC04LFxuICAgIFVpbnQ2NCAgICAgICAgICAgICAgICA9IC05LFxuICAgIEZsb2F0MTYgICAgICAgICAgICAgICA9IC0xMCxcbiAgICBGbG9hdDMyICAgICAgICAgICAgICAgPSAtMTEsXG4gICAgRmxvYXQ2NCAgICAgICAgICAgICAgID0gLTEyLFxuICAgIERhdGVEYXkgICAgICAgICAgICAgICA9IC0xMyxcbiAgICBEYXRlTWlsbGlzZWNvbmQgICAgICAgPSAtMTQsXG4gICAgVGltZXN0YW1wU2Vjb25kICAgICAgID0gLTE1LFxuICAgIFRpbWVzdGFtcE1pbGxpc2Vjb25kICA9IC0xNixcbiAgICBUaW1lc3RhbXBNaWNyb3NlY29uZCAgPSAtMTcsXG4gICAgVGltZXN0YW1wTmFub3NlY29uZCAgID0gLTE4LFxuICAgIFRpbWVTZWNvbmQgICAgICAgICAgICA9IC0xOSxcbiAgICBUaW1lTWlsbGlzZWNvbmQgICAgICAgPSAtMjAsXG4gICAgVGltZU1pY3Jvc2Vjb25kICAgICAgID0gLTIxLFxuICAgIFRpbWVOYW5vc2Vjb25kICAgICAgICA9IC0yMixcbiAgICBEZW5zZVVuaW9uICAgICAgICAgICAgPSAtMjMsXG4gICAgU3BhcnNlVW5pb24gICAgICAgICAgID0gLTI0LFxuICAgIEludGVydmFsRGF5VGltZSAgICAgICA9IC0yNSxcbiAgICBJbnRlcnZhbFllYXJNb250aCAgICAgPSAtMjYsXG59XG5cbi8vIChUeXBlIGFzIGFueSkuTk9ORSA9IFR5cGVbJ05PTkUnXTtcbi8vIChUeXBlIGFzIGFueSkuTnVsbCA9IFR5cGVbJ051bGwnXTtcbi8vIChUeXBlIGFzIGFueSkuSW50ID0gVHlwZVsnSW50J107XG4vLyAoVHlwZSBhcyBhbnkpLkZsb2F0ID0gVHlwZVsnRmxvYXQnXTtcbi8vIChUeXBlIGFzIGFueSkuQmluYXJ5ID0gVHlwZVsnQmluYXJ5J107XG4vLyAoVHlwZSBhcyBhbnkpLlV0ZjggPSBUeXBlWydVdGY4J107XG4vLyAoVHlwZSBhcyBhbnkpLkJvb2wgPSBUeXBlWydCb29sJ107XG4vLyAoVHlwZSBhcyBhbnkpLkRlY2ltYWwgPSBUeXBlWydEZWNpbWFsJ107XG4vLyAoVHlwZSBhcyBhbnkpLkRhdGUgPSBUeXBlWydEYXRlJ107XG4vLyAoVHlwZSBhcyBhbnkpLlRpbWUgPSBUeXBlWydUaW1lJ107XG4vLyAoVHlwZSBhcyBhbnkpLlRpbWVzdGFtcCA9IFR5cGVbJ1RpbWVzdGFtcCddO1xuLy8gKFR5cGUgYXMgYW55KS5JbnRlcnZhbCA9IFR5cGVbJ0ludGVydmFsJ107XG4vLyAoVHlwZSBhcyBhbnkpLkxpc3QgPSBUeXBlWydMaXN0J107XG4vLyAoVHlwZSBhcyBhbnkpLlN0cnVjdCA9IFR5cGVbJ1N0cnVjdCddO1xuLy8gKFR5cGUgYXMgYW55KS5VbmlvbiA9IFR5cGVbJ1VuaW9uJ107XG4vLyAoVHlwZSBhcyBhbnkpLkZpeGVkU2l6ZUJpbmFyeSA9IFR5cGVbJ0ZpeGVkU2l6ZUJpbmFyeSddO1xuLy8gKFR5cGUgYXMgYW55KS5GaXhlZFNpemVMaXN0ID0gVHlwZVsnRml4ZWRTaXplTGlzdCddO1xuLy8gKFR5cGUgYXMgYW55KS5NYXAgPSBUeXBlWydNYXAnXTtcbi8vIChUeXBlIGFzIGFueSkuRGljdGlvbmFyeSA9IFR5cGVbJ0RpY3Rpb25hcnknXTtcbi8vIChUeXBlIGFzIGFueSkuSW50OCA9IFR5cGVbJ0ludDgnXTtcbi8vIChUeXBlIGFzIGFueSkuSW50MTYgPSBUeXBlWydJbnQxNiddO1xuLy8gKFR5cGUgYXMgYW55KS5JbnQzMiA9IFR5cGVbJ0ludDMyJ107XG4vLyAoVHlwZSBhcyBhbnkpLkludDY0ID0gVHlwZVsnSW50NjQnXTtcbi8vIChUeXBlIGFzIGFueSkuVWludDggPSBUeXBlWydVaW50OCddO1xuLy8gKFR5cGUgYXMgYW55KS5VaW50MTYgPSBUeXBlWydVaW50MTYnXTtcbi8vIChUeXBlIGFzIGFueSkuVWludDMyID0gVHlwZVsnVWludDMyJ107XG4vLyAoVHlwZSBhcyBhbnkpLlVpbnQ2NCA9IFR5cGVbJ1VpbnQ2NCddO1xuLy8gKFR5cGUgYXMgYW55KS5GbG9hdDE2ID0gVHlwZVsnRmxvYXQxNiddO1xuLy8gKFR5cGUgYXMgYW55KS5GbG9hdDMyID0gVHlwZVsnRmxvYXQzMiddO1xuLy8gKFR5cGUgYXMgYW55KS5GbG9hdDY0ID0gVHlwZVsnRmxvYXQ2NCddO1xuLy8gKFR5cGUgYXMgYW55KS5EYXRlRGF5ID0gVHlwZVsnRGF0ZURheSddO1xuLy8gKFR5cGUgYXMgYW55KS5EYXRlTWlsbGlzZWNvbmQgPSBUeXBlWydEYXRlTWlsbGlzZWNvbmQnXTtcbi8vIChUeXBlIGFzIGFueSkuVGltZXN0YW1wU2Vjb25kID0gVHlwZVsnVGltZXN0YW1wU2Vjb25kJ107XG4vLyAoVHlwZSBhcyBhbnkpLlRpbWVzdGFtcE1pbGxpc2Vjb25kID0gVHlwZVsnVGltZXN0YW1wTWlsbGlzZWNvbmQnXTtcbi8vIChUeXBlIGFzIGFueSkuVGltZXN0YW1wTWljcm9zZWNvbmQgPSBUeXBlWydUaW1lc3RhbXBNaWNyb3NlY29uZCddO1xuLy8gKFR5cGUgYXMgYW55KS5UaW1lc3RhbXBOYW5vc2Vjb25kID0gVHlwZVsnVGltZXN0YW1wTmFub3NlY29uZCddO1xuLy8gKFR5cGUgYXMgYW55KS5UaW1lU2Vjb25kID0gVHlwZVsnVGltZVNlY29uZCddO1xuLy8gKFR5cGUgYXMgYW55KS5UaW1lTWlsbGlzZWNvbmQgPSBUeXBlWydUaW1lTWlsbGlzZWNvbmQnXTtcbi8vIChUeXBlIGFzIGFueSkuVGltZU1pY3Jvc2Vjb25kID0gVHlwZVsnVGltZU1pY3Jvc2Vjb25kJ107XG4vLyAoVHlwZSBhcyBhbnkpLlRpbWVOYW5vc2Vjb25kID0gVHlwZVsnVGltZU5hbm9zZWNvbmQnXTtcbi8vIChUeXBlIGFzIGFueSkuRGVuc2VVbmlvbiA9IFR5cGVbJ0RlbnNlVW5pb24nXTtcbi8vIChUeXBlIGFzIGFueSkuU3BhcnNlVW5pb24gPSBUeXBlWydTcGFyc2VVbmlvbiddO1xuLy8gKFR5cGUgYXMgYW55KS5JbnRlcnZhbERheVRpbWUgPSBUeXBlWydJbnRlcnZhbERheVRpbWUnXTtcbi8vIChUeXBlIGFzIGFueSkuSW50ZXJ2YWxZZWFyTW9udGggPSBUeXBlWydJbnRlcnZhbFllYXJNb250aCddO1xuXG4vLyAoQXJyb3dUeXBlIGFzIGFueSkuTk9ORSA9IEFycm93VHlwZVsnTk9ORSddO1xuLy8gKEFycm93VHlwZSBhcyBhbnkpLk51bGwgPSBBcnJvd1R5cGVbJ051bGwnXTtcbi8vIChBcnJvd1R5cGUgYXMgYW55KS5JbnQgPSBBcnJvd1R5cGVbJ0ludCddO1xuLy8gKEFycm93VHlwZSBhcyBhbnkpLkZsb2F0aW5nUG9pbnQgPSBBcnJvd1R5cGVbJ0Zsb2F0aW5nUG9pbnQnXTtcbi8vIChBcnJvd1R5cGUgYXMgYW55KS5CaW5hcnkgPSBBcnJvd1R5cGVbJ0JpbmFyeSddO1xuLy8gKEFycm93VHlwZSBhcyBhbnkpLlV0ZjggPSBBcnJvd1R5cGVbJ1V0ZjgnXTtcbi8vIChBcnJvd1R5cGUgYXMgYW55KS5Cb29sID0gQXJyb3dUeXBlWydCb29sJ107XG4vLyAoQXJyb3dUeXBlIGFzIGFueSkuRGVjaW1hbCA9IEFycm93VHlwZVsnRGVjaW1hbCddO1xuLy8gKEFycm93VHlwZSBhcyBhbnkpLkRhdGUgPSBBcnJvd1R5cGVbJ0RhdGUnXTtcbi8vIChBcnJvd1R5cGUgYXMgYW55KS5UaW1lID0gQXJyb3dUeXBlWydUaW1lJ107XG4vLyAoQXJyb3dUeXBlIGFzIGFueSkuVGltZXN0YW1wID0gQXJyb3dUeXBlWydUaW1lc3RhbXAnXTtcbi8vIChBcnJvd1R5cGUgYXMgYW55KS5JbnRlcnZhbCA9IEFycm93VHlwZVsnSW50ZXJ2YWwnXTtcbi8vIChBcnJvd1R5cGUgYXMgYW55KS5MaXN0ID0gQXJyb3dUeXBlWydMaXN0J107XG4vLyAoQXJyb3dUeXBlIGFzIGFueSkuU3RydWN0XyA9IEFycm93VHlwZVsnU3RydWN0XyddO1xuLy8gKEFycm93VHlwZSBhcyBhbnkpLlVuaW9uID0gQXJyb3dUeXBlWydVbmlvbiddO1xuLy8gKEFycm93VHlwZSBhcyBhbnkpLkZpeGVkU2l6ZUJpbmFyeSA9IEFycm93VHlwZVsnRml4ZWRTaXplQmluYXJ5J107XG4vLyAoQXJyb3dUeXBlIGFzIGFueSkuRml4ZWRTaXplTGlzdCA9IEFycm93VHlwZVsnRml4ZWRTaXplTGlzdCddO1xuLy8gKEFycm93VHlwZSBhcyBhbnkpLk1hcCA9IEFycm93VHlwZVsnTWFwJ107XG5cbi8vIChEYXRlVW5pdCBhcyBhbnkpLkRBWSA9IERhdGVVbml0WydEQVknXTtcbi8vIChEYXRlVW5pdCBhcyBhbnkpLk1JTExJU0VDT05EID0gRGF0ZVVuaXRbJ01JTExJU0VDT05EJ107XG5cbi8vIChUaW1lVW5pdCBhcyBhbnkpLlNFQ09ORCA9IFRpbWVVbml0WydTRUNPTkQnXTtcbi8vIChUaW1lVW5pdCBhcyBhbnkpLk1JTExJU0VDT05EID0gVGltZVVuaXRbJ01JTExJU0VDT05EJ107XG4vLyAoVGltZVVuaXQgYXMgYW55KS5NSUNST1NFQ09ORCA9IFRpbWVVbml0WydNSUNST1NFQ09ORCddO1xuLy8gKFRpbWVVbml0IGFzIGFueSkuTkFOT1NFQ09ORCA9IFRpbWVVbml0WydOQU5PU0VDT05EJ107XG5cbi8vIChQcmVjaXNpb24gYXMgYW55KS5IQUxGID0gUHJlY2lzaW9uWydIQUxGJ107XG4vLyAoUHJlY2lzaW9uIGFzIGFueSkuU0lOR0xFID0gUHJlY2lzaW9uWydTSU5HTEUnXTtcbi8vIChQcmVjaXNpb24gYXMgYW55KS5ET1VCTEUgPSBQcmVjaXNpb25bJ0RPVUJMRSddO1xuXG4vLyAoVW5pb25Nb2RlIGFzIGFueSkuU3BhcnNlID0gVW5pb25Nb2RlWydTcGFyc2UnXTtcbi8vIChVbmlvbk1vZGUgYXMgYW55KS5EZW5zZSA9IFVuaW9uTW9kZVsnRGVuc2UnXTtcblxuLy8gKFZlY3RvclR5cGUgYXMgYW55KS5PRkZTRVQgPSBWZWN0b3JUeXBlWydPRkZTRVQnXTtcbi8vIChWZWN0b3JUeXBlIGFzIGFueSkuREFUQSA9IFZlY3RvclR5cGVbJ0RBVEEnXTtcbi8vIChWZWN0b3JUeXBlIGFzIGFueSkuVkFMSURJVFkgPSBWZWN0b3JUeXBlWydWQUxJRElUWSddO1xuLy8gKFZlY3RvclR5cGUgYXMgYW55KS5UWVBFID0gVmVjdG9yVHlwZVsnVFlQRSddO1xuXG4vLyAoSW50ZXJ2YWxVbml0IGFzIGFueSkuWUVBUl9NT05USCA9IEludGVydmFsVW5pdFsnWUVBUl9NT05USCddO1xuLy8gKEludGVydmFsVW5pdCBhcyBhbnkpLkRBWV9USU1FID0gSW50ZXJ2YWxVbml0WydEQVlfVElNRSddO1xuXG4vLyAoTWVzc2FnZUhlYWRlciBhcyBhbnkpLk5PTkUgPSBNZXNzYWdlSGVhZGVyWydOT05FJ107XG4vLyAoTWVzc2FnZUhlYWRlciBhcyBhbnkpLlNjaGVtYSA9IE1lc3NhZ2VIZWFkZXJbJ1NjaGVtYSddO1xuLy8gKE1lc3NhZ2VIZWFkZXIgYXMgYW55KS5EaWN0aW9uYXJ5QmF0Y2ggPSBNZXNzYWdlSGVhZGVyWydEaWN0aW9uYXJ5QmF0Y2gnXTtcbi8vIChNZXNzYWdlSGVhZGVyIGFzIGFueSkuUmVjb3JkQmF0Y2ggPSBNZXNzYWdlSGVhZGVyWydSZWNvcmRCYXRjaCddO1xuLy8gKE1lc3NhZ2VIZWFkZXIgYXMgYW55KS5UZW5zb3IgPSBNZXNzYWdlSGVhZGVyWydUZW5zb3InXTtcblxuLy8gKE1ldGFkYXRhVmVyc2lvbiBhcyBhbnkpLlYxID0gTWV0YWRhdGFWZXJzaW9uWydWMSddO1xuLy8gKE1ldGFkYXRhVmVyc2lvbiBhcyBhbnkpLlYyID0gTWV0YWRhdGFWZXJzaW9uWydWMiddO1xuLy8gKE1ldGFkYXRhVmVyc2lvbiBhcyBhbnkpLlYzID0gTWV0YWRhdGFWZXJzaW9uWydWMyddO1xuLy8gKE1ldGFkYXRhVmVyc2lvbiBhcyBhbnkpLlY0ID0gTWV0YWRhdGFWZXJzaW9uWydWNCddO1xuIl19

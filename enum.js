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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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aUVBQTJCLENBQUE7SUFDM0IsK0RBQTJCLENBQUE7SUFDM0IsNkNBQTJCLENBQUE7SUFDM0IsdURBQTJCLENBQUE7SUFDM0IsdURBQTJCLENBQUE7SUFDM0IscURBQTJCLENBQUE7SUFDM0IsNkNBQTJCLENBQUE7SUFDM0IsK0NBQTJCLENBQUE7SUFDM0IsdURBQTJCLENBQUE7SUFDM0IsMkRBQTJCLENBQUE7QUFDL0IsQ0FBQyxFQXZEVyxJQUFJLEdBQUosWUFBSSxLQUFKLFlBQUksUUF1RGYiLCJmaWxlIjoiZW51bS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgKiBhcyBTY2hlbWFfIGZyb20gJy4vZmIvU2NoZW1hJztcbmltcG9ydCAqIGFzIE1lc3NhZ2VfIGZyb20gJy4vZmIvTWVzc2FnZSc7XG5cbmV4cG9ydCBpbXBvcnQgQXJyb3dUeXBlID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuVHlwZTtcbmV4cG9ydCBpbXBvcnQgRGF0ZVVuaXQgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5EYXRlVW5pdDtcbmV4cG9ydCBpbXBvcnQgVGltZVVuaXQgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UaW1lVW5pdDtcbmV4cG9ydCBpbXBvcnQgUHJlY2lzaW9uID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuUHJlY2lzaW9uO1xuZXhwb3J0IGltcG9ydCBVbmlvbk1vZGUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5Vbmlvbk1vZGU7XG5leHBvcnQgaW1wb3J0IFZlY3RvclR5cGUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5WZWN0b3JUeXBlO1xuZXhwb3J0IGltcG9ydCBJbnRlcnZhbFVuaXQgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5JbnRlcnZhbFVuaXQ7XG5leHBvcnQgaW1wb3J0IE1lc3NhZ2VIZWFkZXIgPSBNZXNzYWdlXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTWVzc2FnZUhlYWRlcjtcbmV4cG9ydCBpbXBvcnQgTWV0YWRhdGFWZXJzaW9uID0gU2NoZW1hXy5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuTWV0YWRhdGFWZXJzaW9uO1xuXG4vKipcbiAqICpcbiAqIE1haW4gZGF0YSB0eXBlIGVudW1lcmF0aW9uOlxuICogKlxuICogRGF0YSB0eXBlcyBpbiB0aGlzIGxpYnJhcnkgYXJlIGFsbCAqbG9naWNhbCouIFRoZXkgY2FuIGJlIGV4cHJlc3NlZCBhc1xuICogZWl0aGVyIGEgcHJpbWl0aXZlIHBoeXNpY2FsIHR5cGUgKGJ5dGVzIG9yIGJpdHMgb2Ygc29tZSBmaXhlZCBzaXplKSwgYVxuICogbmVzdGVkIHR5cGUgY29uc2lzdGluZyBvZiBvdGhlciBkYXRhIHR5cGVzLCBvciBhbm90aGVyIGRhdGEgdHlwZSAoZS5nLiBhXG4gKiB0aW1lc3RhbXAgZW5jb2RlZCBhcyBhbiBpbnQ2NClcbiAqL1xuZXhwb3J0IGVudW0gVHlwZSB7XG4gICAgTk9ORSAgICAgICAgICAgID0gIDAsICAvLyBUaGUgZGVmYXVsdCBwbGFjZWhvbGRlciB0eXBlXG4gICAgTnVsbCAgICAgICAgICAgID0gIDEsICAvLyBBIE5VTEwgdHlwZSBoYXZpbmcgbm8gcGh5c2ljYWwgc3RvcmFnZVxuICAgIEludCAgICAgICAgICAgICA9ICAyLCAgLy8gU2lnbmVkIG9yIHVuc2lnbmVkIDgsIDE2LCAzMiwgb3IgNjQtYml0IGxpdHRsZS1lbmRpYW4gaW50ZWdlclxuICAgIEZsb2F0ICAgICAgICAgICA9ICAzLCAgLy8gMiwgNCwgb3IgOC1ieXRlIGZsb2F0aW5nIHBvaW50IHZhbHVlXG4gICAgQmluYXJ5ICAgICAgICAgID0gIDQsICAvLyBWYXJpYWJsZS1sZW5ndGggYnl0ZXMgKG5vIGd1YXJhbnRlZSBvZiBVVEY4LW5lc3MpXG4gICAgVXRmOCAgICAgICAgICAgID0gIDUsICAvLyBVVEY4IHZhcmlhYmxlLWxlbmd0aCBzdHJpbmcgYXMgTGlzdDxDaGFyPlxuICAgIEJvb2wgICAgICAgICAgICA9ICA2LCAgLy8gQm9vbGVhbiBhcyAxIGJpdCwgTFNCIGJpdC1wYWNrZWQgb3JkZXJpbmdcbiAgICBEZWNpbWFsICAgICAgICAgPSAgNywgIC8vIFByZWNpc2lvbi1hbmQtc2NhbGUtYmFzZWQgZGVjaW1hbCB0eXBlLiBTdG9yYWdlIHR5cGUgZGVwZW5kcyBvbiB0aGUgcGFyYW1ldGVycy5cbiAgICBEYXRlICAgICAgICAgICAgPSAgOCwgIC8vIGludDMyX3QgZGF5cyBvciBpbnQ2NF90IG1pbGxpc2Vjb25kcyBzaW5jZSB0aGUgVU5JWCBlcG9jaFxuICAgIFRpbWUgICAgICAgICAgICA9ICA5LCAgLy8gVGltZSBhcyBzaWduZWQgMzIgb3IgNjQtYml0IGludGVnZXIsIHJlcHJlc2VudGluZyBlaXRoZXIgc2Vjb25kcywgbWlsbGlzZWNvbmRzLCBtaWNyb3NlY29uZHMsIG9yIG5hbm9zZWNvbmRzIHNpbmNlIG1pZG5pZ2h0IHNpbmNlIG1pZG5pZ2h0XG4gICAgVGltZXN0YW1wICAgICAgID0gMTAsICAvLyBFeGFjdCB0aW1lc3RhbXAgZW5jb2RlZCB3aXRoIGludDY0IHNpbmNlIFVOSVggZXBvY2ggKERlZmF1bHQgdW5pdCBtaWxsaXNlY29uZClcbiAgICBJbnRlcnZhbCAgICAgICAgPSAxMSwgIC8vIFlFQVJfTU9OVEggb3IgREFZX1RJTUUgaW50ZXJ2YWwgaW4gU1FMIHN0eWxlXG4gICAgTGlzdCAgICAgICAgICAgID0gMTIsICAvLyBBIGxpc3Qgb2Ygc29tZSBsb2dpY2FsIGRhdGEgdHlwZVxuICAgIFN0cnVjdCAgICAgICAgICA9IDEzLCAgLy8gU3RydWN0IG9mIGxvZ2ljYWwgdHlwZXNcbiAgICBVbmlvbiAgICAgICAgICAgPSAxNCwgIC8vIFVuaW9uIG9mIGxvZ2ljYWwgdHlwZXNcbiAgICBGaXhlZFNpemVCaW5hcnkgPSAxNSwgIC8vIEZpeGVkLXNpemUgYmluYXJ5LiBFYWNoIHZhbHVlIG9jY3VwaWVzIHRoZSBzYW1lIG51bWJlciBvZiBieXRlc1xuICAgIEZpeGVkU2l6ZUxpc3QgICA9IDE2LCAgLy8gRml4ZWQtc2l6ZSBsaXN0LiBFYWNoIHZhbHVlIG9jY3VwaWVzIHRoZSBzYW1lIG51bWJlciBvZiBieXRlc1xuICAgIE1hcCAgICAgICAgICAgICA9IDE3LCAgLy8gTWFwIG9mIG5hbWVkIGxvZ2ljYWwgdHlwZXNcblxuICAgIC8vIFRoZXNlIGVudW0gdmFsdWVzIGFyZSBoZXJlIHNvIHRoYXQgVHlwZVNjcmlwdCBjYW4gbmFycm93IHRoZSB0eXBlIHNpZ25hdHVyZXMgZnVydGhlclxuICAgIC8vIGJleW9uZCB0aGUgYmFzZSBBcnJvdyB0eXBlcy4gVGhlIGJhc2UgQXJyb3cgdHlwZXMgaW5jbHVkZSBtZXRhZGF0YSBsaWtlIGJpdFdpZHRocyB0aGF0XG4gICAgLy8gaW1wYWN0IHRoZSB0eXBlIHNpZ25hdHVyZXMgb2YgdGhlIHZhbHVlcyB3ZSByZXR1cm4uIEZvciBleGFtcGxlLCB0aGUgSW50OFZlY3RvciByZWFkc1xuICAgIC8vIDEtYnl0ZSBudW1iZXJzIGZyb20gYW4gSW50OEFycmF5LCBhbiBJbnQzMlZlY3RvciByZWFkcyBhIDQtYnl0ZSBudW1iZXIgZnJvbSBhbiBJbnQzMkFycmF5LFxuICAgIC8vIGFuZCBhbiBJbnQ2NFZlY3RvciByZWFkcyBhIHBhaXIgb2YgNC1ieXRlIGxvLCBoaSBpbnQzMnMsIGFuZCByZXR1cm5zIHRoZW0gYXMgYSB6ZXJvLWNvcHlcbiAgICAvLyBzbGljZSBmcm9tIGFuIHVuZGVybHlpbmcgSW50MzJBcnJheS4gTGlicmFyeSBjb25zdW1lcnMgYmVuZWZpdCBieSBkb2luZyB0aGlzIHR5cGUgbmFycm93aW5nLFxuICAgIC8vIHNpbmNlIHdlIGNhbiBlbnN1cmUgdGhlIHR5cGVzIGFjcm9zcyBhbGwgcHVibGljIG1ldGhvZHMgYXJlIHByb3BhZ2F0ZWQgYW5kIG5ldmVyIGJhaWwgdG8gYGFueWAuXG4gICAgLy8gVGhlc2UgdmFsdWVzIGFyZSBfbmV2ZXJfIGFjdHVhbGx5IHVzZWQgYXQgcnVudGltZSwgYW5kIHRoZXkgd2lsbCBfbmV2ZXJfIGJlIHdyaXR0ZW4gaW50byB0aGVcbiAgICAvLyBmbGF0YnVmZmVycyBtZXRhZGF0YSBvZiBzZXJpYWxpemVkIEFycm93IElQQyBwYXlsb2Fkcy5cbiAgICBEaWN0aW9uYXJ5ICAgICAgICAgICAgPSAtMSwgLy8gRGljdGlvbmFyeSBha2EgQ2F0ZWdvcnkgdHlwZVxuICAgIEludDggICAgICAgICAgICAgICAgICA9IC0yLFxuICAgIEludDE2ICAgICAgICAgICAgICAgICA9IC0zLFxuICAgIEludDMyICAgICAgICAgICAgICAgICA9IC00LFxuICAgIEludDY0ICAgICAgICAgICAgICAgICA9IC01LFxuICAgIFVpbnQ4ICAgICAgICAgICAgICAgICA9IC02LFxuICAgIFVpbnQxNiAgICAgICAgICAgICAgICA9IC03LFxuICAgIFVpbnQzMiAgICAgICAgICAgICAgICA9IC04LFxuICAgIFVpbnQ2NCAgICAgICAgICAgICAgICA9IC05LFxuICAgIEZsb2F0MTYgICAgICAgICAgICAgICA9IC0xMCxcbiAgICBGbG9hdDMyICAgICAgICAgICAgICAgPSAtMTEsXG4gICAgRmxvYXQ2NCAgICAgICAgICAgICAgID0gLTEyLFxuICAgIERhdGVEYXkgICAgICAgICAgICAgICA9IC0xMyxcbiAgICBEYXRlTWlsbGlzZWNvbmQgICAgICAgPSAtMTQsXG4gICAgVGltZXN0YW1wU2Vjb25kICAgICAgID0gLTE1LFxuICAgIFRpbWVzdGFtcE1pbGxpc2Vjb25kICA9IC0xNixcbiAgICBUaW1lc3RhbXBNaWNyb3NlY29uZCAgPSAtMTcsXG4gICAgVGltZXN0YW1wTmFub3NlY29uZCAgID0gLTE4LFxuICAgIFRpbWVTZWNvbmQgICAgICAgICAgICA9IC0xOSxcbiAgICBUaW1lTWlsbGlzZWNvbmQgICAgICAgPSAtMjAsXG4gICAgVGltZU1pY3Jvc2Vjb25kICAgICAgID0gLTIxLFxuICAgIFRpbWVOYW5vc2Vjb25kICAgICAgICA9IC0yMixcbiAgICBEZW5zZVVuaW9uICAgICAgICAgICAgPSAtMjMsXG4gICAgU3BhcnNlVW5pb24gICAgICAgICAgID0gLTI0LFxuICAgIEludGVydmFsRGF5VGltZSAgICAgICA9IC0yNSxcbiAgICBJbnRlcnZhbFllYXJNb250aCAgICAgPSAtMjYsXG59XG4iXX0=

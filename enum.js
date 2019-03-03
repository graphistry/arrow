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

//# sourceMappingURL=enum.js.map

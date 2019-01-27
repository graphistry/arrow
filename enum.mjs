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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUE7SUFDM0IsdUNBQTJCLENBQUE7SUFDM0IsdUNBQTJCLENBQUE7SUFDM0IsdURBQTJCLENBQUE7SUFDM0IsdURBQTJCLENBQUE7SUFDM0IsaUVBQTJCLENBQUE7SUFDM0IsaUVBQTJCLENBQUE7SUFDM0IsK0RBQTJCLENBQUE7SUFDM0IsNkNBQTJCLENBQUE7SUFDM0IsdURBQTJCLENBQUE7SUFDM0IsdURBQTJCLENBQUE7SUFDM0IscURBQTJCLENBQUE7SUFDM0IsNkNBQTJCLENBQUE7SUFDM0IsK0NBQTJCLENBQUE7SUFDM0IsdURBQTJCLENBQUE7SUFDM0IsMkRBQTJCLENBQUE7QUFDL0IsQ0FBQyxFQXZEVyxJQUFJLEtBQUosSUFBSSxRQXVEZiIsImZpbGUiOiJlbnVtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCAqIGFzIFNjaGVtYV8gZnJvbSAnLi9mYi9TY2hlbWEnO1xuaW1wb3J0ICogYXMgTWVzc2FnZV8gZnJvbSAnLi9mYi9NZXNzYWdlJztcblxuZXhwb3J0IGltcG9ydCBBcnJvd1R5cGUgPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5UeXBlO1xuZXhwb3J0IGltcG9ydCBEYXRlVW5pdCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkRhdGVVbml0O1xuZXhwb3J0IGltcG9ydCBUaW1lVW5pdCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlRpbWVVbml0O1xuZXhwb3J0IGltcG9ydCBQcmVjaXNpb24gPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5QcmVjaXNpb247XG5leHBvcnQgaW1wb3J0IFVuaW9uTW9kZSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlVuaW9uTW9kZTtcbmV4cG9ydCBpbXBvcnQgVmVjdG9yVHlwZSA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLlZlY3RvclR5cGU7XG5leHBvcnQgaW1wb3J0IEludGVydmFsVW5pdCA9IFNjaGVtYV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkludGVydmFsVW5pdDtcbmV4cG9ydCBpbXBvcnQgTWVzc2FnZUhlYWRlciA9IE1lc3NhZ2VfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NZXNzYWdlSGVhZGVyO1xuZXhwb3J0IGltcG9ydCBNZXRhZGF0YVZlcnNpb24gPSBTY2hlbWFfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NZXRhZGF0YVZlcnNpb247XG5cbi8qKlxuICogKlxuICogTWFpbiBkYXRhIHR5cGUgZW51bWVyYXRpb246XG4gKiAqXG4gKiBEYXRhIHR5cGVzIGluIHRoaXMgbGlicmFyeSBhcmUgYWxsICpsb2dpY2FsKi4gVGhleSBjYW4gYmUgZXhwcmVzc2VkIGFzXG4gKiBlaXRoZXIgYSBwcmltaXRpdmUgcGh5c2ljYWwgdHlwZSAoYnl0ZXMgb3IgYml0cyBvZiBzb21lIGZpeGVkIHNpemUpLCBhXG4gKiBuZXN0ZWQgdHlwZSBjb25zaXN0aW5nIG9mIG90aGVyIGRhdGEgdHlwZXMsIG9yIGFub3RoZXIgZGF0YSB0eXBlIChlLmcuIGFcbiAqIHRpbWVzdGFtcCBlbmNvZGVkIGFzIGFuIGludDY0KVxuICovXG5leHBvcnQgZW51bSBUeXBlIHtcbiAgICBOT05FICAgICAgICAgICAgPSAgMCwgIC8vIFRoZSBkZWZhdWx0IHBsYWNlaG9sZGVyIHR5cGVcbiAgICBOdWxsICAgICAgICAgICAgPSAgMSwgIC8vIEEgTlVMTCB0eXBlIGhhdmluZyBubyBwaHlzaWNhbCBzdG9yYWdlXG4gICAgSW50ICAgICAgICAgICAgID0gIDIsICAvLyBTaWduZWQgb3IgdW5zaWduZWQgOCwgMTYsIDMyLCBvciA2NC1iaXQgbGl0dGxlLWVuZGlhbiBpbnRlZ2VyXG4gICAgRmxvYXQgICAgICAgICAgID0gIDMsICAvLyAyLCA0LCBvciA4LWJ5dGUgZmxvYXRpbmcgcG9pbnQgdmFsdWVcbiAgICBCaW5hcnkgICAgICAgICAgPSAgNCwgIC8vIFZhcmlhYmxlLWxlbmd0aCBieXRlcyAobm8gZ3VhcmFudGVlIG9mIFVURjgtbmVzcylcbiAgICBVdGY4ICAgICAgICAgICAgPSAgNSwgIC8vIFVURjggdmFyaWFibGUtbGVuZ3RoIHN0cmluZyBhcyBMaXN0PENoYXI+XG4gICAgQm9vbCAgICAgICAgICAgID0gIDYsICAvLyBCb29sZWFuIGFzIDEgYml0LCBMU0IgYml0LXBhY2tlZCBvcmRlcmluZ1xuICAgIERlY2ltYWwgICAgICAgICA9ICA3LCAgLy8gUHJlY2lzaW9uLWFuZC1zY2FsZS1iYXNlZCBkZWNpbWFsIHR5cGUuIFN0b3JhZ2UgdHlwZSBkZXBlbmRzIG9uIHRoZSBwYXJhbWV0ZXJzLlxuICAgIERhdGUgICAgICAgICAgICA9ICA4LCAgLy8gaW50MzJfdCBkYXlzIG9yIGludDY0X3QgbWlsbGlzZWNvbmRzIHNpbmNlIHRoZSBVTklYIGVwb2NoXG4gICAgVGltZSAgICAgICAgICAgID0gIDksICAvLyBUaW1lIGFzIHNpZ25lZCAzMiBvciA2NC1iaXQgaW50ZWdlciwgcmVwcmVzZW50aW5nIGVpdGhlciBzZWNvbmRzLCBtaWxsaXNlY29uZHMsIG1pY3Jvc2Vjb25kcywgb3IgbmFub3NlY29uZHMgc2luY2UgbWlkbmlnaHQgc2luY2UgbWlkbmlnaHRcbiAgICBUaW1lc3RhbXAgICAgICAgPSAxMCwgIC8vIEV4YWN0IHRpbWVzdGFtcCBlbmNvZGVkIHdpdGggaW50NjQgc2luY2UgVU5JWCBlcG9jaCAoRGVmYXVsdCB1bml0IG1pbGxpc2Vjb25kKVxuICAgIEludGVydmFsICAgICAgICA9IDExLCAgLy8gWUVBUl9NT05USCBvciBEQVlfVElNRSBpbnRlcnZhbCBpbiBTUUwgc3R5bGVcbiAgICBMaXN0ICAgICAgICAgICAgPSAxMiwgIC8vIEEgbGlzdCBvZiBzb21lIGxvZ2ljYWwgZGF0YSB0eXBlXG4gICAgU3RydWN0ICAgICAgICAgID0gMTMsICAvLyBTdHJ1Y3Qgb2YgbG9naWNhbCB0eXBlc1xuICAgIFVuaW9uICAgICAgICAgICA9IDE0LCAgLy8gVW5pb24gb2YgbG9naWNhbCB0eXBlc1xuICAgIEZpeGVkU2l6ZUJpbmFyeSA9IDE1LCAgLy8gRml4ZWQtc2l6ZSBiaW5hcnkuIEVhY2ggdmFsdWUgb2NjdXBpZXMgdGhlIHNhbWUgbnVtYmVyIG9mIGJ5dGVzXG4gICAgRml4ZWRTaXplTGlzdCAgID0gMTYsICAvLyBGaXhlZC1zaXplIGxpc3QuIEVhY2ggdmFsdWUgb2NjdXBpZXMgdGhlIHNhbWUgbnVtYmVyIG9mIGJ5dGVzXG4gICAgTWFwICAgICAgICAgICAgID0gMTcsICAvLyBNYXAgb2YgbmFtZWQgbG9naWNhbCB0eXBlc1xuXG4gICAgLy8gVGhlc2UgZW51bSB2YWx1ZXMgYXJlIGhlcmUgc28gdGhhdCBUeXBlU2NyaXB0IGNhbiBuYXJyb3cgdGhlIHR5cGUgc2lnbmF0dXJlcyBmdXJ0aGVyXG4gICAgLy8gYmV5b25kIHRoZSBiYXNlIEFycm93IHR5cGVzLiBUaGUgYmFzZSBBcnJvdyB0eXBlcyBpbmNsdWRlIG1ldGFkYXRhIGxpa2UgYml0V2lkdGhzIHRoYXRcbiAgICAvLyBpbXBhY3QgdGhlIHR5cGUgc2lnbmF0dXJlcyBvZiB0aGUgdmFsdWVzIHdlIHJldHVybi4gRm9yIGV4YW1wbGUsIHRoZSBJbnQ4VmVjdG9yIHJlYWRzXG4gICAgLy8gMS1ieXRlIG51bWJlcnMgZnJvbSBhbiBJbnQ4QXJyYXksIGFuIEludDMyVmVjdG9yIHJlYWRzIGEgNC1ieXRlIG51bWJlciBmcm9tIGFuIEludDMyQXJyYXksXG4gICAgLy8gYW5kIGFuIEludDY0VmVjdG9yIHJlYWRzIGEgcGFpciBvZiA0LWJ5dGUgbG8sIGhpIGludDMycywgYW5kIHJldHVybnMgdGhlbSBhcyBhIHplcm8tY29weVxuICAgIC8vIHNsaWNlIGZyb20gYW4gdW5kZXJseWluZyBJbnQzMkFycmF5LiBMaWJyYXJ5IGNvbnN1bWVycyBiZW5lZml0IGJ5IGRvaW5nIHRoaXMgdHlwZSBuYXJyb3dpbmcsXG4gICAgLy8gc2luY2Ugd2UgY2FuIGVuc3VyZSB0aGUgdHlwZXMgYWNyb3NzIGFsbCBwdWJsaWMgbWV0aG9kcyBhcmUgcHJvcGFnYXRlZCBhbmQgbmV2ZXIgYmFpbCB0byBgYW55YC5cbiAgICAvLyBUaGVzZSB2YWx1ZXMgYXJlIF9uZXZlcl8gYWN0dWFsbHkgdXNlZCBhdCBydW50aW1lLCBhbmQgdGhleSB3aWxsIF9uZXZlcl8gYmUgd3JpdHRlbiBpbnRvIHRoZVxuICAgIC8vIGZsYXRidWZmZXJzIG1ldGFkYXRhIG9mIHNlcmlhbGl6ZWQgQXJyb3cgSVBDIHBheWxvYWRzLlxuICAgIERpY3Rpb25hcnkgICAgICAgICAgICA9IC0xLCAvLyBEaWN0aW9uYXJ5IGFrYSBDYXRlZ29yeSB0eXBlXG4gICAgSW50OCAgICAgICAgICAgICAgICAgID0gLTIsXG4gICAgSW50MTYgICAgICAgICAgICAgICAgID0gLTMsXG4gICAgSW50MzIgICAgICAgICAgICAgICAgID0gLTQsXG4gICAgSW50NjQgICAgICAgICAgICAgICAgID0gLTUsXG4gICAgVWludDggICAgICAgICAgICAgICAgID0gLTYsXG4gICAgVWludDE2ICAgICAgICAgICAgICAgID0gLTcsXG4gICAgVWludDMyICAgICAgICAgICAgICAgID0gLTgsXG4gICAgVWludDY0ICAgICAgICAgICAgICAgID0gLTksXG4gICAgRmxvYXQxNiAgICAgICAgICAgICAgID0gLTEwLFxuICAgIEZsb2F0MzIgICAgICAgICAgICAgICA9IC0xMSxcbiAgICBGbG9hdDY0ICAgICAgICAgICAgICAgPSAtMTIsXG4gICAgRGF0ZURheSAgICAgICAgICAgICAgID0gLTEzLFxuICAgIERhdGVNaWxsaXNlY29uZCAgICAgICA9IC0xNCxcbiAgICBUaW1lc3RhbXBTZWNvbmQgICAgICAgPSAtMTUsXG4gICAgVGltZXN0YW1wTWlsbGlzZWNvbmQgID0gLTE2LFxuICAgIFRpbWVzdGFtcE1pY3Jvc2Vjb25kICA9IC0xNyxcbiAgICBUaW1lc3RhbXBOYW5vc2Vjb25kICAgPSAtMTgsXG4gICAgVGltZVNlY29uZCAgICAgICAgICAgID0gLTE5LFxuICAgIFRpbWVNaWxsaXNlY29uZCAgICAgICA9IC0yMCxcbiAgICBUaW1lTWljcm9zZWNvbmQgICAgICAgPSAtMjEsXG4gICAgVGltZU5hbm9zZWNvbmQgICAgICAgID0gLTIyLFxuICAgIERlbnNlVW5pb24gICAgICAgICAgICA9IC0yMyxcbiAgICBTcGFyc2VVbmlvbiAgICAgICAgICAgPSAtMjQsXG4gICAgSW50ZXJ2YWxEYXlUaW1lICAgICAgID0gLTI1LFxuICAgIEludGVydmFsWWVhck1vbnRoICAgICA9IC0yNixcbn1cbiJdfQ==

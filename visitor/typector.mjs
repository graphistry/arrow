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
import * as type from '../type';
import { Visitor } from '../visitor';
export class GetDataTypeConstructor extends Visitor {
    visitNull() { return type.Null; }
    visitBool() { return type.Bool; }
    visitInt() { return type.Int; }
    visitInt8() { return type.Int8; }
    visitInt16() { return type.Int16; }
    visitInt32() { return type.Int32; }
    visitInt64() { return type.Int64; }
    visitUint8() { return type.Uint8; }
    visitUint16() { return type.Uint16; }
    visitUint32() { return type.Uint32; }
    visitUint64() { return type.Uint64; }
    visitFloat() { return type.Float; }
    visitFloat16() { return type.Float16; }
    visitFloat32() { return type.Float32; }
    visitFloat64() { return type.Float64; }
    visitUtf8() { return type.Utf8; }
    visitBinary() { return type.Binary; }
    visitFixedSizeBinary() { return type.FixedSizeBinary; }
    visitDate() { return type.Date_; }
    visitDateDay() { return type.DateDay; }
    visitDateMillisecond() { return type.DateMillisecond; }
    visitTimestamp() { return type.Timestamp; }
    visitTimestampSecond() { return type.TimestampSecond; }
    visitTimestampMillisecond() { return type.TimestampMillisecond; }
    visitTimestampMicrosecond() { return type.TimestampMicrosecond; }
    visitTimestampNanosecond() { return type.TimestampNanosecond; }
    visitTime() { return type.Time; }
    visitTimeSecond() { return type.TimeSecond; }
    visitTimeMillisecond() { return type.TimeMillisecond; }
    visitTimeMicrosecond() { return type.TimeMicrosecond; }
    visitTimeNanosecond() { return type.TimeNanosecond; }
    visitDecimal() { return type.Decimal; }
    visitList() { return type.List; }
    visitStruct() { return type.Struct; }
    visitUnion() { return type.Union; }
    visitDenseUnion() { return type.DenseUnion; }
    visitSparseUnion() { return type.SparseUnion; }
    visitDictionary() { return type.Dictionary; }
    visitInterval() { return type.Interval; }
    visitIntervalDayTime() { return type.IntervalDayTime; }
    visitIntervalYearMonth() { return type.IntervalYearMonth; }
    visitFixedSizeList() { return type.FixedSizeList; }
    visitMap() { return type.Map_; }
}
export const instance = new GetDataTypeConstructor();

//# sourceMappingURL=data:application/json;charset=utf8;base64,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bGUiOiJ2aXNpdG9yL3R5cGVjdG9yLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IERhdGEgfSBmcm9tICcuLi9kYXRhJztcbmltcG9ydCB7IFR5cGUgfSBmcm9tICcuLi9lbnVtJztcbmltcG9ydCAqIGFzIHR5cGUgZnJvbSAnLi4vdHlwZSc7XG5pbXBvcnQgeyBEYXRhVHlwZSB9IGZyb20gJy4uL3R5cGUnO1xuaW1wb3J0IHsgVmlzaXRvciB9IGZyb20gJy4uL3Zpc2l0b3InO1xuaW1wb3J0IHsgVmVjdG9yIH0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBEYXRhVHlwZUN0b3IgfSBmcm9tICcuLi9pbnRlcmZhY2VzJztcblxuZXhwb3J0IGludGVyZmFjZSBHZXREYXRhVHlwZUNvbnN0cnVjdG9yIGV4dGVuZHMgVmlzaXRvciB7XG4gICAgdmlzaXRNYW55IDxUIGV4dGVuZHMgVHlwZT4gICAgKG5vZGVzOiBUW10gICAgICk6IERhdGFUeXBlQ3RvcjxUPltdO1xuICAgIHZpc2l0ICAgICA8VCBleHRlbmRzIFR5cGU+ICAgIChub2RlOiBULCAgICAgICApOiBEYXRhVHlwZUN0b3I8VD47XG4gICAgZ2V0VmlzaXRGbjxUIGV4dGVuZHMgVHlwZT4gICAgKG5vZGU6IFQgICAgICAgICk6ICgpID0+IERhdGFUeXBlQ3RvcjxUPjtcbiAgICBnZXRWaXNpdEZuPFQgZXh0ZW5kcyBEYXRhVHlwZT4obm9kZTogVmVjdG9yPFQ+KTogKCkgPT4gRGF0YVR5cGVDdG9yPFQ+O1xuICAgIGdldFZpc2l0Rm48VCBleHRlbmRzIERhdGFUeXBlPihub2RlOiBEYXRhPFQ+ICApOiAoKSA9PiBEYXRhVHlwZUN0b3I8VD47XG4gICAgZ2V0VmlzaXRGbjxUIGV4dGVuZHMgRGF0YVR5cGU+KG5vZGU6IFQgICAgICAgICk6ICgpID0+IERhdGFUeXBlQ3RvcjxUPjtcbn1cblxuZXhwb3J0IGNsYXNzIEdldERhdGFUeXBlQ29uc3RydWN0b3IgZXh0ZW5kcyBWaXNpdG9yIHtcbiAgICBwdWJsaWMgdmlzaXROdWxsICAgICAgICAgICAgICAgICAoKSB7IHJldHVybiB0eXBlLk51bGw7IH1cbiAgICBwdWJsaWMgdmlzaXRCb29sICAgICAgICAgICAgICAgICAoKSB7IHJldHVybiB0eXBlLkJvb2w7IH1cbiAgICBwdWJsaWMgdmlzaXRJbnQgICAgICAgICAgICAgICAgICAoKSB7IHJldHVybiB0eXBlLkludDsgfVxuICAgIHB1YmxpYyB2aXNpdEludDggICAgICAgICAgICAgICAgICgpIHsgcmV0dXJuIHR5cGUuSW50ODsgfVxuICAgIHB1YmxpYyB2aXNpdEludDE2ICAgICAgICAgICAgICAgICgpIHsgcmV0dXJuIHR5cGUuSW50MTY7IH1cbiAgICBwdWJsaWMgdmlzaXRJbnQzMiAgICAgICAgICAgICAgICAoKSB7IHJldHVybiB0eXBlLkludDMyOyB9XG4gICAgcHVibGljIHZpc2l0SW50NjQgICAgICAgICAgICAgICAgKCkgeyByZXR1cm4gdHlwZS5JbnQ2NDsgfVxuICAgIHB1YmxpYyB2aXNpdFVpbnQ4ICAgICAgICAgICAgICAgICgpIHsgcmV0dXJuIHR5cGUuVWludDg7IH1cbiAgICBwdWJsaWMgdmlzaXRVaW50MTYgICAgICAgICAgICAgICAoKSB7IHJldHVybiB0eXBlLlVpbnQxNjsgfVxuICAgIHB1YmxpYyB2aXNpdFVpbnQzMiAgICAgICAgICAgICAgICgpIHsgcmV0dXJuIHR5cGUuVWludDMyOyB9XG4gICAgcHVibGljIHZpc2l0VWludDY0ICAgICAgICAgICAgICAgKCkgeyByZXR1cm4gdHlwZS5VaW50NjQ7IH1cbiAgICBwdWJsaWMgdmlzaXRGbG9hdCAgICAgICAgICAgICAgICAoKSB7IHJldHVybiB0eXBlLkZsb2F0OyB9XG4gICAgcHVibGljIHZpc2l0RmxvYXQxNiAgICAgICAgICAgICAgKCkgeyByZXR1cm4gdHlwZS5GbG9hdDE2OyB9XG4gICAgcHVibGljIHZpc2l0RmxvYXQzMiAgICAgICAgICAgICAgKCkgeyByZXR1cm4gdHlwZS5GbG9hdDMyOyB9XG4gICAgcHVibGljIHZpc2l0RmxvYXQ2NCAgICAgICAgICAgICAgKCkgeyByZXR1cm4gdHlwZS5GbG9hdDY0OyB9XG4gICAgcHVibGljIHZpc2l0VXRmOCAgICAgICAgICAgICAgICAgKCkgeyByZXR1cm4gdHlwZS5VdGY4OyB9XG4gICAgcHVibGljIHZpc2l0QmluYXJ5ICAgICAgICAgICAgICAgKCkgeyByZXR1cm4gdHlwZS5CaW5hcnk7IH1cbiAgICBwdWJsaWMgdmlzaXRGaXhlZFNpemVCaW5hcnkgICAgICAoKSB7IHJldHVybiB0eXBlLkZpeGVkU2l6ZUJpbmFyeTsgfVxuICAgIHB1YmxpYyB2aXNpdERhdGUgICAgICAgICAgICAgICAgICgpIHsgcmV0dXJuIHR5cGUuRGF0ZV87IH1cbiAgICBwdWJsaWMgdmlzaXREYXRlRGF5ICAgICAgICAgICAgICAoKSB7IHJldHVybiB0eXBlLkRhdGVEYXk7IH1cbiAgICBwdWJsaWMgdmlzaXREYXRlTWlsbGlzZWNvbmQgICAgICAoKSB7IHJldHVybiB0eXBlLkRhdGVNaWxsaXNlY29uZDsgfVxuICAgIHB1YmxpYyB2aXNpdFRpbWVzdGFtcCAgICAgICAgICAgICgpIHsgcmV0dXJuIHR5cGUuVGltZXN0YW1wOyB9XG4gICAgcHVibGljIHZpc2l0VGltZXN0YW1wU2Vjb25kICAgICAgKCkgeyByZXR1cm4gdHlwZS5UaW1lc3RhbXBTZWNvbmQ7IH1cbiAgICBwdWJsaWMgdmlzaXRUaW1lc3RhbXBNaWxsaXNlY29uZCAoKSB7IHJldHVybiB0eXBlLlRpbWVzdGFtcE1pbGxpc2Vjb25kOyB9XG4gICAgcHVibGljIHZpc2l0VGltZXN0YW1wTWljcm9zZWNvbmQgKCkgeyByZXR1cm4gdHlwZS5UaW1lc3RhbXBNaWNyb3NlY29uZDsgfVxuICAgIHB1YmxpYyB2aXNpdFRpbWVzdGFtcE5hbm9zZWNvbmQgICgpIHsgcmV0dXJuIHR5cGUuVGltZXN0YW1wTmFub3NlY29uZDsgfVxuICAgIHB1YmxpYyB2aXNpdFRpbWUgICAgICAgICAgICAgICAgICgpIHsgcmV0dXJuIHR5cGUuVGltZTsgfVxuICAgIHB1YmxpYyB2aXNpdFRpbWVTZWNvbmQgICAgICAgICAgICgpIHsgcmV0dXJuIHR5cGUuVGltZVNlY29uZDsgfVxuICAgIHB1YmxpYyB2aXNpdFRpbWVNaWxsaXNlY29uZCAgICAgICgpIHsgcmV0dXJuIHR5cGUuVGltZU1pbGxpc2Vjb25kOyB9XG4gICAgcHVibGljIHZpc2l0VGltZU1pY3Jvc2Vjb25kICAgICAgKCkgeyByZXR1cm4gdHlwZS5UaW1lTWljcm9zZWNvbmQ7IH1cbiAgICBwdWJsaWMgdmlzaXRUaW1lTmFub3NlY29uZCAgICAgICAoKSB7IHJldHVybiB0eXBlLlRpbWVOYW5vc2Vjb25kOyB9XG4gICAgcHVibGljIHZpc2l0RGVjaW1hbCAgICAgICAgICAgICAgKCkgeyByZXR1cm4gdHlwZS5EZWNpbWFsOyB9XG4gICAgcHVibGljIHZpc2l0TGlzdCAgICAgICAgICAgICAgICAgKCkgeyByZXR1cm4gdHlwZS5MaXN0OyB9XG4gICAgcHVibGljIHZpc2l0U3RydWN0ICAgICAgICAgICAgICAgKCkgeyByZXR1cm4gdHlwZS5TdHJ1Y3Q7IH1cbiAgICBwdWJsaWMgdmlzaXRVbmlvbiAgICAgICAgICAgICAgICAoKSB7IHJldHVybiB0eXBlLlVuaW9uOyB9XG4gICAgcHVibGljIHZpc2l0RGVuc2VVbmlvbiAgICAgICAgICAgKCkgeyByZXR1cm4gdHlwZS5EZW5zZVVuaW9uOyB9XG4gICAgcHVibGljIHZpc2l0U3BhcnNlVW5pb24gICAgICAgICAgKCkgeyByZXR1cm4gdHlwZS5TcGFyc2VVbmlvbjsgfVxuICAgIHB1YmxpYyB2aXNpdERpY3Rpb25hcnkgICAgICAgICAgICgpIHsgcmV0dXJuIHR5cGUuRGljdGlvbmFyeTsgfVxuICAgIHB1YmxpYyB2aXNpdEludGVydmFsICAgICAgICAgICAgICgpIHsgcmV0dXJuIHR5cGUuSW50ZXJ2YWw7IH1cbiAgICBwdWJsaWMgdmlzaXRJbnRlcnZhbERheVRpbWUgICAgICAoKSB7IHJldHVybiB0eXBlLkludGVydmFsRGF5VGltZTsgfVxuICAgIHB1YmxpYyB2aXNpdEludGVydmFsWWVhck1vbnRoICAgICgpIHsgcmV0dXJuIHR5cGUuSW50ZXJ2YWxZZWFyTW9udGg7IH1cbiAgICBwdWJsaWMgdmlzaXRGaXhlZFNpemVMaXN0ICAgICAgICAoKSB7IHJldHVybiB0eXBlLkZpeGVkU2l6ZUxpc3Q7IH1cbiAgICBwdWJsaWMgdmlzaXRNYXAgICAgICAgICAgICAgICAgICAoKSB7IHJldHVybiB0eXBlLk1hcF87IH1cbn1cblxuZXhwb3J0IGNvbnN0IGluc3RhbmNlID0gbmV3IEdldERhdGFUeXBlQ29uc3RydWN0b3IoKTtcbiJdfQ==
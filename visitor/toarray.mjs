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
import { Visitor } from '../visitor';
import { Type, Precision } from '../enum';
import { instance as iteratorVisitor } from './iterator';
export class ToArrayVisitor extends Visitor {
}
function arrayOfVector(vector) {
    const { type, length, stride } = vector;
    // Fast case, return subarray if possible
    switch (type.typeId) {
        case Type.Int:
        case Type.Decimal:
        case Type.Time:
        case Type.Timestamp:
            return vector.values.subarray(0, length * stride);
        case Type.Float:
            return type.precision === Precision.HALF /* Precision.HALF */
                ? new Float32Array(vector[Symbol.iterator]())
                : vector.values.subarray(0, length * stride);
    }
    // Otherwise if not primitive, slow copy
    return [...iteratorVisitor.visit(vector)];
}
ToArrayVisitor.prototype.visitNull = arrayOfVector;
ToArrayVisitor.prototype.visitBool = arrayOfVector;
ToArrayVisitor.prototype.visitInt = arrayOfVector;
ToArrayVisitor.prototype.visitInt8 = arrayOfVector;
ToArrayVisitor.prototype.visitInt16 = arrayOfVector;
ToArrayVisitor.prototype.visitInt32 = arrayOfVector;
ToArrayVisitor.prototype.visitInt64 = arrayOfVector;
ToArrayVisitor.prototype.visitUint8 = arrayOfVector;
ToArrayVisitor.prototype.visitUint16 = arrayOfVector;
ToArrayVisitor.prototype.visitUint32 = arrayOfVector;
ToArrayVisitor.prototype.visitUint64 = arrayOfVector;
ToArrayVisitor.prototype.visitFloat = arrayOfVector;
ToArrayVisitor.prototype.visitFloat16 = arrayOfVector;
ToArrayVisitor.prototype.visitFloat32 = arrayOfVector;
ToArrayVisitor.prototype.visitFloat64 = arrayOfVector;
ToArrayVisitor.prototype.visitUtf8 = arrayOfVector;
ToArrayVisitor.prototype.visitBinary = arrayOfVector;
ToArrayVisitor.prototype.visitFixedSizeBinary = arrayOfVector;
ToArrayVisitor.prototype.visitDate = arrayOfVector;
ToArrayVisitor.prototype.visitDateDay = arrayOfVector;
ToArrayVisitor.prototype.visitDateMillisecond = arrayOfVector;
ToArrayVisitor.prototype.visitTimestamp = arrayOfVector;
ToArrayVisitor.prototype.visitTimestampSecond = arrayOfVector;
ToArrayVisitor.prototype.visitTimestampMillisecond = arrayOfVector;
ToArrayVisitor.prototype.visitTimestampMicrosecond = arrayOfVector;
ToArrayVisitor.prototype.visitTimestampNanosecond = arrayOfVector;
ToArrayVisitor.prototype.visitTime = arrayOfVector;
ToArrayVisitor.prototype.visitTimeSecond = arrayOfVector;
ToArrayVisitor.prototype.visitTimeMillisecond = arrayOfVector;
ToArrayVisitor.prototype.visitTimeMicrosecond = arrayOfVector;
ToArrayVisitor.prototype.visitTimeNanosecond = arrayOfVector;
ToArrayVisitor.prototype.visitDecimal = arrayOfVector;
ToArrayVisitor.prototype.visitList = arrayOfVector;
ToArrayVisitor.prototype.visitStruct = arrayOfVector;
ToArrayVisitor.prototype.visitUnion = arrayOfVector;
ToArrayVisitor.prototype.visitDenseUnion = arrayOfVector;
ToArrayVisitor.prototype.visitSparseUnion = arrayOfVector;
ToArrayVisitor.prototype.visitDictionary = arrayOfVector;
ToArrayVisitor.prototype.visitInterval = arrayOfVector;
ToArrayVisitor.prototype.visitIntervalDayTime = arrayOfVector;
ToArrayVisitor.prototype.visitIntervalYearMonth = arrayOfVector;
ToArrayVisitor.prototype.visitFixedSizeList = arrayOfVector;
ToArrayVisitor.prototype.visitMap = arrayOfVector;
export const instance = new ToArrayVisitor();

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QWEsQ0FBQztBQUNuRSxjQUFjLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBa0IsYUFBYSxDQUFDO0FBQ25FLGNBQWMsQ0FBQyxTQUFTLENBQUMsZUFBZSxHQUFhLGFBQWEsQ0FBQztBQUNuRSxjQUFjLENBQUMsU0FBUyxDQUFDLGdCQUFnQixHQUFZLGFBQWEsQ0FBQztBQUNuRSxjQUFjLENBQUMsU0FBUyxDQUFDLGVBQWUsR0FBYSxhQUFhLENBQUM7QUFDbkUsY0FBYyxDQUFDLFNBQVMsQ0FBQyxhQUFhLEdBQWUsYUFBYSxDQUFDO0FBQ25FLGNBQWMsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLEdBQVEsYUFBYSxDQUFDO0FBQ25FLGNBQWMsQ0FBQyxTQUFTLENBQUMsc0JBQXNCLEdBQU0sYUFBYSxDQUFDO0FBQ25FLGNBQWMsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEdBQVUsYUFBYSxDQUFDO0FBQ25FLGNBQWMsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFvQixhQUFhLENBQUM7QUFFbkUsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLElBQUksY0FBYyxFQUFFLENBQUMiLCJmaWxlIjoidmlzaXRvci90b2FycmF5LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IERhdGEgfSBmcm9tICcuLi9kYXRhJztcbmltcG9ydCB7IFZpc2l0b3IgfSBmcm9tICcuLi92aXNpdG9yJztcbmltcG9ydCB7IFZlY3RvciB9IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgVHlwZSwgUHJlY2lzaW9uIH0gZnJvbSAnLi4vZW51bSc7XG5pbXBvcnQgeyBpbnN0YW5jZSBhcyBpdGVyYXRvclZpc2l0b3IgfSBmcm9tICcuL2l0ZXJhdG9yJztcbmltcG9ydCB7XG4gICAgRGF0YVR5cGUsIERpY3Rpb25hcnksXG4gICAgQm9vbCwgTnVsbCwgVXRmOCwgQmluYXJ5LCBEZWNpbWFsLCBGaXhlZFNpemVCaW5hcnksIExpc3QsIEZpeGVkU2l6ZUxpc3QsIE1hcF8sIFN0cnVjdCxcbiAgICBGbG9hdCwgRmxvYXQxNiwgRmxvYXQzMiwgRmxvYXQ2NCxcbiAgICBJbnQsIFVpbnQ4LCBVaW50MTYsIFVpbnQzMiwgVWludDY0LCBJbnQ4LCBJbnQxNiwgSW50MzIsIEludDY0LFxuICAgIERhdGVfLCBEYXRlRGF5LCBEYXRlTWlsbGlzZWNvbmQsXG4gICAgSW50ZXJ2YWwsIEludGVydmFsRGF5VGltZSwgSW50ZXJ2YWxZZWFyTW9udGgsXG4gICAgVGltZSwgVGltZVNlY29uZCwgVGltZU1pbGxpc2Vjb25kLCBUaW1lTWljcm9zZWNvbmQsIFRpbWVOYW5vc2Vjb25kLFxuICAgIFRpbWVzdGFtcCwgVGltZXN0YW1wU2Vjb25kLCBUaW1lc3RhbXBNaWxsaXNlY29uZCwgVGltZXN0YW1wTWljcm9zZWNvbmQsIFRpbWVzdGFtcE5hbm9zZWNvbmQsXG4gICAgVW5pb24sIERlbnNlVW5pb24sIFNwYXJzZVVuaW9uLFxufSBmcm9tICcuLi90eXBlJztcblxuZXhwb3J0IGludGVyZmFjZSBUb0FycmF5VmlzaXRvciBleHRlbmRzIFZpc2l0b3Ige1xuICAgIHZpc2l0TWFueSA8VCBleHRlbmRzIFZlY3Rvcj4gIChub2RlczogVFtdICAgICApOiBUWydUQXJyYXknXVtdO1xuICAgIHZpc2l0ICAgICA8VCBleHRlbmRzIFZlY3Rvcj4gIChub2RlOiBUICAgICAgICApOiBUWydUQXJyYXknXTtcbiAgICBnZXRWaXNpdEZuPFQgZXh0ZW5kcyBUeXBlPiAgICAobm9kZTogVCAgICAgICAgKTogKHZlY3RvcjogVmVjdG9yPFQ+KSA9PiBWZWN0b3I8VD5bJ1RBcnJheSddO1xuICAgIGdldFZpc2l0Rm48VCBleHRlbmRzIERhdGFUeXBlPihub2RlOiBWZWN0b3I8VD4pOiAodmVjdG9yOiBWZWN0b3I8VD4pID0+IFZlY3RvcjxUPlsnVEFycmF5J107XG4gICAgZ2V0VmlzaXRGbjxUIGV4dGVuZHMgRGF0YVR5cGU+KG5vZGU6IERhdGE8VD4gICk6ICh2ZWN0b3I6IFZlY3RvcjxUPikgPT4gVmVjdG9yPFQ+WydUQXJyYXknXTtcbiAgICBnZXRWaXNpdEZuPFQgZXh0ZW5kcyBEYXRhVHlwZT4obm9kZTogVCAgICAgICAgKTogKHZlY3RvcjogVmVjdG9yPFQ+KSA9PiBWZWN0b3I8VD5bJ1RBcnJheSddO1xuICAgIHZpc2l0TnVsbCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUIGV4dGVuZHMgTnVsbD4gICAgICAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPFQ+KTogVmVjdG9yPFQ+WydUQXJyYXknXTtcbiAgICB2aXNpdEJvb2wgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VCBleHRlbmRzIEJvb2w+ICAgICAgICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxUPik6IFZlY3RvcjxUPlsnVEFycmF5J107XG4gICAgdmlzaXRJbnQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFQgZXh0ZW5kcyBJbnQ+ICAgICAgICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8VD4pOiBWZWN0b3I8VD5bJ1RBcnJheSddO1xuICAgIHZpc2l0SW50OCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUIGV4dGVuZHMgSW50OD4gICAgICAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPFQ+KTogVmVjdG9yPFQ+WydUQXJyYXknXTtcbiAgICB2aXNpdEludDE2ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VCBleHRlbmRzIEludDE2PiAgICAgICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxUPik6IFZlY3RvcjxUPlsnVEFycmF5J107XG4gICAgdmlzaXRJbnQzMiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFQgZXh0ZW5kcyBJbnQzMj4gICAgICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8VD4pOiBWZWN0b3I8VD5bJ1RBcnJheSddO1xuICAgIHZpc2l0SW50NjQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUIGV4dGVuZHMgSW50NjQ+ICAgICAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPFQ+KTogVmVjdG9yPFQ+WydUQXJyYXknXTtcbiAgICB2aXNpdFVpbnQ4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VCBleHRlbmRzIFVpbnQ4PiAgICAgICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxUPik6IFZlY3RvcjxUPlsnVEFycmF5J107XG4gICAgdmlzaXRVaW50MTYgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFQgZXh0ZW5kcyBVaW50MTY+ICAgICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8VD4pOiBWZWN0b3I8VD5bJ1RBcnJheSddO1xuICAgIHZpc2l0VWludDMyICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUIGV4dGVuZHMgVWludDMyPiAgICAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPFQ+KTogVmVjdG9yPFQ+WydUQXJyYXknXTtcbiAgICB2aXNpdFVpbnQ2NCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VCBleHRlbmRzIFVpbnQ2ND4gICAgICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxUPik6IFZlY3RvcjxUPlsnVEFycmF5J107XG4gICAgdmlzaXRGbG9hdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFQgZXh0ZW5kcyBGbG9hdD4gICAgICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8VD4pOiBWZWN0b3I8VD5bJ1RBcnJheSddO1xuICAgIHZpc2l0RmxvYXQxNiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUIGV4dGVuZHMgRmxvYXQxNj4gICAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPFQ+KTogVmVjdG9yPFQ+WydUQXJyYXknXTtcbiAgICB2aXNpdEZsb2F0MzIgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VCBleHRlbmRzIEZsb2F0MzI+ICAgICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxUPik6IFZlY3RvcjxUPlsnVEFycmF5J107XG4gICAgdmlzaXRGbG9hdDY0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFQgZXh0ZW5kcyBGbG9hdDY0PiAgICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8VD4pOiBWZWN0b3I8VD5bJ1RBcnJheSddO1xuICAgIHZpc2l0VXRmOCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUIGV4dGVuZHMgVXRmOD4gICAgICAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPFQ+KTogVmVjdG9yPFQ+WydUQXJyYXknXTtcbiAgICB2aXNpdEJpbmFyeSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VCBleHRlbmRzIEJpbmFyeT4gICAgICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxUPik6IFZlY3RvcjxUPlsnVEFycmF5J107XG4gICAgdmlzaXRGaXhlZFNpemVCaW5hcnkgICAgICAgICAgICAgICAgICAgICAgICAgPFQgZXh0ZW5kcyBGaXhlZFNpemVCaW5hcnk+ICAgICAodmVjdG9yOiBWZWN0b3I8VD4pOiBWZWN0b3I8VD5bJ1RBcnJheSddO1xuICAgIHZpc2l0RGF0ZSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUIGV4dGVuZHMgRGF0ZV8+ICAgICAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPFQ+KTogVmVjdG9yPFQ+WydUQXJyYXknXTtcbiAgICB2aXNpdERhdGVEYXkgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VCBleHRlbmRzIERhdGVEYXk+ICAgICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxUPik6IFZlY3RvcjxUPlsnVEFycmF5J107XG4gICAgdmlzaXREYXRlTWlsbGlzZWNvbmQgICAgICAgICAgICAgICAgICAgICAgICAgPFQgZXh0ZW5kcyBEYXRlTWlsbGlzZWNvbmQ+ICAgICAodmVjdG9yOiBWZWN0b3I8VD4pOiBWZWN0b3I8VD5bJ1RBcnJheSddO1xuICAgIHZpc2l0VGltZXN0YW1wICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUIGV4dGVuZHMgVGltZXN0YW1wPiAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPFQ+KTogVmVjdG9yPFQ+WydUQXJyYXknXTtcbiAgICB2aXNpdFRpbWVzdGFtcFNlY29uZCAgICAgICAgICAgICAgICAgICAgICAgICA8VCBleHRlbmRzIFRpbWVzdGFtcFNlY29uZD4gICAgICh2ZWN0b3I6IFZlY3RvcjxUPik6IFZlY3RvcjxUPlsnVEFycmF5J107XG4gICAgdmlzaXRUaW1lc3RhbXBNaWxsaXNlY29uZCAgICAgICAgICAgICAgICAgICAgPFQgZXh0ZW5kcyBUaW1lc3RhbXBNaWxsaXNlY29uZD4odmVjdG9yOiBWZWN0b3I8VD4pOiBWZWN0b3I8VD5bJ1RBcnJheSddO1xuICAgIHZpc2l0VGltZXN0YW1wTWljcm9zZWNvbmQgICAgICAgICAgICAgICAgICAgIDxUIGV4dGVuZHMgVGltZXN0YW1wTWljcm9zZWNvbmQ+KHZlY3RvcjogVmVjdG9yPFQ+KTogVmVjdG9yPFQ+WydUQXJyYXknXTtcbiAgICB2aXNpdFRpbWVzdGFtcE5hbm9zZWNvbmQgICAgICAgICAgICAgICAgICAgICA8VCBleHRlbmRzIFRpbWVzdGFtcE5hbm9zZWNvbmQ+ICh2ZWN0b3I6IFZlY3RvcjxUPik6IFZlY3RvcjxUPlsnVEFycmF5J107XG4gICAgdmlzaXRUaW1lICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFQgZXh0ZW5kcyBUaW1lPiAgICAgICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8VD4pOiBWZWN0b3I8VD5bJ1RBcnJheSddO1xuICAgIHZpc2l0VGltZVNlY29uZCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUIGV4dGVuZHMgVGltZVNlY29uZD4gICAgICAgICAgKHZlY3RvcjogVmVjdG9yPFQ+KTogVmVjdG9yPFQ+WydUQXJyYXknXTtcbiAgICB2aXNpdFRpbWVNaWxsaXNlY29uZCAgICAgICAgICAgICAgICAgICAgICAgICA8VCBleHRlbmRzIFRpbWVNaWxsaXNlY29uZD4gICAgICh2ZWN0b3I6IFZlY3RvcjxUPik6IFZlY3RvcjxUPlsnVEFycmF5J107XG4gICAgdmlzaXRUaW1lTWljcm9zZWNvbmQgICAgICAgICAgICAgICAgICAgICAgICAgPFQgZXh0ZW5kcyBUaW1lTWljcm9zZWNvbmQ+ICAgICAodmVjdG9yOiBWZWN0b3I8VD4pOiBWZWN0b3I8VD5bJ1RBcnJheSddO1xuICAgIHZpc2l0VGltZU5hbm9zZWNvbmQgICAgICAgICAgICAgICAgICAgICAgICAgIDxUIGV4dGVuZHMgVGltZU5hbm9zZWNvbmQ+ICAgICAgKHZlY3RvcjogVmVjdG9yPFQ+KTogVmVjdG9yPFQ+WydUQXJyYXknXTtcbiAgICB2aXNpdERlY2ltYWwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VCBleHRlbmRzIERlY2ltYWw+ICAgICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxUPik6IFZlY3RvcjxUPlsnVEFycmF5J107XG4gICAgdmlzaXRMaXN0ICAgICAgICAgICAgICAgIDxSIGV4dGVuZHMgRGF0YVR5cGUsIFQgZXh0ZW5kcyBMaXN0PFI+PiAgICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8VD4pOiBWZWN0b3I8VD5bJ1RBcnJheSddO1xuICAgIHZpc2l0U3RydWN0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUIGV4dGVuZHMgU3RydWN0PiAgICAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPFQ+KTogVmVjdG9yPFQ+WydUQXJyYXknXTtcbiAgICB2aXNpdFVuaW9uICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VCBleHRlbmRzIFVuaW9uPiAgICAgICAgICAgICAgICh2ZWN0b3I6IFZlY3RvcjxUPik6IFZlY3RvcjxUPlsnVEFycmF5J107XG4gICAgdmlzaXREZW5zZVVuaW9uICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFQgZXh0ZW5kcyBEZW5zZVVuaW9uPiAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8VD4pOiBWZWN0b3I8VD5bJ1RBcnJheSddO1xuICAgIHZpc2l0U3BhcnNlVW5pb24gICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUIGV4dGVuZHMgU3BhcnNlVW5pb24+ICAgICAgICAgKHZlY3RvcjogVmVjdG9yPFQ+KTogVmVjdG9yPFQ+WydUQXJyYXknXTtcbiAgICB2aXNpdERpY3Rpb25hcnkgICAgICAgICAgPFIgZXh0ZW5kcyBEYXRhVHlwZSwgVCBleHRlbmRzIERpY3Rpb25hcnk8Uj4+ICAgICAgICh2ZWN0b3I6IFZlY3RvcjxUPik6IFZlY3RvcjxUPlsnVEFycmF5J107XG4gICAgdmlzaXRJbnRlcnZhbCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFQgZXh0ZW5kcyBJbnRlcnZhbD4gICAgICAgICAgICAodmVjdG9yOiBWZWN0b3I8VD4pOiBWZWN0b3I8VD5bJ1RBcnJheSddO1xuICAgIHZpc2l0SW50ZXJ2YWxEYXlUaW1lICAgICAgICAgICAgICAgICAgICAgICAgIDxUIGV4dGVuZHMgSW50ZXJ2YWxEYXlUaW1lPiAgICAgKHZlY3RvcjogVmVjdG9yPFQ+KTogVmVjdG9yPFQ+WydUQXJyYXknXTtcbiAgICB2aXNpdEludGVydmFsWWVhck1vbnRoICAgICAgICAgICAgICAgICAgICAgICA8VCBleHRlbmRzIEludGVydmFsWWVhck1vbnRoPiAgICh2ZWN0b3I6IFZlY3RvcjxUPik6IFZlY3RvcjxUPlsnVEFycmF5J107XG4gICAgdmlzaXRGaXhlZFNpemVMaXN0ICAgICAgIDxSIGV4dGVuZHMgRGF0YVR5cGUsIFQgZXh0ZW5kcyBGaXhlZFNpemVMaXN0PFI+PiAgICAodmVjdG9yOiBWZWN0b3I8VD4pOiBWZWN0b3I8VD5bJ1RBcnJheSddO1xuICAgIHZpc2l0TWFwICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUIGV4dGVuZHMgTWFwXz4gICAgICAgICAgICAgICAgKHZlY3RvcjogVmVjdG9yPFQ+KTogVmVjdG9yPFQ+WydUQXJyYXknXTtcbn1cblxuZXhwb3J0IGNsYXNzIFRvQXJyYXlWaXNpdG9yIGV4dGVuZHMgVmlzaXRvciB7fVxuXG5mdW5jdGlvbiBhcnJheU9mVmVjdG9yPFQgZXh0ZW5kcyBEYXRhVHlwZT4odmVjdG9yOiBWZWN0b3I8VD4pOiBUWydUQXJyYXknXSB7XG5cbiAgICBjb25zdCB7IHR5cGUsIGxlbmd0aCwgc3RyaWRlIH0gPSB2ZWN0b3I7XG5cbiAgICAvLyBGYXN0IGNhc2UsIHJldHVybiBzdWJhcnJheSBpZiBwb3NzaWJsZVxuICAgIHN3aXRjaCAodHlwZS50eXBlSWQpIHtcbiAgICAgICAgY2FzZSBUeXBlLkludDogY2FzZSBUeXBlLkRlY2ltYWw6XG4gICAgICAgIGNhc2UgVHlwZS5UaW1lOiBjYXNlIFR5cGUuVGltZXN0YW1wOlxuICAgICAgICAgICAgcmV0dXJuIHZlY3Rvci52YWx1ZXMuc3ViYXJyYXkoMCwgbGVuZ3RoICogc3RyaWRlKTtcbiAgICAgICAgY2FzZSBUeXBlLkZsb2F0OlxuICAgICAgICAgICAgcmV0dXJuICh0eXBlIGFzIEZsb2F0KS5wcmVjaXNpb24gPT09IFByZWNpc2lvbi5IQUxGIC8qIFByZWNpc2lvbi5IQUxGICovXG4gICAgICAgICAgICAgICAgPyBuZXcgRmxvYXQzMkFycmF5KHZlY3RvcltTeW1ib2wuaXRlcmF0b3JdKCkpXG4gICAgICAgICAgICAgICAgOiB2ZWN0b3IudmFsdWVzLnN1YmFycmF5KDAsIGxlbmd0aCAqIHN0cmlkZSk7XG4gICAgfVxuXG4gICAgLy8gT3RoZXJ3aXNlIGlmIG5vdCBwcmltaXRpdmUsIHNsb3cgY29weVxuICAgIHJldHVybiBbLi4uaXRlcmF0b3JWaXNpdG9yLnZpc2l0KHZlY3RvcildIGFzIFRbJ1RBcnJheSddO1xufVxuXG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXROdWxsICAgICAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRCb29sICAgICAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRJbnQgICAgICAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRJbnQ4ICAgICAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRJbnQxNiAgICAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRJbnQzMiAgICAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRJbnQ2NCAgICAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRVaW50OCAgICAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRVaW50MTYgICAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRVaW50MzIgICAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRVaW50NjQgICAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRGbG9hdCAgICAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRGbG9hdDE2ICAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRGbG9hdDMyICAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRGbG9hdDY0ICAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRVdGY4ICAgICAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRCaW5hcnkgICAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRGaXhlZFNpemVCaW5hcnkgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXREYXRlICAgICAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXREYXRlRGF5ICAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXREYXRlTWlsbGlzZWNvbmQgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRUaW1lc3RhbXAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRUaW1lc3RhbXBTZWNvbmQgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRUaW1lc3RhbXBNaWxsaXNlY29uZCA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRUaW1lc3RhbXBNaWNyb3NlY29uZCA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRUaW1lc3RhbXBOYW5vc2Vjb25kICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRUaW1lICAgICAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRUaW1lU2Vjb25kICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRUaW1lTWlsbGlzZWNvbmQgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRUaW1lTWljcm9zZWNvbmQgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRUaW1lTmFub3NlY29uZCAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXREZWNpbWFsICAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRMaXN0ICAgICAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRTdHJ1Y3QgICAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRVbmlvbiAgICAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXREZW5zZVVuaW9uICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRTcGFyc2VVbmlvbiAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXREaWN0aW9uYXJ5ICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRJbnRlcnZhbCAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRJbnRlcnZhbERheVRpbWUgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRJbnRlcnZhbFllYXJNb250aCAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRGaXhlZFNpemVMaXN0ICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5Ub0FycmF5VmlzaXRvci5wcm90b3R5cGUudmlzaXRNYXAgICAgICAgICAgICAgICAgICA9IGFycmF5T2ZWZWN0b3I7XG5cbmV4cG9ydCBjb25zdCBpbnN0YW5jZSA9IG5ldyBUb0FycmF5VmlzaXRvcigpO1xuIl19

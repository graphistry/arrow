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
export { Row } from './row';
export { Vector } from '../vector';
export { BaseVector } from './base';
export { BinaryVector } from './binary';
export { BoolVector } from './bool';
export { Chunked } from './chunked';
export { DateVector, DateDayVector, DateMillisecondVector } from './date';
export { DecimalVector } from './decimal';
export { DictionaryVector } from './dictionary';
export { FixedSizeBinaryVector } from './fixedsizebinary';
export { FixedSizeListVector } from './fixedsizelist';
export { FloatVector, Float16Vector, Float32Vector, Float64Vector } from './float';
export { IntervalVector, IntervalDayTimeVector, IntervalYearMonthVector } from './interval';
export { IntVector, Int8Vector, Int16Vector, Int32Vector, Int64Vector, Uint8Vector, Uint16Vector, Uint32Vector, Uint64Vector } from './int';
export { ListVector } from './list';
export { MapVector } from './map';
export { NullVector } from './null';
export { StructVector } from './struct';
export { TimestampVector, TimestampSecondVector, TimestampMillisecondVector, TimestampMicrosecondVector, TimestampNanosecondVector } from './timestamp';
export { TimeVector, TimeSecondVector, TimeMillisecondVector, TimeMicrosecondVector, TimeNanosecondVector } from './time';
export { UnionVector, DenseUnionVector, SparseUnionVector } from './union';
export { Utf8Vector } from './utf8';
import { Type } from '../enum';
import { Vector } from '../vector';
import { BaseVector } from './base';
import { setBool } from '../util/bit';
import { instance as getVisitor } from '../visitor/get';
import { instance as setVisitor } from '../visitor/set';
import { instance as indexOfVisitor } from '../visitor/indexof';
import { instance as toArrayVisitor } from '../visitor/toarray';
import { instance as iteratorVisitor } from '../visitor/iterator';
import { instance as byteWidthVisitor } from '../visitor/bytewidth';
import { instance as getVectorConstructor } from '../visitor/vectorctor';
/** @nocollapse */
Vector.new = newVector;
/** @ignore */
function newVector(data, ...args) {
    return new (getVectorConstructor.getVisitFn(data.type)())(data, ...args);
}
//
// We provide the following method implementations for code navigability purposes only.
// They're overridden at runtime below with the specific Visitor implementation for each type,
// short-circuiting the usual Visitor traversal and reducing intermediate lookups and calls.
// This comment is here to remind you to not set breakpoints in these function bodies, or to inform
// you why the breakpoints you have already set are not being triggered. Have a great day!
//
BaseVector.prototype.get = function baseVectorGet(index) {
    return getVisitor.visit(this, index);
};
BaseVector.prototype.set = function baseVectorSet(index, value) {
    return setVisitor.visit(this, index, value);
};
BaseVector.prototype.indexOf = function baseVectorIndexOf(value, fromIndex) {
    return indexOfVisitor.visit(this, value, fromIndex);
};
BaseVector.prototype.toArray = function baseVectorToArray() {
    return toArrayVisitor.visit(this);
};
BaseVector.prototype.getByteWidth = function baseVectorGetByteWidth() {
    return byteWidthVisitor.visit(this.type);
};
BaseVector.prototype[Symbol.iterator] = function baseVectorSymbolIterator() {
    return iteratorVisitor.visit(this);
};
BaseVector.prototype._bindDataAccessors = bindBaseVectorDataAccessors;
// Perf: bind and assign the operator Visitor methods to each of the Vector subclasses for each Type
Object.keys(Type)
    .filter((typeId) => typeId !== Type.NONE && typeId !== Type[Type.NONE])
    .map((T) => Type[T]).filter((T) => typeof T === 'number')
    .forEach((typeId) => {
    let typeIds;
    switch (typeId) {
        case Type.Int:
            typeIds = [Type.Int8, Type.Int16, Type.Int32, Type.Int64, Type.Uint8, Type.Uint16, Type.Uint32, Type.Uint64];
            break;
        case Type.Float:
            typeIds = [Type.Float16, Type.Float32, Type.Float64];
            break;
        case Type.Date:
            typeIds = [Type.DateDay, Type.DateMillisecond];
            break;
        case Type.Time:
            typeIds = [Type.TimeSecond, Type.TimeMillisecond, Type.TimeMicrosecond, Type.TimeNanosecond];
            break;
        case Type.Timestamp:
            typeIds = [Type.TimestampSecond, Type.TimestampMillisecond, Type.TimestampMicrosecond, Type.TimestampNanosecond];
            break;
        case Type.Interval:
            typeIds = [Type.IntervalDayTime, Type.IntervalYearMonth];
            break;
        case Type.Union:
            typeIds = [Type.DenseUnion, Type.SparseUnion];
            break;
        default:
            typeIds = [typeId];
            break;
    }
    typeIds.forEach((typeId) => {
        const VectorCtor = getVectorConstructor.visit(typeId);
        VectorCtor.prototype['get'] = partial1(getVisitor.getVisitFn(typeId));
        VectorCtor.prototype['set'] = partial2(setVisitor.getVisitFn(typeId));
        VectorCtor.prototype['indexOf'] = partial2(indexOfVisitor.getVisitFn(typeId));
        VectorCtor.prototype['toArray'] = partial0(toArrayVisitor.getVisitFn(typeId));
        VectorCtor.prototype['getByteWidth'] = partialType0(byteWidthVisitor.getVisitFn(typeId));
        VectorCtor.prototype[Symbol.iterator] = partial0(iteratorVisitor.getVisitFn(typeId));
    });
});
/** @ignore */
function partial0(visit) {
    return function () { return visit(this); };
}
/** @ignore */
function partialType0(visit) {
    return function () { return visit(this.type); };
}
/** @ignore */
function partial1(visit) {
    return function (a) { return visit(this, a); };
}
/** @ignore */
function partial2(visit) {
    return function (a, b) { return visit(this, a, b); };
}
/** @ignore */
function wrapNullable1(fn) {
    return function (i) { return this.isValid(i) ? fn.call(this, i) : null; };
}
/** @ignore */
function wrapNullableSet(fn) {
    return function (i, a) {
        if (setBool(this.nullBitmap, this.offset + i, a != null)) {
            fn.call(this, i, a);
        }
    };
}
/** @ignore */
function bindBaseVectorDataAccessors() {
    const nullBitmap = this.nullBitmap;
    if (nullBitmap && nullBitmap.byteLength > 0) {
        this.get = wrapNullable1(this.get);
        this.set = wrapNullableSet(this.set);
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFDLEdBQUcsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxHQUFHLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUN4QztBQUNMLENBQUMiLCJmaWxlIjoidmVjdG9yL2luZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmV4cG9ydCB7IFJvdyB9IGZyb20gJy4vcm93JztcbmV4cG9ydCB7IFZlY3RvciB9IGZyb20gJy4uL3ZlY3Rvcic7XG5leHBvcnQgeyBCYXNlVmVjdG9yIH0gZnJvbSAnLi9iYXNlJztcbmV4cG9ydCB7IEJpbmFyeVZlY3RvciB9IGZyb20gJy4vYmluYXJ5JztcbmV4cG9ydCB7IEJvb2xWZWN0b3IgfSBmcm9tICcuL2Jvb2wnO1xuZXhwb3J0IHsgQ2h1bmtlZCB9IGZyb20gJy4vY2h1bmtlZCc7XG5leHBvcnQgeyBEYXRlVmVjdG9yLCBEYXRlRGF5VmVjdG9yLCBEYXRlTWlsbGlzZWNvbmRWZWN0b3IgfSBmcm9tICcuL2RhdGUnO1xuZXhwb3J0IHsgRGVjaW1hbFZlY3RvciB9IGZyb20gJy4vZGVjaW1hbCc7XG5leHBvcnQgeyBEaWN0aW9uYXJ5VmVjdG9yIH0gZnJvbSAnLi9kaWN0aW9uYXJ5JztcbmV4cG9ydCB7IEZpeGVkU2l6ZUJpbmFyeVZlY3RvciB9IGZyb20gJy4vZml4ZWRzaXplYmluYXJ5JztcbmV4cG9ydCB7IEZpeGVkU2l6ZUxpc3RWZWN0b3IgfSBmcm9tICcuL2ZpeGVkc2l6ZWxpc3QnO1xuZXhwb3J0IHsgRmxvYXRWZWN0b3IsIEZsb2F0MTZWZWN0b3IsIEZsb2F0MzJWZWN0b3IsIEZsb2F0NjRWZWN0b3IgfSBmcm9tICcuL2Zsb2F0JztcbmV4cG9ydCB7IEludGVydmFsVmVjdG9yLCBJbnRlcnZhbERheVRpbWVWZWN0b3IsIEludGVydmFsWWVhck1vbnRoVmVjdG9yIH0gZnJvbSAnLi9pbnRlcnZhbCc7XG5leHBvcnQgeyBJbnRWZWN0b3IsIEludDhWZWN0b3IsIEludDE2VmVjdG9yLCBJbnQzMlZlY3RvciwgSW50NjRWZWN0b3IsIFVpbnQ4VmVjdG9yLCBVaW50MTZWZWN0b3IsIFVpbnQzMlZlY3RvciwgVWludDY0VmVjdG9yIH0gZnJvbSAnLi9pbnQnO1xuZXhwb3J0IHsgTGlzdFZlY3RvciB9IGZyb20gJy4vbGlzdCc7XG5leHBvcnQgeyBNYXBWZWN0b3IgfSBmcm9tICcuL21hcCc7XG5leHBvcnQgeyBOdWxsVmVjdG9yIH0gZnJvbSAnLi9udWxsJztcbmV4cG9ydCB7IFN0cnVjdFZlY3RvciB9IGZyb20gJy4vc3RydWN0JztcbmV4cG9ydCB7IFRpbWVzdGFtcFZlY3RvciwgVGltZXN0YW1wU2Vjb25kVmVjdG9yLCBUaW1lc3RhbXBNaWxsaXNlY29uZFZlY3RvciwgVGltZXN0YW1wTWljcm9zZWNvbmRWZWN0b3IsIFRpbWVzdGFtcE5hbm9zZWNvbmRWZWN0b3IgfSBmcm9tICcuL3RpbWVzdGFtcCc7XG5leHBvcnQgeyBUaW1lVmVjdG9yLCBUaW1lU2Vjb25kVmVjdG9yLCBUaW1lTWlsbGlzZWNvbmRWZWN0b3IsIFRpbWVNaWNyb3NlY29uZFZlY3RvciwgVGltZU5hbm9zZWNvbmRWZWN0b3IgfSBmcm9tICcuL3RpbWUnO1xuZXhwb3J0IHsgVW5pb25WZWN0b3IsIERlbnNlVW5pb25WZWN0b3IsIFNwYXJzZVVuaW9uVmVjdG9yIH0gZnJvbSAnLi91bmlvbic7XG5leHBvcnQgeyBVdGY4VmVjdG9yIH0gZnJvbSAnLi91dGY4JztcblxuaW1wb3J0IHsgRGF0YSB9IGZyb20gJy4uL2RhdGEnO1xuaW1wb3J0IHsgVHlwZSB9IGZyb20gJy4uL2VudW0nO1xuaW1wb3J0IHsgVmVjdG9yIH0gZnJvbSAnLi4vdmVjdG9yJztcbmltcG9ydCB7IERhdGFUeXBlIH0gZnJvbSAnLi4vdHlwZSc7XG5pbXBvcnQgeyBCYXNlVmVjdG9yIH0gZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7IHNldEJvb2wgfSBmcm9tICcuLi91dGlsL2JpdCc7XG5pbXBvcnQgeyBWZWN0b3IgYXMgViwgVmVjdG9yQ3RvckFyZ3MgfSBmcm9tICcuLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGluc3RhbmNlIGFzIGdldFZpc2l0b3IgfSBmcm9tICcuLi92aXNpdG9yL2dldCc7XG5pbXBvcnQgeyBpbnN0YW5jZSBhcyBzZXRWaXNpdG9yIH0gZnJvbSAnLi4vdmlzaXRvci9zZXQnO1xuaW1wb3J0IHsgaW5zdGFuY2UgYXMgaW5kZXhPZlZpc2l0b3IgfSBmcm9tICcuLi92aXNpdG9yL2luZGV4b2YnO1xuaW1wb3J0IHsgaW5zdGFuY2UgYXMgdG9BcnJheVZpc2l0b3IgfSBmcm9tICcuLi92aXNpdG9yL3RvYXJyYXknO1xuaW1wb3J0IHsgaW5zdGFuY2UgYXMgaXRlcmF0b3JWaXNpdG9yIH0gZnJvbSAnLi4vdmlzaXRvci9pdGVyYXRvcic7XG5pbXBvcnQgeyBpbnN0YW5jZSBhcyBieXRlV2lkdGhWaXNpdG9yIH0gZnJvbSAnLi4vdmlzaXRvci9ieXRld2lkdGgnO1xuaW1wb3J0IHsgaW5zdGFuY2UgYXMgZ2V0VmVjdG9yQ29uc3RydWN0b3IgfSBmcm9tICcuLi92aXNpdG9yL3ZlY3RvcmN0b3InO1xuXG5kZWNsYXJlIG1vZHVsZSAnLi4vdmVjdG9yJyB7XG4gICAgbmFtZXNwYWNlIFZlY3RvciB7XG4gICAgICAgIGV4cG9ydCB7IG5ld1ZlY3RvciBhcyBuZXcgfTtcbiAgICB9XG59XG5cbmRlY2xhcmUgbW9kdWxlICcuL2Jhc2UnIHtcbiAgICBpbnRlcmZhY2UgQmFzZVZlY3RvcjxUIGV4dGVuZHMgRGF0YVR5cGU+IHtcbiAgICAgICAgZ2V0KGluZGV4OiBudW1iZXIpOiBUWydUVmFsdWUnXSB8IG51bGw7XG4gICAgICAgIHNldChpbmRleDogbnVtYmVyLCB2YWx1ZTogVFsnVFZhbHVlJ10gfCBudWxsKTogdm9pZDtcbiAgICAgICAgaW5kZXhPZih2YWx1ZTogVFsnVFZhbHVlJ10gfCBudWxsLCBmcm9tSW5kZXg/OiBudW1iZXIpOiBudW1iZXI7XG4gICAgICAgIHRvQXJyYXkoKTogVFsnVEFycmF5J107XG4gICAgICAgIGdldEJ5dGVXaWR0aCgpOiBudW1iZXI7XG4gICAgICAgIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VFsnVFZhbHVlJ10gfCBudWxsPjtcbiAgICB9XG59XG5cbi8qKiBAbm9jb2xsYXBzZSAqL1xuVmVjdG9yLm5ldyA9IG5ld1ZlY3RvcjtcblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIG5ld1ZlY3RvcjxUIGV4dGVuZHMgRGF0YVR5cGU+KGRhdGE6IERhdGE8VD4sIC4uLmFyZ3M6IFZlY3RvckN0b3JBcmdzPFY8VD4+KTogVjxUPiB7XG4gICAgcmV0dXJuIG5ldyAoZ2V0VmVjdG9yQ29uc3RydWN0b3IuZ2V0VmlzaXRGbihkYXRhLnR5cGUpKCkpKGRhdGEsIC4uLmFyZ3MpIGFzIFY8VD47XG59XG5cbi8vXG4vLyBXZSBwcm92aWRlIHRoZSBmb2xsb3dpbmcgbWV0aG9kIGltcGxlbWVudGF0aW9ucyBmb3IgY29kZSBuYXZpZ2FiaWxpdHkgcHVycG9zZXMgb25seS5cbi8vIFRoZXkncmUgb3ZlcnJpZGRlbiBhdCBydW50aW1lIGJlbG93IHdpdGggdGhlIHNwZWNpZmljIFZpc2l0b3IgaW1wbGVtZW50YXRpb24gZm9yIGVhY2ggdHlwZSxcbi8vIHNob3J0LWNpcmN1aXRpbmcgdGhlIHVzdWFsIFZpc2l0b3IgdHJhdmVyc2FsIGFuZCByZWR1Y2luZyBpbnRlcm1lZGlhdGUgbG9va3VwcyBhbmQgY2FsbHMuXG4vLyBUaGlzIGNvbW1lbnQgaXMgaGVyZSB0byByZW1pbmQgeW91IHRvIG5vdCBzZXQgYnJlYWtwb2ludHMgaW4gdGhlc2UgZnVuY3Rpb24gYm9kaWVzLCBvciB0byBpbmZvcm1cbi8vIHlvdSB3aHkgdGhlIGJyZWFrcG9pbnRzIHlvdSBoYXZlIGFscmVhZHkgc2V0IGFyZSBub3QgYmVpbmcgdHJpZ2dlcmVkLiBIYXZlIGEgZ3JlYXQgZGF5IVxuLy9cblxuQmFzZVZlY3Rvci5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gYmFzZVZlY3RvckdldDxUIGV4dGVuZHMgRGF0YVR5cGU+KHRoaXM6IEJhc2VWZWN0b3I8VD4sIGluZGV4OiBudW1iZXIpOiBUWydUVmFsdWUnXSB8IG51bGwge1xuICAgIHJldHVybiBnZXRWaXNpdG9yLnZpc2l0KHRoaXMsIGluZGV4KTtcbn07XG5cbkJhc2VWZWN0b3IucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIGJhc2VWZWN0b3JTZXQ8VCBleHRlbmRzIERhdGFUeXBlPih0aGlzOiBCYXNlVmVjdG9yPFQ+LCBpbmRleDogbnVtYmVyLCB2YWx1ZTogVFsnVFZhbHVlJ10gfCBudWxsKTogdm9pZCB7XG4gICAgcmV0dXJuIHNldFZpc2l0b3IudmlzaXQodGhpcywgaW5kZXgsIHZhbHVlKTtcbn07XG5cbkJhc2VWZWN0b3IucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbiBiYXNlVmVjdG9ySW5kZXhPZjxUIGV4dGVuZHMgRGF0YVR5cGU+KHRoaXM6IEJhc2VWZWN0b3I8VD4sIHZhbHVlOiBUWydUVmFsdWUnXSB8IG51bGwsIGZyb21JbmRleD86IG51bWJlcik6IG51bWJlciB7XG4gICAgcmV0dXJuIGluZGV4T2ZWaXNpdG9yLnZpc2l0KHRoaXMsIHZhbHVlLCBmcm9tSW5kZXgpO1xufTtcblxuQmFzZVZlY3Rvci5wcm90b3R5cGUudG9BcnJheSA9IGZ1bmN0aW9uIGJhc2VWZWN0b3JUb0FycmF5PFQgZXh0ZW5kcyBEYXRhVHlwZT4odGhpczogQmFzZVZlY3RvcjxUPik6IFRbJ1RBcnJheSddIHtcbiAgICByZXR1cm4gdG9BcnJheVZpc2l0b3IudmlzaXQodGhpcyk7XG59O1xuXG5CYXNlVmVjdG9yLnByb3RvdHlwZS5nZXRCeXRlV2lkdGggPSBmdW5jdGlvbiBiYXNlVmVjdG9yR2V0Qnl0ZVdpZHRoPFQgZXh0ZW5kcyBEYXRhVHlwZT4odGhpczogQmFzZVZlY3RvcjxUPik6IG51bWJlciB7XG4gICAgcmV0dXJuIGJ5dGVXaWR0aFZpc2l0b3IudmlzaXQodGhpcy50eXBlKTtcbn07XG5cbkJhc2VWZWN0b3IucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbiBiYXNlVmVjdG9yU3ltYm9sSXRlcmF0b3I8VCBleHRlbmRzIERhdGFUeXBlPih0aGlzOiBCYXNlVmVjdG9yPFQ+KTogSXRlcmFibGVJdGVyYXRvcjxUWydUVmFsdWUnXSB8IG51bGw+IHtcbiAgICByZXR1cm4gaXRlcmF0b3JWaXNpdG9yLnZpc2l0KHRoaXMpO1xufTtcblxuKEJhc2VWZWN0b3IucHJvdG90eXBlIGFzIGFueSkuX2JpbmREYXRhQWNjZXNzb3JzID0gYmluZEJhc2VWZWN0b3JEYXRhQWNjZXNzb3JzO1xuXG4vLyBQZXJmOiBiaW5kIGFuZCBhc3NpZ24gdGhlIG9wZXJhdG9yIFZpc2l0b3IgbWV0aG9kcyB0byBlYWNoIG9mIHRoZSBWZWN0b3Igc3ViY2xhc3NlcyBmb3IgZWFjaCBUeXBlXG4oT2JqZWN0LmtleXMoVHlwZSkgYXMgYW55W10pXG4gICAgLmZpbHRlcigodHlwZUlkKSA9PiB0eXBlSWQgIT09IFR5cGUuTk9ORSAmJiB0eXBlSWQgIT09IFR5cGVbVHlwZS5OT05FXSlcbiAgICAubWFwKChUOiBhbnkpID0+IFR5cGVbVF0gYXMgYW55KS5maWx0ZXIoKFQ6IGFueSk6IFQgaXMgVHlwZSA9PiB0eXBlb2YgVCA9PT0gJ251bWJlcicpXG4gICAgLmZvckVhY2goKHR5cGVJZCkgPT4ge1xuICAgICAgICBsZXQgdHlwZUlkczogVHlwZVtdO1xuICAgICAgICBzd2l0Y2ggKHR5cGVJZCkge1xuICAgICAgICAgICAgY2FzZSBUeXBlLkludDogICAgICAgdHlwZUlkcyA9IFtUeXBlLkludDgsIFR5cGUuSW50MTYsIFR5cGUuSW50MzIsIFR5cGUuSW50NjQsIFR5cGUuVWludDgsIFR5cGUuVWludDE2LCBUeXBlLlVpbnQzMiwgVHlwZS5VaW50NjRdOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgVHlwZS5GbG9hdDogICAgIHR5cGVJZHMgPSBbVHlwZS5GbG9hdDE2LCBUeXBlLkZsb2F0MzIsIFR5cGUuRmxvYXQ2NF07IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBUeXBlLkRhdGU6ICAgICAgdHlwZUlkcyA9IFtUeXBlLkRhdGVEYXksIFR5cGUuRGF0ZU1pbGxpc2Vjb25kXTsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFR5cGUuVGltZTogICAgICB0eXBlSWRzID0gW1R5cGUuVGltZVNlY29uZCwgVHlwZS5UaW1lTWlsbGlzZWNvbmQsIFR5cGUuVGltZU1pY3Jvc2Vjb25kLCBUeXBlLlRpbWVOYW5vc2Vjb25kXTsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFR5cGUuVGltZXN0YW1wOiB0eXBlSWRzID0gW1R5cGUuVGltZXN0YW1wU2Vjb25kLCBUeXBlLlRpbWVzdGFtcE1pbGxpc2Vjb25kLCBUeXBlLlRpbWVzdGFtcE1pY3Jvc2Vjb25kLCBUeXBlLlRpbWVzdGFtcE5hbm9zZWNvbmRdOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgVHlwZS5JbnRlcnZhbDogIHR5cGVJZHMgPSBbVHlwZS5JbnRlcnZhbERheVRpbWUsIFR5cGUuSW50ZXJ2YWxZZWFyTW9udGhdOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgVHlwZS5VbmlvbjogICAgIHR5cGVJZHMgPSBbVHlwZS5EZW5zZVVuaW9uLCBUeXBlLlNwYXJzZVVuaW9uXTsgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OiAgICAgICAgICAgICAgICB0eXBlSWRzID0gW3R5cGVJZF07IGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHR5cGVJZHMuZm9yRWFjaCgodHlwZUlkKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBWZWN0b3JDdG9yID0gZ2V0VmVjdG9yQ29uc3RydWN0b3IudmlzaXQodHlwZUlkKTtcbiAgICAgICAgICAgIFZlY3RvckN0b3IucHJvdG90eXBlWydnZXQnXSA9IHBhcnRpYWwxKGdldFZpc2l0b3IuZ2V0VmlzaXRGbih0eXBlSWQpKTtcbiAgICAgICAgICAgIFZlY3RvckN0b3IucHJvdG90eXBlWydzZXQnXSA9IHBhcnRpYWwyKHNldFZpc2l0b3IuZ2V0VmlzaXRGbih0eXBlSWQpKTtcbiAgICAgICAgICAgIFZlY3RvckN0b3IucHJvdG90eXBlWydpbmRleE9mJ10gPSBwYXJ0aWFsMihpbmRleE9mVmlzaXRvci5nZXRWaXNpdEZuKHR5cGVJZCkpO1xuICAgICAgICAgICAgVmVjdG9yQ3Rvci5wcm90b3R5cGVbJ3RvQXJyYXknXSA9IHBhcnRpYWwwKHRvQXJyYXlWaXNpdG9yLmdldFZpc2l0Rm4odHlwZUlkKSk7XG4gICAgICAgICAgICBWZWN0b3JDdG9yLnByb3RvdHlwZVsnZ2V0Qnl0ZVdpZHRoJ10gPSBwYXJ0aWFsVHlwZTAoYnl0ZVdpZHRoVmlzaXRvci5nZXRWaXNpdEZuKHR5cGVJZCkpO1xuICAgICAgICAgICAgVmVjdG9yQ3Rvci5wcm90b3R5cGVbU3ltYm9sLml0ZXJhdG9yXSA9IHBhcnRpYWwwKGl0ZXJhdG9yVmlzaXRvci5nZXRWaXNpdEZuKHR5cGVJZCkpO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIHBhcnRpYWwwPFQ+KHZpc2l0OiAobm9kZTogVCkgPT4gYW55KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHRoaXM6IFQpIHsgcmV0dXJuIHZpc2l0KHRoaXMpOyB9O1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZnVuY3Rpb24gcGFydGlhbFR5cGUwPFQgZXh0ZW5kcyBWZWN0b3I+KHZpc2l0OiAobm9kZTogVFsndHlwZSddKSA9PiBhbnkpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24odGhpczogVCkgeyByZXR1cm4gdmlzaXQodGhpcy50eXBlKTsgfTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIHBhcnRpYWwxPFQ+KHZpc2l0OiAobm9kZTogVCwgYTogYW55KSA9PiBhbnkpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24odGhpczogVCwgYTogYW55KSB7IHJldHVybiB2aXNpdCh0aGlzLCBhKTsgfTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIHBhcnRpYWwyPFQ+KHZpc2l0OiAobm9kZTogVCwgYTogYW55LCBiOiBhbnkpID0+IGFueSkge1xuICAgIHJldHVybiBmdW5jdGlvbih0aGlzOiBULCBhOiBhbnksIGI6IGFueSkgeyByZXR1cm4gdmlzaXQodGhpcywgYSwgYik7IH07XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiB3cmFwTnVsbGFibGUxPFQgZXh0ZW5kcyBEYXRhVHlwZSwgViBleHRlbmRzIFZlY3RvcjxUPiwgRiBleHRlbmRzIChpOiBudW1iZXIpID0+IGFueT4oZm46IEYpOiAoLi4uYXJnczogUGFyYW1ldGVyczxGPikgPT4gUmV0dXJuVHlwZTxGPiB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHRoaXM6IFYsIGk6IG51bWJlcikgeyByZXR1cm4gdGhpcy5pc1ZhbGlkKGkpID8gZm4uY2FsbCh0aGlzLCBpKSA6IG51bGw7IH07XG59XG5cbi8qKiBAaWdub3JlICovXG5mdW5jdGlvbiB3cmFwTnVsbGFibGVTZXQ8VCBleHRlbmRzIERhdGFUeXBlLCBWIGV4dGVuZHMgQmFzZVZlY3RvcjxUPiwgRiBleHRlbmRzIChpOiBudW1iZXIsIGE6IGFueSkgPT4gdm9pZD4oZm46IEYpOiAoLi4uYXJnczogUGFyYW1ldGVyczxGPikgPT4gdm9pZCB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHRoaXM6IFYsIGk6IG51bWJlciwgYTogYW55KSB7XG4gICAgICAgIGlmIChzZXRCb29sKHRoaXMubnVsbEJpdG1hcCwgdGhpcy5vZmZzZXQgKyBpLCBhICE9IG51bGwpKSB7XG4gICAgICAgICAgICBmbi5jYWxsKHRoaXMsIGksIGEpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGJpbmRCYXNlVmVjdG9yRGF0YUFjY2Vzc29yczxUIGV4dGVuZHMgRGF0YVR5cGU+KHRoaXM6IEJhc2VWZWN0b3I8VD4pIHtcbiAgICBjb25zdCBudWxsQml0bWFwID0gdGhpcy5udWxsQml0bWFwO1xuICAgIGlmIChudWxsQml0bWFwICYmIG51bGxCaXRtYXAuYnl0ZUxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy5nZXQgPSB3cmFwTnVsbGFibGUxKHRoaXMuZ2V0KTtcbiAgICAgICAgdGhpcy5zZXQgPSB3cmFwTnVsbGFibGVTZXQodGhpcy5zZXQpO1xuICAgIH1cbn1cbiJdfQ==

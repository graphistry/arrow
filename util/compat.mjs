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
import { ReadableInterop } from '../io/interfaces';
/** @ignore */ const isNumber = (x) => typeof x === 'number';
/** @ignore */ const isBoolean = (x) => typeof x === 'boolean';
/** @ignore */ const isFunction = (x) => typeof x === 'function';
/** @ignore */
export const isObject = (x) => x != null && Object(x) === x;
/** @ignore */
export const isPromise = (x) => {
    return isObject(x) && isFunction(x.then);
};
/** @ignore */
export const isObservable = (x) => {
    return isObject(x) && isFunction(x.subscribe);
};
/** @ignore */
export const isIterable = (x) => {
    return isObject(x) && isFunction(x[Symbol.iterator]);
};
/** @ignore */
export const isAsyncIterable = (x) => {
    return isObject(x) && isFunction(x[Symbol.asyncIterator]);
};
/** @ignore */
export const isArrowJSON = (x) => {
    return isObject(x) && isObject(x['schema']);
};
/** @ignore */
export const isArrayLike = (x) => {
    return isObject(x) && isNumber(x['length']);
};
/** @ignore */
export const isIteratorResult = (x) => {
    return isObject(x) && ('done' in x) && ('value' in x);
};
/** @ignore */
export const isUnderlyingSink = (x) => {
    return isObject(x) &&
        isFunction(x['abort']) &&
        isFunction(x['close']) &&
        isFunction(x['start']) &&
        isFunction(x['write']);
};
/** @ignore */
export const isFileHandle = (x) => {
    return isObject(x) && isFunction(x['stat']) && isNumber(x['fd']);
};
/** @ignore */
export const isFSReadStream = (x) => {
    return isReadableNodeStream(x) && isNumber(x['bytesRead']);
};
/** @ignore */
export const isFetchResponse = (x) => {
    return isObject(x) && isReadableDOMStream(x['body']);
};
/** @ignore */
export const isWritableDOMStream = (x) => {
    return isObject(x) &&
        isFunction(x['abort']) &&
        isFunction(x['getWriter']) &&
        !(x instanceof ReadableInterop);
};
/** @ignore */
export const isReadableDOMStream = (x) => {
    return isObject(x) &&
        isFunction(x['tee']) &&
        isFunction(x['cancel']) &&
        isFunction(x['pipeTo']) &&
        isFunction(x['getReader']) &&
        !(x instanceof ReadableInterop);
};
/** @ignore */
export const isWritableNodeStream = (x) => {
    return isObject(x) &&
        isFunction(x['end']) &&
        isFunction(x['write']) &&
        isBoolean(x['writable']) &&
        !(x instanceof ReadableInterop);
};
/** @ignore */
export const isReadableNodeStream = (x) => {
    return isObject(x) &&
        isFunction(x['read']) &&
        isFunction(x['pipe']) &&
        isBoolean(x['readable']) &&
        !(x instanceof ReadableInterop);
};

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LENBQUMsQ0FBQyxDQUFDLFlBQVksZUFBZSxDQUFDLENBQUM7QUFDeEMsQ0FBQyxDQUFDIiwiZmlsZSI6InV0aWwvY29tcGF0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IFJlYWRhYmxlSW50ZXJvcCwgQXJyb3dKU09OTGlrZSB9IGZyb20gJy4uL2lvL2ludGVyZmFjZXMnO1xuXG4vKiogQGlnbm9yZSAqL1xudHlwZSBGU1JlYWRTdHJlYW0gPSBpbXBvcnQoJ2ZzJykuUmVhZFN0cmVhbTtcbi8qKiBAaWdub3JlICovXG50eXBlIEZpbGVIYW5kbGUgPSBpbXBvcnQoJ2ZzJykucHJvbWlzZXMuRmlsZUhhbmRsZTtcblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3Vic2NyaXB0aW9uIHtcbiAgICB1bnN1YnNjcmliZTogKCkgPT4gdm9pZDtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBpbnRlcmZhY2UgT2JzZXJ2ZXI8VD4ge1xuICAgIGNsb3NlZD86IGJvb2xlYW47XG4gICAgbmV4dDogKHZhbHVlOiBUKSA9PiB2b2lkO1xuICAgIGVycm9yOiAoZXJyOiBhbnkpID0+IHZvaWQ7XG4gICAgY29tcGxldGU6ICgpID0+IHZvaWQ7XG59XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgaW50ZXJmYWNlIE9ic2VydmFibGU8VD4ge1xuICAgIHN1YnNjcmliZTogKG9ic2VydmVyOiBPYnNlcnZlcjxUPikgPT4gU3Vic2NyaXB0aW9uO1xufVxuXG4vKiogQGlnbm9yZSAqLyBjb25zdCBpc051bWJlciA9ICh4OiBhbnkpID0+IHR5cGVvZiB4ID09PSAnbnVtYmVyJztcbi8qKiBAaWdub3JlICovIGNvbnN0IGlzQm9vbGVhbiA9ICh4OiBhbnkpID0+IHR5cGVvZiB4ID09PSAnYm9vbGVhbic7XG4vKiogQGlnbm9yZSAqLyBjb25zdCBpc0Z1bmN0aW9uID0gKHg6IGFueSkgPT4gdHlwZW9mIHggPT09ICdmdW5jdGlvbic7XG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNvbnN0IGlzT2JqZWN0ID0gKHg6IGFueSk6IHggaXMgT2JqZWN0ID0+IHggIT0gbnVsbCAmJiBPYmplY3QoeCkgPT09IHg7XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY29uc3QgaXNQcm9taXNlID0gPFQgPSBhbnk+KHg6IGFueSk6IHggaXMgUHJvbWlzZUxpa2U8VD4gPT4ge1xuICAgIHJldHVybiBpc09iamVjdCh4KSAmJiBpc0Z1bmN0aW9uKHgudGhlbik7XG59O1xuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNvbnN0IGlzT2JzZXJ2YWJsZSA9IDxUID0gYW55Pih4OiBhbnkpOiB4IGlzIE9ic2VydmFibGU8VD4gPT4ge1xuICAgIHJldHVybiBpc09iamVjdCh4KSAmJiBpc0Z1bmN0aW9uKHguc3Vic2NyaWJlKTtcbn07XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY29uc3QgaXNJdGVyYWJsZSA9IDxUID0gYW55Pih4OiBhbnkpOiB4IGlzIEl0ZXJhYmxlPFQ+ID0+IHtcbiAgICByZXR1cm4gaXNPYmplY3QoeCkgJiYgaXNGdW5jdGlvbih4W1N5bWJvbC5pdGVyYXRvcl0pO1xufTtcblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjb25zdCBpc0FzeW5jSXRlcmFibGUgPSA8VCA9IGFueT4oeDogYW55KTogeCBpcyBBc3luY0l0ZXJhYmxlPFQ+ID0+IHtcbiAgICByZXR1cm4gaXNPYmplY3QoeCkgJiYgaXNGdW5jdGlvbih4W1N5bWJvbC5hc3luY0l0ZXJhdG9yXSk7XG59O1xuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNvbnN0IGlzQXJyb3dKU09OID0gKHg6IGFueSk6IHggaXMgQXJyb3dKU09OTGlrZSAgPT4ge1xuICAgIHJldHVybiBpc09iamVjdCh4KSAmJiBpc09iamVjdCh4WydzY2hlbWEnXSk7XG59O1xuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNvbnN0IGlzQXJyYXlMaWtlID0gPFQgPSBhbnk+KHg6IGFueSk6IHggaXMgQXJyYXlMaWtlPFQ+ID0+IHtcbiAgICByZXR1cm4gaXNPYmplY3QoeCkgJiYgaXNOdW1iZXIoeFsnbGVuZ3RoJ10pO1xufTtcblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjb25zdCBpc0l0ZXJhdG9yUmVzdWx0ID0gPFQgPSBhbnk+KHg6IGFueSk6IHggaXMgSXRlcmF0b3JSZXN1bHQ8VD4gPT4ge1xuICAgIHJldHVybiBpc09iamVjdCh4KSAmJiAoJ2RvbmUnIGluIHgpICYmICgndmFsdWUnIGluIHgpO1xufTtcblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjb25zdCBpc1VuZGVybHlpbmdTaW5rID0gPFQgPSBhbnk+KHg6IGFueSk6IHggaXMgVW5kZXJseWluZ1Npbms8VD4gPT4ge1xuICAgIHJldHVybiBpc09iamVjdCh4KSAmJlxuICAgICAgICBpc0Z1bmN0aW9uKHhbJ2Fib3J0J10pICYmXG4gICAgICAgIGlzRnVuY3Rpb24oeFsnY2xvc2UnXSkgJiZcbiAgICAgICAgaXNGdW5jdGlvbih4WydzdGFydCddKSAmJlxuICAgICAgICBpc0Z1bmN0aW9uKHhbJ3dyaXRlJ10pO1xufTtcblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjb25zdCBpc0ZpbGVIYW5kbGUgPSAoeDogYW55KTogeCBpcyBGaWxlSGFuZGxlID0+IHtcbiAgICByZXR1cm4gaXNPYmplY3QoeCkgJiYgaXNGdW5jdGlvbih4WydzdGF0J10pICYmIGlzTnVtYmVyKHhbJ2ZkJ10pO1xufTtcblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjb25zdCBpc0ZTUmVhZFN0cmVhbSA9ICh4OiBhbnkpOiB4IGlzIEZTUmVhZFN0cmVhbSA9PiB7XG4gICAgcmV0dXJuIGlzUmVhZGFibGVOb2RlU3RyZWFtKHgpICYmIGlzTnVtYmVyKCg8YW55PiB4KVsnYnl0ZXNSZWFkJ10pO1xufTtcblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjb25zdCBpc0ZldGNoUmVzcG9uc2UgPSAoeDogYW55KTogeCBpcyBSZXNwb25zZSA9PiB7XG4gICAgcmV0dXJuIGlzT2JqZWN0KHgpICYmIGlzUmVhZGFibGVET01TdHJlYW0oeFsnYm9keSddKTtcbn07XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY29uc3QgaXNXcml0YWJsZURPTVN0cmVhbSA9IDxUID0gYW55Pih4OiBhbnkpOiB4IGlzIFdyaXRhYmxlU3RyZWFtPFQ+ID0+IHtcbiAgICByZXR1cm4gaXNPYmplY3QoeCkgJiZcbiAgICAgICAgaXNGdW5jdGlvbih4WydhYm9ydCddKSAmJlxuICAgICAgICBpc0Z1bmN0aW9uKHhbJ2dldFdyaXRlciddKSAmJlxuICAgICAgICAhKHggaW5zdGFuY2VvZiBSZWFkYWJsZUludGVyb3ApO1xufTtcblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjb25zdCBpc1JlYWRhYmxlRE9NU3RyZWFtID0gPFQgPSBhbnk+KHg6IGFueSk6IHggaXMgUmVhZGFibGVTdHJlYW08VD4gPT4ge1xuICAgIHJldHVybiBpc09iamVjdCh4KSAmJlxuICAgICAgICBpc0Z1bmN0aW9uKHhbJ3RlZSddKSAmJlxuICAgICAgICBpc0Z1bmN0aW9uKHhbJ2NhbmNlbCddKSAmJlxuICAgICAgICBpc0Z1bmN0aW9uKHhbJ3BpcGVUbyddKSAmJlxuICAgICAgICBpc0Z1bmN0aW9uKHhbJ2dldFJlYWRlciddKSAmJlxuICAgICAgICAhKHggaW5zdGFuY2VvZiBSZWFkYWJsZUludGVyb3ApO1xufTtcblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjb25zdCBpc1dyaXRhYmxlTm9kZVN0cmVhbSA9ICh4OiBhbnkpOiB4IGlzIE5vZGVKUy5Xcml0YWJsZVN0cmVhbSA9PiB7XG4gICAgcmV0dXJuIGlzT2JqZWN0KHgpICYmXG4gICAgICAgIGlzRnVuY3Rpb24oeFsnZW5kJ10pICYmXG4gICAgICAgIGlzRnVuY3Rpb24oeFsnd3JpdGUnXSkgJiZcbiAgICAgICAgaXNCb29sZWFuKHhbJ3dyaXRhYmxlJ10pICYmXG4gICAgICAgICEoeCBpbnN0YW5jZW9mIFJlYWRhYmxlSW50ZXJvcCk7XG59O1xuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNvbnN0IGlzUmVhZGFibGVOb2RlU3RyZWFtID0gKHg6IGFueSk6IHggaXMgTm9kZUpTLlJlYWRhYmxlU3RyZWFtID0+IHtcbiAgICByZXR1cm4gaXNPYmplY3QoeCkgJiZcbiAgICAgICAgaXNGdW5jdGlvbih4WydyZWFkJ10pICYmXG4gICAgICAgIGlzRnVuY3Rpb24oeFsncGlwZSddKSAmJlxuICAgICAgICBpc0Jvb2xlYW4oeFsncmVhZGFibGUnXSkgJiZcbiAgICAgICAgISh4IGluc3RhbmNlb2YgUmVhZGFibGVJbnRlcm9wKTtcbn07XG4iXX0=

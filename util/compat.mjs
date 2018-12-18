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
const isObject = (x) => x != null && Object(x) === x;
const hasFuncs = (x, ...fn) => hasProps(x, ...fn.map((f) => [f, 'function']));
const hasProps = (x, ...ks) => isObject(x) && ks.every(([k, t]) => t ? (x[k] != null && typeof x[k] === t) : (k in x));
/** @ignore */ export const isPromise = (x) => hasFuncs(x, 'then');
/** @ignore */ export const isObservable = (x) => hasFuncs(x, 'subscribe');
/** @ignore */ export const isIterable = (x) => hasFuncs(x, Symbol.iterator);
/** @ignore */ export const isAsyncIterable = (x) => hasFuncs(x, Symbol.asyncIterator);
/** @ignore */ export const isArrowJSON = (x) => hasProps(x, ['schema', 'object']);
/** @ignore */ export const isArrayLike = (x) => hasProps(x, ['length', 'number']);
/** @ignore */ export const isIteratorResult = (x) => hasProps(x, ['done'], ['value']);
/** @ignore */ export const isUnderlyingSink = (x) => hasFuncs(x, 'abort', 'close', 'start', 'write');
/** @ignore */ export const isFileHandle = (x) => hasFuncs(x, 'stat') && hasProps(x, ['fd', 'number']);
/** @ignore */ export const isFSReadStream = (x) => isReadableNodeStream(x) && hasProps(x, ['bytesRead', 'number']);
/** @ignore */ export const isFetchResponse = (x) => hasProps(x, ['body'], ['bodyUsed', 'boolean'], ['ok', 'boolean']);
/** @ignore */ export const isWritableDOMStream = (x) => !(x instanceof ReadableInterop) && hasFuncs(x, 'abort', 'getWriter');
/** @ignore */ export const isWritableNodeStream = (x) => !(x instanceof ReadableInterop) && hasFuncs(x, 'write', 'cork', 'uncork', 'end');
/** @ignore */ export const isReadableDOMStream = (x) => !(x instanceof ReadableInterop) && hasFuncs(x, 'tee', 'cancel', 'pipeTo', 'getReader');
/** @ignore */ export const isReadableNodeStream = (x) => !(x instanceof ReadableInterop) && hasFuncs(x, 'read', 'pipe', 'unpipe', 'pause', 'resume', 'wrap');

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LENBQUMsQ0FBQyxZQUFZLGVBQWUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUM7QUFDM0wsY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFZLENBQUMsQ0FBTSxFQUE4QixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxlQUFlLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMiLCJmaWxlIjoidXRpbC9jb21wYXQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgUmVhZGFibGVJbnRlcm9wLCBBcnJvd0pTT05MaWtlIH0gZnJvbSAnLi4vaW8vaW50ZXJmYWNlcyc7XG5cbnR5cGUgRlNSZWFkU3RyZWFtID0gaW1wb3J0KCdmcycpLlJlYWRTdHJlYW07XG50eXBlIEZpbGVIYW5kbGUgPSBpbXBvcnQoJ2ZzJykucHJvbWlzZXMuRmlsZUhhbmRsZTtcblxuZXhwb3J0IGludGVyZmFjZSBTdWJzY3JpcHRpb24ge1xuICAgIHVuc3Vic2NyaWJlOiAoKSA9PiB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE9ic2VydmVyPFQ+IHtcbiAgICBjbG9zZWQ/OiBib29sZWFuO1xuICAgIG5leHQ6ICh2YWx1ZTogVCkgPT4gdm9pZDtcbiAgICBlcnJvcjogKGVycjogYW55KSA9PiB2b2lkO1xuICAgIGNvbXBsZXRlOiAoKSA9PiB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE9ic2VydmFibGU8VD4ge1xuICAgIHN1YnNjcmliZTogKG9ic2VydmVyOiBPYnNlcnZlcjxUPikgPT4gU3Vic2NyaXB0aW9uO1xufVxuXG5jb25zdCBpc09iamVjdCA9ICh4OiBhbnkpID0+IHggIT0gbnVsbCAmJiBPYmplY3QoeCkgPT09IHg7XG5jb25zdCBoYXNGdW5jcyA9ICh4OiBhbnksIC4uLmZuOiBQcm9wZXJ0eUtleVtdKSA9PiBoYXNQcm9wcyh4LCAuLi5mbi5tYXAoKGYpID0+IFtmLCAnZnVuY3Rpb24nXSBhcyBbUHJvcGVydHlLZXksIHN0cmluZ10pKTtcbmNvbnN0IGhhc1Byb3BzID0gKHg6IGFueSwgLi4ua3M6IFtQcm9wZXJ0eUtleSwgc3RyaW5nP11bXSkgPT4gaXNPYmplY3QoeCkgJiYga3MuZXZlcnkoKFtrLCB0XSkgPT4gdCA/ICh4W2tdICE9IG51bGwgJiYgdHlwZW9mIHhba10gPT09IHQpIDogKGsgaW4geCkpO1xuXG4vKiogQGlnbm9yZSAqLyBleHBvcnQgY29uc3QgaXNQcm9taXNlICAgICAgICAgICAgPSA8VCA9IGFueT4oeDogYW55KTogeCBpcyBQcm9taXNlTGlrZTxUPiAgICAgICAgPT4gaGFzRnVuY3MoeCwgJ3RoZW4nKTtcbi8qKiBAaWdub3JlICovIGV4cG9ydCBjb25zdCBpc09ic2VydmFibGUgICAgICAgICA9IDxUID0gYW55Pih4OiBhbnkpOiB4IGlzIE9ic2VydmFibGU8VD4gICAgICAgICA9PiBoYXNGdW5jcyh4LCAnc3Vic2NyaWJlJyk7XG4vKiogQGlnbm9yZSAqLyBleHBvcnQgY29uc3QgaXNJdGVyYWJsZSAgICAgICAgICAgPSA8VCA9IGFueT4oeDogYW55KTogeCBpcyBJdGVyYWJsZTxUPiAgICAgICAgICAgPT4gaGFzRnVuY3MoeCwgU3ltYm9sLml0ZXJhdG9yKTtcbi8qKiBAaWdub3JlICovIGV4cG9ydCBjb25zdCBpc0FzeW5jSXRlcmFibGUgICAgICA9IDxUID0gYW55Pih4OiBhbnkpOiB4IGlzIEFzeW5jSXRlcmFibGU8VD4gICAgICA9PiBoYXNGdW5jcyh4LCBTeW1ib2wuYXN5bmNJdGVyYXRvcik7XG4vKiogQGlnbm9yZSAqLyBleHBvcnQgY29uc3QgaXNBcnJvd0pTT04gICAgICAgICAgPSAgICAgICAgICAoeDogYW55KTogeCBpcyBBcnJvd0pTT05MaWtlICAgICAgICAgPT4gaGFzUHJvcHMoeCwgWydzY2hlbWEnLCAnb2JqZWN0J10pO1xuLyoqIEBpZ25vcmUgKi8gZXhwb3J0IGNvbnN0IGlzQXJyYXlMaWtlICAgICAgICAgID0gPFQgPSBhbnk+KHg6IGFueSk6IHggaXMgQXJyYXlMaWtlPFQ+ICAgICAgICAgID0+IGhhc1Byb3BzKHgsIFsnbGVuZ3RoJywgJ251bWJlciddKTtcbi8qKiBAaWdub3JlICovIGV4cG9ydCBjb25zdCBpc0l0ZXJhdG9yUmVzdWx0ICAgICA9IDxUID0gYW55Pih4OiBhbnkpOiB4IGlzIEl0ZXJhdG9yUmVzdWx0PFQ+ICAgICA9PiBoYXNQcm9wcyh4LCBbJ2RvbmUnXSwgWyd2YWx1ZSddKTtcbi8qKiBAaWdub3JlICovIGV4cG9ydCBjb25zdCBpc1VuZGVybHlpbmdTaW5rICAgICA9IDxUID0gYW55Pih4OiBhbnkpOiB4IGlzIFVuZGVybHlpbmdTaW5rPFQ+ICAgICA9PiBoYXNGdW5jcyh4LCAnYWJvcnQnLCAnY2xvc2UnLCAnc3RhcnQnLCAnd3JpdGUnKTtcbi8qKiBAaWdub3JlICovIGV4cG9ydCBjb25zdCBpc0ZpbGVIYW5kbGUgICAgICAgICA9ICAgICAgICAgICh4OiBhbnkpOiB4IGlzIEZpbGVIYW5kbGUgICAgICAgICAgICA9PiBoYXNGdW5jcyh4LCAnc3RhdCcpICYmIGhhc1Byb3BzKHgsIFsnZmQnLCAnbnVtYmVyJ10pO1xuLyoqIEBpZ25vcmUgKi8gZXhwb3J0IGNvbnN0IGlzRlNSZWFkU3RyZWFtICAgICAgID0gICAgICAgICAgKHg6IGFueSk6IHggaXMgRlNSZWFkU3RyZWFtICAgICAgICAgID0+IGlzUmVhZGFibGVOb2RlU3RyZWFtKHgpICYmIGhhc1Byb3BzKHgsIFsnYnl0ZXNSZWFkJywgJ251bWJlciddKTtcbi8qKiBAaWdub3JlICovIGV4cG9ydCBjb25zdCBpc0ZldGNoUmVzcG9uc2UgICAgICA9ICAgICAgICAgICh4OiBhbnkpOiB4IGlzIFJlc3BvbnNlICAgICAgICAgICAgICA9PiBoYXNQcm9wcyh4LCBbJ2JvZHknXSwgWydib2R5VXNlZCcsICdib29sZWFuJ10sIFsnb2snLCAnYm9vbGVhbiddKTtcbi8qKiBAaWdub3JlICovIGV4cG9ydCBjb25zdCBpc1dyaXRhYmxlRE9NU3RyZWFtICA9IDxUID0gYW55Pih4OiBhbnkpOiB4IGlzIFdyaXRhYmxlU3RyZWFtPFQ+ICAgICA9PiAhKHggaW5zdGFuY2VvZiBSZWFkYWJsZUludGVyb3ApICYmIGhhc0Z1bmNzKHgsICdhYm9ydCcsICdnZXRXcml0ZXInKTtcbi8qKiBAaWdub3JlICovIGV4cG9ydCBjb25zdCBpc1dyaXRhYmxlTm9kZVN0cmVhbSA9ICAgICAgICAgICh4OiBhbnkpOiB4IGlzIE5vZGVKUy5Xcml0YWJsZVN0cmVhbSA9PiAhKHggaW5zdGFuY2VvZiBSZWFkYWJsZUludGVyb3ApICYmIGhhc0Z1bmNzKHgsICd3cml0ZScsICdjb3JrJywgJ3VuY29yaycsICdlbmQnKTtcbi8qKiBAaWdub3JlICovIGV4cG9ydCBjb25zdCBpc1JlYWRhYmxlRE9NU3RyZWFtICA9IDxUID0gYW55Pih4OiBhbnkpOiB4IGlzIFJlYWRhYmxlU3RyZWFtPFQ+ICAgICA9PiAhKHggaW5zdGFuY2VvZiBSZWFkYWJsZUludGVyb3ApICYmIGhhc0Z1bmNzKHgsICd0ZWUnLCAnY2FuY2VsJywgJ3BpcGVUbycsICdnZXRSZWFkZXInKTtcbi8qKiBAaWdub3JlICovIGV4cG9ydCBjb25zdCBpc1JlYWRhYmxlTm9kZVN0cmVhbSA9ICAgICAgICAgICh4OiBhbnkpOiB4IGlzIE5vZGVKUy5SZWFkYWJsZVN0cmVhbSA9PiAhKHggaW5zdGFuY2VvZiBSZWFkYWJsZUludGVyb3ApICYmIGhhc0Z1bmNzKHgsICdyZWFkJywgJ3BpcGUnLCAndW5waXBlJywgJ3BhdXNlJywgJ3Jlc3VtZScsICd3cmFwJyk7XG4iXX0=

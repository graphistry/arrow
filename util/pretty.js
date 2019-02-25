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
/** @ignore */ const undf = void (0);
/** @ignore */
function valueToString(x) {
    if (x === null) {
        return 'null';
    }
    if (x === undf) {
        return 'undefined';
    }
    switch (typeof x) {
        case 'number': return `${x}`;
        case 'bigint': return `${x}`;
        case 'string': return `"${x}"`;
    }
    // If [Symbol.toPrimitive] is implemented (like in BN)
    // use it instead of JSON.stringify(). This ensures we
    // print BigInts, Decimals, and Binary in their native
    // representation
    if (typeof x[Symbol.toPrimitive] === 'function') {
        return x[Symbol.toPrimitive]('string');
    }
    return ArrayBuffer.isView(x) ? `[${x}]` : JSON.stringify(x);
}
exports.valueToString = valueToString;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInV0aWwvcHJldHR5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSw2REFBNkQ7QUFDN0QsK0RBQStEO0FBQy9ELHdEQUF3RDtBQUN4RCw2REFBNkQ7QUFDN0Qsb0RBQW9EO0FBQ3BELDZEQUE2RDtBQUM3RCw2REFBNkQ7QUFDN0QsRUFBRTtBQUNGLCtDQUErQztBQUMvQyxFQUFFO0FBQ0YsNkRBQTZEO0FBQzdELDhEQUE4RDtBQUM5RCx5REFBeUQ7QUFDekQsNERBQTREO0FBQzVELDBEQUEwRDtBQUMxRCxxQkFBcUI7O0FBRXJCLGNBQWMsQ0FBQyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFFckMsY0FBYztBQUNkLFNBQWdCLGFBQWEsQ0FBQyxDQUFNO0lBQ2hDLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRTtRQUFFLE9BQU8sTUFBTSxDQUFDO0tBQUU7SUFDbEMsSUFBSSxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQUUsT0FBTyxXQUFXLENBQUM7S0FBRTtJQUN2QyxRQUFRLE9BQU8sQ0FBQyxFQUFFO1FBQ2QsS0FBSyxRQUFRLENBQUMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDN0IsS0FBSyxRQUFRLENBQUMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDN0IsS0FBSyxRQUFRLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUM7S0FDbEM7SUFDRCxzREFBc0Q7SUFDdEQsc0RBQXNEO0lBQ3RELHNEQUFzRDtJQUN0RCxpQkFBaUI7SUFDakIsSUFBSSxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssVUFBVSxFQUFFO1FBQzdDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztLQUMxQztJQUNELE9BQU8sV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoRSxDQUFDO0FBaEJELHNDQWdCQyIsImZpbGUiOiJ1dGlsL3ByZXR0eS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG4vKiogQGlnbm9yZSAqLyBjb25zdCB1bmRmID0gdm9pZCAoMCk7XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgZnVuY3Rpb24gdmFsdWVUb1N0cmluZyh4OiBhbnkpIHtcbiAgICBpZiAoeCA9PT0gbnVsbCkgeyByZXR1cm4gJ251bGwnOyB9XG4gICAgaWYgKHggPT09IHVuZGYpIHsgcmV0dXJuICd1bmRlZmluZWQnOyB9XG4gICAgc3dpdGNoICh0eXBlb2YgeCkge1xuICAgICAgICBjYXNlICdudW1iZXInOiByZXR1cm4gYCR7eH1gO1xuICAgICAgICBjYXNlICdiaWdpbnQnOiByZXR1cm4gYCR7eH1gO1xuICAgICAgICBjYXNlICdzdHJpbmcnOiByZXR1cm4gYFwiJHt4fVwiYDtcbiAgICB9XG4gICAgLy8gSWYgW1N5bWJvbC50b1ByaW1pdGl2ZV0gaXMgaW1wbGVtZW50ZWQgKGxpa2UgaW4gQk4pXG4gICAgLy8gdXNlIGl0IGluc3RlYWQgb2YgSlNPTi5zdHJpbmdpZnkoKS4gVGhpcyBlbnN1cmVzIHdlXG4gICAgLy8gcHJpbnQgQmlnSW50cywgRGVjaW1hbHMsIGFuZCBCaW5hcnkgaW4gdGhlaXIgbmF0aXZlXG4gICAgLy8gcmVwcmVzZW50YXRpb25cbiAgICBpZiAodHlwZW9mIHhbU3ltYm9sLnRvUHJpbWl0aXZlXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4geFtTeW1ib2wudG9QcmltaXRpdmVdKCdzdHJpbmcnKTtcbiAgICB9XG4gICAgcmV0dXJuIEFycmF5QnVmZmVyLmlzVmlldyh4KSA/IGBbJHt4fV1gIDogSlNPTi5zdHJpbmdpZnkoeCk7XG59XG4iXX0=

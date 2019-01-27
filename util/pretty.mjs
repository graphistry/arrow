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
/** @ignore */ const undf = void (0);
/** @ignore */
export function valueToString(x) {
    if (x === null) {
        return 'null';
    }
    if (x === undf) {
        return 'undefined';
    }
    if (typeof x === 'string') {
        return `"${x}"`;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInV0aWwvcHJldHR5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDZEQUE2RDtBQUM3RCwrREFBK0Q7QUFDL0Qsd0RBQXdEO0FBQ3hELDZEQUE2RDtBQUM3RCxvREFBb0Q7QUFDcEQsNkRBQTZEO0FBQzdELDZEQUE2RDtBQUM3RCxFQUFFO0FBQ0YsK0NBQStDO0FBQy9DLEVBQUU7QUFDRiw2REFBNkQ7QUFDN0QsOERBQThEO0FBQzlELHlEQUF5RDtBQUN6RCw0REFBNEQ7QUFDNUQsMERBQTBEO0FBQzFELHFCQUFxQjtBQUVyQixjQUFjLENBQUMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRXJDLGNBQWM7QUFDZCxNQUFNLFVBQVUsYUFBYSxDQUFDLENBQU07SUFDaEMsSUFBSSxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQUUsT0FBTyxNQUFNLENBQUM7S0FBRTtJQUNsQyxJQUFJLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFBRSxPQUFPLFdBQVcsQ0FBQztLQUFFO0lBQ3ZDLElBQUksT0FBTyxDQUFDLEtBQUssUUFBUSxFQUFFO1FBQUUsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDO0tBQUU7SUFDL0Msc0RBQXNEO0lBQ3RELHNEQUFzRDtJQUN0RCxzREFBc0Q7SUFDdEQsaUJBQWlCO0lBQ2pCLElBQUksT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLFVBQVUsRUFBRTtRQUM3QyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDMUM7SUFDRCxPQUFPLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEUsQ0FBQyIsImZpbGUiOiJ1dGlsL3ByZXR0eS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG4vKiogQGlnbm9yZSAqLyBjb25zdCB1bmRmID0gdm9pZCAoMCk7XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgZnVuY3Rpb24gdmFsdWVUb1N0cmluZyh4OiBhbnkpIHtcbiAgICBpZiAoeCA9PT0gbnVsbCkgeyByZXR1cm4gJ251bGwnOyB9XG4gICAgaWYgKHggPT09IHVuZGYpIHsgcmV0dXJuICd1bmRlZmluZWQnOyB9XG4gICAgaWYgKHR5cGVvZiB4ID09PSAnc3RyaW5nJykgeyByZXR1cm4gYFwiJHt4fVwiYDsgfVxuICAgIC8vIElmIFtTeW1ib2wudG9QcmltaXRpdmVdIGlzIGltcGxlbWVudGVkIChsaWtlIGluIEJOKVxuICAgIC8vIHVzZSBpdCBpbnN0ZWFkIG9mIEpTT04uc3RyaW5naWZ5KCkuIFRoaXMgZW5zdXJlcyB3ZVxuICAgIC8vIHByaW50IEJpZ0ludHMsIERlY2ltYWxzLCBhbmQgQmluYXJ5IGluIHRoZWlyIG5hdGl2ZVxuICAgIC8vIHJlcHJlc2VudGF0aW9uXG4gICAgaWYgKHR5cGVvZiB4W1N5bWJvbC50b1ByaW1pdGl2ZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmV0dXJuIHhbU3ltYm9sLnRvUHJpbWl0aXZlXSgnc3RyaW5nJyk7XG4gICAgfVxuICAgIHJldHVybiBBcnJheUJ1ZmZlci5pc1ZpZXcoeCkgPyBgWyR7eH1dYCA6IEpTT04uc3RyaW5naWZ5KHgpO1xufVxuIl19

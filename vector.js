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
class Vector {
}
exports.Vector = Vector;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInZlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsNkRBQTZEO0FBQzdELCtEQUErRDtBQUMvRCx3REFBd0Q7QUFDeEQsNkRBQTZEO0FBQzdELG9EQUFvRDtBQUNwRCw2REFBNkQ7QUFDN0QsNkRBQTZEO0FBQzdELEVBQUU7QUFDRiwrQ0FBK0M7QUFDL0MsRUFBRTtBQUNGLDZEQUE2RDtBQUM3RCw4REFBOEQ7QUFDOUQseURBQXlEO0FBQ3pELDREQUE0RDtBQUM1RCwwREFBMEQ7QUFDMUQscUJBQXFCOztBQWdDckIsTUFBc0IsTUFBTTtDQW9CM0I7QUFwQkQsd0JBb0JDIiwiZmlsZSI6InZlY3Rvci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBEYXRhIH0gZnJvbSAnLi9kYXRhJztcbmltcG9ydCB7IERhdGFUeXBlIH0gZnJvbSAnLi90eXBlJztcbmltcG9ydCB7IENodW5rZWQgfSBmcm9tICcuL3ZlY3Rvci9jaHVua2VkJztcblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2xvbmFibGU8UiBleHRlbmRzIFZlY3Rvcj4ge1xuICAgIGNsb25lKC4uLmFyZ3M6IGFueVtdKTogUjtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBpbnRlcmZhY2UgU2xpY2VhYmxlPFIgZXh0ZW5kcyBWZWN0b3I+IHtcbiAgICBzbGljZShiZWdpbj86IG51bWJlciwgZW5kPzogbnVtYmVyKTogUjtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXBwbGljYXRpdmU8VCBleHRlbmRzIERhdGFUeXBlLCBSIGV4dGVuZHMgQ2h1bmtlZD4ge1xuICAgIGNvbmNhdCguLi5vdGhlcnM6IFZlY3RvcjxUPltdKTogUjtcbiAgICByZWFkb25seSBbU3ltYm9sLmlzQ29uY2F0U3ByZWFkYWJsZV06IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVmVjdG9yPFQgZXh0ZW5kcyBEYXRhVHlwZSA9IGFueT5cbiAgICBleHRlbmRzIENsb25hYmxlPFZlY3RvcjxUPj4sXG4gICAgICAgICAgICBTbGljZWFibGU8VmVjdG9yPFQ+PixcbiAgICAgICAgICAgIEFwcGxpY2F0aXZlPFQsIENodW5rZWQ8VD4+IHtcblxuICAgIHJlYWRvbmx5IFRUeXBlOiBUWydUVHlwZSddO1xuICAgIHJlYWRvbmx5IFRBcnJheTogVFsnVEFycmF5J107XG4gICAgcmVhZG9ubHkgVFZhbHVlOiBUWydUVmFsdWUnXTtcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFZlY3RvcjxUIGV4dGVuZHMgRGF0YVR5cGUgPSBhbnk+IGltcGxlbWVudHMgSXRlcmFibGU8VFsnVFZhbHVlJ10gfCBudWxsPiB7XG5cbiAgICBwdWJsaWMgYWJzdHJhY3QgcmVhZG9ubHkgZGF0YTogRGF0YTxUPjtcbiAgICBwdWJsaWMgYWJzdHJhY3QgcmVhZG9ubHkgdHlwZTogVDtcbiAgICBwdWJsaWMgYWJzdHJhY3QgcmVhZG9ubHkgdHlwZUlkOiBUWydUVHlwZSddO1xuICAgIHB1YmxpYyBhYnN0cmFjdCByZWFkb25seSBsZW5ndGg6IG51bWJlcjtcbiAgICBwdWJsaWMgYWJzdHJhY3QgcmVhZG9ubHkgc3RyaWRlOiBudW1iZXI7XG4gICAgcHVibGljIGFic3RyYWN0IHJlYWRvbmx5IG51bGxDb3VudDogbnVtYmVyO1xuICAgIHB1YmxpYyBhYnN0cmFjdCByZWFkb25seSBudW1DaGlsZHJlbjogbnVtYmVyO1xuXG4gICAgcHVibGljIGFic3RyYWN0IHJlYWRvbmx5IEFycmF5VHlwZTogVFsnQXJyYXlUeXBlJ107XG5cbiAgICBwdWJsaWMgYWJzdHJhY3QgaXNWYWxpZChpbmRleDogbnVtYmVyKTogYm9vbGVhbjtcbiAgICBwdWJsaWMgYWJzdHJhY3QgZ2V0KGluZGV4OiBudW1iZXIpOiBUWydUVmFsdWUnXSB8IG51bGw7XG4gICAgcHVibGljIGFic3RyYWN0IHNldChpbmRleDogbnVtYmVyLCB2YWx1ZTogVFsnVFZhbHVlJ10gfCBudWxsKTogdm9pZDtcbiAgICBwdWJsaWMgYWJzdHJhY3QgaW5kZXhPZih2YWx1ZTogVFsnVFZhbHVlJ10gfCBudWxsLCBmcm9tSW5kZXg/OiBudW1iZXIpOiBudW1iZXI7XG4gICAgcHVibGljIGFic3RyYWN0IFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VFsnVFZhbHVlJ10gfCBudWxsPjtcblxuICAgIHB1YmxpYyBhYnN0cmFjdCB0b0FycmF5KCk6IFRbJ1RBcnJheSddO1xuICAgIHB1YmxpYyBhYnN0cmFjdCBnZXRDaGlsZEF0PFIgZXh0ZW5kcyBEYXRhVHlwZSA9IGFueT4oaW5kZXg6IG51bWJlcik6IFZlY3RvcjxSPiB8IG51bGw7XG59XG4iXX0=

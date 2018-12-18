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
const base_1 = require("./base");
class TimestampVector extends base_1.BaseVector {
    constructor(data) {
        super(data, undefined, 2);
    }
}
exports.TimestampVector = TimestampVector;
class TimestampSecondVector extends TimestampVector {
}
exports.TimestampSecondVector = TimestampSecondVector;
class TimestampMillisecondVector extends TimestampVector {
}
exports.TimestampMillisecondVector = TimestampMillisecondVector;
class TimestampMicrosecondVector extends TimestampVector {
}
exports.TimestampMicrosecondVector = TimestampMicrosecondVector;
class TimestampNanosecondVector extends TimestampVector {
}
exports.TimestampNanosecondVector = TimestampNanosecondVector;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInZlY3Rvci90aW1lc3RhbXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDZEQUE2RDtBQUM3RCwrREFBK0Q7QUFDL0Qsd0RBQXdEO0FBQ3hELDZEQUE2RDtBQUM3RCxvREFBb0Q7QUFDcEQsNkRBQTZEO0FBQzdELDZEQUE2RDtBQUM3RCxFQUFFO0FBQ0YsK0NBQStDO0FBQy9DLEVBQUU7QUFDRiw2REFBNkQ7QUFDN0QsOERBQThEO0FBQzlELHlEQUF5RDtBQUN6RCw0REFBNEQ7QUFDNUQsMERBQTBEO0FBQzFELHFCQUFxQjs7QUFHckIsaUNBQW9DO0FBR3BDLE1BQWEsZUFBaUQsU0FBUSxpQkFBYTtJQUMvRSxZQUFZLElBQWE7UUFDckIsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDOUIsQ0FBQztDQUNKO0FBSkQsMENBSUM7QUFDRCxNQUFhLHFCQUFzQixTQUFRLGVBQWdDO0NBQUc7QUFBOUUsc0RBQThFO0FBQzlFLE1BQWEsMEJBQTJCLFNBQVEsZUFBcUM7Q0FBRztBQUF4RixnRUFBd0Y7QUFDeEYsTUFBYSwwQkFBMkIsU0FBUSxlQUFxQztDQUFHO0FBQXhGLGdFQUF3RjtBQUN4RixNQUFhLHlCQUEwQixTQUFRLGVBQW9DO0NBQUc7QUFBdEYsOERBQXNGIiwiZmlsZSI6InZlY3Rvci90aW1lc3RhbXAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgRGF0YSB9IGZyb20gJy4uL2RhdGEnO1xuaW1wb3J0IHsgQmFzZVZlY3RvciB9IGZyb20gJy4vYmFzZSc7XG5pbXBvcnQgeyBUaW1lc3RhbXAsIFRpbWVzdGFtcFNlY29uZCwgVGltZXN0YW1wTWlsbGlzZWNvbmQsIFRpbWVzdGFtcE1pY3Jvc2Vjb25kLCBUaW1lc3RhbXBOYW5vc2Vjb25kIH0gZnJvbSAnLi4vdHlwZSc7XG5cbmV4cG9ydCBjbGFzcyBUaW1lc3RhbXBWZWN0b3I8VCBleHRlbmRzIFRpbWVzdGFtcCA9IFRpbWVzdGFtcD4gZXh0ZW5kcyBCYXNlVmVjdG9yPFQ+IHtcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBEYXRhPFQ+KSB7XG4gICAgICAgIHN1cGVyKGRhdGEsIHVuZGVmaW5lZCwgMik7XG4gICAgfVxufVxuZXhwb3J0IGNsYXNzIFRpbWVzdGFtcFNlY29uZFZlY3RvciBleHRlbmRzIFRpbWVzdGFtcFZlY3RvcjxUaW1lc3RhbXBTZWNvbmQ+IHt9XG5leHBvcnQgY2xhc3MgVGltZXN0YW1wTWlsbGlzZWNvbmRWZWN0b3IgZXh0ZW5kcyBUaW1lc3RhbXBWZWN0b3I8VGltZXN0YW1wTWlsbGlzZWNvbmQ+IHt9XG5leHBvcnQgY2xhc3MgVGltZXN0YW1wTWljcm9zZWNvbmRWZWN0b3IgZXh0ZW5kcyBUaW1lc3RhbXBWZWN0b3I8VGltZXN0YW1wTWljcm9zZWNvbmQ+IHt9XG5leHBvcnQgY2xhc3MgVGltZXN0YW1wTmFub3NlY29uZFZlY3RvciBleHRlbmRzIFRpbWVzdGFtcFZlY3RvcjxUaW1lc3RhbXBOYW5vc2Vjb25kPiB7fVxuIl19

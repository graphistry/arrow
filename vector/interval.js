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
class IntervalVector extends base_1.BaseVector {
    constructor(data) {
        super(data, undefined, data.type.unit + 1);
    }
}
exports.IntervalVector = IntervalVector;
class IntervalDayTimeVector extends IntervalVector {
}
exports.IntervalDayTimeVector = IntervalDayTimeVector;
class IntervalYearMonthVector extends IntervalVector {
}
exports.IntervalYearMonthVector = IntervalYearMonthVector;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInZlY3Rvci9pbnRlcnZhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsNkRBQTZEO0FBQzdELCtEQUErRDtBQUMvRCx3REFBd0Q7QUFDeEQsNkRBQTZEO0FBQzdELG9EQUFvRDtBQUNwRCw2REFBNkQ7QUFDN0QsNkRBQTZEO0FBQzdELEVBQUU7QUFDRiwrQ0FBK0M7QUFDL0MsRUFBRTtBQUNGLDZEQUE2RDtBQUM3RCw4REFBOEQ7QUFDOUQseURBQXlEO0FBQ3pELDREQUE0RDtBQUM1RCwwREFBMEQ7QUFDMUQscUJBQXFCOztBQUdyQixpQ0FBb0M7QUFHcEMsTUFBYSxjQUE4QyxTQUFRLGlCQUFhO0lBQzVFLFlBQVksSUFBYTtRQUNyQixLQUFLLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztJQUMvQyxDQUFDO0NBQ0o7QUFKRCx3Q0FJQztBQUVELE1BQWEscUJBQXNCLFNBQVEsY0FBK0I7Q0FBRztBQUE3RSxzREFBNkU7QUFDN0UsTUFBYSx1QkFBd0IsU0FBUSxjQUFpQztDQUFHO0FBQWpGLDBEQUFpRiIsImZpbGUiOiJ2ZWN0b3IvaW50ZXJ2YWwuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgRGF0YSB9IGZyb20gJy4uL2RhdGEnO1xuaW1wb3J0IHsgQmFzZVZlY3RvciB9IGZyb20gJy4vYmFzZSc7XG5pbXBvcnQgeyBJbnRlcnZhbCwgSW50ZXJ2YWxEYXlUaW1lLCBJbnRlcnZhbFllYXJNb250aCB9IGZyb20gJy4uL3R5cGUnO1xuXG5leHBvcnQgY2xhc3MgSW50ZXJ2YWxWZWN0b3I8VCBleHRlbmRzIEludGVydmFsID0gSW50ZXJ2YWw+IGV4dGVuZHMgQmFzZVZlY3RvcjxUPiB7XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxUPikge1xuICAgICAgICBzdXBlcihkYXRhLCB1bmRlZmluZWQsIGRhdGEudHlwZS51bml0ICsgMSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgSW50ZXJ2YWxEYXlUaW1lVmVjdG9yIGV4dGVuZHMgSW50ZXJ2YWxWZWN0b3I8SW50ZXJ2YWxEYXlUaW1lPiB7fVxuZXhwb3J0IGNsYXNzIEludGVydmFsWWVhck1vbnRoVmVjdG9yIGV4dGVuZHMgSW50ZXJ2YWxWZWN0b3I8SW50ZXJ2YWxZZWFyTW9udGg+IHt9XG4iXX0=
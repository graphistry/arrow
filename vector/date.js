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
const data_1 = require("../data");
const vector_1 = require("../vector");
const enum_1 = require("../enum");
const base_1 = require("./base");
const IntUtil = require("../util/int");
const type_1 = require("../type");
class DateVector extends base_1.BaseVector {
    constructor(data) {
        super(data, undefined, data.type.unit + 1);
    }
    /** @nocollapse */
    static from(data, unit = enum_1.DateUnit.MILLISECOND) {
        switch (unit) {
            case enum_1.DateUnit.DAY: {
                const values = Int32Array.from(data.map((d) => d.valueOf() / 86400000));
                return vector_1.Vector.new(data_1.Data.Date(new type_1.DateDay(), 0, data.length, 0, null, values));
            }
            case enum_1.DateUnit.MILLISECOND: {
                const values = IntUtil.Int64.convertArray(data.map((d) => d.valueOf()));
                return vector_1.Vector.new(data_1.Data.Date(new type_1.DateMillisecond(), 0, data.length, 0, null, values));
            }
        }
        throw new TypeError(`Unrecognized date unit "${enum_1.DateUnit[unit]}"`);
    }
}
exports.DateVector = DateVector;
class DateDayVector extends DateVector {
}
exports.DateDayVector = DateDayVector;
class DateMillisecondVector extends DateVector {
}
exports.DateMillisecondVector = DateMillisecondVector;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInZlY3Rvci9kYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSw2REFBNkQ7QUFDN0QsK0RBQStEO0FBQy9ELHdEQUF3RDtBQUN4RCw2REFBNkQ7QUFDN0Qsb0RBQW9EO0FBQ3BELDZEQUE2RDtBQUM3RCw2REFBNkQ7QUFDN0QsRUFBRTtBQUNGLCtDQUErQztBQUMvQyxFQUFFO0FBQ0YsNkRBQTZEO0FBQzdELDhEQUE4RDtBQUM5RCx5REFBeUQ7QUFDekQsNERBQTREO0FBQzVELDBEQUEwRDtBQUMxRCxxQkFBcUI7O0FBRXJCLGtDQUErQjtBQUMvQixzQ0FBbUM7QUFDbkMsa0NBQW1DO0FBQ25DLGlDQUFvQztBQUNwQyx1Q0FBdUM7QUFDdkMsa0NBQTJEO0FBRTNELE1BQWEsVUFBb0MsU0FBUSxpQkFBYTtJQWVsRSxZQUFZLElBQWE7UUFDckIsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQWhCRCxrQkFBa0I7SUFDWCxNQUFNLENBQUMsSUFBSSxDQUFvQyxJQUFZLEVBQUUsT0FBa0IsZUFBUSxDQUFDLFdBQVc7UUFDdEcsUUFBUSxJQUFJLEVBQUU7WUFDVixLQUFLLGVBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDZixNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUN4RSxPQUFPLGVBQU0sQ0FBQyxHQUFHLENBQUMsV0FBSSxDQUFDLElBQUksQ0FBQyxJQUFJLGNBQU8sRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQzthQUNoRjtZQUNELEtBQUssZUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUN2QixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUN4RSxPQUFPLGVBQU0sQ0FBQyxHQUFHLENBQUMsV0FBSSxDQUFDLElBQUksQ0FBQyxJQUFJLHNCQUFlLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7YUFDeEY7U0FDSjtRQUNELE1BQU0sSUFBSSxTQUFTLENBQUMsMkJBQTJCLGVBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdEUsQ0FBQztDQUlKO0FBbEJELGdDQWtCQztBQUNELE1BQWEsYUFBYyxTQUFRLFVBQW1CO0NBQUc7QUFBekQsc0NBQXlEO0FBQ3pELE1BQWEscUJBQXNCLFNBQVEsVUFBMkI7Q0FBRztBQUF6RSxzREFBeUUiLCJmaWxlIjoidmVjdG9yL2RhdGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgRGF0YSB9IGZyb20gJy4uL2RhdGEnO1xuaW1wb3J0IHsgVmVjdG9yIH0gZnJvbSAnLi4vdmVjdG9yJztcbmltcG9ydCB7IERhdGVVbml0IH0gZnJvbSAnLi4vZW51bSc7XG5pbXBvcnQgeyBCYXNlVmVjdG9yIH0gZnJvbSAnLi9iYXNlJztcbmltcG9ydCAqIGFzIEludFV0aWwgZnJvbSAnLi4vdXRpbC9pbnQnO1xuaW1wb3J0IHsgRGF0ZV8sIERhdGVEYXksIERhdGVNaWxsaXNlY29uZCAgfSBmcm9tICcuLi90eXBlJztcblxuZXhwb3J0IGNsYXNzIERhdGVWZWN0b3I8VCBleHRlbmRzIERhdGVfID0gRGF0ZV8+IGV4dGVuZHMgQmFzZVZlY3RvcjxUPiB7XG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyBEYXRlXyA9IERhdGVNaWxsaXNlY29uZD4oZGF0YTogRGF0ZVtdLCB1bml0OiBUWyd1bml0J10gPSBEYXRlVW5pdC5NSUxMSVNFQ09ORCkge1xuICAgICAgICBzd2l0Y2ggKHVuaXQpIHtcbiAgICAgICAgICAgIGNhc2UgRGF0ZVVuaXQuREFZOiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWVzID0gSW50MzJBcnJheS5mcm9tKGRhdGEubWFwKChkKSA9PiBkLnZhbHVlT2YoKSAvIDg2NDAwMDAwKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFZlY3Rvci5uZXcoRGF0YS5EYXRlKG5ldyBEYXRlRGF5KCksIDAsIGRhdGEubGVuZ3RoLCAwLCBudWxsLCB2YWx1ZXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgRGF0ZVVuaXQuTUlMTElTRUNPTkQ6IHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZXMgPSBJbnRVdGlsLkludDY0LmNvbnZlcnRBcnJheShkYXRhLm1hcCgoZCkgPT4gZC52YWx1ZU9mKCkpKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gVmVjdG9yLm5ldyhEYXRhLkRhdGUobmV3IERhdGVNaWxsaXNlY29uZCgpLCAwLCBkYXRhLmxlbmd0aCwgMCwgbnVsbCwgdmFsdWVzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVW5yZWNvZ25pemVkIGRhdGUgdW5pdCBcIiR7RGF0ZVVuaXRbdW5pdF19XCJgKTtcbiAgICB9XG4gICAgY29uc3RydWN0b3IoZGF0YTogRGF0YTxUPikge1xuICAgICAgICBzdXBlcihkYXRhLCB1bmRlZmluZWQsIGRhdGEudHlwZS51bml0ICsgMSk7XG4gICAgfVxufVxuZXhwb3J0IGNsYXNzIERhdGVEYXlWZWN0b3IgZXh0ZW5kcyBEYXRlVmVjdG9yPERhdGVEYXk+IHt9XG5leHBvcnQgY2xhc3MgRGF0ZU1pbGxpc2Vjb25kVmVjdG9yIGV4dGVuZHMgRGF0ZVZlY3RvcjxEYXRlTWlsbGlzZWNvbmQ+IHt9XG4iXX0=

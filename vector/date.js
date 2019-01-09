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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInZlY3Rvci9kYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSw2REFBNkQ7QUFDN0QsK0RBQStEO0FBQy9ELHdEQUF3RDtBQUN4RCw2REFBNkQ7QUFDN0Qsb0RBQW9EO0FBQ3BELDZEQUE2RDtBQUM3RCw2REFBNkQ7QUFDN0QsRUFBRTtBQUNGLCtDQUErQztBQUMvQyxFQUFFO0FBQ0YsNkRBQTZEO0FBQzdELDhEQUE4RDtBQUM5RCx5REFBeUQ7QUFDekQsNERBQTREO0FBQzVELDBEQUEwRDtBQUMxRCxxQkFBcUI7O0FBRXJCLGtDQUErQjtBQUMvQixzQ0FBbUM7QUFDbkMsa0NBQW1DO0FBQ25DLGlDQUFvQztBQUNwQyx1Q0FBdUM7QUFDdkMsa0NBQTJEO0FBRTNELE1BQWEsVUFBb0MsU0FBUSxpQkFBYTtJQUNsRSxrQkFBa0I7SUFDWCxNQUFNLENBQUMsSUFBSSxDQUFvQyxJQUFZLEVBQUUsT0FBa0IsZUFBUSxDQUFDLFdBQVc7UUFDdEcsUUFBUSxJQUFJLEVBQUU7WUFDVixLQUFLLGVBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDZixNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUN4RSxPQUFPLGVBQU0sQ0FBQyxHQUFHLENBQUMsV0FBSSxDQUFDLElBQUksQ0FBQyxJQUFJLGNBQU8sRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQzthQUNoRjtZQUNELEtBQUssZUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUN2QixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUN4RSxPQUFPLGVBQU0sQ0FBQyxHQUFHLENBQUMsV0FBSSxDQUFDLElBQUksQ0FBQyxJQUFJLHNCQUFlLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7YUFDeEY7U0FDSjtRQUNELE1BQU0sSUFBSSxTQUFTLENBQUMsMkJBQTJCLGVBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdEUsQ0FBQztDQUNKO0FBZkQsZ0NBZUM7QUFFRCxNQUFhLGFBQWMsU0FBUSxVQUFtQjtDQUFHO0FBQXpELHNDQUF5RDtBQUN6RCxNQUFhLHFCQUFzQixTQUFRLFVBQTJCO0NBQUc7QUFBekUsc0RBQXlFIiwiZmlsZSI6InZlY3Rvci9kYXRlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IERhdGEgfSBmcm9tICcuLi9kYXRhJztcbmltcG9ydCB7IFZlY3RvciB9IGZyb20gJy4uL3ZlY3Rvcic7XG5pbXBvcnQgeyBEYXRlVW5pdCB9IGZyb20gJy4uL2VudW0nO1xuaW1wb3J0IHsgQmFzZVZlY3RvciB9IGZyb20gJy4vYmFzZSc7XG5pbXBvcnQgKiBhcyBJbnRVdGlsIGZyb20gJy4uL3V0aWwvaW50JztcbmltcG9ydCB7IERhdGVfLCBEYXRlRGF5LCBEYXRlTWlsbGlzZWNvbmQgIH0gZnJvbSAnLi4vdHlwZSc7XG5cbmV4cG9ydCBjbGFzcyBEYXRlVmVjdG9yPFQgZXh0ZW5kcyBEYXRlXyA9IERhdGVfPiBleHRlbmRzIEJhc2VWZWN0b3I8VD4ge1xuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgRGF0ZV8gPSBEYXRlTWlsbGlzZWNvbmQ+KGRhdGE6IERhdGVbXSwgdW5pdDogVFsndW5pdCddID0gRGF0ZVVuaXQuTUlMTElTRUNPTkQpIHtcbiAgICAgICAgc3dpdGNoICh1bml0KSB7XG4gICAgICAgICAgICBjYXNlIERhdGVVbml0LkRBWToge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlcyA9IEludDMyQXJyYXkuZnJvbShkYXRhLm1hcCgoZCkgPT4gZC52YWx1ZU9mKCkgLyA4NjQwMDAwMCkpO1xuICAgICAgICAgICAgICAgIHJldHVybiBWZWN0b3IubmV3KERhdGEuRGF0ZShuZXcgRGF0ZURheSgpLCAwLCBkYXRhLmxlbmd0aCwgMCwgbnVsbCwgdmFsdWVzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIERhdGVVbml0Lk1JTExJU0VDT05EOiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWVzID0gSW50VXRpbC5JbnQ2NC5jb252ZXJ0QXJyYXkoZGF0YS5tYXAoKGQpID0+IGQudmFsdWVPZigpKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFZlY3Rvci5uZXcoRGF0YS5EYXRlKG5ldyBEYXRlTWlsbGlzZWNvbmQoKSwgMCwgZGF0YS5sZW5ndGgsIDAsIG51bGwsIHZhbHVlcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFVucmVjb2duaXplZCBkYXRlIHVuaXQgXCIke0RhdGVVbml0W3VuaXRdfVwiYCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgRGF0ZURheVZlY3RvciBleHRlbmRzIERhdGVWZWN0b3I8RGF0ZURheT4ge31cbmV4cG9ydCBjbGFzcyBEYXRlTWlsbGlzZWNvbmRWZWN0b3IgZXh0ZW5kcyBEYXRlVmVjdG9yPERhdGVNaWxsaXNlY29uZD4ge31cbiJdfQ==

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
const type_1 = require("../type");
const vector_1 = require("../vector");
const base_1 = require("./base");
const bit_1 = require("../util/bit");
class BoolVector extends base_1.BaseVector {
    /** @nocollapse */
    static from(data) {
        let length = 0, bitmap = bit_1.packBools(function* () {
            for (let x of data) {
                length++;
                yield x;
            }
        }());
        return vector_1.Vector.new(data_1.Data.Bool(new type_1.Bool(), 0, length, 0, null, bitmap));
    }
}
exports.BoolVector = BoolVector;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInZlY3Rvci9ib29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSw2REFBNkQ7QUFDN0QsK0RBQStEO0FBQy9ELHdEQUF3RDtBQUN4RCw2REFBNkQ7QUFDN0Qsb0RBQW9EO0FBQ3BELDZEQUE2RDtBQUM3RCw2REFBNkQ7QUFDN0QsRUFBRTtBQUNGLCtDQUErQztBQUMvQyxFQUFFO0FBQ0YsNkRBQTZEO0FBQzdELDhEQUE4RDtBQUM5RCx5REFBeUQ7QUFDekQsNERBQTREO0FBQzVELDBEQUEwRDtBQUMxRCxxQkFBcUI7O0FBRXJCLGtDQUErQjtBQUMvQixrQ0FBK0I7QUFDL0Isc0NBQW1DO0FBQ25DLGlDQUFvQztBQUNwQyxxQ0FBd0M7QUFFeEMsTUFBYSxVQUFXLFNBQVEsaUJBQWdCO0lBQzVDLGtCQUFrQjtJQUNYLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBdUI7UUFDdEMsSUFBSSxNQUFNLEdBQUcsQ0FBQyxFQUFFLE1BQU0sR0FBRyxlQUFTLENBQUMsUUFBUSxDQUFDO1lBQ3hDLEtBQUssSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFO2dCQUFFLE1BQU0sRUFBRSxDQUFDO2dCQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQUU7UUFDOUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNMLE9BQU8sZUFBTSxDQUFDLEdBQUcsQ0FBQyxXQUFJLENBQUMsSUFBSSxDQUFDLElBQUksV0FBSSxFQUFFLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDekUsQ0FBQztDQUNKO0FBUkQsZ0NBUUMiLCJmaWxlIjoidmVjdG9yL2Jvb2wuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuaW1wb3J0IHsgRGF0YSB9IGZyb20gJy4uL2RhdGEnO1xuaW1wb3J0IHsgQm9vbCB9IGZyb20gJy4uL3R5cGUnO1xuaW1wb3J0IHsgVmVjdG9yIH0gZnJvbSAnLi4vdmVjdG9yJztcbmltcG9ydCB7IEJhc2VWZWN0b3IgfSBmcm9tICcuL2Jhc2UnO1xuaW1wb3J0IHsgcGFja0Jvb2xzIH0gZnJvbSAnLi4vdXRpbC9iaXQnO1xuXG5leHBvcnQgY2xhc3MgQm9vbFZlY3RvciBleHRlbmRzIEJhc2VWZWN0b3I8Qm9vbD4ge1xuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbShkYXRhOiBJdGVyYWJsZTxib29sZWFuPikge1xuICAgICAgICBsZXQgbGVuZ3RoID0gMCwgYml0bWFwID0gcGFja0Jvb2xzKGZ1bmN0aW9uKigpIHtcbiAgICAgICAgICAgIGZvciAobGV0IHggb2YgZGF0YSkgeyBsZW5ndGgrKzsgeWllbGQgeDsgfVxuICAgICAgICB9KCkpO1xuICAgICAgICByZXR1cm4gVmVjdG9yLm5ldyhEYXRhLkJvb2wobmV3IEJvb2woKSwgMCwgbGVuZ3RoLCAwLCBudWxsLCBiaXRtYXApKTtcbiAgICB9XG59XG4iXX0=

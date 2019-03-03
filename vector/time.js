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
class TimeVector extends base_1.BaseVector {
}
exports.TimeVector = TimeVector;
class TimeSecondVector extends TimeVector {
}
exports.TimeSecondVector = TimeSecondVector;
class TimeMillisecondVector extends TimeVector {
}
exports.TimeMillisecondVector = TimeMillisecondVector;
class TimeMicrosecondVector extends TimeVector {
}
exports.TimeMicrosecondVector = TimeMicrosecondVector;
class TimeNanosecondVector extends TimeVector {
}
exports.TimeNanosecondVector = TimeNanosecondVector;

//# sourceMappingURL=time.js.map

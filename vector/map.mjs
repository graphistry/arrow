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
import { Vector } from '../vector';
import { BaseVector } from './base';
import { RowProxyGenerator } from './row';
import { Struct } from '../type';
export class MapVector extends BaseVector {
    asStruct() {
        return Vector.new(this.data.clone(new Struct(this.type.children)));
    }
    get rowProxy() {
        return this._rowProxy || (this._rowProxy = RowProxyGenerator.new(this, this.type.children || [], true));
    }
}

//# sourceMappingURL=map.mjs.map

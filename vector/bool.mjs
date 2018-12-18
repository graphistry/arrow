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
import { Data } from '../data';
import { Bool } from '../type';
import { Vector } from '../vector';
import { BaseVector } from './base';
import { packBools } from '../util/bit';
export class BoolVector extends BaseVector {
    /** @nocollapse */
    static from(data) {
        let length = 0, bitmap = packBools(function* () {
            for (let x of data) {
                length++;
                yield x;
            }
        }());
        return Vector.new(Data.Bool(new Bool(), 0, length, 0, null, bitmap));
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInZlY3Rvci9ib29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDZEQUE2RDtBQUM3RCwrREFBK0Q7QUFDL0Qsd0RBQXdEO0FBQ3hELDZEQUE2RDtBQUM3RCxvREFBb0Q7QUFDcEQsNkRBQTZEO0FBQzdELDZEQUE2RDtBQUM3RCxFQUFFO0FBQ0YsK0NBQStDO0FBQy9DLEVBQUU7QUFDRiw2REFBNkQ7QUFDN0QsOERBQThEO0FBQzlELHlEQUF5RDtBQUN6RCw0REFBNEQ7QUFDNUQsMERBQTBEO0FBQzFELHFCQUFxQjtBQUVyQixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQy9CLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDL0IsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUNuQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3BDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFFeEMsTUFBTSxPQUFPLFVBQVcsU0FBUSxVQUFnQjtJQUM1QyxrQkFBa0I7SUFDWCxNQUFNLENBQUMsSUFBSSxDQUFDLElBQXVCO1FBQ3RDLElBQUksTUFBTSxHQUFHLENBQUMsRUFBRSxNQUFNLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQztZQUN4QyxLQUFLLElBQUksQ0FBQyxJQUFJLElBQUksRUFBRTtnQkFBRSxNQUFNLEVBQUUsQ0FBQztnQkFBQyxNQUFNLENBQUMsQ0FBQzthQUFFO1FBQzlDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDTCxPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksRUFBRSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ3pFLENBQUM7Q0FDSiIsImZpbGUiOiJ2ZWN0b3IvYm9vbC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBEYXRhIH0gZnJvbSAnLi4vZGF0YSc7XG5pbXBvcnQgeyBCb29sIH0gZnJvbSAnLi4vdHlwZSc7XG5pbXBvcnQgeyBWZWN0b3IgfSBmcm9tICcuLi92ZWN0b3InO1xuaW1wb3J0IHsgQmFzZVZlY3RvciB9IGZyb20gJy4vYmFzZSc7XG5pbXBvcnQgeyBwYWNrQm9vbHMgfSBmcm9tICcuLi91dGlsL2JpdCc7XG5cbmV4cG9ydCBjbGFzcyBCb29sVmVjdG9yIGV4dGVuZHMgQmFzZVZlY3RvcjxCb29sPiB7XG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBmcm9tKGRhdGE6IEl0ZXJhYmxlPGJvb2xlYW4+KSB7XG4gICAgICAgIGxldCBsZW5ndGggPSAwLCBiaXRtYXAgPSBwYWNrQm9vbHMoZnVuY3Rpb24qKCkge1xuICAgICAgICAgICAgZm9yIChsZXQgeCBvZiBkYXRhKSB7IGxlbmd0aCsrOyB5aWVsZCB4OyB9XG4gICAgICAgIH0oKSk7XG4gICAgICAgIHJldHVybiBWZWN0b3IubmV3KERhdGEuQm9vbChuZXcgQm9vbCgpLCAwLCBsZW5ndGgsIDAsIG51bGwsIGJpdG1hcCkpO1xuICAgIH1cbn1cbiJdfQ==

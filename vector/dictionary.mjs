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
export class DictionaryView {
    constructor(dictionary, indices) {
        this.indices = indices;
        this.dictionary = dictionary;
    }
    clone(data) {
        return new DictionaryView(data.dictionary, this.indices.clone(data.indices));
    }
    isValid(index) {
        return this.indices.isValid(index);
    }
    get(index) {
        return this.dictionary.get(this.indices.get(index));
    }
    set(index, value) {
        this.dictionary.set(this.indices.get(index), value);
    }
    toArray() {
        return [...this];
    }
    *[Symbol.iterator]() {
        const values = this.dictionary, indices = this.indices;
        for (let index = -1, n = indices.length; ++index < n;) {
            yield values.get(indices.get(index));
        }
    }
    indexOf(search) {
        // First find the dictionary key for the desired value...
        const key = this.dictionary.indexOf(search);
        if (key === -1) {
            return key;
        }
        // ... then find the first occurence of that key in indices
        return this.indices.indexOf(key);
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInZlY3Rvci9kaWN0aW9uYXJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDZEQUE2RDtBQUM3RCwrREFBK0Q7QUFDL0Qsd0RBQXdEO0FBQ3hELDZEQUE2RDtBQUM3RCxvREFBb0Q7QUFDcEQsNkRBQTZEO0FBQzdELDZEQUE2RDtBQUM3RCxFQUFFO0FBQ0YsK0NBQStDO0FBQy9DLEVBQUU7QUFDRiw2REFBNkQ7QUFDN0QsOERBQThEO0FBQzlELHlEQUF5RDtBQUN6RCw0REFBNEQ7QUFDNUQsMERBQTBEO0FBQzFELHFCQUFxQjtBQU1yQixNQUFNO0lBR0YsWUFBWSxVQUFxQixFQUFFLE9BQW9CO1FBQ25ELElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO0lBQ2pDLENBQUM7SUFDTSxLQUFLLENBQUMsSUFBbUM7UUFDNUMsT0FBTyxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBUyxDQUFDO0lBQ3pGLENBQUM7SUFDTSxPQUFPLENBQUMsS0FBYTtRQUN4QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFDTSxHQUFHLENBQUMsS0FBYTtRQUNwQixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDeEQsQ0FBQztJQUNNLEdBQUcsQ0FBQyxLQUFhLEVBQUUsS0FBa0I7UUFDeEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDeEQsQ0FBQztJQUNNLE9BQU87UUFDVixPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUNyQixDQUFDO0lBQ00sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7UUFDckIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUN2RCxLQUFLLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsS0FBSyxHQUFHLENBQUMsR0FBRztZQUNuRCxNQUFNLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1NBQ3hDO0lBQ0wsQ0FBQztJQUNNLE9BQU8sQ0FBQyxNQUFtQjtRQUM5Qix5REFBeUQ7UUFDekQsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDNUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUU7WUFBRSxPQUFPLEdBQUcsQ0FBQztTQUFFO1FBRS9CLDJEQUEyRDtRQUMzRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUksQ0FBQyxDQUFDO0lBQ3RDLENBQUM7Q0FDSiIsImZpbGUiOiJ2ZWN0b3IvZGljdGlvbmFyeS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBEYXRhIH0gZnJvbSAnLi4vZGF0YSc7XG5pbXBvcnQgeyBWaWV3LCBWZWN0b3IgfSBmcm9tICcuLi92ZWN0b3InO1xuaW1wb3J0IHsgSXRlcmFibGVBcnJheUxpa2UsIERhdGFUeXBlLCBEaWN0aW9uYXJ5LCBJbnQgfSBmcm9tICcuLi90eXBlJztcblxuZXhwb3J0IGNsYXNzIERpY3Rpb25hcnlWaWV3PFQgZXh0ZW5kcyBEYXRhVHlwZT4gaW1wbGVtZW50cyBWaWV3PFQ+IHtcbiAgICBwdWJsaWMgaW5kaWNlczogVmVjdG9yPEludD47XG4gICAgcHVibGljIGRpY3Rpb25hcnk6IFZlY3RvcjxUPjtcbiAgICBjb25zdHJ1Y3RvcihkaWN0aW9uYXJ5OiBWZWN0b3I8VD4sIGluZGljZXM6IFZlY3RvcjxJbnQ+KSB7XG4gICAgICAgIHRoaXMuaW5kaWNlcyA9IGluZGljZXM7XG4gICAgICAgIHRoaXMuZGljdGlvbmFyeSA9IGRpY3Rpb25hcnk7XG4gICAgfVxuICAgIHB1YmxpYyBjbG9uZShkYXRhOiBEYXRhPERpY3Rpb25hcnk8VD4+ICYgRGF0YTxUPik6IHRoaXMge1xuICAgICAgICByZXR1cm4gbmV3IERpY3Rpb25hcnlWaWV3KGRhdGEuZGljdGlvbmFyeSwgdGhpcy5pbmRpY2VzLmNsb25lKGRhdGEuaW5kaWNlcykpIGFzIHRoaXM7XG4gICAgfVxuICAgIHB1YmxpYyBpc1ZhbGlkKGluZGV4OiBudW1iZXIpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kaWNlcy5pc1ZhbGlkKGluZGV4KTtcbiAgICB9XG4gICAgcHVibGljIGdldChpbmRleDogbnVtYmVyKTogVFsnVFZhbHVlJ10ge1xuICAgICAgICByZXR1cm4gdGhpcy5kaWN0aW9uYXJ5LmdldCh0aGlzLmluZGljZXMuZ2V0KGluZGV4KSk7XG4gICAgfVxuICAgIHB1YmxpYyBzZXQoaW5kZXg6IG51bWJlciwgdmFsdWU6IFRbJ1RWYWx1ZSddKTogdm9pZCB7XG4gICAgICAgIHRoaXMuZGljdGlvbmFyeS5zZXQodGhpcy5pbmRpY2VzLmdldChpbmRleCksIHZhbHVlKTtcbiAgICB9XG4gICAgcHVibGljIHRvQXJyYXkoKTogSXRlcmFibGVBcnJheUxpa2U8VFsnVFZhbHVlJ10+IHtcbiAgICAgICAgcmV0dXJuIFsuLi50aGlzXTtcbiAgICB9XG4gICAgcHVibGljICpbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFRbJ1RWYWx1ZSddPiB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IHRoaXMuZGljdGlvbmFyeSwgaW5kaWNlcyA9IHRoaXMuaW5kaWNlcztcbiAgICAgICAgZm9yIChsZXQgaW5kZXggPSAtMSwgbiA9IGluZGljZXMubGVuZ3RoOyArK2luZGV4IDwgbjspIHtcbiAgICAgICAgICAgIHlpZWxkIHZhbHVlcy5nZXQoaW5kaWNlcy5nZXQoaW5kZXgpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBwdWJsaWMgaW5kZXhPZihzZWFyY2g6IFRbJ1RWYWx1ZSddKSB7XG4gICAgICAgIC8vIEZpcnN0IGZpbmQgdGhlIGRpY3Rpb25hcnkga2V5IGZvciB0aGUgZGVzaXJlZCB2YWx1ZS4uLlxuICAgICAgICBjb25zdCBrZXkgPSB0aGlzLmRpY3Rpb25hcnkuaW5kZXhPZihzZWFyY2gpO1xuICAgICAgICBpZiAoa2V5ID09PSAtMSkgeyByZXR1cm4ga2V5OyB9XG5cbiAgICAgICAgLy8gLi4uIHRoZW4gZmluZCB0aGUgZmlyc3Qgb2NjdXJlbmNlIG9mIHRoYXQga2V5IGluIGluZGljZXNcbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kaWNlcy5pbmRleE9mKGtleSEpO1xuICAgIH1cbn1cbiJdfQ==

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
import { Duplex } from 'stream';
import { AsyncByteQueue } from '../../io/stream';
import { RecordBatchReader } from '../../ipc/reader';
/** @ignore */
export function recordBatchReaderThroughNodeStream() {
    return new RecordBatchReaderDuplex();
}
/** @ignore */
class RecordBatchReaderDuplex extends Duplex {
    constructor() {
        super({ allowHalfOpen: false, readableObjectMode: true, writableObjectMode: false });
        this._pulling = false;
        this._reader = null;
        this._asyncQueue = new AsyncByteQueue();
    }
    _final(cb) {
        const aq = this._asyncQueue;
        aq && aq.close();
        cb && cb();
    }
    _write(x, _, cb) {
        const aq = this._asyncQueue;
        aq && aq.write(x);
        cb && cb();
        return true;
    }
    _read(size) {
        const aq = this._asyncQueue;
        if (aq && !this._pulling && (this._pulling = true)) {
            (async () => {
                if (!this._reader) {
                    this._reader = await this._open(aq);
                }
                this._pulling = await this._pull(size, this._reader);
            })();
        }
    }
    _destroy(err, cb) {
        const aq = this._asyncQueue;
        if (aq) {
            err ? aq.abort(err) : aq.close();
        }
        cb(this._asyncQueue = this._reader = null);
    }
    async _open(source) {
        return await (await RecordBatchReader.from(source)).open();
    }
    async _pull(size, reader) {
        let r = null;
        while (this.readable && !(r = await reader.next()).done) {
            if (!this.push(r.value) || (size != null && --size <= 0)) {
                break;
            }
        }
        if ((r && r.done || !this.readable) && (this.push(null) || true)) {
            await reader.cancel();
        }
        return !this.readable;
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlwYy9ub2RlL3JlYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSw2REFBNkQ7QUFDN0QsK0RBQStEO0FBQy9ELHdEQUF3RDtBQUN4RCw2REFBNkQ7QUFDN0Qsb0RBQW9EO0FBQ3BELDZEQUE2RDtBQUM3RCw2REFBNkQ7QUFDN0QsRUFBRTtBQUNGLCtDQUErQztBQUMvQyxFQUFFO0FBQ0YsNkRBQTZEO0FBQzdELDhEQUE4RDtBQUM5RCx5REFBeUQ7QUFDekQsNERBQTREO0FBQzVELDBEQUEwRDtBQUMxRCxxQkFBcUI7QUFFckIsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUdoQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDakQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFFckQsY0FBYztBQUNkLE1BQU0sVUFBVSxrQ0FBa0M7SUFDOUMsT0FBTyxJQUFJLHVCQUF1QixFQUFLLENBQUM7QUFDNUMsQ0FBQztBQUlELGNBQWM7QUFDZCxNQUFNLHVCQUFxRSxTQUFRLE1BQU07SUFJckY7UUFDSSxLQUFLLENBQUMsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUFFLElBQUksRUFBRSxrQkFBa0IsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBSmpGLGFBQVEsR0FBWSxLQUFLLENBQUM7UUFLOUIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7UUFDcEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFDO0lBQzVDLENBQUM7SUFDRCxNQUFNLENBQUMsRUFBTztRQUNWLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7UUFDNUIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNqQixFQUFFLElBQUksRUFBRSxFQUFFLENBQUM7SUFDZixDQUFDO0lBQ0QsTUFBTSxDQUFDLENBQU0sRUFBRSxDQUFTLEVBQUUsRUFBTTtRQUM1QixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO1FBQzVCLEVBQUUsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xCLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQztRQUNYLE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7SUFDRCxLQUFLLENBQUMsSUFBWTtRQUNkLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7UUFDNUIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsRUFBRTtZQUNoRCxDQUFDLEtBQUssSUFBSSxFQUFFO2dCQUNSLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFO29CQUNmLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2lCQUN2QztnQkFDRCxJQUFJLENBQUMsUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3pELENBQUMsQ0FBQyxFQUFFLENBQUM7U0FDUjtJQUNMLENBQUM7SUFDRCxRQUFRLENBQUMsR0FBaUIsRUFBRSxFQUFpQztRQUN6RCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO1FBQzVCLElBQUksRUFBRSxFQUFFO1lBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUM7U0FBRTtRQUM3QyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFDRCxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQXNCO1FBQzlCLE9BQU8sTUFBTSxDQUFDLE1BQU0saUJBQWlCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDL0QsQ0FBQztJQUNELEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBWSxFQUFFLE1BQTRCO1FBQ2xELElBQUksQ0FBQyxHQUEwQyxJQUFJLENBQUM7UUFDcEQsT0FBTyxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUU7WUFDckQsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksSUFBSSxFQUFFLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRTtnQkFBRSxNQUFNO2FBQUU7U0FDdkU7UUFDRCxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFO1lBQzlELE1BQU0sTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1NBQ3pCO1FBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDMUIsQ0FBQztDQUNKIiwiZmlsZSI6ImlwYy9ub2RlL3JlYWRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBEdXBsZXggfSBmcm9tICdzdHJlYW0nO1xuaW1wb3J0IHsgRGF0YVR5cGUgfSBmcm9tICcuLi8uLi90eXBlJztcbmltcG9ydCB7IFJlY29yZEJhdGNoIH0gZnJvbSAnLi4vLi4vcmVjb3JkYmF0Y2gnO1xuaW1wb3J0IHsgQXN5bmNCeXRlUXVldWUgfSBmcm9tICcuLi8uLi9pby9zdHJlYW0nO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2hSZWFkZXIgfSBmcm9tICcuLi8uLi9pcGMvcmVhZGVyJztcblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBmdW5jdGlvbiByZWNvcmRCYXRjaFJlYWRlclRocm91Z2hOb2RlU3RyZWFtPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KCkge1xuICAgIHJldHVybiBuZXcgUmVjb3JkQmF0Y2hSZWFkZXJEdXBsZXg8VD4oKTtcbn1cblxudHlwZSBDQiA9IChlcnJvcj86IEVycm9yIHwgbnVsbCB8IHVuZGVmaW5lZCkgPT4gdm9pZDtcblxuLyoqIEBpZ25vcmUgKi9cbmNsYXNzIFJlY29yZEJhdGNoUmVhZGVyRHVwbGV4PFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+IGV4dGVuZHMgRHVwbGV4IHtcbiAgICBwcml2YXRlIF9wdWxsaW5nOiBib29sZWFuID0gZmFsc2U7XG4gICAgcHJpdmF0ZSBfcmVhZGVyOiBSZWNvcmRCYXRjaFJlYWRlciB8IG51bGw7XG4gICAgcHJpdmF0ZSBfYXN5bmNRdWV1ZTogQXN5bmNCeXRlUXVldWUgfCBudWxsO1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcih7IGFsbG93SGFsZk9wZW46IGZhbHNlLCByZWFkYWJsZU9iamVjdE1vZGU6IHRydWUsIHdyaXRhYmxlT2JqZWN0TW9kZTogZmFsc2UgfSk7XG4gICAgICAgIHRoaXMuX3JlYWRlciA9IG51bGw7XG4gICAgICAgIHRoaXMuX2FzeW5jUXVldWUgPSBuZXcgQXN5bmNCeXRlUXVldWUoKTtcbiAgICB9XG4gICAgX2ZpbmFsKGNiPzogQ0IpIHtcbiAgICAgICAgY29uc3QgYXEgPSB0aGlzLl9hc3luY1F1ZXVlO1xuICAgICAgICBhcSAmJiBhcS5jbG9zZSgpO1xuICAgICAgICBjYiAmJiBjYigpO1xuICAgIH1cbiAgICBfd3JpdGUoeDogYW55LCBfOiBzdHJpbmcsIGNiOiBDQikge1xuICAgICAgICBjb25zdCBhcSA9IHRoaXMuX2FzeW5jUXVldWU7XG4gICAgICAgIGFxICYmIGFxLndyaXRlKHgpO1xuICAgICAgICBjYiAmJiBjYigpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgX3JlYWQoc2l6ZTogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGFxID0gdGhpcy5fYXN5bmNRdWV1ZTtcbiAgICAgICAgaWYgKGFxICYmICF0aGlzLl9wdWxsaW5nICYmICh0aGlzLl9wdWxsaW5nID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgIChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9yZWFkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcmVhZGVyID0gYXdhaXQgdGhpcy5fb3BlbihhcSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuX3B1bGxpbmcgPSBhd2FpdCB0aGlzLl9wdWxsKHNpemUsIHRoaXMuX3JlYWRlcik7XG4gICAgICAgICAgICB9KSgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIF9kZXN0cm95KGVycjogRXJyb3IgfCBudWxsLCBjYjogKGVycm9yOiBFcnJvciB8IG51bGwpID0+IHZvaWQpIHtcbiAgICAgICAgY29uc3QgYXEgPSB0aGlzLl9hc3luY1F1ZXVlO1xuICAgICAgICBpZiAoYXEpIHsgZXJyID8gYXEuYWJvcnQoZXJyKSA6IGFxLmNsb3NlKCk7IH1cbiAgICAgICAgY2IodGhpcy5fYXN5bmNRdWV1ZSA9IHRoaXMuX3JlYWRlciA9IG51bGwpO1xuICAgIH1cbiAgICBhc3luYyBfb3Blbihzb3VyY2U6IEFzeW5jQnl0ZVF1ZXVlKSB7XG4gICAgICAgIHJldHVybiBhd2FpdCAoYXdhaXQgUmVjb3JkQmF0Y2hSZWFkZXIuZnJvbShzb3VyY2UpKS5vcGVuKCk7XG4gICAgfVxuICAgIGFzeW5jIF9wdWxsKHNpemU6IG51bWJlciwgcmVhZGVyOiBSZWNvcmRCYXRjaFJlYWRlcjxUPikge1xuICAgICAgICBsZXQgcjogSXRlcmF0b3JSZXN1bHQ8UmVjb3JkQmF0Y2g8VD4+IHwgbnVsbCA9IG51bGw7XG4gICAgICAgIHdoaWxlICh0aGlzLnJlYWRhYmxlICYmICEociA9IGF3YWl0IHJlYWRlci5uZXh0KCkpLmRvbmUpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5wdXNoKHIudmFsdWUpIHx8IChzaXplICE9IG51bGwgJiYgLS1zaXplIDw9IDApKSB7IGJyZWFrOyB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKChyICYmIHIuZG9uZSB8fCAhdGhpcy5yZWFkYWJsZSkgJiYgKHRoaXMucHVzaChudWxsKSB8fCB0cnVlKSkge1xuICAgICAgICAgICAgYXdhaXQgcmVhZGVyLmNhbmNlbCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAhdGhpcy5yZWFkYWJsZTtcbiAgICB9XG59XG4iXX0=

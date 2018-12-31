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
import streamAdapters from './adapters';
/** @ignore */
export const ITERATOR_DONE = Object.freeze({ done: true, value: void (0) });
/** @ignore */
export class ArrowJSON {
    // @ts-ignore
    constructor(_json) {
        this._json = _json;
    }
    get schema() { return this._json['schema']; }
    get batches() { return (this._json['batches'] || []); }
    get dictionaries() { return (this._json['dictionaries'] || []); }
}
/** @ignore */
export class ReadableInterop {
    tee() {
        return this._getReadableDOMStream().tee();
    }
    pipe(writable, options) {
        return this._getReadableNodeStream().pipe(writable, options);
    }
    pipeTo(writable, options) { return this._getReadableDOMStream().pipeTo(writable, options); }
    pipeThrough(duplex, options) {
        return this._getReadableDOMStream().pipeThrough(duplex, options);
    }
    _getReadableDOMStream() {
        return this._readableDOMStream || (this._readableDOMStream = this.toReadableDOMStream());
    }
    _getReadableNodeStream() {
        return this._readableNodeStream || (this._readableNodeStream = this.toReadableNodeStream());
    }
}
/** @ignore */
export class AsyncQueue extends ReadableInterop {
    constructor() {
        super();
        this._values = [];
        this.resolvers = [];
        this._closedPromise = new Promise((r) => this._closedPromiseResolve = r);
    }
    get closed() { return this._closedPromise; }
    async cancel(reason) { await this.return(reason); }
    write(value) {
        if (this._ensureOpen()) {
            this.resolvers.length <= 0
                ? (this._values.push(value))
                : (this.resolvers.shift().resolve({ done: false, value }));
        }
    }
    abort(value) {
        if (this._closedPromiseResolve) {
            this.resolvers.length <= 0
                ? (this._error = { error: value })
                : (this.resolvers.shift().reject({ done: true, value }));
        }
    }
    close() {
        if (this._closedPromiseResolve) {
            const { resolvers } = this;
            while (resolvers.length > 0) {
                resolvers.shift().resolve(ITERATOR_DONE);
            }
            this._closedPromiseResolve();
            this._closedPromiseResolve = undefined;
        }
    }
    [Symbol.asyncIterator]() { return this; }
    toReadableDOMStream(options) {
        return streamAdapters.toReadableDOMStream((this._closedPromiseResolve || this._error)
            ? this
            : this._values, options);
    }
    toReadableNodeStream(options) {
        return streamAdapters.toReadableNodeStream((this._closedPromiseResolve || this._error)
            ? this
            : this._values, options);
    }
    async throw(_) { await this.abort(_); return ITERATOR_DONE; }
    async return(_) { await this.close(); return ITERATOR_DONE; }
    async read(size) { return (await this.next(size, 'read')).value; }
    async peek(size) { return (await this.next(size, 'peek')).value; }
    next(..._args) {
        if (this._values.length > 0) {
            return Promise.resolve({ done: false, value: this._values.shift() });
        }
        else if (this._error) {
            return Promise.reject({ done: true, value: this._error.error });
        }
        else if (!this._closedPromiseResolve) {
            return Promise.resolve(ITERATOR_DONE);
        }
        else {
            return new Promise((resolve, reject) => {
                this.resolvers.push({ resolve, reject });
            });
        }
    }
    _ensureOpen() {
        if (this._closedPromiseResolve) {
            return true;
        }
        throw new Error(`${this} is closed`);
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFDLENBQUM7SUFDN0csSUFBSSxDQUFDLEdBQUcsS0FBWTtRQUN2QixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUN6QixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRyxFQUFTLENBQUMsQ0FBQztTQUNoRjthQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNwQixPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7U0FDbkU7YUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFO1lBQ3BDLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztTQUN6QzthQUFNO1lBQ0gsT0FBTyxJQUFJLE9BQU8sQ0FBNEIsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQzlELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDN0MsQ0FBQyxDQUFDLENBQUM7U0FDTjtJQUNMLENBQUM7SUFFUyxXQUFXO1FBQ2pCLElBQUksSUFBSSxDQUFDLHFCQUFxQixFQUFFO1lBQzVCLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7UUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLEdBQUcsSUFBSSxZQUFZLENBQUMsQ0FBQztJQUN6QyxDQUFDO0NBQ0oiLCJmaWxlIjoiaW8vaW50ZXJmYWNlcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgc3RyZWFtQWRhcHRlcnMgZnJvbSAnLi9hZGFwdGVycyc7XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY29uc3QgSVRFUkFUT1JfRE9ORTogYW55ID0gT2JqZWN0LmZyZWV6ZSh7IGRvbmU6IHRydWUsIHZhbHVlOiB2b2lkICgwKSB9KTtcblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCB0eXBlIEZpbGVIYW5kbGUgPSBpbXBvcnQoJ2ZzJykucHJvbWlzZXMuRmlsZUhhbmRsZTtcbi8qKiBAaWdub3JlICovXG5leHBvcnQgdHlwZSBBcnJvd0pTT05MaWtlID0geyBzY2hlbWE6IGFueTsgYmF0Y2hlcz86IGFueVtdOyBkaWN0aW9uYXJpZXM/OiBhbnlbXTsgfTtcbi8qKiBAaWdub3JlICovXG5leHBvcnQgdHlwZSBSZWFkYWJsZURPTVN0cmVhbU9wdGlvbnMgPSB7IHR5cGU6ICdieXRlcycgfCB1bmRlZmluZWQsIGF1dG9BbGxvY2F0ZUNodW5rU2l6ZT86IG51bWJlciwgaGlnaFdhdGVyTWFyaz86IG51bWJlciB9O1xuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIEFycm93SlNPTiB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgX2pzb246IEFycm93SlNPTkxpa2UpIHt9XG4gICAgcHVibGljIGdldCBzY2hlbWEoKTogYW55IHsgcmV0dXJuIHRoaXMuX2pzb25bJ3NjaGVtYSddOyB9XG4gICAgcHVibGljIGdldCBiYXRjaGVzKCk6IGFueVtdIHsgcmV0dXJuICh0aGlzLl9qc29uWydiYXRjaGVzJ10gfHwgW10pIGFzIGFueVtdOyB9XG4gICAgcHVibGljIGdldCBkaWN0aW9uYXJpZXMoKTogYW55W10geyByZXR1cm4gKHRoaXMuX2pzb25bJ2RpY3Rpb25hcmllcyddIHx8IFtdKSBhcyBhbnlbXTsgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGludGVyZmFjZSBSZWFkYWJsZTxUPiB7XG5cbiAgICByZWFkb25seSBjbG9zZWQ6IFByb21pc2U8dm9pZD47XG4gICAgY2FuY2VsKHJlYXNvbj86IGFueSk6IFByb21pc2U8dm9pZD47XG5cbiAgICByZWFkKHNpemU/OiBudW1iZXIgfCBudWxsKTogUHJvbWlzZTxUIHwgbnVsbD47XG4gICAgcGVlayhzaXplPzogbnVtYmVyIHwgbnVsbCk6IFByb21pc2U8VCB8IG51bGw+O1xuICAgIHRocm93KHZhbHVlPzogYW55KTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxhbnk+PjtcbiAgICByZXR1cm4odmFsdWU/OiBhbnkpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+O1xuICAgIG5leHQoc2l6ZT86IG51bWJlciB8IG51bGwpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PFQ+Pjtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBpbnRlcmZhY2UgV3JpdGFibGU8VD4ge1xuICAgIHJlYWRvbmx5IGNsb3NlZDogUHJvbWlzZTx2b2lkPjtcbiAgICBjbG9zZSgpOiB2b2lkO1xuICAgIHdyaXRlKGNodW5rOiBUKTogdm9pZDtcbiAgICBhYm9ydChyZWFzb24/OiBhbnkpOiB2b2lkO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGludGVyZmFjZSBSZWFkYWJsZVdyaXRhYmxlPFRSZWFkYWJsZSwgVFdyaXRhYmxlPiBleHRlbmRzIFJlYWRhYmxlPFRSZWFkYWJsZT4sIFdyaXRhYmxlPFRXcml0YWJsZT4ge1xuICAgIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFRSZWFkYWJsZT47XG4gICAgdG9SZWFkYWJsZURPTVN0cmVhbShvcHRpb25zPzogUmVhZGFibGVET01TdHJlYW1PcHRpb25zKTogUmVhZGFibGVTdHJlYW08VFJlYWRhYmxlPjtcbiAgICB0b1JlYWRhYmxlTm9kZVN0cmVhbShvcHRpb25zPzogaW1wb3J0KCdzdHJlYW0nKS5SZWFkYWJsZU9wdGlvbnMpOiBpbXBvcnQoJ3N0cmVhbScpLlJlYWRhYmxlO1xufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFJlYWRhYmxlSW50ZXJvcDxUPiB7XG5cbiAgICBwdWJsaWMgYWJzdHJhY3QgdG9SZWFkYWJsZURPTVN0cmVhbShvcHRpb25zPzogUmVhZGFibGVET01TdHJlYW1PcHRpb25zKTogUmVhZGFibGVTdHJlYW08VD47XG4gICAgcHVibGljIGFic3RyYWN0IHRvUmVhZGFibGVOb2RlU3RyZWFtKG9wdGlvbnM/OiBpbXBvcnQoJ3N0cmVhbScpLlJlYWRhYmxlT3B0aW9ucyk6IGltcG9ydCgnc3RyZWFtJykuUmVhZGFibGU7XG5cbiAgICBwdWJsaWMgdGVlKCk6IFtSZWFkYWJsZVN0cmVhbTxUPiwgUmVhZGFibGVTdHJlYW08VD5dIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2dldFJlYWRhYmxlRE9NU3RyZWFtKCkudGVlKCk7XG4gICAgfVxuICAgIHB1YmxpYyBwaXBlPFIgZXh0ZW5kcyBOb2RlSlMuV3JpdGFibGVTdHJlYW0+KHdyaXRhYmxlOiBSLCBvcHRpb25zPzogeyBlbmQ/OiBib29sZWFuOyB9KSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9nZXRSZWFkYWJsZU5vZGVTdHJlYW0oKS5waXBlKHdyaXRhYmxlLCBvcHRpb25zKTtcbiAgICB9XG4gICAgcHVibGljIHBpcGVUbyh3cml0YWJsZTogV3JpdGFibGVTdHJlYW08VD4sIG9wdGlvbnM/OiBQaXBlT3B0aW9ucykgeyByZXR1cm4gdGhpcy5fZ2V0UmVhZGFibGVET01TdHJlYW0oKS5waXBlVG8od3JpdGFibGUsIG9wdGlvbnMpOyB9XG4gICAgcHVibGljIHBpcGVUaHJvdWdoPFIgZXh0ZW5kcyBSZWFkYWJsZVN0cmVhbTxhbnk+PihkdXBsZXg6IHsgd3JpdGFibGU6IFdyaXRhYmxlU3RyZWFtPFQ+LCByZWFkYWJsZTogUiB9LCBvcHRpb25zPzogUGlwZU9wdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2dldFJlYWRhYmxlRE9NU3RyZWFtKCkucGlwZVRocm91Z2goZHVwbGV4LCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9yZWFkYWJsZURPTVN0cmVhbT86IFJlYWRhYmxlU3RyZWFtPFQ+O1xuICAgIHByaXZhdGUgX2dldFJlYWRhYmxlRE9NU3RyZWFtKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcmVhZGFibGVET01TdHJlYW0gfHwgKHRoaXMuX3JlYWRhYmxlRE9NU3RyZWFtID0gdGhpcy50b1JlYWRhYmxlRE9NU3RyZWFtKCkpO1xuICAgIH1cblxuICAgIHByaXZhdGUgX3JlYWRhYmxlTm9kZVN0cmVhbT86IGltcG9ydCgnc3RyZWFtJykuUmVhZGFibGU7XG4gICAgcHJpdmF0ZSBfZ2V0UmVhZGFibGVOb2RlU3RyZWFtKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcmVhZGFibGVOb2RlU3RyZWFtIHx8ICh0aGlzLl9yZWFkYWJsZU5vZGVTdHJlYW0gPSB0aGlzLnRvUmVhZGFibGVOb2RlU3RyZWFtKCkpO1xuICAgIH1cbn1cblxuLyoqIEBpZ25vcmUgKi9cbnR5cGUgUmVzb2x1dGlvbjxUPiA9IHsgcmVzb2x2ZTogKHZhbHVlPzogVCB8IFByb21pc2VMaWtlPFQ+KSA9PiB2b2lkOyByZWplY3Q6IChyZWFzb24/OiBhbnkpID0+IHZvaWQ7IH07XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY2xhc3MgQXN5bmNRdWV1ZTxUUmVhZGFibGUgPSBVaW50OEFycmF5LCBUV3JpdGFibGUgPSBUUmVhZGFibGU+IGV4dGVuZHMgUmVhZGFibGVJbnRlcm9wPFRSZWFkYWJsZT5cbiAgICBpbXBsZW1lbnRzIEFzeW5jSXRlcmFibGVJdGVyYXRvcjxUUmVhZGFibGU+LCBSZWFkYWJsZVdyaXRhYmxlPFRSZWFkYWJsZSwgVFdyaXRhYmxlPiB7XG5cbiAgICBwcm90ZWN0ZWQgX3ZhbHVlczogVFdyaXRhYmxlW10gPSBbXTtcbiAgICBwcm90ZWN0ZWQgX2Vycm9yPzogeyBlcnJvcjogYW55OyB9O1xuICAgIHByb3RlY3RlZCBfY2xvc2VkUHJvbWlzZTogUHJvbWlzZTx2b2lkPjtcbiAgICBwcm90ZWN0ZWQgX2Nsb3NlZFByb21pc2VSZXNvbHZlPzogKHZhbHVlPzogYW55KSA9PiB2b2lkO1xuICAgIHByb3RlY3RlZCByZXNvbHZlcnM6IFJlc29sdXRpb248SXRlcmF0b3JSZXN1bHQ8VFJlYWRhYmxlPj5bXSA9IFtdO1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuX2Nsb3NlZFByb21pc2UgPSBuZXcgUHJvbWlzZSgocikgPT4gdGhpcy5fY2xvc2VkUHJvbWlzZVJlc29sdmUgPSByKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0IGNsb3NlZCgpOiBQcm9taXNlPHZvaWQ+IHsgcmV0dXJuIHRoaXMuX2Nsb3NlZFByb21pc2U7IH1cbiAgICBwdWJsaWMgYXN5bmMgY2FuY2VsKHJlYXNvbj86IGFueSkgeyBhd2FpdCB0aGlzLnJldHVybihyZWFzb24pOyB9XG4gICAgcHVibGljIHdyaXRlKHZhbHVlOiBUV3JpdGFibGUpIHtcbiAgICAgICAgaWYgKHRoaXMuX2Vuc3VyZU9wZW4oKSkge1xuICAgICAgICAgICAgdGhpcy5yZXNvbHZlcnMubGVuZ3RoIDw9IDBcbiAgICAgICAgICAgICAgICA/ICh0aGlzLl92YWx1ZXMucHVzaCh2YWx1ZSkpXG4gICAgICAgICAgICAgICAgOiAodGhpcy5yZXNvbHZlcnMuc2hpZnQoKSEucmVzb2x2ZSh7IGRvbmU6IGZhbHNlLCB2YWx1ZSB9IGFzIGFueSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHB1YmxpYyBhYm9ydCh2YWx1ZT86IGFueSkge1xuICAgICAgICBpZiAodGhpcy5fY2xvc2VkUHJvbWlzZVJlc29sdmUpIHtcbiAgICAgICAgICAgIHRoaXMucmVzb2x2ZXJzLmxlbmd0aCA8PSAwXG4gICAgICAgICAgICAgICAgPyAodGhpcy5fZXJyb3IgPSB7IGVycm9yOiB2YWx1ZSB9KVxuICAgICAgICAgICAgICAgIDogKHRoaXMucmVzb2x2ZXJzLnNoaWZ0KCkhLnJlamVjdCh7IGRvbmU6IHRydWUsIHZhbHVlIH0pKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBwdWJsaWMgY2xvc2UoKSB7XG4gICAgICAgIGlmICh0aGlzLl9jbG9zZWRQcm9taXNlUmVzb2x2ZSkge1xuICAgICAgICAgICAgY29uc3QgeyByZXNvbHZlcnMgfSA9IHRoaXM7XG4gICAgICAgICAgICB3aGlsZSAocmVzb2x2ZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlcnMuc2hpZnQoKSEucmVzb2x2ZShJVEVSQVRPUl9ET05FKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2Nsb3NlZFByb21pc2VSZXNvbHZlKCk7XG4gICAgICAgICAgICB0aGlzLl9jbG9zZWRQcm9taXNlUmVzb2x2ZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCkgeyByZXR1cm4gdGhpczsgfVxuICAgIHB1YmxpYyB0b1JlYWRhYmxlRE9NU3RyZWFtKG9wdGlvbnM/OiBSZWFkYWJsZURPTVN0cmVhbU9wdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuIHN0cmVhbUFkYXB0ZXJzLnRvUmVhZGFibGVET01TdHJlYW0oXG4gICAgICAgICAgICAodGhpcy5fY2xvc2VkUHJvbWlzZVJlc29sdmUgfHwgdGhpcy5fZXJyb3IpXG4gICAgICAgICAgICAgICAgPyAodGhpcyBhcyBBc3luY0l0ZXJhYmxlPFRSZWFkYWJsZT4pXG4gICAgICAgICAgICAgICAgOiAodGhpcy5fdmFsdWVzIGFzIGFueSkgYXMgSXRlcmFibGU8VFJlYWRhYmxlPixcbiAgICAgICAgICAgIG9wdGlvbnMpO1xuICAgIH1cbiAgICBwdWJsaWMgdG9SZWFkYWJsZU5vZGVTdHJlYW0ob3B0aW9ucz86IGltcG9ydCgnc3RyZWFtJykuUmVhZGFibGVPcHRpb25zKSB7XG4gICAgICAgIHJldHVybiBzdHJlYW1BZGFwdGVycy50b1JlYWRhYmxlTm9kZVN0cmVhbShcbiAgICAgICAgICAgICh0aGlzLl9jbG9zZWRQcm9taXNlUmVzb2x2ZSB8fCB0aGlzLl9lcnJvcilcbiAgICAgICAgICAgICAgICA/ICh0aGlzIGFzIEFzeW5jSXRlcmFibGU8VFJlYWRhYmxlPilcbiAgICAgICAgICAgICAgICA6ICh0aGlzLl92YWx1ZXMgYXMgYW55KSBhcyBJdGVyYWJsZTxUUmVhZGFibGU+LFxuICAgICAgICAgICAgb3B0aW9ucyk7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyB0aHJvdyhfPzogYW55KSB7IGF3YWl0IHRoaXMuYWJvcnQoXyk7IHJldHVybiBJVEVSQVRPUl9ET05FOyB9XG4gICAgcHVibGljIGFzeW5jIHJldHVybihfPzogYW55KSB7IGF3YWl0IHRoaXMuY2xvc2UoKTsgcmV0dXJuIElURVJBVE9SX0RPTkU7IH1cblxuICAgIHB1YmxpYyBhc3luYyByZWFkKHNpemU/OiBudW1iZXIgfCBudWxsKTogUHJvbWlzZTxUUmVhZGFibGUgfCBudWxsPiB7IHJldHVybiAoYXdhaXQgdGhpcy5uZXh0KHNpemUsICdyZWFkJykpLnZhbHVlOyB9XG4gICAgcHVibGljIGFzeW5jIHBlZWsoc2l6ZT86IG51bWJlciB8IG51bGwpOiBQcm9taXNlPFRSZWFkYWJsZSB8IG51bGw+IHsgcmV0dXJuIChhd2FpdCB0aGlzLm5leHQoc2l6ZSwgJ3BlZWsnKSkudmFsdWU7IH1cbiAgICBwdWJsaWMgbmV4dCguLi5fYXJnczogYW55W10pOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PFRSZWFkYWJsZT4+IHtcbiAgICAgICAgaWYgKHRoaXMuX3ZhbHVlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHsgZG9uZTogZmFsc2UsIHZhbHVlOiB0aGlzLl92YWx1ZXMuc2hpZnQoKSEgfSBhcyBhbnkpO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2Vycm9yKSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoeyBkb25lOiB0cnVlLCB2YWx1ZTogdGhpcy5fZXJyb3IuZXJyb3IgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuX2Nsb3NlZFByb21pc2VSZXNvbHZlKSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKElURVJBVE9SX0RPTkUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PFRSZWFkYWJsZT4+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlc29sdmVycy5wdXNoKHsgcmVzb2x2ZSwgcmVqZWN0IH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX2Vuc3VyZU9wZW4oKSB7XG4gICAgICAgIGlmICh0aGlzLl9jbG9zZWRQcm9taXNlUmVzb2x2ZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3RoaXN9IGlzIGNsb3NlZGApO1xuICAgIH1cbn1cbiJdfQ==

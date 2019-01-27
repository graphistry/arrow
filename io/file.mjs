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
import { ByteStream, AsyncByteStream } from './stream';
import { toUint8Array } from '../util/buffer';
/** @ignore */
export class RandomAccessFile extends ByteStream {
    constructor(buffer, byteLength) {
        super();
        this.position = 0;
        this.buffer = toUint8Array(buffer);
        this.size = typeof byteLength === 'undefined' ? this.buffer.byteLength : byteLength;
    }
    readInt32(position) {
        const { buffer, byteOffset } = this.readAt(position, 4);
        return new DataView(buffer, byteOffset).getInt32(0, true);
    }
    seek(position) {
        this.position = Math.min(position, this.size);
        return position < this.size;
    }
    read(nBytes) {
        const { buffer, size, position } = this;
        if (buffer && position < size) {
            if (typeof nBytes !== 'number') {
                nBytes = Infinity;
            }
            this.position = Math.min(size, position + Math.min(size - position, nBytes));
            return buffer.subarray(position, this.position);
        }
        return null;
    }
    readAt(position, nBytes) {
        const buf = this.buffer;
        const end = Math.min(this.size, position + nBytes);
        return buf ? buf.subarray(position, end) : new Uint8Array(nBytes);
    }
    close() { this.buffer && (this.buffer = null); }
    throw(value) { this.close(); return { done: true, value }; }
    return(value) { this.close(); return { done: true, value }; }
}
/** @ignore */
export class AsyncRandomAccessFile extends AsyncByteStream {
    constructor(file, byteLength) {
        super();
        this.position = 0;
        this._handle = file;
        if (typeof byteLength === 'number') {
            this.size = byteLength;
        }
        else {
            this._pending = (async () => {
                delete this._pending;
                this.size = (await file.stat()).size;
            })();
        }
    }
    async readInt32(position) {
        const { buffer, byteOffset } = await this.readAt(position, 4);
        return new DataView(buffer, byteOffset).getInt32(0, true);
    }
    async seek(position) {
        this._pending && await this._pending;
        this.position = Math.min(position, this.size);
        return position < this.size;
    }
    async read(nBytes) {
        this._pending && await this._pending;
        const { _handle: file, size, position } = this;
        if (file && position < size) {
            if (typeof nBytes !== 'number') {
                nBytes = Infinity;
            }
            let pos = position, offset = 0, bytesRead = 0;
            let end = Math.min(size, pos + Math.min(size - pos, nBytes));
            let buffer = new Uint8Array(Math.max(0, (this.position = end) - pos));
            while ((pos += bytesRead) < end && (offset += bytesRead) < buffer.byteLength) {
                ({ bytesRead } = await file.read(buffer, offset, buffer.byteLength - offset, pos));
            }
            return buffer;
        }
        return null;
    }
    async readAt(position, nBytes) {
        this._pending && await this._pending;
        const { _handle: file, size } = this;
        if (file && (position + nBytes) < size) {
            const end = Math.min(size, position + nBytes);
            const buffer = new Uint8Array(end - position);
            return (await file.read(buffer, 0, nBytes, position)).buffer;
        }
        return new Uint8Array(nBytes);
    }
    async close() { const f = this._handle; this._handle = null; f && await f.close(); }
    async throw(value) { await this.close(); return { done: true, value }; }
    async return(value) { await this.close(); return { done: true, value }; }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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SSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDOUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFXLElBQUksTUFBTSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7Q0FDekYiLCJmaWxlIjoiaW8vZmlsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBGaWxlSGFuZGxlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEJ5dGVTdHJlYW0sIEFzeW5jQnl0ZVN0cmVhbSB9IGZyb20gJy4vc3RyZWFtJztcbmltcG9ydCB7IEFycmF5QnVmZmVyVmlld0lucHV0LCB0b1VpbnQ4QXJyYXkgfSBmcm9tICcuLi91dGlsL2J1ZmZlcic7XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY2xhc3MgUmFuZG9tQWNjZXNzRmlsZSBleHRlbmRzIEJ5dGVTdHJlYW0ge1xuICAgIHB1YmxpYyBzaXplOiBudW1iZXI7XG4gICAgcHVibGljIHBvc2l0aW9uOiBudW1iZXIgPSAwO1xuICAgIHByb3RlY3RlZCBidWZmZXI6IFVpbnQ4QXJyYXkgfCBudWxsO1xuICAgIGNvbnN0cnVjdG9yKGJ1ZmZlcjogQXJyYXlCdWZmZXJWaWV3SW5wdXQsIGJ5dGVMZW5ndGg/OiBudW1iZXIpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5idWZmZXIgPSB0b1VpbnQ4QXJyYXkoYnVmZmVyKTtcbiAgICAgICAgdGhpcy5zaXplID0gdHlwZW9mIGJ5dGVMZW5ndGggPT09ICd1bmRlZmluZWQnID8gdGhpcy5idWZmZXIuYnl0ZUxlbmd0aCA6IGJ5dGVMZW5ndGg7XG4gICAgfVxuICAgIHB1YmxpYyByZWFkSW50MzIocG9zaXRpb246IG51bWJlcikge1xuICAgICAgICBjb25zdCB7IGJ1ZmZlciwgYnl0ZU9mZnNldCB9ID0gdGhpcy5yZWFkQXQocG9zaXRpb24sIDQpO1xuICAgICAgICByZXR1cm4gbmV3IERhdGFWaWV3KGJ1ZmZlciwgYnl0ZU9mZnNldCkuZ2V0SW50MzIoMCwgdHJ1ZSk7XG4gICAgfVxuICAgIHB1YmxpYyBzZWVrKHBvc2l0aW9uOiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5wb3NpdGlvbiA9IE1hdGgubWluKHBvc2l0aW9uLCB0aGlzLnNpemUpO1xuICAgICAgICByZXR1cm4gcG9zaXRpb24gPCB0aGlzLnNpemU7XG4gICAgfVxuICAgIHB1YmxpYyByZWFkKG5CeXRlcz86IG51bWJlciB8IG51bGwpIHtcbiAgICAgICAgY29uc3QgeyBidWZmZXIsIHNpemUsIHBvc2l0aW9uIH0gPSB0aGlzO1xuICAgICAgICBpZiAoYnVmZmVyICYmIHBvc2l0aW9uIDwgc2l6ZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBuQnl0ZXMgIT09ICdudW1iZXInKSB7IG5CeXRlcyA9IEluZmluaXR5OyB9XG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uID0gTWF0aC5taW4oc2l6ZSxcbiAgICAgICAgICAgICAgICAgcG9zaXRpb24gKyBNYXRoLm1pbihzaXplIC0gcG9zaXRpb24sIG5CeXRlcykpO1xuICAgICAgICAgICAgcmV0dXJuIGJ1ZmZlci5zdWJhcnJheShwb3NpdGlvbiwgdGhpcy5wb3NpdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHB1YmxpYyByZWFkQXQocG9zaXRpb246IG51bWJlciwgbkJ5dGVzOiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgYnVmID0gdGhpcy5idWZmZXI7XG4gICAgICAgIGNvbnN0IGVuZCA9IE1hdGgubWluKHRoaXMuc2l6ZSwgcG9zaXRpb24gKyBuQnl0ZXMpO1xuICAgICAgICByZXR1cm4gYnVmID8gYnVmLnN1YmFycmF5KHBvc2l0aW9uLCBlbmQpIDogbmV3IFVpbnQ4QXJyYXkobkJ5dGVzKTtcbiAgICB9XG4gICAgcHVibGljIGNsb3NlKCkgeyB0aGlzLmJ1ZmZlciAmJiAodGhpcy5idWZmZXIgPSBudWxsKTsgfVxuICAgIHB1YmxpYyB0aHJvdyh2YWx1ZT86IGFueSkgeyB0aGlzLmNsb3NlKCk7IHJldHVybiB7IGRvbmU6IHRydWUsIHZhbHVlIH07IH1cbiAgICBwdWJsaWMgcmV0dXJuKHZhbHVlPzogYW55KSB7IHRoaXMuY2xvc2UoKTsgcmV0dXJuIHsgZG9uZTogdHJ1ZSwgdmFsdWUgfTsgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIEFzeW5jUmFuZG9tQWNjZXNzRmlsZSBleHRlbmRzIEFzeW5jQnl0ZVN0cmVhbSB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyBzaXplOiBudW1iZXI7XG4gICAgcHVibGljIHBvc2l0aW9uOiBudW1iZXIgPSAwO1xuICAgIHB1YmxpYyBfcGVuZGluZz86IFByb21pc2U8dm9pZD47XG4gICAgcHJvdGVjdGVkIF9oYW5kbGU6IEZpbGVIYW5kbGUgfCBudWxsO1xuICAgIGNvbnN0cnVjdG9yKGZpbGU6IEZpbGVIYW5kbGUsIGJ5dGVMZW5ndGg/OiBudW1iZXIpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5faGFuZGxlID0gZmlsZTtcbiAgICAgICAgaWYgKHR5cGVvZiBieXRlTGVuZ3RoID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgdGhpcy5zaXplID0gYnl0ZUxlbmd0aDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3BlbmRpbmcgPSAoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9wZW5kaW5nO1xuICAgICAgICAgICAgICAgIHRoaXMuc2l6ZSA9IChhd2FpdCBmaWxlLnN0YXQoKSkuc2l6ZTtcbiAgICAgICAgICAgIH0pKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcHVibGljIGFzeW5jIHJlYWRJbnQzMihwb3NpdGlvbjogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IHsgYnVmZmVyLCBieXRlT2Zmc2V0IH0gPSBhd2FpdCB0aGlzLnJlYWRBdChwb3NpdGlvbiwgNCk7XG4gICAgICAgIHJldHVybiBuZXcgRGF0YVZpZXcoYnVmZmVyLCBieXRlT2Zmc2V0KS5nZXRJbnQzMigwLCB0cnVlKTtcbiAgICB9XG4gICAgcHVibGljIGFzeW5jIHNlZWsocG9zaXRpb246IG51bWJlcikge1xuICAgICAgICB0aGlzLl9wZW5kaW5nICYmIGF3YWl0IHRoaXMuX3BlbmRpbmc7XG4gICAgICAgIHRoaXMucG9zaXRpb24gPSBNYXRoLm1pbihwb3NpdGlvbiwgdGhpcy5zaXplKTtcbiAgICAgICAgcmV0dXJuIHBvc2l0aW9uIDwgdGhpcy5zaXplO1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgcmVhZChuQnl0ZXM/OiBudW1iZXIgfCBudWxsKSB7XG4gICAgICAgIHRoaXMuX3BlbmRpbmcgJiYgYXdhaXQgdGhpcy5fcGVuZGluZztcbiAgICAgICAgY29uc3QgeyBfaGFuZGxlOiBmaWxlLCBzaXplLCBwb3NpdGlvbiB9ID0gdGhpcztcbiAgICAgICAgaWYgKGZpbGUgJiYgcG9zaXRpb24gPCBzaXplKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG5CeXRlcyAhPT0gJ251bWJlcicpIHsgbkJ5dGVzID0gSW5maW5pdHk7IH1cbiAgICAgICAgICAgIGxldCBwb3MgPSBwb3NpdGlvbiwgb2Zmc2V0ID0gMCwgYnl0ZXNSZWFkID0gMDtcbiAgICAgICAgICAgIGxldCBlbmQgPSBNYXRoLm1pbihzaXplLCBwb3MgKyBNYXRoLm1pbihzaXplIC0gcG9zLCBuQnl0ZXMpKTtcbiAgICAgICAgICAgIGxldCBidWZmZXIgPSBuZXcgVWludDhBcnJheShNYXRoLm1heCgwLCAodGhpcy5wb3NpdGlvbiA9IGVuZCkgLSBwb3MpKTtcbiAgICAgICAgICAgIHdoaWxlICgocG9zICs9IGJ5dGVzUmVhZCkgPCBlbmQgJiYgKG9mZnNldCArPSBieXRlc1JlYWQpIDwgYnVmZmVyLmJ5dGVMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAoeyBieXRlc1JlYWQgfSA9IGF3YWl0IGZpbGUucmVhZChidWZmZXIsIG9mZnNldCwgYnVmZmVyLmJ5dGVMZW5ndGggLSBvZmZzZXQsIHBvcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcHVibGljIGFzeW5jIHJlYWRBdChwb3NpdGlvbjogbnVtYmVyLCBuQnl0ZXM6IG51bWJlcikge1xuICAgICAgICB0aGlzLl9wZW5kaW5nICYmIGF3YWl0IHRoaXMuX3BlbmRpbmc7XG4gICAgICAgIGNvbnN0IHsgX2hhbmRsZTogZmlsZSwgc2l6ZSB9ID0gdGhpcztcbiAgICAgICAgaWYgKGZpbGUgJiYgKHBvc2l0aW9uICsgbkJ5dGVzKSA8IHNpemUpIHtcbiAgICAgICAgICAgIGNvbnN0IGVuZCA9IE1hdGgubWluKHNpemUsIHBvc2l0aW9uICsgbkJ5dGVzKTtcbiAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KGVuZCAtIHBvc2l0aW9uKTtcbiAgICAgICAgICAgIHJldHVybiAoYXdhaXQgZmlsZS5yZWFkKGJ1ZmZlciwgMCwgbkJ5dGVzLCBwb3NpdGlvbikpLmJ1ZmZlcjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkobkJ5dGVzKTtcbiAgICB9XG4gICAgcHVibGljIGFzeW5jIGNsb3NlKCkgeyBjb25zdCBmID0gdGhpcy5faGFuZGxlOyB0aGlzLl9oYW5kbGUgPSBudWxsOyBmICYmIGF3YWl0IGYuY2xvc2UoKTsgfVxuICAgIHB1YmxpYyBhc3luYyB0aHJvdyh2YWx1ZT86IGFueSkgeyBhd2FpdCB0aGlzLmNsb3NlKCk7IHJldHVybiB7IGRvbmU6IHRydWUsIHZhbHVlIH07IH1cbiAgICBwdWJsaWMgYXN5bmMgcmV0dXJuKHZhbHVlPzogYW55KSB7IGF3YWl0IHRoaXMuY2xvc2UoKTsgcmV0dXJuIHsgZG9uZTogdHJ1ZSwgdmFsdWUgfTsgfVxufVxuIl19

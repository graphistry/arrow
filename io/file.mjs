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
/** @ignore */
export class RandomAccessFile extends ByteStream {
    constructor(buffer, byteLength = buffer.byteLength) {
        super();
        this.position = 0;
        this.buffer = buffer;
        this.size = byteLength;
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
        this.file = file;
        if (typeof byteLength === 'number') {
            this.size = byteLength;
        }
        else {
            this._pendingSize = (async () => {
                delete this._pendingSize;
                this.size = (await file.stat()).size;
            })();
        }
    }
    async readInt32(position) {
        const { buffer, byteOffset } = await this.readAt(position, 4);
        return new DataView(buffer, byteOffset).getInt32(0, true);
    }
    async seek(position) {
        this._pendingSize && await this._pendingSize;
        this.position = Math.min(position, this.size);
        return position < this.size;
    }
    async read(nBytes) {
        this._pendingSize && await this._pendingSize;
        const { file, size, position } = this;
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
        this._pendingSize && await this._pendingSize;
        const { file, size } = this;
        if (file && (position + nBytes) < size) {
            const end = Math.min(size, position + nBytes);
            const buffer = new Uint8Array(end - position);
            return (await file.read(buffer, 0, nBytes, position)).buffer;
        }
        return new Uint8Array(nBytes);
    }
    async close() { const f = this.file; this.file = null; f && await f.close(); }
    async throw(value) { await this.close(); return { done: true, value }; }
    async return(value) { await this.close(); return { done: true, value }; }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7Q0FDekYiLCJmaWxlIjoiaW8vZmlsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyBGaWxlSGFuZGxlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEJ5dGVTdHJlYW0sIEFzeW5jQnl0ZVN0cmVhbSB9IGZyb20gJy4vc3RyZWFtJztcblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBjbGFzcyBSYW5kb21BY2Nlc3NGaWxlIGV4dGVuZHMgQnl0ZVN0cmVhbSB7XG4gICAgcHVibGljIHNpemU6IG51bWJlcjtcbiAgICBwdWJsaWMgcG9zaXRpb246IG51bWJlciA9IDA7XG4gICAgcHJvdGVjdGVkIGJ1ZmZlcjogVWludDhBcnJheSB8IG51bGw7XG4gICAgY29uc3RydWN0b3IoYnVmZmVyOiBVaW50OEFycmF5LCBieXRlTGVuZ3RoID0gYnVmZmVyLmJ5dGVMZW5ndGgpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5idWZmZXIgPSBidWZmZXI7XG4gICAgICAgIHRoaXMuc2l6ZSA9IGJ5dGVMZW5ndGg7XG4gICAgfVxuICAgIHB1YmxpYyByZWFkSW50MzIocG9zaXRpb246IG51bWJlcikge1xuICAgICAgICBjb25zdCB7IGJ1ZmZlciwgYnl0ZU9mZnNldCB9ID0gdGhpcy5yZWFkQXQocG9zaXRpb24sIDQpO1xuICAgICAgICByZXR1cm4gbmV3IERhdGFWaWV3KGJ1ZmZlciwgYnl0ZU9mZnNldCkuZ2V0SW50MzIoMCwgdHJ1ZSk7XG4gICAgfVxuICAgIHB1YmxpYyBzZWVrKHBvc2l0aW9uOiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5wb3NpdGlvbiA9IE1hdGgubWluKHBvc2l0aW9uLCB0aGlzLnNpemUpO1xuICAgICAgICByZXR1cm4gcG9zaXRpb24gPCB0aGlzLnNpemU7XG4gICAgfVxuICAgIHB1YmxpYyByZWFkKG5CeXRlcz86IG51bWJlciB8IG51bGwpIHtcbiAgICAgICAgY29uc3QgeyBidWZmZXIsIHNpemUsIHBvc2l0aW9uIH0gPSB0aGlzO1xuICAgICAgICBpZiAoYnVmZmVyICYmIHBvc2l0aW9uIDwgc2l6ZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBuQnl0ZXMgIT09ICdudW1iZXInKSB7IG5CeXRlcyA9IEluZmluaXR5OyB9XG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uID0gTWF0aC5taW4oc2l6ZSxcbiAgICAgICAgICAgICAgICAgcG9zaXRpb24gKyBNYXRoLm1pbihzaXplIC0gcG9zaXRpb24sIG5CeXRlcykpO1xuICAgICAgICAgICAgcmV0dXJuIGJ1ZmZlci5zdWJhcnJheShwb3NpdGlvbiwgdGhpcy5wb3NpdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHB1YmxpYyByZWFkQXQocG9zaXRpb246IG51bWJlciwgbkJ5dGVzOiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgYnVmID0gdGhpcy5idWZmZXI7XG4gICAgICAgIGNvbnN0IGVuZCA9IE1hdGgubWluKHRoaXMuc2l6ZSwgcG9zaXRpb24gKyBuQnl0ZXMpO1xuICAgICAgICByZXR1cm4gYnVmID8gYnVmLnN1YmFycmF5KHBvc2l0aW9uLCBlbmQpIDogbmV3IFVpbnQ4QXJyYXkobkJ5dGVzKTtcbiAgICB9XG4gICAgcHVibGljIGNsb3NlKCkgeyB0aGlzLmJ1ZmZlciAmJiAodGhpcy5idWZmZXIgPSBudWxsKTsgfVxuICAgIHB1YmxpYyB0aHJvdyh2YWx1ZT86IGFueSkgeyB0aGlzLmNsb3NlKCk7IHJldHVybiB7IGRvbmU6IHRydWUsIHZhbHVlIH07IH1cbiAgICBwdWJsaWMgcmV0dXJuKHZhbHVlPzogYW55KSB7IHRoaXMuY2xvc2UoKTsgcmV0dXJuIHsgZG9uZTogdHJ1ZSwgdmFsdWUgfTsgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIEFzeW5jUmFuZG9tQWNjZXNzRmlsZSBleHRlbmRzIEFzeW5jQnl0ZVN0cmVhbSB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHB1YmxpYyBzaXplOiBudW1iZXI7XG4gICAgcHVibGljIHBvc2l0aW9uOiBudW1iZXIgPSAwO1xuICAgIHByb3RlY3RlZCBmaWxlOiBGaWxlSGFuZGxlIHwgbnVsbDtcbiAgICBwcm90ZWN0ZWQgX3BlbmRpbmdTaXplPzogUHJvbWlzZTx2b2lkPjtcbiAgICBjb25zdHJ1Y3RvcihmaWxlOiBGaWxlSGFuZGxlLCBieXRlTGVuZ3RoPzogbnVtYmVyKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuZmlsZSA9IGZpbGU7XG4gICAgICAgIGlmICh0eXBlb2YgYnl0ZUxlbmd0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIHRoaXMuc2l6ZSA9IGJ5dGVMZW5ndGg7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9wZW5kaW5nU2l6ZSA9IChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX3BlbmRpbmdTaXplO1xuICAgICAgICAgICAgICAgIHRoaXMuc2l6ZSA9IChhd2FpdCBmaWxlLnN0YXQoKSkuc2l6ZTtcbiAgICAgICAgICAgIH0pKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcHVibGljIGFzeW5jIHJlYWRJbnQzMihwb3NpdGlvbjogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IHsgYnVmZmVyLCBieXRlT2Zmc2V0IH0gPSBhd2FpdCB0aGlzLnJlYWRBdChwb3NpdGlvbiwgNCk7XG4gICAgICAgIHJldHVybiBuZXcgRGF0YVZpZXcoYnVmZmVyLCBieXRlT2Zmc2V0KS5nZXRJbnQzMigwLCB0cnVlKTtcbiAgICB9XG4gICAgcHVibGljIGFzeW5jIHNlZWsocG9zaXRpb246IG51bWJlcikge1xuICAgICAgICB0aGlzLl9wZW5kaW5nU2l6ZSAmJiBhd2FpdCB0aGlzLl9wZW5kaW5nU2l6ZTtcbiAgICAgICAgdGhpcy5wb3NpdGlvbiA9IE1hdGgubWluKHBvc2l0aW9uLCB0aGlzLnNpemUpO1xuICAgICAgICByZXR1cm4gcG9zaXRpb24gPCB0aGlzLnNpemU7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyByZWFkKG5CeXRlcz86IG51bWJlciB8IG51bGwpIHtcbiAgICAgICAgdGhpcy5fcGVuZGluZ1NpemUgJiYgYXdhaXQgdGhpcy5fcGVuZGluZ1NpemU7XG4gICAgICAgIGNvbnN0IHsgZmlsZSwgc2l6ZSwgcG9zaXRpb24gfSA9IHRoaXM7XG4gICAgICAgIGlmIChmaWxlICYmIHBvc2l0aW9uIDwgc2l6ZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBuQnl0ZXMgIT09ICdudW1iZXInKSB7IG5CeXRlcyA9IEluZmluaXR5OyB9XG4gICAgICAgICAgICBsZXQgcG9zID0gcG9zaXRpb24sIG9mZnNldCA9IDAsIGJ5dGVzUmVhZCA9IDA7XG4gICAgICAgICAgICBsZXQgZW5kID0gTWF0aC5taW4oc2l6ZSwgcG9zICsgTWF0aC5taW4oc2l6ZSAtIHBvcywgbkJ5dGVzKSk7XG4gICAgICAgICAgICBsZXQgYnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkoTWF0aC5tYXgoMCwgKHRoaXMucG9zaXRpb24gPSBlbmQpIC0gcG9zKSk7XG4gICAgICAgICAgICB3aGlsZSAoKHBvcyArPSBieXRlc1JlYWQpIDwgZW5kICYmIChvZmZzZXQgKz0gYnl0ZXNSZWFkKSA8IGJ1ZmZlci5ieXRlTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgKHsgYnl0ZXNSZWFkIH0gPSBhd2FpdCBmaWxlLnJlYWQoYnVmZmVyLCBvZmZzZXQsIGJ1ZmZlci5ieXRlTGVuZ3RoIC0gb2Zmc2V0LCBwb3MpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyByZWFkQXQocG9zaXRpb246IG51bWJlciwgbkJ5dGVzOiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5fcGVuZGluZ1NpemUgJiYgYXdhaXQgdGhpcy5fcGVuZGluZ1NpemU7XG4gICAgICAgIGNvbnN0IHsgZmlsZSwgc2l6ZSB9ID0gdGhpcztcbiAgICAgICAgaWYgKGZpbGUgJiYgKHBvc2l0aW9uICsgbkJ5dGVzKSA8IHNpemUpIHtcbiAgICAgICAgICAgIGNvbnN0IGVuZCA9IE1hdGgubWluKHNpemUsIHBvc2l0aW9uICsgbkJ5dGVzKTtcbiAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KGVuZCAtIHBvc2l0aW9uKTtcbiAgICAgICAgICAgIHJldHVybiAoYXdhaXQgZmlsZS5yZWFkKGJ1ZmZlciwgMCwgbkJ5dGVzLCBwb3NpdGlvbikpLmJ1ZmZlcjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkobkJ5dGVzKTtcbiAgICB9XG4gICAgcHVibGljIGFzeW5jIGNsb3NlKCkgeyBjb25zdCBmID0gdGhpcy5maWxlOyB0aGlzLmZpbGUgPSBudWxsOyBmICYmIGF3YWl0IGYuY2xvc2UoKTsgfVxuICAgIHB1YmxpYyBhc3luYyB0aHJvdyh2YWx1ZT86IGFueSkgeyBhd2FpdCB0aGlzLmNsb3NlKCk7IHJldHVybiB7IGRvbmU6IHRydWUsIHZhbHVlIH07IH1cbiAgICBwdWJsaWMgYXN5bmMgcmV0dXJuKHZhbHVlPzogYW55KSB7IGF3YWl0IHRoaXMuY2xvc2UoKTsgcmV0dXJuIHsgZG9uZTogdHJ1ZSwgdmFsdWUgfTsgfVxufVxuIl19

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
/**
 * @ignore
 */
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
/**
 * @ignore
 */
export class AsyncRandomAccessFile extends AsyncByteStream {
    constructor(file, byteLength) {
        super();
        this.position = 0;
        this.file = file;
        this.size = byteLength;
        if ((typeof byteLength) !== 'number') {
            (async () => this.size = (await file.stat()).size)();
        }
    }
    async readInt32(position) {
        const { buffer, byteOffset } = await this.readAt(position, 4);
        return new DataView(buffer, byteOffset).getInt32(0, true);
    }
    async seek(position) {
        this.position = Math.min(position, this.size);
        return position < this.size;
    }
    async read(nBytes) {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LEdBQUcsSUFBSSxFQUFFO1lBQ3BDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFFBQVEsR0FBRyxNQUFNLENBQUMsQ0FBQztZQUM5QyxNQUFNLE1BQU0sR0FBRyxJQUFJLFVBQVUsQ0FBQyxHQUFHLEdBQUcsUUFBUSxDQUFDLENBQUM7WUFDOUMsT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztTQUNoRTtRQUNELE9BQU8sSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUNNLEtBQUssQ0FBQyxLQUFLLEtBQUssTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM5RSxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQVcsSUFBSSxNQUFNLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM5RSxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQVcsSUFBSSxNQUFNLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztDQUN6RiIsImZpbGUiOiJpby9maWxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IEZpbGVIYW5kbGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgQnl0ZVN0cmVhbSwgQXN5bmNCeXRlU3RyZWFtIH0gZnJvbSAnLi9zdHJlYW0nO1xuXG4vKipcbiAqIEBpZ25vcmVcbiAqL1xuZXhwb3J0IGNsYXNzIFJhbmRvbUFjY2Vzc0ZpbGUgZXh0ZW5kcyBCeXRlU3RyZWFtIHtcbiAgICBwdWJsaWMgc2l6ZTogbnVtYmVyO1xuICAgIHB1YmxpYyBwb3NpdGlvbjogbnVtYmVyID0gMDtcbiAgICBwcm90ZWN0ZWQgYnVmZmVyOiBVaW50OEFycmF5IHwgbnVsbDtcbiAgICBjb25zdHJ1Y3RvcihidWZmZXI6IFVpbnQ4QXJyYXksIGJ5dGVMZW5ndGggPSBidWZmZXIuYnl0ZUxlbmd0aCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLmJ1ZmZlciA9IGJ1ZmZlcjtcbiAgICAgICAgdGhpcy5zaXplID0gYnl0ZUxlbmd0aDtcbiAgICB9XG4gICAgcHVibGljIHJlYWRJbnQzMihwb3NpdGlvbjogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IHsgYnVmZmVyLCBieXRlT2Zmc2V0IH0gPSB0aGlzLnJlYWRBdChwb3NpdGlvbiwgNCk7XG4gICAgICAgIHJldHVybiBuZXcgRGF0YVZpZXcoYnVmZmVyLCBieXRlT2Zmc2V0KS5nZXRJbnQzMigwLCB0cnVlKTtcbiAgICB9XG4gICAgcHVibGljIHNlZWsocG9zaXRpb246IG51bWJlcikge1xuICAgICAgICB0aGlzLnBvc2l0aW9uID0gTWF0aC5taW4ocG9zaXRpb24sIHRoaXMuc2l6ZSk7XG4gICAgICAgIHJldHVybiBwb3NpdGlvbiA8IHRoaXMuc2l6ZTtcbiAgICB9XG4gICAgcHVibGljIHJlYWQobkJ5dGVzPzogbnVtYmVyIHwgbnVsbCkge1xuICAgICAgICBjb25zdCB7IGJ1ZmZlciwgc2l6ZSwgcG9zaXRpb24gfSA9IHRoaXM7XG4gICAgICAgIGlmIChidWZmZXIgJiYgcG9zaXRpb24gPCBzaXplKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG5CeXRlcyAhPT0gJ251bWJlcicpIHsgbkJ5dGVzID0gSW5maW5pdHk7IH1cbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24gPSBNYXRoLm1pbihzaXplLFxuICAgICAgICAgICAgICAgICBwb3NpdGlvbiArIE1hdGgubWluKHNpemUgLSBwb3NpdGlvbiwgbkJ5dGVzKSk7XG4gICAgICAgICAgICByZXR1cm4gYnVmZmVyLnN1YmFycmF5KHBvc2l0aW9uLCB0aGlzLnBvc2l0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcHVibGljIHJlYWRBdChwb3NpdGlvbjogbnVtYmVyLCBuQnl0ZXM6IG51bWJlcikge1xuICAgICAgICBjb25zdCBidWYgPSB0aGlzLmJ1ZmZlcjtcbiAgICAgICAgY29uc3QgZW5kID0gTWF0aC5taW4odGhpcy5zaXplLCBwb3NpdGlvbiArIG5CeXRlcyk7XG4gICAgICAgIHJldHVybiBidWYgPyBidWYuc3ViYXJyYXkocG9zaXRpb24sIGVuZCkgOiBuZXcgVWludDhBcnJheShuQnl0ZXMpO1xuICAgIH1cbiAgICBwdWJsaWMgY2xvc2UoKSB7IHRoaXMuYnVmZmVyICYmICh0aGlzLmJ1ZmZlciA9IG51bGwpOyB9XG4gICAgcHVibGljIHRocm93KHZhbHVlPzogYW55KSB7IHRoaXMuY2xvc2UoKTsgcmV0dXJuIHsgZG9uZTogdHJ1ZSwgdmFsdWUgfTsgfVxuICAgIHB1YmxpYyByZXR1cm4odmFsdWU/OiBhbnkpIHsgdGhpcy5jbG9zZSgpOyByZXR1cm4geyBkb25lOiB0cnVlLCB2YWx1ZSB9OyB9XG59XG5cbi8qKlxuICogQGlnbm9yZVxuICovXG5leHBvcnQgY2xhc3MgQXN5bmNSYW5kb21BY2Nlc3NGaWxlIGV4dGVuZHMgQXN5bmNCeXRlU3RyZWFtIHtcbiAgICBwdWJsaWMgc2l6ZTogbnVtYmVyO1xuICAgIHB1YmxpYyBwb3NpdGlvbjogbnVtYmVyID0gMDtcbiAgICBwcm90ZWN0ZWQgZmlsZTogRmlsZUhhbmRsZSB8IG51bGw7XG4gICAgY29uc3RydWN0b3IoZmlsZTogRmlsZUhhbmRsZSwgYnl0ZUxlbmd0aDogbnVtYmVyKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuZmlsZSA9IGZpbGU7XG4gICAgICAgIHRoaXMuc2l6ZSA9IGJ5dGVMZW5ndGg7XG4gICAgICAgIGlmICgodHlwZW9mIGJ5dGVMZW5ndGgpICE9PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgKGFzeW5jICgpID0+IHRoaXMuc2l6ZSA9IChhd2FpdCBmaWxlLnN0YXQoKSkuc2l6ZSkoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgcmVhZEludDMyKHBvc2l0aW9uOiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgeyBidWZmZXIsIGJ5dGVPZmZzZXQgfSA9IGF3YWl0IHRoaXMucmVhZEF0KHBvc2l0aW9uLCA0KTtcbiAgICAgICAgcmV0dXJuIG5ldyBEYXRhVmlldyhidWZmZXIsIGJ5dGVPZmZzZXQpLmdldEludDMyKDAsIHRydWUpO1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgc2Vlayhwb3NpdGlvbjogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMucG9zaXRpb24gPSBNYXRoLm1pbihwb3NpdGlvbiwgdGhpcy5zaXplKTtcbiAgICAgICAgcmV0dXJuIHBvc2l0aW9uIDwgdGhpcy5zaXplO1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgcmVhZChuQnl0ZXM/OiBudW1iZXIgfCBudWxsKSB7XG4gICAgICAgIGNvbnN0IHsgZmlsZSwgc2l6ZSwgcG9zaXRpb24gfSA9IHRoaXM7XG4gICAgICAgIGlmIChmaWxlICYmIHBvc2l0aW9uIDwgc2l6ZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBuQnl0ZXMgIT09ICdudW1iZXInKSB7IG5CeXRlcyA9IEluZmluaXR5OyB9XG4gICAgICAgICAgICBsZXQgcG9zID0gcG9zaXRpb24sIG9mZnNldCA9IDAsIGJ5dGVzUmVhZCA9IDA7XG4gICAgICAgICAgICBsZXQgZW5kID0gTWF0aC5taW4oc2l6ZSwgcG9zICsgTWF0aC5taW4oc2l6ZSAtIHBvcywgbkJ5dGVzKSk7XG4gICAgICAgICAgICBsZXQgYnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkoTWF0aC5tYXgoMCwgKHRoaXMucG9zaXRpb24gPSBlbmQpIC0gcG9zKSk7XG4gICAgICAgICAgICB3aGlsZSAoKHBvcyArPSBieXRlc1JlYWQpIDwgZW5kICYmIChvZmZzZXQgKz0gYnl0ZXNSZWFkKSA8IGJ1ZmZlci5ieXRlTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgKHsgYnl0ZXNSZWFkIH0gPSBhd2FpdCBmaWxlLnJlYWQoYnVmZmVyLCBvZmZzZXQsIGJ1ZmZlci5ieXRlTGVuZ3RoIC0gb2Zmc2V0LCBwb3MpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHB1YmxpYyBhc3luYyByZWFkQXQocG9zaXRpb246IG51bWJlciwgbkJ5dGVzOiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgeyBmaWxlLCBzaXplIH0gPSB0aGlzO1xuICAgICAgICBpZiAoZmlsZSAmJiAocG9zaXRpb24gKyBuQnl0ZXMpIDwgc2l6ZSkge1xuICAgICAgICAgICAgY29uc3QgZW5kID0gTWF0aC5taW4oc2l6ZSwgcG9zaXRpb24gKyBuQnl0ZXMpO1xuICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkoZW5kIC0gcG9zaXRpb24pO1xuICAgICAgICAgICAgcmV0dXJuIChhd2FpdCBmaWxlLnJlYWQoYnVmZmVyLCAwLCBuQnl0ZXMsIHBvc2l0aW9uKSkuYnVmZmVyO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgVWludDhBcnJheShuQnl0ZXMpO1xuICAgIH1cbiAgICBwdWJsaWMgYXN5bmMgY2xvc2UoKSB7IGNvbnN0IGYgPSB0aGlzLmZpbGU7IHRoaXMuZmlsZSA9IG51bGw7IGYgJiYgYXdhaXQgZi5jbG9zZSgpOyB9XG4gICAgcHVibGljIGFzeW5jIHRocm93KHZhbHVlPzogYW55KSB7IGF3YWl0IHRoaXMuY2xvc2UoKTsgcmV0dXJuIHsgZG9uZTogdHJ1ZSwgdmFsdWUgfTsgfVxuICAgIHB1YmxpYyBhc3luYyByZXR1cm4odmFsdWU/OiBhbnkpIHsgYXdhaXQgdGhpcy5jbG9zZSgpOyByZXR1cm4geyBkb25lOiB0cnVlLCB2YWx1ZSB9OyB9XG59XG4iXX0=

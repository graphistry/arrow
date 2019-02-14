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
const schema_1 = require("../schema");
const data_1 = require("../data");
const chunked_1 = require("../vector/chunked");
const recordbatch_1 = require("../recordbatch");
const noopBuf = new Uint8Array(0);
const nullBufs = (bitmapLength) => [
    noopBuf, noopBuf, new Uint8Array(bitmapLength), noopBuf
];
/** @ignore */
function alignChunkLengths(schema, chunks, length = chunks.reduce((l, c) => Math.max(l, c.length), 0)) {
    const bitmapLength = ((length + 63) & ~63) >> 3;
    return chunks.map((chunk, idx) => {
        const chunkLength = chunk ? chunk.length : 0;
        if (chunkLength === length) {
            return chunk;
        }
        const field = schema.fields[idx];
        if (!field.nullable) {
            schema.fields[idx] = field.clone({ nullable: true });
        }
        return chunk ? chunk._changeLengthAndBackfillNullBitmap(length)
            : new data_1.Data(field.type, 0, length, length, nullBufs(bitmapLength));
    });
}
exports.alignChunkLengths = alignChunkLengths;
/** @ignore */
function distributeColumnsIntoRecordBatches(columns) {
    return distributeVectorsIntoRecordBatches(new schema_1.Schema(columns.map(({ field }) => field)), columns);
}
exports.distributeColumnsIntoRecordBatches = distributeColumnsIntoRecordBatches;
/** @ignore */
function distributeVectorsIntoRecordBatches(schema, vecs) {
    return uniformlyDistributeChunksAcrossRecordBatches(schema, vecs.map((v) => v instanceof chunked_1.Chunked ? v.chunks.map((c) => c.data) : [v.data]));
}
exports.distributeVectorsIntoRecordBatches = distributeVectorsIntoRecordBatches;
/** @ignore */
function uniformlyDistributeChunksAcrossRecordBatches(schema, chunks) {
    let recordBatchesLen = 0;
    const recordBatches = [];
    const memo = { numChunks: chunks.reduce((n, c) => Math.max(n, c.length), 0) };
    for (let chunkIndex = -1; ++chunkIndex < memo.numChunks;) {
        const [sameLength, batchLength] = chunks.reduce((memo, chunks) => {
            const [same, batchLength] = memo;
            const chunk = chunks[chunkIndex];
            const chunkLength = chunk ? chunk.length : batchLength;
            isFinite(batchLength) && same && (memo[0] = chunkLength === batchLength);
            memo[1] = Math.min(batchLength, chunkLength);
            return memo;
        }, [true, Number.POSITIVE_INFINITY]);
        if (!isFinite(batchLength) || (sameLength && batchLength <= 0)) {
            continue;
        }
        recordBatches[recordBatchesLen++] = new recordbatch_1.RecordBatch(schema, batchLength, sameLength ? gatherChunksSameLength(schema, chunkIndex, batchLength, chunks) :
            gatherChunksDiffLength(schema, chunkIndex, batchLength, chunks, memo));
    }
    return [schema, recordBatches];
}
exports.uniformlyDistributeChunksAcrossRecordBatches = uniformlyDistributeChunksAcrossRecordBatches;
/** @ignore */
function gatherChunksSameLength(schema, chunkIndex, length, chunks) {
    const bitmapLength = ((length + 63) & ~63) >> 3;
    return chunks.map((chunks, idx) => {
        const chunk = chunks[chunkIndex];
        if (chunk) {
            return chunk;
        }
        const field = schema.fields[idx];
        if (!field.nullable) {
            schema.fields[idx] = field.clone({ nullable: true });
        }
        return new data_1.Data(field.type, 0, length, length, nullBufs(bitmapLength));
    });
}
/** @ignore */
function gatherChunksDiffLength(schema, chunkIndex, length, chunks, memo) {
    const bitmapLength = ((length + 63) & ~63) >> 3;
    return chunks.map((chunks, idx) => {
        const chunk = chunks[chunkIndex];
        const chunkLength = chunk ? chunk.length : 0;
        if (chunkLength === length) {
            return chunk;
        }
        if (chunkLength > length) {
            memo.numChunks = Math.max(memo.numChunks, chunks.length + 1);
            chunks.splice(chunkIndex + 1, 0, chunk.slice(length, chunkLength - length));
            return chunk.slice(0, length);
        }
        const field = schema.fields[idx];
        if (!field.nullable) {
            schema.fields[idx] = field.clone({ nullable: true });
        }
        return chunk ? chunk._changeLengthAndBackfillNullBitmap(length)
            : new data_1.Data(field.type, 0, length, length, nullBufs(bitmapLength));
    });
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QU0sQ0FBQyxDQUFDO1NBQ2pDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNqQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRTtZQUNqQixNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztTQUN4RDtRQUNELE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsa0NBQWtDLENBQUMsTUFBTSxDQUFDO1lBQzNELENBQUMsQ0FBQyxJQUFJLFdBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0lBQzFFLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyIsImZpbGUiOiJ1dGlsL3JlY29yZGJhdGNoLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IENvbHVtbiB9IGZyb20gJy4uL2NvbHVtbic7XG5pbXBvcnQgeyBTY2hlbWEgfSBmcm9tICcuLi9zY2hlbWEnO1xuaW1wb3J0IHsgVmVjdG9yIH0gZnJvbSAnLi4vdmVjdG9yJztcbmltcG9ydCB7IERhdGFUeXBlIH0gZnJvbSAnLi4vdHlwZSc7XG5pbXBvcnQgeyBEYXRhLCBCdWZmZXJzIH0gZnJvbSAnLi4vZGF0YSc7XG5pbXBvcnQgeyBDaHVua2VkIH0gZnJvbSAnLi4vdmVjdG9yL2NodW5rZWQnO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2ggfSBmcm9tICcuLi9yZWNvcmRiYXRjaCc7XG5cbmNvbnN0IG5vb3BCdWYgPSBuZXcgVWludDhBcnJheSgwKTtcbmNvbnN0IG51bGxCdWZzID0gKGJpdG1hcExlbmd0aDogbnVtYmVyKSA9PiA8dW5rbm93bj4gW1xuICAgIG5vb3BCdWYsIG5vb3BCdWYsIG5ldyBVaW50OEFycmF5KGJpdG1hcExlbmd0aCksIG5vb3BCdWZcbl0gYXMgQnVmZmVyczxhbnk+O1xuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFsaWduQ2h1bmtMZW5ndGhzPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlOyB9ID0gYW55PihzY2hlbWE6IFNjaGVtYSwgY2h1bmtzOiBEYXRhPFRba2V5b2YgVF0+W10sIGxlbmd0aCA9IGNodW5rcy5yZWR1Y2UoKGwsIGMpID0+IE1hdGgubWF4KGwsIGMubGVuZ3RoKSwgMCkpIHtcbiAgICBjb25zdCBiaXRtYXBMZW5ndGggPSAoKGxlbmd0aCArIDYzKSAmIH42MykgPj4gMztcbiAgICByZXR1cm4gY2h1bmtzLm1hcCgoY2h1bmssIGlkeCkgPT4ge1xuICAgICAgICBjb25zdCBjaHVua0xlbmd0aCA9IGNodW5rID8gY2h1bmsubGVuZ3RoIDogMDtcbiAgICAgICAgaWYgKGNodW5rTGVuZ3RoID09PSBsZW5ndGgpIHsgcmV0dXJuIGNodW5rOyB9XG4gICAgICAgIGNvbnN0IGZpZWxkID0gc2NoZW1hLmZpZWxkc1tpZHhdO1xuICAgICAgICBpZiAoIWZpZWxkLm51bGxhYmxlKSB7XG4gICAgICAgICAgICBzY2hlbWEuZmllbGRzW2lkeF0gPSBmaWVsZC5jbG9uZSh7IG51bGxhYmxlOiB0cnVlIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjaHVuayA/IGNodW5rLl9jaGFuZ2VMZW5ndGhBbmRCYWNrZmlsbE51bGxCaXRtYXAobGVuZ3RoKVxuICAgICAgICAgICAgOiBuZXcgRGF0YShmaWVsZC50eXBlLCAwLCBsZW5ndGgsIGxlbmd0aCwgbnVsbEJ1ZnMoYml0bWFwTGVuZ3RoKSk7XG4gICAgfSk7XG59XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgZnVuY3Rpb24gZGlzdHJpYnV0ZUNvbHVtbnNJbnRvUmVjb3JkQmF0Y2hlczxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZTsgfSA9IGFueT4oY29sdW1uczogQ29sdW1uPFRba2V5b2YgVF0+W10pOiBbU2NoZW1hPFQ+LCBSZWNvcmRCYXRjaDxUPltdXSB7XG4gICAgcmV0dXJuIGRpc3RyaWJ1dGVWZWN0b3JzSW50b1JlY29yZEJhdGNoZXM8VD4obmV3IFNjaGVtYTxUPihjb2x1bW5zLm1hcCgoeyBmaWVsZCB9KSA9PiBmaWVsZCkpLCBjb2x1bW5zKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBmdW5jdGlvbiBkaXN0cmlidXRlVmVjdG9yc0ludG9SZWNvcmRCYXRjaGVzPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlOyB9ID0gYW55PihzY2hlbWE6IFNjaGVtYTxUPiwgdmVjczogKFZlY3RvcjxUW2tleW9mIFRdPiB8IENodW5rZWQ8VFtrZXlvZiBUXT4pW10pOiBbU2NoZW1hPFQ+LCBSZWNvcmRCYXRjaDxUPltdXSB7XG4gICAgcmV0dXJuIHVuaWZvcm1seURpc3RyaWJ1dGVDaHVua3NBY3Jvc3NSZWNvcmRCYXRjaGVzPFQ+KHNjaGVtYSwgdmVjcy5tYXAoKHYpID0+IHYgaW5zdGFuY2VvZiBDaHVua2VkID8gdi5jaHVua3MubWFwKChjKSA9PiBjLmRhdGEpIDogW3YuZGF0YV0pKTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmV4cG9ydCBmdW5jdGlvbiB1bmlmb3JtbHlEaXN0cmlidXRlQ2h1bmtzQWNyb3NzUmVjb3JkQmF0Y2hlczxUIGV4dGVuZHMgeyBba2V5OiBzdHJpbmddOiBEYXRhVHlwZTsgfSA9IGFueT4oc2NoZW1hOiBTY2hlbWE8VD4sIGNodW5rczogRGF0YTxUW2tleW9mIFRdPltdW10pOiBbU2NoZW1hPFQ+LCBSZWNvcmRCYXRjaDxUPltdXSB7XG5cbiAgICBsZXQgcmVjb3JkQmF0Y2hlc0xlbiA9IDA7XG4gICAgY29uc3QgcmVjb3JkQmF0Y2hlcyA9IFtdIGFzIFJlY29yZEJhdGNoPFQ+W107XG4gICAgY29uc3QgbWVtbyA9IHsgbnVtQ2h1bmtzOiBjaHVua3MucmVkdWNlKChuLCBjKSA9PiBNYXRoLm1heChuLCBjLmxlbmd0aCksIDApIH07XG5cbiAgICBmb3IgKGxldCBjaHVua0luZGV4ID0gLTE7ICsrY2h1bmtJbmRleCA8IG1lbW8ubnVtQ2h1bmtzOykge1xuXG4gICAgICAgIGNvbnN0IFtzYW1lTGVuZ3RoLCBiYXRjaExlbmd0aF0gPSBjaHVua3MucmVkdWNlKChtZW1vLCBjaHVua3MpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IFtzYW1lLCBiYXRjaExlbmd0aF0gPSBtZW1vO1xuICAgICAgICAgICAgY29uc3QgY2h1bmsgPSBjaHVua3NbY2h1bmtJbmRleF07XG4gICAgICAgICAgICBjb25zdCBjaHVua0xlbmd0aCA9IGNodW5rID8gY2h1bmsubGVuZ3RoIDogYmF0Y2hMZW5ndGg7XG4gICAgICAgICAgICBpc0Zpbml0ZShiYXRjaExlbmd0aCkgJiYgc2FtZSAmJiAobWVtb1swXSA9IGNodW5rTGVuZ3RoID09PSBiYXRjaExlbmd0aCk7XG4gICAgICAgICAgICBtZW1vWzFdID0gTWF0aC5taW4oYmF0Y2hMZW5ndGgsIGNodW5rTGVuZ3RoKTtcbiAgICAgICAgICAgIHJldHVybiBtZW1vO1xuICAgICAgICB9LCBbdHJ1ZSwgTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZXSBhcyBbYm9vbGVhbiwgbnVtYmVyXSk7XG5cbiAgICAgICAgaWYgKCFpc0Zpbml0ZShiYXRjaExlbmd0aCkgfHwgKHNhbWVMZW5ndGggJiYgYmF0Y2hMZW5ndGggPD0gMCkpIHsgY29udGludWU7IH1cblxuICAgICAgICByZWNvcmRCYXRjaGVzW3JlY29yZEJhdGNoZXNMZW4rK10gPSBuZXcgUmVjb3JkQmF0Y2goc2NoZW1hLCBiYXRjaExlbmd0aCxcbiAgICAgICAgICAgIHNhbWVMZW5ndGggPyBnYXRoZXJDaHVua3NTYW1lTGVuZ3RoKHNjaGVtYSwgY2h1bmtJbmRleCwgYmF0Y2hMZW5ndGgsIGNodW5rcykgOlxuICAgICAgICAgICAgICAgICAgICAgICAgIGdhdGhlckNodW5rc0RpZmZMZW5ndGgoc2NoZW1hLCBjaHVua0luZGV4LCBiYXRjaExlbmd0aCwgY2h1bmtzLCBtZW1vKSk7XG4gICAgfVxuICAgIHJldHVybiBbc2NoZW1hLCByZWNvcmRCYXRjaGVzXTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGdhdGhlckNodW5rc1NhbWVMZW5ndGgoc2NoZW1hOiBTY2hlbWEsIGNodW5rSW5kZXg6IG51bWJlciwgbGVuZ3RoOiBudW1iZXIsIGNodW5rczogRGF0YVtdW10pIHtcbiAgICBjb25zdCBiaXRtYXBMZW5ndGggPSAoKGxlbmd0aCArIDYzKSAmIH42MykgPj4gMztcbiAgICByZXR1cm4gY2h1bmtzLm1hcCgoY2h1bmtzLCBpZHgpID0+IHtcbiAgICAgICAgY29uc3QgY2h1bmsgPSBjaHVua3NbY2h1bmtJbmRleF07XG4gICAgICAgIGlmIChjaHVuaykgeyByZXR1cm4gY2h1bms7IH1cbiAgICAgICAgY29uc3QgZmllbGQgPSBzY2hlbWEuZmllbGRzW2lkeF07XG4gICAgICAgIGlmICghZmllbGQubnVsbGFibGUpIHtcbiAgICAgICAgICAgIHNjaGVtYS5maWVsZHNbaWR4XSA9IGZpZWxkLmNsb25lKHsgbnVsbGFibGU6IHRydWUgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBEYXRhKGZpZWxkLnR5cGUsIDAsIGxlbmd0aCwgbGVuZ3RoLCBudWxsQnVmcyhiaXRtYXBMZW5ndGgpKTtcbiAgICB9KTtcbn1cblxuLyoqIEBpZ25vcmUgKi9cbmZ1bmN0aW9uIGdhdGhlckNodW5rc0RpZmZMZW5ndGgoc2NoZW1hOiBTY2hlbWEsIGNodW5rSW5kZXg6IG51bWJlciwgbGVuZ3RoOiBudW1iZXIsIGNodW5rczogRGF0YVtdW10sIG1lbW86IHsgbnVtQ2h1bmtzOiBudW1iZXIgfSkge1xuICAgIGNvbnN0IGJpdG1hcExlbmd0aCA9ICgobGVuZ3RoICsgNjMpICYgfjYzKSA+PiAzO1xuICAgIHJldHVybiBjaHVua3MubWFwKChjaHVua3MsIGlkeCkgPT4ge1xuICAgICAgICBjb25zdCBjaHVuayA9IGNodW5rc1tjaHVua0luZGV4XTtcbiAgICAgICAgY29uc3QgY2h1bmtMZW5ndGggPSBjaHVuayA/IGNodW5rLmxlbmd0aCA6IDA7XG4gICAgICAgIGlmIChjaHVua0xlbmd0aCA9PT0gbGVuZ3RoKSB7IHJldHVybiBjaHVuazsgfVxuICAgICAgICBpZiAoY2h1bmtMZW5ndGggPiBsZW5ndGgpIHtcbiAgICAgICAgICAgIG1lbW8ubnVtQ2h1bmtzID0gTWF0aC5tYXgobWVtby5udW1DaHVua3MsIGNodW5rcy5sZW5ndGggKyAxKTtcbiAgICAgICAgICAgIGNodW5rcy5zcGxpY2UoY2h1bmtJbmRleCArIDEsIDAsIGNodW5rLnNsaWNlKGxlbmd0aCwgY2h1bmtMZW5ndGggLSBsZW5ndGgpKTtcbiAgICAgICAgICAgIHJldHVybiBjaHVuay5zbGljZSgwLCBsZW5ndGgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGZpZWxkID0gc2NoZW1hLmZpZWxkc1tpZHhdO1xuICAgICAgICBpZiAoIWZpZWxkLm51bGxhYmxlKSB7XG4gICAgICAgICAgICBzY2hlbWEuZmllbGRzW2lkeF0gPSBmaWVsZC5jbG9uZSh7IG51bGxhYmxlOiB0cnVlIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjaHVuayA/IGNodW5rLl9jaGFuZ2VMZW5ndGhBbmRCYWNrZmlsbE51bGxCaXRtYXAobGVuZ3RoKVxuICAgICAgICAgICAgOiBuZXcgRGF0YShmaWVsZC50eXBlLCAwLCBsZW5ndGgsIGxlbmd0aCwgbnVsbEJ1ZnMoYml0bWFwTGVuZ3RoKSk7XG4gICAgfSk7XG59XG4iXX0=
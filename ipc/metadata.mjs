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
/* tslint:disable:class-name */
import { align } from '../util/bit';
import { MessageHeader } from '../type';
export class Footer {
    constructor(dictionaryBatches, recordBatches, schema) {
        this.dictionaryBatches = dictionaryBatches;
        this.recordBatches = recordBatches;
        this.schema = schema;
    }
}
export class FileBlock {
    constructor(metaDataLength, bodyLength, offset) {
        this.metaDataLength = metaDataLength;
        this.offset = typeof offset === 'number' ? offset : offset.low;
        this.bodyLength = typeof bodyLength === 'number' ? bodyLength : bodyLength.low;
    }
}
export class Message {
    constructor(version, bodyLength, headerType) {
        this.version = version;
        this.headerType = headerType;
        this.bodyLength = typeof bodyLength === 'number' ? bodyLength : bodyLength.low;
    }
    static isSchema(m) { return m.headerType === MessageHeader.Schema; }
    static isRecordBatch(m) { return m.headerType === MessageHeader.RecordBatch; }
    static isDictionaryBatch(m) { return m.headerType === MessageHeader.DictionaryBatch; }
}
export class RecordBatchMetadata extends Message {
    constructor(version, length, nodes, buffers, bodyLength) {
        if (bodyLength === void (0)) {
            bodyLength = buffers.reduce((s, b) => align(s + b.length + (b.offset - s), 8), 0);
        }
        super(version, bodyLength, MessageHeader.RecordBatch);
        this.nodes = nodes;
        this.buffers = buffers;
        this.length = typeof length === 'number' ? length : length.low;
    }
}
export class DictionaryBatch extends Message {
    constructor(version, data, id, isDelta = false) {
        super(version, data.bodyLength, MessageHeader.DictionaryBatch);
        this.isDelta = isDelta;
        this.data = data;
        this.id = typeof id === 'number' ? id : id.low;
    }
    static getId() { return DictionaryBatch.atomicDictionaryId++; }
    get nodes() { return this.data.nodes; }
    get buffers() { return this.data.buffers; }
}
DictionaryBatch.atomicDictionaryId = 0;
export class BufferMetadata {
    constructor(offset, length) {
        this.offset = typeof offset === 'number' ? offset : offset.low;
        this.length = typeof length === 'number' ? length : length.low;
    }
}
export class FieldMetadata {
    constructor(length, nullCount) {
        this.length = typeof length === 'number' ? length : length.low;
        this.nullCount = typeof nullCount === 'number' ? nullCount : nullCount.low;
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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Q0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztJQUNuRSxDQUFDO0NBQ0o7QUFFRCxNQUFNLE9BQU8sYUFBYTtJQUd0QixZQUFZLE1BQXFCLEVBQUUsU0FBd0I7UUFDdkQsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLE1BQU0sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztRQUMvRCxJQUFJLENBQUMsU0FBUyxHQUFHLE9BQU8sU0FBUyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDO0lBQy9FLENBQUM7Q0FDSiIsImZpbGUiOiJpcGMvbWV0YWRhdGEuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuLyogdHNsaW50OmRpc2FibGU6Y2xhc3MtbmFtZSAqL1xuXG5pbXBvcnQgeyBhbGlnbiB9IGZyb20gJy4uL3V0aWwvYml0JztcbmltcG9ydCB7IFNjaGVtYSwgTG9uZywgTWVzc2FnZUhlYWRlciwgTWV0YWRhdGFWZXJzaW9uIH0gZnJvbSAnLi4vdHlwZSc7XG5cbmV4cG9ydCBjbGFzcyBGb290ZXIge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBkaWN0aW9uYXJ5QmF0Y2hlczogRmlsZUJsb2NrW10sIHB1YmxpYyByZWNvcmRCYXRjaGVzOiBGaWxlQmxvY2tbXSwgcHVibGljIHNjaGVtYTogU2NoZW1hKSB7fVxufVxuXG5leHBvcnQgY2xhc3MgRmlsZUJsb2NrIHtcbiAgICBwdWJsaWMgb2Zmc2V0OiBudW1iZXI7XG4gICAgcHVibGljIGJvZHlMZW5ndGg6IG51bWJlcjtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgbWV0YURhdGFMZW5ndGg6IG51bWJlciwgYm9keUxlbmd0aDogTG9uZyB8IG51bWJlciwgb2Zmc2V0OiBMb25nIHwgbnVtYmVyKSB7XG4gICAgICAgIHRoaXMub2Zmc2V0ID0gdHlwZW9mIG9mZnNldCA9PT0gJ251bWJlcicgPyBvZmZzZXQgOiBvZmZzZXQubG93O1xuICAgICAgICB0aGlzLmJvZHlMZW5ndGggPSB0eXBlb2YgYm9keUxlbmd0aCA9PT0gJ251bWJlcicgPyBib2R5TGVuZ3RoIDogYm9keUxlbmd0aC5sb3c7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgTWVzc2FnZSB7XG4gICAgcHVibGljIGJvZHlMZW5ndGg6IG51bWJlcjtcbiAgICBwdWJsaWMgdmVyc2lvbjogTWV0YWRhdGFWZXJzaW9uO1xuICAgIHB1YmxpYyBoZWFkZXJUeXBlOiBNZXNzYWdlSGVhZGVyO1xuICAgIGNvbnN0cnVjdG9yKHZlcnNpb246IE1ldGFkYXRhVmVyc2lvbiwgYm9keUxlbmd0aDogTG9uZyB8IG51bWJlciwgaGVhZGVyVHlwZTogTWVzc2FnZUhlYWRlcikge1xuICAgICAgICB0aGlzLnZlcnNpb24gPSB2ZXJzaW9uO1xuICAgICAgICB0aGlzLmhlYWRlclR5cGUgPSBoZWFkZXJUeXBlO1xuICAgICAgICB0aGlzLmJvZHlMZW5ndGggPSB0eXBlb2YgYm9keUxlbmd0aCA9PT0gJ251bWJlcicgPyBib2R5TGVuZ3RoIDogYm9keUxlbmd0aC5sb3c7XG4gICAgfVxuICAgIHN0YXRpYyBpc1NjaGVtYShtOiBNZXNzYWdlKTogbSBpcyBTY2hlbWEgeyByZXR1cm4gbS5oZWFkZXJUeXBlID09PSBNZXNzYWdlSGVhZGVyLlNjaGVtYTsgfVxuICAgIHN0YXRpYyBpc1JlY29yZEJhdGNoKG06IE1lc3NhZ2UpOiBtIGlzIFJlY29yZEJhdGNoTWV0YWRhdGEgeyByZXR1cm4gbS5oZWFkZXJUeXBlID09PSBNZXNzYWdlSGVhZGVyLlJlY29yZEJhdGNoOyB9XG4gICAgc3RhdGljIGlzRGljdGlvbmFyeUJhdGNoKG06IE1lc3NhZ2UpOiBtIGlzIERpY3Rpb25hcnlCYXRjaCB7IHJldHVybiBtLmhlYWRlclR5cGUgPT09IE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoOyB9XG59XG5cbmV4cG9ydCBjbGFzcyBSZWNvcmRCYXRjaE1ldGFkYXRhIGV4dGVuZHMgTWVzc2FnZSB7XG4gICAgcHVibGljIGxlbmd0aDogbnVtYmVyO1xuICAgIHB1YmxpYyBub2RlczogRmllbGRNZXRhZGF0YVtdO1xuICAgIHB1YmxpYyBidWZmZXJzOiBCdWZmZXJNZXRhZGF0YVtdO1xuICAgIGNvbnN0cnVjdG9yKHZlcnNpb246IE1ldGFkYXRhVmVyc2lvbiwgbGVuZ3RoOiBMb25nIHwgbnVtYmVyLCBub2RlczogRmllbGRNZXRhZGF0YVtdLCBidWZmZXJzOiBCdWZmZXJNZXRhZGF0YVtdLCBib2R5TGVuZ3RoPzogTG9uZyB8IG51bWJlcikge1xuICAgICAgICBpZiAoYm9keUxlbmd0aCA9PT0gdm9pZCgwKSkge1xuICAgICAgICAgICAgYm9keUxlbmd0aCA9IGJ1ZmZlcnMucmVkdWNlKChzLCBiKSA9PiBhbGlnbihzICsgYi5sZW5ndGggKyAoYi5vZmZzZXQgLSBzKSwgOCksIDApO1xuICAgICAgICB9XG4gICAgICAgIHN1cGVyKHZlcnNpb24sIGJvZHlMZW5ndGgsIE1lc3NhZ2VIZWFkZXIuUmVjb3JkQmF0Y2gpO1xuICAgICAgICB0aGlzLm5vZGVzID0gbm9kZXM7XG4gICAgICAgIHRoaXMuYnVmZmVycyA9IGJ1ZmZlcnM7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gdHlwZW9mIGxlbmd0aCA9PT0gJ251bWJlcicgPyBsZW5ndGggOiBsZW5ndGgubG93O1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIERpY3Rpb25hcnlCYXRjaCBleHRlbmRzIE1lc3NhZ2Uge1xuICAgIHB1YmxpYyBpZDogbnVtYmVyO1xuICAgIHB1YmxpYyBpc0RlbHRhOiBib29sZWFuO1xuICAgIHB1YmxpYyBkYXRhOiBSZWNvcmRCYXRjaE1ldGFkYXRhO1xuICAgIGNvbnN0cnVjdG9yKHZlcnNpb246IE1ldGFkYXRhVmVyc2lvbiwgZGF0YTogUmVjb3JkQmF0Y2hNZXRhZGF0YSwgaWQ6IExvbmcgfCBudW1iZXIsIGlzRGVsdGE6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgICAgICBzdXBlcih2ZXJzaW9uLCBkYXRhLmJvZHlMZW5ndGgsIE1lc3NhZ2VIZWFkZXIuRGljdGlvbmFyeUJhdGNoKTtcbiAgICAgICAgdGhpcy5pc0RlbHRhID0gaXNEZWx0YTtcbiAgICAgICAgdGhpcy5kYXRhID0gZGF0YTtcbiAgICAgICAgdGhpcy5pZCA9IHR5cGVvZiBpZCA9PT0gJ251bWJlcicgPyBpZCA6IGlkLmxvdztcbiAgICB9XG4gICAgcHJpdmF0ZSBzdGF0aWMgYXRvbWljRGljdGlvbmFyeUlkID0gMDtcbiAgICBwdWJsaWMgc3RhdGljIGdldElkKCkgeyByZXR1cm4gRGljdGlvbmFyeUJhdGNoLmF0b21pY0RpY3Rpb25hcnlJZCsrOyB9XG4gICAgcHVibGljIGdldCBub2RlcygpOiBGaWVsZE1ldGFkYXRhW10geyByZXR1cm4gdGhpcy5kYXRhLm5vZGVzOyB9XG4gICAgcHVibGljIGdldCBidWZmZXJzKCk6IEJ1ZmZlck1ldGFkYXRhW10geyByZXR1cm4gdGhpcy5kYXRhLmJ1ZmZlcnM7IH1cbn1cblxuZXhwb3J0IGNsYXNzIEJ1ZmZlck1ldGFkYXRhIHtcbiAgICBwdWJsaWMgb2Zmc2V0OiBudW1iZXI7XG4gICAgcHVibGljIGxlbmd0aDogbnVtYmVyO1xuICAgIGNvbnN0cnVjdG9yKG9mZnNldDogTG9uZyB8IG51bWJlciwgbGVuZ3RoOiBMb25nIHwgbnVtYmVyKSB7XG4gICAgICAgIHRoaXMub2Zmc2V0ID0gdHlwZW9mIG9mZnNldCA9PT0gJ251bWJlcicgPyBvZmZzZXQgOiBvZmZzZXQubG93O1xuICAgICAgICB0aGlzLmxlbmd0aCA9IHR5cGVvZiBsZW5ndGggPT09ICdudW1iZXInID8gbGVuZ3RoIDogbGVuZ3RoLmxvdztcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBGaWVsZE1ldGFkYXRhIHtcbiAgICBwdWJsaWMgbGVuZ3RoOiBudW1iZXI7XG4gICAgcHVibGljIG51bGxDb3VudDogbnVtYmVyO1xuICAgIGNvbnN0cnVjdG9yKGxlbmd0aDogTG9uZyB8IG51bWJlciwgbnVsbENvdW50OiBMb25nIHwgbnVtYmVyKSB7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gdHlwZW9mIGxlbmd0aCA9PT0gJ251bWJlcicgPyBsZW5ndGggOiBsZW5ndGgubG93O1xuICAgICAgICB0aGlzLm51bGxDb3VudCA9IHR5cGVvZiBudWxsQ291bnQgPT09ICdudW1iZXInID8gbnVsbENvdW50IDogbnVsbENvdW50LmxvdztcbiAgICB9XG59XG4iXX0=

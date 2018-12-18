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
const tslib_1 = require("tslib");
const adapters_1 = require("./io/adapters");
const reader_1 = require("./ipc/reader");
const writer_1 = require("./ipc/writer");
const compat_1 = require("./util/compat");
const stream_1 = require("./io/stream");
adapters_1.default.toReadableDOMStream = toReadableDOMStream;
reader_1.RecordBatchReader['throughDOM'] = recordBatchReaderThroughDOMStream;
writer_1.RecordBatchWriter['throughDOM'] = recordBatchWriterThroughDOMStream;
var Arrow_1 = require("./Arrow");
exports.ArrowType = Arrow_1.ArrowType;
exports.DateUnit = Arrow_1.DateUnit;
exports.IntervalUnit = Arrow_1.IntervalUnit;
exports.MessageHeader = Arrow_1.MessageHeader;
exports.MetadataVersion = Arrow_1.MetadataVersion;
exports.Precision = Arrow_1.Precision;
exports.TimeUnit = Arrow_1.TimeUnit;
exports.Type = Arrow_1.Type;
exports.UnionMode = Arrow_1.UnionMode;
exports.VectorType = Arrow_1.VectorType;
exports.Data = Arrow_1.Data;
exports.DataType = Arrow_1.DataType;
exports.Null = Arrow_1.Null;
exports.Bool = Arrow_1.Bool;
exports.Int = Arrow_1.Int;
exports.Int8 = Arrow_1.Int8;
exports.Int16 = Arrow_1.Int16;
exports.Int32 = Arrow_1.Int32;
exports.Int64 = Arrow_1.Int64;
exports.Uint8 = Arrow_1.Uint8;
exports.Uint16 = Arrow_1.Uint16;
exports.Uint32 = Arrow_1.Uint32;
exports.Uint64 = Arrow_1.Uint64;
exports.Float = Arrow_1.Float;
exports.Float16 = Arrow_1.Float16;
exports.Float32 = Arrow_1.Float32;
exports.Float64 = Arrow_1.Float64;
exports.Utf8 = Arrow_1.Utf8;
exports.Binary = Arrow_1.Binary;
exports.FixedSizeBinary = Arrow_1.FixedSizeBinary;
exports.Date_ = Arrow_1.Date_;
exports.DateDay = Arrow_1.DateDay;
exports.DateMillisecond = Arrow_1.DateMillisecond;
exports.Timestamp = Arrow_1.Timestamp;
exports.TimestampSecond = Arrow_1.TimestampSecond;
exports.TimestampMillisecond = Arrow_1.TimestampMillisecond;
exports.TimestampMicrosecond = Arrow_1.TimestampMicrosecond;
exports.TimestampNanosecond = Arrow_1.TimestampNanosecond;
exports.Time = Arrow_1.Time;
exports.TimeSecond = Arrow_1.TimeSecond;
exports.TimeMillisecond = Arrow_1.TimeMillisecond;
exports.TimeMicrosecond = Arrow_1.TimeMicrosecond;
exports.TimeNanosecond = Arrow_1.TimeNanosecond;
exports.Decimal = Arrow_1.Decimal;
exports.List = Arrow_1.List;
exports.Struct = Arrow_1.Struct;
exports.Union = Arrow_1.Union;
exports.DenseUnion = Arrow_1.DenseUnion;
exports.SparseUnion = Arrow_1.SparseUnion;
exports.Dictionary = Arrow_1.Dictionary;
exports.Interval = Arrow_1.Interval;
exports.IntervalDayTime = Arrow_1.IntervalDayTime;
exports.IntervalYearMonth = Arrow_1.IntervalYearMonth;
exports.FixedSizeList = Arrow_1.FixedSizeList;
exports.Map_ = Arrow_1.Map_;
exports.Table = Arrow_1.Table;
exports.Column = Arrow_1.Column;
exports.Schema = Arrow_1.Schema;
exports.Field = Arrow_1.Field;
exports.Visitor = Arrow_1.Visitor;
exports.Vector = Arrow_1.Vector;
exports.BaseVector = Arrow_1.BaseVector;
exports.BinaryVector = Arrow_1.BinaryVector;
exports.BoolVector = Arrow_1.BoolVector;
exports.ChunkedVector = Arrow_1.ChunkedVector;
exports.DateVector = Arrow_1.DateVector;
exports.DateDayVector = Arrow_1.DateDayVector;
exports.DateMillisecondVector = Arrow_1.DateMillisecondVector;
exports.DecimalVector = Arrow_1.DecimalVector;
exports.DictionaryVector = Arrow_1.DictionaryVector;
exports.FixedSizeBinaryVector = Arrow_1.FixedSizeBinaryVector;
exports.FixedSizeListVector = Arrow_1.FixedSizeListVector;
exports.FloatVector = Arrow_1.FloatVector;
exports.Float16Vector = Arrow_1.Float16Vector;
exports.Float32Vector = Arrow_1.Float32Vector;
exports.Float64Vector = Arrow_1.Float64Vector;
exports.IntervalVector = Arrow_1.IntervalVector;
exports.IntervalDayTimeVector = Arrow_1.IntervalDayTimeVector;
exports.IntervalYearMonthVector = Arrow_1.IntervalYearMonthVector;
exports.IntVector = Arrow_1.IntVector;
exports.Int8Vector = Arrow_1.Int8Vector;
exports.Int16Vector = Arrow_1.Int16Vector;
exports.Int32Vector = Arrow_1.Int32Vector;
exports.Int64Vector = Arrow_1.Int64Vector;
exports.Uint8Vector = Arrow_1.Uint8Vector;
exports.Uint16Vector = Arrow_1.Uint16Vector;
exports.Uint32Vector = Arrow_1.Uint32Vector;
exports.Uint64Vector = Arrow_1.Uint64Vector;
exports.ListVector = Arrow_1.ListVector;
exports.MapVector = Arrow_1.MapVector;
exports.NullVector = Arrow_1.NullVector;
exports.StructVector = Arrow_1.StructVector;
exports.TimestampVector = Arrow_1.TimestampVector;
exports.TimestampSecondVector = Arrow_1.TimestampSecondVector;
exports.TimestampMillisecondVector = Arrow_1.TimestampMillisecondVector;
exports.TimestampMicrosecondVector = Arrow_1.TimestampMicrosecondVector;
exports.TimestampNanosecondVector = Arrow_1.TimestampNanosecondVector;
exports.TimeVector = Arrow_1.TimeVector;
exports.TimeSecondVector = Arrow_1.TimeSecondVector;
exports.TimeMillisecondVector = Arrow_1.TimeMillisecondVector;
exports.TimeMicrosecondVector = Arrow_1.TimeMicrosecondVector;
exports.TimeNanosecondVector = Arrow_1.TimeNanosecondVector;
exports.UnionVector = Arrow_1.UnionVector;
exports.DenseUnionVector = Arrow_1.DenseUnionVector;
exports.SparseUnionVector = Arrow_1.SparseUnionVector;
exports.Utf8Vector = Arrow_1.Utf8Vector;
exports.ByteStream = Arrow_1.ByteStream;
exports.AsyncByteStream = Arrow_1.AsyncByteStream;
exports.AsyncByteQueue = Arrow_1.AsyncByteQueue;
exports.RecordBatchReader = Arrow_1.RecordBatchReader;
exports.RecordBatchFileReader = Arrow_1.RecordBatchFileReader;
exports.RecordBatchStreamReader = Arrow_1.RecordBatchStreamReader;
exports.AsyncRecordBatchFileReader = Arrow_1.AsyncRecordBatchFileReader;
exports.AsyncRecordBatchStreamReader = Arrow_1.AsyncRecordBatchStreamReader;
exports.RecordBatchWriter = Arrow_1.RecordBatchWriter;
exports.RecordBatchFileWriter = Arrow_1.RecordBatchFileWriter;
exports.RecordBatchStreamWriter = Arrow_1.RecordBatchStreamWriter;
exports.MessageReader = Arrow_1.MessageReader;
exports.AsyncMessageReader = Arrow_1.AsyncMessageReader;
exports.JSONMessageReader = Arrow_1.JSONMessageReader;
exports.Message = Arrow_1.Message;
exports.RecordBatch = Arrow_1.RecordBatch;
exports.Dataframe = Arrow_1.Dataframe;
exports.FilteredDataFrame = Arrow_1.FilteredDataFrame;
exports.CountByResult = Arrow_1.CountByResult;
exports.predicate = Arrow_1.predicate;
exports.util = Arrow_1.util;
function recordBatchReaderThroughDOMStream() {
    const through = new stream_1.AsyncByteQueue();
    let reader = null;
    const readable = new ReadableStream({
        cancel() {
            return tslib_1.__awaiter(this, void 0, void 0, function* () { yield through.close(); });
        },
        start(controller) {
            return tslib_1.__awaiter(this, void 0, void 0, function* () { yield next(controller, reader || (reader = yield open())); });
        },
        pull(controller) {
            return tslib_1.__awaiter(this, void 0, void 0, function* () { reader ? yield next(controller, reader) : controller.close(); });
        }
    });
    return { writable: new WritableStream(through), readable };
    function open() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield (yield reader_1.RecordBatchReader.from(through)).open();
        });
    }
    function next(controller, reader) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let size = controller.desiredSize;
            let r = null;
            while (!(r = yield reader.next()).done) {
                controller.enqueue(r.value);
                if (size != null && --size <= 0) {
                    return;
                }
            }
            controller.close();
        });
    }
}
function recordBatchWriterThroughDOMStream(writableStrategy, readableStrategy) {
    const through = new stream_1.AsyncByteQueue();
    const writer = new this().reset(through);
    const reader = new stream_1.AsyncByteStream(through);
    const readable = new ReadableStream({
        type: 'bytes',
        cancel() {
            return tslib_1.__awaiter(this, void 0, void 0, function* () { yield through.close(); });
        },
        pull(controller) {
            return tslib_1.__awaiter(this, void 0, void 0, function* () { yield next(controller); });
        },
        start(controller) {
            return tslib_1.__awaiter(this, void 0, void 0, function* () { yield next(controller); });
        },
    }, readableStrategy);
    return { writable: new WritableStream(writer, writableStrategy), readable };
    function next(controller) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let buf = null;
            let size = controller.desiredSize;
            while (buf = yield reader.read(size || null)) {
                // Work around https://github.com/whatwg/streams/blob/0ebe4b042e467d9876d80ae045de3843092ad797/reference-implementation/lib/helpers.js#L126
                controller.enqueue((buf.buffer.byteLength !== 0) ? buf : buf.slice());
                if (size != null && (size -= buf.byteLength) <= 0) {
                    return;
                }
            }
            controller.close();
        });
    }
}
function toReadableDOMStream(source, options) {
    if (compat_1.isAsyncIterable(source)) {
        return asyncIterableAsReadableDOMStream(source, options);
    }
    if (compat_1.isIterable(source)) {
        return iterableAsReadableDOMStream(source, options);
    }
    throw new Error(`toReadableDOMStream() must be called with an Iterable or AsyncIterable`);
}
function iterableAsReadableDOMStream(source, options) {
    let it = null;
    return new ReadableStream(Object.assign({}, options, { start(controller) { next(controller, it || (it = source[Symbol.iterator]())); },
        pull(controller) { it ? (next(controller, it)) : controller.close(); },
        cancel() { (it && (it.return && it.return()) || true) && (it = null); } }));
    function next(controller, it) {
        let size = controller.desiredSize;
        let r = null;
        while ((size == null || size-- > 0) && !(r = it.next()).done) {
            controller.enqueue(r.value);
        }
        r && r.done && controller.close();
    }
}
function asyncIterableAsReadableDOMStream(source, options) {
    let it = null;
    return new ReadableStream(Object.assign({}, options, { start(controller) {
            return tslib_1.__awaiter(this, void 0, void 0, function* () { yield next(controller, it || (it = source[Symbol.asyncIterator]())); });
        },
        pull(controller) {
            return tslib_1.__awaiter(this, void 0, void 0, function* () { it ? (yield next(controller, it)) : controller.close(); });
        },
        cancel() {
            return tslib_1.__awaiter(this, void 0, void 0, function* () { (it && (it.return && (yield it.return())) || true) && (it = null); });
        } }));
    function next(controller, it) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let size = controller.desiredSize;
            let r = null;
            while ((size == null || size-- > 0) && !(r = yield it.next()).done) {
                controller.enqueue(r.value);
            }
            r && r.done && controller.close();
        });
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUU7Z0JBQ2hFLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQy9CO1lBQ0QsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3RDLENBQUM7S0FBQTtBQUNMLENBQUMiLCJmaWxlIjoiQXJyb3cuZG9tLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCB7IERhdGFUeXBlIH0gZnJvbSAnLi90eXBlJztcbmltcG9ydCBzdHJlYW1BZGFwdGVycyBmcm9tICcuL2lvL2FkYXB0ZXJzJztcbmltcG9ydCB7IFJlY29yZEJhdGNoIH0gZnJvbSAnLi9yZWNvcmRiYXRjaCc7XG5pbXBvcnQgeyBSZWNvcmRCYXRjaFJlYWRlciB9IGZyb20gJy4vaXBjL3JlYWRlcic7XG5pbXBvcnQgeyBSZWNvcmRCYXRjaFdyaXRlciB9IGZyb20gJy4vaXBjL3dyaXRlcic7XG5pbXBvcnQgeyBSZWFkYWJsZURPTVN0cmVhbU9wdGlvbnMgfSBmcm9tICcuL2lvL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgaXNJdGVyYWJsZSwgaXNBc3luY0l0ZXJhYmxlIH0gZnJvbSAnLi91dGlsL2NvbXBhdCc7XG5pbXBvcnQgeyBBc3luY0J5dGVTdHJlYW0sIEFzeW5jQnl0ZVF1ZXVlIH0gZnJvbSAnLi9pby9zdHJlYW0nO1xuXG5zdHJlYW1BZGFwdGVycy50b1JlYWRhYmxlRE9NU3RyZWFtID0gdG9SZWFkYWJsZURPTVN0cmVhbTtcblJlY29yZEJhdGNoUmVhZGVyWyd0aHJvdWdoRE9NJ10gPSByZWNvcmRCYXRjaFJlYWRlclRocm91Z2hET01TdHJlYW07XG5SZWNvcmRCYXRjaFdyaXRlclsndGhyb3VnaERPTSddID0gcmVjb3JkQmF0Y2hXcml0ZXJUaHJvdWdoRE9NU3RyZWFtO1xuXG5leHBvcnQge1xuICAgIEFycm93VHlwZSwgRGF0ZVVuaXQsIEludGVydmFsVW5pdCwgTWVzc2FnZUhlYWRlciwgTWV0YWRhdGFWZXJzaW9uLCBQcmVjaXNpb24sIFRpbWVVbml0LCBUeXBlLCBVbmlvbk1vZGUsIFZlY3RvclR5cGUsXG4gICAgRGF0YSxcbiAgICBEYXRhVHlwZSxcbiAgICBOdWxsLFxuICAgIEJvb2wsXG4gICAgSW50LCBJbnQ4LCBJbnQxNiwgSW50MzIsIEludDY0LCBVaW50OCwgVWludDE2LCBVaW50MzIsIFVpbnQ2NCxcbiAgICBGbG9hdCwgRmxvYXQxNiwgRmxvYXQzMiwgRmxvYXQ2NCxcbiAgICBVdGY4LFxuICAgIEJpbmFyeSxcbiAgICBGaXhlZFNpemVCaW5hcnksXG4gICAgRGF0ZV8sIERhdGVEYXksIERhdGVNaWxsaXNlY29uZCxcbiAgICBUaW1lc3RhbXAsIFRpbWVzdGFtcFNlY29uZCwgVGltZXN0YW1wTWlsbGlzZWNvbmQsIFRpbWVzdGFtcE1pY3Jvc2Vjb25kLCBUaW1lc3RhbXBOYW5vc2Vjb25kLFxuICAgIFRpbWUsIFRpbWVTZWNvbmQsIFRpbWVNaWxsaXNlY29uZCwgVGltZU1pY3Jvc2Vjb25kLCBUaW1lTmFub3NlY29uZCxcbiAgICBEZWNpbWFsLFxuICAgIExpc3QsXG4gICAgU3RydWN0LFxuICAgIFVuaW9uLCBEZW5zZVVuaW9uLCBTcGFyc2VVbmlvbixcbiAgICBEaWN0aW9uYXJ5LFxuICAgIEludGVydmFsLCBJbnRlcnZhbERheVRpbWUsIEludGVydmFsWWVhck1vbnRoLFxuICAgIEZpeGVkU2l6ZUxpc3QsXG4gICAgTWFwXyxcbiAgICBUYWJsZSwgRGF0YUZyYW1lLFxuICAgIENvbHVtbixcbiAgICBTY2hlbWEsIEZpZWxkLFxuICAgIFZpc2l0b3IsXG4gICAgVmVjdG9yLFxuICAgIEJhc2VWZWN0b3IsXG4gICAgQmluYXJ5VmVjdG9yLFxuICAgIEJvb2xWZWN0b3IsXG4gICAgQ2h1bmtlZFZlY3RvcixcbiAgICBEYXRlVmVjdG9yLCBEYXRlRGF5VmVjdG9yLCBEYXRlTWlsbGlzZWNvbmRWZWN0b3IsXG4gICAgRGVjaW1hbFZlY3RvcixcbiAgICBEaWN0aW9uYXJ5VmVjdG9yLFxuICAgIEZpeGVkU2l6ZUJpbmFyeVZlY3RvcixcbiAgICBGaXhlZFNpemVMaXN0VmVjdG9yLFxuICAgIEZsb2F0VmVjdG9yLCBGbG9hdDE2VmVjdG9yLCBGbG9hdDMyVmVjdG9yLCBGbG9hdDY0VmVjdG9yLFxuICAgIEludGVydmFsVmVjdG9yLCBJbnRlcnZhbERheVRpbWVWZWN0b3IsIEludGVydmFsWWVhck1vbnRoVmVjdG9yLFxuICAgIEludFZlY3RvciwgSW50OFZlY3RvciwgSW50MTZWZWN0b3IsIEludDMyVmVjdG9yLCBJbnQ2NFZlY3RvciwgVWludDhWZWN0b3IsIFVpbnQxNlZlY3RvciwgVWludDMyVmVjdG9yLCBVaW50NjRWZWN0b3IsXG4gICAgTGlzdFZlY3RvcixcbiAgICBNYXBWZWN0b3IsXG4gICAgTnVsbFZlY3RvcixcbiAgICBTdHJ1Y3RWZWN0b3IsXG4gICAgVGltZXN0YW1wVmVjdG9yLCBUaW1lc3RhbXBTZWNvbmRWZWN0b3IsIFRpbWVzdGFtcE1pbGxpc2Vjb25kVmVjdG9yLCBUaW1lc3RhbXBNaWNyb3NlY29uZFZlY3RvciwgVGltZXN0YW1wTmFub3NlY29uZFZlY3RvcixcbiAgICBUaW1lVmVjdG9yLCBUaW1lU2Vjb25kVmVjdG9yLCBUaW1lTWlsbGlzZWNvbmRWZWN0b3IsIFRpbWVNaWNyb3NlY29uZFZlY3RvciwgVGltZU5hbm9zZWNvbmRWZWN0b3IsXG4gICAgVW5pb25WZWN0b3IsIERlbnNlVW5pb25WZWN0b3IsIFNwYXJzZVVuaW9uVmVjdG9yLFxuICAgIFV0ZjhWZWN0b3IsXG4gICAgQnl0ZVN0cmVhbSwgQXN5bmNCeXRlU3RyZWFtLCBBc3luY0J5dGVRdWV1ZSwgUmVhZGFibGVTb3VyY2UsIFdyaXRhYmxlU2luayxcbiAgICBSZWNvcmRCYXRjaFJlYWRlciwgUmVjb3JkQmF0Y2hGaWxlUmVhZGVyLCBSZWNvcmRCYXRjaFN0cmVhbVJlYWRlciwgQXN5bmNSZWNvcmRCYXRjaEZpbGVSZWFkZXIsIEFzeW5jUmVjb3JkQmF0Y2hTdHJlYW1SZWFkZXIsXG4gICAgUmVjb3JkQmF0Y2hXcml0ZXIsIFJlY29yZEJhdGNoRmlsZVdyaXRlciwgUmVjb3JkQmF0Y2hTdHJlYW1Xcml0ZXIsXG4gICAgTWVzc2FnZVJlYWRlciwgQXN5bmNNZXNzYWdlUmVhZGVyLCBKU09OTWVzc2FnZVJlYWRlcixcbiAgICBNZXNzYWdlLFxuICAgIFJlY29yZEJhdGNoLFxuICAgIEFycm93SlNPTkxpa2UsIEZpbGVIYW5kbGUsIFJlYWRhYmxlLCBXcml0YWJsZSwgUmVhZGFibGVXcml0YWJsZSwgUmVhZGFibGVET01TdHJlYW1PcHRpb25zLFxuICAgIERhdGFmcmFtZSwgRmlsdGVyZWREYXRhRnJhbWUsIENvdW50QnlSZXN1bHQsIEJpbmRGdW5jLCBOZXh0RnVuYyxcbiAgICBwcmVkaWNhdGUsXG4gICAgdXRpbFxufSBmcm9tICcuL0Fycm93JztcblxuZnVuY3Rpb24gcmVjb3JkQmF0Y2hSZWFkZXJUaHJvdWdoRE9NU3RyZWFtPFQgZXh0ZW5kcyB7IFtrZXk6IHN0cmluZ106IERhdGFUeXBlIH0gPSBhbnk+KCkge1xuXG4gICAgY29uc3QgdGhyb3VnaCA9IG5ldyBBc3luY0J5dGVRdWV1ZSgpO1xuICAgIGxldCByZWFkZXI6IFJlY29yZEJhdGNoUmVhZGVyPFQ+IHwgbnVsbCA9IG51bGw7XG5cbiAgICBjb25zdCByZWFkYWJsZSA9IG5ldyBSZWFkYWJsZVN0cmVhbTxSZWNvcmRCYXRjaDxUPj4oe1xuICAgICAgICBhc3luYyBjYW5jZWwoKSB7IGF3YWl0IHRocm91Z2guY2xvc2UoKTsgfSxcbiAgICAgICAgYXN5bmMgc3RhcnQoY29udHJvbGxlcikgeyBhd2FpdCBuZXh0KGNvbnRyb2xsZXIsIHJlYWRlciB8fCAocmVhZGVyID0gYXdhaXQgb3BlbigpKSk7IH0sXG4gICAgICAgIGFzeW5jIHB1bGwoY29udHJvbGxlcikgeyByZWFkZXIgPyBhd2FpdCBuZXh0KGNvbnRyb2xsZXIsIHJlYWRlcikgOiBjb250cm9sbGVyLmNsb3NlKCk7IH1cbiAgICB9KTtcblxuICAgIHJldHVybiB7IHdyaXRhYmxlOiBuZXcgV3JpdGFibGVTdHJlYW0odGhyb3VnaCksIHJlYWRhYmxlIH07XG5cbiAgICBhc3luYyBmdW5jdGlvbiBvcGVuKCkge1xuICAgICAgICByZXR1cm4gYXdhaXQgKGF3YWl0IFJlY29yZEJhdGNoUmVhZGVyLmZyb20odGhyb3VnaCkpLm9wZW4oKTtcbiAgICB9XG5cbiAgICBhc3luYyBmdW5jdGlvbiBuZXh0KGNvbnRyb2xsZXI6IFJlYWRhYmxlU3RyZWFtRGVmYXVsdENvbnRyb2xsZXI8UmVjb3JkQmF0Y2g8VD4+LCByZWFkZXI6IFJlY29yZEJhdGNoUmVhZGVyPFQ+KSB7XG4gICAgICAgIGxldCBzaXplID0gY29udHJvbGxlci5kZXNpcmVkU2l6ZTtcbiAgICAgICAgbGV0IHI6IEl0ZXJhdG9yUmVzdWx0PFJlY29yZEJhdGNoPFQ+PiB8IG51bGwgPSBudWxsO1xuICAgICAgICB3aGlsZSAoIShyID0gYXdhaXQgcmVhZGVyLm5leHQoKSkuZG9uZSkge1xuICAgICAgICAgICAgY29udHJvbGxlci5lbnF1ZXVlKHIudmFsdWUpO1xuICAgICAgICAgICAgaWYgKHNpemUgIT0gbnVsbCAmJiAtLXNpemUgPD0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb250cm9sbGVyLmNsb3NlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiByZWNvcmRCYXRjaFdyaXRlclRocm91Z2hET01TdHJlYW08VCBleHRlbmRzIHsgW2tleTogc3RyaW5nXTogRGF0YVR5cGUgfSA9IGFueT4oXG4gICAgdGhpczogdHlwZW9mIFJlY29yZEJhdGNoV3JpdGVyLFxuICAgIHdyaXRhYmxlU3RyYXRlZ3k/OiBRdWV1aW5nU3RyYXRlZ3k8UmVjb3JkQmF0Y2g8VD4+LFxuICAgIHJlYWRhYmxlU3RyYXRlZ3k/OiB7IGhpZ2hXYXRlck1hcms/OiBudW1iZXIsIHNpemU/OiBhbnkgfVxuKSB7XG5cbiAgICBjb25zdCB0aHJvdWdoID0gbmV3IEFzeW5jQnl0ZVF1ZXVlKCk7XG4gICAgY29uc3Qgd3JpdGVyID0gbmV3IHRoaXM8VD4oKS5yZXNldCh0aHJvdWdoKTtcbiAgICBjb25zdCByZWFkZXIgPSBuZXcgQXN5bmNCeXRlU3RyZWFtKHRocm91Z2gpO1xuICAgIGNvbnN0IHJlYWRhYmxlID0gbmV3IFJlYWRhYmxlU3RyZWFtKHtcbiAgICAgICAgdHlwZTogJ2J5dGVzJyxcbiAgICAgICAgYXN5bmMgY2FuY2VsKCkgeyBhd2FpdCB0aHJvdWdoLmNsb3NlKCk7IH0sXG4gICAgICAgIGFzeW5jIHB1bGwoY29udHJvbGxlcikgeyBhd2FpdCBuZXh0KGNvbnRyb2xsZXIpOyB9LFxuICAgICAgICBhc3luYyBzdGFydChjb250cm9sbGVyKSB7IGF3YWl0IG5leHQoY29udHJvbGxlcik7IH0sXG4gICAgfSwgcmVhZGFibGVTdHJhdGVneSk7XG5cbiAgICByZXR1cm4geyB3cml0YWJsZTogbmV3IFdyaXRhYmxlU3RyZWFtKHdyaXRlciwgd3JpdGFibGVTdHJhdGVneSksIHJlYWRhYmxlIH07XG5cbiAgICBhc3luYyBmdW5jdGlvbiBuZXh0KGNvbnRyb2xsZXI6IFJlYWRhYmxlU3RyZWFtRGVmYXVsdENvbnRyb2xsZXI8VWludDhBcnJheT4pIHtcbiAgICAgICAgbGV0IGJ1ZjogVWludDhBcnJheSB8IG51bGwgPSBudWxsO1xuICAgICAgICBsZXQgc2l6ZSA9IGNvbnRyb2xsZXIuZGVzaXJlZFNpemU7XG4gICAgICAgIHdoaWxlIChidWYgPSBhd2FpdCByZWFkZXIucmVhZChzaXplIHx8IG51bGwpKSB7XG4gICAgICAgICAgICAvLyBXb3JrIGFyb3VuZCBodHRwczovL2dpdGh1Yi5jb20vd2hhdHdnL3N0cmVhbXMvYmxvYi8wZWJlNGIwNDJlNDY3ZDk4NzZkODBhZTA0NWRlMzg0MzA5MmFkNzk3L3JlZmVyZW5jZS1pbXBsZW1lbnRhdGlvbi9saWIvaGVscGVycy5qcyNMMTI2XG4gICAgICAgICAgICBjb250cm9sbGVyLmVucXVldWUoKGJ1Zi5idWZmZXIuYnl0ZUxlbmd0aCAhPT0gMCkgPyBidWYgOiBidWYuc2xpY2UoKSk7XG4gICAgICAgICAgICBpZiAoc2l6ZSAhPSBudWxsICYmIChzaXplIC09IGJ1Zi5ieXRlTGVuZ3RoKSA8PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHRvUmVhZGFibGVET01TdHJlYW08VD4oc291cmNlOiBJdGVyYWJsZTxUPiB8IEFzeW5jSXRlcmFibGU8VD4sIG9wdGlvbnM/OiBSZWFkYWJsZURPTVN0cmVhbU9wdGlvbnMpOiBSZWFkYWJsZVN0cmVhbTxUPiB7XG4gICAgaWYgKGlzQXN5bmNJdGVyYWJsZTxUPihzb3VyY2UpKSB7IHJldHVybiBhc3luY0l0ZXJhYmxlQXNSZWFkYWJsZURPTVN0cmVhbShzb3VyY2UsIG9wdGlvbnMpOyB9XG4gICAgaWYgKGlzSXRlcmFibGU8VD4oc291cmNlKSkgeyByZXR1cm4gaXRlcmFibGVBc1JlYWRhYmxlRE9NU3RyZWFtKHNvdXJjZSwgb3B0aW9ucyk7IH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYHRvUmVhZGFibGVET01TdHJlYW0oKSBtdXN0IGJlIGNhbGxlZCB3aXRoIGFuIEl0ZXJhYmxlIG9yIEFzeW5jSXRlcmFibGVgKTtcbn1cblxuZnVuY3Rpb24gaXRlcmFibGVBc1JlYWRhYmxlRE9NU3RyZWFtPFQ+KHNvdXJjZTogSXRlcmFibGU8VD4sIG9wdGlvbnM/OiBSZWFkYWJsZURPTVN0cmVhbU9wdGlvbnMpIHtcblxuICAgIGxldCBpdDogSXRlcmF0b3I8VD4gfCBudWxsID0gbnVsbDtcblxuICAgIHJldHVybiBuZXcgUmVhZGFibGVTdHJlYW08VD4oe1xuICAgICAgICAuLi5vcHRpb25zIGFzIGFueSxcbiAgICAgICAgc3RhcnQoY29udHJvbGxlcikgeyBuZXh0KGNvbnRyb2xsZXIsIGl0IHx8IChpdCA9IHNvdXJjZVtTeW1ib2wuaXRlcmF0b3JdKCkpKTsgfSxcbiAgICAgICAgcHVsbChjb250cm9sbGVyKSB7IGl0ID8gKG5leHQoY29udHJvbGxlciwgaXQpKSA6IGNvbnRyb2xsZXIuY2xvc2UoKTsgfSxcbiAgICAgICAgY2FuY2VsKCkgeyAoaXQgJiYgKGl0LnJldHVybiAmJiBpdC5yZXR1cm4oKSkgfHwgdHJ1ZSkgJiYgKGl0ID0gbnVsbCk7IH1cbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIG5leHQoY29udHJvbGxlcjogUmVhZGFibGVTdHJlYW1EZWZhdWx0Q29udHJvbGxlcjxUPiwgaXQ6IEl0ZXJhdG9yPFQ+KSB7XG4gICAgICAgIGxldCBzaXplID0gY29udHJvbGxlci5kZXNpcmVkU2l6ZTtcbiAgICAgICAgbGV0IHI6IEl0ZXJhdG9yUmVzdWx0PFQ+IHwgbnVsbCA9IG51bGw7XG4gICAgICAgIHdoaWxlICgoc2l6ZSA9PSBudWxsIHx8IHNpemUtLSA+IDApICYmICEociA9IGl0Lm5leHQoKSkuZG9uZSkge1xuICAgICAgICAgICAgY29udHJvbGxlci5lbnF1ZXVlKHIudmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHIgJiYgci5kb25lICYmIGNvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGFzeW5jSXRlcmFibGVBc1JlYWRhYmxlRE9NU3RyZWFtPFQ+KHNvdXJjZTogQXN5bmNJdGVyYWJsZTxUPiwgb3B0aW9ucz86IFJlYWRhYmxlRE9NU3RyZWFtT3B0aW9ucykge1xuXG4gICAgbGV0IGl0OiBBc3luY0l0ZXJhdG9yPFQ+IHwgbnVsbCA9IG51bGw7XG5cbiAgICByZXR1cm4gbmV3IFJlYWRhYmxlU3RyZWFtPFQ+KHtcbiAgICAgICAgLi4ub3B0aW9ucyBhcyBhbnksXG4gICAgICAgIGFzeW5jIHN0YXJ0KGNvbnRyb2xsZXIpIHsgYXdhaXQgbmV4dChjb250cm9sbGVyLCBpdCB8fCAoaXQgPSBzb3VyY2VbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCkpKTsgfSxcbiAgICAgICAgYXN5bmMgcHVsbChjb250cm9sbGVyKSB7IGl0ID8gKGF3YWl0IG5leHQoY29udHJvbGxlciwgaXQpKSA6IGNvbnRyb2xsZXIuY2xvc2UoKTsgfSxcbiAgICAgICAgYXN5bmMgY2FuY2VsKCkgeyAoaXQgJiYgKGl0LnJldHVybiAmJiBhd2FpdCBpdC5yZXR1cm4oKSkgfHwgdHJ1ZSkgJiYgKGl0ID0gbnVsbCk7IH0sXG4gICAgfSk7XG5cbiAgICBhc3luYyBmdW5jdGlvbiBuZXh0KGNvbnRyb2xsZXI6IFJlYWRhYmxlU3RyZWFtRGVmYXVsdENvbnRyb2xsZXI8VD4sIGl0OiBBc3luY0l0ZXJhdG9yPFQ+KSB7XG4gICAgICAgIGxldCBzaXplID0gY29udHJvbGxlci5kZXNpcmVkU2l6ZTtcbiAgICAgICAgbGV0IHI6IEl0ZXJhdG9yUmVzdWx0PFQ+IHwgbnVsbCA9IG51bGw7XG4gICAgICAgIHdoaWxlICgoc2l6ZSA9PSBudWxsIHx8IHNpemUtLSA+IDApICYmICEociA9IGF3YWl0IGl0Lm5leHQoKSkuZG9uZSkge1xuICAgICAgICAgICAgY29udHJvbGxlci5lbnF1ZXVlKHIudmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHIgJiYgci5kb25lICYmIGNvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICB9XG59XG4iXX0=

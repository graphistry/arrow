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
import * as File_ from '../../fb/File';
import { flatbuffers } from 'flatbuffers';
var Long = flatbuffers.Long;
var Builder = flatbuffers.Builder;
var ByteBuffer = flatbuffers.ByteBuffer;
var _Block = File_.org.apache.arrow.flatbuf.Block;
var _Footer = File_.org.apache.arrow.flatbuf.Footer;
import { Schema } from '../../schema';
import { MetadataVersion } from '../../enum';
import { toUint8Array } from '../../util/buffer';
/** @ignore */
class Footer_ {
    constructor(schema, version = MetadataVersion.V4, recordBatches, dictionaryBatches) {
        this.schema = schema;
        this.version = version;
        recordBatches && (this._recordBatches = recordBatches);
        dictionaryBatches && (this._dictionaryBatches = dictionaryBatches);
    }
    /** @nocollapse */
    static decode(buf) {
        buf = new ByteBuffer(toUint8Array(buf));
        const footer = _Footer.getRootAsFooter(buf);
        const schema = Schema.decode(footer.schema());
        return new OffHeapFooter(schema, footer);
    }
    /** @nocollapse */
    static encode(footer) {
        const b = new Builder();
        const schemaOffset = Schema.encode(b, footer.schema);
        _Footer.startRecordBatchesVector(b, footer.numRecordBatches);
        [...footer.recordBatches()].slice().reverse().forEach((rb) => FileBlock.encode(b, rb));
        const recordBatchesOffset = b.endVector();
        _Footer.startDictionariesVector(b, footer.numDictionaries);
        [...footer.dictionaryBatches()].slice().reverse().forEach((db) => FileBlock.encode(b, db));
        const dictionaryBatchesOffset = b.endVector();
        _Footer.startFooter(b);
        _Footer.addSchema(b, schemaOffset);
        _Footer.addVersion(b, MetadataVersion.V4);
        _Footer.addRecordBatches(b, recordBatchesOffset);
        _Footer.addDictionaries(b, dictionaryBatchesOffset);
        _Footer.finishFooterBuffer(b, _Footer.endFooter(b));
        return b.asUint8Array();
    }
    get numRecordBatches() { return this._recordBatches.length; }
    get numDictionaries() { return this._dictionaryBatches.length; }
    *recordBatches() {
        for (let block, i = -1, n = this.numRecordBatches; ++i < n;) {
            if (block = this.getRecordBatch(i)) {
                yield block;
            }
        }
    }
    *dictionaryBatches() {
        for (let block, i = -1, n = this.numDictionaries; ++i < n;) {
            if (block = this.getDictionaryBatch(i)) {
                yield block;
            }
        }
    }
    getRecordBatch(index) {
        return index >= 0
            && index < this.numRecordBatches
            && this._recordBatches[index] || null;
    }
    getDictionaryBatch(index) {
        return index >= 0
            && index < this.numDictionaries
            && this._dictionaryBatches[index] || null;
    }
}
export { Footer_ as Footer };
/** @ignore */
class OffHeapFooter extends Footer_ {
    constructor(schema, _footer) {
        super(schema, _footer.version());
        this._footer = _footer;
    }
    get numRecordBatches() { return this._footer.recordBatchesLength(); }
    get numDictionaries() { return this._footer.dictionariesLength(); }
    getRecordBatch(index) {
        if (index >= 0 && index < this.numRecordBatches) {
            const fileBlock = this._footer.recordBatches(index);
            if (fileBlock) {
                return FileBlock.decode(fileBlock);
            }
        }
        return null;
    }
    getDictionaryBatch(index) {
        if (index >= 0 && index < this.numDictionaries) {
            const fileBlock = this._footer.dictionaries(index);
            if (fileBlock) {
                return FileBlock.decode(fileBlock);
            }
        }
        return null;
    }
}
/** @ignore */
export class FileBlock {
    /** @nocollapse */
    static decode(block) {
        return new FileBlock(block.metaDataLength(), block.bodyLength(), block.offset());
    }
    /** @nocollapse */
    static encode(b, fileBlock) {
        const { metaDataLength } = fileBlock;
        const offset = new Long(fileBlock.offset, 0);
        const bodyLength = new Long(fileBlock.bodyLength, 0);
        return _Block.createBlock(b, offset, metaDataLength, bodyLength);
    }
    constructor(metaDataLength, bodyLength, offset) {
        this.metaDataLength = metaDataLength;
        this.offset = typeof offset === 'number' ? offset : offset.low;
        this.bodyLength = typeof bodyLength === 'number' ? bodyLength : bodyLength.low;
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sVUFBVSxHQUFHLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDckQsT0FBTyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFNRCxZQUFZLGNBQXNCLEVBQUUsVUFBeUIsRUFBRSxNQUFxQjtRQUNoRixJQUFJLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQztRQUNyQyxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sTUFBTSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO1FBQy9ELElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxVQUFVLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7SUFDbkYsQ0FBQztDQUNKIiwiZmlsZSI6ImlwYy9tZXRhZGF0YS9maWxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbi8qIHRzbGludDpkaXNhYmxlOmNsYXNzLW5hbWUgKi9cblxuaW1wb3J0ICogYXMgRmlsZV8gZnJvbSAnLi4vLi4vZmIvRmlsZSc7XG5pbXBvcnQgeyBmbGF0YnVmZmVycyB9IGZyb20gJ2ZsYXRidWZmZXJzJztcblxuaW1wb3J0IExvbmcgPSBmbGF0YnVmZmVycy5Mb25nO1xuaW1wb3J0IEJ1aWxkZXIgPSBmbGF0YnVmZmVycy5CdWlsZGVyO1xuaW1wb3J0IEJ5dGVCdWZmZXIgPSBmbGF0YnVmZmVycy5CeXRlQnVmZmVyO1xuaW1wb3J0IF9CbG9jayA9IEZpbGVfLm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5CbG9jaztcbmltcG9ydCBfRm9vdGVyID0gRmlsZV8ub3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkZvb3RlcjtcblxuaW1wb3J0IHsgU2NoZW1hIH0gZnJvbSAnLi4vLi4vc2NoZW1hJztcbmltcG9ydCB7IE1ldGFkYXRhVmVyc2lvbiB9IGZyb20gJy4uLy4uL2VudW0nO1xuaW1wb3J0IHsgdG9VaW50OEFycmF5IH0gZnJvbSAnLi4vLi4vdXRpbC9idWZmZXInO1xuaW1wb3J0IHsgQXJyYXlCdWZmZXJWaWV3SW5wdXQgfSBmcm9tICcuLi8uLi91dGlsL2J1ZmZlcic7XG5cbi8qKiBAaWdub3JlICovXG5jbGFzcyBGb290ZXJfIHtcblxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZGVjb2RlKGJ1ZjogQXJyYXlCdWZmZXJWaWV3SW5wdXQpIHtcbiAgICAgICAgYnVmID0gbmV3IEJ5dGVCdWZmZXIodG9VaW50OEFycmF5KGJ1ZikpO1xuICAgICAgICBjb25zdCBmb290ZXIgPSBfRm9vdGVyLmdldFJvb3RBc0Zvb3RlcihidWYpO1xuICAgICAgICBjb25zdCBzY2hlbWEgPSBTY2hlbWEuZGVjb2RlKGZvb3Rlci5zY2hlbWEoKSEpO1xuICAgICAgICByZXR1cm4gbmV3IE9mZkhlYXBGb290ZXIoc2NoZW1hLCBmb290ZXIpIGFzIEZvb3Rlcl87XG4gICAgfVxuXG4gICAgLyoqIEBub2NvbGxhcHNlICovXG4gICAgcHVibGljIHN0YXRpYyBlbmNvZGUoZm9vdGVyOiBGb290ZXJfKSB7XG5cbiAgICAgICAgY29uc3QgYjogQnVpbGRlciA9IG5ldyBCdWlsZGVyKCk7XG4gICAgICAgIGNvbnN0IHNjaGVtYU9mZnNldCA9IFNjaGVtYS5lbmNvZGUoYiwgZm9vdGVyLnNjaGVtYSk7XG5cbiAgICAgICAgX0Zvb3Rlci5zdGFydFJlY29yZEJhdGNoZXNWZWN0b3IoYiwgZm9vdGVyLm51bVJlY29yZEJhdGNoZXMpO1xuICAgICAgICBbLi4uZm9vdGVyLnJlY29yZEJhdGNoZXMoKV0uc2xpY2UoKS5yZXZlcnNlKCkuZm9yRWFjaCgocmIpID0+IEZpbGVCbG9jay5lbmNvZGUoYiwgcmIpKTtcbiAgICAgICAgY29uc3QgcmVjb3JkQmF0Y2hlc09mZnNldCA9IGIuZW5kVmVjdG9yKCk7XG5cbiAgICAgICAgX0Zvb3Rlci5zdGFydERpY3Rpb25hcmllc1ZlY3RvcihiLCBmb290ZXIubnVtRGljdGlvbmFyaWVzKTtcbiAgICAgICAgWy4uLmZvb3Rlci5kaWN0aW9uYXJ5QmF0Y2hlcygpXS5zbGljZSgpLnJldmVyc2UoKS5mb3JFYWNoKChkYikgPT4gRmlsZUJsb2NrLmVuY29kZShiLCBkYikpO1xuXG4gICAgICAgIGNvbnN0IGRpY3Rpb25hcnlCYXRjaGVzT2Zmc2V0ID0gYi5lbmRWZWN0b3IoKTtcblxuICAgICAgICBfRm9vdGVyLnN0YXJ0Rm9vdGVyKGIpO1xuICAgICAgICBfRm9vdGVyLmFkZFNjaGVtYShiLCBzY2hlbWFPZmZzZXQpO1xuICAgICAgICBfRm9vdGVyLmFkZFZlcnNpb24oYiwgTWV0YWRhdGFWZXJzaW9uLlY0KTtcbiAgICAgICAgX0Zvb3Rlci5hZGRSZWNvcmRCYXRjaGVzKGIsIHJlY29yZEJhdGNoZXNPZmZzZXQpO1xuICAgICAgICBfRm9vdGVyLmFkZERpY3Rpb25hcmllcyhiLCBkaWN0aW9uYXJ5QmF0Y2hlc09mZnNldCk7XG4gICAgICAgIF9Gb290ZXIuZmluaXNoRm9vdGVyQnVmZmVyKGIsIF9Gb290ZXIuZW5kRm9vdGVyKGIpKTtcblxuICAgICAgICByZXR1cm4gYi5hc1VpbnQ4QXJyYXkoKTtcbiAgICB9XG5cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHJvdGVjdGVkIF9yZWNvcmRCYXRjaGVzOiBGaWxlQmxvY2tbXTtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcHJvdGVjdGVkIF9kaWN0aW9uYXJ5QmF0Y2hlczogRmlsZUJsb2NrW107XG4gICAgcHVibGljIGdldCBudW1SZWNvcmRCYXRjaGVzKCkgeyByZXR1cm4gdGhpcy5fcmVjb3JkQmF0Y2hlcy5sZW5ndGg7IH1cbiAgICBwdWJsaWMgZ2V0IG51bURpY3Rpb25hcmllcygpIHsgcmV0dXJuIHRoaXMuX2RpY3Rpb25hcnlCYXRjaGVzLmxlbmd0aDsgfVxuXG4gICAgY29uc3RydWN0b3IocHVibGljIHNjaGVtYTogU2NoZW1hLFxuICAgICAgICAgICAgICAgIHB1YmxpYyB2ZXJzaW9uOiBNZXRhZGF0YVZlcnNpb24gPSBNZXRhZGF0YVZlcnNpb24uVjQsXG4gICAgICAgICAgICAgICAgcmVjb3JkQmF0Y2hlcz86IEZpbGVCbG9ja1tdLCBkaWN0aW9uYXJ5QmF0Y2hlcz86IEZpbGVCbG9ja1tdKSB7XG4gICAgICAgIHJlY29yZEJhdGNoZXMgJiYgKHRoaXMuX3JlY29yZEJhdGNoZXMgPSByZWNvcmRCYXRjaGVzKTtcbiAgICAgICAgZGljdGlvbmFyeUJhdGNoZXMgJiYgKHRoaXMuX2RpY3Rpb25hcnlCYXRjaGVzID0gZGljdGlvbmFyeUJhdGNoZXMpO1xuICAgIH1cblxuICAgIHB1YmxpYyAqcmVjb3JkQmF0Y2hlcygpOiBJdGVyYWJsZTxGaWxlQmxvY2s+IHtcbiAgICAgICAgZm9yIChsZXQgYmxvY2ssIGkgPSAtMSwgbiA9IHRoaXMubnVtUmVjb3JkQmF0Y2hlczsgKytpIDwgbjspIHtcbiAgICAgICAgICAgIGlmIChibG9jayA9IHRoaXMuZ2V0UmVjb3JkQmF0Y2goaSkpIHsgeWllbGQgYmxvY2s7IH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyAqZGljdGlvbmFyeUJhdGNoZXMoKTogSXRlcmFibGU8RmlsZUJsb2NrPiB7XG4gICAgICAgIGZvciAobGV0IGJsb2NrLCBpID0gLTEsIG4gPSB0aGlzLm51bURpY3Rpb25hcmllczsgKytpIDwgbjspIHtcbiAgICAgICAgICAgIGlmIChibG9jayA9IHRoaXMuZ2V0RGljdGlvbmFyeUJhdGNoKGkpKSB7IHlpZWxkIGJsb2NrOyB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0UmVjb3JkQmF0Y2goaW5kZXg6IG51bWJlcikge1xuICAgICAgICByZXR1cm4gaW5kZXggPj0gMFxuICAgICAgICAgICAgJiYgaW5kZXggPCB0aGlzLm51bVJlY29yZEJhdGNoZXNcbiAgICAgICAgICAgICYmIHRoaXMuX3JlY29yZEJhdGNoZXNbaW5kZXhdIHx8IG51bGw7XG4gICAgfVxuXG4gICAgcHVibGljIGdldERpY3Rpb25hcnlCYXRjaChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIHJldHVybiBpbmRleCA+PSAwXG4gICAgICAgICAgICAmJiBpbmRleCA8IHRoaXMubnVtRGljdGlvbmFyaWVzXG4gICAgICAgICAgICAmJiB0aGlzLl9kaWN0aW9uYXJ5QmF0Y2hlc1tpbmRleF0gfHwgbnVsbDtcbiAgICB9XG59XG5cbmV4cG9ydCB7IEZvb3Rlcl8gYXMgRm9vdGVyIH07XG5cbi8qKiBAaWdub3JlICovXG5jbGFzcyBPZmZIZWFwRm9vdGVyIGV4dGVuZHMgRm9vdGVyXyB7XG5cbiAgICBwdWJsaWMgZ2V0IG51bVJlY29yZEJhdGNoZXMoKSB7IHJldHVybiB0aGlzLl9mb290ZXIucmVjb3JkQmF0Y2hlc0xlbmd0aCgpOyB9XG4gICAgcHVibGljIGdldCBudW1EaWN0aW9uYXJpZXMoKSB7IHJldHVybiB0aGlzLl9mb290ZXIuZGljdGlvbmFyaWVzTGVuZ3RoKCk7IH1cblxuICAgIGNvbnN0cnVjdG9yKHNjaGVtYTogU2NoZW1hLCBwcm90ZWN0ZWQgX2Zvb3RlcjogX0Zvb3Rlcikge1xuICAgICAgICBzdXBlcihzY2hlbWEsIF9mb290ZXIudmVyc2lvbigpKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0UmVjb3JkQmF0Y2goaW5kZXg6IG51bWJlcikge1xuICAgICAgICBpZiAoaW5kZXggPj0gMCAmJiBpbmRleCA8IHRoaXMubnVtUmVjb3JkQmF0Y2hlcykge1xuICAgICAgICAgICAgY29uc3QgZmlsZUJsb2NrID0gdGhpcy5fZm9vdGVyLnJlY29yZEJhdGNoZXMoaW5kZXgpO1xuICAgICAgICAgICAgaWYgKGZpbGVCbG9jaykgeyByZXR1cm4gRmlsZUJsb2NrLmRlY29kZShmaWxlQmxvY2spOyB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcHVibGljIGdldERpY3Rpb25hcnlCYXRjaChpbmRleDogbnVtYmVyKSB7XG4gICAgICAgIGlmIChpbmRleCA+PSAwICYmIGluZGV4IDwgdGhpcy5udW1EaWN0aW9uYXJpZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVCbG9jayA9IHRoaXMuX2Zvb3Rlci5kaWN0aW9uYXJpZXMoaW5kZXgpO1xuICAgICAgICAgICAgaWYgKGZpbGVCbG9jaykgeyByZXR1cm4gRmlsZUJsb2NrLmRlY29kZShmaWxlQmxvY2spOyB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufVxuXG4vKiogQGlnbm9yZSAqL1xuZXhwb3J0IGNsYXNzIEZpbGVCbG9jayB7XG5cbiAgICAvKiogQG5vY29sbGFwc2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGRlY29kZShibG9jazogX0Jsb2NrKSB7XG4gICAgICAgIHJldHVybiBuZXcgRmlsZUJsb2NrKGJsb2NrLm1ldGFEYXRhTGVuZ3RoKCksIGJsb2NrLmJvZHlMZW5ndGgoKSwgYmxvY2sub2Zmc2V0KCkpO1xuICAgIH1cblxuICAgIC8qKiBAbm9jb2xsYXBzZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZW5jb2RlKGI6IEJ1aWxkZXIsIGZpbGVCbG9jazogRmlsZUJsb2NrKSB7XG4gICAgICAgIGNvbnN0IHsgbWV0YURhdGFMZW5ndGggfSA9IGZpbGVCbG9jaztcbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0gbmV3IExvbmcoZmlsZUJsb2NrLm9mZnNldCwgMCk7XG4gICAgICAgIGNvbnN0IGJvZHlMZW5ndGggPSBuZXcgTG9uZyhmaWxlQmxvY2suYm9keUxlbmd0aCwgMCk7XG4gICAgICAgIHJldHVybiBfQmxvY2suY3JlYXRlQmxvY2soYiwgb2Zmc2V0LCBtZXRhRGF0YUxlbmd0aCwgYm9keUxlbmd0aCk7XG4gICAgfVxuXG4gICAgcHVibGljIG9mZnNldDogbnVtYmVyO1xuICAgIHB1YmxpYyBib2R5TGVuZ3RoOiBudW1iZXI7XG4gICAgcHVibGljIG1ldGFEYXRhTGVuZ3RoOiBudW1iZXI7XG5cbiAgICBjb25zdHJ1Y3RvcihtZXRhRGF0YUxlbmd0aDogbnVtYmVyLCBib2R5TGVuZ3RoOiBMb25nIHwgbnVtYmVyLCBvZmZzZXQ6IExvbmcgfCBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5tZXRhRGF0YUxlbmd0aCA9IG1ldGFEYXRhTGVuZ3RoO1xuICAgICAgICB0aGlzLm9mZnNldCA9IHR5cGVvZiBvZmZzZXQgPT09ICdudW1iZXInID8gb2Zmc2V0IDogb2Zmc2V0LmxvdztcbiAgICAgICAgdGhpcy5ib2R5TGVuZ3RoID0gdHlwZW9mIGJvZHlMZW5ndGggPT09ICdudW1iZXInID8gYm9keUxlbmd0aCA6IGJvZHlMZW5ndGgubG93O1xuICAgIH1cbn1cbiJdfQ==
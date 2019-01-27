// automatically generated by the FlatBuffers compiler, do not modify
import * as NS16187549871986683199 from './Schema';
/**
 * ----------------------------------------------------------------------
 * Arrow File metadata
 *
 *
 * @constructor
 */
export var org;
(function (org) {
    var apache;
    (function (apache) {
        var arrow;
        (function (arrow) {
            var flatbuf;
            (function (flatbuf) {
                class Footer {
                    constructor() {
                        /**
                         * @type {number}
                         */
                        this.bb_pos = 0;
                    }
                    /**
                     * @param {number} i
                     * @param {flatbuffers.ByteBuffer} bb
                     * @returns {Footer}
                     */
                    __init(i, bb) {
                        this.bb_pos = i;
                        this.bb = bb;
                        return this;
                    }
                    /**
                     * @param {flatbuffers.ByteBuffer} bb
                     * @param {Footer=} obj
                     * @returns {Footer}
                     */
                    static getRootAsFooter(bb, obj) {
                        return (obj || new Footer).__init(bb.readInt32(bb.position()) + bb.position(), bb);
                    }
                    /**
                     * @returns {org.apache.arrow.flatbuf.MetadataVersion}
                     */
                    version() {
                        let offset = this.bb.__offset(this.bb_pos, 4);
                        return offset ? /** @type {org.apache.arrow.flatbuf.MetadataVersion} */ (this.bb.readInt16(this.bb_pos + offset)) : NS16187549871986683199.org.apache.arrow.flatbuf.MetadataVersion.V1;
                    }
                    /**
                     * @param {org.apache.arrow.flatbuf.Schema=} obj
                     * @returns {org.apache.arrow.flatbuf.Schema|null}
                     */
                    schema(obj) {
                        let offset = this.bb.__offset(this.bb_pos, 6);
                        return offset ? (obj || new NS16187549871986683199.org.apache.arrow.flatbuf.Schema).__init(this.bb.__indirect(this.bb_pos + offset), this.bb) : null;
                    }
                    /**
                     * @param {number} index
                     * @param {org.apache.arrow.flatbuf.Block=} obj
                     * @returns {org.apache.arrow.flatbuf.Block}
                     */
                    dictionaries(index, obj) {
                        let offset = this.bb.__offset(this.bb_pos, 8);
                        return offset ? (obj || new org.apache.arrow.flatbuf.Block).__init(this.bb.__vector(this.bb_pos + offset) + index * 24, this.bb) : null;
                    }
                    /**
                     * @returns {number}
                     */
                    dictionariesLength() {
                        let offset = this.bb.__offset(this.bb_pos, 8);
                        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
                    }
                    /**
                     * @param {number} index
                     * @param {org.apache.arrow.flatbuf.Block=} obj
                     * @returns {org.apache.arrow.flatbuf.Block}
                     */
                    recordBatches(index, obj) {
                        let offset = this.bb.__offset(this.bb_pos, 10);
                        return offset ? (obj || new org.apache.arrow.flatbuf.Block).__init(this.bb.__vector(this.bb_pos + offset) + index * 24, this.bb) : null;
                    }
                    /**
                     * @returns {number}
                     */
                    recordBatchesLength() {
                        let offset = this.bb.__offset(this.bb_pos, 10);
                        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
                    }
                    /**
                     * @param {flatbuffers.Builder} builder
                     */
                    static startFooter(builder) {
                        builder.startObject(4);
                    }
                    /**
                     * @param {flatbuffers.Builder} builder
                     * @param {org.apache.arrow.flatbuf.MetadataVersion} version
                     */
                    static addVersion(builder, version) {
                        builder.addFieldInt16(0, version, NS16187549871986683199.org.apache.arrow.flatbuf.MetadataVersion.V1);
                    }
                    /**
                     * @param {flatbuffers.Builder} builder
                     * @param {flatbuffers.Offset} schemaOffset
                     */
                    static addSchema(builder, schemaOffset) {
                        builder.addFieldOffset(1, schemaOffset, 0);
                    }
                    /**
                     * @param {flatbuffers.Builder} builder
                     * @param {flatbuffers.Offset} dictionariesOffset
                     */
                    static addDictionaries(builder, dictionariesOffset) {
                        builder.addFieldOffset(2, dictionariesOffset, 0);
                    }
                    /**
                     * @param {flatbuffers.Builder} builder
                     * @param {number} numElems
                     */
                    static startDictionariesVector(builder, numElems) {
                        builder.startVector(24, numElems, 8);
                    }
                    /**
                     * @param {flatbuffers.Builder} builder
                     * @param {flatbuffers.Offset} recordBatchesOffset
                     */
                    static addRecordBatches(builder, recordBatchesOffset) {
                        builder.addFieldOffset(3, recordBatchesOffset, 0);
                    }
                    /**
                     * @param {flatbuffers.Builder} builder
                     * @param {number} numElems
                     */
                    static startRecordBatchesVector(builder, numElems) {
                        builder.startVector(24, numElems, 8);
                    }
                    /**
                     * @param {flatbuffers.Builder} builder
                     * @returns {flatbuffers.Offset}
                     */
                    static endFooter(builder) {
                        let offset = builder.endObject();
                        return offset;
                    }
                    /**
                     * @param {flatbuffers.Builder} builder
                     * @param {flatbuffers.Offset} offset
                     */
                    static finishFooterBuffer(builder, offset) {
                        builder.finish(offset);
                    }
                }
                flatbuf.Footer = Footer;
            })(flatbuf = arrow.flatbuf || (arrow.flatbuf = {}));
        })(arrow = apache.arrow || (apache.arrow = {}));
    })(apache = org.apache || (org.apache = {}));
})(org || (org = {}));
/**
 * @constructor
 */
(function (org) {
    var apache;
    (function (apache) {
        var arrow;
        (function (arrow) {
            var flatbuf;
            (function (flatbuf) {
                class Block {
                    constructor() {
                        /**
                         * @type {number}
                         */
                        this.bb_pos = 0;
                    }
                    /**
                     * @param {number} i
                     * @param {flatbuffers.ByteBuffer} bb
                     * @returns {Block}
                     */
                    __init(i, bb) {
                        this.bb_pos = i;
                        this.bb = bb;
                        return this;
                    }
                    /**
                     * Index to the start of the RecordBlock (note this is past the Message header)
                     *
                     * @returns {flatbuffers.Long}
                     */
                    offset() {
                        return this.bb.readInt64(this.bb_pos);
                    }
                    /**
                     * Length of the metadata
                     *
                     * @returns {number}
                     */
                    metaDataLength() {
                        return this.bb.readInt32(this.bb_pos + 8);
                    }
                    /**
                     * Length of the data (this is aligned so there can be a gap between this and
                     * the metatdata).
                     *
                     * @returns {flatbuffers.Long}
                     */
                    bodyLength() {
                        return this.bb.readInt64(this.bb_pos + 16);
                    }
                    /**
                     * @param {flatbuffers.Builder} builder
                     * @param {flatbuffers.Long} offset
                     * @param {number} metaDataLength
                     * @param {flatbuffers.Long} bodyLength
                     * @returns {flatbuffers.Offset}
                     */
                    static createBlock(builder, offset, metaDataLength, bodyLength) {
                        builder.prep(8, 24);
                        builder.writeInt64(bodyLength);
                        builder.pad(4);
                        builder.writeInt32(metaDataLength);
                        builder.writeInt64(offset);
                        return builder.offset();
                    }
                }
                flatbuf.Block = Block;
            })(flatbuf = arrow.flatbuf || (arrow.flatbuf = {}));
        })(arrow = apache.arrow || (apache.arrow = {}));
    })(apache = org.apache || (org.apache = {}));
})(org || (org = {}));

//# sourceMappingURL=data:application/json;charset=utf8;base64,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L0ZpbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBhdXRvbWF0aWNhbGx5IGdlbmVyYXRlZCBieSB0aGUgRmxhdEJ1ZmZlcnMgY29tcGlsZXIsIGRvIG5vdCBtb2RpZnlcblxuaW1wb3J0IHsgZmxhdGJ1ZmZlcnMgfSBmcm9tICdmbGF0YnVmZmVycyc7XG5pbXBvcnQgKiBhcyBOUzE2MTg3NTQ5ODcxOTg2NjgzMTk5IGZyb20gJy4vU2NoZW1hJztcbi8qKlxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogQXJyb3cgRmlsZSBtZXRhZGF0YVxuICpcbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZXhwb3J0IG5hbWVzcGFjZSBvcmcuYXBhY2hlLmFycm93LmZsYXRidWYge1xuICBleHBvcnQgY2xhc3MgRm9vdGVyIHtcbiAgICAvKipcbiAgICAgKiBAdHlwZSB7ZmxhdGJ1ZmZlcnMuQnl0ZUJ1ZmZlcn1cbiAgICAgKi9cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgYmI6IGZsYXRidWZmZXJzLkJ5dGVCdWZmZXI7XG5cbiAgICAvKipcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIGJiX3BvczogbnVtYmVyID0gMDtcbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gaVxuICAgICAqIEBwYXJhbSB7ZmxhdGJ1ZmZlcnMuQnl0ZUJ1ZmZlcn0gYmJcbiAgICAgKiBAcmV0dXJucyB7Rm9vdGVyfVxuICAgICAqL1xuICAgIF9faW5pdChpOiBudW1iZXIsIGJiOiBmbGF0YnVmZmVycy5CeXRlQnVmZmVyKTogRm9vdGVyIHtcbiAgICAgIHRoaXMuYmJfcG9zID0gaTtcbiAgICAgIHRoaXMuYmIgPSBiYjtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7ZmxhdGJ1ZmZlcnMuQnl0ZUJ1ZmZlcn0gYmJcbiAgICAgKiBAcGFyYW0ge0Zvb3Rlcj19IG9ialxuICAgICAqIEByZXR1cm5zIHtGb290ZXJ9XG4gICAgICovXG4gICAgc3RhdGljIGdldFJvb3RBc0Zvb3RlcihiYjogZmxhdGJ1ZmZlcnMuQnl0ZUJ1ZmZlciwgb2JqPzogRm9vdGVyKTogRm9vdGVyIHtcbiAgICAgIHJldHVybiAob2JqIHx8IG5ldyBGb290ZXIpLl9faW5pdChiYi5yZWFkSW50MzIoYmIucG9zaXRpb24oKSkgKyBiYi5wb3NpdGlvbigpLCBiYik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHJldHVybnMge29yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NZXRhZGF0YVZlcnNpb259XG4gICAgICovXG4gICAgdmVyc2lvbigpOiBOUzE2MTg3NTQ5ODcxOTg2NjgzMTk5Lm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NZXRhZGF0YVZlcnNpb24ge1xuICAgICAgbGV0IG9mZnNldCA9IHRoaXMuYmIuX19vZmZzZXQodGhpcy5iYl9wb3MsIDQpO1xuICAgICAgcmV0dXJuIG9mZnNldCA/IC8qKiBAdHlwZSB7b3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLk1ldGFkYXRhVmVyc2lvbn0gKi8gKHRoaXMuYmIucmVhZEludDE2KHRoaXMuYmJfcG9zICsgb2Zmc2V0KSkgOiBOUzE2MTg3NTQ5ODcxOTg2NjgzMTk5Lm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NZXRhZGF0YVZlcnNpb24uVjE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtvcmcuYXBhY2hlLmFycm93LmZsYXRidWYuU2NoZW1hPX0gb2JqXG4gICAgICogQHJldHVybnMge29yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5TY2hlbWF8bnVsbH1cbiAgICAgKi9cbiAgICBzY2hlbWEob2JqPzogTlMxNjE4NzU0OTg3MTk4NjY4MzE5OS5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuU2NoZW1hKTogTlMxNjE4NzU0OTg3MTk4NjY4MzE5OS5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuU2NoZW1hIHwgbnVsbCB7XG4gICAgICBsZXQgb2Zmc2V0ID0gdGhpcy5iYi5fX29mZnNldCh0aGlzLmJiX3BvcywgNik7XG4gICAgICByZXR1cm4gb2Zmc2V0ID8gKG9iaiB8fCBuZXcgTlMxNjE4NzU0OTg3MTk4NjY4MzE5OS5vcmcuYXBhY2hlLmFycm93LmZsYXRidWYuU2NoZW1hKS5fX2luaXQodGhpcy5iYi5fX2luZGlyZWN0KHRoaXMuYmJfcG9zICsgb2Zmc2V0KSwgdGhpcy5iYikgOiBudWxsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBpbmRleFxuICAgICAqIEBwYXJhbSB7b3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkJsb2NrPX0gb2JqXG4gICAgICogQHJldHVybnMge29yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5CbG9ja31cbiAgICAgKi9cbiAgICBkaWN0aW9uYXJpZXMoaW5kZXg6IG51bWJlciwgb2JqPzogb3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkJsb2NrKTogb3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkJsb2NrIHwgbnVsbCB7XG4gICAgICBsZXQgb2Zmc2V0ID0gdGhpcy5iYi5fX29mZnNldCh0aGlzLmJiX3BvcywgOCk7XG4gICAgICByZXR1cm4gb2Zmc2V0ID8gKG9iaiB8fCBuZXcgb3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkJsb2NrKS5fX2luaXQodGhpcy5iYi5fX3ZlY3Rvcih0aGlzLmJiX3BvcyArIG9mZnNldCkgKyBpbmRleCAqIDI0LCB0aGlzLmJiKSA6IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBkaWN0aW9uYXJpZXNMZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgIGxldCBvZmZzZXQgPSB0aGlzLmJiLl9fb2Zmc2V0KHRoaXMuYmJfcG9zLCA4KTtcbiAgICAgIHJldHVybiBvZmZzZXQgPyB0aGlzLmJiLl9fdmVjdG9yX2xlbih0aGlzLmJiX3BvcyArIG9mZnNldCkgOiAwO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBpbmRleFxuICAgICAqIEBwYXJhbSB7b3JnLmFwYWNoZS5hcnJvdy5mbGF0YnVmLkJsb2NrPX0gb2JqXG4gICAgICogQHJldHVybnMge29yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5CbG9ja31cbiAgICAgKi9cbiAgICByZWNvcmRCYXRjaGVzKGluZGV4OiBudW1iZXIsIG9iaj86IG9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5CbG9jayk6IG9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5CbG9jayB8IG51bGwge1xuICAgICAgbGV0IG9mZnNldCA9IHRoaXMuYmIuX19vZmZzZXQodGhpcy5iYl9wb3MsIDEwKTtcbiAgICAgIHJldHVybiBvZmZzZXQgPyAob2JqIHx8IG5ldyBvcmcuYXBhY2hlLmFycm93LmZsYXRidWYuQmxvY2spLl9faW5pdCh0aGlzLmJiLl9fdmVjdG9yKHRoaXMuYmJfcG9zICsgb2Zmc2V0KSArIGluZGV4ICogMjQsIHRoaXMuYmIpIDogbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIHJlY29yZEJhdGNoZXNMZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgIGxldCBvZmZzZXQgPSB0aGlzLmJiLl9fb2Zmc2V0KHRoaXMuYmJfcG9zLCAxMCk7XG4gICAgICByZXR1cm4gb2Zmc2V0ID8gdGhpcy5iYi5fX3ZlY3Rvcl9sZW4odGhpcy5iYl9wb3MgKyBvZmZzZXQpIDogMDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge2ZsYXRidWZmZXJzLkJ1aWxkZXJ9IGJ1aWxkZXJcbiAgICAgKi9cbiAgICBzdGF0aWMgc3RhcnRGb290ZXIoYnVpbGRlcjogZmxhdGJ1ZmZlcnMuQnVpbGRlcikge1xuICAgICAgYnVpbGRlci5zdGFydE9iamVjdCg0KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge2ZsYXRidWZmZXJzLkJ1aWxkZXJ9IGJ1aWxkZXJcbiAgICAgKiBAcGFyYW0ge29yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NZXRhZGF0YVZlcnNpb259IHZlcnNpb25cbiAgICAgKi9cbiAgICBzdGF0aWMgYWRkVmVyc2lvbihidWlsZGVyOiBmbGF0YnVmZmVycy5CdWlsZGVyLCB2ZXJzaW9uOiBOUzE2MTg3NTQ5ODcxOTg2NjgzMTk5Lm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NZXRhZGF0YVZlcnNpb24pIHtcbiAgICAgIGJ1aWxkZXIuYWRkRmllbGRJbnQxNigwLCB2ZXJzaW9uLCBOUzE2MTg3NTQ5ODcxOTg2NjgzMTk5Lm9yZy5hcGFjaGUuYXJyb3cuZmxhdGJ1Zi5NZXRhZGF0YVZlcnNpb24uVjEpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7ZmxhdGJ1ZmZlcnMuQnVpbGRlcn0gYnVpbGRlclxuICAgICAqIEBwYXJhbSB7ZmxhdGJ1ZmZlcnMuT2Zmc2V0fSBzY2hlbWFPZmZzZXRcbiAgICAgKi9cbiAgICBzdGF0aWMgYWRkU2NoZW1hKGJ1aWxkZXI6IGZsYXRidWZmZXJzLkJ1aWxkZXIsIHNjaGVtYU9mZnNldDogZmxhdGJ1ZmZlcnMuT2Zmc2V0KSB7XG4gICAgICBidWlsZGVyLmFkZEZpZWxkT2Zmc2V0KDEsIHNjaGVtYU9mZnNldCwgMCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtmbGF0YnVmZmVycy5CdWlsZGVyfSBidWlsZGVyXG4gICAgICogQHBhcmFtIHtmbGF0YnVmZmVycy5PZmZzZXR9IGRpY3Rpb25hcmllc09mZnNldFxuICAgICAqL1xuICAgIHN0YXRpYyBhZGREaWN0aW9uYXJpZXMoYnVpbGRlcjogZmxhdGJ1ZmZlcnMuQnVpbGRlciwgZGljdGlvbmFyaWVzT2Zmc2V0OiBmbGF0YnVmZmVycy5PZmZzZXQpIHtcbiAgICAgIGJ1aWxkZXIuYWRkRmllbGRPZmZzZXQoMiwgZGljdGlvbmFyaWVzT2Zmc2V0LCAwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge2ZsYXRidWZmZXJzLkJ1aWxkZXJ9IGJ1aWxkZXJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbnVtRWxlbXNcbiAgICAgKi9cbiAgICBzdGF0aWMgc3RhcnREaWN0aW9uYXJpZXNWZWN0b3IoYnVpbGRlcjogZmxhdGJ1ZmZlcnMuQnVpbGRlciwgbnVtRWxlbXM6IG51bWJlcikge1xuICAgICAgYnVpbGRlci5zdGFydFZlY3RvcigyNCwgbnVtRWxlbXMsIDgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7ZmxhdGJ1ZmZlcnMuQnVpbGRlcn0gYnVpbGRlclxuICAgICAqIEBwYXJhbSB7ZmxhdGJ1ZmZlcnMuT2Zmc2V0fSByZWNvcmRCYXRjaGVzT2Zmc2V0XG4gICAgICovXG4gICAgc3RhdGljIGFkZFJlY29yZEJhdGNoZXMoYnVpbGRlcjogZmxhdGJ1ZmZlcnMuQnVpbGRlciwgcmVjb3JkQmF0Y2hlc09mZnNldDogZmxhdGJ1ZmZlcnMuT2Zmc2V0KSB7XG4gICAgICBidWlsZGVyLmFkZEZpZWxkT2Zmc2V0KDMsIHJlY29yZEJhdGNoZXNPZmZzZXQsIDApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7ZmxhdGJ1ZmZlcnMuQnVpbGRlcn0gYnVpbGRlclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBudW1FbGVtc1xuICAgICAqL1xuICAgIHN0YXRpYyBzdGFydFJlY29yZEJhdGNoZXNWZWN0b3IoYnVpbGRlcjogZmxhdGJ1ZmZlcnMuQnVpbGRlciwgbnVtRWxlbXM6IG51bWJlcikge1xuICAgICAgYnVpbGRlci5zdGFydFZlY3RvcigyNCwgbnVtRWxlbXMsIDgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7ZmxhdGJ1ZmZlcnMuQnVpbGRlcn0gYnVpbGRlclxuICAgICAqIEByZXR1cm5zIHtmbGF0YnVmZmVycy5PZmZzZXR9XG4gICAgICovXG4gICAgc3RhdGljIGVuZEZvb3RlcihidWlsZGVyOiBmbGF0YnVmZmVycy5CdWlsZGVyKTogZmxhdGJ1ZmZlcnMuT2Zmc2V0IHtcbiAgICAgIGxldCBvZmZzZXQgPSBidWlsZGVyLmVuZE9iamVjdCgpO1xuICAgICAgcmV0dXJuIG9mZnNldDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge2ZsYXRidWZmZXJzLkJ1aWxkZXJ9IGJ1aWxkZXJcbiAgICAgKiBAcGFyYW0ge2ZsYXRidWZmZXJzLk9mZnNldH0gb2Zmc2V0XG4gICAgICovXG4gICAgc3RhdGljIGZpbmlzaEZvb3RlckJ1ZmZlcihidWlsZGVyOiBmbGF0YnVmZmVycy5CdWlsZGVyLCBvZmZzZXQ6IGZsYXRidWZmZXJzLk9mZnNldCkge1xuICAgICAgYnVpbGRlci5maW5pc2gob2Zmc2V0KTtcbiAgICB9XG5cbiAgfVxufVxuLyoqXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZXhwb3J0IG5hbWVzcGFjZSBvcmcuYXBhY2hlLmFycm93LmZsYXRidWYge1xuICBleHBvcnQgY2xhc3MgQmxvY2sge1xuICAgIC8qKlxuICAgICAqIEB0eXBlIHtmbGF0YnVmZmVycy5CeXRlQnVmZmVyfVxuICAgICAqL1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBiYjogZmxhdGJ1ZmZlcnMuQnl0ZUJ1ZmZlcjtcblxuICAgIC8qKlxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgYmJfcG9zOiBudW1iZXIgPSAwO1xuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBpXG4gICAgICogQHBhcmFtIHtmbGF0YnVmZmVycy5CeXRlQnVmZmVyfSBiYlxuICAgICAqIEByZXR1cm5zIHtCbG9ja31cbiAgICAgKi9cbiAgICBfX2luaXQoaTogbnVtYmVyLCBiYjogZmxhdGJ1ZmZlcnMuQnl0ZUJ1ZmZlcik6IEJsb2NrIHtcbiAgICAgIHRoaXMuYmJfcG9zID0gaTtcbiAgICAgIHRoaXMuYmIgPSBiYjtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluZGV4IHRvIHRoZSBzdGFydCBvZiB0aGUgUmVjb3JkQmxvY2sgKG5vdGUgdGhpcyBpcyBwYXN0IHRoZSBNZXNzYWdlIGhlYWRlcilcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtmbGF0YnVmZmVycy5Mb25nfVxuICAgICAqL1xuICAgIG9mZnNldCgpOiBmbGF0YnVmZmVycy5Mb25nIHtcbiAgICAgIHJldHVybiB0aGlzLmJiLnJlYWRJbnQ2NCh0aGlzLmJiX3Bvcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTGVuZ3RoIG9mIHRoZSBtZXRhZGF0YVxuICAgICAqXG4gICAgICogQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBtZXRhRGF0YUxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgcmV0dXJuIHRoaXMuYmIucmVhZEludDMyKHRoaXMuYmJfcG9zICsgOCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTGVuZ3RoIG9mIHRoZSBkYXRhICh0aGlzIGlzIGFsaWduZWQgc28gdGhlcmUgY2FuIGJlIGEgZ2FwIGJldHdlZW4gdGhpcyBhbmRcbiAgICAgKiB0aGUgbWV0YXRkYXRhKS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtmbGF0YnVmZmVycy5Mb25nfVxuICAgICAqL1xuICAgIGJvZHlMZW5ndGgoKTogZmxhdGJ1ZmZlcnMuTG9uZyB7XG4gICAgICByZXR1cm4gdGhpcy5iYi5yZWFkSW50NjQodGhpcy5iYl9wb3MgKyAxNik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtmbGF0YnVmZmVycy5CdWlsZGVyfSBidWlsZGVyXG4gICAgICogQHBhcmFtIHtmbGF0YnVmZmVycy5Mb25nfSBvZmZzZXRcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbWV0YURhdGFMZW5ndGhcbiAgICAgKiBAcGFyYW0ge2ZsYXRidWZmZXJzLkxvbmd9IGJvZHlMZW5ndGhcbiAgICAgKiBAcmV0dXJucyB7ZmxhdGJ1ZmZlcnMuT2Zmc2V0fVxuICAgICAqL1xuICAgIHN0YXRpYyBjcmVhdGVCbG9jayhidWlsZGVyOiBmbGF0YnVmZmVycy5CdWlsZGVyLCBvZmZzZXQ6IGZsYXRidWZmZXJzLkxvbmcsIG1ldGFEYXRhTGVuZ3RoOiBudW1iZXIsIGJvZHlMZW5ndGg6IGZsYXRidWZmZXJzLkxvbmcpOiBmbGF0YnVmZmVycy5PZmZzZXQge1xuICAgICAgYnVpbGRlci5wcmVwKDgsIDI0KTtcbiAgICAgIGJ1aWxkZXIud3JpdGVJbnQ2NChib2R5TGVuZ3RoKTtcbiAgICAgIGJ1aWxkZXIucGFkKDQpO1xuICAgICAgYnVpbGRlci53cml0ZUludDMyKG1ldGFEYXRhTGVuZ3RoKTtcbiAgICAgIGJ1aWxkZXIud3JpdGVJbnQ2NChvZmZzZXQpO1xuICAgICAgcmV0dXJuIGJ1aWxkZXIub2Zmc2V0KCk7XG4gICAgfVxuXG4gIH1cbn1cbiJdfQ==

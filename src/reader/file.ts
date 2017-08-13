import { flatbuffers } from 'flatbuffers';
import * as File_ from '../format/File';
import * as Schema_ from '../format/Schema';
import * as Message_ from '../format/Message';
import { PADDING, readMessageBatches } from './message';

import ByteBuffer = flatbuffers.ByteBuffer;
import Footer = File_.org.apache.arrow.flatbuf.Footer;
export import Schema = Schema_.org.apache.arrow.flatbuf.Schema;
export import RecordBatch = Message_.org.apache.arrow.flatbuf.RecordBatch;

const MAGIC_STR = 'ARROW1';
const MAGIC = new Uint8Array(MAGIC_STR.length);
for (let i = 0; i < MAGIC_STR.length; i += 1 | 0) {
    MAGIC[i] = MAGIC_STR.charCodeAt(i);
}

export function _checkMagic(buffer: Uint8Array, index = 0) {
    for (let i = -1, n = MAGIC.length; ++i < n;) {
        if (MAGIC[i] !== buffer[index + i]) {
            return false;
        }
    }
    return true;
}

const magicLength = MAGIC.length;
const magicAndPadding = magicLength + PADDING;
const magicX2AndPadding = magicLength * 2 + PADDING;

export function* readFile(...bbs: ByteBuffer[]) {
    for (let bb of bbs) {
        let fileLength = bb.capacity();
        let footerLength: number, footerOffset: number;
        if ((fileLength < magicX2AndPadding /*                     Arrow buffer too small */) ||
            (!_checkMagic(bb.bytes(), 0) /*                        Missing magic start    */) ||
            (!_checkMagic(bb.bytes(), fileLength - magicLength) /* Missing magic end      */) ||
            (/*                                                    Invalid footer length  */
            (footerLength = bb.readInt32(footerOffset = fileLength - magicAndPadding)) < 1 &&
            (footerLength + magicX2AndPadding > fileLength))) {
            throw new Error('Invalid file');
        }
        bb.setPosition(footerOffset - footerLength);
        let footer = Footer.getRootAsFooter(bb), schema = footer.schema();
        for (let i = -1, n = footer.dictionariesLength(); ++i < n;) {
            let block = footer.dictionaries(i);
            bb.setPosition(block.offset().low);
            for (let batch of readMessageBatches(bb)) {
                yield { schema, batch };
                break;
            }
        }
        for (let i = -1, n = footer.recordBatchesLength(); ++i < n;) {
            const block = footer.recordBatches(i);
            bb.setPosition(block.offset().low);
            for (let batch of readMessageBatches(bb)) {
                yield { schema, batch };
                break;
            }
        }
    }
}

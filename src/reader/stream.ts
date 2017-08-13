import { _checkMagic } from './file';
import { flatbuffers } from 'flatbuffers';
import * as Schema_ from '../format/Schema';
import * as Message_ from '../format/Message';
import { readMessages, readMessageBatches } from './message';

import ByteBuffer = flatbuffers.ByteBuffer;
import Schema = Schema_.org.apache.arrow.flatbuf.Schema;
import MessageHeader = Message_.org.apache.arrow.flatbuf.MessageHeader;

export function* readStream(...bbs: ByteBuffer[]) {
    if (!bbs.length || _checkMagic(bbs[0].bytes(), 0)) {
        throw new Error('Invalid Arrow Stream');
    }
    for (const message of readMessages(bbs[0])) {
        if (message.headerType() === MessageHeader.Schema) {
            const schema = message.header(new Schema());
            for (const bb of bbs) {
                for (const batch of readMessageBatches(bb)) {
                    yield { schema, batch };
                }
            }
            break;
        }
    }
}

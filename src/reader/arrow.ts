import { flatbuffers } from 'flatbuffers';
import * as Schema_ from '../format/Schema';
import * as Message_ from '../format/Message';

import { readFile } from './file';
import { readStream } from './stream';
import { readVector } from './vector';
import { Vector } from '../vectors/vector';
import { readDictionaries } from './dictionary';

import ByteBuffer = flatbuffers.ByteBuffer;
export import Schema = Schema_.org.apache.arrow.flatbuf.Schema;
export import RecordBatch = Message_.org.apache.arrow.flatbuf.RecordBatch;
export type Dictionaries = { [k: string]: Vector<any> };
export type IteratorState = { nodeIndex: number; bufferIndex: number };

export function* readRecords(...bytes: ByteBuffer[]) {
    try {
        yield* readFile(...bytes);
    } catch (e) {
        try {
            yield* readStream(...bytes);
        } catch (e) {
            throw new Error('Invalid Arrow buffer');
        }
    }
}

export function* readBuffers(...bytes: Array<Uint8Array | Buffer | string>) {
    const dictionaries: Dictionaries = {};
    const byteBuffers = bytes.map(toByteBuffer);
    for (let { schema, batch } of readRecords(...byteBuffers)) {
        let vectors: Vector<any>[] = [];
        let state = { nodeIndex: 0, bufferIndex: 0 };
        let index = -1, fieldsLength = schema.fieldsLength();
        if (batch.id) {
            while (++index < fieldsLength) {
                for (let [id, vector] of readDictionaries(schema.fields(index), batch, state, dictionaries)) {
                    dictionaries[id] = dictionaries[id] && dictionaries[id].concat(vector) || vector;
                }
            }
        } else {
            while (++index < fieldsLength) {
                vectors[index] = readVector(schema.fields(index), batch, state, dictionaries);
            }
            yield vectors;
        }
    }
}

function toByteBuffer(bytes?: Uint8Array | Buffer | string) {
    let arr: Uint8Array = bytes as any || new Uint8Array(0);
    if (typeof bytes === 'string') {
        arr = new Uint8Array(bytes.length);
        for (let i = -1, n = bytes.length; ++i < n;) {
            arr[i] = bytes.charCodeAt(i);
        }
        return new ByteBuffer(arr);
    }
    return new ByteBuffer(arr);
}

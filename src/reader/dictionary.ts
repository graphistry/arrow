import { readVector } from './vector';
import { MessageBatch } from './message';
import * as Schema_ from '../format/Schema';
import { IteratorState, Dictionaries } from './arrow';

import Field = Schema_.org.apache.arrow.flatbuf.Field;
import DictionaryEncoding = Schema_.org.apache.arrow.flatbuf.DictionaryEncoding;

export function* readDictionaries(field: Field,
                                  batch: MessageBatch,
                                  iterator: IteratorState,
                                  dictionaries: Dictionaries) {
    let id: string, encoding: DictionaryEncoding;
    if ((encoding = field.dictionary()) &&
        (id = encoding.id().toFloat64().toString())) {
        yield [id, readVector(field, batch, iterator, null)];
    }
    for (let i = -1, n = field.childrenLength(); ++i < n;) {
        yield* readDictionaries(field.children(i), batch, iterator, dictionaries);
    }
}

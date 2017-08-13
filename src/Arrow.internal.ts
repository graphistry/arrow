import { readBuffers } from './reader/arrow';
import { Vector } from './vectors/vector';
import { StructVector } from './vectors/struct';
import { DictionaryVector } from './vectors/dictionary';
import { Utf8Vector, ListVector, FixedSizeListVector } from './vectors/list';
import {
    ValidityVector,
    Int8Vector, Int16Vector, Int32Vector, Int64Vector,
    Uint8Vector, Uint16Vector, Uint32Vector, Uint64Vector,
    Float32Vector, Float64Vector, IndexVector, DateVector,
} from './vectors/typed';

export const reader = { readBuffers };
export const vectors = {
    Vector, ValidityVector,
    Int8Vector, Int16Vector, Int32Vector, Int64Vector,
    Uint8Vector, Uint16Vector, Uint32Vector, Uint64Vector,
    Float32Vector, Float64Vector, IndexVector, DateVector,
    StructVector, DictionaryVector, Utf8Vector, ListVector, FixedSizeListVector
};

/* These exports are needed for the closure umd targets */
try {
    const Arrow = eval('exports');
    if (typeof Arrow === 'object') {
        // string indexers tell closure compiler not to rename these properties
        Arrow['reader'] = reader;
        Arrow['vectors'] = vectors;
        reader['readBuffers'] = readBuffers;
        vectors['Vector'] = Vector;
        vectors['ListVector'] = ListVector;
        vectors['Utf8Vector'] = Utf8Vector;
        vectors['DateVector'] = DateVector;
        vectors['IndexVector'] = IndexVector;
        vectors['Int8Vector'] = Int8Vector;
        vectors['Int16Vector'] = Int16Vector;
        vectors['Int32Vector'] = Int32Vector;
        vectors['Int64Vector'] = Int64Vector;
        vectors['Uint8Vector'] = Uint8Vector;
        vectors['Uint16Vector'] = Uint16Vector;
        vectors['Uint32Vector'] = Uint32Vector;
        vectors['Uint64Vector'] = Uint64Vector;
        vectors['Float32Vector'] = Float32Vector;
        vectors['Float64Vector'] = Float64Vector;
        vectors['StructVector'] = StructVector;
        vectors['ValidityVector'] = ValidityVector;
        vectors['DictionaryVector'] = DictionaryVector;
        vectors['FixedSizeListVector'] = FixedSizeListVector;
    }
} catch (e) { /* not the UMD bundle */ }
/** end closure exports */

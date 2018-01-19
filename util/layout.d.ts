export declare type NullableLayout = {
    nullCount: number;
    validity: Uint8Array;
};
export declare type BufferLayout<TArray = ArrayLike<number>> = {
    data: TArray;
};
export declare type DictionaryLayout<TArray = ArrayLike<number>> = {
    data: TArray;
    keys: number[];
};
export declare type VariableWidthLayout<TArray = ArrayLike<number>> = {
    data: TArray;
    offsets: number[];
};
export declare type VariableWidthDictionaryLayout<TArray = ArrayLike<number>> = {
    data: TArray;
    keys: number[];
    offsets: number[];
};
export declare type values<T, TNull> = ArrayLike<T | TNull | null | undefined>;
export declare type BufferValueWriter<T> = (src: ArrayLike<T>, dst: number[], index: number) => boolean | void;
export declare type BufferWriter<T, TNull> = (values: values<T, TNull>, nulls?: ArrayLike<TNull>) => BufferLayout;
export declare type BufferLayoutWriter<T, TNull> = (write: BufferValueWriter<T>, values: values<T, TNull>, nulls?: ArrayLike<TNull>) => BufferLayout;
export declare const writeBools: <TNull>(values: ArrayLike<number | boolean | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => BufferLayout<Uint8Array>;
export declare const writeInt8s: <TNull>(values: ArrayLike<number | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => BufferLayout<Int8Array>;
export declare const writeInt16s: <TNull>(values: ArrayLike<number | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => BufferLayout<Int16Array>;
export declare const writeInt32s: <TNull>(values: ArrayLike<number | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => BufferLayout<Int32Array>;
export declare const writeInt64s: <TNull>(values: ArrayLike<number | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => BufferLayout<Int32Array>;
export declare const writeUint8s: <TNull>(values: ArrayLike<number | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => BufferLayout<Uint8Array>;
export declare const writeUint16s: <TNull>(values: ArrayLike<number | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => BufferLayout<Uint16Array>;
export declare const writeUint32s: <TNull>(values: ArrayLike<number | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => BufferLayout<Uint32Array>;
export declare const writeUint64s: <TNull>(values: ArrayLike<number | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => BufferLayout<Uint32Array>;
export declare const writeDecimals: <TNull>(values: ArrayLike<number | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => BufferLayout<Uint32Array>;
export declare const writeFloat32s: <TNull>(values: ArrayLike<number | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => BufferLayout<Float32Array>;
export declare const writeFloat64s: <TNull>(values: ArrayLike<number | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => BufferLayout<Float64Array>;
export declare const writeVariableWidth: <T, TNull>(writeValue: BufferValueWriter<T>, values: ArrayLike<T | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => VariableWidthLayout<Uint8Array>;
export declare const writeBinary: <TNull>(values: ArrayLike<Iterable<number> | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => VariableWidthLayout<Uint8Array>;
export declare const writeUtf8s: <TNull>(values: ArrayLike<string | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => VariableWidthLayout<Uint8Array>;
export declare const writeDictionaryEncoded: <T, TNull>(writeValue: BufferValueWriter<T>, values: ArrayLike<T | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => DictionaryLayout<Uint8Array>;
export declare const writeDictionaryEncodedBools: <TNull>(values: ArrayLike<number | boolean | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => DictionaryLayout<Uint8Array>;
export declare const writeDictionaryEncodedInt8s: <TNull>(values: ArrayLike<number | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => DictionaryLayout<Int8Array>;
export declare const writeDictionaryEncodedInt16s: <TNull>(values: ArrayLike<number | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => DictionaryLayout<Int16Array>;
export declare const writeDictionaryEncodedInt32s: <TNull>(values: ArrayLike<number | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => DictionaryLayout<Int32Array>;
export declare const writeDictionaryEncodedInt64s: <TNull>(values: ArrayLike<number | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => DictionaryLayout<Int32Array>;
export declare const writeDictionaryEncodedUint8s: <TNull>(values: ArrayLike<number | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => DictionaryLayout<Uint8Array>;
export declare const writeDictionaryEncodedUint16s: <TNull>(values: ArrayLike<number | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => DictionaryLayout<Uint16Array>;
export declare const writeDictionaryEncodedUint32s: <TNull>(values: ArrayLike<number | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => DictionaryLayout<Uint32Array>;
export declare const writeDictionaryEncodedUint64s: <TNull>(values: ArrayLike<number | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => DictionaryLayout<Uint32Array>;
export declare const writeDictionaryEncodedDecimals: <TNull>(values: ArrayLike<number | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => DictionaryLayout<Uint32Array>;
export declare const writeDictionaryEncodedFloat32s: <TNull>(values: ArrayLike<number | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => DictionaryLayout<Float32Array>;
export declare const writeDictionaryEncodedFloat64s: <TNull>(values: ArrayLike<number | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => DictionaryLayout<Float64Array>;
export declare const writeDictionaryEncodedVariableWidth: <T, TNull>(writeValue: BufferValueWriter<T>, values: ArrayLike<T | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => VariableWidthDictionaryLayout<Uint8Array>;
export declare const writeDictionaryEncodedBinary: <TNull>(values: ArrayLike<Iterable<number> | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => VariableWidthDictionaryLayout<Uint8Array>;
export declare const writeDictionaryEncodedUtf8s: <TNull>(values: ArrayLike<string | TNull | null | undefined>, nulls?: ArrayLike<TNull> | undefined) => VariableWidthDictionaryLayout<Uint8Array>;

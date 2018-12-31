import { Schema, Field } from '../../schema';
import { DataType, Dictionary } from '../../type';
import { DictionaryBatch, RecordBatch } from './message';
/** @ignore */
export declare function schemaFromJSON(_schema: any, dictionaries?: Map<number, DataType>, dictionaryFields?: Map<number, Field<Dictionary>[]>): Schema<any>;
/** @ignore */
export declare function recordBatchFromJSON(b: any): RecordBatch;
/** @ignore */
export declare function dictionaryBatchFromJSON(b: any): DictionaryBatch;
/** @ignore */
export declare function fieldFromJSON(_field: any, dictionaries?: Map<number, DataType>, dictionaryFields?: Map<number, Field<Dictionary>[]>): Field<DataType<import("../../enum").Type, any>>;

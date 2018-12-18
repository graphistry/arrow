import { Schema, Field } from '../../schema';
import { DataType, Dictionary } from '../../type';
import { DictionaryBatch, RecordBatch } from './message';
export declare function schemaFromJSON(_schema: any, dictionaries?: Map<number, DataType>, dictionaryFields?: Map<number, Field<Dictionary>[]>): Schema<any>;
export declare function recordBatchFromJSON(b: any): RecordBatch;
export declare function dictionaryBatchFromJSON(b: any): DictionaryBatch;
export declare function fieldFromJSON(_field: any, dictionaries?: Map<number, DataType>, dictionaryFields?: Map<number, Field<Dictionary>[]>): Field<DataType<import("../../enum").Type, any>>;

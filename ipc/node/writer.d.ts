/// <reference types="node" />
import { Duplex } from 'stream';
import { DataType } from '../../type';
import { AsyncByteStream } from '../../io/stream';
import { RecordBatchWriter } from '../../ipc/writer';
export declare function recordBatchWriterThroughNodeStream<T extends {
    [key: string]: DataType;
} = any>(this: typeof RecordBatchWriter): RecordBatchWriterDuplex<T>;
declare type CB = (error?: Error | null | undefined) => void;
declare class RecordBatchWriterDuplex<T extends {
    [key: string]: DataType;
} = any> extends Duplex {
    private _pulling;
    private _reader;
    private _writer;
    constructor(writer: RecordBatchWriter<T>);
    _final(cb?: CB): void;
    _write(x: any, _: string, cb: CB): boolean;
    _read(size: number): void;
    _destroy(err: Error | null, cb: (error: Error | null) => void): void;
    _pull(size: number, reader: AsyncByteStream): Promise<boolean>;
}
export {};

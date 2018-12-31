/// <reference types="node" />
import { Duplex } from 'stream';
import { DataType } from '../../type';
import { AsyncByteQueue } from '../../io/stream';
import { RecordBatchReader } from '../../ipc/reader';
/** @ignore */
export declare function recordBatchReaderThroughNodeStream<T extends {
    [key: string]: DataType;
} = any>(): RecordBatchReaderDuplex<T>;
declare type CB = (error?: Error | null | undefined) => void;
/** @ignore */
declare class RecordBatchReaderDuplex<T extends {
    [key: string]: DataType;
} = any> extends Duplex {
    private _pulling;
    private _reader;
    private _asyncQueue;
    constructor();
    _final(cb?: CB): void;
    _write(x: any, _: string, cb: CB): boolean;
    _read(size: number): void;
    _destroy(err: Error | null, cb: (error: Error | null) => void): void;
    _open(source: AsyncByteQueue): Promise<import("../reader").RecordBatchFileReader<any> | import("../reader").AsyncRecordBatchStreamReader<any>>;
    _pull(size: number, reader: RecordBatchReader<T>): Promise<boolean>;
}
export {};

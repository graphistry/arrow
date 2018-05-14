/// <reference types="node" />
export declare class PipeIterator<T> implements IterableIterator<T> {
    protected iterator: IterableIterator<T>;
    protected encoding: any;
    constructor(iterator: IterableIterator<T>, encoding?: any);
    [Symbol.iterator](): IterableIterator<T>;
    next(value?: any): IteratorResult<T>;
    throw(error?: any): {
        done: boolean;
        value: any;
    };
    return(value?: any): {
        done: boolean;
        value: any;
    };
    pipe(stream: NodeJS.WritableStream): NodeJS.WritableStream;
}
export declare class AsyncPipeIterator<T> implements AsyncIterableIterator<T> {
    protected iterator: AsyncIterableIterator<T>;
    protected encoding: any;
    constructor(iterator: AsyncIterableIterator<T>, encoding?: any);
    [Symbol.asyncIterator](): AsyncIterableIterator<T>;
    next(value?: any): Promise<IteratorResult<T>>;
    throw(error?: any): Promise<{
        done: boolean;
        value: any;
    }>;
    return(value?: any): Promise<{
        done: boolean;
        value: any;
    }>;
    pipe(stream: NodeJS.WritableStream): NodeJS.WritableStream;
}

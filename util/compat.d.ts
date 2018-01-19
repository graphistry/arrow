export interface Subscription {
    unsubscribe: () => void;
}
export interface Observer<T> {
    closed?: boolean;
    next: (value: T) => void;
    error: (err: any) => void;
    complete: () => void;
}
export interface Observable<T> {
    subscribe: (observer: Observer<T>) => Subscription;
}
/**
 * @ignore
 */
export declare function isPromise(x: any): x is PromiseLike<any>;
/**
 * @ignore
 */
export declare function isObservable(x: any): x is Observable<any>;
/**
 * @ignore
 */
export declare function isArrayLike(x: any): x is ArrayLike<any>;
/**
 * @ignore
 */
export declare function isIterable(x: any): x is Iterable<any>;
/**
 * @ignore
 */
export declare function isAsyncIterable(x: any): x is AsyncIterable<any>;

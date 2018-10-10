export declare class BaseInt64 {
    protected buffer: Uint32Array;
    constructor(buffer: Uint32Array);
    high(): number;
    low(): number;
    protected _times(other: BaseInt64): this;
    protected _plus(other: BaseInt64): void;
    lessThan(other: BaseInt64): boolean;
    equals(other: BaseInt64): boolean;
    greaterThan(other: BaseInt64): boolean;
    hex(): string;
}
export declare class Uint64 extends BaseInt64 {
    times(other: Uint64): Uint64;
    plus(other: Uint64): Uint64;
    static from(val: any, out_buffer?: Uint32Array): Uint64;
    static fromNumber(num: number, out_buffer?: Uint32Array): Uint64;
    static fromString(str: string, out_buffer?: Uint32Array): Uint64;
    static convertArray(values: (string | number)[]): Uint32Array;
    static multiply(left: Uint64, right: Uint64): Uint64;
    static add(left: Uint64, right: Uint64): Uint64;
}
export declare class Int64 extends BaseInt64 {
    negate(): Int64;
    times(other: Int64): Int64;
    plus(other: Int64): Int64;
    lessThan(other: Int64): boolean;
    static from(val: any, out_buffer?: Uint32Array): Int64;
    static fromNumber(num: number, out_buffer?: Uint32Array): Int64;
    static fromString(str: string, out_buffer?: Uint32Array): Int64;
    static convertArray(values: (string | number)[]): Uint32Array;
    static multiply(left: Int64, right: Int64): Int64;
    static add(left: Int64, right: Int64): Int64;
}
export declare class Int128 {
    private buffer;
    constructor(buffer: Uint32Array);
    high(): Int64;
    low(): Int64;
    negate(): Int128;
    times(other: Int128): Int128;
    plus(other: Int128): Int128;
    hex(): string;
    static multiply(left: Int128, right: Int128): Int128;
    static add(left: Int128, right: Int128): Int128;
    static from(val: any, out_buffer?: Uint32Array): Int128;
    static fromNumber(num: number, out_buffer?: Uint32Array): Int128;
    static fromString(str: string, out_buffer?: Uint32Array): Int128;
    static convertArray(values: (string | number)[]): Uint32Array;
}

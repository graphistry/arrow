import { BaseVector } from './base';
import { RowProxyGenerator } from './row';
import { DataType, Struct } from '../type';
export declare class StructVector<T extends {
    [key: string]: DataType;
} = any> extends BaseVector<Struct<T>> {
    asMap(keysSorted?: boolean): import("./map").MapVector<T>;
    private _rowProxy;
    readonly rowProxy: RowProxyGenerator<T>;
}

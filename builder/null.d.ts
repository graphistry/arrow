import { Null } from '../type';
import { Builder } from './base';
export declare class NullBuilder<TNull = any> extends Builder<Null, TNull> {
    writeValue(value: null): null;
    writeValid(isValid: boolean): boolean;
}

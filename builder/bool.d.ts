import { Bool } from '../type';
import { Builder, DataBuilderOptions } from './base';
export declare class BoolBuilder<TNull = any> extends Builder<Bool, TNull> {
    constructor(options: DataBuilderOptions<Bool, TNull>);
    writeValue(value: boolean, offset: number): void;
    protected _updateBytesUsed(offset: number, length: number): this;
}

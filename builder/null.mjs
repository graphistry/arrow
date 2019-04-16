import { Builder } from './base';
export class NullBuilder extends Builder {
    writeValue(value) { return value; }
    writeValid(isValid) { return isValid; }
}

//# sourceMappingURL=null.mjs.map

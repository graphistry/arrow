import { FlatListBuilder } from './base';
import { encodeUtf8 } from '../util/utf8';
export class Utf8Builder extends FlatListBuilder {
    writeValue(value, index = this.length) {
        return super.writeValue(encodeUtf8(value), index);
    }
}

//# sourceMappingURL=utf8.mjs.map

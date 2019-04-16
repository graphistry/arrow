"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = require("./base");
class TimestampBuilder extends base_1.FlatBuilder {
}
exports.TimestampBuilder = TimestampBuilder;
class TimestampSecondBuilder extends TimestampBuilder {
}
exports.TimestampSecondBuilder = TimestampSecondBuilder;
class TimestampMillisecondBuilder extends TimestampBuilder {
}
exports.TimestampMillisecondBuilder = TimestampMillisecondBuilder;
class TimestampMicrosecondBuilder extends TimestampBuilder {
}
exports.TimestampMicrosecondBuilder = TimestampMicrosecondBuilder;
class TimestampNanosecondBuilder extends TimestampBuilder {
}
exports.TimestampNanosecondBuilder = TimestampNanosecondBuilder;

//# sourceMappingURL=timestamp.js.map

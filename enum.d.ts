import * as Schema_ from './fb/Schema';
import * as Message_ from './fb/Message';
export import ArrowType = Schema_.org.apache.arrow.flatbuf.Type;
export import DateUnit = Schema_.org.apache.arrow.flatbuf.DateUnit;
export import TimeUnit = Schema_.org.apache.arrow.flatbuf.TimeUnit;
export import Precision = Schema_.org.apache.arrow.flatbuf.Precision;
export import UnionMode = Schema_.org.apache.arrow.flatbuf.UnionMode;
export import VectorType = Schema_.org.apache.arrow.flatbuf.VectorType;
export import IntervalUnit = Schema_.org.apache.arrow.flatbuf.IntervalUnit;
export import MessageHeader = Message_.org.apache.arrow.flatbuf.MessageHeader;
export import MetadataVersion = Schema_.org.apache.arrow.flatbuf.MetadataVersion;
/**
 * *
 * Main data type enumeration:
 * *
 * Data types in this library are all *logical*. They can be expressed as
 * either a primitive physical type (bytes or bits of some fixed size), a
 * nested type consisting of other data types, or another data type (e.g. a
 * timestamp encoded as an int64)
 */
export declare enum Type {
    NONE = 0,
    Null = 1,
    Int = 2,
    Float = 3,
    Binary = 4,
    Utf8 = 5,
    Bool = 6,
    Decimal = 7,
    Date = 8,
    Time = 9,
    Timestamp = 10,
    Interval = 11,
    List = 12,
    Struct = 13,
    Union = 14,
    FixedSizeBinary = 15,
    FixedSizeList = 16,
    Map = 17,
    Dictionary = -1,
    Int8 = -2,
    Int16 = -3,
    Int32 = -4,
    Int64 = -5,
    Uint8 = -6,
    Uint16 = -7,
    Uint32 = -8,
    Uint64 = -9,
    Float16 = -10,
    Float32 = -11,
    Float64 = -12,
    DateDay = -13,
    DateMillisecond = -14,
    TimestampSecond = -15,
    TimestampMillisecond = -16,
    TimestampMicrosecond = -17,
    TimestampNanosecond = -18,
    TimeSecond = -19,
    TimeMillisecond = -20,
    TimeMicrosecond = -21,
    TimeNanosecond = -22,
    DenseUnion = -23,
    SparseUnion = -24,
    IntervalDayTime = -25,
    IntervalYearMonth = -26
}

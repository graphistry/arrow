import { Vector } from './vector';
import { DataType, Dictionary } from './type';
import { Utf8, Binary, Decimal, FixedSizeBinary } from './type';
import { List, FixedSizeList, Union, Map_, Struct } from './type';
import { Bool, Null, Int, Float, Date_, Time, Interval, Timestamp } from './type';
export interface VisitorNode {
    acceptTypeVisitor(visitor: TypeVisitor): any;
    acceptVectorVisitor(visitor: VectorVisitor): any;
}
export declare abstract class TypeVisitor {
    visit(node: Partial<VisitorNode>): any;
    visitMany(nodes: Partial<VisitorNode>[]): any[];
    abstract visitNull(node: Null): any;
    abstract visitBool(node: Bool): any;
    abstract visitInt(node: Int): any;
    abstract visitFloat(node: Float): any;
    abstract visitUtf8(node: Utf8): any;
    abstract visitBinary(node: Binary): any;
    abstract visitFixedSizeBinary(node: FixedSizeBinary): any;
    abstract visitDate(node: Date_): any;
    abstract visitTimestamp(node: Timestamp): any;
    abstract visitTime(node: Time): any;
    abstract visitDecimal(node: Decimal): any;
    abstract visitList(node: List): any;
    abstract visitStruct(node: Struct): any;
    abstract visitUnion(node: Union<any>): any;
    abstract visitDictionary(node: Dictionary): any;
    abstract visitInterval(node: Interval): any;
    abstract visitFixedSizeList(node: FixedSizeList): any;
    abstract visitMap(node: Map_): any;
    static visitTypeInline<T extends DataType>(visitor: TypeVisitor, type: T): any;
}
export declare abstract class VectorVisitor {
    visit(node: Partial<VisitorNode>): any;
    visitMany(nodes: Partial<VisitorNode>[]): any[];
    abstract visitNullVector(node: Vector<Null>): any;
    abstract visitBoolVector(node: Vector<Bool>): any;
    abstract visitIntVector(node: Vector<Int>): any;
    abstract visitFloatVector(node: Vector<Float>): any;
    abstract visitUtf8Vector(node: Vector<Utf8>): any;
    abstract visitBinaryVector(node: Vector<Binary>): any;
    abstract visitFixedSizeBinaryVector(node: Vector<FixedSizeBinary>): any;
    abstract visitDateVector(node: Vector<Date_>): any;
    abstract visitTimestampVector(node: Vector<Timestamp>): any;
    abstract visitTimeVector(node: Vector<Time>): any;
    abstract visitDecimalVector(node: Vector<Decimal>): any;
    abstract visitListVector(node: Vector<List>): any;
    abstract visitStructVector(node: Vector<Struct>): any;
    abstract visitUnionVector(node: Vector<Union<any>>): any;
    abstract visitDictionaryVector(node: Vector<Dictionary>): any;
    abstract visitIntervalVector(node: Vector<Interval>): any;
    abstract visitFixedSizeListVector(node: Vector<FixedSizeList>): any;
    abstract visitMapVector(node: Vector<Map_>): any;
    static visitTypeInline<T extends DataType>(visitor: VectorVisitor, type: T, vector: Vector<T>): any;
}

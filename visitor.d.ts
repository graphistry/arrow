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
    visit(type: Partial<VisitorNode>): any;
    visitMany(types: Partial<VisitorNode>[]): any[];
    abstract visitNull?(type: Null): any;
    abstract visitBool?(type: Bool): any;
    abstract visitInt?(type: Int): any;
    abstract visitFloat?(type: Float): any;
    abstract visitUtf8?(type: Utf8): any;
    abstract visitBinary?(type: Binary): any;
    abstract visitFixedSizeBinary?(type: FixedSizeBinary): any;
    abstract visitDate?(type: Date_): any;
    abstract visitTimestamp?(type: Timestamp): any;
    abstract visitTime?(type: Time): any;
    abstract visitDecimal?(type: Decimal): any;
    abstract visitList?(type: List): any;
    abstract visitStruct?(type: Struct): any;
    abstract visitUnion?(type: Union<any>): any;
    abstract visitDictionary?(type: Dictionary): any;
    abstract visitInterval?(type: Interval): any;
    abstract visitFixedSizeList?(type: FixedSizeList): any;
    abstract visitMap?(type: Map_): any;
    static visitTypeInline<T extends DataType>(visitor: TypeVisitor, type: T): any;
}
export declare abstract class VectorVisitor {
    visit(vector: Partial<VisitorNode>): any;
    visitMany(vectors: Partial<VisitorNode>[]): any[];
    abstract visitNull?(vector: Vector<Null>): any;
    abstract visitBool?(vector: Vector<Bool>): any;
    abstract visitInt?(vector: Vector<Int>): any;
    abstract visitFloat?(vector: Vector<Float>): any;
    abstract visitUtf8?(vector: Vector<Utf8>): any;
    abstract visitBinary?(vector: Vector<Binary>): any;
    abstract visitFixedSizeBinary?(vector: Vector<FixedSizeBinary>): any;
    abstract visitDate?(vector: Vector<Date_>): any;
    abstract visitTimestamp?(vector: Vector<Timestamp>): any;
    abstract visitTime?(vector: Vector<Time>): any;
    abstract visitDecimal?(vector: Vector<Decimal>): any;
    abstract visitList?(vector: Vector<List>): any;
    abstract visitStruct?(vector: Vector<Struct>): any;
    abstract visitUnion?(vector: Vector<Union<any>>): any;
    abstract visitDictionary?(vector: Vector<Dictionary>): any;
    abstract visitInterval?(vector: Vector<Interval>): any;
    abstract visitFixedSizeList?(vector: Vector<FixedSizeList>): any;
    abstract visitMap?(vector: Vector<Map_>): any;
    static visitTypeInline<T extends DataType>(visitor: VectorVisitor, type: T, vector: Vector<T>): any;
}

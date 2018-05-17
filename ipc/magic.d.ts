/// <reference types="flatbuffers" />
import { flatbuffers } from 'flatbuffers';
import ByteBuffer = flatbuffers.ByteBuffer;
export declare const PADDING = 4;
export declare const MAGIC_STR = "ARROW1";
export declare const MAGIC: Uint8Array;
export declare function checkForMagicArrowString(buffer: Uint8Array, index?: number): boolean;
export declare function isValidArrowFile(bb: ByteBuffer): boolean;
export declare const magicLength: number;
export declare const magicAndPadding: number;
export declare const magicX2AndPadding: number;
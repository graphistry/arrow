import { Column } from '../column';
import { Vector } from '../vector';
/** @ignore */
export declare const selectAndFlatten: <T>(Ctor: any, vals: any[]) => T[];
/** @ignore */
export declare const selectAndFlattenChunks: <T>(Ctor: any, vals: any[]) => T[];
/** @ignore */
export declare const selectAndFlattenVectorChildren: <T extends Vector<any>>(Ctor: typeof import("../recordbatch").RecordBatch, vals: any[]) => T[];
/** @ignore */
export declare const selectAndFlattenColumnChildren: <T extends Column<any>>(Ctor: typeof import("../recordbatch").RecordBatch, vals: any[]) => T[];

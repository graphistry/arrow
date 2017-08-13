/* tslint:disable */
// Dynamically load an Ix target build based on command line arguments

const target = process.env.TEST_TARGET;
const format = process.env.TEST_MODULE;
const resolve = require('path').resolve;

// these are duplicated in the gulpfile :<
const targets = [`es5`, `es2015`, `esnext`];
const formats = [`cjs`, `esm`, `cls`, `umd`];

function throwInvalidImportError(name: string, value: string, values: string[]) {
    throw new Error('Unrecognized ' + name + ' \'' + value + '\'. Please run tests with \'--' + name + ' <any of ' + values.join(', ') + '>\'');
}

if (!~targets.indexOf(target)) throwInvalidImportError('target', target, targets);
if (!~formats.indexOf(format)) throwInvalidImportError('module', format, formats);

let Arrow: any = require(resolve(`./targets/${target}/${format}/Arrow.js`));
let ArrowInternal: any = require(resolve(`./targets/${target}/${format}/Arrow.internal.js`));

import { reader as reader_ } from '../src/Arrow.internal';
import { vectors as vectors_ } from '../src/Arrow.internal';
import { Table as Table_, readBuffers as readBuffers_ } from '../src/Arrow';

export let Table: typeof Table_ = Arrow.Table;
export let readBuffers: typeof readBuffers_ = Arrow.readBuffers;
export let reader: typeof reader_ = ArrowInternal.reader;
export let vectors: typeof vectors_ = ArrowInternal.vectors;

<!---
  Licensed to the Apache Software Foundation (ASF) under one
  or more contributor license agreements.  See the NOTICE file
  distributed with this work for additional information
  regarding copyright ownership.  The ASF licenses this file
  to you under the Apache License, Version 2.0 (the
  "License"); you may not use this file except in compliance
  with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing,
  software distributed under the License is distributed on an
  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  KIND, either express or implied.  See the License for the
  specific language governing permissions and limitations
  under the License.
-->

## the npm scripts

* `npm run clean` - cleans targets
* `npm run build` - cleans and compiles all targets
* `npm test` - executes tests against built targets

These npm scripts accept argument lists of targets × modules:

* Available `targets` are `es5`, `es2015`, `esnext`, and `all` (default: `all`)
* Available `modules` are `cjs`, `esm`, `umd`, and `all` (default: `all`)

Examples:
* `npm run build` -- builds all ES targets in all module formats
* `npm run build -- -t es5 -m all` -- builds the ES5 target in all module formats
* `npm run build -- -t all -m cjs` -- builds all ES targets in the CommonJS module format
* `npm run build -- --targets es5 es2015 -m all` -- builds the ES5 and ES2015 targets in all module formats
* `npm run build -- -t es5 --modules cjs esm` -- builds the ES5 target in CommonJS and ESModules module formats

This argument configuration also applies to `clean` and `test` scripts.

## `npm run deploy`

Uses [learna](https://github.com/lerna/lerna) to publish each build target to npm with [conventional](https://conventionalcommits.org/) [changelogs](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-cli).

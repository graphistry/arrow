const del = require(`del`);
const gulp = require(`gulp`);
const path = require(`path`);
const pump = require(`pump`);
const ts = require(`gulp-typescript`);
const streamMerge = require(`merge2`);
const sourcemaps = require(`gulp-sourcemaps`);
const child_process = require(`child_process`);
const gulpJsonTransform = require(`gulp-json-transform`);
const closureCompiler = require(`google-closure-compiler`).gulp();

const knownTargets = [`es5`, `es2015`, `esnext`];
const knownModules = [`cjs`, `esm`, `cls`, `umd`];

// see: https://github.com/google/closure-compiler/blob/c1372b799d94582eaf4b507a4a22558ff26c403c/src/com/google/javascript/jscomp/CompilerOptions.java#L2988
const gCCTargets = {
    es5: `ECMASCRIPT5`,
    es2015: `ECMASCRIPT_2015`,
    es2016: `ECMASCRIPT_2016`,
    es2017: `ECMASCRIPT_2017`,
    esnext: `ECMASCRIPT_NEXT`
};

const tsProjects = [];
const argv = require(`command-line-args`)([
    { name: `all`, alias: `a`, type: Boolean },
    { name: 'update', alias: 'u', type: Boolean },
    { name: `target`, type: String, defaultValue: `` },
    { name: `module`, type: String, defaultValue: `` },
    { name: `targets`, alias: `t`, type: String, multiple: true, defaultValue: [] },
    { name: `modules`, alias: `m`, type: String, multiple: true, defaultValue: [] }
]);

const { targets, modules } = argv;

argv.target && !targets.length && targets.push(argv.target);
argv.module && !modules.length && modules.push(argv.module);
(argv.all || (!targets.length && !modules.length))
    && targets.push('all') && modules.push(`all`);

for (const [target, format] of combinations([`all`, `all`])) {
    const combo = `${target}:${format}`;
    gulp.task(`test:${combo}`, ...testTask(target, format, combo, `targets/${target}/${format}`));
    gulp.task(`build:${combo}`, ...buildTask(target, format, combo, `targets/${target}/${format}`));
    gulp.task(`clean:${combo}`, ...cleanTask(target, format, combo, `targets/${target}/${format}`));
    gulp.task(`bundle:${combo}`, ...bundleTask(target, format, combo, `targets/${target}/${format}`));
    gulp.task(`test:debug:${combo}`, ...testTask(target, format, combo, `targets/${target}/${format}`, true));
}

gulp.task(`default`, [`build`]);
gulp.task(`test`, (cb) => runTaskCombos(`test`, cb));
gulp.task(`clean`, (cb) => runTaskCombos(`clean`, cb));
gulp.task(`build`, (cb) => runTaskCombos(`bundle`, cb));
gulp.task(`test:debug`, (cb) => runTaskCombos(`test:debug`, cb));

function runTaskCombos(name, cb) {
    const combos = [];
    for (const [target, format] of combinations(targets, modules)) {
        if (format === `cls`) {
            continue;
        }
        combos.push(`${name}:${target}:${format}`);
    }
    gulp.start(combos, cb);
}

function cleanTask(target, format, taskName, outDir) {
    return [
        () => del([`${outDir}/**`])
    ];
}

function buildTask(target, format, taskName, outDir) {
    return format === `umd`
            ? closureTask(target, format, taskName, outDir)
            : typescriptTask(target, format, taskName, outDir);
}

function bundleTask(target, format, taskName, outDir) {
    return [
        [`build:${taskName}`],
        (cb) => pump(
            gulp.src(`package.json`),
            gulpJsonTransform((orig) => [
                `version`, `description`,
                `author`, `homepage`, `bugs`,
                `license`, `keywords`, `typings`,
                `peerDependencies`
            ].reduce((copy, key) => (
                (copy[key] = orig[key]) && copy || copy
            ), {
                main: `Arrow.js`,
                name: `${orig.name}/${target}/${format}`
            }), 2),
            gulp.dest(outDir),
            errorOnce(cb)
        )
    ];
}

function testTask(target, format, taskName, outDir, debug) {
    const testTSConfigPath = `./test/tsconfig.json`;
    const jestOptions = !debug ? [] : [
        `--runInBand`, `--env`, `jest-environment-node-debug`
    ];
    argv.update && jestOptions.unshift(`-u`);
    const forkOptions = {
        execPath: `node`,
        execArgv: [
            `--harmony_async_iteration`,
            ...(!debug ? [] : [`--inspect-brk`])
        ],
        stdio: [`ignore`, `inherit`, `inherit`, `ipc`],
        env: Object.assign({}, process.env, {
            TS_NODE_FAST: true,
            TS_NODE_CACHE: false,
            TS_NODE_PROJECT: testTSConfigPath,
            TEST_TARGET: target, TEST_MODULE: format
        })
    };
    return [
        (cb) => {
            const onError = errorOnce(cb);
            const proc = child_process.fork(
                `./node_modules/.bin/jest`,
                jestOptions, forkOptions
            );
            proc.on(`error`, onError);
            proc.on(`close`, (x) => cb());
        }
    ];
}

function closureTask(target, format, taskName, outDir) {
    const clsTarget = `es5`;
    const googleRoot = `targets/${clsTarget}/cls`;
    const languageIn = clsTarget === `es5` ? `es2015` : clsTarget;
    return [
        [`clean:${taskName}`, `build:${clsTarget}:cls`],
        (cb) => {
            const onError = errorOnce(cb);
            return streamMerge([
                closureStream(closureSrcs(), `Arrow`, onError, true),
                closureStream(closureSrcs(), `Arrow.internal`, onError)
            ])
            .on('end', () => del([`targets/${target}/cls/**`]));
        }
    ];
    function closureSrcs() {
        return gulp.src([
            `closure-compiler/*.js`,
            `${googleRoot}/**/*.js`,
            `!${googleRoot}/format/*.js`,
            `!${googleRoot}/Arrow.externs.js`
        ], { base: `./` });
    }
    function closureStream(sources, entry, onError, copyToDist) {
        const streams = [
            sources,
            sourcemaps.init(),
            closureCompiler(closureArgs(entry)),
            sourcemaps.write('.'),
            gulp.dest(outDir)
        ];
        // copy the UMD bundle to dist
        if (target === `es5` && copyToDist) {
            streams.push(gulp.dest(`dist`))
        }
        return pump(...streams, onError);
    }
    function closureArgs(entry) {
        return {
            third_party: true,
            externs: `${googleRoot}/Arrow.externs.js`,
            warning_level: `QUIET`,
            dependency_mode: `LOOSE`,
            rewrite_polyfills: false,
            // formatting: `PRETTY_PRINT`,
            compilation_level: `ADVANCED`,
            assume_function_wrapper: true,
            js_output_file: `${entry}.js`,
            language_in: gCCTargets[languageIn],
            language_out: gCCTargets[clsTarget],
            entry_point: `${googleRoot}/${entry}.js`,
            output_wrapper: `(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (factory(global.Arrow = global.Arrow || {}));
}(this, (function (exports) {%output%}.bind(this))));`
        };
    }
}

function typescriptTask(target, format, taskName, outDir) {
    return [
        [`clean:${taskName}`],
        (cb) => {
            const onError = errorOnce(cb);
            const tsconfigPath = `tsconfig/tsconfig.${target}.${format}.json`;
            const { tsProject } = (
                tsProjects.find((p) => p.target === target && p.format === format) ||
                tsProjects[-1 + tsProjects.push({
                    target, format, tsProject: ts.createProject(tsconfigPath)
                })]
            );
            const { js, dts } = pump(
                tsProject.src(),
                sourcemaps.init(),
                tsProject(ts.reporter.fullReporter(true)),
                onError
            );
            const dtsStreams = [dts, gulp.dest(`${outDir}/types`)];
            const jsStreams = [js, sourcemaps.write(), gulp.dest(outDir)];
            // copy types to the root
            if (target === `es5` && format === `cjs`) {
                dtsStreams.push(gulp.dest(`types`));
            }
            return streamMerge([
                pump(...dtsStreams, onError),
                pump(...jsStreams, onError)
            ]);
        }
    ];
}

function errorOnce(cb) {
    return () => {};
}

function* combinations(_targets, _modules) {

    const targets = known(knownTargets, _targets || [`all`]);
    const modules = known(knownModules, _modules || [`all`]);

    for (const format of modules) {
        for (const target of targets) {
            yield [target, format];
        }
    }

    function known(known, values) {
        return ~values.indexOf(`all`)
            ? known
            : Object.keys(
                values.reduce((map, arg) => ((
                    (known.indexOf(arg) !== -1) &&
                    (map[arg.toLowerCase()] = true)
                    || true) && map
                ), {})
            ).sort((a, b) => known.indexOf(a) - known.indexOf(b));
    }
}

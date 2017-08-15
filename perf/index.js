const Benchmark = require('benchmark');
const arrowTestConfigurations = require('./config');
const { Table, readBuffers } = require('../dist/Arrow');
const suites = [];

for (let [name, ...buffers] of arrowTestConfigurations) {
    const parseSuite = new Benchmark.Suite(`Parse ${name}`, { async: true });
    const sliceSuite = new Benchmark.Suite(`Slice ${name} vectors`, { async: true });
    const iterateSuite = new Benchmark.Suite(`Iterate ${name} vectors`, { async: true });
    const getByIndexSuite = new Benchmark.Suite(`Get ${name} values by index`, { async: true });
    parseSuite.add(createFromTableTest(name, buffers));
    parseSuite.add(createReadBuffersTest(name, buffers));
    for (const vector of Table.from(...buffers).cols()) {
        sliceSuite.add(createSliceTest(vector));
        iterateSuite.add(createIterateTest(vector));
        getByIndexSuite.add(createGetByIndexTest(vector));
    }
    suites.push(parseSuite, sliceSuite, getByIndexSuite, iterateSuite);
}

console.log('Running apache-arrow performance tests...\n');

run();

function run() {
    var suite = suites.shift();
    suite && suite.on('complete', function() {
        console.log(suite.name + ':\n' + this.map(function(x) {
            var str = x.toString();
            var meanMsPerOp = Math.round(x.stats.mean * 100000)/100;
            var sliceOf60FPS = Math.round((meanMsPerOp / (1000/60)) * 100000)/1000;
            return `${str} (avg: ${meanMsPerOp}ms, or ${sliceOf60FPS}% of a frame @ 60FPS) ${x.suffix || ''}`;
        }).join('\n') + '\n');
        if (suites.length > 0) {
            setTimeout(run, 1000);
        }
    })
    .run({ async: true });
}

function createFromTableTest(name, buffers) {
    let table;
    return {
        async: true,
        name: `Table.from`,
        fn() { table = Table.from(...buffers); }
    };
}

function createReadBuffersTest(name, buffers) {
    let vectors;
    return {
        async: true,
        name: `readBuffers`,
        fn() { for (vectors of readBuffers(...buffers)) {} }
    };
}

function createSliceTest(vector) {
    let xs;
    return {
        async: true,
        name: `name: '${vector.name}', length: ${vector.length}, type: ${vector.type}`,
        fn() { xs = vector.slice(); }
    };
}

function createIterateTest(vector) {
    let value;
    return {
        async: true,
        name: `name: '${vector.name}', length: ${vector.length}, type: ${vector.type}`,
        fn() { for (value of vector) {} }
    };
}

function createGetByIndexTest(vector) {
    let value;
    return {
        async: true,
        name: `name: '${vector.name}', length: ${vector.length}, type: ${vector.type}`,
        fn() {
            for (let i = -1, n = vector.length; ++i < n;) {
                value = vector.get(i);
            }
        }
    };
}

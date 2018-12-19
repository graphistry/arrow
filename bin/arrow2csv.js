#! /usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs = require("fs");
const stream = require("stream");
const util_1 = require("util");
const pretty_1 = require("../util/pretty");
const Arrow_node_1 = require("../Arrow.node");
const padLeft = require('pad-left');
const eos = util_1.promisify(stream.finished);
const { parse } = require('json-bignum');
const argv = require(`command-line-args`)(cliOpts(), { partial: true });
const files = argv.help ? [] : [...(argv.file || []), ...(argv._unknown || [])].filter(Boolean);
process.stdout.on('error', (err) => err.code === 'EPIPE' && process.exit());
(() => tslib_1.__awaiter(this, void 0, void 0, function* () {
    const state = Object.assign({}, argv, { hasRecords: false });
    const sources = argv.help ? [] : [
        ...files.map((file) => () => fs.createReadStream(file)),
        () => process.stdin
    ].filter(Boolean);
    for (const source of sources) {
        const stream = yield createRecordBatchStream(source);
        if (stream) {
            yield eos(stream
                .pipe(transformRecordBatchRowsToString(state))
                .pipe(process.stdout, { end: false }));
        }
    }
    return state.hasRecords ? 0 : print_usage();
}))()
    .then((x) => +x || 0, (err) => {
    if (err) {
        console.error(`${err && err.stack || err}`);
    }
    return process.exitCode || 1;
}).then((code) => process.exit(code));
function createRecordBatchStream(createSourceStream) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let source = createSourceStream();
        let reader = null;
        try {
            reader = yield (yield Arrow_node_1.RecordBatchReader.from(source)).open(true);
        }
        catch (e) {
            reader = null;
        }
        if ((!reader || reader.closed) && source instanceof fs.ReadStream) {
            reader = null;
            source.close();
            try {
                let path = source.path;
                let json = parse(yield fs.promises.readFile(path, 'utf8'));
                reader = yield (yield Arrow_node_1.RecordBatchReader.from(json)).open();
            }
            catch (e) {
                reader = null;
            }
        }
        return (reader && !reader.closed) ? reader.toReadableNodeStream() : null;
    });
}
function transformRecordBatchRowsToString(state) {
    let rowId = 0, separator = `${state.separator || ' |'} `;
    return new stream.Transform({
        encoding: 'utf8',
        writableObjectMode: true,
        readableObjectMode: false,
        transform(batch, _enc, cb) {
            state.hasRecords = state.hasRecords || batch.length > 0;
            if (state.schema && state.schema.length) {
                batch = batch.select(...state.schema);
            }
            const maxColWidths = [11];
            const header = ['row_id', ...batch.schema.fields.map((f) => `${f}`)].map(pretty_1.valueToString);
            header.forEach((x, i) => {
                maxColWidths[i] = Math.max(maxColWidths[i] || 0, x.length);
            });
            // Pass one to convert to strings and count max column widths
            for (let i = -1, n = batch.length - 1; ++i < n;) {
                let row = [rowId + i, ...batch.get(i)];
                for (let j = -1, k = row.length; ++j < k;) {
                    maxColWidths[j] = Math.max(maxColWidths[j] || 0, pretty_1.valueToString(row[j]).length);
                }
            }
            for (let i = -1, n = batch.length; ++i < n;) {
                if ((rowId + i) % 350 === 0) {
                    this.push(header
                        .map((x, j) => padLeft(x, maxColWidths[j]))
                        .join(separator) + '\n');
                }
                this.push([rowId + i, ...batch.get(i)]
                    .map((x) => pretty_1.valueToString(x))
                    .map((x, j) => padLeft(x, maxColWidths[j]))
                    .join(separator) + '\n');
            }
            cb();
        }
    });
}
function cliOpts() {
    return [
        {
            type: String,
            name: 'schema', alias: 's',
            optional: true, multiple: true,
            typeLabel: '{underline columns}',
            description: 'A space-delimited list of column names'
        },
        {
            type: String,
            name: 'file', alias: 'f',
            optional: true, multiple: true,
            description: 'The Arrow file to read'
        },
        {
            type: String,
            name: 'sep', optional: true, default: '|',
            description: 'The column separator character'
        },
        {
            type: Boolean,
            name: 'help', optional: true, default: false,
            description: 'Print this usage guide.'
        }
    ];
}
function print_usage() {
    console.log(require('command-line-usage')([
        {
            header: 'arrow2csv',
            content: 'Print a CSV from an Arrow file'
        },
        {
            header: 'Synopsis',
            content: [
                '$ arrow2csv {underline file.arrow} [{bold --schema} column_name ...]',
                '$ arrow2csv [{bold --schema} column_name ...] [{bold --file} {underline file.arrow}]',
                '$ arrow2csv {bold -s} column_1 {bold -s} column_2 [{bold -f} {underline file.arrow}]',
                '$ arrow2csv [{bold --help}]'
            ]
        },
        {
            header: 'Options',
            optionList: cliOpts()
        },
        {
            header: 'Example',
            content: [
                '$ arrow2csv --schema foo baz -f simple.arrow --sep ","',
                '> "row_id", "foo: Int32", "bar: Float64", "baz: Utf8"',
                '>        0,            1,              1,        "aa"',
                '>        1,         null,           null,        null',
                '>        2,            3,           null,        null',
                '>        3,            4,              4,       "bbb"',
                '>        4,            5,              5,      "cccc"',
            ]
        }
    ]));
    return 1;
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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SjtRQUNEO1lBQ0ksTUFBTSxFQUFFLFNBQVM7WUFDakIsVUFBVSxFQUFFLE9BQU8sRUFBRTtTQUN4QjtRQUNEO1lBQ0ksTUFBTSxFQUFFLFNBQVM7WUFDakIsT0FBTyxFQUFFO2dCQUNMLHdEQUF3RDtnQkFDeEQsdURBQXVEO2dCQUN2RCx1REFBdUQ7Z0JBQ3ZELHVEQUF1RDtnQkFDdkQsdURBQXVEO2dCQUN2RCx1REFBdUQ7Z0JBQ3ZELHVEQUF1RDthQUMxRDtTQUNKO0tBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixPQUFPLENBQUMsQ0FBQztBQUNiLENBQUMiLCJmaWxlIjoiYXJyb3cyY3N2LmpzIiwic291cmNlc0NvbnRlbnQiOlsiIyEgL3Vzci9iaW4vZW52IG5vZGVcblxuLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHN0cmVhbSBmcm9tICdzdHJlYW0nO1xuaW1wb3J0IHsgcHJvbWlzaWZ5IH0gZnJvbSAndXRpbCc7XG5pbXBvcnQgeyB2YWx1ZVRvU3RyaW5nIH0gZnJvbSAnLi4vdXRpbC9wcmV0dHknO1xuaW1wb3J0IHsgUmVjb3JkQmF0Y2gsIFJlY29yZEJhdGNoUmVhZGVyIH0gZnJvbSAnLi4vQXJyb3cubm9kZSc7XG5cbmNvbnN0IHBhZExlZnQgPSByZXF1aXJlKCdwYWQtbGVmdCcpO1xuY29uc3QgZW9zID0gcHJvbWlzaWZ5KHN0cmVhbS5maW5pc2hlZCk7XG5jb25zdCB7IHBhcnNlIH0gPSByZXF1aXJlKCdqc29uLWJpZ251bScpO1xuY29uc3QgYXJndiA9IHJlcXVpcmUoYGNvbW1hbmQtbGluZS1hcmdzYCkoY2xpT3B0cygpLCB7IHBhcnRpYWw6IHRydWUgfSk7XG5jb25zdCBmaWxlcyA9IGFyZ3YuaGVscCA/IFtdIDogWy4uLihhcmd2LmZpbGUgfHwgW10pLCAuLi4oYXJndi5fdW5rbm93biB8fCBbXSldLmZpbHRlcihCb29sZWFuKTtcblxucHJvY2Vzcy5zdGRvdXQub24oJ2Vycm9yJywgKGVycikgPT4gZXJyLmNvZGUgPT09ICdFUElQRScgJiYgcHJvY2Vzcy5leGl0KCkpO1xuXG4oYXN5bmMgKCkgPT4ge1xuXG4gICAgY29uc3Qgc3RhdGUgPSB7IC4uLmFyZ3YsIGhhc1JlY29yZHM6IGZhbHNlIH07XG4gICAgY29uc3Qgc291cmNlcyA9IGFyZ3YuaGVscCA/IFtdIDogW1xuICAgICAgICAuLi5maWxlcy5tYXAoKGZpbGUpID0+ICgpID0+IGZzLmNyZWF0ZVJlYWRTdHJlYW0oZmlsZSkpLFxuICAgICAgICAoKSA9PiBwcm9jZXNzLnN0ZGluXG4gICAgXS5maWx0ZXIoQm9vbGVhbikgYXMgKCgpID0+IE5vZGVKUy5SZWFkYWJsZVN0cmVhbSlbXTtcblxuICAgIGZvciAoY29uc3Qgc291cmNlIG9mIHNvdXJjZXMpIHtcbiAgICAgICAgY29uc3Qgc3RyZWFtID0gYXdhaXQgY3JlYXRlUmVjb3JkQmF0Y2hTdHJlYW0oc291cmNlKTtcbiAgICAgICAgaWYgKHN0cmVhbSkge1xuICAgICAgICAgICAgYXdhaXQgZW9zKHN0cmVhbVxuICAgICAgICAgICAgICAgIC5waXBlKHRyYW5zZm9ybVJlY29yZEJhdGNoUm93c1RvU3RyaW5nKHN0YXRlKSlcbiAgICAgICAgICAgICAgICAucGlwZShwcm9jZXNzLnN0ZG91dCwgeyBlbmQ6IGZhbHNlIH0pKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzdGF0ZS5oYXNSZWNvcmRzID8gMCA6IHByaW50X3VzYWdlKCk7XG59KSgpXG4udGhlbigoeCkgPT4gK3ggfHwgMCwgKGVycikgPT4ge1xuICAgIGlmIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgJHtlcnIgJiYgZXJyLnN0YWNrIHx8IGVycn1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHByb2Nlc3MuZXhpdENvZGUgfHwgMTtcbn0pLnRoZW4oKGNvZGUpID0+IHByb2Nlc3MuZXhpdChjb2RlKSk7XG5cbmFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVJlY29yZEJhdGNoU3RyZWFtKGNyZWF0ZVNvdXJjZVN0cmVhbTogKCkgPT4gTm9kZUpTLlJlYWRhYmxlU3RyZWFtKSB7XG5cbiAgICBsZXQgc291cmNlID0gY3JlYXRlU291cmNlU3RyZWFtKCk7XG4gICAgbGV0IHJlYWRlcjogUmVjb3JkQmF0Y2hSZWFkZXIgfCBudWxsID0gbnVsbDtcblxuICAgIHRyeSB7XG4gICAgICAgIHJlYWRlciA9IGF3YWl0IChhd2FpdCBSZWNvcmRCYXRjaFJlYWRlci5mcm9tKHNvdXJjZSkpLm9wZW4odHJ1ZSk7XG4gICAgfSBjYXRjaCAoZSkgeyByZWFkZXIgPSBudWxsOyB9XG5cbiAgICBpZiAoKCFyZWFkZXIgfHwgcmVhZGVyLmNsb3NlZCkgJiYgc291cmNlIGluc3RhbmNlb2YgZnMuUmVhZFN0cmVhbSkge1xuICAgICAgICByZWFkZXIgPSBudWxsO1xuICAgICAgICBzb3VyY2UuY2xvc2UoKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxldCBwYXRoID0gc291cmNlLnBhdGg7XG4gICAgICAgICAgICBsZXQganNvbiA9IHBhcnNlKGF3YWl0IGZzLnByb21pc2VzLnJlYWRGaWxlKHBhdGgsICd1dGY4JykpO1xuICAgICAgICAgICAgcmVhZGVyID0gYXdhaXQgKGF3YWl0IFJlY29yZEJhdGNoUmVhZGVyLmZyb20oanNvbikpLm9wZW4oKTtcbiAgICAgICAgfSBjYXRjaCAoZSkgeyByZWFkZXIgPSBudWxsOyB9XG4gICAgfVxuXG4gICAgcmV0dXJuIChyZWFkZXIgJiYgIXJlYWRlci5jbG9zZWQpID8gcmVhZGVyLnRvUmVhZGFibGVOb2RlU3RyZWFtKCkgOiBudWxsO1xufVxuXG5mdW5jdGlvbiB0cmFuc2Zvcm1SZWNvcmRCYXRjaFJvd3NUb1N0cmluZyhzdGF0ZTogeyBzY2hlbWE6IGFueSwgc2VwYXJhdG9yOiBzdHJpbmcsIGhhc1JlY29yZHM6IGJvb2xlYW4gfSkge1xuICAgIGxldCByb3dJZCA9IDAsIHNlcGFyYXRvciA9IGAke3N0YXRlLnNlcGFyYXRvciB8fCAnIHwnfSBgO1xuICAgIHJldHVybiBuZXcgc3RyZWFtLlRyYW5zZm9ybSh7XG4gICAgICAgIGVuY29kaW5nOiAndXRmOCcsXG4gICAgICAgIHdyaXRhYmxlT2JqZWN0TW9kZTogdHJ1ZSxcbiAgICAgICAgcmVhZGFibGVPYmplY3RNb2RlOiBmYWxzZSxcbiAgICAgICAgdHJhbnNmb3JtKGJhdGNoOiBSZWNvcmRCYXRjaCwgX2VuYzogc3RyaW5nLCBjYjogKGVycm9yPzogRXJyb3IsIGRhdGE/OiBhbnkpID0+IHZvaWQpIHtcblxuICAgICAgICAgICAgc3RhdGUuaGFzUmVjb3JkcyA9IHN0YXRlLmhhc1JlY29yZHMgfHwgYmF0Y2gubGVuZ3RoID4gMDtcbiAgICAgICAgICAgIGlmIChzdGF0ZS5zY2hlbWEgJiYgc3RhdGUuc2NoZW1hLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGJhdGNoID0gYmF0Y2guc2VsZWN0KC4uLnN0YXRlLnNjaGVtYSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG1heENvbFdpZHRocyA9IFsxMV07XG4gICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBbJ3Jvd19pZCcsIC4uLmJhdGNoLnNjaGVtYS5maWVsZHMubWFwKChmKSA9PiBgJHtmfWApXS5tYXAodmFsdWVUb1N0cmluZyk7XG5cbiAgICAgICAgICAgIGhlYWRlci5mb3JFYWNoKCh4LCBpKSA9PiB7XG4gICAgICAgICAgICAgICAgbWF4Q29sV2lkdGhzW2ldID0gTWF0aC5tYXgobWF4Q29sV2lkdGhzW2ldIHx8IDAsIHgubGVuZ3RoKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBQYXNzIG9uZSB0byBjb252ZXJ0IHRvIHN0cmluZ3MgYW5kIGNvdW50IG1heCBjb2x1bW4gd2lkdGhzXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gLTEsIG4gPSBiYXRjaC5sZW5ndGggLSAxOyArK2kgPCBuOykge1xuICAgICAgICAgICAgICAgIGxldCByb3cgPSBbcm93SWQgKyBpLCAuLi5iYXRjaC5nZXQoaSkhXTtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gLTEsIGsgPSByb3cubGVuZ3RoOyArK2ogPCBrOyApIHtcbiAgICAgICAgICAgICAgICAgICAgbWF4Q29sV2lkdGhzW2pdID0gTWF0aC5tYXgobWF4Q29sV2lkdGhzW2pdIHx8IDAsIHZhbHVlVG9TdHJpbmcocm93W2pdKS5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IC0xLCBuID0gYmF0Y2gubGVuZ3RoOyArK2kgPCBuOykge1xuICAgICAgICAgICAgICAgIGlmICgocm93SWQgKyBpKSAlIDM1MCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2goaGVhZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAubWFwKCh4LCBqKSA9PiBwYWRMZWZ0KHgsIG1heENvbFdpZHRoc1tqXSkpXG4gICAgICAgICAgICAgICAgICAgICAgICAuam9pbihzZXBhcmF0b3IpICsgJ1xcbicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnB1c2goW3Jvd0lkICsgaSwgLi4uYmF0Y2guZ2V0KGkpIV1cbiAgICAgICAgICAgICAgICAgICAgLm1hcCgoeCkgPT4gdmFsdWVUb1N0cmluZyh4KSlcbiAgICAgICAgICAgICAgICAgICAgLm1hcCgoeCwgaikgPT4gcGFkTGVmdCh4LCBtYXhDb2xXaWR0aHNbal0pKVxuICAgICAgICAgICAgICAgICAgICAuam9pbihzZXBhcmF0b3IpICsgJ1xcbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2IoKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBjbGlPcHRzKCkge1xuICAgIHJldHVybiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6IFN0cmluZyxcbiAgICAgICAgICAgIG5hbWU6ICdzY2hlbWEnLCBhbGlhczogJ3MnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsIG11bHRpcGxlOiB0cnVlLFxuICAgICAgICAgICAgdHlwZUxhYmVsOiAne3VuZGVybGluZSBjb2x1bW5zfScsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Egc3BhY2UtZGVsaW1pdGVkIGxpc3Qgb2YgY29sdW1uIG5hbWVzJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiBTdHJpbmcsXG4gICAgICAgICAgICBuYW1lOiAnZmlsZScsIGFsaWFzOiAnZicsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSwgbXVsdGlwbGU6IHRydWUsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBBcnJvdyBmaWxlIHRvIHJlYWQnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6IFN0cmluZyxcbiAgICAgICAgICAgIG5hbWU6ICdzZXAnLCBvcHRpb25hbDogdHJ1ZSwgZGVmYXVsdDogJ3wnLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgY29sdW1uIHNlcGFyYXRvciBjaGFyYWN0ZXInXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6IEJvb2xlYW4sXG4gICAgICAgICAgICBuYW1lOiAnaGVscCcsIG9wdGlvbmFsOiB0cnVlLCBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUHJpbnQgdGhpcyB1c2FnZSBndWlkZS4nXG4gICAgICAgIH1cbiAgICBdOyAgICBcbn1cblxuZnVuY3Rpb24gcHJpbnRfdXNhZ2UoKSB7XG4gICAgY29uc29sZS5sb2cocmVxdWlyZSgnY29tbWFuZC1saW5lLXVzYWdlJykoW1xuICAgICAgICB7XG4gICAgICAgICAgICBoZWFkZXI6ICdhcnJvdzJjc3YnLFxuICAgICAgICAgICAgY29udGVudDogJ1ByaW50IGEgQ1NWIGZyb20gYW4gQXJyb3cgZmlsZSdcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgaGVhZGVyOiAnU3lub3BzaXMnLFxuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAgICckIGFycm93MmNzdiB7dW5kZXJsaW5lIGZpbGUuYXJyb3d9IFt7Ym9sZCAtLXNjaGVtYX0gY29sdW1uX25hbWUgLi4uXScsXG4gICAgICAgICAgICAgICAgJyQgYXJyb3cyY3N2IFt7Ym9sZCAtLXNjaGVtYX0gY29sdW1uX25hbWUgLi4uXSBbe2JvbGQgLS1maWxlfSB7dW5kZXJsaW5lIGZpbGUuYXJyb3d9XScsXG4gICAgICAgICAgICAgICAgJyQgYXJyb3cyY3N2IHtib2xkIC1zfSBjb2x1bW5fMSB7Ym9sZCAtc30gY29sdW1uXzIgW3tib2xkIC1mfSB7dW5kZXJsaW5lIGZpbGUuYXJyb3d9XScsXG4gICAgICAgICAgICAgICAgJyQgYXJyb3cyY3N2IFt7Ym9sZCAtLWhlbHB9XSdcbiAgICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgaGVhZGVyOiAnT3B0aW9ucycsXG4gICAgICAgICAgICBvcHRpb25MaXN0OiBjbGlPcHRzKClcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgaGVhZGVyOiAnRXhhbXBsZScsXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgICAgJyQgYXJyb3cyY3N2IC0tc2NoZW1hIGZvbyBiYXogLWYgc2ltcGxlLmFycm93IC0tc2VwIFwiLFwiJyxcbiAgICAgICAgICAgICAgICAnPiBcInJvd19pZFwiLCBcImZvbzogSW50MzJcIiwgXCJiYXI6IEZsb2F0NjRcIiwgXCJiYXo6IFV0ZjhcIicsXG4gICAgICAgICAgICAgICAgJz4gICAgICAgIDAsICAgICAgICAgICAgMSwgICAgICAgICAgICAgIDEsICAgICAgICBcImFhXCInLFxuICAgICAgICAgICAgICAgICc+ICAgICAgICAxLCAgICAgICAgIG51bGwsICAgICAgICAgICBudWxsLCAgICAgICAgbnVsbCcsXG4gICAgICAgICAgICAgICAgJz4gICAgICAgIDIsICAgICAgICAgICAgMywgICAgICAgICAgIG51bGwsICAgICAgICBudWxsJyxcbiAgICAgICAgICAgICAgICAnPiAgICAgICAgMywgICAgICAgICAgICA0LCAgICAgICAgICAgICAgNCwgICAgICAgXCJiYmJcIicsXG4gICAgICAgICAgICAgICAgJz4gICAgICAgIDQsICAgICAgICAgICAgNSwgICAgICAgICAgICAgIDUsICAgICAgXCJjY2NjXCInLFxuICAgICAgICAgICAgXVxuICAgICAgICB9XG4gICAgXSkpO1xuICAgIHJldHVybiAxO1xufVxuIl19

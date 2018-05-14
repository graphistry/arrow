#! /usr/bin/env node
"use strict";
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var fs = require("fs");
var util_1 = require("util");
var Arrow = require("../Arrow");
var readFile = util_1.promisify(fs.readFile);
var parse = require('json-bignum').parse;
var argv = require("command-line-args")(cliOpts(), { partial: true });
var files = tslib_1.__spread((argv.file || []), (argv._unknown || [])).filter(Boolean);
(function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
    var buffers, totalLength, _a, _b, chunk, e_1_1, files_1, files_1_1, input, _c, _d, e_2_1, e_1, _e, e_2, _f;
    return tslib_1.__generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                if (!!files.length) return [3 /*break*/, 14];
                buffers = [], totalLength = 0;
                _g.label = 1;
            case 1:
                _g.trys.push([1, 7, 8, 13]);
                _a = tslib_1.__asyncValues(process.stdin);
                _g.label = 2;
            case 2: return [4 /*yield*/, _a.next()];
            case 3:
                if (!(_b = _g.sent(), !_b.done)) return [3 /*break*/, 6];
                return [4 /*yield*/, _b.value];
            case 4:
                chunk = _g.sent();
                if (!Buffer.isBuffer(chunk)) {
                    chunk = Buffer.from(chunk, 'binary');
                }
                buffers.push(chunk);
                totalLength += chunk.byteLength;
                _g.label = 5;
            case 5: return [3 /*break*/, 2];
            case 6: return [3 /*break*/, 13];
            case 7:
                e_1_1 = _g.sent();
                e_1 = { error: e_1_1 };
                return [3 /*break*/, 13];
            case 8:
                _g.trys.push([8, , 11, 12]);
                if (!(_b && !_b.done && (_e = _a.return))) return [3 /*break*/, 10];
                return [4 /*yield*/, _e.call(_a)];
            case 9:
                _g.sent();
                _g.label = 10;
            case 10: return [3 /*break*/, 12];
            case 11:
                if (e_1) throw e_1.error;
                return [7 /*endfinally*/];
            case 12: return [7 /*endfinally*/];
            case 13:
                if (buffers.length === 0) {
                    return [2 /*return*/, print_usage()];
                }
                files.push(Buffer.concat(buffers, totalLength));
                _g.label = 14;
            case 14:
                _g.trys.push([14, 21, 22, 23]);
                files_1 = tslib_1.__values(files), files_1_1 = files_1.next();
                _g.label = 15;
            case 15:
                if (!!files_1_1.done) return [3 /*break*/, 20];
                input = files_1_1.value;
                _c = printTable;
                if (!(typeof input === 'string')) return [3 /*break*/, 17];
                return [4 /*yield*/, readFile(input)];
            case 16:
                _d = _g.sent();
                return [3 /*break*/, 18];
            case 17:
                _d = input;
                _g.label = 18;
            case 18:
                _c.apply(void 0, [_d]);
                _g.label = 19;
            case 19:
                files_1_1 = files_1.next();
                return [3 /*break*/, 15];
            case 20: return [3 /*break*/, 23];
            case 21:
                e_2_1 = _g.sent();
                e_2 = { error: e_2_1 };
                return [3 /*break*/, 23];
            case 22:
                try {
                    if (files_1_1 && !files_1_1.done && (_f = files_1.return)) _f.call(files_1);
                }
                finally { if (e_2) throw e_2.error; }
                return [7 /*endfinally*/];
            case 23: return [2 /*return*/];
        }
    });
}); })().catch(function (e) { console.error(e); process.exit(1); });
function printTable(input) {
    var table;
    try {
        table = Arrow.Table.from(input);
    }
    catch (e) {
        table = Arrow.Table.from(parse(input + ''));
    }
    if (argv.schema && argv.schema.length) {
        table = table.select.apply(table, tslib_1.__spread(argv.schema));
    }
    table.rowsToString().pipe(process.stdout);
}
function cliOpts() {
    return [
        {
            type: String,
            name: 'schema', alias: 's',
            optional: true, multiple: true,
            typeLabel: '[underline]{columns}',
            description: 'A space-delimited list of column names'
        },
        {
            type: String,
            name: 'file', alias: 'f',
            optional: false, multiple: true,
            description: 'The Arrow file to read'
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
                '$ arrow2csv [underline]{file.arrow} [[bold]{--schema} column_name ...]',
                '$ arrow2csv [[bold]{--schema} column_name ...] [[bold]{--file} [underline]{file.arrow}]',
                '$ arrow2csv [bold]{-s} column_1 [bold]{-s} column_2 [[bold]{-f} [underline]{file.arrow}]',
                '$ arrow2csv [[bold]{--help}]'
            ]
        },
        {
            header: 'Options',
            optionList: tslib_1.__spread(cliOpts(), [
                {
                    name: 'help',
                    description: 'Print this usage guide.'
                }
            ])
        },
        {
            header: 'Example',
            content: [
                '$ arrow2csv --schema foo baz -f simple.arrow',
                '>  foo,  baz',
                '>    1,   aa',
                '> null, null',
                '>    3, null',
                '>    4,  bbb',
                '>    5, cccc',
            ]
        }
    ]));
    process.exit(1);
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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O0tBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BCLENBQUMiLCJmaWxlIjoiYXJyb3cyY3N2LmpzIiwic291cmNlc0NvbnRlbnQiOlsiIyEgL3Vzci9iaW4vZW52IG5vZGVcblxuLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbi8qIHRzbGludDpkaXNhYmxlICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7IHByb21pc2lmeSB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0ICogYXMgQXJyb3cgZnJvbSAnLi4vQXJyb3cnO1xuXG5jb25zdCByZWFkRmlsZSA9IHByb21pc2lmeShmcy5yZWFkRmlsZSk7XG5jb25zdCB7IHBhcnNlIH0gPSByZXF1aXJlKCdqc29uLWJpZ251bScpO1xuY29uc3QgYXJndiA9IHJlcXVpcmUoYGNvbW1hbmQtbGluZS1hcmdzYCkoY2xpT3B0cygpLCB7IHBhcnRpYWw6IHRydWUgfSk7XG5jb25zdCBmaWxlcyA9IFsuLi4oYXJndi5maWxlIHx8IFtdKSwgLi4uKGFyZ3YuX3Vua25vd24gfHwgW10pXS5maWx0ZXIoQm9vbGVhbik7XG5cbihhc3luYyAoKSA9PiB7XG4gICAgaWYgKCFmaWxlcy5sZW5ndGgpIHtcbiAgICAgICAgbGV0IGJ1ZmZlcnMgPSBbXSwgdG90YWxMZW5ndGggPSAwO1xuICAgICAgICBmb3IgYXdhaXQgKGxldCBjaHVuayBvZiAocHJvY2Vzcy5zdGRpbiBhcyBhbnkpKSB7XG4gICAgICAgICAgICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihjaHVuaykpIHtcbiAgICAgICAgICAgICAgICBjaHVuayA9IEJ1ZmZlci5mcm9tKGNodW5rLCAnYmluYXJ5Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBidWZmZXJzLnB1c2goY2h1bmspO1xuICAgICAgICAgICAgdG90YWxMZW5ndGggKz0gY2h1bmsuYnl0ZUxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYnVmZmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBwcmludF91c2FnZSgpO1xuICAgICAgICB9XG4gICAgICAgIGZpbGVzLnB1c2goQnVmZmVyLmNvbmNhdChidWZmZXJzLCB0b3RhbExlbmd0aCkpO1xuICAgIH1cbiAgICBmb3IgKGxldCBpbnB1dCBvZiBmaWxlcykge1xuICAgICAgICBwcmludFRhYmxlKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycgPyBhd2FpdCByZWFkRmlsZShpbnB1dCkgOiBpbnB1dCk7XG4gICAgfVxufSkoKS5jYXRjaCgoZSkgPT4geyBjb25zb2xlLmVycm9yKGUpOyBwcm9jZXNzLmV4aXQoMSk7IH0pO1xuXG5mdW5jdGlvbiBwcmludFRhYmxlKGlucHV0OiBhbnkpIHtcbiAgICBsZXQgdGFibGU6IEFycm93LlRhYmxlO1xuICAgIHRyeSB7XG4gICAgICAgIHRhYmxlID0gQXJyb3cuVGFibGUuZnJvbShpbnB1dCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0YWJsZSA9IEFycm93LlRhYmxlLmZyb20ocGFyc2UoaW5wdXQgKyAnJykpO1xuICAgIH1cbiAgICBpZiAoYXJndi5zY2hlbWEgJiYgYXJndi5zY2hlbWEubGVuZ3RoKSB7XG4gICAgICAgIHRhYmxlID0gdGFibGUuc2VsZWN0KC4uLmFyZ3Yuc2NoZW1hKTtcbiAgICB9XG4gICAgdGFibGUucm93c1RvU3RyaW5nKCkucGlwZShwcm9jZXNzLnN0ZG91dCk7XG59XG5cbmZ1bmN0aW9uIGNsaU9wdHMoKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogU3RyaW5nLFxuICAgICAgICAgICAgbmFtZTogJ3NjaGVtYScsIGFsaWFzOiAncycsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSwgbXVsdGlwbGU6IHRydWUsXG4gICAgICAgICAgICB0eXBlTGFiZWw6ICdbdW5kZXJsaW5lXXtjb2x1bW5zfScsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Egc3BhY2UtZGVsaW1pdGVkIGxpc3Qgb2YgY29sdW1uIG5hbWVzJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiBTdHJpbmcsXG4gICAgICAgICAgICBuYW1lOiAnZmlsZScsIGFsaWFzOiAnZicsXG4gICAgICAgICAgICBvcHRpb25hbDogZmFsc2UsIG11bHRpcGxlOiB0cnVlLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgQXJyb3cgZmlsZSB0byByZWFkJ1xuICAgICAgICB9XG4gICAgXTsgICAgXG59XG5cbmZ1bmN0aW9uIHByaW50X3VzYWdlKCkge1xuICAgIGNvbnNvbGUubG9nKHJlcXVpcmUoJ2NvbW1hbmQtbGluZS11c2FnZScpKFtcbiAgICAgICAge1xuICAgICAgICAgICAgaGVhZGVyOiAnYXJyb3cyY3N2JyxcbiAgICAgICAgICAgIGNvbnRlbnQ6ICdQcmludCBhIENTViBmcm9tIGFuIEFycm93IGZpbGUnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGhlYWRlcjogJ1N5bm9wc2lzJyxcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgICAnJCBhcnJvdzJjc3YgW3VuZGVybGluZV17ZmlsZS5hcnJvd30gW1tib2xkXXstLXNjaGVtYX0gY29sdW1uX25hbWUgLi4uXScsXG4gICAgICAgICAgICAgICAgJyQgYXJyb3cyY3N2IFtbYm9sZF17LS1zY2hlbWF9IGNvbHVtbl9uYW1lIC4uLl0gW1tib2xkXXstLWZpbGV9IFt1bmRlcmxpbmVde2ZpbGUuYXJyb3d9XScsXG4gICAgICAgICAgICAgICAgJyQgYXJyb3cyY3N2IFtib2xkXXstc30gY29sdW1uXzEgW2JvbGRdey1zfSBjb2x1bW5fMiBbW2JvbGRdey1mfSBbdW5kZXJsaW5lXXtmaWxlLmFycm93fV0nLFxuICAgICAgICAgICAgICAgICckIGFycm93MmNzdiBbW2JvbGRdey0taGVscH1dJ1xuICAgICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBoZWFkZXI6ICdPcHRpb25zJyxcbiAgICAgICAgICAgIG9wdGlvbkxpc3Q6IFtcbiAgICAgICAgICAgICAgICAuLi5jbGlPcHRzKCksXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnaGVscCcsXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUHJpbnQgdGhpcyB1c2FnZSBndWlkZS4nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBoZWFkZXI6ICdFeGFtcGxlJyxcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgICAnJCBhcnJvdzJjc3YgLS1zY2hlbWEgZm9vIGJheiAtZiBzaW1wbGUuYXJyb3cnLFxuICAgICAgICAgICAgICAgICc+ICBmb28sICBiYXonLFxuICAgICAgICAgICAgICAgICc+ICAgIDEsICAgYWEnLFxuICAgICAgICAgICAgICAgICc+IG51bGwsIG51bGwnLFxuICAgICAgICAgICAgICAgICc+ICAgIDMsIG51bGwnLFxuICAgICAgICAgICAgICAgICc+ICAgIDQsICBiYmInLFxuICAgICAgICAgICAgICAgICc+ICAgIDUsIGNjY2MnLFxuICAgICAgICAgICAgXVxuICAgICAgICB9XG4gICAgXSkpO1xuICAgIHByb2Nlc3MuZXhpdCgxKTtcbn0iXX0=

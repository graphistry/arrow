#! /usr/bin/env node
"use strict";
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var fs = require("fs");
var util_1 = require("util");
var Arrow_1 = require("../Arrow");
var readFile = util_1.promisify(fs.readFile);
var parse = require('json-bignum').parse;
var argv = require("command-line-args")(cliOpts(), { partial: true });
var files = tslib_1.__spread((argv.file || []), (argv._unknown || [])).filter(Boolean);
(function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
    var e_1, _a, e_2, _b, hasRecords, files_1, files_1_1, input, _c, e_1_1, rowOffset, maxColumnWidths, _d, _e, recordBatch, e_2_1;
    return tslib_1.__generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                hasRecords = false;
                if (!(files.length > 0)) return [3 /*break*/, 9];
                hasRecords = true;
                _f.label = 1;
            case 1:
                _f.trys.push([1, 6, 7, 8]);
                files_1 = tslib_1.__values(files), files_1_1 = files_1.next();
                _f.label = 2;
            case 2:
                if (!!files_1_1.done) return [3 /*break*/, 5];
                input = files_1_1.value;
                _c = printTable;
                return [4 /*yield*/, readFile(input)];
            case 3:
                _c.apply(void 0, [_f.sent()]);
                _f.label = 4;
            case 4:
                files_1_1 = files_1.next();
                return [3 /*break*/, 2];
            case 5: return [3 /*break*/, 8];
            case 6:
                e_1_1 = _f.sent();
                e_1 = { error: e_1_1 };
                return [3 /*break*/, 8];
            case 7:
                try {
                    if (files_1_1 && !files_1_1.done && (_a = files_1.return)) _a.call(files_1);
                }
                finally { if (e_1) throw e_1.error; }
                return [7 /*endfinally*/];
            case 8: return [3 /*break*/, 21];
            case 9:
                rowOffset = 0;
                maxColumnWidths = [];
                _f.label = 10;
            case 10:
                _f.trys.push([10, 15, 16, 21]);
                _d = tslib_1.__asyncValues(Arrow_1.readStream(process.stdin));
                _f.label = 11;
            case 11: return [4 /*yield*/, _d.next()];
            case 12:
                if (!(_e = _f.sent(), !_e.done)) return [3 /*break*/, 14];
                recordBatch = _e.value;
                hasRecords = true;
                recordBatch.rowsToString(' | ', rowOffset, maxColumnWidths).pipe(process.stdout);
                rowOffset += recordBatch.length;
                _f.label = 13;
            case 13: return [3 /*break*/, 11];
            case 14: return [3 /*break*/, 21];
            case 15:
                e_2_1 = _f.sent();
                e_2 = { error: e_2_1 };
                return [3 /*break*/, 21];
            case 16:
                _f.trys.push([16, , 19, 20]);
                if (!(_e && !_e.done && (_b = _d.return))) return [3 /*break*/, 18];
                return [4 /*yield*/, _b.call(_d)];
            case 17:
                _f.sent();
                _f.label = 18;
            case 18: return [3 /*break*/, 20];
            case 19:
                if (e_2) throw e_2.error;
                return [7 /*endfinally*/];
            case 20: return [7 /*endfinally*/];
            case 21: return [2 /*return*/, hasRecords ? null : print_usage()];
        }
    });
}); })().catch(function (e) { console.error(e); process.exit(1); });
function printTable(input) {
    var table;
    try {
        table = Arrow_1.Table.from(input);
    }
    catch (e) {
        table = Arrow_1.Table.from(parse(input + ''));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QVcsRUFBRSx3Q0FBd0M7U0FDeEQ7UUFDRDtZQUNJLElBQUksRUFBRSxNQUFNO1lBQ1osSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRztZQUN4QixRQUFRLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxJQUFJO1lBQy9CLFdBQVcsRUFBRSx3QkFBd0I7U0FDeEM7S0FDSixDQUFDO0FBQ04sQ0FBQztBQUVEO0lBQ0ksT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUN0QztZQUNJLE1BQU0sRUFBRSxXQUFXO1lBQ25CLE9BQU8sRUFBRSxnQ0FBZ0M7U0FDNUM7UUFDRDtZQUNJLE1BQU0sRUFBRSxVQUFVO1lBQ2xCLE9BQU8sRUFBRTtnQkFDTCx3RUFBd0U7Z0JBQ3hFLHlGQUF5RjtnQkFDekYsMEZBQTBGO2dCQUMxRiw4QkFBOEI7YUFDakM7U0FDSjtRQUNEO1lBQ0ksTUFBTSxFQUFFLFNBQVM7WUFDakIsVUFBVSxtQkFDSCxPQUFPLEVBQUU7Z0JBQ1o7b0JBQ0ksSUFBSSxFQUFFLE1BQU07b0JBQ1osV0FBVyxFQUFFLHlCQUF5QjtpQkFDekM7Y0FDSjtTQUNKO1FBQ0Q7WUFDSSxNQUFNLEVBQUUsU0FBUztZQUNqQixPQUFPLEVBQUU7Z0JBQ0wsOENBQThDO2dCQUM5QyxjQUFjO2dCQUNkLGNBQWM7Z0JBQ2QsY0FBYztnQkFDZCxjQUFjO2dCQUNkLGNBQWM7Z0JBQ2QsY0FBYzthQUNqQjtTQUNKO0tBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BCLENBQUMiLCJmaWxlIjoiYXJyb3cyY3N2LmpzIiwic291cmNlc0NvbnRlbnQiOlsiIyEgL3Vzci9iaW4vZW52IG5vZGVcblxuLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbi8qIHRzbGludDpkaXNhYmxlICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7IHByb21pc2lmeSB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0IHsgVGFibGUsIHJlYWRTdHJlYW0gfSBmcm9tICcuLi9BcnJvdyc7XG5cbmNvbnN0IHJlYWRGaWxlID0gcHJvbWlzaWZ5KGZzLnJlYWRGaWxlKTtcbmNvbnN0IHsgcGFyc2UgfSA9IHJlcXVpcmUoJ2pzb24tYmlnbnVtJyk7XG5jb25zdCBhcmd2ID0gcmVxdWlyZShgY29tbWFuZC1saW5lLWFyZ3NgKShjbGlPcHRzKCksIHsgcGFydGlhbDogdHJ1ZSB9KTtcbmNvbnN0IGZpbGVzID0gWy4uLihhcmd2LmZpbGUgfHwgW10pLCAuLi4oYXJndi5fdW5rbm93biB8fCBbXSldLmZpbHRlcihCb29sZWFuKTtcblxuKGFzeW5jICgpID0+IHtcbiAgICBsZXQgaGFzUmVjb3JkcyA9IGZhbHNlO1xuICAgIGlmIChmaWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGhhc1JlY29yZHMgPSB0cnVlO1xuICAgICAgICBmb3IgKGxldCBpbnB1dCBvZiBmaWxlcykge1xuICAgICAgICAgICAgcHJpbnRUYWJsZShhd2FpdCByZWFkRmlsZShpbnB1dCkpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IHJvd09mZnNldCA9IDA7XG4gICAgICAgIGxldCBtYXhDb2x1bW5XaWR0aHM6IG51bWJlcltdID0gW107XG4gICAgICAgIGZvciBhd2FpdCAoY29uc3QgcmVjb3JkQmF0Y2ggb2YgcmVhZFN0cmVhbShwcm9jZXNzLnN0ZGluKSkge1xuICAgICAgICAgICAgaGFzUmVjb3JkcyA9IHRydWU7XG4gICAgICAgICAgICByZWNvcmRCYXRjaC5yb3dzVG9TdHJpbmcoJyB8ICcsIHJvd09mZnNldCwgbWF4Q29sdW1uV2lkdGhzKS5waXBlKHByb2Nlc3Muc3Rkb3V0KTtcbiAgICAgICAgICAgIHJvd09mZnNldCArPSByZWNvcmRCYXRjaC5sZW5ndGg7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGhhc1JlY29yZHMgPyBudWxsIDogcHJpbnRfdXNhZ2UoKTtcbn0pKCkuY2F0Y2goKGUpID0+IHsgY29uc29sZS5lcnJvcihlKTsgcHJvY2Vzcy5leGl0KDEpOyB9KTtcblxuZnVuY3Rpb24gcHJpbnRUYWJsZShpbnB1dDogYW55KSB7XG4gICAgbGV0IHRhYmxlOiBUYWJsZTtcbiAgICB0cnkge1xuICAgICAgICB0YWJsZSA9IFRhYmxlLmZyb20oaW5wdXQpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGFibGUgPSBUYWJsZS5mcm9tKHBhcnNlKGlucHV0ICsgJycpKTtcbiAgICB9XG4gICAgaWYgKGFyZ3Yuc2NoZW1hICYmIGFyZ3Yuc2NoZW1hLmxlbmd0aCkge1xuICAgICAgICB0YWJsZSA9IHRhYmxlLnNlbGVjdCguLi5hcmd2LnNjaGVtYSk7XG4gICAgfVxuICAgIHRhYmxlLnJvd3NUb1N0cmluZygpLnBpcGUocHJvY2Vzcy5zdGRvdXQpO1xufVxuXG5mdW5jdGlvbiBjbGlPcHRzKCkge1xuICAgIHJldHVybiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6IFN0cmluZyxcbiAgICAgICAgICAgIG5hbWU6ICdzY2hlbWEnLCBhbGlhczogJ3MnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsIG11bHRpcGxlOiB0cnVlLFxuICAgICAgICAgICAgdHlwZUxhYmVsOiAnW3VuZGVybGluZV17Y29sdW1uc30nLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBIHNwYWNlLWRlbGltaXRlZCBsaXN0IG9mIGNvbHVtbiBuYW1lcydcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogU3RyaW5nLFxuICAgICAgICAgICAgbmFtZTogJ2ZpbGUnLCBhbGlhczogJ2YnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IGZhbHNlLCBtdWx0aXBsZTogdHJ1ZSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIEFycm93IGZpbGUgdG8gcmVhZCdcbiAgICAgICAgfVxuICAgIF07ICAgIFxufVxuXG5mdW5jdGlvbiBwcmludF91c2FnZSgpIHtcbiAgICBjb25zb2xlLmxvZyhyZXF1aXJlKCdjb21tYW5kLWxpbmUtdXNhZ2UnKShbXG4gICAgICAgIHtcbiAgICAgICAgICAgIGhlYWRlcjogJ2Fycm93MmNzdicsXG4gICAgICAgICAgICBjb250ZW50OiAnUHJpbnQgYSBDU1YgZnJvbSBhbiBBcnJvdyBmaWxlJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBoZWFkZXI6ICdTeW5vcHNpcycsXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgICAgJyQgYXJyb3cyY3N2IFt1bmRlcmxpbmVde2ZpbGUuYXJyb3d9IFtbYm9sZF17LS1zY2hlbWF9IGNvbHVtbl9uYW1lIC4uLl0nLFxuICAgICAgICAgICAgICAgICckIGFycm93MmNzdiBbW2JvbGRdey0tc2NoZW1hfSBjb2x1bW5fbmFtZSAuLi5dIFtbYm9sZF17LS1maWxlfSBbdW5kZXJsaW5lXXtmaWxlLmFycm93fV0nLFxuICAgICAgICAgICAgICAgICckIGFycm93MmNzdiBbYm9sZF17LXN9IGNvbHVtbl8xIFtib2xkXXstc30gY29sdW1uXzIgW1tib2xkXXstZn0gW3VuZGVybGluZV17ZmlsZS5hcnJvd31dJyxcbiAgICAgICAgICAgICAgICAnJCBhcnJvdzJjc3YgW1tib2xkXXstLWhlbHB9XSdcbiAgICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgaGVhZGVyOiAnT3B0aW9ucycsXG4gICAgICAgICAgICBvcHRpb25MaXN0OiBbXG4gICAgICAgICAgICAgICAgLi4uY2xpT3B0cygpLFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ2hlbHAnLFxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1ByaW50IHRoaXMgdXNhZ2UgZ3VpZGUuJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgaGVhZGVyOiAnRXhhbXBsZScsXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgICAgJyQgYXJyb3cyY3N2IC0tc2NoZW1hIGZvbyBiYXogLWYgc2ltcGxlLmFycm93JyxcbiAgICAgICAgICAgICAgICAnPiAgZm9vLCAgYmF6JyxcbiAgICAgICAgICAgICAgICAnPiAgICAxLCAgIGFhJyxcbiAgICAgICAgICAgICAgICAnPiBudWxsLCBudWxsJyxcbiAgICAgICAgICAgICAgICAnPiAgICAzLCBudWxsJyxcbiAgICAgICAgICAgICAgICAnPiAgICA0LCAgYmJiJyxcbiAgICAgICAgICAgICAgICAnPiAgICA1LCBjY2NjJyxcbiAgICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgIF0pKTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7XG59Il19

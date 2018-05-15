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
    var hasRecords, files_1, files_1_1, input, _a, e_1_1, rowOffset, maxColumnWidths, _b, _c, recordBatch, e_2_1, e_2, _d, e_1, _e;
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
                _a = printTable;
                return [4 /*yield*/, readFile(input)];
            case 3:
                _a.apply(void 0, [_f.sent()]);
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
                    if (files_1_1 && !files_1_1.done && (_e = files_1.return)) _e.call(files_1);
                }
                finally { if (e_1) throw e_1.error; }
                return [7 /*endfinally*/];
            case 8: return [3 /*break*/, 22];
            case 9:
                rowOffset = 0;
                maxColumnWidths = [];
                _f.label = 10;
            case 10:
                _f.trys.push([10, 16, 17, 22]);
                _b = tslib_1.__asyncValues(Arrow_1.readStream(process.stdin));
                _f.label = 11;
            case 11: return [4 /*yield*/, _b.next()];
            case 12:
                if (!(_c = _f.sent(), !_c.done)) return [3 /*break*/, 15];
                return [4 /*yield*/, _c.value];
            case 13:
                recordBatch = _f.sent();
                hasRecords = true;
                recordBatch.rowsToString(' | ', rowOffset, maxColumnWidths).pipe(process.stdout);
                rowOffset += recordBatch.length;
                _f.label = 14;
            case 14: return [3 /*break*/, 11];
            case 15: return [3 /*break*/, 22];
            case 16:
                e_2_1 = _f.sent();
                e_2 = { error: e_2_1 };
                return [3 /*break*/, 22];
            case 17:
                _f.trys.push([17, , 20, 21]);
                if (!(_c && !_c.done && (_d = _b.return))) return [3 /*break*/, 19];
                return [4 /*yield*/, _d.call(_b)];
            case 18:
                _f.sent();
                _f.label = 19;
            case 19: return [3 /*break*/, 21];
            case 20:
                if (e_2) throw e_2.error;
                return [7 /*endfinally*/];
            case 21: return [7 /*endfinally*/];
            case 22: return [2 /*return*/, hasRecords ? null : print_usage()];
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJO1lBQzlCLFNBQVMsRUFBRSxzQkFBc0I7WUFDakMsV0FBVyxFQUFFLHdDQUF3QztTQUN4RDtRQUNEO1lBQ0ksSUFBSSxFQUFFLE1BQU07WUFDWixJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHO1lBQ3hCLFFBQVEsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLElBQUk7WUFDL0IsV0FBVyxFQUFFLHdCQUF3QjtTQUN4QztLQUNKLENBQUM7QUFDTixDQUFDO0FBRUQ7SUFDSSxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3RDO1lBQ0ksTUFBTSxFQUFFLFdBQVc7WUFDbkIsT0FBTyxFQUFFLGdDQUFnQztTQUM1QztRQUNEO1lBQ0ksTUFBTSxFQUFFLFVBQVU7WUFDbEIsT0FBTyxFQUFFO2dCQUNMLHdFQUF3RTtnQkFDeEUseUZBQXlGO2dCQUN6RiwwRkFBMEY7Z0JBQzFGLDhCQUE4QjthQUNqQztTQUNKO1FBQ0Q7WUFDSSxNQUFNLEVBQUUsU0FBUztZQUNqQixVQUFVLG1CQUNILE9BQU8sRUFBRTtnQkFDWjtvQkFDSSxJQUFJLEVBQUUsTUFBTTtvQkFDWixXQUFXLEVBQUUseUJBQXlCO2lCQUN6QztjQUNKO1NBQ0o7UUFDRDtZQUNJLE1BQU0sRUFBRSxTQUFTO1lBQ2pCLE9BQU8sRUFBRTtnQkFDTCw4Q0FBOEM7Z0JBQzlDLGNBQWM7Z0JBQ2QsY0FBYztnQkFDZCxjQUFjO2dCQUNkLGNBQWM7Z0JBQ2QsY0FBYztnQkFDZCxjQUFjO2FBQ2pCO1NBQ0o7S0FDSixDQUFDLENBQUMsQ0FBQztJQUNKLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEIsQ0FBQyIsImZpbGUiOiJhcnJvdzJjc3YuanMiLCJzb3VyY2VzQ29udGVudCI6WyIjISAvdXNyL2Jpbi9lbnYgbm9kZVxuXG4vLyBMaWNlbnNlZCB0byB0aGUgQXBhY2hlIFNvZnR3YXJlIEZvdW5kYXRpb24gKEFTRikgdW5kZXIgb25lXG4vLyBvciBtb3JlIGNvbnRyaWJ1dG9yIGxpY2Vuc2UgYWdyZWVtZW50cy4gIFNlZSB0aGUgTk9USUNFIGZpbGVcbi8vIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyB3b3JrIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uXG4vLyByZWdhcmRpbmcgY29weXJpZ2h0IG93bmVyc2hpcC4gIFRoZSBBU0YgbGljZW5zZXMgdGhpcyBmaWxlXG4vLyB0byB5b3UgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlXG4vLyBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Vcbi8vIHdpdGggdGhlIExpY2Vuc2UuICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbi8vIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4vLyBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuLy8gS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4vLyBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4vLyB1bmRlciB0aGUgTGljZW5zZS5cblxuLyogdHNsaW50OmRpc2FibGUgKi9cblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHsgcHJvbWlzaWZ5IH0gZnJvbSAndXRpbCc7XG5pbXBvcnQgeyBUYWJsZSwgcmVhZFN0cmVhbSB9IGZyb20gJy4uL0Fycm93JztcblxuY29uc3QgcmVhZEZpbGUgPSBwcm9taXNpZnkoZnMucmVhZEZpbGUpO1xuY29uc3QgeyBwYXJzZSB9ID0gcmVxdWlyZSgnanNvbi1iaWdudW0nKTtcbmNvbnN0IGFyZ3YgPSByZXF1aXJlKGBjb21tYW5kLWxpbmUtYXJnc2ApKGNsaU9wdHMoKSwgeyBwYXJ0aWFsOiB0cnVlIH0pO1xuY29uc3QgZmlsZXMgPSBbLi4uKGFyZ3YuZmlsZSB8fCBbXSksIC4uLihhcmd2Ll91bmtub3duIHx8IFtdKV0uZmlsdGVyKEJvb2xlYW4pO1xuXG4oYXN5bmMgKCkgPT4ge1xuICAgIGxldCBoYXNSZWNvcmRzID0gZmFsc2U7XG4gICAgaWYgKGZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgaGFzUmVjb3JkcyA9IHRydWU7XG4gICAgICAgIGZvciAobGV0IGlucHV0IG9mIGZpbGVzKSB7XG4gICAgICAgICAgICBwcmludFRhYmxlKGF3YWl0IHJlYWRGaWxlKGlucHV0KSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgcm93T2Zmc2V0ID0gMDtcbiAgICAgICAgbGV0IG1heENvbHVtbldpZHRoczogbnVtYmVyW10gPSBbXTtcbiAgICAgICAgZm9yIGF3YWl0IChjb25zdCByZWNvcmRCYXRjaCBvZiByZWFkU3RyZWFtKHByb2Nlc3Muc3RkaW4pKSB7XG4gICAgICAgICAgICBoYXNSZWNvcmRzID0gdHJ1ZTtcbiAgICAgICAgICAgIHJlY29yZEJhdGNoLnJvd3NUb1N0cmluZygnIHwgJywgcm93T2Zmc2V0LCBtYXhDb2x1bW5XaWR0aHMpLnBpcGUocHJvY2Vzcy5zdGRvdXQpO1xuICAgICAgICAgICAgcm93T2Zmc2V0ICs9IHJlY29yZEJhdGNoLmxlbmd0aDtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gaGFzUmVjb3JkcyA/IG51bGwgOiBwcmludF91c2FnZSgpO1xufSkoKS5jYXRjaCgoZSkgPT4geyBjb25zb2xlLmVycm9yKGUpOyBwcm9jZXNzLmV4aXQoMSk7IH0pO1xuXG5mdW5jdGlvbiBwcmludFRhYmxlKGlucHV0OiBhbnkpIHtcbiAgICBsZXQgdGFibGU6IFRhYmxlO1xuICAgIHRyeSB7XG4gICAgICAgIHRhYmxlID0gVGFibGUuZnJvbShpbnB1dCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0YWJsZSA9IFRhYmxlLmZyb20ocGFyc2UoaW5wdXQgKyAnJykpO1xuICAgIH1cbiAgICBpZiAoYXJndi5zY2hlbWEgJiYgYXJndi5zY2hlbWEubGVuZ3RoKSB7XG4gICAgICAgIHRhYmxlID0gdGFibGUuc2VsZWN0KC4uLmFyZ3Yuc2NoZW1hKTtcbiAgICB9XG4gICAgdGFibGUucm93c1RvU3RyaW5nKCkucGlwZShwcm9jZXNzLnN0ZG91dCk7XG59XG5cbmZ1bmN0aW9uIGNsaU9wdHMoKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogU3RyaW5nLFxuICAgICAgICAgICAgbmFtZTogJ3NjaGVtYScsIGFsaWFzOiAncycsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSwgbXVsdGlwbGU6IHRydWUsXG4gICAgICAgICAgICB0eXBlTGFiZWw6ICdbdW5kZXJsaW5lXXtjb2x1bW5zfScsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Egc3BhY2UtZGVsaW1pdGVkIGxpc3Qgb2YgY29sdW1uIG5hbWVzJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiBTdHJpbmcsXG4gICAgICAgICAgICBuYW1lOiAnZmlsZScsIGFsaWFzOiAnZicsXG4gICAgICAgICAgICBvcHRpb25hbDogZmFsc2UsIG11bHRpcGxlOiB0cnVlLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgQXJyb3cgZmlsZSB0byByZWFkJ1xuICAgICAgICB9XG4gICAgXTsgICAgXG59XG5cbmZ1bmN0aW9uIHByaW50X3VzYWdlKCkge1xuICAgIGNvbnNvbGUubG9nKHJlcXVpcmUoJ2NvbW1hbmQtbGluZS11c2FnZScpKFtcbiAgICAgICAge1xuICAgICAgICAgICAgaGVhZGVyOiAnYXJyb3cyY3N2JyxcbiAgICAgICAgICAgIGNvbnRlbnQ6ICdQcmludCBhIENTViBmcm9tIGFuIEFycm93IGZpbGUnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGhlYWRlcjogJ1N5bm9wc2lzJyxcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgICAnJCBhcnJvdzJjc3YgW3VuZGVybGluZV17ZmlsZS5hcnJvd30gW1tib2xkXXstLXNjaGVtYX0gY29sdW1uX25hbWUgLi4uXScsXG4gICAgICAgICAgICAgICAgJyQgYXJyb3cyY3N2IFtbYm9sZF17LS1zY2hlbWF9IGNvbHVtbl9uYW1lIC4uLl0gW1tib2xkXXstLWZpbGV9IFt1bmRlcmxpbmVde2ZpbGUuYXJyb3d9XScsXG4gICAgICAgICAgICAgICAgJyQgYXJyb3cyY3N2IFtib2xkXXstc30gY29sdW1uXzEgW2JvbGRdey1zfSBjb2x1bW5fMiBbW2JvbGRdey1mfSBbdW5kZXJsaW5lXXtmaWxlLmFycm93fV0nLFxuICAgICAgICAgICAgICAgICckIGFycm93MmNzdiBbW2JvbGRdey0taGVscH1dJ1xuICAgICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBoZWFkZXI6ICdPcHRpb25zJyxcbiAgICAgICAgICAgIG9wdGlvbkxpc3Q6IFtcbiAgICAgICAgICAgICAgICAuLi5jbGlPcHRzKCksXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnaGVscCcsXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUHJpbnQgdGhpcyB1c2FnZSBndWlkZS4nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBoZWFkZXI6ICdFeGFtcGxlJyxcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgICAnJCBhcnJvdzJjc3YgLS1zY2hlbWEgZm9vIGJheiAtZiBzaW1wbGUuYXJyb3cnLFxuICAgICAgICAgICAgICAgICc+ICBmb28sICBiYXonLFxuICAgICAgICAgICAgICAgICc+ICAgIDEsICAgYWEnLFxuICAgICAgICAgICAgICAgICc+IG51bGwsIG51bGwnLFxuICAgICAgICAgICAgICAgICc+ICAgIDMsIG51bGwnLFxuICAgICAgICAgICAgICAgICc+ICAgIDQsICBiYmInLFxuICAgICAgICAgICAgICAgICc+ICAgIDUsIGNjY2MnLFxuICAgICAgICAgICAgXVxuICAgICAgICB9XG4gICAgXSkpO1xuICAgIHByb2Nlc3MuZXhpdCgxKTtcbn0iXX0=

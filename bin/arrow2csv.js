#! /usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var fs = require("fs");
var Arrow = require("../Arrow");
var parse = require('json-bignum').parse;
var optionList = [
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
var argv = require("command-line-args")(optionList, { partial: true });
var files = tslib_1.__spread(argv.file, (argv._unknown || [])).filter(Boolean);
if (!files.length) {
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
            optionList: tslib_1.__spread(optionList, [
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
files.forEach(function (source) {
    var table, input = fs.readFileSync(source);
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
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LENBQUMiLCJmaWxlIjoiYXJyb3cyY3N2LmpzIiwic291cmNlc0NvbnRlbnQiOlsiIyEgL3Vzci9iaW4vZW52IG5vZGVcblxuLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbi8qIHRzbGludDpkaXNhYmxlICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIEFycm93IGZyb20gJy4uL0Fycm93JztcblxuY29uc3QgeyBwYXJzZSB9ID0gcmVxdWlyZSgnanNvbi1iaWdudW0nKTtcbmNvbnN0IG9wdGlvbkxpc3QgPSBbXG4gICAge1xuICAgICAgICB0eXBlOiBTdHJpbmcsXG4gICAgICAgIG5hbWU6ICdzY2hlbWEnLCBhbGlhczogJ3MnLFxuICAgICAgICBvcHRpb25hbDogdHJ1ZSwgbXVsdGlwbGU6IHRydWUsXG4gICAgICAgIHR5cGVMYWJlbDogJ1t1bmRlcmxpbmVde2NvbHVtbnN9JyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdBIHNwYWNlLWRlbGltaXRlZCBsaXN0IG9mIGNvbHVtbiBuYW1lcydcbiAgICB9LFxuICAgIHtcbiAgICAgICAgdHlwZTogU3RyaW5nLFxuICAgICAgICBuYW1lOiAnZmlsZScsIGFsaWFzOiAnZicsXG4gICAgICAgIG9wdGlvbmFsOiBmYWxzZSwgbXVsdGlwbGU6IHRydWUsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIEFycm93IGZpbGUgdG8gcmVhZCdcbiAgICB9XG5dO1xuXG5jb25zdCBhcmd2ID0gcmVxdWlyZShgY29tbWFuZC1saW5lLWFyZ3NgKShvcHRpb25MaXN0LCB7IHBhcnRpYWw6IHRydWUgfSk7XG5jb25zdCBmaWxlcyA9IFsuLi5hcmd2LmZpbGUsIC4uLihhcmd2Ll91bmtub3duIHx8IFtdKV0uZmlsdGVyKEJvb2xlYW4pO1xuXG5pZiAoIWZpbGVzLmxlbmd0aCkge1xuICAgIGNvbnNvbGUubG9nKHJlcXVpcmUoJ2NvbW1hbmQtbGluZS11c2FnZScpKFtcbiAgICAgICAge1xuICAgICAgICAgICAgaGVhZGVyOiAnYXJyb3cyY3N2JyxcbiAgICAgICAgICAgIGNvbnRlbnQ6ICdQcmludCBhIENTViBmcm9tIGFuIEFycm93IGZpbGUnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGhlYWRlcjogJ1N5bm9wc2lzJyxcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgICAnJCBhcnJvdzJjc3YgW3VuZGVybGluZV17ZmlsZS5hcnJvd30gW1tib2xkXXstLXNjaGVtYX0gY29sdW1uX25hbWUgLi4uXScsXG4gICAgICAgICAgICAgICAgJyQgYXJyb3cyY3N2IFtbYm9sZF17LS1zY2hlbWF9IGNvbHVtbl9uYW1lIC4uLl0gW1tib2xkXXstLWZpbGV9IFt1bmRlcmxpbmVde2ZpbGUuYXJyb3d9XScsXG4gICAgICAgICAgICAgICAgJyQgYXJyb3cyY3N2IFtib2xkXXstc30gY29sdW1uXzEgW2JvbGRdey1zfSBjb2x1bW5fMiBbW2JvbGRdey1mfSBbdW5kZXJsaW5lXXtmaWxlLmFycm93fV0nLFxuICAgICAgICAgICAgICAgICckIGFycm93MmNzdiBbW2JvbGRdey0taGVscH1dJ1xuICAgICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBoZWFkZXI6ICdPcHRpb25zJyxcbiAgICAgICAgICAgIG9wdGlvbkxpc3Q6IFtcbiAgICAgICAgICAgICAgICAuLi5vcHRpb25MaXN0LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ2hlbHAnLFxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1ByaW50IHRoaXMgdXNhZ2UgZ3VpZGUuJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgaGVhZGVyOiAnRXhhbXBsZScsXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgICAgJyQgYXJyb3cyY3N2IC0tc2NoZW1hIGZvbyBiYXogLWYgc2ltcGxlLmFycm93JyxcbiAgICAgICAgICAgICAgICAnPiAgZm9vLCAgYmF6JyxcbiAgICAgICAgICAgICAgICAnPiAgICAxLCAgIGFhJyxcbiAgICAgICAgICAgICAgICAnPiBudWxsLCBudWxsJyxcbiAgICAgICAgICAgICAgICAnPiAgICAzLCBudWxsJyxcbiAgICAgICAgICAgICAgICAnPiAgICA0LCAgYmJiJyxcbiAgICAgICAgICAgICAgICAnPiAgICA1LCBjY2NjJyxcbiAgICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgIF0pKTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7XG59XG5cbmZpbGVzLmZvckVhY2goKHNvdXJjZSkgPT4ge1xuICAgIGxldCB0YWJsZTogQXJyb3cuVGFibGUsIGlucHV0ID0gZnMucmVhZEZpbGVTeW5jKHNvdXJjZSk7XG4gICAgdHJ5IHtcbiAgICAgICAgdGFibGUgPSBBcnJvdy5UYWJsZS5mcm9tKGlucHV0KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRhYmxlID0gQXJyb3cuVGFibGUuZnJvbShwYXJzZShpbnB1dCArICcnKSk7XG4gICAgfVxuICAgIGlmIChhcmd2LnNjaGVtYSAmJiBhcmd2LnNjaGVtYS5sZW5ndGgpIHtcbiAgICAgICAgdGFibGUgPSB0YWJsZS5zZWxlY3QoLi4uYXJndi5zY2hlbWEpO1xuICAgIH1cbiAgICB0YWJsZS5yb3dzVG9TdHJpbmcoKS5waXBlKHByb2Nlc3Muc3Rkb3V0KTtcbn0pO1xuIl19

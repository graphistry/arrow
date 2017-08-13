import * as fs from 'fs';
import * as path from 'path';
import { Table, readBuffers } from './Arrow';

const arrowFolderNames = ['count', 'latlong', 'origins'];
const arrowTestConfigurations = arrowFolderNames.reduce((configs, folder) => {
    const schemaPath = path.resolve(__dirname, `./arrows/multi/${folder}/schema.arrow`);
    const recordsPath = path.resolve(__dirname, `./arrows/multi/${folder}/records.arrow`);
    return [...configs, [folder, fs.readFileSync(schemaPath), fs.readFileSync(recordsPath)]];
}, []);

for (let [folder, schema, records] of arrowTestConfigurations) {
    describe(`multi ${folder}`, () => {
        test(`enumerates vectors`, () => {
            expect.hasAssertions();
            for (let vectors of readBuffers(schema, records)) {
                for (let vector of vectors) {
                    expect(vector.name).toMatchSnapshot();
                    expect(vector.type).toMatchSnapshot();
                    expect(vector.length).toMatchSnapshot();
                        for (let i = -1, n = vector.length; ++i < n;) {
                        expect(vector.get(i)).toMatchSnapshot();
                    }
                }
            }
        });
        test(`concats vectors into a table`, () => {
            expect.hasAssertions();
            const table = Table.from(schema, records);
            for (const vector of table) {
                expect(vector.name).toMatchSnapshot();
                expect(vector.type).toMatchSnapshot();
                expect(vector.length).toMatchSnapshot();
                for (let i = -1, n = vector.length; ++i < n;) {
                    expect(vector.get(i)).toMatchSnapshot();
                }
            }
        });
    });
}
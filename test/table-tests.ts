import { Table, readBuffers } from './Arrow';
import arrowTestConfigurations from './test-config';

for (let [name, ...buffers] of arrowTestConfigurations) {
    describe(`${name} Table`, () => {
        test(`creates a Table from Arrow buffers`, () => {
            expect.hasAssertions();
            const table = Table.from(...buffers);
            for (const vector of table) {
                expect(vector.name).toMatchSnapshot();
                expect(vector.type).toMatchSnapshot();
                expect(vector.length).toMatchSnapshot();
                for (let i = -1, n = vector.length; ++i < n;) {
                    expect(vector.get(i)).toMatchSnapshot();
                }
            }
        });
        test(`batch and Table Vectors report the same values`, () => {
            expect.hasAssertions();
            let rowsTotal = 0, table = Table.from(...buffers);
            for (let vectors of readBuffers(...buffers)) {
                let rowsNow = Math.max(...vectors.map((v) => v.length));
                for (let vi = -1, vn = vectors.length; ++vi < vn;) {
                    let v1 = vectors[vi];
                    let v2 = table.vector(vi);
                    expect(v1.name).toEqual(v2.name);
                    expect(v1.type).toEqual(v2.type);
                    for (let i = -1, n = v1.length; ++i < n;) {
                        expect(v1.get(i)).toEqual(v2.get(i + rowsTotal));
                    }
                }
                rowsTotal += rowsNow;
            }
        });
    });
}

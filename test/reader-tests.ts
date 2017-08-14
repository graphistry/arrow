import { readBuffers } from './Arrow';
import arrowTestConfigurations from './test-config';

for (let [name, ...buffers] of arrowTestConfigurations) {
    describe(`${name} readBuffers`, () => {
        test(`enumerates each batch as an Array of Vectors`, () => {
            expect.hasAssertions();
            for (let vectors of readBuffers(...buffers)) {
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
    });
}

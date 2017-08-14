import * as fs from 'fs';
import * as path from 'path';
const arrowFormats = ['file', 'stream'];
const arrowFileNames = ['simple', 'struct', 'dictionary'];
const multipartArrows = ['count', 'latlong', 'origins'];
export let arrowTestConfigurations = [];

arrowTestConfigurations = arrowFormats.reduce((configs, format) => {
    return arrowFileNames.reduce((configs, name) => {
        const arrowPath = path.resolve(__dirname, `./arrows/${format}/${name}.arrow`);
        return [...configs, [`${name} ${format} Arrow`, fs.readFileSync(arrowPath)]];
    }, configs);
}, arrowTestConfigurations);

arrowTestConfigurations = multipartArrows.reduce((configs, folder) => {
    const schemaPath = path.resolve(__dirname, `./arrows/multi/${folder}/schema.arrow`);
    const recordsPath = path.resolve(__dirname, `./arrows/multi/${folder}/records.arrow`);
    return [...configs, [`multipart ${folder} Arrow`, fs.readFileSync(schemaPath), fs.readFileSync(recordsPath)]];
}, arrowTestConfigurations);

export default arrowTestConfigurations;

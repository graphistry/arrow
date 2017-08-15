const fs = require('fs');
const path = require('path');
const arrowFormats = ['file', 'stream'];
const arrowFileNames = ['simple', 'struct', 'dictionary'];
const multipartArrows = ['edges', 'count', 'latlong', 'origins'];
let arrowTestConfigurations = [];

arrowTestConfigurations = multipartArrows.reduce((configs, folder) => {
    const schemaPath = path.resolve(__dirname, `./arrows/multi/${folder}/schema.arrow`);
    const recordsPath = path.resolve(__dirname, `./arrows/multi/${folder}/records.arrow`);
    return [...configs, [`multipart ${folder}`, fs.readFileSync(schemaPath), fs.readFileSync(recordsPath)]];
}, arrowTestConfigurations);

arrowTestConfigurations = arrowFormats.reduce((configs, format) => {
    return arrowFileNames.reduce((configs, name) => {
        const arrowPath = path.resolve(__dirname, `./arrows/${format}/${name}.arrow`);
        return [...configs, [`${name} ${format}`, fs.readFileSync(arrowPath)]];
    }, configs);
}, arrowTestConfigurations);

module.exports = arrowTestConfigurations;

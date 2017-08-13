import { Table } from './table';
import { readBuffers } from './reader/arrow';
export { Table, readBuffers };

/* These exports are needed for the closure umd targets */
try {
    const Arrow = eval('exports');
    if (typeof Arrow === 'object') {
        // string indexers tell closure compiler not to rename these properties
        Arrow['Table'] = Table;
        Arrow['readBuffers'] = readBuffers;
    }
} catch (e) { /* not the UMD bundle */ }
/** end closure exports */

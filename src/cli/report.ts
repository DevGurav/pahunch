/**
 * Builds the static report from the newest result for each portal.
 *
 *   npm run report [-- --results results --out site]
 */
import { parseArgs } from 'node:util';
import { EXCLUDED } from '../portals/index.ts';
import { buildSite } from '../report/build.ts';
import { loadLatestResults } from '../report/load.ts';

const { values } = parseArgs({
  options: {
    results: { type: 'string', default: 'results' },
    out: { type: 'string', default: 'site' },
  },
});

const results = await loadLatestResults(values.results);
const written = await buildSite(results, EXCLUDED, values.out);
console.log(`built ${written.length} files for ${results.length} portal result(s) into ${values.out}/`);

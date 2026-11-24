/**
 * Audits portals and writes results/<date>/<portal>/. Run from a machine on an Indian network.
 *
 *   npm run audit -- --portal passport [--portal udid ...] [--headed] [--out results]
 *   npm run audit -- --all
 */
import { parseArgs } from 'node:util';
import { join } from 'node:path';
import { auditDate, auditPortal, writeResult } from '../audit.ts';
import { openSession } from '../browser/session.ts';
import { findPortal, PORTALS } from '../portals/index.ts';
import { VERDICT_LABEL } from '../verdict.ts';

const { values } = parseArgs({
  options: {
    portal: { type: 'string', multiple: true },
    all: { type: 'boolean', default: false },
    headed: { type: 'boolean', default: false },
    out: { type: 'string', default: 'results' },
  },
});

const ids = values.all ? PORTALS.map((p) => p.id) : (values.portal ?? []);
if (ids.length === 0) {
  console.error('usage: npm run audit -- --portal <id> [--portal <id> ...] | --all  [--headed] [--out <dir>]');
  console.error(`portals: ${PORTALS.map((p) => p.id).join(', ')}`);
  process.exit(1);
}
const unknown = ids.filter((id) => !findPortal(id));
if (unknown.length > 0) {
  console.error(`unknown portal id(s): ${unknown.join(', ')}\nportals: ${PORTALS.map((p) => p.id).join(', ')}`);
  process.exit(1);
}

const dir = join(values.out, auditDate());
console.log(`writing to ${dir}`);

for (const id of ids) {
  const portal = findPortal(id)!;
  const started = Date.now();
  // A fresh browser per portal: no cookies or state carry over between portals.
  const session = await openSession({ headed: values.headed });
  try {
    const files = await auditPortal(portal, session);
    await writeResult(dir, files);
    const r = files.result;
    const seconds = Math.round((Date.now() - started) / 1000);
    console.log(`${id.padEnd(12)} ${VERDICT_LABEL[r.verdict]}: ${r.counts.blocker} blocker, ${r.counts.barrier} barrier, ${r.counts.info} info (${seconds}s)`);
    for (const reason of r.inconclusiveReasons) console.log(`${' '.repeat(13)}${reason}`);
  } catch (error) {
    console.log(`${id.padEnd(12)} crashed: ${String(error).split('\n')[0]}`);
    process.exitCode = 1;
  } finally {
    await session.close();
  }
}

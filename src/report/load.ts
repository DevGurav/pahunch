import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PortalResult } from '../audit.ts';

export interface LoadedResult {
  date: string;
  folder: string;
  result: PortalResult;
  transcript: string;
}

/** The newest result for each portal under `resultsDir/<YYYY-MM-DD>/<portal>/`. */
export async function loadLatestResults(resultsDir: string): Promise<LoadedResult[]> {
  const dates = (await readdir(resultsDir, { withFileTypes: true }).catch(() => []))
    .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(d.name))
    .map((d) => d.name)
    .sort()
    .reverse();

  const latest = new Map<string, LoadedResult>();
  for (const date of dates) {
    for (const entry of await readdir(join(resultsDir, date), { withFileTypes: true })) {
      if (!entry.isDirectory() || latest.has(entry.name)) continue;
      const folder = join(resultsDir, date, entry.name);
      const raw = await readFile(join(folder, 'result.json'), 'utf8').catch(() => undefined);
      if (!raw) continue;
      const transcript = await readFile(join(folder, 'transcript.txt'), 'utf8').catch(() => '');
      latest.set(entry.name, { date, folder, result: JSON.parse(raw) as PortalResult, transcript });
    }
  }
  return [...latest.values()];
}

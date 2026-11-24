import { after, before } from 'node:test';
import { openSession, type Session } from '../../src/browser/session.ts';
import { markCritical, type ResolvedControl } from '../../src/checks/critical.ts';
import type { CriticalControl } from '../../src/portals/types.ts';
import { startFixtureServer, type FixtureServer } from './server.ts';

export interface Harness {
  session: Session;
  server: FixtureServer;
  /** Loads a fixture page and tags its critical controls, as the audit does. */
  load(fixture: string, critical?: CriticalControl[]): Promise<ResolvedControl[]>;
}

/** One browser and one fixture server per test file, torn down after the file's tests. */
export function useHarness(): Harness {
  const harness = {} as Harness;
  before(async () => {
    harness.server = await startFixtureServer();
    harness.session = await openSession({ minIntervalMs: 0 });
    harness.load = async (fixture, critical = []) => {
      await harness.session.page.goto(`${harness.server.baseUrl}/${fixture}`);
      return markCritical(harness.session.page, critical);
    };
  });
  after(async () => {
    await harness.session?.close();
    await harness.server?.close();
  });
  return harness;
}

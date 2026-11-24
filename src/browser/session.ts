import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import pkg from '../../package.json' with { type: 'json' };
import { matchRobots } from './robots.ts';

export const TOOL_NAME = 'pahunch';
export const TOOL_VERSION: string = pkg.version;
export const TOOL_URL = 'https://github.com/DevGurav/pahunch';

/**
 * tsx compiles with esbuild, which can wrap named functions in `__name(fn, "name")`. Functions we
 * send to `page.evaluate` carry those calls into the page, where the helper doesn't exist.
 * This pass-through runs in every frame before any page script.
 */
export const NAME_SHIM = 'globalThis.__name = globalThis.__name || ((fn) => fn);';

export interface SessionOptions {
  headed?: boolean;
  /** Minimum gap between loads. Default 5000 ms (docs/decisions/0005-scanning-rules.md). */
  minIntervalMs?: number;
  navigationTimeoutMs?: number;
}

export interface Session {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  userAgent: string;
  browserVersion: string;
  /** Resolves once at least `minIntervalMs` has passed since the previous call. */
  pace(): Promise<void>;
  close(): Promise<void>;
}

export async function openSession(options: SessionOptions = {}): Promise<Session> {
  const browser = await chromium.launch({ headless: !options.headed });

  const probe = await browser.newContext();
  const baseUserAgent = await (await probe.newPage()).evaluate(() => navigator.userAgent);
  await probe.close();
  const userAgent = `${baseUserAgent} ${TOOL_NAME}/${TOOL_VERSION} (+${TOOL_URL})`;

  const context = await browser.newContext({
    userAgent,
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    viewport: { width: 1366, height: 768 },
  });
  await context.addInitScript({ content: NAME_SHIM });
  context.setDefaultNavigationTimeout(options.navigationTimeoutMs ?? 60_000);
  context.setDefaultTimeout(30_000);
  const page = await context.newPage();

  const minIntervalMs = options.minIntervalMs ?? 5_000;
  let lastLoadAt = 0;

  return {
    browser,
    context,
    page,
    userAgent,
    browserVersion: browser.version(),
    async pace() {
      const wait = lastLoadAt + minIntervalMs - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      lastLoadAt = Date.now();
    },
    async close() {
      await browser.close();
    },
  };
}

/** Waits for the network to settle, but never longer than `capMs`; slow trackers shouldn't stall an audit. */
export async function settle(page: Page, capMs = 10_000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: capMs }).catch(() => undefined);
}

export interface RobotsRecord {
  robotsUrl: string;
  status: number | null;
  error?: string;
  disallowed: boolean;
  rule?: string;
}

/** Fetches robots.txt and records whether `taskUrl` is disallowed for us. Never throws. */
export async function recordRobots(context: BrowserContext, taskUrl: string): Promise<RobotsRecord> {
  const url = new URL(taskUrl);
  const robotsUrl = `${url.origin}/robots.txt`;
  try {
    const response = await context.request.get(robotsUrl, { timeout: 20_000, maxRedirects: 3 });
    const status = response.status();
    if (status !== 200) return { robotsUrl, status, disallowed: false };
    const match = matchRobots(await response.text(), url.pathname + url.search, TOOL_NAME);
    return { robotsUrl, status, ...match };
  } catch (error) {
    return { robotsUrl, status: null, error: String(error).slice(0, 200), disallowed: false };
  }
}

import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURES = fileURLToPath(new URL('../fixtures/', import.meta.url));
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
};

export interface FixtureServer {
  baseUrl: string;
  /** Serves `body` at `path` (e.g. "/generated/scan.pdf"), for files generated at test time. */
  add(path: string, body: Uint8Array | string, contentType: string): void;
  close(): Promise<void>;
}

/** Static server for test/fixtures on a random localhost port. Nothing leaves the machine. */
export async function startFixtureServer(): Promise<FixtureServer> {
  const extra = new Map<string, { body: Uint8Array | string; contentType: string }>();
  const server: Server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    const generated = extra.get(path);
    if (generated) {
      res.writeHead(200, { 'content-type': generated.contentType });
      res.end(generated.body);
      return;
    }
    const file = normalize(join(FIXTURES, path));
    if (!file.startsWith(normalize(FIXTURES))) {
      res.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('fixture server has no port');
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    add(path, body, contentType) {
      extra.set(path, { body, contentType });
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

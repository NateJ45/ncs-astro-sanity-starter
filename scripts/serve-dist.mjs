// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// serve-dist.mjs - serve dist/client the way Cloudflare does: compressed
// =============================================================================
// Ported from stonesteps-50k 2026-09-18 (PORTS.md card 49).
//
// THE SITE IS MEASURED HOW IT IS DELIVERED, OR THE MEASUREMENT LIES.
//
// Lighthouse CI collected against lhci's own static server, which sends every
// byte uncompressed. On 2026-09-17 stonesteps-50k inlined its stylesheet into
// every page; a compressed harness measured the home page going from
// performance 88 to 99 and LCP 2.47s to 1.56s, while CI's Largest Contentful
// Paint did not move at all: 4.2 to 4.9 seconds before and after, flapping
// across a 4.5 second gate on identical markup. That home page was 435KB raw
// and 84KB gzipped, and at Lighthouse's mobile throttle (1.6Mbps) the raw file
// alone is two seconds of download before any CSS can run. Production is
// Cloudflare, which compresses everything. CI was penalising the exact
// optimisation that helped every real reader.
//
// So this is a dependency-free static server for dist/client that negotiates
// brotli or gzip from Accept-Encoding, sets the same immutable caching the
// deploy sets on /_astro/*, and resolves clean URLs to index.html the way the
// Worker does. lighthouserc.json starts it; `npm run serve:dist` runs it for a
// local look.
//
// One caution when a site adds a screenshot or capture harness of its own:
// keep that harness on its own uncompressed server. A tool that must never be
// handed a stale compressed body has no business sharing this cache.
//
//   node scripts/serve-dist.mjs [--port 4173] [--dir dist/client]
// =============================================================================

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve, sep } from 'node:path';
import { brotliCompress, gzip, constants } from 'node:zlib';
import { promisify } from 'node:util';

const brotli = promisify(brotliCompress);
const gz = promisify(gzip);

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const PORT = Number(flag('port', process.env.PORT ?? 4173));
const ROOT = resolve(flag('dir', 'dist/client'));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.webmanifest': 'application/manifest+json',
};

// Already-compressed formats gain nothing from a second pass and cost CPU.
const COMPRESSIBLE = new Set([
  '.html',
  '.js',
  '.mjs',
  '.css',
  '.json',
  '.xml',
  '.txt',
  '.svg',
  '.webmanifest',
]);

// Compress each file once. The build is immutable for the life of the server,
// so a cache keyed on path can never go stale, and it means Lighthouse's three
// runs are not timing zlib on the second and third.
const cache = new Map();

async function load(path) {
  const hit = cache.get(path);
  if (hit) return hit;
  const raw = await readFile(path);
  const ext = extname(path);
  const entry = { raw, ext };
  if (COMPRESSIBLE.has(ext)) {
    entry.br = await brotli(raw, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 5 },
    });
    entry.gz = await gz(raw, { level: 6 });
  }
  cache.set(path, entry);
  return entry;
}

/** Map a request path to a file on disk, or null if it escapes the root. */
async function locate(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  let file = resolve(ROOT, `.${p}`);
  if (!file.startsWith(ROOT + sep) && file !== ROOT) return null;
  try {
    const s = await stat(file);
    if (s.isDirectory()) {
      // /course -> /course/index.html, as the Worker's asset routing does.
      file = join(file, 'index.html');
      await stat(file);
    }
    return file;
  } catch {
    // Clean URL without a trailing slash: /course -> /course/index.html
    try {
      const alt = join(file, 'index.html');
      await stat(alt);
      return alt;
    } catch {
      return null;
    }
  }
}

const server = createServer(async (req, res) => {
  try {
    const file = await locate(req.url ?? '/');
    if (!file) {
      const nf = await locate('/404.html');
      const body = nf ? await readFile(nf) : Buffer.from('Not found');
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(body);
      return;
    }
    const entry = await load(file);
    const accept = String(req.headers['accept-encoding'] ?? '');
    const headers = {
      'Content-Type': TYPES[entry.ext] ?? 'application/octet-stream',
      // Hashed assets are immutable, exactly as the deploy's _headers says;
      // everything else revalidates, which is also what production does.
      'Cache-Control': file.includes(`${sep}_astro${sep}`)
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=0, must-revalidate',
      Vary: 'Accept-Encoding',
    };
    let body = entry.raw;
    if (entry.br && /\bbr\b/.test(accept)) {
      body = entry.br;
      headers['Content-Encoding'] = 'br';
    } else if (entry.gz && /\bgzip\b/.test(accept)) {
      body = entry.gz;
      headers['Content-Encoding'] = 'gzip';
    }
    headers['Content-Length'] = body.length;
    res.writeHead(200, headers);
    res.end(body);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(String(err));
  }
});

server.listen(PORT, () => {
  // lighthouserc.json waits for this exact line before it starts collecting.
  console.log(`serve-dist: ${ROOT} on http://localhost:${PORT} (br/gzip)`);
});

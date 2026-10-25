// Cloudflare rejects a _headers line over 2,000 characters (PORTS.md card 159, gotcha
// cloudflare-headers-line-limit-breaks-hashed-csp). Two checks: the config keeps small
// scripts out of the pages (so the hash list stays short), and, when a build exists, no line
// of the built dist/client/_headers is over the limit.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const LIMIT = 2000;

describe('_headers line limit', () => {
  it('astro.config.mjs sets vite.build.assetsInlineLimit to 0', () => {
    const cfg = fs.readFileSync('astro.config.mjs', 'utf8');
    assert.match(cfg, /assetsInlineLimit:\s*0\b/);
  });

  it('the source public/_headers has no line over the limit', () => {
    for (const line of fs.readFileSync('public/_headers', 'utf8').split(/\r?\n/)) {
      assert.ok(line.length <= LIMIT, `public/_headers line is ${line.length} characters`);
    }
  });

  const built = 'dist/client/_headers';
  it('the built dist/client/_headers has no line over the limit', (t) => {
    if (!fs.existsSync(built)) return t.skip('no build yet (run npm run build first)');
    for (const line of fs.readFileSync(built, 'utf8').split(/\r?\n/)) {
      assert.ok(
        line.length <= LIMIT,
        `built _headers line is ${line.length} characters (limit ${LIMIT}): ${line.slice(0, 60)}`,
      );
    }
  });
});

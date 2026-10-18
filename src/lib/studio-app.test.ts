// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The Studio as a phone app (PORTS.md card 124):
//   1. The manifest has what a phone needs to install it, scoped to /studio/.
//   2. Its icons exist in public/ at the sizes it says.
//   3. The service worker NEVER keeps a Sanity answer, a login or an /api/ reply.
//   4. Only the Studio's boot page links the manifest and registers the worker.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  STUDIO_ICONS,
  STUDIO_MANIFEST_PATH,
  STUDIO_SCOPE,
  STUDIO_SW_PATH,
  studioManifest,
  studioStartUrl,
} from './studio-app.ts';

const root = join(import.meta.dirname, '..', '..');
const HEX = /^#[0-9a-f]{6}$/i;

describe('the Studio manifest', () => {
  const m = studioManifest({
    name: 'First Church of Somewhere',
    shortName: 'First Church',
    themeColor: '#0b2545',
    backgroundColor: '#faf8f3',
    start: 'quick-update',
  });

  it('has every field an install prompt needs', () => {
    assert.equal(m.name, 'First Church of Somewhere');
    assert.equal(m.short_name, 'First Church');
    assert.equal(m.display, 'standalone');
    assert.equal(m.scope, STUDIO_SCOPE);
    assert.equal(m.id, STUDIO_SCOPE);
    assert.match(m.theme_color, HEX);
    assert.match(m.background_color, HEX);
    assert.ok(m.description.length > 0);
  });

  it('opens inside its own scope, on Home or Quick update', () => {
    assert.ok(m.start_url.startsWith(m.scope), m.start_url);
    assert.equal(m.start_url, '/studio/#/quick-update');
    assert.equal(studioStartUrl(), '/studio/');
    assert.equal(studioStartUrl('home'), '/studio/');
  });

  it('a missing short name falls back to the name', () => {
    const plain = studioManifest({
      name: 'Grace',
      themeColor: '#000000',
      backgroundColor: '#ffffff',
    });
    assert.equal(plain.short_name, 'Grace');
    assert.equal(plain.start_url, '/studio/');
  });

  it('lists 192 and 512 icons and a maskable one', () => {
    const sizes = m.icons.filter((i) => i.purpose === 'any').map((i) => i.sizes);
    assert.deepEqual(sizes.sort(), ['192x192', '512x512']);
    assert.ok(m.icons.some((i) => i.purpose === 'maskable' && i.sizes === '512x512'));
  });
});

/** Width and height out of a PNG's IHDR chunk. */
function pngSize(path: string): { w: number; h: number } {
  const b = readFileSync(path);
  assert.equal(b.subarray(1, 4).toString('ascii'), 'PNG', `${path} is not a PNG`);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

describe('the icon files', () => {
  for (const icon of STUDIO_ICONS) {
    it(`${icon.src} exists at ${icon.sizes}`, () => {
      const file = join(root, 'public', icon.src);
      assert.ok(statSync(file).size > 0, `${icon.src} is missing; run npm run favicon`);
      const { w, h } = pngSize(file);
      assert.equal(`${w}x${h}`, icon.sizes);
    });
  }
});

describe('the service worker', () => {
  const source = readFileSync(join(root, 'public', STUDIO_SW_PATH), 'utf8');
  // Run it in a sandbox with no `caches`: it defines cacheRule and registers nothing.
  const sandbox: Record<string, unknown> = { URL };
  runInNewContext(source, sandbox);
  const rule = sandbox.cacheRule as (
    url: string,
    method: string,
    hasAuth: boolean,
    origin: string,
  ) => string;
  const own = 'https://church.example';
  const get = (url: string, auth = false) => rule(url, 'GET', auth, own);

  it('never keeps anything from Sanity or any other address', () => {
    for (const url of [
      'https://abc123.api.sanity.io/v2025-02-19/data/query/production?query=*',
      'https://abc123.apicdn.sanity.io/v2025-02-19/data/query/production',
      'https://api.sanity.io/v1/auth/providers',
      'https://cdn.sanity.io/images/abc123/production/x.jpg',
      'https://design-system-static.sanity.io/inter.woff2',
      'https://other.example/_astro/x.js',
    ]) {
      assert.equal(get(url), 'none', url);
    }
  });

  it("never keeps the site's own API, previews, logins or any write", () => {
    assert.equal(get(`${own}/api/studio/deploy-status/`), 'none');
    assert.equal(get(`${own}/api/studio/earlier-versions/?backups=1`), 'none');
    assert.equal(get(`${own}/api/draft-mode/enable`), 'none');
    assert.equal(get(`${own}/preview/about/`), 'none');
    assert.equal(rule(`${own}/_astro/x.js`, 'POST', false, own), 'none');
    assert.equal(get(`${own}/_astro/x.js`, true), 'none', 'a request carrying a token');
    assert.equal(get(`${own}/about/`), 'none', 'the public site is not the Studio');
  });

  it('keeps only the boot page, code files, icons and the offline page', () => {
    assert.equal(get(`${own}/studio/`), 'shell');
    assert.equal(get(`${own}/studio/offline/`), 'static');
    assert.equal(get(`${own}/_astro/studio.Ab12Cd.js`), 'asset');
    assert.equal(get(`${own}/favicon.svg`), 'static');
    assert.equal(get(`${own}/icon-maskable-512.png`), 'static');
    assert.equal(get(`${own}/studio/manifest.webmanifest`), 'static');
  });

  it('the boot page is fetched fresh, and the offline page is kept at install', () => {
    assert.match(source, /if \(rule === 'shell'\)[\s\S]*?fetch\(req\)\.catch/);
    assert.match(source, /var OFFLINE_URL = '\/studio\/offline\/'/);
    assert.match(source, /PRECACHE = \[OFFLINE_URL/);
  });
});

/** Every .astro, .ts and .tsx file under src/, as [path, text]. */
function sources(dir: string, out: Array<[string, string]> = []): Array<[string, string]> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sources(p, out);
    else if (/\.(astro|tsx?)$/.test(name) && !name.endsWith('.test.ts')) {
      out.push([p, readFileSync(p, 'utf8')]);
    }
  }
  return out;
}

describe('only the Studio page installs and registers the worker', () => {
  const boot = readFileSync(join(root, 'src/pages/studio/index.astro'), 'utf8');

  it('the boot page links the Studio manifest and registers /studio/sw.js on /studio/', () => {
    assert.match(boot, /rel="manifest" href=\{STUDIO_MANIFEST_PATH\}/);
    assert.match(boot, /serviceWorker\.register/);
    assert.equal(STUDIO_MANIFEST_PATH, '/studio/manifest.webmanifest');
    assert.equal(STUDIO_SW_PATH, '/studio/sw.js');
  });

  it('no other page registers a service worker', () => {
    for (const [path, text] of sources(join(root, 'src'))) {
      if (path.endsWith(join('pages', 'studio', 'index.astro'))) continue;
      assert.ok(!/serviceWorker\.register/.test(text), `${path} registers a service worker`);
    }
  });
});

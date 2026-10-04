// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// A spec imports `test` and `expect` from here instead of '@playwright/test'
// (PORTS.md card 75; built on fbcm, 2026-09-26). The one addition: Sanity's
// images come from a disk cache, not from Sanity.
//
// WHY. fbcm's Sanity request log for 2026-09-19..26 counted 13.1 GB of image
// bandwidth in 533k requests from browsers: Playwright runs, locally and on
// CI, each loading every page's photographs from cdn.sanity.io again. An
// image URL there names its asset and its size, so it never changes: the
// first run on a machine fetches each one once and keeps it in
// node_modules/.cache/test-images/, and every later run is served from disk.
// A site whose CI should share the cache restores that folder with an
// actions/cache step in its own ci.yml (see the card). The pages under test
// are unchanged; only where the bytes come from differs.
//
// NO CACHE, NO SANITY: harmless. With an empty folder every image is fetched
// once, exactly as before, and kept. A build with no Sanity project (the
// starter on CI) requests nothing from cdn.sanity.io, so the route never fires.
//
// A spec that opens its own context (browser.newContext) calls
// cacheSanityImages(ctx) itself.
import { test as base, type BrowserContext, type Route } from '@playwright/test';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

export * from '@playwright/test';

const DIR = resolve(process.cwd(), 'node_modules/.cache/test-images');
mkdirSync(DIR, { recursive: true });

async function fromCache(route: Route): Promise<void> {
  const url = route.request().url();
  // `auto=format` is content-negotiated: Sanity answers AVIF to a browser
  // that accepts it (Chromium) and WebP to one that does not (Playwright's
  // WebKit). Keyed on the URL alone, WebKit was handed Chromium's AVIF and got
  // a broken image (found 2026-09-27: the hero slideshow's later frames never
  // loaded on webkit-iphone). A browser without AVIF gets its own key; the
  // AVIF key is the URL alone, as before, so no existing entry is refetched.
  const accept = route.request().headers()['accept'] ?? '';
  const variant =
    url.includes('auto=format') && accept && !accept.includes('image/avif') ? '|no-avif' : '';
  const key = createHash('sha1')
    .update(url + variant)
    .digest('hex');
  const body = join(DIR, `${key}.bin`);
  const meta = join(DIR, `${key}.json`);
  if (existsSync(body) && existsSync(meta)) {
    const { status, contentType } = JSON.parse(readFileSync(meta, 'utf8')) as {
      status: number;
      contentType: string;
    };
    await route.fulfill({
      status,
      contentType,
      body: readFileSync(body),
      headers: { 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=31536000' },
    });
    return;
  }
  // First sight of this image on this machine: fetch it once and keep it.
  // Only a successful answer is kept, so a blip is retried next time.
  const res = await route.fetch();
  // One line per real fetch, so a run can prove how many images it asked
  // Sanity for (a warm run should add none).
  appendFileSync(join(DIR, 'misses.log'), url + '\n');
  const buf = await res.body();
  if (res.ok()) {
    // Written to temporary names and renamed, so parallel workers never read
    // half a file.
    const tmp = `${key}.${process.pid}.${Date.now()}`;
    writeFileSync(join(DIR, `${tmp}.bin`), buf);
    writeFileSync(
      join(DIR, `${tmp}.json`),
      JSON.stringify({ status: res.status(), contentType: res.headers()['content-type'] ?? '' }),
    );
    renameSync(join(DIR, `${tmp}.bin`), body);
    renameSync(join(DIR, `${tmp}.json`), meta);
  }
  await route.fulfill({ response: res, body: buf });
}

/**
 * The route handler. It must never fail a test on its own account: a test can
 * end while one of its images is still being fetched ("route.fetch: Test
 * ended", "Response has been disposed", seen on the first cold run), so any
 * error falls back to letting the request through, and an error there (the
 * page is already gone) is ignored.
 */
async function serve(route: Route): Promise<void> {
  try {
    await fromCache(route);
  } catch {
    try {
      await route.continue();
    } catch {
      // The page closed; nothing is waiting for this image.
    }
  }
}

/** Serve cdn.sanity.io images in `context` from the disk cache. */
export async function cacheSanityImages(context: BrowserContext): Promise<void> {
  await context.route('https://cdn.sanity.io/images/**', serve);
}

export const test = base.extend({
  context: async ({ context }, use) => {
    await cacheSanityImages(context);
    await use(context);
  },
});

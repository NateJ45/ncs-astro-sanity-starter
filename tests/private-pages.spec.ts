// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from './fixtures';

// =============================================================================
// Hidden and private pages (PORTS.md card 122)
// =============================================================================
// PART 1 runs in the normal suite, against the static build (dist/client):
//   - every noindex page is out of the sitemap and out of site search
//     (data-pagefind-ignore on <main>); that covers a page hidden with "Hide
//     this page from Google and the menus" whenever the dataset has one, and
//     the 404 and styleguide pages always;
//   - no private page is in the public assets, and robots.txt disallows them.
//
// PART 2 needs the Worker (the password route is server-rendered), so it runs
// only when PRIVATE_PAGES_BASE_URL points at `npm run preview` started with
// PRIVATE_PAGE_TEST_FIXTURE=1 and a PRIVATE_PAGE_SECRET in .dev.vars:
//
//   PRIVATE_PAGES_BASE_URL=http://localhost:8787 npx playwright test private-pages
//
// It proves the page HTML is not served without the cookie, is served after
// the right password, and that a wrong password is refused and rate limited.
// =============================================================================

const DIST = join(process.cwd(), 'dist', 'client');

function htmlFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === '_astro' || name === 'studio') continue;
      htmlFiles(p, out);
    } else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

test.describe('Hidden pages: noindex means out of the sitemap and site search', () => {
  test('every noindex page is absent from the sitemap and ignored by search', async ({
    request,
  }) => {
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    const noindex = htmlFiles(DIST).filter((f) =>
      /<meta name="robots" content="noindex/.test(readFileSync(f, 'utf8')),
    );
    expect(noindex.length, 'the 404 page at least is noindex').toBeGreaterThan(0);
    for (const file of noindex) {
      const html = readFileSync(file, 'utf8');
      const rel = file
        .slice(DIST.length)
        .replace(/\\/g, '/')
        .replace(/index\.html$/, '')
        .replace(/\.html$/, '/');
      expect(sitemap, `${rel} is noindex but in the sitemap`).not.toMatch(
        new RegExp(`/${rel.replace(/^\//, '')}</loc>`),
      );
      expect(html, `${rel} is noindex but site search would index it`).toMatch(
        /<main[^>]*data-pagefind-ignore="all"/,
      );
    }
  });
});

test.describe('Private pages: nothing in the public assets', () => {
  test('no /private/ files are built, and robots.txt disallows them', async ({ request }) => {
    expect(existsSync(join(DIST, 'private')), 'dist/client/private must not exist').toBe(false);
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Disallow: /private/');
    const resp = await request.get('/private/test-private-page/');
    expect(resp.status()).not.toBe(200);
    expect(await resp.text()).not.toContain('Private fixture content');
  });
});

// ---------------------------------------------------------------------------
// PART 2: the password route, against the Worker
// ---------------------------------------------------------------------------
const WORKER = process.env.PRIVATE_PAGES_BASE_URL;
const SLUG = 'test-private-page';
const PASSWORD = 'correct horse battery';
const CONTENT = 'Private fixture content';

test.describe('Private pages: the password gate (Worker)', () => {
  test.skip(!WORKER, 'set PRIVATE_PAGES_BASE_URL to a running `npm run preview`');
  test.describe.configure({ mode: 'serial' });

  const url = (slug = SLUG) => `${WORKER}/private/${slug}/`;

  test('without the cookie: the form, never the page, noindex and no-store', async ({
    playwright,
  }) => {
    const api = await playwright.request.newContext();
    const resp = await api.get(url());
    expect(resp.status()).toBe(200);
    const html = await resp.text();
    expect(html).toContain('Password needed');
    expect(html).not.toContain(CONTENT);
    expect(resp.headers()['cache-control']).toContain('no-store');
    expect(resp.headers()['x-robots-tag']).toContain('noindex');
    expect(html).toContain('<meta name="robots" content="noindex');
    await api.dispose();
  });

  test('a wrong password is refused', async ({ playwright }) => {
    const api = await playwright.request.newContext();
    const resp = await api.post(url(), {
      form: { password: 'not the password' },
      maxRedirects: 0,
    });
    expect(resp.status()).toBe(401);
    const html = await resp.text();
    expect(html).toContain('That password is not right');
    expect(html).not.toContain(CONTENT);
    expect(resp.headers()['set-cookie'] ?? '').toBe('');
    await api.dispose();
  });

  test('the right password sets a signed cookie and shows the page', async ({ playwright }) => {
    const api = await playwright.request.newContext();
    const post = await api.post(url(), { form: { password: PASSWORD }, maxRedirects: 0 });
    expect(post.status()).toBe(303);
    const cookie = post.headers()['set-cookie'] ?? '';
    expect(cookie).toMatch(/ncs_private_test_private_page=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Path=\/private\/test-private-page\//);
    const page = await api.get(url());
    expect(page.status()).toBe(200);
    const html = await page.text();
    expect(html).toContain(CONTENT);
    expect(page.headers()['cache-control']).toContain('no-store');
    await api.dispose();
  });

  test('a forged cookie does not open the page', async ({ playwright }) => {
    const api = await playwright.request.newContext({
      extraHTTPHeaders: { cookie: 'ncs_private_test_private_page=eyJzIjoieCJ9.AAAA' },
    });
    const html = await (await api.get(url())).text();
    expect(html).not.toContain(CONTENT);
    await api.dispose();
  });

  test('a form posted from another site is refused', async ({ playwright }) => {
    const api = await playwright.request.newContext();
    const resp = await api.post(url(), {
      form: { password: PASSWORD },
      headers: { origin: 'https://evil.example' },
      maxRedirects: 0,
    });
    expect(resp.status()).toBe(403);
    await api.dispose();
  });

  test('too many wrong guesses are slowed down', async ({ playwright }) => {
    const api = await playwright.request.newContext();
    // A page that does not exist counts guesses the same way.
    // 127.0.0.1, not localhost: the limiter counts per connecting address,
    // and localhost can alternate between ::1 and 127.0.0.1.
    const target = url('no-such-private-page').replace('//localhost', '//127.0.0.1');
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      // wrangler dev's proxy now and then drops a connection; that is not the
      // limiter's doing, so a dropped request is skipped, not failed.
      try {
        const r = await api.post(target, { form: { password: `guess ${i}` }, maxRedirects: 0 });
        statuses.push(r.status());
      } catch {
        /* dropped by the dev proxy */
      }
    }
    expect(statuses).toContain(429);
    expect(statuses).not.toContain(200);
    await api.dispose();
  });
});

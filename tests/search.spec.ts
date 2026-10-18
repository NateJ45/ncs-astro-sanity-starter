// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test, expect, type Page } from './fixtures';
import AxeBuilder from '@axe-core/playwright';
import { settle } from './helpers';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// Visitor site search and share buttons (PORTS.md card 123).
//
// Search is opt-in (src/data/site.ts search.enabled). A site with it off has
// no /pagefind/ index, and every search test skips itself; the starter ships
// with it off. Share tests run on the built pages that carry <ShareButtons>,
// found in dist/client (one per section, at most three), so a build with no
// posts or sermons (no Sanity project, as on CI) simply has none to check.
//
// The known page: /contact/ is a core route in every site of the family, so
// the tests search for the longest word in its <h1> and expect /contact/ in
// the results. No site-specific fixture data needed.

async function searchOn(page: Page): Promise<boolean> {
  const res = await page.request.get('/pagefind/pagefind.js');
  return res.ok();
}

async function contactWord(page: Page): Promise<string> {
  await page.goto('/contact/', { waitUntil: 'domcontentloaded' });
  const h1 = (await page.locator('main h1').first().innerText()).trim();
  const words = h1.split(/[^A-Za-z]+/).filter((w) => w.length >= 4);
  words.sort((a, b) => b.length - a.length);
  return words[0] ?? 'contact';
}

test.describe('site search', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!(await searchOn(page)), 'search is off for this site (site.search.enabled)');
  });

  test('the header button opens the dialog and finds a known page', async ({ page }) => {
    const word = await contactWord(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await settle(page);
    const trigger = page.locator('[data-site-search-open]:visible').first();
    await trigger.click();
    const dialog = page.locator('[data-site-search-dialog]');
    await expect(dialog).toBeVisible();
    const input = dialog.locator('[data-search-input]');
    await expect(input).toBeFocused();
    await input.fill(word);
    const hit = dialog.locator('a[data-search-result][href="/contact/"]');
    await expect(hit).toBeVisible({ timeout: 10_000 });
    await expect(dialog.locator('[data-search-status]')).toContainText(/results? for/);
    // Every result link keeps the trailing slash (rule 19).
    for (const href of await dialog
      .locator('a[data-search-result]')
      .evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''))) {
      expect(href.split('#')[0]).toMatch(/\/$|\.[a-z0-9]+$/i);
    }
  });

  test('keyboard: slash opens, arrows walk results, Escape closes', async ({ page }) => {
    const word = await contactWord(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await settle(page);
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await page.keyboard.press('/');
    const dialog = page.locator('[data-site-search-dialog]');
    await expect(dialog).toBeVisible();
    await page.keyboard.type(word);
    const first = dialog.locator('a[data-search-result]').first();
    await expect(first).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press('ArrowDown');
    await expect(first).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(dialog.locator('[data-search-input]')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('type filters narrow the results when a word matches two kinds of page', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await settle(page);
    await page.locator('[data-site-search-open]:visible').first().click();
    const dialog = page.locator('[data-site-search-dialog]');
    // A word every site uses on its FAQ page and elsewhere.
    await dialog.locator('[data-search-input]').fill('the');
    await expect(dialog.locator('a[data-search-result]').first()).toBeVisible({ timeout: 10_000 });
    const chips = dialog.locator('.site-search__chip');
    test.skip((await chips.count()) < 3, 'this site has only one kind of page for that word');
    await expect(chips.first()).toHaveAttribute('aria-pressed', 'true');
    await chips.nth(1).click();
    await expect(chips.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(chips.nth(1)).toBeFocused();
    await expect(dialog.locator('[data-search-status]')).toContainText(' in ');
  });

  test('no results shows the friendly suggestions', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await settle(page);
    await page.locator('[data-site-search-open]:visible').first().click();
    const dialog = page.locator('[data-site-search-dialog]');
    await dialog.locator('[data-search-input]').fill('qqzzxxjjvv');
    await expect(dialog.locator('[data-search-status]')).toContainText('Nothing found', {
      timeout: 10_000,
    });
    await expect(dialog.locator('[data-search-suggest]')).toBeVisible();
    await expect(dialog.locator('[data-search-suggest] a').first()).toBeVisible();
  });

  test('the /search/ page runs ?q= and has no axe violations', async ({ page }) => {
    const word = await contactWord(page);
    await page.goto(`/search/?q=${encodeURIComponent(word)}`, { waitUntil: 'domcontentloaded' });
    await settle(page);
    const panel = page.locator('[data-search-page]');
    await expect(panel.locator('a[data-search-result][href="/contact/"]')).toBeVisible({
      timeout: 10_000,
    });
    const results = await new AxeBuilder({ page }).include('[data-search-page]').analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('the open dialog has no axe violations', async ({ page }) => {
    const word = await contactWord(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await settle(page);
    await page.locator('[data-site-search-open]:visible').first().click();
    const dialog = page.locator('[data-site-search-dialog]');
    await dialog.locator('[data-search-input]').fill(word);
    await expect(dialog.locator('a[data-search-result]').first()).toBeVisible({ timeout: 10_000 });
    const results = await new AxeBuilder({ page }).include('[data-site-search-dialog]').analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('the mobile menu opens search', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await settle(page);
    await page.getByRole('button', { name: /open (the )?menu/i }).click();
    await page
      .getByRole('link', { name: /search the site/i })
      .last()
      .click();
    const dialog = page.locator('[data-site-search-dialog]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-search-input]')).toBeFocused();
  });
});

/** Built pages with a share block: the first found under each top-level folder. */
function shareRoutes(): string[] {
  const root = join(process.cwd(), 'dist', 'client');
  if (!existsSync(root)) return [];
  const found = new Map<string, string>();
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (found.size >= 3) return;
      const p = join(dir, name);
      if (name === '_astro' || name === 'pagefind') continue;
      if (statSync(p).isDirectory()) walk(p);
      else if (name === 'index.html' && readFileSync(p, 'utf8').includes('data-share-url')) {
        const route = '/' + relative(root, dir).split(sep).join('/') + '/';
        const section = route.split('/')[1] ?? '';
        if (!found.has(section)) found.set(section, route);
      }
    }
  };
  walk(root);
  return [...found.values()];
}

test.describe('share buttons', () => {
  for (const route of shareRoutes()) {
    test(`share links on ${route} are plain, correct URLs`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const block = page.locator('[data-share]').first();
      await expect(block).toBeVisible();
      const url = await block.getAttribute('data-share-url');
      expect(url).toMatch(/^https?:\/\/.+\/$/);
      const enc = encodeURIComponent(url ?? '');
      await expect(block.getByRole('link', { name: /facebook/i })).toHaveAttribute(
        'href',
        `https://www.facebook.com/sharer/sharer.php?u=${enc}`,
      );
      await expect(block.getByRole('link', { name: /on x/i })).toHaveAttribute(
        'href',
        new RegExp(
          `^https://x\\.com/intent/post\\?url=${enc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}&text=`,
        ),
      );
      await expect(block.getByRole('link', { name: /email/i })).toHaveAttribute(
        'href',
        /^mailto:\?subject=/,
      );
      // No third-party script is loaded for sharing.
      const scripts = await page
        .locator('script[src]')
        .evaluateAll((els) => els.map((e) => (e as HTMLScriptElement).src));
      expect(scripts.filter((s) => /facebook|twitter|x\.com|addthis|sharethis/i.test(s))).toEqual(
        [],
      );
    });

    test(`copy link on ${route} copies the page URL`, async ({ page, context, browserName }) => {
      test.skip(browserName !== 'chromium', 'clipboard permissions are a Chromium feature');
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await settle(page);
      const block = page.locator('[data-share]').first();
      await block.getByRole('button', { name: /copy link/i }).click();
      await expect(block.locator('[data-share-status]')).toHaveText('Link copied');
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      expect(copied).toBe(await block.getAttribute('data-share-url'));
    });
  }
});

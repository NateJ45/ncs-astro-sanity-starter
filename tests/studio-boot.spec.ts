// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test, expect } from './fixtures';
import { site } from '../src/data/site';

// =============================================================================
// /studio is the site's own page before any JavaScript runs (PORTS.md card 120)
// =============================================================================
// src/pages/studio/index.astro replaced the page @sanity/astro injected, which
// said "Sanity Studio", wore Sanity's red icon and painted a blank white body
// until React loaded. These checks read the built HTML and the page with
// JavaScript OFF, i.e. exactly what an editor sees in the first second:
//   - the site's name as the title, never "Sanity Studio";
//   - the site's own icon, no data: URI icon (Sanity's);
//   - the branded splash in the document, painted on a non-white ground;
//   - the boot data the navbar wordmark reads.
// The signed-in Studio is not covered here (it needs a Sanity login).
// =============================================================================

test.describe('Studio boot page', () => {
  test('the HTML carries the site title, icon and splash', async ({ request }) => {
    const resp = await request.get('/studio/');
    expect(resp.status()).toBe(200);
    const html = await resp.text();
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
    expect(title).toBe(site.name);
    expect(html).not.toContain('<title>Sanity Studio</title>');
    expect(html).toMatch(/<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg"/);
    expect(html).not.toMatch(/rel="icon"[^>]*href="data:/);
    expect(html).toContain('data-studio-splash');
    expect(html).toContain('id="ncs-studio-boot"');
  });

  test('before hydration: the splash shows on the Studio ground', async ({ browser }) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      const ctx = await browser.newContext({ javaScriptEnabled: false, colorScheme });
      const page = await ctx.newPage();
      await page.goto('/studio/', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveTitle(site.name);
      const splash = page.locator('[data-studio-splash]');
      await expect(splash).toBeVisible();
      await expect(splash).toContainText(site.name);
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(bg, `${colorScheme} body background`).not.toBe('rgba(0, 0, 0, 0)');
      expect(bg, `${colorScheme} body background`).not.toBe('rgb(255, 255, 255)');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow, 'splash scrolls sideways').toBe(false);
      await ctx.close();
    }
  });
});

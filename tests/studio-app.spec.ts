// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test, expect } from './fixtures';

// =============================================================================
// The Studio as a phone app (PORTS.md card 125)
// =============================================================================
// Against the real build: the Studio's own manifest is served and valid, its
// icons load, the service worker registers on /studio/ (and nowhere else), and
// with the connection gone the app shows "You're offline" instead of an error.
// Chrome's own installability check runs over CDP (Lighthouse dropped its PWA
// category in v12, so this is the check that is left).
// The signed-in Studio is not covered (it needs a Sanity login).
// =============================================================================

test.describe('Studio app', () => {
  test('the manifest is served, valid and scoped to /studio/', async ({ request }) => {
    const resp = await request.get('/studio/manifest.webmanifest');
    expect(resp.status()).toBe(200);
    expect(resp.headers()['content-type']).toContain('manifest+json');
    const m = await resp.json();
    expect(m.display).toBe('standalone');
    expect(m.scope).toBe('/studio/');
    expect(m.start_url.startsWith('/studio/')).toBe(true);
    expect(m.name.length).toBeGreaterThan(0);
    expect(m.short_name.length).toBeGreaterThan(0);
    expect(m.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(m.background_color).toMatch(/^#[0-9a-f]{6}$/i);
    for (const icon of m.icons as Array<{ src: string; type: string }>) {
      const r = await request.get(icon.src);
      expect(r.status(), icon.src).toBe(200);
      expect(r.headers()['content-type'], icon.src).toContain('image/png');
    }
    expect(m.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true);
  });

  test('only the Studio links the manifest', async ({ request }) => {
    const studio = await (await request.get('/studio/')).text();
    expect(studio).toContain('rel="manifest" href="/studio/manifest.webmanifest"');
    const home = await (await request.get('/')).text();
    expect(home).not.toContain('/studio/manifest.webmanifest');
    expect(home).not.toContain('serviceWorker');
  });

  test('the worker registers on /studio/ only, and offline shows the offline page', async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/studio/');
    const scope = await page.evaluate(async () => {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((r) => setTimeout(() => r(null), 15000)),
      ]);
      return reg ? reg.scope : null;
    });
    expect(scope).toMatch(/\/studio\/$/);

    // The public site is outside the worker's scope.
    await page.goto('/');
    const outside = await page.evaluate(async () => ({
      controlled: Boolean(navigator.serviceWorker.controller),
      reg: Boolean(await navigator.serviceWorker.getRegistration('/')),
    }));
    expect(outside).toEqual({ controlled: false, reg: false });

    // No connection: the app says so plainly.
    await page.goto('/studio/');
    await ctx.setOffline(true);
    await page.reload();
    await expect(page.locator('[data-studio-offline]')).toBeVisible();
    await expect(page.locator('h1')).toHaveText("You're offline");
    // Card 132: the brand's path, last stone unlaid, and a real Try again button.
    await expect(page.locator('[data-studio-offline] .ncs-sp__stone[data-unlaid]')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(page.locator('body')).toContainText(
      'Your work is safe in the Studio. It will be here when the connection comes back.',
    );
    await ctx.setOffline(false);
    await ctx.close();
  });

  test('Chrome finds nothing stopping an install', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'CDP is Chromium only');
    await page.goto('/studio/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    const cdp = await page.context().newCDPSession(page);
    const { installabilityErrors } = (await cdp.send('Page.getInstallabilityErrors')) as {
      installabilityErrors: Array<{ errorId: string }>;
    };
    // A test browser profile is incognito-like; that one is about the profile, not the app.
    const real = installabilityErrors.filter((e) => e.errorId !== 'in-incognito');
    expect(real).toEqual([]);
  });
});

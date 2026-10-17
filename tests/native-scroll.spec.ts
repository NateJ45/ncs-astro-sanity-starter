import { test, expect } from './fixtures';

// =============================================================================
// Native scrolling: no Lenis, the router owns the reset (PORTS.md card 102)
// =============================================================================
// Lenis was removed on 2026-10-17 (fbcm's removal, 2026-09-24, ported). What it
// did is now the browser's and Astro's: a forward navigation lands at the top,
// Back/Forward restores the position, and in-page anchors glide only for a
// visitor who has pressed something and not asked for less motion (CLAUDE.md
// rule 5, docs/agent/animation.md). This spec pins each of those, against the
// production build (Astro dev full-reloads on Back, so it cannot show restore).
//
// Chromium only (the default project): it drives the real View Transitions
// API. NOT PORTABLE: the routes are this site's; a fork keeps the file and
// changes the two paths below.
// =============================================================================

type Walk = Window & { __walk?: number; __swapY?: number[]; lenis?: unknown };

test.describe('no scroll library', () => {
  test('there is no window.lenis and the document is not driven by one', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    // Lenis started 1.5 to 2s after load (requestIdleCallback), so wait past it.
    await page.waitForTimeout(2500);
    const state = await page.evaluate(() => ({
      lenis: typeof (window as Walk).lenis,
      cls: document.documentElement.className,
    }));
    expect(state.lenis).toBe('undefined');
    expect(state.cls).not.toMatch(/lenis/);
  });
});

test.describe('smooth scrolling is opt-in by first press, under no-preference only', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('scroll-behavior is auto until a press, then smooth', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    const behavior = () =>
      page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
    expect(
      await page.evaluate(() => document.documentElement.hasAttribute('data-smooth-scroll')),
    ).toBe(false);
    expect(await behavior()).toBe('auto');
    await page.mouse.move(100, 100);
    await page.mouse.down();
    await page.mouse.up();
    expect(
      await page.evaluate(() => document.documentElement.hasAttribute('data-smooth-scroll')),
    ).toBe(true);
    expect(await behavior()).toBe('smooth');
  });
});

test.describe('smooth scrolling never applies under reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('scroll-behavior stays auto even after a press', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.keyboard.press('Tab');
    expect(
      await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior),
    ).toBe('auto');
  });
});

test.describe('navigation scroll: reset on forward, restore on Back', () => {
  test.use({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' });

  test('Home, down the page, footer link to /privacy/, then Back', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.evaluate(() => {
      const w = window as Walk;
      w.__walk = 1;
      // Where the router left the page at each swap. A glide would still be at
      // the old position here; an instant placement is already done.
      w.__swapY = [];
      document.addEventListener('astro:after-swap', () => w.__swapY!.push(window.scrollY));
    });

    // Down the home page with a real gesture (this also arms the glide).
    await page.mouse.move(640, 400);
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(700);
    const homeY = await page.evaluate(() => window.scrollY);
    expect(homeY).toBeGreaterThan(300);

    // Forward navigation by a footer link, as a visitor does at the bottom.
    const link = page.locator('footer a[href="/privacy/"]').first();
    await link.scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    await link.click();
    await expect(page).toHaveURL(/\/privacy\/?$/);
    await page.waitForFunction(
      () => !document.documentElement.hasAttribute('data-astro-transition'),
    );

    // A client-side swap (the window survived), placed at the top inside the swap.
    expect(await page.evaluate(() => (window as Walk).__walk)).toBe(1);
    expect(await page.evaluate(() => (window as Walk).__swapY!.at(-1))).toBe(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    // Back restores the position the visitor left (the footer link's scroll).
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await page.waitForFunction(
      () => !document.documentElement.hasAttribute('data-astro-transition'),
    );
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => (window as Walk).__walk)).toBe(1);
    const restored = await page.evaluate(() => window.scrollY);
    expect(restored).toBeGreaterThan(homeY - 5);
    // The restore happened inside the swap, not after it.
    expect(await page.evaluate(() => (window as Walk).__swapY!.at(-1))).toBeGreaterThan(300);
  });
});

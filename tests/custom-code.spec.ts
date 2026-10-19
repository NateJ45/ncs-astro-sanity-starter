// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test, expect } from './fixtures';

// =============================================================================
// Custom code isolation (PORTS.md card 121)
// =============================================================================
// /styleguide/sections/ carries two probes below the wall (CODE_CHECKS in
// src/pages/styleguide/sections.astro):
//   - the BOXED probe runs in CustomCodeFrame's sandboxed srcdoc iframe. It
//     tries to read parent.document, the site's localStorage and cookies, and
//     to mark the page's <body>, then writes what happened.
//   - the ON-PAGE probe has "Runs directly on the page" switched on, so it runs
//     in the page itself and CAN read the site's storage.
// The parent page stores a secret in its own localStorage first, the way the
// embedded Studio keeps an editor's session token.
// =============================================================================

const SECRET = 'studio-session-token-stand-in';

test.describe('Custom code: boxed by default', () => {
  test.beforeEach(async ({ page }) => {
    // Runs in every frame; only the top page (the site's origin) stores it.
    await page.addInitScript((secret) => {
      try {
        if (window === window.top) localStorage.setItem('custom-code-secret', secret);
      } catch {
        /* an opaque-origin frame has no storage at all */
      }
    }, SECRET);
    await page.goto('/styleguide/sections/', { waitUntil: 'domcontentloaded' });
  });

  test('boxed code runs, but cannot read the page, its storage or its cookies', async ({
    page,
  }) => {
    const frameEl = page.locator('[data-custom-code-checks] iframe[data-custom-code-frame]');
    await expect(frameEl).toHaveCount(1);
    await frameEl.scrollIntoViewIfNeeded();

    // The sandbox is what makes the origin opaque.
    const sandbox = (await frameEl.getAttribute('sandbox')) ?? '';
    expect(sandbox.split(' ')).toContain('allow-scripts');
    expect(sandbox.split(' ')).not.toContain('allow-same-origin');

    const probe = page.frameLocator('[data-custom-code-checks] iframe[data-custom-code-frame]');
    await expect(probe.locator('#probe')).toHaveText(
      'ran parent-dom:blocked storage:blocked cookie:blocked',
    );

    // It never reached the page around it.
    await expect(page.locator('body')).not.toHaveAttribute('data-custom-code-escaped', /.*/);
    // And the secret is still only the page's.
    expect(await page.evaluate(() => localStorage.getItem('custom-code-secret'))).toBe(SECRET);
  });

  test('the box sizes itself to its content', async ({ page }) => {
    const frameEl = page.locator('[data-custom-code-checks] iframe[data-custom-code-frame]');
    await frameEl.scrollIntoViewIfNeeded();
    await expect(frameEl).toHaveAttribute('data-sized', 'true');
    const height = await frameEl.evaluate((el) => el.getBoundingClientRect().height);
    // One line of text, not the 240px it holds while loading.
    expect(height).toBeGreaterThanOrEqual(20);
    expect(height).toBeLessThan(200);
  });

  test('the wall widget renders in its box with the base stylesheet', async ({ page }) => {
    const wall = page.frameLocator(
      '[data-section-type="embedSection"] iframe[data-custom-code-frame]',
    );
    await expect(wall.locator('.label')).toHaveText('Vacation Bible School starts in');
    const base = await wall
      .locator('body')
      .evaluate((b) => getComputedStyle(b).getPropertyValue('--font-body').trim());
    expect(base.length).toBeGreaterThan(0);
  });

  test('"Runs directly on the page" still runs on the page', async ({ page }) => {
    const onPage = page.locator('[data-custom-code-checks] [data-on-page-probe]');
    await expect(onPage).toHaveText(`on page: ${SECRET}`);
    // No frame for it: it is part of the page.
    await expect(
      page.locator('[data-custom-code-checks] [data-custom-code-on-page] iframe'),
    ).toHaveCount(0);
  });
});

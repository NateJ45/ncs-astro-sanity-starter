// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test, expect } from './fixtures';

// =============================================================================
// Paste-and-go embeds: the guard rail and the provider shape (PORTS.md card 172)
// =============================================================================
// /styleguide/sections/ renders GUARD_CHECKS the way Sanity content is
// rendered (no trustedCode): script code from a service the website does not
// know asks to run on the page and must stay in its sandboxed box; a pasted
// YouTube share link becomes the privacy-enhanced player at 16:9.
// src/lib/embed-providers.ts decides; EmbedSection.astro draws it.
// =============================================================================

test.describe('Custom code or embed: paste-and-go', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/styleguide/sections/', { waitUntil: 'domcontentloaded' });
  });

  test('unknown script code stays in its box even with "Runs directly on the page" on', async ({
    page,
  }) => {
    const guard = page.locator('[data-embed-guard-checks]');
    await expect(guard.locator('[data-custom-code-on-page]')).toHaveCount(0);
    await expect(guard.locator('[data-guard-probe]')).toHaveCount(0);
    const frame = guard.locator('iframe[data-custom-code-frame]');
    await expect(frame).toHaveCount(1);
    expect(((await frame.getAttribute('sandbox')) ?? '').split(' ')).not.toContain(
      'allow-same-origin',
    );
  });

  test('a YouTube share link becomes the private player, 16 by 9', async ({ page }) => {
    const frame = page.locator(
      '[data-embed-guard-checks] iframe[src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"]',
    );
    await expect(frame).toHaveCount(1);
    await frame.scrollIntoViewIfNeeded();
    const box = await frame.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box!.width / box!.height - 16 / 9)).toBeLessThan(0.02);
  });
});

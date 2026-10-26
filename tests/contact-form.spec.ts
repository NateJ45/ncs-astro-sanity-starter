// Safe to edit by hand
import { test, expect } from './fixtures';
import { settle } from './helpers';

// =============================================================================
// Contact form: no-JS post, every error in one pass, a draft that survives a reload
// and the focus ring on a dark band (PORTS.md card 156)
// =============================================================================
// The form is a client:visible island, so each JS test scrolls it into view and waits for
// it to hydrate (a submit before hydration would be the browser's own post, not ours).
// =============================================================================

async function hydratedForm(page: import('@playwright/test').Page) {
  await page.goto('/contact/', { waitUntil: 'domcontentloaded' });
  const form = page.locator('form[aria-busy]');
  await form.scrollIntoViewIfNeeded();
  // React sets aria-busy="false" on mount; the server HTML has it too, so wait for the
  // island's own marker instead: a controlled input accepts typing and keeps it.
  const name = page.locator('#name');
  await expect(async () => {
    await name.fill('Probe');
    await expect(name).toHaveValue('Probe');
    await page.waitForTimeout(150);
    await expect(name).toHaveValue('Probe');
  }).toPass({ timeout: 10_000 });
  await name.fill('');
  return form;
}

test.describe('Contact form without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('posts as a plain HTML form and says it needs JavaScript', async ({ page }) => {
    await page.goto('/contact/', { waitUntil: 'domcontentloaded' });
    const form = page.locator('form[aria-busy]');
    await expect(form).toHaveAttribute('method', 'post');
    await expect(form).toHaveAttribute('action', '/api/contact/');
    // The notice lives in a <noscript>; read its text rather than its rendering, because whether
    // the browser parses a noscript's children depends on the scripting flag of the document.
    const notice = await page.evaluate(() =>
      [...document.querySelectorAll('noscript')].map((n) => n.textContent ?? '').join(' '),
    );
    expect(notice).toContain('This form needs JavaScript to send.');

    // A submit goes out as a POST, so nothing typed ends up in the address bar.
    await page.locator('#name').fill('Probe Person');
    await page.locator('#email').fill('probe@example.com');
    const [req] = await Promise.all([
      page.waitForRequest((r) => r.url().includes('/api/contact')),
      form.locator('button[type="submit"]').click(),
    ]);
    expect(req.method()).toBe('POST');
    expect(page.url()).not.toContain('Probe');
    expect(req.url()).not.toContain('?');
  });
});

test.describe('Contact form with JavaScript', () => {
  test('shows every problem in one pass and the summary takes focus', async ({ page }) => {
    const form = await hydratedForm(page);
    await form.locator('button[type="submit"]').click();

    const summary = form.locator('[role="alert"][tabindex="-1"]');
    await expect(summary).toBeVisible();
    await expect(summary).toBeFocused();

    // More than one problem is listed together, and each has its own invalid field.
    const items = summary.locator('li');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(2);
    await expect(form.locator('[aria-invalid="true"]')).toHaveCount(count);

    // Each invalid field points at its own message.
    for (const el of await form.locator('[aria-invalid="true"]').all()) {
      const ids = ((await el.getAttribute('aria-describedby')) ?? '').split(' ');
      const errorId = ids.find((id) => id.endsWith('-error'));
      expect(errorId, 'invalid field points at its error line').toBeTruthy();
      await expect(page.locator(`#${errorId}`)).toBeVisible();
    }

    // A summary link moves focus to its field.
    await items.first().locator('a').click();
    await expect(form.locator('[aria-invalid="true"]').first()).toBeFocused();
  });

  test('keeps an unsent draft in sessionStorage across a reload', async ({ page }) => {
    const form = await hydratedForm(page);
    await form.locator('#name').fill('Draft Person');
    await form.locator('#email').fill('draft@example.com');

    // Saved in this tab only, never in localStorage.
    await expect
      .poll(() =>
        page.evaluate(() => Object.keys(window.sessionStorage).filter((k) => /draft/.test(k))),
      )
      .toHaveLength(1);
    expect(
      await page.evaluate(() => Object.keys(window.localStorage).filter((k) => /draft/.test(k))),
    ).toHaveLength(0);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('form[aria-busy]').scrollIntoViewIfNeeded();
    await expect(page.locator('#name')).toHaveValue('Draft Person');
    await expect(page.locator('#email')).toHaveValue('draft@example.com');
  });

  test('?about= starts the message when the visitor has typed nothing', async ({ page }) => {
    await page.goto('/contact/?about=Open%20house', { waitUntil: 'domcontentloaded' });
    await page.locator('form[aria-busy]').scrollIntoViewIfNeeded();
    // The built-in form has a message box; an editor-written form has a textarea question.
    const box = page.locator('textarea').first();
    await expect(box).toHaveValue(/^About Open house: /, { timeout: 10_000 });
  });
});

test.describe('Focus ring on a dark band', () => {
  test('a link inside the dark panel draws a ring that clears 3:1', async ({ page }) => {
    await page.goto('/styleguide/', { waitUntil: 'domcontentloaded' });
    await settle(page);
    const dark = page.locator('section.bg-accent-dark').first();
    await dark.scrollIntoViewIfNeeded();
    const link = dark.locator('a').first();
    await link.focus();
    const out = await link.evaluate((el) => {
      const toRgb = (c: string) => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
      const lin = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      const lum = (c: number[]) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
      // Resolve the ring through a probe, so a var() in the custom property becomes a colour.
      const probe = document.createElement('span');
      probe.style.color = 'var(--ring)';
      el.appendChild(probe);
      const ring = toRgb(getComputedStyle(probe).color);
      probe.remove();
      // The ring is drawn outside the link, so it sits on the BAND, not on the link's own fill.
      let node: Element | null = el.closest('section') ?? el;
      let bg = [0, 0, 0];
      while (node) {
        const c = getComputedStyle(node).backgroundColor;
        if (c && !/rgba\(.*, 0\)|transparent/.test(c)) {
          bg = toRgb(c);
          break;
        }
        node = node.parentElement;
      }
      const [a, b] = [lum(ring), lum(bg)];
      return { ring, bg, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
    });
    expect(out.ratio, `ring ${out.ring} on ${out.bg}`).toBeGreaterThanOrEqual(3);
  });
});

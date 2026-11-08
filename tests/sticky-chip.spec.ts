// Safe to edit by hand
// The journal's sticky CTA chip (card 224, WCAG 2.4.11 and 2.4.7). It must paint above the footer
// at the foot of the page (it renders into <body>, outside <main>'s view-transition stacking
// context) and must stay showing while one of its own links has keyboard focus.
import { test, expect } from './fixtures';
import { settle } from './helpers';

test.use({ viewport: { width: 390, height: 844 } });

test('the journal chip paints above the footer and stays while focused', async ({ page }) => {
  await page.goto('/journal/', { waitUntil: 'domcontentloaded' });
  const entries = page.locator('main a[href^="/journal/"]:not([href="/journal/"])');
  test.skip((await entries.count()) === 0, 'no journal entries in this build');
  const href = await entries.first().getAttribute('href');
  await page.goto(href!, { waitUntil: 'domcontentloaded' });
  await settle(page);

  // The chip mounts into <body> after hydration (client:idle), so wait for it rather than count it.
  const chip = page.locator('body > [data-sticky-chip]');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(chip).toHaveCount(1, { timeout: 10_000 });
  await expect(chip).toHaveAttribute('data-chip-visible', '');
  await page.waitForTimeout(400);

  const onTop = await chip.evaluate((c) => {
    const r = c.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!hit && c.contains(hit);
  });
  expect(onTop, 'the chip is painted above the footer').toBe(true);

  await chip.locator('a').focus();
  // Scroll back above the threshold: the chip would normally hide here.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await expect(chip).toHaveAttribute('data-chip-visible', '');
  await expect(chip).toHaveCSS('opacity', '1');
});

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

// =============================================================================
// The Studio's Report tool (PORTS.md card 218)
// =============================================================================
// Drives /styleguide/report/: the real screen (src/sanity/kit/board/BoardScreen.tsx)
// on made-up numbers (src/lib/studio-board-fixture.ts) with a fixed "today" of
// 2026-11-05, so nothing signs in and nothing asks Google. The signed-in Studio
// tool is the same screen with the route behind it; the route's rules are unit
// tested (src/lib/studio-board.test.ts).
// Pins: Month, Quarter and Year; a running period says "so far, through";
// a measure before it was counted reads "Not tracked yet" with no change chip;
// a gap drops the comparison and says why; a chart's type buttons, its Table,
// Save picture and Copy numbers; "Show more"; the "i" explanations; the screens
// for not connected and failed; no sideways scroll at 320 px; axe, light and dark.
// =============================================================================

const ROUTE = '/styleguide/report/';
type Page = import('@playwright/test').Page;

async function open(page: Page, query = '') {
  await page.goto(`${ROUTE}${query}`, { waitUntil: 'load' });
  await expect(page.locator('[data-board-title]')).toBeVisible();
}
const tile = (page: Page, measure: string) =>
  page.locator(`.ncs-brd__overview [data-measure="${measure}"]`);
const chart = (page: Page, id: string) => page.locator(`[data-board-chart="${id}"]`);

test.describe('board report', () => {
  test('opens on the running month, counted through yesterday', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-board-title]')).toHaveText('November 2026');
    await expect(page.locator('[data-board-sub]')).toContainText('So far, through November 4.');
    await expect(page.locator('[data-board-sub]')).toContainText('the same days in November 2025');
    await expect(tile(page, 'visitors').locator('.ncs-brd__num')).toHaveText(/^[\d,]+$/);
    await expect(tile(page, 'visitors').locator('.ncs-brd__chip')).toHaveText(/^(Up|Down) \d+%$/);
    await expect(tile(page, 'visitors').locator('svg.ncs-brd__spark')).toBeVisible();
    // Up to four key charts, each drawn by the kit.
    await expect(page.locator('.ncs-brd__charts.is-key > *')).toHaveCount(4);
    await expect(chart(page, 'overview-0').locator('svg').first()).toBeVisible();
  });

  test('Month, Quarter and Year, and stepping back', async ({ page }) => {
    await open(page);
    const kinds = page.getByRole('group', { name: 'Report by' });
    await kinds.getByRole('button', { name: 'Quarter' }).click();
    await expect(page.locator('[data-board-title]')).toHaveText('October to December 2026');
    await expect(kinds.getByRole('button', { name: 'Quarter' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await kinds.getByRole('button', { name: 'Year' }).click();
    await expect(page.locator('[data-board-title]')).toHaveText('The year 2026');
    // A year sets this year's months beside last year's.
    await expect(chart(page, 'overview-0')).toContainText('2025');
    await kinds.getByRole('button', { name: 'Month' }).click();
    await page.getByRole('button', { name: 'Earlier' }).click();
    await expect(page.locator('[data-board-title]')).toHaveText('October 2026');
    await expect(page.locator('[data-board-sub]')).toHaveText(
      'Each number is set against October 2025.',
    );
    await expect(page.getByRole('button', { name: 'Later' })).toBeEnabled();
    await page.getByLabel('Which month').selectOption('2026-02');
    await expect(page.locator('[data-board-title]')).toHaveText('February 2026');
  });

  test('a measure before it was counted reads "Not tracked yet", never 0', async ({ page }) => {
    await open(page, '?p=m&k=2026-06');
    const give = tile(page, 'event:give_click');
    await expect(give.locator('.ncs-brd__num')).toHaveText('Not tracked yet');
    await expect(give.locator('.ncs-brd__chip')).toHaveCount(0);
    await expect(give).toContainText('Counting began September 1, 2026');
    await expect(chart(page, 'forms-1')).toContainText('Not tracked yet');
    // The same period, a measure that was counted, is compared as usual.
    await expect(tile(page, 'visitors').locator('.ncs-brd__chip')).toBeVisible();
  });

  test('a gap drops the comparison and says why', async ({ page }) => {
    await open(page, '?p=m&k=2025-12');
    await expect(page.locator('[data-board-notice]')).toContainText('December 2025');
    await expect(page.locator('[data-board-notice]')).toContainText('not compared');
    await expect(page.locator('.ncs-brd__overview .ncs-brd__chip')).toHaveCount(0);
    // And the month is left out of a later period's chart.
    await open(page, '?p=m&k=2026-10');
    await expect(chart(page, 'overview-0')).toContainText('Left out');
  });

  test('a chart switches type, shows its table, and offers Save picture and Copy numbers', async ({
    page,
  }) => {
    await open(page, '?p=m&k=2026-10');
    const fig = chart(page, 'overview-0');
    const line = fig.locator('.ncs-chart__types [data-type="line"]');
    await line.click();
    await expect(line).toHaveAttribute('aria-pressed', 'true');
    await expect(fig.locator('.ncs-chart__types [data-type="bar"]')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await fig.getByRole('button', { name: 'More' }).click();
    await expect(fig.getByText('Save picture')).toBeVisible();
    await expect(fig.getByText('Copy numbers')).toBeVisible();
    await fig.getByText('Table', { exact: true }).click();
    await expect(fig.locator('table')).toBeVisible();
    await expect(fig.locator('table')).toContainText('Oct 2026');
    await expect(fig.locator('table')).not.toContainText('Dec 2025');
  });

  test('"Show more" opens the rest of a part and is remembered', async ({ page }) => {
    await open(page, '?p=m&k=2026-10');
    const part = page.locator('[data-part="forms"]');
    const more = part.getByRole('button', { name: /^Show more: / });
    await expect(chart(page, 'forms-more-0')).toHaveCount(0);
    await more.click();
    await expect(chart(page, 'forms-more-0').locator('svg').first()).toBeVisible();
    await expect(part.getByRole('button', { name: 'Show less' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await page.reload();
    await expect(chart(page, 'forms-more-0')).toBeVisible();
  });

  test('long explanations sit behind an "i" button, reachable by keyboard', async ({ page }) => {
    await open(page, '?p=m&k=2026-10');
    const t = tile(page, 'visitors');
    const text = t.locator('.ncs-brd__explain');
    await expect(text).toBeHidden();
    const i = t.getByRole('button', { name: /how Visitors is counted/ });
    await i.focus();
    await page.keyboard.press('Enter');
    await expect(text).toBeVisible();
    await expect(i).toHaveAttribute('aria-expanded', 'true');
  });

  test('a site with no Google Analytics is told plainly what is needed', async ({ page }) => {
    await open(page, '?state=not-set-up');
    const state = page.locator('[data-board-state="not-set-up"]');
    await expect(state).toContainText('not connected yet');
    await expect(state).toContainText('Google Analytics');
    await expect(page.locator('.ncs-brd__num')).toHaveCount(0);
    await open(page, '?state=failed');
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  });

  test('no em-dashes and no jargon in what an editor reads', async ({ page }) => {
    await open(page, '?p=y&k=2026');
    const text = await page.locator('.ncs-brd').innerText();
    expect(text).not.toContain('—');
    expect(text.toLowerCase()).not.toMatch(/\bsessions?\b|engagement rate/);
  });

  for (const width of [320, 768, 1440]) {
    test(`nothing scrolls sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page, '?p=m&k=2026-10');
      await expect(chart(page, 'overview-0').locator('svg').first()).toBeVisible();
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(over).toBeLessThanOrEqual(0);
      const wide = await page.evaluate(() =>
        [...document.querySelectorAll('.ncs-brd *')]
          .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
          .map((el) => el.className.toString())
          .slice(0, 5),
      );
      expect(wide).toEqual([]);
    });
  }

  for (const scheme of ['light', 'dark']) {
    test(`passes axe in ${scheme}`, async ({ page }) => {
      await open(page, `?p=m&k=2026-10&scheme=${scheme}`);
      await expect(chart(page, 'overview-3').locator('svg').first()).toBeVisible();
      const results = await new AxeBuilder({ page }).include('.ncs-brd').analyze();
      expect(
        results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`),
      ).toEqual([]);
    });
  }
});

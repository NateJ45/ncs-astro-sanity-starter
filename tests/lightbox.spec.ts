// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// The photo viewer (src/components/Lightbox.astro) and the section looks wall
// =============================================================================
// Drives /styleguide/looks/, the fixed-data page that stacks every section look
// (src/pages/styleguide/looks.astro) and carries two galleries. Its photos are
// fake Sanity references, so every request to the Sanity CDN is answered with
// the local fixture picture the visual suite already uses.
//
// What it pins: a photo is a real link (JavaScript off still works), a click
// opens a modal viewer with the caption and position, the arrow keys and the
// buttons step and wrap inside ONE gallery, Tab stays inside the viewer,
// Escape closes it and focus goes back to the photo, a swipe steps, and the
// looks wall passes axe (which measures the Feature band's text).
// =============================================================================
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from './fixtures';
import { settle } from './helpers';

const ROUTE = '/styleguide/looks/';
const FIXTURE = join(process.cwd(), 'tests', 'visual', 'fixtures', 'layout-hero.jpg');

async function load(page: Page) {
  await page.route('**/cdn.sanity.io/**', (route) =>
    route.fulfill({ path: FIXTURE, contentType: 'image/jpeg' }),
  );
  await page.goto(ROUTE, { waitUntil: 'domcontentloaded' });
}

/** The first gallery on the wall, and its photo links. */
const firstGallery = (page: Page) => page.locator('[data-lightbox-group]').first();

test('every gallery photo is a real link to the full-size picture', async ({ page }) => {
  await load(page);
  const links = page.locator('a[data-lightbox]');
  await expect(links).toHaveCount(5);
  for (const href of await links.evaluateAll((as) =>
    as.map((a) => (a as HTMLAnchorElement).href),
  )) {
    expect(href).toContain('cdn.sanity.io');
    expect(href).toContain('fit=max');
  }
});

test('opens on the clicked photo, with caption and position', async ({ page }) => {
  await load(page);
  await firstGallery(page).locator('a[data-lightbox]').nth(1).click();
  const dialog = page.getByRole('dialog', { name: 'Photo viewer' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.lightbox__text')).toHaveText('The picnic');
  await expect(dialog.locator('.lightbox__count')).toHaveText('2 of 3');
  await expect(dialog.locator('.lightbox__img')).toHaveAttribute(
    'alt',
    'A table of food at the picnic',
  );
  // The close button has focus, so Escape and Enter both work at once.
  await expect(page.getByRole('button', { name: 'Close photo viewer' })).toBeFocused();
});

test('arrow keys and buttons step through ONE gallery and wrap', async ({ page }) => {
  await load(page);
  await firstGallery(page).locator('a[data-lightbox]').first().click();
  const count = page.locator('.lightbox__count');
  await expect(count).toHaveText('1 of 3');
  await page.keyboard.press('ArrowRight');
  await expect(count).toHaveText('2 of 3');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(count).toHaveText('3 of 3');
  await page.getByRole('button', { name: 'Next photo' }).click();
  await expect(count).toHaveText('1 of 3');
  await page.getByRole('button', { name: 'Previous photo' }).click();
  await expect(count).toHaveText('3 of 3');
});

test('Tab stays inside the viewer, Escape closes and focus returns', async ({ page }) => {
  await load(page);
  const opener = firstGallery(page).locator('a[data-lightbox]').nth(2);
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Photo viewer' });
  await expect(dialog).toBeVisible();

  for (let i = 0; i < 7; i++) {
    await page.keyboard.press(i % 3 === 2 ? 'Shift+Tab' : 'Tab');
    const inside = await page.evaluate(() => !!document.activeElement?.closest('dialog.lightbox'));
    expect(inside, `focus left the viewer after ${i + 1} presses`).toBe(true);
  }

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  // The page scrolls again once the viewer is shut.
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
});

test('a swipe steps to the next photo', async ({ page }) => {
  await load(page);
  await firstGallery(page).locator('a[data-lightbox]').first().click();
  const count = page.locator('.lightbox__count');
  await expect(count).toHaveText('1 of 3');
  await page.evaluate(() => {
    const d = document.querySelector('dialog.lightbox')!;
    const opts = { bubbles: true, pointerType: 'touch', isPrimary: true };
    d.dispatchEvent(new PointerEvent('pointerdown', { ...opts, clientX: 300, clientY: 300 }));
    d.dispatchEvent(new PointerEvent('pointerup', { ...opts, clientX: 180, clientY: 310 }));
  });
  await expect(count).toHaveText('2 of 3');
});

test('a second gallery steps through its own photos only', async ({ page }) => {
  await load(page);
  await page.locator('[data-lightbox-group]').nth(1).locator('a[data-lightbox]').first().click();
  await expect(page.locator('.lightbox__count')).toHaveText('1 of 2');
  await expect(page.locator('.lightbox__text')).toHaveText('Choir, Easter morning');
});

test('with JavaScript off, a photo opens the full-size picture', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await load(page);
  const link = firstGallery(page).locator('a[data-lightbox]').first();
  const href = await link.getAttribute('href');
  const [request] = await Promise.all([page.waitForRequest((r) => r.url() === href), link.click()]);
  expect(request.url()).toContain('fit=max');
  await context.close();
});

test('the looks wall has no axe violations (the Feature band included)', async ({ page }) => {
  await load(page);
  await settle(page);
  const results = await new AxeBuilder({ page }).analyze();
  const report = results.violations
    .map(
      (v) =>
        `  [${v.impact ?? 'unknown'}] ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
    )
    .join('\n');
  expect(results.violations, `axe violations on ${ROUTE}:\n${report}`).toEqual([]);
});

test('the viewer itself has no axe violations', async ({ page }) => {
  await load(page);
  await firstGallery(page).locator('a[data-lightbox]').first().click();
  await expect(page.getByRole('dialog', { name: 'Photo viewer' })).toBeVisible();
  const results = await new AxeBuilder({ page }).include('dialog.lightbox').analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});

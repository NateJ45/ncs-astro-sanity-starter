// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The photo hero, "Photo behind the words" (PORTS.md card 189, from FBC Auburn), on its fixed-data
// wall (src/pages/styleguide/photo-hero/[variant].astro). The rules are in src/lib/hero-video.ts
// and src/lib/photo-hero.ts (unit tested there, the contrast promise included); this checks the
// page keeps them:
//   - the photo is the LCP image (eager, high priority) and the words sit over it as the page's h1;
//   - the short-facts card draws beside the words, and the inner-page shape has none;
//   - reduced motion: the still photo, and no <video> at all (nothing is downloaded);
//   - otherwise: the photo is the clip's poster, the clip is muted, has no controls and takes no
//     clicks, and the Pause button is a real, keyboard-reachable toggle that is remembered;
//   - phones get the phone copy and never request the full clip; a slow link keeps the still;
//   - nothing scrolls sideways at 320px, and axe finds nothing in the hero.
// Playback itself is not asserted: Playwright's browsers differ on H.264.
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { join } from 'node:path';

const HOME = '/styleguide/photo-hero/home/';
const PAGE = '/styleguide/photo-hero/page/';
const FIXTURES = join(process.cwd(), 'tests', 'visual', 'fixtures');

async function load(page: Page, route = HOME) {
  await page.route('**/cdn.sanity.io/images/**', (r) =>
    r.fulfill({ path: join(FIXTURES, 'layout-hero.jpg'), contentType: 'image/jpeg' }),
  );
  await page.route('**/cdn.sanity.io/files/**', (r) =>
    r.fulfill({ path: join(FIXTURES, 'hero-clip.mp4'), contentType: 'video/mp4' }),
  );
  await page.goto(route, { waitUntil: 'load' });
}

test.describe('the frame', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the photo is eager, and the words are the h1 over it', async ({ page }) => {
    await load(page);
    const hero = page.locator('.ph-hero');
    await expect(hero).toHaveCount(1);
    await expect(hero).toHaveClass(/ph-hero--tall/);
    const img = hero.locator('.ph-photo img').first();
    await expect(img).toHaveAttribute('loading', 'eager');
    await expect(img).toHaveAttribute('fetchpriority', 'high');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(hero.locator('h1')).toHaveText('A clear promise in a few words');
    await expect(hero.locator('.ph-card')).toContainText('Open Monday to Friday, 9 to 5');
  });

  test('the inner-page shape: shorter, no card, no clip', async ({ page }) => {
    await load(page, PAGE);
    const hero = page.locator('.ph-hero');
    await expect(hero).not.toHaveClass(/ph-hero--tall/);
    await expect(hero.locator('.ph-card')).toHaveCount(0);
    await expect(hero).not.toHaveAttribute('data-hero-video', /./);
    await expect(page.locator('[data-hero-video-toggle]')).toHaveCount(0);
  });

  test('with reduced motion: the still photo and no video', async ({ page }) => {
    await load(page);
    await page.waitForTimeout(500);
    await expect(page.locator('.ph-hero video')).toHaveCount(0);
    await expect(page.locator('[data-hero-video-toggle]')).toBeHidden();
  });

  test('no horizontal scroll at 320px, and axe finds nothing in the hero', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await load(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const results = await new AxeBuilder({ page }).include('.ph-hero').analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
  });
});

test.describe('the clip', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the photo is the poster, and the clip is silent and untouchable', async ({ page }) => {
    await load(page);
    const still = page.locator('.ph-photo img').first();
    const clip = page.locator('.ph-hero video');
    await expect(clip).toHaveCount(1);
    const stillSrc = await still.evaluate((img) => (img as HTMLImageElement).currentSrc);
    const facts = await clip.evaluate((v) => {
      const el = v as HTMLVideoElement;
      return {
        poster: el.poster,
        muted: el.muted,
        controls: el.controls,
        loop: el.loop,
        playsInline: el.playsInline,
        hidden: el.getAttribute('aria-hidden'),
        pointer: getComputedStyle(el).pointerEvents,
        source: el.querySelector('source')?.getAttribute('src'),
      };
    });
    expect(facts.poster).toBe(stillSrc);
    expect(facts).toMatchObject({
      muted: true,
      controls: false,
      loop: true,
      playsInline: true,
      hidden: 'true',
      pointer: 'none',
    });
    expect(facts.source).toMatch(/\/hero-clip\.mp4$/);
  });

  test('the Pause button is reachable by keyboard, toggles the clip and is remembered', async ({
    page,
  }) => {
    await load(page);
    const toggle = page.locator('[data-hero-video-toggle]');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(toggle).toHaveText(/Pause video/);
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(toggle).toHaveText(/Play video/);
    expect(
      await page.locator('.ph-hero video').evaluate((v) => (v as HTMLVideoElement).paused),
    ).toBe(true);
    await page.reload({ waitUntil: 'load' });
    await expect(page.locator('[data-hero-video-toggle]')).toHaveAttribute('aria-pressed', 'true');
  });

  // Chrome pauses a muted video in a hidden tab and does not always resume it. Counting play()
  // calls, not playback (codecs differ).
  test('the clip starts again when a background tab comes to the front', async ({ page }) => {
    await load(page);
    await expect(page.locator('.ph-hero video')).toHaveCount(1);
    const calls = await page.evaluate(async () => {
      const v = document.querySelector('.ph-hero video') as HTMLVideoElement;
      v.pause();
      let n = 0;
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        n += 1;
        return play.call(this);
      };
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise((r) => setTimeout(r, 50));
      HTMLMediaElement.prototype.play = play;
      return n;
    });
    expect(calls).toBe(1);
  });
});

test.describe('on a phone', () => {
  test.use({ reducedMotion: 'no-preference', viewport: { width: 375, height: 812 } });

  test('plays the phone copy and never asks for the full clip', async ({ page }) => {
    const asked: string[] = [];
    page.on('request', (r) => {
      if (r.url().endsWith('.mp4')) asked.push(new URL(r.url()).pathname);
    });
    await load(page);
    await expect(page.locator('.ph-hero video source')).toHaveAttribute(
      'src',
      /\/hero-clip-640\.mp4$/,
    );
    await page.waitForTimeout(500);
    expect(asked.some((p) => p.endsWith('/hero-clip.mp4'))).toBe(false);
  });

  test('keeps the still on a slow link', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'connection', {
        configurable: true,
        get: () => ({ effectiveType: '4g', downlink: 0.4, saveData: false }),
      });
    });
    await load(page);
    await page.waitForTimeout(500);
    await expect(page.locator('.ph-hero video')).toHaveCount(0);
  });
});

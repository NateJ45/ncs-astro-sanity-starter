// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

// =============================================================================
// The flow layer (PORTS.md card 192, from FBC Auburn)
// =============================================================================
// Drives the motion wall (/styleguide/motion/full/ and /fade/), which turns the layer on for
// itself, so this runs against any build whatever the site's own layout.motion. It pins the
// layer's promises (docs/agent/animation.md, "The flow layer"):
//   - the first screen shows as it is; below the fold, units start hidden and land on arrival;
//   - reduced motion shows everything at once, with nothing armed;
//   - JavaScript off, or a flow script that never loads, leaves every word visible;
//   - nothing shifts the layout (CLS 0) and nothing moves once the page has settled;
//   - a unit holding keyboard focus is never transparent.
// Chromium only (the default project).
// =============================================================================

const FULL = '/styleguide/motion/full/';
const FADE = '/styleguide/motion/fade/';

/** Opacity of every unit-shaped element in the given section, after the computed style. */
const opacities = (page: Page, fx: string) =>
  page.evaluate(
    (sel) =>
      [...document.querySelectorAll<HTMLElement>(`${sel} :is(h1, h2, p, li, img)`)].map((el) =>
        Number(getComputedStyle(el).opacity),
      ),
    `[data-fx="${fx}"]`,
  );

/** Scrolls the whole page in steps, so every unit reaches the observer. */
async function walk(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= height; y += 300) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(60);
  }
}

test.describe('flow layer with motion on', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('first screen as is; below the fold armed, then landed on arrival', async ({ page }) => {
    await page.goto(FULL, { waitUntil: 'load' });
    await expect(page.locator('html')).toHaveAttribute('data-flow', 'full');
    await expect(page.locator('html')).toHaveClass(/flow-armed/);
    // The first screen is never held.
    expect(await opacities(page, 'first-screen')).toEqual([1, 1]);
    // Below the fold: armed, on the hidden first frame.
    const armed = await page.locator('[data-fx="two"] li.flow').count();
    expect(armed).toBe(3);
    const items = await page
      .locator('[data-fx="two"] li')
      .evaluateAll((els) => els.map((el) => Number(getComputedStyle(el).opacity)));
    expect(items).toEqual([0, 0, 0]);
    // Arrive: everything lands and its classes come off.
    await walk(page);
    await page.waitForTimeout(1500);
    expect(await page.locator('main .flow').count()).toBe(0);
    for (const fx of ['one', 'two', 'three']) {
      expect(Math.min(...(await opacities(page, fx))), fx).toBe(1);
    }
  });

  test('a full page splits a heading below the fold into line masks', async ({ page }) => {
    await page.goto(FULL, { waitUntil: 'load' });
    // The split waits for the fonts (600ms at most).
    await expect(page.locator('[data-fx="one"] h2 .flow-line').first()).toBeAttached();
    const text = await page.locator('[data-fx="one"] h2').innerText();
    expect(text.replace(/\s+/g, ' ').trim()).toBe(
      'A heading long enough to wrap across two lines on a phone',
    );
  });

  test('a fade page is calm: nothing split, a short fade', async ({ page }) => {
    await page.goto(FADE, { waitUntil: 'load' });
    await expect(page.locator('html')).toHaveAttribute('data-flow', 'calm');
    await page.waitForTimeout(800);
    expect(await page.locator('.flow-line').count()).toBe(0);
    const anim = await page
      .locator('[data-fx="one"] h2')
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(anim).toBe('flow-fade');
  });

  for (const rep of Array.from({ length: 16 }, (_, i) => i)) test(`no layout shift in main, and nothing moves once settled #${rep}`, async ({ page }) => {
    // Shifts whose moved nodes are inside <main>, where the layer works. The header's own
    // font-swap shift (about 0.0004, the same under reduced motion) is not the layer's.
    // Each counted shift is also described (moved node, its rect before and after, the scroll
    // position), so a failure names what moved instead of only how much.
    type Shift = {
      value: number;
      startTime: number;
      sources?: {
        node?: Node | null;
        previousRect: DOMRectReadOnly;
        currentRect: DOMRectReadOnly;
      }[];
    };
    type Log = { __cls: number; __shifts: string[] };
    await page.addInitScript(() => {
      const w = window as unknown as Log;
      w.__cls = 0;
      w.__shifts = [];
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as Shift[]) {
          const main = document.getElementById('main');
          const inMain = (e.sources ?? []).filter((s) => s.node && main?.contains(s.node));
          if (!inMain.length) continue;
          w.__cls += e.value;
          const rect = (r: DOMRectReadOnly) =>
            [r.x, r.y, r.width, r.height].map((n) => Math.round(n * 100) / 100).join(',');
          for (const s of inMain) {
            const n = s.node as Node;
            const el = n.nodeType === 1 ? (n as Element) : n.parentElement;
            const name = `${el?.tagName.toLowerCase()}.${String(el?.className ?? '').replace(/\s+/g, '.')}`;
            w.__shifts.push(
              `${Math.round(e.startTime)}ms y=${Math.round(scrollY)} ${e.value.toFixed(5)} ` +
                `${name} "${(n.textContent ?? '').trim().slice(0, 30)}" ` +
                `[${rect(s.previousRect)}] -> [${rect(s.currentRect)}]`,
            );
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(FULL, { waitUntil: 'load' });
    await walk(page);
    await page.waitForTimeout(1500);
    const { cls, shifts } = await page.evaluate(() => {
      const w = window as unknown as Log;
      return { cls: w.__cls, shifts: w.__shifts };
    });
    expect(cls, shifts.join('\n')).toBe(0);
    const rects = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('main h2, main p, main li, main img')].map((el) => {
          const r = el.getBoundingClientRect();
          return [r.top + scrollY, r.left, r.width, r.height].map(Math.round).join(',');
        }),
      );
    const before = await rects();
    await page.waitForTimeout(1000);
    expect(await rects()).toEqual(before);
    // Time-based animations are all done; a photo's drift is tied to the scroll (a view
    // timeline), so it moves only when the reader does.
    const timed = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((a) => !a.timeline || a.timeline.constructor.name === 'DocumentTimeline')
          .filter((a) => a.playState === 'running').length,
    );
    expect(timed).toBe(0);
  });

  test('a unit holding keyboard focus is never transparent', async ({ page }) => {
    await page.goto(FULL, { waitUntil: 'load' });
    const link = page.locator('[data-fx="three"] a');
    await link.focus();
    const opacity = await link.evaluate((el) => {
      let o = 1;
      for (let p: Element | null = el; p; p = p.parentElement) {
        o *= Number(getComputedStyle(p).opacity);
      }
      return o;
    });
    expect(opacity).toBe(1);
  });
});

test.describe('reduced motion shows everything at once', () => {
  test.use({ reducedMotion: 'reduce' });

  test('no html.motion, nothing armed, every word visible', async ({ page }) => {
    await page.goto(FULL, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    const state = await page.evaluate(() => ({
      motion: document.documentElement.classList.contains('motion'),
      flow: document.documentElement.dataset.flow ?? null,
      armed: document.querySelectorAll('.flow').length,
      lines: document.querySelectorAll('.flow-line').length,
    }));
    expect(state).toEqual({ motion: false, flow: null, armed: 0, lines: 0 });
    for (const fx of ['first-screen', 'one', 'two', 'three']) {
      expect(Math.min(...(await opacities(page, fx))), fx).toBe(1);
    }
  });
});

test.describe('visible without the script', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('JavaScript off: every word visible', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(FULL, { waitUntil: 'load' });
    // data-reveal sections are hidden only under html.motion, which needs JS.
    for (const fx of ['first-screen', 'one', 'two', 'three']) {
      expect(Math.min(...(await opacities(page, fx))), fx).toBe(1);
    }
    await ctx.close();
  });

  test('the flow script fails to load: no unit is ever hidden', async ({ page }) => {
    await page.route(/FlowMotion[^/]*\.js$/, (route) => route.abort());
    await page.goto(FULL, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    expect(await page.locator('.flow').count()).toBe(0);
    expect(await page.evaluate(() => document.documentElement.classList.contains('motion'))).toBe(
      true,
    );
    // The flow units themselves are never hidden; the older [data-reveal] sections still wait
    // for BaseLayout's own observer, so walk the page for them.
    await walk(page);
    await page.waitForTimeout(1000);
    for (const fx of ['first-screen', 'one', 'two', 'three']) {
      expect(Math.min(...(await opacities(page, fx))), fx).toBe(1);
    }
  });
});

test.describe('the default motion ships nothing new', () => {
  test('a reveal-motion page has no data-motion and no flow script', async ({ page }) => {
    const scripts: string[] = [];
    page.on('request', (r) => scripts.push(r.url()));
    await page.goto('/', { waitUntil: 'load' });
    const motion = await page.evaluate(() => document.documentElement.dataset.motion ?? null);
    // The starter's own config is reveal; a fork that picked another motion skips this check.
    test.skip(motion !== null, 'this site sets layout.motion');
    expect(scripts.some((u) => /FlowMotion/.test(u))).toBe(false);
    expect(await page.locator('main[data-flow-full]').count()).toBe(0);
  });
});

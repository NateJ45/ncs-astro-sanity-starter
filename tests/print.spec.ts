// Safe to edit by hand
import { test, expect } from '@playwright/test';
import { routes } from './routes';

// =============================================================================
// Printing: no words in <main> print invisible (PORTS.md card 155)
// =============================================================================
// Scroll reveals ([data-reveal], stagger grids) sit on a hidden starting state
// until they are scrolled to, and print never scrolls, so before
// src/styles/print.css a printed page could be one screen of words and then
// blank paper. Motion is ON here (the default, no reduced-motion): that is the
// case that used to fail. Each route is print-emulated and every element that
// owns text must resolve to an opacity of 1 all the way up the tree.
//
// A site that adds its own start-hidden mechanism extends print.css, not this
// file; this spec just reports what would print invisible.
// =============================================================================

test.use({ reducedMotion: 'no-preference' });

for (const route of routes) {
  test(`${route}: every word in main is visible in print`, async ({ page }) => {
    const res = await page.goto(route, { waitUntil: 'load' });
    test.skip(!res || res.status() >= 400, `${route} is not built here`);
    await page.emulateMedia({ media: 'print' });
    const hidden = await page.evaluate(() => {
      const main = document.getElementById('main');
      if (!main) return ['no main'];
      const out: string[] = [];
      for (const el of main.querySelectorAll<HTMLElement>('*')) {
        const ownText = [...el.childNodes].some(
          (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim(),
        );
        if (!ownText) continue;
        if (el.closest('[aria-hidden="true"], [hidden], details:not([open]) > :not(summary)'))
          continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        let opacity = 1;
        for (
          let e: HTMLElement | null = el;
          e && e !== document.documentElement;
          e = e.parentElement
        )
          opacity *= Number(getComputedStyle(e).opacity);
        if (opacity < 0.99)
          out.push(
            `${el.tagName.toLowerCase()} (${opacity.toFixed(2)}): ${el.textContent!.trim().slice(0, 50)}`,
          );
      }
      return out;
    });
    expect(hidden, `${route}: text that prints invisible`).toEqual([]);
  });
}

test('print.css is what makes the difference: reveals are hidden on screen, shown in print', async ({
  page,
}) => {
  // Guards against the spec above passing for the wrong reason (a page with no reveals).
  let found = false;
  for (const route of routes) {
    await page.goto(route, { waitUntil: 'load' });
    const state = await page.evaluate(() => {
      // Under the flow layer (layout.motion flow or fade, card 192) the reveals show at rest and
      // the flow units are the ones waiting on their hidden first frame.
      const waiting = document.documentElement.classList.contains('flow-armed')
        ? '.flow'
        : '[data-reveal]:not(.is-visible)';
      const els = [...document.querySelectorAll<HTMLElement>(waiting)];
      const el = els.find((e) => e.getBoundingClientRect().top > innerHeight);
      if (!el) return null;
      el.dataset.printProbe = '1';
      return Number(getComputedStyle(el).opacity);
    });
    if (state === null) continue;
    expect(state).toBeLessThan(0.5);
    await page.emulateMedia({ media: 'print' });
    const printed = await page.evaluate(() =>
      Number(getComputedStyle(document.querySelector('[data-print-probe]')!).opacity),
    );
    expect(printed).toBe(1);
    found = true;
    break;
  }
  test.skip(!found, 'no route has an unrevealed section below the fold');
});

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test, expect } from '@playwright/test';
import { routes } from './routes';

// =============================================================================
// Reduced motion: once a page has settled, NOTHING is still moving
// =============================================================================
// PORTS.md card 61 (2026-09-30). A visitor who asked for less motion should get
// the final composition, not an animation that merely runs fast. The global
// reset in globals.css makes every animation last 0.01ms and every transition
// 0s under `prefers-reduced-motion: reduce`, so a couple of seconds after the
// page is up, document.getAnimations() should hold nothing that is `running`.
//
// Why this exists: the reset used to give transitions 0.01ms too. With
// `transition-property` defaulting to `all`, that hands EVERY element a
// transition, and WebKit never finishes a 10-microsecond one: fbcm's home page
// held 289 transitions stuck at progress 0, each keeping its property at the
// OLD value, on an iPhone with Reduce Motion on. Chromium finishes them at
// once, so this spec earns its keep on the webkit-iphone project
// (playwright.config.ts adds it there); on chromium it still catches any
// infinite animation that escaped the reset.
//
// `domcontentloaded` then a fixed wait, not 'load': a WebM-first <video> never
// fires `load` in WebKit (smoke.spec.ts). A finished fill-forwards animation is
// still an animation object, which is why the filter is on playState.
// =============================================================================

test.use({ reducedMotion: 'reduce' });

test.describe('Reduced motion: every route settles to still', () => {
  for (const route of routes) {
    test(`${route}: nothing is still running 2.5s after load`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      const running = await page.evaluate(() =>
        document
          .getAnimations()
          .filter((a) => a.playState === 'running')
          .map((a) => {
            const effect = a.effect as KeyframeEffect | null;
            const target = effect?.target as Element | null;
            const named = a as unknown as { animationName?: string; transitionProperty?: string };
            return {
              kind: a.constructor.name,
              name: named.animationName ?? named.transitionProperty ?? a.id,
              target: target
                ? `${target.tagName.toLowerCase()}.${String(target.className).slice(0, 60)}`
                : 'none',
            };
          }),
      );
      expect(
        running,
        `${route}: still running under reduced motion: ${JSON.stringify(running.slice(0, 8))}`,
      ).toEqual([]);
    });
  }
});

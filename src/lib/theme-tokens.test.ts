// Theme-token contrast gate (added 2026-08-27 alongside src/lib/contrast.ts).
//
// WHY: `npm run apply-brand` rewrites the @theme palette in globals.css from
// brand/brand.config.json. Nothing else in the gate chain notices when a new
// project's palette pushes body text under 4.5:1 -- axe audits the resting DOM
// of a built page and has no rule for token pairs, and Lighthouse can sit at
// 100 while a heading is unreadable on its own surface. This test reads the
// real tokens out of globals.css and asserts the pairs the design system
// actually puts on screen, so a bad reskin fails `npm test` before anyone
// looks at a screenshot.
//
// SCOPE: the light @theme block only. Those tokens are plain hex, so the check
// is nearly free. The shadcn :root/.dark overrides are authored in oklch with
// alpha and would need a colour-space conversion to check the same way; that
// is a bigger job and is deliberately NOT attempted here. Dark-mode pairs stay
// covered by the visual pass and a dark axe sweep.
//
// NOT asserted: --color-secondary and --color-border-soft against the paper
// surfaces. Those are hairline dividers and faint rules, not UI component
// boundaries, and they sit near 2:1 by design. Any token used for a FOCUS RING
// or a control edge must be added here with AA_NON_TEXT.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  contrastRatio,
  hexToRgb,
  relativeLuminance,
  flatten,
  rgbToHex,
  AA_BODY_TEXT,
} from './contrast.ts';

const CSS = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'styles', 'globals.css');

/** Pull the hex `--color-*` declarations out of the @theme block. */
function readTokens(): Record<string, string> {
  const css = readFileSync(CSS, 'utf8');
  const tokens: Record<string, string> = {};
  for (const m of css.matchAll(/--(color-[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    tokens[m[1]] = m[2];
  }
  return tokens;
}

const tokens = readTokens();

/** Read a token, failing loudly rather than silently skipping a pair. */
function token(name: string): string {
  const value = tokens[name];
  assert.ok(value, `globals.css @theme is missing --${name}`);
  return value;
}

test('contrast math matches the WCAG reference points', () => {
  assert.equal(contrastRatio('#000000', '#ffffff'), 21);
  assert.equal(contrastRatio('#ffffff', '#ffffff'), 1);
  // Shorthand hex expands.
  assert.equal(contrastRatio('#fff', '#000'), 21);
  // Luminance is symmetric in the ratio, order must not matter.
  assert.equal(contrastRatio('#586577', '#fbfbfa'), contrastRatio('#fbfbfa', '#586577'));
  assert.throws(() => hexToRgb('not-a-colour'));
  assert.ok(relativeLuminance(hexToRgb('#ffffff')) > relativeLuminance(hexToRgb('#000000')));
});

test('flatten composites a translucent colour over its backdrop', () => {
  // White at 12% over near-black is what a dark-theme hairline really is.
  const composited = flatten(hexToRgb('#ffffff'), 0.12, hexToRgb('#000000'));
  assert.equal(rgbToHex(composited), '#1f1f1f');
  // Fully opaque returns the foreground untouched.
  assert.deepEqual(flatten(hexToRgb('#586577'), 1, hexToRgb('#ffffff')), hexToRgb('#586577'));
});

// The pairs the design system actually renders: text tokens on surface tokens.
const TEXT_ON_SURFACE: Array<[string, string]> = [
  ['color-accent', 'color-bg'], // headings + body on paper
  ['color-accent', 'color-bg-soft'], // same on the alternating surface
  ['color-accent-dark', 'color-bg'],
  ['color-primary', 'color-bg'], // primary as body/link colour
  ['color-primary', 'color-bg-soft'],
  ['color-primary-dark', 'color-bg'], // the documented body anchor colour
  ['color-primary-dark', 'color-bg-soft'],
];

for (const [fg, bg] of TEXT_ON_SURFACE) {
  test(`--${fg} on --${bg} meets AA body text`, () => {
    const ratio = contrastRatio(token(fg), token(bg));
    assert.ok(
      ratio >= AA_BODY_TEXT,
      `--${fg} (${token(fg)}) on --${bg} (${token(bg)}) is ${ratio}:1, needs ${AA_BODY_TEXT}:1`,
    );
  });
}

// Reversed-out text: pure white on the dark brand surfaces.
const WHITE_ON_DARK: string[] = ['color-primary-dark', 'color-accent', 'color-accent-dark'];

for (const bg of WHITE_ON_DARK) {
  test(`--color-white-pure on --${bg} meets AA body text`, () => {
    const ratio = contrastRatio(token('color-white-pure'), token(bg));
    assert.ok(
      ratio >= AA_BODY_TEXT,
      `white on --${bg} (${token(bg)}) is ${ratio}:1, needs ${AA_BODY_TEXT}:1`,
    );
  });
}

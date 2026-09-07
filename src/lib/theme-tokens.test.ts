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
// SCOPE: the light brand `@theme` block only, and the reader now genuinely
// enforces that (2026-09-06). It used to be one unscoped `matchAll` for
// `--color-*: #hex` over the whole stylesheet, which keeps whichever
// declaration comes LAST wherever it appears. That was correct only because
// every hex `--color-*` happened to live in the one `@theme` block: a hex
// `--color-*` written into `.dark` would have been picked up, measured, and
// asserted as a LIGHT pair, on a green build. The extraction now comes from
// src/lib/css-tokens.ts, shared with surfaces.test.ts, and the scope premise
// is asserted below rather than assumed.
//
// Light-only remains deliberate, and is NOT a limitation of the reader. The
// shadcn :root/.dark overrides are a different question from the brand
// palette: some are authored in oklch with alpha and would need a colour-space
// conversion, and the pairs a section actually paints with them are already
// measured, in BOTH themes, by src/lib/surfaces.test.ts. This gate stays the
// palette gate. Dark-mode pairs beyond that stay covered by the visual pass
// and a dark axe sweep.
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
import { BRAND_SCOPE, DARK_SCOPE, LIGHT_SCOPE, scopeReader, tokensIn } from './css-tokens.ts';

const CSS = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'styles', 'globals.css');
const css = readFileSync(CSS, 'utf8');

/** The brand palette, and only the brand palette. */
const brand = tokensIn(css, BRAND_SCOPE);
const readBrand = scopeReader(brand);

/** Read a token, failing loudly rather than silently skipping a pair. */
function token(name: string): string {
  assert.ok(brand[`--${name}`], `globals.css @theme is missing --${name}`);
  return readBrand(`--${name}`);
}

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

// Reversed-out text: pure white on the dark brand surfaces.
const WHITE_ON_DARK: string[] = ['color-primary-dark', 'color-accent', 'color-accent-dark'];

/** Every token name this file measures, as declared in the stylesheet. */
const ASSERTED = [
  ...new Set([...TEXT_ON_SURFACE.flat(), ...WHITE_ON_DARK, 'color-white-pure']),
].map((n) => `--${n}`);

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

// ---------------------------------------------------------------------------
// The scope premise. These three do not measure a colour; they assert that the
// reader is looking at the block this gate claims to be looking at. Without
// them the gate can go green while measuring the wrong declaration, which is
// the failure mode it spent its first ten days in.
// ---------------------------------------------------------------------------

test('the brand @theme block is found and holds the palette', () => {
  assert.ok(
    Object.keys(brand).length >= 10,
    `only ${Object.keys(brand).length} tokens found in @theme; the block header may have moved`,
  );
  for (const name of ASSERTED) {
    assert.ok(brand[name], `@theme never declares ${name}`);
  }
});

test('.dark does not redeclare a palette token this gate asserts as light', () => {
  const dark = tokensIn(css, DARK_SCOPE);
  const clashes = ASSERTED.filter((name) => dark[name]);
  assert.deepEqual(
    clashes,
    [],
    `${clashes.join(', ')} is declared in BOTH @theme and .dark. This gate measures the ` +
      `light palette only, so a dark declaration of the same name is either a mistake or a ` +
      `pair that belongs in surfaces.test.ts, which measures both themes. Do not leave it ` +
      `for this file to pick up.`,
  );
});

test('the only later light-scope override of a palette token is the recorded one', () => {
  // `@theme inline` is declared after `@theme` and wins on the page. It
  // deliberately re-points --color-accent at the shadcn semantic --accent so
  // that bg-accent flips with the theme (the reasoning is in globals.css).
  // That means bare text-accent is NOT the palette ink, and this gate asserts
  // the PALETTE value on purpose. Any NEW override shows up here as a failure
  // rather than as a number nobody can explain.
  const light = tokensIn(css, LIGHT_SCOPE);
  const overridden = Object.fromEntries(
    ASSERTED.filter((name) => light[name] !== brand[name]).map((name) => [name, light[name]]),
  );
  assert.deepEqual(overridden, { '--color-accent': 'var(--accent)' });
});

// ---------------------------------------------------------------------------
// The pairs.
// ---------------------------------------------------------------------------

for (const [fg, bg] of TEXT_ON_SURFACE) {
  test(`--${fg} on --${bg} meets AA body text`, () => {
    const ratio = contrastRatio(token(fg), token(bg));
    assert.ok(
      ratio >= AA_BODY_TEXT,
      `--${fg} (${token(fg)}) on --${bg} (${token(bg)}) is ${ratio}:1, needs ${AA_BODY_TEXT}:1`,
    );
  });
}

for (const bg of WHITE_ON_DARK) {
  test(`--color-white-pure on --${bg} meets AA body text`, () => {
    const ratio = contrastRatio(token('color-white-pure'), token(bg));
    assert.ok(
      ratio >= AA_BODY_TEXT,
      `white on --${bg} (${token(bg)}) is ${ratio}:1, needs ${AA_BODY_TEXT}:1`,
    );
  });
}

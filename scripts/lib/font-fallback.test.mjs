// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The metric-matched fallback maths (PORTS.md card 188). Auburn's numbers for Young Serif over
// Georgia were 114.71% / 91.19% / 31.91%, computed with capsize itself; this reproduces them to
// within a quarter of a percent (Georgia within a tenth) from Young Serif's own tables (unitsPerEm 1000, hhea 1046 / -366,
// weighted width 511).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LATIN_WEIGHTS,
  LOCAL_FONTS,
  fallbackMetrics,
  fallbackFamilies,
  fallbackCss,
  weightedAverageWidth,
} from './font-fallback.mjs';

const youngSerif = { upm: 1000, ascent: 1046, descent: -366, lineGap: 0, xWidthAvg: 511 };
const near = (a, b, tol) => assert.ok(Math.abs(parseFloat(a) - b) <= tol, a + ' vs ' + b);

test('the weightings are capsize latin (they sum to about 1)', () => {
  const sum = Object.values(LATIN_WEIGHTS).reduce((a, b) => a + b, 0);
  near(String(sum), 1, 0.02);
});

test('reproduces Auburn Young Serif over Georgia within 0.1%', () => {
  const m = fallbackMetrics(youngSerif, LOCAL_FONTS.georgia);
  near(m.sizeAdjust, 114.71, 0.1);
  near(m.ascentOverride, 91.19, 0.1);
  near(m.descentOverride, 31.91, 0.1);
  assert.equal(m.lineGapOverride, '0%');
});

test('reproduces Auburn Young Serif over Times within 0.25%', () => {
  const m = fallbackMetrics(youngSerif, LOCAL_FONTS.times);
  near(m.sizeAdjust, 125.58, 0.25);
  near(m.ascentOverride, 83.3, 0.25);
  near(m.descentOverride, 29.15, 0.25);
});

test('a monospace font of one width averages to that width', () => {
  assert.equal(
    weightedAverageWidth(() => 600, 600),
    Math.round(600 * Object.values(LATIN_WEIGHTS).reduce((a, b) => a + b, 0)),
  );
});

test('family names and CSS', () => {
  assert.deepEqual(fallbackFamilies('Young Serif', 'serif'), [
    'Young Serif Fallback',
    'Young Serif Fallback Times',
  ]);
  assert.deepEqual(fallbackFamilies('Inter Variable', 'sans-serif'), ['Inter Variable Fallback']);
  const css = fallbackCss('Young Serif', 'serif', youngSerif);
  assert.match(css, /font-family: 'Young Serif Fallback';\n {2}src: local\('Georgia'\);/);
  assert.match(
    css,
    /src: local\('Times New Roman'\), local\('Times'\), local\('Liberation Serif'\), local\('Tinos'\);/,
  );
  // Linux and ChromeOS have no Arial either; its metric twins follow it.
  assert.match(
    fallbackCss('Inter Variable', 'sans-serif', youngSerif),
    /src: local\('Arial'\), local\('Liberation Sans'\), local\('Arimo'\);/,
  );
  assert.equal((css.match(/@font-face/g) || []).length, 2);
});

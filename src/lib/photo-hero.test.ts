// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The photo hero's contrast promise (src/lib/photo-hero.ts, PORTS.md card 189): white words over
// the worst photo there is (pure white) under the stylesheet's own shade, in this site's own scrim
// colour, stay at 4.5:1 or better. Reads src/styles/photo-hero.css and src/styles/globals.css, so a
// reskin or a thinner shade fails here, before an unreadable hero ships.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PHOTO_HERO_MIN_CONTRAST,
  contrast,
  hexToRgb,
  leastShade,
  worstCaseContrast,
} from './photo-hero.ts';

const css = readFileSync(new URL('../styles/photo-hero.css', import.meta.url), 'utf8');
const globals = readFileSync(new URL('../styles/globals.css', import.meta.url), 'utf8');

/** A custom property's value as declared in the photo hero stylesheet. */
function token(name: string): string {
  const m = new RegExp(`${name}:\\s*([^;]+);`).exec(css);
  assert.ok(m, `photo-hero.css declares ${name}`);
  return m[1].trim();
}
const percent = (v: string) => {
  const m = /^(\d+(?:\.\d+)?)%$/.exec(v);
  assert.ok(m, `${v} is a percentage`);
  return Number(m[1]) / 100;
};

/** The scrim colour: a hex, or a var() of a colour token declared in globals.css. */
function scrimHex(): string {
  const v = token('--photo-scrim');
  if (v.startsWith('#')) return v;
  const ref = /^var\((--[\w-]+)\)$/.exec(v);
  assert.ok(ref, `--photo-scrim is a hex or a var(): ${v}`);
  const decl = new RegExp(`${ref[1]}:\\s*(#[0-9a-fA-F]{3,6})\\b`).exec(globals);
  assert.ok(decl, `globals.css declares ${ref[1]} as a hex colour`);
  return decl[1];
}

test('the arithmetic: known WCAG ratios', () => {
  assert.equal(Math.round(contrast(hexToRgb('#fff'), hexToRgb('#000')) * 10) / 10, 21);
  assert.equal(contrast(hexToRgb('#777777'), hexToRgb('#777777')), 1);
  // No shade over a white photo: white on white.
  assert.equal(worstCaseContrast('#000000', 0), 1);
  assert.ok(worstCaseContrast('#000000', 1) > 20);
  assert.ok(leastShade('#000000') > 0.4 && leastShade('#000000') < 0.7);
});

test('white words keep 4.5:1 over a white photo under the shade where they sit', () => {
  const hex = scrimHex();
  const text = percent(token('--photo-scrim-text'));
  const deep = percent(token('--photo-scrim-deep'));
  const ratio = worstCaseContrast(hex, text);
  assert.ok(
    ratio >= PHOTO_HERO_MIN_CONTRAST,
    `scrim ${hex} at ${text * 100}% gives ${ratio.toFixed(2)}:1 over white; ` +
      `raise --photo-scrim-text to at least ${leastShade(hex) * 100}% or darken the scrim`,
  );
  assert.ok(deep >= text, '--photo-scrim-deep is at least --photo-scrim-text');
});

test('the shade is built from the tokens only, and reaches the text strength where words sit', () => {
  // Every .ph-photo__shade rule that paints (the shared position rule sets no background).
  const shades = [...css.matchAll(/(?:^|\n)[ \t]*\.ph-photo__shade\s*\{([^}]*)\}/g)]
    .map((m) => m[1])
    .filter((body) => /background/.test(body));
  assert.ok(shades.length >= 2, 'a wide-screen shade and a phone shade');
  for (const body of shades) {
    assert.doesNotMatch(body, /rgba?\(|#[0-9a-f]{3,6}\b/i, 'no literal colour in a shade');
    assert.match(body, /var\(--photo-scrim-text\)/, 'every shade uses the text strength');
  }
  // Wide screens: the text strength holds to 60% across (the words stay in the left 7/12).
  assert.match(shades[0], /var\(--photo-scrim-text\),\s*transparent\)\s*60%/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*7fr\)\s*minmax\(0,\s*5fr\)/);
  // Phones: the text strength 20px above where the words start (band less 160px).
  assert.match(shades[1], /calc\(var\(--ph-band\) - 180px\)/);
  assert.match(css, /padding-top:\s*calc\(var\(--ph-band\) - 160px\)/);
});

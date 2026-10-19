// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The Studio design language's pure half (card 128): the look resolves, every
// text and marker colour it draws passes contrast in both schemes (for this
// site's brand AND a set of awkward ones), and the guide helpers behave.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { studioColorInput, studioColors, TINTS, type Scale } from './studio-theme.ts';
import { contrastRatio } from './contrast.ts';
import {
  chipKind,
  contrastPairs,
  findGuide,
  guideMeaning,
  inlineParts,
  lookBase,
  lookInput,
  pebblePath,
  resolveLook,
  shotMarks,
  shotSrc,
  stonePath,
} from './studio-look.ts';

const require = createRequire(import.meta.url);
const { color } = require('@sanity/color') as {
  color: Record<string, Record<string, { hex: string }> | { hex: string }>;
};
const hex = (v: unknown) => (v as { hex: string }).hex;
const scaleOf = (hue: unknown) =>
  Object.fromEntries(TINTS.map((t) => [t, hex((hue as Record<string, unknown>)[t])])) as Scale;
const hues = Object.fromEntries(
  Object.entries(color)
    .filter(([, v]) => v && typeof v === 'object' && '500' in v)
    .map(([k, v]) => [k, scaleOf(v)]),
) as Record<string, Scale>;
const stock = {
  blue: hues.blue,
  gray: hues.gray,
  white: hex(color.white),
  black: hex(color.black),
  darkBg: hues.gray['950'],
  hues,
};
const brand = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../brand/brand.config.json', import.meta.url)), 'utf8'),
);

function assertReadable(look: ReturnType<typeof resolveLook>, label: string) {
  for (const scheme of ['light', 'dark'] as const) {
    for (const p of contrastPairs(look[scheme])) {
      const r = contrastRatio(p.fg, p.bg);
      assert.ok(
        r >= p.min - 0.01,
        `${label} ${scheme}: ${p.name} ${p.fg} on ${p.bg} is ${r.toFixed(2)}`,
      );
    }
  }
  assert.ok(contrastRatio(look.banner.ink, look.banner.bg) >= 7, `${label}: banner ink`);
  assert.ok(contrastRatio(look.banner.muted, look.banner.bg) >= 4.5, `${label}: banner muted`);
  assert.ok(contrastRatio(look.banner.accent, look.banner.bg) >= 4.5, `${label}: banner accent`);
  for (const c of look.lettering?.colors ?? [])
    assert.ok(contrastRatio(c, look.banner.bg) >= 3, `${label}: lettering ${c}`);
}

describe('studio look: this site', () => {
  const look = resolveLook(
    lookInput(brand),
    lookBase(studioColors(studioColorInput(brand), stock), brand),
  );
  it('resolves with no ignored inputs', () => assert.deepEqual(look.notes, []));
  it('every token passes contrast (AA text, 3:1 marks) in light and dark', () =>
    assertReadable(look, 'brand'));
});

describe('studio look: the tip callout keeps the brand gold', () => {
  const gold = '#c8962e';
  const look = resolveLook({ tones: { tip: gold } }, lookBase(studioColors({}, stock), {}));
  it('fills the marker with the gold itself, light and dark, not a darkened brown', () => {
    assert.equal(look.light.tones.tip.fill, gold);
    assert.equal(look.dark.tones.tip.fill, gold);
  });
  it('outlines it at 3:1 (AA for graphics) on the callout ground', () => {
    for (const t of [look.light, look.dark])
      assert.ok(contrastRatio(t.tones.tip.mark, t.tones.tip.bg) >= 3, 'tip outline');
  });
});

describe('studio look: awkward brands still read', () => {
  const awkward = ['#E8C547', '#C9D8C5', '#000000', '#808080', '#D62828', '#1D4ED8'];
  for (const accent of awkward) {
    it(accent, () => {
      const colors = studioColors({ accent, chrome: accent, lightBackground: '#FFFFFF' }, stock);
      const look = resolveLook(
        {
          markColors: [accent, '#F4E04D', '#FFFFFF'],
          tones: { note: '#BFE0FF', tip: '#FFE58A', careful: '#FF8A80' },
          connector: { kind: 'dashes', color: '#F4E04D' },
          markerColor: '#FFF4B0',
          lettering: { family: 'X', src: '/x.woff2', colors: ['#FFFFFF', '#111111'] },
        },
        lookBase(colors, {}),
      );
      assertReadable(look, accent);
    });
  }
});

describe('studio look: inputs', () => {
  const base = lookBase(studioColors({}, stock), {});
  it('neutral defaults', () => {
    const l = resolveLook(undefined, base);
    assert.equal(l.marker, 'dot');
    assert.equal(l.stone, 'round');
    assert.equal(l.connector, 'line');
    assert.equal(l.motion, 'draw');
    assert.equal(l.texture, undefined);
  });
  it('bad values fall back with a note', () => {
    const l = resolveLook(
      { marker: 'star' as never, stone: 'blob' as never, motif: 'http://x' },
      base,
    );
    assert.equal(l.marker, 'dot');
    assert.equal(l.stone, 'round');
    assert.equal(l.motif, undefined);
    assert.equal(l.notes.length, 2);
  });
  it('marker art needs a public path and a size', () => {
    assert.deepEqual(
      resolveLook({ marker: { src: '/m.svg', width: 78, height: 36 } }, base).marker,
      {
        src: '/m.svg',
        width: 78,
        height: 36,
      },
    );
    assert.equal(
      resolveLook({ marker: { src: '//evil/m.svg', width: 1, height: 1 } }, base).marker,
      'dot',
    );
  });
});

describe('stones', () => {
  it('a pebble is the same every time and stays in its box', () => {
    assert.equal(pebblePath(3, 44, 40), pebblePath(3, 44, 40));
    assert.notEqual(pebblePath(3, 44, 40), pebblePath(4, 44, 40));
    const nums = pebblePath(9, 44, 40)
      .match(/-?\d+(\.\d+)?/g)!
      .map(Number);
    assert.ok(nums.every((n) => n >= 0 && n <= 44));
  });
  it('every shape draws a closed path', () => {
    for (const s of ['pebble', 'round', 'square', 'lozenge'] as const)
      assert.match(stonePath(s, 1, 40, 36), /^M.*Z$/);
  });
});

describe('guide helpers', () => {
  it('icon names map to meanings; emoji and typos fall back', () => {
    assert.equal(guideMeaning('blocks'), 'sections');
    assert.equal(guideMeaning('times'), 'times');
    assert.equal(guideMeaning('👋'), 'guide');
    assert.equal(guideMeaning(undefined), 'guide');
  });
  it('inline marks', () => {
    assert.deepEqual(inlineParts('Click `Publish`, **then** wait _a bit_. snake_case_ok'), [
      { kind: 'text', text: 'Click ' },
      { kind: 'button', text: 'Publish' },
      { kind: 'text', text: ', ' },
      { kind: 'bold', text: 'then' },
      { kind: 'text', text: ' wait ' },
      { kind: 'aside', text: 'a bit' },
      { kind: 'text', text: '. snake_case_ok' },
    ]);
  });
  it('button names draw as the real button', () => {
    assert.equal(chipKind('Publish'), 'publish');
    assert.equal(chipKind('Discard changes'), 'critical');
    assert.equal(chipKind('Live preview'), 'tool');
    assert.equal(chipKind('+ Add item'), 'button');
  });
  it('see also finds a guide by title or slug', () => {
    const g = [{ slug: 'a', title: 'Change the words on a page' }];
    assert.equal(findGuide(g, 'change the words on a page ')?.slug, 'a');
    assert.equal(findGuide(g, 'a')?.slug, 'a');
    assert.equal(findGuide(g, 'nope'), undefined);
  });
  it('shot marks are clamped and numbered; bad kinds dropped', () => {
    assert.deepEqual(
      shotMarks([
        { kind: 'stone', x: 120, y: -4 },
        { kind: 'ring', x: 90, y: 10, w: 30, h: 5 },
        { kind: 'blob' },
        { kind: 'stone', x: 5, y: 5 },
      ]),
      [
        { kind: 'stone', x: 100, y: 0, n: 1, label: undefined },
        { kind: 'ring', x: 90, y: 10, w: 10, h: 5, label: undefined },
        { kind: 'stone', x: 5, y: 5, n: 2, label: undefined },
      ],
    );
    assert.equal(shotSrc('/guides/a.png'), '/guides/a.png');
    assert.equal(shotSrc('https://x.test/a.png'), 'https://x.test/a.png');
    assert.equal(shotSrc('javascript:alert(1)'), null);
    assert.equal(shotSrc('//x/a.png'), null);
  });
});

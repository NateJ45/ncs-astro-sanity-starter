// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The Studio colour gate (PORTS.md card 110). Two halves:
//   1. The pure guard in studio-theme.ts holds for awkward brand colours
//      (pale gold, near-white sage, pure black, grey, an oklch value).
//   2. THIS site's brand.config.json, put through @sanity/ui's real
//      buildTheme(), gives primary buttons and links that read at AA in BOTH
//      schemes, backgrounds that are the site's own, and status colours that
//      are exactly Sanity's. A reskin that breaks any of it fails test:unit.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AA_BODY_TEXT, AA_NON_TEXT, contrastRatio } from './contrast.ts';
import {
  accentScale,
  buttonContrast,
  hexToHsl,
  studioColorInput,
  studioColors,
  TINTS,
  type Scale,
} from './studio-theme.ts';

const require = createRequire(import.meta.url);
const { color } = require('@sanity/color') as {
  color: Record<string, Record<string, { hex: string }> | { hex: string }>;
};
const hex = (v: unknown) => (v as { hex: string }).hex;
const stock = {
  blue: Object.fromEntries(
    TINTS.map((t) => [t, hex((color.blue as Record<string, unknown>)[t])]),
  ) as Scale,
  white: hex(color.white),
  black: hex(color.black),
};

const brand = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../brand/brand.config.json', import.meta.url)), 'utf8'),
);

describe('studioColors: the guard', () => {
  const awkward = ['#E8C547', '#C9D8C5', '#000000', '#808080', '#586577', '#D62828', '#1D4ED8'];
  for (const accent of awkward) {
    it(`${accent}: primary buttons read at AA in both schemes`, () => {
      const out = studioColors(
        { accent, lightBackground: '#FBFBFA', darkBackground: '#17191C' },
        stock,
      );
      const c = buttonContrast(out);
      assert.ok(c.light >= AA_BODY_TEXT, `light ${c.light}`);
      assert.ok(c.dark >= AA_BODY_TEXT, `dark ${c.dark}`);
    });
  }

  it('keeps the brand hue', () => {
    const scale = accentScale('#2E7D32', stock.blue);
    const h = hexToHsl(scale['500']).h;
    assert.ok(Math.abs(h - hexToHsl('#2E7D32').h) < 4, `hue drifted to ${h}`);
  });

  it('steps run light to dark like Sanity’s own', () => {
    const scale = accentScale('#7A3E9D', stock.blue);
    for (let i = 1; i < TINTS.length; i += 1) {
      assert.ok(
        contrastRatio(scale[TINTS[i]], '#ffffff') >= contrastRatio(scale[TINTS[i - 1]], '#ffffff'),
        `${TINTS[i]} is lighter than ${TINTS[i - 1]}`,
      );
    }
  });

  it('falls back to Sanity’s own for anything it cannot use, and says so', () => {
    const out = studioColors(
      {
        accent: 'oklch(0.6 0.1 200)',
        lightBackground: '#777777',
        darkBackground: '#EEEEEE',
      },
      stock,
    );
    assert.deepEqual(out.accent, stock.blue);
    assert.equal(out.white, stock.white);
    assert.equal(out.black, stock.black);
    assert.equal(out.notes.length, 3);
    assert.ok(out.notes.every((n) => n.includes("Sanity's own")));
  });

  it('reads studio.accent before the site primary', () => {
    assert.equal(
      studioColorInput({
        studio: { accent: '#123456' },
        palette: { light: { '--primary': '#abcdef' } },
      }).accent,
      '#123456',
    );
    assert.equal(studioColorInput({}).accent, null);
  });
});

describe('the Studio theme, rendered by @sanity/ui', async () => {
  const { buildTheme } = await import('@sanity/ui/theme');
  const stockTheme = buildTheme();
  const cases: [string, ReturnType<typeof studioColorInput>][] = [
    ["this site's brand.config.json", studioColorInput(brand)],
    [
      'a pale gold on cream',
      { accent: '#E8C547', lightBackground: '#FAF7F0', darkBackground: '#141414' },
    ],
    [
      'a near-white sage',
      { accent: '#C9D8C5', lightBackground: '#FBFBFA', darkBackground: '#17191C' },
    ],
    ['a pastel pink', { accent: '#F4A3B5', lightBackground: '#FFFFFF', darkBackground: '#101010' }],
  ];

  for (const [name, input] of cases) {
    const colors = studioColors(input, stock);
    const theme = buildTheme({
      palette: {
        ...(color as object),
        white: colors.white,
        black: colors.black,
        blue: colors.accent,
      },
      color: { base: { default: { bg: ['white', 'black'] } } },
    } as never);

    for (const scheme of ['light', 'dark'] as const) {
      const card = theme.v2!.color[scheme].default;
      const button = card.button.default.primary.enabled;
      const label = `${name}, ${scheme}`;

      it(`${label}: the primary button label reads at AA`, () => {
        const r = contrastRatio(button.bg, button.fg);
        assert.ok(r >= AA_BODY_TEXT, `${button.fg} on ${button.bg} is ${r}:1`);
      });

      it(`${label}: links read at AA on the page`, () => {
        const r = contrastRatio(card.link.fg, card.bg);
        assert.ok(r >= AA_BODY_TEXT, `${card.link.fg} on ${card.bg} is ${r}:1`);
      });

      it(`${label}: the focus ring is visible`, () => {
        const r = contrastRatio(card.focusRing, card.bg);
        assert.ok(r >= AA_NON_TEXT, `${card.focusRing} on ${card.bg} is ${r}:1`);
      });

      it(`${label}: the page background is the one studioColors chose`, () => {
        const expected = scheme === 'light' ? colors.white : colors.black;
        assert.equal(card.bg.toLowerCase(), expected.toLowerCase());
      });

      it(`${label}: status tones keep Sanity's hues (green, amber, red)`, () => {
        for (const tone of ['positive', 'caution', 'critical'] as const) {
          const ours = hexToHsl(theme.v2!.color[scheme][tone].button.default[tone].enabled.bg).h;
          const theirs = hexToHsl(
            stockTheme.v2!.color[scheme][tone].button.default[tone].enabled.bg,
          ).h;
          assert.ok(Math.abs(ours - theirs) < 12, `${tone}: hue ${ours} vs Sanity ${theirs}`);
        }
      });
    }
  }
});

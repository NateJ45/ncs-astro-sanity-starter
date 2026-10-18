// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The Studio colour gate (PORTS.md cards 110 and 116). Three parts:
//   1. The pure guard in studio-theme.ts holds for awkward brand colours
//      (pale gold, near-white sage, pure black, grey, an oklch value), and the
//      paper, greys, navbar colour, radius and heading weight come out right.
//   2. THIS site's brand.config.json, put through @sanity/ui's real
//      buildTheme() the way src/sanity/studioTheme.ts does it, gives readable
//      text, muted text, links, focus rings and solid buttons in EVERY tone
//      (default, primary, positive, caution, critical) in BOTH schemes, on the
//      Studio and on the navbar, and status hues that are Sanity's own.
//   3. src/sanity/studioFonts.css loads every font file the brand names.
// A reskin that breaks any of it fails test:unit.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AA_BODY_TEXT,
  AA_NON_TEXT,
  contrastRatio,
  hexToRgb,
  relativeLuminance,
} from './contrast.ts';
import {
  accentScale,
  buttonContrast,
  CHROME_COLOR_TOKENS,
  CHROME_MIN_CONTRAST,
  chromePaletteOverrides,
  displayWeight,
  hexToHsl,
  MAX_GRAY_CHROMA,
  mix,
  PAPER_WARMTH,
  paletteOverrides,
  STUDIO_COLOR_TOKENS,
  studioColorInput,
  studioColors,
  studioRadius,
  TINTS,
  tintedGray,
  WARM_PAPER,
  type Scale,
} from './studio-theme.ts';

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
const lum = (c: string) => relativeLuminance(hexToRgb(c));

const root = new URL('../../', import.meta.url);
const brand = JSON.parse(
  readFileSync(fileURLToPath(new URL('brand/brand.config.json', root)), 'utf8'),
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

    it(`${accent} as the navbar colour: white text reads at ${CHROME_MIN_CONTRAST}:1`, () => {
      const out = studioColors({ accent, chrome: accent }, stock);
      const r = contrastRatio(out.chrome.bg, '#ffffff');
      assert.ok(r >= CHROME_MIN_CONTRAST, `${out.chrome.bg}: ${r}`);
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

  it('falls back for anything it cannot use, and says so', () => {
    const out = studioColors(
      {
        accent: 'oklch(0.6 0.1 200)',
        lightBackground: '#777777',
        darkBackground: '#EEEEEE',
        chrome: 'navy',
      },
      stock,
    );
    assert.deepEqual(out.accent, stock.blue);
    assert.equal(out.white, mix(stock.white, WARM_PAPER, PAPER_WARMTH));
    assert.equal(out.black, stock.black);
    assert.equal(out.chrome.bg, stock.gray['900']);
    assert.equal(out.notes.length, 4);
    assert.ok(out.notes[0].includes('warmed'));
    assert.ok(
      out.notes.slice(1).every((n) => n.includes("Sanity's own")),
      out.notes.join('\n'),
    );
  });

  it('uses studio.paper when it is light enough, and warms the site background when not set', () => {
    assert.equal(studioColors({ paper: '#F5F0E6' }, stock).white, '#f5f0e6');
    assert.equal(
      studioColors({ paper: '#333333', lightBackground: '#FFFFFF' }, stock).white,
      mix('#ffffff', WARM_PAPER, PAPER_WARMTH),
    );
  });

  it('re-hues the greys without moving their luminance, and keeps them grey', () => {
    const gray = tintedGray(stock.gray, '#F8F5ED', '#141823');
    for (const t of TINTS) {
      const want = lum(stock.gray[t]);
      assert.ok(Math.abs(lum(gray[t]) - want) <= want * 0.03 + 0.002, `${t}: ${gray[t]}`);
      const { s, l } = hexToHsl(gray[t]);
      const chroma = (1 - Math.abs(2 * l - 1)) * s;
      assert.ok(chroma <= MAX_GRAY_CHROMA + 0.01, `${t}: ${gray[t]} chroma ${chroma}`);
    }
  });

  it('reads studio.accent, paper and chrome before the site palette', () => {
    const input = studioColorInput({
      studio: { accent: '#123456', paper: '#FAF6EE', chrome: '#0B2545' },
      palette: { theme: { '--color-primary-dark': '#222222' }, light: { '--primary': '#abcdef' } },
    });
    assert.equal(input.accent, '#123456');
    assert.equal(input.paper, '#FAF6EE');
    assert.equal(input.chrome, '#0B2545');
    assert.equal(
      studioColorInput({ palette: { theme: { '--color-primary-dark': '#222222' } } }).chrome,
      '#222222',
    );
    assert.equal(
      studioColorInput({ palette: { light: { '--primary': '#abcdef' } } }).chrome,
      '#abcdef',
    );
    assert.equal(studioColorInput({}).accent, null);
  });

  it('scales the radius from the brand, and ignores what it cannot read', () => {
    const base = [0, 1, 3, 6, 9, 12, 21];
    assert.deepEqual(studioRadius('0.5rem', base), base);
    assert.deepEqual(studioRadius('16px', base), [0, 2, 6, 12, 18, 24, 42]);
    assert.deepEqual(studioRadius('100px', base), studioRadius('16px', base));
    assert.deepEqual(studioRadius('var(--x)', base), base);
  });

  it('never asks a display face for a weight it does not ship', () => {
    assert.equal(displayWeight(['@fontsource/young-serif/400.css']), 400);
    assert.equal(
      displayWeight([
        '@fontsource/libre-baskerville/400.css',
        '@fontsource/libre-baskerville/700.css',
      ]),
      700,
    );
    assert.equal(displayWeight(['@fontsource-variable/fraunces']), null);
    assert.equal(displayWeight([]), null);
    assert.equal(displayWeight(undefined), null);
  });
});

describe('the Studio theme, rendered by @sanity/ui', async () => {
  const { buildTheme } = await import('@sanity/ui/theme');
  const stockTheme = buildTheme();
  const cases: [string, ReturnType<typeof studioColorInput>][] = [
    ["this site's brand.config.json", studioColorInput(brand)],
    [
      'a pale gold on cream',
      {
        accent: '#E8C547',
        lightBackground: '#FAF7F0',
        darkBackground: '#141414',
        chrome: '#E8C547',
      },
    ],
    [
      'a near-white sage',
      {
        accent: '#C9D8C5',
        lightBackground: '#FBFBFA',
        darkBackground: '#17191C',
        chrome: '#C9D8C5',
      },
    ],
    [
      'a pastel pink',
      {
        accent: '#F4A3B5',
        lightBackground: '#FFFFFF',
        darkBackground: '#101010',
        chrome: '#7A1F3D',
      },
    ],
  ];
  const TONES = ['default', 'primary', 'positive', 'caution', 'critical'] as const;
  type Card = ReturnType<typeof buildTheme>['v2'] extends infer V
    ? V extends { color: { light: { default: infer C } } }
      ? C
      : never
    : never;
  const ratio = (fg: string, bg: string) => contrastRatio(fg, bg);
  // A Studio token may sit a little under Sanity's own where Sanity itself is
  // under AA (the paper is not pure white), never more than 10% under it.
  const floor = (stockRatio: number) => Math.min(AA_BODY_TEXT, stockRatio * 0.9);

  for (const [name, input] of cases) {
    const colors = studioColors(input, stock);
    const theme = buildTheme({
      palette: { ...(color as object), ...paletteOverrides(colors) },
      color: STUDIO_COLOR_TOKENS,
    } as never);
    const chrome = buildTheme({
      palette: { ...(color as object), ...chromePaletteOverrides(colors.chrome) },
      color: CHROME_COLOR_TOKENS,
    } as never);

    for (const scheme of ['light', 'dark'] as const) {
      const card = theme.v2!.color[scheme].default;
      const label = `${name}, ${scheme}`;

      it(`${label}: the page background is the one studioColors chose`, () => {
        const expected = scheme === 'light' ? colors.white : colors.black;
        assert.equal(card.bg.toLowerCase(), expected.toLowerCase());
      });

      it(`${label}: links read at AA and the focus ring is visible`, () => {
        assert.ok(ratio(card.link.fg, card.bg) >= AA_BODY_TEXT, `link ${card.link.fg}`);
        assert.ok(ratio(card.focusRing, card.bg) >= AA_NON_TEXT, `ring ${card.focusRing}`);
      });

      for (const tone of TONES) {
        const ours = theme.v2!.color[scheme][tone] as Card;
        const theirs = stockTheme.v2!.color[scheme][tone] as Card;
        const button = tone === 'default' ? 'primary' : tone;

        it(`${label}, ${tone}: text, muted text and the solid button read`, () => {
          assert.ok(ratio(ours.fg, ours.bg) >= AA_BODY_TEXT, `text ${ours.fg} on ${ours.bg}`);
          const muted = ratio(ours.muted.fg, ours.bg);
          assert.ok(muted >= floor(ratio(theirs.muted.fg, theirs.bg)), `muted ${muted}`);
          const b = ours.button.default[button].enabled;
          assert.ok(ratio(b.fg, b.bg) >= AA_BODY_TEXT, `${button} button ${b.fg} on ${b.bg}`);
        });
      }

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

    // The navbar is always drawn in the chrome theme's dark scheme.
    const bar = chrome.v2!.color.dark.default as Card;
    it(`${name}, navbar: on the chrome colour, white text at ${CHROME_MIN_CONTRAST}:1`, () => {
      assert.equal(bar.bg.toLowerCase(), colors.chrome.bg.toLowerCase());
      assert.ok(ratio(bar.fg, bar.bg) >= CHROME_MIN_CONTRAST, `${bar.fg} on ${bar.bg}`);
    });

    it(`${name}, navbar: hover and selection are visible, the focus ring too`, () => {
      const bleed = bar.button.bleed.default;
      assert.notEqual(bleed.hovered.bg, bar.bg);
      assert.notEqual(bleed.selected.bg, bar.bg);
      assert.ok(ratio(bleed.selected.fg, bleed.selected.bg) >= AA_BODY_TEXT);
      assert.ok(ratio(bar.focusRing, bar.bg) >= AA_NON_TEXT, `ring ${bar.focusRing}`);
    });

    for (const tone of TONES) {
      it(`${name}, navbar, ${tone}: text, muted text and the solid button read`, () => {
        const c = chrome.v2!.color.dark[tone] as Card;
        assert.ok(ratio(c.fg, c.bg) >= AA_BODY_TEXT, `text ${c.fg} on ${c.bg}`);
        assert.ok(ratio(c.muted.fg, c.bg) >= AA_BODY_TEXT, `muted ${c.muted.fg} on ${c.bg}`);
        const b = c.button.default[tone === 'default' ? 'primary' : tone].enabled;
        assert.ok(ratio(b.fg, b.bg) >= AA_BODY_TEXT, `button ${b.fg} on ${b.bg}`);
      });
    }
  }
});

describe('the Studio loads the brand fonts', () => {
  it('src/sanity/studioFonts.css imports every display and body font file', () => {
    const css = readFileSync(fileURLToPath(new URL('src/sanity/studioFonts.css', root)), 'utf8');
    const wanted: string[] = [
      ...(brand.fonts?.display?.imports ?? []),
      ...(brand.fonts?.body?.imports ?? []),
    ];
    for (const i of wanted) {
      assert.ok(css.includes(`@import '${i}';`), `missing ${i}: run npm run apply-brand`);
    }
  });
});

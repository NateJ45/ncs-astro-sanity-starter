// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// Metric-matched fallback fonts (PORTS.md card 188, from FBC Auburn 2026-10-26)
// =============================================================================
// While a web font loads, the browser draws the text in a local font. If that
// local font is wider or taller than the real one, a title breaks onto a
// different number of lines and the page jumps when the real font arrives
// (layout shift; Auburn measured about 0.05 CLS on five inner pages from page
// titles alone). The cure is an @font-face that points at a LOCAL font and
// scales it to the web font's average letter width and line metrics, so the
// fallback title breaks where the real one will.
//
// The maths is capsize's (https://seek-oss.github.io/capsize/): the average
// advance width weighted by English letter frequency (capsize's own "latin"
// table, copied below), then
//   size-adjust      = (webAvg / webUpm) / (localAvg / localUpm)
//   ascent-override  = webAscent  / webUpm / sizeAdjust
//   descent-override = |webDescent| / webUpm / sizeAdjust
//   line-gap-override = webLineGap / webUpm / sizeAdjust
// Pure functions only; scripts/font-fallback.mjs reads the font files.

/** capsize's latin letter weightings (@capsizecss/unpack 4.0.1, src/weightings.ts). */
export const LATIN_WEIGHTS = {
  0: 0.0053,
  1: 0.0023,
  2: 0.0026,
  3: 0.001,
  4: 0.0008,
  5: 0.0015,
  6: 0.0007,
  7: 0.0005,
  8: 0.0007,
  9: 0.0006,
  ',': 0.0083,
  ' ': 0.154,
  t: 0.0672,
  h: 0.0351,
  e: 0.0922,
  o: 0.0571,
  f: 0.017,
  P: 0.0023,
  p: 0.0163,
  l: 0.0304,
  "'": 0.0014,
  s: 0.0469,
  R: 0.0015,
  u: 0.0207,
  b: 0.0114,
  i: 0.0588,
  c: 0.0232,
  C: 0.0031,
  n: 0.0578,
  a: 0.0668,
  d: 0.0298,
  y: 0.0123,
  w: 0.011,
  B: 0.002,
  r: 0.0526,
  z: 0.0011,
  G: 0.0011,
  j: 0.0009,
  T: 0.0041,
  '.': 0.0079,
  L: 0.0012,
  k: 0.0046,
  m: 0.0181,
  ']': 0.0007,
  J: 0.0009,
  F: 0.0015,
  v: 0.0076,
  g: 0.0155,
  A: 0.004,
  N: 0.0014,
  '-': 0.0018,
  H: 0.0013,
  D: 0.0013,
  M: 0.0025,
  I: 0.0022,
  E: 0.0011,
  '"': 0.0012,
  S: 0.0041,
  '(': 0.001,
  ')': 0.001,
  x: 0.0025,
  W: 0.0012,
  Q: 0.0001,
  Y: 0.0003,
  q: 0.0008,
  V: 0.0005,
  á: 0.0001,
  K: 0.0007,
  U: 0.0016,
  '=': 0.0007,
  '[': 0.0021,
  O: 0.0009,
  é: 0.0001,
  $: 0.0002,
  ':': 0.0008,
  '|': 0.0038,
  '/': 0.0001,
  '%': 0.0001,
  Z: 0.0002,
  ';': 0.0001,
  X: 0.0001,
};

/**
 * The local fonts a fallback can point at, measured once from the Windows
 * copies (hhea ascent / descent / lineGap, unitsPerEm, and the weighted average
 * width from LATIN_WEIGHTS). macOS and iOS ship the same Georgia, Times and Arial
 * metrics. Android ships none of them, so it falls through to plain serif or
 * sans-serif, as it did before.
 */
export const LOCAL_FONTS = {
  georgia: {
    local: ["local('Georgia')"],
    upm: 2048,
    ascent: 1878,
    descent: -449,
    lineGap: 0,
    xWidthAvg: 913,
  },
  times: {
    local: ["local('Times New Roman')", "local('Times')"],
    upm: 2048,
    ascent: 1825,
    descent: -443,
    lineGap: 87,
    xWidthAvg: 832,
  },
  arial: {
    local: ["local('Arial')"],
    upm: 2048,
    ascent: 1854,
    descent: -434,
    lineGap: 67,
    xWidthAvg: 913,
  },
};

/** Which local fonts stand in for a web font, by its generic family. */
export const STAND_INS = { serif: ['georgia', 'times'], 'sans-serif': ['arial'] };

/**
 * Weighted average advance width of a font.
 * @param {(ch: string) => number | undefined} advanceOf advance width of one character, in font units
 * @param {number} fallbackWidth used for a character the font has no glyph for (OS/2 xAvgCharWidth)
 */
export function weightedAverageWidth(advanceOf, fallbackWidth) {
  let sum = 0;
  for (const [ch, w] of Object.entries(LATIN_WEIGHTS)) sum += (advanceOf(ch) ?? fallbackWidth) * w;
  return Math.round(sum);
}

const pct = (n) => String(Math.round(n * 10000) / 100) + '%';

/**
 * The override descriptors for one web font over one local font.
 * @param {{upm:number, ascent:number, descent:number, lineGap:number, xWidthAvg:number}} web
 * @param {{upm:number, xWidthAvg:number}} local
 */
export function fallbackMetrics(web, local) {
  const sizeAdjust = web.xWidthAvg / web.upm / (local.xWidthAvg / local.upm);
  return {
    sizeAdjust: pct(sizeAdjust),
    ascentOverride: pct(web.ascent / web.upm / sizeAdjust),
    descentOverride: pct(Math.abs(web.descent) / web.upm / sizeAdjust),
    lineGapOverride: pct(web.lineGap / web.upm / sizeAdjust),
  };
}

/** The family names a fallback face is published under: "<Family> Fallback", then "<Family> Fallback Times". */
export function fallbackFamilies(family, generic) {
  return (STAND_INS[generic] ?? STAND_INS.serif).map((key, i) =>
    i === 0 ? family + ' Fallback' : family + ' Fallback ' + key[0].toUpperCase() + key.slice(1),
  );
}

/** The @font-face blocks for one web font, as CSS text. */
export function fallbackCss(family, generic, web) {
  const names = fallbackFamilies(family, generic);
  return (STAND_INS[generic] ?? STAND_INS.serif)
    .map((key, i) => {
      const local = LOCAL_FONTS[key];
      const m = fallbackMetrics(web, local);
      return [
        '@font-face {',
        "  font-family: '" + names[i] + "';",
        '  src: ' + local.local.join(', ') + ';',
        '  size-adjust: ' + m.sizeAdjust + ';',
        '  ascent-override: ' + m.ascentOverride + ';',
        '  descent-override: ' + m.descentOverride + ';',
        '  line-gap-override: ' + m.lineGapOverride + ';',
        '}',
      ].join('\n');
    })
    .join('\n');
}

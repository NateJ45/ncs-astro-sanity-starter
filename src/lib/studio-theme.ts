// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// The Studio's colours from the brand (PORTS.md cards 110 and 116)
// =============================================================================
// Pure maths, no Sanity imports, so it is unit tested in plain Node
// (studio-theme.test.ts). src/sanity/studioTheme.ts feeds the result into
// @sanity/ui's own buildTheme({ palette }), which is already in the matched
// set (rule 8). (@sanity/themer installs since card 112, but sites do not
// carry it, and nothing here needs it.)
//
// WHAT IT CHANGES, AND WHAT IT LEAVES ALONE (the "calm rule"):
//   - The ACCENT: Sanity's blue scale (primary buttons, links, focus rings,
//     the selected list row) becomes a scale in the brand's hue.
//   - The BACKGROUNDS: palette white becomes a warm PAPER (studio.paper, else
//     the site's light background warmed toward cream; card 116), palette
//     black the site's own dark background.
//   - The GREYS (card 116): Sanity's cool grey scale takes the paper's hue on
//     its light steps and the dark background's hue on its dark steps, each
//     step as luminous as Sanity's own, so borders and muted text read the same.
//   - The CHROME (card 116): the navbar gets its own dark theme on the brand's
//     deep colour (studio.chrome, else --color-primary-dark, else --primary).
//   - Nothing else. Green stays "published", amber stays "draft", red stays
//     "danger" on every client's Studio, because we support all of them.
//
// THE CONTRAST GUARD. The brand colour gives the scale its hue and
// saturation only. Each step's lightness is solved so its luminance matches
// Sanity's own tuned blue step, so a pale sage or a gold primary still gives
// readable buttons. On top of that, the two steps that carry button labels
// (500 under white text in light mode, 400 under dark text in dark mode) are
// pushed until the label reaches WCAG AA 4.5:1. A background that is not
// light enough (or dark enough) falls back, with a note. The navbar colour is
// darkened until white text on it reaches 8:1.
// =============================================================================

import { AA_BODY_TEXT, contrastRatio, hexToRgb, relativeLuminance, rgbToHex } from './contrast.ts';

export const TINTS = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950',
] as const;
export type Tint = (typeof TINTS)[number];
export type Scale = Record<Tint, string>;

export interface StudioColorInput {
  /** The brand accent (brand.config.json studio.accent, else palette.light --primary). */
  accent?: string | null;
  /** palette.light --background */
  lightBackground?: string | null;
  /** palette.dark --background */
  darkBackground?: string | null;
  /** The light scheme's page colour (studio.paper). Unset: the light background, warmed. */
  paper?: string | null;
  /** The navbar colour (studio.chrome, else palette.theme --color-primary-dark, else --primary). */
  chrome?: string | null;
}

export interface StockColors {
  /** Sanity's blue scale, the one the accent replaces. */
  blue: Scale;
  /** Sanity's grey scale, the one the tinted greys replace. */
  gray: Scale;
  white: string;
  black: string;
  /** The background Sanity's dark scheme is tuned for (its gray 950). Defaults to gray['950']. */
  darkBg?: string;
  /** Every other hue (red, green, yellow, ...), so the navbar theme can re-ladder them. */
  hues?: Record<string, Scale>;
}

export interface ChromeColors {
  /** The navbar background: palette black in the chrome theme. */
  bg: string;
  /**
   * Every hue re-laddered for `bg`: `blue` is the accent, `gray` takes the chrome's
   * hue, the status hues keep Sanity's. Each step sits at the contrast against `bg`
   * that Sanity's own step has against its dark background.
   */
  palette: Record<string, Scale>;
}

export interface StudioColors {
  /** Replaces the `blue` hue in the palette. */
  accent: Scale;
  /** Palette white: the light scheme's page background (the paper). */
  white: string;
  /** Palette black: the dark scheme's page background. */
  black: string;
  /** Replaces the `gray` hue: Sanity's luminances in the paper's and dark background's hues. */
  gray: Scale;
  /** The navbar's own palette (a dark scheme on the brand's deep colour). */
  chrome: ChromeColors;
  /** Which inputs were used as given and which fell back. One line each. */
  notes: string[];
}

/** A light background must be at least this luminous to stand in for white. */
export const MIN_LIGHT_BG_LUMINANCE = 0.8;
/** A dark background must be at most this luminous to stand in for black. */
export const MAX_DARK_BG_LUMINANCE = 0.03;
/** The cream a background is warmed toward when there is no studio.paper. */
export const WARM_PAPER = '#F4EEE1';
/** How far toward WARM_PAPER (0 keeps the site's background, 1 is WARM_PAPER itself). */
export const PAPER_WARMTH = 0.6;
/** White text on the navbar reads at least this well (past AAA's 7:1, so the tinted
 * release-perspective navbars keep readable muted text too). */
export const CHROME_MIN_CONTRAST = 8;
/** Grey tints stay this subtle: an HSL saturation cap, then a chroma cap. */
export const MAX_GRAY_SATURATION = 0.35;
export const MAX_GRAY_CHROMA = 0.045;

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
export const isHex = (v: unknown): v is string => typeof v === 'string' && HEX.test(v.trim());

// -----------------------------------------------------------------------------
// HSL, enough of it to hold a hue while moving the lightness
// -----------------------------------------------------------------------------

interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function hexToHsl(hex: string): Hsl {
  const { r, g, b } = hexToRgb(hex);
  const [rr, gg, bb] = [r / 255, g / 255, b / 255];
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rr) h = (gg - bb) / d + (gg < bb ? 6 : 0);
  else if (max === gg) h = (bb - rr) / d + 2;
  else h = (rr - gg) / d + 4;
  return { h: h * 60, s, l };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  const to = (v: number) => Math.max(0, Math.min(255, Math.round((v + m) * 255)));
  return rgbToHex({ r: to(r), g: to(g), b: to(b) });
}

const lum = (hex: string) => relativeLuminance(hexToRgb(hex));

/** The colour with this hue and saturation whose luminance is closest to `target`. */
export function withLuminance(hex: string, target: number): string {
  const { h, s } = hexToHsl(hex);
  return withLuminanceHs(h, s, target);
}

function withLuminanceHs(h: number, s: number, target: number): string {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 32; i += 1) {
    const mid = (lo + hi) / 2;
    if (lum(hslToHex({ h, s, l: mid })) < target) lo = mid;
    else hi = mid;
  }
  return hslToHex({ h, s, l: (lo + hi) / 2 });
}

// -----------------------------------------------------------------------------
// The scale and the guard
// -----------------------------------------------------------------------------

/** An 11-step scale in the accent's hue, each step as luminous as Sanity's own. */
export function accentScale(accent: string, stock: Scale): Scale {
  return Object.fromEntries(TINTS.map((t) => [t, withLuminance(accent, lum(stock[t]))])) as Scale;
}

/**
 * Push one step darker (or lighter) until `label` on it reads at `min`:1.
 * Gives up after 60 small steps and returns the best it reached; the unit test
 * is what notices a brand that cannot be rescued.
 */
function guardStep(color: string, label: string, min: number, direction: 'darker' | 'lighter') {
  let out = color;
  let target = lum(color);
  for (let i = 0; i < 60 && contrastRatio(out, label) < min; i += 1) {
    target = direction === 'darker' ? target * 0.94 : Math.min(1, target * 1.06 + 0.002);
    out = withLuminance(color, target);
  }
  return out;
}

/** The two button pairs the guard holds: [light, dark] contrast ratios. */
export function buttonContrast(colors: Pick<StudioColors, 'accent' | 'white' | 'black'>) {
  return {
    light: contrastRatio(colors.accent['500'], colors.white),
    dark: contrastRatio(colors.accent['400'], colors.black),
  };
}

export function studioColors(input: StudioColorInput, stock: StockColors): StudioColors {
  const notes: string[] = [];

  let white: string;
  if (isHex(input.paper) && lum(input.paper) >= MIN_LIGHT_BG_LUMINANCE) {
    white = normalise(input.paper);
    notes.push(`Light background: ${white} (studio.paper).`);
  } else if (isHex(input.lightBackground) && lum(input.lightBackground) >= MIN_LIGHT_BG_LUMINANCE) {
    white = mix(normalise(input.lightBackground), WARM_PAPER, PAPER_WARMTH);
    notes.push(
      `Light background: ${white} (the site's ${normalise(input.lightBackground)}, warmed).`,
    );
  } else {
    white = mix(stock.white, WARM_PAPER, PAPER_WARMTH);
    notes.push(
      `Light background: ${white}, Sanity's white warmed (the brand's ${String(input.lightBackground ?? 'none')} is not a light hex colour).`,
    );
  }

  let black = stock.black;
  if (isHex(input.darkBackground) && lum(input.darkBackground) <= MAX_DARK_BG_LUMINANCE) {
    black = normalise(input.darkBackground);
    notes.push(`Dark background: ${black} (the site's own).`);
  } else {
    notes.push(
      `Dark background: Sanity's own ${stock.black} (the brand's ${String(input.darkBackground ?? 'none')} is not a dark hex colour).`,
    );
  }

  let accent: Scale;
  if (isHex(input.accent)) {
    accent = accentScale(normalise(input.accent), stock.blue);
    const before = { ...accent };
    accent['500'] = guardStep(accent['500'], white, AA_BODY_TEXT, 'darker');
    accent['400'] = guardStep(accent['400'], black, AA_BODY_TEXT, 'lighter');
    const moved = (['500', '400'] as const).filter((t) => before[t] !== accent[t]);
    notes.push(
      `Accent: ${normalise(input.accent)} as hue` +
        (moved.length ? `, steps ${moved.join(' and ')} adjusted for readable buttons.` : '.'),
    );
  } else {
    accent = { ...stock.blue };
    notes.push(
      `Accent: Sanity's own blue (the brand's ${String(input.accent ?? 'none')} is not a hex colour).`,
    );
  }

  const gray = tintedGray(stock.gray, white, black);
  const chrome = chromeColors(input, accent, stock, notes);
  return { accent, white, black, gray, chrome, notes };
}

function normalise(hex: string): string {
  return rgbToHex(hexToRgb(hex.trim()));
}

// -----------------------------------------------------------------------------
// Paper, greys and chrome (card 116)
// -----------------------------------------------------------------------------

/** Straight sRGB mix: `t` = 0 gives `a`, 1 gives `b`. */
export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  const m = (p: number, q: number) => Math.round(p + (q - p) * t);
  return rgbToHex({ r: m(x.r, y.r), g: m(x.g, y.g), b: m(x.b, y.b) });
}

/** A colour with hue `h` at luminance `target`, its saturation capped so it stays a grey. */
function tint(h: number, s: number, target: number, maxChroma = MAX_GRAY_CHROMA): string {
  const first = hexToHsl(withLuminanceHs(h, Math.min(s, MAX_GRAY_SATURATION), target));
  const room = 1 - Math.abs(2 * first.l - 1);
  const capped = room > 0 ? Math.min(s, MAX_GRAY_SATURATION, maxChroma / room) : 0;
  return withLuminanceHs(h, capped, target);
}

/**
 * Sanity's grey scale re-hued: the light steps (50 to 400: borders and hovers in
 * the light scheme, text in the dark one) take the paper's hue, the dark steps
 * (500 to 950) the dark background's. Each step keeps Sanity's luminance, so every
 * contrast Sanity tuned stays where it was, and the tint is capped so a grey stays
 * a grey (a cream paper gives warm borders, not tan ones). A neutral source gives
 * neutral greys.
 */
export function tintedGray(stockGray: Scale, light: string, dark: string): Scale {
  const l = hexToHsl(light);
  const d = hexToHsl(dark);
  const split = TINTS.indexOf('400');
  return Object.fromEntries(
    TINTS.map((t, i) => {
      const src = i <= split ? l : d;
      return [t, tint(src.h, src.s, lum(stockGray[t]))];
    }),
  ) as Scale;
}

/**
 * `color` moved to the luminance that gives it, against `toBg`, the contrast it
 * has against `fromBg`. Sanity's dark-scheme tokens are tuned for a near-black
 * page; re-laddering every step this way keeps them working on a mid-dark navbar
 * (hovers stay visible, muted text stays muted but readable). Steps that would
 * pass white clamp at white.
 */
export function relativeTo(color: string, fromBg: string, toBg: string): string {
  const ratio = contrastRatio(color, fromBg);
  const lb = lum(toBg);
  const target =
    lum(color) >= lum(fromBg)
      ? Math.min(1, ratio * (lb + 0.05) - 0.05)
      : Math.max(0, (lb + 0.05) / ratio - 0.05);
  return withLuminance(color, target);
}

/**
 * The navbar's palette: the brand's deep colour, darkened until white text on it
 * reads at CHROME_MIN_CONTRAST. Every hue is re-laddered for it (relativeTo), the
 * greys take its hue, and the accent's 400 step (the primary button under dark
 * text) is pushed until the label reads.
 */
export function chromeColors(
  input: StudioColorInput,
  accent: Scale,
  stock: StockColors,
  notes: string[] = [],
): ChromeColors {
  let bg: string;
  if (isHex(input.chrome)) {
    const given = normalise(input.chrome);
    bg = guardStep(given, '#ffffff', CHROME_MIN_CONTRAST, 'darker');
    notes.push(
      `Navbar: ${bg}` + (bg === given ? '.' : ` (from ${given}, darkened for white text).`),
    );
  } else {
    bg = stock.gray['900'];
    notes.push(
      `Navbar: Sanity's own ${bg} (the brand's ${String(input.chrome ?? 'none')} is not a hex colour).`,
    );
  }
  const fromBg = stock.darkBg ?? stock.gray['950'];
  const ladder = (scale: Scale) =>
    Object.fromEntries(TINTS.map((t) => [t, relativeTo(scale[t], fromBg, bg)])) as Scale;

  const palette: Record<string, Scale> = {};
  for (const [hue, scale] of Object.entries(stock.hues ?? {})) {
    if (hue !== 'gray' && hue !== 'blue') palette[hue] = ladder(scale);
  }
  const blue = ladder(accent);
  blue['400'] = guardStep(blue['400'], bg, AA_BODY_TEXT, 'lighter');
  palette.blue = blue;
  const { h, s } = hexToHsl(bg);
  const gray = ladder(stock.gray);
  palette.gray = Object.fromEntries(
    TINTS.map((t) => [t, tint(h, s, lum(gray[t]), MAX_GRAY_CHROMA * 2)]),
  ) as Scale;
  return { bg, palette };
}

/** The palette keys a Studio theme overrides, for buildTheme({ palette }). */
export function paletteOverrides(
  colors: Pick<StudioColors, 'accent' | 'white' | 'black' | 'gray'>,
) {
  return { white: colors.white, black: colors.black, blue: colors.accent, gray: colors.gray };
}

/** The navbar theme's palette keys (white stays Sanity's pure white, for text). */
export function chromePaletteOverrides(chrome: ChromeColors) {
  return { ...chrome.palette, black: chrome.bg };
}

// -----------------------------------------------------------------------------
// Radius and heading weight from the brand (card 116)
// -----------------------------------------------------------------------------

/** The brand radius that leaves Sanity's radius scale as it is. */
export const BASE_RADIUS_PX = 8;

/** Sanity's radius scale scaled by the brand's radius ("0.625rem", "10px"), clamped 0.5x to 2x. */
export function studioRadius(radius: unknown, stock: number[]): number[] {
  const m = typeof radius === 'string' ? /^\s*([\d.]+)\s*(rem|px)\s*$/.exec(radius) : null;
  if (!m) return [...stock];
  const px = Number(m[1]) * (m[2] === 'rem' ? 16 : 1);
  const factor = Math.min(2, Math.max(0.5, px / BASE_RADIUS_PX));
  return stock.map((r) => Math.round(r * factor));
}

/**
 * The heaviest weight (up to 700) the display font actually ships, read from its
 * @fontsource imports ("@fontsource/young-serif/400.css" gives 400). A variable
 * package, or no list, gives null: every weight exists, keep Sanity's. This is
 * what keeps a one-weight display face from being drawn in a faked bold.
 */
export function displayWeight(imports: unknown): number | null {
  if (!Array.isArray(imports) || imports.length === 0) return null;
  if (imports.some((i) => typeof i === 'string' && i.includes('variable'))) return null;
  const weights = imports
    .map((i) => (typeof i === 'string' ? /\/(\d{3})(?:-italic)?\.css$/.exec(i)?.[1] : undefined))
    .filter((w): w is string => Boolean(w))
    .map(Number)
    .filter((w) => w <= 700);
  return weights.length ? Math.max(...weights) : null;
}

/** brand.config.json -> the inputs. Tolerates a config with any of them missing. */
export function studioColorInput(brand: unknown): StudioColorInput {
  const b = (brand ?? {}) as {
    studio?: { accent?: string; paper?: string; chrome?: string };
    palette?: {
      theme?: Record<string, string>;
      light?: Record<string, string>;
      dark?: Record<string, string>;
    };
  };
  return {
    accent: b.studio?.accent ?? b.palette?.light?.['--primary'] ?? null,
    lightBackground: b.palette?.light?.['--background'] ?? null,
    darkBackground: b.palette?.dark?.['--background'] ?? null,
    paper: b.studio?.paper ?? null,
    chrome:
      b.studio?.chrome ??
      b.palette?.theme?.['--color-primary-dark'] ??
      b.palette?.light?.['--primary'] ??
      null,
  };
}

// -----------------------------------------------------------------------------
// The token overrides handed to buildTheme({ color }) (cards 110 and 116)
// -----------------------------------------------------------------------------

const STATUS_BUTTON = {
  enabled: { bg: ['600', '400'] },
  hovered: { bg: ['700', '300'] },
  pressed: { bg: ['800', '300'] },
  selected: { bg: ['800', '300'] },
};

/**
 * The Studio's: the dark page is palette black (the site's dark background, not
 * gray 950), and the solid status buttons (Publish, Delete, warnings) sit one
 * step deeper in light mode than Sanity's, so their white labels read at AA on
 * any paper (Sanity's own green Publish is 2.6:1). Dark mode is unchanged.
 */
export const STUDIO_COLOR_TOKENS = {
  base: { default: { bg: ['white', 'black'] } },
  button: {
    default: { positive: STATUS_BUTTON, caution: STATUS_BUTTON, critical: STATUS_BUTTON },
  },
};

/** The navbar's: its page is palette black, the chrome colour. */
export const CHROME_COLOR_TOKENS = {
  base: { default: { bg: ['white', 'black'] } },
};

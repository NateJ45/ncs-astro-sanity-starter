// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// The Studio's colours from the brand (PORTS.md card 110)
// =============================================================================
// Pure maths, no Sanity imports, so it is unit tested in plain Node
// (studio-theme.test.ts). src/sanity/studioTheme.ts feeds the result into
// @sanity/ui's own buildTheme({ palette }), which is already in the matched
// set (rule 8): no @sanity/themer, which wants React 19.3.
//
// WHAT IT CHANGES, AND WHAT IT LEAVES ALONE (the "calm rule"):
//   - The ACCENT: Sanity's blue scale (primary buttons, links, focus rings,
//     the selected list row) becomes a scale in the brand's hue.
//   - The BACKGROUNDS: palette white and black become the site's own light
//     and dark backgrounds, so the Studio sits on the same paper as the site.
//   - Nothing else. Green stays "published", amber stays "draft", red stays
//     "danger" on every client's Studio, because we support all of them.
//
// THE CONTRAST GUARD. The brand colour gives the scale its hue and
// saturation only. Each step's lightness is solved so its luminance matches
// Sanity's own tuned blue step, so a pale sage or a gold primary still gives
// readable buttons. On top of that, the two steps that carry button labels
// (500 under white text in light mode, 400 under dark text in dark mode) are
// pushed until the label reaches WCAG AA 4.5:1. A background that is not
// light enough (or dark enough) falls back to Sanity's own, with a note.
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
}

export interface StockColors {
  /** Sanity's blue scale, the one the accent replaces. */
  blue: Scale;
  white: string;
  black: string;
}

export interface StudioColors {
  /** Replaces the `blue` hue in the palette. */
  accent: Scale;
  /** Palette white: the light scheme's page background. */
  white: string;
  /** Palette black: the dark scheme's page background. */
  black: string;
  /** Which inputs were used as given and which fell back. One line each. */
  notes: string[];
}

/** A light background must be at least this luminous to stand in for white. */
export const MIN_LIGHT_BG_LUMINANCE = 0.8;
/** A dark background must be at most this luminous to stand in for black. */
export const MAX_DARK_BG_LUMINANCE = 0.03;

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

  let white = stock.white;
  if (isHex(input.lightBackground) && lum(input.lightBackground) >= MIN_LIGHT_BG_LUMINANCE) {
    white = normalise(input.lightBackground);
    notes.push(`Light background: ${white} (the site's own).`);
  } else {
    notes.push(
      `Light background: Sanity's own ${stock.white} (the brand's ${String(input.lightBackground ?? 'none')} is not a light hex colour).`,
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

  return { accent, white, black, notes };
}

function normalise(hex: string): string {
  return rgbToHex(hexToRgb(hex.trim()));
}

/** brand.config.json -> the three inputs. Tolerates a config with any of them missing. */
export function studioColorInput(brand: unknown): StudioColorInput {
  const b = (brand ?? {}) as {
    studio?: { accent?: string };
    palette?: { light?: Record<string, string>; dark?: Record<string, string> };
  };
  return {
    accent: b.studio?.accent ?? b.palette?.light?.['--primary'] ?? null,
    lightBackground: b.palette?.light?.['--background'] ?? null,
    darkBackground: b.palette?.dark?.['--background'] ?? null,
  };
}

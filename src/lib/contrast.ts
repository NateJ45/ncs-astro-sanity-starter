// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// Contrast math (WCAG 2.x relative luminance)
// =============================================================================
// Exists so the theme tokens can be checked in a unit test
// (theme-tokens.test.ts). The class of contrast bug this guards against - an
// invisible focus ring, a border below the 3:1 UI threshold, a button with no
// visible edge, an eyebrow that vanishes on its own surface - is invisible to
// every other gate: axe has no rule for focus-indicator or custom-border
// contrast, and an axe sweep audits the resting DOM only. In the WCP repo
// those bugs all shipped on a green build with Lighthouse at 100.
//
// Deliberately WCAG 2.x, not APCA. APCA models near-black pairs better and is
// worth a sanity check by eye, but 2.2 AA is the actual conformance target
// and the thing CI has to hold.
// =============================================================================

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** `#1b2531` or `#fff` -> {r,g,b}. Throws on anything it cannot parse, because
    a silently-zero colour would make a contrast test pass for the wrong reason. */
export function hexToRgb(hex: string): Rgb {
  const h = hex.trim().replace(/^#/, '');
  const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`Not a hex colour: "${hex}"`);
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/** WCAG relative luminance. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Contrast ratio between two hex colours, 1..21, rounded to 2dp. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(hexToRgb(a)), relativeLuminance(hexToRgb(b))].sort(
    (x, y) => y - x,
  );
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

/**
 * Flatten a semi-transparent colour over an opaque backdrop.
 *
 * Needed because a dark theme's borders are typically white-at-low-alpha over
 * a dark surface (`--border: oklch(1 0 0 / 12%)`): the ratio that matters is
 * the COMPOSITE against what is actually behind it, not the raw white.
 */
export function flatten(fg: Rgb, alpha: number, bg: Rgb): Rgb {
  const mix = (f: number, b: number) => Math.round(f * alpha + b * (1 - alpha));
  return { r: mix(fg.r, bg.r), g: mix(fg.g, bg.g), b: mix(fg.b, bg.b) };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** WCAG 2.2 thresholds, named so test failures read as intent not magic numbers. */
export const AA_BODY_TEXT = 4.5; // SC 1.4.3
export const AA_LARGE_TEXT = 3; // SC 1.4.3 (>=24px, or >=18.66px bold)
export const AA_NON_TEXT = 3; // SC 1.4.11 - UI components, states, FOCUS indicators

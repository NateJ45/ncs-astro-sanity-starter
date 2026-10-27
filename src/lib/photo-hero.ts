// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// photo-hero: the contrast promise of "Photo behind the words" (PORTS.md card 189)
// =============================================================================
// The photo hero (PhotoHero.astro, styles src/styles/photo-hero.css) sets white words over any
// photograph an editor uploads. Nobody can promise what the picture holds, so the promise is made
// by the shade over it: wherever words sit, the shade is at least `--photo-scrim-text` of the scrim
// colour (`--photo-scrim`, the brand's dark accent by default). This file does the arithmetic, and
// photo-hero.test.ts runs it against the stylesheet's own tokens and the brand's colour, assuming
// the worst photo there is (pure white behind every word). A reskin that picks a lighter dark
// accent, or an edit that thins the shade, fails the unit tests instead of shipping unreadable
// words. axe cannot judge text over an image, which is why this lives here.

/** WCAG AA for body text. The hero's intro line is body-sized, so the whole hero meets it. */
export const PHOTO_HERO_MIN_CONTRAST = 4.5;

type Rgb = [number, number, number];

/** "#1e2024" or "#123" to [r, g, b] (0 to 255). */
export function hexToRgb(hex: string): Rgb {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error(`Not a hex colour: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

/** WCAG relative luminance of an sRGB colour. */
export function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two colours. */
export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** `scrim` laid at `alpha` (0 to 1) over `under`, as the browser composites it. */
export function over(scrim: Rgb, alpha: number, under: Rgb): Rgb {
  return scrim.map((c, i) => Math.round(c * alpha + under[i] * (1 - alpha))) as Rgb;
}

/**
 * White words over the worst photo (pure white) under the scrim at `alpha`: the lowest contrast
 * the hero can ever show where words sit.
 */
export function worstCaseContrast(scrimHex: string, alpha: number): number {
  const white: Rgb = [255, 255, 255];
  return contrast(white, over(hexToRgb(scrimHex), alpha, white));
}

/** The least shade (0 to 1) that keeps white words at `min` over a white photo for this scrim. */
export function leastShade(scrimHex: string, min = PHOTO_HERO_MIN_CONTRAST): number {
  for (let a = 0; a <= 100; a += 1) {
    if (worstCaseContrast(scrimHex, a / 100) >= min) return a / 100;
  }
  return 1;
}

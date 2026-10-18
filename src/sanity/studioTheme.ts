// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// The Studio's palette, from brand/brand.config.json (PORTS.md card 110)
// =============================================================================
// Reads the brand JSON directly (like BrandKit.tsx), so the Studio cannot drift
// from the site: `npm run apply-brand` rewrites the JSON's consumers, and this
// file IS one. The maths and the contrast guard are in src/lib/studio-theme.ts.
//
// What it hands to buildTheme() in sanity.config.ts:
//   - `palette`: Sanity's default palette with the blue hue swapped for the
//     brand accent scale and white/black swapped for the site's backgrounds.
//   - `color`: one token override, the dark scheme's page background reads
//     palette black (the site's dark background) instead of gray 950.
// Status hues (green, yellow, red, purple) are Sanity's own on purpose.
//
// @sanity/color is not a direct dependency: it is the palette package both
// `sanity` and `@sanity/ui` depend on, pinned in package-lock.json, so it moves
// with the matched set (rule 8) and needs no package.json change.
// =============================================================================

import { color as sanityColor } from '@sanity/color';
import type { ThemeConfig } from '@sanity/ui/theme';
import brand from '../../brand/brand.config.json';
import {
  studioColorInput,
  studioColors,
  TINTS,
  type Scale,
  type StudioColors,
} from '../lib/studio-theme';

const hexOf = (v: string | { hex: string }) => (typeof v === 'string' ? v : v.hex);

/** Sanity's stock blue, white and black, as plain hex. */
export function stockColors() {
  return {
    blue: Object.fromEntries(TINTS.map((t) => [t, hexOf(sanityColor.blue[t])])) as Scale,
    white: hexOf(sanityColor.white),
    black: hexOf(sanityColor.black),
  };
}

/** The resolved colours for this site, notes included (apply-brand prints them). */
export const STUDIO_COLORS: StudioColors = studioColors(studioColorInput(brand), stockColors());

/** The two buildTheme() inputs. Spread into buildTheme({ font, ...studioThemeColors }). */
export const studioThemeColors: Pick<ThemeConfig, 'palette' | 'color'> = {
  palette: {
    ...sanityColor,
    white: STUDIO_COLORS.white,
    black: STUDIO_COLORS.black,
    blue: STUDIO_COLORS.accent,
  },
  color: {
    base: { default: { bg: ['white', 'black'] } },
  },
};

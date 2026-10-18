// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// The Studio's theme, from brand/brand.config.json (PORTS.md cards 110 and 116)
// =============================================================================
// Reads the brand JSON directly (like BrandKit.tsx), so the Studio cannot drift
// from the site: `npm run apply-brand` rewrites the JSON's consumers, and this
// file IS one. The maths and the contrast guard are in src/lib/studio-theme.ts.
//
// What it builds, all with @sanity/ui's own buildTheme() (both schemes):
//   - buildStudioTheme(): the Studio. Sanity's palette with the blue hue swapped
//     for the brand accent scale, white for a warm paper, black for the site's
//     dark background, and the greys re-hued to match (luminance kept). The
//     brand's fonts and radius. Status solid buttons (Publish, Delete) one step
//     deeper in light mode, so their white labels read at AA on every client.
//   - buildChromeTheme(): the navbar's own dark theme on the brand's deep colour
//     (studio.chrome), drawn by StudioLook.tsx in both schemes.
//   - seedLightScheme(): light is the default appearance for new editors; the
//     Appearance menu (System / Light / Dark) still works and is remembered.
// Status hues (green, yellow, red, purple) are Sanity's own on purpose.
//
// @sanity/color is not a direct dependency: it is the palette package both
// `sanity` and `@sanity/ui` depend on, pinned in package-lock.json, so it moves
// with the matched set (rule 8) and needs no package.json change.
// =============================================================================

import { color as sanityColor } from '@sanity/color';
import { buildTheme, type RootTheme, type ThemeConfig, type ThemeFont } from '@sanity/ui/theme';
import brand from '../../brand/brand.config.json';
import {
  CHROME_COLOR_TOKENS,
  chromePaletteOverrides,
  displayWeight,
  paletteOverrides,
  studioColorInput,
  studioColors,
  studioRadius,
  STUDIO_COLOR_TOKENS,
  TINTS,
  type Scale,
  type StudioColors,
} from '../lib/studio-theme';

const hexOf = (v: string | { hex: string }) => (typeof v === 'string' ? v : v.hex);
const scaleOf = (hue: Record<string, string | { hex: string }>) =>
  Object.fromEntries(TINTS.map((t) => [t, hexOf(hue[t])])) as Scale;

/** Sanity's stock palette, as plain hex. */
export function stockColors() {
  const hues: Record<string, Scale> = {};
  for (const [key, value] of Object.entries(sanityColor)) {
    if (value && typeof value === 'object' && '500' in value) {
      hues[key] = scaleOf(value as Record<string, { hex: string }>);
    }
  }
  return {
    blue: hues.blue,
    gray: hues.gray,
    white: hexOf(sanityColor.white),
    black: hexOf(sanityColor.black),
    darkBg: hues.gray['950'],
    hues,
  };
}

/** The resolved colours for this site, notes included (apply-brand prints them). */
export const STUDIO_COLORS: StudioColors = studioColors(studioColorInput(brand), stockColors());

/** The Studio's palette and token overrides (also exported for older per-site configs). */
export const studioThemeColors: Pick<ThemeConfig, 'palette' | 'color'> = {
  palette: { ...sanityColor, ...paletteOverrides(STUDIO_COLORS) },
  color: STUDIO_COLOR_TOKENS as ThemeConfig['color'],
};

/** The two font stacks the Studio draws in (sanity.config.ts DISPLAY_STACK / BODY_STACK). */
export interface StudioFonts {
  display: string;
  body: string;
}

const DEFAULTS = buildTheme();
/** The display face's heaviest shipped weight (null: variable, every weight exists). */
export const HEADING_WEIGHT = displayWeight(
  (brand as { fonts?: { display?: { imports?: unknown } } }).fonts?.display?.imports,
);

function fontsFor({ display, body }: StudioFonts): NonNullable<ThemeConfig['font']> {
  const f = DEFAULTS.v2!.font;
  const heading: ThemeFont = { ...f.heading, family: display };
  if (HEADING_WEIGHT) {
    // A one- or two-weight display face: never ask the browser for a weight it
    // would have to fake.
    heading.weights = Object.fromEntries(
      Object.entries(f.heading.weights).map(([k, w]) => [k, Math.min(w, HEADING_WEIGHT)]),
    ) as unknown as ThemeFont['weights'];
  }
  return {
    ...f,
    text: { ...f.text, family: body },
    label: { ...f.label, family: body },
    heading,
  };
}

const RADIUS = studioRadius((brand as { radius?: unknown }).radius, DEFAULTS.v2!.radius);

/** The Studio theme: brand colours, fonts and radius, light and dark. */
export function buildStudioTheme(fonts: StudioFonts): RootTheme {
  return buildTheme({ font: fontsFor(fonts), radius: RADIUS, ...studioThemeColors });
}

/** The navbar's theme. Drawn with scheme="dark" in both appearances (StudioLook.tsx). */
export function buildChromeTheme(fonts: StudioFonts): RootTheme {
  return buildTheme({
    font: fontsFor(fonts),
    radius: RADIUS,
    palette: { ...sanityColor, ...chromePaletteOverrides(STUDIO_COLORS.chrome) },
    color: CHROME_COLOR_TOKENS as ThemeConfig['color'],
  } as ThemeConfig);
}

// -----------------------------------------------------------------------------
// Light by default
// -----------------------------------------------------------------------------
// Sanity keeps the Appearance choice in localStorage under this key and reads it
// once, when the Studio first mounts (after this config module has run). With no
// choice stored it follows the computer, which on a dark-mode laptop opens the
// Studio dark. Seeding "light" once, before that read, makes light the default;
// the marker means it happens once per browser, so a later pick of System or Dark
// in the Appearance menu sticks. A stored "light" or "dark" is never touched.
const SCHEME_KEY = 'sanityStudio:ui:colorScheme';
const SEEDED_KEY = 'ncs:studio:lightDefault';

export function seedLightScheme(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const store = window.localStorage;
    if (store.getItem(SEEDED_KEY)) return;
    const current = store.getItem(SCHEME_KEY);
    if (!current || current === 'system') store.setItem(SCHEME_KEY, 'light');
    store.setItem(SEEDED_KEY, '1');
  } catch {
    // Storage blocked (private window, CLI): Sanity's own default applies.
  }
}

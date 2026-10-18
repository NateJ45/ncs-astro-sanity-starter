// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Home's banner, the pure half (Studio kit, PORTS.md card 118)
// =============================================================================
// The banner at the top of the Studio's Home (src/sanity/kit/HomeBanner.tsx)
// is drawn on the navbar's deep brand colour, like the dark welcome banner on
// the family's WordPress dashboards. Everything it decides without React is
// here, so src/lib/studio-banner.test.ts checks it in bare Node:
//
//   - which part of the site's name is set in the site's own lettering, and
//     the colour of each letter (spaces take none, as on the site);
//   - which configured colours are allowed on the banner at all (the greeting
//     accent at 4.5:1, the lettering at 3:1 as large text), so a site cannot
//     configure an unreadable banner by accident;
//   - the @font-face rule for the lettering, with the family and file path
//     cleaned so a config value cannot break out of the CSS;
//   - where "View the website" goes.
// =============================================================================

import { contrastRatio } from './contrast.ts';

/** WCAG AA for body text. */
export const BODY_CONTRAST = 4.5;
/** WCAG AA for large text (the site name is 24px and up). */
export const LARGE_CONTRAST = 3;

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** The colour, if it is a hex colour that reads on `bg` at `min`. Otherwise null. */
export function readableOn(color: string | undefined, bg: string, min = BODY_CONTRAST) {
  if (!color || !HEX.test(color.trim()) || !HEX.test(bg.trim())) return null;
  return contrastRatio(color.trim(), bg.trim()) >= min ? color.trim() : null;
}

/** The colours that read on `bg` as large text, in the order given. */
export function readableColors(colors: string[] | undefined, bg: string): string[] {
  return (colors ?? [])
    .map((c) => readableOn(c, bg, LARGE_CONTRAST))
    .filter((c): c is string => c !== null);
}

export interface NameParts {
  before: string;
  lettered: string;
  after: string;
}

/**
 * The site's name split around the part set in the site's lettering. The last
 * match wins ("First Baptist Church of Auburn" with "Auburn"), matched without
 * regard to case so a config typed in lower case still works. No match, or no
 * word: null, and the whole name is set in the heading font.
 */
export function splitName(title: string, word: string | undefined): NameParts | null {
  if (!word || !word.trim() || !title) return null;
  const at = title.toLowerCase().lastIndexOf(word.trim().toLowerCase());
  if (at < 0) return null;
  const end = at + word.trim().length;
  return { before: title.slice(0, at), lettered: title.slice(at, end), after: title.slice(end) };
}

export interface Letter {
  char: string;
  /** null for a space: it takes no colour, so the next letter keeps the rhythm. */
  color: string | null;
}

/** Each letter takes the next colour in turn; spaces take none. No colours: all null. */
export function colorLetters(text: string, colors: string[]): Letter[] {
  let k = 0;
  return [...text].map((char) => {
    if (/\s/.test(char) || colors.length === 0) return { char, color: null };
    return { char, color: colors[k++ % colors.length] };
  });
}

/** A CSS family name or url() path with anything that could close the rule taken out. */
const cssSafe = (s: string) => s.replace(/["'\\;{}()<>\n\r]/g, '').trim();

/**
 * The @font-face rule for the lettering. The file is the site's own (public/,
 * same origin as /studio), so no extra network host is involved. Null when the
 * family or path is unusable. `swap`: the heading font shows until it loads.
 */
export function fontFaceCss(family: string | undefined, src: string | undefined): string | null {
  const f = cssSafe(family ?? '');
  const u = cssSafe(src ?? '');
  if (!f || !u || !u.startsWith('/')) return null;
  const format = u.endsWith('.woff2')
    ? " format('woff2')"
    : u.endsWith('.woff')
      ? " format('woff')"
      : '';
  return `@font-face{font-family:'${f}';src:url('${u}')${format};font-display:swap}`;
}

/** The lettering's font stack: its own family, then the heading font. */
export function letteringStack(family: string, headingStack: string): string {
  return `'${cssSafe(family)}', ${headingStack}`;
}

/**
 * Where "View the website" goes. The Studio is embedded at /studio on the site
 * itself, so by default it is this page's own origin: the live site in
 * production, the dev server locally. A configured address wins when it is
 * an absolute http(s) URL.
 */
export function siteHref(configured: string | undefined, origin: string | undefined): string {
  if (configured && /^https?:\/\//i.test(configured.trim())) return configured.trim();
  return origin ? `${origin.replace(/\/+$/, '')}/` : '/';
}

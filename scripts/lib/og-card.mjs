// Safe to edit by hand
// =============================================================================
// The site's share card, as scripts/build-og-cards.mjs draws it (PORTS.md card 169)
// =============================================================================
// build-og-cards.mjs (PORTABLE) imports exactly three things from this file:
//
//   cardHtml({ title, kicker?, home?, mark? })  -> the card's HTML (hashed for the cache)
//   renderHtml(html, { home?, type, quality })  -> { buffer } (the drawn image)
//   closeCards()                                 -> close the shared browser, once
//
// This version is the starter's generic card: the shared renderer
// (scripts/lib/render-og.mjs, PORTABLE) in the site's colours and display face
// (scripts/og-theme.mjs, written by apply-brand), the site's name as the
// wordmark and the page title under it. A site with its own card design
// replaces this file and keeps the three exports (first-baptist-auburn draws
// its own here).
//
//   title   the page title (Home: the Site settings tagline)
//   kicker  optional small line at the top (the section, a date); Home has none
//   mark    optional data: URI of the square icon from Site settings (card 168)
// =============================================================================

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeRenderer, ogCardHtml, renderOgHtml } from './render-og.mjs';
import { OG_THEME } from '../og-theme.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** The wordmark: brand.config.json's name (apply-brand keeps it in step with src/data/site.ts). */
function siteName() {
  try {
    return JSON.parse(readFileSync(resolve(root, 'brand/brand.config.json'), 'utf8')).name || '';
  } catch {
    return '';
  }
}
const NAME = siteName();

/** The card's HTML. Pure: the same request always gives the same HTML (and so the same hash). */
export function cardHtml({ title, kicker, home = false, mark }) {
  return ogCardHtml({
    wordmark: NAME || title,
    tagline: NAME ? title : '',
    kicker: home ? undefined : kicker,
    mark,
    theme: OG_THEME,
  });
}

/** Draw the HTML from cardHtml to an image buffer. */
export async function renderHtml(html, { type = 'png', quality = 86 } = {}) {
  return { buffer: await renderOgHtml(html, { type, quality, theme: OG_THEME }) };
}

/** Close the shared browser. Call once at the end, or the process never exits. */
export const closeCards = closeRenderer;

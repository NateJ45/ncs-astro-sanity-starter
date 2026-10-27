// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (PORTS.md card 169)
// Which share image a page uses, and the marker that asks the build to draw its card
// (share images that make themselves). BaseLayout calls `resolveShareImage`; the
// build step scripts/build-og-cards.mjs reads the marker (scripts/lib/og-build.mjs decodes it),
// draws /og/<route>.jpg in the site's card design (scripts/lib/og-card.mjs) and removes the marker from the page.
//
// THE ORDER, first match wins:
//   1. a picture the page passes itself (a post's cover photo);
//   2. the page's own share image from the Studio (its SEO tab, `seoImage`);
//   3. the generated card, /og/<route>.jpg, on every prerendered page;
//   4. Site settings' default share image (only reachable on a page the build cannot draw a card
//      for: the password pages, which render on request);
//   5. /og-default.png.
// So nobody has to remember to make a card: a new or renamed page gets the right one at the next
// build, and a page with its own picture keeps it.

export interface CardRequest {
  /** The card's big line. The page title, without the site's name (the card carries it). */
  title: string;
  /** The small line above it: the section ("Journal"), a date, the page head's eyebrow. */
  kicker?: string;
  /** Home draws the masthead card: the site's name with `title` (the tagline) under it. */
  home?: boolean;
}

/** /about/ -> /og/about.jpg; / -> /og/home.jpg; /journal/x/ -> /og/journal-x.jpg. */
export function cardPathForRoute(pathname: string): string {
  const trimmed = pathname.replace(/^\/+|\/+$/g, '');
  if (!trimmed) return '/og/home.jpg';
  const slug = trimmed
    .replace(/\//g, '-')
    .replace(/[^a-z0-9._-]/gi, '-')
    .toLowerCase();
  return `/og/${slug}.jpg`;
}

/** base64url JSON: survives any title in an HTML attribute, no entity decoding needed. */
export function encodeCardRequest(req: CardRequest): string {
  const clean: CardRequest = { title: req.title };
  if (req.kicker) clean.kicker = req.kicker;
  if (req.home) clean.home = true;
  const bytes = new TextEncoder().encode(JSON.stringify(clean));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export interface ShareImageInput {
  /** 1. A picture URL the page passes (absolute or site-relative). */
  pageImage?: string | null;
  /** 2. The page's own share image, already resolved to a 1200x630 URL. */
  pageShareImage?: string | null;
  /** 4. Site settings' default share image, resolved. */
  siteDefault?: string | null;
  /** Whether this page is built ahead of time (only those get a card). */
  prerendered: boolean;
  pathname: string;
  card: CardRequest;
}

export interface ShareImage {
  /** Site-relative or absolute URL for og:image. */
  url: string;
  /** The marker's content when the build must draw the card, else null. */
  marker: string | null;
}

export function resolveShareImage(i: ShareImageInput): ShareImage {
  if (i.pageImage) return { url: i.pageImage, marker: null };
  if (i.pageShareImage) return { url: i.pageShareImage, marker: null };
  if (i.prerendered && i.card.title.trim()) {
    return { url: cardPathForRoute(i.pathname), marker: encodeCardRequest(i.card) };
  }
  return { url: i.siteDefault || '/og-default.png', marker: null };
}

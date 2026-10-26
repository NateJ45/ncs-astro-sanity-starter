// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (PORTS.md card 169)
// The pure half of the build-time share cards (scripts/build-og-cards.mjs): how BaseLayout tells
// the build which card a page wants, how the build finds those requests in the built HTML, and
// how it tidies the HTML afterwards. No browser, no network, no file system, so it is unit tested
// (og-build.test.mjs) and the generator stays a thin loop.
//
// THE HANDSHAKE. BaseLayout writes one marker in the <head> of every prerendered page whose share
// image is the generated card (no picture of its own was set in the Studio):
//
//   <meta name="x-og-card" content="<base64url JSON>">
//
// The JSON is { title, kicker?, home? }. base64url, so no quote, ampersand or accent in a title
// can break the attribute or need decoding. The page's og:image already points at
// /og/<route>.jpg; the build draws that file, then deletes the marker, so it never ships.

/** The marker's name attribute. BaseLayout writes it (src/lib/og-card-marker.ts). */
export const OG_MARKER_NAME = 'x-og-card';

const MARKER_RE = /<meta\s+name="x-og-card"\s+content="([A-Za-z0-9_-]*)"\s*\/?>\s*/;
const OG_IMAGE_RE = /<meta\s+property="og:image"\s+content="([^"]*)"\s*\/?>/;

/** Encode a card request the way BaseLayout does (same as src/lib/og-card-marker.ts). */
export function encodeCardRequest(req) {
  return Buffer.from(JSON.stringify(req), 'utf8').toString('base64url');
}

/** Decode a marker's content. Returns null for anything that is not a card request. */
export function decodeCardRequest(content) {
  try {
    const v = JSON.parse(Buffer.from(String(content), 'base64url').toString('utf8'));
    if (!v || typeof v.title !== 'string' || !v.title.trim()) return null;
    return {
      title: v.title,
      kicker: typeof v.kicker === 'string' && v.kicker.trim() ? v.kicker : undefined,
      home: v.home === true,
    };
  } catch {
    return null;
  }
}

/**
 * Read one built page. Returns null when the page asks for no card (it shares its own picture,
 * or it is not a BaseLayout page). Otherwise the request plus the file name its og:image names:
 * `https://site/og/plan-your-visit.jpg` -> `plan-your-visit.jpg`.
 */
export function readCardRequest(html) {
  const m = MARKER_RE.exec(html);
  if (!m) return null;
  const req = decodeCardRequest(m[1]);
  const og = OG_IMAGE_RE.exec(html);
  if (!req || !og) return null;
  let path;
  try {
    path = new URL(og[1], 'https://x.invalid').pathname;
  } catch {
    return null;
  }
  const file = /^\/og\/([a-z0-9._-]+\.jpg)$/i.exec(path)?.[1];
  if (!file) return null;
  return { ...req, file };
}

/** The page without its marker (the marker is build plumbing, never shipped). */
export function stripCardMarker(html) {
  return html.replace(MARKER_RE, '');
}

/**
 * Point og:image and twitter:image at `url` instead of the card: the fallback when a card could
 * not be drawn (no browser on this machine), so a share never names a file that does not exist.
 */
export function replaceShareImage(html, cardFile, url) {
  const esc = cardFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(content=")[^"]*/og/${esc}(")`, 'g');
  return html.replace(re, `$1${url}$2`);
}

/**
 * Add `?v=<version>` to the card's URL in og:image and twitter:image. The file name stays fixed
 * (/og/about.jpg), but Facebook, iMessage and the rest cache a share picture by its URL, so a card
 * whose title changed needs a new URL to be fetched again.
 */
export function versionShareImage(html, cardFile, version) {
  const esc = cardFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(content="[^"]*/og/${esc})(")`, 'g');
  return html.replace(re, `$1?v=${version}$2`);
}

/** The route a built HTML file serves: dist/client/about/index.html -> /about/. */
export function routeForFile(relPath) {
  const p = relPath.replace(/\\/g, '/');
  if (p === 'index.html') return '/';
  if (p.endsWith('/index.html')) return `/${p.slice(0, -'index.html'.length)}`;
  return `/${p.replace(/\.html$/, '')}`;
}

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// share-links.ts - plain share URLs for <ShareButtons> (PORTS.md card 121)
// =============================================================================
// No third-party scripts, SDKs or tracking pixels: each network gets an
// ordinary link to its own share page, and email is a mailto:. Nothing loads
// from Facebook or X until a visitor chooses to click, and then only in a new
// tab. Pure, so share-links.test.ts checks the exact URLs.
// =============================================================================

export interface ShareInput {
  /** The absolute URL being shared (https://example.com/sermons/foo/). */
  url: string;
  /** The page's title, used as the email subject and the post text. */
  title: string;
}

export interface ShareLinks {
  facebook: string;
  x: string;
  email: string;
}

export function shareLinks({ url, title }: ShareInput): ShareLinks {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    x: `https://x.com/intent/post?url=${u}&text=${t}`,
    // encodeURIComponent, not URLSearchParams: mail clients read "+" as a
    // literal plus, so spaces must be %20.
    email: `mailto:?subject=${t}&body=${encodeURIComponent(`${title}\n\n${url}`)}`,
  };
}

/** Joins a site origin and a path into the absolute URL a share link needs. */
export function absoluteUrl(origin: string, path: string): string {
  return new URL(path, origin.endsWith('/') ? origin : `${origin}/`).toString();
}

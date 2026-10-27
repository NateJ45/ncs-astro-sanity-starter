// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Safe to edit by hand (in the starter; site copies stay byte-identical, PORTS.md card 167)
//
// One list of the site's social accounts for every place that shows the round icon buttons
// (the footer in the starter; a site may also draw them in its header strip, phone menu or
// Contact page).
//
// Editor-managed: the editor adds a row in Site settings > Social links by pasting a link (and,
// if they like, a label). The platform, and so the icon and the button's name, is read from the
// link's address by `platformFromUrl()` below, so a new account needs no code change and no
// dropdown. An address this file does not know gets the plain link icon and the editor's label,
// or the site's name (the domain) when they gave none.
//
// Older rows carry a `platform` the editor picked from a dropdown (the field is now hidden). The
// address wins when it is known; the stored platform stands in only for an address this file does
// not recognize (a vanity domain that forwards to Facebook, say), so existing rows keep their icon.
//
// WhatsApp is the one platform with a rule on the address: only an invite (chat.whatsapp.com/...)
// or a number link (wa.me/...) is a link a visitor can use, so any other WhatsApp address is left
// out rather than drawn as a broken button. A link is never built from a phone number.
//
// Order: the editor's Social links list as typed. With that list empty, the legacy Instagram /
// Facebook fields stand in so an older dataset keeps its buttons. A caller may pass a Facebook
// address kept elsewhere (a site's own facts field, say); it joins the front when no Facebook
// entry is in the list. Icons for each platform live in social-icons.ts (kept apart so this file
// stays plain data, and so the Studio schema can import it for its warnings and previews).

export interface SocialLink {
  /** A key from PLATFORMS below, or 'Other'. */
  platform: string;
  url: string;
  label?: string;
}

export interface RawSocialSettings {
  socialLinks?: { platform?: string | null; url?: string | null; label?: string | null }[] | null;
  socialInstagram?: string | null;
  socialFacebook?: string | null;
}

/** The most buttons drawn in a row (the Studio list allows the same number). */
export const MAX_SOCIAL_LINKS = 10;

interface Platform {
  /** The key stored and passed to socialIcon(). */
  key: string;
  /** The button's accessible name when the editor gave no label. */
  name: string;
  /** Hosts (without "www.") that belong to it; a subdomain of one matches too. */
  hosts: string[];
}

// The common accounts a small organization keeps. Add a row here (and an icon in social-icons.ts)
// to teach the site a new one; until then it still shows, with the plain link icon.
export const PLATFORMS: Platform[] = [
  { key: 'Facebook', name: 'Facebook', hosts: ['facebook.com', 'fb.com', 'fb.me', 'fb.watch'] },
  { key: 'Instagram', name: 'Instagram', hosts: ['instagram.com', 'instagr.am'] },
  { key: 'YouTube', name: 'YouTube', hosts: ['youtube.com', 'youtu.be'] },
  { key: 'TikTok', name: 'TikTok', hosts: ['tiktok.com'] },
  { key: 'WhatsApp', name: 'WhatsApp', hosts: ['wa.me', 'whatsapp.com'] },
  { key: 'X', name: 'X (Twitter)', hosts: ['x.com', 'twitter.com'] },
  { key: 'Threads', name: 'Threads', hosts: ['threads.net', 'threads.com'] },
  { key: 'Spotify', name: 'Spotify', hosts: ['spotify.com', 'spotify.link', 'spoti.fi'] },
  { key: 'Apple Podcasts', name: 'Apple Podcasts', hosts: ['podcasts.apple.com'] },
  { key: 'Vimeo', name: 'Vimeo', hosts: ['vimeo.com'] },
  { key: 'LinkedIn', name: 'LinkedIn', hosts: ['linkedin.com', 'lnkd.in'] },
  { key: 'Pinterest', name: 'Pinterest', hosts: ['pinterest.com', 'pin.it'] },
  { key: 'Nextdoor', name: 'Nextdoor', hosts: ['nextdoor.com'] },
  { key: 'Flickr', name: 'Flickr', hosts: ['flickr.com', 'flic.kr'] },
  { key: 'Linktree', name: 'Linktree', hosts: ['linktr.ee', 'linktree.com'] },
  // The starter's old dropdown offered Houzz; Tabler has no icon for it, so it keeps the plain
  // link icon but is still named "Houzz" for screen readers.
  { key: 'Houzz', name: 'Houzz', hosts: ['houzz.com'] },
];

const BY_KEY = new Map(PLATFORMS.map((p) => [p.key, p]));

function parse(url: string | null | undefined): URL | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u : null;
  } catch {
    return null;
  }
}

/** The host without a leading "www." (or "m." for the mobile sites), lower case. */
function bareHost(u: URL): string {
  return u.hostname.toLowerCase().replace(/^(www|m|mobile)\./, '');
}

/** The platform an address belongs to, or null for a site this file does not know. */
export function platformFromUrl(url: string | null | undefined): Platform | null {
  const u = parse(url);
  if (!u) return null;
  const host = bareHost(u);
  return PLATFORMS.find((p) => p.hosts.some((h) => host === h || host.endsWith(`.${h}`))) ?? null;
}

/**
 * True for a WhatsApp link a visitor can use: an https group invite (chat.whatsapp.com/<code>)
 * or a number link (wa.me/<number>). Anything else on WhatsApp is not drawn.
 */
export function isValidWhatsAppUrl(url: string | null | undefined): boolean {
  const u = parse(url);
  if (!u || u.protocol !== 'https:') return false;
  const host = u.hostname.toLowerCase();
  const path = u.pathname.replace(/^\/+|\/+$/g, '');
  return (host === 'wa.me' || host === 'chat.whatsapp.com') && path.length > 0;
}

/** The site's own name for an unknown address, like "example.org". */
export function domainOf(url: string | null | undefined): string {
  const u = parse(url);
  return u ? bareHost(u) : '';
}

/**
 * One row as the site draws it, or null when it should not show: no address, an address that is
 * not a web link, or a WhatsApp address that is not an invite or number link.
 */
export function resolveSocialLink(row: {
  platform?: string | null;
  url?: string | null;
  label?: string | null;
}): SocialLink | null {
  const u = parse(row?.url);
  if (!u) return null;
  const url = row.url!.trim();
  const found = platformFromUrl(url);
  // The address wins; a stored dropdown choice only stands in for an address we do not know.
  const platform =
    found?.key ?? (row.platform && BY_KEY.has(row.platform) ? row.platform : 'Other');
  if (platform === 'WhatsApp' && !isValidWhatsAppUrl(url)) return null;
  const label = row.label?.trim();
  return { platform, url, ...(label ? { label } : {}) };
}

/**
 * The buttons to draw, in order. `pinnedFacebook` is an optional Facebook address kept outside the
 * list (a site's facts field); it joins the front only when the list has no Facebook entry.
 */
export function resolveSocialLinks(
  settings: RawSocialSettings | null | undefined,
  pinnedFacebook?: string | null,
): SocialLink[] {
  const listed = (settings?.socialLinks ?? [])
    .map((l) => (l ? resolveSocialLink(l) : null))
    .filter((l): l is SocialLink => l !== null);
  const links: SocialLink[] =
    listed.length > 0
      ? listed
      : [
          resolveSocialLink({ platform: 'Instagram', url: settings?.socialInstagram }),
          resolveSocialLink({ platform: 'Facebook', url: settings?.socialFacebook }),
        ].filter((l): l is SocialLink => l !== null);
  if (pinnedFacebook && !links.some((l) => l.platform === 'Facebook')) {
    const fb = resolveSocialLink({ platform: 'Facebook', url: pinnedFacebook });
    if (fb) links.unshift(fb);
  }
  return links.slice(0, MAX_SOCIAL_LINKS);
}

/**
 * The accessible name for an icon-only button: the editor's label, else the platform's name,
 * else the site's domain for an address we do not know.
 */
export function socialLabel(link: SocialLink): string {
  if (link.label) return link.label;
  const known = BY_KEY.get(link.platform);
  if (known) return known.name;
  return domainOf(link.url) || 'Social link';
}

/**
 * A gentle note for the Studio when an address looks odd (shown as a warning, never an error), or
 * null when it looks fine. The site still shows an odd link unless it is an unusable WhatsApp one.
 */
export function socialUrlWarning(url: string | null | undefined): string | null {
  if (!url) return null;
  const u = parse(url);
  if (!u) return 'This does not look like a web address. Paste the whole link, starting https://';
  const found = platformFromUrl(url);
  if (found?.key === 'WhatsApp' && !isValidWhatsAppUrl(url))
    return 'This WhatsApp link will not show. Use a group invite (https://chat.whatsapp.com/...) or a number link (https://wa.me/...).';
  const path = u.pathname.replace(/^\/+|\/+$/g, '');
  if (found && !path && !u.search)
    return `This is the ${found.name} home page, not your own page there. Open your page and copy its address.`;
  if (/(^|\.)(google\.[a-z.]+|bing\.com)$/.test(bareHost(u)) && /search/.test(u.pathname))
    return 'This looks like a search results page. Open the page itself and copy its address.';
  return null;
}

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// track.ts - GA4 events: the sender, the link classifier, the search sender
// =============================================================================
// PORTS.md card 217. One shared event layer for the site family. This file is
// the browser-free half: what a clicked link MEANS (classifyLink, pure, unit
// tested in track.test.ts) and how to send one event (track). The browser half
// is src/components/analytics/SiteEvents.astro, which listens for clicks and
// page changes. What counts as a giving link, a registration link or a watch
// link is NOT decided here: it is the site's own map, src/config/events.ts.
//
// SENDING IS A NO-OP UNLESS THE TAG LOADED. src/components/analytics/
// GoogleAnalytics.astro defines window.gtag only on the production hostname,
// outside automated browsers, and only when PUBLIC_GA_ID is set. Everywhere
// else window.gtag is undefined, so tests, previews and local builds need no
// stubbing and no condition of their own. Do not add a second guard here: the
// tag file owns that rule (cards 54, 58 and 96).
//
// NOTHING PERSONAL IS SENT. A link's kind and destination name (never the
// address of a mailto or tel link), the page region, a form's name, the page
// that was not found, search words (withheld when they look like an email
// address or a phone number). No names, emails or form contents.
//
// No imports on purpose: node runs this file directly in the unit tests.
// =============================================================================

export type Params = Record<string, string | number>;

/** What the classifier knows about one clicked link. */
export interface LinkInfo {
  /** The href attribute as written ('mailto:...', '/give', 'https://...'). */
  raw: string;
  /** The address resolved against the page. */
  url: URL;
  /** Lower-case host without a leading www. ('' for a link with no host). */
  host: string;
  /** Lower-case path ('' for a link with no path). */
  path: string;
  /** True when the link stays on this site (same host, www ignored). */
  own: boolean;
  /** The page region the link sits in: header, footer, nav, aside or page. */
  location: string;
}

/**
 * One line of a site's map: when a link looks like this, send this event.
 * Every condition given must hold; a rule with none matches every link.
 * The first matching rule wins, and the site's own rules run before the
 * built-in ones.
 */
export interface LinkRule {
  /** A host (matches it and its subdomains, www ignored), a list of them, or a pattern. */
  host?: string | string[] | RegExp;
  /** Tested on the lower-case path. */
  path?: RegExp;
  /** true: only links on this site. false: only links to other sites. */
  own?: boolean;
  /** Anything the fields above cannot say. */
  test?: (link: LinkInfo) => boolean;
  /** The GA4 event name, such as 'give_click'. */
  event: string;
  /**
   * The kind of link, in plain words, for the privacy page: 'links to the church app'.
   * Only needed for an event name the privacy page does not already know (event-kinds.ts).
   */
  describe?: string;
  /** Parameters sent with it. 'location' (the page region) is always added. */
  params?: Params | ((link: LinkInfo) => Params);
}

/** A site's events map (src/config/events.ts). Every field is optional. */
export interface EventsConfig {
  /** The site's own link rules: giving, registering, apps, social and so on. */
  links?: LinkRule[];
  /** Event names this site does not send, built-in or its own. */
  off?: string[];
  /** Elements whose coming into view is a form_view. Default: form[data-track-form]. */
  formSelector?: string;
  /** An ancestor marking a frame as a form (for embed_interact); any other frame is 'video'. */
  formFrameSelector?: string;
  /** The text of an article, for reading depth and time. Default: [data-article-body]. */
  articleSelector?: string;
  /** Present on the page that says "not found". Default: [data-page-not-found]. */
  notFoundSelector?: string;
}

export interface LinkHit {
  event: string;
  params: Params;
}

/** Does a host equal a name, or sit under it? ('maps.apple.com' is under 'apple.com'.) */
export function hostUnder(host: string, name: string): boolean {
  return host === name || host.endsWith('.' + name);
}

function hostMatches(host: string, want: LinkRule['host']): boolean {
  if (want === undefined) return true;
  if (want instanceof RegExp) return want.test(host);
  const list = Array.isArray(want) ? want : [want];
  return list.some((name) => hostUnder(host, name.replace(/^www\./, '').toLowerCase()));
}

function ruleMatches(rule: LinkRule, link: LinkInfo): boolean {
  if (rule.own !== undefined && rule.own !== link.own) return false;
  if (!hostMatches(link.host, rule.host)) return false;
  if (rule.path && !rule.path.test(link.path)) return false;
  if (rule.test && !rule.test(link)) return false;
  return true;
}

const DOWNLOAD = /\.(pdf|docx?|xlsx?|pptx?|csv|zip|epub|mp3|m4a|wav|mp4|mov)$/;

/** Rules that need no map: video, directions, downloads, links to other sites. */
const BUILT_IN: LinkRule[] = [
  {
    host: ['youtube.com', 'youtu.be', 'vimeo.com'],
    event: 'watch_click',
    params: (l) => ({
      destination: /\/streams|\/live/.test(l.path)
        ? 'streams'
        : /watch/.test(l.path) || l.host === 'youtu.be' || /vimeo/.test(l.host)
          ? 'video'
          : 'channel',
    }),
  },
  {
    test: (l) =>
      /maps/.test(l.host + l.path) &&
      ['google.com', 'apple.com', 'goo.gl'].some((name) => hostUnder(l.host, name)),
    event: 'directions_click',
  },
  {
    path: DOWNLOAD,
    event: 'download_click',
    params: (l) => ({
      file_extension: (DOWNLOAD.exec(l.path) as RegExpExecArray)[1],
      file_name: (l.path.split('/').pop() ?? '').slice(0, 80),
    }),
  },
  {
    own: false,
    test: (l) => l.host !== '' && /^https?:$/.test(l.url.protocol),
    event: 'outbound_click',
    params: (l) => ({ destination: l.host.slice(0, 80) }),
  },
];

/**
 * What a clicked link means, or null when it is not worth an event.
 *
 * @param raw         the href attribute as written
 * @param resolved    the same link resolved against the page (the anchor's .href)
 * @param ownHostname location.hostname of the page
 * @param location    the page region the link sits in
 */
export function classifyLink(
  raw: string,
  resolved: string,
  ownHostname: string,
  location: string,
  config: EventsConfig = {},
): LinkHit | null {
  const off = new Set(config.off ?? []);
  const done = (event: string, params: Params): LinkHit | null =>
    off.has(event) ? null : { event, params: { ...params, location } };

  // The address of an email or phone link is never read, only its kind.
  if (/^mailto:/i.test(raw)) return done('contact_click', { method: 'email' });
  if (/^tel:/i.test(raw)) return done('contact_click', { method: 'phone' });

  let url: URL;
  try {
    url = new URL(resolved);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const link: LinkInfo = {
    raw,
    url,
    host,
    path: url.pathname.toLowerCase(),
    own: host === ownHostname.replace(/^www\./, '').toLowerCase(),
    location,
  };

  for (const rule of [...(config.links ?? []), ...BUILT_IN]) {
    if (!ruleMatches(rule, link)) continue;
    const params = typeof rule.params === 'function' ? rule.params(link) : (rule.params ?? {});
    return done(rule.event, params);
  }
  return null;
}

// Events this site has switched off (EventsConfig.off). SiteEvents.astro sets
// it on every page, so a component calling track() directly honours the map too.
let switchedOff = new Set<string>();

export function setEventsOff(names: string[] = []): void {
  switchedOff = new Set(names);
}

/** Send one GA4 event from a component or script, or do nothing. */
export function track(name: string, params: Params = {}): void {
  if (typeof window === 'undefined' || switchedOff.has(name)) return;
  const gtag = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
  if (typeof gtag === 'function') gtag('event', name, params);
}

/** A search term as it may be sent: trimmed, lower case, 80 characters, or '(withheld)'. */
export function cleanSearchTerm(term: string): string {
  const t = String(term || '')
    .trim()
    .toLowerCase()
    .slice(0, 80);
  // Something typed into a search box that looks like an email or a phone number is not ours to keep.
  return /@|\d{7,}|(\d[\s.-]?){9,}/.test(t) ? '(withheld)' : t;
}

let searchTimer: ReturnType<typeof setTimeout> | undefined;
let lastTerm = '';

/**
 * The live search sends one event per finished search term, not one per
 * keystroke: the last term stands once the visitor has paused for 1.2 s.
 * Sends site_search, and search_no_results when nothing was found.
 */
export function trackSearch(term: string, results: number): void {
  if (typeof window === 'undefined') return;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const t = String(term || '')
      .trim()
      .toLowerCase()
      .slice(0, 80);
    if (!t || t === lastTerm) return;
    lastTerm = t;
    const params = { search_term: cleanSearchTerm(t), search_results: results };
    track('site_search', params);
    if (!results) track('search_no_results', params);
  }, 1200);
}

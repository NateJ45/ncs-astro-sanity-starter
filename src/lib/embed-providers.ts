// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// embed-providers - paste-and-go for the "Custom code or embed" block (PORTS.md card 172)
// =============================================================================
// An editor pastes a link or the embed code a service gave them. This file
// answers, from that alone:
//   - which service it is (the registry below);
//   - how to show it: a framed page with the right shape (16 by 9 for a video,
//     a fixed height for a podcast player or a calendar), code in its own box,
//     or code that runs directly on the page;
//   - which script origins the page's security policy must allow for it
//     (scripts/build-csp.mjs adds them only to the build that uses them).
//
// Nothing here is stored in Sanity: the block keeps what was pasted (embedUrl or
// embedCode, plus the "Runs directly on the page" switch) and the plan is worked
// out again on every build and in the Studio (rule 15).
//
// THE GUARD RAIL. Code that runs scripts from a service this registry does not
// know may not run directly on the page, even with the switch on: it is shown in
// its own sandboxed box instead, and the Studio says who must approve it.
// Approving means adding the service to EMBED_PROVIDERS here (in the starter,
// with a test), or, for a one-off widget on one site, its script origin to
// `site.embeds.approvedScriptOrigins` in src/data/site.ts, which callers pass
// in. Either way the script's own origin is in the built HTML, so build-csp.mjs
// allows it. A link from an unknown service still works: it is framed in a
// sandboxed iframe.
//
// The registry is generic on purpose: church services (Church Trac, Planning
// Center, Tithe.ly, Givelify, Subsplash, SignUpGenius) sit beside YouTube and
// Calendly and cost a site that never pastes them nothing. Their script hosts
// are each service's main domain, not yet checked against every real snippet:
// if one loads from elsewhere the Studio says "not known", and the fix is a
// registry line here.
//
// Pure string work, no imports: the Astro component, the Studio input and the
// build script all use it. Tested in embed-providers.test.ts.
// =============================================================================

/** How a framed provider page is drawn. */
export interface FrameSpec {
  /** The address the iframe loads. */
  src: string;
  /** CSS aspect-ratio ("16 / 9") when the content has a shape, such as a video. */
  aspect?: string;
  /** A fixed height in px when it does not (a podcast player, a calendar). */
  height?: number;
}

export interface EmbedProvider {
  id: string;
  /** The service's name as an editor knows it. */
  name: string;
  /** What it usually is, for the Studio's sentence ("a video"). */
  what: string;
  /** Hostnames (or parent domains) its pages and players live on. */
  hosts: string[];
  /** Hostnames its embed SCRIPTS load from; code using one is this provider's. */
  scriptHosts?: string[];
  /**
   * Turn a link an editor copied (a share link, a watch page) into the address that
   * can be framed. Return a problem sentence when the link cannot be framed.
   * Absent: the link is framed as it is.
   */
  frame?: (url: URL) => FrameSpec | { problem: string };
  /** Size used when `frame` is absent or gives none. */
  size?: Pick<FrameSpec, 'aspect' | 'height'>;
  /**
   * Script origins its code adds at RUNTIME (so they never appear as a
   * <script src> in the built HTML). Added to the policy only when a page uses it.
   */
  cspOrigins?: string[];
  /** The iframe's allow attribute (fullscreen, payment). */
  allow?: string;
}

const VIDEO_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
const WIDE = '16 / 9';

const param = (url: URL, name: string) => url.searchParams.get(name) ?? '';

/** YouTube: watch, share (youtu.be), Shorts, live and embed links; playlists too. */
function youtube(url: URL): FrameSpec | { problem: string } {
  const host = url.hostname.replace(/^(www\.|m\.)/, '');
  const path = url.pathname.split('/').filter(Boolean);
  let id = '';
  if (host === 'youtu.be') id = path[0] ?? '';
  else if (path[0] === 'watch') id = param(url, 'v');
  else if (['shorts', 'live', 'embed', 'v'].includes(path[0] ?? '')) id = path[1] ?? '';
  const list = param(url, 'list');
  if (id && /^[\w-]{6,}$/.test(id)) {
    const start = Number.parseInt(param(url, 't') || param(url, 'start'), 10);
    const query = Number.isFinite(start) && start > 0 ? `?start=${start}` : '';
    return { src: `https://www.youtube-nocookie.com/embed/${id}${query}`, aspect: WIDE };
  }
  if (list && /^[\w-]+$/.test(list)) {
    return {
      src: `https://www.youtube-nocookie.com/embed/videoseries?list=${list}`,
      aspect: WIDE,
    };
  }
  return {
    problem:
      'That YouTube link is not a video or a playlist. Open the video itself and copy its link.',
  };
}

/** Vimeo: vimeo.com/123, vimeo.com/123/abcdef (unlisted), player links. */
function vimeo(url: URL): FrameSpec | { problem: string } {
  const path = url.pathname.split('/').filter(Boolean);
  const at = path.findIndex((p) => /^\d+$/.test(p));
  if (at === -1) {
    return { problem: 'That Vimeo link is not a video. Open the video and copy its link.' };
  }
  const id = path[at];
  const hash =
    param(url, 'h') || (path[at + 1] && /^[\da-f]+$/i.test(path[at + 1]) ? path[at + 1] : '');
  return {
    src: `https://player.vimeo.com/video/${id}${hash ? `?h=${hash}` : ''}`,
    aspect: WIDE,
  };
}

/** Facebook: a video or reel link becomes Facebook's own video player. */
function facebook(url: URL): FrameSpec | { problem: string } {
  if (url.pathname.startsWith('/plugins/')) return { src: url.href, aspect: WIDE };
  const isVideo =
    url.hostname === 'fb.watch' ||
    /\/(videos|reel|watch)\b/.test(url.pathname) ||
    url.searchParams.has('v');
  if (!isVideo) {
    return {
      problem:
        'Only Facebook videos can be shown here. For a Facebook page itself, use the social links in Site settings.',
    };
  }
  return {
    src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url.href)}&show_text=false`,
    aspect: WIDE,
  };
}

/** Google Maps: an embed link as it is; a place or search link is turned into one. */
function googleMaps(url: URL): FrameSpec | { problem: string } {
  const height = 450;
  if (url.hostname === 'maps.app.goo.gl' || url.hostname === 'goo.gl') {
    return {
      problem:
        'That is a Google Maps share link, which cannot be shown on a page. In Google Maps, press Share, then Embed a map, and paste the code it gives you.',
    };
  }
  if (url.pathname.startsWith('/maps/embed')) return { src: url.href, height };
  const place = /\/maps\/(?:place|search)\/([^/]+)/.exec(url.pathname)?.[1];
  const q = param(url, 'q') || (place ? decodeURIComponent(place.replace(/\+/g, ' ')) : '');
  if (q) {
    return {
      src: `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`,
      height,
    };
  }
  return {
    problem:
      'That Google Maps link has no place in it. In Google Maps, press Share, then Embed a map, and paste the code it gives you.',
  };
}

/** Google Calendar: an embed link as it is; a "public address" (?cid=) is turned into one. */
function googleCalendar(url: URL): FrameSpec | { problem: string } {
  const height = 600;
  if (url.pathname.includes('/calendar/embed')) return { src: url.href, height };
  const cid = param(url, 'cid') || param(url, 'src');
  if (cid) {
    let calendar = cid;
    // The "share" link carries the calendar id base64-encoded.
    if (!cid.includes('@') && /^[A-Za-z0-9+/=_-]+$/.test(cid)) {
      try {
        const decoded = atob(cid.replace(/-/g, '+').replace(/_/g, '/'));
        if (decoded.includes('@')) calendar = decoded;
      } catch {
        /* keep it as it was */
      }
    }
    return {
      src: `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendar)}`,
      height,
    };
  }
  return {
    problem:
      'That Google Calendar link does not name a calendar. In Google Calendar open the calendar settings, find "Integrate calendar" and copy the embed code.',
  };
}

/** Google Forms: the form's own link, asked for in its embedded shape. */
function googleForms(url: URL): FrameSpec | { problem: string } {
  const height = 900;
  if (url.hostname === 'forms.gle') return { src: url.href, height };
  const m = /^\/forms\/(?:u\/\d+\/)?d\/(e\/)?([\w-]+)/.exec(url.pathname);
  if (!m) return { problem: 'That is not a Google Form link. Open the form and copy its link.' };
  if (!m[1]) {
    return {
      problem:
        'That is the link for editing the form. In the form, press Send, then the link icon, and paste that link instead.',
    };
  }
  return { src: `https://docs.google.com/forms/d/e/${m[2]}/viewform?embedded=true`, height };
}

/** Spotify: an episode, show, playlist, album or track link becomes its player. */
function spotify(url: URL): FrameSpec | { problem: string } {
  const path = url.pathname
    .split('/')
    .filter(Boolean)
    .filter((p) => !/^intl-/.test(p));
  if (path[0] === 'embed') path.shift();
  const [kind, id] = path;
  if (!kind || !id || !['episode', 'show', 'playlist', 'album', 'track', 'artist'].includes(kind)) {
    return { problem: 'That Spotify link is not an episode, show or playlist.' };
  }
  return {
    src: `https://open.spotify.com/embed/${kind}/${id}`,
    height: kind === 'episode' || kind === 'track' ? 152 : 352,
  };
}

/** Apple Podcasts: the same address on Apple's embed host. */
function applePodcasts(url: URL): FrameSpec | { problem: string } {
  if (!url.pathname.includes('/podcast/')) {
    return { problem: 'That Apple Podcasts link is not a podcast or an episode.' };
  }
  const episode = url.searchParams.has('i');
  return {
    src: `https://embed.podcasts.apple.com${url.pathname}${url.search}`,
    height: episode ? 175 : 450,
  };
}

/**
 * The registry. Order matters only where hosts overlap (none do today).
 * Adding a service: give it hosts, a size, and its script hosts if it hands out
 * code that loads scripts; then add a case to embed-providers.test.ts.
 */
export const EMBED_PROVIDERS: readonly EmbedProvider[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    what: 'a video',
    hosts: ['youtube.com', 'youtu.be', 'youtube-nocookie.com'],
    frame: youtube,
    allow: VIDEO_ALLOW,
  },
  {
    id: 'vimeo',
    name: 'Vimeo',
    what: 'a video',
    hosts: ['vimeo.com'],
    frame: vimeo,
    allow: VIDEO_ALLOW,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    what: 'a video',
    hosts: ['facebook.com', 'fb.watch'],
    frame: facebook,
    allow: VIDEO_ALLOW,
  },
  {
    id: 'google-maps',
    name: 'Google Maps',
    what: 'a map',
    // google.com is Maps only under /maps (googleMaps() refuses the rest).
    hosts: ['maps.google.com', 'maps.app.goo.gl', 'google.com/maps'],
    frame: googleMaps,
    allow: 'fullscreen',
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    what: 'a calendar',
    hosts: ['calendar.google.com'],
    frame: googleCalendar,
  },
  {
    id: 'google-forms',
    name: 'Google Forms',
    what: 'a form',
    hosts: ['docs.google.com/forms', 'forms.gle'],
    frame: googleForms,
  },
  {
    id: 'spotify',
    name: 'Spotify',
    what: 'a podcast player',
    hosts: ['open.spotify.com'],
    frame: spotify,
    allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture',
  },
  {
    id: 'apple-podcasts',
    name: 'Apple Podcasts',
    what: 'a podcast player',
    hosts: ['podcasts.apple.com', 'embed.podcasts.apple.com'],
    frame: applePodcasts,
    allow: 'autoplay *; encrypted-media *; clipboard-write',
  },
  {
    id: 'churchtrac',
    name: 'Church Trac',
    what: 'a giving page, form or calendar',
    hosts: ['churchtrac.com'],
    scriptHosts: ['churchtrac.com'],
    size: { height: 900 },
    allow: 'payment',
  },
  {
    id: 'planning-center',
    name: 'Planning Center',
    what: 'a sign-up, giving or calendar page',
    hosts: ['churchcenter.com', 'planningcenteronline.com'],
    scriptHosts: ['churchcenter.com'],
    size: { height: 900 },
    allow: 'payment',
  },
  {
    id: 'tithely',
    name: 'Tithe.ly',
    what: 'a giving page',
    hosts: ['tithe.ly', 'tithely.com'],
    scriptHosts: ['tithe.ly', 'tithely.com'],
    size: { height: 900 },
    allow: 'payment',
  },
  {
    id: 'givelify',
    name: 'Givelify',
    what: 'a giving page',
    hosts: ['givelify.com', 'giv.li'],
    scriptHosts: ['givelify.com'],
    size: { height: 900 },
    allow: 'payment',
  },
  {
    id: 'subsplash',
    name: 'Subsplash',
    what: 'a media or giving page',
    hosts: ['subsplash.com'],
    scriptHosts: ['subsplash.com'],
    size: { height: 700 },
    allow: `payment; ${VIDEO_ALLOW}`,
  },
  {
    id: 'signupgenius',
    name: 'SignUpGenius',
    what: 'a sign-up sheet',
    hosts: ['signupgenius.com'],
    scriptHosts: ['signupgenius.com'],
    size: { height: 900 },
  },
  {
    id: 'calendly',
    name: 'Calendly',
    what: 'a booking page',
    hosts: ['calendly.com'],
    scriptHosts: ['calendly.com'],
    size: { height: 700 },
  },
];

const BY_ID = new Map(EMBED_PROVIDERS.map((p) => [p.id, p]));

/** One provider by id (the build script reads ids off the page). */
export function providerById(id: string | null | undefined): EmbedProvider | undefined {
  return id ? BY_ID.get(id) : undefined;
}

/** Does a hostname belong to a domain ("www.youtube.com" belongs to "youtube.com")? */
function hostIs(hostname: string, domain: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, '');
  return h === domain || h.endsWith(`.${domain}`);
}

/** Does a URL match one of a provider's host entries ("google.com/maps" also checks the path)? */
function urlMatches(url: URL, entry: string): boolean {
  const slash = entry.indexOf('/');
  if (slash === -1) return hostIs(url.hostname, entry);
  return hostIs(url.hostname, entry.slice(0, slash)) && url.pathname.startsWith(entry.slice(slash));
}

/** Parse an http(s) address, or null. */
export function parseHttpUrl(value: unknown): URL | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!/^https?:\/\//i.test(text)) return null;
  try {
    return new URL(text);
  } catch {
    return null;
  }
}

/** The provider whose pages live at this address, if any. */
export function providerForUrl(value: unknown): EmbedProvider | undefined {
  const url = parseHttpUrl(value);
  if (!url) return undefined;
  return EMBED_PROVIDERS.find((p) => p.hosts.some((h) => urlMatches(url, h)));
}

/** The provider that owns a script origin, if any. */
export function providerForScript(src: string): EmbedProvider | undefined {
  const url = parseHttpUrl(src.startsWith('//') ? `https:${src}` : src);
  if (!url) return undefined;
  return EMBED_PROVIDERS.find((p) => (p.scriptHosts ?? []).some((h) => hostIs(url.hostname, h)));
}

// -----------------------------------------------------------------------------
// Reading pasted code
// -----------------------------------------------------------------------------

const decodeEntities = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

/** The parts of pasted code that matter for deciding how it may run. */
export interface CodeFacts {
  /** Every <script src>, as written. */
  scriptSrcs: string[];
  /** Any inline <script> with code in it. */
  inlineScripts: boolean;
  /** Any on*="..." attribute. */
  handlers: boolean;
  /** The src of the code's only iframe, when the code is nothing but one iframe. */
  loneIframeSrc: string | null;
}

export function readCode(code: unknown): CodeFacts {
  const text = typeof code === 'string' ? code : '';
  const scriptSrcs: string[] = [];
  let inlineScripts = false;
  for (const m of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const src = /\bsrc\s*=\s*["']?([^"' >]+)/i.exec(m[1])?.[1];
    if (src) scriptSrcs.push(decodeEntities(src));
    else if (m[2].trim()) inlineScripts = true;
  }
  // A <script src> with no closing tag still loads.
  for (const m of text.matchAll(
    /<script\b[^>]*\bsrc\s*=\s*["']?([^"' >]+)[^>]*>(?![\s\S]*?<\/script)/gi,
  )) {
    scriptSrcs.push(decodeEntities(m[1]));
  }
  const handlers = /<[a-z][^>]*\son[a-z]+\s*=/i.test(text);
  const withoutComments = text.replace(/<!--[\s\S]*?-->/g, '');
  const iframes = [...withoutComments.matchAll(/<iframe\b([^>]*)>/gi)];
  let loneIframeSrc: string | null = null;
  if (iframes.length === 1 && !scriptSrcs.length && !inlineScripts) {
    // Nothing else but wrapper tags and whitespace around it.
    const rest = withoutComments
      .replace(/<iframe\b[\s\S]*?(<\/iframe\s*>|$)/i, '')
      .replace(/<\/?(div|p|span|center|br)\b[^>]*>/gi, '')
      .trim();
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(iframes[0][1])?.[1];
    if (!rest && src) loneIframeSrc = decodeEntities(src.trim());
  }
  return { scriptSrcs: [...new Set(scriptSrcs)], inlineScripts, handlers, loneIframeSrc };
}

/** The origin of a script src, or null for a relative or odd one. */
function originOf(src: string): string | null {
  const url = parseHttpUrl(src.startsWith('//') ? `https:${src}` : src);
  return url ? url.origin : null;
}

// -----------------------------------------------------------------------------
// The plan
// -----------------------------------------------------------------------------

export interface EmbedInput {
  embedUrl?: string | null;
  embedCode?: string | null;
  runsOnPage?: boolean | null;
}

export type EmbedPlan =
  | { kind: 'none' }
  /** A framed page: a provider's player, or an unknown service in a sandboxed iframe. */
  | {
      kind: 'frame';
      provider?: EmbedProvider;
      src: string;
      aspect?: string;
      height?: number;
      allow?: string;
    }
  /** Pasted code in its own sandboxed box. `blocked`: the page was asked for and refused. */
  | { kind: 'box'; provider?: EmbedProvider; blocked?: boolean }
  /** Pasted code straight into the page (switch on, and the code is from a known service). */
  | { kind: 'page'; provider?: EmbedProvider }
  /** Cannot be shown as pasted; `message` says what to do instead. */
  | { kind: 'problem'; provider?: EmbedProvider; message: string };

function framePlan(src: string): EmbedPlan {
  const url = parseHttpUrl(src);
  if (!url) {
    return {
      kind: 'problem',
      message:
        'That does not look like a web address. Paste the whole link, starting with https://',
    };
  }
  const provider = providerForUrl(url.href);
  if (!provider) return { kind: 'frame', src: url.href };
  const spec = provider.frame ? provider.frame(url) : { src: url.href };
  if ('problem' in spec) return { kind: 'problem', provider, message: spec.problem };
  return {
    kind: 'frame',
    provider,
    src: spec.src,
    aspect: spec.aspect ?? provider.size?.aspect,
    height: spec.height ?? (spec.aspect ? undefined : provider.size?.height),
    allow: provider.allow,
  };
}

/**
 * How the block shows what was pasted. `approvedOrigins` are the script origins
 * this site has approved (site.embeds.approvedScriptOrigins in src/data/site.ts):
 * code from them may run on the page like a known provider's.
 */
export function planEmbed(input: EmbedInput, approvedOrigins: readonly string[] = []): EmbedPlan {
  const url = typeof input.embedUrl === 'string' ? input.embedUrl.trim() : '';
  const code = typeof input.embedCode === 'string' ? input.embedCode.trim() : '';
  if (url) return framePlan(url);
  if (!code) return { kind: 'none' };

  const facts = readCode(code);
  // Embed code that is only an iframe (most services' "embed" button) is framed
  // like a link, so it gets the provider's shape and never needs the page.
  if (facts.loneIframeSrc && parseHttpUrl(facts.loneIframeSrc)) {
    return framePlan(facts.loneIframeSrc);
  }

  const owners = facts.scriptSrcs.map((s) => providerForScript(s));
  const provider = owners.find(Boolean);
  if (!input.runsOnPage) return { kind: 'box', provider };

  const approved = new Set(approvedOrigins);
  const everySrcKnown = facts.scriptSrcs.every((s, i) => {
    if (owners[i]) return true;
    const origin = originOf(s);
    return origin !== null && approved.has(origin);
  });
  const runsScripts = facts.scriptSrcs.length > 0 || facts.inlineScripts || facts.handlers;
  // Inline code is allowed only alongside a known service's script (the usual
  // "load the widget, then start it" pair). Code that only runs its own
  // scripts, an AI-written widget say, stays in the box.
  const ok = !runsScripts || (facts.scriptSrcs.length > 0 && everySrcKnown);
  return ok ? { kind: 'page', provider } : { kind: 'box', provider, blocked: true };
}

/** What a paste should set on the block. */
export interface PasteResult {
  embedUrl?: string;
  embedCode?: string;
  runsOnPage: boolean;
  plan: EmbedPlan;
}

/**
 * Sort out whatever was pasted into the one paste box: a link goes in the web
 * address field, a lone iframe is reduced to its link, and code goes in the code
 * box, switched to run on the page when a known service's script needs it.
 */
export function readPaste(
  text: string,
  approvedOrigins: readonly string[] = [],
): PasteResult | null {
  const value = text.trim();
  if (!value) return null;
  if (parseHttpUrl(value) && !/\s/.test(value)) {
    return { embedUrl: value, runsOnPage: false, plan: planEmbed({ embedUrl: value }) };
  }
  const facts = readCode(value);
  if (facts.loneIframeSrc && parseHttpUrl(facts.loneIframeSrc)) {
    const src = facts.loneIframeSrc;
    return { embedUrl: src, runsOnPage: false, plan: planEmbed({ embedUrl: src }) };
  }
  const known =
    facts.scriptSrcs.length > 0 &&
    facts.scriptSrcs.every((s) => {
      if (providerForScript(s)) return true;
      const origin = originOf(s);
      return origin !== null && approvedOrigins.includes(origin);
    });
  const plan = planEmbed({ embedCode: value, runsOnPage: known }, approvedOrigins);
  return { embedCode: value, runsOnPage: known, plan };
}

/**
 * The script origins a provider's code needs in the policy: each script host and
 * its subdomains (a widget script often loads the rest of itself from a sibling
 * host, js.example.com then cdn.example.com), plus any listed `cspOrigins`.
 */
export function providerCspOrigins(provider: EmbedProvider | undefined): string[] {
  if (!provider) return [];
  const out = new Set<string>();
  for (const host of provider.scriptHosts ?? []) {
    out.add(`https://${host}`);
    out.add(`https://*.${host}`);
  }
  for (const origin of provider.cspOrigins ?? []) out.add(origin);
  return [...out];
}

/**
 * The script origins a plan needs added to the policy at build time. Only code
 * (in its box or on the page) runs under the page's policy; a framed page has
 * its own, so it needs nothing here.
 */
export function cspOriginsFor(plan: EmbedPlan): string[] {
  if (plan.kind !== 'box' && plan.kind !== 'page') return [];
  return providerCspOrigins(plan.provider);
}

/** The Studio's per-site words (the site's schema passes them; see EmbedPasteInput). */
export interface EmbedWords {
  /** Who approves a new service ("your web designer"). */
  approver?: string;
  /** The services named as examples in the empty block's sentence. */
  examples?: string;
}

export const DEFAULT_EMBED_WORDS: Required<EmbedWords> = {
  approver: 'your web designer',
  examples: 'YouTube, Google Maps, Spotify or Calendly',
};

/**
 * One plain sentence for the Studio: what the block recognized and what it will
 * do. `words` carries the site's own wording (who approves, which examples).
 */
export function describePlan(plan: EmbedPlan, words: EmbedWords = {}): string {
  const { approver, examples } = { ...DEFAULT_EMBED_WORDS, ...words };
  const name = 'provider' in plan && plan.provider ? plan.provider.name : '';
  switch (plan.kind) {
    case 'none':
      return `Paste a link or the embed code from a service such as ${examples}.`;
    case 'problem':
      return plan.message;
    case 'frame': {
      if (!plan.provider) {
        return 'This is not a service the website knows, so it is shown in a sandboxed frame. Pick a height below, and check it in Preview.';
      }
      const shape = plan.aspect
        ? 'wide, the shape of a video'
        : `${plan.height ?? 640} pixels tall`;
      return `Recognized ${name}, ${plan.provider.what}. It is shown ${shape}, sized for you.`;
    }
    case 'box':
      if (plan.blocked) {
        return `This code runs scripts from a service the website does not know, so it stays in its own box for safety, even with "Runs directly on the page" on. To let it run on the page, ask ${approver} to approve it.`;
      }
      return name
        ? `Recognized code from ${name}. It runs in its own box. If it does not work there, turn on "Runs directly on the page".`
        : 'Custom code. It runs in its own box, so it cannot change the rest of the website.';
    case 'page':
      return name
        ? `Recognized code from ${name}. It runs directly on the page, which ${name} needs.`
        : 'This code runs directly on the page. It has no scripts of its own.';
  }
}

/** True when the plan sets its own size, so the Height choice does nothing. */
export function plansOwnSize(plan: EmbedPlan): boolean {
  return plan.kind === 'frame' && Boolean(plan.aspect || plan.height);
}

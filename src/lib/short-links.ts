// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// short-links - the pure rules behind the Studio's Short links (PORTS.md card 171)
// =============================================================================
// An editor makes a short address such as /spring or /signup for a flyer, a
// card or a slide, and points it at a page on the website or at another
// website. Three places use this file and must agree:
//
//   1. the `shortLink` schema (src/sanity/schemaTypes/shortLink.ts), which
//      checks the address as it is typed and warns about clashes;
//   2. astro.config.mjs, which reads the published short links at BUILD time
//      and writes them into dist/client/_redirects (the short-links integration);
//   3. the QR code action (src/sanity/actions/qrCode.tsx), which encodes the
//      short address.
//
// HOW THEY ARE SERVED. Cloudflare Workers static assets read `_redirects`
// before serving any file, first match wins. Each short link is written TWICE,
// "/spring" and "/spring/", at the TOP of the file: the site uses trailingSlash
// 'always', so a typed "/spring" would otherwise take an extra hop (Astro's own
// redirect lines carry the slash only; see PORTS.md card 160), and a QR code or
// a printed card uses the slashless form. The status is 302 for a temporary
// link (an event, a season: browsers do not remember it, so it can be repointed
// next year) or 301 for a permanent one.
//
// Cloudflare's limits: 2,000 static redirect lines and 1,000 characters a line.
// Short links are capped at MAX_SHORT_LINKS (each is two lines), and the build
// skips an over-long target; both are logged rather than failing the build.
//
// EXPIRY is a date, read in the site's time zone (`site.timeZone` in
// src/data/site.ts, passed to todayIn by the build): the link works through
// that day. Content is statically built, so it stops at the first build after
// the day; a site that wants "the next morning" schedules a daily deploy.
//
// Pure string work, unit-tested in short-links.test.ts.
// =============================================================================

/** Two lines each in _redirects; well inside Cloudflare's 2,000. */
export const MAX_SHORT_LINKS = 200;
/** Cloudflare's per-line limit for _redirects. */
export const REDIRECT_LINE_LIMIT = 1000;
/** Cloudflare's limit on static redirect rules in one _redirects file. */
export const STATIC_REDIRECT_LIMIT = 2000;
/** The zone todayIn uses when the caller names none. Sites pass site.timeZone. */
export const DEFAULT_TIME_ZONE = 'UTC';

/** Lowercase letters, numbers and single dashes, 2 to 40 characters. */
const ADDRESS = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,39}$/;

/**
 * Tidy what an editor typed into a bare short address: "/Spring/", "spring",
 * "https://example.com/spring" all become "spring". Spaces and underscores become
 * dashes. Returns '' for nothing usable.
 */
export function normalizeShortAddress(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  let s = raw.trim().toLowerCase();
  s = s.replace(/^https?:\/\/[^/]+/, '');
  s = s.split(/[?#]/)[0];
  s = s.replace(/^\/+|\/+$/g, '');
  s = s.replace(/[\s_]+/g, '-').replace(/-{2,}/g, '-');
  return s;
}

/** What is wrong with an address's shape, in the editor's words, or null. */
export function shortAddressProblem(raw: unknown): string | null {
  const address = normalizeShortAddress(raw);
  if (!address) return 'Type the short address, like "spring" or "signup".';
  if (address.includes('/')) {
    return 'Keep it to one word or a few words joined by dashes, with no slashes, like "fall-festival".';
  }
  if (address.length < 2) return 'Make it at least two letters long.';
  if (address.length > 40) return 'Keep it under 40 characters, so it is easy to type.';
  if (!ADDRESS.test(address)) {
    return 'Use only letters, numbers and dashes, like "spring-2027". No spaces or other symbols.';
  }
  return null;
}

/** Everything a short address must not collide with. */
export interface ClashContext {
  /** Built-in routes (src/lib/reservedSlugs.ts). */
  reserved: ReadonlySet<string>;
  /** Top-level addresses a published page lives at now ("plan-your-visit"). */
  pages: readonly string[];
  /** Pages that are archived (not on the website) but still hold an address. */
  archivedPages?: readonly string[];
  /** Old addresses already forwarding: Redirects in the Studio and the launch list. */
  redirects: readonly string[];
  /** Other short links' addresses. */
  shortLinks: readonly string[];
}

export interface Clash {
  /** 'error' stops it working; 'warning' is worth knowing. */
  level: 'error' | 'warning';
  message: string;
}

const bare = (path: string) => normalizeShortAddress(path);

/**
 * The first clash for an address, or null. Pages and built-in routes always win
 * over a short link, so the build would skip it; the Studio says so first.
 */
export function shortLinkClash(raw: unknown, ctx: ClashContext): Clash | null {
  const address = normalizeShortAddress(raw);
  if (!address) return null;
  if (ctx.reserved.has(address)) {
    return {
      level: 'error',
      message: `/${address} is already part of the website. Pick another word, like "${address}-info".`,
    };
  }
  if (ctx.pages.some((p) => bare(p) === address)) {
    return {
      level: 'error',
      message: `A page already lives at /${address}/. Pick another word, or simply share that page's address.`,
    };
  }
  if (ctx.shortLinks.some((p) => bare(p) === address)) {
    return {
      level: 'error',
      message: `Another short link already uses /${address}. Open that one and change where it goes instead.`,
    };
  }
  if (ctx.redirects.some((p) => bare(p) === address)) {
    return {
      level: 'error',
      message: `/${address} already forwards somewhere, under Redirects (old links). Pick another word.`,
    };
  }
  if ((ctx.archivedPages ?? []).some((p) => bare(p) === address)) {
    return {
      level: 'warning',
      message: `An archived page used /${address}/. The short link works, but if that page comes back the page wins and the short link stops.`,
    };
  }
  return null;
}

/** 'YYYY-MM-DD' for `now` in the given IANA time zone (the site's own). */
export function todayIn(now: Date, timeZone = DEFAULT_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** True once the last day has passed (the link works THROUGH that day). */
export function isExpired(lastDay: unknown, today: string): boolean {
  return typeof lastDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(lastDay) && lastDay < today;
}

/** One published short link, as the build reads it. */
export interface ShortLinkDoc {
  _id?: string;
  _createdAt?: string;
  address?: string | null;
  /** 'page' or 'url'. */
  linkKind?: string | null;
  /** The page's address on this site, already worked out ("/journal/"). */
  pagePath?: string | null;
  url?: string | null;
  /** 'temporary' (302, the default) or 'permanent' (301). */
  lasting?: string | null;
  expires?: string | null;
}

export interface ShortLinkRule {
  address: string;
  destination: string;
  status: 301 | 302;
}

export interface ShortLinkPlan {
  rules: ShortLinkRule[];
  /** What was left out and why, for the build log. */
  skipped: { address: string; reason: string }[];
}

/** Where a short link goes, or null when it goes nowhere usable. */
export function shortLinkDestination(doc: ShortLinkDoc): string | null {
  if (doc.linkKind === 'url' || (!doc.linkKind && doc.url)) {
    const url = typeof doc.url === 'string' ? doc.url.trim() : '';
    if (!/^https?:\/\/[^\s/]+\.[^\s]+$/i.test(url)) return null;
    // _redirects splits on whitespace; a pasted link never has any, but be sure.
    return url.replace(/\s/g, '%20');
  }
  const path = typeof doc.pagePath === 'string' ? doc.pagePath.trim() : '';
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  // Rule 19: internal page addresses end in a slash.
  const [p, rest = ''] = path.split(/(?=[?#])/);
  return `${p.endsWith('/') ? p : `${p}/`}${rest}`;
}

/**
 * Turn the published short links into redirect rules: expired ones, clashes,
 * broken targets and anything past the cap are skipped with a reason. When two
 * short links share an address, the older one keeps it.
 */
export function planShortLinks(
  docs: readonly ShortLinkDoc[],
  ctx: Omit<ClashContext, 'shortLinks'>,
  today: string,
): ShortLinkPlan {
  const rules: ShortLinkRule[] = [];
  const skipped: ShortLinkPlan['skipped'] = [];
  const taken = new Set<string>();
  const ordered = [...(docs ?? [])].sort((a, b) =>
    String(a._createdAt ?? '').localeCompare(String(b._createdAt ?? '')),
  );
  for (const doc of ordered) {
    const address = normalizeShortAddress(doc.address);
    if (!address || shortAddressProblem(address)) {
      skipped.push({ address: String(doc.address ?? ''), reason: 'not a usable address' });
      continue;
    }
    if (isExpired(doc.expires, today)) {
      skipped.push({ address, reason: `expired after ${doc.expires}` });
      continue;
    }
    const clash = shortLinkClash(address, { ...ctx, shortLinks: [...taken] });
    if (clash?.level === 'error') {
      skipped.push({ address, reason: clash.message });
      continue;
    }
    const destination = shortLinkDestination(doc);
    if (!destination) {
      skipped.push({ address, reason: 'it does not say where to go' });
      continue;
    }
    if (bare(destination) === address) {
      skipped.push({ address, reason: 'it points at itself' });
      continue;
    }
    if (`/${address}/ ${destination} 302`.length > REDIRECT_LINE_LIMIT) {
      skipped.push({ address, reason: `the link is over ${REDIRECT_LINE_LIMIT} characters` });
      continue;
    }
    if (rules.length >= MAX_SHORT_LINKS) {
      skipped.push({ address, reason: `more than ${MAX_SHORT_LINKS} short links` });
      continue;
    }
    taken.add(address);
    rules.push({ address, destination, status: doc.lasting === 'permanent' ? 301 : 302 });
  }
  return { rules, skipped };
}

/** The _redirects lines for the rules: "/spring" and "/spring/" for each. */
export function renderShortLinkLines(rules: readonly ShortLinkRule[]): string[] {
  return rules.flatMap((r) => [
    `/${r.address} ${r.destination} ${r.status}`,
    `/${r.address}/ ${r.destination} ${r.status}`,
  ]);
}

/** How many redirect rules a _redirects body holds (comments and blanks aside). */
export function countRedirectRules(text: string): number {
  return String(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#')).length;
}

/**
 * The full short address for a QR code or a bulletin: the site's own domain and
 * no trailing slash ("https://example.com/spring"), the shortest form to type
 * and the least dense code to print. The build serves it in one hop.
 */
export function shortLinkUrl(siteUrl: string, address: unknown): string | null {
  const a = normalizeShortAddress(address);
  if (!a || shortAddressProblem(a)) return null;
  return `${siteUrl.replace(/\/+$/, '')}/${a}`;
}

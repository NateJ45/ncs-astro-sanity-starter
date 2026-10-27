// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// The latest video from a YouTube channel, read at BUILD time (PORTS.md card 197)
// =============================================================================
// Source: the public channel feed, https://www.youtube.com/feeds/videos.xml?channel_id=<UC...>.
// No API key, no quota: the newest 15 uploads as Atom. Built for FBC Auburn's "Last Sunday" replay
// (church-video.ts there, from First Baptist Muncie's parser) and generalised for any site that has
// a channel: a studio's latest talk, a shop's newest tutorial, a school's latest assembly.
//
// THE SAFE FAILURE IS THE FEATURE. Any problem (no channel id, a bad id, the network, a non-200,
// a timeout, an HTML error page served with a 200, a feed with nothing usable) gives `null`, the
// block draws nothing, and the build carries on. A video must never be able to fail a deploy.
// Failures are logged with console.warn so a quiet block can be explained.
//
// ONCE PER BUILD. Every page that shows the same channel shares one fetch (a module-level map of
// promises), so ten pages cost one request.
//
// WHICH VIDEO. The newest upload that has been watched at least once and is not in the future.
// A scheduled livestream or a premiere sits in the feed early with 0 views; skipping it keeps an
// empty stream off the page. An entry with no view count at all (the feed omits it sometimes) is
// kept, because we cannot tell.
//
// This file has no Astro or Vite imports, so `node --test` can run it.

/** One <entry> of the feed, decoded. */
export interface FeedEntry {
  videoId: string;
  title: string;
  /** ISO timestamp, as the feed wrote it. */
  published: string;
  /** media:statistics views, or null when the feed carried none. */
  views: number | null;
}

/** What the block draws. */
export interface LatestVideo {
  videoId: string;
  title: string;
  /** The ISO timestamp the channel published it. */
  published: string;
  watchUrl: string;
  /** The privacy-enhanced embed, autoplaying (only loaded when someone presses play). */
  embedUrl: string;
  /** hqdefault.jpg, 480 x 360, present for every public video. */
  thumbnailUrl: string;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** Decode the XML entities the feed uses (named, decimal and hex) and unwrap CDATA. */
export function decodeXml(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
      if (code[0] === '#') {
        const n =
          code[1] === 'x' || code[1] === 'X'
            ? parseInt(code.slice(2), 16)
            : parseInt(code.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : whole;
      }
      return ENTITIES[code.toLowerCase()] ?? whole;
    });
}

const tag = (xml: string, name: string): string => {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(xml);
  return m?.[1] !== undefined ? decodeXml(m[1]).trim() : '';
};

/** Every entry in a YouTube channel feed. Malformed entries are dropped. */
export function parseYoutubeFeed(xml: string | null | undefined): FeedEntry[] {
  if (!xml || !/<feed[\s>]/.test(xml)) return [];
  const out: FeedEntry[] = [];
  for (const [, body] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    if (!body) continue;
    const videoId = tag(body, 'yt:videoId');
    const title = tag(body, 'title');
    const published = tag(body, 'published');
    if (!/^[\w-]{11}$/.test(videoId) || !title || Number.isNaN(Date.parse(published))) continue;
    const views = /<media:statistics[^>]*\sviews="(\d+)"/.exec(body)?.[1];
    out.push({
      videoId,
      title: title.replace(/\s+/g, ' '),
      published,
      views: views === undefined ? null : Number(views),
    });
  }
  return out;
}

/** The newest watched upload as of `now`, or null. */
export function latestVideo(entries: FeedEntry[], now: Date): LatestVideo | null {
  const pick = entries
    .filter((e) => e.views !== 0 && Date.parse(e.published) <= now.getTime())
    .sort((a, b) => Date.parse(b.published) - Date.parse(a.published))[0];
  if (!pick) return null;
  return {
    videoId: pick.videoId,
    title: pick.title,
    published: pick.published,
    watchUrl: `https://www.youtube.com/watch?v=${pick.videoId}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${pick.videoId}?autoplay=1&rel=0`,
    thumbnailUrl: `https://i.ytimg.com/vi/${pick.videoId}/hqdefault.jpg`,
  };
}

const CHANNEL_ID = /UC[\w-]{22}/;

/**
 * The channel id from whatever an editor pasted: the bare id, or a youtube.com/channel/UC... link.
 * Returns '' when there is none. A @handle cannot be turned into an id without a request, so it
 * is not accepted; the Studio field says where to find the id.
 */
export function channelIdFrom(input: string | null | undefined): string {
  return CHANNEL_ID.exec(input ?? '')?.[0] ?? '';
}

export const feedUrl = (channelId: string) =>
  `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
export const channelUrl = (channelId: string) =>
  `https://www.youtube.com/channel/${encodeURIComponent(channelId)}`;

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/** Give up on a feed after this long, so a slow YouTube cannot stall a build. */
export const FEED_TIMEOUT_MS = 8000;

/**
 * Fetch a feed as text. Two tries, a timeout on each, and `null` when neither gives a document
 * `looksRight` accepts. Never throws.
 */
export async function fetchFeed(
  url: string,
  looksRight: (text: string) => boolean,
  label: string,
  fetchImpl: Fetch = fetch,
  timeoutMs: number = FEED_TIMEOUT_MS,
  log: (msg: string) => void = (m) => console.warn(m),
): Promise<string | null> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        signal: controller.signal,
        // The prerender runtime can send no User-Agent at all, and some feed hosts answer that
        // with a 403 (measured on a church calendar feed, 2026-09-25). YouTube does not mind.
        headers: {
          Accept: 'application/atom+xml, application/xml;q=0.9, */*;q=0.1',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'Mozilla/5.0 (compatible; website-build)',
        },
      });
      const text = await res.text();
      if (res.ok && looksRight(text)) return text;
      log(
        `[${label}] try ${attempt}: HTTP ${res.status}, not usable: ${JSON.stringify(text.slice(0, 120))}`,
      );
    } catch (err) {
      const aborted = (err as Error)?.name === 'AbortError';
      log(
        `[${label}] try ${attempt}: ${aborted ? `timed out after ${timeoutMs} ms` : String(err)}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

const shared = new Map<string, Promise<FeedEntry[] | null>>();

/**
 * The channel's latest watched video, or null (no channel id, feed down, nothing usable).
 * `channel` can be the bare id or a pasted channel link. One fetch per channel per build.
 */
export function loadLatestVideo(
  channel: string | null | undefined,
  fetchImpl: Fetch = fetch,
  now: Date = new Date(),
): Promise<LatestVideo | null> {
  const id = channelIdFrom(channel);
  if (!id) return Promise.resolve(null);
  let entries = shared.get(id);
  if (!entries) {
    entries = fetchFeed(feedUrl(id), (t) => /<feed[\s>]/.test(t), `youtube-feed ${id}`, fetchImpl)
      .then((xml) => (xml ? parseYoutubeFeed(xml) : null))
      .catch(() => null);
    shared.set(id, entries);
  }
  return entries.then((list) => (list ? latestVideo(list, now) : null));
}

/** Test hook: forget the once-per-build answers. */
export function resetYoutubeFeeds(): void {
  shared.clear();
}

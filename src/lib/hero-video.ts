// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// hero-video: the photo hero's silent background clip (PORTS.md card 189, from FBC Auburn)
// =============================================================================
// An opening banner set to "Photo behind the words" can play a short silent clip over its
// background photo; the photo stays underneath as the clip's poster and is all that shows when the
// clip should not play. This file holds the decisions, so they are unit tested
// (hero-video.test.ts) and shared by the Studio field (sections.ts) and the hero's script
// (HeroVideo.astro):
//   - which uploads count as a hero video (mp4 or webm only), and the size budgets;
//   - which copy a visitor gets: the "Phone video" (about 640px wide and a few hundred KB) below
//     768px when one is uploaded, else the main clip. Sanity serves files as uploaded and does not
//     transcode them, so the small copy is a second upload, chosen by the hero's script before any
//     request is made;
//   - whether this visitor gets the clip at all: never with reduced motion, Save-Data or a slow
//     connection (2G, 3G, or a measured downlink under 1 Mbps), and never in print, which shows
//     the photo;
//   - whether an .mp4 is saved for fast start (the Studio warns when it is not).

/** The file types the field takes; the Studio's file picker is limited to these too. */
export const HERO_VIDEO_TYPES = ['video/mp4', 'video/webm'] as const;
export const HERO_VIDEO_ACCEPT = HERO_VIDEO_TYPES.join(',');

/**
 * The size budget the Studio warns above (bytes): a 20 second
 * 720p clip with no sound exported for the web is 1 to 3 MB.
 */
export const HERO_VIDEO_BUDGET = 3 * 1024 * 1024;
/** The phone copy's budget (bytes): 640px wide, 15 to 20 seconds, is 200 to 500 KB. */
export const HERO_PHONE_VIDEO_BUDGET = 1024 * 1024;
/** Below this width the hero plays the phone copy (the site's phone breakpoint). */
export const HERO_PHONE_QUERY = '(max-width: 767px)';

export interface HeroVideoAsset {
  url?: string | null;
  mimeType?: string | null;
  size?: number | null;
}

/** The clip's URL and type when the upload is a playable hero video, else null. */
export function heroVideoSource(
  asset: HeroVideoAsset | null | undefined,
): { url: string; type: string } | null {
  const url = asset?.url?.trim();
  const type = asset?.mimeType ?? '';
  if (!url || !(HERO_VIDEO_TYPES as readonly string[]).includes(type)) return null;
  return { url, type };
}

/**
 * The Studio's note on an upload: an error for a type the hero cannot play, a warning over the
 * size budget (the main clip's, or the phone copy's), else nothing. Plain words, because the
 * site's editor reads them.
 */
export function heroVideoProblem(
  asset: HeroVideoAsset | null | undefined,
  kind: 'main' | 'phone' = 'main',
): { level: 'error' | 'warning'; message: string } | null {
  if (!asset) return null;
  if (asset.mimeType && !(HERO_VIDEO_TYPES as readonly string[]).includes(asset.mimeType)) {
    return { level: 'error', message: 'The video must be an .mp4 or .webm file.' };
  }
  const budget = kind === 'phone' ? HERO_PHONE_VIDEO_BUDGET : HERO_VIDEO_BUDGET;
  if (typeof asset.size === 'number' && asset.size > budget) {
    const size =
      asset.size < 1024 * 1024
        ? `${Math.round(asset.size / 1024)} KB`
        : `${(asset.size / 1024 / 1024).toFixed(1)} MB`;
    return {
      level: 'warning',
      message:
        kind === 'phone'
          ? `This phone video is ${size}. Keep it under 1 MB (640 pixels wide, no sound, 15 to 20 seconds) so it plays quickly on a phone signal.`
          : `This video is ${size}. Keep it under 3 MB (shorter, or exported at 720p with no sound) so the page loads quickly.`,
    };
  }
  return null;
}

export interface HeroVideoChoice {
  url: string;
  type: string;
}

/** The copy this visitor gets: the phone copy on a phone screen when there is one, else the main clip. */
export function heroVideoPick(
  main: HeroVideoChoice | null,
  phone: HeroVideoChoice | null,
  isPhone: boolean,
): HeroVideoChoice | null {
  if (isPhone && phone) return phone;
  return main ?? phone;
}

/** How many bytes of an upload the Studio reads to judge fast start (one range request). */
export const FAST_START_PROBE_BYTES = 64 * 1024;

/**
 * Whether an .mp4 is saved for fast start: its index (`moov`) comes before the video
 * data (`mdat`), so a browser can start playing after the first few hundred KB and stream the rest
 * through range requests. With the index at the end it must fetch nearly the whole file before the
 * first frame. Reads the top-level boxes in the first bytes of the file: true when `moov` comes
 * first, false when `mdat` does, null when it cannot tell (not an mp4, or neither box in reach).
 */
export function mp4FastStart(bytes: Uint8Array): boolean | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  while (offset + 8 <= bytes.byteLength) {
    let size = view.getUint32(offset);
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (offset === 0 && type !== 'ftyp') return null;
    if (type === 'moov') return true;
    if (type === 'mdat') return false;
    // size 1: a 64-bit size follows; size 0: the box runs to the end of the file.
    if (size === 1) {
      if (offset + 16 > bytes.byteLength) return null;
      size = Number(view.getBigUint64(offset + 8));
    }
    if (size < 8) return null;
    offset += size;
  }
  return null;
}

/**
 * Reads the first bytes of an uploaded .mp4 (one range request; Sanity's CDN answers ranges and
 * CORS) and judges fast start. null when it cannot tell or the request fails, so a network
 * hiccup in the Studio never raises a false warning.
 */
export async function checkFastStart(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean | null> {
  try {
    const res = await fetchImpl(url, {
      headers: { Range: `bytes=0-${FAST_START_PROBE_BYTES - 1}` },
    });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    return mp4FastStart(bytes.subarray(0, FAST_START_PROBE_BYTES));
  } catch {
    return null;
  }
}

export const FAST_START_MESSAGE =
  'This video is not set up to start playing straight away: visitors would wait for most of it to download before it moves. Export it again with "Fast start" or "Web optimized" turned on (in HandBrake, Premiere, CapCut and most editors), then upload that file.';

export interface MotionContext {
  /** matchMedia('(prefers-reduced-motion: reduce)').matches */
  reducedMotion: boolean;
  /** navigator.connection.saveData */
  saveData?: boolean;
  /** navigator.connection.effectiveType: 'slow-2g', '2g', '3g' or '4g' */
  effectiveType?: string;
  /** navigator.connection.downlink: the browser's estimate in Mbps (0 or missing when unknown) */
  downlink?: number;
  /** matchMedia('print').matches */
  print?: boolean;
}

const SLOW = new Set(['slow-2g', '2g', '3g']);
/** A measured downlink under this (Mbps) keeps the still, even when the browser calls it 4G. */
export const SLOW_DOWNLINK_MBPS = 1;

/** True when this visitor should get the clip; false keeps the still photo. */
export function heroVideoAllowed(ctx: MotionContext): boolean {
  if (ctx.reducedMotion || ctx.print) return false;
  if (ctx.saveData) return false;
  if (ctx.effectiveType && SLOW.has(ctx.effectiveType)) return false;
  if (typeof ctx.downlink === 'number' && ctx.downlink > 0 && ctx.downlink < SLOW_DOWNLINK_MBPS)
    return false;
  return true;
}

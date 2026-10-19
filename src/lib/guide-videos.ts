// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Guide videos: the site's own clips, by key (Studio kit, card 137)
// =============================================================================
// Card 115 let a guide carry `video`: a file path or a YouTube or Vimeo link.
// Card 137 adds the site's OWN recorded clips (tools/tutorial-videos/), kept in
// a registry the way card 130 keeps screenshots: src/sanity/guides/videos.ts
// (site-owned) maps a key to the mp4, the webm, the poster and the captions.
// A guide asks for one by key, either as its `video` ("post-a-notice") or as a
// block in its body ({ kind: 'video', key: 'post-a-notice' }). Anything that is
// not a key falls back to card 115's videoSource(), so old guides still play.
// Tested in src/lib/guide-videos.test.ts.
// =============================================================================

import { videoSource, type VideoSource } from './studio-home.ts';

/** One recorded clip, as tools/tutorial-videos/record.mjs prints it. */
export interface GuideVideoData {
  /** The H.264 mp4 in public/ ("/guide-videos/post-a-notice.mp4"). Plays everywhere. */
  src: string;
  /** The VP9 webm, smaller where it plays. Optional. */
  webm?: string;
  /** The still shown before Play (a JPEG or WebP in public/). */
  poster: string;
  /** WebVTT captions (public/). Every clip should have them. */
  captions?: string;
  /** The clip's title, for the player and the row. */
  title: string;
  /** Length in seconds, shown as "1:05". */
  duration?: number;
  width?: number;
  height?: number;
}

/** A guide body block that plays one of the site's clips. */
export interface GuideVideoBlock {
  key: string;
  /** One line under the player. */
  caption?: string;
}

export type ResolvedVideo = { kind: 'clip'; clip: GuideVideoData } | VideoSource;

const KEY = /^[a-z0-9][a-z0-9-]*$/;
const LOCAL = (p: string | undefined) => !p || (p.startsWith('/') && !p.startsWith('//'));

/** A guide's `video` (or a block's key) to something playable, or null. */
export function resolveVideo(
  ref: string | null | undefined,
  registry: Record<string, GuideVideoData>,
): ResolvedVideo | null {
  const v = (ref ?? '').trim();
  if (!v) return null;
  if (KEY.test(v)) {
    const clip = registry[v];
    return clip && LOCAL(clip.src) && clip.src ? { kind: 'clip', clip } : null;
  }
  return videoSource(v);
}

/** The guides with something playable, in their own order. */
export function playableGuides<G extends { video?: string | null }>(
  guides: G[],
  registry: Record<string, GuideVideoData>,
): G[] {
  return guides.filter((g) => resolveVideo(g.video, registry) !== null);
}

/** "1:05". */
export function clipLength(seconds: number | undefined): string {
  if (!seconds || seconds < 1) return '';
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Problems with the registry, in plain words. `exists(path)` says whether a
 * public/ file is there (the unit test passes a real check).
 */
export function videoRegistryProblems(
  registry: Record<string, GuideVideoData>,
  exists: (publicPath: string) => boolean = () => true,
): string[] {
  const out: string[] = [];
  for (const [key, c] of Object.entries(registry)) {
    if (!KEY.test(key)) out.push(`${key}: keys are lower-case words joined by hyphens.`);
    if (!c.title?.trim()) out.push(`${key}: needs a title.`);
    for (const [name, p] of [
      ['src', c.src],
      ['webm', c.webm],
      ['poster', c.poster],
      ['captions', c.captions],
    ] as const) {
      if (p === undefined) continue;
      if (!LOCAL(p)) out.push(`${key}: ${name} must be a file in public/ ("/guide-videos/...").`);
      else if (!exists(p)) out.push(`${key}: ${name} ${p} is missing from public/.`);
    }
    if (!c.src?.endsWith('.mp4')) out.push(`${key}: src should be the .mp4.`);
    if (!c.poster) out.push(`${key}: needs a poster.`);
    if (!c.captions) out.push(`${key}: needs captions (.vtt).`);
    if (/—/.test(c.title ?? '')) out.push(`${key}: the title has an em-dash.`);
  }
  return out;
}

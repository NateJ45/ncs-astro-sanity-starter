// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// "Watch how it is done": guide videos (Studio kit, PORTS.md cards 115 and 137)
// =============================================================================
// A guide in src/sanity/guides/content.ts may carry `video`: a key in the
// site's clip registry (src/sanity/guides/videos.ts, card 137), a file in
// public/, a YouTube or Vimeo link, or any https address. Guides with one show
// here, on Home (the first few) and in the Site Guide (all of them, and a Watch
// button on the open guide). With none, nothing renders. A guide's body can
// also hold a clip in place: { kind: 'video', key } (GuideClip below).
//
// Nothing heavy loads until Play is pressed. A site clip shows its poster (a
// lazy image) with a Play button; pressing it puts the <video> in place, mp4
// and webm sources, captions on by default. Players from YouTube or Vimeo open
// in a dialog, so Home never pulls in a third party on every visit. How each
// address plays is decided by resolveVideo() in src/lib/guide-videos.ts.
// =============================================================================

import { useState } from 'react';
import { PlayIcon } from '@sanity/icons/Play';
import { Box, Button, Card, Dialog, Flex, Grid, Stack, Text } from '@sanity/ui';
import {
  clipLength,
  playableGuides,
  resolveVideo,
  type GuideVideoData,
} from '../../lib/guide-videos';
import { GUIDE_VIDEOS } from '../guides/videos';
import type { KitGuide } from './types';

const CLIP_CSS = `
.ncs-clip{position:relative;display:block;width:100%;aspect-ratio:var(--ncs-clip-ratio,16/10);border:0;padding:0;border-radius:8px;overflow:hidden;background:#111;cursor:pointer}
.ncs-clip img{width:100%;height:100%;object-fit:cover;display:block}
.ncs-clip__play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:inline-flex;align-items:center;gap:8px;padding:12px 20px 12px 16px;border-radius:999px;background:rgb(0 0 0 / .72);color:#fff;font:600 16px/1 system-ui,sans-serif}
.ncs-clip__play svg{width:24px;height:24px}
.ncs-clip:hover .ncs-clip__play,.ncs-clip:focus-visible .ncs-clip__play{background:rgb(0 0 0 / .9)}
.ncs-clip:focus-visible{outline:3px solid #2563eb;outline-offset:3px}
.ncs-clip__len{position:absolute;right:10px;bottom:10px;padding:3px 8px;border-radius:6px;background:rgb(0 0 0 / .72);color:#fff;font:600 13px/1.2 system-ui,sans-serif}
`;

/** One site clip: the poster and Play, then the player in its place. */
export function GuideClip({
  clip,
  autoPlay = true,
  caption,
}: {
  clip: GuideVideoData;
  autoPlay?: boolean;
  caption?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const ratio = clip.width && clip.height ? `${clip.width}/${clip.height}` : '16/10';
  return (
    <figure style={{ margin: 0, display: 'grid', gap: 8 }}>
      <style>{CLIP_CSS}</style>
      {playing ? (
        <video
          controls
          autoPlay={autoPlay}
          playsInline
          preload="metadata"
          poster={clip.poster}
          style={{ width: '100%', aspectRatio: ratio, borderRadius: 8, background: '#000' }}
        >
          {clip.webm && <source src={clip.webm} type="video/webm" />}
          <source src={clip.src} type="video/mp4" />
          {clip.captions && (
            <track kind="captions" src={clip.captions} srcLang="en" label="English" default />
          )}
        </video>
      ) : (
        <button
          type="button"
          className="ncs-clip"
          style={{ ['--ncs-clip-ratio' as string]: ratio }}
          onClick={() => setPlaying(true)}
          aria-label={`Play the video: ${clip.title}${clip.duration ? ` (${clipLength(clip.duration)})` : ''}`}
        >
          <img src={clip.poster} alt="" loading="lazy" decoding="async" />
          <span className="ncs-clip__play" aria-hidden>
            <PlayIcon /> Play
          </span>
          {clip.duration ? (
            <span className="ncs-clip__len" aria-hidden>
              {clipLength(clip.duration)}
            </span>
          ) : null}
        </button>
      )}
      {caption && (
        <figcaption style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--ui-muted, inherit)' }}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/** A guide body block: { kind: 'video', key, caption? }. A key with no clip draws nothing. */
export function GuideVideoBlockView({ videoKey, caption }: { videoKey: string; caption?: string }) {
  const r = resolveVideo(videoKey, GUIDE_VIDEOS);
  return r?.kind === 'clip' ? <GuideClip clip={r.clip} caption={caption} autoPlay /> : null;
}

/** The player for one guide's video, inside a dialog. */
export function VideoDialog({ guide, onClose }: { guide: KitGuide; onClose: () => void }) {
  const source = resolveVideo(guide.video, GUIDE_VIDEOS);
  if (!source) return null;
  return (
    <Dialog id={`guide-video-${guide.slug}`} header={guide.title} onClose={onClose} width={3}>
      <Box padding={3}>
        {source.kind === 'clip' ? (
          <GuideClip clip={source.clip} />
        ) : source.kind === 'file' ? (
          <video
            src={source.src}
            controls
            autoPlay
            preload="metadata"
            style={{ width: '100%', maxHeight: '70vh', borderRadius: 6, background: '#000' }}
          >
            <track kind="captions" />
          </video>
        ) : (
          <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
            <iframe
              src={source.src}
              title={guide.title}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                border: 0,
                borderRadius: 6,
              }}
            />
          </div>
        )}
      </Box>
    </Dialog>
  );
}

/** "Watch" for one guide: a dialog for files and players, a new tab for anything else. */
export function WatchButton({
  guide,
  text = 'Watch',
  fontSize = 1,
}: {
  guide: KitGuide;
  text?: string;
  fontSize?: number;
}) {
  const [open, setOpen] = useState(false);
  const source = resolveVideo(guide.video, GUIDE_VIDEOS);
  if (!source) return null;
  if (source.kind === 'link') {
    return (
      <Button
        as="a"
        href={source.src}
        target="_blank"
        rel="noopener noreferrer"
        icon={PlayIcon}
        text={`${text} (opens a new tab)`}
        mode="ghost"
        tone="primary"
        fontSize={fontSize}
        padding={2}
      />
    );
  }
  return (
    <>
      <Button
        icon={PlayIcon}
        text={text}
        mode="ghost"
        tone="primary"
        fontSize={fontSize}
        padding={2}
        onClick={() => setOpen(true)}
      />
      {open && <VideoDialog guide={guide} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Does this guide have something to play? */
export function hasVideo(guide: KitGuide): boolean {
  return resolveVideo(guide.video, GUIDE_VIDEOS) !== null;
}

/**
 * The row of clips. `max` limits how many show (Home shows three); `footer`
 * sits under them (Home's "More in the Site Guide"). No videos: renders nothing.
 * A site clip shows its poster and plays in place; others open a dialog.
 */
export function GuideVideos({
  guides,
  max,
  footer,
}: {
  guides: KitGuide[];
  max?: number;
  footer?: (hidden: number) => React.ReactNode;
}) {
  const all = playableGuides(guides, GUIDE_VIDEOS);
  if (!all.length) return null;
  const shown = typeof max === 'number' ? all.slice(0, max) : all;
  return (
    <Stack gap={3}>
      <Grid gridTemplateColumns={[1, 2, Math.min(shown.length, 3)]} gap={3}>
        {shown.map((g) => {
          const r = resolveVideo(g.video, GUIDE_VIDEOS);
          return (
            <Card key={g.slug} padding={3} radius={3} border>
              <Stack gap={3}>
                {r?.kind === 'clip' && <GuideClip clip={r.clip} />}
                <Flex gap={2} align="flex-start">
                  {r?.kind !== 'clip' && (
                    <Text size={2} muted>
                      <PlayIcon />
                    </Text>
                  )}
                  <Stack gap={2} flex={1}>
                    <Text size={2} weight="semibold">
                      {g.title}
                    </Text>
                    <Text size={1} muted style={{ lineHeight: 1.5 }}>
                      {g.lead}
                    </Text>
                  </Stack>
                </Flex>
                {r?.kind !== 'clip' && (
                  <Flex>
                    <WatchButton guide={g} />
                  </Flex>
                )}
              </Stack>
            </Card>
          );
        })}
      </Grid>
      {footer?.(all.length - shown.length)}
    </Stack>
  );
}

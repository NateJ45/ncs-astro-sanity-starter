// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// "Watch how it is done": guide videos (Studio kit, PORTS.md card 115)
// =============================================================================
// A guide in src/sanity/guides/content.ts may carry `video`: a file in public/
// ("/guides/post-a-notice.mp4"), a YouTube or Vimeo link, or any https address.
// Guides with one show here, on Home (the first few) and in the Site Guide (all
// of them, and a Watch button on the open guide). With none, nothing renders.
//
// Nothing loads until Watch is pressed: the player opens in a dialog, so Home
// never pulls in YouTube on every visit. How each address plays is decided by
// videoSource() in src/lib/studio-home.ts (unit-tested).
// =============================================================================

import { useState } from 'react';
import { PlayIcon } from '@sanity/icons/Play';
import { Box, Button, Card, Dialog, Flex, Grid, Stack, Text } from '@sanity/ui';
import { guidesWithVideo, videoSource } from '../../lib/studio-home';
import type { KitGuide } from './types';

/** The player for one guide's video, inside a dialog. */
export function VideoDialog({ guide, onClose }: { guide: KitGuide; onClose: () => void }) {
  const source = videoSource(guide.video);
  if (!source) return null;
  return (
    <Dialog id={`guide-video-${guide.slug}`} header={guide.title} onClose={onClose} width={3}>
      <Box padding={3}>
        {source.kind === 'file' ? (
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
  const source = videoSource(guide.video);
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

/**
 * The row of clips. `max` limits how many show (Home shows three); `footer`
 * sits under them (Home's "More in the Site Guide"). No videos: renders nothing.
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
  const all = guidesWithVideo(guides);
  if (!all.length) return null;
  const shown = typeof max === 'number' ? all.slice(0, max) : all;
  return (
    <Stack gap={3}>
      <Grid gridTemplateColumns={[1, 2, Math.min(shown.length, 3)]} gap={3}>
        {shown.map((g) => (
          <Card key={g.slug} padding={3} radius={3} border>
            <Stack gap={3}>
              <Flex gap={2} align="flex-start">
                <Text size={2} muted>
                  <PlayIcon />
                </Text>
                <Stack gap={2} flex={1}>
                  <Text size={2} weight="semibold">
                    {g.title}
                  </Text>
                  <Text size={1} muted style={{ lineHeight: 1.5 }}>
                    {g.lead}
                  </Text>
                </Stack>
              </Flex>
              <Flex>
                <WatchButton guide={g} />
              </Flex>
            </Stack>
          </Card>
        ))}
      </Grid>
      {footer?.(all.length - shown.length)}
    </Stack>
  );
}

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Site Guide: the help, as a top-bar tool with search and print (Studio kit)
// =============================================================================
// The guides themselves are the site's own Help & Guide data
// (src/sanity/guides/content.ts, PORTS.md card 41). This tool adds what the
// desk list cannot: one index ("I want to..."), a search box that reads the
// whole text of every guide, and a Print button that prints just the open
// guide with a letterhead (a recipe for the fridge).
//
// Card 128: both screens are drawn in the kit's design language
// (kit/guide/GuideIndex.tsx and GuidePage.tsx, primitives in kit/ui/): the
// site's banner, section rules, stone steps, callouts and cards.
//
// Card 115: guides with a `video` show under "Watch how it is done", and an
// open guide with one has a Watch button (GuideVideos.tsx). No videos, no row.
//
// The open guide is kept in component state, not in the URL, on purpose: the
// tool is small, and a reload landing on the index is a fine place to restart.
// =============================================================================

import { useLayoutEffect, useRef, useState } from 'react';
import { Box, Button, Flex, Stack, Text } from '@sanity/ui';
import { GuideVideos, WatchButton, hasVideo } from './GuideVideos';
import { TourButton, startTour } from './StudioTour';
import { KitAction, KitScope } from './ui';
import { GuideIndex, guideMatches, searchWords } from './guide/GuideIndex';
import { GuidePage } from './guide/GuidePage';
import { useStaffView, useStudioLink } from './shared';
import type { KitConfig } from './types';

/** Print only the open guide, without the Studio around it. */
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  [data-kit-print], [data-kit-print] * { visibility: visible !important; }
  [data-kit-print] { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; }
  [data-kit-noprint] { display: none !important; }
}`;

/** The reading column: wide and generous, as the site's own pages are. */
const COLUMN = { maxWidth: 820, margin: '0 auto', width: '100%' };

export function makeGuideTool(config: KitConfig) {
  const { guides, categories } = config.guide;

  return function GuideTool() {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState<string | null>(null);
    const linkTo = useStudioLink();
    const { staffView } = useStaffView(config);
    const scroller = useRef<HTMLDivElement>(null);
    const openGuide = open ? guides.find((g) => g.slug === open) : undefined;
    const shown = guides.filter((g) => guideMatches(g, searchWords(query)));

    // A newly opened guide (or the index) starts at its top.
    useLayoutEffect(() => {
      scroller.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }, [open]);

    return (
      <Box
        ref={scroller}
        padding={[3, 4, 5]}
        paddingBottom={[6, 6, 7]}
        style={{ overflowY: 'auto', height: '100%' }}
      >
        {openGuide ? (
          <Stack gap={4} style={COLUMN}>
            <style>{PRINT_CSS}</style>
            <Flex gap={2} wrap="wrap" data-kit-noprint="">
              <Button
                text="← All guides"
                mode="ghost"
                fontSize={2}
                padding={3}
                onClick={() => setOpen(null)}
              />
              <Button
                text="Print this guide"
                mode="ghost"
                fontSize={2}
                padding={3}
                onClick={() => window.print()}
              />
              {hasVideo(openGuide) && (
                <WatchButton guide={openGuide} text="Watch how it is done" fontSize={2} />
              )}
            </Flex>
            <div data-kit-print="">
              <GuidePage
                guide={openGuide}
                guides={guides}
                helper={config.helper.name}
                siteName={config.siteName}
                onOpen={setOpen}
                linkTo={linkTo}
              />
            </div>
          </Stack>
        ) : (
          <div style={COLUMN} data-tour="guide-index">
            {/* Card 137: the tours, from Help as well as Home. */}
            {config.features.tour && (
              <KitScope>
                <div
                  style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 12 }}
                  data-kit-noprint=""
                >
                  <KitAction quiet onClick={() => startTour()}>
                    Show me around
                  </KitAction>
                  <TourButton tool="guide" staff={staffView} />
                </div>
              </KitScope>
            )}
            <GuideIndex
              guides={guides}
              categories={categories}
              helper={config.helper.name}
              query={query}
              onQuery={setQuery}
              onOpen={setOpen}
              videos={
                shown.some(hasVideo) ? (
                  <Stack gap={3} data-tour="guide-videos">
                    <Text size={1} weight="semibold" muted style={{ textTransform: 'uppercase' }}>
                      Watch how it is done
                    </Text>
                    <GuideVideos guides={shown} />
                  </Stack>
                ) : undefined
              }
            />
          </div>
        )}
      </Box>
    );
  };
}

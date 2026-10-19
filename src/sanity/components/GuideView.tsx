// Safe to edit by hand (the drawing is the kit's: src/sanity/kit/guide/GuidePage.tsx)
// =============================================================================
// GuideView: one Site Guide entry, read-only, in the desk and in the "Help for
// this page" panel
// =============================================================================
// PORTS.md card 41 (the guides as repo data), redrawn with card 128: the page
// is the kit's GuidePage, in the site's own design language (banner, section
// rules, stone steps, callouts, button copies, cards). This file only binds a
// guide slug to it and hands in the Studio's router, so "Where in the Studio"
// links and "See also" cards go somewhere.
//
// One instance per guide (bound to a slug at structure-build time via
// makeGuideView). The guides are DATA in ../guides/content.ts.
// =============================================================================

import type { ComponentType } from 'react';
import { Box, Text } from '@sanity/ui';
import { useWorkspace } from 'sanity';
import { guides, SITE } from '../guides/content';
import { GuidePage } from '../kit/guide/GuidePage';
import { useStudioLink } from '../kit/shared';
import type { GuideViewProps } from '../kit/types';

export function makeGuideView(slug: string): ComponentType<GuideViewProps> {
  return function GuideView({ variant = 'page', onOpen, section }: GuideViewProps) {
    const linkTo = useStudioLink();
    const { title } = useWorkspace();
    const guide = guides.find((g) => g.slug === slug);
    if (!guide) {
      return (
        <Box padding={4}>
          <Text>Guide not found.</Text>
        </Box>
      );
    }
    return (
      <Box padding={variant === 'panel' ? 3 : [3, 4, 5]}>
        <Box style={{ maxWidth: 820, margin: '0 auto' }}>
          <GuidePage
            guide={guide}
            guides={guides}
            helper={SITE.contactName}
            siteName={title}
            variant={variant}
            section={section}
            linkTo={linkTo}
            // See also opens that guide in the desk's Help & Guide list.
            onOpen={
              onOpen ??
              ((next) =>
                linkTo({ pane: `help-and-guide;guide-${next}` }).onClick({
                  preventDefault: () => {},
                } as never))
            }
          />
        </Box>
      </Box>
    );
  };
}

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words live in src/lib/studio-kit.ts navbarStatus)
// =============================================================================
// The calm status line under the top bar (Studio kit, PORTS.md card 110)
// =============================================================================
// "Website up to date" (neutral), "Updating the website, about 3 minutes"
// (primary, after a Publish), "The website update is taking longer than usual"
// (caution, past liveSlowAfterMinutes). The same data as Home's "Is it live?"
// card (useLiveData in shared.tsx), so the two can never disagree.
//
// A `studio.components.navbar` middleware: it ALWAYS renders
// props.renderDefault(props) first, so every plugin's navbar after this one
// still runs. With no build time to compare against (a fresh clone, a dev
// server without /build-info.json) it draws nothing at all.
// =============================================================================

import type { NavbarProps } from 'sanity';
import { Box, Card, Flex, Stack, Text } from '@sanity/ui';
import { navbarStatus } from '../../lib/studio-kit';
import { useLiveData, useStudioLink } from './shared';
import type { KitConfig } from './types';

export function makeNavbarStatus(config: KitConfig) {
  function StatusLine() {
    const data = useLiveData();
    const linkTo = useStudioLink();
    if (!data) return null;
    const status = navbarStatus(
      data.builtAt,
      data.lastPublish,
      data.now,
      config.liveSlowAfterMinutes,
      config.typicalUpdateMinutes,
    );
    if (!status) return null;
    const home = config.features.home ? linkTo({ tool: 'home' }) : null;
    return (
      <Card
        tone={status.tone}
        borderBottom
        paddingX={[3, 3, 4]}
        paddingY={2}
        role="status"
        aria-live="polite"
      >
        <Flex align="center" justify="flex-end" gap={2}>
          <Box
            aria-hidden
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              flexShrink: 0,
              // The tone's own badge dot colour, so the branded theme and dark
              // mode both apply; no literal colour here.
              background: 'var(--card-badge-default-dot-color, currentColor)',
              opacity: status.tone === 'default' ? 0.6 : 1,
            }}
          />
          <Text size={1} muted={status.tone === 'default'}>
            {status.text}
            {home && status.tone !== 'default' && (
              <>
                {' '}
                <a href={home.href} onClick={home.onClick}>
                  Details
                </a>
              </>
            )}
          </Text>
        </Flex>
      </Card>
    );
  }

  return function KitNavbar(props: NavbarProps) {
    return (
      <Stack>
        {props.renderDefault(props)}
        <StatusLine />
      </Stack>
    );
  };
}

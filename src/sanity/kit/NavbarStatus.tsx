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
// Card 111: when the deploy route (/api/studio/deploy-status/) says the newest
// deploy FAILED, that outranks everything: "The last update didn't go through.
// <helper> has been told." in the critical tone, with "Try again". A site
// without the route, or without its GitHub token, never sees this.
//
// A `studio.components.navbar` middleware: it ALWAYS renders
// props.renderDefault(props) first, so every plugin's navbar after this one
// still runs. Card 128: the line never clips (wraps instead) at any width.
// With no build time to compare against (a fresh clone, a dev
// server without /build-info.json) it draws nothing at all.
// =============================================================================

import type { NavbarProps } from 'sanity';
import { Box, Button, Card, Flex, Stack, Text } from '@sanity/ui';
import { deployProblem, navbarStatus } from '../../lib/studio-kit';
import { useLiveData, useStudioLink, useTryAgain } from './shared';
import type { KitConfig } from './types';

export function makeNavbarStatus(config: KitConfig) {
  function StatusLine() {
    const data = useLiveData();
    const linkTo = useStudioLink();
    const retry = useTryAgain();
    if (!data) return null;
    const problem = deployProblem(data.deploy, config.helper.name);
    const status =
      problem ??
      navbarStatus(
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
        <Flex align="center" justify="flex-end" gap={2} wrap="wrap" style={{ minWidth: 0 }}>
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
          {/* Card 128: the words may wrap but never clip. Nathan saw "Website up
              to d..." at the top right; a flex child's min-width and an inherited
              nowrap can cut a line short, so the line shrinks, wraps and stays whole. */}
          <Text
            size={1}
            muted={status.tone === 'default'}
            style={{
              minWidth: 0,
              flex: '0 1 auto',
              whiteSpace: 'normal',
              overflow: 'visible',
              textOverflow: 'clip',
              overflowWrap: 'anywhere',
              textAlign: 'right',
            }}
          >
            {problem ? (retry.note ?? problem.text) : status.text}
            {home && status.tone !== 'default' && (
              <>
                {' '}
                <a href={home.href} onClick={home.onClick}>
                  Details
                </a>
              </>
            )}
          </Text>
          {problem && (
            <Button
              text="Try again"
              mode="ghost"
              tone="critical"
              fontSize={1}
              padding={2}
              disabled={retry.busy}
              onClick={() => void retry.tryAgain()}
            />
          )}
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

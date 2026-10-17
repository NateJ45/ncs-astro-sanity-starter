// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words live in kit.config.ts)
// =============================================================================
// First-run tour (Studio kit, 2026-10-17)
// =============================================================================
// Ported from mas-monograms / stonesteps-50k (PORTS.md card 31) onto
// @sanity/ui 4. A stepped dialog that greets each person the FIRST time they
// open the Studio in this browser, then never again (Home has "Take the tour
// again"). Keyed by Sanity user id, so a second editor on the same computer
// still gets it. Nothing here writes to the dataset.
//
// BUMP SEEN_PREFIX's version when the steps change enough to show them again.
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import { useCurrentUser } from 'sanity';
import { Box, Button, Card, Dialog, Flex, Heading, Stack, Text } from '@sanity/ui';
import { TOUR_OPEN_EVENT } from './shared';
import type { TourStep } from './types';

const SEEN_PREFIX = 'ncs-studio-kit-tour-v1:';

export function StudioTour({ steps }: { steps: TourStep[] }) {
  const user = useCurrentUser();
  const key = `${SEEN_PREFIX}${user?.id ?? 'anyone'}`;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user) return;
    try {
      if (!localStorage.getItem(key)) setOpen(true);
    } catch {
      /* storage unavailable: leave the tour closed rather than nag */
    }
  }, [key, user]);

  useEffect(() => {
    const replay = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(TOUR_OPEN_EVENT, replay);
    return () => window.removeEventListener(TOUR_OPEN_EVENT, replay);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(key, '1');
    } catch {
      /* nothing to remember it with; the tour will greet them again */
    }
  }, [key]);

  if (!open || steps.length === 0) return null;
  const current = steps[Math.min(step, steps.length - 1)];
  const last = step >= steps.length - 1;

  return (
    <Dialog
      id="ncs-studio-kit-tour"
      header="Welcome to the website editor"
      width={1}
      onClose={close}
      footer={
        <Box padding={3}>
          <Flex align="center" gap={3}>
            <Text size={1} muted style={{ flex: 1 }}>
              Step {step + 1} of {steps.length}
            </Text>
            {step > 0 && (
              <Button
                text="Back"
                mode="ghost"
                fontSize={2}
                padding={3}
                onClick={() => setStep((s) => s - 1)}
              />
            )}
            <Button
              text={last ? 'Got it, let me start' : 'Next'}
              tone="primary"
              fontSize={2}
              padding={3}
              onClick={() => (last ? close() : setStep((s) => s + 1))}
            />
          </Flex>
        </Box>
      }
    >
      <Box padding={5}>
        <Stack gap={5}>
          <Heading as="h2" size={3}>
            {current.title}
          </Heading>
          <Text size={3} style={{ lineHeight: 1.6 }}>
            {current.body}
          </Text>
          <Card padding={3} radius={2} tone="transparent">
            <Text size={1} muted>
              You can close this at any time. To see it again, use &quot;Take the tour again&quot;
              at the bottom of Home.
            </Text>
          </Card>
        </Stack>
      </Box>
    </Dialog>
  );
}

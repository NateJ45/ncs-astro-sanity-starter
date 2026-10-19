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
// Card 132: the dialog's body is drawn in the kit's language (TourCard, also
// drawn on the kit harness): a stone trail across the top with each step's
// short word (laid, ringed, waiting), then a compact banner in the site's deep
// colour with the step's art on a stone and its title in the site's
// lettering, then the words. The dialog, its buttons and Escape are
// @sanity/ui's own.
//
// BUMP SEEN_PREFIX's version when the steps change enough to show them again.
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import { useCurrentUser } from 'sanity';
import { Box, Button, Dialog, Flex, Text } from '@sanity/ui';
import { TOUR_OPEN_EVENT } from './shared';
import { ArtTile, KitNotice, KitScope, LOOK, Lettering, StepTrail } from './ui';
import type { TourStep } from './types';

const SEEN_PREFIX = 'ncs-studio-kit-tour-v1:';

/** One step of the tour, presentational: the trail, the banner, the words. */
export function TourCard({ steps, step }: { steps: TourStep[]; step: number }) {
  const at = Math.min(Math.max(step, 0), steps.length - 1);
  const current = steps[at];
  return (
    <KitScope>
      <div style={{ display: 'grid', gap: 22 }}>
        <div className="ui-trail ui-tour-trail">
          <StepTrail words={steps.map((s) => s.short ?? s.title)} current={at} />
        </div>
        <section
          className="ui-banner ui-banner--compact"
          aria-labelledby="ncs-studio-kit-tour-title"
        >
          <div className="ui-banner__in">
            <div style={{ minWidth: 0 }}>
              <p className="ui-banner__eyebrow ui-eyebrow" style={{ margin: 0 }}>
                A quick tour
              </p>
              <h2 id="ncs-studio-kit-tour-title" className="ui-banner__title">
                <Lettering text={current.title} />
              </h2>
            </div>
            <span className="ui-banner__disc">
              <ArtTile
                meaning={current.meaning ?? 'guide'}
                size={64}
                ground={LOOK.light.paper}
                seed={at * 7 + 5}
              />
            </span>
          </div>
        </section>
        <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6, color: 'var(--ui-ink)' }}>
          {current.body}
        </p>
        <KitNotice tone="plain">
          You can close this at any time. To see it again, use &quot;Take the tour again&quot; at
          the bottom of Home.
        </KitNotice>
      </div>
    </KitScope>
  );
}

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
      <Box padding={[4, 5]}>
        <TourCard steps={steps} step={step} />
      </Box>
    </Dialog>
  );
}

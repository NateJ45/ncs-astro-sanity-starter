// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// Checkup: "What needs attention", a top-bar tool (Studio kit, 2026-10-17)
// =============================================================================
// Ported from mas-monograms' CheckupTool onto @sanity/ui 4. READ-ONLY: it runs
// the rules in src/lib/studio-checkup.ts (pure, unit-tested) and points; it
// never changes anything. Each card has one plain sentence and a "Take me
// there" button that goes through the router (useStudioLink).
// =============================================================================

import type { MouseEvent } from 'react';
import { Box } from '@sanity/ui';
import { isAllClear, type CheckResult, type Severity } from '../../lib/studio-checkup';
import type { StudioTarget } from '../../lib/studio-kit';
import { ToolHeading, useCheckup, useStaffView, useStudioLink } from './shared';
import { TourButton } from './StudioTour';
import {
  AllClear,
  KitAction,
  KitLoading,
  KitNotice,
  KitScope,
  levelOf,
  ResultCard,
  SeverityGroup,
  type Level,
} from './ui';
import type { KitConfig } from './types';

/** Kept for any site code that still reads it; the kit draws severity as stones now (card 131). */
export const SEVERITY_TONE: Record<Severity, 'critical' | 'caution' | 'primary'> = {
  'Needs doing': 'critical',
  'Worth a look': 'caution',
  'For information': 'primary',
};

type LinkFor = (target: StudioTarget) => {
  href: string;
  onClick: (e: MouseEvent<HTMLElement>) => void;
};

const LEVELS: Level[] = ['needs', 'worth', 'good'];

/**
 * Card 131: the findings as white cards with their severity along the left
 * edge, grouped "Needs doing / Worth a look / Good to know"; all clear is the
 * laid path. Presentational, so the kit harness renders it with fixtures.
 */
export function CheckupView({
  results,
  failed,
  busy,
  onRun,
  linkTo,
}: {
  results: CheckResult[] | null;
  failed: boolean;
  busy: boolean;
  onRun: () => void;
  linkTo: LinkFor;
}) {
  return (
    <KitScope>
      <div style={{ display: 'grid', gap: 28 }}>
        <div>
          <KitAction onClick={onRun} disabled={busy}>
            {busy ? 'Checking...' : 'Check again'}
          </KitAction>
        </div>
        {failed ? (
          <KitNotice tone="tip" title="The check could not finish just now">
            Your website is fine. Press Check again in a minute.
          </KitNotice>
        ) : results === null ? (
          <KitLoading label="Checking the website" />
        ) : (
          <>
            {isAllClear(results) && <AllClear lead="Nothing needs fixing right now." />}
            {LEVELS.map((level) => {
              const rows = results.filter((r) => levelOf(r.severity) === level);
              if (!rows.length) return null;
              return (
                <SeverityGroup key={level} level={level} count={rows.length}>
                  {rows.map((r) => {
                    const link = r.target ? linkTo(r.target) : null;
                    return (
                      <ResultCard
                        key={r.id}
                        level={level}
                        title={r.label}
                        detail={r.detail}
                        action={
                          link ? (
                            <KitAction href={link.href} onClick={link.onClick}>
                              {`${r.targetLabel ?? 'Take me there'} →`}
                            </KitAction>
                          ) : undefined
                        }
                      />
                    );
                  })}
                </SeverityGroup>
              );
            })}
          </>
        )}
      </div>
    </KitScope>
  );
}

export function makeCheckupTool(config: KitConfig) {
  return function CheckupTool() {
    const { results, failed, busy, run } = useCheckup(config);
    const linkTo = useStudioLink();
    const { staffView } = useStaffView(config);
    return (
      <Box padding={[4, 4, 5]} style={{ overflowY: 'auto', height: '100%' }}>
        <div style={{ display: 'grid', gap: 32, maxWidth: 780, margin: '0 auto' }}>
          <ToolHeading
            meaning="checkup"
            label="Checkup"
            lead="A quick look over the website for things worth fixing, such as a picture with no description or a link to a page that is gone. Nothing is changed here. It only points the way."
          >
            What needs attention
          </ToolHeading>
          <TourButton tool="checkup" staff={staffView} />
          <CheckupView
            results={results}
            failed={failed}
            busy={busy}
            onRun={() => void run()}
            linkTo={linkTo}
          />
        </div>
      </Box>
    );
  };
}

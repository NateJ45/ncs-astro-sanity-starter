// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// The kit harness's surfaces bench (PORTS.md card 131): DEV SERVER ONLY
// =============================================================================
// /kit-harness/guide/?view=surfaces&scheme=light|dark&part=<name> (tool, checkup, clear,
// loading, failed, home, quick, empty) draws the
// card 131 surfaces with made-up data, since the real ones need a signed-in
// Studio: the tool heading, the Checkup (findings and all clear), Home's
// cards (Fix-it list, the Sunday checklist as a path, "Is it live?" in every
// state), so each can be screenshotted at 1280 and 375 in both schemes.
// =============================================================================

import { useState } from 'react';
import type { CheckResult } from '../../../lib/studio-checkup';
import { LIVE_STEP_WORDS, liveSteps, pathProgress } from '../../../lib/studio-look';
import { CheckupView } from '../CheckupTool';
import { ToolHeading } from '../shared';
import {
  AllClear,
  DoneCard,
  EmptyState,
  TileCard,
  CheckPath,
  KitAction,
  KitBox,
  KitScope,
  LiveSteps,
  ResultCard,
  SeverityStone,
  StoneTag,
  type CheckItem,
} from '../ui';

const noLink = () => ({
  href: '#',
  onClick: (e: { preventDefault: () => void }) => e.preventDefault(),
});

export const RESULTS: CheckResult[] = [
  {
    id: 'a',
    severity: 'Needs doing',
    label: 'A page links to one that is gone',
    detail:
      'The About page links to /old-history/, which no longer exists. Point it somewhere else or take it out.',
    target: { type: 'page', id: 'about' },
    targetLabel: 'Open About',
  },
  {
    id: 'b',
    severity: 'Worth a look',
    label: '3 pictures have no description',
    detail: 'A short description helps people who use screen readers, and helps Google too.',
    target: { type: 'page', id: 'home' },
  },
  {
    id: 'c',
    severity: 'Worth a look',
    label: 'A draft has waited two weeks',
    detail: '"Harvest supper" has unpublished changes from 2 October.',
  },
  {
    id: 'd',
    severity: 'For information',
    label: 'The site map is up to date',
    detail: 'Google can find all 24 pages.',
  },
] as CheckResult[];

const WEEK: CheckItem[] = [
  {
    id: 'notice',
    title: "Post this week's notices",
    detail: 'Anything new for Sunday.',
    done: true,
    tickable: true,
  },
  {
    id: 'sermon',
    title: "Add last Sunday's sermon",
    detail: 'The recording and the reading.',
    done: true,
    note: 'Ticked for you.',
  },
  {
    id: 'times',
    title: 'Check the service times',
    detail: 'Still right for this week?',
    done: false,
    tickable: true,
    action: <KitAction href="#">Open Church facts</KitAction>,
  },
  {
    id: 'fix',
    title: 'Nothing needs doing in the Checkup',
    detail: 'The Checkup ticks this for you.',
    done: false,
    action: <KitAction href="#">Open the Checkup</KitAction>,
  },
];

function Week() {
  const [items, setItems] = useState(WEEK);
  return (
    <KitBox
      title="This week"
      edge
      action={<span className="ui-muted">{pathProgress(items.map((i) => i.done)).text}</span>}
    >
      <CheckPath
        items={items}
        idPrefix="hw"
        onToggle={(id, on) =>
          setItems((xs) => xs.map((x) => (x.id === id ? { ...x, done: on } : x)))
        }
      />
    </KitBox>
  );
}

export function SurfacesBench({ part }: { part: string }) {
  const show = (p: string) => part === 'all' || part === p;
  return (
    <div style={{ display: 'grid', gap: 40 }}>
      {show('tool') && (
        <ToolHeading
          meaning="checkup"
          label="Checkup"
          lead="A quick look over the website for things worth fixing. Nothing is changed here. It only points the way."
        >
          What needs attention
        </ToolHeading>
      )}
      {show('checkup') && (
        <CheckupView
          results={RESULTS}
          failed={false}
          busy={false}
          onRun={() => {}}
          linkTo={noLink}
        />
      )}
      {show('clear') && (
        <CheckupView results={[]} failed={false} busy={false} onRun={() => {}} linkTo={noLink} />
      )}
      {show('loading') && (
        <CheckupView results={null} failed={false} busy onRun={() => {}} linkTo={noLink} />
      )}
      {show('failed') && (
        <CheckupView results={null} failed busy={false} onRun={() => {}} linkTo={noLink} />
      )}
      {show('empty') && (
        <KitScope style={{ maxWidth: 720 }}>
          <EmptyState
            meaning="scripture"
            title="Nothing in Sermons yet"
            lead="Each Sunday's sermon goes here: the recording, the reading and who preached."
            action={<KitAction strong>+ Add the first sermon</KitAction>}
          />
        </KitScope>
      )}
      {show('quick') && (
        <KitScope>
          <div style={{ display: 'grid', gap: 14, maxWidth: 560 }}>
            <TileCard
              dataQuick="post-photo"
              meaning="image"
              title="Post a photo"
              lead="From your camera or your photos. Saved as a draft for you to publish."
            />
            <TileCard
              meaning="notice"
              title="Put up a notice"
              lead="A line for this week's notices."
            />
            <TileCard
              meaning="scripture"
              title="Add a sermon"
              lead="Last Sunday's recording and reading."
            />
            <TileCard meaning="times" title="This week" lead="What is on, day by day." />
            <DoneCard
              states={liveSteps('on-its-way')}
              title="Done. It is published."
              lead="The website updates itself in a few minutes. Home shows when it is live."
            >
              <KitAction strong>Back to quick updates</KitAction>
              <KitAction href="#">Open it in the full editor</KitAction>
            </DoneCard>
          </div>
        </KitScope>
      )}
      {show('home') && (
        <KitScope>
          <div
            style={{
              display: 'grid',
              gap: 20,
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
            }}
          >
            <Week />
            <div style={{ display: 'grid', gap: 20, alignContent: 'start' }}>
              {(['live', 'on-its-way', 'slow', 'failed'] as const).map((s) => (
                <KitBox key={s} title={`Is it live? (${s})`}>
                  <LiveSteps states={liveSteps(s)} words={LIVE_STEP_WORDS} />
                  <div className="ui-muted" style={{ fontSize: 15 }}>
                    Navbar copy: <LiveSteps compact states={liveSteps(s)} words={LIVE_STEP_WORDS} />
                  </div>
                </KitBox>
              ))}
            </div>
            <KitBox
              title="Fix-it list"
              action={
                <KitAction quiet href="#">
                  See the whole list
                </KitAction>
              }
            >
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <SeverityStone level="needs">Needs doing: 1</SeverityStone>
                <SeverityStone level="worth">Worth a look: 2</SeverityStone>
              </div>
              <ResultCard
                dense
                showLevel
                level="needs"
                title="About"
                detail="Links to a page that is gone"
                action={<KitAction href="#">Edit</KitAction>}
              />
              <ResultCard
                dense
                showLevel
                level="worth"
                title="Harvest supper"
                detail="Unpublished changes from 2 October"
                action={<KitAction href="#">Edit</KitAction>}
              />
            </KitBox>
            <KitBox title="Fix-it list (clear)">
              <AllClear compact title="All clear" lead="Nothing needs fixing right now." />
            </KitBox>
            <KitBox title="Recent edits" meaning="document">
              <p>
                Harvest supper <StoneTag tone="tip">Not published</StoneTag>
              </p>
            </KitBox>
          </div>
        </KitScope>
      )}
    </div>
  );
}

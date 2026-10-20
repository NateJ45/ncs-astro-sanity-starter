// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// The kit harness's surfaces bench (PORTS.md card 131): DEV SERVER ONLY
// =============================================================================
// /kit-harness/guide/?view=surfaces&scheme=light|dark&part=<name> (tool, checkup, clear,
// loading, failed, home, quick, empty, google) draws the
// card 131 surfaces with made-up data, since the real ones need a signed-in
// Studio: the tool heading, the Checkup (findings and all clear), Home's
// cards (Fix-it list, the Sunday checklist as a path, "Is it live?" in every
// state), so each can be screenshotted at 1280 and 375 in both schemes.
// Card 132 added Home's redesigned cards to part=home: the quick tiles,
// Coming up (dates on stones, with RSVPs), Recent edits, Pick up where you left
// off, Visitors (the figure and the mark bars) and the newsletter, all drawn by
// the real presentational pieces in HomeCards.tsx and mail/MailHome.tsx.
// Card 132 also added part=photo (Post a photo's trail and its three led steps,
// with buttons to move the trail) and part=tour (TourCard on two steps).
// Card 136 added part=google: the Visitors card read from Google Analytics 4
// (made-up GA4 numbers, its own small print), the Search Console card ("Found
// on Google") and the calm "finish connecting Google" state.
// =============================================================================

import { useState } from 'react';
import type { CheckResult } from '../../../lib/studio-checkup';
import { LIVE_STEP_WORDS, liveSteps, pathProgress } from '../../../lib/studio-look';
import { CheckupView } from '../CheckupTool';
import { ToolHeading } from '../shared';
import { comingUp } from '../../../lib/studio-home';
import type { VisitorsReport } from '../../../lib/studio-analytics';
import type { SearchReport } from '../../../lib/studio-google';
import {
  ComingUpRows,
  ConnectGoogle,
  SearchBody,
  DraftRowView,
  QuickTiles,
  RecentRows,
  VisitorsBody,
  type QuickTile,
  type RecentRow,
} from '../HomeCards';
import { NewsletterBody, RsvpRows } from '../../mail/MailHome';
import type { RsvpOverview } from '../../mail/rsvpData';
// Card 132: Post a photo's three-stone path and the tour (parts photo, tour).
import { PHOTO_STEPS, PhotoStep } from '../PostPhoto';
import { TourCard } from '../StudioTour';
import { EmptyTrashPane } from '../trash';
import { SuggestionCard } from '../../ai/WritingHelp';
import {
  AllClear,
  ArtRows,
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
  StepTrail,
  type CheckItem,
  KitNotice,
  KitSwitch,
  KitToastBody,
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

// -----------------------------------------------------------------------------
// Card 132: Home's redesigned cards, with made-up data
// -----------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const at = (days: number, hour = 9) => {
  const d = new Date(Date.now() + days * DAY_MS);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const TYPE_TITLES: Record<string, string> = {
  page: 'Page',
  event: 'Event',
  announcement: 'Announcement',
  post: 'News post',
  homePage: 'Home page',
};
const typeTitle = (t: string) => TYPE_TITLES[t] ?? t;

const TILES: QuickTile[] = [
  // The longest real titles (card 133): they must wrap to two lines, never three.
  {
    key: 'sermon',
    title: "Add Sunday's sermon",
    lead: 'The title, the passage and the video link.',
    meaning: 'scripture',
    link: noLink(),
  },
  {
    key: 'times',
    title: 'Change the service times',
    lead: 'Church facts. Every page that shows a time reads it from here.',
    meaning: 'times',
    link: noLink(),
  },
  {
    key: 'home',
    title: 'Edit the homepage',
    lead: 'Words, photos and sections.',
    meaning: 'home',
    link: noLink(),
  },
  {
    key: 'notice',
    title: 'Post an announcement',
    lead: 'The banner across the top of every page.',
    meaning: 'notice',
    link: noLink(),
  },
  {
    key: 'website',
    title: 'Edit the website',
    lead: 'Every page, section and setting, in one place.',
    meaning: 'pages',
    link: noLink(),
  },
  {
    key: 'quick',
    title: 'Quick update',
    lead: 'The everyday jobs, a few taps each.',
    meaning: 'quickUpdate',
    link: noLink(),
  },
  {
    key: 'guide',
    title: 'How do I...?',
    lead: 'Step-by-step help for every job on the website.',
    meaning: 'guide',
    link: noLink(),
  },
];

const COMING = comingUp(
  [
    { _id: 'drafts.harvest', _type: 'event', publishAt: at(1, 9), name: 'Harvest supper' },
    { _id: 'drafts.advent', _type: 'post', publishAt: at(5, 18), name: 'Advent services' },
    {
      _id: 'drafts.hours',
      _type: 'announcement',
      publishAt: at(23, 7),
      name: 'Christmas Eve service times',
    },
  ],
  new Date(),
);

const RSVPS: RsvpOverview[] = [
  {
    key: 'vbs',
    name: 'Vacation Bible School',
    startsAt: at(9, 9),
    capacity: 60,
    waitlist: true,
    docId: null,
    docType: null,
    docTitle: null,
    going: 34,
    waiting: 0,
    replies: 34,
  },
  {
    key: 'supper',
    name: 'Harvest supper',
    startsAt: at(12, 18),
    capacity: null,
    waitlist: false,
    docId: null,
    docType: null,
    docTitle: null,
    going: 51,
    waiting: 3,
    replies: 54,
  },
];

const RECENT: RecentRow[] = [
  { _id: 'drafts.about', _type: 'page', _updatedAt: at(0, 8), name: 'About us' },
  { _id: 'harvest', _type: 'event', _updatedAt: at(-1, 15), name: 'Harvest supper' },
  { _id: 'notice-1', _type: 'announcement', _updatedAt: at(-3, 11), name: 'Parking on Sunday' },
  { _id: 'homePage', _type: 'homePage', _updatedAt: at(-6, 10) },
];

const VISITORS: VisitorsReport = {
  configured: true,
  thisWeek: 412,
  lastWeek: 356,
  days: Array.from({ length: 28 }, (_, i) => {
    const d = new Date(Date.now() - (27 - i) * DAY_MS);
    return { date: d.toISOString().slice(0, 10), visits: [38, 52, 61, 49, 44, 71, 97][i % 7] };
  }),
  pages: [
    { path: '/', views: 288 },
    { path: '/plan-your-visit/', views: 131 },
    { path: '/sermons/', views: 96 },
    { path: '/events/harvest-supper/', views: 54 },
  ],
  sources: [
    { group: 'search', label: 'Search engines', visits: 201 },
    { group: 'direct', label: 'Typed in or bookmarked', visits: 133 },
    { group: 'social', label: 'Social media', visits: 64 },
    { group: 'ai', label: 'AI assistants', visits: 14 },
  ],
  ai: { thisWeek: 14, lastWeek: 6 },
  at: new Date().toISOString(),
} as VisitorsReport;

// Card 136: the same card read from GA4, and the Search Console card.
const VISITORS_GA4: VisitorsReport = {
  ...VISITORS,
  provider: 'ga4',
  thisWeek: 268,
  lastWeek: 241,
  days: VISITORS.days.map((d, i) => ({ ...d, visits: [24, 31, 40, 33, 29, 47, 64][i % 7] })),
  sources: [
    { group: 'search', label: 'Searched for it', visits: 121 },
    { group: 'direct', label: 'Typed it in or used a bookmark', visits: 84 },
    { group: 'social', label: 'Social media', visits: 37 },
    { group: 'ai', label: 'AI assistants', visits: 15 },
    { group: 'other', label: 'A link on another website', visits: 11 },
  ],
  ai: { thisWeek: 15, lastWeek: 9 },
};

const SEARCH: SearchReport = {
  configured: true,
  clicks: 184,
  clicksBefore: 152,
  impressions: 6240,
  impressionsBefore: 6410,
  position: 8.4,
  positionBefore: 9.6,
  queries: [
    { query: 'church near me', clicks: 52, impressions: 2100 },
    { query: 'first baptist church service times', clicks: 41, impressions: 380 },
    { query: 'harvest supper 2026', clicks: 19, impressions: 140 },
    { query: 'sunday school for kids', clicks: 11, impressions: 420 },
    { query: 'church directions parking', clicks: 6, impressions: 90 },
  ],
  pages: [
    { path: '/', clicks: 96, impressions: 3100 },
    { path: '/plan-your-visit/', clicks: 44, impressions: 1200 },
    { path: '/events/harvest-supper/', clicks: 21, impressions: 300 },
    { path: '/sermons/', clicks: 14, impressions: 800 },
    { path: '/about/', clicks: 9, impressions: 400 },
  ],
  from: new Date(Date.now() - 30 * DAY_MS).toISOString().slice(0, 10),
  to: new Date(Date.now() - 3 * DAY_MS).toISOString().slice(0, 10),
  at: new Date().toISOString(),
};

function GoogleCards136() {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <KitBox title="Visitors" meaning="people">
        <VisitorsBody report={VISITORS_GA4} />
      </KitBox>
      <KitBox title="Found on Google" meaning="search">
        <SearchBody report={SEARCH} />
      </KitBox>
      <KitBox title="Found on Google (not connected yet)" meaning="search">
        <ConnectGoogle helperName="Nathan" />
      </KitBox>
    </div>
  );
}

function HomeCards132() {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <QuickTiles tiles={TILES} />
      <div
        style={{
          display: 'grid',
          gap: 20,
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          alignItems: 'start',
        }}
      >
        <KitBox title="Pick up where you left off" meaning="step">
          <p className="ui-muted" style={{ margin: 0 }}>
            These have changes that are saved but not on the website yet. Publish them, or open them
            to carry on.
          </p>
          <ArtRows label="Unpublished changes">
            <DraftRowView
              type="page"
              name="About us"
              meta="Page, changed 2 hours ago"
              link={noLink()}
              seed={8}
              canPublish
              canDiscard
              busy={false}
              onPublish={() => {}}
              onDiscard={() => {}}
            />
            <DraftRowView
              type="event"
              name="Harvest supper"
              meta="Event, changed yesterday, never published"
              why="Something needs filling in first. Open it to see what."
              link={noLink()}
              seed={14}
              canPublish={false}
              canDiscard={false}
              busy={false}
              onPublish={() => {}}
              onDiscard={() => {}}
            />
          </ArtRows>
        </KitBox>
        <KitBox title="Coming up" meaning="event">
          <p className="ui-muted" style={{ margin: 0 }}>
            These publish by themselves, within half an hour of the time shown.
          </p>
          <ComingUpRows rows={COMING} typeTitle={typeTitle} linkTo={noLink} />
          <RsvpRows events={RSVPS} link={noLink()} />
        </KitBox>
        <KitBox title="Recent edits" meaning="document">
          <RecentRows rows={RECENT} typeTitle={typeTitle} linkTo={noLink} now={Date.now()} />
        </KitBox>
        <KitBox title="Newsletter" meaning="message">
          <NewsletterBody
            data={{
              subscribers: 186,
              pending: 4,
              recent: [
                {
                  subject: 'This week at church',
                  status: 'done',
                  sent: 182,
                  started_at: at(-4, 8),
                  finished_at: at(-4, 8),
                },
              ],
            }}
          />
        </KitBox>
      </div>
      <KitBox title="Visitors" meaning="people">
        <VisitorsBody report={VISITORS} />
      </KitBox>
    </div>
  );
}

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
      {show('switch') && (
        <KitScope style={{ maxWidth: 420, display: 'grid', gap: 16 }}>
          <KitSwitch id="b1" checked={false} onChange={() => {}} label="This one has sold" />
          <KitSwitch id="b2" checked onChange={() => {}} label="This one has sold" />
        </KitScope>
      )}
      {show('trash') && <EmptyTrashPane />}
      {show('helpers') && (
        <KitScope style={{ maxWidth: 560, display: 'grid', gap: 16 }}>
          <SuggestionCard
            text="Join us on Sunday at 10:30 for worship, followed by lunch in the hall."
            onUse={() => {}}
            onAgain={() => {}}
            onClose={() => {}}
          />
          <KitNotice tone="tip" title="A password is set">
            Set 12 October. Type a new one below to change it.
          </KitNotice>
          <KitNotice tone="careful" title="No password yet">
            Nobody can open this page until you set one and publish.
          </KitNotice>
        </KitScope>
      )}
      {show('toast') && (
        <KitScope style={{ maxWidth: 360, display: 'grid', gap: 16 }}>
          <div style={{ padding: 12, border: '1px solid #ccc', borderRadius: 6 }}>
            <strong>Published</strong>
            <KitToastBody steps={liveSteps('on-its-way')}>
              The website updates itself in a few minutes. Home shows "Up to date" once your change
              is live.
            </KitToastBody>
          </div>
          <div style={{ padding: 12, border: '1px solid #ccc', borderRadius: 6 }}>
            <strong>Moved to Trash</strong>
            <KitToastBody>It comes off the website at the next update.</KitToastBody>
          </div>
        </KitScope>
      )}
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
          </div>
          <div style={{ marginTop: 40 }}>
            <HomeCards132 />
          </div>
        </KitScope>
      )}
      {show('photo') && <PhotoBench />}
      {show('google') && (
        <KitScope>
          <GoogleCards136 />
        </KitScope>
      )}
      {show('tour') && <TourBench />}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Card 132: Post a photo as a three-stone path, and the tour's stone trail
// -----------------------------------------------------------------------------

/** Post a photo's frame with stand-in fields: press a stone word to move the trail. */
function PhotoBench() {
  const [current, setCurrent] = useState(1);
  const stand = (words: string) => (
    <div
      style={{
        padding: '14px 16px',
        border: '1px dashed var(--ui-rule)',
        borderRadius: 8,
        color: 'var(--ui-muted)',
      }}
    >
      {words}
    </div>
  );
  return (
    <KitScope style={{ maxWidth: 560 }}>
      <div style={{ display: 'grid', gap: 28 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[0, 1, 2, 3].map((i) => (
            <KitAction key={i} strong={i === current} onClick={() => setCurrent(i)}>
              {`current ${i}`}
            </KitAction>
          ))}
        </div>
        <StepTrail words={PHOTO_STEPS} current={current} />
        <PhotoStep index={0} current={current}>
          {stand('Take a photo / Choose from your photos')}
        </PhotoStep>
        <PhotoStep index={1} current={current}>
          {stand('Describe the photo, Caption (if you like)')}
        </PhotoStep>
        <PhotoStep index={2} current={current}>
          {stand('Where should it go? Save as a draft')}
        </PhotoStep>
      </div>
    </KitScope>
  );
}

const TOUR = [
  { title: 'This is Home', short: 'Home', meaning: 'home', body: 'Home opens first every time.' },
  {
    title: 'Content is where you edit',
    short: 'Content',
    meaning: 'content',
    body: 'Click Content in the top bar to change the words and pictures on any page.',
  },
  {
    title: 'Live preview shows the real page',
    short: 'Preview',
    meaning: 'preview',
    body: 'Live preview shows the website as visitors will see it, with your changes in place.',
  },
  {
    title: 'Nothing is public until you press Publish',
    short: 'Publish',
    meaning: 'publishing',
    body: 'Your changes are private until you press the green Publish button.',
  },
  {
    title: 'Help is always one click away',
    short: 'Help',
    meaning: 'help',
    body: 'Site Guide in the top bar has step-by-step help for every job.',
  },
] as const;

/** The tour's body on step 1 and step 4, as the dialog draws it. */
function TourBench() {
  const steps = TOUR.map((s) => ({ ...s }));
  return (
    <div style={{ display: 'grid', gap: 40, maxWidth: 560 }}>
      <TourCard steps={steps} step={0} />
      <TourCard steps={steps} step={3} />
    </div>
  );
}

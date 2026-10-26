// Safe to edit by hand
// =============================================================================
// This site's Studio tours, welcome and "What's new" (PORTS.md card 137)
// =============================================================================
// Plain data, kept out of kit.config.ts so src/lib/studio-tour.test.ts can read
// it in bare Node and catch a typo (a welcome naming a tour that is not there,
// an em-dash, a date that is not a date). kit.config.ts passes these on as
// `tours`, `welcome` and `whatsNew`.
//
// Each stop's `anchor` is what gets the spotlight:
//   - a kit hook: 'home-banner', 'home-quick-actions', 'home-this-week',
//     'home-is-it-live', 'home-fix-it', 'home-coming-up', 'home-recent',
//     'home-pick-up', 'home-ask', 'home-visitors', 'home-pages', 'home-videos',
//     'home-help', 'quick-list', 'guide-index', 'guide-videos', 'navbar-status';
//   - a Quick update tile: 'quick:<form id>' ('quick:post-photo');
//   - Sanity's own UI: 'tool:<tool name>', 'tools', 'search', 'publish',
//     'document-actions', 'document-menu', 'document-form', 'pane:list',
//     'pane:document', 'new-document' (src/lib/studio-tour.ts SANITY_ANCHORS);
//   - anything else: 'css:<selector>'.
// No anchor (or one not on screen): the popover sits in the middle.
// `goTo` opens a tool or a document first ({ tool: 'quick-update' }).
// Full shapes: docs/agent/studio-kit.md, "Spotlight tours".
// =============================================================================

import type { TourDef, WelcomeConfig, WhatsNewEntry } from '../lib/studio-tour.ts';

export const TOURS: TourDef[] = [
  {
    id: 'first-run',
    title: 'A quick tour',
    firstRun: true,
    steps: [
      {
        anchor: 'home-banner',
        title: 'This is Home',
        short: 'Home',
        meaning: 'home',
        body: 'Home opens first every time. It shows what to do this week, whether your last change is on the website yet, and anything that needs fixing.',
      },
      {
        anchor: 'home-quick-actions',
        title: 'The jobs you do most',
        short: 'Jobs',
        meaning: 'post',
        body: 'These tiles go straight to the everyday jobs. Quick update has the short ones, made for a phone.',
      },
      {
        anchor: 'tool:structure',
        title: 'Content is where you edit',
        short: 'Content',
        meaning: 'content',
        body: 'Content in the top bar holds every page and list. Open one, change the words or pictures, and nothing is public yet.',
      },
      {
        title: 'Nothing is public until you press Publish',
        short: 'Publish',
        meaning: 'publishing',
        body: 'Your changes are private until you press the green Publish button. After that the website updates itself in a few minutes.',
      },
      {
        anchor: 'home-help',
        title: 'Help is always one click away',
        short: 'Help',
        meaning: 'help',
        body: 'The Site Guide has step-by-step help for every job, and you can print any of it. "Show me around" here brings this tour back.',
      },
    ],
  },
  {
    id: 'home',
    title: 'How this screen works',
    tool: 'home',
    steps: [
      {
        anchor: 'home-this-week',
        title: 'This week',
        meaning: 'step',
        body: 'The jobs that come around every week. Each one checks itself when it is done.',
      },
      {
        anchor: 'home-is-it-live',
        title: 'Is it live?',
        meaning: 'publishing',
        body: 'After you publish, this says when the website has caught up, usually within a few minutes.',
      },
      {
        anchor: 'home-recent',
        title: 'Recent edits',
        meaning: 'document',
        body: 'The last things anyone changed, newest first. Click one to open it again.',
      },
    ],
  },
  {
    id: 'quick-update',
    title: 'How this screen works',
    tool: 'quick-update',
    steps: [
      {
        anchor: 'quick-list',
        title: 'One job per button',
        meaning: 'post',
        body: 'Pick a job, fill in a few boxes and press the button at the bottom. Each one says what it does when it is finished.',
      },
    ],
  },
];

export const WELCOME: WelcomeConfig = {
  title: 'Welcome to your website editor',
  body: 'This is where you look after the website. You cannot break anything by looking around: nothing changes for visitors until you press Publish.',
  points: [
    'Home shows what needs doing this week.',
    'Quick update has the short jobs, made for a phone.',
    'The Site Guide explains every job, step by step.',
  ],
};

export const WHATS_NEW: WhatsNewEntry[] = [
  {
    date: '2026-10-19',
    title: 'Tours and videos',
    items: [
      'Show me around, on Home and in the Site Guide, walks you through the editor.',
      'How this screen works explains the screen you are on.',
      'Some guides now have a short video showing the job.',
    ],
    tour: 'first-run',
  },
];

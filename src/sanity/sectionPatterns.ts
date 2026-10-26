// Safe to edit by hand
// =============================================================================
// Section patterns - small groups of sections, ready to insert (PORTS.md card 173)
// =============================================================================
// A PAGE TEMPLATE (pageTemplates.ts) starts a new page. A PATTERN is a few
// sections that go together, dropped into a page that already exists: a
// closure notice at the top of the home page, an event's details and schedule
// on a page about it, a row of questions above the contact form.
//
// WHERE THEY LIVE. The page builder's "Insert a saved section" button reads
// saved sections (`sectionPreset` documents, card 109) from the dataset, so a
// pattern has to exist there to be offered. This file is the source of truth for
// their words; scripts/seed-section-patterns.mjs copies them into the dataset as
// DRAFT saved sections (dry by default, rule 16). Drafts on purpose: a copy can
// be added from a draft, but a synced section can only show a published one, so
// example text can never go live through a synced section by accident. The
// script never overwrites one that exists (draft or published), so an editor's
// own changes are safe if it runs again.
//
// Every line the site must supply starts "Example:" (src/lib/authoring.ts), and
// the page builder warns about it once the copy is on a page.
// src/lib/authoring.test.ts checks every pattern the same way as a template.
//
// THIS LIST IS THE SITE'S OWN, like pageTemplates.ts: a fork rewrites it (a
// church adds its seasons, a shop its sales). No `sanity` import here on
// purpose: node --test loads this file directly.
// =============================================================================

import { freshKeys } from '../lib/authoring.ts';
import {
  accordion,
  button,
  daysFromNow,
  eventDate,
  eventDetails,
  example,
  notice,
  qa,
  schedule,
  scheduleDay,
  slot,
} from './templateBlocks.ts';

type Rec = Record<string, unknown>;

export interface SectionPattern {
  /** Stable id. The saved section is stored as `pattern-<id>`. */
  id: string;
  /** The saved section's name, as the "Insert a saved section" list shows it. */
  title: string;
  /** One line under the name: where it fits and what to change. */
  note: string;
  /** The sections, with fresh keys every call. */
  sections: () => Rec[];
}

const list = (...sections: Rec[]) => freshKeys(sections);

export const SECTION_PATTERNS: SectionPattern[] = [
  {
    id: 'closure-notice',
    title: 'Closure notice',
    note: 'A dated notice for a holiday or a closure. Change the message and the dates; it takes itself down after the last day.',
    sections: () =>
      list(
        notice(example('We are closed on Monday for the holiday. We are back on Tuesday.'), {
          urgency: 'urgent',
          startDate: daysFromNow(0),
          endDate: daysFromNow(7),
        }),
      ),
  },
  {
    id: 'event-essentials',
    title: 'Event details and schedule',
    note: 'The when and where of one event, with "Add to my calendar", then the times. Change the name, dates, place and times.',
    sections: () =>
      list(
        eventDetails({
          title: example('Event name'),
          dates: [eventDate(daysFromNow(30), { startTime: '10:00', endTime: '14:00' })],
          place: example('The place\n123 Main Street, Springfield'),
          note: example('Two or three sentences: what it is, who it is for, what to bring.'),
          button: button(example('Sign up')),
        }),
        schedule(example('The day'), [
          scheduleDay('', [
            slot('10:00', example('Welcome')),
            slot('11:00', example('The main part'), example('A short note')),
            slot('13:00', example('Lunch and a chance to talk')),
          ]),
        ]),
      ),
  },
  {
    id: 'common-questions',
    title: 'Common questions',
    note: 'Three questions that fold open. Good above a contact form or at the foot of a service page.',
    sections: () =>
      list(
        accordion(example('Common questions'), [
          qa(example('How do I get started?'), example('A short, friendly answer.')),
          qa(example('How long does it take?'), example('A short, friendly answer.')),
          qa(example('Who do I talk to?'), example('A short, friendly answer.')),
        ]),
      ),
  },
];

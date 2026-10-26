// Safe to edit by hand
// =============================================================================
// Page templates - the starting points offered when someone makes a new page
// =============================================================================
// When an editor clicks "+" on Custom pages, the Studio asks which of these to
// start from (PORTS.md card 109). Each one fills the page with sections and
// clearly marked example text, so nobody faces an empty page wondering what
// goes where, and nothing example-shaped can go live unnoticed: every example
// line starts "Example:", and the page builder shows a warning on any section
// that still has one (src/lib/page-guardrails.ts).
//
// THIS FILE IS THE SITE'S OWN. It is not PORTABLE: a church, a shop and a
// studio want different starting points, so each fork rewrites this list. Keep
// to block types a custom page accepts (SECTION_TYPES in schemaTypes/sections.ts);
// src/lib/authoring.test.ts fails if a template names one that does not exist,
// leaves an array member without a `_key`, forgets the example marker, breaks
// the copy rules (no em-dashes, US spelling, no prices) or a schema limit.
//
// `sections` is a FUNCTION, called each time a page is made, and it runs the
// result through freshKeys(), so two pages made from one template never share a
// `_key`. The builders are in templateBlocks.ts (card 173).
//
// GROUPS (card 173). Sanity's "new document" menu has no headings, so
// sanity.config.ts shows each template as "<group>: <title>"
// (templateMenuTitle) and this list is kept in group order (TEMPLATE_GROUPS).
// The test checks the order. A fork renames, adds or drops groups freely.
//
// No `sanity` import here on purpose: node --test loads this file directly.
// sanity.config.ts turns the list into Studio templates.
// =============================================================================

import { freshKeys } from '../lib/authoring.ts';
import {
  accordion,
  button,
  buttonRow,
  column,
  columns,
  ctaBand,
  daysFromNow,
  eventDate,
  eventDetails,
  example,
  hero,
  imageText,
  letter,
  link,
  moment,
  notice,
  paras,
  photoCard,
  photoCards,
  qa,
  quote,
  richText,
  schedule,
  scheduleDay,
  slot,
  stat,
  stats,
  timeline,
} from './templateBlocks.ts';

type Rec = Record<string, unknown>;

/** The headings the template menu is sorted under, in menu order. */
export const TEMPLATE_GROUPS = ['Basics', 'About', 'Events', 'Announcements'] as const;
export type TemplateGroup = (typeof TEMPLATE_GROUPS)[number];

export interface PageTemplate {
  /** Stable id. Changing it only changes the menu; pages already made keep their content. */
  id: string;
  /** Which heading it sits under in the menu. */
  group: TemplateGroup;
  /** What the "new page" menu says (after the group). */
  title: string;
  /** One line under the title, in the menu. */
  description: string;
  /** The sections a new page starts with. */
  sections: () => Rec[];
}

/** "Basics: Simple page", the way the Studio menu shows a template. */
export const templateMenuTitle = (t: PageTemplate): string => `${t.group}: ${t.title}`;

/** Build a list and give every array member a fresh key. */
const page = (...sections: Rec[]) => freshKeys(sections);

/** The usual band at the foot of a page. */
const closingBand = (label = 'Contact us') =>
  ctaBand(
    example('Ready to take the next step?'),
    example('One line that tells a visitor what happens when they press the button.'),
    button(example(label)),
  );

// ── The templates, in menu order ─────────────────────────────────────────────

export const PAGE_TEMPLATES: PageTemplate[] = [
  // ── Basics ────────────────────────────────────────────────────────────────
  {
    id: 'page-simple',
    group: 'Basics',
    title: 'Simple page',
    description: 'A heading, then text. Good for most pages.',
    sections: () =>
      page(
        hero({
          headline: example('Page title'),
          subhead: example('One sentence that says what this page is about.'),
        }),
        richText(
          example('A section heading'),
          paras(
            example('Write the main text of the page here. Short paragraphs read best.'),
            example('Add a second paragraph, or delete this one.'),
          ),
        ),
      ),
  },
  {
    id: 'page-landing',
    group: 'Basics',
    title: 'Landing page',
    description: 'A banner, a picture with text, three numbers, a quote and a button band.',
    sections: () =>
      page(
        hero({
          headline: example('A clear promise in a few words'),
          subhead: example('Who this is for, and what they get.'),
          primary: button(example('Get in touch')),
        }),
        imageText({
          heading: example('Why it matters'),
          body: paras(
            example('Two or three sentences next to a photo. Add the photo on the left.'),
          ),
        }),
        stats(example('At a glance'), [
          stat(10, example('years of experience'), '+'),
          stat(200, example('people helped')),
          stat(5, example('things we do best')),
        ]),
        quote(example('A short, real quote from someone you have helped.'), example('Their name')),
        closingBand(),
      ),
  },
  {
    id: 'page-questions',
    group: 'Basics',
    title: 'Questions page',
    description: 'Common questions that fold open, then a way to ask more.',
    sections: () =>
      page(
        hero({
          headline: example('Questions and answers'),
          subhead: example('The things people ask us most.'),
        }),
        accordion('', [
          qa(example('The first question someone asks?'), example('A short, friendly answer.')),
          qa(example('A second question?'), example('Another answer.')),
          qa(example('A third question?'), example('Add as many as you need.')),
        ]),
        closingBand('Ask us'),
      ),
  },
  {
    id: 'page-blank',
    group: 'Basics',
    title: 'Blank page',
    description: 'No sections. Add your own with "+ Add item".',
    sections: () => [],
  },

  // ── About ─────────────────────────────────────────────────────────────────
  {
    id: 'about-us',
    group: 'About',
    title: 'About us',
    description: 'Who you are, what you care about, and how you got here.',
    sections: () =>
      page(
        hero({
          headline: example('About us'),
          subhead: example('One sentence on who you are and who you serve.'),
        }),
        imageText({
          heading: example('Our story'),
          body: paras(
            example('How it started, in two or three sentences.'),
            example('What you do today, and for whom.'),
          ),
        }),
        columns(example('What we care about'), [
          column(example('Care'), example('A sentence on what this means in practice.')),
          column(example('Craft'), example('A sentence on what this means in practice.')),
          column(example('Honesty'), example('A sentence on what this means in practice.')),
        ]),
        timeline(example('Along the way'), [
          moment('2015', example('Where it began'), example('A sentence or two.')),
          moment('2019', example('A step that mattered'), example('A sentence or two.')),
          moment('Today', example('Where we are now'), example('A sentence or two.')),
        ]),
        closingBand(),
      ),
  },
  {
    id: 'about-team',
    group: 'About',
    title: 'Meet the team',
    description: 'A short letter from the person in charge, then the people behind the work.',
    sections: () =>
      page(
        hero({
          headline: example('Meet the team'),
          subhead: example('The people you will work with.'),
        }),
        letter({
          eyebrow: example('A note from our founder'),
          body: [
            example('A warm paragraph about why you do this work.'),
            example('A second paragraph about what a visitor can expect from you.'),
          ],
          name: example('Their name'),
          role: example('Founder'),
        }),
        photoCards(example('The team'), [
          photoCard(example('First name'), example('Their role, and one line about them.')),
          photoCard(example('Second name'), example('Their role, and one line about them.')),
          photoCard(example('Third name'), example('Their role, and one line about them.')),
        ]),
        closingBand(),
      ),
  },

  // ── Events ────────────────────────────────────────────────────────────────
  {
    id: 'event-page',
    group: 'Events',
    title: 'Event page',
    description:
      'When and where with "Add to my calendar", the schedule, what to expect and questions.',
    sections: () =>
      page(
        hero({
          headline: example('Event name'),
          subhead: example('One line on what it is and who it is for.'),
        }),
        eventDetails({
          eyebrow: example('Save the date'),
          title: example('Event name'),
          dates: [eventDate(daysFromNow(30), { startTime: '18:00', endTime: '20:00' })],
          place: example('The place\n123 Main Street, Springfield'),
          note: example('Two or three sentences: what it is, who it is for, what to bring.'),
          button: button(example('Sign up')),
        }),
        schedule(example('The evening'), [
          scheduleDay('', [
            slot('18:00', example('Doors open'), example('A short note')),
            slot('18:30', example('The main part'), example('A short note')),
            slot('19:30', example('Time to talk')),
          ]),
        ]),
        photoCards(example('What to expect'), [
          photoCard(example('First thing'), example('A sentence about it.')),
          photoCard(example('Second thing'), example('A sentence about it.')),
          photoCard(example('Third thing'), example('A sentence about it.')),
        ]),
        accordion(example('Good to know'), [
          qa(example('Is there parking?'), example('A short answer.')),
          qa(example('Can I bring a friend?'), example('A short answer.')),
        ]),
      ),
  },

  // ── Announcements ─────────────────────────────────────────────────────────
  {
    id: 'notice-page',
    group: 'Announcements',
    title: 'Notice page',
    description: 'A dated notice that takes itself down, the details, and where to go next.',
    sections: () =>
      page(
        hero({
          headline: example('An update for you'),
          subhead: example('One line that says what has changed.'),
        }),
        notice(example('The short version, in one sentence.'), {
          startDate: daysFromNow(0),
          endDate: daysFromNow(14),
        }),
        richText(
          example('What is changing'),
          paras(
            example('The details in a few short paragraphs.'),
            example('What a visitor needs to do, if anything.'),
          ),
        ),
        buttonRow(example('Where to go next'), [
          link(button(example('Contact us'))),
          link(button(example('Read more'))),
        ]),
      ),
  },
];

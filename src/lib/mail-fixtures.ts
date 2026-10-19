// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// mail-fixtures - made-up content for exercising mail locally (PORTS.md card 127)
// =============================================================================
// `npm run preview` with MAIL_TEST_FIXTURES=1 in .dev.vars lets the routes load
// these instead of Sanity, so the subscribe, RSVP and send flows can be tried
// end to end against a local D1 without touching the dataset (rule 16). The
// same RSVP block draws the section on /styleguide/sections/. NEVER set
// MAIL_TEST_FIXTURES on the deployed Worker; the ids all start "fixture-" and
// are refused without it.
// =============================================================================
import type { IssueContent } from './mail-newsletter.ts';

export const FIXTURE_PAGE_ID = 'fixture-page';

export const FIXTURE_RSVP_BLOCK = {
  _type: 'rsvpSection',
  _key: 'fixture-rsvp',
  pageId: FIXTURE_PAGE_ID,
  heading: 'Let us know you are coming',
  intro: 'Supper is free. Tell us how many are coming so we cook enough.',
  eventName: 'Harvest supper',
  startsAt: '2099-10-25T22:00:00Z',
  where: 'The fellowship hall',
  capacity: 6,
  waitlist: true,
  maxParty: 4,
  questions: [
    { _key: 'q1', label: 'Any food allergies?', kind: 'text', required: false },
    {
      _key: 'q2',
      label: 'Which sitting?',
      kind: 'select',
      options: ['5:30', '7:00'],
      required: true,
    },
  ],
  confirmationNote: 'Doors open at 5:15. Parking is behind the hall.',
};

export const FIXTURE_ISSUE: IssueContent = {
  id: 'fixture-issue',
  subject: 'This week: harvest supper, a new series and a thank you',
  preheader: 'Supper on Saturday, and the autumn series starts Sunday.',
  intro:
    'Good morning, everyone.\n\nThe leaves are turning and the calendar is filling up. Here is what is coming this week.',
  sections: [
    {
      heading: "This week's sermon",
      items: [
        {
          title: 'The God who sees',
          meta: 'Genesis 16, Pastor Jane Doe',
          text: 'Hagar names God in the wilderness. Listen again, or catch up if you were away.',
          url: 'https://example.org/sermons/the-god-who-sees/',
          linkLabel: 'Listen to the sermon',
        },
      ],
    },
    {
      heading: 'Notices',
      items: [
        {
          title: 'Harvest supper on Saturday',
          text: 'Free, all welcome. Tell us you are coming so we cook enough.',
          url: 'https://example.org/harvest/',
          linkLabel: 'RSVP',
        },
        {
          title: 'Coats for winter',
          text: 'The coat rack in the hall is open until the end of the month.',
        },
      ],
    },
    {
      heading: 'Coming up',
      items: [
        { title: 'Harvest supper', meta: 'Saturday 25 October, 6:00 pm' },
        { title: 'Choir practice', meta: 'Thursday 30 October, 7:00 pm' },
      ],
    },
  ],
  note: {
    heading: 'A thank you',
    text: 'To everyone who helped clear the garden last week: thank you.',
  },
  webUrl: 'https://example.org/newsletter/fixture-issue/',
};

export const fixturesOn = (flag: string | undefined) => flag === '1';

/**
 * modules/events/seed.mjs
 *
 * Idempotent seeder for the events module. Creates one `eventsPage`
 * singleton and three neutral placeholder `event` documents with future
 * dates computed relative to the current date at seed run time.
 *
 * Requirements:
 *   - A configured Sanity project (projectId + dataset in .env or shell).
 *   - A Sanity API write token (`SANITY_API_WRITE_TOKEN`) with Editor or above
 *     permissions. See https://sanity.io/docs/http-auth
 *
 * Usage:
 *   node modules/events/seed.mjs
 *
 * All documents use deterministic `_id` values so running the script more than
 * once does not create duplicates (`createOrReplace` is idempotent).
 * Image fields are intentionally left unset.
 *
 * Event dates are set to approximately 2, 4, and 8 weeks from the day the
 * script runs, so the events always appear in the "Upcoming" section on first
 * load. Update dates and content in Studio before publishing.
 */

import { createClient } from '@sanity/client';
import { config } from 'dotenv';

// Load env vars from the project root .env file.
config();

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset   = process.env.PUBLIC_SANITY_DATASET ?? 'production';
const token     = process.env.SANITY_API_WRITE_TOKEN;

if (!projectId) {
  console.error('Error: PUBLIC_SANITY_PROJECT_ID is not set. Add it to your .env file.');
  process.exit(1);
}
if (!token) {
  console.error('Error: SANITY_API_WRITE_TOKEN is not set. Add a write token to your .env file.');
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: '2024-01-01',
  useCdn: false,
});

// ---------------------------------------------------------------------------
// Compute future dates relative to now
// ---------------------------------------------------------------------------

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toISO(date) {
  return date.toISOString();
}

const now        = new Date();
const event1Date = addDays(now, 14);   // ~2 weeks out
const event2Date = addDays(now, 28);   // ~4 weeks out
const event3Date = addDays(now, 56);   // ~8 weeks out

// Set a reasonable start time (10:00 AM local) for readability
event1Date.setHours(10, 0, 0, 0);
event2Date.setHours(18, 0, 0, 0);
event3Date.setHours(10, 0, 0, 0);

const event1End = addDays(event1Date, 0);
event1End.setHours(12, 0, 0, 0);

const event2End = addDays(event2Date, 0);
event2End.setHours(19, 30, 0, 0);

// ---------------------------------------------------------------------------
// eventsPage singleton
// ---------------------------------------------------------------------------

const eventsPage = {
  _id: 'eventsPage',
  _type: 'eventsPage',
  seoTitle: 'Events',
  seoDescription: 'Upcoming workshops, open houses, and other events. Join us in person or online.',
  heroEyebrow: 'What\'s On.',
  heroHeadline: 'Events',
  heroSubhead: 'Workshops, open houses, and other events. Replace this with your own intro.',
};

// ---------------------------------------------------------------------------
// event documents
// ---------------------------------------------------------------------------

const events = [
  {
    _id: 'seed-event-one',
    _type: 'event',
    title: 'Sample Workshop: Getting Started',
    slug: { _type: 'slug', current: 'sample-workshop-getting-started' },
    startDate: toISO(event1Date),
    endDate:   toISO(event1End),
    location:  'Studio, 123 Example Street (or Online)',
    description: [
      {
        _type: 'block',
        _key: 'ev1-desc-p1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'ev1-desc-s1',
            text: 'Replace this with a description of the event. What will attendees learn? What should they bring? Is there a fee? Two to three sentences is usually enough.',
            marks: [],
          },
        ],
        markDefs: [],
      },
    ],
    registrationUrl: 'https://example.com',
    displayOrder: 1,
  },
  {
    _id: 'seed-event-two',
    _type: 'event',
    title: 'Evening Open House',
    slug: { _type: 'slug', current: 'evening-open-house' },
    startDate: toISO(event2Date),
    endDate:   toISO(event2End),
    location:  'Studio, 123 Example Street',
    description: [
      {
        _type: 'block',
        _key: 'ev2-desc-p1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'ev2-desc-s1',
            text: 'Replace this with a description of the open house. What will people see? Who should attend? Is registration required?',
            marks: [],
          },
        ],
        markDefs: [],
      },
    ],
    displayOrder: 2,
  },
  {
    _id: 'seed-event-three',
    _type: 'event',
    title: 'Planning Session: Spring Projects',
    slug: { _type: 'slug', current: 'planning-session-spring-projects' },
    startDate: toISO(event3Date),
    location:  'Online',
    description: [
      {
        _type: 'block',
        _key: 'ev3-desc-p1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'ev3-desc-s1',
            text: 'Replace this with a description of the planning session. Who is it for and what will be covered?',
            marks: [],
          },
        ],
        markDefs: [],
      },
    ],
    registrationUrl: 'https://example.com',
    displayOrder: 3,
  },
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function seed() {
  console.log(`Seeding events module into project "${projectId}" / dataset "${dataset}"...`);

  const tx = client.transaction();

  tx.createOrReplace(eventsPage);
  for (const ev of events) {
    tx.createOrReplace(ev);
  }

  await tx.commit();

  console.log('Done. Created or replaced:');
  console.log('  eventsPage (singleton)');
  for (const ev of events) {
    console.log(`  event: "${ev.title}" (${ev.startDate.slice(0, 10)})`);
  }
  console.log('');
  console.log('Next steps:');
  console.log('  1. Replace placeholder event titles, dates, and descriptions in Studio.');
  console.log('  2. Add registration URLs where required.');
  console.log('  3. Optionally add event images via the Studio.');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message ?? err);
  process.exit(1);
});

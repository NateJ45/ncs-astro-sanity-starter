// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// rsvpSection - "RSVP": let people say they are coming (PORTS.md card 127)
// =============================================================================
// A section for any page (VBS, Easter breakfast, homecoming, a workshop). The
// block IS the event: there is no events collection, because sites in the
// family keep their calendar elsewhere (FBC Auburn's lives in Church Trac). So
// the block carries the few facts a reply needs: the event's name and time,
// how many places, a waiting list, when replies close, and the editor's own
// questions (formQuestion, the same rows the forms use).
//
// The replies go to the site's own database, never to Sanity (the dataset is
// public and replies are people's details). The Studio's "RSVPs" tool shows the
// counts and the list, and downloads a spreadsheet.
//
// No payments: for a paid event, link to the church's payment page in the
// intro and use this block for the headcount only.
//
// Rule 9: no colour or surface field; the page's rhythm decides the band.
// Rule 15: the closing time defaults to the start time (derived, not retyped).
// =============================================================================
import { defineField, defineType } from 'sanity';
import { CalendarIcon } from '@sanity/icons/Calendar';

export const rsvpSection = defineType({
  name: 'rsvpSection',
  title: 'RSVP (who is coming)',
  type: 'object',
  icon: CalendarIcon,
  description:
    'A short form for people to say they are coming, with a headcount. Replies are kept privately, never in this editor: see them under RSVPs at the top of the Studio.',
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      initialValue: 'Let us know you are coming',
      validation: (R) => R.max(90),
    }),
    defineField({
      name: 'intro',
      title: 'A line under the heading (optional)',
      type: 'text',
      rows: 2,
      description: 'For a paid event, say where to pay here. This form never takes payments.',
    }),
    defineField({
      name: 'eventName',
      title: 'Event name',
      type: 'string',
      description:
        'As people know it, like "Vacation Bible School 2027". It goes in the confirmation email.',
      validation: (R) => R.required().max(120),
    }),
    defineField({
      name: 'startsAt',
      title: 'When it starts',
      type: 'datetime',
      description:
        'Shown in the confirmation email. Replies close at this time unless you set a closing time below.',
      options: { timeStep: 15 },
    }),
    defineField({
      name: 'where',
      title: 'Where (optional)',
      type: 'string',
      description: 'Like "Fellowship Hall". Shown in the confirmation email.',
      validation: (R) => R.max(200),
    }),
    defineField({
      name: 'capacity',
      title: 'How many places (optional)',
      type: 'number',
      description:
        'The most people who can come, counting everyone in a reply. Leave empty for no limit.',
      validation: (R) => R.integer().min(1).max(10000),
    }),
    defineField({
      name: 'waitlist',
      title: 'Keep a waiting list when it is full?',
      type: 'boolean',
      description:
        'On: once the places are taken, people can still reply and go on a waiting list. Off: the form says the event is full.',
      initialValue: true,
      hidden: ({ parent }) => !(parent as { capacity?: number } | undefined)?.capacity,
    }),
    defineField({
      name: 'maxParty',
      title: 'Most people in one reply',
      type: 'number',
      description: 'A family replying together counts as this many. 1 means one person per reply.',
      initialValue: 10,
      validation: (R) => R.integer().min(1).max(50),
    }),
    defineField({
      name: 'closesAt',
      title: 'Stop taking replies at (optional)',
      type: 'datetime',
      description: 'Leave empty to stop when the event starts.',
      options: { timeStep: 15 },
    }),
    defineField({
      name: 'questions',
      title: 'Your questions (optional)',
      type: 'array',
      of: [{ type: 'formQuestion' }],
      description:
        'Asked after name, email and how many. Like "Any allergies?" or "Which age group?". Up to 12. Do not ask for anything private you do not need.',
      validation: (R) => R.max(12),
    }),
    defineField({
      name: 'confirmationNote',
      title: 'Add to the confirmation email (optional)',
      type: 'text',
      rows: 3,
      description: 'Like "Bring a towel and sun cream" or "Doors open at 5:30".',
    }),
  ],
  preview: {
    select: { name: 'eventName', startsAt: 'startsAt', capacity: 'capacity' },
    prepare: ({ name, startsAt, capacity }) => ({
      title: name ? `RSVP: ${name}` : 'RSVP: no event name yet',
      subtitle: [
        startsAt
          ? new Date(startsAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'No date set',
        capacity ? `${capacity} places` : 'No limit',
      ].join(', '),
    }),
  },
});

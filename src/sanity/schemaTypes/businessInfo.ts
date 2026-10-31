// Foundation, edit with care
// Content-side singleton. Business facts that change as the studio grows:
// where you work, travel fees, availability, and the studio's map location.
// These used to live on siteSettings; they moved here so Site Settings stays
// identity + infrastructure and this document holds the operational data.
// One instance only (id 'businessInfo'); singleton enforcement is in sanity.config.ts.
//
// IMPORTANT: the travelFees object type is named 'travelFeeTier' to match the
// old siteSettings.travelFees member type, so data migrated from siteSettings
// validates here without rework.

import { defineType, defineField, defineArrayMember } from 'sanity';
import {
  DAY_NAMES,
  HOURS_TIME_OPTIONS,
  WEEKDAYS,
  changeText,
  resolveHoursChanges,
  resolveHoursRows,
  weekRows,
} from '../../lib/business-hours';

export const businessInfo = defineType({
  name: 'businessInfo',
  title: 'Business info',
  type: 'document',
  // Business facts, not prose — keep out of Canvas's AI-assisted writing UI.
  options: { canvasApp: { exclude: true } },
  fields: [
    // Business model: controls which location fields apply and which are shown.
    defineField({
      name: 'businessModel',
      title: 'Business model',
      type: 'string',
      description:
        'How you deliver your services. "In-person" shows all location, travel, and service area fields. "Remote" hides them (fully virtual businesses have no physical service area). "Hybrid" shows location fields but marks them optional.',
      options: {
        list: [
          { title: 'In-person', value: 'in-person' },
          { title: 'Remote (fully virtual)', value: 'remote' },
          { title: 'Hybrid', value: 'hybrid' },
        ],
        layout: 'radio',
      },
      initialValue: 'in-person',
    }),

    // Home-base location. One source of truth for the city/state shown in the
    // footer AND fed into the LocalBusiness structured data search engines read.
    // Keep these matching your Google Business Profile exactly (NAP consistency).
    // Card 196: the street, ZIP, "how to find us" and the confirmed flag join
    // them, so the address card, the map block, the directions links and the
    // place line ("Hamilton, OH", src/lib/place-line.ts) all read one address.
    defineField({
      name: 'street',
      title: 'Street address (optional)',
      type: 'string',
      description:
        'Like "12 Main Street". With the city below it makes the address card, the map block and the directions links. Leave blank if visitors do not come to you.',
      hidden: ({ document }) => document?.businessModel === 'remote',
    }),
    defineField({
      name: 'city',
      title: 'Studio city',
      type: 'string',
      description:
        'Your home-base city. Shows in the footer and feeds the business listing data search engines read (LocalBusiness addressLocality). Must match your Google Business Profile exactly. Only change it if you relocate. Leave blank for fully remote businesses.',
      initialValue: 'Your City',
      hidden: ({ document }) => document?.businessModel === 'remote',
      // Optional for remote/hybrid — validation removed; leave blank is valid.
    }),
    defineField({
      name: 'state',
      title: 'Studio state (2-letter code)',
      type: 'string',
      description:
        'Two-letter state code, like "IN". Feeds the business listing "addressRegion". Must match your Google Business Profile. Leave blank for fully remote businesses.',
      initialValue: 'XX',
      hidden: ({ document }) => document?.businessModel === 'remote',
      validation: (Rule) => Rule.length(2).warning('Use the 2-letter state code, like "IN".'),
    }),
    defineField({
      name: 'zip',
      title: 'ZIP code (optional)',
      type: 'string',
      hidden: ({ document }) => document?.businessModel === 'remote',
      validation: (Rule) =>
        Rule.regex(/^\d{5}(-\d{4})?$/, { name: 'ZIP code' }).warning('Like 45013 or 45013-1234.'),
    }),
    defineField({
      name: 'addressConfirmed',
      title: 'The address is confirmed',
      type: 'boolean',
      description:
        'Untick while the street address is still a guess: the site shows a small "To confirm" tag beside it and keeps the street out of search results until you tick it again.',
      initialValue: true,
      hidden: ({ document }) => document?.businessModel === 'remote' || !document?.street,
    }),
    defineField({
      name: 'findUs',
      title: 'How to find us (optional)',
      type: 'text',
      rows: 2,
      description:
        'One sentence under the address, like "Park behind the building and use the side door." Leave blank to hide.',
      hidden: ({ document }) => document?.businessModel === 'remote' || !document?.street,
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: 'serviceRegion',
      title: 'Service region phrase',
      type: 'string',
      description:
        'The broader area you serve, shown as "Serving {this}" in the footer. Example: "Greater Metro Area". Leave blank for fully remote businesses.',
      initialValue: 'Your Metro Area',
      hidden: ({ document }) => document?.businessModel === 'remote',
    }),
    defineField({
      name: 'serviceAreas',
      title: 'Service areas',
      type: 'array',
      description:
        'Cities and neighborhoods you serve, in display order. Put your home-base city first. This list shows up on the site and tells search engines where you work. Leave blank for fully remote businesses.',
      of: [defineArrayMember({ type: 'string' })],
      hidden: ({ document }) => document?.businessModel === 'remote',
      // Optional — no required validation; remote businesses have no service areas.
    }),
    defineField({
      name: 'travelFees',
      title: 'Travel fee tiers',
      type: 'array',
      description:
        'Drive-time tiers and the travel fee for each. Always quoted upfront. Leave blank for fully remote businesses.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'travelFeeTier',
          fields: [
            defineField({
              name: 'distanceLabel',
              title: 'Distance label',
              type: 'string',
              description: 'Like "45 to 75 minutes".',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'fee',
              title: 'Fee',
              type: 'string',
              description: 'Like "$50" or "None".',
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: { title: 'distanceLabel', subtitle: 'fee' },
          },
        }),
      ],
      hidden: ({ document }) => document?.businessModel === 'remote',
      // Optional — no required validation; remote businesses have no travel fees.
    }),
    defineField({
      name: 'availabilityStatus',
      title: 'Availability status',
      type: 'string',
      description:
        'Short status shown on the Contact page. Examples: "Accepting new clients", "Booking for Fall 2026", "Currently full, accepting waitlist".',
      validation: (Rule) => Rule.required().max(80),
    }),
    defineField({
      name: 'geoLat',
      title: 'Studio latitude',
      type: 'number',
      description:
        'For local "near me" search. Your latitude. Find it in Google Maps by right-clicking your address. This feeds the business listing data that search engines read. Leave blank for fully remote businesses.',
      hidden: ({ document }) => document?.businessModel === 'remote',
    }),
    defineField({
      name: 'geoLng',
      title: 'Studio longitude',
      type: 'number',
      description:
        'For local "near me" search. Your longitude. Pairs with the latitude above. Leave blank for fully remote businesses.',
      hidden: ({ document }) => document?.businessModel === 'remote',
    }),

    // Additional locations for multi-location businesses.
    // Each entry can power a separate address in structured data.
    defineField({
      name: 'additionalLocations',
      title: 'Additional locations',
      type: 'array',
      description:
        'For multi-location businesses: add secondary studio or office locations here. Each entry can appear in structured data alongside the primary address above.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'additionalLocation',
          fields: [
            defineField({
              name: 'city',
              title: 'City',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'state',
              title: 'State (2-letter code)',
              type: 'string',
              validation: (Rule) =>
                Rule.required().length(2).warning('Use the 2-letter state code.'),
            }),
            defineField({
              name: 'geoLat',
              title: 'Latitude',
              type: 'number',
            }),
            defineField({
              name: 'geoLng',
              title: 'Longitude',
              type: 'number',
            }),
          ],
          preview: {
            select: { city: 'city', state: 'state' },
            prepare: ({ city, state }) => ({
              title: [city, state].filter(Boolean).join(', ') || '(no city)',
            }),
          },
        }),
      ],
      hidden: ({ document }) => document?.businessModel === 'remote',
    }),

    // ── Opening hours (card 196) ──────────────────────────────────────────────
    // Optional: a site with no rows here shows nothing new. Typed once and read
    // everywhere through src/lib/business-hours.ts: the Opening hours and Map
    // blocks, the footer's "Open now" line, the Contact page and the
    // LocalBusiness structured data (openingHoursSpecification). Dated changes
    // never touch the usual week, and drop off by themselves after their last
    // day (rule 15). `days`, `opens`, `closes` and `kind` are in NON_STEGA_FIELDS.
    defineField({
      name: 'openingHours',
      title: 'Opening hours (optional)',
      type: 'array',
      fieldset: 'hours',
      description:
        'Your usual week. One row per set of days with the same hours; a day with no row shows as closed. Open twice in a day (9 to noon, then 1 to 5)? Add two rows. Leave empty if you have no set hours.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'openingHoursRow',
          title: 'Hours',
          fields: [
            defineField({
              name: 'days',
              title: 'Days',
              type: 'array',
              of: [defineArrayMember({ type: 'string' })],
              options: {
                list: WEEKDAYS.map((value, i) => ({ title: DAY_NAMES[i], value })),
                layout: 'grid',
              },
              validation: (Rule) => Rule.required().min(1).warning('Tick at least one day.'),
            }),
            defineField({
              name: 'opens',
              title: 'Opens',
              type: 'string',
              options: { list: HOURS_TIME_OPTIONS },
              validation: (Rule) => Rule.required().warning('Pick the opening time.'),
            }),
            defineField({
              name: 'closes',
              title: 'Closes',
              type: 'string',
              description:
                'A closing time earlier than the opening time runs past midnight (6 pm to 2 am). The same time twice means open 24 hours.',
              options: { list: HOURS_TIME_OPTIONS },
              validation: (Rule) => Rule.required().warning('Pick the closing time.'),
            }),
            defineField({
              name: 'label',
              title: 'What is open (optional)',
              type: 'string',
              description:
                'Only when parts of the business keep different hours, like "Kitchen" or "Front desk".',
              validation: (Rule) => Rule.max(30),
            }),
            defineField({
              name: 'confirmed',
              title: 'These hours are confirmed',
              type: 'boolean',
              description:
                'Untick while they are a guess: they show with a "To confirm" tag and stay out of search results.',
              initialValue: true,
            }),
          ],
          preview: {
            select: { days: 'days', opens: 'opens', closes: 'closes', label: 'label' },
            prepare: ({ days, opens, closes, label }) => {
              const rows = resolveHoursRows([{ days, opens, closes }]);
              const week = rows.length ? weekRows({ rows, changes: [] }) : [];
              const open = week.find((w) => w.text !== 'Closed');
              return {
                title: open ? `${open.label}: ${open.text}` : 'Hours (not finished)',
                subtitle: label || undefined,
              };
            },
          },
        }),
      ],
    }),
    defineField({
      name: 'hoursNote',
      title: 'A line under the hours (optional)',
      type: 'string',
      fieldset: 'hours',
      description: 'Like "Evenings by appointment." Leave blank to hide.',
      validation: (Rule) => Rule.max(120),
    }),
    defineField({
      name: 'hoursChanges',
      title: 'Hours changes: holidays and closures',
      type: 'array',
      fieldset: 'hours',
      description:
        'A different day: closed for a holiday, a short day, a week away. The website shows it on those dates and goes back to your usual hours by itself afterward. Your usual hours above are never changed.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'hoursChange',
          title: 'Hours change',
          fields: [
            defineField({
              name: 'date',
              title: 'Which day',
              type: 'date',
              validation: (Rule) => [
                Rule.required(),
                Rule.custom((value, ctx) => {
                  const parent = ctx.parent as { endDate?: string } | undefined;
                  const last =
                    parent?.endDate && parent.endDate > (value ?? '') ? parent.endDate : value;
                  const today = new Date().toISOString().slice(0, 10);
                  return !last || last >= today
                    ? true
                    : 'This day has passed, so it no longer shows. You can remove it.';
                }).warning(),
              ],
            }),
            defineField({
              name: 'endDate',
              title: 'Last day (optional)',
              type: 'date',
              description: 'For more than one day in a row, like a week away.',
              validation: (Rule) =>
                Rule.custom((end, ctx) => {
                  const start = (ctx.parent as { date?: string } | undefined)?.date;
                  return !end || !start || end >= start || 'The last day is before the first day.';
                }).warning(),
            }),
            defineField({
              name: 'kind',
              title: 'What is different',
              type: 'string',
              options: {
                list: [
                  { title: 'Closed all day', value: 'closed' },
                  { title: 'Different hours', value: 'hours' },
                ],
                layout: 'radio',
                direction: 'horizontal',
              },
              initialValue: 'closed',
            }),
            defineField({
              name: 'opens',
              title: 'Opens',
              type: 'string',
              options: { list: HOURS_TIME_OPTIONS },
              hidden: ({ parent }) => (parent as { kind?: string } | undefined)?.kind !== 'hours',
              validation: (Rule) =>
                Rule.custom((v, ctx) =>
                  (ctx.parent as { kind?: string } | undefined)?.kind === 'hours' && !v
                    ? 'Pick the opening time, or this change is skipped.'
                    : true,
                ).warning(),
            }),
            defineField({
              name: 'closes',
              title: 'Closes',
              type: 'string',
              options: { list: HOURS_TIME_OPTIONS },
              hidden: ({ parent }) => (parent as { kind?: string } | undefined)?.kind !== 'hours',
              validation: (Rule) =>
                Rule.custom((v, ctx) =>
                  (ctx.parent as { kind?: string } | undefined)?.kind === 'hours' && !v
                    ? 'Pick the closing time, or this change is skipped.'
                    : true,
                ).warning(),
            }),
            defineField({
              name: 'note',
              title: 'Why (optional)',
              type: 'string',
              description: 'Shown beside the date, like "Thanksgiving" or "Staff training".',
              validation: (Rule) => Rule.max(60),
            }),
          ],
          preview: {
            select: {
              date: 'date',
              endDate: 'endDate',
              kind: 'kind',
              opens: 'opens',
              closes: 'closes',
              note: 'note',
            },
            prepare: (c) => {
              const [change] = resolveHoursChanges([c]);
              return {
                title: change ? changeText(change) : 'Hours change (not finished)',
              };
            },
          },
        }),
      ],
    }),
  ],
  fieldsets: [
    {
      name: 'hours',
      title: 'Opening hours',
      description: 'Optional. Leave empty and the website shows no hours anywhere.',
      options: { collapsible: true, collapsed: false },
    },
  ],
  preview: {
    prepare: () => ({ title: 'Business info' }),
  },
});

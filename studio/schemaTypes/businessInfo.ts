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
      validation: (Rule) =>
        Rule.length(2).warning('Use the 2-letter state code, like "IN".'),
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
        'For local "near me" search. Your studio latitude coordinate. Find it in Google Maps by right-clicking your address. This feeds the business listing data that search engines read. Leave blank for fully remote businesses.',
      hidden: ({ document }) => document?.businessModel === 'remote',
    }),
    defineField({
      name: 'geoLng',
      title: 'Studio longitude',
      type: 'number',
      description:
        'For local "near me" search. Your studio longitude coordinate. Pairs with the latitude above. Leave blank for fully remote businesses.',
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
  ],
  preview: {
    prepare: () => ({ title: 'Business info' }),
  },
});

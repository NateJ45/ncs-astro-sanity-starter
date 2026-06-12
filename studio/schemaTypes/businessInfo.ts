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
    // Home-base location. One source of truth for the city/state shown in the
    // footer AND fed into the LocalBusiness structured data search engines read.
    // Keep these matching your Google Business Profile exactly (NAP consistency).
    defineField({
      name: 'city',
      title: 'Studio city',
      type: 'string',
      description:
        'Your home-base city. Shows in the footer and feeds the business listing data search engines read (LocalBusiness addressLocality). Must match your Google Business Profile exactly. Only change it if you relocate.',
      initialValue: 'Your City',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'state',
      title: 'Studio state (2-letter code)',
      type: 'string',
      description:
        'Two-letter state code, like "IN". Feeds the business listing "addressRegion". Must match your Google Business Profile.',
      initialValue: 'XX',
      validation: (Rule) =>
        Rule.required().length(2).warning('Use the 2-letter state code, like "IN".'),
    }),
    defineField({
      name: 'serviceRegion',
      title: 'Service region phrase',
      type: 'string',
      description:
        'The broader area you serve, shown as "Serving {this}" in the footer. Example: "Greater Metro Area".',
      initialValue: 'Your Metro Area',
    }),
    defineField({
      name: 'serviceAreas',
      title: 'Service areas',
      type: 'array',
      description: 'Cities and neighborhoods you serve, in display order. Plainfield should be first. This list shows up on the site and tells search engines where you work.',
      of: [defineArrayMember({ type: 'string' })],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'travelFees',
      title: 'Travel fee tiers',
      type: 'array',
      description: 'Drive-time tiers and the travel fee for each. Always quoted upfront.',
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
      validation: (Rule) => Rule.required().min(1),
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
      description: 'For local "near me" search. Your studio latitude coordinate. Find it in Google Maps by right-clicking your address. This feeds the business listing data that search engines read.',
    }),
    defineField({
      name: 'geoLng',
      title: 'Studio longitude',
      type: 'number',
      description: 'For local "near me" search. Your studio longitude coordinate. Pairs with the latitude above.',
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Business info' }),
  },
});

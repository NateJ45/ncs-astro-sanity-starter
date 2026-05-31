// Client testimonials. Used across the site — featured pull-quote on the
// homepage, smaller cards in the grid, optional sidebar quotes elsewhere.

import { defineType, defineField } from 'sanity';

export const testimonial = defineType({
  name: 'testimonial',
  title: 'Testimonial',
  type: 'document',
  // Verbatim client quotes — AI must NOT touch or "improve" these.
  options: { canvasApp: { exclude: true } },
  fields: [
    defineField({
      name: 'quote',
      title: 'Quote',
      type: 'text',
      description: "What the client said. Keep their punctuation.",
      rows: 4,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'attribution',
      title: 'Attribution',
      type: 'string',
      description: 'Their name as they want it shown. Example: "Sara Hooker" or "Tom K.".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      description: 'When they wrote the review.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      description: 'Where the testimonial came from.',
      options: {
        list: [
          { title: 'Facebook', value: 'Facebook' },
          { title: 'Google', value: 'Google' },
          { title: 'Houzz', value: 'Houzz' },
          { title: 'Direct (email or text)', value: 'Direct (email or text)' },
          { title: 'Other', value: 'Other' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'location',
      title: 'Location (optional)',
      type: 'string',
      description: 'Where they live, if relevant. Example: "Chicago, IL" or "the suburbs".',
    }),
    defineField({
      name: 'photo',
      title: 'Photo (optional)',
      type: 'image',
      description: 'Optional photo of the client. Get permission before adding.',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string' }),
      ],
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      description:
        'If checked, this is the large featured quote at the top of the testimonials section. Only one should be featured at a time.',
      initialValue: false,
    }),
    defineField({
      name: 'sourceType',
      title: 'Source type',
      type: 'string',
      description: 'Where this review was originally posted. Used to show a source badge on the testimonial card.',
      options: {
        list: [
          { title: 'Google', value: 'Google' },
          { title: 'Facebook', value: 'Facebook' },
          { title: 'Houzz', value: 'Houzz' },
          { title: 'Direct', value: 'Direct' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'reviewUrl',
      title: 'Review URL (optional)',
      type: 'url',
      description:
        'Direct link to the original review on Google, Facebook, or Houzz. When set, the testimonial card can link out to the original.',
    }),
  ],
  preview: {
    select: { quote: 'quote', attribution: 'attribution', date: 'date', media: 'photo' },
    prepare: ({ quote, attribution, date, media }) => ({
      title: quote ? (quote.length > 60 ? quote.slice(0, 60) + '…' : quote) : '(no quote)',
      subtitle: `${attribution ?? '?'} · ${date ?? ''}`,
      media,
    }),
  },
  orderings: [
    {
      title: 'Date, newest first',
      name: 'dateDesc',
      by: [{ field: 'date', direction: 'desc' }],
    },
  ],
});

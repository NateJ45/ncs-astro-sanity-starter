// Press mentions and "as seen in" items. Displayed as a logo strip on the
// home and about pages, and as a full listing at /press.
// Safe to edit by hand.

import { defineType, defineField } from 'sanity';
import { orderRankField } from '@sanity/orderable-document-list';

export const pressItem = defineType({
  name: 'pressItem',
  title: 'Press Item',
  type: 'document',
  // Config / structural — not editorial prose, so exclude from Canvas.
  options: { canvasApp: { exclude: true } },
  fields: [
    defineField({
      name: 'outlet',
      title: 'Outlet name',
      type: 'string',
      description: 'Publication or media outlet name. Example: "Houzz" or "Indianapolis Star".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'logo',
      title: 'Outlet logo',
      type: 'image',
      description: 'Outlet logo for the press strip. Prefer a white or transparent-background SVG/PNG so it renders in both themes.',
      options: { hotspot: false },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description: 'Usually just the outlet name. Example: "Houzz logo".',
          validation: (R) => R.required(),
        }),
      ],
    }),
    defineField({
      name: 'quote',
      title: 'Quote or headline (optional)',
      type: 'text',
      rows: 3,
      description: 'A pull-quote or headline from the coverage. Shown on the /press page listing.',
    }),
    defineField({
      name: 'url',
      title: 'Article URL',
      type: 'url',
      description: 'Link to the original article or mention.',
    }),
    defineField({
      name: 'date',
      title: 'Publication date',
      type: 'date',
      description: 'When the coverage was published.',
    }),
    // Hidden field managed by the orderable-document-list plugin.
    orderRankField({ type: 'pressItem' }),
  ],
  preview: {
    select: { outlet: 'outlet', date: 'date', media: 'logo' },
    prepare: ({ outlet, date, media }) => ({
      title: outlet ?? '(unnamed outlet)',
      subtitle: date ?? '',
      media,
    }),
  },
  orderings: [
    {
      title: 'Display order',
      name: 'orderAsc',
      by: [{ field: 'orderRank', direction: 'asc' }],
    },
    {
      title: 'Date, newest first',
      name: 'dateDesc',
      by: [{ field: 'date', direction: 'desc' }],
    },
  ],
});

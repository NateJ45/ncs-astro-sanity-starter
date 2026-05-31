// Shop collection groupings for the shop page.
// Each collection is a named section (e.g. "Workspace Picks", "Lighting Favorites")
// that groups related shop items together.
// Safe to edit by hand.

import { defineType, defineField } from 'sanity';
import { orderRankField } from '@sanity/orderable-document-list';

export const shopCollection = defineType({
  name: 'shopCollection',
  title: 'Shop Collection',
  type: 'document',
  // Config / structural — not editor prose, so exclude from Canvas.
  options: { canvasApp: { exclude: true } },
  fields: [
    defineField({
      name: 'title',
      title: 'Collection title',
      type: 'string',
      description: 'Section heading shown on the /shop page. Example: "Workspace Picks" or "Everyday Carry".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'URL-friendly version (auto-generated from title).',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'blurb',
      title: 'Collection blurb (optional)',
      type: 'text',
      rows: 2,
      description: 'Optional one- or two-sentence description shown under the collection heading.',
    }),
    // Hidden field managed by the orderable-document-list plugin.
    orderRankField({ type: 'shopCollection' }),
  ],
  preview: {
    select: { title: 'title' },
    prepare: ({ title }) => ({
      title: title ?? '(untitled collection)',
    }),
  },
  orderings: [
    {
      title: 'Display order',
      name: 'orderAsc',
      by: [{ field: 'orderRank', direction: 'asc' }],
    },
  ],
});

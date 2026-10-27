// scaffold-file: documents
// Safe to edit by hand
// =============================================================================
// documentsSection - "Documents": a list of downloadable files (PORTS.md card 197)
// =============================================================================
// Shows the newest current Documents (the `libraryDocument` collection), all of them or one
// group. It fills itself from the collection, so it is on SELF_FILLING_SECTIONS in
// pageBuilderConfig.ts: a fresh block is not told it is empty.
// Rule 9: no colour or surface field; the page's rhythm decides the band.
// =============================================================================
import { defineField, defineType } from 'sanity';
import { DownloadIcon } from '@sanity/icons/Download';

export const documentsSection = defineType({
  name: 'documentsSection',
  title: 'Documents (downloads)',
  type: 'object',
  icon: DownloadIcon,
  description:
    'A list of files people can download: forms, price lists, reports. Add the files under Documents in the Studio; this block shows the newest.',
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      initialValue: 'Documents',
      validation: (R) => R.max(90),
    }),
    defineField({
      name: 'intro',
      title: 'A line under the heading (optional)',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'category',
      title: 'Only this group (optional)',
      type: 'string',
      description:
        'Type a group name exactly as you filed the documents, like "Forms". Leave empty to list every group.',
      validation: (R) => R.max(40),
    }),
    defineField({
      name: 'limit',
      title: 'How many',
      type: 'number',
      initialValue: 6,
      description: 'The newest first.',
      validation: (R) => R.min(1).max(24).integer(),
    }),
    defineField({
      name: 'showDates',
      title: 'Show the dates',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  preview: {
    select: { title: 'heading', category: 'category', limit: 'limit' },
    prepare: ({ title, category, limit }) => ({
      title: title || 'Documents',
      subtitle: `Documents: ${category || 'every group'}, newest ${limit ?? 6}`,
    }),
  },
});

// scaffold-file: journal
// Safe to edit by hand
// The Journal page's block (card 190, ported from FBC Auburn 2026-10-26): "Journal posts". The
// category chips, every post newest first and the newsletter sign-up under them. The Journal
// page is a page builder like About, and this is the piece it used to draw in code, so the
// editor can put sections above or below the posts. Offered only on the Journal page
// (JOURNAL_SECTION_TYPES in richSections.ts). The posts come from the Journal list itself;
// the block holds only its two switches. No colour field (rule 9); SELF_CONTAINED in
// sectionCadence.ts.

import { defineType, defineField } from 'sanity';
import { DocumentTextIcon } from '@sanity/icons/DocumentText';

export const journalPostsSection = defineType({
  name: 'journalPostsSection',
  title: 'Journal posts',
  type: 'object',
  icon: DocumentTextIcon,
  description: 'Every journal post, newest first, with the category buttons above them.',
  fields: [
    defineField({
      name: 'showCategories',
      title: 'Show the category buttons above the posts',
      type: 'boolean',
      initialValue: true,
      description: 'They show once a post has a category.',
    }),
    defineField({
      name: 'showNewsletter',
      title: 'Show the newsletter sign-up under the posts',
      type: 'boolean',
      initialValue: true,
      description: 'Only while the newsletter is switched on in Site settings.',
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Journal posts', subtitle: 'Every post, newest first' }),
  },
});

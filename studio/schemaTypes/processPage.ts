// Foundation, edit with care
// Process page singleton. Process steps auto-populate from the processStep
// collection. The page is fully section-driven via pageBuilder.

import { defineType, defineField } from 'sanity';
import { PROCESS_SECTION_TYPES } from './richSections';

export const processPage = defineType({
  name: 'processPage',
  title: 'Process Page',
  type: 'document',
  options: { canvasApp: { exclude: true } },
  groups: [
    { name: 'pageBuilder', title: 'Page layout' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'pageBuilder',
      title: 'Page layout',
      type: 'array',
      group: 'pageBuilder',
      description:
        'The sections on the Process page. Drag to reorder, remove a section to hide it, or add a new block from the library.',
      of: PROCESS_SECTION_TYPES,
    }),

    defineField({
      name: 'seoTitle',
      title: 'SEO title',
      type: 'string',
      group: 'seo',
      description: 'Browser tab and Google result title. Aim for 50 to 60 characters.',
      validation: (Rule) =>
        Rule.max(60).warning('Titles longer than about 60 characters get cut off in Google search results.'),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO description',
      type: 'text',
      rows: 3,
      group: 'seo',
      description: 'The sentence under the title in Google results. Aim for 150 to 160 characters.',
      validation: (Rule) =>
        Rule.max(160).warning('Descriptions longer than about 160 characters get cut off in Google search results.'),
    }),
    defineField({
      name: 'seoImage',
      title: 'Social share image (this page)',
      type: 'image',
      group: 'seo',
      description:
        'Optional. Overrides the site default. Wide image, about 1200 x 630 pixels.',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string' }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Process Page' }) },
});

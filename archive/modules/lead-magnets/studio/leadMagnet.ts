// Gated downloadable guides. Each guide has a landing page at /guides/[slug]
// where visitors enter their email to unlock the PDF download.
// Safe to edit by hand.

import { defineType, defineField, defineArrayMember } from 'sanity';
import { orderRankField } from '@sanity/orderable-document-list';

export const leadMagnet = defineType({
  name: 'leadMagnet',
  title: 'Guide (lead magnet)',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Guide title',
      type: 'string',
      description: 'Public title shown on the /guides index and the landing page. Example: "How to get the most from a $150 consultation".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'URL-friendly version (auto-generated from title). Used at /guides/[slug].',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 3,
      description: 'Two to three sentences describing what the guide covers. Shown on the /guides index card.',
      options: {
        canvasApp: {
          purpose:
            'Short summary for the guide index card, 2-3 sentences. Voice: warm, plain-spoken, slightly informal, confident about money; sounds like a smart friend, not a brochure; banned vocabulary: transformative, curated, elevated, tailored, investment in your space; no em-dashes.',
        },
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover image',
      type: 'image',
      description: 'Optional cover image shown on the landing page and the index card.',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          validation: (R) => R.required(),
        }),
      ],
    }),
    defineField({
      name: 'file',
      title: 'PDF file',
      type: 'file',
      description: 'The downloadable PDF. Upload here and the gated form will reveal the download link on submit.',
      options: { accept: '.pdf' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'gateHeading',
      title: 'Gate heading',
      type: 'string',
      description: 'Headline above the email-capture form on the landing page. Example: "Get the free guide."',
      initialValue: 'Get the free guide.',
    }),
    defineField({
      name: 'gateBlurb',
      title: 'Gate blurb',
      type: 'text',
      rows: 3,
      description: 'One or two sentences under the gate heading explaining what happens after they submit.',
      options: {
        canvasApp: {
          purpose:
            'One or two sentences explaining what the visitor gets when they enter their email. Voice: warm, plain-spoken, slightly informal, confident about money; sounds like a smart friend, not a brochure; banned vocabulary: transformative, curated, elevated, tailored, investment in your space; no em-dashes.',
        },
      },
    }),
    defineField({
      name: 'buttonLabel',
      title: 'Submit button label',
      type: 'string',
      description: 'Text on the submit button.',
      initialValue: 'Send me the guide',
    }),
    defineField({
      name: 'successMessage',
      title: 'Success message',
      type: 'text',
      rows: 2,
      description: 'Message shown after a successful submission. The download link appears automatically.',
      initialValue: "You're in. Your download link is just below.",
    }),
    defineField({
      name: 'espTag',
      title: 'ESP tag (optional)',
      type: 'string',
      description: 'Optional tag to apply in your email provider when someone downloads this guide. Useful for segmenting follow-ups.',
    }),
    defineField({
      name: 'seoTitle',
      title: 'SEO title (optional)',
      type: 'string',
      description: 'Browser tab and Google result title. Aim for 50 to 60 characters. Leave blank to use the guide title.',
      validation: (Rule) => Rule.max(60).warning('Titles longer than about 60 characters get cut off in Google search results.'),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO description (optional)',
      type: 'text',
      rows: 2,
      description: 'The sentence under the title in Google results. Aim for 150 to 160 characters. Leave blank to use the summary.',
      validation: (Rule) => Rule.max(160).warning('Descriptions longer than about 160 characters get cut off in Google search results.'),
    }),
    defineField({
      name: 'published',
      title: 'Published',
      type: 'boolean',
      description: 'When off, this guide is hidden from the /guides index and its landing page returns a 404.',
      initialValue: true,
    }),
    // Hidden field managed by the orderable-document-list plugin.
    orderRankField({ type: 'leadMagnet' }),
  ],
  preview: {
    select: { title: 'title', published: 'published', media: 'coverImage' },
    prepare: ({ title, published, media }) => ({
      title: title ?? '(untitled guide)',
      subtitle: published ? 'Published' : 'Draft',
      media,
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

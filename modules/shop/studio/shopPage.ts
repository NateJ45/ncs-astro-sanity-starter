// Shop page singleton. Controls the /shop page intro, FTC affiliate disclosure,
// and which collections surface. One instance only; singleton enforcement in sanity.config.ts.
// Safe to edit by hand.

import { defineType, defineField, defineArrayMember } from 'sanity';

export const shopPage = defineType({
  name: 'shopPage',
  title: 'Shop Page',
  type: 'document',
  // Configuration, not prose — don't surface in Canvas's AI-assisted writing UI.
  options: { canvasApp: { exclude: true } },
  groups: [
    { name: 'seo', title: 'SEO' },
    { name: 'hero', title: 'Hero' },
    { name: 'content', title: 'Content' },
  ],
  fields: [
    // SEO
    defineField({
      name: 'seoTitle',
      title: 'SEO title',
      type: 'string',
      group: 'seo',
      description: 'Browser tab and Google result title. Aim for 50 to 60 characters. Front-load the location or service.',
      validation: (Rule) => Rule.max(60).warning('Titles longer than about 60 characters get cut off in Google search results.'),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO description',
      type: 'text',
      rows: 3,
      group: 'seo',
      description: 'The sentence under the title in Google results. Aim for 150 to 160 characters. Write it for a person, not a search engine.',
      validation: (Rule) => Rule.max(160).warning('Descriptions longer than about 160 characters get cut off in Google search results.'),
    }),
    defineField({
      name: 'seoImage',
      title: 'Social share image (this page)',
      type: 'image',
      group: 'seo',
      description: 'Optional. The image shown when this page is shared on social media or in a text. Overrides the site default in Site Settings. Use a wide image, about 1200 by 630 pixels. Leave blank to use the site default.',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string' }),
      ],
    }),

    // Hero
    defineField({ name: 'heroEyebrow', title: 'Hero eyebrow', type: 'string', group: 'hero' }),
    defineField({
      name: 'heroHeadline',
      title: 'Hero headline',
      type: 'string',
      group: 'hero',
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'heroSubhead', title: 'Hero subhead', type: 'text', rows: 2, group: 'hero' }),
    defineField({
      name: 'heroImage',
      title: 'Hero background image',
      type: 'image',
      group: 'hero',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (R) => R.required() }),
      ],
    }),
    defineField({
      name: 'heroScriptAccent',
      title: 'Script-font accent word (optional)',
      type: 'string',
      group: 'hero',
      description: 'A single word from the headline to render in Pinyon Script. Must match exactly. Leave blank to skip.',
    }),

    // Content
    defineField({
      name: 'enabled',
      title: 'Page enabled',
      type: 'boolean',
      group: 'content',
      description: 'When off, /shop redirects to the home page. The nav link hides automatically.',
      initialValue: true,
    }),
    defineField({
      name: 'intro',
      title: 'Intro copy',
      type: 'text',
      rows: 3,
      group: 'content',
      description: 'Optional paragraph shown below the hero. Explain what the shop is and how items are selected.',
    }),
    defineField({
      name: 'disclosure',
      title: 'FTC disclosure text',
      type: 'text',
      rows: 3,
      group: 'content',
      description: 'Required FTC affiliate disclosure. Shown prominently near the top of the page, above the first collection. Example: "Some links below are affiliate links. If you buy through them the studio may earn a small commission at no extra cost to you."',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'collections',
      title: 'Collections to show (in order)',
      type: 'array',
      group: 'content',
      description: 'Which shop collections appear on this page, in display order. Items within each collection are ordered by their own display rank.',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'shopCollection' }] })],
    }),
  ],
  preview: { prepare: () => ({ title: 'Shop Page' }) },
});

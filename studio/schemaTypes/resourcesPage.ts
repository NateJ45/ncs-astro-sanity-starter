// Resources hub page singleton. An ordered list of cards linking to free tools
// and guides (quiz, calculator, guides index, FAQ, journal).
// Route: /resources. One instance only; singleton enforcement in sanity.config.ts.
// Safe to edit by hand.

import { defineType, defineField, defineArrayMember } from 'sanity';

export const resourcesPage = defineType({
  name: 'resourcesPage',
  title: 'Resources Page',
  type: 'document',
  // Marketing copy is locked and structural — edit fields directly in Studio, not Canvas.
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
      name: 'intro',
      title: 'Intro copy',
      type: 'text',
      rows: 3,
      group: 'content',
      description: 'Optional paragraph below the hero introducing the resources hub.',
    }),
    defineField({
      name: 'cards',
      title: 'Resource cards',
      type: 'array',
      group: 'content',
      description: 'The tools and guides shown on this page, in display order. Defaults link to the quiz, calculator, guides, FAQ, and journal.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'resourceCard',
          fields: [
            defineField({ name: 'title', title: 'Card title', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'blurb', title: 'Card blurb', type: 'text', rows: 2, description: 'One sentence describing what this tool or guide does.' }),
            defineField({
              name: 'icon',
              title: 'Icon image (optional)',
              type: 'image',
              description: 'Optional small icon or image for the card.',
              options: { hotspot: false },
              fields: [
                defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (R) => R.required() }),
              ],
            }),
            defineField({ name: 'link', title: 'Link (internal path or full URL)', type: 'string', description: 'Where the card links. Internal example: "/quiz". External: full URL.', validation: (Rule) => Rule.required() }),
          ],
          preview: {
            select: { title: 'title', link: 'link' },
            prepare: ({ title, link }) => ({ title: title ?? '(untitled)', subtitle: link ?? '' }),
          },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Resources Page' }) },
});

// Privacy policy page singleton. Route: /privacy.
// Portable Text body + last-updated date, editable by the site editor.
// One instance only; singleton enforcement in sanity.config.ts.
// Safe to edit by hand.

import { defineType, defineField, defineArrayMember } from 'sanity';

export const privacyPage = defineType({
  name: 'privacyPage',
  title: 'Privacy Policy Page',
  type: 'document',
  // Configuration, not prose the editor writes — exclude from Canvas.
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
    defineField({
      name: 'heroEyebrow',
      title: 'Hero eyebrow',
      type: 'string',
      group: 'hero',
      initialValue: 'Studio Name.',
    }),
    defineField({
      name: 'heroHeadline',
      title: 'Hero headline',
      type: 'string',
      group: 'hero',
      initialValue: 'Privacy Policy',
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'heroSubhead', title: 'Hero subhead', type: 'text', rows: 2, group: 'hero' }),
    defineField({
      name: 'heroImage',
      title: 'Hero background image (optional)',
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
      description: 'A single word from the headline to render in the script accent font. Must match exactly. Leave blank to skip.',
    }),

    // Content
    defineField({
      name: 'lastUpdated',
      title: 'Last updated date',
      type: 'date',
      group: 'content',
      description: 'Shown at the top of the policy. Update whenever the policy content changes.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Policy body',
      type: 'array',
      group: 'content',
      description: 'The full privacy policy text. Use headings (H2/H3) to organize sections.',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            { title: 'Paragraph', value: 'normal' },
            { title: 'Heading 2', value: 'h2' },
            { title: 'Heading 3', value: 'h3' },
          ],
          lists: [
            { title: 'Bullet', value: 'bullet' },
            { title: 'Numbered', value: 'number' },
          ],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  { name: 'href', type: 'url', title: 'URL' },
                  { name: 'openInNewTab', type: 'boolean', title: 'Open in new tab', initialValue: false },
                ],
              },
            ],
          },
        }),
      ],
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: { prepare: () => ({ title: 'Privacy Policy Page' }) },
});

// Donations page singleton. Route: /donate.
// Presents mission copy, impact stats, a donate CTA linking to an external
// processor (Donorbox, PayPal Giving Fund, etc.), and an optional FAQ section.
// One instance only; singleton enforcement in sanity.config.ts.
// Safe to edit by hand.

import { defineType, defineField, defineArrayMember } from 'sanity';

export const donationsPage = defineType({
  name: 'donationsPage',
  title: 'Donations Page',
  type: 'document',
  // Marketing copy is locked and structural -- edit fields directly in Studio, not Canvas.
  options: { canvasApp: { exclude: true } },
  groups: [
    { name: 'seo',     title: 'SEO' },
    { name: 'hero',    title: 'Hero' },
    { name: 'mission', title: 'Mission' },
    { name: 'impact',  title: 'Impact Stats' },
    { name: 'donate',  title: 'Donate CTA' },
    { name: 'faq',     title: 'FAQ' },
    { name: 'final',   title: 'Closing CTA' },
  ],
  fields: [
    // SEO
    defineField({
      name: 'seoTitle',
      title: 'SEO title',
      type: 'string',
      group: 'seo',
      description: 'Browser tab and Google result title. Aim for 50 to 60 characters. Front-load the organization name or cause.',
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
      description: 'A single word from the headline to render in Pinyon Script. Must match exactly. Leave blank to skip.',
    }),

    // Mission
    defineField({
      name: 'mission',
      title: 'Mission copy',
      type: 'array',
      group: 'mission',
      description: 'The core statement of your mission and impact. Two to four paragraphs. This is the primary narrative on the page.',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            { title: 'Paragraph', value: 'normal' },
            { title: 'Heading 3', value: 'h3' },
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
    }),

    // Impact Stats
    defineField({
      name: 'impactStats',
      title: 'Impact stats',
      type: 'array',
      group: 'impact',
      description: 'Up to four numbers or facts that show the scale of your work. Example: "1,200 people helped" or "8 years serving the community". Each shows as a stat block in a row.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'impactStat',
          fields: [
            defineField({ name: 'value', title: 'Value', type: 'string', description: 'Example: "1,200" or "8 years" or "100%".', validation: (Rule) => Rule.required() }),
            defineField({ name: 'label', title: 'Label', type: 'string', description: 'What the value represents. Example: "people helped" or "years of service".', validation: (Rule) => Rule.required() }),
          ],
          preview: {
            select: { value: 'value', label: 'label' },
            prepare: ({ value, label }) => ({ title: `${value ?? '?'} ${label ?? ''}` }),
          },
        }),
      ],
      validation: (Rule) => Rule.max(4),
    }),

    // Donate CTA
    defineField({
      name: 'donateUrl',
      title: 'Donate button URL',
      type: 'url',
      group: 'donate',
      description: 'The URL of the external donation processor (Donorbox, PayPal Giving Fund, Stripe, etc.). This is the primary CTA on the page. Warning: the page will have no working donate button until this is set.',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          // Soft warning rather than hard error so the page can be saved while
          // the processor is being set up.
          if (!value) return 'Add a donation processor URL before publishing so visitors can donate.';
          return true;
        }).warning(),
    }),
    defineField({
      name: 'donateCtaLabel',
      title: 'Donate button label',
      type: 'string',
      group: 'donate',
      description: 'Text on the primary donate button.',
      initialValue: 'Donate Now',
    }),

    // FAQ References
    defineField({
      name: 'faqRefs',
      title: 'FAQ items (optional)',
      type: 'array',
      group: 'faq',
      description: 'Link existing FAQ items to show in a donor FAQ section. Leave empty to skip the FAQ section entirely.',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'faqItem' }] })],
    }),

    // Closing CTA (mirrors gift-certificates pattern)
    defineField({ name: 'finalCtaEyebrow', title: 'Closing CTA eyebrow', type: 'string', group: 'final' }),
    defineField({ name: 'finalCtaHeadline', title: 'Closing CTA headline', type: 'string', group: 'final' }),
    defineField({
      name: 'finalCtaScriptAccent',
      title: 'Closing CTA heading script accent (optional)',
      type: 'string',
      group: 'final',
      description: 'Optional. One word or short phrase from the headline to render in Pinyon Script. Must match the headline text exactly. Leave blank to skip.',
    }),
    defineField({ name: 'finalCtaSubhead', title: 'Closing CTA subhead', type: 'text', rows: 2, group: 'final' }),
    defineField({
      name: 'finalCtaButtonLabel',
      title: 'Closing CTA button label',
      type: 'string',
      group: 'final',
      description: 'Button label for the dark closing panel at the bottom of the page. Clicking routes to the donateUrl above.',
      initialValue: 'Donate Now',
    }),
  ],
  preview: { prepare: () => ({ title: 'Donations Page' }) },
});

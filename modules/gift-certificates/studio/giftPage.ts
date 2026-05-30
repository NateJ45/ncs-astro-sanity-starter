// Gift certificates page singleton. Static informational page at /gift-certificates.
// CTA routes to the contact form with type=gift-certificate pre-selected.
// One instance only; singleton enforcement in sanity.config.ts.
// Safe to edit by hand.

import { defineType, defineField, defineArrayMember } from 'sanity';

export const giftPage = defineType({
  name: 'giftPage',
  title: 'Gift Certificates Page',
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
      description: 'Opening paragraph below the hero. Explain what a gift certificate covers and who it is for.',
    }),
    defineField({
      name: 'options',
      title: 'Gift certificate options',
      type: 'array',
      group: 'content',
      description: 'The available certificate amounts or service tiers. Each shows as a card.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'giftOption',
          fields: [
            defineField({ name: 'label', title: 'Label', type: 'string', description: 'Example: "$150 Consultation Gift"', validation: (Rule) => Rule.required() }),
            defineField({ name: 'amount', title: 'Amount display', type: 'string', description: 'How the amount reads. Example: "$150" or "Custom amount".', validation: (Rule) => Rule.required() }),
            defineField({ name: 'blurb', title: 'Blurb', type: 'text', rows: 2, description: 'One sentence about what this gift covers.' }),
          ],
          preview: {
            select: { label: 'label', amount: 'amount' },
            prepare: ({ label, amount }) => ({ title: label ?? '(untitled)', subtitle: amount ?? '' }),
          },
        }),
      ],
    }),
    defineField({
      name: 'howItWorks',
      title: 'How it works steps',
      type: 'array',
      group: 'content',
      description: 'Short numbered steps explaining how to purchase and redeem a gift certificate.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'giftStep',
          fields: [
            defineField({ name: 'stepNumber', title: 'Step number', type: 'number', validation: (Rule) => Rule.required().integer().min(1) }),
            defineField({ name: 'title', title: 'Step title', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'body', title: 'Step detail', type: 'text', rows: 2 }),
          ],
          preview: {
            select: { stepNumber: 'stepNumber', title: 'title' },
            prepare: ({ stepNumber, title }) => ({ title: `${stepNumber ?? '?'}. ${title ?? ''}` }),
          },
        }),
      ],
    }),
    defineField({
      name: 'finePrint',
      title: 'Fine print',
      type: 'text',
      rows: 3,
      group: 'content',
      description: 'Optional terms and conditions shown in small print near the bottom. Example: expiry policy, how to redeem, non-refundable notice.',
    }),
    defineField({
      name: 'ctaLabel',
      title: 'CTA button label',
      type: 'string',
      group: 'content',
      description: 'Text on the button that routes to /contact?type=gift-certificate.',
      initialValue: 'Inquire about a Gift Certificate',
    }),
  ],
  preview: { prepare: () => ({ title: 'Gift Certificates Page' }) },
});

// E-Design page singleton. Productized e-design offering with its own
// landing page at /e-design. One instance only; singleton enforcement in sanity.config.ts.
// Safe to edit by hand.

import { defineType, defineField, defineArrayMember } from 'sanity';

export const eDesignPage = defineType({
  name: 'eDesignPage',
  title: 'E-Design Page',
  type: 'document',
  // Marketing copy is locked and structural — edit fields directly in Studio, not Canvas.
  options: { canvasApp: { exclude: true } },
  groups: [
    { name: 'seo', title: 'SEO' },
    { name: 'hero', title: 'Hero' },
    { name: 'intro', title: 'Intro' },
    { name: 'how', title: 'How It Works' },
    { name: 'included', title: "What's Included" },
    { name: 'tiers', title: 'Pricing Tiers' },
    { name: 'faq', title: 'FAQ References' },
    { name: 'final', title: 'Final CTA' },
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
      description: 'Full-bleed photo behind the hero text.',
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

    // Intro
    defineField({
      name: 'intro',
      title: 'Intro copy',
      type: 'array',
      group: 'intro',
      description: 'Opening paragraph(s) below the hero. Explain what e-design is and why it fits remote clients.',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [{ title: 'Paragraph', value: 'normal' }],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
            ],
            annotations: [],
          },
        }),
      ],
    }),

    // How It Works
    defineField({
      name: 'howItWorks',
      title: 'How It Works steps',
      type: 'array',
      group: 'how',
      description: 'Numbered steps explaining the e-design process from inquiry to delivery.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'howItWorksStep',
          fields: [
            defineField({ name: 'stepNumber', title: 'Step number', type: 'number', validation: (Rule) => Rule.required().integer().min(1) }),
            defineField({ name: 'title', title: 'Step title', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'body', title: 'Step detail', type: 'text', rows: 3 }),
          ],
          preview: {
            select: { stepNumber: 'stepNumber', title: 'title' },
            prepare: ({ stepNumber, title }) => ({ title: `${stepNumber ?? '?'}. ${title ?? ''}` }),
          },
        }),
      ],
    }),

    // What's Included
    defineField({
      name: 'whatsIncluded',
      title: "What's included",
      type: 'array',
      group: 'included',
      description: 'Bullet list of deliverables included in the e-design package.',
      of: [defineArrayMember({ type: 'string' })],
    }),

    // Pricing Tiers
    defineField({
      name: 'tiers',
      title: 'Pricing tiers',
      type: 'array',
      group: 'tiers',
      description: 'E-design pricing options. Each tier gets its own column on the page.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'eDesignTier',
          fields: [
            defineField({ name: 'name', title: 'Tier name', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'price', title: 'Price display', type: 'string', description: 'How the price reads. Example: "$450" or "Starting at $350".', validation: (Rule) => Rule.required() }),
            defineField({ name: 'priceNumeric', title: 'Price (number, internal)', type: 'number', description: 'Used for sorting. Leave blank for custom-quoted tiers.' }),
            defineField({ name: 'features', title: 'Features', type: 'array', of: [defineArrayMember({ type: 'string' })], validation: (Rule) => Rule.required().min(1) }),
            defineField({ name: 'bestFor', title: 'Best for', type: 'text', rows: 2, description: 'One sentence describing the ideal client for this tier.' }),
            defineField({ name: 'ctaLabel', title: 'CTA label', type: 'string', initialValue: 'Inquire about E-Design' }),
          ],
          preview: {
            select: { name: 'name', price: 'price' },
            prepare: ({ name, price }) => ({ title: name ?? '(untitled)', subtitle: price ?? '' }),
          },
        }),
      ],
    }),

    // FAQ References
    defineField({
      name: 'faqRefs',
      title: 'FAQ items',
      type: 'array',
      group: 'faq',
      description: 'Link existing FAQ items to show in the e-design FAQ section.',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'faqItem' }] })],
    }),

    // Final CTA
    defineField({ name: 'finalCtaEyebrow', title: 'Final CTA eyebrow', type: 'string', group: 'final' }),
    defineField({ name: 'finalCtaHeadline', title: 'Final CTA headline', type: 'string', group: 'final' }),
    defineField({
      name: 'finalCtaScriptAccent',
      title: 'Final CTA heading script accent (optional)',
      type: 'string',
      group: 'final',
      description:
        'Optional. One word or short phrase from the headline to render in handwritten Pinyon Script. Must match the headline text exactly (case-sensitive). Leave blank to skip. Use sparingly, one accent per heading.',
    }),
    defineField({ name: 'finalCtaSubhead', title: 'Final CTA subhead', type: 'text', rows: 2, group: 'final' }),
    defineField({ name: 'finalCta', title: 'Final CTA button', type: 'ctaBlock', group: 'final' }),
    defineField({
      name: 'finalCtaBackgroundImage',
      title: 'Final CTA background image (optional)',
      type: 'image',
      group: 'final',
      options: { hotspot: true },
      description:
        'Optional. A photo behind the closing call-to-action. The site automatically darkens it so the headline and button stay readable. Leave empty to keep the solid charcoal panel.',
    }),
  ],
  preview: { prepare: () => ({ title: 'E-Design Page' }) },
});

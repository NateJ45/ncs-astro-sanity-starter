// Services page singleton. Embeds builderRealtorSection and serviceAreaSection.
// Services list auto-populates from service collection.

import { defineType, defineField, defineArrayMember } from 'sanity';

export const servicesPage = defineType({
  name: 'servicesPage',
  title: 'Services Page',
  type: 'document',
  // Marketing copy is locked and structural — edit fields directly in Studio, not Canvas.
  options: { canvasApp: { exclude: true } },
  groups: [
    { name: 'seo', title: 'SEO' },
    { name: 'hero', title: 'Hero' },
    { name: 'list', title: 'Services list' },
    { name: 'builders', title: 'Builders & Realtors' },
    { name: 'area', title: 'Service area' },
    { name: 'final', title: 'Final CTA' },
  ],
  fields: [
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

    defineField({ name: 'heroEyebrow', title: 'Hero eyebrow', type: 'string', group: 'hero', initialValue: 'What We Offer.' }),
    defineField({ name: 'heroHeadline', title: 'Hero headline', type: 'string', group: 'hero', initialValue: 'Design Services for Every Space and Stage.' }),
    defineField({ name: 'heroSubhead', title: 'Hero subhead', type: 'text', rows: 2, group: 'hero' }),
    defineField({
      name: 'heroImage',
      title: 'Hero background image',
      type: 'image',
      group: 'hero',
      description: 'Full-bleed photo behind the hero text. Pick a landscape shot; the page applies a dark gradient over the bottom for readability.',
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
      description:
        'A single word from the headline to render in handwritten Pinyon Script. Must match exactly (case-sensitive). Leave blank to skip.',
    }),
    defineField({
      name: 'stickyCtaLabel',
      title: 'Sticky CTA label',
      type: 'string',
      group: 'hero',
      description:
        'Short label for the floating sticky CTA chip that appears after the visitor scrolls 50% of the page. Example: "Ready to talk it through?". Leave blank to hide the sticky chip.',
    }),

    defineField({ name: 'servicesListEyebrow', title: 'Services list eyebrow', type: 'string', group: 'list', initialValue: 'The Tiers.' }),
    defineField({ name: 'servicesListHeadline', title: 'Services list headline', type: 'string', group: 'list' }),
    defineField({ name: 'servicesListSubhead', title: 'Services list subhead', type: 'text', rows: 2, group: 'list' }),

    defineField({
      name: 'builderRealtorSection',
      title: 'Builder & Realtor section',
      type: 'object',
      group: 'builders',
      fields: [
        defineField({ name: 'eyebrow', title: 'Eyebrow', type: 'string', initialValue: 'For Professionals.' }),
        defineField({ name: 'headline', title: 'Headline', type: 'string', initialValue: 'Builder & Realtor Partnerships.' }),
        defineField({
          name: 'description',
          title: 'Invitation copy',
          type: 'array',
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
        defineField({ name: 'forBuildersText', title: 'For builders', type: 'text', rows: 3 }),
        defineField({ name: 'forRealtorsText', title: 'For realtors', type: 'text', rows: 3 }),
        defineField({ name: 'forContractorsText', title: 'For contractors', type: 'text', rows: 3 }),
        defineField({ name: 'cta', title: 'CTA', type: 'ctaBlock' }),
      ],
    }),

    defineField({
      name: 'serviceAreaSection',
      title: 'Service area section',
      type: 'object',
      group: 'area',
      fields: [
        defineField({ name: 'eyebrow', title: 'Eyebrow', type: 'string', initialValue: 'Service Area.' }),
        defineField({
          name: 'headline',
          title: 'Headline',
          type: 'string',
          initialValue: 'Travel for Out-of-Area Projects.',
        }),
        defineField({
          name: 'description',
          title: 'Description',
          type: 'text',
          rows: 3,
          description: 'Lead paragraph about the primary service area.',
        }),
      ],
    }),

    defineField({ name: 'finalCtaEyebrow', title: 'Final CTA eyebrow', type: 'string', group: 'final', initialValue: "Let's Talk." }),
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

    defineField({
      name: 'note',
      title: 'Editor note (not shown on the site)',
      type: 'text',
      rows: 3,
      description: 'Internal-only reminder for editors. Anything you write here stays in Studio and never renders on the live page.',
    }),
  ],
  preview: { prepare: () => ({ title: 'Services Page' }) },
});

// Journal index page singleton. Drives the hero copy and final-CTA section on
// /journal. The posts grid itself is auto-populated from journalEntry documents.

import { defineType, defineField } from 'sanity';

export const journalPage = defineType({
  name: 'journalPage',
  title: 'Journal Page',
  type: 'document',
  // Page singleton (hero + final CTA only) — structural, not free-form drafting.
  options: { canvasApp: { exclude: true } },
  groups: [
    { name: 'seo',   title: 'SEO' },
    { name: 'hero',  title: 'Hero' },
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

    defineField({ name: 'heroEyebrow',  title: 'Hero eyebrow',  type: 'string', group: 'hero', initialValue: 'The Journal.' }),
    defineField({ name: 'heroHeadline', title: 'Hero headline', type: 'string', group: 'hero', initialValue: 'Notes from the studio.' }),
    defineField({
      name: 'heroSubhead',
      title: 'Hero subhead',
      type: 'text',
      rows: 2,
      group: 'hero',
      initialValue: 'Project walkthroughs, design thinking, and the occasional opinion. Written between projects.',
    }),
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
        'A single word from the headline to render in the handwritten script accent font. Must match exactly (case-sensitive). Leave blank to skip.',
    }),
    defineField({
      name: 'stickyCtaLabel',
      title: 'Sticky CTA label (post detail pages)',
      type: 'string',
      group: 'hero',
      description:
        'Short label for the floating sticky CTA chip that appears on every journal post detail page after the visitor scrolls 50%. Example: "Have a room in mind?". Leave blank to hide the chip on journal posts.',
    }),

    defineField({ name: 'finalCtaHeadline', title: 'Final CTA headline', type: 'string', group: 'final', initialValue: 'Got a project of your own?' }),
    defineField({
      name: 'finalCtaScriptAccent',
      title: 'Final CTA heading script accent (optional)',
      type: 'string',
      group: 'final',
      description:
        'Optional. One word or short phrase from the headline to render in the handwritten script accent font. Must match the headline text exactly (case-sensitive). Leave blank to skip. Use sparingly, one accent per heading.',
    }),
    defineField({ name: 'finalCtaSubhead',  title: 'Final CTA subhead',  type: 'text', rows: 2, group: 'final' }),
    defineField({ name: 'finalCta',         title: 'Final CTA button',   type: 'ctaBlock', group: 'final' }),
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
  preview: { prepare: () => ({ title: 'Journal Page' }) },
});

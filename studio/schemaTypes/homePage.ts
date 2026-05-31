// Home page singleton. Content for hero, Meet the Founder, process preview,
// testimonials, services grid, service-area cue, and final CTA.
// Services and process steps auto-populate from their collections.

import { defineType, defineField, defineArrayMember } from 'sanity';

export const homePage = defineType({
  name: 'homePage',
  title: 'Home Page',
  type: 'document',
  // Marketing copy is locked and structural — edit fields directly in Studio, not Canvas.
  options: { canvasApp: { exclude: true } },
  groups: [
    { name: 'seo', title: 'SEO' },
    { name: 'hero', title: 'Hero' },
    { name: 'meetFounder', title: 'Meet the Founder' },
    { name: 'featuredWork', title: 'Featured Work' },
    { name: 'featuredJournal', title: 'Featured Journal' },
    { name: 'process', title: 'Process preview' },
    { name: 'testimonials', title: 'Testimonials' },
    { name: 'services', title: 'Services grid' },
    { name: 'final', title: 'Service area + final CTA' },
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
    defineField({ name: 'heroSubhead', title: 'Hero subhead', type: 'text', rows: 3, group: 'hero' }),
    defineField({
      name: 'heroImage',
      title: 'Hero image (legacy)',
      type: 'image',
      group: 'hero',
      hidden: true,
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (R) => R.required() }),
      ],
    }),
    defineField({
      name: 'heroImages',
      title: 'Hero images',
      type: 'array',
      group: 'hero',
      description:
        'The home hero. Add one photo for a single static hero. Add two or more for a slow cross-fading slideshow with a subtle zoom. Drag to set the order they appear in.',
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({ name: 'alt', title: 'Alt text', type: 'string' }),
          ],
        }),
      ],
    }),
    defineField({ name: 'heroPrimaryCta', title: 'Primary CTA', type: 'ctaBlock', group: 'hero' }),
    defineField({ name: 'heroSecondaryCta', title: 'Secondary CTA', type: 'ctaBlock', group: 'hero' }),
    defineField({
      name: 'heroRotatingWords',
      title: 'Rotating first-word swap (optional)',
      type: 'array',
      group: 'hero',
      description:
        'On the first visit per session, the FIRST word of the headline cycles through this list once before locking back to the original. Leave empty (or with fewer than 2 alternates) to skip the effect. Example: ["Lived-in", "Considered", "Quiet"]. Honors prefers-reduced-motion.',
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({
      name: 'heroScriptAccent',
      title: 'Script-font accent word (optional)',
      type: 'string',
      group: 'hero',
      description:
        'A single word from the headline to render in handwritten Pinyon Script for editorial flourish. Must match the word exactly (case-sensitive). The first occurrence wins. Leave blank to skip. Note: when "rotating words" is also set, the rotation wins and this is ignored.',
    }),

    // Meet the Founder
    defineField({
      name: 'meetFounderPhoto',
      title: 'Founder photo',
      type: 'image',
      group: 'meetFounder',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (R) => R.required() }),
      ],
    }),
    defineField({ name: 'meetFounderEyebrow', title: 'Eyebrow', type: 'string', group: 'meetFounder', initialValue: 'Meet the Founder.' }),
    defineField({ name: 'meetFounderHeadline', title: 'Headline', type: 'string', group: 'meetFounder' }),
    defineField({
      name: 'meetFounderContent',
      title: 'Intro content',
      type: 'array',
      group: 'meetFounder',
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
    defineField({ name: 'meetFounderCta', title: '"Learn About the Founder" CTA', type: 'ctaBlock', group: 'meetFounder' }),

    // Featured Work (auto-populates with featured-then-newest projects from the Project collection)
    defineField({
      name: 'featuredWorkEyebrow',
      title: 'Eyebrow',
      type: 'string',
      group: 'featuredWork',
      initialValue: 'Recent Work.',
    }),
    defineField({
      name: 'featuredWorkHeadline',
      title: 'Headline',
      type: 'string',
      group: 'featuredWork',
      initialValue: 'Rooms that feel finished.',
    }),
    defineField({
      name: 'featuredWorkSubhead',
      title: 'Subhead',
      type: 'text',
      rows: 3,
      group: 'featuredWork',
      description:
        'Conversion-oriented paragraph under the headline. Tell visitors what a click reveals — the brief, the design thinking, the result — so the section sells the case-study depth, not just the photos.',
      initialValue:
        'A look at recent projects. Each one starts with a conversation about how the space actually needs to function, then the design follows from there. Open any project to see the brief, the design call, and exactly how the room came together.',
    }),
    defineField({
      name: 'featuredWorkCta',
      title: '"See all work" CTA',
      type: 'ctaBlock',
      group: 'featuredWork',
    }),

    // Featured Journal (auto-populates with featured-then-newest journal entries)
    defineField({
      name: 'featuredJournalEyebrow',
      title: 'Eyebrow',
      type: 'string',
      group: 'featuredJournal',
      initialValue: 'From the Journal.',
    }),
    defineField({
      name: 'featuredJournalHeadline',
      title: 'Headline',
      type: 'string',
      group: 'featuredJournal',
      initialValue: 'How I think about design.',
    }),
    defineField({
      name: 'featuredJournalSubhead',
      title: 'Subhead',
      type: 'text',
      rows: 3,
      group: 'featuredJournal',
      description:
        'Conversion-oriented paragraph under the headline. Hint at the kinds of posts the founder writes — project walkthroughs, source roundups, design moves — so the section reads as the thinking behind every consultation, not just a blog.',
      initialValue:
        'Posts on the design moves that change a room, source roundups behind specific projects, and the occasional honest note about what I would do differently. The thinking that informs every consultation.',
    }),
    defineField({
      name: 'featuredJournalCta',
      title: '"Read more" CTA',
      type: 'ctaBlock',
      group: 'featuredJournal',
    }),

    // Process preview
    defineField({ name: 'processPreviewEyebrow', title: 'Eyebrow', type: 'string', group: 'process', initialValue: 'How It Works.' }),
    defineField({ name: 'processPreviewHeadline', title: 'Headline', type: 'string', group: 'process' }),
    defineField({
      name: 'processPreviewSubhead',
      title: 'Subhead',
      type: 'text',
      rows: 2,
      group: 'process',
      description:
        'Reassuring line under the headline. Lower the friction of reaching out — emphasize clarity, no pressure, knowing what comes next.',
      initialValue:
        'No guesswork and no pressure. From our first conversation to the day everything comes together, you will always know exactly where things stand and what happens next.',
    }),
    defineField({ name: 'processPreviewCta', title: 'Link to full Process page', type: 'ctaBlock', group: 'process' }),

    // Testimonials
    defineField({
      name: 'featuredTestimonial',
      title: 'Featured testimonial',
      type: 'reference',
      to: [{ type: 'testimonial' }],
      description: 'The large pull-quote at the top of the testimonial section.',
      group: 'testimonials',
    }),
    defineField({ name: 'testimonialsEyebrow', title: 'Eyebrow', type: 'string', group: 'testimonials', initialValue: 'Kind Words.' }),
    defineField({ name: 'testimonialsHeadline', title: 'Headline', type: 'string', group: 'testimonials', initialValue: 'Words from real homes.' }),
    defineField({
      name: 'testimonialsScriptAccent',
      title: 'Testimonials heading script accent (optional)',
      type: 'string',
      group: 'testimonials',
      description:
        'Optional. One word or short phrase from the headline to render in handwritten Pinyon Script. Must match the headline text exactly (case-sensitive). Leave blank to skip. Use sparingly, one accent per heading.',
    }),
    defineField({
      name: 'testimonialsSubhead',
      title: 'Subhead',
      type: 'text',
      rows: 2,
      group: 'testimonials',
      description:
        'Warm line under the headline that frames the testimonials below. Focus on what clients value — how it felt to work together, how the space lives day to day.',
      initialValue:
        'The part that matters most: how it felt to work together, and how each space holds up to everyday life long after the last pillow is placed.',
    }),
    defineField({
      name: 'testimonialsToShow',
      title: 'Testimonials in grid (in order)',
      type: 'array',
      group: 'testimonials',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'testimonial' }] })],
    }),
    defineField({
      name: 'testimonialsAttribution',
      title: 'Attribution line',
      type: 'string',
      group: 'testimonials',
      description: 'Optional line under the testimonials grid. Example: "From the studio\'s Facebook recommendations."',
    }),

    // Services grid
    defineField({ name: 'servicesGridEyebrow', title: 'Eyebrow', type: 'string', group: 'services', initialValue: 'The Studio.' }),
    defineField({ name: 'servicesGridHeadline', title: 'Headline', type: 'string', group: 'services' }),
    defineField({
      name: 'servicesGridScriptAccent',
      title: 'Services heading script accent (optional)',
      type: 'string',
      group: 'services',
      description:
        'Optional. One word or short phrase from the headline to render in handwritten Pinyon Script. Must match the headline text exactly (case-sensitive). Leave blank to skip. Use sparingly, one accent per heading.',
    }),
    defineField({ name: 'servicesGridSubhead', title: 'Subhead', type: 'text', rows: 2, group: 'services' }),
    defineField({ name: 'servicesGridCta', title: 'Services grid CTA', type: 'ctaBlock', group: 'services' }),
    defineField({
      name: 'servicesGridFootnote',
      title: 'Footnote',
      type: 'string',
      group: 'services',
      description: 'Small-print line under the services grid. Example: "Final pricing is always discussed before any work begins."',
    }),

    // Service area cue + final CTA
    defineField({
      name: 'serviceAreaCue',
      title: 'Service area cue line',
      type: 'string',
      group: 'final',
      description: 'Example: "Serving the greater metro area and surrounding region."',
    }),
    defineField({ name: 'finalCtaEyebrow', title: 'Final CTA eyebrow', type: 'string', group: 'final', initialValue: 'Ready to Begin?' }),
    defineField({ name: 'finalCtaHeadline', title: 'Final CTA headline', type: 'string', group: 'final', initialValue: 'Ready to Love Your Space?' }),
    defineField({
      name: 'finalCtaScriptAccent',
      title: 'Final CTA heading script accent (optional)',
      type: 'string',
      group: 'final',
      description:
        'Optional. One word or short phrase from the headline to render in handwritten Pinyon Script. Must match the headline text exactly (case-sensitive). Leave blank to skip. Use sparingly, one accent per heading.',
    }),
    defineField({ name: 'finalCtaSubhead', title: 'Final CTA subhead', type: 'text', rows: 2, group: 'final', initialValue: "Let's start with a conversation." }),
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
  preview: { prepare: () => ({ title: 'Home Page' }) },
});

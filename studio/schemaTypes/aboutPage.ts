// About page singleton. Philosophy values auto-populate from philosophyPoint collection.
//
// Structured content fields (hero*, story*, philosophy*, personal*, stats, final*)
// are hidden and readOnly for rollback safety. The pageBuilder array is the
// primary editing surface going forward.

import { defineType, defineField, defineArrayMember } from 'sanity';
import { ABOUT_SECTION_TYPES } from './richSections';

export const aboutPage = defineType({
  name: 'aboutPage',
  title: 'About Page',
  type: 'document',
  // Marketing copy is locked and structural — edit fields directly in Studio, not Canvas.
  options: { canvasApp: { exclude: true } },
  groups: [
    { name: 'pageBuilder', title: 'Page layout' },
    { name: 'seo', title: 'SEO' },
    { name: 'hero', title: 'Hero' },
    { name: 'story', title: 'Story' },
    { name: 'philosophy', title: 'Philosophy' },
    { name: 'personal', title: 'Personal' },
    { name: 'stats', title: 'Stats' },
    { name: 'final', title: 'Final CTA' },
  ],
  fields: [
    // Page builder (primary editing surface — section-driven)
    defineField({
      name: 'pageBuilder',
      title: 'Page layout',
      type: 'array',
      group: 'pageBuilder',
      description:
        "Sections on this page. Drag to reorder, remove a section to hide it, or add a new block from the library. Edit each section's content by clicking into it.",
      of: ABOUT_SECTION_TYPES,
    }),

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

    // Hero (legacy structured fields — hidden for rollback safety)
    defineField({ name: 'heroEyebrow', title: 'Hero eyebrow', type: 'string', group: 'hero', hidden: true, readOnly: true, initialValue: 'The Designer.' }),
    defineField({ name: 'heroHeadline', title: 'Hero headline', type: 'string', group: 'hero', hidden: true, readOnly: true, initialValue: 'People Hire People.' }),
    defineField({ name: 'heroSubhead', title: 'Hero subhead', type: 'text', rows: 2, group: 'hero', hidden: true, readOnly: true, initialValue: "Here's who you'd be working with." }),
    defineField({
      name: 'heroImage',
      title: 'Hero background image',
      type: 'image',
      group: 'hero',
      hidden: true,
      readOnly: true,
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
      hidden: true,
      readOnly: true,
      description:
        'A single word from the headline to render in the handwritten script accent font. Must match exactly (case-sensitive). Leave blank to skip.',
    }),

    // Story (legacy — hidden for rollback safety)
    defineField({ name: 'storyEyebrow', title: 'Story eyebrow', type: 'string', group: 'story', hidden: true, readOnly: true, initialValue: 'My Story.' }),
    defineField({ name: 'storyHeadline', title: 'Story headline', type: 'string', group: 'story', hidden: true, readOnly: true, initialValue: 'Why I Started This Studio.' }),
    defineField({
      name: 'storyContent',
      title: 'Story content',
      type: 'array',
      group: 'story',
      hidden: true,
      readOnly: true,
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
    defineField({
      name: 'founderPhoto',
      title: 'Founder portrait',
      type: 'image',
      group: 'story',
      hidden: true,
      readOnly: true,
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (R) => R.required() }),
      ],
    }),
    defineField({
      name: 'founderAttribution',
      title: 'Attribution',
      type: 'string',
      group: 'story',
      hidden: true,
      readOnly: true,
      initialValue: 'Your Name · Founder, Studio Name',
    }),
    defineField({
      name: 'backgroundLine',
      title: 'Background line',
      type: 'text',
      rows: 2,
      group: 'story',
      hidden: true,
      readOnly: true,
      description: "Single sentence with real credentials. Must be accurate, not aspirational.",
    }),
    defineField({
      name: 'serviceAreaMention',
      title: 'Service area mention',
      type: 'string',
      group: 'story',
      hidden: true,
      readOnly: true,
      description: 'Single line mentioning service area on About.',
    }),

    // Philosophy (legacy — hidden for rollback safety)
    defineField({ name: 'philosophyEyebrow', title: 'Philosophy eyebrow', type: 'string', group: 'philosophy', hidden: true, readOnly: true }),
    defineField({ name: 'philosophyHeadline', title: 'Philosophy headline', type: 'string', group: 'philosophy', hidden: true, readOnly: true }),

    // Personal (legacy — hidden for rollback safety)
    defineField({
      name: 'personalEyebrow',
      title: 'Personal section eyebrow',
      type: 'string',
      group: 'personal',
      hidden: true,
      readOnly: true,
      initialValue: 'Off the Clock.',
    }),
    defineField({
      name: 'personalHeadline',
      title: 'Personal section headline',
      type: 'string',
      group: 'personal',
      hidden: true,
      readOnly: true,
      initialValue: 'A little more about me.',
    }),
    defineField({
      name: 'personalIntro',
      title: 'Personal section intro (optional)',
      type: 'text',
      rows: 2,
      group: 'personal',
      hidden: true,
      readOnly: true,
      description: 'One friendly sentence under the headline. Optional.',
    }),
    defineField({
      name: 'currentlyList',
      title: 'Currently',
      type: 'array',
      group: 'personal',
      hidden: true,
      readOnly: true,
      description: 'A short "what I am into right now" list. Refresh it anytime. Example label "Reading", value "the book title".',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'currentlyRow',
          fields: [
            defineField({ name: 'label', title: 'Label', type: 'string', description: 'e.g. Reading, Listening to, Loving right now', validation: (R) => R.required() }),
            defineField({ name: 'value', title: 'Value', type: 'string', validation: (R) => R.required() }),
          ],
          preview: { select: { title: 'label', subtitle: 'value' } },
        }),
      ],
    }),
    defineField({
      name: 'rapidFire',
      title: 'Rapid fire',
      type: 'array',
      group: 'personal',
      hidden: true,
      readOnly: true,
      description: 'Short prompt-and-answer pairs. Example prompt "Coffee order", answer "Oat latte, extra hot".',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'rapidFireRow',
          fields: [
            defineField({ name: 'prompt', title: 'Prompt', type: 'string', validation: (R) => R.required() }),
            defineField({ name: 'answer', title: 'Answer', type: 'string', validation: (R) => R.required() }),
          ],
          preview: { select: { title: 'prompt', subtitle: 'answer' } },
        }),
      ],
    }),
    defineField({
      name: 'localSpots',
      title: 'Favorite local spots',
      type: 'array',
      group: 'personal',
      hidden: true,
      readOnly: true,
      description: 'Go-to local spots. Name plus an optional short note.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'localSpotRow',
          fields: [
            defineField({ name: 'name', title: 'Name', type: 'string', validation: (R) => R.required() }),
            defineField({ name: 'note', title: 'Short note (optional)', type: 'string' }),
          ],
          preview: { select: { title: 'name', subtitle: 'note' } },
        }),
      ],
    }),
    defineField({
      name: 'beyondDesign',
      title: 'Beyond design',
      type: 'text',
      rows: 4,
      group: 'personal',
      hidden: true,
      readOnly: true,
      description: 'A short, casual paragraph or two about life outside work: family, the dogs, hobbies. Write the way you talk.',
    }),
    defineField({
      name: 'candidPhoto',
      title: 'Candid photo (optional)',
      type: 'image',
      group: 'personal',
      hidden: true,
      readOnly: true,
      description: 'A relaxed, non-portrait photo. Skip the polished headshot here; warmth beats polish.',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (R) => R.required() }),
      ],
    }),

    // Stats (legacy — hidden for rollback safety)
    defineField({
      name: 'stats',
      title: 'Stats',
      type: 'array',
      group: 'stats',
      hidden: true,
      readOnly: true,
      description: 'Up to 4 numbers displayed as large display figures on the About page. Leave empty to hide the section.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'statItem',
          fields: [
            defineField({ name: 'number', title: 'Number', type: 'number', validation: (R) => R.required() }),
            defineField({
              name: 'suffix',
              title: 'Suffix (optional)',
              type: 'string',
              description: 'e.g. + or k. Appended directly after the number.',
            }),
            defineField({ name: 'label', title: 'Label', type: 'string', description: 'e.g. Years in Business', validation: (R) => R.required() }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'number' },
            prepare: ({ title, subtitle }) => ({ title, subtitle: subtitle != null ? String(subtitle) : '' }),
          },
        }),
      ],
      validation: (Rule) => Rule.max(4),
    }),

    // Final CTA (legacy — hidden for rollback safety)
    defineField({ name: 'finalCtaEyebrow', title: 'Final CTA eyebrow', type: 'string', group: 'final', hidden: true, readOnly: true, initialValue: "Let's Work Together." }),
    defineField({ name: 'finalCtaHeadline', title: 'Final CTA headline', type: 'string', group: 'final', hidden: true, readOnly: true, initialValue: 'Ready to Start?' }),
    defineField({
      name: 'finalCtaScriptAccent',
      title: 'Final CTA heading script accent (optional)',
      type: 'string',
      group: 'final',
      hidden: true,
      readOnly: true,
      description:
        'Optional. One word or short phrase from the headline to render in the handwritten script accent font. Must match the headline text exactly (case-sensitive). Leave blank to skip. Use sparingly, one accent per heading.',
    }),
    defineField({ name: 'finalCtaSubhead', title: 'Final CTA subhead', type: 'text', rows: 2, group: 'final', hidden: true, readOnly: true }),
    defineField({ name: 'finalCta', title: 'Final CTA button', type: 'ctaBlock', group: 'final', hidden: true, readOnly: true }),
    defineField({
      name: 'finalCtaBackgroundImage',
      title: 'Final CTA background image (optional)',
      type: 'image',
      group: 'final',
      hidden: true,
      readOnly: true,
      options: { hotspot: true },
      description:
        'Optional. A photo behind the closing call-to-action. The site automatically darkens it so the headline and button stay readable. Leave empty to keep the solid charcoal panel.',
    }),
  ],
  preview: { prepare: () => ({ title: 'About Page' }) },
});

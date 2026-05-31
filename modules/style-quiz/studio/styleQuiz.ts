// Style quiz singleton. Drives the /quiz page.
// Archetypes are inline objects (per spec, to keep Studio simpler).
// Questions, archetypes, gate, and routing are all configurable here.
// One instance only; singleton enforcement in sanity.config.ts.
// Safe to edit by hand.

import { defineType, defineField, defineArrayMember } from 'sanity';

export const styleQuiz = defineType({
  name: 'styleQuiz',
  title: 'Style Quiz',
  type: 'document',
  // Configuration singleton — exclude config fields from Canvas.
  // Individual archetype descriptions get their own canvasApp.purpose below.
  options: { canvasApp: { exclude: true } },
  groups: [
    { name: 'seo', title: 'SEO' },
    { name: 'intro', title: 'Intro' },
    { name: 'questions', title: 'Questions' },
    { name: 'qualifiers', title: 'Qualifiers' },
    { name: 'archetypes', title: 'Archetypes' },
    { name: 'gate', title: 'Email gate' },
    { name: 'routing', title: 'Routing + CTAs' },
  ],
  fields: [
    // ── SEO ────────────────────────────────────────────────────────────────
    defineField({
      name: 'seoImage',
      title: 'Social share image (this page)',
      type: 'image',
      group: 'seo',
      description: 'Optional. The image shown when this page is shared on social media or in a text. Overrides the site default in Site Settings. Use a wide image, about 1200 by 630 pixels. Leave blank to use the site default.',
      options: { hotspot: true },
      fields: [ defineField({ name: 'alt', title: 'Alt text', type: 'string' }) ],
    }),

    // ── Intro ──────────────────────────────────────────────────────────────
    defineField({ name: 'introEyebrow', title: 'Eyebrow', type: 'string', group: 'intro' }),
    defineField({
      name: 'introHeadline',
      title: 'Headline',
      type: 'string',
      group: 'intro',
      initialValue: 'What is your design style?',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'introSubhead',
      title: 'Subhead',
      type: 'text',
      rows: 2,
      group: 'intro',
      description: 'One or two sentences setting up the quiz.',
    }),
    defineField({
      name: 'introImage',
      title: 'Intro hero image (optional)',
      type: 'image',
      group: 'intro',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (R) => R.required() }),
      ],
    }),

    // ── Questions ─────────────────────────────────────────────────────────
    defineField({
      name: 'questions',
      title: 'Questions',
      type: 'array',
      group: 'questions',
      description: 'Image-answer questions. Each answer carries weights toward one or more archetypes.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'quizQuestion',
          fields: [
            defineField({
              name: 'prompt',
              title: 'Question prompt',
              type: 'string',
              description: 'The question text shown to the visitor. Example: "When you walk into a well-designed room, what do you notice first?"',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'helpText',
              title: 'Help text (optional)',
              type: 'string',
              description: 'A short clarifying note shown under the prompt.',
            }),
            defineField({
              name: 'answers',
              title: 'Answers',
              type: 'array',
              description: 'Answer options for this question. Each answer adds weight to one or more archetypes.',
              of: [
                defineArrayMember({
                  type: 'object',
                  name: 'quizAnswer',
                  fields: [
                    defineField({ name: 'label', title: 'Answer label', type: 'string', validation: (Rule) => Rule.required() }),
                    defineField({
                      name: 'image',
                      title: 'Answer image',
                      type: 'image',
                      description: 'Photo that represents this answer choice. Required for image-answer questions.',
                      options: { hotspot: true },
                      fields: [
                        defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (R) => R.required() }),
                      ],
                    }),
                    defineField({
                      name: 'archetypeWeights',
                      title: 'Archetype weights',
                      type: 'array',
                      description: 'Which archetype(s) this answer contributes to, and by how much. Total weights across all answers need not sum to any specific value.',
                      of: [
                        defineArrayMember({
                          type: 'object',
                          name: 'archetypeWeight',
                          fields: [
                            defineField({
                              name: 'archetypeSlug',
                              title: 'Archetype slug',
                              type: 'string',
                              description: 'Must match the slug of an archetype defined in the Archetypes tab.',
                              validation: (Rule) => Rule.required(),
                            }),
                            defineField({
                              name: 'weight',
                              title: 'Weight',
                              type: 'number',
                              description: 'How strongly this answer points at the archetype. Typical range 1-5.',
                              validation: (Rule) => Rule.required().min(0),
                              initialValue: 1,
                            }),
                          ],
                          preview: {
                            select: { archetypeSlug: 'archetypeSlug', weight: 'weight' },
                            prepare: ({ archetypeSlug, weight }) => ({
                              title: archetypeSlug ?? '?',
                              subtitle: `weight: ${weight ?? 0}`,
                            }),
                          },
                        }),
                      ],
                    }),
                  ],
                  preview: {
                    select: { label: 'label', media: 'image' },
                    prepare: ({ label, media }) => ({ title: label ?? '(no label)', media }),
                  },
                }),
              ],
              validation: (Rule) => Rule.required().min(2),
            }),
          ],
          preview: {
            select: { prompt: 'prompt' },
            prepare: ({ prompt }) => ({ title: prompt ?? '(no prompt)' }),
          },
        }),
      ],
    }),

    // ── Qualifiers ────────────────────────────────────────────────────────
    defineField({
      name: 'qualifiers',
      title: 'Qualifier questions',
      type: 'array',
      group: 'qualifiers',
      description: 'Intent-detection questions (budget, timeline, room) shown after the image questions. Used to route the visitor to the right CTA.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'qualifier',
          fields: [
            defineField({ name: 'prompt', title: 'Question prompt', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({
              name: 'type',
              title: 'Qualifier type',
              type: 'string',
              options: {
                list: [
                  { title: 'Budget', value: 'budget' },
                  { title: 'Timeline', value: 'timeline' },
                  { title: 'Room', value: 'room' },
                ],
                layout: 'radio',
              },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'options',
              title: 'Answer options',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'object',
                  name: 'qualifierOption',
                  fields: [
                    defineField({ name: 'label', title: 'Label', type: 'string', validation: (Rule) => Rule.required() }),
                    defineField({ name: 'value', title: 'Value (internal)', type: 'string', description: 'Internal identifier used by the routing logic.', validation: (Rule) => Rule.required() }),
                  ],
                  preview: {
                    select: { label: 'label', value: 'value' },
                    prepare: ({ label, value }) => ({ title: label ?? value ?? '' }),
                  },
                }),
              ],
              validation: (Rule) => Rule.required().min(2),
            }),
          ],
          preview: {
            select: { prompt: 'prompt', type: 'type' },
            prepare: ({ prompt, type }) => ({ title: prompt ?? '(no prompt)', subtitle: type ?? '' }),
          },
        }),
      ],
    }),

    // ── Archetypes ────────────────────────────────────────────────────────
    defineField({
      name: 'archetypes',
      title: 'Archetypes',
      type: 'array',
      group: 'archetypes',
      description: 'Design personality archetypes. The quiz computes a score for each and shows the highest-scoring one as the result.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'archetype',
          fields: [
            defineField({ name: 'name', title: 'Archetype name', type: 'string', description: 'Example: "Modern Organic" or "Classic Transitional".', validation: (Rule) => Rule.required() }),
            defineField({
              name: 'slug',
              title: 'Slug',
              type: 'slug',
              description: 'Used in archetypeWeights to reference this archetype from answers.',
              options: { source: 'name', maxLength: 96 },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'description',
              title: 'Archetype description',
              type: 'array',
              description: 'Shown on the result screen. Describe this archetype in the studio voice.',
              options: {
                // Per spec: Canvas enabled on archetype descriptions with voice purpose
                canvasApp: {
                  purpose:
                    'Archetype result description shown after the quiz. Voice: warm, plain-spoken, slightly informal, confident about money; sounds like a smart friend, not a brochure; banned vocabulary: transformative, curated, elevated, tailored, investment in your space; no em-dashes. 2-3 sentences that name the style and make the visitor feel understood. Replace this with the studio voice guidelines before publishing.',
                },
              },
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
              name: 'images',
              title: 'Archetype images',
              type: 'array',
              description: "Project photos that represent this archetype. Shown in the result.",
              of: [
                defineArrayMember({
                  type: 'image',
                  options: { hotspot: true },
                  fields: [
                    defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (R) => R.required() }),
                  ],
                }),
              ],
            }),
            defineField({
              name: 'recommendedServiceRef',
              title: 'Recommended service (optional)',
              type: 'reference',
              to: [{ type: 'service' }],
              description: 'The service to suggest in the result CTA for this archetype.',
            }),
            defineField({
              name: 'resultCtaLabel',
              title: 'Result CTA label',
              type: 'string',
              description: 'CTA button on the result screen for this archetype.',
              initialValue: 'Book a consultation',
            }),
          ],
          preview: {
            select: { name: 'name' },
            prepare: ({ name }) => ({ title: name ?? '(untitled archetype)' }),
          },
        }),
      ],
      validation: (Rule) => Rule.min(2),
    }),

    // ── Email gate ────────────────────────────────────────────────────────
    defineField({
      name: 'gate',
      title: 'Email gate',
      type: 'object',
      group: 'gate',
      description: 'Controls whether and how the quiz asks for an email before showing results.',
      fields: [
        defineField({
          name: 'mode',
          title: 'Gate mode',
          type: 'string',
          options: {
            list: [
              { title: 'Optional (skip available)', value: 'optional' },
              { title: 'Required for bonus content', value: 'required-for-bonus' },
              { title: 'Required to see results', value: 'required' },
            ],
            layout: 'radio',
          },
          initialValue: 'optional',
          validation: (Rule) => Rule.required(),
        }),
        defineField({ name: 'heading', title: 'Gate heading', type: 'string', description: 'Headline above the email form.' }),
        defineField({ name: 'blurb', title: 'Gate blurb', type: 'text', rows: 2, description: 'One sentence explaining what they get when they share their email.' }),
        defineField({ name: 'consentNote', title: 'Consent note', type: 'text', rows: 2, description: 'Small-print consent line. Link to /privacy included automatically.' }),
        defineField({ name: 'espTag', title: 'ESP tag (optional)', type: 'string', description: 'Tag applied in your email provider for quiz completers.' }),
      ],
    }),

    // ── Routing + CTAs ───────────────────────────────────────────────────
    defineField({
      name: 'routing',
      title: 'Routing + CTAs',
      type: 'object',
      group: 'routing',
      description: 'Rules that route high-intent visitors to a booking CTA vs. a guide CTA.',
      fields: [
        defineField({
          name: 'highIntentRule',
          title: 'High-intent qualifier values',
          type: 'string',
          description: 'Comma-separated qualifier option values that trigger the "book a consult" CTA. Example: "asap,1-3months". Values must match the qualifier option value fields above.',
        }),
        defineField({
          name: 'bookCtaLabel',
          title: 'Book CTA label',
          type: 'string',
          description: 'Button label for high-intent visitors.',
          initialValue: 'Book a consultation',
        }),
        defineField({
          name: 'guideCtaLabel',
          title: 'Guide CTA label',
          type: 'string',
          description: 'Button label for lower-intent visitors.',
          initialValue: 'Get the free guide',
        }),
        defineField({
          name: 'guideRef',
          title: 'Guide to recommend (optional)',
          type: 'reference',
          to: [{ type: 'leadMagnet' }],
          description: 'Which lead-magnet guide to offer lower-intent visitors after their result.',
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Style Quiz' }) },
});

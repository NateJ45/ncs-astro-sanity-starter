// Contact page singleton. Email, social links, service area come from siteSettings.
// Form field options (project types) are wired in the Astro component, not Sanity.

import { defineType, defineField, defineArrayMember } from 'sanity';

export const contactPage = defineType({
  name: 'contactPage',
  title: 'Contact Page',
  type: 'document',
  // Marketing copy is locked and structural — edit fields directly in Studio, not Canvas.
  options: { canvasApp: { exclude: true } },
  groups: [
    { name: 'seo', title: 'SEO' },
    { name: 'hero', title: 'Hero' },
    { name: 'form', title: 'Form intro + expectations' },
    { name: 'scheduling', title: 'Scheduling' },
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

    defineField({ name: 'heroEyebrow', title: 'Hero eyebrow', type: 'string', group: 'hero', initialValue: 'Request a Consultation.' }),
    defineField({ name: 'heroHeadline', title: 'Hero headline', type: 'string', group: 'hero', initialValue: 'Start the Conversation.' }),
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
        'A single word from the headline to render in the handwritten script accent font. Must match exactly (case-sensitive). Leave blank to skip.',
    }),

    defineField({
      name: 'formIntroNote',
      title: 'Form intro note',
      type: 'text',
      rows: 3,
      group: 'form',
      description: 'Pre-submit expectation note shown above the form.',
    }),
    defineField({
      name: 'formProjectTypeOptions',
      title: 'Project type dropdown options',
      type: 'array',
      group: 'form',
      description: 'The options shown in the "Project type" dropdown on the contact form. Order matters. Examples: "Single room", "Whole home", "Builder/realtor partnership".',
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({
      name: 'formLocationOptions',
      title: 'Location dropdown options',
      type: 'array',
      group: 'form',
      description:
        'Cities shown in the "Location" dropdown. List in priority order. Leave blank to use the built-in defaults.',
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({
      name: 'formBudgetOptions',
      title: 'Budget dropdown options',
      type: 'array',
      group: 'form',
      description:
        'Budget brackets shown on the form. The wording matters — keep the "Not sure yet" option so the form stays approachable. Leave blank to use the built-in defaults.',
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({
      name: 'formTimelineOptions',
      title: 'Timeline dropdown options',
      type: 'array',
      group: 'form',
      description:
        'Timeline buckets shown on the form. Leave blank to use the built-in defaults (ASAP, 1–3 months, 3–6 months, 6+ months, Flexible).',
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({
      name: 'formSourceOptions',
      title: '"How did you hear about us?" dropdown options',
      type: 'array',
      group: 'form',
      description:
        'Optional lead-source dropdown options. Useful for understanding where good leads come from over time. Leave blank to use the built-in defaults (Google, Instagram, Facebook, Houzz, referrals, journal, project in person, Other).',
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({
      name: 'whatToExpectEyebrow',
      title: '"What to expect" eyebrow',
      type: 'string',
      group: 'form',
      initialValue: 'What to Expect.',
    }),
    defineField({
      name: 'whatToExpectHeadline',
      title: '"What to expect" headline',
      type: 'string',
      group: 'form',
      initialValue: 'When you submit this form...',
    }),
    defineField({
      name: 'whatToExpectContent',
      title: '"What to expect" content',
      type: 'array',
      group: 'form',
      description: 'The "no automated sequence" copy.',
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
      name: 'postInquiryRoadmap',
      title: 'Post-inquiry roadmap',
      type: 'array',
      group: 'form',
      description:
        'Numbered "what happens after you reach out" steps — the scannable version of the What to Expect content. Each step shows as a numbered item on the Contact page.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'roadmapStep',
          fields: [
            defineField({
              name: 'title',
              title: 'Step title',
              type: 'string',
              description: 'Short heading for this step. Example: "We review your inquiry within 48 hours."',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'body',
              title: 'Step detail',
              type: 'text',
              rows: 3,
              description: 'A sentence or two with more detail about what happens in this step. Optional.',
            }),
            defineField({
              name: 'timeEstimate',
              title: 'Time estimate (optional)',
              type: 'string',
              description: 'How long this step typically takes. Example: "Within 48 hours" or "1–2 weeks".',
            }),
          ],
          preview: {
            select: { title: 'title', timeEstimate: 'timeEstimate' },
            prepare: ({ title, timeEstimate }) => ({
              title: title ?? '(untitled step)',
              subtitle: timeEstimate ?? '',
            }),
          },
        }),
      ],
    }),

    defineField({
      name: 'schedulingLink',
      title: 'Scheduling link (Calendly)',
      type: 'url',
      group: 'scheduling',
    }),
    defineField({
      name: 'schedulingLinkLabel',
      title: 'Scheduling link label',
      type: 'string',
      group: 'scheduling',
      initialValue: 'Schedule a 20-minute discovery call.',
    }),
    defineField({
      name: 'availabilityNote',
      title: 'Availability note override',
      type: 'string',
      group: 'scheduling',
      description: 'Optional override of siteSettings.availabilityStatus. Usually leave blank.',
    }),

    defineField({
      name: 'note',
      title: 'Editor note (not shown on the site)',
      type: 'text',
      rows: 3,
      description: 'Internal-only reminder for editors. Anything you write here stays in Studio and never renders on the live page.',
    }),
  ],
  preview: { prepare: () => ({ title: 'Contact Page' }) },
});

// Budget calculator singleton. Drives the /calculator page.
// Rooms, scope options, and add-ons are all editable here so the studio owner
// can keep the number ranges current without touching code.
// One instance only; singleton enforcement in sanity.config.ts.
// Safe to edit by hand.

import { defineType, defineField, defineArrayMember } from 'sanity';

export const budgetCalculator = defineType({
  name: 'budgetCalculator',
  title: 'Budget Calculator',
  type: 'document',
  // Configuration singleton — exclude from Canvas.
  options: { canvasApp: { exclude: true } },
  groups: [
    { name: 'seo', title: 'SEO' },
    { name: 'intro', title: 'Intro' },
    { name: 'rooms', title: 'Rooms' },
    { name: 'scope', title: 'Scope options' },
    { name: 'addons', title: 'Add-ons' },
    { name: 'output', title: 'Result copy + CTA' },
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
    defineField({
      name: 'introEyebrow',
      title: 'Eyebrow',
      type: 'string',
      group: 'intro',
    }),
    defineField({
      name: 'introHeadline',
      title: 'Headline',
      type: 'string',
      group: 'intro',
      initialValue: 'What does a design project cost?',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'introSubhead',
      title: 'Subhead',
      type: 'text',
      rows: 2,
      group: 'intro',
      description: 'One or two sentences framing the calculator as a rough-estimate tool, not a firm quote.',
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero image (optional)',
      type: 'image',
      group: 'intro',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (R) => R.required() }),
      ],
    }),
    defineField({
      name: 'heroScriptAccent',
      title: 'Script-font accent word (optional)',
      type: 'string',
      group: 'intro',
      description: 'A single word from the headline to render in Pinyon Script. Must match exactly. Leave blank to skip.',
    }),

    // ── Rooms ──────────────────────────────────────────────────────────────
    defineField({
      name: 'rooms',
      title: 'Room types',
      type: 'array',
      group: 'rooms',
      description: 'Room options shown in the first dropdown. Each has a base cost range.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'room',
          fields: [
            defineField({ name: 'label', title: 'Room label', type: 'string', description: 'Example: "Living room" or "Primary bedroom".', validation: (Rule) => Rule.required() }),
            defineField({ name: 'baseLow', title: 'Base cost — low ($)', type: 'number', description: 'Low end of the estimated base cost range for this room type.', validation: (Rule) => Rule.required().min(0) }),
            defineField({ name: 'baseHigh', title: 'Base cost — high ($)', type: 'number', description: 'High end of the estimated base cost range for this room type.', validation: (Rule) => Rule.required().min(0) }),
          ],
          preview: {
            select: { label: 'label', baseLow: 'baseLow', baseHigh: 'baseHigh' },
            prepare: ({ label, baseLow, baseHigh }) => ({
              title: label ?? '(unnamed room)',
              subtitle: baseLow != null && baseHigh != null ? `$${baseLow}–$${baseHigh}` : '',
            }),
          },
        }),
      ],
      validation: (Rule) => Rule.required().min(1),
    }),

    // ── Scope options ──────────────────────────────────────────────────────
    defineField({
      name: 'scopeOptions',
      title: 'Scope options',
      type: 'array',
      group: 'scope',
      description: 'Scope levels that adjust the base cost. Example: "Refresh" adds $0, "Full redesign" adds $500-$1,000.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'scopeOption',
          fields: [
            defineField({ name: 'label', title: 'Scope label', type: 'string', description: 'Example: "Light refresh" or "Full redesign".', validation: (Rule) => Rule.required() }),
            defineField({ name: 'addLow', title: 'Additional cost — low ($)', type: 'number', description: 'Added to the base low. Can be 0.', validation: (Rule) => Rule.required().min(0), initialValue: 0 }),
            defineField({ name: 'addHigh', title: 'Additional cost — high ($)', type: 'number', description: 'Added to the base high. Can be 0.', validation: (Rule) => Rule.required().min(0), initialValue: 0 }),
          ],
          preview: {
            select: { label: 'label', addLow: 'addLow', addHigh: 'addHigh' },
            prepare: ({ label, addLow, addHigh }) => ({
              title: label ?? '(unnamed scope)',
              subtitle: addLow != null && addHigh != null ? `+$${addLow}–$${addHigh}` : '',
            }),
          },
        }),
      ],
      validation: (Rule) => Rule.required().min(1),
    }),

    // ── Add-ons ────────────────────────────────────────────────────────────
    defineField({
      name: 'addOns',
      title: 'Add-ons',
      type: 'array',
      group: 'addons',
      description: 'Optional extras the visitor can add to their estimate. Example: "Window treatments", "Art curation".',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'addOn',
          fields: [
            defineField({ name: 'label', title: 'Add-on label', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'low', title: 'Cost — low ($)', type: 'number', validation: (Rule) => Rule.required().min(0) }),
            defineField({ name: 'high', title: 'Cost — high ($)', type: 'number', validation: (Rule) => Rule.required().min(0) }),
          ],
          preview: {
            select: { label: 'label', low: 'low', high: 'high' },
            prepare: ({ label, low, high }) => ({
              title: label ?? '(unnamed add-on)',
              subtitle: low != null && high != null ? `$${low}–$${high}` : '',
            }),
          },
        }),
      ],
    }),

    // ── Result copy + CTA ──────────────────────────────────────────────────
    defineField({
      name: 'resultCopy',
      title: 'Result copy',
      type: 'text',
      rows: 3,
      group: 'output',
      description: 'Text shown above the estimate range. Use {{low}} and {{high}} as placeholders for the computed numbers. Example: "Based on your choices, a project like this typically runs {{low}} to {{high}}."',
      initialValue: 'Based on what you described, a project like this typically runs {{low}} to {{high}}. That said, every home is different.',
    }),
    defineField({
      name: 'disclaimer',
      title: 'Disclaimer',
      type: 'text',
      rows: 2,
      group: 'output',
      description: 'Small-print note under the estimate. Remind visitors this is a rough guide, not a firm quote.',
      initialValue: 'This is a rough estimate to help you plan — not a quote. Actual cost depends on your space, finish level, and shopping budget. A consultation will give you specifics.',
    }),
    defineField({
      name: 'ctaLabel',
      title: 'CTA label',
      type: 'string',
      group: 'output',
      description: 'Text on the button shown after the estimate.',
      initialValue: 'Book a consultation',
    }),
    defineField({
      name: 'consultPriceNote',
      title: 'Consultation price note',
      type: 'string',
      group: 'output',
      description: 'Optional note shown near the CTA. Example: "Starting with a $150 in-home consultation."',
    }),
  ],
  preview: { prepare: () => ({ title: 'Budget Calculator' }) },
});

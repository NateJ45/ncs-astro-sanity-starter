// Foundation, edit with care
// Process step document. Each step is an ordered item in the process collection.
// Steps are listed in Studio under Content → Process Steps and can be dragged
// to reorder (orderRank). The processSection section type auto-fetches all steps
// at query time via sectionsProjection().

import { defineType, defineField } from 'sanity';

export const processStep = defineType({
  name: 'processStep',
  title: 'Process Step',
  type: 'document',
  fields: [
    defineField({
      name: 'stepNumber',
      title: 'Step number',
      type: 'number',
      validation: (R) => R.required().integer().positive(),
    }),
    defineField({
      name: 'title',
      title: 'Step title',
      type: 'string',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'timeEstimate',
      title: 'Time estimate (optional)',
      type: 'string',
      description: 'e.g. "2 business days" or "20 minutes". Shown as a small tag on the step card.',
    }),
    defineField({
      name: 'shortDescription',
      title: 'Short description',
      type: 'text',
      rows: 2,
      description: 'One or two sentences describing what happens in this step.',
    }),
    defineField({
      name: 'features',
      title: 'What is included (bullet list)',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Short bullet points — what the client gets or what happens. Keep to 3 to 5 items.',
    }),
    defineField({
      name: 'tierNote',
      title: 'Tier note (optional)',
      type: 'string',
      description: 'Optional small note about which service tiers this step applies to.',
    }),
    defineField({
      name: 'orderRank',
      title: 'Order rank',
      type: 'string',
      description: 'Managed by the orderable-document-list plugin. Drag to reorder in Studio.',
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'stepNumber' },
    prepare: ({ title, subtitle }) => ({
      title: `${subtitle != null ? `Step ${subtitle}: ` : ''}${title ?? ''}`,
    }),
  },
});

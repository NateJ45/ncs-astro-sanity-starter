// Numbered steps in the studio's process. Used on the Process page and homepage preview.
// Add as many steps as the project needs; drag to reorder in Studio.

import { defineType, defineField, defineArrayMember } from 'sanity';
import { orderRankField } from '@sanity/orderable-document-list';

export const processStep = defineType({
  name: 'processStep',
  title: 'Process Step',
  type: 'document',
  // Locked structural content (numbered steps with tier notes) — not Canvas territory.
  options: { canvasApp: { exclude: true } },
  fields: [
    defineField({
      name: 'stepNumber',
      title: 'Step number',
      type: 'number',
      description: 'Step number (1, 2, 3, 4).',
      validation: (Rule) => Rule.required().integer().min(1).max(9),
    }),
    defineField({
      name: 'title',
      title: 'Step name',
      type: 'string',
      description: 'Example: "In-Home Consultation".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'timeEstimate',
      title: 'Time estimate',
      type: 'string',
      description: 'How long this step takes. Example: "Single visit" or "2 to 3 weeks".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'shortDescription',
      title: 'Short description',
      type: 'text',
      description: 'One sentence for the homepage process preview (max ~200 characters).',
      rows: 2,
      validation: (Rule) => Rule.required().max(200),
    }),
    defineField({
      name: 'fullDescription',
      title: 'Full description',
      type: 'array',
      description: 'Full description shown on the Process page. Multiple paragraphs OK.',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [{ title: 'Paragraph', value: 'normal' }],
          lists: [
            { title: 'Bullet', value: 'bullet' },
            { title: 'Numbered', value: 'number' },
          ],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
            ],
            annotations: [],
          },
        }),
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'features',
      title: 'Quick bullets',
      type: 'array',
      description: 'Optional bullets next to the step. Example: "60 to 90 minutes", "In your home".',
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({
      name: 'tierNote',
      title: 'Tier note',
      type: 'string',
      description:
        'If this step is conditional on tier, explain. Example: "*Included with Full Room Design + Styling".',
    }),
    defineField({
      name: 'relatedServices',
      title: 'Related services',
      type: 'array',
      description: 'Which steps this service applies to (optional, used for cross-linking).',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'service' }] })],
    }),
    // Hidden field managed by the orderable-document-list plugin.
    orderRankField({ type: 'processStep' }),
  ],
  preview: {
    select: { stepNumber: 'stepNumber', title: 'title', time: 'timeEstimate' },
    prepare: ({ stepNumber, title, time }) => ({
      title: `${stepNumber ?? '?'}. ${title ?? ''}`,
      subtitle: time,
    }),
  },
  orderings: [
    {
      title: 'Step number',
      name: 'stepAsc',
      by: [{ field: 'stepNumber', direction: 'asc' }],
    },
  ],
});

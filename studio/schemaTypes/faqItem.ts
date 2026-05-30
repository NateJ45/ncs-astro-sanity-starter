// Individual FAQ. Grouped by category on the FAQ page and selectively
// included on the Process page via `alsoShowOnProcessPage`.

import { defineType, defineField, defineArrayMember } from 'sanity';

export const faqItem = defineType({
  name: 'faqItem',
  title: 'FAQ Item',
  type: 'document',
  fields: [
    defineField({
      name: 'question',
      title: 'Question',
      type: 'string',
      description: 'The question as a visitor would ask it.',
      options: {
        canvasApp: {
          purpose:
            'The question as a visitor would actually ask it — plain English, not jargon. Example: "How much does a full room design cost?" not "What is the pricing structure for full-room design services?"',
        },
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'answer',
      title: 'Answer',
      type: 'array',
      description: 'The answer in your voice. Paragraphs, lists, and bold are supported.',
      options: {
        canvasApp: {
          purpose:
            'Plain-English answer. Voice: warm, slightly informal, confident about money. Lead with the direct answer; expand if needed. Stop when done — don\'t pad. Banned: transformative, curated, elevated, tailored, investment in your space.',
        },
      },
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            { title: 'Paragraph', value: 'normal' },
            { title: 'Sub-heading', value: 'h4' },
          ],
          lists: [
            { title: 'Bullet', value: 'bullet' },
            { title: 'Numbered', value: 'number' },
          ],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  { name: 'href', type: 'url', title: 'URL' },
                  { name: 'openInNewTab', type: 'boolean', title: 'Open in new tab', initialValue: false },
                ],
              },
            ],
          },
        }),
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      description: 'Which group this question belongs in on the FAQ page.',
      options: {
        list: [
          { title: 'Pricing & Cost', value: 'Pricing & Cost' },
          { title: 'The Process', value: 'The Process' },
          { title: 'Logistics', value: 'Logistics' },
          { title: 'Service Area', value: 'Service Area' },
          { title: 'Getting Started', value: 'Getting Started' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'displayOrder',
      title: 'Display order',
      type: 'number',
      description: 'Lower numbers show first within the category.',
      validation: (Rule) => Rule.required().integer().min(0),
    }),
    defineField({
      name: 'alsoShowOnProcessPage',
      title: 'Also show on Process page',
      type: 'boolean',
      description:
        'If checked, this question also appears in the FAQ block at the bottom of the Process page.',
      initialValue: false,
    }),
  ],
  preview: {
    select: { question: 'question', category: 'category', displayOrder: 'displayOrder' },
    prepare: ({ question, category, displayOrder }) => ({
      title: question ?? '(no question)',
      subtitle: `${category ?? '?'} · #${displayOrder ?? '?'}`,
    }),
  },
  orderings: [
    {
      title: 'Category, then order',
      name: 'categoryOrder',
      by: [
        { field: 'category', direction: 'asc' },
        { field: 'displayOrder', direction: 'asc' },
      ],
    },
  ],
});

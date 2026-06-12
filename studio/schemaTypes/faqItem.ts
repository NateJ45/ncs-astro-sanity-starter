// Individual FAQ. Grouped by category on the FAQ page and selectively
// included on the Process page via `alsoShowOnProcessPage`.
// U8: categoryRef (reference to faqCategory document) replaces the legacy
// hardcoded category string. The frontend coalesces categoryRef->title with
// the legacy category string so existing data renders without migration.

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
    // LEGACY — superseded by categoryRef below.
    // Kept hidden + readOnly so existing FAQ items continue to validate.
    // The frontend coalesces categoryRef->title with this field as the fallback.
    // Do not delete; seed data and migrated items still carry these strings.
    defineField({
      name: 'category',
      title: 'Category (legacy)',
      type: 'string',
      description: 'Legacy hardcoded category. Use categoryRef for new items.',
      options: {
        list: [
          { title: 'Pricing & Cost', value: 'Pricing & Cost' },
          { title: 'The Process', value: 'The Process' },
          { title: 'Logistics', value: 'Logistics' },
          { title: 'Service Area', value: 'Service Area' },
          { title: 'Getting Started', value: 'Getting Started' },
        ],
      },
      hidden: true,
      readOnly: true,
    }),
    // New: reference to a faqCategory document. Optional — existing items that
    // only carry the legacy category string still display correctly via coalesce.
    defineField({
      name: 'categoryRef',
      title: 'Category',
      type: 'reference',
      to: [{ type: 'faqCategory' }],
      description: 'Which group this question belongs in. Pick from the FAQ Categories list. If left blank, the legacy category value is used instead.',
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
    select: {
      question: 'question',
      category: 'category',
      categoryRefTitle: 'categoryRef.title',
      displayOrder: 'displayOrder',
    },
    prepare: ({ question, category, categoryRefTitle, displayOrder }) => ({
      title: question ?? '(no question)',
      subtitle: `${categoryRefTitle ?? category ?? '?'} · #${displayOrder ?? '?'}`,
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

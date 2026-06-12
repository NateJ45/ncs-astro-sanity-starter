// FAQ category document. Lets editors define FAQ groupings as real content
// instead of hardcoded string options. Each faqItem can reference a category
// here via categoryRef; the frontend coalesces categoryRef->title with the
// legacy category string so both old and new data render correctly.
// Registered in index.ts and surfaced under Content in structure.ts.

import { defineType, defineField } from 'sanity';

export const faqCategory = defineType({
  name: 'faqCategory',
  title: 'FAQ Category',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Category title',
      type: 'string',
      description: 'The group heading shown above FAQ items on the FAQ page. Example: "Pricing & Cost".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug (optional)',
      type: 'slug',
      description: 'URL-friendly identifier. Optional — used if you ever need to deep-link to a category.',
      options: { source: 'title', maxLength: 96 },
    }),
    defineField({
      name: 'displayOrder',
      title: 'Display order',
      type: 'number',
      description: 'Lower numbers appear first in the FAQ category list. Leave blank to sort alphabetically.',
    }),
  ],
  preview: {
    select: { title: 'title', order: 'displayOrder' },
    prepare: ({ title, order }) => ({
      title: title ?? '(no title)',
      subtitle: order != null ? `Order: ${order}` : undefined,
    }),
  },
  orderings: [
    {
      title: 'Display order',
      name: 'orderAsc',
      by: [
        { field: 'displayOrder', direction: 'asc' },
        { field: 'title', direction: 'asc' },
      ],
    },
  ],
});

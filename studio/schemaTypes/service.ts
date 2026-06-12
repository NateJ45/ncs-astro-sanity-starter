// Paid offerings — Consultation, Full Room Design, Styling, Shopping, B&R Partnerships.
// Used by both the Services page and the homepage services grid.

import { defineType, defineField, defineArrayMember } from 'sanity';
import { orderRankField } from '@sanity/orderable-document-list';

export const service = defineType({
  name: 'service',
  title: 'Service',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Service name',
      type: 'string',
      description: 'Public name. Example: "In-Home Consultation".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'URL-friendly version (auto-generated from name).',
      options: { source: 'name', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'price',
      title: 'Price display',
      type: 'string',
      description: 'How the price reads on the card. Examples: "$150" / "starting at $650" / "Custom quote".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'priceNumeric',
      title: 'Internal price (number)',
      type: 'number',
      description: 'Used for sorting/filtering only. Leave blank for custom-quoted services.',
    }),
    defineField({
      name: 'shortDescription',
      title: 'Short description',
      type: 'text',
      description: 'One or two sentences for the service card (max ~200 characters).',
      rows: 3,
      options: {
        canvasApp: {
          purpose:
            'One or two sentences for the service tier card. Voice: warm, plain-spoken, confident about money. Be specific about what\'s included (concrete verbs over abstract benefits). Banned: transformative, curated, elevated, tailored, investment in your space.',
        },
      },
      validation: (Rule) => Rule.required().max(200),
    }),
    defineField({
      name: 'features',
      title: 'Features',
      type: 'array',
      description: "What's included. One line per feature.",
      of: [defineArrayMember({ type: 'string' })],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'bestFor',
      title: 'Best for',
      type: 'text',
      description: 'One sentence describing the ideal client for this service.',
      rows: 2,
      options: {
        canvasApp: {
          purpose:
            'One sentence describing the ideal client. Voice: plain-spoken, slightly informal. Examples: "When you\'d rather hand the project off than manage it." / "Homeowners who know something feels off but aren\'t sure where to start."',
        },
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'featuredImage',
      title: 'Card image (optional)',
      type: 'image',
      description:
        'Small image at the top of the service card. Use a finished-room photo that represents this tier. Cards without an image render gracefully.',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (R) => R.required() }),
      ],
    }),
    defineField({
      name: 'longDescription',
      title: 'Long description',
      type: 'array',
      description: 'Optional detail block shown lower on the Services page.',
      options: {
        canvasApp: {
          purpose:
            'Longer detail block shown lower on the Services page. Same voice as shortDescription but with room to walk through what the service actually looks like. Specific verbs (shopping with you, picking paint, hanging art) beat generic adjectives. Banned: transformative, curated, elevated, tailored, investment in your space.',
        },
      },
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
    }),
    defineField({
      name: 'displayOrder',
      title: 'Display order',
      type: 'number',
      description: 'Order on the Services page and homepage. Lower numbers first.',
      validation: (Rule) => Rule.required().integer().min(0),
    }),
    defineField({
      name: 'showOnHomepage',
      title: 'Show on homepage',
      type: 'boolean',
      description:
        'If checked, this service appears in the homepage services grid. Uncheck for services you only want on the Services page.',
      initialValue: true,
    }),
    defineField({
      name: 'ctaLabel',
      title: 'CTA label',
      type: 'string',
      description:
        'Text on the button for this service. Examples: "Book a Call", "Get a Quote", "Learn More", "See Packages". Leave blank to inherit the site default.',
    }),
    // Hidden field managed by the orderable-document-list plugin. Required
    // even when no one's reordered anything yet — the plugin validates the
    // schema declares it.
    orderRankField({ type: 'service' }),
  ],
  preview: {
    select: { name: 'name', price: 'price', order: 'displayOrder', media: 'featuredImage' },
    prepare: ({ name, price, order, media }) => ({
      title: name,
      subtitle: `${price ?? ''} · #${order ?? '?'}`,
      media,
    }),
  },
  orderings: [
    {
      title: 'Display order',
      name: 'orderAsc',
      by: [{ field: 'displayOrder', direction: 'asc' }],
    },
  ],
});

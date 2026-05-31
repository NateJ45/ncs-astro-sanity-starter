// Individual affiliate/shop items for the Shop My Favorites page.
// Each item links out to a product via an affiliate URL.
// FTC disclosure is required site-wide and is managed on shopPage.
// Safe to edit by hand.

import { defineType, defineField } from 'sanity';
import { orderRankField } from '@sanity/orderable-document-list';

export const shopItem = defineType({
  name: 'shopItem',
  title: 'Shop Item',
  type: 'document',
  // Config / structural — not editor prose, so exclude from Canvas.
  options: { canvasApp: { exclude: true } },
  fields: [
    defineField({
      name: 'title',
      title: 'Product name',
      type: 'string',
      description: 'Name of the product. Example: "Adjustable Desk Lamp" or "Ceramic Pour-Over Kit".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Product image',
      type: 'image',
      description: 'Product photo. Required — the shop card always shows an image.',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description: 'Describe the product. Example: "Matte black adjustable arm lamp on a round weighted base."',
          validation: (R) => R.required(),
        }),
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'vendor',
      title: 'Vendor / retailer',
      type: 'string',
      description: 'Where the product is sold. Example: "Amazon" or "Made In". Shown on the card.',
    }),
    defineField({
      name: 'affiliateUrl',
      title: 'Affiliate / shop link',
      type: 'url',
      description: 'The affiliate or direct link to the product. Rendered with rel="sponsored nofollow" and opens in a new tab.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'note',
      title: 'Studio note (optional)',
      type: 'text',
      rows: 2,
      description: 'Optional short note about why this item is recommended. Shown on the card.',
    }),
    defineField({
      name: 'collection',
      title: 'Collection',
      type: 'reference',
      to: [{ type: 'shopCollection' }],
      description: 'Which Shop Collection this item belongs to. Items are grouped by collection on the /shop page.',
    }),
    // Hidden field managed by the orderable-document-list plugin.
    orderRankField({ type: 'shopItem' }),
  ],
  preview: {
    select: { title: 'title', vendor: 'vendor', media: 'image' },
    prepare: ({ title, vendor, media }) => ({
      title: title ?? '(unnamed item)',
      subtitle: vendor ?? '',
      media,
    }),
  },
  orderings: [
    {
      title: 'Display order',
      name: 'orderAsc',
      by: [{ field: 'orderRank', direction: 'asc' }],
    },
  ],
});

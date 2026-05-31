// Case studies. Launch with 1–2; grows over time.
// Project-story narrative, filterable by room type and design style.

import { defineType, defineField, defineArrayMember } from 'sanity';
import { orderRankField } from '@sanity/orderable-document-list';

export const project = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Project title',
      type: 'string',
      description: 'Example: "Riverside Studio Refresh".',
      options: {
        canvasApp: {
          purpose:
            'Case study title. Place- or project-named, not client-named. Examples: "Riverside Studio", "Oak Lane Kitchen", "The Midtown Loft". Voice: warm and specific. A place name gives the project identity without naming the client.',
        },
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'URL-friendly version (auto-generated).',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'metaTitle',
      title: 'SEO title (optional)',
      type: 'string',
      description: 'Browser tab and Google result title. Aim for 50 to 60 characters. Front-load location and project type. Leave blank to use the project title.',
      options: {
        canvasApp: {
          purpose:
            'Optional per-project SEO title override. 50-60 chars. Front-load location + project type for local search ("Riverside Kitchen Refresh" beats "Beautiful Modern Kitchen Project").',
        },
      },
      validation: (Rule) => Rule.max(60).warning('Titles longer than about 60 characters get cut off in Google search results.'),
    }),
    defineField({
      name: 'metaDescription',
      title: 'SEO description (optional)',
      type: 'text',
      rows: 2,
      description: 'The sentence under the title in Google results. Aim for 150 to 160 characters. Write it for a person, not a search engine. Leave blank to use the brief summary.',
      options: {
        canvasApp: {
          purpose:
            'Optional per-project SEO description. 150-160 chars. Written for a human about to click, not a search engine. Specific (location + project type + outcome) beats generic.',
        },
      },
      validation: (Rule) => Rule.max(160).warning('Descriptions longer than about 160 characters get cut off in Google search results.'),
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      description: 'Example: "Chicago, IL".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'roomType',
      title: 'Room type',
      type: 'string',
      options: {
        list: [
          { title: 'Living room', value: 'livingRoom' },
          { title: 'Bedroom', value: 'bedroom' },
          { title: 'Kitchen', value: 'kitchen' },
          { title: 'Dining room', value: 'diningRoom' },
          { title: 'Office', value: 'office' },
          { title: 'Whole home', value: 'wholeHome' },
          { title: 'Multiple rooms', value: 'multipleRooms' },
          { title: 'Other', value: 'other' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'designStyle',
      title: 'Design style',
      type: 'string',
      description: 'Primary style of the finished space. Used as the second filter axis on the portfolio.',
      options: {
        list: [
          { title: 'Modern traditional', value: 'modernTraditional' },
          { title: 'Transitional',       value: 'transitional' },
          { title: 'Modern coastal',     value: 'modernCoastal' },
          { title: 'Modern farmhouse',   value: 'modernFarmhouse' },
          { title: 'Modern organic',     value: 'modernOrganic' },
          { title: 'Eclectic',           value: 'eclectic' },
          { title: 'Mid-century',        value: 'midCentury' },
          { title: 'Other',              value: 'other' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'year',
      title: 'Year completed',
      type: 'number',
      initialValue: () => new Date().getFullYear(),
      validation: (Rule) => Rule.required().integer().min(2024).max(2099),
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero image',
      type: 'image',
      description: 'The cover photo. Shows on the portfolio grid and at the top of the project page. Add the rest of the photos in Project photos below.',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (R) => R.required() }),
        defineField({
          name: 'caption',
          title: 'Caption (optional)',
          type: 'string',
          description: 'Small italic line under the hero. Sourcing or sizing detail works well ("Oak floor, brass pendants, soapstone counters").',
        }),
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'gallery',
      title: 'Project photos',
      type: 'array',
      description:
        'The main set of project photos, beyond the cover. Add at least 3, ideally 4 to 8: wide shots, details, and a couple of different angles. Drag to reorder. These show as a gallery on the project page, and they are what make a project look like a finished story instead of a single snapshot.',
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (R) => R.required() }),
            defineField({ name: 'caption', title: 'Caption', type: 'string' }),
          ],
        }),
      ],
      validation: (Rule) =>
        Rule.min(3).error('Add at least 3 photos so the project shows more than a single cover shot.'),
    }),
    defineField({
      name: 'beforeAfters',
      title: 'Before / after pairs',
      type: 'array',
      description:
        'Optional, but high impact. Each pair becomes a draggable slider on the project page and feeds the Before & After page in the nav. Use the same room from the same angle, before and after. Leave this empty if you do not have a clean pair yet.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'beforeAfterPair',
          fields: [
            defineField({
              name: 'beforeImage',
              title: 'Before',
              type: 'image',
              options: { hotspot: true },
              fields: [
                defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (R) => R.required() }),
              ],
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'afterImage',
              title: 'After',
              type: 'image',
              options: { hotspot: true },
              fields: [
                defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (R) => R.required() }),
              ],
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'caption',
              title: 'Caption',
              type: 'string',
              description: 'Optional explanation of what changed.',
            }),
          ],
          preview: {
            select: { caption: 'caption', media: 'afterImage' },
            prepare: ({ caption, media }) => ({ title: caption ?? 'Before / After', media }),
          },
        }),
      ],
    }),
    defineField({
      name: 'briefSummary',
      title: 'Brief summary',
      type: 'text',
      description: 'One-sentence summary for the portfolio grid card (max ~200 characters).',
      rows: 2,
      options: {
        canvasApp: {
          purpose:
            'One-sentence summary on the portfolio grid card, max 200 chars. Voice: smart friend, not brochure. Hint at the design problem and the move. Banned: transformative, curated, elevated, tailored, sanctuary.',
        },
      },
      validation: (Rule) => Rule.required().min(60).max(200),
    }),
    // Project metadata band fields. Two one-sentence lines that read as
    // "the issue / the response" above the long intro story.
    defineField({
      name: 'briefLine',
      title: 'The brief (one sentence)',
      type: 'string',
      description: 'What the client came in with. Example: "The space had good bones but no clear focal point."',
      options: {
        canvasApp: {
          purpose:
            'One sentence stating the design problem the client brought in. Voice: smart friend describing a situation. Plain English. Examples: "The space had good bones but no clear focal point." / "Open-concept floor plan with great light but everything floated."',
        },
      },
      validation: (Rule) => Rule.required().max(160),
    }),
    defineField({
      name: 'designCall',
      title: 'The call (one sentence)',
      type: 'string',
      description: 'The design move in response. Example: "Edit, don\'t add. Source one anchor piece. Let the room breathe."',
      options: {
        canvasApp: {
          purpose:
            'One sentence stating the design decision in response to the brief. The "show the thinking, not the credentials" rule made visible. Examples: "Edit, don\'t add. Source one anchor piece. Let the room breathe." / "Move the sofa off the wall. Re-light from a single warm source."',
        },
      },
      validation: (Rule) => Rule.required().max(160),
    }),
    defineField({
      name: 'introStory',
      title: 'Intro story',
      type: 'array',
      description: 'The brief, the approach, the result. Aim for at least three or four short paragraphs, and drop photos in between them where they help. This is the main story of the project.',
      options: {
        canvasApp: {
          purpose:
            'Long-form case study narrative. Open with one warm paragraph (the situation, the brief, the approach), then walk through the design thinking. Voice: warm, plain-spoken, confident, slightly informal. Show the reasoning ("I started with the paint because the wall color sets what every other choice has to answer to"), not credentials. Stop when done. Banned: transformative, curated, elevated, tailored, sanctuary. No em-dashes.',
        },
      },
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            { title: 'Paragraph', value: 'normal' },
            { title: 'Heading 3', value: 'h3' },
            { title: 'Quote', value: 'blockquote' },
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
              {
                // Inline "Sourced from" annotation. Renders the wrapped text in
                // italic small-caps with an optional link to the vendor.
                name: 'sourcedFrom',
                type: 'object',
                title: 'Sourced from',
                fields: [
                  { name: 'vendor', type: 'string', title: 'Vendor / source name', validation: (R) => R.required() },
                  { name: 'url', type: 'url', title: 'Vendor URL (optional)' },
                ],
              },
            ],
          },
        }),
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (R) => R.required() }),
            defineField({ name: 'caption', title: 'Caption', type: 'string', description: 'Brief italic line under the image. Sourcing, materials, or what to notice.' }),
            defineField({
              name: 'decisionLine',
              title: 'The decision (optional)',
              type: 'string',
              description: 'Optional second line above the caption, rendered as a small uppercase eyebrow. Use for the "why this image is here" moment ("Why we layered three rugs", "The mirror that fixed the proportion").',
            }),
          ],
        }),
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'servicesUsed',
      title: 'Services used',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'service' }] })],
    }),
    defineField({
      name: 'relatedTestimonial',
      title: 'Related testimonial',
      type: 'reference',
      to: [{ type: 'testimonial' }],
    }),
    defineField({
      name: 'displayOrder',
      title: 'Display order',
      type: 'number',
      description: 'Lower numbers show first in the portfolio. Leave blank to sort by year.',
    }),
    defineField({
      name: 'featured',
      title: 'Featured (pin to home page)',
      type: 'boolean',
      description: 'If checked, this project is pinned to the homepage Featured Work section regardless of publish date. Use sparingly — the section shows the most recent 4 projects by default.',
      initialValue: false,
    }),
    defineField({
      name: 'stickyCtaLabel',
      title: 'Sticky CTA label (optional)',
      type: 'string',
      description:
        'Short label for the floating sticky CTA chip that appears once a visitor scrolls 50% of this project page. Example: "Want a room like this?". Leave blank to use the project default or hide the chip.',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      description: 'The date shown on the project, and the sort key for the portfolio (newest first). Setting it in the future does not delay go-live on its own. To publish a project later, use the Schedule publish action (the arrow beside the Publish button), which Sanity runs and rebuilds the site at that time.',
      initialValue: () => new Date().toISOString(),
      validation: (Rule) => Rule.required(),
    }),
    // Hidden field managed by the orderable-document-list plugin.
    orderRankField({ type: 'project' }),
  ],
  preview: {
    select: { title: 'title', location: 'location', year: 'year', featured: 'featured', media: 'heroImage' },
    prepare: ({ title, location, year, featured, media }) => ({
      title: title ?? 'Untitled project',
      subtitle: `${featured ? '★ ' : ''}${location ?? ''} · ${year ?? ''}`,
      media,
    }),
  },
  orderings: [
    {
      title: 'Featured then newest',
      name: 'featuredThenDate',
      by: [
        { field: 'featured', direction: 'desc' },
        { field: 'publishedAt', direction: 'desc' },
      ],
    },
    {
      title: 'Newest first',
      name: 'publishedDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
    {
      title: 'Display order',
      name: 'orderAsc',
      by: [
        { field: 'displayOrder', direction: 'asc' },
        { field: 'publishedAt', direction: 'desc' },
      ],
    },
  ],
});

// Journal/blog post. Designed to handle every kind of post the founder might write:
// project walkthroughs, style guides, behind-the-scenes, source roundups,
// process explainers, opinion pieces, announcements. The body field accepts
// rich Portable Text plus seven custom inline blocks (pullQuote, beforeAfter,
// sourceCard, tipCallout, imageGallery, divider, videoEmbed) that the
// JournalPortableText renderer styles to brand.
//
// Editor experience: groups split fields into Meta / Content / SEO / Related so
// the form isn't a wall. The body field is the only one the editor touches for the
// actual post copy; everything else is metadata.

import { defineType, defineField, defineArrayMember } from 'sanity';

export const journalEntry = defineType({
  name: 'journalEntry',
  title: 'Journal Entry',
  type: 'document',
  groups: [
    { name: 'meta',    title: 'Meta' },
    { name: 'content', title: 'Content' },
    { name: 'seo',     title: 'SEO' },
    { name: 'related', title: 'Related' },
  ],
  fields: [
    // ---------- Meta ----------
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The post title. Aim for under 70 characters so it reads as a single line on cards and in search.',
      group: 'meta',
      options: {
        canvasApp: {
          purpose:
            'Blog post headline, under 70 chars. Voice: warm, plain-spoken, specific. Prefer concrete details over vague category labels.',
        },
      },
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'URL-friendly version (auto-generated from title). The post lives at /journal/{slug}.',
      options: { source: 'title', maxLength: 96 },
      group: 'meta',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      description: 'One or two sentences that show on the journal index card AND the SEO description. ~160 characters reads well in Google.',
      rows: 3,
      group: 'meta',
      options: {
        canvasApp: {
          purpose:
            'One or two sentences shown on the journal card AND as the SEO description (~160 chars). Voice: warm, plain-spoken, slightly informal. Specific beats generic.',
        },
      },
      validation: (Rule) => Rule.required().max(220),
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover image',
      type: 'image',
      description: 'The hero/cover image. Shows large at the top of the post and as the card thumbnail on the journal index.',
      group: 'meta',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (R) => R.required() }),
        defineField({
          name: 'caption',
          title: 'Caption (optional)',
          type: 'string',
          description: 'Italic line under the cover image. Sourcing or location detail works well.',
        }),
      ],
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      description: 'One or more categories. The first one shows on the card; all show on the post page.',
      group: 'meta',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'journalCategory' }] })],
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'string',
      description: 'Byline. Defaults to the founder. Change if a guest writes a post.',
      group: 'meta',
      initialValue: 'Your Name',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      description: 'When the post goes live. Set to a future date to schedule (Sanity still publishes the doc, but you can use this for sorting).',
      group: 'meta',
      initialValue: () => new Date().toISOString(),
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'updatedAt',
      title: 'Updated at',
      type: 'datetime',
      description: 'Optional. Set this when you significantly revise a post so the BlogPosting JSON-LD shows the right date for SEO.',
      group: 'meta',
    }),
    defineField({
      name: 'featured',
      title: 'Featured (pin to top)',
      type: 'boolean',
      description: 'If checked, this post appears first on the journal index regardless of publish date.',
      group: 'meta',
      initialValue: false,
    }),

    // ---------- Content (the body) ----------
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      description: 'The post itself. Use headings to break it up; the seven custom blocks (pull quote, before/after, source card, tip, gallery, divider, video) appear in the "insert" menu.',
      group: 'content',
      options: {
        canvasApp: {
          purpose:
            'Long-form blog post body. Voice: warm, plain-spoken, slightly informal — like a knowledgeable friend, not a brochure. Show specific thinking. Stop when done; don\'t tack on summary sentences. Be specific over general.',
        },
      },
      validation: (Rule) => Rule.required().min(1),
      of: [
        // Standard Portable Text block — paragraphs, headings, lists, marks
        defineArrayMember({
          type: 'block',
          styles: [
            { title: 'Paragraph', value: 'normal' },
            { title: 'Lead (large intro)', value: 'lead' },
            { title: 'Heading 2', value: 'h2' },
            { title: 'Heading 3', value: 'h3' },
            { title: 'Heading 4', value: 'h4' },
            { title: 'Quote', value: 'blockquote' },
          ],
          lists: [
            { title: 'Bullet', value: 'bullet' },
            { title: 'Numbered', value: 'number' },
          ],
          marks: {
            decorators: [
              { title: 'Bold',      value: 'strong' },
              { title: 'Italic',    value: 'em' },
              { title: 'Underline', value: 'underline' },
              { title: 'Highlight', value: 'highlight' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  { name: 'href',         type: 'url',     title: 'URL' },
                  { name: 'openInNewTab', type: 'boolean', title: 'Open in new tab', initialValue: false },
                ],
              },
              {
                // Inline "Sourced from" annotation — italic small-caps treatment
                // for vendor mentions in prose. Pair with sourceCard block when
                // the item deserves a full card with image + price.
                name: 'sourcedFrom',
                type: 'object',
                title: 'Sourced from',
                fields: [
                  { name: 'vendor', type: 'string', title: 'Vendor / source name', validation: (R) => R.required() },
                  { name: 'url',    type: 'url',    title: 'Vendor URL (optional)' },
                ],
              },
            ],
          },
        }),

        // Inline image (single, with caption)
        defineArrayMember({
          type: 'image',
          name: 'inlineImage',
          title: 'Image',
          options: { hotspot: true },
          fields: [
            defineField({ name: 'alt',     title: 'Alt text', type: 'string', validation: (R) => R.required() }),
            defineField({ name: 'caption', title: 'Caption',  type: 'string' }),
            defineField({
              name: 'size',
              title: 'Size',
              type: 'string',
              description: 'How wide to render. Default is "wide" (full content width).',
              options: {
                list: [
                  { title: 'Standard (column width)', value: 'standard' },
                  { title: 'Wide (full content)',     value: 'wide' },
                  { title: 'Full-bleed (edge to edge)', value: 'full' },
                ],
                layout: 'radio',
              },
              initialValue: 'wide',
            }),
          ],
          preview: { select: { title: 'caption', subtitle: 'alt', media: 'asset' } },
        }),

        // Pull quote — the dramatic editorial pull quote
        defineArrayMember({
          type: 'object',
          name: 'pullQuote',
          title: 'Pull quote',
          fields: [
            defineField({
              name: 'quote',
              title: 'Quote',
              type: 'text',
              rows: 3,
              validation: (Rule) => Rule.required().max(280),
            }),
            defineField({
              name: 'attribution',
              title: 'Attribution',
              type: 'string',
              description: 'Optional. Who said it. Skip for editorial pull-quotes you wrote yourself.',
            }),
          ],
          preview: {
            select: { quote: 'quote', attribution: 'attribution' },
            prepare: ({ quote, attribution }) => ({
              title: quote ? (quote.length > 60 ? quote.slice(0, 60) + '…' : quote) : '(empty quote)',
              subtitle: attribution || '— pull quote',
            }),
          },
        }),

        // Before/After pair — for project posts
        defineArrayMember({
          type: 'object',
          name: 'beforeAfter',
          title: 'Before / After',
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
              description: 'Optional. Brief note on what changed.',
            }),
          ],
          preview: {
            select: { caption: 'caption', media: 'afterImage' },
            prepare: ({ caption, media }) => ({ title: caption ?? 'Before / After', media }),
          },
        }),

        // Source card — vendor/source roundup item
        defineArrayMember({
          type: 'object',
          name: 'sourceCard',
          title: 'Source card',
          description: 'For "where I got it" / vendor mentions. Renders as a small card with image, name, vendor, price, and link.',
          fields: [
            defineField({
              name: 'image',
              title: 'Image',
              type: 'image',
              options: { hotspot: true },
              fields: [
                defineField({ name: 'alt', title: 'Alt text', type: 'string' }),
              ],
            }),
            defineField({
              name: 'itemName',
              title: 'Item name',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'vendor',
              title: 'Vendor',
              type: 'string',
              description: 'Where it came from. Example: "Schoolhouse" or "Local vintage find".',
            }),
            defineField({
              name: 'price',
              title: 'Price (display)',
              type: 'string',
              description: 'How the price shows. Examples: "$340", "Around $80 at the time", "Vintage, varies".',
            }),
            defineField({
              name: 'url',
              title: 'URL',
              type: 'url',
              description: 'Optional. Link to the product or vendor.',
            }),
            defineField({
              name: 'notes',
              title: 'Notes',
              type: 'text',
              rows: 2,
              description: 'Optional. Why you picked it, alternatives, etc.',
            }),
          ],
          preview: {
            select: { title: 'itemName', subtitle: 'vendor', media: 'image' },
          },
        }),

        // Tip callout — a labeled aside ("Designer's note:", "Worth knowing:", etc.)
        defineArrayMember({
          type: 'object',
          name: 'tipCallout',
          title: 'Tip callout',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description: 'Short eyebrow on the callout. Examples: "Worth knowing", "Pro tip", "Common mistake".',
              initialValue: 'Worth knowing',
              validation: (Rule) => Rule.required().max(40),
            }),
            defineField({
              name: 'content',
              title: 'Content',
              type: 'array',
              description: 'The body of the callout. Supports bold/italic + links.',
              of: [
                defineArrayMember({
                  type: 'block',
                  styles: [{ title: 'Paragraph', value: 'normal' }],
                  lists: [{ title: 'Bullet', value: 'bullet' }],
                  marks: {
                    decorators: [
                      { title: 'Bold',   value: 'strong' },
                      { title: 'Italic', value: 'em' },
                    ],
                    annotations: [
                      {
                        name: 'link',
                        type: 'object',
                        title: 'Link',
                        fields: [
                          { name: 'href',         type: 'url',     title: 'URL' },
                          { name: 'openInNewTab', type: 'boolean', title: 'Open in new tab', initialValue: false },
                        ],
                      },
                    ],
                  },
                }),
              ],
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: { label: 'label', content: 'content' },
            prepare: ({ label, content }) => {
              const first = Array.isArray(content) ? content[0] : null;
              const text = first?.children?.map((c: any) => c?.text ?? '').join(' ').trim() ?? '';
              return { title: label ?? 'Tip', subtitle: text.slice(0, 60) };
            },
          },
        }),

        // Image gallery — a row/grid of images
        defineArrayMember({
          type: 'object',
          name: 'imageGallery',
          title: 'Image gallery',
          fields: [
            defineField({
              name: 'images',
              title: 'Images',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'image',
                  options: { hotspot: true },
                  fields: [
                    defineField({ name: 'alt',     title: 'Alt text', type: 'string', validation: (R) => R.required() }),
                    defineField({ name: 'caption', title: 'Caption',  type: 'string' }),
                  ],
                }),
              ],
              validation: (Rule) => Rule.required().min(2),
            }),
            defineField({
              name: 'layout',
              title: 'Layout',
              type: 'string',
              description: 'How to arrange the images.',
              options: {
                list: [
                  { title: 'Grid (2-column)',  value: 'grid2' },
                  { title: 'Grid (3-column)',  value: 'grid3' },
                  { title: 'Row (horizontal scroll on mobile)', value: 'row' },
                ],
                layout: 'radio',
              },
              initialValue: 'grid2',
            }),
            defineField({
              name: 'caption',
              title: 'Gallery caption',
              type: 'string',
              description: 'Optional. Single caption that covers the whole gallery.',
            }),
          ],
          preview: {
            select: { images: 'images', caption: 'caption' },
            prepare: ({ images, caption }) => ({
              title: caption ?? `Image gallery (${images?.length ?? 0} images)`,
              media: images?.[0],
            }),
          },
        }),

        // Divider — visual section break
        defineArrayMember({
          type: 'object',
          name: 'divider',
          title: 'Divider',
          fields: [
            defineField({
              name: 'style',
              title: 'Style',
              type: 'string',
              options: {
                list: [
                  { title: 'Line',           value: 'line' },
                  { title: 'Ornament (✺ ✺ ✺)', value: 'ornament' },
                  { title: 'Space only',     value: 'space' },
                ],
                layout: 'radio',
              },
              initialValue: 'ornament',
            }),
          ],
          preview: { prepare: () => ({ title: '— Divider —' }) },
        }),

        // Video embed (YouTube/Vimeo URL)
        defineArrayMember({
          type: 'object',
          name: 'videoEmbed',
          title: 'Video embed',
          fields: [
            defineField({
              name: 'url',
              title: 'Video URL',
              type: 'url',
              description: 'YouTube or Vimeo URL. The frontend renders a responsive embed.',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'caption',
              title: 'Caption',
              type: 'string',
            }),
          ],
          preview: {
            select: { url: 'url', caption: 'caption' },
            prepare: ({ url, caption }) => ({ title: caption ?? '(video)', subtitle: url }),
          },
        }),
      ],
    }),

    // ---------- SEO (per-post overrides) ----------
    defineField({
      name: 'seoTitle',
      title: 'SEO title',
      type: 'string',
      description: 'Browser tab and Google result title. Aim for 50 to 60 characters. Optional — defaults to the post title.',
      group: 'seo',
      options: {
        canvasApp: {
          purpose:
            'Optional override for the HTML <title> tag. 50-60 chars. Front-load the keyword (location or topic). No marketing puffery.',
        },
      },
      validation: (Rule) => Rule.max(60).warning('Titles longer than about 60 characters get cut off in Google search results.'),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO description',
      type: 'text',
      rows: 3,
      description: 'The sentence under the title in Google results. Aim for 150 to 160 characters. Optional — defaults to the excerpt.',
      group: 'seo',
      options: {
        canvasApp: {
          purpose:
            'Optional override for the meta description. 150-160 chars. Written for a human about to click, not for a search engine. Don\'t restate the title.',
        },
      },
      validation: (Rule) => Rule.max(160).warning('Descriptions longer than about 160 characters get cut off in Google search results.'),
    }),

    // ---------- Related ----------
    defineField({
      name: 'relatedPosts',
      title: 'Related posts',
      type: 'array',
      description: 'Optional. Up to three other journal posts to surface at the bottom of this one. If empty, the site auto-picks the most recent posts in the same category.',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'journalEntry' }] })],
      validation: (Rule) => Rule.max(3),
      group: 'related',
    }),
  ],
  preview: {
    select: { title: 'title', publishedAt: 'publishedAt', featured: 'featured', media: 'coverImage' },
    prepare: ({ title, publishedAt, featured, media }) => ({
      title: title ?? 'Untitled post',
      subtitle: `${featured ? '★ ' : ''}${publishedAt ? new Date(publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}`,
      media,
    }),
  },
  orderings: [
    {
      title: 'Newest first (with featured pinned)',
      name: 'featuredThenDate',
      by: [
        { field: 'featured', direction: 'desc' },
        { field: 'publishedAt', direction: 'desc' },
      ],
    },
    {
      title: 'Newest first',
      name: 'dateDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
  ],
});

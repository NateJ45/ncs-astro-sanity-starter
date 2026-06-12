// Foundation, edit with care
// The page-builder block library. Each block is a reusable section that editors
// can add, reorder, and remove on any page. Every block renders through a
// site component in src/components/sections/, so anything built here matches
// the rest of the site automatically.
//
// The SectionRenderer (src/components/SectionRenderer.astro) owns the alternating
// background cadence and dividers, so reordering can never break the rhythm.
// That is why no block has a "background color" field: the renderer decides.
//
// SECTION_TYPES (exported at the bottom) is the single source of truth for which
// blocks a page-builder array accepts. Use it everywhere a pageBuilder array is
// defined so every builder offers the same library.

import { defineType, defineField, defineArrayMember } from 'sanity';
import {
  BlockElementIcon,
  ImageIcon,
  ImagesIcon,
  BulbOutlineIcon,
  StarIcon,
  ComponentIcon,
  RemoveIcon,
  PlayIcon,
  ThLargeIcon,
  EarthGlobeIcon,
  CodeBlockIcon,
} from '@sanity/icons';

// Shared image field with required alt text (accessibility + SEO).
const imageWithAlt = (name = 'image', title = 'Image') =>
  defineField({
    name,
    title,
    type: 'image',
    options: { hotspot: true },
    fields: [
      defineField({
        name: 'alt',
        title: 'Alt text',
        type: 'string',
        description: 'Describe the photo in a few words, for screen readers and search engines.',
        validation: (R) => R.required(),
      }),
    ],
  });

// Short rich-text body: paragraphs, bold/italic, links, simple headings/lists.
const proseBody = (name = 'body', title = 'Text') =>
  defineField({
    name,
    title,
    type: 'array',
    of: [
      defineArrayMember({
        type: 'block',
        styles: [
          { title: 'Normal', value: 'normal' },
          { title: 'Heading', value: 'h2' },
          { title: 'Subheading', value: 'h3' },
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
              fields: [defineField({ name: 'href', title: 'URL', type: 'url', validation: (R) => R.uri({ allowRelative: true }) })],
            },
          ],
        },
      }),
    ],
  });

// ── 1. Hero ──────────────────────────────────────────────────────────────────
export const heroSection = defineType({
  name: 'heroSection',
  title: 'Hero (big page opener)',
  type: 'object',
  icon: ComponentIcon,
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (small line above)', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline', type: 'string', validation: (R) => R.required() }),
    defineField({
      name: 'scriptAccent',
      title: 'Handwritten accent word (optional)',
      type: 'string',
      description: 'One word from the headline to render in the script font. Must match exactly. Leave blank to skip.',
    }),
    defineField({ name: 'subhead', title: 'Subhead', type: 'text', rows: 2 }),
    imageWithAlt('backgroundImage', 'Background photo (optional)'),
    defineField({ name: 'primaryCta', title: 'Main button', type: 'ctaBlock' }),
    defineField({ name: 'secondaryCta', title: 'Second button (optional)', type: 'ctaBlock' }),
    defineField({
      name: 'size',
      title: 'Height',
      type: 'string',
      initialValue: 'short',
      options: { list: [{ title: 'Tall', value: 'tall' }, { title: 'Short', value: 'short' }], layout: 'radio' },
    }),
  ],
  preview: {
    select: { title: 'headline', media: 'backgroundImage' },
    prepare: ({ title, media }) => ({ title: title || 'Hero', subtitle: 'Hero', media }),
  },
});

// ── 2. Rich text ───────────────────────────────────────────────────────────--
export const richTextSection = defineType({
  name: 'richTextSection',
  title: 'Text block',
  type: 'object',
  icon: BlockElementIcon,
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'heading', title: 'Heading (optional)', type: 'string' }),
    defineField({
      name: 'scriptAccent',
      title: 'Handwritten accent word (optional)',
      type: 'string',
      description: 'One word from the heading to render in the script font. Must match exactly.',
    }),
    proseBody('body', 'Text'),
    defineField({
      name: 'width',
      title: 'Width',
      type: 'string',
      initialValue: 'normal',
      options: { list: [{ title: 'Normal', value: 'normal' }, { title: 'Narrow (easier reading)', value: 'narrow' }], layout: 'radio' },
    }),
    defineField({
      name: 'align',
      title: 'Alignment',
      type: 'string',
      initialValue: 'left',
      options: { list: [{ title: 'Left', value: 'left' }, { title: 'Centered', value: 'center' }], layout: 'radio' },
    }),
  ],
  preview: {
    select: { title: 'heading', body: 'body' },
    prepare: ({ title }) => ({ title: title || 'Text block', subtitle: 'Text' }),
  },
});

// ── 3. Image + text ──────────────────────────────────────────────────────────
export const imageTextSection = defineType({
  name: 'imageTextSection',
  title: 'Image + text (side by side)',
  type: 'object',
  icon: ImageIcon,
  fields: [
    imageWithAlt('image', 'Image'),
    defineField({
      name: 'imageSide',
      title: 'Image goes on the',
      type: 'string',
      initialValue: 'left',
      options: { list: [{ title: 'Left', value: 'left' }, { title: 'Right', value: 'right' }], layout: 'radio' },
    }),
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'heading', title: 'Heading', type: 'string' }),
    proseBody('body', 'Text'),
    defineField({ name: 'cta', title: 'Button (optional)', type: 'ctaBlock' }),
  ],
  preview: {
    select: { title: 'heading', media: 'image' },
    prepare: ({ title, media }) => ({ title: title || 'Image + text', subtitle: 'Image + text', media }),
  },
});

// ── 4. Gallery ───────────────────────────────────────────────────────────────
export const gallerySection = defineType({
  name: 'gallerySection',
  title: 'Photo gallery (grid)',
  type: 'object',
  icon: ImagesIcon,
  fields: [
    defineField({ name: 'heading', title: 'Heading (optional)', type: 'string' }),
    defineField({
      name: 'images',
      title: 'Photos',
      type: 'array',
      validation: (R) => R.min(1),
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (R) => R.required() }),
            defineField({ name: 'caption', title: 'Caption (optional)', type: 'string' }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'columns',
      title: 'Columns',
      type: 'number',
      initialValue: 3,
      options: { list: [2, 3, 4] },
    }),
  ],
  preview: {
    select: { images: 'images', heading: 'heading' },
    prepare: ({ images, heading }) => ({
      title: heading || 'Photo gallery',
      subtitle: `Gallery${Array.isArray(images) ? ` (${images.length})` : ''}`,
      media: Array.isArray(images) && images[0] ? images[0] : ImagesIcon,
    }),
  },
});

// ── 5. Quote ─────────────────────────────────────────────────────────────────
export const quoteSection = defineType({
  name: 'quoteSection',
  title: 'Quote / testimonial',
  type: 'object',
  icon: StarIcon,
  fields: [
    defineField({ name: 'quote', title: 'Quote', type: 'text', rows: 3, validation: (R) => R.required() }),
    defineField({ name: 'attribution', title: 'Who said it', type: 'string' }),
    defineField({ name: 'detail', title: 'Their detail (optional)', type: 'string', description: 'Context that adds credibility. Example: "Location" or "Project type".' }),
  ],
  preview: {
    select: { title: 'quote', subtitle: 'attribution' },
    prepare: ({ title, subtitle }) => ({ title: title ? `"${title.slice(0, 50)}"` : 'Quote', subtitle: subtitle || 'Quote' }),
  },
});

// ── 6. Stat row ──────────────────────────────────────────────────────────────
export const statSection = defineType({
  name: 'statSection',
  title: 'Numbers row (stats)',
  type: 'object',
  icon: ThLargeIcon,
  fields: [
    defineField({ name: 'heading', title: 'Heading (optional)', type: 'string' }),
    defineField({
      name: 'stats',
      title: 'Numbers',
      type: 'array',
      validation: (R) => R.max(4),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'statItem',
          fields: [
            defineField({ name: 'number', title: 'Number', type: 'number', validation: (R) => R.required() }),
            defineField({ name: 'suffix', title: 'Suffix (optional)', type: 'string', description: 'Optional suffix after the number. Examples: "+", "%", "yrs".' }),
            defineField({ name: 'label', title: 'Label', type: 'string', validation: (R) => R.required() }),
          ],
          preview: { select: { title: 'number', subtitle: 'label' } },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Numbers row' }) },
});

// ── 7. CTA band ──────────────────────────────────────────────────────────────
export const ctaBandSection = defineType({
  name: 'ctaBandSection',
  title: 'Call-to-action band',
  type: 'object',
  icon: BulbOutlineIcon,
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline', type: 'string', validation: (R) => R.required() }),
    defineField({
      name: 'scriptAccent',
      title: 'Handwritten accent word (optional)',
      type: 'string',
      description: 'One word from the headline to render in the script font. Must match exactly.',
    }),
    defineField({ name: 'subhead', title: 'Subhead', type: 'text', rows: 2 }),
    defineField({ name: 'cta', title: 'Button', type: 'ctaBlock' }),
    imageWithAlt('backgroundImage', 'Background photo (optional)'),
  ],
  preview: {
    select: { title: 'headline', media: 'backgroundImage' },
    prepare: ({ title, media }) => ({ title: title || 'Call to action', subtitle: 'CTA band', media }),
  },
});

// ── 8. Video ─────────────────────────────────────────────────────────────────
export const videoSection = defineType({
  name: 'videoSection',
  title: 'Video',
  type: 'object',
  icon: PlayIcon,
  fields: [
    defineField({
      name: 'url',
      title: 'Video link (YouTube or Vimeo)',
      type: 'url',
      validation: (R) => R.required().uri({ scheme: ['http', 'https'] }),
      description: 'Paste the share link from YouTube or Vimeo.',
    }),
    defineField({ name: 'heading', title: 'Heading (optional)', type: 'string' }),
    defineField({ name: 'caption', title: 'Caption (optional)', type: 'string' }),
  ],
  preview: {
    select: { title: 'heading', url: 'url' },
    prepare: ({ title, url }) => ({ title: title || 'Video', subtitle: url || 'Video' }),
  },
});

// ── 9. Spacer / divider ──────────────────────────────────────────────────────
export const spacerSection = defineType({
  name: 'spacerSection',
  title: 'Spacer / divider',
  type: 'object',
  icon: RemoveIcon,
  fields: [
    defineField({
      name: 'variant',
      title: 'Style',
      type: 'string',
      initialValue: 'ornament',
      options: {
        list: [
          { title: 'Accent ornament', value: 'ornament' },
          { title: 'Plain line', value: 'line' },
          { title: 'Just space (invisible)', value: 'space' },
        ],
        layout: 'radio',
      },
    }),
  ],
  preview: { prepare: () => ({ title: 'Spacer / divider' }) },
});

// ── 10. Logo strip ──────────────────────────────────────────────────────────
// A row or grid of client/partner logos. SELF_CONTAINED — manages its own surface.
export const logoStripSection = defineType({
  name: 'logoStripSection',
  title: 'Logo strip (trusted by / as seen in)',
  type: 'object',
  icon: EarthGlobeIcon,
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string', description: 'Examples: "Trusted by" or "As seen in".' }),
    defineField({ name: 'headline', title: 'Headline (optional)', type: 'string' }),
    defineField({
      name: 'logos',
      title: 'Logos',
      type: 'array',
      validation: (R) => R.min(2).max(12),
      description: 'Add between 2 and 12 logos. Each needs an alt text for screen readers.',
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt text',
              type: 'string',
              description: 'Company or outlet name, for screen readers and search engines.',
              validation: (R) => R.required(),
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'layout',
      title: 'Layout',
      type: 'string',
      initialValue: 'row',
      options: {
        list: [
          { title: 'Row (single line, scrollable on small screens)', value: 'row' },
          { title: 'Grid (wraps across rows)', value: 'grid' },
        ],
        layout: 'radio',
      },
    }),
  ],
  preview: {
    select: { logos: 'logos', eyebrow: 'eyebrow', headline: 'headline' },
    prepare: ({ logos, eyebrow, headline }) => ({
      title: headline || eyebrow || 'Logo strip',
      subtitle: `Logo strip${Array.isArray(logos) ? ` (${logos.length})` : ''}`,
      media: Array.isArray(logos) && logos[0] ? logos[0] : EarthGlobeIcon,
    }),
  },
});

// ── 11. Embed section ───────────────────────────────────────────────────────
// Sandboxed iframe embed. Accepts either a URL (Calendly, Cal.com, Tally, etc.)
// or raw embed code from a trusted provider. SELF_CONTAINED — manages its own surface.
//
// SECURITY NOTE: embedCode is rendered as-is on the live site. Only paste code
// from providers you trust. The same trust model applies here as for any content
// in the CMS.
export const embedSection = defineType({
  name: 'embedSection',
  title: 'Embed (form, scheduler, or widget)',
  type: 'object',
  icon: CodeBlockIcon,
  description: 'Only paste embed code from providers you trust. It renders as-is on the live site.',
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline (optional)', type: 'string' }),
    defineField({ name: 'subhead', title: 'Subhead (optional)', type: 'text', rows: 2 }),
    defineField({
      name: 'embedUrl',
      title: 'Embed URL',
      type: 'url',
      description: 'Use for providers that embed via URL: Calendly, Cal.com, Tally, Google Forms. Paste the full URL.',
      validation: (R) => R.uri({ scheme: ['http', 'https'] }),
    }),
    defineField({
      name: 'embedCode',
      title: 'Embed code (raw iframe)',
      type: 'text',
      rows: 4,
      description: 'Use for providers that give a raw iframe snippet. Only paste from providers you trust.',
      validation: (R) =>
        R.custom((value, context) => {
          const doc = context.document as Record<string, unknown> | undefined;
          if (value && doc?.embedUrl) {
            return 'Fill in either Embed URL or Embed code, not both.';
          }
          return true;
        }),
    }),
    defineField({
      name: 'heightHint',
      title: 'Height',
      type: 'string',
      initialValue: 'medium',
      options: {
        list: [
          { title: 'Short (around 400px)', value: 'short' },
          { title: 'Medium (around 640px)', value: 'medium' },
          { title: 'Tall (around 900px)', value: 'tall' },
        ],
        layout: 'radio',
      },
    }),
  ],
  preview: {
    select: { title: 'headline', eyebrow: 'eyebrow', url: 'embedUrl' },
    prepare: ({ title, eyebrow, url }) => ({
      title: title || eyebrow || 'Embed',
      subtitle: url ? `Embed: ${url.slice(0, 50)}` : 'Embed (code snippet)',
    }),
  },
});

// ── Exports ──────────────────────────────────────────────────────────────────

// All section schema objects, to register in the schema index.
export const pageSectionSchemas = [
  heroSection,
  richTextSection,
  imageTextSection,
  gallerySection,
  quoteSection,
  statSection,
  ctaBandSection,
  videoSection,
  spacerSection,
  logoStripSection,
  embedSection,
];

// The list a pageBuilder array uses for `of`. Single source of truth so every
// builder offers the same blocks.
export const SECTION_TYPES = pageSectionSchemas.map((s) => ({ type: s.name }));

// Reusable "extra sections" field for pages that keep their own structure but
// want an append zone for library blocks. The consuming schema must declare an
// `extra` field group. SectionRenderer renders the array; self-contained blocks
// manage their own surface so no extra page context is needed.
export const additionalSectionsField = defineField({
  name: 'additionalSections',
  title: 'Extra sections',
  type: 'array',
  group: 'extra',
  description:
    'Optional. Add blocks from the library to the bottom of this page (a banner, a gallery, a call to action). Leave empty to keep the page exactly as it is.',
  of: SECTION_TYPES,
});

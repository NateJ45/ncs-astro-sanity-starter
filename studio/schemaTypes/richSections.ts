// Foundation, edit with care
// Rich section block library — the 8 generalized section types that power the
// four core pages (home, about, services, process). Each type is a genericized
// port of a bespoke Reid Design component; all Reid-specific copy, names, and
// domain vocabulary have been stripped.
//
// Per-page curated lists (HOME_SECTION_TYPES, ABOUT_SECTION_TYPES, etc.) each
// equal the general SECTION_TYPES plus the rich types that belong on that page.
// Register only via richSectionSchemas in studio/schemaTypes/index.ts.
//
// SectionRenderer (src/components/SectionRenderer.astro) maps every _type here
// to a component in src/components/sections/.
//
// sectionCadence.ts classifies each type as SELF_CONTAINED or CONTENT.
// See the classification table in the Phase B plan for reasoning.

import { defineType, defineField, defineArrayMember } from 'sanity';
import {
  UserIcon,
  ThLargeIcon,
  StarIcon,
  DocumentTextIcon,
  BulbOutlineIcon,
  OlistIcon,
  PinIcon,
  CheckmarkCircleIcon,
} from '@sanity/icons';
import { SECTION_TYPES } from './sections';

// ── Shared helpers (mirrors sections.ts helpers — keep in sync if you change
//    the main helpers, or extract to a shared file in a future refactor) ──────

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

// Prose body identical to sections.ts proseBody
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
              fields: [
                defineField({
                  name: 'href',
                  title: 'URL',
                  type: 'url',
                  validation: (R) => R.uri({ allowRelative: true }),
                }),
              ],
            },
          ],
        },
      }),
    ],
  });

// ── 1. founderSection ────────────────────────────────────────────────────────
// Two-column bio block: portrait + prose intro. Use once per site (home page).
// Manages its own bg-background surface (SELF_CONTAINED).
export const founderSection = defineType({
  name: 'founderSection',
  title: 'Founder bio',
  type: 'object',
  icon: UserIcon,
  fields: [
    imageWithAlt('portrait', 'Portrait photo'),
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({
      name: 'headline',
      title: 'Headline',
      type: 'string',
      validation: (R) => R.required(),
    }),
    proseBody('content', 'Bio text'),
    defineField({ name: 'cta', title: 'Button (optional)', type: 'ctaBlock' }),
  ],
  preview: {
    select: { title: 'headline', media: 'portrait' },
    prepare: ({ title, media }) => ({
      title: title || 'Founder bio',
      subtitle: 'Founder bio',
      media,
    }),
  },
});

// ── 2. servicesGridSection ───────────────────────────────────────────────────
// Services grid. Auto-populates from the service collection at query time.
// Editor controls heading copy; service cards come from the service docs.
// Manages its own surface-warm bg-background (SELF_CONTAINED).
export const servicesGridSection = defineType({
  name: 'servicesGridSection',
  title: 'Services grid',
  type: 'object',
  icon: ThLargeIcon,
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({
      name: 'headline',
      title: 'Headline',
      type: 'string',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'scriptAccent',
      title: 'Handwritten accent word (optional)',
      type: 'string',
      description:
        'One word from the headline to render in the script font. Must match exactly. Leave blank to skip.',
    }),
    defineField({ name: 'subhead', title: 'Subhead (optional)', type: 'text', rows: 2 }),
    defineField({ name: 'cta', title: 'Button (optional)', type: 'ctaBlock' }),
    defineField({
      name: 'footnote',
      title: 'Footnote (optional)',
      type: 'string',
      description:
        'Small-print line under the grid. Example: "Final pricing is always discussed before any work begins."',
    }),
    defineField({
      name: 'variant',
      title: 'Layout variant',
      type: 'string',
      initialValue: 'grid',
      options: {
        list: [
          { title: 'Compact grid (home page, up to 4)', value: 'grid' },
          { title: 'Full list with anchors (services page)', value: 'list' },
        ],
        layout: 'radio',
      },
    }),
  ],
  preview: {
    select: { title: 'headline' },
    prepare: ({ title }) => ({ title: title || 'Services grid', subtitle: 'Services grid' }),
  },
});

// ── 3. testimonialsSection ───────────────────────────────────────────────────
// Testimonial grid with an optional featured pull-quote above.
// References service testimonial docs (resolved at query time via sectionsProjection).
// Manages its own surface-warm bg-background (SELF_CONTAINED).
export const testimonialsSection = defineType({
  name: 'testimonialsSection',
  title: 'Testimonials',
  type: 'object',
  icon: StarIcon,
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline', type: 'string', validation: (R) => R.required() }),
    defineField({
      name: 'scriptAccent',
      title: 'Handwritten accent word (optional)',
      type: 'string',
      description: 'One word from the headline to render in the script font. Must match exactly.',
    }),
    defineField({ name: 'subhead', title: 'Subhead (optional)', type: 'text', rows: 2 }),
    defineField({
      name: 'featuredQuote',
      title: 'Featured testimonial (large pull-quote)',
      type: 'reference',
      to: [{ type: 'testimonial' }],
      description: 'Optional. The large pull-quote above the grid.',
    }),
    defineField({
      name: 'testimonialsToShow',
      title: 'Testimonials in grid (in order)',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'testimonial' }] })],
    }),
    defineField({
      name: 'attribution',
      title: 'Attribution line (optional)',
      type: 'string',
      description: 'Example: "From the studio\'s Google reviews."',
    }),
  ],
  preview: {
    select: { title: 'headline' },
    prepare: ({ title }) => ({ title: title || 'Testimonials', subtitle: 'Testimonials' }),
  },
});

// ── 4. storySection ──────────────────────────────────────────────────────────
// Long-form narrative block: sticky portrait, story prose, attribution + credential lines.
// Participates in alternating surface cadence (CONTENT) — receives surface prop.
export const storySection = defineType({
  name: 'storySection',
  title: 'Story / narrative',
  type: 'object',
  icon: DocumentTextIcon,
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline', type: 'string', validation: (R) => R.required() }),
    proseBody('content', 'Story text'),
    imageWithAlt('portrait', 'Portrait photo (optional)'),
    defineField({
      name: 'attribution',
      title: 'Attribution line (optional)',
      type: 'string',
      description: 'Example: "Your Name, Founder"',
    }),
    defineField({
      name: 'credentialLine',
      title: 'Credentials line (optional)',
      type: 'text',
      rows: 2,
      description: 'One plain sentence with real credentials. Must be accurate, not aspirational.',
    }),
    defineField({
      name: 'serviceAreaLine',
      title: 'Service area mention (optional)',
      type: 'string',
      description: 'Single line mentioning where you work.',
    }),
  ],
  preview: {
    select: { title: 'headline', media: 'portrait' },
    prepare: ({ title, media }) => ({
      title: title || 'Story',
      subtitle: 'Story / narrative',
      media,
    }),
  },
});

// ── 5. valuesSection ─────────────────────────────────────────────────────────
// Numbered card grid of values or philosophy points.
// Auto-populates from the philosophyPoint collection at query time.
// Manages its own bg-muted surface (SELF_CONTAINED).
export const valuesSection = defineType({
  name: 'valuesSection',
  title: 'Values / philosophy',
  type: 'object',
  icon: BulbOutlineIcon,
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline', type: 'string', validation: (R) => R.required() }),
  ],
  preview: {
    select: { title: 'headline' },
    prepare: ({ title }) => ({ title: title || 'Values', subtitle: 'Values / philosophy' }),
  },
});

// ── 6. processSection ────────────────────────────────────────────────────────
// Ordered process steps. Auto-populates from the processStep collection.
// Two variants: 'full' (all steps, large cards) and 'preview' (first 4, compact grid).
// Manages its own surface (SELF_CONTAINED) — 'full' on bg-background, 'preview' on bg-muted.
export const processSection = defineType({
  name: 'processSection',
  title: 'Process steps',
  type: 'object',
  icon: OlistIcon,
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline (optional)', type: 'string' }),
    defineField({ name: 'subhead', title: 'Subhead (optional)', type: 'text', rows: 2 }),
    defineField({
      name: 'variant',
      title: 'Variant',
      type: 'string',
      initialValue: 'preview',
      options: {
        list: [
          {
            title: 'Preview (first 4 steps, compact grid with a link)',
            value: 'preview',
          },
          {
            title: 'Full (all steps, large detail cards)',
            value: 'full',
          },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'cta',
      title: 'Link button (preview variant only)',
      type: 'ctaBlock',
      description: 'Only shown in the "preview" variant. Leave blank to hide.',
    }),
  ],
  preview: {
    select: { title: 'headline', variant: 'variant' },
    prepare: ({ title, variant }) => ({
      title: title || 'Process steps',
      subtitle: variant === 'full' ? 'Process steps (full)' : 'Process steps (preview)',
    }),
  },
});

// ── 7. serviceAreaSection ────────────────────────────────────────────────────
// Two-column service area info + optional travel fee table (from businessInfo).
// Participates in alternating surface cadence (CONTENT) — receives surface prop.
export const serviceAreaSection = defineType({
  name: 'serviceAreaSection',
  title: 'Service area',
  type: 'object',
  icon: PinIcon,
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline', type: 'string', validation: (R) => R.required() }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      description: 'Lead paragraph about the primary service area.',
    }),
    defineField({
      name: 'showTravelFees',
      title: 'Show travel fee tiers',
      type: 'boolean',
      initialValue: true,
      description:
        'When on, the travel fee tier table from Business Info is pulled in automatically. Turn off to show the heading and description only.',
    }),
  ],
  preview: {
    select: { title: 'headline' },
    prepare: ({ title }) => ({ title: title || 'Service area', subtitle: 'Service area' }),
  },
});

// ── 8. guaranteeSection ──────────────────────────────────────────────────────
// Trust/guarantee statement rendered as a styled callout band.
// Two sources: editor can write text inline, or leave blank to pull
// siteSettings.satisfactionGuarantee at render time.
// Participates in alternating surface cadence (CONTENT) — receives surface prop.
export const guaranteeSection = defineType({
  name: 'guaranteeSection',
  title: 'Guarantee / trust statement',
  type: 'object',
  icon: CheckmarkCircleIcon,
  fields: [
    defineField({
      name: 'text',
      title: 'Statement text (optional)',
      type: 'text',
      rows: 2,
      description:
        'The guarantee or trust statement. Leave blank to use the default text from Site Settings.',
    }),
  ],
  preview: {
    select: { title: 'text' },
    prepare: ({ title }) => ({
      title: title ? `"${String(title).slice(0, 60)}"` : 'Guarantee (from Site Settings)',
      subtitle: 'Guarantee / trust statement',
    }),
  },
});

// ── Exports ──────────────────────────────────────────────────────────────────

export const richSectionSchemas = [
  founderSection,
  servicesGridSection,
  testimonialsSection,
  storySection,
  valuesSection,
  processSection,
  serviceAreaSection,
  guaranteeSection,
];

export const RICH_SECTION_TYPES = richSectionSchemas.map((s) => ({ type: s.name }));

// Per-page curated lists. Each is SECTION_TYPES (9 general) plus the rich
// types that make sense on that page. Editors only see relevant blocks.
export const HOME_SECTION_TYPES = [
  ...SECTION_TYPES,
  { type: 'founderSection' },
  { type: 'servicesGridSection' },
  { type: 'testimonialsSection' },
  { type: 'processSection' },
];

export const ABOUT_SECTION_TYPES = [
  ...SECTION_TYPES,
  { type: 'storySection' },
  { type: 'valuesSection' },
];

export const SERVICES_SECTION_TYPES = [
  ...SECTION_TYPES,
  { type: 'servicesGridSection' },
  { type: 'serviceAreaSection' },
  { type: 'guaranteeSection' },
];

export const PROCESS_SECTION_TYPES = [
  ...SECTION_TYPES,
  { type: 'processSection' },
];

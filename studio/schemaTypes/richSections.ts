// Foundation, edit with care
// Rich section block library — the 8 generalized section types that power the
// four core pages (home, about, services, process). Each type is a generalized
// section rendered through a site component, with no client-specific copy,
// names, or domain vocabulary baked in.
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
  UsersIcon,
  HelpCircleIcon,
  SyncIcon,
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

// ── 9. faqSection ─────────────────────────────────────────────────────────--
// Inline FAQ accordion. References existing faqItem documents so editors pick
// from the curated collection rather than entering duplicate copy.
// SELF_CONTAINED — manages its own bg-background surface.
//
// NOTE: the dedicated /faq page emits FAQPage JSON-LD for Google rich results.
// This inline block deliberately does NOT re-emit that schema — Google penalises
// duplicate FAQPage markup on the same domain. The accordion renders without it.
export const faqSection = defineType({
  name: 'faqSection',
  title: 'FAQ accordion (inline)',
  type: 'object',
  icon: HelpCircleIcon,
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline', type: 'string', validation: (R) => R.required() }),
    defineField({ name: 'subhead', title: 'Subhead (optional)', type: 'text', rows: 2 }),
    defineField({
      name: 'items',
      title: 'Questions to show',
      type: 'array',
      description: 'Pick 3 to 6 questions. Fewer is better for inline blocks.',
      validation: (R) => R.max(8),
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'faqItem' }] })],
    }),
    defineField({ name: 'cta', title: 'Link button (optional)', type: 'ctaBlock' }),
  ],
  preview: {
    select: { title: 'headline', items: 'items' },
    prepare: ({ title, items }) => ({
      title: title || 'FAQ accordion',
      subtitle: `FAQ${Array.isArray(items) ? ` (${items.length} items)` : ''}`,
    }),
  },
});

// ── 10. teamSection ─────────────────────────────────────────────────────────
// Inline team member grid. Members are stored as inline objects rather than
// references to a teamMember collection. This keeps the core starter
// collection-free. A future modules/team module will own a full teamMember
// collection with richer fields; when that module ships, pages can migrate
// from this inline approach to the reference approach.
// SELF_CONTAINED — manages its own bg-background surface.
export const teamSection = defineType({
  name: 'teamSection',
  title: 'Team grid',
  type: 'object',
  icon: UsersIcon,
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline', type: 'string', validation: (R) => R.required() }),
    defineField({ name: 'subhead', title: 'Subhead (optional)', type: 'text', rows: 2 }),
    defineField({
      name: 'members',
      title: 'Team members',
      type: 'array',
      validation: (R) => R.min(1).max(12),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'teamMember',
          fields: [
            defineField({ name: 'name', title: 'Name', type: 'string', validation: (R) => R.required() }),
            defineField({ name: 'role', title: 'Role or title (optional)', type: 'string' }),
            imageWithAlt('photo', 'Photo (optional)'),
            defineField({ name: 'bio', title: 'Short bio (optional)', type: 'text', rows: 2 }),
            defineField({
              name: 'socialLinks',
              title: 'Social links (optional)',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'object',
                  name: 'socialLink',
                  fields: [
                    defineField({ name: 'label', title: 'Label', type: 'string', description: 'Examples: LinkedIn, Instagram, Website.', validation: (R) => R.required() }),
                    defineField({ name: 'url', title: 'URL', type: 'url', validation: (R) => R.required().uri({ scheme: ['http', 'https'] }) }),
                  ],
                  preview: { select: { title: 'label', subtitle: 'url' } },
                }),
              ],
            }),
          ],
          preview: {
            select: { title: 'name', subtitle: 'role', media: 'photo' },
            prepare: ({ title, subtitle, media }) => ({
              title: title || 'Team member',
              subtitle: subtitle || '',
              media,
            }),
          },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'headline', members: 'members' },
    prepare: ({ title, members }) => ({
      title: title || 'Team grid',
      subtitle: `Team${Array.isArray(members) ? ` (${members.length})` : ''}`,
    }),
  },
});

// ── 11. dynamicListSection ────────────────────────────────────────────────────
// Pulls the latest items from a core collection automatically. No manual
// curation required: the editor picks the source and a limit, and the section
// self-fills at build time. Great for keeping a home page or about page fresh
// without touching code.
//
// Supported sources and what they surface:
//   journal      - Latest journal entries (newest first, up to `limit`).
//   services     - All services (ordered by orderRank). Good for a compact
//                  "what we do" overview block on a secondary page.
//   testimonials - Recent testimonials (newest first). Renders as a card row.
//   faqs         - FAQ items ordered by displayOrder. Renders as a mini
//                  accordion (no duplicate FAQPage JSON-LD — the /faq page owns
//                  that schema; this block deliberately omits it).
//
// IMPORTANT: This section is SELF_CONTAINED (manages its own surface via
// sectionCadence.ts). Blocks carry NO backgroundColor field — that rule is
// unconditional.
//
// Build-time note: items are fetched via GROQ subqueries inside sectionsProjection().
// The section renders the pre-fetched array; no client-side fetching occurs.
export const dynamicListSection = defineType({
  name: 'dynamicListSection',
  title: 'Auto list (latest content)',
  type: 'object',
  icon: SyncIcon,
  description: 'Pulls the latest items from a collection automatically. Stays fresh on every rebuild without manual curation.',
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline', type: 'string', validation: (R) => R.required() }),
    defineField({ name: 'subhead', title: 'Subhead (optional)', type: 'text', rows: 2 }),
    defineField({
      name: 'source',
      title: 'Show items from',
      type: 'string',
      options: {
        list: [
          { title: 'Journal (latest posts)', value: 'journal' },
          { title: 'Services (all services)', value: 'services' },
          { title: 'Testimonials (latest)', value: 'testimonials' },
          { title: 'FAQs (by display order)', value: 'faqs' },
        ],
        layout: 'radio',
      },
      initialValue: 'journal',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'limit',
      title: 'How many to show',
      type: 'number',
      initialValue: 6,
      validation: (R) => R.required().min(3).max(12),
      description: 'Between 3 and 12 items. The section shows this many in a card grid.',
    }),
    defineField({ name: 'cta', title: 'Link button (optional)', type: 'ctaBlock' }),
  ],
  preview: {
    select: { title: 'headline', source: 'source', limit: 'limit' },
    prepare: ({ title, source, limit }) => ({
      title: title || 'Auto list',
      subtitle: `Auto list: ${source ?? ''}${limit ? ` (up to ${limit})` : ''}`,
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
  faqSection,
  teamSection,
  dynamicListSection,
];

export const RICH_SECTION_TYPES = richSectionSchemas.map((s) => ({ type: s.name }));

// Per-page curated lists. Each is SECTION_TYPES (11 general) plus the rich
// types that make sense on that page. Editors only see relevant blocks.
// U7 additions:
//   faqSection        -> HOME, ABOUT, SERVICES (inline FAQ on any marketing page)
//   logoStripSection  -> all pages (already in SECTION_TYPES via pageSectionSchemas)
//   embedSection      -> all pages (already in SECTION_TYPES via pageSectionSchemas)
//   teamSection       -> HOME, ABOUT
// Church-reverse-port additions:
//   dynamicListSection -> HOME, ABOUT (auto-pull latest content; generic small-biz sources)
export const HOME_SECTION_TYPES = [
  ...SECTION_TYPES,
  { type: 'founderSection' },
  { type: 'servicesGridSection' },
  { type: 'testimonialsSection' },
  { type: 'processSection' },
  { type: 'faqSection' },
  { type: 'teamSection' },
  { type: 'dynamicListSection' },
];

export const ABOUT_SECTION_TYPES = [
  ...SECTION_TYPES,
  { type: 'storySection' },
  { type: 'valuesSection' },
  { type: 'faqSection' },
  { type: 'teamSection' },
  { type: 'dynamicListSection' },
];

export const SERVICES_SECTION_TYPES = [
  ...SECTION_TYPES,
  { type: 'servicesGridSection' },
  { type: 'serviceAreaSection' },
  { type: 'guaranteeSection' },
  { type: 'faqSection' },
];

export const PROCESS_SECTION_TYPES = [
  ...SECTION_TYPES,
  { type: 'processSection' },
  { type: 'faqSection' },
];

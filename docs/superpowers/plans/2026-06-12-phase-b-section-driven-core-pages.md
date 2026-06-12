# Phase B — Section-Driven Core Pages

**Date:** 2026-06-12
**Branch:** `feat/page-builder-and-reskin-port`
**Status:** Ready to execute (with orchestrator refinements below)

---

## Orchestrator refinements (applied 2026-06-12, after draft review)

Two changes to the draft, to be honored during execution:

**R1 — No blank core pages (empty-state fallback).** A fresh clone of this
template has NO Sanity project, and an unseeded project has empty `pageBuilder`
arrays. Converted routes must NOT render blank. Define each converted page's
default section array in code (e.g. `src/data/defaultSections.ts`, exporting
`DEFAULT_HOME_SECTIONS`, `DEFAULT_ABOUT_SECTIONS`, `DEFAULT_SERVICES_SECTIONS`,
`DEFAULT_PROCESS_SECTIONS` as plain section-object arrays built from `site.ts`
identity + placeholder copy). Each route (B2.6-B2.9) renders
`pageDoc?.pageBuilder?.length ? pageDoc.pageBuilder : DEFAULT_<PAGE>_SECTIONS`.
`scripts/seed-core.mjs` (B2.10) imports and seeds from those SAME arrays, so
they are the single source of truth: a fresh/unconfigured clone renders the
designed default, a seeded project renders Studio content, and
`npm run build` never produces a blank core page. The exit-criteria note that
accepts "blank page when empty" is superseded by this.

**R2 — Process graduates the existing module, not a from-scratch build.** Before
creating `processPage.ts` / `processStep.ts` / `process.astro` (B2.4, B2.9),
check `modules/process/` in the starter for already-genericized process schema,
components, and page; reuse/adapt those into core rather than authoring fresh.
If the module has nothing usable, create minimal as the draft describes. Note
that `modules/process/` is superseded once process is a core page.

---

## Header block

### Goal

Convert the four core singleton pages (home, about, services, process) from
hardcoded Astro layout into fully section-driven pages that render through
`SectionRenderer.astro`. Add 8 new generalized rich section types, ported and
genericized from Reid Design's bespoke per-page components. Every section
type is available in a per-page curated list so editors only see what makes
sense on each page.

The existing structured content fields on each singleton are hidden (not
deleted) for rollback safety. A default seed populates each converted page's
`pageBuilder` with placeholder sections in a conversion-tuned order so a
freshly seeded project renders a complete-looking page the first time.

### Architecture

- New file: `studio/schemaTypes/richSections.ts` — 8 object types + per-page
  curated type lists.
- `studio/schemaTypes/sections.ts` — no changes to existing 9 types; the 8
  new types live in `richSections.ts` and are registered separately.
- `studio/schemaTypes/index.ts` — import and spread `richSectionSchemas`.
- `src/components/sections/` — 8 new Astro components, one per rich section
  type. Named for the generalized type, not the Reid source.
- `src/components/SectionRenderer.astro` — 8 new `_type` branches added.
- `src/lib/sectionCadence.ts` — new types added to `SELF_CONTAINED_TYPES` or
  `CONTENT_TYPES` per the classification table below.
- `src/lib/sectionCadence.test.ts` — new tests for every new type.
- `src/lib/queries.ts` — `sectionsProjection()` extended with sub-projections
  for the reference-resolving rich types; per-page query functions updated to
  project `pageBuilder` instead of flat fields.
- `studio/schemaTypes/homePage.ts`, `aboutPage.ts`, `servicesPage.ts` — add
  `pageBuilder` field + group, mark existing content fields `hidden: true,
  readOnly: true`.
- NEW: `studio/schemaTypes/processPage.ts` — does not exist in the starter;
  must be created from scratch (using Reid's as a model, genericized, with
  `pageBuilder` from the start).
- `src/pages/index.astro`, `about.astro`, `services.astro` — replace
  hardcoded section markup with `<SectionRenderer sections={pageBuilder}>`.
- NEW: `src/pages/process.astro` — does not exist in the starter; must be
  created.
- `scripts/seed-core.mjs` — extend with `pageBuilder` arrays on the four
  singleton documents; add a `processStep` collection seed.

### Tech stack

Astro 6.3.8 (static output), Sanity v6, TypeScript strict, Tailwind 4,
React 19 islands. Node 22.12+. Verification: `npm run typegen` (clean),
`npm run build` (clean), `npm run test` (16 existing + new cadence tests),
`npm --prefix studio run build` (clean for schema/structure changes).

### Agentic workers

This plan is sized for one focused session (B1 then B2 sequentially).
B1 and B2 are marked as separate executable stages; see the size note at the
bottom. B1 can be executed, verified, and committed before B2 starts.

---

## Classification decisions (document before coding)

Before touching any file, the executing agent must internalize these:

| new `_type` | cadence class | rationale |
|---|---|---|
| `founderSection` | SELF_CONTAINED | Manages its own 2-column surface (bg-background); no alternating participation. |
| `servicesGridSection` | SELF_CONTAINED | Manages surface-warm bg-background like HomeServices. |
| `testimonialsSection` | SELF_CONTAINED | Manages surface-warm bg-background like HomeTestimonials. |
| `storySection` | CONTENT | Long-form narrative; receives alternating surface like imageTextSection. |
| `valuesSection` | SELF_CONTAINED | Renders on bg-muted by design (like AboutPhilosophy). Self-declares surface. |
| `processSection` | SELF_CONTAINED | Renders on bg-background (full steps) or bg-muted (preview). Self-declares. |
| `serviceAreaSection` | CONTENT | Two-column info block; participates in alternating cadence. |
| `guaranteeSection` | CONTENT | Small trust band; participates in alternating cadence. |

The four SELF_CONTAINED types that render on a specific fixed surface manage
that surface class internally (same pattern as `heroSection`). The two CONTENT
types (`storySection`, `serviceAreaSection`, `guaranteeSection`) receive their
surface as a prop from `SectionRenderer`, same as `imageTextSection`.

---

## B1 — Generalized section types + components

### B1.1 Create `studio/schemaTypes/richSections.ts`

Create the file at `studio/schemaTypes/richSections.ts`. It must start with
the `// Foundation, edit with care` header. Complete code follows.

```ts
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
```

- [ ] Create `studio/schemaTypes/richSections.ts` with the code above.

---

### B1.2 Register rich section schemas in `studio/schemaTypes/index.ts`

In `studio/schemaTypes/index.ts` make these two changes:

1. Add the import (after the existing `pageSectionSchemas` import):
   ```ts
   import { richSectionSchemas } from './richSections';
   ```

2. In the `schemaTypes` array, add `...richSectionSchemas` immediately after
   `...pageSectionSchemas` (keep them grouped together):
   ```ts
   // Object types (embedded) first
   ctaBlock,
   ...pageSectionSchemas,
   ...richSectionSchemas,  // <-- add this line
   ```

- [ ] Edit `studio/schemaTypes/index.ts` with the two changes above.

---

### B1.3 Add new types to `src/lib/sectionCadence.ts`

In `src/lib/sectionCadence.ts`, extend the two Sets:

```ts
export const SELF_CONTAINED_TYPES = new Set([
  'heroSection',
  'ctaBandSection',
  'statSection',
  'spacerSection',
  // Rich section types — phase B
  'founderSection',
  'servicesGridSection',
  'testimonialsSection',
  'valuesSection',
  'processSection',
]);

export const CONTENT_TYPES = new Set([
  'richTextSection',
  'imageTextSection',
  'gallerySection',
  'quoteSection',
  'videoSection',
  // Rich section types — phase B
  'storySection',
  'serviceAreaSection',
  'guaranteeSection',
]);
```

No changes to `classifySections()` itself — the logic is already
correct for both sets.

- [ ] Edit `src/lib/sectionCadence.ts` to extend `SELF_CONTAINED_TYPES` and
  `CONTENT_TYPES` with the 8 new types per the table above.

---

### B1.4 Add tests to `src/lib/sectionCadence.test.ts`

Append the following test block at the end of the existing test file. These
tests sit alongside the 9 existing tests (the file currently has 10 tests
counting the import assertion test at the top).

```ts
// ── Phase B: rich section type classification ─────────────────────────────

test('rich SELF_CONTAINED types get null surface', () => {
  const richSelf = [
    'founderSection',
    'servicesGridSection',
    'testimonialsSection',
    'valuesSection',
    'processSection',
  ];
  for (const type of richSelf) {
    const rows = classifySections([block(type)]);
    assert.equal(rows[0].surface, null, `${type} should have null surface`);
  }
});

test('rich CONTENT types get alternating surface', () => {
  const richContent = ['storySection', 'serviceAreaSection', 'guaranteeSection'];
  for (const type of richContent) {
    const rows = classifySections([block(type)]);
    assert.equal(rows[0].surface, 'background', `${type} should get background on first`);
  }
});

test('rich content types advance the cadence counter', () => {
  const rows = classifySections([
    block('storySection'),       // background (idx 0)
    block('serviceAreaSection'), // muted (idx 1)
    block('guaranteeSection'),   // background (idx 2)
  ]);
  assert.deepEqual(surfaces(rows), ['background', 'muted', 'background']);
});

test('rich self-contained types do not advance the cadence counter', () => {
  const rows = classifySections([
    block('storySection'),       // background (idx 0)
    block('founderSection'),     // null (self-contained, no advance)
    block('serviceAreaSection'), // muted (idx 1)
  ]);
  assert.deepEqual(surfaces(rows), ['background', null, 'muted']);
});

test('all 8 new rich types appear in SELF_CONTAINED_TYPES or CONTENT_TYPES', () => {
  const all8 = [
    'founderSection', 'servicesGridSection', 'testimonialsSection',
    'storySection', 'valuesSection', 'processSection',
    'serviceAreaSection', 'guaranteeSection',
  ];
  for (const type of all8) {
    const inSelf = SELF_CONTAINED_TYPES.has(type);
    const inContent = CONTENT_TYPES.has(type);
    assert.ok(
      inSelf || inContent,
      `${type} must be classified in SELF_CONTAINED_TYPES or CONTENT_TYPES`,
    );
    assert.ok(
      !(inSelf && inContent),
      `${type} cannot be in both sets`,
    );
  }
});

test('divider inserted between storySection and serviceAreaSection (different surfaces)', () => {
  const rows = classifySections([
    block('storySection'),       // background
    block('serviceAreaSection'), // muted -> divider before
  ]);
  assert.deepEqual(dividers(rows), [false, true]);
});
```

- [ ] Append the 6 test blocks above to `src/lib/sectionCadence.test.ts`.

**Run gate:** `npm run test` — must show 16 existing + 6 new = 22 tests passing.

---

### B1.5 Create 8 Astro section components

Create each file in `src/components/sections/`. Each starts with
`// Foundation, edit with care`. Use the Reid source as the structural
reference but replace all Reid-specific copy, names, `aria-labelledby` ids,
and Staci/Plainfield references with generic equivalents. The `surface` prop
pattern (for CONTENT types) is taken from existing components like `ImageText.astro`.

**B1.5.1 — `FounderSection.astro`**

Source: `MeetStaci.astro` (Reid). Genericize the `aria-labelledby` id and
the fallback copy. The `content` prop is Portable Text (array of blocks).

```astro
---
// Foundation, edit with care
// Two-column founder bio block. Portrait left, prose right.
// Manages its own bg-background surface (SELF_CONTAINED — no surface prop).
import SanityImage from '@/components/SanityImage.astro';
import PortableText from '@/components/PortableText';
import CtaLink from '@/components/CtaLink.astro';

interface Props {
  portrait?: any;
  eyebrow?: string;
  headline?: string;
  content?: any;
  cta?: any;
  headingId?: string;
}

const {
  portrait,
  eyebrow = 'Meet the Founder.',
  headline = 'Good design starts with a real conversation.',
  content = null,
  cta,
  headingId = 'founder-section-heading',
} = Astro.props as Props;
---

<section class="bg-background" aria-labelledby={headingId}>
  <div data-reveal class="mx-auto max-w-content px-m py-section-lg grid grid-cols-1 md:grid-cols-2 gap-l md:gap-section-md items-center">
    {portrait?.asset ? (
      <div class="order-1 md:order-1">
        <SanityImage
          source={portrait}
          width={800}
          sizes="(min-width: 768px) 45vw, 100vw"
          quality={75}
          class="w-full h-auto rounded-md"
        />
      </div>
    ) : (
      <div class="order-1 md:order-1 aspect-[4/5] bg-muted rounded-md" aria-hidden="true"></div>
    )}

    <div class="order-2 md:order-2">
      <p class="text-xs uppercase tracking-[0.22em] text-foreground/80 mb-s">{eyebrow}</p>
      <h2 id={headingId} class="font-display text-h2 text-foreground">{headline}</h2>
      {content ? (
        <PortableText value={content} className="mt-m text-foreground/85 text-lg leading-relaxed" />
      ) : (
        <p class="mt-m text-foreground/85 text-lg leading-relaxed">
          Add your founder intro in Sanity Studio under the Founder Bio section.
        </p>
      )}
      <div class="mt-l flex justify-center md:justify-start">
        <CtaLink cta={cta} variant="secondary" fallbackHref="/about" fallbackLabel="Learn More" />
      </div>
    </div>
  </div>
</section>
```

- [ ] Create `src/components/sections/FounderSection.astro` with code above.

---

**B1.5.2 — `ServicesGridSection.astro`**

Source: `HomeServices.astro` + `ServicesList.astro` (Reid). Controlled by the
`variant` prop (`'grid'` = compact 4-card home layout; `'list'` = full
anchor-linkable services list). The GROQ query resolves `services` from the
collection at query time and injects them into the block; see B1.7.

```astro
---
// Foundation, edit with care
// Services grid/list section. 'grid' variant: up to 4 compact cards (home).
// 'list' variant: full anchor-linkable service cards (services page).
// Manages its own surface-warm bg-background (SELF_CONTAINED — no surface prop).
// Services are resolved at query time by sectionsProjection() and passed in.
import SectionHeading from '@/components/SectionHeading.astro';
import ServiceCard from '@/components/ServiceCard.astro';
import CtaLink from '@/components/CtaLink.astro';

interface Props {
  eyebrow?: string;
  headline?: string;
  scriptAccent?: string;
  subhead?: string;
  services?: any[];
  cta?: any;
  footnote?: string;
  variant?: 'grid' | 'list';
  headingId?: string;
}

const {
  eyebrow = 'Our Services.',
  headline = 'Find the right fit for your project.',
  scriptAccent,
  subhead,
  services = [],
  cta,
  footnote,
  variant = 'grid',
  headingId = 'services-grid-heading',
} = Astro.props as Props;

const isGrid = variant === 'grid';
---

<section class="surface-warm bg-background" aria-labelledby={headingId}>
  <div class={`${isGrid ? '' : ''} mx-auto max-w-content px-m py-section-lg`} data-reveal>
    <SectionHeading
      eyebrow={eyebrow}
      headline={headline}
      subhead={subhead}
      headingId={headingId}
      align="center"
      class="mx-auto"
      scriptAccent={scriptAccent}
    />

    {isGrid ? (
      <>
        {services.length > 0 && (
          <div class="mt-section-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-m" data-stagger-grid>
            {services.slice(0, 4).map((service: any) => (
              <ServiceCard service={service} compact={true} />
            ))}
          </div>
        )}
        <div class="mt-section-lg flex justify-center">
          <CtaLink cta={cta} variant="secondary" fallbackHref="/services" fallbackLabel="See All Services" />
        </div>
      </>
    ) : (
      <>
        {services.length >= 3 && (
          <nav class="mt-m flex flex-col items-center gap-s" aria-label="On this page">
            <p class="text-xs uppercase tracking-eyebrow text-foreground/80">On this page</p>
            <ul class="flex flex-wrap justify-center gap-xs list-none p-0">
              {services.map((service: any) =>
                service.slug?.current ? (
                  <li>
                    <a
                      href={`#${service.slug.current}`}
                      class="press-tactile inline-flex items-center min-h-[36px] px-s py-1.5 text-xs uppercase tracking-eyebrow text-foreground/85 border border-border-soft rounded-full hover:border-primary hover:text-link transition-colors"
                    >
                      {service.name}
                    </a>
                  </li>
                ) : null
              )}
            </ul>
          </nav>
        )}
        {services.length > 0 ? (
          <div class="mt-section-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-l" data-stagger-grid>
            {services.map((service: any) => (
              <ServiceCard service={service} withAnchor={true} />
            ))}
          </div>
        ) : (
          <p class="mt-section-lg text-center text-muted-foreground italic">
            Services are being updated. <a href="/contact" class="text-link underline underline-offset-2">Get in touch</a> and we will talk through what you need.
          </p>
        )}
      </>
    )}

    {footnote && (
      <p class="mt-section-md text-center text-sm text-muted-foreground italic">{footnote}</p>
    )}
  </div>
</section>
```

- [ ] Create `src/components/sections/ServicesGridSection.astro` with code above.

---

**B1.5.3 — `TestimonialsSection.astro`**

Source: `HomeTestimonials.astro` (Reid). Self-suppresses when no quotes.
References resolved at query time; see B1.7.

```astro
---
// Foundation, edit with care
// Testimonial grid with an optional featured pull-quote above.
// Manages its own surface-warm bg-background (SELF_CONTAINED — no surface prop).
// featuredQuote and testimonialsToShow are resolved at query time.
import SectionHeading from '@/components/SectionHeading.astro';
import FeaturedTestimonial from '@/components/FeaturedTestimonial.astro';
import TestimonialGrid from '@/components/TestimonialGrid.astro';

interface Props {
  eyebrow?: string;
  headline?: string;
  scriptAccent?: string;
  subhead?: string;
  attribution?: string;
  featuredQuote?: any;
  testimonialsToShow?: any[];
  headingId?: string;
}

const {
  eyebrow = 'Kind Words.',
  headline = 'Words from real clients.',
  scriptAccent,
  subhead,
  attribution,
  featuredQuote,
  testimonialsToShow = [],
  headingId = 'testimonials-section-heading',
} = Astro.props as Props;
---

{(featuredQuote || testimonialsToShow.length > 0) && (
  <section class="surface-warm bg-background" aria-labelledby={headingId}>
    <div data-reveal class="mx-auto max-w-content px-m py-section-lg">
      <SectionHeading
        eyebrow={eyebrow}
        headline={headline}
        subhead={subhead}
        headingId={headingId}
        align="center"
        class="mx-auto"
        scriptAccent={scriptAccent}
      />

      {featuredQuote && (
        <div class="mt-section-lg">
          <FeaturedTestimonial testimonial={featuredQuote} />
        </div>
      )}

      {testimonialsToShow.length > 0 && (
        <div class="mt-section-lg">
          <TestimonialGrid testimonials={testimonialsToShow} limit={6} />
        </div>
      )}

      {attribution && (
        <p class="mt-section-md text-center text-sm text-muted-foreground italic">
          {attribution}
        </p>
      )}
    </div>
  </section>
)}
```

- [ ] Create `src/components/sections/TestimonialsSection.astro` with code above.

---

**B1.5.4 — `StorySection.astro`**

Source: `AboutStory.astro` (Reid). Genericize: `headingId`, fallback copy,
remove "Reid Design" / "Staci" references. This is a CONTENT type so it
accepts a `surface` prop.

```astro
---
// Foundation, edit with care
// Long-form narrative block: sticky portrait left, prose right.
// CONTENT type — receives surface assignment from SectionRenderer.
import SectionHeading from '@/components/SectionHeading.astro';
import SanityImage from '@/components/SanityImage.astro';
import PortableText from '@/components/PortableText';

interface Props {
  eyebrow?: string;
  headline?: string;
  content?: any;
  portrait?: any;
  attribution?: string;
  credentialLine?: string;
  serviceAreaLine?: string;
  surface?: 'background' | 'muted' | null;
  headingId?: string;
}

const {
  eyebrow = 'My Story.',
  headline = 'Why I Started This Studio.',
  content,
  portrait,
  attribution,
  credentialLine,
  serviceAreaLine,
  surface = 'background',
  headingId = 'story-section-heading',
} = Astro.props as Props;

const bg = surface === 'muted' ? 'bg-muted' : 'bg-background';
---

<section class={bg} aria-labelledby={headingId}>
  <div class="mx-auto max-w-content px-m py-section-lg grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-l md:gap-section-md items-start">
    <div class="md:sticky md:top-section-lg">
      {portrait?.asset ? (
        <SanityImage
          source={portrait}
          width={900}
          sizes="(min-width: 768px) 40vw, 100vw"
          quality={75}
          class="w-full h-auto rounded-md"
        />
      ) : (
        <div class="aspect-[4/5] bg-muted rounded-md" aria-hidden="true"></div>
      )}
      {attribution && (
        <p class="mt-s text-xs uppercase tracking-widest text-foreground/80">{attribution}</p>
      )}
    </div>

    <div>
      <SectionHeading eyebrow={eyebrow} headline={headline} headingId={headingId} />

      {content && (
        <PortableText value={content} className="mt-l text-foreground/85 text-lg leading-relaxed" />
      )}

      {(credentialLine || serviceAreaLine) && (
        <div class="mt-section-md pt-l border-t border-border-soft space-y-m text-foreground/80">
          {credentialLine && (
            <p>
              <span class="block text-xs uppercase tracking-widest text-foreground/80 mb-xs">Background</span>
              {credentialLine}
            </p>
          )}
          {serviceAreaLine && (
            <p>
              <span class="block text-xs uppercase tracking-widest text-foreground/80 mb-xs">Service area</span>
              {serviceAreaLine}
            </p>
          )}
        </div>
      )}
    </div>
  </div>
</section>
```

- [ ] Create `src/components/sections/StorySection.astro` with code above.

---

**B1.5.5 — `ValuesSection.astro`**

Source: `AboutPhilosophy.astro` (Reid). Philosophy points are resolved at
query time and injected into the section block data. SELF_CONTAINED — manages
bg-muted. Self-suppresses when no points.

```astro
---
// Foundation, edit with care
// Numbered card grid of values or philosophy principles.
// Points are resolved from the philosophyPoint collection at query time.
// SELF_CONTAINED — manages its own bg-muted surface.
import SectionHeading from '@/components/SectionHeading.astro';

interface PhilosophyPoint {
  title?: string;
  description?: string;
}

interface Props {
  eyebrow?: string;
  headline?: string;
  points?: PhilosophyPoint[];
  headingId?: string;
}

const {
  eyebrow = 'How We Work.',
  headline = 'Principles that guide every project.',
  points = [],
  headingId = 'values-section-heading',
} = Astro.props as Props;
---

{points.length > 0 && (
  <section class="bg-muted" aria-labelledby={headingId}>
    <div class="mx-auto max-w-content px-m py-section-lg">
      <SectionHeading
        eyebrow={eyebrow}
        headline={headline}
        headingId={headingId}
        align="center"
        class="mx-auto"
      />

      <div class="mt-section-lg grid grid-cols-1 md:grid-cols-3 gap-l" data-stagger-grid>
        {points.map((point, idx) => (
          <article class="bg-card p-l rounded-md border border-border-soft">
            <p class="font-display text-h2 text-link/85 leading-none mb-s" aria-hidden="true">
              {String(idx + 1).padStart(2, '0')}
            </p>
            <h3 class="font-display text-h3 text-foreground">{point.title}</h3>
            <p class="mt-s text-foreground/85 leading-relaxed">{point.description}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
)}
```

- [ ] Create `src/components/sections/ValuesSection.astro` with code above.

---

**B1.5.6 — `ProcessSection.astro`**

Sources: `ProcessSteps.astro` + `ProcessPreview.astro` (Reid). SELF_CONTAINED.
`'full'` variant: bg-background, all steps. `'preview'` variant: bg-muted,
first 4 steps in a 2-col grid, link button. Process steps resolved at query
time.

```astro
---
// Foundation, edit with care
// Process steps section. Two variants: 'full' (all steps, large cards,
// bg-background) and 'preview' (first 4 steps, 2-col grid, bg-muted, CTA link).
// Steps are resolved from the processStep collection at query time.
// SELF_CONTAINED — manages its own surface.
import SectionHeading from '@/components/SectionHeading.astro';
import ProcessStep from '@/components/ProcessStep.astro';
import CtaLink from '@/components/CtaLink.astro';

interface Props {
  eyebrow?: string;
  headline?: string;
  subhead?: string;
  steps?: any[];
  variant?: 'full' | 'preview';
  cta?: any;
  headingId?: string;
}

const {
  eyebrow = 'How It Works.',
  headline = 'A clear process, start to finish.',
  subhead,
  steps = [],
  variant = 'preview',
  cta,
  headingId = 'process-section-heading',
} = Astro.props as Props;

const isFull = variant === 'full';
const bg = isFull ? 'bg-background' : 'bg-muted';
---

{steps.length > 0 && (
  <section class={bg} aria-labelledby={isFull ? undefined : headingId} aria-label={isFull ? 'Process step by step' : undefined}>
    <div class={`mx-auto max-w-content px-m py-section-lg${isFull ? ' space-y-section-lg' : ''}`} data-reveal>
      {!isFull && (
        <SectionHeading
          eyebrow={eyebrow}
          headline={headline}
          subhead={subhead}
          headingId={headingId}
          align="center"
          class="mx-auto"
        />
      )}

      {isFull ? (
        steps.map((step: any, i: number) => (
          <div class={i > 0 ? 'pt-section-lg border-t border-border-soft' : ''}>
            <ProcessStep step={step} variant="full" isLast={i === steps.length - 1} />
          </div>
        ))
      ) : (
        <>
          <div class="mt-section-lg grid grid-cols-1 md:grid-cols-2 gap-section-md">
            {steps.slice(0, 4).map((step: any, i: number, arr: any[]) => (
              <ProcessStep step={step} variant="preview" isLast={i === arr.length - 1} />
            ))}
          </div>
          <div class="mt-section-lg flex justify-center">
            <CtaLink cta={cta} variant="secondary" fallbackHref="/process" fallbackLabel="See the Full Process" />
          </div>
        </>
      )}
    </div>
  </section>
)}
```

- [ ] Create `src/components/sections/ProcessSection.astro` with code above.

---

**B1.5.7 — `ServiceAreaSection.astro`**

Source: `ServiceArea.astro` (Reid). CONTENT type — receives `surface` prop.
The `travelFees` prop is injected via the GROQ query (sub-projected from
`businessInfo`) when `showTravelFees` is true. Self-suppresses when no
headline and no fees.

```astro
---
// Foundation, edit with care
// Service area section: heading + description left, optional travel fee table right.
// CONTENT type — receives surface assignment from SectionRenderer.
// travelFees are resolved from businessInfo at query time when showTravelFees is true.
import SectionHeading from '@/components/SectionHeading.astro';

interface Props {
  eyebrow?: string;
  headline?: string;
  description?: string;
  travelFees?: { distanceLabel: string; fee: string }[];
  showTravelFees?: boolean;
  surface?: 'background' | 'muted' | null;
  headingId?: string;
}

const {
  eyebrow = 'Service Area.',
  headline,
  description,
  travelFees = [],
  showTravelFees = true,
  surface = 'background',
  headingId = 'service-area-section-heading',
} = Astro.props as Props;

const show = !!headline || (showTravelFees && travelFees.length > 0);
const bg = surface === 'muted' ? 'bg-muted' : 'bg-background';
const fees = showTravelFees ? travelFees : [];
---

{show && (
  <section id="service-area" class={`${bg} scroll-mt-24`} aria-labelledby={headingId}>
    <div class="mx-auto max-w-content px-m py-section-lg grid grid-cols-1 md:grid-cols-2 gap-l md:gap-section-md items-start">
      <div>
        <SectionHeading
          eyebrow={eyebrow}
          headline={headline ?? 'Where We Work.'}
          headingId={headingId}
        />
        {description && (
          <p class="mt-m text-foreground/85 text-lg leading-relaxed">{description}</p>
        )}
      </div>

      {fees.length > 0 && (
        <div class="bg-muted p-l rounded-md">
          <p class="text-xs uppercase tracking-widest text-foreground/80 mb-m">Travel fee tiers</p>
          <dl class="divide-y divide-border-soft">
            {fees.map((tier) => (
              <div class="flex items-baseline justify-between py-s gap-m">
                <dt class="text-foreground/85">{tier.distanceLabel}</dt>
                <dd class="font-mono text-sm font-semibold text-link whitespace-nowrap">{tier.fee}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  </section>
)}
```

- [ ] Create `src/components/sections/ServiceAreaSection.astro` with code above.

---

**B1.5.8 — `GuaranteeSection.astro`**

Source: `SatisfactionGuarantee.astro` (Reid). CONTENT type — receives `surface`
prop. Self-suppresses when text is blank. The `text` field on the schema is
optional; the component also accepts a `siteSettingsText` prop (passed from
the query-resolved `siteSettings.satisfactionGuarantee`) as a fallback.

```astro
---
// Foundation, edit with care
// Trust / guarantee statement rendered as a styled callout band.
// CONTENT type — receives surface assignment from SectionRenderer.
// text: inline text from the schema block. siteSettingsText: fallback from siteSettings.
interface Props {
  text?: string;
  siteSettingsText?: string;
  surface?: 'background' | 'muted' | null;
}

const {
  text,
  siteSettingsText,
  surface = 'background',
} = Astro.props as Props;

const display = text || siteSettingsText;
const bg = surface === 'muted' ? 'bg-muted' : 'bg-background';
---

{display && (
  <section class={bg} aria-label="Satisfaction guarantee">
    <div class="mx-auto max-w-content px-m py-l">
      <p class="text-center text-foreground/80 text-sm border border-border-soft rounded-md py-m px-l bg-muted">
        {display}
      </p>
    </div>
  </section>
)}
```

- [ ] Create `src/components/sections/GuaranteeSection.astro` with code above.

---

### B1.6 Wire 8 new types into `SectionRenderer.astro`

Add imports at the top of `src/components/SectionRenderer.astro` (after the
existing section component imports):

```ts
import FounderSection from '@/components/sections/FounderSection.astro';
import ServicesGridSection from '@/components/sections/ServicesGridSection.astro';
import TestimonialsSection from '@/components/sections/TestimonialsSection.astro';
import StorySection from '@/components/sections/StorySection.astro';
import ValuesSection from '@/components/sections/ValuesSection.astro';
import ProcessSection from '@/components/sections/ProcessSection.astro';
import ServiceAreaSection from '@/components/sections/ServiceAreaSection.astro';
import GuaranteeSection from '@/components/sections/GuaranteeSection.astro';
```

In the `{rows.map(...)}` template block, add 8 new `_type` branches. Insert
them before the final `else` branch (the unknown-type console.warn). Each
maps block props through `as any` consistent with the existing pattern:

```astro
    ) : s._type === 'founderSection' ? (
      <FounderSection
        portrait={s.portrait as any}
        eyebrow={s.eyebrow as string | undefined}
        headline={s.headline as string | undefined}
        content={s.content as any}
        cta={s.cta as any}
        headingId={headingId}
      />
    ) : s._type === 'servicesGridSection' ? (
      <ServicesGridSection
        eyebrow={s.eyebrow as string | undefined}
        headline={s.headline as string | undefined}
        scriptAccent={s.scriptAccent as string | undefined}
        subhead={s.subhead as string | undefined}
        services={(s.services as any[]) ?? []}
        cta={s.cta as any}
        footnote={s.footnote as string | undefined}
        variant={(s.variant as 'grid' | 'list') ?? 'grid'}
        headingId={headingId}
      />
    ) : s._type === 'testimonialsSection' ? (
      <TestimonialsSection
        eyebrow={s.eyebrow as string | undefined}
        headline={s.headline as string | undefined}
        scriptAccent={s.scriptAccent as string | undefined}
        subhead={s.subhead as string | undefined}
        featuredQuote={s.featuredQuote as any}
        testimonialsToShow={(s.testimonialsToShow as any[]) ?? []}
        attribution={s.attribution as string | undefined}
        headingId={headingId}
      />
    ) : s._type === 'storySection' ? (
      <StorySection
        eyebrow={s.eyebrow as string | undefined}
        headline={s.headline as string | undefined}
        content={s.content as any}
        portrait={s.portrait as any}
        attribution={s.attribution as string | undefined}
        credentialLine={s.credentialLine as string | undefined}
        serviceAreaLine={s.serviceAreaLine as string | undefined}
        surface={surface ?? 'background'}
        headingId={headingId}
      />
    ) : s._type === 'valuesSection' ? (
      <ValuesSection
        eyebrow={s.eyebrow as string | undefined}
        headline={s.headline as string | undefined}
        points={(s.points as any[]) ?? []}
        headingId={headingId}
      />
    ) : s._type === 'processSection' ? (
      <ProcessSection
        eyebrow={s.eyebrow as string | undefined}
        headline={s.headline as string | undefined}
        subhead={s.subhead as string | undefined}
        steps={(s.steps as any[]) ?? []}
        variant={(s.variant as 'full' | 'preview') ?? 'preview'}
        cta={s.cta as any}
        headingId={headingId}
      />
    ) : s._type === 'serviceAreaSection' ? (
      <ServiceAreaSection
        eyebrow={s.eyebrow as string | undefined}
        headline={s.headline as string | undefined}
        description={s.description as string | undefined}
        travelFees={(s.travelFees as any[]) ?? []}
        showTravelFees={(s.showTravelFees as boolean) ?? true}
        surface={surface ?? 'background'}
        headingId={headingId}
      />
    ) : s._type === 'guaranteeSection' ? (
      <GuaranteeSection
        text={s.text as string | undefined}
        siteSettingsText={s.siteSettingsText as string | undefined}
        surface={surface ?? 'background'}
      />
    )
```

- [ ] Edit `src/components/SectionRenderer.astro`: add 8 imports + 8 `_type`
  branches per the code above.

---

### B1.7 Extend `sectionsProjection()` in `src/lib/queries.ts`

The existing `sectionsProjection()` function handles `heroSection`,
`ctaBandSection`, `imageTextSection`, and `gallerySection`. Extend it with
sub-projections for the 5 rich types that carry references or nested assets:

```ts
export function sectionsProjection(field = 'pageBuilder'): string {
  return `${field}[]{
    ...,
    _type == "heroSection" => {
      ...,
      backgroundImage${IMAGE_PROJECTION},
      primaryCta${CTA_PROJECTION},
      secondaryCta${CTA_PROJECTION}
    },
    _type == "ctaBandSection" => {
      ...,
      backgroundImage${IMAGE_PROJECTION},
      cta${CTA_PROJECTION}
    },
    _type == "imageTextSection" => {
      ...,
      image${IMAGE_PROJECTION},
      cta${CTA_PROJECTION}
    },
    _type == "gallerySection" => {
      ...,
      images[]${IMAGE_PROJECTION}
    },
    _type == "founderSection" => {
      ...,
      portrait${IMAGE_PROJECTION},
      cta${CTA_PROJECTION}
    },
    _type == "storySection" => {
      ...,
      portrait${IMAGE_PROJECTION}
    },
    _type == "servicesGridSection" => {
      ...,
      cta${CTA_PROJECTION},
      "services": *[_type == "service"] | order(orderRank asc, displayOrder asc)
    },
    _type == "testimonialsSection" => {
      ...,
      "featuredQuote": featuredQuote->{
        ...,
        "relatedProject": relatedProject->{ title, "slug": slug.current }
      },
      "testimonialsToShow": testimonialsToShow[]->{
        ...,
        "relatedProject": relatedProject->{ title, "slug": slug.current }
      }
    },
    _type == "valuesSection" => {
      ...,
      "points": *[_type == "philosophyPoint"] | order(orderRank asc, displayOrder asc){
        title, description, displayOrder
      }
    },
    _type == "processSection" => {
      ...,
      cta${CTA_PROJECTION},
      "steps": *[_type == "processStep"] | order(orderRank asc, stepNumber asc){
        stepNumber, title, timeEstimate, shortDescription, features, tierNote
      }
    },
    _type == "serviceAreaSection" => {
      ...,
      "travelFees": *[_type == "businessInfo"][0].travelFees
    },
    _type == "guaranteeSection" => {
      ...,
      "siteSettingsText": *[_type == "siteSettings"][0].satisfactionGuarantee
    }
  }`;
}
```

Replace the existing `sectionsProjection` function body entirely with the
version above.

- [ ] Edit `src/lib/queries.ts`: replace `sectionsProjection()` body with the
  version above.

---

### B1.8 Run typegen and build gate

- [ ] Run `npm run typegen` — must complete clean.
- [ ] Run `npm --prefix studio run build` — must complete clean (Studio
  schema validation).
- [ ] Run `npm run build` — must complete clean. If TypeScript errors appear
  on the new component imports in `SectionRenderer.astro`, they are
  `as any` casts and should not fail a strict build; investigate if they do.
- [ ] Run `npm run test` — must show 22 tests passing (16 original + 6 new).

**B1 is complete when all four gates pass.**

---

## B2 — Convert the 4 core pages

> The starter does not have a `processPage.ts` schema or `process.astro` route.
> Both must be created new. The other three pages (home, about, services) have
> existing schemas and routes that are modified in place.

---

### B2.1 Home page — schema

Edit `studio/schemaTypes/homePage.ts`.

**Step 1: Add import at the top.**

```ts
import { HOME_SECTION_TYPES } from './richSections';
```

**Step 2: Add a new `'pageBuilder'` group entry.**

In the `groups` array, add `{ name: 'pageBuilder', title: 'Page layout' }` as
the FIRST entry (before `seo`):

```ts
groups: [
  { name: 'pageBuilder', title: 'Page layout' },
  { name: 'seo', title: 'SEO' },
  // ... rest unchanged
],
```

**Step 3: Add the `pageBuilder` field.**

Add this field as the FIRST field in the `fields` array (before the existing
`seoTitle` field):

```ts
defineField({
  name: 'pageBuilder',
  title: 'Page layout',
  type: 'array',
  group: 'pageBuilder',
  description:
    'Sections on this page. Drag to reorder, remove a section to hide it, or add a new block from the library. Edit each section\'s content by clicking into it.',
  of: HOME_SECTION_TYPES,
}),
```

**Step 4: Mark existing structured content fields hidden + readOnly.**

Apply `hidden: true, readOnly: true` to every field EXCEPT `seoTitle`,
`seoDescription`, `seoImage`, and the new `pageBuilder` field. That covers
these groups: hero, meetFounder, featuredWork, featuredJournal, process,
testimonials, services, final.

Do this by adding to each such `defineField` call:
```ts
hidden: true,
readOnly: true,
```

For fields that already use `hidden: true` (e.g., `heroImage` which is already
`hidden: true`), add only `readOnly: true`.

- [ ] Edit `studio/schemaTypes/homePage.ts` per the 4 steps above.

---

### B2.2 About page — schema

Edit `studio/schemaTypes/aboutPage.ts`.

Same pattern as B2.1:

1. Add `import { ABOUT_SECTION_TYPES } from './richSections';` at the top.
2. Add `{ name: 'pageBuilder', title: 'Page layout' }` as the first group.
3. Add the `pageBuilder` field first in `fields`, using `of: ABOUT_SECTION_TYPES`.
4. Mark all non-SEO, non-pageBuilder fields `hidden: true, readOnly: true`
   (groups: hero, story, philosophy, personal, stats, final).

- [ ] Edit `studio/schemaTypes/aboutPage.ts` per the 4 steps above.

---

### B2.3 Services page — schema

Edit `studio/schemaTypes/servicesPage.ts`.

Same pattern:

1. Add `import { SERVICES_SECTION_TYPES } from './richSections';` at the top.
2. Add `{ name: 'pageBuilder', title: 'Page layout' }` as the first group.
3. Add `pageBuilder` field first, using `of: SERVICES_SECTION_TYPES`.
4. Mark all non-SEO, non-pageBuilder fields `hidden: true, readOnly: true`
   (groups: hero, list, builders, area, final, plus the `note` field).

- [ ] Edit `studio/schemaTypes/servicesPage.ts` per the 4 steps above.

---

### B2.4 Process page — schema (NEW FILE)

The starter has no `processPage.ts`. Create one from scratch. Model it on
Reid's `processPage.ts` but genericized, and with `pageBuilder` as the
primary editing surface from day one (no legacy structured fields to hide).

Create `studio/schemaTypes/processPage.ts`:

```ts
// Foundation, edit with care
// Process page singleton. Process steps auto-populate from the processStep
// collection. The page is fully section-driven via pageBuilder.

import { defineType, defineField } from 'sanity';
import { PROCESS_SECTION_TYPES } from './richSections';

export const processPage = defineType({
  name: 'processPage',
  title: 'Process Page',
  type: 'document',
  options: { canvasApp: { exclude: true } },
  groups: [
    { name: 'pageBuilder', title: 'Page layout' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'pageBuilder',
      title: 'Page layout',
      type: 'array',
      group: 'pageBuilder',
      description:
        "The sections on the Process page. Drag to reorder, remove a section to hide it, or add a new block from the library.",
      of: PROCESS_SECTION_TYPES,
    }),

    defineField({
      name: 'seoTitle',
      title: 'SEO title',
      type: 'string',
      group: 'seo',
      description: 'Browser tab and Google result title. Aim for 50 to 60 characters.',
      validation: (Rule) =>
        Rule.max(60).warning('Titles longer than about 60 characters get cut off in Google search results.'),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO description',
      type: 'text',
      rows: 3,
      group: 'seo',
      description: 'The sentence under the title in Google results. Aim for 150 to 160 characters.',
      validation: (Rule) =>
        Rule.max(160).warning('Descriptions longer than about 160 characters get cut off in Google search results.'),
    }),
    defineField({
      name: 'seoImage',
      title: 'Social share image (this page)',
      type: 'image',
      group: 'seo',
      description:
        'Optional. Overrides the site default. Wide image, about 1200 x 630 pixels.',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string' }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Process Page' }) },
});
```

Then register it in `studio/schemaTypes/index.ts`:

1. Add `import { processPage } from './processPage';`
2. Add `processPage` to the `schemaTypes` array, after `servicesPage`:
   ```ts
   servicesPage,
   processPage,  // <-- add
   faqPage,
   ```

Also add a `processStep` document type registration if not already present.
Check with: `grep -l "processStep" studio/schemaTypes/*.ts`. If `processStep`
is absent, it is a module type (from the process module) that may not be
wired yet. In that case, add a minimal `processStep` schema:

```ts
// studio/schemaTypes/processStep.ts
import { defineType, defineField } from 'sanity';

export const processStep = defineType({
  name: 'processStep',
  title: 'Process Step',
  type: 'document',
  fields: [
    defineField({ name: 'stepNumber', title: 'Step number', type: 'number', validation: (R) => R.required() }),
    defineField({ name: 'title', title: 'Step title', type: 'string', validation: (R) => R.required() }),
    defineField({ name: 'timeEstimate', title: 'Time estimate (optional)', type: 'string' }),
    defineField({ name: 'shortDescription', title: 'Short description', type: 'text', rows: 2 }),
    defineField({
      name: 'features',
      title: 'What is included (bullet list)',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({ name: 'tierNote', title: 'Tier note (optional)', type: 'string' }),
    defineField({ name: 'orderRank', title: 'Order rank', type: 'string' }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'stepNumber' },
    prepare: ({ title, subtitle }) => ({
      title: `${subtitle != null ? `Step ${subtitle}: ` : ''}${title ?? ''}`,
    }),
  },
});
```

Create `studio/schemaTypes/processStep.ts` with the code above and register
`processStep` in `index.ts` in the reusable content collections section.

- [ ] Create `studio/schemaTypes/processPage.ts`.
- [ ] Create `studio/schemaTypes/processStep.ts` (if not present; grep first).
- [ ] Register both in `studio/schemaTypes/index.ts`.

---

### B2.5 Update `src/lib/queries.ts` — per-page query functions

**`getHomePage()`** — replace the existing function body with a simpler query
that fetches only SEO fields + the `pageBuilder` array (via
`sectionsProjection()`). The flat content fields (heroEyebrow, etc.) are no
longer needed by the route after conversion; they remain on the document
(hidden) but do not need to be projected.

```ts
export async function getHomePage() {
  return sanityFetch(`*[_type == "homePage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    ${sectionsProjection('pageBuilder')}
  }`, {}, null);
}
```

**`getAboutPage()`** — same pattern:

```ts
export async function getAboutPage() {
  return sanityFetch(`*[_type == "aboutPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    ${sectionsProjection('pageBuilder')}
  }`, {}, null);
}
```

**`getServicesPage()`** — same pattern:

```ts
export async function getServicesPage() {
  return sanityFetch(`*[_type == "servicesPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    ${sectionsProjection('pageBuilder')}
  }`, {}, null);
}
```

**ADD `getProcessPage()`** — new function:

```ts
// ---- Process page -----------------------------------------------------------

export async function getProcessPage() {
  return sanityFetch(`*[_type == "processPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    ${sectionsProjection('pageBuilder')}
  }`, {}, null);
}
```

Note: `siteSettings.satisfactionGuarantee` is no longer fetched at the page
level — it is now resolved inside `sectionsProjection()` for any
`guaranteeSection` block. The `siteSettings` fetch stays (needed for header /
footer / visibility toggles), but its fields are trimmed of any that were only
consumed by these four pages' section data.

- [ ] Edit `src/lib/queries.ts`: replace `getHomePage`, `getAboutPage`,
  `getServicesPage` bodies with the compact versions above.
- [ ] Add `getProcessPage()` after `getServicesPage()`.

---

### B2.6 Convert `src/pages/index.astro`

Replace the hardcoded section markup entirely. The new route:
- Fetches `page` (from `getHomePage()` — now returns `pageBuilder`),
  `siteSettings`, and `pressItems` (press strip is still a legacy section that
  can be added via a general block if desired; drop it from the hardcoded
  layout here).
- Derives `title` and `description` from SEO fields.
- Renders via `<SectionRenderer sections={page?.pageBuilder ?? []} idPrefix="home" />`.

The `import` list shrinks to just layout + query + SectionRenderer imports.
All the per-section component imports are removed (they are now loaded inside
`SectionRenderer`). Keep `getSiteSettings`, `getPressItems` imports and the
`getSectionVisibility` call if needed for features outside SectionRenderer
(e.g., header features). The `visible` object from `getSectionVisibility` is
no longer used by section rendering here since all visibility is expressed
via the `pageBuilder` array being populated or not.

```astro
---
// Safe to edit by hand for copy + structure changes.
// Home page — section-driven via pageBuilder.
// Edit sections and order in Sanity Studio under the Home Page document.

import BaseLayout from '@/layouts/BaseLayout.astro';
import SectionRenderer from '@/components/SectionRenderer.astro';
import { getHomePage, getSiteSettings } from '@/lib/queries';
import { site } from '@/data/site';

const [page, siteSettings] = await Promise.all([
  getHomePage().catch(() => null),
  getSiteSettings().catch(() => null),
]);

const title       = page?.seoTitle       ?? site.name;
const description = page?.seoDescription ?? 'Your tagline goes here.';
---

<BaseLayout {title} {description} {siteSettings} seoImage={page?.seoImage}>
  <SectionRenderer sections={page?.pageBuilder ?? []} idPrefix="home" />
</BaseLayout>
```

- [ ] Replace `src/pages/index.astro` with the content above.

---

### B2.7 Convert `src/pages/about.astro`

Same replacement pattern:

```astro
---
// Safe to edit by hand for copy + structure changes.
// About page — section-driven via pageBuilder.
// Edit sections and order in Sanity Studio under the About Page document.

import BaseLayout from '@/layouts/BaseLayout.astro';
import SectionRenderer from '@/components/SectionRenderer.astro';
import { getAboutPage, getSiteSettings } from '@/lib/queries';
import { breadcrumbSchema } from '@/lib/schemas';
import { site } from '@/data/site';

const [page, siteSettings] = await Promise.all([
  getAboutPage().catch(() => null),
  getSiteSettings().catch(() => null),
]);

const title       = page?.seoTitle       ?? `About · ${site.name}`;
const description = page?.seoDescription ?? `Meet the designer behind ${site.name}.`;

const schemas = [
  breadcrumbSchema([
    { name: 'Home', url: site.url },
    { name: 'About', url: `${site.url}/about` },
  ]),
];
---

<BaseLayout {title} {description} {schemas} {siteSettings} seoImage={page?.seoImage}>
  <SectionRenderer sections={page?.pageBuilder ?? []} idPrefix="about" />
</BaseLayout>
```

- [ ] Replace `src/pages/about.astro` with the content above.

---

### B2.8 Convert `src/pages/services.astro`

The services page currently has a `serviceListSchema` JSON-LD injection.
Keep that functionality by fetching the service list separately for structured
data, while the visual content renders through `SectionRenderer`. The
`serviceListSchema` function takes a services array — this still needs a query.
Either keep a separate `getServicesPage()` that fetches services for JSON-LD
only, or inline a GROQ call. The cleanest approach is to add a standalone
service list query for structured data:

Add to `queries.ts`:
```ts
// Minimal service list for JSON-LD on the services page.
export async function getServiceListForSchema() {
  return sanityFetch(`*[_type == "service"] | order(orderRank asc, displayOrder asc){
    _id, name, slug, shortDescription, price, priceNumeric
  }`, {}, []);
}
```

Then the route:

```astro
---
// Safe to edit by hand for copy + structure changes.
// Services page — section-driven via pageBuilder.
// Edit sections and order in Sanity Studio under the Services Page document.

import BaseLayout from '@/layouts/BaseLayout.astro';
import SectionRenderer from '@/components/SectionRenderer.astro';
import { getServicesPage, getSiteSettings, getServiceListForSchema } from '@/lib/queries';
import { breadcrumbSchema, serviceListSchema } from '@/lib/schemas';
import { site } from '@/data/site';

const [page, siteSettings, servicesForSchema] = await Promise.all([
  getServicesPage().catch(() => null),
  getSiteSettings().catch(() => null),
  getServiceListForSchema().catch(() => []),
]);

const title       = page?.seoTitle       ?? `Services & Pricing · ${site.name}`;
const description = page?.seoDescription ?? 'Design services for every space and stage.';

const schemas = [
  breadcrumbSchema([
    { name: 'Home', url: site.url },
    { name: 'Services', url: `${site.url}/services` },
  ]),
  serviceListSchema(servicesForSchema),
];
---

<BaseLayout {title} {description} {schemas} {siteSettings} seoImage={page?.seoImage}>
  <SectionRenderer sections={page?.pageBuilder ?? []} idPrefix="services" />
</BaseLayout>
```

- [ ] Add `getServiceListForSchema()` to `src/lib/queries.ts`.
- [ ] Replace `src/pages/services.astro` with the content above.

---

### B2.9 Create `src/pages/process.astro` (NEW FILE)

The starter has no process page. Create it:

```astro
---
// Safe to edit by hand for copy + structure changes.
// Process page — section-driven via pageBuilder.
// Edit sections and order in Sanity Studio under the Process Page document.

import BaseLayout from '@/layouts/BaseLayout.astro';
import SectionRenderer from '@/components/SectionRenderer.astro';
import { getProcessPage, getSiteSettings } from '@/lib/queries';
import { breadcrumbSchema } from '@/lib/schemas';
import { site } from '@/data/site';

const [page, siteSettings] = await Promise.all([
  getProcessPage().catch(() => null),
  getSiteSettings().catch(() => null),
]);

const title       = page?.seoTitle       ?? `Our Process · ${site.name}`;
const description = page?.seoDescription ?? 'How we work, from first call to final reveal.';

const schemas = [
  breadcrumbSchema([
    { name: 'Home', url: site.url },
    { name: 'Process', url: `${site.url}/process` },
  ]),
];
---

<BaseLayout {title} {description} {schemas} {siteSettings} seoImage={page?.seoImage}>
  <SectionRenderer sections={page?.pageBuilder ?? []} idPrefix="process" />
</BaseLayout>
```

- [ ] Create `src/pages/process.astro` with content above.

---

### B2.10 Extend `scripts/seed-core.mjs` with pageBuilder arrays

Extend the existing `docs.push(...)` blocks for `homePage`, `aboutPage`, and
`servicesPage` to include a `pageBuilder` field. Add a new `processPage`
document and new `processStep` documents.

**Pattern for `_key` generation in sections:** each section block needs a
`_key`. Use the existing `key()` helper from the seed file.

**homePage seed addition** — append `pageBuilder` to the existing homePage
`docs.push` object (the one with `_id: 'homePage'`):

```js
pageBuilder: [
  {
    _type: 'heroSection',
    _key: key(),
    eyebrow: 'Welcome.',
    headline: 'Design That Feels Like You.',
    subhead: 'We help people create spaces that work as hard as they do and feel good to come home to.',
    size: 'tall',
    primaryCta: cta('Start a Conversation', '/contact'),
    secondaryCta: cta('See Our Work', '/portfolio'),
  },
  {
    _type: 'founderSection',
    _key: key(),
    eyebrow: 'Meet the Founder.',
    headline: 'Good design starts with a real conversation.',
    content: [
      pt('Every project starts the same way: a conversation about how you actually use your space, not just how you want it to look.'),
      pt('Replace this placeholder with your own story. Tell visitors who you are, what drives your work, and why they should trust you with their home.'),
    ],
    cta: cta('Learn More About the Studio', '/about'),
  },
  {
    _type: 'testimonialsSection',
    _key: key(),
    eyebrow: 'Kind Words.',
    headline: 'Words from real clients.',
    subhead: 'The part that matters most: how it felt to work together.',
    testimonialsToShow: [
      { _type: 'reference', _key: key(), _ref: 'testimonial-1' },
      { _type: 'reference', _key: key(), _ref: 'testimonial-2' },
      { _type: 'reference', _key: key(), _ref: 'testimonial-3' },
    ],
  },
  {
    _type: 'processSection',
    _key: key(),
    eyebrow: 'How It Works.',
    headline: 'A clear process, start to finish.',
    subhead: 'No guesswork and no pressure. You will always know exactly where things stand.',
    variant: 'preview',
    cta: cta('See the Full Process', '/process'),
  },
  {
    _type: 'servicesGridSection',
    _key: key(),
    eyebrow: 'The Studio.',
    headline: 'Design Services for Every Space.',
    subhead: 'Whether you need a fresh set of eyes or a full room overhaul, there is a tier for you.',
    cta: cta('See All Services', '/services'),
    footnote: 'Final pricing is always discussed before any work begins.',
    variant: 'grid',
  },
  {
    _type: 'serviceAreaSection',
    _key: key(),
    eyebrow: 'Service Area.',
    headline: 'Where We Work.',
    description: 'We serve the greater metro area and surrounding region. Travel fees for out-of-area projects are always quoted upfront.',
    showTravelFees: true,
  },
  {
    _type: 'ctaBandSection',
    _key: key(),
    eyebrow: 'Ready to Begin?',
    headline: 'Ready to Love Your Space?',
    subhead: "Let's start with a conversation.",
    cta: cta('Start a Conversation', '/contact'),
  },
],
```

**aboutPage seed addition** — append `pageBuilder` to the existing aboutPage doc:

```js
pageBuilder: [
  {
    _type: 'heroSection',
    _key: key(),
    eyebrow: 'The Designer.',
    headline: 'People Hire People.',
    subhead: "Here's who you'd be working with.",
    size: 'short',
  },
  {
    _type: 'storySection',
    _key: key(),
    eyebrow: 'My Story.',
    headline: 'Why I Started This Studio.',
    content: [
      pt('Replace this with your real origin story. Tell visitors what led you to design, what you noticed was missing, and what you set out to do differently.'),
    ],
    attribution: 'Your Name, Founder',
    credentialLine: 'Your credentials or training in one plain sentence.',
    serviceAreaLine: 'Based in Your City, serving the surrounding region.',
  },
  {
    _type: 'valuesSection',
    _key: key(),
    eyebrow: 'How We Work.',
    headline: 'Three principles that guide every project.',
  },
  {
    _type: 'statSection',
    _key: key(),
    stats: [
      { _type: 'statItem', _key: key(), number: 5, suffix: '+', label: 'Years in Business' },
      { _type: 'statItem', _key: key(), number: 50, suffix: '+', label: 'Projects Completed' },
      { _type: 'statItem', _key: key(), number: 100, suffix: '%', label: 'Client Satisfaction' },
    ],
  },
  {
    _type: 'ctaBandSection',
    _key: key(),
    eyebrow: "Let's Work Together.",
    headline: 'Ready to Start?',
    subhead: 'Send a message and we will be back in touch within two business days.',
    cta: cta('Get in Touch', '/contact'),
  },
],
```

**servicesPage seed addition** — append `pageBuilder`:

```js
pageBuilder: [
  {
    _type: 'heroSection',
    _key: key(),
    eyebrow: 'What We Offer.',
    headline: 'Design Services for Every Space and Stage.',
    subhead: 'Whether you need a fresh perspective or want to hand the whole project over, there is a service for you.',
    size: 'short',
  },
  {
    _type: 'servicesGridSection',
    _key: key(),
    eyebrow: 'The Tiers.',
    headline: 'Find the right fit.',
    subhead: 'Each service is priced to match the scope. Everything is discussed before any work begins.',
    variant: 'list',
  },
  {
    _type: 'serviceAreaSection',
    _key: key(),
    eyebrow: 'Service Area.',
    headline: 'Based Locally, Available Regionally.',
    description: 'We serve the greater metro area and surrounding region. Travel fees are quoted upfront.',
    showTravelFees: true,
  },
  {
    _type: 'guaranteeSection',
    _key: key(),
  },
  {
    _type: 'ctaBandSection',
    _key: key(),
    eyebrow: "Let's Talk.",
    headline: 'Not sure which service is right?',
    subhead: 'Send a message with a few details about your space. We will point you toward the best fit.',
    cta: cta('Start a Conversation', '/contact'),
  },
],
```

**New processPage document** — add after the servicesPage block:

```js
// ── processPage singleton ─────────────────────────────────────────────────
docs.push({
  _id: 'processPage',
  _type: 'processPage',
  seoTitle: 'Our Process - Studio Starter Interior Design',
  seoDescription: 'From the first conversation to the final reveal, here is exactly how our process works.',

  pageBuilder: [
    {
      _type: 'heroSection',
      _key: key(),
      eyebrow: 'The Process.',
      headline: 'From First Call to Final Reveal.',
      subhead: 'A clear, pressure-free process from the first inquiry through installation day.',
      size: 'short',
    },
    {
      _type: 'processSection',
      _key: key(),
      variant: 'full',
    },
    {
      _type: 'ctaBandSection',
      _key: key(),
      eyebrow: 'Ready to Begin?',
      headline: 'Start the Conversation.',
      subhead: 'Fill out the contact form with a few details about your space.',
      cta: cta('Get in Touch', '/contact'),
    },
  ],
});
```

**New processStep documents** — add after processPage:

```js
// ── processStep collection (4 steps) ──────────────────────────────────────
docs.push({
  _id: 'process-step-1',
  _type: 'processStep',
  stepNumber: 1,
  title: 'Initial Inquiry',
  timeEstimate: '2 business days',
  shortDescription: 'Fill out the contact form with a few details about your project. We review every inquiry personally and reply within two business days.',
  features: [
    'Tell us about your space',
    'Share your goals and timeline',
    'We respond personally, no automated sequences',
  ],
  orderRank: 'a0',
});

docs.push({
  _id: 'process-step-2',
  _type: 'processStep',
  stepNumber: 2,
  title: 'Discovery Call',
  timeEstimate: '20 minutes',
  shortDescription: 'A short call to talk through your project, figure out which service is the best fit, and answer any questions before we start.',
  features: [
    'Review your goals and budget',
    'Determine the right service tier',
    'No pressure, just a conversation',
  ],
  orderRank: 'a1',
});

docs.push({
  _id: 'process-step-3',
  _type: 'processStep',
  stepNumber: 3,
  title: 'Design & Sourcing',
  timeEstimate: '2 to 3 weeks',
  shortDescription: 'We build your concept, source every piece, and hand you a complete plan you can act on.',
  features: [
    'In-home session to assess the space',
    'Concept board with color story',
    'Full sourcing list with links and pricing',
    'Furniture layout to scale',
  ],
  orderRank: 'a2',
});

docs.push({
  _id: 'process-step-4',
  _type: 'processStep',
  stepNumber: 4,
  title: 'Installation & Reveal',
  timeEstimate: 'One day',
  shortDescription: 'We coordinate delivery, direct placement, and add the final styling details. You walk in at the end of the day to a finished room.',
  features: [
    'Delivery and placement coordination',
    'Final styling',
    'Walkthrough and care notes',
  ],
  orderRank: 'a3',
});
```

- [ ] Edit `scripts/seed-core.mjs`: add `pageBuilder` arrays to homePage,
  aboutPage, and servicesPage `docs.push` calls.
- [ ] Add processPage `docs.push` block.
- [ ] Add 4 processStep `docs.push` blocks.

---

### B2.11 Run all gates

- [ ] `npm run typegen` — clean.
- [ ] `npm --prefix studio run build` — clean (validates processPage schema,
  richSections registration, etc.).
- [ ] `npm run build` — clean. The new routes (process.astro) must generate
  static HTML successfully. Because process.astro calls `getProcessPage()` which
  requires a Sanity dataset, it will gracefully fall back to an empty
  `pageBuilder` array (i.e., a blank page between header and footer) when no
  dataset is connected. This is expected behavior for a template repo and is not
  a build failure.
- [ ] `npm run test` — 22 tests pass.

---

## Phase B Exit Criteria

All of the following must be true before Phase B is considered complete:

1. `npm run build` completes without TypeScript errors or Astro build failures.
2. `npm run typegen` completes without errors and `src/lib/sanity.types.ts` is
   committed alongside every schema change.
3. `npm run test` reports 22 passing tests (16 original + 6 new Phase B tests).
4. `npm --prefix studio run build` completes without errors (validates all 8 new
   object types, processPage singleton, and processStep document type are
   correctly registered and valid).
5. `studio/schemaTypes/richSections.ts` exists and exports all 8 types plus the
   4 per-page curated lists.
6. All 8 new Astro components exist in `src/components/sections/` with the
   correct component names.
7. `SectionRenderer.astro` has import lines and `_type` branches for all 8 new
   types.
8. `sectionCadence.ts` `SELF_CONTAINED_TYPES` contains 5 new types and
   `CONTENT_TYPES` contains 3 new types.
9. `homePage.ts`, `aboutPage.ts`, `servicesPage.ts` each have a `pageBuilder`
   field as the first field, with the correct per-page `of:` type list, and all
   existing non-SEO content fields marked `hidden: true, readOnly: true`.
10. `processPage.ts` and `processStep.ts` exist and are registered in `index.ts`.
11. `src/pages/process.astro` exists and renders via `<SectionRenderer>`.
12. `src/pages/index.astro`, `about.astro`, `services.astro` each render only
    via `<SectionRenderer sections={page?.pageBuilder ?? []} />` with no
    hardcoded section markup remaining.
13. `scripts/seed-core.mjs` includes `pageBuilder` arrays on homePage, aboutPage,
    servicesPage, and processPage; and 4 processStep documents.
14. Playwright screenshots (deferred until a Sanity dataset is connected): each
    page renders without blank sections after `node scripts/seed-core.mjs` is
    run against a real dataset. The screenshot pass is documented in the Phase B
    PR description as "deferred pending dataset connection" and is a required
    gate before Phase B is merged to `main`.

---

## B1/B2 stage split note

This plan is sized to run as two stages in one session. B1 (schema +
components + cadence) can be committed and verified independently before B2
(page conversion) begins. If execution is interrupted, the commit after B1
leaves the repo in a valid state: new section types registered and testable,
existing page routes unchanged. B2 then converts the routes in a second commit.

Total estimated line count for this plan: approximately 860 lines.

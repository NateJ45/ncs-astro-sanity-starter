# Phase A — Page-Builder Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port Reid Design's page-builder system into the starter, genericized and stripped of Reid-specific content. Deliver the 9-block section library, `SectionRenderer`, the custom `page` document type, the `[slug].astro` route with reserved-slug guard, the `businessInfo` singleton split from `siteSettings`, the `getSiteSettings()` merge, and all GROQ projection helpers. Exit with a clean `npm run build` and committed regenerated types.

**Architecture:** Sanity v5 Studio defines typed block objects registered in `schemaTypes/index.ts`. `SectionRenderer.astro` maps `_type` values to components, owns the alternating surface cadence, and inserts `SectionDivider` between adjacent content blocks of differing surface. Surface-cadence logic is extracted to `src/lib/sectionCadence.ts` for unit-testing. Reserved-slug logic is extracted to `src/lib/reservedSlugs.ts` for unit-testing. Both are `node --test` unit tests. Everything else is verified via `npm run typegen`, `npm run build`, and Playwright screenshots (four configs: mobile 390px + desktop 1280px, light + dark).

**Tech Stack:** Astro 6.3.8, Sanity v5 (starter pin — do NOT upgrade to v6 in this phase, see Task 0 note), Tailwind 4, TypeScript strict, Cloudflare Workers

---

## Pre-work context: key divergences between Reid source and the starter

Read these before starting. They drive specific decisions in the tasks below.

**Sanity v5 vs v6.** The starter's `studio/package.json` pins `sanity: "^5.28.0"`. Reid Design runs v6 (`sanity: "^6.0.0"`). The `defineType` / `defineField` / `defineArrayMember` schema API is compatible between v5 and v6 — the schema files can be copied verbatim. The `@sanity/orderable-document-list` version differs (`^1.5.1` in starter vs `^2.0.0` in Reid), but Phase A does not use that plugin. Do NOT upgrade the studio to v6 in this phase — that is a separate decision with broader testing consequences.

**`getSiteSettings()` client call pattern.** The starter's `queries.ts` uses `sanityFetch(query, params, fallback)` — the three-argument guarded wrapper from `src/lib/sanity.ts`. Reid's `queries.ts` uses `client.fetch(query)` directly. Every new or modified query function in the starter must use `sanityFetch`, not `client.fetch`, to preserve the graceful empty-state behavior on unconfigured clones.

**`siteSettings` still holds `availabilityStatus`, `serviceAreas`, `travelFees`.** In Reid, those fields were moved off `siteSettings` into `businessInfo`, and `getSiteSettings()` pulls them in via nested sub-queries. In the starter, `siteSettings` schema still carries those fields directly. Phase A adds the `businessInfo` singleton schema AND updates `getSiteSettings()` to also pull from `businessInfo`, but we mark the old `siteSettings` fields `hidden: true` (not deleted) for rollback safety — matching Reid's exact pattern.

**No `[slug].astro` exists in the starter yet.** The custom-page route is net-new. There is no existing file to conflict with.

**`SectionDivider.astro` in the starter has three variants: `'ornament'`, `'line'`, `'dots'`.** Reid's `SectionRenderer` collapses unknown values to `'ornament'`. The starter version must pass through all three spacer `variant` values correctly.

**`StatsRow.astro` prop interface.** The starter's `StatsRow` accepts `stats: StatItem[]` where `StatItem` has `{ number: number; suffix?: string; label: string }`. The Reid `statSection` schema emits `stats` as an array of `{ number, suffix, label }` items — identical shape. No interface change needed.

**`Hero.astro` prop interface in the starter** accepts `backgroundImages?: SanityImageObject[] | null` (slideshow) in addition to `backgroundImage` — a superset of what Reid's `heroSection` schema provides. The `SectionRenderer` passes only what the section has; the extra prop is optional and harmless.

**`FinalCta.astro` in the starter** accepts `secondaryCta` (optional). Reid's `ctaBandSection` schema does not have `secondaryCta` — only `cta`. Pass only the fields that exist on the block; the optional `secondaryCta` prop defaults to undefined.

**`spacerSection` variant wording.** Reid's schema has `{ title: 'Bronze ornament', value: 'ornament' }`. The starter has no brand association — rename the title to `'Accent ornament'` while keeping `value: 'ornament'` unchanged (so no data migration is needed).

**`additionalSectionsField` group dependency.** Reid uses `group: 'extra'` and notes "the page must declare an `extra` field group." In Phase A, `additionalSectionsField` is defined with `group: 'extra'` and the `page.ts` schema must declare that group. Core page schemas (servicesPage, aboutPage, etc.) that will use it in Phase B are out of scope for Phase A.

**Script names (root `package.json`):**
- `npm run typegen` → `npm --prefix studio run typegen` (runs `sanity schema extract && sanity typegen generate` in `studio/`)
- `npm run build` → `astro build`
- `npm run build:full` → `npm run typegen && astro build`
- `npm run studio:dev` → `npm --prefix studio run dev`
- No `test` script exists yet — Task 1 adds it.

---

## Task 0 — Create feature branch

**Files:** none (git only)

- [ ] From the starter repo root, create and check out a feature branch: `git checkout -b feature/phase-a-page-builder-core`
- [ ] Confirm the branch is clean with `git status`.

**Commit:** none (branch creation is not a commit)

---

## Task 1 — Add `node --test` setup and `test` script

**Purpose:** The surface-cadence classifier and reserved-slug helper are pure logic. They get real unit tests. The repo has no test runner yet; this task adds the minimum required.

**Files:**
- Modify: `package.json` (root) — add `"test"` script

- [ ] In the root `package.json` `scripts` block, add:
  ```json
  "test": "node --test src/lib/*.test.ts"
  ```
  Place it after the `"seed"` entry.
- [ ] Confirm `node --version` returns 22.x or higher (`node --test` with `.ts` requires Node 22+ with the experimental strip-types flag or a loader — see note below).

> **Note on TypeScript and `node --test`.** Node 22.6+ supports `--experimental-strip-types` for running `.ts` files directly. The test command should be:
> ```json
> "test": "node --experimental-strip-types --test src/lib/*.test.ts"
> ```
> If the Node version is 22.12+ (which the `engines` field requires), `--experimental-strip-types` is available. Add this flag.

- [ ] Update the `"test"` script value to:
  ```json
  "test": "node --experimental-strip-types --test src/lib/*.test.ts"
  ```
- [ ] Run `npm test` with no test files present yet — expect "no tests found" or a zero-exit, not a crash. If it errors on the glob (no `.test.ts` files), adjust to `"test": "node --experimental-strip-types --test"` and pass test files explicitly in the task steps that use it.

**Commit:** `chore: add node --test script for unit tests`

---

## Task 2 — Extract `reservedSlugs.ts` helper and unit-test it

**Purpose:** The reserved-slug set is shared between `studio/schemaTypes/page.ts` (Studio validation) and `src/pages/[slug].astro` (build-time filter). Extracting it to a shared helper prevents divergence. The starter source tree is TypeScript; the helper lives in `src/lib/`.

**Files:**
- Create: `src/lib/reservedSlugs.ts`
- Create: `src/lib/reservedSlugs.test.ts`

**`src/lib/reservedSlugs.ts`** — complete file:
```typescript
// Foundation, edit with care
// Single source of truth for reserved URL slugs — routes served by explicit
// Astro page files that a custom `page` document may not shadow.
//
// Used by:
//   - studio/schemaTypes/page.ts   (Studio slug validation rule)
//   - src/pages/[slug].astro       (getStaticPaths filter)
//
// Keep both consumers in sync: when adding a new page route (e.g., a new
// module), add its slug here so the page builder guard stays current.

export const RESERVED_SLUGS = new Set([
  'about',
  'services',
  'process',
  'portfolio',
  'faq',
  'contact',
  'journal',
  'e-design',
  'shop',
  'gift-certificates',
  'quiz',
  'calculator',
  'resources',
  'guides',
  'press',
  'privacy',
  '404',
  'sitemap-index.xml',
  'og',
  '_astro',
]);

/** Returns true when a slug collides with a built-in route. */
export function isReservedSlug(slug: string | undefined | null): boolean {
  if (!slug) return false;
  return RESERVED_SLUGS.has(slug);
}
```

**`src/lib/reservedSlugs.test.ts`** — complete file:
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isReservedSlug, RESERVED_SLUGS } from './reservedSlugs.ts';

test('isReservedSlug returns true for every known reserved slug', () => {
  for (const slug of RESERVED_SLUGS) {
    assert.equal(isReservedSlug(slug), true, `expected ${slug} to be reserved`);
  }
});

test('isReservedSlug returns false for a custom slug', () => {
  assert.equal(isReservedSlug('studio-tour'), false);
  assert.equal(isReservedSlug('my-portfolio'), false);
  assert.equal(isReservedSlug('team'), false);
});

test('isReservedSlug returns false for null and undefined', () => {
  assert.equal(isReservedSlug(null), false);
  assert.equal(isReservedSlug(undefined), false);
});

test('isReservedSlug is case-sensitive (slugs are lowercase by schema rule)', () => {
  assert.equal(isReservedSlug('About'), false);
  assert.equal(isReservedSlug('ABOUT'), false);
});
```

- [ ] Create `src/lib/reservedSlugs.ts` with the content above.
- [ ] Create `src/lib/reservedSlugs.test.ts` with the content above.
- [ ] Run `npm test -- src/lib/reservedSlugs.test.ts` (or `node --experimental-strip-types --test src/lib/reservedSlugs.test.ts`). Expected: all 4 tests pass, exit code 0.

**Commit:** `feat: add reservedSlugs helper with unit tests`

---

## Task 3 — Extract `sectionCadence.ts` helper and unit-test it

**Purpose:** The alternating surface logic is the behavioral core of the page builder. Extracting it makes the invariant testable and keeps `SectionRenderer.astro` as thin template glue.

**Files:**
- Create: `src/lib/sectionCadence.ts`
- Create: `src/lib/sectionCadence.test.ts`

**`src/lib/sectionCadence.ts`** — complete file:
```typescript
// Foundation, edit with care
// Surface-cadence classifier for the page builder.
//
// SectionRenderer.astro calls `classifySections()` to assign background surface
// classes before rendering. This module owns the classification logic so it can
// be unit-tested independently of the Astro component.
//
// Rules (from the spec):
//   Self-contained blocks: heroSection, ctaBandSection, statSection, spacerSection
//     — manage their own surface; do NOT participate in the alternating sequence.
//   Content blocks: richTextSection, imageTextSection, gallerySection,
//     quoteSection, videoSection
//     — assigned alternating 'background' / 'muted' surface in sequence.
//
// The leading-muted offset:
//   When the first block is a heroSection WITHOUT a backgroundImage (a "text
//   hero" — renders on the default bg-background surface), start the content
//   cadence at index 1 (muted) so the first content block contrasts rather
//   than blending into the hero. An image hero is dark, so the default
//   starting index 0 (background = light) already contrasts.

/** _type strings for blocks that manage their own surface. */
export const SELF_CONTAINED_TYPES = new Set([
  'heroSection',
  'ctaBandSection',
  'statSection',
  'spacerSection',
]);

/** _type strings for blocks that receive alternating surface assignment. */
export const CONTENT_TYPES = new Set([
  'richTextSection',
  'imageTextSection',
  'gallerySection',
  'quoteSection',
  'videoSection',
]);

export interface SectionBlock {
  _type: string;
  [key: string]: unknown;
}

export interface ClassifiedRow {
  block: SectionBlock;
  /** Assigned surface for content blocks; null for self-contained blocks. */
  surface: 'background' | 'muted' | null;
  /** Whether a SectionDivider should be inserted BEFORE this row. */
  insertDividerBefore: boolean;
  /** Generated heading id for accessible aria-labelledby. */
  headingId: string;
}

/**
 * Classify an array of section blocks into rows with surface assignments and
 * divider insertion markers.
 *
 * @param sections  Raw section array from Sanity (may contain nulls — filtered out).
 * @param idPrefix  Prefix for generated heading ids (default: 'section').
 */
export function classifySections(
  sections: unknown[],
  idPrefix = 'section',
): ClassifiedRow[] {
  const list = (sections ?? []).filter(
    (s): s is SectionBlock => !!s && typeof s === 'object' && '_type' in s,
  ) as SectionBlock[];

  // If the page opens with a text hero (no backgroundImage asset), start the
  // content cadence on muted so the first section contrasts.
  const first = list[0];
  const opensWithTextHero =
    first?._type === 'heroSection' &&
    !(first as Record<string, unknown>)?.backgroundImage;

  let contentIdx = opensWithTextHero ? 1 : 0;
  let prevContentSurface: 'background' | 'muted' | null = null;

  return list.map((block, i) => {
    let surface: 'background' | 'muted' | null = null;

    if (CONTENT_TYPES.has(block._type)) {
      surface = contentIdx % 2 === 0 ? 'background' : 'muted';
      contentIdx += 1;
    }

    // Insert a divider before this row when:
    //   - Both this and the previous content block are content blocks.
    //   - Their surfaces differ.
    // Self-contained blocks neither trigger nor suppress dividers between
    // adjacent content blocks.
    const insertDividerBefore =
      surface !== null &&
      prevContentSurface !== null &&
      surface !== prevContentSurface;

    if (surface !== null) {
      prevContentSurface = surface;
    }

    return {
      block,
      surface,
      insertDividerBefore,
      headingId: `${idPrefix}-${i}`,
    };
  });
}
```

**`src/lib/sectionCadence.test.ts`** — complete file:
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifySections, CONTENT_TYPES, SELF_CONTAINED_TYPES } from './sectionCadence.ts';

// Helpers
const block = (type: string, extra: Record<string, unknown> = {}) => ({ _type: type, ...extra });
const surfaces = (rows: ReturnType<typeof classifySections>) =>
  rows.map((r) => r.surface);
const dividers = (rows: ReturnType<typeof classifySections>) =>
  rows.map((r) => r.insertDividerBefore);

test('empty array returns empty rows', () => {
  assert.deepEqual(classifySections([]), []);
});

test('nulls and non-objects are filtered out', () => {
  const rows = classifySections([null, undefined, 42, block('richTextSection')]);
  assert.equal(rows.length, 1);
});

test('content blocks get alternating surface assignments starting at background', () => {
  const rows = classifySections([
    block('richTextSection'),
    block('imageTextSection'),
    block('gallerySection'),
  ]);
  assert.deepEqual(surfaces(rows), ['background', 'muted', 'background']);
});

test('self-contained blocks get null surface', () => {
  for (const type of SELF_CONTAINED_TYPES) {
    const rows = classifySections([block(type)]);
    assert.equal(rows[0].surface, null, `${type} should have null surface`);
  }
});

test('self-contained blocks do not advance the content cadence counter', () => {
  const rows = classifySections([
    block('richTextSection'),  // background (idx 0)
    block('heroSection'),      // null (self-contained, no counter advance)
    block('richTextSection'),  // muted (idx 1, counter was not reset)
  ]);
  assert.deepEqual(surfaces(rows), ['background', null, 'muted']);
});

test('text hero (no backgroundImage) shifts cadence to start at muted', () => {
  const rows = classifySections([
    block('heroSection'),      // text hero — no backgroundImage
    block('richTextSection'),  // should be muted (idx 1 start)
    block('imageTextSection'), // background (idx 2)
  ]);
  assert.deepEqual(surfaces(rows), [null, 'muted', 'background']);
});

test('image hero does not shift cadence', () => {
  const rows = classifySections([
    block('heroSection', { backgroundImage: { asset: { _ref: 'image-abc' } } }),
    block('richTextSection'),  // background (idx 0)
    block('imageTextSection'), // muted (idx 1)
  ]);
  assert.deepEqual(surfaces(rows), [null, 'background', 'muted']);
});

test('divider inserted between adjacent content blocks of differing surface', () => {
  const rows = classifySections([
    block('richTextSection'),  // background
    block('imageTextSection'), // muted -> divider before this
  ]);
  assert.deepEqual(dividers(rows), [false, true]);
});

test('no divider between two blocks with the same surface', () => {
  // Edge case: if the cadence somehow produces same-surface adjacency (e.g., after
  // a block type that resets), no divider. In practice this does not occur with the
  // standard alternating logic, but the rule should hold.
  const rows = classifySections([block('richTextSection')]);
  assert.deepEqual(dividers(rows), [false]);
});

test('no divider between content block and self-contained block', () => {
  const rows = classifySections([
    block('richTextSection'),  // background
    block('heroSection'),      // self-contained, no divider
    block('imageTextSection'), // muted, divider should appear before this (different surface from richText)
  ]);
  assert.deepEqual(dividers(rows), [false, false, true]);
});

test('headingId uses idPrefix and index', () => {
  const rows = classifySections([block('richTextSection'), block('quoteSection')], 'page');
  assert.equal(rows[0].headingId, 'page-0');
  assert.equal(rows[1].headingId, 'page-1');
});

test('unknown _type gets null surface (treated as unknown, not content)', () => {
  const rows = classifySections([block('unknownBlock')]);
  assert.equal(rows[0].surface, null);
});
```

- [ ] Create `src/lib/sectionCadence.ts` with the content above.
- [ ] Create `src/lib/sectionCadence.test.ts` with the content above.
- [ ] Run `node --experimental-strip-types --test src/lib/sectionCadence.test.ts`. Expected: all 11 tests pass, exit code 0.

**Commit:** `feat: add sectionCadence helper with unit tests`

---

## Task 4 — Port `studio/schemaTypes/sections.ts`

**Purpose:** Port the 9-block schema from Reid Design, genericizing all Reid-specific wording.

**Files:**
- Create: `studio/schemaTypes/sections.ts` (ported from `C:\Users\natha\Documents\Claude\Projects\ReidDesignAstro\reid-design-site\studio\schemaTypes\sections.ts`)

**Porting steps — copy the Reid source file to the target path, then apply exactly these edits:**

1. **File header comment (lines 1–13):** Replace:
   ```
   // The page-builder block library. Each block is a reusable "section" Staci can
   // add, reorder, and remove on a custom page (and, after the retrofit, on the
   // core pages too). Every block renders through an existing, hand-tuned site
   // component, so anything she builds matches the rest of the site automatically.
   ```
   With:
   ```
   // Foundation, edit with care
   // The page-builder block library. Each block is a reusable section that editors
   // can add, reorder, and remove on any page. Every block renders through a
   // site component in src/components/sections/, so anything built here matches
   // the rest of the site automatically.
   ```
   Keep the rest of the header comment (SectionRenderer paragraph, SECTION_TYPES paragraph) unchanged except remove "Staci" references — the SectionRenderer paragraph already says "no block has a 'background color' field: the renderer decides."

2. **`spacerSection` variant title (line 329):** Replace:
   ```
   { title: 'Bronze ornament', value: 'ornament' },
   ```
   With:
   ```
   { title: 'Accent ornament', value: 'ornament' },
   ```

3. **`quoteSection` detail field description (line 229):** Replace:
   ```
   description: 'Like "Fishers kitchen refresh" or "Plainfield, IN".'
   ```
   With:
   ```
   description: 'Context that adds credibility. Example: "Location" or "Project type".'
   ```

4. **`statSection` suffix description (line 257):** Replace:
   ```
   description: 'Like "+", "%", or "yrs".'
   ```
   With:
   ```
   description: 'Optional suffix after the number. Examples: "+", "%", "yrs".'
   ```

5. **`additionalSectionsField` description (lines 369–371):** Replace:
   ```
   description:
       'Optional. Add blocks from the library to the bottom of this page (a banner, a gallery, a call to action, and so on). Leave empty to keep the page exactly as it is.',
   ```
   With:
   ```
   description:
       'Optional. Add blocks from the library to the bottom of this page (a banner, a gallery, a call to action). Leave empty to keep the page exactly as it is.',
   ```

6. **Export comment for `additionalSectionsField` (lines 359–363):** Replace:
   ```
   // Reusable "extra sections" field for the app pages (portfolio, journal, faq,
   // contact, etc.) that keep their bespoke structure instead of the full marker
   // retrofit. Lets Staci append library blocks to the bottom of any of them. The
   // page must declare an `extra` field group. SectionRenderer renders the array;
   // general blocks are self-contained, so no extra page context is needed.
   ```
   With:
   ```
   // Reusable "extra sections" field for pages that keep their own structure but
   // want an append zone for library blocks. The consuming schema must declare an
   // `extra` field group. SectionRenderer renders the array; self-contained blocks
   // manage their own surface so no extra page context is needed.
   ```

7. **`heroSection` title (line 86):** No change needed — `'Hero (big page opener)'` is neutral.

8. **No other changes.** All field names, validation rules, icon imports, and `SECTION_TYPES`/`pageSectionSchemas` export structure remain identical to Reid.

- [ ] Copy the Reid source file to `studio/schemaTypes/sections.ts`.
- [ ] Apply edits 1–7 above (precise find/replace as written).
- [ ] Run `npm run typegen`. Expected: exits without TypeScript errors (the schema is object types, not documents, so it should extract cleanly even before registration).
- [ ] If typegen fails due to missing imports or unregistered types, note the error — it likely means `ctaBlock` needs to be registered first (see Task 7).

**Commit:** `feat: add page-builder sections schema (9 block types, genericized)`

---

## Task 5 — Create `studio/schemaTypes/businessInfo.ts`

**Purpose:** Split operational business facts off `siteSettings` into a separate singleton.

**Files:**
- Create: `studio/schemaTypes/businessInfo.ts` (ported from `C:\Users\natha\Documents\Claude\Projects\ReidDesignAstro\reid-design-site\studio\schemaTypes\businessInfo.ts`)

**Porting steps — copy the Reid source file, then apply these edits:**

1. **File header comment (lines 1–10):** Replace the entire header with:
   ```typescript
   // Foundation, edit with care
   // Content-side singleton. Business facts that change as the studio grows:
   // where you work, travel fees, availability, and the studio's map location.
   // These used to live on siteSettings; they moved here so Site Settings stays
   // identity + infrastructure and this document holds the operational data.
   // One instance only (id 'businessInfo'); singleton enforcement is in sanity.config.ts.
   //
   // IMPORTANT: the travelFees object type is named 'travelFeeTier' to match the
   // old siteSettings.travelFees member type, so data migrated from siteSettings
   // validates here without rework.
   ```

2. **`city` field `initialValue` and `description` (lines 29–34):** Replace:
   ```typescript
   initialValue: 'Plainfield',
   ```
   With:
   ```typescript
   initialValue: 'Your City',
   ```
   Replace the `description` with:
   ```
   'Your home-base city. Shows in the footer and feeds the business listing data search engines read (LocalBusiness addressLocality). Must match your Google Business Profile exactly. Only change it if you relocate.',
   ```

3. **`state` field `initialValue` (line 40):** Replace:
   ```typescript
   initialValue: 'IN',
   ```
   With:
   ```typescript
   initialValue: 'XX',
   ```

4. **`serviceRegion` field `initialValue` (line 48):** Replace:
   ```typescript
   initialValue: 'Greater Indianapolis',
   ```
   With:
   ```typescript
   initialValue: 'Your Metro Area',
   ```
   Replace the `description` with:
   ```
   'The broader area you serve, shown as "Serving {this}" in the footer. Example: "Greater Metro Area".',
   ```

5. **`geoLat` description (lines 101–103):** Replace:
   ```
   description: 'For local "near me" search. Plainfield center is about 39.7042. This goes into the business listing data that search engines read. Ask Nathan if you are unsure.',
   ```
   With:
   ```
   description: 'For local "near me" search. Your studio latitude coordinate. Find it in Google Maps by right-clicking your address. This feeds the business listing data that search engines read.',
   ```

6. **`geoLng` description (line 108):** Replace:
   ```
   description: 'For local "near me" search. Plainfield center is about -86.3994. Pairs with the latitude above.',
   ```
   With:
   ```
   description: 'For local "near me" search. Your studio longitude coordinate. Pairs with the latitude above.',
   ```

7. **`availabilityStatus` description (lines 94–98):** Replace:
   ```
   description:
         'Short status next to the green dot on the Contact page. Examples: "Accepting new clients" / "Booking for Fall 2026" / "Currently booked, accepting waitlist".',
   ```
   With (keep same field, update examples):
   ```
   description:
         'Short status shown on the Contact page. Examples: "Accepting new clients", "Booking for Fall 2026", "Currently full, accepting waitlist".',
   ```

8. **Options `canvasApp` line:** Keep as-is.

9. No other changes needed.

- [ ] Copy the Reid source file to `studio/schemaTypes/businessInfo.ts`.
- [ ] Apply edits 1–8 above.

**Commit:** (defer to Task 7 combined commit after registration)

---

## Task 6 — Create `studio/schemaTypes/page.ts`

**Purpose:** Port the multi-instance custom `page` document type with reserved-slug collision guard. Adapt to import from the shared helper instead of re-declaring RESERVED_SLUGS.

**Files:**
- Create: `studio/schemaTypes/page.ts`

> **Note on the shared `reservedSlugs.ts` import.** The Reid source hardcodes `RESERVED_SLUGS` directly in `page.ts`. The starter's `src/lib/reservedSlugs.ts` is the canonical source, but `studio/` is a separate TypeScript project (`studio/package.json`) with its own `tsconfig.json`. Importing from `../src/lib/reservedSlugs.ts` across the studio boundary may fail depending on the studio's tsconfig `paths` or `rootDir`. To be safe, the `page.ts` schema declares its own inline set and the plan notes that it should be kept in sync manually with `src/lib/reservedSlugs.ts`. This is the same pattern Reid uses.

Write the file from scratch based on the Reid source with these genericizing changes:

```typescript
// Foundation, edit with care
// Custom page — the document an editor creates to build a new page from the
// section block library, without touching code.
//
// Routed by src/pages/[slug].astro at /<slug>. Built-in route names are
// reserved so a custom page can never collide with a real page. NOT a singleton
// (editors make as many as they like), so it is deliberately kept out of the
// SINGLETON_TYPES sets in sanity.config.ts and structure.ts.
//
// Keep RESERVED_SLUGS in sync with src/lib/reservedSlugs.ts (both lists guard
// the same invariant; the Studio list shows a validation error, the Astro list
// filters getStaticPaths).

import { defineType, defineField } from 'sanity';
import { DocumentsIcon } from '@sanity/icons';
import { SECTION_TYPES } from './sections';

// Every built-in route segment. A custom page slug may not match any of these.
// Keep in sync with src/lib/reservedSlugs.ts.
const RESERVED_SLUGS = new Set([
  'about', 'services', 'process', 'portfolio', 'faq', 'contact', 'journal',
  'e-design', 'shop', 'gift-certificates', 'quiz', 'calculator', 'resources',
  'guides', 'press', 'privacy', '404', 'sitemap-index.xml', 'og', '_astro',
]);

export const page = defineType({
  name: 'page',
  title: 'Custom page',
  type: 'document',
  icon: DocumentsIcon,
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'extra', title: 'Extra sections' },
    { name: 'menu', title: 'Menu placement' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Page title',
      type: 'string',
      group: 'content',
      description: 'The name of this page (used for the menu link and the browser tab unless you set an SEO title).',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Web address',
      type: 'slug',
      group: 'content',
      description: 'The end of the address, like "studio-tour" for example.com/studio-tour. Click Generate to make one from the title.',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) =>
        Rule.required().custom((slug) => {
          const v = slug?.current;
          if (!v) return 'Add a web address (click Generate).';
          if (RESERVED_SLUGS.has(v)) return `"${v}" is already used by a built-in page. Pick a different address.`;
          if (!/^[a-z0-9-]+$/.test(v)) return 'Use only lowercase letters, numbers, and dashes.';
          return true;
        }),
    }),
    defineField({
      name: 'pageBuilder',
      title: 'Sections',
      type: 'array',
      group: 'content',
      description: 'Build the page by adding sections. Drag to reorder. Add as many as you like.',
      of: SECTION_TYPES,
    }),

    // ── Menu placement ────────────────────────────────────────────────────────
    defineField({
      name: 'addToMainNav',
      title: 'Show in the top menu',
      type: 'boolean',
      group: 'menu',
      initialValue: false,
      description: 'Off by default, so you can build and preview privately. Turn on when you want visitors to find it in the menu.',
    }),
    defineField({
      name: 'navGroup',
      title: 'Where in the top menu',
      type: 'string',
      group: 'menu',
      initialValue: 'top',
      hidden: ({ parent }) => !parent?.addToMainNav,
      options: {
        list: [
          { title: 'Its own menu item', value: 'top' },
          { title: 'Under "Services"', value: 'services' },
          { title: 'Under "Resources"', value: 'resources' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'navLabel',
      title: 'Menu label (optional)',
      type: 'string',
      group: 'menu',
      hidden: ({ parent }) => !parent?.addToMainNav,
      description: 'Shorter text for the menu, if the page title is long. Leave blank to use the title.',
    }),
    defineField({
      name: 'addToFooter',
      title: 'Show in the footer',
      type: 'boolean',
      group: 'menu',
      initialValue: false,
    }),

    // ── SEO ───────────────────────────────────────────────────────────────────
    defineField({
      name: 'seoTitle',
      title: 'SEO title',
      type: 'string',
      group: 'seo',
      description: 'Browser tab and search result title. Aim for 50 to 60 characters. Leave blank to use the page title.',
      validation: (Rule) => Rule.max(60).warning('Titles longer than about 60 characters get cut off in search results.'),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO description',
      type: 'text',
      rows: 3,
      group: 'seo',
      description: 'The sentence under the title in search results. Aim for 150 to 160 characters.',
      validation: (Rule) => Rule.max(160).warning('Descriptions longer than about 160 characters get cut off in search results.'),
    }),
    defineField({
      name: 'seoImage',
      title: 'Social share image',
      type: 'image',
      group: 'seo',
      description: 'Optional. Shown when this page is shared. Use a wide image, about 1200 by 630 pixels. Leave blank to use the site default.',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string' })],
    }),
  ],
  preview: {
    select: { title: 'title', slug: 'slug.current', inNav: 'addToMainNav' },
    prepare: ({ title, slug, inNav }) => ({
      title: title || 'Untitled page',
      subtitle: `/${slug ?? '...'}${inNav ? '  ·  in menu' : ''}`,
    }),
  },
});
```

**Key differences from Reid source:**
- Adds `{ name: 'extra', title: 'Extra sections' }` to `groups` (Reid has it too but the `additionalSectionsField` which uses it is defined separately in `sections.ts`).
- Slug description uses `"example.com/studio-tour"` not the Reid-specific domain.

- [ ] Create `studio/schemaTypes/page.ts` with the content above.

**Commit:** (defer to Task 7 combined commit after registration)

---

## Task 7 — Register schemas in `studio/schemaTypes/index.ts`

**Purpose:** Register `pageSectionSchemas`, `businessInfo`, and `page` alongside existing types.

**Files:**
- Modify: `studio/schemaTypes/index.ts`

Starting state of the file (from the read above): it registers `ctaBlock`, several singletons, and collections but has none of the new types.

- [ ] Add three imports at the top of the imports block (after the `ctaBlock` import, alphabetically):
  ```typescript
  import { businessInfo } from './businessInfo';
  import { page } from './page';
  import { pageSectionSchemas } from './sections';
  ```

- [ ] In `schemaTypes = [...]`, add the section schemas and new document types in the correct positions:

  After `ctaBlock,` add:
  ```typescript
  // Page-builder section blocks (objects). Registered before the documents
  // whose pageBuilder arrays reference them.
  ...pageSectionSchemas,
  ```

  After the `siteSettings,` singleton line, add:
  ```typescript
  businessInfo, // Content-side singleton: service areas, travel fees, availability, geo
  ```

  After the `journalEntry,` line (at the end of the collections block), add:
  ```typescript
  // Custom pages built from the section library (multi-instance, not a singleton)
  page,
  ```

- [ ] Run `npm run typegen`. Expected: `src/lib/sanity.types.ts` is regenerated with new types for `heroSection`, `richTextSection`, `imageTextSection`, `gallerySection`, `quoteSection`, `statSection`, `ctaBandSection`, `videoSection`, `spacerSection`, `businessInfo`, and `page`. No TypeScript errors.
- [ ] Run `npm run build`. Expected: clean build. (The schema types are now known; existing pages that don't yet use them are unaffected.)

**Commit:** `feat: register sections, businessInfo, and page schemas`

---

## Task 8 — Hide legacy `siteSettings` fields and update `getSiteSettings()`

**Purpose:** Mark the old `availabilityStatus`, `serviceAreas`, and `travelFees` fields on `siteSettings` as `hidden: true` (not deleted), and update `getSiteSettings()` in `src/lib/queries.ts` to pull those fields from `businessInfo` using nested sub-queries. Consumers (`Header.astro`, `Footer.astro`, pages) continue reading `siteSettings.serviceAreas` etc. unchanged.

**Files:**
- Modify: `studio/schemaTypes/siteSettings.ts` (lines 53–96: the `availabilityStatus`, `serviceAreas`, and `travelFees` fields)
- Modify: `src/lib/queries.ts` (the `getSiteSettings` function, lines 25–56)

### 8a — `siteSettings.ts`

For each of the three fields, add `hidden: true` and `readOnly: true` properties:

- [ ] In the `availabilityStatus` field definition (around line 49), add after the `validation` rule:
  ```typescript
  hidden: true,
  readOnly: true,
  ```

- [ ] In the `serviceAreas` field definition (around line 59), add after the `validation` rule:
  ```typescript
  hidden: true,
  readOnly: true,
  ```

- [ ] In the `travelFees` field definition (around line 67), add after the `validation` rule:
  ```typescript
  hidden: true,
  readOnly: true,
  ```

> These fields remain in the schema so existing data validates correctly and a rollback to the old pattern is possible without data loss. The `hidden: true` removes them from the Studio form; `readOnly: true` prevents accidental writes via API.

### 8b — `src/lib/queries.ts`

Replace the entire `getSiteSettings` function (currently lines 25–56) with:

```typescript
// ---- Site settings (used in BaseLayout / Header / Footer) -----------------
// availabilityStatus, serviceAreas, travelFees, city, state, serviceRegion,
// geoLat, and geoLng moved to the businessInfo singleton. Pulled in here under
// the same flat field names so Header / Footer / pages that read
// siteSettings.serviceAreas etc. keep working with no change; only the source
// document changed.

export async function getSiteSettings() {
  return sanityFetch(`*[_type == "siteSettings"][0]{
    title,
    tagline,
    email,
    phone,
    "availabilityStatus": *[_type == "businessInfo"][0].availabilityStatus,
    "serviceAreas": *[_type == "businessInfo"][0].serviceAreas,
    "travelFees": *[_type == "businessInfo"][0].travelFees,
    "geoLat": *[_type == "businessInfo"][0].geoLat,
    "geoLng": *[_type == "businessInfo"][0].geoLng,
    "city": *[_type == "businessInfo"][0].city,
    "state": *[_type == "businessInfo"][0].state,
    "serviceRegion": *[_type == "businessInfo"][0].serviceRegion,
    socialInstagram,
    socialFacebook,
    seoImage${IMAGE_PROJECTION},
    footerCredit,
    footerCreditUrl,
    newsletter,
    googleBusinessUrl,
    reviewsNote,
    satisfactionGuarantee,
    sectionVisibility{
      showPortfolio,
      showJournal,
      showShop,
      showEDesign,
      showGiftCertificates,
      showPress,
      showResources,
      showGuides,
      showStyleQuiz,
      showBudgetCalculator
    }
  }`, {}, null);
}
```

> **Note:** The starter's `getSiteSettings()` does NOT currently project `city`, `state`, `serviceRegion`, `geoLat`, `geoLng`, `satisfactionGuarantee`, `headerTagline`, `primaryCtaLabel`, `googleBusinessUrl`, or `reviewsNote`. These fields are projected in the Reid version but may not be in the starter schema. Add only the fields that exist in the starter's `siteSettings.ts` schema. After the diff: `headerTagline` and `primaryCtaLabel` do not appear in the starter's `siteSettings.ts` — omit them. All other fields in the projection above either already exist in the starter schema or are being added via `businessInfo`.

Also add `getBusinessInfo()` after `getSiteSettings`:

```typescript
// ---- Business info (service areas, travel, availability, geo) -------------
// Most consumers read these through getSiteSettings (flat names), but pages
// or blocks that need businessInfo directly can use this.
export async function getBusinessInfo() {
  return sanityFetch(`*[_type == "businessInfo"][0]{
    city,
    state,
    serviceRegion,
    serviceAreas,
    travelFees,
    availabilityStatus,
    geoLat,
    geoLng
  }`, {}, null);
}
```

- [ ] Apply edits to `studio/schemaTypes/siteSettings.ts` (add `hidden: true, readOnly: true` to the three fields).
- [ ] Apply the `getSiteSettings()` replacement and add `getBusinessInfo()` in `src/lib/queries.ts`.
- [ ] Run `npm run typegen`. Expected: clean.
- [ ] Run `npm run build`. Expected: clean.

**Commit:** `feat: businessInfo split — hide legacy siteSettings fields, merge in getSiteSettings()`

---

## Task 9 — Add GROQ projection helpers to `src/lib/queries.ts`

**Purpose:** Add `sectionsProjection()` (parameterized by field name), and expose `IMAGE_PROJECTION` and `CTA_PROJECTION` as named exports for use in custom-page and future page queries.

**Files:**
- Modify: `src/lib/queries.ts` — add `sectionsProjection` after the `CTA_PROJECTION` constant

The starter's `queries.ts` already defines `IMAGE_PROJECTION` and `CTA_PROJECTION` as module-level `const` strings (lines 12–21). They are currently module-private. Make them importable without changing their values.

- [ ] Change `const IMAGE_PROJECTION` to `export const IMAGE_PROJECTION` on its declaration line (currently line 12).
- [ ] Change `const CTA_PROJECTION` to `export const CTA_PROJECTION` on its declaration line (currently line 19).
- [ ] Insert the `sectionsProjection` function immediately after `CTA_PROJECTION` (before the `getSiteSettings` comment block):

```typescript
// Page-builder array projection. Spreads each block, then resolves the nested
// images and ctaBlocks inside the block types that carry them, so SectionRenderer
// gets ready-to-use data. Block types without images/ctas (text, quote, stats,
// video, spacer) pass through on the leading `...`.
//
// Parameterized by field name so it serves both `pageBuilder` (custom pages)
// and `additionalSections` (the flexible append zone on core pages).
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
    }
  }`;
}
```

- [ ] Also add the custom-page query functions at the bottom of the file. Insert them after the `getPressItems` function:

```typescript
// ---- Custom pages (page builder) ------------------------------------------

// One published custom page by slug, with its section array fully resolved.
export async function getPage(slug: string) {
  return sanityFetch(
    `*[_type == "page" && slug.current == $slug][0]{
      title,
      "slug": slug.current,
      seoTitle, seoDescription,
      seoImage${IMAGE_PROJECTION},
      ${sectionsProjection('pageBuilder')}
    }`,
    { slug },
    null,
  );
}

// Slugs of every published custom page, for getStaticPaths in [slug].astro.
export async function getAllPageSlugs(): Promise<string[]> {
  const list: Array<{ slug: string }> = await sanityFetch(
    `*[_type == "page" && defined(slug.current)]{ "slug": slug.current }`,
    {},
    [],
  );
  return list.map((p) => p.slug).filter(Boolean);
}

// Custom pages flagged to appear in the main nav and/or footer. Header.astro
// and Footer.astro can inject these alongside the built-in links.
export async function getNavPages() {
  return sanityFetch(`*[_type == "page" && defined(slug.current) && (addToMainNav == true || addToFooter == true)]{
    title,
    "slug": slug.current,
    navLabel,
    addToMainNav,
    navGroup,
    addToFooter
  }`, {}, []);
}
```

- [ ] Run `npm run typegen`. Expected: clean.
- [ ] Run `npm run build`. Expected: clean.

**Commit:** `feat: add sectionsProjection, getPage, getAllPageSlugs, getNavPages to queries.ts`

---

## Task 10 — Create section components under `src/components/sections/`

**Purpose:** Port the 5 content-section components from Reid Design. Self-contained blocks (`heroSection`, `ctaBandSection`, `statSection`, `spacerSection`) reuse `Hero.astro`, `FinalCta.astro`, `StatsRow.astro`, and `SectionDivider.astro` which already exist in the starter.

**Files:**
- Create: `src/components/sections/RichTextSection.astro`
- Create: `src/components/sections/ImageText.astro`
- Create: `src/components/sections/GalleryGrid.astro`
- Create: `src/components/sections/QuoteBlock.astro`
- Create: `src/components/sections/VideoEmbed.astro`

**For each file:** copy the Reid source file verbatim from `C:\Users\natha\Documents\Claude\Projects\ReidDesignAstro\reid-design-site\src\components\sections\<name>`, then apply the starter-specific import corrections below.

**Import corrections required in all 5 files:**

The Reid files import `SanityImage`, `PortableText`, `SectionHeading`, and `CtaLink` with the `@/components/` alias. The starter uses the same `@/` alias pointing to `src/`. No import path changes are needed — the aliases are identical.

**File-by-file notes:**

1. **`RichTextSection.astro`** — copy verbatim. The `PortableText` component is a React island (`src/components/PortableText.tsx` in Reid). Verify it exists in the starter before proceeding.

2. **`ImageText.astro`** — copy verbatim. Uses `SanityImage`, `PortableText`, `CtaLink`. All exist in the starter.

3. **`GalleryGrid.astro`** — copy verbatim. Uses `SanityImage` and `SectionHeading`. Both exist in the starter.

4. **`QuoteBlock.astro`** — copy verbatim. No external component imports. Uses only Tailwind utilities and inline markup.

5. **`VideoEmbed.astro`** — copy verbatim. Uses `SectionHeading`. Exists in the starter.

**Verification step (pre-commit):**

- [ ] Run `ls src/components/sections/` (via Glob tool) to confirm all 5 files are created.
- [ ] Run `npm run build`. Expected: clean. (No route uses the components yet, but TypeScript will catch any import errors.)
- [ ] Verify `PortableText` exists: `Glob('src/components/PortableText*')`. If it is missing from the starter, note it as a blocker for Task 11 rendering and raise it before committing. Do not invent a placeholder — halt and report.

**Commit:** `feat: add content section components (RichTextSection, ImageText, GalleryGrid, QuoteBlock, VideoEmbed)`

---

## Task 11 — Create `src/components/SectionRenderer.astro`

**Purpose:** The renderer that maps `_type` values to components, owns the surface cadence (via `sectionCadence.ts`), and inserts `SectionDivider` between differing adjacent content blocks.

**Files:**
- Create: `src/components/SectionRenderer.astro`

Write this file from scratch (it cannot be copied verbatim because it must use `classifySections` from Task 3 and must handle the starter's `SectionDivider` `'dots'` variant):

```astro
---
// Foundation, edit with care
// Renders a page-builder section array. Maps each block _type to its component
// and OWNS the alternating background cadence for content blocks, so reordering
// can never break the page rhythm (that is why blocks have no color field).
// Self-contained blocks (hero, CTA band, stats, spacer) manage their own surface.
//
// Cadence logic lives in src/lib/sectionCadence.ts and is unit-tested separately.
// This file is thin template glue: it imports classified rows and delegates.
//
// The GROQ query that loads `sections` must project images with imageProjection
// and ctaBlocks with ctaProjection (see sectionsProjection() in queries.ts).
import Hero from '@/components/Hero.astro';
import FinalCta from '@/components/FinalCta.astro';
import StatsRow from '@/components/StatsRow.astro';
import SectionDivider from '@/components/SectionDivider.astro';
import RichTextSection from '@/components/sections/RichTextSection.astro';
import ImageText from '@/components/sections/ImageText.astro';
import GalleryGrid from '@/components/sections/GalleryGrid.astro';
import QuoteBlock from '@/components/sections/QuoteBlock.astro';
import VideoEmbed from '@/components/sections/VideoEmbed.astro';
import { classifySections } from '@/lib/sectionCadence';

interface Props {
  sections?: unknown[];
  /** Prefix for generated heading ids, so two renderers on a page do not collide. */
  idPrefix?: string;
}

const { sections = [], idPrefix = 'section' } = Astro.props as Props;
const rows = classifySections(sections, idPrefix);
---

{rows.map(({ block: s, surface, insertDividerBefore, headingId }) => (
  <>
    {insertDividerBefore && <SectionDivider />}

    {s._type === 'heroSection' ? (
      <Hero
        eyebrow={s.eyebrow as string | undefined}
        headline={(s.headline as string) ?? ''}
        subhead={s.subhead as string | undefined}
        backgroundImage={s.backgroundImage as any}
        primaryCta={s.primaryCta as any}
        secondaryCta={s.secondaryCta as any}
        scriptAccent={s.scriptAccent as string | undefined}
        size={(s.size as 'tall' | 'short') ?? 'short'}
        headingId={headingId}
      />
    ) : s._type === 'ctaBandSection' ? (
      <FinalCta
        eyebrow={s.eyebrow as string | undefined}
        headline={s.headline as string | undefined}
        subhead={s.subhead as string | undefined}
        cta={s.cta as any}
        scriptAccent={s.scriptAccent as string | undefined}
        backgroundImage={s.backgroundImage as any}
        headingId={headingId}
      />
    ) : s._type === 'statSection' ? (
      <StatsRow
        stats={((s.stats ?? []) as any[]).filter(
          (x: any) => typeof x?.number === 'number',
        )}
      />
    ) : s._type === 'spacerSection' ? (
      s.variant === 'space' ? (
        <div class="py-section-md" aria-hidden="true"></div>
      ) : (
        <SectionDivider
          variant={
            s.variant === 'line' ? 'line'
            : s.variant === 'dots' ? 'dots'
            : 'ornament'
          }
        />
      )
    ) : s._type === 'richTextSection' ? (
      <RichTextSection
        eyebrow={s.eyebrow as string | undefined}
        heading={s.heading as string | undefined}
        scriptAccent={s.scriptAccent as string | undefined}
        body={s.body as any}
        width={s.width as 'normal' | 'narrow' | undefined}
        align={s.align as 'left' | 'center' | undefined}
        surface={surface ?? 'background'}
        headingId={headingId}
      />
    ) : s._type === 'imageTextSection' ? (
      <ImageText
        image={s.image as any}
        imageSide={s.imageSide as 'left' | 'right' | undefined}
        eyebrow={s.eyebrow as string | undefined}
        heading={s.heading as string | undefined}
        body={s.body as any}
        cta={s.cta as any}
        surface={surface ?? 'background'}
        headingId={headingId}
      />
    ) : s._type === 'gallerySection' ? (
      <GalleryGrid
        heading={s.heading as string | undefined}
        images={s.images as any[]}
        columns={s.columns as number | undefined}
        surface={surface ?? 'background'}
        headingId={headingId}
      />
    ) : s._type === 'quoteSection' ? (
      <QuoteBlock
        quote={s.quote as string | undefined}
        attribution={s.attribution as string | undefined}
        detail={s.detail as string | undefined}
        surface={surface ?? 'background'}
      />
    ) : s._type === 'videoSection' ? (
      <VideoEmbed
        url={s.url as string | undefined}
        heading={s.heading as string | undefined}
        caption={s.caption as string | undefined}
        surface={surface ?? 'background'}
        headingId={headingId}
      />
    ) : (
      // Unknown block type: render nothing, log in dev.
      import.meta.env.DEV && console.warn(`[SectionRenderer] Unknown block type: "${s._type}". Add a mapping in SectionRenderer.astro.`)
    )}
  </>
))}
```

> **Note on the `<>` fragment wrapper:** Astro `.astro` files support JSX-style fragments in `{}` map expressions when using Astro's template syntax. If TypeScript strict mode flags the fragment import, add `import { Fragment } from 'astro/jsx-runtime';` and use `<Fragment>` instead of `<>`.

> **Note on `console.warn` in template:** This pattern matches how Reid's renderer handles unknown types. The ternary ending in `console.warn` evaluates the function call at render time (no output rendered to DOM) and returns `undefined` which Astro ignores.

- [ ] Create `src/components/SectionRenderer.astro` with the content above.
- [ ] Run `npm run build`. Expected: clean. (No routes consume it yet.)
- [ ] Verify `src/lib/sectionCadence.ts` is correctly importable from the component (`@/lib/sectionCadence`). If the alias is not configured for this import, check `tsconfig.json` `paths` — the `@/` alias should point to `src/` for both `.astro` and `.ts` imports.

**Commit:** `feat: add SectionRenderer (maps section types to components, owns surface cadence)`

---

## Task 12 — Create `src/pages/[slug].astro` (custom page route)

**Purpose:** Route all custom `page` documents to their URL. Reserved slugs are filtered inside `getStaticPaths`.

**Files:**
- Create: `src/pages/[slug].astro`

> **Note on file name.** The Reid source uses `[slug].astro` (single dynamic segment). This is correct for the starter too — no rest parameter needed. Astro's explicit page files (`about.astro`, etc.) take precedence over dynamic segments for their exact paths, so a custom page slug of `about` would not match even without the filter. The filter is still required as a belt-and-suspenders guard.

> **Note on `breadcrumbSchema`.** The starter's `src/lib/schemas.ts` exports `breadcrumbSchema`. The import path in the starter is `@/lib/schemas` — confirmed present from the Grep above.

Write the file based on the Reid source, adapted for the starter's import patterns and `sanityFetch` calls:

```astro
---
// Custom pages built in the page builder. Generates one static page per
// published `page` document at /<slug>. Built-in routes (about.astro, etc.) are
// explicit files and take precedence. The schema blocks reserved slugs; the
// filter below is a second guard so a custom page can never shadow a real route.
//
// IMPORTANT: RESERVED must be defined INSIDE getStaticPaths. Astro's static
// build runs getStaticPaths in an isolated scope. A module-level import of
// the set from reservedSlugs.ts is NOT visible to the runtime at path-generation
// time due to Astro's static-build isolation. This is a known Astro gotcha
// documented in CLAUDE.md.
import BaseLayout from '@/layouts/BaseLayout.astro';
import SectionRenderer from '@/components/SectionRenderer.astro';
import { getPage, getAllPageSlugs, getSiteSettings } from '@/lib/queries';
import { breadcrumbSchema } from '@/lib/schemas';
import { site } from '@/data/site';

export async function getStaticPaths() {
  // Defined inside getStaticPaths: mirrors the page schema's reserved list so
  // a custom page can never shadow a built-in route. Keep in sync with
  // src/lib/reservedSlugs.ts (same set, duplicated by Astro isolation necessity).
  const RESERVED = new Set([
    'about', 'services', 'process', 'portfolio', 'faq', 'contact', 'journal',
    'e-design', 'shop', 'gift-certificates', 'quiz', 'calculator', 'resources',
    'guides', 'press', 'privacy', '404', 'sitemap-index.xml', 'og', '_astro',
  ]);
  const slugs = await getAllPageSlugs().catch(() => [] as string[]);
  return slugs
    .filter((slug) => !RESERVED.has(slug))
    .map((slug) => ({ params: { slug } }));
}

const { slug } = Astro.params;
const [pageDoc, siteSettings] = await Promise.all([
  getPage(slug as string).catch(() => null),
  getSiteSettings().catch(() => null),
]);

if (!pageDoc) return Astro.redirect('/404');

const title = (pageDoc as any).seoTitle ?? (pageDoc as any).title ?? site.name;
const description = (pageDoc as any).seoDescription ?? '';
const seoImage = (pageDoc as any).seoImage ?? undefined;

const schemas = [
  breadcrumbSchema([
    { name: 'Home', url: site.url },
    { name: (pageDoc as any).title ?? 'Page', url: `${site.url}/${slug}` },
  ]),
];
---

<BaseLayout {title} {description} {schemas} {siteSettings} seoImage={seoImage}>
  <SectionRenderer sections={(pageDoc as any).pageBuilder} idPrefix="page" />
</BaseLayout>
```

- [ ] Create `src/pages/[slug].astro` with the content above.
- [ ] Run `npm run build`. Expected: clean. (`getStaticPaths` returns an empty array when no `page` documents exist in Sanity, which is valid.)
- [ ] Run `npm run typegen`. Expected: clean (no schema changes in this task).

> **Verify `BaseLayout` prop interface:** the starter's `BaseLayout.astro` accepts `siteSettings` as a prop — confirm this before the build step. If `BaseLayout` does not accept `siteSettings`, the prop must be passed differently or the interface updated. This is a potential divergence point if the starter's BaseLayout was simplified from Reid's.

**Commit:** `feat: add [slug].astro custom page route with reserved-slug filter`

---

## Task 13 — Update Studio desk structure (`studio/structure.ts`)

**Purpose:** Add `businessInfo` to the Content section and `page` (custom pages list) to the Pages section.

**Files:**
- Modify: `studio/structure.ts`

### 13a — Add imports

At the top of the import block, after the existing icon imports, add:

```typescript
import {
  DocumentsIcon,
  PinIcon,
} from '@sanity/icons';
```

> **Note:** Check if `DocumentsIcon` and `PinIcon` are already imported — the starter's structure.ts may not have them. Add only the ones that are missing from the existing import block.

### 13b — Add `'businessInfo'` and `'page'` to `SINGLETON_TYPES` and `HIDDEN_FROM_DEFAULT`

- [ ] In `SINGLETON_TYPES`, add `'businessInfo'` after `'siteSettings'`:
  ```typescript
  const SINGLETON_TYPES = [
    'siteSettings',
    'businessInfo',   // <-- add this line
    // Core pages...
  ```

- [ ] In `HIDDEN_FROM_DEFAULT`, the set is built from `SINGLETON_TYPES` plus manual additions. After `businessInfo` is in `SINGLETON_TYPES`, it is automatically excluded from the default list. Add `'page'` manually to `HIDDEN_FROM_DEFAULT`:
  ```typescript
  const HIDDEN_FROM_DEFAULT = new Set<string>([
    ...SINGLETON_TYPES,
    ...ORDERABLE_TYPES,
    'testimonial',
    'faqItem',
    'journalEntry',
    'journalCategory',
    'page', // custom pages, placed explicitly under "Pages"
    'media.tag',
  ]);
  ```

### 13c — Add `businessInfo` to the Content section

In the `Content` list items block, add `businessInfo` as the first item (before `service`):

```typescript
// Business info: service areas, travel fees, availability, geo.
// Moved here from Site Settings so Settings is identity + infrastructure only.
singletonWithPreview(S, 'businessInfo', 'Business info', PinIcon),

S.divider(),
```

### 13d — Add the custom pages list item to the Pages section

In the `Pages` list items block, after the `privacyPage` singleton and before the closing `]`, add:

```typescript
S.divider(),

// Custom pages: editors build these themselves from the section library.
// Multi-instance (not a singleton), so it is a normal document list.
S.documentTypeListItem('page').title('Custom pages (build your own)').icon(DocumentsIcon),
```

- [ ] Apply all four sub-steps above.
- [ ] Run `npm run studio:dev` and visually confirm in the Studio: the Content section shows "Business info" at the top, and the Pages section shows "Custom pages (build your own)" at the bottom of its list.
- [ ] Run `npm run build`. Expected: clean.

**Commit:** `feat: add businessInfo and custom pages to Studio desk structure`

---

## Task 14 — Run `npm run typegen`, commit regenerated types, and final build gate

**Purpose:** Ensure the generated `src/lib/sanity.types.ts` reflects all schema changes from Phase A, and confirm the clean final build.

**Files:**
- Modify: `src/lib/sanity.types.ts` (auto-generated, committed)

- [ ] Run `npm run typegen`. Expected: `src/lib/sanity.types.ts` is rewritten with types for all 9 section block objects, `businessInfo`, and `page`. No errors.
- [ ] Run `npm run build`. Expected: clean build, zero TypeScript errors, no Astro build failures.
- [ ] Run `npm test`. Expected: all unit tests pass (sectionCadence: 11 tests, reservedSlugs: 4 tests, total: 15).
- [ ] Run `git diff src/lib/sanity.types.ts` — confirm the diff includes new types for `heroSection`, `richTextSection`, `imageTextSection`, `gallerySection`, `quoteSection`, `statSection`, `ctaBandSection`, `videoSection`, `spacerSection`, `businessInfo`, `page`.
- [ ] Stage `src/lib/sanity.types.ts` and commit it alongside any final fixes.

**Commit:** `chore: regenerate sanity.types.ts after Phase A schema additions`

---

## Task 15 — Playwright screenshot verification

**Purpose:** Confirm the custom page route renders correctly in all four configurations. A test page document must exist in Sanity for this step.

**Pre-condition:** A `page` document must be published in Sanity Studio with a non-reserved slug (e.g., `test-page`) and at least two section blocks (e.g., a `heroSection` + a `richTextSection`). This can be created manually via `npm run studio:dev`.

- [ ] Start the dev server: `npm run dev`.
- [ ] Take Playwright screenshots at the test page route (`/test-page`) in four configurations:
  - Desktop 1280px, light mode
  - Desktop 1280px, dark mode
  - Mobile 390px, light mode
  - Mobile 390px, dark mode
- [ ] Verify each screenshot:
  - The hero section renders with the expected heading and optional background image.
  - The `richTextSection` renders on the `bg-muted` surface (muted, because the text hero triggers the cadence offset) or `bg-background` (if the hero has a background image).
  - No console errors or "Unknown block type" warnings.
  - No layout breaks or text overflow at 390px.
  - In dark mode, the surface classes resolve to the correct dark tokens (muted surface should visually differ from background surface).
- [ ] If any screenshot shows a regression, fix the cause before marking Phase A complete.
- [ ] Take a screenshot of the home page (`/`) to confirm no regression on existing pages.

**Commit:** (no new files — screenshots are for verification only)

---

## Phase A Exit Criteria

All of the following must be true before moving to Phase B:

- [ ] `npm run build` exits with code 0, no TypeScript errors, no Astro errors.
- [ ] `npm run typegen` exits with code 0. `src/lib/sanity.types.ts` is committed and includes types for all 9 section block objects, `businessInfo`, and `page`.
- [ ] `npm test` exits with code 0. All 15 unit tests pass (11 cadence, 4 reserved-slugs).
- [ ] Playwright screenshots at `/test-page` (with a seeded test page document) pass in all four configurations: desktop 1280px light, desktop 1280px dark, mobile 390px light, mobile 390px dark. Section surfaces alternate correctly. No console errors.
- [ ] `studio/schemaTypes/sections.ts` exists with all 9 block types, `SECTION_TYPES`, `pageSectionSchemas`, and `additionalSectionsField`. No Reid-specific vocabulary: no "Staci", no "Bronze ornament" (replaced with "Accent ornament"), no Plainfield-specific descriptions.
- [ ] `studio/schemaTypes/businessInfo.ts` exists with city/state/serviceRegion/serviceAreas/travelFees/availabilityStatus/geoLat/geoLng. No Plainfield/Indianapolis defaults.
- [ ] `studio/schemaTypes/page.ts` exists with reserved-slug validation. The `extra` group is declared.
- [ ] `src/components/SectionRenderer.astro` imports `classifySections` from `@/lib/sectionCadence` and delegates all 9 `_type` values to the correct components.
- [ ] `src/components/sections/` contains `RichTextSection.astro`, `ImageText.astro`, `GalleryGrid.astro`, `QuoteBlock.astro`, `VideoEmbed.astro`.
- [ ] `src/pages/[slug].astro` exists. `getStaticPaths` contains the `RESERVED` set inline. No module-scope import of the reserved set.
- [ ] `src/lib/queries.ts` exports `sectionsProjection()`, `getPage()`, `getAllPageSlugs()`, `getNavPages()`, `getBusinessInfo()`. `getSiteSettings()` pulls `availabilityStatus`, `serviceAreas`, `travelFees`, `city`, `state`, `serviceRegion`, `geoLat`, `geoLng` from `businessInfo` via nested sub-query. All query functions use `sanityFetch()`, not `client.fetch()`.
- [ ] Studio desk structure: "Business info" appears in Content, "Custom pages" appears in Pages.
- [ ] `git log --oneline -10` shows clean, conventional-commit-style messages for all Phase A commits.

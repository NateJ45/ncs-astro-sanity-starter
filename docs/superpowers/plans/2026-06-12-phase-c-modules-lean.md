# Phase C -- Modules (Lean)

**Date:** 2026-06-12
**Branch:** `feat/page-builder-and-reskin-port`
**Status:** Ready to execute

---

## Header block

### Goal

Close three small gaps in the module layer: two schema fields missing from
`style-quiz` and `budget-calculator`, one missing append zone on `portfolio`,
and the removal of the "paste query functions into core" enable step that all
nine feature modules currently require. Replace it with a co-located
`src/lib/<name>Queries.ts` per module that copies alongside the pages and
components.

### Architecture note

All changes in C1 and C2 are to files under `modules/` and `docs/modules/`.
No core `src/` file is touched. Because modules ship OFF, the default build
never references these files; the C1 portfolio schema change and all C2 query
files are invisible to `npm run build` until a module is explicitly enabled.
C3 temporarily enables a representative set to prove the end-to-end path,
then reverts.

### Tech stack

Astro, Sanity, TypeScript, GROQ. No new dependencies.

### Agentic sub-skill

Use `superpowers:subagent-driven-development` for C2: the 10 per-module query
files are fully parallel-shaped (no shared state, no ordering dependency).

---

## C1 -- Small gaps (S)

Three targeted edits to module files. All three leave the default build
unchanged (modules are OFF).

### C1.1 -- `style-quiz`: add top-level SEO fields

**File:** `modules/style-quiz/studio/styleQuiz.ts`

The schema already has an `seo` group and an `seoImage` field. Add `seoTitle`
and `seoDescription` string fields directly to the `fields` array, **before**
the existing `seoImage` field, matching the pattern used by `portfolioPage.ts`:

```ts
defineField({
  name: 'seoTitle',
  title: 'SEO title',
  type: 'string',
  group: 'seo',
  description: 'Browser tab and Google result title. Aim for 50 to 60 characters.',
  validation: (Rule) => Rule.max(60).warning('Titles longer than about 60 characters get cut off in Google search results.'),
}),
defineField({
  name: 'seoDescription',
  title: 'SEO description',
  type: 'text',
  rows: 3,
  group: 'seo',
  description: 'The sentence under the title in Google results. Aim for 150 to 160 characters.',
  validation: (Rule) => Rule.max(160).warning('Descriptions longer than about 160 characters get cut off in Google search results.'),
}),
```

The `getStyleQuiz` query already projects `seoTitle, seoDescription` (see
Step 4b in `docs/modules/style-quiz.md`), so the projection is correct once
the fields exist.

### C1.2 -- `budget-calculator`: add top-level SEO fields

**File:** `modules/budget-calculator/studio/budgetCalculator.ts`

Same gap: an `seo` group and `seoImage` field exist, but `seoTitle` and
`seoDescription` are absent. Add the same two fields immediately before
`seoImage` (copy the snippet from C1.1 above).

The `getBudgetCalculator` query already projects `seoTitle, seoDescription`,
so the projection is correct once the fields exist.

### C1.3 -- `portfolio`: add `additionalSections` append zone

Three sub-steps.

**a) Schema -- `modules/portfolio/studio/portfolioPage.ts`:**

Import `additionalSectionsField` from `studio/schemaTypes/sections.ts` and add
an `extra` field group. The import path from the module file will be
`../../../../../../studio/schemaTypes/sections` (relative); when the file is
copied to `studio/schemaTypes/portfolioPage.ts` at enable time the import
becomes `./sections` -- use the already-copied location. Recommended approach:
add the import as a comment at the top of the module file documenting the
correct post-copy import path, and write the field reference assuming the
post-copy location. The enable guide (Step 1) already copies the schema file
into `studio/schemaTypes/`, so at that point `./sections` will resolve.

Add to `groups`:
```ts
{ name: 'extra', title: 'Extra sections' },
```

Add to `fields` (after the last `hero` field):
```ts
additionalSectionsField,
```

Import at the top of `portfolioPage.ts` (post-copy path):
```ts
import { additionalSectionsField } from './sections';
```

**b) Query -- `modules/portfolio/src/lib/portfolioQueries.ts` (created in C2):**

Add `additionalSections` to the `getPortfolioPage` projection:
```groq
additionalSections[]{ ..., ${sectionsProjection('additionalSections')} }
```
Full projection shape: see C2 (portfolio entry). Coordinate with C2.1 so this
is one consistent file rather than two separate edits.

**c) Page -- `modules/portfolio/src/pages/portfolio/index.astro`:**

After the existing project grid / empty state block, add:

```astro
import SectionRenderer from '@/components/SectionRenderer.astro';
// ... existing imports ...

// In the data-fetch block:
// page already contains additionalSections from getPortfolioPage()

// At the bottom of BaseLayout, after the project grid section:
{page?.additionalSections?.length > 0 && (
  <SectionRenderer
    idPrefix="portfolio-extra"
    sections={page.additionalSections}
  />
)}
```

---

## C2 -- Kill the enable friction / query co-location (M)

For each module, create `modules/<name>/src/lib/<name>Queries.ts` containing
the query functions from the module's Step 4b block in `docs/modules/<name>.md`.
Update the module's pages to import from the co-located file. Update the enable
doc.

All 10 sub-tasks (9 modules + newsletter, which has no queries) are parallel.

### Imports in each query file

```ts
import { sanityFetch } from '@/lib/sanity';
import { IMAGE_PROJECTION, CTA_PROJECTION, sectionsProjection } from '@/lib/queries';
```

`sanityFetch`, `IMAGE_PROJECTION`, `CTA_PROJECTION`, and `sectionsProjection`
are all exported from core as of Phase A.

### Per-module sub-tasks

For each entry below:
1. Create the co-located query file at the given path.
2. Update the module's page imports to use the new file.
3. Update `docs/modules/<name>.md` Step 4b: replace "paste functions into
   `src/lib/queries.ts`" with "copy `modules/<name>/src/lib/<name>Queries.ts`
   into your `src/lib/`" (one PowerShell copy command, consistent with Step 4).
4. Verify imports in the page(s) point to `@/lib/<name>Queries` (which resolves
   once the file is copied to `src/lib/`).

#### C2.1 -- portfolio

**Query file:** `modules/portfolio/src/lib/portfolioQueries.ts`
**Functions:** `getPortfolioPage`, `getProjectsWithBeforeAfter`, `getProjectBySlug`
(exact bodies from `docs/modules/portfolio.md` Step 4b).
**Also include** `additionalSections` in the `getPortfolioPage` projection per
C1.3b. Full projection for `getPortfolioPage`:
```groq
*[_type == "portfolioPage"][0]{
  seoTitle, seoDescription,
  seoImage${IMAGE_PROJECTION},
  heroEyebrow, heroHeadline, heroSubhead,
  heroImage${IMAGE_PROJECTION},
  heroScriptAccent,
  ${sectionsProjection('additionalSections')}
}
```
**Pages updated:**
- `modules/portfolio/src/pages/portfolio/index.astro` -- imports `getPortfolioPage`
- `modules/portfolio/src/pages/portfolio/[slug].astro` -- imports `getProjectBySlug`
- `modules/portfolio/src/pages/portfolio/before-after.astro` -- imports `getProjectsWithBeforeAfter`

Note: `getAllProjects` stays in `src/lib/queries.ts` (core) per the enable doc.
The portfolio pages import it from `@/lib/queries`; that import stays as-is.

#### C2.2 -- style-quiz

**Query file:** `modules/style-quiz/src/lib/styleQuizQueries.ts`
**Functions:** `getStyleQuiz`
**Pages updated:** `modules/style-quiz/src/pages/quiz.astro`

Note: the `getStyleQuiz` projection already includes `seoTitle, seoDescription`;
the fields are added by C1.1.

#### C2.3 -- budget-calculator

**Query file:** `modules/budget-calculator/src/lib/budgetCalculatorQueries.ts`
**Functions:** `getBudgetCalculator`
**Pages updated:** `modules/budget-calculator/src/pages/calculator.astro`

#### C2.4 -- lead-magnets

**Query file:** `modules/lead-magnets/src/lib/leadMagnetsQueries.ts`
**Functions:** `getLeadMagnets`, `getLeadMagnet`, `getAllLeadMagnetSlugs`
**Pages updated:**
- `modules/lead-magnets/src/pages/guides/index.astro` -- imports `getLeadMagnets`
- `modules/lead-magnets/src/pages/guides/[slug].astro` -- imports `getLeadMagnet`, `getAllLeadMagnetSlugs`

#### C2.5 -- shop

**Query file:** `modules/shop/src/lib/shopQueries.ts`
**Functions:** `getShopPage`
**Pages updated:** `modules/shop/src/pages/shop.astro`

#### C2.6 -- e-design

**Query file:** `modules/e-design/src/lib/eDesignQueries.ts`
**Functions:** `getEDesignPage`
**Pages updated:** `modules/e-design/src/pages/e-design.astro`

Note: `getEDesignPage` uses `CTA_PROJECTION`. Confirm the import resolves
from `@/lib/queries` when enabled.

#### C2.7 -- gift-certificates

**Query file:** `modules/gift-certificates/src/lib/giftCertificatesQueries.ts`
**Functions:** `getGiftPage`
**Pages updated:** `modules/gift-certificates/src/pages/gift-certificates.astro`

#### C2.8 -- press

**Query file:** `modules/press/src/lib/pressQueries.ts`
**Functions:** `getPressPage`
**Pages updated:** `modules/press/src/pages/press.astro`

Note: `getPressItems` stays in core `src/lib/queries.ts`; the press page
imports it from `@/lib/queries`. Only `getPressPage` moves to the co-located
file.

#### C2.9 -- resources

**Query file:** `modules/resources/src/lib/resourcesQueries.ts`
**Functions:** `getResourcesPage`
**Pages updated:** `modules/resources/src/pages/resources.astro`

#### C2.10 -- newsletter

**No query file.** Newsletter is configuration-only (no pages, no queries). No
Step 4b exists in `docs/modules/newsletter.md`. Skip.

### C2.11 -- Update `modules/README.md`

Add `src/lib/` to the required folder shape documentation:

```
modules/<name>/
  studio/            # Sanity schema .ts files
  src/
    pages/           # .astro route files
    components/      # React islands (.tsx) and .astro components
    lib/             # Co-located query functions (<name>Queries.ts)
  seed.mjs
  README.md
```

Add a brief note under "How modules are registered" explaining that Step 4 now
covers two copy operations: `src/pages` + `src/components` (unchanged) and
`src/lib/<name>Queries.ts` (new). A project's `src/lib/queries.ts` is never
edited during an enable.

---

## C3 -- Verification (M)

Modules ship OFF. The default build does not reference any module files. C3
proves the co-located query path end-to-end without keeping modules enabled.

### C3.1 -- Default build gate (must pass before starting C3 enable test)

```powershell
npm run typegen         # PASS
npm run build           # PASS; no module routes in output
npm --prefix studio run build  # PASS
npm test                # 22 tests pass
```

This confirms C1 and C2 edits (which are all to `modules/` and `docs/`) did
not break the OFF-state build.

### C3.2 -- Representative enable test

Enable the `portfolio + lead-magnets + resources` preset on a scratch branch:

```powershell
git checkout -b scratch/phase-c-verify
```

Follow the updated enable docs for each of the three modules in order
(portfolio first because resources links to guides):

For each module:
1. Step 1: `Copy-Item modules/<name>/studio/*.ts studio/schemaTypes/`
2. Step 2: register in `studio/schemaTypes/index.ts`
3. Step 3: register in `studio/structure.ts`
4. Step 4: `Copy-Item -Recurse -Force modules/<name>/src/* src/`
5. **Step 4 (new):** `Copy-Item modules/<name>/src/lib/<name>Queries.ts src/lib/`
   -- this is the C2 change being verified
6. Step 5: add nav entry in `Header.astro`

Then run:

```powershell
npm run typegen         # PASS -- no type errors from the co-located imports
npm run build           # PASS -- /portfolio, /guides, /guides/[slug], /resources in output
npm --prefix studio run build  # PASS
```

Then revert:

```powershell
git checkout main
git branch -D scratch/phase-c-verify
```

The template ships modules OFF. This revert is the correct final state.

### C3.3 -- Spot-check remaining modules

For each of the remaining 6 modules (style-quiz, budget-calculator, shop,
e-design, gift-certificates, press), verify by grep and reasoning rather than
full enable:

- Query file exists at `modules/<name>/src/lib/<name>Queries.ts`.
- Functions in the query file match the Step 4b bodies in the enable doc.
- Page files import from `@/lib/<name>Queries` (not from `@/lib/queries`) for
  the module-specific functions.
- No cross-module query dependency exists (see "Snag notes" below).

---

## Build gates

| Gate | When | Expected |
|------|------|----------|
| `npm run build` | After C1 + C2 land (modules OFF) | PASS; no module routes |
| `npm run typegen` | After C1 + C2 land | PASS |
| `npm test` | After C1 + C2 land | 22 pass |
| `npm --prefix studio run build` | After C1 + C2 land | PASS |
| `npm run typegen` | During C3 enable test | PASS |
| `npm run build` | During C3 enable test | PASS; portfolio + guides + resources routes present |
| `npm --prefix studio run build` | During C3 enable test | PASS |

---

## Snag notes

**style-quiz cross-module dependency:** The `styleQuiz` schema has a
`routing.guideRef` field that references `leadMagnet`. The enable doc documents
this; the `getStyleQuiz` query projection does not dereference the guide (it
projects `guideRef` by reference only). No query dependency on `lead-magnets`
queries exists; co-location is clean.

**press partial split:** `getPressItems` stays in core `src/lib/queries.ts`;
only `getPressPage` lives in the co-located file. This is intentional and noted
in C2.8. The press page will import `getPressPage` from `@/lib/pressQueries`
and `getPressItems` from `@/lib/queries`. Both imports resolve once the files
are in place.

**portfolio `additionalSections` projection:** The `sectionsProjection()` helper
is a function call, not a bare string, so the GROQ template literal in
`getPortfolioPage` must interpolate it as a function call:
`${sectionsProjection('additionalSections')}`. Confirm the function signature
in `src/lib/queries.ts` accepts a field-name argument (it does -- the exported
signature is `sectionsProjection(field = 'pageBuilder'): string`).

**newsletter:** No co-located query file; no Step 4b; nothing to do. Marked
C2.10 as explicit skip to avoid ambiguity.

---

## Phase C Exit Criteria

- C1: `style-quiz` and `budget-calculator` schemas each have `seoTitle` and
  `seoDescription` string fields in the `seo` group. `portfolioPage` schema
  has an `extra` group, `additionalSectionsField`, and the `index.astro` page
  renders a second `SectionRenderer` when `additionalSections` is non-empty.
- C2: All 9 feature modules have a co-located `src/lib/<name>Queries.ts`
  containing the query functions that were previously in Step 4b. Module pages
  import their module-specific queries from that file. Enable docs updated.
  `modules/README.md` documents the `src/lib/` slot.
- C3: Default build passes all four gates with modules OFF. Representative
  enable of portfolio + lead-magnets + resources builds cleanly with the
  co-located query files in place. Scratch branch reverted.
- No em-dashes in any editor-facing string added or modified.
- No Reid-specific vocabulary introduced.

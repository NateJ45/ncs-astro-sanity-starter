# Module: Portfolio

**What it adds:** Routes `/portfolio` (filterable project grid with Room x Style filter chips and a custom cursor), `/portfolio/[slug]` (case-study detail page with TOC sidebar, gallery lightbox, before/after sliders, and a sticky CTA chip), and `/portfolio/before-after` (standalone before/after reveal page). Studio schemas: `portfolioPage` (singleton driving the index hero) and `project` (orderable collection of case studies). Visitors can filter the grid by room type and design style; detail pages include a justified photo gallery, draggable before/after comparisons, a scrollable case-study TOC, and a contextual sticky CTA.
**Depends on (already in core):** `BeforeAfterSlider.tsx`, `CaseStudyTOC.tsx`, `StickyCTAChip.tsx`, `SanityImage.astro`, `SectionHeading.astro`, `FinalCta.astro`, `getSectionVisibility` (from `@/lib/sectionVisibility`), and the `.img-zoom`, `.img-tint`, and `[data-stagger-grid]` CSS utilities defined in the core stylesheet.
**Env/config:** No additional env vars beyond the standard `PUBLIC_SANITY_*` set. The `siteSettings.sectionVisibility.showPortfolio` flag controls whether the module's routes are accessible; set it to `true` (or leave unset) to enable.

---

## Enable

Complete all seven steps in order. Run the verify steps at the end before
considering the module live.

### Step 1 -- Copy schemas into the Studio

```powershell
Copy-Item modules/portfolio/studio/*.ts src/sanity/schemaTypes/
```

**Replace the filter option values before publishing.** The `project` schema ships with generic placeholder values for the `roomType` (titled "Project category") and `designStyle` (titled "Project style") fields. Open `src/sanity/schemaTypes/project.ts` after copying and replace the `Category A/B/C/...` and `Style A/B/C/...` option titles and values with labels that match the client's actual project types and style vocabulary. The field names (`roomType`, `designStyle`) are kept as-is for data compatibility with the portfolio filter components; only the human-readable titles and option values need changing.

### Step 2 -- Register schemas in `src/sanity/schemaTypes/index.ts`

Add two import lines and two array entries. Follow the existing grouping comments:

```ts
// add with the other imports, alphabetical by symbol name
import { portfolioPage } from './portfolioPage';
import { project } from './project';

export const schemaTypes = [
  // ... existing object types ...

  // Singletons
  // ... existing singletons ...
  portfolioPage,   // <-- add here

  // Reusable content collections
  // ... existing collections ...
  project,         // <-- add here
];
```

### Step 3 -- Register in `src/sanity/structure.ts`

**a) Add `portfolioPage` to `SINGLETON_TYPES`:**

```ts
const SINGLETON_TYPES = [
  // ... existing types ...
  'portfolioPage',   // <-- add
] as const;
```

**b) Add `project` to `ORDERABLE_TYPES`:**

```ts
const ORDERABLE_TYPES = [
  // ... existing types ...
  'project',   // <-- add
] as const;
```

**c) Add `ImagesIcon` to the icon imports at the top of the file:**

```ts
import {
  // ... existing icons ...
  ImagesIcon,
} from '@sanity/icons';
```

**d) Add the Portfolio page singleton inside the Pages list item** (after the Journal entry, before the divider above Privacy):

```ts
singletonWithPreview(S, 'portfolioPage', 'Portfolio (index page)', ImagesIcon),
```

**e) Add the Projects orderable list inside the Content list item** (after the other orderable items):

```ts
orderableDocumentListDeskItem({
  type: 'project',
  title: 'Projects',
  icon: ImagesIcon,
  S,
  context,
}),
```

### Step 4 -- Copy app files

```powershell
Copy-Item -Recurse -Force modules/portfolio/src/* src/
```

### Step 4b -- Copy the co-located query file

The portfolio pages import `getPortfolioPage`, `getProjectBySlug`, and
`getProjectsWithBeforeAfter` from `@/lib/portfolioQueries`. Copy the
co-located query file alongside the pages and components:

```powershell
Copy-Item modules/portfolio/src/lib/portfolioQueries.ts src/lib/
```

**Note:** `getAllProjects` (used by the portfolio index and the `[slug]` page's
`getStaticPaths`) is already in the core starter in `src/lib/queries.ts` --
do NOT add it again. Only `portfolioQueries.ts` needs to be copied.

### Step 5 -- Add the nav entry in `src/components/Header.astro`

Locate the `NAV_ITEMS` array (around line 112). Add the portfolio link, wrapped in the `sectionVisibility` conditional:

```ts
...(visible.portfolio ? [{ kind: 'flat' as const, label: 'Portfolio', href: '/portfolio' }] : []),
```

Place it after the Services entry and before the Journal entry so the nav reads: About, Services, Portfolio, Journal.
If you are enabling multiple modules at once, add all their nav entries in a
single edit to `NAV_ITEMS`. A reasonable order when several modules are enabled:
Portfolio (after Services), then Journal, then Guides, then Resources.

### Step 6 -- Seed placeholder content

```powershell
node modules/portfolio/seed.mjs
```

The seeder is idempotent -- running it twice does not create duplicates. It creates one `portfolioPage` singleton and three neutral `project` documents ("Project One", "Project Two", "Project Three") with generic room and style tags.

### Step 7 -- Verify the build

```powershell
npm run typegen   # expect PASS, no type errors
npm run build     # expect PASS; /portfolio, /portfolio/[slug], /portfolio/before-after appear in output
```

---

## Desk + nav snippets

### Studio desk items

Paste the **singleton** inside the Pages `S.list().items([...])` block:

```ts
singletonWithPreview(S, 'portfolioPage', 'Portfolio (index page)', ImagesIcon),
```

Paste the **orderable collection** inside the Content `S.list().items([...])` block:

```ts
orderableDocumentListDeskItem({
  type: 'project',
  title: 'Projects',
  icon: ImagesIcon,
  S,
  context,
}),
```

Add this import if `ImagesIcon` is not already imported from `@sanity/icons`:

```ts
import {
  // ... existing icons ...
  ImagesIcon,
} from '@sanity/icons';
```

### Header nav entry

Paste inside the `NAV_ITEMS` array in `src/components/Header.astro`:

```ts
...(visible.portfolio ? [{ kind: 'flat' as const, label: 'Portfolio', href: '/portfolio' }] : []),
```

---

## Verify

After completing all enable steps:

- Route `/portfolio` renders without errors in both light and dark mode at approximately 375 px (mobile) and 1280 px (desktop) viewport widths.
- Route `/portfolio/[slug]` renders the seeded project detail pages (three slugs: `project-one`, `project-two`, `project-three`) with no errors.
- Route `/portfolio/before-after` renders without errors. Because the seeded projects include no before/after pairs, the page shows its empty/coming-soon state and does not crash.
- With no `project` documents at all (before seeding), `/portfolio` shows the "Case studies are on the way" empty state and does not crash.
- The Room and Style filter chips appear only when the portfolio contains at least two projects with distinct values on each axis.
- The sticky CTA chip appears on detail pages only when `project.stickyCtaLabel` is set.
- `npm run typegen` and `npm run build` both pass cleanly.
- The Portfolio nav link appears in the header and navigates to `/portfolio`.

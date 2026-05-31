# Module: Process

**What it adds:** Route `/process` -- a step-by-step "how I work" page. Visitors see a hero banner, then each `processStep` document in drag-sorted order (full `PortableText` description, quick-bullet features, and an optional tier note), followed by a FAQ block filtered to process-relevant items and a Final CTA. The intro-only/empty state renders without crashing when no `processStep` documents exist yet.
**Depends on (already in core):** `ProcessStep.astro`, `ProcessStepIllustration.astro`, `SectionHeading.astro`, `FinalCta.astro`, `FaqAccordion.tsx`, `getSectionVisibility` (from `@/lib/sectionVisibility`), and the `Hero.astro` layout component.
**Env/config:** No additional env vars beyond the standard `PUBLIC_SANITY_*` set.

---

## Enable

Complete all seven steps in order. Run the verify steps at the end before
considering the module live.

### Step 1 -- Copy schemas into the Studio

```powershell
Copy-Item modules/process/studio/*.ts studio/schemaTypes/
```

### Step 2 -- Register schemas in `studio/schemaTypes/index.ts`

Add two import lines and two array entries:

```ts
// add with the other imports, alphabetical by symbol name
import { processPage } from './processPage';
import { processStep } from './processStep';

export const schemaTypes = [
  // ... existing object types ...

  // Singletons
  // ... existing singletons ...
  processPage,   // <-- add here

  // Reusable content collections
  // ... existing collections ...
  processStep,   // <-- add here
];
```

### Step 3 -- Register in `studio/structure.ts`

**a) Add `processPage` to `SINGLETON_TYPES`:**

```ts
const SINGLETON_TYPES = [
  // ... existing types ...
  'processPage',   // <-- add
] as const;
```

**b) Add `processStep` to `ORDERABLE_TYPES`:**

```ts
const ORDERABLE_TYPES = [
  // ... existing types ...
  'processStep',   // <-- add
] as const;
```

**c) Add `TrendUpwardIcon` to the icon imports at the top of the file:**

```ts
import {
  // ... existing icons ...
  TrendUpwardIcon,
} from '@sanity/icons';
```

**d) Add the Process page singleton inside the Pages list item** (after the Journal entry, before the divider above Privacy):

```ts
singletonWithPreview(S, 'processPage', 'Process', TrendUpwardIcon),
```

**e) Add the Process Steps orderable list inside the Content list item** (after the other orderable items):

```ts
orderableDocumentListDeskItem({
  type: 'processStep',
  title: 'Process Steps',
  icon: TrendUpwardIcon,
  S,
  context,
}),
```

### Step 4 -- Copy app files

```powershell
Copy-Item -Recurse -Force modules/process/src/* src/
```

### Step 4b -- Add query functions to `src/lib/queries.ts`

The process page imports `getProcessPage` from `@/lib/queries`. Add it before the press section:

```ts
// ---- Process module ---------------------------------------------------------

export async function getProcessPage() {
  return sanityFetch(`*[_type == "processPage"][0]{
    seoTitle, seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    faqSectionEyebrow, faqSectionHeadline,
    finalCtaEyebrow, finalCtaHeadline, finalCtaScriptAccent, finalCtaSubhead,
    finalCtaBackgroundImage${IMAGE_PROJECTION},
    finalCta${CTA_PROJECTION},
    "processSteps": *[_type == "processStep"] | order(orderRank asc, stepNumber asc){
      stepNumber, title, timeEstimate, shortDescription, description, features, tierNote
    },
    "faqs": *[_type == "faqItem" && alsoShowOnProcessPage == true] | order(displayOrder asc){
      question, answer, category, displayOrder
    }
  }`, {}, null);
}
```

### Step 5 -- Add the nav entry in `src/components/Header.astro`

Locate the `NAV_ITEMS` array (around line 112). Add the process link after the Services entry:

```ts
{ kind: 'flat' as const, label: 'Process', href: '/process' },
```

### Step 6 -- Seed placeholder content

```powershell
node modules/process/seed.mjs
```

The seeder is idempotent -- running it twice does not create duplicates. It creates one `processPage` singleton and four neutral `processStep` documents ("Step One" through "Step Four") with generic titles, time estimates, and placeholder body text.

### Step 7 -- Verify the build

```powershell
npm run typegen   # expect PASS, no type errors
npm run build     # expect PASS; /process appears in output
```

---

## Desk + nav snippets

### Studio desk items

Paste the **singleton** inside the Pages `S.list().items([...])` block:

```ts
singletonWithPreview(S, 'processPage', 'Process', TrendUpwardIcon),
```

Paste the **orderable collection** inside the Content `S.list().items([...])` block:

```ts
orderableDocumentListDeskItem({
  type: 'processStep',
  title: 'Process Steps',
  icon: TrendUpwardIcon,
  S,
  context,
}),
```

Add this import if `TrendUpwardIcon` is not already imported from `@sanity/icons`:

```ts
import {
  // ... existing icons ...
  TrendUpwardIcon,
} from '@sanity/icons';
```

### Header nav entry

Paste inside the `NAV_ITEMS` array in `src/components/Header.astro`:

```ts
{ kind: 'flat' as const, label: 'Process', href: '/process' },
```

---

## Verify

After completing all enable steps:

- Route `/process` renders without errors in both light and dark mode at approximately 375 px (mobile) and 1280 px (desktop) viewport widths.
- With no `processStep` documents (before seeding), `/process` shows the hero and Final CTA sections and does not crash.
- After seeding, four steps render in step-number order with their placeholder body text and feature bullets.
- FAQ items marked `alsoShowOnProcessPage = true` appear in the FAQ block; if none are marked, the FAQ section is hidden entirely (no crash).
- `npm run typegen` and `npm run build` both pass cleanly.
- The Process nav link appears in the header and navigates to `/process`.

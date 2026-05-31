# Module: Budget Calculator

**What it adds:** Route `/calculator` -- an interactive project budget estimator. Visitors pick a room type, choose a scope level, optionally add extras, and immediately see a live estimate range. The estimate always shows without requiring an email; an optional "Email me this estimate" form is available but never gates the result. Studio schema: `budgetCalculator` singleton (controls room types, base cost ranges, scope options, add-on labels and cost ranges, result copy, CTA label).
**Depends on (already in core):** `SectionHeading.astro`, `Hero.astro`, `BaseLayout.astro`, `getSectionVisibility` (from `@/lib/sectionVisibility`), `subscribeEmail` (from `@/lib/subscribe`), and shadcn UI primitives.
**Env/config:** No additional env vars beyond the standard `PUBLIC_SANITY_*` set. The `siteSettings.sectionVisibility.budgetCalculator` flag controls whether `/calculator` is accessible; set it to `true` to enable.

---

## Enable

Complete all seven steps in order. Run the verify steps at the end before
considering the module live.

### Step 1 -- Copy schemas into the Studio

```powershell
Copy-Item modules/budget-calculator/studio/*.ts studio/schemaTypes/
```

### Step 2 -- Register schemas in `studio/schemaTypes/index.ts`

Add one import line and one array entry. Follow the existing grouping comments:

```ts
// add with the other imports, alphabetical by symbol name
import { budgetCalculator } from './budgetCalculator';

export const schemaTypes = [
  // ... existing object types ...

  // Singletons
  // ... existing singletons ...
  budgetCalculator,   // <-- add here
];
```

### Step 3 -- Register in `studio/structure.ts`

**a) Add `budgetCalculator` to `SINGLETON_TYPES`:**

```ts
const SINGLETON_TYPES = [
  // ... existing types ...
  'budgetCalculator',   // <-- add
] as const;
```

**b) Add `BillIcon` to the icon imports at the top of the file:**

```ts
import {
  // ... existing icons ...
  BillIcon,
} from '@sanity/icons';
```

**c) Add the Budget Calculator page singleton inside the Pages list item** (after the Style Quiz entry if that module is also enabled, otherwise after the Journal entry before the Privacy Policy divider):

```ts
singletonWithPreview(S, 'budgetCalculator', 'Budget Calculator', BillIcon),
```

### Step 4 -- Copy app files

```powershell
Copy-Item -Recurse -Force modules/budget-calculator/src/* src/
```

### Step 4b -- Add query functions to `src/lib/queries.ts`

The calculator page imports `getBudgetCalculator` from `@/lib/queries`. Add it before the press section:

```ts
// ---- Budget Calculator module -----------------------------------------------

export async function getBudgetCalculator() {
  return sanityFetch(`*[_type == "budgetCalculator"][0]{
    seoTitle, seoDescription,
    heroEyebrow, heroHeadline, heroSubhead,
    heroScriptAccent,
    rooms[]{_key, label, baseMin, baseMax},
    scopes[]{_key, label, multiplier},
    addOns[]{_key, label, min, max},
    resultHeading, resultSubhead,
    emailCtaLabel, emailCtaHeading,
    ctaLabel, ctaHref
  }`, {}, null);
}
```

### Step 5 -- Add the nav entry in `src/components/Header.astro`

Locate the `NAV_ITEMS` array (around line 112). Add the calculator link, wrapped in the `sectionVisibility` conditional:

```ts
...(visible.budgetCalculator ? [{ kind: 'flat' as const, label: 'Budget Calculator', href: '/calculator' }] : []),
```

### Step 6 -- Seed placeholder content

```powershell
node modules/budget-calculator/seed.mjs
```

The seeder is idempotent -- running it twice does not create duplicates. It creates one `budgetCalculator` singleton with 3 room types, 3 scope levels, and 3 optional add-ons.

### Step 7 -- Verify the build

```powershell
npm run typegen   # expect PASS, no type errors
npm run build     # expect PASS; /calculator appears in output
```

---

## Desk + nav snippets

### Studio desk item

Paste this inside the Pages `S.list().items([...])` block:

```ts
singletonWithPreview(S, 'budgetCalculator', 'Budget Calculator', BillIcon),
```

Add this import if `BillIcon` is not already imported from `@sanity/icons`:

```ts
import {
  // ... existing icons ...
  BillIcon,
} from '@sanity/icons';
```

### Header nav entry

Paste inside the `NAV_ITEMS` array in `src/components/Header.astro`:

```ts
...(visible.budgetCalculator ? [{ kind: 'flat' as const, label: 'Budget Calculator', href: '/calculator' }] : []),
```

---

## Verify

After completing all enable steps:

- Route `/calculator` renders without errors in both light and dark mode at approximately 375 px (mobile) and 1280 px (desktop) viewport widths.
- With no seeded content (before running `seed.mjs`), `/calculator` shows the coming-soon state and does not crash.
- After seeding, the room dropdown lists three options, the scope radio group shows three levels, the three add-on checkboxes appear, and the estimate range updates immediately as inputs change.
- The "Email me this estimate" link opens a small form without hiding the estimate.
- `npm run typegen` and `npm run build` both pass cleanly.
- The Budget Calculator nav link appears in the header and navigates to `/calculator`.

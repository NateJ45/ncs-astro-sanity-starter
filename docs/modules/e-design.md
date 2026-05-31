# Module: E-Design

**What it adds:** Route `/e-design` -- a service landing page for online or virtual design offerings. Sections include a hero, intro copy in Portable Text, numbered how-it-works steps, a deliverables bullet list, pricing tier cards, optional FAQ references, and a final CTA. CTAs route to `/contact?type=e-design`. A coming-soon holding state renders when the `eDesignPage` document has not yet been published. Studio schema: `eDesignPage` (singleton).
**Depends on (already in core):** `SectionHeading.astro`, `FinalCta.astro`, `FaqAccordion.tsx`, `PortableText.tsx`, `Hero.astro`, `getSectionVisibility` (from `@/lib/sectionVisibility`).
**Env/config:** No additional env vars beyond the standard `PUBLIC_SANITY_*` set. The `siteSettings.sectionVisibility.showEDesign` flag controls whether the route is accessible; unset counts as visible.

---

## Enable

Complete all seven steps in order. Run the verify steps at the end before
considering the module live.

### Step 1 -- Copy schemas into the Studio

```powershell
Copy-Item modules/e-design/studio/*.ts studio/schemaTypes/
```

### Step 2 -- Register schemas in `studio/schemaTypes/index.ts`

Add one import line and one array entry:

```ts
// add with the other imports, alphabetical by symbol name
import { eDesignPage } from './eDesignPage';

export const schemaTypes = [
  // ... existing object types ...

  // Singletons
  // ... existing singletons ...
  eDesignPage,   // <-- add here

  // Reusable content collections
  // ... (no collection schema for this module) ...
];
```

### Step 3 -- Register in `studio/structure.ts`

**a) Add `'eDesignPage'` to `SINGLETON_TYPES`:**

```ts
const SINGLETON_TYPES = [
  // ... existing types ...
  'eDesignPage',   // <-- add
] as const;
```

**b) Add `DesktopIcon` to the icon imports at the top of the file:**

```ts
import {
  // ... existing icons ...
  DesktopIcon,
} from '@sanity/icons';
```

**c) Add the E-Design page singleton inside the Pages list item** (after the other service pages, before the divider above Privacy):

```ts
singletonWithPreview(S, 'eDesignPage', 'E-Design Page', DesktopIcon),
```

### Step 4 -- Copy app files

```powershell
Copy-Item -Recurse -Force modules/e-design/src/* src/
```

### Step 4b -- Add query functions to `src/lib/queries.ts`

The e-design page imports `getEDesignPage` from `@/lib/queries`. Add it before the press section:

```ts
// ---- E-Design module --------------------------------------------------------

export async function getEDesignPage() {
  return sanityFetch(`*[_type == "eDesignPage"][0]{
    seoTitle, seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    intro,
    howItWorksSteps[]{step, title, body},
    deliverables,
    pricingTiers[]{name, price, description, features, isFeatured, ctaLabel},
    "faqs": faqRefs[]->{question, answer, category},
    finalCtaEyebrow, finalCtaHeadline, finalCtaScriptAccent, finalCtaSubhead,
    finalCtaBackgroundImage${IMAGE_PROJECTION},
    finalCta${CTA_PROJECTION}
  }`, {}, null);
}
```

### Step 5 -- Add the nav entry in `src/components/Header.astro`

Locate the `NAV_ITEMS` array (around line 112). Add the e-design link wrapped in the `sectionVisibility` conditional:

```ts
...(visible.eDesign ? [{ kind: 'flat' as const, label: 'E-Design', href: '/e-design' }] : []),
```

### Step 6 -- Seed placeholder content

```powershell
node modules/e-design/seed.mjs
```

The seeder is idempotent -- running it twice does not create duplicates. It creates one `eDesignPage` singleton with intro copy, three how-it-works steps, a deliverables list, and three pricing tiers (Essential, Full Room, Multi-Room). FAQ references are left empty because FAQ item IDs are dataset-specific; add them manually in Studio.

### Step 7 -- Verify the build

```powershell
npm run typegen   # expect PASS, no type errors
npm run build     # expect PASS; /e-design appears in output
```

---

## Desk + nav snippets

### Studio desk item

Paste this into the Pages `S.list().items([...])` block in `studio/structure.ts`:

```ts
singletonWithPreview(S, 'eDesignPage', 'E-Design Page', DesktopIcon),
```

Add this import if `DesktopIcon` is not already imported from `@sanity/icons`:

```ts
import {
  // ... existing icons ...
  DesktopIcon,
} from '@sanity/icons';
```

### Header nav entry

Paste inside the `NAV_ITEMS` array in `src/components/Header.astro`:

```ts
...(visible.eDesign ? [{ kind: 'flat' as const, label: 'E-Design', href: '/e-design' }] : []),
```

---

## Verify

After completing all enable steps:

- Route `/e-design` renders without errors in both light and dark mode at approximately 375 px (mobile) and 1280 px (desktop) viewport widths.
- With no `eDesignPage` document published, `/e-design` shows the coming-soon holding state with the "Inquire about E-Design" button and does not crash.
- After seeding, all sections render: hero, intro, how-it-works steps, deliverables list, three pricing tier cards, and the final CTA panel.
- Every CTA button links to `/contact?type=e-design`.
- `npm run typegen` and `npm run build` both pass cleanly.
- The E-Design nav link appears in the header and navigates to `/e-design`.

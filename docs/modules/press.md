# Module: Press

**What it adds:** Route `/press` -- a press and media coverage listing. The page opens with the `PressStrip` logo row (already in core), optional intro copy from the `pressPage` singleton, then a full listing of all `pressItem` documents ordered by drag-to-reorder `orderRank`. Each card shows outlet name, publication date, a pull-quote, and a link to the original piece. The list suppresses to an empty-state panel when no `pressItem` documents exist. Studio schemas: `pressPage` (singleton for SEO, hero, and intro) and `pressItem` (orderable collection, one document per coverage item).
**Depends on (already in core):** `PressStrip.astro`, `SectionHeading.astro`, `SanityImage.astro`, `CtaLink.astro`, `getSectionVisibility` (from `@/lib/sectionVisibility`).
**Env/config:** No additional env vars beyond the standard `PUBLIC_SANITY_*` set. The `siteSettings.sectionVisibility.showPress` flag controls whether the route is accessible; unset counts as visible.

---

## Enable

Complete all seven steps in order. Run the verify steps at the end before
considering the module live.

### Step 1 -- Copy schemas into the Studio

```powershell
Copy-Item modules/press/studio/*.ts studio/schemaTypes/
```

### Step 2 -- Register schemas in `studio/schemaTypes/index.ts`

Add two import lines and two array entries:

```ts
// add with the other imports, alphabetical by symbol name
import { pressItem } from './pressItem';
import { pressPage } from './pressPage';

export const schemaTypes = [
  // ... existing object types ...

  // Singletons
  // ... existing singletons ...
  pressPage,    // <-- add here

  // Reusable content collections
  // ... existing collections ...
  pressItem,    // <-- add here
];
```

### Step 3 -- Register in `studio/structure.ts`

**a) Add `'pressPage'` to `SINGLETON_TYPES`:**

```ts
const SINGLETON_TYPES = [
  // ... existing types ...
  'pressPage',   // <-- add
] as const;
```

**b) Add `'pressItem'` to `ORDERABLE_TYPES`:**

```ts
const ORDERABLE_TYPES = [
  // ... existing types ...
  'pressItem',   // <-- add
] as const;
```

**c) Add `CaseIcon` to the icon imports at the top of the file:**

```ts
import {
  // ... existing icons ...
  CaseIcon,
} from '@sanity/icons';
```

**d) Add the Press page singleton inside the Pages list item** (after the other page singletons, before the divider above Privacy):

```ts
singletonWithPreview(S, 'pressPage', 'Press Page', CaseIcon),
```

**e) Add the Press Items orderable list inside the Content list item** (after the other orderable items):

```ts
orderableDocumentListDeskItem({
  type: 'pressItem',
  title: 'Press Items',
  icon: CaseIcon,
  S,
  context,
}),
```

### Step 4 -- Copy app files

```powershell
Copy-Item -Recurse -Force modules/press/src/* src/
```

### Step 4b -- Add query functions to `src/lib/queries.ts`

The press page imports `getPressPage` from `@/lib/queries`. (`getPressItems` is already in the core starter.) Add `getPressPage` before the existing press items section:

```ts
// ---- Press module (page singleton) -----------------------------------------

export async function getPressPage() {
  return sanityFetch(`*[_type == "pressPage"][0]{
    seoTitle, seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    intro
  }`, {}, null);
}
```

### Step 5 -- Add the nav entry in `src/components/Header.astro`

Locate the `NAV_ITEMS` array (around line 112). Add the press link wrapped in the `sectionVisibility` conditional:

```ts
...(visible.press ? [{ kind: 'flat' as const, label: 'Press', href: '/press' }] : []),
```

### Step 6 -- Seed placeholder content

```powershell
node modules/press/seed.mjs
```

The seeder is idempotent -- running it twice does not create duplicates. It creates one `pressPage` singleton and three neutral `pressItem` documents (Publication One, Publication Two, Publication Three) with placeholder quotes, `https://example.com` links, and staggered dates. Replace outlet names, quotes, and URLs with real coverage in Studio.

### Step 7 -- Verify the build

```powershell
npm run typegen   # expect PASS, no type errors
npm run build     # expect PASS; /press appears in output
```

---

## Desk + nav snippets

### Studio desk items

Paste the **singleton** into the Pages `S.list().items([...])` block in `studio/structure.ts`:

```ts
singletonWithPreview(S, 'pressPage', 'Press Page', CaseIcon),
```

Paste the **orderable collection** into the Content `S.list().items([...])` block:

```ts
orderableDocumentListDeskItem({
  type: 'pressItem',
  title: 'Press Items',
  icon: CaseIcon,
  S,
  context,
}),
```

Add this import if `CaseIcon` is not already imported from `@sanity/icons`:

```ts
import {
  // ... existing icons ...
  CaseIcon,
} from '@sanity/icons';
```

### Header nav entry

Paste inside the `NAV_ITEMS` array in `src/components/Header.astro`:

```ts
...(visible.press ? [{ kind: 'flat' as const, label: 'Press', href: '/press' }] : []),
```

---

## Verify

After completing all enable steps:

- Route `/press` renders without errors in both light and dark mode at approximately 375 px (mobile) and 1280 px (desktop) viewport widths.
- With no `pressItem` documents, `/press` shows the "Press features are on the way" empty-state panel and does not crash.
- After seeding, the three placeholder press items appear as cards with outlet name, date, quote, and link.
- The `PressStrip` logo row suppresses itself gracefully when no item has a logo image (which is the seeded state).
- `npm run typegen` and `npm run build` both pass cleanly.
- The Press nav link appears in the header and navigates to `/press`.

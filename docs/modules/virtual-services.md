> **Formerly named e-design.** This module was renamed from `e-design` to `virtual-services` to remove the service-specific vocabulary and make it applicable to any type of online or remote service offering. If you enabled the old `e-design` module, see the migration note at the bottom of this doc.

# Module: Virtual Services

**What it adds:** Route `/virtual-services` -- a service landing page for online or virtual service offerings. Sections include a hero, intro copy in Portable Text, numbered how-it-works steps, a deliverables bullet list, pricing tier cards, optional FAQ references, and a final CTA. CTAs route to `/contact?type=virtual-services`. A coming-soon holding state renders when the `virtualServicesPage` document has not yet been published. Studio schema: `virtualServicesPage` (singleton).
**Depends on (already in core):** `SectionHeading.astro`, `FinalCta.astro`, `FaqAccordion.tsx`, `PortableText.tsx`, `Hero.astro`, `getSectionVisibility` (from `@/lib/sectionVisibility`).
**Env/config:** No additional env vars beyond the standard `PUBLIC_SANITY_*` set. The `siteSettings.sectionVisibility.showVirtualServices` flag controls whether the route is accessible; unset counts as visible.

---

## Enable

Complete all seven steps in order. Run the verify steps at the end before
considering the module live.

### Step 1 -- Copy schemas into the Studio

```powershell
Copy-Item modules/virtual-services/studio/*.ts studio/schemaTypes/
```

### Step 2 -- Register schemas in `studio/schemaTypes/index.ts`

Add one import line and one array entry:

```ts
// add with the other imports, alphabetical by symbol name
import { virtualServicesPage } from './virtualServicesPage';

export const schemaTypes = [
  // ... existing object types ...

  // Singletons
  // ... existing singletons ...
  virtualServicesPage,   // <-- add here

  // Reusable content collections
  // ... (no collection schema for this module) ...
];
```

### Step 3 -- Register in `studio/structure.ts`

**a) Add `'virtualServicesPage'` to `SINGLETON_TYPES`:**

```ts
const SINGLETON_TYPES = [
  // ... existing types ...
  'virtualServicesPage',   // <-- add
] as const;
```

**b) Add `DesktopIcon` to the icon imports at the top of the file:**

```ts
import {
  // ... existing icons ...
  DesktopIcon,
} from '@sanity/icons';
```

**c) Add the Virtual Services page singleton inside the Pages list item** (after the other service pages, before the divider above Privacy):

```ts
singletonWithPreview(S, 'virtualServicesPage', 'Virtual Services Page', DesktopIcon),
```

### Step 4 -- Copy app files

```powershell
Copy-Item -Recurse -Force modules/virtual-services/src/* src/
```

### Step 4b -- Copy the co-located query file

The virtual services page imports `getVirtualServicesPage` from `@/lib/virtualServicesQueries`. Copy the co-located query file alongside the pages and components:

```powershell
Copy-Item modules/virtual-services/src/lib/virtualServicesQueries.ts src/lib/
```

### Step 5 -- Add the nav entry in `src/components/Header.astro`

Locate the `NAV_ITEMS` array (around line 112). Add the virtual services link wrapped in the `sectionVisibility` conditional:

```ts
...(visible.virtualServices ? [{ kind: 'flat' as const, label: 'Virtual Services', href: '/virtual-services' }] : []),
```

### Step 6 -- Seed placeholder content

```powershell
node modules/virtual-services/seed.mjs
```

The seeder is idempotent -- running it twice does not create duplicates. It creates one `virtualServicesPage` singleton with intro copy, three how-it-works steps, a deliverables list, and three pricing tiers (Essential, Full Package, Multi-Scope). FAQ references are left empty because FAQ item IDs are dataset-specific; add them manually in Studio after seeding.

### Step 7 -- Verify the build

```powershell
npm run typegen   # expect PASS, no type errors
npm run build     # expect PASS; /virtual-services appears in output
```

---

## Desk + nav snippets

### Studio desk item

Paste this into the Pages `S.list().items([...])` block in `studio/structure.ts`:

```ts
singletonWithPreview(S, 'virtualServicesPage', 'Virtual Services Page', DesktopIcon),
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
...(visible.virtualServices ? [{ kind: 'flat' as const, label: 'Virtual Services', href: '/virtual-services' }] : []),
```

---

## Verify

After completing all enable steps:

- Route `/virtual-services` renders without errors in both light and dark mode at approximately 375 px (mobile) and 1280 px (desktop) viewport widths.
- With no `virtualServicesPage` document published, `/virtual-services` shows the coming-soon holding state with the "Inquire about Virtual Services" button and does not crash.
- After seeding, all sections render: hero, intro, how-it-works steps, deliverables list, three pricing tier cards, and the final CTA panel.
- Every CTA button links to `/contact?type=virtual-services`.
- `npm run typegen` and `npm run build` both pass cleanly.
- The Virtual Services nav link appears in the header and navigates to `/virtual-services`.

---

## Migration from e-design

If you enabled the old `e-design` module on a live project:

1. **Studio schema:** rename the Sanity document type. In your Studio, go to the dataset management tools and rename any existing `eDesignPage` document's `_type` field to `virtualServicesPage`, or create a new document of type `virtualServicesPage` and copy the content across manually.
2. **Schema file:** replace `studio/schemaTypes/eDesignPage.ts` with `virtualServicesPage.ts` (from this module), update the import and array entry in `studio/schemaTypes/index.ts`, and update `SINGLETON_TYPES` in `studio/structure.ts`.
3. **App files:** replace `src/pages/e-design.astro` with `src/pages/virtual-services.astro` and `src/lib/eDesignQueries.ts` with `src/lib/virtualServicesQueries.ts`.
4. **Nav entry:** update the Header.astro `NAV_ITEMS` entry from `visible.eDesign` / `/e-design` to `visible.virtualServices` / `/virtual-services`.
5. **Redirects:** add a redirect from `/e-design` to `/virtual-services` in your Astro config or Cloudflare rules to preserve any existing inbound links.

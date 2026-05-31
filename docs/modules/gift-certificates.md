# Module: Gift Certificates

**What it adds:** Route `/gift-certificates` -- an inquiry-only landing page for gift certificates (no payment processing). Sections include a hero, intro paragraph, certificate option cards, numbered how-it-works steps, fine-print terms, and a final CTA. CTAs route to `/contact?type=gift-certificate`. A coming-soon holding state renders when the `giftPage` document has not yet been published. Studio schema: `giftPage` (singleton).
**Depends on (already in core):** `SectionHeading.astro`, `Hero.astro`, `getSectionVisibility` (from `@/lib/sectionVisibility`).
**Env/config:** No additional env vars beyond the standard `PUBLIC_SANITY_*` set. The `siteSettings.sectionVisibility.showGiftCertificates` flag controls whether the route is accessible; unset counts as visible.

---

## Enable

Complete all seven steps in order. Run the verify steps at the end before
considering the module live.

### Step 1 -- Copy schemas into the Studio

```powershell
Copy-Item modules/gift-certificates/studio/*.ts studio/schemaTypes/
```

### Step 2 -- Register schemas in `studio/schemaTypes/index.ts`

Add one import line and one array entry:

```ts
// add with the other imports, alphabetical by symbol name
import { giftPage } from './giftPage';

export const schemaTypes = [
  // ... existing object types ...

  // Singletons
  // ... existing singletons ...
  giftPage,   // <-- add here

  // Reusable content collections
  // ... (no collection schema for this module) ...
];
```

### Step 3 -- Register in `studio/structure.ts`

**a) Add `'giftPage'` to `SINGLETON_TYPES`:**

```ts
const SINGLETON_TYPES = [
  // ... existing types ...
  'giftPage',   // <-- add
] as const;
```

**b) Add `CreditCardIcon` to the icon imports at the top of the file:**

```ts
import {
  // ... existing icons ...
  CreditCardIcon,
} from '@sanity/icons';
```

**c) Add the Gift Certificates page singleton inside the Pages list item** (after the other service pages, before the divider above Privacy):

```ts
singletonWithPreview(S, 'giftPage', 'Gift Certificates Page', CreditCardIcon),
```

### Step 4 -- Copy app files

```powershell
Copy-Item -Recurse -Force modules/gift-certificates/src/* src/
```

### Step 4b -- Add query functions to `src/lib/queries.ts`

The gift certificates page imports `getGiftPage` from `@/lib/queries`. Add it before the press section:

```ts
// ---- Gift Certificates module -----------------------------------------------

export async function getGiftPage() {
  return sanityFetch(`*[_type == "giftPage"][0]{
    seoTitle, seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    intro,
    certificateOptions[]{title, amount, blurb},
    howItWorksSteps[]{step, title, body},
    finePrint,
    ctaLabel
  }`, {}, null);
}
```

### Step 5 -- Add the nav entry in `src/components/Header.astro`

Locate the `NAV_ITEMS` array (around line 112). Add the gift certificates link wrapped in the `sectionVisibility` conditional:

```ts
...(visible.giftCertificates ? [{ kind: 'flat' as const, label: 'Gift Certificates', href: '/gift-certificates' }] : []),
```

### Step 6 -- Seed placeholder content

```powershell
node modules/gift-certificates/seed.mjs
```

The seeder is idempotent -- running it twice does not create duplicates. It creates one `giftPage` singleton with intro copy, three certificate options (Consultation Gift, E-Design Package Gift, Custom Amount), three how-it-works steps, fine-print terms, and a CTA label.

### Step 7 -- Verify the build

```powershell
npm run typegen   # expect PASS, no type errors
npm run build     # expect PASS; /gift-certificates appears in output
```

---

## Desk + nav snippets

### Studio desk item

Paste this into the Pages `S.list().items([...])` block in `studio/structure.ts`:

```ts
singletonWithPreview(S, 'giftPage', 'Gift Certificates Page', CreditCardIcon),
```

Add this import if `CreditCardIcon` is not already imported from `@sanity/icons`:

```ts
import {
  // ... existing icons ...
  CreditCardIcon,
} from '@sanity/icons';
```

### Header nav entry

Paste inside the `NAV_ITEMS` array in `src/components/Header.astro`:

```ts
...(visible.giftCertificates ? [{ kind: 'flat' as const, label: 'Gift Certificates', href: '/gift-certificates' }] : []),
```

---

## Verify

After completing all enable steps:

- Route `/gift-certificates` renders without errors in both light and dark mode at approximately 375 px (mobile) and 1280 px (desktop) viewport widths.
- With no `giftPage` document published, `/gift-certificates` shows the coming-soon holding state with the inquiry button and does not crash.
- After seeding, all sections render: hero, intro, three option cards, how-it-works steps, fine-print text, and the final CTA panel.
- Every CTA button links to `/contact?type=gift-certificate`.
- No payment UI or external payment links are present (inquire-only framing throughout).
- `npm run typegen` and `npm run build` both pass cleanly.
- The Gift Certificates nav link appears in the header and navigates to `/gift-certificates`.

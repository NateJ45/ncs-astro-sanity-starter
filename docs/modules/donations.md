# Module: Donations

**What it adds:** Route `/donate` -- a donations landing page for organizations that accept giving through an external processor. This module makes the starter non-profit-ready. No payment processing happens on the page itself; the donate button links to a configured external URL (Donorbox, PayPal Giving Fund, Stripe, Give Lively, etc.). Sections include a hero, mission copy in Portable Text, an impact stats row (up to four stat blocks), a prominent donate CTA, an optional FAQ accordion, and a closing dark CTA panel. A coming-soon state renders when the `donationsPage` document has not yet been published. Studio schema: `donationsPage` (singleton).

This module pairs naturally with `events` (link donation campaigns to events) and `newsletter` (build a donor list). Adding `portfolio` gives impact storytelling through project case studies. Together, `donations + events + newsletter` form the **Non-profit preset** described in `docs/modules/README.md`.

**Depends on (already in core):** `SectionHeading.astro`, `Hero.astro`, `FaqAccordion.tsx`, `PortableText.tsx`, `getSectionVisibility` (from `@/lib/sectionVisibility`).
**Env/config:** No additional env vars beyond the standard `PUBLIC_SANITY_*` set. The `siteSettings.sectionVisibility.showDonations` flag controls whether the route is accessible; unset counts as visible. Set `donateUrl` in Studio before publishing; the page shows a "get in touch" fallback until a valid URL is provided.

---

## Enable

Complete all seven steps in order. Run the verify steps at the end before
considering the module live.

### Step 1 -- Copy schemas into the Studio

```powershell
Copy-Item modules/donations/studio/*.ts studio/schemaTypes/
```

### Step 2 -- Register schemas in `studio/schemaTypes/index.ts`

Add one import line and one array entry:

```ts
// add with the other imports, alphabetical by symbol name
import { donationsPage } from './donationsPage';

export const schemaTypes = [
  // ... existing object types ...

  // Singletons
  // ... existing singletons ...
  donationsPage,   // <-- add here

  // Reusable content collections
  // ... (no collection schema for this module) ...
];
```

### Step 3 -- Register in `studio/structure.ts`

**a) Add `'donationsPage'` to `SINGLETON_TYPES`:**

```ts
const SINGLETON_TYPES = [
  // ... existing types ...
  'donationsPage',   // <-- add
] as const;
```

**b) Add `HeartIcon` to the icon imports at the top of the file:**

```ts
import {
  // ... existing icons ...
  HeartIcon,
} from '@sanity/icons';
```

**c) Add the Donations page singleton inside the Pages list item** (after the other page singletons, before the divider above Privacy):

```ts
singletonWithPreview(S, 'donationsPage', 'Donations Page', HeartIcon),
```

### Step 4 -- Copy app files

```powershell
Copy-Item -Recurse -Force modules/donations/src/* src/
```

### Step 4b -- Copy the co-located query file

The donations page imports `getDonationsPage` from `@/lib/donationsQueries`. Copy the co-located query file:

```powershell
Copy-Item modules/donations/src/lib/donationsQueries.ts src/lib/
```

### Step 5 -- Add the nav entry in `src/components/Header.astro`

Locate the `NAV_ITEMS` array (around line 112). Add the donate link wrapped in the `sectionVisibility` conditional:

```ts
...(visible.donations ? [{ kind: 'flat' as const, label: 'Donate', href: '/donate' }] : []),
```

### Step 6 -- Seed placeholder content

```powershell
node modules/donations/seed.mjs
```

The seeder is idempotent -- running it twice does not create duplicates. It creates one `donationsPage` singleton with placeholder mission copy, four placeholder impact stats, a placeholder `donateUrl` pointing to `https://example.com/donate`, and closing CTA fields. Update all placeholder content and set a real `donateUrl` before publishing.

FAQ references (`faqRefs`) are left empty because FAQ item IDs are dataset-specific. Add them manually in Studio after seeding.

### Step 7 -- Verify the build

```powershell
npm run typegen   # expect PASS, no type errors
npm run build     # expect PASS; /donate appears in output
```

---

## Desk + nav snippets

### Studio desk item

Paste this into the Pages `S.list().items([...])` block in `studio/structure.ts`:

```ts
singletonWithPreview(S, 'donationsPage', 'Donations Page', HeartIcon),
```

Add this import if `HeartIcon` is not already imported from `@sanity/icons`:

```ts
import {
  // ... existing icons ...
  HeartIcon,
} from '@sanity/icons';
```

### Header nav entry

Paste inside the `NAV_ITEMS` array in `src/components/Header.astro`:

```ts
...(visible.donations ? [{ kind: 'flat' as const, label: 'Donate', href: '/donate' }] : []),
```

---

## Verify

After completing all enable steps:

- Route `/donate` renders without errors in both light and dark mode at approximately 375 px (mobile) and 1280 px (desktop) viewport widths.
- With no `donationsPage` document published, `/donate` shows the coming-soon holding state with a "Get in touch" button and does not crash.
- After seeding, all sections render: hero, mission copy, four impact stat blocks, donate CTA section, and the closing dark panel.
- The "Donate Now" button links to `donateUrl` with `target="_blank" rel="noopener noreferrer"`. When `donateUrl` is absent, a "Get in touch" fallback button appears instead.
- The FAQ section is absent when `faqRefs` is empty (which it is in the seeded state). Adding FAQ references causes the section to render.
- `npm run typegen` and `npm run build` both pass cleanly.
- The Donate nav link appears in the header and navigates to `/donate`.

### Pre-launch checklist

- [ ] Replace placeholder mission copy with real organization narrative.
- [ ] Update impact stats with accurate numbers.
- [ ] Set `donateUrl` to a real donation processor URL in Studio before publishing.
- [ ] Test the donate button opens the external processor in a new tab.

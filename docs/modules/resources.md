# Module: Resources

**What it adds:** Route `/resources` -- a hub page that collects all the studio's free tools and guides in one place. Content is managed via the `resourcesPage` singleton (hero copy, optional intro paragraph, and an ordered list of `resourceCard` inline objects). When the Sanity document has no cards, the page falls back to a hardcoded set of nav-style cards (quiz, calculator, guides, FAQ, journal) so the route is never empty. Both Sanity cards and fallback cards are filtered by `sectionVisibility` so links to disabled modules are hidden automatically.
**Depends on (already in core):** `SanityImage.astro`, `getSectionVisibility` (from `@/lib/sectionVisibility`), the `Hero.astro` layout component, and the `breadcrumbSchema` helper.
**Env/config:** None beyond the standard `PUBLIC_SANITY_*` set. The `siteSettings.sectionVisibility.showResources` flag gates the route; when `false`, `/resources` redirects to `/`.

> **Important dependency note:** Enable this module alongside at least one
> capture module (`lead-magnets`, `style-quiz`, or `budget-calculator`).
> The resources page links to those routes. If none of those modules are
> enabled, all the capture-module cards are filtered out and the page
> renders only FAQ and Journal cards (or is nearly empty). The page
> degrades gracefully -- no 404s occur -- but the links would 404 if a
> visitor reached them from an external source before the target module
> is enabled.

---

## Enable

Complete all seven steps in order. Run the verify steps at the end before
considering the module live.

### Step 1 -- Copy schemas into the Studio

```powershell
Copy-Item modules/resources/studio/*.ts studio/schemaTypes/
```

### Step 2 -- Register schemas in `studio/schemaTypes/index.ts`

Add one import line and one array entry:

```ts
// add with the other imports, alphabetical by symbol name
import { resourcesPage } from './resourcesPage';

export const schemaTypes = [
  // ... existing object types ...

  // Singletons
  // ... existing singletons ...
  resourcesPage,   // <-- add here

  // Reusable content collections
  // ... existing collections ...
];
```

### Step 3 -- Register in `studio/structure.ts`

**a) Add `resourcesPage` to `SINGLETON_TYPES`:**

```ts
const SINGLETON_TYPES = [
  // ... existing types ...
  'resourcesPage',   // <-- add
] as const;
```

**b) Add `BulbOutlineIcon` to the icon imports at the top of the file:**

```ts
import {
  // ... existing icons ...
  BulbOutlineIcon,
} from '@sanity/icons';
```

**c) Add the Resources page singleton inside the Pages list item** (after the Journal entry, before the divider above Privacy):

```ts
singletonWithPreview(S, 'resourcesPage', 'Resources Page', BulbOutlineIcon),
```

### Step 4 -- Copy app files

```powershell
Copy-Item -Recurse -Force modules/resources/src/* src/
```

### Step 4b -- Add query functions to `src/lib/queries.ts`

The resources page imports `getResourcesPage` from `@/lib/queries`. Add it before the press section:

```ts
// ---- Resources module -------------------------------------------------------

export async function getResourcesPage() {
  return sanityFetch(`*[_type == "resourcesPage"][0]{
    seoTitle, seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    intro,
    cards[]{
      title, blurb, link,
      icon${IMAGE_PROJECTION}
    }
  }`, {}, null);
}
```

### Step 5 -- Add the nav entry in `src/components/Header.astro`

Locate the `NAV_ITEMS` array (around line 112). Add the resources link, wrapped
in the `sectionVisibility` conditional:

```ts
...(visible.resources ? [{ kind: 'flat' as const, label: 'Resources', href: '/resources' }] : []),
```

Place it after the Journal entry so the nav reads: About, Services, FAQ, Journal, Resources.
If you are enabling multiple modules at once, add all their nav entries in a
single edit to `NAV_ITEMS`. A reasonable order when several modules are enabled:
Portfolio (after Services), then Journal, then Guides, then Resources.

### Step 6 -- Seed placeholder content

```powershell
node modules/resources/seed.mjs
```

The seeder is idempotent -- running it twice does not create duplicates.
It creates one `resourcesPage` singleton with a hero, intro copy, and five
starter cards pointing at `/quiz`, `/calculator`, `/guides`, `/faq`, and
`/journal`.

### Step 7 -- Verify the build

```powershell
npm run typegen   # expect PASS, no type errors
npm run build     # expect PASS; /resources appears in output
```

---

## Desk + nav snippets

### Studio desk item

Paste the **singleton** inside the Pages `S.list().items([...])` block:

```ts
singletonWithPreview(S, 'resourcesPage', 'Resources Page', BulbOutlineIcon),
```

Add this import if `BulbOutlineIcon` is not already imported from `@sanity/icons`:

```ts
import {
  // ... existing icons ...
  BulbOutlineIcon,
} from '@sanity/icons';
```

### Header nav entry

Paste inside the `NAV_ITEMS` array in `src/components/Header.astro`:

```ts
...(visible.resources ? [{ kind: 'flat' as const, label: 'Resources', href: '/resources' }] : []),
```

---

## Verify

After completing all enable steps:

- Route `/resources` renders without errors in both light and dark mode at
  approximately 375 px (mobile) and 1280 px (desktop) viewport widths.
- With no `resourcesPage` document or no cards configured in Studio, the
  fallback card set renders and the page does not crash.
- Cards pointing at modules that are off (e.g. `/quiz` when `style-quiz` is
  not enabled) do not appear -- they are filtered by `sectionVisibility`.
- `npm run typegen` and `npm run build` both pass cleanly.
- The Resources nav link appears in the header and navigates to `/resources`.

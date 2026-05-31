# Module: Shop

**What it adds:** Route `/shop` -- an affiliate "shop my favorites" surface organized into named collections. Visitors browse items grouped by collection, each card linking out to the affiliate or retailer via a correctly attributed link. Studio schemas: `shopPage` (singleton that controls the hero, FTC disclosure text, enabled flag, and collection order), `shopCollection` (orderable, named groupings such as "Workspace Picks"), and `shopItem` (orderable, individual affiliate items with product image, vendor label, optional note, and affiliate URL). A persistent FTC affiliate disclosure band is rendered above all collections as a legal requirement. Two components are added: `ShopGrid.astro` (collection renderer) and `ShopItemCard.astro` (individual item card with the required affiliate `rel` attributes).
**Depends on (already in core):** `SanityImage.astro`, `SectionHeading.astro`, `getSectionVisibility` (from `@/lib/sectionVisibility`).
**Env/config:** No additional env vars beyond the standard `PUBLIC_SANITY_*` set. The `shopPage.enabled` field controls access: when `false`, `/shop` shows a polite coming-soon message rather than a crash or a 404. The `siteSettings.sectionVisibility.shop` flag controls whether the nav link appears and whether `/shop` is accessible at all; set it to `true` to activate.

---

## Enable

Complete all seven steps in order. Run the verify steps at the end before
considering the module live.

### Step 1 -- Copy schemas into the Studio

```powershell
Copy-Item modules/shop/studio/*.ts studio/schemaTypes/
```

### Step 2 -- Register schemas in `studio/schemaTypes/index.ts`

Add three import lines and three array entries. Follow the existing grouping
comments:

```ts
// add with the other imports, alphabetical by symbol name
import { shopCollection } from './shopCollection';
import { shopItem }       from './shopItem';
import { shopPage }       from './shopPage';

export const schemaTypes = [
  // ... existing object types ...

  // Singletons
  // ... existing singletons ...
  shopPage,         // <-- add here

  // Reusable content collections
  // ... existing collections ...
  shopCollection,   // <-- add here
  shopItem,         // <-- add here
];
```

### Step 3 -- Register in `studio/structure.ts`

**a) Add `shopPage` to `SINGLETON_TYPES`:**

```ts
const SINGLETON_TYPES = [
  // ... existing types ...
  'shopPage',   // <-- add
] as const;
```

**b) Add `shopCollection` and `shopItem` to `ORDERABLE_TYPES`:**

```ts
const ORDERABLE_TYPES = [
  // ... existing types ...
  'shopCollection',   // <-- add
  'shopItem',         // <-- add
] as const;
```

**c) Add `BasketIcon` to the icon imports at the top of the file:**

`ThListIcon` is already imported for other orderable types. Add `BasketIcon`:

```ts
import {
  // ... existing icons ...
  BasketIcon,
} from '@sanity/icons';
```

**d) Add the Shop Page singleton inside the Pages list item:**

```ts
singletonWithPreview(S, 'shopPage', 'Shop Page', BasketIcon),
```

**e) Add the two orderable lists inside the Content list item:**

```ts
orderableDocumentListDeskItem({
  type: 'shopCollection',
  title: 'Shop Collections',
  icon: ThListIcon,
  S,
  context,
}),
orderableDocumentListDeskItem({
  type: 'shopItem',
  title: 'Shop Items',
  icon: BasketIcon,
  S,
  context,
}),
```

### Step 4 -- Copy app files

```powershell
Copy-Item -Recurse -Force modules/shop/src/* src/
```

### Step 4b -- Add query functions to `src/lib/queries.ts`

The shop page imports `getShopPage` from `@/lib/queries`. Add it before the press section:

```ts
// ---- Shop module ------------------------------------------------------------

export async function getShopPage() {
  return sanityFetch(`*[_type == "shopPage"][0]{
    seoTitle, seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    enabled,
    disclosure,
    intro,
    "collections": collections[]->{
      _id, title, description,
      "items": *[_type == "shopItem" && collection._ref == ^._id] | order(orderRank asc){
        _id, name, vendor, note, affiliateUrl,
        image${IMAGE_PROJECTION}
      }
    }
  }`, {}, null);
}
```

### Step 5 -- Add the nav entry in `src/components/Header.astro`

Locate the `NAV_ITEMS` array (around line 112). Add the shop link, wrapped in
the `sectionVisibility` conditional:

```ts
...(visible.shop ? [{ kind: 'flat' as const, label: 'Shop', href: '/shop' }] : []),
```

### Step 6 -- Seed placeholder content

```powershell
node modules/shop/seed.mjs
```

The seeder is idempotent -- running it twice does not create duplicates. It
creates one `shopPage` singleton (with `enabled: true` and the FTC disclosure
text), one `shopCollection` ("Studio Picks"), and three `shopItem` documents
("Adjustable Desk Lamp", "Ceramic Pour-Over Kit", "Minimal Notebook, A5") with
placeholder `example.com` affiliate URLs. Replace affiliate URLs and add real
product images via the Studio before publishing.

### Step 7 -- Verify the build

```powershell
npm run typegen   # expect PASS, no type errors
npm run build     # expect PASS; /shop appears in output
```

---

## Desk + nav snippets

### Studio desk items

Paste the **singleton** inside the Pages `S.list().items([...])` block:

```ts
singletonWithPreview(S, 'shopPage', 'Shop Page', BasketIcon),
```

Paste the **orderable collections** inside the Content `S.list().items([...])` block:

```ts
orderableDocumentListDeskItem({
  type: 'shopCollection',
  title: 'Shop Collections',
  icon: ThListIcon,
  S,
  context,
}),
orderableDocumentListDeskItem({
  type: 'shopItem',
  title: 'Shop Items',
  icon: BasketIcon,
  S,
  context,
}),
```

Add this import if `BasketIcon` is not already imported from `@sanity/icons`
(`ThListIcon` is already imported):

```ts
import {
  // ... existing icons ...
  BasketIcon,
} from '@sanity/icons';
```

### Header nav entry

Paste inside the `NAV_ITEMS` array in `src/components/Header.astro`:

```ts
...(visible.shop ? [{ kind: 'flat' as const, label: 'Shop', href: '/shop' }] : []),
```

---

## Verify

After completing all enable steps:

- Route `/shop` renders without errors in both light and dark mode at approximately 375 px (mobile) and 1280 px (desktop) viewport widths.
- The FTC affiliate disclosure band is visible above all collections (not buried in the footer or in fine print).
- Every "Shop this" link on `ShopItemCard` carries `rel="sponsored nofollow noopener"` and `target="_blank"`. Inspect the rendered HTML to confirm.
- With `shopPage.enabled` set to `false`, `/shop` shows the coming-soon message and does not crash or redirect to a 404.
- With no `shopCollection` documents referenced on `shopPage`, `/shop` shows the empty-state ("Picks are on the way.") and does not crash.
- `npm run typegen` and `npm run build` both pass cleanly.
- The Shop nav link appears in the header only when `sectionVisibility.shop` is `true`.

# Module: Lead Magnets

**What it adds:** Routes `/guides` (index of published guides) and `/guides/[slug]` (individual guide landing page with gated email-capture form and download reveal). Studio schema: `leadMagnet` (orderable collection). Visitors see a card grid of available guides on the index; each guide detail page shows a cover image, summary, and an email form that unlocks the PDF download on submit. The index and the detail route each show a neutral empty or "almost ready" state when no published guides exist -- no crash, no broken build.
**Depends on (already in core):** `subscribe.ts` (ESP + Web3Forms fallback), `SanityImage.astro`, `FinalCta.astro`, `getSectionVisibility` (from `@/lib/sectionVisibility`), the `Hero.astro` layout component, and the `breadcrumbSchema` helper.
**Env/config:** `PUBLIC_NEWSLETTER_FORM_ACTION` (or `siteSettings.newsletter.formActionUrl`) for the primary ESP endpoint; `PUBLIC_WEB3FORMS_KEY` as a fallback. Both are optional -- if neither is set, form submissions silently succeed but no subscriber is recorded. The `siteSettings.sectionVisibility.showGuides` flag gates the routes; when `false`, `/guides` redirects to `/` and `getStaticPaths` returns an empty array.

---

## Enable

Complete all seven steps in order. Run the verify steps at the end before
considering the module live.

### Step 1 -- Copy schemas into the Studio

```powershell
Copy-Item modules/lead-magnets/studio/*.ts studio/schemaTypes/
```

### Step 2 -- Register schemas in `studio/schemaTypes/index.ts`

Add one import line and one array entry:

```ts
// add with the other imports, alphabetical by symbol name
import { leadMagnet } from './leadMagnet';

export const schemaTypes = [
  // ... existing object types ...

  // Singletons
  // ... existing singletons ...

  // Reusable content collections
  // ... existing collections ...
  leadMagnet,   // <-- add here
];
```

### Step 3 -- Register in `studio/structure.ts`

**a) Add `leadMagnet` to `ORDERABLE_TYPES`:**

```ts
const ORDERABLE_TYPES = [
  // ... existing types ...
  'leadMagnet',   // <-- add
] as const;
```

**b) `BookIcon` is already imported** for the Journal section; no new icon import is needed.

**c) Add the Guides orderable list inside the Content list item** (after the other orderable items):

```ts
orderableDocumentListDeskItem({
  type: 'leadMagnet',
  title: 'Guides (lead magnets)',
  icon: BookIcon,
  S,
  context,
}),
```

### Step 4 -- Copy app files

```powershell
Copy-Item -Recurse -Force modules/lead-magnets/src/* src/
```

### Step 4b -- Add query functions to `src/lib/queries.ts`

The guides pages import `getLeadMagnets`, `getLeadMagnet`, and `getAllLeadMagnetSlugs` from `@/lib/queries`. Add them before the press section:

```ts
// ---- Lead Magnets module ----------------------------------------------------

export async function getLeadMagnets() {
  return sanityFetch(`*[_type == "leadMagnet" && published == true] | order(orderRank asc){
    _id, title, "slug": slug.current, summary,
    coverImage${IMAGE_PROJECTION}
  }`, {}, []);
}

export async function getLeadMagnet(slug: string) {
  return sanityFetch(
    `*[_type == "leadMagnet" && slug.current == $slug][0]{
      _id, title, slug, summary,
      seoTitle, seoDescription,
      coverImage${IMAGE_PROJECTION},
      file{ asset->{ url } },
      gateHeading, gateBlurb, buttonLabel, successMessage, espTag
    }`,
    { slug },
    null,
  );
}

export async function getAllLeadMagnetSlugs(): Promise<string[]> {
  const list: Array<{ slug: { current: string } }> = await sanityFetch(
    `*[_type == "leadMagnet" && published == true && defined(slug.current)]{ slug }`,
    {},
    [],
  );
  return list.map((m) => m.slug?.current).filter(Boolean);
}
```

### Step 5 -- Add the nav entry in `src/components/Header.astro`

Locate the `NAV_ITEMS` array (around line 112). Add the guides link, wrapped
in the `sectionVisibility` conditional:

```ts
...(visible.guides ? [{ kind: 'flat' as const, label: 'Guides', href: '/guides' }] : []),
```

Place it after the Journal entry so the nav reads: About, Services, FAQ, Journal, Guides.
If you are enabling multiple modules at once, add all their nav entries in a
single edit to `NAV_ITEMS`. A reasonable order when several modules are enabled:
Portfolio (after Services), then Journal, then Guides, then Resources.

### Step 6 -- Seed placeholder content

```powershell
node modules/lead-magnets/seed.mjs
```

The seeder is idempotent -- running it twice does not create duplicates.
It creates two `leadMagnet` documents ("Guide One: Getting Started" and
"Guide Two: Planning Your Budget"). Both start with `published: false`
so they do not appear on `/guides` until you upload real PDFs and flip
the toggle in the Studio.

### Step 7 -- Verify the build

```powershell
npm run typegen   # expect PASS, no type errors
npm run build     # expect PASS; /guides appears in output; /guides/[slug] generates 0 static paths (no published guides yet)
```

---

## Desk + nav snippets

### Studio desk item

Paste the **orderable collection** inside the Content `S.list().items([...])` block:

```ts
orderableDocumentListDeskItem({
  type: 'leadMagnet',
  title: 'Guides (lead magnets)',
  icon: BookIcon,
  S,
  context,
}),
```

`BookIcon` is already imported in `structure.ts` for the Journal section; no
additional import is needed.

### Header nav entry

Paste inside the `NAV_ITEMS` array in `src/components/Header.astro`:

```ts
...(visible.guides ? [{ kind: 'flat' as const, label: 'Guides', href: '/guides' }] : []),
```

---

## Verify

After completing all enable steps:

- Route `/guides` renders without errors in both light and dark mode at
  approximately 375 px (mobile) and 1280 px (desktop) viewport widths.
- With no published `leadMagnet` documents, `/guides` shows the "Guides are
  on their way" empty state and does not crash.
- With no published guides, the `[slug]` route generates 0 static paths and
  the build still succeeds (an empty `getStaticPaths` return is valid in Astro).
- After seeding and publishing at least one guide, `/guides/[slug]` generates
  a path for that guide and the landing page renders.
- A guide without a PDF file set shows the "almost ready" notice instead of
  the email form and does not crash.
- `npm run typegen` and `npm run build` both pass cleanly.
- The Guides nav link appears in the header and navigates to `/guides`.

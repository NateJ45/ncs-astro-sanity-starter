# Module: <Name>

**What it adds:** <routes the visitor can reach, schemas that appear in Studio, brief description of what the visitor sees>
**Depends on (already in core):** <shared components and helpers from the core, e.g. `SanityImage`, `subscribe.ts`, `getSectionVisibility`, layout components>
**Env/config:** <env vars required beyond the standard `PUBLIC_SANITY_*` set, or siteSettings flags, or "none">

---

## Enable

Complete all seven steps in order. Run the verify steps at the end before
considering the module live.

### Step 1 -- Copy schemas into the Studio

```powershell
Copy-Item modules/<name>/studio/*.ts studio/schemaTypes/
```

If the module has no schemas (e.g. newsletter), skip this step.

### Step 2 -- Register schemas in `studio/schemaTypes/index.ts`

For each `.ts` file copied in Step 1, add one import line and one entry in the
`schemaTypes` array. Follow the existing grouping comments:

- Embedded object types (used as fields inside other documents) go in the
  **Object types** group, **before** any document types that reference them.
- Singleton page schemas go in the **Singletons** group.
- Collection schemas go in the **Reusable content collections** group.

Example additions for a module that exports `fooPage` (singleton) and `fooItem`
(collection):

```ts
// add with the other imports, alphabetical by symbol name
import { fooItem } from './fooItem';
import { fooPage } from './fooPage';

export const schemaTypes = [
  // ... existing object types ...

  // Singletons
  // ... existing singletons ...
  fooPage,       // <-- add here

  // Reusable content collections
  // ... existing collections ...
  fooItem,       // <-- add here
];
```

### Step 3 -- Register in `studio/structure.ts`

Depending on what this module introduces, update one or more of the following:

**a) Singleton page -- add to `SINGLETON_TYPES`:**

```ts
const SINGLETON_TYPES = [
  // ... existing types ...
  'fooPage',   // <-- add
] as const;
```

Then add a `singletonWithPreview(...)` call inside the **Pages** list item:

```ts
// inside the Pages S.list().items([...]) block
singletonWithPreview(S, 'fooPage', '<Label>', <Icon>),
```

Import the icon from `@sanity/icons` if it is not already imported.

**b) Orderable collection -- add to `ORDERABLE_TYPES`:**

```ts
const ORDERABLE_TYPES = [
  // ... existing types ...
  'fooItem',   // <-- add
] as const;
```

Then add an `orderableDocumentListDeskItem` call inside the **Content** list item:

```ts
// inside the Content S.list().items([...]) block
orderableDocumentListDeskItem({
  type: 'fooItem',
  title: '<Label>',
  icon: <Icon>,
  S,
  context,
}),
```

**c) Standard (non-orderable) collection -- no array update needed**, just add
inside the **Content** list item:

```ts
S.documentTypeListItem('fooItem').title('<Label>').icon(<Icon>),
```

**d) Completely standalone section -- add a new top-level section** (with its
own `S.listItem(...)` and nested list) after the existing Journal section and
before the safety-net spread.

> See the exact desk snippet for this module in the **Desk + nav snippets**
> section below.

### Step 4 -- Copy app files

```powershell
Copy-Item -Recurse -Force modules/<name>/src/* src/
```

This drops the module's pages and components into the Astro source tree. Astro
picks up new routes automatically by file path.

### Step 5 -- Add the nav entry in `src/components/Header.astro`

Locate the `NAV_ITEMS` array (around line 112). Add the flat link entry,
wrapped in a `sectionVisibility` conditional if this module has a visibility flag
in `siteSettings`:

```ts
// with a visibility flag (preferred for toggleable modules):
...(visible.<flagName> ? [{ kind: 'flat' as const, label: '<Label>', href: '/<route>' }] : []),

// without a visibility flag (always-on once enabled):
{ kind: 'flat' as const, label: '<Label>', href: '/<route>' },
```

> The exact snippet for this module is in the **Desk + nav snippets** section below.

### Step 6 -- Seed placeholder content

```powershell
node modules/<name>/seed.mjs
```

The seeder is idempotent -- running it twice does not create duplicates. If the
module has no schemas (e.g. newsletter), no seeding is needed.

### Step 7 -- Verify the build

```powershell
npm run typegen   # expect PASS, no type errors
npm run build     # expect PASS, module route(s) appear in output
```

---

## Desk + nav snippets

### Studio desk item(s)

Paste this into `studio/structure.ts` at the location described in Step 3:

```ts
// TODO: paste the exact S.listItem(...) or singletonWithPreview(...) or
// orderableDocumentListDeskItem(...) call for this module here.
// Include any required icon imports.
```

### Header nav entry

Paste this into the `NAV_ITEMS` array in `src/components/Header.astro`:

```ts
// TODO: paste the exact flat-link entry (with or without visibility conditional)
// for this module here.
```

---

## Verify

After completing all enable steps:

- Route `/<route>` renders without errors in both light and dark mode at
  approximately 375 px (mobile) and 1280 px (desktop) viewport widths.
- With no seeded content, `/<route>` shows its empty or coming-soon state and
  does not crash.
- `npm run typegen` and `npm run build` both pass cleanly.
- The nav link appears in the header and navigates to the correct route.

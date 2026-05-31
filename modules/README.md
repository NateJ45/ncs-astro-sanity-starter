# Modules

Every feature that a client may or may not need lives in its own folder here.
Modules are **OFF by default**. The starter ships with none of them enabled;
a project enables only the ones that client actually needs.

---

## Required folder shape

Every module must follow this layout exactly:

```
modules/<name>/
  studio/            # Sanity schema .ts files this module registers (may be empty)
  src/
    pages/           # .astro route files this module adds to the site
    components/      # React islands (.tsx) and .astro components this module owns
  seed.mjs           # idempotent neutral placeholder-content seeder
  README.md          # one paragraph: what it is, what core deps it relies on
```

### Ownership rule

A module owns **only** files that are unique to it. Anything shared with the
core (layout components, design tokens, GROQ helpers, `SanityImage`, `subscribe.ts`,
`sectionVisibility`, etc.) stays in the core and is listed under **Depends on** in
the module's `README.md`. Never copy core files into a module folder.

---

## How modules are registered

When a module is enabled for a project, four areas of the codebase must be
updated. The per-module enable doc at `docs/modules/<name>.md` gives the exact
snippets; this section explains the general mechanism so you understand what is
happening and why each step is necessary.

### 1. Schemas (`studio/schemaTypes/index.ts`)

Each schema the module defines must be imported and added to the `schemaTypes`
export array. Embedded object types (used as fields inside documents) must appear
**before** the document types that reference them. The array order does not affect
Studio functionality, but the comment groups ("Object types", "Singletons",
"Reusable content collections") should be respected so the file stays readable.

### 2. Desk structure (`studio/structure.ts`)

Two arrays control how documents surface in the Studio sidebar:

- `SINGLETON_TYPES` -- document types for which there is exactly one document
  (page singletons). Adding a type here prevents the Studio from offering a "New"
  button. Singleton page editors are placed inside the **Pages** list item.
- `ORDERABLE_TYPES` -- document types that use the orderable-document-list plugin
  for drag-to-reorder. These get an `orderableDocumentListDeskItem` call inside
  the **Content** list item.

Standard collection types (not orderable, not singleton) go into the **Content**
list item using `S.documentTypeListItem(...)`. Any type not listed in the
`HIDDEN_FROM_DEFAULT` set (which is derived from both arrays plus a few explicit
types) will float loose at the desk root, so every module type must be placed
explicitly.

### 3. App routes and components (`src/`)

Pages and components are copied from `modules/<name>/src/` into the matching
paths under `src/`. Astro discovers routes by file path automatically; no
registration step is needed beyond the file being present.

### 4. Nav entry (`src/components/Header.astro`)

Module routes are intentionally absent from the core nav. After enabling a
module, add the appropriate entry to the `NAV_ITEMS` array in `Header.astro`.
Most module routes are flat links; the per-module enable doc shows the exact
snippet to paste.

The header already reads `sectionVisibility` flags from `siteSettings`. If the
module has a corresponding flag (portfolio, shop, guides, etc.), wrap the nav
entry in the same conditional pattern the Journal entry uses:

```ts
...(visible.portfolio ? [{ kind: 'flat' as const, label: 'Portfolio', href: '/portfolio' }] : []),
```

---

## Verify an enable

Use this loop to confirm a module works before committing it to a project
branch. The goal is to test the enable fully and then return the starter to its
modules-OFF state so the working tree is clean.

1. Work on a scratch branch (`git checkout -b scratch/test-<name>`) or stash
   uncommitted changes (`git stash -u`) to create a clean baseline.
2. Follow the enable steps in `docs/modules/<name>.md` exactly.
3. Run `npm run typegen` -- expect PASS with no type errors.
4. Run `npm run build` -- expect PASS; the module's route(s) should appear in
   the build output list.
5. Start the dev server (`npm run dev`) and open each route the module adds.
   Check light mode and dark mode at approximately 375 px and 1280 px viewport
   widths.
6. With no seeded content (before running `seed.mjs`), confirm the route shows
   its empty/coming-soon state and does **not** crash or produce a runtime error.
7. Optionally run `node modules/<name>/seed.mjs` and reload to verify the seeded
   content renders correctly.
8. Return the starter to its modules-OFF state:
   ```powershell
   git restore .
   git clean -fd src studio
   ```
   Or, if you were on a scratch branch: `git checkout main` and delete the branch.

---

## Module index

For a full list of available modules, their routes, and preset combinations, see
`docs/modules/README.md`.

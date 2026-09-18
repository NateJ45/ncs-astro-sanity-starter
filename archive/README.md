# archive/

Work the starter no longer ships, kept because deleting it would throw away
something that was written and reviewed, not because anything depends on it.

Nothing here is wired to anything. No build step reads this folder, no test
walks it, `npm run scaffold --list` does not see it, `npm run sync-check` does
not compare it, and Prettier and ESLint both skip it. A file in here cannot
break a build, and it also cannot be trusted to still work.

---

## archive/modules/ - the eleven modules nobody enabled

Added 2026-09-18.

The starter shipped thirteen opt-in modules under `modules/`. Measured across
the whole site family, exactly one repo had ever enabled any of them:
presacademy uses `events` and `resources`. The other eleven had never been
turned on anywhere, in any repo, at any point. They were carrying real weight
anyway: eleven folders of pages, islands, schemas and seeders that every
`grep`, every "what does this repo contain" question and every new-project
conversation had to step over, plus eleven reserved slugs in
`src/lib/reservedSlugs.ts` guarding routes the starter never served.

So they moved here and `events` and `resources` stayed in `modules/`. Each
module kept its own folder and its per-module guide travelled with it, so
`archive/modules/shop/` holds both the code and `shop.md`.

Archived: `budget-calculator`, `donations`, `gift-certificates`,
`lead-magnets`, `newsletter`, `portfolio`, `press`, `shop`, `style-quiz`,
`team`, `virtual-services`.

### Bringing one back

A module was never more than a folder to copy, so restoring one is the reverse
of archiving it. Nothing about the archive is special; the only real work is
the last step.

1. `git mv archive/modules/<name> modules/<name>` and
   `git mv modules/<name>/<name>.md docs/modules/<name>.md`.
2. Read `docs/modules/README.md` and that module's own guide, then follow the
   enable steps in it: copy the pages, components and `src/lib/<name>Queries.ts`
   into `src/`, copy the schema files into `src/sanity/schemaTypes/`, register
   them in `src/sanity/schemaTypes/index.ts`, and switch the module on in
   `siteSettings.sectionVisibility`.
3. Add the module's route to `src/lib/reservedSlugs.ts` so a custom `page`
   document cannot shadow it, to `tests/routes.ts` so the smoke, axe and reflow
   suites cover it, and to the `url` list in `lighthouserc.json`.
4. **Expect it to need work.** These modules were last built against the
   starter as it stood before 2026-09-18 and nothing has type-checked them
   since. The core they import from has moved: the page-builder block library,
   the preview stack and the scaffold markers all changed underneath them. Run
   `npm run check` and `npm run build` and read the errors as a to-do list
   rather than as a surprise.
5. While you are there, give the module its own scaffold markers
   (`scripts/scaffold.mjs` documents the four kinds). A capability that arrives
   without them is one the next fork has to remove by hand.

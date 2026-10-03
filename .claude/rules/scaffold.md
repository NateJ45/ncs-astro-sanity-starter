---
paths:
  - 'scripts/scaffold.mjs'
  - 'scripts/seed-core.mjs'
  - 'modules/**'
  - 'archive/**'
  - 'src/sanity/schemaTypes/**'
  - 'src/sanity/structure.ts'
  - 'tests/routes.ts'
  - 'docs/modules/**'
---

# Scaffold markers, seeding, modules and archive (rule 14)

Loads when you add or remove a capability, touch the seeder, or work in modules/ or archive/. Moved verbatim from CLAUDE.md.

14. **A capability is added with its scaffold markers in the same commit, or the scaffold silently leaves it behind.** This is the one rule on this list whose failure is invisible: `npm run scaffold -- --remove` reports success and exits 0 having removed only what was marked, so an unmarked route, schema, seed row or registry entry stays in a fork that asked for it to be gone, and the first sign of it is an error in the Studio that the build passed. Marking is cheap the day you write the thing and archaeology a month later, when the dozen generic registries that must all agree have each moved on. `scripts/scaffold.mjs` documents the four kinds of marker; the two that bite are that **a marker must not sit inside a block** (blocks never nest, so mark whole regions first and only then what is left outside them) and that **inside an Astro template you must use `{/* scaffold: name */}`**, because below the frontmatter fence a `//` is text and renders onto the page. Two more habits that go with the rule: **commit the markers before you test a removal** (`git checkout -- .` to undo the test is how an hour of uncommitted marking gets thrown away, and the next run then reports success while silently removing only what was committed), and prove the capability by actually running `--remove <name> --write`, then typegen, `astro check`, build and the unit tests, then discarding.

## Seeding and scaffold commands

- `npm run seed` runs `scripts/seed-core.mjs`. It creates or replaces the core singletons (`siteSettings`, `homePage`, `aboutPage`, `servicesPage`, `processPage`, `faqPage`, `contactPage`, `journalPage`, `privacyPage`, `notFoundPage`, `studioGuide`, `studioNotes`) and the seed collection docs (services, processSteps, testimonials, philosophyPoints, journalCategories, journalEntries, faqItems). Requires `PUBLIC_SANITY_PROJECT_ID` and `SANITY_API_WRITE_TOKEN` in `.env`. Idempotent: uses `createOrReplace` with deterministic `_id` values so re-running is safe. Two things about its CONTENT, both load-bearing:
  - **Every seeded string reads as a placeholder, and that is a rule** (PORTS.md card 44). It either says "replace this" in so many words or is structurally neutral ("Step two (replace me)", "How long it takes"). It used to be plausible copy for an interior-design studio, down to real prices and budget brackets, and a fork could ship somebody else's trade by not noticing: good copy for the wrong business looks exactly like copy, while an obvious placeholder cannot be shipped by accident. The privacy policy and the Studio help documents are the two deliberate exemptions.
  - **Each section is scaffold-marked**, so `--remove faq` takes the FAQ page and its questions out of the seeder too. Markers never nest, so a section carries the ONE capability that owns the page it seeds; the note at the top of the file explains the one combination that leaves a stray block in the dataset and why that is the right boundary.
- `npm run scaffold` runs `scripts/scaffold.mjs`, the capability remover. Its own flags need npm's `--` separator in front of them: `npm run scaffold` (or `-- --list`) prints what can go; `-- --remove <name>` prints the plan; `-- --remove <name> --write` applies it. It is DRY BY DEFAULT and never touches the Sanity dataset. Run `npm run typegen && npm run build && npm run test:unit` after a removal, which is what it prints. See rule 14 and the marker documentation at the top of the script.

## Modules and archive

Additional routes come from opt-in modules staged under `modules/` (OFF by default), documented under `docs/modules/`. **There are two: `events` and `resources`.** The other eleven moved to `archive/modules/` on 2026-09-18 because, measured across the whole family, presacademy is the only repo that has ever enabled a module and it uses exactly those two. Nothing is deleted; `archive/README.md` says how to bring one back and warns that nothing has type-checked that code since it was set down. A module that comes back, or a new one, carries its own scaffold markers from the first commit (see rule 14).

**Modules:** files under `modules/` each contain a page, islands, schema additions, and a co-located query file (`modules/<name>/src/lib/<name>Queries.ts`). Enabling a module is copy-a-folder: copy the module folder into `src/` and `src/sanity/schemaTypes/`, register the schema in `src/sanity/schemaTypes/index.ts`, and toggle it on in `siteSettings.sectionVisibility`. The co-located query file means no hand-pasting into core `queries.ts`. Per-module guides are in `docs/modules/`. Do not edit module internals without reading its doc first. Two modules are staged (`events`, `resources`); the other eleven are in `archive/modules/` and `archive/README.md` covers restoring one.

**`archive/`:** retired work, kept but not maintained. Nothing wires it, `tsconfig.json`, `.prettierignore` and `eslint.config.js` all skip it explicitly, and `npm run scaffold` does not walk it. A file in there cannot break a build and also cannot be trusted to still work.

# NCS Astro + Sanity Starter: CLAUDE.md

Always-loaded rules for `ncs-astro-sanity-starter`. This file stays under 200 lines on purpose. File-specific rules live in `.claude/rules/*.md` and load only when you touch matching files; long reference lives in `docs/claude/` and `docs/agent/` and is read on demand. The docs map at the bottom lists every one of them.

**Read `docs/PENDING.md` early in a session.** It is the live registry of open loops: queued work, known gaps, and waiting-on-a-human items. If you finish or discover one, update it in the same commit.

Companion tactical runbook: `OPERATIONS.md`. New-project setup entry point: `docs/bootstrap/NEW-PROJECT.md`, rewritten 2026-09-18 from the order the Stone Steps build actually followed; it is the start for any team adapting this starter for a new client, and `docs/bootstrap/setup-checklist.md` is its sign-off. Cross-repo shared-improvement registry: `PORTS.md` (see Ports below).

Design context: `PRODUCT.md` and `DESIGN.md` at the repo root are neutral PLACEHOLDERS describing the starter's defaults, not any client; a fork rewrites both (see rule 11).

## What this is

A production-ready **Astro 7 + Sanity v6 + Cloudflare Workers** site template, forked from the Reid Design build. **Page-builder-first**: home, about, services and process render through `SectionRenderer` from Sanity `pageBuilder` arrays, and any Studio page gets a `/[slug]` route. A new project pours in a brand (`brand/brand.config.json` then `npm run apply-brand`) and content. It ships FULL and subtracts: `npm run scaffold` removes the seven capabilities (`about`, `faq`, `journal`, `philosophy`, `process`, `services`, `testimonials`). Full overview and stack notes: `docs/claude/overview.md`.

The must-knows:

- TypeScript strict, `output: 'static'` with a handful of SSR routes (`/preview/**`, `/api/draft-mode/*`). Node 22.12+. Tailwind 4 via `@tailwindcss/vite` (no `tailwind.config.mjs`; tokens in `@theme` in `src/styles/globals.css`). React 19 islands only where interactive.
- The Sanity Studio is **embedded at `/studio`**. There is no separate studio dev server or deploy. Never run `npx sanity deploy`.
- `sanityFetch(query, params, fallback)` in `src/lib/sanity.ts` is the single chokepoint for Sanity reads; with no project configured it returns the fallback, so `npm run build` works on a fresh clone.
- Hosting is **Cloudflare Workers**, not Pages. Deploy with `npm run deploy` (`wrangler deploy -c dist/server/wrangler.json`). A bare `wrangler deploy` 404s every sub-route.

## Commands

- `npm run dev`: dev server on :4321, Studio at `/studio`.
- `npm run typegen`: regenerate Sanity types. Run after ANY schema change, before `npm run build`. `npm run build:full` chains both.
- `npm run build`: `node scripts/with-workerd.mjs astro build`. Does NOT chain typegen.
- `npm run check` (`astro check && npm run lint`) is the fast gate; `npm run check:full` is typegen, build and unit tests.
- `npm run test:unit` (node --test, `src/lib/*.test.ts`; four are GATES: `theme-tokens`, `layout-variants`, `section-fields`, `site-layout`). `npm test` is the Playwright suite. Also `npm run format:check` and `npm run check:links`.
- `npm run parity list | capture | compare [page]`: rendered-HTML parity. Build first. Use on any render-neutral change.
- `npm run preview`: `wrangler dev` on the last build; the only way to exercise SSR routes locally.
- `npm run references -- <urls>` (reference screenshots into `docs/references/`), `npm run directions:shoot -- <folder>` (390/768/1280 shots of design-direction mockups), and the `/design-directions` command: see "Design flow" below.
- `npm run apply-brand`, `npm run seed`, `npm run scaffold`, `npm run audit:studio`, `npm run og`, `npm run sync-check [site-repo]`, `npm run free-dist`: see `docs/claude/build-and-scripts.md` (seed and scaffold detail in `.claude/rules/scaffold.md`).

## Branch, CI and deploy

- Work on a branch and open a PR; `main` is production. CI (`ci.yml`) runs on every push and PR, in two parallel jobs: `check`, `check:full`, `format:check`, `check:links` and `npm test` (Playwright); `lighthouse.yml` runs `npx lhci autorun` separately. Parity is deliberately a local gate.
- `deploy.yml` ships production on a push to `main` (docs-only paths, including `CLAUDE.md`, are ignored), on the Sanity publish webhook (`repository_dispatch`) and on manual dispatch. It will not deploy if the unit tests fail.
- Content is statically built: a Sanity edit goes live only after a rebuild (rule 6).

## Rules that bite

Numbering is load-bearing; other docs cite it. Rules 1 to 7 and 10 are in full below. The rest are one-liners; the full text loads from the file named when you touch matching files, or read it directly.

1. **Never click "Remove field" in the Studio.** It deletes that field's data across every document and cannot be undone without a dataset restore. It appears when the Studio's schema is older than the data. Since the Studio is embedded (it ships with the site build) the sequence after a schema change is: edit schema, `npm run typegen`, commit, deploy. There is no separate `studio:deploy` step any more.
2. **No em-dashes in public-facing site copy** (the text visitors read: page copy, component text, Sanity content). Use commas, colons, or restructure. Code comments, commit messages, plans, specs, and internal docs are exempt.
3. **Build in both light AND dark mode** on every UI change. Detail in `docs/agent/theme-and-color.md`.
4. **Desktop nav is server-rendered** in `Header.astro`. Do not regress it to a client-only island. Detail in `docs/agent/page-architecture.md`.
5. **The Lenis scroll reset on navigation** (forward goes to top, back/forward restores) lives in the BaseLayout Lenis init. Do not remove it. Detail in `docs/agent/polish-layer.md`.
6. **Content is statically built.** A Sanity edit only goes live after a rebuild (push to `main`, or the publish webhook). Detail in `docs/agent/deployment.md`.
7. **After any schema change, run `npm run typegen` before `npm run build`.** `npm run build` runs `astro build` only and does not chain typegen. Use `npm run build:full` to run both in sequence. `src/lib/sanity.types.ts` is committed so collaborators can read schema types in code without running typegen.
8. **Astro, adapter, wrangler, React and Sanity versions are a MATCHED SET; never bump one in isolation, never run `npm audit fix --force`. Never delete or regenerate `package-lock.json`; use `npm ci` for anything you reason from.** Pins and reasons: `.claude/rules/dependencies.md`. Curling a page is not verifying it.
   8b. **A new logic-driving dropdown field goes into `NON_STEGA_FIELDS`** in `src/lib/cms-preview.ts` in the same commit, or the preview renders the wrong branch. Full text: `.claude/rules/sanity-schema.md`.
9. **Blocks carry no colour/surface field;** `SectionRenderer` owns the cadence, and `section-fields.test.ts` fails if one appears. Full text: `.claude/rules/sanity-schema.md`.
10. **The reserved-slug guard lives inside `getStaticPaths` in `[slug].astro`,** not at module scope. This is an Astro isolated-scope requirement; shared list is in `src/lib/reservedSlugs.ts`. If you move the guard outside `getStaticPaths`, it silently stops working.
11. **Fork residue:** this starter came from a client build, so check defaults for wrong nouns, logos and palettes (PORTS.md card 44). Full text: `.claude/rules/brand-reskin.md`.
12. **`apply-brand` does not install font packages;** `npm install @fontsource/...` first. Full text: `.claude/rules/brand-reskin.md`.
13. **Run `npm run build` after `apply-brand`.** Full text: `.claude/rules/brand-reskin.md`.
14. **A capability is added with its scaffold markers in the same commit,** or `npm run scaffold -- --remove` silently leaves it behind. Full text: `.claude/rules/scaffold.md`.
15. **Anything computable from data is derived at build time,** never stored as a field an editor can retype. Full text: `.claude/rules/sanity-schema.md`.
16. **Retiring data is a backup-then-delete script, run dry first,** never a raw delete. Full text: `.claude/rules/data-scripts.md`.
17. **One grammar per page:** one heading system, one left edge, one button family. Full text: `.claude/rules/ui-grammar.md`.
18. **Layout variants are a config axis** (`brand.config.json` `layout`: header, hero, density, cards); a default emits nothing, so existing sites do not move. Full text: `.claude/rules/brand-reskin.md`.

## Design flow

A new brand goes **brief -> references -> design-directions -> reskin**, in that order, so a site does not come out as the last site in new colours. Brief: `docs/templates/design-brief.md` (becomes PRODUCT.md / DESIGN.md). References: `npm run references`. Directions: `/design-directions` (3 or 4 static mockups that must differ in layout, type, density and imagery; Nathan picks one and the pick is recorded as a dated entry). Reskin: the reskin skill, which reads that entry. `brand.config.json` carries colours, fonts, radius and four coarse layout slots only (card 72). Full rules: `.claude/rules/design-flow.md`.

## Live draft preview

The `/preview/**` stack (second Sanity client with stega, SSE proxy, instant text, morph refresh, in-canvas controls) is the most fragile area. Never compare or measure a stega-encoded string, never poll instead of the SSE proxy, `/preview/**` must send `Cache-Control: no-store`, and the `/preview/live` listen must stay `visibility: 'query'`. Everything else is in `.claude/rules/preview-stack.md`, which loads when you touch preview files; read PORTS.md cards 29-29d before touching the refresh loop.

## Code conventions and Working with Claude

Shared by every site repo in the family, so they live in one PORTABLE file imported here (it is expanded into context at launch, so this saves lines in this file, not tokens): the code conventions (strict TypeScript, header comments, Astro and React islands, images, Tailwind) and the working-with-Claude habits (desktop app, Plan Mode, confirm before installing, describe design in plain language, verify in a real browser).

@docs/claude/family-conventions.md

## Visual verification

Every UI change is verified rendered, in light AND dark, at ~375px and ~1280px, with hover/focus/active states and the neighbouring sections checked, before it is reported done. Use the Playwright MCP; for Studio changes open `/studio` in a real browser and read the console. Full loop: `docs/claude/visual-verification.md`.

## Style

Warm, conversational, step-by-step for processes. No em-dashes in public-facing site copy (rule 2). No AI-tell phrases (delve, leverage, robust, seamless and the rest) and no filler openers or closers. The full lists and the site copy voice are in `docs/claude/communication-style.md`.

## Edit zones

Files are either safe to edit by hand (`docs/claude/safe-to-edit.md`) or foundation (`.claude/rules/foundation-files.md`, loads when you touch one). A change to the foundation set is a planned session, and this doc is updated when the architecture shifts.

## Vault

Business context and decisions live in the studio vault, not here: `_vault/clients/ncs-starter.md` at the Projects root (internal; no Work log rows). Read its `## Current state` first. Update repo docs in the same piece of work as any change; repo docs stay in the repo, and no vault notes are created inside this repo.

## Ports

This repo owns `PORTS.md`, the registry of improvements shared across the site family, and the files marked `PORTABLE:`. A generalising fix gets a port card in the same commit that generalises it. Changing a marked file changes the family's copy, so keep it general. Cross-project lessons go to `_vault/gotchas/` with a "Ported to" checklist, ticked only when verified in that repo. Run `npm run sync-check` for drift. Full working rules: `.claude/rules/library-of-record.md`.

## Docs map

Path-scoped rules (`.claude/rules/`, load when matching files are touched):

- `preview-stack.md`: the live draft preview stack.
- `dependencies.md`: rule 8, the matched dependency set.
- `sanity-schema.md`: rules 1, 8b, 9, 10, 15.
- `brand-reskin.md`: rules 11 to 13 and 18 (layout variants).
- `scaffold.md`: rule 14, seeding, scaffold, modules and archive.
- `data-scripts.md`: rule 16.
- `ui-grammar.md`: rule 17.
- `foundation-files.md`: the edit-with-care file list.
- `library-of-record.md`: PORTS.md, PORTABLE markers, sync-check.
- `design-flow.md`: brief, references, design-directions, reskin.

Reference (`docs/claude/`, read when the task needs it):

- `family-conventions.md`: PORTABLE, imported above; the text shared by every site repo.
- `overview.md`: full about and stack essentials.
- `build-and-scripts.md`: every npm script and test suite.
- `routes.md`: the routes table.
- `safe-to-edit.md`: files safe to edit by hand, script accent opt-in.
- `visual-verification.md`: the screenshot loop.
- `communication-style.md`: style rules and site copy voice.
- `topic-index.md`: index of the `docs/agent/` deep-dives (stack, theme, components, SEO, performance, Sanity, deployment).

See `OPERATIONS.md` for the tactical playbook (deploy, patch content, run audits, common gotchas).

# Astro + Sanity Starter — Module Library Polish Implementation Plan (Phase 2 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the code staged in `modules/` during Phase 1 into a clean, opt-in module library where each module enables into the core with a documented, repeatable procedure and degrades to a tasteful coming-soon state when unconfigured.

**Architecture:** Define one **module contract** (the folder shape, the enable-doc template, and the verification recipe every module follows), then apply it to each module. Modules stay OFF in the starter; enabling = copy files into `src`/`studio`, register, seed. A future project enables only the modules that client needs.

**Tech Stack:** Same as Phase 1 (Astro 6.3 static, Sanity v5, Tailwind 4, React 19 islands, shadcn/ui, Cloudflare Workers).

**Prerequisite:** Phase 1 complete. `modules/<name>/` exists for: `portfolio`, `process`, `newsletter`, `lead-magnets`, `style-quiz`, `budget-calculator`, `shop`, `e-design`, `gift-certificates`, `press`, `resources`. The core builds and is brand-neutral.

**Verification model:** For each module the gate is: enabling it per its doc into a clean core results in `npm run typegen` PASS, `npm run build` PASS, the route renders in both themes at both viewports, and with NO content the page shows a coming-soon empty state rather than a crash or a blank. Then disable (git restore) so the starter ships with modules OFF. Commit after every task.

---

## Stage A — The module contract

### Task 1: Define the module folder shape, the enable-doc template, and the verify recipe

**Files:**
- Create: `modules/README.md`
- Create: `docs/modules/_TEMPLATE.md`
- Create: `docs/modules/README.md` (index)

- [ ] **Step 1: Write `modules/README.md` describing the required folder shape**

Every `modules/<name>/` must contain:

```
modules/<name>/
  studio/            # schema .ts files this module registers
  src/
    pages/           # .astro routes this module adds
    components/      # islands/.astro this module owns
  seed.mjs           # idempotent placeholder-content seeder (neutral, no Reid)
  README.md          # one-paragraph: what it is, what it depends on
```

Rule: a module owns only files unique to it. Anything shared with the core stays in core and is listed under "Depends on" in the module README, never copied.

- [ ] **Step 2: Write the enable-doc template `docs/modules/_TEMPLATE.md`**

```markdown
# Module: <Name>

**What it adds:** <routes, schemas, what the visitor sees>
**Depends on (already in core):** <shared lib/components, e.g. SanityImage, subscribe.ts>
**Env/config:** <env vars or siteSettings flags, or "none">

## Enable

1. Copy schemas:
   `Copy-Item modules/<name>/studio/*.ts studio/schemaTypes/`
2. Register in `studio/schemaTypes/index.ts`: add `import { <type> } from './<type>'` and add `<type>` to the `schemaTypes` array (collections after singletons).
3. Register in `studio/structure.ts`: add to `SINGLETON_TYPES` / `ORDERABLE_TYPES` as noted, and add the desk list item(s) shown below.
4. Copy app files:
   `Copy-Item -Recurse modules/<name>/src/* src/`
5. Add the nav entry in `src/components/Header.astro`: `<link/dropdown item as shown>`.
6. Seed placeholder content: `node modules/<name>/seed.mjs`
7. `npm run typegen && npm run build` — expect PASS.

## Desk + nav snippets
<exact structure.ts list item and Header.astro entry to paste>

## Verify
- Route `<path>` renders in light + dark at 375px and 1280px.
- With the seed removed, `<path>` shows its coming-soon empty state, not a crash.
```

- [ ] **Step 3: Write the verify recipe (shared by every module task)**

Add to `modules/README.md` a "Verify an enable" section with the exact loop:

```
1. git stash -u  (clean slate)  — or work on a scratch branch
2. Follow docs/modules/<name>.md Enable steps 1-7
3. npm run typegen   -> PASS
4. npm run build     -> PASS, route appears in build output
5. dev server: open the route, light+dark, 375px+1280px
6. delete the seeded doc(s) in Studio (or skip step 6 of enable), reload -> coming-soon state
7. git restore . ; git clean -fd src studio  (return starter to modules-OFF)
```

- [ ] **Step 4: Write `docs/modules/README.md` index**

List all 11 modules with a one-line description and a link to each enable doc, plus a "creative-studio preset = portfolio + process" note and a "capture preset = newsletter + lead-magnets + resources (+ quiz/calculator)" note.

- [ ] **Step 5: Commit**

```powershell
git add modules/README.md docs/modules/_TEMPLATE.md docs/modules/README.md
git commit -m "docs: module contract, enable-doc template, and verify recipe"
```

---

## Stage B — Apply the contract per module

Each task below: (a) finalize the module folder to the contract shape, (b) write `docs/modules/<name>.md` from the template with the module's real values, (c) write/genericize `modules/<name>/seed.mjs` with neutral placeholder content, (d) run the verify recipe, (e) restore to modules-OFF, (f) commit. The per-module specifics are listed; the procedure and verify commands are the contract from Task 1.

### Task 2: portfolio

**Module specifics:**
- Schemas: `portfolioPage` (singleton), `project` (orderable collection).
- Routes: `/portfolio`, `/portfolio/[slug]`, `/portfolio/before-after`.
- Components owned: `BeforeAfterSlider.tsx`, `ProjectGallery.tsx`, `PortfolioCursor.tsx`, `PortfolioFilterChips.tsx`, `CaseStudyTOC.tsx`, `StickyCTAChip.tsx`, `ProjectMetaBand.astro`.
- Depends on (core): `SanityImage.astro`, `SectionHeading.astro`, `FinalCta.astro`, the `[data-stagger-grid]` and `.img-zoom/.img-tint` polish utilities, `sectionVisibility`.
- structure.ts: `portfolioPage` -> `SINGLETON_TYPES` + a Pages desk item with `ImagesIcon`; `project` -> `ORDERABLE_TYPES` + an `orderableDocumentListDeskItem` in Content.
- Nav: a `/portfolio` top-level link.
- Coming-soon: `/portfolio` shows an empty-state when no `project` docs; `before-after` suppresses to empty when no project has before/after pairs (preserve the existing guards).

- [ ] **Step 1:** Finalize the folder to the contract; confirm no owned component is imported by core (grep from Phase 1 Task 4 Step 2).
- [ ] **Step 2:** Write `docs/modules/portfolio.md` from the template with the values above, including the exact `structure.ts` list items and the `Header.astro` link.
- [ ] **Step 3:** Write `modules/portfolio/seed.mjs` creating `portfolioPage` + 3 neutral `project` docs (placeholder titles like "Project One", neutral room/style tags, sample gallery using placeholder images or Sanity sample assets). Idempotent via `createOrReplace` with deterministic `_id`s.
- [ ] **Step 4:** Run the verify recipe. Expected: typegen + build PASS, all three routes render both themes, filter chips work, before/after slider works, empty-state shows with no projects.
- [ ] **Step 5:** Restore to modules-OFF.
- [ ] **Step 6:** Commit `git commit -m "feat(module): portfolio enable doc + seed, verified"`.

### Task 3: process

**Module specifics:**
- Schemas: `processPage` (singleton), `processStep` (orderable collection).
- Route: `/process`.
- Components owned: `ProcessStepIllustration.astro`; the `.step-connector` polish utility stays in core CSS (list under Depends on).
- structure.ts: `processPage` -> singleton + Pages item with `TrendUpwardIcon`; `processStep` -> orderable in Content.
- Nav: `/process` link (often grouped under an About/Process area).
- Coming-soon: `/process` shows intro-only when no `processStep` docs.

- [ ] **Step 1-6:** Apply the contract. Seed: `processPage` + 4 neutral `processStep` docs ("Step One".."Step Four", neutral copy). Verify the connector-line animation draws on scroll in both themes; empty-state with no steps. Commit `feat(module): process enable doc + seed, verified`.

### Task 4: newsletter

**Module specifics (special — mostly core plumbing):**
- Schema: none new; it toggles fields already on `siteSettings.newsletter` (formActionUrl, enabled) which stay in core.
- Components owned: the global `NewsletterSignup` component + its placement in `Footer.astro`/`BaseLayout.astro`.
- Depends on (core): `src/lib/subscribe.ts` (ESP + Web3Forms fallback) stays in core, dormant until `PUBLIC_NEWSLETTER_FORM_ACTION` is set.
- Env/config: `PUBLIC_NEWSLETTER_FORM_ACTION` (+ optional `PUBLIC_WEB3FORMS_KEY`); `siteSettings.newsletter.enabled`.
- Coming-soon: when `siteSettings.newsletter.enabled` is false/unset, the signup renders nothing (no broken form).

- [ ] **Step 1-6:** Apply the contract. The enable doc explains the env var + the siteSettings flag rather than schema registration. Seed: set `siteSettings.newsletter.enabled = true` with a placeholder action URL note. Verify the footer signup appears when enabled and is absent when disabled, both themes; the form posts to the configured action (or no-ops gracefully without one). Commit `feat(module): newsletter enable doc, verified`.

### Task 5: lead-magnets

**Module specifics:**
- Schema: `leadMagnet` (orderable collection).
- Routes: `/guides`, `/guides/[slug]`.
- Components owned: `LeadMagnetForm.tsx`.
- Depends on (core): `subscribe.ts`, `SanityImage`, resources hub (Task 12) if enabled.
- Env/config: same ESP plumbing as newsletter; gated download.
- Coming-soon: `/guides` lists nothing and `/guides/[slug]` generates 0 paths when no `leadMagnet` docs published.

- [ ] **Step 1-6:** Apply the contract. Seed: 2 neutral `leadMagnet` docs with placeholder PDFs noted as TODO-for-client. Verify index + a gated landing render both themes; 0 paths with no magnets. Commit `feat(module): lead-magnets enable doc + seed, verified`.

### Task 6: style-quiz

**Module specifics:**
- Schema: `styleQuiz` (singleton config: questions + archetypes).
- Route: `/quiz`.
- Components owned: `StyleQuiz.tsx` island.
- Coming-soon: `/quiz` shows coming-soon when fewer than 2 questions/archetypes configured (preserve the guard).

- [ ] **Step 1-6:** Apply the contract. Seed: `styleQuiz` with 4 neutral questions + 3 neutral archetypes. Verify the quiz runs to a result both themes; coming-soon when underconfigured. Commit `feat(module): style-quiz enable doc + seed, verified`.

### Task 7: budget-calculator

**Module specifics:**
- Schema: `budgetCalculator` (singleton config: rooms + ranges).
- Route: `/calculator`.
- Components owned: `BudgetCalculator.tsx` island.
- Coming-soon: `/calculator` shows coming-soon when no rooms configured.

- [ ] **Step 1-6:** Apply the contract. Seed: `budgetCalculator` with 3 neutral room types + ranges. Verify the calculator computes a range both themes; coming-soon with no rooms. Commit `feat(module): budget-calculator enable doc + seed, verified`.

### Task 8: shop

**Module specifics:**
- Schemas: `shopPage` (singleton), `shopCollection` + `shopItem` (orderable collections).
- Route: `/shop`.
- Components owned: `ShopGrid.tsx`, `ShopItemCard.tsx`.
- Important: preserve the FTC disclosure band and `rel="sponsored nofollow noopener"` on affiliate links — these are correctness, not decoration.
- Coming-soon: honors `shopPage.enabled`; empty state with no collections.

- [ ] **Step 1-6:** Apply the contract. Seed: `shopPage` + 1 collection + 3 neutral items with placeholder affiliate URLs (`https://example.com/...`) and the FTC disclosure text. Verify the disclosure renders, links carry the correct `rel`, both themes; empty state honored. Commit `feat(module): shop enable doc + seed, verified`.

### Task 9: e-design

**Module specifics:**
- Schema: `eDesignPage` (singleton: intro + how-it-works + tiers + FAQ refs + final CTA).
- Route: `/e-design`. CTAs route to `/contact?type=e-design`.
- Coming-soon: coming-soon state when `eDesignPage` doc absent.

- [ ] **Step 1-6:** Apply the contract. Seed: `eDesignPage` with neutral copy + 3 placeholder pricing tiers. Verify the page + CTA query param both themes; coming-soon when absent. Commit `feat(module): e-design enable doc + seed, verified`.

### Task 10: gift-certificates

**Module specifics:**
- Schema: `giftPage` (singleton; inquire-only, no payment integration).
- Route: `/gift-certificates`. CTAs route to `/contact?type=gift-certificate`.
- Coming-soon: static fallback when doc absent.

- [ ] **Step 1-6:** Apply the contract. Seed: `giftPage` with neutral options + how-it-works + fine print. Verify both themes; CTA query param. Commit `feat(module): gift-certificates enable doc + seed, verified`.

### Task 11: press

**Module specifics:**
- Schemas: `pressPage` (singleton), `pressItem` (orderable collection).
- Route: `/press`.
- Components owned: `PressStrip.astro` logo row.
- Coming-soon: suppresses the list to an empty state when no `pressItem` docs.

- [ ] **Step 1-6:** Apply the contract. Seed: `pressPage` + 3 neutral `pressItem` docs (outlet "Publication One", neutral quote, `https://example.com` link). Verify list + logo strip both themes; empty state. Commit `feat(module): press enable doc + seed, verified`.

### Task 12: resources

**Module specifics (the capture hub):**
- Schema: `resourcesPage` (singleton: ordered card grid linking to quiz, calculator, guides, FAQ, journal).
- Route: `/resources`.
- Depends on: links degrade gracefully to whichever capture modules are enabled; falls back to hardcoded nav-style cards when `resourcesPage.cards` empty.
- Note in the enable doc: enable resources alongside at least one of lead-magnets / style-quiz / budget-calculator, or its cards point at disabled routes.

- [ ] **Step 1-6:** Apply the contract. Seed: `resourcesPage` with neutral cards pointing at the capture routes. Verify the hub renders both themes; the empty fallback works. Commit `feat(module): resources enable doc + seed, verified`.

---

## Stage C — Library-level verification

### Task 13: Verify a representative multi-module enable, then confirm the starter ships OFF

**Files:**
- Temporary working changes only; the commit records docs/index updates, not enabled modules.

- [ ] **Step 1: Enable a realistic preset together**

On a scratch branch, enable `portfolio` + `process` + `newsletter` + `lead-magnets` + `resources` following their docs (the "creative-studio + capture" combination a real client would want).

- [ ] **Step 2: Build and typegen the combined set**

Run: `npm run typegen` then `npm run build`.
Expected: both PASS. Build output lists `/portfolio`, `/portfolio/[slug]`, `/portfolio/before-after`, `/process`, `/guides`, `/guides/[slug]`, `/resources` alongside core routes. No schema collisions, no duplicate-route errors.

- [ ] **Step 3: Visual + nav check**

Dev server. The nav now surfaces the enabled routes (and only those). Each enabled route renders both themes at both viewports. Disabled modules (shop, e-design, gift, quiz, calculator, press) have no routes and no nav entries.

- [ ] **Step 4: Confirm clean teardown**

Run: `git restore . ; git clean -fd src studio` then `npm run build`.
Expected: PASS, back to core-only routes. This proves enabling is non-destructive and reversible.

- [ ] **Step 5: Finalize the modules index**

Confirm `docs/modules/README.md` lists all 11 modules with accurate routes/dependencies and the preset notes. Confirm each `docs/modules/<name>.md` exists and matches the template.

- [ ] **Step 6: Commit**

```powershell
git add docs/modules
git commit -m "docs: finalize module library index; multi-module enable verified"
```

---

## Self-Review (completed during authoring)

- **Spec coverage:** "Carry the specialized surfaces forward as self-contained, documented, opt-in modules" -> the contract (Task 1) + per-module tasks (2-12). "Wired off by default" -> verify recipe restores modules-OFF after each task; Task 13 Step 4 proves reversibility. "Enabled-but-unconfigured shows coming-soon" -> the empty-state check is a named step in every module task. "portfolio + process = creative-studio pair" -> the index note (Task 1 Step 4, Task 13 Step 5). All 11 modules from Phase 1's `modules/` are addressed (portfolio, process, newsletter, lead-magnets, style-quiz, budget-calculator, shop, e-design, gift-certificates, press, resources).
- **Placeholder scan:** Per-module specifics (schemas, routes, owned components, structure.ts targets, seed contents, coming-soon condition) are concrete. The repeated procedure is defined once as the contract and referenced deliberately, not hand-waved; each module supplies its own real values. No "TBD".
- **Consistency:** Schema names, route paths, and component filenames match Phase 1's extraction lists exactly. The FTC `rel` and disclosure (shop), the `?type=` CTA params (e-design, gift), and the 0-paths guards (lead-magnets) carry the same details the Phase 1 route table recorded.

---

## Execution arc

Phase 2 yields a documented, reversible, verified module library on top of the Phase 1 core. Phase 3 then completes the knowledge layer (genericized `docs/agent/`, the `NEW-PROJECT.md` runbook, the brand-voice template, and a generic core seed) and dry-runs the full new-project experience end to end.

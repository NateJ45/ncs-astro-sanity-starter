# Astro + Sanity Starter — Docs & Bootstrap Implementation Plan (Phase 3 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the knowledge layer so a fresh clone is genuinely "business info in, site out": genericize the `docs/agent/` topic docs, write the `NEW-PROJECT.md` runbook and pre-launch checklist, add a brand-voice template and a generic core seed, then dry-run the whole new-project experience end to end.

**Architecture:** Three doc clusters get genericized in place (Reid specifics out, stack truths kept), one new `docs/bootstrap/` tree drives setup, a `scripts/seed-core.mjs` gives a fresh clone populated core pages, and a final dry run on a scratch copy proves the kit delivers.

**Tech Stack:** Same as Phases 1-2.

**Prerequisite:** Phases 1 and 2 complete. The core is brand-neutral and building; the module library is documented and reversible.

**Verification model:** Doc tasks gate on a grep for zero Reid specifics plus a read-through for stack accuracy. The seed task gates on `node scripts/seed-core.mjs` then `npm run build` rendering populated core pages. The final task gates on a full dry run: a scratch reskin + two-module enable + seed + build + (optional) deploy that a person could follow start to finish. Commit after every task.

**The 16 `docs/agent/` docs to genericize:** `accessibility`, `changelog`, `components`, `deployment`, `design-tokens`, `editor-vs-hardcoded`, `error-states`, `images`, `page-architecture`, `performance`, `polish-layer`, `sanity`, `seo`, `setup-checklist` (the in-repo one; superseded by the new bootstrap checklist), `stack-and-config`, `theme-and-color`. Plus a new `animation.md` split out of `polish-layer.md`.

---

## Stage A — Genericize the agent docs

### Task 1: Stack, config, and deployment cluster

**Files:**
- Modify: `docs/agent/stack-and-config.md`, `docs/agent/deployment.md`, `docs/agent/performance.md`

- [ ] **Step 1: Strip Reid specifics, keep stack truths**

Rewrite these three so every claim is about the stack, not Reid. Keep verbatim: the `astro.config.mjs` landmines (static output, `imageService: 'compile'` rationale, the CSP-via-`_headers` decision and why the meta-CSP was abandoned, the sitemap `/404` filter), the `typegen`-before-`astro build` chain, the Cloudflare Workers (not Pages) deploy model, the rebuild-on-publish webhook model, and the Lighthouse 100/100/100 budgets. Replace the Reid project id, domain, and Worker name with the env-var names from Phase 1 Task 13.

- [ ] **Step 2: Grep**

```powershell
Select-String -Path "docs\agent\stack-and-config.md","docs\agent\deployment.md","docs\agent\performance.md" -Pattern "Reid|reiddesignllc|ba403vjc|Plainfield" -CaseSensitive:$false
```

Expected: zero hits (a single provenance line is allowed).

- [ ] **Step 3: Commit** `git commit -m "docs(agent): genericize stack/config/deployment/performance"`.

### Task 2: Theme, tokens, polish, and animation cluster

**Files:**
- Modify: `docs/agent/theme-and-color.md`, `docs/agent/design-tokens.md`, `docs/agent/polish-layer.md`
- Create: `docs/agent/animation.md`

- [ ] **Step 1: Repoint theme + token docs to the neutral default**

Rewrite `theme-and-color.md` and `design-tokens.md` to describe the Slate/Ink/Paper default and the `@theme` + `:root`/`.dark` structure, with the light-AND-dark discipline kept front and center. Replace bronze/charcoal/linen names and the Cormorant/Source Sans/Pinyon type scale with the neutral defaults and the `--tint-rgb` token from Phase 1 Task 6. Document the design seam (the short file list from the spec) as the "how to re-skin" section.

- [ ] **Step 2: Split animation out of polish-layer**

Move the animation-specific material (Lenis smooth scroll + scroll reset, `motion`, the `[data-reveal]` / `[data-stagger-grid]` observers, hero entry stagger, Ken Burns slideshow, view-transition cross-fade, the opt-in script accent) into a new `docs/agent/animation.md`. Leave the non-animation polish (brand stripe, `card-lift`, `surface-warm`, reading progress, sticky header) in `polish-layer.md`. Cross-link the two.

- [ ] **Step 3: Grep + commit**

```powershell
Select-String -Path "docs\agent\theme-and-color.md","docs\agent\design-tokens.md","docs\agent\polish-layer.md","docs\agent\animation.md" -Pattern "Reid|Bronze|Cormorant|Pinyon|9C7661" -CaseSensitive:$false
```

Expected: zero hits. Commit `git commit -m "docs(agent): genericize theme/tokens/polish; split out animation.md"`.

### Task 3: Sanity, images, and SEO cluster

**Files:**
- Modify: `docs/agent/sanity.md`, `docs/agent/images.md`, `docs/agent/seo.md`

- [ ] **Step 1: Genericize**

Keep the load-bearing rules: run `studio:deploy` after any schema change and never click "Remove field"; the typed-client + GROQ + `sanity.types.ts` flow; `SanityImage.astro` + `@sanity/image-url` usage; the `sectionVisibility` rule (`value !== false` is visible); robots.txt + llms.txt + sitemap + the OG generators + JSON-LD via `StructuredData.astro`. Swap Reid schema names for core ones and note that module schemas are documented under `docs/modules/`.

- [ ] **Step 2: Grep + commit**

```powershell
Select-String -Path "docs\agent\sanity.md","docs\agent\images.md","docs\agent\seo.md" -Pattern "Reid|reiddesignllc|ba403vjc" -CaseSensitive:$false
```

Expected: zero hits. Commit `git commit -m "docs(agent): genericize sanity/images/seo"`.

### Task 4: Components, architecture, a11y, error-states, editor-vs-hardcoded; reset changelog

**Files:**
- Modify: `docs/agent/components.md`, `page-architecture.md`, `accessibility.md`, `error-states.md`, `editor-vs-hardcoded.md`, `changelog.md`
- Delete: `docs/agent/setup-checklist.md` (replaced by `docs/bootstrap/setup-checklist.md` in Stage B)

- [ ] **Step 1: Genericize the remaining docs**

Trim component/architecture docs to the core component set (module components move to `docs/modules/`). Keep the empty/error-state philosophy (the coming-soon discipline that makes modules safe). Keep the "Safe to edit by hand vs Foundation, edit with care" framing in `editor-vs-hardcoded.md`, pointed at the neutral core. Keep `accessibility.md` (keyboard, contrast, focus, the AA rules) almost verbatim; it is stack-level.

- [ ] **Step 2: Reset the changelog**

Replace `changelog.md` contents with a fresh starter changelog: one entry, "Forked from the Reid Design build; genericized to the NCS Astro + Sanity starter (YYYY-MM-DD)." Future projects start their own history.

- [ ] **Step 3: Remove the old in-repo setup checklist**

Delete `docs/agent/setup-checklist.md`; the bootstrap checklist (Stage B) replaces it. Update the topic index in `CLAUDE.md` to drop the dead link and add `animation.md`, `docs/bootstrap/`, and `docs/modules/`.

- [ ] **Step 4: Grep across all of docs/agent + commit**

```powershell
Select-String -Path "docs\agent\*.md" -Pattern "Reid|Staci|Plainfield|reiddesignllc|ba403vjc|Bronze|Cormorant|Pinyon" -CaseSensitive:$false
```

Expected: zero hits (provenance lines excepted). Commit `git commit -m "docs(agent): genericize remaining docs; reset changelog; fix topic index"`.

---

## Stage B — The bootstrap layer

### Task 5: Write `docs/bootstrap/NEW-PROJECT.md`, the setup runbook

**Files:**
- Create: `docs/bootstrap/NEW-PROJECT.md`

- [ ] **Step 1: Write the runbook as an ordered, copy-pasteable procedure**

Sections, in order, each with exact commands and the file to touch:

1. **Clone + install** — use the GitHub template, `npm install`, `npm --prefix studio install`.
2. **Point Sanity** — create the Sanity project (or reuse), set `PUBLIC_SANITY_PROJECT_ID` + `PUBLIC_SANITY_DATASET` in `.env`, set the same in the Studio config, `npm run studio:deploy` once.
3. **Set identity + domain** — fill `src/data/site.ts`; set `astro.config.mjs` `site`; set `wrangler.jsonc` `name`.
4. **Nail the design (the seam)** — edit the `@theme` palette + `:root`/`.dark` in `globals.css`; choose fonts (swap the `@fontsource` imports + `--font-*` tokens); regenerate logo/favicon/OG (`npm run og`, the logo-variant generator); optionally re-enable the script accent. Link to `docs/agent/theme-and-color.md`.
5. **Voice** — fill `docs/brand/voice.md` with the client's tone + banned vocabulary (drives all copy).
6. **Replace placeholder copy** — walk the core pages; swap "Studio Starter" placeholders for real copy (no em-dashes in site copy).
7. **Enable modules** — from `docs/modules/README.md`, enable only what this client needs, each via its `docs/modules/<name>.md`.
8. **Seed** — `node scripts/seed-core.mjs` (Task 7), then each enabled module's seed.
9. **Verify** — `npm run build`; dev server both themes both viewports; Lighthouse on the key pages.
10. **Deploy** — `npm run deploy`; wire the Sanity publish webhook; then the pre-launch checklist.

- [ ] **Step 2: Add a "what NOT to touch" callout**

Point at the Foundation-vs-Safe-to-edit taxonomy in `CLAUDE.md` so a setup session does not casually rewrite `BaseLayout.astro` or `globals.css` structure.

- [ ] **Step 3: Commit** `git commit -m "docs(bootstrap): NEW-PROJECT setup runbook"`.

### Task 6: Write `docs/bootstrap/setup-checklist.md` and `docs/brand/voice.md`

**Files:**
- Create: `docs/bootstrap/setup-checklist.md`, `docs/brand/voice.md`

- [ ] **Step 1: Pre-launch checklist**

A literal checkbox list grouped by area: env vars set; Sanity project created + editor invited (manage.sanity.io Members); Studio deployed; core content seeded + replaced with real copy; chosen modules enabled + configured; logo/favicon/OG real; domain + Worker name set; robots.txt + llms.txt + sitemap correct for the new domain; analytics token (cookieless) if wanted; Lighthouse 100s on key pages; publish webhook wired; DNS cutover plan. Mirror the rigor of the Reid pre-launch list, generalized.

- [ ] **Step 2: Voice template**

Write `docs/brand/voice.md` as a fill-in template: tone in one line, five do-this-not-that pairs (blank for the client), a banned-vocabulary list (seed it with the generic AI-tell list: delve, leverage, robust, seamless, elevate, etc.), the no-em-dash rule for site copy, and the "stop when you're done" rule. The mechanism is generic; the contents are per-client.

- [ ] **Step 3: Commit** `git commit -m "docs(bootstrap): pre-launch checklist + brand-voice template"`.

---

## Stage C — Generic core seed and the dry run

### Task 7: Write `scripts/seed-core.mjs`

**Files:**
- Create: `scripts/seed-core.mjs`

- [ ] **Step 1: Write an idempotent core seeder**

Using `@sanity/client` with the write token from `.env`, `createOrReplace` deterministic-`_id` placeholder docs for the core schemas so a fresh clone shows populated pages instead of only fallbacks: `siteSettings` (name "Studio Starter", neutral nav/footer), `homePage` (hero + sections), `aboutPage`, `servicesPage` + 3 `service` docs, `faqPage` + 4 `faqItem` docs, `contactPage`, 3 `testimonial` docs, `philosophyPoint` x3, `journalPage` + 2 `journalEntry` posts (with neutral portable-text bodies), `notFoundPage`, `privacyPage`, and the `studioGuide`/`studioNotes`/`studioPlaybook` editor-help singletons with neutral starter content. No em-dashes in seeded site copy.

- [ ] **Step 2: Run it against a scratch dataset**

Run: `node scripts/seed-core.mjs`
Expected: completes, logs the created/replaced ids. Re-running is safe (createOrReplace).

- [ ] **Step 3: Build and view populated core**

Run: `npm run build`, then dev server. Expected: every core page shows seeded content, both themes. The Studio "Start Here" panels show neutral starter guidance.

- [ ] **Step 4: Commit** `git commit -m "feat: generic core seed for a populated fresh clone"`.

### Task 8: End-to-end dry run of the new-project experience

**Files:**
- Scratch only (a throwaway copy or branch); no permanent changes beyond confirming docs are accurate.

- [ ] **Step 1: Simulate a real adoption on a scratch copy**

Following ONLY `docs/bootstrap/NEW-PROJECT.md`, pretend to onboard a fake client "Maple & Oak Co.": set identity in `site.ts`, swap the palette to a different test brand (e.g. a green/cream), swap one font, regenerate OG, replace a couple of placeholder headlines, enable `portfolio` + `newsletter` + `lead-magnets` + `resources`, run `seed-core.mjs` + the module seeds.

- [ ] **Step 2: Build + verify the "new site"**

Run: `npm run typegen && npm run build`. Dev server. Expected: a recognizably different-looking site (green/cream, different font, "Maple & Oak Co."), the four enabled routes live, core pages populated, both themes, Lighthouse holding on the key pages. This proves "business info in, site out".

- [ ] **Step 2a: Note any runbook friction**

Anywhere the runbook was ambiguous, missing a step, or wrong, fix `NEW-PROJECT.md` (or the relevant module doc) immediately. The dry run's real output is a corrected runbook.

- [ ] **Step 3: Tear the scratch changes down**

Discard the scratch copy/branch so the starter ships neutral with modules OFF.

- [ ] **Step 4: Final commit**

```powershell
git add docs
git commit -m "docs: dry-run corrections; starter bootstrap verified end to end"
```

- [ ] **Step 5: Publish the template**

Push to the new GitHub repo and mark it a **template repository** in settings so future clones detach cleanly. Confirm the spec and all three phase plans are committed in `docs/superpowers/`.

---

## Self-Review (completed during authoring)

- **Spec coverage:** "Genericized docs/agent with Reid specifics swapped" -> Tasks 1-4. "Split a dedicated animation.md out of polish-layer" -> Task 2 Step 2. "NEW-PROJECT.md runbook a fresh chat reads after CLAUDE.md" -> Task 5. "docs/brand/voice.md template" -> Task 6. "setup-checklist" -> Task 6. "Neutral but complete, populated out of the box" -> the generic core seed, Task 7. "Business info in, site out" success criterion -> the end-to-end dry run, Task 8. "First commit in the new repo" + template-repo publish -> Task 8 Step 5.
- **Placeholder scan:** Each doc task names the exact files and the exact rules to preserve. The runbook, checklist, voice template, and seed are specified by content, not by "write docs here". The one deliberate deferral (the client's actual copy/voice) is correctly the per-project input, not a plan gap.
- **Consistency:** The env-var names (`PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET`), the neutral tokens (`--tint-rgb`, Slate palette, Libre Baskerville + Inter), the module names, and the "studio:deploy after schema change / never Remove field" rule all match Phases 1 and 2 exactly.

---

## Execution arc

With all three phases executed, the `ncs-astro-sanity-starter` template stands complete: a brand-neutral, building, deployable core; a documented, reversible module library; a full genericized knowledge base; and a runbook proven by a dry run. The next real client starts from `NEW-PROJECT.md` and pours in only their business info and design.

# Astro + Sanity Starter — Core Foundation Implementation Plan (Phase 1 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fork the completed Reid Design build into a new `ncs-astro-sanity-starter` repo and subtract Reid down to a brand-neutral, building, deployable **core** with the specialized surfaces staged off in a `modules/` library.

**Architecture:** Fork-and-strip. Copy `reid-design-site`, confirm it builds untouched, then move the specialized pages/islands/schemas into `modules/` (staged off), neutralize the brand to a complete default palette and typeface set, strip Reid business copy from the core pages, delete the one-off Reid scripts, and genericize the always-loaded `CLAUDE.md`. The deliverable is a working core that any future client can re-skin.

**Tech Stack:** Astro 6.3 (`output: 'static'`), Sanity v5, Tailwind 4 via `@tailwindcss/vite`, React 19 islands, shadcn/ui, Cloudflare Workers (`@astrojs/cloudflare`, `imageService: 'compile'`).

**Verification model:** No unit suite exists. Each task's gate is one or more of: `npm run build` succeeds, `npm run typegen` succeeds, a `grep` gate returns zero Reid references, the dev server renders the changed page in light AND dark at ~375px and ~1280px (via the preview tooling), and Lighthouse holds 100 on Accessibility / Best Practices / SEO for core pages. Commit after every task.

**Scope note:** This is Phase 1. Phase 2 (module-library polish: enable docs + seeds per module) and Phase 3 (full `docs/agent` genericization + `NEW-PROJECT.md` runbook) are separate plans, written when Phase 1 lands.

**Source paths (read-only reference during the build):**
- Reid repo: `C:\Users\natha\Documents\Claude\Projects\ReidDesignAstro\reid-design-site\`
- Approved spec: `C:\Users\natha\Documents\Claude\Projects\ReidDesignAstro\docs\superpowers\specs\2026-05-30-astro-sanity-starter-design.md`

---

## Stage A — Repo bring-up

### Task 1: Create the new repo from a copy and confirm it builds untouched

**Files:**
- Create: the new repo directory `ncs-astro-sanity-starter/` (sibling of `reid-design-site`)

- [ ] **Step 1: Copy the Reid repo, excluding build/install artifacts**

```powershell
$src = "C:\Users\natha\Documents\Claude\Projects\ReidDesignAstro\reid-design-site"
$dst = "C:\Users\natha\Documents\Claude\Projects\ncs-astro-sanity-starter"
robocopy $src $dst /E /XD node_modules dist .astro tmp .git "studio\node_modules" "studio\dist" /XF package-lock.json
```

`robocopy` exit codes 0-7 are success. Anything >= 8 is a real error.

- [ ] **Step 2: Initialize a fresh git repo (the spec becomes the first commit later)**

```powershell
cd "C:\Users\natha\Documents\Claude\Projects\ncs-astro-sanity-starter"
git init
```

- [ ] **Step 3: Clean install both workspaces**

Run: `npm install` (root), then `npm --prefix studio install`
Expected: both complete with no peer-dependency errors that block install.

- [ ] **Step 4: Baseline build to confirm the fork works as-is**

Run: `npm run build`
Expected: PASS. `typegen` runs, then `astro build` emits `dist/`. If this fails, stop and fix the copy before changing anything — every later task assumes a green baseline.

- [ ] **Step 5: Commit the untouched baseline**

```powershell
git add -A
git commit -m "chore: fork reid-design-site as starter baseline (untouched)"
```

This commit is the rollback point. Everything after this is subtraction.

---

## Stage B — Extract the specialized layer into `modules/` (staged OFF)

The goal of this stage is a lean core that builds without the specialized surfaces, with that code preserved under `modules/` rather than deleted. Phase 2 will add each module's enable doc and seed; here we only move and de-register.

### Task 2: Create the module library structure and move schemas out of the Studio

**Files:**
- Create: `modules/<name>/studio/` for each module
- Modify: `studio/schemaTypes/index.ts`
- Move: the schema files listed below out of `studio/schemaTypes/`

- [ ] **Step 1: Create the module directories**

```powershell
cd "C:\Users\natha\Documents\Claude\Projects\ncs-astro-sanity-starter"
$mods = "portfolio","process","newsletter","lead-magnets","style-quiz","budget-calculator","shop","e-design","gift-certificates","press","resources"
foreach ($m in $mods) { New-Item -ItemType Directory -Force "modules\$m\studio" | Out-Null; New-Item -ItemType Directory -Force "modules\$m\src" | Out-Null }
```

- [ ] **Step 2: Move each module's schema files**

Move these from `studio/schemaTypes/` into the matching `modules/<name>/studio/`:

- `portfolio`: `portfolioPage.ts`, `project.ts`
- `process`: `processPage.ts`, `processStep.ts`
- `lead-magnets`: `leadMagnet.ts`
- `style-quiz`: `styleQuiz.ts`
- `budget-calculator`: `budgetCalculator.ts`
- `shop`: `shopPage.ts`, `shopCollection.ts`, `shopItem.ts`
- `e-design`: `eDesignPage.ts`
- `gift-certificates`: `giftPage.ts`
- `press`: `pressPage.ts`, `pressItem.ts`
- `resources`: `resourcesPage.ts`

Keep in core (do NOT move): `siteSettings`, `homePage`, `aboutPage`, `contactPage`, `servicesPage`, `service`, `faqPage`, `faqItem`, `journalPage`, `journalEntry`, `journalCategory`, `testimonial`, `philosophyPoint`, `ctaBlock`, `notFoundPage`, `privacyPage`, `studioGuide`, `studioNotes`, `studioPlaybook`.

- [ ] **Step 3: Drop the moved types from `studio/schemaTypes/index.ts`**

Remove the `import` lines and the array entries for: `budgetCalculator`, `eDesignPage`, `giftPage`, `leadMagnet`, `portfolioPage`, `pressItem`, `pressPage`, `processPage`, `processStep`, `project`, `resourcesPage`, `shopCollection`, `shopItem`, `shopPage`, `styleQuiz`. Leave the comment banner and all core entries.

The resulting `export const schemaTypes` array should contain exactly: `ctaBlock`, `siteSettings`, `homePage`, `aboutPage`, `servicesPage`, `faqPage`, `contactPage`, `journalPage`, `notFoundPage`, `privacyPage`, `studioGuide`, `studioNotes`, `studioPlaybook`, `testimonial`, `faqItem`, `philosophyPoint`, `service`, `journalCategory`, `journalEntry`.

- [ ] **Step 4: Verify the Studio still type-checks and the schema graph has no dangling refs**

Run: `npm run typegen`
Expected: PASS. If it fails with a missing-type reference, a core schema still points at a moved type (likely `homePage` referencing `project`, or `siteSettings`/nav referencing a moved page). Note the reference; in Step 5 neutralize it by removing that field from the core schema (the field belongs to the module and Phase 2 re-adds it when the module is enabled).

- [ ] **Step 5: Remove cross-references from core schemas to moved types**

For each dangling reference typegen reported, open the core schema and delete the field that targets a moved type. Likely spots:
- `homePage.ts`: a `featuredProjects` / portfolio reference field — remove it.
- `siteSettings.ts`: nav items or a footer link that hardcodes a moved route — remove those entries.

Re-run `npm run typegen` until it passes clean.

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "refactor: move specialized schemas into modules/, de-register from core Studio"
```

### Task 3: Strip the moved types from the desk structure

**Files:**
- Modify: `studio/structure.ts`

- [ ] **Step 1: Trim the type arrays**

In `studio/structure.ts`, remove the moved types from `SINGLETON_TYPES` (`processPage`, `portfolioPage`, `eDesignPage`, `shopPage`, `giftPage`, `resourcesPage`, `pressPage`, `styleQuiz`, `budgetCalculator`) and from `ORDERABLE_TYPES` (`project`, `processStep`, `leadMagnet`, `shopCollection`, `shopItem`, `pressItem`). Leave `service` and `philosophyPoint` in `ORDERABLE_TYPES`.

- [ ] **Step 2: Remove their desk list items**

Delete the `singletonWithPreview(...)` calls for the moved pages inside the "Pages" list (Process, Portfolio, E-Design, Shop, Gift, Resources, Style Quiz, Budget Calculator, Press), and remove the now-empty dividers so the Offerings / Resources groups don't leave blank separators. In the "Content" list, delete the `orderableDocumentListDeskItem(...)` calls for `project`, `processStep`, `leadMagnet`, `shopCollection`, `shopItem`, `pressItem`, and the divider that split them from core content.

- [ ] **Step 3: Drop now-unused icon imports**

Remove from the `@sanity/icons` import any icon used only by deleted items (e.g. `DesktopIcon`, `BasketIcon`, `CreditCardIcon`, `BillIcon`, `BulbOutlineIcon`, `SearchIcon`, `CaseIcon`, `TrendUpwardIcon` if Process was its only user). Keep icons still referenced by core items. TypeScript will flag unused imports on build if `noUnusedLocals` is set; if not, remove them by inspection.

- [ ] **Step 4: Verify the Studio builds**

Run: `npm --prefix studio run build`
Expected: PASS, no unresolved imports.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "refactor: remove moved types from Studio desk structure"
```

### Task 4: Move the specialized pages and islands out of the Astro app

**Files:**
- Move (into `modules/<name>/src/`): the page and component files below
- Modify: `src/components/Header.astro` (nav), any `src/lib/queries.ts` GROQ for moved pages

- [ ] **Step 1: Move pages**

From `src/pages/` into the matching `modules/<name>/src/pages/`:
- `portfolio/` (the whole folder: `index.astro`, `[slug].astro`, `before-after.astro`) → `portfolio`
- `process.astro` → `process`
- `guides/` → `lead-magnets`
- `quiz.astro` → `style-quiz`
- `calculator.astro` → `budget-calculator`
- `shop.astro` → `shop`
- `e-design.astro` → `e-design`
- `gift-certificates.astro` → `gift-certificates`
- `press.astro` → `press`
- `resources.astro` → `resources`

- [ ] **Step 2: Move the islands/components each moved page owns**

From `src/components/` into the matching `modules/<name>/src/components/`:
- `portfolio`: `BeforeAfterSlider.tsx`, `ProjectGallery.tsx`, `PortfolioCursor.tsx`, `PortfolioFilterChips.tsx`, `CaseStudyTOC.tsx`, `StickyCTAChip.tsx`, `ProjectMetaBand.astro`
- `process`: `ProcessStepIllustration.astro`
- `lead-magnets`: `LeadMagnetForm.tsx`
- `style-quiz`: `StyleQuiz.tsx`
- `budget-calculator`: `BudgetCalculator.tsx`
- `shop`: `ShopGrid.tsx`, `ShopItemCard.tsx`
- `press`: `PressStrip.astro`

Before moving a component, confirm with a grep that no core page imports it:

```powershell
Select-String -Path "src\pages\*.astro","src\components\*.astro","src\components\*.tsx" -Pattern "BeforeAfterSlider|ProjectGallery|PortfolioCursor|PortfolioFilterChips|CaseStudyTOC|StickyCTAChip|ProcessStepIllustration|StyleQuiz|BudgetCalculator|LeadMagnetForm|ShopGrid|ShopItemCard|PressStrip|ProjectMetaBand"
```

Any hit in a file that is NOT itself being moved means that component is shared. If shared, leave it in core and note it in the module's folder README for Phase 2.

- [ ] **Step 3: Trim the nav**

In `src/components/Header.astro`, remove the dropdown entries and links that point at moved routes (the grouped Services + Resources menus reference `/process`, `/portfolio`, `/e-design`, `/shop`, `/gift-certificates`, `/quiz`, `/calculator`, `/guides`, `/resources`, `/press`). Leave only core routes: `/`, `/about`, `/services`, `/faq`, `/journal`, `/contact`. If removing the dropdown leaves a single-item menu, flatten it to a plain link.

- [ ] **Step 4: Remove GROQ + sitemap references to moved routes**

In `src/lib/queries.ts`, delete exported queries used only by moved pages. Grep for any remaining import of a deleted query:

```powershell
Select-String -Path "src\pages\*.astro" -Pattern "portfolioQuery|projectQuery|processQuery|shopQuery|eDesignQuery|giftQuery|pressQuery|leadMagnetQuery|styleQuizQuery|budgetQuery|resourcesQuery"
```

Expected: zero hits in core pages.

- [ ] **Step 5: Verify the core app builds with only core routes**

Run: `npm run build`
Expected: PASS. The emitted route list in the build log shows only `/`, `/about`, `/services`, `/faq`, `/contact`, `/journal`, `/journal/[slug]`, `/privacy`, `/404`, and the sitemap. No `/portfolio`, `/shop`, etc.

- [ ] **Step 6: Smoke-test the running core in both themes**

Run the dev server, open `/`, `/about`, `/services`, `/journal`, `/contact` at ~375px and ~1280px, toggle light/dark. Expected: every core page renders with no broken links to moved routes, no console errors, header nav shows only core links. Fix any dangling link or missing-component error before committing.

- [ ] **Step 7: Commit**

```powershell
git add -A
git commit -m "refactor: move specialized pages + islands into modules/, trim nav to core"
```

---

## Stage C — Neutralize the brand

### Task 5: Swap the brand palette to a neutral default

**Files:**
- Modify: `src/styles/globals.css` (the `@theme` palette block, `:root`, `.dark`)

- [ ] **Step 1: Replace the `@theme` brand palette block**

In `src/styles/globals.css`, replace the Reid palette (lines beginning `--color-primary: #9C7661` through `--color-white-pure`) with this neutral "Slate" default. Values are deliberately generic; this is the swappable design seam.

```css
  /* Brand palette — neutral Slate default. Swap per project. */
  --color-primary:      #586577; /* Slate */
  --color-primary-dark: #434E5C; /* Slate Dark — for body anchor text */
  --color-accent:       #2A2D31; /* Ink — headings + body */
  --color-accent-dark:  #1E2024; /* Ink Dark — dark surfaces */
  --color-secondary:    #AAB0B8; /* Cool Gray — borders, eyebrows */
  --color-tertiary:     #9DB0A6; /* Muted Sage — sparingly */

  --color-bg:           #FBFBFA; /* Paper — primary surface */
  --color-bg-soft:      #F3F4F2; /* Soft Paper — alternating surface */

  --color-border-soft:  #E6E7E5; /* Faint dividers */

  --color-white-pure:   #FFFFFF;
```

- [ ] **Step 2: Replace the `:root` shadcn map values**

In the `:root` block, set: `--background: #FBFBFA; --foreground: #2A2D31; --card: #FFFFFF; --card-foreground: #2A2D31; --popover: #FFFFFF; --popover-foreground: #2A2D31; --primary: #586577; --primary-foreground: #FFFFFF; --secondary: #AAB0B8; --secondary-foreground: #2A2D31; --muted: #F3F4F2; --muted-foreground: #5F6469; --accent: #E8E9E7; --accent-foreground: #2A2D31; --border: #E6E7E5; --input: #E6E7E5; --ring: #586577; --link: #434E5C;`. Leave `--destructive`, `--chart-*`, `--radius`, and the sidebar tokens as they are (already neutral).

- [ ] **Step 3: Replace the `.dark` values**

In `.dark`, set: `--background: #17191C; --foreground: #F2F3F2; --card: #202327; --card-foreground: #F2F3F2; --popover: #202327; --popover-foreground: #F2F3F2; --primary: #8A96A6; --primary-foreground: #17191C; --secondary: #5A6068; --secondary-foreground: #F2F3F2; --muted: #202327; --muted-foreground: #AAB0B8; --accent: #2C3036; --accent-foreground: #F2F3F2; --ring: #8A96A6; --link: #8A96A6;`. Leave `--border`/`--input` (already `oklch(1 0 0 / N%)`), `--destructive`, `--chart-*`, and sidebar tokens.

- [ ] **Step 4: Verify the WCAG-critical pairs still pass AA**

Confirm by inspection or a contrast check: `--muted-foreground` on `--background` (light), `--link` on `--background` (light), `--foreground` on `--background` (both). Light `#5F6469` on `#FBFBFA` is ~5.6:1 and `#434E5C` on `#FBFBFA` is ~8:1, both pass. If any pair drops below 4.5:1 after a later tweak, darken the foreground token, do not lighten the background.

- [ ] **Step 5: Run the page and confirm both themes read as a coherent neutral brand**

Dev server, `/` and `/about`, light and dark, ~375px and ~1280px. Expected: cohesive slate/ink/paper look, no leftover bronze anywhere in chrome, buttons and focus rings are slate. Note any bronze that survives (it lives in hardcoded rgba in the polish layer; Task 6 handles it).

- [ ] **Step 6: Commit**

```powershell
git add src/styles/globals.css
git commit -m "feat: neutral Slate default palette (light + dark)"
```

### Task 6: De-hardcode brand color from the polish layer

**Files:**
- Modify: `src/styles/globals.css` (polish-layer rules with literal brand rgba)

- [ ] **Step 1: Introduce a tint variable**

In the `:root` block add `--tint-rgb: 88, 101, 119;` (the Slate primary as an RGB triplet) and in `.dark` add `--tint-rgb: 138, 150, 166;`.

- [ ] **Step 2: Replace the literal bronze rgba in the polish layer**

Replace every `rgba(156, 118, 97, X)` (Warm Bronze) and `rgba(184, 146, 116, X)` (dark-mode bronze) with `rgba(var(--tint-rgb), X)`, preserving each existing alpha `X`. These appear in `.surface-warm` (light and `.dark`), `.img-tint`, and the `.img-tint` hover rules. Replace the card-lift shadow `rgba(61, 61, 61, 0.22)` with `rgba(42, 45, 49, 0.22)` (neutral ink); leave the dark shadow `rgba(0, 0, 0, 0.6)`.

- [ ] **Step 3: Grep that no bronze literals remain**

```powershell
Select-String -Path "src\styles\globals.css" -Pattern "156, 118, 97|184, 146, 116|#9C7661|#7A5D4C|#B89274|#FAF8F5|#F5F0EB"
```

Expected: zero hits.

- [ ] **Step 4: Verify hover/scroll states**

Dev server. Hover a journal card (image zoom + tint), scroll a section with `.surface-warm`, check the reading-progress bar color on a journal post. Expected: all tints/accents are slate, not bronze, in both themes.

- [ ] **Step 5: Commit**

```powershell
git add src/styles/globals.css
git commit -m "refactor: drive polish-layer tints from --tint-rgb token, drop bronze literals"
```

### Task 7: Swap typefaces to a neutral default and make the script accent opt-in

**Files:**
- Modify: `src/styles/globals.css` (font imports + `--font-*` tokens)
- Modify: `package.json` (fontsource deps)

- [ ] **Step 1: Replace the font imports**

In `globals.css`, replace the Cormorant Garamond + Source Sans 3 + Pinyon Script imports with a neutral pairing:

```css
@import "@fontsource/libre-baskerville/400.css";
@import "@fontsource/libre-baskerville/700.css";
@import "@fontsource-variable/inter";
```

Remove the Pinyon Script import entirely. The script-accent code path stays (Task notes), but no script font loads by default.

- [ ] **Step 2: Repoint the font tokens**

In the `@theme` block set `--font-display: "Libre Baskerville", Georgia, serif;` and `--font-body: "Inter Variable", system-ui, sans-serif;`. Leave `--font-mono`. Set `--font-script` to a system fallback `"Snell Roundhand", "Apple Chancery", cursive;` so the opt-in accent degrades gracefully when no script font is loaded.

- [ ] **Step 3: Update fontsource dependencies**

In `package.json`, remove `@fontsource/cormorant-garamond`, `@fontsource-variable/source-sans-3`, and `@fontsource/pinyon-script`. Add `@fontsource/libre-baskerville` and `@fontsource-variable/inter`. Leave `@fontsource-variable/geist` only if still imported anywhere; grep first:

```powershell
Select-String -Path "src\**\*.css","src\**\*.astro" -Pattern "geist"
```

If zero hits, remove `@fontsource-variable/geist` too. Then run `npm install`.

- [ ] **Step 4: Document the script accent as opt-in**

Add a one-line comment above `@utility font-script` in `globals.css`: that enabling the editorial script accent means re-adding a script `@fontsource` import and pointing `--font-script` at it. (The full how-to lands in `docs/agent/animation.md` in Phase 3.)

- [ ] **Step 5: Verify type renders**

Run: `npm run build` then dev server. Open `/`, `/journal/[any post]`, `/about`. Expected: headings render Libre Baskerville, body Inter, no FOUC, drop cap on journal still works (it uses `--font-display`), no console 404 for a missing font file.

- [ ] **Step 6: Commit**

```powershell
git add src/styles/globals.css package.json package-lock.json
git commit -m "feat: neutral Libre Baskerville + Inter default type, script accent now opt-in"
```

### Task 8: Neutralize identity constants, logo, favicon, and OG inputs

**Files:**
- Modify: `src/data/site.ts`
- Modify: `scripts/generate-og-default.mjs` (inputs block)
- Replace: `public/favicon.svg`, the logo assets in `src/assets/`, `public/og-default.png`

- [ ] **Step 1: Neutralize `src/data/site.ts`**

Replace Reid identity constants with neutral placeholders that read as a template: business name `"Studio Starter"`, tagline `"Your tagline goes here"`, email `"hello@example.com"`, phone empty, city/region placeholders, empty socials. Keep the shape and exported names identical so consumers don't break.

- [ ] **Step 2: Neutralize the OG generator inputs**

In `scripts/generate-og-default.mjs`, set the inputs block (brand colors, tagline, wordmark text) to the new Slate palette and `"Studio Starter"`. Run: `npm run og`. Expected: `public/og-default.png` regenerates with neutral branding.

- [ ] **Step 3: Replace the favicon and logo**

Replace `public/favicon.svg` with a neutral mark (a simple monogram disc in Slate `#586577`, `prefers-color-scheme`-aware like the original). Replace the Reid logo variants in `src/assets/` with a neutral wordmark placeholder ("Studio Starter") at the same dimensions/filenames so component imports resolve. If a logo-variant generator exists, run `npm run` for it after swapping the source.

- [ ] **Step 4: Grep for surviving identity strings**

```powershell
Select-String -Path "src\**\*","public\**\*","scripts\**\*" -Pattern "Reid|Staci|Perkins|Plainfield|reiddesignllc|Indianapolis|Carmel|Fishers|Westfield|Zionsville|Noblesville" -CaseSensitive:$false
```

Expected after this stage: hits only inside `modules/` (acceptable, Phase 2 cleans those) and never in `src/`, `public/`, `studio/schemaTypes/` core, or `scripts/` kept files.

- [ ] **Step 5: Verify header/footer/OG**

Dev server. Confirm the header wordmark, footer, and `<head>` OG/title show "Studio Starter", favicon is the neutral mark, both themes. View source on `/` and confirm `og:image` points at the regenerated neutral PNG.

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "feat: neutral identity, logo, favicon, and OG defaults (Studio Starter)"
```

---

## Stage D — Strip Reid copy from core pages and content

### Task 9: Replace Reid business copy in the core pages with neutral placeholder copy

**Files:**
- Modify: `src/pages/index.astro`, `about.astro`, `services.astro`, `faq.astro`, `contact.astro`, `journal/index.astro`, `404.astro`, `privacy.astro`
- Modify: any static fallback copy inside core components (`Hero.astro`, `FinalCta.astro`, `SectionHeading.astro` defaults)

- [ ] **Step 1: Replace static Reid copy with neutral placeholders**

Walk each core page's static (non-Sanity) copy and replace Reid-specific sentences with neutral, on-pattern placeholder copy that keeps the same structure and length. Use clear `Studio Starter` / `Your ...` placeholders for identity. Do not invent a fake business; keep it obviously template copy so a future re-skin is unambiguous. Honor the project rule: no em-dashes in this site-facing copy.

- [ ] **Step 2: Neutralize the print stylesheet footer**

In `globals.css` `@media print`, change the `body::after` content from the hardcoded `"Reid Design LLC · reiddesignllc.com · Plainfield, IN"` to read from a CSS variable set in `BaseLayout.astro` from `site.ts`, or to a neutral literal `"Studio Starter"`; pick the literal for Phase 1 simplicity and note the dynamic option for Phase 3.

- [ ] **Step 3: Grep the core for Reid copy**

```powershell
Select-String -Path "src\**\*.astro","src\**\*.tsx","src\**\*.ts" -Pattern "Reid|Staci|Plainfield|reiddesignllc|transformative|elevated living" -CaseSensitive:$false
```

Expected: zero hits across `src/`.

- [ ] **Step 4: Verify every core page in both themes and viewports**

Dev server. `/`, `/about`, `/services`, `/faq`, `/contact`, `/journal`, `/privacy`, `/404`. Light + dark, ~375px + ~1280px. Expected: clean placeholder copy, correct layout, no leftover Reid references, no broken sections.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "content: neutral placeholder copy across core pages"
```

### Task 10: Remove Reid content seeders and confirm the core builds empty

**Files:**
- Delete: the Reid content seed scripts (the core relies on static fallbacks / coming-soon states, so it builds with an empty dataset)

- [ ] **Step 1: Confirm core pages have empty-state fallbacks**

Grep for the fallback pattern so we know the site survives an empty Sanity dataset:

```powershell
Select-String -Path "src\pages\*.astro" -Pattern "?? \[\]|length === 0|coming soon|fallback" -CaseSensitive:$false
```

Expected: core pages already guard empty content (per the Reid build's empty-state discipline). If a core page hard-requires a Sanity doc, add a minimal static fallback before deleting seeders.

- [ ] **Step 2: Build against the (empty) starter dataset**

Run: `npm run build`
Expected: PASS with no content. Pages render their fallbacks. (Generic core seed content is a Phase 3 deliverable.)

- [ ] **Step 3: Commit**

```powershell
git add -A
git commit -m "chore: core builds against an empty dataset via static fallbacks"
```

---

## Stage E — Strip one-off scripts and genericize the constitution

### Task 11: Delete the Reid-specific scripts, keep the reusable generators

**Files:**
- Delete from `scripts/`: the one-off Reid scripts
- Keep in `scripts/`: `generate-og-default.mjs`, `generate-og-pages.mjs`, `generate-llms-full.mjs`, `generate-logo-variants.mjs`, `optimize-logo-files.mjs`, `import-content.mjs`, `lib/`

- [ ] **Step 1: Delete the one-offs**

Remove: `apply-followup-fixes.mjs`, `bulk-upload-photos.mjs`, `bulk-upload-via-cli.mjs`, `enrich-asset-metadata.mjs`, `fix-collection-type-mismatches.mjs`, `fix-cta-link-types.mjs`, `fix-sanity-bad-values.mjs`, `inspect-homepage-copy.mjs`, `inspect-services-content.mjs`, `list-hero-candidates.mjs`, `migrate-home-hero-images.mjs`, `migrate-spacing-tokens.mjs`, every `patch-*.mjs`, `seed-about-personal.mjs`, `seed-conversion-content.mjs`, `seed-journal-content.mjs`, `seed-placeholder-content.mjs`, `seed-portfolio-and-404-singletons.mjs`, `seed-script-accents.mjs`, `seed-studio-guide.mjs`, `seed-studio-playbook.mjs`, `strip-editor-annotations.mjs`, `sweep-eyebrow-contrast.mjs`, `wire-key-images.mjs`.

- [ ] **Step 2: Confirm `package.json` scripts don't reference deleted files**

The `scripts` block references only `og`, `og:pages`, `llms:full`, `studio:dev`, `studio:deploy`, `studio:import` (-> `import-content.mjs`, kept). Verify no script points at a deleted file:

```powershell
Select-String -Path "package.json" -Pattern "patch-|seed-|migrate-|inspect-|fix-|wire-|sweep-|bulk-|enrich-|apply-followup|list-hero"
```

Expected: zero hits.

- [ ] **Step 3: Build to confirm nothing imported a deleted script**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "chore: remove Reid one-off scripts, keep reusable generators"
```

### Task 12: Genericize `CLAUDE.md` into the stack constitution

**Files:**
- Modify: `CLAUDE.md`
- Modify: `OPERATIONS.md` (light pass; full docs/agent genericization is Phase 3)

- [ ] **Step 1: Rewrite the project-identity sections**

In `CLAUDE.md`, replace the "About this project" and "Audience" sections with stack-level framing: this is the NCS Astro + Sanity starter; a new project fills in business + design; point to `docs/bootstrap/NEW-PROJECT.md` (Phase 3) as the setup entry point. Keep the "Stack essentials", "The rules that bite", "Build pipeline", "Code conventions", "Visual verification workflow", and "Working with Claude" sections nearly verbatim, swapping Reid nouns for neutral ones.

- [ ] **Step 2: Preserve the gotchas list exactly**

Keep these rules intact (they are the point of the starter): run `studio:deploy` after any schema change and never click "Remove field"; build in both themes; static content needs a rebuild to go live; desktop nav is server-rendered; the Lenis scroll reset stays; `typegen` runs before `astro build` and `sanity.types.ts` is committed; `accordion.tsx` is customized and reverts on `npx shadcn add`; `@astrojs/cloudflare` is pinned to exactly `13.5.5` because `13.6.0` regressed Astro's image optimizer (it writes optimized images to `dist/client/_astro/` while the optimizer reads from `dist/_astro/`), so do not bump it without a verifying build. Generalize only the wording, not the substance.

- [ ] **Step 3: Update the Routes table and the Foundation/Safe-to-edit taxonomy**

Trim the Routes table to core routes only. In the Foundation vs Safe-to-edit lists, remove references to moved module files and the deleted scripts. Add a short "Modules" note pointing at `modules/` and Phase 2.

- [ ] **Step 4: Grep `CLAUDE.md` and `OPERATIONS.md` for Reid specifics**

```powershell
Select-String -Path "CLAUDE.md","OPERATIONS.md" -Pattern "Reid|Staci|Plainfield|reiddesignllc|ba403vjc|Bronze|Cormorant|Pinyon" -CaseSensitive:$false
```

Expected: zero hits, except an explicit "forked from the Reid Design build" provenance line if you choose to keep one.

- [ ] **Step 5: Commit**

```powershell
git add CLAUDE.md OPERATIONS.md
git commit -m "docs: genericize CLAUDE.md into the stack constitution"
```

---

## Stage F — Whole-core verification and first real commit

### Task 13: Configure the starter for its own Sanity + domain placeholders

**Files:**
- Modify: `src/lib/sanity.ts` (projectId/dataset via env), `astro.config.mjs` (`site`), `wrangler.jsonc` (name), `studio/sanity.config.ts` + `studio/sanity.cli.ts` (projectId)

- [ ] **Step 1: Move the Sanity projectId/dataset to env with placeholders**

Confirm `src/lib/sanity.ts` reads `projectId`/`dataset` from `import.meta.env` (`PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET`). If the Reid id `ba403vjc` is hardcoded anywhere, replace with the env read and add a `.env.example` documenting the vars. Studio config (`sanity.config.ts`, `sanity.cli.ts`) should read from env or a clearly-marked placeholder constant.

- [ ] **Step 2: Neutralize `site` and the Worker name**

Set `astro.config.mjs` `site: 'https://example.com'` (placeholder). Set `wrangler.jsonc` `name` to `ncs-astro-sanity-starter`. Grep for Reid infra strings:

```powershell
Select-String -Path "astro.config.mjs","wrangler.jsonc","src\lib\sanity.ts","studio\sanity.config.ts","studio\sanity.cli.ts" -Pattern "reiddesignllc|reid-design-site|ba403vjc"
```

Expected: zero hits.

- [ ] **Step 3: Build with placeholder env**

Create `.env` from `.env.example` with a throwaway/empty Sanity project (or the build-time empty-dataset path). Run: `npm run build`. Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "chore: env-driven Sanity config + neutral site/worker placeholders"
```

### Task 14: Full verification gate and bring the spec into the repo

**Files:**
- Create: `docs/superpowers/specs/2026-05-30-astro-sanity-starter-design.md` (copy the approved spec into the new repo)
- Create: `README.md` quickstart (light pass; full bootstrap docs are Phase 3)

- [ ] **Step 1: Zero-Reid grep across the whole core**

```powershell
Select-String -Path "src\**\*","studio\schemaTypes\*","studio\*.ts","public\**\*","scripts\**\*","*.md","*.mjs","*.json","*.jsonc" -Pattern "Reid|Staci|Plainfield|reiddesignllc|ba403vjc" -CaseSensitive:$false
```

Expected: hits only inside `modules/` (Phase 2 territory) and an optional provenance line. Anything else is a miss; fix it.

- [ ] **Step 2: Clean build of both workspaces**

Run: `npm run build` then `npm --prefix studio run build`
Expected: both PASS.

- [ ] **Step 3: Full visual verification of the core**

Dev server. For each core route (`/`, `/about`, `/services`, `/faq`, `/contact`, `/journal`, `/privacy`, `/404`): light + dark, ~375px + ~1280px, keyboard-tab the interactive elements (theme toggle, mobile nav, contact form, accordions). Expected: cohesive neutral brand, no bronze, no Reid copy, no console errors, nav is core-only.

- [ ] **Step 4: Lighthouse on the core pages**

Run Lighthouse (desktop) on `/`, `/about`, `/journal`. Expected: 100 on Accessibility, Best Practices, SEO. Investigate any drop before proceeding (the Reid build held 100; a regression here means the neutralization broke something).

- [ ] **Step 5: Add the spec and a minimal README, then make the first real commit**

Copy the approved design spec into `docs/superpowers/specs/` in the new repo. Write a short `README.md`: what the starter is, the stack, `npm install` + `npm --prefix studio install` + `npm run dev`, and a pointer to `CLAUDE.md` and (coming in Phase 3) `docs/bootstrap/NEW-PROJECT.md`.

```powershell
git add -A
git commit -m "docs: add design spec + README; core foundation complete"
```

- [ ] **Step 6: Optional deploy smoke test**

If a throwaway Cloudflare Workers target is available, run `npm run deploy` and load the URL. Expected: the neutral core serves, both themes work. If no target yet, note it as the first item for the project that adopts the starter.

---

## Self-Review (completed during authoring)

- **Spec coverage:** Build-method (fork-and-strip) -> Task 1; module extraction -> Tasks 2-4; design seam / brand neutralization -> Tasks 5-9; strip one-off scripts -> Task 11; genericize CLAUDE.md -> Task 12; env-driven config + placeholders -> Task 13; success criteria (zero-Reid, builds, both themes, Lighthouse, modules staged) -> Task 14. The spec's "neutral but complete, runs out of the box" requirement is enforced by the build + visual gates in every stage. Phase 2 (module enable docs + seeds) and Phase 3 (docs/agent genericization + NEW-PROJECT runbook + generic core seed) are explicitly deferred and named.
- **Placeholder scan:** No "TBD/TODO/handle later". Brand values, token edits, structure.ts/index.ts removals, and script deletions are all concrete and enumerated. Copy replacement (Task 9) is procedural-with-a-grep-gate by necessity, since the literal copy is a per-project design choice; the acceptance test (zero Reid references + visual check) is concrete.
- **Consistency:** Module names, moved-file lists, kept-script lists, and the neutral token names (`--tint-rgb`, `--color-primary` = `#586577`) are used consistently across tasks. The `schemaTypes` array contents in Task 2 match the core/keep list in Task 14's grep expectations.

---

## Execution arc

Phase 1 (this plan) yields a brand-neutral, building, deployable core with the specialized surfaces staged in `modules/`. Then:
- **Phase 2 plan:** module-library polish — per module, finalize its self-contained folder, write `docs/modules/<name>.md` enable guide, genericize its seed, verify it enables into the core without breaking the build and shows a coming-soon state unconfigured.
- **Phase 3 plan:** genericize the 15 `docs/agent/` topic docs (split out `animation.md`), write `docs/bootstrap/NEW-PROJECT.md` + `setup-checklist.md` + `docs/brand/voice.md`, add a generic core seed, and dry-run the full new-project runbook end to end.

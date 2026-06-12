# Change history

> Running change log, moved out of CLAUDE.md so it does not load on every task.

*2026-05-30 — Forked from the Reid Design build; genericized to the ncs-astro-sanity-starter (core foundation + opt-in module library + bootstrap docs). Future projects start their own history from this entry.*

---

*2026-06-12 — Page-builder-first upgrade (A through D).*

**A -- Page-builder core.** `studio/schemaTypes/sections.ts` defines 9 general block types (heroSection, richTextSection, imageTextSection, gallerySection, quoteSection, statSection, ctaBandSection, videoSection, spacerSection), a `SECTION_TYPES` constant as the single source of truth, and `additionalSectionsField` as an append zone any page can import. `src/components/SectionRenderer.astro` maps each block `_type` to a component and owns the alternating-surface cadence (logic extracted to `src/lib/sectionCadence.ts`, unit-tested; blocks carry no color field). A custom `page` document type gives editors free-form pages served by `src/pages/[slug].astro`. Reserved-slug guard lives inside `getStaticPaths` (Astro isolated-scope requirement); shared list at `src/lib/reservedSlugs.ts`, unit-tested. `businessInfo` singleton split out of `siteSettings` (service areas, travel, availability, geo); `getSiteSettings()` merges them back under flat names. GROQ `sectionsProjection()`, `getPage`, `getAllPageSlugs`, and `getNavPages` added to `src/lib/queries.ts`.

**B -- Section-driven core pages.** `studio/schemaTypes/richSections.ts` defines 8 rich section types (founderSection, servicesGridSection, testimonialsSection, storySection, valuesSection, processSection, serviceAreaSection, guaranteeSection) and per-page curated lists. The home, about, services, and process pages now hold a `pageBuilder` array (their old structured fields are hidden + readOnly for rollback); all four routes render via `<SectionRenderer>`. `src/data/defaultSections.ts` holds code-defined default section arrays so a fresh clone with no Sanity project still renders non-blank. The process page graduated from a module into core. `scripts/seed-core.mjs` seeds the `pageBuilder` arrays.

**C -- Modules (lean).** The 9 feature modules (portfolio, shop, e-design, gift-certificates, press, resources, lead-magnets, style-quiz, budget-calculator) ship built and OFF under `modules/`. Enabling is now copy-a-folder: each module's query functions live at `modules/<name>/src/lib/<name>Queries.ts`, so there is no hand-pasting into core `queries.ts`. `siteSettings.sectionVisibility` toggles each. Offering pages (e-design, gift, press, resources) stay fixed-order by choice.

**D -- Brand reskin system.** `brand/brand.config.json` is the single source of truth (identity + palette + fonts + logo paths). `npm run apply-brand` (`scripts/apply-brand.mjs`) deterministically and idempotently rewrites `globals.css` tokens, `src/data/site.ts`, `studio/sanity.config.ts`, OG inputs, and font imports, then regenerates the OG image. The `/reskin` Claude skill (`.claude/skills/reskin/SKILL.md`) orchestrates the full rebrand: interview, font package install, apply-brand, WCAG AA contrast check, visual check via defaultSections, copy retone, and human checklist.

**Verification baseline after this upgrade:** `npm run build`, `npm run typegen`, `npm test` (22 node --test unit tests for sectionCadence + reservedSlugs), `npm --prefix studio run build`. Live Playwright screenshots and actual seed runs require a connected Sanity project.*

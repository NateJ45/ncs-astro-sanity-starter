# NCS Astro + Sanity Starter — CLAUDE.md

This is the always-loaded reference for the `ncs-astro-sanity-starter` codebase: the conventions and landmines an agent needs on every task. Deep detail for specific areas (theme, components, SEO, performance, Sanity, deployment) lives under `docs/agent/` and is read on demand. The topic index at the bottom is the map.

Companion tactical runbook: `OPERATIONS.md`. New-project setup entry point: `docs/bootstrap/NEW-PROJECT.md` (authored in a later phase — that runbook is the intended start for any team adapting this starter for a new client).

---

## About this starter

`ncs-astro-sanity-starter` is a production-ready Astro + Sanity + Cloudflare Workers site template forked from a finished client build. This is a **page-builder-first** starter: the home, about, services, and process pages all render via a shared `SectionRenderer` component fed by Sanity `pageBuilder` arrays, and any custom page created in the Studio gets a `/[slug]` route for free. The infrastructure -- build pipeline, CMS integration, deploy hooks, polish layer, section-visibility system, component library, Lighthouse 100/100/100/100 baseline -- is already standing. A new project pours in two things: its brand identity (run `npm run apply-brand` with `brand/brand.config.json`) and its content.

This starter is not a minimal scaffold. It ships with real patterns and real gotchas documented from production. The point is to skip the month of discovering them.

_Provenance: forked from the Reid Design build._

---

## Stack essentials

Full stack notes and the `astro.config.mjs` landmines are in `docs/agent/stack-and-config.md`. The must-knows:

- **Astro 6.3.x**, TypeScript strict, `output: 'static'`. Node 22.12+.
- **Sanity v5** is the CMS (schemas in `studio/schemaTypes/`). All editable content lives in Sanity. `npm run typegen` regenerates types from the schemas.
- **Tailwind 4 via `@tailwindcss/vite`.** There is no `tailwind.config.mjs`. Brand tokens live in `@theme` blocks in `src/styles/globals.css`.
- **React 19 islands** for interactivity; Astro components for everything static.
- **Cloudflare Workers** for hosting, not Pages (Pages is in maintenance mode). Deploy with `wrangler deploy`.
- **Web3Forms** contact form, **Calendly** discovery call, **Cloudflare Web Analytics** (cookieless, no banner).
- **`sanityFetch(query, params, fallback)`** in `src/lib/sanity.ts` is the single chokepoint for all Sanity reads. When `PUBLIC_SANITY_PROJECT_ID` is absent or set to the placeholder value, it returns the fallback without any network call, so `npm run build` succeeds with no Sanity project configured -- pages render their default-sections content (see below).
- **Page builder:** `src/components/SectionRenderer.astro` maps each block `_type` to a component and owns the alternating-surface cadence (logic in `src/lib/sectionCadence.ts`, unit-tested). Blocks carry no color field; the cadence is automatic.
- **Default sections fallback:** `src/data/defaultSections.ts` holds code-defined default content arrays for each core page. When a page's `pageBuilder` array is absent (fresh clone, no Sanity project), the route uses the defaults, so the site always renders non-blank content.
- **Brand reskin:** `brand/brand.config.json` is the single source of truth for identity + palette + fonts + logo paths. Running `npm run apply-brand` deterministically rewrites `globals.css` tokens, `src/data/site.ts`, Studio theme inputs, and the OG image. For a full rebrand orchestration (interview, font install, apply, contrast check, copy retone) use the `/reskin` skill at `.claude/skills/reskin/SKILL.md`.

### The rules that bite if you forget them

1. **Run `npm run studio:deploy` after ANY schema change.** Skip it and the hosted Studio shows "unknown fields" next to a "Remove field" prompt. **Never click "Remove field":** it deletes that field's data across every document and cannot be undone without a dataset restore. Correct sequence: edit schema, `npm run typegen`, `npm run studio:deploy`, commit.
2. **No em-dashes in public-facing site copy** (the text visitors read: page copy, component text, Sanity content). Use commas, colons, or restructure. Code comments, commit messages, plans, specs, and internal docs are exempt.
3. **Build in both light AND dark mode** on every UI change. Detail in `docs/agent/theme-and-color.md`.
4. **Desktop nav is server-rendered** in `Header.astro`. Do not regress it to a client-only island. Detail in `docs/agent/page-architecture.md`.
5. **The Lenis scroll reset on navigation** (forward goes to top, back/forward restores) lives in the BaseLayout Lenis init. Do not remove it. Detail in `docs/agent/polish-layer.md`.
6. **Content is statically built.** A Sanity edit only goes live after a rebuild (push to `main`, or the publish webhook). Detail in `docs/agent/deployment.md`.
7. **After any schema change, run `npm run typegen` before `npm run build`.** `npm run build` runs `astro build` only and does not chain typegen. Use `npm run build:full` to run both in sequence. `src/lib/sanity.types.ts` is committed so collaborators can read schema types in code without running typegen.
8. **`@astrojs/cloudflare` is pinned to exactly `13.5.5`.** Version `13.6.0` regressed Astro's image optimizer: optimized images write to `dist/client/_astro/` while the optimizer reads from `dist/_astro/`. Do not bump the adapter version without doing a verifying build.
9. **`pageBuilder` cadence is managed by `SectionRenderer`, not by the blocks themselves.** Blocks carry no surface/color field. The alternating-surface logic lives in `src/lib/sectionCadence.ts`. Do not add color fields to block schemas.
10. **The reserved-slug guard lives inside `getStaticPaths` in `[slug].astro`,** not at module scope. This is an Astro isolated-scope requirement; shared list is in `src/lib/reservedSlugs.ts`. If you move the guard outside `getStaticPaths`, it silently stops working.
11. **`apply-brand` does not install font packages.** Run `npm install @fontsource/...` for the chosen fonts before running `npm run apply-brand`. The script rewrites imports and tokens but cannot install packages itself.
12. **After `apply-brand`, run `npm run build`** to verify the reskin did not break anything. The brand script does not run the build chain and does not change schemas, so typegen is not needed here unless you also changed a schema in the same session.

---

## Build pipeline

`npm run build` runs `astro build` only. It does NOT chain typegen.

After any schema change, run `npm run typegen` first, then `npm run build`. Or use `npm run build:full` which chains both in one command: `npm run typegen && astro build`.

`astro build` fetches content from Sanity at build time via the `sanityFetch` wrapper in `src/lib/sanity.ts`. When no Sanity project is configured, `sanityFetch` returns the provided fallback for every query, and the build still completes successfully with empty-state pages.

`src/lib/sanity.types.ts` is committed to the repo so collaborators can see schema types in code without running typegen themselves.

Standalone scripts:

- `npm run typegen` to regenerate Sanity TypeScript types after editing schemas (run this after any schema change before testing locally).
- `npm run og` to re-run `scripts/generate-og-default.mjs` and regenerate `public/og-default.png` (after changing brand colors, tagline, or the wordmark in the script's inputs block).
- `npm run apply-brand` to deterministically rewrite `globals.css` tokens, `src/data/site.ts`, Studio theme inputs, font imports, and the OG image based on `brand/brand.config.json`. Idempotent -- safe to re-run.
- `npm run seed` runs `scripts/seed-core.mjs`. It creates or replaces the core singletons (`siteSettings`, `homePage`, `aboutPage`, `servicesPage`, `processPage`, `faqPage`, `contactPage`, `journalPage`, `privacyPage`, `notFoundPage`, `studioGuide`, `studioNotes`, `studioPlaybook`) and seed collection docs (services, processSteps, testimonials, philosophyPoints, journalCategories, journalEntries, faqItems). Requires `PUBLIC_SANITY_PROJECT_ID` and `SANITY_API_WRITE_TOKEN` in `.env`. Idempotent: uses `createOrReplace` with deterministic `_id` values so re-running is safe.
- `npm test` to run the 22 unit tests (node --test) covering `sectionCadence` and `reservedSlugs`.
- `npm run studio:dev` to start the Sanity Studio locally for content editing.
- `npm run studio:deploy` to deploy the Sanity Studio to its hosted URL. **Run this after every schema change.** If you skip it, the hosted Studio shows "unknown fields" warnings next to data in new fields, and the editor sees a prompt to "Remove field." Do NOT click "Remove field" in Studio: it deletes the Sanity document data for every document with that field populated, and it cannot be undone without a dataset restore. The correct sequence is: edit schema, `npm run typegen`, `npm run studio:deploy`, commit.

`public/og-default.png` is committed to the repo because it is a real asset shipped to visitors.

---

## Code conventions

- TypeScript strict mode. No `any`.
- Comment generously, especially in components that a future maintainer might edit by hand.
- At the top of each component file, add a header comment marking it `// Safe to edit by hand` or `// Foundation, edit with care`.
- Astro components for static content. React islands only where interactivity is required (lightbox, mobile nav, form handler, before/after slider, accordions).
- Prefer Astro's built-in `<Image />` and `<Picture />` components over plain `<img>` tags for any locally-bundled assets. For Sanity-hosted images, use the project's `<SanityImage />` wrapper (see image handling section).
- Tailwind utility classes inline. Pull into `@apply` only when a pattern repeats four or more times.
- Use `clsx` or `class-variance-authority` for conditional classes once components get state-dependent styling.

---

## Routes summary

Core routes that ship with the starter (always on, not toggleable):

| Path | Source | Notes |
|---|---|---|
| `/` | `src/pages/index.astro` | Home -- section-driven via `pageBuilder` + `SectionRenderer` |
| `/about` | `src/pages/about.astro` | About -- section-driven via `pageBuilder` + `SectionRenderer` |
| `/services` | `src/pages/services.astro` | Services -- section-driven via `pageBuilder` + `SectionRenderer` |
| `/process` | `src/pages/process.astro` | Process -- section-driven via `pageBuilder` + `SectionRenderer` (graduated from module into core) |
| `/[slug]` | `src/pages/[slug].astro` | Custom pages created in the Studio; reserved slugs are filtered inside `getStaticPaths` (see `src/lib/reservedSlugs.ts`) |
| `/faq` | `src/pages/faq.astro` | FAQ page + faqItem collection grouped by category |
| `/contact` | `src/pages/contact.astro` | Contact page + Web3Forms form + Calendly embed |
| `/journal` | `src/pages/journal/index.astro` | Post grid with category chips |
| `/journal/[slug]` | `src/pages/journal/[slug].astro` | Post detail: reading progress + header + cover + body + related |
| `/privacy` | `src/pages/privacy.astro` | Privacy policy from singleton, with static fallback when doc is absent |
| `/journal/rss.xml` | `src/pages/journal/rss.xml.ts` | Journal RSS feed |
| `/robots.txt` | `src/pages/robots.txt.ts` | Generated; reads production URL from `site.ts` |
| `/sitemap-index.xml` | `@astrojs/sitemap` (auto) | Production sitemap |
| `/404` | `src/pages/404.astro` | Custom 404 |

The section-driven pages (home/about/services/process) render whichever `pageBuilder` array Sanity provides. If the array is absent (fresh clone, no Sanity project), the route falls back to code-defined defaults in `src/data/defaultSections.ts`, so the site is never blank.

Additional routes come from opt-in modules staged under `modules/` (OFF by default). Each module is documented under `docs/modules/`. There are 10 modules: `portfolio`, `shop`, `e-design`, `gift-certificates`, `press`, `resources`, `lead-magnets`, `newsletter`, `style-quiz`, `budget-calculator`.

---

## Safe to edit by hand

These are the files where a project maintainer can make changes without risk of breaking the underlying architecture:

- Text content inside `src/pages/*.astro` (everything outside the frontmatter and Sanity-fetched content)
- `src/data/site.ts` -- static identity constants (site name, domain, brand color mirrors for scripts, asset paths). Replace all placeholder values before launch. (Written automatically by `npm run apply-brand`; also safe to edit by hand.)
- **The brand config (preferred reskin path):**
  - `brand/brand.config.json` -- single source of truth for identity, palette, fonts, and logo paths. Edit this, then run `npm run apply-brand` and it cascades to globals.css, site.ts, the Studio theme, and the OG image.
  - For a full rebrand orchestration (font install, brand apply, contrast check, copy retone) use the `/reskin` skill at `.claude/skills/reskin/SKILL.md`.
- The design seam -- files that define the visual identity of the project (also written by `apply-brand`; safe to edit directly if you know what you're changing):
  - `src/styles/globals.css` `@theme` block: palette tokens (`--color-primary`, `--color-ink`, `--color-paper`, etc.), the `--tint-rgb` token (controls polish-layer tint color across card-lift, surface-warm, and branded overlays), and font-family tokens
  - Font imports at the top of `src/styles/globals.css` (swap `@fontsource/libre-baskerville` and `@fontsource-variable/inter` for a project's chosen fonts; update `--font-display` and `--font-body` tokens accordingly)
  - `public/favicon.svg`, `public/og-default.png` (regenerate OG via `npm run og` after changing brand inputs in `scripts/generate-og-default.mjs`)
  - Logo files in `src/assets/` (imported by `Header.astro` / `Footer.astro` via `getImage()`)
- `src/data/defaultSections.ts` -- code-defined default section arrays for the section-driven core pages. These are the fallback content shown when no Sanity project is connected. Safe to edit as long as each object matches its schema type.
- Images in `src/assets/` (logo variants, OG image)
- Copy strings and `href` values in static page components
- Tailwind utility classes on existing components when content needs different visual weight
- Brand colors, tagline, and wordmark inputs in `scripts/generate-og-default.mjs` (re-run `npm run og` after editing)
- `docs/brand/voice.md` -- per-project voice and copy guidelines (fill in per project; the `/reskin` skill rewrites this during a full rebrand)

**Enabling the script accent (opt-in):** The calligraphic script accent is OFF by default. No script font loads unless you opt in. To enable it for a project: (1) add a `@fontsource` import for your chosen calligraphic face (e.g. `@fontsource/great-vibes/400.css`), and (2) update `--font-script` in the `@theme` block to name that face first. Components using the `font-script` utility class will then render the calligraphic accent.

## Foundation, edit with care (route through a planned session)

- `src/styles/globals.css` -- the full file beyond the design seam tokens: shadcn `:root` / `.dark` overrides, **polish-layer utilities** (`.card-lift`, `.press-tactile`, `.nav-underline`, `.site-header`, `.reading-progress`, `.surface-warm`, `[data-reveal]`), base resets, paper-grain `body::before`, print stylesheet
- `studio/schemaTypes/*.ts` -- Sanity schemas. Changing fields can break existing content. See gotcha #1 above. Key new schemas: `studio/schemaTypes/sections.ts` (9 general block types + `SECTION_TYPES` + `additionalSectionsField`), `studio/schemaTypes/richSections.ts` (8 rich section types + per-page curated lists), `studio/schemaTypes/businessInfo.ts` (service areas, travel, availability, geo -- split from siteSettings; merged back by `getSiteSettings()`), `studio/schemaTypes/page.ts` (custom page document type).
- `src/lib/sanity.ts` -- Sanity client, `sanityFetch` wrapper, `urlFor`, `parseSanityAssetDimensions`. The `isSanityUnconfigured` guard and graceful-fallback behavior are load-bearing for fresh-clone builds.
- `src/lib/queries.ts`, `src/lib/sanity.types.ts` -- GROQ queries and generated types. Includes `sectionsProjection()`, `getPage`, `getAllPageSlugs`, `getNavPages`.
- `src/lib/sectionCadence.ts` -- logic that maps section index to surface variant (the alternating-bg cadence). `SectionRenderer` calls this; blocks have no color field. Unit-tested in `src/lib/sectionCadence.test.ts`.
- `src/lib/reservedSlugs.ts` -- the list of slugs the custom `[slug].astro` route must not serve (because they are handled by dedicated pages). Consumed inside `getStaticPaths` in `[slug].astro`. Unit-tested in `src/lib/reservedSlugs.test.ts`.
- `src/components/SectionRenderer.astro` -- the page-builder runtime. Maps each block `_type` to its component and applies the surface cadence from `sectionCadence.ts`. Changing the type-to-component map here affects all section-driven pages.
- `src/lib/scriptAccent.ts` -- shared helper `splitScriptAccent(headline, accent)` used by `Hero.astro`, `SectionHeading.astro`, and `FinalCta.astro`
- `src/lib/sectionVisibility.ts` -- `getSectionVisibility(raw)` converts the raw `siteSettings.sectionVisibility` Sanity object into a flat boolean map. Rule: `value !== false` (unset/null/true = visible; only explicit false = hidden). Every toggleable page imports this. See [Section visibility](docs/agent/page-architecture.md#section-visibility).
- `src/layouts/BaseLayout.astro` -- anti-FOUC theme bootstrap, skip link, header/main/footer wiring, View Transitions ClientRouter, Lenis init, **scroll-reveal observer**, **sticky-header scroll listener**, Cloudflare Analytics, OG meta, JSON-LD, title-suffix-doubling guard
- `src/components/ui/` shadcn primitives -- **note: `accordion.tsx` is customized** (removed `h-(--radix-accordion-content-height)` lock + dropped `text-sm font-medium` from trigger). If you reinstall via `npx shadcn add` it will revert; reapply the changes.
- React islands: `MobileNav.tsx`, `ThemeToggle.tsx`, `BackToTop.tsx`, `ContactForm.tsx`, `BeforeAfterSlider.tsx`, `FaqAccordion.tsx`, `CalendlyInline.tsx`, `StickyCTAChip.tsx`, `CopyEmailButton.tsx`, `PortableText.tsx`, `JournalPortableText.tsx`, `StatsCounter.tsx`, `NewsletterSignup.tsx`
- Astro wrappers: `SanityImage.astro`, `StructuredData.astro` (if present), `SectionHeading.astro`, `SectionDivider.astro`, `ServiceAreaCue.astro`, `ReadingProgress.astro`, `ProcessStepIllustration.astro`, `Hero.astro`, `HeroBackground.astro`, `FinalCta.astro`, `CtaLink.astro`, `StatsRow.astro`, `FeaturedWork.astro`, `FeaturedJournal.astro`, `PressStrip.astro`; section components in `src/components/sections/`
- `scripts/apply-brand.mjs` -- the brand reskin script. Reads `brand/brand.config.json` and rewrites globals.css, site.ts, Studio config, and regenerates the OG image. Idempotent.
- `scripts/generate-og-default.mjs`, `scripts/generate-og-pages.mjs`, `scripts/generate-llms-full.mjs`, `scripts/generate-logo-variants.mjs`, `scripts/optimize-logo-files.mjs`, `scripts/import-content.mjs` -- reusable generator and import scripts
- `astro.config.mjs`, `wrangler.jsonc`, `package.json`, `tsconfig.json`, `components.json`
- `public/_headers` (security response headers shipped with the deploy)
- `src/pages/robots.txt.ts` (generated endpoint; reads the production URL from `src/data/site.ts` and emits allow-all + correct sitemap reference at build time -- do not create a static `public/robots.txt`)
- `public/llms.txt` (AI/LLM crawler index -- update if major pages change)

**Modules:** files under `modules/` each contain a page, islands, schema additions, and a co-located query file (`modules/<name>/src/lib/<name>Queries.ts`). Enabling a module is copy-a-folder: copy the module folder into `src/` and `studio/schemaTypes/`, register the schema in `studio/schemaTypes/index.ts`, and toggle it on in `siteSettings.sectionVisibility`. The co-located query file means no hand-pasting into core `queries.ts`. Per-module guides are in `docs/modules/`. Do not edit module internals without reading its doc first.

If a change requires editing the foundation set, do it in a planned session, write the change deliberately, and update this doc when the architecture shifts.

---

## Visual verification workflow

Every UI change is verified visually before being reported done. The build that ships first-time-right is the one where the person who wrote the code saw it rendering correctly in every state that matters. This is a rule, not a habit.

### What to verify

For any change touching components, layouts, styles, or copy that affects layout:

1. **Both themes.** Light AND dark. Toggle in the running site via the header `ThemeToggle`, or use Chrome DevTools' "Emulate CSS prefers-color-scheme" while testing system mode. Light is primary, but dark must read as the brand, not as broken.
2. **Both viewports.** Mobile (~375px wide) and desktop (~1280px wide). Most visitors arrive on mobile. Never ship desktop-only.
3. **Interactive states.** Hover, focus (keyboard Tab), active. Test with mouse AND keyboard.
4. **Adjacent regressions.** Look at the sections immediately before and after the change. Cascading styles wreck neighbors more often than expected.

### How to verify

Use the Playwright MCP for screenshot-and-compare loops:

1. `npm run dev` (or hit the deployed URL for deployed changes)
2. Open the page via Playwright MCP at both viewports
3. Take screenshots, light and dark
4. Compare against the intent (spec, mockup, or prior screenshot)
5. If something's off, fix and re-screenshot. Don't ship a change you haven't seen rendered.

For accessibility-affecting changes, run Lighthouse on the changed page before opening a PR. Targets: 100/100/100/100 desktop. Defend them — when a score drops, find out why before merging.

For Sanity Studio testing (schema or structure changes), run `npm run studio:dev` and check the editor experience as a content editor would see it. The Studio is the editor's UI; broken Studio = broken editor workflow.

### When NOT to skip this

Even "tiny" changes — a color tweak, a spacing nudge, a copy edit — go through the same loop. The smallest changes are where regressions hide because no one looks at them.

---

## Working with Claude

- Use Claude Code from the desktop app, not the terminal. Show diffs clearly so they read well in that UI.
- Prefer Plan Mode for any multi-file change, especially when touching Sanity schemas (schema changes propagate to live content).
- Pause for confirmation before installing new dependencies.
- When proposing design changes, describe the visual outcome in plain language, not just the code.
- For browser-based verification, prefer the Playwright MCP. See the [Visual verification workflow](#visual-verification-workflow) section above for what to verify and when.
- For Sanity Studio testing, run `npm run studio:dev` and check the editor experience as a content editor would see it.
- Don't report a UI change as done without screenshots in both themes and both viewports.

---

## Communication style

These apply to everything written: code comments, PR descriptions, commit messages, and copy on the site itself.

- Warm, conversational tone. Not stiff or corporate.
- Step-by-step structure for any process or how-to.
- No em-dashes in public-facing site copy. Use commas, periods, colons, or restructure the sentence. This rule is scoped to site copy only: code comments, commit messages, plans, specs, and internal docs may use em-dashes.
- No AI-tell phrases: delve, navigate (as a verb), leverage, robust, seamless, meticulous, tapestry, realm, landscape, testament to, ever-evolving, crucial, pivotal.
- No AI-tell sentence patterns: "It's not just X, it's Y," "Not only... but also," "It's important to note that," "When it comes to," "In the realm of," "That said" or "With that being said" as transitions.
- Don't open replies with filler like "Certainly!", "Absolutely!", "Great question!", or "I'd be happy to help."
- Don't close replies with "I hope this helps!" or "Let me know if you have any questions." End on the actual content.
- Avoid three-item lists where the third item is filler. Two items is fine if two is the truth.
- Use bold for genuine emphasis or list labels only, never random nouns mid-sentence.
- Default to prose, not headers and bullets, unless content is genuinely a list or step-by-step.
- Comment code generously so future maintainers can follow without reverse-engineering.

### Site copy voice (for copy that appears on the live site)

Good site copy for a service business follows five patterns. Full rationale and examples should go in a project-specific voice doc.

1. **Say it plainly. Especially about money.** Don't apologize, don't pad, don't soften prices with hedging language.
2. **Sound like a smart friend, not a brochure.** No "transformative experiences" or "elevated living."
3. **Show the thinking, not the credentials.** Specific reasoning beats generic claims of expertise.
4. **Stop talking when you're done.** End the paragraph. Don't tack on a closing line that restates the point.
5. **Be specific.** Concrete details beat generic descriptors.

Banned vocabulary: "transformative," "curated experience," "investment in your space," "elevated living," "tailored solutions."

---

## Topic index

Read these on demand. They are NOT auto-loaded, and they are referenced as plain paths so they stay lazy. Open with the Read tool when a task touches the area.

**Note:** the `docs/agent/` deep-dives are being genericized in a later pass. Some may still contain client-specific examples until that pass completes. Trust the patterns; ignore client-specific nouns.

`docs/bootstrap/` and `docs/modules/` are forthcoming (authored in a later phase). `docs/bootstrap/NEW-PROJECT.md` will be the setup entry point for adapting this starter to a new project.

| Area | Doc |
|---|---|
| Stack detail + astro.config landmines | `docs/agent/stack-and-config.md` |
| Page + section architecture, nav, visibility toggles | `docs/agent/page-architecture.md` |
| Brand colors + theme system (light/dark discipline) | `docs/agent/theme-and-color.md` |
| Brand reskin system (config schema, apply-brand, /reskin skill) | `docs/brand/brand-system.md` |
| Polish layer (brand stripe, card-lift, scroll, Lenis, script accents) | `docs/agent/polish-layer.md` |
| Animation layer (Lenis, motion, scroll-reveal, script accent) | `docs/agent/animation.md` |
| Typography + spacing tokens | `docs/agent/design-tokens.md` |
| Component catalog + long-read layout | `docs/agent/components.md` |
| Error + empty states | `docs/agent/error-states.md` |
| Image handling | `docs/agent/images.md` |
| Accessibility | `docs/agent/accessibility.md` |
| SEO + JSON-LD | `docs/agent/seo.md` |
| Performance budgets + Lighthouse | `docs/agent/performance.md` |
| Content data + Sanity integration | `docs/agent/sanity.md` |
| Deployment + env vars + rebuild model | `docs/agent/deployment.md` |
| Editor-driven vs hardcoded | `docs/agent/editor-vs-hardcoded.md` |
| Change history | `docs/agent/changelog.md` |
| New-project setup runbook + pre-launch checklist (forthcoming) | `docs/bootstrap/NEW-PROJECT.md`, `docs/bootstrap/setup-checklist.md` |
| Per-module enable guides (forthcoming) | `docs/modules/<module-name>.md` |

---

*Structure: this file is the always-loaded constitution. Deep reference lives under `docs/agent/` (see the topic index above). Change history is in `docs/agent/changelog.md`.*

See `OPERATIONS.md` for the tactical playbook (deploy, patch content, run audits, common gotchas).

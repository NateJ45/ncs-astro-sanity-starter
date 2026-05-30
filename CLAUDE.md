# Reid Design LLC — CLAUDE.md

This is the always-loaded reference for the Reid Design code project: the conventions and landmines an agent needs on every task. Deep detail for specific areas (theme, components, SEO, performance, Sanity, deployment) lives under `docs/agent/` and is read on demand. The topic index at the bottom is the map.

Companion tactical runbook: `OPERATIONS.md`. Migration planning docs (strategy, audit, schemas, content extraction) live under `C:\Users\natha\Documents\Claude\Projects\ReidDesignAstro\Astro Sanity Migration\`.

---

## About this project

Reid Design LLC is a Plainfield, Indiana interior design studio run by Staci Perkins (Nathan Nixon's cousin). The studio serves homeowners across Greater Indianapolis with services ranging from a $150 in-home consultation up to full-service room design and styling. This site replaces a live Squarespace 7.1 site at reiddesignllc.com that's structurally fine but bottlenecked by Squarespace's friction around adding case studies and updating content.

The site is a sales tool first, a portfolio second. Every structural decision passes one of two tests: does it help Staci get found locally in Plainfield and the Indianapolis suburbs, or does it make a visitor more likely to book a consultation.

Build for a future Nathan who hasn't touched the code in three months, and for a Staci who edits content weekly without needing to think about the underlying structure.

---

## Stack essentials

Full stack notes and the `astro.config.mjs` landmines are in `docs/agent/stack-and-config.md`. The must-knows:

- **Astro 6.3.x**, TypeScript strict, `output: 'static'`. Node 22.12+.
- **Sanity v5** is the CMS (schemas in `studio/schemaTypes/`). All editable content lives in Sanity. `npm run typegen` regenerates types from the schemas.
- **Tailwind 4 via `@tailwindcss/vite`.** There is no `tailwind.config.mjs`. Brand tokens live in `@theme` blocks in `src/styles/globals.css`.
- **React 19 islands** for interactivity; Astro components for everything static.
- **Cloudflare Workers** for hosting, not Pages (Pages is in maintenance mode). Deploy with `wrangler deploy`.
- **Web3Forms** contact form, **Calendly** discovery call, **Cloudflare Web Analytics** (cookieless, no banner).

### The rules that bite if you forget them

1. **Run `npm run studio:deploy` after ANY schema change.** Skip it and the hosted Studio shows "unknown fields" next to a "Remove field" prompt. **Never click "Remove field":** it deletes that field's data across every document and cannot be undone without a dataset restore. Correct sequence: edit schema, `npm run typegen`, `npm run studio:deploy`, commit.
2. **No em-dashes in public-facing site copy** (the text visitors read: page copy, component text, Sanity content). Use commas, colons, or restructure. Code comments, commit messages, plans, specs, and internal docs are exempt.
3. **Build in both light AND dark mode** on every UI change. Detail in `docs/agent/theme-and-color.md`.
4. **Desktop nav is server-rendered** in `Header.astro`. Do not regress it to a client-only island. Detail in `docs/agent/page-architecture.md`.
5. **The Lenis scroll reset on navigation** (forward goes to top, back/forward restores) lives in the BaseLayout Lenis init. Do not remove it. Detail in `docs/agent/polish-layer.md`.
6. **Content is statically built.** A Sanity edit only goes live after a rebuild (push to `main`, or the publish webhook). Detail in `docs/agent/deployment.md`.

---

## Build pipeline

`npm run build` is a chain:

1. `npm run typegen` runs `sanity typegen generate` against the schemas in `studio/schemaTypes/`. Writes `src/lib/sanity.types.ts` so Astro queries get full type safety on Sanity responses. Runs before `astro build` so the types exist when the prerender worker imports them.
2. `astro build` runs as normal. Pages fetch content from Sanity at build time via the typed client in `src/lib/sanity.ts`.

Standalone scripts:

- `npm run typegen` to regenerate Sanity TypeScript types after editing schemas (run this after any schema change before testing locally).
- `npm run og` to re-run `scripts/generate-og-default.mjs` and regenerate `public/og-default.png` (after changing brand colors, the tagline, or the wordmark in the script's inputs block).
- `npm run studio:dev` to start the Sanity Studio locally for content editing.
- `npm run studio:deploy` to deploy the Sanity Studio (publishes to `studio.reiddesignllc.com` or a Sanity-hosted URL). **Run this after every schema change.** If you skip it, the hosted Studio shows "unknown fields" warnings next to any data in new fields, and Staci will see a prompt to "Remove field." Do NOT click "Remove field" in Studio: it deletes the Sanity document data for every document with that field populated, and it cannot be undone without a dataset restore. The correct sequence is: edit schema, `npm run typegen`, `npm run studio:deploy`, commit.

`public/og-default.png` is committed to the repo because it's a real asset shipped to visitors. `src/lib/sanity.types.ts` is also committed so other contributors (or future Claude sessions) don't need to run typegen to see what the schemas look like in code.

---

## Code conventions

- TypeScript strict mode. No `any`.
- Comment generously, especially in components that future-Nathan might edit by hand.
- At the top of each component file, add a header comment marking it `// Safe to edit by hand` or `// Foundation, edit with care`.
- Astro components for static content. React islands only where interactivity is required (lightbox, mobile nav, form handler, before/after slider, accordions).
- Prefer Astro's built-in `<Image />` and `<Picture />` components over plain `<img>` tags for any locally-bundled assets. For Sanity-hosted images, use the project's `<SanityImage />` wrapper (see image handling section).
- Tailwind utility classes inline. Pull into `@apply` only when a pattern repeats four or more times.
- Use `clsx` or `class-variance-authority` for conditional classes once components get state-dependent styling.

---

## Routes summary

| Path | Source | Notes |
|---|---|---|
| `/` | `src/pages/index.astro` | Home page singleton from Sanity |
| `/about` | `src/pages/about.astro` | About page singleton |
| `/process` | `src/pages/process.astro` | Process page + steps + filtered FAQs |
| `/services` | `src/pages/services.astro` | Services page + service collection |
| `/faq` | `src/pages/faq.astro` | FAQ page + faqItem collection grouped by category |
| `/contact` | `src/pages/contact.astro` | Contact page + Web3Forms form + Calendly embed |
| `/portfolio` | `src/pages/portfolio/index.astro` | Project grid with Room × Style filter chips |
| `/portfolio/[slug]` | `src/pages/portfolio/[slug].astro` | Project detail: hero + meta band + intro story + before/after + gallery + featured-in-journal + sticky chip |
| `/journal` | `src/pages/journal/index.astro` | Post grid with category chips |
| `/journal/[slug]` | `src/pages/journal/[slug].astro` | Post detail: reading progress + header + cover + body (7 custom block types) + related |
| `/portfolio/before-after` | `src/pages/portfolio/before-after.astro` | All projects with before/after pairs, each a `BeforeAfterSlider`. Suppresses to an empty state when no project has pairs |
| `/e-design` | `src/pages/e-design.astro` | E-Design offering: intro + how-it-works + what's-included + pricing tiers + FAQ refs + final CTA. Coming-soon state when `eDesignPage` doc absent. CTAs route to `/contact?type=e-design` |
| `/shop` | `src/pages/shop.astro` | Affiliate "Shop My Favorites" page. Prominent FTC disclosure band above collections; items via `ShopGrid`/`ShopItemCard` with `rel="sponsored nofollow noopener"`. Honors `shopPage.enabled` |
| `/gift-certificates` | `src/pages/gift-certificates.astro` | Gift certificate info (no payment processing): options + how-it-works + fine print. CTAs route to `/contact?type=gift-certificate` |
| `/quiz` | `src/pages/quiz.astro` | Style quiz. Passes the `styleQuiz` config to the `StyleQuiz` island. Coming-soon state when fewer than 2 questions/archetypes |
| `/calculator` | `src/pages/calculator.astro` | Budget calculator. Passes the `budgetCalculator` config to the `BudgetCalculator` island. Coming-soon state when no rooms configured |
| `/resources` | `src/pages/resources.astro` | Resources hub: ordered card grid linking to quiz, calculator, guides, FAQ, journal. Falls back to hardcoded nav-style cards when `resourcesPage.cards` empty |
| `/guides` | `src/pages/guides/index.astro` | Lead-magnet index. Lists published `leadMagnet` docs |
| `/guides/[slug]` | `src/pages/guides/[slug].astro` | Lead-magnet landing + gated download via `LeadMagnetForm`. Generates 0 paths when no magnets published |
| `/press` | `src/pages/press.astro` | Press coverage list (outlet, date, quote, link) + `PressStrip` logo row. Suppresses list to an empty state when no `pressItem` docs |
| `/privacy` | `src/pages/privacy.astro` | Privacy policy from `privacyPage` singleton, with a plain-voice static fallback when the doc is absent |
| `/sitemap-index.xml` | `@astrojs/sitemap` (auto) | Production sitemap |
| `/404` | `src/pages/404.astro` | Custom 404 (two-column with photograph) |

---

## Safe to edit by hand

- Text content inside `src/pages/*.astro` (everything outside the frontmatter and Sanity-fetched content)
- The Project Type dropdown values in `src/components/ContactForm.tsx` (when Staci adds a service in Sanity)
- Images in `src/assets/` (logo variants, OG image)
- `src/data/site.ts` (static identity constants)
- Copy strings and `href` values in static page components
- Tailwind utility classes on existing components when content needs different visual weight
- Brand colors, tagline, and wordmark inputs in `scripts/generate-og-default.mjs` (re-run `npm run og` after editing)

## Foundation, edit with care (route through a planned Claude session)

- `src/styles/globals.css` (Tailwind 4 `@theme` block, shadcn `:root` / `.dark` overrides, **polish-layer utilities** — `.card-lift`, `.press-tactile`, `.nav-underline`, `.site-header`, `.reading-progress`, `.surface-warm`, `[data-reveal]` — base resets, paper-grain `body::before`, print stylesheet)
- `studio/schemaTypes/*.ts` (Sanity schemas — changing fields can break existing content)
- `src/lib/sanity.ts`, `src/lib/queries.ts`, `src/lib/sanity.types.ts` (Sanity client, GROQ queries, generated types)
- `src/lib/scriptAccent.ts` — shared helper `splitScriptAccent(headline, accent)` used by `Hero.astro`, `SectionHeading.astro`, and `FinalCta.astro` to split a headline around the accent word for Pinyon Script wrapping
- `src/lib/sectionVisibility.ts` — `getSectionVisibility(raw)` converts the raw `siteSettings.sectionVisibility` Sanity object into a flat boolean map. Rule: `value !== false` (unset/null/true = visible; only explicit false = hidden). Every toggleable page imports this and redirects home when its flag is false. See [Section visibility](docs/agent/page-architecture.md#section-visibility) in the Page architecture section.
- `src/layouts/BaseLayout.astro` (anti-FOUC theme bootstrap, skip link, header/main/footer wiring, View Transitions ClientRouter, Lenis init, **scroll-reveal observer**, **sticky-header scroll listener**, Cloudflare Analytics, OG meta, JSON-LD, title-suffix-doubling guard)
- `src/components/ui/` shadcn primitives — **note: `accordion.tsx` is customized** (removed `h-(--radix-accordion-content-height)` lock + dropped `text-sm font-medium` from trigger). If you reinstall via `npx shadcn add` it will revert; reapply the changes.
- React islands: `MobileNav.tsx`, `ThemeToggle.tsx`, `BackToTop.tsx`, `ContactForm.tsx`, `BeforeAfterSlider.tsx`, `ProjectGallery.tsx`, `FaqAccordion.tsx`, `CalendlyInline.tsx`, `CaseStudyTOC.tsx`, `StickyCTAChip.tsx`, `PortfolioCursor.tsx`, `PortfolioFilterChips.tsx`, `CopyEmailButton.tsx`, `PortableText.tsx`, `JournalPortableText.tsx`, `StatsCounter.tsx` (client:visible count-up on `/about`)
- Astro wrappers: `SanityImage.astro`, `StructuredData.astro`, `SectionHeading.astro` (accepts optional `scriptAccent?: string`), `SectionDivider.astro`, `ServiceAreaCue.astro`, `ReadingProgress.astro`, `ProjectMetaBand.astro`, `ProcessStepIllustration.astro`, `Hero.astro` (refactored to use `splitScriptAccent`, behavior unchanged), `HeroBackground.astro` (hero background layer — single image or cross-fading Ken Burns slideshow; used only by `Hero.astro`), `FinalCta.astro` (accepts optional `scriptAccent?: string`), `CtaLink.astro`, `StatsRow.astro` (server shell for the About stat-counter row; self-hides when `stats` is empty)
- `scripts/generate-og-default.mjs`, `scripts/strip-editor-annotations.mjs`, `scripts/sweep-eyebrow-contrast.mjs` (reusable for future drift detection)
- `scripts/seed-conversion-content.mjs` + `scripts/seed-script-accents.mjs` — idempotent seeders for the conversion-build document types (styleQuiz, budgetCalculator, leadMagnet, shop, eDesign, gift, press, resources, post-inquiry roadmap) and section/finalCta scriptAccent fields. Seeded content is placeholder; see OPERATIONS.md for what must be replaced before DNS cutover.
- `scripts/seed-about-personal.mjs` — idempotent seeder for the About personal section. Seeds placeholder text into `aboutPage.personal*` fields only when `personalHeadline` has not been customized. Safe to re-run.
- `scripts/seed-studio-guide.mjs` — idempotent seeder (`createOrReplace`) for the `studioGuide` and `studioNotes` singletons. Seeds both from the previously hardcoded content in the Studio components. Run once on a fresh dataset, or after adding a new how-to/tip to the seed file.
- `scripts/seed-studio-playbook.mjs` — idempotent seeder (`createOrReplace`) for the `studioPlaybook` singleton (the "Grow your studio" panel: five professional-development guides — photography, portfolio and journal writing, software toolkit, e-design, trade sourcing). Re-run after editing the guide content in the seed file.
- `astro.config.mjs`, `wrangler.jsonc`, `package.json`, `tsconfig.json`, `components.json`
- `public/_headers` (security response headers shipped with the deploy)
- `public/og-default.png` (regenerate via `npm run og`)
- `public/favicon.svg` (RD monogram on Warm Bronze disc, `prefers-color-scheme`-aware)
- `public/robots.txt` (allow-all + sitemap reference)
- `public/llms.txt` (AI/LLM crawler index — update if major pages change)

If a change requires editing the foundation set, do it in a Claude session, write the change deliberately, and update this doc when the architecture shifts.

---

## Audience

The Reid Design site speaks to homeowners in Plainfield, Indianapolis, and the northern suburbs (Carmel, Fishers, Westfield, Zionsville, Noblesville) whose home feels off and who don't know where to start. They have budget for design help but aren't shopping at the white-glove tier. They find Staci through Instagram, Facebook, or a referral. They want someone who feels like a smart friend who happens to be a designer, not a salesperson in a showroom.

Most visitors arrive on mobile. The site needs to be readable, scannable, and bookable on a phone first; desktop is a refinement, not the primary target.

The copy hits this tone: warm, plain-spoken, slightly informal, quietly confident about money. Plain English over designer-speak. Not "transformative experiences," just "a room that feels right." See the voice manifesto in `01-strategy-and-audit.md` for the full do/don't pairs.

---

## Visual verification workflow

Every UI change is verified visually before being reported done. The build that ships first-time-right is the one where the person who wrote the code saw it rendering correctly in every state that matters. This is a rule, not a habit.

### What to verify

For any change touching components, layouts, styles, or copy that affects layout:

1. **Both themes.** Light AND dark. Toggle in the running site via the header `ThemeToggle`, or use Chrome DevTools' "Emulate CSS prefers-color-scheme" while testing system mode. Light is primary, but dark must read as the brand, not as broken.
2. **Both viewports.** Mobile (~375px wide) and desktop (~1280px wide). Reid Design's audience arrives on mobile first. Never ship desktop-only.
3. **Interactive states.** Hover, focus (keyboard Tab), active. Test with mouse AND keyboard.
4. **Adjacent regressions.** Look at the sections immediately before and after the change. Cascading styles wreck neighbors more often than people expect.

### How to verify

Use the Playwright MCP for screenshot-and-compare loops:

1. `npm run dev` (or hit the deployed URL for deployed changes)
2. Open the page via Playwright MCP at both viewports
3. Take screenshots, light and dark
4. Compare against the intent (spec, mockup, or prior screenshot)
5. If something's off, fix and re-screenshot. Don't ship a change you haven't seen rendered.

For accessibility-affecting changes, run Lighthouse on the changed page before opening a PR. Targets: 100/100/100/100 desktop. Defend them — when a score drops, find out why before merging.

For Sanity Studio testing (schema or structure changes), run `npm run studio:dev` and check the editor experience as Staci would see it. The Studio is the editor's UI; broken Studio = broken editor workflow.

### When NOT to skip this

Even "tiny" changes — a color tweak, a spacing nudge, a copy edit — go through the same loop. The smallest changes are where regressions hide because no one looks at them.

---

## Working with Claude

- Use Claude Code from the desktop app, not the terminal. Show diffs clearly so they read well in that UI.
- Prefer Plan Mode for any multi-file change, especially when touching Sanity schemas (schema changes propagate to live content).
- Pause for confirmation before installing new dependencies.
- When proposing design changes, describe the visual outcome in plain language, not just the code.
- For browser-based verification, prefer the Playwright MCP. See the [Visual verification workflow](#visual-verification-workflow) section above for what to verify and when.
- For Sanity Studio testing, run `npm run studio:dev` and check the editor experience as Staci would see it.
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
- Comment code generously so future-Nathan can follow without reverse-engineering.

### Reid Design site voice (for copy that appears on the site itself)

Five do-this-not-that pairs. Full version with examples in `01-strategy-and-audit.md`.

1. **Say it plainly. Especially about money.** Don't apologize, don't pad, don't soften prices with hedging language.
2. **Sound like a smart friend, not a brochure.** No "transformative experiences" or "elevated living."
3. **Show the thinking, not the credentials.** Specific design reasoning beats generic claims of expertise.
4. **Stop talking when you're done.** End the paragraph. Don't tack on a closing line that restates the point.
5. **Be specific.** "A 1970s ranch in Fishers" beats "modern Indianapolis home."

Banned vocabulary on the site: "transformative," "curated experience," "investment in your space," "elevated living," "tailored solutions."

---

## Topic index

Read these on demand. They are NOT auto-loaded, and they are referenced as plain paths so they stay lazy. Open with the Read tool when a task touches the area.

| Area | Doc |
|---|---|
| Stack detail + astro.config landmines | `docs/agent/stack-and-config.md` |
| Page + section architecture, nav, visibility toggles | `docs/agent/page-architecture.md` |
| Brand colors + theme system (light/dark discipline) | `docs/agent/theme-and-color.md` |
| Polish layer (brand stripe, card-lift, scroll, Lenis, script accents) | `docs/agent/polish-layer.md` |
| Typography + spacing tokens | `docs/agent/design-tokens.md` |
| Component catalog + long-read layout | `docs/agent/components.md` |
| Error + empty states | `docs/agent/error-states.md` |
| Image handling | `docs/agent/images.md` |
| Accessibility | `docs/agent/accessibility.md` |
| SEO + JSON-LD | `docs/agent/seo.md` |
| Performance budgets + Lighthouse | `docs/agent/performance.md` |
| Content data + Sanity integration | `docs/agent/sanity.md` |
| Deployment + env vars + rebuild model | `docs/agent/deployment.md` |
| Pre-launch setup checklist | `docs/agent/setup-checklist.md` |
| Editor-driven vs hardcoded | `docs/agent/editor-vs-hardcoded.md` |
| Change history | `docs/agent/changelog.md` |

---

*Structure: this file is the always-loaded constitution. Deep reference lives under `docs/agent/` (see the topic index above). Change history is in `docs/agent/changelog.md`.*

See `OPERATIONS.md` for the tactical playbook (deploy, patch content, run audits, common gotchas).

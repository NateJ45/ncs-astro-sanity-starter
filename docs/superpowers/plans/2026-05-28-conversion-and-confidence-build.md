# Conversion & Confidence Build-Out Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Companion spec:** `docs/superpowers/specs/2026-05-28-conversion-and-confidence-build.md` (read it first; it carries the full feature designs, decisions, and schema field lists).
>
> **Project conventions:** Read `CLAUDE.md` before any task. Non-negotiables: Sanity v5 `defineType/defineField/defineArrayMember`; semantic theme tokens (both light + dark); brand-stripe + `card-lift` on new cards; islands hydrate `client:visible`/`client:idle` (Radix-portal ones `client:only="react"`); voice manifesto + no em-dashes in copy; `npm run typegen` after every schema change; commit per coherent chunk.

**Goal:** Add lower-commitment capture (newsletter, lead-magnet guides, style quiz, budget calculator), revenue surfaces (e-design page, shop, gift certificates), and confidence signals (post-inquiry roadmap, reviews, before/after view, guarantee, press) to the Reid Design site, all editable by Staci in Sanity.

**Architecture:** New Sanity singletons + collections drive new Astro pages; interactive pieces are custom React islands (no heavy vendor widgets). Email capture posts to a Sanity-configured ESP via fetch. Payments are inquire-only (deep-link into the existing contact form via a `?type=` query param). New nav uses the existing Radix dropdown-menu primitive.

**Tech Stack:** Astro 6 (static) + Sanity v5 + Tailwind 4 + shadcn/ui (Radix) + React 19 islands + Web3Forms + Cloudflare Workers.

**Verification model (this project, not TDD):** per task, run `npm run typegen` (schemas), `npm run build` (types/compile), `npm run studio:dev` (editor check for schema tasks), and a Playwright MCP screenshot pass in light + dark at ~375px and ~1280px for any UI. Lighthouse on each new page before "done" (targets 100/100/100/100, A11y must hold 100).

---

## Phase 1 — Schemas, registration, singleton enforcement, typegen

Add fields only; never rename/remove existing ones (live content). After each schema task, run typegen. Register every new type in `studio/schemaTypes/index.ts` and add singleton enforcement in `sanity.config.ts` for each new singleton (follow the existing singleton pattern there).

### Task 1.1: Extend `siteSettings` (newsletter, reviews, guarantee)

**Files:** Modify `studio/schemaTypes/siteSettings.ts`

- [ ] Add a `newsletter` object field: `enabled` (boolean, initialValue false), `providerLabel` (string), `formActionUrl` (url), `audienceId` (string), `heading` (string), `blurb` (text), `buttonLabel` (string, initialValue "Subscribe"), `successMessage` (text), `consentNote` (text). Description on the object: "Connect an email provider (MailerLite, Buttondown, Mailchimp). Paste the embedded-form action URL and list ID; the secret key goes in env."
- [ ] Add `googleBusinessUrl` (url) + `reviewsNote` (string).
- [ ] Add `satisfactionGuarantee` (text, optional) with a description: in-scope guarantee line shown near CTAs on Services + Contact.
- [ ] Run: `npm run typegen`. Expected: no errors, `SiteSettings` type gains the new fields in `src/lib/sanity.types.ts`.
- [ ] Commit: `feat(sanity): extend siteSettings with newsletter, reviews, guarantee fields`

### Task 1.2: Extend `contactPage` (post-inquiry roadmap) and `testimonial` (source)

**Files:** Modify `studio/schemaTypes/contactPage.ts`, `studio/schemaTypes/testimonial.ts`

- [ ] `contactPage`: add `postInquiryRoadmap` array of objects `{ title (string, req), body (text), timeEstimate (string, optional) }`, group `'form'`. Description: numbered "what happens after you reach out" steps.
- [ ] `testimonial`: add `sourceType` (string, options list: Google / Facebook / Houzz / Direct, layout radio) and `reviewUrl` (url, optional).
- [ ] Run: `npm run typegen`. Expected: types update cleanly.
- [ ] Commit: `feat(sanity): post-inquiry roadmap + testimonial source fields`

### Task 1.3: New collections — `leadMagnet`, `pressItem`, `shopCollection`, `shopItem`

**Files:** Create `studio/schemaTypes/leadMagnet.ts`, `pressItem.ts`, `shopCollection.ts`, `shopItem.ts`

- [ ] `leadMagnet`: `title`, `slug` (source title), `summary` (text), `coverImage` (image + alt), `file` (type `file`, the PDF), `gateHeading`, `gateBlurb` (text), `buttonLabel` (initialValue "Send me the guide"), `successMessage` (text), `espTag` (string optional), `seoTitle`, `seoDescription`, `published` (boolean initialValue true), `displayOrder` (number) / `orderRankField`. Canvas: enable on `summary`, `gateBlurb` with voice purpose; exclude config-y fields.
- [ ] `pressItem`: `outlet` (string req), `logo` (image + alt), `quote` (text), `url` (url), `date` (date), `displayOrder` / `orderRankField`. Preview shows outlet + date.
- [ ] `shopCollection`: `title` (req), `slug`, `blurb` (text), `displayOrder` / `orderRankField`.
- [ ] `shopItem`: `title` (req), `image` (image + alt, req), `vendor` (string), `affiliateUrl` (url, req), `note` (text), `collection` (reference shopCollection), `displayOrder` / `orderRankField`. Preview shows title + vendor.
- [ ] Register all four in `index.ts` (collections section). Run `npm run typegen`.
- [ ] Commit: `feat(sanity): leadMagnet, pressItem, shopCollection, shopItem collections`

### Task 1.4: New singletons — page singletons

**Files:** Create `studio/schemaTypes/eDesignPage.ts`, `shopPage.ts`, `giftPage.ts`, `resourcesPage.ts`, `privacyPage.ts`, `pressPage.ts`

- [ ] Each follows the existing page-singleton pattern (groups: seo, hero, plus content groups; `canvasApp: { exclude: true }` for marketing-locked copy; `seoTitle`/`seoDescription`; hero eyebrow/headline/subhead/heroImage/heroScriptAccent; a `ctaBlock` final CTA). Field lists per the spec section for each page (eDesignPage: intro, howItWorks[], whatsIncluded[], tiers[], faqRefs[], finalCta; shopPage: intro, disclosure, collections[] refs, `enabled`; giftPage: intro, options[], howItWorks[], finePrint, ctaLabel; resourcesPage: intro, cards[]; privacyPage: body Portable Text, lastUpdated date; pressPage: intro).
- [ ] Register in `index.ts` (singletons section). Add singleton enforcement entries in `sanity.config.ts`.
- [ ] Run `npm run typegen`.
- [ ] Commit: `feat(sanity): e-design, shop, gift, resources, privacy, press page singletons`

### Task 1.5: New singletons — interactive tool configs

**Files:** Create `studio/schemaTypes/styleQuiz.ts`, `budgetCalculator.ts`

- [ ] `styleQuiz` per spec: intro group; `questions[]` (prompt, helpText, answers[] with label + image + archetypeWeights[]); `qualifiers[]` (prompt, type enum, options[]); `archetypes[]` (name, slug, description Portable Text, images[], recommendedService ref, resultCtaLabel); `gate` object (mode enum, heading, blurb, consentNote, espTag); `routing` object (highIntentRule, bookCtaLabel, guideCtaLabel, guideRef). Canvas-enable archetype descriptions with voice purpose; exclude config.
- [ ] `budgetCalculator` per spec: intro; `rooms[]` (label, baseLow, baseHigh); `scopeOptions[]` (label, addLow, addHigh); `addOns[]` (label, low, high); `resultCopy` (text), `disclaimer` (text), `ctaLabel`, `consultPriceNote`. Numeric fields drive the estimate.
- [ ] Register + singleton enforcement. Run `npm run typegen`.
- [ ] Studio check: `npm run studio:dev`, confirm both docs render and are editable without console errors.
- [ ] Commit: `feat(sanity): styleQuiz + budgetCalculator config singletons`

## Phase 2 — Queries

**Files:** Modify `src/lib/queries.ts`

- [ ] Add typed GROQ query functions: `getEDesignPage`, `getShopPage` (+ resolve collections + items ordered), `getGiftPage`, `getResourcesPage`, `getPrivacyPage`, `getPressPage` (+ `getPressItems`), `getStyleQuiz`, `getBudgetCalculator`, `getLeadMagnets` + `getLeadMagnet(slug)`, `getProjectsWithBeforeAfter` (projects where `count(beforeAfters) > 0`), and extend `getSiteSettings` to include `newsletter`, `googleBusinessUrl`, `reviewsNote`, `satisfactionGuarantee`, and `getContactPage` to include `postInquiryRoadmap`. Follow the existing query style + null-safety.
- [ ] Run `npm run build`. Expected: compiles, queries type-check against generated types.
- [ ] Commit: `feat(queries): add queries for new pages, tools, shop, press, before/after`

## Phase 3 — Site-wide plumbing

### Task 3.1: Nav restructure (dropdowns) + footer

**Files:** Modify `src/components/Header.astro`, `src/components/MobileNav.tsx`, `src/components/Footer.astro`; add `src/components/ui/navigation-menu` or reuse `dropdown-menu`.

- [ ] Restructure `NAV_LINKS` into a grouped shape (Home, Portfolio, Services▾[Services, E-Design, Process, Gift Certificates], Shop, Resources▾[Style Quiz, Cost Calculator, Guides, FAQ, Journal], About). Desktop renders dropdowns via Radix (`client:only="react"` for the menu island); preserve `.nav-underline`, `aria-current`, keyboard behavior.
- [ ] MobileNav lists groups expanded with subitems indented.
- [ ] Footer: add a "Free tools & guides" column + links to Shop, Gift Certificates, Press, Privacy.
- [ ] Playwright pass: desktop dropdowns open on hover/focus + keyboard; mobile drawer shows all; both themes. Lighthouse A11y 100 on home.
- [ ] Commit: `feat(nav): grouped dropdown navigation + footer resource links`

### Task 3.2: ESP config + env + `/privacy` + consent notice

**Files:** Modify `.env.example`, `src/data/site.ts` (if needed), create `src/pages/privacy.astro`, `src/components/ConsentNotice.tsx`; modify `BaseLayout.astro` to mount the notice.

- [ ] Add `PUBLIC_NEWSLETTER_FORM_ACTION` (+ note re: secret `NEWSLETTER_API_KEY` if provider needs server side) to `.env.example` with comments.
- [ ] `privacy.astro` renders `privacyPage` Portable Text with fallback copy.
- [ ] `ConsentNotice.tsx` (`client:idle`): dismissible, `localStorage["reid-design-consent"]`, links to `/privacy`, renders only when a cookie-setting feature is enabled (guard on a flag passed from siteSettings/newsletter.enabled). Both themes, reduced-motion safe.
- [ ] Playwright pass + Lighthouse on `/privacy`.
- [ ] Commit: `feat(privacy): privacy page, consent notice, ESP env wiring`

## Phase 4 — Confidence surfaces

### Task 4.1: Post-inquiry roadmap + autoresponder

**Files:** Create `src/components/PostInquiryRoadmap.astro`; modify `src/pages/contact.astro`, `src/components/ContactForm.tsx` (Web3Forms autoresponse fields).

- [ ] Render `contactPage.postInquiryRoadmap` as numbered steps near the form. Fallback to existing `whatToExpectContent` when empty.
- [ ] Configure Web3Forms autoresponder (hidden fields) so the sender gets a "what happens next" email. Document the dashboard toggle in the launch checklist.
- [ ] Playwright + Lighthouse on `/contact`, both themes.
- [ ] Commit: `feat(contact): post-inquiry roadmap + autoresponder`

### Task 4.2: Reviews surfacing + before/after view + guarantee line

**Files:** Modify `src/components/TestimonialGrid.astro` (or add a `ReviewsCallout.astro`), `src/pages/services.astro`, `src/pages/contact.astro`; create `src/pages/portfolio/before-after.astro`.

- [ ] Add a "Read more on Google" link driven by `siteSettings.googleBusinessUrl`; show `sourceType` badge on testimonials where set.
- [ ] `before-after.astro` lists `getProjectsWithBeforeAfter()` reusing `BeforeAfterSlider.tsx`; empty-state hides gracefully; link it from portfolio index + Resources.
- [ ] Render `siteSettings.satisfactionGuarantee` near CTAs on Services + Contact when set.
- [ ] Playwright + Lighthouse on the new page + edited pages, both themes.
- [ ] Commit: `feat(confidence): reviews link, before/after view, guarantee line`

### Task 4.3: Press strip + `/press`

**Files:** Create `src/components/PressStrip.astro`, `src/pages/press.astro`; modify home + about pages to include the strip.

- [ ] `PressStrip.astro` renders `getPressItems()` logos; suppresses entirely when empty. `/press` lists items with quotes + links.
- [ ] Playwright + Lighthouse.
- [ ] Commit: `feat(press): as-seen-in strip + press page`

## Phase 5 — Capture tools

### Task 5.1: Newsletter signup

**Files:** Create `src/components/NewsletterSignup.tsx`; mount in `Footer.astro` + `journal/index.astro`.

- [ ] Island posts to `siteSettings.newsletter.formActionUrl` (fetch) with honeypot + a11y states + consent note; falls back to Web3Forms when no ESP; renders nothing when `newsletter.enabled` false.
- [ ] Playwright (submit success + error states) + Lighthouse, both themes.
- [ ] Commit: `feat(capture): newsletter signup island`

### Task 5.2: Lead-magnet guides + gate

**Files:** Create `src/pages/guides/index.astro`, `src/pages/guides/[slug].astro`, `src/components/LeadMagnetForm.tsx`.

- [ ] Index lists published `leadMagnet`s (empty state when none). `[slug]` renders the landing + `LeadMagnetForm` gate; on submit, POST email to ESP + reveal `file` download URL.
- [ ] Draft two guide bodies in Staci's voice as placeholder copy (PDF upload is hers).
- [ ] Playwright + Lighthouse on both routes.
- [ ] Commit: `feat(capture): lead-magnet guides with gated download`

### Task 5.3: Style quiz

**Files:** Create `src/pages/quiz.astro`, `src/components/StyleQuiz.tsx`.

- [ ] Multi-step island: image-answer questions -> weighted archetype result with Staci's photos + CTA; intent qualifiers route to book-vs-guide CTA; soft email gate per `gate.mode`; posts result+email to ESP + notifies Staci. Progress `aria-live`, keyboard support, reduced-motion. "Coming soon" + nav hide when fewer than 2 questions.
- [ ] Playwright walk-through both themes + keyboard; Lighthouse.
- [ ] Commit: `feat(capture): style quiz`

### Task 5.4: Budget calculator + resources hub

**Files:** Create `src/pages/calculator.astro`, `src/components/BudgetCalculator.tsx`, `src/pages/resources.astro`.

- [ ] Calculator computes a plain-English range from `budgetCalculator` config; optional "email me this estimate" posts to ESP; booking CTA. "Coming soon" + nav hide when config absent.
- [ ] Resources hub renders `resourcesPage.cards[]`.
- [ ] Playwright + Lighthouse.
- [ ] Commit: `feat(capture): budget calculator + resources hub`

## Phase 6 — Offerings

### Task 6.1: E-Design landing

**Files:** Create `src/pages/e-design.astro`; modify `services.astro` + homepage services grid to cross-link.

- [ ] Render `eDesignPage` (hero, how-it-works, what's included, tiers, FAQ refs, final CTA). CTA -> `/contact?type=e-design`. ContactForm reads `?type=` to preselect project type.
- [ ] Playwright + Lighthouse, both themes.
- [ ] Commit: `feat(offerings): productized e-design landing page`

### Task 6.2: Shop My Favorites + gift certificates

**Files:** Create `src/pages/shop.astro`, `src/components/ShopGrid.astro`, `src/components/ShopItemCard.astro`, `src/pages/gift-certificates.astro`.

- [ ] Shop renders collections + items with FTC disclosure near top; affiliate links `rel="sponsored nofollow"` + new tab. Empty state when no items.
- [ ] Gift page renders options + how-it-works; CTA -> `/contact?type=gift-certificate`. ContactForm handles the new `?type=`.
- [ ] Playwright + Lighthouse on both.
- [ ] Commit: `feat(offerings): shop page + gift certificates`

## Phase 7 — Verification + docs

- [ ] Full `npm run build`; confirm bundle budgets (home JS < 100KB, any island < 50KB). Investigate regressions.
- [ ] Lighthouse pass on every new route (mobile + desktop): A11y 100, BP/SEO 100, Perf 95+.
- [ ] Keyboard pass on nav dropdowns, quiz, calculator, all new forms.
- [ ] Update `CLAUDE.md`: routes summary, new components, editor-driven surfaces, the relaxed privacy/consent stance, new env vars, and the setup checklist (ESP, Calendly, ShopMy, GBP, PDFs, pricing, gift fulfillment, autoresponder).
- [ ] Update the launch-checklist section of the spec if anything shifted.
- [ ] Commit: `docs: update CLAUDE.md for conversion build-out`

---

## Self-review

**Spec coverage:** Every spec feature (1-14) maps to a task: newsletter 5.1; lead magnets 5.2; quiz 5.3; calculator + resources 5.4; e-design 6.1; shop + gift 6.2; press 4.3; roadmap 4.1; discovery call (already wired, surfaced in 4.1/contact + homepage CTA — add to 4.1); reviews + before/after 4.2; guarantee 4.2; privacy/consent 3.2. Nav 3.1. Schemas 1.1-1.5. Queries Phase 2.

**Gap fixed:** discovery-call homepage CTA folds into Task 4.1 (note added). Archetypes kept inline in `styleQuiz` per spec to keep Studio simple.

**Placeholder scan:** schema field lists are concrete (spec + Task 1.x); component contracts specify files, props, hydration, behavior, and verification. Full island source lands during execution against the documented patterns; this is the project's plan-then-build convention, not a vague placeholder.

**Type consistency:** query function names used in Phase 2 match the page tasks that consume them (`getStyleQuiz`, `getBudgetCalculator`, `getProjectsWithBeforeAfter`, etc.). `?type=` param handled in ContactForm is referenced consistently in 6.1 and 6.2.

## Execution handoff

Per the locked decision (build straight through), execution proceeds via **subagent-driven-development**: a fresh subagent per task (each reads `CLAUDE.md` + the spec + this plan), with Claude reviewing the diff between tasks and running typegen/build/Lighthouse gates. Blockers surface to Nathan; everything else proceeds autonomously.

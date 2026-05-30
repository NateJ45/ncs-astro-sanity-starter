# Reid Design — Conversion & Confidence Build-Out

**Date:** 2026-05-28
**Author:** Nathan Nixon (with Claude)
**Status:** Approved design, ready for implementation plan
**Source:** Competitive research across 15+ US residential designers (style-quiz teardown, 6 boutique-site teardowns, 6 business-practice profiles). Findings summarized in the session that produced this spec.

---

## Context

The Reid Design site already converts high-intent visitors well: open pricing, a real process, case studies, and a nine-field contact form that triages straight to Staci's inbox. The gap is everyone who is not yet ready to fill out that form. The only door today is the high-commitment contact form. This build adds lower-commitment doors (capture and nurture), expands revenue surfaces (e-design, shop, gift certificates), and strengthens confidence signals (post-inquiry roadmap, reviews, before/after, guarantee, press).

Everything is editable by Staci in Sanity. Copy ships in her voice with placeholders and graceful empty states so nothing looks broken before she fills it in.

This site is a sales tool first. Every feature passes one of two tests: it helps Staci get found locally, or it makes a visitor more likely to book.

## Locked decisions (this session)

1. **Delivery:** one approval, build straight through (no per-wave gate).
2. **Email capture:** real ESP, Sanity-configurable. Provider choice + form-action/audience live in Sanity; secret key in env. Custom-styled form posts to the ESP so no heavy vendor script ships.
3. **Payments:** inquire / manual invoicing. Gift certificates and e-design route to the contact form or email. No payment integration.
4. **Style quiz:** build it, alongside the budget calculator and the prep guide.
5. **Privacy:** the prior zero-cookie / no-banner stance may be broken for these features. We add a `/privacy` page and a lightweight consent notice.

## Goals

- Add lower-commitment capture: newsletter, gated lead-magnet guides, style quiz, budget calculator.
- Productize E-Design as a real, priced, inquire-to-buy offering with its own landing page.
- Add a Shop My Favorites page (credibility-first affiliate links).
- Add gift certificates (inquire) and a press / "as seen in" surface.
- Strengthen confidence: post-inquiry roadmap, surfaced reviews, a dedicated before/after view, an in-scope satisfaction line.
- Keep Lighthouse at 100s, WCAG 2.1 AA in both themes, and the brand voice.

## Non-goals

- No on-site payment processing (Stripe checkout). Inquire/manual only.
- No mini e-courses or large digital-product catalog.
- No financing / payment plans.
- No heavy third-party widget embeds where a custom-styled form or static surface will do (protects the JS budget).

---

## Information architecture / navigation

Current nav (`NAV_LINKS` in `Header.astro`, shared with `MobileNav.tsx`): Home / Process / Services / Portfolio / Journal / FAQ / About + "Book a consultation" pill. Breakpoint is `lg:`.

**New nav (grouped with two dropdowns using the existing `dropdown-menu` primitive):**

- **Home**
- **Portfolio** (flat; dropdown optional later for the Before/After view)
- **Services ▾** -> Services overview, E-Design, Process, Gift Certificates
- **Shop** (flat)
- **Resources ▾** -> Style Quiz, Cost Calculator, Guides, FAQ, Journal
- **About**
- **Book a consultation** pill (unchanged)

Six visible slots, the rest grouped. Mobile drawer lists the groups expanded. Dropdown menus must hydrate `client:only="react"` (Radix portal can't SSR). Keep keyboard + focus behavior from Radix; do not roll a custom menu.

Footer gains a "Free tools & guides" column and links to Shop, Gift Certificates, Press, and Privacy.

---

## Feature designs

For each: route, schema, component(s), editor surface, external dependency, empty-state behavior.

### 1. Newsletter signup (global)

- **Route:** none (global). Footer block + reusable `<NewsletterSignup />` section usable on Journal index, Resources, and post-download.
- **Component:** `NewsletterSignup.tsx` (React island, `client:visible`). Custom-styled form. Posts to the ESP form-action URL (MailerLite/Buttondown/Mailchimp embedded-form endpoint) via `fetch`, or to Web3Forms as a fallback when no ESP is configured. Honeypot field. Success/error states with `role="alert"`. Consent microcopy + link to `/privacy`.
- **Editor surface:** `siteSettings.newsletter` object: `enabled` (bool), `providerLabel`, `formActionUrl`, `audienceId`/`listId`, `heading`, `blurb`, `buttonLabel`, `successMessage`, `consentNote`.
- **External dep:** ESP account + form-action URL. Secret API key (if needed) in env as `NEWSLETTER_API_KEY` / `PUBLIC_NEWSLETTER_FORM_ACTION`.
- **Empty state:** when `newsletter.enabled` is false or no form-action set, the block does not render.

### 2. Lead-magnet guides + gated delivery

- **Route:** `/guides` index (lists available guides) + `/guides/[slug]` per guide landing with the gate. Delivery: on submit, reveal the download link (PDF in Sanity) and fire the email to the ESP + notify Staci.
- **Schema:** `leadMagnet` collection: `title`, `slug`, `summary`, `coverImage` (alt), `file` (Sanity file asset, the PDF), `gateHeading`, `gateBlurb`, `buttonLabel`, `successMessage`, `espTag` (optional), `seoTitle`, `seoDescription`, `displayOrder`, `published` bool. Canvas-enabled prose fields with voice purpose.
- **Component:** `LeadMagnetForm.tsx` (island). Email capture -> POST to ESP -> reveal `file` download. Honeypot, a11y states.
- **External dep:** the PDF content. Claude drafts two in Staci's voice ("How to get the most from a $150 consultation", "Picking paint colors that actually work"); Staci approves and uploads final PDFs.
- **Empty state:** `/guides` renders an empty state when no published guides; individual guide pages only generate for published docs.

### 3. Style quiz

- **Route:** `/quiz`.
- **Schema:** `styleQuiz` singleton:
  - `intro` (eyebrow, headline, subhead, heroImage)
  - `questions[]` (object): `prompt`, `helpText`, `answers[]` (object: `label`, `image` with alt, `archetypeWeights[]` -> reference archetype + weight number)
  - `qualifiers[]` (object): `prompt`, `type` enum (budget / timeline / room), `options[]` (label + value)
  - `archetypes[]` (object or referenced collection): `name`, `slug`, `description` (Portable Text, voice), `images[]` (Staci's own project photos, alt), `recommendedServiceRef`, `resultCtaLabel`
  - `gate` (object): `mode` enum (optional / required-for-bonus / required), `heading`, `blurb`, `consentNote`, `espTag`
  - `routing` (object): high-intent rule (which qualifier answers route to "book a consult" vs "get the guide"), plus the two result CTAs
- **Component:** `StyleQuiz.tsx` (island, `client:visible`). Multi-step, image answers, computes archetype from weights, shows result with her photos + CTA. Soft email gate per `gate.mode`. Posts result + email to ESP and notifies Staci. Keyboard accessible, `prefers-reduced-motion` respected, progress indicator with `aria` live region.
- **External dep:** Staci's project photos per archetype; ESP.
- **Empty state:** if `styleQuiz` doc absent or fewer than 2 questions, `/quiz` shows a friendly "coming soon" state and the nav link hides.

### 4. Budget calculator

- **Route:** `/calculator`.
- **Schema:** `budgetCalculator` singleton: `intro`, `rooms[]` (label, baseLow, baseHigh), `scopeOptions[]` (label, multiplier or add-low/add-high), `addOns[]` (label, low, high), `resultCopy` (Portable Text templated), `disclaimer`, `ctaLabel`, `consultPriceNote`. All numbers editable.
- **Component:** `BudgetCalculator.tsx` (island). Inputs (room, scope, add-ons) -> plain-English range -> booking CTA. No email required (intent tool, not a gate), with an optional "email me this estimate" that posts to the ESP. Pure client compute, no third-party.
- **Empty state:** if doc absent, `/calculator` shows "coming soon" and the nav link hides.

### 5. Resources hub

- **Route:** `/resources`.
- **Schema:** `resourcesPage` singleton: hero, intro, and an ordered list of `cards[]` (title, blurb, icon/image, link) so Staci controls which tools surface and in what order. Defaults link Quiz, Calculator, Guides, FAQ, Journal.
- **Component:** Astro page composing existing card patterns.

### 6. Productized E-Design page

- **Route:** `/e-design`.
- **Schema:** `eDesignPage` singleton: hero, `intro`, `howItWorks[]` (step number, title, body), `whatsIncluded[]`, `tiers[]` (name, price, priceNumeric, features[], bestFor, ctaLabel), `faqRefs[]` (reference `faqItem`), `finalCta`. Pulls the existing E-Design `service` doc for cross-link consistency.
- **Component:** Astro page reusing `ServiceCard`/pricing patterns + `ProcessStep`-like blocks. CTA routes to `/contact?type=e-design` (contact form pre-selects E-Design).
- **External dep:** final pricing (editable; default placeholders).

### 7. Shop My Favorites

- **Route:** `/shop`.
- **Schema:** `shopPage` singleton (hero, intro, FTC disclosure text, ordered `collections[]` references) + `shopCollection` collection (title, slug, blurb, displayOrder) + `shopItem` collection (title, image+alt, vendor, affiliateUrl, note, collectionRef, displayOrder). Disclosure text required and shown near the top.
- **Component:** `ShopGrid.astro` + `ShopItemCard.astro` (brand-stripe card, `rel="sponsored nofollow"` on affiliate links, opens new tab).
- **External dep:** ShopMy/LTK/Amazon account + product URLs.
- **Empty state:** `/shop` renders an empty state when no items; nav link can stay (gives Google a crawlable page) or hide via `shopPage.enabled`.

### 8. Gift certificates

- **Route:** `/gift-certificates`.
- **Schema:** `giftPage` singleton: hero, intro, `options[]` (label, amount, blurb), `howItWorks[]`, `finePrint`, `ctaLabel`. CTA routes to `/contact?type=gift-certificate`.
- **Component:** Astro page. No payment code.
- **External dep:** Staci's fulfillment method (Square/PayPal invoice). Documented, not built.

### 9. Press / As Seen In

- **Route:** `/press` (hides itself until items exist).
- **Schema:** `pressItem` collection (outlet, logo+alt, quote/headline, url, date, displayOrder) + optional `pressPage` singleton (hero, intro). 
- **Component:** `PressStrip.astro` (logo row for Home + About) + `/press` page listing.
- **Empty state:** strip and page suppress entirely when no items.

### 10. Post-inquiry roadmap + autoresponder

- **Schema:** extend `contactPage` with `postInquiryRoadmap[]` (object: step number, title, body, optional time-estimate). The existing `whatToExpectContent` stays; the roadmap is the numbered, scannable version.
- **Component:** `PostInquiryRoadmap.astro` on `/contact`. Web3Forms autoresponder configured to send the sender a warm "here's what happens next" email mirroring the roadmap.
- **External dep:** Web3Forms autoresponder toggle/config.

### 11. Discovery-call activation

- Already wired via `contactPage.schedulingLink` + `CalendlyInline.tsx`. Add a free 15-minute discovery-call CTA on `/contact` (separate from the paid $150 consult) and a homepage CTA. Surface availability framing.
- **External dep:** Staci's Calendly URL.

### 12. Reviews + dedicated Before/After view

- **Schema:** extend `testimonial` with `sourceType` enum (Google / Facebook / Houzz / direct) and optional `reviewUrl`. Add `siteSettings.googleBusinessUrl` + `siteSettings.reviewsNote`.
- **Component:** a reviews surfacing (reuse `TestimonialGrid`) with a "Read more on Google" link when `googleBusinessUrl` set. New `/portfolio/before-after` view (or a filter on the portfolio index) listing projects that have `beforeAfters`, reusing `BeforeAfterSlider`.
- **Empty state:** before/after view hides when no project has pairs.

### 13. Satisfaction guarantee line

- **Schema:** `siteSettings.satisfactionGuarantee` (string/Portable Text, optional). Shown on `/services` and `/contact` near the CTA.
- **Empty state:** renders nothing when blank.

### 14. Privacy policy + consent

- **Route:** `/privacy`.
- **Schema:** `privacyPage` singleton (Portable Text body, last-updated date). 
- **Component:** Astro page + a lightweight, dismissible `ConsentNotice.tsx` (island, `client:idle`) shown once, stored in `localStorage`, linking to `/privacy`. Only renders when any cookie-setting feature is enabled.

---

## New / changed schemas (summary)

New singletons: `eDesignPage`, `shopPage`, `giftPage`, `resourcesPage`, `styleQuiz`, `budgetCalculator`, `privacyPage`, optional `pressPage`.
New collections: `leadMagnet`, `shopCollection`, `shopItem`, `pressItem`. (Style-quiz archetypes can be inline objects rather than a collection to keep Studio simpler.)
Extended: `siteSettings` (newsletter object, googleBusinessUrl, reviewsNote, satisfactionGuarantee), `contactPage` (postInquiryRoadmap), `testimonial` (sourceType, reviewUrl).
Register all in `studio/schemaTypes/index.ts`. Add singleton enforcement in `sanity.config.ts` for each new singleton. Run `npm run typegen` after every schema change. `npm run studio:deploy` for Canvas annotations.

---

## Cross-cutting requirements

- **Voice:** all placeholder copy follows the manifesto (warm, plain, no em-dashes, banned vocab). New prose fields get `canvasApp.purpose` hints; config/singleton marketing copy stays Canvas-excluded per existing pattern.
- **Performance:** new islands hydrate `client:visible`/`client:idle`. Quiz and calculator are custom React (no vendor widgets). Newsletter posts to ESP via fetch rather than embedding their script. Keep home-page JS < 100KB, any single island < 50KB.
- **Accessibility:** WCAG AA both themes. Forms get labels, `role="alert"` errors, focus management. Quiz steps announce via a live region. Dropdown nav keeps Radix keyboard behavior. 44px touch targets.
- **Theming:** every new surface renders in light and dark using semantic tokens; brand-stripe rhythm + `card-lift` on new cards. Verified via Playwright MCP screenshots in both themes and both viewports before "done."
- **SEO:** each new page singleton gets `seoTitle`/`seoDescription`, breadcrumb schema, and is included in the sitemap. E-Design and Shop get appropriate JSON-LD where it helps.

## Build sequence (straight through)

1. **Schemas + registration + singleton enforcement + typegen.** All new/changed schemas land first so types exist.
2. **Queries** (`src/lib/queries.ts`) for each new page/collection.
3. **Site-wide plumbing:** nav restructure (dropdowns), footer additions, ESP config wiring, `/privacy` + consent notice, env additions + `.env.example`.
4. **Confidence surfaces:** post-inquiry roadmap + autoresponder, reviews surfacing + `googleBusinessUrl`, before/after view, satisfaction line, press strip + `/press`.
5. **Capture tools:** newsletter component, lead-magnet guides + gate, style quiz, budget calculator, resources hub.
6. **Offerings:** `/e-design`, `/shop`, `/gift-certificates`.
7. **Verification:** typegen, build, Lighthouse + both-theme/both-viewport pass on every new page, keyboard pass. Commit per coherent chunk.
8. **Docs:** update `CLAUDE.md` (routes, components, editor-driven surfaces, privacy stance change) and the setup checklist.

## External launch checklist (only Staci / Nathan supply)

- ESP account + form-action URL + audience/list ID (+ key in env)
- Calendly URL on `contactPage.schedulingLink`
- ShopMy / LTK account + product links
- Google Business Profile URL + a review-request habit
- Final guide PDFs (Claude drafts, Staci approves/uploads)
- Real before/after photos
- Any press mentions + logos
- Final E-Design pricing
- Gift-certificate fulfillment method (Square / PayPal)
- Web3Forms autoresponder enabled
- Decide whether `/shop` and `/press` nav links show before content exists

## Risks / notes

- Schema changes propagate to live content. Add fields, do not rename/remove existing ones. Run typegen + verify Studio before deploy.
- Breaking the no-cookie stance creates a real privacy obligation. `/privacy` + consent notice are part of this build, not optional.
- Style quiz is the heaviest new surface (schema + island). If it grows unwieldy, archetypes can move to their own collection later.
- Keep the contact form the single high-intent endpoint; new CTAs deep-link into it with a pre-selected project type via query param.

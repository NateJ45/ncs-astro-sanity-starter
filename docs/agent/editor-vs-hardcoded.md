# What's editor-driven vs hardcoded

> Reference for what Staci can change in Studio versus what needs a code edit.

## What's editor-driven vs hardcoded

A reference for what Staci can change in Studio vs what requires a code edit.

### Editor-driven (Sanity)

- **All page copy** — eyebrows, headlines, subheads, body Portable Text, CTA labels (when the CTA uses a `ctaBlock` reference) on every page singleton.
- **All page hero images** — every `*Page` singleton has a `heroImage` field with caption support.
- **All collection content** — services, testimonials, FAQs, philosophy points, process steps, projects (case studies), journal entries, journal categories.
- **Site-wide identity** — siteSettings (email, phone, socials, service areas, travel fees, availability status, footer credit). Phone shows site-wide as a tap-to-call link (header, footer, mobile menu, contact page) and feeds the LocalBusiness JSON-LD; clearing it hides every instance.
- **Project-detail fields** — `briefLine` + `designCall` for the ProjectMetaBand; `decisionLine` + `caption` on intro-story images; `sourcedFrom` annotation marks in intro story.
- **Journal post extras** — coverImage caption, `sourcedFrom` annotation in body, related project reference.
- **Testimonial extras** — photo, location, relatedProject reference.
- **Hero subhead italic emphasis** — Staci can write `_word_` in any subhead and the parser renders the wrapped text in italic Cormorant. Editor-controlled, no code change needed.
- **Hero `heroRotatingWords` array on `homePage`** — the once-per-session first-word swap is now editor-driven. Set to 2+ strings to enable, clear/empty to disable.
- **Hero `heroScriptAccent` string on every `*Page` singleton + `portfolioPage`** — the Pinyon Script accent word for the page hero. Each page reads its own; defaults preserve the original feel ("reveal" on services, "Plainfield" on portfolio, "studio" on journal, "Know" on faq) only if the field is unset.
- **Section heading script accents** — `homePage.servicesGridScriptAccent`, `homePage.testimonialsScriptAccent`, `homePage.finalCtaScriptAccent`, and `finalCtaScriptAccent` on `aboutPage`, `processPage`, `servicesPage`, `faqPage`, `journalPage`, `eDesignPage`. Each renders that word in Pinyon Script on the matching `SectionHeading` or `FinalCta`. At most one per heading; the accent word must match the heading text exactly. Leave empty for no accent.
- **`stickyCtaLabel`** — `servicesPage.stickyCtaLabel` covers /services; `journalPage.stickyCtaLabel` covers every journal post; `project.stickyCtaLabel` covers individual portfolio pages. Clearing any one hides the chip on that surface. Empty string = chip hidden; unset = falls back to the original copy.
- **Contact form all four dropdowns** — `contactPage.form{ProjectType,Location,Budget,Timeline,Source}Options` arrays. Falls back to the hardcoded defaults in `ContactForm.tsx` when empty.
- **Portfolio index page copy** — `portfolioPage` singleton (eyebrow, headline, subhead, hero image, scriptAccent).
- **404 page** — `notFoundPage` singleton (eyebrow, headline, body, hero photo, the three CTA labels + hrefs). Lives next to the other page singletons in Studio.
- **Newsletter config** — `siteSettings.newsletter` (enabled toggle, heading, blurb, button label, success message, consent note, form-action URL, audience ID). Drives `NewsletterSignup`. No consent banner — the site remains effectively zero-cookie; the `/privacy` page is the privacy surface.
- **Style quiz** — `styleQuiz` singleton (intro copy, questions + image answers + archetype weights, optional qualifiers, archetypes with images + recommended-service reference, email gate mode/copy, result routing). Powers `/quiz`.
- **Budget calculator** — `budgetCalculator` singleton (intro copy, rooms, scope options, add-ons, result copy with `{{low}}`/`{{high}}` placeholders, disclaimer, CTA label, consult-price note). Powers `/calculator`.
- **Lead magnets** — `leadMagnet` documents (title, slug, summary, cover image, downloadable file, gate copy, ESP tag, `published` toggle, SEO). Power `/guides` + `/guides/[slug]`.
- **Shop** — `shopPage` singleton (`enabled`, intro, FTC disclosure, collections) + `shopCollection` + `shopItem` (vendor, affiliate URL, note, image). Powers `/shop`.
- **E-Design** — `eDesignPage` singleton (intro, how-it-works steps, what's-included list, pricing tiers, FAQ references, final CTA). Powers `/e-design`.
- **Gift certificates** — `giftPage` singleton (intro, options with amount + blurb, how-it-works steps, fine print, CTA label). Powers `/gift-certificates`.
- **Press** — `pressPage` singleton (intro) + `pressItem` documents (outlet, logo, quote, URL, date, orderRank). Power `/press` + the `PressStrip` on `/` and `/about`.
- **Privacy** — `privacyPage` singleton (body Portable Text, lastUpdated). Powers `/privacy`; a plain-voice static fallback renders before the doc exists.
- **Resources hub** — `resourcesPage` singleton (intro + cards). Falls back to hardcoded nav-style cards when empty.
- **Post-inquiry roadmap** — `contactPage.postInquiryRoadmap` array (title, body, time estimate) drives `PostInquiryRoadmap` on `/contact`.
- **Reviews + Google link** — `siteSettings.googleBusinessUrl` + `siteSettings.reviewsNote` render the "Read more on Google" link + reviews line under the home Kind Words block (each suppresses when unset).
- **Satisfaction guarantee** — `siteSettings.satisfactionGuarantee` renders near the form CTA on `/contact` and near the final CTA on `/services`.
- **Testimonial `sourceType`** — `testimonial.sourceType` (`google` / `houzz` / `facebook` / `direct` / `other`) drives the small platform badge on `TestimonialCard` + `FeaturedTestimonial`. Renders nothing for `direct` / `other` / unset.

- **About personal section** — `aboutPage.personal*` field group: eyebrow, headline, intro, `currentlyList[]`, `rapidFire[]`, `localSpots[]`, `beyondDesign`, `candidPhoto`. Drives `AboutPersonal.astro` on `/about`. The section self-hides when all modules are empty, so Staci can fill it in gradually without anything looking broken.
- **Start Here guide** — `studioGuide` singleton: the "How the website works" handbook panel is now editable in Studio. Nathan or Staci can update the site map, how-tos, and tips without a code change.
- **Start Here business notes** — `studioNotes` singleton: the three static positioning sections in the "Your business at a glance" panel (business summary, ideal client, voice summary + words to avoid) are now editable in Studio.
- **Grow your studio guides** — `studioPlaybook` singleton: the five professional-development guides in the "Grow your studio" panel (photographing projects, writing portfolio and journal posts, software toolkit, offering e-design, trade vendor sourcing) are editable in Studio. Seeded with researched 2026 content via `scripts/seed-studio-playbook.mjs`.
- **Section visibility** — `siteSettings.sectionVisibility` object field (ten boolean toggles: Portfolio, Journal, Shop, E-Design, Gift Certificates, Press, Resources, Guides, Style Quiz, Budget Calculator). Toggling any one off removes that section from the nav, footer, homepage, and its own page simultaneously. Core pages are always on. See [Section visibility](#section-visibility) in Page architecture for the full behavior.

### Hardcoded in code (intentional)

These are stable design / system decisions that don't belong in editorial:

- **Process step illustrations** — inline SVG line drawings in `ProcessStepIllustration.astro`. Placeholder until / unless a real illustrator delivers final art.
- **Brand colors / typography tokens** — declared in `src/styles/globals.css` `@theme` block. System-level, not editorial.
- **Footer credit + auto-year copyright** — composed from `siteSettings.footerCredit` + the current year. Year is computed from `new Date()` at build/render time.

If you ever want to flip one of these to editor-driven, the pattern is: add a field to the appropriate Sanity schema, run `npm run typegen`, update the page to consume the new field, deploy Studio.

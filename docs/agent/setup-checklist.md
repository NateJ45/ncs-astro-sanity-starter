# Setup checklist

> Everything to configure before or during the public launch (env vars, Studio, seeded content, external services, validation).

## Setup checklist

Things to configure before or during the public launch. Everything below should ship gracefully today (components render nothing or fall back when not configured) so the site stays clean while these wait.

### Cloudflare Workers env vars (Settings → Variables)

- [ ] `PUBLIC_SANITY_PROJECT_ID`
- [ ] `PUBLIC_SANITY_DATASET` (production)
- [ ] `PUBLIC_SANITY_API_VERSION`
- [ ] `PUBLIC_WEB3FORMS_KEY`
- [ ] `PUBLIC_CF_ANALYTICS_TOKEN`
- [ ] `PUBLIC_CALENDLY_URL`

### Sanity Studio

- [ ] Studio deployed and accessible to Staci
- [ ] All 14 schemas in place per `02-sanity-schemas.md`
- [ ] Singleton enforcement working (siteSettings + page singletons can't be duplicated)
- [ ] Desk structure organized per the schema spec (Site Settings pinned at top, then Pages, then Content)
- [ ] Sanity TypeGen wired into `npm run typegen` and `npm run build`

### Content seeded into Sanity

- [ ] `siteSettings` populated (email, service areas, travel fees, availability, socials, footer credit)
- [ ] All 7 testimonials loaded
- [ ] All 4 services + Builder/Realtor track loaded
- [ ] All 4 process steps loaded
- [ ] All ~14 FAQ items loaded
- [ ] All 3 philosophy points loaded
- [ ] All 6 page singletons populated
- [ ] Staci's portrait uploaded (with alt text)
- [ ] Homepage hero image uploaded (with alt text)
- [ ] First 1 to 2 case studies authored (or scheduled for soon after launch). Each needs at least 3 photos and a filled brief and call line, now enforced by schema validation
- [ ] Delete the 3 `[SAMPLE: delete before launch]` placeholder projects from Studio (or replace with real case studies) so they don't become the live portfolio
- [ ] Staci's one-sentence credentials line written (`aboutPage.backgroundLine`)
- [ ] Calendly URL set on `contactPage.schedulingLink`

### Conversion-build external setup (capture tools + offerings)

- [ ] **ESP account** created (ConvertKit / MailerLite / Kit) and the embeddable form-action URL set on `siteSettings.newsletter.formActionUrl`, then `siteSettings.newsletter.enabled` flipped on. Until enabled, the newsletter card stays hidden. (No consent banner — the site sets no cookies that require one.)
- [ ] **Web3Forms autoresponder** enabled on the access key in the Web3Forms dashboard (the contact form now sends `autoresponse: true` — without the dashboard toggle, no confirmation email goes out).
- [ ] **Shop affiliate links** (ShopMy / LTK / direct) added to `shopItem.affiliateUrl`, and `shopPage.enabled` set. Confirm the FTC disclosure copy reads right.
- [ ] **Google Business URL** set on `siteSettings.googleBusinessUrl` (powers the "Read more on Google" link) + a short `siteSettings.reviewsNote`.
- [ ] **Guide PDFs** uploaded to each `leadMagnet.file` and `published` toggled on (otherwise `/guides/[slug]` 404s and the index hides them).
- [ ] **E-Design pricing** filled on `eDesignPage` (tiers, what's-included, how-it-works) — until then `/e-design` shows a coming-soon state.
- [ ] **Gift fulfillment** flow decided + `giftPage` filled (the page is informational only; there's no payment processing — CTAs route to `/contact?type=gift-certificate`).
- [ ] **Seed `styleQuiz`** (2+ questions, 2+ archetypes with images + recommended-service refs, gate mode/copy) — `/quiz` shows coming-soon until valid.
- [ ] **Seed `budgetCalculator`** (rooms + scope options at minimum) — `/calculator` shows coming-soon until valid.
- [ ] **Seed `leadMagnet` documents** for the guides you want live at launch.
- [ ] **Privacy policy** reviewed: either fill `privacyPage.body` or confirm the static fallback copy is accurate for the ESP you chose.
- [ ] Run `npm run studio:deploy` after the schema additions so Studio shows the new document types.

### Pre-launch validation

- [ ] Contact form submits cleanly to Web3Forms (test with a real submission)
- [ ] Calendly link opens correctly
- [ ] Lighthouse: Performance 95+, Accessibility 100, Best Practices 100, SEO 100 on every page
- [ ] Manual keyboard navigation pass on every page
- [ ] Mobile responsive check on iPhone Safari and Android Chrome
- [ ] All Sanity references resolve (no broken testimonial → project links, etc.)
- [ ] sitemap-index.xml generated and submitted to Google Search Console
- [ ] Cloudflare Analytics beacon firing

### Recurring upkeep

- [ ] Re-run `npm run og` after editing brand colors, tagline, or wordmark.
- [ ] Re-run `npm run typegen` after any Sanity schema change.
- [ ] Annually: refresh availability status on `siteSettings` if Staci's booking situation changes.

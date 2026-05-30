# Reid Design LLC — Migration Project: Strategy & Audit

**Project:** Squarespace → Astro + Sanity (Cloudflare Pages)
**Client:** Staci Perkins, Reid Design LLC
**Builder:** Nathan Nixon (Nixon Creative Studio)
**Document covers:** Phase 1 (Strategy) + Phase 2 (Audit & Synthesis)
**Status:** Strategy locked. Audit complete. Synthesis complete. Ready to feed Phase 3 (Extraction) and Phase 5 (Sanity Schemas).

---

### Update log: shipped since initial strategy

**May 2026 — Conversion and confidence build (main branch)**

All "what's missing" audit items from Phase 2 are now largely addressed. Specifically:

- Portfolio landed with project detail pages (`/portfolio`, `/portfolio/[slug]`), Room x Style filter chips, before/after slider, and a `/portfolio/before-after` gallery page.
- Journal/blog landed with seven custom Portable Text block types.
- New revenue surfaces: E-Design (`/e-design`), affiliate shop (`/shop`) with FTC disclosure, gift certificates (`/gift-certificates`).
- New capture tools: newsletter signup in footer, lead-magnet guides with gated download (`/guides`, `/guides/[slug]`), multi-step style quiz (`/quiz`), budget estimate calculator (`/calculator`).
- Confidence features: post-inquiry roadmap on `/contact`, Web3Forms autoresponder, Google Business link + reviews line, before/after view, satisfaction guarantee, press strip + `/press` page.
- Grouped dropdown nav (Services and Resources menus) without pulling Contact out of the primary CTA position.
- Section-heading script accents: shared `splitScriptAccent()` helper in `src/lib/scriptAccent.ts`; `SectionHeading.astro` and `FinalCta.astro` accept `scriptAccent` prop; editor fields on every page singleton.
- Privacy posture: consent banner removed (site is effectively zero-cookie for a US local business); `/privacy` page kept; `public/robots.txt` and `public/llms.txt` added.
- All new pages and document types are Sanity-editable; schemas cover styleQuiz, budgetCalculator, leadMagnet, shopCollection, shopItem, eDesignPage, giftPage, pressPage, pressItem, resourcesPage, privacyPage, and more.

Note: the seed content produced by `scripts/seed-conversion-content.mjs` is placeholder (fabricated press items, placeholder pricing, dummy affiliate URLs, no uploaded guide PDFs). It must be replaced before DNS cutover. See OPERATIONS.md for the full before-cutover checklist.

---

## Project context

Reid Design LLC is an Indianapolis-area residential interior design studio. The live Squarespace site at reiddesignllc.com works but reads thin: there is no portfolio, the About page is light, and the platform is friction-heavy enough that case studies don't get added. The migration to Astro + Sanity is in service of two outcomes: more local recognition for Staci and more booked interior design clients. Every structural decision should pass one of those two tests.

This is a brand and content refresh that happens to include a platform change. The Squarespace site is a content reference, not a target.

---

# Phase 1 — Locked Strategy

## Positioning

Reid Design is a Plainfield-based residential interior design studio serving Plainfield, Indianapolis, and the surrounding suburbs. The work spans full room transformations down to a single styling visit, with most projects landing in the middle. The tone is warm and approachable, pricing is shown openly, and the bias is toward working with what a client already owns when that's the right call. The premium polish on the visual identity is meant to elevate perception and support pricing increases over time, not to position her against luxury firms she isn't trying to compete with.

## Ideal client

A homeowner in Plainfield, Indianapolis, or the northern suburbs (Carmel, Fishers, Westfield, Zionsville, Noblesville) whose house feels off and who doesn't know where to start. They have budget for design help but aren't shopping at the white-glove tier. They might come in for a $150 consultation and graduate into a $650 to $850 room design once trust is established. They find Staci on Instagram or through a referral. They want someone who feels like a smart friend who happens to be a designer, not a salesperson in a showroom.

## Canonical services and pricing

Source of truth: the live homepage. Any inconsistency elsewhere on the current site is a stale draft.

| Service | Price | Description |
|---|---|---|
| In-home consultation | $150 | 60 to 90 minute in-home visit. Walk the space, talk through what's not working, leave with a clear plan. Includes color and finish direction (merged from former standalone Color & Finish Guidance service). |
| Full room design | starting at $650 | Custom design plan with mood direction, layout, furniture and decor selections, and sourcing list with direct shopping links. Client shops at their own pace. |
| Full room design + styling | starting at $850 | Everything in Full Room Design plus hands-on shopping and sourcing, paint color selections, and in-home styling and final reveal. |
| Shopping & sourcing | $75 per hour | Hands-on help finding the right pieces. Trade vendor access included. No minimum. |
| Builder & realtor partnerships | Custom | Aspirational track. Reid Design is open to these partnerships but does not yet have an established book. Copy should read as invitation, not claim. |

Travel fee structure (published):

| Distance from Plainfield | Travel fee |
|---|---|
| Within 30 minutes | None |
| 45 to 75 minutes | $50 |
| 75 to 120 minutes | $75 to $100 |

## Voice manifesto

Five do-this-not-that pairs. The yardstick for any new copy.

**1. Say it plainly. Especially about money.**
Do: *"My in-home consultation is $150 for 60 to 90 minutes. We walk the space, talk about color and layout, and you leave with a plan."*
Don't: *"Our initial consultation experience starts at $150 and offers an opportunity to explore your vision together."*

**2. Sound like a smart friend, not a brochure.**
Do: *"Your dining room probably doesn't need a renovation. It might just need a different rug."*
Don't: *"We craft transformative experiences that elevate your home."*

**3. Show the thinking, not the credentials.**
Do: *"I usually start with a paint sample, because the wall color sets what every other choice has to answer to."*
Don't: *"With years of experience and an eye for detail, I bring proven expertise to every project."*

**4. Stop talking when you're done.**
Do: End the paragraph. Trust the reader.
Don't: Add a closing line that restates the point, hedges the previous sentence, or tacks on "if that works for you."

**5. Be specific. One real room in Fishers beats "modern luxury home."**
Do: *"A 1970s ranch in Fishers we brought up to feel current without erasing what made it good."*
Don't: *"Timeless residential design for the discerning Indianapolis homeowner."*

Banned vocabulary: no "transformative," no "curated experience," no "investment in your space," no "elevated living," no "tailored solutions." Plain English wins every time.

## Differentiation against Indianapolis competitors

Against Winland Designs: more human, less keyword-stuffed. Copy that sounds like a person, not a search engine.

Against Hoskins Interior Design: portfolio organized by project story instead of by room type, so visitors see the full transformation arc rather than decontextualized "bedrooms" thumbnails.

Against both: process surfaced as a primary nav item to reduce first-time client anxiety, and starting price anchors visible on the services page so visitors self-qualify before reaching out.

The local SEO opportunity is the suburbs. Winland and Hoskins are focused on downtown and north Indy proper. Plainfield is even less contested. Page titles, meta descriptions, and future blog content should lean into that.

## What Reid Design wants more of

Local recognition and more booked clients for interior design and advice in the Plainfield and Indianapolis area. The new site is in service of those two outcomes.

## Where it's heading a year from now

More case studies (the migration should make adding new projects fast enough that Staci will actually do it). Higher consultation pricing as she crosses her own milestone for raising rates. Stronger local SEO presence in the suburbs. Possibly a short blog or written point-of-view section once she has a few projects under her belt to write from.

---

# Phase 2 — Site Audit

## Site inventory snapshot

Six pages live in the homepage navigation: Home, Process, Services, FAQ, Contact, About. The site is internally consistent on pricing and services (caveat: Contact form dropdown is the one exception, see Contact audit). Confirmed via Chrome integration on the live rendered DOM, not via static HTML fetch.

| Page | What it does well | What it's missing |
|---|---|---|
| Home | Real tagline, real testimonials, real prices, clear CTA | No portfolio teaser (no portfolio exists), no service area cue |
| Process | Four steps, plain language, integrated FAQ, pricing reinforced | No photos of actual project moments |
| Services | All four services + builder/realtor track + travel fees | No portfolio cross-link, no service-specific case examples |
| FAQ | Thorough, honest, well-organized into four sections | Some Q&A repeats Process page content |
| Contact | Form works, email visible, service area listed | Project Type dropdown is wrong (real live bug) |
| About | Clean story, clear philosophy | No photo confirmation, no credentials, no project highlights |

## Per-page audits

### Home

| Section | Verdict | Notes for new site |
|---|---|---|
| Hero (eyebrow + headline + sub + 2 CTAs) | Rewrite (eyebrow only) | Change eyebrow to "Plainfield Interior Design · Serving Greater Indianapolis." Headline and CTAs stay verbatim. |
| Meet Staci (photo + intro + CTA) | Keep | Carry over as-is. Verify portrait resolution. |
| How It Works (4-step preview) | Keep | Carry over. Add per-step photos post-launch when available. |
| Kind Words (1 featured + 6 grid testimonials) | Keep | Carry over verbatim. Real Facebook recs with attribution. |
| How Reid Design Can Help (4 services + prices) | Keep structure, rewrite micro-copy | Keep prices. Tighten card descriptions toward voice manifesto rules 1 and 5. |
| Final CTA | Keep | Carry over verbatim. |

**Add to Home:** Featured-projects block (3-up grid, once portfolio exists). Slim service-area cue line above or below testimonials. Optional quiet builder/realtor cross-link in footer or after services.

### Process

| Section | Verdict | Notes for new site |
|---|---|---|
| Page hero | Keep | Carry over verbatim. |
| Step 01 — In-Home Consultation | Keep | Carry over. Wire to matching service card. |
| Step 02 — Design Plan Created | Keep | Carry over. |
| Step 03 — Shopping + Selections | Keep | Carry over. Preserve the tier-conditional logic in schema. |
| Step 04 — Styling + Final Reveal | Keep | Carry over. |
| Common Questions (8 FAQs) | Keep with light dedupe | Decide rule: FAQ page covers everything, Process page covers only process-specific. |
| Final CTA | Keep | Carry over. |

**Add to Process:** Visual timeline summary block. In-process photos post-launch. Step indicator UI.

### Services

| Section | Verdict | Notes for new site |
|---|---|---|
| Page hero | Keep | Carry over verbatim. |
| 4 service cards | Keep structure, light rewrite on "best for" lines | Tighten generic ones. |
| Full Room Design detail block | Keep | Carry over. |
| Color & Finish Guidance detail block | **Merge into consultation** | Per Nathan's call: this isn't a standalone product. Roll the color guidance language into the consultation card and detail. |
| Shopping & Sourcing detail | Keep | Carry over. |
| Builder & Realtor Partnerships | Keep, reframe softer | Per Nathan: aspirational not claim. Rewrite as invitation. |
| Service Area & Travel Fees | Keep | Carry over. Plainfield-anchored. |
| Final CTA | Keep | Carry over. |

**Add to Services:** Per-service mini case examples once portfolio exists. Short payment-structure note (1 line, pointing to FAQ for detail).

### About

| Section | Verdict | Notes for new site |
|---|---|---|
| Page hero | Keep | "People Hire People." Best headline on site. |
| My Story (origin) | Keep with light trim | Carry over with tightening pass. Grandmother detail confirmed by Nathan as a keeper. |
| Attribution + photo | Keep | Verify photo quality with screenshot. |
| Three philosophy values | Keep | Carry over verbatim. Model as repeatable content type. |
| Final CTA | Keep | Carry over. |

**Add to About:** One-sentence credentials/background line (Staci's real info, not aspirational). Service area mention. Optional personal details (family, hobbies, what she loves about Plainfield). Cross-link to portfolio once it exists.

### FAQ

| Section | Verdict | Notes for new site |
|---|---|---|
| Page hero | Keep | Carry over. |
| Pricing & Cost (3 Qs) | Keep | This is the canonical full pricing breakdown. Worth duplicating into Services page footer. |
| The Process (3 Qs) | Keep with dedupe | Don't repeat answers across Process and FAQ pages. |
| Logistics (3 Qs) | Keep | Carry over. |
| Service Area (3 Qs) | Keep | Carry over. Already Plainfield-anchored. |
| Final CTA | Keep | Carry over. |

**Add to FAQ:** "Who's a good fit / not a good fit?" question (per Nathan's approval). Experience/background question (sources same info as About credentials line). What to prepare before the consultation question.

### Contact

| Section | Verdict | Notes for new site |
|---|---|---|
| Page hero | Keep | Carry over verbatim. |
| Form | Rewrite dropdown, keep rest | New dropdown options: In-Home Consultation, Full Room Design, Full Room Design + Styling, Shopping & Sourcing, Builder / Realtor Inquiry, Not Sure Yet. |
| What to Expect | Keep | Carry over. |
| Email display | Keep | Plan email forwarding through DNS cutover. |
| Social links | Keep | Carry over. |
| Service Area | Rewrite order | Plainfield first, then Indianapolis, Carmel, Fishers, Westfield, Zionsville, Noblesville, surrounding areas. |
| Availability indicator | Keep | Model as single editable field in Sanity. |

**Add to Contact:** Pre-form expectation note (one line). Calendly or similar scheduling link for the 20-min discovery call (per Nathan's approval). Optional service-zone map.

---

# Phase 2 — Synthesis

## A. Content to extract from the live Squarespace site

| Source page | What to pull | Format |
|---|---|---|
| Home | Hero copy + photo. Meet Staci copy + portrait. 4-step process preview. 7 Facebook testimonials. Service card copy and prices. Final CTA. | Markdown + image folder |
| Process | Page hero. 4 step descriptions with bullets. 8 FAQs. Final CTA. | Markdown + structured FAQ data |
| Services | Page hero. 4 service cards. Full Room Design + Shopping detail blocks. Travel fee structure. Final CTA. | Markdown + structured services data |
| FAQ | Page hero. 11 FAQs across 4 categories. Final CTA. | Structured FAQ data |
| Contact | Page hero. Form structure. What to Expect. Email, socials, service area, availability. | Markdown + form schema |
| About | Page hero. Full origin story. 3 philosophy values. Attribution + portrait. Final CTA. | Markdown + image |

Plus: Reid Design logo (homepage + footer variants), favicon.

## B. New copy to write or update before launch

| Item | Owner |
|---|---|
| Plainfield-first eyebrow on homepage hero | Nathan drafts, Staci approves |
| Service-area cue line for homepage | Nathan drafts |
| Tightened service-card micro-copy | Claude drafts, Staci approves |
| Color & Finish merged into consultation description | Claude drafts |
| Builder/realtor section rewrite (aspirational) | Claude drafts |
| About credentials/background line (1 sentence, accurate) | Staci writes raw, Claude tightens |
| About service area reference | Claude drafts |
| New FAQ: Who's a good fit? | Claude drafts, Staci approves |
| New FAQ: experience/background | Same source as About credentials |
| New FAQ: what to prepare before consultation | Claude drafts |
| Contact form pre-submit expectation note | Claude drafts |
| Reordered service area listings (Plainfield first, everywhere) | Find-and-replace in extraction |

## C. Visual assets needed

| Asset | Status | Priority |
|---|---|---|
| Updated Staci headshot | Screenshot live About to verify current quality | Soft launch blocker |
| 1 to 2 real project case studies (photos, ideally before/after) | Doesn't exist | Hard launch requirement |
| Process step photos (consult, mood board, install) | Don't exist | Post-launch |
| Trade vendor logo accuracy | Need Staci to confirm what's actually true before any logos appear | Soft launch blocker |

## D. Sanity content types (early signal for Phase 5)

| Content type | Purpose | Approximate count at launch |
|---|---|---|
| Page | One-off pages (Home, About, Process, FAQ, Contact) with flexible section composition | 5 |
| Service | The paid offerings: title, price, features, "best for," long detail | 4 (5 with builder/realtor) |
| Process Step | Number, title, time estimate, description, tier note | 4 |
| Testimonial | Quote, attribution, source, date, optional project link | ~10 at launch, growing |
| FAQ Item | Question, answer, category, display order | ~15 to 20 |
| Project (Case Study) | Title, location, room type, year, intro story, hero, gallery, before/after, services used, optional testimonial ref | 1 to 2 at launch, growing |
| Philosophy Point | Title + description (currently 3, designed for easy add) | 3 |
| Site Settings (singleton) | Service area, travel fees, availability, email, socials, footer text | 1 |

Schema design priority: editing comfort for Staci. Short field names, helpful descriptions, sensible defaults, no fields she shouldn't touch.

## E. Squarespace live bugs — deferred

Per Nathan's call, not fixing on the live site since migration is incoming. Documented for the record:

1. Contact form Project Type dropdown lists services that don't exist.
2. Service area listings lead with Indianapolis instead of Plainfield.

Both get fixed as part of the new build.

---

# Decisions Log

For future-Nathan and future-Claude to trace why we made the calls we made.

| Decision | Locked by Nathan |
|---|---|
| Plainfield-first positioning, not Indianapolis-first | Yes |
| Builder/realtor track is aspirational, kept off homepage primary services grid | Yes |
| Color & Finish Guidance merged into consultation (not a standalone product) | Yes |
| Keep grandmother story on About | Yes |
| Soften builder/realtor copy to "I'd love to hear from you" framing | Yes |
| Add "Who's a good fit?" FAQ | Yes |
| Include Calendly or similar scheduling link on Contact | Yes |
| Use homepage live-site pricing as canonical, not the older pricing doc | Yes |
| Launch with 1 to 2 case studies, add more over time, don't wait | Yes |
| Move Phase 5 (Sanity schemas) before Phase 3 (extraction) | Yes |
| Skip the two live Squarespace bugs and let the migration fix them | Yes |

---

# Open Items for Phase 5+

These don't block schema design but should be settled before launch:

- Staci's real credentials and background (one accurate sentence)
- Trade vendor list accuracy (which she actually has)
- Whether Staci wants personal details on the About page (family, hobbies, Plainfield-area connection)
- Headshot quality decision (use current or shoot new)
- Scheduling tool choice (Calendly, Squarespace Scheduling stays put, or something else)
- DNS cutover timing and downtime tolerance (Phase 4 concern)

---

*Last updated: May 26, 2026*

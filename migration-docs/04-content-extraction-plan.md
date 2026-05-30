# Reid Design LLC — Content Extraction Plan

**Purpose:** Pull all "keep" content from the live Squarespace site into structured files matching the Sanity schemas. Files are ready to either import via Sanity CLI or use as reference for manual entry in the Studio.
**Output:** This document plus 12 content files in `/content/` and an image checklist.
**Source of truth:** Live rendered Squarespace site as of May 26, 2026 (captured via Chrome integration, not static HTML).

---

## Extraction approach

The volume is small enough that scripted import isn't worth the complexity. The right workflow is:

1. **Use the extracted JSON files as the source of truth** for what content goes where.
2. **Manual entry into the Sanity Studio** for everything, in import-order (see below). This gives Staci a chance to review each piece as it lands.
3. **Image downloads happen separately**, listed in `content/images-checklist.md` with current Squarespace URLs and notes on what to do with each.

Alternative: a one-time Sanity CLI import using NDJSON (newline-delimited JSON). All the JSON files in `/content/` can be converted to NDJSON with a 10-line script. Use this if manual entry becomes tedious.

---

## Import order (matters for references)

Sanity references depend on the target document existing first. Import in this order:

1. **`site-settings.json`** (singleton, no dependencies)
2. **`philosophy-points.json`** (no dependencies)
3. **`testimonials.json`** (no dependencies)
4. **`services.json`** (no dependencies)
5. **`process-steps.json`** (optional ref to services, can populate now or later)
6. **`faq-items.json`** (no dependencies)
7. **`home-page.json`** (references testimonials, indirectly services and steps)
8. **`about-page.json`** (references philosophy-points indirectly)
9. **`process-page.json`** (references process-steps and faq-items indirectly)
10. **`services-page.json`** (references services indirectly)
11. **`faq-page.json`** (references faq-items indirectly)
12. **`contact-page.json`** (uses site-settings)

Projects (case studies) come later, post-launch, written from scratch as Staci completes work.

---

## What's extracted vs what's authored fresh

**Extracted verbatim from the live site:**
- Site settings (email, social links, service areas, travel fees, availability)
- All 7 testimonials with attribution and dates
- All 4 services with prices and features
- All 4 process steps with descriptions and feature lists
- All 3 philosophy points
- All 11 FAQ items (FAQ page) + 7 unique FAQ items (Process page, after deduping)
- All page hero copy, "what to expect" copy, story copy, intro copy

**Authored fresh per the audit (marked `[NEW]` in the files):**
- Plainfield-first homepage eyebrow
- Service-area cue line for homepage
- Tightened service-card "best for" lines (where current copy is too generic)
- Color & Finish Guidance merged into consultation description
- Builder & Realtor section reframed as invitation, not claim
- About page credentials/background line (needs Staci's input)
- 3 new FAQs (good fit, experience, what to prepare before consultation)
- Contact form pre-submit expectation note

These are noted in the relevant files with `[NEW — see strategy doc]` markers. Some are placeholders waiting for Staci's input, others have draft copy ready.

---

## Files produced

| File | Maps to Sanity type | Notes |
|---|---|---|
| `content/site-settings.json` | `siteSettings` (singleton) | One object |
| `content/testimonials.json` | `testimonial` | Array of 7 objects |
| `content/services.json` | `service` | Array of 5 objects (4 active + builder/realtor) |
| `content/process-steps.json` | `processStep` | Array of 4 objects |
| `content/faq-items.json` | `faqItem` | Array of ~14 objects after dedupe |
| `content/philosophy-points.json` | `philosophyPoint` | Array of 3 objects |
| `content/home-page.json` | `homePage` (singleton) | One object |
| `content/about-page.json` | `aboutPage` (singleton) | One object |
| `content/process-page.json` | `processPage` (singleton) | One object |
| `content/services-page.json` | `servicesPage` (singleton) | One object |
| `content/faq-page.json` | `faqPage` (singleton) | One object |
| `content/contact-page.json` | `contactPage` (singleton) | One object |
| `content/images-checklist.md` | (not a Sanity type) | Image URLs and download notes |

---

## Image extraction workflow

Images are listed in `content/images-checklist.md` with their current Squarespace CDN URLs and target Sanity field references.

**How to download:**
1. Open each URL in a browser and save to `content/images/` (folder gets created when first image lands)
2. OR run a simple script Nathan writes locally (this environment doesn't allow direct binary downloads)
3. Upload to Sanity via the Studio when populating the matching document

**Image quality notes** to verify during download:
- Staci's headshot: confirm resolution is adequate for retina display (target 1000px+ on shortest side). If not, plan a re-shoot per the audit.
- Homepage hero photo: same standard, ideally 2500px+ wide for full-width hero use.

---

## How to use these files in the Sanity Studio

Two paths:

**Path A: Manual entry (recommended for first pass).**
Open the Sanity Studio. For each file in import order, open the matching document type, paste field values one at a time, upload the corresponding image, save. Takes about 2 to 3 hours total for the full content set. Pro: Staci can review each piece as it lands and edit on the fly. Con: tedious.

**Path B: Sanity CLI import.**
Convert the JSON files to NDJSON (one line per document, with `_type` and `_id` fields added). Run `sanity dataset import`. Takes 5 minutes once the conversion script is written. Pro: fast. Con: less visibility into what's landing where, harder to catch issues.

Recommended: Path A for launch (review-as-you-go), Path B for any future bulk imports.

---

## Open items for extraction

These can't be filled in by extraction alone:

1. **About page credentials line.** Staci needs to write one accurate sentence about her background. Marked `[TODO: Staci]` in `about-page.json`.
2. **Trade vendor list accuracy.** If vendor logos or names appear anywhere, Staci needs to confirm which are actually her trade accounts. Currently no vendor logos are extracted (the live site doesn't show any, only the old draft did).
3. **Staci's photo upload.** Confirm current quality first.
4. **Hero background image upload.** Currently using the existing homepage hero image from Squarespace.
5. **Calendly link URL.** Goes into `contact-page.json.schedulingLink` once Staci creates the account.
6. **First 1 to 2 case study projects.** New content, not extracted. Authored in Sanity directly when ready.

---

*Last updated: May 26, 2026*

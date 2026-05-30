# Reid Design LLC — Sanity Schema Spec

**Sanity Studio version:** v5
**Schema language:** TypeScript with `defineType` / `defineField` / `defineArrayMember` from `'sanity'`
**Type generation:** Sanity TypeGen (official tool, generates types from schemas)
**Rich text:** Sanity Portable Text
**This spec covers:** All content types needed for launch, plus Studio configuration notes.
**Translates to:** TypeScript schema files in the Astro + Sanity build project.

---

## Schema architecture: why page-specific singletons over a block builder

Two reasonable approaches exist for a content-rich marketing site in Sanity:

**Option A (chosen):** Page-specific singleton schemas. One document type per page (`homePage`, `aboutPage`, `processPage`, `servicesPage`, `faqPage`, `contactPage`), each with the exact fields that page needs. The content collections (`testimonial`, `service`, `processStep`, etc.) are separate document types that the pages reference.

**Option B (rejected):** A single `page` document type with a flexible `sections` array, where each section is one of many block types (hero block, services grid block, testimonial block, etc.).

Option A wins for Reid Design because:
1. **Staci is the editor.** She opens "Home Page" in the Studio and sees the fields for the home page. Not a block library with 12 options and composition rules to learn.
2. **The site is six pages.** Flexibility for adding arbitrary new pages isn't a real need. Adding a Blog later is its own document type.
3. **Field names map to what she'd say.** "Featured testimonial" is a field on the home page, not a property buried inside a section block.

If the site grows past about 15 pages or starts needing flexible landing pages, we revisit. Not before.

Reusable shapes (like a final CTA block that appears on multiple pages) become **object types** (not document types) that get embedded by the page singletons that need them.

---

## Schema list (14 types total)

**Settings & globals (1):**
1. `siteSettings` (singleton)

**Reusable content collections (6):**
2. `testimonial`
3. `faqItem`
4. `philosophyPoint`
5. `service`
6. `processStep`
7. `project` (case study)

**Page singletons (6):**
8. `homePage`
9. `aboutPage`
10. `processPage`
11. `servicesPage`
12. `faqPage`
13. `contactPage`

**Reusable object types (embedded, not standalone documents) (1):**
14. `ctaBlock`

---

# Foundational types

## 1. `siteSettings` (singleton)

**Purpose:** Site-wide values that appear in the header, footer, contact area, and meta tags. One instance, edited in one place.

| Field name | Type | Required | What Staci sees as the description | Notes |
|---|---|---|---|---|
| `title` | string | yes | "Site title (used in browser tab and search results)" | Default: "Reid Design LLC" |
| `tagline` | string | yes | "Short tagline shown under the logo in the footer" | Example: "Indianapolis interior design for homes that feel genuinely yours" |
| `email` | string | yes | "Public email address shown on the Contact page" | Validation: email format |
| `phone` | string | no | "Public phone number, if you want one shown" | Leave blank to hide |
| `availabilityStatus` | string | yes | "Short status shown next to the green dot on the Contact page" | Examples: "Accepting new clients" / "Booking for Fall 2026" / "Currently booked, accepting waitlist" |
| `serviceAreas` | array of strings | yes | "Cities and neighborhoods you serve, in display order. Plainfield should be first." | Drag to reorder |
| `travelFees` | array of `travelFeeTier` objects | yes | "Drive-time tiers and the travel fee for each. Always quoted upfront." | See `travelFeeTier` definition below |
| `socialInstagram` | url | no | "Full Instagram URL" | Validation: URL |
| `socialFacebook` | url | no | "Full Facebook URL" | Validation: URL |
| `footerCredit` | string | no | "Optional credit line in the footer (e.g., 'Site by Nixon Creative Studio')" | |

**Embedded object: `travelFeeTier`**
| Field | Type | Required | Description |
|---|---|---|---|
| `distanceLabel` | string | yes | "Distance range, like '45 to 75 minutes'" |
| `fee` | string | yes | "Fee text, like '$50' or 'None'" |

**Studio configuration notes:**
- Mark as singleton in Studio Desk structure so only one instance can exist.
- Lock the document type from being deletable by editors.
- Position at top of Studio sidebar (above all collections).

---

## 2. `testimonial`

**Purpose:** Client testimonials and reviews. Used across the site (homepage testimonial section, project pages, optional sidebar quotes).

| Field name | Type | Required | What Staci sees as the description | Notes |
|---|---|---|---|---|
| `quote` | text (multi-line) | yes | "What the client said. Keep their punctuation." | |
| `attribution` | string | yes | "Their name as they want it shown. Example: 'Sara Hooker' or 'Tom K.'" | |
| `date` | date | yes | "When they wrote the review" | |
| `source` | string with options | yes | "Where the testimonial came from" | Options: "Facebook", "Google", "Houzz", "Direct (email or text)", "Other" |
| `featured` | boolean | no | "If checked, this is the large featured quote at the top of the testimonials section. Only one can be featured at a time." | Default: false. Studio validation: ideally only one document with `featured: true`. |
| `relatedProject` | reference to `project` | no | "If this testimonial is about a specific project, link it here" | |

**Studio preview:**
- Title: first 60 chars of `quote` with ellipsis
- Subtitle: `attribution` · formatted `date`
- Sort default: `date` descending (newest first)

---

## 3. `faqItem`

**Purpose:** Individual frequently-asked questions. Grouped by category. Used on the FAQ page and optionally embedded on the Process page.

| Field name | Type | Required | What Staci sees as the description | Notes |
|---|---|---|---|---|
| `question` | string | yes | "The question as a visitor would ask it" | |
| `answer` | Portable Text | yes | "The answer in your voice. You can use paragraphs, lists, and bold." | Configure Portable Text to allow: paragraphs, H4 headers, bullet lists, numbered lists, bold, italic, inline links. No headings above H4. No images. |
| `category` | string with options | yes | "Which group this question belongs in on the FAQ page" | Options: "Pricing & Cost", "The Process", "Logistics", "Service Area", "Getting Started" |
| `displayOrder` | number | yes | "Lower numbers show first within the category" | Validation: integer, min 0 |
| `alsoShowOnProcessPage` | boolean | no | "If checked, this question also appears in the FAQ block at the bottom of the Process page" | Default: false. Used to handle the dedupe rule: FAQ page shows everything, Process page shows only the questions you check here. |

**Studio preview:**
- Title: `question`
- Subtitle: `category` · order #
- Sort: by `category`, then `displayOrder`

---

## 4. `philosophyPoint`

**Purpose:** The values shown on the About page (currently three: "Your Vision First," "Spaces That Last," "The Details Matter"). Designed to easily add a fourth if Staci wants.

| Field name | Type | Required | What Staci sees as the description | Notes |
|---|---|---|---|---|
| `title` | string | yes | "Short name for this value. Example: 'Your Vision First'" | |
| `description` | text | yes | "One or two sentences explaining the value" | |
| `displayOrder` | number | yes | "1, 2, 3 for left-to-right order on the About page" | |

**Studio preview:**
- Title: `title`
- Subtitle: order #

---

# Mid-tier types

## 5. `service`

**Purpose:** The paid offerings (In-Home Consultation, Full Room Design, Full Room Design + Styling, Shopping & Sourcing, Builder & Realtor Partnerships). Used by both the Services page and the Homepage services grid.

| Field name | Type | Required | What Staci sees as the description | Notes |
|---|---|---|---|---|
| `name` | string | yes | "Service name as shown publicly. Example: 'In-Home Consultation'" | |
| `slug` | slug | yes | "URL-friendly version of the name (auto-generated, used for linking)" | Generated from `name`, editable |
| `price` | string | yes | "How the price displays. Examples: '$150' / 'starting at $650' / 'Custom quote'" | Free text so you can phrase it however reads cleanest |
| `priceNumeric` | number | no | "Internal field for sorting and filtering. Leave blank for custom-quoted services." | Hidden from card display |
| `shortDescription` | text | yes | "One or two sentences for the service card (max ~200 characters)" | Validation: max 200 |
| `features` | array of strings | yes | "What's included in this service. Each line is one feature." | Drag to reorder |
| `bestFor` | text | yes | "One sentence describing the ideal client for this service" | |
| `longDescription` | Portable Text | no | "Longer detail block shown lower on the Services page. Optional." | Portable Text config: paragraphs, bold, italic, lists. |
| `displayOrder` | number | yes | "Order shown on the Services page and homepage. Lower numbers first." | |
| `showOnHomepage` | boolean | yes | "If checked, this service appears in the homepage services grid. Uncheck for services you only want on the Services page." | Default: true. Builder/Realtor Partnerships defaults to false. |
| `ctaLabel` | string | no | "Text on the button for this service" | Default: "Start a Conversation" |

**Studio preview:**
- Title: `name`
- Subtitle: `price` · order #
- Media: first letter or icon
- Sort: by `displayOrder`

---

## 6. `processStep`

**Purpose:** The numbered steps in Staci's process (currently 4: Consultation, Design Plan, Shopping + Selections, Styling + Reveal). Used on the Process page and the Homepage process preview.

| Field name | Type | Required | What Staci sees as the description | Notes |
|---|---|---|---|---|
| `stepNumber` | number | yes | "Step number (1, 2, 3, 4)" | Validation: integer, min 1, max 9 |
| `title` | string | yes | "Step name. Example: 'In-Home Consultation'" | |
| `timeEstimate` | string | yes | "How long this step takes. Example: 'Single visit' or '2 to 3 weeks'" | |
| `shortDescription` | text | yes | "One sentence for the homepage process preview (max ~200 characters)" | Used on Homepage only |
| `fullDescription` | Portable Text | yes | "Full description shown on the Process page. Multiple paragraphs OK." | Portable Text config: paragraphs, lists, bold, italic |
| `features` | array of strings | no | "Quick bullets shown next to the step. Example: '60 to 90 minutes', 'In your home'" | |
| `tierNote` | string | no | "If this step is conditional on tier, explain. Example: '*Included with Full Room Design + Styling'" | |
| `relatedServices` | array of refs to `service` | no | "Which services this step applies to (optional, used for cross-linking)" | |

**Studio preview:**
- Title: `stepNumber`. `title`
- Subtitle: `timeEstimate`
- Sort: by `stepNumber`

---

# Complex types

## 7. `project` (case study)

**Purpose:** The case studies Staci publishes. Launch with 1 to 2, add more as projects complete. Designed for a project-story narrative, not room-type categorization.

| Field name | Type | Required | What Staci sees as the description | Notes |
|---|---|---|---|---|
| `title` | string | yes | "Project name. Example: 'Fishers ranch refresh'" | |
| `slug` | slug | yes | "URL-friendly version (auto-generated)" | Generated from `title`, editable |
| `location` | string | yes | "Where the project was. Example: 'Fishers, IN'" | |
| `roomType` | string with options | yes | "Type of space" | Options: "Living room", "Bedroom", "Kitchen", "Dining room", "Office", "Whole home", "Multiple rooms", "Other" |
| `designStyle` | string with options | yes | "Primary style of the finished space" | Second portfolio filter axis. Options: Modern traditional, Transitional, Modern coastal, Modern farmhouse, Modern organic, Eclectic, Mid-century, Other |
| `year` | number | yes | "Year the project was completed" | Validation: 4-digit year, min 2024 |
| `heroImage` | image (hotspot enabled) | yes | "Main project photo. This is what shows on the portfolio grid." | Hotspot/crop enabled |
| `briefSummary` | text | yes | "One-sentence summary for the portfolio grid card (max ~200 characters)" | Validation: 60 to 200 characters |
| `briefLine` | string | yes | "What the client came in with. Example: 'Beautiful reno but the family room felt unfinished.'" | Validation: max 160. Renders in the ProjectMetaBand |
| `designCall` | string | yes | "Staci's design move in response." | Validation: max 160. Renders in the ProjectMetaBand |
| `introStory` | Portable Text | yes | "Tell the story of the project: the brief, the approach, the result." | Portable Text config: paragraphs, H3, lists, bold, italic, blockquote, inline images. |
| `gallery` | array of images (hotspot) | yes (min 3) | "The main set of project photos, beyond the cover. Add at least 3, ideally 4 to 8." Labeled **Project photos** in Studio | Validation: min 3. Sits directly under the hero. Each image has required `alt` + optional `caption` |
| `beforeAfters` | array of `beforeAfterPair` objects | no | "Optional before/after image pairs" | See `beforeAfterPair` below |
| `servicesUsed` | array of refs to `service` | no | "Which services were used on this project" | |
| `relatedTestimonial` | reference to `testimonial` | no | "If a client testimonial relates to this project, link it" | |
| `displayOrder` | number | no | "Lower numbers show first in the portfolio. Leave blank to sort by year." | |
| `publishedAt` | datetime | yes | "The date shown on the project and the portfolio sort key. To publish later, use the Schedule publish action." | Default: now. The field does not gate go-live; scheduling is via Sanity's Schedule publish action |

_Core authoring fields shown above. The live schema in `studio/schemaTypes/project.ts` is authoritative and also includes optional `metaTitle`, `metaDescription`, `featured`, and `stickyCtaLabel`._

**Embedded object: `beforeAfterPair`**
| Field | Type | Required | Description |
|---|---|---|---|
| `beforeImage` | image | yes | "Photo of the space before" |
| `afterImage` | image | yes | "Photo of the same view, after" |
| `caption` | string | no | "Optional caption explaining what changed" |

**Studio preview:**
- Title: `title`
- Subtitle: `location` · `year`
- Media: `heroImage`
- Sort: by `publishedAt` descending (newest first)

---

# Page singletons

These are the document types that represent each page. Each is a singleton (only one instance). Each pulls in the content collections via references where appropriate.

## 8. `homePage` (singleton)

| Field | Type | Description |
|---|---|---|
| `seoTitle` | string | Browser tab title and search result title. Default: "Reid Design LLC — Plainfield Interior Design." |
| `seoDescription` | text | Search result description. ~155 characters. |
| `heroEyebrow` | string | Small label above headline. Default: "Plainfield Interior Design · Serving Greater Indianapolis." |
| `heroHeadline` | string | Main hero headline. Default: "Warm, Livable Spaces That Feel Like Home." |
| `heroSubhead` | text | Sub-text under headline. |
| `heroImage` | image (hotspot) | Background image for hero. |
| `heroPrimaryCta` | `ctaBlock` object | Primary CTA button (label + link). |
| `heroSecondaryCta` | `ctaBlock` object | Secondary CTA button. |
| `meetStaciPhoto` | image (hotspot) | Photo of Staci shown in the intro section. |
| `meetStaciHeadline` | string | Headline for the intro section. |
| `meetStaciContent` | Portable Text | Intro paragraphs in Staci's voice. |
| `meetStaciCta` | `ctaBlock` | "Get to Know Me" button. |
| `processPreviewHeadline` | string | Headline for the process preview block. |
| `processPreviewEyebrow` | string | Eyebrow label. Default: "How It Works." |
| `processPreviewCta` | `ctaBlock` | Link to full Process page. |
| `featuredTestimonial` | ref to `testimonial` | The large pull-quote at the top of testimonial section. |
| `testimonialsHeadline` | string | Headline for the testimonials grid. Default: "Words from real homes." |
| `testimonialsEyebrow` | string | Eyebrow label. Default: "Kind Words." |
| `testimonialsToShow` | array of refs to `testimonial` | Which testimonials show in the grid (in order). |
| `servicesGridHeadline` | string | Headline for the services teaser block. |
| `servicesGridEyebrow` | string | Default: "Reid Design." |
| `servicesGridSubhead` | text | Short tagline under headline. |
| `servicesGridCta` | `ctaBlock` | "Message Me to Get Started" or similar. |
| `serviceAreaCue` | string | Optional one-line service area mention. Example: "Serving Plainfield, Indianapolis, and the surrounding suburbs." |
| `finalCta` | `ctaBlock` | Final CTA section button. |
| `finalCtaHeadline` | string | Default: "Ready to Love Your Space?" |
| `finalCtaSubhead` | text | Default: "Let's start with a conversation." |

**Note:** Services shown in the services grid are pulled from all `service` documents where `showOnHomepage` is true, in `displayOrder`. Process steps are pulled from all `processStep` documents in `stepNumber` order. Staci doesn't pick these per page, they auto-update.

---

## 9. `aboutPage` (singleton)

| Field | Type | Description |
|---|---|---|
| `seoTitle` | string | |
| `seoDescription` | text | |
| `heroEyebrow` | string | Default: "The Designer." |
| `heroHeadline` | string | Default: "People Hire People." |
| `heroSubhead` | text | Default: "Here's who you'd be working with." |
| `storyEyebrow` | string | Default: "My Story." |
| `storyHeadline` | string | Default: "Why I Started Reid Design." |
| `storyContent` | Portable Text | Full origin story. |
| `staciPhoto` | image (hotspot) | Portrait. |
| `staciAttribution` | string | Default: "Staci Perkins · Founder, Reid Design LLC." |
| `backgroundLine` | text | Single sentence with real credentials. Per audit, must be accurate, not aspirational. |
| `serviceAreaMention` | string | Single line mentioning service area on About. |
| `philosophyHeadline` | string | Optional headline above values. |
| `philosophyEyebrow` | string | Optional eyebrow. |
| `finalCta` | `ctaBlock` | |
| `finalCtaHeadline` | string | Default: "Ready to Start?" |
| `finalCtaSubhead` | text | |

**Note:** Philosophy values are pulled from all `philosophyPoint` documents in `displayOrder`, not configured per page.

---

## 10. `processPage` (singleton)

| Field | Type | Description |
|---|---|---|
| `seoTitle` | string | |
| `seoDescription` | text | |
| `heroEyebrow` | string | Default: "The Process." |
| `heroHeadline` | string | Default: "From First Call to Final Reveal." |
| `heroSubhead` | text | |
| `faqSectionHeadline` | string | Default: "Things People Ask Before We Start." |
| `faqSectionEyebrow` | string | Default: "Common Questions." |
| `finalCta` | `ctaBlock` | |
| `finalCtaHeadline` | string | Default: "Have questions before we start?" |
| `finalCtaSubhead` | text | |

**Note:** Process steps pull from all `processStep` documents in `stepNumber` order. FAQ items shown on this page pull from all `faqItem` documents where `alsoShowOnProcessPage` is true, in `displayOrder` within their categories.

---

## 11. `servicesPage` (singleton)

| Field | Type | Description |
|---|---|---|
| `seoTitle` | string | |
| `seoDescription` | text | |
| `heroEyebrow` | string | Default: "What We Offer." |
| `heroHeadline` | string | Default: "Design Services for Every Space and Stage." |
| `heroSubhead` | text | |
| `servicesListHeadline` | string | |
| `servicesListSubhead` | text | |
| `builderRealtorSection` | object | See below |
| `serviceAreaSection` | object | See below |
| `finalCta` | `ctaBlock` | |
| `finalCtaHeadline` | string | |
| `finalCtaSubhead` | text | |

**Embedded object: `builderRealtorSection`**
| Field | Type | Description |
|---|---|---|
| `eyebrow` | string | Default: "For Professionals." |
| `headline` | string | Default: "Builder & Realtor Partnerships." |
| `description` | Portable Text | Invitation copy (soft framing per audit). |
| `forBuildersText` | text | |
| `forRealtorsText` | text | |
| `forContractorsText` | text | |
| `cta` | `ctaBlock` | |

**Embedded object: `serviceAreaSection`**
| Field | Type | Description |
|---|---|---|
| `eyebrow` | string | Default: "Service Area." |
| `headline` | string | Default: "Travel for Out-of-Area Projects." |
| `description` | text | Lead paragraph about Plainfield-anchored area. |

**Note:** Services list pulls from all `service` documents in `displayOrder`, not configured per page. Travel fee tiers pull from `siteSettings.travelFees`.

---

## 12. `faqPage` (singleton)

| Field | Type | Description |
|---|---|---|
| `seoTitle` | string | |
| `seoDescription` | text | |
| `heroEyebrow` | string | Default: "Common Questions." |
| `heroHeadline` | string | Default: "Everything You Want to Know." |
| `heroSubhead` | text | |
| `categoryOrder` | array of strings | The order categories display. Drag to reorder. Default: Pricing & Cost, The Process, Logistics, Service Area, Getting Started. |
| `finalCta` | `ctaBlock` | |
| `finalCtaHeadline` | string | Default: "Just ask." |
| `finalCtaSubhead` | text | |

**Note:** FAQ questions auto-populate from all `faqItem` documents, grouped by `category` in the order specified in `categoryOrder`, sorted by `displayOrder` within each category.

---

## 13. `contactPage` (singleton)

| Field | Type | Description |
|---|---|---|
| `seoTitle` | string | |
| `seoDescription` | text | |
| `heroEyebrow` | string | Default: "Request a Consultation." |
| `heroHeadline` | string | Default: "Start the Conversation." |
| `heroSubhead` | text | |
| `formIntroNote` | text | Pre-submit expectation note. Per audit. |
| `whatToExpectHeadline` | string | Default: "When you submit this form..." |
| `whatToExpectContent` | Portable Text | The "no automated sequence" copy. |
| `schedulingLink` | url | Calendly or similar scheduling link, per Nathan's call. |
| `schedulingLinkLabel` | string | Default: "Schedule a 20-minute discovery call." |
| `availabilityNote` | string | Optional override of the `siteSettings.availabilityStatus` field. Usually leave blank. |

**Note:** Email, social links, and service area pull from `siteSettings`. Form field options (project types) are wired up in the Astro form component, not configurable from Sanity, because they need to match the actual services exactly.

---

# Reusable object types

## 14. `ctaBlock`

**Purpose:** A reusable "button + link" structure embedded in pages wherever a CTA appears.

| Field | Type | Required | Description |
|---|---|---|---|
| `label` | string | yes | "Button text" |
| `linkType` | string with options | yes | "Internal page or external URL" — options: "Internal page", "External URL", "Email", "Phone" |
| `internalLink` | reference to any page singleton | conditional | "Page to link to" (shown only if linkType is Internal page) |
| `externalUrl` | url | conditional | "Full URL" (shown only if linkType is External URL) |
| `emailAddress` | string | conditional | "Email address" (shown only if linkType is Email) |
| `phoneNumber` | string | conditional | "Phone number" (shown only if linkType is Phone) |
| `openInNewTab` | boolean | no | "Open in a new tab" — default false |

---

# Studio configuration notes

For the build project to implement in `sanity.config.ts` and `structure.ts`:

**Desk structure:**
```
Reid Design Studio
├── Site Settings (singleton, pinned)
├── ──────────
├── Pages
│   ├── Home
│   ├── About
│   ├── Process
│   ├── Services
│   ├── FAQ
│   └── Contact
├── ──────────
├── Content
│   ├── Services
│   ├── Process Steps
│   ├── Testimonials
│   ├── FAQ Items (grouped by category in the list view)
│   ├── Projects
│   └── Philosophy Values
```

**Studio plugins to enable:**
- `structureTool` (default Studio interface)
- `visionTool` (GROQ query playground for Nathan to debug)
- `media` plugin (better media library)

**Studio plugins to consider:**
- `presentationTool` (split-screen preview pane) — only if we wire up live preview in the Astro project
- `documentInternationalizationTool` — not needed, US-only site

**Singleton enforcement:**
For each singleton (`siteSettings` and the six page singletons), exclude them from the standard "+" menu and the document creation menu so editors can't accidentally create duplicates. Standard pattern in Sanity v5.

---

# Type generation setup

In the Astro build project, run `sanity typegen generate` to generate TypeScript types from the schemas. This produces a file (typically `sanity.types.ts`) that the Astro queries can import for full type safety on query results.

Setup checklist for the build project:
- Install `@sanity/codegen` (or use the `sanity` CLI if it includes typegen — version-dependent)
- Configure `sanity-typegen.json` with paths to the schema files
- Add `npm run typegen` script
- Wire typegen into the build pipeline (or pre-commit hook)

---

# Phase 5 deliverables checklist

For when the build project starts:

- [ ] Translate each schema spec above into a TypeScript file in `studio/schemaTypes/`
- [ ] Configure Studio Desk structure per the layout above
- [ ] Enforce singletons for `siteSettings` and page singletons
- [ ] Configure Portable Text styles per the per-field notes
- [ ] Set up Sanity TypeGen
- [ ] Seed `siteSettings` with the locked content (email, service areas, travel fees, etc.)
- [ ] Validate the Studio editor experience by having Staci edit a test document type before going further

---

# Open items for Phase 3+ (extraction and beyond)

These don't block schema implementation but affect what content lands in the schemas:

- Confirm exact wording of Plainfield-first eyebrow on homepage
- Staci's one-sentence credentials line (for About `backgroundLine`)
- Trade vendor accuracy review (if any vendors get named anywhere)
- Final headshot decision (current vs. new shoot)
- Calendly account setup and link for `contactPage.schedulingLink`
- First 1 to 2 case studies content (photos, story, before/after if applicable)

---

*Last updated: May 26, 2026*

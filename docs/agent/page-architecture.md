# Page architecture

> Page/section order, the home-page conversion logic, header nav, and the section-visibility toggle system.

## Page architecture

The home page section order is conversion-tuned (reordered 2026-05): visual proof and social proof come early, price transparency mid-funnel, the long-read journal sits late for visitors in research mode. Don't reorder without a conversion reason. If a section's content isn't ready yet, build a placeholder block in the right slot.

**Home page** (in render order):
1. Hero (Plainfield-first eyebrow, headline, two CTAs, background image)
2. Meet Staci (photo, intro copy, CTA to About)
3. Featured Work (auto-populated — hero project + companion panel; visual proof, the hook)
4. Kind Words (1 featured testimonial + 6 grid testimonials; social proof, early)
5. How It Works (4-step process preview, CTA to Process)
6. How Reid Design Can Help (4 services with prices, CTA to Contact)
7. Featured Journal (auto-populated — hero entry + companion panel; depth for considerers)
8. Service area cue line (Plainfield-first)
9. Final CTA (full-bleed)
10. Footer

**Why this order** (the conversion logic, so a future edit doesn't "tidy" it back): Staci is a solo practitioner in a small market with a $150 entry point, so trust is the friction, not price. Lead with the work (visual proof) and testimonials (social proof) while intent is forming; put process + pricing once they're warm; hold the journal for last as the "this designer thinks deeply" signal for research-mode visitors. Kind Words sits directly after Featured Work on purpose — "here's the work / here's what clients said" reads as one persuasive beat.

**Background cadence**: sections alternate `bg-background` / `bg-muted` so no two adjacent sections share a surface. Featured Work and Featured Journal are both `surface-warm bg-muted`; the one unavoidable muted/muted seam (Featured Journal into the Service-area cue) is bridged by the bronze `SectionDivider`. If you reorder, re-check the cadence — the `bg-background` on the Services section exists specifically to keep the alternation clean after Kind Words moved above How It Works.

**Featured Work + Featured Journal** pull the most-relevant 4 projects + 4 journal entries from Sanity, ordered featured-first (`featured: true` pinned to the top) then by publish date. Both suppress entirely when the collection is empty, and degrade to a centered single-hero spread (`max-w-4xl`, wide `16/10` aspect) when there's only one item. With companions they render as a two-column grid: a full-bleed hero card (image fills via `lg:h-full` + a `min-h` floor so it's always flush with the right column, never leaving a `bg-card` strip) beside a single **cohesive companion panel** — one card, one bronze stripe, one shadow, with each project/post as a row split by hairline dividers and a per-row hover tint. The panel fills the column (`lg:h-full`) and distributes rows with `flex-1` so its bottom lines up with the hero. Editor controls eyebrow / headline / subhead / CTA via the `homePage` singleton's `featuredWork*` + `featuredJournal*` field groups; section headings are center-aligned to match the rest of the page.

**Site-wide pages** (6 total, all linked from the primary nav):
- Home (`/`)
- Process (`/process`)
- Services (`/services`)
- FAQ (`/faq`)
- About (`/about`)
- Contact (`/contact`)

Each page is a Sanity singleton document (`homePage`, `processPage`, etc.) plus auto-populated content from reusable collections (services, testimonials, FAQs, process steps, philosophy points). The structure of each page is fixed in code; the content within each section is editable in Sanity.

**About page** (in render order):
1. Hero
2. Story
3. Philosophy cards
4. Personal ("off the clock" section from `AboutPersonal.astro`; hides when all modules are empty)
5. Press strip
6. Stats (count-up figures from `StatsRow.astro`; hides when `aboutPage.stats` is empty)
7. Final CTA

Now also live (built during placeholder-content phase):
- Portfolio index (`/portfolio`) and individual project pages (`/portfolio/[slug]`) — schema + 3 placeholder projects (now prefixed `[SAMPLE: delete before launch]` in the seeder, no photos; delete or replace before cutover). Real projects require at least 3 photos.
- Journal/blog (`/journal` index, `/journal/[slug]` post) — flexible `journalEntry` schema with seven custom inline block types (pullQuote, beforeAfter, sourceCard, tipCallout, imageGallery, divider, videoEmbed) plus standard Portable Text. Categories live in `journalCategory` taxonomy
- E-Design — seeded as a 6th `service` document with `showOnHomepage: false`; appears on `/services` only

### Section visibility

Optional sections of the site can be turned on or off without touching code. The system is designed so the live site is completely unchanged until a toggle is explicitly set to off.

**Schema.** `siteSettings` has a `sectionVisibility` object field in a dedicated `'visibility'` field group. It contains ten boolean fields with `initialValue: true`: `showPortfolio`, `showJournal`, `showShop`, `showEDesign`, `showGiftCertificates`, `showPress`, `showResources`, `showGuides`, `showStyleQuiz`, `showBudgetCalculator`.

**Helper.** `src/lib/sectionVisibility.ts` exports `getSectionVisibility(raw)`, which converts the raw Sanity object into a flat `SectionVisibility` map of plain booleans. The critical rule is `value !== false`: undefined, null, or true all produce `true` (visible). Only an explicit `false` produces `false` (hidden). This rule is what makes new sites safe to deploy before content is ready.

**What "off" does.** When a toggle is off, the section disappears everywhere simultaneously:
- Removed from the desktop nav (`Header.astro`) and mobile drawer (`MobileNav.tsx`)
- Removed from the footer link columns (`Footer.astro`)
- Removed from the homepage: Featured Work block (portfolio), Featured Journal block (journal), PressStrip (press)
- Removed from the About page PressStrip (press)
- The section's own index page (`/portfolio`, `/journal`, `/shop`, `/e-design`, `/gift-certificates`, `/press`, `/resources`, `/guides`, `/quiz`, `/calculator`) redirects home via `return Astro.redirect('/')` at the top of the page
- Dynamic detail routes (`/portfolio/[slug]`, `/journal/[slug]`, `/guides/[slug]`) return an empty array from `getStaticPaths()` so they build zero pages and 404

**What stays on always.** Home, About, Process, Services, FAQ, Contact, Privacy, and 404 are not gated by visibility toggles. They are always built and always accessible.

**Draft safety.** Turning a section off does not delete or unpublish any content in Sanity. Drafts and published documents are untouched. Turning it back on makes everything reappear after the next rebuild (roughly 1 to 3 minutes).

Header nav uses a grouped structure (reorganized in the conversion build to hold the new offerings + capture tools without crowding the row). Flat links plus two dropdown groups, left to right: **Home / Portfolio / Services ▾ / Shop / Resources ▾ / About**.
- **Services ▾** → Services, E-Design, Process, Gift Certificates
- **Resources ▾** → Style Quiz, Cost Calculator, Guides, FAQ, Journal

"Contact" is intentionally NOT in the primary nav — the "Book a consultation" CTA pill at the right of the nav row handles that conversion, and the mobile drawer surfaces the CTA at the top of the menu. The structure is defined once as `NAV_ITEMS` in `src/components/Header.astro` (each item is `{ kind: 'flat' }` or `{ kind: 'dropdown', items: [...] }`) and shared with `MobileNav.tsx` so desktop + mobile stay in sync.

**Desktop nav is server-rendered (do NOT regress this).** The desktop nav renders entirely in `Header.astro` as Astro/SSR markup: flat items are real `<a>` tags, dropdown groups are native `<details>`/`<summary>` disclosures with the child links as real `<a>` tags inside. Everything is present in the server HTML at build time, so search-engine crawlers see every internal link and there is no flash-of-missing-nav (or CLS) before any JS runs. A small progressive-enhancement `<script>` at the bottom of `Header.astro` layers on open-on-hover, close-on-outside-click, close-on-Escape, and close-on-navigation (re-bound on `astro:page-load`, document-level listeners guarded by a `window.__headerNavBound` flag so they don't stack across View Transitions). The nav is fully functional with JS disabled. An earlier version hydrated a `NavDropdowns.tsx` React island with `client:only="react"`, which left the ENTIRE desktop nav (including the flat links) out of the server HTML — bad for SEO and CLS. That island was removed; if a future change reintroduces a Radix dropdown island here, keep the flat links and the group structure SSR'd and use the island only for the open/close interaction. The `<summary>` triggers carry `.nav-underline` and get `aria-current="page"` (which locks the underline wide) when one of their children is the active route, matching the flat-link pattern.

**Header breakpoint is `lg:` (1024 px), not `md:` (768 px).** Between md and lg the desktop nav + Book a Consultation CTA cram the seven nav items against the logo and visibly squish the wordmark. Bumping the breakpoint means tablet / narrow-laptop widths see the centered-logo + hamburger layout, and the desktop layout only appears once there's actual room for it. Affects every `md:`/`lg:` toggle in Header.astro and MobileNav.tsx's hamburger wrapper.

Mobile header also carries an **availability indicator pill** on the left side (mirroring the hamburger menu's absolute-right placement) — a pulsing green dot + "Open" label that links straight to `/contact`. Renders only when `siteSettings.availabilityStatus` is set. The pill stays visible at every mobile width because its h-9 compact size doesn't collide with the centered logo even at 320 px.

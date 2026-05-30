# About + Contact polish, and an editable Start Here guide

Date: 2026-05-29
Status: approved design, ready for implementation plan

## Why this exists

Three things came up after the conversion build-out landed:

1. The contact form's lead-source list predates the new capture tools (style quiz, free guides), so Staci can't see which of those new front doors actually drives inquiries.
2. The numbers on the About page philosophy cards read out of sequence ("backwards").
3. The About page is well-built but reads as all-designer, no-person. Research on service-business About pages is consistent: lead with the real human, conversational first-person voice, skimmable, authentic. People hire people.

A fourth item was folded in during design: make the Start Here handbook editable in Sanity so the guide can be refined without a code deploy.

Everything here must stay editable by Staci in Sanity, and the live site must be unchanged until content is actually added (each new block self-hides when empty).

## Workstream A — Contact form dropdowns

**Lead-source list.** Add two options that reflect the new funnel, grouped with the other "engaged with our content" sources:

> Google search · Instagram · Facebook · Houzz · Friend or family referral · Builder or realtor referral · **Took the style quiz** · **Downloaded a free guide** · Reading the journal · Saw a project in person · Other

**Project-type list.** Already current in code (`In-Home Consultation · E-Design · Full Room Design · Full Room Design + Styling · Shopping & Sourcing · Builder or Realtor Partnership · Gift Certificate · Not sure yet`). No code change. The risk is a stale value sitting in the live Sanity `contactPage.formProjectTypeOptions`, which would override the good code default. Sync the current list into Sanity so the two agree.

**Files.**
- `src/components/ContactForm.tsx` — add the two new entries to `SOURCE_OPTIONS`.
- `scripts/patch-contact-form-options.mjs` — extend to also cover `formProjectTypeOptions` and the refreshed `formSourceOptions`. Keep the "only set when missing/empty" guard for the existing four, but force-set `formSourceOptions` and `formProjectTypeOptions` to the current canonical list so the live doc can't stay stale.

**Acceptance.** The live contact form shows the two new sources and the full current project-type list, in both light and dark, on mobile and desktop. Clearing the Sanity fields still falls back to the code defaults.

## Workstream B — About card numbering

**Cause (confirmed).** The three philosophy cards are sorted by the drag order Staci sets in Studio (`orderRank`, via the orderable-document-list plugin) but numbered by a separate `displayOrder` field. When the two disagree, the numbers show out of order. `getAboutPage` orders by `order(orderRank asc, displayOrder asc)`; the card prints `point.displayOrder`.

**Fix.** Number each card by its rendered position, so they always read 01 / 02 / 03 in whatever order they appear. One change in `src/pages/about.astro`: the numeral becomes `String(idx + 1).padStart(2, '0')` instead of `point.displayOrder ?? idx + 1`.

**Schema cleanup.** In `studio/schemaTypes/philosophyPoint.ts`, reword the `displayOrder` description to say the cards are ordered by dragging them in the Philosophy Values list and the numbers are automatic, and drop the `.required()` rule so the field is clearly optional. Keep the field so the existing GROQ `displayOrder` fallback still resolves. No data migration.

**Acceptance.** The cards read 01 / 02 / 03 top-to-bottom regardless of drag order or stored `displayOrder` values.

## Workstream C — About page "personal" section

A new section after Philosophy and before the press strip, rendered by a new `src/components/AboutPersonal.astro` so `about.astro` stays readable. Editable eyebrow + headline (placeholders: "Off the Clock." / "A little more about me."), optional intro line. Four modules, each self-hiding when empty; the whole section hides if all are empty.

**New `aboutPage` fields (group `personal`):**
- `personalEyebrow` (string), `personalHeadline` (string), `personalIntro` (text, optional)
- `currentlyList` — array of `{ label, value }`. Liner-notes list: `Reading → …`, `Listening to → …`, `Can't stop sourcing → …`, `Loving right now → …`.
- `rapidFire` — array of `{ prompt, answer }`. Small Q&A grid: `Coffee order → …`, `Can't-live-without piece → …`, `Sunday looks like → …`.
- `localSpots` — array of `{ name, note }` (note optional). `Cunningham's, Plainfield → best patio in town`.
- `beyondDesign` — `text` block (casual prose) plus `candidPhoto` (image, hotspot, required alt).

**Layout.** SectionHeading with eyebrow on an alternating background, brand stripe, light cards readable in both themes, skimmable per the research. Currently list and the candid photo can sit side by side; rapid-fire as a compact grid; local spots as a tidy list.

**Query.** Extend `getAboutPage` in `src/lib/queries.ts` to project the new fields, using the existing `IMAGE_PROJECTION` for `candidPhoto`.

**Placeholder content.** Seed gentle placeholders in Staci's voice (warm, plain, no em-dashes, no designer-speak) so the section renders as a starting point. Same approach as earlier phases.

**Acceptance.** Section renders with seeded placeholders, every module hides when its field is cleared, Lighthouse stays 100 on About, both themes and viewports verified.

## Workstream D — Editable Start Here guide

Make the guide prose and the Business Overview static notes editable in Sanity. Brand Kit stays code-driven on purpose (its colors and fonts mirror the real `globals.css` tokens; a Sanity copy could silently drift from the site).

**Two new protected singletons.**

`studioGuide` (drives the "How the website works" panel):
- `guideTitle` (string), `guideIntro` (Portable Text: the welcome line under the title). The "most important thing to know" note lives in `tips` as a primary-tone entry.
- `studioMap` — array of `{ area, description }` (Site Settings / Pages / Content / Journal)
- `howTos` — array of `{ title, steps: string[] }` (number is automatic from position)
- `tips` — array of `{ heading, tone, body }` where `tone` is one of default / primary / caution / positive (the valid @sanity/ui Card tones; matches today's usage: primary for the most-important note, caution for SEO hints, positive for "stuck", default for the rest), `body` is Portable Text. Covers the most-important note, photo tips, launching in stages, schedule a publish, leaving comments, SEO hints, stuck.

`studioNotes` (drives the static part of "Your business at a glance"):
- `businessSummary` (Portable Text), `idealClient` (Portable Text), `voiceSummary` (Portable Text), `wordsToAvoid` (string[]).

Both are singletons, excluded from Canvas (`options.canvasApp.exclude: true`), and protected from delete/duplicate/unpublish via the existing SINGLETON_TYPES machinery.

**Renderers.** `StudioGuide.tsx` and `BusinessOverview.tsx` fetch their singleton via `useClient` (the pattern `BusinessOverview` already uses for live data) and render Portable Text with `@portabletext/react`. `BusinessOverview` keeps its existing live services + site-settings fetches; only its three static sections move to `studioNotes`. Each section degrades gracefully (renders nothing) if a field is empty, and a loading + error card mirrors the current behavior.

**Editing surface.** In `studio/structure.ts`, the two Start Here items become real documents with two views each: the rendered component view (read) plus the form view (edit), mirroring the form + preview pattern the page singletons use. Staci reads the pretty panel; Nathan edits in the form tab. Add `studioGuide` + `studioNotes` to `SINGLETON_TYPES` and `HIDDEN_FROM_DEFAULT` in `structure.ts`, and to `SINGLETON_TYPES` in `sanity.config.ts`. `urlForDoc` returns null for both (no live page), so no preview iframe is attached.

**Seeder.** `scripts/seed-studio-guide.mjs` writes both singletons from the content currently hardcoded in the two components, so there is zero content regression. Idempotent (set-if-missing).

**Acceptance.** Both panels render identically to today after seeding, edits to the singletons change the panels with no Studio redeploy, Brand Kit is unchanged, and the singletons can't be duplicated or deleted.

## Schema change summary (all additive or loosening)

- `aboutPage`: new `personal` group + fields. Additive.
- `philosophyPoint`: `displayOrder` becomes optional, description reworded. Loosening only.
- `studioGuide`, `studioNotes`: new singleton types. Additive.
- `contactPage`: no schema change (data-only sync).

No existing field is removed or retyped, so no live content is at risk. After schema edits: `npm run typegen`, then `npm run studio:deploy`, then commit.

## Build, verify, deploy

1. Schema + query + component + page edits.
2. `npm run typegen` (regenerate Sanity types).
3. Run the seeders (about personal placeholders, studio guide/notes, contact option sync).
4. `npm run build` to confirm a clean static build.
5. Visual verification via Playwright MCP: About page and contact form, both themes, mobile + desktop. Studio panels checked via `npm run studio:dev`.
6. Lighthouse on `/about` to hold the 100s.
7. `npm run studio:deploy`.
8. Update CLAUDE.md / OPERATIONS.md to document the new About fields, the numbering rule, and the editable Start Here singletons.

## Out of scope

- No payment processing (gift certificates and shop stay inquire/affiliate).
- Brand Kit stays code-driven (intentional).
- No DNS cutover; pushes update the workers.dev staging build only.
- No changes to the live source-of-truth design tokens.

## Risks

- Studio component views reading a not-yet-seeded singleton must render a clean empty/loading state, never a crash. The seeder removes this window in practice, but the components still guard for it.
- Keep the ContactForm code defaults and the Sanity values in sync; the seeder is the mechanism, and the in-code list stays the fallback.

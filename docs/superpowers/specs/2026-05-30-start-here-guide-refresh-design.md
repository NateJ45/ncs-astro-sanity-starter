# Start Here Guide Refresh (Phase 1): Design Spec

**Date:** 2026-05-30

**Context:** This is Phase 1 of a two-phase effort to bring Staci's in-Studio guidance current. Phase 1 (this spec) refreshes the website-operation docs. Phase 2 (separate spec, later) builds four researched professional-development guides as new Studio "Start Here" panels.

## Goal

Make sure Staci's in-Studio "How the website works" guide explains every current website feature and walks her through the remaining one-time setups she needs to finish before launch, and bring the agent-facing markdown docs current with today's changes.

## Decisions (from brainstorming)

- The four professional guides (photography, software/resources, e-design, trade sourcing) are Phase 2, not this spec.
- The setup/launch guide is delivered as content-only grouped how-tos inside the existing `studioGuide` singleton (no schema or component change), not a dedicated new section.
- Part C (setup steps for Web3Forms, Sender, Calendly) gets light web research so the steps are current.
- All editor-facing copy must avoid em-dashes (the studio voice rule; CLAUDE.md scopes the no-em-dash rule to public-facing copy, and Studio content is editor-facing copy).

## Current state

- The "Start Here" handbook is three Studio panels: `StudioGuide.tsx` (reads the `studioGuide` singleton), `BusinessOverview.tsx` (reads `studioNotes`), and `BrandKit.tsx` (hardcoded). Wired under a "Start Here" parent in `studio/structure.ts`.
- `studioGuide` fields: `guideTitle`, `guideIntro`, `studioMap[]` (`mapRow`: area + description), `howTos[]` (`howTo`: title + steps[]), `tips[]` (`tip`: tone + heading + body). Plain text throughout, no Portable Text.
- Content is seeded by `scripts/seed-studio-guide.mjs` via `createOrReplace`. It currently has 4 map rows, 10 how-tos, and 7 tips, all about day-to-day editing.
- `StudioGuide.tsx` renders the arrays as-is, so adding how-tos / tips needs no component change.
- The agent docs (`docs/agent/*.md`, `CLAUDE.md`) were updated inline as each feature shipped today.

## Part A: Agent MD verification and gap-fill

Verify `docs/agent/*` and `CLAUDE.md` reflect today's work; fix gaps. Known likely gaps to check and fix:

- `docs/agent/changelog.md`: add an entry for the CLAUDE.md em-dash-rule scoping (public-facing copy only) if missing.
- `CLAUDE.md`: add `HeroBackground.astro` (and confirm `StatsRow.astro` / `StatsCounter.tsx`) to the component / "Foundation, edit with care" lists if missing.
- Scan for any other stale reference introduced by today's features (FinalCTA background image, hero slideshow). Fix what is found; do not rewrite docs that are already accurate.

This part changes only markdown files. No behavior change.

## Part B: Feature how-tos in `studioGuide`

Add new `howTo` entries to `scripts/seed-studio-guide.mjs`'s `studioGuide` content for features that currently have no guidance, and review the existing 10 for accuracy. New how-tos:

1. **Set up a home-page hero slideshow** - in the Home page, the "Hero images" field; one photo shows a single static hero, two or more cross-fade as a slideshow; drag to order; Publish.
2. **Add a background photo to a page's closing call-to-action** - the "Final CTA background image" field that exists on Home, About, Process, Services, FAQ, E-Design, and Journal; the site darkens it automatically so the text stays readable; leave empty for the plain panel.
3. **Show your numbers on the About page** - the About page "Stats" field (number, suffix, label, up to four); the row stays hidden until filled in.
4. **Fill in your About "off the clock" section** - the About `personal` fields (currently list, rapid fire, local spots, beyond design, candid photo); the section hides until you add a headline.
5. **Add a handwritten accent word to a heading** - the optional script-accent fields on the hero / section headings / Final CTA; one word from the heading, matched exactly, renders in the Pinyon Script font; leave empty to skip.

Also review the existing how-tos and the `studioMap` rows for anything that drifted, and update in place. Keep each how-to in the existing `howTo` shape (title + steps[]).

## Part C: "Finish setting up your site" guide (content-only)

Add a clearly-labeled cluster of setup how-tos plus one orienting tip to the `studioGuide` content. Each how-to ends with what to hand Nathan. Web-research the current signup/setup flow for Web3Forms, Sender, and Calendly so the steps are accurate.

Intro tip (tone `primary` or `positive`): "Before you go live: a few one-time account setups" - explains these are one-time, that some need a key or link handed to Nathan, and that the Nathan-only items are nothing for her to worry about.

Setup how-tos (titles prefixed so they read as a group, e.g. "Setup:"):

1. **Contact form email (Web3Forms)** - create a free Web3Forms account with the studio email, copy the access key, send it to Nathan to connect. (Without it, the contact form cannot deliver.)
2. **Newsletter signups (Sender)** - create a free Sender account, create a signup form / list, copy the form action URL (or the relevant key), send it to Nathan to wire into the footer / capture forms.
3. **Discovery-call booking (Calendly)** - create a Calendly account, set up a 20-minute discovery-call event type, copy the event link, and give it to Nathan to set (the booking link lives in the site config, not in Sanity).
4. **Google Business Profile reviews link** - get the Google Business profile / reviews URL and paste it into Site Settings (drives the "Read more on Google" link and the reviews note).
5. **Social links** - put the Instagram and Facebook URLs into Site Settings.
6. **Replace the placeholder content** - swap the `[SAMPLE]` projects, the seeded testimonials, and any placeholder photos for the real thing before launch.

Plus one tip listing the **Nathan-only launch tasks** so Staci knows they are handled and not hers: domain / DNS cutover, environment keys, deploying the site, and analytics.

## Mechanism

- Edit the `studioGuideDoc` content object in `scripts/seed-studio-guide.mjs` (add the new how-tos and tips, tweak existing entries, keep unique `_key`s).
- Re-run `node scripts/seed-studio-guide.mjs`. `createOrReplace` overwrites the live `studioGuide` singleton, so the refreshed panel is live immediately.
- No schema change, so no `npm run typegen` and no `npm run studio:deploy`. No `StudioGuide.tsx` change.
- `studioNotes` (business overview) is left as-is; this is about features, not business facts.

## Caveats / risks

- `createOrReplace` overwrites the whole `studioGuide` document. If Staci hand-edited it in Studio, those edits are replaced. She almost certainly has not, and this is run deliberately. The seed script header already warns not to run during an active editing session.
- All new copy is editor-facing and must be em-dash-free and in the studio voice (warm, plain-spoken, prices plain).

## Out of scope

- The Phase 2 professional handbook (photography, software/resources, e-design, trade sourcing) and any new Studio panels / singletons / components.
- Any change to `studioNotes`, the `studioGuide` schema, or the Studio components.
- Actually wiring Web3Forms / Sender / Calendly into the site (that is Nathan's code/env work; the guide only tells Staci how to get the keys/links).

## Verification

- `node scripts/seed-studio-guide.mjs` runs clean and prints success.
- Query the `studioGuide` singleton back (or open `npm run studio:dev`) and confirm the new how-tos and tips are present and read correctly.
- Re-read the changed agent markdown for accuracy.
- Confirm no em-dashes in any new editor-facing copy.

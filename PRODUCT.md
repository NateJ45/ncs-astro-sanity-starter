# Product

> **PLACEHOLDER, NOT A REAL BRIEF.** This is the starter's neutral design context. It describes no client. A fork replaces every section below with the real project's facts, and deletes this banner when it does. Until then, nothing here is a source of truth about audience, tone or brand: if a design decision seems to depend on this file, stop and get the answer from the client. This is the same trap as CLAUDE.md rule 11 (fork residue): a default that sounds plausible gets shipped as if it were decided. Visual defaults live in `DESIGN.md`.

## Register

brand

(Placeholder. Choose `brand` for marketing and portfolio-style sites, `product` for app-like UI. The starter's page builder is brand-register.)

## Users

[PLACEHOLDER: who visits, in the client's own words. For each group: what they arrive asking, what device they use, and what decision the site helps them make. Keep it to facts the client has confirmed.]

- Primary: [PLACEHOLDER]
- Secondary: [PLACEHOLDER]

TODO(Nathan): decide whether forks should be required to fill this file in during `docs/bootstrap/NEW-PROJECT.md` (and whether `docs/bootstrap/setup-checklist.md` should gain a "PRODUCT.md and DESIGN.md rewritten, banner removed" line). Not done here because only the two new files and a CLAUDE.md pointer were in scope.

## Product Purpose

The starter is an Astro 7, Sanity v6 and Cloudflare Workers site template, page-builder first: the home, about, services and process pages render from Sanity `pageBuilder` arrays through `SectionRenderer`, and any page created in the Studio gets a `/[slug]` route. A project pours in a brand (`brand/brand.config.json`, then `npm run apply-brand`) and its content.

[PLACEHOLDER: what this specific site is for, and what a good visit leads to (a booking, an enquiry, a registration, a read). One or two sentences, and the one conversion that matters.]

## Brand Personality

[PLACEHOLDER: three words and a short paragraph of voice, in the client's terms.]

The starter's neutral baseline, until replaced: warm, conversational and plain; say prices and facts directly; stop when the point is made. No AI-tell vocabulary and no em-dashes in public copy (CLAUDE.md rule 2 and its Style section). Client-specific voice goes in `docs/brand/voice.md`, which is also a blank template.

## Anti-references

[PLACEHOLDER: what the site must not look or sound like, named. Recorded decisions only.]

What the starter itself guards against, because it has bitten real builds:

- Starter defaults showing through on a client site (the neutral Slate palette, Libre Baskerville and Inter, the starter's wordmark and copy). The 2026-09-17 Stone Steps audit found the gap was defaults leaking, not a shortage of ideas.
- Residue from the client build the starter was forked from (logos, names, palettes, business copy): CLAUDE.md rule 11.
- A reference-design look carried between clients. A fork should not read as a sibling of another client's site.

TODO(Nathan): list any "must not look like <other client>" pairs across the site family once they are decided, so forks inherit the constraint. None are recorded in the repo.

## Design Principles

Neutral starter principles, true for every fork until the project adds its own:

1. **One grammar per page.** One left edge, one split, one button family.
2. **Blocks carry no colour.** `SectionRenderer` owns the alternating-surface cadence; editors never choose a background.
3. **Derive, don't retype.** Anything computable from data is computed at build time.
4. **Say it plainly.** Concrete facts and prices beat adjectives.
5. **Survive the editor's content.** Any photo, any headline length, sections reordered.

[PLACEHOLDER: three to five principles specific to this project.]

## Accessibility & Inclusion

The starter's floor, kept for every fork: WCAG AA, with every colour token measured against every surface it appears on (`src/lib/theme-tokens.test.ts` is a gate), an axe sweep and a reflow suite in Playwright, visible focus rings, 44px tap targets, and reduced motion honoured. Detail: `docs/agent/accessibility.md`.

[PLACEHOLDER: client-specific needs (audience age, languages, assistive-technology expectations).]

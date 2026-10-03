<!-- PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file -->

# Design brief template (PRODUCT.md and DESIGN.md compatible)

Step 1 of the flow: **brief** -> references -> design-directions -> reskin.

Fill this in with the client (or from the client's materials) BEFORE running `npm run references`
or `/design-directions`. When it is done, split it into the two files the impeccable skill expects at
the project root, keeping the section names exactly so the skill's `context.mjs` and `document`
flow can parse them:

- Part A becomes **`PRODUCT.md`** (strategic: who, what, why). Shape follows impeccable's
  `init` flow: a `## Register` section, then users and purpose, brand personality, anti-references,
  strategic design principles, accessibility needs.
- Part B becomes **`DESIGN.md`** (visual). Shape follows the Google Stitch DESIGN.md format:
  YAML frontmatter of tokens, then exactly six sections in this order and with these words in the
  headers: `## Overview`, `## Colors`, `## Typography`, `## Elevation`, `## Components`,
  `## Do's and Don'ts`. Do not add other top-level sections. Colour values in the frontmatter are
  hex (that is what `brand.config.json` takes too). Leave part B as the seed stub below until a
  design direction is picked; the `/design-directions` command then fills it in.

Never overwrite an existing PRODUCT.md or DESIGN.md without asking. Delete this instruction block
when you copy the template.

---

# PART A: PRODUCT.md

## Register

<!-- brand = the design IS the product (marketing site, portfolio, church, school).
     product = the design SERVES a tool. Almost every site from this starter is brand. -->

brand

## Client and purpose

- **Client:** <name, what they do, one sentence>
- **Visitors:** <who they are, and what they are doing when they arrive: on a phone after a service,
  at a desk comparing options, in a hurry>
- **The one job of the homepage:** <the single action or understanding that counts as success>
- **Secondary jobs:** <up to three>
- **Must be on the homepage:** <offer, proof, events, donate, booking, location, hours...>

## Brand personality

- **Three words:** <e.g. warm, exact, unhurried>
- **The feeling a visitor leaves with:** <one sentence>
- **Voice:** <one-sentence tone statement; the full guide goes to `docs/brand/voice.md` at reskin>

## References (what to learn from)

Capture with `npm run references -- <url> <url>`; the table lands in `docs/references/README.md`.

| Reference     | What we like (be specific: layout, type, imagery, pacing, copy) |
| ------------- | --------------------------------------------------------------- |
| <url or name> | <e.g. "the huge type-only masthead", not "looks clean">         |
| <url or name> | <...>                                                           |

## Anti-references (what this must not feel like)

| Anti-reference | What we avoid and why                                            |
| -------------- | ---------------------------------------------------------------- |
| <url or name>  | <e.g. "stock-photo hero with a centred call to action; generic"> |

- **Must NOT look like <previous client>.** <Name the last site built from this starter and what
  specifically must not carry over: its hero, nav, section order, card grid, type pairing, imagery.>
- **Generic defaults to avoid:** <e.g. three equal feature cards, gradient blobs, a centred headline
  over a stock photo>

## Accessibility and constraints

- WCAG AA is the floor (contrast 4.5:1 text, visible focus, reduced motion respected).
- <Audience needs: older readers, low bandwidth, screen-reader heavy, print, a second language>
- <Hard constraints: existing logo and colours that cannot change, mandated fonts, legal copy>

## Strategic design principles

<Three to five short rules that decide arguments later, written as "we choose X over Y". Example:
"Words over imagery: the content is the draw, so photography is supporting, never the hero.">

---

# PART B: DESIGN.md (seed stub, fill after a direction is picked)

```
---
name: <client>
description: <one-line tagline>
colors:
  primary: "#000000"
  neutral-bg: "#ffffff"
typography:
  display:
    fontFamily: "<display family>, serif"
  body:
    fontFamily: "<body family>, sans-serif"
rounded:
  md: "<radius, matches brand.config.json radius>"
---

## Overview
<Creative north star, mood, the chosen direction's archetype, density, imagery treatment, and
what it rejects. Link the decision entry in docs/design-directions/<date>-<slug>/README.md.>

## Colors
## Typography
## Elevation
## Components
## Do's and Don'ts
```

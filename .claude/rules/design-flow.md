---
paths:
  - '.claude/commands/design-directions.md'
  - '.claude/skills/reskin/**'
  - 'docs/templates/design-brief.md'
  - 'docs/design-directions/**'
  - 'docs/references/**'
  - 'scripts/capture-references.mjs'
  - 'scripts/screenshot-directions.mjs'
---

# Design flow: brief, references, design-directions, reskin

Loads when you touch the design-exploration files. PORTS.md card 73 has the why.

**The problem.** `brand.config.json` carries palette, fonts, radius and four coarse layout slots (header,
hero, density, cards; card 72). It cannot express section order, nav pattern, imagery treatment or
a bespoke structure, so a site reskinned straight away comes out as the starter's homepage in new colours.
Exploration has to happen BEFORE the reskin and has to force structural difference.

**The order, and what each step leaves behind.**

1. **Brief.** `docs/templates/design-brief.md`, split into `PRODUCT.md` (Part A) and `DESIGN.md`
   (Part B) at the repo root. Part B keeps the Stitch DESIGN.md shape (YAML tokens, then exactly
   Overview, Colors, Typography, Elevation, Components, Do's and Don'ts) so impeccable's `document`
   and `context.mjs` read it. It must name references, anti-references and the line "must NOT look
   like <previous client>".
2. **References.** `npm run references -- <urls>` (or `docs/references/references.json`) writes
   `docs/references/<slug>/{390,1280}.png` and `docs/references/README.md`. The "what we like / what
   we avoid" cells are written by a human and survive re-runs. The only network traffic is the given
   pages themselves. Browsers: `npx playwright install chromium` once.
3. **Design directions.** `/design-directions` writes `docs/design-directions/<date>-<slug>/` with
   `README.md`, `index.html`, 3 or 4 `direction-*.html` and `shots/` (via
   `npm run directions:shoot -- <folder>`, 390/768/1280, exits non-zero on horizontal overflow).
   Directions differ by assigned archetype, nav pattern, hero structure, type pairing, density,
   imagery and colour role; each states what it rejects. The command stops and asks Nathan to pick.
4. **Reskin.** The reskin skill reads the dated decision entry, applies what `brand.config.json`
   can carry, and reports the rest (layout, nav, hero, density, imagery) as queued work in
   `docs/PENDING.md`.

**Rules.**

- The command and scripts never edit `brand/brand.config.json`, `src/**` or Sanity data. Only the
  reskin skill writes the config, after its own confirmation steps.
- Never pick the direction for Nathan, and never mark a directions run done without screenshots that
  were actually looked at.
- Mockups are throwaway single-file HTML and live under `docs/`, which Tailwind already excludes
  from its source scan (`@source not`, card 64) and `.prettierignore` skips for `*.html`. Keep the
  decision `README.md` formatted.
- The decision entry is the durable record (dated, "Carry forward" line). The business-level
  decision goes to the client's vault note; this repo keeps only the technical record.
- The command, the brief template and the two scripts are `PORTABLE:`. Keep them free of client names so a site can sync them.

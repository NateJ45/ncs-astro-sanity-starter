---
description: Explore 3-4 genuinely different homepage design directions as static mockups BEFORE a reskin
argument-hint: '[client name or path to a brief]'
---

<!-- PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file -->

Explore design directions for $ARGUMENTS before any brand is committed. Every site built from this
starter comes out as the same layout in different colours; this command exists to break that. It
produces throwaway static HTML mockups, never site code.

Flow: brief -> references -> **design-directions** -> reskin. If there is no brief and no references
yet, do steps 1 and 2 of that flow first (see `docs/templates/design-brief.md` and
`npm run references`).

Hard limits: do NOT edit `brand/brand.config.json`, `src/**` or any Sanity data. Output goes only
under `docs/design-directions/`.

## 1. Read the brief

Read `PRODUCT.md` and `DESIGN.md` (root, `docs/` or `.agents/context/`, case-insensitive) and
`docs/references/README.md` if they exist. If there is no brief, ask for the minimum, in one round:

1. Who is the client and what do they do (one sentence)? Who is the visitor and what must they do?
2. Three words for the personality, and the single feeling a visitor should leave with.
3. References to like and to avoid (URLs or names), and the line "must NOT look like <previous
   client>". Name the most recent client site; this is the main guard against repeating it.

Also note content that must appear on the homepage (offer, proof, events, donate, booking) and any
hard constraints (accessibility, brand colours already fixed). Placeholder copy is fine in the
mockups but it must be written in the client's voice, never lorem ipsum.

Pick the folder: `docs/design-directions/<YYYY-MM-DD>-<client-slug>/`.

## 2. Assign the archetypes BEFORE designing anything

Choose 3 or 4 distinct archetypes from the list and write the assignment table into the folder's
`README.md` first. Each direction gets one archetype, and a different value in every row of the
divergence table below. No two directions may share an archetype.

| Archetype              | Structure                                                            |
| ---------------------- | -------------------------------------------------------------------- |
| Editorial / magazine   | Asymmetric grid, oversized masthead type, ruled columns, pull quotes |
| Poster / typographic   | Type is the hero, almost no imagery, huge tight headings, one accent |
| Image-led / cinematic  | Full-bleed photography, minimal chrome, text laid over or beside it  |
| Index / directory      | Dense lists and tables, search-first, utilitarian, many entry points |
| Story / scroll chapter | One narrative column, numbered chapters, sticky progress, big pauses |
| Card mosaic / bento    | Modular tiles of mixed sizes, each a self-contained answer           |
| Split-screen           | Two fixed halves, one sticky, one scrolling                          |
| Quiet / document       | Narrow measure, generous leading, reads like a letter or a book      |

### Forced divergence (the rules that make the directions actually differ)

Fill this table for every direction and show it to Nathan. A table where two columns share a value
in a row has failed; change one.

| Axis              | Must differ between directions                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| Layout structure  | Grid skeleton: columns, alignment, how sections are stacked or interleaved                         |
| Nav pattern       | Top bar, centred logo, side rail, overlay menu, bottom bar on mobile, no nav bar (index in hero)   |
| Hero structure    | Not "heading, subhead, two buttons, image right". One of: type-only, full-bleed, split, list, none |
| Type pairing      | Different category pairings (serif + sans, grotesque + mono, display + serif...). No shared family |
| Density           | One airy, one medium, one dense; state words per screen and section count                          |
| Imagery treatment | Full-bleed photo, cut-out, duotone, illustration, type-as-image, none                              |
| Colour role       | Palette may overlap, but the ROLE must differ: dark vs light ground, one accent vs several         |

Forbidden across ALL directions (each one is a common fingerprint of the starter's own homepage):

- The same hero markup or the same nav markup in two directions. Write each from scratch.
- Reusing the starter's section order (hero, three feature cards, testimonial, CTA band) in more than
  one direction.
- Centred headline over a gradient or blurred blob, as a default.
- The previous client's layout, named in the brief's "must not look like" line.
- Three equal rounded cards in a row as the main content block, in more than one direction.

For each direction write, in its `README.md` entry and visibly in the mockup footer, three short
statements:

- **Bet:** what this direction is wagering about the visitor.
- **What this direction rejects:** at least two specific conventions it refuses (for example "no
  hero image, no card grid, no centred text"). A direction that rejects nothing is not different.
- **Costs:** what it makes harder (editing, photography, mobile, long copy).

## 3. Build the mockups

Write each direction as a single self-contained file: `direction-a.html`, `direction-b.html`,
`direction-c.html`, optionally `direction-d.html`. Rules:

- One file, inline `<style>`, no JavaScript framework, no build step. Google Fonts `<link>` is fine;
  say which families in a comment. Use `clamp()` and a real mobile layout: it must work at 390px, not
  just shrink.
- Homepage only, whole page: nav, hero, the 3 to 5 sections that suit the archetype, footer. Real
  client-voice copy, real structure; images may be CSS shapes, gradients or `data:` SVG placeholders,
  but each placeholder must say what photograph belongs there.
- Honour the brief's accessibility needs: text contrast at least 4.5:1, visible focus states, one
  `h1`, landmarks. Do not spend effort on dark mode here; that is the reskin's job.
- Do not import the starter's CSS or components. The point is to leave the starter's layout behind.

Then write `index.html` in the same folder: a comparison page with one card per direction (name,
archetype, bet, rejects, costs) and its 390 / 768 / 1280 screenshots side by side (`shots/`
relative links), plus a link to the live `direction-x.html`.

## 4. Screenshot at 390, 768 and 1280

```
npm run directions:shoot -- docs/design-directions/<date>-<slug>
```

This (scripts/screenshot-directions.mjs, Playwright) writes `shots/<file>-<width>.png` for every
direction and `index`, and exits non-zero if any page overflows horizontally. Run it once the
mockups exist, fix any overflow, run it again, then build or refresh `index.html` against the final
shots. If browsers are missing: `npx playwright install chromium`.

Then LOOK at every PNG (Read the file). Check the three widths of each direction for: layout that
only looks different in colour, text over imagery that fails contrast, broken mobile, and two
directions that have drifted back toward each other. Redo a direction that has converged; say which
and why. Report the screenshot paths.

## 5. Ask Nathan to pick

Present the comparison (point to `index.html` and the screenshots; summarise each direction in two
lines). Ask which to take forward, and whether he wants a hybrid (name exactly which parts of which
directions). Do not pick for him and do not continue until he answers.

## 6. Record the pick and hand off

On his answer, add a dated entry to the top of `docs/design-directions/<date>-<slug>/README.md`
under `## Decision`:

```
### YYYY-MM-DD: picked direction <letter>, <archetype>
Why: <his reason in his words>. Rejected: <the others and why, one line each>.
Carry forward: <type pairing, density, imagery treatment, layout notes, palette role, anything the
reskin must preserve>.
```

Also update the brief's `DESIGN.md` Overview and Do's and Don'ts if the project has one (the
chosen direction's type pairing, density, imagery rule and rejects belong there), and add a line to
`docs/PENDING.md` for the layout work the pick implies, since `brand.config.json` carries colours,
fonts and radius only and cannot express layout.

Finish by handing off to the **reskin skill** (`.claude/skills/reskin/SKILL.md`): give it the
decision entry path, the chosen palette and font pairing, and a list of layout, density and imagery
changes that the config cannot carry. Do NOT edit `brand/brand.config.json` yourself here; the
reskin skill collects and applies it, with its own confirmation steps.

## Gates (report real output)

- Folder has `README.md`, `index.html`, 3 or 4 `direction-*.html`, and `shots/` with 3 widths each.
- The divergence table is in the README with no shared value in any row.
- `npm run directions:shoot` exits 0.
- `npx prettier --check docs/design-directions` passes on the README; the mockup HTML may be
  excluded in `.prettierignore` (they are throwaway artefacts, not maintained source).
- No em-dashes in the README or the mockup copy.

# Typography and spacing

> The one scale, font families, lining figures, metric-matched fallback fonts, the board grammar, fluid spacing tokens, and the Tailwind v4 collision trap.

## The one scale (read this first)

Since card 188 (from FBC Auburn's standardising pass, 2026-10-24) every size, corner, gap, shadow and
button measure a component or the brand layer asks for comes from one `:root` block in
`src/styles/globals.css`, headed "The one scale". A value that is not on the scale is a bug: add a token
before adding a one-off. The block sits AFTER the palette's `:root` and `.dark` blocks on purpose,
because `apply-brand` rewrites the first of each; keep it there.

The starter's values are the ones it already drew, so naming them moved nothing (parity and
screenshots unchanged). A brand retunes the site by changing these, never by hunting utilities.

| Token                                                         | Starter value                           | What it is                                                                                              |
| ------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `--fs-tag` / `--fs-small` / `--fs-body` / `--fs-lead`         | 12 / 14 / 16 / 18px                     | Eyebrows and buttons; meta lines; reading text; an intro. Tailwind's `text-xs` to `text-lg` read these. |
| `--fs-button`                                                 | `var(--fs-tag)`                         | Every button.                                                                                           |
| `--fs-title` / `--fs-title-sm` / `--fs-numeral`               | `--text-h4` / `--text-h5` / `--text-h3` | A card title; a row or accordion title; big figures (times, dates, stats).                              |
| `--lh-body` / `--lh-title` / `--lh-heading`                   | 1.5 / 1.2 / 1.1                         | Reading text; titles; headings (the base `h1`-`h6` rule reads `--lh-heading`).                          |
| `--figures`                                                   | `normal`                                | `font-variant-numeric` on `<html>`; see "Lining figures" below.                                         |
| `--radius-control` / `--radius-card` / `--radius-inner`       | `--radius` x 0.6 / x 0.8 / = control    | Buttons, fields, tabs (`rounded-sm`); cards and panels (`rounded-md`); a picture inside a card.         |
| `--radius-tag` / `--radius-pill`                              | = control / 9999px                      | Small tags; chips.                                                                                      |
| `--pad-card` / `--pad-panel` / `--gap-grid` / `--gap-heading` | `--spacing-l` / `-l` / `-m` / `-l`      | Inside a card; a feature panel; between cards; a section heading to its content.                        |
| `--shadow-card` / `--shadow-raised`                           | the `.card-lift` hover / `shadow-lg`    | A card lifted on hover (`.dark` has its own); a panel over another layer.                               |
| `--btn-height` / `--btn-tracking` / `--tracking-label`        | 44px / 0.18em / 0.18em                  | The button measure (also the tap-target floor); uppercase labels and eyebrows.                          |
| `--focus-ring-width` / `--focus-ring-offset`                  | 2px / 2px                               | The one focus ring.                                                                                     |

**Motion (card 192).** The flow layer's timings and distances sit in the same block, read only when
`layout.motion` is `flow` or `fade` (`docs/agent/animation.md`, "The flow layer"; the script reads the
durations too): `--motion-ease` (expo-out), `--motion-fade` / `--motion-fade-distance` /
`--motion-stagger-calm` (200ms / 8px / 40ms, calm pages), `--motion-rise` / `--motion-rise-distance` /
`--motion-stagger` (600ms / 16px / 60ms), `--motion-line` / `--motion-line-stagger` (800ms / 80ms),
`--motion-photo` / `--motion-photo-zoom` (900ms / 1.06), `--motion-side` / `--motion-side-distance`
(800ms / 32px), `--motion-page-out` / `--motion-page-in` / `--motion-page-distance` (120ms / 260ms / 12px).
Auburn's values from its 2026-10-25 audit ("gentle and quick").

The band rhythm stays `--spacing-section-md` / `--spacing-section-lg` (the `density` layout slot moves
them). FBC Auburn's brand layer holds its own values in the same names (13 / 15 / 18px text, a 20px card
corner, three navy-tinted shadows); that is the model for a site that wants a firmer system.

## Lining figures

`html { font-variant-numeric: var(--figures) }`, `normal` by default. A display face whose default
figures are old-style makes a time read wrong ("11:00" reads "II:00" in Young Serif), so such a brand
sets `--figures: lining-nums tabular-nums` in the scale: one rule on the root, inherited by every time,
date and phone number, and tabular so times line up in a column. Auburn does.

## Metric-matched fallback fonts

While the display font loads, the browser draws titles in a local font; if that font is wider, a title
breaks onto a different number of lines and the page jumps when the real font arrives. Auburn measured
load CLS of about 0.05 on five inner pages from titles alone, and 0.002 or less after this fix.

`npm run font-fallback` (`scripts/font-fallback.mjs`, maths in `scripts/lib/font-fallback.mjs`, both
PORTABLE) opens the display font's Latin regular `.woff` from its `@fontsource` package with
`opentype.js`, takes its average letter width weighted by English letter frequency (capsize's method and
table) and its hhea ascent, descent and line gap, and writes `src/styles/font-fallbacks.css`:
`"<Family> Fallback"` over local Georgia (Arial for a sans) and, for a serif,
`"<Family> Fallback Times"` over Times New Roman, each with `size-adjust`, `ascent-override`,
`descent-override` and `line-gap-override`. The faces are named second in the display stack
(`brand.config.json` `fonts.display.familyValue`, which `apply-brand` writes into `--font-display`).
Once the real font has loaded nothing changes; Android has none of these local fonts and falls through
to plain `serif`, as before. The unit test reproduces Auburn's Young Serif numbers (114.71% over Georgia)
within 0.1%.

Rerun it after any display-font change. A variable `@fontsource` package ships woff2 only, which
opentype.js cannot read: pass `-- --file <a .ttf or .woff of the face>`.

## The board grammar (layout `hero: board`)

FBC Auburn's inner-page grammar as an opt-in layout value (card 188; rule 18: the default emits nothing).
Set `"layout": { "hero": "board" }` in `brand/brand.config.json` and run `npm run apply-brand`.

- **The page head** (`src/components/board/BoardPageHead.astro`, drawn by `Hero.astro` for any non-tall
  hero): a short head on the page ground, the eyebrow, the title (the hero's script accent words in
  `--board-accent`), the subhead and the buttons on the content column's left edge; the page photo beside
  them in the brand's standalone shape (`.shape-gable`), on the shared split's tracks (card 91), so its
  seam lines up with the text-and-picture bands below. A tall (home) hero keeps the bleed shape.
- **One eyebrow** (`BoardLabel.astro`): small caps led by the brand marker.
- **One ground, a rule per section**: `BaseLayout` puts `data-hero="board"` on `<html>`, the cadence's
  tinted bands draw on the page ground, and `SectionRenderer` opens every section after the first with a
  `BoardRule` (not straight after a hero, not before a spacer) in place of the cadence's divider. A band
  with a designed look (Feature) and the closing band keep their own surfaces.

The per-brand knobs are tokens at the top of `src/styles/board.css`, set in the brand layer:
`--board-marker` (a short primary bar by default; Auburn points it at its three stepped bricks),
`--board-marker-width` / `-height`, `--board-rule` (a hairline in `--border`; `none` for whitespace only,
as Auburn has it), `--board-rule-height`, `--board-title-size` (the theme's H1; Auburn caps it at 88px)
and `--board-accent`. Fixture: the board head at the end of `/styleguide/layouts/`, shot by the visual
suite as `hero-board`.

## Typography

- Headings (h1 through h6): **Libre Baskerville**, with its metric-matched fallbacks second in the stack (above). Self-hosted via `@fontsource/libre-baskerville`. Editorial serif that reads as premium without narrowing the brand voice to any specific style.
- Body, UI, buttons: **Inter** (variable). Self-hosted via `@fontsource-variable/inter`. Single file covers all weights.
- Script accent (opt-in): no script font is loaded by default. The `@utility font-script` declaration and `--font-script` token exist in `globals.css`, but the font file is only fetched when you add a `@fontsource` import for a script typeface and point `--font-script` at it. See `animation.md` for the full opt-in steps and usage discipline.
- Labels, eyebrows, monospace numerals: `ui-monospace, 'SF Mono', monospace` (system, no file).

Font families are declared in the `@theme` block in `src/styles/globals.css` as `--font-display`, `--font-body`, `--font-mono`, which Tailwind exposes automatically as `font-display`, `font-body`, `font-mono` utility classes.

### Typographic micro-rules

Two utility classes layered on top of the families. Use them instead of ad-hoc arbitrary values so the system stays consistent across components.

- `tracking-eyebrow` (`0.18em`) -- applied to every uppercase eyebrow label above a heading. Token: `--tracking-eyebrow`.
- `leading-headline-tight` (`1.05`) -- applied to hero-scale H1s. Combined with `tracking-[-0.02em]` it gives Libre Baskerville editorial display proportions at the 40px to 80px hero range. Token: `--leading-headline-tight`.

Both are declared in `src/styles/globals.css` via `@utility`. Don't replace with arbitrary values (`leading-[1.05]`, `tracking-[0.18em]`) in new code; use the named utilities so a future scale change is one edit.

---

## Spacing tokens

Fluid spacing is declared in the `@theme` block in `src/styles/globals.css`:

| Token                  | Value                           | Notes                                                |
| ---------------------- | ------------------------------- | ---------------------------------------------------- |
| `--spacing-xs`         | `clamp(0.25rem, 0.5vw, 0.5rem)` | Tightest paddings, icon gaps                         |
| `--spacing-s`          | `clamp(0.5rem, 1vw, 1rem)`      | Small UI gaps                                        |
| `--spacing-m`          | `clamp(1rem, 2vw, 1.5rem)`      | Default content padding                              |
| `--spacing-l`          | `clamp(2rem, 4vw, 3rem)`        | Card padding, larger gaps                            |
| `--spacing-section-md` | `clamp(3rem, 6vw, 5rem)`        | Section-internal padding                             |
| `--spacing-section-lg` | `clamp(4rem, 8vw, 7rem)`        | Section block padding (top/bottom of major sections) |

Utility classes follow the standard Tailwind pattern: `p-l`, `py-section-lg`, `gap-m`, `mt-section-md`, `space-y-section-lg`, and so on.

### Tailwind v4 collision trap (don't recreate)

In Tailwind v4, `max-w-{key}` resolves to `--spacing-{key}` BEFORE `--container-{key}` when both exist for the same key. Naming a fluid spacing token `--spacing-xl` or `--spacing-2xl` would silently break `max-w-xl` / `max-w-2xl` sitewide (they would inherit the fluid clamp instead of the container width). The two largest section-padding tokens use the `--spacing-section-*` prefix specifically to avoid this collision.

**Rule for adding new spacing tokens:** the key must NOT match any Tailwind built-in container size: `3xs`, `2xs`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, `4xl`, `5xl`, `6xl`, `7xl`. Use `--spacing-section-*` or another distinct prefix.

If you ever suspect this regressed, the diagnostic is: open the page in the dev server and inspect the compiled CSS for a `.max-w-2xl` rule. It MUST read `max-width: var(--container-2xl)`. If it reads `var(--spacing-2xl)`, a colliding token has been re-introduced somewhere in the cascade.

---

## Color tokens

See `theme-and-color.md` for the full palette reference, the `--tint-rgb` token, and the light/dark discipline. A short summary of what to use in component code:

- Body text and headings: `text-foreground`
- Page and card surfaces: `bg-background`, `bg-card`, `bg-muted`
- Brand action color: `bg-primary`, `text-primary-foreground`
- Tinted overlays (polish layer): `rgba(var(--tint-rgb), <opacity>)`
- Borders: `border-border`

Never hardcode hex values in component markup. All palette and semantic tokens are in `globals.css`; change the token, not every usage site.

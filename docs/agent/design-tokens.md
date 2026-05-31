# Typography and spacing

> Font families, typographic micro-rules, fluid spacing tokens, and the Tailwind v4 collision trap.

## Typography

- Headings (h1 through h6): **Libre Baskerville**. Self-hosted via `@fontsource/libre-baskerville`. Editorial serif that reads as premium without narrowing the brand voice to any specific style.
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

| Token | Value | Notes |
|---|---|---|
| `--spacing-xs` | `clamp(0.25rem, 0.5vw, 0.5rem)` | Tightest paddings, icon gaps |
| `--spacing-s` | `clamp(0.5rem, 1vw, 1rem)` | Small UI gaps |
| `--spacing-m` | `clamp(1rem, 2vw, 1.5rem)` | Default content padding |
| `--spacing-l` | `clamp(2rem, 4vw, 3rem)` | Card padding, larger gaps |
| `--spacing-section-md` | `clamp(3rem, 6vw, 5rem)` | Section-internal padding |
| `--spacing-section-lg` | `clamp(4rem, 8vw, 7rem)` | Section block padding (top/bottom of major sections) |

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

# Typography and spacing

> Font families, typographic micro-rules, fluid spacing tokens, and the Tailwind v4 collision trap.

## Typography

- Headings (h1 through h6): **Cormorant Garamond**. Self-hosted via `@fontsource/cormorant-garamond`. Editorial serif that carries the premium-but-warm tone the audit landed on.
- Body, UI, buttons: **Source Sans 3** (variable). Self-hosted via `@fontsource-variable/source-sans-3`.
- Script accent on ONE word per hero or section heading: **Pinyon Script**. Self-hosted via `@fontsource/pinyon-script`. Used ONLY via the `font-script` utility for the editorial-signature flourish (see Polish layer → Script accents). Don't use this font for body, buttons, or anywhere outside the explicit accent slot — it'd read flashy fast.
- Labels, eyebrows, monospace numerals: `ui-monospace, 'SF Mono', monospace` (system, no file).

Font families are declared in the `@theme` block in `src/styles/globals.css` as `--font-display`, `--font-body`, `--font-mono`, which Tailwind exposes automatically as `font-display`, `font-body`, `font-mono` utility classes. Give Cormorant Garamond a `<link rel="preload">` hint in `BaseLayout.astro` if the homepage hero h1 is the LCP element.

### Typographic micro-rules

Two utility classes layered on top of the families. Use them instead of ad-hoc arbitrary values so the system stays consistent across components.

- `tracking-eyebrow` (`0.18em`) — applied to every uppercase eyebrow label above a heading. Used in `Hero.astro`, `SectionHeading.astro`, `ServiceCard.astro`, `TestimonialCard.astro`, `FeaturedTestimonial.astro`. Token: `--tracking-eyebrow`.
- `leading-headline-tight` (`1.05`) — applied to hero-scale H1s. Combined with `tracking-[-0.02em]` it gives Cormorant Garamond editorial display proportions at the 40px to 80px hero range. Token: `--leading-headline-tight`.

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

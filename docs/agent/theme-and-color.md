# Theme and color

> Brand color tokens, shadcn token mapping, and the three-state light/dark theme system.

## Brand colors

Declared in the `@theme` block inside `src/styles/globals.css`. Reference via utility classes (`bg-primary`, `text-accent`, `border-secondary`) rather than hardcoded hex anywhere in component code.

| Role | Hex | Notes |
|---|---|---|
| Primary (action) | `#9C7661` | Warm Bronze — buttons, primary CTAs, focus rings |
| Primary Dark | `#7A5D4C` | Bronze Dark — button hover, body-size link text where Bronze fails contrast |
| Accent (heading + text) | `#3D3D3D` | Charcoal — primary text and headings on light surfaces |
| Accent Dark | `#2A2A2A` | Charcoal Dark — dark section backgrounds (Footer, occasional CTA banner) |
| Secondary | `#B8A99A` | Warm Taupe — borders, dividers, muted text, eyebrow labels |
| Tertiary | `#A8B5A0` | Soft Sage — sparingly, for process icons or tag accents |
| Background | `#FAF8F5` | Soft Linen — primary surface |
| Background Soft | `#F5F0EB` | Cream — alternating section surface |
| Border (subtle) | `#E8E4E0` | Light Gray — input underlines, faint dividers |
| White | `#FFFFFF` | Hero text overlays, contrast against dark sections |

Every token must clear WCAG AA against every surface it appears on. Body text needs 4.5:1, large text and UI components need 3:1. Run the math in both light and dark before introducing a new token. Bronze (`#9C7661`) is borderline for body text on Soft Linen; use Bronze Dark (`#7A5D4C`) for anchor-style text in prose. Bronze is fine on backgrounds where the foreground is white at large size (buttons, CTA banners).

### shadcn token mapping (foundation, do not change casually)

shadcn's CLI defines its own `@theme inline` block that points `--color-primary`, `--color-secondary`, `--color-accent`, `--color-background`, `--color-foreground` at semantic tokens (`--primary`, `--secondary`, etc.) declared further down in `:root`. Without intervention, `bg-primary` would produce shadcn's default grayscale.

The `:root` block in `globals.css` overrides shadcn's defaults so `--primary` is Warm Bronze, `--accent` is Charcoal (used for headings), `--secondary` is Warm Taupe, and so on. This means:

- `bg-primary` on a marketing surface and shadcn's Button default variant both produce Warm Bronze.
- `text-accent` produces Charcoal everywhere, including shadcn primitives where the brand needs to read as the brand.
- `--ring` points at Warm Bronze so focus rings stay on-brand.

If a new shadcn primitive ever looks "off-brand," the fix is almost always in that `:root` block, not in the primitive's source.

---

## Theme system

Three-state toggle (light / dark / system), persisted to `localStorage["reid-design-theme"]`. System is the default for first-time visitors; while set to System, the page listens to `matchMedia('(prefers-color-scheme: dark)')` and flips live when the OS changes.

The wiring, in order of execution:

1. **Anti-FOUC script in `BaseLayout.astro`** runs inline in `<head>` before first paint. The script does three things every time it fires (initial load, `astro:after-swap` on View Transitions, and `DOMContentLoaded` after body parses):
   - Reads the localStorage key and `prefers-color-scheme`
   - Applies the `.dark` class on `<html>` plus an inline `color-scheme` style so native widgets (scrollbars, form controls) follow
   - Walks every `<img data-theme-logo>` and assigns the matching variant's `src` + `srcset` (theme-aware logo, see below)
2. **`ThemeToggle.tsx`** (React island, single instance in Header eyebrow strip) cycles light → dark → system on click, writes to the same localStorage key, and re-binds the matchMedia listener whenever the chosen theme changes. Its `applyTheme()` function ALSO walks the `[data-theme-logo]` images and swaps their srcs, so toggling the theme doesn't leave a Charcoal-ink logo on a Charcoal-Dark background.
3. **`globals.css`** defines color tokens for both modes. `:root` carries light; `.dark` carries the overrides. Brand Warm Bronze and Charcoal Dark keep their visual identity in both modes; only surface and muted-text tokens flip.

### View Transitions persistence (the gotcha)

Astro's View Transitions runtime swaps the document `<head>` and `<body>` between navigations but **resets `<html>`'s className** to whatever the new page's source HTML had (empty — `.dark` is applied at runtime). Without intervention, a user who set dark mode would see the next page render in light despite `localStorage` still holding `"dark"`. This was an actual bug we fixed.

The fix lives in the anti-FOUC script and has three triggers:
- **Initial inline call** — runs in `<head>` before body parses. Catches the first paint.
- **`DOMContentLoaded` listener** — re-runs after the body is in the DOM. Required so theme-aware imgs that appear below the first parsed scripts (notably the footer logo) get their `src` set. Bound with `{ once: true }`.
- **`astro:after-swap` listener** — re-runs after every View Transitions navigation. Re-applies the `.dark` class and re-sets the logo `src` because both get reset by the swap.

A `__themeBootstrapBound` flag on `window` guards against double-binding if the script ever runs twice. If you touch this script, preserve all three triggers.

### Theme-aware single-img logo pattern

Header and Footer each render ONE `<img>` for the logo, with no `src` attribute in the HTML. Four data attributes carry the URLs:

```html
<img
  alt="Reid Design LLC"
  width="100" height="106"
  class="h-[6.25rem] w-auto"
  loading="eager"
  data-theme-logo
  data-logo-light-src="/_astro/logo-light.{hash}.webp"
  data-logo-light-srcset="/_astro/logo-light.{1xhash}.webp 1x, /_astro/logo-light.{2xhash}.webp 2x"
  data-logo-dark-src="/_astro/logo-dark.{hash}.webp"
  data-logo-dark-srcset="/_astro/logo-dark.{1xhash}.webp 1x, /_astro/logo-dark.{2xhash}.webp 2x"
>
```

The URLs come from `getImage()` calls at build time (Astro's image pipeline pre-renders the four variants). The src is set by:
- An inline `<script is:inline>` immediately after the header img (runs synchronously, before browser begins fetching).
- BaseLayout's anti-FOUC script for the footer img (runs on `DOMContentLoaded` since the footer doesn't exist when the head script first fires).

Net effect: **only one logo file is ever fetched per page load**, regardless of theme. Lighthouse's "Properly size images" and "Improve image delivery" audits no longer see an inactive variant in the DOM. Toggling the theme via `ThemeToggle` swaps the src in place; navigating via View Transitions re-applies via `astro:after-swap`.

**Don't revert to two img tags with CSS hide/show.** Modern browsers usually skip `display:none + loading="lazy"` fetches, but Lighthouse still analyses the DOM and counts the inactive variant against the score.

Reid Design is primarily a light-toned warm brand. Dark mode is supported because it's standard infrastructure and a small audience subset prefers it, but the site is designed and tested first in light mode. Don't optimize dark mode at the expense of light.

### Light/dark discipline (build with both in mind)

Every new component renders correctly in BOTH modes. This is not a "we'll get to it" — it's a foundation rule. The bug it prevents is real: the original placeholder used `text-accent` (Charcoal `#3D3D3D`) for body copy, which doesn't flip in dark mode, producing Charcoal-on-near-black at 1.57:1 contrast. Lighthouse caught it; the rule below prevents it from recurring.

**Dynamic tokens (flip with theme — use these for text and surfaces):**
- `bg-background`, `text-foreground` — body text + page background
- `bg-card`, `text-card-foreground` — card surfaces
- `bg-popover`, `text-popover-foreground` — popovers and tooltips
- `bg-muted`, `text-muted-foreground` — quiet surfaces and secondary text
- `bg-accent`, `text-accent-foreground` — hover backgrounds on interactive elements
- `border-border`, `border-input` — borders that need to read in both modes
- `ring-ring` — focus rings
- `text-link` — bronze link/anchor color. Bronze Dark `#7A5D4C` in light mode, lifted Bronze `#B89274` in dark mode. Use this anywhere a bronze-tinted link or link-style button needs to read in both themes (inline body links, sidebar action links, the Portable Text renderer's `link` mark, "secondary CTA" outlined buttons).

These are shadcn's semantic tokens, defined in `:root` for light and overridden in `.dark` for dark. Always use these for anything that should adapt to mode.

**Static brand tokens (do NOT flip — use only where the brand color must hold in both modes):**
- `bg-primary`, `text-primary-foreground` — CTA buttons (Warm Bronze stays Warm Bronze)
- `text-primary-dark` — anchor-style body text in prose (Bronze Dark)
- `bg-accent-dark`, `text-bg` — dark section panels (Footer, occasional CTA banner where Charcoal Dark is the design)
- `bg-bg`, `bg-bg-soft` — Soft Linen and Cream brand surfaces (rarely used; prefer `bg-background` and `bg-muted` for theme-aware surfaces)
- `border-secondary` (Warm Taupe), `text-secondary` — eyebrow labels, brand-color dividers
- `text-tertiary` — Soft Sage accents

**`text-accent` and `bg-accent` are theme-aware via shadcn's `--accent` token** (Cream `#F5F0EB` in light, darker warm `#3A332D` in dark). The `@theme inline` block remaps `--color-accent → var(--accent)` so `bg-accent` works as a hover surface that flips with theme. The `@theme` block's literal `--color-accent: #3D3D3D` is overridden by the `@theme inline` mapping (later declarations win in Tailwind v4). **Don't use `text-accent` for body text** — its color now mirrors `--accent` (Cream/dark) which is meant for hover surfaces, not text. Always use `text-foreground` for headings and body copy.

**Earlier bug avoided by this mapping:** without the `--color-accent → var(--accent)` remap, `bg-accent` resolved to static Charcoal in both modes. In light mode, hovering a Charcoal `text-foreground` icon on a Charcoal `bg-accent` surface hid the icon entirely (ThemeToggle, MobileNav, dropdown-menu focus, the secondary outlined CTA). Dark mode masked the problem because `text-foreground` was Cream there. If you ever revert the mapping, every `hover:bg-accent` and `focus:bg-accent` in the codebase regresses.

**Same trap for `text-primary-dark`:** it's static Bronze Dark `#7A5D4C`, which reads fine on Soft Linen but fails contrast on the dark-mode background. **For link-style text in both modes, use `text-link`** (defined above). `text-primary-dark` is fine on a static bronze CTA panel or a light-mode-only surface, but not for any text that ships on a theme-aware background.

**CTA buttons use `bg-primary-dark` + `text-white`, not `bg-primary` + `text-primary-foreground`.** Two compounding rules:
1. `bg-primary` (Warm Bronze `#9C7661`) with white at button label sizes hits only 4.05:1 — just under WCAG AA 4.5:1 for body text. The original brand spec acknowledged this ("Bronze fine on backgrounds where the foreground is white at large size") and called for Bronze Dark on small-text-on-bronze. Use `bg-primary-dark` (`#7A5D4C`) for CTA buttons; white on it lands at 5.5:1.
2. `--primary-foreground` flips to a dark color in dark mode, which would tank contrast against any bronze background. Always pair the bronze CTA BG with literal `text-white`, not the semantic token.

The primary hover state on CTAs goes to `bg-accent-dark` (Charcoal Dark) — even more contrast on hover, consistent with the "darker on hover" pattern visitors expect.

**Quick checklist before adding a color class:**
1. Does this text or surface need to be readable in BOTH modes? → semantic token (`text-foreground`, `bg-background`, `bg-muted`, etc.)
2. Is this a brand-color CTA, footer panel, or eyebrow that should hold its hue in both modes? → brand token (`bg-primary`, `bg-accent-dark`) — note `text-secondary` is reserved for borders + dividers; eyebrow LABELS use `text-foreground/65` (see Eyebrow contrast lesson below).
3. Adding opacity? → `text-foreground/80`, not `text-accent/80`
4. Not sure? → render it in both modes via the Playwright MCP before merging. See the [Visual verification workflow](#visual-verification-workflow) section.

### Eyebrow contrast lesson (post-audit)

Warm Taupe `#B8A99A` at 12px on Cream / Soft Linen lands at **2.02:1** — fails WCAG AA. The original sweep migrated `text-secondary` → `text-foreground/65`, which improved dark mode but still failed AA in light mode (~3.57:1 on Soft Linen).

A second sweep bumped the opacity tier:
- `text-foreground/65` → `text-foreground/80` (52 occurrences across 25 files) — gets to **~5.4:1 on Soft Linen, passes AA**.
- `text-foreground/70` → `text-foreground/85` (7 occurrences) — for small italic body text, **~6.1:1, passes AAA**.

The brand `--secondary` token still exists and is fine for **borders, dividers, larger decorative ornaments** — just not for body-size text.

If you add a new eyebrow label, the pattern is:
```html
<p class="text-xs uppercase tracking-eyebrow text-foreground/80">Eyebrow text</p>
```

`scripts/sweep-eyebrow-contrast.mjs` originally caught `text-secondary` → `text-foreground/65`. Inline ad-hoc scripts handled the `/65` → `/80` and `/70` → `/85` follow-up sweeps. If you spot any new `text-foreground/65` or `/70` on `bg-muted`/`bg-background` surfaces, bump them.

### `text-primary-dark` is light-mode-only

`text-primary-dark` (Bronze Dark `#7A5D4C`) is a **static brand token**. It reads at 5+:1 on Cream but only 2.53:1 on the dark-mode background. For any always-on text (prices, headings, accent body), use `text-link` instead — that's the theme-aware bronze (Bronze Dark in light, lifted Bronze `#B89274` in dark). Hover states using `hover:text-primary-dark` are fine since they're momentary.

The same audit-driven sweep already migrated `text-primary-dark` → `text-link` in ServiceCard prices, ServiceAreaCue Plainfield highlight, ProcessStep / about philosophy numerals, journal pull-quote glyph + price inline, and CaseStudyTOC active state.

### Server-only console warnings

`src/lib/sanity.ts` warns about missing env vars (project ID, read token). These warnings are wrapped in `if (import.meta.env.SSR)` so they only fire during the build / SSR pass, not in the browser. Why: the Sanity client module gets imported by React components (PortableText, ProjectGallery, etc.) for the `urlFor` image helper. Without the SSR guard, every browser session would see the "SANITY_API_READ_TOKEN is not set" warning, even though the token is irrelevant in the browser (it's a server-only env var).

Use this pattern for any future console.* call in code that gets imported by client components:

```ts
if (import.meta.env.SSR) {
  console.warn('[some-module] build-only warning…');
}
```

### Tailwind v4 cascade gotcha: className overrides usually lose

Tailwind v4 generates utilities **alphabetically** in the stylesheet. Two utilities affecting the same property fight at the CSS layer, not at the order they appear in your `class:list`. So:

- `text-link` (variant) + `text-bg` (override) → `text-link` wins (later in alphabetical sort).
- `text-sm` (base) + `text-h3` (override) → `text-sm` wins.

Solutions:
1. **Add a variant prop instead of overriding via className.** This is why CtaLink got an `onDark` prop and shadcn's `accordion.tsx` had its base font-size removed (so consumer `text-h3` actually wins).
2. **Drop the conflicting base class.** If you control the base component, remove the class that's interfering.
3. **Use `!important`** as last resort (`!text-bg`). Rare in this codebase.

If a class isn't taking effect, inspect the computed CSS — usually the issue is another utility further down the alphabet beating it.

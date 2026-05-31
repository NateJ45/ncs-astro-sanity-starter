# Theme and color

> Default palette tokens, shadcn token mapping, the three-state light/dark theme system, and the re-skin design seam.

## Default palette

The starter ships a neutral Slate/Ink/Paper palette. These are the defaults to build on and test against; a consuming project re-skins by editing the design seam described at the end of this document.

Declared in the `@theme` block inside `src/styles/globals.css`. Reference via utility classes (`bg-primary`, `text-foreground`, `border-border`) rather than hardcoded hex anywhere in component code.

| Role | Hex | Name | Notes |
|---|---|---|---|
| Primary (action) | `#586577` | Slate | Buttons, primary CTAs, focus rings |
| Foreground / headings | `#2A2D31` | Ink | Primary text and headings on light surfaces |
| Background | `#FBFBFA` | Paper | Primary page surface |
| Tint (light mode) | `88, 101, 119` | -- | `--tint-rgb` for polish overlays (see below) |
| Tint (dark mode) | `138, 150, 166` | -- | `--tint-rgb` lifted for dark surfaces |

Every token must clear WCAG AA against every surface it appears on. Body text needs 4.5:1, large text and UI components need 3:1. Run the math in both light and dark before introducing a new token.

### `--tint-rgb` token

The `--tint-rgb` CSS custom property holds the brand tint color as a bare RGB triplet (no `rgb()` wrapper). This lets the polish layer compose tinted overlays at arbitrary opacity using `rgba(var(--tint-rgb), 0.07)` without duplicating the hex. The value flips between light and dark modes via the `:root` / `.dark` cascade:

```css
:root {
  --tint-rgb: 88, 101, 119;   /* Slate */
}
.dark {
  --tint-rgb: 138, 150, 166;  /* lighter Slate for dark surfaces */
}
```

When you re-skin the project, update `--tint-rgb` to match your new primary color's RGB values so the polish overlays (`surface-warm`, `img-tint`, paper-grain) pick up the new hue automatically.

### shadcn token mapping (foundation, do not change casually)

shadcn's CLI defines its own `@theme inline` block that points `--color-primary`, `--color-secondary`, `--color-accent`, `--color-background`, `--color-foreground` at semantic tokens (`--primary`, `--secondary`, etc.) declared further down in `:root`. Without intervention, `bg-primary` would produce shadcn's default grayscale.

The `:root` block in `globals.css` overrides shadcn's defaults so `--primary` is Slate, `--foreground` is Ink, and so on. This means:

- `bg-primary` on a marketing surface and shadcn's Button default variant both produce Slate.
- `text-foreground` produces Ink everywhere, including shadcn primitives.
- `--ring` points at Slate so focus rings stay on-brand.

If a new shadcn primitive ever looks off-brand, the fix is almost always in that `:root` block, not in the primitive's source.

---

## Theme system

Three-state toggle (light / dark / system), persisted to `localStorage["theme"]`. System is the default for first-time visitors; while set to System, the page listens to `matchMedia('(prefers-color-scheme: dark)')` and flips live when the OS changes.

The wiring, in order of execution:

1. **Anti-FOUC script in `BaseLayout.astro`** runs inline in `<head>` before first paint. The script does three things every time it fires (initial load, `astro:after-swap` on View Transitions, and `DOMContentLoaded` after body parses):
   - Reads the localStorage key and `prefers-color-scheme`
   - Applies the `.dark` class on `<html>` plus an inline `color-scheme` style so native widgets (scrollbars, form controls) follow
   - Walks every `<img data-theme-logo>` and assigns the matching variant's `src` + `srcset` (theme-aware logo, see below)
2. **`ThemeToggle.tsx`** (React island, single instance in the Header) cycles light -> dark -> system on click, writes to the same localStorage key, and re-binds the matchMedia listener whenever the chosen theme changes. Its `applyTheme()` function also walks the `[data-theme-logo]` images and swaps their srcs, so toggling the theme doesn't leave a dark-ink logo on a dark background.
3. **`globals.css`** defines color tokens for both modes. `:root` carries light; `.dark` carries the overrides. The Slate primary keeps its visual identity in both modes; only surface and muted-text tokens flip.

### View Transitions persistence (the gotcha)

Astro's View Transitions runtime swaps the document `<head>` and `<body>` between navigations but **resets `<html>`'s className** to whatever the new page's source HTML had (empty -- `.dark` is applied at runtime). Without intervention, a user who set dark mode would see the next page render in light despite `localStorage` still holding `"dark"`. This was an actual bug that was fixed.

The fix lives in the anti-FOUC script and has three triggers:
- **Initial inline call** -- runs in `<head>` before body parses. Catches the first paint.
- **`DOMContentLoaded` listener** -- re-runs after the body is in the DOM. Required so theme-aware imgs that appear below the first parsed scripts (notably the footer logo) get their `src` set. Bound with `{ once: true }`.
- **`astro:after-swap` listener** -- re-runs after every View Transitions navigation. Re-applies the `.dark` class and re-sets the logo `src` because both get reset by the swap.

A `__themeBootstrapBound` flag on `window` guards against double-binding if the script ever runs twice. If you touch this script, preserve all three triggers.

### Theme-aware single-img logo pattern

Header and Footer each render ONE `<img>` for the logo, with no `src` attribute in the HTML. Four data attributes carry the URLs:

```html
<img
  alt="[Your Brand]"
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

The site is designed and tested first in light mode. Don't optimize dark mode at the expense of light.

### Light/dark discipline (build with both in mind)

Every new component renders correctly in BOTH modes. This is a foundation rule, not a "we'll get to it." The bug it prevents is real: using a static color (e.g. Ink `#2A2D31`) for body copy without a dark-mode override produces Ink-on-near-black at low contrast ratios. Lighthouse catches it; the rule below prevents it from recurring.

**Dynamic tokens (flip with theme -- use these for text and surfaces):**
- `bg-background`, `text-foreground` -- body text + page background
- `bg-card`, `text-card-foreground` -- card surfaces
- `bg-popover`, `text-popover-foreground` -- popovers and tooltips
- `bg-muted`, `text-muted-foreground` -- quiet surfaces and secondary text
- `bg-accent`, `text-accent-foreground` -- hover backgrounds on interactive elements
- `border-border`, `border-input` -- borders that need to read in both modes
- `ring-ring` -- focus rings
- `text-link` -- primary-tinted link/anchor color. Dark enough for light mode, lifted for dark mode. Use this anywhere a tinted link or link-style button needs to read in both themes.

These are shadcn's semantic tokens, defined in `:root` for light and overridden in `.dark` for dark. Always use these for anything that should adapt to mode.

**Static brand tokens (do NOT flip -- use only where the brand color must hold in both modes):**
- `bg-primary`, `text-primary-foreground` -- CTA buttons (Slate stays Slate)
- `bg-primary/90` (or a dedicated darker variant) -- CTA hover state

**`text-accent` and `bg-accent` are theme-aware via shadcn's `--accent` token.** The `@theme inline` block remaps `--color-accent -> var(--accent)` so `bg-accent` works as a hover surface that flips with theme. **Don't use `text-accent` for body text** -- its color mirrors `--accent` which is meant for hover surfaces, not text. Always use `text-foreground` for headings and body copy.

**Quick checklist before adding a color class:**
1. Does this text or surface need to be readable in BOTH modes? -> semantic token (`text-foreground`, `bg-background`, `bg-muted`, etc.)
2. Is this a brand-color CTA or surface that should hold its hue in both modes? -> brand token (`bg-primary`, etc.)
3. Adding opacity? -> `text-foreground/80`, not `text-accent/80`
4. Not sure? -> render it in both modes before merging.

### Eyebrow contrast lesson (post-audit)

Muted colors at small sizes fail WCAG AA easily. The pattern for eyebrow labels that passes AA on both light and dark surfaces:

```html
<p class="text-xs uppercase tracking-eyebrow text-foreground/80">Eyebrow text</p>
```

`text-foreground/80` reaches ~5.4:1 on the Paper background, passing AA. Do not use `text-muted-foreground` or a raw brand color for small uppercase labels -- verify the contrast ratio first.

If you spot any `text-foreground/65` or `/70` on `bg-muted`/`bg-background` surfaces, bump them to `/80` or `/85`.

### Tailwind v4 cascade gotcha: className overrides usually lose

Tailwind v4 generates utilities **alphabetically** in the stylesheet. Two utilities affecting the same property fight at the CSS layer, not at the order they appear in your `class:list`. So:

- `text-link` (variant) + `text-bg` (override) -> `text-link` wins (later in alphabetical sort).
- `text-sm` (base) + `text-h3` (override) -> `text-sm` wins.

Solutions:
1. **Add a variant prop instead of overriding via className.** This is why some components accept an `onDark` prop and shadcn's `accordion.tsx` had its base font-size removed (so consumer `text-h3` actually wins).
2. **Drop the conflicting base class.** If you control the base component, remove the class that's interfering.
3. **Use `!important`** as last resort (`!text-bg`). Rare in this codebase.

If a class isn't taking effect, inspect the computed CSS -- usually the issue is another utility further down the alphabet beating it.

### Server-only console warnings

`src/lib/sanity.ts` warns about missing env vars (project ID, read token). These warnings are wrapped in `if (import.meta.env.SSR)` so they only fire during the build / SSR pass, not in the browser. Why: the Sanity client module gets imported by React components for the `urlFor` image helper. Without the SSR guard, every browser session would see the "SANITY_API_READ_TOKEN is not set" warning, even though the token is irrelevant in the browser.

Use this pattern for any future `console.*` call in code that gets imported by client components:

```ts
if (import.meta.env.SSR) {
  console.warn('[some-module] build-only warning...');
}
```

---

## Design seam: how to re-skin this starter

Changing the visual identity of a project built on this starter requires touching exactly four areas. Everything else (components, layout, spacing, animation) inherits from these.

1. **`src/styles/globals.css` -- `@theme` block and `:root` / `.dark`**
   Replace the Slate/Ink/Paper hex values and `--tint-rgb` triplets with your palette. Update the shadcn semantic overrides in `:root` and `.dark` so `bg-primary`, `text-foreground`, `bg-background`, etc. resolve to your colors. Keep the token structure; only change the values.

2. **Font imports and `--font-*` tokens**
   Replace the `@fontsource/libre-baskerville` and `@fontsource-variable/inter` imports at the top of `globals.css` with your chosen typefaces. Update `--font-display` and `--font-body` in the `@theme` block to match. To enable the optional script accent, add a `@fontsource` import for a script font and point `--font-script` at it (see `animation.md`).

3. **`src/data/site.ts`**
   Update the brand name, domain, tagline, social URLs, and any other hardcoded identity strings the build needs at compile time.

4. **Logo, favicon, and OG inputs**
   Drop your `logo-light.*` and `logo-dark.*` files into `src/assets/` (or wherever `BaseLayout.astro` imports them from). Replace the favicon in `public/`. Re-run `npm run og` if you want updated default OG images.

No other files need to change for a basic re-skin. The `--tint-rgb` token propagates your hue through all the polish-layer overlays automatically.

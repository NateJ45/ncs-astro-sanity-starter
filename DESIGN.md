---
name: NCS Astro + Sanity Starter (neutral defaults)
description: PLACEHOLDER design system. The neutral Slate, Ink and Paper defaults the starter ships; a fork replaces all of it.
colors:
  slate: '#586577'
  slate-dark: '#434E5C'
  ink: '#2A2D31'
  ink-dark: '#1E2024'
  paper: '#FBFBFA'
  paper-soft: '#F3F4F2'
  divider: '#E6E7E5'
  muted-text: '#5F6469'
  mist: '#AAB0B8'
  sage: '#9DB0A6'
  dark-ground: '#17191C'
  dark-card: '#202327'
  dark-primary: '#8A96A6'
typography:
  display:
    fontFamily: 'Libre Baskerville, Georgia, Times New Roman, serif'
    fontSize: 'clamp(2.5rem, 6vw, 5rem)'
  body:
    fontFamily: 'Inter Variable, system-ui, sans-serif'
rounded:
  base: '0.5rem'
spacing:
  xs: 'clamp(0.25rem, 0.5vw, 0.5rem)'
  s: 'clamp(0.5rem, 1vw, 1rem)'
  m: 'clamp(1rem, 2vw, 1.5rem)'
  l: 'clamp(2rem, 4vw, 3rem)'
  section-md: 'clamp(3rem, 6vw, 5rem)'
  section-lg: 'clamp(4rem, 8vw, 7rem)'
components:
  button-primary:
    backgroundColor: '{colors.slate-dark}'
    textColor: '#FFFFFF'
    rounded: '{rounded.base}'
    height: '44px'
---

# Design System: NCS Starter (placeholder)

> **PLACEHOLDER, NOT A DESIGN.** This file documents the neutral defaults the starter ships so that agents on a fresh fork know what to replace. It is not a client's identity and must not be copied into one. A fork rewrites this file from its own tokens (`brand/brand.config.json`, then `npm run apply-brand`, then `src/styles/globals.css`) and removes this banner. The CSS wins if this file and the code disagree. Audience and tone placeholders are in `PRODUCT.md`.

## 1. Overview

**Creative North Star: [PLACEHOLDER].** The starter has no creative north star; a fork must name its own. What ships is a quiet, neutral surface so that nothing here is mistaken for a decision.

- **Light and dark both ship.** A three-state toggle (light, dark, system) is persisted to `localStorage["theme"]`, and CLAUDE.md rule 3 says to build and check in both. (A fork may retire dark mode, as First Baptist Muncie did, but that is a project decision.)
- **Polish layer defaults.** A repeating 2px brand-colour stripe is the starter's signature (header, drawer, footer, cards, closing panel); a soft card lift on hover; a faint paper grain (`body::before`, 4% opacity, 6% in dark); a warm radial tint on alternating bands (`.surface-warm`, driven by `--tint-rgb`).
- **Page builder owns the rhythm.** `SectionRenderer` alternates paper and soft-paper surfaces automatically; blocks carry no colour field (rule 9).
- **One grammar per page** (rule 17): one heading system, one left edge, one button family.
- TODO(Nathan): decide whether `PORTS.md` should carry a card for "forks rewrite PRODUCT.md and DESIGN.md", so existing client repos know the shape. Not added here (scope was the two files and a CLAUDE.md pointer).

## 2. Colors

Neutral Slate, Ink and Paper, declared in the `@theme` block of `src/styles/globals.css` and mirrored in `brand.config.json`. Reference by utility (`bg-primary`, `text-foreground`, `border-border`), never by hex in components.

- **Primary (Slate)** `#586577`; **Slate Dark** `#434E5C` is the button ground and link colour (it clears AA on small labels where plain Slate does not).
- **Ink** `#2A2D31` for headings and body, **Ink Dark** `#1E2024` for the dark panel.
- **Paper** `#FBFBFA` page, **Paper Soft** `#F3F4F2` alternating band, divider `#E6E7E5`, muted text `#5F6469`.
- **Secondary** `#AAB0B8` and **tertiary** `#9DB0A6` are decorative, used sparingly.
- **Dark theme:** ground `#17191C`, card `#202327`, primary lifted to `#8A96A6`, borders `oklch(1 0 0 / 12%)`.
- `--tint-rgb` (88, 101, 119 in light, 138, 150, 166 in dark) feeds the polish-layer overlays; update it with the primary.
- Every token must clear WCAG AA on every surface it appears on (4.5:1 body, 3:1 large text and UI). `src/lib/theme-tokens.test.ts` is the gate; fix the token, not the assertion.
- [PLACEHOLDER: the project's palette, with role, hex and measured contrast for each.]

## 3. Typography

- **Display:** Libre Baskerville (400 and 700), a serif; fallback Georgia. **Body and UI:** Inter Variable. Mono is the system stack, and a script slot (`--font-script`) exists but is off by default.
- **Scale:** `--text-h1` clamp(2.5rem, 6vw, 5rem), h2 clamp(2rem, 4vw, 3rem), h3 clamp(1.5rem, 2.5vw, 2rem), h4 clamp(1.25rem, 2vw, 1.5rem), h5 clamp(1.125rem, 1.5vw, 1.25rem), h6 1rem. Eyebrows are uppercase with `--tracking-eyebrow` 0.18em; hero headlines use `--leading-headline-tight` 1.05.
- `apply-brand` does not install font packages: `npm install @fontsource/...` first (rule 12), then run `npm run build` (rule 13).
- [PLACEHOLDER: the project's faces, weights, and where each is used.]

## 4. Elevation

Soft and light by default: marketing cards rest on a low-opacity shadow that deepens on hover (`.card-lift`, a 2px rise), and surfaces otherwise separate by the paper and soft-paper cadence and by the 2px brand stripe. Radius base is `0.5rem` (`--radius`, with `sm` to `4xl` derived from it). [PLACEHOLDER: the project's elevation philosophy.]

## 5. Components

- **Buttons (`CtaLink.astro`).** Two looks, `primary` (filled, Slate Dark ground, white label) and `secondary` (outlined), plus an `onDark` toggle for dark surfaces (a `class` override does not work, because Tailwind v4 utility order lets the link colour win). Generous padding, uppercase tracking, 44px minimum tap target. Note: the file's header comment still says "bronze" from the Reid Design fork; the live colours are Slate. Forks usually replace both variants with one family (rule 17).
- **Header, footer, mobile drawer.** Server-rendered desktop nav (rule 4), a brand stripe, theme toggle, `MobileNav` drawer.
- **Hero.** `Hero.astro` with `HeroBackground.astro` for image heroes and an entry stagger (`.hero-entry-stagger`).
- **Sections.** The page-builder blocks under `src/components/sections/` render through `SectionRenderer.astro`; cards (service, journal, testimonial, project) share the stripe and card lift.
- [PLACEHOLDER: the project's own component vocabulary and signature objects.]

## 6. Do's and Don'ts

Motion defaults: interaction easing `cubic-bezier(0.16, 1, 0.3, 1)` at 440ms; `[data-reveal]` scroll reveals, a grid stagger, a hero entry stagger and an image curtain exist as opt-ins; Lenis handles smooth scroll and the navigation scroll reset (rule 5); reduced motion zeroes all of it. Each fork decides which of these to keep: Stone Steps and FBCM both pruned reveals.

**Do**

- Replace this file, `PRODUCT.md`, `docs/brand/voice.md` and the neutral palette and fonts before a fork ships.
- Measure every new colour pair in both themes before using it.
- Use utilities backed by the tokens; never hardcode hex in components.
- Run the fork-residue check (rule 11, PORTS.md card 44).

**Don't**

- Don't ship the starter's Slate, Libre Baskerville and Inter as a client's identity.
- Don't add a colour or surface field to a block.
- Don't copy another client's design language into a fork.
- Don't write an em-dash in public copy.

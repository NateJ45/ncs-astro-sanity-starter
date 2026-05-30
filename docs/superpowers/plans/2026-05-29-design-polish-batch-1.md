# Design Polish Batch 1 — CSS-Native Flourishes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 3 CSS-native design flourishes: Editorial Typography (drop cap + blockquote), Image Hover Treatment (zoom + warm tint), and Grid Stagger Entrance.

**Architecture:** Pure CSS utilities added to globals.css. Small class changes in two card components. A first-paragraph toggle in JournalPortableText.tsx's factory closure. A new IntersectionObserver block inside BaseLayout's existing `initPolish()` function. No new npm dependencies.

**Tech Stack:** Astro 6, Tailwind v4, TypeScript, React 19, Sanity PortableText renderer

**Reference spec:** `docs/superpowers/specs/2026-05-29-design-polish-flourishes-design.md` (Flourishes 1, 2, 3)

---

## File map

| Action | Path |
|--------|------|
| Modify | `src/styles/globals.css` |
| Modify | `src/components/JournalPortableText.tsx` |
| Modify | `src/components/ProjectCard.astro` |
| Modify | `src/components/JournalCard.astro` |
| Modify | `src/layouts/BaseLayout.astro` |
| Modify | `src/pages/portfolio/index.astro` |
| Modify | `src/pages/journal/index.astro` |
| Modify | `src/pages/index.astro` |
| Modify | `src/pages/about.astro` |
| Modify | `src/pages/services.astro` |

---

### Task 1: Add CSS utilities to globals.css

**Files:**
- Modify: `src/styles/globals.css`

- [ ] **Step 1: Insert new CSS block after line 519**

Line 519 is the closing `}` of the `.hero-entry-stagger` reduced-motion reset. Insert this block directly after it (before the `/* Reading-room paper grain */` comment):

```css
/* ---- Drop cap — float cap on the first paragraph of every journal post.
   JournalPortableText.tsx adds .prose-drop-cap to the first <p> only. ---- */
.prose-drop-cap::first-letter {
  font-family: var(--font-display);
  font-size: 4.5em;
  line-height: 0.72;
  float: left;
  color: var(--primary);
  margin-right: 0.08em;
  margin-top: 0.06em;
  font-weight: 400;
}

/* ---- Blockquote — 3px bronze left border, Cormorant italic. Replaces the
   inline Tailwind classes previously on <blockquote> in JournalPortableText. ---- */
.prose-blockquote {
  border-left: 3px solid var(--primary);
  padding: 0.5rem 0 0.5rem 1.25rem;
  margin: var(--spacing-m) 0;
}
.prose-blockquote p {
  font-family: var(--font-display);
  font-style: italic;
  font-size: clamp(1rem, 2vw, 1.15rem);
  line-height: 1.65;
  color: var(--foreground);
  margin: 0;
}
.prose-blockquote cite {
  display: block;
  font-size: 0.65rem;
  font-style: normal;
  text-transform: uppercase;
  letter-spacing: var(--tracking-eyebrow);
  color: var(--primary);
  margin-top: 0.5rem;
}

/* ---- Image zoom + warm tint hover treatment.
   Apply .img-zoom to the overflow:hidden image wrapper div.
   Add .img-tint (project cards) or .img-tint.img-tint-light (journal cards)
   as a child div inside the wrapper.
   Transition only fires under no-preference to respect reduced motion. ---- */
@media (prefers-reduced-motion: no-preference) {
  .img-zoom img,
  .img-zoom .img-zoom-target {
    transition: transform 550ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .img-tint {
    transition: background 400ms ease;
  }
}
.img-tint {
  position: absolute;
  inset: 0;
  background: rgba(156, 118, 97, 0);
  pointer-events: none;
}
.img-zoom:hover img,
.img-zoom:hover .img-zoom-target {
  transform: scale(1.06);
}
.img-zoom:hover .img-tint                  { background: rgba(156, 118, 97, 0.15); }
.img-zoom:hover .img-tint.img-tint-light   { background: rgba(156, 118, 97, 0.08); }

/* ---- Grid stagger entrance. Add data-stagger-grid to any card grid container.
   The BaseLayout observer adds .is-staggered on intersection, triggering the
   staggered fade-up on each direct child. Delays cap at 400ms for item 5+
   so long grids don't drag. ---- */
[data-stagger-grid] > * {
  opacity: 0;
  transform: translateY(14px);
  transition: opacity 600ms cubic-bezier(0.16, 1, 0.3, 1),
              transform 600ms cubic-bezier(0.16, 1, 0.3, 1);
}
[data-stagger-grid].is-staggered > * {
  opacity: 1;
  transform: none;
}
[data-stagger-grid].is-staggered > *:nth-child(1)   { transition-delay:   0ms; }
[data-stagger-grid].is-staggered > *:nth-child(2)   { transition-delay: 100ms; }
[data-stagger-grid].is-staggered > *:nth-child(3)   { transition-delay: 200ms; }
[data-stagger-grid].is-staggered > *:nth-child(4)   { transition-delay: 300ms; }
[data-stagger-grid].is-staggered > *:nth-child(n+5) { transition-delay: 400ms; }
```

- [ ] **Step 2: Update the reduced-motion section** (around line 556, inside the existing `@media (prefers-reduced-motion: reduce)` block)

After the existing `[data-reveal]` rule, add:

```css
  [data-stagger-grid] > * {
    opacity: 1 !important;
    transform: none !important;
  }
```

- [ ] **Step 3: Verify dev server starts**

```
npm run dev
```

Expected: no CSS errors in terminal output.

- [ ] **Step 4: Commit**

```
git add src/styles/globals.css
git commit -m "feat: add CSS utilities for drop cap, blockquote, img-zoom, and stagger grid"
```

---

### Task 2: Update JournalPortableText.tsx — drop cap and blockquote

**Files:**
- Modify: `src/components/JournalPortableText.tsx`

The `makeComponents()` function (line 70) uses a closure with a `seen` Map for heading IDs. We add a `firstNormalRendered` flag to the same closure to track which `<p>` gets the drop cap.

- [ ] **Step 1: Add firstNormalRendered flag and update normal renderer**

Find line 71 (inside `makeComponents()`):
```tsx
  const seen = new Map<string, number>();

  return {
    block: {
      // Default paragraph — comfortable reading rhythm + foreground color.
      normal: ({ children }) => (
        <p className="my-m text-foreground/90 leading-relaxed text-lg">{children}</p>
      ),
```

Replace with:
```tsx
  const seen = new Map<string, number>();
  let firstNormalRendered = false;

  return {
    block: {
      // Default paragraph — drop cap on the first paragraph only, via CSS ::first-letter.
      normal: ({ children }) => {
        const isFirst = !firstNormalRendered;
        firstNormalRendered = true;
        return (
          <p className={`my-m text-foreground/90 leading-relaxed text-lg${isFirst ? ' prose-drop-cap' : ''}`}>
            {children}
          </p>
        );
      },
```

- [ ] **Step 2: Update blockquote renderer**

Find (lines 109-113):
```tsx
      blockquote: ({ children }) => (
        <blockquote className="my-l border-l-4 border-primary pl-l italic text-foreground/90 text-lg">
          {children}
        </blockquote>
      ),
```

Replace with:
```tsx
      blockquote: ({ children }) => (
        <blockquote className="prose-blockquote">
          {children}
        </blockquote>
      ),
```

- [ ] **Step 3: Verify TypeScript compiles**

```
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 4: Visual check**

Open any journal post at `http://localhost:4321/journal/[any-slug]`.
Expected: First paragraph starts with a large bronze float cap (the first letter is Cormorant, ~4.5x body size, floated left). Any `<blockquote>` blocks show a 3px bronze left border with Cormorant italic text. Subsequent paragraphs have no drop cap.

- [ ] **Step 5: Commit**

```
git add src/components/JournalPortableText.tsx
git commit -m "feat: add drop cap to journal post opener and bronze blockquote treatment"
```

---

### Task 3: Update ProjectCard.astro — zoom + warm tint on hover

**Files:**
- Modify: `src/components/ProjectCard.astro`

The image wrapper already has `overflow-hidden`. We add `.img-zoom` to it, remove the inline Tailwind hover scale from the `<img>`, and add an `.img-tint` overlay div.

- [ ] **Step 1: Add img-zoom class to image wrapper**

Find:
```astro
<div class="aspect-[4/3] overflow-hidden bg-muted relative">
```

Replace with:
```astro
<div class="aspect-[4/3] overflow-hidden bg-muted relative img-zoom">
```

- [ ] **Step 2: Remove inline hover scale from the img element**

Find:
```astro
class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
```

Replace with:
```astro
class="w-full h-full object-cover"
```

(The `.img-zoom` CSS class handles scale and transition now — the inline Tailwind utilities are superseded.)

- [ ] **Step 3: Add tint overlay div**

Inside the image wrapper (after the `<SanityImage ...>` and its fallback `<div>` sibling, before the closing `</div>` of the image wrapper), add:

```astro
<div class="img-tint" aria-hidden="true"></div>
```

- [ ] **Step 4: Visual check**

Open `http://localhost:4321/portfolio` and hover project cards.
Expected: Image scales smoothly to 1.06x inside the card boundary (card doesn't overflow — it's clipped). A subtle warm bronze tint appears over the image. The card-lift shadow/translateY still applies on the card itself (these are on the `<a>` wrapper, not the image wrapper).

Check dark mode too — the bronze tint should read clearly on dark surfaces.

- [ ] **Step 5: Commit**

```
git add src/components/ProjectCard.astro
git commit -m "feat: add zoom+tint hover treatment to project cards"
```

---

### Task 4: Update JournalCard.astro — zoom + lighter tint on hover

**Files:**
- Modify: `src/components/JournalCard.astro`

Identical pattern to Task 3 but with `img-tint-light` (0.08 opacity instead of 0.15) — appropriate for the more editorial journal context.

- [ ] **Step 1: Add img-zoom class to image wrapper**

Find:
```astro
<div class:list={[aspectClass, 'overflow-hidden bg-muted relative']}>
```

Replace with:
```astro
<div class:list={[aspectClass, 'overflow-hidden bg-muted relative img-zoom']}>
```

- [ ] **Step 2: Remove inline hover scale from the img element**

Find:
```astro
class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
```

Replace with:
```astro
class="w-full h-full object-cover"
```

- [ ] **Step 3: Add tint overlay div (lighter variant)**

Inside the image wrapper, after the `<SanityImage>` element, add:

```astro
<div class="img-tint img-tint-light" aria-hidden="true"></div>
```

- [ ] **Step 4: Visual check**

Open `http://localhost:4321/journal` and hover journal cards.
Expected: Same zoom animation as project cards. Tint is visibly lighter (half the intensity). Also check journal cards embedded on the home page (Featured Journal section).

- [ ] **Step 5: Commit**

```
git add src/components/JournalCard.astro
git commit -m "feat: add zoom+light-tint hover treatment to journal cards"
```

---

### Task 5: Add stagger observer to BaseLayout.astro

**Files:**
- Modify: `src/layouts/BaseLayout.astro`

The `initPolish()` function (line 264) already has an IntersectionObserver for `[data-reveal]`. Add a parallel observer for `[data-stagger-grid]` immediately after it.

- [ ] **Step 1: Insert stagger observer block**

Inside `initPolish()`, after the closing `}` of the `if (reveals.length > 0)` block (around line 289, just before the `// ---- Sticky-header hide on scroll-down` comment), add:

```js
        // ---- Grid stagger entrance ------------------------------------------
        // Adds .is-staggered to each [data-stagger-grid] container as it enters
        // the viewport. The CSS transition-delay on nth-child handles sequencing.
        const staggerGrids = document.querySelectorAll<HTMLElement>('[data-stagger-grid]:not(.is-staggered)');
        if (staggerGrids.length > 0) {
          if (reduceMotion || !('IntersectionObserver' in window)) {
            staggerGrids.forEach((el) => el.classList.add('is-staggered'));
          } else {
            const staggerObserver = new IntersectionObserver(
              (entries) => {
                for (const entry of entries) {
                  if (entry.isIntersecting) {
                    entry.target.classList.add('is-staggered');
                    staggerObserver.unobserve(entry.target);
                  }
                }
              },
              { rootMargin: '0px 0px -60px 0px', threshold: 0.05 },
            );
            staggerGrids.forEach((el) => staggerObserver.observe(el));
          }
        }
```

- [ ] **Step 2: Visual check**

Navigate to `http://localhost:4321/portfolio`. If the grid is above the fold, scroll up above it, then scroll down.
Expected: Grid cards fade up in sequence with 100ms spacing between each. Cards 5 and beyond stagger in together at 400ms.

If all cards are visible on first paint (they're above the fold), open a new tab or navigate away and back — the observer fires on every page load.

- [ ] **Step 3: Commit**

```
git add src/layouts/BaseLayout.astro
git commit -m "feat: add stagger-grid IntersectionObserver to BaseLayout polish init"
```

---

### Task 6: Apply data-stagger-grid to grid containers

**Files:**
- Modify: `src/pages/portfolio/index.astro`
- Modify: `src/pages/journal/index.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/pages/about.astro`
- Modify: `src/pages/services.astro`

One attribute addition per file. All 5 edits can be done in sequence before committing.

- [ ] **Step 1: Portfolio index grid** (`src/pages/portfolio/index.astro`)

Find:
```astro
<ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-l list-none p-0" data-portfolio-cursor-zone>
```

Replace with:
```astro
<ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-l list-none p-0" data-portfolio-cursor-zone data-stagger-grid>
```

- [ ] **Step 2: Journal index grid** (`src/pages/journal/index.astro`)

Find:
```astro
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-l">
```

Replace with:
```astro
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-l" data-stagger-grid>
```

- [ ] **Step 3: Home page services grid** (`src/pages/index.astro`)

Find (inside the services section, section 6):
```astro
<div class="mt-section-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-m">
```

Replace with:
```astro
<div class="mt-section-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-m" data-stagger-grid>
```

- [ ] **Step 4: About page philosophy grid** (`src/pages/about.astro`)

Find (inside the Philosophy section):
```astro
<div class="mt-section-lg grid grid-cols-1 md:grid-cols-3 gap-l">
```

Replace with:
```astro
<div class="mt-section-lg grid grid-cols-1 md:grid-cols-3 gap-l" data-stagger-grid>
```

- [ ] **Step 5: Services page grid** (`src/pages/services.astro`)

Find (inside the main services section):
```astro
<div class="mt-section-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-l">
```

Replace with:
```astro
<div class="mt-section-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-l" data-stagger-grid>
```

- [ ] **Step 6: Visual check across all 5 pages**

Visit each page and scroll to find the grid:
- `http://localhost:4321/portfolio` — project cards stagger in
- `http://localhost:4321/journal` — post cards stagger in
- `http://localhost:4321/` — services section (section 6) cards stagger in
- `http://localhost:4321/about` — philosophy point cards stagger in
- `http://localhost:4321/services` — service cards stagger in

Expected on each: cards fade up one by one with 100ms spacing. No flash of invisible cards on initial paint if the grid is above the fold (the observer should fire quickly enough, but if there's a flash, check that the `:not(.is-staggered)` selector correctly re-fires after navigation).

Test with prefers-reduced-motion enabled (Chrome DevTools > Rendering > "Emulate CSS media feature prefers-reduced-motion: reduce"): all cards should be visible immediately with no animation.

- [ ] **Step 7: Commit**

```
git add src/pages/portfolio/index.astro src/pages/journal/index.astro src/pages/index.astro src/pages/about.astro src/pages/services.astro
git commit -m "feat: apply data-stagger-grid to portfolio, journal, home services, about, and services page grids"
```

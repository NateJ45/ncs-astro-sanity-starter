# Design Polish Batch 2 — JS/Animated Flourishes + Sanity Schema

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 4 design flourishes that require IntersectionObserver or Sanity schema changes: Image Curtain Reveal, Process Connector Lines, Stat Counters, and Page Transition Polish.

**Architecture:** CSS utilities + IntersectionObserver extensions added to BaseLayout's existing `initPolish()` function. Curtain divs injected into specific server-rendered image wrappers. Connector divs added inside ProcessStep.astro's existing flex column. Two new components (StatsRow.astro + StatsCounter.tsx) for the count-up animation. One Sanity schema addition (stats array field on aboutPage). Astro View Transitions is already wired — page transitions are a CSS-only addition.

**Tech Stack:** Astro 6, Tailwind v4, TypeScript, React 19, Sanity v5, `view-transition-name` CSS API, `requestAnimationFrame` for count-up

**Reference spec:** `docs/superpowers/specs/2026-05-29-design-polish-flourishes-design.md` (Flourishes 4, 5, 6, 7)

**IMPORTANT after Task 7:** Run `npm run typegen` then `npm run studio:deploy` — schema changes go live in the hosted Studio only after deploy. Never skip studio:deploy.

---

## File map

| Action | Path |
|--------|------|
| Modify | `src/styles/globals.css` |
| Modify | `src/layouts/BaseLayout.astro` |
| Modify | `src/pages/portfolio/[slug].astro` |
| Modify | `src/components/FeaturedWork.astro` |
| Modify | `src/components/ProcessStep.astro` |
| Modify | `src/pages/process.astro` |
| Modify | `src/pages/index.astro` |
| Modify | `studio/schemaTypes/aboutPage.ts` |
| Modify | `src/lib/queries.ts` |
| Modify | `src/pages/about.astro` |
| Create | `src/components/StatsRow.astro` |
| Create | `src/components/StatsCounter.tsx` |

---

### Task 1: Add Batch 2 CSS utilities to globals.css

**Files:**
- Modify: `src/styles/globals.css`

- [ ] **Step 1: Insert Batch 2 CSS block**

After the stagger grid CSS added in Batch 1 (or at the same insertion point — after `.hero-entry-stagger` reduced-motion reset, before `/* Reading-room paper grain */`), add:

```css
/* ---- Image curtain reveal — a Soft Linen panel scales away from the top
   edge to reveal the image. Triggered by IntersectionObserver in BaseLayout.
   The color matches --background so the reveal feels like materialization,
   not a sliding panel. ---- */
.img-curtain {
  position: absolute;
  inset: 0;
  background: var(--background);
  transform-origin: top center;
  transform: scaleY(1);
  transition: transform 900ms cubic-bezier(0.77, 0, 0.175, 1);
  pointer-events: none;
  z-index: 1;
}
.img-curtain.is-revealed {
  transform: scaleY(0);
}

/* ---- Process connector lines — a 2px bronze thread that draws downward
   from each step number badge. Resting state is Light Gray; the ::after
   fill animates to Warm Bronze when the step is in view.
   Added inside ProcessStep.astro's existing left-column flex container. ---- */
.step-connector {
  flex: 1;
  width: 2px;
  min-height: 2rem;
  background: var(--border);
  position: relative;
  overflow: hidden;
  margin: 0 auto;
}
.step-connector::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--primary);
  transform-origin: top;
  transform: scaleY(0);
  transition: transform 500ms cubic-bezier(0.16, 1, 0.3, 1) 200ms;
}
.step-connector.is-visible::after {
  transform: scaleY(1);
}

/* ---- View transitions — cross-fade for <main> content on every navigation.
   Header and footer are named and pinned with animation: none so they stay
   put during the swap. Astro's ClientRouter is already wired in BaseLayout.
   Astro respects prefers-reduced-motion automatically — no extra rule needed. ---- */
main#main           { view-transition-name: main-content; }
.site-header        { view-transition-name: site-header; }
footer              { view-transition-name: site-footer; }

@keyframes vt-fade-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}
@keyframes vt-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
::view-transition-old(main-content) { animation: vt-fade-out 150ms ease forwards; }
::view-transition-new(main-content) { animation: vt-fade-in  200ms ease forwards; }

::view-transition-old(site-header),
::view-transition-new(site-header),
::view-transition-old(site-footer),
::view-transition-new(site-footer) {
  animation: none;
}
```

- [ ] **Step 2: Add reduced-motion rules**

Inside the existing `@media (prefers-reduced-motion: reduce)` block (around line 544), add after the stagger grid rule from Batch 1:

```css
  /* Curtain: skip the reveal entirely — image always visible */
  .img-curtain { display: none !important; }
  /* Connector: skip the draw animation — Gray track always visible */
  .step-connector::after { transform: scaleY(1) !important; transition: none !important; }
```

- [ ] **Step 3: Verify dev server starts**

```
npm run dev
```

Expected: no CSS errors.

- [ ] **Step 4: Commit**

```
git add src/styles/globals.css
git commit -m "feat: add CSS for curtain reveal, step connector, and cross-fade page transitions"
```

---

### Task 2: Extend BaseLayout.astro observers

**Files:**
- Modify: `src/layouts/BaseLayout.astro`

Two observer blocks: one for `.img-curtain`, one for `.step-connector`. Both are added inside `initPolish()` alongside the existing reveal and stagger observers.

- [ ] **Step 1: Add image curtain observer**

Inside `initPolish()`, after the stagger grid observer block (Task 5 of Batch 1), add:

```js
        // ---- Image curtain reveal -------------------------------------------
        // Adds .is-revealed to each .img-curtain when it enters the viewport.
        // Under reduced-motion, CSS hides curtains entirely so this loop is moot.
        const curtains = document.querySelectorAll<HTMLElement>('.img-curtain:not(.is-revealed)');
        if (curtains.length > 0) {
          if (reduceMotion || !('IntersectionObserver' in window)) {
            curtains.forEach((el) => el.classList.add('is-revealed'));
          } else {
            const curtainObserver = new IntersectionObserver(
              (entries) => {
                for (const entry of entries) {
                  if (entry.isIntersecting) {
                    entry.target.classList.add('is-revealed');
                    curtainObserver.unobserve(entry.target);
                  }
                }
              },
              { rootMargin: '0px 0px -80px 0px', threshold: 0.1 },
            );
            curtains.forEach((el) => curtainObserver.observe(el));
          }
        }
```

- [ ] **Step 2: Add step connector observer**

After the curtain observer block, add:

```js
        // ---- Process connector lines ----------------------------------------
        // Adds .is-visible to each .step-connector when it enters the viewport,
        // triggering the scaleY draw animation on the ::after fill.
        const connectors = document.querySelectorAll<HTMLElement>('.step-connector:not(.is-visible)');
        if (connectors.length > 0) {
          if (reduceMotion || !('IntersectionObserver' in window)) {
            connectors.forEach((el) => el.classList.add('is-visible'));
          } else {
            const connectorObserver = new IntersectionObserver(
              (entries) => {
                for (const entry of entries) {
                  if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    connectorObserver.unobserve(entry.target);
                  }
                }
              },
              { rootMargin: '0px 0px -60px 0px', threshold: 0.05 },
            );
            connectors.forEach((el) => connectorObserver.observe(el));
          }
        }
```

- [ ] **Step 3: Commit**

```
git add src/layouts/BaseLayout.astro
git commit -m "feat: extend BaseLayout initPolish with curtain and connector IntersectionObservers"
```

---

### Task 3: Add image curtain to portfolio detail hero

**Files:**
- Modify: `src/pages/portfolio/[slug].astro`

The project detail hero is a `<figure>` inside `<section>`. Wrap the `<SanityImage>` in a `relative overflow-hidden rounded-md` container and add the curtain div.

- [ ] **Step 1: Wrap hero image and add curtain**

Find (around line 126):
```astro
    <section class="mx-auto max-w-4xl px-m" aria-label="Project hero image">
      <figure>
        <SanityImage
          source={project.heroImage}
          width={1800}
          loading="eager"
          sizes="(min-width: 920px) 896px, 100vw"
          class="w-full h-auto rounded-md"
        />
        {project.heroImage.caption && (
          <figcaption class="mt-s text-sm text-foreground/80 italic text-center">
            {project.heroImage.caption}
          </figcaption>
        )}
      </figure>
    </section>
```

Replace with:
```astro
    <section class="mx-auto max-w-4xl px-m" aria-label="Project hero image">
      <figure>
        <div class="relative overflow-hidden rounded-md">
          <SanityImage
            source={project.heroImage}
            width={1800}
            loading="eager"
            sizes="(min-width: 920px) 896px, 100vw"
            class="w-full h-auto"
          />
          <div class="img-curtain" aria-hidden="true"></div>
        </div>
        {project.heroImage.caption && (
          <figcaption class="mt-s text-sm text-foreground/80 italic text-center">
            {project.heroImage.caption}
          </figcaption>
        )}
      </figure>
    </section>
```

Note: `rounded-md` moves from the `<SanityImage>` class to the wrapper div so the curtain is clipped by the rounded corners.

- [ ] **Step 2: Visual check**

Open any portfolio project at `http://localhost:4321/portfolio/[slug]`.
Expected: On scroll-into-view (or page load if the hero is above the fold), a Soft Linen panel sweeps upward from the top, revealing the hero image beneath. The curtain color matches the page background. On dark mode, the curtain should be the dark background color.

- [ ] **Step 3: Commit**

```
git add src/pages/portfolio/[slug].astro
git commit -m "feat: add image curtain reveal to project detail hero"
```

---

### Task 4: Add image curtain to FeaturedWork.astro hero card

**Files:**
- Modify: `src/components/FeaturedWork.astro`

The hero card image wrapper already has `overflow-hidden relative`. Add the curtain as the last child inside that wrapper.

- [ ] **Step 1: Add curtain div**

Inside `FeaturedWork.astro`, find the hero card's image wrapper (around line 112):
```astro
          <div
            class:list={[
              'overflow-hidden bg-muted relative',
              heroAspectClass,
            ]}
          >
            {hero?.heroImage?.asset ? (
              <SanityImage ... />
            ) : (
              <div class="w-full h-full" aria-hidden="true"></div>
            )}

            {/* Full-height gradient ... */}
            <div
              class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/20 pointer-events-none"
              aria-hidden="true"
            ></div>

            {/* ... chips and text overlay ... */}
          </div>
```

Add the curtain as the LAST element inside this wrapper (after the text overlay div, before the closing `</div>`):

```astro
            <div class="img-curtain" aria-hidden="true"></div>
```

- [ ] **Step 2: Visual check**

Open `http://localhost:4321/` and scroll to the Featured Work section.
Expected: The hero project card image reveals with the curtain sweep. The gradient overlay and title text are visible once the curtain lifts.

- [ ] **Step 3: Commit**

```
git add src/components/FeaturedWork.astro
git commit -m "feat: add image curtain reveal to featured work hero card on home page"
```

---

### Task 5: Update ProcessStep.astro — isLast prop and connector div

**Files:**
- Modify: `src/components/ProcessStep.astro`

The left column is already `flex flex-col items-start gap-s`. Change the grid to `items-stretch` so the left column fills the full card height, allowing `flex: 1` on the connector to fill remaining space. Add `isLast` prop and conditional connector div.

- [ ] **Step 1: Add isLast to Props interface**

Find:
```astro
interface Props {
  step: {
    stepNumber?: number;
    title?: string;
    timeEstimate?: string;
    shortDescription?: string;
    fullDescription?: PortableTextBlock[];
    features?: string[];
    tierNote?: string;
  };
  /** "preview" (homepage) shows just shortDescription. "full" (Process page) shows fullDescription + features. */
  variant?: 'preview' | 'full';
}
```

Replace with:
```astro
interface Props {
  step: {
    stepNumber?: number;
    title?: string;
    timeEstimate?: string;
    shortDescription?: string;
    fullDescription?: PortableTextBlock[];
    features?: string[];
    tierNote?: string;
  };
  /** "preview" (homepage) shows just shortDescription. "full" (Process page) shows fullDescription + features. */
  variant?: 'preview' | 'full';
  /** When true, skips the connector line below the step number badge. Pass on the last step in any sequence. */
  isLast?: boolean;
}
```

- [ ] **Step 2: Destructure isLast from props**

Find:
```astro
const { step, variant = 'preview' } = Astro.props as Props;
```

Replace with:
```astro
const { step, variant = 'preview', isLast = false } = Astro.props as Props;
```

- [ ] **Step 3: Change grid alignment and add connector div**

Find:
```astro
<article class="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-m md:gap-l items-start">
  <div class="flex flex-col items-start gap-s">
    {/* Soft-sage line illustration above the step numeral. Renders nothing for
        steps outside 1-4 so the numeral-only treatment still works. */}
    <ProcessStepIllustration stepNumber={step.stepNumber} />
    <div class="font-display text-[clamp(3rem,8vw,5.5rem)] leading-none text-link/85 select-none">
      {padNum(step.stepNumber)}
    </div>
  </div>
```

Replace with:
```astro
<article class="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-m md:gap-l items-stretch">
  <div class="flex flex-col items-start gap-s">
    {/* Soft-sage line illustration above the step numeral. Renders nothing for
        steps outside 1-4 so the numeral-only treatment still works. */}
    <ProcessStepIllustration stepNumber={step.stepNumber} />
    <div class="font-display text-[clamp(3rem,8vw,5.5rem)] leading-none text-link/85 select-none">
      {padNum(step.stepNumber)}
    </div>
    {!isLast && <div class="step-connector" aria-hidden="true"></div>}
  </div>
```

- [ ] **Step 4: Commit**

```
git add src/components/ProcessStep.astro
git commit -m "feat: add isLast prop and step-connector to ProcessStep"
```

---

### Task 6: Pass isLast to ProcessStep in process.astro and index.astro

**Files:**
- Modify: `src/pages/process.astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Update process.astro step loop**

In `src/pages/process.astro`, find the step rendering loop (around line 70):
```astro
      {processSteps.map((step: any, i: number) => (
        <div class={i > 0 ? 'pt-section-lg border-t border-border-soft' : ''}>
          <ProcessStep step={step} variant="full" />
        </div>
      ))}
```

Replace with:
```astro
      {processSteps.map((step: any, i: number) => (
        <div class={i > 0 ? 'pt-section-lg border-t border-border-soft' : ''}>
          <ProcessStep step={step} variant="full" isLast={i === processSteps.length - 1} />
        </div>
      ))}
```

- [ ] **Step 2: Update index.astro process preview loop**

In `src/pages/index.astro`, find the process preview rendering (around line 284):
```astro
        {processSteps.slice(0, 4).map((step: any) => (
          <ProcessStep step={step} variant="preview" />
        ))}
```

Replace with:
```astro
        {processSteps.slice(0, 4).map((step: any, i: number, arr) => (
          <ProcessStep step={step} variant="preview" isLast={i === arr.length - 1} />
        ))}
```

- [ ] **Step 3: Visual check**

Open `http://localhost:4321/process`. Scroll through the steps.
Expected: A 2px line appears below each step number badge, extending toward the next step. The line animates from 0 to full height as each step scrolls into view (500ms draw with a 200ms delay). The last step has no connector.

Open `http://localhost:4321/`. Scroll to the "How It Works" section.
Expected: Same connector behavior in the 2-column preview grid. On mobile (single column), connectors extend between stacked steps.

- [ ] **Step 4: Commit**

```
git add src/pages/process.astro src/pages/index.astro
git commit -m "feat: pass isLast to ProcessStep in process page and home preview"
```

---

### Task 7: Add stats schema to aboutPage.ts

**Files:**
- Modify: `studio/schemaTypes/aboutPage.ts`

Add a `stats` array field to the `aboutPage` schema. It belongs in a new `stats` group so Staci sees it clearly in Studio. The section auto-suppresses when the array is empty or absent.

- [ ] **Step 1: Add stats group**

In `studio/schemaTypes/aboutPage.ts`, find the groups array (around line 11):
```typescript
  groups: [
    { name: 'seo', title: 'SEO' },
    { name: 'hero', title: 'Hero' },
    { name: 'story', title: 'Story' },
    { name: 'philosophy', title: 'Philosophy' },
    { name: 'personal', title: 'Personal' },
    { name: 'final', title: 'Final CTA' },
  ],
```

Replace with:
```typescript
  groups: [
    { name: 'seo', title: 'SEO' },
    { name: 'hero', title: 'Hero' },
    { name: 'story', title: 'Story' },
    { name: 'philosophy', title: 'Philosophy' },
    { name: 'personal', title: 'Personal' },
    { name: 'stats', title: 'Stats' },
    { name: 'final', title: 'Final CTA' },
  ],
```

- [ ] **Step 2: Add stats field**

Before the `finalCtaEyebrow` field (around line 214), insert:

```typescript
    defineField({
      name: 'stats',
      title: 'Stats',
      type: 'array',
      group: 'stats',
      description: 'Up to 4 numbers displayed as large display figures on the About page. Leave empty to hide the section.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'statItem',
          fields: [
            defineField({ name: 'number', title: 'Number', type: 'number', validation: (R) => R.required() }),
            defineField({
              name: 'suffix',
              title: 'Suffix (optional)',
              type: 'string',
              description: 'e.g. + or k. Appended directly after the number.',
            }),
            defineField({ name: 'label', title: 'Label', type: 'string', description: 'e.g. Years in Business', validation: (R) => R.required() }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'number' },
            prepare: ({ title, subtitle }) => ({ title, subtitle: String(subtitle) }),
          },
        }),
      ],
      validation: (Rule) => Rule.max(4),
    }),
```

- [ ] **Step 3: Run typegen**

```
npm run typegen
```

Expected: `src/lib/sanity.types.ts` regenerates with the new `stats` field on `AboutPage`.

- [ ] **Step 4: Deploy Studio**

```
npm run studio:deploy
```

Expected: Studio deploys successfully. Staci will see a new "Stats" tab in the About Page document.

- [ ] **Step 5: Commit**

```
git add studio/schemaTypes/aboutPage.ts src/lib/sanity.types.ts
git commit -m "feat: add stats array field to aboutPage Sanity schema"
```

---

### Task 8: Update getAboutPage query in queries.ts

**Files:**
- Modify: `src/lib/queries.ts`

- [ ] **Step 1: Add stats to the GROQ projection**

In `src/lib/queries.ts`, find the `getAboutPage` function (around line 131). Inside the GROQ query, find:
```
    candidPhoto${IMAGE_PROJECTION},
    finalCtaEyebrow, finalCtaHeadline, finalCtaScriptAccent, finalCtaSubhead,
```

Replace with:
```
    candidPhoto${IMAGE_PROJECTION},
    stats[]{number, suffix, label},
    finalCtaEyebrow, finalCtaHeadline, finalCtaScriptAccent, finalCtaSubhead,
```

- [ ] **Step 2: Commit**

```
git add src/lib/queries.ts
git commit -m "feat: add stats projection to getAboutPage GROQ query"
```

---

### Task 9: Create StatsRow.astro and StatsCounter.tsx

**Files:**
- Create: `src/components/StatsRow.astro`
- Create: `src/components/StatsCounter.tsx`

`StatsRow.astro` is the server-rendered shell that conditionally renders the section and passes data to `StatsCounter.tsx`. `StatsCounter.tsx` is the React island that handles count-up animation.

- [ ] **Step 1: Create StatsRow.astro**

Create `src/components/StatsRow.astro` with this content:

```astro
---
// Safe to edit by hand
// Layout shell for the stat counters section on the About page.
// Renders nothing when stats is empty — About page is unchanged until Staci
// fills in the Stats tab in Studio.

import StatsCounter from './StatsCounter';

interface StatItem {
  number: number;
  suffix?: string;
  label: string;
}

interface Props {
  stats: StatItem[];
}

const { stats } = Astro.props as Props;
---

{stats.length > 0 && (
  <section class="bg-background" aria-label="Studio stats">
    <div class="mx-auto max-w-content px-m py-section-md">
      <StatsCounter stats={stats} client:visible />
    </div>
  </section>
)}
```

- [ ] **Step 2: Create StatsCounter.tsx**

Create `src/components/StatsCounter.tsx` with this content:

```tsx
// Foundation, edit with care
// Count-up animation for studio stats on the About page.
// Uses requestAnimationFrame with easeOutQuart easing — no extra dependencies.
// Each number counts from 0 to its target value over 1.8 seconds when the
// section scrolls into view. Respects prefers-reduced-motion: renders final
// values immediately when the user prefers reduced motion.

import React, { useEffect, useRef, useState } from 'react';

interface StatItem {
  number: number;
  suffix?: string;
  label: string;
}

interface Props {
  stats: StatItem[];
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function AnimatedNumber({ target, suffix, duration, run }: {
  target: number;
  suffix?: string;
  duration: number;
  run: boolean;
}) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const hasStarted = useRef(false);
  const reduceMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  useEffect(() => {
    if (!run) return;
    if (reduceMotion) { setValue(target); return; }
    if (hasStarted.current) return;
    hasStarted.current = true;

    const animate = (time: number) => {
      if (!startTimeRef.current) startTimeRef.current = time;
      const elapsed = time - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.round(easeOutQuart(progress) * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [run, target, duration, reduceMotion]);

  return (
    <span>
      {value}
      {suffix && (
        <span className="text-[0.6em] align-super text-secondary">{suffix}</span>
      )}
    </span>
  );
}

export default function StatsCounter({ stats }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -80px 0px', threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="flex flex-wrap justify-center gap-8 md:gap-12"
      aria-label="Studio statistics"
    >
      {stats.map((stat, i) => (
        <React.Fragment key={stat.label}>
          {i > 0 && (
            <div
              className="hidden md:block w-px bg-border self-stretch my-2"
              aria-hidden="true"
            />
          )}
          <div className="text-center">
            <span className="block font-display text-[clamp(2.5rem,6vw,3.5rem)] leading-none font-normal text-primary">
              <AnimatedNumber
                target={stat.number}
                suffix={stat.suffix}
                duration={1800}
                run={visible}
              />
            </span>
            <span className="block mt-2 text-[0.62rem] uppercase tracking-eyebrow text-muted-foreground">
              {stat.label}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```
git add src/components/StatsRow.astro src/components/StatsCounter.tsx
git commit -m "feat: add StatsRow layout shell and StatsCounter count-up React island"
```

---

### Task 10: Add StatsRow to about.astro

**Files:**
- Modify: `src/pages/about.astro`

- [ ] **Step 1: Import StatsRow**

In `src/pages/about.astro`, find the existing imports (around line 20):
```astro
import FinalCta from '@/components/FinalCta.astro';
import PressStrip from '@/components/PressStrip.astro';
import AboutPersonal from '@/components/AboutPersonal.astro';
```

Add after:
```astro
import StatsRow from '@/components/StatsRow.astro';
```

- [ ] **Step 2: Add stats extraction**

In the frontmatter, after `const philosophyPoints = page?.philosophyPoints ?? [];`, add:

```astro
const stats = page?.stats ?? [];
```

- [ ] **Step 3: Insert StatsRow between PressStrip and FinalCta**

Find:
```astro
  {/* ------- 5. Final CTA ---------------------------------------------------- */}
  <FinalCta
```

Replace with:
```astro
  {/* ------- 5. Stat counters ------------------------------------------------ */}
  <StatsRow stats={stats} />

  {/* ------- 6. Final CTA ---------------------------------------------------- */}
  <FinalCta
```

- [ ] **Step 4: Visual check**

Open `http://localhost:4321/about`. If stats have been seeded in Sanity, you'll see the count-up section. If not, the section suppresses and the page looks unchanged — which is the correct empty-state behavior.

To test the stats display without entering real data in Studio, temporarily add a stats array to the page's fallback values in about.astro, verify it renders correctly, then remove it before committing.

Expected when populated: Large Cormorant numerals in Warm Bronze, centered row, thin vertical dividers between stats. On scroll into view, numbers count up from 0 with easeOutQuart over 1.8 seconds. On mobile the dividers hide and stats stack vertically.

- [ ] **Step 5: Verify TypeScript compiles**

```
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 6: Commit**

```
git add src/pages/about.astro
git commit -m "feat: add StatsRow section to About page — suppresses until Staci fills in Studio"
```

---

## Post-implementation verification

After all tasks complete, run a full build to confirm no regressions:

```
npm run build
```

Expected: build completes without errors. Check output for any TypeScript or Astro compilation warnings.

Verify visually in both light and dark mode on mobile and desktop:
- `http://localhost:4321/` — home hero + services stagger + FeaturedWork curtain + process preview connectors
- `http://localhost:4321/portfolio` — project card hover treatment + stagger grid
- `http://localhost:4321/portfolio/[any-slug]` — hero curtain reveal
- `http://localhost:4321/journal/[any-slug]` — drop cap + blockquote treatment
- `http://localhost:4321/process` — connector lines between steps
- `http://localhost:4321/about` — philosophy stagger + stats section (if populated)
- Navigate between any two pages and verify the cross-fade transition plays at ~300ms total

Test with prefers-reduced-motion enabled: no animations, no curtain flash, connectors draw instantly (Gray track always visible), stats show final numbers immediately.

# About + Contact + Editable Start Here Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the contact form's lead-source options, fix the About philosophy card numbering, add an editable "personal" section to the About page, and make the Start Here guide + business notes editable in Sanity.

**Architecture:** Additive Sanity schema changes drive new front-end rendering. The About personal section is a new Astro component fed by new `aboutPage` fields. The Start Here guide becomes two protected singletons (`studioGuide`, `studioNotes`) that the existing Studio React panels fetch via `useClient`, the same pattern `BusinessOverview` already uses for live data. Brand Kit stays code-driven on purpose.

**Tech Stack:** Astro 6 (static), Sanity v5 schemas + Studio, React 19 islands, Tailwind 4, `@sanity/ui` for Studio panels. No unit-test runner in this repo: verification is `npm run typegen` + `npm run build` + Playwright MCP visual checks + Lighthouse, run from `reid-design-site/`.

**Conventions for this repo:**
- All commands run from `reid-design-site/` unless noted.
- After ANY schema edit: `npm run typegen`, then later `npm run studio:deploy`. Never click "Remove field" in the hosted Studio.
- Site copy follows the brand voice: warm, plain, no em-dashes, no designer-speak ("transformative", "curated", "elevated", "tailored", "investment in your space").
- Commit per task. Do NOT push; pushing to main triggers a deploy and is done only when the user asks.

---

## File Structure

**Create:**
- `src/components/AboutPersonal.astro` — renders the new About "personal" section; each module self-hides when empty.
- `studio/schemaTypes/studioGuide.ts` — singleton: editable Start Here guide content.
- `studio/schemaTypes/studioNotes.ts` — singleton: editable business/ideal-client/voice notes.
- `scripts/seed-studio-guide.mjs` — seeds `studioGuide` + `studioNotes` from current hardcoded content.
- `scripts/seed-about-personal.mjs` — seeds placeholder content into `aboutPage.personal`.

**Modify:**
- `src/components/ContactForm.tsx` — add two `SOURCE_OPTIONS`.
- `scripts/patch-contact-form-options.mjs` — sync project types + refreshed sources to Sanity.
- `src/pages/about.astro` — number cards by position; render `AboutPersonal`.
- `studio/schemaTypes/philosophyPoint.ts` — `displayOrder` optional + reworded.
- `studio/schemaTypes/aboutPage.ts` — new `personal` group + fields.
- `src/lib/queries.ts` — project the new About fields.
- `studio/schemaTypes/index.ts` — register the two new singletons.
- `studio/components/StudioGuide.tsx` — fetch + render `studioGuide`.
- `studio/components/BusinessOverview.tsx` — fetch + render `studioNotes` for the static sections.
- `studio/structure.ts` — Start Here items become editable docs with views; add singletons to sets.
- `studio/sanity.config.ts` — add the two singletons to `SINGLETON_TYPES`.
- `CLAUDE.md`, `OPERATIONS.md` — document the changes.

---

## Workstream A — Contact form dropdowns

### Task 1: Add the two new lead-source options in code

**Files:**
- Modify: `src/components/ContactForm.tsx:95-105`

- [ ] **Step 1: Edit `SOURCE_OPTIONS`**

Replace the existing `SOURCE_OPTIONS` array with this (adds "Took the style quiz" and "Downloaded a free guide", grouped before "Reading the journal"):

```tsx
const SOURCE_OPTIONS = [
  'Google search',
  'Instagram',
  'Facebook',
  'Houzz',
  'Friend or family referral',
  'Builder or realtor referral',
  'Took the style quiz',
  'Downloaded a free guide',
  'Reading the journal',
  'Saw a project in person',
  'Other',
] as const;
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: build completes with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ContactForm.tsx
git commit -m "Add style-quiz and guide-download to contact lead-source options"
```

### Task 2: Sync project types + sources into Sanity via the patch script

**Files:**
- Modify: `scripts/patch-contact-form-options.mjs`

- [ ] **Step 1: Add the project-type and source lists, and force-set them**

After the existing `formSourceOptions` constant (around line 81), add the project-type list and update the source list to match Task 1:

```js
// Canonical project-type list. Mirrors DEFAULT_PROJECT_TYPES in ContactForm.tsx.
const formProjectTypeOptions = [
  'In-Home Consultation',
  'E-Design',
  'Full Room Design',
  'Full Room Design + Styling',
  'Shopping & Sourcing',
  'Builder or Realtor Partnership',
  'Gift Certificate',
  "Not sure yet, let's chat",
];
```

Then replace the four-element `formSourceOptions` array so it includes the two new entries (same order as Task 1).

- [ ] **Step 2: Force-set the two lists that must stay current**

Replace the `run()` body so `formProjectTypeOptions` and `formSourceOptions` are always set to the canonical list (force overwrite, since a stale value here silently overrides the good code default), while location/budget/timeline keep the set-if-missing guard:

```js
async function run() {
  const contactDoc = await client.fetch(`*[_type == "contactPage"][0]{ _id }`);
  if (!contactDoc?._id) {
    console.error('No contactPage document found');
    process.exit(1);
  }

  const existing = await client.getDocument(contactDoc._id);

  // These two must always reflect current offerings/funnel — force-set them.
  const patch = {
    formProjectTypeOptions,
    formSourceOptions,
  };

  // These keep the set-if-missing guard (Staci may have customized them).
  const setIfMissing = [
    ['formLocationOptions', formLocationOptions],
    ['formBudgetOptions', formBudgetOptions],
    ['formTimelineOptions', formTimelineOptions],
  ];
  for (const [key, value] of setIfMissing) {
    if (!Array.isArray(existing?.[key]) || existing[key].length === 0) {
      patch[key] = value;
    }
  }

  await client.patch(contactDoc._id).set(patch).commit();
  console.log(`[ok] contactPage: set ${Object.keys(patch).join(', ')}`);
}
```

- [ ] **Step 3: Run the script against the dataset**

Run: `node scripts/patch-contact-form-options.mjs`
Expected: `[ok] contactPage: set formProjectTypeOptions, formSourceOptions` (plus any of the three that were missing).

- [ ] **Step 4: Commit**

```bash
git add scripts/patch-contact-form-options.mjs
git commit -m "Sync contact project-type + lead-source options into Sanity"
```

---

## Workstream B — About card numbering

### Task 3: Number philosophy cards by position

**Files:**
- Modify: `src/pages/about.astro:151`

- [ ] **Step 1: Change the numeral source**

Replace:

```astro
                {String((point.displayOrder ?? idx + 1)).padStart(2, '0')}
```

with:

```astro
                {String(idx + 1).padStart(2, '0')}
```

This numbers each card by its rendered position, so they always read 01 / 02 / 03 regardless of `orderRank` vs `displayOrder` drift.

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: build completes; no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/about.astro
git commit -m "Number About philosophy cards by position, not stored order"
```

### Task 4: Make `displayOrder` optional and reworded

**Files:**
- Modify: `studio/schemaTypes/philosophyPoint.ts:28-34`

- [ ] **Step 1: Edit the `displayOrder` field**

Replace the `displayOrder` `defineField` with:

```ts
    defineField({
      name: 'displayOrder',
      title: 'Display order (optional)',
      type: 'number',
      description:
        'Optional. The cards are ordered by dragging them in the Philosophy Values list, and the 01/02/03 numbers on the page are automatic. This field is just a backup sort key.',
      validation: (Rule) => Rule.integer().min(1),
    }),
```

(Removed `.required()`; kept `.integer().min(1)`.)

- [ ] **Step 2: Regenerate types**

Run: `npm run typegen`
Expected: completes; `src/lib/sanity.types.ts` updated, no errors.

- [ ] **Step 3: Commit**

```bash
git add studio/schemaTypes/philosophyPoint.ts src/lib/sanity.types.ts
git commit -m "Make philosophyPoint displayOrder optional; clarify it's a backup sort"
```

---

## Workstream C — About page "personal" section

### Task 5: Add the `personal` field group + fields to `aboutPage`

**Files:**
- Modify: `studio/schemaTypes/aboutPage.ts`

- [ ] **Step 1: Add the `personal` group**

In the `groups` array (currently `seo / hero / story / philosophy / final`), insert `personal` before `final`:

```ts
    { name: 'philosophy', title: 'Philosophy' },
    { name: 'personal', title: 'Personal' },
    { name: 'final', title: 'Final CTA' },
```

- [ ] **Step 2: Add the personal fields**

Insert these `defineField` entries immediately after the `philosophyHeadline` field (before the `finalCtaEyebrow` field):

```ts
    defineField({
      name: 'personalEyebrow',
      title: 'Personal section eyebrow',
      type: 'string',
      group: 'personal',
      initialValue: 'Off the Clock.',
    }),
    defineField({
      name: 'personalHeadline',
      title: 'Personal section headline',
      type: 'string',
      group: 'personal',
      initialValue: 'A little more about me.',
    }),
    defineField({
      name: 'personalIntro',
      title: 'Personal section intro (optional)',
      type: 'text',
      rows: 2,
      group: 'personal',
      description: 'One friendly sentence under the headline. Optional.',
    }),
    defineField({
      name: 'currentlyList',
      title: 'Currently',
      type: 'array',
      group: 'personal',
      description: 'A short "what I\'m into right now" list. Refresh it anytime. Example label "Reading", value "the book title".',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'currentlyRow',
          fields: [
            defineField({ name: 'label', title: 'Label', type: 'string', description: 'e.g. Reading, Listening to, Loving right now', validation: (R) => R.required() }),
            defineField({ name: 'value', title: 'Value', type: 'string', validation: (R) => R.required() }),
          ],
          preview: { select: { title: 'label', subtitle: 'value' } },
        }),
      ],
    }),
    defineField({
      name: 'rapidFire',
      title: 'Rapid fire',
      type: 'array',
      group: 'personal',
      description: 'Short prompt-and-answer pairs. Example prompt "Coffee order", answer "Oat latte, extra hot".',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'rapidFireRow',
          fields: [
            defineField({ name: 'prompt', title: 'Prompt', type: 'string', validation: (R) => R.required() }),
            defineField({ name: 'answer', title: 'Answer', type: 'string', validation: (R) => R.required() }),
          ],
          preview: { select: { title: 'prompt', subtitle: 'answer' } },
        }),
      ],
    }),
    defineField({
      name: 'localSpots',
      title: 'Favorite local spots',
      type: 'array',
      group: 'personal',
      description: 'Go-to places around Plainfield and Indy. Name plus an optional short note.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'localSpotRow',
          fields: [
            defineField({ name: 'name', title: 'Name', type: 'string', validation: (R) => R.required() }),
            defineField({ name: 'note', title: 'Short note (optional)', type: 'string' }),
          ],
          preview: { select: { title: 'name', subtitle: 'note' } },
        }),
      ],
    }),
    defineField({
      name: 'beyondDesign',
      title: 'Beyond design',
      type: 'text',
      rows: 4,
      group: 'personal',
      description: 'A short, casual paragraph or two about life outside work: family, the dogs, hobbies. Write the way you talk.',
    }),
    defineField({
      name: 'candidPhoto',
      title: 'Candid photo (optional)',
      type: 'image',
      group: 'personal',
      description: 'A relaxed, non-portrait photo. Skip the polished headshot here; warmth beats polish.',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (R) => R.required() }),
      ],
    }),
```

- [ ] **Step 3: Regenerate types**

Run: `npm run typegen`
Expected: completes; `aboutPage` type in `src/lib/sanity.types.ts` now includes the personal fields.

- [ ] **Step 4: Commit**

```bash
git add studio/schemaTypes/aboutPage.ts src/lib/sanity.types.ts
git commit -m "Add editable personal section fields to aboutPage schema"
```

### Task 6: Project the personal fields in `getAboutPage`

**Files:**
- Modify: `src/lib/queries.ts:144-146`

- [ ] **Step 1: Extend the projection**

In `getAboutPage`, after the `philosophyEyebrow, philosophyHeadline,` line and the `philosophyPoints` sub-query, add the personal fields before `finalCtaEyebrow`:

```groq
    philosophyEyebrow, philosophyHeadline,
    "philosophyPoints": *[_type == "philosophyPoint"] | order(orderRank asc, displayOrder asc){
      title, description, displayOrder
    },
    personalEyebrow, personalHeadline, personalIntro,
    currentlyList[]{label, value},
    rapidFire[]{prompt, answer},
    localSpots[]{name, note},
    beyondDesign,
    candidPhoto${IMAGE_PROJECTION},
    finalCtaEyebrow, finalCtaHeadline, finalCtaScriptAccent, finalCtaSubhead,
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: completes; no errors. (The query is untyped `client.fetch`, so this just confirms no syntax break.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries.ts
git commit -m "Project About personal fields in getAboutPage query"
```

### Task 7: Create the `AboutPersonal.astro` component

**Files:**
- Create: `src/components/AboutPersonal.astro`

- [ ] **Step 1: Write the component**

```astro
---
// Safe to edit by hand for copy + structure changes.
// "Personal" section on the About page: a few human, off-the-clock modules that
// make Staci read as a person, not a brand. Every module self-hides when its
// data is empty, and the whole section renders nothing when all are empty.
// Fed by the aboutPage singleton's `personal` field group (see queries.ts).

import SectionHeading from '@/components/SectionHeading.astro';
import SanityImage from '@/components/SanityImage.astro';

interface CurrentlyRow { label?: string; value?: string }
interface RapidFireRow { prompt?: string; answer?: string }
interface LocalSpotRow { name?: string; note?: string }

interface Props {
  eyebrow?: string;
  headline?: string;
  intro?: string;
  currentlyList?: CurrentlyRow[];
  rapidFire?: RapidFireRow[];
  localSpots?: LocalSpotRow[];
  beyondDesign?: string;
  candidPhoto?: any;
}

const {
  eyebrow,
  headline,
  intro,
  currentlyList = [],
  rapidFire = [],
  localSpots = [],
  beyondDesign,
  candidPhoto,
} = Astro.props;

// Drop half-empty Sanity rows so they don't render blank lines.
const currently = (currentlyList ?? []).filter((r) => r?.label?.trim() && r?.value?.trim());
const rapid = (rapidFire ?? []).filter((r) => r?.prompt?.trim() && r?.answer?.trim());
const spots = (localSpots ?? []).filter((r) => r?.name?.trim());
const hasBeyond = Boolean(beyondDesign?.trim() || candidPhoto?.asset);

const hasAnything =
  currently.length > 0 || rapid.length > 0 || spots.length > 0 || hasBeyond;

const cardClass =
  'card-lift bg-card rounded-md border border-border-soft shadow-[0_4px_18px_-14px_rgba(61,61,61,0.18)] overflow-hidden';
---

{hasAnything && (
  <section class="bg-background" aria-labelledby="about-personal-heading">
    <div class="mx-auto max-w-content px-m py-section-lg">
      <SectionHeading
        eyebrow={eyebrow ?? 'Off the Clock.'}
        headline={headline ?? 'A little more about me.'}
        headingId="about-personal-heading"
        align="center"
        class="mx-auto"
      />
      {intro && (
        <p class="mt-m mx-auto max-w-2xl text-center text-foreground/85 text-lg leading-relaxed">
          {intro}
        </p>
      )}

      <div class="mt-section-lg grid grid-cols-1 lg:grid-cols-2 gap-l items-start">
        {/* Left column: Currently + Beyond design */}
        {(currently.length > 0 || hasBeyond) && (
          <div class="space-y-l">
            {currently.length > 0 && (
              <article class={cardClass}>
                <div class="h-0.5 bg-primary" aria-hidden="true"></div>
                <div class="p-l">
                  <h3 class="font-display text-h3 text-foreground">Currently</h3>
                  <dl class="mt-m divide-y divide-border-soft">
                    {currently.map((row) => (
                      <div class="flex items-baseline justify-between gap-m py-s">
                        <dt class="text-xs uppercase tracking-eyebrow text-foreground/80 shrink-0">{row.label}</dt>
                        <dd class="text-foreground text-right">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </article>
            )}
            {hasBeyond && (
              <article class={cardClass}>
                <div class="h-0.5 bg-primary" aria-hidden="true"></div>
                <div class="p-l">
                  {candidPhoto?.asset && (
                    <SanityImage
                      source={candidPhoto}
                      width={900}
                      sizes="(min-width: 1024px) 40vw, 100vw"
                      quality={75}
                      class="w-full h-auto rounded-md mb-m"
                    />
                  )}
                  {beyondDesign && (
                    <p class="text-foreground/85 leading-relaxed whitespace-pre-line">{beyondDesign}</p>
                  )}
                </div>
              </article>
            )}
          </div>
        )}

        {/* Right column: Rapid fire + Local spots */}
        {(rapid.length > 0 || spots.length > 0) && (
          <div class="space-y-l">
            {rapid.length > 0 && (
              <article class={cardClass}>
                <div class="h-0.5 bg-primary" aria-hidden="true"></div>
                <div class="p-l">
                  <h3 class="font-display text-h3 text-foreground">Rapid fire</h3>
                  <dl class="mt-m grid grid-cols-1 sm:grid-cols-2 gap-m">
                    {rapid.map((row) => (
                      <div>
                        <dt class="text-xs uppercase tracking-eyebrow text-foreground/80">{row.prompt}</dt>
                        <dd class="mt-xs text-foreground">{row.answer}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </article>
            )}
            {spots.length > 0 && (
              <article class={cardClass}>
                <div class="h-0.5 bg-primary" aria-hidden="true"></div>
                <div class="p-l">
                  <h3 class="font-display text-h3 text-foreground">Favorite local spots</h3>
                  <ul class="mt-m space-y-s">
                    {spots.map((row) => (
                      <li class="flex flex-col">
                        <span class="text-foreground font-semibold">{row.name}</span>
                        {row.note && <span class="text-foreground/80 text-sm">{row.note}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            )}
          </div>
        )}
      </div>
    </div>
  </section>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AboutPersonal.astro
git commit -m "Add AboutPersonal section component"
```

### Task 8: Wire `AboutPersonal` into the About page

**Files:**
- Modify: `src/pages/about.astro` (import block + section placement between Philosophy and PressStrip)

- [ ] **Step 1: Add the import**

After the `import PressStrip from '@/components/PressStrip.astro';` line, add:

```astro
import AboutPersonal from '@/components/AboutPersonal.astro';
```

- [ ] **Step 2: Render the section**

Between the Philosophy section closing (the `{philosophyPoints.length > 0 && ( ... )}` block) and the `{/* ------- 4. Press strip ... */}` comment, insert:

```astro
  {/* ------- 3b. Personal ("Off the clock") ------------------------------- */}
  <AboutPersonal
    eyebrow={page?.personalEyebrow}
    headline={page?.personalHeadline}
    intro={page?.personalIntro}
    currentlyList={page?.currentlyList}
    rapidFire={page?.rapidFire}
    localSpots={page?.localSpots}
    beyondDesign={page?.beyondDesign}
    candidPhoto={page?.candidPhoto}
  />
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: completes; no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/about.astro
git commit -m "Render personal section on the About page"
```

### Task 9: Seed placeholder personal content

**Files:**
- Create: `scripts/seed-about-personal.mjs`

- [ ] **Step 1: Write the seeder**

Model it on `scripts/patch-contact-form-options.mjs` for the `.env` loading + client setup (copy the top block verbatim: `createClient`, `readFileSync`, env parse, the `projectId/dataset/apiVersion/token` reads, and the missing-vars guard). Then:

```js
const PERSONAL = {
  personalEyebrow: 'Off the Clock.',
  personalHeadline: 'A little more about me.',
  personalIntro: 'Design is the job, but it is not the whole story. A few honest things about who you would be working with.',
  currentlyList: [
    { _key: 'cur1', _type: 'currentlyRow', label: 'Reading', value: 'Anything with a good floor plan and a little drama.' },
    { _key: 'cur2', _type: 'currentlyRow', label: 'Listening to', value: 'A rotating mix of 70s soul and home-reno podcasts.' },
    { _key: 'cur3', _type: 'currentlyRow', label: "Can't stop sourcing", value: 'Vintage brass lamps. I have a problem.' },
    { _key: 'cur4', _type: 'currentlyRow', label: 'Loving right now', value: 'Warm plaster walls and unlacquered hardware.' },
  ],
  rapidFire: [
    { _key: 'rf1', _type: 'rapidFireRow', prompt: 'Coffee order', answer: 'Oat latte, extra hot.' },
    { _key: 'rf2', _type: 'rapidFireRow', prompt: "Can't-live-without piece", answer: 'A good floor lamp in every room.' },
    { _key: 'rf3', _type: 'rapidFireRow', prompt: 'Sunday looks like', answer: 'Coffee, a long walk with the dogs, and rearranging one shelf I said I would leave alone.' },
    { _key: 'rf4', _type: 'rapidFireRow', prompt: 'Most-used tool', answer: 'A measuring tape and a strong opinion.' },
  ],
  localSpots: [
    { _key: 'ls1', _type: 'localSpotRow', name: 'Downtown Plainfield', note: 'Saturday morning errands and a coffee.' },
    { _key: 'ls2', _type: 'localSpotRow', name: 'Mass Ave, Indianapolis', note: 'Best window-shopping for color ideas.' },
    { _key: 'ls3', _type: 'localSpotRow', name: 'Local vintage shops', note: 'Where half my favorite finds come from.' },
  ],
  beyondDesign:
    'Outside the studio I am usually chasing two dogs around the yard, repainting something that did not need repainting, or talking a friend out of beige. I grew up in central Indiana and still think the best design ideas come from real houses, not showrooms.',
};

async function run() {
  const doc = await client.fetch(`*[_type == "aboutPage"][0]{ _id, personalHeadline }`);
  if (!doc?._id) {
    console.error('No aboutPage document found');
    process.exit(1);
  }
  // Only seed if the personal section has not been filled in yet, so we never
  // clobber Staci's edits.
  if (doc.personalHeadline && doc.personalHeadline !== 'A little more about me.') {
    console.log('Personal section already customized. No changes made.');
    return;
  }
  await client.patch(doc._id).set(PERSONAL).commit();
  console.log('[ok] aboutPage: seeded personal section placeholders');
}

run().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Run the seeder**

Run: `node scripts/seed-about-personal.mjs`
Expected: `[ok] aboutPage: seeded personal section placeholders`.

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-about-personal.mjs
git commit -m "Seed placeholder About personal-section content"
```

---

## Workstream D — Editable Start Here guide

### Task 10: Create the `studioGuide` + `studioNotes` singletons

**Files:**
- Create: `studio/schemaTypes/studioGuide.ts`
- Create: `studio/schemaTypes/studioNotes.ts`

- [ ] **Step 1: Write `studioGuide.ts`**

```ts
// studioGuide singleton — drives the "How the website works" Start Here panel.
// Plain text + simple arrays (no Portable Text) so editing stays dead-simple
// and the Studio needs no extra renderer dependency.
import { defineType, defineField, defineArrayMember } from 'sanity';

const TONES = [
  { title: 'Default', value: 'default' },
  { title: 'Primary (highlight)', value: 'primary' },
  { title: 'Caution (amber)', value: 'caution' },
  { title: 'Positive (green)', value: 'positive' },
];

export const studioGuide = defineType({
  name: 'studioGuide',
  title: 'Start Here Guide',
  type: 'document',
  options: { canvasApp: { exclude: true } },
  fields: [
    defineField({ name: 'guideTitle', title: 'Guide title', type: 'string', initialValue: 'How the website works' }),
    defineField({
      name: 'guideIntro',
      title: 'Welcome line',
      type: 'text',
      rows: 3,
      description: 'The friendly intro under the title.',
    }),
    defineField({
      name: 'studioMap',
      title: 'The map: where everything lives',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'mapRow',
          fields: [
            defineField({ name: 'area', title: 'Area', type: 'string', validation: (R) => R.required() }),
            defineField({ name: 'description', title: 'What lives here', type: 'text', rows: 3, validation: (R) => R.required() }),
          ],
          preview: { select: { title: 'area', subtitle: 'description' } },
        }),
      ],
    }),
    defineField({
      name: 'howTos',
      title: 'Step-by-step how-tos',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'howTo',
          fields: [
            defineField({ name: 'title', title: 'Task title', type: 'string', validation: (R) => R.required() }),
            defineField({
              name: 'steps',
              title: 'Steps',
              type: 'array',
              of: [defineArrayMember({ type: 'string' })],
              validation: (R) => R.required().min(1),
            }),
          ],
          preview: { select: { title: 'title' } },
        }),
      ],
    }),
    defineField({
      name: 'tips',
      title: 'Tip cards',
      type: 'array',
      description: 'The colored callout cards: the most-important note, photo tips, launching in stages, scheduling, comments, SEO hints, and "stuck?".',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'tip',
          fields: [
            defineField({ name: 'heading', title: 'Heading', type: 'string', validation: (R) => R.required() }),
            defineField({ name: 'tone', title: 'Color tone', type: 'string', options: { list: TONES }, initialValue: 'default' }),
            defineField({ name: 'body', title: 'Body', type: 'text', rows: 5, validation: (R) => R.required() }),
          ],
          preview: { select: { title: 'heading', subtitle: 'tone' } },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Start Here Guide' }) },
});
```

- [ ] **Step 2: Write `studioNotes.ts`**

```ts
// studioNotes singleton — drives the static notes in the "Your business at a
// glance" Start Here panel (the live services/settings come straight from those
// documents and are not duplicated here). Plain text, excluded from Canvas.
import { defineType, defineField, defineArrayMember } from 'sanity';

export const studioNotes = defineType({
  name: 'studioNotes',
  title: 'Business Notes (Start Here)',
  type: 'document',
  options: { canvasApp: { exclude: true } },
  fields: [
    defineField({ name: 'businessSummary', title: 'Who you are', type: 'text', rows: 5 }),
    defineField({ name: 'idealClient', title: 'Your ideal client', type: 'text', rows: 5 }),
    defineField({ name: 'voiceSummary', title: 'Your voice', type: 'text', rows: 6 }),
    defineField({
      name: 'wordsToAvoid',
      title: 'Words to skip',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      description: 'Designer-speak to avoid in writing.',
    }),
  ],
  preview: { prepare: () => ({ title: 'Business Notes' }) },
});
```

- [ ] **Step 3: Register both in the schema index**

In `studio/schemaTypes/index.ts`, add imports (alphabetical, near `styleQuiz`):

```ts
import { studioGuide } from './studioGuide';
import { studioNotes } from './studioNotes';
```

And add them to the `schemaTypes` array under the singletons block:

```ts
  // Start Here editable singletons
  studioGuide,
  studioNotes,
```

- [ ] **Step 4: Regenerate types**

Run: `npm run typegen`
Expected: completes; new types present, no errors.

- [ ] **Step 5: Commit**

```bash
git add studio/schemaTypes/studioGuide.ts studio/schemaTypes/studioNotes.ts studio/schemaTypes/index.ts src/lib/sanity.types.ts
git commit -m "Add studioGuide + studioNotes editable singletons"
```

### Task 11: Protect the singletons + wire editable views in the desk

**Files:**
- Modify: `studio/sanity.config.ts` (SINGLETON_TYPES set near line 170)
- Modify: `studio/structure.ts` (SINGLETON_TYPES, HIDDEN_FROM_DEFAULT, Start Here items)

- [ ] **Step 1: Add to `sanity.config.ts` SINGLETON_TYPES**

In the `SINGLETON_TYPES` `Set` near the bottom of `studio/sanity.config.ts`, add `'studioGuide',` and `'studioNotes',` (so they can't be duplicated/deleted/unpublished).

- [ ] **Step 2: Add to `structure.ts` sets**

In `studio/structure.ts`, add `'studioGuide'` and `'studioNotes'` to the `SINGLETON_TYPES` array (so they get the delete/duplicate protection) and they are already covered by `HIDDEN_FROM_DEFAULT` because it spreads `SINGLETON_TYPES`. Confirm `HIDDEN_FROM_DEFAULT` spreads `...SINGLETON_TYPES` (it does at line ~93), so no separate edit needed there.

- [ ] **Step 3: Make the two Start Here items editable documents with views**

Replace the first two `S.listItem()` entries inside the "Start Here" child list (currently `S.component(StudioGuide)` and `S.component(BusinessOverview)`) with document nodes that carry a rendered component view plus an edit form view. Keep the Brand Kit item as-is.

```ts
            .items([
              S.listItem()
                .title('How the website works')
                .icon(PresentationIcon)
                .child(
                  S.document()
                    .schemaType('studioGuide')
                    .documentId('studioGuide')
                    .views([
                      S.view.component(StudioGuide).title('Guide'),
                      S.view.form().title('Edit'),
                    ]),
                ),
              S.listItem()
                .title('Your business at a glance')
                .icon(ThumbsUpIcon)
                .child(
                  S.document()
                    .schemaType('studioNotes')
                    .documentId('studioNotes')
                    .views([
                      S.view.component(BusinessOverview).title('Overview'),
                      S.view.form().title('Edit notes'),
                    ]),
                ),
              S.listItem()
                .title('Brand kit')
                .icon(ColorWheelIcon)
                .child(S.component(BrandKit).title('Brand kit')),
            ])
```

- [ ] **Step 4: Verify the Studio compiles**

Run: `npm run studio:dev`
Expected: Studio starts with no build error. Open Start Here; both items now show two tabs (rendered view + edit form). Stop the dev server when confirmed.

- [ ] **Step 5: Commit**

```bash
git add studio/sanity.config.ts studio/structure.ts
git commit -m "Protect + wire studioGuide/studioNotes as editable Start Here docs"
```

### Task 12: Seed the guide singletons from current content

**Files:**
- Create: `scripts/seed-studio-guide.mjs`

- [ ] **Step 1: Write the seeder**

Copy the `.env` + client setup block from `scripts/patch-contact-form-options.mjs`. Then build the two documents from the content currently hardcoded in `studio/components/StudioGuide.tsx` (the `howTos` array, the map cards, the tip cards) and `studio/components/BusinessOverview.tsx` (who-you-are, ideal-client, voice, words-to-skip). Use `createOrReplace` with fixed ids so reruns are idempotent. Skeleton:

```js
const studioGuideDoc = {
  _id: 'studioGuide',
  _type: 'studioGuide',
  guideTitle: 'How the website works',
  guideIntro:
    'This is your content editor for reiddesignllc.com. Everything you change here appears on the live site after you hit Publish.',
  studioMap: [
    { _key: 'm1', _type: 'mapRow', area: 'Site Settings', description: 'Your contact info, social links, the cities you serve, travel fee tiers, and your availability status. Your business card inside the Studio.' },
    { _key: 'm2', _type: 'mapRow', area: 'Pages', description: 'Every page on the site, grouped into core pages, offerings, resources and tools, and other.' },
    { _key: 'm3', _type: 'mapRow', area: 'Content', description: 'The building blocks that fill pages: services and prices, testimonials, projects, shop items, guides, press mentions, FAQ items, and philosophy values.' },
    { _key: 'm4', _type: 'mapRow', area: 'Journal', description: 'Your blog posts and their categories. Write a post, pick a category, publish.' },
  ],
  howTos: [
    { _key: 'h1', _type: 'howTo', title: "Edit a page's words or photos", steps: [
      'Click "Pages" in the left sidebar, then pick the page you want to update.',
      'Edit any field directly in the form on the left.',
      'Click the "Preview" tab at the top to see how it looks before you publish.',
      'When you are happy, click the blue "Publish" button at the bottom right. The live site updates in about 1 to 3 minutes.',
    ] },
    // ... carry over how-tos 2 through 10 from StudioGuide.tsx verbatim, each with a unique _key.
  ],
  tips: [
    { _key: 't1', _type: 'tip', tone: 'primary', heading: 'The most important thing to know', body: 'Nothing goes live until you click the blue Publish button. You can edit any field, take a break, come back tomorrow, and the draft just sits there waiting. Only Publish pushes it to the real site.\n\nAfter you publish, the live site rebuilds in about 1 to 3 minutes.' },
    { _key: 't2', _type: 'tip', tone: 'default', heading: 'Photo tips', body: 'Upload photos at least 2,000 pixels wide. After uploading, click the image to set the focal point. Always fill in the Alt text field with a plain description like "Living room redesign in Fishers, Indiana".' },
    { _key: 't3', _type: 'tip', tone: 'default', heading: 'Launching in stages? Turn a section on or off', body: 'Go to Site Settings, click the "Section visibility" tab, and flip the toggle off for whatever you want to hide. Publish. The section disappears from the menu, footer, and home page, and its own page redirects to home. Turning a section off never deletes anything.' },
    { _key: 't4', _type: 'tip', tone: 'default', heading: 'Schedule a publish for later', body: 'Open any document, click the small arrow next to the blue Publish button, and pick "Schedule publish". The site rebuilds automatically at that time.' },
    { _key: 't5', _type: 'tip', tone: 'default', heading: 'Ask a question without changing anything', body: 'Hover over a field label and click the small speech-bubble icon. Type your question and Submit. Nathan sees it next time he opens the Studio.' },
    { _key: 't6', _type: 'tip', tone: 'caution', heading: 'SEO hints', body: 'Some pages have SEO Title and SEO Description fields, which is what Google shows. If you see an amber warning, the text is too long; trim it until the warning disappears.' },
    { _key: 't7', _type: 'tip', tone: 'positive', heading: 'Stuck?', body: 'Text Nathan. He set all of this up and can fix anything quickly.' },
  ],
};

const studioNotesDoc = {
  _id: 'studioNotes',
  _type: 'studioNotes',
  businessSummary:
    'Reid Design LLC is a residential interior design studio based in Plainfield, Indiana, serving Plainfield, Indianapolis, and the surrounding suburbs: Carmel, Fishers, Westfield, Zionsville, and Noblesville.\n\nThe studio is warm and approachable. You show prices openly. You are mid-market, not white-glove. Your entry point is a $150 in-home consultation.',
  idealClient:
    'A homeowner in Plainfield or the Indy suburbs whose home feels off and who does not know where to start. They have budget for design help but are not shopping at the luxury tier. They usually find you on Instagram or through a referral.\n\nThey want a smart friend who happens to be a designer: honest, knows what works in real houses, and will not make them feel bad about their current furniture.',
  voiceSummary:
    'Warm, plain-spoken, like a smart friend who happens to be a designer. Say prices plainly, no hedging. Be specific about real rooms. Write the way you talk. No em-dashes; use a comma or period instead. Stop when you are done; do not add a closing sentence that restates the point.',
  wordsToAvoid: ['transformative', 'curated', 'elevated', 'tailored', 'investment in your space'],
};

async function run() {
  await client.createOrReplace(studioGuideDoc);
  await client.createOrReplace(studioNotesDoc);
  console.log('[ok] seeded studioGuide + studioNotes');
}
run().catch((err) => { console.error(err); process.exit(1); });
```

When writing the file, carry over how-tos 2 through 10 from `StudioGuide.tsx` verbatim (each object needs a unique `_key` like `h2`...`h10` and `_type: 'howTo'`, and the inner steps stay plain strings).

- [ ] **Step 2: Run the seeder**

Run: `node scripts/seed-studio-guide.mjs`
Expected: `[ok] seeded studioGuide + studioNotes`.

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-studio-guide.mjs
git commit -m "Seed studioGuide + studioNotes from current panel content"
```

### Task 13: Refactor `StudioGuide.tsx` to render from Sanity

**Files:**
- Modify: `studio/components/StudioGuide.tsx` (full rewrite)

- [ ] **Step 1: Replace the component**

```tsx
// StudioGuide.tsx — Panel 1 of the Start Here handbook.
// Renders the editable `studioGuide` singleton (fetched via useClient). The
// rendered view is read-only and pretty; editing happens in the sibling "Edit"
// form tab wired in structure.ts. Safe to edit by hand (layout only).

import React, { useEffect, useState } from 'react';
import { useClient } from 'sanity';
import { Box, Card, Container, Heading, Stack, Text } from '@sanity/ui';

interface MapRow { area?: string; description?: string }
interface HowTo { title?: string; steps?: string[] }
interface Tip { heading?: string; tone?: 'default' | 'primary' | 'caution' | 'positive'; body?: string }
interface GuideDoc {
  guideTitle?: string;
  guideIntro?: string;
  studioMap?: MapRow[];
  howTos?: HowTo[];
  tips?: Tip[];
}

const QUERY = `*[_type=="studioGuide"][0]{guideTitle, guideIntro, studioMap, howTos, tips}`;

/** Split a text field on blank lines into paragraphs. */
function paragraphs(text?: string): string[] {
  return (text ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

export default function StudioGuide() {
  const client = useClient({ apiVersion: '2024-01-01' });
  const [doc, setDoc] = useState<GuideDoc | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    client.fetch<GuideDoc | null>(QUERY).then((d) => setDoc(d ?? {})).catch(() => setError(true));
  }, [client]);

  if (error) {
    return (
      <Container width={1} padding={4}>
        <Card padding={4} radius={2} shadow={1} tone="caution">
          <Text size={1}>Could not load the guide right now. Open the Edit tab to see the content.</Text>
        </Card>
      </Container>
    );
  }
  if (doc === null) {
    return (
      <Container width={1} padding={4}>
        <Text size={1} muted>Loading the guide...</Text>
      </Container>
    );
  }

  return (
    <Container width={1} padding={4}>
      <Stack space={6}>
        <Box>
          <Heading as="h1" size={3}>{doc.guideTitle ?? 'How the website works'}</Heading>
          {doc.guideIntro && (
            <Box marginTop={3}>
              {paragraphs(doc.guideIntro).map((p, i) => (
                <Box key={i} marginTop={i === 0 ? 0 : 2}><Text muted size={1}>{p}</Text></Box>
              ))}
            </Box>
          )}
        </Box>

        {doc.studioMap && doc.studioMap.length > 0 && (
          <Card padding={4} radius={2} shadow={1} tone="default">
            <Stack space={4}>
              <Heading as="h2" size={1}>The map: where everything lives</Heading>
              <Stack space={3}>
                {doc.studioMap.map((row, i) => (
                  <Box key={i}>
                    <Text size={1} weight="semibold">{row.area}</Text>
                    <Box marginTop={1}><Text size={1} muted>{row.description}</Text></Box>
                  </Box>
                ))}
              </Stack>
            </Stack>
          </Card>
        )}

        {doc.howTos && doc.howTos.length > 0 && (
          <Box>
            <Heading as="h2" size={1} style={{ marginBottom: '1rem' }}>Step-by-step how-tos</Heading>
            <Stack space={4}>
              {doc.howTos.map((howTo, i) => (
                <Card key={i} padding={4} radius={2} shadow={1} tone="default">
                  <Stack space={3}>
                    <Heading as="h3" size={0}>{i + 1}. {howTo.title}</Heading>
                    <Stack space={2}>
                      {(howTo.steps ?? []).map((step, j) => (
                        <Text key={j} size={1}>{step}</Text>
                      ))}
                    </Stack>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Box>
        )}

        {doc.tips && doc.tips.length > 0 && doc.tips.map((tip, i) => (
          <Card key={i} padding={4} radius={2} shadow={1} tone={tip.tone ?? 'default'}>
            <Stack space={3}>
              <Heading as="h2" size={1}>{tip.heading}</Heading>
              {paragraphs(tip.body).map((p, j) => (
                <Text key={j} size={1}>{p}</Text>
              ))}
            </Stack>
          </Card>
        ))}
      </Stack>
    </Container>
  );
}
```

- [ ] **Step 2: Verify the Studio compiles**

Run: `npm run studio:dev`
Expected: Studio builds; the "How the website works" Guide tab renders the same content as before (now from Sanity). Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add studio/components/StudioGuide.tsx
git commit -m "Render StudioGuide panel from the studioGuide singleton"
```

### Task 14: Refactor `BusinessOverview.tsx` static notes to render from Sanity

**Files:**
- Modify: `studio/components/BusinessOverview.tsx`

- [ ] **Step 1: Add the studioNotes fetch**

Add an interface and a second query + state. Near the existing `SETTINGS_QUERY`:

```tsx
interface NotesData {
  businessSummary: string | null;
  idealClient: string | null;
  voiceSummary: string | null;
  wordsToAvoid: string[] | null;
}
const NOTES_QUERY = `*[_type=="studioNotes"][0]{businessSummary, idealClient, voiceSummary, wordsToAvoid}`;
```

In the component, add `const [notes, setNotes] = useState<NotesData | null>(null);` and in the `useEffect`, add a third fetch:

```tsx
    client
      .fetch<NotesData | null>(NOTES_QUERY)
      .then((data) => setNotes(data ?? null))
      .catch(() => { /* notes are optional; the live sections still render */ });
```

Add a `paragraphs` helper identical to the one in StudioGuide (split on blank lines).

- [ ] **Step 2: Replace the three static cards**

Replace the three hardcoded cards ("Who you are", "Your ideal client", "Your voice") with data-driven versions that render from `notes` and hide when empty:

```tsx
        {notes?.businessSummary && (
          <Card padding={4} radius={2} shadow={1} tone="default">
            <Stack space={3}>
              <Heading as="h2" size={1}>Who you are</Heading>
              {paragraphs(notes.businessSummary).map((p, i) => (<Text key={i} size={1}>{p}</Text>))}
            </Stack>
          </Card>
        )}

        {notes?.idealClient && (
          <Card padding={4} radius={2} shadow={1} tone="default">
            <Stack space={3}>
              <Heading as="h2" size={1}>Your ideal client</Heading>
              {paragraphs(notes.idealClient).map((p, i) => (<Text key={i} size={1}>{p}</Text>))}
            </Stack>
          </Card>
        )}

        {(notes?.voiceSummary || (notes?.wordsToAvoid && notes.wordsToAvoid.length > 0)) && (
          <Card padding={4} radius={2} shadow={1} tone="default">
            <Stack space={3}>
              <Heading as="h2" size={1}>Your voice (how you sound in writing)</Heading>
              {paragraphs(notes?.voiceSummary).map((p, i) => (<Text key={i} size={1}>{p}</Text>))}
              {notes?.wordsToAvoid && notes.wordsToAvoid.length > 0 && (
                <>
                  <Text size={1} weight="semibold">Words to skip:</Text>
                  <Text size={1}>{notes.wordsToAvoid.join(', ')}.</Text>
                </>
              )}
            </Stack>
          </Card>
        )}
```

Leave the two LIVE cards (services, contact/availability/service areas) and the header exactly as they are.

- [ ] **Step 3: Verify the Studio compiles**

Run: `npm run studio:dev`
Expected: the "Your business at a glance" Overview tab still shows live services + settings, and the three notes render from `studioNotes`. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add studio/components/BusinessOverview.tsx
git commit -m "Render BusinessOverview static notes from the studioNotes singleton"
```

---

## Workstream E — Verify, deploy, document

### Task 15: Full build + visual verification

- [ ] **Step 1: Typegen + build**

Run: `npm run build`
Expected: clean static build, no type errors.

- [ ] **Step 2: Visual verification with Playwright MCP**

Start the dev server (`npm run dev`) and check, at ~375px and ~1280px, in BOTH light and dark:
- `/about` — the new personal section renders, cards read 01/02/03, modules look right, both themes pass contrast.
- `/contact` — the lead-source dropdown shows the two new options; project-type dropdown shows the full current list.

Fix any layout/contrast issues and re-screenshot before moving on.

- [ ] **Step 3: Lighthouse on /about**

Run Lighthouse (Chrome DevTools) on the running `/about`.
Expected: Accessibility stays 100. Address any regression before continuing.

### Task 16: Deploy Studio + document

- [ ] **Step 1: Deploy the Studio**

Run: `npm run studio:deploy`
Expected: deploy succeeds. The new About `personal` fields show on the About page document, and Start Here shows the editable Guide/Overview docs with no "unknown field" warnings.

- [ ] **Step 2: Update docs**

In `CLAUDE.md`: document the About `personal` fields (and the AboutPersonal component), the philosophy-card numbering rule (numbered by position; `displayOrder` is an optional backup), the two new lead-source options, and the `studioGuide` + `studioNotes` editable singletons (note Brand Kit stays code-driven and why). In `OPERATIONS.md`: note the seeders (`seed-about-personal.mjs`, `seed-studio-guide.mjs`) and the `patch-contact-form-options.mjs` force-set behavior.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md OPERATIONS.md
git commit -m "Document About personal section, card numbering, editable Start Here guide"
```

---

## Self-Review notes

- **Spec coverage:** A (Tasks 1-2), B (Tasks 3-4), C (Tasks 5-9), D (Tasks 10-14), verify/deploy/docs (Tasks 15-16). All four workstreams covered.
- **Deviation from spec:** guide content uses plain `text` fields, not Portable Text, to avoid adding a Studio renderer dependency. Same end result, simpler editing.
- **Type consistency:** array member `_type` values (`currentlyRow`, `rapidFireRow`, `localSpotRow`, `mapRow`, `howTo`, `tip`) match between schema (Task 5, 10) and seeders (Task 9, 12). Query field names (Task 6) match schema field names (Task 5) and the `AboutPersonal` props (Task 7).
- **Risk:** Studio component views must render a clean loading/empty state pre-seed; both refactors (Tasks 13-14) guard for null. Seeders are idempotent and guard against clobbering customized content.

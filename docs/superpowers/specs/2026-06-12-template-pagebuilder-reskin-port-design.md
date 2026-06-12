# Template Page-Builder & Reskin Port — Design Spec

Date: 2026-06-12
Author: Nathan Nixon (Nixon Creative Studio), with Claude
Status: Approved (2026-06-12)

## Summary

The `ncs-astro-sanity-starter` template was created before the page builder
existed in Reid Design. It has hardcoded core pages, no section-based editing,
and the 10 feature modules present only as off-by-default stubs. This project
ports Reid Design's net-new systems into the starter and generalizes them,
stripping all Reid-specific copy, photos, palette, and bespoke naming so the
result is a batteries-included, page-builder-first template that can be
reskinned for any portfolio or marketing client quickly.

Three decisions frame the scope: (1) port everything — page builder, all 10
modules, and reusable tooling; (2) brand reskinning is driven by a single brand
config file through both a deterministic script and a Claude skill; (3) every
core page is fully section-driven, with Reid's bespoke per-page components
generalized into reusable section types. The work happens on a feature branch
of the starter repo. Reid's `reid-design-site` directory is source-only; nothing
is committed back to that repo.

---

## 1. Page-Builder Core

### What it does

A section-based content editing system that lets an editor compose any page from
an ordered list of typed blocks inside Sanity Studio, without touching code.

### Schema: block library (`studio/schemaTypes/sections.ts`)

`SECTION_TYPES` is the single source of truth for the block vocabulary. The
9 starting block types ported from Reid:

| `_type` | Description |
|---|---|
| `heroSection` | Full-width headline block, primary CTA, optional image |
| `richTextSection` | Portable Text with heading + prose |
| `imageTextSection` | Side-by-side image and text, configurable orientation |
| `gallerySection` | Image grid; lightbox optional |
| `quoteSection` | Pull quote, attribution, optional portrait |
| `statSection` | Row of 2–4 labeled numbers or metrics |
| `ctaBandSection` | Full-width call-to-action band, contrasting surface |
| `videoSection` | Embed or hosted video with caption |
| `spacerSection` | Explicit vertical gap, configurable size |

Blocks deliberately carry no `backgroundColor` field. Background assignment is
the renderer's responsibility (see SectionRenderer below). Editors choose
content and order; they do not choose colors.

### Component: `SectionRenderer.astro`

**Input:** an array of section objects projected from Sanity (typed via
`sanity.types.ts`). **Output:** rendered HTML with surface classes and dividers
applied.

The renderer owns the alternating surface cadence. It classifies each block into
one of two categories:

- **Self-contained blocks** (`heroSection`, `ctaBandSection`, `statSection`,
  `spacerSection`): manage their own surface — these carry a fixed surface
  declaration that does not participate in the alternating sequence.
- **Content blocks** (`richTextSection`, `imageTextSection`, `gallerySection`,
  `quoteSection`, `videoSection`): assigned alternating `surface` (default
  background) and `surface-muted` (alternate background) in sequence, skipping
  self-contained blocks when counting.

`SectionDivider.astro` is inserted between adjacent content blocks of differing
surface. The renderer inserts it automatically; individual section components
never import it directly. This means reordering sections in the Studio can never
produce an unintended background collision or a missing divider.

### Custom page document type (`studio/schemaTypes/page.ts`)

A multi-instance (non-singleton) `page` document type for client-defined pages
beyond the reserved core routes. Fields: `title`, `slug`, `description`
(meta), `pageBuilder` (array of section blocks), `seo`.

**Reserved-slug collision guard:** the slug field's validation rule checks the
slug value against the reserved list (`/`, `about`, `services`, `process`,
`contact`, etc.) and returns a validation error if the editor tries to use one.
The guard runs inside Sanity Studio validation, not at build time.

**Route:** `src/pages/[slug].astro` handles all custom pages. `getStaticPaths`
fetches every published `page` document and filters out reserved slugs. The
filter must live **inside** `getStaticPaths` because Astro's static build
evaluates each page file in an isolated scope — a module-level import of the
reserved list would not be visible to the Astro runtime at path-generation time.

### Additional sections append zone

`additionalSectionsField` (defined in `sections.ts`, imported by any page
schema that wants it) is a secondary `pageBuilder`-style array that appends to
the bottom of a page's rendered output. Empty means no change. Its purpose is
to let editors add supplementary content (a CTA band, a testimonial quote) to
any page without needing a fully structured bottom section in the main builder.

### `businessInfo` singleton split

`siteSettings` currently holds both identity/infrastructure fields and
operational business facts. This split moves service areas, travel fees,
availability, geo coordinates, and locality into a separate `businessInfo`
singleton in `studio/schemaTypes/businessInfo.ts`.

`getSiteSettings()` in `src/lib/queries.ts` queries both documents in one GROQ
call and merges `businessInfo` fields into the returned object under the same
flat field names currently consumed by components. No component changes are
needed; the interface is unchanged.

### GROQ projections

`sectionsProjection()` in `src/lib/queries.ts` is a reusable GROQ fragment that
handles the nested image and CTA projections required inside section arrays. Any
query that fetches a `pageBuilder` field wraps it with this helper.

Images project through `imageProjection()` (already present in queries.ts,
handles `asset._ref`, `alt`, `hotspot`, `crop`). CTA objects project through
`ctaProjection()` (label, url, style, openInNewTab). Both helpers are also
reusable independently.

`npm run typegen` regenerates `src/lib/sanity.types.ts` after schema changes.
The generated file is committed. No build should proceed with a stale types file
after a schema change.

---

## 2. Section-Driven Core Pages

### What it does

Every core page singleton (home, about, services, process, contact, and any
others in the core set) holds a `pageBuilder` array field. Editors reorder,
hide, or remove sections. No core page has its content locked in hardcoded
Astro layout. A default seed (see Testing/Verification) provides a sensible,
conversion-tuned section order so a freshly seeded project looks designed, not
empty.

### Generalizing Reid's bespoke per-page components

Reid built specialized section components for specific pages. Each is generalized
into a neutral, reusable section type added to the SECTION_TYPES library:

| Reid component | Generalized section type | Function |
|---|---|---|
| `MeetStaci` | `founderSection` | Bio block — founder name, portrait, story prose, credentials |
| `HomeServices` / `ServicesList` | `servicesGridSection` | Grid of service cards with name, description, optional icon/image |
| `HomeTestimonials` | `testimonialsSection` | Testimonial carousel or grid, pulls from `testimonial` documents |
| `AboutStory` | `storySection` | Long-form narrative block with optional inline image |
| `AboutPhilosophy` | `valuesSection` | Numbered or card-based values/philosophy list |
| `ProcessSteps` / `ProcessPreview` | `processSection` | Ordered steps list, supports icon or step number |
| `ServiceArea` | `serviceAreaSection` | Geography prose, optionally links to businessInfo service area data |
| `SatisfactionGuarantee` | `guaranteeSection` | Trust/guarantee statement with icon or badge |
| `BuildersRealtors` | dropped | Too niche for a general template; omitted |

Each generalized type ships in the SECTION_TYPES block library and is available
on any page that includes it in its `pageBuilder` array. Core page schemas
control which types appear in their builder — the home page exposes
`founderSection` and `servicesGridSection`; those types are not cluttering the
blog page's editor.

---

## 3. Modules, Genericized

### What it does

The 10 feature modules built in Reid Design are present in the starter as
opt-in, off-by-default units. This phase brings them to the same completeness
level as Reid's versions but strips all Reid-specific content, replacing it with
neutral placeholder copy and placeholder images.

### The 10 modules

| Module | Core additions |
|---|---|
| `portfolio` | `portfolioPage` + `project`, `/portfolio` + `/portfolio/[slug]`, before/after slider island, style filter |
| `process` | `processPage` + `processStep`, `/process`, step illustration slots |
| `shop` | `shopPage` / `shopCollection` / `shopItem`, `/shop`, FTC disclosure, affiliate `rel` handling |
| `e-design` | `eDesignPage`, `/e-design`, pricing tier blocks |
| `gift-certificates` | `giftPage`, `/gift-certificates`, inquire-only (no payment integration) |
| `press` | `pressPage` / `pressItem`, `/press`, `PressStrip` component |
| `resources` | Hub page, activates once at least one capture module is on |
| `guides` / lead-magnets | `leadMagnet` schema, `/guides` + `/guides/[slug]`, `LeadMagnetForm` island |
| `style-quiz` | `styleQuiz` schema, `/quiz`, `StyleQuiz` island |
| `budget-calculator` | `budgetCalculator` schema, `/calculator`, `BudgetCalculator` island |

### Section-visibility toggles

The existing `sectionVisibility` toggle pattern (rule: `value !== false` is
visible) is preserved on every module page that has it. The semantics do not
change. Toggling a section off in the Studio suppresses its render; there is no
conditional schema logic required.

### Placeholder content

Each module seeds with placeholder copy (generic service names, neutral
descriptions) and placeholder images from the repo's own placeholder image
set (no external fetch required at seed time). The placeholder content must be
complete enough that the module page looks intentional, not broken, immediately
after seeding.

---

## 4. Brand Reskin System

### What it does

Reskinning a fresh clone for a client is a single, guided operation rather than
a scavenger hunt across files. One brand config file is the source of truth for
all mechanical brand inputs. Two engines consume it: a deterministic Node script
for the file rewrites, and a Claude skill for the fuzzy/editorial layer
(interviews, voice, contrast checking, verification).

### `brand/brand.config.json`

Canonical brand inputs:

```
{
  "name": string,                // business display name
  "domain": string,              // production domain (no protocol)
  "tagline": string,             // one-line positioning statement
  "contact": { ... },            // email, phone, address fields
  "palette": {
    "light": { ... },            // CSS custom property values for light mode
    "dark": { ... }              // CSS custom property values for dark mode
  },
  "fonts": {
    "display": string,           // heading font family name
    "body": string,              // body/prose font family name
    "script": string | null      // optional accent script font
  },
  "logoPaths": {
    "light": string,             // path to logo for light backgrounds
    "dark": string               // path to logo for dark backgrounds
  }
}
```

The file ships in the repo with neutral defaults filled in (matching the neutral
default theme, see §5). An editor fills or overwrites it before running
`apply-brand`. The file is tracked in git so changes are diffable.

`docs/brand/voice.md` holds the brand's voice and tone brief. It is a separate
file because it is prose-authored (either by the client or by the `/reskin`
skill) and does not lend itself to JSON.

### `npm run apply-brand` (deterministic script)

Script location: `scripts/apply-brand.mjs`

**Inputs:** `brand/brand.config.json` (required), `brand/brand.config.json` font
names (used to derive `@fontsource` package names).

**Outputs / rewrites:**

- `src/styles/globals.css`: rewrites the `@theme` color and font token
  declarations and the `:root` / `.dark` override blocks. Targets the
  comment-delimited regions already present in the file; does not touch anything
  outside those regions.
- `src/data/site.ts`: rewrites `name`, `domain`, `tagline`, and `brandColors`.
- `studio/sanity.config.ts`: rewrites the Studio theme color variables
  (studioTheme hue/saturation values or custom theme object, whichever form is
  in use).
- OG generator inputs (`scripts/og-config.ts` or equivalent): rewrites the
  brand name and color values used by the OG image generation script.
- Font imports: writes or overwrites the `@fontsource` import lines in the
  appropriate entry point (either `src/styles/globals.css` or a dedicated
  `src/styles/fonts.css` if one exists).

After rewriting, the script runs `npm run og` to regenerate the OG image with
the new brand inputs. The script is idempotent: running it twice with the same
config produces the same output and does not accumulate duplicate declarations.

**Error behavior:** if `brand.config.json` is absent or malformed, the script
exits with a descriptive error and makes no file changes (all-or-nothing write
strategy per output file).

### `/reskin` Claude skill (`.claude/skills/reskin.md`)

The skill orchestrates the full new-client brand setup for sessions where a
Claude agent is driving.

**Steps:**

1. Read `brand/brand.config.json`. For any required field that is empty or
   absent, interview the user (or infer from a described "vibe") and fill the
   config before proceeding.
2. Run `npm run apply-brand`.
3. Read `docs/brand/voice.md`. Rewrite it to match the client's voice inputs
   (interviewed or described). Retone the seeded placeholder copy in core page
   Sanity documents to match the new voice (requires a running Studio or direct
   GROQ mutations — the skill documents which approach applies).
4. Check light and dark mode contrast ratios for the new palette tokens
   (foreground/background pairs, primary CTA on both surfaces). Fix any token
   values that fail WCAG AA (4.5:1 for text, 3:1 for large text and UI
   components).
5. Run Playwright screenshots at mobile (390px) and desktop (1280px) in both
   light and dark modes. Review visually; flag any layout or color issues.
6. Report what still requires a human: uploading the final logo file, providing
   real photography, reviewing the voice rewrite, and any contrast fixes that
   required judgment calls.

The skill requires Playwright to be available in the project. If it is not,
step 5 degrades to a manual screenshot checklist output.

---

## 5. Neutral Default Theme

### What it does

The template ships in a complete, obviously-generic visual state. Nothing
Reid-specific leaks through in the default branch. The neutral theme is
functional enough that `npm run build` and `npm run preview` produce a
good-looking site before any reskin is applied.

### Defaults

- **Palette:** stone/ink (warm neutral grays for surfaces, near-black for text,
  a restrained accent — no sage, no Reid greens). Both light and dark modes
  defined with the full `@theme` token set.
- **Fonts:** a neutral serif + geometric sans pairing that is not associated with
  any specific brand. Loaded from `@fontsource` packages already listed in
  `package.json`. The script accent font slot is null (no script font loaded by
  default).
- **Identity:** `src/data/site.ts` ships as `"Studio Name"`, domain
  `"example.com"`, tagline `"Your studio tagline here"`. Contact fields are
  placeholder strings.
- **Logo:** a simple text-mark SVG using the neutral font, light and dark
  variants. Not a raster file (avoids binary blob churn in git on every reskin).
- **Seeded content:** every core page and module has placeholder text that reads
  like a wireframe label — no Reid copy, no interior-design vocabulary.

The neutral theme state is what `brand/brand.config.json` encodes at the time of
the initial commit, so `npm run apply-brand` with the defaults is a no-op.

---

## 6. Docs Rewrite

### What it does

Every doc in the repo is updated to reflect the page-builder-first architecture
and the reskin flow as the primary onboarding path. Reid-specific references are
replaced with stack-level guidance. The voice rules are preserved (they are good)
but reframed as the template's built-in house style; per-client voice lives in
`voice.md`.

### Affected docs

- **`CLAUDE.md`**: add page builder rules (typegen after schema change, committed
  types file, reserved-slug guard behavior, SectionRenderer surface contract).
  Update the Foundation-vs-Safe-to-edit taxonomy to reflect new files.
- **`OPERATIONS.md`**: add apply-brand and /reskin to the operational runbook.
  Add schema-change procedure (typegen, commit, Studio deploy order).
- **`README.md`**: reframe the quickstart around the reskin flow as step one.
- **`docs/bootstrap/NEW-PROJECT.md`**: center on the reskin flow. Sequence:
  clone → Sanity project → env vars → fill brand config → run /reskin → seed →
  deploy. Module enable steps stay as-is.
- **`docs/brand/` (new file: `brand-system.md`)**: documents the brand config
  schema, apply-brand script, /reskin skill, and the expected edit surface per
  field. This is the reference a developer reads when they want to understand the
  reskin system without running it.
- **`docs/agent/*`**: update page-architecture, sanity, and design-tokens topic
  docs to describe the page builder, SectionRenderer, and the new section types.
- **Per-module guides** (`docs/modules/*.md`): update any that reference hardcoded
  page patterns to describe the section-builder enable path instead.

---

## Data Flow

Two primary flows connect the system's parts:

**Brand reskin flow:**

```
brand/brand.config.json
  └─> scripts/apply-brand.mjs
        ├─> src/styles/globals.css   (@theme tokens, dark overrides, font imports)
        ├─> src/data/site.ts         (name, domain, tagline, brandColors)
        ├─> studio/sanity.config.ts  (Studio theme vars)
        ├─> OG generator inputs      (brand name, colors)
        └─> npm run og               (regenerates public og-image.png)

/reskin skill
  ├─> interviews for missing brand inputs -> writes brand.config.json
  ├─> runs apply-brand (above)
  ├─> rewrites docs/brand/voice.md
  ├─> retones seeded Sanity copy
  ├─> checks contrast, fixes tokens
  └─> Playwright screenshots -> report
```

**Page render flow:**

```
Editor in Sanity Studio
  └─> builds pageBuilder array on a page document

Sanity GROQ query (src/lib/queries.ts)
  └─> sectionsProjection() resolves nested images and CTAs

src/pages/[slug].astro (or a core page route)
  └─> passes section array to SectionRenderer.astro
        ├─> classifies blocks (self-contained vs content)
        ├─> assigns alternating surface classes
        ├─> inserts SectionDivider between differing surfaces
        └─> delegates to individual section components
              └─> each component renders its block data
```

**Custom page route flow:**

```
Studio: editor publishes a `page` document with a non-reserved slug
  └─> getStaticPaths() in src/pages/[slug].astro
        ├─> fetches all published page documents
        ├─> filters out reserved slugs (guard lives inside getStaticPaths)
        └─> returns path params for each valid custom page
              └─> page renders via SectionRenderer with that document's sections
```

---

## Error and Empty States

**Empty page builder array:** a page document with an empty `pageBuilder` renders
nothing between the header and footer. This is a valid editor state (not a bug),
but should not happen in practice after seeding. The default seed prevents it for
all core pages. Module pages that are enabled but not yet seeded show their
existing "coming soon" empty state — that pattern is preserved from the current
starter.

**Missing section component:** if `SectionRenderer` encounters a `_type` with no
registered component mapping, it renders nothing for that block and logs a
console warning in development mode. It does not throw. This prevents a missing
component from breaking the entire page render.

**Reserved-slug collision:** Sanity Studio validates the slug field on the `page`
document type. If an editor types a reserved slug, the Studio displays a
validation error before the document can be published. The `[slug].astro` route
has a secondary filter inside `getStaticPaths` as a belt-and-suspenders guard.

**Missing brand config fields:** `apply-brand` exits with a descriptive error and
makes no file changes if required fields are absent. The `/reskin` skill prompts
for missing fields before running the script.

**Contrast failures on reskin:** the `/reskin` skill checks WCAG AA contrast
after applying the palette. If a foreground/background pair fails, the skill
adjusts the relevant token value and notes the adjustment in its report. It does
not silently accept a failing palette.

**Module enabled without content:** existing "coming soon" empty state components
are preserved for each module. A module that is enabled (files copied in, schema
registered) but has no seeded documents shows the coming-soon state, not an
error or a blank page.

**`businessInfo` singleton missing:** `getSiteSettings()` handles a missing
`businessInfo` document by returning `undefined` for its fields rather than
throwing. Components that consume those fields must guard against `undefined`
(the same pattern already used for optional `siteSettings` fields).

---

## Testing and Verification

**Build gate:** `npm run build` must pass clean after every phase of the port.
A failing build is a blocking issue before the next phase begins.

**Typegen gate:** `npm run typegen` must run after every schema change. The
regenerated `src/lib/sanity.types.ts` is committed in the same commit as the
schema change. A build that imports stale types is a blocking issue.

**Playwright screenshots:** any UI change (new section component, reskin, module
page) is verified with Playwright screenshots at:
- mobile: 390px viewport
- desktop: 1280px viewport
- light mode
- dark mode

Four screenshots per changed page surface. Regressions in layout, typography, or
color on any of the four combinations are blocking.

**apply-brand idempotency check:** run `npm run apply-brand` twice in sequence
with the same config and confirm no diff is produced on the second run.

**Reserved-slug guard test:** attempt to publish a `page` document with a
reserved slug in Studio and confirm the validation error appears. Attempt to
manually construct a path param for a reserved slug in `getStaticPaths` and
confirm it is filtered out.

**Module empty states:** enable each module without seeding and confirm the
coming-soon state renders without errors in all four screenshot configurations.

**Cross-theme integrity:** every section type is rendered in both light and dark
mode and checked for text legibility, image contrast, and component boundary
clarity.

---

## Risks and Gotchas

**Schema changes and data loss.** Removing a field from an existing schema
definition does not delete Sanity documents that already have that field — the
data is orphaned but not lost. However, renaming a field (removing the old name,
adding the new name) looks like a deletion to Sanity and strips the old field's
content from existing documents. During the port, field renames must be handled
with `__experimental_fieldActions` migrations or avoided in favor of additive
changes with cleanup after content migration.

**Reserved-slug guard scope.** The reserved-slug list in `getStaticPaths` is
evaluated at build time. If the list is defined outside `getStaticPaths` at
module scope, Astro's static build isolation may not see it correctly. The list
must be defined or imported inside the `getStaticPaths` function body. This is a
known Astro static-build gotcha documented in CLAUDE.md.

**Typegen drift.** If `src/lib/sanity.types.ts` is not regenerated after a
schema change, TypeScript types silently diverge from the actual Sanity schema.
The build may still pass if the changed fields happen to type-check against the
stale types. The typegen gate (run before every build, committed with schema
changes) is the only reliable guard against this.

**Contrast on reskin.** Palette swaps that pass visual inspection can still fail
WCAG AA on specific surface/text combinations — particularly muted-surface text
and primary-on-dark. The `/reskin` skill's contrast check is the automated guard,
but it only catches the combinations it tests. Any hand-edited palette changes
after running the skill require a manual contrast re-check.

**Genericizing bespoke components.** Some Reid section components make
assumptions about content shape that are specific to an interior-design context
(e.g., room/style vocabulary in filter chips, travel-fee language in serviceArea).
The generalization work must audit each component for domain vocabulary and
replace it with neutral equivalents. Components that cannot be generalized without
gutting their functionality are candidates for dropping (as with `BuildersRealtors`)
rather than shipping a half-genericized version.

**SectionRenderer surface contract.** The alternating surface logic in
`SectionRenderer` depends on consistent `_type` values from Sanity. If a block's
`_type` is misspelled in a seed or GROQ projection, the renderer may misclassify
it (treating it as an unknown type, which defaults to content-block behavior) and
produce an incorrect surface assignment. SECTION_TYPES as a central constant
mitigates this; seeds and projections must reference it, not hardcode strings.

**Module enable sequence.** Enabling a module (copy files, register schema, seed)
must happen in that order. Registering the schema before the files exist causes a
Studio build error. Seeding before the schema is registered causes GROQ mutation
errors. The enable guide for each module documents the sequence explicitly.

**OG image generation side effect.** `apply-brand` runs `npm run og` at the end.
If the OG generation script has a dependency (e.g., a running local font server
or a specific Node version) that is not satisfied in the current environment, the
script will fail at that step. The file rewrites that precede it are already
written; only the OG regeneration is skipped. Operators should be aware that a
partial `apply-brand` run (interrupted after file writes but before OG gen) leaves
the repo in a valid but not fully-updated state.

---

## Phased Sequencing

The build is multi-session. Phases have explicit entry and exit criteria.

### Phase A — Page-Builder Core

Deliverables: `sections.ts` with SECTION_TYPES, `page.ts` document type,
`SectionRenderer.astro`, `[slug].astro` route with reserved-slug guard,
`additionalSectionsField`, `businessInfo` singleton, `getSiteSettings()` merge,
`sectionsProjection()` and related GROQ helpers, typegen run and committed types.

Exit: `npm run build` passes; Playwright screenshots show custom page route
rendering a section array correctly in all four configurations.

### Phase B — Section-Driven Core Pages

Deliverables: all generalized section types (founderSection, servicesGridSection,
testimonialsSection, storySection, valuesSection, processSection,
serviceAreaSection, guaranteeSection) added to SECTION_TYPES; all core page
singletons updated to use `pageBuilder` arrays; default seeds for all core pages.

Exit: every core page renders from its seed in all four configurations; no
hardcoded layout components remain in core page routes.

### Phase C — Modules

Deliverables: all 10 modules genericized and placeholder-seeded; section-
visibility toggles verified; empty states confirmed for each module.

Exit: every module page renders its coming-soon state when unseded and its
placeholder content when seeded, in all four configurations.

### Phase D — Brand Reskin System

Deliverables: `brand/brand.config.json` with neutral defaults; `apply-brand.mjs`
script; `/reskin` skill in `.claude/`; `docs/brand/brand-system.md`.

Exit: `apply-brand` runs idempotently; `/reskin` skill produces a complete
reskin of the neutral default to a test brand (arbitrary palette + fonts) that
passes Playwright verification in all four configurations.

### Phase E — Neutral Default + Docs

Deliverables: neutral theme committed as the default brand state in
`brand.config.json` and all token files; all docs updated as described in §6.

Exit: a fresh clone with no modifications builds, runs, and shows a complete
neutral-branded site. `npm run apply-brand` with the defaults is a no-op.
CLAUDE.md, README, and NEW-PROJECT.md accurately describe the page-builder-first
architecture and reskin flow.

**Priority note.** Phases A and D are highest value — they unlock the headline
capabilities. Phases B and C are the bulk of the labor. Phase E is integration
work that runs in parallel with or immediately after each phase rather than
entirely at the end.

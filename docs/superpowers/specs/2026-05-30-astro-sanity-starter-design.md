# Astro + Sanity Starter — Design Spec

Date: 2026-05-30
Author: Nathan Nixon (Nixon Creative Studio), with Claude
Status: Approved (2026-05-30)

## Goal

Extract everything reusable from the completed Reid Design build into a
clone-and-fill **starter repository** so future Astro + Sanity client sites
start with the infrastructure already standing. A new project should need only
two things poured in: the specific business's info, and the specific design.
Everything structural (stack config, theme system, SEO, animation, forms,
image handling, Sanity wiring, the editor-guidance system, and the documented
gotchas) ships in place from minute one.

This is the project-agnostic version of what Reid Design already proved out.

## Locked decisions

1. **Form: a starter repo plus travelling docs.** Not a docs-only knowledge
   kit. The knowledge captures the "why," but a fresh project chat reading
   prose alone would still rebuild `astro.config`, the `globals.css` theme
   system, `subscribe.ts`, the Lenis init, and the SEO files from scratch every
   time. That is slow and it drifts. The starter ships the code, with the
   distilled docs riding inside the repo.

2. **Scope: lean core plus an opt-in module library.** The core universal site
   runs out of the box. The specialized capture and revenue surfaces are
   carried forward as self-contained, documented, opt-in modules that ship OFF
   by default and flip on per client need.

## Build method: fork-and-strip

Copy `reid-design-site` into a fresh repo, then subtract Reid, rather than
re-deriving the stack from a clean Astro init.

Rationale: a clean rebuild would lose the hard-won, invisible fixes that this
whole exercise exists to preserve. Those fixes live in working code, not in
prose:

- `astro.config.mjs`: `output: 'static'`, the Cloudflare adapter with
  `imageService: 'compile'` (Sharp at build time, no Images runtime, no
  per-transform fees), the sitemap filter that excludes `/404`, and the
  decision NOT to ship a hash-based CSP meta tag (it broke theme bootstrap and
  islands).
- `public/_headers`: the `frame-ancestors` CSP that allows the Sanity iframe
  preview pane while keeping the real security surface covered.
- `BaseLayout.astro`: the anti-FOUC theme bootstrap, View Transitions
  ClientRouter, the title-suffix-doubling guard, the Lenis init with the scroll
  reset (forward goes to top, back/forward restores), the scroll-reveal
  observer, the sticky-header scroll listener.
- The customized `accordion.tsx` (the radix height lock and trigger text
  classes were removed; reinstalling via `npx shadcn add` reverts it).
- The build chain: `npm run typegen` (Sanity typegen) runs before `astro
  build` so generated types exist when the prerender worker imports them;
  `sanity.types.ts` is committed.

Fork-and-strip keeps all of that for free. A rebuild risks dropping exactly the
subtle things we are trying to capture. The tidier git history a rebuild would
give is not worth that risk.

## Repo shape

A new GitHub **template repository** (clone detaches cleanly, no accidental
upstream coupling). Working name `ncs-astro-sanity-starter`; final name TBD.

```
ncs-astro-sanity-starter/
  CLAUDE.md                      # genericized constitution (auto-loaded)
  OPERATIONS.md                  # tactical runbook
  README.md                      # human quickstart
  docs/
    bootstrap/
      NEW-PROJECT.md             # clone -> rename -> configure -> reskin -> deploy
      setup-checklist.md         # pre-launch checklist (env, Sanity, CF, SEO)
    brand/
      voice.md                   # template the client's voice rules drop into
    agent/                       # the topic docs, genericized (see below)
    modules/                     # one enable-guide per optional module
  src/                           # core Astro app only
  studio/                        # core Sanity schemas only
  modules/                       # opt-in module library, staged OFF by default
  scripts/                       # reusable generators + a configure helper
  astro.config.mjs
  wrangler.jsonc
  package.json
  tsconfig.json
  components.json
```

## Core vs. modules

### Core (always present, runs out of the box)

Schemas: `siteSettings`, `homePage`, `aboutPage`, `contactPage`, `servicesPage`
+ `service`, `faqPage` + `faqItem`, `journalPage` + `journalEntry` +
`journalCategory`, `testimonial`, `philosophyPoint`, `ctaBlock`,
`notFoundPage`, `privacyPage`, and the in-Studio editor-guidance singletons
(`studioGuide`, `studioNotes`, `studioPlaybook`) genericized with placeholder
content.

Note: blog (`journalPage`/`journalEntry`) and `testimonial` stay core because
content marketing and social proof are near-universal. `portfolio` and
`process` are NOT core; they moved to the module library (see below), since a
business without a portfolio or a defined process should not carry them.

Infrastructure (all core): the theme system (next-themes, anti-FOUC bootstrap,
`@theme` tokens, `:root`/`.dark`), the polish/animation layer (Lenis, motion,
scroll-reveal, sticky header, script accents), SEO (sitemap, robots.txt,
llms.txt, OG generation, JSON-LD via `StructuredData.astro`), image handling
(`SanityImage.astro`, `@sanity/image-url`, Astro `<Image>`/`<Picture>`), the
Sanity client + GROQ queries + typegen, the `sectionVisibility` pattern (rule:
`value !== false` is visible), and the forms plumbing (`subscribe.ts` with its
ESP-plus-Web3Forms fallback, the Web3Forms contact handler, the Calendly embed,
cookieless Cloudflare Web Analytics with no consent banner). The plumbing ships
present but dormant until configured.

### Modules (staged in `modules/<name>/`, OFF by default)

Each module is self-contained: its schema(s), page(s), island(s), seed, and a
one-page enable guide in `docs/modules/<name>.md`.

| Module | Brings |
|---|---|
| `portfolio` | `portfolioPage` + `project`, `/portfolio` + `/portfolio/[slug]`, Room x Style filter chips, before/after slider, gallery |
| `process` | `processPage` + `processStep`, `/process`, step illustrations |
| `newsletter` | global signup wiring on `siteSettings` + signup component (plumbing `subscribe.ts` stays in core) |
| `lead-magnets` | `leadMagnet` schema, `/guides` + `/guides/[slug]`, `LeadMagnetForm`, resources-hub entry |
| `style-quiz` | `styleQuiz` schema, `/quiz`, `StyleQuiz` island |
| `budget-calculator` | `budgetCalculator` schema, `/calculator`, `BudgetCalculator` island |
| `shop` | `shopPage`/`shopCollection`/`shopItem`, `/shop`, FTC disclosure, affiliate `rel` handling |
| `e-design` | `eDesignPage`, `/e-design`, pricing tiers |
| `gift-certificates` | `giftPage`, `/gift-certificates` (inquire-only, no payment integration) |
| `press` | `pressPage`/`pressItem`, `/press`, `PressStrip` |

The `resourcesPage` hub ships with whichever capture modules are enabled, since
it only makes sense once at least one is on.

`portfolio` and `process` together are the informal "creative-studio preset":
enable both for a design, photography, or architecture studio; leave both off
for a business that has neither.

### How a module flips on

Enabling = copy the module's files into `src`/`studio`, register its schema in
the studio index, add its nav entry, run its seed. The floor is a precise
checklist in `docs/modules/<name>.md` that a Claude session follows. If that
proves repetitive across projects, a `scripts/enable-module.mjs <name>` can
automate it later. We do NOT build that script up front (YAGNI until project
two asks for it).

Preserved from Reid: every specialized page degrades to a tasteful "coming
soon" empty state when its content is absent. A freshly enabled module is never
a broken page, even before content exists. Keep that pattern.

## The design seam (what gets "nailed down" per project)

Re-skinning a client is editing a short, well-marked list and nothing else:

- `src/styles/globals.css`: the `@theme` tokens and `:root`/`.dark` overrides
  (brand palette, radius).
- Fonts: the fontsource imports plus the type scale in `docs/agent/design-tokens.md`.
- `src/data/site.ts`: identity constants (name, tagline, contact, service area,
  socials).
- Logo / favicon / OG inputs, then `npm run og` and the logo-variant generator.
- `docs/brand/voice.md`: the client's voice rules, replacing Reid's manifesto.
  The mechanism (a voice doc plus a banned-vocabulary list and an AI-tell
  filter) is generic; the contents are per-client.

The starter ships with a **neutral but complete** placeholder brand so it
builds, runs, and reads cleanly in both themes from minute one. You are
recoloring a working site, not assembling one.

## The docs that travel inside the repo

Genericized versions of what Reid already has, with Reid specifics swapped for
stack-level guidance:

- `CLAUDE.md`: stack truths, the rules-that-bite (studio:deploy after schema
  change and never click "Remove field"; build in both themes; static content
  needs a rebuild to go live; etc.), code conventions, and the
  Foundation-vs-Safe-to-edit taxonomy.
- `OPERATIONS.md`: deploy, patch content, run audits, common gotchas.
- `docs/agent/` topic docs: stack-and-config, theme-and-color, design-tokens,
  polish-layer, **animation** (split out from polish-layer, since Lenis +
  motion + scroll-reveal + script accents is a headline feature), seo, sanity,
  images, components, page-architecture, accessibility, performance,
  deployment, error-states, editor-vs-hardcoded.
- New: `docs/bootstrap/NEW-PROJECT.md`, the runbook a fresh project chat reads
  right after `CLAUDE.md`.

## How a new project starts

Clone the template, open it in a Claude session. `CLAUDE.md` auto-loads;
`NEW-PROJECT.md` drives the rest: create/point the Sanity project (ID +
dataset), set the domain, fill `site.ts`, choose palette + fonts, generate
logo/OG, replace placeholder copy, flip on the modules that client needs, seed,
deploy to Cloudflare Workers. Business info is the input. Infrastructure is
already standing.

## What gets stripped (the subtraction list)

- All Reid business content and copy; the voice manifesto contents and
  banned-vocab specifics (keep the mechanism, generalize the contents).
- Reid brand assets: colors, the specific font pairing, logo, OG image, the RD
  monogram favicon. These become neutral defaults that are swappable.
- The one-off Reid scripts: every `patch-*.mjs`, `migrate-*.mjs`, `fix-*.mjs`,
  `inspect-*.mjs`, `wire-key-images.mjs`, and the Reid content seeders. Keep the
  reusable generators (`generate-og-default`, `generate-og-pages`,
  `generate-llms-full`, `generate-logo-variants`, `optimize-logo-files`), a
  generic `import-content`, and `scripts/lib/`. Module seeders get genericized
  into each module.
- `migration-docs/` (Reid-specific). The bootstrap runbook replaces it.
- Reid-specific schema defaults and seeded content.

## Non-goals (YAGNI)

- No `enable-module.mjs` automation in v1. Documented manual enable first.
- Not a living, auto-synced template. Each project is a snapshot; improvements
  are backported to the starter manually when they prove worth it.
- No multi-stack abstraction. This is specifically Astro 6 + Sanity v5 +
  Cloudflare Workers + Tailwind 4 + React 19 islands. It does not try to support
  other adapters or CMSes.
- No removal of the identified modules. If a module turns out not to be reused,
  prune it later, not now.

## Success criteria

- A fresh clone builds and deploys to a Workers URL with zero Reid references.
- It runs clean in light and dark, mobile and desktop, and scores ~100 on
  Lighthouse Accessibility / Best Practices / SEO on the core pages.
- Following NEW-PROJECT produces a re-skinned site with the business's info and
  the chosen modules, with no infrastructure authoring required.
- Each module enables by following its doc without breaking the build; an
  enabled-but-unconfigured module shows a coming-soon state, not a broken page.
- `CLAUDE.md` and `docs/agent/` contain no Reid-specific facts, and every
  preserved gotcha from the "keep" list is still documented.

## Decisions resolved

- **Repo name:** `ncs-astro-sanity-starter`.
- **Process and portfolio:** moved out of core into the module library as the
  `process` and `portfolio` modules (the informal creative-studio pair).
- **Default brand:** the starter ships a neutral, clean-but-generic font pairing
  and palette; the exact choices are a build task, not a blocker.
- **Spec version control:** this spec becomes the first commit in the new
  `ncs-astro-sanity-starter` repo once it is created. Until then it lives at the
  `ReidDesignAstro` root as a loose planning file.

## Build arc from here

This spec, then a written implementation plan (via the writing-plans skill),
then the fork-and-strip build itself. That build is a real multi-session
effort, so it gets a proper phased plan rather than being done ad hoc.

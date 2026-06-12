# ncs-astro-sanity-starter

A reusable starter for building small-business marketing sites on Astro + Sanity + Cloudflare Workers. This is a **page-builder-first** starter: the core pages (home, about, services, process) render from Sanity `pageBuilder` arrays via a shared `SectionRenderer`, and any page created in the Studio gets its own `/[slug]` route automatically. The infrastructure is already standing: theme system, SEO, animation/polish layer, forms plumbing, image handling, a typed Sanity layer, an in-Studio editor guide, and a one-command brand reskin flow. A new project pours in two things -- its brand identity and its content -- and the rest is in place.

Provenance: forked and genericized from a finished client build.

---

## Where to start

**To adopt this starter for a new client, read `docs/bootstrap/NEW-PROJECT.md` first.** It is the single entry point: identity setup, design reskin, module enable, seed, and deploy, in order.

Before making any changes, also read `CLAUDE.md` for the Foundation-vs-Safe-to-edit taxonomy (some files require a planned session; others are safe to edit freely).

---

## Docs layout

| Path | What it covers |
|---|---|
| `CLAUDE.md` | Stack conventions, the rules that bite, Foundation taxonomy, code style |
| `docs/bootstrap/NEW-PROJECT.md` | **Start here.** Step-by-step adoption runbook for a new project |
| `docs/bootstrap/setup-checklist.md` | Pre-launch checklist (run before DNS cutover) |
| `docs/brand/voice.md` | Voice template -- fill in per project |
| `docs/modules/README.md` | Module index, preset bundles, rough enable time |
| `docs/modules/<name>.md` | Per-module enable guide (schemas, desk, queries, nav, seed, verify) |
| `docs/agent/*.md` | Deep reference for AI agents: theme tokens, components, SEO, Sanity, deployment, etc. |

---

## Stack

- **Astro 6** (static output) + TypeScript strict mode
- **Sanity v5** headless CMS (core schemas in `studio/schemaTypes/`)
- **Tailwind 4** via `@tailwindcss/vite` (brand tokens in `src/styles/globals.css`, no `tailwind.config`)
- **React 19** islands for interactivity; Astro components for everything static
- **shadcn/ui** primitives (`src/components/ui/`)
- **Cloudflare Workers** for hosting via `wrangler deploy`

---

## Core routes

The starter ships a lean core. Additional surfaces come from opt-in modules (see below).

| Route | Description |
|---|---|
| `/` | Home -- section-driven via `pageBuilder` + `SectionRenderer` |
| `/about` | About -- section-driven via `pageBuilder` + `SectionRenderer` |
| `/services` | Services -- section-driven via `pageBuilder` + `SectionRenderer` |
| `/process` | Process -- section-driven via `pageBuilder` + `SectionRenderer` |
| `/[slug]` | Custom pages created in the Studio (reserved slugs filtered out) |
| `/faq` | FAQ grouped by category |
| `/contact` | Contact form + scheduling embed |
| `/journal` | Journal/blog index |
| `/journal/[slug]` | Journal post detail |
| `/journal/rss.xml` | Journal RSS feed |
| `/robots.txt` | Generated from `src/pages/robots.txt.ts` (reads production URL from `site.ts`) |
| `/privacy` | Privacy policy |
| `/404` | Custom 404 |

The section-driven pages fall back to code-defined defaults in `src/data/defaultSections.ts` when no Sanity project is connected, so a fresh clone always renders non-blank content.

---

## Modules (opt-in, staged under `modules/`, OFF by default)

There are 10 opt-in modules: `portfolio`, `shop`, `e-design`, `gift-certificates`, `press`, `resources`, `lead-magnets`, `newsletter`, `style-quiz`, `budget-calculator`. Each module ships built but disabled. Nine of them include a co-located query file at `modules/<name>/src/lib/<name>Queries.ts` -- no hand-pasting into core `queries.ts` required (the `newsletter` module has no dedicated route or query file; it is a README-only embed component). Enabling a module is copy-a-folder: copy it into the source tree, register the schema, and toggle on in `siteSettings.sectionVisibility`. Per-module enable guides are in `docs/modules/`.

---

## Local dev

```bash
npm install
npm --prefix studio install
npm run dev          # Astro dev server at localhost:4321
npm run studio:dev   # Sanity Studio at localhost:3333
```

The build works with no Sanity project configured: `src/lib/sanity.ts`'s `sanityFetch` wrapper returns empty results when `PUBLIC_SANITY_PROJECT_ID` is unset, so pages render their empty-state fallbacks. Copy `.env.example` to `.env` and set the Sanity values to connect a project.

---

## Reskinning a new project

`brand/brand.config.json` is the single source of truth: identity, palette (brand tokens + shadcn light/dark semantic tokens), fonts, and logo paths. Edit it, then run:

```bash
npm install @fontsource/your-chosen-fonts   # install fonts first; apply-brand does not install packages
npm run apply-brand                          # rewrites globals.css, site.ts, Studio theme, OG image
npm run build                                # verify nothing broke
```

For a full rebrand from scratch (interview, font install, apply, WCAG AA contrast check, copy retone) use the `/reskin` skill at `.claude/skills/reskin/SKILL.md`. It orchestrates the full sequence end to end.

The step-by-step adoption runbook is at `docs/bootstrap/NEW-PROJECT.md`.

---

## Deploy

```bash
npm run build
npm run deploy   # = wrangler deploy
```

After any Sanity schema change, run `npm run typegen` first, then `npm run build` (or use `npm run build:full` to run both in one step). Also run `npm run studio:deploy` to push updated schemas to the hosted Studio. See `CLAUDE.md` for the conventions and the gotchas that bite.

# ncs-astro-sanity-starter

A reusable starter for building small-business marketing sites on Astro + Sanity + Cloudflare Workers. The infrastructure is already standing: theme system, SEO, animation/polish layer, forms plumbing, image handling, a typed Sanity layer, and an in-Studio editor guide. A new project pours in two things -- its business info and its design -- and the rest is in place.

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
| `/` | Home |
| `/about` | About |
| `/services` | Services |
| `/faq` | FAQ grouped by category |
| `/contact` | Contact form + scheduling embed |
| `/journal` | Journal/blog index |
| `/journal/[slug]` | Journal post detail |
| `/privacy` | Privacy policy |
| `/404` | Custom 404 |

The home, about, and footer include Featured Work, Process, and Press sections that stay hidden until their module is enabled and has content (graceful degradation).

---

## Modules (opt-in, staged under `modules/`, OFF by default)

`portfolio`, `process`, `newsletter`, `lead-magnets`, `style-quiz`, `budget-calculator`, `shop`, `e-design`, `gift-certificates`, `press`, `resources`. Each is self-contained (schema + pages + islands + seed). Per-module enable guides are in `docs/modules/`. `portfolio` + `process` together are the informal creative-studio preset.

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

## Re-skinning a new project (the design seam)

Editing this short list rebrands the whole site:

- `src/styles/globals.css` -- the `@theme` palette tokens and `:root`/`.dark` (and `--tint-rgb`)
- fonts -- the `@fontsource` imports + the `--font-*` tokens (default: Libre Baskerville + Inter; the script accent is opt-in)
- `src/data/site.ts` -- identity constants
- logo / favicon / OG inputs, then `npm run og`

The step-by-step adoption runbook is at `docs/bootstrap/NEW-PROJECT.md`.

---

## Deploy

```bash
npm run build
npm run deploy   # = wrangler deploy
```

After any Sanity schema change, also run `npm run typegen` then `npm run studio:deploy`. See `CLAUDE.md` for the conventions and the gotchas that bite.

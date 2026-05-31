# ncs-astro-sanity-starter

A reusable starter for building small-business marketing sites on Astro + Sanity + Cloudflare Workers. The infrastructure is already standing: theme system, SEO, animation/polish layer, forms plumbing, image handling, a typed Sanity layer, and an in-Studio editor guide. A new project pours in two things, its business info and its design, and the rest is in place.

Provenance: forked and genericized from a finished client build.

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

`portfolio`, `process`, `newsletter`, `lead-magnets`, `style-quiz`, `budget-calculator`, `shop`, `e-design`, `gift-certificates`, `press`, `resources`. Each is self-contained (schema + pages + islands + seed). Per-module enable guides land in `docs/modules/` (authored in a later phase). `portfolio` + `process` together are the informal creative-studio pair.

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

- `src/styles/globals.css` — the `@theme` palette tokens and `:root`/`.dark` (and `--tint-rgb`)
- fonts — the `@fontsource` imports + the `--font-*` tokens (default: Libre Baskerville + Inter; the script accent is opt-in)
- `src/data/site.ts` — identity constants
- logo / favicon / OG inputs, then `npm run og`

The full step-by-step adoption runbook lands at `docs/bootstrap/NEW-PROJECT.md` (authored in a later phase).

---

## Deploy

```bash
npm run build
npm run deploy   # = wrangler deploy
```

After any Sanity schema change, also run `npm run typegen` then `npm run studio:deploy`. See `CLAUDE.md` for the conventions and the gotchas that bite, and `OPERATIONS.md` for the tactical playbook.

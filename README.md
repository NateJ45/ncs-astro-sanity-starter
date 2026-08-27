# NCS Astro + Sanity Starter

A reusable, production-grade starter for small-business marketing sites on **Astro + Sanity + Cloudflare Workers**, by [Nixon Creative Studio](https://nixoncreativestudio.com). It is the foundation the studio's client sites are built on, so a polished, editor-friendly site is an afternoon of setup instead of a month of plumbing.

---

## Why it exists

Every client project kept re-solving the same problems: a theme system, SEO, image handling, forms, a typed CMS layer, an editor guide, and a way to reskin the brand quickly. So those got extracted from a finished client build into one well-documented starting point. What is left for each new project is the part that should be unique: its brand identity and its content.

## What it is

**Page-builder-first.** The core pages (home, about, services, process) render from Sanity `pageBuilder` arrays through a shared `SectionRenderer`, and any page created in the Studio gets its own `/[slug]` route automatically. Editors compose pages from a palette of sections; no code changes to add or rearrange a page.

**Batteries included, opt-in.** The infrastructure is already standing: theme tokens with light and dark, SEO and structured data, an animation and polish layer, forms plumbing, image handling, a typed Sanity layer, and an in-Studio editor guide. Extra capabilities live in a **module library** you enable per project, so a site carries only what it uses.

**Edit on the page, not in a form.** The Sanity Studio is embedded at `/studio` and ships with a live draft preview: an editor picks a page from a list, sees it exactly as visitors will, clicks the words they want to change, and adds, duplicates, reorders or removes whole sections right on the page. Unpublished drafts stream in as they type. The public site stays fully static; the preview is the only part that runs server-side.

**A real adoption path.** A one-command brand reskin, a starter dataset seed, and a documented Foundation-vs-safe-to-edit taxonomy (which files need a planned session and which are safe to touch) mean a new build follows a runbook instead of guesswork. The gotchas that cost time in production are written down where you will hit them.

## Provenance

Extracted and genericized from a finished client build, and hardened across every project since. The lineage runs from a Reid Design build, through this starter, into the church and school sites the studio has shipped. It is not a minimal scaffold: it ships with the patterns and the documented landmines of real, live work.

---

## Stack

- **Astro 7** (static output plus a few SSR preview routes) + TypeScript strict mode
- **Sanity v6** headless CMS, Studio embedded at `/studio` (schemas in `src/sanity/schemaTypes/`)
- **Tailwind 4** via `@tailwindcss/vite` (brand tokens in `src/styles/globals.css`)
- **React 19** islands for interactivity; Astro components for everything static
- **shadcn/ui** primitives; **Cloudflare Workers** hosting via `npm run deploy`

## Getting started

**To adopt this for a new client, read [`docs/bootstrap/NEW-PROJECT.md`](docs/bootstrap/NEW-PROJECT.md) first.** It is the single entry point: identity setup, design reskin, module enable, seed, and deploy, in order. Read [`CLAUDE.md`](./CLAUDE.md) before changing anything for the Foundation taxonomy and code style.

```sh
npm install
npm run dev
```

A fresh clone builds and runs with no Sanity project at all: pages render their built-in default sections. To turn on the CMS and the live preview you need three things, all covered in `docs/bootstrap/NEW-PROJECT.md`:

1. `PUBLIC_SANITY_PROJECT_ID` in `.env` (see `.env.example`).
2. `SANITY_TOKEN` as a Worker runtime secret (see `.dev.vars.example`; `npx wrangler secret put SANITY_TOKEN` in production).
3. Your origins on the Sanity project's CORS allow list: `npx sanity cors add http://localhost:4321 --credentials`, and the same for the deployed URL.

Without steps 2 and 3 the public site is unaffected; only the embedded Studio and the preview are off, and the preview routes say so instead of erroring.

---

Maintained by [Nixon Creative Studio](https://nixoncreativestudio.com).

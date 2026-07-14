# NCS Astro + Sanity Starter

A reusable, production-grade starter for small-business marketing sites on **Astro + Sanity + Cloudflare Workers**, by [Nixon Creative Studio](https://nixoncreativestudio.com). It is the foundation the studio's client sites are built on, so a polished, editor-friendly site is an afternoon of setup instead of a month of plumbing.

---

## Why it exists

Every client project kept re-solving the same problems: a theme system, SEO, image handling, forms, a typed CMS layer, an editor guide, and a way to reskin the brand quickly. So those got extracted from a finished client build into one well-documented starting point. What is left for each new project is the part that should be unique: its brand identity and its content.

## What it is

**Page-builder-first.** The core pages (home, about, services, process) render from Sanity `pageBuilder` arrays through a shared `SectionRenderer`, and any page created in the Studio gets its own `/[slug]` route automatically. Editors compose pages from a palette of sections; no code changes to add or rearrange a page.

**Batteries included, opt-in.** The infrastructure is already standing: theme tokens with light and dark, SEO and structured data, an animation and polish layer, forms plumbing, image handling, a typed Sanity layer, and an in-Studio editor guide. Extra capabilities live in a **module library** you enable per project, so a site carries only what it uses.

**A real adoption path.** A one-command brand reskin, a starter dataset seed, and a documented Foundation-vs-safe-to-edit taxonomy (which files need a planned session and which are safe to touch) mean a new build follows a runbook instead of guesswork. The gotchas that cost time in production are written down where you will hit them.

## Provenance

Extracted and genericized from a finished client build, and hardened across every project since. The lineage runs from a Reid Design build, through this starter, into the church and school sites the studio has shipped. It is not a minimal scaffold: it ships with the patterns and the documented landmines of real, live work.

---

## Stack

- **Astro 6** (static output) + TypeScript strict mode
- **Sanity v5** headless CMS (core schemas in `studio/schemaTypes/`)
- **Tailwind 4** via `@tailwindcss/vite` (brand tokens in `src/styles/globals.css`)
- **React 19** islands for interactivity; Astro components for everything static
- **shadcn/ui** primitives; **Cloudflare Workers** hosting via `wrangler deploy`

## Getting started

**To adopt this for a new client, read [`docs/bootstrap/NEW-PROJECT.md`](docs/bootstrap/NEW-PROJECT.md) first.** It is the single entry point: identity setup, design reskin, module enable, seed, and deploy, in order. Read [`CLAUDE.md`](./CLAUDE.md) before changing anything for the Foundation taxonomy and code style.

```sh
npm install
npm run dev
```

---

Maintained by [Nixon Creative Studio](https://nixoncreativestudio.com).

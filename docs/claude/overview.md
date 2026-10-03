# Starter overview and stack essentials

Moved out of CLAUDE.md. Read when you need the full picture of what the starter is, what ships in it, or the stack must-knows. CLAUDE.md carries the short version.

## About this starter

`ncs-astro-sanity-starter` is a production-ready Astro + Sanity + Cloudflare Workers site template forked from a finished client build. This is a **page-builder-first** starter: the home, about, services, and process pages all render via a shared `SectionRenderer` component fed by Sanity `pageBuilder` arrays, and any custom page created in the Studio gets a `/[slug]` route for free. The infrastructure -- build pipeline, CMS integration, deploy hooks, polish layer, section-visibility system, component library, Lighthouse 100/100/100/100 baseline -- is already standing. A new project pours in two things: its brand identity (run `npm run apply-brand` with `brand/brand.config.json`) and its content.

This starter is not a minimal scaffold. It ships with real patterns and real gotchas documented from production. The point is to skip the month of discovering them.

**It ships FULL and subtracts, and `npm run scaffold` is how.** Everything above is here because some project needed it, not because every project does. A race site needs no services grid; a school needs no testimonials; plenty of sites need no journal. So seven capabilities -- `about`, `faq`, `journal`, `philosophy`, `process`, `services`, `testimonials` -- are marked in the source at every place they register, and `npm run scaffold -- --remove <name> --write` takes one out of all of them at once: the schema, the routes, the components, the desk structure, the three copies of the preview path map, the doc-to-URL switch, the insert menu, the seed rows, the reserved slug and the test route list. Removing one by hand means finding it in about thirty files, of which a dozen are generic registries that must all agree, and a missed one is a runtime error in the Studio that passes the build. The list of what can go is `npm run scaffold` with no arguments, and npm needs its `--` separator in front of the script's own flags. The four kinds of marker are documented at the top of `scripts/scaffold.mjs`.

_Provenance: forked from the Reid Design build._

## Stack essentials

Full stack notes and the `astro.config.mjs` landmines are in `docs/agent/stack-and-config.md`. The must-knows:

- **Astro 7.x**, TypeScript strict, `output: 'static'` with a handful of SSR routes. Node 22.12+.
- **Sanity v6** is the CMS. The Studio lives IN THIS PACKAGE (schemas in `src/sanity/schemaTypes/`, desk in `src/sanity/structure.ts`, config at the repo-root `sanity.config.ts`, CLI config in `sanity.cli.ts`) and is **embedded at `/studio`** via `@sanity/astro`, so it rebuilds with every deploy and can never drift stale. There is deliberately no `studioHost`/`deployment` in `sanity.cli.ts` so a stray `sanity deploy` cannot recreate a hosted copy. `npm run typegen` regenerates types from the schemas.
- **Live draft preview at `/preview/**`** through Sanity's Presentation tool: click-to-edit, live refresh over SSE, and in-canvas section controls. See [.claude/rules/preview-stack.md](../../.claude/rules/preview-stack.md).
- **Tailwind 4 via `@tailwindcss/vite`.** There is no `tailwind.config.mjs`. Brand tokens live in `@theme` blocks in `src/styles/globals.css`.
- **React 19 islands** for interactivity; Astro components for everything static.
- **Cloudflare Workers** for hosting, not Pages (Pages is in maintenance mode). Deploy with `npm run deploy`, which is `wrangler deploy -c dist/server/wrangler.json`. A bare `wrangler deploy` reads the root `wrangler.jsonc`, which knows nothing about the SSR entrypoint, and every sub-route 404s.
- **Web3Forms** contact form, **Calendly** discovery call, **Cloudflare Web Analytics** (cookieless, no banner).
- **`sanityFetch(query, params, fallback)`** in `src/lib/sanity.ts` is the single chokepoint for all Sanity reads. When `PUBLIC_SANITY_PROJECT_ID` is absent or set to the placeholder value, it returns the fallback without any network call, so `npm run build` succeeds with no Sanity project configured -- pages render their default-sections content (see below).
- **Page builder:** `src/components/SectionRenderer.astro` maps each block `_type` to a component and owns the alternating-surface cadence (logic in `src/lib/sectionCadence.ts`, unit-tested). Blocks carry no color field; the cadence is automatic.
- **Default sections fallback:** `src/data/defaultSections.ts` holds code-defined default content arrays for each core page. When a page's `pageBuilder` array is absent (fresh clone, no Sanity project), the route uses the defaults, so the site always renders non-blank content.
- **Brand reskin:** `brand/brand.config.json` is the single source of truth for identity + palette + fonts + logo paths. Running `npm run apply-brand` deterministically rewrites `globals.css` tokens, `src/data/site.ts`, the Studio theme's font stacks in `sanity.config.ts`, and the OG image. For a full rebrand orchestration (interview, font install, apply, contrast check, copy retone) use the `/reskin` skill at `.claude/skills/reskin/SKILL.md`.

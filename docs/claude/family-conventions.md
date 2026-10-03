<!-- PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file -->

# Family conventions (shared by every Astro + Sanity + Cloudflare site repo)

Imported by each repo's `CLAUDE.md` with `@docs/claude/family-conventions.md`. This file is
a PORTABLE copy: edit it in `ncs-astro-sanity-starter` only, then sync it out
(`node scripts/sync-check.mjs` in a site repo reports DRIFT until it matches). Repo-specific
rules (theme, scroll library, deploy shape, brand) stay in that repo's own `CLAUDE.md` or
`.claude/rules/`. An import is expanded into context at launch, so it organises the text but
does not make it cheaper.

## Code conventions

- TypeScript strict mode. No `any`.
- Comment generously, especially in components that a future maintainer might edit by hand.
- At the top of each component file, add a header comment marking it `// Safe to edit by hand` or `// Foundation, edit with care`.
- Astro components for static content. React islands only where interactivity is required (lightbox, mobile nav, form handler, before/after slider, accordions).
- Prefer Astro's built-in `<Image />` and `<Picture />` components over plain `<img>` tags for any locally-bundled assets. For Sanity-hosted images, use the project's `<SanityImage />` wrapper.
- Tailwind utility classes inline. Pull into `@apply` only when a pattern repeats four or more times.
- Use `clsx` or `class-variance-authority` for conditional classes once components get state-dependent styling.

## Working with Claude

- Use Claude Code from the desktop app, not the terminal. Show diffs clearly so they read well in that UI.
- Prefer Plan Mode for any multi-file change, especially when touching Sanity schemas (schema changes propagate to live content).
- Pause for confirmation before installing new dependencies.
- When proposing design changes, describe the visual outcome in plain language, not just the code.
- For browser-based verification, prefer the Playwright MCP. What to verify is in the repo's visual-verification doc.
- For Sanity Studio testing, run `npm run dev` and open `/studio` in a real browser. A 200 response is not verification; read the console.
- Don't report a UI change as done without screenshots at every viewport and theme the site ships (a light-only site has one theme).

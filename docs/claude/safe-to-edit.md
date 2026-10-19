# Safe to edit by hand

Moved out of CLAUDE.md. Read before a reskin or any change where you are unsure whether a file is foundation. The foundation list is .claude/rules/foundation-files.md.

These are the files where a project maintainer can make changes without risk of breaking the underlying architecture:

- Text content inside `src/pages/*.astro` (everything outside the frontmatter and Sanity-fetched content)
- `src/data/layout.ts` -- the layout variants (header, hero, density, cards), written by `npm run apply-brand` from the `layout` block of `brand/brand.config.json`; edit the config, not this file.
- `src/data/site.ts` -- static identity constants (site name, domain, brand color mirrors for scripts, asset paths). Replace all placeholder values before launch. (Written automatically by `npm run apply-brand`; also safe to edit by hand.)
- **The brand config (preferred reskin path):**
  - `brand/brand.config.json` -- single source of truth for identity, palette, fonts, and logo paths. Edit this, then run `npm run apply-brand` and it cascades to globals.css, site.ts, the Studio theme, and the OG image.
  - For a full rebrand orchestration (font install, brand apply, contrast check, copy retone) use the `/reskin` skill at `.claude/skills/reskin/SKILL.md`.
- The design seam -- files that define the visual identity of the project (also written by `apply-brand`; safe to edit directly if you know what you're changing):
  - `src/styles/globals.css` `@theme` block: palette tokens (`--color-primary`, `--color-ink`, `--color-paper`, etc.), the `--tint-rgb` token (controls polish-layer tint color across card-lift, surface-warm, and branded overlays), and font-family tokens
  - Font imports at the top of `src/styles/globals.css` (swap `@fontsource/libre-baskerville` and `@fontsource-variable/inter` for a project's chosen fonts; update `--font-display` and `--font-body` tokens accordingly)
  - `public/favicon.svg`, `public/og-default.png` (regenerate OG via `npm run og` after changing brand inputs in `scripts/generate-og-default.mjs`)
  - Logo files in `src/assets/` (imported by `Header.astro` / `Footer.astro` via `getImage()`)
- `src/data/site.ts` `search` -- visitor search on or off, the box's placeholder, and the suggestion links (PORTS.md card 126, `docs/agent/site-search.md`). Turning it on needs the pinned `pagefind` devDependency.
- `src/data/defaultSections.ts` -- code-defined default section arrays for the section-driven core pages. These are the fallback content shown when no Sanity project is connected. Safe to edit as long as each object matches its schema type.
- Images in `src/assets/` (logo variants, OG image)
- Copy strings and `href` values in static page components
- Tailwind utility classes on existing components when content needs different visual weight
- Tagline and wordmark inputs in `scripts/generate-og-default.mjs`, and the share-image colors and font in `scripts/og-theme.mjs` (normally written by `npm run apply-brand`; re-run `npm run og` after editing)
- `src/sanity/kit.config.ts` -- the Studio kit's settings for this site: staff ids, Home's weekly jobs, Checkup rules, trash types, tour words, feature switches (PORTS.md card 106, `docs/agent/studio-kit.md`), and `pageRules`, the page-builder warnings for this site (card 109).
- `src/sanity/pageTemplates.ts` -- the starting points offered when a Custom page is made (card 109, `docs/agent/sanity.md`). Each site writes its own; keep every example line wrapped in `example()`.
- `src/sanity/pageBuilderAuthoring.ts`, `src/sanity/components/PageBuilderInput.tsx`, `src/pages/styleguide/sections.astro` -- the authoring kit's wiring, insert dialog and thumbnail wall (card 109). Add a fixture to the wall for any new block, then `npm run thumbnails`. The kit itself in `src/sanity/kit/` is PORTABLE: change it in the starter.
- `docs/brand/voice.md` -- per-project voice and copy guidelines (fill in per project; the `/reskin` skill rewrites this during a full rebrand)

**Enabling the script accent (opt-in):** The calligraphic script accent is OFF by default. No script font loads unless you opt in. To enable it for a project: (1) add a `@fontsource` import for your chosen calligraphic face (e.g. `@fontsource/great-vibes/400.css`), and (2) update `--font-script` in the `@theme` block to name that face first. Components using the `font-script` utility class will then render the calligraphic accent.

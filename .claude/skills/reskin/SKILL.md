---
name: reskin
description: "Use this skill when the user wants to rebrand, reskin, or restyle the project for a new client. Triggers on: rebrand, reskin, restyle, new brand, apply the brand, brand colors, change the palette, change the colors and fonts, swap fonts, new identity, new client brand."
---

# Reskin -- Apply a New Brand Identity

Collect all brand inputs, write them into `brand/brand.config.json`, and run
`npm run apply-brand` to update every branding surface in the repo.

## Prerequisites

- `brand/brand.config.json` exists (ships with the template, pre-filled with neutral defaults).
- Node 22+, `npm run apply-brand` is available.
- The project builds cleanly before you start: run `npm run build` and confirm it exits 0.

---

## Step 1 -- Gather brand inputs

Read `brand/brand.config.json`. Note which fields are still at neutral defaults:
`name` ("Studio Starter"), `domain` ("example.com"), `tagline` ("Your tagline goes here."),
and the Slate/Ink/Paper palette. These are the fields to collect from the user.

The brand-defining tokens are:

- `palette.theme["--color-primary"]` -- the main brand color (buttons, links, accents)
- `palette.theme["--color-bg"]` -- the page background
- `palette.theme["--color-accent"]` -- headings and body text
- The corresponding `:root` semantic tokens in `palette.light` and `palette.dark`
- `radius` -- border-radius personality (`"0.5rem"` default = balanced; `"0.25rem"` = sharp/editorial; `"1rem"` = friendly/rounded)

For any missing or placeholder field, interview the user (see Step 2), OR infer a
coherent palette and font pairing from a described vibe and present it for approval
before writing anything.

---

## Step 2 -- Interview the user

Ask for brand inputs. Collect them in this order, one group at a time:

**Identity**

1. Business name (replaces "Studio Starter" everywhere it appears).
2. Domain (replaces "example.com"). Also sets the `site:` URL in `astro.config.mjs`
   when domain is not "example.com".
3. Tagline (replaces "Your tagline goes here.").
4. Contact info: email, phone, address. These are optional; leave blank if not provided.
5. Cloudflare Worker name (`workerName` key -- optional). When set, `apply-brand`
   rewrites the `"name"` field in `wrangler.jsonc`. Leave `null` to skip that file.

**Palette**

Choose one of these three paths. Ask which the user prefers before collecting values:

a. **Hex codes directly.** Collect at minimum: `--color-primary` (main brand color),
   `--color-bg` (light background), `--color-accent` (headings/body text). Derive
   the remaining `@theme` tokens and all `:root`/`.dark` semantic tokens from these
   three, using sensible proportional adjustments (dark variant ~15% darker, soft
   background ~3% darker, dark mode background desaturated and very dark).

b. **Describe a vibe.** Examples: "warm terracotta and cream", "deep navy and gold",
   "cool sage and ivory". From the description, generate a full palette: all ten
   `@theme` tokens, all `palette.light` tokens, and all `palette.dark` tokens. Present
   the result as a table (token, light value, dark value, purpose) and run the WCAG AA
   contrast check (Step 5) before presenting. Wait for approval before writing.

c. **Keep the neutral default.** Skip palette changes entirely.

**Roundness**

6. Radius (`radius` key -- optional). The `--radius` token drives the entire border-radius
   scale. Options: `"0.25rem"` (sharp/editorial), `"0.5rem"` (default -- balanced),
   `"0.75rem"` (softened), `"1rem"` (rounded/friendly). Custom values like `"6px"` are
   also valid. Leave at default if unsure.

**Fonts**

7. Display font (default: Libre Baskerville). Ask if they want to change it.
   If yes: collect the font family name. Confirm a `@fontsource` or `@fontsource-variable`
   package exists for it -- see Step 3 before writing.
8. Body font (default: Inter Variable). Same process.
9. Script accent font: opt-in, off by default (`null` in config). Only collect if requested.

**Logo paths**

10. Path to `logo-light` file and `logo-dark` file (relative to repo root, under `src/assets/`).
    Note that `apply-brand` does not copy files. The user must place the files at those paths
    before running `npm run build`.

---

## Step 3 -- Install font packages first (CRITICAL)

If `fonts.display` or `fonts.body` changes to a new family, the matching `@fontsource`
(or `@fontsource-variable`) package MUST be installed BEFORE running `apply-brand`,
or the build will fail with a missing module error.

Before writing the config or running `apply-brand`:

1. Identify the correct package name. Most families follow the pattern:
   - Regular weights: `@fontsource/<family-name-kebab>` (e.g. `@fontsource/playfair-display`)
   - Variable fonts: `@fontsource-variable/<family-name-kebab>` (e.g. `@fontsource-variable/dm-sans`)
2. Confirm the package exists on npm (search npmjs.com or check fontsource.io).
3. **Pause and confirm with the user** before installing. Show the exact command:
   ```
   npm install @fontsource/<family>
   ```
4. After the user confirms, run the install.
5. Set `fonts.display.imports` (or `fonts.body.imports`) in `brand/brand.config.json`
   to the installed CSS import paths. Example for Playfair Display:
   ```json
   "imports": [
     "@fontsource/playfair-display/400.css",
     "@fontsource/playfair-display/700.css"
   ]
   ```
   Variable fonts typically have a single import path (the package root):
   ```json
   "imports": ["@fontsource-variable/dm-sans"]
   ```

Do not skip this step if fonts change. Font packages are not installed automatically
by `apply-brand`.

---

## Step 4 -- Write brand/brand.config.json, validate, and run apply-brand

Update only the fields the user provided. Do not change fields left at default unless
the user explicitly asked to change them. Write the complete, valid JSON to
`brand/brand.config.json`.

Before running the real write, do a pre-flight validation and dry run:

```
npm run apply-brand -- --check
```

This validates `brand/brand.config.json` against `brand/brand.config.schema.json`
(hex color format, tint-rgb triplet format, required keys) and dry-runs every
substitution pattern against its target file. It prints which files WOULD update
and exits 0 on success, 1 on any validation or pattern failure. Nothing is written.
Fix any errors reported before continuing.

Then run the real apply:

```
npm run apply-brand
```

This rewrites:
- `src/styles/globals.css` -- `@theme` palette tokens, font tokens, `@fontsource` import lines, `:root` semantic tokens, `.dark` semantic tokens, `--radius`, print footer brand string
- `src/data/site.ts` -- `name`, `domain`, `brandColors` (derived fields `storageKeyPrefix`, `themeStorageKey`, `studio` are computed automatically -- never stale)
- `studio/sanity.config.ts` -- `studioThemeProps`
- `scripts/generate-og-default.mjs` -- `wordmark`, `tagline`
- `scripts/lib/render-og.mjs` -- `DEFAULTS` object colors and font stack
- `scripts/generate-og-pages.mjs` -- `WORDMARK` fallback string
- `wrangler.jsonc` -- `"name"` field (only when `workerName` is non-null in config)
- `astro.config.mjs` -- `site:` URL (only when `domain` is not "example.com")
- `public/og-default.png` -- regenerated from the new inputs

If `apply-brand` succeeds, report the log lines (which files changed vs. "no changes").
If it fails, show the error message and help the user correct `brand/brand.config.json`
before retrying.

Commit `public/og-default.png` after a successful reskin -- it is a real asset served
to visitors and the new version reflects the new brand.

---

## Step 5 -- WCAG AA contrast check

After `apply-brand` succeeds, verify these foreground/background pairs in BOTH light
and dark mode. Failing AA is a launch blocker.

| Pair | Minimum ratio |
|---|---|
| `--foreground` on `--background` (body text) | 4.5:1 |
| `--primary` on `--background` (interactive elements) | 3:1 (large/UI) or 4.5:1 (small text) |
| `--muted-foreground` on `--background` (secondary text) | 4.5:1 |
| `--primary-foreground` on `--primary` (button label text) | 4.5:1 |

Compute relative luminance using the WCAG formula:

```
linearize channel c:
  c_lin = c/255 <= 0.04045 ? c/255 / 12.92 : ((c/255 + 0.055) / 1.055)^2.4
L = 0.2126 * R_lin + 0.7152 * G_lin + 0.0722 * B_lin
contrast ratio = (L_lighter + 0.05) / (L_darker + 0.05)
```

If any pair fails AA:

1. Report which token pair fails and the computed ratio.
2. Propose a corrected value: lighten or darken the failing token by roughly 10-15%
   and recompute before proposing.
3. Write the corrected value into `brand/brand.config.json` and re-run `npm run apply-brand`.
4. Repeat until all pairs pass.

Note: `--border`, `--input`, and `--sidebar-border` in the dark block use `oklch(...)` values.
These cannot be checked with the hex luminance formula. Flag them as "manual check needed"
and remind the user to verify visually.

---

## Step 6 -- Visual check

The core pages render WITHOUT a connected Sanity project (they fall back to
`src/data/defaultSections.ts`), so the theme is fully previewable right now.

Run:

```
npm run build
```

Confirm the build exits 0 with no TypeScript errors.

Then serve the build output and capture screenshots at:

- Mobile 390px width -- light mode and dark mode
- Desktop 1280px width -- light mode and dark mode

Check at minimum: home page, any services/about page that exists. Confirm:

- The new brand palette renders correctly (no stale Slate/Ink tokens showing through)
- Typography is loading (no system-font fallback visible where the brand font should appear)
- No layout breaks at either viewport
- Dark mode toggle works and the dark palette looks intentional

Note: screenshots showing real content (projects, portfolio items, blog posts) require
a Sanity dataset. The theme and layout do not. This step verifies branding, not content.

---

## Step 7 -- Rewrite docs/brand/voice.md

Ask the user for the client brand voice. Collect:

1. A one-sentence tone statement: what does this brand sound like, and what does a
   visitor feel after reading a page?
2. Five "do this, not that" pairs. Each pair should be specific and actionable,
   not a vague preference.
3. Any client-specific banned words or phrases (beyond the generic AI-tells that are
   already in the file).

Rewrite the fill-in sections of `docs/brand/voice.md` with the provided content. Keep the
file structure, the generic banned-words list, the punctuation rule, and the "Stop when
you are done" section intact. Only replace the `(fill in)` placeholders.

After rewriting, also update the placeholder copy in `src/data/defaultSections.ts` to
match the new voice. Retone headlines, taglines, and descriptive copy to sound like the
client rather than the neutral starter copy. If a Sanity project is connected and seeded,
flag the seeded content as needing a human voice review in Studio.

---

## Step 8 -- Report what needs a human

After all automated steps complete, always produce this summary:

**Logo files:** Confirm whether `logo-light` and `logo-dark` are in place at the paths
set in `logoPaths`. If not, flag the exact paths where the user must drop the files.
The build will succeed without them (it uses the placeholder SVGs), but the live site
will show the placeholder until the real files are placed.

**Real photography:** The seed content uses placeholder images. Flag that Unsplash credits
or client-supplied photos need to be uploaded in Sanity Studio before launch.

**Voice review:** `docs/brand/voice.md` was rewritten from bullet-point inputs. A human
should read it as a continuous document and adjust phrasing before it becomes the
authoritative style guide for copy editing.

**Contrast judgment calls:** If any contrast fix in Step 5 was a close call (ratio between
4.5:1 and 5.5:1 for body text, or 3:1 and 3.5:1 for large UI), flag it explicitly so the
designer can decide whether to push the token further.

**Per-page OG images:** `npm run og:pages` generates per-route OG images from Sanity.
This requires `PUBLIC_SANITY_PROJECT_ID` to be set in `.env`. Flag if the project is not
yet connected to Sanity.

**Studio theme:** The Sanity Studio theme was updated by `apply-brand`, but the Studio must
be redeployed before editors see the new colors. Run `npm run studio:deploy` when ready.

**Worker name:** If `workerName` was set and `wrangler.jsonc` was rewritten, confirm that
the Worker name is unique in the Cloudflare account before deploying.

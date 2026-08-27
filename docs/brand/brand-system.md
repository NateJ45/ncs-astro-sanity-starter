# Brand system

> Reference for the reskin system: the `brand/brand.config.json` schema, what `npm run apply-brand` rewrites, the `/reskin` skill's guided flow, and the reasoning behind the design.

---

## Overview

Adapting this starter for a new client is a single, guided operation. One config file is the source of truth for all mechanical brand inputs. Two engines consume it:

- **`npm run apply-brand`** -- a deterministic Node script (`scripts/apply-brand.mjs`) that reads `brand/brand.config.json` and rewrites the token files. Idempotent: running it twice with the same config produces no diff on the second run. Supports `--check` for pre-flight validation without writes.
- **`/reskin` skill** (`.claude/skills/reskin/SKILL.md`) -- a Claude skill that handles the fuzzy/editorial layer: interviews for missing inputs, installs font packages, runs `apply-brand`, checks contrast, screenshots the result, and rewrites `docs/brand/voice.md`.

The shipped `brand/brand.config.json` encodes the neutral starter defaults. Running `apply-brand` on a fresh clone is a no-op. Running `apply-brand -- --check` validates the config and dry-runs every pattern match; it writes nothing and exits 0 when everything looks correct.

---

## `brand/brand.config.json` shape

```json
{
  "name": "string",           // business display name
  "domain": "string",         // production domain, no protocol (e.g. "example.com")
  "tagline": "string",        // one-line positioning statement

  "contact": {
    "email": "string",        // optional
    "phone": "string",        // optional
    "address": "string"       // optional
  },

  "palette": {
    "theme": {                // Tailwind @theme brand tokens
      "--color-primary":      "hex",
      "--color-primary-dark": "hex",
      "--color-accent":       "hex",
      "--color-accent-dark":  "hex",
      "--color-secondary":    "hex",
      "--color-tertiary":     "hex",
      "--color-bg":           "hex",
      "--color-bg-soft":      "hex",
      "--color-border-soft":  "hex",
      "--color-white-pure":   "hex"
    },
    "light": {                // shadcn :root semantic tokens (light mode)
      "--background":         "hex",
      "--foreground":         "hex",
      "--card":               "hex",
      "--card-foreground":    "hex",
      "--popover":            "hex",
      "--popover-foreground": "hex",
      "--primary":            "hex",
      "--primary-foreground": "hex",
      "--secondary":          "hex",
      "--secondary-foreground": "hex",
      "--muted":              "hex",
      "--muted-foreground":   "hex",
      "--accent":             "hex",
      "--accent-foreground":  "hex",
      "--border":             "hex",
      "--input":              "hex",
      "--ring":               "hex",
      "--link":               "hex",
      "--sidebar":            "hex",
      "--sidebar-foreground": "hex",
      "--sidebar-primary":    "hex",
      "--sidebar-primary-foreground": "hex",
      "--sidebar-accent":     "hex",
      "--sidebar-accent-foreground": "hex",
      "--sidebar-border":     "hex",
      "--sidebar-ring":       "hex",
      "--tint-rgb":           "R, G, B"   // bare triplet, no rgb() wrapper
    },
    "dark": {                 // shadcn .dark semantic tokens (dark mode)
      // same keys as light; dark mode overrides
      // --border, --input, --sidebar-border may use oklch() for alpha-composited values
    }
  },

  "fonts": {
    "display": {
      "familyValue": "string",   // CSS font-family value for --font-display
      "ogFontStack":  "string",  // font stack string for OG image generation
      "imports":      ["string"] // @fontsource import paths to write into globals.css
    },
    "body": {
      "familyValue": "string",
      "ogFontStack":  "string",
      "imports":      ["string"]
    },
    "script": null | {           // null = script accent disabled (default)
      "familyValue": "string",
      "imports":     ["string"]
    }
  },

  "radius": "string",          // border-radius token, e.g. "0.5rem". Drives --radius in globals.css.
                                // "0.25rem" = sharp/editorial, "0.5rem" = balanced (default),
                                // "0.75rem" = softened, "1rem" = friendly/rounded.

  "workerName": null | "string", // Cloudflare Worker name for wrangler.jsonc.
                                  // When non-null and domain != example.com, apply-brand
                                  // rewrites the "name" field in wrangler.jsonc.
                                  // null = leave wrangler.jsonc untouched.

  "logoPaths": {
    "light": "string",   // path to logo file for light backgrounds (relative to repo root)
    "dark":  "string"    // path to logo file for dark backgrounds
  },

  "studio": {
    "themeProps": {      // CSS custom properties for the Sanity Studio theme
      "--brand-primary": "hex",
      "--gray-base":     "hex",
      // ... and so on
    }
  }
}
```

**Two palette sections, two purposes.** `palette.theme` feeds the Tailwind `@theme` block -- raw named colors that components reference as utility classes (`bg-primary`, `text-accent`). `palette.light` and `palette.dark` feed shadcn's `:root` / `.dark` semantic tokens -- these are the values that flip with the user's light/dark preference. For a coherent reskin, update both.

**`--tint-rgb` is a bare RGB triplet** (`"88, 101, 119"`, not `"rgb(88, 101, 119)"`). The polish layer composes tinted overlays at arbitrary opacity: `rgba(var(--tint-rgb), 0.07)`. Keeping it bare lets the opacity vary without duplicating the hex. Set it to the RGB decomposition of your `--color-primary`.

**`radius` drives the roundness personality.** The `--radius` token in globals.css is the base radius from which all `rounded-*` utilities scale. Changing this one value shifts the entire site from editorial/sharp to friendly/rounded. The `brand.config.json` default (`"0.5rem"`) matches the starter default, so the script is a no-op on a fresh clone.

**`workerName` and domain coverage.** When `workerName` is non-null, `apply-brand` also rewrites the `"name"` field in `wrangler.jsonc` (to set the Cloudflare Worker name). When `domain` is anything other than `"example.com"`, the script also rewrites the `site:` URL in `astro.config.mjs` to `https://<domain>`. The neutral defaults (`workerName: null`, `domain: "example.com"`) leave both files untouched, preserving the no-op guarantee.

---

## What `npm run apply-brand` rewrites

The script (`scripts/apply-brand.mjs`) targets comment-delimited regions in each output file. It rewrites those regions and leaves everything else untouched.

| Output file | What changes |
|---|---|
| `src/styles/globals.css` | `@theme` color tokens, `@theme` font tokens (including `--font-script` always), `@fontsource` import lines, `:root` semantic tokens, `.dark` semantic tokens, `--radius`, print footer brand string |
| `src/data/site.ts` | `name`, `domain`, `brandColors` (`storageKeyPrefix`, `themeStorageKey`, and `studio` are computed from `name` -- never rewritten) |
| `sanity.config.ts` | Studio theme font stacks (`DISPLAY_STACK` / `BODY_STACK`, from `studio.fonts`) |
| `scripts/generate-og-default.mjs` | `wordmark`, `tagline` in the script's inputs block |
| `scripts/lib/render-og.mjs` | `DEFAULTS` object (colors and font stack) |
| `scripts/generate-og-pages.mjs` | `WORDMARK` fallback string |
| `wrangler.jsonc` | `"name"` field -- ONLY when `config.workerName` is non-null |
| `astro.config.mjs` | `site:` URL -- ONLY when `config.domain` is not `"example.com"` |
| `public/og-default.png` | Regenerated from the updated inputs via `npm run og` |

**Idempotent.** Running `apply-brand` twice with the same config produces no diff. The script does not accumulate duplicate declarations.

**Error behavior.** If `brand/brand.config.json` is absent, fails schema validation, or any required substitution pattern is not found in a target file, the script exits with a descriptive error and makes no file changes.

**`--check` pre-flight.** Running `npm run apply-brand -- --check` validates the config against `brand/brand.config.schema.json` and dry-runs every substitution pattern -- prints which files WOULD change, writes nothing, exits 0 on success or 1 on failure. Use this before the real run to catch misconfiguration early.

**OG image side effect.** At the end of the script, `npm run og` regenerates the default OG image. The OG image is non-deterministic (node-canvas rendering varies by environment), so re-running produces a visually identical but byte-different `public/og-default.png`. Commit it after a real reskin; don't be surprised by a diff after a no-op run.

**Font packages are not installed.** The script rewrites import lines but cannot install `@fontsource` packages. If you change fonts, install the packages before running `apply-brand` or the build will fail with a missing module error.

**`--font-script` is always rewritten.** Even when `config.fonts.script` is `null`, the script writes the starter default (`"Snell Roundhand", "Apple Chancery", cursive`) to `--font-script`. This ensures a previous non-null script font does not persist after the config is reverted to `null`.

---

## Schema file

`brand/brand.config.schema.json` is a JSON Schema draft-07 document that `apply-brand.mjs` validates the config against at load time (when the schema file is present). It covers:

- `name`, `domain`, `tagline` -- required strings
- `palette.theme` -- all ten tokens required, each must match `^#[0-9A-Fa-f]{6}$`
- `palette.light` -- required tokens including `--tint-rgb` with pattern `^\d{1,3},\s*\d{1,3},\s*\d{1,3}$`
- `palette.dark` -- `--background`, `--foreground`, `--tint-rgb` required; other tokens may use `oklch()` values
- `fonts.script` -- nullable object (null or object with `familyValue` + `imports`)
- `radius` -- optional string matching `^[0-9]+(\.[0-9]+)?(rem|px|em)$`
- `workerName` -- optional nullable string

---

## Font-package-first requirement

If `fonts.display` or `fonts.body` changes to a new family:

1. Find the correct `@fontsource` package. Regular weight families: `@fontsource/<family-name-kebab>`. Variable fonts: `@fontsource-variable/<family-name-kebab>`.
2. Install it before running `apply-brand`:
   ```
   npm install @fontsource/playfair-display @fontsource-variable/dm-sans
   ```
3. Set `fonts.display.imports` (and/or `fonts.body.imports`) in the config to the installed CSS import paths.
4. Then run `npm run apply-brand`.

The `/reskin` skill handles this sequence for you (Step 3 in the skill).

---

## The `/reskin` skill -- 8-step flow

The skill lives at `.claude/skills/reskin/SKILL.md`. It orchestrates the full new-client brand setup for sessions where a Claude agent is driving. Invoke it with `/reskin` in a Claude session.

**Steps:**

1. **Gather brand inputs.** Read `brand/brand.config.json`. Identify which fields are still at neutral defaults.
2. **Interview the user.** Collect business name, domain, tagline, contact info, Cloudflare Worker name (optional), palette (via hex, vibe description, or "keep defaults"), radius personality, and font choices.
3. **Install font packages.** If fonts change, confirm with the user and install the `@fontsource` packages before proceeding.
4. **Write config + validate + run apply-brand.** Update `brand/brand.config.json`, run `npm run apply-brand -- --check` as a pre-flight, then run `npm run apply-brand`.
5. **WCAG AA contrast check.** Verify foreground/background pairs in both light and dark mode. Minimum ratios: 4.5:1 for body text, 3:1 for large text and UI components. Fix any failing tokens and re-run `apply-brand`.
6. **Visual check.** Run `npm run build`, serve the output, capture screenshots at mobile (390px) and desktop (1280px) in light and dark. Review for palette correctness, font loading, and layout integrity.
7. **Rewrite `docs/brand/voice.md`.** Collect a tone statement and "do this / not that" pairs, then rewrite the voice doc's fill-in sections.
8. **Report what needs a human.** Logo files in place, real photography needed, voice-doc review, contrast judgment calls, Studio redeploy needed, Worker name uniqueness (if `workerName` was set).

---

## Out-of-the-box state

The neutral starter defaults ship as the initial state of `brand/brand.config.json`:
- **Identity:** `"Studio Starter"`, domain `"example.com"`, tagline `"Your tagline goes here."`.
- **Palette:** stone/ink/paper (warm neutral grays, near-black for text, restrained slate accent). Both light and dark defined with the full token set.
- **Fonts:** Libre Baskerville (display) + Inter Variable (body). Both `@fontsource` packages are in `package.json`. Script accent slot is `null`.
- **Radius:** `"0.5rem"` -- balanced default.
- **Worker/site:** `workerName: null`, `domain: "example.com"` -- both `wrangler.jsonc` and `astro.config.mjs` are untouched.
- **Logo:** placeholder SVG text-marks in `src/assets/`.

Running `apply-brand` with these defaults is a no-op. A fresh clone builds, runs, and shows a complete neutrally-branded site without any reskin step.

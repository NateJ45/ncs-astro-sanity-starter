# Phase D -- Brand Reskin System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a single-command rebrand workflow. A developer fills in `brand/brand.config.json` (or invokes the `/reskin` skill to have it filled interactively), runs `npm run apply-brand`, and every branding surface in the repo updates deterministically: CSS tokens, shadcn semantic overrides, `tint-rgb`, font imports, `site.ts` mirrors, Sanity Studio theme props, and OG image inputs. The shipped config encodes the neutral Slate/Ink/Paper defaults so that `apply-brand` against an untouched clone produces zero diff.

**Tech Stack:** Node 22, ESM `.mjs` scripts, Tailwind 4 `@theme` tokens, shadcn semantic token pattern, Sanity `buildLegacyTheme`, `sharp`-based OG renderer.

---

## Branding-surface map (verified from source files)

This section records the exact tokens and structures the script must rewrite. It is the ground truth for D2 and must be kept in sync with the files.

### `src/styles/globals.css`

**Font import lines (lines 9-11):**
```
@import "@fontsource/libre-baskerville/400.css";
@import "@fontsource/libre-baskerville/700.css";
@import "@fontsource-variable/inter";
```
These three specific lines are the only import lines the script replaces. The `@import "tailwindcss"`, `@import "tw-animate-css"`, and `@import "shadcn/tailwind.css"` imports on lines 6-8 are NEVER touched.

**Dark-mode mechanism (line 13):**
```css
@custom-variant dark (&:is(.dark *));
```
Dark mode is toggled by the `.dark` class on a parent element, NOT by `prefers-color-scheme`. Light values live in `:root { ... }` (lines 185-235). Dark values live in `.dark { ... }` (lines 241-282). The script rewrites values in both blocks independently.

**`@theme` block palette tokens (lines 19-30) -- exact names and shipped defaults:**
| Token | Shipped default | Comment |
|---|---|---|
| `--color-primary` | `#586577` | Slate |
| `--color-primary-dark` | `#434E5C` | Slate Dark |
| `--color-accent` | `#2A2D31` | Ink -- headings + body |
| `--color-accent-dark` | `#1E2024` | Ink Dark |
| `--color-secondary` | `#AAB0B8` | Cool Gray |
| `--color-tertiary` | `#9DB0A6` | Muted Sage |
| `--color-bg` | `#FBFBFA` | Paper |
| `--color-bg-soft` | `#F3F4F2` | Soft Paper |
| `--color-border-soft` | `#E6E7E5` | Faint dividers |
| `--color-white-pure` | `#FFFFFF` | Static, typically unchanged |

These ten tokens live ONLY in the `@theme` block. They are NOT in `:root` or `.dark`. They drive Tailwind utility classes (`bg-primary`, `text-accent`, etc.) as static values. The shadcn `@theme inline` block (lines 82-151) re-maps many of them through CSS custom properties (`--color-accent: var(--accent)` overrides the static `--color-accent` for theme-aware surfaces) -- this is the critical shadcn indirection described in Risk 1 below.

**`@theme` block font tokens (lines 33-36) -- exact names:**
| Token | Shipped default |
|---|---|
| `--font-display` | `"Libre Baskerville", Georgia, "Times New Roman", serif` |
| `--font-body` | `"Inter Variable", system-ui, -apple-system, sans-serif` |
| `--font-mono` | `ui-monospace, "SF Mono", Consolas, monospace` |
| `--font-script` | `"Snell Roundhand", "Apple Chancery", cursive` |

`--font-mono` is infrastructure; the brand config does not expose it. `--font-script` is an opt-in accent (no `@fontsource` import by default); the config accepts `null` for script to leave it unchanged.

**`:root` semantic token block (lines 185-235) -- only the tokens `apply-brand` rewrites:**
| Property | Shipped default (light) |
|---|---|
| `--background` | `#FBFBFA` |
| `--foreground` | `#2A2D31` |
| `--card` | `#FFFFFF` |
| `--card-foreground` | `#2A2D31` |
| `--popover` | `#FFFFFF` |
| `--popover-foreground` | `#2A2D31` |
| `--primary` | `#586577` |
| `--primary-foreground` | `#FFFFFF` |
| `--secondary` | `#AAB0B8` |
| `--secondary-foreground` | `#2A2D31` |
| `--muted` | `#F3F4F2` |
| `--muted-foreground` | `#5F6469` |
| `--accent` | `#E8E9E7` |
| `--accent-foreground` | `#2A2D31` |
| `--border` | `#E6E7E5` |
| `--input` | `#E6E7E5` |
| `--ring` | `#586577` |
| `--link` | `#434E5C` |
| `--sidebar` | `#FBFBFA` |
| `--sidebar-foreground` | `#2A2D31` |
| `--sidebar-primary` | `#586577` |
| `--sidebar-primary-foreground` | `#FFFFFF` |
| `--sidebar-accent` | `#F3F4F2` |
| `--sidebar-accent-foreground` | `#2A2D31` |
| `--sidebar-border` | `#E6E7E5` |
| `--sidebar-ring` | `#586577` |
| `--tint-rgb` | `88, 101, 119` |

`--tint-rgb` is bare RGB integers (no `#`). This token drives `surface-warm`, `img-tint`, and the paper-grain overlay. It must be kept in sync with `--color-primary` and is encoded in the config as `"--tint-rgb": "88, 101, 119"`. The script reconstructs or accepts it explicitly.

**`.dark` semantic token block (lines 241-282) -- only the tokens `apply-brand` rewrites:**
| Property | Shipped default (dark) |
|---|---|
| `--background` | `#17191C` |
| `--foreground` | `#F2F3F2` |
| `--card` | `#202327` |
| `--card-foreground` | `#F2F3F2` |
| `--popover` | `#202327` |
| `--popover-foreground` | `#F2F3F2` |
| `--primary` | `#8A96A6` |
| `--primary-foreground` | `#17191C` |
| `--secondary` | `#5A6068` |
| `--secondary-foreground` | `#F2F3F2` |
| `--muted` | `#202327` |
| `--muted-foreground` | `#AAB0B8` |
| `--accent` | `#2C3036` |
| `--accent-foreground` | `#F2F3F2` |
| `--border` | `oklch(1 0 0 / 12%)` |
| `--input` | `oklch(1 0 0 / 15%)` |
| `--ring` | `#8A96A6` |
| `--link` | `#8A96A6` |
| `--sidebar` | `#202327` |
| `--sidebar-foreground` | `#F2F3F2` |
| `--sidebar-primary` | `#8A96A6` |
| `--sidebar-primary-foreground` | `#17191C` |
| `--sidebar-accent` | `#2C3036` |
| `--sidebar-accent-foreground` | `#F2F3F2` |
| `--sidebar-border` | `oklch(1 0 0 / 12%)` |
| `--sidebar-ring` | `#8A96A6` |
| `--tint-rgb` | `138, 150, 166` |

Note: `--border`, `--input`, and `--sidebar-border` in the dark block use `oklch(...)` values, not hex. The config stores these as string literals and the script passes them through as-is.

**Tokens the script does NOT touch in globals.css:**
- `--radius` (structural, not brand)
- `--chart-*` (neutral; caller must add to config to change)
- `--destructive` (uses `oklch`, semantic state, not brand)
- The entire `@theme inline` block (indirection layer -- values come from `:root`/`.dark`)
- All spacing, heading-size, leading, tracking, container, and transition tokens
- All utility classes, animations, and base resets

### `src/data/site.ts`

Fields the script rewrites:
- `name` (line 7) -- bare string literal
- `domain` (line 9) -- bare string literal
- `brandColors` object (lines 16-26) -- nine keyed hex strings:
  `primary`, `primaryDark`, `accent`, `accentDark`, `secondary`, `tertiary`, `bg`, `bgSoft`, `border`

Fields the script does NOT touch:
- `studio`, `url`, `storageKeyPrefix`, `themeStorageKey` (derived / infrastructure)
- `assets` block (logo paths managed separately)
- `repo`

Note: the `brandColors` keys do NOT match the `@theme` token names 1-to-1. Mapping is explicit:
- `primary` <- `config.palette.theme["--color-primary"]`
- `primaryDark` <- `config.palette.theme["--color-primary-dark"]`
- `accent` <- `config.palette.theme["--color-accent"]`
- `accentDark` <- `config.palette.theme["--color-accent-dark"]`
- `secondary` <- `config.palette.theme["--color-secondary"]`
- `tertiary` <- `config.palette.theme["--color-tertiary"]`
- `bg` <- `config.palette.theme["--color-bg"]`
- `bgSoft` <- `config.palette.theme["--color-bg-soft"]`
- `border` <- `config.palette.theme["--color-border-soft"]` (key name mismatch; script handles explicitly)

### `studio/sanity.config.ts`

The `studioThemeProps` object (lines 29-60). The script rewrites the values of these keys:
```
'--black'                    (Ink -- #2A2D31)
'--white'                    (Paper -- #FBFBFA)
'--gray-base'                (Slate -- #586577)
'--brand-primary'            (#586577)
'--brand-primary--inverted'  (#ffffff -- usually stays white)
'--focus-color'              (#586577)
'--input-bg'                 (#F3F4F2)
'--component-bg'             (#F3F4F2)
'--component-text-color'     (#2A2D31)
'--default-button-color'     (#586577)
'--default-button-primary-color' (#586577)
'--main-navigation-color'    (#2A2D31)
'--main-navigation-color--inverted' (#FBFBFA)
```
The state/button colors (`--default-button-success-color`, `--default-button-warning-color`, `--default-button-danger-color`, `--state-*`) are NOT rewritten by default (they are semantic UX states, not brand). The config may optionally include them under a `studioStateColors` key.

### OG generator inputs

**`scripts/generate-og-default.mjs` (lines 12-16):**
- `wordmark` -- the `renderOg` call passes `'Studio Starter'`
- `tagline` -- the `renderOg` call passes `['Your tagline goes here.']`

**`scripts/lib/render-og.mjs` `DEFAULTS` object (lines 14-22):**
- `bg`: `'#FBFBFA'`
- `primary`: `'#586577'`
- `primaryDark`: `'#3E4A57'`
- `accent`: `'#2A2D31'`
- `taupe`: `'#8E9DAD'`
- `fontDisplay`: `'Libre Baskerville, Georgia, Cambria, Times New Roman, serif'`

**`scripts/generate-og-pages.mjs` line 69:**
- `const WORDMARK = env.SITE_NAME ?? 'Studio Starter';`
  The script rewrites the string literal fallback `'Studio Starter'` to the new name. The `SITE_NAME` env override path is left intact.

### `package.json` scripts block

Current brand-related scripts: `"og": "node scripts/generate-og-default.mjs"`, `"og:pages": "node scripts/generate-og-pages.mjs"`. No `apply-brand` slot exists. D2 adds it.

### `.claude/` structure

Only `.claude/launch.json` exists. No `.claude/skills/` directory. Phase D creates `.claude/skills/reskin/SKILL.md`. Skill file format: YAML frontmatter with `name` and `description` keys, then a markdown body.

---

## Risk assessment and mitigations

**Risk 1 -- shadcn `@theme inline` indirection overrides `@theme` static `--color-accent`.**
The `@theme inline` block at line 123 sets `--color-accent: var(--accent)`, which wins over the static `--color-accent: #2A2D31` from `@theme` because `@theme inline` is declared later. So `text-accent` and `bg-accent` are theme-aware (resolve from `--accent` in `:root`/`.dark`) rather than pinned to the `@theme` value. `apply-brand` rewrites `--color-accent` in `@theme` (which controls headings through the `@layer base` rule `color: var(--color-accent)`) AND rewrites `--accent` in `:root`/`.dark` (which controls shadcn component surfaces). Both must stay in sync. The config provides both sets separately under `palette.theme` (for `@theme` tokens) and `palette.light` / `palette.dark` (for `:root`/`.dark` tokens). Running `apply-brand` twice produces no diff because each replacement is keyed on the exact declaration text.

**Risk 2 -- `oklch(...)` values in the dark block.**
`--border`, `--input`, and `--sidebar-border` in `.dark` use `oklch(1 0 0 / 12%)` syntax. The script stores and passes these through as opaque strings (the config value is the full `oklch(...)` expression). Regex matching is against the property name, not the value format, so it handles any valid CSS value string.

**Risk 3 -- font replacement is multi-line (import lines + `@theme` declaration).**
Swapping the display font requires: removing 2-3 old `@import` lines, adding new import lines, and updating the `--font-display` value in `@theme`. The script handles these as three independent operations with separate regex passes. If any old import line is not found, it errors rather than leaving orphaned imports.

**Risk 4 -- `src/data/site.ts` is TypeScript with `as const`.**
The script uses regex replacements keyed on each property name (e.g., `/(\s+primary:\s*")(#[0-9A-Fa-f]+)(")/ `). The idempotent pattern does NOT hard-code the default value -- it matches any quoted string in the value position: `/(\s+primary:\s*")((?:[^"\\]|\\.)*)(")/ `. This approach matches after a reskin (when the value is no longer the default), so running twice still produces no diff. The `as const` annotation is structurally after the object closing brace and is not affected. The file is NOT executed or imported by the script.

**Risk 5 -- `studio/sanity.config.ts` uses a `const studioThemeProps` variable.**
The object literal spans lines 29-60. The script rewrites individual property values using per-key regex (e.g., `/'--brand-primary':\s*'[^']*'/` replaced with `'--brand-primary': '${value}'`). The TypeScript type comment above (lines 63-67) explains why the variable is not inlined; the script never touches that comment or the `buildLegacyTheme(studioThemeProps)` call.

**Idempotency guarantee:**
Every regex in the script is keyed on the property/token name and matches any CSS value (or any quoted string) in the value position. Running `apply-brand` twice on the same config produces identical output on the second run, so `git diff` shows no change. The round-trip gate in the exit criteria verifies this.

---

## Task D0 -- No branch needed

Phase D adds new files only (`brand/brand.config.json`, `scripts/apply-brand.mjs`, `.claude/skills/reskin/SKILL.md`) and makes targeted surgical edits to `docs/bootstrap/NEW-PROJECT.md`. All work is on the current branch (`feat/page-builder-and-reskin-port`).

- [ ] Confirm `git status` is clean before starting D1.

---

## Task D1 -- Create `brand/brand.config.json`

**Purpose:** Single source of truth for all brand inputs. Pre-filled with the neutral Slate/Ink/Paper defaults so that `apply-brand` run against a fresh clone is a no-op.

**Files created:** `brand/brand.config.json`

**Shape:**

```json
{
  "name": "Studio Starter",
  "domain": "example.com",
  "tagline": "Your tagline goes here.",
  "contact": {
    "email": "",
    "phone": "",
    "address": ""
  },
  "palette": {
    "theme": {
      "--color-primary":      "#586577",
      "--color-primary-dark": "#434E5C",
      "--color-accent":       "#2A2D31",
      "--color-accent-dark":  "#1E2024",
      "--color-secondary":    "#AAB0B8",
      "--color-tertiary":     "#9DB0A6",
      "--color-bg":           "#FBFBFA",
      "--color-bg-soft":      "#F3F4F2",
      "--color-border-soft":  "#E6E7E5",
      "--color-white-pure":   "#FFFFFF"
    },
    "light": {
      "--background":                "#FBFBFA",
      "--foreground":                "#2A2D31",
      "--card":                      "#FFFFFF",
      "--card-foreground":           "#2A2D31",
      "--popover":                   "#FFFFFF",
      "--popover-foreground":        "#2A2D31",
      "--primary":                   "#586577",
      "--primary-foreground":        "#FFFFFF",
      "--secondary":                 "#AAB0B8",
      "--secondary-foreground":      "#2A2D31",
      "--muted":                     "#F3F4F2",
      "--muted-foreground":          "#5F6469",
      "--accent":                    "#E8E9E7",
      "--accent-foreground":         "#2A2D31",
      "--border":                    "#E6E7E5",
      "--input":                     "#E6E7E5",
      "--ring":                      "#586577",
      "--link":                      "#434E5C",
      "--sidebar":                   "#FBFBFA",
      "--sidebar-foreground":        "#2A2D31",
      "--sidebar-primary":           "#586577",
      "--sidebar-primary-foreground":"#FFFFFF",
      "--sidebar-accent":            "#F3F4F2",
      "--sidebar-accent-foreground": "#2A2D31",
      "--sidebar-border":            "#E6E7E5",
      "--sidebar-ring":              "#586577",
      "--tint-rgb":                  "88, 101, 119"
    },
    "dark": {
      "--background":                "#17191C",
      "--foreground":                "#F2F3F2",
      "--card":                      "#202327",
      "--card-foreground":           "#F2F3F2",
      "--popover":                   "#202327",
      "--popover-foreground":        "#F2F3F2",
      "--primary":                   "#8A96A6",
      "--primary-foreground":        "#17191C",
      "--secondary":                 "#5A6068",
      "--secondary-foreground":      "#F2F3F2",
      "--muted":                     "#202327",
      "--muted-foreground":          "#AAB0B8",
      "--accent":                    "#2C3036",
      "--accent-foreground":         "#F2F3F2",
      "--border":                    "oklch(1 0 0 / 12%)",
      "--input":                     "oklch(1 0 0 / 15%)",
      "--ring":                      "#8A96A6",
      "--link":                      "#8A96A6",
      "--sidebar":                   "#202327",
      "--sidebar-foreground":        "#F2F3F2",
      "--sidebar-primary":           "#8A96A6",
      "--sidebar-primary-foreground":"#17191C",
      "--sidebar-accent":            "#2C3036",
      "--sidebar-accent-foreground": "#F2F3F2",
      "--sidebar-border":            "oklch(1 0 0 / 12%)",
      "--sidebar-ring":              "#8A96A6",
      "--tint-rgb":                  "138, 150, 166"
    }
  },
  "fonts": {
    "display": {
      "familyValue": "\"Libre Baskerville\", Georgia, \"Times New Roman\", serif",
      "ogFontStack": "Libre Baskerville, Georgia, Cambria, Times New Roman, serif",
      "imports": [
        "@fontsource/libre-baskerville/400.css",
        "@fontsource/libre-baskerville/700.css"
      ]
    },
    "body": {
      "familyValue": "\"Inter Variable\", system-ui, -apple-system, sans-serif",
      "ogFontStack": "Inter, system-ui, sans-serif",
      "imports": [
        "@fontsource-variable/inter"
      ]
    },
    "script": null
  },
  "logoPaths": {
    "light": "src/assets/logo-light.svg",
    "dark":  "src/assets/logo-dark.svg"
  },
  "studio": {
    "themeProps": {
      "--black":                         "#2A2D31",
      "--white":                         "#FBFBFA",
      "--gray-base":                     "#586577",
      "--brand-primary":                 "#586577",
      "--brand-primary--inverted":       "#ffffff",
      "--focus-color":                   "#586577",
      "--input-bg":                      "#F3F4F2",
      "--component-bg":                  "#F3F4F2",
      "--component-text-color":          "#2A2D31",
      "--default-button-color":          "#586577",
      "--default-button-primary-color":  "#586577",
      "--main-navigation-color":         "#2A2D31",
      "--main-navigation-color--inverted":"#FBFBFA"
    }
  }
}
```

**Steps:**
- [ ] Create directory `brand/` at repo root.
- [ ] Write `brand/brand.config.json` with the exact shape above.
- [ ] Verify the JSON parses cleanly: `node -e "JSON.parse(require('fs').readFileSync('brand/brand.config.json','utf8'))"`.
- [ ] Note: `brand/brand.config.json` is committed to git. It contains only neutral public defaults. If a project stores sensitive contact info that should not be in git, those values should live in `.env` instead; this config stores only brand identity values safe for a public repo.

**Commit:** `add brand/brand.config.json with neutral Slate/Ink/Paper defaults`

---

## Task D2 -- Create `scripts/apply-brand.mjs`

**Purpose:** Reads `brand/brand.config.json` and deterministically rewrites every branding surface. Idempotent: running twice produces no diff.

**Files created:** `scripts/apply-brand.mjs`
**Files modified:** `package.json` (add `"apply-brand"` script)

### Algorithm

The script is structured as a pipeline of pure rewrite functions, one per target file. Each function:
1. Reads the file.
2. Applies all substitutions.
3. If the result differs from the input, writes it back.
4. If any substitution fails (property name not found in file), throws a descriptive error and does NOT write any changes to that file.

All-or-nothing per file: if one substitution in a file fails, none of the substitutions for that file are written. Errors across files are collected and reported together.

### Substitution mechanics

Each substitution uses a regex pattern of the form:

```
/(propertyName:\s*)([^;]+)(;)/
```

for `@theme` tokens and `:root`/`.dark` properties (CSS), or:

```
/('propKey':\s*')([^']+)(')/
```

for `studioThemeProps` string literals (TypeScript).

The replacement preserves the leading whitespace (capture group 1) and trailing semicolon or quote (capture group 3). Only group 2 (the value) is replaced. This makes every substitution idempotent: running it again when the value already equals the config value yields the same string.

**Idempotency caveat for `@theme` font values:** The font `familyValue` strings contain commas and quotes. The regex for the value must consume up to the semicolon: `/--font-display:\s*([^;]+);/`. This correctly handles multi-word values with internal commas. Running twice: the replaced value IS the config value, so the match produces an identical replacement.

### `src/styles/globals.css` rewrites

**Step 1 -- `@theme` palette tokens.** For each key in `config.palette.theme`:
```
pattern: new RegExp(`(${escapedToken}:\\s*)([^;]+)(;)`)
replaces group 2 with: config.palette.theme[token]
```
Apply to the entire file text (the `@theme` block is at the top; there are no duplicate declarations for these tokens).

**Step 2 -- `@theme` font tokens.** For `--font-display`, `--font-body`, and optionally `--font-script` (only if `config.fonts.script !== null`):
```
pattern: new RegExp(`(--font-display:\\s*)([^;]+)(;)`)
replaces group 2 with: config.fonts.display.familyValue
```
Same for `--font-body` and `--font-script`.

**Step 3 -- font import lines.** Locate the block of `@fontsource` import lines (any `@import` that contains `@fontsource`). The script identifies the block by matching the multiline pattern:
```
/(@import "@fontsource[^"]+";[\r\n]+){2,3}/
```
Replaces the entire block with the imports built from `config.fonts.display.imports` and `config.fonts.body.imports` (and `config.fonts.script.imports` if not null). If no `@fontsource` imports are found, the script errors rather than guessing. Because the shipped config has the same values as the file, this produces the same text on a no-op run.

**Step 4 -- `:root` semantic tokens.** For each key in `config.palette.light`:
Applied to the substring from the `:root {` opening to its closing `}`. Extract that substring, apply all substitutions, then splice it back. This scopes the replacements to `:root` only and avoids false matches in `.dark`.

**Step 5 -- `.dark` semantic tokens.** Same as Step 4 but scoped to the `.dark {` block. Applied to `config.palette.dark`.

### `src/data/site.ts` rewrites

The script handles targeted replacements using idempotent patterns that match any current value (not just the default), so the script is safe to run after a previous reskin:

1. `name` string: `/(  name:\s*")((?:[^"\\]|\\.)*)(")/ ` -> new name
2. `domain` string: `/(  domain:\s*")((?:[^"\\]|\\.)*)(")/ ` -> new domain
3. `brandColors` keys: one per key, e.g. `/(    primary:\s*")((?:[^"\\]|\\.)*)(")/ ` -> mapped value from `config.palette.theme`

The script must NOT change `studio`, `url`, `storageKeyPrefix`, `themeStorageKey`, `assets`, or `repo`. These are out of scope and protected by patterns scoped to the exact indentation and key names of the `brandColors` block.

### `studio/sanity.config.ts` rewrites

For each key in `config.studio.themeProps`:
```
pattern: new RegExp(`('${escapedKey}':\\s*')([^']+)(')`)
```
Applied to the `studioThemeProps` object literal. The object is identified by its opening `const studioThemeProps = {` declaration and its closing `};` on a line by itself. The script extracts that block, applies all key-value substitutions within it, and splices it back.

### OG generator rewrites

**`scripts/generate-og-default.mjs`:**
- `wordmark`: `/(wordmark:\s*')((?:[^'\\]|\\.)*)(')/ ` -> `config.name`
- `tagline`: `/(tagline:\s*\[')((?:[^'\\]|\\.)*)('\])/` -> `config.tagline`

**`scripts/lib/render-og.mjs`:**
Rewrite the `DEFAULTS` object values for `bg`, `primary`, `primaryDark`, `accent`, `taupe`, `fontDisplay`. Mappings:
- `bg` <- `config.palette.light["--background"]`
- `primary` <- `config.palette.theme["--color-primary"]`
- `primaryDark` <- `config.palette.theme["--color-primary-dark"]`
- `accent` <- `config.palette.theme["--color-accent"]`
- `taupe` <- `config.palette.theme["--color-secondary"]`
- `fontDisplay` <- `config.fonts.display.ogFontStack`

Per-key patterns: `/(  bg:\s*')((?:[^'\\]|\\.)*)(')/ ` etc. (matching the two-space indent inside the `DEFAULTS` object).

**`scripts/generate-og-pages.mjs`:**
- `WORDMARK` fallback: `/(const WORDMARK = env\.SITE_NAME \?\? ')((?:[^'\\]|\\.)*)(';)` -> replace group 2 with `config.name`.

### After all rewrites: run OG

After all file rewrites succeed, the script spawns the OG generator as a child process using Node's `spawnSync` with an argument array (not a shell string) to avoid injection concerns:

```js
import { spawnSync } from 'node:child_process';
const result = spawnSync('npm', ['run', 'og'], { stdio: 'inherit', shell: false });
if (result.status !== 0) {
  throw new Error(`apply-brand: npm run og exited with status ${result.status}`);
}
```

The `shell: false` flag is explicit. The only argument passed is the static string `'og'` from the script itself; no user input reaches the spawn call.

If `npm run og` fails, the script exits with a non-zero code and reports the error. The file rewrites have already been written at this point (they are not rolled back on OG failure, since the file state is consistent and the OG failure is typically a missing `sharp` native module on a new machine, not a logic error).

### `package.json` change

Add to `scripts`:
```json
"apply-brand": "node scripts/apply-brand.mjs"
```
This is the only change to `package.json`.

### Implementation steps

- [ ] Write `scripts/apply-brand.mjs` with the algorithm above. Structure:
  ```
  loadConfig()           -- read + validate brand.config.json, throw if malformed
  rewriteGlobalsCss()    -- steps 1-5 (palette.theme, fonts, imports, :root, .dark)
  rewriteSiteTs()        -- name, domain, brandColors
  rewriteSanityConfig()  -- studioThemeProps
  rewriteOgDefault()     -- wordmark, tagline
  rewriteRenderOg()      -- DEFAULTS object
  rewriteOgPages()       -- WORDMARK fallback
  runOg()                -- spawnSync npm run og
  main()                 -- call all in order, collect errors, report summary
  ```
- [ ] Each rewrite function:
  - reads the file once at the top
  - builds all substitutions
  - if any token is not found: throws `Error("apply-brand: token '--color-primary' not found in src/styles/globals.css")`
  - if result !== input: writes the file
  - logs `[apply-brand] src/styles/globals.css -- no changes` or `[apply-brand] src/styles/globals.css -- updated`
- [ ] Add `"apply-brand": "node scripts/apply-brand.mjs"` to `package.json` scripts block.
- [ ] Manual smoke-test: `npm run apply-brand` against the unmodified clone. Confirm zero file writes (all "no changes" log lines) and `git diff` shows nothing.

**Commit:** `add scripts/apply-brand.mjs and apply-brand npm script`

---

## Task D3 -- Create `.claude/skills/reskin/SKILL.md`

**Purpose:** An interactive Claude skill that interviews the user for brand inputs, writes `brand/brand.config.json`, runs `apply-brand`, and verifies the result.

**Files created:** `.claude/skills/reskin/SKILL.md`

**Content:**

```markdown
---
name: reskin
description: "Use this skill when the user wants to rebrand, reskin, or restyle this project for a new client. Triggers on: rebrand, reskin, restyle, new brand, apply brand, brand colors, change the palette, swap fonts, new identity."
---

# Reskin -- Apply a New Brand Identity

Collect all brand inputs, write them into brand/brand.config.json, and run
npm run apply-brand to update every branding surface in the repo.

## Prerequisites

- brand/brand.config.json exists (it ships with the template).
- Node 22+, npm run apply-brand is wired (confirmed in Phase D).

## Flow

### Step 1 -- Read current config

Read brand/brand.config.json. Note which fields are still at neutral defaults
(name "Studio Starter", domain "example.com", tagline placeholder). These are
the fields to collect.

### Step 2 -- Interview the user

Ask for brand inputs one at a time. Collect:

1. Business name (replaces "Studio Starter" everywhere).
2. Domain (replaces "example.com").
3. Tagline (replaces "Your tagline goes here.").
4. Contact info: email, phone, address (optional; leave blank if not provided).
5. Brand palette. Options:
   a. Provide hex codes directly for the key tokens (primary, bg, foreground, accent).
   b. Describe a vibe ("warm terracotta and cream", "deep navy and gold") and let
      the skill generate a full palette -- present it for approval before writing.
   c. Keep the neutral default (skip palette changes).
6. Display font (default: Libre Baskerville). Ask if they want to swap it.
   If yes: collect the font name, confirm it has a @fontsource package, install it.
7. Body font (default: Inter Variable). Same as above.
8. Script accent font: opt-in, off by default.
9. Logo files: ask for the paths to logo-light and logo-dark files.
   Note that apply-brand does not copy files; the user must place them in src/assets/.

When generating a palette from a vibe:
- Produce a full set of @theme tokens, :root semantic tokens, and .dark semantic tokens.
- Present the palette as a table: token name, light value, dark value, purpose.
- Check WCAG AA contrast before presenting (see Step 5).
- Wait for approval before writing.

### Step 3 -- Write brand/brand.config.json

Update only the fields the user provided. Do not touch fields left at default
unless the user explicitly changed them. Write the file.

### Step 4 -- Run apply-brand

Run: npm run apply-brand

If it succeeds, report what changed (the log lines from apply-brand).
If it fails, show the error and help the user fix the config before retrying.

### Step 5 -- WCAG AA contrast check

After apply-brand succeeds, check these pairs in both light and dark mode:
- foreground on background (body text): target >= 4.5:1
- primary on background (interactive): target >= 3:1 (large text) or 4.5:1 (small)
- muted-foreground on background: target >= 4.5:1
- primary-foreground on primary (button text): target >= 4.5:1

Use the relative luminance formula: L = 0.2126*R + 0.7152*G + 0.0722*B (linearized).
Contrast ratio = (L_lighter + 0.05) / (L_darker + 0.05).

If any pair fails AA:
1. Report which token pair fails and what ratio was computed.
2. Propose a corrected value (lighten or darken the failing token by 10-15% and recheck).
3. Update the config and re-run apply-brand.
4. Repeat until all pairs pass.

Caveat: oklch values in the dark block (--border, --input, --sidebar-border) cannot be
checked with the hex luminance formula. Note these as "manual check needed".

### Step 6 -- Playwright screenshots (optional, requires Playwright installed)

If the user wants visual verification:
1. Run: npm run dev (background)
2. Capture screenshots at mobile 390px and desktop 1280px, light and dark mode:
   - Home page
   - Services page (if exists)
3. Show the screenshots for review.

Note: Playwright must be installed in the project (it is not a starter dependency).
If not installed, skip this step and instruct the user to check npm run dev manually.

### Step 7 -- Update docs/brand/voice.md

Ask the user for the client brand voice:
- One-sentence tone statement.
- Five "do this, not that" pairs.
- Any client-specific banned words.

Rewrite the fill-in sections of docs/brand/voice.md with the provided content.
Do not change the structure or the generic banned-words list.

### Step 8 -- Report what needs a human

After all automated steps complete, always report:
- Logo files: did the user confirm logo-light and logo-dark are in src/assets/? If not, flag it.
- Real photography: the seed content uses placeholder images; flag that Unsplash or
  client photos need to be uploaded in Sanity Studio.
- Voice review: the voice.md was written from bullet points; a human should review it.
- Per-page OG images: npm run og:pages generates per-route OG images from Sanity.
  This requires PUBLIC_SANITY_PROJECT_ID to be set. Flag if .env is not configured.
```

**Steps:**
- [ ] Create directory `.claude/skills/reskin/`.
- [ ] Write `.claude/skills/reskin/SKILL.md` with the content above.
- [ ] Verify the frontmatter has `name: reskin` and a `description` string.

**Commit:** `add .claude/skills/reskin/SKILL.md`

---

## Task D4 -- Wire neutral defaults and update NEW-PROJECT.md

**Purpose:** Ensure `apply-brand` is the documented step-one entry point for onboarding, replacing the manual "edit these files" instructions in Step 4 of the current runbook.

**Files modified:** `docs/bootstrap/NEW-PROJECT.md`

### Changes to NEW-PROJECT.md

The current Step 4 ("Nail the design") is a 140-line manual walkthrough of editing globals.css, site.ts, and logo files. Replace it with a short section that points to the automated path while keeping the manual path as a fallback reference.

Replace the current Step 4 section (from `## Step 4 -- Nail the design` through the last line before `## Step 5 -- Voice`) with:

```markdown
## Step 4 -- Apply the brand identity

The fastest path is the `/reskin` skill (if you are working inside Claude Code):

    /reskin

The skill interviews you for brand inputs, writes brand/brand.config.json,
runs npm run apply-brand, checks WCAG AA contrast, and reports what still needs
a human (logos, photography, voice review).

### Manual path (if not using Claude Code)

Fill in brand/brand.config.json at the repo root. The file ships pre-filled
with the neutral Slate/Ink/Paper defaults. Change only what differs from the
defaults. Then run:

    npm run apply-brand

This rewrites src/styles/globals.css (@theme tokens, :root, .dark, font imports),
src/data/site.ts (name, domain, brandColors), studio/sanity.config.ts
(studioThemeProps), and the OG generator inputs, then regenerates public/og-default.png.

After apply-brand, verify with:

    git diff
    npm run build

**Logo files:** Drop logo-light.* and logo-dark.* into src/assets/. The Header
and Footer import them via Astro's Image component.

**Favicon:** Replace public/favicon.svg.

**Per-page OG images:** Once Sanity is configured and .env is set, run:

    npm run og:pages

See docs/agent/theme-and-color.md for the full token map if you need to make
manual token adjustments beyond what apply-brand covers.
```

**Steps:**
- [ ] Edit `docs/bootstrap/NEW-PROJECT.md`: locate the `## Step 4 -- Nail the design` heading and replace the section body (from that heading down to but not including `## Step 5`) with the content above.
- [ ] Confirm the file still has Steps 1 through 10 in sequence with no numbering gaps.

**Commit:** `update NEW-PROJECT.md to reference apply-brand as step-one reskin path`

---

## Exit criteria (Phase D complete when all pass)

**Gate 1 -- No-op idempotency.** Run `npm run apply-brand` against the unmodified clone (brand.config.json at neutral defaults). Every rewrite function logs "no changes". `git diff` shows zero changed lines.

**Gate 2 -- Round-trip smoke test.** Apply an arbitrary test brand (e.g., `--color-primary: #8B4513`, `--background: #FFF8F0`, `--color-accent: #1A0F00`). Then:
- `npm run build` exits 0.
- `git diff src/styles/globals.css` shows the three `@theme` tokens changed and the corresponding `:root` and `.dark` tokens changed.
- `git diff src/data/site.ts` shows `brandColors.primary` changed.
- `git diff studio/sanity.config.ts` shows `'--brand-primary'` changed.
- `git diff scripts/lib/render-og.mjs` shows `primary` in `DEFAULTS` changed.
- `public/og-default.png` was regenerated (file mtime updated).
- Run `npm run apply-brand` a second time with the same config. `git diff` shows zero additional changes (idempotency after reskin).
- Revert: restore `brand/brand.config.json` to neutral defaults, run `npm run apply-brand` again, confirm the repo returns to its original token values (`git diff` shows nothing against the original baseline).

**Gate 3 -- Test suite.** `npm test` passes (22 tests green). `apply-brand` does not break any existing test.

**Gate 4 -- Build clean.** `npm run build` from a clean state exits 0 with no TypeScript errors.

**Gate 5 -- Skill file.** `.claude/skills/reskin/SKILL.md` exists, frontmatter has `name: reskin` and a `description` string, body contains Steps 1 through 8 headings.

**Gate 6 -- NEW-PROJECT.md.** Steps 1-10 are all present. Step 4 references both `npm run apply-brand` and `/reskin`. No instructions to manually edit the `@theme` block remain in Step 4 (that guidance now lives only in the "See docs/agent/theme-and-color.md" pointer).

---

## File inventory

| File | Action |
|---|---|
| `brand/brand.config.json` | Create (D1) |
| `scripts/apply-brand.mjs` | Create (D2) |
| `package.json` | Edit: add `apply-brand` script (D2) |
| `.claude/skills/reskin/SKILL.md` | Create (D3) |
| `docs/bootstrap/NEW-PROJECT.md` | Edit: Step 4 replacement (D4) |

No other files are added or modified. The branding surfaces (`globals.css`, `site.ts`, `sanity.config.ts`, OG scripts) are only changed at runtime by `apply-brand`; they are not statically modified in this phase.

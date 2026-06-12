# Reskin-system audit addendum (2026-06-12)

The reskin dimension auditor failed during the main workflow run (API overload) and was re-dispatched
separately. Its findings below complete `2026-06-12-starter-audit-findings.md`. Findings 1-3 were
spot-verified against the code (globals.css:893 print footer, apply-brand.mjs:150 quantifier,
apply-brand.mjs:74 string-form replace).

SUMMARY: The brand reskin system is well-architected for the happy path (neutral no-op defaults,
all-or-nothing writes, CRLF preservation, clear skill/script division). Two silent-corruption bugs,
one hard-crash edge case, and several missing knobs.

## Findings

1. [high/bug] `$`-interpolation risk in applySubstitutions
   file: scripts/apply-brand.mjs:74
   detail: `result.replace(pattern, replacement)` uses the string form, so `$&`, `$1`, `` $` `` etc.
   in a config value are interpolated by JS replace semantics and silently corrupt output.
   fix: use the function form: `result.replace(pattern, () => replacement)` - disables `$`
   interpolation entirely. One-line change.

2. [high/bug] Font import block regex requires 2+ consecutive @fontsource lines
   file: scripts/apply-brand.mjs:150
   detail: `(?:@import "@fontsource[^"]*";\r?\n){2,}` throws "@fontsource import block not found"
   when globals.css carries a single import line (single variable-font setup, or display lines
   removed by hand). Nothing in the spec requires two lines.
   fix: relax `{2,}` to `{1,}`.

3. [medium/bug] Print footer brand string never rewritten
   file: src/styles/globals.css:893 + scripts/apply-brand.mjs
   detail: `body::after { content: "Studio Starter · example.com"; }` in the print stylesheet is a
   hardcoded literal; apply-brand rewrites site.ts/OG/sanity.config but not this string. Every
   reskinned client site prints "Studio Starter · example.com" in the footer.
   fix: add a substitution in rewriteGlobalsCss replacing the literal with `${config.name} · ${config.domain}`.

4. [medium/bug] `--font-script` never reset when fonts.script returns to null
   file: scripts/apply-brand.mjs:128-134, src/styles/globals.css:36
   detail: substitution only pushed when `config.fonts.script !== null`; after a previous run set a
   custom script font, re-running with `script: null` leaves the stale font in place.
   fix: always rewrite `--font-script` - config value when non-null, starter default
   (`"Snell Roundhand", "Apple Chancery", cursive`) when null.

5. [medium/feature-gap] No JSON schema for brand.config.json and no --check / dry-run mode
   detail: loadConfig() validates top-level keys only; bad token values (rgb() strings, empty
   strings) rewrite silently. Only way to validate is a real run, which also triggers `npm run og`.
   fix: add brand/brand.config.schema.json (hex pattern, tint-rgb pattern, required keys) and a
   `--check` flag that validates config + pattern matches without writing. Reference
   `npm run apply-brand -- --check` in SKILL.md as a pre-flight.

6. [medium/feature-gap] site.ts derived fields not updated by reskin
   file: src/data/site.ts:8,11-12
   detail: `studio`, `storageKeyPrefix`, `themeStorageKey` stay "studio-starter" after reskin;
   localStorage key collisions across reskinned dev sites on a shared origin.
   fix: best option - make them computed in site.ts from `name` (slugify) so the script never needs
   to touch them.

7. [low/improvement] Tagline injection lacks single-quote escaping
   file: scripts/apply-brand.mjs:299-303
   detail: a tagline containing an apostrophe breaks the generated JS string in
   generate-og-default.mjs without an error from the script.
   fix: `config.tagline.replace(/'/g, "\\'")` before injection.

8. [low/feature-gap] No border-radius personality knob
   file: brand/brand.config.json, src/styles/globals.css:222
   detail: `--radius: 0.5rem` drives the whole radius scale (sharp/editorial vs friendly/SaaS) but
   is not in brand.config.json, so the one-pass reskin cannot express roundness personality.
   fix: add a `radius` key to brand.config.json, a substitution in rewriteGlobalsCss, document in
   brand-system.md and SKILL.md Step 2.

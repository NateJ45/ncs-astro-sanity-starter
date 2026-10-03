---
paths:
  - 'brand/**'
  - 'scripts/apply-brand.mjs'
  - 'scripts/generate-og-*.mjs'
  - 'src/data/site.ts'
  - 'src/data/layout.ts'
  - 'src/lib/site-layout.ts'
  - 'src/components/Header.astro'
  - 'src/components/Hero.astro'
  - 'src/data/defaultSections.ts'
  - 'src/styles/globals.css'
  - 'src/assets/**'
  - 'docs/brand/**'
  - '.claude/skills/reskin/**'
---

# Brand reskin and fork-residue rules (11, 12, 13, 18)

Loads when you touch brand config, site identity or assets. Moved verbatim from CLAUDE.md.

11. **This starter was FORKED FROM A CLIENT BUILD, so check for residue before you trust a default.** Four separate pieces of the Reid Design build survived into it and were only found when a real project shipped them: that client's logo in `src/assets/*.png` (imported by the footer while the header used the placeholder SVGs), an interior-design business playbook in the seeded `studioPlaybook`, the starter's own palette hardcoded into the Brand kit panel, and the starter's own Worker name in `deploy-staging.yml`. All four were correct code containing the wrong noun, so nothing caught them. They are fixed, but the LESSON is the durable part: placeholder content must read as placeholder, and anything carrying a name, a colour or a logo needs checking against `apply-brand`'s file list. The audit is PORTS.md card 44.
12. **`apply-brand` does not install font packages.** Run `npm install @fontsource/...` for the chosen fonts before running `npm run apply-brand`. The script rewrites imports and tokens but cannot install packages itself.
13. **After `apply-brand`, run `npm run build`** to verify the reskin did not break anything. The brand script does not run the build chain and does not change schemas, so typegen is not needed here unless you also changed a schema in the same session.

<!-- rule 18 is its own list so prettier keeps the number; CLAUDE.md and the docs cite it as rule 18 -->

18. **Layout variants are the structure axis of the brand config; a default emits nothing.** `brand.config.json` `layout` (header, hero, density, cards) is validated by the schema and written to `src/data/layout.ts` by `apply-brand`. The slot lists and defaults live ONLY in `src/lib/site-layout.ts` (PORTABLE; `site-layout.test.ts` is a gate that fails if schema, config and lib disagree). Rules for adding or changing a variant: (a) the first value of a slot is today's behaviour and must emit no attribute and no CSS match, so an existing site renders pixel-identical; (b) variants are CSS keyed on `html[data-header|density|cards]` (unlayered, end of `globals.css`) or the per-section `data-hero` from `Hero.astro`, never a forked page or a second component; (c) a new value needs a baseline in `tests/visual/layouts.spec.ts` at 390 and 1280 (the spec loops over `LAYOUT_SLOTS`, so adding the value to the lib adds the shots), generated in CI like every baseline, and existing baselines are never refreshed for it; (d) keep the hook classes (`site-header__row`, `__nav`, `__menu`, `__pill`, `__eyebrow`) that the header CSS targets. To prove "default unchanged" screenshot `/` and one inner page at 390 and 1280 before and after and compare pixels (PORTS.md card 72 has the numbers). Not the same as `src/lib/layout-variants.ts` (per-section columns in the Studio).

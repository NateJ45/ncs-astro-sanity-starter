---
paths:
  - 'brand/**'
  - 'scripts/apply-brand.mjs'
  - 'scripts/generate-og-*.mjs'
  - 'src/data/site.ts'
  - 'src/data/defaultSections.ts'
  - 'src/styles/globals.css'
  - 'src/assets/**'
  - 'docs/brand/**'
  - '.github/workflows/deploy-staging.yml'
  - '.claude/skills/reskin/**'
---

# Brand reskin and fork-residue rules (11, 12, 13)

Loads when you touch brand config, site identity or assets. Moved verbatim from CLAUDE.md.

11. **This starter was FORKED FROM A CLIENT BUILD, so check for residue before you trust a default.** Four separate pieces of the Reid Design build survived into it and were only found when a real project shipped them: that client's logo in `src/assets/*.png` (imported by the footer while the header used the placeholder SVGs), an interior-design business playbook in the seeded `studioPlaybook`, the starter's own palette hardcoded into the Brand kit panel, and the starter's own Worker name in `deploy-staging.yml`. All four were correct code containing the wrong noun, so nothing caught them. They are fixed, but the LESSON is the durable part: placeholder content must read as placeholder, and anything carrying a name, a colour or a logo needs checking against `apply-brand`'s file list. The audit is PORTS.md card 44.
12. **`apply-brand` does not install font packages.** Run `npm install @fontsource/...` for the chosen fonts before running `npm run apply-brand`. The script rewrites imports and tokens but cannot install packages itself.
13. **After `apply-brand`, run `npm run build`** to verify the reskin did not break anything. The brand script does not run the build chain and does not change schemas, so typegen is not needed here unless you also changed a schema in the same session.

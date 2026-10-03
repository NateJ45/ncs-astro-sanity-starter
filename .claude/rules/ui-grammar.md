---
paths:
  - 'src/components/**'
  - 'src/layouts/**'
  - 'src/pages/**/*.astro'
  - 'src/styles/**'
---

# Rule 17: one grammar per page

Loads when you edit components, layouts, pages or styles. Moved verbatim from CLAUDE.md. The visual verification loop for UI changes is docs/claude/visual-verification.md.

17. **One grammar per page.** Every heading and every object shares one left edge, text-and-picture bands share one split, and buttons come from one family. Stone Steps shipped with three heading systems running at once, a leftover button style from this starter, and three bands each drawing their own eyebrow on top of the shared one, because `SectionHeading` and the band components each carried a default that nothing had to opt into. The site read as unfinished for a reason no single section was responsible for, which is why this is worth stating as a rule: the defect is only visible when you scroll the whole page, and nobody reviews a whole page while writing one band. The lever here is `align` on `SectionHeading.astro`, which is per-call and defaults to `left`: pick the page's grammar once and do not vary it band by band. No test enforces it. `npm run parity compare` will tell you a render changed, not that a render is inconsistent.

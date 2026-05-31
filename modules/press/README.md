# press module

Adds a `/press` page that lists media coverage and press features. The page opens with the `PressStrip` logo row (already in core -- shared with the home and about pages), followed by optional intro copy from the `pressPage` singleton, and then a full article-by-article listing of all `pressItem` documents ordered by `orderRank`. Each listing card shows the outlet name, publication date, a pull-quote, and a link to the original piece. The list suppresses to an empty-state panel when no `pressItem` documents exist. Introduces two Studio schemas: `pressPage` (singleton for SEO, hero, and intro copy) and `pressItem` (orderable collection, one document per coverage item).

**Depends on (already in core):** `PressStrip.astro`, `SectionHeading.astro`, `SanityImage.astro`, `CtaLink.astro`, `getSectionVisibility` (from `@/lib/sectionVisibility`).

Enable steps and exact code snippets are in `docs/modules/press.md`. Run `node modules/press/seed.mjs` after enabling to populate a neutral `pressPage` singleton and three placeholder `pressItem` documents (Publication One, Two, Three).

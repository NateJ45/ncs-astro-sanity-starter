# resources module

Adds a `/resources` hub page that collects all the studio's free tools and
guides in one place. Content is managed via the `resourcesPage` singleton.
Individual resource links are inline `resourceCard` objects inside the
singleton -- there is no separate collection schema.

When the Sanity document has no cards configured, the page falls back to a
hardcoded set of nav-style cards (quiz, calculator, guides, FAQ, journal).
Both the Sanity cards and the fallback cards are filtered by `sectionVisibility`
so cards pointing at disabled modules are hidden automatically -- no 404s.

**Important:** Enable this module alongside at least one capture module
(`lead-magnets`, `style-quiz`, or `budget-calculator`). The page degrades
gracefully when linked modules are off, but the cards for those routes will
not appear until those modules are enabled.

**Core dependencies (do not copy these -- they live in the core):**
`SanityImage.astro`, `SectionHeading.astro`,
`getSectionVisibility` (from `@/lib/sectionVisibility`).

**Env/config:** None beyond the standard `PUBLIC_SANITY_*` set.

Enable steps and exact code snippets are in `docs/modules/resources.md`.
Run `node modules/resources/seed.mjs` after enabling to populate the singleton
with five neutral starter cards.

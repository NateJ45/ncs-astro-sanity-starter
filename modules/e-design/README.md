# e-design module

Adds an `/e-design` service landing page for online or virtual design offerings. The page presents an intro section, numbered how-it-works steps, a deliverables list, pricing tiers in a card grid, optional FAQ references, and a final CTA panel. All copy is managed via the `eDesignPage` singleton in Studio. CTAs always route to `/contact?type=e-design` to pre-select the e-design option in the contact form. A coming-soon holding state renders automatically when the `eDesignPage` document has not yet been published.

**Depends on (already in core):** `SectionHeading.astro`, `FinalCta.astro`, `FaqAccordion.tsx`, `PortableText.tsx`, `Hero.astro`, `getSectionVisibility` (from `@/lib/sectionVisibility`).

Enable steps and exact code snippets are in `docs/modules/e-design.md`. Run `node modules/e-design/seed.mjs` after enabling to populate a neutral placeholder page with three pricing tiers.

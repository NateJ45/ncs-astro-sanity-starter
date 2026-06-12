# virtual-services module

Adds a `/virtual-services` service landing page for online or remote service offerings. The page presents an intro section, numbered how-it-works steps, a deliverables list, pricing tiers in a card grid, optional FAQ references, and a final CTA panel. All copy is managed via the `virtualServicesPage` singleton in Studio. CTAs always route to `/contact?type=virtual-services`. A coming-soon holding state renders automatically when the `virtualServicesPage` document has not yet been published.

This module was formerly named **e-design**. If you enabled the e-design module before this rename, see `docs/modules/virtual-services.md` for migration notes.

**Depends on (already in core):** `SectionHeading.astro`, `FinalCta.astro`, `FaqAccordion.tsx`, `PortableText.tsx`, `Hero.astro`, `getSectionVisibility` (from `@/lib/sectionVisibility`).

Enable steps and exact code snippets are in `docs/modules/virtual-services.md`. Run `node modules/virtual-services/seed.mjs` after enabling to populate a neutral placeholder page with three pricing tiers.

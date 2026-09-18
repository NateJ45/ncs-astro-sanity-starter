# donations module

Adds a `/donate` landing page for accepting donations through an external processor (Donorbox, PayPal Giving Fund, Stripe Donate, Give Lively, etc.). No payment processing happens on the page itself -- the donate button links out to the configured processor URL. Sections include a hero, mission copy, impact stats row, prominent donate CTA, optional FAQ accordion, and a closing dark CTA panel. A coming-soon state renders when the `donationsPage` document has not yet been published. Studio schema: `donationsPage` (singleton).

**Pairs well with:** `events` (link events to donation campaigns) and `newsletter` (capture donor contact info). Adding `portfolio` gives impact storytelling through project case studies. Together, these three modules form the non-profit preset.

**Depends on (already in core):** `SectionHeading.astro`, `Hero.astro`, `FaqAccordion.tsx`, `PortableText.tsx`, `getSectionVisibility` (from `@/lib/sectionVisibility`).

Enable steps and exact code snippets are in `docs/modules/donations.md`. Run `node modules/donations/seed.mjs` after enabling. Replace `donateUrl` with your real processor URL before publishing.

# gift-certificates module

Adds a `/gift-certificates` landing page for gift certificate inquiries. The page is informational only -- there is no payment processing. It presents an intro, certificate option cards, numbered how-it-works steps, fine-print terms, and a final CTA. All copy is managed via the `giftPage` singleton in Studio. CTAs always route to `/contact?type=gift-certificate` to pre-select the gift certificate option in the contact form. A coming-soon holding state renders automatically when the `giftPage` document has not yet been published.

**Depends on (already in core):** `SectionHeading.astro`, `Hero.astro`, `getSectionVisibility` (from `@/lib/sectionVisibility`).

Enable steps and exact code snippets are in `docs/modules/gift-certificates.md`. Run `node modules/gift-certificates/seed.mjs` after enabling to populate a neutral placeholder page with three certificate options and three how-it-works steps.

# lead-magnets module

Adds a downloadable guides library. The index page (`/guides`) lists all
published `leadMagnet` documents as card links. Each guide links to its own
landing page (`/guides/[slug]`) which shows a cover image, a summary of what
the guide covers, and a gated email-capture form powered by `LeadMagnetForm`.
On successful submission the form reveals the download link.

When no guides are published, `/guides` renders a friendly empty state and does
not crash. When `getStaticPaths` returns zero slugs, the `[slug]` route simply
generates no pages -- the build still succeeds.

**Core dependencies (do not copy these -- they live in the core):**
`subscribe.ts` (ESP + Web3Forms fallback for the gate form),
`SanityImage.astro`, `SectionHeading.astro`, `FinalCta.astro`,
`getSectionVisibility` (from `@/lib/sectionVisibility`).

**Env/config:** The same ESP plumbing used by the newsletter module applies
here. Set `PUBLIC_NEWSLETTER_FORM_ACTION` (or the equivalent field in
`siteSettings.newsletter.formActionUrl`) for the primary provider; set
`PUBLIC_WEB3FORMS_KEY` as a fallback. Both are optional -- if neither is
configured, form submissions silently succeed on the front end but no email is
captured. See `src/lib/subscribe.ts` for the full priority chain.

Enable steps and exact code snippets are in `docs/modules/lead-magnets.md`.
Run `node modules/lead-magnets/seed.mjs` after enabling to create two neutral
placeholder guides. Each guide starts unpublished; upload real PDFs and set
`published: true` in the Studio before making them visible to visitors.

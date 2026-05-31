# newsletter module

Configuration-only module. Enables a global email signup widget in the site
footer (and Journal index page) by toggling `siteSettings.newsletter.enabled`
in Studio. No files need to be copied -- the `NewsletterSignup.tsx` component,
the `subscribe.ts` helper, and the `siteSettings.newsletter` field group all
ship in the core.

**Core dependencies (do not copy these -- they live in the core):**
`NewsletterSignup.tsx`, `subscribe.ts` (`src/lib/`), and the `newsletter`
field group on the `siteSettings` schema.

**No seed script.** A seed that patches the core `siteSettings` singleton
would silently enable the newsletter in any project that runs it, which is
the opposite of "opt-in by default." Enable the feature manually:
open **Studio > Site Settings > Newsletter** and set the toggle to `true`.

Enable instructions and env var details are in `docs/modules/newsletter.md`.

# The client offer, stated honestly

What you can promise a client whose site runs on this stack, what you
must not promise, and the words to use. Written 2026-08-28, when the
Unlocked Studio program (PORTS cards 18-25) landed across the family.

## The promise you can make

"You can change almost anything yourself, and you can't break it."

Concretely, an editor with a Studio login can, with no developer:

- Build and reshape pages: add, remove, reorder, and duplicate
  sections in a visual picker, with live preview and click-to-edit.
- Manage pages like things they own: create, duplicate, archive and
  restore, rename (old links keep working by themselves), set search
  and social sharing per page, and see a Google/share-card preview
  while they type.
- Edit the header and footer: menu links (with a page picker that
  follows renames), logo, the header button, footer columns, and
  show/hide toggles for contact details and socials.
- Build their own forms (up to 12 questions) whose answers arrive by
  email with nothing to configure server-side.
- Save a filled-in section and reuse it on other pages.
- Publish later (a date field and a half-hour cron), show someone a
  draft with a one-hour link, run a courtesy pre-publish check, and
  restore any earlier version of a document.

## What stays locked, and why that is the offer

No freeform fonts, colors, or spacing. No raw HTML embeds. No custom
CSS per page. The design system, the accessibility ratios, and the
performance budget are the product: bounded freedom is why the site
still looks designed in year three. If a client wants visual
variation, the answer is curated presets you design (a deliberate,
per-client decision - see "Theme presets" below), never a color
picker.

## Roles, honestly

Sanity's free plan has two roles: Administrator and Editor. Give
clients Editor. That means:

- Editors can create, edit, publish, and delete content - everything
  the promise above needs.
- There is no read-only role, no per-document permissions, and no
  custom roles on the free plan. Field-level locking is done in
  schema (readOnly), not in roles.
- Custom roles, more granular permissions, SSO, and Sanity's own
  scheduled publishing arrive with the Growth plan (~$15/seat/month,
  2026 pricing). Do not promise granularity you have not paid for.
  The family's publishAt cron (card 20) exists precisely so
  scheduling does not require the paid plan.
- Seats are limited on the free plan (check the current limit before
  promising a team of editors).

## Theme presets (decide per client, default no)

A `themePreset` selector is NOT built. It is a deliberate per-client
decision: two or three palette/type variations, each designed and
contrast-checked by you, selectable in Site settings. Build it only
when a client genuinely needs seasonal or campaign variation.
Default answer: the brand is the brand.

## The care plan (what rides alongside)

Already built into every repo, worth naming in the offer:

- Nightly dataset backups (sanity-backup.yml + the SANITY_AUTH_TOKEN
  secret) and uptime checks.
- The parity harness and test suites gating every change.
- The sync system (PORTS.md): a fix made once in the starter rolls to
  every site.
- Quarterly slop sweeps (card 16) as scheduled maintenance.

## Words to avoid

- "Page views" for workers.dev sites - the stats tool counts requests
  served; say "visits to the site". A custom domain (zone) is what
  unlocks true path-level analytics.
- "Share links last as long as you need" - draft share links expire
  in one hour, by the package's design.
- "Anyone on your team" - count the free-plan seats first.

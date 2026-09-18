# PENDING.md - open loops in this repo

Created 2026-08-28 (PORTS.md card 15). This is a **registry, not a narrative**: every
entry is a live open loop with its blocker, and it is edited in the same commit as the
thing it tracks. When an item closes, delete it and note the closure in
`docs/agent/changelog.md`, which is the prose ledger.

Read this early in a session. The point is that a new session inherits the queue instead
of rediscovering it.

Related registries: `PORTS.md` (what is shared with the rest of the site family, plus the
applied-to matrix and `npm run sync-check`), `docs/agent/changelog.md` (what happened, in
sequence).

---

## Waiting on a human

### 1. Verify the live preview against a real Sanity project

**Blocker: this template has no Sanity project, by design.**

The 2026-08-28 upgrade installed the whole preview stack, but a template cannot prove the
half that needs credentials. What WAS verified here: the build, the embedded Studio
mounting in a real browser, `/preview/live` returning 403 without the Studio cookie, and
every preview entry point failing closed with a 503 that names the missing configuration.

What is still unproven, and what a fork should check on its first real project:

- `/preview` renders a draft page (a builder page in full fidelity, a bespoke page as its
  editable surface with the note).
- `/api/draft-mode/enable` returns **401** on a bad secret and sets the cookie on a good
  one. (With no project configured it cannot get that far and returns 503 instead.)
- Click-to-edit opens the right field, and no enum-driven block takes the wrong branch
  (that would mean a missing name in `NON_STEGA_FIELDS`).
- The in-canvas section controls appear on hover: insert before/after through the grouped
  menu, duplicate, remove, drag to reorder.
- An edit in another tab reaches the preview through `/preview/live` without a reload.
- **The floating controls from PORTS.md card 28** (added 2026-08-28). These are the least
  provable part of the stack, because every one of them needs a resolver context the host
  only builds against a real schema:
  - clicking a heading on a text block, CTA band, services grid, testimonials or FAQ
    section shows "Accent a word", and clicking a word in the card sets `headingAccent`
    in the draft (the Studio's unpublished-changes badge should move);
  - clicking the same word again clears it;
  - clicking a subhead on any of the six twin-carrying sections shows "Edit here", the box
    is seeded with the plain string, and the B / I buttons store `strong` / `em`;
  - pasting a styled paragraph out of a word processor into that box keeps only bold and
    italic and drops fonts, colours and tables;
  - the card survives the pointer travelling to it (see the own-open-state rule on the
    card) and closes on Escape, on Save, and on a click outside;
  - Ctrl+Z in the Studio undoes what the card wrote (card 27).

Whoever does this first should report back so PORTS.md cards 10 and 28's starter cells
carry a verified-in-anger note rather than an installed-and-gated one.

---

### 1a. Sign in to a Studio built on the phase-1 Sanity set

**Blocker: no agent can do this, and this template has no Sanity project.**

2026-09-06 moved this repo onto the family's phase-1 Sanity set (`sanity` 6.9.1,
`@sanity/ui` 3.5.4, `@sanity/client` 7.26.2, `@sanity/visual-editing` 5.7.3). Every
automated gate is green and the single-instance invariant holds on disk and in the
lockfile, but the login screen is core code and renders fine even when the
styled-components theme context is broken. The set is already human-verified on
presacademy, reid-design-site and mas-monograms, so the risk here is low; what is
unverified is this repo's own custom Studio panes and the in-canvas overlay against it.
Whoever forks this next should sign in, open the desk, and drive the Presentation tool
until an in-canvas control draws and writes back, then note it here.

Do NOT take `sanity` 6.9.2: that PATCH release crosses to `@sanity/ui` 4, which is a real
migration (PORTS.md card 10, phase 2).

### 1b. Run `npm run cutover --write` against a real zone, once

**Blocker: this template owns no domain, and the one real cutover predates the script.**

Added 2026-09-18 with PORTS.md card 48. `scripts/cutover.mjs` generalises the
stonesteps50k.com move from GoDaddy to Cloudflare, which was done by hand that morning:
every API call in the script is one that was made, in that order, and worked. What has
NOT happened is the script itself making them.

What IS proved here: the whole dry-run path against a fake domain, and the zone audit
against `scripts/fixtures/godaddy-zone-export.txt`, which carries every fault the real
export had (25 unit cases in `src/lib/zone-audit.test.ts`).

What the next client's cutover should confirm, in order, and note here:

- The zone create returns nameservers and the script prints them before anything else.
- The import POST accepts the cleaned file, and the resulting record set matches the
  audit's `import + rewrite` count exactly.
- The script refuses to import over a zone that already holds records.
- With the zone still `pending`, step 3 stops and says nothing below was attempted.
- After the nameservers move: both custom domains attach, the redirect rule lands in the
  `http_request_dynamic_redirect` phase, and the four TLS settings read back.
- A second `--write` run is a clean no-op, with a printed reason on every step.
- The verify table: apex 200 with the title, www and http 301, MX still resolving.

Read the plan line by line before passing `--write`. The blast radius is a client's live
domain and their mail.

---

## Known gaps, deliberately open

### 2. `npm run parity compare` is not a CI step

The baselines in `scripts/.parity/` are captured on a developer machine, and nobody in
this family has yet proved a Linux CI build reproduces them byte for byte. Parity is a
local gate today; `.github/workflows/ci.yml` carries the reason inline. To close this:
capture on CI once, diff against the committed baselines, and wire the step in if they
match.

### 3. `@astrojs/mdx` is installed but unused

No `.mdx` file exists in `src/` or `modules/`. It is kept because a project may want MDX
for long-form content, and removing it from a template is harder to undo than leaving it.
Drop it during a slop sweep (card 16) if it is still unused then.

### 4. The adapter and wrangler pins are tighter than the bug requires

`@astrojs/cloudflare` is pinned exact at 14.2.4 and `wrangler` at `~4.110.0`. Verified
2026-08-28 that 14.2.4 does **not** emit `legacy_env` into the generated config, so card
14's original failure does not reproduce here; the pin holds the pair together because
14.2.5 peers `wrangler ^4.125.0`, one minor from the version that rejects the field.
Revisit when a newer adapter's peer range and emitted config are both checked by hand
against a real `wrangler dev` and a real deploy.

### 5. Seven eslint warnings, all unused bindings

`npm run lint` is a CI step now (2026-09-06) and exits clean, but it still prints seven
`@typescript-eslint/no-unused-vars` warnings: unused imports in `Footer.astro`,
`BusinessOverview.tsx`, the journal index and a couple of others, plus one unused
`SHOW_THRESHOLD` in `BaseLayout.astro`. Warnings do not fail the run. Triage them in a
slop sweep (card 16); each is either a dead import to delete or a binding that was meant
to be used and is not, which is the more interesting kind.

### 7. Two PORTABLE scripts are excluded from prettier

`scripts/sync-check.mjs` and `scripts/page-parity.mjs` are the only marked files whose
quoting `prettier --write` would rewrite, and reid-design-site, mas-monograms and
presacademy carry them byte-exact. Formatting them here would put four repos into DRIFT
the moment anyone runs `npm run sync-check`. They are in `.prettierignore` with that
reason inline. To close: format them in ONE pass that lands in every repo in the family
at the same time.

### 8. The sibling repos will report DRIFT on the new test files

The family test standard's six canonical files were written here on 2026-09-06
(`playwright.config.ts` and five of the six files in `tests/`). The client repos got the
same standard the same day, but their copies were written against their own sites and
carry different comments and, in `a11y-dark.spec.ts`, an inline `FORM_ROUTES` that has
been moved out to `routes.ts` here. So the first `npm run sync-check <repo>` after this
lands will report DRIFT on those files. That is the library of record working as
designed, not a bug: the next sync session pushes this repo's copies out. Do the sync
before treating any drift report from those paths as meaningful.

### 9. `apply-brand` is not idempotent on globals.css

**Cosmetic, found 2026-09-13, deliberately not fixed in the same commit.**

CLAUDE.md and the script's own header call `apply-brand` idempotent, and semantically it
is: running it twice produces the same STYLESHEET. It does not produce the same FILE.
Running it on this repo, whose globals.css already matches its own brand.config.json,
rewrote 75 lines: single quotes to double on the `@import` lines, and lowercase hex to
uppercase (`#434e5c` to `#434E5C`, because the config stores uppercase). Prettier then
disagrees with the result, so `npm run format:check` fails on a file nobody edited.

That is harmless until somebody runs the script on a project with a clean tree, sees a
75-line diff in the most load-bearing file in the repo, and has to read all of it to
confirm it says nothing. To close: normalise hex case and quote style to what Prettier
writes before comparing, or run the file through Prettier at the end of the rewrite.

### 10. The scaffold is finished (DONE, 2026-09-18)

`faq` and `about` are marked, and so are `testimonials` and `philosophy`, which this item
did not ask for and which a race site or a school wants gone just as much. Seven
capabilities are removable now: `about` (31 files), `faq` (34), `journal` (31),
`philosophy` (16), `process` (29), `services` (32), `testimonials` (21). Each was proven
by running its own removal followed by typegen, `astro check`, build and the unit tests,
and all seven together were proven the same way.

This item's open question was whether re-pointing tests at a section every project keeps
counts as editing tests to suit a tool. It does not, and the reason is worth keeping: in
all three files the faq section was the EXAMPLE and something else was the subject, so
pointing the example at a block nobody removes is a correction, not a concession. The
same turned out to be true of `about`: `storySection` and `founderSection` were the
cadence suite's stand-in CONTENT and SELF_CONTAINED types, and a fork dropping about
would have lost coverage of the cadence itself. Where a section really IS the subject it
kept its name and took a marker.

The seed audit landed with it, along with the modules archive, the reserved-slug
cleanup, and the Studio audit ported from the Stone Steps build.

### 11. Three things the scaffold work left open

**Queued, 2026-09-18.** None blocks anything; each is a smaller job than it looks and
each is written down because the reason decays faster than the code.

**`dynamicListSection` cannot lose its last source cleanly.** Its four sources (journal,
services, testimonials, faqs) each belong to a capability, and the block itself belongs
to none. Removing all four now leaves a valid build, because the `source` prop widened to
`string` and the GROQ `select()` gained a `[]` default arm, but it also leaves an
editor-facing block whose dropdown offers nothing and which can only ever render empty.
Either the block should become a capability of its own, or the schema should hide it when
its options list is empty. The second is probably right and is a ten-line change.

**Seed markers cannot express a capability inside another capability's page.** Markers
never nest, so the aboutPage seed is `about` end to end including the `valuesSection` in
its pageBuilder, which is `philosophy`. Remove philosophy while keeping about and the
seeder plants a block of a type the schema no longer declares. It is a dataset problem
rather than a build one and the boundary is defended in the file's header, but a fork
doing exactly that combination will see an unknown-type block in the Studio.

**`lighthouserc.json` still says "the nine module routes under modules/".** There are two
staged modules now and eleven archived ones. The file is owned by another agent's wave
(the family test standard, PORTS.md card 35), so the sentence was left alone rather than
edited across an ownership line. One-line fix, next time someone is in there.

### 6. `docs/agent/` deep-dives still carry client-specific nouns

Flagged in CLAUDE.md's topic index since the fork. The 2026-08-28 pass corrected every
stale `studio/` path and every `studio:deploy` instruction in the live docs, but the
examples inside them were not retoned. Trust the patterns; fix nouns when you touch a
file.

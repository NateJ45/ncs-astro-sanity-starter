---
paths:
  - 'PORTS.md'
  - 'scripts/sync-check.mjs'
  - 'scripts/page-parity.mjs'
  - 'scripts/with-workerd.mjs'
  - 'scripts/free-dist.mjs'
  - 'scripts/lib/**'
  - 'src/lib/contrast.ts'
  - '.github/workflows/ci.yml'
---

# Library of record: PORTS.md and sync-check

Loads when you touch PORTS.md, the sync tooling or the CI gates. Moved verbatim from CLAUDE.md.

Added 2026-08-27. This repo is not only a starting point for new projects, it is the
**library of record** for improvements shared across the site family (wcp, presacademy,
reid-design-site, mas-monograms, 2ndpreschicago, nixoncreativestudio). When a fix stops
being about one client and becomes a technique, its canonical copy lives here.
`ncs-church-starter` was a seventh member until it was archived on 2026-09-06; PORTS.md
still carries its column and its historical cards, but nothing syncs to it any more.

- **`PORTS.md`** (repo root) is the registry: a short intro, an applied-to matrix (one row
  per shared improvement, one column per repo), then one dated **port card** per
  improvement covering what it is, the bug that produced it, where the canonical copy
  lives, and what has to be adapted per site. Read it before porting anything between
  repos, and before assuming a technique is new.
- **Pick the card number with `npm run ports:next`**, which fetches and reads origin/main's PORTS.md too (merged cards only; an open PR's number is invisible to it). A card number is a cross-repo reference (workflow comments, docs), so a collision is expensive to unpick: on 2026-10-03 the CI speed-up and Dependabot both took 62, and the CI card had to be renumbered to 70 across seven repos.
- **Docs-in-sync clause:** an improvement that generalizes gets a card **in the same
  commit that generalizes it**. Same for the matrix when a repo's status changes. A card
  written a week later is written from memory, and the reason a technique exists is the
  part that decays fastest.
- **Canonical files carry a first-line marker** reading `PORTABLE: canonical copy`
  followed by "ncs-astro-sanity-starter is the library of record for this file", in that
  file's comment syntax. 108 files carry it as of 2026-10-03 (card 74 added `scripts/lib/parity-glob.mjs` and its test; card 75 added `tests/fixtures.ts`). The originals were
  `scripts/with-workerd.mjs`, `scripts/free-dist.mjs`, `scripts/page-parity.mjs`,
  `scripts/sync-check.mjs`, `scripts/lib/sanity-lib.mjs` and `src/lib/contrast.ts`; the
  in-canvas control layer and the family test standard added the rest. Run
  `npm run sync-check` with no argument for the current list. Marking a file is a
  judgement: `ci.yml`, `lighthouse.yml`, `lighthouserc.json`, `.prettierignore` and
  `tests/routes.ts` are deliberately NOT marked because each carries something that is
  legitimately per-site, and a byte-exact check that can never pass teaches everyone to
  ignore the tool (PORTS.md card 35).
- **A marker in a file type with no comments.** Markdown carries it as an HTML comment on line 1
  (`docs/claude/family-conventions.md`, `docs/RESTORE-DRILL.md`). JSON cannot, so
  `.claude/settings.json` carries it as the value of a top-level `"_portable"` key within the first
  five lines (the scan is a plain substring match; no change to `sync-check.mjs` was needed). Card 71.
  `.claude/settings.local.json` is git-ignored and never synced.
- **`npm run sync-check [site-repo]`** walks a repo, finds the marked files, and diffs
  each against this starter's copy of the same path: `SAME` / `DRIFT` /
  `MISSING-IN-STARTER`, exit 1 on drift. Line endings are normalized; everything else is
  byte-exact. Point it at the starter with `NCS_STARTER_DIR`, or let it find a sibling
  `ncs-astro-sanity-starter`. It is dependency-free so it runs in any repo in the family.
  Run with no argument from here for a self-check (everything must be `SAME`).
  The walker skips folders by exact name (`SKIP_DIRS`): `node_modules`, `dist`, `.git`, `.ncs-starter`,
  `worktrees` (`.claude/worktrees`) and `_worktrees` (`<repo>/_worktrees/<name>`, a full second copy of the
  repo, which doubled fbcm's count to 172; card 80). Add a name there, never a substring or suffix pattern:
  a loose match can hide a real folder, and `scripts/lib/sync-check-skip-dirs.test.mjs` pins that boundary.
- **If you change a marked file, you are changing the family's copy.** Either the change
  is general (make it here, note it on the card, and the next sync session pushes it out)
  or it is site-specific (then it does not belong in a marked file at all).

Related tooling installed alongside: `npm run parity` (the rendered-HTML parity harness,
baselines committed in `scripts/.parity/`), `npm run free-dist` (Windows dist-lock
rescue), and the stale-types guard in `.github/workflows/ci.yml`. Cards 1 through 15 in
PORTS.md explain each.

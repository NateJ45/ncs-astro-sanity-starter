# PORTS.md - the shared-improvement registry for the site family

This starter is the **library of record** for improvements that generalize across the
Astro + Sanity + Cloudflare sites built from it. When a fix stops being about one
client and becomes a technique, it gets written down here as a **port card**, and its
canonical implementation lives in this repo.

A port card is one dated entry describing a single portable improvement: what it is,
why it exists (the bug or the cost that produced it), where the canonical copy lives,
how to install it in a site, and what has to be adapted per site. The applied-to matrix
above the cards is the machine-checkable half: which repo in the family currently has
it.

**Docs-in-sync clause.** An improvement that generalizes gets a card **in the same
commit that generalizes it**. Not a follow-up, not a TODO. A card written a week later
is a card written from memory, and the reason a technique exists is the part that
decays fastest. The same rule applies in reverse: when a card's real-world status
changes (a site adopts it, a card is superseded), the matrix row moves in that commit.

## Canonical files and the drift check

Files this repo owns carry a marker on their first line, adapted to the file's comment
syntax:

```
// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
```

`node scripts/sync-check.mjs [site-repo]` walks a site repo, finds every marked file,
and diffs it against this starter's copy of the same relative path. It prints
`SAME` / `DRIFT` / `MISSING-IN-STARTER` per file with a summary, and exits 1 on any
drift. Line endings are normalized (this family is authored on Windows and built on
Linux CI), everything else is byte-exact. Locate the starter with `NCS_STARTER_DIR`,
or leave it to find a sibling `ncs-astro-sanity-starter` directory. It is
dependency-free, so it runs in any repo in the family whatever that repo has installed.

Run it from the starter against itself for a self-check (everything must be `SAME`),
and from each site during that site's sync session.

**Sites do not have the marker yet.** As of 2026-08-27 only this starter's copies carry
it, so a cross-check from a site reports "no marked files found" rather than drift.
Adding the marker line to a site's already-ported copies is the first act of that
site's sync session. presacademy needs one: it is the source of most of these files and
none of its copies are marked.

---

## Applied-to matrix

`yes` = present and current. `partial` = an ancestor or divergent form of the same idea,
or present but not wired into that repo's gate. `no` = absent. `yes` = a session
is installing it as of the date on the card.

| #   | Card                                                              | wcp     | presacademy | starter  | reid-design-site | mas-monograms | 2ndpreschicago | ncs-church-starter | nixoncreativestudio |
| --- | ----------------------------------------------------------------- | ------- | ----------- | -------- | ---------------- | ------------- | -------------- | ------------------ | ------------------- |
| 1   | with-workerd build wrapper                                        | yes     | yes         | yes      | yes              | yes           | yes            | yes                | yes                 |
| 2   | free-dist prebuild unlock                                         | yes     | yes         | yes      | yes              | yes           | yes            | yes                | yes                 |
| 3   | page-parity harness                                               | yes     | yes         | yes      | yes              | yes           | yes            | yes                | yes                 |
| 4   | sanity-lib seed/patch plumbing                                    | partial | yes         | yes      | yes              | yes           | yes            | yes                | n/a                 |
| 5   | stale-types CI guard                                              | yes     | yes         | yes      | yes              | yes           | yes            | yes                | n/a                 |
| 6   | Nightly Sanity backup workflow                                    | yes     | yes         | no       | yes              | yes           | yes            | template           | n/a                 |
| 7   | Uptime workflow                                                   | yes     | yes         | no       | yes              | yes           | yes            | template           | yes                 |
| 8   | Playwright + axe + reflow suite                                   | yes     | yes         | no       | yes              | no            | no             | no                 | no                  |
| 9   | contrast.ts + theme-token gate                                    | partial | yes         | yes      | yes              | yes           | yes            | yes                | yes                 |
| 10  | Embedded-studio live-preview stack                                | yes     | yes         | yes      | staged           | staged        | no             | yes                | n/a                 |
| 11  | Preview click interceptor                                         | yes     | yes         | yes      | staged           | staged        | no             | yes                | n/a                 |
| 12  | Parity-gated page-builder conversion                              | partial | yes         | partial  | no               | no            | no             | no                 | no                  |
| 13  | react/react-dom exact pin                                         | no      | yes         | yes      | staged           | staged        | no             | yes                | no                  |
| 14  | wrangler legacy_env pin                                           | no      | yes         | yes      | staged           | staged        | no             | yes                | no                  |
| 15  | PENDING.md / TESTING.md docs registry                             | yes     | yes         | yes      | yes              | yes           | yes            | yes                | yes                 |
| 16  | Quarterly slop sweep                                              | no      | no          | no       | no               | no            | no             | no                 | no                  |
| 17  | In-canvas section controls (overlay insert/drag/duplicate/remove) | partial | yes         | yes      | staged           | staged        | no             | yes                | n/a                 |
| 18  | Chrome options (editable header/footer content)                   | yes     | yes         | yes      | staged           | staged        | no             | yes                | n/a                 |
| 19  | Shareable draft links                                             | no      | no          | yes      | no               | no            | no             | yes                | n/a                 |
| 20  | publishAt scheduled publishing (free-tier)                        | no      | no          | template | no               | no            | no             | template           | n/a                 |
| 21  | Pages as first-class objects (duplicate / archive / SEO panel)    | partial | no          | yes      | no               | no            | no             | yes                | n/a                 |
| 22  | Redirects on rename                                               | yes     | no          | yes      | no               | no            | no             | yes                | n/a                 |
| 23  | Editor-defined forms                                              | yes     | no          | yes      | no               | no            | no             | yes                | no                  |
| 24  | Saved sections (section presets)                                  | partial | no          | yes      | no               | no            | no             | yes                | n/a                 |
| 25  | Pre-publish page checks                                           | partial | no          | yes      | no               | no            | no             | yes                | n/a                 |
| 26  | Appearance controls (surfaces, accents, rich twins, layout)       | partial | yes         | partial  | no               | no            | no             | yes                | no                  |
| 27  | Undo & redo                                                       | no      | yes         | yes      | no               | no            | no             | no                 | n/a                 |
| 29  | Instant preview text                                              | no      | yes         | yes      | no               | no            | no             | no                 | n/a                 |
| 29a | Local edit-state channel (LiveDraftBridge)                        | no      | yes         | yes      | no               | no            | no             | no                 | n/a                 |
| 29b | Refresh scheduler (single-flight / stale discard / floor)         | no      | yes         | yes      | no               | no            | no             | no                 | n/a                 |
| 29c | Preview morph (in-place reconcile)                                | no      | yes         | yes      | no               | no            | no             | no                 | n/a                 |
| 29d | Staleness counts every channel                                    | no      | yes         | yes      | no               | no            | no             | no                 | n/a                 |

Rows for repos that have adopted nothing still exist on purpose: a future sweep ticks
cells instead of inventing the table again.

Card 28 (the floating in-canvas layer) has no row yet: it is live on presacademy only
and is not canonicalized here, so there is nothing for the matrix to be honest about.
See its entry under Sync sessions.

---

## Card 1: with-workerd build wrapper

**Dated 2026-08-25 (presacademy), ported to the starter 2026-08-27.**
**Canonical:** `scripts/with-workerd.mjs`

On Astro 7 with `@astrojs/cloudflare` 14, `astro build` prerenders static pages by
booting workerd through `@cloudflare/vite-plugin`. On Windows, the workerd binary that
plugin pins dies instantly with `*** std::terminate() called with no exception` behind
a `MiniflareCoreError [ERR_RUNTIME_FAILURE]`. The newer workerd bundled inside wrangler
runs the identical config fine. The wrapper finds wrangler's copy and sets
`MINIFLARE_WORKERD_PATH` before handing off, so `npm run build` (and therefore
`npm run deploy`) works on a Windows machine.

Deliberately narrow: Windows only, never overrides an explicit
`MINIFLARE_WORKERD_PATH`, and no-ops when wrangler's binary is absent. Linux CI stays on
the stock path.

**Status in the starter:** installed and **wired** as of 2026-08-28, when this repo took
the Astro 7 / adapter 14 upgrade: `"build": "node scripts/with-workerd.mjs astro build"`.
(Before that it sat here as a no-op safety net, because adapter 13.5.5 did not route the
prerender through the vite plugin and the crash could not occur.)

**Per-site adaptation:** none. Retire the wrapper when the plugin's pinned workerd
starts on Windows again.

## Card 2: free-dist prebuild unlock

**Dated 2026-08-26 (presacademy), ported to the starter 2026-08-27.**
**Canonical:** `scripts/free-dist.mjs`

A still-running `wrangler dev` / `astro preview` / `http-server` holds a handle on
`dist/`. Astro empties dist at the start of every build, so the next build dies with
`EPERM, Permission denied: \\?\...\dist\client`. It reads like a permissions problem and
is really "something is still serving the last build". This cost two real deploys in one
day.

The script kills only `node.exe` / `workerd.exe` processes whose command line mentions
**both** this project's directory **and** a known dev server, and prints every PID it
stops. Windows only, so Linux CI is untouched.

**Genericization done on the port:** the project root comes from the script's own
location (`import.meta.url` -> `../`), so a copy dropped in any repo matches that repo's
processes and nothing else, with no edit. The command-line match was switched from
PowerShell's `-like` to an ordinal case-insensitive `IndexOf`: `-like` treats `[` and `]`
as wildcard character classes, so a checkout path containing brackets would silently
match nothing.

**Status in the starter:** installed, exposed as `npm run free-dist`, **not** wired as a
`prebuild` hook. Running PowerShell on every build is a behavior change a downstream
project should opt into. To make it automatic:
`"prebuild": "node scripts/free-dist.mjs"`.

## Card 3: page-parity harness

**Dated 2026-08-26 (presacademy), ported and parameterized 2026-08-27.**
**Canonical:** `scripts/page-parity.mjs`, baselines in `scripts/.parity/`

Captures each built page's rendered HTML, then diffs a later build against that
snapshot. Built for a page-builder conversion where the promise was "same pixels", but
it earns its place on any change that is supposed to be render-neutral: extracting a
component, reordering imports, swapping a wrapper, bumping a dependency.

Neither mode builds. The caller builds; the script reads existing output. That keeps it
fast to re-run, keeps build noise out of the diff, and lets capture and compare be
pointed at the same artifacts while debugging the normalizer itself.

The normalizer strips exactly four classes of build-varying value and leaves everything
else byte-faithful: `/_astro/` content hashes, Astro's generated `data-astro-cid-*` and
transition-scope hashes, the `<astro-island>` render-order `prefix`, and whitespace
between tags. Text, classes, ids, aria, inline styles and JSON-LD are all compared.

**Parameterization done on the port:** the built-HTML root is auto-detected
(`dist/client` when it holds an index.html, which is the adapter 14 shape, else `dist`,
the adapter 13 shape) and can be overridden with `PARITY_DIST`. The chosen root prints
on every run so a snapshot is never silently taken against the wrong tree. Routes are
auto-discovered by walking the html root for `.html` files (asset directories skipped,
sorted for determinism), so a fresh clone needs no edit; a project wanting a fixed
plan-ordered subset fills in the `PAGES` constant and discovery switches off.

**Proof in this repo (2026-08-27):** `npm run build`, capture (9 routes: home, about,
services, process, faq, contact, journal, privacy, 404), `npm run build` again, compare
-> 9/9 PASS. Baselines committed under `scripts/.parity/`.

`npm run parity list | capture | compare [page]`.

**Per-site adaptation:** re-capture baselines on first install, and again whenever a
markup change is intended (say so in the commit message). Nested routes are stored with
`/` flattened to `__` in the snapshot filename.

## Card 4: sanity-lib seed/patch plumbing

**Dated 2026-08-25 (presacademy, distilled from WCP's `patch-lib.mjs` +
`pagebuilder-lib.mjs`), ported 2026-08-27.**
**Canonical:** `scripts/lib/sanity-lib.mjs`

The three things every Sanity seed or patch script re-invents, in one import: a
token-authed client built from the root `.env`; a **dry-run-by-default apply gate**
(scripts print exactly what they would change and write nothing without `--apply`); and
Portable Text builders, `_key` generation, and an **idempotent** asset uploader that
caches asset ids in `scripts/.asset-map.json` so a re-run never re-uploads.

The dry-run gate is the load-bearing part. These scripts mutate a live dataset, often
against a quota, and the default has to be "show me".

**Reconciliation done on the port:** presacademy's copy carried its own inline `.env`
parser. This starter already ships `scripts/lib/loadEnv.mjs`, so the duplicate is gone
and sanity-lib imports loadEnv. loadEnv is the keeper because it is stricter: it enforces
a KEY shape, strips inline `# comments` from bare values, takes quoted values literally,
and gives `process.env` precedence. The looser parser accepted `KEY=value # note` and put
the comment inside the token, which is the shape of the `.env`-quoted-token 401 that cost
a WCP session. A site porting sanity-lib must bring `loadEnv.mjs` with it, or repoint the
import at its own equivalent; that is the file's only dependency beyond `@sanity/client`.

**Per-site adaptation:** `apiVersion` and the env variable names. Add
`scripts/.asset-map.json` to `.gitignore` (done here).

**Related gotchas worth carrying:** a quoted token in `.env` produced a 401 that looked
like a permissions problem; and Sanity refuses to delete a document that other documents
still reference, so cleanup scripts must unlink before deleting.

## Card 5: stale-types CI guard

**Dated 2026-08-27 (pattern from presacademy's `.github/workflows/ci.yml`).**
**Canonical:** the "Fail if committed Sanity types are stale" step in
`.github/workflows/ci.yml`

`npm run build` does not chain typegen, so `src/lib/sanity.types.ts` is committed by
hand after every schema change, and sooner or later it is not. presacademy shipped types
describing a schema that no longer existed, on a green build, on 2026-06-14. The guard is
four lines: right after CI's own `npm run typegen`, fail if that regeneration produced a
git diff.

```yaml
- name: Fail if committed Sanity types are stale
  run: |
    if ! git diff --quiet -- src/lib/sanity.types.ts; then
      echo "::error::src/lib/sanity.types.ts is out of date. Run 'npm run typegen' and commit the result."
      git --no-pager diff -- src/lib/sanity.types.ts
      exit 1
    fi
```

**Per-site adaptation:** the path to the generated types file, and it must sit after
whatever step runs typegen. Verified against this repo 2026-08-27: `npm run typegen`
reproduces the committed file exactly (the only local difference is line endings, which
git normalizes, so the check is clean on Linux CI).

## Card 6: Nightly Sanity backup workflow

**Dated 2026-08-27 (pattern from `presacademy/.github/workflows/sanity-backup.yml`).**
**Canonical:** not yet installed in the starter. Reference implementation is
presacademy's workflow.

A nightly `sanity dataset export` of production (documents plus assets), uploaded as a
workflow artifact, so a bad mutation or an accidental Studio "Remove field" is always
recoverable. Structured as a `gate` job that checks whether `SANITY_AUTH_TOKEN` is set
and an `export` job gated on it, so the workflow is safe to commit before the secret
exists.

**The schedule-disabled-until-secret pattern.** presacademy commented its `schedule:`
block out with the reason preserved in the file: the token was never set, so the daily
gate job billed a minute a day just to log "skipping". `workflow_dispatch` stays on, so
manual runs still work, and uncommenting one line activates it. Record the decision in
the file, not only in a commit message, so the next person knows it was deliberate.

**Public repos can leave the schedule on.** GitHub Actions minutes are free on public
repositories, so the billing argument that justified disabling the schedule does not
apply to them. Most of this family is public (all eight were confirmed public
2026-07-14). Disable the schedule for private repos, or where the secret genuinely will
not exist for months; otherwise leave it running.

**Per-site adaptation:** the public Sanity project id and dataset name (the id is not a
secret, it ships in the client bundle), the retention window, and the restore steps in
that repo's ops doc.

## Card 7: Uptime workflow

**Dated 2026-08-27 (pattern from `presacademy/.github/workflows/uptime.yml`).**
**Canonical:** not yet installed in the starter. Reference implementation is
presacademy's workflow.

Hourly `curl` of a handful of key routes, failing the run if any does not return 200; a
failed run notifies through GitHub. Activated by a `SITE_URL` **repo variable** (not a
secret) so it never false-alarms before launch: with the variable unset it logs a warning
and exits 0.

Same schedule-disabled-until-configured pattern and the same public-repo exception as
Card 6. GitHub's scheduler is best-effort and can be delayed under load, so this is a
safety net, not monitoring. For real monitoring point a dedicated service at the
homepage; UptimeRobot's free tier is enough.

**Per-site adaptation:** the route list. Pick routes that exercise different data paths
(a CMS-driven page, a collection index, a static legal page), not three variations of
the homepage.

## Card 8: Playwright + axe + 320-1440 reflow suite

**Dated 2026-08-27. Canonical example: `presacademy/tests/`** (`smoke.spec.ts`,
`a11y.spec.ts`, `a11y-dark.spec.ts`, `reflow.spec.ts`, `routes.ts`, `helpers.ts`).
Not installed in the starter.

Four specs over one shared route list: smoke (every route renders, no console errors),
axe in light, axe in **dark** as a separate sweep, and a reflow sweep that loads every
route at every width in the 320-1440 band and fails on horizontal overflow.

The shape matters more than the code. A single route list (`routes.ts`) feeding all four
specs is what keeps the suite honest when a route is added. The dark sweep is separate
because axe audits the resting DOM and a theme swap is a different resting DOM. The
reflow band starts at **320px** because WCAG 1.4.10 does, and a single mobile screenshot
at 375 does not discharge it: WCP's 2026-07-14 audit swept 752 route-by-width
combinations and the findings were all in places no one had screenshotted. CI later swept
768 / 1024 / 1440 as well, on the same principle.

**reid-design-site already has a variant of this suite whose CI never runs it.** A suite
that does not run is worse than no suite: it reports green by being absent from the
pipeline. Fixing that wiring is the reid row's first job, not writing new tests.

**Per-site adaptation:** the route list, the a11y tag filter (WCP's `a11y-tag-filter`
gotcha: filtering to `wcag2a` alone quietly drops the AA rules), and the settle helper
that waits out animation before an axe pass.

## Card 9: contrast.ts + theme-token gate

**Dated 2026-08-27 (from presacademy `src/lib/contrast.ts`, itself the port of a WCP
gate).**
**Canonical:** `src/lib/contrast.ts`, with `src/lib/theme-tokens.test.ts` as the
starter's own application of it.

WCAG 2.x contrast math as a tiny unit-testable module: `hexToRgb`, `relativeLuminance`,
`contrastRatio`, `flatten` (compositing a translucent colour over its real backdrop,
which is what a dark theme's white-at-12% hairline actually is), and the AA thresholds
named as constants so a failure reads as intent instead of a magic number.

It exists because this bug class is invisible to every other gate. An invisible focus
ring, a border under 3:1, a button with no visible edge: axe has no rule for
focus-indicator or custom-border contrast, and an axe sweep audits the resting DOM only.
In WCP those all shipped on a green build with Lighthouse at 100.

`hexToRgb` throws on anything it cannot parse, on purpose: a silently-zero colour makes a
contrast test pass for the wrong reason.

**The theme-token gate applied here.** `npm run apply-brand` rewrites the `@theme`
palette in `globals.css` from `brand/brand.config.json`, and nothing else notices when a
new project's palette pushes body text under 4.5:1. `theme-tokens.test.ts` parses the
real hex tokens out of `globals.css` and asserts the pairs the design system actually
renders (ink and both slate tones on both paper surfaces, white reversed out of the dark
brand surfaces), so a bad reskin fails `npm test` before anyone looks at a screenshot.

Scope is the light `@theme` block only. The shadcn `:root` / `.dark` overrides are
authored in oklch with alpha and would need a colour-space conversion; that is a bigger
job and is deliberately not attempted. Two token pairs are deliberately **not** asserted
(`--color-secondary` and `--color-border-soft` on the paper surfaces): they are hairline
dividers near 2:1 by design, not UI component boundaries. Any token used for a focus ring
or a control edge must be added to the test with `AA_NON_TEXT`.

**Per-site adaptation:** the token names and the pair list. Also worth carrying: WCP's
measured accessible "ink" replacement shades, which solved the same problem by moving the
palette rather than the pairs.

## Card 10: Embedded-studio live-preview stack

**Dated 2026-08-27. Canonical example: presacademy** (`src/pages/preview/live.ts`,
`src/lib/preview-auth.ts`, `src/lib/cms-preview.ts`,
`src/sanity/components/PreviewNavigator.tsx`) and WCP's equivalent. Not installed in the
starter.

Five parts that only work together: Sanity's `presentationTool` in the Studio config; an
SSE endpoint (`/preview/live`) proxying Sanity's listen API so edits stream to the
preview iframe; a fingerprint-based `preview-auth` so the draft-reading route cannot be
hit by the public; a `NON_STEGA_FIELDS` list; and a `PreviewNavigator` document view.

**`NON_STEGA_FIELDS` is not optional.** Stega hides roughly 1KB of invisible markers
inside every string it touches, so `tone === 'chapel'` is `false` on an encoded value and
the component silently takes the wrong branch **in preview only**. Every enum that drives
rendering must be excluded. Add any new logic-driving dropdown field to that list the day
you add the field.

### Hard warning 1: one package, or `resolve.dedupe`

A nested `studio/` package means **two node_modules trees**. The Studio shell resolves
`sanity` / `styled-components` / `@sanity/ui` from the root; every file under `studio/`
resolves them from `studio/node_modules`. Same pinned versions, two module instances, two
React contexts. The ThemeProvider mounted by one styled-components is invisible to
`useTheme` in the other, so the desk dies on its first custom-component render
(styled-components error #18, then `Cannot read properties of undefined (reading 'v2')`)
while the login screen, which is core code only, renders fine. This was the actual cause
of presacademy's 2026-08-26 production Studio crashes, behind four failed fixes. WCP never
hit it because its studio lives in the same package as the site.

Two fixes: fold the studio into the root package (what presacademy did), or set
`resolve.dedupe`. Keep the dedupe either way. The verification that matters is a disk
audit, not a lockfile read: `find node_modules studio/node_modules -path
"*@sanity/ui/package.json"` must print exactly **one** line. `@sanity/icons` is
deliberately **not** deduped (sanity core wants v5, `@sanity/ui` v3 wants v3.8; icons are
stateless so duplication is harmless, and deduping them broke the build on a missing v5
`CogIcon`).

### Hard warning 2: exact resolved versions, and the family's version skew

The Sanity stack is pinned to a combination known to work **together**, and bumping one
in isolation breaks it. The working set: `sanity` 6.4.0, `@sanity/ui` **3.3.5**,
`styled-components` 6.4.3, `react` / `react-dom` / `react-is` 19.2.7, plus
`sanity-plugin-media` 5.0.11, `sanity-plugin-utils` 2.0.6 (pinned through `overrides`;
the default 2.0.17 drags in `@sanity/ui` v4) and `sanity-plugin-asset-source-unsplash`
7.0.15.

"Latest v3" is not close enough. Pinning `@sanity/ui` to 3.5.3 instead of 3.3.5 cleared
error #18 and then failed differently, `TypeError: Cannot read properties of undefined
(reading 'v2')` from inside styled-components' `generateAndInjectStyles`, because `sanity`
6.4.0 expects the 3.3.x theme shape. Any Sanity dependency change must be checked against
a sibling repo's **resolved** versions, not its semver ranges.

Related: `@sanity/ui` v3 has no subpath exports beyond `./theme`, so
`import { useToast } from '@sanity/ui/toast'` is v4-only syntax and fails
`sanity schema extract`. On v3, import from the package root.

**Therefore: Studio files never port blindly across this family.** A file copied across a
Sanity major boundary compiles and then dies at browser runtime, which is also where
schema errors surface (they pass the build). Port the _pattern_ from these cards, then
write the file against the target repo's actual major.

### Starter status: INSTALLED 2026-08-28

This repo is no longer the Sanity-5 outlier. It took the whole card in one session: the
exact pin set above, the studio folded into the root package (nested `studio/` deleted),
the Studio embedded at `/studio` via `@sanity/astro` 3.4.2, and all five preview parts
standing. Verified `find node_modules -path "*@sanity/ui/package.json"` prints exactly
one line and `grep -l "errors.md#" dist/client/_astro/*.js` exactly one file.

Three adaptations earned on the way in, each of which the NEXT repo will hit:

- **`@sanity/visual-editing` needs an `overrides` entry too, not just a dependency pin.**
  `@sanity/astro` depends on it by caret range; left alone npm nests a NEWER copy under
  `@sanity/astro/node_modules`, which drags a second `@sanity/ui` (3.5.4) in with it and
  breaks the one-instance invariant. presacademy does not show this only because its
  lockfile was resolved when 5.4.5 was the latest. Pin it in `overrides`.
- **`sanity schema extract --force` DOES exist on 6.4.0.** An earlier WCP-derived note
  said otherwise. Without `--force` the second run fails on "Schema file already exists",
  so the typegen script needs it to be re-runnable. (`--workspace` is still only needed
  with multiple workspaces.)
- **`sanity build` writes to `./dist` by default**, which would clobber the Astro build.
  There is deliberately no `studio:build` script; the Studio is built by `astro build`.
  A standalone bundle needs an explicit dir: `npx sanity build .studio-dist`.

Also worth carrying: `buildLegacyTheme` is **light-only**. It hard-codes white component
backgrounds, so the Studio's Dark appearance setting leaves every panel white. Migrating
to `@sanity/ui`'s `buildTheme` gets a real, tested dark mode and costs the brand tinting
of the Studio chrome, which is a good trade; keep the brand in the logo and the fonts.

### Genericization note for a template

A template must fail closed **legibly**. A clone with no project id and no token was
answering `/preview` with a bare 500 and a Sanity stack trace, which reads like a broken
template rather than an unfinished setup. The starter's copy checks configuration at every
preview entry point and answers **503** naming the two missing pieces plus the
`sanity cors add` step. Carry that idea, not the exact strings.

## Card 11: Preview click interceptor

**Dated 2026-08-26 (WCP). Canonical example: WCP's `PreviewLayout`.** Not installed in
the starter. presacademy has the preview stack but not this interceptor.

Inside the preview iframe, a same-origin link click escapes to the **live** page: the
Presentation navigator and edit panel stay pointed at the old document, and the Studio
appears frozen. The fix is a click interceptor in the preview layout that remaps
same-origin links into `/preview/*` so the navigator follows the click, while files, API
routes and external links open in a new tab.

Found on presacademy, fixed in WCP, still unported back. That direction of drift is
exactly what this registry exists to stop.

**Per-site adaptation: the route map is per-site.** The live-route-to-preview-route
mapping encodes that site's URL structure, so this is a pattern to re-implement, not a
file to copy. What ports is the three-way decision (remap / new tab / leave alone) and
the reason.

**Installed in the starter 2026-08-28**, including presacademy's later refinement: when
the preview is EMBEDDED in the Studio, a click on a link with no preview route is
suppressed entirely rather than opening a new tab, because inside Presentation that click
is an edit gesture and a popping tab forces a switch back to the Studio every time. A
standalone `/preview` tab still opens the new tab.

**The map lives in THREE files that must agree**, and the starter says so in each:
`SINGLETON_PREVIEW_PATHS` (`src/sanity/resolve.ts`, document to URL),
`SINGLETON_BY_PATH` (`src/pages/preview/[...slug].astro`, URL to document type), and
`FIRST_SEGMENT_PREVIEWABLE` (the interceptor). presacademy names two; the third is the
one that silently degrades, because a missed entry there does not error, it just lets a
click escape to the live site.

### Edit-mode gate (2026-08-28 amendment)

While Presentation's Edit toggle is ON, @sanity/visual-editing keeps
outline boxes (`[data-sanity-overlay-element]`) in the DOM. The
interceptor treats their presence (when embedded) as edit mode and
suppresses ALL navigation - even links with preview equivalents. A
CTA button click then selects the field and nothing else, which is
what an editor mid-edit expects. Toggle Edit off and the boxes leave
the DOM, so clicks browse the preview again (remap as before).

## Card 12: Parity-gated page-builder conversion

**Dated 2026-08-26 (presacademy). Reference:**
`presacademy/docs/superpowers/plans/2026-08-26-page-builder-conversion.md`.
Method, not code. The starter is page-builder-first already, so it holds the method for
the sites that are not.

Converting bespoke singleton pages into CMS-driven section types without changing a
pixel or risking content. Four decisions carried the plan:

- **D1. Ported sections do not join the shared section shell.** The existing blocks are
  tone-adaptive so editors can recolor them; art-directed page markup is not. Those two
  are mutually exclusive, and wrapping ported markup in the shared shell means subtly
  different pixels. Ported types render their own exact markup with fixed surfaces.
  Pixel-exactness wins over uniformity, at least through the conversion.
- **D2. Heroes and the final CTA stay page-level fields; only the body converts.** Every
  singleton already has hero and CTA fields editors know. Leaving them alone means no
  churn and no way for an editor to delete the page's h1. What converts is the middle.
- **D3. Fallback literals become default section arrays in code.** Each page's `??`
  fallback copy is restructured as a `DEFAULT_SECTIONS` array the renderer uses when the
  array is absent. That behavior is load-bearing: the credential-less CI build renders
  complete pages, and the axe and reflow sweeps run against them. (This starter's
  `src/data/defaultSections.ts` is the same idea, already standing.)
- **D4. Additive migration, instant rollback.** Seed scripts only ever write the sections
  array; every existing field is left untouched until a final cleanup phase. Rolling back
  a converted page is `git revert` of its commit, because the old page file returns and
  the old fields are still there. Old-field cleanup happens only after every page is
  verified live, and never through the Studio's "Remove field" button.

The gate that makes it safe is Card 3: capture before, convert, rebuild, compare, zero
diff or it is not done.

## Card 13: react/react-dom exact pin

**Dated 2026-08-25 (presacademy).** Gotcha, not a file.

`react` and `react-dom` must be the **exact** same version, in every package. Installing
Sanity into the root pulled react to 19.2.8 while react-dom stayed 19.2.6, and the build
died inside workerd behind a wall of Miniflare stack frames. The real message,
`Incompatible React versions`, was buried **above** the wrapper.

Pin both exact, no caret. General lesson: when a Miniflare or workerd failure looks
unexplainable, read the lines **above** the `MiniflareCoreError`.

**Starter status:** pinned exact 2026-08-28 with the Astro 7 upgrade: `react`,
`react-dom` and `react-is` all `19.2.7`, no caret. `react-is` was added at the same time
(the Sanity stack needs it, and it drifts the same way).

**Adjacent, learned in that session:** a stale `package-lock.json` can hide the fix. An
`overrides` entry added to collapse a nested duplicate did nothing on `npm install`
because npm kept the already-resolved nested tree; the duplicate only disappeared after
deleting the lockfile and node_modules and resolving clean. When a dedupe or override
"does not work", verify on DISK (`find node_modules -path "*<pkg>/package.json"`) rather
than trusting the install output, and be aware a clean re-resolve floats every caret.

## Card 14: wrangler legacy_env pin

**Dated 2026-08-25 (presacademy).** Gotcha, not a file.

`@astrojs/cloudflare` v14 writes `legacy_env: true` into the generated
`dist/server/wrangler.json`, and wrangler 4.126+ rejects that field outright ("no longer
supported"), so every `wrangler dev` / `deploy` against the generated config fails.
presacademy pins `wrangler` to `~4.110.0`. Revisit when a newer adapter stops emitting
the field.

**Starter status (2026-08-28): pinned `~4.110.0`, with a finding.** The generated
`dist/server/wrangler.json` from adapter **14.2.4** on this config contains **no**
`legacy_env` field at all, and `wrangler dev` against it serves every route. So on this
combination the pin is currently belt-and-braces rather than load-bearing. The reason it
stays is a second, harder constraint: **the adapter's own peer range enforces the pair.**
14.2.4 peers `wrangler ^4.83.0`, but 14.2.5 peers `wrangler ^4.125.0`, which is one minor
away from the 4.126 rejection. So the starter pins the ADAPTER exact at 14.2.4 as well.
Moving either one is a deliberate act: bump both, rebuild, inspect the generated config
for `legacy_env`, and run a real `wrangler dev` before believing it.

Adjacent, same family of pain: WCP's deploy must be
`wrangler deploy -c dist/server/wrangler.json`; a plain `wrangler deploy` 404s every
sub-route. And this starter pins `@astrojs/cloudflare` to exactly 13.5.5 because 13.6.0
regressed the image optimizer (optimized images written to `dist/client/_astro/` while
the optimizer reads `dist/_astro/`). Three separate adapter-version landmines; the shared
rule is that adapter and wrangler versions are a matched pair, verified by a real build.

## Card 15: PENDING.md / TESTING.md docs registry

**Dated 2026-08-27. Origin: WCP (`site/docs/`).**

Two flat markdown registries, kept authoritative rather than narrative:

- **PENDING.md** - the open-patch and waiting-on-a-human queue. Every deferred change
  with its blocker, so a new session can read the queue instead of rediscovering it. WCP
  proved the value during the 2026-07 Sanity quota freeze: the entire queue survived the
  freeze in the file and ran to completion in one sitting when quota returned.
- **TESTING.md** - a map of which suite covers what, so nobody writes a fifth suite that
  duplicates the third.

The practice, not the filenames, is what ports: a registry is authoritative and gets
edited in the same commit as the thing it tracks; a changelog is narrative and appends.
Keeping both, and knowing which is which, is the whole trick.

**In this starter:** `PORTS.md` (this file) is the machine-checkable registry of what is
shared with the rest of the family, backed by `scripts/sync-check.mjs`.
`docs/agent/changelog.md` stays the prose ledger. `docs/PENDING.md` was added 2026-08-28
for the third thing neither of those covers: this repo's own open loops and
waiting-on-a-human items. Something that needs to be _checked_ belongs here; something
that needs to be _understood in sequence_ belongs in the changelog; something that is
_still open_ belongs in PENDING.

There is no TESTING.md yet: the suite is one `npm test` over `src/lib/*.test.ts` plus the
parity harness, and a map of two things is not worth a file. Write one the day a second
suite (Playwright, card 8) lands.

---

## Card 16: Quarterly slop sweep (2026-08-28)

**What:** a scheduled REDUCTION pass per site, because the per-commit gates
catch regressions but nothing schedules cleanup: an app keeps working while
its code and docs quietly degrade, then one simple feature request breaks
everything (the failure mode that bit presacademy's README/CLAUDE.md drift in
June 2026).

**The sweep, roughly one session per site:**

1. Run the /simplify and code-review passes over recent hot spots.
2. Dead-weight grep: unused deps (`npm ls` orphans, imports nothing
   references), dead components, stale scripts without RAN/DO-NOT-RUN headers.
3. Doc-drift check: CLAUDE.md commands/routes vs reality, PENDING.md pruning,
   guide steps vs the actual Studio.
4. Re-run sync-check and the site's full gates; log findings as gotchas or
   PORTS cards when they generalize.

**Cadence:** quarterly per actively-maintained site; on-demand before any big
planned change on a dormant one. Tick the matrix cell with the sweep DATE
rather than "yes" so staleness is visible.

**Provenance:** distilled from community experience (the "AI slop is very
real / the app keeps working while the code gets worse" lesson) and our own
June drift incident.

## Card 17: In-canvas section controls (2026-08-28)

**What:** Squarespace-style editing inside the Presentation preview: each
rendered section carries a `data-sanity` attribute (createDataAttribute ->
`flexibleSections[_key=="..."]` on a REAL block box, never display:contents),
which makes the visual-editing overlay outline it as an array item with
insert-before/after (the grouped insert menu opens IN the canvas), duplicate,
remove, and drag-to-reorder (on by default once the attribute exists; the
mutation writes itself). Pair with `insertMenu.filter: true`. Attribute
renders on preview surfaces only; the live build must stay byte-identical
(parity enforces it).

**DEPENDS ON card 10** (the full live-preview stack). Sites without it get
card 10 first. Canonical implementation: presacademy; WCP has the attribute
half already (sectionEditAttr).

**Installed in the starter 2026-08-28.** Two adaptation notes:

- **The array field name is per-repo, and here it is ONE name.** presacademy's
  singletons use `flexibleSections` while its custom pages use `sections`, so its
  `EditDoc` carries a discriminating `field`. This template holds every page's
  sections in `pageBuilder`, singletons and `page` docs alike, so the field is a
  single-member union kept only so the shape ports back.
- **The preview-only wrapper does not need a component.** `SectionRenderer` picks
  `const Wrap = editDoc ? 'div' : Fragment` and spreads the attribute. A
  `<Fragment>` renders nothing, so the live build is byte-identical without a
  second code path to keep honest. `npm run parity compare` passed 10/10 with the
  feature installed, which is the proof.
- **The grouped insert menu had to be created**, not merely switched on: this
  template had no `insertMenu` config at all. `SECTION_INSERT_MENU` in
  `src/sanity/schemaTypes/sections.ts` (four plain-language groups plus
  `filter: true`) is shared by every `pageBuilder` array, including the curated
  per-page lists, because a group whose types are all absent from a given array
  simply does not render.

**Rollout intent (Nathan, 2026-08-28): every Sanity site gets this.** Order:
presacademy (canonical) -> WCP polish delta -> THE STARTER (upgrade the
template once: Astro 7 / adapter 14 / Sanity 6.4 pin set / embedded
single-package studio / preview stack / these controls - so future sites are
born with it) -> church-starter inherits by sync -> reid (already Sanity 6,
shortest hop, most active) -> mas -> 2ndpreschicago (after its DNS cutover).
Follow-up polish on the same card: the insert menu's grid view with
per-section-type preview thumbnails, and "duplicate page" in the navigator.

### Card 10/17 lore corrections (mas upgrade, 2026-08-28)

- **The one-styled-components invariant grep must be precise.**
  `grep -l "errors.md#" dist/client/_astro/*.js` false-positives on any
  bundle containing `polished` (a Sanity dependency using the same
  filename). Use `styled-components/src/utils/errors.md#` as the
  pattern. (The starter and church builds happened not to co-locate
  polished, which is why 'one file' held there.)
- **Stega markers are zero-width characters, not the Unicode tag
  block** - measuring the tag block reads zero on a fully encoded
  string and mimics a broken preview.
- **`wrangler ~4.110` is LOAD-BEARING on some configs**: mas's adapter
  14.2.4 build DOES emit legacy_env, unlike the starter's. The pin
  stays a hard rule, not belt-and-braces.
- **Keyless primitive arrays** (arrays of plain strings) have no `_key`;
  in-canvas attributes must fall back to index paths or controls
  silently do not render.
- **The founding `overrides: {vite:"^7"}`** in older forks starves
  Astro 7 of vite 8 and surfaces as "Could not find the prerender
  entry point". Remove it in phase A.
- **Auto-deploy-from-main repos**: the dashboard deploy command must
  switch to `-c dist/server/wrangler.json` BEFORE the upgrade merges,
  or /studio and /preview 404. Land on a holding branch until the
  human flips it (mas: modern-stack branch).

## Card 18: Chrome options (editable header/footer content)

**What:** the header and footer stop being code. One shared `navLink` object
type gives every menu the same vocabulary, and Site Settings grows the fields
that let an editor change the top menu, the footer link columns, the small-print
row at the very bottom, the one header button, the logo, and three "show this
bit of contact detail" switches - without a deploy. This is Phase A of the
Unlocked Studio: the chrome is the last thing on a page that still needed a
developer.

**The navLink vocabulary.** `src/sanity/schemaTypes/navLink.ts`, registered as a
top-level type and used by EVERY menu (top menu, dropdown children, footer
columns, legal row, the header button's destination):

- `label` - what visitors see.
- `linkType` - radio: "A page on this site" / "Another website".
- `internalPage` - a reference to a page document. The address is worked out
  from the DEREFERENCED document type + slug, so renaming a slug can never
  leave a dead menu link.
- `externalUrl` - a full web address.
- `href` - the original hand-typed address (see the compat rule below).

Every document type listed in `internalPage.to[]` must have an entry in
`SINGLETON_LIVE_PATHS` in `src/lib/nav-href.ts` (or the slug-based `page` case),
or the link resolves to nothing. That map mirrors `SINGLETON_PREVIEW_PATHS` in
`src/sanity/resolve.ts` with the `/preview` prefix removed; keep them in sync
when a route moves.

**The legacy-href-wins compat rule.** Every repo already had menus stored as
`{label, href}` objects, most of them typed `navLink`. Nothing is renamed and
nothing is migrated. `href` is kept on the shared type and it WINS over both
newer fields, so today's menus render byte-identically; it hides itself once a
link uses the picker. Where an inline object had a different name (the footer's
`footerLink`), that member stays in the array alongside the shared type, titled
"Link (typed address)", so columns written before the picker stay editable in
place. Precedence inside one link, decided in exactly one function
(`navHref()`): typed `href`, then the picked page, then the pasted URL. A link
that resolves to nothing is DROPPED, never rendered as a dead `<a>`.

**The centralized-fallback rule.** No component may re-implement a menu
fallback. `resolveSiteSettings()` in `src/lib/siteSettings.ts` is the one place
that decides what each chrome field resolves to, and Header / MobileNav / Footer
read `settings.headerNav`, `.footerColumns`, `.legalNav`, `.headerCta`, `.logo`,
`.showEmail`, `.showSocials`, `.showFooterSocials` and render. Two shapes of
fallback, and which one a menu gets is decided by its built-in version:

- A menu whose built-in version is DATA (the top menu, the header button)
  resolves to that built-in when Sanity is empty, so the caller renders one loop
  with no branch.
- A menu whose built-in version is BESPOKE MARKUP (the starter's
  Studio/Work/Free-tools columns, each link carrying its own module-visibility
  flag; a legal row whose two links carry different link styles) resolves to an
  EMPTY array, and the component keeps its own markup for that case. Flattening
  those into data would change the rendered bytes of an untouched site, and
  parity is the gate.

The three switches use `onUnlessOff()`: `undefined` means YES. Sanity's
`initialValue` only fills NEW documents, so a live singleton has no value for a
newly added boolean at all - if undefined meant "off", the header would silently
lose its email and socials the moment the field shipped.

**Two more halves that are easy to forget.** The GROQ projection has to
dereference the picked page (`"slug": internalPage->slug.current`,
`"docType": internalPage->_type`), and `SITE_SETTINGS_PROJECTION` must be
EXPORTED so `PreviewLayout.astro` fetches the chrome through it too. A preview
shell that fetches the raw document leaves every picked-page link null, which
looks like "the picker is broken" and is not.

**Parity gotcha found installing this (starter + church, 2026-08-28):**
importing `SanityImage.astro` into `Header.astro` for the logo pulls that
component into the always-loaded chunk and RENAMES the site-wide CSS bundle
(`BaseLayout.HASH.css` -> `SanityImage.HASH.css`), which fails parity on every
page without one byte of markup changing. Build the logo URL with `urlFor()` and
emit a plain `<img>` with a two-density srcset instead. A header renders on
every page; what it imports is a site-wide decision.

**Applied to:** presacademy yes (canonical) / wcp yes (its own navigation-doc
flavor) / starter yes / church-starter yes / reid staged / mas staged /
2ndpres parked (after its DNS cutover).

## Card 19: Shareable draft links (2026-08-28)

**Canonical:** `src/sanity/components/shareDraftLink.tsx`

**What:** a "Copy share link" affordance in the Studio that hands an editor a URL
an outside reviewer can open, with no Sanity login, to read the CURRENT DRAFT of
one page. It sits in the publish menu of every document that has a page of its
own (a document action registered in `sanity.config.ts`), and, in repos that ship
the Presentation page navigator, as a per-row icon button on that list too.

**Why:** "can the board chair read this before it goes live?" had two answers and
both were wrong. Publish it and unpublish it, or make a volunteer a Sanity
account. The mechanism to do it properly was already in the repo and had only
ever been pointed at an iframe.

**How the link is minted.** `createPreviewSecret()` from
`@sanity/preview-url-secret/create-secret` - the same call the Presentation tool
makes, from the Studio's own authenticated client. The returned secret is dropped
into the URL the enable endpoint already understands:

```
/api/draft-mode/enable?sanity-preview-secret=<minted>&sanity-preview-pathname=/preview/<page>
```

`/api/draft-mode/enable` is NOT modified by this card. It still runs
`validatePreviewUrl()` and still answers a bare 401 for an invalid, tampered, or
expired secret before setting any cookie. The feature is additive: a new way to
obtain a valid secret, not a new way in.

**The TTL caveat, stated in the UI.** `SECRET_TTL` is a hard-coded `60 * 60` in
`@sanity/preview-url-secret/constants`, and the validating query (`_updatedAt >
now() - SECRET_TTL`) lives inside the package. There is no `ttl` option on the
create call and no supported way to widen it, so **a share link works for about
an hour and then stops**. Every surface says so out loud - the toast, the button
tooltip, the document-action title, the church guide - because the alternative is
a reviewer meeting a 401 the next morning and reporting the site as broken.
Re-minting is one click, which is the intended answer to an expired link.

The package also ships a "shared access" singleton with a NON-expiring secret
(`toggle-preview-access-sharing`). Deliberately not used: it switches draft
preview on for anyone who ever saw any link, forever, with no per-link
revocation. For a volunteer-run site a one-hour link is the safer default.

**HTTPS only.** The enable endpoint sets its cookie `secure: true; sameSite:
none` (required because Presentation loads it cross-context). Browsers refuse a
secure cookie over plain http, so share links work on the deployed origin and not
against `http://localhost:4321`. Test them deployed.

**Per-site adaptation:** none beyond having the preview stack (card 10). The
module derives the preview path from that repo's own `pathForDoc()` in
`src/sanity/urls.ts`, so a repo with different routes needs no edit here. Repos
without a `PreviewNavigator.tsx` get the document action only, which is a
complete feature on its own.

**Applied to:** starter yes (canonical) / church-starter yes (document action
only, it has no page navigator) / everything else pending rollout.

## Card 20: publishAt scheduled publishing, free tier (2026-08-28)

**Canonical:** `src/sanity/schemaTypes/_publishAt.ts`, `scripts/publish-due.mjs`,
`.github/workflows/publish-due.yml`

**What:** an editor sets "Publish automatically at" on a page, leaves it as a
draft, and it publishes itself. Three small parts: a `datetime` field, a
dependency-free Node script, and a half-hourly workflow.

**Why:** Sanity's own Scheduled Drafts is a **Growth-plan** feature. Every site in
this family runs on the free plan, and "write it Friday night, have it live
Monday morning" is a thing volunteers actually ask for, so it gets built rather
than bought.

**The field.** `PUBLISH_AT_GROUP` + `publishAtField()` are exported as a PAIR and
must be spread together - the group into the type's `groups`, the field into its
`fields`. A field naming a group its type never declared is a hard Studio 6.4+
crash, not a warning. The script's query is schema-agnostic, so adding the pair
to a new document type is the entire installation: no script change, no workflow
change.

**Timezone honesty.** Sanity's datetime input shows and accepts the editor's
LOCAL time and stores UTC; the script compares against `now()` evaluated by
Sanity, so it is UTC on both sides and the runner's own clock is irrelevant. The
description says "your own local time" so nobody has to reason about it, and
"within the half hour" so nobody expects 9:00:00.

**Publishing is two mutations in one request.** Sanity's own publish action is
`createOrReplace` at the id without the `drafts.` prefix, then `delete` the draft.
This mirrors that, in a single mutation array so it is atomic. `publishAt` is
STRIPPED on the way through rather than cleared afterwards: the published
document never carries a schedule, so there is no window in which a crash between
two writes leaves a document that republishes itself every half hour.

**The no-npm-install cron design, and why.** At `*/30` this runs 48 times a day.
`npm ci` would spend a couple of minutes of Actions time per run installing
several hundred megabytes in order to make three HTTP calls - roughly two hours
of runner time a day to publish, on most days, nothing. So `publish-due.mjs`
imports nothing from `node_modules`: it uses global `fetch` against Sanity's HTTP
API and the job is checkout + setup-node + node, a few seconds. Its only local
import is `scripts/lib/loadEnv.mjs`, itself dependency-free and used only for
local runs. **If the script ever needs a package, the design broke; do not add an
install step.**

Endpoints, both `Authorization: Bearer <SANITY_AUTH_TOKEN>`:

- `POST https://<projectId>.api.sanity.io/v2025-02-19/data/query/<dataset>?perspective=raw`
  with `{query}`. `perspective=raw` is required - the default perspective hides
  `drafts.*`, which are the only documents this cares about.
- `POST https://<projectId>.api.sanity.io/v2025-02-19/data/mutate/<dataset>?returnIds=true`
  with `{mutations:[{createOrReplace}, {delete}]}`.

**Dry run by default.** Bare `node scripts/publish-due.mjs` prints the queue and
writes nothing; `--apply` publishes. The workflow passes `--apply`. Same gate as
every other Sanity script in `scripts/`, for the same reason: a human running it
by hand cannot publish by accident.

**Workflow gating** is card 6's two-job gate, copied verbatim: a `gate` job checks
for the `SANITY_AUTH_TOKEN` secret and the `SANITY_PROJECT_ID` variable and emits
a `::warning::` with `ready=false` when either is missing, and the `publish` job
is `if: needs.gate.outputs.ready == 'true'`. A fork without the secret skips
instead of failing. One difference from the backup workflow: this token must have
WRITE access, where a read token is enough for the backup.

**In both TEMPLATE repos the `schedule:` block ships COMMENTED OUT**, exactly as
`sanity-backup.yml` does, because neither template has a Sanity project of its
own and a gate job firing 48 times a day only to skip is the same waste in
miniature. A fork uncomments one line. `workflow_dispatch` stays on, so a manual
run always works.

**Per-site adaptation:** set the secret and the variable, uncomment the schedule,
and add the field pair to any document type that should be schedulable.

**Applied to:** starter yes (canonical, on `page` + the `_pageSingleton` factory)
/ church-starter yes (on `page` + the `churchPages` factory, so all eleven church
page singletons) / everything else pending rollout.

## Card 21: Pages as first-class objects (2026-08-28)

**Canonical:** `src/sanity/pageOps.ts`, `src/sanity/components/pageActions.tsx`,
`src/sanity/schemaTypes/_seoFields.ts`, `src/sanity/components/SeoSnippetInput.tsx`

**What:** three verbs and one panel that turn a `page` document from a row in a
list into something an editor can handle like a page in Squarespace.

- **Duplicate.** Copies the page into a NEW DRAFT called "... copy", at a free
  web address ("about" then "about-copy" then "about-copy-2"), with every nested
  array `_key` regenerated.
- **Archive / Restore.** Sets `archived` on both twins. Every live-site query
  skips an archived page; nothing is deleted, so Restore is complete.
- **Search & sharing.** The SEO group gains a live Google-snippet and share-card
  preview at the top, and a "Keep this page out of Google" switch.

**Why Duplicate had to be rebuilt.** Sanity ships a `duplicate` action, and it
copies the slug. The copy is then a second document claiming an address that is
already taken; the build can emit only one of them and which one wins is
arbitrary. The config filters the stock action out for `page` and registers ours
in its place, so the menu still reads "Duplicate" and now does the right thing.

**Why Archive is not Delete.** Delete is refused while any other document links
to the page, and it throws the words away. An event page an editor wants back
next year is the common case, not the rare one. `archived` is a plain boolean;
the live-site queries test `archived != true`, **never `archived == false`**, so
a page created before the field existed stays visible. Delete is still there for
a page that really should go.

**Both twins, and only the twins that exist.** `setPageArchived()` looks up which
of `<id>` / `drafts.<id>` are actually present before patching. A patch against a
missing document id fails the WHOLE transaction, so patching both blind throws on
a page that has no draft, which is most of them.

**Archive needs a publish** to reach the live site, because the site is rebuilt
from published content. Every toast says so.

**One implementation, two surfaces.** The verbs are plain functions in
`pageOps.ts`. `pageActions.tsx` puts them in the publish menu (every repo);
`PreviewNavigator.tsx` puts them on a per-row "..." menu with an **Archived**
group at the bottom of the list (only the repos that ship the page navigator).
A repo with no navigator has the complete feature from the document actions
alone, which is how the church starter has it.

**REUSE, DO NOT RENAME (the SEO panel's one rule).** `seoFields()` takes the
document's EXISTING SEO field definitions in a `reuse` argument and puts them in
the right order, rather than defining new ones. A rename would move the data to a
new path, and every page in the dataset would quietly go back to a default title.
So on a type that already had SEO fields the helper contributes exactly two new
things: the value-less `seoPreview` field whose custom input draws the previews,
and `hideFromSearch`.

**`hideFromSearch` has to be honoured in TWO places or it is a dead control:** a
`<meta name="robots" content="noindex, follow">` on the page (the route passes
`noindex` to `BaseLayout`), and the page dropped from the sitemap (the `filter`
in `astro.config.mjs`, fed by a build-time query). One without the other is worse
than neither, because the switch looks like it worked.

**The preview is an INPUT, never a document VIEW.** It calls `useFormValue`,
which needs a `FormValueProvider`. An input always renders inside the document
form, so the provider is there. A standalone `S.view.component` pane does NOT get
one inside the Presentation tool: the hook throws, the panel's error boundary
trips, and the preview iframe stops refreshing. This cost the WCP repo an evening
in 2026-07; keep the split.

**Per-site adaptation:** `PAGE_OPS_TYPES` in `pageActions.tsx` is `{'page'}` -
the multi-instance builder page every repo in this family has. Page SINGLETONS
are deliberately excluded: one-per-site means duplicating or archiving one would
leave the site with a route and no document. `pageOps.ts` reads and writes the
slug in whichever shape the repo uses (Sanity's `slug` object, or WCP's plain
string, which has to hold slashes), so no edit is needed there either. The only
real per-site work is passing the repo's own SEO field definitions into
`seoFields({ reuse })`, and wiring `noindex` on the routes that render `page`.

**Applied to:** starter yes (canonical: publish-menu actions + navigator rows) /
church-starter yes (publish-menu actions only, it has no page navigator) / WCP
partial (the same feature, older and repo-specific: its navigator carries the
verbs and its `seoFields.ts` predates this canonical copy) / everything else
pending rollout.

## Card 22: Redirects on rename (2026-08-28)

**Canonical:** `src/lib/redirects.ts` (+ `src/lib/redirects.test.ts`),
`src/sanity/components/slugRedirect.tsx`

**What:** an editor changes a page's web address, presses Publish, and the old
address keeps working. A `redirect` document type holds the forwards, a
build-time read folds them into Astro's `redirects` map, and a wrapper around the
stock Publish action files one automatically on a rename.

**Why:** the manual Redirects list on its own depends on somebody remembering at
exactly the wrong moment. Every bookmark, printed bulletin, and Google result for
the old address 404s quietly until they do.

**Build time, not request time.** These are `output: 'static'` sites, so the 404
route is prerendered and middleware never runs for it. Making it SSR to read a
redirect list would put a Worker invocation in front of the one route that exists
to be cheap. The Cloudflare adapter turns the `redirects` map into real 301s at
build, which cost nothing per request, and a publish rebuilds the site anyway.

**The path arithmetic is shared and tested.** `src/lib/redirects.ts` is imported
by BOTH `astro.config.mjs` (build) and the Studio action. If the two disagreed
about what `/old-page/` means, an auto-filed redirect would sit in the Studio
looking correct and never fire. Hence `redirects.test.ts`. The rules: normalize
both sides, drop a self-redirect, drop a half-filled row, drop an external
left-hand side (it could never match a request), later entry wins.

**No type list in the action, on purpose.** Which documents have a slug-derived
address is already encoded in each repo's `pathForDoc()` (`src/sanity/urls.ts`).
A type with a fixed path returns the same string before and after, so the
comparison is a no-op for it; a type with no public page returns null. That is
what lets `slugRedirect.tsx` be byte-identical across repos with completely
different routes, and why `redirects.ts` deliberately does NOT carry a
document-type-to-path map the way WCP's ancestor version does.

**The wrapper must be memoized.** A document-action wrapper needs a STABLE
component identity across renders, or React unmounts and remounts the action
every pass and the stock Publish action loses its own state (the "publishing..."
spinner, the disabled logic). The actions resolver in `sanity.config.ts` runs on
every render, so the wrapper is cached in a `WeakMap` keyed by the action it
wraps.

**It never blocks Publish.** A failed redirect write toasts a warning and
publishes anyway. The editor's change is the important part; the forward can be
added by hand.

**Renames repoint, they do not chain.** A second rename patches the existing
`A -> B` entry to `A -> C` rather than adding `B -> C`, so visitors always take
one hop. An existing redirect for the same old address is never overwritten: it
may have been hand-corrected.

**The redirect is created PUBLISHED** (a plain `create`, not a draft), because
the build-time reader only sees published documents. A draft redirect would look
filed and never fire.

**Fail-safe reads.** `cmsQuery()` in `astro.config.mjs` returns the empty answer
for anything that is not a clean 200 - no project id, no token, Sanity down, bad
data - so this feature can never fail a build.

**Per-site adaptation:** a site that also carries hand-written launch redirects
(WCP's Squarespace map) puts them BEFORE `...cmsRedirects` in the `redirects`
object, so a Studio entry can correct a stale launch one without a code change.

**Applied to:** starter yes (canonical) / church-starter yes / WCP yes (the
original, with a repo-specific `redirects.ts` that also owns the doc-type path
map, plus the launch-migration entries) / everything else pending rollout.

## Card 23: Editor-defined forms (2026-08-28)

**Canonical:** `src/lib/custom-form-fields.ts` (+ `src/lib/custom-form-fields.test.ts`),
`src/sanity/schemaTypes/formQuestion.ts`

**What:** an editor writes their own form questions in the Studio and the site
asks them. A `formQuestion` object holds one question (the words, an answer type,
choices for a dropdown, and whether it must be answered); a `fields` array on the
form surface holds up to twelve of them. Empty array, and the form is exactly the
form that shipped. One question, and the visitor sees the editor's form.

**Why:** "can you add a question to the form?" is the single most common request a
volunteer or a small-business owner makes, and until now it was a developer
ticket every time. The whole point of the page-builder is that it is not.

**The standard contact block ALWAYS leads.** Name, email, and phone are drawn
first, before any editor question, on every path. This is the load-bearing rule
of the whole card, and it exists because the failure it prevents is silent: an
editor builds a perfectly reasonable form, forgets to ask for an email address,
and the site collects messages nobody can ever reply to. Nothing an editor can
write removes that block. A schema that lets an editor define ALL the fields (as
church-starter's older `form` document does) has this hole; this one does not.

**The answers are folded into the message, and that is the entire design.** The
renderer names each answer `custom_<n>` and carries the question text alongside
it in `custom_<n>_label` (plus a `custom_<n>_req` marker). The submit path turns
those into plain `Question: answer` lines and appends them to the `message` the
site already sends. So a brand-new question needs NO code change, NO schema
change, and no change to whatever receives the submission - Web3Forms, an email,
a webhook, a Sanity `submission` document, a Google Sheet. Downstream never
learns that editor-defined questions exist. Resist the temptation to give each
question its own key in the payload: that is the version that needs a migration
every time somebody renames a question.

**Two pure functions, shared by both sides, unit-tested.**
`normalizeCustomFields()` shapes the raw Sanity value into what the renderer
draws; `parseCustomFieldEntries()` turns posted `[name, value]` pairs into the
lines. They are in one dependency-free module because the renderer and the submit
path MUST agree about the caps and about what "answered" means. `parse` takes an
`Iterable<[string, string]>`, which is exactly what `FormData.entries()` gives a
server route and what a React island can synthesize, so the same tested code
serves a native POST and a client-side fetch.

**The caps are deliberate and belong to the library, not the schema:** 12
questions, 2000 characters per answer, 12000 characters over all answers, 200
characters per question label. The Studio validates the 12 as well, but the
Studio is not a security boundary - a stale open page can post anything. Twelve
is also a design limit, not just a safety one: a longer form is the fastest way
to lose the person filling it in.

**It degrades instead of throwing.** A question with no label cannot be asked and
a dropdown with no choices cannot be answered, so both are dropped; an unknown
answer type falls back to a text box; questions past the cap are IGNORED rather
than rejected, so a page a visitor left open before an edit still submits.

**Never log an answer.** The parser returns a visitor-facing error string and
nothing else. Form answers are the most personal data these sites handle.

**Native validation plus `aria-required` plus a visible cue.** All three, on every
required question, so the browser, assistive technology, and the eye agree. The
honeypot on the existing form is preserved untouched.

**Type name: `formQuestion`, not `formField`.** church-starter's `form` document
already registers a `formField` array member, and two schema types with one name
is a Studio-runtime crash that a build will not catch. The canonical file is
byte-identical everywhere, so it cannot dodge the collision per-repo - the name
had to be chosen to clear it once. WCP's ancestor version calls it `formField`;
that is the one intentional divergence from the original.

**Per-site adaptation:** wire the `fields` array into whatever the repo's form
story already is, and fold the lines into whatever it already submits. WCP has an
Astro API route and a native POST, so it appends the lines to the stored/emailed
`message` server-side. Both templates are React islands posting to Web3Forms, so
the fold happens in the island just before `fetch`, and the payload still carries
one `message`. In the starter the questions REPLACE the built-in project
questionnaire (a form asking both "rough budget range" and a church picnic
question is nonsense); in church-starter they are an alternative to referencing a
`form` document. In both, an empty array is a zero-diff no-op, which is what makes
the change safe to ship: `page-parity compare` proves it.

**Applied to:** starter yes (canonical, on `contactPage.formFields`) /
church-starter yes (on the `sectionForm` page-builder block) / WCP yes (the
original, `formField` + an `/api/contact` server fold) / everything else pending
rollout.

## Card 24: Saved sections (2026-08-28)

**Canonical:** `src/sanity/actions/saveSectionPreset.tsx`, plus `addSectionToPage()`
in `src/sanity/pageOps.ts`
**Per repo:** `src/sanity/schemaTypes/sectionPreset.ts`,
`src/sanity/pageBuilderConfig.ts`

**What:** an editor keeps one band of a page and drops a copy of it on any other
page. "Save a section as preset..." in a page's publish menu lists that page's
sections, the editor picks one and names it, and a `sectionPreset` document is
written. Adding it back is a copy, not a link.

**Why:** the section an editor is proudest of is the one they most want to
repeat, and today repeating it means either rebuilding it by hand or duplicating
a whole page to get at one strip of it. The page-builder promises reuse and
until now offered none.

**THE SCHEMA SHAPE IS THE WHOLE TRICK.** `section` is an ARRAY of every section
type, capped at one by validation. Sanity has no syntax for a union OBJECT
field, and a field per type would be twenty fields. The array buys three things
for free: the same grouped insert menu the page builder uses, the real section
FORM (so a saved section is EDITABLE in place, not just replayed), and the
type's own preview. `sectionType` is a read-only stamp copied out of the array
when the preset is captured, so a list can label a preset without opening it.

**No field groups on the type, deliberately.** An undefined group name is a
fatal Studio-RUNTIME error in Sanity 6.4 that `astro build` does not catch. Four
fields need no tabs, so the risk is simply not taken.

**Why a document action and not the section's own menu.** Array-item menus are
built from the array input's options and the visual-editing overlay's toolbar is
internal; Sanity opens neither to a plugin. A document action is the surface we
own.

**It writes a PUBLISHED preset and reads the DRAFT page.** A preset is a tool,
not content: nothing about it reaches the website, so "publish your saved
section before you can use it" would be ceremony. The source is the draft
because a section is usually saved right after it is made.

**Adding one always writes to the DRAFT of the target page**, and the section
lands at the BOTTOM. A saved section that went live on click would be a publish
nobody asked for. When the target has no draft yet, one is made from the
published document first, which is exactly what typing in the form would have
done. Every `_key` is regenerated at every depth on the way in AND on the way
out, so the same preset can go on the same page twice.

**THE INSERT SURFACE DIFFERS PER REPO, AND THAT IS THE INTERESTING PART.** The
verb is one function (`addSectionToPage` in the canonical `pageOps.ts`); only
the direction of the question changes:

- **Repos with the Presentation navigator** (starter, wcp) get a collapsible
  "Saved sections" group under the page list, one "add" button per row, adding
  to the page the preview is currently showing. Current page = the sticky
  pending navigation intent ?? `params.preview`, matched against row hrefs (exact
  first, `endsWith` fallback) - the same resolution the row highlight uses, so a
  click and an immediate "Add" can never disagree. Disabled with a plain-words
  tooltip when no page is open, or when the open page has no builder array.
- **Repos with no navigator** (church-starter) get "Add to a page..." on the
  saved section ITSELF, listing the pages grouped Main / Custom. Same verb,
  reversed direction. Archived pages are left out: adding to a page that is off
  the site is almost certainly a misclick.

A page's own "+ Add section" picker can offer schema TYPES only, never
documents, which is why neither surface is inside it.

**Applied to:** starter yes (canonical + navigator group) / church-starter yes
(canonical + "Add to a page..." action) / WCP partial (the original: its own
`sectionPreset`, its own `saveSectionPreset.tsx` and navigator group, all
pre-config-object - see the fold-back note on card 25) / everything else pending
rollout.

## Card 25: Pre-publish page checks (2026-08-28)

**Canonical:** `src/lib/page-checks.ts` (+ `src/lib/page-checks.test.ts`),
`src/sanity/actions/checkPage.tsx`
**Per repo:** `src/sanity/pageBuilderConfig.ts`

**What:** "Check this page..." in a page's publish menu reads the DRAFT back and
reports three kinds of "worth a look": photos with no alt text, sections with
nothing typed in them, and links to same-site addresses no page seems to own.

**Why:** an editor about to publish has no way to ask "did I forget anything?"
short of reading the whole page again, and the three things they forget are
always the same three.

**IT NEVER BLOCKS PUBLISH AND IT NEVER EDITS.** Sanity's own required-field
validation already stops genuinely broken content; this is the softer layer
above it. Every line of copy says "worth a look" rather than "wrong", the dialog
ends with a line admitting it can be mistaken, and the Publish button is
untouched while it is open. The moment a courtesy check starts refusing things,
editors learn to click past it.

**Every check is a heuristic that UNDER-REPORTS on purpose.** The link check
compares by FIRST PATH SEGMENT only, because `/events/harvest-supper` and
`/journal/spring-refresh` are real addresses built by code from a collection and
no `page` document owns them; matching whole paths would flag half the site and
the feature would be ignored inside a week. Alt text is accepted in any of the
three shapes the family models it in (`alt` on the image, `alt` beside it,
`<key>Alt` beside it), so a parent holding two images and one alt reads as
described. That miss is the right trade.

**"Empty" needs two exemption lists or it is permanently silent.** Setting keys
(`variant`, `tone`, `layout`, `background`, ...) are enum values with an
initialValue, so a completely untouched section already has several strings in
it; they do not count as words. And sections that fill THEMSELVES from a
collection (an FAQ list, an auto list, a form) are skipped whole: a dynamic list
with no heading is not an empty section, it is a section whose words live in the
Events list.

**THE CONFIG OBJECT IS THE PORT.** WCP's ancestor hard-codes its own array field
name (`sections`), its own `SETTING_KEYS`, its own `SELF_FILLING_SECTIONS`, and
its own `CODE_OWNED_PATHS` in the library file, which makes that file
unshareable: the three repos name their builder arrays `pageBuilder`,
`sections`, and `flexibleSections`, and no two agree on which sections are
self-filling. The canonical core now takes a `PageCheckConfig` and every
repo-specific answer arrives from `src/sanity/pageBuilderConfig.ts`, at a path
every repo shares. That file also carries `SECTION_HOST_TYPES` (type -> builder
field), which is what wires card 24's actions and the document-actions resolver,
so a fork adapts BOTH cards by editing one file.

**Two shape changes came with the config, and both are deliberate:**

1. **Section numbering runs on across several arrays.** A repo with a main
   builder and an "extra sections" append zone shows the editor one list, so the
   checks count one list.
2. **The header (hero) is NOT checked for emptiness by default.** WCP's version
   checks it. Here `header.checkEmpty` is opt-in, because in two of the three
   repos a page whose banner is one background photo over built-in copy is a
   perfectly normal page, and flagging it would be the false positive that
   teaches an editor to ignore the dialog. WCP sets it true when it folds back.

**FUTURE WCP SYNC TASK (done 2026-08-28).** WCP still runs the pre-config ancestor of
`page-checks.ts`, `checkPage.tsx`, `saveSectionPreset.tsx` and its own
`sanity-keys.ts`. Folding it forward is: add `src/sanity/pageBuilderConfig.ts`
with `sectionArrays: ['sections']`, `header: { label: 'Hero (top banner)',
fields: ['hero'], checkEmpty: true }`, its `SELF_FILLING_SECTIONS` and
`CODE_OWNED_PATHS` lists, and `SECTION_HOST_TYPES` for `page` (+ `hubPage` if
the hub ever gains the action); drop in the four canonical files; move
`newKey`/`regenerateKeys` from `src/lib/sanity-keys.ts` to `pageOps.ts` (which
WCP does not yet carry) or keep `sanity-keys.ts` and re-point the canonical
imports - the second is drift, so prefer the first; port the Vitest suite to the
node:test canonical copy; and add the PORTABLE markers. Nothing about it is
urgent: the ancestor works, it is simply not shared.

**Applied to:** starter yes (canonical) / church-starter yes (canonical) / WCP
partial (the pre-config ancestor, see the fold-back note above) / everything
else pending rollout.

---

## Card 26: Appearance controls (2026-08-28)

**Canonical:** `src/lib/inline-rich.ts`, `src/lib/heading-accent.ts`,
`src/components/InlineRich.astro`
**Per repo (NOT canonical, on purpose):** `src/lib/surfaces.ts` +
`src/lib/surfaces.test.ts`, `src/lib/layout-variants.ts` +
`src/lib/layout-variants.test.ts`, `src/sanity/components/SwatchInput.tsx`,
the `.heading-accent` / `.accent-*` / `.surface-*` rules in
`src/styles/globals.css`

**What:** the four things an editor kept asking for and could not have. A
section's SURFACE, picked from a row of designed colour chips. Its ACCENT, the
small colour inside it. BOLD AND ITALIC inside a short support line that was a
plain string. And ONE WORD of a heading in the accent colour. Plus the layout
half: how many cards across, and which side the picture is on.

### The five rules that make it safe

1. **A surface is a designed PAIR, never a picker.** Every option is a
   background bundled with the ink and the link colour that belong on it. There
   is no hex entry and no colour wheel, so an editor cannot produce an
   unreadable band. `src/lib/surfaces.ts` is the one place the classes, the
   Studio swatch literals and the gate all read.
2. **The contrast gate resolves the REAL tokens, in BOTH themes.** The test
   parses `src/styles/globals.css`, walks `@theme` / `@theme inline` / `:root`
   for light and `.dark` for dark, follows `var()` aliases, and measures every
   pair: AA 4.5:1 for body, headings and links, 3:1 for the accent as a mark. It
   also pins the literal hexes the Studio draws with to the resolved tokens, so
   a rebrand cannot leave the swatch row showing colours the site abandoned.
   **If a pair fails, fix the pair. Never lower a threshold.**
3. **The default emits NO class.** The house accent returns `null` from
   `accentClass()` and the original tone values emit exactly the strings they
   always did, so every already-published section renders byte-identical HTML.
   `scripts/page-parity.mjs compare` at zero diffs is the standing proof, and it
   is the acceptance test for this card in any repo.
4. **Rich text arrives as a TWIN, not a migration.** The plain string field
   keeps its name, its type and its stored value; a sibling `<name>Rich`
   portable-text field allows `strong` and `em` and nothing else. The plain
   field hides only once the twin holds text; the renderer prefers the twin.
   A dataset with no twins is a dataset that renders exactly as before.
5. **Headings get ONE accent.** The colour accent is the sibling of the script
   accent, and where both exist the script accent wins and the colour one is
   skipped. Two accents in one heading is decoration.

### The stega trap (the bug class this card exists to avoid)

`headingAccent` is matched against the heading with `indexOf`. In the
Presentation preview both strings arrive carrying an invisible run of Unicode
tag characters, so a naive match never fires and the accent silently does
nothing IN PREVIEW ONLY. Two defences, and you want both: `heading-accent.ts`
strips both sides with `plain()` (that helper also runs on the live site, where
the NON_STEGA list does not exist), and `headingAccent` goes on
`NON_STEGA_FIELDS` in `src/lib/cms-preview.ts`. Every new enum from this card
(`accent`, and `tone`'s new values) goes on that list too, and `accent` goes on
`extraSettingKeys` in `src/sanity/pageBuilderConfig.ts` — it ships with an
`initialValue`, so counted as content it would make card 25's "nothing typed
here" check permanently silent.

The accepted cost, stated plainly: on a heading that HAS an accent word, the
cleaned string is what renders, so click-to-edit on that one heading stops
working in the preview. Every other field still works, and the live site is
unaffected because it never carries stega at all.

### The layout half

`src/lib/layout-variants.ts` is a REGISTRY, not a formula, and that is the
point: the grids in one repo do not agree with each other about where a phone
stops stacking, so collapsing them into a formula moves live pages. Each entry
carries its section's real class strings verbatim, plus `baseColumns` (the
unprefixed grid class the component itself carries) and `phoneColumns`. The test
replays the two together for every option and fails if any option changes what a
320px phone renders — which is what lets an existing reflow sweep stand in for
the non-default values. A drift test re-derives `baseColumns` from the `.astro`
source so the copy cannot go stale. DENSITY is documented, never duplicated:
whatever padding knob the repo already has is the density control.

### THE RIGHT-CLICK DISCOVERY

The in-canvas section verbs from card 17 — insert (with the picture picker),
duplicate, move, remove — live on **RIGHT-CLICK inside the section outline**,
plus a draggable tag at the outline's corner. Hovering only outlines. Three
passages in presacademy's guide promised a hover toolbar that does not exist,
which is exactly why a real editor could not find the controls; corrected
2026-08-28 after that report. **Any guide that teaches card 17 must teach the
right-click gesture and the corner drag tag by name.** Verified live in the
deployed Studio.

### The curly-apostrophe gotcha (a build break, not a nit)

Guide copy in `src/sanity/guides/content.tsx` lives in SINGLE-quoted string
literals and the file's convention is curly quotes. A straight `'` typed inside
one of those strings terminates it and breaks the build. presacademy shipped
exactly that and needed a follow-up commit. Write `outline’s`, not `outline's`.

### Adapting it to a repo that has no shared shell

The accent needs one element to hang a class on. In a repo where every section
paints its own `<section>` and a renderer owns an automatic surface cadence
(this starter), there is nothing to hang it on and no per-section colour field is
allowed anyway — see `CLAUDE.md` #9. So here the card lands PARTIAL and
honestly: `surfaces.ts` formalises the surfaces the cadence already assigns and
gates them, the heading accent is one fixed brand colour (the editor picks the
WORD, not the colour), the rich twins and the layout registry land in full, and
there is no surface swatch, no accent enum and no `SwatchInput.tsx`. Do not
"fix" that by adding a tone field: it would break the cadence the renderer
exists to protect.

**On `SwatchInput.tsx` being per-repo:** the component SHAPE is identical
everywhere; only the dot map is brand-specific. It could be canonicalised by
taking the two maps as props. Left per-repo until a third repo wants it; the
seam is the two `*Swatches` adapters and the two exported wrappers.

**Applied to:** presacademy yes (origin) / WCP partial (it has the emphasis
layer — `emphasisText` + `emphasis.ts` with `stegaClean` — and its section
colour knobs predate this card, so surfaces/accents there are an ancestor form,
not this one) / starter yes (partial by design, see above) / church-starter yes
(full: six surfaces, three accents, six rich twins, five heading accents, six
column registries) / reid-design-site pending / mas-monograms pending.

---

## Card 27: Undo & redo (2026-08-28)

**Canonical:** `src/sanity/undoRedo.ts`, `src/sanity/components/UndoRedo.tsx`,
`src/lib/undoRedo.test.ts`

**What:** Squarespace's Ctrl+Z, in the Studio, for everything an editor does to a
draft. Two document actions ("Undo last change", "Redo") in the publish menu, and
`Ctrl+Z` / `Ctrl+Shift+Z` / `Ctrl+Y` (`Cmd` on a Mac) with a page open. Not just
typing: sections added, dragged, duplicated or removed, photos swapped or
cleared, backgrounds and options changed. The gap this closes is the one an
editor notices within an hour of arriving from Squarespace: a mis-drag had no
answer short of Version history, which is five clicks and a scary word.

### The mechanism

Every mutation Sanity accepts lands in a transaction log, and each entry carries
a **mendoza patch in both directions**:

```
GET /data/history/<dataset>/transactions/<draftId>
    ?effectFormat=mendoza&excludeContent=true&excludeMutations=true
    &includeIdentifiedDocumentsOnly=true&reverse=true&limit=25
```

NDJSON, newest first, each line `{id, timestamp, author, documentIDs, effects}`
with `effects[<docId>] = {apply, revert}`. Apply `revert` to the document as it
stands and you have it as it was; apply `apply` to that and you are forward
again. This is sanity's OWN history request (`Timeline.fetchMoreTransactions`
in `sanity/lib/_chunks-es/index2.js` sends exactly these parameters, plus a
`toTransaction` paging cursor we do not need), so it needs no extra permission
and no extra token: it goes through `useClient(...).request()`, on the editor's
own session.

### The postmortem: it shipped, and it lied (2026-08-28)

The first version of this card went live on presacademy and **reported success
while changing nothing**. Worth reading before touching any of it.

**The repro.** A page open in Presentation, its background changed with an
in-canvas chip (card 28). Ctrl+Z. The toast said "Change undone" three times and
`background.tone` stayed `'chapel'` through all three.

**What the transaction log actually showed.** The draft's entire history was
FOUR transactions: one client-UUID create at 16:45:56 whose `apply` was a
whole-document literal already carrying `tone: 'chapel'` (the overlay's
`createIfNotExists` + `set`, batched into one transaction by the optimistic
actor), then three server-id transactions at 16:46:41, 16:47:21 and 16:47:24
**whose only effect was to move `_updatedAt`**. Those three were the undos. They
landed, they were not overwritten by anything, and they wrote the document back
to itself.

So the popular hypothesis — Presentation's optimistic actor holding an in-memory
snapshot and clobbering our write — was **wrong**, and the log proved it: there
were no competing transactions at all. Two ordinary bugs, both ours:

1. **A create transaction's `revert` is `[]`, an EMPTY patch, not a null
   literal. And `applyPatch(doc, [])` returns the document UNCHANGED.** The code
   detected "this transaction created the draft" by testing `applyPatch`'s result
   for `null`, which never fired. The delete branch was unreachable, so the
   "previous" document was the current one, and `createOrReplace` wrote it back.
   The unit tests passed throughout because the FAKE built create-reverts as
   `[0, null]` — the fixture encoded the same wrong assumption as the code, which
   is the real lesson: a fake that agrees with the bug proves nothing.
2. **`client.createOrReplace(doc, {transactionId})` silently ignores the id.**
   In @sanity/client, `_create` (behind `create`, `createOrReplace`,
   `createIfNotExists`) builds its body as `{mutations: [...]}` and never copies
   `options.transactionId` into it; only `_mutate` does. Every id we minted was
   dropped, the server assigned its own, and `ownTransactionIds` therefore
   recognised none of our own writes — which silently broke multi-step undo.

**The three fixes.** Absence is now read from the patch shape
(`revert.length === 0`), never inferred from `applyPatch`. Our own writes are
recorded by the id the SERVER returns, so nothing depends on the client
forwarding one. And a new honesty rule: before writing, the candidate is
compared with the current document ignoring `_updatedAt` and `_rev`, and a
transaction that would not move anything is skipped in favour of the next one
back. This feature is no longer able to say "Change undone" while the document
stands still. Re-introducing bug 1 alone now fails 8 tests.

A fourth shape exists too and is handled: a transaction with **both** patches
empty, which names the document but changed nothing about it (seen on
`drafts.homePage` in the live log). It is never a useful step back and is
skipped.

### Three findings, all verified against a live dataset before the code was written

1. **`excludeContent=false` is REFUSED.** The API answers `403 permissionDenied`
   with "This API requires excludeContent to be true". The effects come back
   regardless — `excludeContent` drops the mutation payloads, not the effects —
   so there is nothing lost, and a test asserts the flag so it cannot be flipped
   back by someone tidying.
2. **A transaction's `id` IS the `_rev` the document carries afterwards.** That
   is the whole rev guard, and it is why no extra bookkeeping is needed to know
   whether the log we just read explains the document in front of us.
3. **`_rev` MUST be stripped before `applyPatch`.** It is not part of the value
   the effects were computed against, and leaving it on shifts every field index
   in the patch: the document comes back with `_type` reading `"homePage3:54"`
   and a paragraph turned into an array of single letters. Sanity's own
   `applyMendozaPatch` does the same strip. This looks like data corruption and
   is really an off-by-one; it would be a miserable afternoon to find twice.

### The rules that make it safe

- **Drafts only, which makes it inherently publish-safe.** Only the `drafts.`
  id is ever read or written. A publish is a mutation on the PUBLISHED twin, so
  it is not in this log at all and cannot be stepped over. No special case
  needed; the scope is the safety.
- **The rev guard.** Before writing, the newest transaction touching the draft
  must have `id === draft._rev`. If it does not, something landed that we cannot
  see, and undo refuses with "Someone else edited since" rather than clobbering
  it.
- **The draft-creation edge.** If the transaction being undone CREATED the
  draft — read from `revert.length === 0`, never from `applyPatch`, see the
  postmortem — the honest undo is deleting the draft.
  That is allowed only after checking the published twin still exists. With no
  twin it refuses: "This would remove the only copy". Ctrl+Z must never be able
  to lose a document.
- **Repeated undo steps BACK, not back and forth.** Naively re-reading the
  newest transaction oscillates between two states forever, because our own undo
  is itself the newest transaction. A per-document register of the transaction
  ids we wrote, plus the originals already stepped past, makes `nextUndoTarget`
  skip both. Applying that target's `revert` to the current document is still
  correct, because each undo leaves the document in exactly the state that
  target produced. There is a test named for the oscillation.
- **Redo invalidation, in one line.** Each undo/redo records the `_rev` it left
  the document at. If the document has moved off that rev by the next call, the
  whole stack is dropped: any transaction we did not make — the editor typing, a
  colleague, a script — changes `_rev`, and the states the redo stack pointed at
  are no longer reachable by replaying `apply`.
- **The input-focus rule.** The shortcut does nothing, and calls no
  `preventDefault`, when focus is inside
  `input, textarea, select, [contenteditable="true"], [data-slate-editor]`. The
  browser's own per-field undo and the Portable Text editor's own history win
  there, which is what an editor expects. This shortcut is for everything
  outside a text box.
- **In memory, and it says so.** The stack is a module-level Map, gone on
  reload. The guide says undo is for the last few minutes and Version history is
  the deep restore.

### The active-document problem, and the pragmatic answer

The keyboard listener has to live in a `studio.components.layout` wrapper (a
plugin has no other window-level seam), and a layout wrapper cannot ask "which
document is open?" — the router shape is internal and moves between versions.

So the ACTIONS tell the layout. Both actions render whenever a document pane is
open, so `useUndoRedo(documentId)` pushes its id onto a module-level stack on
mount and splices it off on unmount; `activeDocumentId()` returns the newest,
which is what an editor means by "this one" with two panes side by side. The
listener reads it **at the moment of the key press**, not at render, so it
outlives every pane that opens under it. No document open, no shortcut: the key
press falls through untouched.

### Two deliberate deviations from the obvious design

**We do not supply transaction ids at all.** The first version minted a UUID and
passed `{transactionId}`, which reads as though it works and does not — see the
postmortem. Our own writes are now recognised by the id the SERVER assigns,
read back out of the mutation result (`returnDocuments: false` gives
`{transactionId, ...}`), which is also the document's new `_rev`. That is the id
actually in the log, so nothing depends on the client forwarding one. The
request carries `tag=undo-redo.transactions` for anyone reading the API log.

**`mendoza` is imported bare, and it is not a direct dependency.** It arrives
hoisted at `node_modules/mendoza` as a transitive dep of `sanity` (verified in
both repos before wiring). `sanity` re-exports nothing mendoza-shaped, and
importing through a transitive PATH would be worse. If a repo in the family ever
hoists it somewhere else, that repo cannot take this card until `mendoza` is
added to its `package.json` — check `node_modules/mendoza/package.json` exists
before porting.

### Installing it in a site

Copy the three canonical files, then two lines of wiring in `sanity.config.ts`:
`undoRedoShortcuts()` in `plugins`, and `UndoAction, RedoAction` appended to the
action list for the page-builder types (beside cards 24 and 25 — a page is where
a mis-drag actually costs something). Nothing schema-side changes, so no typegen
and no parity movement. Add the guide entry: it must say Ctrl+Z works OUTSIDE
text boxes, that inside a text box the text box's own undo runs, that the
shortcut is not heard over the Presentation preview (use the menu there), and
that Version history remains the deep restore.

**Known limit: the preview iframe eats the key.** A key pressed while focus is
inside Presentation's iframe goes to the iframe's window, not the Studio's, so
the shortcut is dead exactly when an editor has just used an in-canvas chip.
The two document actions are unaffected and are the reliable path. Forwarding
the key out was considered and declined: it needs a postMessage protocol between
the public preview island and the Studio layout wrapper — key handling in a
public bundle plus an origin check — for a shortcut with a working button two
inches away.

**Verified without a browser session:** the whole of the pure logic — the
request shape, NDJSON parsing, the rev guard, absence detection, target
selection, the no-op skip, stack invalidation — is unit tested (41 assertions),
and undo/redo run end to end against a miniature in-memory Sanity through the
REAL `applyPatch`. That fake is now faithful in the three ways that caused the
incident: creates carry an EMPTY revert, `_updatedAt` moves on every write, and
a caller-supplied `transactionId` is ignored. Re-introducing the create-detection
bug fails 8 tests. The live translog was read (read-only) against presacademy's
production dataset, which is where every finding here came from.

What is STILL not exercised without a Studio open, and is now in
`docs/PENDING.md`: the two actions rendering, the layout composing with an
existing `studio.components.layout`, the key press itself, multi-step undo
against a real server, and whether a whole-document `createOrReplace` is safe
while Presentation's optimistic actor holds in-flight patches for the same
draft (the log showed no sign of trouble during the incident, but that is
absence of evidence).

**Applied to:** starter yes / presacademy yes / WCP pending / church-starter
pending / reid-design-site pending / mas-monograms pending / 2ndpreschicago
pending / nixoncreativestudio n/a (no Studio).

## Card 29: Instant preview text (2026-08-28)

**Dated 2026-08-28 (presacademy), canonicalized in the starter the same day.**
**Canonical:** `src/lib/preview-stega.ts`, `src/lib/preview-text-diff.ts`,
`src/lib/preview-text-nodes.ts` (+ their `.test.ts`).
**Per-repo wiring:** `src/components/preview/overlay/useInstantText.ts`,
`src/components/preview/overlay/timing.ts`, `src/components/preview/VisualEditingOverlay.tsx`.

The old loop, end to end: type in the Studio, Studio autosave commits, Sanity indexes
the change, the Worker's `/preview/live` listen fires, EventSource, debounce, refetch
this preview URL on the server, swap `<main>`. Every hop is small; together they were
1.5-3 seconds, and the editor spent them watching a page that still said the old thing.

The frame already holds a live copy of the draft. `<VisualEditing>` starts an
optimistic-document actor whose remote feed is the STUDIO, not Sanity: the Studio runs
its own listen at `visibility: "transaction"` and relays every mutation over the
comlink. So the frame learns about an edit before the query index has caught up, which
is exactly what the server refetch has to wait for. Watch the actor, diff the document
against the last one seen, and for every PLAIN STRING that changed write the new
characters straight into the text nodes showing it. The refetch still happens; it stops
being the thing anyone waits for.

**Three tested pure helpers are what make this safe to point at a live page**, and all
three are deliberately narrow:

- `preview-text-diff.ts` reports only plain string leaves, only when BOTH sides are
  strings, and never inside portable text (a block's marks, splits and merges move text
  between spans as you type, so patching one span can show a sentence that never
  existed). Array items are matched by `_key`, never by position, so a reorder reports
  nothing instead of reporting every string as changed.
- `preview-stega.ts` splits and reattaches the invisible `@vercel/stega` run every
  preview string carries, and decodes it to `{id, type, path}`. Hand-rolled on purpose:
  `@vercel/stega` is not a direct dependency, `@sanity/visual-editing-csm` is installed
  NESTED and does not resolve from `src/`, and the one importable utility (`stegaClean`)
  throws away the half we need. Forty lines beats a dependency.
- `preview-text-nodes.ts` writes ONLY into a node whose visible characters are EXACTLY
  the old value, and reattaches the payload it split off. So click-to-edit does not
  degrade (the node keeps its identity), an accented heading whose text was cut in two
  never matches, and a value rendered inside a longer sentence never matches. Everything
  that does not match is left for the refresh. A missed instant update is invisible; a
  wrong one is a lie about what the page says.

**Measured, deployed:** keystroke to paint went from 413ms / 1429ms (two consecutive
isolated keystrokes) to roughly 100-140ms. The swap itself costs about 4ms; everything
else is the channel, which is card 29a.

**Adapting it:** the three libs are byte-portable. The hook is not: it reads the
optimistic document API, and how a repo gets a draft snapshot differs. presacademy wraps
that in an `overlay/useDraftDocument.ts` because its in-canvas controls (card 28) also
WRITE through it; the starter only reads, so the single `getDocument().getSnapshot()`
call lives inside `useInstantText` itself. Both swallow the throw a cold frame produces
rather than warning once per keystroke.

## Card 29a: The local edit-state channel (2026-08-28)

**Canonical:** `src/lib/preview-live-draft.ts` (+ `.test.ts`).
**Per-repo wiring:** `src/sanity/components/LiveDraftBridge.tsx`, mounted from
`PreviewNavigator.tsx`; received in `overlay/useInstantText.ts`.

Card 29 made the swap cost 4ms and left a 1-2 second wait entirely UPSTREAM of it: the
actor's feed is still a listen, so an edit is autosaved, committed and made visible as a
transaction before the frame hears a word. The Studio has the answer a whole round trip
earlier, in the local document store its form writes optimistic patches into, and the
Studio and the preview iframe are same-origin. So post it across.

**The priority lesson, which is the whole card.** `useEditState(id, type, priority)`
takes the priority the local store schedules the observer at. The Studio's own
`PostMessageRefreshMutations` asks for `'low'`, because it only needs to know THAT a
document changed, eventually. This needs to know WHAT it says, now. Measured live on the
deployed Studio, 2026-08-28: under `'low'` the store coalesced isolated keystrokes into
the autosave commit, and one keystroke reached the preview in **413ms** and the next in
**1429ms** - the editor's "still a second or two". Under `'default'`: **~100-140ms**.
Use `'default'`. The 60ms trailing throttle in the bridge, not the store's scheduler, is
what keeps this cheap: a keystroke is one snapshot, a burst is one post.

**Four things keep the bridge from being a liability.** It renders null and holds no
state. It is mounted from the navigator, which is the one place inside Presentation that
already knows which page the preview is showing, and unmounted the moment that
resolution goes away. It is throttled trailing. It never throws: a missing iframe, a
cross-origin one, a frame mid-navigation are all swallowed.

**Every message is untrusted.** The island ships in the public preview bundle and
`window.addEventListener('message')` hears from any frame that cares to speak, so
`parseLiveDraft` is a rejection funnel: the origin check is the caller's, and the
envelope, the document, its `_id` and `_type` must be exactly right or the message is
dropped silently. Nothing throws and nothing logs; a hostile page learns nothing and
costs nothing. `document: null` is meaningful and sent on purpose ("this page has no
draft"), which reads as silence rather than as an edit.

**Source arbitration.** Both channels feed ONE "last document I applied" memory, and the
diff is against that memory, so a snapshot OLDER than the memory does not read as
"nothing changed" - it reads as a change BACK to the older words. The local channel is
always ahead of the actor by construction, so every actor snapshot landing mid-burst is
exactly that stale snapshot. `acceptsSource` therefore holds the actor back for
`LOCAL_LEAD_MS` (2000ms) after any local snapshot: longer than one autosave round trip,
short enough that a channel which stops (an older Studio, a preview opened outside
Presentation, the navigator not resolving the page) hands control back within one edit.
Nothing is lost when it does.

**Adapting it:** `LIVE_DRAFT_MESSAGE` is `'pa:live-draft'` and stays that way in every
repo. It is an arbitrary token whose only job is to match at both ends, and changing it
per repo would fork a file that is otherwise identical everywhere for no gain.

## Card 29b: The refresh scheduler (2026-08-28)

**Canonical:** `src/lib/preview-refresh.ts` (+ `.test.ts`).
**Per-repo wiring:** the scheduler loop in `VisualEditingOverlay.tsx`.

**The failure, measured in the deployed Studio.** With `localStorage.previewTiming = '1'`
set, a single burst of edits logged SIX overlapping soft refreshes - 1128, 1505, 1131,
1245, 1494, 1228ms - which is six concurrent server renders of the same preview URL. A
`/preview` render costs about 0.9s of Worker CPU (a public page costs about 0.1s), so six
at once is how the editor got **`Error 1102: Worker exceeded resource limits`**.

The old scheduler debounced with `clearTimeout`/`setTimeout` and nothing else. The
debounce only guarded the window BEFORE a fetch started; once one was in flight, the next
change event scheduled a fresh timer and a fresh fetch. No in-flight guard, no ceiling on
concurrency, and no test of whether an arriving response was still worth having.

**That last omission is the visible bug**, the one an editor reports as "the text I typed
appears seconds later" even though instant text logs 4-6ms:

```
t0   refresh A starts        (server will render the PRE-edit page)
t1   the edit lands, instant text writes the new words   <- page correct
t2   refresh B starts
t3   A's response arrives and replaces <main> with PRE-edit HTML
```

The words revert at t3 and only come back when B lands. With several racing, the LAST to
land can be the STALEST, so the revert outlives every retry. Instant text was never slow;
it was being undone.

**Three rules, all pure so they can be tested rather than argued about:**

1. **Single flight.** At most one refresh in flight. Change events arriving during one
   set `dirty`; that flag runs exactly ONE more refresh afterwards, not one per event.
2. **Stale discard.** Every attempt is stamped with `changeSeq` as it read at fetch
   start. If the sequence has moved by the time the response lands, that HTML predates a
   change we already know about and is not swapped in at any price. It marks the state
   dirty instead, and the follow-up renders the truth.
3. **Rate limit.** `REFRESH_MIN_INTERVAL_MS = 1200`, a floor on the interval between the
   STARTS of consecutive refreshes. **Why 1200:** a `/preview` render is about 0.9s, so
   anything below about a second means a burst is still overlapping renders - the exact
   thing that tripped the 1102. An 80ms debounce with a 0.9s render is what produced six
   at once. 1200ms leaves a real gap after a typical render instead of queueing the next
   against its tail, and costs the editor nothing perceptible because instant text is
   already showing the words. Raise it if the Worker runs hot; lowering it below the
   render time re-creates the pile-up. `REFRESH_DEBOUNCE_MS` stays 80: it only has to be
   wide enough that one autosave's two or three events share a refetch, because the
   Studio already did the "wait for the editor to stop typing" batching.

`dirty` is never dropped, only deferred, so the LAST refresh of a burst always happens
and every caller of the comlink `refresh` promise resolves (Presentation spins its
refresh button until it does).

## Card 29c: The preview morph (2026-08-28)

**Canonical:** `src/lib/preview-morph.ts` (+ `.test.ts`).
**Per-repo wiring:** the morph + fast-path branch in `VisualEditingOverlay.tsx`.

**The failure, measured in the deployed Studio.** The editor's words: the text
"disappears for a second and then reappears after another second". The instrumentation
around one keystroke found: a SINGLE keystroke produced TWO `#main` swaps about two
seconds apart (the rate-limited follow-up, deliberate); nothing was left faded, hidden or
zero-height afterwards at +0/+100/+400/+900ms across forty sampled elements, so this was
never an animation replaying; `#main` held FOURTEEN `<img>` elements and zero
astro-islands; and callbacks scheduled at +100/+400/+900ms all fired about a SECOND late,
so the main thread was blocked for roughly that long at swap time.

The cause was one line: `current.replaceWith(next)`. That throws the whole live `#main`
subtree away and inserts a freshly parsed one, so every image becomes a brand-new element
that has to be re-fetched, re-decoded and re-laid out. Both the blank-then-fill and the
main-thread block, twice per keystroke, for a page whose words instant text had ALREADY
corrected.

**Deployed after:** images rebuilt per refresh **14 -> 0**; main-thread block at swap
**~1000ms -> 12ms**; shrink/reflow events during sustained typing **-> 0**.

**The image-identity rule.** `IMAGE_SOURCE_ATTRIBUTES` is `src`, `srcset`, `sizes`
(`sizes` is in the list because it selects which `srcset` candidate is used, so writing
it can change the resource even when `srcset` has not). When both sides are the same
`<img>` pointing at the same bitmap, the morph EXCLUDES those three names explicitly. The
attribute sync already refuses to write an unchanged value, so on its own this is
redundant - it is stated as a GUARANTEE rather than a coincidence, because reusing image
elements is the single biggest reason the file exists and a future tightening of
`syncAttributes` must not be able to reintroduce a `src` write by accident. A test asserts
nothing was written to them.

**The fallback contract.** Every cap and every thrown error makes `morph` return false,
and the caller then does exactly what it used to do: RE-PARSE the response and
`replaceWith` it. Re-parse, not reuse - `to`'s children are MOVED into `from` as the walk
goes, so a bailed morph leaves `to` no longer a whole `<main>`. A morph bug can therefore
make the preview slow again, but it can never leave a half-updated page on screen.

**The fast-path skip.** `isRedundantRender(fetched, live, lastAccepted)` is plain string
equality on markup the same serializer produced. Two ways a render is known-redundant:
`fetched === live` (the page already reads as the server says) and
`fetched === lastAccepted` (the server re-rendered the same bytes, so it has NOT caught up
with what instant text has since written). Case 2 is why a skip must NOT fire the
soft-refresh event: that event is also the pending-swap memory's "the server now agrees"
signal, and firing it there would retire swaps that have not landed. Nothing further is
normalized on purpose - collapsing whitespace or sorting attributes would buy a few more
skips and risk declaring two genuinely different pages equal, and the cost of a miss is
now only a cheap morph.

**Matching:** keyed children (`id`, `data-sanity`, `data-stype`, `data-key`, most
specific first) claim their old counterpart wherever it sits, so a section reorder moves
nodes instead of rebuilding them; keyless children claim the next unclaimed KEYLESS old
child, and positional matching deliberately steps over keyed ones. `data-sanity` is the
attribute that actually carries this: every section wrapper gets one from
`src/lib/preview-edit-attr.ts`, built from the document id and the array item's `_key`.

**Adapting it:** the file is written against a minimal structural interface
(`MorphNode`/`MorphElement`/`MorphCharacterData`) rather than the DOM, the same trick
`preview-text-nodes.ts` plays with `TextLike`, so the algorithm is tested with plain
objects under `node:test`. Real `Element`/`Text` satisfy it structurally. Nothing in it is
repo-specific.

## Card 29d: Staleness counts every channel (2026-08-28)

**Canonical:** the `seen` history in `src/lib/preview-live-draft.ts` and `applyKnownChange`
in `src/lib/preview-text-nodes.ts` (both `.test.ts` covered).
**Per-repo wiring:** the `noteInstantChange` bump in `VisualEditingOverlay.tsx`, passed to
`useInstantText` as `onDocument`.

**The bug:** "half my text disappears, then a second later it comes back." It survived
cards 29b and 29c, and it had TWO causes.

**Cause one: the sequence only counted the slowest channel.** Card 29b's stale discard
compares the sequence a render was stamped with against the newest one KNOWN - and the
sequence was bumped only by the SSE change events, which fire at Sanity's transaction
visibility, about a second behind the keystroke. The instant-text path learns of the same
edit in ~100ms over the local channel (card 29a). Between those two instants a render
could START before an edit, LAND after it, and still be judged current; the morph then
wrote the server's half-typed sentence over the finished one. Fix: every document instant
text applies calls `onChange` too. **Staleness is a property of the newest KNOWN document,
not of the slowest channel that could have told us about it.** This raises the number of
DISCARDS during a burst and not the number of RENDERS - rules 1 and 3 of card 29b cap
starts at one per `REFRESH_MIN_INTERVAL_MS` however many changes arrive between them. It
marks the state dirty as well, on purpose: the server still has to render the newest text
eventually, and a discard that scheduled nothing would leave the page correct only by
instant text's grace, with structural edits unrendered.

**Cause two: the re-apply could only recognise one stale value.** After a refresh, each
pending swap was re-applied only where the node read exactly `previous`, on the reasoning
that server HTML is either up to date or still showing the value the burst started from.
It can be neither: a render that started mid-burst reads the query index at ITS OWN
instant, so its words are an INTERMEDIATE value, the sentence as it stood half a second
ago. That matched neither `previous` nor `next`, so the re-apply could not correct it and
half a sentence sat on the page until the following render.

**The value-history repair.** `PendingSwap.seen` keeps every OTHER value the field has
been seen to hold this session, oldest first, capped at `MAX_SEEN = 12` (a render is at
most a second or two behind and the local channel posts at most every 60ms, so a dozen
covers far more history than any accepted render carries). The cap eats from just AFTER
the oldest entry, because the oldest is the value the first server render of the burst is
still going to arrive holding. `applyKnownChange` writes when the node reads exactly one
of `seen` and is not already showing `next`.

**Why that is still the same promise.** The match is still EXACT, against a value the
field ACTUALLY HELD in a snapshot we diffed, and the node was matched to the field by its
stega identity, not by searching the page for words. So "this node shows a value from this
field's own past" means exactly "this node is showing a stale render of this field", and
writing the newest value is a correction, not a guess. A node showing anything else - a
transformed rendering, another editor's words, a value from before this session - matches
nothing and is left alone. A missed instant update is invisible; a wrong one is a lie
about what the page says.

`rememberSwap` stays keyed by FIELD and never by source, which is what lets the two
channels take turns on one field without either forgetting the other's work, and it drops
the entry entirely when `next` comes back around to the original `previous` (the editor
undid it): the field is level with the server, so there is nothing left to correct.

### The two operational rules this layer depends on

Neither is enforceable by a test, so they are written here.

1. **Preview pages MUST send `Cache-Control: no-store`.** These SSR responses carried no
   Cache-Control at all, so browsers applied HEURISTIC caching, and the Presentation
   iframe kept serving the PREVIOUS deploy's page - stale island hashes, new editor
   features invisible - until the cache aged out. Draft content is per-cookie anyway;
   caching it was never right. Set it on the preview route
   (`src/pages/preview/[...slug].astro`); `/preview/live` already sent it.
2. **`visibility: 'query'` on the `/preview/live` listen must never be weakened.** It is
   tempting to set `'transaction'` to make the preview feel faster. Do not. `'query'` means
   Sanity waits until the change is visible to a QUERY before signalling, which is exactly
   what the overlay does next: refetch this page from the server. A `'transaction'` event
   fires earlier, and the refetch it triggers would return data that is STILL STALE, so
   the morph would re-render the page with the OLD words - over the new ones instant text
   has already put there. The earlier signal already reaches the frame by a different
   road: the Studio relays its own transaction-visibility listen over the comlink, and
   that is what instant text listens to. This one stays slow on purpose.

## Sync sessions

A sync session is a pass over one repo: run `sync-check`, reconcile drift, install the
cards that repo should have, add the PORTABLE marker to its canonical copies, and tick
the matrix.

### 2026-08-27: starter established as the library of record

Installed in `ncs-astro-sanity-starter`: `scripts/with-workerd.mjs`,
`scripts/free-dist.mjs`, `scripts/page-parity.mjs` (parameterized html root plus route
auto-discovery) with baselines in `scripts/.parity/`, `scripts/lib/sanity-lib.mjs`
(reconciled onto the existing `loadEnv.mjs`), `src/lib/contrast.ts` with
`src/lib/theme-tokens.test.ts`, the stale-types guard in `.github/workflows/ci.yml`, and
the new `scripts/sync-check.mjs`. PORTS.md created with cards 1-15 and the matrix above.

Verified: parity capture / rebuild / compare 9/9 PASS; `sync-check` self-check 6/6 SAME;
`npm run check` green.

Cross-check run from presacademy with `NCS_STARTER_DIR` set: **no marked files found**,
as expected, because presacademy's copies predate the marker. presacademy needs a sync
session whose first act is adding the marker line to `scripts/with-workerd.mjs`,
`scripts/free-dist.mjs`, `scripts/page-parity.mjs`, `scripts/lib/sanity-lib.mjs` and
`src/lib/contrast.ts`, after reconciling each against this repo's now-canonical version
(page-parity and sanity-lib both changed on the way in, so those two will report DRIFT
the moment the marker lands). No presacademy files were modified in this session.

WCP has a parallel session porting the parity harness, the stale-types guard, and the
backup and uptime workflows; those four cells read "yes" until it lands.

WCP session outcome notes (2026-08-27): backup/uptime/stale-types
guard/parity all landed. Adaptations recorded on their cards: Sanity
6.4 has no `schema extract --force` and multi-workspace repos need
`--workspace`; typegen config lives in sanity-typegen.json; the
parity harness is a PATTERN, not an identical-canonical file (WCP
added Instagram normalizer rules and an env-divergence gotcha: the
Playwright webServer builds with fake tracker ids, so compare only
against a plain build). The workflow-level working-directory default
breaks no-checkout gate jobs; scope defaults to the export job.

Family-wide sweep completed 2026-08-27/28: every repo had its first
sync session (reid, mas-monograms, 2ndpreschicago, church-starter,
nixoncreativestudio, plus presacademy's marker session). Adaptation
notes earned along the way, now part of the cards' lore:

- reid's Playwright CI job must build with REAL Sanity ids (its
  hidden-route stubs derive from live sectionVisibility data); the
  suite passed 140/140 and gates for real.
- Multi-hop origins (nixoncreativestudio: apex 301 -> www 307 ->
  slash) need curl -sSL in uptime; single-hop sites pin literal 200s
  on trailing-slash paths.
- Templates gate backup on a SANITY_PROJECT_ID variable instead of a
  hardcoded id, schedules commented for forks (church-starter).
- mas-monograms' new stale-types guard caught a REAL stale-types bug
  on its first run (studioGuide video fields).
- Cutover watch: secondpreschicago.org AND reiddesignllc.com still
  serve from Squarespace; their SITE_URL variables wait for DNS.
- loadEnv.mjs is now PORTABLE-marked here (this commit). The five
  downstream Sanity repos carry the unmarked copy; each pulls the
  marked version forward at its next session (church-starter's
  PENDING documents why marking downstream-first is wrong).

### 2026-08-28: the starter takes the full modern stack (cards 1, 10, 11, 13, 14, 17)

The template upgrade card 17's rollout plan called for, done in one session and gated per
phase: Astro 6.3 to 7.2 with `@astrojs/cloudflare` 14.2.4 and wrangler `~4.110.0`; the
Sanity 6.4 pin set; the nested `studio/` package folded into the root and embedded at
`/studio`; the preview stack; and the in-canvas section controls. Full detail is in
`docs/agent/changelog.md`; the reusable lessons are folded into cards 1, 10, 11, 13, 14
and 17 above rather than repeated here.

Gate results: `npm run build` green, `npm test` 94/94, `npm run parity compare` 10/10
twice, `sync-check` self-check 7/7 SAME (no canonical file needed changing), one
`@sanity/ui` on disk, one `errors.md#` chunk, typegen byte-stable, and `wrangler dev`
serving `/`, `/about/` and `/studio/` with the Studio mounting in a real browser.

Parity baselines were re-captured **twice**, both times with the diff classes enumerated
first: once for the Astro 7 upgrade (generator string, island uid, minifier output,
text-node whitespace) and once for a `sonner`/react-aria attribute that arrived with a
clean lockfile re-resolve. Nothing structural moved in either.

**What is NOT verified here, and what the next repo should do differently:** this
template has no Sanity project, so the preview could only be proven to fail closed
(503 naming the missing config; `/preview/live` 403 without the Studio cookie). Rendering
a real draft, the click-to-edit overlay, and the in-canvas controls need a configured
project and a `SANITY_TOKEN`. A site repo installing this card should run that check for
real, in a browser, before ticking its cell.

**Next in card 17's order:** reid-design-site (already Sanity 6, shortest hop), then
mas-monograms, then 2ndpreschicago after its DNS cutover. ncs-church-starter should
inherit most of this by sync from here rather than by a fresh port.

### Card 10/17 rollout complete (2026-08-28, late)

Every Sanity repo except 2ndpreschicago (parked for DNS cutover) now
carries the modern stack. "staged" = verified and pushed to a
modern-stack HOLDING BRANCH because those repos auto-deploy from main
via Cloudflare Workers Builds; the dashboard deploy command must
become `npx wrangler deploy -c dist/server/wrangler.json` BEFORE the
merge, or every SSR route 404s. reid additions to the lore:
sanity-plugin-iframe-pane floats a third @sanity/ui by caret (drop it,
presentationTool supersedes it); pass a per-request client into query
functions with the memo skipped so draft reads never leak between
Worker requests; and verify surprising upstream markup changes in a
real browser before pinning (radix accordion's dropped aria-controls
was deliberate and axe-clean).

### 2026-08-28 (later): edit-mode gate + sticky page-list navigation

Two editor reports from presacademy, fixed and rolled to every
Presentation repo (presacademy, wcp, starter, church-starter [layout
only - no navigator], reid + mas modern-stack branches):

1. Edit-mode gate in PreviewLayout's interceptor (see Card 11's
   amendment).
2. STICKY navigation in PreviewNavigator: a page-list click during a
   preview page load was silently dropped, because Presentation can
   only hand the iframe its next URL once the new page's
   visual-editing script reconnects. The navigator now records the
   click's intent, highlights the row immediately, and re-issues
   navigate() every 750ms until params.preview reports arrival (~6s
   cap). When the first navigate lands, `current` matches at once and
   no retry ever fires.

Verified on the presacademy build: an edit-mode click on a CTA leaves
the URL untouched; the same click without overlay boxes remaps into
/preview/*.

### 2026-08-28 (later still): the chrome joins the preview as a template part

The preview shell renders the REAL Header and Footer around every
page (they were chrome-less only because header links used to bounce
the iframe onto the live site - the click interceptor closed that
hole). siteSettings is fetched draft-aware in PreviewLayout so chrome
edits live-update. Each piece is wrapped in a data-sanity attribute
via the new docEditAttr(id, type, path) helper in preview-edit-attr:
the WordPress-template-part gesture. In Edit mode the header/footer
outline as editable surfaces and a click opens the owning document in
the edit panel. Applied to presacademy (header->title,
footer->mission), wcp (header->the navigation doc's mainNav,
footer->siteSettings; its chrome already rendered via linkBase),
starter, church-starter, reid + mas modern-stack (all
header->siteSettings.title, footer->tagline). Headers/Footers accept
an optional siteSettings prop with clean fallbacks in every repo, so
a null fetch can never blank the chrome.

### 2026-08-28: card 18 lands in both templates (chrome options)

Card 18 ported from presacademy (canonical) into the starter and
church-starter in one pass. Each got the shared `navLink` type
(registered in schemaTypes/index.ts), `src/lib/nav-href.ts` carrying
its OWN singleton -> live-path map, the dereferencing
NAV_LINK_PROJECTION plus an exported SITE_SETTINGS_PROJECTION that
PreviewLayout now fetches through, and the chrome fallbacks pulled out
of Header/Footer into resolveSiteSettings. New Site Settings fields in
both: headerCta {show,label,link}, legalNav, logo (image + alt),
showEmail, showSocials, showFooterSocials; navItems and footerColumns
were REUSED, with the inline navLink member swapped for the shared
type and the legacy footerLink kept beside it.

Three adaptation notes worth carrying to the next repo:

- **The starter's resolver is chrome-only.** church-starter already had
  a `resolveSiteSettings` covering identity/contact/social, so the
  menus joined it. The starter had no such module, so the new one
  resolves the chrome and nothing else; its Header/Footer still read
  identity fields off the raw document. Folding those in is a separate,
  parity-risky change.
- **Two fallbacks stayed in the components on purpose**: the starter's
  footer columns (per-link module-visibility flags) and both footers'
  legal rows (links with different link styles). They resolve to an
  empty array and the component keeps its built-in markup. See the
  centralized-fallback rule on the card.
- **The header's max menu length is per-repo.** presacademy and the
  starter cap navItems at 6; church-starter's own built-in menu is
  seven entries wide, so it caps at 7. Capping below a repo's own
  default menu would be a validation error nobody could satisfy.

Both repos verified green: `npx tsc --noEmit` clean (TS5101 baseUrl
deprecation only), `npm run build` clean, `node scripts/page-parity.mjs
compare` 10/10 (starter) and 20/20 (church), unit tests pass, and
`sanity schema extract --enforce-required-fields` succeeds. The parity
run is what caught the SanityImage-import CSS-bundle rename recorded on
the card. Baselines were NOT regenerated in either repo.

### 2026-08-28: publishing confidence lands in both templates (cards 19 + 20)

Unlocked Studio Phase E, written here first and installed in
church-starter in the same pass. Three files are byte-identical
across the two repos and PORTABLE-marked here:
`src/sanity/components/shareDraftLink.tsx`,
`src/sanity/schemaTypes/_publishAt.ts`, `scripts/publish-due.mjs`.
The fourth, `.github/workflows/publish-due.yml`, differs only in the
paragraph naming which template it is sitting in.

Three adaptation notes for the next repo:

- **church-starter has no PreviewNavigator.** The share affordance is
  therefore the document action alone there, which is why the module
  was written as a `useShareDraftLink()` hook with the action beside
  it rather than as navigator markup. The starter, which does have a
  navigator, calls the same hook from a per-row button. Any repo
  gains the navigator button by adding one `<Button>`; none of them
  needs a navigator to get the feature.
- **Where the field went, and where it did not.** Both repos put the
  group/field pair on `page` and on their page-singleton factory. In
  church-starter that factory backs all eleven church page
  singletons, so coverage is broad. In the starter the factory is
  currently uncalled (every core singleton is hand-authored), so only
  `page` carries the field in practice. Hand-authored singletons in
  either repo do NOT have it yet; adding it is spreading
  `PUBLISH_AT_GROUP` into that type's `groups` and `publishAtField()`
  into its `fields`, together, and nothing else. The script never
  needs to know.
- **The dry-run could not be exercised against real data.** Neither
  template has a `.env` or a Sanity project, so `publish-due.mjs` was
  proven only to parse, to fail closed on a missing project id and on
  a missing token, and to keep the token out of every message. The
  first fork to enable this should run the bare (dry) form against a
  real dataset with one scheduled draft before uncommenting the cron.

Both repos verified green: `npx tsc --noEmit` clean (TS5101 baseUrl
deprecation only), `npm run typegen` re-run and committed,
`npm run build` clean, `node scripts/page-parity.mjs compare` 10/10
(starter) and 20/20 (church) - nothing here touches built HTML - unit
tests 94/94 and 60/60, and `sanity schema extract
--enforce-required-fields` succeeds in both with `publishAt` present
and optional. Prettier reformatted `page.ts` in both repos and
`_pageSingleton.ts` / `churchPages.ts` beyond the edited lines; those
files had drifted from `npm run format` before this session.

### 2026-08-28: Pages as first-class objects, in both templates (cards 21, 22)

Installed in `ncs-astro-sanity-starter` (canonical) and
`ncs-church-starter`: `src/lib/redirects.ts` + `redirects.test.ts`,
`src/sanity/pageOps.ts`, `src/sanity/components/pageActions.tsx`,
`src/sanity/components/slugRedirect.tsx`,
`src/sanity/components/SeoSnippetInput.tsx`,
`src/sanity/schemaTypes/_seoFields.ts` (all seven PORTABLE-marked and
byte-identical across the two repos), plus a per-repo
`schemaTypes/redirect.ts`, the `archived` + Search & sharing wiring on
each `page` type, a Redirects list under Pages in each desk structure,
the build-time redirect and hidden-page reads in each
`astro.config.mjs`, and the actions wiring in each `sanity.config.ts`.
The starter additionally grew the per-row "..." menu and the
**Archived** group in `PreviewNavigator.tsx`; the church starter has
no navigator and takes the document actions alone, which is the
complete feature.

The reference implementation was WCP's, and three things were
deliberately NOT copied straight across:

- **`redirects.ts` lost the doc-type-to-path map.** WCP's version owns
  `pathForPageSlug` / `pathForPostSlug` / `pathForDocSlug`. Both
  templates already have that map, per repo, in
  `src/sanity/urls.ts` (`pathForDoc`), so the canonical file keeps only
  the pure path arithmetic and the publish action asks `pathForDoc`
  instead. That is what makes both `redirects.ts` and
  `slugRedirect.tsx` byte-identical in repos whose routes have nothing
  in common, and it removed the need for a `SLUG_REDIRECT_TYPES` list.
- **The verbs were pulled out of the navigator into `pageOps.ts`.** In
  WCP they live inside `PreviewNavigator.tsx`. The church starter has
  no navigator, so a navigator-only feature would have been
  church-shaped as "not available". Splitting logic from surface gave
  the church the full feature through document actions and gave the
  starter both surfaces from one implementation.
- **Menu drag was skipped in both, on purpose (mission call).** WCP's
  navigator can drag a page into the header menu because WCP's menu is
  a `navigation` singleton of page references. In these templates the
  menu is `siteSettings.navItems`, already fully editable in Site
  settings, and the navigator's groups are publication-state groups,
  not menu-membership groups. A drag target would have had to be
  invented rather than ported.

Adaptation notes earned on the way:

- **`archived` reaches the live site through four queries, not one.**
  `getAllPageSlugs` (so the route is never built), the nav link
  projection plus `navHref` (so a menu link to an archived page is
  dropped instead of pointing at a 404), and the sitemap read in
  `astro.config.mjs`. Every test is `archived != true`, never
  `archived == false`.
- **Patching both twins needs a presence check first.** A patch against
  a missing document id fails the whole transaction, so
  `setPageArchived` looks up which of `<id>` / `drafts.<id>` exist
  before building it. WCP's navigator got this right by carrying
  `hasDraft` / `hasPublished` on each row; a function with no row to
  read has to ask.
- **`hideFromSearch` was added only to `page`, not to the page
  singletons.** The singletons' SEO fields are hand-authored per type
  and nothing on the routes reads a `noindex` from them yet; a switch
  with no second half is a dead control, which is exactly what
  `_seoFields.ts`'s header warns against. The starter's uncalled
  `_pageSingleton` factory was edited and then reverted for that
  reason. Extending it later is: pass the type's existing three SEO
  fields into `seoFields({ reuse })`, add `hideFromSearch` to that
  page's GROQ projection, pass `noindex` to `BaseLayout`, and add the
  type to the sitemap read.
- **The global `CharacterCountInput` wrapper is safe over a field-level
  custom input.** It renders `props.renderDefault(props)` untouched for
  anything without a max length, so the value-less `seoPreview` field
  reaches `SeoSnippetInput` normally. Worth knowing before adding any
  other custom input to these repos.
- **`sanity schema extract --path` is resolved relative to the repo
  root and rejects an absolute Windows path** (it tries to `mkdir`
  `<repo>\C:\Users\...`). Pass a bare filename and delete it after.

Both repos verified green: `npx tsc --noEmit` clean (TS5101 baseUrl
deprecation only), `npm run lint` with no new findings (the starter's
one pre-existing error in `pageBuilder.types.ts` is untouched), prettier
clean on every edited file, `npm run build` clean, `npm run typegen`
re-run and committed, `sanity schema extract
--enforce-required-fields` succeeds in both, unit tests **106/106**
(starter, 94 + 12) and **72/72** (church, 60 + 12), and
`node scripts/page-parity.mjs compare` **10/10** and **20/20** with no
regeneration - nothing here changes rendered HTML until an editor
archives a page or ticks a switch. `sync-check` self-check in the
starter is 17/17 SAME, and the cross-check from church against the
starter is 16/16 SAME (church still does not carry the marker on
`scripts/page-parity.mjs`, which is a pattern rather than an identical
canonical file).

### 2026-08-28: sync-check learns the nested-app rule

wcp keeps its whole app under site/, so every marked file there
reported MISSING-IN-STARTER - the checker compared repo-relative
paths only. sync-check.mjs now retries a miss once with the first
path segment stripped (one segment, only on a miss, labeled in the
output as "(starter: <path>)"). First run against wcp immediately
surfaced two real drifts (free-dist / with-workerd carrying
pre-genericization em-dash comments; starter copies pulled forward)
plus the documented deliberate icons-5 drift in shareDraftLink.

### 2026-08-28: editor-defined forms land in both templates (card 23)

Both templates learned to let an editor write their own form questions,
ported from wcp's Unlocked Studio Phase D. Three new canonical files,
byte-identical in both: `src/lib/custom-form-fields.ts`, its test, and
`src/sanity/schemaTypes/formQuestion.ts`. The starter hangs the `fields`
array on `contactPage` (`formFields`) and teaches `ContactForm.tsx` to
draw the questions and fold the answers; church-starter hangs it on the
`sectionForm` page-builder block, with a new `QuestionsForm.tsx` island
beside the untouched `FormRenderer.tsx`.

Adaptation notes earned on the way:

- **The type is `formQuestion`, not `formField`.** church-starter's
  `form` document already registers a `formField` array member. Two
  schema types with one name is a browser-runtime Studio crash that
  `astro build` does not catch, and a byte-identical canonical file
  cannot rename itself per repo. Named once, for the whole family.
- **Neither template has a form API route, and neither needed one.**
  Both post client-side to Web3Forms from a React island. The lib's
  `parseCustomFieldEntries` takes an `Iterable<[string, string]>`, so
  the island synthesizes the same pairs a native POST would produce and
  the fold happens just before `fetch`. Same tested code, no route, no
  new env var. `PUBLIC_WEB3FORMS_KEY` still gates delivery, and the
  keyless fallback each repo already had (inline notice in the starter,
  mailto in church) is preserved.
- **An island prop must be SPREAD, not passed, to keep parity.** Astro
  serializes island props into the rendered `<astro-island>` element, so
  passing `customFields={[]}` would change the HTML of a page with no
  questions. `contact.astro` builds `questionProps` and spreads an empty
  object instead, and parity stays zero-diff.
- **church's `sectionForm.form` reference stopped being plainly
  required.** It is now a custom rule: a Form document OR at least one
  question. A section built the old way still cannot be left empty.
- **The starter's questions replace the built-in questionnaire**
  (location, project type, budget, timeline, message, source), matching
  wcp's variant semantics. `validate()` returns early on the studio
  fields when questions exist, and the payload omits them rather than
  sending blanks.

Verified in both repos: `npx tsc --noEmit` clean, `npm run build` green,
`sanity schema extract --enforce-required-fields` succeeds, `npm run
typegen` regenerates cleanly (78 and 118 schema types). Unit tests
**124/124** (starter, 106 + 18) and **90/90** (church, 72 + 18).
`page-parity compare` **10/10** and **20/20** - an empty questions array
is a zero-diff no-op, which is the proof the change is additive.
`sync-check` self-check in the starter is 20/20 SAME; from church the
three new canonical files all report SAME. One PRE-EXISTING drift
remains in church: `scripts/sync-check.mjs` never received the
nested-app rule from the session above. Untouched here, still open.

### 2026-08-28: saved sections + pre-publish checks land in both templates (cards 24 + 25)

Both templates learned wcp's Unlocked Studio Phase C and E: keep a
section and reuse it, and read a page back before publishing. Four new
canonical files, byte-identical in both (`src/lib/page-checks.ts`, its
test, `src/sanity/actions/checkPage.tsx`,
`src/sanity/actions/saveSectionPreset.tsx`), one canonical file
extended (`addSectionToPage()` joins duplicate and archive in
`src/sanity/pageOps.ts`), and two per-repo files each: the
`sectionPreset` document against that repo's own section union, and
`src/sanity/pageBuilderConfig.ts`.

**The config-object restructure is deliberate canonical evolution,
ahead of wcp's copy.** wcp's ancestor bakes its own field names and
lists into the library file, which is exactly why it could not be
shared. Card 25 carries the fold-back recipe; nothing about it is
urgent.

Adaptation notes earned on the way:

- **The section union is reused, never rewritten.** The starter's
  preset takes `[...SECTION_TYPES, ...RICH_SECTION_TYPES]` (the widest
  union in the repo, so a preset can be saved from any page);
  church-starter's takes `FLEXIBLE_SECTION_MEMBERS`. Both carry the
  repo's own `sectionArrayOptions`, so the picker inside a preset reads
  exactly like the picker on a page. A hand-written member list would
  have gone stale on the next block added.
- **`sectionLabel` had to learn both naming conventions.** The starter
  suffixes its types (`imageTextSection`), church-starter prefixes them
  (`sectionImageText`). One canonical function strips either, so both
  read "Image text". wcp, which only suffixes, is unaffected by the
  added prefix rule.
- **The insert surface is where the two repos genuinely differ, and
  splitting the verb from the surface is what let both have the
  feature.** The starter has the Presentation navigator, so it got the
  "Saved sections" group with per-row "add to the page you are looking
  at". church-starter has no navigator at all, so the same verb hangs
  on the saved section instead: "Add to a page..." with a page picker.
  Same `addSectionToPage`, opposite direction. This is the same lesson
  cards 21/22 recorded, met again.
- **`PageOpsClient` grew `createIfNotExists` and `patch`.** Both
  existing call sites cast through `as unknown as PageOpsClient`, so
  widening the interface broke nothing, and the real Sanity client
  satisfies all of it.
- **One list wires three things.** `SECTION_HOST_TYPES` in
  `pageBuilderConfig.ts` is the document-actions gate, the navigator's
  "can a saved section go here?" test, and church's page picker. In
  church that list is the generic `page` plus eighteen singletons that
  all share `flexibleSections`, so the actions resolver branches once
  on a set rather than naming types in three places.
- **The starter's `additionalSections` append zone is read by the
  checks but is never an add TARGET.** A saved section goes to the main
  builder; the checks still walk both, numbered as one list, because
  that is how the editor sees the page.
- **The navigator's live `listen` had to widen to
  `*[_type in ["page", "sectionPreset"]]`,** or a section just saved
  from a page would not appear in the panel until the tool was
  reopened.

Verified in both repos: `npx tsc --noEmit` clean (TS5101 baseUrl
deprecation only), `npm run build` green, `page-parity compare`
**10/10** and **20/20** (nothing here touches rendered HTML until an
editor adds a section), `sanity schema extract
--enforce-required-fields` succeeds, `npm run typegen` regenerates
cleanly (79 and 119 schema types), `npm run lint` with no new findings
(the starter's one pre-existing `pageBuilder.types.ts` error is
untouched), prettier clean on every new and edited file. Unit tests
**150/150** (starter, 124 + 26) and **116/116** (church, 90 + 26).
`sync-check` self-check in the starter is 24/24 SAME and the
cross-check from church is 23/23 SAME, the five shared files included.
The pre-existing church drift on `scripts/sync-check.mjs` (no
nested-app rule) is still open and still untouched.

### 2026-08-28: the client offer written down

docs/CLIENT-OFFER.md states what the Unlocked Studio program lets you
promise a client, what stays locked and why that is the product, the
free-plan roles reality (Admin/Editor only; Growth unlocks custom
roles and Sanity's own scheduling - card 20 exists so scheduling does
not need it), the theme-presets default-no decision, the care plan,
and the words to avoid (requests served, not page views; one-hour
share links; count the seats).

### 2026-08-28: card 25 fold-back landed in wcp

wcp is now canonical on page-checks.ts (SAME) with its own
pageBuilderConfig.ts. Deliberately divergent there, by design, with
reasons in the file headers: the two action files (wcp's volunteer
guide quotes their labels verbatim) and pageOps (wcp's duplicate
must strip hubKey and branch hub preview hrefs; canonical pageOps
has no hub concept). Test files are per-runner everywhere: the
canonical suite is node:test, wcp's is vitest with the same cases.

### 2026-08-28: appearance controls land in both templates (card 26)

Ported from presacademy, adapted per repo. Three new canonical files
(`src/lib/inline-rich.ts`, `src/lib/heading-accent.ts`,
`src/components/InlineRich.astro`) now carry the PORTABLE marker and
report SAME in both directions; everything else is deliberately
per-repo, because the colour maps are the brand.

**church-starter got it in full.** Six surface pairs (Paper, Warm,
Bright card, Chapel green, Chapel deep, Ink — `card` and `ink` are
the additions, the four originals emit their old classes), three
accents (Bronze default/no class, Chapel green, Ink) wired once in
SectionShell so every pill and accent word follows with no per-block
colour edit, swatch chips in the Studio, six rich twins, five heading
accents, and a six-entry column registry with two new controls
(steps, dynamic list). 75-assertion contrast gate, tightest pair
5.99:1, nothing lowered. 209 tests, parity 20/20, typegen committed.
Its guide gained a "Change how a section looks" entry and — the other
half of the editor report — its `sections` guide now teaches the
right-click gesture, and the stale "there is no live preview inside
Sanity" line is gone, because there is.

**starter got it partial ON PURPOSE**, and the card says why: CLAUDE.md
#9 forbids a per-block surface field here (the SectionRenderer owns
the alternating cadence so reordering cannot break the rhythm) and
there is no shared section shell to hang an accent class on. So
`surfaces.ts` formalises and GATES the four surfaces the cadence and
the components already paint — including the shadcn `:root`/`.dark`
overrides that theme-tokens.test.ts explicitly left out — the heading
accent is one fixed brand colour with the word as the only choice,
and the rich twins and layout registry land in full through
SectionHeading.astro, which serves nearly every section at once. No
tone field, no accent enum, no SwatchInput. 208 tests, parity 10/10,
sync-check 27 SAME.

Not yet swept for this card: reid-design-site, mas-monograms,
2ndpreschicago, nixoncreativestudio. WCP stays `partial`: it has the
emphasis layer and its own older colour knobs.

### 2026-08-28: undo & redo land in both templates (card 27)

Three canonical files, byte-identical in both repos and both marked:
`src/sanity/undoRedo.ts` (the transaction-log machinery),
`src/sanity/components/UndoRedo.tsx` (two document actions plus the
keyboard plugin), `src/lib/undoRedo.test.ts` (27 tests). Wiring is two
lines per repo: `undoRedoShortcuts()` in `plugins`, and
`UndoAction, RedoAction` beside cards 24 and 25 on the page-builder
types. No schema change, so no typegen and no parity movement.

**The mechanism was established empirically, not from memory.** A
read-only dry run against presacademy's production dataset settled
three things the same morning: `excludeContent=false` is refused with a
403, a transaction's `id` is the `_rev` it leaves behind (which is the
rev guard, free), and `_rev` must be stripped before `applyPatch` or
the reverted document comes back with its `_type` reading
`"homePage3:54"`. The same dry run replayed five real transactions of
`drafts.homePage` and confirmed `apply(revert(doc)) === doc` exactly.
All three are written into the card and the file header, because the
third one in particular looks like corruption rather than an
off-by-one.

**presacademy** also gained the guide entry "Undo a change", and the
`sections` guide's see-also now points at it. The line it already
carried — "Removing a section is undoable before you publish" — is
finally true in the way an editor would read it.

**starter** got the same three files and the same wiring. Its
`sanity.config.ts` has no layout component of its own, so the plugin's
layout is the only one; presacademy's composes on top of `StudioLayout`
(fonts), which is the arrangement to watch when porting to a repo that
already wraps the layout.

Verification: 235 tests in the starter, 258 in presacademy, both
green; `tsc --noEmit` clean in both; both build; starter parity 10/10;
sync-check 30 SAME self-check and 19 SAME cross-check. presacademy's
parity harness reports 0/13, and it does so on a clean tree too
(verified by stashing) — a pre-existing baseline drift in the theme
script, unrelated to this card and still open.

What no test can reach without a Studio open: the actions rendering in
the publish menu, the plugin layout composing with an existing one, and
the key press itself. Those are the three things to click first.

### 2026-08-28: tsc was blind behind TS5101

npx tsc --noEmit stops at the TS5101 baseUrl deprecation before
checking any file, so every repo whose only type gate was bare tsc
verified nothing. Found when WCP's astro check caught a real bug in
canonical undoRedo.ts (the as-RawDoc contextual-generic trap, now
fixed canonically). tsconfigs carry ignoreDeprecations '6.0' now;
the trustworthy gate for Astro repos is astro check, and bare tsc's
leftover noise (.astro imports, cloudflare:workers types) is
environmental, not code. Follow-up decision queued: install
@astrojs/check family-wide so every repo gates like WCP.

### 2026-08-28: card 28 - the floating in-canvas layer (presacademy first)

Squarespace-style popovers in the Presentation canvas, built on the
overlay-component API (components prop on <VisualEditing>; resolver
runs only in Edit mode with the optimistic actor ready; controls
must opt into PointerEvents over the pointer-events:none layer).
Surface/accent chips on section hover, click-a-word headingAccent,
Edit-here popovers (textarea for hero fields, strong/em-only
contenteditable for rich twins with an allow-list paste tokenizer),
and preset-adds adopting the neighbour's tone (caller-side;
pageOps stays byte-exact). Writes go through useDocuments from
@sanity/visual-editing/react - comlink to the Studio, drafts always,
no browser token, covered by card 27's undo. A drift gate parses
blocks.ts so schema and registry cannot diverge silently. Live on
presacademy only; canonicalization here after Nathan's deployed
click-through. Known follow-up: canonical pageOps.ts:225 has a
type-only .commit error on PageOpsPatch that only astro check-gated
repos can see - fix at the next sync.

### 2026-08-28 (later): card 27 shipped broken, and what the log said

Undo reported success and changed nothing, three times, on deployed
presacademy. The full account is in card 27's postmortem; the short
version is that both causes were ours and neither was the one everyone
guessed.

The suspicion was that Presentation's optimistic actor was overwriting
our mutation. The transaction log for `drafts.pricingPage` refuted it
in about a minute: four transactions, one create carrying the tone, and
three undo writes whose only effect was to move `_updatedAt`. No
competing transactions at all. The undos landed; they wrote the
document back to itself.

Cause one: a create transaction's `revert` is `[]`, and
`applyPatch(doc, [])` returns the document unchanged, so the null test
that was supposed to mean "this created the draft" never fired. Cause
two: `@sanity/client`'s `_create` never forwards `options.transactionId`
into the request body (only `_mutate` does), so every id we minted was
dropped and our own writes were unrecognisable to us.

**The part worth carrying to every other card.** The unit tests were
green through all of it, because the fake built create-reverts as
`[0, null]` — the fixture encoded the same wrong assumption as the code.
A fake that agrees with the bug proves nothing. The fake is now faithful
in the three ways that mattered (empty revert on create, `_updatedAt`
moving on every write, caller transaction ids ignored), and
re-introducing cause one fails 8 tests instead of 0.

A third rule came out of it that is not a bug fix but a policy: an undo
that would not move anything other than `_updatedAt` is skipped in
favour of the next step back, so the feature cannot say "Change undone"
while the document stands still.

Both repos: 249 tests in the starter, 341 in presacademy, sync-check 30
SAME self / 19 SAME cross, no new tsc errors either side. The deployed
round trip - the actions rendering, multi-step undo against a real
server, and whether a whole-document write is safe beside the
optimistic actor - is in presacademy's `docs/PENDING.md`, along with
the leftover `drafts.pricingPage` fixture for Nathan to discard.
Ctrl+Z over the preview iframe stays a documented limitation.

### 2026-08-28 (later still): cards 29-29d canonicalized in the starter

The preview reliability and speed layer, built and proven on the deployed
presacademy Studio with measurements, brought here as canonical.

**Marked PORTABLE (14 files, byte-exact to presacademy apart from the marker
line):** `src/lib/preview-stega.ts`, `preview-text-diff.ts`,
`preview-text-nodes.ts`, `preview-live-draft.ts`, `preview-refresh.ts`,
`preview-morph.ts`, `preview-navigation.ts`, and each one's `.test.ts`. All seven
are pure: no DOM, no Sanity client, no repo names. `preview-morph` and
`preview-text-nodes` are written against minimal structural interfaces
(`MorphElement`, `TextLike`) precisely so they can be tested under `node:test`,
which has no DOM. 110 assertions came with them; the suites ported verbatim.

**Left per-repo (adapted, no marker):** `VisualEditingOverlay.tsx` (the scheduler
loop, the morph and fast-path branch, `noteInstantChange`, the bfcache
pagehide/pageshow handling), `overlay/useInstantText.ts`, `overlay/timing.ts`,
`LiveDraftBridge.tsx`, `PreviewNavigator.tsx`, `pages/preview/live.ts`,
`pages/preview/[...slug].astro`, `layouts/PreviewLayout.astro`. Each of those
either names this repo's own document types or wires into a surface whose shape
differs between sites.

**Two infra fixes travelled with them.** The `/preview/live` SSE leak: `send()`
throwing means the client went away MID-WRITE, so `cancel()` never fires; that
path used to set `open = false` and leave the read loop holding a live Sanity
listen open forever. It now closes AND aborts upstream, and `request.signal` is
wired as a third road out because it fires even while parked in `reader.read()`.
And `PreviewLayout.astro` now skips its chrome fetch when
`x-preview-soft-refresh` is present: the refetch consumes exactly `#main`, and
nothing inside `#main` reads `chromeSettings`, so the swapped HTML is
byte-for-byte what a full render produces while the render costs one fewer Sanity
round trip.

**The navigator's two-click bug is fixed here too.** The starter carried the same
sticky retry presacademy had: re-issue `navigate(sameHref)` every 750ms. That
could never work, because leaving `params.preview` at the value it already held
means Presentation's effect never re-runs and nothing is posted to the iframe.
`preview-navigation.ts` replaces it with a bounce-aware intent machine: hold the
intent THROUGH the match, watch for the flip back to the path we came from, and
re-issue on that flip - which is a real change to `params.preview`, so the host
effect does run. Capped at 4 attempts inside a 4s window.

**One real divergence.** presacademy's `useInstantText` reads the draft through
`overlay/useDraftDocument.ts`, which also carries `setAt`/`setInside`/`unsetAt`
and a `write()` for the card-28 in-canvas controls, and which imports a
`src/lib/sanity-path.ts` this repo does not have. The starter has no such
controls and only ever READS, so the single `getDocument().getSnapshot()` call
lives inside `useInstantText` itself and `useDraftDocument.ts` was not ported. If
card 28 is ever canonicalized here, that file arrives with it and the hook should
be rewired onto it.

**Nothing was skipped for want of a surface.** Everything on the list had an
equivalent in this repo, including the PreviewLayout chrome fetch (one here,
two on presacademy: this repo has no announcement bar).

**Verification:** `tsc --noEmit` 46 errors before and 46 after, all pre-existing
and all environmental (`cloudflare:workers`, `.astro` imports, the Sanity
`insertMenu` readonly-groups noise, and the known `pageOps.ts:225` `.commit`
type-only error card 28's entry already flags); `npm test` 249 -> 359, 0 fail;
`npm run lint` back to its pre-existing 1 error + 7 warnings, none in touched
files; `npm run build` clean; `page-parity compare` 10/10 PASS (this whole layer
is preview-only, so any parity movement would have been a bug); `sync-check`
self-check 44 SAME / 0 drift; `sync-check ../presacademy` 19 SAME / 0 drift.

**Why the cross-check does not list the new files, and what to do about it.**
`sync-check` walks the SITE repo for the marker, and presacademy's copies of
these fourteen do not carry it yet - that repo's session marked 19 other files
and stopped there. So the new cards are invisible to the cross-check until
presacademy adds the marker line, which is the first act of its next sync
session. Byte-identity was verified by hand in the meantime (each starter copy
diffed against presacademy's with the marker line stripped: identical, all
fourteen), so the moment the marker lands they report SAME with no reconciliation
needed.

**One deliberate oddity to leave alone.** `LIVE_DRAFT_MESSAGE` is `'pa:live-draft'`
in the canonical file and will stay that way everywhere. It is an arbitrary token
whose only job is to match at both ends of one repo's postMessage channel;
renaming it per repo would fork an otherwise identical file for nothing.

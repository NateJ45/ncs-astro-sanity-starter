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

Rows for repos that have adopted nothing still exist on purpose: a future sweep ticks
cells instead of inventing the table again.

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

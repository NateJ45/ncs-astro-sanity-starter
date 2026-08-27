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

| # | Card | wcp | presacademy | starter | reid-design-site | mas-monograms | 2ndpreschicago | ncs-church-starter | nixoncreativestudio |
|---|---|---|---|---|---|---|---|---|---|
| 1 | with-workerd build wrapper | yes | yes | yes | yes | yes | yes | yes | yes |
| 2 | free-dist prebuild unlock | yes | yes | yes | yes | yes | yes | yes | yes |
| 3 | page-parity harness | yes | yes | yes | yes | yes | yes | yes | yes |
| 4 | sanity-lib seed/patch plumbing | partial | yes | yes | yes | yes | yes | yes | n/a |
| 5 | stale-types CI guard | yes | yes | yes | yes | yes | yes | yes | n/a |
| 6 | Nightly Sanity backup workflow | yes | yes | no | yes | yes | yes | template | n/a |
| 7 | Uptime workflow | yes | yes | no | yes | yes | yes | template | yes |
| 8 | Playwright + axe + reflow suite | yes | yes | no | yes | no | no | no | no |
| 9 | contrast.ts + theme-token gate | partial | yes | yes | yes | yes | yes | yes | yes |
| 10 | Embedded-studio live-preview stack | yes | yes | no | no | no | no | no | no |
| 11 | Preview click interceptor | yes | yes | no | no | no | no | no | no |
| 12 | Parity-gated page-builder conversion | partial | yes | partial | no | no | no | no | no |
| 13 | react/react-dom exact pin | no | yes | no | no | no | no | no | no |
| 14 | wrangler legacy_env pin | no | yes | no | no | no | no | no | no |
| 15 | PENDING.md / TESTING.md docs registry | yes | yes | partial | yes | yes | yes | yes | yes |

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

**Status in the starter:** installed but **not wired**. The starter is Astro 6.3 /
adapter 13.5.5, which does not route the prerender through the vite plugin, so the crash
does not occur and the wrapper is a no-op safety net. It matters the moment this repo
takes the Astro 7 / adapter 14 upgrade. Wire it then:
`"build": "node scripts/with-workerd.mjs astro build"`.

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

**Therefore: Studio files never port blindly across this family.** This starter is on
Sanity **5** (studio package `sanity` ^5.28.0); WCP and presacademy are on **6**. A file
copied across that boundary compiles and then dies at browser runtime, which is also
where schema errors surface (they pass the build). Port the *pattern* from these cards,
then write the file against the target repo's actual major.

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

**Starter status:** carets today (`react` ^19.2.6), which is a live exposure the moment
this repo installs a package that pulls react. Pin on the Astro 7 upgrade at the latest.

## Card 14: wrangler legacy_env pin

**Dated 2026-08-25 (presacademy).** Gotcha, not a file.

`@astrojs/cloudflare` v14 writes `legacy_env: true` into the generated
`dist/server/wrangler.json`, and wrangler 4.126+ rejects that field outright ("no longer
supported"), so every `wrangler dev` / `deploy` against the generated config fails.
presacademy pins `wrangler` to `~4.110.0`. Revisit when a newer adapter stops emitting
the field.

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

**In this starter:** `PORTS.md` (this file) is the machine-checkable registry, backed by
`scripts/sync-check.mjs`. `docs/agent/changelog.md` stays the prose ledger. Something
that needs to be *checked* belongs here; something that needs to be *understood in
sequence* belongs there.

---

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

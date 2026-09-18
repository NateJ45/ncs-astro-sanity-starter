# New Project Setup Runbook

Read `CLAUDE.md` first, then work through this in order. Every step names its
gate: the command that has to pass before the next step is worth starting.

This is the single entry point for adapting the starter to a new client site.
The Foundation-vs-Safe-to-edit taxonomy in `CLAUDE.md` says which files you can
change freely and which need a planned session. Read that section before
touching anything in the Foundation list.

The companion pre-launch list is `docs/bootstrap/setup-checklist.md`. This
runbook is the order; that checklist is the sign-off. They are kept in sync, so
if one of them tells you something the other does not, the checklist is wrong
and this file is right.

---

## The order comes from a real build

The sequence below is the one the Stone Steps 50K site actually followed, not
an imagined ideal. That project was forked from this starter at 13:59 on
2026-09-07 and reached 276 commits by 2026-09-18. Three things about its first
day are worth knowing before you plan yours, because they set expectations that
are easy to get wrong in both directions.

**The first production deploy is hours away, not days.** Stone Steps forked at
13:59, had CI green by 14:57, ran its first successful production deploy at
20:30, turned the dataset backup schedule on at 20:36, and had visual regression
baselines green by 22:13. All of that was day one. If your first deploy is still
pending on day three, something is stuck and it is worth finding out what.

**The content model came before the design.** Within the first hour the schema
modelled the real subject and the results archive was imported. The pages were
built against real content the same afternoon. Every design pass after that was
judging something real.

**The identity pass came last, and it came twice.** The big visual work ran on
days two and three, and then again on 2026-09-17, ten days after the fork and
after the site had been live and full of real content for a week. Expect to
revisit the look once the content is in. Do not try to finish it up front.

One difference between then and now. Stone Steps wrote its own production deploy
workflow on day one, because the starter shipped none. It ships one now
(`.github/workflows/deploy.yml`), along with CI, Lighthouse, visual regression,
link health and the Sanity backup. That is one of the steps below you no longer
have to invent.

---

## Step 0 - Prerequisites

- **Node 22.12+** (`node --version`).
- **A GitHub repository** for the new project, created before you clone.
- **A Cloudflare account** at [dash.cloudflare.com](https://dash.cloudflare.com).
  The Workers free tier covers most projects.
- **A Worker name** you have chosen. The `name` field in `wrangler.jsonc` has to
  be globally unique across all Cloudflare accounts, and it becomes your
  `<name>.<account>.workers.dev` subdomain.
- **A Sanity account** at [sanity.io/manage](https://sanity.io/manage).

---

## Step 1 - Fork, install, and prove the baseline

```powershell
git clone https://github.com/your-org/ncs-astro-sanity-starter my-new-site
cd my-new-site
npm install
```

One package, one `node_modules`. The Sanity Studio lives in this repo and is
served at `/studio` by the site itself.

**Gate:**

```powershell
npm run build
```

This has to pass before you have a Sanity project. `sanityFetch` returns the
code-defined fallbacks when `PUBLIC_SANITY_PROJECT_ID` is absent, so every page
renders its default content and the build completes. If this fails on a fresh
clone, stop and fix it here. Nothing after this step gets easier.

---

## Step 2 - Subtract what this project does not need

Do this before the brand and before the content, while the surface is still
generic. Every later step is cheaper on a smaller site, and a capability you
remove later has already had copy written for it.

```powershell
npm run scaffold            # what can go
npm run scaffold -- --remove journal        # the plan, nothing changed
npm run scaffold -- --remove journal --write
```

Seven capabilities can be removed whole: `about`, `faq`, `journal`,
`philosophy`, `process`, `services`, `testimonials`. Each one is marked at every
place it registers, so one command takes out the schema, the routes, the
components, the desk structure, the three copies of the preview path map, the
doc-to-URL switch, the insert menu, the seed rows, the reserved slug and the
test route list together. Doing it by hand means finding it in about thirty
files, a dozen of which are generic registries that all have to agree, and a
missed one is a runtime error in the Studio that the build passes.

It is dry by default and never touches a Sanity dataset.

**Gate, after each removal:**

```powershell
npm run typegen
npm run check
npm run build
npm run test:unit
```

If you later add a capability of your own, it carries its scaffold markers in
the same commit. That is CLAUDE.md rule 14, and it is the one rule on that list
whose failure is silent.

---

## Step 3 - Point Sanity

**a) Create the project.** At [sanity.io/manage](https://sanity.io/manage),
create a project and copy the project ID.

**b) Fill `.env`.**

```powershell
Copy-Item .env.example .env
```

```
PUBLIC_SANITY_PROJECT_ID=your-project-id
PUBLIC_SANITY_DATASET=production
SANITY_API_READ_TOKEN=<Viewer token from manage.sanity.io -> API -> Tokens>
SANITY_API_WRITE_TOKEN=<Editor token, needed by the seed scripts>
SANITY_STUDIO_PROJECT_ID=your-project-id
SANITY_STUDIO_DATASET=production
SANITY_STUDIO_PREVIEW_URL=https://your-worker-name.your-account.workers.dev
```

**c) Allow your origins in Sanity CORS.** The Studio is embedded at `/studio` on
your own site, so it talks to the Sanity API from your origin. That origin has
to be on the allow list or the Studio loads and then fails to sign in.

```powershell
npx sanity cors add http://localhost:4321 --credentials
npx sanity cors add https://your-worker-name.your-account.workers.dev --credentials
```

Add the real domain too, once you reach Step 11.

**d) Set the preview secret.** The live draft preview reads drafts through a
Worker runtime secret, separate from the build-time values in `.env`.

```powershell
Copy-Item .dev.vars.example .dev.vars   # paste a Viewer token into it
npx wrangler secret put SANITY_TOKEN    # the same token, for production
```

Without it the public site is unaffected and the preview routes answer 503
naming what is missing.

**There is no separate Studio deploy.** The Studio is built by `astro build` and
published with the site, so a schema change reaches editors on your next deploy.
Do not run `npx sanity deploy`. Never click "Remove field" in the Studio: it
deletes that field's data across every document.

**Gate:** `npm run build` still passes, now fetching from the real project.

---

## Step 4 - Set identity and the Worker name

Three values, in three files, and all three are easy to forget until something
downstream reads the wrong one.

- `src/data/site.ts`: `name`, `studio`, `domain`, `url`, `storageKeyPrefix`,
  `themeStorageKey`, and the `brandColors` mirrors. `robots.txt` is generated
  from `url` at build time.
- `astro.config.mjs`: the `site:` key, set to the production URL. This drives
  the sitemap and canonical tags.
- `wrangler.jsonc`: the `"name"` field, set to the Worker name.

Set `url` and `site:` to the real production domain now, even though DNS does
not point there until Step 12. The canonical tags and the sitemap should be
right from the first deploy.

---

## Step 5 - Apply the brand

Inside Claude Code, the fastest path is the `/reskin` skill: it interviews you,
writes `brand/brand.config.json`, runs `apply-brand`, checks WCAG AA contrast,
and reports what still needs a human.

By hand, fill in `brand/brand.config.json` and then:

```powershell
npm install @fontsource/<family>     # BEFORE apply-brand, for any new face
npm run apply-brand
```

`apply-brand` rewrites the `@theme` tokens in `src/styles/globals.css`, the font
imports, `src/data/site.ts`, the Studio theme in `sanity.config.ts`, and the OG
generator inputs, then regenerates `public/og-default.png`. It does not install
font packages, and it does not run the build (rules 12 and 13).

Then drop in the real assets: `logo-light.*` and `logo-dark.*` in `src/assets/`,
and `public/favicon.svg`.

**Check for residue before you trust a default.** This starter was forked from a
client build, and four pieces of that client survived into it undetected until a
real project shipped them. Anything carrying a name, a colour or a logo needs
checking against the file list `apply-brand` touches. That is rule 11.

**Gate:**

```powershell
git diff
npm run build
```

Look at the diff. `apply-brand` is deterministic, so a surprise in it is a real
finding.

---

## Step 6 - Model the content before you design it

This is the step most likely to be done in the wrong order, and the one that
costs the most when it is. Stone Steps had its schema modelling the real subject
within half an hour of the fork, before a single design decision was revisited.

Two rules govern what goes in the schema:

- **Derive, do not store.** Anything computable from other data in the dataset
  is computed at build time, not given a field an editor can retype. Stone Steps
  stored race records as editable fields alongside the results archive that
  should have produced them, and the two drifted until five records on the board
  matched no result on file. That is rule 15.
- **No colour or surface fields on page-builder blocks.** The alternating
  cadence is owned by `SectionRenderer` through `src/lib/sectionCadence.ts`, and
  `src/lib/section-fields.test.ts` fails if a block ever declares one. That is
  rule 9, and it is a test rather than a convention.

If a new field is a dropdown whose exact value drives rendering, add its name to
`NON_STEGA_FIELDS` in `src/lib/cms-preview.ts` in the same commit. Miss it and
the block takes the wrong branch in the preview only, which is the hardest kind
of bug to notice (rule 8b).

**Gate, after any schema change:**

```powershell
npm run typegen
npm run build
```

`npm run build` does not chain typegen. `npm run build:full` runs both.

---

## Step 7 - Get real content in

Seed the singletons, then replace the placeholder text with real copy.

```powershell
npm run seed
```

This needs `PUBLIC_SANITY_PROJECT_ID` and `SANITY_API_WRITE_TOKEN` in `.env`. It
uses `createOrReplace` with deterministic ids, so re-running is safe. Its
sections are scaffold-marked, so a capability you removed in Step 2 is not
seeded.

If the project has an archive to import, import it now rather than later.
Building pages against real content is what turns a layout question into an
answerable one, and it is what surfaces the identity bugs in the data while
there is still time to fix them.

No em-dashes in site copy. Fill in `docs/brand/voice.md` with the client's tone
and vocabulary while the copy is fresh in your head: that file is what an agent
reads when it writes copy for this project later.

**Gate:** every core page renders real content, in both themes, at ~375px and
~1280px. `CLAUDE.md`'s visual verification workflow is the full list.

---

## Step 8 - Get CI and a production deploy green, the same day

The starter ships the workflows. What a fork supplies is credentials.

**a) Repository secrets and variables.** In GitHub, under Settings ->
Secrets and variables -> Actions:

- Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- Variables: `PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET`. These belong
  in variables, not secrets, because they are public: they appear in every GROQ
  request URL.

**Set the Sanity variables before you read a CI result.** This is the gate Stone
Steps hit on its first day and wrote down: CI has to build against the real
dataset, because a page whose content is absent renders as a hidden-section stub
rather than failing, and a green run against an empty dataset is telling you
nothing about three quarters of your site.

**b) First deploy.**

```powershell
npm run deploy
```

That is `npm run build` followed by `wrangler deploy -c dist/server/wrangler.json`.
A bare `wrangler deploy` reads the root `wrangler.jsonc`, which knows nothing
about the SSR entrypoint, and every sub-route 404s. After the first manual
deploy, `deploy.yml` takes over on every push to `main`.

**c) Open the deployed site in a real browser, including `/studio`.** A 200 is
not verification. `/studio` returns 200 with real HTML while being completely
broken at React mount. Read the console.

**d) Wire the publish webhook.** The site is statically built, so publishing in
Sanity changes the dataset and nothing else. `deploy.yml` listens for a
`repository_dispatch` of type `sanity-publish`, so the webhook goes from Sanity
to GitHub:

1. At manage.sanity.io -> your project -> API -> GROQ-powered Webhooks, create
   one named `Rebuild live site`, dataset `production`, POST, triggering on
   create, update and delete.
2. URL: GitHub's dispatches endpoint for the repo.
3. Header: `Authorization: Bearer <token>`. The word `Bearer` is load-bearing.
   Stone Steps ran for five days with the token alone in that header, GitHub
   answered 401, and Sanity reported only a failed attempt.
4. Projection: exactly `{"event_type": "sanity-publish"}`, matching
   `types: [sanity-publish]` in `deploy.yml`.
5. Filter: `!(_id in path("drafts.**")) && !(_type in ["media.tag", "sanity.imageAsset", "sanity.fileAsset", "sanity.assetSourceData"])`.
   A deny-list, so new content types are covered automatically.

**Testing it needs a real revision.** Writing a field's existing value back
leaves `_updatedAt` untouched and fires nothing, which is how a working webhook
gets misdiagnosed as broken. Change a value, publish, change it back, publish.
Then confirm a `repository_dispatch` run appeared and the deploy finished.

Note that `docs/agent/deployment.md` also describes a Cloudflare build-hook
route. That predates the shipped workflow. Use the workflow.

**e) Turn on the scheduled jobs you want.** `sanity-backup.yml` wants
`SANITY_AUTH_TOKEN` and `BACKUP_PASSPHRASE`. `lighthouse.yml` and
`link-health.yml` run on their own schedules.

**f) Generate the visual baselines, on CI.** `visual.yml` screenshot-diffs
`/styleguide` in both themes, and it is the only gate that catches a heading
rendered cream on cream or a card that lost its background. Font rasterisation
differs between Windows and the runners, so the baselines have to be generated
on CI: run the workflow by hand from the Actions tab with its `update` input
set, and it commits them. The suite skips itself on win32 with a printed reason
rather than failing locally. Refresh the baselines only when a visual change is
intended, and in the same change that causes it.

---

## Step 9 - Make the Studio the editor's product

The editor never sees your repository. They see `/studio`, and it is worth a
pass of its own rather than whatever the starter left there.

- Write the Studio guide documents for this client's actual job, in their
  vocabulary, not in a design studio's.
- Walk the desk structure and delete or rebuild panes that no longer apply after
  Step 2.
- Run `npm run audit:studio` for the machine-checkable part.
- Then sign in and click through it. A schema error passes the build and only
  appears at browser runtime, and several Studio faults are invisible to every
  gate in CI.

Invite the editor at manage.sanity.io under Members, and send them
`https://<your-site>/studio`. They need no development environment.

**Brief them on the rebuild model:** an edit goes live after a build, not on
save. With the webhook from Step 8 that is typically one to three minutes.

---

## Step 10 - The identity pass, now that the content is real

Only now. A design decision made against placeholder copy is a guess, and Stone
Steps re-did its heading system, its button family and its column alignment on
day ten, after the site had been live for a week.

The rule to hold while you do it is **one grammar per page** (rule 17): one
heading system, one left edge, one split for text-and-picture bands, one button
family. The failure mode is not an ugly section. It is a page where every
section is defensible and the whole reads as unfinished, and it comes from
per-call defaults nobody had to opt into. `SectionHeading.astro` takes an
`align` prop per call. Pick the page's grammar once.

**Gate for a change that is meant to be render-neutral:**

```powershell
npm run build
npm run parity compare
```

`npm run parity` never builds. Build first, then capture or compare. Baselines
live in `scripts/.parity/` and are committed, so a deliberate change is
recaptured and reviewed in the diff.

---

## Step 11 - Pre-launch

Run the full gate set, which is what CI runs:

```powershell
npm run check:full      # typegen, build, unit tests
npm run format:check
npm run lint
npm run check:links
npm test                # Playwright: smoke, axe light and dark, reflow
npm run parity compare
```

Then Lighthouse on the key pages. The target is 100/100/100/100 on desktop. When
a score drops, find out why before merging rather than after.

Then work through `docs/bootstrap/setup-checklist.md` end to end. It exists so
that the things with no gate behind them (a real favicon, a tested contact form,
no placeholder text anywhere, the editor actually able to sign in) get checked by
a person.

---

## Step 12 - Move the domain

Last, and on its own. Everything above is reversible; this is the morning that
is not.

```powershell
npm run cutover                                   # the plan, nothing else
npm run cutover -- --zone-file zone.txt           # plan plus the zone audit
npm run cutover -- --write --zone-file zone.txt
npm run cutover -- --verify                       # the outside checks
```

`scripts/cutover.mjs` takes a site from "the zone is not on Cloudflare" to "live
on its domain, with the mail intact": it finds or creates the zone, audits and
imports a registrar's zone export, attaches the Worker to the apex and to www as
custom domains, files the 301 from www, sets the TLS settings, and verifies the
result from outside. It is dry by default, idempotent, and every step says why it
is skipping when it is already done.

**Read the plan line by line before you pass `--write`.** The blast radius is a
client's live domain and their mail.

Two commands it deliberately prints rather than runs, both of which need a human:
`npx wrangler email sending enable <domain>` (a beta command with no stable API
behind it) and `npx sanity cors add https://<domain> --credentials` (needs the
interactive Sanity login). Skip the second and the embedded Studio loads on the
new origin and then fails every request, which looks like a broken build rather
than a missing CORS entry.

Full detail is in PORTS.md card 48 and `docs/agent/deployment.md`.

After the move: add the real origin to Sanity CORS, update
`SANITY_STUDIO_PREVIEW_URL`, confirm `/sitemap-index.xml` and `/robots.txt` name
the real domain, and submit the sitemap to Google Search Console.

---

## What not to casually edit

Before changing any Foundation file, read the Foundation-vs-Safe-to-edit
taxonomy in `CLAUDE.md`. The ones that most often look harmless:

- `src/styles/globals.css` beyond the design-seam tokens (polish-layer
  utilities, shadcn overrides, base resets)
- `src/layouts/BaseLayout.astro` (anti-FOUC script, scroll wiring, Lenis init)
- `src/lib/sanity.ts` (the `isSanityUnconfigured` guard is load-bearing for
  fresh-clone builds)
- `src/sanity/schemaTypes/*.ts` (field changes reach existing content)
- `src/lib/queries.ts` and `src/lib/sanity.types.ts`
- `astro.config.mjs`, `wrangler.jsonc`, `package.json`
- `public/_headers` (security headers)
- Any file whose first line reads `PORTABLE: canonical copy`. Editing one of
  those changes the whole site family's copy, so the change has to be general,
  and it gets a note on its PORTS.md card.

The `src/components/ui/` shadcn primitives are Foundation too. If you reinstall
one via `npx shadcn add`, reapply the customizations documented in `CLAUDE.md`,
notably the `accordion.tsx` changes.

---

## Modules

Modules are opt-in routes staged under `modules/`, separate from the scaffold
capabilities in Step 2. There are two: `events` and `resources`. Eleven others
moved to `archive/modules/` on 2026-09-18 because, measured across the whole
family, one repo has ever enabled a module and it uses exactly those two.

If you need one, read `docs/modules/README.md` and then that module's own guide,
and follow its numbered steps in full. Two are easy to skip: registering the
schema in `src/sanity/schemaTypes/index.ts`, and adding the module's query
functions to `src/lib/queries.ts`. A module that comes back from `archive/` has
not type-checked since it was set down, and carries its own scaffold markers from
its first commit again.

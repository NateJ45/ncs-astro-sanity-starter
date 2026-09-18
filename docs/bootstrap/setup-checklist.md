# Pre-Launch Checklist

Work through this before the domain moves. Every item is checked off or
explicitly deferred with a reason.

This is Step 11 of `docs/bootstrap/NEW-PROJECT.md`, which is the order of work.
This file is the sign-off, and it deliberately carries the items that have no
gate behind them. The two files are kept in sync; if they disagree, the runbook
is right and this one needs fixing.

---

## Environment and secrets

- [ ] `.env` contains real values for `PUBLIC_SANITY_PROJECT_ID` and
      `PUBLIC_SANITY_DATASET`
- [ ] `SANITY_API_READ_TOKEN` set in `.env` locally
- [ ] `SANITY_API_WRITE_TOKEN` set in `.env` locally (the seed scripts need it;
      never expose it as a public var)
- [ ] `SANITY_TOKEN` set as a Worker secret, so the live draft preview works:
      `npx wrangler secret put SANITY_TOKEN`, and in `.dev.vars` locally
- [ ] `PUBLIC_WEB3FORMS_KEY` set if the contact form posts to Web3Forms
- [ ] `PUBLIC_CALENDLY_URL` set if the discovery call embed is used
- [ ] `PUBLIC_CF_ANALYTICS_TOKEN` set if Cloudflare Web Analytics is wanted
- [ ] `SANITY_STUDIO_PREVIEW_URL` set to the production URL
- [ ] No placeholder values remain in `src/data/site.ts` (`name`, `studio`,
      `domain`, `url`, `storageKeyPrefix`, `themeStorageKey`, `brandColors`)
- [ ] `astro.config.mjs` `site:` set to the production URL, including `https://`
- [ ] `wrangler.jsonc` `"name"` set to the Worker name for this project

---

## GitHub Actions

- [ ] Repository **secrets** set: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- [ ] Repository **variables** set: `PUBLIC_SANITY_PROJECT_ID`,
      `PUBLIC_SANITY_DATASET`. These are variables, not secrets: they are public
      and appear in every GROQ request URL
- [ ] CI is green against the REAL dataset. A green run against an empty dataset
      proves nothing, because a page with no content renders as a
      hidden-section stub instead of failing
- [ ] `deploy.yml` has deployed `main` at least once on its own, not only from a
      laptop
- [ ] Visual baselines generated ON CI (never on Windows: font rasterisation
      differs) via the `visual.yml` workflow's `update` input, and committed
- [ ] `sanity-backup.yml` credentials set (`SANITY_AUTH_TOKEN`,
      `BACKUP_PASSPHRASE`) and its schedule enabled, or the decision to skip it
      written down

---

## Scaffold and modules

- [ ] `npm run scaffold` reviewed, and every capability this project does not
      need removed with `-- --remove <name> --write`
- [ ] `npm run typegen && npm run check && npm run build && npm run test:unit`
      green after the last removal
- [ ] Any capability added for this project carries its scaffold markers
      (CLAUDE.md rule 14)
- [ ] If a module is enabled: its guide followed end to end, including
      registering the schema in `src/sanity/schemaTypes/index.ts` and adding its
      query functions to `src/lib/queries.ts`
- [ ] Every enabled module's routes load without errors

---

## Sanity project

- [ ] Sanity project created at manage.sanity.io
- [ ] Content editor invited at manage.sanity.io -> project -> Members
- [ ] Sanity CORS allows every origin the Studio runs on:
      `npx sanity cors add https://<origin> --credentials` for localhost, the
      `.workers.dev` URL and the real domain
- [ ] Core content seeded (`npm run seed`) and real copy in place, with no
      starter placeholder text visible in the Studio or on any page
- [ ] `npm run typegen` run after the final schema state, and the regenerated
      types committed
- [ ] Site redeployed after the final schema state. That deploy is what
      publishes the Studio's schema, because the Studio ships with the site
- [ ] Studio URL shared with the editor and confirmed accessible by them
- [ ] `npm run audit:studio` run, and the Studio clicked through while signed in
      (a schema error passes the build and only appears at browser runtime)
- [ ] No computable value is stored as an editable field (CLAUDE.md rule 15).
      If a number can be derived from other data, it is derived
- [ ] Any new logic-driving dropdown field is listed in `NON_STEGA_FIELDS` in
      `src/lib/cms-preview.ts`

---

## Design and content

- [ ] Logo files (`logo-light.*`, `logo-dark.*`) in `src/assets/` are this
      client's, not the starter's
- [ ] `public/favicon.svg` replaced
- [ ] `public/og-default.png` regenerated (`npm run og`) with real brand colours
      and tagline
- [ ] Per-page OG variants generated if wanted (`npm run og:pages`)
- [ ] No starter or forked-client residue anywhere: names, colours, logos or
      seeded copy from another project (CLAUDE.md rule 11)
- [ ] No em-dashes in any site copy
- [ ] `docs/brand/voice.md` filled in with this client's tone and vocabulary
- [ ] One grammar per page (CLAUDE.md rule 17): one heading system, one left
      edge, one split for text-and-picture bands, one button family. Checked by
      scrolling whole pages, not by reviewing sections

---

## Domain, Worker and routing

- [ ] `npm run cutover` dry run read line by line, and its plan agreed
- [ ] Zone export from the old registrar obtained and passed with `--zone-file`,
      so mail records are audited rather than guessed
- [ ] Rollback path identified and TTLs lowered before the move
- [ ] After `--write`: `npm run cutover -- --verify` passes
- [ ] The two commands cutover deliberately leaves to a human are done:
      `npx wrangler email sending enable <domain>` and
      `npx sanity cors add https://<domain> --credentials`

---

## Crawlers and discoverability

- [ ] `src/data/site.ts` `url` is the production domain. `robots.txt` is
      generated from it at build time by `src/pages/robots.txt.ts`, so there is
      no static `public/robots.txt` to edit
- [ ] `public/llms.txt` updated if major pages changed
- [ ] `/sitemap-index.xml` on the deployed site lists the right pages under the
      right domain
- [ ] Nothing private is in the sitemap. `/preview/**` and `/studio` are
      excluded already
- [ ] Sitemap submitted to Google Search Console after the domain move

---

## Analytics

- [ ] `PUBLIC_CF_ANALYTICS_TOKEN` set if cookieless analytics are wanted; omit
      the token to skip the beacon entirely
- [ ] Confirmed no cookie consent banner is needed (Cloudflare Web Analytics is
      cookieless)

---

## Quality gates

Each of these is a command, so none of them is a judgement call.

- [ ] `npm run check:full` green (typegen, build, unit tests)
- [ ] `npm run format:check` green
- [ ] `npm run lint` green
- [ ] `npm run check:links` green
- [ ] `npm test` green (Playwright: smoke, axe light and dark, reflow, on
      chromium and a WebKit iPhone profile)
- [ ] `npm run parity compare` green, or every difference deliberate and the
      baselines recaptured in the same change
- [ ] Lighthouse 100/100/100/100 on desktop for the key pages. A dropped score
      is explained before launch, not after
- [ ] Every core page checked in both light and dark mode at ~375px and ~1280px
- [ ] `/studio` opened in a real browser with the console read. A 200 response
      is not verification
- [ ] Contact form tested end to end, with a submission that actually arrives
- [ ] Calendly embed loads and is interactive, if `PUBLIC_CALENDLY_URL` is set

---

## Rebuild and publish pipeline

- [ ] Sanity GROQ webhook created, POSTing to GitHub's dispatches endpoint for
      this repo with a projection of exactly `{"event_type": "sanity-publish"}`
- [ ] Its `Authorization` header reads `Bearer <token>`. Without the word
      `Bearer`, GitHub answers 401 and Sanity reports only a failed attempt
- [ ] Deny-list filter applied:
      `!(_id in path("drafts.**")) && !(_type in ["media.tag", "sanity.imageAsset", "sanity.fileAsset", "sanity.assetSourceData"])`
- [ ] Webhook tested with a REAL revision. Writing a field's existing value back
      leaves `_updatedAt` untouched and fires nothing, which is how a working
      webhook gets misdiagnosed as broken. Change a value, publish, change it
      back, publish
- [ ] A `repository_dispatch` run appeared, deployed, and the change is visible
      on the live site
- [ ] Team briefed on the rebuild model: edits go live after a build, not on
      save, typically one to three minutes later

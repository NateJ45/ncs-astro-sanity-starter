# NCS Astro + Sanity Starter — Operations Playbook

Tactical reference for common tasks. `CLAUDE.md` is the architecture and design reference; this file is the "how do I actually do X" guide.

If you are a future Claude session and you can only read one doc, read `CLAUDE.md`. This file is the second one to open when you need to do something specific (deploy, patch, audit, regenerate).

---

## Design directions (before a reskin)

For a new client, do not go straight to `/reskin`. Order: brief, references, design-directions, reskin.

1. Fill `docs/templates/design-brief.md` and split it into `PRODUCT.md` and `DESIGN.md` at the repo root.
2. `npm run references -- https://site-one.example https://site-two.example` screenshots each at 390 and 1280 into `docs/references/<slug>/` and writes `docs/references/README.md`; fill the "what we like / what we avoid" columns by hand (re-runs keep them). Or list URLs in `docs/references/references.json` and run it with no arguments. First run needs `npx playwright install chromium`.
3. Run `/design-directions`. It writes 3 or 4 mockups and an `index.html` into `docs/design-directions/<date>-<slug>/`, runs `npm run directions:shoot -- <that folder>` (390/768/1280 into `shots/`), and asks you to pick. The pick is recorded as a dated entry in that folder's README.
4. Run `/reskin`; it reads the pick.

Rules and what each directions run must contain: `.claude/rules/design-flow.md`.

---

## Reskin (apply a new brand identity)

The primary path for adapting this starter to a new client is the `/reskin` skill. It interviews you for brand inputs, writes `brand/brand.config.json`, runs `npm run apply-brand`, checks contrast, and screenshots the result.

**Quick start with the skill:**

1. Open a Claude session in this repo and type `/reskin` (after the design-directions step above, for a new client).
2. The skill interviews you for business name, domain, tagline, palette, and fonts.
3. It fills `brand/brand.config.json` and runs `npm run apply-brand`.

**Font packages first.** `apply-brand` cannot install font packages. If you are changing fonts, install the `@fontsource` packages before running `apply-brand` or the build will fail:

```bash
npm install @fontsource/your-display-font @fontsource-variable/your-body-font
```

**Manual path (no skill session):**

1. Edit `brand/brand.config.json` with your brand values.
2. Install any new font packages (see above).
3. Run `npm run apply-brand` — deterministically rewrites `globals.css` tokens, `src/data/site.ts`, Studio theme props, and OG generator inputs, then regenerates `public/og-default.png`.
4. Run `npm run build` to verify nothing broke.

The shipped `brand/brand.config.json` encodes the neutral starter defaults, so `npm run apply-brand` on a fresh clone is a no-op. The OG image is non-deterministic (node-canvas rendering) and re-running produces a visually identical but byte-different file.

**Layout (structure) is a second config axis.** The `layout` block in `brand/brand.config.json` picks `header` (inline, centered, minimal), `hero` (bleed, split, editorial), `density` (standard, airy, tight) and `cards` (standard, outline, soft). The first value of each is the original layout and the default; `apply-brand` writes `src/data/layout.ts` and the rest is CSS and one component prop. To try a variant: set it in the config, `npm run apply-brand`, `npm run build`, look at `/` at 390 and 1280. `/styleguide/layouts/` (noindex) shows every variant side by side with fixed data. Detail: `docs/brand/brand-system.md`, rule 18 in `.claude/rules/brand-reskin.md`.

Full reference for the brand config shape, what `apply-brand` rewrites, and the `/reskin` skill's 8-step flow: `docs/brand/brand-system.md`.

---

## Enabling a module

Modules live under `modules/<name>/` and are off by default. Enabling one is a copy-and-register operation:

1. **Copy the module folder into the core dirs:**
   - `modules/<name>/studio/*` into `src/sanity/schemaTypes/` (schema files)
   - `modules/<name>/src/pages/*` into `src/pages/` (route files)
   - `modules/<name>/src/components/*` into `src/components/` (components)
   - The co-located query file `modules/<name>/src/lib/<name>Queries.ts` into `src/lib/` (GROQ queries). Nine of the ten modules ship a query file here. The `newsletter` module is the exception: it has no dedicated route or query file and is enabled by reading its `README.md` and embedding the component directly.

2. **Register the schema** in `src/sanity/schemaTypes/index.ts` and add the type to `src/sanity/structure.ts`.

3. **Wire navigation** — add the route to `Header.astro`'s `NAV_ITEMS` and to the footer links.

4. **Flip the visibility toggle** in Sanity Studio → Site Settings → Section visibility to enable the module's sections on the live site.

The co-located query file pattern means no hand-pasting of query functions into core `queries.ts`. Per-module guides are in `docs/modules/`.

After enabling, run `npm run typegen`, then rebuild. The Studio is embedded at `/studio` and ships with the site build, so there is no separate Studio deploy.

---

## Editing page content (section-driven pages)

The four core pages (home, about, services, process) and any custom `page` document render from a `pageBuilder` array in Sanity Studio. Editors add, reorder, and remove blocks without touching code.

**On a fresh clone with no Sanity project configured:** the site renders from code-defined defaults in `src/data/defaultSections.ts`. These defaults look like a real site, not blank pages.

**Once a Sanity project is connected:** seed the pages with `npm run seed`, then edit sections in Studio → the relevant page singleton → the "Sections" tab.

**Available block types:** the twelve general blocks (heroSection, richTextSection, imageTextSection, gallerySection, quoteSection, statSection, ctaBandSection, videoSection, spacerSection, logoStripSection, embedSection ("Custom code or embed", card 121), rsvpSection (card 127)) plus the page-specific rich blocks (founderSection, servicesGridSection, testimonialsSection, processSection, faqSection, teamSection on Home; storySection, valuesSection, faqSection, teamSection on About; servicesGridSection, serviceAreaSection, guaranteeSection, faqSection on Services; processSection, faqSection on Process).

Blocks carry no background color field. `SectionRenderer` owns the alternating surface cadence automatically.

---

## Schema-change procedure

Any change to `src/sanity/schemaTypes/` must follow this sequence before committing:

1. Edit the schema file in `src/sanity/schemaTypes/`.
2. Run the gate. `npm run check` is the fast half (`astro check` + eslint) and
   `npm run check:full` is typegen, the build (which includes the embedded Studio) and
   the 432 unit tests. Add `npm run format:check`, `npm run check:links` and `npm test`
   (the Playwright suites: smoke, axe light, axe dark, reflow, on chromium and WebKit)
   for the whole thing, which is exactly what CI runs. Fix any failures before
   continuing. If the change could alter rendered markup, also run
   `npm run parity compare`.
   2b. If you added a dropdown/radio field whose exact value drives rendering, add its name to `NON_STEGA_FIELDS` in `src/lib/cms-preview.ts` in the same commit. Miss it and the block renders the wrong branch in the live preview only.
3. Commit the schema file AND the regenerated `src/lib/sanity.types.ts` together.
4. Deploy the site (`npm run deploy`). The Studio is embedded, so deploying the site publishes the schema with it; there is no separate Studio deploy step. Until the deploy lands, the live Studio shows "unknown fields" next to a "Remove field" prompt. **Never click "Remove field"** -- it deletes that field's data across every document, and it cannot be undone without a dataset restore.

---

## Deploy

The site is `output: 'static'` + `@astrojs/cloudflare` adapter. Two paths:

### Auto-deploy via GitHub → Cloudflare

This is the normal path. `main` is the only long-lived branch and it is production: work on a short-lived branch, open a PR into `main`, wait for the required `build` and `test` checks to go green, then merge. The merge is the production deploy. (2026-10-03: staging abandoned; main is the only branch.)

```bash
git switch -c fix/short-description
git add -A
git commit -m "..."
git push -u origin fix/short-description
gh pr create --base main
```

Once the PR merges, Cloudflare detects the push to `main`, runs `npm run build` in their CI, and deploys the resulting `dist/` to the Worker. Takes about 1 to 2 minutes. Watch in the Cloudflare dashboard under Workers → [your-worker-name] → Deployments.

**Verify a deploy landed:**

```bash
# Wait until a specific marker is in the live HTML, then continue
until curl -s "https://your-worker.workers.dev/?cb=$(date +%s)" | grep -q 'SOMETHING_FROM_THIS_BUILD'; do sleep 5; done
echo "deploy live"
```

Use `until ! grep -q '...'` (with the bang) when waiting for something to be **removed** from the HTML — `until grep -qv` doesn't do what it looks like.

### Manual deploy

```bash
npm run deploy
# = npm run build && wrangler deploy
```

Only needed if you're testing a config change locally before committing, or if the auto-deploy webhook is broken.

### Sanity → Cloudflare deploy hook

The site is fully prerendered, so a Sanity content edit doesn't change the live HTML until a rebuild. A Sanity webhook is configured and hits a Cloudflare deploy hook. The flow:

1. Editor publishes a document in Sanity Studio
2. Sanity POSTs to the Cloudflare deploy hook
3. Cloudflare rebuilds + deploys in about 1 to 2 minutes
4. New content is live

If a content change isn't appearing on the live site after a few minutes:

- Check the webhook fired (Sanity Studio → Manage → API → Webhooks)
- Check the Cloudflare deploy hook is configured (Workers → Settings → Triggers → Deploy hooks)
- Try a manual `git push` to force a rebuild

### Rebuild webhook filter (recommended)

The webhook lives at manage.sanity.io → API → Webhooks. The recommended GROQ filter is a deny-list:

```
!(_id in path("drafts.**")) && !(_type in ["media.tag", "sanity.imageAsset", "sanity.fileAsset", "sanity.assetSourceData", "previewShare", "privatePage", "linkReport"])
```

This filter skips rebuilds triggered by draft saves and internal Sanity asset-management events (tagging an uploaded photo, rotating an image, etc.), which don't affect live HTML. New content types are covered automatically because the filter excludes only the named system types and lets everything else through. The old hand-maintained allow-list approach (explicitly listing every `_type` that should trigger a rebuild) silently dropped new types until a developer remembered to add them. The deny-list is safer: add a new schema type and it triggers rebuilds out of the box.

If the webhook currently has no filter or uses an allow-list, replace the filter with the deny-list above and save. No other webhook config changes are needed.

### Phased launch: turning sections on and off

The site has a section visibility system that lets you launch now and finish sections later, without leaving half-built pages on the live site.

**How to turn a section off:**

1. Open the Studio and click "Site Settings" in the left sidebar.
2. Click the "Section visibility" tab at the top of the document.
3. Find the toggle for the section you want to hide.
4. Flip it off.
5. Click the blue Publish button.
6. The site rebuilds in about 1 to 3 minutes. Once live, the section disappears from the menu, footer, homepage, and its own page redirects visitors to the home page instead.

**Important notes:**

- An unset toggle is the same as ON. You only see a change when you explicitly flip something to off and publish.
- Turning a section off does not delete or unpublish any content. All drafts and published documents are untouched. Turn the toggle back on and everything reappears after the next rebuild.
- Core pages (Home, About, Services, FAQ, Contact, Journal, Privacy, 404) are not toggleable and are always live.
- Detail pages for a toggled-off section (like `/portfolio/[slug]`) also disappear. The build skips generating those pages entirely, so they 404 cleanly.

**Why this is useful:** lets you launch the site while a section is still being built, without pressure to finish everything at once.

### Scheduled publishing

Sanity supports scheduling a document to go live at a future date and time.

**How to schedule a publish:**

1. Open the document you want to schedule.
2. Click the small arrow (chevron) to the right of the blue Publish button in the bottom bar.
3. Choose "Schedule publish" from the menu.
4. Pick the date and time. Times are local to your browser.
5. Click "Schedule." The document moves to a "Scheduled" state.

The live site rebuilds automatically when the scheduled publish fires. You can see, edit, or cancel scheduled items by going back to that document before the time fires.

**Note:** as of May 2026, the `@sanity/scheduled-publishing` plugin is incompatible with this Studio's React 19 dependency. Use the built-in document actions scheduling path above until the plugin is updated.

### Field comments

Sanity Studio includes a built-in Comments feature (the speech-bubble icon that appears next to field labels when you hover). Available by default in Sanity v5, no plugin or config needed.

**How to use it:**

1. Hover over any field label in a document.
2. Click the speech-bubble icon.
3. Type a question or note and click Submit.

Comments stay attached to the specific field until resolved. Comments do not affect published content in any way.

### Visitor numbers (Home's Visitors card, PORTS.md card 115)

Home's Visitors card reads Cloudflare Web Analytics through `/api/studio/visitors/` (signed-in Studio members only).
Until the Worker has three settings, the card says "Not set up yet". Once per site:

1. **Turn on Web Analytics** for the site if it is not already (Cloudflare dashboard, Analytics & Logs, Web Analytics,
   Add a site). The beacon token it shows goes in `PUBLIC_CF_ANALYTICS_TOKEN` as before; that is NOT the site tag.
2. **Find the site tag.** Open the site in Web Analytics: the address bar ends in `siteTag~in=<32 characters>`. That
   value is the site tag. (Or, with the token from step 3:
   `curl -H "Authorization: Bearer <token>" https://api.cloudflare.com/client/v4/accounts/<account id>/rum/site_info/list`
   and read `site_tag`.)
3. **Create the read-only token.** Cloudflare dashboard, top-right profile menu, My Profile, API Tokens, Create Token,
   then "Create Custom Token" (Get started):
   - Token name: `<site> Studio visitors (read only)`.
   - Permissions: one row, **Account**, **Account Analytics**, **Read**. Nothing else.
   - Account Resources: Include, the account the site is on.
   - Leave IP filtering and TTL empty. Continue to summary, Create Token, and copy the token (it is shown once).
4. **Give it to the Worker as a secret** (it never goes in the repo or in chat). From the site repo:
   `npx wrangler secret put CF_ANALYTICS_TOKEN` and paste it at the prompt. Keep a copy in 1Password.
5. **Add the two plain values** to `wrangler.jsonc` `vars` (they are not secret): `"CF_ACCOUNT_ID"` (the account id,
   on the dashboard's account home or from `npx wrangler whoami`) and `"CF_WEB_ANALYTICS_SITE_TAG"` (step 2). Both are
   32 hex characters; anything else is ignored.
6. Deploy (`npm run deploy`, or merge to `main`), open `/studio`, and check the Visitors card shows numbers. It caches
   for ten minutes per Worker instance. "Could not load just now" means Cloudflare refused: check the token's permission
   and the account id first (`npx wrangler tail` shows `visitors: Cloudflare answered <status>`).

Numbers are Cloudflare's sampled estimates, by UTC day; visits to `/studio`, `/preview` and `/api` are left out of the
most-read list. To rotate the token, create a new one, `secret put` it, then delete the old one in the dashboard.

Since card 136 the card can read **Google Analytics 4** instead (for sites that count with GA4), and a Search
Console card can sit under it, both through the studio-status Worker (`SITE_DATA` binding). Setup: `docs/agent/studio-kit.md`, "Google Analytics and Search Console".

Since card 123 the sources include **AI assistants** (ChatGPT, Perplexity, Copilot, Gemini, Claude and similar) with a
this-week and week-before count. Nothing to set up: it comes with the same token.

### Writing help (the Studio's "Suggest" buttons, PORTS.md card 123)

The "Suggest" buttons under the Google description, photo description and summary fields, and "Improve this
paragraph" in rich text, call `/api/studio/ai/`, which asks the Claude API. Until the Worker has the key the buttons do
not appear at all. Once per site:

1. **Make an API key** at console.anthropic.com (Settings, API Keys, Create Key), named for the site
   (`<site> Studio writing help`), in a workspace used for nothing else so its spend is easy to read.
2. **Set a spend limit** on that workspace (Settings, Limits): a monthly cap of a few dollars is plenty. Rough cost:
   a Google description or summary is about a tenth of a cent (Claude Haiku 5.5), a photo description under a cent
   (Claude Sonnet 5.5, the picture sent at 800px). Every request has a hard token cap, and each person gets at most 30
   suggestions an hour (per Worker instance), so even a busy week of editing stays well under a dollar.
3. **Give it to the Worker as a secret** (never in the repo or in chat). From the site repo:
   `npx wrangler secret put ANTHROPIC_API_KEY` and paste it at the prompt. Keep a copy in 1Password.
4. Optional: a different hourly limit per person as a plain var in `wrangler.jsonc` `vars`: `"AI_HOURLY_LIMIT": "20"`.
5. Deploy, open `/studio`, open a page, and check "Suggest a Google description" appears under its description. Press
   it once to see a suggestion arrive. `npx wrangler tail` shows `studio-ai: seo: suggested` (only the task and the
   outcome are ever logged, never the words). "Writing help did not answer" with `Claude API answered 401` in the tail
   means the key is wrong; `429` means the spend limit or the account's rate limit.

To switch it off, `npx wrangler secret delete ANTHROPIC_API_KEY`; the buttons disappear on the next Studio load. To
rotate the key, make a new one, `secret put` it, then delete the old one in the console.

### Studio deploy

There isn't one. The Studio is **embedded at `/studio`** and built by `astro build`, so
deploying the site deploys the Studio. That is deliberate: a separately-deployed Studio
only updates when someone remembers to push it, and silently falls behind while pointing
at the same production data.

**Do not run `npx sanity deploy`.** It would publish a standalone Studio at
`<studioHost>.sanity.studio` and recreate exactly that split. `sanity.cli.ts` omits
`studioHost`/`deployment` to make it hard to do by accident.

Always run `npm run typegen` after schema changes so `src/lib/sanity.types.ts` is fresh,
then commit both files together. CI fails the build if the committed types are stale.

For the complete schema-change sequence, see the "Schema-change procedure" section above.

---

## Custom code and site-wide code (PORTS.md card 121)

The "Custom code or embed" block runs pasted code in its own box: an `srcdoc` iframe sandboxed WITHOUT
`allow-same-origin`, so it cannot read the site's cookies or localStorage (where the embedded Studio keeps an editor's
session) or touch the page. Two opt-outs run code directly on the page: the block's "Runs directly on the page" switch,
and Site settings' "Code on every page" (head and end of body, public pages only, never `/studio` or `/preview`).
Both are listed by the Checkup while in use. Trust model: `docs/agent/custom-code.md`.

- **An editor's widget does not work in the box.** Read the Studio's yellow warning first: `document.cookie`,
  `localStorage`, `top.location` or `parent.` are blocked in the box. Ask for a version without them before
  reaching for the switch. Turn the switch on only for a provider you trust, and only after reading the code.
- **Fonts in the box look wrong.** Check `/_astro/*` answers `Access-Control-Allow-Origin: *` under
  `npm run preview` (public/_headers). `npm run dev` never sends it, so system fonts there are expected.
- **Auditing what runs on the page.** Studio, Checkup: "Code that runs directly on the page" names every page; "Code on
  every page" opens Site settings at the field. Or GROQ:
  `*[count(pageBuilder[_type == "embedSection" && runsOnPage == true]) > 0]{_id, title}` (use the field name your
  page types use for sections).
- **Proof the box holds.** `tests/custom-code.spec.ts` stores a secret in the page's localStorage and checks the
  boxed probe on /styleguide/sections/ reports `parent-dom:blocked storage:blocked cookie:blocked`, while the on-page
  probe can read it.

## Email: the newsletter, RSVPs and form mail (PORTS.md card 127)

One sender for everything the site emails (`src/lib/mail-send.ts`), one database for everything people send it
(`CONTACT_DB`). Until it is set up, the sign-up box hides itself (or shows its fallback link), the RSVP form says
"RSVPs open here soon", and the Studio's Newsletter card and buttons say "not set up yet". Nothing breaks.

**1. The database** (skip if the forms already have one):

```powershell
npx wrangler d1 create <site>-contact
npx wrangler d1 migrations apply <site>-contact --remote
```

Paste the returned `database_id` into the `d1_databases` block in `wrangler.jsonc` and uncomment it. Locally:
`npx wrangler d1 migrations apply <site>-contact --local -c dist/server/wrangler.json` after a build.

**2. Pick a provider.**

- **Resend** (works before the client's domain is on Cloudflare). Make a free Resend account (100 emails a day,
  3,000 a month), verify a domain you control (a subdomain such as `mail.<your-domain>` is fine: Resend shows an SPF
  TXT, a DKIM TXT and an MX for bounces to add at that domain's DNS), make an API key with "Sending access" only, then
  `npx wrangler secret put RESEND_API_KEY`. `MAIL_FROM` must be an address on the verified domain. When the client's
  own domain arrives, verify it in Resend too and change `MAIL_FROM`.
- **Cloudflare Email Sending** (Workers Paid, domain on Cloudflare DNS): `npx wrangler email sending enable <domain>`
  (writes SPF and DKIM under a `cf-bounce` subdomain, so it sits beside Microsoft 365 or Google Workspace), then
  uncomment `"send_email": [{ "name": "EMAIL" }]` in `wrangler.jsonc`. Sends to any address count against the plan's
  quota; check it before a large list.
- Both set up? `MAIL_PROVIDER` (a var: `cloudflare` or `resend`) says which; unset, Cloudflare wins.

**3. The settings.**

```powershell
npx wrangler secret put MAIL_SECRET    # 32+ random characters; signs confirm and unsubscribe links
npx wrangler secret put MAIL_FROM      # e.g. news@<verified domain> (or a var; falls back to CONTACT_FROM)
```

Optional vars: `MAIL_FROM_NAME` (defaults to the site's name), `MAIL_REPLY_TO` (where replies to RSVP confirmations go;
defaults to `CONTACT_TO`). Make a secret with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
Changing `MAIL_SECRET` later breaks every unsubscribe link already sent: do not rotate it casually.

**4. DNS notes.** Keep DMARC at `p=none` until every service that sends as the domain has DKIM; a stricter policy first
makes ordinary mail fail. Gmail and Yahoo want SPF or DKIM aligned with the From domain, a working one-click unsubscribe
(the List-Unsubscribe headers are sent) and a complaint rate under 0.3%; double opt-in keeps that low.

**5. Check it.** Deploy, sign up on the live site with your own address, press the link, then
`npx wrangler d1 execute <site>-contact --remote --command "SELECT email, status FROM subscribers"`. In the Studio, open a
published Newsletter and press "Send a test to me". For RSVPs, reply to a test event and look in the RSVPs tool.

**Locally:** `npm run build`, add the `d1_databases` and `send_email` blocks to `dist/server/wrangler.json`, put
`MAIL_FROM`, `MAIL_SECRET`, `CONTACT_TO` and `MAIL_TEST_FIXTURES=1` in `dist/server/.dev.vars`, apply the migrations
with `--local -c dist/server/wrangler.json`, `npm run preview`. The local binding writes each email to a file under
`dist/server/.wrangler/tmp/email/` instead of sending it, and `MAIL_TEST_FIXTURES=1` lets the made-up issue
(`fixture-issue`) and event (`fixture-page:fixture-rsvp`) through. Never set `MAIL_TEST_FIXTURES` on the real Worker.

**Privacy.** Subscribers are an address, a status and dates. RSVPs hold what the form asks, in D1 only; clear an old
event's replies with `npx wrangler d1 execute <db> --remote --command "DELETE FROM rsvps WHERE event_key = '<key>'"`
once the organiser has downloaded them (the key is in the RSVPs tool's download name and the `rsvps` table).

### Where form messages go, set in the Studio (PORTS.md card 174)

An administrator can set the Contact form's address from **Site settings > Forms** instead of asking for
`CONTACT_TO` to change. The address is kept in `CONTACT_DB` (table `form_recipient_addresses`), never in the public
dataset, and is used only once someone presses the link it was emailed. Until then, and with no row at all, the form
sends to `CONTACT_TO` exactly as before. To switch it on (after steps 1 to 3 above, so the link can be sent):

```powershell
npx wrangler d1 migrations apply <site>-contact --remote   # adds the table; safe to run again
```

Without `MAIL_SECRET` and a sender the panel still saves an address, marked unconfirmed, and nothing goes to it. A site
that already made the table under another migration number is fine: the SQL is `CREATE TABLE IF NOT EXISTS`. To see
what is on file:
`npx wrangler d1 execute <site>-contact --remote --command "SELECT recipient_key, email, pending_email, pending_status FROM form_recipient_addresses"`.

## Studio workflow tools (PORTS.md card 117)

Switching each one on, per site:

- **Private preview links.** `npx wrangler secret put SHARE_PREVIEW_SECRET` with any random string of 32 or more
  characters (`node -e "console.log(crypto.randomBytes(32).toString('base64url'))"`), plus the preview stack's
  `SANITY_TOKEN`. Locally, put it in `.dev.vars`. Rotating the secret stops every link at once; "Stop this link" in
  the dialog stops one. Add `"previewShare"` to the publish webhook's deny-list so making a link does not rebuild
  the site. Links are HTTPS-agnostic, so they work against `npm run preview` too.
- **Messages.** Needs the forms switched on (the `CONTACT_DB` binding, wrangler.jsonc) and the status migration:
  `npx wrangler d1 migrations apply <db> --remote`. Locally: `npx wrangler d1 migrations apply <db> --local -c
dist/server/wrangler.json`, then `npm run preview`.
- **Morning change note.** Repo secret `SANITY_AUTH_TOKEN` (read), variable `SANITY_PROJECT_ID`, optional variable
  `SITE_URL`, then uncomment the schedule in `.github/workflows/change-note.yml`. The person who should get it
  watches the repo. Try it by hand: `node --experimental-strip-types scripts/change-note.mjs --dry --hours 72`.
- **Table panes.** Nothing to switch on; edit `src/sanity/tables.config.ts`.

## Private pages and the link report (PORTS.md card 122)

- **Password pages.** `npx wrangler secret put PRIVATE_PAGE_SECRET` (32+ random characters, as above) plus the
  preview stack's `SANITY_TOKEN`. Without either, `/private/<slug>/` says "not ready yet" and never shows a page.
  Optional: a Cloudflare rate limiting rule on `POST /private/*` for a hard global limit. Locally: `.dev.vars` with
  `PRIVATE_PAGE_SECRET` and `PRIVATE_PAGE_TEST_FIXTURE=1`, copied to `dist/server/`, then `npm run preview` and
  `PRIVATE_PAGES_BASE_URL=http://localhost:8787 npx playwright test private-pages`. Never set the fixture flag on a
  deployed Worker.
- **Link report in the Checkup.** Repo secret `SANITY_API_WRITE_TOKEN` (the one publish-due uses); link-health.yml
  then saves `linkReport.latest` every Monday. Try it by hand: `node scripts/check-live-links.mjs --write-report`
  with the token in the environment.
- Both types are in the webhook deny-list above; add them to an existing webhook's filter.

## The Studio app and Earlier versions (PORTS.md card 125)

- **The Studio on a phone.** Nothing to switch on: `/studio/manifest.webmanifest` and `/studio/sw.js` ship with
  every build. Check after a deploy: open `/studio/` in Chrome, DevTools, Application, Manifest (no errors, the
  maskable icon looks right in the "Show only the minimum safe area" preview) and Service workers (scope `/studio/`).
  To make it drop everything it keeps, bump `VERSION` in `public/studio/sw.js`. A new brand mark: `npm run favicon`.
- **Post a photo.** `kitConfig.postPhoto` in `src/sanity/kit.config.ts`. Drafts only.
- **Earlier versions.** Needs three things already used elsewhere: the nightly backup running
  (`sanity-backup.yml`, with `BACKUP_PASSPHRASE`), the repo secret `SANITY_API_WRITE_TOKEN` and variable
  `SANITY_PROJECT_ID` (read by `restore-doc.yml`), and the Worker's `GITHUB_DEPLOY_TOKEN` secret plus
  `GITHUB_REPO` var (the "Try again" settings). The token must be fine-grained, this repository only, with
  **Actions: Read and write**; that one permission covers starting the workflow, listing the backups and reading the
  run log. Without any of it the panel offers "Ask for help" instead. Try it by hand first: Actions, "Restore one
  document from a backup", Run workflow, mode `scan`, a document id. A restore from the Studio shows in the Actions
  list as `restore-doc restore <request id>`, with an audit line naming the Sanity user who asked.

## Seed placeholder content

Seed scripts bootstrap document types with placeholder content for a fresh dataset. The reusable scripts in `scripts/` cover the core content types. Modules may include their own seed scripts documented in `docs/modules/`.

All seed scripts should be idempotent. Prefer `setIfMissing` (only fills empty fields) so existing editor customizations are not overwritten. Use `createOrReplace` only for canonical guide/reference content that should always match the seed file.

See the "Patch Sanity content programmatically" section below for the client setup pattern to copy.

**Important: seeded content is placeholder.** Before launch, replace all fabricated content (example press items, placeholder pricing, dummy affiliate URLs, sample guide PDFs) with real content.

---

## Routes inventory

Core routes that ship with the starter:

| Path                 | Notes                                                                           |
| -------------------- | ------------------------------------------------------------------------------- |
| `/`                  | Home — section-driven via `pageBuilder` + `SectionRenderer`                     |
| `/about`             | About — section-driven                                                          |
| `/services`          | Services — section-driven                                                       |
| `/process`           | Process — section-driven                                                        |
| `/[slug]`            | Custom pages created in the Studio; reserved slugs filtered in `getStaticPaths` |
| `/faq`               | FAQ grouped by category                                                         |
| `/contact`           | Contact form + Calendly + post-inquiry roadmap                                  |
| `/journal`           | Journal/blog index                                                              |
| `/journal/[slug]`    | Post detail                                                                     |
| `/journal/rss.xml`   | Journal RSS feed                                                                |
| `/robots.txt`        | Generated by `src/pages/robots.txt.ts`; reads production URL from `site.ts`     |
| `/privacy`           | Privacy policy                                                                  |
| `/404`               | Custom 404                                                                      |
| `/sitemap-index.xml` | Auto-generated by @astrojs/sitemap                                              |

Additional routes are added by opt-in modules under `modules/`. There are 13 opt-in modules:

| Path                                 | Module              | Notes                                                   |
| ------------------------------------ | ------------------- | ------------------------------------------------------- |
| `/portfolio` and `/portfolio/[slug]` | `portfolio`         | Work/case study index + detail                          |
| `/shop`                              | `shop`              | Product listings                                        |
| `/virtual-services`                  | `virtual-services`  | Remote/e-design service page (renamed from `/e-design`) |
| `/gift-certificates`                 | `gift-certificates` | Gift certificate page                                   |
| `/press`                             | `press`             | Press/media page                                        |
| `/resources`                         | `resources`         | Downloadable resources                                  |
| `/guides` and `/guides/[slug]`       | `lead-magnets`      | Lead magnet index + detail                              |
| `/quiz`                              | `style-quiz`        | Style quiz                                              |
| `/calculator`                        | `budget-calculator` | Budget calculator                                       |
| `/events`                            | `events`            | Events/workshops page                                   |
| `/donate`                            | `donations`         | Donations page                                          |
| `/team`                              | `team`              | Team roster page                                        |
| (embed component)                    | `newsletter`        | No dedicated route; README-only embed component         |

See `docs/modules/` for per-module enable guides.

---

## Before launch checklist

The items below apply to any project built on this starter. Replace the angle-bracketed placeholders with project-specific values.

**Wire identity (preferred: run /reskin or apply-brand):**

- [ ] Fill in `brand/brand.config.json` with the client's name, domain, tagline, palette, and font choices
- [ ] Install font packages first (`npm install @fontsource/...`) if changing from the defaults
- [ ] Run `npm run apply-brand` to cascade the brand config to `globals.css`, `site.ts`, Studio theme, and the OG image
- [ ] Place real logo files at the paths set in `brand/brand.config.json` → `logoPaths` (the script does not copy files)
- [ ] Replace `public/favicon.svg` with the project's favicon
- [ ] See `docs/brand/brand-system.md` for full detail on the reskin system

**Wire Sanity:**

- [ ] Create Sanity project; set `PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET` in `.env` and Cloudflare → Workers → Variables
- [ ] Set `SANITY_API_READ_TOKEN` (scoped read token from Sanity Manage → API → Tokens)
- [ ] Set `SANITY_API_WRITE_TOKEN` in `.env` locally for running seed/patch scripts
- [ ] Deploy the site (`npm run deploy`) -- this publishes the embedded Studio at `/studio` too
- [ ] Allow the origins on the Sanity project's CORS list: `npx sanity cors add https://<your-worker>.workers.dev --credentials` (and `http://localhost:4321` for local work). Without this the embedded Studio cannot sign in.
- [ ] Set the `SANITY_TOKEN` Worker secret for the live preview: `npx wrangler secret put SANITY_TOKEN` (a Viewer token with draft read access). Locally it goes in `.dev.vars`; see `.dev.vars.example`.
- [ ] Configure the Sanity → Cloudflare rebuild webhook with the deny-list filter (see above)

**Wire external services:**

- [ ] Web3Forms: create a form, set the access key in the contact form component
- [ ] Calendly: set `PUBLIC_CALENDLY_URL` env var to the real booking URL
- [ ] Cloudflare Web Analytics: create a site, add the token to `wrangler.jsonc`

**Seed + populate content:**

- [ ] Run applicable seed scripts for a fresh dataset
- [ ] Replace all placeholder/sample content with real content before launch
- [ ] Toggle off any modules that are not yet ready (via Site Settings → Section visibility in Studio)

**Pre-flight validation:**

- [ ] Lighthouse: Performance 95+, Accessibility 100, Best Practices 100, SEO 100 on the deployed Cloudflare URL
- [ ] Contact form test submission reaches the correct inbox
- [ ] All external links open in a new tab with correct `rel` attributes
- [ ] Sitemap submitted to Google Search Console

---

## Patch Sanity content programmatically

For one-off content updates (backfilling new fields, fixing typos across many docs), write a script in `scripts/`. Pattern:

```js
import { createClient } from '@sanity/client';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const env = Object.fromEntries(
  readFileSync(resolve(root, '.env'), 'utf-8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const [k, ...v] = l.split('=');
      return [k.trim(), v.join('=').trim()];
    }),
);

const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID,
  dataset: env.PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: env.PUBLIC_SANITY_API_VERSION ?? '2026-05-01',
  useCdn: false,
  token: env.SANITY_API_WRITE_TOKEN,
});

// ... your patch logic ...
```

Then `node scripts/your-script.mjs`.

**Idempotency.** Always make patch scripts re-runnable. Use `setIfMissing` (only fills empty fields) or check the current value before writing.

**Portable Text blocks** need `_key` (use `randomUUID()`), `_type: 'block'`, `style` (e.g. `'normal'`, `'h2'`), `markDefs: []`, and `children` with their own `_key`. **Every object in an array needs a `_type` too** (and a `_key`): the site renders fine without it, but where an array allows more than one kind of item the Studio shows "Item of type object not valid for this list" and the editor cannot open it. `npm run audit:data` finds these, and orphan fields left by a removed schema field; `scripts/backfill-array-types.mjs` adds the missing `_type` (dry by default). PORTS.md card 95.

**Writes to production need two things** (PORTS.md card 86). Scripts built on `scripts/lib/sanity-lib.mjs` (and `npm run seed`) are dry by default; `--apply` writes, and on the `production` dataset the same command must also carry `NCS_PRODUCTION_WRITE=yes` in the process environment (never in `.env`): `NCS_PRODUCTION_WRITE=yes node scripts/x.mjs --apply`. Nathan or a delegated agent sets it, only under the write protocol (backup, dry run, apply, verify). Never quote a command inside a shell string (`node -e`, `echo`, an unquoted heredoc): backticks in the text run as commands. Write such text with a file-writing tool.

**Key gotcha when editing page copy:** most page singleton fields already have Sanity content, so changing a code fallback in an Astro page does NOT change the live site — the Sanity value wins. To change displayed copy on a populated field you must patch Sanity. Only genuinely-empty fields render their code fallback.

**Annotation cleanup:** Sanity Canvas (AI-assisted drafting) sometimes lets prefix annotations like `[NEW per audit, softer framing] …` or `[TODO: fill in …]` slip into published content. `scripts/strip-editor-annotations.mjs` scans every doc for these patterns:

```bash
node scripts/strip-editor-annotations.mjs           # dry-run (default)
node scripts/strip-editor-annotations.mjs --apply   # actually patch
```

Re-run after large Canvas batches.

---

## Run Lighthouse / performance audits

If a regression is suspected:

```bash
# Build locally to check bundle sizes
npm run build
# Astro logs every chunk + image emit in the build output.

# Quick diff between branches
git diff main HEAD -- src/components src/pages
```

For end-to-end Lighthouse runs against the deployed site, use Chrome DevTools' bundled Lighthouse or the chrome-devtools MCP. The MCP path:

```
mcp__plugin_chrome-devtools-mcp_chrome-devtools__navigate_page → URL
mcp__plugin_chrome-devtools-mcp_chrome-devtools__emulate → viewport "360x640x1.875,mobile,touch" + colorScheme light
mcp__plugin_chrome-devtools-mcp_chrome-devtools__lighthouse_audit → device "mobile"
```

Note: the MCP lighthouse_audit only returns Accessibility / BP / SEO / Agentic. For Performance metrics use `performance_start_trace` which gives LCP / CLS / breakdown.

**Always test on the workers.dev URL,** not the live production domain until DNS is cut over.

### Common diagnostic findings (most are unscored)

| Lighthouse flag                              | What it's actually saying                                     | Fix                                                                                                            |
| -------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| "Reduce unused JavaScript"                   | React + Astro runtime has unreachable error-handling branches | Unavoidable without Preact swap. Accept.                                                                       |
| "Improve image delivery — Est savings X KiB" | Loaded files are slightly bigger than display needs           | Tighten srcset breakpoints if X > 100 KiB. Otherwise theoretical.                                              |
| "Avoid long main-thread tasks (78 ms found)" | React island hydration (`ThemeToggle`, others on the page)    | Fires after LCP/FCP. Real-user INP is fine. Accept. (`MobileNav` is no longer an island, card 157.)            |
| "Render-blocking SanityImage.css (18 KiB)"   | The whole Tailwind output is chunked under that name          | Extracting critical CSS is high effort for marginal LCP benefit at current scores. Skip.                       |
| "Uses third-party cookies (sanitySession)"   | Sanity CDN sets a session cookie                              | `crossorigin="anonymous"` BREAKS Sanity images. Skip.                                                          |
| "No CSP"                                     | Astro 6's `security.csp` would satisfy this                   | DON'T enable — ClientRouter's runtime inline scripts get blocked. See CLAUDE.md → Stack → Astro config don'ts. |

---

## Regenerate logos

Source files live in `src/assets/`. To regenerate from a source image:

```bash
# 1. Build new variants from a source JPG
node scripts/generate-logo-variants.mjs
# OR with a specific source file:
node scripts/generate-logo-variants.mjs your-logo.jpg

# 2. Optimize before Astro picks them up
node scripts/optimize-logo-files.mjs
```

The PNGs land in `src/assets/` (NOT `public/`) so Astro's `<Image>` / `getImage()` pipeline can emit content-hashed WebPs. `Header.astro` and `Footer.astro` read these via `getImage()`.

**Don't move them back to `public/`** — Astro can't touch `public/` files and you'd lose the WebP conversion + content-hashing.

---

## Common Sanity tasks

### Add a new field to a page singleton

1. Edit `src/sanity/schemaTypes/<page>.ts` — add `defineField(...)`.
2. `npm run typegen` (regenerates `src/lib/sanity.types.ts`).
3. Add the field to the GROQ projection in `src/lib/queries.ts` (for non-section fields) or to `sectionsProjection()` if it is inside a section block.
4. Use the field in the corresponding Astro page or section component with a sensible fallback.
5. Write a backfill script in `scripts/` to set the value on the existing production doc (use `setIfMissing` so future editor changes aren't clobbered).
6. `npm run build` to confirm the site and the embedded Studio build clean.
7. Commit the schema file and the regenerated `src/lib/sanity.types.ts` together, then push. The deploy publishes the Studio along with the site.

See the full schema-change procedure above (in the "Schema-change procedure" section) for the complete order of operations.

---

## Common gotchas (the ones that have bitten at least once)

| Symptom                                                         | Cause                                                                                        | Fix                                                                                                                                |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Theme reverts to light after clicking a nav link                | View Transitions reset html className on swap                                                | The anti-FOUC script in BaseLayout listens for `astro:after-swap` and re-applies. Don't remove that listener.                      |
| Footer logo renders broken / empty                              | Footer is below first paint, head script ran before footer img existed in DOM                | Same anti-FOUC script has a `DOMContentLoaded` listener for exactly this. Don't remove.                                            |
| Sanity image broken with CORS error                             | `crossorigin="anonymous"` was added to a `<img>` pointing at `cdn.sanity.io`                 | Remove the `crossorigin` attribute. Sanity CDN doesn't send Access-Control-Allow-Origin headers.                                   |
| Inline scripts blocked, theme/polish/scroll-attribute all break | Someone enabled `security.csp` in `astro.config.mjs`                                         | Remove the config block. See CLAUDE.md → Stack → Astro config don'ts.                                                              |
| Logo renders squished                                           | width/height attributes on the `<img>` don't match the actual file dimensions                | Make sure `<Image width={X} height={Y}>` uses dimensions matching the source's intrinsic aspect ratio.                             |
| `text-link` className override on white BG doesn't work         | Tailwind v4 sorts utilities alphabetically; `text-link` beats `text-bg` later in the cascade | Add a component prop (like `CtaLink`'s `onDark`) instead of trying to override via className.                                      |
| Eyebrow text fails Lighthouse contrast on light mode            | `text-foreground/65` on light backgrounds = ~3.6:1 (fails AA)                                | Bump to `text-foreground/80` (~5.4:1, passes). Don't add new `/65` instances on muted/background surfaces.                         |
| TOC sidebar empty on a long-form post                           | No h2/h3/h4 in the body                                                                      | Add headings in Sanity. `extractHeadings()` only sees those three levels.                                                          |
| Playwright `fullPage` screenshot is mostly blank                | `[data-reveal]` elements start at `opacity: 0` until the IntersectionObserver fires          | `page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-visible')))` before screenshot. |
| Build fails on fresh clone with Sanity query errors             | `PUBLIC_SANITY_PROJECT_ID` is not set                                                        | Expected — `sanityFetch` returns fallbacks when unconfigured. Set the env var to connect a real project.                           |
| Image optimizer path mismatch after adapter upgrade             | `@astrojs/cloudflare` upgraded past `13.5.5`                                                 | Revert to exactly `13.5.5`. See CLAUDE.md gotcha #8.                                                                               |
| Featured section shows wrong item as the hero                   | Falling back to date-based default                                                           | Toggle `featured: true` on the item to pin. Sections sort `featured desc, publishedAt desc`.                                       |

---

## Useful one-liners

```bash
# Find every <img> in the codebase
# (Sanity-sourced imgs are handled by SanityImage.astro; local ones use Astro <Image>)
grep -rn '<img' src/

# Find every client: directive (Astro hydration audit)
grep -rn 'client:' src/

# Check what's actually deployed on the workers URL
curl -s "https://your-worker.workers.dev/?cb=$(date +%s)" | grep -oE 'SOMETHING_TO_LOOK_FOR'
```

---

## When something feels wrong

1. **Check the deployed workers URL first**, not localhost — the bug might already be fixed and just hasn't been redeployed.
2. **Open Chrome DevTools and check Console + Network** — most of the "weird" bugs in this codebase have been either CSP violations, CORS issues, or theme/View Transitions interaction. All show up loudly in DevTools.
3. **Read CLAUDE.md → relevant section** before changing anything. The non-obvious fixes are documented; reverting them tends to re-break the same bugs.
4. **Run `npm run build` locally** — Astro's build output catches a lot (missing imports, schema mismatches, image-pipeline errors).
5. **Diff against the last known-good commit** — `git log --oneline -20` then `git diff <hash>..HEAD -- src/path`.

---

_See `CLAUDE.md` for the full architecture reference._

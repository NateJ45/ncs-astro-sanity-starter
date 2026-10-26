# Deployment

> Cloudflare Workers build model, the Sanity -> live-site rebuild model, environment variables, security headers, and privacy/analytics.

## Deployment

- Production: pushes to `main` trigger a Cloudflare Workers build that serves your production domain.
- Previews: any other branch gets its own preview URL via Cloudflare Workers.
- Build command: `npm run build`. Output directory: `dist`.
- `output: 'static'` in `astro.config.mjs` prerenders every page to HTML at build time. The `@astrojs/cloudflare` adapter stays installed so individual pages can opt into server rendering later via `export const prerender = false` in that page's frontmatter, but for a content-rich marketing site it's effectively inert.

### Cloudflare Workers vs Pages note

As of early 2026, Cloudflare merged Pages into Workers. Pages is in maintenance mode; Workers gets all new investment. New Astro projects should use Workers via the `@astrojs/cloudflare` adapter and `wrangler deploy`.

### Putting a site on its real domain

`npm run cutover` (`scripts/cutover.mjs`) takes a site from "the zone is not on Cloudflare" to "live on its domain, mail intact": it finds or creates the zone, audits and imports a registrar's zone export, attaches the Worker to the apex and www as custom domains, files the 301 from www, sets the four TLS settings this studio uses everywhere, and verifies the result from outside. **Dry run by default**; `--write` is the only thing that lets it act. Read the plan first, every time. Full detail in PORTS.md card 48.

Two commands it deliberately does not run, and prints instead: `npx wrangler email sending enable <domain>` (a beta command with no stable API behind it) and `npx sanity cors add https://<domain> --credentials` (needs the interactive Sanity login). Without the second one the embedded Studio loads on the new origin and then fails every request, which looks like a broken build rather than a missing CORS entry.

### Sanity -> live site rebuild model (READ THIS BEFORE CHANGING CONTENT EXPECTATIONS)

The site is `output: 'static'` -- every page is **pre-rendered to HTML at build time, not fetched at runtime**. Practical implication: when an editor edits a field in Sanity and clicks Publish, **the change does NOT appear on the live site until the site rebuilds**. The Sanity dataset updates instantly, but the live HTML is whatever was generated at the last build.

**Since 2026-09-18 the starter ships `.github/workflows/deploy.yml`, and that is the
mechanism to wire on a new project.** It deploys on a push to `main`, on a manual
`workflow_dispatch`, and on a `repository_dispatch` of type `sanity-publish`, which is
what a Sanity webhook sends. So the publish webhook now points at GitHub's dispatches
endpoint for the repo, with an `Authorization: Bearer <token>` header (the word `Bearer`
is load-bearing: without it GitHub answers 401 and Sanity reports only a failed attempt)
and a projection of exactly `{"event_type": "sanity-publish"}`. The GROQ filter below is
unchanged and still the right one. The Cloudflare build-hook steps that follow describe
the older route, for a fork that builds through Cloudflare's own git integration instead.
`docs/bootstrap/NEW-PROJECT.md` Step 8 is the setup order.

There are two ways the site rebuilds:

1. **`git push origin main`** -- Cloudflare detects the push -- triggers `npm run build` -- site updates in ~1-3 min.
2. **Cloudflare deploy hook** -- an HTTP POST to a private Cloudflare URL triggers the same build.

Without a webhook, every Sanity edit waits until the next code push. That's not a sustainable editor experience.

**Recommended GROQ filter (deny-list):** apply this at manage.sanity.io -> API -> Webhooks -> "Rebuild live site". It skips draft saves and internal Sanity asset-management events, and covers new content types automatically:

```
!(_id in path("drafts.**")) && !(_type in ["media.tag", "sanity.imageAsset", "sanity.fileAsset", "sanity.assetSourceData"])
```

The old allow-list approach (listing every `_type` that should trigger a rebuild) silently dropped new types until a developer remembered to add them. The deny-list is safer. See OPERATIONS.md for the full note.

**The setup pattern (for reference / if it ever needs to be re-created):**

1. **Create the Cloudflare deploy hook** at Cloudflare dashboard -> Workers & Pages -> your-project -> Settings -> Build hooks. Name it `Sanity content publish`, branch `main`. Copy the generated URL.

2. **Create the Sanity webhook** at manage.sanity.io -> project -> API -> Webhooks. Name it `Rebuild live site`, dataset `production`, trigger on Create + Update + Delete, HTTP method POST, paste the Cloudflare URL. Apply the deny-list GROQ filter above.

3. **Test:** edit a Sanity singleton field -> publish -> watch Cloudflare's Deployments tab -> new build kicks off within ~10 seconds -> live in ~1-3 min total.

**Trade-offs to know:**

- Every publish triggers a full ~45 second build. Reasonable for a marketing site. If the editor batch-edits many records, save the publish click until the end to consolidate builds.
- There's always a 1-3 minute delay between publish and live render. Acceptable for a marketing site; would NOT be for breaking news.
- Cloudflare's free tier covers 500 builds/month -- well clear of expected publish cadence.
- If near-instant updates are ever needed, the alternative is Incremental Static Regeneration or runtime-fetching from Sanity for specific pages. Both are larger architecture changes; the webhook is the right answer for most marketing sites.

### Environment variables

Set in Cloudflare -> **Workers & Pages -> your-project -> Settings -> Variables** (Build section). All documented in `.env.example`; copy to `.env` and fill in real values for local dev.

- `PUBLIC_SANITY_PROJECT_ID` -- Sanity project ID from manage.sanity.io. When absent, `sanityFetch` returns fallback values and the build completes cleanly (empty-state mode).
- `PUBLIC_SANITY_DATASET` -- `production` (or your dataset name). Same graceful-empty behavior as above.
- `PUBLIC_SANITY_API_VERSION` -- pinned ISO date like `2026-05-01`. Bump deliberately.
- `SANITY_API_READ_TOKEN` -- only if any page needs to read draft content (typically not, since published content is publicly readable). Mark as Secret.
- `PUBLIC_WEB3FORMS_KEY` -- LEGACY, and only needed for a build with no Worker. The contact form now posts to the site's own `/api/contact` endpoint first and only falls back to Web3Forms when that endpoint is not there (see PORTS.md card 45). On a Workers deploy, prefer the server-side `WEB3FORMS_KEY` secret below, which keeps the key out of the client bundle.

### Dependabot

`.github/dependabot.yml` (PORTS.md card 62) opens one grouped version-update PR per ecosystem each Monday at 07:00 America/New_York: npm minors and patches in a single `minor-and-patch` group (at most 5 open PRs), except formatter bumps (`prettier`, `prettier-plugin-*`), which get their own `formatters` group (and are excluded from `minor-and-patch` with `exclude-patterns`, because a refresh of an older bundle ignores group order) so a release that reformats files reds only that small PR (fix it with `npm run format` on the branch and push; card 92), and GitHub Actions in an `actions` group. It carries no `target-branch` because `main` is the only long-lived branch. The Sanity stack, React, the Cloudflare adapter, wrangler, `astro` itself (it moves with the adapter, which imports Astro internals; card 92) and TypeScript 7+ are on its `ignore:` list because they are pinned and move together by hand (CLAUDE.md rule 8); take a pinned-set bump in a planned session, not from a Dependabot PR. npm **majors** of any package are also ignored (`dependency-name: '*'` with `version-update:semver-major`): they wait for one planned, starter-first stack upgrade (Astro, adapter, Sanity, wrangler) with a real deploy test. The `github-actions` ecosystem is exempt; take action majors when CI is green.

Things this file does NOT do, each of which has cost a family repo real time:

- **It does not turn on vulnerability alerts or automated security fixes.** Those are repo settings: `gh api -X PUT repos/OWNER/REPO/vulnerability-alerts` and `gh api -X PUT repos/OWNER/REPO/automated-security-fixes`.
- **Dependabot PRs do not see your Actions secrets.** Workflow runs it triggers read the separate _Dependabot_ secrets store. The starter's PR build (`ci.yml`) reads only repo VARIABLES (`PUBLIC_SANITY_*`), which Dependabot runs can read, so a fresh fork is fine. The day a fork's CI build reads a `secrets.*` value, grep the workflows for `secrets.` and set each one again with `gh secret set NAME --app dependabot --repo OWNER/REPO`; otherwise every Dependabot PR fails on the first step that needs it, and the red marks look like a dependency problem when they are a missing secret.
- **It does not make a dependency PR safe to merge on local checks.** If CI is red, do not merge. Read `gh pr checks`, merge the ones whose real gates pass, leave the rest, and let Dependabot re-propose per package so CI bisects for you.
- **Linters ship new default rules in minors.** If a lint tool's minor starts failing the whole group, exclude that tool from the group (`update-types`) so it lands on its own PR with its fixes.

### The contact endpoint (`/api/contact`)

All of these are OPTIONAL. With none of them set the route still exists, still validates, and answers a visitor honestly; it just has nowhere to put the message. Set them as Worker secrets, not `.env`:

| Name               | What it does                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `CONTACT_TO`       | Where notifications go. On the free path this must be a **verified destination address** in the Cloudflare account. |
| `CONTACT_FROM`     | Who they come from. Must belong to a domain onboarded for Email Sending.                                            |
| `TURNSTILE_SECRET` | Turns on Turnstile verification. Skipped entirely when unset.                                                       |
| `WEB3FORMS_KEY`    | Server-side fallback, used only when there is no `EMAIL` binding.                                                   |

**The address can also be set in the Studio** (PORTS.md card 174). An administrator saves it under Site settings > Forms; it is kept in `CONTACT_DB` (`form_recipient_addresses`, `migrations/*_form_recipients.sql`), emailed a confirmation link, and used only once that link is pressed. The route sends to the confirmed row when there is one, else `CONTACT_TO` (`contactRecipient()` in the PORTABLE `src/lib/form-recipients.ts`). No table, no row, or no D1 at all means `CONTACT_TO`, as before. The Web3Forms fallback is unaffected: it sends wherever that Web3Forms key is set up to send. Routes: `/api/studio/form-recipients/` (administrators only, the same checks as the other Studio routes) and `/api/form-recipient/confirm/` (GET shows one button and changes nothing, so a mail scanner cannot confirm; the POST does). The Studio field `formRecipientAddresses` is a panel that never writes to the dataset. Switch-on steps: OPERATIONS.md, "Where form messages go".

Bindings (`CONTACT_DB` for D1, `EMAIL` for Email Sending) are configured in `wrangler.jsonc`, which carries the full enable-it checklist as a comment.

**Store first, notify second.** The endpoint writes the submission to D1 before it tries to email anything, so a message survives a bounce, a spam filter, or a missing transport. A row with `notified = 0` and a `notify_error` is a repairable problem; with a form service the same event is a lost customer and nobody knows.

- `PUBLIC_CF_ANALYTICS_TOKEN` -- Cloudflare Web Analytics token. Without it the analytics beacon doesn't render.
- `PUBLIC_CALENDLY_URL` -- optional. Booking link for the discovery call CTA.
- `PUBLIC_NEWSLETTER_FORM_ACTION` -- optional. Build-time override for the ESP form-action endpoint.

### Contact form: turning it on

Added 2026-09-18. Until then nobody in the family had watched a message actually arrive, and this section said so. One has now (Stone Steps 50K, confirmed by the client the same morning), so these are the six steps that worked, in the order they worked in. `wrangler.jsonc` carries the same list as a comment next to the bindings themselves; PORTS.md card 45 carries the reasoning.

**Prerequisite: the domain has to be on Cloudflare DNS.** Email Sending cannot be enabled otherwise, and that is the single thing that blocked this for months. `npm run cutover` is the script that moves a zone across.

1. `npx wrangler d1 create <site>-contact`, and note the returned `database_id`.
2. `npx wrangler d1 migrations apply <site>-contact --remote`. The remote apply is deliberately separate from the local one.
3. `npx wrangler email sending enable <domain>`. This onboards the domain for **outbound** mail: SPF and DKIM go under a `cf-bounce` subdomain, so it sits alongside Microsoft 365 or Google Workspace on the same domain. Email **Routing** would not, because it takes the apex MX.
4. `npx wrangler secret put CONTACT_TO` and `npx wrangler secret put CONTACT_FROM`. Secrets, not vars: `CONTACT_TO` is where a client's enquiries land.
5. Uncomment the two binding blocks in `wrangler.jsonc`, paste the database id, and deploy. Keep that as its own commit: a deploy that fails on a binding is much easier to read when the binding is the only thing that changed.
6. Send **one** labelled test submission through the live form, then read the row back:

   ```
   npx wrangler d1 execute <site>-contact --remote \
     --command "SELECT id, received_at, notified, notify_error FROM contact_submissions ORDER BY id DESC LIMIT 1"
   ```

   `notified = 1` is the proof, and it is the only proof. A 200 from the endpoint does not distinguish a working form from a silently broken one, because the route returns 200 for a stored-but-not-sent submission on purpose: the visitor did their part and the message exists.

**Two things to hand to a human rather than an agent.** Steps 2 and 4 can trip a permission gate, and did during the Stone Steps cutover: the remote migration writes to a live database and `secret put` reads a value from a prompt. Give those two to whoever holds the account and let the agent do the rest.

**DMARC stays at `p=none`** until the client's own mail provider has DKIM set up. Tightening it first means the client's ordinary mail starts failing, which is a much bigger problem than a contact form.

**Turnstile is separate and optional.** The endpoint skips it entirely when `TURNSTILE_SECRET` is unset, and the honeypot plus the timing check stand on their own. Stone Steps shipped without it.

### Studio: deploy after schema changes

When you change a Sanity schema (`src/sanity/schemaTypes/**`), run `npm run typegen` and commit the regenerated types, then deploy the site. The Studio is embedded at `/studio` and ships with the site build, so deploying the site publishes the schema. There is no separate Studio deploy (and `npx sanity deploy` must NOT be run: it would create a standalone Studio that silently falls behind). Until the deploy lands, editors may see fields that don't match the current types, or miss newly added ones.

### Security headers

`public/_headers` ships with the deploy. Cloudflare applies it to every **static**
response (every prerendered page, `/studio/`, and the `/_astro/*` files). It does NOT
apply to responses the Worker generates itself, so the SSR routes (`/preview/**`,
`/api/draft-mode/*`) carry none of these headers. Site-wide:

- `Strict-Transport-Security` (HSTS, one year, includeSubDomains)
- `Content-Security-Policy`: `frame-ancestors 'self'` (replaces the legacy
  `X-Frame-Options`; `DENY` would break the Presentation tool's iframe of `/preview/*`),
  plus `object-src 'none'`, `base-uri 'self'` and a `script-src` written at build time
  (below, PORTS.md card 153)
- A second `Content-Security-Policy: form-action 'self'` (PORTS.md card 159): forms may post to
  this site only, which stops an injected form sending what a visitor types elsewhere. It is a
  separate line because build-csp.mjs needs the first line byte-for-byte; both policies are
  enforced, so it only adds this one rule. **A pasted form that posts elsewhere** (a donate
  button, a mailing-list signup in a Custom code block, whose srcdoc frame inherits the page's
  policy) needs its origin added to that line, e.g. `form-action 'self' https://www.paypal.com`.
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Cross-Origin-Opener-Policy: same-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), usb=(), magnetometer=(), gyroscope=()`
  (card 159): device features no page uses, refused for the page and every frame in it. Autoplay,
  fullscreen and encrypted media are not listed, so embedded video players keep working.
  `interest-cohort` is left out on purpose: Chrome logs an "unrecognized feature" error for it.

**Caching (card 159).** `/_astro/*` is a year, immutable (the names carry a content hash).
`/og/*`, `/favicon.svg`, `/favicon.ico` and `/apple-touch-icon.png` get a day plus a week of
`stale-while-revalidate`: their names are fixed, so never mark them immutable. A font or texture the
CSS needs belongs under `src/assets/` (Vite hashes it into `/_astro/`), not `public/`. HTML has no
rule: Cloudflare's `max-age=0, must-revalidate` with an ETag, because every page is rebuilt on publish.

**The script policy (PORTS.md card 153, from fbc-auburn's Lighthouse "Ensure CSP is effective
against XSS" flag, 2026-10-24).** `public/_headers` says only `frame-ancestors 'self'` on the
`/*` rule. `scripts/build-csp.mjs` (PORTABLE) runs after `astro build` (part of
`npm run build`) and rewrites that line in `dist/client/_headers` to add
`object-src 'none'; base-uri 'self'; script-src ...`, where the list is `'self'`,
`'wasm-unsafe-eval'` (Pagefind's WebAssembly), every external script origin in the built pages,
a sha256 hash of every inline script on every page (inside Custom code `srcdoc` frames too, which
inherit the page's policy), and `'unsafe-inline'` last, which browsers ignore once hashes are
present. Helpers and tests: `scripts/lib/csp.mjs`.

- **Why one site-wide list, not a policy per page, and not Astro's `security.csp`:** the page
  router (`<ClientRouter />`) runs the next page's inline scripts under the FIRST page's policy,
  and Astro's own CSP feature does not support the router at all.
- **The line has a size limit** (card 159): Cloudflare rejects a `_headers` line over 2,000
  characters, and each inline-script hash adds about 53. `vite.build.assetsInlineLimit: 0` in
  `astro.config.mjs` keeps small component scripts out of the pages as hashed `/_astro/` files, so only
  `is:inline` scripts need a hash. Watch the build's `[csp] ... (N bytes)` line when adding an
  `is:inline` script; `scripts/lib/headers-line-limit.test.mjs` fails when a built line is over the limit.
- **Only scripts are restricted.** No `default-src`, so images, frames, styles, fonts and
  fetches are untouched.
- **What can still break:** a script that pasted code adds AT RUNTIME from an origin not in the
  HTML (a widget whose loader pulls a second script from another host). List that origin in
  `scripts/csp-origins.json` (the site's own file, not PORTABLE; a JSON array of origins such as
  `["https://widget.example.com"]`). GA4's tag is handled inside the script.
- **The Studio detaches it** (`/studio/*`: `! Content-Security-Policy`, then `frame-ancestors`
  only), per trap 1 below.
- **Trusted Types are not required** (`require-trusted-types-for`). Lighthouse lists it, unscored;
  enforcing it would break the router, Pagefind's results and the React islands, which all write
  HTML strings, and a report-only trial logs console errors that cost the Best Practices score.
- The build fails if the `/*` line is missing, so the policy never quietly drops to none.
- **One known console error, harmless (decided 2026-10-24).** On an in-site click to a page whose
  last script is an inline module, Astro's router (`astro/dist/transitions/router.js`, `runScripts`)
  appends an empty `<script type="module" src="data:application/javascript,">` only to wait for that
  module to run. The policy blocks it and Chrome logs "Loading the script 'data:application/javascript,'
  violates ... Content Security Policy". Nothing breaks: the router resolves on `onerror` as well as
  `onload`. It never happens on a first load, so Lighthouse does not see it. `data:` stays OUT of
  `script-src` on purpose: it is a common way to slip a script past a policy.
- SSR routes (`/preview/**`, `/api/*`, password pages) are Worker responses and get no
  `_headers` at all, so the policy never reaches them.

For a full policy (`default-src` and the rest), reid-design-site's `public/_headers`
(2026-09-29) is a tested start, and the header comment in `public/_headers` lists the Studio's
grants. `stack-and-config.md` says why the meta-CSP approach was abandoned.

**Rules for the SAME path do not merge (PORTS.md card 59).** Before adding any rule
other than `/*`, know two things, both measured under `npm run preview`:

- `@astrojs/cloudflare` prepends its own `/_astro/*` rule at build (the immutable
  year-long `Cache-Control`), unless a `/_astro/*` rule in this file already sets
  `Cache-Control`. Add a second `/_astro/*` rule WITHOUT it (say, to detach a CSP) and
  the adapter's rule is silently lost: hashed assets fall back to
  `max-age=0, must-revalidate`, and the detach does not take effect either. So any
  `/_astro/*` rule you write must carry
  `Cache-Control: public, max-age=31536000, immutable` itself; the build log then stops
  printing "Injected immutable Cache-Control for /_astro/* into _headers".
- Rules for DIFFERENT patterns do merge, and two `Content-Security-Policy` headers are
  both enforced (the browser takes the intersection). So a public CSP on `/*` also
  binds `/studio/*` unless that rule detaches it first with
  `! Content-Security-Policy`, then sets the Studio's own.

Check any change to this file with `npm run build && npm run preview` and `curl -sI`
on a page, `/studio/` and one `/_astro/` file. A static file server sends no headers,
so it proves nothing.

### Privacy and analytics

The starter ships in an effectively zero-cookie posture until a site sets `PUBLIC_GA_ID`. The current baseline:

- **Cloudflare Web Analytics** uses no cookies and stores no personal data.
- **Google Analytics 4 is opt-in per site (card 54).** `src/components/Analytics.astro` renders GA4 only when `PUBLIC_GA_ID` is set AND the page is served from the host of `site` in astro.config (card 58) and the visitor is not an automated browser (WebDriver or a Lighthouse / PageSpeed / GTmetrix user agent, card 96), so dev, preview builds, CI and our own test sweeps never report. When it is on, GA4 sets `_ga` cookies: the `/privacy` page's "How traffic is measured" section is derived from `src/lib/analytics-config.ts`, never hand-written, so it cannot claim there is no GA while GA runs (the Reid bug, 2026-09-28).
- **No Facebook/Meta Pixel.** No ad-tracking or retargeting pixels by default. If you add one, design a full consent management platform in BEFORE adding the tracker -- don't bolt it on.
- **Sanity client** reads public published content, no auth cookies.
- **Web3Forms** contact-form submissions go server-side via `fetch`; no cookies set.

**`/privacy` page:** a real privacy policy page ships, driven by the `privacyPage` singleton in Sanity with a plain-voice static fallback. Linked from the footer on every page and from every capture form's consent note. Update this page to reflect your actual data practices before going live.

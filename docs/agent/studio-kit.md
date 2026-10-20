<!-- PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file -->

# The Studio kit

Added 2026-10-17 (PORTS.md card 106). A plain, kind Studio for someone who edits the site on their own: a Home page,
a searchable and printable Site Guide, a Checkup, a staff view with fewer tools and no permanent deletes, Trash instead
of Delete, a note after Publish, and a first-run tour. It is the Sanity version of the staff admin the family's
WordPress sites have. Built first in first-baptist-auburn, then brought to the starter unchanged. Round two
(2026-10-18, PORTS.md card 110) added a calm status line under the top bar, a "Help for this page" panel beside every
document, and a warmer Home (greeting and site name, quick actions, "Pick up where you left off"). Round three
(2026-10-18, PORTS.md card 111, "the Studio remembers") is for an editor alone on Sanity's free plan (three days of
history, administrators only): a failed deploy said plainly with "Try again", a weekly checklist with hand ticks,
a phone-sized Quick update tool, empty lists that explain themselves, and `scripts/restore-doc.mjs` for "put it back
the way it was on Tuesday". Round four (2026-10-18, PORTS.md card 115) brought Home up to the WordPress staff
dashboard: a dated greeting, "Coming up" (what publishes by itself), a Fix-it list by name with Edit buttons, real
visitor numbers from Cloudflare Web Analytics, a "Your pages" map and a "Watch how it is done" row of guide videos.
Card 137 (2026-10-19) made the Studio teach itself: spotlight tours anchored to real Studio UI, a welcome and a
dated "What's new", the site's own recorded clips with captions, Quick update jobs written as data, and scripts
that photograph and film the local Studio.

This doc is PORTABLE: it describes the kit, never one site. A site's own choices (its staff, weekly jobs, extra rules)
are commented in that site's `src/sanity/kit.config.ts`.

## Where it lives

| Piece                   | File                                                                                                                                                 | Notes                                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The plugin              | `src/sanity/kit/index.tsx`                                                                                                                           | `ncsStudioKit(kitConfig)`, added **last** in `sanity.config.ts` plugins (its tools reducer must see every other tool)                                     |
| Site settings           | `src/sanity/kit.config.ts`                                                                                                                           | The ONE site-specific file (NOT portable): staff list, This week jobs, checkup rules, trash types, tour words, feature switches                           |
| Settings shape          | `src/sanity/kit/types.ts`                                                                                                                            | `KitConfig`                                                                                                                                               |
| Home                    | `src/sanity/kit/HomeTool.tsx`                                                                                                                        | First tool, so the Studio opens on it                                                                                                                     |
| Site Guide              | `src/sanity/kit/GuideTool.tsx`, `src/sanity/kit/guide/`                                                                                              | Reads the existing guides (`src/sanity/guides/content.ts`) and renders each with `GuideView`; search reads every word; Print prints only the open guide   |
| Checkup                 | `src/sanity/kit/CheckupTool.tsx`, `src/lib/studio-checkup.ts`                                                                                        | Pure rules over one fetch of every content document; tests in `studio-checkup.test.ts`                                                                    |
| Trash                   | `src/sanity/kit/trash.tsx`, `src/lib/studio-trash.ts`                                                                                                | Snapshot-to-Trash in one transaction; `trashedItem` type; tests in `studio-trash.test.ts`                                                                 |
| Staff view, links, live | `src/sanity/kit/shared.tsx`, `src/lib/studio-kit.ts`                                                                                                 | Pure parts tested in `studio-kit.test.ts`                                                                                                                 |
| Status line             | `src/sanity/kit/NavbarStatus.tsx`                                                                                                                    | `studio.components.navbar` middleware; words from `navbarStatus()` in `src/lib/studio-kit.ts`                                                             |
| Help for this page      | `src/sanity/kit/HelpPanel.tsx`                                                                                                                       | A document inspector: page check plus Checkup findings for the document, then its Site Guide entries                                                      |
| Tour                    | `src/sanity/kit/StudioTour.tsx`                                                                                                                      | Mounted by the kit's layout; once per Sanity user per browser                                                                                             |
| After-Publish note      | `src/sanity/kit/publishNote.tsx`                                                                                                                     | Wraps the stock Publish; keeps `action === 'publish'`                                                                                                     |
| Build time              | `src/pages/build-info.json.ts`                                                                                                                       | Prerendered `{ builtAt, commit }` for Home's "Is it live?"; the commit comes from a Vite define in `astro.config.mjs`                                     |
| Desk: Trash, staff, ids | `src/sanity/structure.ts`                                                                                                                            | Trash list (id `trash`), `staffDesk()` filter (in `kit/shared.tsx`), singleton items carry their document id as their id                                  |
| Deploy status (111)     | `src/pages/api/studio/deploy-status.ts`, `src/lib/deploy-status.ts`, `src/lib/studio-auth.ts`                                                        | GET the newest deploy run's outcome; POST "Try again" (same origin + Sanity session); tests in `deploy-status.test.ts`                                    |
| Home cards (115)        | `src/sanity/kit/HomeCards.tsx`, `src/lib/studio-home.ts`                                                                                             | Coming up, Fix-it list, Visitors, Your pages, and the Panel frame; pure parts tested in `studio-home.test.ts`                                             |
| Google (136)            | `src/lib/google-auth.ts`, `src/lib/studio-google.ts`, `src/pages/api/studio/search.ts`                                                               | GA4 as the Visitors source and the Search Console card, through studio-status (`SITE_DATA`)                                                               |
| Home banner (118)       | `src/sanity/kit/HomeBanner.tsx`, `src/lib/studio-banner.ts`                                                                                          | The navy welcome at the top of Home; `kitConfig.homeBanner`; pure parts tested in `studio-banner.test.ts`                                                 |
| Banner style (135)      | `src/lib/studio-banner-style.ts`, `src/sanity/kit/harness/bannerLooks.ts`                                                                            | `kitConfig.homeBanner.style`: the banner's look as data, and the only hooks a site may select; tested in `studio-banner-style.test.ts`                    |
| Icons (119)             | `src/sanity/brandIcons.tsx`, `src/sanity/artIcon.tsx`, `src/lib/studio-icons.ts`                                                                     | Not the kit plugin: icons by meaning and list-row pictures; the site's art in `brandIconArt.tsx`; tests in `studio-icons.test.ts`                         |
| Design language (128)   | `src/sanity/kit/ui/`, `src/lib/studio-look.ts`                                                                                                       | Shared primitives in the site's own devices (`brand.config.json` `studio.look`); tests in `studio-look.test.ts`                                           |
| Surfaces (131)          | `src/sanity/kit/ui/surfaces.tsx`, `src/sanity/kit/harness/Surfaces.tsx`                                                                              | Tool headings, Home cards, findings, the path checklist, Is it live, quick-update tiles, Home rows and figures (132); see "Every surface in the language" |
| Guide videos (115)      | `src/sanity/kit/GuideVideos.tsx`                                                                                                                     | "Watch how it is done" on Home and in the Site Guide; `videoSource()` in `studio-home.ts`                                                                 |
| Visitors route (115)    | `src/pages/api/studio/visitors.ts`, `src/lib/studio-analytics.ts`                                                                                    | Cloudflare Web Analytics GraphQL through the Worker (same origin + Sanity session); tests in `studio-analytics.test.ts`                                   |
| Weekly ticks (111)      | `src/sanity/kit/weekType.ts`                                                                                                                         | `studioWeek` document per week for hand-ticked jobs; `checklist()` and `weekKey()` in `studio-kit.ts`                                                     |
| Quick update (111)      | `src/sanity/kit/QuickUpdateTool.tsx`                                                                                                                 | Tool `quick-update`, forms from `kitConfig.quickUpdate`; `quickFormErrors()` in `studio-kit.ts`                                                           |
| Empty lists (111)       | `src/sanity/kit/emptyList.tsx`                                                                                                                       | `emptyAwareList()` for `structure.ts`, plus `EMPTY_LIST_BUNDLE` (the default empty words)                                                                 |
| Restore one document    | `scripts/restore-doc.mjs`, `scripts/lib/restore-doc.mjs`                                                                                             | One document from a nightly backup, written back as a draft; dry by default; tests in `restore-doc.test.mjs`                                              |
| Post a photo (125)      | `src/sanity/kit/PostPhoto.tsx`, `src/lib/photo-post.ts`                                                                                              | Quick update's photo action, `kitConfig.postPhoto`; draft only; tests in `photo-post.test.ts`                                                             |
| Earlier versions (125)  | `src/sanity/kit/EarlierVersions.tsx`, `src/pages/api/studio/earlier-versions.ts`, `src/lib/earlier-versions.ts`, `.github/workflows/restore-doc.yml` | Document inspector; nightly backups via CI; tests in `earlier-versions.test.ts`                                                                           |
| Studio app (125)        | `src/lib/studio-app.ts`, `src/pages/studio/manifest.webmanifest.ts`, `src/pages/studio/offline.astro`, `public/studio/sw.js`                         | Manifest, offline page and service worker scoped to /studio/; tests in `studio-app.test.ts`, `tests/studio-app.spec.ts`                                   |

Every file above except `kit.config.ts` and `structure.ts` carries the PORTABLE marker. Nothing in them names a site, a
person or a document type; everything site-specific comes in through `kitConfig`.

## The staff view

- Staff are a **listed** set of accounts in `kitConfig.staff`: Sanity user ids (preferred; they are not personal data,
  so they can sit in a public repo) or email addresses. With an empty list, anyone who is not a Sanity administrator
  gets the staff view. List an editor who is an administrator by id, and then the list decides, not the role.
- Staff see only `staffTools` (Home, Content, Live preview, Site Guide, Checkup), the desk without `staffHiddenPanes`,
  no Delete anywhere (everyday lists get Move to Trash; pages keep their Archive), only "Bring it back" in the Trash,
  and no perspective ("Drafts") menu or Releases link (hidden by CSS; see `STAFF_CSS`).
- Either way can be switched for one browser tab from the bottom of Home ("Show the full Studio" / "See the staff
  view"). The choice lives in `sessionStorage` and the page reloads, because Sanity builds tools and menus once.

## Home's cards

- **This week**: `kitConfig.thisWeek` jobs, each a GROQ check given `$weekStart` and `$now`; true or a positive number
  shows Done. An empty list hides the card (the starter ships none). Card 111: `check: 'checkup'` ticks a job when the
  Checkup has nothing in "Needs doing", and `manual: true` (or no check at all) makes a job the editor ticks by hand.
  Hand ticks live on one `studioWeek` document per week (id `studioWeek-<first day>`), written straight to the dataset,
  so the list starts fresh each week with nothing to reset. Home's lists, the Checkup and the "is it live?" check skip
  the type. **A site's publish webhook filter must skip it too**, or a tick rebuilds the site: add `"studioWeek"` to
  the deny-list. `thisWeekTitle` renames the card ("Sunday checklist").
- **Is it live?**: `/build-info.json` against the newest published `_updatedAt`. Up to date, Updating, or (after
  `liveSlowAfterMinutes`) "taking longer than usual". Re-checks every minute. Until the Sanity publish webhook is set
  up, a publish waits for the next deploy, and the card says so after `liveSlowAfterMinutes`. Card 111: when the
  deploy route says the newest deploy failed, the card says "The last update didn't go through" with "Try again".
- **Quick update** button (card 111): beside "Edit the website" when `kitConfig.quickUpdate` has forms.
- **Fix-it list** (card 115, replaced Site health): the Checkup's counts, then its findings one row per page, by name,
  with what is wrong and an **Edit** button that opens the page at the field (`fixItList()` in `studio-home.ts`, at
  most six rows, the urgent ones first), and **See the whole list** for the Checkup. It reuses the Checkup's own run
  (`useCheckup`): the generic rules now return `items` (`{ name, target }` per document, built by `itemsOf()`) and a
  short `itemLabel`. A site rule without `items` still shows, as one row from its label. "For information" never shows.
- **Coming up** (card 115): drafts with a `publishAt` ("Publish automatically at", card 111), soonest first, the time in
  plain words ("Tomorrow at 9:00 AM"; a passed time reads "Any minute now", since the job runs half-hourly), each with
  Open (`comingUp()` and `whenWords()`). It appears only when some document type in the schema has a `publishAt`
  field, and `features.comingUp: false` hides it. Empty: one sentence on how to schedule a page.
- **Recent edits**: the last eight things changed, unpublished ones flagged.
- **Visitors** (card 115): the last seven days' visits against the seven before, a four-week daily bar chart in plain
  SVG (the last week at full strength, a `<title>` per bar), the five most-read pages and how people found the site
  (search, typed it in, social, other sites). From `/api/studio/visitors/`, below. Without the Worker settings the card
  says "Not set up yet"; `features.visitors: false` says so without asking. Since card 136 the numbers can come from
  Google Analytics 4 instead of Cloudflare.
- **Found on Google** (card 136): Search Console's clicks, appearances and average place over four weeks, the searches
  and the pages, drawn right under Visitors by the same component. Hidden until it is set up, and hidden with
  `features.visitors: false`.
- **Your pages** (card 115, `kitConfig.pages`): groups of one-click links (`PageMapGroup`: a title, `links` of
  `{ title, target, detail?, icon? }`, and optionally `listType`, which lists every document of that type by name, so a
  custom page built tomorrow appears without a config change; `resolvePageMap()` skips anything already linked and marks
  never-published ones). Missing or empty hides the card.
- **Watch how it is done** (card 115): the guides with a `video`, three on Home ("N more in the Site Guide"), all of them
  at the top of the Site Guide, and a Watch button on an open guide. Hidden when no guide has one. See "Guide videos".
- **Dated greeting** (card 115): "Sunday, October 18" above "Good morning, Ann" (`todayLine()`), and a footer line
  "Need help? Site Guide or Ask <helper>" (the Ask link is the mailto when `PUBLIC_STUDIO_HELP_EMAIL` is set).
- **Welcome** (card 110, a banner since card 118): "Good morning, Ann" and the workspace title (the site's name, from
  `brand.config.json`) in the theme's heading font, on the navy banner. See "Home's banner" below.
- **Quick actions** (`kitConfig.quickActions`, card 110): up to four large buttons for this site's real jobs, each a
  `StudioTarget` (edit a document, create one from a type or template, open a tool) with an `@sanity/icons` icon.
  Missing or empty shows nothing extra; the "Edit the website" and "How do I...?" buttons stay either way.
- **Pick up where you left off** (card 110): the six newest unpublished drafts with Open, Publish and Discard changes
  (with a confirm). Hidden when there are none. Publish here is the stock publish operation, so it is offered only
  when the draft passes validation and its web address is unchanged; otherwise the row says why and Open is the way
  (the full Publish in the document runs the safe-rename redirect). Discard is offered only when a published copy
  exists. Sanity documents carry no author, so on a site with several editors this lists everyone's drafts.
- **Ask** (`helper.name`): plain words, plus an email button when `PUBLIC_STUDIO_HELP_EMAIL` is set at build time
  (kept out of the repo on purpose).

## The status line (card 110)

A thin line under the top bar: "Website up to date" (neutral), "Updating the website, about 3 minutes" counting down
from `typicalUpdateMinutes` (default 3, primary tone), and "The website update is taking longer than usual" past
`liveSlowAfterMinutes` (caution, with a Details link to Home). It reads the same `useLiveData()` hook as Home's Is it
live? card (`kit/shared.tsx`): on mount, every minute, on window focus, and four seconds after a Publish lands (the
`PUBLISHED_EVENT` that `publishNote` and Home's Publish fire). With no `/build-info.json` it draws nothing.
`features.navbarStatus: false` removes it.

## Sign-in method (card 129)

The kit's Worker routes (`/api/studio/*`) check a Bearer session token, which the Studio keeps in localStorage under
`__studio_auth_token_<projectId>` (`studioToken()` in `kit/shared.tsx`). Sanity's default sign-in is `dual`: a cookie
where the browser allows one, a token otherwise. A cookie session sends no Bearer header, so every kit route answers 401,
and which editors got a cookie depended on when and how they last signed in. `sanity.config.ts` therefore sets
`auth: { loginMethod: 'token' }`. After a site takes that line, each editor signs out and in once; when a browser still
has no token the kit says so plainly (`SIGN_IN_ONCE_NOTE`, `signInNote()` in `src/lib/studio-signin.ts`) instead of "sign
in again". The routes keep their own 401 words for a request that did carry a token.

`recentIgnoreTypes` (kit config, optional) hides types from Home's Recent edits and Pick up only. `checkup.ignoreTypes`
also drives the Checkup and the Before you publish panel; use `recentIgnoreTypes` for documents a script writes
(nightly imports) that should still be checked.

## "The last update didn't go through" (card 111)

The build-time comparison cannot tell a slow build from a failed one, so a failed build used to read as "taking longer
than usual" for ever. `GET /api/studio/deploy-status/` reads the deploy workflow's newest runs on the production branch
from the GitHub API with a server-side token and answers `{ configured, state, at }`, state `ok`, `failed`, `running`
or `unknown` (`deployStatusFromRuns()`: the newest run decides; one still going is `running`; cancelled and skipped runs
are passed over). Cached 60 seconds per Worker instance. `useLiveData()` reads it with the build time, and a `failed`
outranks everything: the status line turns critical, "The last update didn't go through. `<helper>` has been told.",
and Home's card says the same at more length, both with **Try again**.

Try again is `POST` to the same route. It needs the site's own Origin (or `Sec-Fetch-Site: same-origin`) and the
Studio's session token as `Authorization: Bearer`, which the route checks with Sanity's `/users/me` on the project's
API host (a member has a role; `src/lib/studio-auth.ts`). It refuses while a deploy is running and within five minutes
of the last one (per Worker instance; the workflow's concurrency group is the backstop), then starts the workflow with
`workflow_dispatch`. Nothing but the one-word state ever reaches the browser.

"Has been told" is true because the site's `deploy.yml` opens (or comments on) one `deploy-failed` issue when a run
fails, which GitHub emails to the repo's watchers, and closes it on the next green run.

Settings, all on the Worker: secret `GITHUB_DEPLOY_TOKEN` (a fine-grained token on that one repository with **Actions:
Read and write** only), var `GITHUB_REPO` (`owner/name`, in `wrangler.jsonc`), optional `DEPLOY_WORKFLOW` (default
`deploy.yml`) and `DEPLOY_BRANCH` (default `main`). Without the token the route answers `configured: false` and the
Studio behaves exactly as before.

## Visitor numbers (card 115)

`GET /api/studio/visitors/` answers only a signed-in Studio member: the site's own Origin (or `Sec-Fetch-Site:
same-origin`) else 403, then the Studio's session token as `Authorization: Bearer`, checked with Sanity's `/users/me`
(`studio-auth.ts`), else 401. Only then does it say `{ configured: false }` (no settings) or ask Cloudflare. One
GraphQL call (`rumPageloadEventsAdaptiveGroups`, three aliases: visits by `date` over 28 days, page views by
`requestPath` and visits by `refererHost` over the last seven days) is mapped by `visitorsReport()`: missing days are
zero, the week totals come from the series so they always agree, `/studio`, `/preview` and `/api` paths are left out
of the most-read list, the site's own host is left out of the sources, and an answer with GraphQL errors throws (the
card says "could not load", never false zeros). Cached ten minutes per Worker instance; `Cache-Control: private,
no-store`.

Settings, all on the Worker: secret `CF_ANALYTICS_TOKEN` (a Cloudflare API token with **Account Analytics: Read** only),
vars `CF_ACCOUNT_ID` and `CF_WEB_ANALYTICS_SITE_TAG` (32 hex each; the site tag is not the beacon token). The step by
step is in OPERATIONS.md, "Visitor numbers". The query's field names were taken from the Web Analytics dashboard's own
query; check the card against the dashboard the first time a site switches it on.

**AI assistants (card 123).** Referrers from AI assistants (`AI_HOSTS`: chatgpt.com, chat.openai.com, perplexity.ai,
copilot.microsoft.com, gemini.google.com, claude.ai, you.com, phind.com, poe.com, meta.ai, chat.mistral.ai,
chat.deepseek.com, grok.com) are their own source group, "AI assistants", checked before search so Gemini does not read
as Google. A fourth alias, `referersBefore`, reads the seven days before the last seven, so the report carries
`ai: { thisWeek, lastWeek }` and the card adds one line under the sources when either is non-zero. Many assistant
visits arrive with no referrer and count as "Typed it in", so the number is a floor.

## Google Analytics and Search Console (card 136)

The family's other sites count visitors with Google Analytics 4 (`PUBLIC_GA_ID`), not Cloudflare. Card 136 lets the
Visitors card read GA4 instead, the way Site Kit does on WordPress, and adds a Search Console card, **Found on Google**.
Both read through the studio's own Worker, **studio-status**, over a service binding: it holds the studio's one
read-only Google service account and each site's properties, so no site Worker holds a Google key. Nothing new loads
on the public site.

**Which source.** `pickProvider()` (`src/lib/studio-google.ts`): `ANALYTICS_PROVIDER` (`cloudflare` or `ga4`) wins
when it names a source that is set up; unset, Cloudflare is used when its three settings are there (so a card 115 site
keeps its numbers), then GA4. A site with neither still says "Not set up yet".

**Through studio-status (the usual way).** The site's Worker binds `SITE_DATA` to studio-status's `SiteData` entrypoint
and names itself with the `SITE_DATA_KEY` var (`fbcm`, `presacademy`, `reid`, `mas`, `stonesteps`, `ncs`). This repo
builds the report bodies (`ga4Requests()`, `searchRequests()`) and maps the answers; studio-status
(`src/site-data.ts` there) adds the property, the token and a 3-hour cache, and answers `{ ok: false, reason }` rather
than throwing: `not-set-up` (no Search Console property for that site) keeps Found on Google hidden; `connect`,
`unknown-site` and `no-key` are "finish connecting"; `failed`, or a binding that throws (studio-status not deployed
with `SiteData` yet), is "could not load". RPC is reachable only through a binding in the same account, so it needs no
token. The binding wins when the fallback settings are also present.

**The optional fallback: signing in from the site's own Worker, with no dependency** (`src/lib/google-auth.ts`), for a
site outside the studio's account. The Worker builds an RS256 JWT from the key's `client_email` and `private_key` with WebCrypto (`importKey('pkcs8')`, `sign`), swaps it at
`https://oauth2.googleapis.com/token` for an access token with the two read-only scopes (`analytics.readonly`,
`webmasters.readonly`), and keeps the token in memory until a minute before it expires (`workerTokens`, shared by both
routes). A 401 from an API drops it. The key, the JWT and the token are never logged; errors carry the status and
Google's error code only.

**GA4** is one `batchRunReports` call to the Data API (`v1beta/properties/{id}`) with four reports, mapped by
`ga4Report()` onto the same `VisitorsReport` the Cloudflare source makes: `sessions` per `date` over 28 days (the
week totals come from the series), `pagePath` by `screenPageViews` over the last seven days (`/studio`, `/preview`,
`/api` left out), and `sessionDefaultChannelGroup` + `sessionSource` + `sessionMedium` by `sessions` for the last
seven days and the seven before. `ga4Group()` sorts them into the card's groups:

- GA4's own **AI Assistant** channel, or the `ai-assistant` medium, goes straight to "AI assistants". Sessions GA4 files
  elsewhere fall back to the source name (chatgpt, perplexity, copilot, gemini, claude and the rest, bare or as hosts).
- Organic and Paid Search are "Searched for it", Direct is "Typed it in", Organic and Paid Social are "Social media",
  Referral is "A link on another website" (the site's own host left out). Unassigned and anything else is judged by its
  source, as the Cloudflare referrer groups are.

The card's small print says "From Google Analytics, updated a few hours ago": GA4 lags, so it never implies real time.
A visit is a GA4 session. Cached thirty minutes per Worker instance.

**Search Console** is `GET /api/studio/search/`, protected exactly like the Visitors route (same origin else 403, a
Sanity member by `/users/me` else 401, then the settings) and failing closed the same way. Four `searchAnalytics/query`
calls (totals now, totals before, `query` and `page` with `rowLimit: 5`) over 28 days **ending three days ago**, since
Search Console runs two to three days behind; the card says so. `searchReport()` maps them: clicks ("Clicks from
Google") and impressions ("Times you appeared") against the 28 days before, the average place to one decimal (lower is
better, and the words say which way it moved), "Searches that found you" and "Pages people opened from Google", top
five each by clicks. Cached thirty minutes per Worker instance.

**States.** Not set up: the Visitors card behaves as before, and Found on Google is not drawn at all. A refused key, a
key that is not a key, or a 401/403 from Google (the service account is not a user on the property, or the API is off)
answers `{ configured: true, connect: true }`, and the card says calmly "Ask <helper> to finish connecting Google", with
no detail. Anything else is the usual "could not load just now".

**Setting it up (once per site).**

1. Make sure studio-status knows the site: an entry in `SITE_DATA` in its `src/site-data.ts` (GA4 property id, and the
   Search Console property if there is one), deployed. Its service account needs Viewer on the GA4 property and a user
   (Restricted is enough) on the Search Console property.
2. In the site's `wrangler.jsonc`, uncomment the card 136 block: the `SITE_DATA` service binding (service
   `studio-status`, entrypoint `SiteData`) and `"SITE_DATA_KEY": "<key>"` in `vars`. Add `"ANALYTICS_PROVIDER": "ga4"`
   only when the site also has the Cloudflare settings.
3. Deploy, open `/studio`, and check the two cards against GA4 and Search Console. "Finish connecting Google" means the
   key is not in studio-status, or its service account lacks access (`npx wrangler tail` on the site shows
   `visitors (ga4): studio-status answered connect.`).

**The fallback, for a site outside the studio's account.** Switch on the Google Analytics Data API and the Search
Console API in a Cloud project, create a service account and a JSON key, add its email as a Viewer on the GA4 property
and a user on the Search Console property, then `npx wrangler secret put GOOGLE_SERVICE_ACCOUNT` (the JSON, whole) and
the vars `GA4_PROPERTY_ID` (numeric, not the `G-` id) and `SEARCH_CONSOLE_SITE` (`sc-domain:<domain>` or
`https://<domain>/`). Either half can be set up alone.

**Privacy.** No new cookies and nothing new on the public pages: the GA4 tag the site already loads is unchanged, and
this is read-only reporting, from studio-status (or the fallback key) to Google, with a service account that can
only read. Numbers reach only signed-in Studio members.

**Bench.** `/kit-harness/guide/?view=surfaces&part=google` draws the GA4 Visitors card, Found on Google and the
connect state with made-up numbers.

## Guide videos (card 115)

A guide in `src/sanity/guides/content.ts` takes an optional `video`:

- a file in `public/`, written as its path (`video: '/guides/post-a-notice.mp4'`), played in a `<video>` player;
- a YouTube link (watch, youtu.be, shorts or embed; played through `youtube-nocookie.com`) or a Vimeo link, played in
  their own player;
- any other https address, opened in a new tab.

Anything else (`javascript:`, `//host`, empty) is ignored (`videoSource()`, tested). Nothing loads until Watch is pressed
(a dialog), so Home never pulls in YouTube on its own. Keep clips under two minutes, record at 1280 wide, and say the
job in the guide's title. A site with a full CSP must allow `frame-src https://www.youtube-nocookie.com
https://player.vimeo.com` on `/studio/*`.

## Quick update (card 111)

A tool for the jobs an editor does from a phone: `kitConfig.quickUpdate` is a list of forms, each a few plain fields
(`string`, `text`, `date`, `datetime`, `url`; `required`, `max`, an `initial(now)` value) and a `build(values, { now, client })` (it may be async)
that returns the whole document. The tool shows the forms as big buttons, opens one at a time with nothing else on the
screen (no page builder, no tabs), checks the answers with `quickFormErrors()`, then **creates the document published**
and fires `PUBLISHED_EVENT`. Because it skips the Studio's validation, `build` must return a document that is complete
and valid for its type (slugs, required fields). Afterwards it offers "Open it in the full editor". Built for 375px
first: one column, 72px buttons, 16px-plus inputs. With `kitConfig.postPhoto` set, "Post a photo" (card 125) is the
first button, and it alone is enough to give the tool; unlike the forms it saves a DRAFT. Add `'quick-update'` to `staffTools` for the staff view.
`lastSunday()` and `comingSunday()` in `studio-kit.ts` are there for `initial` values.

## Spotlight tours, welcome and What's new (card 137)

Card 106's one stepped dialog is now a tour engine (`kit/StudioTour.tsx`, pure half `src/lib/studio-tour.ts`, tested
in `studio-tour.test.ts`). A tour is a list of stops; each stop dims the screen, cuts a lit hole round its anchor and
opens a popover beside it in the card 128 language (the tour's name as an eyebrow on the site's deep colour, the
step's art on a stone, the title in the site's lettering, the words, a row of stones for progress, and Back, Next and
Skip). Focus moves into the popover and stays there (Tab cycles), Right and Left step, Escape skips, focus goes back
where it was. Reduced motion: no glide. Under 600px the popover is a sheet along the foot of the screen (the top, when
the anchor is low). An anchor that is not on screen after 1.5 s is not an error: the popover sits in the middle.

The data lives in the site's own `src/sanity/studio-tours.ts` (plain data, so `studio-tour.test.ts` checks it:
references, dates, no em-dashes) and is passed through `kit.config.ts` as `tours`, `welcome` and `whatsNew`. The old
`tourSteps` still work: with no `tours`, they become one first-run tour with no anchors.

```ts
// src/sanity/studio-tours.ts
import type { TourDef, WelcomeConfig, WhatsNewEntry } from '../lib/studio-tour.ts';
export const TOURS: TourDef[] = [
  {
    id: 'first-run',                 // stable: storage remembers it
    title: 'A quick tour',           // the eyebrow on every popover
    role: 'everyone',                // 'everyone' | 'editor' (full Studio) | 'staff' (staff view)
    firstRun: true,                  // offered once, the first time (the first match for the person's view)
    tool: undefined,                 // or a tool name: this tour is that tool's "How this screen works"
    version: 1,                      // bump to show it again to people who saw it
    steps: [
      {
        anchor: 'home-this-week',    // see the anchor list below; optional
        title: 'This week',
        body: 'One or two plain sentences.',
        short: 'Week',               // optional; the stone's tooltip
        meaning: 'step',             // optional BrandIconKey for the stone's art
        placement: 'auto',           // 'auto' | 'top' | 'bottom' | 'left' | 'right' | 'center'
        goTo: { tool: 'home' },      // optional StudioTarget opened first
      },
    ],
  },
];
export const WELCOME: WelcomeConfig = { title, body, points?: string[] /* up to 4 */, tour?: 'first-run', version?: 1 };
export const WHATS_NEW: WhatsNewEntry[] = [{ date: '2026-10-19', title, items: string[], tour?: 'first-run' }];
```

**Anchors** (`anchorSelectors()`):

| Anchor                                                        | Lights up                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| a kit hook                                                    | `home-banner`, `home-quick-actions`, `home-pick-up`, `home-this-week`, `home-is-it-live`, `home-fix-it`, `home-coming-up`, `home-recent`, `home-ask`, `home-visitors`, `home-pages`, `home-videos`, `home-help`, `quick-list`, `guide-index`, `guide-videos`, `navbar-status` (each a `data-tour` attribute) |
| `quick-submit`, `quick-pick`, `quick-field-<name>`            | an open Quick update form's button, its pick list, one of its fields                                                                                                                                                                                                                                         |
| `newsletter-send-everyone`                                    | the newsletter's "Yes, send it to everyone" (card 127)                                                                                                                                                                                                                                                       |
| `field:<path>`                                                | a field in the open document (`field:raceDate`; Sanity's `data-testid="field-<path>"`)                                                                                                                                                                                                                       |
| `quick:<form id>`                                             | one Quick update tile (`data-quick`; `quick:post-photo` for Post a photo)                                                                                                                                                                                                                                    |
| `tool:<name>`                                                 | a tool tab in the top bar (`tool:structure`, `tool:quick-update`)                                                                                                                                                                                                                                            |
| `tools`, `search`, `account`                                  | the tool row, the search box, the avatar menu                                                                                                                                                                                                                                                                |
| `publish`, `document-actions`, `document-menu`                | the Publish button, the bar at the foot of an open document, the "..." beside Publish                                                                                                                                                                                                                        |
| `document-form`, `pane:list`, `pane:document`, `new-document` | the open form, the first list pane, the document pane, the "+" on a list                                                                                                                                                                                                                                     |
| `css:<selector>`                                              | anything else                                                                                                                                                                                                                                                                                                |

Sanity's own names are lists of selectors tried in order (`SANITY_ANCHORS`), because Sanity renames test ids between
majors. When one stops matching, fix it there and here; the tour still runs (centred) meanwhile. A stop on a document
needs `goTo: { doc, type }` first, since Publish is only on screen with a document open.

**When things open.** First visit: the welcome (if set), whose "Show me around" starts the person's first-run tour;
with no welcome, that tour opens by itself. A new person's changelog is marked read. Later visits: What's new entries
dated after the last one this person saw, newest first, once. Home's foot has "Show me around", "How this screen
works" (the `home` tool tour, if any) and "What's new"; the Site Guide has "Show me around" and its own tool tour;
Quick update and the Checkup show "How this screen works" under their heading when a tour names their tool
(`TourButton`, any surface can use it). Code can call `startTour(id?)` or fire `TOUR_OPEN_EVENT` with `{ detail: { id } }`.

**Remembering.** localStorage, per Sanity user: `ncs-studio-kit:<user>:tour:<id>:v<version>`,
`...:welcome:v<version>`, `...:whats-new` (the newest date seen). The card 106 key `ncs-studio-kit-tour-v1:<user>`
counts as having seen `first-run`. When storage throws, nothing opens by itself (never nag). The capture scripts set
`ncs-studio-kit:quiet` so nothing covers a recording; clear it by hand if a browser ever has it.

## Quick update jobs as data (card 137)

A form may declare a `job` instead of a `build` function; the kit does the saving (`src/lib/studio-quick-jobs.ts`,
tested). Each form keeps its `id`, `title`, `detail`, `icon` or `meaning`, `submitLabel`, and the done screen's
`doneTitle` and `doneMessage`. Card 111 forms with `build` keep working.

```ts
quickUpdate: [
  // create: a new document, published (draft: true saves a draft instead)
  { id: 'notice', title: 'Put up a notice', meaning: 'notice',
    job: { kind: 'create', type: 'notice', defaults: { showOnHome: true }, slugFrom: 'title', draft: false },
    fields: [
      { name: 'title', title: 'Headline', kind: 'string', required: true, max: 80 },
      { name: 'body', title: 'The notice', kind: 'text', as: 'blocks' },      // Portable Text paragraphs
      { name: 'until', title: 'Take it down after', kind: 'date', path: 'display.until' },
    ] },
  // edit: change fields on one document (a singleton); the form starts from what is there
  { id: 'times', title: 'Change the service times', job: { kind: 'edit', doc: 'siteSettings' },
    fields: [{ name: 'sunday', title: 'Sunday', kind: 'string', path: 'facts.sundayTime' }] },
  // append: add an item to a list on one document (top by default; at: 'end' for the bottom)
  { id: 'prayer', title: 'Add a prayer request', job: { kind: 'append', doc: 'prayerList', array: 'items', itemType: 'prayerItem', at: 'start' },
    fields: [{ name: 'text', title: 'The request', kind: 'text', required: true }] },
  // upload: one file or picture into one field (the kit draws the picker)
  { id: 'bulletin', title: 'Upload this week\'s bulletin', job: { kind: 'upload', doc: 'bulletinPage', field: 'file', asset: 'file', accept: 'application/pdf' } },
  // toggle: one true/false field, with what each state says
  { id: 'banner', title: 'Banner on or off', job: { kind: 'toggle', doc: 'siteSettings', field: 'banner.show', onLabel: 'The banner is showing', offLabel: 'The banner is hidden' } },
  // edit with pick: choose the document from a list first (newest first), then edit a few fields
  { id: 'event', title: 'Change an event', job: { kind: 'edit', pick: { type: 'event', filter: 'date >= now()', order: 'date asc', titleField: 'title', label: 'Which event?' } },
    fields: [{ name: 'time', title: 'Start time', kind: 'datetime', path: 'start' }, { name: 'photo', title: 'Photo', kind: 'image' }] },
  // link: a tile that opens another tool, document or list, keeping that tool's own safeguards
  // (the newsletter's test send comes first; Quick update never sends mail itself)
  { id: 'newsletter', title: 'Send the newsletter', job: { kind: 'link', target: { tool: 'newsletter' } } },
  // when: any form shows only in its season ('MM-DD' every year, may wrap the new year; 'YYYY-MM-DD' once)
  { id: 'race-week', title: 'Race week notice', when: { from: '10-18', to: '10-26' }, job: { kind: 'create', type: 'notice' },
    fields: [{ name: 'title', title: 'Headline', kind: 'string', required: true }] },
  // schedule: a new document saved as a DRAFT with its publish time (the kit asks "When should it go up?")
  { id: 'later', title: 'Post something for later', job: { kind: 'schedule', type: 'notice', at: 'publishAt', slugFrom: 'title' },
    fields: [{ name: 'title', title: 'Headline', kind: 'string', required: true }] },
],
```

`postPhoto.tileLead` and `postPhoto.draftNote` reword Post a photo's "saved as a draft" lines (a shop: "Saved for you to check before it goes in the shop.").

`postPhoto.stories` (card 143) adds documents that keep a photo list of their own, such as a room story's `gallery`, to the places a photo can go: `{ types: ['project'], field?: 'gallery', altField?: 'alt', captionField?: 'caption', noun?: 'Room story' }`. Each document appears as "Room story: Title (n photos)"; the photo goes onto the DRAFT (made from the published copy when there is none), alt text required, never published. One photo per pass, with "Post another photo" on the done card. `galleryTypes` may be empty when only stories are offered. `postPhoto.altExample` (card 144) swaps the church example in "Describe the photo" for one in the site's world, and `postPhoto.emptyNote` words the line shown when there is nowhere to put a photo yet (default: "There is no room story to add a photo to yet. Start one in the full editor first." for a stories-only site).

Field kinds: `string`, `text`, `date`, `datetime`, `url`, `number`, `boolean` (a checkbox; its `description` is the
words beside it), `select` (`options: [{ title, value }]`), `file`, `image` (`accept`). Every field takes `path`
(dot-separated, default its `name`), `as: 'blocks' | 'slug'`, `required`, `max`, `description`, `initial(now)`.
An `edit` names `doc` (a singleton) or `pick` (`{ type, filter?, order?, titleField?, label? }`: published documents of the type, up to 60). A `link` job draws a tile that goes to `target` (any StudioTarget) with no form. `when` hides a form outside its season.
Edit, append, upload and toggle write to the published document AND its draft when one is open (so the two never
drift), creating the published document if it is missing; an emptied box in an edit clears that field. Schedule needs
the type to have the `publishAt` field (`publishAtField()`) and the publish-due workflow; Home's "Coming up" lists it.
Like card 111, a job skips the Studio's validation: put every required field of the type in `fields` or `defaults`.

## Guide videos, the site's own clips (card 137)

On top of card 115's links, a site keeps its own recorded clips in `src/sanity/guides/videos.ts` (site-owned,
`GuideVideoData` in `src/lib/guide-videos.ts`): `{ title, src: '/guide-videos/x.mp4', webm?, poster, captions (.vtt),
duration?, width?, height? }`, files in `public/guide-videos/`. A guide names a clip by KEY, as its `video`
(`video: 'post-a-notice'`) or as a body block (`{ kind: 'video', key: 'post-a-notice', caption? }`). The Home "Watch
how it is done" row and the Site Guide's row show the poster (a lazy image) with Play; pressing it puts the `<video>`
in place (webm then mp4 sources, English captions on by default), so nothing heavy loads until asked. An unknown key
plays nothing and the row hides itself. `guide-videos.test.ts` checks every entry's files, poster and captions, an
8 MB ceiling, and that every key a guide names exists.

## Pictures and videos from the local Studio (card 137)

Two scripts drive the LOCAL Studio in Playwright's Chromium, through `tools/studio-media/session.mjs`: by default the
kit harness (`http://localhost:4321/kit-harness/studio`, the real Studio signed in as a pretend administrator, reading
the dataset; set `base` for another address). They cover the account avatar and the editor's name (the harness's
"Ann Harness", plus `cover.selectors` and `cover.names`), refuse every write to Sanity (mutations, actions and uploads
are aborted), mark the welcome and tours as seen so nothing covers the screen, and run one at a time
(`tools/.studio-media.lock`). Pass `--serve` to start and stop the dev server; on Nathan's PC wrap the whole command
in the machine build lock. Steps (shared, checked by `scripts/lib/studio-media.mjs`): `goto {path}`, `click {target}`
(`fake: true` draws a ring instead of clicking), `hover`, `type {target, text}`, `press {key}`, `wait {ms}`,
`waitFor {target}`, `scroll`, `ring {target, hold}`, `caption {text}`; any step may carry `caption` and `ms`. A target
is CSS, `text:Words` or `role:button|Name`.

**Screenshots** (card 130's registry): `node tools/guide-shots/capture.mjs [key ...] [--serve]` reads
`tools/guide-shots/shots.json` (`{ base?, viewport?, cover?, shots: [{ key, path, steps?, waitFor?, clip?, pad?,
quality?, measure?: { "label": "selector" } }] }`), writes `public/guide-shots/<key>.webp`, and prints the size, the
weight and the entry for `src/sanity/guides/shots.ts` with a ring and a stone already placed for every `measure`
control. Write the alt text yourself.

**Videos**: `node tools/tutorial-videos/record.mjs tools/tutorial-videos/scripts/<slug>.json [--serve] [--music <path>]`.
A script is `{ slug, title, start?: '/', viewport?, ready?, settle?, tail?, cover?, steps }`; a step with
`poster: true` is the poster (else the screen after the first step). Captions: plain, second person, at most two lines
of about 44 characters, no em-dashes. With ffmpeg on PATH it trims the boot, writes an H.264 mp4 and a VP9 webm;
without, it keeps Playwright's webm. Always a VTT and a poster. It prints the `videos.ts` entry. Then
`node tools/tutorial-videos/checkframes.mjs <slug>` tiles one frame per caption into `tools/tutorial-videos/chk/`:
look at every one (caption matches the screen, no name or avatar). Keep clips 30 to 90 seconds at 1280 by 800.

**Music.** `--music <path>` or `TUTORIAL_MUSIC=<path>` mixes a bed under the clip: levelled to -22 LUFS, faded in over
1 s and out over the last 2 s, looped when the clip is longer and trimmed to it. No path: silent. Keep the track
OUTSIDE the repo (Nathan's is in `_assets/video-music/` at the Projects root): the repos are public and the track's
licence is not theirs. Only the finished clips are committed; `.gitignore` drops `*.mp3`, `*.wav`, `work/` and `chk/`
under `tools/`.

## Empty lists (card 111)

Sanity's empty list says "No documents of this type", and the words cannot be set per list (sanity 6.19). The plugin
replaces the default with "Nothing here yet. Press the + button at the top of this list to create the first one."
(`EMPTY_LIST_BUNDLE`, an i18n bundle for the `structure` namespace; `features.emptyStates: false` turns it off). For the
lists an editor uses, `emptyAwareList(S, context, { id, title, type, icon, explain, list? })` in `structure.ts` counts
the type's documents first (drafts included): with any, it is the ordinary list; with none, a small pane says what goes
there and has **Create the first one** (the router's create intent, so initial values still apply). The structure tool
re-resolves a pane when the path to it changes, so the real list shows once the first document exists.

## Restoring one document (card 111)

The free plan's history is three days and administrators only, so an editor's "undo something from earlier in the
week" goes to the developer: `node scripts/restore-doc.mjs <docId> [--from <date | file>]`. It downloads the newest
(or the dated) `sanity-backup` artifact with `gh`, decrypts it in memory with `BACKUP_PASSPHRASE`, finds the document
(the published copy, else its draft), prints a field-by-field summary against what is there now, and with `--apply`
(plus `NCS_PRODUCTION_WRITE=yes` on production) writes it back **as a draft**, so the editor reviews it and publishes,
or presses Discard changes to undo the restore. Artifacts last 14 days; pass an R2 copy's file for anything older.

## Earlier versions (card 125)

A document inspector ("Earlier versions" in the document's menu) that reaches the nightly backups, so an editor can go
back further than the free plan's three days without asking anyone. It never decrypts anything itself:

1. **Panel** (`EarlierVersions.tsx`): `GET /api/studio/earlier-versions/?backups=1` lists the nights GitHub still
   keeps (newest first, one per night, at most 14). "Look for this page in the backups" POSTs `{ action: 'scan', id }`
   and polls `?request=<id>` every 8 seconds (the request id survives closing the panel, in sessionStorage). Each night
   that has the document shows which fields differ from now by their form TITLES and list lengths ("Title, Sections (6
   now, 5 then)"); "Put this version back as a draft", then a confirm, POSTs `{ action: 'restore', id, run }`.
2. **Worker** (`earlier-versions.ts`): every call needs the same origin AND a signed-in project member who is not
   only a viewer (`canEdit()` over the roles `verifyStudioUser` now returns); fails closed without
   `GITHUB_DEPLOY_TOKEN`/`GITHUB_REPO`. A restore must name a backup run it just listed. Rate limit per Worker
   instance: one start per editor per 20 seconds, 10 an hour each, 30 an hour in all. It dispatches
   `restore-doc.yml` with a fresh request id in the run's title, finds the run by that title, and when it finishes
   reads the job log for the marker line (`NCS_EARLIER_VERSIONS` or `NCS_RESTORE`, JSON).
3. **CI** (`restore-doc.yml`): checks the inputs again (they reach the shell only as env vars), then runs
   `scripts/restore-doc.mjs`: `--scan --no-values` (reads 14 backups, writes nothing) or `--run <id> --no-values`
   (dry run) followed by the same with `--apply` and `NCS_PRODUCTION_WRITE=yes` on that one step. One run at a time
   (concurrency group). The draft is `createOrReplace` of `drafts.<id>`: Publish puts it live, Discard changes undoes it.

**Why value-free.** The answer travels through the run log, and a public repository's logs are public. So in CI the
script prints field names and list lengths, never what a field said. The editor sees the words in the restored draft
and in Sanity's "Review changes".

**Without the settings** (or for a viewer) the panel says why and offers "Ask <helper> to restore this" (email when
`PUBLIC_STUDIO_HELP_EMAIL` is set, and "Copy the details"). `features.earlierVersions: false` hides it.

## The Studio on a phone (card 125)

- **Manifest**: `/studio/manifest.webmanifest` from `studioManifest()` (`src/lib/studio-app.ts`): `id` and
  `scope` `/studio/`, `display: standalone`, the brand name, `theme_color` the navy chrome, `background_color`
  the paper, icons `/icon-192.png`, `/icon-512.png` and `/icon-maskable-512.png` (`npm run favicon`, or
  `npm run favicon -- --maskable-only` for just that one; an existing file, perhaps drawn by hand, is kept unless `--force-maskable`). `studioEdges.app` sets `shortName` and `start`
  (`'home'` or `'quick-update'`). Only the boot page links it; the public site keeps `/site.webmanifest`
  (display browser).
- **Service worker**: `public/studio/sw.js`, registered by the boot page in a production build only, scope
  `/studio/`. `cacheRule()` is the whole policy: the boot page network-first with `/studio/offline/` as the
  fallback; `/_astro/*` cache-first (named by content); icons, the manifest and the offline page served from the
  cache and refreshed behind. Never: another origin (all of Sanity), `/api/**`, `/preview/**`, non-GET, a request
  with `Authorization`, a range request. Bump `VERSION` to drop everything kept.
- **Post a photo**: `kitConfig.postPhoto` (`galleryTypes`, optional `gallery` field names, optional `post`
  builder, optional `note`). The galleries are found with the drafts perspective. A gallery photo is appended to the
  page's draft (made from the published copy first if there is none) in one transaction, then checked; a post is a new
  `drafts.<uuid>`. The done screen opens it in the full editor for the Studio's own Publish.

## Help for this page (card 110)

A document inspector (`document.inspectors`, `defineDocumentInspector`), opened from the document header or its menu,
on every type but the Trash. "Worth a look": `kitConfig.pageCheck` (the same three checks as "Check this page...",
through `runPageCheck()` in `actions/checkPage.tsx`) re-run 600 ms after typing stops, on the page-builder types only,
plus every Checkup finding whose target is this document. "How to": the Site Guide entries listed for the type in
`kitConfig.guide.forType` (`GUIDES_FOR_TYPE` in `guides/content.ts`, `'*'` as the fallback), rendered by the site's
`GuideView`. Read-only; uses only `documentId`, `documentType` and `onClose`, because inspector props have changed
between Sanity majors. `features.helpPanel: false` removes it.

## Before you publish (card 123)

A second document inspector (`PublishPanel.tsx`), beside "Help for this page" on every type but the Trash and the
weekly tick. It lists what the Checkup would say about THIS document once its changes are published: `forDocument()` in
`src/lib/studio-prepublish.ts` swaps the editor's draft in as if it were the published copy, runs every rule in
`kitConfig.checkup.rules` over the whole site (fetched once when the panel opens, plus `/llms.txt` and
`/llms-full.txt`), and keeps only the Fix-it items (card 115) that point at this document, each with its field, so
"Show me" opens the right box. Site-wide notes (`SITE_WIDE_RULES`: old drafts, the Trash, the last publish, the llms
template and age, the weekly link report) are left out. It also shows the page check's "nothing typed here" and
"link to an address no page owns" groups (`kitConfig.pageCheck`); its picture group is dropped because the Checkup's
own rule covers pictures with a field link. Re-run 600 ms after typing stops. Blocks nothing, writes nothing.
`features.publishPanel: false` removes it. Any rule a site adds (heading order, link words, private pages) shows up
here with no change to the panel, as long as it returns `items` with `target.doc` and `target.field`.

## Writing help (card 123)

`ncsWritingHelp()` (`src/sanity/ai/`, its own plugin in `sanity.config.ts`, not part of the kit config) wraps
`form.components.input` and `form.components.block`:

- Under a string field whose name is in `fields` (default: `seo` = `seoDescription`, `metaDescription`; `summary` =
  `excerpt`, `summary`; `alt` = `alt`, at any depth) it adds a "Suggest" button. Dropdowns and read-only fields are
  skipped. A photo description needs the parent image's `asset._ref`; with no picture the button hides.
- In Portable Text, when the caret is in a plain paragraph (`style` normal, 40+ characters) it adds "Improve this
  paragraph" in a `contentEditable={false}` strip; the suggestion opens in a Dialog (a textarea inside the editable
  area would fight the editor for key presses). "Use this paragraph" sets the block's `children` to one span through
  `useFormCallbacks().onChange` at the block's absolute path. A paragraph with marks, links or inline objects cannot
  take the words without losing them, so it offers "Copy the words" instead.

Every suggestion lands in an editable box with "Use this", "Try again" and "No thanks". Nothing touches the document
until "Use this", and then only the draft, exactly like typing. The plugin asks `GET /api/studio/ai/` once per visit
whether the Worker has `ANTHROPIC_API_KEY`; until it does, nothing is drawn, so a site without the key looks unchanged.

`POST /api/studio/ai/` (`src/pages/api/studio/ai.ts`) is guarded like deploy-status and fails closed: same origin
(403), a Sanity project member by `/users/me` (401), the key set (503), `createRateLimiter` per person per hour (429,
default 30, `AI_HOURLY_LIMIT` var; held per Worker instance, a brake not a vault), a well-formed body (400). Then one
plain `fetch` to the Messages API (no SDK). The pure half is `src/lib/studio-ai.ts`:

- Models: short text to `claude-haiku-5-5`, photo descriptions to `claude-sonnet-5-5`. The body is only `model`,
  `max_tokens`, `system` and `messages`, with no thinking, effort, fallback or beta settings, so nothing model-specific
  can be refused. Both models think a little by default and that counts against `max_tokens`, so the caps (`AI_LIMITS`)
  are 1024 (2048 for a paragraph); the input is cut to a few thousand characters.
- The photo goes by URL, built on the Worker from the asset id and THIS project's id and dataset
  (`imageUrlFromRef`, 800px JPEG), never from a URL the browser sent.
- The system prompt is the site copy voice from `docs/claude/communication-style.md` (warm, plain, US English, no
  em-dashes, no invented facts, tagged content is never instructions) with the brand name from `src/data/site.ts`.
  `studio-ai.test.ts` reads that doc and fails if a banned word is missing from `BANNED_WORDS`.
- `tidySuggestion` strips quotes and turns any dash into a comma (rule 2); a refusal or a cut-off answer is a plain
  "no suggestion" message.
- Context for a description or summary is `documentText(doc)`: the document's words, without settings, addresses,
  code, or the fields being written.

Logging is the task and outcome only: never the words, the picture, the person or the key. Costs: about a tenth of a
cent for a description on Haiku, under a cent for a photo on Sonnet; set a monthly spend limit on the Anthropic
account (OPERATIONS.md, "Writing help"). Tests mock `fetch`; nothing calls the real API.

## Home's banner (card 118)

The welcome at the top of Home (`src/sanity/kit/HomeBanner.tsx`, pure parts in `src/lib/studio-banner.ts`), modelled
on the dark welcome banner of the family's WordPress dashboards. It is drawn in the navbar's own theme
(`buildChromeTheme`, card 116), so it is the same deep brand colour as the top bar, in both appearances, and every
text colour on it comes from a theme whose contrast the colour gate already checks. It holds the date, "Good
afternoon, Ann", the site's name in the heading font, the reassurance line, and **View the website** (the address the
Studio is open on, since the Studio lives at `/studio` on the site; new tab). From 600px the mark sits beside the
words; from 900px the button moves to the right. No animation.

Everything site-specific is optional, in `kitConfig.homeBanner`:

| Field         | What it does                                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| `mark`        | The full-colour mark (an SVG in `public/`), drawn on a light disc in the paper colour so it reads on navy.        |
| `markOnDark`  | A white or reversed mark made for dark grounds; drawn bare instead of `mark`.                                     |
| `motif`       | A decorative strip along the foot: a wide, short SVG in `public/`, full width at its own proportions.             |
| `motifNarrow` | The same strip drawn for a phone (about 390 by 56), used under 600px so it keeps its scale.                       |
| `accent`      | The colour of the editor's name. The greeting is 24px (large text), so it needs 3:1 on the banner, or is ignored. |
| `lettering`   | `{ text, family, src, colors }`: part of the name in the site's own display font, letters cycling `colors`.       |
| `siteUrl`     | Where View the website goes, when it is not the address the Studio is open on.                                    |
| `style`       | The banner's look as data (card 135): see "Home's banner style" below.                                            |

The lettering's font file must be the site's own (a path starting `/`, same origin), loaded by a small `@font-face`
the banner writes; colours under 3:1 on the banner are dropped, and the heading font shows until the file loads. The
mark and motif are decorative (`alt=""`); the heading carries the name, with an `aria-label` when it is lettered.
The starter sets only `mark: '/favicon.svg'`. Keep a site's banner files out of `public/studio/`, which is the Studio's
own address; a folder such as `public/studio-banner/` is clear of it.

## Home's banner style (card 135)

A site sets the banner's look as data, in `kitConfig.homeBanner.style` (type `HomeBannerStyle`,
`src/lib/studio-banner-style.ts`). It sits beside the banner's other fields (`mark`, `motif`, `accent`, `lettering`)
because it changes the same elements, and it is TypeScript, so a wrong key fails `npm run check`.
`brand.config.json` `studio.look` stays for the devices the whole Studio shares (marker, stone, connector, texture); a
banner's font, button and title are not that. With no `style` the banner is exactly what it was, so a site that sets none
does not move.

**Only these hooks are supported.** Before card 135, five sites restyled the banner with a CSS file that selected the
kit's class names (`.ncs-hb__go`, `.ncs-hb__who`, `.ncs-hb__motif`) and Sanity's own markup (`[data-ui='Stack']`,
`[data-ui='Button']`, `h1[data-ui='Heading']`). A kit rename silently turned that look off. Do not do that. The banner's
class names (`ncs-hb*`) and Sanity's `data-ui` attributes are the kit's to change. What a site may rely on is this
section's lists, and `src/lib/studio-banner-style.test.ts` fails if any entry disappears or is renamed.

| Key                       | What it sets                                                                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `background.color`        | The banner's colour instead of the navbar's. White text must reach 7:1 on it, or it is ignored.                                                             |
| `background.texture`      | A tiling picture in `public/` over the colour.                                                                                                              |
| `background.rule`         | A one-pixel line along the foot, in this colour.                                                                                                            |
| `eyebrow`                 | The date line: `text` (`{date}` is today's date, as in "Today, {date}"), `font`, `size`, `weight`, `tracking`, `case` (`upper` or `none`), `color` (4.5:1). |
| `eyebrow.mark`            | `{ kind: 'rule' or 'dot', color }`: a short hairline or a round dot before the words (3:1).                                                                 |
| `greeting`                | `font`, `italic`, `weight` of "Good morning, Ann".                                                                                                          |
| `title`                   | The site's name: `font`, `weight`, `size` (a length or `clamp()`), `leading`, `tracking`, `case`, `color` (3:1).                                            |
| `title.echo`              | `{ color, offset }`: a hard shadow down and right, as a poster echoes its type.                                                                             |
| `title.lastLetterOutline` | Draws the last letter of the lettered part (`homeBanner.lettering`) as an outline in this colour.                                                           |
| `chip`                    | "View the website": `shape`, `bg`, `fg`, `hoverBg`, `hoverFg`, `edge`, `ring`, `halo`, and `font`, `size`, `weight`, `tracking`, `case` for its words.      |
| `motif.place`             | `foot` (the strip under the words, the default) or `behind-right` (behind the words at the right, full height, from 600px).                                 |
| `stamp`                   | `{ text, color, font }`: a claim struck at an angle above the button, from 900px. Decorative, hidden from screen readers.                                   |

Chip shapes: `pill`; `square` (2px corners; add `halo` for a ring standing 3px off it); `tag` (a notched left edge with a
punched hole, the arrow nudging right on hover); `plate` (a hard shadow and 2px edge in `edge`, a slight skew, lifts on
hover); `stitched` (a dashed stitch inside the edge in `edge`, the hover fill sewn across from the left). A shape needs
`bg` and `fg` as hex colours that reach 4.5:1 together, or the button stays as Sanity draws it. `hoverBg` defaults to a
lighter `bg`, `hoverFg` to `fg`, `edge` to `fg`, and `ring` (the keyboard focus ring) to `edge`.

Every value is checked. A colour must be a hex and must read on the banner; a font is a stack the site already loads
(the kit loads no fonts); a length is a CSS length or a `clamp()`, `calc()`, `min()` or `max()` of them; nothing that
could close a CSS rule gets through. A value that fails is dropped and the rest still apply (`resolveBannerStyle().notes`
says which, and the unit test holds every site's entry clean).

**Documented hooks for what config cannot say.** A site that needs one extra touch (a second ornament, a different
border) may select these and nothing else. Select a part by its attribute, never by `.ncs-hb__*` or Sanity's `[data-ui]`.

| Hook                                                                                                                                                      | What it is                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-hb-part` values: `banner`, `body`, `mark`, `eyebrow`, `greeting`, `name`, `title`, `lettering`, `lettering-last`, `intro`, `chip`, `stamp`, `motif` | One per element. `banner` is the root, `body` the padded area, `mark` the site's mark, `name` the editor's name in the greeting, `lettering` the part of the title in the site's own font, `lettering-last` its last letter, `intro` the reassurance line, `chip` the button's wrapper. |
| `data-hb-bg`, `data-hb-texture`, `data-hb-rule`                                                                                                           | On the root, when the style sets that background piece.                                                                                                                                                                                                                                 |
| `data-hb-motif`                                                                                                                                           | On the root: `foot` or `behind-right`.                                                                                                                                                                                                                                                  |
| `data-hb-mark`                                                                                                                                            | On the eyebrow: `rule` or `dot`.                                                                                                                                                                                                                                                        |
| `data-hb-shape`, `data-hb-halo`, `data-hb-stamp`                                                                                                          | On the chip's wrapper: the shape, a standing ring, a stamp beside it.                                                                                                                                                                                                                   |
| `--hb-bg`, `--hb-rule`, `--hb-texture`                                                                                                                    | The background colour, the line colour and the texture's `url()`, on the root.                                                                                                                                                                                                          |
| `--hb-mark-color`                                                                                                                                         | The eyebrow mark's colour.                                                                                                                                                                                                                                                              |
| `--hb-chip-bg`, `--hb-chip-fg`, `--hb-chip-bg-hover`, `--hb-chip-fg-hover`, `--hb-chip-edge`, `--hb-chip-ring`, `--hb-chip-halo`                          | The chip's resolved colours. Read them in extra CSS (`background: var(--hb-chip-bg)`); set them in config.                                                                                                                                                                              |
| `--hb-title-outline`, `--hb-stamp-color`                                                                                                                  | The outline and stamp colours.                                                                                                                                                                                                                                                          |

Adding a part, attribute or variable means adding it to `HOME_BANNER_PARTS`, `HOME_BANNER_ATTRS` or `HOME_BANNER_VARS`, to
this list and to the rule that reads it, in one commit. Removing or renaming one is a breaking change: it needs a port
card and a note here for every site that uses it.

**Bench.** `/kit-harness/guide/?view=banner&look=<key>` on the dev server draws the banner with a style (`none`, `fbcm`,
`presacademy`, `reid`, `mas`, `stonesteps`); the entries are in `src/sanity/kit/harness/bannerLooks.ts` and are the
recipes below.

### Migrating a site's banner CSS onto the slot

Copy the site's entry from `bannerLooks.ts` into its `kit.config.ts` as `homeBanner.style`, delete the matching rules
from the site's CSS file, and open Studio Home at 1280 and 375 to check. The five sites as of 2026-10-19:

- **fbcm** (`src/sanity/studioHomeBanner.css`, imported by `sanity.config.ts`; the whole file goes). Rule 1 (the date
  line as tracked capitals after a gold hairline) is `eyebrow` with `font`, `size`, `weight`, `tracking`,
  `case: 'upper'`, `color` and `mark: { kind: 'rule', color }`. Rule 2 (the italic Castoro greeting) is `greeting`. Rule 3
  (the square gold plate with a standing ring) is `chip` with `shape: 'square'`, `bg`, `fg`, `hoverBg`, `halo`, `ring` and
  the Sofia Sans words. Rule 4 (the rendering behind the words, and the gold line under the banner) is
  `motif.place: 'behind-right'` and `background.rule`. The `@import` of the font package stays with the site.
- **presacademy** (`src/sanity/studioLook.css`, rule 3 only: `.ncs-hb__go a[data-ui='Button']`). It is `chip` with
  `shape: 'pill'`, `bg`, `fg`, `hoverBg`, `size`, `weight`, `tracking`, `case`. Rules 1 and 2 (the mono face on
  `.ui-eyebrow`, `.ui-tag` and `.ui-stone > b`, and the contents-page list on
  `section[aria-labelledby^='guide-group-']`) are not banner styling and have no slot yet: they stay in the site's CSS
  and are listed in docs/PENDING.md.
- **reid-design-site** (`src/sanity/studioArt.css`, part 2: `.ncs-hb__go > a[data-ui='Button']`). It is `chip` with
  `shape: 'tag'`, `bg`, `fg`, `hoverBg`. Parts 1 and 3 (`.ncs-sp__mark` and `.ncs-sp__button` on the splash and offline
  page) are the splash's, not the banner's, and stay.
- **mas-monograms** (`src/sanity/studioArt.css`, the whole file: `.ncs-hb .ncs-hb__go a[data-ui='Button']`). It is `chip`
  with `shape: 'stitched'`, `bg`, `fg`, `hoverBg`, `hoverFg`, `edge` (the stitch), `ring` and the spaced capitals. The
  file can go.
- **stonesteps-50k** (`src/sanity/studioArt.css`, the five `ncs-hb` blocks). `h1[data-ui='Heading']` and its last-letter
  rule are `title` (`font`, `weight`, `size`, `leading`, `tracking`, `case`, `color`, `echo`, `lastLetterOutline`). The
  date line with its blaze dot is `eyebrow` with `mark: { kind: 'dot' }`. The stamp (`.ncs-hb__go::before`) is `stamp`.
  The plate button is `chip` with `shape: 'plate'`. The last block (`.ncs-ui .ui-banner__title` and
  `.ui-banner__eyebrow`) styles the Site Guide's banner, not Home's, so it stays until that banner gets a slot.

Check by eye when migrating: the `stitched` focus ring and the `plate`'s skewed text are drawn by the kit now, and
fbcm's gold line under the banner applies at every width (its old rule applied from 600px).

## Icons and list-row pictures (card 119)

Not part of the kit plugin either, but it is on every screen. Every icon the Studio draws is named by what it MEANS
(`times`, `give`, `scripture`, `sections`...; the list is `BRAND_ICON_KEYS` in `src/lib/studio-icons.ts`), and
`src/sanity/brandIcons.tsx` draws each meaning: with `@sanity/icons` by default, or with the site's own art when
`src/sanity/brandIconArt.tsx` (per site, not PORTABLE) lists it. `artIcon(url, title)` (`src/sanity/artIcon.tsx`)
turns a brand-kit SVG (a Vite `?url` import) into a Sanity icon: the file is drawn as it is, colours included, inside a
1em `<svg data-sanity-icon>`, so Sanity sizes it like its own icons everywhere.

Which document type, field group and tool means what is data: the starter's defaults in `studio-icons.ts`, plus
`brand/brand.config.json` `studio.icons.types` / `.groups` / `.tools` for the site (a church: `"sermon": "scripture"`).
An unknown meaning there is dropped and the default stays (the unit test lists it).

Where the icons land:

- `withBrandPreviews(types)` in `sanity.config.ts` decorates the schema: each document type's `icon` (so lists,
  search, references and the create menu agree), an icon on each field group whose name is mapped, and a preview that
  always returns `media`. A type's own `prepare` still runs; only a missing `media` is filled, with `IconTile`: the
  type's icon on a square of the brand's tint, read from the theme's scheme, so it is right in light and dark. A
  type's own image still wins, so a `prepare` should return `media: image?.asset ? image : undefined`, never an icon.
- `brandIcons()`, registered right after the kit: the same for types that plugins register (Trash, the weekly tick,
  share links), and an icon on every tool (the top bar draws none, the phone's sidebar does).
- `structure.ts` asks `typeIcon('<type>')` or `brandIcon('<meaning>')` instead of importing icons;
  `singletonWithPreview` defaults to the type's icon, and names its one view "Edit".
- Page templates take `typeIcon('page')`.

The tile is a wash of the accent on the paper, and a deeper one on the dark ground; `studio.icons.tile.light` /
`.dark` (hex) set either square, and a one-colour icon on it is kept at 3:1 (`iconTileColors`). Multi-colour art with
dark parts (navy, deep green) can sink into the dark tile: give the dark tile a light, warm colour
instead (a stone or paper tone), so the art sits on it like a photo would. List-row subtitles use `previewDate` and `previewSubtitle` from `studio-icons.ts`: a short
date, then status or detail, joined with " · ", in plain words ("Shows until Sun, Nov 9, 2026").

`src/lib/studio-icons.test.ts` is the gate: every document type in `src/sanity/schemaTypes/` and the kit's and
workflow's types needs a meaning and a `preview`, `sanity.config.ts` must run `withBrandPreviews` and register
`brandIcons()` after the kit, and `brandIconArt.tsx` may name only real meanings.

## The look (card 116)

Not part of the kit plugin, but it is what an editor sees around it. `src/sanity/studioTheme.ts` (theme, light by
default, see PORTS.md card 116) and `src/sanity/components/StudioLook.tsx`: `studioLook(fonts)` draws the top bar in
the brand's deep colour (a navbar middleware that always calls `renderDefault`, so the status line still shows), and
`withEditorTypography(types, fonts)` gives every Portable Text style a `component` in the site's fonts. A new rich
text field picks it up with no extra work, as long as it lists its `styles`.

## The edges: /studio page, words, wordmark (card 120)

Also outside the kit plugin; site choices in `src/sanity/studioEdges.config.ts`.

- **The /studio page is the site's own** (`src/pages/studio/index.astro`). The tab says the site's name with the
  site's icons from the first byte, the page ground is the Studio's paper or dark background (the editor's last
  Appearance pick, else light, as `seedLightScheme` seeds it), and a plain HTML splash (the mark, the name in the
  display font, "Opening the editor", an optional motif from `src/sanity/StudioSplashMotif.astro`) shows until React
  mounts and replaces it (the island's `fallback` slot). React is still @sanity/astro's `StudioComponentHash`, so
  hash routing and deep links (`/studio/#/structure/...`) are unchanged. astro.config.mjs no longer sets
  `studioBasePath` (that would inject Sanity's page on top of ours); `studioConfigModule()` in
  `src/lib/studio-route.ts` serves the `sanity:studio` config module instead.
- **The site's words** (`src/sanity/studioWording.ts`): the workspace `subtitle` under the name on the sign-in card,
  and an `i18n.bundles` entry for the signed-out notice and user-menu labels (Appearance and Sign out stay Sanity's).
  "Choose login provider", the "Not authorized" dialog and the request-access form are hard-coded English in sanity
  6.19 and stay Sanity's. `studio-edges.test.ts` fails if a key we override disappears from the installed sanity.
- **The wordmark** (`StudioWordmarkNavbar` in `StudioLook.tsx`): the brand logo named by `wordmark.logo` (a
  `logoPaths` entry; `view` crops an SVG lockup to its words) beside the square icon, hidden under 600px. It is
  registered at the ROOT of sanity.config (`studio.components.navbar`), the innermost middleware, so it wraps only
  Sanity's bar and not the kit's status line. The page hands it the built URL in `#ncs-studio-boot`.
- **Not done, on purpose:** a branded heading inside the sign-in card. Checked again against sanity 6.19 for card
  134: `AuthConfig` (the `auth` object in sanity.config) has no `LoginComponent` key; only a full custom
  `AuthStore` can bring one, and `getAuthStore()` uses such a store as-is, skipping the Studio's request handler
  (signed-out handling for a dead session, the CORS and project-not-found screens, the request-failure diagnostics).
  Wrapping the default store would mean rebuilding it with the deprecated, internal `createAuthStore` and losing
  those screens. The supported levers stay the workspace `icon`, `title` and `subtitle` (all drawn on the card)
  and the i18n words above. Revisit when `AuthConfig` gains a login component slot.

## The design language (card 128)

The kit's own look, so the Studio's middle reads like the site and not like a generic app. Shared, PORTABLE primitives
in `src/sanity/kit/ui/` (import from `kit/ui`), the pure half in `src/lib/studio-look.ts` (tested in
`studio-look.test.ts`, including a contrast gate over every token in both schemes). The Site Guide and its index are
the first surfaces drawn in it; card 131 (below) moves the other kit surfaces over.

**The site's devices** are named in `brand/brand.config.json` `studio.look` (schema in `brand.config.schema.json`).
Every family site should differ in FORM, not only colour. Unset keys take the starter's neutral defaults.

| Key                    | What it is                                                                               | Starter default        |
| ---------------------- | ---------------------------------------------------------------------------------------- | ---------------------- |
| `marker`               | The section marker: `dot`, `steps`, `rule`, `diamond`, or art `{ src, width, height }`   | `dot`                  |
| `markerColor`          | Colour for a built-in marker                                                             | the accent             |
| `markColors`           | The numbered stones' colours, in order                                                   | the accent             |
| `stone`                | Stone shape: `pebble` (seeded, hand-laid), `round`, `square`, `lozenge`                  | `round`                |
| `connector`            | What joins numbered steps: `{ kind: dashes / dots / line / none, color }`                | a plain line           |
| `tones`                | Callout hues `{ note, tip, careful }`; grounds and title colours are worked out          | accent, amber, rust    |
| `motif`, `motifNarrow` | The strip along a banner's foot (and its phone version), SVGs in `public/`               | none: the colour edge  |
| `texture`              | A repeating tile for featured panels                                                     | none                   |
| `edgeColors`           | The ColourEdge's colours, left to right                                                  | `markColors`           |
| `lettering`            | Banner titles in the site's display lettering `{ family, src, colors }`                  | none: the heading font |
| `motion`               | How things arrive: `lay` (stones set down in turn), `draw` (the connector draws), `none` | `draw`                 |

Every colour is guarded: text at AA (4.5:1), markers, stones and focus rings at 3:1, banner lettering at 3:1 on the
chrome. A failing colour is nudged until it passes; an unusable value is ignored with a note (`resolveLook().notes`).

**The primitives** (`kit/ui/primitives.tsx`): `KitScope` (the wrapper that sets the look's CSS variables for the
current scheme and loads the one stylesheet, `kit/ui/css.ts`; every primitive sits inside one), `Marker`,
`SectionRule`, `KitPanel`, `Stone`, `SeverityStone`, `StepPath` (down, or `across`), `KitNotice` (note, tip,
careful, plain), `UiChip` (a small copy of a real Studio button: green Publish, navy tool tabs, red Discard),
`InlineText` (the guide marks), `StoneTag` and `StatusBadge`, `ArtTile` (a meaning's icon, the site's art where it
has some, on a stone), `KitCard`, `PullQuote`, `ColourEdge`, `Sill`, `Lettering`, `PageBanner` and `KitLoading`.
`GuideShot` is in `kit/ui/GuideShot.tsx`. None uses a Studio hook, so all of them render on a bare page.

**The Site Guide** (`kit/guide/GuidePage.tsx`, `kit/guide/GuideIndex.tsx`, wired by `GuideTool.tsx`; the site's
`components/GuideView.tsx` is now a thin wrapper that hands in the router). The guide format is unchanged and old
entries render as they were; new and optional: `{ kind: 'shot' }` (below), `{ kind: 'quote', text, cite? }`,
`steps` with `across: true`, callout tones `note` / `tip` / `careful` (the old `primary` is a note, `positive` a tip,
`caution` and `critical` are careful), and a guide `icon` that names a meaning in the icon registry (the old names
map through `GUIDE_ICON_MEANINGS`; an emoji or a typo draws the guide icon). Print gives the open guide with a
letterhead and no banner or buttons. "Help for this page" shows the same page in its compact `panel` variant.

**GuideShot** draws a picture of the Studio with the look's own marks on it: numbered stones, highlight rings and
arrows, positioned in PERCENT of the picture so a recapture at another size keeps them. Data:
`{ kind: 'shot', src, alt, width, height, marks?: [{ kind: 'stone', x, y, label? } | { kind: 'ring', x, y, w, h,
label? } | { kind: 'arrow', x, y, toX, toY, label? }], caption? }`. `src` is a file in `public/guide-shots/` or an
https address; anything else is not drawn. Capture at 1280 wide in the light appearance, under 300 KB. Labelled
marks become a numbered key under the picture, which is what a screen reader hears beside the `alt`.
A guide does not write the picture out: it asks for one by key (below), and `public/guide-shots/example-editor.svg` is
the wireframe shown when a site has no capture for that key.

**Real captures in the guides (card 130).** A guide block is `{ kind: 'shot', key: 'publish-button' }`. The key is
looked up in the site's own registry, `src/sanity/guides/shots.ts` (site-owned, not PORTABLE; the starter ships it empty),
which holds a `GuideShotData` per key: the WebP in `public/guide-shots/`, its alt text, its size and its marks. So the
guide text is the same on every site and only the pictures and coordinates are per site. `resolveShot()` in
`studio-look.ts` does the lookup: a block with its own `src` and `alt` is drawn as written; a key with an entry is drawn
from it (a `caption`, `alt` or `marks` on the block wins); a key with no entry draws `PLACEHOLDER_SHOT`, the wireframe,
captioned as a drawing. `src/lib/guide-shots.test.ts` checks every entry (file present and under 200 KB, alt text, marks
inside the picture, no em-dashes in labels).

To add a capture: (1) sign in to the live Studio and capture at about 1500 px wide, light appearance. (2) Crop to the
useful part. (3) Cover the account avatar (top right of the navbar, bottom left of an open editor) and any personal name,
such as the greeting on Home; never ship a capture with either. Do the covering and cropping in one scratch script with
`sharp` or Playwright, not by adding a dependency: composite the cover patches onto the full image FIRST, then crop
(sharp's `extract` runs before `composite`, so doing both in one chain puts the patch in the wrong place). (4) Save as
WebP, quality about 80, under about 150 KB. (5) Measure each control's box in the capture's pixels and convert to percent
of the cropped picture (`x = (px - cropLeft) / cropWidth * 100`); a ring is the control's box grown by about 3 px, a stone
sits just outside it or on a corner, never over the control's own words. (6) Write the entry, with one short label per
stone in the site's plain voice. Stones are numbered in the order they appear in `marks`. (7) Look at the guide in the
kit harness (`/kit-harness/guide/?view=page&g=<slug>`) at 1280 and 375.

**The test bench** (`/kit-harness/studio/` and `/kit-harness/guide/`, dev server only; `getStaticPaths` returns
nothing in a build). `studio` is the real Studio signed in as a pretend administrator through Sanity's
`createMockAuthStore`: reads of a public dataset work, anything that needs a real session fails quietly. `guide`
draws the guide pieces in the Studio theme: `?view=index|page|panel|ui&g=<slug>&scheme=light|dark`.

## Every surface in the language (card 131)

Card 128 drew the primitives and the Site Guide. Card 131 carries them onto the rest of the Studio, so the cards,
panels, badges and checklists below Home's banner stop looking like a generic app. The pieces are in
`src/sanity/kit/ui/surfaces.tsx` (PORTABLE, presentational, data in by props) and are drawn by the look, so each
family site gets its own devices and the starter's neutral defaults stay tidy.

| Piece           | What it is                                                                         | Where it is used                                |
| --------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------- |
| `ToolHead`      | the rule, the meaning's art on its stone, a display-font title, a lead             | `ToolHeading` (Checkup, Quick update)           |
| `KitBox`        | a white card: the marker (or a meaning's art), a display-font title, an action     | Home's `Panel` (every Home card)                |
| `KitAction`     | a pill link or button in the heading colour; `strong` fills it, `quiet` underlines | "Take me there", "Edit", "Do it", "Check again" |
| `ResultCard`    | a finding: white card, severity along the left edge; `dense` for rows              | Checkup, Fix-it list, Before you publish, Help  |
| `SeverityGroup` | "Needs doing / Worth a look / Good to know" over a group, with a count             | Checkup, Before you publish                     |
| `AllClear`      | three laid stones, a display-font line, the motif sill (`compact` drops the sill)  | Checkup, Fix-it list, Before you publish        |
| `CheckPath`     | a checklist as a path: the stone is the checkbox and fills when done               | Home's This week / This Sunday                  |
| `LiveSteps`     | Saved, Building, On the website as three stones; `compact` for the navbar          | Home's "Is it live?", the navbar status line    |
| `TileCard`      | a job tile: colour edge on top, art on a stone, display-font title                 | Quick update                                    |
| `EmptyState`    | the type's art large, a display-font title, one strong button, the sill            | the desk's empty lists (`emptyList.tsx`)        |
| `DoneCard`      | the path laid so far, a display-font line, the next buttons, the sill              | Quick update's done screen, Post a photo's      |

**Rules.**

- Wrap every piece in a `KitScope`. The stylesheet now goes into `<head>` once (id `ncs-ui-css`), however many scopes
  a screen has. Its link and focus rules skip Sanity's own elements (`:not([data-ui])`), so a Sanity `Button` inside a
  scope keeps its colours.
- Severity is words plus colour, never colour alone: a group says "Needs doing", a dense row says its level in small
  caps. The left edge is `tones.<tone>.edge`, guarded at 3:1 on the white card in both schemes.
- A stone that is not done yet is an outline with its number in the muted colour (AA). Done stones take the site's mark
  colours in order and a tick, also guarded at 3:1 on the card.
- The step states are pure and tested in `studio-look.ts`: `liveSteps(state)`, `stepsLabel()` (the screen reader
  sentence, "Saved, done. Building, in progress. On the website, not yet."), `pathProgress()` ("2 of 4 done").
- Motion: a newly ticked stone is laid (`lay`) or its connector drawn (`draw`); the stone being built pulses a ring.
  Both stop under reduced motion, and the stones already done when a card opens never animate.
- A quick-update form can name a `meaning` (types.ts `QuickForm`) so its tile draws the site's art; the icon is the
  fallback.
- Prayer requests in Messages are a gentle `note` (sky) callout, never caution; statuses are stone tags.

**The bench.** `/kit-harness/guide/?view=surfaces&part=<tool|checkup|clear|loading|failed|home|quick>` draws every
piece with made-up data in light or dark (`&scheme=dark`), since the real screens need a signed-in Studio
(`src/sanity/kit/harness/Surfaces.tsx`, dev only).

**Neutral look warning (card 139).** `npm run check:look` warns when `studio.look` still has the neutral marker, stone, colours or connector (`neutralLookWarnings()` in `studio-look.ts`). Never fails unless `--strict`.

**Toasts (card 140).** `KitToastBody` (`kit/ui/surfaces.tsx`) is the React-node description of a success toast: the sentence and, after a publish, the three Is-it-live stones (`liveSteps('on-its-way')`). Sanity owns the toast frame and title. Used by `publishNote.tsx` and Trash/restore; bench: `part=toast`.

**Switch (card 141).** `KitSwitch` (`kit/ui/surfaces.tsx`) draws a Quick update yes/no field: a `role="switch"` button, a track and thumb in the look's colours, "Yes" or "No" in words. Do not use a native checkbox in the kit; it can be invisible in real Chrome. Bench: `part=switch`.

**How to on date fields (card 142).** Sanity 6 date and datetime inputs draw their own header, so the chip goes under the input, not in the description (`drawsOwnHeader()` in `studio-kit.ts`).

**Still to do** (`docs/PENDING.md`): the sign-in heading (blocked in sanity 6.19; see "The edges" above). The field
"How to" chip landed with card 134 (below).

### Part two (card 132)

| Piece       | What it is                                                                                | Where it is used                                  |
| ----------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `DateBlock` | the month in small caps over the day in the display font, inside a stone outline          | Home's Coming up and RSVP rows                    |
| `ArtRow(s)` | a list row: the type's art on a small stone (or a `lead`), title, muted line, tag, action | Recent edits, Pick up, Coming up, the newsletter  |
| `Figure`    | a headline number in the display font with its words                                      | Visitors, newsletter subscribers, CollectionIntro |
| `MarkBars`  | bars in the calm mark colours, each with its number in words                              | Visitors                                          |
| `StepTrail` | named steps across: laid, ringed, waiting (`LiveSteps` with one column per word)          | Post a photo, the tour                            |
| `TileCard`  | now takes `href` (a real link) as well as `onClick`; art top left, 52px (card 133)        | Home's ways in, Quick update                      |

- **Done means calm.** `look.<scheme>.calm` lists the stones that may say "done": every mark colour except one within
  28 degrees of the careful hue (`calmStones()`, tested). `StateStone calm`, `LiveSteps`, `AllClear` and `MarkBars`
  use it, so a finished "On the website" is never the warning colour. A checklist (`CheckPath`) still lays its stones
  in every mark colour in turn, like the Site Guide's steps.
- **Waiting stones** are the same seeded outline drawn in the colour they will be laid in, with the number in the
  muted colour (AA). The outline is held at 3:1 on the white card by the stone pairs in the gate.
- **The splash and offline page** are one partial, `src/components/studio/StudioSplash.astro`
  (`mode="loading" | "offline"`), worked out by `src/lib/studio-splash.ts`: the mark, the name (its last word in the
  site's lettering when there is some, colours guarded at 3:1 on the page), five seeded stones along a gentle wave in
  the look's shape and colours joined by its connector. Loading lays and lifts them in a loop; offline leaves the last
  one unlaid (a dashed outline) and adds a "Try again" pill. `none` motion and reduced motion show the path laid and
  still. `public/studio/sw.js` (cache `v2`) keeps the offline page and what it points at (stylesheet, fonts,
  lettering, motifs).
- **`restore`** is a meaning (Earlier versions, the "Undo a change" guide's `restore` icon). A site with restore art
  maps it in `brandIconArt.tsx`.
- **Tour steps** may name a `short` word for the trail and a `meaning` for their art (`types.ts` `TourStep`).
- **The bench** has `part=home` (every Home card with made-up data), `part=photo` and `part=tour`.

## "How to" beside a field, and icons on every field group (card 134)

**The chip.** `kit/FieldGuide.tsx` is a global `form.components.field` wrapper, registered by the kit plugin. A field
named in `guide.forField` (kit.config.ts; the map is `GUIDE_FOR_FIELD` beside `GUIDES_FOR_TYPE` in
`guides/content.ts`) gets a quiet "How to" chip after its description: the look's marker in small, the words, in the
stone's shape (`--ui-tag-radius`) and the heading colour. It opens a dialog with that guide in its compact panel
drawing, scrolled to the named heading, focus on it, the marker colour down its left. "See also" inside opens the next
guide in the same dialog.

```ts
export const GUIDE_FOR_FIELD: FieldGuideMap = {
  fields: {
    seoTitle: { guide: 'seo-fields' },
    alt: { guide: 'images-and-alt', section: 'What alt text is' },
  },
  types: {}, // schema type name -> section, for a type used in many places
};
```

- A field's NAME wins over its TYPE chain (`schemaType`, then each `.type`). Name fields that mean one thing
  everywhere: `seoTitle`, not `title`. Keep the list to the obvious ones (the gate stops at 16).
- Every field passes through the wrapper, so it has no hooks and one cached lookup (`fieldGuideLookup` in
  `src/lib/studio-kit.ts`; type chains are cached per schema type). An unmapped field gets `renderDefault(props)`
  untouched. `features.fieldHelp: false` turns the wrapper off entirely.
- The chip goes into the description slot, typed `string` in sanity 6.19 but drawn as a child of a Text. An upgrade
  that stops drawing a node there loses the chip and nothing else.
- `GuideViewProps.section` and `GuidePage`'s `section` carry the heading; each section heading now has a stable id,
  `guideSectionId(slug, heading)`. A site's `GuideView` must pass `section` through.
- Gates: `studio-guides.test.ts` (every mapped guide and heading exists; at most 16 entries), `studio-kit.test.ts`
  (the lookup). Keyboard: a real button, the look's focus ring, Escape closes the dialog. No motion beyond a colour
  change, off under reduced motion.

**Field-group icons.** Config only: `brand/brand.config.json` `studio.icons.groups` names a meaning for every document
field group the defaults in `studio-icons.ts` do not cover (`navigation`, `social`, `final`...). Object types'
groups (a section's tabs) are not decorated. A site with art for a meaning (`brandIconArt.tsx`) gets its stone there;
choose meanings the site has art for where one fits.

## Checkup rules

Generic (`genericRules()`): pictures with no description (skipping `altExemptFields` such as the logo), pages with no
Google description (`seoTypes`, unless hidden from search), links to anything unpublished or gone, changes waiting more
than 14 days, recent unpublished changes, the Trash, and the last publish. Opt-in: `unconfirmedRule()` (text containing
"to be confirmed" or `[confirm]`, or any `confirmed` or `...Confirmed` box left unticked at any depth; PORTS.md card
66). Links, headings and pages (`qualityRules()`, card 122): dead external links from the weekly link report,
typed internal links to missing pages, skipped heading levels, vague link words and bare web addresses, long Google
titles and descriptions, pages nothing links to, and two private-page guards (`docs/agent/private-pages.md`).
Report documents (`REPORT_TYPES`, e.g. `linkReport`) reach rules as `ctx.reports`, never as content. A site adds its own rules in `kit.config.ts`. A rule is `{ id, run(ctx) }` returning one finding or null; a rule
66). Card 123 (`src/lib/studio-prepublish.ts`): `exampleTextRule()` (words still starting "Example:" from a page
template, Needs doing, with the field) and `llmsRules({ pageTypes })`: `/llms.txt` or `/llms-full.txt` still carrying
the starter's words, a listed custom page missing from `/llms.txt`, and `/llms-full.txt` older than `maxAgeDays` (60)
with something published since its `Last updated:` line (written by `npm run llms:full`). The llms rules read
`CheckupContext.site`, which `useCheckup` fills by fetching the two files from the site serving the Studio; when they
cannot be read the rules say nothing. A site adds its own rules in `kit.config.ts`. A rule is `{ id, run(ctx) }` returning one finding or null; a rule
that throws is skipped.

## /build-info.json and the commit

The route prerenders inside workerd, which cannot see the build machine's `process.env`, so reading `GITHUB_SHA` there
always gave `commit: null`. `astro.config.mjs` reads the SHA in Node (`GITHUB_SHA`, else `git rev-parse --short=7
HEAD`, else null) and passes it as the Vite define `__NCS_BUILD_COMMIT__`. A site whose config lacks the define still
builds and reports null. Check after a build: `dist/client/build-info.json` must show a seven-character commit.

## The workflow tools (card 117)

A second plugin, `ncsWorkflowTools` (`src/sanity/workflow/`), registered just before the kit so the kit's tool order
and staff view place `messages`. PORTS.md card 117 has the full file list.

- **Share a preview** (`SharePreviewAction.tsx`): a document action on the types in `shareTypes`. Writes a
  `previewShare.<nonce>` record with the editor's own session, asks `POST /api/studio/share-preview/` to sign it
  (same origin + `/users/me`, then HMAC-SHA256 under `SHARE_PREVIEW_SECRET`), and shows the link once. The
  `/preview` route honours `?share=` only while the signature, expiry, path and record all agree, and then renders
  drafts without stega and without draft mode. "Stop this link" sets `revoked`. With no secret the dialog says links
  are not set up. `src/lib/preview-share.ts` is the tested half.
- **Messages** (`MessagesTool.tsx`, `/api/studio/messages/`): D1's `contact_submissions` and `form_submissions`,
  newest first, status pills, a detail view with Mark as. Auth on every method, before the database is touched. The
  status table is `message_status` (migration per site). Prayer requests: only that one arrived. No binding: "Forms
  are not set up yet". `src/lib/studio-messages.ts` is the tested half.
- **Table panes** (`DocumentTable.tsx`, `tableListItem()`): columns per site in `src/sanity/tables.config.ts`;
  `studio-table.test.ts` fails if a column is missing from its projection. Always an extra desk item beside the
  normal list.
- **Mail** (`src/sanity/mail/`, `ncsMailTools()` before the kit, card 127): "Send a test to me" and "Send to
  everyone" on the `newsletter` type (`/api/studio/newsletter/`, batches until done, never twice), the **RSVPs** tool
  (`/api/studio/rsvps/`, counts, replies, CSV), Home's Newsletter card and RSVP rows in Coming up
  (`features.mail`), and one RSVP line on top of Messages. Same auth order as Messages. The tested halves are
  `src/lib/mail-*.ts`; setup is OPERATIONS.md "Email".
- **Morning change note**: not Studio code. `.github/workflows/change-note.yml` + `scripts/change-note.mjs`.

## Rules that bite

- Desk items that a link can reach need an **explicit `.id()`**. A singleton's id is its document id (`aboutPage`),
  because an intent link resolves to `pages;aboutPage`; a title-derived id (`about`) left that pane blank.
- The deployed Studio is hash-routed: every kit link goes through `useStudioLink()` (router), never a bare href.
- The kit plugin stays **last** in `plugins`. The wordmark navbar is the one middleware at the config root (card 120).
- The navbar wrapper renders `props.renderDefault(props)` first, always; a wrapper that drops it silently disables every
  plugin's navbar after it.
- Home's Publish and Discard use `useDocumentOperation`; they never call the client directly, so history, undo and
  real-time stay intact.
- `@sanity/ui` 4: `Stack gap`, `Grid gridTemplateColumns`, `useToast` from `@sanity/ui/toast`, icons from
  `@sanity/icons/<Name>`.
- Scaffold markers never go in the kit's PORTABLE files (card 99); per-capability entries (trash types, SEO types)
  live in `kit.config.ts`, which carries them.

## Not built yet

Tracked in the starter's `docs/PENDING.md` item 14: the rest of the Worker routes (Ask form, link check, monthly report)
and the recorded clips for each site (the player, the registry and the recorder landed with card 137). The publish checklist inspector landed as
"Before you publish" with card 123. Studio auth and deploy status landed with card 111; visitors (from Cloudflare
Web Analytics, not GA4) with card 115.

Findings from the step 0 spike (2026-10-17), for the Worker half:

- **Auth**: the signed-in embedded Studio keeps its session token in `localStorage`
  (`__studio_auth_token_<projectId>`, Sanity's default `dual` login), so the Studio client carries it and kit code can
  send it as `Authorization: Bearer` to `/api/studio/*`. The route verifies it against
  `https://<projectId>.api.sanity.io/v2025-02-19/users/me`. A browser that signed in by cookie only would have no token;
  if that turns up, set `auth: { loginMethod: 'token' }`.
- **Cron**: `@astrojs/cloudflare` 14 deploys `main: "@astrojs/cloudflare/entrypoints/server"`, which exports only
  `{ fetch }`. A `scheduled` handler means pointing wrangler `main` at a small worker file that re-exports that `fetch`
  and adds `scheduled`; not tried in a build yet. The GitHub Actions schedule calling a secret-guarded route stays the
  fallback.

## Adopting it in a site

Add `auth: { loginMethod: 'token' }` to `sanity.config.ts` (card 129) and tell each editor to sign out and in once.

Copy the PORTABLE files listed above, write the site's `kit.config.ts` (start from the starter's), take the
`structure.ts` changes (explicit singleton ids, `staffDesk` wrapper, Trash item, `media.*` filter) and the
`astro.config.mjs` define, add `ncsStudioKit(kitConfig)` last in plugins, run `npm run typegen` (the `trashedItem` type
is new), then open `/studio` and check Home opens first. PORTS.md card 106 has the full list; card 111 adds the deploy
route's Worker settings, the two workflow changes (`deploy.yml` tells someone; `publish-due.yml` rebuilds after a
publish), `"studioWeek"` in the publish webhook's filter, and `WEEK_TYPE` in `structure.ts`'s default-list hidden set
(else the safety net lists "Weekly checklist" in the desk).

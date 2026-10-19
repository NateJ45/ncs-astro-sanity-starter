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
| Home banner (118)       | `src/sanity/kit/HomeBanner.tsx`, `src/lib/studio-banner.ts`                                                                                          | The navy welcome at the top of Home; `kitConfig.homeBanner`; pure parts tested in `studio-banner.test.ts`                                                 |
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
  says "Not set up yet"; `features.visitors: false` says so without asking.
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

The lettering's font file must be the site's own (a path starting `/`, same origin), loaded by a small `@font-face`
the banner writes; colours under 3:1 on the banner are dropped, and the heading font shows until the file loads. The
mark and motif are decorative (`alt=""`); the heading carries the name, with an `aria-label` when it is lettered.
The starter sets only `mark: '/favicon.svg'`. Keep a site's banner files out of `public/studio/`, which is the Studio's
own address; a folder such as `public/studio-banner/` is clear of it.

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
- **Not done, on purpose:** a branded heading inside the sign-in card through a custom `auth` store. Sanity uses a
  custom store as-is, which drops its own request handler (expired-session handling, the CORS and project-not-found
  screens). Not worth that for a heading.

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

**Still to do** (`docs/PENDING.md`): the field "How to" chip and the sign-in heading.

### Part two (card 132)

| Piece       | What it is                                                                                | Where it is used                                  |
| ----------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `DateBlock` | the month in small caps over the day in the display font, inside a stone outline          | Home's Coming up and RSVP rows                    |
| `ArtRow(s)` | a list row: the type's art on a small stone (or a `lead`), title, muted line, tag, action | Recent edits, Pick up, Coming up, the newsletter  |
| `Figure`    | a headline number in the display font with its words                                      | Visitors, newsletter subscribers, CollectionIntro |
| `MarkBars`  | bars in the calm mark colours, each with its number in words                              | Visitors                                          |
| `StepTrail` | named steps across: laid, ringed, waiting (`LiveSteps` with one column per word)          | Post a photo, the tour                            |
| `TileCard`  | now takes `href` (a real link) as well as `onClick`                                       | Home's ways in, Quick update                      |

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
and the recorded tutorial videos themselves (the slot exists, card 115). The publish checklist inspector landed as
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

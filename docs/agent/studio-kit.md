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

| Piece                   | File                                                                                          | Notes                                                                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The plugin              | `src/sanity/kit/index.tsx`                                                                    | `ncsStudioKit(kitConfig)`, added **last** in `sanity.config.ts` plugins (its tools reducer must see every other tool)                                   |
| Site settings           | `src/sanity/kit.config.ts`                                                                    | The ONE site-specific file (NOT portable): staff list, This week jobs, checkup rules, trash types, tour words, feature switches                         |
| Settings shape          | `src/sanity/kit/types.ts`                                                                     | `KitConfig`                                                                                                                                             |
| Home                    | `src/sanity/kit/HomeTool.tsx`                                                                 | First tool, so the Studio opens on it                                                                                                                   |
| Site Guide              | `src/sanity/kit/GuideTool.tsx`                                                                | Reads the existing guides (`src/sanity/guides/content.ts`) and renders each with `GuideView`; search reads every word; Print prints only the open guide |
| Checkup                 | `src/sanity/kit/CheckupTool.tsx`, `src/lib/studio-checkup.ts`                                 | Pure rules over one fetch of every content document; tests in `studio-checkup.test.ts`                                                                  |
| Trash                   | `src/sanity/kit/trash.tsx`, `src/lib/studio-trash.ts`                                         | Snapshot-to-Trash in one transaction; `trashedItem` type; tests in `studio-trash.test.ts`                                                               |
| Staff view, links, live | `src/sanity/kit/shared.tsx`, `src/lib/studio-kit.ts`                                          | Pure parts tested in `studio-kit.test.ts`                                                                                                               |
| Status line             | `src/sanity/kit/NavbarStatus.tsx`                                                             | `studio.components.navbar` middleware; words from `navbarStatus()` in `src/lib/studio-kit.ts`                                                           |
| Help for this page      | `src/sanity/kit/HelpPanel.tsx`                                                                | A document inspector: page check plus Checkup findings for the document, then its Site Guide entries                                                    |
| Tour                    | `src/sanity/kit/StudioTour.tsx`                                                               | Mounted by the kit's layout; once per Sanity user per browser                                                                                           |
| After-Publish note      | `src/sanity/kit/publishNote.tsx`                                                              | Wraps the stock Publish; keeps `action === 'publish'`                                                                                                   |
| Build time              | `src/pages/build-info.json.ts`                                                                | Prerendered `{ builtAt, commit }` for Home's "Is it live?"; the commit comes from a Vite define in `astro.config.mjs`                                   |
| Desk: Trash, staff, ids | `src/sanity/structure.ts`                                                                     | Trash list (id `trash`), `staffDesk()` filter (in `kit/shared.tsx`), singleton items carry their document id as their id                                |
| Deploy status (111)     | `src/pages/api/studio/deploy-status.ts`, `src/lib/deploy-status.ts`, `src/lib/studio-auth.ts` | GET the newest deploy run's outcome; POST "Try again" (same origin + Sanity session); tests in `deploy-status.test.ts`                                  |
| Home cards (115)        | `src/sanity/kit/HomeCards.tsx`, `src/lib/studio-home.ts`                                      | Coming up, Fix-it list, Visitors, Your pages, and the Panel frame; pure parts tested in `studio-home.test.ts`                                           |
| Guide videos (115)      | `src/sanity/kit/GuideVideos.tsx`                                                              | "Watch how it is done" on Home and in the Site Guide; `videoSource()` in `studio-home.ts`                                                               |
| Visitors route (115)    | `src/pages/api/studio/visitors.ts`, `src/lib/studio-analytics.ts`                             | Cloudflare Web Analytics GraphQL through the Worker (same origin + Sanity session); tests in `studio-analytics.test.ts`                                 |
| Weekly ticks (111)      | `src/sanity/kit/weekType.ts`                                                                  | `studioWeek` document per week for hand-ticked jobs; `checklist()` and `weekKey()` in `studio-kit.ts`                                                   |
| Quick update (111)      | `src/sanity/kit/QuickUpdateTool.tsx`                                                          | Tool `quick-update`, forms from `kitConfig.quickUpdate`; `quickFormErrors()` in `studio-kit.ts`                                                         |
| Empty lists (111)       | `src/sanity/kit/emptyList.tsx`                                                                | `emptyAwareList()` for `structure.ts`, plus `EMPTY_LIST_BUNDLE` (the default empty words)                                                               |
| Restore one document    | `scripts/restore-doc.mjs`, `scripts/lib/restore-doc.mjs`                                      | One document from a nightly backup, written back as a draft; dry by default; tests in `restore-doc.test.mjs`                                            |

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
- **Welcome** (card 110): "Good morning, Ann", the workspace title (the site's name, from `brand.config.json`) in the
  theme's heading font (the site's display face), on a `tone="primary"` card, which the branded theme makes a soft tint
  of the brand accent. No literal colours, no gradient.
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
first: one column, 72px buttons, 16px-plus inputs. Add `'quick-update'` to `staffTools` for the staff view.
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

## Help for this page (card 110)

A document inspector (`document.inspectors`, `defineDocumentInspector`), opened from the document header or its menu,
on every type but the Trash. "Worth a look": `kitConfig.pageCheck` (the same three checks as "Check this page...",
through `runPageCheck()` in `actions/checkPage.tsx`) re-run 600 ms after typing stops, on the page-builder types only,
plus every Checkup finding whose target is this document. "How to": the Site Guide entries listed for the type in
`kitConfig.guide.forType` (`GUIDES_FOR_TYPE` in `guides/content.ts`, `'*'` as the fallback), rendered by the site's
`GuideView`. Read-only; uses only `documentId`, `documentType` and `onClose`, because inspector props have changed
between Sanity majors. `features.helpPanel: false` removes it.

## Checkup rules

Generic (`genericRules()`): pictures with no description (skipping `altExemptFields` such as the logo), pages with no
Google description (`seoTypes`, unless hidden from search), links to anything unpublished or gone, changes waiting more
than 14 days, recent unpublished changes, the Trash, and the last publish. Opt-in: `unconfirmedRule()` (text containing
"to be confirmed" or `[confirm]`, or any `confirmed` or `...Confirmed` box left unticked at any depth; PORTS.md card
66). A site adds its own rules in `kit.config.ts`. A rule is `{ id, run(ctx) }` returning one finding or null; a rule
that throws is skipped.

## /build-info.json and the commit

The route prerenders inside workerd, which cannot see the build machine's `process.env`, so reading `GITHUB_SHA` there
always gave `commit: null`. `astro.config.mjs` reads the SHA in Node (`GITHUB_SHA`, else `git rev-parse --short=7
HEAD`, else null) and passes it as the Vite define `__NCS_BUILD_COMMIT__`. A site whose config lacks the define still
builds and reports null. Check after a build: `dist/client/build-info.json` must show a seven-character commit.

## Rules that bite

- Desk items that a link can reach need an **explicit `.id()`**. A singleton's id is its document id (`aboutPage`),
  because an intent link resolves to `pages;aboutPage`; a title-derived id (`about`) left that pane blank.
- The deployed Studio is hash-routed: every kit link goes through `useStudioLink()` (router), never a bare href.
- The kit plugin stays **last** in `plugins`.
- The navbar wrapper renders `props.renderDefault(props)` first, always; a wrapper that drops it silently disables every
  plugin's navbar after it.
- Home's Publish and Discard use `useDocumentOperation`; they never call the client directly, so history, undo and
  real-time stay intact.
- `@sanity/ui` 4: `Stack gap`, `Grid gridTemplateColumns`, `useToast` from `@sanity/ui/toast`, icons from
  `@sanity/icons/<Name>`.
- Scaffold markers never go in the kit's PORTABLE files (card 99); per-capability entries (trash types, SEO types)
  live in `kit.config.ts`, which carries them.

## Not built yet

Tracked in the starter's `docs/PENDING.md` item 14: the rest of the Worker routes (Ask form, link check, monthly report),
the live publish checklist inspector and the recorded tutorial videos themselves (the slot exists, card 115). Studio
auth and deploy status landed with card 111; visitors (from Cloudflare Web Analytics, not GA4) with card 115.

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

Copy the PORTABLE files listed above, write the site's `kit.config.ts` (start from the starter's), take the
`structure.ts` changes (explicit singleton ids, `staffDesk` wrapper, Trash item, `media.*` filter) and the
`astro.config.mjs` define, add `ncsStudioKit(kitConfig)` last in plugins, run `npm run typegen` (the `trashedItem` type
is new), then open `/studio` and check Home opens first. PORTS.md card 106 has the full list; card 111 adds the deploy
route's Worker settings, the two workflow changes (`deploy.yml` tells someone; `publish-due.yml` rebuilds after a
publish), `"studioWeek"` in the publish webhook's filter, and `WEEK_TYPE` in `structure.ts`'s default-list hidden set
(else the safety net lists "Weekly checklist" in the desk).

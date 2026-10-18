<!-- PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file -->

# The Studio kit

Added 2026-10-17 (PORTS.md card 106). A plain, kind Studio for someone who edits the site on their own: a Home page,
a searchable and printable Site Guide, a Checkup, a staff view with fewer tools and no permanent deletes, Trash instead
of Delete, a note after Publish, and a first-run tour. It is the Sanity version of the staff admin the family's
WordPress sites have. Built first in first-baptist-auburn, then brought to the starter unchanged. Round two
(2026-10-18, PORTS.md card 110) added a calm status line under the top bar, a "Help for this page" panel beside every
document, and a warmer Home (greeting and site name, quick actions, "Pick up where you left off").

This doc is PORTABLE: it describes the kit, never one site. A site's own choices (its staff, weekly jobs, extra rules)
are commented in that site's `src/sanity/kit.config.ts`.

## Where it lives

| Piece                   | File                                                          | Notes                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The plugin              | `src/sanity/kit/index.tsx`                                    | `ncsStudioKit(kitConfig)`, added **last** in `sanity.config.ts` plugins (its tools reducer must see every other tool)                                   |
| Site settings           | `src/sanity/kit.config.ts`                                    | The ONE site-specific file (NOT portable): staff list, This week jobs, checkup rules, trash types, tour words, feature switches                         |
| Settings shape          | `src/sanity/kit/types.ts`                                     | `KitConfig`                                                                                                                                             |
| Home                    | `src/sanity/kit/HomeTool.tsx`                                 | First tool, so the Studio opens on it                                                                                                                   |
| Site Guide              | `src/sanity/kit/GuideTool.tsx`                                | Reads the existing guides (`src/sanity/guides/content.ts`) and renders each with `GuideView`; search reads every word; Print prints only the open guide |
| Checkup                 | `src/sanity/kit/CheckupTool.tsx`, `src/lib/studio-checkup.ts` | Pure rules over one fetch of every content document; tests in `studio-checkup.test.ts`                                                                  |
| Trash                   | `src/sanity/kit/trash.tsx`, `src/lib/studio-trash.ts`         | Snapshot-to-Trash in one transaction; `trashedItem` type; tests in `studio-trash.test.ts`                                                               |
| Staff view, links, live | `src/sanity/kit/shared.tsx`, `src/lib/studio-kit.ts`          | Pure parts tested in `studio-kit.test.ts`                                                                                                               |
| Status line             | `src/sanity/kit/NavbarStatus.tsx`                             | `studio.components.navbar` middleware; words from `navbarStatus()` in `src/lib/studio-kit.ts`                                                           |
| Help for this page      | `src/sanity/kit/HelpPanel.tsx`                                | A document inspector: page check plus Checkup findings for the document, then its Site Guide entries                                                    |
| Tour                    | `src/sanity/kit/StudioTour.tsx`                               | Mounted by the kit's layout; once per Sanity user per browser                                                                                           |
| After-Publish note      | `src/sanity/kit/publishNote.tsx`                              | Wraps the stock Publish; keeps `action === 'publish'`                                                                                                   |
| Build time              | `src/pages/build-info.json.ts`                                | Prerendered `{ builtAt, commit }` for Home's "Is it live?"; the commit comes from a Vite define in `astro.config.mjs`                                   |
| Desk: Trash, staff, ids | `src/sanity/structure.ts`                                     | Trash list (id `trash`), `staffDesk()` filter (in `kit/shared.tsx`), singleton items carry their document id as their id                                |

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
  shows Done. An empty list hides the card (the starter ships none).
- **Is it live?**: `/build-info.json` against the newest published `_updatedAt`. Up to date, Updating, or (after
  `liveSlowAfterMinutes`) "taking longer than usual". Re-checks every minute. Until the Sanity publish webhook is set
  up, a publish waits for the next deploy, and the card says so after `liveSlowAfterMinutes`.
- **Site health**: the Checkup's counts. **Recent edits**: the last eight things changed, unpublished ones flagged.
- **Visitors**: "not set up yet" until the analytics route exists (`features.visitors`).
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

Tracked in the starter's `docs/PENDING.md` item 14: the Worker routes (Studio auth, visitors from GA4, Ask form,
deploy status, link check, monthly report), the live publish checklist inspector and recorded tutorial videos.

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
is new), then open `/studio` and check Home opens first. PORTS.md card 106 has the full list.

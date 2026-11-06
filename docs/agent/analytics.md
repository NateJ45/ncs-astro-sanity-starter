# Analytics events: what visitors do, sent to GA4

> Read when: you touch tracking, `SiteEvents.astro`, `src/config/events.ts`, or the privacy page's analytics wording.
> PORTS.md card 217. The tag itself (`Analytics.astro`, `analytics/GoogleAnalytics.astro`) is older: cards 54, 58, 96.

## How it fits together

1. **The tag** defines `window.gtag` only on the production hostname, outside automated browsers, and only when
   `PUBLIC_GA_ID` is set. Everywhere else `window.gtag` is undefined and every event call does nothing, so tests,
   previews and local builds are never counted.
2. **`src/components/analytics/SiteEvents.astro`** (PORTABLE, rendered by `BaseLayout.astro` after `<Analytics />`) is
   one delegated click listener plus a per-page setup (404, forms in view, first use of a frame, reading depth,
   script errors). It reads a clicked link's ADDRESS and decides what it is, so a link an editor adds in the Studio
   is tracked with no setup.
3. **`src/lib/track.ts`** (PORTABLE) holds `classifyLink` (pure, unit tested), `track(name, params)` for React islands
   and `trackSearch(term, results)` for a search box.
4. **`src/config/events.ts`** is the site's own map (NOT portable): which hosts and paths are giving, registering or
   other links, which events are off, and where the form and article markup is. Empty, only the built-in rules run.
5. **`src/lib/event-kinds.ts`** (PORTABLE) turns that map into plain words for the privacy page, so the page names
   exactly the kinds of event the site sends (see `PrivacyPolicy.astro`).

Nothing personal is sent: link kind and destination name (never a mailto or tel address), form names, the page that
was not found, search words (withheld when they look like an email address or a phone number).

## Events

| Event                              | When                                                                 | Parameters                                          |
| ---------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------- |
| `contact_click`                    | an email or phone link                                               | `method` (email, phone), `location`                 |
| `watch_click`                      | a YouTube or Vimeo link                                              | `destination` (streams, video, channel), `location` |
| `directions_click`                 | a Google or Apple Maps link                                          | `location`                                          |
| `download_click`                   | a link to a PDF, document, spreadsheet, archive, audio or video file | `file_extension`, `file_name`, `location`           |
| `outbound_click`                   | a link to another site that no other rule claimed                    | `destination` (host), `location`                    |
| `give_click`                       | the site's map: giving links                                         | whatever the rule sets, plus `location`             |
| `register_click`                   | the site's map: registration links                                   | the same                                            |
| `form_view`                        | a form (`form[data-track-form]`) came 40% into view                  | `form_name`                                         |
| `embed_interact`                   | the page lost focus to a frame: first use, once per frame            | `embed` (form, video), `embed_name`                 |
| `generate_lead`                    | a sign-up or contact form was sent (`track()` in the form)           | `form_name`, `form_location`                        |
| `site_search`, `search_no_results` | `trackSearch()`: the last term once the visitor pauses 1.2 s         | `search_term`, `search_results`                     |
| `article_progress`                 | 25, 50, 75, 100% of `[data-article-body]` passed                     | `percent`                                           |
| `article_read`                     | the end reached after real reading time (30 s to 5 min)              | `read_seconds`                                      |
| `page_not_found`                   | the 404 page (`[data-page-not-found]`)                               | `missing_path`, `from_site`                         |
| `js_error`                         | an error in the site's own scripts, at most three a page view        | `error_message`, `error_source`                     |

Any other event name in the map (`calendar_add`, `app_click`, `social_click`) is the site's own. `location` is the page
region: `header`, `footer`, `nav`, `aside` or `page`.

GA4's Enhanced Measurement also counts outbound clicks and file downloads. A site with it on can put `outbound_click`
and `download_click` in `off` to avoid two counts.

The starter's own search (`site-search-client.ts`, PORTABLE since card 126) does not call `trackSearch` yet; GA4's
Enhanced Measurement counts the `/search/?q=` page. A site with a search box of its own calls `trackSearch(term,
resultCount)` from it.

## Adding a site's rules

Edit `src/config/events.ts`. A rule is `{ host?, path?, own?, test?, event, params?, describe? }`; the first match
wins, the site's rules before the built-in ones. `describe` is the plain-words kind for the privacy page. The unit test
`src/lib/track.test.ts` pins the classifier against a sample map; pin the site's own rules in its e2e spec by stubbing
`window.gtag` and clicking a probe link.

## What it cannot see

A form or a video in another site's frame: the visitor's clicks inside never reach the page, so a form is counted when
it comes into view and when its frame is first used, not when it is sent. A gift or registration that finishes on
another site is counted at the link.

## Privacy

GA4 sets cookies, so the privacy page must say so (card 54) and it now also names the kinds of event, derived from the
map (`eventsSentence`). Nothing to retype: change the map and the page follows on the next build. A privacy body
stored in Sanity that lists events by hand would go stale; keep the event wording in code.

## Verifying

Never by HTML scan. Open the live site in a real browser (not WebDriver; a content blocker stops gtag.js), then read
GA4 Realtime by event name. The Playwright specs stub `window.gtag`.

## The Report in the Studio (card 218)

The events above come back to the site's editors in the Studio's `Report` tool: every number by Month, Quarter or Year
against the same period a year before. `src/config/board.ts` (NOT portable) names the parts and words; a measure
`event:<name>` needs the event sent here AND listed for the site in studio-status (`src/site-series-config.ts`). Full
detail: `docs/agent/studio-kit.md`, "The Report".
